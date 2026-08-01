# Codex Agent View

> [Read in English](https://github.com/JunhoYoon95/codex-agent-view/blob/main/README.md)

Codex Agent View는 공식 Codex 앱 안에서 여러 workspace의 active task와 subagent를 privacy-minimized snapshot으로 보여주는 read-only companion plugin이다. Trusted hook이 local live backend를 자동 준비하고 bundled **Show Agents** skill로 사용자가 Codex 앱에서 live 화면을 열 수 있게 한다. Codex를 대체하거나 task를 제어하지 않는다.

> 비공식 커뮤니티 프로젝트이며 OpenAI의 공식 제품, 제휴 제품, 공식 지원 프로젝트가 아니다.

## 한국어 사용법

### 빠른 시작: 설치 후에는 Codex 앱 안에서만 사용

이 README의 source release candidate와 package 버전은 `codex-agent-view@0.4.0`이다. 아직 npm에 publish되지 않았으며 현재 public npm `latest`는 `0.3.2`다. `0.4.0`이 publish된 뒤에는 **최초 설치만** 일반 터미널에서 다음 exact-version 명령으로 진행한다.

```bash
npm install --global codex-agent-view@0.4.0
codex-agent-view install
```

첫 번째 명령은 npm package를 설치하고, 두 번째 명령은 그 package를 Codex의 local plugin으로 명시적으로 등록한다. `npm install`만으로는 Codex 설정을 바꾸지 않으며 이 package에는 설정을 몰래 수정하는 `postinstall` script가 없다.

설치 후에는 다음 순서만 따르면 된다.

1. 설치 전에 Codex 앱이 열려 있었다면 앱을 완전히 종료한 뒤 다시 연다.
2. Codex 앱의 **Plugins** 화면에서 `Codex Agent View`가 설치·활성화됐는지 확인한다.
3. Hook 검토 화면이 표시되면 `hooks/hooks.json`과 `node "${PLUGIN_ROOT}/scripts/send-hook.mjs"` command를 확인하고 현재 definition을 직접 trust한다. 앱 버전이 hook 검토 UI를 제공하지 않을 때만 설치 과정의 일부로 interactive Codex CLI의 `/hooks`를 사용한다.
4. 활성화와 hook 검토를 마친 뒤 Codex 앱에서 **새 task**를 만든다. 설치 전에 시작된 task의 과거 event는 재생되지 않는다.
5. 새 task의 `@` 메뉴에서 **Codex Agent View**를 고르고 bundled **Show Agents** skill을 선택해 실행한다.
6. Live 화면을 닫았다면 같은 `@` 메뉴에서 **Show Agents**를 다시 선택해 재오픈한다.

Trust된 첫 hook이 도착하면 plugin sender가 로컬 backend를 내부적으로 준비하고 같은 event 전달을 재시도한다. 사용자는 task ID를 등록하거나 `start`, `status`, `doctor`를 실행할 필요가 없다. **Show Agents**는 healthy backend를 재사용하고 Codex 앱 안에서 live 화면 열기를 시도한다. 앱이 필요한 Browser capability를 제공하지 않거나 permission이 허용되지 않으면 private URL을 노출하는 대신 화면을 열 수 없다고 안내한다. Tokenized localhost URL은 대화에 노출하지 않으며 외부 browser도 정상 사용 흐름에 포함되지 않는다.

공개 Codex plugin API에는 prompt 없이 앱 시작과 동시에 sidebar, panel 또는 Browser tab을 생성하는 기능이 없다. 따라서 live 화면을 처음 열 때 Codex 앱 task에서 **Show Agents**를 한 번 명시적으로 선택해야 한다. 이미 오른쪽에 열린 live tab은 같은 monitor 관찰 window 동안 2초마다 자동 갱신하고 일시 연결 단절 뒤에도 기존 token으로 재연결한다.

요약하면 설치는 터미널에서 한 번, 조회·상태 확인·live 화면 열기와 이후 사용은 Codex 앱 안에서 수행한다.

### 현재 상태

이 source candidate의 package version은 `0.4.0`이다. 다음 구성이 package에 포함되어 있다.

- 공식 Codex 앱의 내장 thread tools를 우선 사용하는 app-native active-task snapshot skill
- `.codex-plugin/plugin.json`, local marketplace catalog, genuine Codex skill
- 부모 task용 `SessionStart`, `SessionEnd`, `UserPromptSubmit`, `Stop`과 subagent/tool/permission hook wiring
- privacy-minimized hook sender와 bounded in-memory reducer
- `127.0.0.1` 전용 token-authenticated local HTTP runtime
- 첫 trusted hook에서 backend를 내부 준비하고 최초 event 전달을 재시도하는 fail-open sender
- 부모 task/session, subagent, 최근 활동, permission wait 상태를 표시하는 local UI
- `start`, `status`, `doctor`, `install`, `uninstall` CLI
- 명시적 설치·hook trust·제거 경로

Homebrew Codex CLI와 공식 앱에 포함된 embedded Codex executable에서는 plugin 설치와 lifecycle payload를 검증했다. 그러나 `0.2.0`을 실행 중인 공식 앱 process에 설치·enable한 실사용 재현에서는 실제 subagent 2개를 실행해도 monitor가 event를 0건 수신했다. Monitor, plugin 등록, enable, 설치 bundle은 정상이었지만 앱 log에는 sender 실행 흔적이 없었다. 같은 app process가 설치 전의 `hooks/list` snapshot을 유지한 정황이 있으며, CLI JSON으로 exact hook trust 상태를 확인할 수 없어 config snapshot과 trust 중 어느 경계에서 skip됐는지는 확정하지 않았다.

`0.2.1`은 부모 task lifecycle hook을 추가하고, `status`, `doctor`, 빈 UI가 “monitor 정상”과 “hook event 수신”을 구분하도록 개선한 patch다. 공식 Codex 앱 `26.727.40816`(`build 6067`)을 재시작하고 설치·활성화된 plugin `0.2.1`을 사용한 실제 E2E에서 task ID를 사전 등록하지 않아도 parent session 3개와 subagent 3개가 UI에 자동으로 나타났다. 실제 hook의 `SessionStart`, `UserPromptSubmit`, `Stop`, `SubagentStart`, `SubagentStop`, `PreToolUse`, `PostToolUse`, `PermissionRequest`가 sender → loopback monitor → UI 경로에 반영됐다. `SessionEnd` wiring은 포함돼 있지만 실제 공식 앱 event는 아직 관찰하지 않았으므로 호환 확인을 주장하지 않는다.

`0.3.0`의 팀장 E2E에서는 공식 앱 내장 thread tools로 `kyurasi-next-supabase`의 active task, workspace basename, title, description, explicit `inProgress` status, 최신 explicit agent commentary와 `subAgentActivity`를 확인했다. 완료 직후 list 결과가 explicit `idle`, `hasUnreadTurn: true`로 바뀌는 것도 확인했다. Skill은 이를 running/active와 분리한 `완료/확인 대기` 표시 그룹에 포함하지만, `idle + unread`만으로 완료 또는 성공을 추론하지 않는다. 별도의 hook/browser monitor에서는 실제 `SessionEnd`까지 관찰했다.

Maintainer npm 2FA는 `auth-and-writes` mode로 활성화됐고 `codex-agent-view@0.3.1`은 검증된 이전 공개 릴리스다. npm publish와 별개인 Universal Plugins Directory 제출은 아직 완료되지 않아 directory 검색에는 나타나지 않는다.

검증된 `0.2.0` 릴리스: npm `gitHead`와 annotated `v0.2.0` tag는 commit `00b62af56698ac875e39c7d1386905c157c3a7e8`로 일치하고, registry SRI/signature 및 tag source와 registry artifact의 21개 package file byte 일치를 확인했다. [GitHub Release v0.2.0](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.2.0)은 공개 상태다. 별도 npm provenance attestation은 선택 사항이며 이 릴리스에는 없다.

공개 `0.2.1` patch: registry의 `latest`, version, `Apache-2.0` license, executable mapping, 21개 package file, unpacked size `144644`, npm `gitHead` `8d6a67c9aafa23f801235d747ff018d254378970`, shasum, exact SRI와 registry signature를 확인했다. Annotated `v0.2.1` tag는 같은 commit에 생성·push됐고 [GitHub Release v0.2.1](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.2.1)이 공개됐다. Clean cache exact-version `npx --version`을 통과했으며 registry tarball 21개 file과 tagged source가 byte-identical이다. 이 기기의 global install과 copied marketplace도 같은 registry tarball 21개 file과 byte-identical이고, CLI `0.2.1`, plugin installed/enabled, hook wiring 9종, 실제 session 자동 수신과 probe subagent의 running → stopped/UI 완료 반영을 검증했다.

공개 `0.3.0`: 릴리스 당시 npm `latest`/version, `gitHead` `988132d0b525ee5e63f13a0d924810dd3f1bd93a`, shasum `08e2e5fa8c1133a1dcc3faae8f354535f9fc07b0`, exact SRI, registry signature, 21 files와 unpacked size `158.8 kB`를 확인했다. Annotated `v0.3.0` tag가 push됐고 [GitHub Release v0.3.0](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.3.0)이 공개됐다. 이 기기에 public exact `0.3.0`을 global reinstall해 plugin installed/enabled와 hook wiring 9종을 확인했다. Registry tarball과 global install의 artifact diff는 0이며 copied marketplace도 ownership marker 1개를 제외한 artifact file이 동일하다. Public install monitor에서 실제 hook, `workspace_label: codex-agent-view`, `PermissionRequest`, tool lifecycle과 probe subagent의 running → stopped 전환(`has_out_of_order_events: false`)을 확인했다.

공개 `0.3.1`: npm version/당시 `latest` `0.3.1`, `gitHead` `c515ea28be201dc24d31e13bf465a38145050b69`, shasum `4405b183012c04e7b0bc265d4eb14bf85291dcd9`, integrity `sha512-8oF5uHqZobgPt75I2ymoq3/tx4Ab1YX/cvMPjaJHjV7zxVC5Dh318isoCdsKNi6emXEbiTIdxOgX7GcclyuP8A==`, 21 files를 확인했다. Annotated `v0.3.1` tag와 [GitHub Release v0.3.1](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.3.1)이 공개됐다. 이 기기에 exact `0.3.1`을 재설치했고 plugin `installed: true`, `enabled: true`를 확인했다. Public exact `0.3.1` app-only E2E 완료는 주장하지 않는다.

공개 `0.3.2`: 배포 시 npm version/`latest` `0.3.2`, `gitHead` `4f4f92dc872d9b782efe900cc1397bdccf7d2c8a`, shasum `2851544c75a0a5fb20a2865196ab54b566b373d8`, integrity `sha512-MPwFP3CjhehkIzyV3ja0/rWzLyK4tJI7jjsczKN16aXpKEr/dvtc/aljjqW/41zatZrQG32ccKKMJjYNyW6Tww==`, registry signature, 21 files, package size `46856 B`와 unpacked size `167060 B`를 확인했다. Annotated `v0.3.2` tag와 [GitHub Release v0.3.2](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.3.2)가 공개됐고 main/tag CI가 통과했다. 이 기기의 global `0.3.2` install은 plugin `installed: true`, `enabled: true`이며 registry artifact와 mismatch가 0이다. App-native thread snapshot에서는 worker activity 3개를 확인했다. Codex 내장 Browser의 live monitor 연결은 성공했지만 재설치 전에 열려 있던 앱 process의 follow-up subagent 3개에서는 hook event가 0건이었으므로 exact `0.3.2` live hook E2E 완료를 주장하지 않는다. 이 검증에는 앱 완전 재시작과 새 task가 필요하다.

### 제품 경계

Codex Agent View는 historical audit이나 session replay 제품이 아니라 현재 활동을 보여주는 live companion이다. Bounded in-memory state와 monitor 재시작 시 reset은 privacy와 단순한 failure boundary를 위한 의도된 완성 설계다. SQLite/영구 history는 누락된 요구사항이 아니다. 실제 사용자 요구가 입증될 때에만 retention, migration, deletion, privacy 비용을 별도 검토하는 명시적 opt-in 기능 후보로 취급한다.

- 앱 안의 현재 task snapshot은 공식 Codex 앱이 제공하는 내장 thread tools의 explicit status와 `subAgentActivity`를 우선 사용한다.
- Hook event는 local monitor의 세부 lifecycle 상태에 대한 source of truth다. Monitor state는 bounded memory에만 있고 재시작하면 새 관찰 window가 시작된다.
- 설치·trust·앱 재시작 뒤 첫 trusted hook이 backend를 자동 준비한다. 이는 monitor process 준비이며 Codex 화면이나 tab을 몰래 생성하는 기능이 아니다.
- 외부 telemetry, 원격 server, account, 필수 SQLite/영구 event store가 없다.
- prompt, transcript path, 전체 tool input/output, assistant message를 monitor 상태나 UI에 저장·표시하지 않는다.
- task/subagent 중지·재시작, message 전송, permission 자동 승인·거절 기능이 없다.
- 별도로 실행한 App Server는 앱 내장 thread tools와 다른 process다. 공식 앱의 live source로 간주하거나 둘을 같은 API로 설명하지 않는다.

별도로 실행한 Codex `0.146` App Server의 `thread/list` fallback도 실제 확인했지만 현재 root/subagent가 모두 `notLoaded`로 나타나 공식 앱의 live running/completed 상태를 공유하지 않았다. Persisted parent ID, alias, depth 보강은 가능했지만 live 판별에는 채택하지 않았다. `0.3.0`의 primary snapshot은 이 별도 server가 아니라 현재 공식 앱이 직접 제공하는 내장 thread tools를 사용한다.

### npm, Codex 앱 live view, Plugins Directory의 역할

- 공식 Codex 앱의 `@` 메뉴에서 **Codex Agent View → Show Agents**를 선택하는 것이 canonical UX다. 별도 monitor 실행이나 task ID 등록이 필요 없다.
- npm은 plugin bundle, 내부 hook sender/runtime과 static UI를 사용자 machine에 배포하는 최초 설치 경로다.
- Live view는 사용자가 앱 안에서 **Show Agents**를 선택했을 때만 열린다. 외부 website나 telemetry dashboard가 아니다.
- 공개 plugin API는 앱 시작 시 no-prompt sidebar/panel/Browser tab 생성을 제공하지 않는다. 최초 live view 열기에는 앱 안 skill 선택이 한 번 필요하고, 열린 tab은 같은 관찰 window에서 자동 갱신·재연결한다.
- Universal Plugins Directory는 npm의 대체재가 아니다. 공개 directory의 in-app custom UI 경로는 public HTTPS MCP server와 domain verification이 필요해 local-only/no-external-server 원칙과 충돌한다. 현재는 별도의 listing/skills 제출 가능성만 검토하며, 심사·publish 전에는 Codex plugin 검색으로 설치할 수 있다고 안내하지 않는다.

Hook event가 누락·중복·역순으로 올 수 있으므로 UI의 `unknown`, `stopped_without_start`, 빈 상태는 그대로 해석해야 한다. 빈 session 목록은 “이 monitor가 event를 관찰하지 못함”이며 “실행 중인 task가 없음”의 증거가 아니다.

### 공식 Codex 앱에서 사용 — 권장

이 절차는 위의 빠른 시작에서 설치와 활성화를 마친 뒤 **새 task**에서 수행한다. 별도 terminal이나 외부 browser는 사용하지 않는다.

1. 새 task의 `@` 메뉴에서 **Codex Agent View**를 고르고 bundled **Show Agents** skill을 선택한다.
2. Skill은 trusted hook이 자동 준비한 healthy backend를 재사용하고, 아직 준비되지 않았다면 내부적으로 준비한 뒤 Codex 앱에서 live 화면 열기를 시도한다.
3. Panel은 관찰한 task와 subagent의 privacy-minimized hook 상태를 표시한다. Prompt, preview, tool input/output, full workspace path와 internal thread ID는 기본 표시하지 않는다.
4. 앱의 Browser capability 또는 permission을 사용할 수 없으면 private localhost URL을 노출하거나 외부 browser를 여는 대신 실패를 안내한다.

오른쪽 live 화면을 닫았다면 같은 `@` 메뉴에서 **Show Agents**를 다시 선택해 재오픈한다. 열린 tab은 같은 관찰 window에서 자동 갱신하고 일시 단절 뒤 재연결한다.

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

이 절은 package 개발자와 문제 보고를 위한 진단 참고 자료이며 일반 사용자 사용법이 아니다. 설치가 끝난 사용자는 Codex 앱의 `@` 메뉴에서 **Codex Agent View → Show Agents**를 선택한다. 아래 명령과 localhost 주소를 정상 사용 순서에 넣거나 사용자에게 직접 관리하도록 요구하지 않는다.

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

Backend가 없으면 trusted hook sender가 외부 browser 없이 detached backend를 내부 준비하고 같은 최소화 event 전달을 짧게 재시도한다. 제한 시간 안에 준비할 수 없으면 sender는 fail-open으로 끝나 Codex task를 막지 않는다. 실패한 event를 disk에 적재하거나 영구 복구하지 않는다.

Plugin enable/trust와 앱 재시작 뒤 생성되거나 재개되는 task는 trusted hook이 backend를 준비하므로 task ID를 미리 등록하거나 terminal에서 monitor를 시작할 필요가 없다. UI 검색은 자동 수신된 목록을 거르는 선택적 filter일 뿐이며 추적을 시작하거나 ID를 등록하는 기능이 아니다. Plugin 설치·trust 전이나 로컬 수집 중단 중에 이미 지나간 event는 재생되지 않는다.

### npm 설치 명령 참고

아래 명령은 publish 뒤 이 source candidate와 일치하는 exact `0.4.0`을 지정하는 설치 명령이다. 현재 public npm `latest`는 `0.3.2`이며 `0.4.0` publish 완료 전에는 아래 명령이 성공한다고 주장하지 않는다.

```bash
npm install --global codex-agent-view@0.4.0
codex-agent-view install
```

이 두 명령 뒤에는 Codex 앱을 완전히 다시 열고 Plugins 화면에서 설치·활성화와 hook trust를 확인한 다음 새 task를 만든다. 첫 trusted hook이 backend 준비와 event 전달을 내부 처리하므로 사용자가 monitor CLI를 실행하지 않는다. 새 task의 `@` 메뉴에서 **Codex Agent View → Show Agents**를 선택해 live 화면을 열며, 화면을 닫았으면 같은 skill을 다시 선택한다.

Global install 없이 exact version을 일회성으로 실행할 수도 있다.

```bash
npx --yes codex-agent-view@0.4.0 install
```

`npx` 경로도 explicit `install`을 실행하는 최초 설치 방법일 뿐이다. 이후 사용은 동일하게 Codex 앱 안에서 진행한다.

`0.2.0`/`0.2.1`/`0.3.0`/`0.3.1`/`0.3.2` release evidence는 보존한다. `0.4.0`은 source candidate이며 아직 public release evidence가 없다. Registry evidence와 검증 경계는 [docs/distribution.md](docs/distribution.md)에 기록한다.

npm install 자체는 Codex 설정을 자동 변경하지 않는다. `install` command는 사용자가 명시적으로 실행하며 hook trust도 사용자 검토로 남긴다. npm publish와 Universal Plugins Directory 제출은 서로 별도 절차다. 자세한 배포 경계는 [docs/distribution.md](docs/distribution.md), directory 제출 상태는 [docs/plugin-submission.md](docs/plugin-submission.md)를 참고한다.

### Privacy와 opt-in diagnostic capture

정상 hook 경로는 `scripts/send-hook.mjs`다. 이 sender는 allowlisted metadata만 값으로 남기고 나머지는 type/key/length summary로 바꾼 뒤 loopback으로 보낸다. 전체 `cwd` 대신 control character를 제거하고 120자로 제한한 basename `workspace_label`만 파생한다. Runtime reducer는 lifecycle field와 이 label을 bounded memory에만 유지한다.

정상 monitor는 event JSONL을 쓰지 않는다. `scripts/capture-hook.mjs`는 Phase 0 검증용 별도 diagnostic script이며 누군가 명시적으로 실행하거나 hook에 연결할 때만 `events.jsonl`을 만든다.

`CODEX_AGENT_VIEW_CAPTURE_FULL=1`은 diagnostic script의 redaction을 끄며 raw prompt, tool data, credential을 기록할 수 있다. 일반 사용, skill workflow, install/start command는 이를 자동 enable하지 않는다. Raw capture와 runtime token을 commit하거나 public issue에 첨부하지 않는다.

전체 data flow, token lifecycle, capture 위치는 [Privacy](docs/privacy.md), 취약점 신고는 [Security](SECURITY.md)를 참고한다.

### 제거와 복구

제거는 최초 설치와 마찬가지로 terminal을 사용하는 명시적 lifecycle 작업이다. Auto-start된 detached monitor와 maintainer가 실행한 foreground monitor 모두 별도로 먼저 종료할 필요 없이 다음 명령을 실행한다.

```bash
codex-agent-view uninstall
```

`uninstall`은 runtime file의 bearer token으로 loopback endpoint를 인증하고 Codex Agent View 소유의 healthy monitor인지 확인한 뒤 internal shutdown을 요청한다. 종료가 확인돼야 plugin 등록, marketplace 등록과 copied marketplace bundle을 제거하며 runtime directory에 남은 data는 기본적으로 보존한다. 인증된 소유 monitor를 안전하게 종료할 수 없거나 endpoint가 다른 service로 판별되면 plugin과 runtime files를 보존한 채 실패한다.

사용자가 configured runtime directory의 소유 data까지 제거하길 명시적으로 원할 때만 다음을 사용한다.

```bash
codex-agent-view uninstall --purge
```

`--purge`도 owned monitor를 같은 방식으로 먼저 종료하고, owned stale runtime file과 비어 있는 runtime directory만 추가 제거한다. 형식을 알 수 없는 runtime file과 관련 없는 loopback service는 삭제하거나 종료하지 않는다. Unrecognized file은 그대로 보존하며, unrelated endpoint가 확인되면 plugin과 runtime files를 모두 보존한 채 중단한다. Opt-in capture나 다른 file 때문에 directory가 비어 있지 않으면 directory 자체도 보존한다.

Source checkout을 직접 실행한 경우에만 같은 명령의 `node bin/codex-agent-view.mjs uninstall` 또는 `node bin/codex-agent-view.mjs uninstall --purge` 형식을 사용한다.

별도 `PLUGIN_DATA`, `CODEX_AGENT_VIEW_CAPTURE_DIR`, project working directory에 만든 opt-in diagnostic capture는 runtime directory 밖에 있을 수 있다. 정확한 위치를 검토해 별도로 정리하고 broad Codex/home directory를 삭제하지 않는다.

### Maintainer troubleshooting

이 절의 CLI 확인은 명시적인 문제 조사용이다. 정상 사용자는 Codex 앱의 `@` 메뉴에서 **Codex Agent View → Show Agents**를 선택한다.

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
