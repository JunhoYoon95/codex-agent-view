# Codex Agent View

Codex Agent View는 공식 Codex 앱을 그대로 사용하면서 부모 task와 subagent의 hook 기반 활동을 한눈에 보여주는 가벼운 read-only companion monitor다. Codex를 대체하거나 task를 제어하지 않는다.

> 비공식 커뮤니티 프로젝트이며 OpenAI의 공식 제품, 제휴 제품, 공식 지원 프로젝트가 아니다.

## 한국어 사용법

### 현재 상태

현재 source version은 `0.2.1`이다. 다음 구성은 구현되어 있다.

- `.codex-plugin/plugin.json`, local marketplace catalog, genuine Codex skill
- 부모 task용 `SessionStart`, `SessionEnd`, `UserPromptSubmit`, `Stop`과 subagent/tool/permission hook wiring
- privacy-minimized hook sender와 bounded in-memory reducer
- `127.0.0.1` 전용 token-authenticated local HTTP runtime
- 부모 task/session, subagent, 최근 활동, permission wait 상태를 표시하는 local UI
- `start`, `status`, `doctor`, `install`, `uninstall` CLI
- 명시적 설치·hook trust·제거 경로

Homebrew Codex CLI와 공식 앱에 포함된 embedded Codex executable에서는 plugin 설치와 lifecycle payload를 검증했다. 그러나 `0.2.0`을 실행 중인 공식 앱 process에 설치·enable한 실사용 재현에서는 실제 subagent 2개를 실행해도 monitor가 event를 0건 수신했다. Monitor, plugin 등록, enable, 설치 bundle은 정상이었지만 앱 log에는 sender 실행 흔적이 없었다. 같은 app process가 설치 전의 `hooks/list` snapshot을 유지한 정황이 있으며, CLI JSON으로 exact hook trust 상태를 확인할 수 없어 config snapshot과 trust 중 어느 경계에서 skip됐는지는 확정하지 않았다.

`0.2.1`은 부모 task lifecycle hook을 추가하고, `status`, `doctor`, 빈 UI가 “monitor 정상”과 “hook event 수신”을 구분하도록 개선한 patch다. 공식 Codex 앱 `26.727.40816`(`build 6067`)을 재시작하고 설치·활성화된 plugin `0.2.1`을 사용한 실제 E2E에서 task ID를 사전 등록하지 않아도 parent session 3개와 subagent 3개가 UI에 자동으로 나타났다. 실제 hook의 `SessionStart`, `UserPromptSubmit`, `Stop`, `SubagentStart`, `SubagentStop`, `PreToolUse`, `PostToolUse`, `PermissionRequest`가 sender → loopback monitor → UI 경로에 반영됐다. `SessionEnd` wiring은 포함돼 있지만 실제 공식 앱 event는 아직 관찰하지 않았으므로 호환 확인을 주장하지 않는다.

Maintainer npm 2FA는 `auth-and-writes` mode로 활성화됐고 `codex-agent-view@0.2.0`은 public npm registry에서 사용할 수 있다. npm publish와 별개인 Universal Plugins Directory 제출은 아직 완료되지 않아 directory 검색에는 나타나지 않는다.

검증된 `0.2.0` 릴리스: npm `gitHead`와 annotated `v0.2.0` tag는 commit `00b62af56698ac875e39c7d1386905c157c3a7e8`로 일치하고, registry SRI/signature 및 tag source와 registry artifact의 21개 package file byte 일치를 확인했다. [GitHub Release v0.2.0](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.2.0)은 공개 상태다. 별도 npm provenance attestation은 선택 사항이며 이 릴리스에는 없다.

### 제품 경계

Codex Agent View는 historical audit이나 session replay 제품이 아니라 현재 활동을 보여주는 live companion이다. Bounded in-memory state와 monitor 재시작 시 reset은 privacy와 단순한 failure boundary를 위한 의도된 완성 설계다. SQLite/영구 history는 누락된 요구사항이 아니다. 실제 사용자 요구가 입증될 때에만 retention, migration, deletion, privacy 비용을 별도 검토하는 명시적 opt-in 기능 후보로 취급한다.

