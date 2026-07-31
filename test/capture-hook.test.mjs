import assert from "node:assert/strict";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(
  new URL("../scripts/capture-hook.mjs", import.meta.url),
);

function runCapture(payload, captureDirectory, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      env: {
        ...process.env,
        CODEX_AGENT_VIEW_CAPTURE_DIR: captureDirectory,
        ...extraEnv,
      },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.stdin.on("error", (error) => {
      if (error.code !== "EPIPE") {
        reject(error);
      }
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
    child.stdin.end(typeof payload === "string" ? payload : JSON.stringify(payload));
  });
}

test("captures event metadata while redacting sensitive payload fields", async () => {
  const directory = await mkdtemp(join(tmpdir(), "codex-agent-view-test-"));
  const result = await runCapture(
    {
      session_id: "thr_parent",
      hook_event_name: "PreToolUse",
      tool_name: "Bash",
      tool_input: { command: "printf secret" },
      tool_response: "secret output",
      last_assistant_message: "private message",
      transcript_path: "/private/session/transcript.jsonl",
    },
    directory,
  );

  assert.equal(result.code, 0);
  assert.equal(result.stdout, "{}\n");
  assert.equal(result.stderr, "");

  const record = JSON.parse((await readFile(join(directory, "events.jsonl"), "utf8")).trim());
  assert.equal(record.schema_version, 1);
  assert(Number.isInteger(record.captured_at_ms));
  assert(record.captured_at_ms > 0);
  assert(!("captured_at" in record));
  assert.equal(record.payload.session_id, "thr_parent");
  assert.deepEqual(record.payload.tool_input, {
    redacted: true,
    type: "object",
    keys: ["command"],
  });
  assert.equal(record.payload.tool_response.redacted, true);
  assert.equal(record.payload.last_assistant_message.redacted, true);
  assert.deepEqual(record.payload.transcript_path, {
    redacted: true,
    type: "string",
    length: "/private/session/transcript.jsonl".length,
  });
  assert(!JSON.stringify(record).includes("printf secret"));
  assert(!JSON.stringify(record).includes("secret output"));
  assert(!JSON.stringify(record).includes("private message"));
  assert(!JSON.stringify(record).includes("/private/session/transcript.jsonl"));

  if (process.platform !== "win32") {
    const captureFile = await stat(join(directory, "events.jsonl"));
    assert.equal(captureFile.mode & 0o777, 0o600);
  }
});

test("full capture is explicit opt-in", async () => {
  const directory = await mkdtemp(join(tmpdir(), "codex-agent-view-test-"));
  const result = await runCapture(
    { hook_event_name: "PreToolUse", tool_input: { command: "printf harmless" } },
    directory,
    { CODEX_AGENT_VIEW_CAPTURE_FULL: "1" },
  );

  assert.equal(result.code, 0);
  assert.equal(result.stdout, "{}\n");
  const record = JSON.parse((await readFile(join(directory, "events.jsonl"), "utf8")).trim());
  assert.equal(record.payload.tool_input.command, "printf harmless");
});

test("redacts paths and unknown fields by default", async () => {
  const directory = await mkdtemp(join(tmpdir(), "codex-agent-view-test-"));
  const result = await runCapture(
    {
      hook_event_name: "SubagentStop",
      agent_id: "agent-1",
      cwd: "/private/workspace",
      agent_transcript_path: "/private/subagent.jsonl",
      future_sensitive_field: "future secret",
    },
    directory,
  );

  assert.equal(result.code, 0);
  assert.equal(result.stdout, "{}\n");
  const record = JSON.parse((await readFile(join(directory, "events.jsonl"), "utf8")).trim());
  assert.equal(record.payload.agent_id, "agent-1");
  assert.equal(record.payload.cwd.redacted, true);
  assert.equal(record.payload.agent_transcript_path.redacted, true);
  assert.equal(record.payload.future_sensitive_field.redacted, true);
  assert(!JSON.stringify(record).includes("future secret"));
});

test("keeps concurrent appends as complete JSON lines", async () => {
  const directory = await mkdtemp(join(tmpdir(), "codex-agent-view-test-"));
  const processCount = 24;
  const results = await Promise.all(
    Array.from({ length: processCount }, (_, index) =>
      runCapture(
        {
          hook_event_name: "PreToolUse",
          tool_use_id: `tool-${index}`,
          tool_input: { command: "x".repeat(32 * 1024) },
        },
        directory,
      ),
    ),
  );

  assert(results.every((result) => result.code === 0));
  const lines = (await readFile(join(directory, "events.jsonl"), "utf8"))
    .trim()
    .split("\n");
  assert.equal(lines.length, processCount);
  const ids = new Set(lines.map((line) => JSON.parse(line).payload.tool_use_id));
  assert.equal(ids.size, processCount);
});

test("runs when the installed path contains URL-special characters", async () => {
  const directory = await mkdtemp(join(tmpdir(), "codex-agent-view-test-"));
  const specialDirectory = join(directory, "plugin #1");
  const copiedScript = join(specialDirectory, "capture-hook.mjs");
  const captureDirectory = join(directory, "captures");
  await mkdir(specialDirectory);
  await copyFile(scriptPath, copiedScript);

  const result = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [copiedScript], {
      env: {
        ...process.env,
        CODEX_AGENT_VIEW_CAPTURE_DIR: captureDirectory,
      },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
    child.stdin.end(JSON.stringify({ hook_event_name: "SubagentStart" }));
  });

  assert.deepEqual(result, { code: 0, stdout: "{}\n", stderr: "" });
  const record = JSON.parse(
    (await readFile(join(captureDirectory, "events.jsonl"), "utf8")).trim(),
  );
  assert.equal(record.payload.hook_event_name, "SubagentStart");
});

test(
  "does not follow a symlink used as the capture file",
  { skip: process.platform === "win32" },
  async () => {
    const directory = await mkdtemp(join(tmpdir(), "codex-agent-view-test-"));
    const captureDirectory = join(directory, "captures");
    const target = join(directory, "target.txt");
    await mkdir(captureDirectory);
    await writeFile(target, "unchanged\n");
    await symlink(target, join(captureDirectory, "events.jsonl"));

    const result = await runCapture(
      { hook_event_name: "SubagentStart" },
      captureDirectory,
    );

    assert.equal(result.code, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /hook capture failed/);
    assert.equal(await readFile(target, "utf8"), "unchanged\n");
  },
);

test("rejects malformed input without writing hook output to stdout", async () => {
  const directory = await mkdtemp(join(tmpdir(), "codex-agent-view-test-"));
  const result = await runCapture("not-json", directory);

  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /hook capture failed/);
});

test("rejects hook payloads larger than 2 MiB", async () => {
  const directory = await mkdtemp(join(tmpdir(), "codex-agent-view-test-"));
  const oversizedPayload = JSON.stringify({
    hook_event_name: "PreToolUse",
    value: "x".repeat(2 * 1024 * 1024),
  });

  const result = await runCapture(oversizedPayload, directory);

  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /payload exceeds 2097152 bytes/);
  await assert.rejects(readFile(join(directory, "events.jsonl"), "utf8"), {
    code: "ENOENT",
  });
});
