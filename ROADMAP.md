# Codex Agent View Roadmap

Public npm `latest`/version은 아직 `0.5.2`다. Signed registry artifact와 source-pack identity, exact reinstall, main/tag CI, annotated tag/GitHub Release, installed plugin/hook wiring과 actual Assigned work/Current activity display를 확인했다. Current source는 제품 설명과 metadata를 정리한 `0.5.3` release를 준비하며 publication/digest/exact reinstall/CI/tag/GitHub Release는 성공 전까지 pending이다. Public `0.5.1`과 `0.5.2` evidence는 historical fact로 보존한다. Bounded in-memory hook state는 완성된 architecture이며 SQLite/영구 history는 누락된 milestone이 아니다.

## 제품 원칙

- 공식 Codex 앱을 대체하지 않는 read-only companion plugin이다.
- Historical release의 app-native snapshot은 공식 앱 내장 thread tools의 explicit status와 `subAgentActivity`를 사용했다. Public `0.5.0`부터 hook 기반 browser monitor와 기본 browser 진입점으로 통합됐다.
- Hook event는 trusted hook이 자동 준비하는 local live backend의 세부 lifecycle source of truth다.
- 별도 App Server는 앱 내장 thread tools와 다른 process이며 공식 앱의 live source로 가정하지 않는다.
- local-only, bounded in-memory, no external telemetry가 완성된 기본 architecture다.
- 전체 prompt와 tool input/output을 기본 저장·표시하지 않는다.
- 설치, hook trust, 제거는 사용자가 명시적으로 수행하고 복구 경로를 제공한다.
- task/subagent control과 permission 자동 처리 기능을 제공하지 않는다.
- Live monitor의 갱신은 local hook data만 사용하며 monitoring을 위한 additional ongoing model/external API inference call을 만들지 않는다. 최초 `@codex-agent-view` invocation은 일반 Codex turn이라 token을 사용할 수 있고 관찰 대상 task/subagent도 정상 token을 계속 사용하므로 zero-token 또는 넓은 no-ongoing-token 제품이라고 표현하지 않는다.

## Current — `0.5.3` release preparation

`0.5.3`은 기능·privacy 경계를 바꾸지 않고 Codex task와 subagent activity를 browser에서 실시간으로 확인하는 lightweight read-only companion이라는 제품 설명을 package, plugin, GitHub와 npm surface에 일관되게 반영한다.

- [x] 영문·한국어 README에 live task/subagent browser monitoring과 정확한 token-use 경계를 설명한다.
- [x] Package/plugin metadata version과 description을 `0.5.3`으로 동기화한다.
- [x] GitHub repository visibility, Description, Website와 agreed Topics를 실제 remote metadata에 반영하고 다시 조회한다.
- [x] `npm test`, `npm run validate:plugin`, `npm run check`와 exact tarball smoke를 통과한다.
- [ ] `0.5.3`을 npm에 공개하고 version/`latest`, registry digest/signature와 packaged README를 확인한다.
- [ ] Public exact `0.5.3` reinstall에서 CLI/plugin version, installed/enabled, hook wiring과 live event 수신을 확인한다.
- [ ] Main/tag CI, annotated `v0.5.3`와 public GitHub Release를 확인한다.
- [ ] 성공한 publication/digest/CI/tag/Release 증거만 문서에 기록한다.

## Historical current public — `0.5.2` release acceptance

Plugin-level `interface.defaultPrompt`는 plugin 실행 기능이 아니라 plugin 카드의 starter-prompt UI metadata다. `0.5.2`는 starter text를 제공하거나 요구하지 않는다. 사용자는 Codex task에서 `@codex-agent-view` 자체를 선택·전송하고 내부 single skill이 `open`을 실행한다. Plugin 카드가 promptless Quick start control을 제공하는지는 앱 UI가 결정하므로 실제 확인 전에는 지원을 주장하지 않는다.

