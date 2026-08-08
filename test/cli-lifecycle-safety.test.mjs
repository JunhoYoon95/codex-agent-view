import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHmac } from "node:crypto";
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
  ensureViewerToken,
  readRuntimeInfo,
  readViewerToken,
  removeRuntimeInfo,
  runtimeFile,
  viewerCredentialFile,
  writeRuntimeInfo,
} from "../src/runtime/config.mjs";
import { startMonitorServer } from "../src/runtime/server.mjs";

const PACKAGE_ROOT = resolve(fileURLToPath(new URL("../", import.meta.url)));
const CLI = join(PACKAGE_ROOT, "bin", "codex-agent-view.mjs");
const OWNERSHIP_PROOF_DOMAIN = "codex-agent-view/runtime-ownership/v1";

async function respondToOwnershipChallenge(request, response, runtimeToken) {
  assert.equal(request.headers.authorization, undefined);
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const { nonce } = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  const proof = createHmac("sha256", runtimeToken)
    .update(OWNERSHIP_PROOF_DOMAIN)
    .update("\0")
    .update(nonce)
    .digest("base64url");
  response.writeHead(200, { "content-type": "application/json" });
  response.end(`${JSON.stringify({ proof, status: "owned" })}\n`);
}

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "codex-agent-view-cli-"));
  t.after(async () => rm(root, { force: true, recursive: true }));
  const fakeBin = join(root, "fake-bin");
  const browserLog = join(root, "browser-calls.jsonl");
  const log = join(root, "codex-calls.jsonl");
  const state = join(root, "codex-state.json");
  await mkdir(fakeBin);
  const fakeCodex = join(fakeBin, "codex");
  // Keep this extensionless POSIX executable in CommonJS syntax: Node 18 parses
  // it as CJS even though newer Node releases may detect ESM syntax here.
  await writeFile(
    fakeCodex,
    `#!/usr/bin/env node
const { appendFileSync, existsSync, readFileSync, writeFileSync } = require("node:fs");
const path = require("node:path");
const args = process.argv.slice(2);
appendFileSync(process.env.FAKE_CODEX_LOG, JSON.stringify(args) + "\\n");
function readState() {
  if (!existsSync(process.env.FAKE_CODEX_STATE)) {
    return { installed: false, marketplaceRoot: null, sourcePath: null };
  }
  return JSON.parse(readFileSync(process.env.FAKE_CODEX_STATE, "utf8"));
}
function writeState(state) {
  writeFileSync(process.env.FAKE_CODEX_STATE, JSON.stringify(state));
}
function resolveCatalogPlugin(marketplaceRoot) {
  const catalogPath = path.join(marketplaceRoot, ".agents", "plugins", "marketplace.json");
  const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
  const source = catalog.plugins[0].source.path;
  if (source === "./" || source === ".") {
    process.stderr.write("plugin codex-agent-view was not found in marketplace codex-agent-view\\n");
    process.exit(7);
  }
  const pluginRoot = path.resolve(marketplaceRoot, source);
  if (!existsSync(path.join(pluginRoot, ".codex-plugin", "plugin.json"))) {
    process.stderr.write("plugin source subdirectory was not found\\n");
    process.exit(7);
  }
  return pluginRoot;
}
if (args.join(" ") === "plugin marketplace list --json") {
  const state = readState();
  const marketplaces = state.marketplaceRoot
    ? [{ name: "codex-agent-view", root: state.marketplaceRoot }]
    : [];
  process.stdout.write(JSON.stringify({ marketplaces }) + "\\n");
} else if (args[0] === "plugin" && args[1] === "marketplace" && args[2] === "add") {
  const marketplaceRoot = args[3];
  resolveCatalogPlugin(marketplaceRoot);
  writeState({ ...readState(), marketplaceRoot });
  process.stdout.write('{}\\n');
} else if (args[0] === "plugin" && args[1] === "marketplace" && args[2] === "remove") {
  writeState({ ...readState(), marketplaceRoot: null });
  process.stdout.write('{}\\n');
} else if (args[0] === "plugin" && args[1] === "add") {
  if (process.env.FAKE_PLUGIN_ADD_FAILURE === "1") {
    process.stderr.write("simulated plugin add failure\\n");
    process.exit(9);
  }
  const state = readState();
  if (!state.marketplaceRoot) {
    process.stderr.write("marketplace is not registered\\n");
    process.exit(8);
  }
  const sourcePath = resolveCatalogPlugin(state.marketplaceRoot);
  writeState({ ...state, installed: true, sourcePath });
  process.stdout.write('{}\\n');
} else if (args[0] === "plugin" && args[1] === "remove") {
  writeState({ ...readState(), installed: false, sourcePath: null });
  process.stdout.write('{}\\n');
} else if (args.join(" ") === "plugin list --json") {
  const state = readState();
  const installed = state.installed ? [{
    pluginId: "codex-agent-view@codex-agent-view",
    enabled: process.env.FAKE_PLUGIN_DISABLED !== "1",
    version: "0.5.1",
    source: { source: "local", path: state.sourcePath }
  }] : [];
  process.stdout.write(JSON.stringify({ installed }) + "\\n");
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
process.exitCode = Number(process.env.FAKE_BROWSER_EXIT_CODE || 0);
`,
      { mode: 0o700 },
    );
    await chmod(fakeBrowser, 0o700);
  }

  return { browserLog, fakeBin, log, root, state };
}

