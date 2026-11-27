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
import { mapThrownError } from "./http_errors";
import { isPublicApiPath } from "./http_public_path";
import { chatRoutes, progressionRoutes } from "./routes";
import { createMemoryStorage } from "./storage_memory";
import { CHAT_BLOCK_MAX, REPORT_DAILY_MAX, REPORT_KEEP_DAYS, REPORT_SNAPSHOT_SIZE, createChatRing, reportGate } from "./chat_moderation";
import { isBlockedName, maskBlockedName, maskChatText } from "./name_filter";
import { maskAccountName, shownName } from "./display_name";
import { CRATE_CONSUMABLES, CRATE_GOLD_MAX, CRATE_GOLD_MIN, CRATE_ODDS_TEXT, CRATE_PICKS, GIFT_BOOKS, GIFT_BOOK_ODDS_TEXT, TASK_SHOP, buyTaskShop, claimGift, ensureTasks } from "./tasks";

const pack = packJson as unknown as EnhancedContentPack;
const KEY = "chat_reports_admin_Zq8w3Lp0xY_k7";

function fakeSocket() {
  const messages: any[] = [];
  return { messages, send(text: string) { messages.push(JSON.parse(text)); } };
}

async function setup(persistPath?: string) {
  const storage = createMemoryStorage(persistPath ? { persistPath } : undefined);
  const app = Fastify({ logger: false });
  app.setErrorHandler((error, _req, reply) => {
    const mapped = mapThrownError(error);
    return reply.status(mapped.status).send(mapped.body);
  });
  await app.register(jwt, { secret: "chat_moderation_test_secret_32_chars!" });
  await app.register(rateLimit, { max: 1000, timeWindow: "1 minute" });
  app.addHook("preHandler", async (req, reply) => {
    if (isPublicApiPath(req.url)) return;
    try {
      (req as any).userId = app.jwt.verify<{ sub: string }>(String(req.headers.authorization).slice(7)).sub;
    } catch {
      return reply.status(401).send({ error: "Unauthorized" });
    }
  });
  await chatRoutes(app, storage);
  await progressionRoutes(app, storage, pack, {});
  const mk = async (device: string, name?: string, classId = "woodcutter") => {
    const user = await storage.findOrCreateGuestUser(device);
    const st = await storage.getOrCreatePlayerState(user.id, "1.0.0");
    st.activeClassId = classId;
    if (name) st.settings = { ...(st.settings as any), playerName: name };
    await storage.savePlayerState(user.id, st);
    const sock = fakeSocket();
    storage.wsConnect(user.id, { socket: sock });
    sock.messages.length = 0;
    return { id: user.id, sock, headers: { authorization: `Bearer ${app.jwt.sign({ sub: user.id })}` } };
  };
  const say = (from: { id: string }, content: string, channel = "world", recipient?: string) =>
    storage.wsMessage(from.id, JSON.stringify({ type: "chat:send", channel, content, ...(recipient ? { recipient } : {}) }));
  const got = (who: { sock: ReturnType<typeof fakeSocket> }, content: string) => who.sock.messages.some((m) => m.type === "chat:message" && m.content === content);
  const admin = (key?: string, q = "") => app.inject({ method: "GET", url: `/admin/chat-reports${q}`, headers: key ? { "x-admin-key": key } : {} });
  return { storage, app, mk, say, got, admin };
}