- [x] Package/plugin manifest version을 `0.5.2`로 동기화한다.
- [x] Plugin-level starter prompt를 비워 두고 internal single skill/`open` contract는 유지한다.
- [x] README와 배포·privacy·terms 문서에서 promptless invocation 경계를 설명한다.
- [x] Repository validator/tests와 local Codex CLI install/cache ingestion에서 promptless `0.5.2`가 installed/enabled로 수락됨을 확인한다.
- [x] npm 공개 전 repository validation/tests와 실제 앱 동작을 확인한다.
- [ ] Bundled plugin-creator validation 요구는 Universal Plugins Directory 제출 경계로 별도 추적한다. npm 공개 완료 조건으로 사용하지 않으며 Directory acceptance는 portal/reviewer 확인 전까지 주장하지 않는다.
- [x] `npm run check`와 exact tarball smoke를 통과한다.
- [x] npm `0.5.2` publish 뒤 registry version, signature/digest와 packaged README를 확인한다.
- [x] Public exact `0.5.2` reinstall에서 CLI/plugin version, installed/enabled, hook wiring과 live event 수신을 확인한다. Hook trust는 CLI에서 관찰할 수 없어 `unknown`으로 유지한다.
- [x] Main/tag CI, annotated `v0.5.2`와 public GitHub Release를 확인한다.
- [x] 공식 Codex 앱에서 actual Assigned work와 Current activity 표시를 확인하고 사용자 확인을 받는다.
- [ ] `@codex-agent-view` 자체 선택·전송 → internal single skill → `open` → default browser의 public exact invocation E2E를 별도 재확인한다.
- [ ] Plugin 카드의 promptless Quick start 제공 여부를 실제 앱에서 관찰하고 결과만 기록한다.
- [x] Repository validation/tests와 실제 앱 관찰 근거를 바탕으로 npm publish, exact reinstall, artifact comparison, CI와 tag/GitHub Release를 완료한다.
- [ ] Bundled validator와 portal/reviewer 확인은 별도 Directory submission blocker/미확인으로 유지한다.

## Historical current public — `0.5.1` release acceptance

Public `0.5.0`은 공식 Codex 앱에서 실행을 시작하고 OS 기본 외부 브라우저에 live UI를 표시하는 설계를 배포했다. 공식 E2E에서 Codex가 자동 첨부한 `in-app-browser-context` block이 task summary에 섞이는 문제를 확인했다. `0.5.1`은 그 ambient wrapper만 summary 입력에서 제거하며 launch, read-only와 bounded-memory 경계는 바꾸지 않는다.

- [x] Public `0.5.0` npm latest, signed 23-file artifact, main CI Node.js 18/20/22와 this-device exact reinstall을 확인한다.
- [x] Public exact `0.5.0` plugin/hook wiring 9종, `events_received: true`와 actual subagent start/stop의 최종 `stopped`를 확인한다.
- [x] Official E2E에서 automatic `in-app-browser-context` wrapper가 task summary를 오염시키는 문제를 재현한다.
- [x] Current source를 `0.5.1`로 올리고 summary 정규화 전에 해당 automatic wrapper를 제거한다.
- [x] npm `0.5.1` publish와 `latest`/version, shasum `ca9b1e61ce8139f62a5f3016c81973d8bf1ea1ac`을 확인한다.
- [x] Release tarball SHA-256 `e540adcc4205eb6c1026f6a17864ac1a44e925696e0ff5ac659cba95402cf447`을 기록한다.
- [x] Registry/release tarball byte-identical, shasum/integrity/signature와 SHA-256을 확인한다.
- [x] Public exact global reinstall, CLI/plugin `0.5.1`, installed/enabled, hook wiring 9종과 events true를 확인한다.
- [x] Main/tag CI, annotated `v0.5.1`, GitHub Release와 actual subagent live UI running 1→0, target completed/stopped를 확인한다.
- [ ] Official task-summary live prompt를 monitor가 `UserPromptSubmit` 전부터 실행된 새 관찰 window에서 확인한다. Automated actual ambient fixture tests는 이미 통과했지만 공식 event 관찰을 대체하지 않는다.
- [ ] 누락된 `v0.5.0` tag/GitHub Release를 만들지는 release owner가 별도로 결정하고, 생성 전에는 완료로 기록하지 않는다.

`0.5.1` release acceptance는 완료됐다. Official `UserPromptSubmit` task-summary live prompt는 해당 monitor가 event 뒤에 시작되어 미확인이며 automated fixture evidence와 구분한다. 현재 작업은 위 `0.5.2` public release다.

