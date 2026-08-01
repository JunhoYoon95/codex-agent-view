import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const skillUrl = new URL("../skills/codex-agent-view/SKILL.md", import.meta.url);
const manifestUrl = new URL("../.codex-plugin/plugin.json", import.meta.url);
const packageUrl = new URL("../package.json", import.meta.url);

function snapshotDetail(readThreadResult, limit = 8) {
  const turns = Array.isArray(readThreadResult.turns) ? readThreadResult.turns : [];
  let latestCommentary = null;

  for (const turn of turns) {
    const items = Array.isArray(turn.items) ? turn.items : [];
    for (let index = items.length - 1; index >= 0; index -= 1) {
      const item = items[index];
      if (item?.type === "agentMessage" && item.phase === "commentary") {
        latestCommentary = item.text;
        break;
      }
    }
    if (latestCommentary !== null) break;
  }

  const activities = [];
  const observedPaths = new Set();
  let unidentified = 0;
  for (const turn of turns) {
    const items = Array.isArray(turn.items) ? turn.items : [];
    for (let index = items.length - 1; index >= 0; index -= 1) {
      const item = items[index];
      if (item?.type !== "subAgentActivity") continue;
      if (activities.length >= limit) break;

      const agentPath =
        typeof item.agentPath === "string" && item.agentPath.length > 0
          ? item.agentPath
          : null;
      if (agentPath !== null) {
        if (observedPaths.has(agentPath)) continue;
        observedPaths.add(agentPath);
        activities.push({ agentPath, kind: item.kind ?? "unknown" });
        continue;
      }

      unidentified += 1;
      activities.push({
        agentPath: `unidentified agent #${unidentified}`,
        kind: item.kind ?? "unknown",
      });
    }
    if (activities.length >= limit) break;
  }

  return { activities, latestCommentary };
}

const CURRENT_TASK_STATUSES = new Set([
  "running",
  "active",
  "waiting",
  "needs-attention",
]);

function selectVisibleCodexTasks(tasks, limit = 8) {
  const current = [];
  const awaitingReview = [];

  for (const task of tasks) {
    if (CURRENT_TASK_STATUSES.has(task.status)) {
      current.push({ ...task, displayGroup: "current-work" });
      continue;
    }
    if (task.status === "idle" && task.hasUnreadTurn === true) {
      awaitingReview.push({ ...task, displayGroup: "완료/확인 대기" });
    }
  }

  return [...current, ...awaitingReview].slice(0, limit);
}

