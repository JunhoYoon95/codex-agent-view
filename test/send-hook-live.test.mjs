import assert from "node:assert/strict";
import { access, mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createMonitorStore } from "../src/core/index.mjs";
import {
  LOOPBACK_HOST,
  RUNTIME_SCHEMA_VERSION,
  readRuntimeInfo,
  readViewerToken,
  runtimeFile,
  writeRuntimeInfo,
} from "../src/runtime/config.mjs";
import { startMonitorServer } from "../src/runtime/server.mjs";

const senderPath = fileURLToPath(new URL("../scripts/send-hook.mjs", import.meta.url));

async function temporaryRuntime(t) {
  const root = await mkdtemp(join(tmpdir(), "codex-agent-view-sender-test-"));
  const port = await reserveLoopbackPort();
  const env = {
    ...process.env,
    CODEX_AGENT_VIEW_AUTO_START_PORT: String(port),
    CODEX_AGENT_VIEW_RUNTIME_DIR: join(root, "runtime"),
  };
  t.after(async () => {
    await stopDetachedMonitor(env).catch(() => {});
    await rm(root, { force: true, recursive: true });
  });
  return { env, port };
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

async function waitFor(predicate, timeoutMs = 2_000) {
  const deadline = Date.now() + timeoutMs;
  do {
    if (await predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  } while (Date.now() < deadline);
  assert.fail("condition was not met before timeout");
}

function processExists(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") {
      return false;
    }
    throw error;
  }
}

async function stopDetachedMonitor(env) {
  let runtime;
  try {
    runtime = await readRuntimeInfo(env);
  } catch {
    return;
  }
  if (runtime.pid === process.pid || !processExists(runtime.pid)) {
    return;
  }
  process.kill(runtime.pid, "SIGTERM");
  await waitFor(async () => {
    const runtimeRemoved = await access(runtimeFile(env)).then(
      () => false,
      (error) => error?.code === "ENOENT",
    );
    return runtimeRemoved && !processExists(runtime.pid);
  });
}

async function fetchSnapshot(runtime) {
  const response = await fetch(
    `http://${runtime.host}:${runtime.port}/api/state`,
    {
      headers: {
        authorization: `Bearer ${runtime.viewer_token || runtime.token}`,
      },
      signal: AbortSignal.timeout(500),
    },
  );
  assert.equal(response.status, 200);
  return response.json();
}

function runSender(payload, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [senderPath], {
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stderr, stdout }));
    child.stdin.end(typeof payload === "string" ? payload : JSON.stringify(payload));
  });
}

test("auto-starts a detached monitor and reuses it for later hooks", async (t) => {
  const { env, port } = await temporaryRuntime(t);
  const result = await runSender(
    {
      session_id: "session-1",
      turn_id: "turn-1",
      hook_event_name: "SubagentStart",
      agent_id: "agent-1",
      agent_type: "default",
    },
    env,
  );

  assert.deepEqual(result, { code: 0, stderr: "", stdout: "{}\n" });
  const runtime = await readRuntimeInfo(env);
  assert.equal(runtime.port, port);
  assert.notEqual(runtime.pid, process.pid);
  assert.equal(runtime.viewer_token, await readViewerToken(env));
  assert(!`${result.stdout}${result.stderr}`.includes(runtime.viewer_token));
  const snapshot = await fetchSnapshot(runtime);
  assert.equal(snapshot.sessions[0].session_id, "session-1");
  assert.equal(snapshot.sessions[0].agents[0].agent_id, "agent-1");

  const second = await runSender(
    {
      session_id: "session-1",
      turn_id: "turn-1",
      hook_event_name: "SubagentStop",
      agent_id: "agent-1",
      agent_type: "default",
    },
    env,
  );
  assert.deepEqual(second, { code: 0, stderr: "", stdout: "{}\n" });
  assert.equal((await readRuntimeInfo(env)).pid, runtime.pid);

  await stopDetachedMonitor(env);
  assert.equal(processExists(runtime.pid), false);
  await assert.rejects(access(runtimeFile(env)), { code: "ENOENT" });
});

test("concurrent hooks converge on one auto-started monitor", async (t) => {
  const { env } = await temporaryRuntime(t);
  const results = await Promise.all(
    Array.from({ length: 6 }, (_, index) =>
      runSender(
        {
          session_id: `session-${index}`,
          turn_id: `turn-${index}`,
          hook_event_name: "SubagentStart",
          agent_id: `agent-${index}`,
          agent_type: "default",
        },
        env,
      ),
    ),
  );
  for (const result of results) {
    assert.deepEqual(result, { code: 0, stderr: "", stdout: "{}\n" });
  }

  const runtime = await readRuntimeInfo(env);
  await waitFor(async () => (await fetchSnapshot(runtime)).sessions.length === 6);
  await new Promise((resolve) => setTimeout(resolve, 150));
  assert.equal((await readRuntimeInfo(env)).pid, runtime.pid);
  assert.equal(processExists(runtime.pid), true);

  await stopDetachedMonitor(env);
  assert.equal(processExists(runtime.pid), false);
});

