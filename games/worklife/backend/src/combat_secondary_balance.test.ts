import assert from "node:assert/strict";
import { describe, it } from "node:test";
import packJson from "../../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack } from "./types";
import { SECONDARY_KEYS } from "./combat_secondary";
import { defaultCombatSkills } from "./combat_skills";
import { startHpCombat, tickHpCombat } from "./hp_combat";
import { createMemoryStorage } from "./storage_memory";
import { OPEN_ZONE_IDS } from "./zones";
import { CHAINS, derivedChain, type Chain } from "./zone_chains_fixture";

/**
 * 加上命中 / 闪避 / 抗性之后，老存档（不换装备）的打怪速度和胜率不能变。
 * 同一批角色在真实战斗引擎里各打一遍「有次级属性」与「抹掉次级属性」的内容包；
 * 抹掉之后每一步都退回旧公式（落空率 0、抗性倍率 1），所以这就是新旧对比。
 */
const P = packJson as any;
const T0 = new Date("2026-09-03T00:00:00.000Z").getTime();
const HOUR_MS = 3_600_000;
const SAMPLE_MS = 1_200_000; // 打 20 分钟，结果换算成每小时
const FOOD = "food_cosmos_banquet";

/** 只留测试用得到的条目，引擎每一步都要按 id 找装备，几百件会慢十倍。 */
const GEAR_TYPES = ["weapon", "armor", "offhand", "accessory"];
const items = P.items.filter((i: any) => GEAR_TYPES.includes(i.type) || i.id === FOOD);
const strip = (row: any) => {
  const copy = { ...row };
  for (const key of [...SECONDARY_KEYS, "damageType"]) delete copy[key];
  return copy;
};
// 击杀不给经验，免得两边升级进度不同把差异放大
const noXp = (m: any) => ({ ...m, xp: 0 });
const NEW_PACK = { ...P, items, actions: [], monsters: P.monsters.map(noXp) } as EnhancedContentPack;
const OLD_PACK = { ...NEW_PACK, monsters: (NEW_PACK.monsters as any[]).map(strip), items: items.map(strip) } as EnhancedContentPack;

type Style = "melee" | "ranged" | "magic";
const STYLES: Style[] = ["melee", "ranged", "magic"];
const WEAPON_RE: Record<Style, RegExp> = { melee: /.^/, ranged: /(^|_)bow(_|$)/, magic: /(^|_)(staff|scepter)(_|$)/ };

/** 该等级能用上的最好武器：物品阶数 × 12 级一阶。 */
function bestWeapon(style: Style, level: number): string | undefined {
  const usable = P.items.filter((i: any) => WEAPON_RE[style].test(i.id) && i.type === "weapon" && 1 + (Number(i.tier) - 1) * 12 <= Math.max(level, 13));
  usable.sort((a: any, b: any) => Number(b.atk || 0) + Number(b.mag || 0) - Number(a.atk || 0) - Number(a.mag || 0));
  return usable[0]?.id;
}

function gearFor(zone: string, level: number, style: Style): Chain {
  const chain = CHAINS[zone] ?? derivedChain(level);
  if (style === "melee") return chain;
  const weapon = bestWeapon(style, level);
  return weapon ? [...chain.filter(([slot]) => slot !== "main_hand"), ["main_hand", weapon]] : chain;
}

let counter = 0;
const storage = createMemoryStorage();
async function makePlayer(chain: Chain, level: number, withFood: boolean) {
  const user = await storage.findOrCreateGuestUser(`sec-balance-${counter++}`);
  const state = (await storage.getOrCreatePlayerState(user.id, P.version)) as any;
  state.combatLevel = undefined;
  state.combatSkills = defaultCombatSkills(level);
  for (const [slot, id] of chain) {
    state.equipment[slot] = id;
    state.inventory[id] = 1;
  }
  if (withFood) {
    state.inventory[FOOD] = 100_000;
    state.combatLoadout = { food: [{ itemId: FOOD, triggerMissingHp: 40 + level * 4 }], drink: [], autoRepeat: true };
  }
  return state;
}

/** 连续战斗（吃饱），返回每小时击杀数。 */
async function killsPerHour(pack: EnhancedContentPack, chain: Chain, level: number, monsterId: string): Promise<number> {
  const state = await makePlayer(chain, level, true);
  state.hpCombat = startHpCombat(state, pack, monsterId, new Date(T0));
  let done = T0;
  while (done < T0 + SAMPLE_MS) {
    const next = Math.min(T0 + SAMPLE_MS, done + 120_000);
    const reached = tickHpCombat(state, pack, new Date(next), next - done, () => 0.99);
    if (reached <= done && state.hpCombat?.outcome && !state.hpCombat.nextFightAt) break;
    done = next;
  }
  return (Number(state.hpCombat?.runStats?.kills || 0) * HOUR_MS) / SAMPLE_MS;
}

/** 不吃东西单打一场。 */
async function wins(pack: EnhancedContentPack, chain: Chain, level: number, monsterId: string): Promise<boolean> {
  const state = await makePlayer(chain, level, false);
  state.hpCombat = startHpCombat(state, pack, monsterId, new Date(T0));
  for (let ms = 30_000; ms <= 1_200_000 && !state.hpCombat.outcome; ms += 30_000) {
    tickHpCombat(state, pack, new Date(T0 + ms), 30_000, () => 0.99);
  }
  return state.hpCombat.outcome === "win";
}

describe("次级属性不改变老存档的打怪速度与胜率（11 个区域）", () => {
  for (const zone of OPEN_ZONE_IDS) {
    it(`${zone}：每小时击杀与胜率都在 ±5% 以内`, async () => {
      const stage = P.stages.find((s: any) => s.id === zone);
      const monsters = stage.monsters.map((id: string) => P.monsters.find((m: any) => m.id === id));
      const kills: Record<Style, [number, number]> = { melee: [0, 0], ranged: [0, 0], magic: [0, 0] };
      let oldWins = 0;
      let newWins = 0;
      let fights = 0;
      const rows: string[] = [];
      for (const style of STYLES) {
        for (const m of monsters) {
          const level = Number(m.level);
          const chain = gearFor(zone, level, style);
          const before = await killsPerHour(OLD_PACK, chain, level, m.id);
          const after = await killsPerHour(NEW_PACK, chain, level, m.id);
          kills[style][0] += before;
          kills[style][1] += after;
          rows.push(`${style} ${m.id} ${before}→${after}`);
          for (const offset of [0, 6]) {
            const c = gearFor(zone, level + offset, style);
            oldWins += (await wins(OLD_PACK, c, level + offset, m.id)) ? 1 : 0;
            newWins += (await wins(NEW_PACK, c, level + offset, m.id)) ? 1 : 0;
            fights += 1;
          }
        }
      }
      if (process.env.BALANCE_DEBUG) {
        console.log(zone, JSON.stringify(kills), `wins ${oldWins}→${newWins}/${fights}`);
        if (process.env.BALANCE_DEBUG === "2") console.log(rows.join("\n"));
      }
      for (const style of STYLES) {
        const [before, after] = kills[style];
        assert.ok(before > 20, `${zone} ${style}: 样本太少（${before}）`);
        const ratio = after / before;
        assert.ok(ratio >= 0.95 && ratio <= 1.05, `${zone} ${style}: 每小时击杀 ${before} → ${after}（${(ratio * 100).toFixed(1)}%）`);
      }
      const delta = (newWins - oldWins) / fights;
      assert.ok(Math.abs(delta) <= 0.05, `${zone}: 胜场 ${oldWins} → ${newWins}（共 ${fights}）`);
    });
  }
});