function cliEnvironment(setup, runtimeRoot, extra = {}) {
  return {
    ...process.env,
    PATH: `${setup.fakeBin}${delimiter}${process.env.PATH || ""}`,
    CODEX_AGENT_VIEW_RUNTIME_DIR: runtimeRoot,
    FAKE_BROWSER_LOG: setup.browserLog,
    FAKE_CODEX_LOG: setup.log,
    FAKE_CODEX_STATE: setup.state,
    ...extra,
  };
}

function installedPluginRoot(runtimeRoot) {
  return join(runtimeRoot, "marketplace", "plugins", "codex-agent-view");
}

function installedManifestPath(runtimeRoot) {
  return join(installedPluginRoot(runtimeRoot), ".codex-plugin", "plugin.json");
}

async function convertToLegacyRootLayout(runtimeRoot) {
  const marketplace = join(runtimeRoot, "marketplace");
  const manifest = await readFile(installedManifestPath(runtimeRoot), "utf8");
  await mkdir(join(marketplace, ".codex-plugin"));
  await writeFile(join(marketplace, ".codex-plugin", "plugin.json"), manifest);
  await rm(join(marketplace, "plugins"), { force: true, recursive: true });
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

async function stopPreparedMonitor(env) {
  let runtime;
  try {
    runtime = await readRuntimeInfo(env);
  } catch {
    return;
  }
  await fetch(`http://${runtime.host}:${runtime.port}/api/internal/shutdown`, {
    headers: { authorization: `Bearer ${runtime.token}` },
    method: "POST",
  }).catch(() => {});
}

test("open reuses an owned runtime and passes one private grant only to the default browser", async (t) => {
  if (process.platform === "win32") {
    t.skip("fake executable fixture uses a POSIX shebang");
    return;
  }
  const setup = await fixture(t);
  const runtimeRoot = join(setup.root, "runtime");
  const env = { CODEX_AGENT_VIEW_RUNTIME_DIR: runtimeRoot };
  const install = await runCli(setup, runtimeRoot, ["install"]);
  assert.equal(install.code, 0, install.stderr);
  const viewerToken = await readViewerToken(env);
  const runtimeToken = "r".repeat(43);
  const bootstrapCredential = `bootstrap.${"g".repeat(43)}`;
  const grantRequests = [];
  const owned = createServer(async (request, response) => {
    if (request.url === "/api/internal/ownership-proof") {
      await respondToOwnershipChallenge(request, response, runtimeToken);
      return;
    }
    if (request.url === "/api/internal/viewer-grant" && request.method === "POST") {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      grantRequests.push({
        authorization: request.headers.authorization,
        body: JSON.parse(Buffer.concat(chunks).toString("utf8")),
      });
      response.writeHead(201, { "content-type": "application/json" });
      response.end(`${JSON.stringify({
        status: "granted",
        bootstrap_credential: bootstrapCredential,
        expires_in_ms: 60_000,
      })}\n`);
      return;
    }
    response.writeHead(404).end();
  });
  await new Promise((resolvePromise, reject) => {
    owned.once("error", reject);
    owned.listen(0, LOOPBACK_HOST, resolvePromise);
  });
  t.after(() => new Promise((resolvePromise) => owned.close(resolvePromise)));
  const address = owned.address();
  assert(address && typeof address !== "string");
  await writeRuntimeInfo(
    {
      host: LOOPBACK_HOST,
      pid: process.pid,
      port: address.port,
      schema_version: RUNTIME_SCHEMA_VERSION,
      started_at_ms: Date.now(),
      token: runtimeToken,
      viewer_token: viewerToken,
    },
    env,
  );
  await writeFile(setup.browserLog, "");
  const threadId = "ABCDEF12-3456-7890-ABCD-EF1234567890";

  const result = await runCli(setup, runtimeRoot, ["open"], {
    env: { CODEX_THREAD_ID: threadId },
  });

  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stdout, "Codex Agent View opened in the default browser.\n");
  assert.equal(result.stderr, "");
  assert.deepEqual(grantRequests, [{
    authorization: `Bearer ${runtimeToken}`,
    body: { exclude_session_id: threadId.toLowerCase() },
  }]);
  const browserCalls = await waitForBrowserCall(setup.browserLog);
  assert.equal(browserCalls.length, 1);
  assert.deepEqual(browserCalls[0], [
    `http://127.0.0.1:${address.port}/#grant=${encodeURIComponent(bootstrapCredential)}`,
  ]);
  assert(!result.stdout.includes(runtimeToken));
  assert(!result.stdout.includes(viewerToken));
  assert(!result.stdout.includes(bootstrapCredential));
  assert(!result.stderr.includes(runtimeToken));
  assert(!result.stderr.includes(viewerToken));
  assert(!result.stderr.includes(bootstrapCredential));
});

