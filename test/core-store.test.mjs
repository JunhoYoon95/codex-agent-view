import assert from "node:assert/strict";
import test from "node:test";

import { createMonitorStore } from "../src/core/index.mjs";

function subagentPayload(eventName, overrides = {}) {
  return {
    session_id: "session-1",
    turn_id: "turn-1",
    hook_event_name: eventName,
    agent_id: "agent-1",
    agent_type: "default",
    ...overrides,
  };
}

function toolPayload(eventName, overrides = {}) {
  return {
    session_id: "session-1",
    turn_id: "turn-1",
    hook_event_name: eventName,
    tool_name: "Bash",
    tool_use_id: "tool-1",
    ...overrides,
  };
}

test("reduces lifecycle, tool, and permission events without sensitive state", () => {
  const store = createMonitorStore();
  store.ingest(subagentPayload("SubagentStart"), { receivedAtMs: 100 });
  store.ingest(
    toolPayload("PreToolUse", {
      tool_input: { command: "private command" },
      cwd: "/private/workspace",
    }),
    { receivedAtMs: 110 },
  );
  store.ingest(
    {
      session_id: "session-1",
      turn_id: "turn-1",
      hook_event_name: "PermissionRequest",
      tool_name: "Bash",
      tool_input: { command: "private approval command" },
    },
    { receivedAtMs: 120 },
  );

  assert.equal(
    store.getSnapshot().sessions[0].permission.status,
    "waiting_for_user",
  );

  store.ingest(
    toolPayload("PostToolUse", { tool_response: "private output" }),
    { receivedAtMs: 130 },
  );
  store.ingest(subagentPayload("SubagentStop"), { receivedAtMs: 140 });

  const snapshot = store.getSnapshot();
  assert.equal(snapshot.source_of_truth, "hook");
  assert.equal(snapshot.updated_at_ms, 140);
  assert.equal(snapshot.sessions.length, 1);
  assert.equal(snapshot.sessions[0].agents[0].status, "stopped");
  assert.equal(snapshot.sessions[0].agents[0].started_at_ms, 100);
  assert.equal(snapshot.sessions[0].agents[0].stopped_at_ms, 140);
  assert.deepEqual(snapshot.sessions[0].permission, { status: "idle" });

  const serialized = JSON.stringify(snapshot);
  for (const privateValue of [
    "private command",
    "private approval command",
    "private output",
    "/private/workspace",
  ]) {
    assert(!serialized.includes(privateValue));
  }
});

test("derives session status without inventing parent completion", () => {
  const store = createMonitorStore();
  store.ingest(toolPayload("PreToolUse"), { receivedAtMs: 10 });
  assert.equal(store.getSnapshot().sessions[0].status, "running");

  store.ingest(
    {
      session_id: "session-1",
      turn_id: "turn-1",
      hook_event_name: "PermissionRequest",
      tool_name: "Bash",
    },
    { receivedAtMs: 20 },
  );
  assert.equal(store.getSnapshot().sessions[0].status, "waiting_for_user");

  store.ingest(toolPayload("PostToolUse"), { receivedAtMs: 30 });
  assert.equal(store.getSnapshot().sessions[0].status, "observed");

  store.ingest(subagentPayload("SubagentStart"), { receivedAtMs: 40 });
  assert.equal(store.getSnapshot().sessions[0].status, "running");
  store.ingest(subagentPayload("SubagentStop"), { receivedAtMs: 50 });
  assert.equal(store.getSnapshot().sessions[0].status, "observed");
});

test("tracks parent session and turn lifecycle from hooks", () => {
  const store = createMonitorStore();
  store.ingest(
    { session_id: "session-1", hook_event_name: "SessionStart", source: "startup" },
    { receivedAtMs: 5 },
  );
  assert.equal(store.getSnapshot().sessions[0].status, "observed");

  store.ingest(
    { ...subagentPayload("UserPromptSubmit") },
    { receivedAtMs: 10 },
  );
  let session = store.getSnapshot().sessions[0];
  assert.equal(session.status, "running");
  assert.equal(session.root_turn.status, "running");

  store.ingest(
    { ...subagentPayload("Stop") },
    { receivedAtMs: 20 },
  );
  session = store.getSnapshot().sessions[0];
  assert.equal(session.status, "observed");
  assert.equal(session.root_turn.status, "completed");

  store.ingest(
    { session_id: "session-1", hook_event_name: "SessionEnd", reason: "other" },
    { receivedAtMs: 30 },
  );
  session = store.getSnapshot().sessions[0];
  assert.equal(session.status, "completed");
  assert.equal(session.recent_activities[0].type, "session_ended");

  store.ingest(
    { session_id: "session-1", hook_event_name: "SessionStart", source: "resume" },
    { receivedAtMs: 40 },
  );
  session = store.getSnapshot().sessions[0];
  assert.equal(session.status, "observed");
  assert.equal(session.recent_activities[0].type, "session_started");
});

test("keeps the latest observed workspace label without retaining a full path", () => {
  const store = createMonitorStore();
  store.ingest(
    {
      session_id: "session-1",
      hook_event_name: "SessionStart",
      workspace_label: "new-project",
      cwd: "/private/new-project",
    },
    { receivedAtMs: 200 },
  );
  store.ingest(
    {
      ...toolPayload("PreToolUse"),
      workspace_label: "old-project",
      cwd: "/private/old-project",
    },
    { receivedAtMs: 100 },
  );

  let snapshot = store.getSnapshot();
  assert.equal(snapshot.sessions[0].workspace_label, "new-project");
  assert(!JSON.stringify(snapshot).includes("/private/"));

  store.ingest(
    {
      ...toolPayload("PostToolUse"),
      workspace_label: "latest-project",
      prompt: "private prompt",
      tool_input: { command: "private command" },
      tool_response: "private output",
    },
    { receivedAtMs: 300 },
  );
  snapshot = store.getSnapshot();
  assert.equal(snapshot.sessions[0].workspace_label, "latest-project");
  const serialized = JSON.stringify(snapshot);
  for (const privateValue of [
    "private prompt",
    "private command",
    "private output",
  ]) {
    assert(!serialized.includes(privateValue));
  }
});

