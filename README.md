# Codex Agent View

Codex Agent View는 공식 Codex 앱의 부모 task와 subagent 활동을 보여주기 위한 가벼운 read-only companion monitor 프로젝트다. Codex를 대체하지 않고 공식 앱의 관찰 가능성을 보강하는 것이 목표다.

> 이 프로젝트는 비공식 커뮤니티 프로젝트이며 OpenAI의 공식 제품이나 공식 지원 프로젝트가 아니다.

## 한국어 사용법

### 현재 상태와 주의사항

> 이 저장소는 **Phase 0 기술 검증용 PoC**다. npm 배포 또는 일상 사용을 위한 안정 버전이 아니며, 완성형 monitor UI도 아직 없다.

현재 확인된 범위는 다음과 같다.

- Homebrew Codex CLI와 공식 앱에 포함된 embedded Codex CLI에서 plugin 설치와 hook runtime을 확인했다.
- 실제 subagent 실행에서 `SubagentStart`, `SubagentStop`, `PreToolUse`, `PostToolUse`를 캡처했다.
- 새 공식 앱 GUI task에서의 최종 E2E는 아직 완료하지 못했다.
- `PermissionRequest`는 공식 문서상 지원되지만 실제 payload는 아직 캡처하지 못했다.
- 현재 task에 plugin을 뒤늦게 추가해도 hot-load된다고 가정하지 않는다. plugin을 활성화한 뒤 새 task를 시작한다.

