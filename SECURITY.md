# Security policy

## Supported versions

Security fixes are provided on a best-effort basis for the latest published Codex Agent View release. Before a stable release exists, reproduce against the latest repository version when safe to do so. Older versions may be asked to upgrade before investigation.

## Report a vulnerability privately

Use the repository's [private vulnerability report](https://github.com/JunhoYoon95/codex-agent-view/security/advisories/new) whenever available.

Include:

- the Codex Agent View and Codex versions, operating system, and install method;
- a concise impact statement and reproducible steps;
- whether the official Codex app, Codex CLI, or both are affected;
- the smallest redacted evidence needed to understand the issue; and
- any suggested mitigation or coordinated-disclosure timing.

Do not include a raw hook payload, full diagnostic capture, prompt, transcript, tool input or output, credential, bearer token, or unredacted local path unless a private channel has been confirmed and the data is strictly necessary. Replace secrets with stable placeholders. If GitHub private reporting is unavailable, open a minimal public issue requesting a private contact channel without disclosing vulnerability details.

Examples of security-relevant reports include an external network bind, authentication bypass, exposure of prompt or tool content, unsafe runtime-file permissions, command injection, path traversal or symlink issues, and install or uninstall behavior that can modify or remove unintended user data.

Ordinary UI defects, stale-state behavior caused by known missing hook events, and feature requests can use [GitHub Issues](https://github.com/JunhoYoon95/codex-agent-view/issues) after sensitive data is removed.

## Security boundary

The intended runtime is read-only with respect to Codex tasks, binds only to `127.0.0.1`, requires a local bearer token for state and event APIs, and stores operational event state in bounded process memory. These controls reduce risk but do not make a shared local machine or an exposed token trustworthy. The monitor does not approve permissions, control tasks or subagents, or provide an authoritative audit log.

The normal hook sender minimizes payloads before loopback delivery and fails open if the monitor is unavailable. Full diagnostic capture is a separate, explicit opt-in and can contain secrets; never attach it to a public report.

## Disclosure process

Maintainers will acknowledge and investigate reports as capacity allows, may request a minimal reproduction, and will coordinate a fix and disclosure when the issue is confirmed. No response or remediation deadline is guaranteed. Please avoid public disclosure until a reasonable coordination attempt has completed.