test("skill uses app task tools before the CLI and keeps sensitive content out of snapshots", async () => {
  const [skill, manifestText, packageText] = await Promise.all([
    readFile(skillUrl, "utf8"),
    readFile(manifestUrl, "utf8"),
    readFile(packageUrl, "utf8"),
  ]);
  const manifest = JSON.parse(manifestText);
  const packageMetadata = JSON.parse(packageText);

  const listIndex = skill.indexOf("codex_app__list_threads");
  const readIndex = skill.indexOf("codex_app__read_thread");
  const cliIndex = skill.indexOf("codex-agent-view status --json");

  assert(listIndex >= 0);
  assert(readIndex > listIndex);
  assert(cliIndex > readIndex);
  assert.match(skill, /Do not use `codex_app__wait_threads`/);
  assert.match(skill, /explicit `running`, `active`, `waiting`, and `needs-attention` statuses/);
  assert.match(skill, /explicit status is `idle` when\n\s+`hasUnreadTurn` is exactly `true`/);
  assert.match(skill, /Exclude an `idle` task when `hasUnreadTurn` is `false` or absent/);
  assert.match(skill, /Keep at most eight tasks across both groups/);
  assert.match(skill, /explicit `hasUnreadTurn` boolean in a separate unread column/);
  assert.match(skill, /Never rewrite the status as\n`completed`/);
  assert.match(skill, /`includeOutputs: false`/);
  assert.match(skill, /`maxOutputCharsPerItem: 600`/);
  assert.match(skill, /workspace directory basename/);
  assert.match(skill, /`subAgentActivity` entry's `agentPath` and `kind`/);
  assert.match(skill, /`turns` in `newest_first` order/);
  assert.match(skill, /select the last\n\s+`agentMessage` whose `phase` is `commentary`/);
  assert.match(skill, /first observation for each\n\s+non-empty `agentPath`/);
  assert.match(skill, /Do not coalesce entries that have no `agentPath` into an `unknown` agent/);
  assert.match(skill, /Stop\n\s+after eight displayed activities/);
  assert.match(skill, /Do not display or paraphrase previews, user prompts, transcripts, tool inputs,/);
  assert.match(skill, /tool outputs, command output, tokens, credentials/);
  assert.match(skill, /Only when the user explicitly asks to open, show, or start the live view/);
  assert.match(skill, /agent-internal diagnostic path, not a normal user workflow/);
  assert.match(skill, /Never tell the user to open a terminal, type a CLI command/);
  assert.match(skill, /user's entire interaction after installation remains inside the official\nCodex app/);
  assert.match(skill, /do not turn the commands below into instructions for the user/);
  assert.match(skill, /first trusted hook normally prepares the local backend internally/);
  assert.match(skill, /never registers a task\nID or runs `start`, `status`, or `doctor`/);
  assert.match(skill, /cannot create a sidebar, panel, or Browser tab\nwithout a prompt at app startup/);
  assert.match(skill, /first live view therefore requires one\nexplicit request in a Codex app task/);
  assert.match(skill, /already-open in-app live tab refreshes and reconnects/);
  assert.match(skill, /same monitor observation window and its\nsession token remain valid/);
  assert.match(skill, /Do not claim that installation alone\nopens a screen/);
  assert.match(skill, /Codex in-app Browser capability/);
  assert.match(skill, /Do not use Chrome,\n\s+Safari/);
  assert.match(skill, /Do not ask the user to\nstop an auto-started or foreground monitor first/);
  assert.match(skill, /validated runtime bearer token to authenticate and internally shut down a\nhealthy owned monitor/);
  assert.match(skill, /default command\npreserves remaining runtime-directory data/);
  assert.match(skill, /`--purge` additionally removes\nonly an owned stale runtime file and an empty runtime directory/);
  assert.match(skill, /preserves\nunrecognized files, unrelated loopback services, and non-empty directories/);
  assert.doesNotMatch(skill, /Ctrl\+C/);

  assert.equal(manifest.version, packageMetadata.version);
  assert.equal(manifest.interface.shortDescription, "View active Codex tasks.");
  assert.deepEqual(manifest.interface.defaultPrompt, [
    "Show the active Codex tasks and subagents in this app.",
    "Open the live Codex Agent View in the built-in Browser.",
  ]);
});

test("newest-first read_thread fixture selects latest commentary and deduplicates agents", () => {
  const readThreadFixture = {
    turns: [
      {
        id: "newest-turn",
        items: [
          { type: "agentMessage", phase: "commentary", text: "Earlier note in newest turn" },
          { type: "subAgentActivity", agentPath: "/root/reviewer", kind: "running" },
          { type: "subAgentActivity", kind: "waiting" },
          { type: "agentMessage", phase: "final", text: "Do not use as commentary" },
          { type: "subAgentActivity", agentPath: "/root/reviewer", kind: "completed" },
          { type: "agentMessage", phase: "commentary", text: "Latest safe commentary" },
        ],
      },
      {
        id: "older-turn",
        items: [
          { type: "agentMessage", phase: "commentary", text: "Older commentary" },
          { type: "subAgentActivity", agentPath: "/root/reviewer", kind: "starting" },
          { type: "subAgentActivity", agentPath: "/root/builder", kind: "running" },
          { type: "subAgentActivity", kind: "completed" },
        ],
      },
    ],
  };

  assert.deepEqual(snapshotDetail(readThreadFixture), {
    latestCommentary: "Latest safe commentary",
    activities: [
      { agentPath: "/root/reviewer", kind: "completed" },
      { agentPath: "unidentified agent #1", kind: "waiting" },
      { agentPath: "unidentified agent #2", kind: "completed" },
      { agentPath: "/root/builder", kind: "running" },
    ],
  });
});

test("subagent activity fixture applies the shared eight-entry bound", () => {
  const readThreadFixture = {
    turns: [
      {
        items: Array.from({ length: 10 }, (_, index) => ({
          type: "subAgentActivity",
          agentPath: `/root/agent-${index}`,
          kind: "running",
        })),
      },
    ],
  };

  const detail = snapshotDetail(readThreadFixture);
  assert.equal(detail.activities.length, 8);
  assert.deepEqual(
    detail.activities.map((activity) => activity.agentPath),
    [
      "/root/agent-9",
      "/root/agent-8",
      "/root/agent-7",
      "/root/agent-6",
      "/root/agent-5",
      "/root/agent-4",
      "/root/agent-3",
      "/root/agent-2",
    ],
  );
});

test("thread-list fixture retains unread idle tasks without rewriting explicit status", () => {
  const listThreadsFixture = [
    { title: "Running", status: "running", hasUnreadTurn: false },
    { title: "Needs attention", status: "needs-attention", hasUnreadTurn: true },
    { title: "Unread idle", status: "idle", hasUnreadTurn: true },
    { title: "Read idle", status: "idle", hasUnreadTurn: false },
    { title: "Idle without unread field", status: "idle" },
  ];

  assert.deepEqual(selectVisibleCodexTasks(listThreadsFixture), [
    {
      title: "Running",
      status: "running",
      hasUnreadTurn: false,
      displayGroup: "current-work",
    },
    {
      title: "Needs attention",
      status: "needs-attention",
      hasUnreadTurn: true,
      displayGroup: "current-work",
    },
    {
      title: "Unread idle",
      status: "idle",
      hasUnreadTurn: true,
      displayGroup: "완료/확인 대기",
    },
  ]);
});

test("thread-list fixture applies one eight-task bound across current and unread idle groups", () => {
  const listThreadsFixture = [
    ...Array.from({ length: 7 }, (_, index) => ({
      title: `Current ${index}`,
      status: "active",
      hasUnreadTurn: false,
    })),
    ...Array.from({ length: 3 }, (_, index) => ({
      title: `Awaiting review ${index}`,
      status: "idle",
      hasUnreadTurn: true,
    })),
  ];

  const selected = selectVisibleCodexTasks(listThreadsFixture);
  assert.equal(selected.length, 8);
  assert.equal(selected.filter((task) => task.displayGroup === "current-work").length, 7);
  assert.equal(selected.filter((task) => task.displayGroup === "완료/확인 대기").length, 1);
  assert.equal(selected.at(-1).status, "idle");
  assert.equal(selected.at(-1).hasUnreadTurn, true);
});
