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
  // 与 index.ts 的全局钩子一致：Bearer JWT -> req.userId（bind/* 路由依赖它）
  app.addHook("onRequest", async (req) => {
    const auth = req.headers.authorization;
    if (auth?.startsWith("Bearer ")) {
      try { (req as any).userId = app.jwt.verify<{ sub: string }>(auth.slice(7)).sub; } catch { /* anonymous */ }
    }
  });
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

test("password auth: register, login, bind to a guest, and survive a restart", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "worklife-pw-"));
  const file = path.join(dir, "save.json");
  const storage = createMemoryStorage({ persistPath: file });
  const app = await guestApp(storage);
  try {
    const reg = await app.inject({ method: "POST", url: "/auth/register", payload: { username: "hero_01", password: "s3cretpw" } });
    assert.equal(reg.statusCode, 200);
    const { userId, token } = reg.json() as { userId: string; token: string };
    assert.ok(userId && token);

    // 重名（大小写不敏感）→ 409
    const dupe = await app.inject({ method: "POST", url: "/auth/register", payload: { username: "HERO_01", password: "whatever1" } });
    assert.equal(dupe.statusCode, 409);
    assert.equal((dupe.json() as { error: string }).error, "username_taken");

    // 错密码 → 401；对密码 → 同一 userId
    const bad = await app.inject({ method: "POST", url: "/auth/login", payload: { username: "hero_01", password: "wrongpw1" } });
    assert.equal(bad.statusCode, 401);
    const ok = await app.inject({ method: "POST", url: "/auth/login", payload: { username: "Hero_01", password: "s3cretpw" } });
    assert.equal(ok.statusCode, 200);
    assert.equal((ok.json() as { userId: string }).userId, userId);

    // 游客补绑账号：进度保留，此后可用密码登录同一存档
    const guest = await app.inject({ method: "POST", url: "/auth/guest", payload: {} });
    const g = guest.json() as { userId: string; token: string };
    const gstate = await storage.getOrCreatePlayerState(g.userId, "1.0.0");
    gstate.inventory.gold = 77;
    await storage.savePlayerState(g.userId, gstate);
    const bound = await app.inject({ method: "POST", url: "/auth/bind/password", headers: { authorization: `Bearer ${g.token}` }, payload: { username: "promoted_1", password: "pw123456" } });
    assert.equal(bound.statusCode, 200);
    const relogin = await app.inject({ method: "POST", url: "/auth/login", payload: { username: "promoted_1", password: "pw123456" } });
    assert.equal(relogin.statusCode, 200);
    assert.equal((relogin.json() as { userId: string }).userId, g.userId);
    assert.equal((await storage.getOrCreatePlayerState(g.userId, "1.0.0")).inventory.gold, 77);

    // 已占用的用户名不能绑到别人头上
    const steal = await app.inject({ method: "POST", url: "/auth/bind/password", headers: { authorization: `Bearer ${g.token}` }, payload: { username: "hero_01", password: "pw123456" } });
    assert.equal(steal.statusCode, 409);

    await storage.close();
    // 重启后用户名索引重建，凭密码仍登同一账号
    const reopened = createMemoryStorage({ persistPath: file });
    const app2 = await guestApp(reopened);
    const again = await app2.inject({ method: "POST", url: "/auth/login", payload: { username: "hero_01", password: "s3cretpw" } });
    assert.equal(again.statusCode, 200);
    assert.equal((again.json() as { userId: string }).userId, userId);
    // 落盘文件不存明文密码
    assert.equal(fs.readFileSync(file, "utf8").includes("s3cretpw"), false);
    await app2.close();
    await reopened.close();
  } finally {
    await app.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});


