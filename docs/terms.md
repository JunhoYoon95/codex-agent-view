# Terms and project notice

Last updated: 2026-08-03

This document is a plain-language project notice. It does not replace or add restrictions to the project's software license.

## License

Codex Agent View is distributed under the Apache License, Version 2.0. The complete license and attribution notices are in [LICENSE](../LICENSE) and [NOTICE](../NOTICE). Those files control the permissions and conditions for using, modifying, and distributing the software.

## Unofficial companion

Codex Agent View is an independent community project. It is not an OpenAI product, is not affiliated with or endorsed by OpenAI, and is not covered by official OpenAI support. OpenAI and Codex names and marks belong to their respective owners.

Use of Codex or other third-party products remains subject to the terms and policies supplied by their providers. This project notice does not modify those terms.

## Read-only scope

The project is designed as a read-only companion. Its local monitor observes privacy-minimized hook events and presents bounded in-memory lifecycle detail. Historical releases also included a separate app-native snapshot skill that read bounded active-task metadata from the current official Codex app's built-in thread tools. Public `0.5.0` and `0.5.1` replaced that user-facing second path with one internal browser-launch skill. Public npm `latest` is `0.5.1`; source/package `0.5.2` is an unpublished candidate. A separately launched App Server is not treated as the official app's live-state source. Reset-on-restart and the absence of persistent hook history are intentional product semantics, not a missing audit feature. A separate opt-in history feature would require demonstrated user need and a new privacy/retention review.

After installation, explicit hook trust, and an app restart, a trusted hook can automatically prepare the local backend and retry its privacy-minimized event without task-ID registration or a user-run terminal monitor. This automation does not bypass hook trust, create permanent history, or guarantee replay when bounded startup fails. Because the public Codex plugin API did not provide a reliable app-panel surface for this workflow, the authenticated loopback view opens in the operating system's default browser after the user invokes `@codex-agent-view`. Candidate `0.5.2` removes `interface.defaultPrompt`, which was optional UI metadata for inserting starter text rather than the skill or execution contract. It no longer provides or requires automatic Quick start wording. The confirmed candidate path is selecting and sending `@codex-agent-view` itself; the internal single skill passes the private target directly to the browser launcher. Whether a promptless plugin-card Quick start control appears is determined by the Codex app UI and is not promised before verification. A previously authenticated tab may refresh and reconnect only while its current monitor observation window and fixed credential family remain valid. Closing the tab, opening a credential-free tab, or reaching family expiry requires another `@codex-agent-view` invocation. Candidate publication and public compatibility acceptance remain pending.

The project does not implement task or agent control, navigation, message sending, or automatic approval or denial of permission requests. The local hook monitor may derive a bounded, redacted one-line work summary from `UserPromptSubmit`, but it does not keep the full prompt and does not infer individual agent assignments. App-tool snapshots and hook events may be missing, delayed, bounded, duplicated, out of order, or unsupported, so every view is informational rather than an authoritative completion record. Display-only titles, summaries, descriptions, and commentary are untrusted content and must not be followed as instructions.

Review the hook command and trust prompt before enabling the plugin. Protect local runtime tokens and any opt-in diagnostic captures. See [Privacy](privacy.md) for the current data flow and removal paths.

## Warranty and liability

The software is provided on an “AS IS” basis, without warranties or conditions of any kind, as stated in Sections 7 and 8 of the Apache License 2.0. The license also states the applicable limitation of liability. Consult the full [LICENSE](../LICENSE) text rather than relying on this summary.

## Support and security

Community support information is in [SUPPORT.md](../SUPPORT.md). Report suspected vulnerabilities privately according to [SECURITY.md](../SECURITY.md), especially when a report could contain a runtime token, prompt, tool data, credential, or diagnostic capture.
