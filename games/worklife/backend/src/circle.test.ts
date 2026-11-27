import assert from "node:assert/strict";
import { createDecipheriv, createHash } from "node:crypto";
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
import { guildWarWeekKey } from "./progression2/abyss_guild";
import { isPublicApiPath } from "./http_public_path";
import { chatRoutes, circleRoutes, progressionRoutes } from "./routes";
import { createMemoryStorage } from "./storage_memory";
import {
  CIRCLE_CREATE_COST,
  CIRCLE_MAX_MEMBERS,
  CIRCLE_PENDING_MAX,
  CIRCLE_REAPPLY_COOLDOWN_MS,
  CIRCLE_WRITE_LIMIT,
  applyCircleAction,
  circleNameKey,
  circleWeekKey,
  isAcceptableCircleName,
  newCircleDoc,
  normalizeCircleDoc,
  removeAccountFromCircle,
  rollWeek,
  withdrawPending,
  type CircleDoc,
} from "./circle";
import { foldForCompare } from "./name_filter";

const pack = packJson as unknown as EnhancedContentPack;
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const NOW = new Date("2026-11-27T02:00:00Z");

function fakeSocket() {
  const messages: any[] = [];
  return { messages, send(text: string) { messages.push(JSON.parse(text)); } };
}

async function setup(opts: { persistPath?: string; rateMax?: number } = {}) {
  const storage = createMemoryStorage(opts.persistPath ? { persistPath: opts.persistPath } : undefined);
  const app = Fastify({ logger: false });
  app.setErrorHandler((error, _req, reply) => {
    const mapped = mapThrownError(error);
    return reply.status(mapped.status).send(mapped.body);
  });
  await app.register(jwt, { secret: "circle_test_secret_32_chars_long!!" });
  await app.register(rateLimit, { max: opts.rateMax ?? 1000, timeWindow: "1 minute", keyGenerator: (req) => String(req.headers.authorization ?? req.ip) });
  app.addHook("preHandler", async (req, reply) => {
    if (isPublicApiPath(req.url)) return;
    try {
      (req as any).userId = app.jwt.verify<{ sub: string }>(String(req.headers.authorization).slice(7)).sub;
    } catch {
      return reply.status(401).send({ error: "Unauthorized" });
    }
  });
  await chatRoutes(app, storage);
  await circleRoutes(app, storage);
  await progressionRoutes(app, storage, pack, {});
  const mk = async (device: string, name?: string, gold = 0) => {
    const user = await storage.findOrCreateGuestUser(device);
    const st = await storage.getOrCreatePlayerState(user.id, "1.0.0");
    st.activeClassId = "woodcutter";
    st.inventory.gold = gold;
    if (name) st.settings = { ...(st.settings as any), playerName: name };
    await storage.savePlayerState(user.id, st);
    const sock = fakeSocket();
    storage.wsConnect(user.id, { socket: sock });
    sock.messages.length = 0;
    return { id: user.id, sock, headers: { authorization: `Bearer ${app.jwt.sign({ sub: user.id })}` } };
  };
  type P = Awaited<ReturnType<typeof mk>>;
  const home = async (p: P) => (await app.inject({ method: "GET", url: "/circle", headers: p.headers })).json().home;
  const create = (p: P, name: string, operationId?: string) =>
    app.inject({ method: "POST", url: "/circle/create", headers: p.headers, payload: { name, ...(operationId ? { operationId } : {}) } });
  const act = (p: P, action: string, extra: Record<string, string> = {}) =>
    app.inject({ method: "POST", url: "/circle/action", headers: p.headers, payload: { action, ...extra } });
  const gold = async (p: P) => (await storage.getOrCreatePlayerState(p.id, "1.0.0")).inventory.gold;
  /** 会长 + 成员（申请后通过）。 */
  const join = async (leader: P, who: P) => {
    const circleId = (await home(leader)).circle.id;
    assert.equal((await act(who, "apply", { circleId })).statusCode, 200);
    assert.equal((await act(leader, "approve", { targetUserId: who.id })).statusCode, 200);
    return circleId as string;
  };
  return { storage, app, mk, home, create, act, gold, join };
}

