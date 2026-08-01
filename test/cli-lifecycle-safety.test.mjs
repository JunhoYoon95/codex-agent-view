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
  const browserLog = join(root, "browser-calls.jsonl");
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
} else if (args.join(" ") === "plugin list --json") {
  const sourcePath = require("node:path").join(process.env.CODEX_AGENT_VIEW_RUNTIME_DIR, "marketplace");
  process.stdout.write(JSON.stringify({ installed: [{
    pluginId: "codex-agent-view@codex-agent-view",
    enabled: process.env.FAKE_PLUGIN_DISABLED !== "1",
    version: "0.4.2",
    source: { source: "local", path: sourcePath }
  }] }) + "\\n");
} else {
  process.stdout.write('{}\\n');
}
`,
    { mode: 0o700 },
  );
  await chmod(fakeCodex, 0o700);

  if (process.platform !== "win32") {
    const browserCommand = process.platform === "darwin" ? "open" : "xdg-open";
    const fakeBrowser = join(fakeBin, browserCommand);
    await writeFile(
      fakeBrowser,
      `#!/usr/bin/env node
const { appendFileSync } = require("node:fs");
appendFileSync(process.env.FAKE_BROWSER_LOG, JSON.stringify(process.argv.slice(2)) + "\\n");
`,
      { mode: 0o700 },
    );
    await chmod(fakeBrowser, 0o700);
  }

  return { browserLog, fakeBin, log, root };
}

function cliEnvironment(setup, runtimeRoot, extra = {}) {
  return {
    ...process.env,
    PATH: `${setup.fakeBin}${delimiter}${process.env.PATH || ""}`,
    CODEX_AGENT_VIEW_RUNTIME_DIR: runtimeRoot,
    FAKE_BROWSER_LOG: setup.browserLog,
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

function waitForMonitorStart(child) {
  return new Promise((resolvePromise, reject) => {
    let stderr = "";
    let stdout = "";
    const timeout = setTimeout(
      () => reject(new Error(`monitor did not start; stdout: ${stdout}; stderr: ${stderr}`)),
      5_000,
    );
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      if (stdout.includes("Codex Agent View is running at")) {
        clearTimeout(timeout);
        resolvePromise(stdout);
      }
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once("close", (code) => {
      if (!stdout.includes("Codex Agent View is running at")) {
        clearTimeout(timeout);
        reject(new Error(`monitor exited before start with code ${code}; stderr: ${stderr}`));
      }
    });
  });
}

function stopMonitorChild(child) {
  return new Promise((resolvePromise) => {
    child.once("close", (code, signal) => resolvePromise({ code, signal }));
    child.kill("SIGTERM");
  });
}

async function waitForBrowserCall(path) {
  const deadline = Date.now() + 2_000;
  while (Date.now() < deadline) {
    const calls = await readCalls(path);
    if (calls.length > 0) return calls;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 20));
  }
  return [];
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

test("purge stops a healthy owned monitor before removing registration and runtime data", async (t) => {
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
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /Removed plugin, marketplace, and runtime data/);
  assert.deepEqual(await readCalls(setup.log), [
    ["plugin", "remove", "codex-agent-view@codex-agent-view", "--json"],
    ["plugin", "marketplace", "remove", "codex-agent-view", "--json"],
  ]);
  assert.equal(monitor.server.address(), null);
  await assertMissing(runtimeRoot);
});

test("normal uninstall stops a healthy owned monitor instead of leaving an orphan", async (t) => {
  if (process.platform === "win32") {
    t.skip("fake executable fixture uses a POSIX shebang");
    return;
  }
  const setup = await fixture(t);
  const runtimeRoot = join(setup.root, "runtime");
  const install = await runCli(setup, runtimeRoot, ["install"]);
  assert.equal(install.code, 0, install.stderr);
  const env = { CODEX_AGENT_VIEW_RUNTIME_DIR: runtimeRoot };
  const monitor = await startMonitorServer({ env, port: 0 });
  t.after(async () => monitor.close());

  const result = await runCli(setup, runtimeRoot, ["uninstall"]);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /Stopped the owned monitor/);
  assert.equal(monitor.server.address(), null);
  await assertMissing(runtimeFile(env));
  await assertMissing(join(runtimeRoot, "marketplace"));
});

test("uninstall rejects unknown, duplicate, and positional arguments before changing plugin or runtime state", async (t) => {
  if (process.platform === "win32") {
    t.skip("fake executable fixture uses a POSIX shebang");
    return;
  }
  const setup = await fixture(t);
  const runtimeRoot = join(setup.root, "runtime");
  const install = await runCli(setup, runtimeRoot, ["install"]);
  assert.equal(install.code, 0, install.stderr);
  const env = { CODEX_AGENT_VIEW_RUNTIME_DIR: runtimeRoot };
  const monitor = await startMonitorServer({ env, port: 0 });
  t.after(async () => monitor.close());
  await writeFile(setup.log, "");

  const invalidCases = [
    {
      args: ["uninstall", "--unknown"],
      message: /unknown uninstall option: --unknown/,
    },
    {
      args: ["uninstall", "--purge", "--purge"],
      message: /--purge may only be specified once/,
    },
    {
      args: ["uninstall", "unexpected"],
      message: /unexpected uninstall argument: unexpected/,
    },
  ];

  for (const invalidCase of invalidCases) {
    const result = await runCli(setup, runtimeRoot, invalidCase.args);
    assert.equal(result.code, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, invalidCase.message);
    assert.equal(monitor.server.listening, true);
    assert.equal((await readRuntimeInfo(env)).token, monitor.runtimeInfo.token);
    await access(join(runtimeRoot, "marketplace"));
    assert.deepEqual(await readCalls(setup.log), []);
  }
});

test("purge stops a foreground start process without sending it a signal", async (t) => {
  if (process.platform === "win32") {
    t.skip("foreground process fixture uses a POSIX shebang");
    return;
  }
  const setup = await fixture(t);
  const runtimeRoot = join(setup.root, "foreground-runtime");
  const install = await runCli(setup, runtimeRoot, ["install"]);
  assert.equal(install.code, 0, install.stderr);
  const child = spawnCli(setup, runtimeRoot, ["start", "--port", "0", "--no-open"]);
  await waitForMonitorStart(child);
  const exited = new Promise((resolvePromise) => {
    child.once("close", (code, signal) => resolvePromise({ code, signal }));
  });

  const purge = await runCli(setup, runtimeRoot, ["uninstall", "--purge"]);
  assert.equal(purge.code, 0, purge.stderr);
  assert.deepEqual(await exited, { code: 0, signal: null });
  await assertMissing(runtimeRoot);
});

test("purge preserves an unrecognized runtime file", async (t) => {
  if (process.platform === "win32") {
    t.skip("fake executable fixture uses a POSIX shebang");
    return;
  }
  const setup = await fixture(t);
  const runtimeRoot = join(setup.root, "unknown-runtime");
  const install = await runCli(setup, runtimeRoot, ["install"]);
  assert.equal(install.code, 0, install.stderr);
  await writeFile(runtimeFile({ CODEX_AGENT_VIEW_RUNTIME_DIR: runtimeRoot }), "user-owned\n");

  const purge = await runCli(setup, runtimeRoot, ["uninstall", "--purge"]);
  assert.equal(purge.code, 0, purge.stderr);
  assert.match(purge.stdout, /unrecognized runtime file.*preserved/);
  assert.equal(
    await readFile(runtimeFile({ CODEX_AGENT_VIEW_RUNTIME_DIR: runtimeRoot }), "utf8"),
    "user-owned\n",
  );
});

test("purge preserves a runtime that points to an unrelated loopback service", async (t) => {
  if (process.platform === "win32") {
    t.skip("fake executable fixture uses a POSIX shebang");
    return;
  }
  const setup = await fixture(t);
  const runtimeRoot = join(setup.root, "unrelated-runtime");
  const install = await runCli(setup, runtimeRoot, ["install"]);
  assert.equal(install.code, 0, install.stderr);

  const unrelated = createServer((request, response) => {
    if (request.url === "/api/state") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end("{}\n");
      return;
    }
    response.writeHead(404, { "content-type": "application/json" });
    response.end('{"error":"not found"}\n');
  });
  await new Promise((resolvePromise, reject) => {
    unrelated.once("error", reject);
    unrelated.listen(0, LOOPBACK_HOST, resolvePromise);
  });
  t.after(
    () =>
      new Promise((resolvePromise) => {
        unrelated.close(() => resolvePromise());
      }),
  );
  const address = unrelated.address();
  assert(address && typeof address !== "string");
  const runtime = {
    host: LOOPBACK_HOST,
    pid: process.pid,
    port: address.port,
    schema_version: RUNTIME_SCHEMA_VERSION,
    started_at_ms: Date.now(),
    token: "u".repeat(43),
  };
  const env = { CODEX_AGENT_VIEW_RUNTIME_DIR: runtimeRoot };
  await writeRuntimeInfo(runtime, env);
  await writeFile(setup.log, "");

  const purge = await runCli(setup, runtimeRoot, ["uninstall", "--purge"]);
  assert.equal(purge.code, 1);
  assert.match(purge.stderr, /not identified as an owned monitor/);
  assert.deepEqual(await readCalls(setup.log), []);
  assert.deepEqual(await readRuntimeInfo(env), runtime);
  await access(join(runtimeRoot, "marketplace"));
  assert.notEqual(unrelated.address(), null);
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
  const stopped = await stopMonitorChild(child);
  assert.equal(stopped.code, 0);
  await assertMissing(runtimeFile({ CODEX_AGENT_VIEW_RUNTIME_DIR: staleRoot }));
});

test("start opens an external browser only when --open is explicit", async (t) => {
  if (process.platform === "win32") {
    t.skip("signal and fake executable fixture is POSIX-specific");
    return;
  }
  const setup = await fixture(t);

  const defaultRoot = join(setup.root, "default-no-open-runtime");
  const defaultChild = spawnCli(setup, defaultRoot, ["start", "--port", "0"]);
  const defaultStdout = await waitForMonitorStart(defaultChild);
  assert.match(defaultStdout, /http:\/\/127\.0\.0\.1:\d+\/#token=/);
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 150));
  assert.deepEqual(await readCalls(setup.browserLog), []);
  const defaultStopped = await stopMonitorChild(defaultChild);
  assert.equal(defaultStopped.code, 0);

  const explicitRoot = join(setup.root, "explicit-open-runtime");
  const explicitChild = spawnCli(setup, explicitRoot, [
    "start",
    "--port",
    "0",
    "--open",
  ]);
  await waitForMonitorStart(explicitChild);
  const browserCalls = await waitForBrowserCall(setup.browserLog);
  assert.equal(browserCalls.length, 1);
  assert.equal(browserCalls[0].length, 1);
  assert.match(browserCalls[0][0], /^http:\/\/127\.0\.0\.1:\d+\/#token=/);
  const explicitStopped = await stopMonitorChild(explicitChild);
  assert.equal(explicitStopped.code, 0);
});

test("start accepts legacy --no-open and rejects conflicting or unknown arguments", async (t) => {
  if (process.platform === "win32") {
    t.skip("signal and fake executable fixture is POSIX-specific");
    return;
  }
  const setup = await fixture(t);

  const legacyRoot = join(setup.root, "legacy-no-open-runtime");
  const legacyChild = spawnCli(setup, legacyRoot, [
    "start",
    "--port",
    "0",
    "--no-open",
  ]);
  await waitForMonitorStart(legacyChild);
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 150));
  assert.deepEqual(await readCalls(setup.browserLog), []);
  const legacyStopped = await stopMonitorChild(legacyChild);
  assert.equal(legacyStopped.code, 0);

  const invalidCases = [
    {
      args: ["start", "--open", "--no-open"],
      message: /--open and --no-open cannot be used together/,
    },
    {
      args: ["start", "--unknown"],
      message: /unknown start option: --unknown/,
    },
    {
      args: ["start", "unexpected"],
      message: /unexpected start argument: unexpected/,
    },
    {
      args: ["start", "--port"],
      message: /--port requires a value/,
    },
    {
      args: ["start", "--port", "0", "--port", "1"],
      message: /--port may only be specified once/,
    },
  ];

  for (const [index, invalidCase] of invalidCases.entries()) {
    const runtimeRoot = join(setup.root, `invalid-runtime-${index}`);
    const result = await runCli(setup, runtimeRoot, invalidCase.args);
    assert.equal(result.code, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, invalidCase.message);
    await assertMissing(runtimeFile({ CODEX_AGENT_VIEW_RUNTIME_DIR: runtimeRoot }));
  }

  assert.deepEqual(await readCalls(setup.browserLog), []);

  const help = await runCli(setup, join(setup.root, "help-runtime"), ["help"]);
  assert.equal(help.code, 0, help.stderr);
  assert.match(help.stdout, /start \[--port <port>\] \[--open\]/);
  assert.doesNotMatch(help.stdout, /\[--no-open\]/);
});

test("doctor distinguishes valid registration from unobservable hook trust and no events", async (t) => {
  if (process.platform === "win32") {
    t.skip("fake executable fixture uses a POSIX shebang");
    return;
  }
  const setup = await fixture(t);
  const runtimeRoot = join(setup.root, "runtime");
  const install = await runCli(setup, runtimeRoot, ["install"]);
  assert.equal(install.code, 0, install.stderr);
  assert.match(install.stdout, /Registration verified: installed and enabled/);
  assert.match(install.stdout, /Hook trust cannot be granted or inspected non-interactively/);

  const env = { CODEX_AGENT_VIEW_RUNTIME_DIR: runtimeRoot };
  const monitor = await startMonitorServer({ env, port: 0 });
  t.after(async () => monitor.close());

  const result = await runCli(setup, runtimeRoot, ["doctor", "--json"]);
  assert.equal(result.code, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.deepEqual(report.plugin, {
    enabled: true,
    installed: true,
    source_path: join(runtimeRoot, "marketplace"),
    version: "0.4.2",
  });
  assert.equal(report.hook.wiring_ok, true);
  assert.equal(report.hook.trust, "unknown");
  assert.equal(report.monitor.ok, true);
  assert.equal(report.monitor.events_received, false);
  assert.equal(
    report.diagnostics.some(({ code }) => code === "no_hook_events_observed"),
    true,
  );
});

test("status explains that an empty snapshot is a hook-delivery diagnostic", async (t) => {
  if (process.platform === "win32") {
    t.skip("fake executable fixture uses a POSIX shebang");
    return;
  }
  const setup = await fixture(t);
  const runtimeRoot = join(setup.root, "runtime");
  const env = { CODEX_AGENT_VIEW_RUNTIME_DIR: runtimeRoot };
  const monitor = await startMonitorServer({ env, port: 0 });
  t.after(async () => monitor.close());

  const result = await runCli(setup, runtimeRoot, ["status"]);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /0 task\(s\), 0 subagent\(s\) observed/);
  assert.match(result.stdout, /No hook event has reached this monitor yet/);
  assert.match(result.stdout, /review `\/hooks`/);
});

test("install fails clearly when Codex registers the plugin as disabled", async (t) => {
  if (process.platform === "win32") {
    t.skip("fake executable fixture uses a POSIX shebang");
    return;
  }
  const setup = await fixture(t);
  const runtimeRoot = join(setup.root, "runtime");
  const result = await runCli(setup, runtimeRoot, ["install"], {
    env: { FAKE_PLUGIN_DISABLED: "1" },
  });
  assert.equal(result.code, 1);
  assert.match(result.stderr, /registered but is disabled/);
});
