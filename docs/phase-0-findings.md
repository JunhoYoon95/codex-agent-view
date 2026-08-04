# Phase 0 기술 검증 결과

검증일: 2026-08-01

## 결론

최소 plugin은 Homebrew Codex CLI와 공식 앱에 포함된 embedded Codex CLI 양쪽에서 설치·실행되었다. 실제 subagent 실행으로 `SubagentStart`, `SubagentStop`, `PreToolUse`, `PostToolUse` payload를 관찰했으며, lifecycle event를 로컬 read-only monitor의 입력으로 사용하는 방향은 기술적으로 가능하다.

다만 이것은 공식 앱 bundle에 포함된 CLI runtime 검증이지, Codex GUI의 현재 task가 plugin hook을 실행했다는 증거는 아니다. 후속 `0.2.0` 실사용에서는 plugin 설치·enable과 monitor 실행이 정상이었는데도 동일 공식 앱 process에서 실제 subagent 2개를 실행하는 동안 event가 0건이었다. 앱 log에도 `send-hook.mjs` 실행 흔적이 없어서 문제를 UI/reducer가 아니라 app → plugin hook command 경계로 좁혔다.

해당 app process에는 plugin 설치 전 `hooks/list` 응답이 있었고 설치 뒤에도 process가 유지됐다. 이는 stale config/hook snapshot 가설과 일치하지만 인과관계를 확정하지는 않는다. 또한 `codex plugin list --json`은 persisted exact-hook trust를 노출하지 않아 config snapshot과 untrusted hook skip을 자동 진단으로 분리할 수 없었다. 따라서 당시 실패 원인을 “재시작 부족”으로 단정하지 않는다.

Phase 0의 repository 조사와 구현 입력 정리는 완료됐다. Public npm `latest`/version은 `0.5.4`이며 registry metadata·digest, source-pack identity, exact reinstall, main/tag CI, annotated tag와 GitHub Release를 확인했다. Current source/package `0.5.5`는 작업 상태 필터를 상위 작업의 현재 상태에만 매치하는 patch release candidate다. 하위 agent와 recent activity history는 카드 포함 조건에서 제외한다. Assignment에는 공식 exact correlation ID/key가 없어 제한된 시간창의 candidate 1개와 새 agent 1개만 bounded/best-effort로 연결하며 concurrent ambiguity는 unavailable로 유지한다. `0.5.5` public release evidence는 실제 배포·검증 전에는 기록하지 않는다. Historical `0.2.1` 공식 앱 E2E에서는 task ID 등록 없이 parent 3개와 subagent 3개 자동 표시와 실제 hook 8종을 확인했다. `0.3.0` E2E에서는 공식 앱 내장 thread tools로 `kyurasi-next-supabase`의 explicit `inProgress` snapshot과 직후 `idle + hasUnreadTurn` 전환을 확인했으며, 후자는 별도 확인 대기 표시의 근거이지 완료·성공 추론의 근거가 아니다. Browser monitor에서는 실제 `SessionEnd` lifecycle 반영을 관찰했다. Historical public evidence는 아래에 보존한다.

