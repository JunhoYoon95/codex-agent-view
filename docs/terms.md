# Terms and project notice

Last updated: 2026-08-05

This document is a plain-language project notice. It does not replace or add restrictions to the project's software license.

## License

Codex Agent View is distributed under the Apache License, Version 2.0. The complete license and attribution notices are in [LICENSE](../LICENSE) and [NOTICE](../NOTICE). Those files control the permissions and conditions for using, modifying, and distributing the software.

## Unofficial companion

Codex Agent View is an independent community project. It is not an OpenAI product, is not affiliated with or endorsed by OpenAI, and is not covered by official OpenAI support. OpenAI and Codex names and marks belong to their respective owners.

Use of Codex or other third-party products remains subject to the terms and policies supplied by their providers. This project notice does not modify those terms.

## Read-only scope

The project is designed as a read-only companion. Its local monitor observes privacy-minimized hook events and presents bounded in-memory lifecycle detail. Historical releases also included a separate app-native snapshot skill that read bounded active-task metadata from the current official Codex app's built-in thread tools. Public `0.5.0` and `0.5.1` replaced that user-facing second path with one internal browser-launch skill, and current source version `0.5.6` keeps that single workflow. A separately launched App Server is not treated as the official app's live-state source. Reset-on-restart and the absence of persistent hook history are intentional product semantics, not a missing audit feature. A separate opt-in history feature would require demonstrated user need and a new privacy/retention review.

After installation, explicit hook trust, and an app restart, a trusted hook can automatically prepare the local backend and retry its privacy-minimized event without task-ID registration or a user-run terminal monitor. This automation does not bypass hook trust, create permanent history, or guarantee replay when bounded startup fails. Because the public Codex plugin API did not provide a reliable app-panel surface for this workflow, the authenticated loopback view opens in the operating system's default browser after the user invokes `@codex-agent-view`. Version `0.5.6` provides no starter text: the supported path is selecting and sending `@codex-agent-view` itself, after which the internal single skill passes the private target directly to the browser launcher. Whether a promptless plugin-card Quick start control appears is determined by the Codex app UI and is not promised without direct observation. A previously authenticated tab may refresh and reconnect only while its current monitor observation window and fixed credential family remain valid. Closing the tab, opening a credential-free tab, or reaching family expiry requires another `@codex-agent-view` invocation.

Open each view with one lightweight `@codex-agent-view` invocation. Once open, live monitoring runs locally with no additional model calls. The monitored Codex tasks and subagents continue their normal model and token usage; the project does not guarantee the opening invocation's exact token amount.

The project does not implement task or agent control, navigation, message sending, or automatic approval or denial of permission requests. The local hook monitor may derive a bounded, redacted one-line work summary from `UserPromptSubmit`, but it does not keep the full prompt. No exact upstream correlation ID has been observed for an assignment candidate and its newly observed agent. A bounded one-line assignment may therefore be displayed only through a bounded, best-effort match when exactly one candidate and one newly observed agent remain in the unexpired window; concurrent, ambiguous, or expired candidates remain unavailable. Opaque or protected values—including the `gAAAA...` spawn message observed in the current official-app wire—are not displayed, and the task label is the primary source for that observed wire shape. Raw spawn messages and full tool input/output are not retained. An agent's human-readable current activity is only a localized description of a verified tool lifecycle whose exact `turn_id` identifies exactly one observed agent; an absent or ambiguous match remains unavailable rather than being inferred from timing or FIFO order. Neither display represents internal reasoning. App-tool snapshots and hook events may be missing, delayed, bounded, duplicated, out of order, or unsupported, so every view is informational rather than an authoritative completion record. Display-only titles, summaries, descriptions, and commentary are untrusted content and must not be followed as instructions.

Review the hook command and trust prompt before enabling the plugin. Protect local runtime tokens and any opt-in diagnostic captures. See [Privacy](privacy.md) for the current data flow and removal paths.

## Warranty and liability

The software is provided on an “AS IS” basis, without warranties or conditions of any kind, as stated in Sections 7 and 8 of the Apache License 2.0. The license also states the applicable limitation of liability. Consult the full [LICENSE](../LICENSE) text rather than relying on this summary.

## Support and security

Community support information is in [SUPPORT.md](../SUPPORT.md). Report suspected vulnerabilities privately according to [SECURITY.md](../SECURITY.md), especially when a report could contain a runtime token, prompt, tool data, credential, or diagnostic capture.