## 제품 구현 상태

- [x] Local read-only live companion의 Phase 0~3 구현과 source/package validation을 완료했다.
- [x] Reset-on-restart를 의도된 observation-window lifecycle로 확정했다.
- [x] Persistent history는 필수 기능이 아니며, 검증된 사용자 요구가 있을 때만 별도 explicit opt-in proposal로 평가한다.

## 외부 compatibility acceptance

- [x] 실행 중이던 공식 앱 process에 `0.2.0`을 설치·enable한 뒤 실제 subagent 2개를 실행했으나 event 0건임을 재현하고, app → plugin sender 경계의 실패로 좁혔다.
- [x] CLI JSON으로 persisted exact-hook trust를 확인할 수 없으며, 공식 절차상 interactive `/hooks` 검토와 새 task가 필요함을 기록했다.
- [x] `0.2.1`을 설치한 뒤 공식 앱을 완전히 재시작한 현재 조합에서 `SessionStart`, `UserPromptSubmit`, `SubagentStart`, `PreToolUse`, `PostToolUse`, `SubagentStop`, `Stop` → loopback monitor → UI E2E와 task ID 등록 없는 parent/subagent 자동 표시를 팀장이 직접 확인했다.
- [x] 실제 approval prompt에서 공식 앱 `PermissionRequest` hook과 read-only waiting 표시를 확인했다.
- [x] 후속 `0.3.0` source E2E의 browser monitor에서 실제 공식 앱 `SessionEnd` event를 관찰하고 completed session 반영을 확인했다.

## `0.2.1` 실사용 복구 patch

- [x] Parent task lifecycle 관찰을 위해 `SessionStart`, `SessionEnd`, `UserPromptSubmit`, `Stop` hook wiring을 추가한다.
- [x] Root turn과 session lifecycle을 bounded in-memory state로 계산한다.
- [x] `status`와 `doctor`가 “monitor 실행 중”과 “hook event 수신됨”을 구분한다.
- [x] `doctor`가 plugin install/enable, 설치 bundle wiring, version mismatch, trust 미확인 상태를 actionable diagnostic으로 보고한다.
- [x] 빈 UI가 실행 중 task 없음으로 오인되지 않도록 0-event 의미와 restart/trust/new-task 순서를 표시한다.
- [x] Codex `0.146` App Server `thread/list` fallback을 검증하고 root/subagent `notLoaded` 때문에 live status source로 채택하지 않는다.
- [x] Source test, plugin validation, package check를 팀장이 직접 실행한다.
- [x] 실제 공식 앱 restart/new-task 핵심 E2E를 팀장이 직접 실행하고 parent 3개·subagent 3개 자동 표시와 실제 hook 8종을 확인했다.
- [x] 확인된 event set의 공식 GUI compatibility와 `0.2.1` npm patch publish를 검증 증거와 함께 선언한다.
- [x] 후속 source E2E에서 실제 `SessionEnd` compatibility를 확인했다.

## `0.3.0` app-first release

- [x] 공식 Codex 앱 내장 thread tools를 active-task snapshot의 primary source로 사용하고 local monitor 자동 시작을 요구하지 않는다.
- [x] Workspace basename, display-only title, explicit status, 최신 explicit commentary와 `subAgentActivity`만 표시하는 privacy-minimized skill contract를 구현한다.
- [x] Preview, user prompt, transcript, tool input/output, full workspace path와 internal thread ID를 기본 표시하지 않는다.
- [x] Hooks/local monitor를 lifecycle detail source와 optional Codex in-app Browser live view로 유지한다.
- [x] CLI `start` 기본값이 외부 browser를 열지 않고 `--open`만 명시적 external action이 되도록 한다.
- [x] 전체 `cwd` 대신 sanitized basename `workspace_label`만 120자로 제한해 process memory에 유지한다.
- [x] 팀장 E2E에서 `kyurasi-next-supabase` active task의 workspace/title/description/explicit `inProgress`/latest commentary/subAgentActivity를 앱 내장 tools로 확인했다.
- [x] 같은 task 직후 list가 explicit `idle`, `hasUnreadTurn: true`로 전환되는 것을 확인하고 running/active와 별도 `완료/확인 대기` 그룹에 포함했다. 이 조합만으로 완료·성공을 추론하지 않는다.
- [x] 별도 browser monitor에서 실제 `SessionEnd`를 관찰했다.
- [x] `0.3.0` 전체 test/plugin/package validation과 final tarball QA를 완료한다.
- [x] Public exact `0.3.0`을 이 기기에 global reinstall하고 plugin installed/enabled, hook wiring 9종과 실제 monitor hook 수신을 확인한다.
- [x] `0.3.0`을 npm publish하고 `latest`/version, `gitHead`, shasum, exact SRI, signature, 21 files와 unpacked size를 검증한다.
- [x] Annotated `v0.3.0` tag를 origin에 push하고 public GitHub Release와 registry/global artifact 일치를 확인한다.

