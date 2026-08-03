import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const [html, app, styles] = await Promise.all([
  readFile(new URL("../public/index.html", import.meta.url), "utf8"),
  readFile(new URL("../public/app.js", import.meta.url), "utf8"),
  readFile(new URL("../public/styles.css", import.meta.url), "utf8"),
]);

function extractFunction(name, { async = false } = {}) {
  const prefix = async ? `async function ${name}(` : `function ${name}(`;
  const start = app.indexOf(prefix);
  assert.notEqual(start, -1, `${name} must exist`);
  const parametersStart = app.indexOf("(", start);
  let parameterDepth = 0;
  let bodyStart = -1;
  for (let index = parametersStart; index < app.length; index += 1) {
    if (app[index] === "(") parameterDepth += 1;
    if (app[index] === ")") parameterDepth -= 1;
    if (parameterDepth === 0) {
      bodyStart = app.indexOf("{", index + 1);
      break;
    }
  }
  assert.notEqual(bodyStart, -1, `${name} body must exist`);
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

function loadStatusHelpers() {
  const normalizeStatus = extractFunction("normalizeStatus");
  const normalizeCoreStatus = extractFunction("normalizeCoreStatus");
  const deriveSessionStatus = extractFunction("deriveSessionStatus");
  return Function(
    "KNOWN_STATUSES",
    `"use strict"; ${normalizeStatus}\n${normalizeCoreStatus}\n${deriveSessionStatus}\nreturn { normalizeCoreStatus, deriveSessionStatus };`,
  )(new Set([
    "running",
    "waiting",
    "completed",
    "completion_not_observed",
    "stale",
    "interrupted",
    "unknown",
  ]));
}

function loadStatusFilterHelper() {
  const source = extractFunction("sessionMatchesStatus");
  return Function(`"use strict"; ${source}; return sessionMatchesStatus;`)();
}

function loadQueryFilterHelper() {
  const source = extractFunction("sessionMatchesQuery");
  return Function(
    "formatAgentRole",
    "formatAgentCurrentActivity",
    `"use strict"; ${source}; return sessionMatchesQuery;`,
  )(
    (agentType) => agentType,
    () => "",
  );
}

function loadSafeSummaryHelper() {
  const source = extractFunction("safeSummary");
  return Function(
    "safeString",
    "CONTROL_CHARACTERS",
    `"use strict"; ${source}; return safeSummary;`,
  )(
    (value, fallback) => (typeof value === "string" && value.trim() ? value.trim() : fallback),
    /[\u0000-\u001f\u007f-\u009f]/g,
  );
}

function loadAgentCurrentActivityFormatter() {
  const source = extractFunction("formatAgentCurrentActivity");
  const templates = {
    agentWorkEnded: "agent work ended",
    agentLastActivityCompletionUnconfirmed: "last activity unconfirmed",
    completionNotObservedExplanation: "completion unconfirmed",
    agentCurrentStatusUnverified: "status unverified",
    agentToolRunning: "{tool} running",
    agentToolRunningObserved: "{tool} running at {time}",
    agentToolCompletedRecently: "recent {tool} completed",
    agentToolCompletedRecentlyObserved: "recent {tool} completed at {time}",
    agentWaitingForNextStep: "waiting",
    agentCurrentActivityUnavailable: "unavailable",
  };
  return Function(
    "t",
    "formatToolLabel",
    "formatRelativeTime",
    "STATUS_EXPLANATION_KEYS",
    `"use strict"; ${source}; return formatAgentCurrentActivity;`,
  )(
    (key, values = {}) => Object.entries(values).reduce(
      (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
      templates[key] ?? key,
    ),
    (toolName) => `tool:${toolName}`,
    (timestampMs) => `time:${timestampMs}`,
    { completion_not_observed: "completionNotObservedExplanation" },
  );
}

function createRefreshStateHarness(responses, options = {}) {
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
      const VIEWER_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
      const CANONICAL_SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
      let excludedSessionId = ${JSON.stringify(options.excludedSessionId || "")};
      let recoveredAccessToken = "";
      const clearRejectedViewerToken = () => { accessToken = ""; recoveredAccessToken = ""; };
      const storeRecoveryCredential = () => {};
      const refreshRecoveredAccess = () => {};
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
      options.accessToken || "v".repeat(43),
      "/api/state",
    ),
    calls,
    connectionStates,
  };
}

