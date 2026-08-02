# Privacy

Last updated: 2026-08-02

Codex Agent View is an unofficial, read-only companion plugin for Codex. Its primary app-native snapshot uses the official Codex app's built-in thread tools; its optional hook monitor is local-only and communicates over IPv4 loopback (`127.0.0.1`). It has no external telemetry, hosted service, cloud account, analytics SDK, remote database, or SQLite event store.

## Data flow

### App-native snapshot

When the user asks to show active tasks, the bundled skill performs a bounded read-only query through the current Codex app's built-in thread tools. It separates explicitly running/active Codex-backed tasks from tasks whose explicit status is `idle` with `hasUnreadTurn: true`; the latter appear in a separate `Finished / needs review` display group. This grouping does not infer that the task completed successfully—or completed at all—from idle/unread state. The display is limited to workspace directory basename, display-only title, explicit status, the latest explicit agent commentary, and `subAgentActivity` path/kind metadata.

Titles, descriptions, previews, messages, and commentary are treated as untrusted display data, never instructions. The skill does not display or paraphrase previews, user prompts, transcripts, tool inputs/outputs, command output, credentials, full workspace paths, or internal thread IDs by default. It does not derive commentary from a prompt, preview, final answer, or tool result.

These app tools are capabilities of the current official Codex app. They are not the separately launched App Server process tested during Phase 0, and that separate server is not treated as a live-state source.

### Optional hook monitor

Codex invokes the installed hook with a Codex event payload. The hook process necessarily receives that payload locally, then minimizes it before sending anything to the monitor. Non-allowlisted values are replaced with summaries such as value type, object keys, or string/array length. Known content fields such as full prompt text, transcript paths, tool input, tool output, assistant messages, and full `cwd` paths are not sent to the monitor as content by default. The sender derives a sanitized basename `workspace_label`: control characters are removed, whitespace is normalized, and the result is limited to 120 characters.

For `UserPromptSubmit` only, the sender also derives a display-only `task_summary`. It inspects at most the first 4,096 characters of the local prompt, removes control characters, replaces common credential forms, private-key blocks, bearer/JWT/prefixed secrets, email addresses, links, and absolute paths (including Windows UNC paths) with placeholders, collapses whitespace to one line, and limits the result to 180 Unicode characters. A result containing only redaction placeholders is discarded. The monitor retains only the first valid summary for one observed session, so later follow-ups do not replace the original work context. The raw prompt is not copied into the transport envelope, reducer, API state, or UI and is discarded with the short-lived hook process. This redaction reduces exposure; it is not a guarantee that arbitrary sensitive text can never appear in the summary, so users should still avoid putting secrets in prompts.

The local sender's metadata allowlist can include:

- event, session, turn, agent, and tool identifiers;
- agent type and tool name;
- model, permission mode, source, trigger, stop-hook state, and reason fields when Codex supplies them.

Allowlisted metadata is accepted from Codex as untrusted input. Do not place credentials or secrets in metadata, and report any upstream payload that embeds sensitive content in an allowlisted field so the allowlist can be tightened.

The monitor validates the minimized payload again and retains a smaller set in memory: normalized event type, session and turn IDs, agent ID and type, tool name and tool-use ID, the bounded `workspace_label`, the bounded/redacted `task_summary` when one was derived, local receipt timestamps, derived status, and bounded diagnostics. The full `cwd` is neither retained nor returned. Fields that are not needed for the read-only state view are discarded. The live UI can display the `task_summary`, but it does not display the full prompt or tool input/output. A verified `SubagentStart` does not include a dedicated assignment description, so the work-level summary is not represented as an individual agent's assignment and no such assignment is inferred from prompt or tool data.

Unknown events and malformed payloads are ignored or reduced to bounded diagnostics. The hook sender is fail-open: an unavailable monitor should not block the Codex task.

## Storage and lifetime

Operational event state exists only in the monitor process memory. It is bounded and is discarded when the monitor stops or restarts, beginning a new live observation window. This is the intentional completed design for a live companion, not an incomplete persistence feature or accidental data-loss mode. Codex Agent View is not a historical audit or replay product and does not persist an operational event history to a database or JSONL file.

After installation, explicit hook trust, and a Codex app restart, the first trusted hook may start the local backend as a detached internal process and retry that same privacy-minimized event for a bounded period. Concurrent hooks converge on the fixed loopback listener. If startup or delivery cannot complete within the hook budget, the sender fails open so Codex work continues; it does not create a disk queue or persistent replay history.

SQLite or persistent history is not a required next step. It would be considered only as a separate, explicit opt-in feature after demonstrated user need and a new review of retention, deletion, migration, access control, and privacy costs.