## `0.3.1` app-only usage patch release

- [x] 정상 사용자 흐름을 `최초 npm 설치 → Codex 앱 Plugins 확인 → 새 task의 @codex-agent-view → 앱 내 snapshot/live view`로 문서화한다.
- [x] CLI `start`/`status`/`doctor`와 localhost URL은 maintainer·명시적 진단 영역으로 격리한다.
- [x] Bundled skill이 live view를 Codex 내장 Browser에 열고 외부 browser나 private URL을 사용자에게 넘기지 않도록 계약을 강화한다.
- [x] Source package, plugin manifest와 package contract version을 `0.3.1`로 일치시킨다.
- [x] `0.3.1` release candidate의 full test/plugin/package validation과 candidate tarball QA를 완료한다.
- [x] `0.3.1`을 npm publish하고 registry version/`latest`, `gitHead`, shasum, integrity와 21 files를 검증한다.
- [x] Public exact `0.3.1`을 이 기기에 재설치하고 plugin `installed: true`, `enabled: true`를 확인한다.
- [ ] Public exact `0.3.1`의 공식 Codex 앱 새 task app-only E2E를 확인한다.
- [x] Annotated `v0.3.1` tag와 public GitHub Release를 생성한다.

## `0.3.2` immutable README correction release

- [x] Package, plugin manifest와 test fixture version contract를 `0.3.2`로 일치시킨다.
- [x] Packaged README가 자신을 미배포 candidate로 안내하지 않고 exact-version install `@0.3.2`를 안내하도록 고친다.
- [x] `0.3.2` release candidate의 full test/plugin/package validation과 tarball QA를 완료한다.
- [x] `0.3.2`를 npm publish하고 registry version/`latest`, `gitHead`, shasum, integrity, signature, 21 files와 package/unpacked size를 검증한다.
- [x] Public exact `0.3.2`를 이 기기에 global install하고 plugin installed/enabled와 registry artifact mismatch 0을 확인한다.
- [x] 공식 Codex 앱의 app-native thread snapshot에서 worker activity 3개를 확인한다.
- [ ] 앱을 완전히 재시작하고 새 task에서 public exact `0.3.2` live hook E2E를 확인한다. 재설치 전 앱 process의 follow-up subagent 3개는 내장 Browser monitor에 hook event를 0건 전달했다.
- [x] Annotated `v0.3.2` tag와 public GitHub Release, main/tag CI 통과와 registry/tagged-source artifact 일치를 확인한다.

## `0.4.0` app-internal automatic live backend candidate

- [x] Plugin 설치·hook trust·앱 재시작 뒤 첫 trusted hook이 fixed loopback backend를 내부적으로 준비하고 같은 최소화 event 전달을 bounded retry한다.
- [x] 사용자가 task ID를 등록하거나 `start`, `status`, `doctor`, localhost URL을 정상 사용 절차에서 관리하지 않게 한다.
- [x] 동시 hook의 중복 start가 고정 포트의 단일 listener로 수렴하고 hook sender는 제한 시간 뒤 fail-open하도록 한다.
- [x] 이미 열린 Codex 오른쪽 live tab이 같은 monitor 관찰 window에서 자동 갱신하고 일시 단절 뒤 재연결하도록 한다.
- [x] 공개 plugin API에는 no-prompt 앱 시작 sidebar/panel/Browser-tab 생성 기능이 없으므로 최초 live view 열기는 앱 안 사용자 요청 1회가 필요함을 명시한다.
- [x] CLI `start`/`status`/`doctor`를 maintainer diagnostics로만 유지하고 tokenized URL과 외부 browser를 일반 사용자 흐름에서 금지한다.
- [x] Package, plugin manifest와 test fixture version contract를 `0.4.0`으로 일치시키고 candidate 문서를 current public `0.3.2` evidence와 분리한다.
- [ ] `0.4.0` candidate의 full test/plugin/package validation과 tarball QA를 완료한다.
- [ ] 공식 Codex 앱을 완전히 재시작한 새 task에서 첫 trusted hook → backend 자동 준비 → 최초 event → 기존/신규 in-app live tab E2E를 팀장이 확인한다.
- [ ] `0.4.0`을 npm publish하고 registry/version/tag/GitHub Release, exact install과 artifact match를 확인한다.