Public `0.5.0`은 사용자가 `@codex-agent-view` 또는 plugin Quick start를 한 번 실행하면 internal skill이 `codex-agent-view open`을 한 번 호출해 authenticated local view를 운영체제 기본 browser에 여는 구조를 배포했다. 사용자는 별도 `$show-agents` picker, panel 권한, localhost URL 복사나 monitor terminal command를 사용하지 않는다. Bundle에 남은 skill 하나는 plugin 실행 capability이지 user-facing 두 번째 단계가 아니다. Browser tab을 닫거나 credential 없는 새 tab/family 만료가 발생하면 `@codex-agent-view`를 다시 실행하고, 기존 인증 tab의 transient failure는 page retry/**Reconnect**로 처리한다. Hook, loopback-only transport, read-only와 bounded in-memory product boundary는 바뀌지 않는다.

Release 당시 public npm `latest`/version `0.5.0`, shasum `bf89ee665840e62d502551d87d7faaed2a1e0206`, integrity `sha512-W8rOv+0Xb5SVsFl/kXHF/vt9CJ/Su0rwDWVFWLWYWhKidZTxx+ea9Z0dtd65k3KBxucLRuwMOUJL3BtHr2p2Dw==`, registry signature와 23 files를 확인했다. Registry artifact SHA-256은 `e23c4ea484fa6186c17f2c564b5019a08eb6acca10f99fc85bf95e2f2757bc2c`다. Main CI `30816426733`은 Node.js 18/20/22에서 통과했다. This-device public exact reinstall에서 CLI/plugin `0.5.0`, installed/enabled, hook wiring 9종과 `events_received: true`를 확인했다. 공식 앱 actual subagent start/stop의 최종 상태는 `stopped`였다.

그 official E2E는 Codex가 자동 첨부한 `in-app-browser-context` block이 task summary에 섞이는 결함도 드러냈다. Public `0.5.1`은 summary 정규화 전에 해당 ambient wrapper를 제거하는 bounded patch다. Public npm `latest`/version `0.5.1`, shasum `ca9b1e61ce8139f62a5f3016c81973d8bf1ea1ac`, integrity `sha512-tvz3oN+F5sMW0at+17FEDGoC4FO8LfBJUjBBYmYmvKtIsyPhhqJ+irPfd/8Uws+Bn5QMjtYcLzG/rBEXtGQ6UQ==`와 npm signature 1개를 확인했다. Registry tarball과 release tarball은 byte-identical이며 SHA-256은 모두 `e540adcc4205eb6c1026f6a17864ac1a44e925696e0ff5ac659cba95402cf447`이다.

This-device public exact `0.5.1` global reinstall에서 CLI/plugin `0.5.1`, installed/enabled, hook wiring 9종과 `events_received: true`를 확인했다. Main CI `30818761050`과 tag CI `30825304988`은 성공했고 tag CI는 Node.js 18/20/22를 통과했다. Annotated `v0.5.1` tag와 [GitHub Release v0.5.1](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.5.1)을 확인했다. 실제 official `SubagentStart`/`SubagentStop` live UI E2E에서 running agent 수가 1에서 0으로 바뀌고 대상 agent가 completed/stopped로 끝나는 것을 확인했다.

다만 official `task_summary` live prompt는 monitor가 해당 task의 `UserPromptSubmit` 뒤에 시작되어 이번 관찰 window에서 확인하지 못했다. Actual ambient wrapper fixture를 사용하는 core/store/live automated tests는 통과했지만, 이것을 official live prompt 관찰로 표현하지 않는다.

Version `0.5.2`는 plugin-level starter text를 제공하지 않는다. 사용자가 task에서 `@codex-agent-view` 자체를 선택·전송하면 내부 single skill이 `open`을 실행하는 contract를 유지한다. npm `latest`/version `0.5.2`, publish time `2026-08-03T18:45:19.094Z`, shasum `58a3841a73f8dec2060710962f4bfd0273931fec`, integrity `sha512-ugMRzbmWI2Fp5QGtwuze9yC3SNspq5Uua/FL/9YMj1OBVlq9JXigqRiHnZgOjWny15QXJ6wLi8z2MN8vAgq53A==`, signature 1개와 23-file artifact를 확인했다. Packed size는 `62.5 kB`, unpacked size는 `251.2 kB`, tarball SHA-256은 `6292b1a9a93fe0ede6054362544b609991322adf37b44611e35c4d0ec74c174b`다.

Release source `9227bff6526978e4d8f8fc48b047ffcbf44f5599`의 pack과 registry tarball은 byte-identical하다. Main CI `30842520151`과 tag CI `30842851244`은 Node.js 18/20/22에서 성공했다. Annotated `v0.5.2`와 [GitHub Release v0.5.2](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.5.2)는 public이다. Public exact global reinstall에서 CLI/plugin `0.5.2`, registry-extract와 installed files diff-identical, plugin installed/enabled, hook wiring 9종, monitor ok, `events_received: true`, sessions 1을 확인했다. Hook trust는 CLI에서 관찰할 수 없어 `unknown`이다. 실제 Codex 앱에서 Assigned work와 Current activity를 관찰했고 사용자가 정상 동작을 확인했다.

Bundled validator의 `defaultPrompt` 요구와 Universal Directory portal/reviewer/search exposure는 별도 pending/unverified다. Plugin 카드가 promptless **지금 사용해보기** control을 제공하는지도 미확인이다.

Public `0.5.4`의 README 문구는 `Open each view with one lightweight \`@codex-agent-view\` invocation. Once open, live monitoring runs locally with no additional model calls.`이며 한국어는 `각 화면은 가벼운 \`@codex-agent-view\` 실행 한 번으로 엽니다. 화면이 열린 뒤 실시간 모니터링은 추가 모델 호출 없이 로컬에서 작동합니다.`이다. 이어서 관찰 대상 task/subagent의 일반적인 model·token 사용은 계속됨을 명시한다. Package/plugin detailed description은 `A read-only Codex plugin for monitoring live tasks and subagents in your browser. Open each view with one lightweight @codex-agent-view invocation. Once open, live monitoring runs locally with no additional model calls.`이다. GitHub remote는 `PUBLIC`, short Description `A lightweight, read-only dashboard plugin for monitoring Codex tasks and subagents in real time.`, npm Website와 Topics 13개를 재조회해 확인했다.

npm `latest`/version `0.5.4`, publish time `2026-08-03T20:24:33.437Z`, current detailed description, `Apache-2.0`, keywords 13개, shasum `c77eb53a0f7d170bc0259a604dbbb8f6a85e4bb4`, integrity `sha512-c0fhYlHJRHbFWbON2+DhJVuBoLiXyW9Bp9bSZhZLKML+a8MvhQxqSdTYr1fvwO3dESa1IO0WVZ4sLWucljsESA==`와 signature 1개를 확인했다. Artifact는 23 files, packed `62.9 kB`, unpacked `252.8 kB`, SHA-256 `58ef4f976b1ee5cc255559a037dbe0ac0cefaa5c642084ddd123d1a6f272606c`이며 local release/registry tarball은 byte-identical하다.

Release source `3312be0bf7ebbeb5694a857089796903410d9b9c`의 main CI `30849631485`와 tag CI `30850278542`는 Node.js 18/20/22에서 성공했다. Annotated `v0.5.4` tag는 release source를 가리키고 [public non-draft/non-prerelease GitHub Release](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.5.4)는 `2026-08-03T20:27:36Z`에 공개됐다. This-device public exact global package와 CLI `0.5.4`, plugin installed/enabled, valid hook bundle과 registry install entries 13개/runtime files 22개 일치를 확인했다. Exact install 뒤 monitor는 stopped, hook trust는 CLI-unobservable `unknown`이다. 앱 restart/new-task actual hook+assignment E2E는 pending이며 재시작 전 current-task canary의 event 부재를 성공이나 실패로 단정하지 않는다.

Historical public `0.5.3`의 제품 설명은 Codex의 live task와 subagent activity를 browser에서 local로 보여주는 lightweight read-only companion이다. Privacy/terms는 exact invocation의 token 양을 보장하지 않으며 관찰 대상 task/subagent가 정상 token을 계속 사용한다는 정확성 경계를 유지한다. 이 문구 변경은 hook payload, 저장 범위, loopback transport나 read-only 권한을 바꾸지 않는다.

npm `latest`/version `0.5.3`, publish time `2026-08-03T19:29:03.590Z`, agreed description, keywords 13개와 `Apache-2.0` license를 확인했다. Shasum은 `94b60ff4662b829ca5853439e4da0cef4466927d`, integrity는 `sha512-r59F+z19gehSiKlhsRpcaPDiIwXFBtUXXjaUIVr1RiWotV4CBXGMI95Se8BmJ0g/gBPUOsvewm4NvVIv3IK0DQ==`, signature 1개이며 23 files, packed `62.9 kB`, unpacked `252.8 kB`다. Registry tarball SHA-256은 `125abefe16b600d12b5f81dc93f96da89c6742be76522a98d45f996b53805cbd`이고 source commit `4b79e1b0645405927e22752a52d6900a9d02a2a2` pack과 byte-identical하다.

Main CI `30845807979`는 Node.js 18/20/22에서 성공했고 tag CI `30846142549`도 성공했다. Annotated `v0.5.3`과 [GitHub Release v0.5.3](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.5.3)는 public이다. npm README/description/keywords/license를 확인했고 public exact global reinstall의 CLI/plugin `0.5.3`, installed files diff identity, plugin installed/enabled와 hook wiring 9종을 확인했다. Install 뒤 monitor는 앱 재시작 전 `monitor_not_running`, hook trust는 CLI-unobservable `unknown`이다. Codex 앱 재시작/new task actual event와 public exact `@codex-agent-view` invocation E2E는 pending이다.

GitHub remote repository metadata는 실제 적용 뒤 재조회했다. Visibility는 `PUBLIC`, Description은 `A lightweight, read-only Codex companion plugin for monitoring live tasks and subagent activity locally in your browser, without additional ongoing model calls for monitoring.`, Website는 `https://www.npmjs.com/package/codex-agent-view`다. Topics는 `agent-monitoring`, `ai-agents`, `codex`, `codex-plugin`, `developer-tools`, `local-first`, `multi-agent`, `npm-package`, `observability`, `openai-codex`, `privacy-first`, `read-only`, `subagents` 13개다. 이 remote metadata 확인이나 npm/GitHub release는 Universal Directory submission·review·검색 노출을 뜻하지 않는다.

Repository validation/tests, local Codex install/cache ingestion과 official-app behavior는 npm 공개 근거다. Bundled plugin-creator validation은 Universal Plugins Directory 제출 경계로 별도 추적하며 npm 공개 완료 조건으로 사용하지 않는다. Local ingestion이나 npm artifact 공개도 Directory eligibility·review·검색 노출 증거는 아니다.

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

후속 actual live snapshot에서는 `SubagentStart.turn_id`와 그 subagent 내부에서 발생한 tool event의 `turn_id`가 에이전트 3명 모두에서 exact match했다. 이 관찰은 에이전트별 최신 tool lifecycle을 사람이 읽는 현재 작업 문구로 표시할 근거다. 다만 `turn_id` 자체를 전역 unique identity로 승격하지 않는다. Current core는 같은 session에서 해당 `turn_id`를 가진 agent가 정확히 한 명일 때만 latest tool의 `current_tool_name`, `current_tool_status`, `current_tool_observed_at_ms`를 연결한다. 일치 agent가 없거나 둘 이상이면 시간 인접성이나 FIFO 순서를 사용하지 않고 연결을 생략한다.

초기 Phase 0 probe에서는 `PermissionRequest`가 발생하지 않았다. 후속 공식 앱 `0.2.1` E2E에서는 실제 `PermissionRequest` dispatch와 read-only waiting 표시를 확인했다. 다만 raw diagnostic capture를 사용해 전체 payload field set을 확정한 것은 아니며 runtime은 실제 전달된 최소 field만 좁게 수용했다.

## 공식 앱과 CLI의 차이

| 항목 | 확인 결과 |
| --- | --- |
| Homebrew CLI | `0.146.0`에서 isolated install/runtime 성공 |
| 앱 embedded CLI | `0.146.0-alpha.9.2`에서 isolated install/runtime 성공 및 6개 lifecycle/tool event 관찰 |
| 현재 GUI task | plugin을 task 도중 추가한 뒤 worker를 시작·종료했으나 캡처 없음 |
| `0.2.0` 실사용 재현 | 설치·enable·monitor가 정상인 상태에서 subagent 2개 실행, monitor `updated_at_ms: 0`, `sessions: []`, app log sender 실행 흔적 없음 |
| GUI 미캡처 해석 | 설치 전 `hooks/list` snapshot 유지 정황이 있으나 config snapshot 또는 untrusted hook skip 가능성을 분리하지 못함. hot-load 불가나 restart 해결을 단정하지 않음 |
| Trust 관찰 한계 | `codex plugin list --json`으로 installed/enabled는 확인 가능하지만 persisted exact-hook trust는 확인 불가. interactive `/hooks` 검토가 필요 |
| `0.2.1` 공식 앱 E2E | 재시작한 앱 `26.727.40816`(`build 6067`)에서 parent 3개·subagent 3개 자동 표시, 실제 hook 8종과 permission waiting 확인 |
| `0.2.1` GUI 결론 | 확인된 8종 event 경로는 호환 확인. `SessionEnd`는 이 historical E2E에서 미관찰 |
| `0.3.0` source E2E | 앱 내장 tools에서 `inProgress` snapshot과 직후 `idle + hasUnreadTurn` 전환 확인. 후자는 running과 분리해 표시하되 완료·성공으로 추론하지 않음. Browser monitor에서 실제 `SessionEnd` lifecycle 반영 관찰 |

앱 embedded executable을 직접 실행한 결과는 해당 executable과 plugin runtime의 호환성 증거다. GUI가 그 executable을 어떤 config/trust lifecycle로 실행하는지까지 증명하지는 않는다.

## App Server 조사

[공식 App Server 문서](https://learn.chatgpt.com/docs/app-server)는 다음을 제공한다.

- `thread/list`: 저장된 thread log와 runtime `status` 조회
- `thread/loaded/list`: 그 App Server process에 현재 load된 thread ID 조회
- `parentThreadId`, `ancestorThreadId`: `thread/list`의 experimental filter이며 `capabilities.experimentalApi = true` 필요

격리된 임시 home으로 별도 App Server를 시작한 probe에서는 `thread/loaded/list`와 `thread/list`가 모두 비어 있었다. 후속으로 Codex `0.146` App Server의 persisted `thread/list` fallback도 실제 검증했으나 현재 root와 subagent 모두 `notLoaded`로 나타나 공식 앱의 live running/completed 상태를 공유하지 않았다. Persisted `parentThreadId`, alias, depth는 계층 metadata로 복원할 수 있었지만 live lifecycle 판별에는 사용할 수 없었다. 공식 앱 daemon에 attach할 수 있는 control socket도 발견하지 못했다.

따라서 별도로 실행한 App Server는 optional metadata enrichment 후보로만 둔다. 이는 현재 공식 Codex 앱이 직접 노출하는 내장 thread tools와 다른 process/capability다. `0.3.0`의 primary snapshot은 앱 내장 tools의 bounded read를 사용하며, 별도 App Server를 공식 앱 live source로 간주하지 않는다. Persisted fallback은 state DB read와 privacy/복잡도 비용을 추가하면서 현재 활동을 정확히 판별하지 못하므로 채택하지 않았다.

## 가능한 것과 아직 불가능하거나 미확인인 것

### 기술적으로 확인된 것

- plugin의 기본 `hooks/hooks.json`에서 lifecycle command를 실행할 수 있다.
- start/stop의 `session_id`와 `agent_id`로 subagent lifecycle을 상관시킬 수 있다.
- collaboration tool과 Bash의 pre/post activity를 관찰할 수 있다.
- payload를 값 없이 key/type 중심으로 redaction해 기술 검증할 수 있다.
- monitor core를 외부 DB 없이 bounded in-memory reducer로 구현했고, live companion의 완성 architecture로 채택했다.
- 공식 앱 내장 thread tools로 workspace를 넘나드는 active task의 explicit status, 최신 explicit commentary와 `subAgentActivity`를 bounded snapshot으로 읽을 수 있다.
- Explicit active status와 `idle + hasUnreadTurn`을 구분해 후자를 별도 확인 대기 그룹에 표시할 수 있다. `idle` 또는 unread만으로 성공이나 완료를 추론할 수는 없다.
- `Stop`은 root turn과 session/work-item 요약을 즉시 `completed`로 표시한다. 당시 진행 중인 child agent/tool row는 자체 종료 신호 미관찰 상태인 `completion_not_observed`로 분리한다. `SessionEnd`는 terminal priority를 가지며 그 시점의 orphan agent/tool/permission을 `interrupted`로 정리한다.
- 종료 hook을 관찰하지 못한 active state는 기본 5분 동안 새 event가 없으면 `completion_not_observed`로 표시할 수 있다. 이는 종료 관찰 실패 상태이며 완료 또는 성공 판정이 아니다.
- 전체 `cwd` 대신 control-character 제거, whitespace 정규화, 최대 120자의 basename `workspace_label`만 optional monitor의 process memory에 유지할 수 있다.
- Live task/event state를 process-local bounded memory에만 유지하면서, task content가 없는 read-only viewer credential만 설치 수명 private file로 분리해 열린 Codex tab의 restart/upgrade 재연결을 지원할 수 있다.

### 아직 미확인인 것

- GUI task의 plugin/hook hot-load 지원 여부
- GUI `PermissionRequest` raw payload의 전체 field set
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

후속 `codex-agent-view@0.2.1`도 public npm registry의 `latest`로 publish됐다. Version/license/bin, npm `gitHead` `8d6a67c9aafa23f801235d747ff018d254378970`, 21 files, unpacked size `144644`, shasum `ad17b8d1f179d99ea07ff128021d9708f73b1961`, exact SRI와 registry signature를 확인했다. Annotated `v0.2.1` tag는 같은 commit에 생성·origin push됐고 public GitHub Release가 공개됐다. Clean temporary cache의 exact-version `npx --version`이 성공했으며 registry tarball 21개 file은 tagged source와 byte-identical하다. 이 기기에 public exact artifact를 global로 다시 설치해 copied marketplace까지 registry tarball과 21개 file byte-identical임을 확인했고, CLI `0.2.1`, plugin installed/enabled, hook wiring 9종, 실제 session 자동 수신과 probe subagent running → stopped/UI 완료 반영을 검증했다.

Historical `codex-agent-view@0.3.0`은 릴리스 당시 public npm `latest`였다. npm `gitHead` `988132d0b525ee5e63f13a0d924810dd3f1bd93a`, shasum `08e2e5fa8c1133a1dcc3faae8f354535f9fc07b0`, exact SRI, registry signature, 21 files와 unpacked `158.8 kB`를 확인했다. Annotated `v0.3.0` tag가 origin에 push됐고 [public GitHub Release](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.3.0)가 공개됐다. 이 기기의 exact global reinstall은 plugin installed/enabled와 hook wiring 9종을 확인했고 registry tarball ↔ global diff는 0, marketplace는 ownership marker 1개 외 artifact files가 동일했다. Public install monitor는 `workspace_label: codex-agent-view`, 실제 `PermissionRequest`와 tool lifecycle을 수신했고, probe subagent는 `SubagentStart` running → `SubagentStop` stopped, `has_out_of_order_events: false`로 반영됐다.

Historical `codex-agent-view@0.3.1`은 npm `gitHead` `c515ea28be201dc24d31e13bf465a38145050b69`, shasum `4405b183012c04e7b0bc265d4eb14bf85291dcd9`, integrity `sha512-8oF5uHqZobgPt75I2ymoq3/tx4Ab1YX/cvMPjaJHjV7zxVC5Dh318isoCdsKNi6emXEbiTIdxOgX7GcclyuP8A==`, 21 files를 확인했다. Annotated `v0.3.1` tag와 [public GitHub Release](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.3.1)가 공개됐고, 이 기기 재설치에서 plugin `installed: true`, `enabled: true`를 확인했다. Exact `0.3.1` app-only E2E 완료는 주장하지 않는다.

Historical public `codex-agent-view@0.3.2`는 npm `gitHead` `4f4f92dc872d9b782efe900cc1397bdccf7d2c8a`, shasum `2851544c75a0a5fb20a2865196ab54b566b373d8`, integrity `sha512-MPwFP3CjhehkIzyV3ja0/rWzLyK4tJI7jjsczKN16aXpKEr/dvtc/aljjqW/41zatZrQG32ccKKMJjYNyW6Tww==`, registry signature, 21 files, package `46856 B`, unpacked `167060 B`를 확인했다. Annotated `v0.3.2` tag와 [public GitHub Release](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.3.2)가 공개됐고 main/tag CI가 통과했다. 이 기기의 exact global install은 plugin `installed: true`, `enabled: true`이고 registry artifact mismatch는 0이다. App-native thread snapshot은 worker activity 3개를 확인했다. 내장 Browser monitor 연결은 성공했지만 재설치 전 앱 process의 follow-up subagent 3개는 hook event를 0건 전달했으므로 exact live hook E2E는 앱 full restart/new-task 뒤 검증한다.

Public `codex-agent-view@0.4.0`은 npm `latest`/version `0.4.0`, shasum `cc379e593f4cafa5dd56f32e6741eab5ba3f4497`, integrity `sha512-uS0zOoxqboqwtqtBerDdpkNujY4v0hJ1ag96vXPFXZ1eWuHbUlZlKiO9yH2tip4ABxElNEyIT7K0lABE2z29DA==`, registry signature, 25 files, package `52614 B`, unpacked `189181 B`를 확인했다. npm metadata에는 exact tarball publish 특성상 `gitHead`가 없으므로 tag 일치를 `gitHead`로 주장하지 않는다. 대신 실제 publish tarball과 registry tarball이 byte-identical임을 확인했다. Annotated `v0.4.0` tag는 release commit `11f7b0511a39c5f5a61cb6da7b91fb3b8e915c6b`을 가리키고 [public GitHub Release](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.4.0), main CI `30707999873`, tag CI `30708301281`이 공개·성공했다. 이 기기에 public exact artifact를 다시 설치해 CLI/plugin `0.4.0`, installed/enabled, hook wiring 9종, 실제 event 수신과 sessions 7을 확인했다. Show Agents visual panel은 앱 완전 재시작/new task 전이라 완료를 주장하지 않는다.

Public `0.4.0` manifest의 `defaultPrompt: ["Show Agents"]`는 plain plugin-level text starter였다. 이 starter는 implicit invocation이 disabled된 bundled `show-agents` skill을 호출하지 않았으므로 plugin 카드의 **바로 사용하기**/Quick start 동작 자체를 live 화면 실행으로 취급한 안내는 잘못이었다. Public `0.4.1`은 이를 `Open @ and select the bundled Show Agents skill.`이라는 instructional starter로 교체했지만, Quick start는 이 안내 text를 붙일 뿐 호출하지 않았다. Public `0.4.8`까지는 명시적 skill 선택을 요구했다. Public `0.5.0`과 `0.5.1`은 내부 browser-launch skill 하나로 user-facing `$show-agents` picker를 제거했지만 `defaultPrompt` 자체는 여전히 optional starter-text metadata였다. Version `0.5.2`가 그 metadata를 제거한다.

