#!/usr/bin/env node

import { basename } from "node:path";

import { minimizePayload } from "./capture-hook.mjs";
import { readRuntimeInfo } from "../src/runtime/config.mjs";

const MAX_STDIN_BYTES = 2 * 1024 * 1024;
const SEND_TIMEOUT_MS = 750;
const MAX_WORKSPACE_LABEL_LENGTH = 120;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/g;

async function readStdin() {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of process.stdin) {
    bytes += chunk.length;
    if (bytes > MAX_STDIN_BYTES) {
      throw new Error(`hook payload exceeds ${MAX_STDIN_BYTES} bytes`);
    }
    chunks.push(chunk);
  }
  const payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (payload === null || Array.isArray(payload) || typeof payload !== "object") {
    throw new TypeError("hook payload must be a JSON object");
  }
  return payload;
}

function debug(code) {
  if (process.env.CODEX_AGENT_VIEW_DEBUG === "1") {
    process.stderr.write(`codex-agent-view hook sender: ${code}\n`);
  }
}

function deriveWorkspaceLabel(cwd) {
  if (typeof cwd !== "string" || cwd.length === 0) {
    return null;
  }

  const label = basename(cwd)
    .replace(CONTROL_CHARACTERS, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_WORKSPACE_LABEL_LENGTH)
    .trim();
  return label || null;
}

function monitorEnvelope(payload) {
  const minimized = minimizePayload(payload);
  const workspaceLabel = deriveWorkspaceLabel(payload.cwd);
  return workspaceLabel
    ? { ...minimized, workspace_label: workspaceLabel }
    : minimized;
}

async function send(payload) {
  const runtime = await readRuntimeInfo();
  const response = await fetch(
    `http://${runtime.host}:${runtime.port}/api/events`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${runtime.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(monitorEnvelope(payload)),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    },
  );
  if (!response.ok) {
    throw new Error(`monitor returned HTTP ${response.status}`);
  }
}

async function main() {
  try {
    await send(await readStdin());
  } catch {
    // Monitoring is fail-open: an unavailable companion must not block Codex.
    debug("delivery_failed");
  }
  process.stdout.write("{}\n");
}

main().catch(() => {
  debug("unexpected_failure");
  process.stdout.write("{}\n");
});
