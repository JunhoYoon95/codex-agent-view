import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  LOOPBACK_HOST,
  RUNTIME_SCHEMA_VERSION,
  autoStartPort,
  ensureViewerToken,
  readRuntimeInfo,
  readViewerToken,
  removeRuntimeInfo,
  removeViewerToken,
  runtimeFile,
  viewerCredentialFile,
  writeRuntimeInfo,
} from "../src/runtime/config.mjs";

test("uses a fixed validated loopback auto-start port", () => {
  assert.equal(autoStartPort({}), 43127);
  assert.equal(autoStartPort({ CODEX_AGENT_VIEW_AUTO_START_PORT: "54321" }), 54321);
  for (const value of ["0", "65536", "12.5", "not-a-port", " 43127"]) {
    assert.throws(
      () => autoStartPort({ CODEX_AGENT_VIEW_AUTO_START_PORT: value }),
      /invalid Codex Agent View auto-start port/,
    );
  }
});

async function temporaryRuntime(t) {
  const root = await mkdtemp(join(tmpdir(), "codex-agent-view-runtime-test-"));
  const env = { CODEX_AGENT_VIEW_RUNTIME_DIR: join(root, "runtime") };
  t.after(async () => rm(root, { force: true, recursive: true }));
  return { env, root };
}

function runtimeInfo(token = "t".repeat(43)) {
  return {
    schema_version: RUNTIME_SCHEMA_VERSION,
    host: LOOPBACK_HOST,
    port: 43127,
    token,
    pid: process.pid,
    started_at_ms: 100,
  };
}

test("writes and reads a private runtime file", async (t) => {
  const { env } = await temporaryRuntime(t);
  const expected = runtimeInfo();
  const path = await writeRuntimeInfo(expected, env);

  assert.equal(path, runtimeFile(env));
  assert.deepEqual(await readRuntimeInfo(env), expected);

  if (process.platform !== "win32") {
    assert.equal((await stat(path)).mode & 0o777, 0o600);
    assert.equal(
      (await stat(env.CODEX_AGENT_VIEW_RUNTIME_DIR)).mode & 0o777,
      0o700,
    );
  }
});

test("removes runtime info only when the expected token still owns it", async (t) => {
  const { env } = await temporaryRuntime(t);
  const expected = runtimeInfo();
  await writeRuntimeInfo(expected, env);

  assert.equal(await removeRuntimeInfo("x".repeat(43), env), false);
  await access(runtimeFile(env));
  assert.equal(await removeRuntimeInfo(expected.token, env), true);
  await assert.rejects(access(runtimeFile(env)), { code: "ENOENT" });
  assert.equal(await removeRuntimeInfo(expected.token, env), false);
});

test("creates, reuses, and removes a private viewer credential", async (t) => {
  const { env } = await temporaryRuntime(t);
  const firstToken = "a".repeat(43);
  const path = viewerCredentialFile(env);

  assert.equal(
    await ensureViewerToken(env, { seedToken: firstToken }),
    firstToken,
  );
  assert.equal(await readViewerToken(env), firstToken);
  assert.equal(
    await ensureViewerToken(env, { seedToken: "b".repeat(43) }),
    firstToken,
  );

  if (process.platform !== "win32") {
    assert.equal((await stat(path)).mode & 0o777, 0o600);
    assert.equal(
      (await stat(env.CODEX_AGENT_VIEW_RUNTIME_DIR)).mode & 0o777,
      0o700,
    );
  }

  assert.equal(await removeViewerToken("c".repeat(43), env), false);
  assert.equal(await readViewerToken(env), firstToken);
  assert.equal(await removeViewerToken(firstToken, env), true);
  await assert.rejects(readViewerToken(env), { code: "ENOENT" });
  assert.equal(await removeViewerToken(firstToken, env), false);
});

test("concurrent viewer credential creation converges on one token", async (t) => {
  const { env } = await temporaryRuntime(t);
  const seeds = Array.from(
    { length: 16 },
    (_, index) => `${String(index).padStart(2, "0")}${"x".repeat(41)}`,
  );

  const tokens = await Promise.all(
    seeds.map((seedToken) => ensureViewerToken(env, { seedToken })),
  );
  assert(tokens.every((token) => token === tokens[0]));
  assert(seeds.includes(tokens[0]));
  assert.equal(await readViewerToken(env), tokens[0]);
});

