import assert from "node:assert/strict";
import test from "node:test";

import { normalizeHookPayload } from "../src/core/index.mjs";
import { deriveTaskSummary } from "../src/core/normalize-hook-payload.mjs";

const common = {
  session_id: "session-1",
  turn_id: "turn-1",
};

test("normalizes the supported hook events into a narrow safe contract", () => {
  const fixtures = [
    [
      {
        session_id: "session-1",
        hook_event_name: "SessionStart",
        source: "startup",
      },
      "session_started",
    ],
    [
      {
        session_id: "session-1",
        hook_event_name: "SessionEnd",
        reason: "other",
      },
      "session_ended",
    ],
    [{ ...common, hook_event_name: "UserPromptSubmit" }, "turn_started"],
    [{ ...common, hook_event_name: "Stop" }, "turn_stopped"],
    [
      {
        ...common,
        hook_event_name: "SubagentStart",
        agent_id: "agent-1",
        agent_type: "default",
      },
      "subagent_started",
    ],
    [
      {
        ...common,
        hook_event_name: "SubagentStop",
        agent_id: "agent-1",
        agent_type: "default",
      },
      "subagent_stopped",
    ],
    [
      {
        ...common,
        hook_event_name: "PreToolUse",
        tool_name: "Bash",
        tool_use_id: "tool-1",
      },
      "tool_started",
    ],
    [
      {
        ...common,
        hook_event_name: "PostToolUse",
        tool_name: "Bash",
        tool_use_id: "tool-1",
      },
      "tool_completed",
    ],
    [
      {
        ...common,
        hook_event_name: "PermissionRequest",
        tool_name: "Bash",
      },
      "permission_requested",
    ],
  ];

  for (const [payload, expectedType] of fixtures) {
    const result = normalizeHookPayload(payload, { receivedAtMs: 123 });
    assert.equal(result.status, "accepted");
    assert.equal(result.event.type, expectedType);
    assert.equal(result.event.source, "hook");
    assert.equal(result.event.received_at_ms, 123);
  }
});

test("does not copy sensitive or unknown payload fields", () => {
  const result = normalizeHookPayload(
    {
      ...common,
      hook_event_name: "PostToolUse",
      tool_name: "Bash",
      tool_use_id: "tool-1",
      prompt: "private prompt",
      tool_input: { command: "private command" },
      tool_response: "private output",
      cwd: "/private/workspace",
      transcript_path: "/private/transcript.jsonl",
      last_assistant_message: "private answer",
      future_field: "private future value",
    },
    { receivedAtMs: 123 },
  );

  assert.equal(result.status, "accepted");
  const serialized = JSON.stringify(result);
  for (const privateValue of [
    "private prompt",
    "private command",
    "private output",
    "/private/workspace",
    "/private/transcript.jsonl",
    "private answer",
    "private future value",
  ]) {
    assert(!serialized.includes(privateValue));
  }
});

test("allowlists only verified SessionStart source values", () => {
  for (const source of ["startup", "resume", "clear", "compact"]) {
    const result = normalizeHookPayload(
      {
        session_id: "session-1",
        hook_event_name: "SessionStart",
        source,
      },
      { receivedAtMs: 123 },
    );
    assert.equal(result.status, "accepted");
    assert.equal(result.event.session_start_source, source);
  }

  for (const source of [
    "private-future-source",
    "Resume",
    "resume\nprivate",
    42,
    {},
    null,
  ]) {
    const result = normalizeHookPayload(
      {
        session_id: "session-1",
        hook_event_name: "SessionStart",
        source,
      },
      { receivedAtMs: 124 },
    );
    assert.equal(result.status, "accepted");
    assert(!("session_start_source" in result.event));
    assert(!JSON.stringify(result).includes("private-future-source"));
  }
});

test("accepts a bounded workspace label without retaining cwd", () => {
  const result = normalizeHookPayload(
    {
      ...common,
      hook_event_name: "UserPromptSubmit",
      workspace_label: "  acme-project  ",
      cwd: "/private/customer/acme-project",
    },
    { receivedAtMs: 123 },
  );

  assert.equal(result.status, "accepted");
  assert.equal(result.event.workspace_label, "acme-project");
  assert(!JSON.stringify(result).includes("/private/customer/acme-project"));
});