test("open accepts an owned legacy root-layout bundle during the migration window", async (t) => {
  if (process.platform === "win32") {
    t.skip("fake executable fixture uses a POSIX shebang");
    return;
  }
  const setup = await fixture(t);
  const runtimeRoot = join(setup.root, "legacy-open-runtime");
  const env = { CODEX_AGENT_VIEW_RUNTIME_DIR: runtimeRoot };
  const install = await runCli(setup, runtimeRoot, ["install"]);
  assert.equal(install.code, 0, install.stderr);
  await convertToLegacyRootLayout(runtimeRoot);
  const monitor = await startMonitorServer({
    env,
    port: 0,
    viewerToken: await readViewerToken(env),
  });
  t.after(async () => monitor.close().catch(() => {}));

  const result = await runCli(setup, runtimeRoot, ["open"]);

  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stdout, "Codex Agent View opened in the default browser.\n");
  assert.equal((await waitForBrowserCall(setup.browserLog)).length, 1);
});

test("open starts a missing monitor internally and never exposes its authenticated target", async (t) => {
  if (process.platform === "win32") {
    t.skip("detached monitor fixture uses POSIX process behavior");
    return;
  }
  const setup = await fixture(t);
  const runtimeRoot = join(setup.root, "runtime");
  const env = { CODEX_AGENT_VIEW_RUNTIME_DIR: runtimeRoot };
  const install = await runCli(setup, runtimeRoot, ["install"]);
  assert.equal(install.code, 0, install.stderr);
  t.after(async () => stopPreparedMonitor(env));

  const port = await reserveLoopbackPort();
  const result = await runCli(setup, runtimeRoot, ["open"], {
    env: {
      CODEX_AGENT_VIEW_AUTO_START_PORT: String(port),
      CODEX_THREAD_ID: "not-a-canonical-thread-id",
    },
  });

  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stdout, "Codex Agent View opened in the default browser.\n");
  const [browserTarget] = (await waitForBrowserCall(setup.browserLog))[0];
  assert.match(browserTarget, new RegExp(`^http://127\\.0\\.0\\.1:${port}/#grant=[^&?#]+$`));
  const grant = decodeURIComponent(new URL(browserTarget).hash.slice("#grant=".length));
  const payload = JSON.parse(Buffer.from(grant.split(".", 1)[0], "base64url").toString("utf8"));
  assert.equal(payload.exclude_session_id, null);
  assert(!result.stdout.includes(grant));
  assert(!result.stderr.includes(grant));
});

test("open returns bounded private-safe errors for invalid arguments and unsafe states", async (t) => {
  if (process.platform === "win32") {
    t.skip("fake executable fixture uses a POSIX shebang");
    return;
  }
  const setup = await fixture(t);
  const runtimeRoot = join(setup.root, "runtime");
  const install = await runCli(setup, runtimeRoot, ["install"]);
  assert.equal(install.code, 0, install.stderr);

  const invalidArguments = await runCli(setup, runtimeRoot, ["open", "unexpected"]);
  assert.equal(invalidArguments.code, 1);
  assert.equal(invalidArguments.stdout, "");
  assert.equal(
    invalidArguments.stderr,
    "codex-agent-view: live view open failed (invalid_arguments)\n",
  );
  assert.deepEqual(await readCalls(setup.browserLog), []);

  const manifestPath = installedManifestPath(runtimeRoot);
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  await writeFile(manifestPath, `${JSON.stringify({ ...manifest, version: "0.0.0" })}\n`);
  const mismatch = await runCli(setup, runtimeRoot, ["open"]);
  assert.equal(mismatch.code, 1);
  assert.equal(mismatch.stdout, "");
  assert.equal(
    mismatch.stderr,
    "codex-agent-view: live view open failed (plugin_version_mismatch)\n",
  );
  assert.deepEqual(await readCalls(setup.browserLog), []);
});

