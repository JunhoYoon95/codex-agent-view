# 배포 경로 조사

조사일: 2026-08-01

릴리스 증거 갱신일: 2026-08-02

이 문서는 public Codex Agent View `0.4.4`와 Codex plugin의 배포 경계를 정리한다. Repository/package와 public npm `latest`/version은 `0.4.4`이며 `0.2.0`부터 `0.4.4`까지의 public evidence를 보존한다. `0.4.4`의 npm/install/app E2E, main/tag CI, annotated tag와 GitHub Release를 확인했다. Universal Directory publish는 npm/GitHub release와 별도 절차이며 아직 수행하지 않았다.

## 현재 상태

- package 이름은 `codex-agent-view`다. Repository/package와 public npm `latest`는 `0.4.4`다.
- Public `0.4.2`의 push, main CI Node.js 18/20/22, npm metadata/signature, release/registry tarball byte 일치, annotated tag/GitHub Release, this-device exact reinstall/artifact match, plugin installed/enabled, hook wiring 9종과 official Codex in-app Browser visual E2E를 확인했다.
- Public `0.3.2`는 immutable packaged README의 잘못된 release-state 안내를 수정한 patch다. Registry metadata/digest/signature, tag/GitHub Release, main/tag CI, this-device exact install과 registry/install artifact match를 확인했다. App-native snapshot은 worker activity 3개를 확인했지만 live hook E2E는 앱 restart/new-task 전이라 미완료다.
- Node.js `>=18`을 요구하며 production dependency가 없다.
- `package.json`은 `codex-agent-view` executable을 `bin/codex-agent-view.mjs`로 노출한다.
- Public `0.4.4` bundle에는 plugin manifest/catalog, logo assets, hooks, CLI, local runtime/server, static monitor UI, scripts, bundled Codex skill 2개, README, LICENSE, NOTICE가 포함된다.
- `postinstall`과 다른 npm lifecycle installer는 없다. npm package를 받는 것만으로 Codex 설정을 바꾸지 않는다.
- 사용자가 `codex-agent-view install`을 명시적으로 실행할 때만 local marketplace bundle 복사, marketplace 등록, plugin 등록이 수행된다. Hook trust는 자동화하지 않는다.
- `0.3.0` primary UX는 공식 Codex 앱 내장 thread tools의 bounded active-task snapshot이다. Optional runtime은 `127.0.0.1`에만 bind하고 hook lifecycle 상태를 bounded process memory에 둔다. 별도 App Server는 앱 내장 tools와 다른 process이며 live source로 사용하지 않는다.
- Maintainer `kyurasi` account의 2FA는 `auth-and-writes` mode이고 pending enrollment가 없다. Public exact `codex-agent-view@0.4.4`의 this-device global reinstall, CLI/plugin version, installed/enabled, hook wiring 9종, `doctor` event observation과 official Codex in-app live E2E를 확인했다.

### Public `0.4.4` release evidence

Package와 plugin manifest는 `0.4.4`로 동기화했다. Release는 plugin starter/default prompt를 제거하고, 호출 task 자체를 `CODEX_THREAD_ID`로 제외하며, English 기본의 English/Korean/Spanish selector, 2초 polling과 toggle 없는 inline activity/technical metadata를 제공한다. 검증된 hook payload에 dedicated agent assignment description이 없으므로 prompt/tool input에서 설명을 추론하지 않는다.

#### Public release acceptance

Release tarball과 registry tarball이 byte-identical임을 확인했다. This-device public exact reinstall에서 global executable과 installed plugin version이 모두 `0.4.4`이고 plugin이 installed/enabled였다. Hook wiring은 9종이며 `doctor`는 monitor `events_received: true`, sessions 7개를 보고했다.

Official Codex in-app Browser에서는 reload와 public exact reinstall 뒤에도 auth가 valid였다. Private token/exclude fragment는 page load 직후 visible URL에서 제거됐고 current viewer task가 결과에서 제외됐다. 값 자체는 기록하지 않는다. `<details>`와 `<summary>`는 각각 0개였으며 English, 한국어, Español을 모두 확인했고 English 선택은 reload 뒤에도 유지됐다.

| 확인 항목 | 결과 |
| --- | --- |
| npm `latest` / version | `0.4.4` / `0.4.4` |
| Package / size / signature | 25 files / package `70.4 kB` / unpacked `250.6 kB` / registry signature 확인 |
| Dist shasum | `482520d471b3ef04204f026b52237ac77407a99f` |
| Exact integrity | `sha512-q0j/s5D6Hw0GV0x/CIkHRdM7U9uONqb2gmMguesC7BzTG4znbj35XKXqjMl5dJSc9O/GaYMj6lNCOqLdCiYdoA==` |
| Artifact comparison | Release tarball과 registry tarball byte-identical |
| This-device acceptance | Public exact reinstall, CLI/plugin `0.4.4`, installed/enabled, hook wiring 9종, events true, sessions 7 |
| Official app live E2E | Reload/reinstall 뒤 auth valid, visible URL fragment 제거, current viewer task 제외, disclosure 0, en/ko/es 확인, English 선택 reload persistence |
| Main CI | `30717562576`, 성공 |
| Annotated tag / GitHub Release | `v0.4.4` → `1bedf47d2185d2a14a3c96536e57aef0719b767a` / [public release](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.4.4) |
| Tag CI | `30717744653`, 성공 |

### Public `0.4.3` release evidence

Historical public `0.4.3` manifest에는 `$show-agents` 형태의 plugin-level starter text가 있었다. 이 값은 text 삽입일 뿐 실제 bundled skill dispatch를 보장하지 않으므로, plugin 카드가 skill을 자동 또는 명시 호출했다고 주장하지 않는다. Public `0.4.4` 계약은 manifest starter/default prompt를 두지 않는다. Plugin 선택은 action text를 붙이지 않고 사용법만 설명하며, 사용자가 공식 Codex 앱에서 실제 bundled `$show-agents` skill을 명시적으로 선택하거나 호출해야 한다.

