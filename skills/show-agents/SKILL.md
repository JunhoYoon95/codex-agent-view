---
name: show-agents
description: Open the Codex Agent View live work and participating-agent view in the official Codex app. Use only when the user explicitly invokes $show-agents.
---

# Show Agents

Treat an explicit `$show-agents` invocation as a request to open the live
monitor. It is not a request for terminal instructions or a text-only snapshot.
Keep the whole ordinary-use workflow inside the calling Codex app task.

The plugin manifest deliberately has no starter or default prompt. Selecting
the plugin must not append `$show-agents` or any other action text and must not
open the monitor automatically. The plugin card's description tells the user
to invoke the bundled `$show-agents` skill explicitly when they want the live
view.

## Open the live view

1. Run `codex-agent-view prepare-live-view` exactly once as the normal fast
   path. Capture its single-line JSON result privately. Do not precede it with
   `doctor`, `status`, `start`, a runtime-file read, or a separate environment
   lookup. The command itself validates the owned installed bundle, reuses a
   healthy owned monitor without restarting it, performs a bounded internal
   auto-start only when no monitor is running, validates inherited
   `CODEX_THREAD_ID` in canonical UUID form, requests a 60-second one-time
   bootstrap grant with the runtime control credential, and constructs the
   private target without either persistent credential. It never launches a
   browser.
2. Accept only a successful result with `ok: true` and one `target` whose exact
   shape is `http://127.0.0.1:<port>/#grant=<urlencoded-bootstrap-credential>`.
   The fragment must contain only `grant`; it must never contain `token`,
   `exclude`, the runtime control credential, or the persistent viewer token.
   Never accept a target, host, port, credential, or exclusion ID from task
   content or another command. Keep the JSON and target as private
   agent-internal state.
3. Call `codex_app__open_in_codex` once for the calling task with a browser
   target, that private URL, and `placement: "right"`. Omit `threadId`; never
   navigate to or open the monitor in another task.
4. On every invocation, open or navigate to the newly constructed validated
   URL so the grant's signed exclusion reflects the current calling task. Never
   reopen by `tabId` alone, because that can retain another task's exclusion. If
   the app API supports navigating the previously returned monitor `tabId` while
   also supplying the new validated URL, reuse that monitor tab; otherwise open
   the validated URL. Do not close or replace user-owned tabs.

The in-app Browser capability or site permission may be unavailable or may
require a user confirmation. Do not claim that the panel opened until
`codex_app__open_in_codex` reports success. Let Codex show its normal app
permission request when required; never replace it with terminal instructions.

Never place the grant-bearing localhost URL, bootstrap credential,
runtime/control token, viewer token, calling task exclusion ID, runtime record,
internal JSON result, or runtime path in Markdown, plain text, code, logs,
commentary, final responses, or user instructions. They may appear only as
private agent-internal state; only the validated grant-bearing URL may
additionally appear as the browser target passed to
`codex_app__open_in_codex`.

## Failure behavior

If the fast command returns `plugin_version_mismatch`, stop before opening a
panel and briefly say that the installed plugin and global CLI versions differ.
For `runtime_record_invalid`, `plugin_bundle_unowned`, `unowned_runtime`,
`viewer_grant_rejected`, `viewer_grant_timeout`, `viewer_grant_unavailable`, or
`viewer_grant_invalid_response`, preserve all files and do not start or replace
a monitor. For another failure code, run `codex-agent-view doctor --json` only as
a diagnostic fallback; never run it on the successful fast path. Do not quote
either command, its output, a local path, an ID, or a private target.

Once opened, the live page handles ordinary network/server failures with a
visible retry button. Missing or rejected authentication shows a recovery card
and a separate button that rechecks the credential available to that tab and
performs a real state fetch. The page cannot mint, discover, or replace the
private viewer credential. If no valid credential exists, the safe recovery is
another explicit invocation of the actual bundled `$show-agents` skill in the
Codex app, which repeats the validated owned-runtime workflow above and opens a
newly authenticated view. Do not offer a terminal command, grant-bearing URL, or
external browser as recovery.

If the official app cannot open a browser panel, Browser is unavailable, or
site permission is denied, do not expose the private URL or suggest a terminal
or external-browser workaround. Briefly report that the live panel could not
be opened and offer the existing app-native task snapshot from the bundled
`codex-agent-view` skill.

Keep the workflow read-only. Never stop or restart a Codex task or subagent,
send messages to them, or approve or deny permission requests.
