# Codex Agent View

Codex Agent View는 공식 Codex 앱 안에서 여러 workspace의 active task와 subagent를 privacy-minimized snapshot으로 보여주고, 필요할 때만 hook 기반 local live monitor를 여는 read-only companion plugin이다. Codex를 대체하거나 task를 제어하지 않는다.

> 비공식 커뮤니티 프로젝트이며 OpenAI의 공식 제품, 제휴 제품, 공식 지원 프로젝트가 아니다.

## 한국어 사용법

### 빠른 시작: 설치 후에는 Codex 앱 안에서만 사용

현재 공개 버전은 `codex-agent-view@0.3.0`이다. Universal Plugins Directory 검색 등록은 아직 완료되지 않았으므로 **최초 설치만** 일반 터미널에서 다음 두 명령으로 진행한다.

```bash
npm install --global codex-agent-view@0.3.0
codex-agent-view install
```

첫 번째 명령은 npm package를 설치하고, 두 번째 명령은 그 package를 Codex의 local plugin으로 명시적으로 등록한다. `npm install`만으로는 Codex 설정을 바꾸지 않으며 이 package에는 설정을 몰래 수정하는 `postinstall` script가 없다.

설치 후에는 다음 순서만 따르면 된다.

1. 설치 전에 Codex 앱이 열려 있었다면 앱을 완전히 종료한 뒤 다시 연다.
2. Codex 앱의 **Plugins** 화면에서 `Codex Agent View`가 설치·활성화됐는지 확인한다.
3. Hook 검토 화면이 표시되면 `hooks/hooks.json`과 `node "${PLUGIN_ROOT}/scripts/send-hook.mjs"` command를 확인하고 현재 definition을 직접 trust한다. 앱 버전이 hook 검토 UI를 제공하지 않을 때만 설치 과정의 일부로 interactive Codex CLI의 `/hooks`를 사용한다.
4. 활성화와 hook 검토를 마친 뒤 Codex 앱에서 **새 task**를 만든다. 설치 전에 시작된 task의 과거 event는 재생되지 않는다.
5. 새 task의 `@` 메뉴에서 `codex-agent-view`를 선택하고 다음처럼 요청한다.

   > 현재 실행 중인 task와 subagent 상태를 보여줘.

6. Hook 단위의 live 화면이 필요할 때는 같은 Codex 앱 task에서 다음처럼 요청한다.

   > Codex Agent View live 화면을 앱 안에서 열어줘.

Plugin은 live 화면 요청 시 healthy local monitor를 내부적으로 재사용하거나 필요할 때 시작하고, 결과를 **Codex 내장 Browser**에서 연다. 일반 사용자는 `start`, `status`, `doctor`를 실행하거나 localhost 주소와 token을 복사할 필요가 없다. 외부 browser도 정상 사용 흐름에 포함되지 않는다.

요약하면 설치는 터미널에서 한 번, 조회·상태 확인·live 화면 열기와 이후 사용은 Codex 앱 안에서 수행한다.

### 현재 상태

현재 source와 public npm `latest`는 `0.3.0`이다. 다음 구성이 공개 package에 포함되어 있다.

- 공식 Codex 앱의 내장 thread tools를 우선 사용하는 app-native active-task snapshot skill
- `.codex-plugin/plugin.json`, local marketplace catalog, genuine Codex skill
- 부모 task용 `SessionStart`, `SessionEnd`, `UserPromptSubmit`, `Stop`과 subagent/tool/permission hook wiring
- privacy-minimized hook sender와 bounded in-memory reducer
- `127.0.0.1` 전용 token-authenticated local HTTP runtime
- 부모 task/session, subagent, 최근 활동, permission wait 상태를 표시하는 local UI
- `start`, `status`, `doctor`, `install`, `uninstall` CLI
- 명시적 설치·hook trust·제거 경로

Homebrew Codex CLI와 공식 앱에 포함된 embedded Codex executable에서는 plugin 설치와 lifecycle payload를 검증했다. 그러나 `0.2.0`을 실행 중인 공식 앱 process에 설치·enable한 실사용 재현에서는 실제 subagent 2개를 실행해도 monitor가 event를 0건 수신했다. Monitor, plugin 등록, enable, 설치 bundle은 정상이었지만 앱 log에는 sender 실행 흔적이 없었다. 같은 app process가 설치 전의 `hooks/list` snapshot을 유지한 정황이 있으며, CLI JSON으로 exact hook trust 상태를 확인할 수 없어 config snapshot과 trust 중 어느 경계에서 skip됐는지는 확정하지 않았다.

