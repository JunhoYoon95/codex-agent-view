import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, rm, symlink, writeFile, stat } from "node:fs/promises";
import { createServer, request as httpRequest } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  ensureViewerToken,
  readRuntimeInfo,
  readViewerToken,
  runtimeFile,
  writeRuntimeInfo,
} from "../src/runtime/config.mjs";
import { startMonitorServer } from "../src/runtime/server.mjs";

const TOKEN = "t".repeat(43);
const VIEWER_TOKEN = "v".repeat(43);

async function startFixture(t) {
  const root = await mkdtemp(join(tmpdir(), "codex-agent-view-server-test-"));
  const env = { CODEX_AGENT_VIEW_RUNTIME_DIR: join(root, "runtime") };
  const monitor = await startMonitorServer({
    host: "127.0.0.1",
    port: 0,
    env,
    token: TOKEN,
    viewerToken: VIEWER_TOKEN,
    now: () => 1_000,
  });
  t.after(async () => {
    await monitor.close().catch(() => {});
    await rm(root, { force: true, recursive: true });
  });
  return { env, monitor };
}

function request(monitor, { body, headers = {}, method = "GET", path = "/" } = {}) {
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      {
        hostname: monitor.runtimeInfo.host,
        port: monitor.runtimeInfo.port,
        method,
        path,
        headers: {
          host: `${monitor.runtimeInfo.host}:${monitor.runtimeInfo.port}`,
          ...headers,
        },
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          resolve({
            body: Buffer.concat(chunks).toString("utf8"),
            headers: response.headers,
            status: response.statusCode,
          });
        });
      },
    );
    req.on("error", reject);
    req.end(body);
  });
}

function json(response) {
  return JSON.parse(response.body);
}

function bearer(token = TOKEN) {
  return { authorization: `Bearer ${token}` };
}

async function reserveLoopbackPort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  return port;
}

test("binds to 127.0.0.1 with port zero and cleans up runtime info", async (t) => {
  const { env, monitor } = await startFixture(t);
  const address = monitor.server.address();
  assert.equal(address.address, "127.0.0.1");
  assert(address.port > 0);

  const info = await readRuntimeInfo(env);
  assert.equal(info.host, "127.0.0.1");
  assert.equal(info.port, address.port);
  assert.equal(info.token, TOKEN);
  assert.equal(info.viewer_token, VIEWER_TOKEN);
  assert.equal(
    monitor.url,
    `http://127.0.0.1:${address.port}/#token=${VIEWER_TOKEN}`,
  );
  if (process.platform !== "win32") {
    assert.equal((await stat(runtimeFile(env))).mode & 0o777, 0o600);
  }

  await monitor.close();
  await monitor.close();
  await assert.rejects(access(runtimeFile(env)), { code: "ENOENT" });
});

test("closes the listener and rethrows when runtime info publication fails", async (t) => {
  if (process.platform === "win32") {
    t.skip("symbolic link setup is not portable on Windows");
    return;
  }

  const root = await mkdtemp(join(tmpdir(), "codex-agent-view-startup-failure-test-"));
  t.after(async () => rm(root, { force: true, recursive: true }));
  const badDirectory = join(root, "bad-runtime");
  const target = join(root, "target.json");
  await mkdir(badDirectory, { mode: 0o700 });
  await writeFile(target, "unchanged\n");
  await symlink(target, join(badDirectory, "runtime.json"));
  const port = await reserveLoopbackPort();

  await assert.rejects(
    startMonitorServer({
      host: "127.0.0.1",
      port,
      env: { CODEX_AGENT_VIEW_RUNTIME_DIR: badDirectory },
      token: TOKEN,
    }),
    /refusing symbolic link/,
  );

  const recoveryDirectory = join(root, "recovery-runtime");
  const recovered = await startMonitorServer({
    host: "127.0.0.1",
    port,
    env: { CODEX_AGENT_VIEW_RUNTIME_DIR: recoveryDirectory },
    token: "r".repeat(43),
  });
  await recovered.close();
});