- live 상태의 source of truth는 hook event다.
- Live 상태는 설계대로 monitor process의 bounded memory에만 있고 재시작하면 새 관찰 window가 시작된다.
- 외부 telemetry, 원격 server, account, 필수 SQLite/영구 event store가 없다.
- prompt, transcript path, 전체 tool input/output, assistant message를 monitor 상태나 UI에 저장·표시하지 않는다.
- task/subagent 중지·재시작, message 전송, permission 자동 승인·거절 기능이 없다.
- App Server는 향후 계층 metadata 보강 후보일 뿐이며 공식 앱 process와 memory를 공유한다고 가정하지 않는다.

별도로 실행한 Codex `0.146` App Server의 `thread/list` fallback도 실제 확인했지만 현재 root/subagent가 모두 `notLoaded`로 나타나 공식 앱의 live running/completed 상태를 공유하지 않았다. Persisted parent ID, alias, depth 보강은 가능하나 live 판별은 불가능했고 state DB read, privacy, 복잡도만 늘어나므로 `0.2.1`에는 채택하지 않았다.

### npm, local browser UI, Plugins Directory가 각각 필요한 이유

- npm은 `codex-agent-view` local executable, hook sender, runtime, static UI를 사용자 machine에 배포하는 경로다.
- Browser는 `127.0.0.1`에서만 열리는 현재 read-only companion UI다. 외부 website나 telemetry dashboard가 아니다.
- Universal Plugins Directory는 npm의 대체재가 아니다. 공개 directory의 in-app custom UI 경로는 public HTTPS MCP server와 domain verification이 필요해 local-only/no-external-server 원칙과 충돌한다. 현재는 별도의 listing/skills 제출 가능성만 검토하며, 심사·publish 전에는 Codex plugin 검색으로 설치할 수 있다고 안내하지 않는다.

Hook event가 누락·중복·역순으로 올 수 있으므로 UI의 `unknown`, `stopped_without_start`, 빈 상태는 그대로 해석해야 한다. 빈 session 목록은 “이 monitor가 event를 관찰하지 못함”이며 “실행 중인 task가 없음”의 증거가 아니다.

### 요구사항과 검증 범위

- Node.js `>=18`
- npm
- plugin command를 지원하는 Codex CLI 또는 공식 Codex 앱

아래 버전은 현재 테스트 matrix이며 지원 하한 보장이 아니다.

| Runtime | 확인된 버전 | 확인 범위 |
| --- | --- | --- |
| 공식 Codex 앱 | `26.727.40816` (`build 6067`) | 재시작한 현재 조합에서 plugin `0.2.1`의 parent 3개·subagent 3개 자동 표시 및 실제 hook 8종 E2E 확인; `SessionEnd` 미관찰 |
| 앱 embedded Codex | `0.146.0-alpha.9.2` | isolated plugin install/runtime 및 lifecycle probe |
| Homebrew Codex CLI | `0.146.0` | isolated plugin install/runtime probe |

다른 버전은 별도 검증이 필요하다.

### Source에서 검증

```bash
git clone https://github.com/JunhoYoon95/codex-agent-view.git
cd codex-agent-view
npm test
npm run validate:plugin
npm run check
```

Production dependency는 없고 runtime은 Node.js built-in module만 사용한다.

- `npm test`: redaction, schema, reducer, runtime security, hook delivery, UI 정적 검증
- `npm run validate:plugin`: manifest, catalog, hooks, skill, package wiring 검증
- `npm run check`: test, plugin validation, `npm pack --dry-run` 실행

내부 validation이나 fixture 통과만으로 공식 앱 GUI 호환성을 주장하지 않는다.

### Source checkout으로 개발·검증

Source를 직접 개발하거나 검증할 때는 다음 명령을 사용한다.

```bash
node bin/codex-agent-view.mjs --version
node bin/codex-agent-view.mjs doctor --json
node bin/codex-agent-view.mjs install
```

