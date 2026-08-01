const API_STATE_URL = "/api/state";
const POLL_INTERVAL_MS = 2_000;
const SESSION_TOKEN_KEY = "codex-agent-view-access-token";
const KNOWN_STATUSES = new Set(["running", "waiting", "completed", "unknown"]);

const STATUS_LABELS = Object.freeze({
  running: "실행 중",
  waiting: "대기",
  completed: "완료",
  unknown: "알 수 없음",
});

const STATUS_ORDER = Object.freeze({
  running: 0,
  waiting: 1,
  unknown: 2,
  completed: 3,
});

const ACTIVITY_LABELS = Object.freeze({
  session_started: "관찰 시작",
  session_ended: "관찰 종료",
  turn_started: "부모 작업 시작",
  turn_stopped: "부모 작업 응답 완료",
  subagent_started: "작업 에이전트 시작",
  subagent_stopped: "작업 에이전트 완료",
  tool_started: "도구 작업",
  tool_completed: "도구 작업",
  permission_requested: "사용자 승인 요청",
});

const TOOL_LABELS = Object.freeze({
  apply_patch: "파일 수정",
  bash: "터미널 작업",
  collaborationfollowup_task: "에이전트 후속 작업 요청",
  collaborationinterrupt_agent: "에이전트 작업 중단 요청",
  collaborationlist_agents: "에이전트 상태 확인",
  collaborationsend_message: "에이전트에게 메시지 전달",
  collaborationspawn_agent: "작업 에이전트 시작",
  collaborationwait_agent: "에이전트 응답 대기",
  exec_command: "터미널 작업",
  request_user_input: "사용자 입력 요청",
  wait: "작업 완료 대기",
  write_stdin: "터미널 입력",
});

const AGENT_ROLE_LABELS = Object.freeze({
  explorer: "조사 담당",
  reviewer: "검토 담당",
  worker: "작업 담당",
});

const HIDDEN_AGENT_ROLES = new Set(["", "default", "unknown"]);
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/g;

function consumeAccessToken() {
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  const fragmentToken = fragment.get("token")?.trim() || "";

  if (window.location.hash) {
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
  }

  let token = fragmentToken;
  try {
    if (fragmentToken) {
      window.sessionStorage.setItem(SESSION_TOKEN_KEY, fragmentToken);
    } else {
      token = window.sessionStorage.getItem(SESSION_TOKEN_KEY)?.trim() || "";
    }
  } catch {
    // Storage can be unavailable in hardened browser contexts. The fragment
    // token remains usable for this page load and is never copied elsewhere.
  }

  return token;
}

const accessToken = consumeAccessToken();

const elements = Object.freeze({
  connectionStatus: document.querySelector("#connection-status"),
  connectionLabel: document.querySelector("#connection-label"),
  lastUpdated: document.querySelector("#last-updated"),
  metricSessions: document.querySelector("#metric-sessions"),
  metricRunning: document.querySelector("#metric-running"),
  metricWaiting: document.querySelector("#metric-waiting"),
  metricCompleted: document.querySelector("#metric-completed"),
  search: document.querySelector("#session-search"),
  statusFilter: document.querySelector("#status-filter"),
  toolbar: document.querySelector(".toolbar"),
  resultsSummary: document.querySelector("#results-summary"),
  stateMessage: document.querySelector("#state-message"),
  sessionList: document.querySelector("#session-list"),
});