describe("聊天屏蔽：各通道收不到，对方无感（内存存储 + inject）", () => {
  it("屏蔽后公聊、私聊、组队邀请都到不了；对方看到的回执和平常一样；解除后恢复", async () => {
    const { storage, app, mk, say, got } = await setup();
    try {
      const me = await mk("blk-me", "小林");
      const rude = await mk("blk-rude", "阿凯");
      const other = await mk("blk-other", "路人");
      const res = await app.inject({ method: "POST", url: "/chat/block", headers: me.headers, payload: { targetUserId: rude.id, blocked: true } });
      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.json().blocked, [{ userId: rude.id, name: "阿凯" }]);
      assert.deepEqual((await app.inject({ method: "GET", url: "/chat/blocks", headers: me.headers })).json().blocked, [{ userId: rude.id, name: "阿凯" }]);

      say(rude, "world-hi");
      assert.equal(got(me, "world-hi"), false);
      assert.equal(got(other, "world-hi"), true);
      assert.equal(got(rude, "world-hi"), true, "发言人照常看到自己的消息");
      say(rude, "prof-hi", "profession");
      assert.equal(got(me, "prof-hi"), false);
      assert.equal(got(other, "prof-hi"), true);

      say(rude, "pm-hi", "private", me.id);
      assert.equal(got(me, "pm-hi"), false);
      const echo = rude.sock.messages.find((m) => m.content === "pm-hi");
      assert.equal(echo?.isSelf, true, "私聊回执照常");
      assert.equal(rude.sock.messages.some((m) => m.type === "chat:error"), false, "不报错、不提示被屏蔽");

      const party = await storage.createParty({ userId: rude.id });
      const inv = await storage.inviteToParty({ userId: rude.id, partyId: party.id, targetUserId: me.id });
      assert.deepEqual(inv, { success: true });
      assert.equal((await storage.getOrCreatePlayerState(me.id, "1.0.0")).partyInvites?.length ?? 0, 0);
      assert.equal(me.sock.messages.some((m) => m.kind === "party:invite"), false);
      const inv2 = await storage.inviteToParty({ userId: rude.id, partyId: party.id, targetUserId: other.id });
      assert.deepEqual(inv2, { success: true }, "没屏蔽的人回执相同");

      // 我屏蔽他，不影响他收我的消息；别人也照常
      say(me, "from-me");
      assert.equal(got(rude, "from-me"), true);

      const un = await app.inject({ method: "POST", url: "/chat/block", headers: me.headers, payload: { targetUserId: rude.id, blocked: false } });
      assert.deepEqual(un.json().blocked, []);
      say(rude, "after-unblock");
      assert.equal(got(me, "after-unblock"), true);
    } finally {
      await storage.close();
    }
  });

  it("不能屏蔽自己、不存在的人；名单有上限", async () => {
    const { storage, app, mk } = await setup();
    try {
      const me = await mk("blk-self");
      assert.equal((await app.inject({ method: "POST", url: "/chat/block", headers: me.headers, payload: { targetUserId: me.id, blocked: true } })).json().error, "self");
      assert.equal((await app.inject({ method: "POST", url: "/chat/block", headers: me.headers, payload: { targetUserId: "nobody", blocked: true } })).json().error, "user_not_found");
      assert.equal(CHAT_BLOCK_MAX, 200);
      assert.equal((await app.inject({ method: "POST", url: "/chat/block", headers: me.headers, payload: { blocked: true } })).statusCode, 400);
    } finally {
      await storage.close();
    }
  });

  it("名单和举报写进快照，重启读回；注销时双方的名单和相关举报一起删", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wl-chatmod-"));
    const file = path.join(dir, "state.json");
    try {
      const first = await setup(file);
      const me = await first.mk("persist-me", "小周");
      const bad = await first.mk("persist-bad", "阿坏");
      await first.storage.setChatBlock({ userId: me.id, targetUserId: bad.id, blocked: true });
      await first.storage.reportChat({ reporterId: me.id, targetUserId: bad.id, reason: "abuse", channel: "world", now: new Date() });
      await first.storage.close();
      const second = await setup(file);
      assert.deepEqual(await second.storage.getChatBlocks(me.id), [{ userId: bad.id, name: "阿坏" }]);
      assert.equal((await second.storage.listChatReports({ since: new Date(0), limit: 10 })).length, 1);
      await second.storage.deleteAccount(bad.id, new Date());
      assert.deepEqual(await second.storage.getChatBlocks(me.id), []);
      assert.equal((await second.storage.listChatReports({ since: new Date(0), limit: 10 })).length, 0);
      await second.storage.close();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("聊天举报：快照、去重、限流、到期清理、管理接口（内存存储 + inject）", () => {
  it("举报抄该频道最近几条；重复举报只记一次；管理接口没配密钥或不对 404", async () => {
    const { storage, app, mk, say, admin } = await setup();
    const saved = process.env.REPORTS_ADMIN_KEY;
    try {
      const me = await mk("rep-me", "小林");
      const bad = await mk("rep-bad", "阿坏");
      for (let i = 0; i < REPORT_SNAPSHOT_SIZE + 5; i++) say(bad, `line-${i}`);
      const ok = await app.inject({ method: "POST", url: "/chat/report", headers: me.headers, payload: { targetUserId: bad.id, reason: "abuse", channel: "world" } });
      assert.equal(ok.statusCode, 200);
      const dup = await app.inject({ method: "POST", url: "/chat/report", headers: me.headers, payload: { targetUserId: bad.id, reason: "spam", channel: "world" } });
      assert.deepEqual(dup.json(), { ok: true }, "重复举报也回已收到");
      assert.equal((await app.inject({ method: "POST", url: "/chat/report", headers: me.headers, payload: { targetUserId: me.id, reason: "abuse", channel: "world" } })).statusCode, 400);
      assert.equal((await app.inject({ method: "POST", url: "/chat/report", headers: me.headers, payload: { targetUserId: bad.id, reason: "nope", channel: "world" } })).statusCode, 400);

      delete process.env.REPORTS_ADMIN_KEY;
      assert.equal((await admin(KEY)).statusCode, 404);
      process.env.REPORTS_ADMIN_KEY = KEY;
      assert.equal((await admin()).statusCode, 404);
      assert.equal((await admin("wrong_key_that_is_long_enough_123")).statusCode, 404);
      const view = await admin(KEY);
      assert.equal(view.statusCode, 200);
      const reports = view.json().reports;
      assert.equal(reports.length, 1);
      assert.equal(reports[0].reason, "abuse");
      assert.equal(reports[0].targetId, bad.id);
      assert.equal(reports[0].snapshot.length, REPORT_SNAPSHOT_SIZE);
      assert.equal(reports[0].snapshot.at(-1).content, `line-${REPORT_SNAPSHOT_SIZE + 4}`);
      assert.equal(view.json().keepDays, REPORT_KEEP_DAYS);
      assert.equal((await admin(KEY, "?days=999")).statusCode, 400);
    } finally {
      if (saved === undefined) delete process.env.REPORTS_ADMIN_KEY;
      else process.env.REPORTS_ADMIN_KEY = saved;
      await storage.close();
    }
  });

  it("内存里没有该频道的消息（如重启后、没入队）就只存举报本身；私聊按两人一对取", async () => {
    const { storage, mk, say } = await setup();
    try {
      const me = await mk("rep2-me");
      const bad = await mk("rep2-bad");
      const third = await mk("rep2-third");
      await storage.reportChat({ reporterId: me.id, targetUserId: bad.id, reason: "other", channel: "party", now: new Date() });
      say(bad, "secret-to-third", "private", third.id);
      say(bad, "pm-to-me", "private", me.id);
      await storage.reportChat({ reporterId: me.id, targetUserId: third.id, reason: "spam", channel: "private", now: new Date() });
      await storage.reportChat({ reporterId: third.id, targetUserId: bad.id, reason: "abuse", channel: "private", now: new Date() });
      const list = await storage.listChatReports({ since: new Date(0), limit: 10 });
      const byPair = (r: string, t: string) => list.find((x) => x.reporterId === r && x.targetId === t)!;
      assert.deepEqual(byPair(me.id, bad.id).snapshot, []);
      assert.deepEqual(byPair(me.id, third.id).snapshot, [], "别人之间的私聊抄不到");
      assert.deepEqual(byPair(third.id, bad.id).snapshot.map((l) => l.content), ["secret-to-third"]);
    } finally {
      await storage.close();
    }
  });

  it("每人 24 小时最多 REPORT_DAILY_MAX 次；过了期限的举报被清除", async () => {
    const { storage, app, mk } = await setup();
    try {
      const me = await mk("lim-me");
      const targets = [];
      for (let i = 0; i <= REPORT_DAILY_MAX; i++) targets.push(await mk(`lim-t${i}`));
      // 接口本身每分钟 5 次（按账号），日上限在存储层：前几次直接走存储
      for (let i = 0; i < REPORT_DAILY_MAX; i++) {
        assert.deepEqual(await storage.reportChat({ reporterId: me.id, targetUserId: targets[i].id, reason: "spam", channel: "world", now: new Date() }), { ok: true, duplicate: false });
      }
      const over = await app.inject({ method: "POST", url: "/chat/report", headers: me.headers, payload: { targetUserId: targets[REPORT_DAILY_MAX].id, reason: "spam", channel: "world" } });
      assert.equal(over.statusCode, 429);
      assert.equal(over.json().error, "report_limited");
      const later = new Date(Date.now() + 25 * 3600_000);
      assert.deepEqual(await storage.reportChat({ reporterId: me.id, targetUserId: targets[REPORT_DAILY_MAX].id, reason: "spam", channel: "world", now: later }), { ok: true, duplicate: false });
      assert.equal(await storage.purgeChatReports(new Date(Date.now() + (REPORT_KEEP_DAYS - 1) * 24 * 3600_000)), 0, "没到期不删");
      assert.equal(await storage.purgeChatReports(new Date(Date.now() + (REPORT_KEEP_DAYS + 2) * 24 * 3600_000)), REPORT_DAILY_MAX + 1);
      assert.equal((await storage.listChatReports({ since: new Date(0), limit: 100 })).length, 0);
    } finally {
      await storage.close();
    }
  });

  it("纯规则：去重先于限流；环形缓冲只留最近几条、注销时丢掉这个人", () => {
    const now = new Date("2026-11-27T00:00:00Z");
    const recent = Array.from({ length: REPORT_DAILY_MAX }, (_, i) => ({ targetId: `t${i}`, createdAt: new Date(now.getTime() - 3600_000).toISOString() }));
    assert.equal(reportGate(recent, "t0", now), "duplicate");
    assert.equal(reportGate(recent, "new", now), "limited");
    assert.equal(reportGate(recent.map((r) => ({ ...r, createdAt: "2026-11-25T00:00:00Z" })), "t0", now), "ok");
    const ring = createChatRing(3, 2);
    for (let i = 0; i < 5; i++) ring.push("world", { ts: String(i), sender: i % 2 ? "a" : "b", senderName: "", content: String(i) });
    assert.deepEqual(ring.snapshot("world").map((l) => l.content), ["2", "3", "4"]);
    ring.push("private:a:b", { ts: "x", sender: "a", senderName: "", content: "pm" });
    ring.push("party:p", { ts: "y", sender: "b", senderName: "", content: "pp" });
    assert.equal(ring.size(), 2, "超过上限丢掉最久没说话的");
    ring.forget("a");
    assert.deepEqual(ring.snapshot("private:a:b"), []);
  });
});

describe("昵称与聊天打码（同一份词表）", () => {
  it("变体：空格、标点、全角、大小写、数字代字母都认；正常名字不误伤", () => {
    for (const bad of ["傻逼", "傻 逼", "傻_逼", "ＦＵＣＫ", "f.u.c.k", "sh1t", "admin01", "GM_Tom", "官方客服", "系统小助手", "小王客服", "N1gger", "希特勒"]) {
      assert.equal(isBlockedName(bad), true, bad);
    }
    for (const fine of ["小明", "badminton", "Classic", "侠客服饰", "Grape", "Peacock", "Assassin", "阿凯", "绿叶剑士", "Sussex"]) {
      assert.equal(isBlockedName(fine), false, fine);
    }
  });

  it("旧名字读出打码：只换命中的字；默认名与正常名原样；账号名同名规则仍在", () => {
    assert.equal(maskBlockedName("我是傻逼"), "我是＊＊");
    assert.equal(maskBlockedName("傻 逼王"), "＊＊＊王");
    assert.equal(maskBlockedName("admin01"), "＊＊＊＊＊01");
    assert.equal(maskBlockedName("小明"), "小明");
    assert.equal(shownName("abcdef123", "傻逼"), "＊＊");
    assert.equal(shownName("abcdef123", ""), "玩家_abcdef");
    assert.equal(maskAccountName("傻逼", "someone"), "＊＊");
    assert.equal(maskAccountName("小明", "小明"), "小＊＊");
  });

  it("建角与改名走同一个接口：命中就 400；聊天里的旧名字和正文打码，不拦发送，冒充类词不打正文", async () => {
    const { storage, app, mk, say } = await setup();
    try {
      const me = await mk("nf-me");
      const set = (playerName: string) => app.inject({ method: "POST", url: "/progression/settings", headers: me.headers, payload: { playerName } });
      assert.equal((await set("傻 逼")).statusCode, 400);
      assert.equal((await set("官方客服")).statusCode, 400);
      assert.equal((await set("小林")).statusCode, 200);
      const old = await mk("nf-old", "我是傻逼");
      say(old, "你是傻逼吗 官方活动");
      const msg = me.sock.messages.find((m) => m.type === "chat:message");
      assert.equal(msg.senderName, "我是＊＊");
      assert.equal(msg.content, "你是＊＊吗 官方活动");
      assert.equal(maskChatText("hello fuck"), "hello ＊＊＊＊");
    } finally {
      await storage.close();
    }
  });
});

describe("几率公示与代码一致", () => {
  const fresh = async () => {
    const storage = createMemoryStorage();
    const u = await storage.findOrCreateGuestUser("odds");
    const st = await storage.getOrCreatePlayerState(u.id, "1.0.0");
    const now = new Date();
    ensureTasks(st, pack, now);
    st.tasksState!.tokens = 1000;
    return { st, now, storage };
  };

  it("补给箱：说明一行与常量一致；最小、最大随机数落在两端；每种消耗品都抽得到", async () => {
    assert.equal(CRATE_ODDS_TEXT, `金币 800–1500 与 3 份消耗品（每份 4 种各 25%）`);
    assert.equal(TASK_SHOP.find((i) => i.id === "crate")!.blurb, CRATE_ODDS_TEXT);
    const { st, now, storage } = await fresh();
    const low = buyTaskShop(st, pack, "crate", now, () => 0);
    assert.equal(low.ok && low.gained.gold, CRATE_GOLD_MIN);
    const high = buyTaskShop(st, pack, "crate", now, () => 0.999999);
    assert.equal(high.ok && high.gained.gold, CRATE_GOLD_MAX);
    CRATE_CONSUMABLES.forEach((id, i) => {
      const r = buyTaskShop(st, pack, "crate", now, () => (i + 0.5) / CRATE_CONSUMABLES.length);
      assert.equal(r.ok && r.gained[id], CRATE_PICKS, id);
    });
    await storage.close();
  });

  it("行会谢礼：三本技能书等概率", async () => {
    assert.equal(GIFT_BOOK_ODDS_TEXT, "技能书 3 本各 33.3%");
    const { st, now, storage } = await fresh();
    GIFT_BOOKS.forEach((book, i) => {
      st.tasksState!.points = 1000;
      const r = claimGift(st, pack, now, () => (i + 0.5) / GIFT_BOOKS.length);
      assert.equal(r.ok && r.book, book);
    });
    await storage.close();
  });
});

describe("PostgreSQL：屏蔽与举报的建表、过滤与清理（源码核对，没有库不跑集成）", () => {
  const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
  it("迁移、schema、init 三处都有两张表、级联删除和索引", () => {
    for (const p of ["database/migrations/007_chat_moderation.sql", "database/schema.sql", "src/storage_pg.ts"]) {
      const src = read(p);
      for (const part of ["CREATE TABLE IF NOT EXISTS chat_blocks", "CREATE TABLE IF NOT EXISTS chat_reports", "PRIMARY KEY (user_id, blocked_user_id)", "idx_chat_reports_created ON chat_reports(created_at)", "idx_chat_reports_reporter ON chat_reports(reporter_id, created_at)"]) {
        assert.ok(src.includes(part), `${p} 缺 ${part}`);
      }
      assert.ok((src.match(/REFERENCES users\(id\) ON DELETE CASCADE/g) ?? []).length >= 4, `${p} 级联`);
    }
  });
  it("广播按发言人过滤、私聊与邀请看对方名单、到期按天数删、正文和名字打码", () => {
    const src = read("src/storage_pg.ts");
    assert.ok(src.includes("deliverFrom(c, from, text);"));
    assert.ok(src.includes("deliverFrom(recipientConn, userId, JSON.stringify(payload), () =>"));
    assert.ok(src.includes("if (c.blocked.has(from)) return;"));
    assert.ok(src.includes('"SELECT 1 FROM chat_blocks WHERE user_id = $1 AND blocked_user_id = $2", [targetUserId, userId]'));
    assert.ok(src.includes('"SELECT blocked_user_id FROM chat_blocks WHERE user_id = $1"'));
    assert.ok(src.includes("DELETE FROM chat_reports WHERE created_at < $1::timestamptz - make_interval(days => $2)"));
    assert.ok(src.includes("maskChatText(") && src.includes("shownName(userId, st.settings?.playerName)"));
    assert.ok(src.includes("chatRing.forget(userId)"));
  });
});

describe("屏蔽与打码：审查修补（2026-11-27）", () => {
  const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
  it("PostgreSQL：名单从库里读完前，别人的发言先压着，读完按名单放行；同一个人再开标签页沿用已读好的名单", () => {
    const src = read("src/storage_pg.ts");
    assert.ok(src.includes("if (c.held.length < HELD_MAX) c.held.push({ from, text, onSent });"));
    assert.ok(src.includes(".finally(() => releaseHeld(c));"));
    assert.ok(src.includes("blocked: prev?.blocked ?? new Set<string>(),"));
    assert.ok(src.includes("blockedLoaded: prev?.blockedLoaded ?? false,"));
  });

  it("世界播报带上播报对象：屏蔽了他的人看不到他的播报（两套存储）", () => {
    for (const file of ["src/storage_pg.ts", "src/storage_memory.ts"]) {
      const src = read(file);
      const calls = src.match(/broadcast\("world", \{ type: "chat:system", channel: "world", ts: nowIso\(\), text \}[^)]*\)/g) || [];
      // announceWorld（系统自己的公告）不带发言人，其余都是玩家播报
      assert.equal(calls.filter((c) => c.endsWith("text })")).length, 1, file);
      assert.ok(calls.filter((c) => /text \}, (command\.)?userId\)$/.test(c)).length >= 2, file);
    }
  });

  it("公开队伍列表里的队名按名字规则打码", async () => {
    const { friendlyPartyName } = await import("./party_bots");
    assert.equal(friendlyPartyName("p1", "傻逼小队"), "＊＊小队");
    assert.equal(friendlyPartyName("p1", "森林远征队"), "森林远征队");
  });
});

