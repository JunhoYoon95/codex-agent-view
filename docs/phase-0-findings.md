# Phase 0 기술 검증 결과

검증일: 2026-08-01

## 결론

최소 plugin은 Homebrew Codex CLI와 공식 앱에 포함된 embedded Codex CLI 양쪽에서 설치·실행되었다. 실제 subagent 실행으로 `SubagentStart`, `SubagentStop`, `PreToolUse`, `PostToolUse` payload를 관찰했으며, lifecycle event를 로컬 read-only monitor의 입력으로 사용하는 방향은 기술적으로 가능하다.

다만 이것은 공식 앱 bundle에 포함된 CLI runtime 검증이지, Codex GUI의 현재 task가 plugin hook을 실행했다는 증거는 아니다. 후속 `0.2.0` 실사용에서는 plugin 설치·enable과 monitor 실행이 정상이었는데도 동일 공식 앱 process에서 실제 subagent 2개를 실행하는 동안 event가 0건이었다. 앱 log에도 `send-hook.mjs` 실행 흔적이 없어서 문제를 UI/reducer가 아니라 app → plugin hook command 경계로 좁혔다.

해당 app process에는 plugin 설치 전 `hooks/list` 응답이 있었고 설치 뒤에도 process가 유지됐다. 이는 stale config/hook snapshot 가설과 일치하지만 인과관계를 확정하지는 않는다. 또한 `codex plugin list --json`은 persisted exact-hook trust를 노출하지 않아 config snapshot과 untrusted hook skip을 자동 진단으로 분리할 수 없었다. 따라서 당시 실패 원인을 “재시작 부족”으로 단정하지 않는다.

Phase 0의 repository 조사와 구현 입력 정리는 완료됐고 repository/package는 `0.4.2` release candidate, public npm `latest`는 `0.4.1`이다. Historical `0.2.1` 공식 앱 E2E에서는 task ID 등록 없이 parent 3개와 subagent 3개 자동 표시와 실제 hook 8종을 확인했다. `0.3.0` E2E에서는 공식 앱 내장 thread tools로 `kyurasi-next-supabase`의 explicit `inProgress` snapshot과 직후 `idle + hasUnreadTurn` 전환을 확인했으며, 후자는 별도 확인 대기 표시의 근거이지 완료·성공 추론의 근거가 아니다. Browser monitor에서는 실제 `SessionEnd` lifecycle 반영을 관찰했다. Public exact `0.3.0` 재설치 뒤 실제 hook, workspace label, permission/tool lifecycle과 subagent running → stopped를 추가 확인했다. Historical public `0.3.2`와 `0.4.0` evidence는 보존한다. Public exact `0.4.1`은 registry digest/signature, 25-file tarball(package `53650 B`, unpacked `193424 B`), annotated tag/GitHub Release, main/tag CI, release/registry tarball byte 일치와 this-device exact reinstall을 확인했다. CLI/plugin `0.4.1`, installed/enabled와 hook wiring 9종은 확인했지만 runtime은 install 교체 중 정상 종료돼 현재 `monitor_not_running`이고 hook trust는 `unknown`이다. 앱 process가 설치 전부터 열려 있었으므로 앱 완전 재시작/new task의 direct Show Agents visual E2E 완료는 주장하지 않는다. `0.4.2`의 public registry/tag/install/runtime/visual evidence는 아직 candidate와 분리한다.

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
- 전체 `cwd` 대신 control-character 제거, whitespace 정규화, 최대 120자의 basename `workspace_label`만 optional monitor의 process memory에 유지할 수 있다.

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

Public `0.4.0` manifest의 `defaultPrompt: ["Show Agents"]`는 plain plugin-level text starter였다. 이 starter는 implicit invocation이 disabled된 bundled `show-agents` skill을 명시적으로 호출하지 않았으므로 plugin 카드의 **바로 사용하기**/Quick start 동작 자체를 live 화면 실행으로 취급한 안내는 잘못이었다. Public `0.4.1`은 이를 `Open @ and select the bundled Show Agents skill.`이라는 instructional starter로 교체했다. Quick start는 이 안내 text를 붙일 뿐 호출하지 않으며, 새 task의 `@` picker에서 bundled **Show Agents** skill 자체를 직접 선택하는 것만 정상 사용의 canonical 실행 경로다. `$show-agents`도 Codex 앱 GUI 사용법으로 문서화하지 않는다.

