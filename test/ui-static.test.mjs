import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const indexUrl = new URL("../public/index.html", import.meta.url);
const appUrl = new URL("../public/app.js", import.meta.url);
const stylesUrl = new URL("../public/styles.css", import.meta.url);

const [html, app, styles] = await Promise.all([
  readFile(indexUrl, "utf8"),
  readFile(appUrl, "utf8"),
  readFile(stylesUrl, "utf8"),
]);

function loadToolLifecycleHelpers() {
  const start = app.indexOf("function isToolLifecycle(activity)");
  const end = app.indexOf("\n\nfunction normalizeDiagnostic", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  return Function(
    `"use strict";\n${app.slice(start, end)}\nreturn { collapseToolActivities };`,
  )();
}

function loadStableAgentOrdinalHelper() {
  const start = app.indexOf("function agentOrderTimestamp(agent)");
  const end = app.indexOf("\n\nfunction normalizeActivity", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  return Function(
    `"use strict";\n${app.slice(start, end)}\nreturn { assignStableAgentOrdinals };`,
  )();
}

function extractNamedFunction(name) {
  const start = app.indexOf(`async function ${name}(`);
  assert.notEqual(start, -1);
  const bodyStart = app.indexOf("{", start);
  assert.notEqual(bodyStart, -1);

  let depth = 0;
  for (let index = bodyStart; index < app.length; index += 1) {
    if (app[index] === "{") depth += 1;
    if (app[index] === "}") depth -= 1;
    if (depth === 0) return app.slice(start, index + 1);
  }
  assert.fail(`could not extract ${name}`);
}

function createRefreshStateHarness(responses) {
  const calls = [];
  const connectionStates = [];
  let renderCount = 0;
  const queue = [...responses];
  const refreshStateSource = extractNamedFunction("refreshState");
  const buildHarness = Function(
    "fetchImpl",
    "normalizeState",
    "renderImpl",
    "setConnectionStatusImpl",
    "accessToken",
    "API_STATE_URL",
    `
      "use strict";
      const fetch = fetchImpl;
      const render = renderImpl;
      const setConnectionStatus = setConnectionStatusImpl;
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
      ${refreshStateSource}
      return { refreshState, viewState };
    `,
  );
  const harness = buildHarness(
    async (...args) => {
      calls.push(args);
      const next = queue.shift();
      if (next instanceof Error) throw next;
      return next;
    },
    (value) => value,
    () => {
      renderCount += 1;
    },
    (...args) => {
      connectionStates.push(args);
    },
    "v".repeat(43),
    "/api/state",
  );
  return {
    ...harness,
    calls,
    connectionStates,
    get renderCount() {
      return renderCount;
    },
  };
}

function stateResponse(state) {
  return {
    body: { cancel: async () => {} },
    json: async () => state,
    ok: true,
    status: 200,
  };
}

function errorResponse(status, onCancel = () => {}) {
  return {
    body: { cancel: async () => onCancel() },
    json: async () => {
      throw new Error("error response body must not be read");
    },
    ok: false,
    status,
  };
}

test("uses external scripts and styles for a CSP-friendly static shell", () => {
  assert.match(html, /<link\s+rel="stylesheet"\s+href="\/assets\/styles\.css">/);
  assert.match(html, /<script\s+src="\/assets\/app\.js"\s+defer><\/script>/);
  assert.doesNotMatch(html, /<style(?:\s|>)/i);
  assert.doesNotMatch(html, /<script(?!\s+src=)[^>]*>/i);
  assert.doesNotMatch(html, /\son[a-z]+\s*=/i);
  assert.doesNotMatch(html, /https?:\/\//i);
});

test("provides landmarks, labels, live status, and keyboard navigation primitives", () => {
  assert.match(html, /<header\s+class="topbar">/);
  assert.match(html, /<main\s+id="main-content"\s+tabindex="-1">/);
  assert.match(html, /<footer>/);
  assert.match(html, /href="#main-content"/);
  assert.match(html, /<section\s+class="workspace"\s+aria-labelledby="sessions-heading">/);
  assert.match(html, /<form[\s\S]*?class="toolbar"[\s\S]*?role="search"[\s\S]*?aria-label="자동 수신된 부모 작업과 작업 에이전트 목록 필터"[\s\S]*?hidden/);
  assert.match(html, /<label\s+for="session-search">목록 필터 \(선택\)<\/label>/);
  assert.match(html, /placeholder="부모 작업·작업 에이전트 목록에서 찾기"/);
  assert.match(html, /<label\s+for="status-filter">상태 필터 \(선택\)<\/label>/);
  assert.match(html, /id="connection-status"[\s\S]*?role="status"[\s\S]*?aria-live="polite"/);
  assert.match(html, /id="results-summary"[\s\S]*?aria-live="polite"/);
});

test("removes the fragment token and authenticates local state polling", () => {
  assert.match(app, /const API_STATE_URL = "\/api\/state";/);
  assert.match(app, /new URLSearchParams\(window\.location\.hash\.slice\(1\)\)/);
  assert.match(app, /window\.history\.replaceState\(/);
  assert.match(app, /window\.sessionStorage\.setItem\(SESSION_TOKEN_KEY, fragmentToken\)/);
  assert.match(app, /window\.sessionStorage\.getItem\(SESSION_TOKEN_KEY\)/);
  assert.doesNotMatch(app, /localStorage/);
  assert.match(app, /Authorization: `Bearer \$\{accessToken\}`/);
  assert.match(app, /fetch\(API_STATE_URL/);
  assert.match(app, /cache: "no-store"/);
  assert.match(app, /if \(!accessToken\)/);
  assert.match(app, /value\.updated_at_ms/);
  assert.match(app, /agent\.last_seen_at_ms/);
  assert.match(app, /activity\.received_at_ms/);
  assert.doesNotMatch(app, /tool_input|tool_response|last_assistant_message|\bprompt\b/i);
  assert.doesNotMatch(app, /innerHTML|insertAdjacentHTML|eval\s*\(/);
});

test("automatically reconnects with the existing token and preserves the last good state", () => {
  assert.match(app, /const POLL_INTERVAL_MS = 2_000;/);
  assert.match(
    app,
    /if \(accessToken\) \{\s*window\.setInterval\(refreshState, POLL_INTERVAL_MS\);\s*\}/,
  );
  assert.match(app, /2초마다 자동으로 다시 연결합니다\. 마지막 정상 상태를 계속 표시합니다\./);
  assert.doesNotMatch(
    app,
    /catch \(error\) \{[\s\S]*?viewState\.sessions\s*=\s*\[\][\s\S]*?\} finally/,
  );
  assert.match(app, /viewState\.canRetry = false;[\s\S]*?이 탭에는 접근 토큰이 없습니다\./);
  assert.match(app, /setConnectionStatus\("error", "실시간 화면 인증 필요"\)/);
  assert.match(app, /Codex 앱에서 Codex Agent View의 실시간 화면 열기를 다시 요청하세요\./);
});

test("treats rejected live-view credentials as non-retryable without clearing the snapshot", () => {
  assert.match(app, /response\.status === 401 \|\| response\.status === 403/);
  assert.match(
    app,
    /response\.status === 401[\s\S]*?viewState\.canRetry = false;[\s\S]*?viewState\.authenticationFailed = true;/,
  );
  assert.match(app, /이 실시간 화면의 인증이 더 이상 유효하지 않습니다\./);
  assert.match(app, /setConnectionStatus\("error", "실시간 화면 인증 필요"\)/);
  assert.match(app, /viewState\.requestInFlight \|\| viewState\.authenticationFailed/);
  assert.match(app, /catch \(error\) \{[\s\S]*?viewState\.canRetry = true;/);
  assert.doesNotMatch(
    app,
    /response\.status === 401[\s\S]*?viewState\.sessions\s*=\s*\[\]/,
  );
});

test("recovers the same viewer session after transient network and server failures", async () => {
  const firstSnapshot = {
    updatedAtMs: 100,
    sessions: [{ sessionId: "session-1" }],
    diagnostics: [],
  };
  const recoveredSnapshot = {
    updatedAtMs: 200,
    sessions: [{ sessionId: "session-1" }, { sessionId: "session-2" }],
    diagnostics: [],
  };
  const harness = createRefreshStateHarness([
    stateResponse(firstSnapshot),
    new TypeError("fetch failed"),
    errorResponse(502),
    stateResponse(recoveredSnapshot),
  ]);

  await harness.refreshState();
  assert.deepEqual(harness.viewState.sessions, firstSnapshot.sessions);
  assert.equal(harness.viewState.authenticationFailed, false);

  await harness.refreshState();
  assert.deepEqual(harness.viewState.sessions, firstSnapshot.sessions);
  assert.equal(harness.viewState.canRetry, true);
  assert.equal(harness.viewState.authenticationFailed, false);
  assert.equal(harness.viewState.errorMessage, "fetch failed");
  assert.deepEqual(harness.connectionStates.at(-1), ["error"]);

  await harness.refreshState();
  assert.deepEqual(harness.viewState.sessions, firstSnapshot.sessions);
  assert.equal(harness.viewState.canRetry, true);
  assert.equal(harness.viewState.authenticationFailed, false);
  assert.equal(harness.viewState.errorMessage, "상태 요청 실패 (502)");
  assert.deepEqual(harness.connectionStates.at(-1), ["error"]);

  await harness.refreshState();
  assert.deepEqual(harness.viewState.sessions, recoveredSnapshot.sessions);
  assert.equal(harness.viewState.canRetry, true);
  assert.equal(harness.viewState.authenticationFailed, false);
  assert.equal(harness.viewState.errorMessage, "");
  assert.deepEqual(harness.connectionStates.at(-1), ["connected"]);
  assert.equal(harness.calls.length, 4);
  for (const [url, options] of harness.calls) {
    assert.equal(url, "/api/state");
    assert.equal(options.credentials, "same-origin");
    assert.equal(options.headers.Authorization, `Bearer ${"v".repeat(43)}`);
  }
});

for (const status of [401, 403]) {
  test(`makes HTTP ${status} terminal without reading or exposing auth details`, async () => {
    let cancelCount = 0;
    const harness = createRefreshStateHarness([
      stateResponse({
        updatedAtMs: 100,
        sessions: [{ sessionId: "last-good" }],
        diagnostics: [],
      }),
      errorResponse(status, () => {
        cancelCount += 1;
      }),
      stateResponse({ updatedAtMs: 200, sessions: [], diagnostics: [] }),
    ]);

    await harness.refreshState();
    await harness.refreshState();
    assert.equal(cancelCount, 1);
    assert.equal(harness.viewState.authenticationFailed, true);
    assert.equal(harness.viewState.canRetry, false);
    assert.deepEqual(harness.viewState.sessions, [{ sessionId: "last-good" }]);
    assert.equal(
      harness.viewState.errorMessage,
      "이 실시간 화면의 인증이 더 이상 유효하지 않습니다. Codex 앱에서 Codex Agent View의 실시간 화면 열기를 다시 요청하세요.",
    );
    assert.deepEqual(harness.connectionStates.at(-1), ["error", "실시간 화면 인증 필요"]);

    await harness.refreshState();
    assert.equal(harness.calls.length, 2, "terminal auth failure must stop polling retries");
  });
}

test("defines status treatments, responsive layouts, and reduced-motion behavior", () => {
  for (const status of ["running", "waiting", "completed", "unknown"]) {
    assert.match(app, new RegExp(`${status}:`));
  }

  assert.match(styles, /--font-sans:\s*-apple-system/);
  assert.match(styles, /:focus-visible/);
  assert.match(styles, /@media\s*\(max-width:/);
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(styles, /@media\s*\(prefers-color-scheme:\s*dark\)/);
});

test("does not infer parent task completion from completed subagents", () => {
  assert.match(app, /function deriveSessionStatus\(session, agents, recentActivities\)/);
  assert.match(app, /session\.permission\?\.status === "waiting_for_user"[\s\S]*?return "waiting"/);
  assert.match(app, /reportedStatus === "running" \|\| reportedStatus === "completed"/);
  assert.match(app, /agents\.some\(\(agent\) => agent\.status === "running"\)[\s\S]*?return "running"/);
  assert.match(app, /function deriveSessionStatus[\s\S]*?return "unknown";/);
  assert.doesNotMatch(app, /agents\.every\(/);
});

test("renders workspace labels as the primary identity and keeps session IDs in closed details", () => {
  assert.match(app, /workspaceLabel:\s*safeString\(session\.workspace_label, ""\)/);
  assert.match(app, /eyebrow\.textContent = "부모 작업"/);
  assert.match(app, /createTechnicalDetails\(\[\["세션 ID", session\.sessionId\]\]\)/);
  assert.doesNotMatch(app, /eyebrow\.append\(id\)/);
  assert.match(app, /title\.textContent = session\.workspaceLabel \|\| "프로젝트 정보 없음"/);
  assert.match(
    app,
    /const searchableValues = \[[\s\S]*?session\.sessionId,[\s\S]*?session\.workspaceLabel,/,
  );
});

test("prioritizes running work and presents human-readable agent and activity labels", () => {
  assert.match(app, /function compareSessions\(left, right\)[\s\S]*?STATUS_ORDER\[left\.status\] - STATUS_ORDER\[right\.status\]/);
  assert.match(app, /\.sort\(compareSessions\)/);
  assert.match(app, /article\.dataset\.status = session\.status/);
  assert.match(app, /item\.dataset\.status = agent\.status/);
  assert.match(app, /function assignStableAgentOrdinals\(agents\)/);
  assert.match(app, /agent\.startedAtMs \?\? agent\.stoppedAtMs \?\? agent\.lastActivityAtMs/);
  assert.match(app, /left\.agentId\.localeCompare\(right\.agentId\)/);
  assert.match(app, /assignStableAgentOrdinals\(session\.agents\.map\(normalizeAgent\)\)/);
  assert.match(app, /const agentOrdinalById = new Map\([\s\S]*?agent\.agentId, agent\.ordinal/);
  assert.match(app, /name\.textContent = `작업 에이전트 \$\{agent\.ordinal\}`/);
  assert.match(app, /agentOrdinal:\s*agentOrdinalById\.get\(activity\.agentId\) \?\? null/);
  assert.match(app, /`작업 에이전트 \$\{activity\.agentOrdinal\} 시작`/);
  assert.match(app, /`작업 에이전트 \$\{activity\.agentOrdinal\} 완료`/);
  assert.match(app, /const HIDDEN_AGENT_ROLES = new Set\(\["", "default", "unknown"\]\)/);
  assert.match(app, /if \(roleLabel\) \{[\s\S]*?role\.textContent = roleLabel/);
  assert.doesNotMatch(app, /type\.textContent = agent\.agentType/);
  assert.doesNotMatch(app, /\[agent\.agentId, agent\.agentType, agent\.status\]/);
  assert.match(app, /agent\.agentId,[\s\S]*?formatAgentRole\(agent\.agentType\),[\s\S]*?agent\.status/);

  for (const label of [
    "작업 에이전트 완료",
    "에이전트 응답 대기",
    "터미널 작업",
    "파일 수정",
    "사용자 승인 요청",
  ]) {
    assert.match(app, new RegExp(label));
  }

  assert.match(app, /eventName\.textContent = formatActivityLabel\(activity\)/);
  assert.match(app, /createTechnicalDetails\(technicalRows\)/);
  assert.match(app, /\["원본 이벤트", activity\.eventName\]/);
  assert.match(app, /\["원본 도구", activity\.toolName\]/);
  assert.match(styles, /\.session-card\[data-status="running"\]/);
  assert.match(styles, /\.agent-item\[data-status="running"\]/);
  assert.match(styles, /\.technical-details summary[\s\S]*?min-height:\s*2\.75rem/);
});

test("keeps agent ordinals stable when API last-seen ordering changes", () => {
  const { assignStableAgentOrdinals } = loadStableAgentOrdinalHelper();
  const agentsById = {
    agentA: {
      agentId: "agent-a",
      startedAtMs: 100,
      stoppedAtMs: null,
      lastActivityAtMs: 900,
    },
    agentB: {
      agentId: "agent-b",
      startedAtMs: 200,
      stoppedAtMs: null,
      lastActivityAtMs: 1_100,
    },
    agentC: {
      agentId: "agent-c",
      startedAtMs: 300,
      stoppedAtMs: null,
      lastActivityAtMs: 1_000,
    },
  };

  const firstSnapshot = [agentsById.agentB, agentsById.agentC, agentsById.agentA];
  const secondSnapshot = [
    { ...agentsById.agentA, lastActivityAtMs: 1_200 },
    agentsById.agentB,
    agentsById.agentC,
  ];
  const ordinalMap = (agents) => new Map(
    assignStableAgentOrdinals(agents).map(({ agentId, ordinal }) => [agentId, ordinal]),
  );
  const ordinalEntries = (agents) => [...ordinalMap(agents)]
    .sort(([leftId], [rightId]) => leftId.localeCompare(rightId));

  assert.deepEqual(
    ordinalEntries(firstSnapshot),
    [["agent-a", 1], ["agent-b", 2], ["agent-c", 3]],
  );
  assert.deepEqual(ordinalEntries(secondSnapshot), ordinalEntries(firstSnapshot));

  const missingStart = assignStableAgentOrdinals([
    { agentId: "agent-e", startedAtMs: null, stoppedAtMs: null, lastActivityAtMs: 500 },
    { agentId: "agent-d", startedAtMs: null, stoppedAtMs: 400, lastActivityAtMs: 900 },
  ]);
  assert.deepEqual(
    missingStart.map(({ agentId, ordinal }) => [agentId, ordinal]),
    [["agent-e", 2], ["agent-d", 1]],
  );
});

test("collapses stale tool-start activity after the same tool completes", () => {
  assert.match(app, /toolUseId:\s*safeString\(activity\.tool_use_id, ""\)/);
  assert.match(app, /function isToolLifecycle\(activity\)[\s\S]*?"tool_started"[\s\S]*?"tool_completed"/);
  assert.match(app, /function collapseToolActivities\(activities\)/);
  assert.match(app, /function shouldReplaceToolActivity\(candidate, current\)/);
  assert.match(app, /candidate\.eventName === "tool_completed" && current\.eventName !== "tool_completed"/);
  assert.match(app, /const latestByToolUseId = new Map\(\)/);
  assert.match(app, /latestByToolUseId\.set\(activity\.toolUseId, activity\)/);
  assert.match(app, /latestByToolUseId\.get\(activity\.toolUseId\) === activity/);
  assert.match(app, /collapseToolActivities\(session\.recent_activities\.map\(normalizeActivity\)\)/);
  assert.doesNotMatch(app, /\["도구 실행 ID", activity\.toolUseId\]/);

  const { collapseToolActivities } = loadToolLifecycleHelpers();
  const started = {
    eventName: "tool_started",
    toolUseId: "tool-1",
    occurredAtMs: 100,
  };
  const completed = {
    eventName: "tool_completed",
    toolUseId: "tool-1",
    occurredAtMs: 100,
  };
  const permission = {
    eventName: "permission_requested",
    toolUseId: "tool-1",
    occurredAtMs: 100,
  };

  for (const lifecycleOrder of [
    [started, completed],
    [completed, started],
  ]) {
    const collapsed = collapseToolActivities([...lifecycleOrder, permission]);
    assert.equal(collapsed.filter(({ eventName }) => eventName === "tool_started").length, 0);
    assert.equal(collapsed.filter(({ eventName }) => eventName === "tool_completed").length, 1);
    assert.equal(collapsed.filter(({ eventName }) => eventName === "permission_requested").length, 1);
  }
});

test("explains an empty hook observation window without inferring Codex task state", () => {
  assert.match(app, /diagnostics:\s*value\.diagnostics\.map\(normalizeDiagnostic\)/);
  assert.match(app, /const diagnosticCounts = new Map\(\)/);
  assert.match(app, /이 관찰 화면에서 수신된 작업 활동이 없습니다\./);
  assert.match(app, /이 결과만으로 Codex에 실행 중인 부모 작업이나 작업 에이전트가 없다고 판단할 수 없습니다\./);
  assert.match(app, /표시되지 않을 때 확인 순서/);
  assert.match(app, /작업 ID를 입력하거나 작업별로 등록할 필요가 없습니다\. 신뢰한 hook의 작업 활동이 이 목록에 자동으로 추가됩니다\./);
  assert.match(app, /elements\.toolbar\.hidden = viewState\.sessions\.length === 0/);
  assert.match(app, /플러그인을 설치한 뒤 공식 Codex 앱을 완전히 재시작했는지 확인합니다\./);
  assert.match(app, /새 작업에서 표시되는 Codex Agent View hook 명령을 검토하고 직접 신뢰합니다\./);
  assert.match(app, /신뢰 설정 후 새 작업을 시작해 작업 에이전트를 실행합니다\. 새 활동은 이 목록에 자동으로 추가됩니다\./);
  assert.match(app, /관찰 화면은 첫 번째로 신뢰한 hook을 받은 시점부터 시작합니다\./);
  assert.match(app, /그 전에 이미 지나간 활동과 로컬 상태 수집이 중단된 동안의 활동은 재생되지 않으며, 수집이 다시 시작되면 새 관찰 화면이 열립니다\./);
  assert.match(app, /수신된 활동 없음/);
  assert.doesNotMatch(app, /Codex에 실행 중인 (?:부모 작업|작업 에이전트)가 없습니다/);
  assert.doesNotMatch(app, /모니터를 (?:실행|시작)|localhost|새 주소/);
  assert.match(styles, /\.state-empty-observation/);
  assert.match(styles, /\.toolbar\[hidden\][\s\S]*?display:\s*none/);
  assert.match(styles, /\.automatic-tracking/);
  assert.match(styles, /\.empty-guidance/);
  assert.match(styles, /\.diagnostic-details summary[\s\S]*?min-height:\s*2\.75rem/);
});

test("uses natural Korean for all visible shell copy", () => {
  for (const copy of [
    "로컬 읽기 전용 모니터",
    "로컬 · 읽기 전용",
    "부모 작업과 작업 에이전트",
    "실행 중 에이전트",
    "완료 에이전트",
    "현재 화면 기준",
    "실시간 작업",
    "사용자 요청 내용과 도구 입력 내용",
  ]) {
    assert.match(html, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  const visibleShellCopy = html
    .replaceAll("Codex Agent View", "")
    .replaceAll("/assets/app.js", "");
  assert.doesNotMatch(
    visibleShellCopy,
    /Local companion monitor|LOCAL · READ ONLY|LIVE SESSIONS|\btask\b|subagent|\bagent\b|snapshot|prompt|tool input/i,
  );
  assert.match(app, /`작업 에이전트 · \$\{session\.agents\.length\}`/);
  assert.match(app, /이 부모 작업에서 관찰된 작업 에이전트가 없습니다\./);
  assert.match(app, /표시할 최근 활동이 없습니다\./);
  assert.doesNotMatch(app, /"Subagents ·|이 task에서 관찰된 subagent|lifecycle event/);
});
