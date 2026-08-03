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

test("Quick start asks the one skill to open the default external browser", async () => {
  const [skill, manifestText] = await Promise.all([
    readFile(skillUrl, "utf8"),
    readFile(manifestUrl, "utf8"),
  ]);
  const manifest = JSON.parse(manifestText);

  assert.equal(
    manifest.interface.defaultPrompt,
    "Open the Codex Agent View live monitor in my default browser.",
  );
  assert.match(manifest.interface.longDescription, /Invoke @codex-agent-view or choose Quick start/);
  assert.match(manifest.interface.longDescription, /no separate skill picker or \$ command is required/);
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
