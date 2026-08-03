import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
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
const OWNERSHIP_PROOF_DOMAIN = "codex-agent-view/runtime-ownership/v1";

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

test("proves runtime ownership from an unauthenticated nonce without disclosing the token", async (t) => {
  const { monitor } = await startFixture(t);
  const nonce = "n".repeat(43);
  const response = await request(monitor, {
    method: "POST",
    path: "/api/internal/ownership-proof",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ nonce }),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(json(response), {
    proof: createHmac("sha256", TOKEN)
      .update(OWNERSHIP_PROOF_DOMAIN)
      .update("\0")
      .update(nonce)
      .digest("base64url"),
    status: "owned",
  });
  assert(!response.body.includes(TOKEN));
});

test("issues a runtime-only viewer grant and exchanges it once for scoped read-only credentials", async (t) => {
  const { monitor } = await startFixture(t);
  const origin = `http://127.0.0.1:${monitor.runtimeInfo.port}`;
  const excludedSessionId = "019fbcf3-19d4-7062-988d-f4e7a65e3e86";

  for (const headers of [
    { "content-type": "application/json" },
    { ...bearer(VIEWER_TOKEN), "content-type": "application/json" },
  ]) {
    const rejected = await request(monitor, {
      method: "POST",
      path: "/api/internal/viewer-grant",
      headers,
      body: JSON.stringify({ exclude_session_id: excludedSessionId }),
    });
    assert.equal(rejected.status, 401);
  }

  const wrongHost = await request(monitor, {
    method: "POST",
    path: "/api/internal/viewer-grant",
    headers: { ...bearer(), "content-type": "application/json", host: "localhost" },
    body: JSON.stringify({ exclude_session_id: excludedSessionId }),
  });
  assert.equal(wrongHost.status, 421);

  const invalidExclusion = await request(monitor, {
    method: "POST",
    path: "/api/internal/viewer-grant",
    headers: { ...bearer(), "content-type": "application/json" },
    body: JSON.stringify({ exclude_session_id: { toString: excludedSessionId } }),
  });
  assert.equal(invalidExclusion.status, 400);

  const grant = await request(monitor, {
    method: "POST",
    path: "/api/internal/viewer-grant",
    headers: { ...bearer(), "content-type": "application/json" },
    body: JSON.stringify({ exclude_session_id: excludedSessionId }),
  });
  assert.equal(grant.status, 201);
  const grantBody = json(grant);
  assert.deepEqual(Object.keys(grantBody).sort(), [
    "bootstrap_credential",
    "expires_in_ms",
    "status",
  ]);
  assert.equal(grantBody.status, "granted");
  assert.equal(grantBody.expires_in_ms, 60_000);
  assert.match(grantBody.bootstrap_credential, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/);
  assert(!grant.body.includes(TOKEN));
  assert(!grant.body.includes(VIEWER_TOKEN));

  for (const headers of [
    { "content-type": "application/json" },
    { "content-type": "application/json", origin: "http://127.0.0.1:9999" },
    { "content-type": "application/json", origin, "sec-fetch-site": "cross-site" },
  ]) {
    const rejected = await request(monitor, {
      method: "POST",
      path: "/api/viewer/exchange",
      headers,
      body: JSON.stringify({ credential: grantBody.bootstrap_credential }),
    });
    assert.equal(rejected.status, 403);
  }

  const tampered = await request(monitor, {
    method: "POST",
    path: "/api/viewer/exchange",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({
      credential: `${grantBody.bootstrap_credential.slice(0, -1)}x`,
    }),
  });
  assert.equal(tampered.status, 401);

  const wrongExchangeHost = await request(monitor, {
    method: "POST",
    path: "/api/viewer/exchange",
    headers: {
      "content-type": "application/json",
      host: "localhost",
      origin,
    },
    body: JSON.stringify({ credential: grantBody.bootstrap_credential }),
  });
  assert.equal(wrongExchangeHost.status, 421);

  const exchange = await request(monitor, {
    method: "POST",
    path: "/api/viewer/exchange",
    headers: {
      "content-type": "application/json",
      origin,
      "sec-fetch-site": "same-origin",
    },
    body: JSON.stringify({ credential: grantBody.bootstrap_credential }),
  });
  assert.equal(exchange.status, 200);
  assert.equal(exchange.headers["access-control-allow-origin"], undefined);
  assert.equal(exchange.headers["set-cookie"], undefined);
  const exchangeBody = json(exchange);
  assert.deepEqual(Object.keys(exchangeBody).sort(), [
    "access_credential",
    "access_expires_in_ms",
    "excluded_session_id",
    "recovery_credential",
    "recovery_expires_in_ms",
    "status",
  ]);
  assert.equal(exchangeBody.status, "exchanged");
  assert.equal(exchangeBody.access_expires_in_ms, 15 * 60 * 1_000);
  assert.equal(exchangeBody.recovery_expires_in_ms, 30 * 60 * 1_000);
  assert.equal(exchangeBody.excluded_session_id, excludedSessionId);
  assert.match(exchangeBody.access_credential, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/);
  assert.match(exchangeBody.recovery_credential, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/);
  assert(!exchange.body.includes(VIEWER_TOKEN));

  const replay = await request(monitor, {
    method: "POST",
    path: "/api/viewer/exchange",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ credential: grantBody.bootstrap_credential }),
  });
  assert.equal(replay.status, 409);

  const recoveredState = await request(monitor, {
    path: "/api/state",
    headers: bearer(exchangeBody.access_credential),
  });
  assert.equal(recoveredState.status, 200);
  assert.match(recoveredState.headers["x-codex-agent-view-access"], /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/);
  assert.equal(recoveredState.headers["x-codex-agent-view-recovery"], undefined);

  for (const path of ["/api/events", "/api/internal/shutdown"]) {
    const rejected = await request(monitor, {
      method: "POST",
      path,
      headers: {
        ...bearer(exchangeBody.access_credential),
        "content-type": "application/json",
      },
      body: path === "/api/events" ? "{}" : undefined,
    });
    assert.equal(rejected.status, 401);
  }

  const recoveryExchange = await request(monitor, {
    method: "POST",
    path: "/api/viewer/exchange",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ credential: exchangeBody.recovery_credential }),
  });
  assert.equal(recoveryExchange.status, 200);
  assert.equal(json(recoveryExchange).excluded_session_id, excludedSessionId);
});

