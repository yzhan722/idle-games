import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import fastifyJwt from "@fastify/jwt";
import Fastify from "fastify";
import packJson from "../../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack } from "./types";
import { defaultCombatSkills } from "./combat_skills";
import { BUILD_FEAST_VITALITY, setCombatLoadout, startHpCombat, tickHpCombat } from "./hp_combat";
import { authRoutes } from "./routes/auth";
import { partyRoutes } from "./routes/party";
import { playerRoutes } from "./routes/player";
import { tradingRoutes } from "./routes/trading";
import { createMemoryStorage } from "./storage_memory";
import { WS_SESSION_REVOKED, createSocketRegistry, socketIsOpen } from "./ws_socket";

const pack = packJson as unknown as EnhancedContentPack;

/** 发行前审查发现的问题，各留一条回归。 */
function fakeSocket() {
  const sent: string[] = [];
  let closed = 0;
  return { sent, get closed() { return closed; }, send(text: string) { sent.push(text); }, close() { closed += 1; } };
}

describe("账号注销：在途请求与多条连接", () => {
  it("注销后到达的结算 / 命令 / 去重操作都被拒绝，不会把存档或回执建回来", async () => {
    const storage = createMemoryStorage();
    try {
      const user = await storage.findOrCreateGuestUser("rr-late");
      const state = await storage.getOrCreatePlayerState(user.id, pack.version);
      let release!: () => void;
      const gate = new Promise<void>((r) => { release = r; });
      const slow = storage.deduplicateOperation({ userId: user.id, operationId: "slow", operationPayload: {}, run: async () => { await gate; return 1; } });
      await storage.deleteAccount(user.id, new Date());
      release();
      await assert.rejects(() => slow, /Unauthorized/);
      await assert.rejects(() => storage.simulateToNow({ userId: user.id, state, now: new Date(), contentPack: pack }), /Unauthorized/);
      await assert.rejects(
        () => storage.executePlayerCommand({ userId: user.id, contentPack: pack, now: new Date(), operationId: "late", operationPayload: {}, apply: () => ({ ok: true }) }),
        /Unauthorized/,
      );
      await assert.rejects(() => storage.getOrCreatePlayerState(user.id, pack.version), /Unauthorized/);
    } finally {
      await storage.close();
    }
  });

  it("多开标签页：注销时每一条连接都断开，断开后也不能再以这个账号发言", async () => {
    const storage = createMemoryStorage();
    try {
      const leaver = await storage.findOrCreateGuestUser("rr-tabs");
      const other = await storage.findOrCreateGuestUser("rr-listener");
      for (const u of [leaver, other]) await storage.getOrCreatePlayerState(u.id, pack.version);
      const tab1 = fakeSocket();
      const tab2 = fakeSocket();
      const ear = fakeSocket();
      storage.wsConnect(leaver.id, { socket: tab1 });
      storage.wsConnect(leaver.id, { socket: tab2 });
      storage.wsConnect(other.id, { socket: ear });
      await storage.deleteAccount(leaver.id, new Date());
      assert.ok(tab1.closed >= 1, "旧标签页的连接也要断开");
      assert.ok(tab2.closed >= 1);
      assert.equal(ear.closed, 0);
      const before = ear.sent.length;
      storage.wsMessage(leaver.id, JSON.stringify({ type: "chat:send", channel: "world", content: "ghost" }));
      assert.equal(ear.sent.length, before, "已注销账号的消息不再广播");
    } finally {
      await storage.close();
    }
  });

  it("刷新页面：旧连接的断开事件晚到，不会把新连接踢下线；当前连接断了，另一条接着收消息", async () => {
    const storage = createMemoryStorage();
    try {
      const me = await storage.findOrCreateGuestUser("rr-refresh");
      const other = await storage.findOrCreateGuestUser("rr-talker");
      for (const u of [me, other]) await storage.getOrCreatePlayerState(u.id, pack.version);
      const oldSock = fakeSocket();
      const newSock = fakeSocket();
      storage.wsConnect(me.id, { socket: oldSock });
      storage.wsConnect(me.id, { socket: newSock });
      storage.wsConnect(other.id, { socket: fakeSocket() });
      const say = (content: string) => storage.wsMessage(other.id, JSON.stringify({ type: "chat:send", channel: "world", content }));
      storage.wsDisconnect(me.id, { socket: oldSock });
      say("after-refresh");
      assert.ok(newSock.sent.some((m) => m.includes("after-refresh")));

      storage.wsConnect(me.id, { socket: oldSock });
      storage.wsDisconnect(me.id, { socket: oldSock });
      say("handed-over");
      assert.ok(newSock.sent.some((m) => m.includes("handed-over")), "还在线的标签页接着收");
      storage.wsDisconnect(me.id, { socket: newSock });
      const count = newSock.sent.length;
      say("nobody-home");
      assert.equal(newSock.sent.length, count);
    } finally {
      await storage.close();
    }
  });

  it("队员注销：别人队伍里进行中的活动不再留着他的编号", async () => {
    const storage = createMemoryStorage();
    try {
      const a = (await storage.findOrCreateGuestUser("rr-base-a")).id;
      const b = (await storage.findOrCreateGuestUser("rr-base-b")).id;
      for (const id of [a, b]) await storage.getOrCreatePlayerState(id, pack.version);
      const party = await storage.createParty({ userId: a });
      await storage.joinParty({ userId: b, partyId: party.id });
      const started = await storage.startPartyActivity({ userId: a, partyId: party.id, activityType: "group_craft", durationMinutes: 5, contentPack: pack });
      assert.equal(started.success, true, started.message);
      await storage.deleteAccount(b, new Date());
      const left = await storage.getPartyForUser({ userId: a });
      assert.ok(left?.currentActivity);
      assert.equal(JSON.stringify(left).includes(b), false);
    } finally {
      await storage.close();
    }
  });
});

