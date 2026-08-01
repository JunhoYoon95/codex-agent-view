# Codex Agent View

Codex Agent View는 공식 Codex 앱을 그대로 사용하면서 부모 task와 subagent의 hook 기반 활동을 한눈에 보여주는 가벼운 read-only companion monitor다. Codex를 대체하거나 task를 제어하지 않는다.

> 비공식 커뮤니티 프로젝트이며 OpenAI의 공식 제품, 제휴 제품, 공식 지원 프로젝트가 아니다.

## 한국어 사용법

### 현재 상태

현재 source version은 `0.2.0`이다. 다음 구성은 구현되어 있다.

- `.codex-plugin/plugin.json`, local marketplace catalog, genuine Codex skill
- `SubagentStart`, `SubagentStop`, `PreToolUse`, `PostToolUse`, `PermissionRequest` hook wiring
- privacy-minimized hook sender와 bounded in-memory reducer
- `127.0.0.1` 전용 token-authenticated local HTTP runtime
- 부모 task/session, subagent, 최근 활동, permission wait 상태를 표시하는 local UI
- `start`, `status`, `doctor`, `install`, `uninstall` CLI
- 명시적 설치·hook trust·제거 경로

Homebrew Codex CLI와 공식 앱에 포함된 embedded Codex executable에서 plugin 설치와 실제 lifecycle payload를 검증했다. Local companion 제품 구현은 완료되었으며, 공식 Codex 앱의 **현재 GUI task에서 trusted hook → local monitor → UI 전체 흐름을 확인하는 최종 E2E**와 실제 `PermissionRequest` payload 관찰은 외부 compatibility acceptance로 남아 있다. 이는 구현되지 않은 제품 기능 목록이 아니라 현재 공식 앱 조합에 대한 미확인 검증 범위다.

Maintainer npm 2FA는 `auth-and-writes` mode로 활성화됐고 `codex-agent-view@0.2.0`은 public npm registry에서 사용할 수 있다. npm publish와 별개인 Universal Plugins Directory 제출은 아직 완료되지 않아 directory 검색에는 나타나지 않는다.

검증된 `0.2.0` 릴리스: npm `gitHead`와 annotated `v0.2.0` tag는 commit `00b62af56698ac875e39c7d1386905c157c3a7e8`로 일치하고, registry SRI/signature 및 tag source와 registry artifact의 21개 package file byte 일치를 확인했다. [GitHub Release v0.2.0](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.2.0)은 공개 상태다. 별도 npm provenance attestation은 선택 사항이며 이 릴리스에는 없다.

### 제품 경계

Codex Agent View는 historical audit이나 session replay 제품이 아니라 현재 활동을 보여주는 live companion이다. Bounded in-memory state와 monitor 재시작 시 reset은 privacy와 단순한 failure boundary를 위한 의도된 `0.2.0` 완성 설계다. SQLite/영구 history는 누락된 요구사항이 아니다. 실제 사용자 요구가 입증될 때에만 retention, migration, deletion, privacy 비용을 별도 검토하는 명시적 opt-in 기능 후보로 취급한다.

- live 상태의 source of truth는 hook event다.
- Live 상태는 설계대로 monitor process의 bounded memory에만 있고 재시작하면 새 관찰 window가 시작된다.
- 외부 telemetry, 원격 server, account, 필수 SQLite/영구 event store가 없다.
- prompt, transcript path, 전체 tool input/output, assistant message를 monitor 상태나 UI에 저장·표시하지 않는다.
- task/subagent 중지·재시작, message 전송, permission 자동 승인·거절 기능이 없다.
- App Server는 향후 계층 metadata 보강 후보일 뿐이며 공식 앱 process와 memory를 공유한다고 가정하지 않는다.

Hook event가 누락·중복·역순으로 올 수 있으므로 UI의 `unknown`, `stopped_without_start`, 빈 상태는 그대로 해석해야 한다. 빈 session 목록은 “이 monitor가 event를 관찰하지 못함”이며 “실행 중인 task가 없음”의 증거가 아니다.

### 요구사항과 검증 범위

- Node.js `>=18`
- npm
- plugin command를 지원하는 Codex CLI 또는 공식 Codex 앱

아래 버전은 현재 테스트 matrix이며 지원 하한 보장이 아니다.

| Runtime | 확인된 버전 | 확인 범위 |
| --- | --- | --- |
| 공식 Codex 앱 | `26.727.40816` (`build 6067`) | bundle metadata, GUI current-task compatibility acceptance 대기 |
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
5. 공식 앱을 완전히 재시작하고 **새 task**를 만든다.

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
- `doctor`는 Codex CLI, plugin 설치, monitor, runtime directory를 진단한다.
- `Ctrl+C`는 monitor를 종료하며 in-memory state와 정상 종료된 runtime file을 정리한다.

Monitor가 꺼져 있어도 hook sender는 fail-open으로 끝나 Codex task를 막지 않는다. Monitor를 나중에 켜면 꺼져 있던 동안의 event가 복구되지는 않는다.

### npm에서 설치

권장 설치 방법은 public registry의 exact version을 global로 설치하는 것이다.

```bash
npm install --global codex-agent-view@0.2.0
codex-agent-view doctor
codex-agent-view install
codex-agent-view start
```

Global install 없이 exact version을 일회성으로 실행할 수도 있다.

```bash
npx --yes codex-agent-view@0.2.0 doctor
npx --yes codex-agent-view@0.2.0 install
npx --yes codex-agent-view@0.2.0 start
```

