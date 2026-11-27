import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import packJson from "../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack } from "../backend/src/types";
import { abilityCatalog } from "../backend/src/abilities";
import { defaultCombatSkills } from "../backend/src/combat_skills";
import { combatGains, currentCombatant, startHpCombat, tickHpCombat } from "../backend/src/hp_combat";
import { CHAINS, derivedChain, type Chain } from "../backend/src/zone_chains_fixture";
import { OPEN_ZONE_IDS } from "../backend/src/zones";
import { ZONE_TIER_RULES, tierMonster } from "../backend/src/zone_tiers";
import { abilitySlotCount } from "../frontend/src/gameplay/combatSheet";
import { FARM_RULES, farmLine, farmSetup, previewFarm } from "../frontend/src/gameplay/farmPreview";
import { previewAbilities } from "../frontend/src/gameplay/fightPreview";
import { encounterStages } from "../frontend/src/gameplay/encounters";
import * as frontTiers from "../frontend/src/gameplay/zoneTiers";
import { AUTO_REPEAT_INTERMISSION_MS, AUTO_REPEAT_MAX_CONSECUTIVE_DEATHS, FOOD_COOLDOWN_MS, MP_POTION_COOLDOWN_MS, RESPAWN_MS } from "../backend/src/hp_combat";

const P = packJson as any;
const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8").replace(/\r\n/g, "\n");
/** 结算给的经验会让角色中途升级，逐场比对时抹成 0；掉落也不要。等级门另有测试。 */
const pack = {
  ...P,
  monsters: P.monsters.map((m: any) => ({ ...m, xp: 0, rareChance: 0, drops: undefined })),
  actions: P.actions.map((a: any) => (String(a.id).startsWith("act_combat_") ? { ...a, requirements: {} } : a)),
} as EnhancedContentPack;
const T0 = Date.parse("2026-09-03T00:00:00.000Z");
const stages = encounterStages(P);
const monsterOf = (id: string) => P.monsters.find((m: any) => m.id === id);
const bossOf = (zone: string) => P.stages.find((s: any) => s.id === zone).monsters.find((id: string) => id.endsWith("_boss"));
const FOODS: Array<[number, string]> = [[1, "food_simple"], [30, "potion_hp_t2"], [60, "potion_hp_t3"], [90, "potion_hp_t4"]];

type Setup = { level: number; chain: Chain; food?: boolean; mp?: boolean; abilities?: string[]; extra?: Record<string, unknown> };

function player(zone: string, tier: number, s: Setup) {
  const st: any = {
    inventory: { gold: 0 }, equipment: { enhancementLevels: {}, durability: {}, maxDurability: {} }, skills: {}, logs: [],
    combatLevel: s.level, combatSkills: defaultCombatSkills(s.level),
    stats: {
      totalKills: 0, totalActions: 0, totalBossKills: 0, totalGoldEarned: 0, totalXpEarned: 0, killsByMonster: {}, highestCombatLevel: s.level,
      zoneTierKills: { [zone]: [ZONE_TIER_RULES.unlockKills[2], 0] },
    },
    abilities: {}, abilityLoadout: [], activeBuffs: [], settings: {}, zoneTiers: { [zone]: tier },
    combatLoadout: { food: [], drink: [], autoRepeat: true }, ...s.extra,
  };
  st.stats.killsByMonster[P.stages.find((x: any) => x.id === zone).monsters[0]] = ZONE_TIER_RULES.unlockKills[1];
  for (const [slot, id] of s.chain) {
    st.equipment[slot] = id;
    st.inventory[id] = 1;
  }
  for (const id of s.abilities ?? ["heavy_chop"]) {
    st.abilities[id] = { level: 100, xp: 0 };
    st.abilityLoadout.push({ abilityId: id, trigger: { type: "always" } });
  }
  if (s.food) {
    const id = FOODS.filter(([l]) => s.level >= l).at(-1)![1];
    st.inventory[id] = 10_000;
    st.combatLoadout.food = [{ itemId: id, triggerMissingHp: Math.round(currentCombatant(st, pack, new Date(T0)).hp * 0.5) }];
  }
  if (s.mp) {
    st.inventory.potion_mp_t2 = 10_000;
    st.combatLoadout.mp = [{ itemId: "potion_mp_t2", triggerMissingMp: 20 }];
  }
  return st;
}