기본 monitor는 실행 중인 부모 task와 subagent를 먼저 정렬하고 사람이 읽을 수 있는 workspace/task/agent label과 상태 문구를 주 정보로 표시한다. Raw session/agent ID와 technical metadata는 접기 토글 없이 항상 보이되 보조 정보로 유지하며 raw hook event name은 화면의 중심 정보로 노출하지 않는다. Live UI는 English를 기본값으로 하고 English, Korean, Spanish selector를 제공하며 2초 polling을 유지한다. Validated private `CODEX_THREAD_ID`가 있으면 live view를 연 task 자체를 목록에서 제외한다. Prompt, preview, tool input/output과 full workspace path는 계속 표시하지 않는다. 실제 official `SubagentStart`에서 확인한 agent assignment 관련 field는 `agent_id`와 `agent_type`뿐이고 dedicated assignment description은 없다. Prompt/tool input을 저장해 설명을 추론하지 않으므로 agent별 할당 작업 설명을 발명하거나 표시하지 않는다.

`0.4.3`은 설치 수명 동안 user-only private file에 유지되는 read-only viewer credential을 runtime/control token과 분리한다. Viewer credential은 `/api/state`만 읽을 수 있고 event ingest나 shutdown에는 사용할 수 없다. Runtime/control token은 monitor process마다 교체된다. 열린 Codex live tab은 같은 viewer credential과 fixed loopback origin으로 backend가 돌아오면 temporary disconnect, monitor restart 또는 upgrade 뒤 자동 재연결한다. Task/event state는 여전히 bounded process-local memory뿐이며 restart는 새 관찰 window를 시작한다.

Upgrade install은 기존 viewer credential이 있으면 그대로 보존한다. `0.4.2`의 valid legacy runtime record만 있고 viewer credential이 없으면 legacy runtime token으로 viewer credential을 seed해 열린 tab의 continuity를 유지하며 값을 stdout/stderr에 노출하지 않는다. Normal uninstall과 `--purge`는 valid owned viewer credential을 폐기한다. Malformed, changed, symbolic 또는 unrecognized credential은 삭제하지 않고 보존 경고를 출력한다.

| 확인 항목 | 결과 |
| --- | --- |
| Main commits / CI | `a7d938c`, `e2b0543` push / run `30713618590`, Node.js 18/20/22 성공 |
| npm `latest` / version / license | `0.4.3` / `0.4.3` / `Apache-2.0` |
| Package / signature | 25 files / registry signature 확인 |
| Dist shasum | `2dee6bb0ae8c7b4bf505b72cf10d9ec42d5afbc7` |
| Exact integrity | `sha512-E0Ljs2nDuBBme9UTu66kaW66eCp8mW7BfunLaK5y3u0CVCSjRtCfC9MAJjQA91yQYpeZ1Wj2sKy7d2CW04ZOPw==` |
| Artifact comparison | Local release tarball과 registry tarball byte-identical; this-device installed artifact 일치 |
| This-device install | Exact global `0.4.3`, plugin installed/enabled, hook wiring 9종, `doctor` event observed |
| Official app migration E2E | Connected `0.4.2` legacy tab → install seeds viewer token → old monitor shutdown 동안 retrying/no auth error → `0.4.3` hook sender auto-start → same tab connected/no auth error/workspace+agent rendered |
| Annotated tag / GitHub Release | `v0.4.3` → `dea9f39890387ed509cfa0bb511c8167abe11148` / [public, non-draft, non-prerelease](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.4.3) |
| Final docs/tag CI | main `30714110050` / tag `30714144940`, 성공 |

### Public `0.4.2` registry evidence

| 확인 항목 | 결과 |
| --- | --- |
| npm `latest` / `version` | `0.4.2` |
| License / executable | `Apache-2.0` / `codex-agent-view` bin mapping 확인 |
| Dist shasum | `fac95689395baa26f4ad9ff0cbefd0017d2ebd8d` |
| Exact integrity | `sha512-FRTPoYxjBuPC6Usb+ylSfZsZVJKlKcHnQPaAPljekg0maTPn9POsBkS+auOcHz5jspg0AXcP8R63PM0WfCn2LQ==` |
| Package contents / size | 25 files, unpacked `206426 B` |
| Registry signature | 존재 확인 |
| Release commits / CI | `b4d923a`, `3d8f46d` push / main run `30712375726`, Node.js 18/20/22 성공 |
| Artifact comparison | Release tarball과 registry tarball byte-identical; this-device installed artifact 일치 |
| Annotated tag / GitHub Release | `v0.4.2` / [public release](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.4.2) |
| This-device acceptance | Exact global install, plugin installed/enabled, hook wiring 9종, official Codex in-app Browser visual E2E 확인 |

### `0.4.1` release와 `0.4.0` 진입점 결함

Public `0.4.0` manifest의 `defaultPrompt: ["Show Agents"]`는 plugin-level text starter를 만들었다. 이 starter는 implicit invocation이 disabled된 bundled `show-agents` skill을 명시적으로 호출하지 않으므로, plugin 카드의 **바로 사용하기** 또는 Quick start를 live 화면 진입점으로 안내한 것은 잘못이었다.

`0.4.1`은 plain starter를 `Open @ and select the bundled Show Agents skill.`이라는 instructional starter로 교체했다. Plugin 카드의 **바로 사용하기**/Quick start는 이 안내 text를 붙일 뿐 skill을 호출하지 않는다. 이 historical entry-point 실험도 현재 계약에는 남기지 않는다. 현재 source의 plugin 선택은 action text를 붙이지 않으며, 사용자는 Codex 앱의 skill UI에서 실제 bundled `$show-agents` skill을 직접 선택하거나 명시 호출한다. Public exact artifact 설치까지 확인했지만 앱 process가 설치 전부터 열려 있었으므로, 앱 완전 재시작/new task의 직접 skill 선택과 live panel 관찰 전에는 visual E2E 완료를 주장하지 않는다.

### Public `0.4.1` registry and release evidence