function stateResponse(state, { headers = {} } = {}) {
  return {
    body: { cancel: async () => {} },
    headers: { get: (name) => headers[name.toLowerCase()] ?? null },
    json: async () => state,
    ok: true,
    status: 200,
  };
}

function errorResponse(status, onCancel = () => {}) {
  return {
    body: { cancel: async () => onCancel() },
    json: async () => assert.fail("error response body must not be read"),
    ok: false,
    status,
  };
}

function signedCredential(label) {
  return `${Buffer.from(label).toString("base64url")}.${"s".repeat(43)}`;
}

function exchangeResponse({
  accessExpiresInMs = 15 * 60 * 1_000,
  excludedSessionId = null,
  recoveryExpiresInMs = 30 * 60 * 1_000,
} = {}) {
  return {
    body: { cancel: async () => {} },
    json: async () => ({
      access_credential: signedCredential("access"),
      access_expires_in_ms: accessExpiresInMs,
      excluded_session_id: excludedSessionId,
      recovery_credential: signedCredential("recovery"),
      recovery_expires_in_ms: recoveryExpiresInMs,
      status: "exchanged",
    }),
    ok: true,
    status: 200,
  };
}

function createAuthVmHarness(responses, {
  accessToken: initialAccessToken = "",
  bootstrapCredential = "",
  excludedSessionId: initialExcludedSessionId = "",
  sessionStorage: storage = new Map(),
} = {}) {
  const queue = [...responses];
  const fetchCalls = [];
  const localStorage = new Map();
  const stateMessage = {
    children: [],
    className: "",
    append(...children) { this.children.push(...children); },
    replaceChildren(...children) { this.children = [...children]; },
  };
  const document = {
    createElement(tagName) {
      return {
        tagName,
        children: [],
        listeners: {},
        append(...children) { this.children.push(...children); },
        addEventListener(type, listener) { this.listeners[type] = listener; },
      };
    },
  };
  const window = {
    localStorage: {
      getItem: (key) => localStorage.get(key) ?? null,
      removeItem: (key) => localStorage.delete(key),
      setItem: (key, value) => localStorage.set(key, value),
    },
    sessionStorage: {
      getItem: (key) => storage.get(key) ?? null,
      removeItem: (key) => storage.delete(key),
      setItem: (key, value) => storage.set(key, value),
    },
    setInterval() {},
  };
  const context = vm.createContext({
    Date,
    JSON,
    Object,
    document,
    fetch: async (...args) => {
      fetchCalls.push(args);
      return queue.shift();
    },
    window,
  });
  const sources = [
    extractFunction("readRecoveryCredential"),
    extractFunction("persistRecoveryCredential"),
    extractFunction("clearRejectedViewerToken"),
    extractFunction("clearRecoveryCredential"),
    extractFunction("validateExchangePayload"),
    extractFunction("exchangeViewerCredential", { async: true }),
    extractFunction("storeRecoveryCredential"),
    extractFunction("refreshRecoveredAccess"),
    extractFunction("setStateMessage"),
    extractFunction("retryAuthentication", { async: true }),
    extractFunction("refreshState", { async: true }),
    extractFunction("initializeLiveView", { async: true }),
  ].join("\n");
  const initialBootstrap = JSON.stringify(bootstrapCredential);
  new vm.Script(`
    const API_EXCHANGE_URL = "/api/viewer/exchange";
    const API_STATE_URL = "/api/state";
    const ACCESS_HEADER = "x-codex-agent-view-access";
    const RECOVERY_HEADER = "x-codex-agent-view-recovery";
    const POLL_INTERVAL_MS = 2_000;
    const RECOVERY_CREDENTIAL_KEY = "recovery";
    const ACCESS_CLIENT_TTL_MS = 15 * 60 * 1_000;
    const RECOVERY_CLIENT_TTL_MS = 30 * 60 * 1_000;
    const RECOVERY_REFRESH_THRESHOLD_MS = 5 * 60 * 1_000;
    const SESSION_TOKEN_KEY = "session";
    const EXCLUDED_SESSION_KEY = "exclude";
    const VIEWER_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
    const SIGNED_CREDENTIAL_PATTERN = /^[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]{43}$/;
    const CANONICAL_SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    let accessToken = ${JSON.stringify(initialAccessToken)};
    let bootstrapCredential = ${initialBootstrap};
    let recoveredAccessToken = "";
    let excludedSessionId = ${JSON.stringify(initialExcludedSessionId)};
    let authenticationExchangeInFlight = false;
    const viewState = {
      updatedAtMs: null, sessions: [], diagnostics: [], hasLoaded: false,
      errorMessage: "", errorKey: "", canRetry: false,
      authenticationFailed: false, requestInFlight: false,
    };
    const elements = { stateMessage: globalThis.stateMessage };
    const t = (key) => key;
    const render = () => {};
    const setConnectionStatus = () => {};
    const consumeLiveContext = () => ({
      accessToken: "", bootstrapCredential: "", excludedSessionId: "",
    });
    const normalizeState = (value) => value;
    const applyStaticTranslations = () => {};
    ${sources}
    globalThis.authHarness = {
      exchangeViewerCredential,
      initializeLiveView,
      refreshState,
      retryAuthentication,
      setStateMessage,
      state: () => ({
        authenticationExchangeInFlight,
        accessToken,
        bootstrapCredential,
        excludedSessionId,
        recoveredAccessToken,
        viewState: { ...viewState },
      }),
    };
  `).runInContext(Object.assign(context, { stateMessage }));
  return { auth: context.authHarness, fetchCalls, localStorage, stateMessage, storage };
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

test("accepts only an exact one-time grant or the legacy token fragment contract", () => {
  const source = extractFunction("isExactLiveFragment");
  const validate = Function(
    "VIEWER_TOKEN_PATTERN",
    "SIGNED_CREDENTIAL_PATTERN",
    "CANONICAL_SESSION_ID_PATTERN",
    `"use strict"; ${source}; return isExactLiveFragment;`,
  )(
    /^[A-Za-z0-9_-]{43}$/,
    /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/,
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
  );
  const token = "v".repeat(43);
  const grant = `${"g".repeat(60)}.${"s".repeat(43)}`;
  const session = "019fbcf3-19d4-7062-988d-f4e7a65e3e86";
  assert.equal(validate([["grant", grant]]), true);
  assert.equal(validate([["grant", grant], ["exclude", session]]), false);
  assert.equal(validate([["grant", grant], ["token", token]]), false);
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
      const RECOVERY_CREDENTIAL_KEY = "recovery-key";
      const VIEWER_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
      const SIGNED_CREDENTIAL_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/;
      const CANONICAL_SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
      ${validatorSource}
      ${consumerSource}
      return consumeLiveContext;
    `,
  );
  const token = "v".repeat(43);
  const oldSession = "019fbcf3-19d4-7062-988d-f4e7a65e3e86";
  const storage = new Map([
    ["token-key", "o".repeat(43)],
    ["exclude-key", oldSession],
    ["recovery-key", JSON.stringify({ credential: signedCredential("old-family") })],
  ]);
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
  assert.deepEqual(context, {
    accessToken: token,
    bootstrapCredential: "",
    excludedSessionId: "",
  });
  assert.equal(storage.get("token-key"), token);
  assert.equal(storage.has("exclude-key"), false);
  assert.equal(storage.has("recovery-key"), false);
  assert.equal(window.history.url, "/");

  const grant = signedCredential("new-family-grant");
  storage.set("token-key", token);
  storage.set("exclude-key", oldSession);
  storage.set("recovery-key", JSON.stringify({ credential: signedCredential("token-family") }));
  window.location.hash = `#grant=${grant}`;
  const grantContext = buildConsumer(window)();
  assert.deepEqual(grantContext, {
    accessToken: "",
    bootstrapCredential: grant,
    excludedSessionId: "",
  });
  assert.equal(storage.has("token-key"), false);
  assert.equal(storage.has("exclude-key"), false);
  assert.equal(storage.has("recovery-key"), false);
});

test("strips live credentials from the URL and keeps auth separate from language preference", () => {
  assert.match(app, /new URLSearchParams\(window\.location\.hash\.slice\(1\)\)/);
  assert.match(app, /window\.history\.replaceState\(/);
  assert.match(app, /window\.sessionStorage\.setItem\(SESSION_TOKEN_KEY, fragmentToken\)/);
  assert.match(app, /window\.sessionStorage\.setItem\(EXCLUDED_SESSION_KEY, fragmentExclude\)/);
  assert.match(app, /window\.sessionStorage\.removeItem\(EXCLUDED_SESSION_KEY\)/);
  assert.match(app, /window\.sessionStorage\.getItem\(SESSION_TOKEN_KEY\)/);
  assert.match(app, /window\.sessionStorage\.getItem\(EXCLUDED_SESSION_KEY\)/);
  assert.match(app, /Authorization: `Bearer \$\{stateAccessCredential\}`/);
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

test("provides external-browser recovery guidance and a working credential retry", () => {
  assert.match(app, /recoveryStep: "Return to the Codex app and run @codex-agent-view again/);
  assert.match(app, /recoveryStep: "Codex 앱으로 돌아가 @codex-agent-view를 다시 실행/);
  assert.match(app, /recoveryStep: "Vuelve a la aplicación Codex y ejecuta @codex-agent-view de nuevo/);
  assert.match(app, /default browser/);
  assert.match(app, /기본 브라우저/);
  assert.match(app, /navegador predeterminado/);
  assert.doesNotMatch(app, /\$show-agents|skill picker|스킬 선택기|selector de skills/);
  assert.doesNotMatch(app, /in-app Browser|Codex 내장 Browser/);
  assert.match(html, /Connecting this browser to the local Codex monitor on this device/);
  assert.match(app, /retryMode === "authentication" \? retryAuthentication : refreshState/);
  assert.match(app, /retryMode === "authentication"[\s\S]*?recovery-guidance/);
  assert.match(styles, /\.recovery-guidance/);
  assert.match(app, /const API_EXCHANGE_URL = "\/api\/viewer\/exchange"/);
  assert.match(app, /window\.sessionStorage\.setItem\(RECOVERY_CREDENTIAL_KEY/);
  assert.match(app, /body: JSON\.stringify\(\{ credential \}\)/);
  assert.match(app, /payload\.status === "exchanged"/);
  assert.match(app, /recoveredAccessToken = payload\.access_credential/);
  assert.match(app, /excludedSessionId = payload\.excluded_session_id \|\| ""/);
  assert.match(app, /authenticationExchangeInFlight/);
  assert.match(app, /retryMode && \(retryMode !== "authentication" \|\| recoveryAvailable\)/);
  assert.doesNotMatch(app, /localStorage\.setItem\(SESSION_TOKEN_KEY/);
  assert.doesNotMatch(app, /localStorage\.(?:getItem|setItem)\(RECOVERY_CREDENTIAL_KEY/);
  assert.doesNotMatch(app, /document\.cookie|Set-Cookie/i);
});

test("ordinary connection errors expose an immediate retry button in the browser", async () => {
  const harness = createAuthVmHarness([
    stateResponse({ updatedAtMs: 1, sessions: [], diagnostics: [] }),
  ], { accessToken: signedCredential("browser-retry") });

  harness.auth.setStateMessage("error", "Disconnected", "Retrying", "connection");
  const button = harness.stateMessage.children.find(({ tagName }) => tagName === "button");
  assert(button, "a transient connection failure must expose a retry button");
  assert.equal(button.children.length, 0);

  await button.listeners.click();
  assert.deepEqual(harness.fetchCalls.map(([url]) => url), ["/api/state"]);
});

test("startup exchanges a fragment grant before the first state request", async () => {
  const sessionId = "019fbcf3-19d4-7062-988d-f4e7a65e3e86";
  const harness = createAuthVmHarness([
    exchangeResponse({ excludedSessionId: sessionId }),
    stateResponse({ updatedAtMs: 1, sessions: [], diagnostics: [] }),
  ], { bootstrapCredential: signedCredential("bootstrap") });

  await harness.auth.initializeLiveView();

  assert.deepEqual(
    harness.fetchCalls.map(([url]) => url),
    ["/api/viewer/exchange", "/api/state"],
  );
  assert.equal(harness.auth.state().bootstrapCredential, "");
  assert.equal(harness.auth.state().excludedSessionId, sessionId);
  assert.match(harness.auth.state().recoveredAccessToken, /\.[A-Za-z0-9_-]{43}$/);
  const persisted = JSON.parse(harness.storage.get("recovery"));
  assert.match(persisted.credential, /\.[A-Za-z0-9_-]{43}$/);
  assert.equal(harness.localStorage.has("recovery"), false);
});

test("exchange accepts bounded remaining TTLs and rejects expired or oversized values", async () => {
  const remaining = createAuthVmHarness([
    exchangeResponse({ accessExpiresInMs: 12_345, recoveryExpiresInMs: 67_890 }),
  ]);
  assert.equal(await remaining.auth.exchangeViewerCredential(
    signedCredential("remaining"),
    { source: "recovery" },
  ), true);

  for (const response of [
    exchangeResponse({ accessExpiresInMs: 0 }),
    exchangeResponse({ accessExpiresInMs: 15 * 60 * 1_000 + 1 }),
    exchangeResponse({ recoveryExpiresInMs: 0 }),
    exchangeResponse({ recoveryExpiresInMs: 30 * 60 * 1_000 + 1 }),
  ]) {
    const harness = createAuthVmHarness([response]);
    await assert.rejects(
      harness.auth.exchangeViewerCredential(signedCredential("invalid-ttl"), {
        source: "recovery",
      }),
      /invalidState/,
    );
  }
});

test("recovery credentials are isolated to one tab's session storage", () => {
  const firstTabStorage = new Map();
  const secondTabStorage = new Map();
  const firstTab = createAuthVmHarness([], { sessionStorage: firstTabStorage });
  const secondTab = createAuthVmHarness([], { sessionStorage: secondTabStorage });
  const recovery = signedCredential("first-tab-only");

  firstTab.storage.set("recovery", JSON.stringify({
    credential: recovery,
    expires_at_ms: Date.now() + 60_000,
  }));
  firstTab.auth.setStateMessage("error", "auth", "expired", "authentication");
  secondTab.auth.setStateMessage("error", "auth", "expired", "authentication");

  assert.equal(
    firstTab.stateMessage.children.some(({ tagName }) => tagName === "button"),
    true,
  );
  assert.equal(
    secondTab.stateMessage.children.some(({ tagName }) => tagName === "button"),
    false,
  );
  assert.equal(firstTab.localStorage.has("recovery"), false);
  assert.equal(secondTab.localStorage.has("recovery"), false);
});

test("a successful legacy root request transitions the tab to signed credentials", async () => {
  const rootToken = "v".repeat(43);
  const sessionId = "019fbcf3-19d4-7062-988d-f4e7a65e3e86";
  const accessCredential = signedCredential("response-access");
  const recoveryCredential = signedCredential("response-recovery");
  const storage = new Map([
    ["session", rootToken],
    ["exclude", sessionId],
  ]);
  const harness = createAuthVmHarness([
    stateResponse(
      { updatedAtMs: 1, sessions: [], diagnostics: [] },
      { headers: {
        "x-codex-agent-view-access": accessCredential,
        "x-codex-agent-view-recovery": recoveryCredential,
      } },
    ),
    stateResponse({ updatedAtMs: 2, sessions: [], diagnostics: [] }),
  ], {
    accessToken: rootToken,
    excludedSessionId: sessionId,
    sessionStorage: storage,
  });

  await harness.auth.refreshState();
  assert.equal(harness.auth.state().accessToken, "");
  assert.equal(harness.auth.state().recoveredAccessToken, accessCredential);
  assert.equal(storage.has("session"), false);
  assert.equal(storage.has("exclude"), false);
  assert.equal(JSON.parse(storage.get("recovery")).credential, recoveryCredential);

  await harness.auth.refreshState();
  assert.equal(harness.fetchCalls[0][1].headers.Authorization, `Bearer ${rootToken}`);
  assert.equal(
    harness.fetchCalls[0][1].headers["x-codex-agent-view-exclude-session"],
    sessionId,
  );
  assert.equal(
    harness.fetchCalls[1][1].headers.Authorization,
    `Bearer ${accessCredential}`,
  );
  assert.equal(
    Object.hasOwn(harness.fetchCalls[1][1].headers, "x-codex-agent-view-exclude-session"),
    false,
  );
});

test("a transient bootstrap exchange failure keeps a working retry button", async () => {
  const bootstrap = signedCredential("bootstrap-retry");
  const sessionId = "019fbcf3-19d4-7062-988d-f4e7a65e3e86";
  const harness = createAuthVmHarness([
    errorResponse(503),
    exchangeResponse({ excludedSessionId: sessionId }),
    stateResponse({ updatedAtMs: 2, sessions: [], diagnostics: [] }),
  ], { bootstrapCredential: bootstrap });

  await assert.rejects(
    harness.auth.exchangeViewerCredential(bootstrap, { source: "bootstrap" }),
    /requestFailed/,
  );
  assert.equal(harness.auth.state().bootstrapCredential, bootstrap);
  harness.auth.setStateMessage("error", "auth", "failed", "authentication");
  const button = harness.stateMessage.children.find(({ tagName }) => tagName === "button");
  assert(button, "transient bootstrap failure must expose a retry button");

  await button.listeners.click();

  assert.equal(harness.fetchCalls.length, 3);
  assert.equal(harness.auth.state().bootstrapCredential, "");
  assert.equal(harness.auth.state().excludedSessionId, sessionId);
});

test("a stored recovery credential reconnects on click and a rejected one is cleared without a loop", async () => {
  const recovery = signedCredential("stored-recovery");
  const success = createAuthVmHarness([
    exchangeResponse(),
    stateResponse({ updatedAtMs: 3, sessions: [], diagnostics: [] }),
  ]);
  success.storage.set("recovery", JSON.stringify({
    credential: recovery,
    expires_at_ms: Date.now() + 60_000,
  }));
  success.auth.setStateMessage("error", "auth", "missing", "authentication");
  const successButton = success.stateMessage.children.find(({ tagName }) => tagName === "button");
  assert(successButton);
  await successButton.listeners.click();
  assert.deepEqual(success.fetchCalls.map(([url]) => url), [
    "/api/viewer/exchange",
    "/api/state",
  ]);

  const rejected = createAuthVmHarness([errorResponse(401)]);
  rejected.storage.set("recovery", JSON.stringify({
    credential: recovery,
    expires_at_ms: Date.now() + 60_000,
  }));
  rejected.auth.setStateMessage("error", "auth", "expired", "authentication");
  const rejectedButton = rejected.stateMessage.children.find(({ tagName }) => tagName === "button");
  assert(rejectedButton);
  await rejectedButton.listeners.click();
  assert.equal(rejected.storage.has("recovery"), false);
  await rejectedButton.listeners.click();
  assert.equal(rejected.fetchCalls.length, 1);
});

test("authentication controls prevent duplicate exchange and hide the button without credentials", async () => {
  let resolveExchange;
  const pending = new Promise((resolve) => { resolveExchange = resolve; });
  const bootstrap = signedCredential("one-flight");
  const harness = createAuthVmHarness([pending], { bootstrapCredential: bootstrap });
  const first = harness.auth.exchangeViewerCredential(bootstrap, { source: "bootstrap" });
  const second = await harness.auth.exchangeViewerCredential(bootstrap, { source: "bootstrap" });
  assert.equal(second, false);
  assert.equal(harness.fetchCalls.length, 1);
  assert.equal(harness.auth.state().authenticationExchangeInFlight, true);
  resolveExchange(exchangeResponse());
  assert.equal(await first, true);
  assert.equal(harness.auth.state().authenticationExchangeInFlight, false);

  const empty = createAuthVmHarness([]);
  empty.auth.setStateMessage("error", "auth", "missing", "authentication");
  assert.equal(
    empty.stateMessage.children.some(({ tagName }) => tagName === "button"),
    false,
  );
});

test("an access 401 preserves recovery and exposes the reconnect button", async () => {
  const harness = createAuthVmHarness([
    exchangeResponse(),
    errorResponse(401),
  ], { bootstrapCredential: signedCredential("bootstrap-401") });
  await harness.auth.initializeLiveView();
  assert.equal(harness.auth.state().viewState.authenticationFailed, true);
  assert.equal(harness.storage.has("recovery"), true);

  harness.auth.setStateMessage("error", "auth", "expired", "authentication");
  assert.equal(
    harness.stateMessage.children.some(({ tagName }) => tagName === "button"),
    true,
  );
});

test("legacy viewer state preserves canonical self-exclusion while signed access does not send an override", async () => {
  const sessionId = "019fbcf3-19d4-7062-988d-f4e7a65e3e86";
  const legacy = createRefreshStateHarness([
    stateResponse({ updatedAtMs: 1, sessions: [], diagnostics: [] }),
  ], { excludedSessionId: sessionId });
  await legacy.refreshState();
  assert.equal(
    legacy.calls[0][1].headers["x-codex-agent-view-exclude-session"],
    sessionId,
  );

  const signed = createRefreshStateHarness([
    stateResponse({ updatedAtMs: 1, sessions: [], diagnostics: [] }),
  ], { accessToken: signedCredential("access"), excludedSessionId: sessionId });
  await signed.refreshState();
  assert.equal(
    Object.hasOwn(signed.calls[0][1].headers, "x-codex-agent-view-exclude-session"),
    false,
  );
});

test("renders optional assigned-work summaries without guessing when details are unavailable", () => {
  assert.match(app, /agentProfile: "Role\/profile · \{profile\}"/);
  assert.match(app, /agentAssignment: "Assigned work"/);
  assert.match(app, /agentCurrentActivity: "Current activity"/);
  assert.match(app, /agentAssignment: "할당된 작업"/);
  assert.match(app, /agentCurrentActivity: "현재 작업"/);
  assert.match(app, /agentAssignment: "Trabajo asignado"/);
  assert.match(app, /agentCurrentActivity: "Actividad actual"/);
  assert.match(app, /agentWorkEnded: "Agent work ended"/);
  assert.match(app, /agentWorkEnded: "에이전트 작업 종료 확인됨"/);
  assert.match(app, /agentWorkEnded: "Fin del trabajo del agente confirmado"/);
  assert.match(app, /agentLastActivityCompletionUnconfirmed: "Agent work ended, but completion of its last activity was not confirmed\."/);
  assert.doesNotMatch(app, /Assigned task completed|할당된 작업 완료|Tarea asignada completada/);
  assert.match(app, /agentAssignmentUnavailable: "No assignment detail was observed for this agent\."/);
  assert.match(app, /agentAssignmentUnavailable: "이 에이전트의 할당 작업 설명을 확인하지 못했습니다\."/);
  assert.match(app, /agentAssignmentUnavailable: "No se observó información sobre el trabajo asignado de este agente\."/);
  assert.match(app, /agentCurrentActivityUnavailable: "Current activity details are not available yet\."/);
  assert.match(app, /profileNote\.className = "agent-profile-note"/);
  assert.match(app, /assignmentSummary: safeSummary\(agent\.assignment_summary\)/);
  assert.match(app, /currentToolName: safeSummary\(agent\.current_tool_name\)/);
  assert.match(app, /currentToolStatus: normalizeCoreStatus\(agent\.current_tool_status\)/);
  assert.match(app, /currentToolObservedAtMs: safeTimestamp\(agent\.current_tool_observed_at_ms\)/);
  assert.match(app, /workSummary\.className = "agent-work-summary"/);
  assert.match(app, /agent\.assignmentSummary \|\| t\("agentAssignmentUnavailable"\)/);
  assert.match(app, /\[t\("agentCurrentActivity"\), formatAgentCurrentActivity\(agent\)\]/);
  assert.match(app, /description\.textContent = value/);
  assert.match(app, /technicalRows\.push\(\[t\("rawProfile"\), agent\.agentType\]\)/);
  assert.doesNotMatch(app, /current_activity_summary|taskDescription|assignmentDescription|agent\.prompt/i);
  assert.match(styles, /\.agent-work-summary\s*\{/);
  assert.doesNotMatch(app, /createElement\("details"\)|createElement\("summary"\)/);

  const safeSummary = loadSafeSummaryHelper();
  assert.equal(safeSummary("  테마\n\t조회 쿼리 수정 중  "), "테마 조회 쿼리 수정 중");
  assert.equal(safeSummary(null), "");
  assert.equal(safeSummary("x".repeat(300)).length, 240);

  const sessionMatchesQuery = loadQueryFilterHelper();
  const searchableSession = {
    sessionId: "session",
    workspaceLabel: "workspace",
    taskSummary: "parent request",
    status: "running",
    agents: [{
      agentId: "agent",
      agentType: "worker",
      assignmentSummary: "테마 가져오기 쿼리 수정",
      status: "running",
    }],
    recentActivities: [],
  };
  assert.equal(sessionMatchesQuery(searchableSession, "테마 가져오기"), true);
  assert.equal(sessionMatchesQuery(searchableSession, "unrelated"), false);

  const formatCurrentActivity = loadAgentCurrentActivityFormatter();
  assert.equal(formatCurrentActivity({ status: "completed" }), "agent work ended");
  assert.equal(
    formatCurrentActivity({ status: "completed", currentToolStatus: "completion_not_observed" }),
    "last activity unconfirmed",
  );
  assert.equal(
    formatCurrentActivity({ status: "completed", currentToolStatus: "interrupted" }),
    "last activity unconfirmed",
  );
  assert.equal(
    formatCurrentActivity({
      status: "running",
      currentToolName: "apply_patch",
      currentToolStatus: "running",
      currentToolObservedAtMs: 42,
    }),
    "tool:apply_patch running at time:42",
  );
  assert.equal(
    formatCurrentActivity({
      status: "running",
      currentToolName: "exec_command",
      currentToolStatus: "completed",
      currentToolObservedAtMs: null,
    }),
    "recent tool:exec_command completed",
  );
  assert.equal(
    formatCurrentActivity({ status: "completion_not_observed" }),
    "completion unconfirmed",
  );
  assert.equal(formatCurrentActivity({ status: "waiting" }), "waiting");
  assert.equal(formatCurrentActivity({ status: "running" }), "unavailable");
});

test("keeps two-second polling and preserves the last good state across transient failures", async () => {
  assert.match(app, /const POLL_INTERVAL_MS = 2_000;/);
  assert.match(app, /async function initializeLiveView\(\)[\s\S]*?window\.setInterval\(refreshState, POLL_INTERVAL_MS\)/);
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
  assert.match(app, /reportedStatus !== "unknown"[\s\S]*?return reportedStatus/);
  assert.match(app, /session\.permission\?\.status === "waiting_for_user"[\s\S]*?return "waiting"/);
  assert.match(app, /agents\.some\(\(agent\) => agent\.status === "running"\)[\s\S]*?return "running"/);
  assert.doesNotMatch(app, /agents\.every\(/);
});

test("renders unconfirmed and interrupted lifecycle states honestly in every locale", () => {
  assert.match(app, /"completion_not_observed"/);
  assert.match(app, /"stale"/);
  assert.match(app, /"interrupted"/);
  assert.match(app, /statusCompletionNotObserved: "End not confirmed"/);
  assert.match(app, /statusCompletionNotObserved: "종료 확인 안 됨"/);
  assert.match(app, /statusCompletionNotObserved: "Fin no confirmado"/);
  assert.match(app, /completionNotObservedExplanation: "No end signal was received for this item/);
  assert.match(app, /completionNotObservedExplanation: "이 항목의 종료 신호를 받지 못해/);
  assert.match(app, /completionNotObservedExplanation: "No se recibió una señal de fin para este elemento/);
  assert.doesNotMatch(app, /completionNotObservedExplanation: "(?:No recent activity|최근 활동이 없지만|No se observó actividad reciente)/);
  assert.match(app, /interruptedExplanation: "This activity was still open when the work ended/);
  assert.match(app, /function createStatusExplanation\(status\)/);
  assert.match(app, /explanation\.className = "status-explanation"/);
  assert.match(html, /<option value="completion_not_observed"[^>]*>End not confirmed<\/option>/);
  assert.match(styles, /\.session-card\[data-status="completion_not_observed"\]/);
  assert.match(styles, /\.status-badge\[data-status="interrupted"\]/);
  assert.match(styles, /\.status-explanation/);

  const { normalizeCoreStatus, deriveSessionStatus } = loadStatusHelpers();
  for (const status of ["completion_not_observed", "stale", "interrupted"]) {
    assert.equal(normalizeCoreStatus(status), status);
  }
  assert.equal(
    deriveSessionStatus(
      { status: "completion_not_observed", permission: { status: "waiting_for_user" } },
      [{ status: "running" }],
      [{ status: "running" }],
    ),
    "completion_not_observed",
  );

  const sessionMatchesStatus = loadStatusFilterHelper();
  const activityInterrupted = {
    status: "completed",
    agents: [{ status: "completed" }],
    recentActivities: [{ status: "interrupted" }],
  };
  assert.equal(sessionMatchesStatus(activityInterrupted, "interrupted"), true);
  assert.equal(sessionMatchesStatus(activityInterrupted, "running"), false);
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
