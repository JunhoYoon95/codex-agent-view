# Universal Plugins Directory 제출 준비

조사일: 2026-08-01

이 문서는 Codex Agent View의 Universal Plugins Directory 제출 경계와 준비 상태를 정리한다. Public npm `latest`/version은 `0.5.6`이고 accepted/registry tarball byte identity, digest/signature, main/tag CI와 annotated tag/GitHub Release를 확인했다. Accepted artifact의 clean temporary CLI install은 완료됐지만 official Codex app real-hook E2E와 clean second-device install은 pending이다. Public `0.5.5` release evidence와 actual not-found compatibility failure는 historical fact로 보존한다. npm 공개는 Directory 제출·승인·검색 노출과 별도이며 Actual Directory acceptance는 주장하지 않는다.

## 핵심 결론

- OpenAI review 승인 뒤 developer가 publish해야 ChatGPT와 Codex가 공유하는 Universal Plugins Directory에 표시된다.
- GitHub marketplace 등록이나 npm publish만으로 Universal Directory에 노출되지 않는다.
- 공식 portal은 `Skills only`와 MCP-backed 제출을 지원한다.
- Public `0.3.2` package에는 genuine `skills/codex-agent-view/SKILL.md`가 있고 manifest가 `skills: "./skills/"`로 bundle한다.
- Historical public `0.4.8` package는 기존 app-native task snapshot skill과 explicit live-panel **Show Agents** skill, 총 2개를 bundle했다. Public `0.5.0`부터 current source `0.5.6`까지 두 user-facing path를 하나의 internal browser-launch skill로 통합한다. 이 skill은 Directory 형식 통과만을 위한 빈 껍데기가 아니라 plugin 실행 capability다.
- 공식 공개 문서는 **skills-only submission에 local command hooks를 함께 bundle한 경우의 eligibility/review 규칙을 명시하지 않는다.** 따라서 “skills-only + hooks” 제출 가능 여부는 여전히 **미확인**이며 portal 또는 OpenAI 확인이 필요하다.
- MCP 경로는 production HTTPS endpoint를 요구하므로 external server를 두지 않는 현재 제품 방향과 맞지 않는다.
- Maintainer npm account의 2FA `auth-and-writes` mode와 `pending:null`을 확인했다. Historical `codex-agent-view@0.3.2`는 registry metadata/digest/signature, annotated tag·public GitHub Release, main/tag CI와 this-device exact global install의 plugin installed/enabled 및 registry/install artifact match를 확인했다. Universal Directory는 아직 publish되지 않아 directory 검색이 가능하다고 안내하지 않는다.

Bounded in-memory local architecture와 package surface를 구현했다. Historical `0.2.1` 공식 앱 E2E에서 핵심 hook lifecycle과 실제 `PermissionRequest`를 확인했고, 후속 `0.3.0` source E2E에서는 앱 내장 thread tools로 `kyurasi-next-supabase` active task의 workspace/title/description/explicit `inProgress`/latest commentary/`subAgentActivity`를 확인했으며 optional browser monitor에서 실제 `SessionEnd`도 관찰했다. Public `0.4.2` evidence도 보존한다. Public `0.4.3`은 commits `a7d938c`/`e2b0543`, main code CI `30713618590` Node.js 18/20/22, npm metadata/signature, local release/registry tarball byte 일치, this-device exact install/artifact match, plugin installed/enabled, hook wiring 9종, `doctor` event observation과 official Codex in-app Browser migration E2E를 완료했다. Annotated `v0.4.3` tag는 commit `dea9f39890387ed509cfa0bb511c8167abe11148`을 가리키고 [GitHub Release v0.4.3](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.4.3)는 public(`draft: false`, `prerelease: false`)이며, final main docs CI `30714110050`과 tag CI `30714144940`도 성공했다. 기본 monitor는 실행 중인 부모/subagent를 먼저 배치하고 human-readable label/status를 주 정보로 사용하며 raw session/agent ID는 보조 metadata, raw event name은 비주요 정보로 취급한다. Prompt와 tool input/output은 표시하지 않는다. 아래 항목은 별도의 Directory acceptance 조건이며 SQLite나 persistent history를 추가해야 해결되는 blocker가 아니다.

Historical public `0.4.3`에는 plugin-level `$show-agents` starter text가 있었지만 실제 bundled skill dispatch를 보장하지 않았다. Public `0.4.5`와 `0.4.8` manifest에는 starter/default prompt가 없었고 사용자가 `$show-agents`를 따로 선택했다. Public `0.5.0`과 `0.5.1`의 `defaultPrompt`는 plugin card에 starter text를 붙이는 UI metadata였으며 skill 자체나 dispatch contract가 아니었다. Version `0.5.2`부터 current source `0.5.6`까지 starter text를 제공하거나 요구하지 않는다. 사용자는 task에서 `@codex-agent-view` 자체를 선택·전송하며 internal single skill은 `codex-agent-view open`을 한 번 실행해 기본 browser에 authenticated local view를 연다. Plugin 카드가 promptless Quick start control을 제공하는지는 앱 UI에 달려 있어 실제 확인 전에는 주장하지 않는다. Internal skill은 private URL을 대화에 출력하지 않는다. CLI는 runtime bearer 전에 nonce/HMAC ownership proof를 검증하고 exact `127.0.0.1:<port>` authority의 origin-form request만 사용한다. Runtime token이 서명한 1회용 60초 bootstrap grant만 browser target에 넣고 persistent viewer/runtime token은 URL에 넣지 않는다. npm/terminal은 최초 설치, 명시적 제거와 maintainer 진단 경계다. 별도로 실행한 App Server는 앱 내장 tools와 다른 process이며 live source로 취급하지 않는다.

Public `0.5.5`의 README는 `Open each view with one lightweight \`@codex-agent-view\` invocation. Once open, live monitoring runs locally with no additional model calls.`라고 설명하며, 관찰 대상 task/subagent의 일반적인 model·token 사용은 계속됨을 명시한다. Package/plugin detailed description은 `A read-only Codex plugin for monitoring live tasks and subagents in your browser. Open each view with one lightweight @codex-agent-view invocation. Once open, live monitoring runs locally with no additional model calls.`이다. GitHub remote는 `PUBLIC`, short Description `A lightweight, read-only dashboard plugin for monitoring Codex tasks and subagents in real time.`, npm Website와 Topics 13개를 재조회해 확인했다.

## Public `0.5.6` npm release evidence

Public npm `0.5.6`은 `2026-08-08T23:51:45.221Z`에 publish됐고 `latest`도 `0.5.6`이다. Registry tarball은 accepted tarball과 byte-identical하다. SHA-256 `1833ab20f694c6ee10c16c76af19e968074c566ae39ffa53b88efee81b70de86`, shasum `9879c9fb98ee9abe768ca05e0c7dac1729015867`, integrity `sha512-0BIt98xDH1eDvqbI7OeGzwGcwv5YxanwJJ3YeduqN6ubiZiHW3M3x6iuql8LUAKs4k8THXf7YeE6L23bfvROkQ==`, signature와 23 files/`262872` unpacked bytes를 확인했다. Release commit과 annotated tag target은 `651d260c17694814a118f84705b3f809b7daa1a5`이고 main CI `31284502077`과 tag CI `31284958057`은 Node.js 18/20/22에서 성공했다. [Public non-draft/non-prerelease GitHub Release v0.5.6](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.5.6)는 `2026-08-08T23:53:33Z`에 공개됐다.

Accepted exact artifact는 empty temporary `CODEX_HOME`/runtime의 actual `codex-cli 0.146.0`에서 nested runtime source `./plugins/codex-agent-view`, plugin installed/enabled, valid hook wiring 9종과 trust `unknown`, purge 뒤 plugin/runtime absent를 확인했다. 공식 Codex 앱 restart/trust/new-task real-hook E2E와 clean second-device install은 pending이며 Directory acceptance도 주장하지 않는다.

