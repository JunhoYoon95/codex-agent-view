import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { gunzip } from "node:zlib";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const execFileAsync = promisify(execFile);
const gunzipAsync = promisify(gunzip);

async function readJson(relativePath) {
  return JSON.parse(await readFile(resolve(projectRoot, relativePath), "utf8"));
}

async function assertRegularFile(relativePath) {
  const path = resolve(projectRoot, relativePath);
  await access(path);
  assert.equal((await stat(path)).isFile(), true, `${relativePath} must be a file`);
}

function readTarEntry(archive, targetPath) {
  let offset = 0;
  while (offset + 512 <= archive.length) {
    const header = archive.subarray(offset, offset + 512);
    const name = header.subarray(0, 100).toString("utf8").replace(/\0.*$/s, "");
    const prefix = header.subarray(345, 500).toString("utf8").replace(/\0.*$/s, "");
    if (!name) break;
    const path = prefix ? `${prefix}/${name}` : name;
    const sizeText = header.subarray(124, 136).toString("ascii").replace(/\0.*$/s, "").trim();
    const size = Number.parseInt(sizeText || "0", 8);
    assert.equal(Number.isFinite(size), true, `invalid tar entry size for ${path}`);
    const contentStart = offset + 512;
    if (path === targetPath) {
      return archive.subarray(contentStart, contentStart + size);
    }
    offset = contentStart + Math.ceil(size / 512) * 512;
  }
  throw new Error(`${targetPath} is missing from npm package archive`);
}

function npmPackEnvironment() {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key.toLowerCase().replaceAll("-", "_") === "npm_config_dry_run") {
      delete env[key];
    }
  }
  return env;
}

test("keeps the npm 0.4.2 executable and publish surface intact", async () => {
  const packageMetadata = await readJson("package.json");

  assert.equal(packageMetadata.name, "codex-agent-view");
  assert.equal(packageMetadata.version, "0.4.2");
  assert.match(packageMetadata.description, /trusted-hook auto-prepared local live backend/);
  assert.deepEqual(packageMetadata.bin, {
    "codex-agent-view": "bin/codex-agent-view.mjs",
  });

  const requiredFiles = [
    ".agents/",
    ".codex-plugin/",
    "assets/",
    "bin/",
    "hooks/",
    "public/",
    "scripts/auto-start-monitor.mjs",
    "scripts/capture-hook.mjs",
    "scripts/send-hook.mjs",
    "skills/",
    "src/",
    "README.md",
    "README.ko.md",
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
  await assertRegularFile("scripts/auto-start-monitor.mjs");
  await assertRegularFile("README.md");
  await assertRegularFile("README.ko.md");
});

test("keeps the executable mapping in npm pack metadata", async (t) => {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "codex-agent-view-pack-"));
  t.after(async () => rm(temporaryDirectory, { force: true, recursive: true }));
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const { stderr, stdout } = await execFileAsync(
    npmCommand,
    [
      "pack",
      "--dry-run=false",
      "--ignore-scripts",
      "--json",
      "--pack-destination",
      temporaryDirectory,
      "--cache",
      join(temporaryDirectory, "npm-cache"),
    ],
    {
      cwd: projectRoot,
      env: npmPackEnvironment(),
      maxBuffer: 2 * 1024 * 1024,
    },
  );
  assert.doesNotMatch(stderr, /bin\[codex-agent-view\].*invalid/i);

  const packResult = JSON.parse(stdout);
  assert.equal(packResult.length, 1);
  assert.equal(
    packResult[0].files.some(({ path }) => path === "README.ko.md"),
    true,
    "npm package must include README.ko.md",
  );
  const tarball = await readFile(join(temporaryDirectory, packResult[0].filename));
  const archive = await gunzipAsync(tarball);
  assert.ok(readTarEntry(archive, "package/README.ko.md").length > 0);
  const packedMetadata = JSON.parse(
    readTarEntry(archive, "package/package.json").toString("utf8"),
  );
  assert.deepEqual(packedMetadata.bin, {
    "codex-agent-view": "bin/codex-agent-view.mjs",
  });
});

test("uses an English root README with an absolute GitHub link to the Korean guide", async () => {
  const rootReadme = await readFile(resolve(projectRoot, "README.md"), "utf8");

  assert.match(rootReadme, /^# Codex Agent View$/m);
  assert.match(rootReadme, /^## Quick start\b.*$/m);
  assert.doesNotMatch(rootReadme, /[가-힣]/);
  assert.match(
    rootReadme,
    /\[Read in Korean\]\(https:\/\/github\.com\/JunhoYoon95\/codex-agent-view\/blob\/main\/README\.ko\.md\)/,
  );
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
  assert.equal(manifest.version, "0.4.2");
  assert.deepEqual(
    manifest.interface?.defaultPrompt,
    ["$show-agents"],
    "plugin starter prompt explicitly invokes the bundled Show Agents skill",
  );
  assert.doesNotMatch(manifest.interface.defaultPrompt[0], /@codex-agent-view/);
  assert.match(manifest.description, /trusted-hook auto-prepared local live backend/);
  assert.match(manifest.interface.longDescription, /trusted-hook auto-prepared local live backend/);

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
    "SessionStart",
    "SessionEnd",
    "UserPromptSubmit",
    "Stop",
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
  await assertRegularFile("scripts/auto-start-monitor.mjs");
});
