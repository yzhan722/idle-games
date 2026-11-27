import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Fastify from "fastify";
import packJson from "../../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack } from "./types";
import { ABILITY_BY_ID } from "./abilities";
import { defaultCombatSkills } from "./combat_skills";
import { PARTY_RULES, buildSquad, expectedWaveMs, minWaveMs, partyWave } from "./party_combat";
import { PARTY_JUDGE, cappedCasts, judgeWaveClear, partyDungeonFor, partyRequiredLevel, partySelf, partySkills } from "./party_run";
import { enrichPartyForClient, isPartyBotUserId } from "./party_bots";
import { partyRoutes } from "./routes/party";
import { createMemoryStorage } from "./storage_memory";

const pack = packJson as unknown as EnhancedContentPack;
const HOUR = 3_600_000;

/** 组队副本的服务端裁判（WL-G2 / WL-G4）：走真实路由，时钟由测试拨。 */
async function harness() {
  const storage = createMemoryStorage();
  const app = Fastify({ logger: false });
  app.addHook("onRequest", async (req) => { (req as any).userId = req.headers["x-user"]; });
  let now = Date.now();
  await partyRoutes(app, storage, pack, { clock: () => new Date(now) });
  const post = async (userId: string, url: string, payload: Record<string, unknown>) => {
    const res = await app.inject({ method: "POST", url, headers: { "x-user": userId }, payload });
    return { status: res.statusCode, body: res.json() as any };
  };
  return {
    storage,
    post,
    tick: (ms: number) => { now += ms; },
    now: () => now,
    async player(name: string, level = 10) {
      const user = await storage.findOrCreateGuestUser(name);
      const st = (await storage.getOrCreatePlayerState(user.id, pack.version)) as any;
      st.combatSkills = defaultCombatSkills(level);
      st.combatLevel = level;
      return user.id;
    },
    state: async (userId: string) => (await storage.getOrCreatePlayerState(userId, pack.version)) as any,
    start: async (userId: string, partyId: string, stageId = "forest") => {
      // 活动开始时刻由存储层取真实时间，时钟对齐到它之后
      const res = await post(userId, "/party/start-activity", { partyId, activityType: "raid", stageId, durationMinutes: 30 });
      now = Math.max(now, Date.now());
      return res;
    },
    clear: (userId: string, partyId: string, wave: number, extra: Record<string, unknown> = {}) => post(userId, "/party/wave-clear", { partyId, stageId: "forest", wave, ...extra }),
    async close() {
      await app.close();
      await storage.close();
    },
  };
}

type H = Awaited<ReturnType<typeof harness>>;
async function solo(h: H, name: string, level = 10, stageId = "forest") {
  const id = await h.player(name, level);
  const party = await h.storage.createParty({ userId: id });
  const started = await h.start(id, party.id, stageId);
  assert.equal(started.status, 200, JSON.stringify(started.body));
  return { id, partyId: party.id };
}
/** 打到 waves 波：每波等足时间。 */
async function clearWaves(h: H, who: { id: string; partyId: string }, from: number, to: number) {
  for (let w = from; w <= to; w++) {
    h.tick(10 * 60_000);
    const res = await h.clear(who.id, who.partyId, w);
    assert.equal(res.status, 200, `第 ${w} 波：${JSON.stringify(res.body)}`);
  }
}