test("retries a transient live-runtime rejection with the same minimized event", async (t) => {
  const { env, port } = await temporaryRuntime(t);
  const token = "r".repeat(43);
  const receivedBodies = [];
  let eventRequests = 0;
  const server = createServer((request, response) => {
    if (request.method === "GET" && request.url === "/api/state") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end('{"sessions":[]}');
      return;
    }

    if (request.method === "POST" && request.url === "/api/events") {
      eventRequests += 1;
      const chunks = [];
      request.on("data", (chunk) => chunks.push(chunk));
      request.on("end", () => {
        receivedBodies.push(Buffer.concat(chunks).toString("utf8"));
        if (eventRequests === 1) {
          response.writeHead(503);
          response.end();
          return;
        }
        response.writeHead(202, { "content-type": "application/json" });
        response.end('{"status":"accepted"}');
      });
      return;
    }

    response.writeHead(404);
    response.end();
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, LOOPBACK_HOST, resolve);
  });
  t.after(
    () =>
      new Promise((resolve) => {
        server.close(() => resolve());
      }),
  );
  await writeRuntimeInfo(
    {
      schema_version: RUNTIME_SCHEMA_VERSION,
      host: LOOPBACK_HOST,
      port,
      token,
      pid: process.pid,
      started_at_ms: Date.now(),
    },
    env,
  );

  const result = await runSender(
    {
      session_id: "session-retry",
      turn_id: "turn-retry",
      hook_event_name: "SessionEnd",
      reason: "completed",
      prompt: "private prompt",
      tool_input: { command: "private command" },
    },
    env,
  );

  assert.deepEqual(result, { code: 0, stderr: "", stdout: "{}\n" });
  assert.equal(eventRequests, 2);
  assert.equal(receivedBodies.length, 2);
  assert.equal(receivedBodies[0], receivedBodies[1]);
  const delivered = JSON.parse(receivedBodies[1]);
  assert.equal(delivered.hook_event_name, "SessionEnd");
  assert.equal(delivered.session_id, "session-retry");
  assert(!receivedBodies[1].includes("private prompt"));
  assert(!receivedBodies[1].includes("private command"));
});

test("fails open with neutral stdout when auto-start cannot bind", async (t) => {
  const { env, port } = await temporaryRuntime(t);
  const blocker = createServer((_request, response) => {
    response.writeHead(503);
    response.end();
  });
  await new Promise((resolve, reject) => {
    blocker.once("error", reject);
    blocker.listen(port, "127.0.0.1", resolve);
  });
  t.after(
    () =>
      new Promise((resolve) => {
        blocker.close(() => resolve());
      }),
  );

  const result = await runSender(
    {
      session_id: "session-blocked",
      hook_event_name: "SubagentStart",
      agent_id: "agent-blocked",
    },
    env,
  );
  assert.deepEqual(result, { code: 0, stderr: "", stdout: "{}\n" });
  await assert.rejects(readRuntimeInfo(env));
});

test("debug mode emits only a fixed failure code", async (t) => {
  const { env } = await temporaryRuntime(t);
  const runtimePath = env.CODEX_AGENT_VIEW_RUNTIME_DIR;
  const result = await runSender("private malformed input", {
    ...env,
    CODEX_AGENT_VIEW_DEBUG: "1",
  });

  assert.deepEqual(result, {
    code: 0,
    stderr: "codex-agent-view hook sender: delivery_failed\n",
    stdout: "{}\n",
  });
  assert(!result.stderr.includes("private malformed input"));
  assert(!result.stderr.includes(runtimePath));
});