`0.2.1`은 부모 task lifecycle hook을 추가하고, `status`, `doctor`, 빈 UI가 “monitor 정상”과 “hook event 수신”을 구분하도록 개선한 patch다. 공식 Codex 앱 `26.727.40816`(`build 6067`)을 재시작하고 설치·활성화된 plugin `0.2.1`을 사용한 실제 E2E에서 task ID를 사전 등록하지 않아도 parent session 3개와 subagent 3개가 UI에 자동으로 나타났다. 실제 hook의 `SessionStart`, `UserPromptSubmit`, `Stop`, `SubagentStart`, `SubagentStop`, `PreToolUse`, `PostToolUse`, `PermissionRequest`가 sender → loopback monitor → UI 경로에 반영됐다. `SessionEnd` wiring은 포함돼 있지만 실제 공식 앱 event는 아직 관찰하지 않았으므로 호환 확인을 주장하지 않는다.

`0.3.0`의 팀장 E2E에서는 공식 앱 내장 thread tools로 `kyurasi-next-supabase`의 active task, workspace basename, title, description, explicit `inProgress` status, 최신 explicit agent commentary와 `subAgentActivity`를 확인했다. 완료 직후 list 결과가 explicit `idle`, `hasUnreadTurn: true`로 바뀌는 것도 확인했다. Skill은 이를 running/active와 분리한 `완료/확인 대기` 표시 그룹에 포함하지만, `idle + unread`만으로 완료 또는 성공을 추론하지 않는다. 별도의 hook/browser monitor에서는 실제 `SessionEnd`까지 관찰했다.

Maintainer npm 2FA는 `auth-and-writes` mode로 활성화됐고 현재 `latest`인 `codex-agent-view@0.3.0`은 public npm registry에서 사용할 수 있다. npm publish와 별개인 Universal Plugins Directory 제출은 아직 완료되지 않아 directory 검색에는 나타나지 않는다.

검증된 `0.2.0` 릴리스: npm `gitHead`와 annotated `v0.2.0` tag는 commit `00b62af56698ac875e39c7d1386905c157c3a7e8`로 일치하고, registry SRI/signature 및 tag source와 registry artifact의 21개 package file byte 일치를 확인했다. [GitHub Release v0.2.0](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.2.0)은 공개 상태다. 별도 npm provenance attestation은 선택 사항이며 이 릴리스에는 없다.

공개 `0.2.1` patch: registry의 `latest`, version, `Apache-2.0` license, executable mapping, 21개 package file, unpacked size `144644`, npm `gitHead` `8d6a67c9aafa23f801235d747ff018d254378970`, shasum, exact SRI와 registry signature를 확인했다. Annotated `v0.2.1` tag는 같은 commit에 생성·push됐고 [GitHub Release v0.2.1](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.2.1)이 공개됐다. Clean cache exact-version `npx --version`을 통과했으며 registry tarball 21개 file과 tagged source가 byte-identical이다. 이 기기의 global install과 copied marketplace도 같은 registry tarball 21개 file과 byte-identical이고, CLI `0.2.1`, plugin installed/enabled, hook wiring 9종, 실제 session 자동 수신과 probe subagent의 running → stopped/UI 완료 반영을 검증했다.

공개 `0.3.0`: npm `latest`/version, `gitHead` `988132d0b525ee5e63f13a0d924810dd3f1bd93a`, shasum `08e2e5fa8c1133a1dcc3faae8f354535f9fc07b0`, exact SRI, registry signature, 21 files와 unpacked size `158.8 kB`를 확인했다. Annotated `v0.3.0` tag가 push됐고 [GitHub Release v0.3.0](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.3.0)이 공개됐다. 이 기기에 public exact `0.3.0`을 global reinstall해 plugin installed/enabled와 hook wiring 9종을 확인했다. Registry tarball과 global install의 artifact diff는 0이며 copied marketplace도 ownership marker 1개를 제외한 artifact file이 동일하다. Public install monitor에서 실제 hook, `workspace_label: codex-agent-view`, `PermissionRequest`, tool lifecycle과 probe subagent의 running → stopped 전환(`has_out_of_order_events: false`)을 확인했다.