describe("组队清波：时间下界", () => {
  it("开战后立刻报清波：拒绝、不发奖、记一笔，并告诉客户端还要等多久；等够了同一波能结算", async () => {
    const h = await harness();
    try {
      const me = await solo(h, "pr-early");
      const gold = (await h.state(me.id)).inventory.gold || 0;
      const early = await h.clear(me.id, me.partyId, 1);
      assert.equal(early.status, 409);
      assert.equal(early.body.error, "party_wave_early");
      assert.ok(early.body.retryAfterMs > 1000, String(early.body.retryAfterMs));
      const st = await h.state(me.id);
      assert.equal(st.inventory.gold || 0, gold);
      assert.equal(st.partyRun.nextWave, 1);
      assert.equal(st.partyRun.rejects.early, 1);
      h.tick(early.body.retryAfterMs);
      const ok = await h.clear(me.id, me.partyId, 1);
      assert.equal(ok.status, 200, JSON.stringify(ok.body));
      assert.ok(ok.body.goldGained > 0 && ok.body.xpGained > 0);
      assert.equal((await h.state(me.id)).inventory.gold, gold + ok.body.goldGained);
    } finally {
      await h.close();
    }
  });

  it("下界就是同源公式算出来的最短时间：差 1 毫秒拒绝，到点通过；第 2 波起还要加上换波间隔", async () => {
    const h = await harness();
    try {
      const me = await solo(h, "pr-bound");
      const st = await h.state(me.id);
      const bound = (wave: number) => {
        const squad = buildSquad(partySelf(st, pack, new Date(h.now())), []);
        return minWaveMs(partyWave(partyDungeonFor(pack, "forest")!, wave, 1), squad, partySkills(st));
      };
      const started = Date.parse((await h.storage.getPartyForUser({ userId: me.id }))!.currentActivity!.startedAt);
      h.tick(started + bound(1) - 1 - h.now());
      assert.equal((await h.clear(me.id, me.partyId, 1)).body.retryAfterMs, 1);
      h.tick(1);
      assert.equal((await h.clear(me.id, me.partyId, 1)).status, 200);
      const after = await h.state(me.id);
      const squad = buildSquad(partySelf(after, pack, new Date(h.now())), []);
      const second = minWaveMs(partyWave(partyDungeonFor(pack, "forest")!, 2, 1), squad, partySkills(after)) + PARTY_RULES.waveGapMs;
      h.tick(second - 1);
      assert.equal((await h.clear(me.id, me.partyId, 2)).body.error, "party_wave_early");
      h.tick(1);
      assert.equal((await h.clear(me.id, me.partyId, 2)).status, 200);
    } finally {
      await h.close();
    }
  });

  it("长期速度由时间额度管住：一直卡着最短时间报，攒够波数后平均不会快过期望的 paceFloor", async () => {
    const h = await harness();
    try {
      const me = await solo(h, "pr-pace", 10);
      const t0 = h.now();
      let expected = 0;
      for (let wave = 1; wave <= 30; wave++) {
        const st = await h.state(me.id);
        // 同一等级算，免得中途升级影响期望
        st.combatSkills = defaultCombatSkills(10);
        st.combatLevel = 10;
        expected += expectedWaveMs(partyWave(partyDungeonFor(pack, "forest")!, wave, 1), buildSquad(partySelf(st, pack, new Date(h.now())), []), partySkills(st));
        for (;;) {
          const res = await h.clear(me.id, me.partyId, wave);
          if (res.status === 200) break;
          assert.equal(res.body.error, "party_wave_early", JSON.stringify(res.body));
          h.tick(res.body.retryAfterMs);
        }
      }
      const spent = h.now() - t0;
      assert.ok(spent >= expected * PARTY_JUDGE.paceFloor - PARTY_JUDGE.budgetCapMs - 1000, `${spent} < ${expected} × ${PARTY_JUDGE.paceFloor}`);
      assert.ok((await h.state(me.id)).partyRun.rejects.early >= 20);
    } finally {
      await h.close();
    }
  });

  it("挂着不打攒不出连续领：等一小时也只能立刻领一波，下一波照样要等", async () => {
    const h = await harness();
    try {
      const me = await solo(h, "pr-idle");
      h.tick(HOUR);
      assert.equal((await h.clear(me.id, me.partyId, 1)).status, 200);
      const next = await h.clear(me.id, me.partyId, 2);
      assert.equal(next.body.error, "party_wave_early");
      assert.ok(next.body.retryAfterMs > PARTY_RULES.waveGapMs);
    } finally {
      await h.close();
    }
  });
});

