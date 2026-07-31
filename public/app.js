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
  hasLoaded: false,
  errorMessage: "",
  canRetry: true,
  requestInFlight: false,
};

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function safeString(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
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

function normalizeActivity(value) {
  const activity = isRecord(value) ? value : {};
  return {
    eventName: safeString(activity.type, "unknown_event"),
    toolName: safeString(activity.tool_name, ""),
    status: normalizeCoreStatus(activity.status),
    occurredAtMs: safeTimestamp(activity.received_at_ms),
  };
}

function deriveSessionStatus(session, agents, recentActivities) {
  if (session.permission?.status === "waiting_for_user") {
    return "waiting";
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
    ? session.agents.map(normalizeAgent)
    : [];
  const recentActivities = Array.isArray(session.recent_activities)
    ? session.recent_activities.map(normalizeActivity)
    : [];

  return {
    sessionId: safeString(session.session_id, `unknown-session-${index + 1}`),
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
    !Array.isArray(value.sessions)
  ) {
    throw new TypeError("상태 응답 형식이 올바르지 않습니다.");
  }

  return {
    updatedAtMs: safeTimestamp(value.updated_at_ms),
    sessions: value.sessions.map(normalizeSession),
  };
}

function compareByActivity(left, right) {
  return (right.lastActivityAtMs ?? -1) - (left.lastActivityAtMs ?? -1);
}

function compareAgents(left, right) {
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

function createAgentItem(agent) {
  const item = document.createElement("li");
  item.className = "agent-item";

  const heading = document.createElement("div");
  heading.className = "agent-heading";

  const identity = document.createElement("div");
  identity.className = "agent-identity";
  const type = document.createElement("span");
  type.className = "agent-type";
  type.textContent = agent.agentType;
  const id = document.createElement("code");
  id.textContent = agent.agentId;
  identity.append(type, id);
  heading.append(identity, createStatusBadge(agent.status));

  const metadata = document.createElement("div");
  metadata.className = "agent-metadata";
  metadata.append(
    createTime(agent.lastActivityAtMs, "최근"),
    document.createTextNode(` · ${formatDuration(agent.startedAtMs, agent.stoppedAtMs)}`),
  );

  item.append(heading, metadata);
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
  eventName.textContent = activity.eventName;
  title.append(eventName);

  if (activity.toolName) {
    const tool = document.createElement("code");
    tool.textContent = activity.toolName;
    title.append(tool);
  }

  const metadata = document.createElement("div");
  metadata.className = "activity-metadata";
  metadata.append(createStatusBadge(activity.status), createTime(activity.occurredAtMs, ""));

  content.append(title, metadata);
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

  const cardHeader = document.createElement("header");
  cardHeader.className = "session-header";

  const identity = document.createElement("div");
  identity.className = "session-identity";
  const eyebrow = document.createElement("span");
  eyebrow.className = "session-kind";
  eyebrow.textContent = "PARENT TASK";
  const title = document.createElement("h3");
  const id = document.createElement("code");
  id.textContent = session.sessionId;
  title.append(id);
  identity.append(eyebrow, title);

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
  agentTitle.textContent = `Subagents · ${session.agents.length}`;
  agentPanel.append(agentTitle);

  if (session.agents.length) {
    const list = document.createElement("ul");
    list.className = "agent-list";
    [...session.agents].sort(compareAgents).forEach((agent) => {
      list.append(createAgentItem(agent));
    });
    agentPanel.append(list);
  } else {
    agentPanel.append(createEmptyPanel("이 task에서 관찰된 subagent가 없습니다."));
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
    activityPanel.append(createEmptyPanel("표시할 lifecycle event가 없습니다."));
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
    session.status,
    ...session.agents.flatMap((agent) => [agent.agentId, agent.agentType, agent.status]),
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
    .sort(compareByActivity);
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
    ? "시간 정보 없음"
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

function renderSessions() {
  const visibleSessions = filteredSessions();
  const hasFilters = elements.search.value.trim() || elements.statusFilter.value !== "all";

  elements.stateMessage.hidden = false;

  elements.sessionList.replaceChildren();
  visibleSessions.forEach((session) => {
    elements.sessionList.append(createSessionCard(session));
  });

  elements.resultsSummary.textContent = hasFilters
    ? `전체 ${viewState.sessions.length}개 중 ${visibleSessions.length}개 표시`
    : `${viewState.sessions.length}개 부모 task`;

  if (!viewState.hasLoaded) {
    elements.sessionList.hidden = true;
    setStateMessage("loading", "상태를 불러오는 중입니다.", "로컬 monitor에 연결하고 있습니다.");
    return;
  }

  if (viewState.errorMessage) {
    elements.sessionList.hidden = !visibleSessions.length;
    const description = viewState.sessions.length
      ? "마지막 정상 상태를 계속 표시합니다."
      : viewState.errorMessage;
    setStateMessage(
      "error",
      "로컬 monitor에 연결할 수 없습니다.",
      description,
      viewState.canRetry,
    );
    return;
  }

  if (!viewState.sessions.length) {
    elements.sessionList.hidden = true;
    setStateMessage(
      "empty",
      "아직 관찰된 task가 없습니다.",
      "Codex에서 task나 subagent가 시작되면 이곳에 나타납니다.",
    );
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

function setConnectionStatus(status) {
  elements.connectionStatus.dataset.status = status;
  const labels = {
    connecting: "로컬 상태 연결 중",
    connected: "로컬 monitor 연결됨",
    error: "연결 끊김",
  };
  elements.connectionLabel.textContent = labels[status];
}

async function refreshState() {
  if (viewState.requestInFlight) {
    return;
  }

  if (!accessToken) {
    viewState.hasLoaded = true;
    viewState.canRetry = false;
    viewState.errorMessage = "접근 token이 없습니다. monitor를 다시 실행해 새 주소를 여세요.";
    setConnectionStatus("error");
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

    if (!response.ok) {
      throw new Error(`상태 요청 실패 (${response.status})`);
    }

    const nextState = normalizeState(await response.json());
    viewState.updatedAtMs = nextState.updatedAtMs;
    viewState.sessions = nextState.sessions;
    viewState.hasLoaded = true;
    viewState.errorMessage = "";
    viewState.canRetry = true;
    setConnectionStatus("connected");
  } catch (error) {
    viewState.hasLoaded = true;
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
