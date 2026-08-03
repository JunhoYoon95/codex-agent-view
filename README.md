# Codex Agent View

> [Read in Korean](https://github.com/JunhoYoon95/codex-agent-view/blob/main/README.ko.md)

Codex Agent View gives you a clear, read-only view of what Codex is working on and which agents are moving each work item forward. Trusted Codex hooks keep the data local, while one `@codex-agent-view` invocation opens the monitor in your default web browser.

> This is an unofficial community project. It is not an OpenAI product, affiliate, or officially supported project.

## Quick start

Public npm `latest` remains historical `codex-agent-view@0.4.8`. Current source is the **unpublished `0.5.0` release candidate**: it removes the separate user-facing `$show-agents` selection and opens the local monitor in the default browser. The exact candidate command below will become usable only after `0.5.0` is published; do not treat this source document as registry availability evidence.

Universal Plugins Directory search installation is not available yet, so use a regular terminal for the **initial installation only**:

```bash
npm install --global codex-agent-view@0.5.0
codex-agent-view install
```

The first command installs the npm package. The second explicitly registers that package as a local Codex plugin. `npm install` alone does not change Codex settings, and the package has no `postinstall` script that silently modifies them.

After installation:

1. If the Codex app was open during installation, quit it completely and reopen it.
2. In the Codex app's **Plugins** screen, confirm that `Codex Agent View` is installed and enabled.
3. If a hook-review screen is shown, inspect `hooks/hooks.json` and the `node "${PLUGIN_ROOT}/scripts/send-hook.mjs"` command, then explicitly trust the current definition. Use interactive Codex CLI `/hooks` only as part of installation when the app version does not expose hook review.
4. After enablement and hook review, create a **new task** in the Codex app. Events that occurred before installation are not replayed.
5. Select the plugin card's **Quick start** action, or select `@codex-agent-view` in a Codex app task and send it. The current source starts or reuses the local monitor and opens an authenticated view in the operating system's default browser.
6. Keep that browser tab open while monitoring. If you close it, invoke `@codex-agent-view` again; there is no separate skill to select and no localhost address to copy.

The bundle keeps one internal skill because that is the Codex plugin execution capability, but it is an implementation detail rather than a second user action. Users do not open a skill picker or type `$show-agents`. The plugin invocation launches the default browser itself after preparing a least-privilege local URL. Routine use requires neither a terminal command nor manual localhost URL management.

When the first trusted hook arrives, the plugin sender internally prepares the local backend and retries delivery of that same event. Users do not register task IDs or run `start`, `status`, or `doctor`. The current launch capability runs `codex-agent-view open` exactly once; that command prepares or reuses the owned monitor, obtains a bounded viewer grant, and asks the operating system to open the authenticated local view in the default browser. Before sending the runtime bearer, the command verifies a fresh nonce/HMAC ownership proof from the exact owned monitor. It then obtains a one-time, 60-second bootstrap grant signed by that process's runtime token. Only that bounded grant enters the URL fragment: the installation-owned viewer credential and runtime/control token do not. Every request uses the exact `127.0.0.1:<port>` authority and origin-form target. No cookie, CORS access, or user-managed localhost URL is involved.

The public Codex plugin API does not provide reliable automatic creation of an app sidebar, panel, or in-app Browser tab. The current source therefore uses the default external browser as the stable display surface. The bootstrap fixes one signed 30-minute credential-family expiry that access, recovery, and refresh can never extend. Fifteen-minute access credentials refresh automatically only inside that family, so the same tab remains connected until the family ends. Recovery is tab-scoped `sessionStorage`, not `localStorage`. A previously authenticated tab can therefore use **Reconnect** after a transient page-level failure. A new tab with no credential, or a tab whose family expired, cannot safely mint access; invoke `@codex-agent-view` again to open a newly authenticated view. The invoking task's validated `CODEX_THREAD_ID` remains signed into the family. A bootstrap is one-use within its issuing process and becomes invalid immediately when that monitor restarts; a family already exchanged under the persistent viewer signing key can reconnect on the same origin until its original absolute expiry.

The live UI defaults to English and offers **English**, **Korean**, and **Spanish** in its language selector. Activity remains visible rather than hidden behind refresh-sensitive disclosure toggles, and the two-second polling interval is unchanged. Each work item can show its first valid short request summary derived from `UserPromptSubmit`: the sender inspects at most 4,096 characters, redacts common credentials, email addresses, links, and absolute paths, collapses the result to one line, bounds it to 180 characters, and immediately discards the full request. Later follow-ups do not replace that first valid summary. Verified `SubagentStart` payloads still provide only `agent_id` and `agent_type`; they do not provide a dedicated assignment description. The monitor therefore shows the work-level request summary but does not invent an agent-specific assignment from prompts or tool input.

In short: install once in a terminal, invoke `@codex-agent-view` in Codex, and monitor in the browser tab it opens.

## Status

Current source is the unpublished `0.5.0` external-browser launch release candidate. One `@codex-agent-view` invocation runs the bundle's internal capability, prepares the view, and opens the default browser; the user-facing `$show-agents` picker and app panel are no longer part of the workflow. Ownership is proven before the runtime bearer is sent, and the URL carries only a one-use, 60-second process-signed bootstrap grant. A fixed 30-minute signed family supports automatic 15-minute access refresh and tab-scoped recovery without extending the family deadline. Monitor restart invalidates only an unused bootstrap; an exchanged family can reconnect to the new in-memory observation window until its original expiry. Family expiry requires another `@codex-agent-view` invocation. Publication, public-artifact verification, and official app → default-browser E2E are still pending.

Historical public `0.4.8` evidence: `npm run check` passed all 153 tests plus plugin validation and package dry-run. npm `latest` is `0.4.8`; the signed 25-file registry artifact, exact global installation, enabled plugin `0.4.8`, all nine hooks, healthy doctor result, main/tag CI, annotated tag, and public GitHub Release were verified. The official Codex app delivered an actual new subagent start/stop pair with ordered timestamps and final stopped status. Its historical in-app Browser flow also verified grant authentication, fragment removal, same-tab bare-root recovery, and no recovery button in a new tab. That release evidence does not validate the unpublished `0.5.0` external-browser candidate.

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

Known `0.4.0` issue: manifest `defaultPrompt: ["Show Agents"]` created a plain plugin-level text starter. That text did not invoke the `show-agents` skill, whose implicit invocation was disabled, so treating the plugin card or its Quick start action as skill execution was incorrect. Version `0.4.1` replaced it with the instructional starter `Open @ and select the bundled Show Agents skill.`, but that starter was still guidance rather than invocation. Public `0.4.8` later required explicit skill selection. The unreleased current source instead gives the plugin one internal launch capability and removes the user-facing skill-picker step. Public registry and exact app E2E evidence for each release are claimed only where separately verified and recorded.

Public `0.4.1`: npm `latest`/version, Apache-2.0 license, executable mapping, registry signature, 25 files, package size `53650 B`, unpacked size `193424 B`, shasum `ee2ae0b8b36016f5c57bade067027202b1508d1d`, and integrity `sha512-WC4f5MPmvpkXeKM+1BVAYqW4+hoaUrB4yQFoUYgc0pnjyY7hP1CdSR5NJ3QWmvJ6Ikmmb1d+58UL4hkKoyhm1Q==` were verified. The release tarball and registry tarball are byte-identical. npm metadata has no `gitHead` because the exact tarball was published, so source identity is not claimed through that field. The annotated `v0.4.1` tag points to commit `a1de67be5413fa38b8dd1b62f74353463f6e641e`; [GitHub Release v0.4.1](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.4.1), main CI run `30710490358`, and tag CI run `30710848474` are public and successful. This machine has matching CLI/plugin `0.4.1`, the plugin is installed/enabled, and all nine hooks are wired. The runtime was cleanly stopped while installation replaced it, so it currently reports `monitor_not_running`; persisted hook trust remains `unknown`. Because the Codex app process predates installation, direct **Show Agents** visual E2E remains unverified until a full app restart and a new task.

Public `0.4.2` changed the plugin starter text to `$show-agents` and intended it as an in-app reopen shortcut. Real app use later showed that this plugin-card starter could remain plain text rather than dispatching the bundled skill; this paragraph no longer claims otherwise. Release commits `b4d923a` and `3d8f46d` were pushed, main CI run `30712375726` passed on Node.js 18/20/22, and npm publication was verified with `latest: 0.4.2`, Apache-2.0 licensing, the expected executable mapping, 25 files, registry signature, shasum `fac95689395baa26f4ad9ff0cbefd0017d2ebd8d`, and integrity `sha512-FRTPoYxjBuPC6Usb+ylSfZsZVJKlKcHnQPaAPljekg0maTPn9POsBkS+auOcHz5jspg0AXcP8R63PM0WfCn2LQ==`. The release and registry tarballs are byte-identical; annotated tag `v0.4.2` and [GitHub Release v0.4.2](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.4.2) are public. This machine's exact global install, plugin installed/enabled state, all nine hook declarations, installed artifact match, and official Codex in-app Browser visual E2E were also verified.

Public `0.4.3` preserves that app-only workflow and adds restart-safe live-view authentication. A user-only private viewer credential is separate from the runtime/control token and persists for the installed plugin's lifetime. The viewer credential can read `/api/state` but cannot ingest hook events or request shutdown; the runtime/control token rotates with the monitor process. Installing `0.4.3` over `0.4.2` seeds a missing viewer credential from the valid legacy runtime token without printing it, so an already-open Codex live tab can reconnect after the backend restarts on the same loopback origin. This credential continuity does not persist task state: restart still begins an empty bounded in-memory observation window.

Release commits `a7d938c` and `e2b0543` were pushed, and main CI run `30713618590` passed on Node.js 18/20/22. npm `latest`/version `0.4.3`, Apache-2.0 licensing, 25 files, registry signature, shasum `2dee6bb0ae8c7b4bf505b72cf10d9ec42d5afbc7`, and integrity `sha512-E0Ljs2nDuBBme9UTu66kaW66eCp8mW7BfunLaK5y3u0CVCSjRtCfC9MAJjQA91yQYpeZ1Wj2sKy7d2CW04ZOPw==` were verified. The local release and registry tarballs are byte-identical. This machine's exact global `0.4.3` install, installed/enabled plugin, copied artifact match, all nine hooks, and `doctor` event observation were verified. In the official Codex in-app Browser migration E2E, an open `0.4.2` legacy tab stayed in retrying state without an authentication error during shutdown, then reconnected to the hook-auto-started `0.4.3` monitor and rendered the workspace and agent. Annotated tag `v0.4.3` points to `dea9f39890387ed509cfa0bb511c8167abe11148`; [GitHub Release v0.4.3](https://github.com/JunhoYoon95/codex-agent-view/releases/tag/v0.4.3) is public, non-draft, and non-prerelease. Final main docs CI run `30714110050` and tag CI run `30714144940` succeeded.

## Boundaries

Codex Agent View is a live companion, not a historical audit or session-replay product. Bounded in-memory state and reset-on-restart semantics are intentional: they keep privacy and failure boundaries small. SQLite or persistent history is not a missing requirement. Consider it only as a separate explicit opt-in feature if demonstrated user demand justifies retention, migration, deletion, and privacy costs.

- Historical releases offered a separate app-native current-task snapshot that prioritized explicit status and `subAgentActivity` from the official Codex app's built-in thread tools. The current source consolidates user entry into the hook-backed browser monitor.
- Hooks remain the source of truth for detailed lifecycle state in the trusted-hook auto-prepared local live backend. Its operational state exists only in bounded process memory; restart begins a new observation window. The separate private viewer credential is authentication metadata, not stored task history.
- `Stop` marks the observed root turn and the session/work-item summary `completed` immediately. If a child agent or tool was still active, its own row is separately marked `completion_not_observed` because no child stop/tool completion signal was observed. `SessionEnd` has terminal priority; any child agent, tool, or permission still open at that point is shown as `interrupted`, not silently completed.
- Official `SessionEnd` delivery may be delayed by up to 30 minutes. If no ending hook is observed while activity still appears open, five minutes without a new event changes it to `completion_not_observed` (**End not confirmed**), never inferred `completed`. This keeps a delayed or missing terminal event from turning stale activity into a false success.
- The installation-owned viewer credential remains private to local runtime files for ownership/legacy boundaries. The runtime/control token remains separate and process-scoped. The normal live-view URL contains neither credential; it contains only a one-use, process-signed 60-second bootstrap grant.
- After installation, hook trust, and an app restart, the first trusted hook automatically prepares the backend. This prepares a local process; it does not create app UI without a user action.
- There is no external telemetry, remote server, account, required SQLite/persistent event store, or remote control.
- Full prompt text, transcript paths, full tool input/output, and assistant messages are not retained or displayed by the monitor. Only the bounded, redacted one-line work summary described above may be retained in process memory.
- The default monitor sorts active work and participating agents first, uses human-readable labels and statuses as the primary presentation, and keeps raw IDs and event names out of the primary reading path. Session IDs are not shown in the live cards.
- The product cannot stop or restart tasks/subagents, send messages, or approve/deny permissions.
- Missing, duplicated, or out-of-order events remain visible as empty, unknown, or degraded state instead of being guessed away.
- The sender keeps its bounded retry and fail-open behavior. It has no disk-backed queue or persistent replay; an event that cannot be delivered within the hook budget is not replayed later.

A separately launched Codex `0.146` App Server `thread/list` fallback was also tested. It reported both the current root and subagents as `notLoaded`, so it did not share the official app's live running/completed state. That separate process is not the same as the built-in thread tools exposed directly by the official app; historical `0.3.0` used the latter for its primary snapshot.

## The roles of npm, the local browser view, and the Plugins Directory

- The current-source plugin card's **Quick start** action launches the same single-purpose flow as sending `@codex-agent-view`: prepare or reuse the local monitor, then open the authenticated view in the default browser. No user-facing skill picker, monitor command, or task-ID registration is required.
- npm is the initial installation path that distributes the plugin bundle, its internal hook sender/runtime, and static UI to the user's machine.
- The live view is a local-only page in the operating system's default browser, not a hosted website or telemetry dashboard. The plugin opens it; users do not copy its private localhost URL.
- The public plugin API cannot reliably create a sidebar, panel, or in-app Browser tab for this flow. A previously authenticated browser tab can reconnect after a transient failure within its fixed credential-family lifetime. A closed tab, a new tab with no credential, or an expired family is reopened safely by invoking `@codex-agent-view` again.
- The Universal Plugins Directory does not replace npm. A public in-app custom UI path requires a public HTTPS MCP server and domain verification, which conflicts with this project's local-only, no-external-server boundary. Only a separate listing/skills submission remains under consideration; do not expect Directory search installation until review and publication actually finish.

## Use from the official Codex app — recommended

Use this flow in a **new task** after completing installation and enablement in the quick start. Codex initiates the action; the monitor itself stays open in the operating system's default browser.

1. Select **Quick start** on the Codex Agent View plugin card, or select `@codex-agent-view` in a Codex app task and send it.
2. The plugin's single internal execution capability reuses the backend prepared by trusted hooks, or prepares it when absent, then opens the authenticated live view in the default browser. There is no separate `$show-agents` selection.
3. The page excludes this invoking viewer task using `CODEX_THREAD_ID`, puts the remaining active work and participating agents first, and uses human-readable project, request-summary, agent, and status text. Session IDs are not shown. The full request, previews, tool input/output, and full workspace paths remain hidden.
4. Choose **English**, **Korean**, or **Spanish** from the language selector. English is the default, and changing language does not stop the two-second refresh.
5. Leave the browser tab open while monitoring. If the operating system cannot open the browser, the plugin reports the failure without printing the private authenticated localhost URL.

If you close the browser tab, invoke `@codex-agent-view` again. During its fixed 30-minute family, the same tab keeps recovery only in `sessionStorage`, refreshes 15-minute access automatically, and offers **Reconnect** after a transient page-level failure. A different or never-authenticated tab has no recovery credential, and family expiry invalidates recovery; in either case, invoke `@codex-agent-view` again. No terminal command, private URL copy, cookie, or CORS access is part of recovery. A restarted monitor presents a new in-memory observation window; an unused bootstrap issued by the old process is immediately invalid.

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

This section is reference material for package maintainers and explicit troubleshooting. It is not the normal user workflow. After installation, users invoke `@codex-agent-view` once and use the browser tab opened by the plugin; do not make them manage these commands or localhost URLs.

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

The commands below target the unpublished `0.5.0` release candidate and will work only after that version is published. Public npm `latest` remains historical `0.4.8` until then.

```bash
npm install --global codex-agent-view@0.5.0
codex-agent-view install
```

After `0.5.0` is published and these two commands succeed, fully reopen the Codex app, verify installation, enablement, and hook trust, then create a new task. The first trusted hook prepares the backend and delivers its event internally, so users do not run monitor CLI commands. Invoke `@codex-agent-view` once to open the default browser and invoke it again after closing the tab. Public `0.4.8` retains its historical in-app skill flow.

The candidate `0.5.0` installation path is the global package install followed by the explicit `codex-agent-view install` command above. During an upgrade, explicit `install` replaces registration and bundle files through the authenticated maintenance lifecycle. It preserves the installation-owned viewer credential and the historical migration boundary. The launch workflow prints no persistent token and puts neither the viewer credential nor runtime/control bearer in the browser target.

Version-specific npm, install, migration, CI, tag, and GitHub Release evidence is preserved in [Distribution](docs/distribution.md). That evidence is updated only after each item is actually verified.

npm installation does not modify Codex settings automatically. The explicit `install` command performs local plugin registration and leaves hook trust to the user. npm publication and Universal Plugins Directory submission are separate. See [Distribution](docs/distribution.md) and [Plugin submission](docs/plugin-submission.md).

## Maintainer troubleshooting for an empty monitor

1. Run `codex-agent-view doctor --json` and check plugin `installed`, `enabled`, hook `wiring_ok`, and monitor `ok`.
2. If `monitor.events_received` is `false`, do not confuse monitor connectivity with successful hook delivery.
3. In interactive Codex CLI `/hooks`, review and trust the exact current `send-hook.mjs` definition.
4. Fully quit and reopen an official app process that was running before plugin installation.
5. Create a new task after enablement/trust, then run a parent prompt and a subagent.

If events are still absent, report the Codex app/CLI version, plugin version, app-versus-CLI runtime, and redacted `doctor` diagnostic codes. Never share the runtime token or a raw payload.

## Privacy

The normal hook path uses `scripts/send-hook.mjs`. It derives a sanitized, 120-character-bounded workspace basename as `workspace_label`; the full `cwd` is not sent or stored as content. For `UserPromptSubmit` only, it also derives the bounded, redacted one-line `task_summary` described above. The raw request is discarded before transport. The reducer keeps the label, task summary, and narrower lifecycle state only in bounded memory. The normal monitor does not write an event JSONL history. The private viewer credential stored for reconnect continuity contains no task or hook-event state.

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