test("rejects weak viewer tokens and malformed credentials without overwriting", async (t) => {
  const { env } = await temporaryRuntime(t);
  for (const seedToken of [
    "x".repeat(42),
    "x".repeat(44),
    `${"x".repeat(42)}=`,
    `${"x".repeat(42)}+`,
  ]) {
    await assert.rejects(
      ensureViewerToken(env, { seedToken }),
      /invalid Codex Agent View viewer token/,
    );
  }

  await mkdir(env.CODEX_AGENT_VIEW_RUNTIME_DIR, { mode: 0o700 });
  const path = viewerCredentialFile(env);
  const malformed = '{"schema_version":1,"token":"too-short"}\n';
  await writeFile(path, malformed, { mode: 0o600 });

  await assert.rejects(
    readViewerToken(env),
    /invalid Codex Agent View viewer credential file/,
  );
  await assert.rejects(
    ensureViewerToken(env, { seedToken: "v".repeat(43) }),
    /invalid Codex Agent View viewer credential file/,
  );
  assert.equal(await readFile(path, "utf8"), malformed);
});

test("rejects a malformed viewer token published in runtime info", async (t) => {
  const { env } = await temporaryRuntime(t);
  await writeRuntimeInfo(
    { ...runtimeInfo(), viewer_token: "x".repeat(42) },
    env,
  );
  await assert.rejects(
    readRuntimeInfo(env),
    /invalid Codex Agent View runtime file/,
  );
});

test(
  "rejects symbolic-link and non-regular viewer credential paths",
  { skip: process.platform === "win32" },
  async (t) => {
    const symlinkFixture = await temporaryRuntime(t);
    await mkdir(symlinkFixture.env.CODEX_AGENT_VIEW_RUNTIME_DIR, { mode: 0o700 });
    const target = join(symlinkFixture.root, "viewer-target.json");
    const original = '{"schema_version":1,"token":"v"}\n';
    await writeFile(target, original, { mode: 0o600 });
    await symlink(target, viewerCredentialFile(symlinkFixture.env));

    await assert.rejects(
      readViewerToken(symlinkFixture.env),
      /refusing symbolic link viewer credential path/,
    );
    await assert.rejects(
      ensureViewerToken(symlinkFixture.env, { seedToken: "v".repeat(43) }),
      /refusing symbolic link viewer credential path/,
    );
    assert.equal(await readFile(target, "utf8"), original);

    const nonRegularFixture = await temporaryRuntime(t);
    await mkdir(nonRegularFixture.env.CODEX_AGENT_VIEW_RUNTIME_DIR, { mode: 0o700 });
    await mkdir(viewerCredentialFile(nonRegularFixture.env), { mode: 0o700 });
    await assert.rejects(
      readViewerToken(nonRegularFixture.env),
      /refusing non-regular viewer credential path/,
    );
    await assert.rejects(
      ensureViewerToken(nonRegularFixture.env, { seedToken: "v".repeat(43) }),
      /refusing non-regular viewer credential path/,
    );
  },
);

test(
  "rejects a symbolic-link runtime directory before reading or removing viewer auth",
  { skip: process.platform === "win32" },
  async (t) => {
    const { env, root } = await temporaryRuntime(t);
    const targetDirectory = join(root, "viewer-target-directory");
    const targetCredential = join(targetDirectory, "viewer-auth.json");
    const token = "v".repeat(43);
    const original = `${JSON.stringify({
      schema_version: 1,
      token,
    })}\n`;
    await mkdir(targetDirectory, { mode: 0o700 });
    await writeFile(targetCredential, original, { mode: 0o600 });
    await symlink(targetDirectory, env.CODEX_AGENT_VIEW_RUNTIME_DIR);

    await assert.rejects(
      readViewerToken(env),
      /refusing symbolic link runtime path/,
    );
    await assert.rejects(
      removeViewerToken(token, env),
      /refusing symbolic link runtime path/,
    );
    assert.equal(await readFile(targetCredential, "utf8"), original);
  },
);

test(
  "rejects a symbolic link used as the runtime file",
  { skip: process.platform === "win32" },
  async (t) => {
    const { env, root } = await temporaryRuntime(t);
    const directory = join(root, "runtime");
    const target = join(root, "target.json");
    await mkdir(directory, { mode: 0o700 });
    await writeFile(target, "unchanged\n", { mode: 0o600 });
    await symlink(target, runtimeFile(env));

    await assert.rejects(writeRuntimeInfo(runtimeInfo(), env), /refusing symbolic link/);
    await assert.rejects(readRuntimeInfo(env), /refusing symbolic link/);
    assert.equal(await readFile(target, "utf8"), "unchanged\n");
  },
);

test(
  "rejects a symbolic link used as the runtime directory before chmod or write",
  { skip: process.platform === "win32" },
  async (t) => {
    const { env, root } = await temporaryRuntime(t);
    const target = join(root, "target-directory");
    await mkdir(target, { mode: 0o755 });
    const modeBefore = (await stat(target)).mode & 0o777;
    await symlink(target, env.CODEX_AGENT_VIEW_RUNTIME_DIR);

    await assert.rejects(writeRuntimeInfo(runtimeInfo(), env), /refusing symbolic link/);
    assert.equal((await stat(target)).mode & 0o777, modeBefore);
    await assert.rejects(access(join(target, "runtime.json")), { code: "ENOENT" });
  },
);
