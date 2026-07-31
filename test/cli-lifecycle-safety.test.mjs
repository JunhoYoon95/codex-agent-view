import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  access,
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  LOOPBACK_HOST,
  RUNTIME_SCHEMA_VERSION,
  readRuntimeInfo,
  runtimeFile,
  writeRuntimeInfo,
} from "../src/runtime/config.mjs";
import { startMonitorServer } from "../src/runtime/server.mjs";

const PACKAGE_ROOT = resolve(fileURLToPath(new URL("../", import.meta.url)));
const CLI = join(PACKAGE_ROOT, "bin", "codex-agent-view.mjs");

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "codex-agent-view-cli-"));
  t.after(async () => rm(root, { force: true, recursive: true }));
  const fakeBin = join(root, "fake-bin");
  const log = join(root, "codex-calls.jsonl");
  await mkdir(fakeBin);
  const fakeCodex = join(fakeBin, "codex");
  // Keep this extensionless POSIX executable in CommonJS syntax: Node 18 parses
  // it as CJS even though newer Node releases may detect ESM syntax here.
  await writeFile(
    fakeCodex,
    `#!/usr/bin/env node
const { appendFileSync } = require("node:fs");
const args = process.argv.slice(2);
appendFileSync(process.env.FAKE_CODEX_LOG, JSON.stringify(args) + "\\n");
if (args.join(" ") === "plugin marketplace list --json") {
  process.stdout.write('{"marketplaces":[]}\\n');
} else {
  process.stdout.write('{}\\n');
}
`,
    { mode: 0o700 },
  );
  await chmod(fakeCodex, 0o700);
  return { fakeBin, log, root };
}

function cliEnvironment(setup, runtimeRoot, extra = {}) {
  return {
    ...process.env,
    PATH: `${setup.fakeBin}${delimiter}${process.env.PATH || ""}`,
    CODEX_AGENT_VIEW_RUNTIME_DIR: runtimeRoot,
    FAKE_CODEX_LOG: setup.log,
    ...extra,
  };
}