describe("组队清波：波次顺序与重复", () => {
  it("跳波、倒着报都拒绝，并告诉客户端该打第几波", async () => {
    const h = await harness();
    try {
      const me = await solo(h, "pr-order");
      h.tick(HOUR);
      for (const wave of [2, 10, 9999]) {
        const res = await h.clear(me.id, me.partyId, wave);
        assert.equal(res.status, 409);
        assert.deepEqual([res.body.error, res.body.expectedWave], ["party_wave_order", 1]);
      }
      await clearWaves(h, me, 1, 3);
      const back = await h.clear(me.id, me.partyId, 1);
      assert.deepEqual([back.body.error, back.body.expectedWave], ["party_wave_order", 4]);
      const st = await h.state(me.id);
      assert.equal(st.partyRun.rejects.order, 4);
      assert.equal(st.stats.totalBossKills || 0, 0, "没打到第 10 波就没有首领击杀");
    } finally {
      await h.close();
    }
  });

  it("同一波重复上报（断网重发、两个标签页）：返回上次的结果，不再发奖", async () => {
    const h = await harness();
    try {
      const me = await solo(h, "pr-dup");
      h.tick(10 * 60_000);
      const first = await h.clear(me.id, me.partyId, 1);
      const before = structuredClone((await h.state(me.id)).inventory);
      const kills = (await h.state(me.id)).stats.totalKills;
      const again = await h.clear(me.id, me.partyId, 1);
      assert.equal(again.status, 200);
      assert.equal(again.body.duplicate, true);
      assert.deepEqual(
        [again.body.xpGained, again.body.goldGained, again.body.drops, again.body.nextWave],
        [first.body.xpGained, first.body.goldGained, first.body.drops, 2],
      );
      const st = await h.state(me.id);
      assert.deepEqual(st.inventory, before);
      assert.equal(st.stats.totalKills, kills);
    } finally {
      await h.close();
    }
  });

  it("团灭重整：回到第 1 波重新计时；没清过波时重整不改进度", async () => {
    const h = await harness();
    try {
      const me = await solo(h, "pr-wipe");
      assert.equal((await h.post(me.id, "/party/wave-reset", { partyId: me.partyId })).body.nextWave, 1);
      assert.equal((await h.state(me.id)).partyRun.attempt, 1);
      await clearWaves(h, me, 1, 4);
      const reset = await h.post(me.id, "/party/wave-reset", { partyId: me.partyId });
      assert.deepEqual([reset.status, reset.body.nextWave], [200, 1]);
      assert.equal((await h.clear(me.id, me.partyId, 5)).body.expectedWave, 1);
      const now = await h.clear(me.id, me.partyId, 1);
      assert.equal(now.body.error, "party_wave_early", "重整后的第 1 波不能当成上一轮的重复上报");
      h.tick(10 * 60_000);
      const ok = await h.clear(me.id, me.partyId, 1);
      assert.equal(ok.status, 200);
      assert.equal(ok.body.duplicate, undefined);
    } finally {
      await h.close();
    }
  });

  it("重开一场：进度从第 1 波重来；不在队伍里、没有活动、共同制作活动都不能清波", async () => {
    const h = await harness();
    try {
      const me = await solo(h, "pr-restart");
      await clearWaves(h, me, 1, 2);
      // 活动开始时刻精确到毫秒，保证两场的编号不同
      await new Promise((r) => setTimeout(r, 5));
      assert.equal((await h.start(me.id, me.partyId)).status, 200);
      assert.equal((await h.clear(me.id, me.partyId, 3)).body.expectedWave, 1);
      const other = await h.player("pr-outsider");
      assert.equal((await h.clear(other, me.partyId, 1)).status, 400);
      assert.equal((await h.post(other, "/party/wave-reset", { partyId: me.partyId })).status, 400);
      await h.storage.cancelPartyActivity({ userId: me.id, partyId: me.partyId });
      assert.equal((await h.clear(me.id, me.partyId, 1)).status, 400);
      await h.storage.startPartyActivity({ userId: me.id, partyId: me.partyId, activityType: "group_craft", durationMinutes: 30, contentPack: pack });
      h.tick(HOUR);
      assert.equal((await h.clear(me.id, me.partyId, 1)).status, 400);
    } finally {
      await h.close();
    }
  });
});

