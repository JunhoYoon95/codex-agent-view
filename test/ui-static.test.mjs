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
  assert.match(html, /<form[\s\S]*?class="toolbar"[\s\S]*?role="search"[\s\S]*?aria-label="자동 수신된 task와 subagent 목록 필터"[\s\S]*?hidden/);
  assert.match(html, /<label\s+for="session-search">목록 필터 \(선택\)<\/label>/);
  assert.match(html, /placeholder="자동 수신된 task·agent 목록에서 찾기"/);
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
  assert.match(app, /viewState\.canRetry = false;[\s\S]*?이 탭에는 접근 token이 없습니다\./);
  assert.match(app, /setConnectionStatus\("error", "live view 인증 필요"\)/);
  assert.match(app, /Codex 앱에서 Codex Agent View에 live view 열기를 다시 요청하세요\./);
});

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

test("renders workspace labels as the primary identity and keeps session IDs secondary", () => {
  assert.match(app, /workspaceLabel:\s*safeString\(session\.workspace_label, ""\)/);
  assert.match(app, /eyebrow\.append\("PARENT TASK · "\)/);
  assert.match(app, /id\.textContent = session\.sessionId[\s\S]*?eyebrow\.append\(id\)/);
  assert.match(app, /title\.textContent = session\.workspaceLabel \|\| "프로젝트 정보 없음"/);
  assert.match(
    app,
    /const searchableValues = \[[\s\S]*?session\.sessionId,[\s\S]*?session\.workspaceLabel,/,
  );
});

test("explains an empty hook observation window without inferring Codex task state", () => {
  assert.match(app, /diagnostics:\s*value\.diagnostics\.map\(normalizeDiagnostic\)/);
  assert.match(app, /const diagnosticCounts = new Map\(\)/);
  assert.match(app, /이 관찰 창에서 수신된 hook event가 0건입니다\./);
  assert.match(app, /이 결과만으로 Codex에 실행 중인 task나 agent가 없다고 판단할 수 없습니다\./);
  assert.match(app, /표시되지 않을 때 확인 순서/);
  assert.match(app, /task ID를 입력하거나 task별로 등록할 필요가 없습니다\. Trusted hook event가 자동으로 이 목록에 추가됩니다\./);
  assert.match(app, /elements\.toolbar\.hidden = viewState\.sessions\.length === 0/);
  assert.match(app, /Plugin을 설치한 뒤 공식 Codex 앱을 완전히 재시작했는지 확인합니다\./);
  assert.match(app, /새 task에서 표시되는 Codex Agent View hook command를 검토하고 직접 trust합니다\./);
  assert.match(app, /Trust 이후 새 task를 시작해 subagent 작업을 실행합니다\. Hook event가 이 목록에 자동으로 추가됩니다\./);
  assert.match(app, /관찰 window는 첫 trusted hook에서 시작합니다\./);
  assert.match(app, /그 전에 이미 지나간 event와 로컬 상태 수집이 중단된 동안의 event는 재생되지 않으며, 수집이 다시 시작되면 새 관찰 window가 열립니다\./);
  assert.match(app, /수신된 hook 없음/);
  assert.doesNotMatch(app, /Codex에 실행 중인 (?:task|agent)가 없습니다/);
  assert.doesNotMatch(app, /monitor를 (?:실행|시작)|localhost|새 주소/);
  assert.match(styles, /\.state-empty-observation/);
  assert.match(styles, /\.toolbar\[hidden\][\s\S]*?display:\s*none/);
  assert.match(styles, /\.automatic-tracking/);
  assert.match(styles, /\.empty-guidance/);
  assert.match(styles, /\.diagnostic-details summary[\s\S]*?min-height:\s*2\.75rem/);
});
