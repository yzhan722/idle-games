import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import packJson from "../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack } from "../backend/src/types";
import { defaultCombatSkills } from "../backend/src/combat_skills";
import { combatGains, startHpCombat, tickHpCombat } from "../backend/src/hp_combat";
import { defaultEnhancedPlayerState, simulateToNow } from "../backend/src/storage";
import { startDungeon } from "../backend/src/dungeon";
import { CHAINS } from "../backend/src/zone_chains_fixture";
import { OPEN_ZONE_IDS } from "../backend/src/zones";
import { ZONE_TIER_RULES } from "../backend/src/zone_tiers";
import { enhancementSuccessBreakdown } from "../backend/src/enhancement_math";
import * as backDungeon from "../backend/src/dungeon_rules";
import * as backEssence from "../backend/src/zone_essence";
import * as frontDungeon from "../frontend/src/gameplay/dungeonRules";
import * as frontEssence from "../frontend/src/gameplay/zoneEssence";
import { enhancementSuccessRate } from "../frontend/src/gameplay/enhancement";
import { ITEM_ART_ALIAS, t1KeyFor } from "../frontend/src/assets/t1/runtime";

const P = packJson as any;
const pack = { ...P, actions: P.actions.map((a: any) => (String(a.id).startsWith("act_combat_") ? { ...a, requirements: {} } : a)) } as EnhancedContentPack;
const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const T0 = Date.parse("2026-09-03T00:00:00.000Z");
const items = new Map((P.items as any[]).map((i) => [i.id, i]));
const monsters = new Map((P.monsters as any[]).map((m) => [m.id, m]));

describe("地下城与区域精华：前后端同源", () => {
  it("两份规则文件逐字相同，导出一致", () => {
    assert.equal(read("../frontend/src/gameplay/dungeonRules.ts"), read("../backend/src/dungeon_rules.ts"));
    assert.equal(read("../frontend/src/gameplay/zoneEssence.ts"), read("../backend/src/zone_essence.ts"));
    assert.deepEqual(frontDungeon.DUNGEON_RULES, backDungeon.DUNGEON_RULES);
    assert.deepEqual(frontEssence.ESSENCE_RULES, backEssence.ESSENCE_RULES);
    for (const z of OPEN_ZONE_IDS) {
      const ms = P.stages.find((s: any) => s.id === z).monsters.map((id: string) => monsters.get(id));
      assert.deepEqual(frontDungeon.dungeonWaves(ms), backDungeon.dungeonWaves(ms), z);
    }
  });

  it("11 种精华都有图：自己的图，或暂借一张已有的材料图（待补图）", () => {
    for (const z of OPEN_ZONE_IDS) {
      const id = backEssence.ZONE_ESSENCE[z];
      const key = t1KeyFor("item", id)!;
      assert.ok(existsSync(new URL(`../frontend/src/assets/t1/${key}.webp`, import.meta.url)), `${id} → ${key}`);
      if (ITEM_ART_ALIAS[id]) assert.ok(!existsSync(new URL(`../frontend/src/assets/t1/materials/${id}.webp`, import.meta.url)), `${id} 有图了，删掉借图`);
    }
  });

  it("强化面板加精华后的成功率 = 服务端那一次尝试用的成功率", () => {
    for (const [target, skill, itemLv, tool] of [[1, 1, 1, 0], [5, 20, 13, 0.008], [10, 61, 61, 0.012], [15, 111, 61, 0]] as const) {
      const server = enhancementSuccessBreakdown(target, skill, itemLv, tool + backEssence.ESSENCE_RULES.enhanceBonus).finalRate;
      assert.equal(enhancementSuccessRate(target, skill, itemLv, tool + frontEssence.ESSENCE_RULES.enhanceBonus), server);
    }
  });
});

/** 每只怪一次击杀的物品期望价值（稀有掉落、掉落表、区域精华；都乘档位掉率与稀有发现）。 */
function itemValuePerKill(id: string, tier: number, rf: number, zone: string): number {
  const m = monsters.get(id);
  const drop = 1 + ZONE_TIER_RULES.drop[tier];
  const valueOf = (ref: string) => Number((items.get(ref) || [...items.values()].find((i: any) => i.name === ref))?.value || 0);
  let v = m.rare ? Math.min(1, Number(m.rareChance || 0) * drop * rf) * valueOf(m.rare) : 0;
  for (const d of m.drops || []) v += Math.min(1, Number(d.chance || 0) * drop * rf) * valueOf(d.itemId) * (d.qty || 1);
  const ess = backEssence.ZONE_ESSENCE[zone];
  const isBoss = Boolean(m.isBoss) || id.endsWith("_boss");
  return v + Math.min(1, backEssence.essenceBaseChance(isBoss) * drop * rf) * valueOf(ess);
}