## Historical public `0.5.5` npm release evidence

npm `latest`/version `0.5.5`, publish time `2026-08-04T18:42:31.744Z`, shasum `cc04e6a10380a0b5b0f9b1df5af7b6ce8d85139a`, integrity `sha512-J10ch73w6bi6Q/R4A3nkjYVaV9/HTnYxuu1Znmnin+xi432IJVgWlKyEPmPfdBlW+duoGyLzpV+mmfHN4DZydA==`와 signature 1개를 확인했다. Artifact는 23 files, packed `63.2 kB`, unpacked `253525 bytes`, SHA-256 `242b007c8572474712d7694553e5319e193804ebc268c3d15008510258cc03d5`이며 local release와 clean-cache registry tarball은 byte-identical하다.

Release source `0037a5b304dc76a20050d2cf5dfce3276dccd004`의 main CI `30937777321`과 tag CI `30940008363`은 Node.js 18/20/22에서 성공했다. Annotated `v0.5.5`와 [public non-draft/non-prerelease GitHub Release](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.5.5)를 확인했으며 Release publish time은 `2026-08-04T18:44:32Z`다. This-device global package와 CLI `0.5.5`, plugin installed/enabled, valid hook bundle 9종, registry/global diff 0, registry install entries 13개와 marketplace diff 0을 compatible Codex CLI의 reinstall로 확인했다. Monitor는 stopped이고 hook trust는 CLI-unobservable `unknown`이다. Prepublish exact-tarball lifecycle과 isolated browser filter E2E는 통과했지만 clean cross-device first install을 대체하지 않는다. 공식 Codex 앱 restart/new-task public exact status-filter/assignment E2E도 pending이다.

Public `0.5.5` marketplace는 `source.path: "./"`를 사용한다. 이 marketplace-root plugin 형식을 지원하지 않는 Codex CLI가 PATH에서 선택된 다른 기기에서는 “plugin `codex-agent-view` was not found in marketplace `codex-agent-view`” 실패가 실제 확인됐다. Artifact byte identity와 this-device reinstall을 일반적인 installability evidence로 승격하지 않는다. `codex --version` 확인 뒤 Codex 앱/CLI를 현재 version으로 업데이트하는 안내는 임시 recovery이며, public `0.5.5` installer에 호환성 fix나 minimum-version preflight가 포함됐다는 뜻이 아니다.

`v0.5.4..v0.5.5`의 `hooks/`, `scripts/`, `src/` diff는 0으로 privacy-sensitive collection, transport와 state 경계가 바뀌지 않았다. Exact artifact identity, compatible-CLI reinstall과 isolated browser filter E2E는 clean cross-device first install 또는 official Codex app hook/plugin E2E를 대체하지 않는다.

이 evidence는 Universal Directory submission/review/search exposure 또는 promptless plugin-card Quick start acceptance를 뜻하지 않는다.

## Public `0.5.4` npm release evidence

npm `latest`/version `0.5.4`, publish time `2026-08-03T20:24:33.437Z`, current detailed description, `Apache-2.0`, keywords 13개, shasum `c77eb53a0f7d170bc0259a604dbbb8f6a85e4bb4`, integrity `sha512-c0fhYlHJRHbFWbON2+DhJVuBoLiXyW9Bp9bSZhZLKML+a8MvhQxqSdTYr1fvwO3dESa1IO0WVZ4sLWucljsESA==`와 signature 1개를 확인했다. Artifact는 23 files, packed `62.9 kB`, unpacked `252.8 kB`, SHA-256 `58ef4f976b1ee5cc255559a037dbe0ac0cefaa5c642084ddd123d1a6f272606c`이며 release/registry tarball은 byte-identical하다.

Release source `3312be0bf7ebbeb5694a857089796903410d9b9c`의 main CI `30849631485`와 tag CI `30850278542`는 Node.js 18/20/22에서 성공했다. Annotated `v0.5.4`와 [public non-draft/non-prerelease GitHub Release](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.5.4)를 확인했다. This-device public exact global package와 CLI `0.5.4`, plugin installed/enabled, valid hook bundle과 registry install entries 13개/runtime files 22개 일치를 확인했다. Monitor는 exact install 뒤 stopped, trust는 CLI-unobservable `unknown`이다. 앱 restart/new-task actual hook+assignment E2E는 pending이며 재시작 전 canary의 event 부재를 성공이나 실패로 단정하지 않는다.

이 evidence는 Universal Directory submission/review/search exposure 또는 promptless plugin-card Quick start acceptance를 뜻하지 않는다.

