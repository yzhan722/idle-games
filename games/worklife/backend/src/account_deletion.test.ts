import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import Fastify from "fastify";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import packJson from "../../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack } from "./types";
import { DELETED_ACCOUNT_ID, DELETE_CONFIRM_TEXT, TOMBSTONE_DAYS, tombstoneExpired } from "./account_deletion";
import { mapThrownError } from "./http_errors";
import { isPublicApiPath } from "./http_public_path";
import { authRoutes } from "./routes/auth";
import { createMemoryStorage } from "./storage_memory";

const pack = packJson as unknown as EnhancedContentPack;
const DAY_MS = 24 * 3600_000;

/** 与 index.ts 同样的钩子顺序：公开路径放行，其余要求账号仍在且会话版本一致。 */
async function buildApp(storage: ReturnType<typeof createMemoryStorage>) {
  const app = Fastify({ logger: false });
  app.setErrorHandler((error, _req, reply) => {
    const mapped = mapThrownError(error);
    return reply.status(mapped.status).send(mapped.body);
  });
  await app.register(jwt, { secret: "account_deletion_test_secret_32_chars" });
  await app.register(rateLimit, {
    max: 1000,
    timeWindow: "1 minute",
    keyGenerator: (req) => {
      const auth = req.headers.authorization;
      if (auth?.startsWith("Bearer ")) {
        try { return `u:${app.jwt.verify<{ sub: string }>(auth.slice(7)).sub}`; } catch { /* 按 IP */ }
      }
      return `ip:${req.ip}`;
    },
    errorResponseBuilder: () => ({ error: "rate_limited", statusCode: 429 }),
  });
  await authRoutes(app, storage);
  app.addHook("preHandler", async (req, reply) => {
    if (isPublicApiPath(req.url)) return;
    const auth = req.headers.authorization;
    try {
      const payload = app.jwt.verify<{ sub: string; av?: number }>(String(auth).slice(7));
      const user = await storage.getUser(payload.sub);
      if (!user || payload.av !== (user.authVersion ?? 1)) throw new Error("Unauthorized");
      (req as any).userId = payload.sub;
    } catch {
      return reply.status(401).send({ error: "Unauthorized" });
    }
  });
  return app;
}

type App = Awaited<ReturnType<typeof buildApp>>;
const post = (app: App, url: string, payload: unknown, token?: string) =>
  app.inject({ method: "POST", url, payload: payload as object, headers: token ? { authorization: `Bearer ${token}` } : {} });

async function register(app: App, username: string, password = "correct horse") {
  const res = await post(app, "/auth/register", { username, password });
  assert.equal(res.statusCode, 200);
  return res.json() as { userId: string; token: string };
}