test("requires auth, accepts hook ingest, and returns minimized state", async (t) => {
  const { monitor } = await startFixture(t);
  assert.equal((await request(monitor, { path: "/api/health" })).status, 200);
  assert.equal((await request(monitor, { path: "/api/state" })).status, 401);
  assert.equal(
    (
      await request(monitor, {
        path: "/api/state",
        headers: bearer("x".repeat(43)),
      })
    ).status,
    401,
  );

  const payload = {
    session_id: "session-1",
    turn_id: "turn-1",
    hook_event_name: "PreToolUse",
    tool_name: "Bash",
    tool_use_id: "tool-1",
    prompt: "private prompt",
    tool_input: { command: "private command" },
    tool_response: "private output",
    cwd: "/private/workspace",
    transcript_path: "/private/transcript.jsonl",
  };
  const ingested = await request(monitor, {
    method: "POST",
    path: "/api/events",
    headers: {
      ...bearer(),
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  assert.equal(ingested.status, 202);
  assert.deepEqual(json(ingested), { status: "applied" });

  const stateResponse = await request(monitor, {
    path: "/api/state",
    headers: bearer(),
  });
  assert.equal(stateResponse.status, 200);
  const state = json(stateResponse);
  assert.equal(state.sessions[0].session_id, "session-1");
  assert.equal(state.sessions[0].recent_activities[0].tool_name, "Bash");
  const serialized = JSON.stringify(state);
  for (const privateValue of [
    "private prompt",
    "private command",
    "private output",
    "/private/workspace",
    "/private/transcript.jsonl",
  ]) {
    assert(!serialized.includes(privateValue));
  }
});

test("viewer auth is read-only while runtime auth retains control", async (t) => {
  const { monitor } = await startFixture(t);

  const viewerState = await request(monitor, {
    path: "/api/state",
    headers: bearer(VIEWER_TOKEN),
  });
  assert.equal(viewerState.status, 200);

  for (const path of ["/api/events", "/api/internal/shutdown"]) {
    const response = await request(monitor, {
      method: "POST",
      path,
      headers: {
        ...bearer(VIEWER_TOKEN),
        "content-type": "application/json",
      },
      body: path === "/api/events" ? "{}" : undefined,
    });
    assert.equal(response.status, 401);
  }

  const runtimeState = await request(monitor, {
    path: "/api/state",
    headers: bearer(TOKEN),
  });
  assert.equal(runtimeState.status, 200);
});

test("restart rotates runtime auth while preserving viewer auth", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "codex-agent-view-restart-test-"));
  const env = { CODEX_AGENT_VIEW_RUNTIME_DIR: join(root, "runtime") };
  t.after(async () => rm(root, { force: true, recursive: true }));
  const viewerToken = await ensureViewerToken(env, {
    seedToken: VIEWER_TOKEN,
  });

  const first = await startMonitorServer({
    env,
    port: 0,
    token: "a".repeat(43),
    viewerToken,
  });
  assert.equal(
    (
      await request(first, {
        path: "/api/state",
        headers: bearer(viewerToken),
      })
    ).status,
    200,
  );
  await first.close();
  assert.equal(await readViewerToken(env), viewerToken);

  const second = await startMonitorServer({
    env,
    port: 0,
    token: "b".repeat(43),
    viewerToken: await ensureViewerToken(env),
  });
  t.after(async () => second.close().catch(() => {}));
  assert.notEqual(first.runtimeInfo.token, second.runtimeInfo.token);
  assert.equal(first.runtimeInfo.viewer_token, second.runtimeInfo.viewer_token);
  assert.equal(
    (
      await request(second, {
        path: "/api/state",
        headers: bearer(viewerToken),
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await request(second, {
        method: "POST",
        path: "/api/events",
        headers: {
          ...bearer(first.runtimeInfo.token),
          "content-type": "application/json",
        },
        body: "{}",
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await request(second, {
        method: "POST",
        path: "/api/internal/shutdown",
        headers: bearer(first.runtimeInfo.token),
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await request(second, {
        method: "POST",
        path: "/api/events",
        headers: {
          ...bearer(second.runtimeInfo.token),
          "content-type": "application/json",
        },
        body: "{}",
      })
    ).status,
    202,
  );

  await second.close();
  assert.equal(await readViewerToken(env), viewerToken);
});

test("shutdown requires loopback Bearer auth, responds, and closes without deadlock", async (t) => {
  const { env, monitor } = await startFixture(t);
  const path = "/api/internal/shutdown";

  assert.equal((await request(monitor, { method: "POST", path })).status, 401);
  assert.equal(
    (
      await request(monitor, {
        headers: { ...bearer(), host: "example.com" },
        method: "POST",
        path,
      })
    ).status,
    421,
  );

  const shutdown = await Promise.race([
    request(monitor, { headers: bearer(), method: "POST", path }),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("shutdown response timed out")), 1_000);
    }),
  ]);
  assert.equal(shutdown.status, 202);
  assert.deepEqual(json(shutdown), { status: "shutting_down" });

  const deadline = Date.now() + 2_000;
  while (monitor.server.address() !== null && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.equal(monitor.server.address(), null);
  await monitor.close();
  await monitor.close();
  await assert.rejects(access(runtimeFile(env)), { code: "ENOENT" });
});

test("monitor close uses token ownership when cleaning runtime info", async (t) => {
  const { env, monitor } = await startFixture(t);
  const replacement = {
    ...monitor.runtimeInfo,
    port: await reserveLoopbackPort(),
    token: "n".repeat(43),
  };
  await writeRuntimeInfo(replacement, env);

  await monitor.close();
  assert.deepEqual(await readRuntimeInfo(env), replacement);
});

test("rejects non-loopback Host headers before serving health or state", async (t) => {
  const { monitor } = await startFixture(t);
  for (const host of ["example.com", "127.0.0.1.example.com"]) {
    const response = await request(monitor, {
      path: "/api/health",
      headers: { host },
    });
    assert.equal(response.status, 421);
    assert.equal(json(response).error, "loopback host required");
  }
});

test("enforces required, valid, and bounded event bodies", async (t) => {
  const { monitor } = await startFixture(t);
  const headers = { ...bearer(), "content-type": "application/json" };

  const empty = await request(monitor, {
    method: "POST",
    path: "/api/events",
    headers,
  });
  assert.equal(empty.status, 400);

  const malformed = await request(monitor, {
    method: "POST",
    path: "/api/events",
    headers,
    body: "not-json",
  });
  assert.equal(malformed.status, 400);

  const oversized = await request(monitor, {
    method: "POST",
    path: "/api/events",
    headers,
    body: JSON.stringify({ value: "x".repeat(64 * 1024) }),
  });
  assert.equal(oversized.status, 413);
});

test("serves static assets with restrictive security headers", async (t) => {
  const { monitor } = await startFixture(t);
  const fixtures = [
    ["/", "text/html", "Codex Agent View"],
    ["/assets/app.js", "text/javascript", "API_STATE_URL"],
    ["/assets/styles.css", "text/css", "--surface-canvas"],
  ];

  for (const [path, contentType, marker] of fixtures) {
    const response = await request(monitor, { path });
    assert.equal(response.status, 200);
    assert.match(response.headers["content-type"], new RegExp(contentType));
    assert.equal(response.headers["cache-control"], "no-store");
    assert.equal(response.headers["access-control-allow-origin"], undefined);
    assert.equal(response.headers["x-content-type-options"], "nosniff");
    assert.equal(response.headers["x-frame-options"], "DENY");
    assert.match(response.headers["content-security-policy"], /default-src 'self'/);
    assert(response.body.includes(marker));
  }
});
