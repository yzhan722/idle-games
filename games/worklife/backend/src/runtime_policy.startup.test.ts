import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { test } from "node:test";

const backendRoot = path.resolve(__dirname, "..");
const POLICY_ERROR = "test_flags_forbidden_in_production";

function startEntry(flags: { E2E_SEED?: string; E2E_FAST?: string }) {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: "production",
    JWT_SECRET: "production_test_secret_at_least_32_chars",
    PORT: "18111",
  };
  delete env.DATABASE_URL;
  delete env.E2E_SEED;
  delete env.E2E_FAST;
  if (flags.E2E_SEED) env.E2E_SEED = flags.E2E_SEED;
  if (flags.E2E_FAST) env.E2E_FAST = flags.E2E_FAST;

  return new Promise<{ code: number | null; output: string }>((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", "src/index.ts"], {
      cwd: backendRoot,
      env,
      windowsHide: true,
    });
    let output = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`startup timed out\n${output}`));
    }, 20000);
    const take = (chunk: Buffer) => {
      output += chunk.toString();
      if (output.includes("Server running")) child.kill();
    };
    child.stdout.on("data", take);
    child.stderr.on("data", take);
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      resolve({ code, output });
    });
  });
}

test("production entry rejects every test flag combination before storage", async () => {
  for (const flags of [
    { E2E_SEED: "1" },
    { E2E_FAST: "1" },
    { E2E_SEED: "1", E2E_FAST: "1" },
  ]) {
    const result = await startEntry(flags);
    assert.match(result.output, new RegExp(POLICY_ERROR), result.output);
    assert.equal(result.output.includes("Server running"), false, result.output);
    assert.equal(result.output.includes("DATABASE_URL 未配置"), false, result.output);
    assert.notEqual(result.code, 0);
  }
});

test("production entry without test flags still passes the runtime policy", async () => {
  const result = await startEntry({});
  assert.equal(result.output.includes(POLICY_ERROR), false, result.output);
  assert.match(result.output, /DATABASE_URL 未配置/, result.output);
  assert.notEqual(result.code, 0);
});
