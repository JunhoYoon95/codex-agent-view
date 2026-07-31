import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { startMonitorServer } from "../src/runtime/server.mjs";

const senderPath = fileURLToPath(new URL("../scripts/send-hook.mjs", import.meta.url));

async function temporaryRuntime(t) {
  const root = await mkdtemp(join(tmpdir(), "codex-agent-view-sender-test-"));
  const env = {
    ...process.env,
    CODEX_AGENT_VIEW_RUNTIME_DIR: join(root, "runtime"),
  };
  t.after(async () => rm(root, { force: true, recursive: true }));
  return { env };
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

test("fails open with neutral stdout when the monitor is not running", async (t) => {
  const { env } = await temporaryRuntime(t);
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
