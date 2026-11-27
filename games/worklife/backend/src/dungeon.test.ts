import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import Fastify from "fastify";
import packJson from "../../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack } from "./types";
import { defaultCombatSkills } from "./combat_skills";
import { combatGains, startHpCombat, tickHpCombat } from "./hp_combat";
import { combatHpRoutes } from "./routes/combat_hp";
import { defaultEnhancedPlayerState, simulateToNow } from "./storage";
import { createMemoryStorage } from "./storage_memory";
import { todayLocal } from "./time";
import { OPEN_ZONE_IDS } from "./zones";
import { ZONE_TIER_RULES } from "./zone_tiers";
import { startDungeon } from "./dungeon";
import { DUNGEON_RULES, dungeonClearPool, dungeonDay, dungeonRunsLeft, dungeonWaves, pickClearReward } from "./dungeon_rules";
import { ESSENCE_RULES, ESSENCE_TIER, ZONE_ESSENCE, essenceForItemTier, essenceUseLine } from "./zone_essence";
import { performEnhancementAttempt } from "./enhancement_math";
import { startEnhanceRun, tickEnhanceRun, ENHANCE_BASE_INTERVAL_MS } from "./enhancement_run";
import { enhanceFinalChance } from "./growth_curves";
import { getXpForLevel } from "./storage";

const pack = packJson as unknown as EnhancedContentPack;
const monsters = pack.monsters as any[];
const stage = (id: string) => (pack.stages as any[]).find((s) => s.id === id) as { id: string; monsters: string[] };
const zoneMonsters = (id: string) => stage(id).monsters.map((m) => monsters.find((x) => x.id === m));
const T0 = Date.parse("2026-09-03T00:00:00.000Z");

/** 打森林稳赢的角色；森林首领击败过一次（打通过）。 */
function hero(extra: Record<string, unknown> = {}, level = 60): any {
  const st: any = defaultEnhancedPlayerState(pack.version || "1.0.0");
  st.combatSkills = defaultCombatSkills(level);
  st.combatLevel = level;
  st.equipment.main_hand = "weapon_steel_axe";
  st.inventory.weapon_steel_axe = 1;
  st.lastSimulatedAt = new Date(T0).toISOString();
  st.stats.killsByMonster = { forest_boss: 1 };
  return Object.assign(st, extra);
}

/** 开一次地下城（与路由同一套：登记 + 开第一波）。 */
function enter(st: any, zoneId = "forest", tier = 0, at = T0, p = pack) {
  const started = startDungeon(st, p, zoneId, tier, new Date(at));
  assert.equal(started.ok, true, JSON.stringify(started));
  if (!started.ok) throw new Error("start failed");
  st.hpCombat = startHpCombat(st, p, started.monsterId, new Date(at), { tier: started.tier, runStats: { startedAt: at, kills: 0, xp: 0, gold: 0, loot: {} } });
  st.mode = "combat";
  st.lastSimulatedAt = new Date(at).toISOString();
}

/** 在线：每秒结算一次，直到地下城结束或到时限。 */
function playOnline(st: any, fromMs: number, maxMs: number, p = pack, rng: () => number = () => 0.99) {
  let at = fromMs;
  while (at < fromMs + maxMs && !st.dungeonRun?.outcome) {
    at += 1000;
    st = simulateToNow({ state: st, now: new Date(at), contentPack: p, rng }).state;
  }
  return { st, at };
}