describe("同好会规则（circle.ts，两个存储共用）", () => {
  const doc = (): CircleDoc => newCircleDoc({ id: "c1", name: "晨跑同好会", leaderId: "L", now: NOW, counters: { kills: 0, made: 0 } });

  it("名字：2～12 字、过屏蔽词与保留名；全角半角、大小写、空白不同也算同名", () => {
    assert.equal(isAcceptableCircleName("晨跑同好会"), true);
    assert.equal(isAcceptableCircleName("晨"), false);
    assert.equal(isAcceptableCircleName("一二三四五六七八九十一二三"), false);
    assert.equal(isAcceptableCircleName("系统"), false, "冒充官方");
    assert.equal(isAcceptableCircleName("商会补给站"), false, "系统账号名");
    assert.equal(isAcceptableCircleName("傻逼俱乐部"), false, "屏蔽词");
    assert.equal(isAcceptableCircleName("a<b>c"), false);
    assert.equal(circleNameKey("Moon Club"), circleNameKey("ｍｏｏｎclub"));
  });

  it("只有会长能通过、邀请、踢人、转让、解散；对自己不行", () => {
    for (const action of ["approve", "reject", "invite", "kick", "transfer", "disband"] as const) {
      const o = applyCircleAction(doc(), { action, actorId: "X", targetId: "Y", now: NOW, actorCircle: null });
      assert.deepEqual(o, { ok: false, error: "not_leader" }, action);
    }
    assert.deepEqual(applyCircleAction(doc(), { action: "kick", actorId: "L", targetId: "L", now: NOW, actorCircle: "c1" }), { ok: false, error: "self" });
  });

  it("重复申请、邀请、接受都算成功且不改动（幂等）；人满与待处理上限", () => {
    let d = doc();
    const a1 = applyCircleAction(d, { action: "apply", actorId: "A", now: NOW, actorCircle: null });
    assert.ok(a1.ok && a1.changed);
    d = (a1 as any).doc;
    const a2 = applyCircleAction(d, { action: "apply", actorId: "A", now: NOW, actorCircle: null });
    assert.ok(a2.ok && !a2.changed);
    const ok = applyCircleAction(d, { action: "approve", actorId: "L", targetId: "A", now: NOW, actorCircle: "c1", targetCircle: null });
    assert.ok(ok.ok && ok.joined[0] === "A");
    d = (ok as any).doc;
    const again = applyCircleAction(d, { action: "approve", actorId: "L", targetId: "A", now: NOW, actorCircle: "c1", targetCircle: "c1" });
    assert.ok(again.ok && !again.changed);
    const elsewhere = applyCircleAction(doc(), { action: "apply", actorId: "B", now: NOW, actorCircle: "c9" });
    assert.deepEqual(elsewhere, { ok: false, error: "already_in_circle" });

    const full = doc();
    for (let i = 1; i < CIRCLE_MAX_MEMBERS; i++) full.members.push({ userId: `m${i}`, joinedAt: NOW.toISOString() });
    full.invites.push({ userId: "Z", at: NOW.toISOString() });
    assert.deepEqual(applyCircleAction(full, { action: "accept", actorId: "Z", now: NOW, actorCircle: null }), { ok: false, error: "circle_full" });
    const busy = doc();
    for (let i = 0; i < CIRCLE_PENDING_MAX; i++) busy.applications.push({ userId: `p${i}`, at: NOW.toISOString() });
    assert.deepEqual(applyCircleAction(busy, { action: "invite", actorId: "L", targetId: "Q", now: NOW, actorCircle: "c1", targetCircle: null }), { ok: false, error: "pending_full" });
  });

  it("会长有成员时不能直接退出；只剩自己时退出 = 解散", () => {
    const d = doc();
    d.members.push({ userId: "A", joinedAt: NOW.toISOString() });
    assert.deepEqual(applyCircleAction(d, { action: "leave", actorId: "L", now: NOW, actorCircle: "c1" }), { ok: false, error: "leader_must_transfer" });
    const alone = applyCircleAction(doc(), { action: "leave", actorId: "L", now: NOW, actorCircle: "c1" });
    assert.ok(alone.ok && alone.doc === null);
  });

  it("注销：会长转给最早加入的（同时刻按编号），没有成员就解散；申请邀请一起删", () => {
    const d = doc();
    d.members.push({ userId: "B", joinedAt: "2026-11-25T00:00:00.000Z" }, { userId: "A", joinedAt: "2026-11-25T00:00:00.000Z" }, { userId: "C", joinedAt: "2026-11-20T00:00:00.000Z" });
    const o = removeAccountFromCircle(d, "L");
    assert.ok(o.ok && o.doc);
    assert.equal(o.doc!.leaderId, "C");
    const tie = removeAccountFromCircle(o.doc!, "C");
    assert.ok(tie.ok && tie.doc!.leaderId === "A");
    const solo = removeAccountFromCircle(doc(), "L");
    assert.ok(solo.ok && solo.doc === null);
    const req = doc();
    req.applications.push({ userId: "Q", at: NOW.toISOString() });
    const r = removeAccountFromCircle(req, "Q");
    assert.ok(r.ok && r.doc!.applications.length === 0 && r.doc!.members.length === 1);
  });

  it("本周数：与行会战同一个周界（东八区周一 0 点）；起点之后的增量；累计变小（转生）重记起点", () => {
    assert.equal(circleWeekKey(new Date("2026-11-29T15:59:59Z")), "2026-11-23", "东八区周日 23:59");
    assert.equal(circleWeekKey(new Date("2026-11-29T16:00:00Z")), "2026-11-30", "东八区周一 0 点");
    for (let t = Date.parse("2026-01-01T00:00:00Z"); t < Date.parse("2027-01-01T00:00:00Z"); t += 3 * 3600_000 + 17 * 60_000) {
      assert.equal(circleWeekKey(new Date(t)), guildWarWeekKey(t), new Date(t).toISOString());
    }
    const m = { userId: "A", joinedAt: NOW.toISOString(), week: circleWeekKey(NOW), base: { kills: 10, made: 5 } };
    assert.deepEqual(rollWeek(m, { kills: 17, made: 9 }, NOW).week, { kills: 7, made: 4 });
    const next = rollWeek(m, { kills: 20, made: 9 }, new Date("2026-12-01T00:00:00Z"));
    assert.ok(next.changed);
    assert.deepEqual(next.week, { kills: 0, made: 0 });
    assert.ok(rollWeek(m, { kills: 1, made: 1 }, new Date("2026-12-01T01:00:00Z")).changed);
  });

  it("申请被拒后 24 小时内不能再申请同一个会；别的会不受影响；注销把拒绝记录也删掉", () => {
    let d = doc();
    d = (applyCircleAction(d, { action: "apply", actorId: "A", now: NOW, actorCircle: null }) as any).doc;
    const rej = applyCircleAction(d, { action: "reject", actorId: "L", targetId: "A", now: NOW, actorCircle: "c1", targetCircle: null });
    assert.ok(rej.ok && rej.changed);
    d = (rej as any).doc;
    assert.deepEqual(applyCircleAction(d, { action: "apply", actorId: "A", now: new Date(NOW.getTime() + 3600_000), actorCircle: null }), { ok: false, error: "apply_cooldown" });
    const later = applyCircleAction(d, { action: "apply", actorId: "A", now: new Date(NOW.getTime() + CIRCLE_REAPPLY_COOLDOWN_MS), actorCircle: null });
    assert.ok(later.ok && later.changed);
    assert.ok(applyCircleAction(d, { action: "apply", actorId: "B", now: NOW, actorCircle: null }).ok);
    const gone = removeAccountFromCircle(d, "A");
    assert.ok(gone.ok && gone.changed && gone.doc!.rejected.length === 0);
    // 记录有上限，过期的清掉
    let many = doc();
    for (let i = 0; i < CIRCLE_PENDING_MAX + 5; i++) {
      many = (applyCircleAction(many, { action: "apply", actorId: `p${i}`, now: NOW, actorCircle: null }) as any).doc;
      many = (applyCircleAction(many, { action: "reject", actorId: "L", targetId: `p${i}`, now: NOW, actorCircle: "c1", targetCircle: null }) as any).doc;
    }
    assert.equal(many.rejected.length, CIRCLE_PENDING_MAX);
  });
});

