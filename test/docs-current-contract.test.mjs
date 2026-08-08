import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function readProjectFile(path) {
  return readFile(resolve(projectRoot, path), "utf8");
}

test("documents the 0.5.6 release and each-view invocation workflow", async () => {
  const [packageText, manifestText, english, korean] = await Promise.all([
    readProjectFile("package.json"),
    readProjectFile(".codex-plugin/plugin.json"),
    readProjectFile("README.md"),
    readProjectFile("README.ko.md"),
  ]);
  const packageMetadata = JSON.parse(packageText);
  const manifest = JSON.parse(manifestText);

  assert.equal(packageMetadata.version, "0.5.6");
  assert.equal(manifest.version, "0.5.6");
  assert.match(english, /npm install --global codex-agent-view@0\.5\.6/);
  assert.match(korean, /npm install --global codex-agent-view@0\.5\.6/);
  assert.match(english, /codex --version/);
  assert.match(korean, /codex --version/);
  assert.match(english, /npm install --global @openai\/codex@latest/);
  assert.match(korean, /npm install --global @openai\/codex@latest/);
  assert.match(english, /another install channel, update it through that channel/);
  assert.match(korean, /다른 install channel로 설치했다면 그 channel에서 업데이트/);
  assert.match(english, /The `0\.5\.6` installer copies the bundled plugin/);
  assert.match(korean, /`0\.5\.6` installer는 등록 전에 포함된 plugin을/);
  assert.match(english, /strict marketplace subdirectory/);
  assert.match(korean, /marketplace의 strict subdirectory/);
  assert.doesNotMatch(english, /unpublished|release candidate|public npm `latest` remains `0\.5\.5`/i);
  assert.doesNotMatch(korean, /아직 공개되지 않은|release candidate|public npm `latest`는 `0\.5\.5`/i);
  assert.doesNotMatch(english, /npm install --global codex-agent-view@0\.5\.4/);
  assert.doesNotMatch(korean, /npm install --global codex-agent-view@0\.5\.4/);

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
  assert.match(english, /no exact upstream correlation ID/);
  assert.match(english, /best-effort basis/);
  assert.match(english, /task label is the primary usable source/);
  assert.match(english, /\*\*Current activity\*\*/);
  assert.match(english, /exact `turn_id`/);
  assert.match(english, /not an agent's internal reasoning/);
  assert.match(english, /does not retain or display raw spawn messages, full prompts, full tool input, or full tool output/);

  assert.match(korean, /\*\*할당 작업\*\*/);
  assert.match(korean, /공식 exact correlation ID/);
  assert.match(korean, /bounded best-effort/);
  assert.match(korean, /task label을 주 근거/);
  assert.match(korean, /\*\*현재 활동\*\*/);
  assert.match(korean, /정확한 `turn_id`/);
  assert.match(korean, /에이전트의 내부 생각이 아닙니다/);

  assert.match(privacy, /assignment_summary/);
  assert.match(privacy, /not internal reasoning/);
  assert.match(terms, /Neither display represents internal reasoning/);
});

test("documents the parent work-status filter and fail-closed concurrent assignments", async () => {
  const [english, korean] = await Promise.all([
    readProjectFile("README.md"),
    readProjectFile("README.ko.md"),
  ]);

  assert.match(english, /\*\*Work status filter\*\* matches each parent work item's current status only/);
  assert.match(english, /nested agent statuses and recent activity history do not cause a card to match a different status/);
  assert.match(english, /several agents are spawned concurrently[\s\S]*assignment details intentionally remain unavailable/);

  assert.match(korean, /\*\*작업 상태 필터\*\*는 각 상위 작업의 현재 상태만 기준/);
  assert.match(korean, /하위 에이전트 상태나 최근 활동 기록 때문에 다른 상태의 작업 카드가 섞이지/);
  assert.match(korean, /여러 에이전트가 동시에 생성돼[\s\S]*의도적으로 확인 불가/);
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

test("keeps public 0.5.5 evidence separate from official-app and Directory acceptance", async () => {
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

  for (const document of [english, korean, agents, roadmap, distribution, findings, submission, privacy]) {
    assert.match(document, /0\.5\.5/);
  }
  assert.match(terms, /current source version `0\.5\.6`/);
  assert.match(terms, /Version `0\.5\.6` provides no starter text/);

  for (const document of [english, korean]) {
    assert.doesNotMatch(document, /(?:`0\.5\.5`|0\.5\.5) release candidate|`0\.5\.5` 후보/i);
  }

  assert.doesNotMatch(roadmap, /^## Historical current public\b/m);

  for (const document of [agents, roadmap]) {
    assert.match(document, /this-device|이 기기/);
    assert.match(document, /compatible(?: Codex)? CLI|compatible-Codex-CLI/);
    assert.match(document, /clean cross-device first install/i);
    assert.match(document, /actual plugin not-found|plugin not-found failure/i);
    assert.match(document, /strict subdirectory|strict-subdir/);
  }
  assert.match(agents, /`0\.5\.6` release candidate[^\n]*아직 publish\/tag되지 않았/);
  assert.match(roadmap, /`0\.5\.6` exact tarball.*empty Codex home\/runtime.*actual CLI/);
  assert.match(roadmap, /`0\.5\.6`을 공식 Codex 앱에서 완전히 재시작한 뒤 new task actual hook/);

  assert.match(privacy, /Verified public `0\.5\.5` artifact identity, this-device compatible-CLI reinstall/);
  assert.match(privacy, /Clean cross-device first install was not verified/);
  assert.match(privacy, /actual not-found failure/);
  assert.match(privacy, /exact tarball clean-device install, official-app E2E, publication, CI, tag, and Release remain unverified or pending/i);
  assert.doesNotMatch(privacy, /0\.5\.5 publication evidence remains pending/i);
  assert.match(distribution, /현재 source-tree 설치 명령은 root README의 `0\.5\.6` release candidate Quick start/);
  assert.doesNotMatch(distribution, /현재 사용자 설치 명령은 root README의 `0\.5\.2`/);

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

  assert.match(english, /npm install --global codex-agent-view@0\.5\.6/);
  assert.match(korean, /npm install --global codex-agent-view@0\.5\.6/);

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

test("documents the approved lightweight invocation and local monitoring copy with normal observed-work usage", async () => {
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
    "A read-only Codex plugin for monitoring live tasks and subagents in your browser. Open each view with one lightweight @codex-agent-view invocation. Once open, live monitoring runs locally with no additional model calls.";

  assert.equal(packageMetadata.description, expectedDescription);
  assert.equal(manifest.description, expectedDescription);
  assert.match(english, /Open each view with one lightweight `@codex-agent-view` invocation\. Once open, live monitoring runs locally with no additional model calls\./);
  assert.match(english, /tasks and subagents being monitored continue their normal model and token usage/);
  assert.match(korean, /각 화면은 가벼운 `@codex-agent-view` 실행 한 번으로 엽니다\. 화면이 열린 뒤 실시간 모니터링은 추가 모델 호출 없이 로컬에서 작동합니다\./);
  assert.match(korean, /task와 subagent의 일반적인 모델·token 사용은 계속/);
  for (const document of [privacy, terms, distribution]) {
    assert.match(document, /no additional model calls|추가 모델 호출 없이/);
    assert.match(document, /task|tasks/);
    assert.match(document, /subagent/);
    assert.match(document, /token/);
  }
  assert.doesNotMatch(english, /normal Codex turn can use tokens|normal Codex turn and can use tokens/i);
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

test("records verified public 0.5.4 release evidence while keeping app E2E and Directory acceptance pending", async () => {
  const documents = await Promise.all([
    readProjectFile("docs/distribution.md"),
    readProjectFile("docs/phase-0-findings.md"),
    readProjectFile("docs/plugin-submission.md"),
  ]);

  for (const document of documents) {
    assert.match(document, /2026-08-03T20:24:33\.437Z/);
    assert.match(document, /c77eb53a0f7d170bc0259a604dbbb8f6a85e4bb4/);
    assert.match(document, /sha512-c0fhYlHJRHbFWbON2\+DhJVuBoLiXyW9Bp9bSZhZLKML\+a8MvhQxqSdTYr1fvwO3dESa1IO0WVZ4sLWucljsESA==/);
    assert.match(document, /signature 1개/);
    assert.match(document, /23 files/);
    assert.match(document, /62\.9 kB/);
    assert.match(document, /252\.8 kB/);
    assert.match(document, /58ef4f976b1ee5cc255559a037dbe0ac0cefaa5c642084ddd123d1a6f272606c/);
    assert.match(document, /3312be0bf7ebbeb5694a857089796903410d9b9c/);
    assert.match(document, /byte-identical/);
    assert.match(document, /30849631485/);
    assert.match(document, /30850278542/);
    assert.match(document, /Node\.js 18\/20\/22/);
    assert.match(document, /releases\/tag\/v0\.5\.4/);
    assert.match(document, /installed\/enabled/);
    assert.match(document, /stopped/);
    assert.match(document, /unknown/);
    assert.match(document, /restart[-/]new-task|restart\/new-task/);
    assert.match(document, /pending/);
    assert.match(document, /Directory/);
  }
});

test("limits public 0.5.5 evidence to artifact and compatible-CLI reinstall", async () => {
  const documents = await Promise.all([
    readProjectFile("docs/distribution.md"),
    readProjectFile("docs/phase-0-findings.md"),
    readProjectFile("docs/plugin-submission.md"),
  ]);

  for (const document of documents) {
    assert.match(document, /2026-08-04T18:42:31\.744Z/);
    assert.match(document, /cc04e6a10380a0b5b0f9b1df5af7b6ce8d85139a/);
    assert.match(document, /sha512-J10ch73w6bi6Q\/R4A3nkjYVaV9\/HTnYxuu1Znmnin\+xi432IJVgWlKyEPmPfdBlW\+duoGyLzpV\+mmfHN4DZydA==/);
    assert.match(document, /signature 1개/);
    assert.match(document, /23 files/);
    assert.match(document, /63\.2 kB/);
    assert.match(document, /253525 bytes/);
    assert.match(document, /242b007c8572474712d7694553e5319e193804ebc268c3d15008510258cc03d5/);
    assert.match(document, /byte-identical/);
    assert.match(document, /0037a5b304dc76a20050d2cf5dfce3276dccd004/);
    assert.match(document, /30937777321/);
    assert.match(document, /30940008363/);
    assert.match(document, /Node\.js 18\/20\/22/);
    assert.match(document, /releases\/tag\/v0\.5\.5/);
    assert.match(document, /2026-08-04T18:44:32Z/);
    assert.match(document, /installed\/enabled/);
    assert.match(document, /hook(?: bundle|s)? 9종|valid hooks 9종/);
    assert.match(document, /registry\/global diff(?:는)? 0/);
    assert.match(document, /install entries 13개/);
    assert.match(document, /marketplace(?: bundle)?(?:도)? diff 0/);
    assert.match(document, /stopped/);
    assert.match(document, /unknown/);
    assert.match(document, /exact-tarball lifecycle/);
    assert.match(document, /isolated browser (?:status-)?filter E2E/);
    assert.match(document, /`hooks\/`, `scripts\/`, `src\/` diff(?:가|는)? 0/);
    assert.match(document, /(?:official|공식) Codex 앱.*restart\/new-task.*status-filter\/assignment(?:\/invocation)? E2E.*pending/);
    assert.match(document, /Directory/);
    assert.match(document, /Quick start/);
    assert.match(document, /compatible(?:-Codex)?-CLI reinstall/i);
    assert.match(document, /clean cross-device first install/i);
    assert.match(document, /source\.path: "\.\/"/);
    assert.match(document, /plugin `codex-agent-view` was not found in marketplace `codex-agent-view`/);
    assert.match(document, /temporary recovery|임시 recovery/i);
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