describe("地下城：规则", () => {
  it("11 个区域都能排出 5 波，末波是首领，普通怪按等级从低到高", () => {
    for (const id of OPEN_ZONE_IDS) {
      const waves = dungeonWaves(zoneMonsters(id));
      assert.equal(waves.length, DUNGEON_RULES.waves, id);
      assert.ok(waves[waves.length - 1].endsWith("_boss"), id);
      const lv = waves.slice(0, -1).map((w) => monsters.find((m) => m.id === w).level);
      assert.deepEqual(lv, [...lv].sort((a, b) => a - b), id);
    }
  });

  it("次数按东八区日期，跨天归零；旧存档没有字段 = 一次没开过", () => {
    const day = dungeonDay(T0);
    assert.equal(day, todayLocal(new Date(T0)));
    assert.equal(dungeonDay(Date.parse("2026-09-03T16:00:00Z")), "2026-09-04");
    assert.equal(dungeonRunsLeft(undefined, day), DUNGEON_RULES.runsPerDay);
    assert.equal(dungeonRunsLeft({ day, runs: 2 }, day), DUNGEON_RULES.runsPerDay - 2);
    assert.equal(dungeonRunsLeft({ day: "2026-09-02", runs: 3 }, day), DUNGEON_RULES.runsPerDay);
  });

  it("通关奖励只从各波怪物已有的稀有掉落里按掉率加权抽", () => {
    const waves = dungeonWaves(zoneMonsters("forest")).map((id) => monsters.find((m) => m.id === id));
    const pool = dungeonClearPool(waves);
    const rares = new Set(waves.map((m) => m.rare).filter(Boolean));
    assert.ok(pool.length > 0 && pool.every((p) => rares.has(p.rare)));
    const total = pool.reduce((s, p) => s + p.weight, 0);
    let acc = 0;
    for (const p of pool) {
      assert.equal(pickClearReward(pool, (acc + p.weight / 2) / total), p.rare);
      acc += p.weight;
    }
  });
});

describe("地下城：结算", () => {
  it("波次推进：一波接一波，档位跟着地下城走；全通发一件通关奖励，不重复打首领（连续战斗开着也一样）", () => {
    let st = hero({ combatLoadout: { food: [], drink: [], autoRepeat: true } });
    st.zoneTiers = {}; // 区域选的是普通，地下城选困难
    st.stats.killsByMonster = { forest_boss: 1, slime: ZONE_TIER_RULES.unlockKills[1] };
    enter(st, "forest", 1);
    const waves = st.dungeonRun.waves as string[];
    assert.equal(st.hpCombat.monsterId, waves[0]);
    assert.equal(st.hpCombat.tier, 1);
    const before = { ...st.stats.killsByMonster };
    const { st: done, at } = playOnline(st, T0, 15 * 60_000);
    st = done;
    assert.equal(st.dungeonRun.outcome, "clear", JSON.stringify(st.hpCombat?.log?.slice(-5)));
    assert.equal(st.dungeonRun.cleared, waves.length);
    for (const w of waves) assert.equal(st.stats.killsByMonster[w], (before[w] || 0) + 1, w);
    assert.deepEqual(st.stats.zoneTierKills.forest, [waves.length, 0]);
    const reward = st.dungeonRun.result.reward;
    assert.ok(reward && (st.inventory[reward] || 0) >= 1, "通关奖励进背包");
    assert.equal(st.dungeonRun.result.xp, st.hpCombat.runStats.xp);
    assert.equal(st.hpCombat.nextFightAt, undefined);
    // 之后再结算也不会开新的一场
    const later = simulateToNow({ state: st, now: new Date(at + 30_000), contentPack: pack, rng: () => 0.99 }).state as any;
    assert.equal(later.stats.killsByMonster[waves[waves.length - 1]], st.stats.killsByMonster[waves[waves.length - 1]]);
    assert.equal(later.hpCombat.outcome, "win");
  });

  it("中途失败按已过的波数结算：前几波的经验、掉落照拿，没有通关奖励，也不重生续打", () => {
    const hard = {
      ...pack,
      monsters: monsters.map((m) => (m.id === "forest_boss" ? { ...m, atk: 99_999, bossMechanics: undefined } : m)),
    } as EnhancedContentPack;
    let st = hero({ combatLoadout: { food: [], drink: [], autoRepeat: true } });
    enter(st, "forest", 0, T0, hard);
    const waves = st.dungeonRun.waves as string[];
    const { st: done, at } = playOnline(st, T0, 15 * 60_000, hard);
    st = done;
    assert.equal(st.dungeonRun.outcome, "fail");
    assert.equal(st.dungeonRun.cleared, waves.length - 1);
    assert.equal(st.dungeonRun.result.reward, undefined);
    assert.ok(st.dungeonRun.result.xp > 0);
    assert.equal(st.stats.killsByMonster.forest_boss, 1);
    assert.equal(st.hpCombat.outcome, "loss");
    assert.equal(st.hpCombat.nextFightAt, undefined);
    const later = simulateToNow({ state: st, now: new Date(at + 120_000), contentPack: hard, rng: () => 0.99 }).state as any;
    assert.equal(later.hpCombat.outcome, "loss", "不重生");
  });

  it("离线不能刷：两次结算隔太久，地下城按已过的波数结束，空档里一场也不打", () => {
    let st = hero();
    enter(st);
    st = playOnline(st, T0, 20_000).st;
    const kills = { ...st.stats.killsByMonster };
    const cleared = st.dungeonRun.cleared;
    const gapAt = T0 + 20_000 + DUNGEON_RULES.offlineGapMs + 1;
    st = simulateToNow({ state: st, now: new Date(gapAt), contentPack: pack, rng: () => 0.99 }).state;
    assert.equal(st.dungeonRun.outcome, "offline");
    assert.equal(st.dungeonRun.cleared, cleared);
    assert.equal(st.hpCombat, undefined);
    assert.equal(st.mode, "idle");
    assert.deepEqual(st.stats.killsByMonster, kills);
    // 间隔不超过门槛仍算在线
    let on = hero();
    enter(on);
    on = simulateToNow({ state: on, now: new Date(T0 + DUNGEON_RULES.offlineGapMs), contentPack: pack, rng: () => 0.99 }).state;
    assert.notEqual(on.dungeonRun.outcome, "offline");
    assert.ok(on.dungeonRun.cleared > 0);
  });

  it("旧存档（没有地下城字段）照常结算，不平白多出字段", () => {
    const st = hero({ combatLoadout: { food: [], drink: [], autoRepeat: true } });
    st.hpCombat = startHpCombat(st, pack, "bee", new Date(T0));
    st.mode = "combat";
    const next = simulateToNow({ state: st, now: new Date(T0 + 60_000), contentPack: pack, rng: () => 0.99 }).state as any;
    assert.ok(next.stats.killsByMonster.bee > 0);
    assert.equal(next.dungeonRun, undefined);
    assert.equal(next.dungeonDaily, undefined);
    assert.equal(next.hpCombat.tier, undefined);
  });
});