Public `codex-agent-view@0.4.1`은 npm `latest`/version `0.4.1`, Apache-2.0, executable mapping, shasum `ee2ae0b8b36016f5c57bade067027202b1508d1d`, integrity `sha512-WC4f5MPmvpkXeKM+1BVAYqW4+hoaUrB4yQFoUYgc0pnjyY7hP1CdSR5NJ3QWmvJ6Ikmmb1d+58UL4hkKoyhm1Q==`, registry signature, 25 files, package `53650 B`와 unpacked `193424 B`를 확인했다. Release tarball과 registry tarball은 byte-identical이다. Exact tarball publish로 npm metadata에 `gitHead`가 없으므로 그 field를 통한 source 일치는 주장하지 않는다. Annotated `v0.4.1` tag는 commit `a1de67be5413fa38b8dd1b62f74353463f6e641e`을 가리키고 [public GitHub Release](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.4.1), main CI `30710490358`, tag CI `30710848474`가 공개·성공했다. 이 기기에 public exact artifact를 다시 설치해 CLI/plugin `0.4.1`, installed/enabled와 hook wiring 9종을 확인했다. Runtime은 install 교체 중 정상 종료돼 현재 `monitor_not_running`이고 persisted hook trust는 `unknown`이다. 앱 process가 설치 전부터 열려 있었으므로 앱 완전 재시작/new task의 direct Show Agents visual E2E는 미확인이다.

`0.4.2` candidate는 manifest starter를 exact `$show-agents`로 바꿨다. Plugin 카드의 **지금 사용해보기**가 bundled **Show Agents** skill을 명시 호출하고, 닫힌 panel은 Codex 앱 task의 `@codex-agent-view $show-agents`로 같은 skill을 다시 호출한다. 기본 화면은 실행 중인 부모 task와 subagent를 먼저 정렬하고 사람이 읽을 수 있는 workspace/task/agent label과 상태 문구를 주 정보로 사용한다. Raw session/agent ID는 보조 진단 metadata이며 raw hook event name은 기본 화면의 중심 정보가 아니다. Prompt, preview, tool input/output과 full workspace path는 표시하지 않는다. Public release나 visual E2E 완료는 아직 주장하지 않는다.

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

`PermissionRequest` row는 공식 event schema를 바탕으로 구현한 narrow input contract다. 실제 GUI dispatch와 waiting 반영은 확인했지만 raw payload 전체 field set을 확정한 것은 아니다. Missing/invalid field는 상태를 발명하지 않고 bounded diagnostic으로 남긴다.

`SessionStart`, `SessionEnd`, `UserPromptSubmit`, `Stop`은 `0.2.1`에서 parent task가 subagent를 만들기 전에도 관찰 window에 나타나도록 추가했다. 이 wiring과 reducer fixture 통과는 공식 GUI가 해당 command hook을 실제 dispatch했다는 증거가 아니다.

Reducer는 event identity가 완전히 보장된다고 가정하지 않는다. 관찰된 ID를 상관관계 key로 사용하되 duplicate, stop-before-start, post-before-pre, stale permission event를 명시적 상태로 처리한다. Session, agent, activity, diagnostic collection에 상한을 두고 monitor restart 뒤 이전 event를 복구하거나 parent completion을 추측하지 않는다.

Runtime server는 `127.0.0.1` 외 bind를 거부하고, user-only runtime file에 저장한 random bearer token을 `/api/events`와 `/api/state`에 요구한다. Hook sender는 기존 backend 전달이 실패하면 fixed loopback port의 detached backend를 무출력으로 내부 준비하고, 500ms 전송 timeout과 최대 1.6초의 bounded wait 안에서 같은 최소화 event를 재시도한다. 동시 hook은 하나의 listener로 수렴하며 준비 실패는 neutral `{}` response로 fail-open해 Codex task를 막지 않는다. Event를 disk queue에 적재하거나 이후 replay하지 않는다. Browser는 URL fragment token을 `sessionStorage`로 옮기고 fragment를 제거하며 external asset/CDN을 사용하지 않는다.

설치·hook trust·앱 재시작 뒤 첫 trusted hook이 backend를 자동 준비하므로 일반 사용자는 task ID를 등록하거나 terminal에서 `start`, `status`, `doctor`를 실행하지 않는다. 다만 공식 public plugin API에는 앱 시작 시 prompt 없이 sidebar, panel 또는 Browser tab을 생성하는 기능이 없다. `0.4.2` candidate의 최초 live 화면은 plugin 카드의 **지금 사용해보기**에서 `$show-agents`로 bundled **Show Agents** skill을 명시 호출해 연다. 이 skill이 app-native text snapshot까지 수행한다고 주장하지 않는다. 화면을 닫았으면 Codex 앱 task에서 `@codex-agent-view $show-agents`로 같은 skill을 다시 호출한다. 앱의 Browser capability 또는 permission을 사용할 수 없으면 private URL 노출이나 외부 browser 우회 없이 실패를 안내한다. 이미 열린 오른쪽 live panel은 같은 monitor 관찰 window와 session token이 유효한 동안 2초 polling으로 자동 갱신하고 일시 단절 뒤 재연결한다. Monitor restart는 새 관찰 window이며 token을 잃은 panel도 같은 명시적 앱 내 호출로 다시 연다.