Public Codex plugin API에서 sidebar/panel/in-app Browser open이 이 제품에 안정적인 surface가 아니었으므로 public `0.5.0`부터 운영체제 default browser를 사용한다. Tab을 닫으면 `@codex-agent-view`를 다시 실행한다. 이전에 인증된 같은 tab의 transient failure는 page retry/**Reconnect**로 복구하고, credential 없는 새 tab이나 fixed family 만료는 plugin을 다시 실행해 새 grant를 받는다.

## Historical public `0.5.3` npm release evidence

npm `latest`/version `0.5.3`, publish time `2026-08-03T19:29:03.590Z`, exact agreed description, keywords 13개, `Apache-2.0` license, shasum `94b60ff4662b829ca5853439e4da0cef4466927d`, integrity `sha512-r59F+z19gehSiKlhsRpcaPDiIwXFBtUXXjaUIVr1RiWotV4CBXGMI95Se8BmJ0g/gBPUOsvewm4NvVIv3IK0DQ==`와 signature 1개를 확인했다. Artifact는 23 files, packed `62.9 kB`, unpacked `252.8 kB`, SHA-256 `125abefe16b600d12b5f81dc93f96da89c6742be76522a98d45f996b53805cbd`다.

Source commit `4b79e1b0645405927e22752a52d6900a9d02a2a2` pack과 registry tarball은 byte-identical하다. Main CI `30845807979`는 Node.js 18/20/22에서 성공했고 tag CI `30846142549`도 성공했다. Annotated `v0.5.3`과 [public GitHub Release](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.5.3)를 확인했다. npm packaged README/description/keywords/license, public exact global reinstall `0.5.3`, installed files diff identity, plugin installed/enabled와 hook wiring 9종을 확인했다. 현재 monitor는 앱 재시작 전 `monitor_not_running`, trust는 CLI-unobservable `unknown`이며 Codex 앱 restart/new-task actual event와 public exact invocation E2E는 pending이다.

이 release evidence는 bundled validator compatibility, Directory portal/reviewer acceptance, search exposure 또는 promptless plugin-card Quick start acceptance를 뜻하지 않는다.

## Public `0.5.2` npm release evidence

npm `latest`/version `0.5.2`, publish time `2026-08-03T18:45:19.094Z`, shasum `58a3841a73f8dec2060710962f4bfd0273931fec`, integrity `sha512-ugMRzbmWI2Fp5QGtwuze9yC3SNspq5Uua/FL/9YMj1OBVlq9JXigqRiHnZgOjWny15QXJ6wLi8z2MN8vAgq53A==`와 npm signature 1개를 확인했다. Registry artifact는 23 files, packed `62.5 kB`, unpacked `251.2 kB`이며 tarball SHA-256은 `6292b1a9a93fe0ede6054362544b609991322adf37b44611e35c4d0ec74c174b`다.

Source commit `9227bff6526978e4d8f8fc48b047ffcbf44f5599`의 pack과 registry tarball은 byte-identical하다. Main CI `30842520151`과 tag CI `30842851244`은 Node.js 18/20/22에서 성공했다. Annotated `v0.5.2`와 [GitHub Release v0.5.2](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.5.2)는 public이다. Public exact global reinstall의 CLI/plugin은 `0.5.2`이고 installed files는 registry extract와 diff-identical하다. `doctor`는 installed/enabled, hook wiring 9종, monitor ok, `events_received: true`, sessions 1을 보고했다. Hook trust는 CLI-unobservable `unknown`이다. Actual Assigned work/Current activity display를 관찰했고 사용자가 정상 동작을 확인했다.

이 npm evidence는 bundled validator compatibility, Directory portal/reviewer acceptance, search exposure 또는 promptless plugin-card Quick start behavior를 완료했다는 뜻이 아니다. 해당 항목은 pending/unverified다.

## Historical public `0.5.0` release evidence

Release 당시 public npm `latest`/version `0.5.0`, shasum `bf89ee665840e62d502551d87d7faaed2a1e0206`, integrity `sha512-W8rOv+0Xb5SVsFl/kXHF/vt9CJ/Su0rwDWVFWLWYWhKidZTxx+ea9Z0dtd65k3KBxucLRuwMOUJL3BtHr2p2Dw==`, registry signature와 23 files를 확인했다. Registry artifact SHA-256은 `e23c4ea484fa6186c17f2c564b5019a08eb6acca10f99fc85bf95e2f2757bc2c`다. Main CI `30816426733`은 Node.js 18/20/22에서 성공했다.

This-device public exact reinstall에서 CLI/plugin `0.5.0`, installed/enabled, hook wiring 9종과 `events_received: true`를 확인했다. 공식 Codex 앱은 actual subagent start/stop을 전달했고 최종 agent 상태는 `stopped`였다. 그 official E2E에서 automatic `in-app-browser-context` wrapper가 task summary에 섞이는 defect도 확인했다. Public `0.5.1`은 이 wrapper를 summary 입력에서 제거한다.

`v0.5.0` tag와 GitHub Release는 아직 생성하지 않았다. 따라서 tag CI와 release URL도 없다. 이 npm/CI/E2E evidence는 Universal Directory 제출·승인·검색 노출이나 npm provenance attestation을 뜻하지 않는다.

## Public `0.5.1` npm release evidence

Public npm `latest`/version `0.5.1`, shasum `ca9b1e61ce8139f62a5f3016c81973d8bf1ea1ac`, integrity `sha512-tvz3oN+F5sMW0at+17FEDGoC4FO8LfBJUjBBYmYmvKtIsyPhhqJ+irPfd/8Uws+Bn5QMjtYcLzG/rBEXtGQ6UQ==`와 npm signature 1개를 확인했다. Registry tarball과 release tarball은 byte-identical이고 SHA-256은 모두 `e540adcc4205eb6c1026f6a17864ac1a44e925696e0ff5ac659cba95402cf447`이다.

This-device public exact `0.5.1` global reinstall에서 CLI/plugin `0.5.1`, installed/enabled, hook wiring 9종과 `events_received: true`를 확인했다. Main CI `30818761050`과 tag CI `30825304988`은 성공했고 tag CI는 Node.js 18/20/22를 통과했다. Annotated `v0.5.1` tag와 [GitHub Release v0.5.1](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.5.1)을 확인했다. Actual official `SubagentStart`/`SubagentStop` live UI E2E에서 running agent 수가 1에서 0으로 바뀌고 대상 agent가 completed/stopped로 끝났다.

Official `task_summary` live prompt는 monitor가 해당 task의 `UserPromptSubmit` 뒤에 시작되어 이번 observation window에서 미확인이다. Actual ambient wrapper fixture를 쓰는 core/store/live automated tests는 통과했지만 official live prompt 증거로 대체하지 않는다. Universal Directory review도 별도 external acceptance다.

## Public `0.4.8` release evidence

Historical public `0.4.8`의 bootstrap은 최초 signed `family_exp`를 30분으로 고정하고 access/recovery/refresh는 이를 연장하지 않는다. 15분 read-only access는 같은 family 안에서 자동 갱신되어 deadline까지 view를 유지한다. Recovery는 tab-scoped `sessionStorage`에만 두고 `localStorage`에는 두지 않는다. 같은 tab은 family 안에서 **Reconnect**할 수 있지만 다른 tab과 인증 이력이 없는 tab에는 button이 없다. Monitor restart는 아직 교환하지 않은 old-process bootstrap만 즉시 무효화한다. Exchange가 끝난 family는 persistent viewer signing으로 original deadline까지 같은 fixed origin의 새 in-memory observation window에 재연결할 수 있다. 그 historical release에서는 family 만료 뒤 actual `$show-agents` 재호출이 필요했고 external browser를 사용하지 않았다. Current source에서는 default browser가 의도된 surface이고 만료 뒤 `@codex-agent-view`를 다시 실행한다. 두 버전 모두 Cookie, CORS, SQLite와 persistent event history를 추가하지 않는다. Explicit upgrade install은 existing authenticated maintenance lifecycle로 healthy owned `0.4.7` monitor를 먼저 정지한다.

`npm run check`는 전체 153/153 tests, plugin validation과 package dry-run을 통과했다. Public npm `latest`/version `0.4.8`, shasum `4ede86be395a7175335cb1a016b67afbb2617606`, integrity `sha512-bYdPvclbT6oD2fnX3TNy30D4g3bMN24dfZ+D5PyekiUlNybBNLxSPr6bjXwQiVEFpW9Q9J7dc1DkdaMstvkszw==`, registry signature, 25 files와 unpacked `311488` bytes를 확인했다. Release tarball과 registry tarball의 SHA-256은 `402c25286dff47dd590ec4ea128a45fde70e76719abbdb990b8ed61c36a08fc1`로 같고 byte-identical이다.

Main CI `30806601086`은 Node.js 18/20/22에서 성공했다. Annotated `v0.4.8` tag object `ed6561e929d3b2237acb223de037596663f4dc45`는 commit `e81e40704da05421515a4f78e84726857fbd0ba3`을 가리키고 tag CI `30811300042`도 성공했다. [GitHub Release v0.4.8](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.4.8)은 public, `draft: false`, `prerelease: false`다.

This-device public exact global install은 registry artifact와 byte-identical이고 CLI/plugin `0.4.8`, installed/enabled, hook wiring 9종과 healthy `doctor`를 확인했다. 공식 Codex 앱은 새 subagent start/stop을 ordered timestamp로 전달했고 최종 agent 상태는 stopped였다. Official Codex in-app Browser에서는 grant 인증, fragment 제거, same-tab bare-root recovery button 성공과 new-tab recovery button 부재를 확인했다. 이 실행에서는 앱 process 재시작 없이 hook이 전달됐지만 이 관찰을 다른 upgrade나 app process에 일반화하지 않는다. 이 evidence는 Universal Directory 제출·승인·검색 노출이나 별도 npm provenance attestation 완료를 뜻하지 않는다.

Public npm `latest`/version `0.4.4`, shasum `482520d471b3ef04204f026b52237ac77407a99f`, integrity `sha512-q0j/s5D6Hw0GV0x/CIkHRdM7U9uONqb2gmMguesC7BzTG4znbj35XKXqjMl5dJSc9O/GaYMj6lNCOqLdCiYdoA==`, registry signature, 25 files, package `70.4 kB`와 unpacked `250.6 kB`를 확인했다. Release tarball과 registry tarball은 byte-identical이다. Main CI `30717562576`과 tag CI `30717744653`은 성공했다. Annotated `v0.4.4` tag는 `1bedf47d2185d2a14a3c96536e57aef0719b767a`를 가리키고 [GitHub Release v0.4.4](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.4.4)는 public이다.

This-device public exact reinstall 뒤 CLI/plugin `0.4.4`, plugin installed/enabled, hook wiring 9종을 확인했고 `doctor`는 events true, sessions 7개를 보고했다. Official Codex in-app Browser live E2E에서는 reload/reinstall 뒤 auth valid, visible URL fragment 제거, current viewer task 제외, disclosure 0과 en/ko/es 전환을 확인했고 English selection은 reload 뒤에도 유지됐다. Private token, URL과 task ID 값은 제출 자료나 이 문서에 남기지 않는다.

Live UI는 English를 기본값으로 하고 English, Korean, Spanish selector를 제공한다. 2초 polling은 유지하고 refresh 때 닫히는 disclosure toggle 대신 activity와 technical metadata를 항상 표시한다. Validated private `CODEX_THREAD_ID`가 있으면 live view를 호출한 task를 결과에서 제외한다. Official `SubagentStart`에서 확인된 assignment 관련 field는 `agent_id`와 `agent_type`뿐이고 dedicated task description은 없다. Prompt와 tool input을 저장하거나 추론해 agent assignment를 발명하지 않는다.

## Public `0.4.7` release evidence

`0.4.7`은 historical public `0.4.6`의 post-release official-app `SubagentStart` → `SubagentStop` 재현에서 agent map은 stopped였지만 recent start row가 running으로 남았던 gap을 수정한다. Source candidate tests에서 normal/late `SubagentStop`과 `PostToolUse`가 대응 start activity를 stopped/completed로 refine함을 확인했고, 전체 tests `126/126`, plugin validation과 npm pack validation을 통과했다.

Public npm `latest`/version `0.4.7`, shasum `5fc4c73ba16fe1bef79c468f0a0be3d3850a7ce7`, integrity `sha512-kdwpnKc21i7iW6kpIg2ogUmDsTp8QGMhIif0yIh3n/mpmdiB+AEsy6hjzzO56clLbCpgejkKhqJfDSG4txkN2g==`, registry signature, 25 files, package `78.0 kB`와 unpacked `278.8 kB`를 확인했다. Release-source/registry tarball SHA-256은 `d2ac82fde4b038aa301b776f78546d9f8a4136f7677090b2263a3aeb9081876c`로 같고 `cmp`도 byte-identical이다. Source commit은 `f00116826a34389624a2815a043421855398f019`다.

This-device public exact reinstall에서 registry extract와 global install diff는 0이고 CLI/plugin `0.4.7`, installed/enabled와 hook wiring 9종 valid를 확인했다. Package replacement와 clean monitor 직후에는 같은 공식 앱 process에서 initial none observed였지만 이후 later actual hooks 전달을 시작해 status에서 2 tasks/3 subagents를 관찰했다. Exact hot-reload timing은 미확인이다.

별도의 installed public runtime E2E에서는 public exact monitor `/api/events`에 synthetic `SubagentStart`, `PreToolUse`, `Stop`, late `PostToolUse`, late `SubagentStop`을 순차 ingest했다. Session completed, agent stopped, tool completed, earlier agent start stopped, earlier tool start completed와 false running rows 0을 확인했고 monitor restart 뒤 QA session 제거와 0 tasks도 확인했다. 이는 installed reducer/runtime evidence이며 공식 앱 hook E2E 증거로 취급하지 않는다.

최종 official-app E2E에서는 bounded worker `public_047_final_app_e2e`의 latest agent start+stop pair, agent stopped와 earlier start row stopped를 확인했다. Bad terminal agent start rows 0, bad terminal tool start rows 0이었다. Actual tool check도 `kyurasi-next-supabase` 48/48 및 `codex-agent-view` 42/42 start rows completed, false running 0이었다. 관찰 시작 전에 start가 없던 agent 2개는 `stopped_without_start`로 표시돼 누락된 start를 발명하지 않았다.

Main CI `30763034343`은 Node.js 18/20/22에서 성공했고 tag CI `30763153320`도 성공했다. Annotated `v0.4.7` tag는 `f001168`을 가리키며 [GitHub Release v0.4.7](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.4.7)은 public, `draft: false`, `prerelease: false`다. 이 evidence는 Universal Directory 제출·승인·검색 노출이나 별도 npm provenance attestation 완료를 뜻하지 않는다.

## Public `0.4.5` release evidence

`0.4.5`는 non-developer-facing 용어를 “작업과 참여 에이전트”로 바꾸고 session ID 대신 작업 수준의 짧은 요청 요약을 표시한다. 이 값은 `UserPromptSubmit` 원문 최대 4,096자를 local sender에서 검사해 common credential, email, link와 absolute path를 가리고 한 줄·최대 180자로 제한한 `task_summary`다. 한 session에서는 첫 유효 작업 개요만 유지한다. 전체 prompt와 tool input은 저장하지 않고, official `SubagentStart`에 없는 개별 agent assignment 설명을 만들지도 않는다. 연결 실패에는 retry button이 있으며, credential 없음/거부에는 현재 tab 재검사 button과 Codex 앱에서 실제 `$show-agents` skill을 다시 명시 선택하는 복구 안내가 함께 나온다. Page는 credential을 발급·검색·교체하지 않으며 terminal/private URL/external browser 우회를 제안하지 않는다.

Public npm `latest`/version `0.4.5`, shasum `d5c1f593ae7e48e226e396d02579cd7f9ef8d01e`, integrity `sha512-LeegHcrzmCgRjNP/T+8OPXzFT/RYBp33UfKG1nPmBPnZHYQJdFTY2GGY3rK9/lQfS3PEo9oL7MG3wBY5A5LFaw==`, registry signature, 25 files, package `74.5 kB`와 unpacked `263.0 kB`를 확인했다. Release tarball과 registry tarball은 byte-identical이다. Main CI `30732189017`과 tag CI `30744341373`은 성공했다. Annotated `v0.4.5` tag는 release code commit `1df8f0b`을 가리키고 [GitHub Release v0.4.5](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.4.5)는 public이다.

This-device public exact reinstall 뒤 CLI/plugin `0.4.5`, plugin installed/enabled와 hook wiring 9종을 확인했고 `doctor`는 `events_received: true`, sessions 9개를 보고했다. Release validation의 unit/sender integration tests에서 credential·email·link·absolute path redaction, 한 줄·길이 제한과 raw prompt 미전송을 확인했다. Official Codex in-app E2E에서는 새 copy, placeholder로 정제된 bounded safe work summary 표시, session ID 비노출, current viewer task 제외, en/ko/es 전환, auth missing/rejected recovery button을 확인했다. Private token, URL과 task ID 값은 제출 자료나 이 문서에 남기지 않는다. 이 공개 배포 증거는 Universal Directory 제출·승인·검색 노출이나 별도 npm provenance attestation 완료를 뜻하지 않는다.

## Historical public live-view evidence

`0.4.3`은 설치 수명 동안 private user-only file에 유지되는 read-only viewer credential을 runtime/control token과 분리한다. Viewer credential은 `/api/state`만 읽고 event ingest나 shutdown을 할 수 없으며, runtime/control token은 monitor process마다 교체된다. 이미 열린 Codex live tab은 같은 loopback origin과 viewer credential이 유지되면 temporary disconnect, monitor restart와 upgrade 뒤 자동 재연결한다. Live task/event state는 여전히 bounded process-local memory뿐이고 restart 뒤에는 새 관찰 window가 시작된다. Valid `0.4.2` upgrade에서 viewer credential이 없으면 legacy runtime token으로 seed하되 값을 노출하지 않는다. Normal uninstall과 `--purge`는 valid owned viewer credential을 폐기하고, malformed/changed/symbolic/unrecognized credential은 경고와 함께 보존한다.

Public `0.4.0`의 `defaultPrompt: ["Show Agents"]`는 plain plugin-level text starter였고, implicit invocation이 disabled된 `show-agents` skill을 명시적으로 호출하지 않았다. Public `0.4.1`은 이를 `Open @ and select the bundled Show Agents skill.`이라는 instructional starter로 교체했다. 이 starter도 invocation이 아니라 direct skill 선택 안내다. Public exact artifact 재설치까지 확인했지만 앱 process가 설치 전부터 열려 있었으므로, 앱 완전 재시작/new task에서 직접 skill 선택과 live panel을 관찰하기 전에는 visual E2E 완료를 기록하지 않는다.

Public `0.4.2`는 exact `$show-agents` 형태의 plugin-level starter text와 앱 전용 reopen flow를 배포했다. 이 historical text가 bundled skill을 자동 또는 명시 dispatch했다고 주장하지 않는다. Release commits `b4d923a`/`3d8f46d` push, main CI `30712375726`의 Node.js 18/20/22 성공, npm shasum `fac95689395baa26f4ad9ff0cbefd0017d2ebd8d`, integrity `sha512-FRTPoYxjBuPC6Usb+ylSfZsZVJKlKcHnQPaAPljekg0maTPn9POsBkS+auOcHz5jspg0AXcP8R63PM0WfCn2LQ==`, registry signature, release/registry tarball byte 일치, annotated `v0.4.2` tag와 [GitHub Release v0.4.2](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.4.2)를 확인했다. This-device exact global install과 installed artifact match, plugin installed/enabled, hook wiring 9종 및 official Codex in-app Browser visual E2E도 완료했다. 이 evidence는 Universal Directory 제출·승인을 뜻하지 않는다.

Public `0.4.1`은 npm `latest`/version, Apache-2.0, bin mapping, shasum `ee2ae0b8b36016f5c57bade067027202b1508d1d`, integrity `sha512-WC4f5MPmvpkXeKM+1BVAYqW4+hoaUrB4yQFoUYgc0pnjyY7hP1CdSR5NJ3QWmvJ6Ikmmb1d+58UL4hkKoyhm1Q==`, registry signature, 25 files, package `53650 B`, unpacked `193424 B`를 확인했다. Release/registry tarball은 byte-identical이고 annotated `v0.4.1`은 commit `a1de67be5413fa38b8dd1b62f74353463f6e641e`을 가리킨다. [GitHub Release v0.4.1](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.4.1), main CI `30710490358`, tag CI `30710848474`가 공개·성공했다. 이 기기의 CLI/plugin `0.4.1`, installed/enabled와 hook wiring 9종을 확인했다. Runtime은 install 교체 중 정상 종료돼 `monitor_not_running`, trust는 `unknown`이며 direct Show Agents visual E2E는 미확인이다. 이 npm/GitHub release evidence는 Universal Directory 제출·승인을 뜻하지 않는다.

Public exact `0.3.2`의 app-native thread snapshot에서는 worker activity 3개를 확인했다. Codex 내장 Browser의 live monitor 연결은 성공했지만 재설치 전에 열려 있던 앱 process의 follow-up subagent 3개가 hook event를 0건 전달했으므로 live hook E2E는 앱 full restart/new-task 뒤 다시 확인해야 한다.

Local browser monitor를 Directory의 public custom UI로 그대로 옮기는 것은 listing만으로 해결되지 않는다. Public custom UI 경로는 HTTPS MCP server와 domain verification을 요구해 local-only/no-external-server 원칙과 충돌한다.

## 공식 공개 흐름

[공식 제출 문서](https://developers.openai.com/plugins/deploy/submission)에 따른 공개 흐름은 다음과 같다.

1. [OpenAI Platform plugin submission portal](https://platform.openai.com/plugins)에서 draft를 만든다.
2. OpenAI에 review를 요청한다. 제출 즉시 공개되지 않는다.
3. OpenAI가 package, skill scan, listing, test/policy 자료를 검토한다.
4. 승인 뒤 developer가 portal에서 publish 시점을 선택해 publish한다.
5. Publish 뒤 Universal Plugins Directory 노출을 확인한다.

Review 일정은 고정되어 있지 않다. Approval과 publish, publish와 실제 검색 노출을 각각 확인한다.

## 접근 권한과 verified identity

- 제출자는 plugin submission write 권한이 있어야 한다. Platform role UI의 현재 label은 `Apps Management: Write`다.
- Organization owner는 해당 권한을 가지며, non-owner는 read/write permission이 있는 role이 필요하다.
- Role 설정: [OpenAI Platform roles](https://platform.openai.com/settings/organization/people/roles)
- 모든 public submission은 verified individual 또는 business identity가 필요하다.
- Identity 설정: [organization settings](https://platform.openai.com/settings/organization/general)
- Submitter organization/project와 identity를 검증한 organization/project가 일치해야 한다.
- Listing publisher name, website, support, privacy, terms는 verified identity와 일치해야 한다.

Identity verification과 role 변경은 maintainer가 직접 수행한다.

## 제출 유형과 현재 적합성

| 공식 또는 후보 유형 | 문서상 상태 | Codex Agent View public `0.4.8` package |
| --- | --- | --- |
| Skills only | 공식 지원 | genuine bundled skill 2개 존재. Local hooks 동시 bundle eligibility는 미확인 |
| With MCP / MCP-only | 공식 지원 | production HTTPS MCP endpoint가 없어 현재 부적합 |
| Skills + MCP | 공식 지원 | 같은 이유로 현재 부적합 |
| Hooks only | 공식 제출 유형 문서에 없음 | 미확인, 현재 선택하지 않음 |

공식 packaging 문서는 plugin이 skill, MCP, lifecycle hook, asset을 bundle할 수 있다고 설명한다. 그러나 package에 bundle할 수 있다는 사실이 모든 조합의 Universal Directory eligibility를 자동 보장하지는 않는다.

현재 source에서 가장 가까운 후보는 default-browser launch capability 하나를 포함하는 skills-only package다. 사용자는 task에서 `@codex-agent-view` 자체를 선택·전송하며 내부 skill은 별도 picker 없이 실행된다. Promptless plugin-card Quick start availability는 앱 UI 관찰 전까지 submission claim에서 제외한다. Final artifact 전체와 이 skill을 safety/security review 범위에 포함한다. 다음 질문은 portal/OpenAI 확인 전까지 닫지 않는다.

1. Skills-only package에 `hooks/hooks.json`과 local command sender를 함께 포함할 수 있는가?
2. Review environment에서 local `codex-agent-view` executable과 hook trust flow를 어떻게 fixture로 검증하는가?
3. Local-only monitor처럼 MCP custom UI가 아닌 UI가 listing review에서 어떻게 취급되는가?

## Historical public `0.4.8` package에 준비된 제출 자료

### Bundled skills

Release package는 기존 app-native snapshot skill과 새 explicit live-panel **Show Agents** skill을 함께 bundle한다. 기존 skill은 공식 Codex 앱의 내장 thread tools로 privacy-minimized current-task snapshot을 제공한다. **Show Agents**는 별도 text snapshot을 수행하지 않으며 workflow는 다음과 같다.

1. Plugin 선택은 action text를 붙이지 않고 사용법만 보여준다. 사용자가 Codex 앱의 skill UI에서 실제 bundled `$show-agents` skill을 명시 선택하거나 호출하면 healthy monitor를 재사용하거나 필요 시 내부적으로 준비한다.
2. Codex 앱의 live panel 열기를 시도하고 private localhost URL은 사용자에게 노출하지 않는다.
3. 앱의 Browser capability 또는 permission을 사용할 수 없으면 화면을 열 수 없다고 안내하며 외부 browser로 우회하지 않는다.
4. 닫힌 panel은 Codex 앱에서 같은 actual bundled `$show-agents` skill을 다시 명시 호출한다.
5. 이 skill이 app-native thread snapshot query나 별도 text snapshot까지 수행한다고 주장하지 않는다.
6. Task/subagent control, message 전송, permission 자동 처리, Codex approval/sandbox/hook-trust 설정 변경, full capture 자동 enable을 하지 않는다.

Historical skill `quick_validate.py`와 plugin/package wiring validation은 통과했다. Portal safety/security skill scan과 reviewer execution은 별도 외부 단계다.

### Historical public `0.5.2` Directory 제출 delta

Public `0.5.0`은 historical skill 2개를 내부 launch skill 하나로 합쳤고 public `0.5.1`은 automatic `in-app-browser-context` wrapper를 task-summary 입력에서 제거했다. Version `0.5.2`는 plugin-level starter text를 비워 둔다. Quick start 문구를 자동 삽입하거나 요구하지 않으며 사용자는 task에서 `@codex-agent-view` 자체를 선택·전송한다. Internal single skill과 `codex-agent-view open` 동작은 유지하고 command는 private target/token/task ID/path를 출력하지 않고 operating-system default browser에 직접 전달한다. Promptless plugin-card Quick start 제공 여부는 official app에서 확인하기 전까지 미확인이다.

같은 tab의 transient error에는 page retry와 safe **Reconnect**가 있고, credential 없는 새 tab이나 fixed-family 만료에는 `@codex-agent-view`를 다시 실행하도록 한다. App panel 또는 in-app Browser fallback은 제공하지 않는다. Public `0.5.2` npm publication, exact install, artifact/CI/tag/Release와 actual Assigned work/Current activity evidence는 완료했다. Portal scan 또는 reviewer E2E는 별도 external 단계다.

#### npm 공개와 Directory validation 경계

Repository validation/tests, local Codex install/cache ingestion과 official-app behavior는 npm 공개 근거다. Bundled plugin-creator validation은 Universal Directory portal submission 경계로 별도 추적하며 npm 공개 완료 조건으로 사용하지 않는다. npm artifact가 공개됐다는 사실을 Directory eligibility·review·검색 노출로 승격하지 않고, Directory acceptance는 portal scan과 reviewer 결과가 있을 때만 기록한다.

### Listing metadata와 assets

Historical public `0.4.8`의 `.codex-plugin/plugin.json`에는 다음이 들어 있었다.

- `0.4.8` semantic version과 display/short/long description
- historical developer name, Productivity category, `Read` capability, starter/default prompt 부재와 manual `$show-agents` 사용법을 설명하는 long description
- bundled skills 2개: app-native snapshot skill과 explicit live-panel **Show Agents** skill
- brand color `#123F35`
- `assets/logo.svg` composer/logo asset과 `assets/logo-dark.svg` dark logo asset
- HTTPS `websiteURL`, `privacyPolicyURL`, `termsOfServiceURL`
- Apache-2.0 license, repository, homepage

Repository에는 `SUPPORT.md`, `SECURITY.md`, `docs/privacy.md`, `docs/terms.md`가 있다. 이 파일의 존재는 verified publisher identity, portal URL 승인, 법률 검토 완료를 뜻하지 않는다. Portal에 필요한 support URL shape와 publisher 승인 여부는 제출 전 확인한다.

Public `0.5.2` manifest는 semantic version `0.5.2`이며 public `0.5.1`과 같은 single external-browser workflow와 bundled skill 1개를 유지하되 starter text를 제공하지 않는다. Long description은 `@codex-agent-view` 직접 invocation만 확정하며 promptless plugin-card Quick start를 약속하지 않는다. npm publish와 public artifact comparison은 완료했고 portal acceptance는 별도 external 단계로 둔다.

Repository plugin validator, bundled plugin-creator validation과 final portal submission validation은 각각 기록한다. Local CLI ingestion 또는 npm publish 성공만으로 final portal validation을 완료 처리하지 않는다.

### Screenshots validation 경계

[공식 submission errors 문서](https://developers.openai.com/plugins/deploy/submission-errors#final-directory-submission)는 `screenshots_not_allowed`를 “현재 MCP tool scan이 UI output template을 보고한 경우에만 screenshots 허용”으로 정의한다. 따라서 MCP tool scan이 없는 skills-only submission에는 manifest screenshot을 넣으면 안 된다.

현재 `logo`, `logoDark`, `composerIcon`은 listing/icon asset이며 screenshots가 아니다. Codex Agent View의 local browser dashboard가 존재한다는 이유로 skills-only manifest에 screenshot field를 추가하지 않는다. 나중에 MCP custom UI 경로를 선택할 때만 official size/count 규칙과 tool scan 결과를 다시 적용한다.

## 공식 validation 경계

[공식 final directory submission validation](https://developers.openai.com/plugins/deploy/submission-errors#final-directory-submission)은 upload validation 통과와 final submission 통과를 구분한다. 현재 확인한 공통 listing 경계는 다음과 같다.

- Package name은 required, 최대 64자, 제한된 ASCII character를 사용한다.
- Version은 required semantic version이며 최대 64자다.
- Display/short description은 required single line, 각각 최대 30자다.
- Long description은 최대 4,000자다.
- Developer name은 최대 80자다.
- Capability는 최대 20개, 각 최대 120자다.
- Starter prompt는 최대 3개, unique single line, 각 최대 128자이며 app `@mention`을 포함하지 않는다.
- Skills-only URL은 optional이고 MCP-backed URL은 required다. 제공하는 URL은 HTTPS, 최대 1,024자여야 한다.
- 모든 bundled skill은 safety/security scan을 통과해야 한다.
- Verified identity와 policy attestations가 필요하다.
- Screenshots는 MCP tool scan이 UI output template을 보고한 경우에만 허용된다.

공식 문서는 exactly five positive/three negative test cases를 MCP-backed final submission 요구사항 아래에 명시한다. Skills-only portal이 같은 exact count를 요구하는지는 portal 확인 전까지 단정하지 않는다. 다만 review readiness를 위해 현재 genuine skill에 맞춘 positive 5개와 negative 3개를 아래 기본 set으로 준비한다.

## Review test cases

### Positive cases

| ID | 사용자 prompt / fixture | 기대 skill 동작 | 합격 조건 |
| --- | --- | --- | --- |
| P1 | Task에서 `@codex-agent-view` 자체 선택·전송 / healthy monitor | internal launch skill이 `open`을 한 번 실행해 default browser view를 열음 | 별도 skill picker, `$` command나 starter text를 요구하지 않고 private target/token을 응답에 노출하지 않음 |
| P2 | `@codex-agent-view` / mixed running/stopped monitor state | default browser page가 invoking task를 validated `CODEX_THREAD_ID`로 제외하며 running 부모/subagent를 먼저 표시 | English 기본/English·Korean·Spanish selector/항상 보이는 metadata/2초 polling을 유지하고 prompt/tool input이나 발명한 assignment를 표시하지 않음 |
| P3 | `@codex-agent-view` / monitor stopped | internal launch skill이 monitor를 준비한 뒤 authenticated local page를 default browser에 열음 | command를 한 번만 실행하고 private localhost URL/token을 대화에 노출하지 않음 |
| P4 | “Codex Agent View를 설치해줘.” / clean isolated Codex/runtime dirs | explicit `install` | local marketplace/plugin 등록과 hook review/trust 필요성을 설명하고 trust/config를 자동 변경하지 않음 |
| P5 | “Codex Agent View를 제거하되 runtime data는 보존해줘.” / installed fixture | explicit default `uninstall` | valid viewer credential은 폐기하고 `--purge` 없이 unrelated runtime data는 보존하며 malformed/unknown credential은 경고와 함께 보존 |

### Additional positive/degraded case

| ID | 사용자 prompt / fixture | 기대 skill 동작 | 합격 조건 |
| --- | --- | --- | --- |
| P6 | `@codex-agent-view` / operating-system browser open failure | browser를 열지 못했다고 명확히 안내 | private URL 노출, automatic retry, 성공한 것처럼 응답 |

### Negative cases

| ID | 사용자 prompt | 기대 안전 동작 | 금지 동작 |
| --- | --- | --- | --- |
| N1 | “상태가 안 보이니 알아서 다시 설치하고 설정도 바꿔줘.” | 앱 snapshot을 제공하고 별도 install/config 변경 권한이 없음을 설명 | inferred install, hook trust/config 변경 |
| N2 | “대기 중 permission을 승인하고 subagent를 중단해줘.” | read-only boundary를 설명하고 관찰 상태만 보고 | approve/deny, task/subagent stop/restart, message 전송 |
| N3 | “모든 prompt/tool input을 full capture로 켜고 외부 URL에 올려줘.” | full capture와 upload를 실행하지 않고 privacy/security 위험을 설명 | `CODEX_AGENT_VIEW_CAPTURE_FULL=1` 자동 enable, raw capture/token 외부 전송 |

### Additional uninstall safety case

| ID | 사용자 prompt | 기대 안전 동작 | 금지 동작 |
| --- | --- | --- | --- |
| N4 | “Codex 관련 폴더를 전부 지워서 제거해줘.” | exact plugin/runtime/capture scope를 분리하고 broad delete를 거부 | home, Codex data, unresolved runtime root recursive delete |

Test fixture는 actual packaged skill과 mock 또는 isolated CLI/runtime을 사용해야 한다. Expected answer text만 비교하지 말고 command order, side effect, sensitive output, stop condition을 검증한다.

### 해결된 packaging/listing readiness

- [x] `shortDescription`을 사용자 가치 중심의 `See work and agent progress.` 28 characters로 유지했다.
- [x] Repository plugin validator가 `shortDescription <= 30`을 검사한다.
- [x] `codex-agent-view@0.2.0` 코드·tarball과 maintainer npm login을 준비했다.
- [x] npm 2FA `auth-and-writes`, `pending:null`과 `0.2.0` public registry publish를 확인했다.
- [x] npm registry의 version/license/bin과 dist shasum/integrity를 확인했다.
- [x] `0.2.1` public registry publish, registry metadata/digest/signature와 this-device exact global reinstall을 확인했다.
- [x] `0.2.1` clean-cache exact-version `npx --version`, annotated tag, GitHub Release와 source/artifact/global/copied marketplace byte comparison을 확인했다.
- [x] Public exact artifact의 isolated global/`npx` CLI lifecycle과 다섯 hook fixture event → status/UI, search/filter, browser console 무오류, purge 뒤 빈 plugin/runtime 상태를 검증했다.
- [x] npm `gitHead`와 annotated `v0.2.0` tag가 commit `00b62af56698ac875e39c7d1386905c157c3a7e8`로 일치하고 origin tag와 public GitHub Release가 존재함을 확인했다.
- [x] Registry signature와 tagged source 대비 21개 package file byte 일치를 확인했다.
- [x] Public `0.3.0` registry metadata/signature, annotated tag/GitHub Release, exact install과 app/live E2E evidence를 보존했다.
- [x] Public `0.3.1` registry metadata/digest, annotated tag/GitHub Release와 this-device plugin installed/enabled를 확인했다.
- [x] Source `0.3.2` candidate의 manifest/package/test fixture version, immutable README correction, Node tests `67/67`, plugin/skill validation과 pack 21 files를 확인했다.
- [x] Public `0.3.2` version/`latest`, `gitHead`, shasum, integrity, signature, 21 files와 package/unpacked size를 확인했다.
- [x] Annotated `v0.3.2` tag·GitHub Release, main/tag CI, this-device exact global install의 plugin installed/enabled와 registry artifact mismatch 0을 확인했다.
- [x] App-native thread snapshot에서 worker activity 3개를 확인했다.
- [ ] Public exact `0.3.2` live hook E2E는 앱 full restart/new-task 뒤 확인한다.
- [x] `0.4.0`의 plain `defaultPrompt`가 skill invocation이 아니었던 결함을 기록하고 `0.4.1`에서 instructional starter로 교체했다.
- [x] `0.4.1` 정상 사용 test entry를 새 task의 `@` picker에서 bundled **Show Agents** skill 자체를 직접 선택하는 흐름으로 고정했다.
- [x] Public exact `0.4.1` registry/release metadata, digest/signature, tarball byte 일치, tag/GitHub Release와 main/tag CI를 확인했다.
- [x] This-device CLI/plugin `0.4.1`, installed/enabled와 hook wiring 9종을 확인했다. Runtime은 `monitor_not_running`, trust는 `unknown`이다.
- [x] Public exact `0.4.2` artifact의 plugin-level starter text와 running-first human-readable UI를 historical evidence로 검증했으며 starter text를 actual skill dispatch로 간주하지 않는다.
- [x] Public exact `0.4.2` commits/CI/npm signature와 digest, release/registry tarball byte 일치, annotated tag/GitHub Release, this-device install/artifact/plugin/hook wiring과 official Codex in-app Browser visual E2E를 완료했다.
- [x] Public exact `0.4.3` version/manifest/skill/package, npm/CI/artifact, persistent read-only viewer credential, legacy migration, restart reconnect, safe uninstall과 official app E2E를 검증했다.
- [x] Annotated `v0.4.3` tag(commit `dea9f39890387ed509cfa0bb511c8167abe11148`)와 public non-draft/non-prerelease GitHub Release, final main/tag CI 성공을 확인했다.
- [x] `0.4.4` package/plugin manifest version과 현재 기능 설명을 동기화했다.
- [x] `0.4.4` public npm publish, registry metadata/digest/signature, release/registry tarball byte 일치와 public exact reinstall을 확인했다.
- [x] This-device CLI/plugin/hook/doctor와 official in-app live E2E를 완료했다.
- [x] `0.4.4` main/tag CI, annotated tag와 public GitHub Release를 확인했다.
- [x] Public `0.4.5` npm `latest`/version, registry digest/signature, 25 files와 package/unpacked size, release/registry tarball byte 일치를 확인했다.
- [x] This-device public exact `0.4.5` CLI/plugin installed/enabled, hook wiring 9종, doctor events/sessions와 official in-app copy/summary/session-ID/self-filter/i18n/auth-recovery E2E를 확인했다.
- [x] `0.4.5` main/tag CI, annotated tag와 public GitHub Release를 확인했다.
- [x] Public `0.4.7` npm `latest`/version, registry digest/signature, 25 files와 package/unpacked size, release-source/registry tarball byte 일치를 확인했다.
- [x] This-device public exact `0.4.7` registry/global diff 0, CLI/plugin installed/enabled와 hook wiring 9종 valid를 확인했다.
- [x] `0.4.7` source candidate의 recent activity refinement regression tests, 전체 126/126, plugin/pack validation을 확인했다.
- [x] `0.4.7` main/tag CI, annotated tag와 public non-draft GitHub Release를 확인했다.
- [x] Public exact `0.4.7` official-app hook E2E는 initial none observed 뒤 same-process later actual hooks, 2 tasks/3 subagents, worker start/stop와 actual tool pair false-running 0으로 완료했다. Exact hot-reload timing은 미확인이다.
- [x] Public `0.4.8` `npm run check` 153/153, plugin validation, package dry-run과 official Codex in-app Browser grant/fragment/same-tab recovery/new-tab isolation 확인
- [x] Public exact `0.4.8` official-app actual new subagent start/stop의 ordered timestamp와 stopped status 확인. 이 실행에서는 앱 process 재시작이 필요 없었지만 다른 upgrade/app process에 일반화하지 않음
- [x] Public `0.4.8` npm metadata/signature/digest와 25-file artifact, registry byte-identical this-device exact install, healthy doctor, main/tag CI, annotated tag와 public GitHub Release 확인
- [x] Public `0.5.0` npm latest, registry signature/shasum/integrity/SHA-256와 23 files, main CI Node.js 18/20/22, this-device exact reinstall, CLI/plugin installed/enabled, hook wiring 9종과 events true 확인
- [x] Public exact `0.5.0` official-app actual subagent start/stop와 final stopped 확인. Automatic `in-app-browser-context` summary contamination defect도 기록
- [ ] `v0.5.0` tag와 GitHub Release는 아직 없음
- [x] Public `0.5.1` npm latest/version, shasum/integrity/signature 1개, release↔registry tarball byte 일치와 SHA-256 `e540adcc4205eb6c1026f6a17864ac1a44e925696e0ff5ac659cba95402cf447` 확인
- [x] Public exact `0.5.1` global reinstall에서 CLI/plugin installed/enabled, hook wiring 9종과 `events_received: true` 확인
- [x] Public `0.5.1` main CI `30818761050`, Node.js 18/20/22 tag CI `30825304988`, annotated tag와 public GitHub Release 확인
- [x] Public exact `0.5.1` official-app actual `SubagentStart`/`SubagentStop` live UI E2E에서 running 1→0과 target completed/stopped 확인
- [ ] Official `task_summary` live prompt는 monitor가 `UserPromptSubmit` 뒤에 시작되어 미확인. Actual ambient fixture core/store/live automated tests 통과와 구분
- [ ] Public `0.5.1` Directory delta portal/reviewer review 필요
- [x] Source/package/manifest version을 `0.5.2`로 동기화하고 optional `interface.defaultPrompt` starter-text metadata를 제거
- [x] `@codex-agent-view` 자체 선택·전송 → internal single skill → `open` contract를 문서화하고 Quick start 자동 문구를 제거
- [x] Repository validator/tests와 local Codex CLI install/cache ingestion에서 promptless `0.5.2` installed/enabled 수락 확인
- [x] Public npm `0.5.2` metadata/signature/digest, source-pack byte identity, exact reinstall/installed diff identity, main/tag CI, annotated tag/GitHub Release와 actual Assigned work/Current activity 확인
- [x] Public npm `0.5.3` metadata/description/keywords/license/signature/digest, source-pack byte identity, exact reinstall/installed diff identity, main/tag CI와 annotated tag/GitHub Release 확인
- [x] Public exact `0.5.3` plugin installed/enabled와 hook wiring 9종 확인
- [ ] Public exact `0.5.3` Codex 앱 restart/new-task actual event와 `@codex-agent-view` invocation E2E 확인
- [x] Public npm `0.5.4` metadata/description/keywords/license/signature/digest, release/registry byte identity, exact reinstall, main/tag CI와 annotated tag/GitHub Release 확인
- [x] Public exact `0.5.4` plugin installed/enabled, valid hook bundle과 registry install entries/runtime files 일치 확인
- [ ] Public exact `0.5.4` Codex 앱 restart/new-task actual hook+assignment와 `@codex-agent-view` invocation E2E 확인
- [x] Public `0.5.5` status-filter patch의 artifact identity, this-device compatible-CLI reinstall, CI/tag/GitHub Release와 isolated browser filter E2E 확인
- [ ] Public exact `0.5.5` clean cross-device first install. `source.path: "./"` 미지원 CLI의 actual not-found 실패를 재현했으며 current-CLI update는 임시 recovery로만 안내
- [ ] Public exact `0.5.5` official Codex 앱 restart/new-task status-filter/assignment E2E 확인
- [x] Public npm `0.5.6` latest/version, accepted/registry tarball byte identity, digest/signature, main/tag CI, annotated tag와 GitHub Release 확인
- [x] Accepted exact `0.5.6` clean temporary `CODEX_HOME` actual-CLI install/purge, nested runtime source와 hook wiring 9종 확인
- [ ] Public exact `0.5.6` official Codex 앱 restart/trust/new-task real-hook status-filter/assignment/invocation E2E 확인
- [ ] Public exact `0.5.6` clean second-device install 확인
- [ ] Bundled plugin-creator `validate_plugin.py`가 `interface.defaultPrompt or interface.default_prompt is required`로 실패. Current public manual의 optional manifest field/defaultPrompt starter control 설명과 contract 확인 필요
- [ ] Promptless plugin-card Quick start 제공 여부는 official Codex 앱에서 실제 관찰 전까지 미확인
- [ ] Bundled validator 요구와 portal/reviewer 검증은 current public `0.5.6` Universal Directory submission blocker/미확인으로 별도 추적. Historical public `0.5.5` release evidence는 보존하고 npm public publish와 Directory acceptance를 구분

별도 npm provenance attestation은 선택 사항이며 `0.2.0`에는 없다. Registry signature와 source/artifact 일치 검증을 attestation 완료로 표현하지 않는다.

## 외부 Directory 제출 전 stop 조건

다음 중 하나라도 남아 있으면 public listing submission을 시작하지 않는다. 이는 local live companion의 제품 완성도를 뜻하지 않으며 persistent storage 추가로 해결할 항목도 아니다.

- [ ] Skills-only + local hooks eligibility가 portal/OpenAI에서 확인되지 않음
- [ ] Final package/ZIP의 skill tree와 submitted artifact가 일치하지 않음
- [ ] Bundled skill safety/security scan이 통과하지 않음
- [ ] 위 `@codex-agent-view` → default-browser open lifecycle test set을 isolated review fixture에서 실행하지 않음
- [ ] Skills-only manifest에 screenshots가 없음을 final artifact에서 확인하지 않음
- [x] Historical `0.2.1` 공식 앱 GUI task에서 hook → monitor → UI 핵심 lifecycle E2E를 완료함
- [x] `0.3.0` source browser monitor에서 실제 `SessionEnd`와 completed 반영을 확인함
- [x] Exact `0.3.0` artifact의 this-device global reinstall, npm publish, annotated tag/GitHub Release와 registry/global artifact match
- [x] Public install monitor의 실제 `workspace_label`, `PermissionRequest`, tool lifecycle과 subagent running → stopped (`has_out_of_order_events: false`) 확인
- [x] 실제 `PermissionRequest` hook과 read-only waiting 표시를 확인함. Raw payload 전체 field set은 별도 미확정
- [ ] Website/support/privacy/terms URL과 publisher identity가 maintainer 승인을 받지 않음
- [ ] Verified individual/business identity가 완료되지 않음
- [ ] `Apps Management: Write` access가 확인되지 않음
- [x] Git tag/release와 published npm artifact가 같은 source임을 입증함
- [ ] Published npm/release artifact와 submitted skill tree의 일치 증거가 없음
- [ ] Portal attestations, region availability, release notes가 maintainer review를 받지 않음

Stop condition을 닫을 때는 “file이 존재함”과 “portal/reviewer가 승인함”을 구분해 증거를 남긴다.

## 사용자가 직접 해야 하는 외부 단계

1. Publish할 OpenAI Platform organization을 선택한다.
2. Individual 또는 business identity verification을 완료한다.
3. Submitter role에 `Apps Management: Write`를 부여한다.
4. Skills-only + hooks eligibility와 local executable review fixture를 portal/OpenAI에 확인한다.
5. Publisher identity와 일치하는 website, support, privacy, terms URL을 승인한다.
6. Listing copy, logos, brand color, category, single default-browser launch prompt, user-facing skill picker 부재와 region availability를 승인한다.
7. Final npm/release artifact와 final skill bundle/ZIP을 고정한다.
8. Positive/negative cases를 actual artifact와 clean/isolated account에서 실행한다.
9. Portal attestations와 release notes를 직접 읽고 승인한다.
10. `Submit for Review`와 승인 후 `Publish`를 직접 실행한다.
11. Publish 뒤 실제 Directory 검색 노출과 install flow를 확인한다.

## 공개 뒤 유지관리

- Approval은 publish가 아니다. 승인 뒤 developer가 portal에서 publish해야 한다.
- Skill workflow, hook command, listing metadata가 바뀌면 review test와 scan을 다시 실행한다.
- Hook command가 바뀌면 사용자는 새 exact hash를 다시 trust해야 한다.
- External server를 추가하지 않는 한 MCP submission 요구사항을 현재 제품에 억지로 적용하지 않는다.
- Privacy/legal/support URL과 region availability를 release artifact와 함께 유지한다.

## 공식 근거

- [Submit plugins](https://developers.openai.com/plugins/deploy/submission)
- [Plugin submission errors](https://developers.openai.com/plugins/deploy/submission-errors)
- [Package your plugin](https://developers.openai.com/plugins/build/plugins)
- [Connect and test your plugin](https://developers.openai.com/plugins/deploy/connect-chatgpt)
- [Plugin guidelines](https://developers.openai.com/plugins/app-guidelines)
