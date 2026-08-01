# Codex Agent View

> [Read in Korean](https://github.com/JunhoYoon95/codex-agent-view/blob/main/README.ko.md)

Codex Agent View is a read-only companion plugin that shows privacy-minimized active tasks and subagents across workspaces inside the official Codex app. Trusted hooks automatically prepare its local live backend, and the live view opens in the Codex built-in Browser only when the user requests it.

> This is an unofficial community project. It is not an OpenAI product, affiliate, or officially supported project.

## Quick start: install once, then stay inside the Codex app

This README's source release candidate and package are version `codex-agent-view@0.4.0`. It is not published yet; the current public npm `latest` remains `0.3.2`. After `0.4.0` is published, use this exact-version command for the one-time terminal installation.

Universal Plugins Directory search installation is not available yet, so use a regular terminal for the **initial installation only**:

```bash
npm install --global codex-agent-view@0.4.0
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

When the first trusted hook arrives, the plugin sender internally prepares the local backend and retries delivery of that same event. Users do not register task IDs or run `start`, `status`, or `doctor`. A live-view request reuses the healthy backend and opens it in the **Codex built-in Browser** without exposing a tokenized localhost URL or using an external browser.

The public Codex plugin API does not provide no-prompt app-start creation of a sidebar, panel, or Browser tab. Opening the live view therefore requires one explicit action in a Codex app task. Once the right-side live tab is open, it refreshes every two seconds and reconnects after temporary disconnects while the same monitor observation window and token remain valid.

In short: install once in a terminal; perform snapshot queries, status checks, live-view opening, and all routine use inside the Codex app.

## Status

This source candidate is version `0.4.0`. It includes an app-native snapshot skill that prioritizes the official Codex app's built-in thread tools, privacy-minimized hooks, a bounded in-memory reducer, a trusted-hook auto-prepared token-authenticated `127.0.0.1` live backend, and explicit install/remove plus maintainer-diagnostic CLI commands.

Plugin installation and lifecycle payloads were verified with Homebrew Codex CLI and the Codex executable embedded in the official app. However, a real-use attempt that installed and enabled `0.2.0` in an already-running official app process delivered zero events while two subagents ran. The monitor, registration, enablement, and installed bundle were healthy, while app logs showed no sender invocation. Evidence indicates that the same process retained a pre-install `hooks/list` snapshot; persisted exact-hook trust is not exposed through CLI JSON, so the precise skip boundary remains unconfirmed.

`0.2.1` adds `SessionStart`, `SessionEnd`, `UserPromptSubmit`, and `Stop` for parent-task lifecycle visibility and makes `status`, `doctor`, and the empty UI distinguish monitor health from hook delivery. In a real E2E after restarting official Codex app `26.727.40816` (`build 6067`) with plugin `0.2.1` installed and enabled, three parent sessions and three subagents appeared automatically without pre-registering task IDs. Real `SessionStart`, `UserPromptSubmit`, `Stop`, `SubagentStart`, `SubagentStop`, `PreToolUse`, `PostToolUse`, and `PermissionRequest` hooks reached the sender, loopback monitor, and UI. `SessionEnd` is wired but has not yet been observed from the real official app, so compatibility for that event is not claimed.

In the lead's `0.3.0` E2E, the official app's built-in thread tools reported the active `kyurasi-next-supabase` task with workspace basename, title, description, explicit `inProgress` status, latest explicit agent commentary, and `subAgentActivity`. Immediately afterward, the list result changed to explicit `idle` with `hasUnreadTurn: true`. The skill separates this into a `Finished / needs review` display group instead of the running/active group, but does not infer completion or success from `idle + unread`. The separate hook/browser monitor also observed a real `SessionEnd`.

Maintainer npm 2FA is enabled in `auth-and-writes` mode, and `codex-agent-view@0.3.1` is a verified prior public release. npm publication remains separate from Universal Plugins Directory submission; the plugin is not directory-searchable.

Verified `0.2.0` release: npm `gitHead` and the annotated `v0.2.0` tag both resolve to commit `00b62af56698ac875e39c7d1386905c157c3a7e8`; the registry SRI/signature and all 21 package files against the tagged source were verified. [GitHub Release v0.2.0](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.2.0) is public. A separate npm provenance attestation is optional and was not published for this release.

Public `0.2.1` patch: registry `latest`, version, `Apache-2.0` license, executable mapping, 21 package files, unpacked size `144644`, npm `gitHead` `8d6a67c9aafa23f801235d747ff018d254378970`, shasum, exact SRI, and registry signature were verified. The annotated `v0.2.1` tag was created at and pushed for that same commit, and [GitHub Release v0.2.1](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.2.1) is public. A clean-cache exact-version `npx --version` passed, and all 21 registry-tarball files are byte-identical to the tagged source. This machine's global install and copied marketplace are also byte-identical to those 21 registry files; CLI `0.2.1`, installed/enabled plugin state, all nine hook declarations, automatic live reception, and a probe subagent's running → stopped/UI completion transition were verified.

Public `0.3.0`: npm `latest`/version at release time, `gitHead` `988132d0b525ee5e63f13a0d924810dd3f1bd93a`, shasum `08e2e5fa8c1133a1dcc3faae8f354535f9fc07b0`, exact SRI, registry signature, 21 files, and an unpacked size of `158.8 kB` were verified. The annotated `v0.3.0` tag was pushed and [GitHub Release v0.3.0](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.3.0) is public. This machine was globally reinstalled from exact public `0.3.0`; the plugin is installed/enabled with all nine hooks wired. Registry-to-global artifact diff is zero, and the copied marketplace matches aside from one ownership marker. The public install monitor received real hooks, `workspace_label: codex-agent-view`, `PermissionRequest`, tool lifecycle events, and a probe subagent's running → stopped transition with `has_out_of_order_events: false`.

Public `0.3.1`: npm version/`latest` at release time `0.3.1`, `gitHead` `c515ea28be201dc24d31e13bf465a38145050b69`, shasum `4405b183012c04e7b0bc265d4eb14bf85291dcd9`, integrity `sha512-8oF5uHqZobgPt75I2ymoq3/tx4Ab1YX/cvMPjaJHjV7zxVC5Dh318isoCdsKNi6emXEbiTIdxOgX7GcclyuP8A==`, and 21 files were verified. The annotated `v0.3.1` tag and [GitHub Release v0.3.1](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.3.1) are public. Exact `0.3.1` was reinstalled on this machine, with plugin `installed: true` and `enabled: true`. Public exact `0.3.1` app-only E2E is not claimed.

Public `0.3.2`: npm version/`latest` at release time `0.3.2`, `gitHead` `4f4f92dc872d9b782efe900cc1397bdccf7d2c8a`, shasum `2851544c75a0a5fb20a2865196ab54b566b373d8`, integrity `sha512-MPwFP3CjhehkIzyV3ja0/rWzLyK4tJI7jjsczKN16aXpKEr/dvtc/aljjqW/41zatZrQG32ccKKMJjYNyW6Tww==`, registry signature, 21 files, package size `46856 B`, and unpacked size `167060 B` were verified. The annotated `v0.3.2` tag and [GitHub Release v0.3.2](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.3.2) are public, and the main/tag CI runs passed. This machine's global `0.3.2` install reports plugin `installed: true` and `enabled: true`, with zero artifact mismatches against the registry package. The app-native thread snapshot showed activity for three workers. The live monitor connected successfully in the Codex built-in Browser, but three follow-up subagents in the app process that predated the reinstall delivered zero hook events. Exact `0.3.2` live-hook E2E is therefore not claimed; it requires a full app restart and a new task.

## Boundaries

Codex Agent View is a live companion, not a historical audit or session-replay product. Bounded in-memory state and reset-on-restart semantics are intentional: they keep privacy and failure boundaries small. SQLite or persistent history is not a missing requirement. Consider it only as a separate explicit opt-in feature if demonstrated user demand justifies retention, migration, deletion, and privacy costs.

- The app-native current-task snapshot prioritizes explicit status and `subAgentActivity` from the official Codex app's built-in thread tools.
- Hooks remain the source of truth for detailed lifecycle state in the trusted-hook auto-prepared local live backend. Its operational state exists only in bounded process memory; restart begins a new observation window.
- After installation, hook trust, and an app restart, the first trusted hook automatically prepares the backend. This prepares a local process; it does not create app UI without a user action.
- There is no external telemetry, remote server, account, required SQLite/persistent event store, or remote control.
- Prompt text, transcript paths, full tool input/output, and assistant messages are not retained or displayed by the monitor.
- The product cannot stop or restart tasks/subagents, send messages, or approve/deny permissions.
- Missing, duplicated, or out-of-order events remain visible as empty, unknown, or degraded state instead of being guessed away.

A separately launched Codex `0.146` App Server `thread/list` fallback was also tested. It reported both the current root and subagents as `notLoaded`, so it did not share the official app's live running/completed state. That separate process is not the same as the built-in thread tools exposed directly by the current official app; `0.3.0` uses the latter for its primary snapshot.

## The roles of npm, the Codex app live view, and the Plugins Directory

- Asking the plugin `Show active tasks` inside the official Codex app is the primary `0.3.0` UX; it does not require starting a monitor or registering task IDs.
- npm is the initial installation path that distributes the plugin bundle, its internal hook sender/runtime, and static UI to the user's machine.
- The live view opens in the Codex built-in Browser only after an explicit in-app request; it is not an external website or telemetry dashboard.
- The public plugin API cannot create a sidebar, panel, or Browser tab without a prompt at app startup. The first live view needs one in-app request; an already-open tab refreshes and reconnects within the same observation window.
- The Universal Plugins Directory does not replace npm. A public in-app custom UI path requires a public HTTPS MCP server and domain verification, which conflicts with this project's local-only, no-external-server boundary. Only a separate listing/skills submission remains under consideration; do not expect Directory search installation until review and publication actually finish.

## Use in the official Codex app — recommended

Use this flow in a **new task** after completing installation and enablement in the quick start. It requires neither another terminal nor an external browser.

1. Open the `@` menu and select `codex-agent-view`.
2. Ask `Show active tasks`.
3. The plugin queries running/active tasks plus tasks with explicit `idle` and `hasUnreadTurn: true`. It places the latter in a separate `Finished / needs review` display group without claiming completion or success.
4. It displays only workspace basename, display-only title, explicit status, latest explicit agent commentary, and a small `subAgentActivity` tree.
5. Prompts, previews, tool input/output, full workspace paths, and internal thread IDs remain hidden by default.

Ask `Open the live Codex Agent View in the built-in Browser` inside the app only when you want hook-level live detail. This is the one explicit in-app action that opens the first view. The plugin reuses the backend prepared by trusted hooks, or starts it internally when still absent, and never exposes its tokenized localhost URL in chat. An already-open right-side tab refreshes and reconnects automatically within the same observation window.

## Requirements and tested versions

- Node.js `>=18`
- npm
- A Codex app or CLI build with plugin commands

| Runtime | Tested version | Scope |
| --- | --- | --- |
| Official Codex app | `26.727.40816` (`build 6067`) | Public `0.3.0` confirmed app-native task snapshots, real `SessionEnd`, workspace labeling, permission/tool lifecycle, and subagent running → stopped |
| App-embedded Codex | `0.146.0-alpha.9.2` | isolated install/runtime and lifecycle probe |
| Homebrew Codex CLI | `0.146.0` | isolated install/runtime probe |

These versions are a test matrix, not a minimum-version guarantee.

## Validate from source

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

## Maintainer and advanced diagnostics CLI

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

After plugin enablement/trust and an app restart, the first trusted hook internally prepares the backend and retries that event. Newly created or resumed tasks therefore appear without pre-registering a task ID or asking the user to start a monitor. Search is only an optional filter over the automatically received list. If automatic preparation cannot complete within its bounded hook budget, delivery fails open and that event is not persisted for replay.

## Install from npm

After publication, the commands below target this source candidate's exact package version, `0.4.0`. The current public npm `latest` is still `0.3.2`; these commands are not claimed to work until the `0.4.0` publish completes.

```bash
npm install --global codex-agent-view@0.4.0
codex-agent-view install
```

After these two commands, fully reopen the Codex app, verify installation, enablement, and hook trust, then create a new task. The first trusted hook prepares the backend and delivers its event internally, so users do not run monitor CLI commands. To open the first screen, select `@codex-agent-view` in that task and request the live view inside the app.

Or run the exact version without a global install:

```bash
npx --yes codex-agent-view@0.4.0 install
```

The `npx` form is also an initial explicit-install path only. Routine use remains inside the Codex app afterward.

The `0.2.0`, `0.2.1`, `0.3.0`, `0.3.1`, and `0.3.2` release evidence is preserved. `0.4.0` is a source candidate and has no public release evidence yet. See [Distribution](docs/distribution.md).

npm installation does not modify Codex settings automatically. The explicit `install` command performs local plugin registration and leaves hook trust to the user. npm publication and Universal Plugins Directory submission are separate. See [Distribution](docs/distribution.md) and [Plugin submission](docs/plugin-submission.md).

## Maintainer troubleshooting for an empty monitor

1. Run `codex-agent-view doctor --json` and check plugin `installed`, `enabled`, hook `wiring_ok`, and monitor `ok`.
2. If `monitor.events_received` is `false`, do not confuse monitor connectivity with successful hook delivery.
3. In interactive Codex CLI `/hooks`, review and trust the exact current `send-hook.mjs` definition.
4. Fully quit and reopen an official app process that was running before plugin installation.
5. Create a new task after enablement/trust, then run a parent prompt and a subagent.

If events are still absent, report the Codex app/CLI version, plugin version, app-versus-CLI runtime, and redacted `doctor` diagnostic codes. Never share the runtime token or a raw payload.

## Privacy

The normal hook path uses `scripts/send-hook.mjs`. It derives only a sanitized, 120-character-bounded workspace basename as `workspace_label`; the full `cwd` is not sent or stored as content. The reducer keeps this label and narrower lifecycle state only in bounded memory. The normal monitor does not write an event JSONL history.

`scripts/capture-hook.mjs` is a separate, explicitly invoked Phase 0 diagnostic tool. Setting `CODEX_AGENT_VIEW_CAPTURE_FULL=1` for that script can write raw prompts, tool data, credentials, and other secrets. Normal install/start and the bundled skill never enable it automatically. Do not commit or publicly attach captures or runtime tokens.

Read [Privacy](docs/privacy.md), [Security](SECURITY.md), and [Support](SUPPORT.md) before sharing diagnostics.

## Uninstall

Uninstall is an explicit terminal lifecycle action, like initial installation. Run the command directly whether the monitor was auto-started as a detached process or started in the foreground by a maintainer; no separate manual stop is required.

```bash
codex-agent-view uninstall
```

`uninstall` authenticates to the loopback endpoint with the runtime file's bearer token, verifies that it is a healthy owned Codex Agent View monitor, and requests internal shutdown. Only after shutdown is confirmed does it remove plugin/marketplace registration and the copied bundle; remaining runtime-directory data is preserved by default. If the owned monitor cannot be stopped safely or the endpoint is identified as another service, plugin and runtime files are preserved and the command fails.

Use the following only after explicitly deciding to remove owned data from the configured runtime directory:

```bash
codex-agent-view uninstall --purge
```

`--purge` performs the same authenticated shutdown first, then additionally removes only an owned stale runtime file and an empty runtime directory. It does not delete or stop an unrecognized runtime file or an unrelated loopback service. An unrecognized file is preserved; an unrelated endpoint aborts removal while preserving plugin and runtime files. A non-empty directory containing opt-in captures or other files is also preserved.

For a source checkout only, use the equivalent `node bin/codex-agent-view.mjs uninstall` or `node bin/codex-agent-view.mjs uninstall --purge` form. Opt-in captures outside that directory require separate, exact cleanup.

## Documentation and license

- [Roadmap](ROADMAP.md)
- [Phase 0 findings](docs/phase-0-findings.md)
- [Privacy](docs/privacy.md)
- [Terms](docs/terms.md)
- [Support](SUPPORT.md)
- [Security](SECURITY.md)

Copyright 2026 Junho Yoon. Licensed under the Apache License 2.0; see [LICENSE](LICENSE) and [NOTICE](NOTICE).