## 외부 npm distribution operation

- [x] Maintainer가 npm account와 `kyurasi` login을 확인했다.
- [x] `codex-agent-view@0.2.0` 코드와 publish tarball 준비를 완료했다.
- [x] npm account 필수 2FA `auth-and-writes` mode와 `pending:null`을 확인했다.
- [x] `codex-agent-view@0.2.0` public registry publish를 완료했다.
- [x] Public exact artifact의 registry metadata(`0.2.0`, `Apache-2.0`, executable mapping), shasum, exact SRI와 registry signature를 확인했다.
- [x] Isolated global install과 exact-version `npx` 양쪽에서 `--version`, `doctor`, `install`, ephemeral-port `start`, `status`, `uninstall` smoke를 완료했다.
- [x] Public exact artifact E2E에서 다섯 hook event의 status/UI 반영, search/filter, browser console 무오류, purge 뒤 빈 plugin/runtime 상태를 확인했다.
- [x] npm `gitHead`와 annotated `v0.2.0` tag가 commit `00b62af56698ac875e39c7d1386905c157c3a7e8`로 일치하고 tag가 origin에 push됐으며 GitHub Release가 공개됐음을 확인했다.
- [x] Tagged source와 public registry artifact의 21개 package file이 byte-identical임을 확인했다.
- [x] `codex-agent-view@0.2.1` public registry publish와 `latest: 0.2.1`을 확인했다.
- [x] Public `0.2.1`의 version/license/bin, npm `gitHead`, 21 files/unpacked size, shasum, exact SRI와 registry signature를 확인했다.
- [x] 이 기기에 public exact `0.2.1`을 global로 다시 설치하고 CLI version, plugin installed/enabled, hook wiring 9종을 확인했다.
- [x] Public exact `0.2.1` 상태에서 monitor 재시작 뒤 실제 session 자동 수신과 probe subagent running → stopped/UI 완료 반영을 확인했다.
- [x] Clean temporary cache에서 public exact `0.2.1`의 exact-version `npx --version`을 검증했다.
- [x] `v0.2.1` annotated tag를 npm `gitHead` commit에 생성·origin push하고 public GitHub Release와 registry/tagged source 21개 file byte 일치를 확인했다.
- [x] 이 기기의 global install과 copied marketplace가 registry tarball 21개 file과 byte-identical임을 확인했다.

## 외부 Universal Directory listing

- [ ] maintainer가 Universal Plugins Directory portal에서 제출·심사·publish를 완료하고 실제 directory 검색 노출을 확인한다.
- [x] Public HTTPS MCP server/domain verification이 필요한 in-app custom UI는 local-only 원칙과 충돌함을 문서화하고, npm executable 배포·localhost browser UI·Directory listing/skills 역할을 분리한다.

## Phase 0 — 기술 검증과 프로젝트 기반

상태: repository 조사 완료. 후속 실사용에서 동일 앱 process의 hook event 0건이 확인되어 `0.2.1` acceptance에 반영

