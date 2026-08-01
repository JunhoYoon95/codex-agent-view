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
  codex-agent-view start [--port <port>] [--open]
  codex-agent-view status [--json]
  codex-agent-view doctor [--json]
  codex-agent-view install
  codex-agent-view uninstall [--purge]
  codex-agent-view --version

The monitor is read-only and binds only to 127.0.0.1.
Start prints the local URL without opening an external browser unless --open is set.
`);
}

function parseStartArgs(args) {
  let open = false;
  let legacyNoOpen = false;
  let port = DEFAULT_PORT;
  let portSeen = false;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--open") {
      open = true;
      continue;
    }
    if (argument === "--no-open") {
      legacyNoOpen = true;
      continue;
    }
    if (argument === "--port") {
      if (portSeen) {
        throw new Error("--port may only be specified once");
      }
      const value = args[index + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error("--port requires a value");
      }
      port = Number(value);
      portSeen = true;
      index += 1;
      continue;
    }
    if (argument.startsWith("-")) {
      throw new Error(`unknown start option: ${argument}`);
    }
    throw new Error(`unexpected start argument: ${argument}`);
  }

  if (open && legacyNoOpen) {
    throw new Error("--open and --no-open cannot be used together");
  }
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error("--port must be an integer from 0 to 65535");
  }

  return { open, port };
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
  const options = parseStartArgs(args);

  const runtime = await inspectRuntime();
  if (runtime.kind === "unknown") {
    throw new Error(
      `refusing to replace unrecognized runtime file at ${runtimeFile()}; move it explicitly and retry`,
    );
  }
  if (runtime.kind === "valid" && (await runtimeResponds(runtime.info))) {
    throw new Error("a Codex Agent View monitor is already running; stop it before starting another");
  }

  const monitor = await startMonitorServer({ port: options.port });
  process.stdout.write(`Codex Agent View is running at ${monitor.url}\n`);
  process.stdout.write("Press Ctrl+C to stop the in-memory monitor.\n");
  if (options.open) {
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
  if (!Number.isFinite(snapshot.updated_at_ms) || snapshot.updated_at_ms <= 0) {
    process.stdout.write(
      "No hook event has reached this monitor yet. The monitor can be healthy while Codex skips an untrusted or not-yet-loaded hook. Run `codex-agent-view doctor`, review `/hooks` in Codex CLI, then use a new task.\n",
    );
  }
  for (const session of sessions) {
    process.stdout.write(`- ${session.session_id}: ${session.status} (${session.agents.length} agents)\n`);
  }
}

function parsePluginList(result) {
  if (result.code !== 0) return null;
  try {
    const parsed = JSON.parse(result.stdout);
    return Array.isArray(parsed.installed) ? parsed.installed : [];
  } catch {
    return null;
  }
}

async function inspectInstalledHookBundle(pluginEntry) {
  const sourcePath = pluginEntry?.source?.path;
  if (typeof sourcePath !== "string" || sourcePath.length === 0) {
    return {
      hooks_file: false,
      sender_file: false,
      source_path: null,
      wiring_ok: false,
    };
  }
  const hooksPath = join(sourcePath, "hooks", "hooks.json");
  const senderPath = join(sourcePath, "scripts", "send-hook.mjs");
  const hooks = await readJsonRegularFile(hooksPath);
  const sender = await pathExists(senderPath);
  const hookGroups = hooks?.hooks;
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
  const hooksFile = hookGroups && typeof hookGroups === "object";
  const declaredEvents = hooksFile
    ? expectedEvents.filter((event) => Array.isArray(hookGroups[event]))
    : [];
  return {
    declared_events: declaredEvents,
    hooks_file: Boolean(hooksFile),
    sender_file: Boolean(sender?.isFile() && !sender.isSymbolicLink()),
    source_path: sourcePath,
    wiring_ok:
      Boolean(hooksFile) &&
      declaredEvents.length === expectedEvents.length &&
      Boolean(sender?.isFile() && !sender.isSymbolicLink()),
  };
}

async function doctor(args) {
  const codex = await run("codex", ["--version"], { allowFailure: true });
  let monitor = { ok: false, message: "not running" };
  try {
    const snapshot = await fetchState();
    monitor = {
      events_received:
        Number.isFinite(snapshot.updated_at_ms) && snapshot.updated_at_ms > 0,
      ok: true,
      sessions: snapshot.sessions?.length || 0,
      updated_at_ms:
        Number.isFinite(snapshot.updated_at_ms) && snapshot.updated_at_ms > 0
          ? snapshot.updated_at_ms
          : null,
    };
  } catch (error) {
    monitor = { ok: false, message: error.message };
  }
  const plugins = await run("codex", ["plugin", "list", "--json"], {
    allowFailure: true,
  });
  const pluginList = parsePluginList(plugins);
  const pluginEntry = pluginList?.find((entry) => entry.pluginId === PLUGIN_ID) || null;
  const hookBundle = await inspectInstalledHookBundle(pluginEntry);
  const diagnostics = [];
  if (codex.code !== 0) {
    diagnostics.push({
      action: "Install or repair Codex CLI so `codex --version` succeeds.",
      code: "codex_cli_unavailable",
      severity: "error",
    });
  }
  if (pluginList === null) {
    diagnostics.push({
      action: "Check `codex plugin list --json` and the installed Codex CLI version.",
      code: "plugin_list_unavailable",
      severity: "error",
    });
  } else if (!pluginEntry) {
    diagnostics.push({
      action: "Run `codex-agent-view install`.",
      code: "plugin_not_installed",
      severity: "error",
    });
  } else if (pluginEntry.enabled !== true) {
    diagnostics.push({
      action: "Enable Codex Agent View in the Codex plugin browser, then start a new task.",
      code: "plugin_disabled",
      severity: "error",
    });
  }
  if (pluginEntry && !hookBundle.wiring_ok) {
    diagnostics.push({
      action: "Run `codex-agent-view install` again to restore the owned plugin bundle.",
      code: "hook_bundle_invalid",
      severity: "error",
    });
  }
  if (pluginEntry && pluginEntry.version !== (await packageVersion())) {
    diagnostics.push({
      action: "Run `codex-agent-view install` to align the installed plugin with this CLI package.",
      code: "plugin_version_mismatch",
      severity: "warning",
    });
  }
  if (!monitor.ok) {
    diagnostics.push({
      action: "Run `codex-agent-view start` before expecting live task events.",
      code: "monitor_not_running",
      severity: "warning",
    });
  }
  if (pluginEntry) {
    diagnostics.push({
      action: "Review the current plugin hook definition in interactive Codex CLI `/hooks`.",
      code: "hook_trust_unverified",
      severity: "info",
    });
  }
  if (monitor.ok && monitor.events_received === false) {
    diagnostics.push({
      action:
        "Open Codex CLI, review and trust the current definition in `/hooks`, then start a new task. Restart a Codex app process that was already open during installation.",
      code: "no_hook_events_observed",
      severity: "warning",
    });
  }
  const report = {
    codex: { ok: codex.code === 0, version: codex.stdout.trim() || null },
    diagnostics,
    hook: {
      ...hookBundle,
      trust: pluginEntry ? "unknown" : "not_applicable",
      trust_note: pluginEntry
        ? "Codex CLI does not expose persisted hook trust through `plugin list --json`; review `/hooks` interactively."
        : null,
    },
    monitor,
    plugin: {
      enabled: pluginEntry?.enabled === true,
      installed: Boolean(pluginEntry),
      source_path: pluginEntry?.source?.path || null,
      version: pluginEntry?.version || null,
    },
    runtime_directory: runtimeDirectory(),
  };
  if (args.includes("--json")) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }
  process.stdout.write(`Codex CLI: ${report.codex.ok ? report.codex.version : "not available"}\n`);
  process.stdout.write(
    `Plugin: ${report.plugin.installed ? `installed (${report.plugin.enabled ? "enabled" : "disabled"})` : "not installed"}\n`,
  );
  if (report.plugin.installed) {
    process.stdout.write(`Hook bundle: ${report.hook.wiring_ok ? "valid" : "invalid"}\n`);
    process.stdout.write("Hook trust: unknown (Codex exposes review through interactive `/hooks`)\n");
  }
  process.stdout.write(`Monitor: ${monitor.ok ? "running" : monitor.message}\n`);
  if (monitor.ok) {
    process.stdout.write(`Hook events: ${monitor.events_received ? "observed" : "none observed"}\n`);
  }
  for (const diagnostic of diagnostics) {
    process.stdout.write(`[${diagnostic.severity}] ${diagnostic.code}: ${diagnostic.action}\n`);
  }
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
  const verification = await run("codex", ["plugin", "list", "--json"], {
    allowFailure: true,
  });
  const installed = parsePluginList(verification)?.find(
    (entry) => entry.pluginId === PLUGIN_ID,
  );
  if (!installed) {
    throw new Error(
      "Codex did not report the plugin as installed after registration; run `codex-agent-view doctor` for details",
    );
  }
  if (installed.enabled !== true) {
    throw new Error(
      "the plugin was registered but is disabled; enable it in the Codex plugin browser, then run `codex-agent-view doctor`",
    );
  }
  process.stdout.write(`Installed ${PLUGIN_ID} from ${destination}.\n`);
  process.stdout.write("Registration verified: installed and enabled.\n");
  process.stdout.write(
    "Hook trust cannot be granted or inspected non-interactively. Review and trust this plugin's current hook definition in Codex CLI `/hooks`.\n",
  );
  process.stdout.write(
    "If Codex was already open during installation, restart it completely, then create a new task.\n",
  );
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