test("open rejects malformed grants and spoofed runtimes before invoking a browser", async (t) => {
  if (process.platform === "win32") {
    t.skip("fake executable fixture uses a POSIX shebang");
    return;
  }
  const setup = await fixture(t);
  const runtimeRoot = join(setup.root, "runtime");
  const env = { CODEX_AGENT_VIEW_RUNTIME_DIR: runtimeRoot };
  const install = await runCli(setup, runtimeRoot, ["install"]);
  assert.equal(install.code, 0, install.stderr);
  const runtimeToken = "i".repeat(43);
  const viewerToken = await readViewerToken(env);
  let bearerRequests = 0;
  const spoof = createServer(async (request, response) => {
    if (request.headers.authorization) bearerRequests += 1;
    if (request.url === "/api/internal/ownership-proof") {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      response.writeHead(200, { "content-type": "application/json" });
      response.end(`${JSON.stringify({
        proof: "z".repeat(43),
        status: "owned",
      })}\n`);
      return;
    }
    response.writeHead(201, { "content-type": "application/json" });
    response.end(`${JSON.stringify({
      status: "granted",
      bootstrap_credential: "not-signed",
      expires_in_ms: 60_000,
    })}\n`);
  });
  await new Promise((resolvePromise, reject) => {
    spoof.once("error", reject);
    spoof.listen(0, LOOPBACK_HOST, resolvePromise);
  });
  t.after(() => new Promise((resolvePromise) => spoof.close(resolvePromise)));
  const address = spoof.address();
  assert(address && typeof address !== "string");
  await writeRuntimeInfo({
    host: LOOPBACK_HOST,
    pid: process.pid,
    port: address.port,
    schema_version: RUNTIME_SCHEMA_VERSION,
    started_at_ms: Date.now(),
    token: runtimeToken,
    viewer_token: viewerToken,
  }, env);

  const result = await runCli(setup, runtimeRoot, ["open"]);
  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "codex-agent-view: live view open failed (unowned_runtime)\n");
  assert.equal(bearerRequests, 0);
  assert.deepEqual(await readCalls(setup.browserLog), []);
  assert(!result.stderr.includes(runtimeToken));
  assert(!result.stderr.includes(viewerToken));
});

test("open preserves bounded grant rejection, timeout, and invalid-response failures", async (t) => {
  if (process.platform === "win32") {
    t.skip("fake executable fixture uses a POSIX shebang");
    return;
  }
  const cases = [
    { expectedCode: "viewer_grant_rejected", kind: "rejected" },
    { expectedCode: "viewer_grant_timeout", kind: "timeout" },
    { expectedCode: "viewer_grant_invalid_response", kind: "invalid" },
  ];

  for (const [index, failure] of cases.entries()) {
    const setup = await fixture(t);
    const runtimeRoot = join(setup.root, "runtime");
    const env = { CODEX_AGENT_VIEW_RUNTIME_DIR: runtimeRoot };
    const install = await runCli(setup, runtimeRoot, ["install"]);
    assert.equal(install.code, 0, install.stderr);
    const runtimeToken = String.fromCharCode(106 + index).repeat(43);
    const viewerToken = await readViewerToken(env);
    const invalidCredential = `invalid-${failure.kind}`;
    const owned = createServer(async (request, response) => {
      if (request.url === "/api/internal/ownership-proof") {
        await respondToOwnershipChallenge(request, response, runtimeToken);
        return;
      }
      if (request.url === "/api/internal/viewer-grant") {
        assert.equal(request.headers.authorization, `Bearer ${runtimeToken}`);
        if (failure.kind === "rejected") {
          response.writeHead(403, { "content-type": "application/json" });
          response.end('{"error":"denied"}\n');
          return;
        }
        if (failure.kind === "timeout") {
          setTimeout(() => {
            if (!response.writableEnded) response.end();
          }, 1_200);
          return;
        }
        response.writeHead(201, { "content-type": "application/json" });
        response.end(`${JSON.stringify({
          status: "granted",
          bootstrap_credential: invalidCredential,
          expires_in_ms: 60_000,
        })}\n`);
        return;
      }
      response.writeHead(404).end();
    });
    await new Promise((resolvePromise, reject) => {
      owned.once("error", reject);
      owned.listen(0, LOOPBACK_HOST, resolvePromise);
    });
    t.after(() => owned.listening
      ? new Promise((resolvePromise) => owned.close(resolvePromise))
      : undefined);
    const address = owned.address();
    assert(address && typeof address !== "string");
    await writeRuntimeInfo({
      host: LOOPBACK_HOST,
      pid: process.pid,
      port: address.port,
      schema_version: RUNTIME_SCHEMA_VERSION,
      started_at_ms: Date.now(),
      token: runtimeToken,
      viewer_token: viewerToken,
    }, env);

    const result = await runCli(setup, runtimeRoot, ["open"]);
    assert.equal(result.code, 1);
    assert.equal(result.stdout, "");
    assert.equal(
      result.stderr,
      `codex-agent-view: live view open failed (${failure.expectedCode})\n`,
    );
    assert(!result.stderr.includes(runtimeToken));
    assert(!result.stderr.includes(viewerToken));
    assert(!result.stderr.includes(invalidCredential));
    assert.deepEqual(await readCalls(setup.browserLog), []);
    await new Promise((resolvePromise) => owned.close(resolvePromise));
  }
});