describe("市场：同一 operationId 的并发请求", () => {
  it("双击 / 重试同时到达只挂一张单、只扣一次，两次都拿到同一张单", async () => {
    const storage = createMemoryStorage();
    const app = Fastify({ logger: false });
    app.addHook("onRequest", async (req) => { (req as any).userId = req.headers["x-user"]; });
    await tradingRoutes(app, storage, pack);
    try {
      const user = await storage.findOrCreateGuestUser("rr-double");
      const state = await storage.getOrCreatePlayerState(user.id, pack.version);
      state.inventory.ore_5 = 10;
      const value = Number((pack.items as Array<{ id: string; value?: number }>).find((i) => i.id === "ore_5")!.value);
      const send = (quantity = 3) =>
        app.inject({ method: "POST", url: "/trading/orders", headers: { "x-user": user.id }, payload: { itemId: "ore_5", quantity, price: value, type: "sell", operationId: "dbl-1" } });
      const [x, y, z] = await Promise.all([send(), send(), send(4)]);
      assert.equal(x.statusCode, 200);
      assert.equal(y.json().id, x.json().id);
      assert.notEqual(z.statusCode, 200, "同一编号换了内容要拒绝");
      assert.equal((await storage.getMyTradingOrders({ userId: user.id })).length, 1);
      assert.equal((await storage.getOrCreatePlayerState(user.id, pack.version)).inventory.ore_5, 7);

      // 并发执行时底层也只跑一次
      let runs = 0;
      const run = async () => { runs += 1; await new Promise((r) => setImmediate(r)); return runs; };
      const results = await Promise.all([1, 2, 3].map(() => storage.deduplicateOperation({ userId: user.id, operationId: "dbl-2", operationPayload: {}, run })));
      assert.equal(runs, 1);
      assert.deepEqual(results.map((r) => r.result), [1, 1, 1]);
      // 失败不留痕迹，可以重试
      await assert.rejects(() => storage.deduplicateOperation({ userId: user.id, operationId: "dbl-3", operationPayload: {}, run: async () => { throw new Error("boom"); } }), /boom/);
      assert.equal((await storage.deduplicateOperation({ userId: user.id, operationId: "dbl-3", operationPayload: {}, run: async () => "ok" })).result, "ok");
    } finally {
      await app.close();
      await storage.close();
    }
  });
});

describe("战斗结算不听客户端另报的内容", () => {
  it("组队波次按开战时定下的关卡结算，另报高级关卡没用；/actions/start 不能直接起刷打怪动作", async () => {
    const storage = createMemoryStorage();
    const app = Fastify({ logger: false });
    app.addHook("onRequest", async (req) => { (req as any).userId = req.headers["x-user"]; });
    let now = Date.now();
    await partyRoutes(app, storage, pack, { clock: () => new Date(now) });
    await playerRoutes(app, storage, pack);
    try {
      const user = await storage.findOrCreateGuestUser("rr-wave");
      await storage.getOrCreatePlayerState(user.id, pack.version);
      const headers = { "x-user": user.id };
      const direct = await app.inject({ method: "POST", url: "/actions/start", headers, payload: { actionId: "act_combat_slime" } });
      assert.equal(direct.statusCode, 400);
      assert.equal(direct.json().error, "combat_not_startable");

      const party = await storage.createParty({ userId: user.id });
      const started = await app.inject({ method: "POST", url: "/party/start-activity", headers, payload: { partyId: party.id, activityType: "raid", stageId: "forest", durationMinutes: 30 } });
      assert.equal(started.statusCode, 200, started.body);
      now += 10 * 60_000;
      const cleared = await app.inject({ method: "POST", url: "/party/wave-clear", headers, payload: { partyId: party.id, stageId: "omega", wave: 1 } });
      assert.equal(cleared.statusCode, 200, cleared.body);
      const kills = Object.keys((await storage.getOrCreatePlayerState(user.id, pack.version)).stats?.killsByMonster || {});
      const forest = (pack.stages as Array<{ id: string; monsters: string[] }>).find((s) => s.id === "forest")!.monsters;
      assert.ok(kills.length > 0);
      for (const id of kills) assert.ok(forest.includes(id), id);
    } finally {
      await app.close();
      await storage.close();
    }
  });
});

