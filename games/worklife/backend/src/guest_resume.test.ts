import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import Fastify from "fastify";
import jwt from "@fastify/jwt";
import { authRoutes } from "./routes/auth";
import { createMemoryStorage } from "./storage_memory";

const JWT_SECRET = "guest_resume_test_secret_32_chars_min";

async function guestApp(storage: ReturnType<typeof createMemoryStorage>) {
  const app = Fastify({ logger: false });
  await app.register(jwt, { secret: JWT_SECRET });
  await authRoutes(app, storage);
  return app;
}

test("guest resume contract: deviceId is not a credential", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "worklife-guest-"));
  const file = path.join(dir, "save.json");
  const storage = createMemoryStorage({ persistPath: file });
  const app = await guestApp(storage);
  try {
    const first = await app.inject({
      method: "POST",
      url: "/auth/guest",
      payload: { deviceId: "shared-device" },
    });
    assert.equal(first.statusCode, 200);
    const created = first.json() as { userId: string; token: string };
    const state = await storage.getOrCreatePlayerState(created.userId, "1.0.0");
    state.inventory.gold = 123;
    await storage.savePlayerState(created.userId, state);

    const intruder = await app.inject({
      method: "POST",
      url: "/auth/guest",
      payload: { deviceId: "shared-device" },
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
    assert.equal((await storage.getOrCreatePlayerState(created.userId, "1.0.0")).inventory.gold, 123);

    const missing = await app.inject({ method: "POST", url: "/auth/guest/resume-token" });
    assert.equal(missing.statusCode, 401);

    await storage.close();
    const usersBefore = (JSON.parse(fs.readFileSync(file, "utf8")) as { users: unknown[] }).users.length;
    const reopened = createMemoryStorage({ persistPath: file });
    const again = await guestApp(reopened);
    const invalid = await again.inject({
      method: "POST",
      url: "/auth/guest",
      payload: { resumeToken: "not-a-valid-resume-token" },
    });
    assert.equal(invalid.statusCode, 401);
    assert.equal((invalid.json() as { error: string }).error, "invalid_guest_resume_token");
    await reopened.close();
    const saved = fs.readFileSync(file, "utf8");
    assert.equal((JSON.parse(saved) as { users: unknown[] }).users.length, usersBefore);
    assert.equal(saved.includes(resumeToken), false);
    assert.equal(saved.includes(createHash("sha256").update(resumeToken).digest("hex")), true);
    const restored = createMemoryStorage({ persistPath: file });
    assert.equal((await restored.getOrCreatePlayerState(created.userId, "1.0.0")).inventory.gold, 123);
    await restored.close();
    await again.close();
  } finally {
    await app.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