test("derives a bounded one-line task summary while redacting private values", () => {
  const rawPrompt = [
    "결제 화면 오류를 재현하고 원인을 고쳐 주세요.",
    "참고: https://example.com/private?id=42",
    "내부 링크: custom-scheme://private.example/resource",
    "담당자: person@example.com",
    "파일: /Users/private/customer/app/page.tsx",
    "윈도우 파일: C:\\Users\\private\\secrets.txt",
    "공유 파일: \\\\server\\private\\secrets.txt",
    "token=super-secret-token-value",
    "OPENAI_API_KEY=super-secret-api-key",
    "AKIAIOSFODNN7EXAMPLE",
    "sk_live_1234567890abcdef",
    "Bearer eyJprivate.header.signature",
    "-----BEGIN PRIVATE KEY-----\nprivate-key-material\n-----END PRIVATE KEY-----",
    "추가 조건 ".repeat(80),
  ].join("\n");

  const summary = deriveTaskSummary(rawPrompt);
  assert.equal(typeof summary, "string");
  assert(summary.startsWith("결제 화면 오류를 재현하고 원인을 고쳐 주세요."));
  assert(Array.from(summary).length <= 180);
  assert(!/[\r\n\u0000-\u001f]/u.test(summary));
  for (const privateValue of [
    "https://example.com/private?id=42",
    "custom-scheme://private.example/resource",
    "person@example.com",
    "/Users/private/customer/app/page.tsx",
    "C:\\Users\\private\\secrets.txt",
    "\\\\server\\private\\secrets.txt",
    "super-secret-token-value",
    "super-secret-api-key",
    "AKIAIOSFODNN7EXAMPLE",
    "sk_live_1234567890abcdef",
    "eyJprivate.header.signature",
    "private-key-material",
  ]) {
    assert(!summary.includes(privateValue));
  }
  for (const placeholder of ["[link]", "[email]", "[path]", "[credential]"]) {
    assert(summary.includes(placeholder));
  }
  assert(summary.endsWith("…"));
});

test("excludes a leading ambient browser context and its request delimiter", () => {
  const ambientContext = [
    '<in-app-browser-context source="ambient-ui-state">',
    "This block is automatically supplied ambient UI state, not part of the user's request.",
    "# In app browser:",
    "- Current URL: https://private.example/customer/42",
    "</in-app-browser-context>",
  ].join("\n");

  assert.equal(
    deriveTaskSummary(
      ` \n${ambientContext}\n\n## My request for Codex:\n완료`,
    ),
    "완료",
  );
});

test("reserves only a closed leading exact ambient browser wrapper", () => {
  const unclosed = '<in-app-browser-context source="ambient-ui-state">';
  assert.equal(
    deriveTaskSummary(
      `\n${unclosed}\nprivate.person@example.com token=private-value\n노출하지 마세요`,
    ),
    null,
  );
  assert.equal(
    deriveTaskSummary(
      `${unclosed}${"ambient".repeat(700)}</in-app-browser-context>\n노출하지 마세요`,
    ),
    null,
  );

  const middleWrapper =
    `첫 요청 ${unclosed}사용자 내용</in-app-browser-context> 두 번째 요청`;
  assert.equal(deriveTaskSummary(middleWrapper), middleWrapper);
  const genericMarkup =
    '<context source="ambient-ui-state"><strong>중요</strong></context> 실제 요청';
  assert.equal(deriveTaskSummary(genericMarkup), genericMarkup);
  const differentWrapper =
    '<in-app-browser-context source="user-authored">내용</in-app-browser-context> 요청';
  assert.equal(deriveTaskSummary(differentWrapper), differentWrapper);

  const ordinaryHeading = "## My request for Codex:\n사용자가 쓴 heading";
  assert.equal(
    deriveTaskSummary(ordinaryHeading),
    "## My request for Codex: 사용자가 쓴 heading",
  );
});

test("derives task summaries only for UserPromptSubmit and never copies raw prompt fields", () => {
  const rawPrompt = `관리자 화면을 정리해 주세요 ${"private detail ".repeat(40)}`;
  const started = normalizeHookPayload(
    { ...common, hook_event_name: "UserPromptSubmit", prompt: rawPrompt },
    { receivedAtMs: 125 },
  );

  assert.equal(started.status, "accepted");
  assert.match(started.event.task_summary, /^관리자 화면을 정리해 주세요/);
  assert(!("prompt" in started.event));
  assert(!JSON.stringify(started).includes(rawPrompt));

  const unrelated = normalizeHookPayload(
    {
      ...common,
      hook_event_name: "PostToolUse",
      tool_name: "Bash",
      tool_use_id: "tool-1",
      prompt: rawPrompt,
      task_summary: rawPrompt,
    },
    { receivedAtMs: 126 },
  );
  assert.equal(unrelated.status, "accepted");
  assert(!("task_summary" in unrelated.event));
  assert(!JSON.stringify(unrelated).includes(rawPrompt));
});

