import assert from "node:assert/strict";
import { test } from "node:test";
import Fastify from "fastify";
import { assertRuntimePolicy, parseTrustProxy } from "./runtime_policy";

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

test("production rejects the sample secrets printed in the repository", () => {
  for (const JWT_SECRET of [
    "change_me_in_production_at_least_32_chars!",
    "your_secure_jwt_secret_at_least_32_characters_long",
    "dev_secret_key_minimum_32_characters_long",
  ]) {
    assert.throws(() => assertRuntimePolicy({ NODE_ENV: "production", JWT_SECRET }), /sample_jwt_secret_forbidden_in_production/);
    assert.doesNotThrow(() => assertRuntimePolicy({ NODE_ENV: "development", JWT_SECRET }));
  }
  assert.doesNotThrow(() => assertRuntimePolicy({ NODE_ENV: "production", JWT_SECRET: "k9".repeat(20) }));
});

test("trusted proxies: private hops by default, public peers cannot forge an address", async () => {
  assert.equal(parseTrustProxy(undefined), "loopback, linklocal, uniquelocal");
  assert.equal(parseTrustProxy("false"), false);
  const hops = parseTrustProxy("2") as (address: string, hop: number) => boolean;
  assert.deepEqual([0, 1, 2].map((hop) => hops("203.0.113.1", hop)), [true, true, false]);
  assert.equal(parseTrustProxy("10.0.0.0/8"), "10.0.0.0/8");
  const app = Fastify({ trustProxy: parseTrustProxy(undefined) });
  app.get("/ip", async (req) => ({ ip: req.ip }));
  const ask = async (remoteAddress: string, forwarded: string) =>
    (await app.inject({ url: "/ip", remoteAddress, headers: { "x-forwarded-for": forwarded } })).json().ip;
  assert.equal(await ask("172.18.0.3", "203.0.113.7"), "203.0.113.7");
  assert.equal(await ask("198.51.100.9", "203.0.113.7"), "198.51.100.9");
  await app.close();
});
