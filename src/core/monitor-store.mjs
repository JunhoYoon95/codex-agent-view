import { normalizeHookPayload } from "./normalize-hook-payload.mjs";

const DEFAULT_LIMITS = Object.freeze({
  maxActivitiesPerSession: 100,
  maxAgentsPerSession: 100,
  maxDiagnostics: 100,
  maxSessions: 50,
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

function deriveSessionStatus(session) {
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
  if (session.lifecycle.end_observed) {
    return "completed";
  }
  return "observed";
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

  for (const field of ["turn_id", "agent_id", "agent_type", "tool_name", "tool_use_id"]) {
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
    lifecycle.start_observed = true;
    lifecycle.started_at_ms ??= event.received_at_ms;
    lifecycle.end_observed = false;
    lifecycle.ended_at_ms = null;
    lifecycle.has_out_of_order_events ||= resumedAfterEnd;
    addActivity(session, event, "observed", limits.maxActivitiesPerSession);
    return "applied";
  }

  if (lifecycle.end_observed) {
    return "duplicate";
  }
  lifecycle.end_observed = true;
  lifecycle.ended_at_ms = event.received_at_ms;
  lifecycle.has_out_of_order_events = !lifecycle.start_observed;
  session.root_turn.status = "completed";
  session.root_turn.stopped_at_ms ??= event.received_at_ms;
  session.permission = { status: "idle" };
  addActivity(session, event, "completed", limits.maxActivitiesPerSession);
  return "applied";
}

function applyTurnEvent(session, event, limits) {
  const turn = session.root_turn;
  if (event.type === "turn_started") {
    if (turn.turn_id === event.turn_id && turn.status === "running") {
      return "duplicate";
    }
    session.root_turn = {
      status: "running",
      turn_id: event.turn_id,
      started_at_ms: event.received_at_ms,
      stopped_at_ms: null,
      has_out_of_order_events: false,
    };
    session.permission = { status: "idle" };
    addActivity(session, event, "running", limits.maxActivitiesPerSession);
    return "applied";
  }

  if (turn.turn_id === event.turn_id && turn.status === "completed") {
    return "duplicate";
  }
  const startObserved = turn.turn_id === event.turn_id && turn.started_at_ms !== null;
  session.root_turn = {
    status: "completed",
    turn_id: event.turn_id,
    started_at_ms: startObserved ? turn.started_at_ms : null,
    stopped_at_ms: event.received_at_ms,
    has_out_of_order_events: !startObserved,
  };
  session.permission = { status: "idle" };
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
      session.permission = { status: "idle" };
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
  if (event.type === "session_started" || event.type === "session_ended") {
    return applySessionEvent(session, event, limits);
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

function snapshotSession(session) {
  return {
    session_id: session.session_id,
    status: deriveSessionStatus(session),
    first_seen_at_ms: session.first_seen_at_ms,
    last_seen_at_ms: session.last_seen_at_ms,
    agents: [...session.agents.values()]
      .map(({ start_observed, stop_observed, ...agent }) => ({ ...agent }))
      .sort((left, right) => right.last_seen_at_ms - left.last_seen_at_ms),
    root_turn: { ...session.root_turn },
    recent_activities: session.recent_activities.map((activity) => ({
      ...activity,
    })),
    permission: { ...session.permission },
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
    return {
      schema_version: 1,
      source_of_truth: "hook",
      updated_at_ms: updatedAtMs,
      sessions: [...sessions.values()]
        .map(snapshotSession)
        .sort((left, right) => right.last_seen_at_ms - left.last_seen_at_ms),
      diagnostics: diagnostics.map((diagnostic) => ({ ...diagnostic })),
    };
  }

  return Object.freeze({ ingest, getSnapshot });
}