describe("账号注销接口", () => {
  it("没登录 401；密码错 403 且什么都不删；密码对才删，登录名当场释放", async () => {
    const storage = createMemoryStorage();
    const app = await buildApp(storage);
    try {
      const { userId, token } = await register(app, "leaver");
      const state = await storage.getOrCreatePlayerState(userId, pack.version);
      state.inventory.gold = 777;
      await storage.savePlayerState(userId, state);

      assert.equal((await post(app, "/auth/account/delete", { password: "correct horse" })).statusCode, 401);
      assert.equal((await post(app, "/auth/account/delete", { password: "correct horse" }, "garbage")).statusCode, 401);
      for (const payload of [{}, { password: "wrong" }, { confirmText: DELETE_CONFIRM_TEXT }]) {
        const res = await post(app, "/auth/account/delete", payload, token);
        assert.equal(res.statusCode, 403, JSON.stringify(payload));
        assert.equal(res.json().error, "invalid_password");
      }
      assert.equal((await storage.getOrCreatePlayerState(userId, pack.version)).inventory.gold, 777);

      const ok = await post(app, "/auth/account/delete", { password: "correct horse" }, token);
      assert.equal(ok.statusCode, 200);
      assert.deepEqual(ok.json(), { ok: true, ordersRemoved: 0 });
      assert.equal(await storage.getUser(userId), null);
      assert.equal(await storage.findUserByUsername("leaver"), null);
      assert.equal((await post(app, "/auth/login", { username: "leaver", password: "correct horse" })).statusCode, 401);

      const again = await register(app, "leaver");
      assert.notEqual(again.userId, userId, "同名重新注册是全新的账号");
      assert.equal((await storage.getOrCreatePlayerState(again.userId, pack.version)).inventory.gold || 0, 0);
    } finally {
      await app.close();
      await storage.close();
    }
  });

  it("重复请求幂等：断网重试得到「已注销」；旧会话不能再用别的接口，也不会把存档重新建出来", async () => {
    const storage = createMemoryStorage();
    const app = await buildApp(storage);
    try {
      const { userId, token } = await register(app, "retry");
      await storage.getOrCreatePlayerState(userId, pack.version);
      assert.equal((await post(app, "/auth/account/delete", { password: "correct horse" }, token)).statusCode, 200);
      const replay = await post(app, "/auth/account/delete", { password: "correct horse" }, token);
      assert.equal(replay.statusCode, 200);
      assert.deepEqual(replay.json(), { ok: true, alreadyDeleted: true });
      const me = await app.inject({ method: "GET", url: "/auth/me", headers: { authorization: `Bearer ${token}` } });
      assert.equal(me.statusCode, 401);
      await assert.rejects(() => storage.getOrCreatePlayerState(userId, pack.version), /Unauthorized/);
      // 从没注销过的账号编号不会被当成已注销
      const stranger = app.jwt.sign({ sub: "11111111-1111-1111-1111-111111111111", av: 1 });
      assert.equal((await post(app, "/auth/account/delete", {}, stranger)).statusCode, 401);
      // 登出后的旧会话不能拿来注销
      const other = await register(app, "loggedout");
      await storage.invalidateSessions(other.userId);
      assert.equal((await post(app, "/auth/account/delete", { password: "correct horse" }, other.token)).statusCode, 401);
      assert.ok(await storage.getUser(other.userId));
    } finally {
      await app.close();
      await storage.close();
    }
  });

  it("按账号限流：10 分钟内试错 5 次之后 429，别的账号不受影响", async () => {
    const storage = createMemoryStorage();
    const app = await buildApp(storage);
    try {
      const a = await register(app, "bruteforced");
      for (let i = 0; i < 5; i++) assert.equal((await post(app, "/auth/account/delete", { password: `nope${i}` }, a.token)).statusCode, 403);
      const blocked = await post(app, "/auth/account/delete", { password: "correct horse" }, a.token);
      assert.equal(blocked.statusCode, 429);
      assert.equal(blocked.json().error, "rate_limited");
      assert.ok(await storage.getUser(a.userId), "被限流时不删");
      const b = await register(app, "innocent");
      assert.equal((await post(app, "/auth/account/delete", { password: "correct horse" }, b.token)).statusCode, 200);
    } finally {
      await app.close();
      await storage.close();
    }
  });

  it("没有密码的游客改用确认文字", async () => {
    const storage = createMemoryStorage();
    const app = await buildApp(storage);
    try {
      const guest = (await post(app, "/auth/guest", {})).json() as { userId: string; token: string; resumeToken: string };
      assert.equal((await post(app, "/auth/account/delete", { confirmText: "好的" }, guest.token)).statusCode, 400);
      assert.equal((await post(app, "/auth/account/delete", { confirmText: DELETE_CONFIRM_TEXT }, guest.token)).statusCode, 200);
      assert.equal((await post(app, "/auth/guest", { resumeToken: guest.resumeToken })).statusCode, 401, "恢复凭证一起失效");
      assert.equal((await post(app, "/auth/account/delete", { surprise: 1 }, guest.token)).statusCode, 400);
    } finally {
      await app.close();
      await storage.close();
    }
  });
});

