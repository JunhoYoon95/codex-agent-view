import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function readJson(relativePath) {
  return JSON.parse(await readFile(resolve(projectRoot, relativePath), "utf8"));
}

async function assertRegularFile(relativePath) {
  const path = resolve(projectRoot, relativePath);
  await access(path);
  assert.equal((await stat(path)).isFile(), true, `${relativePath} must be a file`);
}

test("keeps the npm 0.2.0 executable and publish surface intact", async () => {
  const packageMetadata = await readJson("package.json");

  assert.equal(packageMetadata.name, "codex-agent-view");
  assert.equal(packageMetadata.version, "0.2.0");
  assert.deepEqual(packageMetadata.bin, {
    "codex-agent-view": "./bin/codex-agent-view.mjs",
  });

  const requiredFiles = [
    ".agents/",
    ".codex-plugin/",
    "assets/",
    "bin/",
    "hooks/",
    "public/",
    "scripts/capture-hook.mjs",
    "scripts/send-hook.mjs",
    "skills/",
    "src/",
    "README.md",
    "LICENSE",
    "NOTICE",
  ];
  assert.ok(Array.isArray(packageMetadata.files), "package files must be an array");
  for (const entry of requiredFiles) {
    assert.ok(packageMetadata.files.includes(entry), `package files must include ${entry}`);
  }

  await assertRegularFile("bin/codex-agent-view.mjs");
  await assertRegularFile("assets/logo.svg");
  await assertRegularFile("assets/logo-dark.svg");
  await assertRegularFile("public/index.html");
  await assertRegularFile("public/app.js");
  await assertRegularFile("public/styles.css");
});

test("has no postinstall side effects or production dependencies", async () => {
  const packageMetadata = await readJson("package.json");

  assert.equal(Object.hasOwn(packageMetadata.scripts ?? {}, "postinstall"), false);
  for (const field of [
    "dependencies",
    "optionalDependencies",
    "bundledDependencies",
    "bundleDependencies",
  ]) {
    const value = packageMetadata[field];
    const empty = value === undefined ||
      (Array.isArray(value) ? value.length === 0 : Object.keys(value).length === 0);
    assert.equal(empty, true, `${field} must be absent or empty`);
  }
});

test("keeps legal links secure and branding assets local", async () => {
  const manifest = await readJson(".codex-plugin/plugin.json");
  assert.equal(manifest.version, "0.2.0");

  const legalUrls = [
    manifest.interface?.websiteURL,
    manifest.interface?.privacyPolicyURL,
    manifest.interface?.termsOfServiceURL,
  ];
  for (const value of legalUrls) {
    assert.equal(typeof value, "string");
    assert.equal(new URL(value).protocol, "https:", `${value} must use HTTPS`);
  }

  assert.match(manifest.interface.privacyPolicyURL, /\/docs\/privacy\.md$/);
  assert.match(manifest.interface.termsOfServiceURL, /\/docs\/terms\.md$/);
  await assertRegularFile("docs/privacy.md");
  await assertRegularFile("docs/terms.md");

  for (const field of ["composerIcon", "logo", "logoDark"]) {
    const asset = manifest.interface?.[field];
    assert.match(asset, /^\.\/assets\/[A-Za-z0-9._-]+\.svg$/);
    await assertRegularFile(asset.slice(2));
  }
});

test("routes every supported hook through the live sender", async () => {
  const config = await readJson("hooks/hooks.json");
  const expectedEvents = [
    "SubagentStart",
    "SubagentStop",
    "PreToolUse",
    "PostToolUse",
    "PermissionRequest",
  ];
  const expectedCommand = 'node "${PLUGIN_ROOT}/scripts/send-hook.mjs"';

  assert.deepEqual(Object.keys(config.hooks ?? {}).sort(), [...expectedEvents].sort());
  for (const event of expectedEvents) {
    const groups = config.hooks[event];
    assert.ok(Array.isArray(groups) && groups.length > 0, `${event} hook is required`);
    for (const group of groups) {
      assert.ok(Array.isArray(group.hooks) && group.hooks.length > 0);
      for (const handler of group.hooks) {
        assert.equal(handler.type, "command");
        assert.equal(handler.command, expectedCommand);
        assert.doesNotMatch(handler.command, /capture-hook\.mjs/);
      }
    }
  }

  await assertRegularFile("scripts/send-hook.mjs");
});
