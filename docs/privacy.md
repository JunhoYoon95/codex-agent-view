# Privacy

Last updated: 2026-08-01

Codex Agent View is an unofficial, local-only companion monitor for Codex. It has no external telemetry, hosted service, cloud account, analytics SDK, remote database, or SQLite event store. Its normal runtime communicates only over IPv4 loopback (`127.0.0.1`).

## Data flow

Codex invokes the installed hook with a Codex event payload. The hook process necessarily receives that payload locally, then minimizes it before sending anything to the monitor. Non-allowlisted values are replaced with summaries such as value type, object keys, or string/array length. Known content fields such as full prompt text, transcript paths, tool input, tool output, and assistant messages are not sent to the monitor as content by default.

The local sender's metadata allowlist can include:

- event, session, turn, agent, and tool identifiers;
- agent type and tool name;
- model, permission mode, source, trigger, stop-hook state, and reason fields when Codex supplies them.

Allowlisted metadata is accepted from Codex as untrusted input. Do not place credentials or secrets in metadata, and report any upstream payload that embeds sensitive content in an allowlisted field so the allowlist can be tightened.

The monitor validates the minimized payload again and retains a smaller set in memory: normalized event type, session and turn IDs, agent ID and type, tool name and tool-use ID, local receipt timestamps, derived status, and bounded diagnostics. Fields that are not needed for the read-only state view are discarded. The UI and `status` output do not display prompt or tool input/output content.

Unknown events and malformed payloads are ignored or reduced to bounded diagnostics. The hook sender is fail-open: an unavailable monitor should not block the Codex task.

## Storage and lifetime

Operational event state exists only in the monitor process memory. It is bounded and is discarded when the monitor stops or restarts. Codex Agent View does not persist an operational event history to a database or JSONL file.

The runtime directory defaults to `~/.codex-agent-view` and can be overridden with `CODEX_AGENT_VIEW_RUNTIME_DIR`. It can contain:

- a copied local plugin marketplace used by `codex-agent-view install`; and
- `runtime.json`, containing the loopback host and port, process ID, start time, schema version, and a random bearer token.

The runtime directory is created with user-only permissions (`0700`), and `runtime.json` with `0600`. On a graceful monitor shutdown, the matching runtime file is removed. A crash can leave a stale runtime file; `codex-agent-view doctor` reports this as a monitor problem.

The browser receives the token in the URL fragment, removes the fragment from the visible URL, and keeps the token in browser `sessionStorage` for that browser session. It does not use `localStorage`. Treat the local URL, runtime file, and token as sensitive because another local process or person with access to them could read monitor state or submit events.

## Optional diagnostic capture

The normal hook path uses `scripts/send-hook.mjs` and does not write event JSONL. A separate Phase 0 diagnostic script, `scripts/capture-hook.mjs`, writes a local `events.jsonl` only when someone explicitly invokes or wires that script.

Diagnostic capture is metadata-redacted by default, but it can still contain local identifiers and structural information. Its location is selected in this order:

1. `CODEX_AGENT_VIEW_CAPTURE_DIR/events.jsonl` when explicitly configured;
2. `PLUGIN_DATA/captures/events.jsonl` in an installed-plugin context;
3. `<current-working-directory>/.codex-agent-view/captures/events.jsonl` otherwise.

Setting `CODEX_AGENT_VIEW_CAPTURE_FULL=1` for that diagnostic script disables redaction and can record raw prompts, tool inputs and outputs, credentials, or other secrets. The monitor, install command, and skill do not enable full capture automatically. Use it only as a deliberate, short-lived debugging action in a controlled environment, and never commit or publicly attach the result.

`CODEX_AGENT_VIEW_DEBUG=1` only allows the live sender to print local delivery errors to standard error; it does not enable event capture.

## Removal

Stop the monitor with `Ctrl+C` before removing it when practical.

- `codex-agent-view uninstall` removes the Codex plugin registration, local marketplace registration, and copied marketplace bundle. It preserves the remaining runtime directory by default.
- `codex-agent-view uninstall --purge` additionally removes the configured runtime directory. Review the resolved directory reported by `codex-agent-view doctor` before using purge.
- Diagnostic captures stored through `PLUGIN_DATA`, `CODEX_AGENT_VIEW_CAPTURE_DIR`, or a project working directory may be outside the runtime directory. Inspect and remove those exact files separately if they are no longer needed.
- Closing the relevant browser session clears its `sessionStorage` token under normal browser behavior.

Do not delete a broad Codex or home directory as a cleanup shortcut. If a capture or token may have been exposed, follow [SECURITY.md](../SECURITY.md) and do not post it in a public issue.

## Changes and questions

Privacy-affecting behavior should be reflected in this document and the release notes. Ask general questions through the project's [GitHub Issues](https://github.com/JunhoYoon95/codex-agent-view/issues); report suspected vulnerabilities privately as described in [SECURITY.md](../SECURITY.md).