test("derives a safe assignment summary only from the observed spawn tool input", () => {
  const rawMessage = [
    "결제 테마 쿼리 수정과 관련 테스트를 맡아 주세요.",
    "담당자 person@example.com",
    "파일 /Users/private/customer/theme.ts",
    "token=private-spawn-token",
    "추가 조건 ".repeat(80),
  ].join("\n");
  const result = normalizeHookPayload(
    {
      ...common,
      hook_event_name: "PreToolUse",
      tool_name: "collaborationspawn_agent",
      tool_use_id: "spawn-1",
      tool_input: {
        task_name: "theme_query",
        message: rawMessage,
        fork_turns: "all",
      },
      tool_response: "private spawn response",
    },
    { receivedAtMs: 128 },
  );

  assert.equal(result.status, "accepted");
  assert.equal(result.event.spawn_assignment_observed, true);
  assert.match(result.event.assignment_summary, /^결제 테마 쿼리 수정/);
  assert(Array.from(result.event.assignment_summary).length <= 180);
  const serialized = JSON.stringify(result);
  for (const privateValue of [
    rawMessage,
    "person@example.com",
    "/Users/private/customer/theme.ts",
    "private-spawn-token",
    "private spawn response",
    '"tool_input"',
    '"tool_response"',
  ]) {
    assert(!serialized.includes(privateValue));
  }
});

test("does not infer assignments from unobserved spawn aliases or incomplete input", () => {
  const base = {
    ...common,
    hook_event_name: "PreToolUse",
    tool_use_id: "spawn-1",
    tool_input: {
      task_name: "worker",
      message: "테마 수정 작업",
    },
  };
  for (const payload of [
    { ...base, tool_name: "Agent" },
    { ...base, tool_name: "spawn_agent" },
    {
      ...base,
      tool_name: "collaborationspawn_agent",
      tool_input: { message: "테마 수정 작업" },
    },
    {
      ...base,
      tool_name: "collaborationspawn_agent",
      tool_input: { task_name: "worker" },
    },
    {
      ...base,
      hook_event_name: "PostToolUse",
      tool_name: "collaborationspawn_agent",
    },
  ]) {
    const result = normalizeHookPayload(payload, { receivedAtMs: 129 });
    assert.equal(result.status, "accepted");
    assert(!("assignment_summary" in result.event));
    assert.equal(
      "spawn_assignment_observed" in result.event,
      payload.tool_name === "collaborationspawn_agent" &&
        payload.hook_event_name === "PreToolUse",
    );
  }
});

test("re-sanitizes sender-derived assignment metadata before accepting it", () => {
  const result = normalizeHookPayload(
    {
      ...common,
      hook_event_name: "PreToolUse",
      tool_name: "collaborationspawn_agent",
      tool_use_id: "spawn-minimized",
      tool_input: { redacted: true, type: "object", keys: ["message", "task_name"] },
      spawn_assignment_observed: true,
      assignment_summary: [
        "테마 수정 작업",
        "person@example.com /Users/private/customer/theme.ts",
        "token=malicious-top-level-token",
        "추가 내용 ".repeat(80),
      ].join("\n"),
    },
    { receivedAtMs: 130 },
  );

  assert.equal(result.status, "accepted");
  assert.equal(result.event.spawn_assignment_observed, true);
  assert.match(result.event.assignment_summary, /^테마 수정 작업/);
  assert(Array.from(result.event.assignment_summary).length <= 180);
  const serialized = JSON.stringify(result);
  for (const privateValue of [
    "person@example.com",
    "/Users/private/customer/theme.ts",
    "malicious-top-level-token",
    '"tool_input"',
  ]) {
    assert(!serialized.includes(privateValue));
  }
});

test("uses a humanized task name when the spawn message is opaque", () => {
  const opaqueMessage = `gAAAAAB${"A".repeat(172)}`;
  const result = normalizeHookPayload(
    {
      ...common,
      hook_event_name: "PreToolUse",
      tool_name: "collaborationspawn_agent",
      tool_use_id: "spawn-opaque",
      tool_input: {
        task_name: "assignment_e2e",
        message: opaqueMessage,
      },
    },
    { receivedAtMs: 131 },
  );

  assert.equal(result.status, "accepted");
  assert.equal(result.event.assignment_summary, "assignment e2e");
  assert(!JSON.stringify(result).includes(opaqueMessage));
});