test("open reports a bounded error and no success when the browser launcher exits nonzero", async (t) => {
  if (process.platform === "win32") {
    t.skip("fake executable fixture uses a POSIX shebang");
    return;
  }
  const setup = await fixture(t);
  const runtimeRoot = join(setup.root, "runtime");
  const env = { CODEX_AGENT_VIEW_RUNTIME_DIR: runtimeRoot };
  const install = await runCli(setup, runtimeRoot, ["install"]);
  assert.equal(install.code, 0, install.stderr);
  const runtimeToken = "q".repeat(43);
  const viewerToken = await readViewerToken(env);
  const credential = `payload.${"g".repeat(43)}`;
  const owned = createServer(async (request, response) => {
    if (request.url === "/api/internal/ownership-proof") {
      await respondToOwnershipChallenge(request, response, runtimeToken);
      return;
    }
    if (request.url === "/api/internal/viewer-grant") {
      response.writeHead(201, { "content-type": "application/json" });
      response.end(`${JSON.stringify({
        status: "granted",
        bootstrap_credential: credential,
        expires_in_ms: 60_000,
      })}\n`);
      return;
    }
    response.writeHead(404).end();
  });
  await new Promise((resolvePromise, reject) => {
    owned.once("error", reject);
    owned.listen(0, LOOPBACK_HOST, resolvePromise);
  });
  t.after(() => new Promise((resolvePromise) => owned.close(resolvePromise)));
  const address = owned.address();
  assert(address && typeof address !== "string");
  await writeRuntimeInfo({
    host: LOOPBACK_HOST,
    pid: process.pid,
    port: address.port,
    schema_version: RUNTIME_SCHEMA_VERSION,
    started_at_ms: Date.now(),
    token: runtimeToken,
    viewer_token: viewerToken,
  }, env);

  const result = await runCli(setup, runtimeRoot, ["open"], {
    env: { FAKE_BROWSER_EXIT_CODE: "7" },
  });
  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "codex-agent-view: live view open failed (browser_open_failed)\n");
  assert(!result.stderr.includes(credential));
  assert.equal((await readCalls(setup.browserLog)).length, 1);

  const browserCommand = process.platform === "darwin" ? "open" : "xdg-open";
  await rm(join(setup.fakeBin, browserCommand));
  const missingLauncher = await runCli(setup, runtimeRoot, ["open"], {
    env: { PATH: setup.fakeBin },
  });
  assert.equal(missingLauncher.code, 1);
  assert.equal(missingLauncher.stdout, "");
  assert.equal(
    missingLauncher.stderr,
    "codex-agent-view: live view open failed (browser_open_failed)\n",
  );
  assert(!missingLauncher.stderr.includes(credential));
});

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

test("fresh install uses a strict plugin subdirectory accepted by a root-rejecting marketplace parser", async (t) => {
  if (process.platform === "win32") {
    t.skip("fake executable fixture uses a POSIX shebang");
    return;
  }
  const setup = await fixture(t);
  const runtimeRoot = join(setup.root, "runtime");

  const result = await runCli(setup, runtimeRoot, ["install"]);

  assert.equal(result.code, 0, result.stderr);
  const marketplace = JSON.parse(await readFile(
    join(runtimeRoot, "marketplace", ".agents", "plugins", "marketplace.json"),
    "utf8",
  ));
  assert.equal(
    marketplace.plugins[0].source.path,
    "./plugins/codex-agent-view",
  );
  await access(installedManifestPath(runtimeRoot));
  await assertMissing(join(runtimeRoot, "marketplace", ".codex-plugin", "plugin.json"));
  assert.deepEqual(await readCalls(setup.log), [
    ["plugin", "marketplace", "list", "--json"],
    ["plugin", "marketplace", "add", join(runtimeRoot, "marketplace"), "--json"],
    ["plugin", "add", "codex-agent-view@codex-agent-view", "--json"],
    ["plugin", "list", "--json"],
  ]);
});

test("install upgrades an owned legacy root-layout bundle to the strict subdirectory layout", async (t) => {
  if (process.platform === "win32") {
    t.skip("fake executable fixture uses a POSIX shebang");
    return;
  }
  const setup = await fixture(t);
  const runtimeRoot = join(setup.root, "runtime");
  assert.equal((await runCli(setup, runtimeRoot, ["install"])).code, 0);
  await convertToLegacyRootLayout(runtimeRoot);
  await access(join(runtimeRoot, "marketplace", ".codex-plugin", "plugin.json"));

  const result = await runCli(setup, runtimeRoot, ["install"]);

  assert.equal(result.code, 0, result.stderr);
  await access(installedManifestPath(runtimeRoot));
  await assertMissing(join(runtimeRoot, "marketplace", ".codex-plugin", "plugin.json"));
  const fakeState = JSON.parse(await readFile(setup.state, "utf8"));
  assert.equal(fakeState.sourcePath, installedPluginRoot(runtimeRoot));
});

