import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function readProjectFile(path) {
  return readFile(resolve(projectRoot, path), "utf8");
}

test("documents the 0.5.2 install and one-invocation default-browser workflow", async () => {
  const [packageText, manifestText, english, korean] = await Promise.all([
    readProjectFile("package.json"),
    readProjectFile(".codex-plugin/plugin.json"),
    readProjectFile("README.md"),
    readProjectFile("README.ko.md"),
  ]);
  const packageMetadata = JSON.parse(packageText);
  const manifest = JSON.parse(manifestText);

  assert.equal(packageMetadata.version, "0.5.2");
  assert.equal(manifest.version, "0.5.2");
  assert.match(english, /npm install --global codex-agent-view@0\.5\.2/);
  assert.match(korean, /npm install --global codex-agent-view@0\.5\.2/);
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

test("keeps current 0.5.2 release language separate from historical releases and Directory acceptance", async () => {
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
    assert.match(document, /0\.5\.2/);
    const currentLines = document
      .split("\n")
      .filter((line) => line.includes("0.5.2"))
      .join("\n");
    assert.doesNotMatch(currentLines, /unpublished|미배포|배포되지 않은|0\.5\.2[^\n]*(?:candidate|후보)/i);
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
  assert.match(distribution, /실제 성공 뒤/);
  assert.match(findings, /실제 성공 뒤/);
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