describe("组队清波：技能次数", () => {
  it("虚报的次数按冷却与经过时间封顶，没带出战的技能不给经验", async () => {
    const h = await harness();
    try {
      const me = await solo(h, "pr-casts", 30);
      const st = await h.state(me.id);
      st.abilities = { heavy_chop: { level: 1, xp: 0 }, smash: { level: 1, xp: 0 }, omega_annihilation: { level: 1, xp: 0 } };
      st.abilityLoadout = [{ abilityId: "heavy_chop", trigger: { type: "always" } }, { abilityId: "smash", trigger: { type: "always" } }];
      h.tick(9_000);
      const res = await h.clear(me.id, me.partyId, 1, { abilityCasts: { heavy_chop: 50, smash: 50, omega_annihilation: 50 } });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      const after = await h.state(me.id);
      // 9 秒多一点：重劈 8 秒冷却最多 2 次，猛击 5 秒冷却最多 2 次
      assert.equal(after.abilities.omega_annihilation.xp, 0);
      const per = (id: string) => res.body.abilityXpGained[id];
      assert.ok(per("heavy_chop") > 0 && per("heavy_chop") <= 2 * 10, String(per("heavy_chop")));
      assert.deepEqual(cappedCasts(st, { heavy_chop: 50, smash: 50, omega_annihilation: 50 }, { elapsedMs: 9_000, expectedMs: 5_000, bossWave: false }), { heavy_chop: 2, smash: 2 });
      // 挂机一小时也只按这一波的合理时长算
      assert.deepEqual(cappedCasts(st, { heavy_chop: 50 }, { elapsedMs: HOUR, expectedMs: 5_000, bossWave: false }), { heavy_chop: 4 });
      assert.deepEqual(cappedCasts(st, { heavy_chop: 50 }, { elapsedMs: HOUR, expectedMs: HOUR, bossWave: false }), { heavy_chop: PARTY_JUDGE.maxCastsPerWave });
      // 没上报：每个出战技能 1 次，首领波 2 次，同样封顶
      assert.deepEqual(cappedCasts(st, undefined, { elapsedMs: 100, expectedMs: 5_000, bossWave: true }), { heavy_chop: 1, smash: 1 });
      assert.deepEqual(cappedCasts(st, { heavy_chop: 0 }, { elapsedMs: HOUR, expectedMs: 5_000, bossWave: false }), {});
      assert.ok(ABILITY_BY_ID.omega_annihilation);
    } finally {
      await h.close();
    }
  });
});

describe("组队副本：等级门槛", () => {
  it("门槛与单人战斗同一张表，逐区变高；等级不够不能开，也不能领别人开的", async () => {
    const levels = (pack.stages as Array<{ id: string }>).map((s) => partyRequiredLevel(pack, s.id));
    assert.deepEqual(levels, [...levels].sort((a, b) => a - b));
    assert.equal(levels[0], 1);
    assert.ok(levels.at(-1)! > 100);

    const h = await harness();
    try {
      const low = await h.player("pr-low", 10);
      const party = await h.storage.createParty({ userId: low });
      const blocked = await h.start(low, party.id, "omega");
      assert.equal(blocked.status, 403);
      assert.deepEqual([blocked.body.error, blocked.body.requiredLevel], ["party_level_required", partyRequiredLevel(pack, "omega")]);
      assert.equal((await h.storage.getPartyForUser({ userId: low }))!.currentActivity, undefined);
      // 绕过开战接口（老数据、直接写库）开起来的副本，领奖时同样拦住
      await h.storage.startPartyActivity({ userId: low, partyId: party.id, activityType: "raid", stageId: "omega", durationMinutes: 30, contentPack: pack });
      h.tick(HOUR);
      const gold = (await h.state(low)).inventory.gold || 0;
      const claim = await h.clear(low, party.id, 1);
      assert.equal(claim.status, 403);
      assert.equal((await h.state(low)).inventory.gold || 0, gold);
      assert.equal((await h.state(low)).partyRun.rejects.level, 1);

      // 队友等级不够，队长也开不了；陪练不看等级
      const high = await h.player("pr-high", 60);
      const mixed = await h.storage.createParty({ userId: high });
      await h.post(high, "/party/recruit-bot", { partyId: mixed.id });
      assert.equal((await h.start(high, mixed.id, "volcano")).status, 200);
      await h.storage.cancelPartyActivity({ userId: high, partyId: mixed.id });
      const friend = await h.player("pr-friend", 12);
      await h.storage.joinParty({ userId: friend, partyId: mixed.id });
      assert.equal((await h.start(high, mixed.id, "volcano")).status, 403);
      assert.equal((await h.start(high, mixed.id, "mine")).status, 200);
    } finally {
      await h.close();
    }
  });
});