| 확인 항목 | 결과 |
| --- | --- |
| npm `latest` / `version` | `0.4.1` |
| License / executable | `Apache-2.0` / `codex-agent-view` bin mapping 확인 |
| npm `gitHead` | **없음**. Exact tarball publish였으므로 registry metadata가 `gitHead`를 제공하지 않으며 그 field로 source 일치를 주장하지 않음 |
| Release commit / annotated tag | `a1de67be5413fa38b8dd1b62f74353463f6e641e` / `v0.4.1` |
| Dist shasum | `ee2ae0b8b36016f5c57bade067027202b1508d1d` |
| Exact integrity | `sha512-WC4f5MPmvpkXeKM+1BVAYqW4+hoaUrB4yQFoUYgc0pnjyY7hP1CdSR5NJ3QWmvJ6Ikmmb1d+58UL4hkKoyhm1Q==` |
| Registry signature | 존재 확인 |
| Package contents / size | 25 files, package `53650 B`, unpacked `193424 B` |
| Artifact comparison | Release tarball과 registry tarball byte-identical |
| GitHub Release | [v0.4.1 public release](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.4.1) |
| CI | main run `30710490358`, tag run `30710848474` 성공 |
| This-device exact artifact | CLI/plugin `0.4.1`, plugin installed/enabled, hook wiring 9종 |
| Runtime / trust | Install 교체 중 정상 종료, 현재 `monitor_not_running`; persisted hook trust `unknown` |
| Show Agents visual E2E | 앱 process가 install 전부터 열려 있었으므로 앱 완전 재시작/new task의 direct skill 선택 전까지 미확인 |

Registry metadata의 `gitHead` 부재는 실패가 아니라 exact tarball publish의 metadata 경계다. Release commit/tag와 npm source 일치를 그 field로 증명하지 않으며, 실제 release tarball과 registry tarball의 byte-identical 비교만 artifact 일치 증거로 기록한다.

### Historical public `0.4.0` registry and release evidence

| 확인 항목 | 결과 |
| --- | --- |
| npm `latest` / `version` | `0.4.0` |
| Release commit / annotated tag | `11f7b0511a39c5f5a61cb6da7b91fb3b8e915c6b` / `v0.4.0` |
| npm `gitHead` | **없음**. Exact tarball publish였으므로 registry metadata가 `gitHead`를 제공하지 않으며 tag 일치를 `gitHead`로 주장하지 않음 |
| Dist shasum | `cc379e593f4cafa5dd56f32e6741eab5ba3f4497` |
| Exact integrity | `sha512-uS0zOoxqboqwtqtBerDdpkNujY4v0hJ1ag96vXPFXZ1eWuHbUlZlKiO9yH2tip4ABxElNEyIT7K0lABE2z29DA==` |
| Registry signature | 존재 확인 |
| Package contents / size | 25 files, package `52614 B`, unpacked `189181 B` |
| Artifact comparison | Registry tarball과 release tarball byte-identical |
| GitHub Release | [v0.4.0 public release](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.4.0) |
| CI | main run `30707999873`, tag run `30708301281` 성공 |
| This-device exact artifact | CLI/plugin `0.4.0`, plugin installed/enabled, hook wiring 9종, `events_received: true`, sessions 7 |
| Show Agents visual E2E | In-app Browser open request는 `queued`를 반환했지만 reinstall 전부터 유지된 현재 app process에서 tab을 관찰하지 못함. 앱 완전 재시작/new task 전까지 exact visual panel E2E 완료를 주장하지 않음 |

Registry metadata에 npm `gitHead`가 없으므로 release commit/tag와 npm source 일치를 `gitHead`로 증명하지 않는다. 대신 실제 publish에 사용한 release tarball과 registry tarball의 byte-identical 비교를 source artifact 증거로 기록한다.

### Historical `0.3.2` public registry evidence

`0.3.1`의 immutable published README가 자신을 미배포 candidate/public latest `0.3.0`으로 안내하는 결함을 수정하기 위한 patch다. Package/plugin/test fixture version을 `0.3.2`로 맞추고 packaged README는 exact `@0.3.2` 설치를 안내한다.

| 확인 항목 | 결과 |
| --- | --- |
| npm `latest` / `version` | `0.3.2` |
| npm `gitHead` | `4f4f92dc872d9b782efe900cc1397bdccf7d2c8a` |
| Dist shasum | `2851544c75a0a5fb20a2865196ab54b566b373d8` |
| Exact integrity | `sha512-MPwFP3CjhehkIzyV3ja0/rWzLyK4tJI7jjsczKN16aXpKEr/dvtc/aljjqW/41zatZrQG32ccKKMJjYNyW6Tww==` |
| Registry signature | 확인 |
| Package contents / size | 21 files, package `46856 B`, unpacked `167060 B` |
| Annotated tag / GitHub Release | `v0.3.2` tag와 public GitHub Release 확인 |
| CI | main/tag CI 통과 |
| This-device exact artifact | global install, plugin `installed: true`, `enabled: true`, registry artifact mismatch 0 |
| App-native snapshot | worker activity 3개 확인 |
| Live hook E2E | 내장 Browser monitor 연결 성공. 재설치 전 앱 process의 follow-up subagent 3개 hook event 0건; 앱 full restart/new-task 필요 |

Pre-publish QA는 Node tests `67/67`, plugin/skill validation, package contract와 `npm pack --dry-run`을 통과했다. Exact `0.3.2` live hook E2E는 monitor 연결과 분리해 미완료로 유지하며, 앱을 완전히 재시작한 뒤 새 task에서 다시 검증한다.

### Historical `0.3.1` public registry evidence

`0.3.1`은 package/plugin manifest version과 package contract를 맞추고, 최초 설치·제거를 제외한 snapshot, 상태 확인과 live view 열기를 Codex 앱 안에서 끝내도록 README와 bundled skill을 강화한다. CLI와 localhost runtime은 plugin 내부 구현 또는 maintainer 진단 경계에 남는다.

| 확인 항목 | 결과 |
| --- | --- |
| npm `latest` / `version` | `0.3.1` |
| npm `gitHead` | `c515ea28be201dc24d31e13bf465a38145050b69` |
| Dist shasum | `4405b183012c04e7b0bc265d4eb14bf85291dcd9` |
| Exact integrity | `sha512-8oF5uHqZobgPt75I2ymoq3/tx4Ab1YX/cvMPjaJHjV7zxVC5Dh318isoCdsKNi6emXEbiTIdxOgX7GcclyuP8A==` |
| Package contents | 21 files |
| This-device exact artifact | reinstall 완료, plugin `installed: true`, `enabled: true` |
| Annotated tag / GitHub Release | `v0.3.1` tag와 public GitHub Release 확인 |
| App-only E2E | 아직 미확인 |