test("recovery credential survives a same-port restart but expires cryptographically", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "codex-agent-view-recovery-test-"));
  const env = { CODEX_AGENT_VIEW_RUNTIME_DIR: join(root, "runtime") };
  const port = await reserveLoopbackPort();
  const origin = `http://127.0.0.1:${port}`;
  let nowMs = 10_000;
  t.after(async () => rm(root, { force: true, recursive: true }));

  const first = await startMonitorServer({
    env,
    now: () => nowMs,
    port,
    token: "a".repeat(43),
    viewerToken: VIEWER_TOKEN,
  });
  const firstState = await request(first, {
    path: "/api/state",
    headers: bearer(VIEWER_TOKEN),
  });
  const recovery = firstState.headers["x-codex-agent-view-recovery"];
  assert.match(firstState.headers["x-codex-agent-view-access"], /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/);
  await first.close();

  const second = await startMonitorServer({
    env,
    now: () => nowMs,
    port,
    token: "b".repeat(43),
    viewerToken: VIEWER_TOKEN,
  });
  t.after(async () => second.close().catch(() => {}));
  nowMs += 10 * 60 * 1_000;
  const recovered = await request(second, {
    method: "POST",
    path: "/api/viewer/exchange",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ credential: recovery }),
  });
  assert.equal(recovered.status, 200);
  const recoveredBody = json(recovered);
  assert.equal(recoveredBody.status, "exchanged");
  assert.equal(recoveredBody.access_expires_in_ms, 15 * 60 * 1_000);
  assert.equal(recoveredBody.recovery_expires_in_ms, 20 * 60 * 1_000);

  nowMs += 10 * 60 * 1_000;
  const refreshed = await request(second, {
    method: "POST",
    path: "/api/viewer/exchange",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ credential: recoveredBody.recovery_credential }),
  });
  assert.equal(refreshed.status, 200);
  assert.equal(json(refreshed).recovery_expires_in_ms, 10 * 60 * 1_000);

  nowMs += 10 * 60 * 1_000 + 1;
  const expired = await request(second, {
    method: "POST",
    path: "/api/viewer/exchange",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ credential: json(refreshed).recovery_credential }),
  });
  assert.equal(expired.status, 401);
});