Public `codex-agent-view@0.4.1`은 npm `latest`/version `0.4.1`, Apache-2.0, executable mapping, shasum `ee2ae0b8b36016f5c57bade067027202b1508d1d`, integrity `sha512-WC4f5MPmvpkXeKM+1BVAYqW4+hoaUrB4yQFoUYgc0pnjyY7hP1CdSR5NJ3QWmvJ6Ikmmb1d+58UL4hkKoyhm1Q==`, registry signature, 25 files, package `53650 B`와 unpacked `193424 B`를 확인했다. Release tarball과 registry tarball은 byte-identical이다. Exact tarball publish로 npm metadata에 `gitHead`가 없으므로 그 field를 통한 source 일치는 주장하지 않는다. Annotated `v0.4.1` tag는 commit `a1de67be5413fa38b8dd1b62f74353463f6e641e`을 가리키고 [public GitHub Release](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.4.1), main CI `30710490358`, tag CI `30710848474`가 공개·성공했다. 이 기기에 public exact artifact를 다시 설치해 CLI/plugin `0.4.1`, installed/enabled와 hook wiring 9종을 확인했다. Runtime은 install 교체 중 정상 종료돼 현재 `monitor_not_running`이고 persisted hook trust는 `unknown`이다. 앱 process가 설치 전부터 열려 있었으므로 앱 완전 재시작/new task의 direct Show Agents visual E2E는 미확인이다.