### 제품 경계

Codex Agent View는 historical audit이나 session replay 제품이 아니라 현재 활동을 보여주는 live companion이다. Bounded in-memory state와 monitor 재시작 시 reset은 privacy와 단순한 failure boundary를 위한 의도된 완성 설계다. SQLite/영구 history는 누락된 요구사항이 아니다. 실제 사용자 요구가 입증될 때에만 retention, migration, deletion, privacy 비용을 별도 검토하는 명시적 opt-in 기능 후보로 취급한다.

- 앱 안의 현재 task snapshot은 공식 Codex 앱이 제공하는 내장 thread tools의 explicit status와 `subAgentActivity`를 우선 사용한다.
- Hook event는 local monitor의 세부 lifecycle 상태에 대한 source of truth다. Monitor state는 bounded memory에만 있고 재시작하면 새 관찰 window가 시작된다.
- 외부 telemetry, 원격 server, account, 필수 SQLite/영구 event store가 없다.
- prompt, transcript path, 전체 tool input/output, assistant message를 monitor 상태나 UI에 저장·표시하지 않는다.
- task/subagent 중지·재시작, message 전송, permission 자동 승인·거절 기능이 없다.
- 별도로 실행한 App Server는 앱 내장 thread tools와 다른 process다. 공식 앱의 live source로 간주하거나 둘을 같은 API로 설명하지 않는다.

별도로 실행한 Codex `0.146` App Server의 `thread/list` fallback도 실제 확인했지만 현재 root/subagent가 모두 `notLoaded`로 나타나 공식 앱의 live running/completed 상태를 공유하지 않았다. Persisted parent ID, alias, depth 보강은 가능했지만 live 판별에는 채택하지 않았다. `0.3.0`의 primary snapshot은 이 별도 server가 아니라 현재 공식 앱이 직접 제공하는 내장 thread tools를 사용한다.

### npm, Codex 앱 live view, Plugins Directory의 역할

- 공식 Codex 앱에서 plugin에게 `Show active tasks`라고 요청하는 것이 `0.3.0`의 primary UX다. 별도 monitor 실행이나 task ID 등록이 필요 없다.
- npm은 plugin bundle, 내부 hook sender/runtime과 static UI를 사용자 machine에 배포하는 최초 설치 경로다.
- Live view는 사용자가 앱 안에서 명시적으로 요청했을 때만 Codex 내장 Browser에 열린다. 외부 website나 telemetry dashboard가 아니다.
- Universal Plugins Directory는 npm의 대체재가 아니다. 공개 directory의 in-app custom UI 경로는 public HTTPS MCP server와 domain verification이 필요해 local-only/no-external-server 원칙과 충돌한다. 현재는 별도의 listing/skills 제출 가능성만 검토하며, 심사·publish 전에는 Codex plugin 검색으로 설치할 수 있다고 안내하지 않는다.

Hook event가 누락·중복·역순으로 올 수 있으므로 UI의 `unknown`, `stopped_without_start`, 빈 상태는 그대로 해석해야 한다. 빈 session 목록은 “이 monitor가 event를 관찰하지 못함”이며 “실행 중인 task가 없음”의 증거가 아니다.

### 공식 Codex 앱에서 사용 — 권장

이 절차는 위의 빠른 시작에서 설치와 활성화를 마친 뒤 **새 task**에서 수행한다. 별도 terminal이나 외부 browser는 사용하지 않는다.

1. 새 task의 `@` 메뉴에서 `codex-agent-view`를 선택한다.
2. `Show active tasks` 또는 “현재 active task와 subagent를 보여줘”라고 요청한다.
3. Plugin은 여러 workspace의 running/active task와 explicit `idle + hasUnreadTurn` task를 조회한다. 후자는 별도 `완료/확인 대기` 그룹에 표시하되 완료·성공으로 단정하지 않는다.
4. Workspace basename, 표시용 title, explicit status, 최신 explicit agent commentary와 `subAgentActivity`만 간결하게 보여준다.
5. Prompt, preview, tool input/output, full workspace path와 internal thread ID는 기본 표시하지 않는다.