test("legacy viewer families keep per-tab exclusions isolated", async (t) => {
  const { monitor } = await startFixture(t);
  const origin = `http://127.0.0.1:${monitor.runtimeInfo.port}`;
  const exclusions = [
    "019fbcf3-19d4-7062-988d-f4e7a65e3e86",
    "019fc088-a86e-7c52-a33d-1e7bcf7cdda7",
  ];
  const recoveries = [];
  for (const excludedSessionId of exclusions) {
    const state = await request(monitor, {
      path: "/api/state",
      headers: {
        ...bearer(VIEWER_TOKEN),
        "x-codex-agent-view-exclude-session": excludedSessionId,
      },
    });
    assert.equal(state.status, 200);
    assert.match(state.headers["x-codex-agent-view-access"], /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/);
    recoveries.push(state.headers["x-codex-agent-view-recovery"]);
  }
  assert.notEqual(recoveries[0], recoveries[1]);

  for (let index = 0; index < recoveries.length; index += 1) {
    const exchange = await request(monitor, {
      method: "POST",
      path: "/api/viewer/exchange",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify({ credential: recoveries[index] }),
    });
    assert.equal(exchange.status, 200);
    assert.equal(json(exchange).excluded_session_id, exclusions[index]);
  }
});

test("viewer bootstrap grants expire after sixty seconds", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "codex-agent-view-bootstrap-test-"));
  const env = { CODEX_AGENT_VIEW_RUNTIME_DIR: join(root, "runtime") };
  let nowMs = 50_000;
  const monitor = await startMonitorServer({
    env,
    now: () => nowMs,
    port: 0,
    token: TOKEN,
    viewerToken: VIEWER_TOKEN,
  });
  t.after(async () => {
    await monitor.close().catch(() => {});
    await rm(root, { force: true, recursive: true });
  });
  const origin = `http://127.0.0.1:${monitor.runtimeInfo.port}`;
  const grant = await request(monitor, {
    method: "POST",
    path: "/api/internal/viewer-grant",
    headers: { ...bearer(), "content-type": "application/json" },
    body: JSON.stringify({ exclude_session_id: null }),
  });
  assert.equal(grant.status, 201);

  nowMs += 60_001;
  const expired = await request(monitor, {
    method: "POST",
    path: "/api/viewer/exchange",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ credential: json(grant).bootstrap_credential }),
  });
  assert.equal(expired.status, 401);
});

test("a bootstrap grant is invalid after a same-port process restart", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "codex-agent-view-bootstrap-restart-test-"));
  const env = { CODEX_AGENT_VIEW_RUNTIME_DIR: join(root, "runtime") };
  const port = await reserveLoopbackPort();
  const origin = `http://127.0.0.1:${port}`;
  t.after(async () => rm(root, { force: true, recursive: true }));

  const first = await startMonitorServer({
    env,
    port,
    token: "a".repeat(43),
    viewerToken: VIEWER_TOKEN,
  });
  const grant = await request(first, {
    method: "POST",
    path: "/api/internal/viewer-grant",
    headers: { ...bearer(first.runtimeInfo.token), "content-type": "application/json" },
    body: JSON.stringify({ exclude_session_id: null }),
  });
  assert.equal(grant.status, 201);
  await first.close();

  const second = await startMonitorServer({
    env,
    port,
    token: "b".repeat(43),
    viewerToken: VIEWER_TOKEN,
  });
  t.after(async () => second.close().catch(() => {}));
  const replay = await request(second, {
    method: "POST",
    path: "/api/viewer/exchange",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ credential: json(grant).bootstrap_credential }),
  });
  assert.equal(replay.status, 401);
});

