import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function readProjectFile(path) {
  return readFile(resolve(projectRoot, path), "utf8");
}

test("documents the 0.5.3 install and one-invocation default-browser workflow", async () => {
  const [packageText, manifestText, english, korean] = await Promise.all([
    readProjectFile("package.json"),
    readProjectFile(".codex-plugin/plugin.json"),
    readProjectFile("README.md"),
    readProjectFile("README.ko.md"),
  ]);
  const packageMetadata = JSON.parse(packageText);
  const manifest = JSON.parse(manifestText);

  assert.equal(packageMetadata.version, "0.5.3");
  assert.equal(manifest.version, "0.5.3");
  assert.match(english, /npm install --global codex-agent-view@0\.5\.3/);
  assert.match(korean, /npm install --global codex-agent-view@0\.5\.3/);
  assert.doesNotMatch(english, /0\.5\.3[^\n]*(?:pending|release target|candidate|unpublished)/i);
  assert.doesNotMatch(korean, /0\.5\.3[^\n]*(?:대기|목표|후보|미배포)/i);
  assert.doesNotMatch(english, /npm install --global codex-agent-view@0\.5\.1/);
  assert.doesNotMatch(korean, /npm install --global codex-agent-view@0\.5\.1/);

  assert.match(english, /select and send:[\s\S]*@codex-agent-view/);
  assert.match(korean, /다음 plugin을 선택해 그대로 전송[\s\S]*@codex-agent-view/);
  assert.match(english, /operating system's default browser/);
  assert.match(korean, /운영체제 기본 브라우저/);
  assert.match(english, /Do not select a separate `\$show-agents` skill/);
  assert.match(korean, /별도 `\$show-agents` skill을 선택하지/);
  assert.match(english, /Do not start the monitor in a terminal/);
  assert.match(korean, /터미널에서 monitor를 시작하지/);
  assert.match(english, /Do not copy or manage a localhost URL/);
  assert.match(korean, /localhost 주소를 복사하거나 관리하지/);
});

test("documents assigned work and current activity without presenting internal reasoning", async () => {
  const [english, korean, privacy, terms] = await Promise.all([
    readProjectFile("README.md"),
    readProjectFile("README.ko.md"),
    readProjectFile("docs/privacy.md"),
    readProjectFile("docs/terms.md"),
  ]);

  assert.match(english, /\*\*Assigned work\*\*/);
  assert.match(english, /unambiguous/);
  assert.match(english, /task label is the primary usable source/);
  assert.match(english, /\*\*Current activity\*\*/);
  assert.match(english, /exact `turn_id`/);
  assert.match(english, /not an agent's internal reasoning/);
  assert.match(english, /does not retain or display raw spawn messages, full prompts, full tool input, or full tool output/);

  assert.match(korean, /\*\*할당 작업\*\*/);
  assert.match(korean, /task label을 주 근거/);
  assert.match(korean, /\*\*현재 활동\*\*/);
  assert.match(korean, /정확한 `turn_id`/);
  assert.match(korean, /에이전트의 내부 생각이 아닙니다/);

  assert.match(privacy, /assignment_summary/);
  assert.match(privacy, /not internal reasoning/);
  assert.match(terms, /Neither display represents internal reasoning/);
});

test("documents hook trust, local-only state, recovery, and safe removal", async () => {
  const [english, korean, privacy] = await Promise.all([
    readProjectFile("README.md"),
    readProjectFile("README.ko.md"),
    readProjectFile("docs/privacy.md"),
  ]);

  for (const document of [english, korean]) {
    assert.match(document, /hooks\/hooks\.json/);
    assert.match(document, /send-hook\.mjs/);
    assert.match(document, /127\.0\.0\.1/);
    assert.match(document, /sessionStorage/);
    assert.match(document, /Reconnect|다시 연결/);
    assert.match(document, /codex-agent-view uninstall/);
    assert.match(document, /codex-agent-view uninstall --purge/);
    assert.match(document, /postinstall/);
  }

  assert.match(english, /Hook commands execute locally with your user account's permissions/);
  assert.match(korean, /Hook 명령은 사용자 계정 권한으로 로컬에서 실행/);
  assert.match(english, /If ownership cannot be verified, it fails without deleting uncertain files/);
  assert.match(korean, /소유권을 확인하지 못하면 불확실한 파일을 삭제하거나/);
  assert.match(privacy, /bounded and is discarded when the monitor stops or restarts/);
  assert.match(privacy, /Recovery is stored in browser `sessionStorage`, never `localStorage`/);
});

test("keeps current 0.5.3 source language separate from historical 0.5.2 evidence and Directory acceptance", async () => {
  const [english, korean, agents, roadmap, distribution, findings, submission, privacy, terms] = await Promise.all([
    readProjectFile("README.md"),
    readProjectFile("README.ko.md"),
    readProjectFile("AGENTS.md"),
    readProjectFile("ROADMAP.md"),
    readProjectFile("docs/distribution.md"),
    readProjectFile("docs/phase-0-findings.md"),
    readProjectFile("docs/plugin-submission.md"),
    readProjectFile("docs/privacy.md"),
    readProjectFile("docs/terms.md"),
  ]);

  for (const document of [english, korean, agents, roadmap, distribution, findings, submission, privacy, terms]) {
    assert.match(document, /0\.5\.3/);
  }

  for (const document of [english, korean]) {
    assert.doesNotMatch(document, /0\.5\.3[^\n]*(?:pending|release target|candidate|unpublished|대기|목표|후보|미배포)/i);
  }

  assert.match(distribution, /Historical public `0\.5\.1`/);
  assert.match(findings, /Historical public evidence|Historical `0\.2\.1`/);
  assert.match(submission, /npm 공개는 Directory 제출·승인·검색 노출과 별도/);
  assert.match(english, /npm publication is separate from submission to the Universal Plugins Directory/);
  assert.match(korean, /npm 공개와 Universal Plugins Directory 제출은 별도 절차/);
  for (const document of [roadmap, distribution, findings, submission]) {
    assert.match(document, /npm 공개 완료 조건으로 사용하지/);
    assert.match(document, /Directory (?:submission )?(?:blocker|제출 경계|제출 단계|portal submission 경계)/i);
  }
});

test("records verified public 0.5.2 evidence without claiming Directory or Quick start acceptance", async () => {
  const [english, korean, distribution, findings, submission] = await Promise.all([
    readProjectFile("README.md"),
    readProjectFile("README.ko.md"),
    readProjectFile("docs/distribution.md"),
    readProjectFile("docs/phase-0-findings.md"),
    readProjectFile("docs/plugin-submission.md"),
  ]);

  assert.match(english, /npm install --global codex-agent-view@0\.5\.3/);
  assert.match(korean, /npm install --global codex-agent-view@0\.5\.3/);

  for (const document of [distribution, findings, submission]) {
    assert.match(document, /2026-08-03T18:45:19\.094Z/);
    assert.match(document, /58a3841a73f8dec2060710962f4bfd0273931fec/);
    assert.match(document, /sha512-ugMRzbmWI2Fp5QGtwuze9yC3SNspq5Uua\/FL\/9YMj1OBVlq9JXigqRiHnZgOjWny15QXJ6wLi8z2MN8vAgq53A==/);
    assert.match(document, /npm signature 1개|signature 1개/);
    assert.match(document, /23 files|23-file/);
    assert.match(document, /62\.5 kB/);
    assert.match(document, /251\.2 kB/);
    assert.match(document, /6292b1a9a93fe0ede6054362544b609991322adf37b44611e35c4d0ec74c174b/);
    assert.match(document, /9227bff6526978e4d8f8fc48b047ffcbf44f5599/);
    assert.match(document, /byte-identical/);
    assert.match(document, /30842520151/);
    assert.match(document, /30842851244/);
    assert.match(document, /Node\.js 18\/20\/22/);
    assert.match(document, /releases\/tag\/v0\.5\.2/);
    assert.match(document, /diff-identical/);
    assert.match(document, /hook wiring 9종/);
    assert.match(document, /events_received: true/);
    assert.match(document, /sessions 1/);
    assert.match(document, /Assigned work/);
    assert.match(document, /Current activity/);
    assert.match(document, /(?:Hook trust|hook trust).*`unknown`|CLI-unobservable `unknown`/i);
    assert.match(document, /Directory/);
    assert.match(document, /pending|unverified|미확인/i);
    assert.match(document, /Quick start/);
  }
});

test("scopes the no-additional-monitoring-calls claim without promising zero token use", async () => {
  const [packageText, manifestText, english, korean, privacy, terms, distribution] = await Promise.all([
    readProjectFile("package.json"),
    readProjectFile(".codex-plugin/plugin.json"),
    readProjectFile("README.md"),
    readProjectFile("README.ko.md"),
    readProjectFile("docs/privacy.md"),
    readProjectFile("docs/terms.md"),
    readProjectFile("docs/distribution.md"),
  ]);
  const packageMetadata = JSON.parse(packageText);
  const manifest = JSON.parse(manifestText);
  const expectedDescription =
    "A lightweight, read-only Codex companion plugin for monitoring live tasks and subagent activity locally in your browser, without additional ongoing model calls for monitoring.";

  assert.equal(packageMetadata.description, expectedDescription);
  assert.equal(manifest.description, expectedDescription);
  assert.match(english, /no additional ongoing model or external API inference calls for monitoring/);
  assert.match(english, /normal Codex turn and can use tokens/);
  assert.match(english, /tasks and subagents being observed continue their normal token usage/);
  assert.match(korean, /모니터링을 위한 추가적인 지속 model 또는 외부 API inference call/);
  assert.match(korean, /일반 Codex turn이므로 token을 사용할 수/);
  assert.match(korean, /task와 subagent도 작업 수행에 필요한 token을 평소처럼 사용/);
  for (const document of [privacy, terms, distribution]) {
    assert.match(document, /additional ongoing model|추가적인 지속 model/);
    assert.match(document, /task|tasks/);
    assert.match(document, /subagent/);
    assert.match(document, /token/);
  }
  for (const document of [packageText, manifestText, english, korean]) {
    assert.doesNotMatch(document, /with no ongoing token usage|zero token usage/i);
  }
});

test("records verified public 0.5.3 release evidence without claiming pending app or Directory acceptance", async () => {
  const documents = await Promise.all([
    readProjectFile("docs/distribution.md"),
    readProjectFile("docs/phase-0-findings.md"),
    readProjectFile("docs/plugin-submission.md"),
  ]);

  for (const document of documents) {
    assert.match(document, /2026-08-03T19:29:03\.590Z/);
    assert.match(document, /94b60ff4662b829ca5853439e4da0cef4466927d/);
    assert.match(document, /sha512-r59F\+z19gehSiKlhsRpcaPDiIwXFBtUXXjaUIVr1RiWotV4CBXGMI95Se8BmJ0g\/gBPUOsvewm4NvVIv3IK0DQ==/);
    assert.match(document, /signature 1개/);
    assert.match(document, /23 files/);
    assert.match(document, /62\.9 kB/);
    assert.match(document, /252\.8 kB/);
    assert.match(document, /125abefe16b600d12b5f81dc93f96da89c6742be76522a98d45f996b53805cbd/);
    assert.match(document, /4b79e1b0645405927e22752a52d6900a9d02a2a2/);
    assert.match(document, /byte-identical/);
    assert.match(document, /30845807979/);
    assert.match(document, /30846142549/);
    assert.match(document, /Node\.js 18\/20\/22/);
    assert.match(document, /releases\/tag\/v0\.5\.3/);
    assert.match(document, /diff-identical|diff identity/);
    assert.match(document, /hook wiring 9종/);
    assert.match(document, /monitor_not_running/);
    assert.match(document, /unknown/);
    assert.match(document, /actual event|Actual new event|actual live event/i);
    assert.match(document, /pending/);
    assert.match(document, /Directory/);
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
