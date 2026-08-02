import { normalizeHookPayload } from "./normalize-hook-payload.mjs";

const DEFAULT_LIMITS = Object.freeze({
  maxActivitiesPerSession: 100,
  maxAgentsPerSession: 100,
  maxDiagnostics: 100,
  maxSessions: 50,
  staleAfterMs: 5 * 60 * 1000,
});

function positiveInteger(value, name) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${name} must be a positive safe integer`);
  }
  return value;
}

function createSession(event) {
  return {
    session_id: event.session_id,
    workspace_label: null,
    workspace_label_observed_at_ms: null,
    task_summary: null,
    task_summary_observed_at_ms: null,
    first_seen_at_ms: event.received_at_ms,
    last_seen_at_ms: event.received_at_ms,
    agents: new Map(),
    tools: new Map(),
    lifecycle: {
      start_observed: false,
      end_observed: false,
      started_at_ms: null,
      ended_at_ms: null,
      has_out_of_order_events: false,
    },
    root_turn: {
      status: "idle",
      turn_id: null,
      started_at_ms: null,
      stopped_at_ms: null,
      has_out_of_order_events: false,
    },
    permission: { status: "idle" },
    recent_activities: [],
  };
}

function applyTaskSummary(session, event) {
  if (event.type !== "turn_started") {
    return;
  }
  if (
    session.task_summary_observed_at_ms !== null &&
    event.received_at_ms < session.task_summary_observed_at_ms
  ) {
    return;
  }
  session.task_summary_observed_at_ms = event.received_at_ms;
  if (session.task_summary === null && "task_summary" in event) {
    session.task_summary = event.task_summary;
  }
}

function applyWorkspaceLabel(session, event) {
  if (!("workspace_label" in event)) {
    return;
  }
  if (
    session.workspace_label_observed_at_ms !== null &&
    event.received_at_ms < session.workspace_label_observed_at_ms
  ) {
    return;
  }
  session.workspace_label = event.workspace_label;
  session.workspace_label_observed_at_ms = event.received_at_ms;
}

function hasActiveState(session) {
  return (
    session.permission.status === "waiting_for_user" ||
    session.root_turn.status === "running" ||
    [...session.agents.values()].some(({ status }) => status === "running") ||
    [...session.tools.values()].some(({ status }) => status === "running")
  );
}

function isStaleActiveSession(session, nowMs, staleAfterMs) {
  return (
    !session.lifecycle.end_observed &&
    hasActiveState(session) &&
    nowMs - session.last_seen_at_ms >= staleAfterMs
  );
}

function deriveSessionStatus(session, nowMs, staleAfterMs) {
  if (session.lifecycle.end_observed) {
    return "completed";
  }
  if (isStaleActiveSession(session, nowMs, staleAfterMs)) {
    return "completion_not_observed";
  }
  if (session.permission.status === "waiting_for_user") {
    return "waiting_for_user";
  }
  if (
    session.root_turn.status === "running" ||
    [...session.agents.values()].some(({ status }) => status === "running") ||
    [...session.tools.values()].some(({ status }) => status === "running")
  ) {
    return "running";
  }
  if (session.root_turn.status === "completed") {
    return "completed";
  }
  return "observed";
}

function settleRunningState(session, status, options = {}) {
  const turnId = options.turnId;
  const settledAgentIds = new Set();
  const settledToolUseIds = new Set();
  for (const agent of session.agents.values()) {
    if (
      agent.status === "running" &&
      (turnId === undefined || agent.turn_id === turnId)
    ) {
      agent.status = status;
      settledAgentIds.add(agent.agent_id);
    }
  }
  for (const tool of session.tools.values()) {
    if (
      tool.status === "running" &&
      (turnId === undefined || tool.turn_id === turnId)
    ) {
      tool.status = status;
      settledToolUseIds.add(tool.tool_use_id);
    }
  }
  for (const activity of session.recent_activities) {
    if (
      activity.status === "running" &&
      ((activity.type === "subagent_started" &&
        settledAgentIds.has(activity.agent_id)) ||
        (activity.type === "tool_started" &&
          settledToolUseIds.has(activity.tool_use_id)))
    ) {
      activity.status = status;
    }
  }
}

function clearPermission(session, activityStatus) {
  const permission = session.permission;
  if (permission.status !== "waiting_for_user") {
    return;
  }
  for (const activity of session.recent_activities) {
    if (
      activity.type === "permission_requested" &&
      activity.status === "waiting_for_user" &&
      activity.turn_id === permission.turn_id &&
      activity.tool_name === permission.tool_name
    ) {
      activity.status = activityStatus;
      break;
    }
  }
  session.permission = { status: "idle" };
}

function settleRootTurnActivity(session, status) {
  for (const activity of session.recent_activities) {
    if (
      activity.type === "turn_started" &&
      activity.status === "running" &&
      activity.turn_id === session.root_turn.turn_id
    ) {
      activity.status = status;
      break;
    }
  }
}

function resetTransientState(session) {
  session.agents.clear();
  session.tools.clear();
  session.root_turn = {
    status: "idle",
    turn_id: null,
    started_at_ms: null,
    stopped_at_ms: null,
    has_out_of_order_events: false,
  };
  session.permission = { status: "idle" };
}

function touchMapEntry(map, key, value) {
  map.delete(key);
  map.set(key, value);
}

function trimMap(map, limit) {
  while (map.size > limit) {
    map.delete(map.keys().next().value);
  }
}

function addActivity(session, event, status, limit) {
  const activity = {
    type: event.type,
    status,
    received_at_ms: event.received_at_ms,
  };

  for (const field of [
    "turn_id",
    "agent_id",
    "agent_type",
    "tool_name",
    "tool_use_id",
    "session_start_source",
  ]) {
    if (field in event) {
      activity[field] = event[field];
    }
  }

  session.recent_activities.unshift(activity);
  if (session.recent_activities.length > limit) {
    session.recent_activities.length = limit;
  }
}

function applySessionEvent(session, event, limits) {
  const lifecycle = session.lifecycle;
  if (event.type === "session_started") {
    const resumedAfterEnd = lifecycle.end_observed;
    const startsNewEpoch =
      resumedAfterEnd ||
      event.session_start_source === "resume" ||
      event.session_start_source === "clear";
    if (event.session_start_source === "compact") {
      if (resumedAfterEnd) {
        return "stale";
      }
      lifecycle.start_observed = true;
      lifecycle.started_at_ms ??= event.received_at_ms;
      addActivity(session, event, "observed", limits.maxActivitiesPerSession);
      return "applied";
    }
    if (lifecycle.start_observed && !startsNewEpoch) {
      return "duplicate";
    }
    if (startsNewEpoch) {
      if (!resumedAfterEnd) {
        settleRootTurnActivity(session, "completion_not_observed");
        clearPermission(session, "completion_not_observed");
        settleRunningState(session, "completion_not_observed");
      }
      resetTransientState(session);
    }
    lifecycle.start_observed = true;
    lifecycle.started_at_ms = event.received_at_ms;
    lifecycle.end_observed = false;
    lifecycle.ended_at_ms = null;
    lifecycle.has_out_of_order_events = false;
    addActivity(session, event, "observed", limits.maxActivitiesPerSession);
    return "applied";
  }

  if (lifecycle.end_observed) {
    return "duplicate";
  }
  lifecycle.end_observed = true;
  lifecycle.ended_at_ms = event.received_at_ms;
  lifecycle.has_out_of_order_events = !lifecycle.start_observed;
  settleRootTurnActivity(session, "completed");
  session.root_turn.status = "completed";
  session.root_turn.stopped_at_ms ??= event.received_at_ms;
  clearPermission(session, "interrupted");
  settleRunningState(session, "interrupted");
  addActivity(session, event, "completed", limits.maxActivitiesPerSession);
  return "applied";
}

function applyTurnEvent(session, event, limits) {
  const turn = session.root_turn;
  if (event.type === "turn_started") {
    if (turn.turn_id === event.turn_id) {
      return turn.status === "running" ? "duplicate" : "stale";
    }
    settleRunningState(session, "completion_not_observed");
    session.root_turn = {
      status: "running",
      turn_id: event.turn_id,
      started_at_ms: event.received_at_ms,
      stopped_at_ms: null,
      has_out_of_order_events: false,
    };
    if (
      session.permission.status !== "waiting_for_user" ||
      session.permission.turn_id !== event.turn_id
    ) {
      clearPermission(session, "completion_not_observed");
    }
    addActivity(session, event, "running", limits.maxActivitiesPerSession);
    return "applied";
  }

  if (turn.turn_id === event.turn_id && turn.status === "completed") {
    return "duplicate";
  }
  const startObserved = turn.turn_id === event.turn_id && turn.started_at_ms !== null;
  if (startObserved) {
    settleRootTurnActivity(session, "completed");
  }
  session.root_turn = {
    status: "completed",
    turn_id: event.turn_id,
    started_at_ms: startObserved ? turn.started_at_ms : null,
    stopped_at_ms: event.received_at_ms,
    has_out_of_order_events: !startObserved,
  };
  if (
    session.permission.status === "waiting_for_user" &&
    session.permission.turn_id === event.turn_id
  ) {
    clearPermission(session, "completion_not_observed");
  }
  settleRunningState(session, "completion_not_observed", {
    turnId: event.turn_id,
  });
  addActivity(
    session,
    event,
    startObserved ? "completed" : "completed_without_start",
    limits.maxActivitiesPerSession,
  );
  return "applied";
}

function applySubagentEvent(session, event, limits) {
  let agent = session.agents.get(event.agent_id);
  if (!agent) {
    agent = {
      agent_id: event.agent_id,
      agent_type: event.agent_type,
      turn_id: event.turn_id,
      status: "unknown",
      started_at_ms: null,
      stopped_at_ms: null,
      last_seen_at_ms: event.received_at_ms,
      has_out_of_order_events: false,
      start_observed: false,
      stop_observed: false,
    };
  }

  if (event.type === "subagent_started") {
    if (agent.start_observed) {
      return "duplicate";
    }
    agent.start_observed = true;
    agent.started_at_ms = event.received_at_ms;
    if (agent.stop_observed) {
      agent.status = "stopped";
      agent.has_out_of_order_events = true;
    } else {
      agent.status = "running";
    }
  } else {
    if (agent.stop_observed) {
      return "duplicate";
    }
    agent.stop_observed = true;
    agent.stopped_at_ms = event.received_at_ms;
    agent.status = agent.start_observed ? "stopped" : "stopped_without_start";
    agent.has_out_of_order_events = !agent.start_observed;
  }

  agent.agent_type = event.agent_type;
  agent.turn_id = event.turn_id;
  agent.last_seen_at_ms = Math.max(agent.last_seen_at_ms, event.received_at_ms);
  touchMapEntry(session.agents, event.agent_id, agent);
  trimMap(session.agents, limits.maxAgentsPerSession);
  addActivity(session, event, agent.status, limits.maxActivitiesPerSession);
  return "applied";
}

function createTool(event) {
  return {
    tool_use_id: event.tool_use_id,
    tool_name: event.tool_name,
    turn_id: event.turn_id,
    status: "unknown",
    started_at_ms: null,
    completed_at_ms: null,
    last_seen_at_ms: event.received_at_ms,
    start_observed: false,
    completion_observed: false,
    has_out_of_order_events: false,
  };
}

function applyToolEvent(session, event, limits) {
  const tool = session.tools.get(event.tool_use_id) ?? createTool(event);
  let activityStatus;

  if (event.type === "tool_started") {
    if (tool.start_observed) {
      return "duplicate";
    }
    tool.start_observed = true;
    tool.started_at_ms = event.received_at_ms;
    if (tool.completion_observed) {
      tool.status = "completed";
      tool.has_out_of_order_events = true;
      activityStatus = "late_start_observed";
    } else {
      tool.status = "running";
      activityStatus = "running";
    }
  } else {
    if (tool.completion_observed) {
      return "duplicate";
    }
    tool.completion_observed = true;
    tool.completed_at_ms = event.received_at_ms;
    tool.status = tool.start_observed ? "completed" : "completed_without_start";
    tool.has_out_of_order_events = !tool.start_observed;
    activityStatus = tool.status;

    const permission = session.permission;
    if (
      permission.status === "waiting_for_user" &&
      permission.tool_name === event.tool_name &&
      permission.turn_id === event.turn_id &&
      event.received_at_ms >= permission.requested_at_ms
    ) {
      clearPermission(session, "completed");
    }
  }

  tool.tool_name = event.tool_name;
  tool.turn_id = event.turn_id;
  tool.last_seen_at_ms = Math.max(tool.last_seen_at_ms, event.received_at_ms);
  touchMapEntry(session.tools, event.tool_use_id, tool);
  trimMap(session.tools, limits.maxActivitiesPerSession);
  addActivity(session, event, activityStatus, limits.maxActivitiesPerSession);
  return "applied";
}

function applyPermissionEvent(session, event, limits) {
  const permission = session.permission;
  if (
    permission.status === "waiting_for_user" &&
    permission.tool_name === event.tool_name &&
    permission.turn_id === event.turn_id
  ) {
    return "duplicate";
  }

  if (
    permission.status === "waiting_for_user" &&
    event.received_at_ms < permission.requested_at_ms
  ) {
    return "stale";
  }

  session.permission = {
    status: "waiting_for_user",
    tool_name: event.tool_name,
    turn_id: event.turn_id,
    requested_at_ms: event.received_at_ms,
  };
  addActivity(
    session,
    event,
    "waiting_for_user",
    limits.maxActivitiesPerSession,
  );
  return "applied";
}

function applyEvent(session, event, limits) {
  if (event.type === "session_started") {
    return applySessionEvent(session, event, limits);
  }
  if (
    session.lifecycle.end_observed &&
    event.type !== "tool_completed" &&
    event.type !== "subagent_stopped"
  ) {
    return event.type === "session_ended" ? "duplicate" : "stale";
  }
  if (event.type === "session_ended") {
    return applySessionEvent(session, event, limits);
  }
  if (
    session.root_turn.status === "completed" &&
    session.root_turn.turn_id === event.turn_id &&
    (event.type === "turn_started" ||
      event.type === "permission_requested" ||
      event.type === "tool_started" ||
      event.type === "subagent_started")
  ) {
    return "stale";
  }
  if (event.type === "turn_started" || event.type === "turn_stopped") {
    return applyTurnEvent(session, event, limits);
  }
  if (event.type === "subagent_started" || event.type === "subagent_stopped") {
    return applySubagentEvent(session, event, limits);
  }
  if (event.type === "tool_started" || event.type === "tool_completed") {
    return applyToolEvent(session, event, limits);
  }
  return applyPermissionEvent(session, event, limits);
}

function snapshotSession(session, nowMs, staleAfterMs) {
  const staleActive = isStaleActiveSession(session, nowMs, staleAfterMs);
  return {
    session_id: session.session_id,
    workspace_label: session.workspace_label,
    task_summary: session.task_summary,
    status: deriveSessionStatus(session, nowMs, staleAfterMs),
    first_seen_at_ms: session.first_seen_at_ms,
    last_seen_at_ms: session.last_seen_at_ms,
    agents: [...session.agents.values()]
      .map(({ start_observed, stop_observed, ...agent }) => ({
        ...agent,
        ...(staleActive && agent.status === "running"
          ? { status: "completion_not_observed" }
          : {}),
      }))
      .sort((left, right) => right.last_seen_at_ms - left.last_seen_at_ms),
    tools: [...session.tools.values()]
      .map(({ start_observed, completion_observed, ...tool }) => ({
        ...tool,
        ...(staleActive && tool.status === "running"
          ? { status: "completion_not_observed" }
          : {}),
      }))
      .sort((left, right) => right.last_seen_at_ms - left.last_seen_at_ms),
    root_turn: {
      ...session.root_turn,
      ...(staleActive && session.root_turn.status === "running"
        ? { status: "completion_not_observed" }
        : {}),
    },
    recent_activities: session.recent_activities.map((activity) => ({
      ...activity,
      ...(staleActive &&
      (activity.status === "running" ||
        activity.status === "waiting_for_user")
        ? { status: "completion_not_observed" }
        : {}),
    })),
    permission: {
      ...session.permission,
      ...(staleActive && session.permission.status === "waiting_for_user"
        ? { status: "completion_not_observed" }
        : {}),
    },
  };
}

/** Create a bounded, process-local monitor store whose only input is hook data. */
export function createMonitorStore(options = {}) {
  const limits = {
    maxActivitiesPerSession: positiveInteger(
      options.maxActivitiesPerSession ?? DEFAULT_LIMITS.maxActivitiesPerSession,
      "maxActivitiesPerSession",
    ),
    maxAgentsPerSession: positiveInteger(
      options.maxAgentsPerSession ?? DEFAULT_LIMITS.maxAgentsPerSession,
      "maxAgentsPerSession",
    ),
    maxDiagnostics: positiveInteger(
      options.maxDiagnostics ?? DEFAULT_LIMITS.maxDiagnostics,
      "maxDiagnostics",
    ),
    maxSessions: positiveInteger(
      options.maxSessions ?? DEFAULT_LIMITS.maxSessions,
      "maxSessions",
    ),
    staleAfterMs: positiveInteger(
      options.staleAfterMs ?? DEFAULT_LIMITS.staleAfterMs,
      "staleAfterMs",
    ),
  };
  const now = options.now ?? Date.now;
  if (typeof now !== "function") {
    throw new TypeError("now must be a function");
  }

  const sessions = new Map();
  const diagnostics = [];
  let updatedAtMs = 0;

  function addDiagnostic(diagnostic) {
    diagnostics.unshift({ ...diagnostic });
    if (diagnostics.length > limits.maxDiagnostics) {
      diagnostics.length = limits.maxDiagnostics;
    }
    updatedAtMs = Math.max(updatedAtMs, diagnostic.diagnosed_at_ms);
  }

  function ingest(payload, ingestOptions = {}) {
    const receivedAtMs = ingestOptions.receivedAtMs ?? now();
    const normalized = normalizeHookPayload(payload, { receivedAtMs });
    if (normalized.status === "ignored") {
      addDiagnostic(normalized.diagnostic);
      return normalized;
    }

    const { event } = normalized;
    let session = sessions.get(event.session_id);
    if (!session) {
      session = createSession(event);
    }

    const status = applyEvent(session, event, limits);
    if (status === "duplicate") {
      return { status, event };
    }
    if (status === "stale") {
      const diagnostic = {
        code: "stale_event_ignored",
        diagnosed_at_ms: event.received_at_ms,
        field: "received_at_ms",
      };
      addDiagnostic(diagnostic);
      return { status, event, diagnostic };
    }

    applyWorkspaceLabel(session, event);
    applyTaskSummary(session, event);

    session.first_seen_at_ms = Math.min(
      session.first_seen_at_ms,
      event.received_at_ms,
    );
    session.last_seen_at_ms = Math.max(
      session.last_seen_at_ms,
      event.received_at_ms,
    );
    touchMapEntry(sessions, session.session_id, session);
    trimMap(sessions, limits.maxSessions);
    updatedAtMs = Math.max(updatedAtMs, event.received_at_ms);
    return { status: "applied", event };
  }

  function getSnapshot() {
    const snapshotAtMs = now();
    return {
      schema_version: 1,
      source_of_truth: "hook",
      updated_at_ms: updatedAtMs,
      sessions: [...sessions.values()]
        .map((session) =>
          snapshotSession(session, snapshotAtMs, limits.staleAfterMs),
        )
        .sort((left, right) => right.last_seen_at_ms - left.last_seen_at_ms),
      diagnostics: diagnostics.map((diagnostic) => ({ ...diagnostic })),
    };
  }

  return Object.freeze({ ingest, getSnapshot });
}