test("delivers a minimized hook event to a live server", async (t) => {
  const { env } = await temporaryRuntime(t);
  const monitor = await startMonitorServer({
    host: "127.0.0.1",
    port: 0,
    env,
    token: "s".repeat(43),
    now: () => 500,
  });
  t.after(async () => monitor.close().catch(() => {}));

  const result = await runSender(
    {
      session_id: "session-1",
      turn_id: "turn-1",
      hook_event_name: "PostToolUse",
      tool_name: "Bash",
      tool_use_id: "tool-1",
      prompt: "private prompt",
      tool_input: { command: "private command" },
      tool_response: "private output",
      cwd: "/private/workspace",
      transcript_path: "/private/transcript.jsonl",
    },
    env,
  );

  assert.deepEqual(result, { code: 0, stderr: "", stdout: "{}\n" });
  const snapshot = monitor.store.getSnapshot();
  assert.equal(snapshot.sessions[0].workspace_label, "workspace");
  assert.equal(snapshot.sessions[0].recent_activities[0].status, "completed_without_start");
  const serialized = JSON.stringify(snapshot);
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

test("connects sender tool lifecycle to one exact agent turn without raw input", async (t) => {
  const { env } = await temporaryRuntime(t);
  let nowMs = 700;
  const monitor = await startMonitorServer({
    host: "127.0.0.1",
    port: 0,
    env,
    store: createMonitorStore({ now: () => nowMs }),
    token: "c".repeat(43),
    now: () => nowMs,
  });
  t.after(async () => monitor.close().catch(() => {}));

  const common = {
    session_id: "session-agent-current-tool",
    turn_id: "agent-turn",
  };
  assert.deepEqual(
    await runSender(
      {
        ...common,
        hook_event_name: "SubagentStart",
        agent_id: "agent-1",
        agent_type: "default",
      },
      env,
    ),
    { code: 0, stderr: "", stdout: "{}\n" },
  );

  nowMs = 710;
  assert.deepEqual(
    await runSender(
      {
        ...common,
        hook_event_name: "PreToolUse",
        tool_name: "apply_patch",
        tool_use_id: "edit-1",
        tool_input: {
          patch: "private customer patch that must never enter the snapshot",
        },
      },
      env,
    ),
    { code: 0, stderr: "", stdout: "{}\n" },
  );

  let agent = monitor.store.getSnapshot().sessions[0].agents[0];
  assert.equal(agent.current_tool_name, "apply_patch");
  assert.equal(agent.current_tool_status, "running");
  assert.equal(agent.current_tool_observed_at_ms, 710);
  assert(!JSON.stringify(agent).includes("private customer patch"));

  nowMs = 720;
  assert.deepEqual(
    await runSender(
      {
        ...common,
        hook_event_name: "PostToolUse",
        tool_name: "apply_patch",
        tool_use_id: "edit-1",
        tool_input: {
          patch: "private customer patch that must never enter the snapshot",
        },
        tool_response: "private patch result",
      },
      env,
    ),
    { code: 0, stderr: "", stdout: "{}\n" },
  );

  agent = monitor.store.getSnapshot().sessions[0].agents[0];
  assert.equal(agent.current_tool_name, "apply_patch");
  assert.equal(agent.current_tool_status, "completed");
  assert.equal(agent.current_tool_observed_at_ms, 720);
  const serialized = JSON.stringify(monitor.store.getSnapshot());
  assert(!serialized.includes("private customer patch"));
  assert(!serialized.includes("private patch result"));
  assert(!serialized.includes('"tool_input"'));
  assert(!serialized.includes('"tool_response"'));
});

test("derives one safe spawn assignment through sender and live monitor", async (t) => {
  const { env } = await temporaryRuntime(t);
  let nowMs = 800;
  const monitor = await startMonitorServer({
    host: "127.0.0.1",
    port: 0,
    env,
    store: createMonitorStore({ now: () => nowMs }),
    token: "s".repeat(43),
    now: () => nowMs,
  });
  t.after(async () => monitor.close().catch(() => {}));

  const common = {
    session_id: "session-agent-assignment",
    turn_id: "parent-turn",
    tool_name: "collaborationspawn_agent",
    tool_use_id: "spawn-1",
  };
  const rawMessage = `gAAAAAB${"A".repeat(172)}`;
  assert.deepEqual(
    await runSender(
      {
        ...common,
        hook_event_name: "PreToolUse",
        tool_input: { task_name: "assignment_e2e", message: rawMessage },
      },
      env,
    ),
    { code: 0, stderr: "", stdout: "{}\n" },
  );

  nowMs = 805;
  assert.deepEqual(
    await runSender(
      {
        ...common,
        hook_event_name: "PostToolUse",
        tool_input: { task_name: "assignment_e2e", message: rawMessage },
        tool_response: "private spawn response",
      },
      env,
    ),
    { code: 0, stderr: "", stdout: "{}\n" },
  );

  nowMs = 810;
  assert.deepEqual(
    await runSender(
      {
        session_id: common.session_id,
        turn_id: "agent-turn",
        hook_event_name: "SubagentStart",
        agent_id: "agent-1",
        agent_type: "default",
      },
      env,
    ),
    { code: 0, stderr: "", stdout: "{}\n" },
  );

  const snapshot = monitor.store.getSnapshot();
  const agent = snapshot.sessions[0].agents[0];
  assert.equal(agent.assignment_summary, "assignment e2e");
  assert.equal(agent.assignment_match, "best_effort_singleton");
  const serialized = JSON.stringify(snapshot);
  for (const privateValue of [
    rawMessage,
    "private spawn response",
    '"tool_input"',
    '"tool_response"',
    "pending_spawn_assignments",
  ]) {
    assert(!serialized.includes(privateValue));
  }
});

test("derives a safe task summary from UserPromptSubmit before transport", async (t) => {
  const { env } = await temporaryRuntime(t);
  const monitor = await startMonitorServer({
    host: "127.0.0.1",
    port: 0,
    env,
    token: "p".repeat(43),
    now: () => 550,
  });
  t.after(async () => monitor.close().catch(() => {}));

  const rawPrompt = [
    "상품 검색 결과의 정렬 오류를 고쳐 주세요.",
    "https://example.com/private person@example.com",
    "/Users/private/customer/app token=super-secret-token-value",
    "추가 설명 ".repeat(80),
  ].join("\n");
  const result = await runSender(
    {
      session_id: "session-summary",
      turn_id: "turn-summary",
      hook_event_name: "UserPromptSubmit",
      prompt: rawPrompt,
      cwd: "/private/customer/storefront",
    },
    env,
  );

  assert.deepEqual(result, { code: 0, stderr: "", stdout: "{}\n" });
  const session = monitor.store.getSnapshot().sessions[0];
  assert.equal(session.workspace_label, "storefront");
  assert.match(session.task_summary, /^상품 검색 결과의 정렬 오류를 고쳐 주세요\./);
  assert(Array.from(session.task_summary).length <= 180);
  const serialized = JSON.stringify(session);
  assert(!serialized.includes(rawPrompt));
  assert(!serialized.includes("https://example.com/private"));
  assert(!serialized.includes("person@example.com"));
  assert(!serialized.includes("/Users/private/customer/app"));
  assert(!serialized.includes("super-secret-token-value"));
  assert(!serialized.includes('"prompt"'));
});

test("excludes ambient browser UI state from the transported task summary", async (t) => {
  const { env } = await temporaryRuntime(t);
  const monitor = await startMonitorServer({
    host: "127.0.0.1",
    port: 0,
    env,
    token: "a".repeat(43),
    now: () => 575,
  });
  t.after(async () => monitor.close().catch(() => {}));

  const ambientContext = [
    '<in-app-browser-context source="ambient-ui-state">',
    "This block is automatically supplied ambient UI state, not part of the user's request.",
    "# In app browser:",
    "- Current URL: https://private.example/customer/42",
    "</in-app-browser-context>",
  ].join("\n");
  const rawPrompt = `${ambientContext}\n\n## My request for Codex:\n완료`;
  const result = await runSender(
    {
      session_id: "session-ambient-summary",
      turn_id: "turn-ambient-summary",
      hook_event_name: "UserPromptSubmit",
      prompt: rawPrompt,
    },
    env,
  );

  assert.deepEqual(result, { code: 0, stderr: "", stdout: "{}\n" });
  const session = monitor.store.getSnapshot().sessions[0];
  assert.equal(session.task_summary, "완료");
  const serialized = JSON.stringify(session);
  assert(!serialized.includes(rawPrompt));
  assert(!serialized.includes("ambient UI state"));
  assert(!serialized.includes("private.example"));
  assert(!serialized.includes('"prompt"'));
});

test("derives only a bounded sanitized workspace basename", async (t) => {
  const { env } = await temporaryRuntime(t);
  const monitor = await startMonitorServer({
    host: "127.0.0.1",
    port: 0,
    env,
    token: "w".repeat(43),
    now: () => 600,
  });
  t.after(async () => monitor.close().catch(() => {}));

  const fixtures = [
    ["session-project", "/private/customer/acme-project", "acme-project"],
    ["session-root", "/", null],
    ["session-empty", "", null],
    ["session-control", "/private/bad\u0000\nname", "bad name"],
    ["session-long", `/private/${"x".repeat(200)}`, "x".repeat(120)],
  ];

  for (const [sessionId, cwd, expectedLabel] of fixtures) {
    const result = await runSender(
      {
        session_id: sessionId,
        hook_event_name: "SessionStart",
        cwd,
      },
      env,
    );
    assert.deepEqual(result, { code: 0, stderr: "", stdout: "{}\n" });
    const session = monitor.store
      .getSnapshot()
      .sessions.find(({ session_id: id }) => id === sessionId);
    assert.equal(session.workspace_label, expectedLabel);
  }

  const serialized = JSON.stringify(monitor.store.getSnapshot());
  assert(!serialized.includes("/private/customer/acme-project"));
  assert(!serialized.includes("/private/bad"));
  assert(!serialized.includes(`/private/${"x".repeat(200)}`));
});
