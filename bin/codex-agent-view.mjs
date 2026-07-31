#!/usr/bin/env node

import {
  cp,
  lstat,
  mkdir,
  readFile,
  rm,
  rmdir,
  writeFile,
} from "node:fs/promises";
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { startMonitorServer } from "../src/runtime/server.mjs";
import {
  DEFAULT_PORT,
  readRuntimeInfo,
  removeRuntimeInfo,
  runtimeDirectory,
  runtimeFile,
} from "../src/runtime/config.mjs";

const PACKAGE_ROOT = resolve(fileURLToPath(new URL("../", import.meta.url)));
const PLUGIN_ID = "codex-agent-view@codex-agent-view";
const MARKETPLACE_NAME = "codex-agent-view";
const BUNDLE_MARKER = ".codex-agent-view-owned.json";
const BUNDLE_MARKER_SCHEMA_VERSION = 1;
const INSTALL_ENTRIES = [
  ".agents",
  ".codex-plugin",
  "assets",
  "bin",
  "hooks",
  "public",
  "scripts",
  "skills",
  "src",
  "LICENSE",
  "NOTICE",
  "README.md",
  "package.json",
];

async function packageVersion() {
  return JSON.parse(await readFile(join(PACKAGE_ROOT, "package.json"), "utf8")).version;
}

function printHelp() {
  process.stdout.write(`Codex Agent View

Usage:
  codex-agent-view start [--port <port>] [--no-open]
  codex-agent-view status [--json]
  codex-agent-view doctor [--json]
  codex-agent-view install
  codex-agent-view uninstall [--purge]
  codex-agent-view --version

The monitor is read-only and binds only to 127.0.0.1.
`);
}

function optionValue(args, name) {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

function run(command, args, { allowFailure = false } = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      env: process.env,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
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
    child.once("close", (code) => {
      const result = { code: code ?? 1, stderr, stdout };
      if (!allowFailure && result.code !== 0) {
        reject(new Error(stderr.trim() || `${command} exited with ${result.code}`));
        return;
      }
      resolvePromise(result);
    });
  });
}

function openBrowser(url) {
  const command =
    process.platform === "darwin"
      ? ["open", [url]]
      : process.platform === "win32"
        ? ["cmd", ["/c", "start", "", url]]
        : ["xdg-open", [url]];
  const child = spawn(command[0], command[1], {
    detached: true,
    shell: false,
    stdio: "ignore",
  });
  child.unref();
  child.on("error", () => {});
}

async function start(args) {
  const requestedPort = optionValue(args, "--port");
  const port = requestedPort === undefined ? DEFAULT_PORT : Number(requestedPort);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error("--port must be an integer from 0 to 65535");
  }

  const runtime = await inspectRuntime();
  if (runtime.kind === "unknown") {
    throw new Error(
      `refusing to replace unrecognized runtime file at ${runtimeFile()}; move it explicitly and retry`,
    );
  }
  if (runtime.kind === "valid" && (await runtimeResponds(runtime.info))) {
    throw new Error("a Codex Agent View monitor is already running; stop it before starting another");
  }

  const monitor = await startMonitorServer({ port });
  process.stdout.write(`Codex Agent View is running at ${monitor.url}\n`);
  process.stdout.write("Press Ctrl+C to stop the in-memory monitor.\n");
  if (!args.includes("--no-open")) {
    openBrowser(monitor.url);
  }

  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    await monitor.close();
    process.exitCode = 0;
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}

async function fetchState() {
  const runtime = await readRuntimeInfo();
  const response = await fetch(`http://${runtime.host}:${runtime.port}/api/state`, {
    headers: { authorization: `Bearer ${runtime.token}` },
    signal: AbortSignal.timeout(1_500),
  });
  if (!response.ok) {
    throw new Error(`monitor returned HTTP ${response.status}`);
  }
  return response.json();
}

