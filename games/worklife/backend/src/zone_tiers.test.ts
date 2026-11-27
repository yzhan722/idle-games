import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Fastify from "fastify";
import packJson from "../../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack } from "./types";
import { defaultCombatSkills } from "./combat_skills";
import { RESPAWN_MS, setCombatLoadout, startHpCombat, tickHpCombat, tierForMonster } from "./hp_combat";
import { combatHpRoutes } from "./routes/combat_hp";
import { doPrestige } from "./progression2";
import { defaultEnhancedPlayerState, simulateToNow } from "./storage";
import { createMemoryStorage } from "./storage_memory";
import { OPEN_ZONE_IDS } from "./zones";
import { ZONE_TIER_COUNT, ZONE_TIER_NAMES, ZONE_TIER_RULES, clampTier, effectiveTier, tierMonster, tierRespawnMs, zoneTierKills, zoneTierKillsLeft } from "./zone_tiers";

const pack = packJson as unknown as EnhancedContentPack;
const monsters = pack.monsters as any[];
const forest = (pack.stages as any[]).find((s) => s.id === "forest") as { id: string; monsters: string[] };
const T0 = Date.parse("2026-09-03T00:00:00.000Z");
const [HARD, NIGHTMARE] = [1, 2];

/** 森林里够强的角色：打史莱姆稳赢。 */
function hero(extra: Record<string, unknown> = {}, level = 30): any {
  const st: any = defaultEnhancedPlayerState(pack.version || "1.0.0");
  st.combatSkills = defaultCombatSkills(level);
  st.combatLevel = level;
  st.equipment.main_hand = "weapon_steel_axe";
  st.inventory.weapon_steel_axe = 1;
  st.lastSimulatedAt = new Date(T0).toISOString();
  return Object.assign(st, extra);
}
const opened = { killsByMonster: { slime: ZONE_TIER_RULES.unlockKills[1] }, zoneTierKills: { forest: [ZONE_TIER_RULES.unlockKills[2], 0] } };
const withStats = (st: any, stats: Record<string, unknown>) => Object.assign(st, { stats: { ...st.stats, ...stats } });
/** 抹掉与时刻有关的字段，比较两份存档。 */
const strip = (st: any) => JSON.parse(JSON.stringify(st, (k, v) => (["ts", "unlockedAt", "expiresAt", "firstPlayedAt"].includes(k) ? undefined : v)));

