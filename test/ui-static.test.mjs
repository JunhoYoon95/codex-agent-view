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
  assert.match(html, /<form\s+class="toolbar"\s+role="search"\s+aria-label=/);
  assert.match(html, /<label\s+for="session-search">검색<\/label>/);
  assert.match(html, /<label\s+for="status-filter">상태<\/label>/);
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
  assert.match(app, /agents\.some\(\(agent\) => agent\.status === "running"\)[\s\S]*?return "running"/);
  assert.match(app, /function deriveSessionStatus[\s\S]*?return "unknown";/);
  assert.doesNotMatch(app, /agents\.every\(/);
});