const viewState = {
  updatedAtMs: null,
  sessions: [],
  diagnostics: [],
  hasLoaded: false,
  errorMessage: "",
  canRetry: true,
  authenticationFailed: false,
  requestInFlight: false,
};

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function safeString(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function sanitizedFallbackLabel(value, fallback) {
  const normalized = safeString(value, "")
    .replace(CONTROL_CHARACTERS, " ")
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/[_./:-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 48);

  if (!normalized) {
    return fallback;
  }

  return normalized.replace(/\b[a-z]/g, (character) => character.toUpperCase());
}

function normalizedLookupKey(value) {
  return safeString(value, "").replace(/[^a-zA-Z0-9_]/g, "").toLocaleLowerCase();
}

function formatAgentRole(agentType) {
  const key = normalizedLookupKey(agentType);
  if (HIDDEN_AGENT_ROLES.has(key)) {
    return "";
  }
  return AGENT_ROLE_LABELS[key] || sanitizedFallbackLabel(agentType, "");
}

function formatToolLabel(toolName) {
  const key = normalizedLookupKey(toolName);
  return TOOL_LABELS[key] || `도구 · ${sanitizedFallbackLabel(toolName, "이름 미상")}`;
}

function formatActivityLabel(activity) {
  if (activity.eventName === "subagent_started" && activity.agentOrdinal !== null) {
    return `작업 에이전트 ${activity.agentOrdinal} 시작`;
  }
  if (activity.eventName === "subagent_stopped" && activity.agentOrdinal !== null) {
    return `작업 에이전트 ${activity.agentOrdinal} 완료`;
  }
  if (activity.eventName === "permission_requested" && activity.toolName) {
    return `${formatToolLabel(activity.toolName)} 승인 요청`;
  }
  if (
    (activity.eventName === "tool_started" || activity.eventName === "tool_completed") &&
    activity.toolName
  ) {
    return formatToolLabel(activity.toolName);
  }
  return ACTIVITY_LABELS[activity.eventName] ||
    `활동 · ${sanitizedFallbackLabel(activity.eventName, "알 수 없음")}`;
}

function safeTimestamp(value) {
  return Number.isFinite(value) && value >= 0 && value <= 8_640_000_000_000_000
    ? value
    : null;
}

function normalizeStatus(value) {
  return typeof value === "string" && KNOWN_STATUSES.has(value) ? value : "unknown";
}

function normalizeCoreStatus(value) {
  if (value === "running") {
    return "running";
  }
  if (value === "waiting" || value === "waiting_for_user") {
    return "waiting";
  }
  if (
    value === "completed" ||
    value === "stopped" ||
    value === "stopped_without_start" ||
    value === "completed_without_start" ||
    value === "late_start_observed"
  ) {
    return "completed";
  }
  return normalizeStatus(value);
}

function normalizeAgent(value, index) {
  const agent = isRecord(value) ? value : {};
  return {
    agentId: safeString(agent.agent_id, `unknown-agent-${index + 1}`),
    agentType: safeString(agent.agent_type, "unknown"),
    status: normalizeCoreStatus(agent.status),
    startedAtMs: safeTimestamp(agent.started_at_ms),
    stoppedAtMs: safeTimestamp(agent.stopped_at_ms),
    lastActivityAtMs: safeTimestamp(agent.last_seen_at_ms),
  };
}

function agentOrderTimestamp(agent) {
  return agent.startedAtMs ?? agent.stoppedAtMs ?? agent.lastActivityAtMs ?? Number.MAX_SAFE_INTEGER;
}

function assignStableAgentOrdinals(agents) {
  const ordinalByAgentId = new Map(
    [...agents]
      .sort((left, right) => (
        agentOrderTimestamp(left) - agentOrderTimestamp(right) ||
        left.agentId.localeCompare(right.agentId)
      ))
      .map((agent, index) => [agent.agentId, index + 1]),
  );

  return agents.map((agent) => ({
    ...agent,
    ordinal: ordinalByAgentId.get(agent.agentId),
  }));
}

function normalizeActivity(value) {
  const activity = isRecord(value) ? value : {};
  return {
    eventName: safeString(activity.type, "unknown_event"),
    agentId: safeString(activity.agent_id, ""),
    agentOrdinal: null,
    toolName: safeString(activity.tool_name, ""),
    toolUseId: safeString(activity.tool_use_id, ""),
    status: normalizeCoreStatus(activity.status),
    occurredAtMs: safeTimestamp(activity.received_at_ms),
  };
}

function isToolLifecycle(activity) {
  return activity.eventName === "tool_started" || activity.eventName === "tool_completed";
}

function shouldReplaceToolActivity(candidate, current) {
  const candidateTime = candidate.occurredAtMs ?? -1;
  const currentTime = current.occurredAtMs ?? -1;
  if (candidateTime !== currentTime) {
    return candidateTime > currentTime;
  }
  return candidate.eventName === "tool_completed" && current.eventName !== "tool_completed";
}

function collapseToolActivities(activities) {
  const latestByToolUseId = new Map();

  for (const activity of activities) {
    if (!activity.toolUseId || !isToolLifecycle(activity)) {
      continue;
    }
    const current = latestByToolUseId.get(activity.toolUseId);
    if (!current || shouldReplaceToolActivity(activity, current)) {
      latestByToolUseId.set(activity.toolUseId, activity);
    }
  }

  return activities.filter((activity) => (
    !activity.toolUseId ||
    !isToolLifecycle(activity) ||
    latestByToolUseId.get(activity.toolUseId) === activity
  ));
}

function normalizeDiagnostic(value) {
  const diagnostic = isRecord(value) ? value : {};
  return {
    code: safeString(diagnostic.code, "unknown_diagnostic"),
    diagnosedAtMs: safeTimestamp(diagnostic.diagnosed_at_ms),
  };
}

function deriveSessionStatus(session, agents, recentActivities) {
  if (session.permission?.status === "waiting_for_user") {
    return "waiting";
  }
  const reportedStatus = normalizeCoreStatus(session.status);
  if (reportedStatus === "running" || reportedStatus === "completed") {
    return reportedStatus;
  }
  if (
    agents.some((agent) => agent.status === "running") ||
    recentActivities[0]?.status === "running"
  ) {
    return "running";
  }
  return "unknown";
}

function normalizeSession(value, index) {
  const session = isRecord(value) ? value : {};
  const agents = Array.isArray(session.agents)
    ? assignStableAgentOrdinals(session.agents.map(normalizeAgent))
    : [];
  const agentOrdinalById = new Map(
    agents.map((agent) => [agent.agentId, agent.ordinal]),
  );
  const recentActivities = Array.isArray(session.recent_activities)
    ? collapseToolActivities(session.recent_activities.map(normalizeActivity)).map(
      (activity) => ({
        ...activity,
        agentOrdinal: agentOrdinalById.get(activity.agentId) ?? null,
      }),
    )
    : [];

  return {
    sessionId: safeString(session.session_id, `unknown-session-${index + 1}`),
    workspaceLabel: safeString(session.workspace_label, ""),
    status: deriveSessionStatus(session, agents, recentActivities),
    lastActivityAtMs: safeTimestamp(session.last_seen_at_ms),
    agents,
    recentActivities,
  };
}

function normalizeState(value) {
  if (
    !isRecord(value) ||
    value.schema_version !== 1 ||
    value.source_of_truth !== "hook" ||
    !Array.isArray(value.sessions) ||
    !Array.isArray(value.diagnostics)
  ) {
    throw new TypeError("상태 응답 형식이 올바르지 않습니다.");
  }

  return {
    updatedAtMs: safeTimestamp(value.updated_at_ms),
    sessions: value.sessions.map(normalizeSession),
    diagnostics: value.diagnostics.map(normalizeDiagnostic),
  };
}

function compareByActivity(left, right) {
  return (right.lastActivityAtMs ?? -1) - (left.lastActivityAtMs ?? -1);
}

function compareAgents(left, right) {
  const statusDifference = STATUS_ORDER[left.status] - STATUS_ORDER[right.status];
  return statusDifference || compareByActivity(left, right);
}

function compareSessions(left, right) {
  const statusDifference = STATUS_ORDER[left.status] - STATUS_ORDER[right.status];
  return statusDifference || compareByActivity(left, right);
}

function formatDateTime(timestampMs) {
  if (timestampMs === null) {
    return "시간 정보 없음";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(timestampMs));
}

function formatRelativeTime(timestampMs) {
  if (timestampMs === null) {
    return "시간 정보 없음";
  }

  const differenceSeconds = Math.round((timestampMs - Date.now()) / 1_000);
  const absoluteSeconds = Math.abs(differenceSeconds);
  const formatter = new Intl.RelativeTimeFormat("ko", { numeric: "auto" });

  if (absoluteSeconds < 60) {
    return formatter.format(differenceSeconds, "second");
  }
  if (absoluteSeconds < 3_600) {
    return formatter.format(Math.round(differenceSeconds / 60), "minute");
  }
  if (absoluteSeconds < 86_400) {
    return formatter.format(Math.round(differenceSeconds / 3_600), "hour");
  }
  return formatter.format(Math.round(differenceSeconds / 86_400), "day");
}

function formatDuration(startedAtMs, stoppedAtMs) {
  if (startedAtMs === null) {
    return "시작 시간 없음";
  }

  const endAtMs = stoppedAtMs ?? Date.now();
  const seconds = Math.max(0, Math.floor((endAtMs - startedAtMs) / 1_000));
  if (seconds < 60) {
    return `${seconds}초`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}분`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}시간 ${remainingMinutes}분` : `${hours}시간`;
}

function createStatusBadge(status) {
  const badge = document.createElement("span");
  badge.className = "status-badge";
  badge.dataset.status = status;

  const dot = document.createElement("span");
  dot.className = "status-dot";
  dot.setAttribute("aria-hidden", "true");

  const label = document.createElement("span");
  label.textContent = STATUS_LABELS[status];

  badge.append(dot, label);
  return badge;
}

function createTime(timestampMs, prefix) {
  const wrapper = document.createElement("span");
  wrapper.className = "time-label";

  if (prefix) {
    wrapper.append(`${prefix} `);
  }

  if (timestampMs === null) {
    wrapper.append("시간 정보 없음");
    return wrapper;
  }

  const time = document.createElement("time");
  time.dateTime = new Date(timestampMs).toISOString();
  time.title = formatDateTime(timestampMs);
  time.textContent = formatRelativeTime(timestampMs);
  wrapper.append(time);
  return wrapper;
}

function createTechnicalDetails(rows) {
  const details = document.createElement("details");
  details.className = "technical-details";

  const summary = document.createElement("summary");
  summary.textContent = "기술 정보";
  const list = document.createElement("dl");

  for (const [label, value] of rows) {
    if (!value) {
      continue;
    }
    const term = document.createElement("dt");
    term.textContent = label;
    const description = document.createElement("dd");
    const code = document.createElement("code");
    code.textContent = value;
    description.append(code);
    list.append(term, description);
  }

  details.append(summary, list);
  return details;
}

function createAgentItem(agent) {
  const item = document.createElement("li");
  item.className = "agent-item";
  item.dataset.status = agent.status;

  const heading = document.createElement("div");
  heading.className = "agent-heading";

  const identity = document.createElement("div");
  identity.className = "agent-identity";
  const name = document.createElement("strong");
  name.className = "agent-name";
  name.textContent = `작업 에이전트 ${agent.ordinal}`;
  identity.append(name);

  const roleLabel = formatAgentRole(agent.agentType);
  if (roleLabel) {
    const role = document.createElement("span");
    role.className = "agent-role";
    role.textContent = roleLabel;
    identity.append(role);
  }
  heading.append(identity, createStatusBadge(agent.status));

  const metadata = document.createElement("div");
  metadata.className = "agent-metadata";
  metadata.append(
    createTime(agent.lastActivityAtMs, "최근"),
    document.createTextNode(` · ${formatDuration(agent.startedAtMs, agent.stoppedAtMs)}`),
  );

  const technicalRows = [["에이전트 ID", agent.agentId]];
  if (roleLabel) {
    technicalRows.push(["원본 역할", agent.agentType]);
  }

  item.append(heading, metadata, createTechnicalDetails(technicalRows));
  return item;
}

function createActivityItem(activity) {
  const item = document.createElement("li");
  item.className = "activity-item";

  const marker = document.createElement("span");
  marker.className = "activity-marker";
  marker.dataset.status = activity.status;
  marker.setAttribute("aria-hidden", "true");

  const content = document.createElement("div");
  const title = document.createElement("div");
  title.className = "activity-title";
  const eventName = document.createElement("strong");
  eventName.textContent = formatActivityLabel(activity);
  title.append(eventName);

  const metadata = document.createElement("div");
  metadata.className = "activity-metadata";
  metadata.append(createStatusBadge(activity.status), createTime(activity.occurredAtMs, ""));

  const technicalRows = [["원본 이벤트", activity.eventName]];
  if (activity.toolName) {
    technicalRows.push(["원본 도구", activity.toolName]);
  }

  content.append(title, metadata, createTechnicalDetails(technicalRows));
  item.append(marker, content);
  return item;
}

function createEmptyPanel(message) {
  const empty = document.createElement("p");
  empty.className = "panel-empty";
  empty.textContent = message;
  return empty;
}

function createSessionCard(session) {
  const listItem = document.createElement("li");
  const article = document.createElement("article");
  article.className = "session-card";
  article.dataset.status = session.status;

  const cardHeader = document.createElement("header");
  cardHeader.className = "session-header";

  const identity = document.createElement("div");
  identity.className = "session-identity";
  const eyebrow = document.createElement("span");
  eyebrow.className = "session-kind";
  eyebrow.textContent = "부모 작업";
  const title = document.createElement("h3");
  title.textContent = session.workspaceLabel || "프로젝트 정보 없음";
  identity.append(
    eyebrow,
    title,
    createTechnicalDetails([["세션 ID", session.sessionId]]),
  );

  const sessionState = document.createElement("div");
  sessionState.className = "session-state";
  sessionState.append(
    createStatusBadge(session.status),
    createTime(session.lastActivityAtMs, "최근 활동"),
  );

  cardHeader.append(identity, sessionState);

  const panels = document.createElement("div");
  panels.className = "session-panels";

  const agentPanel = document.createElement("section");
  agentPanel.className = "session-panel";
  const agentTitle = document.createElement("h4");
  agentTitle.textContent = `작업 에이전트 · ${session.agents.length}`;
  agentPanel.append(agentTitle);

  if (session.agents.length) {
    const list = document.createElement("ul");
    list.className = "agent-list";
    [...session.agents].sort(compareAgents).forEach((agent) => {
      list.append(createAgentItem(agent));
    });
    agentPanel.append(list);
  } else {
    agentPanel.append(createEmptyPanel("이 부모 작업에서 관찰된 작업 에이전트가 없습니다."));
  }

  const activityPanel = document.createElement("section");
  activityPanel.className = "session-panel";
  const activityTitle = document.createElement("h4");
  activityTitle.textContent = "최근 활동";
  activityPanel.append(activityTitle);

  if (session.recentActivities.length) {
    const list = document.createElement("ol");
    list.className = "activity-list";
    session.recentActivities.slice(0, 6).forEach((activity) => {
      list.append(createActivityItem(activity));
    });
    activityPanel.append(list);
  } else {
    activityPanel.append(createEmptyPanel("표시할 최근 활동이 없습니다."));
  }

  panels.append(agentPanel, activityPanel);
  article.append(cardHeader, panels);
  listItem.append(article);
  return listItem;
}

function sessionMatchesQuery(session, query) {
  if (!query) {
    return true;
  }

  const searchableValues = [
    session.sessionId,
    session.workspaceLabel,
    session.status,
    ...session.agents.flatMap((agent) => [
      agent.agentId,
      formatAgentRole(agent.agentType),
      agent.status,
    ]),
    ...session.recentActivities.flatMap((activity) => [
      activity.eventName,
      activity.toolName,
      activity.status,
    ]),
  ];

  return searchableValues.some((value) => value.toLocaleLowerCase().includes(query));
}

function sessionMatchesStatus(session, status) {
  return (
    status === "all" ||
    session.status === status ||
    session.agents.some((agent) => agent.status === status)
  );
}

function filteredSessions() {
  const query = elements.search.value.trim().toLocaleLowerCase();
  const status = elements.statusFilter.value;

  return [...viewState.sessions]
    .filter((session) => sessionMatchesQuery(session, query))
    .filter((session) => sessionMatchesStatus(session, status))
    .sort(compareSessions);
}

function renderMetrics() {
  const agents = viewState.sessions.flatMap((session) => session.agents);
  const countStatus = (status) => agents.filter((agent) => agent.status === status).length;

  elements.metricSessions.textContent = String(viewState.sessions.length);
  elements.metricRunning.textContent = String(countStatus("running"));
  const waitingCount = countStatus("waiting") + viewState.sessions.filter(
    (session) => session.status === "waiting",
  ).length;
  elements.metricWaiting.textContent = String(waitingCount);
  elements.metricCompleted.textContent = String(countStatus("completed"));
  elements.lastUpdated.textContent = !viewState.updatedAtMs
    ? "수신된 활동 없음"
    : formatDateTime(viewState.updatedAtMs);
}

function setStateMessage(kind, title, description, includeRetry = false) {
  elements.stateMessage.className = `state-message state-${kind}`;
  elements.stateMessage.replaceChildren();

  const heading = document.createElement("strong");
  heading.textContent = title;
  const copy = document.createElement("span");
  copy.textContent = description;
  elements.stateMessage.append(heading, copy);

  if (includeRetry) {
    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "retry-button";
    retry.textContent = "다시 연결";
    retry.addEventListener("click", refreshState);
    elements.stateMessage.append(retry);
  }
}

function setEmptyObservationMessage() {
  elements.stateMessage.className = "state-message state-empty state-empty-observation";
  elements.stateMessage.replaceChildren();

  const heading = document.createElement("strong");
  const copy = document.createElement("span");

  if (viewState.diagnostics.length) {
    heading.textContent = "표시 가능한 부모 작업이 없습니다.";
    copy.textContent = `로컬 모니터가 활동 정보 ${viewState.diagnostics.length}건을 받았지만 표시 가능한 부모 작업으로 적용하지 못했습니다.`;
  } else {
    heading.textContent = "이 관찰 화면에서 수신된 작업 활동이 없습니다.";
    copy.textContent = "로컬 모니터 연결은 정상입니다. 이 결과만으로 Codex에 실행 중인 부모 작업이나 작업 에이전트가 없다고 판단할 수 없습니다.";
  }

  const guidance = document.createElement("div");
  guidance.className = "empty-guidance";

  const guidanceTitle = document.createElement("h3");
  guidanceTitle.textContent = "표시되지 않을 때 확인 순서";

  const automaticTracking = document.createElement("p");
  automaticTracking.className = "automatic-tracking";
  automaticTracking.textContent = "작업 ID를 입력하거나 작업별로 등록할 필요가 없습니다. 신뢰한 hook의 작업 활동이 이 목록에 자동으로 추가됩니다.";

  const steps = document.createElement("ol");
  for (const step of [
    "플러그인을 설치한 뒤 공식 Codex 앱을 완전히 재시작했는지 확인합니다.",
    "새 작업에서 표시되는 Codex Agent View hook 명령을 검토하고 직접 신뢰합니다.",
    "신뢰 설정 후 새 작업을 시작해 작업 에이전트를 실행합니다. 새 활동은 이 목록에 자동으로 추가됩니다.",
  ]) {
    const item = document.createElement("li");
    item.textContent = step;
    steps.append(item);
  }

  const boundary = document.createElement("p");
  boundary.className = "observation-boundary";
  boundary.textContent = "관찰 화면은 첫 번째로 신뢰한 hook을 받은 시점부터 시작합니다. 그 전에 이미 지나간 활동과 로컬 상태 수집이 중단된 동안의 활동은 재생되지 않으며, 수집이 다시 시작되면 새 관찰 화면이 열립니다.";

  guidance.append(guidanceTitle, automaticTracking, steps, boundary);

  if (viewState.diagnostics.length) {
    const diagnostics = document.createElement("details");
    diagnostics.className = "diagnostic-details";
    const summary = document.createElement("summary");
    summary.textContent = `검증 정보 ${viewState.diagnostics.length}건`;
    const codes = document.createElement("ul");
    const diagnosticCounts = new Map();
    for (const { code } of viewState.diagnostics) {
      diagnosticCounts.set(code, (diagnosticCounts.get(code) ?? 0) + 1);
    }
    for (const [diagnosticCode, count] of diagnosticCounts) {
      const item = document.createElement("li");
      const code = document.createElement("code");
      code.textContent = diagnosticCode;
      item.append(code, ` · ${count}건`);
      codes.append(item);
    }
    diagnostics.append(summary, codes);
    guidance.append(diagnostics);
  }

  elements.stateMessage.append(heading, copy, guidance);
}

function renderSessions() {
  const visibleSessions = filteredSessions();
  const hasFilters = elements.search.value.trim() || elements.statusFilter.value !== "all";

  elements.toolbar.hidden = viewState.sessions.length === 0;
  elements.stateMessage.hidden = false;

  elements.sessionList.replaceChildren();
  visibleSessions.forEach((session) => {
    elements.sessionList.append(createSessionCard(session));
  });

  elements.resultsSummary.textContent = hasFilters
    ? `전체 ${viewState.sessions.length}개 중 ${visibleSessions.length}개 표시`
    : `${viewState.sessions.length}개 부모 작업`;

  if (!viewState.hasLoaded) {
    elements.sessionList.hidden = true;
    setStateMessage("loading", "상태를 불러오는 중입니다.", "로컬 모니터에 연결하고 있습니다.");
    return;
  }

  if (viewState.errorMessage) {
    elements.sessionList.hidden = !visibleSessions.length;
    const description = viewState.canRetry
      ? viewState.sessions.length
        ? "2초마다 자동으로 다시 연결합니다. 마지막 정상 상태를 계속 표시합니다."
        : "2초마다 자동으로 다시 연결합니다. Codex 앱에서 이 화면을 그대로 두어도 됩니다."
      : viewState.errorMessage;
    setStateMessage(
      "error",
      viewState.canRetry
        ? "로컬 상태 연결이 끊겨 다시 시도 중입니다."
        : "이 실시간 화면을 인증할 수 없습니다.",
      description,
      viewState.canRetry,
    );
    return;
  }

  if (!viewState.sessions.length) {
    elements.sessionList.hidden = true;
    setEmptyObservationMessage();
    return;
  }

  if (!visibleSessions.length) {
    elements.sessionList.hidden = true;
    setStateMessage(
      "empty",
      "검색 결과가 없습니다.",
      "검색어나 상태 필터를 바꿔 보세요.",
    );
    return;
  }

  elements.stateMessage.hidden = true;
  elements.sessionList.hidden = false;
}

function render() {
  elements.stateMessage.hidden = false;
  renderMetrics();
  renderSessions();
}

function setConnectionStatus(status, labelOverride = "") {
  elements.connectionStatus.dataset.status = status;
  const labels = {
    connecting: "로컬 상태 연결 중",
    connected: "로컬 모니터 연결됨",
    error: "연결 끊김 · 재시도 중",
  };
  elements.connectionLabel.textContent = labelOverride || labels[status];
}

async function refreshState() {
  if (viewState.requestInFlight || viewState.authenticationFailed) {
    return;
  }

  if (!accessToken) {
    viewState.hasLoaded = true;
    viewState.canRetry = false;
    viewState.authenticationFailed = true;
    viewState.errorMessage = "이 탭에는 접근 토큰이 없습니다. Codex 앱에서 Codex Agent View의 실시간 화면 열기를 다시 요청하세요.";
    setConnectionStatus("error", "실시간 화면 인증 필요");
    render();
    return;
  }

  viewState.requestInFlight = true;
  if (!viewState.hasLoaded) {
    setConnectionStatus("connecting");
  }

  try {
    const response = await fetch(API_STATE_URL, {
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status === 401 || response.status === 403) {
      await response.body?.cancel();
      viewState.hasLoaded = true;
      viewState.canRetry = false;
      viewState.authenticationFailed = true;
      viewState.errorMessage = "이 실시간 화면의 인증이 더 이상 유효하지 않습니다. Codex 앱에서 Codex Agent View의 실시간 화면 열기를 다시 요청하세요.";
      setConnectionStatus("error", "실시간 화면 인증 필요");
      return;
    }

    if (!response.ok) {
      throw new Error(`상태 요청 실패 (${response.status})`);
    }

    const nextState = normalizeState(await response.json());
    viewState.updatedAtMs = nextState.updatedAtMs;
    viewState.sessions = nextState.sessions;
    viewState.diagnostics = nextState.diagnostics;
    viewState.hasLoaded = true;
    viewState.errorMessage = "";
    viewState.canRetry = true;
    setConnectionStatus("connected");
  } catch (error) {
    viewState.hasLoaded = true;
    viewState.canRetry = true;
    viewState.errorMessage = error instanceof Error
      ? error.message
      : "알 수 없는 연결 오류가 발생했습니다.";
    setConnectionStatus("error");
  } finally {
    viewState.requestInFlight = false;
    render();
  }
}

elements.search.addEventListener("input", renderSessions);
elements.statusFilter.addEventListener("change", renderSessions);
elements.toolbar.addEventListener("submit", (event) => {
  event.preventDefault();
});
window.addEventListener("online", refreshState);
window.addEventListener("offline", () => {
  if (viewState.authenticationFailed) {
    return;
  }
  viewState.canRetry = true;
  viewState.errorMessage = "이 기기가 오프라인입니다.";
  setConnectionStatus("error");
  render();
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    refreshState();
  }
});

render();
refreshState();
if (accessToken) {
  window.setInterval(refreshState, POLL_INTERVAL_MS);
}