describe("组队清波：队伍变化与掉线", () => {
  async function trio(h: H, prefix: string) {
    const [a, b, c] = [await h.player(`${prefix}-a`, 12), await h.player(`${prefix}-b`, 12), await h.player(`${prefix}-c`, 12)];
    const party = await h.storage.createParty({ userId: a });
    for (const id of [b, c]) await h.storage.joinParty({ userId: id, partyId: party.id });
    assert.equal((await h.start(a, party.id)).status, 200);
    return { a, b, c, partyId: party.id };
  }

  it("成员中途退出：留下的人接着打自己的进度；退出的人领不到，同一场里重新进队进度还在", async () => {
    const h = await harness();
    try {
      const t = await trio(h, "pr-leave");
      await clearWaves(h, { id: t.a, partyId: t.partyId }, 1, 2);
      await clearWaves(h, { id: t.c, partyId: t.partyId }, 1, 2);
      assert.equal((await h.state(t.a)).partyRun.size, 3);
      await h.storage.leaveParty({ userId: t.c, partyId: t.partyId });
      h.tick(10 * 60_000);
      assert.equal((await h.clear(t.c, t.partyId, 3)).status, 400);
      const stay = await h.clear(t.a, t.partyId, 3);
      assert.equal(stay.status, 200);
      // 这一波是三个人时开打的，按三个人的敌人算；下一波才按两个人
      const sizes = (n: number) => partyWave(partyDungeonFor(pack, "forest")!, 3, n).length;
      const kills = (await h.state(t.a)).stats.totalKills;
      assert.equal(kills, [1, 2, 3].reduce((sum, w) => sum + partyWave(partyDungeonFor(pack, "forest")!, w, 3).length, 0));
      assert.ok(sizes(3) > sizes(2));
      assert.equal((await h.state(t.a)).partyRun.size, 2);
      await h.storage.joinParty({ userId: t.c, partyId: t.partyId });
      const rejoined = await h.clear(t.c, t.partyId, 3);
      assert.equal(rejoined.body.expectedWave ?? rejoined.body.wave, 3);
    } finally {
      await h.close();
    }
  });

  it("中途进队的人从进队时刻开始计时；临领奖前拉人进队不会多拿奖励", async () => {
    const h = await harness();
    try {
      const me = await solo(h, "pr-late", 12);
      h.tick(10 * 60_000);
      const late = await h.player("pr-latecomer", 12);
      await h.storage.joinParty({ userId: late, partyId: me.partyId });
      const member = (await h.storage.getPartyForUser({ userId: late }))!.members.find((m) => m.userId === late)!;
      h.tick(Date.parse(member.joinedAt) - h.now());
      assert.equal((await h.clear(late, me.partyId, 1)).body.error, "party_wave_early", "活动开了很久，但他刚进队");
      for (let i = 0; i < 4; i++) await h.post(me.id, "/party/recruit-bot", { partyId: me.partyId });
      h.tick(10 * 60_000);
      const res = await h.clear(me.id, me.partyId, 1);
      assert.equal(res.status, 200);
      assert.equal((await h.state(me.id)).stats.totalKills, partyWave(partyDungeonFor(pack, "forest")!, 1, 1).length);
    } finally {
      await h.close();
    }
  });

  it("队长更换：每个人的进度都不受影响", async () => {
    const h = await harness();
    try {
      const t = await trio(h, "pr-lead");
      await clearWaves(h, { id: t.a, partyId: t.partyId }, 1, 2);
      await clearWaves(h, { id: t.b, partyId: t.partyId }, 1, 1);
      const moved = await h.post(t.a, "/party/transfer-leadership", { partyId: t.partyId, memberId: t.b });
      assert.equal(moved.body.success, true);
      await clearWaves(h, { id: t.a, partyId: t.partyId }, 3, 3);
      await clearWaves(h, { id: t.b, partyId: t.partyId }, 2, 2);
      assert.equal((await h.clear(t.b, t.partyId, 4)).body.expectedWave, 3);
    } finally {
      await h.close();
    }
  });

  it("全员掉线：没人能替他们领；重连后从没打完的那一波打起，离线时间只够这一波，额度和技能次数不变多", async () => {
    const h = await harness();
    try {
      const t = await trio(h, "pr-off");
      const socks = [t.a, t.b, t.c].map((id) => {
        const socket = { send() {}, close() {} };
        h.storage.wsConnect(id, { socket });
        return { id, socket };
      });
      await clearWaves(h, { id: t.a, partyId: t.partyId }, 1, 3);
      for (const s of socks) h.storage.wsDisconnect(s.id, { socket: s.socket });
      assert.ok((await h.storage.getPartyForUser({ userId: t.a }))!.members.every((m) => !m.isOnline));
      h.tick(8 * HOUR);
      const st = await h.state(t.a);
      assert.equal(st.partyRun.nextWave, 4, "离线期间没有进度");
      const back = await h.clear(t.a, t.partyId, 4, { abilityCasts: { heavy_chop: 50 } });
      assert.equal(back.status, 200);
      const after = await h.state(t.a);
      assert.ok(after.partyRun.budgetMs <= PARTY_JUDGE.budgetCapMs);
      const perCast = back.body.abilityXpGained.heavy_chop;
      const limit = cappedCasts(after, { heavy_chop: 50 }, { elapsedMs: 8 * HOUR, expectedMs: 60_000, bossWave: false }).heavy_chop;
      assert.ok(perCast / 5 <= limit, `${perCast}`);
      assert.equal((await h.clear(t.a, t.partyId, 5)).body.error, "party_wave_early");
    } finally {
      await h.close();
    }
  });

  it("旧存档没有 partyRun、活动是升级前开的：第一次清波从第 1 波开始，不报错", async () => {
    const h = await harness();
    try {
      const me = await solo(h, "pr-legacy");
      const st = await h.state(me.id);
      delete st.partyRun;
      h.tick(10 * 60_000);
      assert.equal((await h.clear(me.id, me.partyId, 7)).body.expectedWave, 1);
      assert.equal((await h.clear(me.id, me.partyId, 1)).status, 200);
    } finally {
      await h.close();
    }
  });
});