test("install reports plugin registration failure instead of claiming success", async (t) => {
  if (process.platform === "win32") {
    t.skip("fake executable fixture uses a POSIX shebang");
    return;
  }
  const setup = await fixture(t);
  const runtimeRoot = join(setup.root, "runtime");

  const result = await runCli(setup, runtimeRoot, ["install"], {
    env: { FAKE_PLUGIN_ADD_FAILURE: "1" },
  });

  assert.equal(result.code, 1);
  assert.match(result.stderr, /simulated plugin add failure/);
  assert.doesNotMatch(result.stdout, /Installed|Registration verified/);
  const fakeState = JSON.parse(await readFile(setup.state, "utf8"));
  assert.equal(fakeState.installed, false);
});

test("install preserves an existing viewer credential without exposing it", async (t) => {
  if (process.platform === "win32") {
    t.skip("fake executable fixture uses a POSIX shebang");
    return;
  }
  const setup = await fixture(t);
  const runtimeRoot = join(setup.root, "runtime");
  const env = { CODEX_AGENT_VIEW_RUNTIME_DIR: runtimeRoot };
  const viewerToken = await ensureViewerToken(env);

  const first = await runCli(setup, runtimeRoot, ["install"]);
  assert.equal(first.code, 0, first.stderr);
  assert.equal(await readViewerToken(env), viewerToken);
  assert(!`${first.stdout}${first.stderr}`.includes(viewerToken));

  const second = await runCli(setup, runtimeRoot, ["install"]);
  assert.equal(second.code, 0, second.stderr);
  assert.equal(await readViewerToken(env), viewerToken);
  assert(!`${second.stdout}${second.stderr}`.includes(viewerToken));
});

test("install seeds a missing viewer credential from a legacy runtime token", async (t) => {
  if (process.platform === "win32") {
    t.skip("fake executable fixture uses a POSIX shebang");
    return;
  }
  const setup = await fixture(t);
  const runtimeRoot = join(setup.root, "runtime");
  const env = { CODEX_AGENT_VIEW_RUNTIME_DIR: runtimeRoot };
  const legacy = await writeStaleRuntime(runtimeRoot, "l".repeat(43));

  const result = await runCli(setup, runtimeRoot, ["install"]);
  assert.equal(result.code, 0, result.stderr);
  assert.equal(await readViewerToken(env), legacy.token);
  assert(!`${result.stdout}${result.stderr}`.includes(legacy.token));
});

test("install stops an already running owned monitor before replacing the bundle", async (t) => {
  if (process.platform === "win32") {
    t.skip("fake executable fixture uses a POSIX shebang");
    return;
  }
  const setup = await fixture(t);
  const runtimeRoot = join(setup.root, "upgrade-runtime");
  const env = { CODEX_AGENT_VIEW_RUNTIME_DIR: runtimeRoot };
  const monitor = await startMonitorServer({ env, port: 0 });
  t.after(async () => monitor.close().catch(() => {}));

  const result = await runCli(setup, runtimeRoot, ["install"]);
  assert.equal(result.code, 0, result.stderr);
  const deadline = Date.now() + 1_000;
  while (monitor.server.address() !== null && Date.now() < deadline) {
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 10));
  }
  assert.equal(monitor.server.address(), null);
  await assert.rejects(access(runtimeFile(env)), { code: "ENOENT" });
});

test("current managed lifecycle commands never send bearer auth after a failed ownership proof", async (t) => {
  if (process.platform === "win32") {
    t.skip("fake executable fixture uses a POSIX shebang");
    return;
  }
  const setup = await fixture(t);
  const runtimeRoot = join(setup.root, "current-spoof-runtime");
  const env = { CODEX_AGENT_VIEW_RUNTIME_DIR: runtimeRoot };
  assert.equal((await runCli(setup, runtimeRoot, ["install"])).code, 0);
  const seen = [];
  const spoof = createServer((_request, response) => {
    seen.push({
      authorization: _request.headers.authorization,
      url: _request.url,
    });
    response.writeHead(200, { "content-type": "application/json" });
    response.end(`${JSON.stringify({ proof: "z".repeat(43), status: "owned" })}\n`);
  });
  await new Promise((resolvePromise, reject) => {
    spoof.once("error", reject);
    spoof.listen(0, LOOPBACK_HOST, resolvePromise);
  });
  t.after(() => new Promise((resolvePromise) => spoof.close(resolvePromise)));
  const address = spoof.address();
  assert(address && typeof address !== "string");
  const runtimeToken = "w".repeat(43);
  await writeRuntimeInfo({
    host: LOOPBACK_HOST,
    pid: process.pid,
    port: address.port,
    schema_version: RUNTIME_SCHEMA_VERSION,
    started_at_ms: Date.now(),
    token: runtimeToken,
    viewer_token: await readViewerToken(env),
  }, env);

  for (const args of [["status", "--json"], ["install"], ["uninstall"]]) {
    const result = await runCli(setup, runtimeRoot, args);
    assert.equal(result.code, 1);
    assert(!`${result.stdout}${result.stderr}`.includes(runtimeToken));
  }
  assert.equal(seen.length, 3);
  assert(seen.every((entry) => (
    entry.authorization === undefined &&
    entry.url === "/api/internal/ownership-proof"
  )));
  await access(runtimeFile(env));
  await access(join(runtimeRoot, "marketplace", ".codex-agent-view-owned.json"));
});

