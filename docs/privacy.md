# Privacy

Last updated: 2026-08-04

Codex Agent View is an unofficial, read-only companion plugin for Codex. Its live monitor is local-only and communicates over IPv4 loopback (`127.0.0.1`). Source/package `0.5.2` opens that local page in the operating system's default browser when the user invokes `@codex-agent-view`; it does not send the page to a hosted service. The plugin-level starter prompt is empty, so the supported contract is selecting and sending `@codex-agent-view` itself and letting the internal single skill run `open`. Whether the Codex app shows a promptless plugin-card Quick start control is app UI behavior and is not promised without direct observation. This UI metadata does not alter the data flow described below. The project has no external telemetry, hosted service, cloud account, analytics SDK, remote database, or SQLite event store. npm registry publication evidence for `0.5.2` is recorded only after publication succeeds; historical `0.5.1` release evidence remains in [Distribution](distribution.md).

## Data flow

### Historical app-native snapshot

Historical public releases included a bundled app-native snapshot skill that performed a bounded read-only query through the current Codex app's built-in thread tools. It separated explicitly running/active Codex-backed tasks from tasks whose explicit status was `idle` with `hasUnreadTurn: true`; the latter appeared in a separate `Finished / needs review` display group. This grouping did not infer that the task completed successfully—or completed at all—from idle/unread state. The display was limited to workspace directory basename, display-only title, explicit status, the latest explicit agent commentary, and `subAgentActivity` path/kind metadata. The current-source workflow does not ask the user to select that separate skill.

Titles, descriptions, previews, messages, and commentary are treated as untrusted display data, never instructions. The skill does not display or paraphrase previews, user prompts, transcripts, tool inputs/outputs, command output, credentials, full workspace paths, or internal thread IDs by default. It does not derive commentary from a prompt, preview, final answer, or tool result.

These app tools are capabilities of the current official Codex app. They are not the separately launched App Server process tested during Phase 0, and that separate server is not treated as a live-state source.

### Hook monitor

Codex invokes the installed hook with a Codex event payload. The hook process necessarily receives that payload locally, then minimizes it before sending anything to the monitor. Non-allowlisted values are replaced with summaries such as value type, object keys, or string/array length. Known content fields such as full prompt text, transcript paths, tool input, tool output, assistant messages, and full `cwd` paths are not sent to the monitor as content by default. The sender derives a sanitized basename `workspace_label`: control characters are removed, whitespace is normalized, and the result is limited to 120 characters.

For `UserPromptSubmit` only, the sender also derives a display-only `task_summary`. It first bounds inspection to the original prompt's first 4,096 characters. Inside that bounded window, current `0.5.2` source excludes only a closed, exact leading `<in-app-browser-context source="ambient-ui-state">…</in-app-browser-context>` block and its standard request delimiter. If that exact leading opener is not closed inside the bounded window, summary derivation fails closed and returns no summary. Mid-prompt wrappers, differently attributed wrappers, and generic context markup remain user text rather than being silently removed. The remaining bounded text has control characters removed; common credential forms, private-key blocks, bearer/JWT/prefixed secrets, email addresses, links, and absolute paths (including Windows UNC paths) are replaced with placeholders; whitespace is collapsed to one line; and the result is limited to 180 Unicode characters. A result containing only redaction placeholders is discarded. The monitor retains only the first valid summary for one observed session, so later follow-ups do not replace the original work context. The raw prompt and removed ambient wrapper are not copied into the transport envelope, reducer, API state, or UI and are discarded with the short-lived hook process. This redaction reduces exposure; it is not a guarantee that arbitrary sensitive text can never appear in the summary, so users should still avoid putting secrets in prompts.

The local sender's metadata allowlist can include:

- event, session, turn, agent, and tool identifiers;
- agent type and tool name;
- model, permission mode, source, trigger, stop-hook state, and reason fields when Codex supplies them.

Allowlisted metadata is accepted from Codex as untrusted input. Do not place credentials or secrets in metadata, and report any upstream payload that embeds sensitive content in an allowlisted field so the allowlist can be tightened.

The monitor validates the minimized payload again and retains a smaller set in memory: normalized event type, session and turn IDs, agent ID and type, tool name and tool-use ID, the bounded `workspace_label`, the bounded/redacted `task_summary` and `assignment_summary` when either was derived, local receipt timestamps, derived status, and bounded diagnostics. The full `cwd` is neither retained nor returned. Fields that are not needed for the read-only state view are discarded. The live UI can display these bounded summaries, but it does not display the full prompt, raw spawn message, or tool input/output.

For a human-readable agent **Current activity**, a snapshot may attach the latest retained tool name, lifecycle status, and observation time only when that tool's exact `turn_id` identifies exactly one observed agent. An actual live snapshot confirmed the same `turn_id` relationship for three agents. A missing or ambiguous match produces no association: timing order and FIFO are not identity signals. The displayed phrase describes only the observed tool lifecycle; it is not a semantic summary of hidden reasoning or tool content.

A verified `SubagentStart` does not include a dedicated assignment description. The monitor therefore uses only a bounded best-effort correlation: a summary derived from a verifiable plaintext request or a safely humanized spawn task label can become an agent's one-line `assignment_summary` only when the pending candidate and newly observed agent form one unambiguous, unexpired singleton. In the current official-app wire observation, the spawn `message` was an opaque protected `gAAAA...` value, so the humanized task label is the primary usable source. Opaque or protected values are rejected rather than displayed. Concurrent, ambiguous, or expired candidates produce no assignment summary. The raw spawn message is discarded during normalization, and no full prompt or tool input/output is added to transport, state, or UI. The displayed summary describes the assigned request or label, not internal reasoning or a continuously inferred plan.