describe("凭据变了就断开已连上的 WebSocket", () => {
  function sock() {
    const s = {
      readyState: 1,
      codes: [] as Array<number | undefined>,
      sent: [] as string[],
      send(text: string) { s.sent.push(text); },
      close(code?: number) { s.codes.push(code); s.readyState = 2; },
    };
    return s;
  }

  it("登出、绑定账号密码、绑定 Google：自己的每一条连接都断开并带吊销码，别人的不动，新连接照常收消息", async () => {
    const storage = createMemoryStorage();
    const app = Fastify({ logger: false });
    await app.register(fastifyJwt, { secret: "test-secret" });
    app.addHook("onRequest", async (req) => {
      const raw = req.headers.authorization?.slice("Bearer ".length);
      if (raw) (req as any).userId = app.jwt.verify<{ sub: string }>(raw).sub;
    });
    await authRoutes(app, storage);
    try {
      const guest = (await app.inject({ method: "POST", url: "/auth/guest", payload: {} })).json() as { userId: string; token: string };
      const other = await storage.findOrCreateGuestUser("ws-other");
      for (const id of [guest.userId, other.id]) await storage.getOrCreatePlayerState(id, pack.version);
      const bystander = sock();
      storage.wsConnect(other.id, { socket: bystander });

      const open = () => {
        const tabs = [sock(), sock()];
        for (const t of tabs) storage.wsConnect(guest.userId, { socket: t });
        return tabs;
      };
      let tabs = open();
      const bound = await app.inject({ method: "POST", url: "/auth/bind/password", headers: { authorization: `Bearer ${guest.token}` }, payload: { username: "ws-me", password: "pass-1234" } });
      assert.equal(bound.statusCode, 200, bound.body);
      for (const t of tabs) assert.deepEqual(t.codes, [WS_SESSION_REVOKED]);
      for (const t of tabs) {
        assert.equal(socketIsOpen(t), false, "关闭握手没走完也不再处理它发来的消息");
        const n = t.sent.length;
        storage.wsMessage(other.id, JSON.stringify({ type: "chat:send", channel: "world", content: "hello" }));
        assert.equal(t.sent.length, n, "断开后不再收到消息");
      }

      // 旧连接的断开事件晚到，不影响用新凭证连上的那条
      const fresh = sock();
      storage.wsConnect(guest.userId, { socket: fresh });
      for (const t of tabs) storage.wsDisconnect(guest.userId, { socket: t });
      const before = fresh.sent.length;
      storage.wsMessage(other.id, JSON.stringify({ type: "chat:send", channel: "world", content: "still here" }));
      assert.equal(fresh.sent.length, before + 1);
      assert.deepEqual(fresh.codes, []);

      const out = await app.inject({ method: "POST", url: "/auth/logout", headers: { authorization: `Bearer ${bound.json().token}` }, payload: {} });
      assert.equal(out.statusCode, 200, out.body);
      assert.deepEqual(fresh.codes, [WS_SESSION_REVOKED]);

      tabs = open();
      await storage.bindGoogle(guest.userId, "google-sub-1");
      for (const t of tabs) assert.deepEqual(t.codes, [WS_SESSION_REVOKED]);
      assert.deepEqual(bystander.codes, []);
    } finally {
      await app.close();
      await storage.close();
    }
  });
});