- [x] 기존 파일을 보존하며 Git/npm project 기반을 정리한다.
- [x] `README.md`, `AGENTS.md`, `ROADMAP.md`, findings 문서를 만든다.
- [x] 설치된 공식 앱, embedded Codex, Homebrew CLI 버전을 기록한다.
- [x] 공식 plugin manifest, `hooks/hooks.json` discovery, hook trust 구조를 확인한다.
- [x] `.codex-plugin/plugin.json`과 최소 hook/script scaffold를 만든다.
- [x] Homebrew CLI와 app-embedded CLI에서 isolated plugin install/runtime을 검증한다.
- [x] 실제 subagent probe에서 `SubagentStart`, `SubagentStop`, `PreToolUse`, `PostToolUse` payload를 캡처한다.
- [x] `PermissionRequest`는 공식 지원 event이나 실제 payload 미관찰임을 추측 없이 기록한다.
- [x] GUI current-task 미캡처를 hot-load 미지원으로 단정하지 않고 trust/config snapshot이 남은 external evidence로 분류한다.
- [x] 설치 전부터 열린 공식 앱 process가 `hooks/list` snapshot을 유지한 정황, sender 호출 0건, CLI trust 조회 한계를 실사용 증거로 추가한다.
- [x] default redaction, secret/capture 제외, package validation을 검증한다.
- [x] `docs/phase-0-findings.md`에 관찰 field, CLI/App 차이, 가능/불가능 범위, 다음 architecture를 기록한다.

## Phase 1 — local event core

상태: 완료

- [x] Hook payload를 untrusted input으로 받고 지원 event의 narrow runtime schema로 검증한다.
- [x] Prompt, path, tool input/output, unknown value를 reducer state에 복사하지 않는다.
- [x] 중복, 누락, malformed, unknown, out-of-order event를 다루는 in-memory reducer를 구현한다.
- [x] session, subagent, tool activity, permission wait의 최소 상태 model을 정의한다.
- [x] stop-before-start와 post-before-pre를 degraded state로 표현한다.
- [x] session, agent, activity, diagnostic 수를 bounded limit로 제한한다.
- [x] core unit tests를 구현하고 통과한다.

완료된 설계 결정: event core는 live 상태를 bounded memory에만 유지한다. SQLite/영구 history는 이 Phase의 미완료 항목이 아니며, 원격 server와 task control도 의도적 non-goal이다.

## Phase 2 — local read-only monitor MVP

상태: repository 구현 완료, 공식 앱 GUI 검증은 external compatibility acceptance로 분리

- [x] IPv4 loopback `127.0.0.1` transport와 local bearer-token threat boundary를 선택한다.
- [x] Hook sender를 bounded timeout과 fail-open 동작으로 구현한다.
- [x] token auth, Host 검증, body limit, security header, graceful shutdown을 갖춘 local HTTP runtime을 구현한다.
- [x] runtime directory/file을 user-only permission으로 만들고 symlink 경계를 검증한다.
- [x] task/session, subagent status, recent activity, permission wait를 보여주는 UI를 구현한다.
- [x] 연결 중/연결됨/끊김, empty, unknown, error 상태를 구분한다.
- [x] keyboard focus, labels, responsive layout, reduced motion, CSP-compatible assets를 검증한다.
- [x] UI가 completed subagent만 보고 parent task completion을 추측하지 않도록 검증한다.
- [x] 외부 bind, CORS/CDN/telemetry가 없는 local-only 구조를 tests와 source review로 확인한다.
- [x] hook sender → runtime → reducer → status/UI local integration tests를 통과한다.

완료된 설계 결정: live monitor는 task control, approval 처리, message 전송, persistent event store를 요구하지 않는다. Persistent history는 별도 explicit opt-in 요구가 입증될 때만 새 proposal로 다룬다.

## Phase 3 — 설치·제거와 공개 배포 준비

상태: repository 구현과 public npm `0.2.0`/`0.2.1`/`0.3.0`/`0.3.1`/`0.3.2` publish, annotated tag와 GitHub Release 완료. Exact `0.3.2` install과 app-native snapshot은 확인했고, app full restart/new-task live hook E2E만 미완료다. Directory listing은 제품 구현과 분리된 외부 작업이다.