describe("注销的清理范围（内存存储）", () => {
  it("挂单撤下且托管物不给别人；退队、邀请、强化委托、回执都清掉；历史成交只留价格", async () => {
    const storage = createMemoryStorage();
    try {
      const mk = async (key: string) => {
        const user = await storage.findOrCreateGuestUser(`del-${key}-${Math.random()}`);
        const state = await storage.getOrCreatePlayerState(user.id, pack.version);
        state.inventory.gold = 10_000;
        state.inventory.wood_1 = 100;
        return { id: user.id, state };
      };
      const leaver = await mk("leaver");
      const mate = await mk("mate");
      const buyer = await mk("buyer");

      const sold = await storage.createTradingOrder({ userId: leaver.id, itemId: "wood_1", quantity: 5, price: 12, type: "sell" });
      await storage.executeTrade({ buyerId: buyer.id, orderId: sold.id, quantity: 2 });
      await storage.createTradingOrder({ userId: leaver.id, itemId: "ore_1", quantity: 3, price: 20, type: "buy" });
      const mateOrder = await storage.createTradingOrder({ userId: mate.id, itemId: "wood_1", quantity: 4, price: 13, type: "sell" });
      const party = await storage.createParty({ userId: leaver.id, name: "散伙队" });
      await storage.joinParty({ userId: mate.id, partyId: party.id });
      await storage.inviteToParty({ userId: leaver.id, partyId: party.id, targetUserId: buyer.id });
      assert.equal(buyer.state.partyInvites?.length, 1);
      await storage.deduplicateOperation({ userId: leaver.id, operationId: "op-1", operationPayload: {}, run: async () => 1 });

      const buyerGold = buyer.state.inventory.gold;
      const mateWood = mate.state.inventory.wood_1;
      assert.deepEqual(await storage.deleteAccount(leaver.id, new Date()), { ordersRemoved: 2 });

      const orders = await storage.getTradingOrders({ itemId: "wood_1" });
      assert.deepEqual(orders.map((o) => o.id), [mateOrder.id], "只撤注销者自己的单");
      assert.equal((await storage.getTradingOrders({ itemId: "ore_1" })).length, 0);
      assert.equal(buyer.state.inventory.gold, buyerGold, "托管金币不退给别人");
      assert.equal(mate.state.inventory.wood_1, mateWood);
      assert.equal(mate.state.partyState, undefined, "队长注销，队伍解散");
      assert.equal((await storage.listParties({})).some((p) => p.id === party.id), false);
      assert.equal(buyer.state.partyInvites?.length, 0);
      const [trade] = await storage.getRecentTrades({ itemId: "wood_1", days: 14, now: new Date() });
      assert.equal(trade.price, 12);
      assert.equal(trade.sellerId, DELETED_ACCOUNT_ID, "卖家编号抹去");
      assert.equal(trade.buyerId, buyer.id);
      assert.equal(await storage.deleteAccount(leaver.id, new Date()), null, "再删一次没有东西可删");
    } finally {
      await storage.close();
    }
  });

  it("队员注销只是退队，队伍还在", async () => {
    const storage = createMemoryStorage();
    try {
      const a = (await storage.findOrCreateGuestUser("del-lead")).id;
      const b = (await storage.findOrCreateGuestUser("del-member")).id;
      await storage.getOrCreatePlayerState(a, pack.version);
      await storage.getOrCreatePlayerState(b, pack.version);
      const party = await storage.createParty({ userId: a });
      await storage.joinParty({ userId: b, partyId: party.id });
      await storage.deleteAccount(b, new Date());
      const left = await storage.getPartyForUser({ userId: a });
      assert.deepEqual(left?.members.map((m) => m.userId), [a]);
    } finally {
      await storage.close();
    }
  });

  it("落盘：主存档和 .bak 里都不再有这个人的账号与存档，重启后仍记得已注销", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "worklife-del-"));
    const file = path.join(dir, "save.json");
    try {
      const storage = createMemoryStorage({ persistPath: file });
      const user = await storage.createPasswordUser("秘密玩家名", "scrypt$hash-of-secret");
      const state = await storage.getOrCreatePlayerState(user.id, pack.version);
      state.settings = { ...(state.settings as any), playerName: "只有我叫这个" };
      await storage.savePlayerState(user.id, state);
      await storage.close();

      const reopened = createMemoryStorage({ persistPath: file });
      await reopened.deleteAccount(user.id, new Date());
      for (const f of [file, `${file}.bak`]) {
        const text = fs.readFileSync(f, "utf8");
        for (const secret of ["秘密玩家名", "只有我叫这个", "hash-of-secret"]) assert.equal(text.includes(secret), false, `${path.basename(f)} 还留着 ${secret}`);
      }
      await reopened.close();

      const again = createMemoryStorage({ persistPath: file });
      assert.equal(await again.wasAccountDeleted(user.id, new Date()), true);
      assert.equal(await again.wasAccountDeleted(user.id, new Date(Date.now() + (TOMBSTONE_DAYS + 1) * DAY_MS)), false, "墓碑过期");
      const later = await again.findOrCreateGuestUser("later");
      await again.deleteAccount(later.id, new Date(Date.now() + (TOMBSTONE_DAYS + 1) * DAY_MS));
      assert.equal(fs.readFileSync(file, "utf8").includes(user.id), false, "过期墓碑被清掉");
      await again.close();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("墓碑期限与登录凭证有效期一致，坏时间按过期算", () => {
    const now = new Date("2026-11-26T00:00:00Z");
    assert.equal(tombstoneExpired("2026-11-01T00:00:00Z", now), false);
    assert.equal(tombstoneExpired("2026-10-01T00:00:00Z", now), true);
    assert.equal(tombstoneExpired("not a date", now), true);
  });
});