test("durability & crash recovery: trading orders persist and .bak auto-recovers corrupted primary save", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "worklife-durability-"));
  const file = path.join(dir, "save.json");
  const storage = createMemoryStorage({ persistPath: file });
  try {
    const u = await storage.createGuestUser();
    const st = await storage.getOrCreatePlayerState(u.id, "1.0.0");
    st.inventory.gold = 5000;
    st.inventory.wood_1 = 50;
    await storage.savePlayerState(u.id, st);

    // 第一次 close 落盘主文件，第二次修改并 close 以生成 .bak 备份
    await storage.close();
    const order = await storage.createTradingOrder({
      userId: u.id,
      itemId: "wood_1",
      quantity: 20,
      price: 10,
      type: "sell",
    });
    await storage.close();

    assert.equal(fs.existsSync(`${file}.bak`), true);

    // 1) 正常重启后挂单与扣除后的库存均完整保留
    const reopened1 = createMemoryStorage({ persistPath: file });
    const myOrders1 = await reopened1.getMyTradingOrders({ userId: u.id });
    assert.equal(myOrders1.length, 1);
    assert.equal(myOrders1[0].id, order.id);
    assert.equal(myOrders1[0].quantity, 20);
    const st1 = await reopened1.getOrCreatePlayerState(u.id, "1.0.0");
    assert.equal(st1.inventory.wood_1, 30);
    assert.equal(st1.inventory.gold, 5000);
    // 再次保存让 .bak 也包含挂单状态
    await reopened1.savePlayerState(u.id, st1);
    await reopened1.close();

    // 2) 模拟断电导致主存档文件被截断损坏，验证自动从 .bak 恢复且不丢数据
    fs.writeFileSync(file, "{corrupted_truncated_json", "utf8");
    const recovered = createMemoryStorage({ persistPath: file });
    const stRecovered = await recovered.getOrCreatePlayerState(u.id, "1.0.0");
    assert.equal(stRecovered.inventory.gold, 5000);
    assert.equal(stRecovered.inventory.wood_1, 30);
    const ordersRecovered = await recovered.getMyTradingOrders({ userId: u.id });
    assert.equal(ordersRecovered.length, 1);
    assert.equal(ordersRecovered[0].id, order.id);
    await recovered.close();
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("password auth supports email/symbol/single-char usernames, idempotent register, /auth/me, and logout->relogin", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "worklife-auth-flex-"));
  const file = path.join(dir, "save.json");
  const storage = createMemoryStorage({ persistPath: file });
  const app = await guestApp(storage);
  try {
    for (const uname of ["player@example.com", "风", "hero-01.test"]) {
      const r1 = await app.inject({ method: "POST", url: "/auth/register", payload: { username: uname, password: "1234" } });
      assert.equal(r1.statusCode, 200, `register ${uname}`);
      const j1 = r1.json() as { userId: string; token: string; username: string };
      assert.equal(j1.username, uname);

      // Idempotent register with matching password logs in seamlessly
      const rSame = await app.inject({ method: "POST", url: "/auth/register", payload: { username: uname, password: "1234" } });
      assert.equal(rSame.statusCode, 200);
      assert.equal((rSame.json() as { userId: string }).userId, j1.userId);

      // /auth/me returns the authenticated user
      const me = await app.inject({ method: "GET", url: "/auth/me", headers: { authorization: `Bearer ${j1.token}` } });
      assert.equal(me.statusCode, 200);
      assert.equal((me.json() as { username: string }).username, uname);

      // Logout invalidates old token, but login with password issues a fresh working token
      const out = await app.inject({ method: "POST", url: "/auth/logout", headers: { authorization: `Bearer ${j1.token}` } });
      assert.equal(out.statusCode, 200);
      const loginAgain = await app.inject({ method: "POST", url: "/auth/login", payload: { username: uname, password: "1234" } });
      assert.equal(loginAgain.statusCode, 200);
      const j2 = loginAgain.json() as { userId: string; token: string; username: string };
      assert.equal(j2.userId, j1.userId);
      const me2 = await app.inject({ method: "GET", url: "/auth/me", headers: { authorization: `Bearer ${j2.token}` } });
      assert.equal(me2.statusCode, 200);
    }
  } finally {
    await app.close();
    await storage.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