test("install uses bearer fallback only for a known managed pre-proof bundle", async (t) => {
  if (process.platform === "win32") {
    t.skip("fake executable fixture uses a POSIX shebang");
    return;
  }
  const setup = await fixture(t);
  const runtimeRoot = join(setup.root, "legacy-upgrade-runtime");
  const env = { CODEX_AGENT_VIEW_RUNTIME_DIR: runtimeRoot };
  assert.equal((await runCli(setup, runtimeRoot, ["install"])).code, 0);
  const manifestPath = installedManifestPath(runtimeRoot);
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  await writeFile(manifestPath, `${JSON.stringify({ ...manifest, version: "0.4.7" })}\n`);

  const runtimeToken = "y".repeat(43);
  const seen = [];
  let legacy;
  legacy = createServer((request, response) => {
    seen.push({ authorization: request.headers.authorization, url: request.url });
    if (request.url === "/api/internal/ownership-proof") {
      response.writeHead(404).end();
      return;
    }
    if (request.url === "/api/state") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end('{"schema_version":1,"source_of_truth":"hook"}\n');
      return;
    }
    if (request.url === "/api/internal/shutdown") {
      response.once("finish", () => {
        void removeRuntimeInfo(runtimeToken, env).then(() => legacy.close());
      });
      response.writeHead(202, { "content-type": "application/json" });
      response.end('{"status":"shutting_down"}\n');
      return;
    }
    response.writeHead(404).end();
  });
  await new Promise((resolvePromise, reject) => {
    legacy.once("error", reject);
    legacy.listen(0, LOOPBACK_HOST, resolvePromise);
  });
  t.after(() => {
    if (!legacy.listening) return undefined;
    return new Promise((resolvePromise) => legacy.close(resolvePromise));
  });
  const address = legacy.address();
  assert(address && typeof address !== "string");
  await writeRuntimeInfo({
    host: LOOPBACK_HOST,
    pid: process.pid,
    port: address.port,
    schema_version: RUNTIME_SCHEMA_VERSION,
    started_at_ms: Date.now(),
    token: runtimeToken,
    viewer_token: await readViewerToken(env),
  }, env);

  const result = await runCli(setup, runtimeRoot, ["install"]);
  assert.equal(result.code, 0, result.stderr);
  assert.deepEqual(seen.slice(0, 3), [
    { authorization: undefined, url: "/api/internal/ownership-proof" },
    { authorization: `Bearer ${runtimeToken}`, url: "/api/state" },
    { authorization: `Bearer ${runtimeToken}`, url: "/api/internal/shutdown" },
  ]);
  for (let index = 3; index < seen.length; index += 1) {
    const retryIndex = index - 3;
    assert.deepEqual(
      seen[index],
      retryIndex % 2 === 0
        ? { authorization: undefined, url: "/api/internal/ownership-proof" }
        : { authorization: `Bearer ${runtimeToken}`, url: "/api/state" },
    );
  }
  assert.equal(
    JSON.parse(await readFile(manifestPath, "utf8")).version,
    JSON.parse(await readFile(join(PACKAGE_ROOT, "package.json"), "utf8")).version,
  );
});