async function status(args) {
  const snapshot = await fetchState();
  if (args.includes("--json")) {
    process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\n`);
    return;
  }
  const sessions = Array.isArray(snapshot.sessions) ? snapshot.sessions : [];
  const agents = sessions.reduce(
    (count, session) => count + (Array.isArray(session.agents) ? session.agents.length : 0),
    0,
  );
  process.stdout.write(`${sessions.length} task(s), ${agents} subagent(s) observed.\n`);
  for (const session of sessions) {
    process.stdout.write(`- ${session.session_id}: ${session.status} (${session.agents.length} agents)\n`);
  }
}

async function doctor(args) {
  const codex = await run("codex", ["--version"], { allowFailure: true });
  let monitor = { ok: false, message: "not running" };
  try {
    const snapshot = await fetchState();
    monitor = { ok: true, sessions: snapshot.sessions?.length || 0 };
  } catch (error) {
    monitor = { ok: false, message: error.message };
  }
  const plugins = await run("codex", ["plugin", "list", "--json"], {
    allowFailure: true,
  });
  let installed = false;
  try {
    const parsed = JSON.parse(plugins.stdout);
    installed = parsed.installed?.some((entry) => entry.pluginId === PLUGIN_ID) || false;
  } catch {}
  const report = {
    codex: { ok: codex.code === 0, version: codex.stdout.trim() || null },
    monitor,
    plugin: { installed },
    runtime_directory: runtimeDirectory(),
  };
  if (args.includes("--json")) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }
  process.stdout.write(`Codex CLI: ${report.codex.ok ? report.codex.version : "not available"}\n`);
  process.stdout.write(`Plugin: ${installed ? "installed" : "not installed"}\n`);
  process.stdout.write(`Monitor: ${monitor.ok ? "running" : monitor.message}\n`);
}

async function pathExists(path) {
  try {
    return await lstat(path);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function assertRuntimeRootIsNotSymlink(root) {
  const stats = await pathExists(root);
  if (stats?.isSymbolicLink()) {
    throw new Error(`refusing symbolic link runtime directory at ${root}`);
  }
}

async function readJsonRegularFile(path) {
  const stats = await pathExists(path);
  if (!stats?.isFile() || stats.isSymbolicLink()) {
    return null;
  }
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
}

async function inspectRuntime() {
  const path = runtimeFile();
  const stats = await pathExists(path);
  if (!stats) {
    return { kind: "absent", path };
  }
  if (!stats.isFile() || stats.isSymbolicLink()) {
    return { kind: "unknown", path };
  }
  try {
    return { info: await readRuntimeInfo(), kind: "valid", path };
  } catch {
    return { kind: "unknown", path };
  }
}

async function runtimeResponds(runtime) {
  try {
    await fetch(`http://${runtime.host}:${runtime.port}/api/state`, {
      headers: { authorization: `Bearer ${runtime.token}` },
      signal: AbortSignal.timeout(1_500),
    });
    return true;
  } catch {
    return false;
  }
}

async function inspectPluginBundle(destination) {
  const stats = await pathExists(destination);
  if (!stats) {
    return { kind: "absent" };
  }
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    return { kind: "unmanaged" };
  }

  const marker = await readJsonRegularFile(join(destination, BUNDLE_MARKER));
  const manifest = await readJsonRegularFile(
    join(destination, ".codex-plugin", "plugin.json"),
  );
  if (
    marker?.schema_version !== BUNDLE_MARKER_SCHEMA_VERSION ||
    marker?.package !== MARKETPLACE_NAME ||
    marker?.plugin_id !== PLUGIN_ID ||
    manifest?.name !== MARKETPLACE_NAME
  ) {
    return { kind: "unmanaged" };
  }
  return { kind: "managed" };
}

function unmanagedBundleError(destination) {
  return new Error(
    `refusing to replace or remove unmanaged directory at ${destination}; its files were preserved`,
  );
}

async function removeManagedPluginBundle(destination) {
  const bundle = await inspectPluginBundle(destination);
  if (bundle.kind === "unmanaged") {
    throw unmanagedBundleError(destination);
  }
  if (bundle.kind === "managed") {
    await rm(destination, { force: true, recursive: true });
  }
}

async function copyPluginBundle(destination) {
  const root = runtimeDirectory();
  if (dirname(destination) !== root || destination === root) {
    throw new Error("refusing unsafe plugin destination");
  }
  await assertRuntimeRootIsNotSymlink(root);
  const existing = await inspectPluginBundle(destination);
  if (existing.kind === "unmanaged") {
    throw unmanagedBundleError(destination);
  }
  if (existing.kind === "managed") {
    await rm(destination, { force: true, recursive: true });
  }
  await mkdir(destination, { mode: 0o700, recursive: true });
  for (const entry of INSTALL_ENTRIES) {
    const source = join(PACKAGE_ROOT, entry);
    if (!(await pathExists(source))) continue;
    await cp(source, join(destination, entry), {
      errorOnExist: true,
      force: false,
      recursive: true,
    });
  }
  await writeFile(
    join(destination, BUNDLE_MARKER),
    `${JSON.stringify(
      {
        package: MARKETPLACE_NAME,
        plugin_id: PLUGIN_ID,
        schema_version: BUNDLE_MARKER_SCHEMA_VERSION,
      },
      null,
      2,
    )}\n`,
    { encoding: "utf8", flag: "wx", mode: 0o600 },
  );
}

async function configuredMarketplaces() {
  const result = await run("codex", ["plugin", "marketplace", "list", "--json"]);
  return JSON.parse(result.stdout).marketplaces || [];
}

