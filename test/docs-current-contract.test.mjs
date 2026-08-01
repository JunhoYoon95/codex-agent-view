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

test("records verified public 0.4.4 acceptance without stale candidate state", async () => {
  const [distribution, findings, submission] = await Promise.all([
    readProjectFile("docs/distribution.md"),
    readProjectFile("docs/phase-0-findings.md"),
    readProjectFile("docs/plugin-submission.md"),
  ]);

  for (const document of [distribution, findings, submission]) {
    assert.match(document, /public npm `latest`\/version.*`0\.4\.4`/i);
    assert.match(document, /482520d471b3ef04204f026b52237ac77407a99f/);
    assert.match(
      document,
      /sha512-q0j\/s5D6Hw0GV0x\/CIkHRdM7U9uONqb2gmMguesC7BzTG4znbj35XKXqjMl5dJSc9O\/GaYMj6lNCOqLdCiYdoA==/,
    );
    assert.match(document, /registry signature/);
    assert.match(document, /25 files/);
    assert.match(document, /byte-identical/);
    assert.match(document, /public exact reinstall/i);
    assert.match(document, /hook wiring 9종/);
    assert.match(document, /events(?:_received:)? true/);
    assert.match(document, /sessions 7개/);
    assert.match(document, /30717562576/);
    assert.match(document, /30717744653/);
    assert.match(document, /1bedf47d2185d2a14a3c96536e57aef0719b767a/);
    assert.match(
      document,
      /https:\/\/github\.com\/JunhoYoon95\/codex-agent-view\/releases\/tag\/v0\.4\.4/,
    );
    assert.doesNotMatch(
      document,
      /0\.4\.4.{0,100}(?:release candidate|acceptance pending|대기 중|미완료|아직 미확인)/is,
    );
    assert.doesNotMatch(
      document,
      /(?:release candidate|acceptance pending|대기 중|미완료|아직 미확인).{0,100}0\.4\.4/is,
    );
  }
});