Live hook detail이 필요할 때만 앱 안에서 “Open the live Codex Agent View in the built-in Browser”라고 요청한다. Plugin은 healthy monitor를 내부적으로 재사용하거나 시작하며 tokenized localhost URL을 대화에 노출하지 않는다.

### 요구사항과 검증 범위

- Node.js `>=18`
- npm
- plugin command를 지원하는 Codex CLI 또는 공식 Codex 앱

아래 버전은 현재 테스트 matrix이며 지원 하한 보장이 아니다.

| Runtime | 확인된 버전 | 확인 범위 |
| --- | --- | --- |
| 공식 Codex 앱 | `26.727.40816` (`build 6067`) | `0.3.0` public release에서 app-native task snapshot, 실제 `SessionEnd`, workspace label, permission/tool lifecycle과 subagent running → stopped 확인 |
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

### Maintainer·고급 진단 전용 CLI

이 절은 package 개발자와 문제 보고를 위한 진단 참고 자료이며 일반 사용자 사용법이 아니다. 설치가 끝난 사용자는 Codex 앱에서 snapshot이나 live 화면을 요청해야 한다. 아래 명령과 localhost 주소를 정상 사용 순서에 넣거나 사용자에게 직접 관리하도록 요구하지 않는다.

Source checkout에서 local runtime을 별도로 검증해야 할 때만 다음처럼 실행할 수 있다.

```bash
node bin/codex-agent-view.mjs start --no-open
```

Runtime은 loopback interface에만 bind된다. `--no-open`은 운영체제의 외부 browser를 열지 않는 진단용 형태다. 출력되는 tokenized URL은 비밀로 취급하고 공유하거나 문서·issue에 붙이지 않는다.

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

### npm 설치 명령 참고

아래 명령은 현재 public `latest`인 exact `0.3.0`을 설치한다.

```bash
npm install --global codex-agent-view@0.3.0
codex-agent-view install
```

이 두 명령 뒤에는 Codex 앱을 완전히 다시 열고 Plugins 화면에서 설치·활성화를 확인한 다음, 새 task에서 `@codex-agent-view`를 선택한다. Monitor 시작과 상태 조회는 plugin이 앱 안의 요청에 맞춰 처리하므로 사용자가 CLI를 실행하지 않는다.

Global install 없이 exact version을 일회성으로 실행할 수도 있다.

```bash
npx --yes codex-agent-view@0.3.0 install
```

`npx` 경로도 explicit `install`을 실행하는 최초 설치 방법일 뿐이다. 이후 사용은 동일하게 Codex 앱 안에서 진행한다.

`0.2.0`/`0.2.1` evidence는 historical record로 보존한다. Public exact `0.3.0`은 registry metadata/signature, tag/release, 이 기기 global reinstall과 artifact comparison을 통과했고 실제 hook, workspace label, permission/tool lifecycle 수신을 확인했다. Registry evidence와 검증 경계는 [docs/distribution.md](docs/distribution.md)에 기록한다.

npm install 자체는 Codex 설정을 자동 변경하지 않는다. `install` command는 사용자가 명시적으로 실행하며 hook trust도 사용자 검토로 남긴다. npm publish와 Universal Plugins Directory 제출은 서로 별도 절차다. 자세한 배포 경계는 [docs/distribution.md](docs/distribution.md), directory 제출 상태는 [docs/plugin-submission.md](docs/plugin-submission.md)를 참고한다.

### Privacy와 opt-in diagnostic capture

정상 hook 경로는 `scripts/send-hook.mjs`다. 이 sender는 allowlisted metadata만 값으로 남기고 나머지는 type/key/length summary로 바꾼 뒤 loopback으로 보낸다. 전체 `cwd` 대신 control character를 제거하고 120자로 제한한 basename `workspace_label`만 파생한다. Runtime reducer는 lifecycle field와 이 label을 bounded memory에만 유지한다.

정상 monitor는 event JSONL을 쓰지 않는다. `scripts/capture-hook.mjs`는 Phase 0 검증용 별도 diagnostic script이며 누군가 명시적으로 실행하거나 hook에 연결할 때만 `events.jsonl`을 만든다.