`install`은 package bundle을 `~/.codex-agent-view/marketplace` 기본 경로에 복사하고 local marketplace와 `codex-agent-view@codex-agent-view` plugin을 Codex CLI에 등록한다. `CODEX_AGENT_VIEW_RUNTIME_DIR`로 runtime root를 바꿀 수 있다.

이 명령은 npm lifecycle에서 자동 실행되지 않는다. `package.json`에는 `postinstall`이 없으며, 사용자가 `install`을 명시적으로 실행해야 Codex 등록이 바뀐다.

### Plugin과 hook trust

1. install 출력과 `codex plugin list`에서 plugin ID와 source를 확인한다.
2. 공식 앱의 Plugins Directory 또는 CLI `/plugins`에서 plugin이 설치·활성화됐는지 확인한다.
3. CLI TUI composer의 `/hooks` 또는 공식 앱의 해당 hook review UI에서 `hooks/hooks.json`과 `node "${PLUGIN_ROOT}/scripts/send-hook.mjs"` command를 검토한다.
4. 현재 hook definition의 exact hash를 사용자가 직접 trust한다.
5. Plugin 설치 전부터 공식 앱이 열려 있었다면 앱을 완전히 종료·재실행한다.
6. 반드시 plugin 활성화와 hook trust 이후에 **새 task**를 만든다. 설치·trust 전에 발생한 event는 재생되지 않는다.

`/hooks`는 CLI TUI command이며 `codex /hooks`라는 shell command가 아니다. Hook definition이 바뀌면 hash도 바뀌므로 다시 검토한다. 일반 설치에서 trust-bypass option을 사용하지 않는다.

### Monitor 실행과 상태 확인

Monitor를 foreground로 실행한다.

```bash
node bin/codex-agent-view.mjs start
```

기본 주소는 `127.0.0.1:43127`이며 실행 시 local bearer token을 포함한 URL을 browser에서 연다. 자동으로 browser를 열지 않으려면 다음을 사용한다.

```bash
node bin/codex-agent-view.mjs start --no-open
```

다른 terminal에서 상태를 확인한다.

```bash
node bin/codex-agent-view.mjs status
node bin/codex-agent-view.mjs status --json
node bin/codex-agent-view.mjs doctor --json
```

- `status`는 실행 중 monitor가 관찰한 task/session과 subagent 수를 읽는다.
- `status --json`은 hook 기반 snapshot과 bounded diagnostics를 반환한다.
- `doctor`는 Codex CLI, plugin 설치·enable, 설치된 hook bundle, monitor event 수신 여부, runtime directory를 진단한다.
- `doctor`의 hook trust는 `unknown`일 수 있다. `codex plugin list --json`은 persisted exact-hook trust를 노출하지 않으므로 interactive Codex CLI의 `/hooks`에서 직접 확인한다.
- `Ctrl+C`는 monitor를 종료하며 in-memory state와 정상 종료된 runtime file을 정리한다.

Monitor가 꺼져 있어도 hook sender는 fail-open으로 끝나 Codex task를 막지 않는다. Monitor를 나중에 켜면 꺼져 있던 동안의 event가 복구되지는 않는다.

Monitor가 실행 중이고 plugin enable/trust가 끝난 뒤 생성되거나 재개되는 task는 hook이 도착하면 task ID를 미리 등록하지 않아도 자동으로 목록에 나타난다. UI 검색은 이렇게 자동 수신된 목록을 거르는 선택적 filter일 뿐이며, task 추적을 시작하거나 ID를 등록하는 기능이 아니다. Plugin 설치·trust 전이나 monitor downtime에 이미 지나간 event는 재생되지 않는다.

### npm에서 설치

`0.2.1` release의 권장 설치 방법은 exact version을 global로 설치하는 것이다. 이 문서 작성 시점에 public registry에서 확인된 버전은 아직 `0.2.0`이므로, `0.2.1` publish가 확인되기 전에는 이 repository source에서 검증한다.

```bash
npm install --global codex-agent-view@0.2.1
codex-agent-view doctor
codex-agent-view install
codex-agent-view start
```

Global install 없이 exact version을 일회성으로 실행할 수도 있다.