Pre-publish QA는 Node tests `67/67`, plugin validation, bundled skill quick validation, package contract와 `npm pack --dry-run`을 통과했다. Pack metadata는 `codex-agent-view@0.3.1`, 21 files, unpacked `167.1 kB`이며 README와 bundled skill을 포함한다.

### Historical `0.2.0` public registry와 release evidence

| Field | 관찰값 |
| --- | --- |
| `version` | `0.2.0` |
| `license` | `Apache-2.0` |
| `bin` | `codex-agent-view` → `bin/codex-agent-view.mjs` |
| npm `gitHead` | `00b62af56698ac875e39c7d1386905c157c3a7e8` |
| `dist.shasum` | `751885ce9db85659a7c1d0f779d32a08225ee05e` |
| `dist.integrity` | `sha512-j8yYw6JwqinVOvpZm+Ko0UWVNXo099zJlPZwxVpYQJx4xg+07a0BrG3cBWLkW3FaTeDmt16kNNFBQpxVQBcJww==` |
| Registry signature | 검증 성공 |
| Annotated tag | `v0.2.0` → `00b62af56698ac875e39c7d1386905c157c3a7e8`, origin push 확인 |
| GitHub Release | [v0.2.0 public release](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.2.0) |
| File comparison | tagged source와 registry artifact의 package file `21/21` byte-identical |

Downloaded artifact의 계산된 SRI가 위 registry `dist.integrity`와 일치하고 registry signature도 검증됐다. Artifact E2E는 public exact version을 isolated global prefix와 exact-version `npx`로 각각 실행한 결과다. 이 evidence는 source/artifact 일치와 registry 서명을 입증하지만, 별도 npm provenance attestation을 뜻하지는 않는다. Provenance attestation은 선택 사항이며 `0.2.0`에는 없다.

### Historical `0.2.1` public registry evidence

| Field | 관찰값 |
| --- | --- |
| npm `latest` / `version` | `0.2.1` |
| `license` | `Apache-2.0` |
| `bin` | `codex-agent-view` → `bin/codex-agent-view.mjs` |
| npm `gitHead` | `8d6a67c9aafa23f801235d747ff018d254378970` |
| Package contents | 21 files, unpacked size `144644` bytes |
| `dist.shasum` | `ad17b8d1f179d99ea07ff128021d9708f73b1961` |
| `dist.integrity` | `sha512-DWDRPFF58PgnXgkXNE7vYfpleGBFU+CVAbq5v2jpkr/24tBDlYJ+VZ4yvKfIhgzvRJS0suKV4y/fN62PbE5TRg==` |
| Registry signature | 존재 확인 |
| This-device exact artifact | global reinstall 성공, CLI `0.2.1`, plugin installed/enabled, declared hook 9종 wiring 정상 |
| Live artifact QA | monitor 재시작 뒤 실제 sessions 자동 수신, probe subagent running → stopped 및 UI 완료 반영 |
| Annotated tag | `v0.2.1` → `8d6a67c9aafa23f801235d747ff018d254378970`, origin push 확인 |
| GitHub Release | [v0.2.1 public release](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.2.1) |
| Exact `npx` | clean temporary cache에서 `codex-agent-view@0.2.1 --version` 성공 |
| File comparison | registry tarball ↔ tagged source `21/21`, registry tarball ↔ this-device global/copied marketplace `21/21` byte-identical |

Registry npm `gitHead`, annotated tag와 public GitHub Release는 같은 commit을 가리키며, registry tarball의 21개 package file은 tagged source와 this-device global/copied marketplace의 해당 file에 byte-identical하다. Exact-version `npx` evidence는 clean-cache `--version` smoke 범위이며 전체 install/start/uninstall lifecycle을 뜻하지 않는다.

### Historical `0.3.0` public registry evidence

| 확인 항목 | 결과 |
| --- | --- |
| npm `latest` / `version` | `0.3.0` |
| npm `gitHead` | `988132d0b525ee5e63f13a0d924810dd3f1bd93a` |
| Dist shasum | `08e2e5fa8c1133a1dcc3faae8f354535f9fc07b0` |
| Exact SRI | `sha512-EVH2xU0eUo1weLYbrVVwM9C8IDGM3K1EyBIKLuHiKdpHFR5OcaVns3LoxJ4kFR9nwwWyTGAhkbU2LdaX4/yhsw==` |
| Registry signature | 확인 |
| Package contents | 21 files, unpacked `158.8 kB` |
| Annotated tag | `v0.3.0` → `988132d0b525ee5e63f13a0d924810dd3f1bd93a`, origin push 확인 |
| GitHub Release | [v0.3.0 public release](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.3.0) |
| This-device exact artifact | global reinstall, plugin installed/enabled, hook wiring 9종 확인 |
| Artifact comparison | registry tarball ↔ global diff 0; marketplace는 ownership marker 1개 외 artifact files 동일 |
| Live public-install QA | 실제 hook 수신, `workspace_label: codex-agent-view`, `PermissionRequest`와 tool lifecycle 확인 |

`0.3.0`은 공식 Codex 앱 안의 app-first snapshot UX를 source에 구현했다. 앱 내장 thread tools로 running/active task와 explicit `idle + hasUnreadTurn` task를 bounded query한다. 후자는 running과 분리한 `완료/확인 대기` 표시 그룹에 포함하지만 완료·성공으로 추론하지 않는다. Workspace basename, title, explicit status, 최신 explicit commentary와 `subAgentActivity`를 표시하며 hooks/local monitor는 lifecycle detail과 optional Codex in-app Browser live view를 담당한다.

팀장 source E2E에서 `kyurasi-next-supabase`의 active task/title/description/explicit `inProgress`/latest commentary/subAgentActivity를 확인했고, 직후 list가 explicit `idle`, `hasUnreadTurn: true`로 전환되는 것도 확인했다. 이는 확인할 unread turn이 있다는 관찰이며 task 완료·성공의 증거가 아니다. Browser monitor에서는 실제 `SessionEnd`를 관찰했다. 별도로 실행한 App Server의 `thread/list`는 이 앱 내장 tool evidence가 아니며 여전히 live source로 취급하지 않는다.