The runtime directory defaults to `~/.codex-agent-view` and can be overridden with `CODEX_AGENT_VIEW_RUNTIME_DIR`. It can contain:

- a copied local plugin marketplace used by `codex-agent-view install`; and
- `runtime.json`, containing the loopback host and port, process ID, start time, schema version, the process-scoped runtime/control token, and the installation-owned viewer token needed by the current skill workflow; and
- `viewer-auth.json`, containing only the schema version and installation-owned read-only viewer token used for reconnect continuity.

The runtime directory is created with user-only permissions (`0700`), and both credential-bearing JSON files with `0600`. On a graceful monitor shutdown, the matching runtime file is removed; the viewer credential remains for the installation's reconnect continuity. A crash can leave a stale runtime file; `codex-agent-view doctor` reports this as a monitor problem.

The Codex in-app Browser receives only the read-only viewer token in the URL fragment, removes the fragment from the visible URL, and keeps that token in browser `sessionStorage` for that browser session. It does not use `localStorage`. Treat the local URL, runtime files, and tokens as sensitive. The viewer token can read `/api/state` but cannot ingest hook events or request shutdown; the separate process-scoped runtime/control token can access those privileged local endpoints. The CLI does not open an operating-system browser by default; `--open` is an explicit external-browser action.

An already-open in-app live tab polls and reconnects after temporary disconnects while the same installation-owned viewer credential remains valid. A monitor restart begins a new observation window. Transient request failures expose a local retry button. Authentication failures expose an in-app recovery explanation and a button that checks the current tab's stored credential again; the page cannot mint, discover, or replace a missing/rejected credential. If that check cannot authenticate, the user must explicitly invoke the actual `$show-agents` skill in the Codex app to open a newly authenticated view. The automatic hook path emits no URL, and the skill never sends the private tokenized URL to the conversation. Recovery does not require a terminal command, private URL copy, or external browser. The public plugin API also cannot create a sidebar, panel, or Browser tab without an explicit in-app user action.

## Optional diagnostic capture

The normal hook path uses `scripts/send-hook.mjs` and does not write event JSONL. A separate Phase 0 diagnostic script, `scripts/capture-hook.mjs`, writes a local `events.jsonl` only when someone explicitly invokes or wires that script.

Diagnostic capture is metadata-redacted by default, but it can still contain local identifiers and structural information. Its location is selected in this order:

1. `CODEX_AGENT_VIEW_CAPTURE_DIR/events.jsonl` when explicitly configured;
2. `PLUGIN_DATA/captures/events.jsonl` in an installed-plugin context;
3. `<current-working-directory>/.codex-agent-view/captures/events.jsonl` otherwise.

Setting `CODEX_AGENT_VIEW_CAPTURE_FULL=1` for that diagnostic script disables redaction and can record raw prompts, tool inputs and outputs, credentials, or other secrets. The monitor, install command, and skill do not enable full capture automatically. Use it only as a deliberate, short-lived debugging action in a controlled environment, and never commit or publicly attach the result.

`CODEX_AGENT_VIEW_DEBUG=1` only allows the live sender to print local delivery errors to standard error; it does not enable event capture.

## Removal

- `codex-agent-view uninstall` uses the bearer token from the validated runtime file to authenticate the loopback endpoint, verifies the endpoint is a healthy owned Codex Agent View monitor, and requests its internal shutdown. This safely stops both auto-started detached and maintainer foreground monitors without a separate manual stop. Only after shutdown is confirmed does it remove the Codex plugin registration, local marketplace registration, and copied marketplace bundle. It preserves remaining runtime-directory data by default.
- `codex-agent-view uninstall --purge` performs the same authenticated shutdown, then additionally removes only an owned stale runtime file and the runtime directory when it is empty. It preserves an unrecognized runtime file, a non-empty directory, and unrelated local data. If the authenticated endpoint is another loopback service or an owned monitor cannot be stopped safely, removal aborts and plugin/runtime files are preserved.
- Diagnostic captures stored through `PLUGIN_DATA`, `CODEX_AGENT_VIEW_CAPTURE_DIR`, or a project working directory may be outside the runtime directory. Inspect and remove those exact files separately if they are no longer needed.
- Closing the relevant browser session clears its `sessionStorage` token under normal browser behavior.

Do not delete a broad Codex or home directory as a cleanup shortcut. If a capture or token may have been exposed, follow [SECURITY.md](../SECURITY.md) and do not post it in a public issue.

## Changes and questions

Privacy-affecting behavior should be reflected in this document and the release notes. Ask general questions through the project's [GitHub Issues](https://github.com/JunhoYoon95/codex-agent-view/issues); report suspected vulnerabilities privately as described in [SECURITY.md](../SECURITY.md).