test("prefers a readable spawn message over its task name fallback", () => {
  const result = normalizeHookPayload(
    {
      ...common,
      hook_event_name: "PreToolUse",
      tool_name: "collaborationspawn_agent",
      tool_use_id: "spawn-readable",
      tool_input: {
        task_name: "assignment_e2e",
        message: "결제 테마 조회 쿼리를 수정하고 관련 테스트를 실행합니다.",
      },
    },
    { receivedAtMs: 132 },
  );

  assert.equal(
    result.event.assignment_summary,
    "결제 테마 조회 쿼리를 수정하고 관련 테스트를 실행합니다.",
  );
});

test("does not use a private or opaque task name as an assignment fallback", () => {
  const opaqueMessage = `gAAAAAB${"B".repeat(172)}`;
  for (const taskName of [
    "/Users/private/customer/assignment",
    "token=private-task-token",
    `a${"B".repeat(90)}`,
    "sk-privatecredentialvalue123456789",
  ]) {
    const result = normalizeHookPayload(
      {
        ...common,
        hook_event_name: "PreToolUse",
        tool_name: "collaborationspawn_agent",
        tool_use_id: `spawn-${taskName.length}`,
        tool_input: { task_name: taskName, message: opaqueMessage },
      },
      { receivedAtMs: 133 },
    );
    assert.equal(result.status, "accepted");
    assert.equal(result.event.spawn_assignment_observed, true);
    assert(!("assignment_summary" in result.event));
    const serialized = JSON.stringify(result);
    assert(!serialized.includes(opaqueMessage));
    assert(!serialized.includes(taskName));
  }
});

test("omits empty or fully private task summaries", () => {
  for (const prompt of [
    null,
    {},
    "\n\u0000\t",
    "https://example.com/private",
    "person@example.com /Users/private/file.txt token=private-value",
  ]) {
    assert.equal(deriveTaskSummary(prompt), null);
    const result = normalizeHookPayload(
      { ...common, hook_event_name: "UserPromptSubmit", prompt },
      { receivedAtMs: 127 },
    );
    assert.equal(result.status, "accepted");
    assert(!("task_summary" in result.event));
  }
});

test("omits malformed optional workspace labels without dropping lifecycle events", () => {
  for (const workspaceLabel of [
    null,
    {},
    "",
    "bad\nlabel",
    "x".repeat(121),
  ]) {
    const result = normalizeHookPayload(
      {
        ...common,
        hook_event_name: "UserPromptSubmit",
        workspace_label: workspaceLabel,
      },
      { receivedAtMs: 124 },
    );
    assert.equal(result.status, "accepted");
    assert(!("workspace_label" in result.event));
  }
});

test("returns diagnostics for malformed, missing, and invalid fields", () => {
  for (const payload of [null, [], "not-an-object"]) {
    const result = normalizeHookPayload(payload, { receivedAtMs: 10 });
    assert.equal(result.status, "ignored");
    assert.equal(result.diagnostic.code, "malformed_payload");
  }

  const missing = normalizeHookPayload(
    { hook_event_name: "SubagentStart" },
    { receivedAtMs: 11 },
  );
  assert.deepEqual(missing, {
    status: "ignored",
    diagnostic: {
      code: "missing_required_field",
      diagnosed_at_ms: 11,
      field: "session_id",
    },
  });

  const invalid = normalizeHookPayload(
    {
      ...common,
      hook_event_name: "PreToolUse",
      tool_name: "",
      tool_use_id: "tool-1",
    },
    { receivedAtMs: 12 },
  );
  assert.equal(invalid.status, "ignored");
  assert.equal(invalid.diagnostic.code, "invalid_field");
  assert.equal(invalid.diagnostic.field, "tool_name");
});

test("ignores unknown events without echoing the unknown value", () => {
  const result = normalizeHookPayload(
    {
      ...common,
      hook_event_name: "PrivateFutureEvent",
      prompt: "do not echo",
    },
    { receivedAtMs: 20 },
  );

  assert.deepEqual(result, {
    status: "ignored",
    diagnostic: {
      code: "unsupported_hook_event",
      diagnosed_at_ms: 20,
      field: "hook_event_name",
    },
  });
  assert(!JSON.stringify(result).includes("PrivateFutureEvent"));
  assert(!JSON.stringify(result).includes("do not echo"));
});

test("rejects an invalid normalization timestamp", () => {
  assert.throws(
    () => normalizeHookPayload({}, { receivedAtMs: -1 }),
    /receivedAtMs must be a non-negative safe integer/,
  );
});
