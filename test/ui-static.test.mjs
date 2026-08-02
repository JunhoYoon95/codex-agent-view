import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [html, app, styles] = await Promise.all([
  readFile(new URL("../public/index.html", import.meta.url), "utf8"),
  readFile(new URL("../public/app.js", import.meta.url), "utf8"),
  readFile(new URL("../public/styles.css", import.meta.url), "utf8"),
]);

function extractFunction(name, { async = false } = {}) {
  const prefix = async ? `async function ${name}(` : `function ${name}(`;
  const start = app.indexOf(prefix);
  assert.notEqual(start, -1, `${name} must exist`);
  const bodyStart = app.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < app.length; index += 1) {
    if (app[index] === "{") depth += 1;
    if (app[index] === "}") depth -= 1;
    if (depth === 0) return app.slice(start, index + 1);
  }
  assert.fail(`could not extract ${name}`);
}

function loadToolLifecycleHelpers() {
  const start = app.indexOf("function isToolLifecycle(activity)");
  const end = app.indexOf("\n\nfunction normalizeDiagnostic", start);
  return Function(`"use strict";\n${app.slice(start, end)}\nreturn { collapseToolActivities };`)();
}

function loadStableAgentOrdinalHelper() {
  const start = app.indexOf("function agentOrderTimestamp(agent)");
  const end = app.indexOf("\n\nfunction normalizeActivity", start);
  return Function(`"use strict";\n${app.slice(start, end)}\nreturn { assignStableAgentOrdinals };`)();
}