```bash
npx --yes codex-agent-view@0.2.1 doctor
npx --yes codex-agent-view@0.2.1 install
npx --yes codex-agent-view@0.2.1 start
```

위 public artifact 검증 기록은 `0.2.0`에 대한 것이다. Isolated global install과 exact-version `npx` 양쪽에서 CLI lifecycle을 통과했고 fixture event는 status/UI에 반영됐지만, 이후 실행 중이던 실제 공식 앱 process에서는 event 0건이 재현됐다. 별도의 `0.2.1` source/package QA와 재시작한 공식 앱 E2E에서는 실제 hook 8종과 task ID 등록 없는 자동 표시를 확인했다. 다만 `0.2.1` registry artifact, digest, tag·GitHub Release는 publish 뒤 별도로 검증해야 하며, 실제 `SessionEnd`도 아직 미관찰이다. Registry evidence와 검증 경계는 [docs/distribution.md](docs/distribution.md)에 기록한다.

npm install 자체는 Codex 설정을 자동 변경하지 않는다. `install` command는 사용자가 명시적으로 실행하며 hook trust도 사용자 검토로 남긴다. npm publish와 Universal Plugins Directory 제출은 서로 별도 절차다. 자세한 배포 경계는 [docs/distribution.md](docs/distribution.md), directory 제출 상태는 [docs/plugin-submission.md](docs/plugin-submission.md)를 참고한다.

### Privacy와 opt-in diagnostic capture

정상 hook 경로는 `scripts/send-hook.mjs`다. 이 sender는 allowlisted metadata만 값으로 남기고 나머지는 type/key/length summary로 바꾼 뒤 loopback으로 보낸다. Runtime reducer는 그중 event type, session/turn ID, agent ID/type, tool name/use ID, local receipt time처럼 상태 표시에 필요한 더 좁은 field만 memory에 유지한다.

정상 monitor는 event JSONL을 쓰지 않는다. `scripts/capture-hook.mjs`는 Phase 0 검증용 별도 diagnostic script이며 누군가 명시적으로 실행하거나 hook에 연결할 때만 `events.jsonl`을 만든다.

`CODEX_AGENT_VIEW_CAPTURE_FULL=1`은 diagnostic script의 redaction을 끄며 raw prompt, tool data, credential을 기록할 수 있다. 일반 사용, skill workflow, install/start command는 이를 자동 enable하지 않는다. Raw capture와 runtime token을 commit하거나 public issue에 첨부하지 않는다.

전체 data flow, token lifecycle, capture 위치는 [Privacy](docs/privacy.md), 취약점 신고는 [Security](SECURITY.md)를 참고한다.

### 제거와 복구

가능하면 monitor를 `Ctrl+C`로 먼저 종료한 뒤 실행한다.

```bash
node bin/codex-agent-view.mjs doctor --json
node bin/codex-agent-view.mjs uninstall
```

기본 `uninstall`은 plugin 등록, marketplace 등록, copied marketplace bundle을 제거하지만 runtime directory의 나머지 data는 보존한다. 사용자가 `doctor`가 보여준 exact runtime directory까지 제거하길 명시적으로 원할 때만 다음을 사용한다.

```bash
node bin/codex-agent-view.mjs uninstall --purge
```

별도 `PLUGIN_DATA`, `CODEX_AGENT_VIEW_CAPTURE_DIR`, project working directory에 만든 opt-in diagnostic capture는 runtime directory 밖에 있을 수 있다. 정확한 위치를 검토해 별도로 정리하고 broad Codex/home directory를 삭제하지 않는다.

### Troubleshooting

#### `status`가 runtime file 또는 connection error를 출력함

```bash
node bin/codex-agent-view.mjs doctor --json
```

Monitor가 실행 중인지, stale runtime file인지, runtime directory가 예상한 위치인지 확인한다. Monitor가 실행되지 않았다면 사용자가 원할 때 `start --no-open`으로 시작한다.

#### UI에 task/subagent가 없음

다음 순서대로 확인한다.