Public `0.4.2`는 manifest starter text를 exact `$show-agents`로 바꾸고 plugin 카드의 재오픈 shortcut으로 의도했다. 후속 실제 앱 사용에서는 이 text가 skill dispatch가 아니라 plain text로 남을 수 있음을 확인했으므로 이 문단은 자동 호출을 주장하지 않는다. 기본 화면은 실행 중인 부모 task와 subagent를 먼저 정렬하고 사람이 읽을 수 있는 workspace/task/agent label과 상태 문구를 주 정보로 사용한다. Prompt, preview, tool input/output과 full workspace path는 표시하지 않는다. Release commits `b4d923a`/`3d8f46d`, main CI `30712375726`, npm shasum `fac95689395baa26f4ad9ff0cbefd0017d2ebd8d`, integrity `sha512-FRTPoYxjBuPC6Usb+ylSfZsZVJKlKcHnQPaAPljekg0maTPn9POsBkS+auOcHz5jspg0AXcP8R63PM0WfCn2LQ==`, registry signature, release/registry tarball byte 일치, annotated tag/GitHub Release, this-device install/artifact/plugin/hook wiring과 official Codex in-app Browser visual E2E를 확인했다.

Public `0.4.3`은 user-only private file의 read-only viewer credential을 runtime/control token과 분리한다. Viewer credential은 `/api/state` 읽기만 허용하고 event ingest와 shutdown은 거부한다. Runtime/control token은 monitor process마다 교체되지만 viewer credential은 한 설치 수명 동안 유지되므로 이미 열린 Codex live tab은 같은 fixed loopback origin에서 backend가 돌아오면 일시 단절·monitor restart·upgrade 뒤 자동 재연결한다. 실제 migration E2E에서 연결된 `0.4.2` legacy tab은 install이 viewer token을 seed하고 old monitor를 종료하는 동안 인증 오류 없이 retrying을 유지했으며, installed `0.4.3` hook sender가 monitor를 auto-start한 뒤 같은 tab이 connected로 돌아와 workspace와 agent를 표시했다. 이 credential file은 event store가 아니며 live task/event state는 계속 bounded process-local memory뿐이다. Restart 뒤에는 과거 state를 복구하지 않고 새 관찰 window를 시작한다.

Public `0.4.4`는 package/plugin manifest version을 동기화하고, plugin-level starter/default prompt 제거, `CODEX_THREAD_ID` 기반 viewer task 제외, English 기본의 English/한국어/Español selector, 2초 polling과 toggle 없는 inline activity/technical metadata를 포함한다. 실제 `SubagentStart`에서 dedicated assignment description을 확인하지 못했으므로 prompt/tool input에서 설명을 추론하지 않는다.

Public npm `latest`/version `0.4.4`, shasum `482520d471b3ef04204f026b52237ac77407a99f`, integrity `sha512-q0j/s5D6Hw0GV0x/CIkHRdM7U9uONqb2gmMguesC7BzTG4znbj35XKXqjMl5dJSc9O/GaYMj6lNCOqLdCiYdoA==`, registry signature, 25 files, package `70.4 kB`와 unpacked `250.6 kB`를 확인했다. Release tarball과 registry tarball은 byte-identical이다. This-device public exact reinstall에서 CLI/plugin `0.4.4`, installed/enabled와 hook wiring 9종을 확인했고 `doctor`는 events true, sessions 7개를 보고했다.

Official Codex in-app Browser live E2E에서는 reload/reinstall 뒤 auth valid, visible URL fragment 제거, current viewer task 제외, disclosure 0과 en/ko/es 전환을 확인했고 English 선택은 reload 뒤에도 유지됐다. Private token, URL과 task ID 값은 기록하지 않는다. Main CI `30717562576`과 tag CI `30717744653`은 성공했다. Annotated `v0.4.4` tag는 `1bedf47d2185d2a14a3c96536e57aef0719b767a`를 가리키고 [GitHub Release v0.4.4](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.4.4)는 public이다.

Public `0.4.5`는 UI 용어를 “작업과 참여 에이전트”로 정리하고 부모 작업의 session ID를 주 UI에서 제거했다. `UserPromptSubmit`의 처음 최대 4,096자에서 credential·email·link·absolute path를 placeholder로 가리고 한 줄·최대 180자로 제한한 `task_summary`를 local-only로 만든다. 한 session에서는 첫 유효 작업 개요만 유지하며 전체 prompt나 tool input을 state에 저장하지 않는다. Official `SubagentStart`에 없는 개별 agent assignment 설명도 추론하지 않는다. 연결 실패에는 retry button을, credential 없음/거부에는 현재 tab 인증 재검사 button과 앱에서 실제 `$show-agents` skill을 다시 선택하는 안내를 제공한다. Release validation의 unit/sender integration tests에서 credential·email·link·absolute path redaction, 한 줄·길이 제한과 raw prompt 미전송을 확인했다.

Public npm `latest`/version `0.4.5`, shasum `d5c1f593ae7e48e226e396d02579cd7f9ef8d01e`, integrity `sha512-LeegHcrzmCgRjNP/T+8OPXzFT/RYBp33UfKG1nPmBPnZHYQJdFTY2GGY3rK9/lQfS3PEo9oL7MG3wBY5A5LFaw==`, registry signature, 25 files, package `74.5 kB`와 unpacked `263.0 kB`를 확인했다. Release tarball과 registry tarball은 byte-identical이다. This-device public exact reinstall에서 CLI/plugin `0.4.5`, installed/enabled와 hook wiring 9종을 확인했고 `doctor`는 `events_received: true`, sessions 9개를 보고했다.

Official Codex in-app E2E에서는 새 copy, placeholder로 정제된 bounded safe work summary 표시, session ID 비노출, current viewer task 제외, en/ko/es 전환, auth missing/rejected recovery button을 확인했다. Main CI `30732189017`과 tag CI `30744341373`은 성공했다. Annotated `v0.4.5` tag는 release code commit `1df8f0b`을 가리키고 [GitHub Release v0.4.5](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.4.5)는 public이다. 이 증거는 Universal Directory 제출·승인·검색 노출이나 별도 npm provenance attestation 완료를 뜻하지 않는다.