- [x] `codex-agent-view` bin과 `start/status/doctor/install/uninstall` CLI surface를 구현한다.
- [x] npm `files` allowlist에 manifests, catalog, logo assets, hooks, CLI, sender/capture scripts, skill, runtime/UI, README, LICENSE, NOTICE를 포함한다.
- [x] `0.2.0` public release에서 package와 plugin manifest version 및 release artifact metadata를 일치시킨다.
- [x] `0.2.1` source에서 package와 plugin manifest version 및 final tarball metadata를 일치시킨다.
- [x] `0.3.0` source에서 package와 plugin manifest version을 일치시킨다.
- [x] `0.3.1` release candidate에서 package, plugin manifest와 package contract version을 일치시킨다.
- [x] `0.3.2` release candidate에서 package, plugin manifest와 package/test fixture version을 일치시킨다.
- [x] explicit install이 copied local marketplace와 plugin을 등록하고 hook trust는 사용자에게 남기도록 구현한다.
- [x] default uninstall과 explicit `--purge`를 분리하고 unsafe target/symlink 경계를 검토한다.
- [x] npm lifecycle에 `postinstall`을 두지 않고 사용자 설정을 자동 변경하지 않음을 확인한다.
- [x] genuine status/diagnostic skill과 Privacy, Terms, Support, Security 문서를 추가한다.
- [x] `npm test`, plugin validation, skill validation, `npm pack --dry-run`을 통과한다.
- [x] source CLI `--version`과 `doctor --json` smoke를 통과한다.
- [x] local marketplace, npm-backed marketplace, Universal Plugins Directory의 배포 경계를 문서화한다.

## 검증 snapshot

- Historical `0.2.1` Node tests: `55/55` pass
- Plugin scaffold validation: pass
- Skill `quick_validate.py`: pass
- `npm pack --dry-run`: pass, `codex-agent-view@0.2.1`, 21 files, logo assets와 skill 포함
- Package/plugin manifest version and final tarball metadata alignment: `0.2.1`
- Source CLI `--version`: `0.2.1`
- Installed `0.2.1` fixture E2E: task ID 사전 등록 없이 sender → monitor → UI에서 parent/agent 자동 생성과 running/waiting/completed 반영 확인
- Reset 뒤 source CLI `doctor --json`: plugin installed/enabled, `wiring_ok: true`, declared events 9개, `events_received: false`, trust `unknown` 확인
- Historical public `0.2.0` registry metadata: `Apache-2.0`, `codex-agent-view` → `bin/codex-agent-view.mjs`, shasum/exact SRI/signature 확인
- Historical public exact `0.2.0`: isolated global install과 exact-version `npx`의 CLI lifecycle smoke 통과
- Historical public exact `0.2.0` E2E: 다섯 hook event → status/UI, search/filter, browser console 무오류, purge 뒤 빈 plugin/runtime 확인
- Release source match: npm `gitHead`와 annotated `v0.2.0` tag가 `00b62af56698ac875e39c7d1386905c157c3a7e8`로 일치, origin tag와 public GitHub Release 확인, 21개 package file byte-identical
- Historical public `0.2.1`: 당시 `latest`, npm `gitHead` `8d6a67c9aafa23f801235d747ff018d254378970`, `Apache-2.0`, bin mapping, 21 files, unpacked size `144644`, shasum/exact SRI/signature 확인
- Historical `0.2.1` release source: annotated tag와 public GitHub Release, clean-cache exact-version `npx --version`, registry tarball ↔ tagged source 21 files byte-identical 확인
- This-device public exact `0.2.1`: global reinstall/copy ↔ registry tarball 21 files byte-identical, CLI `0.2.1`, plugin installed/enabled, hook wiring 9종, monitor 재시작 뒤 실제 sessions 자동 수신과 probe subagent running → stopped/UI 완료 반영 확인
- Official app `0.2.1` E2E: parent 3개·subagent 3개 자동 표시, 실제 hook 8종과 `PermissionRequest` waiting 확인
- Source `0.3.0` app-native E2E: `kyurasi-next-supabase`의 running `inProgress` snapshot과 직후 `idle + hasUnreadTurn` 전환 확인; 후자는 별도 확인 대기 그룹이며 완료·성공으로 추론하지 않음
- Source `0.3.0` hook/browser E2E: actual `SessionEnd`와 completed 반영 확인
- Public `0.3.0`: npm `latest`/version, `gitHead` `988132d0b525ee5e63f13a0d924810dd3f1bd93a`, shasum `08e2e5fa8c1133a1dcc3faae8f354535f9fc07b0`, exact SRI/signature, 21 files, unpacked `158.8 kB` 확인
- Public `0.3.0` release/install: annotated tag·public GitHub Release, this-device global reinstall, plugin installed/enabled, hook wiring 9종, registry ↔ global diff 0, marketplace ownership marker 외 artifact 일치 확인
- Public `0.3.0` live hook: `workspace_label: codex-agent-view`, 실제 `PermissionRequest`, tool lifecycle과 probe subagent running → stopped(`has_out_of_order_events: false`) 확인
- Current public `0.3.1`: version/`latest`, npm `gitHead` `c515ea28be201dc24d31e13bf465a38145050b69`, shasum `4405b183012c04e7b0bc265d4eb14bf85291dcd9`, integrity `sha512-8oF5uHqZobgPt75I2ymoq3/tx4Ab1YX/cvMPjaJHjV7zxVC5Dh318isoCdsKNi6emXEbiTIdxOgX7GcclyuP8A==`, 21 files 확인
- Public `0.3.1` release/install: annotated tag·public GitHub Release, this-device reinstall, plugin `installed: true`, `enabled: true`; app-only E2E evidence는 아직 없음
- Historical source `0.3.1` candidate validation: Node tests `67/67`, plugin validation, skill quick validation, package contract와 `npm pack --dry-run` 통과; 21 files, unpacked `167.1 kB`
- Historical source `0.3.2` candidate validation: immutable packaged README correction과 package/plugin/test version alignment, Node tests `67/67`, plugin/skill validation, package contract와 `npm pack --dry-run` 통과; 21 files, unpacked `167.1 kB`
- Current public `0.3.2`: version/`latest`, npm `gitHead` `4f4f92dc872d9b782efe900cc1397bdccf7d2c8a`, shasum `2851544c75a0a5fb20a2865196ab54b566b373d8`, integrity `sha512-MPwFP3CjhehkIzyV3ja0/rWzLyK4tJI7jjsczKN16aXpKEr/dvtc/aljjqW/41zatZrQG32ccKKMJjYNyW6Tww==`, signature, 21 files, package `46856 B`, unpacked `167060 B` 확인
- Public `0.3.2` release/install: annotated tag·public GitHub Release, main/tag CI 통과, this-device global install, plugin `installed: true`, `enabled: true`, registry artifact mismatch 0 확인
- Public `0.3.2` app acceptance: app-native thread snapshot에서 worker activity 3개 확인. 내장 Browser monitor 연결은 성공했지만 재설치 전 앱 process의 follow-up subagent 3개 hook은 0건이므로 app restart/new-task live hook E2E는 미완료