describe("区域难度：公式", () => {
  it("普通档原样返回同一个怪物对象；档位收拢到 0～2；三档的生命、攻击、闪避、抗性、经验、掉率逐档更高", () => {
    for (const bad of [undefined, null, NaN, -3, "x", 0.9]) assert.equal(clampTier(bad), 0);
    assert.deepEqual([clampTier(2.7), clampTier(99), clampTier("1")], [2, 2, 1]);
    assert.equal(ZONE_TIER_NAMES.length, ZONE_TIER_COUNT);
    for (const m of monsters) {
      for (const t of [undefined, 0, -1, "0"]) assert.equal(tierMonster(m, t), m);
      let prev = m;
      for (const t of [HARD, NIGHTMARE]) {
        const x = tierMonster(m, t) as any;
        for (const key of ["hp", "atk", "xp", "evasion", "physResist", "elemResist"]) {
          assert.ok(Number(x[key]) >= Number(prev[key] || 0), `${m.id} 档${t} ${key}`);
        }
        assert.ok(x.atk > m.atk && x.xp > m.xp && x.physResist > Number(m.physResist || 0), m.id);
        if (m.rareChance) assert.ok(x.rareChance > prev.rareChance || x.rareChance === 1, m.id);
        (m.drops || []).forEach((d: any, i: number) => assert.ok(x.drops[i].chance > prev.drops[i].chance || x.drops[i].chance === 1, m.id));
        // 不加新东西：金币、防御、出手间隔、机制、掉落物都是原来的
        for (const key of ["gold", "def", "attackIntervalMs", "mechanics", "rare", "level", "name", "accuracy", "damageType"]) assert.deepEqual(x[key], m[key], `${m.id} ${key}`);
        assert.deepEqual((x.drops || []).map((d: any) => d.itemId), (m.drops || []).map((d: any) => d.itemId));
        prev = x;
      }
    }
    assert.equal(tierRespawnMs(0), RESPAWN_MS);
    assert.ok(tierRespawnMs(HARD) > RESPAWN_MS && tierRespawnMs(NIGHTMARE) > tierRespawnMs(HARD));
  });

  it("开放条件：上一档在这个区域的累计击杀；旧存档用现成的逐怪击杀数，没有新计数按 0", () => {
    const need = ZONE_TIER_RULES.unlockKills;
    assert.equal(zoneTierKillsLeft(undefined, forest, HARD), need[1]);
    assert.equal(zoneTierKillsLeft({ killsByMonster: { slime: need[1] - 1, rock_golem: 999 } }, forest, HARD), 1, "别的区域不算");
    const old = { killsByMonster: { slime: need[1] - 10, bee: 10 } };
    assert.equal(zoneTierKillsLeft(old, forest, HARD), 0);
    assert.equal(zoneTierKillsLeft(old, forest, NIGHTMARE), need[2]);
    assert.equal(effectiveTier(old, forest, NIGHTMARE), HARD, "选了没开放的档，退回最高的已开放档");
    assert.equal(effectiveTier({}, forest, NIGHTMARE), 0);
    const both = { killsByMonster: { slime: need[1] }, zoneTierKills: { forest: [need[2], 5] } };
    assert.equal(zoneTierKillsLeft(both, forest, NIGHTMARE), 0);
    assert.deepEqual([0, 1, 2].map((t) => zoneTierKills(both, forest, t)), [need[1], need[2], 5]);
    // 直接塞困难击杀数、但普通没打够：噩梦仍然不开
    assert.ok(zoneTierKillsLeft({ zoneTierKills: { forest: [9999, 0] } }, forest, NIGHTMARE) > 0);
  });
});