정상 hook wiring은 이제 JSONL capture script가 아니라 `scripts/send-hook.mjs`를 실행한다. `scripts/capture-hook.mjs`와 `CODEX_AGENT_VIEW_CAPTURE_FULL=1`은 명시적 Phase 0 diagnostic opt-in으로만 남아 있으며 production state source가 아니다.

이 구현 결정은 “관찰된 field만 좁게 수용하고 민감한 원본은 저장하지 않는다”는 Phase 0 결론을 반영한다. Schema version은 현재 `1`이며, 향후 Codex payload 변경은 unknown/malformed diagnostic과 실제 재캡처를 근거로 별도 versioning해야 한다.

## Trust, 실행, 제거 절차

최종 GUI E2E에서는 다음 순서를 지킨다.

1. plugin source와 `hooks/hooks.json`, 실행 script를 검토한다.
2. 공식 앱/CLI의 plugin browser에서 plugin이 설치·활성화됐는지 확인한다.
3. 공식 앱을 완전히 재시작하고 새 task/session을 시작한다.
4. hook browser에서 새 hook 정의와 command를 확인하고 현재 exact hash를 명시적으로 trust한다. CLI에서는 `/hooks`를 사용한다.
5. 별도 monitor를 시작하지 않은 상태에서 trusted hook을 발생시켜 backend 자동 준비와 최초 event 전달을 확인한 뒤 subagent start/stop, 지원 tool pre/post, 실제 승인이 필요한 동작을 순서대로 발생시킨다.
6. Codex 앱의 plugin 카드에서 **지금 사용해보기**를 눌러 `$show-agents`가 bundled **Show Agents** skill을 명시 호출하고 live panel을 여는지 확인한다. Panel을 닫은 뒤 앱 task의 `@codex-agent-view $show-agents`로 다시 열리는지, Browser capability/permission 부재 시 private URL이나 외부 browser 우회 없이 실패를 안내하는지도 확인한다. UI는 running 부모/subagent를 먼저 두고 human-readable label/status를 주 정보로 표시하며 raw ID/event name을 보조 계층에 두고 prompt/tool input을 표시하지 않아야 한다. CLI `status`/`doctor`는 maintainer diagnostic일 때만 사용하고, 필요할 때만 별도 redacted capture로 wire payload key/type을 검증한다.

제거 시에는 다음 세 범위를 각각 확인한다.

1. plugin browser에서 plugin을 disable/uninstall한다.
2. hook browser에서 해당 hook source가 더 이상 활성 상태가 아닌지 확인한다.
3. `codex-agent-view uninstall`이 validated runtime token으로 owned healthy auto/foreground monitor를 인증해 internal shutdown한 뒤 copied marketplace bundle을 제거하는지 확인한다. 기본 제거는 runtime directory의 나머지 data를 보존한다.
4. 사용자가 owned runtime data 제거까지 명시적으로 원할 때만 `--purge`를 사용한다. Owned stale runtime file과 빈 runtime directory만 제거하고, unrecognized runtime file·unrelated loopback service·non-empty directory는 보존하는지 확인한다.
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
- current public `0.4.1`: npm latest/version, Apache-2.0, bin mapping, shasum/integrity/signature, 25 files와 package `53650 B`/unpacked `193424 B`, annotated tag/GitHub Release, main/tag CI와 release/registry tarball byte 일치 확인. npm metadata의 `gitHead` 부재로 source 일치를 그 field로 주장하지 않음
- this-device public exact `0.4.1`: CLI/plugin version 일치, installed/enabled와 hook wiring 9종 확인. Runtime `monitor_not_running`, trust `unknown`; app restart/new-task direct-skill visual E2E 미확인
- current source `0.4.2` candidate: version/manifest/skill/package 일치, plugin-card `$show-agents`, 수동 `@codex-agent-view $show-agents`, running-first human-readable UI와 privacy-minimized 표시를 검증해야 함. Public registry/tag/release/install/runtime/visual evidence 없음

Captured-evidence 기반 schema, bounded in-memory core, loopback runtime, read-only UI, explicit install/remove CLI, package/skill wiring은 구현됐다. `0.2.0`부터 `0.4.1`까지의 evidence는 public historical record로 보존한다. Current public `0.4.1`은 registry metadata/digest/signature, annotated tag/GitHub Release, main/tag CI, release/registry tarball byte 일치와 exact public artifact의 this-device install까지 확인했다. Runtime은 현재 `monitor_not_running`, hook trust는 `unknown`이며 direct Show Agents visual E2E는 앱 full restart/new-task가 필요한 미확인 항목이다. Repository의 `0.4.2` candidate는 public publish와 exact install/visual E2E를 아직 통과하지 않았다. Universal Directory listing은 별도 external operation이며 아직 제출하지 않았다. 선택적인 npm provenance attestation 완료도 주장하지 않는다. 어느 항목도 SQLite/영구 history가 필요한 blocker를 뜻하지 않는다.
