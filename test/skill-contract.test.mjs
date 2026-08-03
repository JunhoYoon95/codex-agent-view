import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const skillsUrl = new URL("../skills/", import.meta.url);
const skillUrl = new URL("../skills/codex-agent-view/SKILL.md", import.meta.url);
const manifestUrl = new URL("../.codex-plugin/plugin.json", import.meta.url);

async function filesBelow(url, prefix = "") {
  const entries = await readdir(url, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = `${prefix}${entry.name}`;
    if (entry.isDirectory()) {
      files.push(...await filesBelow(new URL(`${entry.name}/`, url), `${relative}/`));
    } else {
      files.push(relative);
    }
  }
  return files.sort();
}

test("ships one direct plugin skill without a separate show-agents action", async () => {
  assert.deepEqual(await filesBelow(skillsUrl), ["codex-agent-view/SKILL.md"]);

  const skill = await readFile(skillUrl, "utf8");
  assert.match(skill, /^name: codex-agent-view$/m);
  assert.match(skill, /Use when the user invokes @codex-agent-view/);
  assert.match(skill, /No separate skill selection or \$ command is required/);
  assert.equal(skill.match(/codex-agent-view open/g)?.length, 1);
  assert.match(skill, /exactly once/);
  assert.match(skill, /Do not run any other CLI subcommand/);
  assert.match(skill, /Do not retry automatically/);
  assert.doesNotMatch(skill, /\$show-agents/);
  assert.doesNotMatch(skill, /codex_app__open_in_codex/);
  assert.doesNotMatch(skill, /prepare-live-view/);
});

test("promptless invocation routes through the one external-browser skill", async () => {
  const [skill, manifestText] = await Promise.all([
    readFile(skillUrl, "utf8"),
    readFile(manifestUrl, "utf8"),
  ]);
  const manifest = JSON.parse(manifestText);

  assert.equal(Object.hasOwn(manifest.interface, "defaultPrompt"), false);
  assert.match(manifest.interface.longDescription, /Invoke @codex-agent-view directly/);
  assert.doesNotMatch(manifest.interface.longDescription, /Quick start/i);
  assert.match(manifest.interface.longDescription, /no separate skill picker or \$ command is required/);
  assert.match(manifest.interface.longDescription, /Open each view with one lightweight @codex-agent-view invocation\./);
  assert.match(manifest.interface.longDescription, /Once open, live monitoring runs locally with no additional model calls\./);
  assert.match(manifest.interface.longDescription, /new invocation may be needed after the browser tab is closed or its credential expires/);
  assert.match(manifest.interface.longDescription, /Each invocation is a normal Codex turn/);
  assert.match(manifest.interface.longDescription, /tasks and subagents continue to use their normal tokens/);
  assert.match(manifest.interface.longDescription, /does not resend observed task data to a model/);
  assert.doesNotMatch(manifest.interface.longDescription, /no ongoing token usage/);
  assert.doesNotMatch(manifest.interface.longDescription, /zero[- ]token/i);
  assert.match(skill, /Run\n`codex-agent-view open` exactly once/);
  assert.match(skill, /Do not call an in-app Browser or open a Codex side panel/);
});

test("skill keeps private viewer material out of the conversation", async () => {
  const skill = await readFile(skillUrl, "utf8");
  for (const required of [
    "private browser",
    "grant",
    "runtime token",
    "viewer token",
    "task ID",
    "runtime record",
    "Do not ask the user to copy a localhost URL",
    "Only after exit code 0",
    "bounded error code",
    "safe same-tab reconnection controls",
    "Keep this workflow read-only",
  ]) {
    assert.match(skill, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