`CODEX_AGENT_VIEW_CAPTURE_FULL=1`은 diagnostic script의 redaction을 끄며 raw prompt, tool data, credential을 기록할 수 있다. 일반 사용, skill workflow, install/start command는 이를 자동 enable하지 않는다. Raw capture와 runtime token을 commit하거나 public issue에 첨부하지 않는다.

전체 data flow, token lifecycle, capture 위치는 [Privacy](docs/privacy.md), 취약점 신고는 [Security](SECURITY.md)를 참고한다.

### 제거와 복구

제거는 최초 설치와 마찬가지로 terminal을 사용하는 명시적 lifecycle 작업이다. Maintainer 진단용 foreground monitor를 따로 실행 중인 경우에만 먼저 `Ctrl+C`로 종료하고 다음을 실행한다.

```bash
codex-agent-view uninstall
```

기본 `uninstall`은 plugin 등록, marketplace 등록, copied marketplace bundle을 제거하지만 runtime directory의 나머지 data는 보존한다. 사용자가 `doctor`가 보여준 exact runtime directory까지 제거하길 명시적으로 원할 때만 다음을 사용한다.

```bash
codex-agent-view uninstall --purge
```

Source checkout을 직접 실행한 경우에만 같은 명령의 `node bin/codex-agent-view.mjs uninstall` 또는 `node bin/codex-agent-view.mjs uninstall --purge` 형식을 사용한다.

별도 `PLUGIN_DATA`, `CODEX_AGENT_VIEW_CAPTURE_DIR`, project working directory에 만든 opt-in diagnostic capture는 runtime directory 밖에 있을 수 있다. 정확한 위치를 검토해 별도로 정리하고 broad Codex/home directory를 삭제하지 않는다.

### Maintainer troubleshooting

이 절의 CLI 확인은 명시적인 문제 조사용이다. 정상 사용자는 Codex 앱 안에서 plugin에게 상태 확인을 요청한다.

#### `status`가 runtime file 또는 connection error를 출력함

```bash
node bin/codex-agent-view.mjs doctor --json
```

Monitor가 실행 중인지, stale runtime file인지, runtime directory가 예상한 위치인지 확인한다. 진단 과정에서 runtime을 직접 시작해야 한다면 외부 browser를 열지 않는 `start --no-open`만 사용한다.

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

Codex Agent View is a read-only companion plugin that shows privacy-minimized active tasks and subagents across workspaces inside the official Codex app, with an optional hook-based local live monitor.

> This is an unofficial community project. It is not an OpenAI product, affiliate, or officially supported project.

### Quick start: install once, then stay inside the Codex app

The current public version is `codex-agent-view@0.3.0`. Universal Plugins Directory search installation is not available yet, so use a regular terminal for the **initial installation only**:

```bash
npm install --global codex-agent-view@0.3.0
codex-agent-view install
```

The first command installs the npm package. The second explicitly registers that package as a local Codex plugin. `npm install` alone does not change Codex settings, and the package has no `postinstall` script that silently modifies them.

After installation:

1. If the Codex app was open during installation, quit it completely and reopen it.
2. In the Codex app's **Plugins** screen, confirm that `Codex Agent View` is installed and enabled.
3. If a hook-review screen is shown, inspect `hooks/hooks.json` and the `node "${PLUGIN_ROOT}/scripts/send-hook.mjs"` command, then explicitly trust the current definition. Use interactive Codex CLI `/hooks` only as part of installation when the app version does not expose hook review.
4. After enablement and hook review, create a **new task** in the Codex app. Events that occurred before installation are not replayed.
5. In the new task, open the `@` menu, select `codex-agent-view`, and ask:

   > Show the currently active tasks and subagents.

6. For hook-level live detail, ask in that same Codex app task:

   > Open the Codex Agent View live view inside the app.

For a live-view request, the plugin internally reuses a healthy local monitor or starts one when needed, then opens it in the **Codex built-in Browser**. Normal users do not run `start`, `status`, or `doctor`, copy localhost URLs or tokens, or manage an external browser.

In short: install once in a terminal; perform snapshot queries, status checks, live-view opening, and all routine use inside the Codex app.

### Status

