# Codex Agent View

> [Read in Korean](https://github.com/JunhoYoon95/codex-agent-view/blob/main/README.ko.md)

Codex Agent View is a read-only companion plugin that shows privacy-minimized active tasks and subagents across workspaces inside the official Codex app. Trusted hooks automatically prepare its local live backend, and the bundled **Show Agents** skill lets users open the live view in the Codex app.

> This is an unofficial community project. It is not an OpenAI product, affiliate, or officially supported project.

## Quick start: install once, then stay inside the Codex app

This README documents the public `codex-agent-view@0.4.3` release. Use the exact-version command below for the one-time terminal installation. Public npm `latest` is `0.4.3`.

Universal Plugins Directory search installation is not available yet, so use a regular terminal for the **initial installation only**:

```bash
npm install --global codex-agent-view@0.4.3
codex-agent-view install
```

The first command installs the npm package. The second explicitly registers that package as a local Codex plugin. `npm install` alone does not change Codex settings, and the package has no `postinstall` script that silently modifies them.

After installation:

1. If the Codex app was open during installation, quit it completely and reopen it.
2. In the Codex app's **Plugins** screen, confirm that `Codex Agent View` is installed and enabled.
3. If a hook-review screen is shown, inspect `hooks/hooks.json` and the `node "${PLUGIN_ROOT}/scripts/send-hook.mjs"` command, then explicitly trust the current definition. Use interactive Codex CLI `/hooks` only as part of installation when the app version does not expose hook review.
4. After enablement and hook review, create a **new task** in the Codex app. Events that occurred before installation are not replayed.
5. On the plugin card, select **Quick start**. Its `$show-agents` starter explicitly invokes the bundled **Show Agents** skill in a Codex app task.
6. If you close the live view, enter `@codex-agent-view $show-agents` in a Codex app task to invoke the same bundled skill again.

The plugin card's **Quick start** action and the manual `@codex-agent-view $show-agents` composer entry are explicit in-app skill invocations. They do not require a terminal command, an external browser, or a localhost URL from the user.

When the first trusted hook arrives, the plugin sender internally prepares the local backend and retries delivery of that same event. Users do not register task IDs or run `start`, `status`, or `doctor`. **Show Agents** reuses the healthy backend and attempts to open the live view in the Codex app without exposing a tokenized localhost URL or using an external browser. If the app does not provide the required Browser capability or permission, the skill reports that it could not open the view instead of exposing a private URL.

The public Codex plugin API does not provide no-prompt app-start creation of a sidebar, panel, or Browser tab. Opening the live view therefore requires the plugin card's explicit **Quick start** action or `@codex-agent-view $show-agents` in a Codex app task. Once the right-side live tab is open, it refreshes every two seconds and automatically reconnects after a temporary disconnect, monitor restart, or package upgrade when the backend returns on the same loopback origin. The live observation window still resets when the monitor process restarts; only the read-only viewer credential survives.

In short: install once in a terminal; perform snapshot queries, status checks, live-view opening, and all routine use inside the Codex app.

## Status

This repository and public npm `latest` are `0.4.3`. The release includes an app-native snapshot skill that prioritizes the official Codex app's built-in thread tools, privacy-minimized hooks, a bounded in-memory reducer, a trusted-hook auto-prepared token-authenticated `127.0.0.1` live backend, and explicit install/remove plus maintainer-diagnostic CLI commands.

Plugin installation and lifecycle payloads were verified with Homebrew Codex CLI and the Codex executable embedded in the official app. However, a real-use attempt that installed and enabled `0.2.0` in an already-running official app process delivered zero events while two subagents ran. The monitor, registration, enablement, and installed bundle were healthy, while app logs showed no sender invocation. Evidence indicates that the same process retained a pre-install `hooks/list` snapshot; persisted exact-hook trust is not exposed through CLI JSON, so the precise skip boundary remains unconfirmed.

`0.2.1` adds `SessionStart`, `SessionEnd`, `UserPromptSubmit`, and `Stop` for parent-task lifecycle visibility and makes `status`, `doctor`, and the empty UI distinguish monitor health from hook delivery. In a real E2E after restarting official Codex app `26.727.40816` (`build 6067`) with plugin `0.2.1` installed and enabled, three parent sessions and three subagents appeared automatically without pre-registering task IDs. Real `SessionStart`, `UserPromptSubmit`, `Stop`, `SubagentStart`, `SubagentStop`, `PreToolUse`, `PostToolUse`, and `PermissionRequest` hooks reached the sender, loopback monitor, and UI. `SessionEnd` is wired but has not yet been observed from the real official app, so compatibility for that event is not claimed.

In the lead's `0.3.0` E2E, the official app's built-in thread tools reported the active `kyurasi-next-supabase` task with workspace basename, title, description, explicit `inProgress` status, latest explicit agent commentary, and `subAgentActivity`. Immediately afterward, the list result changed to explicit `idle` with `hasUnreadTurn: true`. The skill separates this into a `Finished / needs review` display group instead of the running/active group, but does not infer completion or success from `idle + unread`. The separate hook/browser monitor also observed a real `SessionEnd`.

Maintainer npm 2FA is enabled in `auth-and-writes` mode, and `codex-agent-view@0.3.1` is a verified prior public release. npm publication remains separate from Universal Plugins Directory submission; the plugin is not directory-searchable.

Verified `0.2.0` release: npm `gitHead` and the annotated `v0.2.0` tag both resolve to commit `00b62af56698ac875e39c7d1386905c157c3a7e8`; the registry SRI/signature and all 21 package files against the tagged source were verified. [GitHub Release v0.2.0](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.2.0) is public. A separate npm provenance attestation is optional and was not published for this release.

Public `0.2.1` patch: registry `latest`, version, `Apache-2.0` license, executable mapping, 21 package files, unpacked size `144644`, npm `gitHead` `8d6a67c9aafa23f801235d747ff018d254378970`, shasum, exact SRI, and registry signature were verified. The annotated `v0.2.1` tag was created at and pushed for that same commit, and [GitHub Release v0.2.1](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.2.1) is public. A clean-cache exact-version `npx --version` passed, and all 21 registry-tarball files are byte-identical to the tagged source. This machine's global install and copied marketplace are also byte-identical to those 21 registry files; CLI `0.2.1`, installed/enabled plugin state, all nine hook declarations, automatic live reception, and a probe subagent's running → stopped/UI completion transition were verified.

Public `0.3.0`: npm `latest`/version at release time, `gitHead` `988132d0b525ee5e63f13a0d924810dd3f1bd93a`, shasum `08e2e5fa8c1133a1dcc3faae8f354535f9fc07b0`, exact SRI, registry signature, 21 files, and an unpacked size of `158.8 kB` were verified. The annotated `v0.3.0` tag was pushed and [GitHub Release v0.3.0](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.3.0) is public. This machine was globally reinstalled from exact public `0.3.0`; the plugin is installed/enabled with all nine hooks wired. Registry-to-global artifact diff is zero, and the copied marketplace matches aside from one ownership marker. The public install monitor received real hooks, `workspace_label: codex-agent-view`, `PermissionRequest`, tool lifecycle events, and a probe subagent's running → stopped transition with `has_out_of_order_events: false`.

Public `0.3.1`: npm version/`latest` at release time `0.3.1`, `gitHead` `c515ea28be201dc24d31e13bf465a38145050b69`, shasum `4405b183012c04e7b0bc265d4eb14bf85291dcd9`, integrity `sha512-8oF5uHqZobgPt75I2ymoq3/tx4Ab1YX/cvMPjaJHjV7zxVC5Dh318isoCdsKNi6emXEbiTIdxOgX7GcclyuP8A==`, and 21 files were verified. The annotated `v0.3.1` tag and [GitHub Release v0.3.1](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.3.1) are public. Exact `0.3.1` was reinstalled on this machine, with plugin `installed: true` and `enabled: true`. Public exact `0.3.1` app-only E2E is not claimed.

Public `0.3.2`: npm version/`latest` at release time `0.3.2`, `gitHead` `4f4f92dc872d9b782efe900cc1397bdccf7d2c8a`, shasum `2851544c75a0a5fb20a2865196ab54b566b373d8`, integrity `sha512-MPwFP3CjhehkIzyV3ja0/rWzLyK4tJI7jjsczKN16aXpKEr/dvtc/aljjqW/41zatZrQG32ccKKMJjYNyW6Tww==`, registry signature, 21 files, package size `46856 B`, and unpacked size `167060 B` were verified. The annotated `v0.3.2` tag and [GitHub Release v0.3.2](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.3.2) are public, and the main/tag CI runs passed. This machine's global `0.3.2` install reports plugin `installed: true` and `enabled: true`, with zero artifact mismatches against the registry package. The app-native thread snapshot showed activity for three workers. The live monitor connected successfully in the Codex built-in Browser, but three follow-up subagents in the app process that predated the reinstall delivered zero hook events. Exact `0.3.2` live-hook E2E is therefore not claimed; it requires a full app restart and a new task.

Public `0.4.0` evidence at the time of that release: npm `latest`/version, Apache-2.0 license, executable mapping, registry signature, 25 files, package size `52614 B`, unpacked size `189181 B`, shasum `cc379e593f4cafa5dd56f32e6741eab5ba3f4497`, and exact SRI were verified. The registry tarball is byte-identical to the release tarball. npm metadata has no `gitHead` because the exact tarball was published, so source identity is not claimed through that field. The annotated `v0.4.0` tag points to release commit `11f7b0511a39c5f5a61cb6da7b91fb3b8e915c6b`; [GitHub Release v0.4.0](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.4.0) and both main/tag CI runs are public and successful. This machine was reinstalled from public exact `0.4.0`; CLI/plugin versions match, the plugin is installed/enabled, all nine hooks are wired, and the monitor reports real events across seven sessions. The Show Agents Browser request was queued in the app process that remained open during reinstall, but its tab was not observable, so exact visual-panel E2E is not claimed until a full app restart and new task.

Known `0.4.0` issue: manifest `defaultPrompt: ["Show Agents"]` created a plain plugin-level text starter. That text did not explicitly invoke the `show-agents` skill, whose implicit invocation was disabled, so treating the plugin card or its Quick start action as skill execution was incorrect. Version `0.4.1` replaces it with the instructional starter `Open @ and select the bundled Show Agents skill.` The starter remains guidance rather than invocation; the only canonical routine-use execution path is direct selection of the bundled **Show Agents** skill in a new task's `@` picker. Public registry and exact app E2E evidence for `0.4.1` are claimed only where separately verified and recorded.

Public `0.4.1`: npm `latest`/version, Apache-2.0 license, executable mapping, registry signature, 25 files, package size `53650 B`, unpacked size `193424 B`, shasum `ee2ae0b8b36016f5c57bade067027202b1508d1d`, and integrity `sha512-WC4f5MPmvpkXeKM+1BVAYqW4+hoaUrB4yQFoUYgc0pnjyY7hP1CdSR5NJ3QWmvJ6Ikmmb1d+58UL4hkKoyhm1Q==` were verified. The release tarball and registry tarball are byte-identical. npm metadata has no `gitHead` because the exact tarball was published, so source identity is not claimed through that field. The annotated `v0.4.1` tag points to commit `a1de67be5413fa38b8dd1b62f74353463f6e641e`; [GitHub Release v0.4.1](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.4.1), main CI run `30710490358`, and tag CI run `30710848474` are public and successful. This machine has matching CLI/plugin `0.4.1`, the plugin is installed/enabled, and all nine hooks are wired. The runtime was cleanly stopped while installation replaced it, so it currently reports `monitor_not_running`; persisted hook trust remains `unknown`. Because the Codex app process predates installation, direct **Show Agents** visual E2E remains unverified until a full app restart and a new task.

Public `0.4.2` changes the plugin starter to `$show-agents`, which explicitly invokes the bundled **Show Agents** skill from the plugin card; `@codex-agent-view $show-agents` is the manual in-app reopen path. Release commits `b4d923a` and `3d8f46d` were pushed, main CI run `30712375726` passed on Node.js 18/20/22, and npm publication was verified with `latest: 0.4.2`, Apache-2.0 licensing, the expected executable mapping, 25 files, registry signature, shasum `fac95689395baa26f4ad9ff0cbefd0017d2ebd8d`, and integrity `sha512-FRTPoYxjBuPC6Usb+ylSfZsZVJKlKcHnQPaAPljekg0maTPn9POsBkS+auOcHz5jspg0AXcP8R63PM0WfCn2LQ==`. The release and registry tarballs are byte-identical; annotated tag `v0.4.2` and [GitHub Release v0.4.2](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.4.2) are public. This machine's exact global install, plugin installed/enabled state, all nine hook declarations, installed artifact match, and official Codex in-app Browser visual E2E were also verified.

Public `0.4.3` preserves that app-only workflow and adds restart-safe live-view authentication. A user-only private viewer credential is separate from the runtime/control token and persists for the installed plugin's lifetime. The viewer credential can read `/api/state` but cannot ingest hook events or request shutdown; the runtime/control token rotates with the monitor process. Installing `0.4.3` over `0.4.2` seeds a missing viewer credential from the valid legacy runtime token without printing it, so an already-open Codex live tab can reconnect after the backend restarts on the same loopback origin. This credential continuity does not persist task state: restart still begins an empty bounded in-memory observation window.

Release commits `a7d938c` and `e2b0543` were pushed, and main CI run `30713618590` passed on Node.js 18/20/22. npm `latest`/version `0.4.3`, Apache-2.0 licensing, 25 files, registry signature, shasum `2dee6bb0ae8c7b4bf505b72cf10d9ec42d5afbc7`, and integrity `sha512-E0Ljs2nDuBBme9UTu66kaW66eCp8mW7BfunLaK5y3u0CVCSjRtCfC9MAJjQA91yQYpeZ1Wj2sKy7d2CW04ZOPw==` were verified. The local release and registry tarballs are byte-identical. This machine's exact global `0.4.3` install, installed/enabled plugin, copied artifact match, all nine hooks, and `doctor` event observation were verified. In the official Codex in-app Browser migration E2E, an open `0.4.2` legacy tab stayed in retrying state without an authentication error during shutdown, then reconnected to the hook-auto-started `0.4.3` monitor and rendered the workspace and agent. Annotated tag `v0.4.3` points to `dea9f39890387ed509cfa0bb511c8167abe11148`; [GitHub Release v0.4.3](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.4.3) is public, non-draft, and non-prerelease. Final main docs CI run `30714110050` and tag CI run `30714144940` succeeded.

## Boundaries

Codex Agent View is a live companion, not a historical audit or session-replay product. Bounded in-memory state and reset-on-restart semantics are intentional: they keep privacy and failure boundaries small. SQLite or persistent history is not a missing requirement. Consider it only as a separate explicit opt-in feature if demonstrated user demand justifies retention, migration, deletion, and privacy costs.

- The app-native current-task snapshot prioritizes explicit status and `subAgentActivity` from the official Codex app's built-in thread tools.
- Hooks remain the source of truth for detailed lifecycle state in the trusted-hook auto-prepared local live backend. Its operational state exists only in bounded process memory; restart begins a new observation window. The separate private viewer credential is authentication metadata, not stored task history.
- The viewer credential is read-only and remains stable across monitor restarts and package upgrades during one installation. The runtime/control token remains separate and process-scoped.
- After installation, hook trust, and an app restart, the first trusted hook automatically prepares the backend. This prepares a local process; it does not create app UI without a user action.
- There is no external telemetry, remote server, account, required SQLite/persistent event store, or remote control.
- Prompt text, transcript paths, full tool input/output, and assistant messages are not retained or displayed by the monitor.
- The default monitor sorts running parents and subagents first, uses human-readable labels and statuses as the primary presentation, and keeps raw IDs and event names out of the primary reading path.
- The product cannot stop or restart tasks/subagents, send messages, or approve/deny permissions.
- Missing, duplicated, or out-of-order events remain visible as empty, unknown, or degraded state instead of being guessed away.

A separately launched Codex `0.146` App Server `thread/list` fallback was also tested. It reported both the current root and subagents as `notLoaded`, so it did not share the official app's live running/completed state. That separate process is not the same as the built-in thread tools exposed directly by the current official app; `0.3.0` uses the latter for its primary snapshot.

## The roles of npm, the Codex app live view, and the Plugins Directory

- The plugin card's **Quick start** action is the primary UX; `@codex-agent-view $show-agents` manually invokes the same bundled skill again after a panel is closed. Neither path requires starting a monitor or registering task IDs.
- npm is the initial installation path that distributes the plugin bundle, its internal hook sender/runtime, and static UI to the user's machine.
- The live view opens in the Codex app only after an explicit `$show-agents` skill invocation; it is not an external website or telemetry dashboard.
- The public plugin API cannot create a sidebar, panel, or Browser tab without a prompt at app startup. The first live view needs one in-app skill selection; an already-open tab refreshes and reconnects across temporary disconnects, monitor restarts, and upgrades while the same installation-owned viewer credential and loopback origin remain available.
- The Universal Plugins Directory does not replace npm. A public in-app custom UI path requires a public HTTPS MCP server and domain verification, which conflicts with this project's local-only, no-external-server boundary. Only a separate listing/skills submission remains under consideration; do not expect Directory search installation until review and publication actually finish.

## Use in the official Codex app — recommended

Use this flow in a **new task** after completing installation and enablement in the quick start. It requires neither another terminal nor an external browser.

1. Select **Quick start** on the Codex Agent View plugin card. Its `$show-agents` starter explicitly invokes the bundled **Show Agents** skill.
2. The skill reuses the backend prepared by trusted hooks, or prepares it internally when still absent, then attempts to open the live view in the Codex app.
3. The panel puts running parents and subagents first and uses human-readable workspace/task/agent labels and status text. Raw session/agent IDs are secondary diagnostic metadata, raw hook event names do not lead the default display, and prompts, previews, tool input/output, and full workspace paths remain hidden.
4. If the app's Browser capability or permission is unavailable, the skill reports the failure without exposing a private localhost URL or opening an external browser.

If you close the right-side live view, enter `@codex-agent-view $show-agents` in a Codex app task to invoke the same bundled skill again. An open tab refreshes and reconnects automatically after temporary disconnects, monitor restarts, and upgrades. A restarted monitor presents a new in-memory observation window rather than replaying earlier activity.

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

This section is reference material for package maintainers and explicit troubleshooting. It is not the normal user workflow. After installation, users invoke **Show Agents** with the plugin card's **Quick start** action or `@codex-agent-view $show-agents` inside a Codex app task; do not make them manage these commands or localhost URLs.

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

The commands below install the public `0.4.3` release by exact version.

```bash
npm install --global codex-agent-view@0.4.3
codex-agent-view install
```

After these two commands, fully reopen the Codex app, verify installation, enablement, and hook trust, then create a new task. The first trusted hook prepares the backend and delivers its event internally, so users do not run monitor CLI commands. Use the plugin card's **Quick start** action to invoke **Show Agents**; after closing the panel, enter `@codex-agent-view $show-agents` in a Codex app task to reopen it.

The `0.4.3` installation path is the global package install followed by the explicit `codex-agent-view install` command above. Routine use remains inside the Codex app afterward. When upgrading a valid `0.4.2` installation, `install` migrates its legacy runtime token into the new read-only viewer credential only when that credential does not already exist; neither token nor the private URL is printed.

The `0.2.0` through public `0.4.3` release evidence is preserved in [Distribution](docs/distribution.md), including npm/install/migration E2E, the annotated tag, GitHub Release, and final main/tag CI.

npm installation does not modify Codex settings automatically. The explicit `install` command performs local plugin registration and leaves hook trust to the user. npm publication and Universal Plugins Directory submission are separate. See [Distribution](docs/distribution.md) and [Plugin submission](docs/plugin-submission.md).

## Maintainer troubleshooting for an empty monitor

1. Run `codex-agent-view doctor --json` and check plugin `installed`, `enabled`, hook `wiring_ok`, and monitor `ok`.
2. If `monitor.events_received` is `false`, do not confuse monitor connectivity with successful hook delivery.
3. In interactive Codex CLI `/hooks`, review and trust the exact current `send-hook.mjs` definition.
4. Fully quit and reopen an official app process that was running before plugin installation.
5. Create a new task after enablement/trust, then run a parent prompt and a subagent.

If events are still absent, report the Codex app/CLI version, plugin version, app-versus-CLI runtime, and redacted `doctor` diagnostic codes. Never share the runtime token or a raw payload.

## Privacy

The normal hook path uses `scripts/send-hook.mjs`. It derives only a sanitized, 120-character-bounded workspace basename as `workspace_label`; the full `cwd` is not sent or stored as content. The reducer keeps this label and narrower lifecycle state only in bounded memory. The normal monitor does not write an event JSONL history. The private viewer credential stored for reconnect continuity contains no task or hook-event state.

`scripts/capture-hook.mjs` is a separate, explicitly invoked Phase 0 diagnostic tool. Setting `CODEX_AGENT_VIEW_CAPTURE_FULL=1` for that script can write raw prompts, tool data, credentials, and other secrets. Normal install/start and the bundled skill never enable it automatically. Do not commit or publicly attach captures or runtime tokens.

Read [Privacy](docs/privacy.md), [Security](SECURITY.md), and [Support](SUPPORT.md) before sharing diagnostics.

## Uninstall

Uninstall is an explicit terminal lifecycle action, like initial installation. Run the command directly whether the monitor was auto-started as a detached process or started in the foreground by a maintainer; no separate manual stop is required.

```bash
codex-agent-view uninstall
```

`uninstall` authenticates to the loopback endpoint with the runtime/control token, verifies that it is a healthy owned Codex Agent View monitor, and requests internal shutdown. Only after shutdown is confirmed does it remove plugin/marketplace registration and the copied bundle. A valid owned viewer credential is revoked during both normal uninstall and `--purge`; reinstalling later creates a different credential. Remaining unrelated runtime-directory data is preserved by default. If the viewer credential is malformed, changed, symbolic, or otherwise unrecognized, it is preserved for manual review and the command prints a warning rather than deleting uncertain data. If the owned monitor cannot be stopped safely or the endpoint is identified as another service, plugin and runtime files are preserved and the command fails.

Use the following only after explicitly deciding to remove owned data from the configured runtime directory:

```bash
codex-agent-view uninstall --purge
```

`--purge` performs the same authenticated shutdown and valid viewer-credential revocation first, then additionally removes only an owned stale runtime file and an empty runtime directory. It does not delete or stop an unrecognized runtime file, an unrecognized viewer credential, or an unrelated loopback service. Unrecognized files are preserved with a warning; an unrelated endpoint aborts removal while preserving plugin and runtime files. A non-empty directory containing opt-in captures or other files is also preserved.

For a source checkout only, use the equivalent `node bin/codex-agent-view.mjs uninstall` or `node bin/codex-agent-view.mjs uninstall --purge` form. Opt-in captures outside that directory require separate, exact cleanup.

## Documentation and license

- [Roadmap](ROADMAP.md)
- [Phase 0 findings](docs/phase-0-findings.md)
- [Privacy](docs/privacy.md)
- [Terms](docs/terms.md)
- [Support](SUPPORT.md)
- [Security](SECURITY.md)

Copyright 2026 Junho Yoon. Licensed under the Apache License 2.0; see [LICENSE](LICENSE) and [NOTICE](NOTICE).