Public exact artifact는 isolated global install과 exact-version `npx` 양쪽에서 `--version`, `doctor`, `install`, ephemeral-port `start`, `status`, `uninstall`을 통과했다. 별도 E2E fixture에서는 다섯 hook event가 status/UI에 반영됐고 search/filter, browser console 무오류, purge 뒤 빈 plugin/runtime 상태까지 확인했다. Registry digest를 포함한 검증 범위는 [docs/distribution.md](docs/distribution.md)에 기록한다.

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

- plugin이 설치뿐 아니라 enable됐는지 확인한다.
- 현재 `send-hook.mjs` definition을 검토하고 trust했는지 확인한다.
- plugin enable/trust 후 공식 앱을 재시작하고 새 task를 만들었는지 확인한다.
- monitor가 event 발생 전에 실행 중이었는지 확인한다.
- 빈 상태만으로 GUI hook 미지원이라고 결론내리지 않는다.

#### `PermissionRequest`가 표시되지 않음

Approval이 실제 필요한 동작에서만 발생할 수 있다. 현재 공식 앱 GUI의 실제 payload는 external compatibility evidence가 아직 없어, 표시되지 않는 원인을 schema 문제와 “event 자체가 발생하지 않음”으로 분리해 조사한다. Monitor는 approval을 자동 처리하지 않는다.

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

The current source version is `0.2.0`. It includes the plugin and marketplace manifests, a genuine Codex skill, privacy-minimized hooks, a bounded in-memory reducer, a token-authenticated `127.0.0.1` runtime, a local dashboard, and `start`, `status`, `doctor`, `install`, and `uninstall` commands. The local companion product implementation is complete.

Plugin installation and real lifecycle payloads were verified with Homebrew Codex CLI and the Codex executable embedded in the official app. The final **trusted hook → local monitor → UI E2E in a current official Codex GUI task remains unverified**, and a real `PermissionRequest` payload has not been observed. These are external compatibility-acceptance checks for the current official app combination, not missing local product features.

Maintainer npm 2FA is enabled in `auth-and-writes` mode, and `codex-agent-view@0.2.0` is available from the public npm registry. npm publication remains separate from Universal Plugins Directory submission; the plugin is not directory-searchable.

Verified `0.2.0` release: npm `gitHead` and the annotated `v0.2.0` tag both resolve to commit `00b62af56698ac875e39c7d1386905c157c3a7e8`; the registry SRI/signature and all 21 package files against the tagged source were verified. [GitHub Release v0.2.0](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.2.0) is public. A separate npm provenance attestation is optional and was not published for this release.

### Boundaries

Codex Agent View is a live companion, not a historical audit or session-replay product. Bounded in-memory state and reset-on-restart semantics are the intentional completed `0.2.0` design: they keep privacy and failure boundaries small. SQLite or persistent history is not a missing requirement. Consider it only as a separate explicit opt-in feature if demonstrated user demand justifies retention, migration, deletion, and privacy costs.

- Hooks are the source of truth for live state.
- Operational state exists by design only in bounded process memory; restart begins a new observation window.
- There is no external telemetry, remote server, account, required SQLite/persistent event store, or remote control.
- Prompt text, transcript paths, full tool input/output, and assistant messages are not retained or displayed by the monitor.
- The product cannot stop or restart tasks/subagents, send messages, or approve/deny permissions.
- Missing, duplicated, or out-of-order events remain visible as empty, unknown, or degraded state instead of being guessed away.

### Requirements and tested versions

- Node.js `>=18`
- npm
- A Codex app or CLI build with plugin commands

| Runtime | Tested version | Scope |
| --- | --- | --- |
| Official Codex app | `26.727.40816` (`build 6067`) | bundle metadata; current GUI-task E2E pending |
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

Review the installed plugin and `hooks/hooks.json`, inspect the `node "${PLUGIN_ROOT}/scripts/send-hook.mjs"` command, explicitly trust the current hook hash, restart the official app, and create a new task.

Start the foreground monitor:

```bash
node bin/codex-agent-view.mjs start
```

Use `--no-open` to suppress automatic browser opening. In another terminal:

```bash
node bin/codex-agent-view.mjs status --json
node bin/codex-agent-view.mjs doctor --json
```

An empty session list means that this monitor observed no events. It does not prove that Codex has no running task. Stopping or restarting the monitor discards its in-memory state, and downtime events are not replayed.

### Install from npm

Install the public exact version globally:

```bash
npm install --global codex-agent-view@0.2.0
codex-agent-view doctor
codex-agent-view install
codex-agent-view start
```

Or run the exact version without a global install:

```bash
npx --yes codex-agent-view@0.2.0 doctor
npx --yes codex-agent-view@0.2.0 install
npx --yes codex-agent-view@0.2.0 start
```

The public exact artifact passed `--version`, `doctor`, `install`, ephemeral-port `start`, `status`, and `uninstall` through both an isolated global installation and exact-version `npx`. A separate E2E fixture confirmed that all five hook events reached status/UI, search and filtering worked without browser-console errors, and purge left plugin/runtime state empty. See [Distribution](docs/distribution.md) for the registry digest and verification scope.

npm installation does not modify Codex settings automatically. The explicit `install` command performs local plugin registration and leaves hook trust to the user. npm publication and Universal Plugins Directory submission are separate. See [Distribution](docs/distribution.md) and [Plugin submission](docs/plugin-submission.md).

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
