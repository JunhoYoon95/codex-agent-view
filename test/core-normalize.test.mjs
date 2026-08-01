import assert from "node:assert/strict";
import test from "node:test";

import { normalizeHookPayload } from "../src/core/index.mjs";

const common = {
  session_id: "session-1",
  turn_id: "turn-1",
};

test("normalizes the supported hook events into a narrow safe contract", () => {
  const fixtures = [
    [
      {
        session_id: "session-1",
        hook_event_name: "SessionStart",
        source: "startup",
      },
      "session_started",
    ],
    [
      {
        session_id: "session-1",
        hook_event_name: "SessionEnd",
        reason: "other",
      },
      "session_ended",
    ],
    [{ ...common, hook_event_name: "UserPromptSubmit" }, "turn_started"],
    [{ ...common, hook_event_name: "Stop" }, "turn_stopped"],
    [
      {
        ...common,
        hook_event_name: "SubagentStart",
        agent_id: "agent-1",
        agent_type: "default",
      },
      "subagent_started",
    ],
    [
      {
        ...common,
        hook_event_name: "SubagentStop",
        agent_id: "agent-1",
        agent_type: "default",
      },
      "subagent_stopped",
    ],
    [
      {
        ...common,
        hook_event_name: "PreToolUse",
        tool_name: "Bash",
        tool_use_id: "tool-1",
      },
      "tool_started",
    ],
    [
      {
        ...common,
        hook_event_name: "PostToolUse",
        tool_name: "Bash",
        tool_use_id: "tool-1",
      },
      "tool_completed",
    ],
    [
      {
        ...common,
        hook_event_name: "PermissionRequest",
        tool_name: "Bash",
      },
      "permission_requested",
    ],
  ];

  for (const [payload, expectedType] of fixtures) {
    const result = normalizeHookPayload(payload, { receivedAtMs: 123 });
    assert.equal(result.status, "accepted");
    assert.equal(result.event.type, expectedType);
    assert.equal(result.event.source, "hook");
    assert.equal(result.event.received_at_ms, 123);
  }
});

test("does not copy sensitive or unknown payload fields", () => {
  const result = normalizeHookPayload(
    {
      ...common,
      hook_event_name: "PostToolUse",
      tool_name: "Bash",
      tool_use_id: "tool-1",
      prompt: "private prompt",
      tool_input: { command: "private command" },
      tool_response: "private output",
      cwd: "/private/workspace",
      transcript_path: "/private/transcript.jsonl",
      last_assistant_message: "private answer",
      future_field: "private future value",
    },
    { receivedAtMs: 123 },
  );

  assert.equal(result.status, "accepted");
  const serialized = JSON.stringify(result);
  for (const privateValue of [
    "private prompt",
    "private command",
    "private output",
    "/private/workspace",
    "/private/transcript.jsonl",
    "private answer",
    "private future value",
  ]) {
    assert(!serialized.includes(privateValue));
  }
});

test("accepts a bounded workspace label without retaining cwd", () => {
  const result = normalizeHookPayload(
    {
      ...common,
      hook_event_name: "UserPromptSubmit",
      workspace_label: "  acme-project  ",
      cwd: "/private/customer/acme-project",
    },
    { receivedAtMs: 123 },
  );

  assert.equal(result.status, "accepted");
  assert.equal(result.event.workspace_label, "acme-project");
  assert(!JSON.stringify(result).includes("/private/customer/acme-project"));
});

test("omits malformed optional workspace labels without dropping lifecycle events", () => {
  for (const workspaceLabel of [
    null,
    {},
    "",
    "bad\nlabel",
    "x".repeat(121),
  ]) {
    const result = normalizeHookPayload(
      {
        ...common,
        hook_event_name: "UserPromptSubmit",
        workspace_label: workspaceLabel,
      },
      { receivedAtMs: 124 },
    );
    assert.equal(result.status, "accepted");
    assert(!("workspace_label" in result.event));
  }
});

test("returns diagnostics for malformed, missing, and invalid fields", () => {
  for (const payload of [null, [], "not-an-object"]) {
    const result = normalizeHookPayload(payload, { receivedAtMs: 10 });
    assert.equal(result.status, "ignored");
    assert.equal(result.diagnostic.code, "malformed_payload");
  }

  const missing = normalizeHookPayload(
    { hook_event_name: "SubagentStart" },
    { receivedAtMs: 11 },
  );
  assert.deepEqual(missing, {
    status: "ignored",
    diagnostic: {
      code: "missing_required_field",
      diagnosed_at_ms: 11,
      field: "session_id",
    },
  });

  const invalid = normalizeHookPayload(
    {
      ...common,
      hook_event_name: "PreToolUse",
      tool_name: "",
      tool_use_id: "tool-1",
    },
    { receivedAtMs: 12 },
  );
  assert.equal(invalid.status, "ignored");
  assert.equal(invalid.diagnostic.code, "invalid_field");
  assert.equal(invalid.diagnostic.field, "tool_name");
});

test("ignores unknown events without echoing the unknown value", () => {
  const result = normalizeHookPayload(
    {
      ...common,
      hook_event_name: "PrivateFutureEvent",
      prompt: "do not echo",
    },
    { receivedAtMs: 20 },
  );

  assert.deepEqual(result, {
    status: "ignored",
    diagnostic: {
      code: "unsupported_hook_event",
      diagnosed_at_ms: 20,
      field: "hook_event_name",
    },
  });
  assert(!JSON.stringify(result).includes("PrivateFutureEvent"));
  assert(!JSON.stringify(result).includes("do not echo"));
});

test("rejects an invalid normalization timestamp", () => {
  assert.throws(
    () => normalizeHookPayload({}, { receivedAtMs: -1 }),
    /receivedAtMs must be a non-negative safe integer/,
  );
});