다음 release acceptance를 완료했다.

- [x] Full source test, plugin/skill validation과 final tarball QA
- [x] Exact public `0.3.0` artifact의 this-device global reinstall, plugin/install/wiring과 live hook QA
- [x] Public npm publish와 registry metadata/signature 검증
- [x] Annotated `v0.3.0` tag, origin push, GitHub Release와 registry/global artifact comparison

## CLI 표면

현재 package가 제공하는 command는 다음과 같다.

| Command | 동작 | 상태 변경 |
| --- | --- | --- |
| `codex-agent-view start [--port <port>] [--open]` | loopback monitor와 in-memory store를 foreground로 실행 | local runtime file 생성, 외부 browser는 `--open`에서만 실행 |
| `codex-agent-view status [--json]` | 실행 중 monitor의 상태 조회 | 없음 |
| `codex-agent-view doctor [--json]` | Codex CLI, plugin 설치·enable, hook bundle wiring, monitor/event 수신, runtime 경로 진단. Persisted exact-hook trust는 `unknown`으로 보고 | 없음 |
| `codex-agent-view install` | package를 local marketplace bundle로 복사하고 plugin 등록 | Codex plugin/marketplace 등록 변경 |
| `codex-agent-view uninstall [--purge]` | plugin과 marketplace bundle 제거 | Codex 등록 및 local files 변경 |
| `codex-agent-view --version` | package version 출력 | 없음 |

`start`는 장시간 실행되는 foreground command이며 기본적으로 URL만 출력한다. `--open`은 운영체제 외부 browser를 여는 명시적 action이다. Codex in-app Browser live view는 plugin이 private localhost URL을 대화에 노출하지 않고 별도로 연다. `status`와 hook sender는 runtime file의 local bearer token으로 monitor API에 접근한다.

## 서로 다른 세 가지 배포 개념

| 경로 | 목적 | 검색 노출 |
| --- | --- | --- |
| Git/local marketplace | source checkout 또는 package가 복사한 local bundle에서 plugin 설치 | 해당 marketplace를 등록한 사용자에게만 표시 |
| npm-backed marketplace | marketplace catalog가 npm registry package를 source로 지정 | 해당 marketplace를 등록한 사용자에게만 표시 |
| Universal Plugins Directory | OpenAI 심사와 개발자 publish 후 ChatGPT와 Codex가 공유하는 directory에 공개 | 공개 directory 검색 대상 |

npm에 package를 publish하는 것만으로 Universal Plugins Directory에 등록되지는 않는다. 반대로 Directory 제출은 npm package 배포의 대체 절차가 아니다.

현재 `.agents/plugins/marketplace.json`은 repository 또는 copied package root를 가리키는 local source(`source.path: "./"`)다. `codex-agent-view install`은 npm으로 받은 package라도 이 local catalog를 `~/.codex-agent-view/marketplace` 아래에 복사한 뒤 Codex CLI로 등록한다. 이것은 catalog가 npm registry를 직접 resolve하는 “npm-backed marketplace source”와 구분해야 한다.

## Maintainer·고급 진단: source 및 tarball 검증

Source checkout에서는 registry publish 없이 실제 CLI를 실행할 수 있다.

```bash
node bin/codex-agent-view.mjs --version
node bin/codex-agent-view.mjs doctor --json
node bin/codex-agent-view.mjs start
node bin/codex-agent-view.mjs status --json
```

`install`과 `uninstall`은 Codex 등록과 local files를 변경하므로 격리된 `CODEX_HOME`과 `CODEX_AGENT_VIEW_RUNTIME_DIR`에서 먼저 검증한다.

```bash
npm test
npm run validate:plugin
npm pack --dry-run --cache ./node_modules/.cache/npm
```

Release candidate 검증에서는 `npm pack`으로 만든 exact tarball을 임시 prefix에 설치하고, 설치된 executable에서 `--version`, `doctor`, `install`, `start`, `status --json`, `uninstall --purge` 순서의 smoke/E2E를 수행한다. Current `start` 기본값은 외부 browser를 열지 않으며, `--open`만 명시적인 external action이다. Source checkout만 실행하고 tarball이 정상이라고 가정하지 않는다.

## Public npm 사용자 경로

다음 명령은 public registry의 exact `0.4.4` release를 최초 설치한다. Mutable `latest`보다 문서와 일치하는 exact version을 우선한다.

```bash
npm install --global codex-agent-view@0.4.4
codex-agent-view install
```

`0.4.4` 사용자 설치 경로는 global package 설치와 명시적인 `codex-agent-view install` 조합이다. Global package download만으로는 Codex 설정을 바꾸지 않는다. 사용자가 `install`을 명시적으로 실행할 때만 local plugin registration이 바뀌며, hook command와 trust boundary를 먼저 보여준다. 이전의 valid installation-owned viewer credential을 보존하고, historical `0.4.2` migration 경계도 유지한다. Bundle-local executable 실행이 보장되지 않는 일회성 package runner 경로는 사용자 설치 방법으로 안내하지 않는다.

최초 설치 뒤 정상 사용은 다음 순서로 공식 Codex 앱 안에서 수행한다.

1. Codex 앱을 완전히 종료한 뒤 다시 연다.
2. 앱의 **Plugins** 화면에서 `Codex Agent View`가 설치·활성화됐는지 확인한다.
3. 앱의 hook review 화면에서 현재 hook definition을 검토하고 trust한다. 앱 version이 hook review UI를 제공하지 않을 때만 설치 절차의 일부로 interactive Codex CLI `/hooks`를 사용한다.
4. 앱에서 새 task를 만든다.
5. Plugin 카드를 선택하면 plugin context만 추가되고 action text나 skill-like starter는 붙지 않는다. 카드 설명에 따라 Codex 앱의 skill UI에서 실제 bundled `$show-agents` skill을 명시적으로 선택하거나 호출한다. Skill은 Codex 앱의 live panel 열기를 시도하며 app-native text snapshot도 수행한다고 주장하지 않는다. Panel을 닫았으면 같은 actual skill을 다시 명시 호출한다. Browser capability 또는 permission을 사용할 수 없으면 private URL이나 외부 browser로 우회하지 않고 실패를 안내한다.