test("exchanged viewer access expires after fifteen minutes", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "codex-agent-view-access-test-"));
  const env = { CODEX_AGENT_VIEW_RUNTIME_DIR: join(root, "runtime") };
  let nowMs = 80_000;
  const monitor = await startMonitorServer({
    env,
    now: () => nowMs,
    port: 0,
    token: TOKEN,
    viewerToken: VIEWER_TOKEN,
  });
  t.after(async () => {
    await monitor.close().catch(() => {});
    await rm(root, { force: true, recursive: true });
  });
  const origin = `http://127.0.0.1:${monitor.runtimeInfo.port}`;
  const grant = await request(monitor, {
    method: "POST",
    path: "/api/internal/viewer-grant",
    headers: { ...bearer(), "content-type": "application/json" },
    body: JSON.stringify({ exclude_session_id: null }),
  });
  const exchange = await request(monitor, {
    method: "POST",
    path: "/api/viewer/exchange",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ credential: json(grant).bootstrap_credential }),
  });
  assert.equal(exchange.status, 200);
  const accessCredential = json(exchange).access_credential;
  assert.equal(
    (await request(monitor, { path: "/api/state", headers: bearer(accessCredential) })).status,
    200,
  );

  nowMs += 15 * 60 * 1_000 + 1;
  assert.equal(
    (await request(monitor, { path: "/api/state", headers: bearer(accessCredential) })).status,
    401,
  );
});

test("state access rolls forward only within its original thirty-minute family", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "codex-agent-view-access-family-test-"));
  const env = { CODEX_AGENT_VIEW_RUNTIME_DIR: join(root, "runtime") };
  let nowMs = 100_000;
  const monitor = await startMonitorServer({
    env,
    now: () => nowMs,
    port: 0,
    token: TOKEN,
    viewerToken: VIEWER_TOKEN,
  });
  t.after(async () => {
    await monitor.close().catch(() => {});
    await rm(root, { force: true, recursive: true });
  });
  const origin = `http://127.0.0.1:${monitor.runtimeInfo.port}`;
  const grant = await request(monitor, {
    method: "POST",
    path: "/api/internal/viewer-grant",
    headers: { ...bearer(), "content-type": "application/json" },
    body: JSON.stringify({ exclude_session_id: null }),
  });
  const exchange = await request(monitor, {
    method: "POST",
    path: "/api/viewer/exchange",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ credential: json(grant).bootstrap_credential }),
  });
  let accessCredential = json(exchange).access_credential;

  nowMs += 14 * 60 * 1_000;
  const firstRefresh = await request(monitor, {
    path: "/api/state",
    headers: bearer(accessCredential),
  });
  assert.equal(firstRefresh.status, 200);
  accessCredential = firstRefresh.headers["x-codex-agent-view-access"];

  nowMs += 14 * 60 * 1_000;
  const familyCapped = await request(monitor, {
    path: "/api/state",
    headers: bearer(accessCredential),
  });
  assert.equal(familyCapped.status, 200);
  accessCredential = familyCapped.headers["x-codex-agent-view-access"];
  const cappedPayload = JSON.parse(
    Buffer.from(accessCredential.split(".", 1)[0], "base64url").toString("utf8"),
  );
  assert.equal(cappedPayload.exp - nowMs, 2 * 60 * 1_000);

  nowMs += 60 * 1_000;
  const beforeExpiry = await request(monitor, {
    path: "/api/state",
    headers: bearer(accessCredential),
  });
  assert.equal(beforeExpiry.status, 200);
  accessCredential = beforeExpiry.headers["x-codex-agent-view-access"];

  nowMs += 60 * 1_000 + 1;
  assert.equal(
    (await request(monitor, { path: "/api/state", headers: bearer(accessCredential) })).status,
    401,
  );
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

test("requires the exact bound authority and origin-form target for every request", async (t) => {
  const { monitor } = await startFixture(t);
  const port = monitor.runtimeInfo.port;
  for (const host of [
    "example.com",
    "127.0.0.1.example.com",
    "127.0.0.1",
    `127.0.0.1:${port + 1}`,
    `localhost:${port}`,
    `[::1]:${port}`,
  ]) {
    const response = await request(monitor, {
      path: "/api/state",
      headers: { ...bearer(), host },
    });
    assert.equal(response.status, 421);
    assert.equal(json(response).error, "exact monitor authority required");
  }

  const absoluteForm = await request(monitor, {
    path: `http://127.0.0.1:${port}/api/state`,
    headers: bearer(),
  });
  assert.equal(absoluteForm.status, 421);
  assert.equal(json(absoluteForm).error, "exact monitor authority required");

  const backslashTarget = await request(monitor, {
    path: "/\\evil",
    headers: bearer(),
  });
  assert.equal(backslashTarget.status, 421);
  assert.equal(json(backslashTarget).error, "exact monitor authority required");
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
