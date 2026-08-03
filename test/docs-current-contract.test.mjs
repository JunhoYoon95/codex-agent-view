import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function readProjectFile(path) {
  return readFile(resolve(projectRoot, path), "utf8");
}

test("documents one plugin invocation that opens the default browser without a user-facing skill picker", async () => {
  const [english, korean, distribution, findings, submission, privacy, terms] = await Promise.all([
    readProjectFile("README.md"),
    readProjectFile("README.ko.md"),
    readProjectFile("docs/distribution.md"),
    readProjectFile("docs/phase-0-findings.md"),
    readProjectFile("docs/plugin-submission.md"),
    readProjectFile("docs/privacy.md"),
    readProjectFile("docs/terms.md"),
  ]);

  assert.match(english, /one `@codex-agent-view` invocation opens the monitor in your default web browser/);
  assert.match(english, /There is no separate `\$show-agents` selection/);
  assert.match(english, /If you close the browser tab, invoke `@codex-agent-view` again/);
  assert.match(korean, /`@codex-agent-view` 한 번으로 운영체제 기본 브라우저에 monitor를 연다/);
  assert.match(korean, /별도 `\$show-agents` 선택은 없다/);
  assert.match(korean, /Browser tab을 닫았다면 `@codex-agent-view`를 다시 실행/);

  for (const document of [distribution, findings, submission]) {
    assert.match(document, /current source|Current source/);
    assert.match(document, /internal (?:execution )?skill|내부 (?:execution )?skill|internal launch skill/);
    assert.match(document, /default browser|기본 browser/);
    assert.match(document, /user-facing skill picker|사용자용 skill picker|별도 `\$show-agents` picker|별도 `\$show-agents` skill/);
    assert.match(document, /0\.5\.1/);
  }

  assert.match(privacy, /operating system's default browser/);
  assert.match(privacy, /passes the private target directly/);
  assert.match(privacy, /invoke `@codex-agent-view` again/);
  assert.match(terms, /operating system's default browser/);
  assert.match(terms, /another `@codex-agent-view` invocation/);
  assert.match(distribution, /Public `0\.4\.8` release evidence/);
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
  assert.match(english, /Recovery is tab-scoped `sessionStorage`, not `localStorage`/);
  assert.match(english, /Fifteen-minute access credentials refresh automatically only inside that family/);
  assert.match(korean, /한 줄·최대 180자로 제한/);
  assert.match(korean, /에이전트별 할당 내용을 추측하지 않는다/);
  assert.match(korean, /Session ID는 표시하지/);
  assert.match(korean, /Recovery는 `localStorage`가 아니라 tab-scoped `sessionStorage`/);
  assert.match(korean, /15분 access credential은 같은 family 안에서만 자동 갱신/);
  assert.match(findings, /전용 field가 실제 payload에서 관찰되기 전까지/);
  assert.match(findings, /첫 유효 작업 개요|`task_summary`/);
  assert.match(privacy, /first 4,096 characters/);
  assert.match(privacy, /original prompt's first 4,096 characters/);
  assert.match(privacy, /exact leading opener is not closed inside the bounded window.*fails closed.*no summary/);
  assert.match(privacy, /Mid-prompt wrappers, differently attributed wrappers, and generic context markup remain user text/);
  assert.match(privacy, /result is limited to 180 Unicode characters/);
  assert.match(privacy, /not a guarantee that arbitrary sensitive text can never appear/);
  assert.match(privacy, /fixed signed `family_exp` 30 minutes after issuance/);
  assert.match(privacy, /Recovery is stored in browser `sessionStorage`, never `localStorage`/);
  assert.match(privacy, /monitor restart rotates the signing token and invalidates every unused bootstrap/);
  assert.match(privacy, /family that was already exchanged is signed under the persistent viewer signing key/);
  assert.match(privacy, /reconnect to the new empty observation window/);
  assert.match(privacy, /fresh nonce and verifies the HMAC ownership proof/);
  assert.match(privacy, /do not enable CORS and no authentication cookie is set/);
});

test("records the promptless 0.5.2 candidate while preserving final public npm 0.5.1 evidence", async () => {
  const [packageText, manifestText, english, korean, roadmap, distribution, findings, submission, privacy] = await Promise.all([
    readProjectFile("package.json"),
    readProjectFile(".codex-plugin/plugin.json"),
    readProjectFile("README.md"),
    readProjectFile("README.ko.md"),
    readProjectFile("ROADMAP.md"),
    readProjectFile("docs/distribution.md"),
    readProjectFile("docs/phase-0-findings.md"),
    readProjectFile("docs/plugin-submission.md"),
    readProjectFile("docs/privacy.md"),
  ]);
  const packageMetadata = JSON.parse(packageText);
  const manifest = JSON.parse(manifestText);

  assert.equal(packageMetadata.version, "0.5.2");
  assert.equal(manifest.version, "0.5.2");
  assert.equal(Object.hasOwn(manifest.interface, "defaultPrompt"), false);
  assert.match(english, /npm install --global codex-agent-view@0\.5\.1/);
  assert.match(korean, /npm install --global codex-agent-view@0\.5\.1/);
  assert.match(english, /Historical public `0\.5\.0` evidence/);
  assert.match(korean, /Historical public `0\.5\.0` evidence/);
  assert.match(english, /Public npm `latest` is `codex-agent-view@0\.5\.1`/);
  assert.match(korean, /Public npm `latest`는 `codex-agent-view@0\.5\.1`/);
  assert.doesNotMatch(english, /unpublished `0\.5\.1`|`0\.5\.1` patch candidate/i);
  assert.doesNotMatch(korean, /미배포 `0\.5\.1`|`0\.5\.1` patch candidate/i);
  for (const document of [english, korean, distribution, findings, submission]) {
    assert.match(document, /60-second|60초/);
    assert.match(document, /bootstrap grant/);
  }
  const releaseEvidenceDocuments = [english, korean, distribution, findings, submission];
  for (const document of releaseEvidenceDocuments) {
    assert.match(document, /(?:public npm `latest`(?:\/version)?|npm `latest`|Public npm `latest`).*`?0\.5\.1`?/i);
    assert.match(document, /ca9b1e61ce8139f62a5f3016c81973d8bf1ea1ac/);
    assert.match(document, /sha512-tvz3oN\+F5sMW0at\+17FEDGoC4FO8LfBJUjBBYmYmvKtIsyPhhqJ\+irPfd\/8Uws\+Bn5QMjtYcLzG\/rBEXtGQ6UQ==/);
    assert.match(document, /e540adcc4205eb6c1026f6a17864ac1a44e925696e0ff5ac659cba95402cf447/);
    assert.match(document, /(?:one npm signature|npm signature 1개|signature 1개)/i);
    assert.match(document, /(?:registry(?: and|\/) release tarballs are byte-identical|Registry tarball과 release tarball은 byte-identical|release↔registry tarball byte 일치)/i);
    assert.match(document, /(?:public exact global reinstall|public exact `0\.5\.1` global reinstall|public exact global `0\.5\.1` reinstall)/i);
    assert.match(document, /CLI\/plugin `0\.5\.1`/);
    assert.match(document, /installed\/enabled/);
    assert.match(document, /(?:all nine hooks|hook wiring 9종)/i);
    assert.match(document, /events_received: true|`events_received: true`/);
    assert.match(document, /30818761050/);
    assert.match(document, /30825304988/);
    assert.match(document, /Node\.js 18(?:,|\/)20(?:,|, and |\/)22|Node\.js 18, 20, and 22/);
    assert.match(document, /releases\/tag\/v0\.5\.1/);
    assert.match(document, /SubagentStart/);
    assert.match(document, /SubagentStop/);
    assert.match(document, /(?:running agents changed from 1 to 0|running 1→0|running agent 수가 1에서 0|`SubagentStart` 뒤 running 1, `SubagentStop` 뒤 running 0)/i);
    assert.match(document, /completed.*stopped|completed`\/`stopped`/is);
  }
  for (const document of [english, korean, roadmap, distribution, findings, submission, privacy]) {
    assert.match(document, /0\.5\.1/);
    assert.match(document, /in-app-browser-context|ambient(?:-| )wrapper|ambient(?:-| )fixture/i);
    assert.match(document, /(?:official task-summary live prompt|official `task_summary` live prompt|공식 task-summary live prompt|Official task-summary live prompt).*?(?:unverified|미확인)/is);
    assert.match(document, /UserPromptSubmit/);
    assert.match(document, /(?:automated|자동화).*?(?:ambient|fixture).*?(?:pass|통과)/is);
  }
  assert.match(roadmap, /Registry\/release tarball byte-identical.*\[x\]|\[x\].*Registry\/release tarball byte-identical/is);
  assert.match(roadmap, /\[x\].*Main\/tag CI.*actual subagent live UI running 1→0/is);
  for (const document of [english, korean, roadmap, distribution, findings, submission]) {
    const currentReleaseLines = document
      .split("\n")
      .filter((line) => line.includes("0.5.1") && !line.includes("0.5.2"))
      .join("\n");
    assert.doesNotMatch(
      currentReleaseLines,
      /(?:GitHub|CI|registry.*tarball|exact.*reinstall|subagent.*E2E).*?(?:pending|아직 확인하지|완료하지|unverified)/i,
    );
  }
});

test("documents direct @ invocation without promising a promptless plugin-card Quick start", async () => {
  const [english, korean, roadmap, agents, distribution, findings, submission, privacy, terms] = await Promise.all([
    readProjectFile("README.md"),
    readProjectFile("README.ko.md"),
    readProjectFile("ROADMAP.md"),
    readProjectFile("AGENTS.md"),
    readProjectFile("docs/distribution.md"),
    readProjectFile("docs/phase-0-findings.md"),
    readProjectFile("docs/plugin-submission.md"),
    readProjectFile("docs/privacy.md"),
    readProjectFile("docs/terms.md"),
  ]);

  for (const document of [english, korean, roadmap, agents, distribution, findings, submission, privacy, terms]) {
    assert.match(document, /0\.5\.2/);
    assert.match(document, /(?:candidate|후보)/i);
    assert.match(document, /defaultPrompt/);
    assert.match(document, /(?:optional UI metadata|optional `interface\.defaultPrompt` starter-text metadata|optional `defaultPrompt`|optional UI metadata였으며|optional UI metadata였던)/i);
    assert.match(document, /@codex-agent-view/);
    assert.match(document, /(?:internal single skill|내부 single skill|internal skill)/i);
    assert.match(document, /(?:promptless plugin-card Quick start|promptless Quick start control|promptless \*\*지금 사용해보기\*\*|promptless plugin-card control).*?(?:unverified|미확인|not claimed|not promised|주장하지)/is);
    assert.match(document, /(?:pending|unpublished|미배포|배포되지 않은)/i);
  }

  assert.match(english, /select `@codex-agent-view` and send that invocation by itself/);
  assert.match(korean, /`@codex-agent-view` 자체를 선택해 전송/);
  assert.match(distribution, /Quick start 문구 자동 삽입을 더 이상 제공하거나 요구하지 않는다/);
  assert.match(terms, /no longer provides or requires automatic Quick start wording/);
});

test("keeps the promptless validator conflict as a release and Directory blocker", async () => {
  const [roadmap, distribution, findings, submission] = await Promise.all([
    readProjectFile("ROADMAP.md"),
    readProjectFile("docs/distribution.md"),
    readProjectFile("docs/phase-0-findings.md"),
    readProjectFile("docs/plugin-submission.md"),
  ]);

  for (const document of [roadmap, distribution, findings, submission]) {
    assert.match(document, /Repository validator\/tests/);
    assert.match(document, /local Codex CLI install\/cache ingestion/);
    assert.match(document, /installed\/enabled/);
    assert.match(document, /bundled plugin-creator.*`validate_plugin\.py`/is);
    assert.match(document, /interface\.defaultPrompt or interface\.default_prompt is required/);
    assert.match(document, /Current public manual/);
    assert.match(document, /optional.*defaultPrompt.*starter prompt|optional-field\/starter-prompt/is);
    assert.match(document, /public publish/);
    assert.match(document, /Directory acceptance/);
    assert.match(document, /(?:app UI E2E|앱 UI E2E|official-app E2E|official app UI.*E2E)/i);
    assert.match(document, /(?:blocker|미확인)/i);
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
    assert.match(
      document,
      /(?:public npm `latest`\/version|npm `latest` \/ version \|).*`0\.4\.4`/i,
    );
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

test("records verified public 0.4.5 acceptance and keeps external publication boundaries explicit", async () => {
  const [distribution, findings, submission] = await Promise.all([
    readProjectFile("docs/distribution.md"),
    readProjectFile("docs/phase-0-findings.md"),
    readProjectFile("docs/plugin-submission.md"),
  ]);

  for (const document of [distribution, findings, submission]) {
    assert.match(
      document,
      /(?:public npm `latest`\/version|npm `latest` \/ version \|).*`0\.4\.5`/i,
    );
    assert.match(document, /d5c1f593ae7e48e226e396d02579cd7f9ef8d01e/);
    assert.match(
      document,
      /sha512-LeegHcrzmCgRjNP\/T\+8OPXzFT\/RYBp33UfKG1nPmBPnZHYQJdFTY2GGY3rK9\/lQfS3PEo9oL7MG3wBY5A5LFaw==/,
    );
    assert.match(document, /registry signature/);
    assert.match(document, /25 files/);
    assert.match(document, /74\.5 kB/);
    assert.match(document, /263\.0 kB/);
    assert.match(document, /byte-identical/);
    assert.match(document, /public exact reinstall/i);
    assert.match(document, /CLI\/plugin `0\.4\.5`/);
    assert.match(document, /installed\/enabled/);
    assert.match(document, /hook wiring 9종/);
    assert.match(document, /events_received: true/);
    assert.match(document, /sessions 9개/);
    assert.match(
      document,
      /unit\/sender integration tests.*credential·email·link·absolute path redaction/,
    );
    assert.match(
      document,
      /placeholder로 정제된 bounded safe work summary 표시/,
    );
    assert.doesNotMatch(
      document,
      /Official Codex in-app E2E[^\n]*credential·email·link·absolute(?:-| )path.*(?:redaction|제거)/,
    );
    assert.doesNotMatch(document, /Official Codex in-app E2E[^\n]*raw sensitive sample/);
    assert.match(document, /session ID (?:비노출|non-primary)|session-ID/);
    assert.match(document, /current viewer task 제외/);
    assert.match(document, /en\/ko\/es/);
    assert.match(document, /auth missing\/rejected recovery button/);
    assert.match(document, /30732189017/);
    assert.match(document, /30744341373/);
    assert.match(document, /1df8f0b/);
    assert.match(
      document,
      /https:\/\/github\.com\/JunhoYoon95\/codex-agent-view\/releases\/tag\/v0\.4\.5/,
    );
    assert.doesNotMatch(document, /`?0\.4\.5`? release candidate/i);
    assert.match(document, /Universal (?:Plugins )?Directory.*(?:별도|separate|아직)/i);
    assert.match(document, /npm provenance.*(?:완료도 주장하지|뜻하지|선택)/i);
  }
});