test("an unknown managed version gets no legacy bearer fallback and is preserved", async (t) => {
  if (process.platform === "win32") {
    t.skip("fake executable fixture uses a POSIX shebang");
    return;
  }
  const setup = await fixture(t);
  const runtimeRoot = join(setup.root, "unknown-version-runtime");
  const env = { CODEX_AGENT_VIEW_RUNTIME_DIR: runtimeRoot };
  assert.equal((await runCli(setup, runtimeRoot, ["install"])).code, 0);
  const manifestPath = installedManifestPath(runtimeRoot);
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  await writeFile(manifestPath, `${JSON.stringify({ ...manifest, version: "9.9.9" })}\n`);
  const seen = [];
  const spoof = createServer((request, response) => {
    seen.push({ authorization: request.headers.authorization, url: request.url });
    if (request.url === "/api/state") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end('{"schema_version":1,"source_of_truth":"hook"}\n');
      return;
    }
    response.writeHead(404).end();
  });
  await new Promise((resolvePromise, reject) => {
    spoof.once("error", reject);
    spoof.listen(0, LOOPBACK_HOST, resolvePromise);
  });
  t.after(() => new Promise((resolvePromise) => spoof.close(resolvePromise)));
  const address = spoof.address();
  assert(address && typeof address !== "string");
  await writeRuntimeInfo({
    host: LOOPBACK_HOST,
    pid: process.pid,
    port: address.port,
    schema_version: RUNTIME_SCHEMA_VERSION,
    started_at_ms: Date.now(),
    token: "u".repeat(43),
    viewer_token: await readViewerToken(env),
  }, env);

  const result = await runCli(setup, runtimeRoot, ["uninstall"]);
  assert.equal(result.code, 1);
  assert.deepEqual(seen, [
    { authorization: undefined, url: "/api/internal/ownership-proof" },
  ]);
  assert.equal(JSON.parse(await readFile(manifestPath, "utf8")).version, "9.9.9");
  await access(runtimeFile(env));
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
  const installedViewerToken = await readViewerToken(env);
  const monitor = await startMonitorServer({
    env,
    port: 0,
    viewerToken: installedViewerToken,
  });
  t.after(async () => monitor.close());

  const result = await runCli(setup, runtimeRoot, ["uninstall"]);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /Stopped the owned monitor/);
  assert.equal(monitor.server.address(), null);
  await assertMissing(runtimeFile(env));
  await assertMissing(viewerCredentialFile(env));
  await assertMissing(join(runtimeRoot, "marketplace"));

  const reinstall = await runCli(setup, runtimeRoot, ["install"]);
  assert.equal(reinstall.code, 0, reinstall.stderr);
  const replacementViewerToken = await readViewerToken(env);
  assert.notEqual(replacementViewerToken, installedViewerToken);
  assert(!`${reinstall.stdout}${reinstall.stderr}`.includes(replacementViewerToken));
});

test("normal uninstall and purge preserve malformed and symbolic-link viewer credentials", async (t) => {
  if (process.platform === "win32") {
    t.skip("symbolic-link and fake executable fixture is POSIX-specific");
    return;
  }
  const setup = await fixture(t);

  for (const kind of ["malformed", "symlink"]) {
    for (const purge of [false, true]) {
      const mode = purge ? "purge" : "normal";
      const runtimeRoot = join(setup.root, `${kind}-${mode}-viewer-runtime`);
      const env = { CODEX_AGENT_VIEW_RUNTIME_DIR: runtimeRoot };
      const install = await runCli(setup, runtimeRoot, ["install"]);
      assert.equal(install.code, 0, install.stderr);
      const credentialPath = viewerCredentialFile(env);
      await rm(credentialPath);

      if (kind === "malformed") {
        await writeFile(credentialPath, "user-owned\n");
      } else {
        const target = join(setup.root, `${mode}-user-viewer-target.json`);
        await writeFile(target, "user-owned\n");
        await symlink(target, credentialPath);
      }

      const uninstall = await runCli(
        setup,
        runtimeRoot,
        purge ? ["uninstall", "--purge"] : ["uninstall"],
      );
      assert.equal(uninstall.code, 0, uninstall.stderr);
      assert.match(uninstall.stdout, /viewer credential was preserved/);
      assert.equal(await readFile(credentialPath, "utf8"), "user-owned\n");
      await assertMissing(join(runtimeRoot, "marketplace"));
    }
  }
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
  const staleEnv = { CODEX_AGENT_VIEW_RUNTIME_DIR: staleRoot };
  const stale = await writeStaleRuntime(staleRoot);
  const viewerToken = await ensureViewerToken(staleEnv);
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
  const replacement = await readRuntimeInfo(staleEnv);
  assert.notEqual(replacement.token, stale.token);
  assert.equal(replacement.viewer_token, viewerToken);
  assert.equal(await readViewerToken(staleEnv), viewerToken);
  const stopped = await stopMonitorChild(child);
  assert.equal(stopped.code, 0);
  await assertMissing(runtimeFile(staleEnv));
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
  assert.match(help.stdout, /^  codex-agent-view open$/m);
  assert.doesNotMatch(help.stdout, /\[--no-open\]/);
  assert.doesNotMatch(help.stdout, /prepare-live-view/);

  const removed = await runCli(
    setup,
    join(setup.root, "removed-command-runtime"),
    ["prepare-live-view"],
  );
  assert.equal(removed.code, 1);
  assert.match(removed.stderr, /unknown command: prepare-live-view/);
  assert.doesNotMatch(removed.stdout + removed.stderr, /#grant=|Bearer |token=/);
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
    source_path: installedPluginRoot(runtimeRoot),
    version: "0.5.1",
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