/** 真实结算连打 forMs：返回胜负场数。 */
function realFarm(st: any, monsterId: string, forMs: number) {
  st.hpCombat = startHpCombat(st, pack, monsterId, new Date(T0));
  const before = st.stats.killsByMonster[monsterId] || 0;
  const end = T0 + forMs;
  let at = T0;
  while (at < end && st.combatLoadout.autoRepeat) {
    const next = tickHpCombat(st, pack, new Date(end), end - at, () => 0.99);
    if (next <= at) break;
    at = next;
  }
  return { wins: (st.stats.killsByMonster[monsterId] || 0) - before, losses: st.stats.totalDeaths || 0, stopped: !st.combatLoadout.autoRepeat };
}

function farm(st: any, monsterId: string, tier: number, forMs: number) {
  const slots = { food: 1, drink: 3 };
  const setup = farmSetup(st, P.items, P.equipmentSets, slots, T0);
  const abilities = previewAbilities(st.abilityLoadout, st.abilities, abilityCatalog() as any, abilitySlotCount(st));
  const enc = stages.flatMap((s) => s.encounters).find((e) => e.id === monsterId)!;
  return previewFarm(setup.sheet, tierMonster(enc, tier) as any, abilities, { ...setup, tier, forMs });
}

describe("区域难度：前后端同一套公式", () => {
  it("两份文件逐字相同，连打预览的规则与服务端一致", () => {
    assert.equal(read("../frontend/src/gameplay/zoneTiers.ts"), read("../backend/src/zone_tiers.ts"));
    assert.equal(frontTiers.ZONE_TIER_COUNT, 3);
    assert.deepEqual(
      [FARM_RULES.restMs, ZONE_TIER_RULES.respawnMs[0], FARM_RULES.maxLossStreak, FARM_RULES.foodCooldownMs, FARM_RULES.mpCooldownMs],
      [AUTO_REPEAT_INTERMISSION_MS, RESPAWN_MS, AUTO_REPEAT_MAX_CONSECUTIVE_DEATHS, FOOD_COOLDOWN_MS, MP_POTION_COOLDOWN_MS],
    );
  });

  it("11 个区域 × 三档：连打预览与真实结算的胜场、败场、停手完全一致", () => {
    for (const zone of OPEN_ZONE_IDS) {
      const boss = bossOf(zone);
      const ids = P.stages.find((s: any) => s.id === zone).monsters.filter((id: string) => id !== boss);
      const bossLevel = monsterOf(boss).level;
      const chain = CHAINS[zone] ?? derivedChain(bossLevel);
      const setups: Setup[] = [
        { level: bossLevel, chain },
        { level: bossLevel, chain, food: true, mp: true, abilities: ["heavy_chop", "smash", "brace"] },
        { level: bossLevel + 8, chain, food: true, extra: { chapter4Build: "feast_vitality", activeClassId: "chef" } },
        { level: Math.max(1, bossLevel - 8), chain: [] },
      ];
      for (const [i, s] of setups.entries()) {
        for (const tier of [0, 1, 2]) {
          for (const id of [ids[i % ids.length], ids.at(-1)!]) {
            const st = player(zone, tier, s);
            const preview = farm(st, id, tier, 10 * 60_000);
            const real = realFarm(st, id, 10 * 60_000);
            assert.deepEqual([preview.wins, preview.losses, preview.stopped], [real.wins, real.losses, real.stopped], `${zone} ${id} 档${tier} 配置${i}`);
          }
        }
      }
    }
  });

  it("每小时收益的个人倍率来自服务端，同一场结算拿到的就是预览里写的", () => {
    const st = player("forest", 2, { level: 30, chain: CHAINS.forest, extra: { prestige: { count: 1, points: 12, spentPoints: 0, astrolabe: {} }, house: { rooms: { training: 4 } } } });
    const gains = combatGains(st, P, new Date(T0));
    assert.ok(gains.xp > 1 && gains.gold > 1, JSON.stringify(gains));
    const real = { ...P, actions: pack.actions } as EnhancedContentPack;
    st.combatLoadout.autoRepeat = false;
    st.hpCombat = startHpCombat(st, real, "slime", new Date(T0));
    tickHpCombat(st, real, new Date(T0 + 60_000), 60_000, () => 0.99);
    const won = st.hpCombat;
    const m = tierMonster(monsterOf("slime"), 2);
    assert.ok(Math.abs(won.xpTotal - Math.round(m.xp * gains.xp * 10) / 10) <= 0.1, `${won.xpTotal} ${m.xp} ${gains.xp}`);
    assert.equal(won.goldGained, Math.round(m.gold * gains.gold));
    assert.equal(farmLine({ wins: 0, losses: 3, winPct: 0, xpPerHour: 0, goldPerHour: 0, stopped: true }), "打不过");
    assert.equal(farmLine({ wins: 9, losses: 1, winPct: 90, xpPerHour: 12345, goldPerHour: 678, stopped: false }), "胜率 90% · 12,345 经验/时 · 678 金/时");
  });
});

