#!/usr/bin/env node

import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";

const manifestUrl = new URL("../.codex-plugin/plugin.json", import.meta.url);
const packageUrl = new URL("../package.json", import.meta.url);
const marketplaceUrl = new URL("../.agents/plugins/marketplace.json", import.meta.url);
const hooksUrl = new URL("../hooks/hooks.json", import.meta.url);
const captureScriptUrl = new URL("./capture-hook.mjs", import.meta.url);
const senderScriptUrl = new URL("./send-hook.mjs", import.meta.url);
const skillUrl = new URL("../skills/codex-agent-view/SKILL.md", import.meta.url);
const licenseUrl = new URL("../LICENSE", import.meta.url);
const noticeUrl = new URL("../NOTICE", import.meta.url);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

const manifest = await readJson(manifestUrl);
const packageMetadata = await readJson(packageUrl);
assert(
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.test(manifest.version),
  "manifest version must be strict semver",
);
assert(typeof manifest.description === "string" && manifest.description.length > 0, "manifest description is required");
assert(!("hooks" in manifest), "default hooks/hooks.json discovery should not need a manifest hooks entry");
assert(packageMetadata.name === manifest.name, "package name must match the manifest");
assert(packageMetadata.version === manifest.version, "package version must match the manifest");
assert(
  typeof manifest.interface?.shortDescription === "string" &&
    manifest.interface.shortDescription.length <= 30,
  "manifest shortDescription must be 30 characters or fewer",
);
assert(
  packageMetadata.license === "Apache-2.0" && manifest.license === "Apache-2.0",
  "package and manifest license must be Apache-2.0",
);
assert(
  Array.isArray(packageMetadata.files) && packageMetadata.files.includes("NOTICE"),
  "npm package files must include NOTICE",
);

const licenseText = await readFile(licenseUrl, "utf8");
assert(
  licenseText.includes("Apache License") &&
    licenseText.includes("Version 2.0, January 2004") &&
    licenseText.includes("END OF TERMS AND CONDITIONS"),
  "LICENSE must contain the Apache License 2.0 text",
);
const noticeText = await readFile(noticeUrl, "utf8");
assert(
  noticeText.trim() === "Codex Agent View\nCopyright 2026 Junho Yoon",
  "NOTICE must identify Codex Agent View and Copyright 2026 Junho Yoon",
);

const marketplace = await readJson(marketplaceUrl);
assert(isObject(marketplace), "marketplace catalog must be a JSON object");
assert(
  marketplace.name === manifest.name,
  "marketplace name must match the manifest",
);
assert(isObject(marketplace.interface), "marketplace interface must be an object");
assert(
  marketplace.interface.displayName === "Codex Agent View",
  "marketplace display name must be Codex Agent View",
);
assert(
  Array.isArray(marketplace.plugins) && marketplace.plugins.length === 1,
  "marketplace must contain exactly one plugin entry",
);

const [marketplaceEntry] = marketplace.plugins;
assert(isObject(marketplaceEntry), "marketplace plugin entry must be an object");
assert(
  marketplaceEntry.name === manifest.name,
  "marketplace plugin name must match the manifest",
);
assert(isObject(marketplaceEntry.source), "marketplace plugin source must be an object");
assert(
  marketplaceEntry.source.source === "local",
  "marketplace plugin source must be local",
);
assert(
  marketplaceEntry.source.path === "./",
  "marketplace plugin source path must be ./",
);
assert(isObject(marketplaceEntry.policy), "marketplace plugin policy must be an object");
assert(
  marketplaceEntry.policy.installation === "AVAILABLE",
  "marketplace installation policy must be AVAILABLE",
);
assert(
  marketplaceEntry.policy.authentication === "ON_INSTALL",
  "marketplace authentication policy must be ON_INSTALL",
);
assert(
  marketplaceEntry.category === "Productivity",
  "marketplace category must be Productivity",
);

const config = await readJson(hooksUrl);
const expectedEvents = [
  "SubagentStart",
  "SubagentStop",
  "PreToolUse",
  "PostToolUse",
  "PermissionRequest",
];
const expectedCommand = 'node "${PLUGIN_ROOT}/scripts/send-hook.mjs"';

for (const event of expectedEvents) {
  const groups = config.hooks?.[event];
  assert(Array.isArray(groups) && groups.length > 0, `${event} hook is required`);
  for (const group of groups) {
    assert(
      group !== null && typeof group === "object" && !Array.isArray(group),
      `${event} hook group must be an object`,
    );
    assert(
      Array.isArray(group.hooks) && group.hooks.length > 0,
      `${event} needs a command handler`,
    );
    for (const handler of group.hooks) {
      assert(
        handler !== null && typeof handler === "object" && !Array.isArray(handler),
        `${event} handler must be an object`,
      );
      assert(handler.type === "command", `${event} handler type must be command`);
      assert(
        handler.command === expectedCommand,
        `${event} handler must invoke the bundled capture script`,
      );
      assert(
        Number.isInteger(handler.timeout) && handler.timeout > 0,
        `${event} handler timeout must be a positive integer`,
      );
    }
  }
}

await access(captureScriptUrl, constants.R_OK);
await access(senderScriptUrl, constants.R_OK);
await access(skillUrl, constants.R_OK);
for (const field of ["composerIcon", "logo", "logoDark"]) {
  const value = manifest.interface?.[field];
  assert(
    typeof value === "string" && value.startsWith("./assets/"),
    `manifest interface.${field} must reference a bundled asset`,
  );
  await access(new URL(`../${value.slice(2)}`, import.meta.url), constants.R_OK);
}
process.stdout.write("Plugin scaffold validation passed.\n");