1. `codex-agent-view doctor --json`에서 plugin `installed`, `enabled`, hook bundle `wiring_ok`, monitor `ok`를 확인한다.
2. `monitor.events_received`가 `false`라면 monitor 연결 성공과 hook 전달 성공을 혼동하지 않는다.
3. Interactive Codex CLI의 `/hooks`에서 현재 `send-hook.mjs` definition의 exact hash를 검토하고 trust한다.
4. Plugin 설치 전에 열려 있던 공식 앱은 완전히 종료·재실행한다.
5. Plugin enable/trust 뒤 만든 새 task에서 parent prompt와 subagent를 실행한다.

빈 상태는 “이 monitor observation window에 event가 도착하지 않음”을 뜻한다. Codex에 실행 중인 task가 없다는 뜻도, 반대로 GUI가 hook을 절대 지원하지 않는다는 뜻도 아니다. 위 절차 뒤에도 `events_received: false`이면 Codex 앱 version, plugin version, 앱/CLI 구분을 포함해 issue로 보고한다.

#### `PermissionRequest`가 표시되지 않음

Approval이 실제 필요한 동작에서만 발생할 수 있다. 공식 앱 `26.727.40816`(`build 6067`) E2E에서는 실제 `PermissionRequest` hook이 sender → loopback monitor → UI에 도착해 read-only waiting 상태로 표시되는 것을 확인했다. 다른 환경에서 표시되지 않으면 schema 문제와 “event 자체가 발생하지 않음”을 분리해 조사한다. Monitor는 approval을 자동 처리하지 않는다.

### 문서와 지원

- [Roadmap](ROADMAP.md)
- [Phase 0 findings](docs/phase-0-findings.md)
- [Distribution](docs/distribution.md)
- [Plugin submission](docs/plugin-submission.md)
- [Privacy](docs/privacy.md)
- [Terms](docs/terms.md)
- [Support](SUPPORT.md)
- [Security](SECURITY.md)

Copyright 2026 Junho Yoon. Apache License 2.0은 [LICENSE](LICENSE), attribution은 [NOTICE](NOTICE)를 참고한다.

## English Usage

Codex Agent View is a lightweight, read-only companion monitor for the official Codex app. It shows hook-observed parent task/session and subagent activity without replacing or controlling Codex.

> This is an unofficial community project. It is not an OpenAI product, affiliate, or officially supported project.

### Status

The current source version is `0.2.1`. It includes the plugin and marketplace manifests, a genuine Codex skill, privacy-minimized parent-task, subagent, tool, and permission hooks, a bounded in-memory reducer, a token-authenticated `127.0.0.1` runtime, a local dashboard, and `start`, `status`, `doctor`, `install`, and `uninstall` commands.

Plugin installation and lifecycle payloads were verified with Homebrew Codex CLI and the Codex executable embedded in the official app. However, a real-use attempt that installed and enabled `0.2.0` in an already-running official app process delivered zero events while two subagents ran. The monitor, registration, enablement, and installed bundle were healthy, while app logs showed no sender invocation. Evidence indicates that the same process retained a pre-install `hooks/list` snapshot; persisted exact-hook trust is not exposed through CLI JSON, so the precise skip boundary remains unconfirmed.

`0.2.1` adds `SessionStart`, `SessionEnd`, `UserPromptSubmit`, and `Stop` for parent-task lifecycle visibility and makes `status`, `doctor`, and the empty UI distinguish monitor health from hook delivery. In a real E2E after restarting official Codex app `26.727.40816` (`build 6067`) with plugin `0.2.1` installed and enabled, three parent sessions and three subagents appeared automatically without pre-registering task IDs. Real `SessionStart`, `UserPromptSubmit`, `Stop`, `SubagentStart`, `SubagentStop`, `PreToolUse`, `PostToolUse`, and `PermissionRequest` hooks reached the sender, loopback monitor, and UI. `SessionEnd` is wired but has not yet been observed from the real official app, so compatibility for that event is not claimed.

Maintainer npm 2FA is enabled in `auth-and-writes` mode, and `codex-agent-view@0.2.0` is available from the public npm registry. npm publication remains separate from Universal Plugins Directory submission; the plugin is not directory-searchable.

