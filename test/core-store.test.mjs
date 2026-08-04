import assert from "node:assert/strict";
import test from "node:test";

import { createMonitorStore } from "../src/core/index.mjs";

function createTestStore(options = {}) {
  return createMonitorStore({ now: () => 0, ...options });
}

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

function spawnToolPayload(eventName, overrides = {}) {
  return toolPayload(eventName, {
    tool_name: "collaborationspawn_agent",
    tool_use_id: "spawn-1",
    tool_input: {
      task_name: "theme_worker",
      message: "테마 가져오기 쿼리 수정과 테스트를 맡아 주세요.",
    },
    ...overrides,
  });
}

test("reduces lifecycle, tool, and permission events without sensitive state", () => {
  const store = createTestStore();
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
  assert.equal(
    snapshot.sessions[0].recent_activities.find(
      ({ type }) => type === "subagent_started",
    ).status,
    "stopped",
  );
  assert.equal(
    snapshot.sessions[0].recent_activities.find(
      ({ type }) => type === "tool_started",
    ).status,
    "completed",
  );

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
  const store = createTestStore();
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

test("connects the latest tool lifecycle to one exact matching agent turn", () => {
  const store = createTestStore();
  store.ingest(
    subagentPayload("SubagentStart", { turn_id: "agent-turn" }),
    { receivedAtMs: 100 },
  );
  store.ingest(
    toolPayload("PreToolUse", {
      turn_id: "agent-turn",
      tool_name: "apply_patch",
      tool_use_id: "edit-1",
    }),
    { receivedAtMs: 110 },
  );

  let agent = store.getSnapshot().sessions[0].agents[0];
  assert.equal(agent.current_tool_name, "apply_patch");
  assert.equal(agent.current_tool_status, "running");
  assert.equal(agent.current_tool_observed_at_ms, 110);
  assert.equal(agent.last_seen_at_ms, 100);

  store.ingest(
    toolPayload("PostToolUse", {
      turn_id: "agent-turn",
      tool_name: "apply_patch",
      tool_use_id: "edit-1",
      tool_input: { command: "private patch" },
      tool_response: "private result",
    }),
    { receivedAtMs: 120 },
  );
  agent = store.getSnapshot().sessions[0].agents[0];
  assert.equal(agent.current_tool_status, "completed");
  assert.equal(agent.current_tool_observed_at_ms, 120);
  assert(!JSON.stringify(agent).includes("private patch"));
  assert(!JSON.stringify(agent).includes("private result"));
});

test("attaches one completed spawn assignment to one subsequent agent start", () => {
  const store = createTestStore();
  store.ingest(spawnToolPayload("PreToolUse"), { receivedAtMs: 100 });
  store.ingest(
    spawnToolPayload("PostToolUse", {
      tool_input: { private: "must not persist" },
      tool_response: "private spawn response",
    }),
    { receivedAtMs: 105 },
  );
  store.ingest(subagentPayload("SubagentStart", { turn_id: "agent-turn" }), {
    receivedAtMs: 110,
  });

  let snapshot = store.getSnapshot();
  let agent = snapshot.sessions[0].agents[0];
  assert.equal(
    agent.assignment_summary,
    "테마 가져오기 쿼리 수정과 테스트를 맡아 주세요.",
  );
  assert.equal(agent.assignment_match, "best_effort_singleton");
  let serialized = JSON.stringify(snapshot);
  for (const privateValue of [
    "must not persist",
    "private spawn response",
    "pending_spawn_assignments",
    '"tool_input"',
    '"tool_response"',
  ]) {
    assert(!serialized.includes(privateValue));
  }

  store.ingest(subagentPayload("SubagentStop", { turn_id: "agent-turn" }), {
    receivedAtMs: 120,
  });
  snapshot = store.getSnapshot();
  agent = snapshot.sessions[0].agents[0];
  assert.equal(agent.status, "stopped");
  assert.equal(
    agent.assignment_summary,
    "테마 가져오기 쿼리 수정과 테스트를 맡아 주세요.",
  );
  assert.equal(agent.assignment_match, "best_effort_singleton");
  serialized = JSON.stringify(snapshot);
  assert(!serialized.includes("pending_spawn_assignments"));
});

test("requires the spawn PostToolUse before assigning a subsequent agent", () => {
  const store = createTestStore();
  store.ingest(spawnToolPayload("PreToolUse"), { receivedAtMs: 100 });
  store.ingest(subagentPayload("SubagentStart", { turn_id: "agent-turn" }), {
    receivedAtMs: 105,
  });

  const agent = store.getSnapshot().sessions[0].agents[0];
  assert(!("assignment_summary" in agent));
  assert(!("assignment_match" in agent));
});

test("counts an incomplete spawn when deciding assignment ambiguity", () => {
  const store = createTestStore();
  store.ingest(
    spawnToolPayload("PreToolUse", {
      tool_use_id: "spawn-completed",
      tool_input: { task_name: "completed", message: "완료된 후보 작업" },
    }),
    { receivedAtMs: 100 },
  );
  store.ingest(
    spawnToolPayload("PostToolUse", {
      tool_use_id: "spawn-completed",
    }),
    { receivedAtMs: 105 },
  );
  store.ingest(
    spawnToolPayload("PreToolUse", {
      tool_use_id: "spawn-incomplete",
      tool_input: { task_name: "incomplete", message: "미완료 후보 작업" },
    }),
    { receivedAtMs: 106 },
  );
  store.ingest(
    subagentPayload("SubagentStart", {
      agent_id: "agent-for-incomplete-spawn",
      turn_id: "agent-turn",
    }),
    { receivedAtMs: 110 },
  );

  const agent = store.getSnapshot().sessions[0].agents[0];
  assert(!("assignment_summary" in agent));
  assert(!("assignment_match" in agent));
});

test("ignores an expired incomplete spawn when one fresh assignment is eligible", () => {
  const store = createTestStore();
  store.ingest(
    spawnToolPayload("PreToolUse", {
      tool_use_id: "spawn-expired-incomplete",
      tool_input: { task_name: "expired", message: "만료될 미완료 작업" },
    }),
    { receivedAtMs: 100 },
  );
  store.ingest(
    spawnToolPayload("PreToolUse", {
      tool_use_id: "spawn-fresh",
      tool_input: { task_name: "fresh", message: "새 할당 작업" },
    }),
    { receivedAtMs: 30_101 },
  );
  store.ingest(
    spawnToolPayload("PostToolUse", { tool_use_id: "spawn-fresh" }),
    { receivedAtMs: 30_105 },
  );
  store.ingest(
    subagentPayload("SubagentStart", { turn_id: "fresh-agent-turn" }),
    { receivedAtMs: 30_110 },
  );

  const agent = store.getSnapshot().sessions[0].agents[0];
  assert.equal(agent.assignment_summary, "새 할당 작업");
  assert.equal(agent.assignment_match, "best_effort_singleton");
});

test("does not guess assignment order for concurrent completed spawns", () => {
  const store = createTestStore();
  for (const [index, summary] of [
    [1, "테마 UI 수정"],
    [2, "테마 쿼리 수정"],
  ]) {
    const overrides = {
      tool_use_id: `spawn-${index}`,
      tool_input: { task_name: `worker_${index}`, message: summary },
    };
    store.ingest(spawnToolPayload("PreToolUse", overrides), {
      receivedAtMs: 100 + index,
    });
    store.ingest(spawnToolPayload("PostToolUse", overrides), {
      receivedAtMs: 105 + index,
    });
  }
  for (const index of [1, 2]) {
    store.ingest(
      subagentPayload("SubagentStart", {
        agent_id: `agent-${index}`,
        turn_id: `agent-turn-${index}`,
      }),
      { receivedAtMs: 110 + index },
    );
  }

  for (const agent of store.getSnapshot().sessions[0].agents) {
    assert(!("assignment_summary" in agent));
    assert(!("assignment_match" in agent));
  }
});

test("attaches an early singleton but fails closed for the remaining concurrent pair", () => {
  const store = createTestStore();
  store.ingest(
    spawnToolPayload("PreToolUse", {
      tool_use_id: "spawn-1",
      tool_input: { task_name: "worker_1", message: "첫 번째 작업" },
    }),
    { receivedAtMs: 100 },
  );
  store.ingest(
    spawnToolPayload("PostToolUse", { tool_use_id: "spawn-1" }),
    { receivedAtMs: 101 },
  );
  store.ingest(
    subagentPayload("SubagentStart", {
      agent_id: "agent-1",
      turn_id: "agent-turn-1",
    }),
    { receivedAtMs: 102 },
  );

  for (const [index, summary] of [
    [2, "두 번째 작업"],
    [3, "세 번째 작업"],
  ]) {
    const overrides = {
      tool_use_id: `spawn-${index}`,
      tool_input: { task_name: `worker_${index}`, message: summary },
    };
    store.ingest(spawnToolPayload("PreToolUse", overrides), {
      receivedAtMs: 100 + index * 2,
    });
    store.ingest(spawnToolPayload("PostToolUse", overrides), {
      receivedAtMs: 101 + index * 2,
    });
  }
  for (const index of [2, 3]) {
    store.ingest(
      subagentPayload("SubagentStart", {
        agent_id: `agent-${index}`,
        turn_id: `agent-turn-${index}`,
      }),
      { receivedAtMs: 110 + index },
    );
  }

  const agents = new Map(
    store
      .getSnapshot()
      .sessions[0].agents.map((agent) => [agent.agent_id, agent]),
  );
  assert.equal(agents.get("agent-1").assignment_summary, "첫 번째 작업");
  assert.equal(
    agents.get("agent-1").assignment_match,
    "best_effort_singleton",
  );
  for (const agentId of ["agent-2", "agent-3"]) {
    assert(!("assignment_summary" in agents.get(agentId)));
    assert(!("assignment_match" in agents.get(agentId)));
  }
});

test("counts a spawn with no safe summary when deciding concurrency ambiguity", () => {
  const store = createTestStore();
  const valid = {
    tool_use_id: "spawn-valid",
    tool_input: { task_name: "valid", message: "테마 UI 수정" },
  };
  const fullyPrivate = {
    tool_use_id: "spawn-private",
    tool_input: {
      task_name: "private",
      message: "person@example.com /Users/private/work token=private-value",
    },
  };
  for (const [index, overrides] of [valid, fullyPrivate].entries()) {
    store.ingest(spawnToolPayload("PreToolUse", overrides), {
      receivedAtMs: 100 + index,
    });
    store.ingest(spawnToolPayload("PostToolUse", overrides), {
      receivedAtMs: 105 + index,
    });
  }
  for (const index of [1, 2]) {
    store.ingest(
      subagentPayload("SubagentStart", {
        agent_id: `agent-${index}`,
        turn_id: `agent-turn-${index}`,
      }),
      { receivedAtMs: 110 + index },
    );
  }

  const snapshot = store.getSnapshot();
  for (const agent of snapshot.sessions[0].agents) {
    assert(!("assignment_summary" in agent));
    assert(!("assignment_match" in agent));
  }
  const serialized = JSON.stringify(snapshot);
  for (const privateValue of [
    "person@example.com",
    "/Users/private/work",
    "private-value",
    "pending_spawn_assignments",
  ]) {
    assert(!serialized.includes(privateValue));
  }
});

test("does not attach expired or start-before-Post spawn assignments", () => {
  const expiredStore = createTestStore();
  expiredStore.ingest(spawnToolPayload("PreToolUse"), { receivedAtMs: 100 });
  expiredStore.ingest(spawnToolPayload("PostToolUse"), { receivedAtMs: 105 });
  expiredStore.ingest(
    subagentPayload("SubagentStart", { turn_id: "late-agent-turn" }),
    { receivedAtMs: 15_106 },
  );
  let agent = expiredStore.getSnapshot().sessions[0].agents[0];
  assert(!("assignment_summary" in agent));

  const outOfOrderStore = createTestStore();
  outOfOrderStore.ingest(spawnToolPayload("PreToolUse"), {
    receivedAtMs: 200,
  });
  outOfOrderStore.ingest(
    subagentPayload("SubagentStart", { turn_id: "early-agent-turn" }),
    { receivedAtMs: 205 },
  );
  outOfOrderStore.ingest(spawnToolPayload("PostToolUse"), {
    receivedAtMs: 210,
  });
  agent = outOfOrderStore.getSnapshot().sessions[0].agents[0];
  assert(!("assignment_summary" in agent));
  assert(!("assignment_match" in agent));
});

test("clears pending spawn assignments at session end and resume", () => {
  const store = createTestStore();
  store.ingest(spawnToolPayload("PreToolUse"), { receivedAtMs: 100 });
  store.ingest(spawnToolPayload("PostToolUse"), { receivedAtMs: 105 });
  store.ingest(
    { session_id: "session-1", hook_event_name: "SessionEnd" },
    { receivedAtMs: 106 },
  );
  store.ingest(
    {
      session_id: "session-1",
      hook_event_name: "SessionStart",
      source: "resume",
    },
    { receivedAtMs: 107 },
  );
  store.ingest(subagentPayload("SubagentStart", { turn_id: "agent-turn" }), {
    receivedAtMs: 110,
  });

  const agent = store.getSnapshot().sessions[0].agents[0];
  assert(!("assignment_summary" in agent));
  assert(!("assignment_match" in agent));
});

test("fails closed on pending spawn overflow until a new root turn", () => {
  const boundedStore = createTestStore({ maxAgentsPerSession: 1 });
  for (const index of [1, 2]) {
    const overrides = {
      tool_use_id: `spawn-${index}`,
      tool_input: {
        task_name: `worker_${index}`,
        message: `작업 ${index}`,
      },
    };
    boundedStore.ingest(spawnToolPayload("PreToolUse", overrides), {
      receivedAtMs: 100 + index,
    });
    boundedStore.ingest(spawnToolPayload("PostToolUse", overrides), {
      receivedAtMs: 105 + index,
    });
  }
  boundedStore.ingest(
    subagentPayload("SubagentStart", {
      agent_id: "agent-overflow",
      turn_id: "agent-turn-overflow",
    }),
    { receivedAtMs: 110 },
  );
  let agent = boundedStore.getSnapshot().sessions[0].agents[0];
  assert(!("assignment_summary" in agent));
  assert(!("assignment_match" in agent));

  boundedStore.ingest(
    { ...subagentPayload("UserPromptSubmit"), turn_id: "root-recovered" },
    { receivedAtMs: 120 },
  );
  boundedStore.ingest(
    spawnToolPayload("PreToolUse", {
      turn_id: "root-recovered",
      tool_use_id: "spawn-recovered",
      tool_input: { task_name: "recovered", message: "복구 후 작업" },
    }),
    { receivedAtMs: 125 },
  );
  boundedStore.ingest(
    spawnToolPayload("PostToolUse", {
      turn_id: "root-recovered",
      tool_use_id: "spawn-recovered",
    }),
    { receivedAtMs: 130 },
  );
  boundedStore.ingest(
    subagentPayload("SubagentStart", {
      agent_id: "agent-recovered",
      turn_id: "agent-turn-recovered",
    }),
    { receivedAtMs: 135 },
  );
  agent = boundedStore.getSnapshot().sessions[0].agents[0];
  assert.equal(agent.agent_id, "agent-recovered");
  assert.equal(agent.assignment_summary, "복구 후 작업");
  assert.equal(agent.assignment_match, "best_effort_singleton");

  const newTurnStore = createTestStore();
  newTurnStore.ingest(
    { ...subagentPayload("UserPromptSubmit"), turn_id: "root-turn-1" },
    { receivedAtMs: 90 },
  );
  newTurnStore.ingest(
    spawnToolPayload("PreToolUse", { turn_id: "root-turn-1" }),
    { receivedAtMs: 100 },
  );
  newTurnStore.ingest(
    spawnToolPayload("PostToolUse", { turn_id: "root-turn-1" }),
    { receivedAtMs: 105 },
  );
  newTurnStore.ingest(
    { ...subagentPayload("UserPromptSubmit"), turn_id: "root-turn-2" },
    { receivedAtMs: 106 },
  );
  newTurnStore.ingest(
    subagentPayload("SubagentStart", { turn_id: "agent-turn" }),
    { receivedAtMs: 110 },
  );
  agent = newTurnStore.getSnapshot().sessions[0].agents[0];
  assert(!("assignment_summary" in agent));
  assert(!("assignment_match" in agent));
});

test("does not assign an out-of-order start observed after its stop", () => {
  const store = createTestStore();
  store.ingest(spawnToolPayload("PreToolUse"), { receivedAtMs: 100 });
  store.ingest(spawnToolPayload("PostToolUse"), { receivedAtMs: 105 });
  store.ingest(subagentPayload("SubagentStop", { turn_id: "agent-turn" }), {
    receivedAtMs: 108,
  });
  store.ingest(subagentPayload("SubagentStart", { turn_id: "agent-turn" }), {
    receivedAtMs: 110,
  });

  const agent = store.getSnapshot().sessions[0].agents[0];
  assert.equal(agent.has_out_of_order_events, true);
  assert(!("assignment_summary" in agent));
  assert(!("assignment_match" in agent));
});

test("hydrates current activity when the tool is observed before the agent", () => {
  const store = createTestStore();
  store.ingest(
    toolPayload("PostToolUse", {
      turn_id: "agent-turn",
      tool_name: "Bash",
      tool_use_id: "shell-1",
    }),
    { receivedAtMs: 90 },
  );
  store.ingest(
    subagentPayload("SubagentStart", { turn_id: "agent-turn" }),
    { receivedAtMs: 100 },
  );

  const agent = store.getSnapshot().sessions[0].agents[0];
  assert.equal(agent.current_tool_name, "Bash");
  assert.equal(agent.current_tool_status, "completed_without_start");
  assert.equal(agent.current_tool_observed_at_ms, 90);
  assert.equal(agent.last_seen_at_ms, 100);
});

test("does not attach tool activity when an agent turn is ambiguous", () => {
  const store = createTestStore();
  for (const agentId of ["agent-1", "agent-2"]) {
    store.ingest(
      subagentPayload("SubagentStart", {
        agent_id: agentId,
        turn_id: "shared-turn",
      }),
      { receivedAtMs: agentId === "agent-1" ? 100 : 101 },
    );
  }
  store.ingest(
    toolPayload("PreToolUse", {
      turn_id: "shared-turn",
      tool_use_id: "tool-shared",
    }),
    { receivedAtMs: 110 },
  );

  for (const agent of store.getSnapshot().sessions[0].agents) {
    assert(!("current_tool_name" in agent));
    assert(!("current_tool_status" in agent));
    assert(!("current_tool_observed_at_ms" in agent));
  }
});

test("keeps the newest tool event as the agent's current activity", () => {
  const store = createTestStore();
  store.ingest(
    subagentPayload("SubagentStart", { turn_id: "agent-turn" }),
    { receivedAtMs: 100 },
  );
  store.ingest(
    toolPayload("PreToolUse", {
      turn_id: "agent-turn",
      tool_name: "Bash",
      tool_use_id: "newer",
    }),
    { receivedAtMs: 130 },
  );
  store.ingest(
    toolPayload("PostToolUse", {
      turn_id: "agent-turn",
      tool_name: "apply_patch",
      tool_use_id: "older",
    }),
    { receivedAtMs: 120 },
  );

  const agent = store.getSnapshot().sessions[0].agents[0];
  assert.equal(agent.current_tool_name, "Bash");
  assert.equal(agent.current_tool_status, "running");
  assert.equal(agent.current_tool_observed_at_ms, 130);
});

test("keeps a running tool current when an earlier tool completes later", () => {
  const store = createTestStore();
  store.ingest(
    subagentPayload("SubagentStart", { turn_id: "agent-turn" }),
    { receivedAtMs: 90 },
  );
  store.ingest(
    toolPayload("PreToolUse", {
      turn_id: "agent-turn",
      tool_name: "Bash",
      tool_use_id: "earlier-tool",
    }),
    { receivedAtMs: 100 },
  );
  store.ingest(
    toolPayload("PreToolUse", {
      turn_id: "agent-turn",
      tool_name: "apply_patch",
      tool_use_id: "still-running-tool",
    }),
    { receivedAtMs: 110 },
  );
  store.ingest(
    toolPayload("PostToolUse", {
      turn_id: "agent-turn",
      tool_name: "Bash",
      tool_use_id: "earlier-tool",
    }),
    { receivedAtMs: 120 },
  );

  const session = store.getSnapshot().sessions[0];
  const agent = session.agents[0];
  assert.equal(agent.current_tool_name, "apply_patch");
  assert.equal(agent.current_tool_status, "running");
  assert.equal(agent.current_tool_observed_at_ms, 110);
  assert.equal(
    session.tools.find(({ tool_use_id }) => tool_use_id === "earlier-tool")
      .status,
    "completed",
  );
});

test("clears current activity when the same agent moves to a turn without tools", () => {
  const store = createTestStore();
  store.ingest(
    subagentPayload("SubagentStart", { turn_id: "first-turn" }),
    { receivedAtMs: 100 },
  );
  store.ingest(
    toolPayload("PreToolUse", {
      turn_id: "first-turn",
      tool_name: "Bash",
      tool_use_id: "shell-1",
    }),
    { receivedAtMs: 110 },
  );
  store.ingest(
    subagentPayload("SubagentStop", { turn_id: "second-turn" }),
    { receivedAtMs: 120 },
  );

  const agent = store.getSnapshot().sessions[0].agents[0];
  assert.equal(agent.turn_id, "second-turn");
  assert(!("current_tool_name" in agent));
  assert(!("current_tool_status" in agent));
  assert(!("current_tool_observed_at_ms" in agent));
  assert.equal(agent.last_seen_at_ms, 120);
});

test("settles a running tool when its one exact matching agent stops", () => {
  const store = createTestStore();
  store.ingest(
    subagentPayload("SubagentStart", { turn_id: "agent-turn" }),
    { receivedAtMs: 100 },
  );
  store.ingest(
    toolPayload("PreToolUse", {
      turn_id: "agent-turn",
      tool_use_id: "tool-1",
    }),
    { receivedAtMs: 110 },
  );
  store.ingest(
    subagentPayload("SubagentStop", { turn_id: "agent-turn" }),
    { receivedAtMs: 120 },
  );

  const session = store.getSnapshot().sessions[0];
  assert.equal(session.agents[0].status, "stopped");
  assert.equal(
    session.agents[0].current_tool_status,
    "completion_not_observed",
  );
  assert.equal(session.tools[0].status, "completion_not_observed");
  assert.equal(
    session.recent_activities.find(({ type }) => type === "tool_started")
      .status,
    "completion_not_observed",
  );
});

test("does not settle running tools for an ambiguous agent turn", () => {
  const store = createTestStore();
  for (const agentId of ["agent-1", "agent-2"]) {
    store.ingest(
      subagentPayload("SubagentStart", {
        agent_id: agentId,
        turn_id: "shared-turn",
      }),
      { receivedAtMs: agentId === "agent-1" ? 100 : 101 },
    );
  }
  store.ingest(
    toolPayload("PreToolUse", {
      turn_id: "shared-turn",
      tool_use_id: "tool-shared",
    }),
    { receivedAtMs: 110 },
  );
  store.ingest(
    subagentPayload("SubagentStop", {
      agent_id: "agent-1",
      turn_id: "shared-turn",
    }),
    { receivedAtMs: 120 },
  );

  const session = store.getSnapshot().sessions[0];
  assert.equal(session.tools[0].status, "running");
  for (const agent of session.agents) {
    assert(!("current_tool_status" in agent));
  }
});

test("omits current activity when latest tools share one observation timestamp", () => {
  const store = createTestStore();
  store.ingest(
    subagentPayload("SubagentStart", { turn_id: "agent-turn" }),
    { receivedAtMs: 100 },
  );
  for (const [toolUseId, toolName] of [
    ["tool-a", "Bash"],
    ["tool-z", "apply_patch"],
  ]) {
    store.ingest(
      toolPayload("PreToolUse", {
        turn_id: "agent-turn",
        tool_name: toolName,
        tool_use_id: toolUseId,
      }),
      { receivedAtMs: 110 },
    );
  }

  const agent = store.getSnapshot().sessions[0].agents[0];
  assert(!("current_tool_name" in agent));
  assert(!("current_tool_status" in agent));
  assert(!("current_tool_observed_at_ms" in agent));
  assert.equal(agent.last_seen_at_ms, 100);
});

test("omits current activity when terminal tools share one observation timestamp", () => {
  const store = createTestStore();
  store.ingest(
    subagentPayload("SubagentStart", { turn_id: "agent-turn" }),
    { receivedAtMs: 100 },
  );
  for (const [toolUseId, toolName] of [
    ["terminal-a", "Bash"],
    ["terminal-b", "apply_patch"],
  ]) {
    store.ingest(
      toolPayload("PostToolUse", {
        turn_id: "agent-turn",
        tool_name: toolName,
        tool_use_id: toolUseId,
      }),
      { receivedAtMs: 110 },
    );
  }

  const agent = store.getSnapshot().sessions[0].agents[0];
  assert(!("current_tool_name" in agent));
  assert(!("current_tool_status" in agent));
  assert(!("current_tool_observed_at_ms" in agent));
});

test("tracks parent session and turn lifecycle from hooks", () => {
  const store = createTestStore();
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
  assert.equal(session.status, "completed");
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
  const store = createTestStore();
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

test("keeps the first valid task summary across follow-ups and out-of-order prompts", () => {
  const store = createTestStore();
  const originalRawPrompt = [
    '<in-app-browser-context source="ambient-ui-state">',
    "This block is automatically supplied ambient UI state, not part of the user's request.",
    "# In app browser:",
    "- Current URL: https://private.example/customer/42",
    "</in-app-browser-context>",
    "",
    "## My request for Codex:",
    `검색 결과 필터를 고쳐 주세요 ${"private detail ".repeat(30)}`,
  ].join("\n");

  store.ingest(
    {
      session_id: "session-1",
      turn_id: "turn-original",
      hook_event_name: "UserPromptSubmit",
      prompt: originalRawPrompt,
    },
    { receivedAtMs: 100 },
  );
  store.ingest(
    {
      session_id: "session-1",
      turn_id: "turn-follow-up",
      hook_event_name: "UserPromptSubmit",
      prompt: "완료",
    },
    { receivedAtMs: 200 },
  );
  store.ingest(
    {
      session_id: "session-1",
      turn_id: "turn-private",
      hook_event_name: "UserPromptSubmit",
      prompt: "https://example.com/private",
    },
    { receivedAtMs: 300 },
  );

  const session = store.getSnapshot().sessions[0];
  assert.match(session.task_summary, /^검색 결과 필터를 고쳐 주세요/);
  assert(!session.task_summary.includes("완료"));
  const serialized = JSON.stringify(session);
  assert(!serialized.includes(originalRawPrompt));
  assert(!serialized.includes("example.com"));
  assert(!serialized.includes("prompt"));
});

test("fills an empty task summary only from the next non-stale valid prompt", () => {
  const store = createTestStore();

  store.ingest(
    {
      session_id: "session-1",
      turn_id: "turn-private",
      hook_event_name: "UserPromptSubmit",
      prompt: "https://example.com/private",
    },
    { receivedAtMs: 200 },
  );
  let session = store.getSnapshot().sessions[0];
  assert.equal(session.task_summary, null);

  store.ingest(
    {
      session_id: "session-1",
      turn_id: "turn-stale",
      hook_event_name: "UserPromptSubmit",
      prompt: "오래된 요청을 표시하지 마세요",
    },
    { receivedAtMs: 100 },
  );
  session = store.getSnapshot().sessions[0];
  assert.equal(session.task_summary, null);

  store.ingest(
    {
      session_id: "session-1",
      turn_id: "turn-valid",
      hook_event_name: "UserPromptSubmit",
      prompt: "주문 내역 화면의 빈 상태를 개선해 주세요",
    },
    { receivedAtMs: 300 },
  );
  store.ingest(
    {
      session_id: "session-1",
      turn_id: "turn-later",
      hook_event_name: "UserPromptSubmit",
      prompt: "다시 해봐",
    },
    { receivedAtMs: 400 },
  );
  session = store.getSnapshot().sessions[0];
  assert.equal(session.task_summary, "주문 내역 화면의 빈 상태를 개선해 주세요");
  assert(!JSON.stringify(session).includes("오래된 요청"));
});

test("treats repeated lifecycle and tool hooks as duplicates", () => {
  const store = createTestStore();
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
  const store = createTestStore();
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
  const store = createTestStore();
  store.ingest(subagentPayload("SubagentStop"), { receivedAtMs: 10 });
  store.ingest(toolPayload("PostToolUse"), { receivedAtMs: 20 });

  const session = store.getSnapshot().sessions[0];
  assert.equal(session.agents[0].status, "stopped_without_start");
  assert.equal(session.agents[0].started_at_ms, null);
  assert.equal(session.recent_activities[0].status, "completed_without_start");
});

test("ignores malformed and unknown events while retaining bounded diagnostics", () => {
  const store = createTestStore({ maxDiagnostics: 2 });
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
  const store = createTestStore({
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
  const store = createTestStore();
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

test("makes SessionEnd terminal and marks orphan work as interrupted", () => {
  const store = createTestStore();
  store.ingest(
    { session_id: "session-1", hook_event_name: "SessionStart" },
    { receivedAtMs: 10 },
  );
  store.ingest(subagentPayload("UserPromptSubmit"), { receivedAtMs: 20 });
  store.ingest(subagentPayload("SubagentStart"), { receivedAtMs: 30 });
  store.ingest(toolPayload("PreToolUse"), { receivedAtMs: 40 });
  store.ingest(
    {
      session_id: "session-1",
      turn_id: "turn-1",
      hook_event_name: "PermissionRequest",
      tool_name: "Bash",
    },
    { receivedAtMs: 50 },
  );
  store.ingest(
    { session_id: "session-1", hook_event_name: "SessionEnd" },
    { receivedAtMs: 60 },
  );

  let session = store.getSnapshot().sessions[0];
  assert.equal(session.status, "completed");
  assert.equal(session.root_turn.status, "completed");
  assert.equal(session.agents[0].status, "interrupted");
  assert.equal(session.tools[0].status, "interrupted");
  assert.equal(session.agents[0].current_tool_status, "interrupted");
  assert.deepEqual(session.permission, { status: "idle" });
  assert.equal(
    session.recent_activities.find(
      ({ type }) => type === "permission_requested",
    ).status,
    "interrupted",
  );
  assert.equal(
    session.recent_activities.find(({ type }) => type === "subagent_started")
      .status,
    "interrupted",
  );
  assert.equal(
    session.recent_activities.find(({ type }) => type === "tool_started")
      .status,
    "interrupted",
  );

  assert.equal(
    store.ingest(toolPayload("PostToolUse"), { receivedAtMs: 70 }).status,
    "applied",
  );
  assert.equal(
    store.ingest(subagentPayload("SubagentStop"), { receivedAtMs: 80 }).status,
    "applied",
  );
  session = store.getSnapshot().sessions[0];
  assert.equal(session.status, "completed");
  assert.equal(session.agents[0].status, "stopped");
  assert.equal(session.tools[0].status, "completed");
  assert.equal(session.agents[0].current_tool_status, "completed");
  assert.equal(
    session.recent_activities.find(({ type }) => type === "subagent_started")
      .status,
    "stopped",
  );
  assert.equal(
    session.recent_activities.find(({ type }) => type === "tool_started")
      .status,
    "completed",
  );
});

test("does not reopen a completed turn with late same-turn start events", () => {
  const store = createTestStore();
  store.ingest(subagentPayload("UserPromptSubmit"), { receivedAtMs: 10 });
  store.ingest(subagentPayload("SubagentStart"), { receivedAtMs: 20 });
  store.ingest(toolPayload("PreToolUse"), { receivedAtMs: 30 });
  store.ingest(subagentPayload("Stop"), { receivedAtMs: 40 });

  let session = store.getSnapshot().sessions[0];
  assert.equal(session.status, "completed");
  assert.equal(session.agents[0].status, "completion_not_observed");
  assert.equal(session.tools[0].status, "completion_not_observed");

  for (const payload of [
    subagentPayload("UserPromptSubmit"),
    {
      session_id: "session-1",
      turn_id: "turn-1",
      hook_event_name: "PermissionRequest",
      tool_name: "Bash",
    },
    toolPayload("PreToolUse", { tool_use_id: "late-tool" }),
    subagentPayload("SubagentStart", { agent_id: "late-agent" }),
  ]) {
    assert.equal(
      store.ingest(payload, { receivedAtMs: 50 }).status,
      "stale",
    );
  }

  session = store.getSnapshot().sessions[0];
  assert.equal(session.status, "completed");
  assert.equal(session.root_turn.status, "completed");
  assert.deepEqual(session.permission, { status: "idle" });
  assert(!session.recent_activities.some(({ status }) => status === "running"));
  assert(
    !session.recent_activities.some(
      ({ status }) => status === "waiting_for_user",
    ),
  );
  assert.equal(session.agents.length, 1);
  assert.equal(session.tools.length, 1);

  assert.equal(
    store.ingest(toolPayload("PostToolUse"), { receivedAtMs: 60 }).status,
    "applied",
  );
  assert.equal(
    store.ingest(subagentPayload("SubagentStop"), { receivedAtMs: 70 }).status,
    "applied",
  );
  session = store.getSnapshot().sessions[0];
  assert.equal(session.tools[0].status, "completed");
  assert.equal(session.agents[0].status, "stopped");
  assert.equal(
    session.recent_activities.find(({ type }) => type === "subagent_started")
      .status,
    "stopped",
  );
  assert.equal(
    session.recent_activities.find(({ type }) => type === "tool_started")
      .status,
    "completed",
  );
});

test("clears permission only for matching terminal events", () => {
  const store = createTestStore();
  const permission = {
    session_id: "session-1",
    turn_id: "turn-1",
    hook_event_name: "PermissionRequest",
    tool_name: "Bash",
  };
  store.ingest(permission, { receivedAtMs: 10 });

  store.ingest(
    toolPayload("PostToolUse", {
      tool_name: "apply_patch",
      tool_use_id: "tool-other-name",
    }),
    { receivedAtMs: 20 },
  );
  store.ingest(
    toolPayload("PostToolUse", {
      turn_id: "turn-2",
      tool_use_id: "tool-other-turn",
    }),
    { receivedAtMs: 30 },
  );
  assert.equal(
    store.getSnapshot().sessions[0].permission.status,
    "waiting_for_user",
  );

  store.ingest(toolPayload("PostToolUse"), { receivedAtMs: 40 });
  assert.deepEqual(store.getSnapshot().sessions[0].permission, {
    status: "idle",
  });
  assert.equal(
    store
      .getSnapshot()
      .sessions[0].recent_activities.find(
        ({ type }) => type === "permission_requested",
      ).status,
    "completed",
  );

  store.ingest(
    { ...permission, turn_id: "turn-2" },
    { receivedAtMs: 50 },
  );
  store.ingest(subagentPayload("Stop"), { receivedAtMs: 60 });
  assert.equal(
    store.getSnapshot().sessions[0].permission.status,
    "waiting_for_user",
  );
  store.ingest(
    { session_id: "session-1", hook_event_name: "SessionEnd" },
    { receivedAtMs: 70 },
  );
  assert.deepEqual(store.getSnapshot().sessions[0].permission, {
    status: "idle",
  });
});

test("resets transient state when a session starts a new observation epoch", () => {
  const store = createTestStore();
  store.ingest(
    { session_id: "session-1", hook_event_name: "SessionStart" },
    { receivedAtMs: 10 },
  );
  store.ingest(subagentPayload("UserPromptSubmit"), { receivedAtMs: 20 });
  store.ingest(subagentPayload("SubagentStart"), { receivedAtMs: 30 });
  store.ingest(toolPayload("PreToolUse"), { receivedAtMs: 40 });
  store.ingest(
    {
      session_id: "session-1",
      turn_id: "turn-1",
      hook_event_name: "PermissionRequest",
      tool_name: "Bash",
    },
    { receivedAtMs: 50 },
  );
  store.ingest(
    { session_id: "session-1", hook_event_name: "SessionEnd" },
    { receivedAtMs: 60 },
  );
  store.ingest(
    { session_id: "session-1", hook_event_name: "SessionStart" },
    { receivedAtMs: 70 },
  );

  const session = store.getSnapshot().sessions[0];
  assert.equal(session.status, "observed");
  assert.equal(session.root_turn.status, "idle");
  assert.deepEqual(session.permission, { status: "idle" });
  assert.deepEqual(session.agents, []);
  assert.deepEqual(session.tools, []);
});

test("resume and clear start a new epoch without requiring SessionEnd", () => {
  for (const source of ["resume", "clear"]) {
    const store = createTestStore();
    store.ingest(
      {
        session_id: "session-1",
        hook_event_name: "SessionStart",
        source: "startup",
      },
      { receivedAtMs: 10 },
    );
    store.ingest(subagentPayload("UserPromptSubmit"), { receivedAtMs: 20 });
    store.ingest(subagentPayload("SubagentStart"), { receivedAtMs: 30 });
    store.ingest(toolPayload("PreToolUse"), { receivedAtMs: 40 });
    store.ingest(
      {
        session_id: "session-1",
        turn_id: "turn-1",
        hook_event_name: "PermissionRequest",
        tool_name: "Bash",
      },
      { receivedAtMs: 50 },
    );

    assert.equal(
      store.ingest(
        {
          session_id: "session-1",
          hook_event_name: "SessionStart",
          source,
        },
        { receivedAtMs: 60 },
      ).status,
      "applied",
    );

    const session = store.getSnapshot().sessions[0];
    assert.equal(session.status, "observed");
    assert.equal(session.root_turn.status, "idle");
    assert.deepEqual(session.permission, { status: "idle" });
    assert.deepEqual(session.agents, []);
    assert.deepEqual(session.tools, []);
    assert.equal(
      session.recent_activities[0].session_start_source,
      source,
    );
    assert(
      !session.recent_activities.some(
        ({ status }) => status === "running" || status === "waiting_for_user",
      ),
    );
    assert(
      session.recent_activities.some(
        ({ status }) => status === "completion_not_observed",
      ),
    );
  }
});

test("compact SessionStart preserves an active turn and transient work", () => {
  const store = createTestStore();
  store.ingest(
    {
      session_id: "session-1",
      hook_event_name: "SessionStart",
      source: "startup",
    },
    { receivedAtMs: 10 },
  );
  store.ingest(subagentPayload("UserPromptSubmit"), { receivedAtMs: 20 });
  store.ingest(subagentPayload("SubagentStart"), { receivedAtMs: 30 });
  store.ingest(toolPayload("PreToolUse"), { receivedAtMs: 40 });
  store.ingest(
    {
      session_id: "session-1",
      turn_id: "turn-1",
      hook_event_name: "PermissionRequest",
      tool_name: "Bash",
    },
    { receivedAtMs: 50 },
  );

  assert.equal(
    store.ingest(
      {
        session_id: "session-1",
        hook_event_name: "SessionStart",
        source: "compact",
      },
      { receivedAtMs: 60 },
    ).status,
    "applied",
  );

  const session = store.getSnapshot().sessions[0];
  assert.equal(session.status, "waiting_for_user");
  assert.equal(session.root_turn.status, "running");
  assert.equal(session.agents[0].status, "running");
  assert.equal(session.tools[0].status, "running");
  assert.equal(session.permission.status, "waiting_for_user");
  assert.equal(session.recent_activities[0].session_start_source, "compact");
  assert(session.recent_activities.some(({ status }) => status === "running"));
  assert(
    session.recent_activities.some(
      ({ status }) => status === "waiting_for_user",
    ),
  );
});

test("unknown SessionStart sources do not reset active transient state", () => {
  const store = createTestStore();
  store.ingest(
    {
      session_id: "session-1",
      hook_event_name: "SessionStart",
      source: "startup",
    },
    { receivedAtMs: 10 },
  );
  store.ingest(subagentPayload("UserPromptSubmit"), { receivedAtMs: 20 });
  store.ingest(subagentPayload("SubagentStart"), { receivedAtMs: 30 });
  store.ingest(toolPayload("PreToolUse"), { receivedAtMs: 40 });

  assert.equal(
    store.ingest(
      {
        session_id: "session-1",
        hook_event_name: "SessionStart",
        source: "private-future-source",
      },
      { receivedAtMs: 50 },
    ).status,
    "duplicate",
  );

  const session = store.getSnapshot().sessions[0];
  assert.equal(session.status, "running");
  assert.equal(session.root_turn.status, "running");
  assert.equal(session.agents[0].status, "running");
  assert.equal(session.tools[0].status, "running");
  assert(!JSON.stringify(session).includes("private-future-source"));
});

test("downgrades old active state when terminal hooks were not observed", () => {
  let nowMs = 100;
  const store = createMonitorStore({
    now: () => nowMs,
    staleAfterMs: 50,
  });
  store.ingest(subagentPayload("UserPromptSubmit"), { receivedAtMs: 100 });
  store.ingest(subagentPayload("SubagentStart"), { receivedAtMs: 100 });
  store.ingest(toolPayload("PreToolUse"), { receivedAtMs: 100 });
  store.ingest(
    {
      session_id: "session-1",
      turn_id: "turn-1",
      hook_event_name: "PermissionRequest",
      tool_name: "Bash",
    },
    { receivedAtMs: 100 },
  );

  nowMs = 149;
  assert.equal(store.getSnapshot().sessions[0].status, "waiting_for_user");
  nowMs = 150;
  const stale = store.getSnapshot().sessions[0];
  assert.equal(stale.status, "completion_not_observed");
  assert.equal(stale.root_turn.status, "completion_not_observed");
  assert.equal(stale.permission.status, "completion_not_observed");
  assert.equal(stale.agents[0].status, "completion_not_observed");
  assert.equal(
    stale.agents[0].current_tool_status,
    "completion_not_observed",
  );
  assert.equal(stale.tools[0].status, "completion_not_observed");
  assert(!stale.recent_activities.some(({ status }) => status === "running"));
  assert(
    !stale.recent_activities.some(
      ({ status }) => status === "waiting_for_user",
    ),
  );
});
