# Terms and project notice

Last updated: 2026-08-01

This document is a plain-language project notice. It does not replace or add restrictions to the project's software license.

## License

Codex Agent View is distributed under the Apache License, Version 2.0. The complete license and attribution notices are in [LICENSE](../LICENSE) and [NOTICE](../NOTICE). Those files control the permissions and conditions for using, modifying, and distributing the software.

## Unofficial companion

Codex Agent View is an independent community project. It is not an OpenAI product, is not affiliated with or endorsed by OpenAI, and is not covered by official OpenAI support. OpenAI and Codex names and marks belong to their respective owners.

Use of Codex or other third-party products remains subject to the terms and policies supplied by their providers. This project notice does not modify those terms.

## Read-only scope

The project is designed to observe privacy-minimized local hook events and present an in-memory status view. It does not implement task or subagent control, message sending, or automatic approval or denial of permission requests. Missing, delayed, duplicated, out-of-order, or unsupported hook events can make the view incomplete or stale, so the monitor is informational rather than an authoritative completion record.

Review the hook command and trust prompt before enabling the plugin. Protect local runtime tokens and any opt-in diagnostic captures. See [Privacy](privacy.md) for the current data flow and removal paths.

## Warranty and liability

The software is provided on an “AS IS” basis, without warranties or conditions of any kind, as stated in Sections 7 and 8 of the Apache License 2.0. The license also states the applicable limitation of liability. Consult the full [LICENSE](../LICENSE) text rather than relying on this summary.

## Support and security

Community support information is in [SUPPORT.md](../SUPPORT.md). Report suspected vulnerabilities privately according to [SECURITY.md](../SECURITY.md), especially when a report could contain a runtime token, prompt, tool data, credential, or diagnostic capture.