Verified `0.2.0` release: npm `gitHead` and the annotated `v0.2.0` tag both resolve to commit `00b62af56698ac875e39c7d1386905c157c3a7e8`; the registry SRI/signature and all 21 package files against the tagged source were verified. [GitHub Release v0.2.0](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.2.0) is public. A separate npm provenance attestation is optional and was not published for this release.

### Boundaries

Codex Agent View is a live companion, not a historical audit or session-replay product. Bounded in-memory state and reset-on-restart semantics are intentional: they keep privacy and failure boundaries small. SQLite or persistent history is not a missing requirement. Consider it only as a separate explicit opt-in feature if demonstrated user demand justifies retention, migration, deletion, and privacy costs.

- Hooks are the source of truth for live state.
- Operational state exists by design only in bounded process memory; restart begins a new observation window.
- There is no external telemetry, remote server, account, required SQLite/persistent event store, or remote control.
- Prompt text, transcript paths, full tool input/output, and assistant messages are not retained or displayed by the monitor.
- The product cannot stop or restart tasks/subagents, send messages, or approve/deny permissions.
- Missing, duplicated, or out-of-order events remain visible as empty, unknown, or degraded state instead of being guessed away.

A separately launched Codex `0.146` App Server `thread/list` fallback was also tested. It reported both the current root and subagents as `notLoaded`, so it did not share the official app's live running/completed state. Persisted parent IDs, aliases, and depth could enrich metadata, but the fallback could not determine live status and would add state-database reads, privacy surface, and complexity. It is therefore not included in `0.2.1`.

### Why npm, a local browser UI, and the Plugins Directory are different

- npm distributes the local `codex-agent-view` executable, hook sender, runtime, and static UI to the user's machine.
- The browser renders the current read-only companion UI on `127.0.0.1`; it is not an external website or telemetry dashboard.
- The Universal Plugins Directory does not replace npm. A public in-app custom UI path requires a public HTTPS MCP server and domain verification, which conflicts with this project's local-only, no-external-server boundary. Only a separate listing/skills submission remains under consideration; do not expect Directory search installation until review and publication actually finish.

### Requirements and tested versions

- Node.js `>=18`
- npm
- A Codex app or CLI build with plugin commands

| Runtime | Tested version | Scope |
| --- | --- | --- |
| Official Codex app | `26.727.40816` (`build 6067`) | real E2E after restart with plugin `0.2.1`: three parents and three subagents appeared automatically and eight real hook types reached the UI; `SessionEnd` unobserved |
| App-embedded Codex | `0.146.0-alpha.9.2` | isolated install/runtime and lifecycle probe |
| Homebrew Codex CLI | `0.146.0` | isolated install/runtime probe |

These versions are a test matrix, not a minimum-version guarantee.

### Validate and run from source

```bash
git clone https://github.com/JunhoYoon95/codex-agent-view.git
cd codex-agent-view
npm test
npm run validate:plugin
npm run check
node bin/codex-agent-view.mjs doctor --json
node bin/codex-agent-view.mjs install
```

There are no production dependencies; the runtime uses Node.js built-ins. `install` explicitly copies the package into a local marketplace under the runtime directory and registers `codex-agent-view@codex-agent-view`. No `postinstall` script changes Codex settings.

Review the installed plugin and `hooks/hooks.json`, inspect the `node "${PLUGIN_ROOT}/scripts/send-hook.mjs"` command, and explicitly trust the current hook hash. If the app was open before installation, quit it completely and reopen it. Create the test task only after enablement and trust; earlier events are not replayed.

Start the foreground monitor:

```bash
node bin/codex-agent-view.mjs start
```

Use `--no-open` to suppress automatic browser opening. In another terminal:

```bash
node bin/codex-agent-view.mjs status --json
node bin/codex-agent-view.mjs doctor --json
```

`doctor` checks installation, enablement, the installed hook bundle, monitor health, and whether any hook event reached the monitor. Hook trust can remain `unknown`: `codex plugin list --json` does not expose persisted exact-hook trust, so inspect it interactively in Codex CLI `/hooks`.