function hero(zone: string) {
  const boss = P.stages.find((s: any) => s.id === zone).monsters.find((id: string) => id.endsWith("_boss"));
  const L = Math.min(200, monsters.get(boss).level + 15);
  const st: any = defaultEnhancedPlayerState(P.version || "1.0.0");
  st.combatSkills = defaultCombatSkills(L);
  st.combatLevel = L;
  for (const [slot, id] of CHAINS[zone]) {
    st.equipment[slot] = id;
    st.inventory[id] = 1;
  }
  st.lastSimulatedAt = new Date(T0).toISOString();
  st.stats.killsByMonster = { [boss]: 1 };
  return st;
}

describe("地下城：每小时收益不高于同档连战的 1.25 倍", () => {
  it("11 个区域：能通关的，经验 / 金币 + 物品期望价值每小时都在同样几只怪轮流连打的 1.25 倍以内", () => {
    const rows: string[] = [];
    let worst = 0;
    for (const zone of OPEN_ZONE_IDS) {
      if (!CHAINS[zone]) continue;
      // 地下城：在线每秒结算一次，直到结束
      let st = hero(zone);
      const started = startDungeon(st, pack, zone, 0, new Date(T0));
      if (!started.ok) {
        rows.push(`${zone}: 开不了（${started.error}）`);
        continue;
      }
      st.hpCombat = startHpCombat(st, pack, started.monsterId, new Date(T0), { tier: 0, runStats: { startedAt: T0, kills: 0, xp: 0, gold: 0, loot: {} } });
      st.mode = "combat";
      let at = T0;
      while (!st.dungeonRun.outcome && at < T0 + 3_600_000) {
        at += 1000;
        st = simulateToNow({ state: st, now: new Date(at), contentPack: pack, rng: () => 0.99 }).state;
      }
      if (st.dungeonRun.outcome !== "clear") {
        rows.push(`${zone}: 没通关（${st.dungeonRun.outcome}），不比`);
        continue;
      }
      const rf = combatGains(st, pack, new Date(T0)).rareSolo;
      const waves: string[] = st.dungeonRun.waves;
      const hours = (st.dungeonRun.endedAt - T0) / 3_600_000;
      const pool = backDungeon.dungeonClearPool(waves.map((id) => monsters.get(id)));
      const total = pool.reduce((s, p) => s + p.weight, 0);
      const rewardValue = pool.reduce((s, p) => s + (p.weight / total) * Number((items.get(p.rare) || [...items.values()].find((i: any) => i.name === p.rare))?.value || 0), 0);
      const dXp = st.dungeonRun.result.xp / hours;
      const dVal = (st.dungeonRun.result.gold + waves.reduce((s, id) => s + itemValuePerKill(id, 0, rf, zone), 0) + rewardValue) / hours;
      // 同档连战：每只怪各连打 10 分钟（开连续战斗），按「每只打一只」轮流折算
      let tSum = 0;
      let xSum = 0;
      let vSum = 0;
      for (const id of waves) {
        const f = hero(zone);
        f.combatLoadout = { food: [], drink: [], autoRepeat: true };
        f.hpCombat = startHpCombat(f, pack, id, new Date(T0));
        let t = T0;
        while (t < T0 + 600_000) t = tickHpCombat(f, pack, new Date(t + 5000), 5000, () => 0.99);
        const kills = f.hpCombat.runStats.kills;
        assert.ok(kills > 0, `${zone}/${id}`);
        tSum += 600 / kills;
        xSum += f.hpCombat.runStats.xp / kills;
        vSum += f.hpCombat.runStats.gold / kills + itemValuePerKill(id, 0, rf, zone);
      }
      const fXp = xSum / (tSum / 3600);
      const fVal = vSum / (tSum / 3600);
      rows.push(`${zone}: 经验 ×${(dXp / fXp).toFixed(3)}，价值 ×${(dVal / fVal).toFixed(3)}，一趟 ${Math.round(hours * 3600)} 秒`);
      worst = Math.max(worst, dXp / fXp, dVal / fVal);
    }
    console.log(rows.join("\n"));
    assert.ok(worst <= 1.25, rows.join("；"));
  });
});
