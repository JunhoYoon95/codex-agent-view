# Phase 0 기술 검증 결과

검증일: 2026-08-01

## 결론

최소 plugin은 Homebrew Codex CLI와 공식 앱에 포함된 embedded Codex CLI 양쪽에서 설치·실행되었다. 실제 subagent 실행으로 `SubagentStart`, `SubagentStop`, `PreToolUse`, `PostToolUse` payload를 관찰했으며, lifecycle event를 로컬 read-only monitor의 입력으로 사용하는 방향은 기술적으로 가능하다.

다만 이것은 공식 앱 bundle에 포함된 CLI runtime 검증이지, Codex GUI의 현재 task가 plugin hook을 실행했다는 증거는 아니다. 후속 `0.2.0` 실사용에서는 plugin 설치·enable과 monitor 실행이 정상이었는데도 동일 공식 앱 process에서 실제 subagent 2개를 실행하는 동안 event가 0건이었다. 앱 log에도 `send-hook.mjs` 실행 흔적이 없어서 문제를 UI/reducer가 아니라 app → plugin hook command 경계로 좁혔다.

해당 app process에는 plugin 설치 전 `hooks/list` 응답이 있었고 설치 뒤에도 process가 유지됐다. 이는 stale config/hook snapshot 가설과 일치하지만 인과관계를 확정하지는 않는다. 또한 `codex plugin list --json`은 persisted exact-hook trust를 노출하지 않아 config snapshot과 untrusted hook skip을 자동 진단으로 분리할 수 없었다. 따라서 “GUI는 hook을 지원하지 않는다” 또는 “재시작만 하면 해결된다” 중 어느 쪽도 아직 확정하지 않는다. `PermissionRequest`의 실제 GUI payload도 미관찰이다.

Phase 0의 repository 조사와 구현 입력 정리는 완료됐다. `0.2.1`은 실사용 실패를 진단 가능하게 만들고 parent task lifecycle도 관찰하기 위한 patch다. 공식 앱을 완전히 재시작하고 현재 hook hash를 검토·trust한 뒤 새 GUI task에서 parent/subagent lifecycle, tool use, approval 요청을 발생시키는 E2E 전에는 공식 앱 호환 성공을 주장하지 않는다.

## 검증 환경

| 대상 | 확인된 버전 | 결과 |
| --- | --- | --- |
| 공식 Codex 앱 | `26.727.40816` (`build 6067`) | 앱 bundle metadata에서 확인 |
| 앱 embedded Codex | `0.146.0-alpha.9.2` | 격리된 임시 `CODEX_HOME`과 로컬 marketplace에서 plugin 설치 및 runtime 성공 |
| Homebrew Codex CLI | `0.146.0` | 같은 격리 조건에서 plugin 설치 및 runtime 성공 |

검증은 실제 사용자 설정을 바꾸지 않도록 임시 `CODEX_HOME`과 로컬 marketplace를 사용했다. 실제 payload 값은 민감 정보가 남지 않도록 redaction했고, 이 문서에는 key와 type 수준의 관찰만 기록한다.

## 공식 plugin 및 hook 구조