describe("区域难度：结算", () => {
  it("旧存档（没有新字段）、空选择、选普通、选了没开放的档：连打结果逐位相同", () => {
    const run = (extra: Record<string, unknown>) => {
      const st = hero({ combatLoadout: { food: [], drink: [], autoRepeat: true } });
      Object.assign(st, extra);
      st.hpCombat = startHpCombat(st, pack, "bee", new Date(T0));
      let k = 7;
      tickHpCombat(st, pack, new Date(T0 + 240_000), 240_000, () => (k = (k * 9301 + 49297) % 233280) / 233280);
      const out = strip(st);
      delete out.zoneTiers;
      return out;
    };
    const legacy = run({});
    assert.ok(legacy.stats.totalKills > 10 && legacy.hpCombat.tier === undefined && legacy.stats.zoneTierKills === undefined);
    for (const zoneTiers of [{}, { forest: 0 }, { forest: NIGHTMARE }, { mine: HARD }]) assert.deepEqual(run({ zoneTiers }), legacy, JSON.stringify(zoneTiers));
  });

  it("困难、噩梦：按那一档的怪物打，经验按那一档给，另计击杀；连续战斗沿用；改选后下一场起算", () => {
    for (const tier of [HARD, NIGHTMARE]) {
      const st = withStats(hero({ zoneTiers: { forest: tier }, combatLoadout: { food: [], drink: [], autoRepeat: true } }), structuredClone(opened));
      const m = tierMonster(monsters.find((x) => x.id === "slime"), tier) as any;
      st.hpCombat = startHpCombat(st, pack, "slime", new Date(T0));
      assert.deepEqual([st.hpCombat.tier, st.hpCombat.enemyMaxHp], [tier, m.hp]);
      let at = T0;
      for (let i = 0; i < 20 && !st.hpCombat.outcome; i++) at = tickHpCombat(st, pack, new Date(at + 1000), 1000, () => 0.99);
      assert.equal(st.hpCombat.outcome, "win");
      assert.equal(st.hpCombat.xpTotal, m.xp);
      assert.equal(st.stats.zoneTierKills.forest[tier - 1], opened.zoneTierKills.forest[tier - 1] + 1);
      assert.equal(st.stats.killsByMonster.slime, opened.killsByMonster.slime + 1);
      // 中途改回普通：已经打完的不变，下一场是普通
      st.zoneTiers = {};
      tickHpCombat(st, pack, new Date(st.hpCombat.nextFightAt + 10), 100, () => 0.99);
      assert.equal(st.hpCombat.outcome, undefined);
      assert.equal(st.hpCombat.tier, undefined);
      assert.equal(st.hpCombat.enemyMaxHp, monsters.find((x) => x.id === "slime").hp);
    }
  });

  it("离线结算按所选档位：同样的离线窗口，经验按那一档，普通档不变", () => {
    const gained = (tier: number) => {
      const st = withStats(hero({ zoneTiers: { forest: tier }, combatLoadout: { food: [], drink: [], autoRepeat: true } }, 60), structuredClone(opened));
      st.mode = "combat";
      st.hpCombat = startHpCombat(st, pack, "slime", new Date(T0));
      const now = new Date(T0 + 8 * 3_600_000);
      const next = simulateToNow({ state: st, now, contentPack: pack, rng: () => 0.99 }).state as any;
      const kills = next.stats.killsByMonster.slime - opened.killsByMonster.slime;
      assert.ok(kills > 10, String(kills));
      return { xp: next.stats.totalXpEarned, kills, tierKills: next.stats.zoneTierKills.forest, tier: next.hpCombat.tier };
    };
    const normal = gained(0);
    assert.deepEqual([normal.tier, normal.tierKills], [undefined, opened.zoneTierKills.forest]);
    for (const tier of [HARD, NIGHTMARE]) {
      const g = gained(tier);
      const xp = (tierMonster(monsters.find((x) => x.id === "slime"), tier) as any).xp;
      assert.equal(g.tier, tier);
      assert.ok(Math.abs(g.xp - g.kills * xp) < 0.01 * g.kills, `${g.xp} ${g.kills} × ${xp}`);
      assert.equal(g.tierKills[tier - 1], opened.zoneTierKills.forest[tier - 1] + g.kills);
      assert.ok(g.xp > normal.xp);
    }
  });

  it("掉率按档位：同一个骰子，普通掉不出、噩梦掉得出；单次掉率就是写的那一档", () => {
    const m = monsters.find((x) => forest.monsters.includes(x.id) && Number(x.rareChance) > 0 && Number(x.rareChance) < 0.5)!;
    const roll = m.rareChance * (1 + ZONE_TIER_RULES.drop[NIGHTMARE]) - 1e-6;
    const drops = (tier: number) => {
      const st = withStats(hero({ zoneTiers: { forest: tier } }, 80), structuredClone(opened));
      const only = { ...pack, monsters: monsters.map((x) => (x.id === m.id ? { ...x, drops: undefined } : x)) } as any;
      st.hpCombat = startHpCombat(st, only, m.id, new Date(T0));
      tickHpCombat(st, only, new Date(T0 + 60_000), 60_000, () => roll);
      assert.equal(st.hpCombat.outcome, "win");
      return st.hpCombat.drops.length;
    };
    assert.deepEqual([drops(0), drops(NIGHTMARE)], [0, 1]);
  });

  it("战败：普通 30 秒重生，困难、噩梦更久；重新打开连续战斗也按那一档", () => {
    for (const tier of [0, HARD, NIGHTMARE]) {
      const st = withStats(hero({ zoneTiers: { forest: tier }, combatLoadout: { food: [], drink: [], autoRepeat: true } }, 1), structuredClone(opened));
      st.combatLevel = 99; // 只为过等级门
      st.hpCombat = startHpCombat(st, pack, "forest_boss", new Date(T0));
      let at = T0;
      for (let i = 0; i < 200 && !st.hpCombat.outcome; i++) at = tickHpCombat(st, pack, new Date(at + 1000), 1000, () => 0.99);
      assert.equal(st.hpCombat.outcome, "loss");
      assert.equal(st.hpCombat.nextFightAt - st.combatHpAt, tierRespawnMs(tier));
      assert.ok(st.hpCombat.log.some((l: string) => l.includes(`${tierRespawnMs(tier) / 1000} 秒后重生`)));
      setCombatLoadout(st, pack, { autoRepeat: false }, new Date(at));
      setCombatLoadout(st, pack, { autoRepeat: true }, new Date(at));
      assert.equal(st.hpCombat.nextFightAt, at + tierRespawnMs(tier));
    }
  });

  it("不属于任何区域的怪（竞技场、圣骑士试炼）永远是普通；转生把选择收回普通，已开放的档位留着", () => {
    const st = withStats(hero({ zoneTiers: Object.fromEntries(OPEN_ZONE_IDS.map((z) => [z, NIGHTMARE])) }, 200), structuredClone(opened));
    assert.equal(tierForMonster(st, pack, "arena_champion_1"), 0);
    assert.equal(tierForMonster(st, pack, "slime"), NIGHTMARE);
    assert.equal(tierForMonster(st, pack, "rock_golem"), 0, "矿山还没打够");
    assert.equal(doPrestige(st).ok, true);
    assert.equal(st.zoneTiers, undefined);
    assert.equal(zoneTierKillsLeft(st.stats, forest, NIGHTMARE), 0);
  });
});

