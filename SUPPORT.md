# Support

Codex Agent View is an unofficial community project. Support is best-effort and does not replace official OpenAI support for Codex, accounts, billing, or service availability.

## Before opening an issue

1. Use the latest available release and review the [README](README.md).
2. Run `codex-agent-view doctor --json` and note the Codex Agent View version, Codex version, operating system, installation method, and whether the problem occurs in the app, CLI, or both.
3. Reduce the report to reproducible steps and the expected and actual behavior.
4. Remove runtime tokens, local paths, prompts, transcripts, tool inputs and outputs, credentials, and other personal or proprietary data.

If the UI is connected but empty, run `codex-agent-view doctor --json` and distinguish `monitor.ok` from `monitor.events_received`. A healthy monitor with `events_received: false` means no hook reached this observation window; it does not prove that Codex has no running task. Check that the plugin is installed and enabled, review and trust the current exact hook definition in interactive Codex CLI `/hooks`, fully restart an app process that was open before installation, and reproduce in a new task. The CLI JSON plugin list does not expose persisted exact-hook trust, so report it as unverified rather than guessing.

For a zero-event report, include the redacted values of plugin version, Codex app/CLI version, app versus CLI runtime, whether the app was fully restarted after installation, whether the test task was created after trust, and the `doctor` diagnostic codes. Do not include the runtime bearer token or raw hook payload.

Open a public bug report or feature request in [GitHub Issues](https://github.com/JunhoYoon95/codex-agent-view/issues). Search existing issues first and include only redacted diagnostic output. Passing the local validator or a fixture test does not by itself prove official Codex app compatibility, so identify the exact runtime you tested.

## Sensitive reports

Do not post a raw hook capture, full debug capture, runtime file, bearer token, credential, prompt, or tool data in a public issue. Report suspected security problems through the private process in [SECURITY.md](SECURITY.md).

For questions about official Codex behavior, OpenAI accounts, billing, or platform incidents, use OpenAI's official documentation and support channels. This repository can investigate only Codex Agent View's own code and integration behavior.