The current source and public npm `latest` are `0.3.0`. The published package includes an app-native snapshot skill that prioritizes the official Codex app's built-in thread tools, plus privacy-minimized hooks, a bounded in-memory reducer, an optional token-authenticated `127.0.0.1` dashboard, and lifecycle CLI commands.

Plugin installation and lifecycle payloads were verified with Homebrew Codex CLI and the Codex executable embedded in the official app. However, a real-use attempt that installed and enabled `0.2.0` in an already-running official app process delivered zero events while two subagents ran. The monitor, registration, enablement, and installed bundle were healthy, while app logs showed no sender invocation. Evidence indicates that the same process retained a pre-install `hooks/list` snapshot; persisted exact-hook trust is not exposed through CLI JSON, so the precise skip boundary remains unconfirmed.

`0.2.1` adds `SessionStart`, `SessionEnd`, `UserPromptSubmit`, and `Stop` for parent-task lifecycle visibility and makes `status`, `doctor`, and the empty UI distinguish monitor health from hook delivery. In a real E2E after restarting official Codex app `26.727.40816` (`build 6067`) with plugin `0.2.1` installed and enabled, three parent sessions and three subagents appeared automatically without pre-registering task IDs. Real `SessionStart`, `UserPromptSubmit`, `Stop`, `SubagentStart`, `SubagentStop`, `PreToolUse`, `PostToolUse`, and `PermissionRequest` hooks reached the sender, loopback monitor, and UI. `SessionEnd` is wired but has not yet been observed from the real official app, so compatibility for that event is not claimed.

In the lead's `0.3.0` E2E, the official app's built-in thread tools reported the active `kyurasi-next-supabase` task with workspace basename, title, description, explicit `inProgress` status, latest explicit agent commentary, and `subAgentActivity`. Immediately afterward, the list result changed to explicit `idle` with `hasUnreadTurn: true`. The skill separates this into a `Finished / needs review` display group instead of the running/active group, but does not infer completion or success from `idle + unread`. The separate hook/browser monitor also observed a real `SessionEnd`.

Maintainer npm 2FA is enabled in `auth-and-writes` mode, and the current public `latest`, `codex-agent-view@0.3.0`, is available from the npm registry. npm publication remains separate from Universal Plugins Directory submission; the plugin is not directory-searchable.

Verified `0.2.0` release: npm `gitHead` and the annotated `v0.2.0` tag both resolve to commit `00b62af56698ac875e39c7d1386905c157c3a7e8`; the registry SRI/signature and all 21 package files against the tagged source were verified. [GitHub Release v0.2.0](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.2.0) is public. A separate npm provenance attestation is optional and was not published for this release.

Public `0.2.1` patch: registry `latest`, version, `Apache-2.0` license, executable mapping, 21 package files, unpacked size `144644`, npm `gitHead` `8d6a67c9aafa23f801235d747ff018d254378970`, shasum, exact SRI, and registry signature were verified. The annotated `v0.2.1` tag was created at and pushed for that same commit, and [GitHub Release v0.2.1](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.2.1) is public. A clean-cache exact-version `npx --version` passed, and all 21 registry-tarball files are byte-identical to the tagged source. This machine's global install and copied marketplace are also byte-identical to those 21 registry files; CLI `0.2.1`, installed/enabled plugin state, all nine hook declarations, automatic live reception, and a probe subagent's running → stopped/UI completion transition were verified.

Public `0.3.0`: npm `latest`/version, `gitHead` `988132d0b525ee5e63f13a0d924810dd3f1bd93a`, shasum `08e2e5fa8c1133a1dcc3faae8f354535f9fc07b0`, exact SRI, registry signature, 21 files, and an unpacked size of `158.8 kB` were verified. The annotated `v0.3.0` tag was pushed and [GitHub Release v0.3.0](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.3.0) is public. This machine was globally reinstalled from exact public `0.3.0`; the plugin is installed/enabled with all nine hooks wired. Registry-to-global artifact diff is zero, and the copied marketplace matches aside from one ownership marker. The public install monitor received real hooks, `workspace_label: codex-agent-view`, `PermissionRequest`, tool lifecycle events, and a probe subagent's running → stopped transition with `has_out_of_order_events: false`.

### Boundaries