function createRefreshStateHarness(responses) {
  const calls = [];
  const connectionStates = [];
  const queue = [...responses];
  const source = extractFunction("refreshState", { async: true });
  const translations = {
    authenticationRequired: "Authentication required",
    expiredToken: "Expired",
    missingToken: "Missing",
    requestFailed: "Failed ({status})",
    unknownConnectionError: "Unknown",
  };
  const build = Function(
    "fetchImpl",
    "normalizeState",
    "render",
    "setConnectionStatus",
    "t",
    "accessToken",
    "API_STATE_URL",
    `
      "use strict";
      const fetch = fetchImpl;
      const viewState = {
        updatedAtMs: null, sessions: [], diagnostics: [], hasLoaded: false,
        errorMessage: "", errorKey: "", canRetry: true,
        authenticationFailed: false, requestInFlight: false,
      };
      ${source}
      return { refreshState, viewState };
    `,
  );
  return {
    ...build(
      async (...args) => {
        calls.push(args);
        const next = queue.shift();
        if (next instanceof Error) throw next;
        return next;
      },
      (value) => value,
      () => {},
      (...args) => connectionStates.push(args),
      (key, values = {}) => Object.entries(values).reduce(
        (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
        translations[key] ?? key,
      ),
      "v".repeat(43),
      "/api/state",
    ),
    calls,
    connectionStates,
  };
}

function stateResponse(state) {
  return { body: { cancel: async () => {} }, json: async () => state, ok: true, status: 200 };
}

function errorResponse(status, onCancel = () => {}) {
  return {
    body: { cancel: async () => onCancel() },
    json: async () => assert.fail("error response body must not be read"),
    ok: false,
    status,
  };
}

test("uses a CSP-friendly static shell with English as the default locale", () => {
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<link\s+rel="stylesheet"\s+href="\/assets\/styles\.css">/);
  assert.match(html, /<script\s+src="\/assets\/app\.js"\s+defer><\/script>/);
  assert.doesNotMatch(html, /<style(?:\s|>)/i);
  assert.doesNotMatch(html, /<script(?!\s+src=)[^>]*>/i);
  assert.doesNotMatch(html, /\son[a-z]+\s*=/i);
  assert.doesNotMatch(html, /https?:\/\//i);
  assert.match(html, /See active work at a glance/);
});

test("offers an accessible English, Korean, and Spanish language selector", () => {
  assert.match(html, /<label class="language-field" for="language-select">/);
  assert.match(html, /<select id="language-select" name="language">/);
  assert.match(html, /<option value="en">English<\/option>/);
  assert.match(html, /<option value="ko">한국어<\/option>/);
  assert.match(html, /<option value="es">Español<\/option>/);
  assert.match(app, /const SUPPORTED_LANGUAGES = new Set\(\["en", "ko", "es"\]\)/);
  assert.match(app, /SUPPORTED_LANGUAGES\.has\(stored\) \? stored : "en"/);
  assert.match(app, /window\.localStorage\.setItem\(LANGUAGE_KEY, currentLanguage\)/);
  assert.match(app, /document\.documentElement\.lang = currentLanguage/);
  assert.match(app, /querySelectorAll\("\[data-i18n\]"\)/);
  assert.match(app, /new Intl\.DateTimeFormat\(currentLanguage/);
  assert.match(app, /new Intl\.RelativeTimeFormat\(currentLanguage/);
  for (const locale of ["en", "ko", "es"]) {
    assert.match(app, new RegExp(`\\n  ${locale}: Object\\.freeze\\(\\{`));
  }

  const messagesStart = app.indexOf("const MESSAGES = Object.freeze(");
  const messagesEnd = app.indexOf("\n\nconst STATUS_KEYS", messagesStart);
  const messages = Function(
    `"use strict"; ${app.slice(messagesStart, messagesEnd)}; return MESSAGES;`,
  )();
  const englishKeys = Object.keys(messages.en).sort();
  assert.deepEqual(Object.keys(messages.ko).sort(), englishKeys);
  assert.deepEqual(Object.keys(messages.es).sort(), englishKeys);
});

test("uses product-oriented work language instead of implementation hierarchy terms", () => {
  assert.match(html, /See what Codex is working on, which agents are involved/);
  assert.match(html, /LIVE CODEX WORK/);
  assert.doesNotMatch(html, /parent tasks|subagents/i);
  assert.match(app, /heroCopy: "Codex가 어떤 요청을 처리하고 있는지/);
  assert.match(app, /heroEyebrow: "CODEX 작업 현황"/);
  assert.match(app, /sessionsHeading: "작업과 참여 에이전트"/);
  assert.match(app, /sessionsHeading: "Trabajos y agentes participantes"/);
  assert.doesNotMatch(app, /heroCopy: .*부모 작업/);
  assert.doesNotMatch(app, /sessionsHeading: .*subagent/i);
});

test("provides landmarks, form labels, live status, and keyboard navigation", () => {
  assert.match(html, /<header\s+class="topbar">/);
  assert.match(html, /<main\s+id="main-content"\s+tabindex="-1">/);
  assert.match(html, /<footer>/);
  assert.match(html, /href="#main-content"/);
  assert.match(html, /<section\s+class="workspace"\s+aria-labelledby="sessions-heading">/);
  assert.match(html, /<form[\s\S]*?class="toolbar"[\s\S]*?role="search"[\s\S]*?data-i18n-aria-label="toolbarAria"[\s\S]*?hidden/);
  assert.match(html, /<label for="session-search" data-i18n="searchLabel">/);
  assert.match(html, /<label for="status-filter" data-i18n="statusFilterLabel">/);
  assert.match(html, /id="connection-status"[\s\S]*?role="status"[\s\S]*?aria-live="polite"/);
  assert.match(styles, /:focus-visible/);
});

test("accepts only the exact token and optional canonical exclusion fragment contract", () => {
  const source = extractFunction("isExactLiveFragment");
  const validate = Function(
    "VIEWER_TOKEN_PATTERN",
    "CANONICAL_SESSION_ID_PATTERN",
    `"use strict"; ${source}; return isExactLiveFragment;`,
  )(/^[A-Za-z0-9_-]{43}$/, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  const token = "v".repeat(43);
  const session = "019fbcf3-19d4-7062-988d-f4e7a65e3e86";
  assert.equal(validate([["token", token]]), true);
  assert.equal(validate([["token", token], ["exclude", session]]), true);
  assert.equal(validate([["exclude", session], ["token", token]]), true);
  assert.equal(validate([["token", token], ["token", token]]), false);
  assert.equal(validate([["token", token], ["exclude", session], ["extra", "x"]]), false);
  assert.equal(validate([["token", token], ["exclude", session.toUpperCase()]]), false);
  assert.equal(validate([["token", `${"v".repeat(42)}\n`]]), false);
});

test("a valid new fragment refreshes or clears stale self-exclusion before being stripped", () => {
  const validatorSource = extractFunction("isExactLiveFragment");
  const consumerSource = extractFunction("consumeLiveContext");
  const buildConsumer = Function(
    "window",
    `
      "use strict";
      const SESSION_TOKEN_KEY = "token-key";
      const EXCLUDED_SESSION_KEY = "exclude-key";
      const VIEWER_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
      const CANONICAL_SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
      ${validatorSource}
      ${consumerSource}
      return consumeLiveContext;
    `,
  );
  const token = "v".repeat(43);
  const oldSession = "019fbcf3-19d4-7062-988d-f4e7a65e3e86";
  const storage = new Map([["token-key", "o".repeat(43)], ["exclude-key", oldSession]]);
  const window = {
    location: { hash: `#token=${token}`, pathname: "/", search: "" },
    history: { state: null, replaceState(_state, _unused, url) { this.url = url; } },
    sessionStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
  };
  const context = buildConsumer(window)();
  assert.deepEqual(context, { accessToken: token, excludedSessionId: "" });
  assert.equal(storage.get("token-key"), token);
  assert.equal(storage.has("exclude-key"), false);
  assert.equal(window.history.url, "/");
});

test("strips live credentials from the URL and keeps auth separate from language preference", () => {
  assert.match(app, /new URLSearchParams\(window\.location\.hash\.slice\(1\)\)/);
  assert.match(app, /window\.history\.replaceState\(/);
  assert.match(app, /window\.sessionStorage\.setItem\(SESSION_TOKEN_KEY, fragmentToken\)/);
  assert.match(app, /window\.sessionStorage\.setItem\(EXCLUDED_SESSION_KEY, fragmentExclude\)/);
  assert.match(app, /window\.sessionStorage\.removeItem\(EXCLUDED_SESSION_KEY\)/);
  assert.match(app, /window\.sessionStorage\.getItem\(SESSION_TOKEN_KEY\)/);
  assert.match(app, /window\.sessionStorage\.getItem\(EXCLUDED_SESSION_KEY\)/);
  assert.match(app, /Authorization: `Bearer \$\{accessToken\}`/);
  assert.match(app, /fetch\(API_STATE_URL/);
  assert.match(app, /cache: "no-store"/);
  assert.doesNotMatch(app, /tool_input|tool_response|last_assistant_message|\bprompt\b/i);
  assert.doesNotMatch(app, /innerHTML|insertAdjacentHTML|eval\s*\(/);
});

test("excludes the current viewer task from every observable collection", () => {
  assert.match(app, /function observableSessions\(\)/);
  assert.match(app, /viewState\.sessions\.filter\(\(session\) => session\.sessionId !== excludedSessionId\)/);
  assert.match(app, /const sessions = observableSessions\(\);[\s\S]*?const agents = sessions\.flatMap/);
  assert.match(app, /return observableSessions\(\)[\s\S]*?\.filter\(\(session\) => sessionMatchesQuery/);
  assert.match(app, /function renderSessions\(\) \{\s*const sessions = observableSessions\(\);/);
  assert.match(app, /elements\.metricSessions\.textContent = String\(sessions\.length\)/);
  assert.match(app, /resultsTotal[\s\S]*?count: sessions\.length/);
});

test("renders technical and diagnostic information inline without refresh-sensitive toggles", () => {
  assert.doesNotMatch(html, /<details|<summary/i);
  assert.doesNotMatch(app, /createElement\("details"\)|createElement\("summary"\)/);
  assert.doesNotMatch(styles, /(^|[,{]\s*)(details|summary)(?=[\s.#:[,{])/m);
  assert.doesNotMatch(styles, /technical-details|diagnostic-details/);
  assert.match(app, /function createTechnicalInfo\(rows\)/);
  assert.match(app, /info\.className = "technical-info"/);
  assert.match(app, /diagnostics\.className = "diagnostic-info"/);
  assert.match(styles, /\.technical-info dl/);
  assert.match(styles, /\.diagnostic-info ul/);
});

test("shows an optional safe request summary and does not expose the session ID as primary UI", () => {
  assert.match(app, /taskSummary: safeString\(session\.task_summary, ""\)/);
  assert.match(app, /taskSummaryCopy\.textContent = session\.taskSummary \|\| t\("taskSummaryUnavailable"\)/);
  assert.match(app, /taskSummaryLabel\.textContent = `\$\{t\("taskSummary"\)\} · `/);
  assert.match(app, /session\.taskSummary,/);
  assert.doesNotMatch(app, /createTechnicalInfo\(\[\[t\("sessionId"\)/);
  assert.doesNotMatch(app, /sessionId: "Session ID"|sessionId: "세션 ID"|sessionId: "ID de sesión"/);
  assert.match(styles, /\.task-summary/);
});

test("provides honest authentication recovery guidance and a working credential retry", () => {
  assert.match(app, /recoveryStep: "In the Codex app,[^"]*actual \$show-agents skill/);
  assert.match(app, /recoveryStep: "Codex 앱 입력창에서[^"]*실제 \$show-agents 스킬/);
  assert.match(app, /recoveryStep: "En el cuadro de texto de Codex,[^"]*\$show-agents/);
  assert.match(app, /retryMode === "authentication" \? retryAuthentication : refreshState/);
  assert.match(app, /retryMode === "authentication"[\s\S]*?recovery-guidance/);
  assert.match(styles, /\.recovery-guidance/);

  const source = extractFunction("retryAuthentication");
  const createHarness = (context) => Function(
    "consumeLiveContext",
    `
      "use strict";
      let accessToken = "stale-token";
      let excludedSessionId = "stale-session";
      const viewState = {
        hasLoaded: true, canRetry: false, authenticationFailed: true,
        errorKey: "expiredToken", errorMessage: "Expired",
      };
      const connectionStates = [];
      let renders = 0;
      let refreshes = 0;
      const t = (key) => key;
      const setConnectionStatus = (...args) => connectionStates.push(args);
      const render = () => { renders += 1; };
      const refreshState = () => { refreshes += 1; };
      ${source}
      return {
        retryAuthentication,
        result: () => ({ accessToken, excludedSessionId, viewState, connectionStates, renders, refreshes }),
      };
    `,
  )(() => context);

  const restored = createHarness({ accessToken: "v".repeat(43), excludedSessionId: "new-session" });
  restored.retryAuthentication();
  assert.equal(restored.result().viewState.authenticationFailed, false);
  assert.equal(restored.result().refreshes, 1);
  assert.equal(restored.result().accessToken, "v".repeat(43));

  const missing = createHarness({ accessToken: "", excludedSessionId: "" });
  missing.retryAuthentication();
  assert.equal(missing.result().viewState.authenticationFailed, true);
  assert.equal(missing.result().viewState.errorKey, "missingToken");
  assert.equal(missing.result().refreshes, 0);
});

test("labels verified agent_type as role/profile without claiming an assignment description", () => {
  assert.match(app, /agentProfile: "Role\/profile · \{profile\}"/);
  assert.match(app, /Codex currently provides each agent's role, but not its full assignment description/);
  assert.match(app, /profileNote\.className = "agent-profile-note"/);
  assert.match(app, /technicalRows\.push\(\[t\("rawProfile"\), agent\.agentType\]\)/);
  assert.doesNotMatch(app, /taskDescription|assignmentDescription|agent\.prompt/i);
});

test("keeps two-second polling and preserves the last good state across transient failures", async () => {
  assert.match(app, /const POLL_INTERVAL_MS = 2_000;/);
  assert.match(app, /if \(accessToken\) \{\s*window\.setInterval\(refreshState, POLL_INTERVAL_MS\);\s*\}/);
  const first = { updatedAtMs: 100, sessions: [{ sessionId: "one" }], diagnostics: [] };
  const recovered = { updatedAtMs: 200, sessions: [{ sessionId: "two" }], diagnostics: [] };
  const harness = createRefreshStateHarness([
    stateResponse(first),
    new TypeError("fetch failed"),
    errorResponse(502),
    stateResponse(recovered),
  ]);
  await harness.refreshState();
  await harness.refreshState();
  assert.deepEqual(harness.viewState.sessions, first.sessions);
  assert.equal(harness.viewState.canRetry, true);
  await harness.refreshState();
  assert.deepEqual(harness.viewState.sessions, first.sessions);
  await harness.refreshState();
  assert.deepEqual(harness.viewState.sessions, recovered.sessions);
  assert.equal(harness.calls.length, 4);
});

for (const status of [401, 403]) {
  test(`makes HTTP ${status} terminal without clearing the last snapshot`, async () => {
    let cancelCount = 0;
    const harness = createRefreshStateHarness([
      stateResponse({ updatedAtMs: 100, sessions: [{ sessionId: "last-good" }], diagnostics: [] }),
      errorResponse(status, () => { cancelCount += 1; }),
      stateResponse({ updatedAtMs: 200, sessions: [], diagnostics: [] }),
    ]);
    await harness.refreshState();
    await harness.refreshState();
    assert.equal(cancelCount, 1);
    assert.equal(harness.viewState.authenticationFailed, true);
    assert.equal(harness.viewState.canRetry, false);
    assert.equal(harness.viewState.errorKey, "expiredToken");
    assert.deepEqual(harness.viewState.sessions, [{ sessionId: "last-good" }]);
    await harness.refreshState();
    assert.equal(harness.calls.length, 2);
  });
}

test("does not infer parent task completion from completed subagents", () => {
  assert.match(app, /function deriveSessionStatus\(session, agents, recentActivities\)/);
  assert.match(app, /session\.permission\?\.status === "waiting_for_user"[\s\S]*?return "waiting"/);
  assert.match(app, /reportedStatus === "running" \|\| reportedStatus === "completed"/);
  assert.match(app, /agents\.some\(\(agent\) => agent\.status === "running"\)[\s\S]*?return "running"/);
  assert.doesNotMatch(app, /agents\.every\(/);
});

test("keeps agent ordinals stable when last-seen ordering changes", () => {
  const { assignStableAgentOrdinals } = loadStableAgentOrdinalHelper();
  const agents = [
    { agentId: "b", startedAtMs: 200, stoppedAtMs: null, lastActivityAtMs: 500 },
    { agentId: "a", startedAtMs: 100, stoppedAtMs: null, lastActivityAtMs: 900 },
  ];
  assert.deepEqual(
    assignStableAgentOrdinals(agents).map(({ agentId, ordinal }) => [agentId, ordinal]),
    [["b", 2], ["a", 1]],
  );
});

test("collapses stale tool-start activity after the same tool completes", () => {
  const { collapseToolActivities } = loadToolLifecycleHelpers();
  const started = { eventName: "tool_started", toolUseId: "tool-1", occurredAtMs: 100 };
  const completed = { eventName: "tool_completed", toolUseId: "tool-1", occurredAtMs: 100 };
  for (const order of [[started, completed], [completed, started]]) {
    const collapsed = collapseToolActivities(order);
    assert.equal(collapsed.length, 1);
    assert.equal(collapsed[0].eventName, "tool_completed");
  }
});

test("keeps responsive, dark-mode, running-state, and reduced-motion styles", () => {
  assert.match(styles, /--font-sans:\s*-apple-system/);
  assert.match(styles, /\.session-card\[data-status="running"\]/);
  assert.match(styles, /\.agent-item\[data-status="running"\]/);
  assert.match(styles, /@media\s*\(max-width:/);
  assert.match(styles, /@media\s*\(prefers-color-scheme:\s*dark\)/);
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});