describe("组队清波：按真正上场的敌人结算", () => {
  it("首领波：首领 2.2 倍、亲卫按小怪算；只有首领计首领击杀", async () => {
    const h = await harness();
    try {
      const id = await h.player("pr-boss", 40);
      const party = await h.storage.createParty({ userId: id });
      for (let i = 0; i < 4; i++) await h.post(id, "/party/recruit-bot", { partyId: party.id });
      assert.equal((await h.start(id, party.id)).status, 200);
      await clearWaves(h, { id, partyId: party.id }, 1, 9);
      const before = structuredClone((await h.state(id)).stats);
      h.tick(10 * 60_000);
      const res = await h.clear(id, party.id, 10);
      assert.equal(res.status, 200);
      assert.equal(res.body.isBossWave, true);
      const after = (await h.state(id)).stats;
      const enemies = partyWave(partyDungeonFor(pack, "forest")!, 10, 5);
      assert.deepEqual(enemies.map((e) => e.role), ["boss", "guard", "guard"]);
      assert.equal(after.totalBossKills - (before.totalBossKills || 0), 1);
      assert.equal(after.totalKills - before.totalKills, 3);
      for (const e of enemies) assert.equal(after.killsByMonster[e.monster.id] - (before.killsByMonster[e.monster.id] || 0), 1, e.monster.id);
      const bonus = 1 + 4 * 0.08;
      const gold = enemies.reduce((sum, e) => sum + Math.max(1, Math.round(e.monster.gold * (e.role === "boss" ? 2.2 : 0.75) * bonus)), 0);
      assert.equal(res.body.goldGained, gold);
    } finally {
      await h.close();
    }
  });
});

