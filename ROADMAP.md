# Codex Agent View Roadmap

현재 source version은 `0.2.0`이다. Phase 0~3의 repository 내부 제품 구현과 검증 항목은 완료되었다. Bounded in-memory live state는 완성된 architecture이며 SQLite/영구 history는 누락된 milestone이 아니다. 아래 남은 항목은 실제 사용자 계정·공식 앱·외부 portal이 필요한 compatibility와 listing acceptance다.

## 제품 원칙

- 공식 Codex 앱을 대체하지 않는 read-only companion monitor다.
- live 상태의 source of truth는 hook event다.
- App Server는 optional metadata 보강 후보이며 공식 앱 process와 memory를 공유한다고 가정하지 않는다.
- local-only, bounded in-memory, no external telemetry가 완성된 기본 architecture다.
- 전체 prompt와 tool input/output을 기본 저장·표시하지 않는다.
- 설치, hook trust, 제거는 사용자가 명시적으로 수행하고 복구 경로를 제공한다.
- task/subagent control과 permission 자동 처리 기능을 제공하지 않는다.

## 제품 구현 상태

- [x] Local read-only live companion의 Phase 0~3 구현과 source/package validation을 완료했다.
- [x] Reset-on-restart를 의도된 observation-window lifecycle로 확정했다.
- [x] Persistent history는 필수 기능이 아니며, 검증된 사용자 요구가 있을 때만 별도 explicit opt-in proposal로 평가한다.

## 외부 compatibility acceptance

- [ ] 공식 Codex 앱에서 plugin을 enable하고 hook을 trust한 **새/current GUI task**로 `SubagentStart`, `SubagentStop`, `PreToolUse`, `PostToolUse` → loopback monitor → UI E2E를 팀장이 직접 완료한다.
- [ ] 실제 approval prompt를 발생시켜 공식 앱 `PermissionRequest` payload와 read-only waiting 표시를 확인한다. 발생하지 않으면 event 미발생과 schema 문제를 분리해 기록한다.

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

## 외부 Universal Directory listing

- [ ] maintainer가 Universal Plugins Directory portal에서 제출·심사·publish를 완료하고 실제 directory 검색 노출을 확인한다.

## Phase 0 — 기술 검증과 프로젝트 기반

상태: repository 작업 완료, 공식 앱 GUI 검증은 external compatibility acceptance로 분리

- [x] 기존 파일을 보존하며 Git/npm project 기반을 정리한다.
- [x] `README.md`, `AGENTS.md`, `ROADMAP.md`, findings 문서를 만든다.
- [x] 설치된 공식 앱, embedded Codex, Homebrew CLI 버전을 기록한다.
- [x] 공식 plugin manifest, `hooks/hooks.json` discovery, hook trust 구조를 확인한다.
- [x] `.codex-plugin/plugin.json`과 최소 hook/script scaffold를 만든다.
- [x] Homebrew CLI와 app-embedded CLI에서 isolated plugin install/runtime을 검증한다.
- [x] 실제 subagent probe에서 `SubagentStart`, `SubagentStop`, `PreToolUse`, `PostToolUse` payload를 캡처한다.
- [x] `PermissionRequest`는 공식 지원 event이나 실제 payload 미관찰임을 추측 없이 기록한다.
- [x] GUI current-task 미캡처를 hot-load 미지원으로 단정하지 않고 trust/config snapshot이 남은 external evidence로 분류한다.
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

상태: repository 구현, public npm release, annotated Git tag와 GitHub Release 완료. Directory listing은 제품 구현과 분리된 외부 작업이다.

- [x] `codex-agent-view` bin과 `start/status/doctor/install/uninstall` CLI surface를 구현한다.
- [x] npm `files` allowlist에 manifests, catalog, logo assets, hooks, CLI, sender/capture scripts, skill, runtime/UI, README, LICENSE, NOTICE를 포함한다.
- [x] package, plugin manifest, marketplace catalog version을 `0.2.0`으로 일치시킨다.
- [x] explicit install이 copied local marketplace와 plugin을 등록하고 hook trust는 사용자에게 남기도록 구현한다.
- [x] default uninstall과 explicit `--purge`를 분리하고 unsafe target/symlink 경계를 검토한다.
- [x] npm lifecycle에 `postinstall`을 두지 않고 사용자 설정을 자동 변경하지 않음을 확인한다.
- [x] genuine status/diagnostic skill과 Privacy, Terms, Support, Security 문서를 추가한다.
- [x] `npm test`, plugin validation, skill validation, `npm pack --dry-run`을 통과한다.
- [x] source CLI `--version`과 `doctor --json` smoke를 통과한다.
- [x] local marketplace, npm-backed marketplace, Universal Plugins Directory의 배포 경계를 문서화한다.

## 검증 snapshot

- Node tests: `49/49` pass
- Plugin scaffold validation: pass
- Skill `quick_validate.py`: pass
- `npm pack --dry-run`: pass, `codex-agent-view@0.2.0`, 21 files, logo assets와 skill 포함
- Source CLI `--version`: `0.2.0`
- Source CLI `doctor --json`: Codex `0.146.0` 탐지 및 monitor/plugin 미실행 상태 진단
- Public registry metadata: `0.2.0`, `Apache-2.0`, `codex-agent-view` → `bin/codex-agent-view.mjs`, shasum/exact SRI/signature 확인
- Public exact artifact: isolated global install과 exact-version `npx`의 CLI lifecycle smoke 통과
- Public exact artifact E2E: 다섯 hook event → status/UI, search/filter, browser console 무오류, purge 뒤 빈 plugin/runtime 확인
- Release source match: npm `gitHead`와 annotated `v0.2.0` tag가 `00b62af56698ac875e39c7d1386905c157c3a7e8`로 일치, origin tag와 public GitHub Release 확인, 21개 package file byte-identical

이 snapshot은 local/source, public npm exact artifact, annotated Git tag와 public GitHub Release 검증 결과다. Official GUI current-task E2E, 실제 `PermissionRequest`, Universal Directory listing은 증명하지 않는다. 별도 npm provenance attestation은 선택 사항이며 `0.2.0`에는 없다.

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
