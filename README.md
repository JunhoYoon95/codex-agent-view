# Codex Agent View

> [Read in Korean](https://github.com/JunhoYoon95/codex-agent-view/blob/main/README.ko.md)

Codex Agent View is an unofficial, read-only companion plugin for the official Codex app. It shows the work Codex is handling, the participating agents, their assigned work when it can be verified, and their latest observable activity. Hook data stays on this device in bounded process memory, and one `@codex-agent-view` invocation opens the live view in the operating system's default browser.

It does not replace Codex, control tasks or agents, run a hosted service, send telemetry, or keep a persistent event history.

## Quick start

Version `0.5.2` is the current public-release target. Install it from a regular terminal:

```bash
npm install --global codex-agent-view@0.5.2
codex-agent-view install
```

The first command installs the npm package. The second explicitly registers its bundled local Codex plugin. `npm install` alone does not modify Codex settings, and this package has no `postinstall` script that does so.

Then:

1. If Codex was open during installation, quit it completely and reopen it.
2. In the Codex app's **Plugins** screen, confirm that **Codex Agent View** is installed and enabled.
3. If Codex asks you to review hooks, inspect `hooks/hooks.json` and the `node "${PLUGIN_ROOT}/scripts/send-hook.mjs"` command before explicitly trusting the current definition. If the app does not provide hook review, use `/hooks` in the interactive Codex CLI during installation.
4. Create a new Codex task. Events from before installation are not replayed.

## Use

In a Codex app task, select and send:

```text
@codex-agent-view
```

That is the whole normal-use command. The plugin prepares or reuses its local monitor and opens an authenticated live view in your operating system's default browser.

- Do not select a separate `$show-agents` skill.
- Do not start the monitor in a terminal.
- Do not copy or manage a localhost URL.
- Closing the browser tab does not stop Codex work. Invoke `@codex-agent-view` again when you want a new authenticated tab.

The public Codex plugin API does not provide a reliable automatic app sidebar or in-app panel for this workflow, so the default browser is the supported display surface.

## What the view shows

The live view defaults to English and also supports Korean and Spanish. It refreshes every two seconds without collapsing agent details.

Each work item can include a short, redacted request summary. Each agent card can show:

- **Assigned work** — a bounded summary is shown only when one verified spawn candidate can be correlated unambiguously with one newly observed agent. In the currently observed official-app payload, the protected spawn message is opaque, so a safely humanized task label is the primary usable source. Ambiguous, concurrent, expired, or protected values are not guessed or displayed.
- **Current activity** — a human-readable description such as a file edit in progress or a recently completed terminal action. It is shown only when the observed tool lifecycle has the exact `turn_id` of one and only one agent.

These fields describe observable assignment and tool lifecycle signals, not an agent's internal reasoning. The monitor does not retain or display raw spawn messages, full prompts, full tool input, or full tool output. Missing or ambiguous information remains unavailable instead of being inferred from timing.

## Reconnect and recovery

The opened tab refreshes its short-lived read-only access only within one fixed credential-family lifetime.

- For a temporary connection or access error in the same previously authenticated tab, use **Reconnect**.
- A new tab has no inherited credential because recovery is stored in tab-scoped `sessionStorage`, not `localStorage`.
- If the tab was closed, the credential family expired, or the monitor restarted before the one-use grant was exchanged, invoke `@codex-agent-view` again.

The private target and credentials are passed directly to the browser launcher. They are not printed for users to copy.

## Privacy and trust boundary

- The monitor binds only to IPv4 loopback (`127.0.0.1`) and has no external telemetry, hosted backend, SQLite database, or remote event store.
- Live operational state exists only in bounded process memory and resets when the monitor restarts.
- The sender minimizes hook payloads before delivery. A short task summary is locally redacted and bounded; raw prompt and tool content are not retained by the normal monitor path.
- The plugin is read-only. It cannot stop tasks, send messages, answer permission requests, or approve actions.
- Hook commands execute locally with your user account's permissions. Review and explicitly trust the exact hook definition before use.

See [Privacy](docs/privacy.md), [Security](SECURITY.md), and [Terms](docs/terms.md) for the complete boundaries.

## Uninstall

Use the explicit lifecycle command from a terminal:

```bash
codex-agent-view uninstall
```

It authenticates and stops only an owned Codex Agent View monitor, then removes the plugin and copied marketplace registration. If ownership cannot be verified, it fails without deleting uncertain files or stopping another loopback service.

To also remove only recognized owned runtime data when safe:

```bash
codex-agent-view uninstall --purge
```

`--purge` preserves unrecognized files, unrelated services, non-empty directories, and separately stored opt-in diagnostic captures. Inspect and remove any such capture by its exact path; never delete a broad Codex or home directory as a cleanup shortcut.

## Release and project documentation

The package and plugin manifest are version `0.5.2`. npm publication, registry metadata and digests, the annotated tag, GitHub Release, CI, and exact public reinstall are verified and recorded only after each step actually succeeds. npm publication is separate from submission to the Universal Plugins Directory; directory search availability is not claimed here.

- [Distribution and release evidence](docs/distribution.md)
- [Plugin directory submission status](docs/plugin-submission.md)
- [Technical findings](docs/phase-0-findings.md)
- [Roadmap](ROADMAP.md)
- [Support](SUPPORT.md)

Copyright 2026 Junho Yoon. Licensed under the Apache License 2.0; see [LICENSE](LICENSE) and [NOTICE](NOTICE).