Runtime 진단 명령과 localhost 관리는 위 **Maintainer·고급 진단** 절의 source/tarball 검증 경계에만 속한다.

`codex-agent-view install`의 현재 동작은 다음과 같다.

1. runtime directory 아래 `marketplace`에 package bundle을 복사한다.
2. `codex plugin marketplace add`로 그 local marketplace를 등록한다.
3. `codex plugin add codex-agent-view@codex-agent-view`로 plugin을 등록한다.
4. 등록 결과가 installed/enabled인지 다시 확인한다.
5. CLI JSON으로 exact-hook trust를 확인할 수 없음을 알리고 interactive `/hooks`에서 검토·trust하도록 안내한다.
6. 설치 전에 앱이 열려 있었다면 완전히 재시작하고, 그 뒤 새 task를 만들도록 안내한다.

Install command 자체는 별도 confirmation prompt를 제공하지 않는다. 따라서 사용자나 agent가 명시적으로 설치를 요청한 경우에만 실행한다. npm `postinstall`에서 이를 호출하지 않는다.

## 공식 npm marketplace source 후보

[공식 plugin packaging 문서](https://developers.openai.com/plugins/build/plugins)는 marketplace entry가 JavaScript package registry를 source로 사용할 수 있다고 설명한다. 별도 release marketplace가 registry package를 직접 설치하도록 전환한다면 후보 entry는 다음 형태다.

```json
{
  "name": "codex-agent-view",
  "source": {
    "source": "npm",
    "package": "codex-agent-view",
    "version": "^0.2.0",
    "registry": "https://registry.npmjs.org"
  },
  "policy": {
    "installation": "AVAILABLE",
    "authentication": "ON_INSTALL"
  },
  "category": "Productivity"
}
```

공식 문서에서 확인한 규칙은 다음과 같다.

- `package`는 필수이며 npm scope를 포함할 수 있다.
- `version`은 선택 사항이며 version, dist-tag, semver range를 받을 수 있지만 path나 URL selector는 받을 수 없다.
- `registry`는 선택 사항이다. 지정한다면 embedded credential, query, fragment가 없는 HTTPS URL이어야 한다.
- Codex host가 npm CLI를 사용해 package를 내려받고 registry 인증은 사용자의 npm configuration을 따른다.
- Codex는 npm package의 lifecycle script를 실행하지 않는다.

현재 local catalog를 이 npm source로 바꾸지 않는다. Package-owned installer와 npm-backed marketplace를 동시에 제공할지, 하나를 주 설치 경로로 삼을지는 실제 registry/App E2E 뒤에 결정한다.

## Hook trust와 공식 앱 활성화

어떤 배포 경로를 쓰더라도 다음 단계를 몰래 자동화하지 않는다.

1. 사용자가 설치 package와 hook source를 검토한다.
2. plugin을 명시적으로 enable한다.
3. CLI TUI의 `/hooks` 또는 공식 앱의 해당 UI에서 `hooks/hooks.json` command를 검토한다.
4. current hook definition의 exact hash를 사용자가 직접 trust한다.
5. Plugin 설치 전부터 공식 앱이 열려 있었다면 앱을 완전히 종료·재실행한다.
6. Trust 뒤 만든 새 task에서 hook → loopback runtime → UI 흐름을 확인한다. 이전 event는 재생되지 않는다.

`codex plugin list --json`은 plugin installed/enabled 상태를 확인하는 근거지만 persisted exact-hook trust를 노출하지 않는다. 따라서 `doctor`는 trust를 성공으로 추측하지 않고 `unknown`과 interactive `/hooks` 확인 절차를 보고한다.

## 제거와 복구

Package CLI의 기본 제거 경로는 다음과 같다.

```bash
codex-agent-view doctor
codex-agent-view uninstall
```

`uninstall`은 owned monitor를 runtime/control token으로 확인·종료하고 `codex-agent-view@codex-agent-view` plugin 등록, `codex-agent-view` marketplace 등록과 copied marketplace bundle을 제거한다. Valid owned viewer credential도 정상적으로 폐기해 나중의 reinstall이 새 credential을 만들게 한다. Runtime directory의 관련 없는 나머지 data는 보존한다. Malformed, changed, symbolic 또는 unrecognized viewer credential은 삭제하지 않고 보존 경고를 출력한다.

사용자가 runtime directory까지 제거하길 명시적으로 원할 때만 다음을 사용한다.

```bash
codex-agent-view doctor --json
codex-agent-view uninstall --purge
```

`--purge`도 valid viewer credential을 폐기한 뒤 owned stale runtime file과 빈 runtime directory만 추가 제거한다. Malformed 또는 unrecognized runtime/viewer credential은 보존하고 경고한다. 실행 전에 `doctor`가 보고한 exact runtime directory가 안전한 대상인지 확인한다. 별도 `PLUGIN_DATA`, `CODEX_AGENT_VIEW_CAPTURE_DIR`, 또는 project working directory에 생성한 opt-in debug capture는 runtime directory 밖에 있을 수 있으므로 자동 정리됐다고 가정하지 않는다.

CLI를 사용할 수 없는 수동 복구에서는 먼저 `codex plugin list`와 `codex plugin marketplace list`로 정확한 ID를 확인한 뒤 plugin과 marketplace를 각각 제거한다.

```bash
codex plugin remove codex-agent-view@codex-agent-view
codex plugin marketplace remove codex-agent-view
```

## 외부 npm release 및 artifact 검증

아래는 완성된 local product에 대한 distribution artifact와 운영 절차 검증이다. In-memory 설계를 보완하는 제품 기능 checklist가 아니다.

- [x] maintainer npm `kyurasi` login 확인
- [x] `0.2.0` 코드와 publish tarball 준비 확인
- [x] npm account 필수 2FA `auth-and-writes`, `pending:null` 확인
- [x] `0.2.0` public registry publish 성공 확인
- [x] `npm pack --dry-run`에서 의도한 runtime files만 포함하고 test/dev capture는 제외
- [x] tarball 안에 executable, manifests/catalog, logo assets, hooks, sender/capture scripts, skill, UI/runtime, README, LICENSE, NOTICE 포함
- [ ] release repository에서 Privacy, Terms, Support, Security 문서의 public URL이 접근 가능
- [x] Public exact artifact를 clean temporary global prefix에 설치하고 executable과 `--version` 검증
- [x] Isolated Codex/runtime directories에서 `doctor` → `install` → `start --port 0 --no-open` → 다섯 hook event → `status --json`/UI → `uninstall --purge` E2E
- [ ] monitor가 IPv4 loopback 외부에 bind하지 않고 API가 token을 요구하는지 검증
- [ ] npm install과 Codex npm-backed marketplace install에서 lifecycle script가 실행되지 않는지 관찰
- [x] 실행 중이던 공식 앱 process에 `0.2.0` install/enable과 monitor가 정상인데도 실제 subagent 2개의 hook event가 0건임을 재현
- [x] 위 재현에서 app log에 sender 실행이 없고, 설치 전 `hooks/list` snapshot 유지 정황과 non-interactive trust 확인 불가를 기록
- [x] `0.2.1` install 뒤 공식 앱 full restart와 새 GUI task의 parent/subagent/tool/permission 핵심 lifecycle E2E
- [x] Historical public `0.2.0`의 exact-version `npx`로 `--version`, `doctor`, `install`, ephemeral-port `start`, `status`, `uninstall` smoke
- [x] Historical public `0.2.0` global/`npx` uninstall purge 뒤 plugin 등록과 runtime directory가 비어 있음을 확인
- [x] npm `gitHead`, annotated `v0.2.0` tag, origin tag와 public GitHub Release의 source 일치 확인
- [x] Registry SRI/signature와 tagged source 대비 21개 package file byte 일치 확인
- [x] `0.2.1` public registry publish와 `latest: 0.2.1` 확인
- [x] `0.2.1` version/license/bin, npm `gitHead`, 21 files/unpacked size, shasum/exact SRI와 registry signature 확인
- [x] 이 기기에 public exact `0.2.1`을 global reinstall하고 CLI, plugin installed/enabled, hook wiring 9종 확인
- [x] Public exact `0.2.1` monitor 재시작 뒤 실제 sessions 자동 수신과 probe subagent running → stopped/UI 완료 반영 확인
- [x] 공식 앱 재시작 뒤 실제 `SessionStart`, `UserPromptSubmit`, `Stop`, `SubagentStart`, `SubagentStop`, `PreToolUse`, `PostToolUse`, `PermissionRequest`와 task ID 등록 없는 자동 표시 확인
- [x] 후속 `0.3.0` source E2E에서 실제 공식 앱 `SessionEnd` event와 completed session 반영 확인
- [x] Public exact `0.2.1` clean-cache exact-version `npx --version` smoke
- [x] `v0.2.1` annotated tag, GitHub Release, registry `gitHead` source 일치와 21개 package file byte comparison
- [x] Registry tarball과 this-device global install/copied marketplace 21개 package file byte comparison
- [x] `0.3.0` public registry publish와 `latest: 0.3.0`, gitHead/shasum/exact SRI/signature/21 files/unpacked size 확인
- [x] Public exact `0.3.0` global reinstall, plugin installed/enabled, hook wiring 9종과 registry ↔ global diff 0 확인
- [x] Public exact `0.3.0` monitor에서 실제 hook, `workspace_label: codex-agent-view`, `PermissionRequest`, tool lifecycle과 probe subagent running → stopped(`has_out_of_order_events: false`) 확인
- [x] Annotated `v0.3.0` origin push와 public GitHub Release 확인
- [x] Source `0.3.1` candidate의 Node tests `67/67`, plugin/skill validation, package contract와 pack 21 files QA
- [x] `0.3.1` public registry publish와 version/`latest`, gitHead, shasum, integrity, 21 files 검증
- [x] Public exact `0.3.1` this-device reinstall과 plugin installed/enabled 확인
- [ ] Public exact `0.3.1` 공식 Codex 앱 새 task app-only E2E
- [x] Annotated `v0.3.1` tag와 public GitHub Release 확인
- [x] Source `0.3.2` Node tests `67/67`, plugin/skill validation, package contract와 pack 21 files QA
- [x] `0.3.2` public registry publish와 version/`latest`, gitHead, shasum, integrity, signature, 21 files, package/unpacked size 검증
- [x] Public exact `0.3.2` global install, plugin installed/enabled와 registry artifact mismatch 0 확인
- [x] Public exact `0.3.2` app-native thread snapshot에서 worker activity 3개 확인
- [ ] Public exact `0.3.2` live hook E2E: 앱 full restart 후 새 task에서 검증
- [x] Annotated `v0.3.2` tag, GitHub Release, main/tag CI와 registry/tagged-source artifact comparison
- [x] Public `0.4.0` latest/version, shasum, integrity, signature, 25 files와 package/unpacked size 확인
- [x] Registry metadata에 npm `gitHead`가 없음을 확인하고 exact tarball publish 경계로 기록
- [x] `v0.4.0` annotated tag/release commit `11f7b0511a39c5f5a61cb6da7b91fb3b8e915c6b`, GitHub Release, main/tag CI 성공 확인
- [x] Registry tarball과 release tarball byte-identical 확인
- [x] Public exact `0.4.0` this-device reinstall: CLI/plugin version, installed/enabled, hook wiring 9종, `events_received: true`, sessions 7 확인
- [ ] Public exact `0.4.0` Show Agents visual panel E2E: Browser open request `queued`, 현재 app process에서 tab 미관찰; 앱 restart/new task 뒤 재검증
- [x] Historical `0.4.1`에서 plain `defaultPrompt`를 instructional starter로 교체한 사실과 그것도 skill invocation은 아니었다는 경계를 기록
- [x] Public `0.4.1` latest/version, Apache-2.0, bin mapping, shasum/integrity/signature, 25 files와 package/unpacked size 확인
- [x] Registry metadata에 npm `gitHead`가 없음을 확인하고 exact tarball publish 경계로 기록
- [x] `v0.4.1` annotated tag/commit, GitHub Release, main/tag CI 성공과 release/registry tarball byte 일치 확인
- [x] Public exact `0.4.1` this-device reinstall: CLI/plugin version, installed/enabled, hook wiring 9종 확인
- [x] Install 교체 중 runtime 정상 종료와 현재 `monitor_not_running`, hook trust `unknown` 경계 기록
- [ ] 앱 완전 재시작/new task 뒤 bundled **Show Agents** 직접 선택과 live panel visual E2E
- [x] Public `0.4.2` registry metadata/signature, release/registry tarball byte 일치, pushed commits, main CI, annotated tag/GitHub Release 확인
- [x] Public exact `0.4.2` this-device global install, plugin installed/enabled, hook wiring 9종, installed artifact match와 official Codex in-app Browser visual E2E 확인
- [x] Public `0.4.3` npm publish, commits/main CI, metadata/signature/digest와 local release↔registry tarball byte 일치
- [x] Public exact `0.4.3` this-device install/artifact/plugin/hooks/doctor 및 official Codex legacy-tab migration E2E
- [x] Annotated `v0.4.3` tag, public non-draft/non-prerelease GitHub Release와 final main/tag CI 확인
- [ ] Opt-in capture가 존재하는 경우의 보존·별도 정리 경로 확인

Historical `0.2.0` public-artifact E2E에서 `SubagentStart`, `SubagentStop`, `PreToolUse`, `PostToolUse`, `PermissionRequest` fixture event가 status/UI에 반영됐고 search/filter가 동작했으며 browser console error가 없었다. 별도의 `0.2.1` 공식 앱 E2E에서는 실제 `PermissionRequest` hook과 read-only waiting 표시를 포함한 위 8종 event를 확인했다.

`0.2.1`은 `SessionStart`, `SessionEnd`, `UserPromptSubmit`, `Stop`을 추가하고 empty UI/`status`/`doctor` 진단을 강화했다. Public artifact E2E 당시 실제 `SessionEnd`는 관찰하지 않았다. 이후 `0.3.0` browser monitor에서 실제 `SessionEnd`와 lifecycle 반영을 확인했고, public exact `0.3.0` install에서도 실제 permission/tool hook 수신을 검증했다.

## 외부 배포 운영 상태

- [x] npm account login, package metadata, version, tarball을 확인했다.
- [x] npm account 필수 2FA를 활성화하고 registry publish를 완료했다.
- [x] Package 이름 소유권과 public visibility를 registry publish 성공으로 확인했다.
- [x] Historical `0.2.0`: npm `gitHead`와 annotated tag, origin tag, public GitHub Release가 같은 source를 가리키고 21개 package file이 byte-identical임을 확인했다.
- [x] Historical `0.2.1`: public registry evidence, exact-version global install, annotated tag, GitHub Release와 source/artifact byte comparison을 검증했다.
- [x] Historical `0.3.0`: public registry metadata/signature, annotated tag, GitHub Release, exact-version global reinstall과 registry/global artifact comparison을 검증했다.
- [x] Historical `0.3.1`: public registry metadata/digest, annotated tag/GitHub Release와 this-device reinstall의 plugin installed/enabled를 확인했다.
- [x] Historical `0.3.2`: public registry metadata/digest/signature, annotated tag/GitHub Release, main/tag CI, exact global install과 registry/install artifact match를 확인했다.
- [x] `0.3.2` app-native thread snapshot에서 worker activity 3개를 확인했다.
- [ ] `0.3.2` live hook E2E는 앱 full restart/new-task 전이라 미완료다.
- [x] Historical public `0.4.0`: 당시 latest/version, digest/signature, 25-file tarball, annotated tag/GitHub Release, main/tag CI와 registry/release tarball byte 일치를 확인했다.
- [x] Public exact `0.4.0` CLI/plugin reinstall, installed/enabled, hook wiring 9종, event 수신과 sessions 7을 확인했다.
- [ ] Public exact `0.4.0` Show Agents visual panel은 현재 app process에서 관찰하지 못했으므로 앱 restart/new task E2E가 필요하다.
- [x] Historical public `0.4.1`: registry metadata/digest/signature, 25-file tarball, annotated tag/GitHub Release, main/tag CI와 release/registry tarball byte 일치를 확인했다.
- [x] Public exact `0.4.1` CLI/plugin reinstall, installed/enabled와 hook wiring 9종을 확인했다. Runtime은 `monitor_not_running`, trust는 `unknown`이다.
- [ ] Public exact `0.4.1` direct **Show Agents** visual E2E는 app restart/new task 뒤 검증해야 한다.
- [x] Current public `0.4.2`: registry metadata/signature, pushed commits, main CI Node.js 18/20/22, release/registry tarball byte 일치, annotated tag/GitHub Release, this-device exact install/artifact match, plugin installed/enabled, hook wiring 9종과 official Codex in-app Browser visual E2E를 확인했다.
- [x] Current public `0.4.3`: npm/CI/artifact/this-device install과 persistent viewer credential migration/restart reconnect official app E2E를 확인했다.
- [x] Annotated `v0.4.3` tag, GitHub Release와 final main/tag CI를 확인했다.
- [ ] npm-backed marketplace catalog를 제공한다면 package, version range, registry와 authentication policy를 확정한다.
- [x] Historical `0.2.1` 공식 앱에서 plugin installed/enabled와 새 task 핵심 lifecycle/permission 및 task ID 등록 없는 자동 표시를 실제 사용자 환경에서 검증했다.
- [x] 후속 `0.3.0` source에서 실제 `SessionEnd`를 독립 검증했다.
- [ ] Public exact release의 CLI 제거와 전체 lifecycle을 별도로 독립 검증한다.
- [ ] Universal Plugins Directory 제출은 npm release와 별도로 진행한다.

선택적인 npm provenance attestation 완료는 주장하지 않는다. 이는 registry signature와 version별 source/artifact byte comparison의 완료 여부와 구분한다.

## 남은 미확인 사항

- npm-backed marketplace가 현재 공식 앱 GUI에서 local/Git source와 동일하게 hook trust UI까지 연결되는지
- no-account, local-only plugin에 가장 정확한 marketplace `policy.authentication` 값
- package-owned installer와 npm-backed marketplace 중 공개 릴리스의 주 설치 경로
- npm artifact와 Universal Plugins Directory listing을 연결하는 장기 release convention

## 공식 근거

- [Package your plugin](https://developers.openai.com/plugins/build/plugins)
- [Hooks](https://learn.chatgpt.com/docs/hooks)
- [Plugins overview](https://learn.chatgpt.com/docs/plugins)