Codex Agent View is a live companion, not a historical audit or session-replay product. Bounded in-memory state and reset-on-restart semantics are intentional: they keep privacy and failure boundaries small. SQLite or persistent history is not a missing requirement. Consider it only as a separate explicit opt-in feature if demonstrated user demand justifies retention, migration, deletion, and privacy costs.

- The app-native current-task snapshot prioritizes explicit status and `subAgentActivity` from the official Codex app's built-in thread tools.
- Hooks remain the source of truth for detailed lifecycle state in the optional local monitor. Its operational state exists only in bounded process memory; restart begins a new observation window.
- There is no external telemetry, remote server, account, required SQLite/persistent event store, or remote control.
- Prompt text, transcript paths, full tool input/output, and assistant messages are not retained or displayed by the monitor.
- The product cannot stop or restart tasks/subagents, send messages, or approve/deny permissions.
- Missing, duplicated, or out-of-order events remain visible as empty, unknown, or degraded state instead of being guessed away.

A separately launched Codex `0.146` App Server `thread/list` fallback was also tested. It reported both the current root and subagents as `notLoaded`, so it did not share the official app's live running/completed state. That separate process is not the same as the built-in thread tools exposed directly by the current official app; `0.3.0` uses the latter for its primary snapshot.

### The roles of npm, the Codex app live view, and the Plugins Directory

- Asking the plugin `Show active tasks` inside the official Codex app is the primary `0.3.0` UX; it does not require starting a monitor or registering task IDs.
- npm is the initial installation path that distributes the plugin bundle, its internal hook sender/runtime, and static UI to the user's machine.
- The live view opens in the Codex built-in Browser only after an explicit in-app request; it is not an external website or telemetry dashboard.
- The Universal Plugins Directory does not replace npm. A public in-app custom UI path requires a public HTTPS MCP server and domain verification, which conflicts with this project's local-only, no-external-server boundary. Only a separate listing/skills submission remains under consideration; do not expect Directory search installation until review and publication actually finish.

### Use in the official Codex app — recommended

Use this flow in a **new task** after completing installation and enablement in the quick start. It requires neither another terminal nor an external browser.

1. Open the `@` menu and select `codex-agent-view`.
2. Ask `Show active tasks`.
3. The plugin queries running/active tasks plus tasks with explicit `idle` and `hasUnreadTurn: true`. It places the latter in a separate `Finished / needs review` display group without claiming completion or success.
4. It displays only workspace basename, display-only title, explicit status, latest explicit agent commentary, and a small `subAgentActivity` tree.
5. Prompts, previews, tool input/output, full workspace paths, and internal thread IDs remain hidden by default.

Ask `Open the live Codex Agent View in the built-in Browser` inside the app only when you want hook-level live detail. The plugin internally reuses or starts a healthy monitor and never exposes its tokenized localhost URL in chat.

### Requirements and tested versions

- Node.js `>=18`
- npm
- A Codex app or CLI build with plugin commands

| Runtime | Tested version | Scope |
| --- | --- | --- |
| Official Codex app | `26.727.40816` (`build 6067`) | Public `0.3.0` confirmed app-native task snapshots, real `SessionEnd`, workspace labeling, permission/tool lifecycle, and subagent running → stopped |
| App-embedded Codex | `0.146.0-alpha.9.2` | isolated install/runtime and lifecycle probe |
| Homebrew Codex CLI | `0.146.0` | isolated install/runtime probe |

These versions are a test matrix, not a minimum-version guarantee.

### Validate from source

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

### Maintainer and advanced diagnostics CLI

This section is reference material for package maintainers and explicit troubleshooting. It is not the normal user workflow. After installation, users should request snapshots and live views inside the Codex app; do not make them manage these commands or localhost URLs.

Only when validating the local runtime from a source checkout, a maintainer can start it without opening an operating-system browser:

```bash
node bin/codex-agent-view.mjs start --no-open
```

The runtime binds only to the loopback interface. Treat the printed tokenized URL as a secret; never share it or paste it into documentation or an issue. In another diagnostic terminal:

```bash
node bin/codex-agent-view.mjs status --json
node bin/codex-agent-view.mjs doctor --json
```

`doctor` checks installation, enablement, the installed hook bundle, monitor health, and whether any hook event reached the monitor. Hook trust can remain `unknown`: `codex plugin list --json` does not expose persisted exact-hook trust, so inspect it interactively in Codex CLI `/hooks`.