이 snapshot은 historical public `0.2.0`/`0.2.1`/`0.3.0`/`0.3.1`과 current public `0.3.2` evidence를 분리해 기록한다. Universal Directory listing은 아직 완료되지 않았다. 별도 npm provenance attestation은 선택 사항이며 확인되지 않았다.

## Phase 4 — 선택적 보강

각 항목은 사용자 가치와 privacy 비용을 별도로 검토한 뒤 독립 작업으로 진행한다.

- [ ] App Server metadata 보강의 정확성과 장애 격리를 검증한다.
- [ ] 실제 사용자 요구가 입증될 때에만 explicit opt-in local history의 가치와 retention/delete/migration/privacy 비용을 별도 proposal로 평가한다.
- [ ] Codex version compatibility matrix와 upgrade test automation을 확장한다.
- [ ] 제어 기능은 별도 보안 설계와 사용자 승인 model 없이는 착수하지 않는다.

SQLite/영구 history는 현재 제품에 빠진 기능이 아니다. Live companion과 별개의 explicit opt-in history 요구가 입증될 때만 별도 설계 결정과 사용자 승인을 거쳐 roadmap에 추가한다. 외부 service도 같은 기준을 적용한다.

## 대화 간 인수인계 규칙

각 작업을 마칠 때 다음을 갱신한다.

- 완료된 checkbox와 이를 입증하는 file/command
- 아직 확인되지 않은 가정과 재현 방법
- 실행한 test와 실행하지 못한 test
- 다음 대화의 첫 미완료 항목
- 사용자 조치나 권한이 필요한 exact blocker