An empty session list means that this monitor observed no events. It does not prove that Codex has no running task. Stopping or restarting the monitor discards its in-memory state, and downtime events are not replayed.

Once the monitor is running and plugin enablement/trust is complete, hooks from newly created or resumed tasks appear automatically without pre-registering a task ID. Search is only an optional filter over that automatically received list; it does not start tracking or register a task. Events that occurred before installation/trust or while the monitor was down are not replayed.

### Install from npm

The recommended installation for the `0.2.1` release is the exact global version below. At the time of writing, the public registry version confirmed by this document is still `0.2.0`; validate from this repository source until the `0.2.1` publication is confirmed.

```bash
npm install --global codex-agent-view@0.2.1
codex-agent-view doctor
codex-agent-view install
codex-agent-view start
```

Or run the exact version without a global install:

```bash
npx --yes codex-agent-view@0.2.1 doctor
npx --yes codex-agent-view@0.2.1 install
npx --yes codex-agent-view@0.2.1 start
```

That public-artifact evidence applies to `0.2.0`: isolated global and exact-version `npx` CLI lifecycles passed, and fixture events reached status/UI. A later already-running official-app process reproduced zero delivered events. Separate `0.2.1` source/package QA and a restarted official-app E2E confirmed eight real hook types and automatic listing without task-ID registration. The `0.2.1` registry artifact, digest, tag, and GitHub Release still require separate post-publication verification, and a real `SessionEnd` remains unobserved. See [Distribution](docs/distribution.md) for the registry evidence and verification boundary.

npm installation does not modify Codex settings automatically. The explicit `install` command performs local plugin registration and leaves hook trust to the user. npm publication and Universal Plugins Directory submission are separate. See [Distribution](docs/distribution.md) and [Plugin submission](docs/plugin-submission.md).

### Troubleshooting an empty monitor

1. Run `codex-agent-view doctor --json` and check plugin `installed`, `enabled`, hook `wiring_ok`, and monitor `ok`.
2. If `monitor.events_received` is `false`, do not confuse monitor connectivity with successful hook delivery.
3. In interactive Codex CLI `/hooks`, review and trust the exact current `send-hook.mjs` definition.
4. Fully quit and reopen an official app process that was running before plugin installation.
5. Create a new task after enablement/trust, then run a parent prompt and a subagent.

If events are still absent, report the Codex app/CLI version, plugin version, app-versus-CLI runtime, and redacted `doctor` diagnostic codes. Never share the runtime token or a raw payload.

### Privacy

The normal hook path uses `scripts/send-hook.mjs`. It minimizes the local Codex payload before loopback delivery, and the reducer retains only a narrower state schema in memory. The normal monitor does not write an event JSONL history.

`scripts/capture-hook.mjs` is a separate, explicitly invoked Phase 0 diagnostic tool. Setting `CODEX_AGENT_VIEW_CAPTURE_FULL=1` for that script can write raw prompts, tool data, credentials, and other secrets. Normal install/start and the bundled skill never enable it automatically. Do not commit or publicly attach captures or runtime tokens.

Read [Privacy](docs/privacy.md), [Security](SECURITY.md), and [Support](SUPPORT.md) before sharing diagnostics.

### Uninstall

Stop the monitor with `Ctrl+C` when practical, then run:

```bash
node bin/codex-agent-view.mjs doctor --json
node bin/codex-agent-view.mjs uninstall
```

The default command removes plugin/marketplace registration and the copied bundle while preserving remaining runtime data. Use `uninstall --purge` only after reviewing the exact runtime directory and explicitly deciding to remove it. Opt-in captures outside that directory require separate, exact cleanup.

### Documentation and license

- [Roadmap](ROADMAP.md)
- [Phase 0 findings](docs/phase-0-findings.md)
- [Privacy](docs/privacy.md)
- [Terms](docs/terms.md)
- [Support](SUPPORT.md)
- [Security](SECURITY.md)

Copyright 2026 Junho Yoon. Licensed under the Apache License 2.0; see [LICENSE](LICENSE) and [NOTICE](NOTICE).