async function install() {
  const destination = join(runtimeDirectory(), "marketplace");
  const marketplaces = await configuredMarketplaces();
  const existing = marketplaces.find((entry) => entry.name === MARKETPLACE_NAME);
  if (existing && resolve(existing.root) !== resolve(destination)) {
    throw new Error(
      `marketplace ${MARKETPLACE_NAME} already points to ${existing.root}; remove it explicitly before installing this npm bundle`,
    );
  }
  await copyPluginBundle(destination);
  if (!existing) {
    await run("codex", ["plugin", "marketplace", "add", destination, "--json"]);
  }
  await run("codex", ["plugin", "add", PLUGIN_ID, "--json"]);
  process.stdout.write(`Installed ${PLUGIN_ID} from ${destination}.\n`);
  process.stdout.write("Review and trust the hook in the CLI /hooks screen, restart Codex, then start a new task.\n");
}

function isBroadRuntimeRoot(root) {
  const normalized = resolve(root);
  return (
    dirname(normalized) === normalized ||
    normalized === resolve(homedir()) ||
    normalized === resolve(process.cwd()) ||
    normalized === PACKAGE_ROOT
  );
}

async function purgeStaleRuntime(preflight) {
  if (preflight.kind !== "valid") {
    return preflight.kind === "unknown";
  }

  const current = await inspectRuntime();
  if (current.kind !== "valid" || current.info.token !== preflight.info.token) {
    return true;
  }
  if (await runtimeResponds(current.info)) {
    throw new Error("the Codex Agent View monitor started during uninstall; runtime data was preserved");
  }
  await removeRuntimeInfo(current.info.token);
  return false;
}

async function removeRuntimeRootIfEmpty(root) {
  if (isBroadRuntimeRoot(root)) {
    return false;
  }
  try {
    await rmdir(root);
    return true;
  } catch (error) {
    if (
      error?.code === "ENOENT" ||
      error?.code === "ENOTEMPTY" ||
      error?.code === "EEXIST" ||
      error?.code === "ENOTDIR" ||
      error?.code === "EBUSY"
    ) {
      return false;
    }
    throw error;
  }
}

async function uninstall(args) {
  const root = runtimeDirectory();
  const bundle = join(root, "marketplace");
  if (dirname(bundle) !== root || bundle === root) {
    throw new Error("refusing unsafe plugin destination");
  }
  await assertRuntimeRootIsNotSymlink(root);
  const bundlePreflight = await inspectPluginBundle(bundle);
  if (bundlePreflight.kind === "unmanaged") {
    throw unmanagedBundleError(bundle);
  }

  const purge = args.includes("--purge");
  const runtimePreflight = purge ? await inspectRuntime() : { kind: "absent" };
  if (
    runtimePreflight.kind === "valid" &&
    (await runtimeResponds(runtimePreflight.info))
  ) {
    throw new Error(
      "the Codex Agent View monitor is running; stop it before uninstalling with --purge",
    );
  }

  await run("codex", ["plugin", "remove", PLUGIN_ID, "--json"], { allowFailure: true });
  await run("codex", ["plugin", "marketplace", "remove", MARKETPLACE_NAME, "--json"], {
    allowFailure: true,
  });
  await removeManagedPluginBundle(bundle);
  if (purge) {
    const preservedRuntimeFile = await purgeStaleRuntime(runtimePreflight);
    const removedRoot = await removeRuntimeRootIfEmpty(root);
    if (removedRoot) {
      process.stdout.write(`Removed plugin, marketplace, and runtime data from ${root}.\n`);
    } else {
      process.stdout.write(
        `Removed owned plugin and stale runtime files. Unrelated or unrecognized files at ${root} were preserved; review them before manual removal.\n`,
      );
    }
    if (preservedRuntimeFile) {
      process.stdout.write(
        `The unrecognized runtime file at ${runtimeFile()} was preserved.\n`,
      );
    }
  } else {
    process.stdout.write("Removed plugin and marketplace bundle. Runtime data was preserved.\n");
  }
}

async function main() {
  const [command = "help", ...args] = process.argv.slice(2);
  if (command === "--version" || command === "-v") {
    process.stdout.write(`${await packageVersion()}\n`);
  } else if (command === "start") {
    await start(args);
  } else if (command === "status") {
    await status(args);
  } else if (command === "doctor") {
    await doctor(args);
  } else if (command === "install") {
    await install(args);
  } else if (command === "uninstall") {
    await uninstall(args);
  } else if (command === "help" || command === "--help" || command === "-h") {
    printHelp();
  } else {
    printHelp();
    throw new Error(`unknown command: ${command}`);
  }
}

main().catch((error) => {
  process.stderr.write(`codex-agent-view: ${error.message}\n`);
  process.exitCode = 1;
});