describe("区域难度：接口", () => {
  it("没打够不能选；打够能选、能选回；未知区域、越界档位、多余字段拒绝；选的档位进存档", async () => {
    const storage = createMemoryStorage();
    const app = Fastify({ logger: false });
    app.addHook("onRequest", async (req) => { (req as any).userId = req.headers["x-user"]; });
    await combatHpRoutes(app, storage, pack);
    try {
      const user = await storage.findOrCreateGuestUser("zone-tier-route");
      const st = (await storage.getOrCreatePlayerState(user.id, pack.version || "1.0.0")) as any;
      st.combatSkills = defaultCombatSkills(30);
      st.combatLevel = 30;
      const post = async (payload: Record<string, unknown>, headers: Record<string, string> = { "x-user": user.id }) => {
        const res = await app.inject({ method: "POST", url: "/combat/hp/zone-tier", headers, payload });
        return { status: res.statusCode, body: res.json() as any };
      };
      assert.equal((await post({ zoneId: "forest", tier: 1 }, {})).status, 401);
      const locked = await post({ zoneId: "forest", tier: 1 });
      assert.deepEqual([locked.status, locked.body.error], [400, "tier_locked"]);
      assert.match(locked.body.message, /普通.*再击败 100 只.*困难/);
      st.stats.killsByMonster = { slime: 60, bee: 40 };
      const ok = await post({ zoneId: "forest", tier: 1 });
      assert.equal(ok.status, 200, JSON.stringify(ok.body));
      assert.deepEqual(((await storage.getOrCreatePlayerState(user.id, "x")) as any).zoneTiers, { forest: 1 });
      assert.equal((await post({ zoneId: "forest", tier: 2 })).body.error, "tier_locked");
      const started = await app.inject({ method: "POST", url: "/combat/hp/start", headers: { "x-user": user.id }, payload: { monsterId: "slime" } });
      assert.equal(started.json().hpCombat.tier, 1);
      assert.equal((await post({ zoneId: "forest", tier: 0 })).status, 200);
      assert.deepEqual(((await storage.getOrCreatePlayerState(user.id, "x")) as any).zoneTiers, {});
      assert.equal((await post({ zoneId: "nowhere", tier: 0 })).status, 400);
      for (const bad of [{ zoneId: "forest", tier: 3 }, { zoneId: "forest", tier: -1 }, { zoneId: "forest", tier: 1.5 }, { zoneId: "forest", tier: 0, extra: 1 }]) {
        assert.ok((await post(bad)).status >= 400, JSON.stringify(bad));
      }
    } finally {
      await app.close();
      await storage.close();
    }
  });
});