describe("组队清波：额度、时钟、重启（第五轮复核）", () => {
  it("重开一场、换一支队伍都不会重新给满时间额度", async () => {
    const h = await harness();
    try {
      const me = await solo(h, "pr5-budget");
      // 卡着最短时间连报，把额度用光
      for (let wave = 1; wave <= 12; wave++) {
        for (;;) {
          const res = await h.clear(me.id, me.partyId, wave);
          if (res.status === 200) break;
          h.tick(res.body.retryAfterMs);
        }
      }
      const spent = (await h.state(me.id)).partyRun.budgetMs;
      assert.ok(spent < PARTY_JUDGE.budgetCapMs / 2, String(spent));
      await new Promise((r) => setTimeout(r, 5));
      assert.equal((await h.start(me.id, me.partyId)).status, 200);
      const again = (await h.state(me.id)).partyRun;
      assert.equal(again.nextWave, 1);
      assert.ok(again.budgetMs < PARTY_JUDGE.budgetCapMs / 2, `重开后额度 ${again.budgetMs}`);
      await h.storage.leaveParty({ userId: me.id, partyId: me.partyId });
      const other = await h.storage.createParty({ userId: me.id });
      await new Promise((r) => setTimeout(r, 5));
      assert.equal((await h.start(me.id, other.id)).status, 200);
      assert.ok((await h.state(me.id)).partyRun.budgetMs < PARTY_JUDGE.budgetCapMs / 2);
      // 歇够了才攒得回来，而且有上限
      h.tick(HOUR);
      assert.equal((await h.clear(me.id, other.id, 1)).status, 200);
      assert.ok((await h.state(me.id)).partyRun.budgetMs <= PARTY_JUDGE.budgetCapMs);
    } finally {
      await h.close();
    }
  });

  it("反复重整也快不过额度：清第 1 波就重整的循环，平均不快于期望的 paceFloor", async () => {
    const h = await harness();
    try {
      const me = await solo(h, "pr5-reset-loop");
      const t0 = h.now();
      let expected = 0;
      let cleared = 0;
      for (let i = 0; i < 40; i++) {
        const st = await h.state(me.id);
        st.combatSkills = defaultCombatSkills(10);
        st.combatLevel = 10;
        expected += expectedWaveMs(partyWave(partyDungeonFor(pack, "forest")!, 1, 1), buildSquad(partySelf(st, pack, new Date(h.now())), []), partySkills(st));
        for (;;) {
          const res = await h.clear(me.id, me.partyId, 1);
          if (res.status === 200) break;
          h.tick(res.body.retryAfterMs);
        }
        cleared += 1;
        assert.equal((await h.post(me.id, "/party/wave-reset", { partyId: me.partyId })).body.nextWave, 1);
      }
      assert.equal(cleared, 40);
      assert.ok(h.now() - t0 >= expected * PARTY_JUDGE.paceFloor - PARTY_JUDGE.budgetCapMs - 1000, `${h.now() - t0} < ${expected}`);
      assert.equal((await h.state(me.id)).stats.totalBossKills || 0, 0);
    } finally {
      await h.close();
    }
  });

  it("时钟往回拨：不会卡到时钟追上来，等够这一波的时间就能领", async () => {
    const h = await harness();
    try {
      const me = await solo(h, "pr5-clock");
      await clearWaves(h, me, 1, 2);
      const st = await h.state(me.id);
      st.partyRun.waveStartedAt = h.now() + HOUR;
      const early = await h.clear(me.id, me.partyId, 3);
      assert.equal(early.body.error, "party_wave_early");
      h.tick(early.body.retryAfterMs);
      assert.equal((await h.clear(me.id, me.partyId, 3)).status, 200);
    } finally {
      await h.close();
    }
  });

  it("队伍已经重开一场，上一场的迟到请求领不到东西", async () => {
    const h = await harness();
    try {
      const me = await solo(h, "pr5-stale");
      const old = (await h.storage.getPartyForUser({ userId: me.id }))!.currentActivity!;
      await clearWaves(h, me, 1, 2);
      await new Promise((r) => setTimeout(r, 5));
      assert.equal((await h.start(me.id, me.partyId)).status, 200);
      const st = await h.state(me.id);
      const ctx = { partyId: me.partyId, startedAt: old.startedAt, stageId: "forest", mateLevels: [] };
      const at = new Date(h.now() + 10);
      for (const wave of [1, 3]) assert.notEqual(judgeWaveClear(structuredClone(st), pack, ctx, wave, at).kind, "ok");
      assert.equal(judgeWaveClear(structuredClone(st), pack, ctx, 1, at).kind, "early", "起点不早于新一场开始，老活动的时间不算数");
    } finally {
      await h.close();
    }
  });

  it("打到一半队友全退：这一波按开打时的小队算时间，不会突然要等很久", async () => {
    const h = await harness();
    try {
      const id = await h.player("pr5-desert", 12);
      const party = await h.storage.createParty({ userId: id });
      const mates = [];
      for (let i = 0; i < 4; i++) {
        mates.push(await h.player(`pr5-desert-${i}`, 12));
        await h.storage.joinParty({ userId: mates[i], partyId: party.id });
      }
      assert.equal((await h.start(id, party.id)).status, 200);
      await clearWaves(h, { id, partyId: party.id }, 1, 1);
      const run = structuredClone((await h.state(id)).partyRun);
      assert.ok(run.expectedMs > 0);
      for (const m of mates) await h.storage.leaveParty({ userId: m, partyId: party.id });
      // 额度用光，只看这一波自己的用时
      (await h.state(id)).partyRun.budgetMs = 0;
      h.tick(Math.max(run.minMs + PARTY_RULES.waveGapMs, run.expectedMs));
      assert.equal((await h.clear(id, party.id, 2)).status, 200);
    } finally {
      await h.close();
    }
  });

  it("服务重启后陪练名册是空的：清波时按设备号认回来，等级与玩家看到的一致", async () => {
    const h = await harness();
    try {
      const id = await h.player("pr5-bots", 5);
      const party = await h.storage.createParty({ userId: id });
      // 上一个进程登记过的陪练，这个进程没登记
      for (const device of ["party_bot_purple", "party_bot_extra_7"]) {
        const bot = await h.storage.findOrCreateGuestUser(device);
        await h.storage.getOrCreatePlayerState(bot.id, pack.version);
        await h.storage.joinParty({ userId: bot.id, partyId: party.id });
      }
      const ids = (await h.storage.getPartyForUser({ userId: id }))!.members.map((m) => m.userId).filter((m) => m !== id);
      assert.deepEqual(ids.map(isPartyBotUserId), [false, false]);
      assert.equal((await h.start(id, party.id)).status, 200);
      assert.deepEqual(ids.map(isPartyBotUserId), [true, true]);
      const seen = enrichPartyForClient(await h.storage.getPartyForUser({ userId: id }), id)!.members.filter((m) => m.userId !== id);
      assert.deepEqual(seen.map((m) => [m.isBot, m.combatLevel]), [[true, 35], [true, 24]]);
    } finally {
      await h.close();
    }
  });
});
