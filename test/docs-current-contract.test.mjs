import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function readProjectFile(path) {
  return readFile(resolve(projectRoot, path), "utf8");
}

test("documents explicit skill selection instead of claiming starter text dispatch", async () => {
  const [english, korean, findings] = await Promise.all([
    readProjectFile("README.md"),
    readProjectFile("README.ko.md"),
    readProjectFile("docs/phase-0-findings.md"),
  ]);

  assert.match(english, /Quick start is not a skill invocation/);
  assert.match(english, /defines no plugin-card starter prompt/);
  assert.match(korean, /지금 사용해보기는 skill 호출이 아니다/);
  assert.match(findings, /interface\.defaultPrompt.*starter text/);

  const obsoleteClaims = [
    "Its `$show-agents` starter explicitly invokes",
    "Starter `$show-agents`가 bundled **Show Agents** skill을 명시 호출",
  ];
  for (const claim of obsoleteClaims) {
    assert.equal(english.includes(claim), false);
    assert.equal(korean.includes(claim), false);
    assert.equal(findings.includes(claim), false);
  }
});

test("documents the current live-view UX and evidence boundary", async () => {
  const [english, korean, findings] = await Promise.all([
    readProjectFile("README.md"),
    readProjectFile("README.ko.md"),
    readProjectFile("docs/phase-0-findings.md"),
  ]);

  for (const document of [english, korean, findings]) {
    assert.match(document, /CODEX_THREAD_ID/);
    assert.match(document, /English/);
    assert.match(document, /Español|Spanish/);
    assert.match(document, /2초|two-second|every two seconds/);
    assert.match(document, /agent_id/);
    assert.match(document, /agent_type/);
  }

  assert.match(english, /does not display or infer an agent's assigned task/);
  assert.match(korean, /agent 할당 작업을 추론하거나 표시하지 않는다/);
  assert.match(findings, /전용 field가 실제 payload에서 관찰되기 전까지/);
});

test("keeps README local links resolvable and the root guide free of Korean copy", async () => {
  const english = await readProjectFile("README.md");
  assert.doesNotMatch(english, /[가-힣]/);

  const markdownLinkPattern = /\[[^\]]+\]\(([^)]+)\)/g;
  const documents = ["README.md", "README.ko.md", "docs/phase-0-findings.md"];
  for (const documentPath of documents) {
    const content = await readProjectFile(documentPath);
    for (const match of content.matchAll(markdownLinkPattern)) {
      const target = match[1].split("#", 1)[0];
      if (!target || /^[a-z]+:/i.test(target)) continue;
      await access(resolve(projectRoot, dirname(documentPath), target));
    }
  }
});

test("separates verified 0.4.4 local prepublish E2E from pending public release acceptance", async () => {
  const [distribution, findings, submission] = await Promise.all([
    readProjectFile("docs/distribution.md"),
    readProjectFile("docs/phase-0-findings.md"),
    readProjectFile("docs/plugin-submission.md"),
  ]);

  for (const document of [distribution, findings, submission]) {
    assert.match(document, /(?:Exact local|Local prepublish).*`0\.4\.4` tarball/i);
    assert.match(document, /hook wiring 9종/);
    assert.match(document, /events_received: true/);
    assert.match(document, /sessions 7개/);
    assert.match(document, /raw sessions 7개 중 6개|Raw sessions 7개 중.*6개/);
    assert.match(document, /Español/);
    assert.match(document, /details.*summary|<details>.*<summary>/s);
    assert.match(document, /console warn(?:ing)?\/error.*0개/);
  }

  assert.match(distribution, /public npm publish/);
  assert.match(distribution, /`v0\.4\.4` tag와 GitHub Release는 미완료/);
  assert.match(findings, /public release acceptance는 구분/);
  assert.match(submission, /public exact install.*대기 중/s);
});