describe("第 4 个饮品槽与攻击速度封顶（第五轮复核）", () => {
  it("戴腰包能存 4 种饮品，摘下后只能存 3 种，多出来的不生效也不丢", async () => {
    const storage = createMemoryStorage();
    const app = Fastify({ logger: false });
    app.addHook("onRequest", async (req) => { (req as any).userId = req.headers["x-user"]; });
    await combatHpRoutes(app, storage, pack);
    try {
      const user = await storage.findOrCreateGuestUser("four-drinks");
      const st = (await storage.getOrCreatePlayerState(user.id, pack.version || "1.0.0")) as any;
      const drinks = ["potion_battle_fury", "potion_iron_skin", "potion_arcane_surge", "tea_spirit"];
      for (const id of drinks) st.inventory[id] = 5;
      const post = async (payload: Record<string, unknown>) => {
        const res = await app.inject({ method: "POST", url: "/combat/hp/loadout", headers: { "x-user": user.id }, payload });
        return { status: res.statusCode, body: res.json() as any };
      };
      const four = { food: [], drink: drinks.map((itemId) => ({ itemId })), mp: [], autoRepeat: false };
      assert.match((await post(four)).body.error, /slot_limit_drink:3/);
      const pouch = (pack.items as any[]).find((i) => Number(i.drinkSlots) > 0);
      st.inventory[pouch.id] = 1;
      st.equipment.accessory1 = pouch.id;
      const saved = await post(four);
      assert.equal(saved.status, 200, JSON.stringify(saved.body));
      assert.equal(saved.body.combatLoadout.drink.length, 4);
      const live = (await storage.getOrCreatePlayerState(user.id, "x")) as any;
      delete live.equipment.accessory1;
      // 只改连续战斗开关：存着的 4 种原样留着
      assert.equal((await post({ autoRepeat: true })).body.combatLoadout.drink.length, 4);
      const after = (await storage.getOrCreatePlayerState(user.id, "x")) as any;
      after.hpCombat = startHpCombat(after, pack, "slime", new Date());
      assert.deepEqual(after.activeBuffs.map((b: any) => b.sourceItemId).sort(), drinks.slice(0, 3).sort(), "只喝前 3 格");
      assert.equal((await post({ ...four, drink: [...four.drink, { itemId: "drink_fine" }] })).status >= 400, true);
    } finally {
      await app.close();
      await storage.close();
    }
  });

  it("战斗速度的所有来源一起拉满，攻击间隔也只快 3%", async () => {
    const { currentCombatant } = await import("./hp_combat");
    const { ATTACK_SPEED } = await import("./combat_secondary");
    const at = new Date(T0);
    const far = new Date(T0 + 3_600_000).toISOString();
    const plain = hero({}, 100);
    const base = currentCombatant(plain, pack, at).intervalMs;
    const st = hero({}, 100);
    const sets = (pack as any).equipmentSets.filter((s: any) => s.bonuses.some((b: any) => b.stats?.combatSpeed));
    assert.ok(sets.length > 0);
    for (const p of sets[0].pieces) {
      st.equipment[p.slot] = p.itemId;
      st.inventory[p.itemId] = 1;
    }
    st.activeBuffs = (pack.items as any[])
      .filter((i) => Number(i.effect?.buff?.multipliers?.combatSpeed) > 1)
      .map((i) => ({ id: i.effect.buff.id, name: i.name, sourceItemId: i.id, expiresAt: far, multipliers: i.effect.buff.multipliers }));
    assert.ok(st.activeBuffs.length > 10);
    for (const build of [{}, { chapter3Build: "gale_flurry" }, { chapter4Build: "elixir_frenzy" }]) {
      const slow = currentCombatant(Object.assign(structuredClone(plain), build), pack, at).intervalMs;
      const fast = currentCombatant(Object.assign(structuredClone(st), build), pack, at).intervalMs;
      assert.equal(fast, Math.round(slow / (1 + ATTACK_SPEED.capPct / 100)), JSON.stringify(build));
    }
    assert.ok(base > 0);
  });
});