test("treats repeated lifecycle and tool hooks as duplicates", () => {
  const store = createMonitorStore();
  const start = subagentPayload("SubagentStart");
  const toolStart = toolPayload("PreToolUse");

  assert.equal(store.ingest(start, { receivedAtMs: 10 }).status, "applied");
  assert.equal(store.ingest(start, { receivedAtMs: 11 }).status, "duplicate");
  assert.equal(store.ingest(toolStart, { receivedAtMs: 12 }).status, "applied");
  assert.equal(store.ingest(toolStart, { receivedAtMs: 13 }).status, "duplicate");

  const session = store.getSnapshot().sessions[0];
  assert.equal(session.agents.length, 1);
  assert.equal(session.recent_activities.length, 2);
});

test("keeps stopped and completed state when events arrive out of order", () => {
  const store = createMonitorStore();
  store.ingest(subagentPayload("SubagentStop"), { receivedAtMs: 200 });
  store.ingest(subagentPayload("SubagentStart"), { receivedAtMs: 100 });
  store.ingest(toolPayload("PostToolUse"), { receivedAtMs: 300 });
  store.ingest(toolPayload("PreToolUse"), { receivedAtMs: 250 });

  const session = store.getSnapshot().sessions[0];
  assert.equal(session.first_seen_at_ms, 100);
  assert.equal(session.last_seen_at_ms, 300);
  assert.deepEqual(
    {
      status: session.agents[0].status,
      started_at_ms: session.agents[0].started_at_ms,
      stopped_at_ms: session.agents[0].stopped_at_ms,
      has_out_of_order_events: session.agents[0].has_out_of_order_events,
    },
    {
      status: "stopped",
      started_at_ms: 100,
      stopped_at_ms: 200,
      has_out_of_order_events: true,
    },
  );
  assert(session.recent_activities.some(({ status }) => status === "completed_without_start"));
  assert(session.recent_activities.some(({ status }) => status === "late_start_observed"));
});

test("represents missing start events instead of inventing them", () => {
  const store = createMonitorStore();
  store.ingest(subagentPayload("SubagentStop"), { receivedAtMs: 10 });
  store.ingest(toolPayload("PostToolUse"), { receivedAtMs: 20 });

  const session = store.getSnapshot().sessions[0];
  assert.equal(session.agents[0].status, "stopped_without_start");
  assert.equal(session.agents[0].started_at_ms, null);
  assert.equal(session.recent_activities[0].status, "completed_without_start");
});

test("ignores malformed and unknown events while retaining bounded diagnostics", () => {
  const store = createMonitorStore({ maxDiagnostics: 2 });
  store.ingest(null, { receivedAtMs: 1 });
  store.ingest(
    {
      session_id: "session-1",
      turn_id: "turn-1",
      hook_event_name: "UnknownEvent",
    },
    { receivedAtMs: 2 },
  );
  store.ingest(
    { hook_event_name: "SubagentStart" },
    { receivedAtMs: 3 },
  );

  const snapshot = store.getSnapshot();
  assert.equal(snapshot.sessions.length, 0);
  assert.deepEqual(
    snapshot.diagnostics.map(({ code }) => code),
    ["missing_required_field", "unsupported_hook_event"],
  );
  assert(!JSON.stringify(snapshot).includes("UnknownEvent"));
});

test("bounds sessions, agents, and recent activities", () => {
  const store = createMonitorStore({
    maxSessions: 2,
    maxAgentsPerSession: 2,
    maxActivitiesPerSession: 2,
  });

  for (let index = 1; index <= 3; index += 1) {
    store.ingest(
      subagentPayload("SubagentStart", {
        agent_id: `agent-${index}`,
      }),
      { receivedAtMs: index },
    );
  }

  let session = store.getSnapshot().sessions[0];
  assert.deepEqual(
    session.agents.map(({ agent_id }) => agent_id),
    ["agent-3", "agent-2"],
  );
  assert.equal(session.recent_activities.length, 2);

  store.ingest(
    subagentPayload("SubagentStart", {
      session_id: "session-2",
      agent_id: "agent-4",
    }),
    { receivedAtMs: 4 },
  );
  store.ingest(
    subagentPayload("SubagentStart", {
      session_id: "session-3",
      agent_id: "agent-5",
    }),
    { receivedAtMs: 5 },
  );

  const snapshot = store.getSnapshot();
  assert.deepEqual(
    snapshot.sessions.map(({ session_id }) => session_id),
    ["session-3", "session-2"],
  );
});

test("does not let an older permission event replace newer waiting state", () => {
  const store = createMonitorStore();
  const permission = (turnId, toolName) => ({
    session_id: "session-1",
    turn_id: turnId,
    hook_event_name: "PermissionRequest",
    tool_name: toolName,
  });

  store.ingest(permission("turn-2", "apply_patch"), { receivedAtMs: 200 });
  const stale = store.ingest(permission("turn-1", "Bash"), {
    receivedAtMs: 100,
  });

  assert.equal(stale.status, "stale");
  const snapshot = store.getSnapshot();
  assert.deepEqual(snapshot.sessions[0].permission, {
    status: "waiting_for_user",
    tool_name: "apply_patch",
    turn_id: "turn-2",
    requested_at_ms: 200,
  });
  assert.equal(snapshot.diagnostics[0].code, "stale_event_ignored");
});