An empty session list means that this monitor observed no events. It does not prove that Codex has no running task. Stopping or restarting the monitor discards its in-memory state, and downtime events are not replayed.

Once the monitor is running and plugin enablement/trust is complete, hooks from newly created or resumed tasks appear automatically without pre-registering a task ID. Search is only an optional filter over that automatically received list; it does not start tracking or register a task. Events that occurred before installation/trust or while the monitor was down are not replayed.

### Install from npm

The commands below install the current public exact `0.3.0` release.

```bash
npm install --global codex-agent-view@0.3.0
codex-agent-view install
```

After these two commands, fully reopen the Codex app, verify installation and enablement in Plugins, create a new task, and select `@codex-agent-view`. The plugin handles monitor startup and status checks in response to in-app requests; users do not run those CLI commands.

Or run the exact version without a global install:

```bash
npx --yes codex-agent-view@0.3.0 install
```

The `npx` form is also an initial explicit-install path only. Routine use remains inside the Codex app afterward.

The `0.2.0` and `0.2.1` evidence remains as historical release record. Public exact `0.3.0` passed registry metadata/signature, tag/release, this-device global reinstall, and artifact comparison checks; its monitor received real hooks, workspace labeling, permission, and tool lifecycle events. See [Distribution](docs/distribution.md).

npm installation does not modify Codex settings automatically. The explicit `install` command performs local plugin registration and leaves hook trust to the user. npm publication and Universal Plugins Directory submission are separate. See [Distribution](docs/distribution.md) and [Plugin submission](docs/plugin-submission.md).

### Maintainer troubleshooting for an empty monitor

1. Run `codex-agent-view doctor --json` and check plugin `installed`, `enabled`, hook `wiring_ok`, and monitor `ok`.
2. If `monitor.events_received` is `false`, do not confuse monitor connectivity with successful hook delivery.
3. In interactive Codex CLI `/hooks`, review and trust the exact current `send-hook.mjs` definition.
4. Fully quit and reopen an official app process that was running before plugin installation.
5. Create a new task after enablement/trust, then run a parent prompt and a subagent.

If events are still absent, report the Codex app/CLI version, plugin version, app-versus-CLI runtime, and redacted `doctor` diagnostic codes. Never share the runtime token or a raw payload.

### Privacy

The normal hook path uses `scripts/send-hook.mjs`. It derives only a sanitized, 120-character-bounded workspace basename as `workspace_label`; the full `cwd` is not sent or stored as content. The reducer keeps this label and narrower lifecycle state only in bounded memory. The normal monitor does not write an event JSONL history.

`scripts/capture-hook.mjs` is a separate, explicitly invoked Phase 0 diagnostic tool. Setting `CODEX_AGENT_VIEW_CAPTURE_FULL=1` for that script can write raw prompts, tool data, credentials, and other secrets. Normal install/start and the bundled skill never enable it automatically. Do not commit or publicly attach captures or runtime tokens.

Read [Privacy](docs/privacy.md), [Security](SECURITY.md), and [Support](SUPPORT.md) before sharing diagnostics.

### Uninstall

Uninstall is an explicit terminal lifecycle action, like initial installation. Only when a maintainer foreground monitor is already running, stop that diagnostic process with `Ctrl+C`, then run:

```bash
codex-agent-view uninstall
```

The default command removes plugin/marketplace registration and the copied bundle while preserving remaining runtime data. Use the following only after reviewing the exact runtime directory and explicitly deciding to remove it:

```bash
codex-agent-view uninstall --purge
```

For a source checkout only, use the equivalent `node bin/codex-agent-view.mjs uninstall` or `node bin/codex-agent-view.mjs uninstall --purge` form. Opt-in captures outside that directory require separate, exact cleanup.

### Documentation and license

- [Roadmap](ROADMAP.md)
- [Phase 0 findings](docs/phase-0-findings.md)
- [Privacy](docs/privacy.md)
- [Terms](docs/terms.md)
- [Support](SUPPORT.md)
- [Security](SECURITY.md)

Copyright 2026 Junho Yoon. Licensed under the Apache License 2.0; see [LICENSE](LICENSE) and [NOTICE](NOTICE).