Public `0.4.6`은 `SessionEnd` terminal priority, orphan activity의 `interrupted`/`completion_not_observed` 표현, late event 차단과 resume epoch reset을 추가했다. Public exact install sender → monitor E2E와 in-app Browser의 Connected/Completed/End not confirmed/Interrupted/en-ko-es 표시를 확인했다. 그러나 배포 뒤 별도의 실제 official-app `SubagentStart` → `SubagentStop` 재현에서는 agent map이 stopped로 바뀐 뒤에도 recent `subagent_started` row가 running으로 남았다. 이 post-release gap을 숨기지 않으며 `0.4.6`이 recent activity까지 완전했다고 주장하지 않는다.

후속 `0.4.7` source candidate tests에서 normal/late `SubagentStop`과 `PostToolUse`가 대응 earlier start activity를 stopped/completed로 refine함을 확인했다. 전체 tests `126/126`, plugin validation과 npm pack validation이 통과했다. 이 source candidate evidence는 public artifact 설치 후 공식 앱 hook delivery 검증과 별개다.

Public npm `latest`/version `0.4.7`, shasum `5fc4c73ba16fe1bef79c468f0a0be3d3850a7ce7`, integrity `sha512-kdwpnKc21i7iW6kpIg2ogUmDsTp8QGMhIif0yIh3n/mpmdiB+AEsy6hjzzO56clLbCpgejkKhqJfDSG4txkN2g==`, registry signature, 25 files, package `78.0 kB`와 unpacked `278.8 kB`를 확인했다. Release-source/registry SHA-256 `d2ac82fde4b038aa301b776f78546d9f8a4136f7677090b2263a3aeb9081876c`와 `cmp` byte-identical을 확인했다. Source commit은 `f00116826a34389624a2815a043421855398f019`다.

This-device public exact reinstall에서 registry extract/global install diff 0, CLI/plugin `0.4.7`, installed/enabled와 hook wiring 9종 valid를 확인했다. 별도의 installed public runtime E2E에서 monitor `/api/events`에 synthetic `SubagentStart`, `PreToolUse`, `Stop`, late `PostToolUse`, late `SubagentStop`을 순차 ingest한 결과 session completed, agent stopped, tool completed, earlier agent start stopped, earlier tool start completed와 false running rows 0을 확인했다. Monitor restart 뒤 QA session 제거와 0 tasks도 확인했다.

Main CI `30763034343`은 Node.js 18/20/22에서 성공했고 tag CI `30763153320`도 성공했다. Annotated `v0.4.7` tag는 `f001168`을 가리키고 [GitHub Release v0.4.7](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.4.7)은 public, `draft: false`, `prerelease: false`다. Package replacement와 clean monitor 직후에는 같은 공식 앱 process에서 initial none observed였지만 이후 later actual hooks가 전달돼 status에서 2 tasks/3 subagents를 관찰했다.

Public `0.4.8`의 `npm run check`는 전체 153/153 tests, plugin validation과 package dry-run을 통과했다. Public npm `latest`/version `0.4.8`, shasum `4ede86be395a7175335cb1a016b67afbb2617606`, integrity `sha512-bYdPvclbT6oD2fnX3TNy30D4g3bMN24dfZ+D5PyekiUlNybBNLxSPr6bjXwQiVEFpW9Q9J7dc1DkdaMstvkszw==`, registry signature, 25 files와 unpacked `311488` bytes를 확인했다. Release tarball과 registry tarball의 SHA-256은 `402c25286dff47dd590ec4ea128a45fde70e76719abbdb990b8ed61c36a08fc1`로 같고 byte-identical이다.

Main CI `30806601086`은 Node.js 18/20/22에서 성공했다. Annotated `v0.4.8` tag object `ed6561e929d3b2237acb223de037596663f4dc45`는 commit `e81e40704da05421515a4f78e84726857fbd0ba3`을 가리키고 tag CI `30811300042`도 성공했다. [GitHub Release v0.4.8](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.4.8)은 public, `draft: false`, `prerelease: false`다.

This-device public exact global install은 registry artifact와 byte-identical이고 CLI/plugin `0.4.8`, installed/enabled, hook wiring 9종과 healthy `doctor`를 확인했다. 공식 Codex 앱은 새 subagent start/stop을 ordered timestamp로 전달했고 최종 agent 상태는 stopped였다. Official Codex in-app Browser에서는 grant 인증, fragment 제거, same-tab bare-root recovery button 성공과 new-tab recovery button 부재를 확인했다. 이 실행에서는 앱 process 재시작 없이 hook이 전달됐지만 이 관찰을 다른 upgrade나 app process에 일반화하지 않는다. 이 evidence는 Universal Directory 제출·승인·검색 노출이나 별도 npm provenance attestation 완료를 뜻하지 않는다.

최종 official-app E2E에서 bounded worker `public_047_final_app_e2e`의 latest agent start+stop pair, agent stopped와 earlier start row stopped를 확인했다. Bad terminal agent start rows 0, bad terminal tool start rows 0이었다. Actual tool check에서는 `kyurasi-next-supabase` 48/48과 `codex-agent-view` 42/42 start rows completed, false running 0을 확인했다. 관찰 시작 전 start가 없던 agent 2개는 `stopped_without_start`로 정직하게 표시됐다. 위 synthetic runtime ingest와 actual app hook evidence는 별도이며, exact hot-reload timing만 미확인이다. 이 evidence는 Universal Directory 제출·승인·검색 노출이나 npm provenance attestation 완료를 뜻하지 않는다.

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
- UI는 관찰만 하며 approval이나 task control을 제공하지 않는다. 실행 중인 부모/subagent를 먼저 보여주고 human-readable label/status를 주 정보로 사용하며 raw ID/event name은 보조 진단 계층에 둔다.
- App Server 실패 또는 부재가 lifecycle 상태 표시를 깨뜨리지 않아야 한다.

## `0.2.0` 후속 구현과 `0.2.1` patch: 관찰에서 runtime schema로

Phase 0 capture는 원본 payload를 영구 model로 복사하기 위한 것이 아니라 어떤 field를 버릴지 결정하는 근거로 사용했다. 이후 구현은 다음 두 단계로 관찰값을 좁혔다.

1. `scripts/send-hook.mjs`는 Codex가 전달한 raw object를 local process에서 받고 `scripts/capture-hook.mjs`의 minimizer를 재사용한다. allowlisted metadata만 값을 보존하고 prompt, transcript path, tool input/output, assistant message 같은 나머지 field 값은 type/key/length summary로 바꾼 뒤 loopback으로 보낸다. 단, `UserPromptSubmit`은 부모 작업을 사람이 구분할 수 있도록 원문 최대 4,096자를 local hook process 안에서만 검사해 credential·email·link·absolute path를 placeholder로 가리고, whitespace를 한 줄로 정리한 최대 180자 `task_summary`를 파생한다. 원문은 transport envelope에 복사하지 않는다.
2. `src/core/normalize-hook-payload.mjs`는 minimized payload도 다시 untrusted input으로 취급한다. 지원 event별 required field를 runtime validation하고 monitor state에 필요한 field만 새 object로 복사한다. `task_summary`는 같은 redaction/bound를 다시 적용한 뒤 `UserPromptSubmit`에만 허용하고, 다른 summary와 unknown field는 reducer에 전달하지 않는다.

현재 normalized contract는 다음과 같다.

| Event | runtime에 유지하는 입력 field | derived state |
| --- | --- | --- |
| turn 공통 | `hook_event_name`, `session_id`, `turn_id`, local `received_at_ms` | normalized event type, session first/last seen |
| `SessionStart` / `SessionEnd` | `hook_event_name`, `session_id`, local `received_at_ms`; `SessionStart`의 verified `session_start_source` enum(`startup`, `resume`, `clear`, `compact`, 있을 때) | session start/end observed, terminal `completed`, orphan work `interrupted`, out-of-order flag |
| `UserPromptSubmit` | turn 공통 field, bounded/redacted one-line `task_summary`(있을 때) | root turn running, 작업 수준의 짧은 요청 요약, out-of-order flag |
| `Stop` | turn 공통 field | root turn과 session/work-item 요약을 즉시 `completed`; active child/tool row는 `completion_not_observed`, out-of-order flag |
| `SubagentStart` / `SubagentStop` | `agent_id`, `agent_type` | running, stopped, stopped-without-start, out-of-order flag |
| `PreToolUse` / `PostToolUse` | `tool_name`, `tool_use_id` | running, completed, completed-without-start, out-of-order flag; same `turn_id` agent가 정확히 한 명이면 그 agent snapshot의 current tool name/status/observation time |
| `PermissionRequest` | `tool_name` | waiting-for-user permission state |

