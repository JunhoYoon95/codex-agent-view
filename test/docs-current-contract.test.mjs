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
    assert.match(document, /user-facing skill picker|사용자용 skill picker|별도 `\$show-agents` picker/);
    assert.match(document, /미배포|unreleased/);
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

test("separates the unpublished 0.5.1 patch from historical public 0.5.0 acceptance", async () => {
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

  assert.equal(packageMetadata.version, "0.5.1");
  assert.equal(manifest.version, "0.5.1");
  assert.match(english, /npm install --global codex-agent-view@0\.5\.0/);
  assert.match(korean, /npm install --global codex-agent-view@0\.5\.0/);
  assert.match(english, /Historical public `0\.5\.0` evidence/);
  assert.match(korean, /Historical public `0\.5\.0` evidence/);
  assert.match(english, /unpublished `0\.5\.1` ambient-wrapper removal patch candidate/i);
  assert.match(korean, /미배포 `0\.5\.1` ambient-wrapper removal patch candidate/i);
  assert.match(english, /Public npm `latest` is `codex-agent-view@0\.5\.0`/);
  assert.match(korean, /Public npm `latest`는 `codex-agent-view@0\.5\.0`/);
  assert.doesNotMatch(english, /public `0\.5\.1`/i);
  assert.doesNotMatch(korean, /public `0\.5\.1`/i);
  for (const document of [english, korean, distribution, findings, submission]) {
    assert.match(document, /60-second|60초/);
    assert.match(document, /bootstrap grant/);
  }
  for (const document of [english, korean, roadmap, distribution, findings, submission, privacy]) {
    assert.match(document, /0\.5\.1/);
    assert.match(document, /in-app-browser-context/);
    assert.match(document, /(?:미배포|unpublished)/i);
    assert.match(document, /(?:fixed E2E|수정 후 공식 앱 E2E|수정 후 official fixed E2E|공식 E2E.*다시 확인|official fixed E2E).*?(?:pending|아직|확인|not claimed)/is);
    assert.doesNotMatch(document, /public `?0\.5\.1`?/i);
  }
  for (const document of [english, korean, distribution, findings, submission]) {
    assert.match(document, /(?:public npm `latest`(?:\/version)?|npm `latest`).*`?0\.5\.0`?/i);
    assert.match(document, /bf89ee665840e62d502551d87d7faaed2a1e0206/);
    assert.match(document, /sha512-W8rOv\+0Xb5SVsFl\/kXHF\/vt9CJ\/Su0rwDWVFWLWYWhKidZTxx\+ea9Z0dtd65k3KBxucLRuwMOUJL3BtHr2p2Dw==/);
    assert.match(document, /e23c4ea484fa6186c17f2c564b5019a08eb6acca10f99fc85bf95e2f2757bc2c/);
    assert.match(document, /registry signature/);
    assert.match(document, /23[- ]file|23 files/);
    assert.match(document, /30816426733/);
    assert.match(document, /Node(?:\.js)? 18(?:,|\/)20(?:,|\/)22|Node\.js 18, 20, and 22/);
    assert.match(document, /(?:public exact.*(?:reinstall|install|재설치)|reinstalled from public exact)/i);
    assert.match(document, /CLI\/plugin(?: `0\.5\.0`| version (?:matched|일치))/i);
    assert.match(document, /installed\/enabled/);
    assert.match(document, /(?:hook wiring 9종|all nine hooks were wired)/);
    assert.match(document, /events_received: true/);
    assert.match(document, /subagent start\/stop/i);
    assert.match(document, /(?:final status|최종(?: agent)? 상태).*`?stopped`?/i);
    assert.match(document, /(?:tag|`v0\.5\.0`).*(?:아직|has not|have not|없)/is);
    assert.match(document, /GitHub Release.*(?:아직|has not|have not|없)/is);
    assert.doesNotMatch(document, /releases\/tag\/v0\.5\.0/);
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
