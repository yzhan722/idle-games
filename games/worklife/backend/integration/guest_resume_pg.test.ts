import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import Fastify from "fastify";
import jwt from "@fastify/jwt";
import { Pool } from "pg";
import { authRoutes } from "../src/routes/auth";
import { createPgStorage } from "../src/storage_pg";

const JWT_SECRET = "guest_resume_pg_secret_32_characters";

test("PostgreSQL guest resume matches the memory contract and migration is repeatable", async () => {
  const url = process.env.TEST_DATABASE_URL;
  assert.ok(url, "TEST_DATABASE_URL must point to an isolated test PostgreSQL database");
  const storage = await createPgStorage(url);
  const pool = new Pool({ connectionString: url });
  const app = Fastify({ logger: false });
  await app.register(jwt, { secret: JWT_SECRET });
  await authRoutes(app, storage);
  try {
    await storage.init();
    const deviceId = "shared-device-pg";
    const first = await app.inject({
      method: "POST",
      url: "/auth/guest",
      payload: { deviceId },
    });
    assert.equal(first.statusCode, 200);
    const created = first.json() as { userId: string; token: string };
    const state = await storage.getOrCreatePlayerState(created.userId, "1.0.0");
    state.inventory.gold = 123;
    await storage.savePlayerState(created.userId, state);

    const intruder = await app.inject({
      method: "POST",
      url: "/auth/guest",
      payload: { deviceId },
    });
    assert.equal(intruder.statusCode, 200);
    const other = intruder.json() as { userId: string; token: string };
    assert.notEqual(other.userId, created.userId);
    assert.notEqual(other.token, created.token);
    assert.equal((await storage.getOrCreatePlayerState(other.userId, "1.0.0")).inventory.gold, 0);
    assert.equal((await storage.getOrCreatePlayerState(created.userId, "1.0.0")).inventory.gold, 123);

    const issued = await app.inject({
      method: "POST",
      url: "/auth/guest/resume-token",
      headers: { authorization: `Bearer ${created.token}` },
    });
    assert.equal(issued.statusCode, 200);
    const resumeToken = (issued.json() as { resumeToken: string }).resumeToken;
    assert.ok(Buffer.from(resumeToken, "base64url").length >= 32);
    assert.equal((await storage.getOrCreatePlayerState(created.userId, "1.0.0")).inventory.gold, 123);

    const resumed = await app.inject({
      method: "POST",
      url: "/auth/guest",
      payload: { resumeToken },
    });
    assert.equal(resumed.statusCode, 200);
    assert.equal((resumed.json() as { userId: string }).userId, created.userId);

    const missing = await app.inject({ method: "POST", url: "/auth/guest/resume-token" });
    assert.equal(missing.statusCode, 401);

    const before = await pool.query("SELECT count(*)::int AS n FROM users");
    const invalid = await app.inject({
      method: "POST",
      url: "/auth/guest",
      payload: { resumeToken: "not-a-valid-resume-token" },
    });
    assert.equal(invalid.statusCode, 401);
    assert.equal((invalid.json() as { error: string }).error, "invalid_guest_resume_token");
    const after = await pool.query("SELECT count(*)::int AS n FROM users");
    assert.equal(after.rows[0].n, before.rows[0].n);

    const hash = createHash("sha256").update(resumeToken).digest("hex");
    const row = await pool.query(
      "SELECT guest_resume_token_hash FROM users WHERE id = $1",
      [created.userId]
    );
    assert.equal(row.rows[0].guest_resume_token_hash, hash);
    assert.equal(JSON.stringify(row.rows).includes(resumeToken), false);

    await storage.init();
    await storage.init();
    const second = await createPgStorage(url);
    await second.init();
    try {
      const found = await second.findUserByResumeTokenHash(hash);
      assert.equal(found?.id, created.userId);
      assert.equal((await second.getOrCreatePlayerState(created.userId, "1.0.0")).inventory.gold, 123);
    } finally {
      await second.close();
    }
    assert.equal((await storage.getOrCreatePlayerState(created.userId, "1.0.0")).inventory.gold, 123);
    const again = await pool.query(
      "SELECT guest_resume_token_hash FROM users WHERE id = $1",
      [created.userId]
    );
    assert.equal(again.rows[0].guest_resume_token_hash, hash);
  } finally {
    await app.close();
    await storage.close();
    await pool.end();
  }
});
