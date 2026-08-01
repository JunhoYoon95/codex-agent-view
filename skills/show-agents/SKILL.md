---
name: show-agents
description: Open the Codex Agent View live task and subagent monitor in the official Codex app. Use when the user explicitly selects the bundled Show Agents skill from the app's @ menu.
---

# Show Agents

Treat selection of the bundled **Show Agents** skill from the Codex app's `@`
menu as an explicit request to open the live monitor, not as a request for
terminal instructions or a text-only snapshot. Keep the whole ordinary-use
workflow inside the calling Codex app task.

## Open the live view

1. Check the packaged monitor with `codex-agent-view status --json`. Capture
   the result internally; do not quote the command, raw output, runtime path,
   IDs, or private URL in commentary or the final response.
2. If the monitor is healthy, reuse it. Recover its authenticated URL from the
   owned private runtime record without restarting it, because restarting would
   discard the current in-memory observation window.
3. If the monitor is not healthy, run `codex-agent-view start --no-open` as a
   persistent internal process and capture the authenticated URL it returns.
   Never use `--open` or launch an external browser.
4. Accept the URL only when it uses `http`, host `127.0.0.1`, a valid local
   port, and the expected non-empty fragment token. Treat every other target as
   invalid and do not open it.
5. Call `codex_app__open_in_codex` for the calling task with a browser target,
   the validated private URL, and `placement: "right"`. Omit `threadId`; never
   navigate to or open the monitor in another task.
6. If a previous successful call in the current context supplied the same
   monitor tab's `tabId`, prefer reopening that browser target by `tabId`.
   Otherwise open the validated URL. Do not close or replace user-owned tabs.

The in-app Browser capability or site permission may be unavailable or may
require a user confirmation. Do not claim that the panel opened until
`codex_app__open_in_codex` reports success. Let Codex show its normal app
permission request when required; never replace it with terminal instructions.

Never place the tokenized localhost URL in Markdown, plain text, code, logs, or
user instructions. It may appear only as private agent-internal state and as
the browser target passed to `codex_app__open_in_codex`.

## Failure behavior

If the official app cannot open a browser panel, Browser is unavailable, or
site permission is denied, do not expose the private URL or suggest a terminal
or external-browser workaround. Briefly report that the live panel could not
be opened and offer the existing app-native task snapshot from the bundled
`codex-agent-view` skill.

Keep the workflow read-only. Never stop or restart a Codex task or subagent,
send messages to them, or approve or deny permission requests.