Phase 0에는 SQLite, 외부 서버, 외부 telemetry, task 제어 기능이 없다. JSONL 캡처는 payload 구조 검증용이며 production state store가 아니다. 자세한 근거와 blocker는 [Phase 0 기술 검증 결과](https://github.com/JunhoYoon95/codex-agent-view/blob/main/docs/phase-0-findings.md)를 참고한다.

### 요구사항과 검증한 버전

- Node.js `>=18` — `package.json`의 engine requirement
- npm
- Git — source clone에 필요
- plugin을 지원하는 공식 Codex 앱 또는 Codex CLI

검증한 Codex 버전은 지원 하한이 아니라 현재 테스트 범위다.

| Runtime | 검증 버전 |
| --- | --- |
| 공식 Codex 앱 | `26.727.40816` (`build 6067`) |
| 앱 embedded Codex | `0.146.0-alpha.9.2` |
| Homebrew Codex CLI | `0.146.0` |

다른 버전은 별도 검증이 필요하다.

### Source clone과 프로젝트 검증

```bash
git clone https://github.com/JunhoYoon95/codex-agent-view.git
cd codex-agent-view
```

Phase 0 runtime은 Node.js built-in module만 사용하므로 production dependency 설치가 필요하지 않다. 다음 명령은 현재 `package.json`과 일치한다.

```bash
npm test
npm run validate:plugin
npm run check
```

- `npm test`: 캡처, redaction, 경로 처리 테스트
- `npm run validate:plugin`: 저장소 내부의 최소 plugin scaffold validation
- `npm run check`: 테스트, 내부 validation, `npm pack --dry-run` 실행

내부 validation 통과만으로 공식 앱 GUI 호환성을 주장하지 않는다.

### GitHub marketplace에서 설치

이 저장소에는 `.agents/plugins/marketplace.json`이 포함되어 있다. 다음 명령으로 GitHub marketplace를 등록하고 plugin을 명시적으로 설치한다.

```bash
codex plugin marketplace add JunhoYoon95/codex-agent-view --ref main
codex plugin marketplace list
codex plugin list --marketplace codex-agent-view --available --json
codex plugin add codex-agent-view@codex-agent-view
codex plugin list
```

설치 전에 `--available --json` 결과에 `codex-agent-view`가 표시되는지 확인한다. 이 저장소 자체의 marketplace catalog는 plugin이 repository root에 있으므로 `source.path`로 `./`을 사용한다.

설치 후 공식 앱을 완전히 종료했다가 다시 시작한다. Codex의 **Plugins** Directory 또는 CLI의 `/plugins`에서 `codex-agent-view`가 설치·활성화됐는지 확인하고 새 task를 만든다.

source를 수정하며 테스트하려면 별도 local marketplace root 아래 `plugins/codex-agent-view`로 clone하고, marketplace root의 `.agents/plugins/marketplace.json`에서 `./plugins/codex-agent-view`를 가리킨다. 이 경로는 repository 자체 catalog의 `./`과 다른 **별도 로컬 개발 marketplace 예시**다. 그 뒤 JSON 파일이 아니라 marketplace root 디렉터리를 등록한다.

```bash
codex plugin marketplace add /absolute/path/to/local-marketplace
codex plugin add codex-agent-view@codex-agent-view-local
```

Local marketplace installer는 npm의 `files` allowlist가 아니라 marketplace가 가리키는 plugin directory를 설치 대상으로 사용한다. Phase 0 source 설치에는 문서와 테스트 파일도 함께 복사될 수 있다. 배포용 npm package 경계와 marketplace 경계를 일치시키는 작업은 다음 Phase 과제다.

이 package에는 `postinstall` script가 없으며, npm lifecycle에서 Codex 설정을 자동 변경하지 않는다. marketplace 등록, plugin 설치, 활성화, hook trust는 모두 사용자가 명시적으로 수행한다.

### Plugin 활성화, hook trust, event 발생

1. Plugins Directory 또는 CLI의 `/plugins`에서 plugin이 설치되고 활성화됐는지 확인한다.
2. CLI TUI를 실행하고 composer에 `/hooks`를 입력한다. `codex /hooks`라는 shell command가 아니다.
3. `hooks/hooks.json`의 source와 `node "${PLUGIN_ROOT}/scripts/capture-hook.mjs"` command를 확인한 뒤 현재 definition의 exact hash를 명시적으로 trust한다.
4. 공식 앱을 완전히 재시작하고 **새 task**를 시작한다. GUI 전용 hook-trust 화면은 이번 Phase 0에서 확인되지 않았다.
5. subagent를 한 개 시작하고 정상 종료시킨다.
6. shell 또는 지원되는 로컬 tool을 실행해 `PreToolUse`와 `PostToolUse`를 발생시킨다.
7. `PermissionRequest`를 검증하려면 실제 approval prompt가 필요한 동작을 사용자가 검토하고 승인 또는 거절한다. 단순히 tool을 실행하는 것만으로는 이 event가 발생하지 않을 수 있다.

hook command가 바뀌면 hash도 바뀌며, 기존 trust가 재사용되지 않는다. 새 definition을 다시 검토해야 한다. trust를 우회하는 옵션은 일반 설치·사용 절차에 사용하지 않는다.

### 캡처 위치와 redaction

기본 파일명은 `events.jsonl`이다.

| 실행 방식 | 캡처 위치 |
| --- | --- |
| 설치된 plugin | `PLUGIN_DATA/captures/events.jsonl` |
| standalone script | `<cwd>/.codex-agent-view/captures/events.jsonl` |
| 명시적 override | `CODEX_AGENT_VIEW_CAPTURE_DIR/events.jsonl` |

`PLUGIN_DATA`는 Codex가 설치된 plugin에 제공하는 writable data directory다. 실제 절대경로를 하드코딩하지 않는다.

기본 redaction은 lifecycle 표시에 필요한 allowlisted metadata만 값으로 보존한다. prompt, transcript path, tool input/output, assistant message 같은 나머지 값은 type, key 목록, 길이 같은 요약으로 바뀐다. 캡처에는 여전히 session ID, agent ID, working directory 같은 로컬 metadata가 포함될 수 있으므로 공유하거나 commit하지 않는다.

`CODEX_AGENT_VIEW_CAPTURE_FULL=1`은 redaction을 끄고 원본 payload를 기록한다. secret, prompt, tool input/output이 포함될 수 있으므로 일반 사용에서는 설정하지 않는다. 격리된 폐기용 검증 환경에서도 필요성과 정리 계획을 먼저 확인한다.

### 제거와 복구

제거 전 캡처가 필요하면 먼저 위치와 내용을 검토해 별도로 보관한다. 이 README는 자동 삭제 command를 제공하지 않는다.

1. CLI에서 plugin을 제거하거나 공식 앱의 Plugins Directory에서 disable 후 uninstall한다.

   ```bash
   codex plugin remove codex-agent-view@codex-agent-view
   ```

2. hook 검토 화면에서 해당 plugin source가 더 이상 활성 상태가 아닌지 확인한다. CLI에서는 `/hooks`로 확인한다.
3. local marketplace까지 제거하려면 등록된 이름을 먼저 확인한 뒤 제거한다.

   ```bash
   codex plugin marketplace list
   codex plugin marketplace remove codex-agent-view
   ```

4. 사용자가 원할 때 설치형의 `PLUGIN_DATA/captures`와 standalone의 `<cwd>/.codex-agent-view/captures`를 각각 검토하고 정리한다. 위치를 확인하지 않은 채 넓은 디렉터리를 삭제하지 않는다.
5. 공식 앱을 재시작하고 새 task에서 plugin과 hook source가 사라졌는지 확인한다.

`plugin remove` 또는 GUI uninstall은 설치 bundle을 제거해도 `PLUGIN_DATA`의 캡처를 보존할 수 있다. marketplace 제거도 등록만 해제하며 사용자가 소유한 source checkout이나 local marketplace directory를 자동 삭제하지 않는다.

복구하려면 marketplace를 다시 등록하고 Plugins Directory에서 plugin을 재설치·활성화한 뒤 새 task에서 새 hook hash를 검토하고 trust한다. 삭제한 캡처는 별도 backup이 없으면 복구 대상으로 간주하지 않는다.

### Troubleshooting

#### Plugin이 Plugins Directory에 보이지 않음

- GitHub repository marketplace라면 `.agents/plugins/marketplace.json`의 `source.path`가 repository root의 plugin을 가리키는 `./`인지 확인한다.
- 별도 로컬 개발 marketplace라면 catalog가 marketplace root의 `.agents/plugins/` 아래에 있고, `source.path`가 `./plugins/codex-agent-view`인지 확인한다.
- `codex plugin marketplace list`에서 source 이름과 해석된 root를 확인한다.
- 설치 전 `codex plugin list --marketplace codex-agent-view --available --json`에서 plugin이 조회되는지 확인한다.
- 공식 앱을 재시작한다.

#### Plugin은 보이지만 캡처가 없음

- plugin이 설치만 된 것이 아니라 활성화됐는지 확인한다.
- plugin 활성화 후 생성한 새 task인지 확인한다.
- hook 검토 화면에서 command, source, exact-hash trust 상태를 확인한다.
- Node.js가 `>=18`이고 hook process에서 실행 가능한지 확인한다.
- 설치형에서는 `PLUGIN_DATA/captures/events.jsonl`, standalone에서는 `<cwd>/.codex-agent-view/captures/events.jsonl`을 확인한다.
- 현재 GUI task의 무캡처만으로 GUI hook 미지원 또는 hot-load 불가라고 결론내리지 않는다.

#### Hook 변경 후 실행되지 않음

hook definition이 바뀌면 기존 trust hash는 유효하지 않다. 새 task를 시작하고 hook command를 다시 검토·trust한다.

#### `PermissionRequest`가 보이지 않음

이 event는 Codex가 실제 approval을 요청하려는 시점에만 발생한다. approval이 필요 없는 command에서는 나타나지 않는다. 현재 Phase 0에서는 GUI `PermissionRequest` payload 캡처가 미완료다.

### 프로젝트 문서

- [ROADMAP.md](https://github.com/JunhoYoon95/codex-agent-view/blob/main/ROADMAP.md): 단계별 범위와 완료 기준
- [AGENTS.md](https://github.com/JunhoYoon95/codex-agent-view/blob/main/AGENTS.md): 프로젝트 작업 규칙
- [docs/phase-0-findings.md](https://github.com/JunhoYoon95/codex-agent-view/blob/main/docs/phase-0-findings.md): 실제 검증 결과와 다음 아키텍처

### 라이선스

Copyright 2026 Junho Yoon

이 프로젝트는 Apache License, Version 2.0에 따라 배포됩니다. 전체 조건은 [LICENSE](https://github.com/JunhoYoon95/codex-agent-view/blob/main/LICENSE)와 [NOTICE](https://github.com/JunhoYoon95/codex-agent-view/blob/main/NOTICE)를 참조하세요.

## English Usage

> This is an unofficial community project. It is not an official OpenAI product or an officially supported OpenAI project.

### Current status and warning

> This repository is a **Phase 0 technical-validation PoC**. It is not a stable npm release or a finished monitor UI.

The verified scope is limited to the following:

- Plugin installation and hook runtime were verified with the Homebrew Codex CLI and the Codex CLI embedded in the official app.
- Real subagent runs produced `SubagentStart`, `SubagentStop`, `PreToolUse`, and `PostToolUse` captures.
- The final end-to-end check in a new official Codex GUI task is not complete.
- `PermissionRequest` is documented as supported, but its real payload has not been captured yet.
- Do not assume that adding a plugin to an already-open task hot-loads it. Enable the plugin, then start a new task.

Phase 0 does not include SQLite, an external server, external telemetry, or task controls. JSONL capture exists only to inspect payload structure; it is not a production state store. See [Phase 0 findings](https://github.com/JunhoYoon95/codex-agent-view/blob/main/docs/phase-0-findings.md) for the evidence and exact blockers.

### Requirements and tested versions

- Node.js `>=18`, as required by `package.json`
- npm
- Git for cloning the source
- An official Codex app or Codex CLI build with plugin support

The following versions define the current test matrix, not a minimum support guarantee.

| Runtime | Tested version |
| --- | --- |
| Official Codex app | `26.727.40816` (`build 6067`) |
| App-embedded Codex | `0.146.0-alpha.9.2` |
| Homebrew Codex CLI | `0.146.0` |

Other versions require separate verification.

### Clone and validate the source

```bash
git clone https://github.com/JunhoYoon95/codex-agent-view.git
cd codex-agent-view
```

The Phase 0 runtime uses only Node.js built-in modules, so it has no production dependencies to install. These commands match the current `package.json`:

```bash
npm test
npm run validate:plugin
npm run check
```

- `npm test`: tests capture, redaction, and path handling
- `npm run validate:plugin`: runs the repository's minimal plugin-scaffold validator
- `npm run check`: runs tests, internal validation, and `npm pack --dry-run`

Passing the internal validator alone does not prove compatibility with the official Codex GUI.

### Install from the GitHub marketplace

This repository includes `.agents/plugins/marketplace.json`. Register the GitHub marketplace and explicitly install the plugin:

```bash
codex plugin marketplace add JunhoYoon95/codex-agent-view --ref main
codex plugin marketplace list
codex plugin list --marketplace codex-agent-view --available --json
codex plugin add codex-agent-view@codex-agent-view
codex plugin list
```

Before installing, confirm that the `--available --json` output includes `codex-agent-view`. The marketplace catalog in this repository uses `source.path: "./"` because the plugin is at the repository root.

Quit and restart the official app after installation. Confirm that `codex-agent-view` is installed and enabled in the Codex **Plugins** Directory or the CLI `/plugins` browser, then create a new task.

For source-editing tests, clone the repository as `plugins/codex-agent-view` under a separate local marketplace root. Point that root's `.agents/plugins/marketplace.json` at `./plugins/codex-agent-view`. This is a **separate local development marketplace example**, distinct from the repository catalog's `./`. Then register the marketplace root directory—not the JSON file.

```bash
codex plugin marketplace add /absolute/path/to/local-marketplace
codex plugin add codex-agent-view@codex-agent-view-local
```

The local marketplace installer uses the plugin directory referenced by the marketplace, not npm's `files` allowlist. A Phase 0 source installation may therefore copy documentation and tests too. Aligning the npm-package boundary with the marketplace boundary is deferred to the next phase.

This package has no `postinstall` script and does not change Codex settings during an npm lifecycle. Marketplace registration, installation, enablement, and hook trust are all explicit user actions.

### Enable the plugin, trust hooks, and produce events

1. Confirm that the plugin is installed and enabled in the Plugins Directory or the CLI `/plugins` browser.
2. Start the CLI TUI and enter `/hooks` in the composer. It is not a `codex /hooks` shell command.
3. Inspect the source from `hooks/hooks.json` and the `node "${PLUGIN_ROOT}/scripts/capture-hook.mjs"` command, then explicitly trust the exact hash of the current definition.
4. Quit and restart the official app, then start a **new task**. A GUI-only hook-trust surface was not verified in Phase 0.
5. Start one subagent and let it finish normally.
6. Run a shell command or another supported local tool to produce `PreToolUse` and `PostToolUse`.
7. To test `PermissionRequest`, review and approve or deny an operation that genuinely requires an approval prompt. Running an ordinary tool may not produce this event.

Changing a hook command changes its hash, so the previous trust decision no longer applies. Review the new definition again. Do not use trust-bypass options for normal installation or use.

### Capture paths and redaction

The default filename is `events.jsonl`.

| Execution mode | Capture path |
| --- | --- |
| Installed plugin | `PLUGIN_DATA/captures/events.jsonl` |
| Standalone script | `<cwd>/.codex-agent-view/captures/events.jsonl` |
| Explicit override | `CODEX_AGENT_VIEW_CAPTURE_DIR/events.jsonl` |

`PLUGIN_DATA` is the writable data directory supplied by Codex to an installed plugin. Do not hard-code its absolute value.

Default redaction preserves values only for allowlisted lifecycle metadata. Other values—including prompts, transcript paths, tool inputs and outputs, and assistant messages—are replaced with summaries such as their type, keys, or length. Captures can still include local metadata such as session IDs, agent IDs, and the working directory, so do not share or commit them.

`CODEX_AGENT_VIEW_CAPTURE_FULL=1` disables redaction and writes the original payload. It can contain secrets, prompts, and tool inputs or outputs. Do not set it for normal use. Even in an isolated disposable environment, decide why it is necessary and how it will be cleaned up first.

### Removal and recovery

If a capture must be retained, inspect and back it up before removal. This README intentionally does not provide a raw deletion command.

1. Remove the plugin with the CLI, or disable and uninstall it in the official app's Plugins Directory.

   ```bash
   codex plugin remove codex-agent-view@codex-agent-view
   ```

2. Confirm that the plugin hook source is no longer active in the hook review surface. Use `/hooks` in the CLI.
3. If the local marketplace should also be removed, inspect its registered name before removing it.

   ```bash
   codex plugin marketplace list
   codex plugin marketplace remove codex-agent-view
   ```

4. If desired, inspect and clean up installed-plugin captures under `PLUGIN_DATA/captures` and standalone captures under `<cwd>/.codex-agent-view/captures` separately. Never delete a broad directory without resolving the exact target first.
5. Restart the official app and verify in a new task that the plugin and hook source are gone.

`plugin remove` or GUI uninstall can remove the installed bundle while preserving captures in `PLUGIN_DATA`. Removing a marketplace unregisters it but does not delete a user-owned source checkout or local marketplace directory.

To recover, add the marketplace again, reinstall and enable the plugin in the Plugins Directory, then review and trust the new hook hash in a new task. Treat deleted captures as unrecoverable unless they were backed up separately.

### Troubleshooting

#### The plugin is missing from the Plugins Directory

- For the GitHub repository marketplace, confirm that `.agents/plugins/marketplace.json` uses `source.path: "./"` to point at the plugin in the repository root.
- For a separate local development marketplace, confirm that the catalog is under `.agents/plugins/` in the marketplace root and uses `source.path: "./plugins/codex-agent-view"`.
- Run `codex plugin marketplace list` and inspect the source name and resolved root.
- Before installation, confirm that `codex plugin list --marketplace codex-agent-view --available --json` returns the plugin.
- Restart the official app.

#### The plugin is visible but no capture is written

- Confirm that the plugin is enabled, not merely installed.
- Confirm that the task was created after enabling the plugin.
- Inspect the hook command, source, and exact-hash trust state in the hook review surface.
- Confirm that Node.js `>=18` is executable by the hook process.
- Check `PLUGIN_DATA/captures/events.jsonl` for an installed plugin and `<cwd>/.codex-agent-view/captures/events.jsonl` for standalone execution.
- Do not infer that GUI hooks or hot-loading are unsupported from a missing capture in the current task alone.

#### A changed hook no longer runs

A changed hook definition invalidates the previous trust hash. Start a new task, review the hook command again, and trust the new definition.

#### `PermissionRequest` is missing

This event runs only when Codex is actually about to request approval. Commands that do not require approval will not produce it. Capturing a GUI `PermissionRequest` payload remains incomplete in Phase 0.

### Project documents

- [ROADMAP.md](https://github.com/JunhoYoon95/codex-agent-view/blob/main/ROADMAP.md): phase scope and completion criteria
- [AGENTS.md](https://github.com/JunhoYoon95/codex-agent-view/blob/main/AGENTS.md): project working rules
- [docs/phase-0-findings.md](https://github.com/JunhoYoon95/codex-agent-view/blob/main/docs/phase-0-findings.md): observed evidence and recommended next architecture

### License

Copyright 2026 Junho Yoon

Licensed under the Apache License, Version 2.0. See [LICENSE](https://github.com/JunhoYoon95/codex-agent-view/blob/main/LICENSE) and [NOTICE](https://github.com/JunhoYoon95/codex-agent-view/blob/main/NOTICE) for details.
