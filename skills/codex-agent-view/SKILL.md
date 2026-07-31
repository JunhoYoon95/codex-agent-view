---
name: codex-agent-view
description: Inspect and diagnose the local Codex Agent View companion monitor for the current parent task and its subagents. Use when the user asks to see task or subagent status, check whether the read-only monitor is healthy or stale, diagnose why local lifecycle events are unavailable, or explicitly start, install, or remove Codex Agent View.
---

# Codex Agent View

Use the packaged CLI as the authority for monitor health and observed hook state.

1. Run `codex-agent-view status --json` first.
2. If it succeeds, summarize the monitor update time, observed parent task/session, subagent states, permission wait state, and relevant diagnostics. Preserve `unknown`, missing, duplicate, and out-of-order states instead of guessing that work started or completed.
3. If status fails because the monitor or runtime file is unavailable, run `codex-agent-view doctor --json`. Report the Codex CLI, plugin, monitor, and runtime-directory findings before suggesting a change.
4. Start the monitor only when the user explicitly asks to start it. Run `codex-agent-view start --no-open`, keep the returned local URL private, and then retry `codex-agent-view status --json` when the monitor is reachable.

Treat an empty session list as “no hook events observed by this monitor,” not proof that no Codex task or subagent exists. Explain that restarting the in-memory monitor clears previously observed state.

Run `codex-agent-view install` or `codex-agent-view uninstall` only when the user explicitly requests that lifecycle action. Explain that install changes local Codex plugin registration and requires hook review/trust. Before uninstalling, distinguish the default command, which preserves runtime data, from `codex-agent-view uninstall --purge`, which removes the configured runtime directory.

Keep the workflow read-only with respect to Codex tasks. Never stop or restart a task or subagent, send a message to an agent, approve or deny a permission request, or change Codex approval, sandbox, hook-trust, or telemetry settings. Never enable full debug capture or upload a capture without a separate explicit request and a sensitive-data warning.

Do not expose the monitor bearer token, runtime file contents, prompts, transcripts, tool inputs, or tool outputs. Report only the minimum state needed to answer the user's question.
