import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  LOOPBACK_HOST,
  RUNTIME_SCHEMA_VERSION,
  readRuntimeInfo,
  removeRuntimeInfo,
  runtimeFile,
  writeRuntimeInfo,
} from "../src/runtime/config.mjs";

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