2026-08-01에 확인한 [공식 Hooks 문서](https://learn.chatgpt.com/docs/hooks)는 다음을 명시한다.

- 활성 plugin은 기본적으로 plugin root의 `hooks/hooks.json`을 탐색한다.
- `.codex-plugin/plugin.json`의 `hooks` 항목으로 기본 경로를 override할 수도 있다.
- plugin hook도 다른 비관리 hook과 같은 trust review 대상이다.
- trust는 현재 hook 정의의 정확한 hash에 묶인다. hook이 새로 생기거나 바뀌면 다시 검토하기 전까지 skip된다.
- CLI에서는 `/hooks`로 source, 변경 여부, trust, disable 상태를 확인한다.
- `SubagentStart`, `SubagentStop`, `PreToolUse`, `PostToolUse`, `PermissionRequest`는 모두 문서상 지원 event다.
- plugin 설치·활성화 뒤에는 새 session/task 경계에서 사용해야 한다. [공식 Plugins 문서](https://learn.chatgpt.com/docs/plugins)도 설치 후 새 session을 시작하도록 안내한다.

현재 scaffold는 `hooks/hooks.json` 기본 탐색을 사용한다. 공식 문서는 manifest `hooks` override를 허용하지만, 현재 `plugin-creator` validator는 manifest의 `hooks` key를 거부했다. 기본 탐색 방식은 양쪽 validation을 모두 통과하므로 Phase 0에서는 override를 넣지 않았다.

## 실제 runtime 관찰

### Subagent와 collaboration tool probe

실제 subagent를 시작하고 종료한 안정성 probe와 앱 embedded CLI probe의 redacted JSONL에는 동일한 다음 6개 event 집합이 기록되었다. 아래 bullet 순서는 보장되는 발생 순서를 뜻하지 않는다.

- `PreToolUse` — `collaborationspawn_agent`
- `PostToolUse` — `collaborationspawn_agent`
- `PreToolUse` — `collaborationwait_agent`
- `PostToolUse` — `collaborationwait_agent`
- `SubagentStart`
- `SubagentStop`

`tool_name`은 wire payload에서 관찰한 opaque string으로 취급한다. 실제 값 `collaborationspawn_agent`와 `collaborationwait_agent`에 임의로 점을 넣거나 display label로 정규화하지 않는다. 이 두 값을 지원 tool의 고정된 전체 목록으로 hardcode해서도 안 된다. 사용자용 label이 필요하면 원본 값을 보존한 뒤 별도 표현 계층에서만 매핑한다.

별도의 안정성 probe에서는 `Bash`에 대한 `PreToolUse`와 `PostToolUse`도 관찰했다. 같은 plugin을 Homebrew CLI `0.146.0`에서도 설치하고 실행해 runtime 성공을 확인했다.

### 공통으로 관찰된 top-level field

6개 JSONL event 모두에서 다음 key가 관찰되었다.

| Field | 실제 probe 관찰 type | 공식 schema 허용 | 사용 판단 |
| --- | --- | --- | --- |
| `session_id` | string | string | root session 상관관계 후보 |
| `turn_id` | string | string | turn 상관관계 후보 |
| `transcript_path` | string | string 또는 null | monitor에는 기본 저장하지 않음 |
| `cwd` | string | string | 표시가 필요하면 최소화·정규화 후 사용 |
| `hook_event_name` | string | string | event discriminator |
| `model` | string | string | 선택적 metadata |
| `permission_mode` | string | string | 선택적 상태 metadata |

이 표는 관찰한 버전과 probe에서 공통이었다는 뜻이다. 향후 버전에도 항상 존재한다는 보장은 아니므로 입력 경계에서는 payload 전체를 `unknown`으로 받고 runtime validation을 거쳐야 한다.

### Event별 추가 field

| Event | 추가로 관찰된 field | 관찰 내용 |
| --- | --- | --- |
| `SubagentStart` | `agent_id`, `agent_type` | `agent_type`은 probe에서 `default` |
| `SubagentStop` | `agent_id`, `agent_type`, `agent_transcript_path`, `stop_hook_active`, `last_assistant_message` | `stop_hook_active`는 probe에서 `false` |
| `PreToolUse` | `tool_name`, `tool_input`, `tool_use_id` | tool input 값은 보존하지 않고 key/type만 확인 |
| `PostToolUse` | `tool_name`, `tool_input`, `tool_use_id`, `tool_response` | response 값은 보존하지 않고 key/type만 확인 |

관찰한 start와 stop은 같은 root `session_id`와 같은 `agent_id`를 사용했다. 이 조합은 in-memory lifecycle correlation의 실용적인 후보지만, unique constraint나 영구 schema로 확정하지 않는다. 누락, 중복, out-of-order event에 안전한 reducer가 필요하다.

`PermissionRequest`는 공식 문서상 지원되며 tool approval 직전에 실행되지만 이번 probe에서는 발생하지 않았다. 실제 payload field는 미확인이다.

## 공식 앱과 CLI의 차이

| 항목 | 확인 결과 |
| --- | --- |
| Homebrew CLI | `0.146.0`에서 isolated install/runtime 성공 |
| 앱 embedded CLI | `0.146.0-alpha.9.2`에서 isolated install/runtime 성공 및 6개 lifecycle/tool event 관찰 |
| 현재 GUI task | plugin을 task 도중 추가한 뒤 worker를 시작·종료했으나 캡처 없음 |
| `0.2.0` 실사용 재현 | 설치·enable·monitor가 정상인 상태에서 subagent 2개 실행, monitor `updated_at_ms: 0`, `sessions: []`, app log sender 실행 흔적 없음 |
| GUI 미캡처 해석 | 설치 전 `hooks/list` snapshot 유지 정황이 있으나 config snapshot 또는 untrusted hook skip 가능성을 분리하지 못함. hot-load 불가나 restart 해결을 단정하지 않음 |
| Trust 관찰 한계 | `codex plugin list --json`으로 installed/enabled는 확인 가능하지만 persisted exact-hook trust는 확인 불가. interactive `/hooks` 검토가 필요 |
| GUI 최종 결론 | 새 task에서 plugin과 hook trust를 확인한 E2E 전까지 미확인 |

앱 embedded executable을 직접 실행한 결과는 해당 executable과 plugin runtime의 호환성 증거다. GUI가 그 executable을 어떤 config/trust lifecycle로 실행하는지까지 증명하지는 않는다.

## App Server 조사

[공식 App Server 문서](https://learn.chatgpt.com/docs/app-server)는 다음을 제공한다.

- `thread/list`: 저장된 thread log와 runtime `status` 조회
- `thread/loaded/list`: 그 App Server process에 현재 load된 thread ID 조회
- `parentThreadId`, `ancestorThreadId`: `thread/list`의 experimental filter이며 `capabilities.experimentalApi = true` 필요

격리된 임시 home으로 별도 App Server를 시작한 probe에서는 `thread/loaded/list`와 `thread/list`가 모두 비어 있었다. 후속으로 Codex `0.146` App Server의 persisted `thread/list` fallback도 실제 검증했으나 현재 root와 subagent 모두 `notLoaded`로 나타나 공식 앱의 live running/completed 상태를 공유하지 않았다. Persisted `parentThreadId`, alias, depth는 계층 metadata로 복원할 수 있었지만 live lifecycle 판별에는 사용할 수 없었다. 공식 앱 daemon에 attach할 수 있는 control socket도 발견하지 못했다.

따라서 App Server는 optional metadata enrichment 후보로만 둔다. `thread/loaded/list`는 별도 attach 근거가 생기기 전까지 “현재 GUI 앱 전체의 loaded set”이 아니라 요청을 받은 해당 server instance의 loaded set으로 해석한다. Persisted fallback은 state DB read와 privacy/복잡도 비용을 추가하면서 현재 활동을 정확히 판별하지 못하므로 `0.2.1` live fallback으로 채택하지 않았다.

## 가능한 것과 아직 불가능하거나 미확인인 것

### 기술적으로 확인된 것

- plugin의 기본 `hooks/hooks.json`에서 lifecycle command를 실행할 수 있다.
- start/stop의 `session_id`와 `agent_id`로 subagent lifecycle을 상관시킬 수 있다.
- collaboration tool과 Bash의 pre/post activity를 관찰할 수 있다.
- payload를 값 없이 key/type 중심으로 redaction해 기술 검증할 수 있다.
- monitor core를 외부 DB 없이 bounded in-memory reducer로 구현했고, live companion의 완성 architecture로 채택했다.

### 아직 미확인인 것

- 공식 앱을 완전히 재시작하고 exact hook을 trust한 새 GUI task에서 plugin hook이 실제 실행되는지
- GUI task의 plugin/hook hot-load 지원 여부
- GUI에서 발생한 `PermissionRequest`의 실제 payload
- 별도 App Server로 현재 GUI process의 in-memory 상태를 공유하거나 attach하는 방법
- hook event가 누락되거나 순서가 바뀌는 모든 조건

### Phase 0 범위와 현재의 의도적 non-goal

아래 항목은 구현이 덜 끝난 backlog가 아니다. Codex Agent View는 historical audit/replay가 아니라 live companion이며, reset-on-restart와 bounded in-memory state가 현재 제품의 의도된 lifecycle이다. SQLite/영구 history는 필수 다음 단계가 아니며 검증된 사용자 요구가 있을 때만 retention, deletion, migration, access-control, privacy 비용을 포함한 별도 explicit opt-in proposal로 검토한다.

- JSONL을 production state store로 사용
- SQLite 또는 다른 영구 DB 추가
- 외부 telemetry 또는 원격 서버 전송
- 자동 승인·거절, task 중지, 메시지 전송 같은 제어 기능
- 전체 prompt, 전체 tool input/output 저장

## Package와 배포 관련 발견

Phase 0 당시 local marketplace가 repository root를 가리키면 source tree 전체가 설치 경계가 될 수 있었다. 이후 `0.2.0` package는 npm `files` allowlist와 package-owned installer를 추가했다. `npm pack --dry-run`에서 manifest/catalog, logo assets, hooks, CLI, sender/capture scripts, skill, runtime/UI, README, LICENSE, NOTICE로 구성된 21 files를 확인했다.

`codex-agent-view install`은 package에 포함된 allowlisted entry만 runtime directory 아래 copied local marketplace로 옮긴 뒤 Codex plugin을 등록한다. npm package를 받았다고 hook trust를 자동 승인하지 않으며, 사용자 설정을 몰래 바꾸는 `postinstall`도 없다.

Maintainer npm account의 2FA `auth-and-writes` mode와 `pending:null`을 확인했고 `codex-agent-view@0.2.0` public registry publish를 완료했다. Registry의 version/license/bin, dist shasum/exact SRI와 signature를 확인했으며, public exact artifact는 isolated global install과 exact-version `npx` 양쪽에서 CLI lifecycle smoke를 통과했다. npm `gitHead`와 annotated `v0.2.0` tag는 commit `00b62af56698ac875e39c7d1386905c157c3a7e8`로 일치하고 tag source와 registry artifact의 21개 package file은 byte-identical이며 GitHub Release도 공개됐다. Universal Plugins Directory 제출은 npm과 별도 외부 절차다.

## Phase 0 권장과 `0.2.0`에서 확정한 아키텍처

```text
Codex hooks
  -> short-lived sender (minimize + bounded timeout + fail-open)
  -> token-authenticated IPv4 loopback HTTP
  -> narrow runtime validation
  -> bounded in-memory reducer
  -> read-only local status API and UI

App Server (선택)
  -> hierarchy/metadata enrichment only
```

설계 원칙은 다음과 같다.

- sender는 Codex 실행을 막지 않도록 짧은 timeout과 fail-open 관찰 경계를 가진다.
- 입력은 event별 narrow schema로 검증하되 unknown field를 허용하고 원본 전체를 저장하지 않는다.
- reducer는 중복, 누락, 역순 event와 monitor 재시작으로 생긴 `unknown` 상태를 표현한다.
- `0.2.0`은 cross-platform CLI와 browser UI 호환성을 위해 IPv4 loopback `127.0.0.1` transport를 선택했다. bearer token, Host 검증, body/time limit, restrictive response header를 적용한다.
- UI는 관찰만 하며 approval이나 task control을 제공하지 않는다.
- App Server 실패 또는 부재가 lifecycle 상태 표시를 깨뜨리지 않아야 한다.

## `0.2.0` 후속 구현과 `0.2.1` patch: 관찰에서 runtime schema로

Phase 0 capture는 원본 payload를 영구 model로 복사하기 위한 것이 아니라 어떤 field를 버릴지 결정하는 근거로 사용했다. 이후 구현은 다음 두 단계로 관찰값을 좁혔다.

1. `scripts/send-hook.mjs`는 Codex가 전달한 raw object를 local process에서 받고 `scripts/capture-hook.mjs`의 minimizer를 재사용한다. allowlisted metadata만 값을 보존하고 prompt, transcript path, tool input/output, assistant message 같은 나머지 field 값은 type/key/length summary로 바꾼 뒤 loopback으로 보낸다.
2. `src/core/normalize-hook-payload.mjs`는 minimized payload도 다시 untrusted input으로 취급한다. 지원 event별 required field를 runtime validation하고 monitor state에 필요한 field만 새 object로 복사한다. Summary와 unknown field는 reducer에 전달하지 않는다.

현재 normalized contract는 다음과 같다.

| Event | runtime에 유지하는 입력 field | derived state |
| --- | --- | --- |
| turn 공통 | `hook_event_name`, `session_id`, `turn_id`, local `received_at_ms` | normalized event type, session first/last seen |
| `SessionStart` / `SessionEnd` | `hook_event_name`, `session_id`, local `received_at_ms` | session start/end observed, observed/completed, out-of-order flag |
| `UserPromptSubmit` / `Stop` | turn 공통 field | root turn running/completed, out-of-order flag |
| `SubagentStart` / `SubagentStop` | `agent_id`, `agent_type` | running, stopped, stopped-without-start, out-of-order flag |
| `PreToolUse` / `PostToolUse` | `tool_name`, `tool_use_id` | running, completed, completed-without-start, out-of-order flag |
| `PermissionRequest` | `tool_name` | waiting-for-user permission state |

`PermissionRequest` row는 공식 event schema를 바탕으로 구현한 provisional input contract다. 실제 GUI payload 관찰이 없으므로 호환성이 확인됐다는 뜻이 아니다. Missing/invalid field는 상태를 발명하지 않고 bounded diagnostic으로 남긴다.

`SessionStart`, `SessionEnd`, `UserPromptSubmit`, `Stop`은 `0.2.1`에서 parent task가 subagent를 만들기 전에도 관찰 window에 나타나도록 추가했다. 이 wiring과 reducer fixture 통과는 공식 GUI가 해당 command hook을 실제 dispatch했다는 증거가 아니다.

Reducer는 event identity가 완전히 보장된다고 가정하지 않는다. 관찰된 ID를 상관관계 key로 사용하되 duplicate, stop-before-start, post-before-pre, stale permission event를 명시적 상태로 처리한다. Session, agent, activity, diagnostic collection에 상한을 두고 monitor restart 뒤 이전 event를 복구하거나 parent completion을 추측하지 않는다.

Runtime server는 `127.0.0.1` 외 bind를 거부하고, user-only runtime file에 저장한 random bearer token을 `/api/events`와 `/api/state`에 요구한다. Hook sender는 750ms timeout과 neutral `{}` response로 fail-open하며 monitor 장애가 Codex task를 막지 않게 한다. Browser는 URL fragment token을 `sessionStorage`로 옮기고 fragment를 제거하며 external asset/CDN을 사용하지 않는다.

정상 hook wiring은 이제 JSONL capture script가 아니라 `scripts/send-hook.mjs`를 실행한다. `scripts/capture-hook.mjs`와 `CODEX_AGENT_VIEW_CAPTURE_FULL=1`은 명시적 Phase 0 diagnostic opt-in으로만 남아 있으며 production state source가 아니다.

이 구현 결정은 “관찰된 field만 좁게 수용하고 민감한 원본은 저장하지 않는다”는 Phase 0 결론을 반영한다. Schema version은 현재 `1`이며, 향후 Codex payload 변경은 unknown/malformed diagnostic과 실제 재캡처를 근거로 별도 versioning해야 한다.

## Trust, 실행, 제거 절차

최종 GUI E2E에서는 다음 순서를 지킨다.

1. plugin source와 `hooks/hooks.json`, 실행 script를 검토한다.
2. 공식 앱/CLI의 plugin browser에서 plugin이 설치·활성화됐는지 확인한다.
3. 새 task/session을 시작한다.
4. hook browser에서 새 hook 정의와 command를 확인하고 현재 exact hash를 명시적으로 trust한다. CLI에서는 `/hooks`를 사용한다.
5. monitor를 실행한 뒤 subagent start/stop, 지원 tool pre/post, 실제 승인이 필요한 동작을 순서대로 발생시킨다.
6. `codex-agent-view status --json`과 local UI에서 minimized state와 diagnostic을 확인한다. 필요할 때만 별도 redacted capture로 wire payload key/type을 검증한다.

제거 시에는 다음 세 범위를 각각 확인한다.

1. plugin browser에서 plugin을 disable/uninstall한다.
2. hook browser에서 해당 hook source가 더 이상 활성 상태가 아닌지 확인한다.
3. `codex-agent-view uninstall`로 copied marketplace bundle을 제거하고, 사용자가 runtime directory까지 제거하길 명시적으로 원할 때만 exact target을 검토한 뒤 `--purge`를 사용한다.
4. 별도 opt-in diagnostic capture가 있다면 `PLUGIN_DATA`, configured capture directory, standalone fallback을 각각 확인해 정리한다.

hook 파일을 변경하면 기존 trust를 재사용할 수 없으며 새 hash를 다시 검토해야 한다.

## 외부 compatibility acceptance

`0.2.1` source 구현 뒤에도 다음 공식 앱 검증을 완료해야 현재 앱 조합의 compatibility evidence가 성립한다.

- 실행 중 monitor를 확인하고 `doctor --json`에서 plugin installed/enabled, hook bundle wiring, `events_received`를 기록
- 설치 전에 열려 있던 공식 앱을 완전히 종료·재실행
- interactive `/hooks`에서 현재 plugin hook source, command, exact hash를 검토하고 trust
- trust 뒤 **새 GUI task** 시작
- parent prompt와 subagent 한 개를 실제 시작·종료
- 일반 tool 한 개를 실행
- sandbox escalation 등 실제 approval prompt가 필요한 동작을 실행해 `PermissionRequest` 발생

이 과정에서 `events_received`가 계속 false이면 hook browser의 loaded source/trust 상태와 앱 진단 log를 함께 기록한다. Fixture 성공이나 monitor 연결만으로 공식 앱 호환 성공을 선언하지 않는다.

## 외부 distribution과 listing 작업

공개 배포에는 다음 제품 외부 운영 단계가 남아 있다.

- [x] maintainer npm login(`kyurasi`)과 `0.2.0` 코드·tarball 준비
- [x] npm account 필수 2FA `auth-and-writes`, `pending:null` 확인
- [x] `0.2.0` public registry publish 성공
- [x] public registry metadata, dist shasum/exact SRI와 registry signature 확인
- [x] public exact artifact isolated global install/`npx` `--version`, `doctor`, `install`, ephemeral-port `start`, `status`, `uninstall` smoke
- [x] 다섯 hook fixture event의 status/UI 반영, search/filter, browser console 무오류, purge 뒤 빈 plugin/runtime 상태 확인
- [x] npm `gitHead`와 annotated `v0.2.0` tag의 exact commit 일치, origin push, public GitHub Release, 21개 package file byte 일치 확인
- Universal Plugins Directory portal 제출, review, publish, search visibility 확인

README는 exact-version global install과 `npx`를 public npm 사용법으로 안내하고 검증 완료 범위를 요약한다. Directory publish 전에는 Universal Directory에서 검색 가능하다고 주장하지 않는다.

## QA 결과

- `npm test`: 통과, `55/55`
- 프로젝트 내부 plugin validation: 통과
- bundled skill `quick_validate.py`: 통과
- `npm pack --dry-run`: 통과, `codex-agent-view@0.2.1`, logo assets와 skill을 포함한 21 files
- package/plugin manifest version 및 final tarball metadata: `0.2.1` 일치
- source CLI `--version`: `0.2.1`
- installed `0.2.1` sender → monitor → UI fixture E2E: task ID를 사전 등록하지 않아도 parent와 agent가 hook에서 자동 생성됐고 running, waiting, completed 상태 반영 확인
- reset 뒤 source CLI `doctor --json`: plugin `installed: true`, `enabled: true`, hook `wiring_ok: true`, declared event 9개, monitor `events_received: false`, trust `unknown` 확인
- public registry metadata: `0.2.0`, `Apache-2.0`, `codex-agent-view` → `bin/codex-agent-view.mjs`, shasum/exact SRI/signature 확인
- public exact artifact: isolated global install과 exact-version `npx`의 CLI lifecycle smoke 통과
- public exact artifact E2E: 다섯 hook fixture event → status/UI, search/filter, browser console 무오류, purge 뒤 빈 plugin/runtime 확인
- release source match: npm `gitHead`와 annotated `v0.2.0` tag가 `00b62af56698ac875e39c7d1386905c157c3a7e8`로 일치, origin tag와 public GitHub Release 확인, 21개 package file byte-identical

Captured-evidence 기반 schema, bounded in-memory core, loopback runtime, read-only UI, explicit install/remove CLI, package/skill wiring은 구현됐다. `0.2.1` source/tarball과 installed fixture E2E는 통과했으며 `0.2.0`의 npm artifact smoke와 tag/release source 일치도 보존한다. 그러나 실제 공식 앱에서 event 0건을 재현했으므로 사용 가능한 GUI integration까지 완료됐다고 표현하지 않는다. 공식 앱 full restart + interactive `/hooks` trust + 새 GUI task E2E와 실제 `PermissionRequest`는 아직 acceptance 대상이며 `0.2.1` npm publish 성공도 주장하지 않는다. Universal Directory listing은 별도 external operation이다. 선택적인 npm provenance attestation은 `0.2.0`에 없으며 완료를 주장하지 않는다. 어느 항목도 SQLite/영구 history가 필요한 blocker를 뜻하지 않는다.
