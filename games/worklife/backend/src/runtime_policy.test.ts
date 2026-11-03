import assert from "node:assert/strict";
import { test } from "node:test";
import { assertRuntimePolicy } from "./runtime_policy";

test("production rejects every test flag combination", () => {
  for (const flags of [
    { E2E_SEED: "1" }, { E2E_FAST: "1" },
    { E2E_SEED: "1", E2E_FAST: "1" },
  ]) {
    assert.throws(() => assertRuntimePolicy({ NODE_ENV: "production", ...flags }),
      /test_flags_forbidden_in_production/);
  }
});

test("normal production and explicit test environments remain usable", () => {
  assert.doesNotThrow(() => assertRuntimePolicy({ NODE_ENV: "production" }));
  assert.doesNotThrow(() => assertRuntimePolicy({ NODE_ENV: "test", E2E_SEED: "1", E2E_FAST: "1" }));
});