`PermissionRequest` row는 공식 event schema를 바탕으로 구현한 narrow input contract다. 실제 GUI dispatch와 waiting 반영은 확인했지만 raw payload 전체 field set을 확정한 것은 아니다. Missing/invalid field는 상태를 발명하지 않고 bounded diagnostic으로 남긴다.

실제 확인한 `SubagentStart`에는 `agent_id`, `agent_type`만 있고 agent에게 할당된 작업을 설명하는 전용 field는 없었다. `SubagentStop`의 `last_assistant_message`도 작업 할당 설명이 아니며 정상 monitor의 allowlist에 포함하지 않는다. 따라서 `UserPromptSubmit`의 `task_summary`를 개별 agent assignment로 재사용하지 않는다. 실제 공식 앱 E2E의 collaboration spawn wire에서는 `message`가 사람이 읽을 수 있는 평문이 아니라 `gAAAA...` 형태의 opaque 보호 문자열로 전달됐고, 별도의 spawn task label은 확인할 수 있었다. 따라서 protected `message`를 요약하거나 표시하지 않고, current official wire에서는 안전하게 사람이 읽도록 정리한 task label을 `assignment_summary`의 주 근거로 삼는다. 향후 검증 가능한 평문 요청이 관찰되는 wire shape에서는 동일한 bounded/redacted normalization을 적용할 수 있다.

연결 자체는 spawn 후보가 정확히 하나이고 새로 관찰된 agent도 정확히 하나인 만료 전 singleton window에서만 best-effort로 수행한다. 동시 spawn, 후보/agent가 둘 이상인 모호한 상태, 또는 만료된 후보는 발생 시간이나 FIFO로 억지 연결하지 않고 미표시한다. Opaque/protected value, 원본 spawn message와 full tool input/output은 보관하거나 표시하지 않으며, `assignment_summary`는 검증 가능한 할당 요청 또는 task label의 짧은 표시일 뿐 agent의 내부 reasoning이나 계속 갱신되는 작업 계획이 아니다.

반면 **현재 작업**은 assignment나 내부 reasoning의 요약이 아니다. Actual live snapshot에서 확인한 exact `turn_id` 관계를 사용해, 같은 session과 `turn_id`의 agent가 정확히 한 명인 경우에만 최신 tool name/status/observation time을 agent snapshot에 연결한다. UI는 이를 English/한국어/Español의 사람이 읽는 tool activity 문구로 표현한다. 관계가 없거나 애매하면 unavailable로 fail closed한다. 이를 위해 full tool input/output을 새로 저장하거나 표시하지 않는다.

`SessionStart`, `SessionEnd`, `UserPromptSubmit`, `Stop`은 `0.2.1`에서 parent task가 subagent를 만들기 전에도 관찰 window에 나타나도록 추가했다. 이 wiring과 reducer fixture 통과는 공식 GUI가 해당 command hook을 실제 dispatch했다는 증거가 아니다.

Verified `session_start_source`가 `resume` 또는 `clear`이면 새 observation epoch를 시작하며 root turn, agent, tool과 permission transient state를 reset하고, 열린 session의 `compact`는 현재 active transient state를 보존한다.

Reducer는 event identity가 완전히 보장된다고 가정하지 않는다. 관찰된 ID를 상관관계 key로 사용하되 duplicate, stop-before-start, post-before-pre, stale permission event를 명시적 상태로 처리한다. `SessionEnd`는 terminal signal로 우선 적용하고 그 시점에도 열린 orphan agent/tool/permission을 `interrupted`로 정리한다. `Stop`은 root turn과 session/work-item 요약을 즉시 `completed`로 표시하고, 당시 열린 child agent/tool row는 자체 종료 신호가 관찰되지 않은 `completion_not_observed`로 분리한다. 종료 hook을 관찰하지 못한 active state는 기본 5분 동안 새 event가 없으면 `completion_not_observed`로 표시하며, 이를 완료나 성공으로 바꾸지 않는다.

공식 Codex lifecycle에서 `SessionEnd`는 최대 30분 지연될 수 있다. 따라서 단순히 오래된 상태라는 이유만으로 `completed`를 추정하면 정상적으로 지연 중인 terminal event를 거짓 완료로 바꿀 수 있다. `completion_not_observed`는 이 관찰 한계를 사용자에게 그대로 보여주며, 이후 실제 `SessionEnd`가 도착하면 terminal priority에 따라 확정 상태를 적용한다. Session, agent, activity, diagnostic collection에는 상한을 두고 monitor restart 뒤 이전 event를 복구하거나 parent completion을 추측하지 않는다.

Runtime server는 `127.0.0.1` 외 bind를 거부한다. Process-scoped runtime/control token은 `/api/events`, `/api/internal/shutdown`, `/api/state`와 internal viewer-grant 발급을 인증하고, 별도 installation-scoped viewer credential은 read-only credential signing/legacy viewer access 경계로 유지된다. Viewer credential private file은 user-only 권한으로 유지되며 task/event payload를 포함하지 않는다. Hook sender는 기존 backend 전달이 실패하면 fixed loopback port의 detached backend를 무출력으로 내부 준비하고, 500ms 전송 timeout과 최대 1.6초의 bounded wait 안에서 같은 최소화 event를 재시도한다. 동시 hook은 하나의 listener로 수렴하며 준비 실패는 neutral `{}` response로 fail-open해 Codex task를 막지 않는다. Event를 disk queue에 적재하거나 이후 replay하지 않으므로, 전달되지 않은 terminal hook을 persistent history에서 복구할 수 있다고 가정하지 않는다.

설치·hook trust·앱 재시작 뒤 첫 trusted hook이 backend를 자동 준비하므로 일반 사용자는 task ID를 등록하거나 terminal에서 `start`, `status`, `doctor`를 실행하지 않는다. 공식 public plugin API에서 sidebar, panel 또는 in-app Browser tab open이 이 제품의 안정적인 surface가 아니었으므로 current source는 default browser를 사용한다. Version `0.5.3`에는 `interface.defaultPrompt`가 없으며 사용자는 task에서 `@codex-agent-view` 자체를 선택·전송한다. 별도 `$show-agents` picker나 자동 삽입 starter text는 없다. Internal single skill은 private URL이나 credential을 text로 노출하지 않고 `open` command에 전달한다. Promptless plugin-card Quick start 제공 여부는 앱 UI 관찰 전까지 미확인이다.

Historical public `0.4.8`의 정상 `$show-agents` 경로는 내부 `prepare-live-view` command 1회와 Codex in-app Browser open 요청 1회였다. CLI는 fresh nonce/HMAC ownership proof로 exact owned monitor를 먼저 검증한 뒤 exact `127.0.0.1:<port>` authority의 origin-form request로만 runtime/control bearer를 보냈다. Runtime token이 서명한 1회용 60초 bootstrap grant만 Browser URL fragment에 넣고 persistent viewer/runtime token은 URL이나 일반 출력에 넣지 않았다. Bootstrap은 issuing process 안에서 1회만 쓸 수 있고 monitor restart 시 즉시 무효였다. Validated `CODEX_THREAD_ID`는 signed family에 binding됐다.

Bootstrap은 최초 signed `family_exp`를 30분으로 고정한다. 15분 read-only access는 같은 family 안에서만 자동 갱신되어 family 끝까지 view를 유지하며 recovery/refresh도 deadline을 절대 연장하지 않는다. Recovery는 `localStorage`가 아니라 tab-scoped `sessionStorage`에만 둔다. 같은 tab은 family 안의 transient page-level failure에서 **Reconnect**할 수 있지만 다른 tab과 인증 이력이 없는 tab에는 button이 없다. Monitor restart는 아직 교환하지 않은 old-process bootstrap만 즉시 무효화한다. Exchange가 끝난 family는 persistent viewer signing으로 original deadline까지 같은 fixed origin의 새 in-memory observation window에 재연결할 수 있다. Family 만료, credential 없는 새 tab 또는 닫힌 tab은 `@codex-agent-view`를 다시 실행한다. Rejected/expired recovery는 제거한다. Terminal, private URL 복사, cookie와 CORS는 복구 흐름이 아니다. Default browser는 current source의 의도된 display surface다. UI 기본 언어는 English이고 selector에서 English, 한국어, Español을 선택할 수 있다. 2초 rerender 때 열린 상태가 사라지는 문제를 없애기 위해 `<details>`/toggle을 사용하지 않고 작업 활동을 inline으로 표시한다. 사람용 주 정보는 프로젝트, 작업 수준 요청 요약, 참여 agent와 상태이며 session ID는 card에서 제거했다. Monitor restart는 새 in-memory 관찰 window이고 downtime event는 재생되지 않는다.