/**
 * 平衡目标（docs/design/COMBAT_SECONDARY.md「区域难度档位」）。同一角色打同一只怪：
 * - 打得过（连打一小时一次没输）的最高档，每小时经验比普通档高 15%～35%；
 * - 打不过（胜率不到 75%）的档，不比普通档多；任何情况都不超过 +35%。
 * 一场只打几下、一下 3 秒，生命多 1% 刚好多打一下的角色会落在区间外，所以按比例卡：落在区间内的不少于 90%。
 */
describe("区域难度：平衡目标", () => {
  const rows: string[] = [];
  for (const zone of OPEN_ZONE_IDS) {
    it(`${zone}`, () => {
      const boss = bossOf(zone);
      const ids = P.stages.find((s: any) => s.id === zone).monsters.filter((id: string) => id !== boss);
      const bossLevel = monsterOf(boss).level;
      const own = CHAINS[zone] ?? derivedChain(bossLevel);
      let hit = 0;
      let total = 0;
      const gains: number[] = [];
      for (const s of [
        { level: bossLevel - 4, chain: own }, { level: bossLevel, chain: own }, { level: bossLevel, chain: own, food: true },
        { level: bossLevel + 4, chain: own, food: true }, { level: bossLevel + 8, chain: own, food: true }, { level: bossLevel + 20, chain: derivedChain(bossLevel + 20) },
        { level: bossLevel + 20, chain: derivedChain(bossLevel + 20), food: true }, { level: Math.max(1, bossLevel - 8), chain: [] }, { level: bossLevel, chain: [], food: true },
      ] as Setup[]) {
        for (const id of ids) {
          const runs = [0, 1, 2].map((tier) => {
            const st = player(zone, tier, s);
            const p = farm(st, id, tier, FARM_RULES.hourMs);
            return { ...p, xph: p.wins * tierMonster(monsterOf(id), tier).xp };
          });
          if (runs[0].wins === 0) {
            // 普通都打不过的怪，更高档也打不过
            for (const t of [1, 2]) assert.ok(runs[t].xph <= runs[0].xph || runs[t].wins === 0, `${zone} ${id} Lv${s.level}`);
            continue;
          }
          for (const t of [1, 2]) {
            const gain = runs[t].xph / runs[0].xph - 1;
            assert.ok(gain <= 0.355, `${zone} ${id} Lv${s.level} 档${t}：+${(gain * 100).toFixed(0)}%`);
            if (runs[t].winPct < 75) assert.ok(gain <= 0, `${zone} ${id} Lv${s.level} 档${t} 胜率 ${runs[t].winPct}% 却 +${(gain * 100).toFixed(0)}%`);
          }
          const top = [2, 1].find((t) => runs[t].losses === 0);
          if (!top) continue;
          const gain = runs[top].xph / runs[0].xph - 1;
          total += 1;
          gains.push(gain);
          if (gain >= 0.145) hit += 1;
          else if (process.env.BALANCE_DEBUG) console.log(`  区间外 ${zone} ${id} Lv${s.level}${s.food ? " 药" : ""} 档${top} +${(gain * 100).toFixed(0)}%（胜率 ${runs[top].winPct}% / 普通 ${runs[0].winPct}%）`);
        }
      }
      gains.sort((a, b) => a - b);
      const row = `| ${zone} | ${hit}/${total} | ${(gains[0] * 100).toFixed(0)}% | ${(gains[Math.floor(gains.length / 2)] * 100).toFixed(0)}% | ${(gains.at(-1)! * 100).toFixed(0)}% |`;
      rows.push(row);
      if (process.env.BALANCE_DEBUG) console.log(row);
      assert.ok(total >= 10, `${zone} 样本太少`);
      assert.ok(hit / total >= 0.9, row);
    });
  }
});