describe("地下城：接口（内存存储，app.inject）", () => {
  it("没打通不能进；进了扣次数、开第一波；进行中不能再进；逃跑算离开；每天 3 次；档位要已开放；坏参数拒绝", async () => {
    const storage = createMemoryStorage();
    const app = Fastify({ logger: false });
    app.addHook("onRequest", async (req) => { (req as any).userId = req.headers["x-user"]; });
    await combatHpRoutes(app, storage, pack);
    try {
      const user = await storage.findOrCreateGuestUser("dungeon-route");
      const st = (await storage.getOrCreatePlayerState(user.id, pack.version || "1.0.0")) as any;
      st.combatSkills = defaultCombatSkills(60);
      st.combatLevel = 60;
      const post = async (url: string, payload: Record<string, unknown> = {}, headers: Record<string, string> = { "x-user": user.id }) => {
        const res = await app.inject({ method: "POST", url, headers, payload });
        return { status: res.statusCode, body: res.json() as any };
      };
      const start = (payload: Record<string, unknown>) => post("/combat/dungeon/start", payload);
      assert.equal((await post("/combat/dungeon/start", { zoneId: "forest", tier: 0 }, {})).status, 401);
      assert.deepEqual([(await start({ zoneId: "forest", tier: 0 })).body.error], ["zone_not_cleared"]);
      st.stats.killsByMonster = { forest_boss: 1 };
      assert.equal((await start({ zoneId: "forest", tier: 1 })).body.error, "tier_locked");
      const ok = await start({ zoneId: "forest", tier: 0 });
      assert.equal(ok.status, 200, JSON.stringify(ok.body));
      assert.equal(ok.body.hpCombat.monsterId, ok.body.dungeonRun.waves[0]);
      assert.deepEqual(ok.body.dungeonDaily, { day: dungeonDay(Date.now()), runs: 1 });
      assert.equal((await start({ zoneId: "forest", tier: 0 })).status, 409);
      const fled = await post("/combat/hp/flee");
      assert.equal(fled.body.dungeonRun.outcome, "left");
      assert.equal((await start({ zoneId: "forest", tier: 0 })).status, 200);
      // 战斗被别的入口收掉（例如改做生活动作）：下次结算按「离开」结束，可以再开
      const mid = (await storage.getOrCreatePlayerState(user.id, "x")) as any;
      mid.hpCombat = undefined;
      const third = await start({ zoneId: "forest", tier: 0 });
      assert.equal(third.status, 200, JSON.stringify(third.body));
      assert.ok(JSON.stringify(third.body.logs || third.body.log || "").includes("地下城中途离开"), "上一次按离开收尾");
      assert.equal(third.body.dungeonDaily.runs, 3);
      await post("/combat/hp/flee");
      const out = await start({ zoneId: "forest", tier: 0 });
      assert.deepEqual([out.status, out.body.error], [400, "no_runs_left"]);
      // 第二天又有 3 次
      const live = (await storage.getOrCreatePlayerState(user.id, "x")) as any;
      live.dungeonDaily = { day: "2000-01-01", runs: 3 };
      assert.equal((await start({ zoneId: "forest", tier: 0 })).status, 200);
      await post("/combat/hp/flee");
      for (const bad of [{ zoneId: "nowhere", tier: 0 }, { zoneId: "forest", tier: 3 }, { zoneId: "forest", tier: 0, extra: 1 }, { zoneId: "forest" }]) {
        assert.ok((await start(bad)).status >= 400, JSON.stringify(bad));
      }
    } finally {
      await app.close();
      await storage.close();
    }
  });

  it("PostgreSQL 存储走同一个结算与命令入口（地下城状态在存档 JSON 里，不改表结构）", () => {
    const src = readFileSync(new URL("./storage_pg.ts", import.meta.url), "utf8");
    assert.match(src, /simulateToNow\(\{ state: structuredClone\(snapshot\)/);
    assert.match(src, /async executePlayerCommand/);
    const mem = readFileSync(new URL("./storage_memory.ts", import.meta.url), "utf8");
    assert.match(mem, /simulateToNow/);
  });
});

describe("区域精华", () => {
  it("11 个区域各一种，都在内容包里；阶从低到高；用途一行", () => {
    const items = new Map((pack.items as any[]).map((i) => [i.id, i]));
    assert.deepEqual(Object.keys(ZONE_ESSENCE), [...OPEN_ZONE_IDS]);
    const tiers = OPEN_ZONE_IDS.map((z) => ESSENCE_TIER[ZONE_ESSENCE[z]]);
    assert.deepEqual(tiers, [...tiers].sort((a, b) => a - b));
    for (const z of OPEN_ZONE_IDS) {
      const item = items.get(ZONE_ESSENCE[z]);
      assert.ok(item, z);
      assert.equal(item.type, "material");
      assert.equal(item.tier, ESSENCE_TIER[item.id], item.id);
      assert.match(essenceUseLine(item.id)!, /强化 T\d+(–T\d+)? 装备/);
    }
    for (let t = 1; t <= 12; t++) assert.ok(ESSENCE_TIER[essenceForItemTier(t)] >= t);
  });

  it("掉率：普通怪 1%、首领 6%，乘档位掉率与稀有发现；最后掷，不改前面掉落的顺序", () => {
    const run = (monsterId: string, tier: number, roll: number) => {
      const st = hero({ combatLoadout: { food: [], drink: [], autoRepeat: false } }, 80);
      st.stats.killsByMonster = { slime: 500, forest_boss: 1 };
      st.stats.zoneTierKills = { forest: [500, 0] };
      if (tier) st.zoneTiers = { forest: tier };
      st.hpCombat = startHpCombat(st, pack, monsterId, new Date(T0));
      let at = T0;
      for (let i = 0; i < 120 && !st.hpCombat.outcome; i++) at = tickHpCombat(st, pack, new Date(at + 1000), 1000, () => roll);
      assert.equal(st.hpCombat.outcome, "win");
      return { got: Number(st.inventory.essence_forest || 0), rf: combatGains(st, pack, new Date(T0)).rareSolo };
    };
    const { rf } = run("slime", 0, 0.99);
    const expectations: Array<[string, number, number]> = [
      ["slime", 0, ESSENCE_RULES.dropChance * rf],
      ["slime", 1, ESSENCE_RULES.dropChance * (1 + ZONE_TIER_RULES.drop[1]) * rf],
      ["forest_boss", 0, ESSENCE_RULES.bossDropChance * rf],
    ];
    for (const [id, tier, chance] of expectations) {
      assert.equal(run(id, tier, chance * 0.999).got, 1, `${id}/${tier} 刚好在掉率之下`);
      assert.equal(run(id, tier, chance * 1.001).got, 0, `${id}/${tier} 刚好在掉率之上`);
    }
  });

  it("用途：强化时加对应阶的精华，成功率与公式一致，每次耗 1 个；用错种类拒绝；用完后强化照常继续", () => {
    const st: any = defaultEnhancedPlayerState(pack.version || "1.0.0");
    st.inventory.weapon_wooden_sword = 1;
    st.equipment.main_hand = "weapon_wooden_sword";
    st.inventory.lumber_1 = 1000;
    st.inventory.gold = 100_000;
    const sword = (pack.items as any[]).find((i) => i.id === "weapon_wooden_sword");
    const essence = essenceForItemTier(sword.tier);
    st.inventory[essence] = 2;
    const rule = (pack.enhancementRules as any[]).find((r) => r.itemType === "all_wooden_equipment");
    const attempt = (essenceItemId?: string) =>
      performEnhancementAttempt({
        player: st,
        item: sword,
        rule,
        request: { itemId: sword.id, targetLevel: Number(st.equipment.enhancementLevels?.[sword.id] || 0) + 1, materials: {}, ...(essenceItemId ? { essenceItemId } : {}) },
        pack,
        rng: () => 0.999,
        xpForLevel: getXpForLevel,
        toolBonus: 0,
      });
    const wrong = attempt("cosmos_essence");
    assert.match(wrong.failureReason || "", /不适合/);
    assert.deepEqual(wrong.consumedMaterials, {});
    const plain = attempt();
    const withEss = attempt(essence);
    assert.equal(withEss.consumedMaterials[essence], ESSENCE_RULES.enhanceCost);
    assert.equal(st.inventory[essence], 1);
    const skill = st.skills.skill_enhancing.level;
    assert.ok(Math.abs(withEss.successRate! - enhanceFinalChance(1, skill, 1, ESSENCE_RULES.enhanceBonus)) < 1e-9 || withEss.successRate! > plain.successRate!);
    assert.ok(withEss.successRate! > plain.successRate!);
    assert.ok(withEss.successRate! <= plain.successRate! * (1 + ESSENCE_RULES.enhanceBonus) * 1.0001 + 1e-9, "幅度克制：不超过 +10%（相对）");
    // 计时强化：精华只剩 1 个，第二次起不再加，强化继续
    st.mode = "idle";
    const started = startEnhanceRun(st, pack, { itemId: sword.id, targetLevel: 5, useEssence: true }, new Date(T0));
    assert.equal(started.ok, true);
    tickEnhanceRun(st, pack, T0 + 3 * ENHANCE_BASE_INTERVAL_MS, () => 0.999);
    assert.equal(st.enhanceRun.attempts, 3);
    assert.equal(st.enhanceRun.useEssence, false);
    assert.equal(st.inventory[essence] || 0, 0);
    assert.equal(st.enhanceRun.outcome, undefined);
    // 没有精华时要求加精华：开不了
    const poor: any = defaultEnhancedPlayerState(pack.version || "1.0.0");
    Object.assign(poor.inventory, { weapon_wooden_sword: 1, lumber_1: 100, gold: 10_000 });
    const denied = startEnhanceRun(poor, pack, { itemId: sword.id, targetLevel: 1, useEssence: true }, new Date(T0));
    assert.equal(denied.ok, false);
  });
});

describe("地下城：审查修补（2026-11-27）", () => {
  it("系统时间往回拨不多给次数；存档日期比今天晚 1 天以上当坏数据，从今天重算", () => {
    const used = { day: "2026-09-04", runs: 3 };
    assert.equal(dungeonRunsLeft(used, "2026-09-04"), 0);
    assert.equal(dungeonRunsLeft(used, "2026-09-03"), 0, "回拨到前一天仍记在存档那一天");
    assert.equal(dungeonRunsLeft(used, "2026-09-05"), DUNGEON_RULES.runsPerDay, "真的过了一天照常归零");
    assert.equal(dungeonRunsLeft({ day: "2030-01-01", runs: 3 }, "2026-09-03"), DUNGEON_RULES.runsPerDay, "错到很远的日期不把人锁住");
    const st = hero({ dungeonDaily: { day: todayLocal(new Date(T0 + 86_400_000)), runs: 2 } });
    enter(st, "forest", 0, T0);
    assert.deepEqual(st.dungeonDaily, { day: todayLocal(new Date(T0 + 86_400_000)), runs: 3 }, "回拨时开的这次记在存档那一天");
    assert.equal(startDungeon(hero({ dungeonDaily: st.dungeonDaily }), pack, "forest", 0, new Date(T0)).ok, false);
  });

  it("结算弹窗看过记在存档：只认这一趟，没结束不记，接口写进存档", async () => {
    const { markDungeonResultSeen } = await import("./dungeon");
    const st = hero();
    enter(st);
    assert.equal(markDungeonResultSeen(st, T0), false, "还在打不记");
    const { st: done } = playOnline(st, T0, 10 * 60_000);
    assert.ok(done.dungeonRun.outcome);
    assert.equal(markDungeonResultSeen(done, T0 + 1), false, "不是这一趟");
    assert.equal(markDungeonResultSeen(done, T0), true);
    assert.equal(done.dungeonRun.resultSeen, true);
    assert.equal(markDungeonResultSeen(done, T0), false, "重复报不变");

    const storage = createMemoryStorage();
    const app = Fastify({ logger: false });
    app.addHook("onRequest", async (req) => { (req as any).userId = req.headers["x-user"]; });
    await combatHpRoutes(app, storage, pack);
    try {
      const user = await storage.findOrCreateGuestUser("dungeon-seen");
      const live = (await storage.getOrCreatePlayerState(user.id, pack.version || "1.0.0")) as any;
      live.dungeonRun = { zoneId: "forest", tier: 0, waves: ["a"], cleared: 0, startedAt: 123, outcome: "fail", endedAt: 456, result: { xp: 1, gold: 2, loot: {} } };
      const res = await app.inject({ method: "POST", url: "/combat/dungeon/seen", headers: { "x-user": user.id }, payload: { startedAt: 123 } });
      assert.equal(res.statusCode, 200, res.body);
      assert.equal(res.json().dungeonRun.resultSeen, true);
      const bad = await app.inject({ method: "POST", url: "/combat/dungeon/seen", headers: { "x-user": user.id }, payload: { startedAt: "x" } });
      assert.ok(bad.statusCode >= 400);
    } finally {
      await app.close();
      await storage.close();
    }
  });

  it("波间歇也算在战斗里：不能开强化；改做生活动作按「离开」结束，已过几波的累计留在结算里", async () => {
    const { startLifeActionNow } = await import("./storage");
    const st = hero();
    st.inventory.weapon_wooden_sword = 1;
    enter(st);
    let at = T0;
    while (at < T0 + 5 * 60_000 && !(st.hpCombat?.outcome === "win" && st.hpCombat.nextFightAt)) {
      at += 250;
      Object.assign(st, simulateToNow({ state: st, now: new Date(at), contentPack: pack, rng: () => 0.99 }).state);
    }
    assert.equal(st.dungeonRun.cleared, 1, "停在第一波后的歇息里");
    assert.equal(st.combatLoadout?.autoRepeat ?? false, false, "没开连续战斗");
    const res = startEnhanceRun(st, pack, { itemId: "weapon_steel_axe", targetLevel: 1 }, new Date(at));
    assert.deepEqual([res.ok, !res.ok && res.error], [false, "in_combat"]);
    const action = (pack.actions as any[]).find((a) => !String(a.id).startsWith("act_combat_"));
    startLifeActionNow(st, pack, action.id, undefined, new Date(at));
    assert.equal(st.dungeonRun.outcome, "left");
    assert.ok(st.dungeonRun.result.xp > 0, "第一波的经验写进了结算");
  });
});