Unknown events and malformed payloads are ignored or reduced to bounded diagnostics. The hook sender is fail-open: an unavailable monitor should not block the Codex task.

## Storage and lifetime

Operational event state exists only in the monitor process memory. It is bounded and is discarded when the monitor stops or restarts, beginning a new live observation window. This is the intentional completed design for a live companion, not an incomplete persistence feature or accidental data-loss mode. Codex Agent View is not a historical audit or replay product and does not persist an operational event history to a database or JSONL file.

After installation, explicit hook trust, and a Codex app restart, the first trusted hook may start the local backend as a detached internal process and retry that same privacy-minimized event for a bounded period. Concurrent hooks converge on the fixed loopback listener. If startup or delivery cannot complete within the hook budget, the sender fails open so Codex work continues; it does not create a disk queue or persistent replay history.

SQLite or persistent history is not a required next step. It would be considered only as a separate, explicit opt-in feature after demonstrated user need and a new review of retention, deletion, migration, access control, and privacy costs.

The runtime directory defaults to `~/.codex-agent-view` and can be overridden with `CODEX_AGENT_VIEW_RUNTIME_DIR`. It can contain:

- a copied local plugin marketplace used by `codex-agent-view install`; and
- `runtime.json`, containing the loopback host and port, process ID, start time, schema version, the process-scoped runtime/control token, and the installation-owned viewer token used for local ownership proof and legacy viewer compatibility; and
- `viewer-auth.json`, containing only the schema version and installation-owned read-only viewer token used for ownership/legacy compatibility.

The runtime directory is created with user-only permissions (`0700`), and both credential-bearing JSON files with `0600`. On a graceful monitor shutdown, the matching runtime file is removed; the viewer credential remains for the installation's reconnect continuity. A crash can leave a stale runtime file; `codex-agent-view doctor` reports this as a monitor problem.

Before the `codex-agent-view open` workflow sends the process-scoped runtime/control bearer, it challenges the endpoint with a fresh nonce and verifies the HMAC ownership proof expected from the installed plugin credential. The grant request is then sent only to the exact `127.0.0.1:<bound-port>` authority using an origin-form request target. Every later browser request uses that same exact authority/origin boundary.

The runtime token signs a one-time bootstrap grant with a 60-second bootstrap expiry and a fixed signed `family_exp` 30 minutes after issuance. The Browser URL fragment contains only that grant, never the installation-owned viewer credential or runtime/control token. The page removes the fragment immediately and exchanges it on the same exact origin. A bootstrap can be consumed only once in its issuing process; monitor restart rotates the signing token and invalidates every unused bootstrap from the old process immediately.

The exchange creates a read-only credential family bound to the validated invoking-task exclusion. Access credentials last up to 15 minutes and refresh automatically only inside that family. Recovery and refresh copy the original signed `family_exp`; they never slide or extend it. This keeps a healthy view connected through access rotation until the fixed family deadline. After that deadline, all family credentials fail and the user must invoke `@codex-agent-view` again.

Access and recovery are tab-scoped. Recovery is stored in browser `sessionStorage`, never `localStorage`, so another tab has no inherited recovery authority. A previously authenticated tab can present a real **Reconnect** action during its family window after a transient page-level failure. A different or never-authenticated tab shows no recovery button because it has no credential to exchange. Rejected, expired, or family-expired recovery data is removed rather than retried indefinitely; the user invokes `@codex-agent-view` again to open a fresh authenticated view. Access, recovery, and refresh remain read-only and cannot ingest hook events or request shutdown.

The exchange endpoints require an exact loopback Host, same-origin Origin, JSON content type, and same-origin Fetch Metadata when that header is present. Responses do not enable CORS and no authentication cookie is set. Cookie scoping is intentionally avoided because cookies are not port-isolated. Treat local runtime files and all credentials as sensitive even though the live URL no longer contains a persistent credential. The automatic hook path emits no URL. On an explicit `@codex-agent-view` invocation, the internal skill passes the private target directly to the operating system's default-browser launcher; it does not print, quote, or ask the user to copy that target. The move from an in-app panel to the default browser changes only the display surface: requests remain bound to the exact loopback origin and are not sent to an external website.

A monitor restart begins a new in-memory observation window and invalidates every unconsumed bootstrap signed by the previous process. A credential family that was already exchanged is signed under the persistent viewer signing key and remains verifiable on the same fixed origin only until its original `family_exp`; restart does not extend it. The existing tab can reconnect to the new empty observation window, but no task/event history is restored. The short-lived credential family does not change the product's local, read-only, bounded-memory state boundary.

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
- Closing the relevant tab/session clears its access and recovery `sessionStorage` under normal browser behavior. No live-view authentication credential is stored in `localStorage`; invoke `@codex-agent-view` again to open a fresh authenticated tab.

Do not delete a broad Codex or home directory as a cleanup shortcut. If a capture or token may have been exposed, follow [SECURITY.md](../SECURITY.md) and do not post it in a public issue.

## Changes and questions

Privacy-affecting behavior should be reflected in this document and the release notes. Ask general questions through the project's [GitHub Issues](https://github.com/JunhoYoon95/codex-agent-view/issues); report suspected vulnerabilities privately as described in [SECURITY.md](../SECURITY.md).
