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
  const [english, korean, findings, privacy] = await Promise.all([
    readProjectFile("README.md"),
    readProjectFile("README.ko.md"),
    readProjectFile("docs/phase-0-findings.md"),
    readProjectFile("docs/privacy.md"),
  ]);

  for (const document of [english, korean, findings]) {
    assert.match(document, /CODEX_THREAD_ID/);
    assert.match(document, /English/);
    assert.match(document, /Español|Spanish/);
    assert.match(document, /2초|two-second|every two seconds/);
    assert.match(document, /agent_id/);
    assert.match(document, /agent_type/);
  }

  assert.match(english, /short request summary derived from `UserPromptSubmit`/);
  assert.match(english, /bounds it to 180 characters/);
  assert.match(english, /does not invent an agent-specific assignment/);
  assert.match(english, /Session IDs are not shown/);
  assert.match(english, /button to check the current tab again/);
  assert.match(korean, /한 줄·최대 180자로 제한/);
  assert.match(korean, /에이전트별 할당 내용을 추측하지 않는다/);
  assert.match(korean, /Session ID는 표시하지/);
  assert.match(korean, /현재 tab의 인증을 다시 확인하는 버튼/);
  assert.match(findings, /전용 field가 실제 payload에서 관찰되기 전까지/);
  assert.match(findings, /첫 유효 작업 개요|`task_summary`/);
  assert.match(privacy, /first 4,096 characters/);
  assert.match(privacy, /limits the result to 180 Unicode characters/);
  assert.match(privacy, /not a guarantee that arbitrary sensitive text can never appear/);
  assert.match(privacy, /page cannot mint, discover, or replace/);
});

test("separates the 0.4.5 release candidate from historical public 0.4.4", async () => {
  const [packageText, manifestText, english, korean, distribution, submission] = await Promise.all([
    readProjectFile("package.json"),
    readProjectFile(".codex-plugin/plugin.json"),
    readProjectFile("README.md"),
    readProjectFile("README.ko.md"),
    readProjectFile("docs/distribution.md"),
    readProjectFile("docs/plugin-submission.md"),
  ]);
  const packageMetadata = JSON.parse(packageText);
  const manifest = JSON.parse(manifestText);

  assert.equal(packageMetadata.version, "0.4.5");
  assert.equal(manifest.version, "0.4.5");
  assert.match(english, /npm install --global codex-agent-view@0\.4\.5/);
  assert.match(korean, /npm install --global codex-agent-view@0\.4\.5/);
  assert.doesNotMatch(english, /release candidate|public npm `latest`[^\n]*0\.4\.4/i);
  assert.doesNotMatch(korean, /release candidate|public npm `latest`[^\n]*0\.4\.4/i);
  assert.match(distribution, /`0\.4\.5` release candidate/);
  assert.match(submission, /`0\.4\.5` release candidate/);
  for (const document of [distribution, submission]) {
    assert.match(document, /public npm `latest`(?:\/version)?(?:은|은 아직|는|는 아직| is still)?.*`0\.4\.4`/i);
    assert.doesNotMatch(document, /public npm `latest`(?:\/version)?.{0,40}(?:은|is) `0\.4\.5`/i);
  }
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
    assert.doesNotMatch(document, /`?0\.4\.4`? release candidate/i);
  }
});