정상 hook wiring은 이제 JSONL capture script가 아니라 `scripts/send-hook.mjs`를 실행한다. `scripts/capture-hook.mjs`와 `CODEX_AGENT_VIEW_CAPTURE_FULL=1`은 명시적 Phase 0 diagnostic opt-in으로만 남아 있으며 production state source가 아니다.

이 구현 결정은 “관찰된 field만 좁게 수용하고 민감한 원본은 저장하지 않는다”는 Phase 0 결론을 반영한다. Schema version은 현재 `1`이며, 향후 Codex payload 변경은 unknown/malformed diagnostic과 실제 재캡처를 근거로 별도 versioning해야 한다.

## Trust, 실행, 제거 절차

최종 GUI E2E에서는 다음 순서를 지킨다.

1. plugin source와 `hooks/hooks.json`, 실행 script를 검토한다.
2. 공식 앱/CLI의 plugin browser에서 plugin이 설치·활성화됐는지 확인한다.
3. 공식 앱을 완전히 재시작하고 새 task/session을 시작한다.
4. hook browser에서 새 hook 정의와 command를 확인하고 현재 exact hash를 명시적으로 trust한다. CLI에서는 `/hooks`를 사용한다.
5. 별도 monitor를 시작하지 않은 상태에서 trusted hook을 발생시켜 backend 자동 준비와 최초 event 전달을 확인한 뒤 subagent start/stop, 지원 tool pre/post, 실제 승인이 필요한 동작을 순서대로 발생시킨다.
6. Codex 앱 task에서 `@codex-agent-view` 자체를 선택·전송했을 때 internal `open`을 한 번 실행하고 default browser에 authenticated view를 여는지 확인한다. 별도 skill picker, `$` command나 자동 삽입 starter text를 요구하지 않고 private URL/credential을 응답에 노출하지 않아야 한다. Plugin 카드의 promptless **지금 사용해보기** 제공 여부는 별도 관찰 결과로 기록하며 사전 합격 조건으로 가정하지 않는다. UI는 호출 task 자신을 제외하고 진행 중 작업과 참여 agent를 먼저 두며, session ID 대신 bounded/redacted 요청 요약을 표시하고, 기본 English와 한국어/Español 전환, 2초 polling, toggle 없는 inline 활동을 검증한다. 전체 prompt/tool input이나 검증되지 않은 agent assignment description을 표시하지 않아야 한다. Same-tab transient failure에서는 retry/**Reconnect**, credential 없는 새 tab과 family expiry에서는 `@codex-agent-view` 재실행 안내를 확인한다. CLI `status`/`doctor`는 maintainer diagnostic일 때만 사용하고, 필요할 때만 별도 redacted capture로 wire payload key/type을 검증한다.

제거 시에는 다음 세 범위를 각각 확인한다.

1. plugin browser에서 plugin을 disable/uninstall한다.
2. hook browser에서 해당 hook source가 더 이상 활성 상태가 아닌지 확인한다.
3. `codex-agent-view uninstall`이 validated runtime/control token으로 owned healthy auto/foreground monitor를 인증해 internal shutdown한 뒤 copied marketplace bundle을 제거하고 valid owned viewer credential을 폐기하는지 확인한다. 기본 제거는 runtime directory의 관련 없는 나머지 data를 보존한다.
4. 사용자가 owned runtime data 제거까지 명시적으로 원할 때만 `--purge`를 사용한다. Valid viewer credential 폐기 뒤 owned stale runtime file과 빈 runtime directory만 제거하고, malformed/unrecognized runtime·viewer credential, unrelated loopback service와 non-empty directory는 경고와 함께 보존하는지 확인한다.
5. 별도 opt-in diagnostic capture가 있다면 `PLUGIN_DATA`, configured capture directory, standalone fallback을 각각 확인해 정리한다.

hook 파일을 변경하면 기존 trust를 재사용할 수 없으며 새 hash를 다시 검토해야 한다.

## 외부 compatibility acceptance

`0.2.1` source 구현 뒤 다음 공식 앱 핵심 검증을 완료해 현재 앱 조합의 compatibility evidence를 확보했다.

- 실행 중 monitor를 확인하고 `doctor --json`에서 plugin installed/enabled, hook bundle wiring, `events_received`를 기록
- 설치 전에 열려 있던 공식 앱을 완전히 종료·재실행
- interactive `/hooks`에서 현재 plugin hook source, command, exact hash를 검토하고 trust
- trust 뒤 **새 GUI task** 시작
- parent prompt와 subagent 한 개를 실제 시작·종료
- 일반 tool 한 개를 실행
- sandbox escalation 등 실제 approval prompt가 필요한 동작을 실행해 `PermissionRequest` 발생

이 과정에서 실제 hook 8종, parent 3개와 subagent 3개의 자동 표시, permission waiting을 확인했다. Fixture 성공이나 monitor 연결만으로 선언한 결과가 아니다. 이 historical `0.2.1` E2E에서는 실제 `SessionEnd`가 발생하지 않았지만, 후속 `0.3.0` source browser monitor E2E에서 해당 event와 completed 반영을 확인했다.

## 외부 distribution과 listing 작업

공개 배포에는 다음 제품 외부 운영 단계가 남아 있다.

- [x] maintainer npm login(`kyurasi`)과 `0.2.0` 코드·tarball 준비
- [x] npm account 필수 2FA `auth-and-writes`, `pending:null` 확인
- [x] `0.2.0` public registry publish 성공
- [x] public registry metadata, dist shasum/exact SRI와 registry signature 확인
- [x] public exact artifact isolated global install/`npx` `--version`, `doctor`, `install`, ephemeral-port `start`, `status`, `uninstall` smoke
- [x] 다섯 hook fixture event의 status/UI 반영, search/filter, browser console 무오류, purge 뒤 빈 plugin/runtime 상태 확인
- [x] npm `gitHead`와 annotated `v0.2.0` tag의 exact commit 일치, origin push, public GitHub Release, 21개 package file byte 일치 확인
- [x] `0.2.1` public registry publish와 latest/version/license/bin, npm `gitHead`, 21 files/unpacked size, shasum/exact SRI/signature 확인
- [x] 이 기기에 public exact `0.2.1` global reinstall, CLI/plugin/wiring 확인, 실제 sessions 자동 수신과 probe subagent running → stopped/UI 완료 반영
- [x] Public exact `0.2.1` clean-cache exact-version `npx --version`
- [x] `v0.2.1` annotated tag·origin push·GitHub Release·registry/tagged source 21개 file byte comparison
- [x] `0.3.0` public registry metadata/signature, annotated tag·GitHub Release, exact global reinstall과 artifact comparison
- [x] Public exact `0.3.0` 실제 workspace label, permission/tool lifecycle, subagent running → stopped (`has_out_of_order_events: false`) 확인
- [x] `0.3.1` public registry gitHead/shasum/integrity/21 files, annotated tag·GitHub Release와 this-device plugin installed/enabled 확인
- [ ] Public exact `0.3.1` app-only E2E
- [x] `0.3.2` registry metadata/digest/signature, tag/GitHub Release, main/tag CI, exact install과 artifact match
- [x] Public exact `0.3.2` app-native thread snapshot의 worker activity 3개 확인
- [ ] Public exact `0.3.2` 앱 full restart/new-task live hook E2E
- [x] Registry tarball과 this-device global install/copied marketplace 21개 file byte comparison
- Universal Plugins Directory portal 제출, review, publish, search visibility 확인

`0.3.2` README는 immutable publish artifact 안에서 exact `@0.3.2` 설치와 앱 안의 정상 사용 흐름을 안내한다. Directory publish 전에는 Universal Directory에서 검색 가능하다고 주장하지 않는다.

## QA 결과

- `npm test`: 통과, `55/55`
- 프로젝트 내부 plugin validation: 통과
- bundled skill `quick_validate.py`: 통과
- `npm pack --dry-run`: 통과, `codex-agent-view@0.2.1`, logo assets와 skill을 포함한 21 files
- Historical package/plugin manifest version 및 final tarball metadata: `0.2.1` 일치
- Historical `0.2.1` source CLI `--version`: `0.2.1`
- installed `0.2.1` sender → monitor → UI fixture E2E: task ID를 사전 등록하지 않아도 parent와 agent가 hook에서 자동 생성됐고 running, waiting, completed 상태 반영 확인
- reset 뒤 source CLI `doctor --json`: plugin `installed: true`, `enabled: true`, hook `wiring_ok: true`, declared event 9개, monitor `events_received: false`, trust `unknown` 확인
- historical public `0.2.0` registry metadata: `Apache-2.0`, bin mapping, shasum/exact SRI/signature 확인
- historical public exact `0.2.0`: isolated global install과 exact-version `npx` lifecycle, 다섯 hook fixture → status/UI, search/filter, browser console 무오류, purge 검증
- historical release source match: npm `gitHead`와 annotated `v0.2.0` tag가 `00b62af56698ac875e39c7d1386905c157c3a7e8`로 일치, origin tag와 public GitHub Release 확인, 21개 package file byte-identical
- historical public `0.2.1`: 당시 latest/version `0.2.1`, `Apache-2.0`, bin mapping, npm `gitHead` `8d6a67c9aafa23f801235d747ff018d254378970`, 21 files, unpacked size `144644`, shasum/exact SRI/signature 확인
- historical `0.2.1` release source: annotated tag/origin push/public GitHub Release, clean-cache exact-version `npx --version`, registry tarball ↔ tagged source 21 files byte-identical 확인
- this-device public exact `0.2.1`: global reinstall/copied marketplace ↔ registry tarball 21 files byte-identical, CLI `0.2.1`, plugin installed/enabled, hook wiring 9종, 실제 session 자동 수신과 probe subagent running → stopped/UI 완료 반영
- official app `0.2.1`: parent 3개·subagent 3개 자동 표시, 실제 hook 8종과 `PermissionRequest` waiting 확인; 실제 `SessionEnd` 미관찰
- historical public `0.3.1`: npm gitHead/shasum/integrity/21 files, annotated tag/GitHub Release와 this-device plugin installed/enabled 확인; app-only E2E 미확인
- historical source `0.3.2` candidate QA: immutable README correction과 package/plugin/test fixture version alignment, Node tests `67/67`, plugin/skill validation, package contract와 pack 21 files 통과
- historical public `0.3.2`: npm gitHead/shasum/integrity/signature, 21 files와 package/unpacked size, annotated tag/GitHub Release, main/tag CI, this-device global install/plugin installed/enabled와 artifact mismatch 0 확인
- public exact `0.3.2` app acceptance: app-native worker activity 3개 확인. 내장 Browser monitor 연결은 성공했지만 재설치 전 앱 process의 follow-up subagent 3개 hook은 0건; app full restart/new-task live hook E2E 미완료
- historical public `0.4.0`: 당시 npm latest/version, shasum/integrity/signature, 25 files와 package/unpacked size, annotated tag/GitHub Release, main/tag CI와 registry/release tarball byte 일치 확인
- this-device public exact `0.4.0`: CLI/plugin version 일치, installed/enabled, hook wiring 9종, 실제 sessions 7개 event 수신 확인. Show Agents Browser request는 `queued`였고 tab 미관찰이므로 app full restart/new-task 전까지 exact visual panel E2E 미확인
- historical public `0.4.1`: npm latest/version, Apache-2.0, bin mapping, shasum/integrity/signature, 25 files와 package `53650 B`/unpacked `193424 B`, annotated tag/GitHub Release, main/tag CI와 release/registry tarball byte 일치 확인. npm metadata의 `gitHead` 부재로 source 일치를 그 field로 주장하지 않음
- this-device public exact `0.4.1`: CLI/plugin version 일치, installed/enabled와 hook wiring 9종 확인. Runtime `monitor_not_running`, trust `unknown`; app restart/new-task direct-skill visual E2E 미확인
- historical public exact `0.4.2`: pushed commits, main CI Node.js 18/20/22, npm metadata/signature, release/registry tarball byte 일치, annotated tag/GitHub Release, this-device global install/artifact match, plugin installed/enabled, hook wiring 9종과 official Codex in-app Browser visual E2E 확인
- historical public exact `0.4.3`: commits/main code CI, npm metadata/signature/digest, local release↔registry tarball, this-device install/artifact/plugin/hooks/doctor와 official Codex legacy-tab migration/reconnect E2E 확인. Annotated tag(commit `dea9f39890387ed509cfa0bb511c8167abe11148`), public non-draft/non-prerelease GitHub Release, final main docs CI `30714110050`, tag CI `30714144940` 확인
- historical public exact `0.4.4`: npm metadata/digest/signature와 25 files/size, release↔registry tarball byte 일치, public exact reinstall, CLI/plugin installed/enabled, hook 9종, doctor events/sessions, official in-app Browser auth/self-filter/disclosure/i18n/persistence E2E, main/tag CI, annotated tag와 public GitHub Release 확인
- historical public exact `0.4.5`: npm metadata/digest/signature와 25 files/size, release↔registry tarball byte 일치, public exact reinstall, CLI/plugin installed/enabled, hook 9종, doctor `events_received: true`/sessions 9, official in-app copy/safe-summary/session-ID/self-filter/i18n/auth-recovery E2E, main/tag CI, annotated tag와 public GitHub Release 확인
- historical public exact `0.4.6`: terminal lifecycle/source/public install E2E와 in-app status/i18n 표시를 확인했고, 후속 official-app 재현에서 agent map stopped 뒤 recent start row running 잔존 gap도 확인
- historical public exact `0.4.7`: npm metadata/digest/signature와 25 files/size, release-source↔registry tarball byte 일치, registry/global diff 0, public exact reinstall, CLI/plugin installed/enabled, hook wiring 9종 valid, source candidate recent-activity regression tests, installed synthetic E2E, final official-app worker/tool false-running 0 E2E, 126/126/plugin/pack, main/tag CI, annotated tag와 public GitHub Release 확인
- historical public exact `0.4.8`: single prepare/open, nonce/HMAC ownership proof, exact authority/origin-form, process-bound one-use 60초 bootstrap, fixed 30분 family와 tab-scoped recovery를 구현. `npm run check` 153/153, plugin validation, pack dry-run, npm metadata/signature/digest와 25-file artifact, release/registry byte 일치, this-device exact install, CLI/plugin installed/enabled, hook wiring 9종, healthy doctor, actual new subagent ordered start/stop와 stopped status, official in-app Browser grant/fragment/same-tab recovery/new-tab isolation, main/tag CI, annotated tag와 public GitHub Release를 확인. 이 실행에서 app restart가 필요 없었던 사실만 기록하고 일반화하지 않음
- historical public exact `0.5.0`: `@codex-agent-view`/Quick start → internal skill → `open` 1회 → OS default browser라는 단일 사용자 흐름을 배포. npm latest, signed 23-file artifact와 digest, main CI Node.js 18/20/22, this-device exact reinstall, CLI/plugin installed/enabled, hook wiring 9종, events true, actual subagent start/stop와 final stopped를 확인. Official E2E에서 ambient `in-app-browser-context` summary contamination도 확인. `v0.5.0` tag/GitHub Release는 아직 없음
- public exact `0.5.1`: automatic `in-app-browser-context` wrapper를 task-summary 입력에서 제거. npm latest/version, shasum/integrity/signature 1개, release↔registry tarball byte 일치와 SHA-256, public exact reinstall의 CLI/plugin installed/enabled·hook wiring 9종·events true, main/tag CI, annotated tag/GitHub Release, actual official `SubagentStart`/`SubagentStop` live UI의 running 1→0·completed/stopped를 확인. Official `task_summary` live prompt는 monitor가 `UserPromptSubmit` 뒤에 시작되어 미확인이며, actual ambient fixture를 사용한 core/store/live automated tests 통과와 구분함
- public exact `0.5.2`: plugin-level starter text 없이 `@codex-agent-view` 자체 선택·전송 → internal single skill → `open` contract를 유지. npm metadata/signature/digest와 23-file artifact, source-pack byte identity, public exact reinstall/installed diff identity, plugin installed/enabled·hook wiring 9종·monitor ok·events true, main/tag CI, annotated tag/GitHub Release와 actual Assigned work/Current activity display를 확인했다. Hook trust는 CLI-unobservable `unknown`이며 bundled validator와 Universal Directory acceptance는 별도 external submission 단계다.

Captured-evidence 기반 schema, bounded in-memory core, loopback runtime, read-only UI, explicit install/remove CLI, package/skill wiring은 구현됐다. Public `0.5.2`의 npm/artifact/exact reinstall/CI/tag/Release와 actual Assigned work/Current activity acceptance를 완료했고 `0.2.0`부터 `0.5.1`까지의 evidence도 보존한다. Promptless plugin-card UI는 직접 관찰 전까지 미확인이다. Universal Directory listing은 별도 external operation이며 아직 제출하지 않았다. 선택적인 npm provenance attestation 완료도 주장하지 않는다. 어느 항목도 SQLite/영구 history가 필요한 blocker를 뜻하지 않는다.