describe("盛宴护盾不沿用别的减伤", () => {
  async function eater() {
    const storage = createMemoryStorage();
    const user = await storage.findOrCreateGuestUser("rr-feast");
    const st = (await storage.getOrCreatePlayerState(user.id, pack.version)) as any;
    st.combatSkills = defaultCombatSkills(40);
    st.chapter4Build = "feast_vitality";
    st.abilityLoadout = [];
    st.inventory.food_simple = 50;
    assert.equal(setCombatLoadout(st, pack, { food: [{ itemId: "food_simple", triggerMissingHp: 1 }] }).ok, true);
    const t0 = new Date("2026-09-02T00:00:00.000Z");
    st.hpCombat = startHpCombat(st, pack, "mine_boss", t0);
    return { storage, st, t0: t0.getTime() };
  }
  const bossHit = async (patch: (enc: any, t0: number) => void) => {
    const { storage, st, t0 } = await eater();
    try {
      patch(st.hpCombat, t0);
      const before = st.hpCombat.playerHp;
      // 打到首领第一下为止
      const step = st.hpCombat.enemyIntervalMs;
      tickHpCombat(st, pack, new Date(t0 + step), step, () => 0.99);
      const hits = (st.hpCombat.log as string[]).filter((l) => l.startsWith("矿山霸主") && l.includes("造成"));
      return { dmg: Number(/造成 (\d+) 伤害/.exec(hits[0] ?? "")?.[1]), before, enc: st.hpCombat };
    } finally {
      await storage.close();
    }
  };

  it("已过期的坚守（哪怕更强）不算；吃东西只给盛宴自己的 0.72；坚守还在时取更强的，但不因为吃东西延长", async () => {
    const plain = await bossHit(() => undefined);
    assert.ok(plain.dmg > 5, String(plain.dmg));
    const hurt = (enc: any) => { enc.playerHp -= 30; };
    const feast = await bossHit(hurt);
    assert.equal(feast.dmg, Math.max(1, Math.floor(plain.dmg * BUILD_FEAST_VITALITY.foodGuardMult)));
    const stale = await bossHit((enc, t0) => { hurt(enc); enc.braceUntil = t0 - 1; enc.braceMult = 0.45; });
    assert.equal(stale.dmg, feast.dmg, "过期的 0.45 不能被盛宴沿用");
    const active = await bossHit((enc, t0) => { hurt(enc); enc.braceUntil = t0 + 10_000; enc.braceMult = 0.45; });
    assert.equal(active.dmg, Math.max(1, Math.floor(plain.dmg * 0.45)));
    assert.equal(active.enc.braceUntil - (active.enc.feastUntil - BUILD_FEAST_VITALITY.foodGuardMs) <= 10_000, true);
    const short = await bossHit((enc, t0) => { hurt(enc); enc.braceUntil = t0 + 500; enc.braceMult = 0.45; });
    assert.equal(short.dmg, feast.dmg, "坚守先到期，之后只剩盛宴的 0.72");
  });
});

describe("注销时清掉旁路文件", () => {
  it("读不出来的 .corrupt 副本和写到一半的 .tmp，提到这个账号的删掉，其余不动", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wl-corrupt-"));
    const persistPath = path.join(dir, "store.json");
    const storage = createMemoryStorage({ persistPath });
    try {
      const leaver = await storage.findOrCreateGuestUser("rr-corrupt");
      const stayer = await storage.findOrCreateGuestUser("rr-stay");
      for (const u of [leaver, stayer]) await storage.getOrCreatePlayerState(u.id, pack.version);
      const put = (name: string, text: string) => fs.writeFileSync(path.join(dir, name), text);
      put("store.json.corrupt.1", `{"users":[{"id":"${leaver.id}","username":"x"`);
      put("store.json.corrupt.2", `{"users":[{"id":"${stayer.id}"`);
      put("store.json.tmp.1.2", `${leaver.id}`);
      put("other.json.corrupt.1", `${leaver.id}`);
      await storage.deleteAccount(leaver.id, new Date());
      const left = fs.readdirSync(dir).sort();
      assert.deepEqual(left, ["other.json.corrupt.1", "store.json", "store.json.bak", "store.json.corrupt.2"]);
      for (const name of ["store.json", "store.json.bak"]) {
        const text = fs.readFileSync(path.join(dir, name), "utf8");
        // 只剩墓碑里的随机编号
        assert.equal(text.split(leaver.id).length - 1, 1, name);
      }
    } finally {
      await storage.close();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("同账号多条连接：换线时不选正在关的那条（第五轮复核）", () => {
  it("当前连接断开后接着用还开着的；只剩正在关的就当作下线", () => {
    const reg = createSocketRegistry();
    const open = { readyState: 1 };
    const closing = { readyState: 2 };
    const current = { readyState: 3 };
    reg.add("u", open);
    reg.add("u", closing);
    reg.add("u", current);
    assert.equal(reg.remove("u", current), open);
    assert.equal(reg.remove("u", open), undefined);
    assert.equal(reg.remove("nobody", open), undefined);
  });
});