function spawnCli(setup, runtimeRoot, args, options = {}) {
  return spawn(process.execPath, [CLI, ...args], {
    cwd: options.cwd || PACKAGE_ROOT,
    env: cliEnvironment(setup, runtimeRoot, options.env),
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function collectChild(child) {
  return new Promise((resolvePromise, reject) => {
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", reject);
    child.once("close", (code, signal) => {
      resolvePromise({ code, signal, stderr, stdout });
    });
  });
}

async function runCli(setup, runtimeRoot, args, options = {}) {
  return collectChild(spawnCli(setup, runtimeRoot, args, options));
}

async function readCalls(path) {
  try {
    return (await readFile(path, "utf8"))
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

async function reserveLoopbackPort() {
  const server = createServer();
  await new Promise((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(0, LOOPBACK_HOST, resolvePromise);
  });
  const address = server.address();
  assert(address && typeof address !== "string");
  const port = address.port;
  await new Promise((resolvePromise, reject) => {
    server.close((error) => (error ? reject(error) : resolvePromise()));
  });
  return port;
}

async function writeStaleRuntime(runtimeRoot, token = "s".repeat(43)) {
  const port = await reserveLoopbackPort();
  await writeRuntimeInfo(
    {
      host: LOOPBACK_HOST,
      pid: process.pid,
      port,
      schema_version: RUNTIME_SCHEMA_VERSION,
      started_at_ms: Date.now(),
      token,
    },
    { CODEX_AGENT_VIEW_RUNTIME_DIR: runtimeRoot },
  );
  return { port, token };
}

async function assertMissing(path) {
  await assert.rejects(access(path), { code: "ENOENT" });
}

test("refuses to replace or uninstall an unmanaged marketplace directory", async (t) => {
  if (process.platform === "win32") {
    t.skip("fake executable fixture uses a POSIX shebang");
    return;
  }
  const setup = await fixture(t);
  const runtimeRoot = join(setup.root, "runtime");
  const marketplace = join(runtimeRoot, "marketplace");
  const sentinel = join(marketplace, "user-sentinel.txt");
  await mkdir(marketplace, { recursive: true });
  await writeFile(sentinel, "keep me\n");

  const install = await runCli(setup, runtimeRoot, ["install"]);
  assert.equal(install.code, 1);
  assert.match(install.stderr, /unmanaged directory/);
  assert.equal(await readFile(sentinel, "utf8"), "keep me\n");

  await writeFile(setup.log, "");
  const uninstall = await runCli(setup, runtimeRoot, ["uninstall", "--purge"]);
  assert.equal(uninstall.code, 1);
  assert.match(uninstall.stderr, /unmanaged directory/);
  assert.equal(await readFile(sentinel, "utf8"), "keep me\n");
  assert.deepEqual(await readCalls(setup.log), []);
});

test("refuses a symbolic-link runtime root without touching its target", async (t) => {
  if (process.platform === "win32") {
    t.skip("symbolic-link and fake executable fixture is POSIX-specific");
    return;
  }
  const setup = await fixture(t);
  const target = join(setup.root, "user-directory");
  const runtimeRoot = join(setup.root, "runtime-link");
  const sentinel = join(target, "user-sentinel.txt");
  await mkdir(target);
  await writeFile(sentinel, "keep me\n");
  await symlink(target, runtimeRoot);

  const result = await runCli(setup, runtimeRoot, ["uninstall", "--purge"]);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /symbolic link runtime directory/);
  assert.equal(await readFile(sentinel, "utf8"), "keep me\n");
  assert.deepEqual(await readCalls(setup.log), []);
});

test("refuses purge before registration changes while the monitor is running", async (t) => {
  if (process.platform === "win32") {
    t.skip("fake executable fixture uses a POSIX shebang");
    return;
  }
  const setup = await fixture(t);
  const runtimeRoot = join(setup.root, "runtime");
  const env = { CODEX_AGENT_VIEW_RUNTIME_DIR: runtimeRoot };
  const monitor = await startMonitorServer({ env, port: 0 });
  t.after(async () => monitor.close());

  const result = await runCli(setup, runtimeRoot, ["uninstall", "--purge"]);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /monitor is running/);
  assert.deepEqual(await readCalls(setup.log), []);
  assert.equal((await readRuntimeInfo(env)).token, monitor.runtimeInfo.token);
});

test("purge removes only owned files and preserves a broad root sentinel", async (t) => {
  if (process.platform === "win32") {
    t.skip("fake executable fixture uses a POSIX shebang");
    return;
  }
  const setup = await fixture(t);
  const runtimeRoot = join(setup.root, "broad-home");
  await mkdir(runtimeRoot);
  const homeEnv = { HOME: runtimeRoot };
  const install = await runCli(setup, runtimeRoot, ["install"], { env: homeEnv });
  assert.equal(install.code, 0, install.stderr);
  const sentinel = join(runtimeRoot, "user-sentinel.txt");
  await writeFile(sentinel, "keep me\n");
  await writeStaleRuntime(runtimeRoot);

  const purge = await runCli(setup, runtimeRoot, ["uninstall", "--purge"], {
    env: homeEnv,
  });
  assert.equal(purge.code, 0, purge.stderr);
  assert.match(purge.stdout, /were preserved/);
  assert.equal(await readFile(sentinel, "utf8"), "keep me\n");
  await assertMissing(join(runtimeRoot, "marketplace"));
  await assertMissing(runtimeFile({ CODEX_AGENT_VIEW_RUNTIME_DIR: runtimeRoot }));
});

test("purge removes a managed bundle, valid stale runtime file, and empty runtime root", async (t) => {
  if (process.platform === "win32") {
    t.skip("fake executable fixture uses a POSIX shebang");
    return;
  }
  const setup = await fixture(t);
  const runtimeRoot = join(setup.root, "runtime");
  const install = await runCli(setup, runtimeRoot, ["install"]);
  assert.equal(install.code, 0, install.stderr);
  await writeStaleRuntime(runtimeRoot);

  const purge = await runCli(setup, runtimeRoot, ["uninstall", "--purge"]);
  assert.equal(purge.code, 0, purge.stderr);
  assert.match(purge.stdout, /Removed plugin, marketplace, and runtime data/);
  await assertMissing(runtimeRoot);
});

test("start rejects a live runtime without orphaning it and replaces a valid stale runtime", async (t) => {
  if (process.platform === "win32") {
    t.skip("signal and fake executable fixture is POSIX-specific");
    return;
  }
  const setup = await fixture(t);
  const liveRoot = join(setup.root, "live-runtime");
  const liveEnv = { CODEX_AGENT_VIEW_RUNTIME_DIR: liveRoot };
  const monitor = await startMonitorServer({ env: liveEnv, port: 0 });
  t.after(async () => monitor.close());

  const duplicate = await runCli(setup, liveRoot, ["start", "--port", "0", "--no-open"]);
  assert.equal(duplicate.code, 1);
  assert.equal(duplicate.stdout, "");
  assert.match(duplicate.stderr, /already running/);
  assert.equal((await readRuntimeInfo(liveEnv)).token, monitor.runtimeInfo.token);

  const staleRoot = join(setup.root, "stale-runtime");
  const stale = await writeStaleRuntime(staleRoot);
  const child = spawnCli(setup, staleRoot, ["start", "--port", "0", "--no-open"]);
  let stdout = "";
  child.stdout.setEncoding("utf8");
  const started = new Promise((resolvePromise, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`monitor did not start; stdout: ${stdout}`)),
      5_000,
    );
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      if (stdout.includes("Codex Agent View is running at")) {
        clearTimeout(timeout);
        resolvePromise();
      }
    });
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once("close", (code) => {
      if (!stdout.includes("Codex Agent View is running at")) {
        clearTimeout(timeout);
        reject(new Error(`monitor exited before start with code ${code}`));
      }
    });
  });
  await started;
  const replacement = await readRuntimeInfo({
    CODEX_AGENT_VIEW_RUNTIME_DIR: staleRoot,
  });
  assert.notEqual(replacement.token, stale.token);
  child.kill("SIGTERM");
  const stopped = await new Promise((resolvePromise) => {
    child.once("close", (code, signal) => resolvePromise({ code, signal }));
  });
  assert.equal(stopped.code, 0);
  await assertMissing(runtimeFile({ CODEX_AGENT_VIEW_RUNTIME_DIR: staleRoot }));
});