describe("同好会：内存存储 + inject", () => {
  it("建会：花金币、名字唯一和过滤、一人一个；未加入时是空状态", async () => {
    const { storage, create, home, gold, mk } = await setup();
    try {
      const poor = await mk("c-poor", "穷光蛋", CIRCLE_CREATE_COST - 1);
      const r0 = await create(poor, "晨跑同好会");
      assert.equal(r0.statusCode, 400);
      assert.equal(r0.json().error, "not_enough_gold");
      assert.equal(await gold(poor), CIRCLE_CREATE_COST - 1);

      const a = await mk("c-a", "阿甲", 5000);
      const empty = await home(a);
      assert.equal(empty.circle, null);
      assert.equal(empty.createCost, CIRCLE_CREATE_COST);
      assert.equal((await create(a, "系统")).json().error, "name_invalid");
      const ok = await create(a, "晨跑同好会");
      assert.equal(ok.statusCode, 200);
      assert.equal(ok.json().home.circle.name, "晨跑同好会");
      assert.equal(await gold(a), 5000 - CIRCLE_CREATE_COST);
      assert.equal((await create(a, "第二个会")).json().error, "already_in_circle");
      assert.equal(await gold(a), 5000 - CIRCLE_CREATE_COST, "失败不扣钱");

      const b = await mk("c-b", "阿乙", 5000);
      assert.equal((await create(b, " 晨跑 同好会 ")).json().error, "name_taken");
    } finally {
      await storage.close();
    }
  });

  it("申请 → 会长通过；邀请 → 接受 / 拒绝；撤回申请；成员列表与在线只给团内看；搜索只给名字和人数", async () => {
    const { storage, app, create, home, act, mk } = await setup();
    try {
      const lead = await mk("c2-lead", "会长甲", 5000);
      const fan = await mk("c2-fan", "成员乙");
      const guest = await mk("c2-guest", "路人丙");
      const shy = await mk("c2-shy", "害羞丁");
      await create(lead, "钓鱼同好会");
      const circleId = (await home(lead)).circle.id;

      const search = await app.inject({ method: "GET", url: `/circle/search?q=${encodeURIComponent("钓鱼")}`,headers: guest.headers });
      assert.deepEqual(search.json().circles, [{ id: circleId, name: "钓鱼同好会", memberCount: 1, max: CIRCLE_MAX_MEMBERS }]);
      assert.equal(JSON.stringify(search.json()).includes(lead.id), false, "搜索结果不带会长编号");

      assert.equal((await act(fan, "apply", { circleId })).statusCode, 200);
      assert.equal((await act(fan, "apply", { circleId })).statusCode, 200, "重复申请算成功");
      assert.deepEqual((await home(fan)).applied.map((s: any) => s.id), [circleId]);
      assert.equal(lead.sock.messages.some((m) => m.kind === "circle:apply"), true, "会长收到提醒");
      assert.equal((await act(fan, "approve", { targetUserId: fan.id })).json().error, "not_in_circle");
      assert.equal((await act(fan, "approve", { targetUserId: fan.id, circleId })).json().error, "not_leader");
      assert.equal((await act(lead, "approve", { targetUserId: fan.id })).statusCode, 200);

      const view = await home(fan);
      assert.equal(view.circle.memberCount, 2);
      assert.deepEqual(view.circle.members.map((m: any) => [m.name, m.isLeader, m.online]), [["会长甲", true, true], ["成员乙", false, true]]);
      assert.deepEqual(view.circle.applications, [], "成员看不到申请");
      const outsider = await home(guest);
      assert.equal(outsider.circle, null, "外人看不到成员和在线");

      assert.equal((await act(lead, "invite", { targetUserId: guest.id })).statusCode, 200);
      assert.equal(guest.sock.messages.some((m) => m.kind === "circle:invite"), true);
      assert.deepEqual((await home(guest)).invites.map((s: any) => s.id), [circleId]);
      assert.equal((await act(guest, "decline", { circleId })).statusCode, 200);
      assert.deepEqual((await home(guest)).invites, []);
      assert.equal((await act(guest, "accept", { circleId })).json().error, "no_request");
      await act(lead, "invite", { targetUserId: guest.id });
      assert.equal((await act(guest, "accept", { circleId })).statusCode, 200);
      assert.equal((await home(lead)).circle.memberCount, 3);

      await act(shy, "apply", { circleId });
      assert.equal((await act(shy, "cancel_apply", { circleId })).statusCode, 200);
      assert.deepEqual((await home(lead)).circle.applications, []);
      await act(shy, "apply", { circleId });
      await act(lead, "reject", { targetUserId: shy.id });
      assert.equal((await home(shy)).applied.length, 0);

      // 屏蔽了会长：邀请送不到，会长看到的回执和平常一样
      await app.inject({ method: "POST", url: "/chat/block", headers: shy.headers, payload: { targetUserId: lead.id, blocked: true } });
      shy.sock.messages.length = 0;
      assert.equal((await act(lead, "invite", { targetUserId: shy.id })).statusCode, 200);
      assert.deepEqual((await home(shy)).invites, []);
      assert.equal(shy.sock.messages.some((m) => m.kind === "circle:invite"), false);

      assert.equal((await act(lead, "invite", { targetUserId: "00000000-0000-4000-8000-000000000001" })).json().error, "user_not_found");
      assert.equal((await act(lead, "invite", { targetUserId: "not-a-uuid" })).statusCode, 400);
    } finally {
      await storage.close();
    }
  });

  it("退出、踢人、转让、解散；会长有成员不能直接退出", async () => {
    const { storage, create, home, act, mk, join } = await setup();
    try {
      const lead = await mk("c3-lead", "会长", 5000);
      const a = await mk("c3-a", "甲");
      const b = await mk("c3-b", "乙");
      await create(lead, "登山同好会");
      await join(lead, a);
      await join(lead, b);
      assert.equal((await act(lead, "leave")).json().error, "leader_must_transfer");
      assert.equal((await act(lead, "kick", { targetUserId: b.id })).statusCode, 200);
      assert.equal(b.sock.messages.some((m) => m.kind === "circle:kicked"), true);
      assert.equal((await home(b)).circle, null);
      assert.equal((await act(lead, "transfer", { targetUserId: a.id })).statusCode, 200);
      assert.equal((await home(a)).circle.isLeader, true);
      assert.equal((await act(lead, "kick", { targetUserId: a.id })).json().error, "not_leader");
      assert.equal((await act(lead, "leave")).statusCode, 200);
      assert.equal((await home(a)).circle.memberCount, 1);
      assert.equal((await act(a, "disband")).statusCode, 200);
      assert.equal((await home(a)).circle, null);
      assert.equal((await act(a, "leave")).json().error, "not_in_circle");
    } finally {
      await storage.close();
    }
  });

  it("解散 / 只剩自己时退出：做这件事的人只看到自己的回执，不再收「已解散」提醒；其他成员各收一条", async () => {
    const { storage, create, act, mk, join } = await setup();
    try {
      const lead = await mk("c3b-lead", "会长", 5000);
      const a = await mk("c3b-a", "甲");
      await create(lead, "夜跑同好会");
      await join(lead, a);
      lead.sock.messages.length = 0;
      a.sock.messages.length = 0;
      assert.equal((await act(lead, "disband")).statusCode, 200);
      assert.equal(lead.sock.messages.filter((m) => m.kind === "circle:disbanded").length, 0);
      assert.equal(a.sock.messages.filter((m) => m.kind === "circle:disbanded").length, 1);
      const solo = await mk("c3b-solo", "独行", 5000);
      await create(solo, "独行同好会");
      solo.sock.messages.length = 0;
      assert.equal((await act(solo, "leave")).statusCode, 200);
      assert.equal(solo.sock.messages.filter((m) => m.kind === "circle:disbanded").length, 0);
    } finally {
      await storage.close();
    }
  });

  it("换周：服务器按周界把所有成员的起点重记，不等有人打开；没换周什么都不改", async () => {
    const { storage, create, home, mk } = await setup();
    try {
      const lead = await mk("c3c-lead", "会长", 5000);
      await create(lead, "周界同好会");
      const st = await storage.getOrCreatePlayerState(lead.id, "1.0.0");
      st.stats.totalKills = (st.stats.totalKills ?? 0) + 7;
      await storage.savePlayerState(lead.id, st);
      const now = new Date();
      assert.equal(await storage.rollCircleWeeks!(now), 0, "同一周不改");
      assert.equal((await home(lead)).circle.members[0].week.kills, 7);
      // 下一周的周一 0 点（东八区）之后一分钟：起点重记成那一刻的累计数
      const next = new Date(now.getTime() + 7 * 86_400_000);
      assert.equal(await storage.rollCircleWeeks!(next), 1);
      const st2 = await storage.getOrCreatePlayerState(lead.id, "1.0.0");
      st2.stats.totalKills += 3;
      await storage.savePlayerState(lead.id, st2);
      const view = await storage.getCircleHome({ userId: lead.id, now: next });
      assert.equal(view.circle!.members[0].week.kills, 3, "只算换周之后的");
    } finally {
      await storage.close();
    }
  });

  it("并发：两人同时接受最后一个名额只进一个；会长同时被转让与踢人，结果始终一个会长且在会里", async () => {
    const { storage, create, home, act, mk } = await setup();
    try {
      const lead = await mk("c4-lead", "会长", 5000);
      await create(lead, "满员测试会");
      const circleId = (await home(lead)).circle.id;
      // 直接调存储凑人，不受写接口限流
      for (let i = 1; i < CIRCLE_MAX_MEMBERS - 1; i++) {
        const m = await mk(`c4-m${i}`);
        await storage.circleAction({ userId: m.id, action: "apply", circleId, now: new Date() });
        assert.ok((await storage.circleAction({ userId: lead.id, action: "approve", targetUserId: m.id, now: new Date() })).ok);
      }
      assert.equal((await home(lead)).circle.memberCount, CIRCLE_MAX_MEMBERS - 1);
      const x = await mk("c4-x");
      const y = await mk("c4-y");
      await act(lead, "invite", { targetUserId: x.id });
      await act(lead, "invite", { targetUserId: y.id });
      const both = await Promise.all([act(x, "accept", { circleId }), act(y, "accept", { circleId })]);
      assert.deepEqual(both.map((r) => r.statusCode).sort(), [200, 400]);
      assert.equal(both.find((r) => r.statusCode === 400)!.json().error, "circle_full");
      assert.equal((await home(lead)).circle.memberCount, CIRCLE_MAX_MEMBERS);

      const deputy = (await home(lead)).circle.members[1];
      const [t, k] = await Promise.all([
        act(lead, "transfer", { targetUserId: deputy.userId }),
        act(lead, "kick", { targetUserId: deputy.userId }),
      ]);
      assert.deepEqual([t.statusCode, k.statusCode].sort(), [200, 400]);
      const after = (await home(lead)).circle ?? (await home(x)).circle;
      const leaders = after.members.filter((m: any) => m.isLeader);
      assert.equal(leaders.length, 1);
      assert.ok(after.members.some((m: any) => m.userId === leaders[0].userId));
    } finally {
      await storage.close();
    }
  });

  it("幂等：同一个 operationId 建会两次只扣一次钱、只有一个会；限流按写接口上限", async () => {
    const { storage, app, create, gold, mk } = await setup();
    try {
      const a = await mk("c5-a", "阿甲", 5000);
      const [r1, r2] = await Promise.all([create(a, "幂等同好会", "op-create-1"), create(a, "幂等同好会", "op-create-1")]);
      assert.equal(r1.statusCode, 200);
      assert.equal(r2.statusCode, 200);
      assert.equal(await gold(a), 5000 - CIRCLE_CREATE_COST);
      assert.equal((await app.inject({ method: "GET", url: `/circle/search?q=${encodeURIComponent("幂等")}`,headers: a.headers })).json().circles.length, 1);
      const codes: number[] = [];
      for (let i = 0; i < CIRCLE_WRITE_LIMIT.max + 1; i++) codes.push((await app.inject({ method: "POST", url: "/circle/action", headers: a.headers, payload: { action: "leave" } })).statusCode);
      assert.equal(codes.at(-1), 429);
    } finally {
      await storage.close();
    }
  });

  it("团内聊天：只有成员收发；屏蔽照样生效；打码；举报抄的是这个会的最近消息", async () => {
    const { storage, app, create, act, mk, join } = await setup();
    try {
      const lead = await mk("c6-lead", "会长", 5000);
      const a = await mk("c6-a", "甲");
      const out = await mk("c6-out", "外人");
      await create(lead, "聊天同好会");
      await join(lead, a);
      const say = (p: typeof a, content: string) => storage.wsMessage(p.id, JSON.stringify({ type: "chat:send", channel: "circle", content }));
      const got = (p: typeof a, content: string) => p.sock.messages.some((m) => m.type === "chat:message" && m.channel === "circle" && m.content === content);
      say(lead, "早上好");
      assert.equal(got(a, "早上好"), true);
      assert.equal(got(out, "早上好"), false);
      say(out, "我也来");
      assert.equal(got(lead, "我也来"), false);
      assert.equal(out.sock.messages.some((m) => m.type === "chat:error" && m.channel === "circle"), true);
      say(lead, "你个傻逼");
      assert.equal(a.sock.messages.some((m) => m.channel === "circle" && m.content.includes("＊")), true);

      await app.inject({ method: "POST", url: "/chat/block", headers: a.headers, payload: { targetUserId: lead.id, blocked: true } });
      say(lead, "屏蔽后");
      assert.equal(got(a, "屏蔽后"), false);
      const rep = await app.inject({ method: "POST", url: "/chat/report", headers: a.headers, payload: { targetUserId: lead.id, reason: "abuse", channel: "circle" } });
      assert.equal(rep.statusCode, 200);
      const [report] = await storage.listChatReports({ since: new Date(0), limit: 5 });
      assert.deepEqual(report.snapshot.map((l) => l.content).slice(0, 1), ["早上好"]);
      assert.equal(report.snapshot.some((l) => l.content === "我也来"), false, "外人的话没进这个会");

      await act(lead, "kick", { targetUserId: a.id });
      say(lead, "踢了之后");
      assert.equal(got(a, "踢了之后"), false, "被踢就收不到");
    } finally {
      await storage.close();
    }
  });

  it("注销：会长注销转给最早加入的成员；最后一人注销就解散；他的申请一并删除", async () => {
    const { storage, create, home, act, mk, join } = await setup();
    try {
      const lead = await mk("c7-lead", "会长", 5000);
      const first = await mk("c7-first", "先来");
      const later = await mk("c7-later", "后到");
      await create(lead, "注销测试会");
      await join(lead, first);
      await new Promise((r) => setTimeout(r, 5));
      await join(lead, later);
      const circleId = (await home(lead)).circle.id;
      await storage.deleteAccount(lead.id, new Date());
      const view = await home(later);
      assert.equal(view.circle.memberCount, 2);
      assert.equal(view.circle.members.find((m: any) => m.isLeader).name, "先来");
      assert.equal(first.sock.messages.some((m) => m.kind === "circle:leader"), true);

      const applicant = await mk("c7-app", "申请人");
      await act(applicant, "apply", { circleId });
      await storage.deleteAccount(applicant.id, new Date());
      assert.deepEqual((await home(first)).circle.applications, []);

      await storage.deleteAccount(later.id, new Date());
      await storage.deleteAccount(first.id, new Date());
      assert.deepEqual(await storage.searchCircles({ query: "注销测试会", limit: 20 }), [], "最后一人注销就解散");
    } finally {
      await storage.close();
    }
  });

  it("团榜：成员里能上真人榜的人总等级相加；没起名字的算 0；只给会名和分数；不在会里 me 不上榜", async () => {
    const { storage, app, create, mk, join } = await setup();
    try {
      const a = await mk("c9-a", "林小满", 5000);
      const a2 = await mk("c9-a2", "周可可");
      const nameless = await mk("c9-x");
      const b = await mk("c9-b", "陈大树", 5000);
      const loner = await mk("c9-l", "吴一一");
      await create(a, "两人会");
      await join(a, a2);
      await join(a, nameless);
      await create(b, "一人会");
      const board = (await app.inject({ method: "GET", url: "/circle/board", headers: a2.headers })).json();
      assert.deepEqual(board.entries.map((e: any) => e.name), ["两人会", "一人会"]);
      const one = board.entries[1].score;
      assert.ok(one > 0);
      assert.equal(board.entries[0].score, one * 2, "没起名字的成员不算分");
      assert.equal(board.me.listed, true);
      assert.equal(board.me.rank, 1);
      assert.equal(board.entries[0].me, true);
      assert.equal(JSON.stringify(board).includes(a.id), false, "不列成员编号");
      const outside = (await app.inject({ method: "GET", url: "/circle/board", headers: loner.headers })).json();
      assert.equal(outside.me.listed, false);
      assert.equal(nameless.id.length > 0, true);
    } finally {
      await storage.close();
    }
  });

  it("存档导出不含同好会的其他成员；本周数只做展示，存档不多任何东西；快照文件能读回来", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wl-circle-"));
    const file = path.join(dir, "mem.json");
    try {
      const s1 = await setup({ persistPath: file });
      const lead = await s1.mk("c8-lead", "会长名字甲", 5000);
      const mate = await s1.mk("c8-mate", "成员名字乙");
      await s1.create(lead, "导出测试会");
      await s1.join(lead, mate);
      const st = await s1.storage.getOrCreatePlayerState(mate.id, "1.0.0");
      st.stats = { ...(st.stats as any), totalKills: (st.stats?.totalKills ?? 0) + 7 };
      await s1.storage.savePlayerState(mate.id, st);
      const week = (await s1.home(lead)).circle.members.find((m: any) => m.userId === mate.id).week;
      assert.deepEqual(week, { kills: 7, made: 0 });

      const code = (await s1.app.inject({ method: "GET", url: "/progression/save/export", headers: mate.headers })).json().saveCode as string;
      const plain = decryptSave(code);
      assert.equal(plain.includes(lead.id), false, "导出里没有会长编号");
      assert.equal(plain.includes("会长名字甲"), false, "导出里没有会长名字");
      assert.equal(plain.includes("导出测试会"), false, "存档里不放同好会");
      await s1.storage.close();

      const s2 = await setup({ persistPath: file });
      const user = await s2.storage.findOrCreateGuestUser("c8-mate");
      const token = { authorization: `Bearer ${s2.app.jwt.sign({ sub: user.id })}` };
      const view = (await s2.app.inject({ method: "GET", url: "/circle", headers: token })).json().home;
      assert.equal(view.circle.name, "导出测试会");
      assert.equal(view.circle.memberCount, 2);
      await s2.storage.close();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("同好会：PostgreSQL 与不加成（静态核对；真库测试在 integration/circle_pg.test.ts，要 TEST_DATABASE_URL）", () => {
  it("迁移 008、schema.sql、启动建表三处一致：名字唯一、一人一个会、级联删除", () => {
    const parts = [
      "CREATE TABLE IF NOT EXISTS circles",
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_circles_name_key ON circles(name_key)",
      "CREATE INDEX IF NOT EXISTS idx_circles_doc ON circles USING GIN (doc jsonb_path_ops)",
      "CREATE TABLE IF NOT EXISTS circle_members",
      "user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE",
      "circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE",
      "CREATE INDEX IF NOT EXISTS idx_circle_members_circle ON circle_members(circle_id)",
    ];
    for (const file of ["database/migrations/008_circles.sql", "database/schema.sql", "src/storage_pg.ts"]) {
      const src = read(file);
      for (const p of parts) assert.ok(src.includes(p), `${file} 缺 ${p}`);
    }
  });

  it("每个写操作先锁住同好会；成员索引撞车整笔回滚；注销在同一个事务里处理", () => {
    const src = read("src/circle_pg.ts");
    assert.match(src, /SELECT doc FROM circles WHERE id = \$1 FOR UPDATE/);
    assert.match(src, /ON CONFLICT \(user_id\) DO NOTHING[\s\S]*throw new CircleAbort\("already_in_circle"\)/);
    assert.match(src, /ON CONFLICT \(name_key\) DO NOTHING/);
    assert.match(src, /txLoadStateForUpdate\(client, userId\)/);
    // 加锁顺序：users（KEY SHARE）在 circles / 存档之前，和注销一样，不会互等成死锁
    const action = src.slice(src.indexOf("async circleAction("));
    assert.ok(action.indexOf("lockUsers(client") > 0 && action.indexOf("lockUsers(client") < action.indexOf("FOR UPDATE"));
    const create = src.slice(src.indexOf("async createCircle("), src.indexOf("async circleAction("));
    assert.ok(create.indexOf("lockUsers(client") > 0 && create.indexOf("lockUsers(client") < create.indexOf("txLoadStateForUpdate"));
    assert.match(src, /ORDER BY id FOR KEY SHARE/);
    // jsonb 包含查询要对整份 doc 做才走 GIN（jsonb_path_ops）索引；团榜「我的会」不用 HAVING 子查询
    assert.equal(/doc->'(invites|applications)' @>/.test(src), false);
    assert.match(src, /WHERE doc @> \$1::jsonb/);
    assert.equal(/HAVING c\.id/.test(src), false);
    const pg = read("src/storage_pg.ts");
    assert.match(pg, /const circleDone = await circles\.txRemoveAccount\(client, userId\);/);
    assert.ok(pg.indexOf("SELECT id FROM users WHERE id = $1 FOR UPDATE") < pg.indexOf("circles.txRemoveAccount(client, userId)"), "注销先锁 users");
    assert.match(pg, /circleId: channel === "circle" \? await circles\.circleIdOf\(userId\) : null/);
  });

  it("不给数值加成：结算、战斗、加成计算都不引用同好会；storage.ts 只引类型", () => {
    for (const file of ["src/hp_combat.ts", "src/storage_domain.ts", "src/combat_skills.ts", "src/progression2.ts", "src/profession_perks.ts"]) {
      assert.equal(/circle/i.test(read(file)), false, `${file} 引用了同好会`);
    }
    const storageSrc = read("src/storage.ts");
    assert.deepEqual([...storageSrc.matchAll(/import[^;]*from "\.\/circle[^"]*";/g)].map((m) => m[0].startsWith("import type")), [true]);
    const rules = read("src/circle.ts").replace(/\/\*[\s\S]*?\*\//g, "");
    assert.equal(/bonus|multiplier/i.test(rules), false, "规则里没有加成字段");
  });
});

describe("同好会复核：邀请不露对方在不在会里、加入后清掉别处的申请邀请、会名口径同屏蔽词", () => {
  const doc = (id = "c1", leaderId = "L"): CircleDoc => newCircleDoc({ id, name: "晨跑同好会", leaderId, now: NOW, counters: { kills: 0, made: 0 } });

  it("规则：邀请已在别的会里的人 = 成功不改动（同屏蔽）；withdrawPending 只删申请和邀请，留拒绝记录", () => {
    const o = applyCircleAction(doc(), { action: "invite", actorId: "L", targetId: "X", now: NOW, actorCircle: "c1", targetCircle: "c9" });
    assert.ok(o.ok && !o.changed && o.doc!.invites.length === 0);
    const d = doc();
    d.applications.push({ userId: "U", at: NOW.toISOString() }, { userId: "V", at: NOW.toISOString() });
    d.invites.push({ userId: "U", at: NOW.toISOString() });
    d.rejected.push({ userId: "U", at: NOW.toISOString() });
    const next = withdrawPending(d, "U")!;
    assert.deepEqual([next.applications.map((r) => r.userId), next.invites, next.rejected.map((r) => r.userId)], [["V"], [], ["U"]]);
    assert.equal(d.applications.length, 2, "不改传入的 doc");
    assert.equal(withdrawPending(next, "U"), null, "没有要删的返回 null");
  });

  it("会名：与屏蔽词同一个规范化，标点空格不同算同名；旧数据的 name_key 读回来原样保留", () => {
    assert.equal(circleNameKey("猫·会"), circleNameKey("猫会"));
    assert.equal(circleNameKey(" Moon-Club! "), circleNameKey("ｍｏｏｎ club"));
    for (const s of ["猫·会", "Ｍｏｏｎ Club", "第455关"]) assert.equal(circleNameKey(s), foldForCompare(s));
    assert.equal(newCircleDoc({ id: "n", name: "猫·会", leaderId: "L", now: NOW }).nameKey, "猫会");
    const old = normalizeCircleDoc({ ...doc(), name: "猫·会", nameKey: "猫·会" })!;
    assert.equal(old.nameKey, "猫·会", "旧行不重算");
    // 启动建表与迁移里没有重算 name_key 的语句
    for (const file of ["src/storage_pg.ts", "database/schema.sql", "database/migrations/008_circles.sql"]) {
      assert.equal(/UPDATE\s+circles\s+SET\s+name_key/i.test(read(file)), false, file);
    }
  });

  it("内存：邀请别的会的人回执同成功、不存不提醒；搜索与团榜不带成员；「猫·会」与「猫会」重名", async () => {
    const { storage, app, create, home, act, mk, join } = await setup();
    try {
      const a = await mk("r1-a", "会长甲", 5000);
      const b = await mk("r1-b", "会长乙", 5000);
      const x = await mk("r1-x", "成员丙");
      const free = await mk("r1-f", "路人丁");
      assert.equal((await create(a, "猫·会")).statusCode, 200);
      assert.equal((await create(b, "猫会")).json().error, "name_taken");
      assert.equal((await create(b, "狗 会")).statusCode, 200);
      await join(b, x);
      x.sock.messages.length = 0;
      const toMember = await act(a, "invite", { targetUserId: x.id });
      const toFree = await act(a, "invite", { targetUserId: free.id });
      assert.equal(toMember.statusCode, 200);
      assert.deepEqual(Object.keys(toMember.json()), Object.keys(toFree.json()));
      assert.equal(JSON.stringify(toMember.json()).includes("already_in_circle"), false);
      assert.equal(x.sock.messages.some((m) => m.kind === "circle:invite"), false, "不提醒对方");
      assert.deepEqual((await home(x)).invites, []);
      const search = (await app.inject({ method: "GET", url: "/circle/search?q=", headers: free.headers })).json();
      const board = (await app.inject({ method: "GET", url: "/circle/board", headers: free.headers })).json();
      for (const p of [a, b, x]) {
        assert.equal(JSON.stringify(search).includes(p.id), false, "搜索不带成员编号");
        assert.equal(JSON.stringify(board).includes(p.id), false, "团榜不带成员编号");
      }
      assert.equal(JSON.stringify(search).includes("成员丙"), false);
      assert.equal((await app.inject({ method: "GET", url: `/circle/search?q=${encodeURIComponent("猫·")}`, headers: free.headers })).json().circles.length, 1);
    } finally {
      await storage.close();
    }
  });

  it("内存：被通过 / 接受邀请 / 自己建会后，别的会里他的申请和邀请一并清掉；拒绝冷却照旧", async () => {
    const { storage, create, home, act, mk } = await setup();
    try {
      const a = await mk("r2-a", "会长甲", 5000);
      const b = await mk("r2-b", "会长乙", 5000);
      const c = await mk("r2-c", "会长丙", 5000);
      const u = await mk("r2-u", "申请人", 5000);
      const v = await mk("r2-v", "受邀人");
      await create(a, "甲会");
      await create(b, "乙会");
      await create(c, "丙会");
      const [ida, idb, idc] = [(await home(a)).circle.id, (await home(b)).circle.id, (await home(c)).circle.id];
      // u：甲会拒过一次；申请乙会、丙会，收到甲会邀请；乙会通过
      await act(u, "apply", { circleId: ida });
      await act(a, "reject", { targetUserId: u.id });
      await act(u, "apply", { circleId: idb });
      await act(u, "apply", { circleId: idc });
      await act(a, "invite", { targetUserId: u.id });
      assert.equal((await act(b, "approve", { targetUserId: u.id })).statusCode, 200);
      const hu = await home(u);
      assert.deepEqual([hu.circle.id, hu.applied, hu.invites], [idb, [], []]);
      assert.deepEqual((await home(c)).circle.applications, []);
      assert.deepEqual((await home(a)).circle.invited, []);
      assert.equal((await act(c, "approve", { targetUserId: u.id })).json().error, "no_request");
      await act(u, "leave");
      assert.equal((await act(u, "apply", { circleId: ida })).json().error, "apply_cooldown", "拒绝记录留着");
      // v：申请甲会，收到乙、丙会邀请；接受丙会
      await act(v, "apply", { circleId: ida });
      await act(b, "invite", { targetUserId: v.id });
      await act(c, "invite", { targetUserId: v.id });
      assert.equal((await act(v, "accept", { circleId: idc })).statusCode, 200);
      assert.deepEqual([(await home(v)).applied, (await home(v)).invites], [[], []]);
      assert.deepEqual((await home(a)).circle.applications, []);
      assert.deepEqual((await home(b)).circle.invited, []);
      // u 退出后申请丙会、收到乙会邀请，再自己建会：两条都清掉
      await act(u, "apply", { circleId: idc });
      await act(b, "invite", { targetUserId: u.id });
      assert.equal((await create(u, "自建会")).statusCode, 200);
      assert.deepEqual((await home(c)).circle.applications, []);
      assert.deepEqual((await home(b)).circle.invited, []);
    } finally {
      await storage.close();
    }
  });

  it("PG（静态）：加入在同一事务里清掉别处的申请邀请；通过 / 接受先按编号锁上相关的会", () => {
    const src = read("src/circle_pg.ts");
    const create = src.slice(src.indexOf("async createCircle("), src.indexOf("async circleAction("));
    assert.ok(create.indexOf("txWithdrawElsewhere(client, [userId], doc.id)") > create.indexOf("INSERT INTO circle_members"));
    assert.ok(create.indexOf("txWithdrawElsewhere(client") < create.indexOf("txPersistState"), "建会：同一个事务");
    const action = src.slice(src.indexOf("async circleAction("));
    const preLock = action.indexOf("SELECT id FROM circles WHERE id = ANY($1::uuid[]) ORDER BY id FOR UPDATE");
    assert.ok(preLock > action.indexOf("lockUsers(client") && preLock < action.indexOf("SELECT doc FROM circles WHERE id = $1 FOR UPDATE"));
    assert.match(action, /await txWrite\(client, before, outcome\);\s*if \(outcome\.ok && outcome\.joined\.length\) await txWithdrawElsewhere\(client, outcome\.joined, before\.id\);/);
    assert.match(src, /SELECT doc FROM circles WHERE id <> \$1 AND \(doc @> \$2::jsonb OR doc @> \$3::jsonb\) ORDER BY id FOR UPDATE/);
    assert.match(src, /withdrawPending\(doc, uid\)/);
  });
});

function decryptSave(code: string): string {
  const key = createHash("sha256").update(process.env.SAVE_SECRET || "worklife-isekai-encrypted-save-v1-key-2026").digest();
  const combined = Buffer.from(code.slice("WLS1.".length), "base64url");
  const decipher = createDecipheriv("aes-256-gcm", key, combined.subarray(0, 12));
  decipher.setAuthTag(combined.subarray(combined.length - 16));
  return Buffer.concat([decipher.update(combined.subarray(12, combined.length - 16)), decipher.final()]).toString("utf8");
}
