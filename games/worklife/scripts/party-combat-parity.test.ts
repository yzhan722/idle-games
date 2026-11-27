import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import packJson from "../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack } from "../backend/src/types";
import { ABILITY_BY_ID, abilityCatalog, abilityMasteryTier } from "../backend/src/abilities";
import { defaultCombatSkills } from "../backend/src/combat_skills";
import { currentCombatant } from "../backend/src/hp_combat";
import { buildSquad, expectedWaveMs, minWaveMs, partyStageLevel, partyWave, squadSelf } from "../backend/src/party_combat";
import { PARTY_JUDGE, judgeWaveClear, partyDungeonFor, partyRequiredLevel, partySelf, partySkills, settlePartyWave } from "../backend/src/party_run";
import { CHAINS, derivedChain, type Chain } from "../backend/src/zone_chains_fixture";
import { OPEN_ZONE_IDS } from "../backend/src/zones";
import { abilitySlotCount, combatSheetFromPack } from "../frontend/src/gameplay/combatSheet";
import { abilityEffectiveCooldownMs, previewAbilities } from "../frontend/src/gameplay/fightPreview";
import { claimPartyWave, serverWave } from "../frontend/src/gameplay/partyRaidData";
import { simulateRun, type SimSkill } from "./party-sim";

const P = packJson as any;
// 结算给的经验会让角色中途升级，模拟对比时抹成 0
const pack = { ...P, monsters: P.monsters.map((m: any) => ({ ...m, xp: 0 })) } as EnhancedContentPack;
const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8").replace(/\r\n/g, "\n");

type Style = "melee" | "ranged" | "magic";
const STYLES: Style[] = ["melee", "ranged", "magic"];
const WEAPON_RE: Record<Style, RegExp> = { melee: /.^/, ranged: /(^|_)bow(_|$)/, magic: /(^|_)(staff|scepter)(_|$)/ };

function gearFor(zone: string, level: number, style: Style): Chain {
  const chain = CHAINS[zone] ?? derivedChain(level);
  if (style === "melee") return chain;
  const usable = P.items.filter((i: any) => WEAPON_RE[style].test(i.id) && i.type === "weapon" && 1 + (Number(i.tier) - 1) * 12 <= Math.max(level, 13));
  usable.sort((a: any, b: any) => Number(b.atk || 0) + Number(b.mag || 0) - Number(a.atk || 0) - Number(a.mag || 0));
  return usable[0] ? [...chain.filter(([slot]) => slot !== "main_hand"), ["main_hand", usable[0].id]] : chain;
}

/** 各区域常见的出战技能。 */
const SKILLS: Record<string, string[]> = {
  forest: ["heavy_chop"],
  mine: ["heavy_chop", "cleave"],
  swamp: ["heavy_chop", "cleave", "venom_fang"],
  snow: ["heavy_chop", "cleave", "glacial_snipe", "group_heal"],
};
const LATE_SKILLS = ["heavy_chop", "flame_burst", "holy_judgment", "war_aura"];

function player(level: number, chain: Chain, skillIds: string[], extra: Record<string, unknown> = {}) {
  const st: any = {
    inventory: {}, equipment: { enhancementLevels: {}, durability: {} }, skills: {}, logs: [], combatLevel: level, combatSkills: defaultCombatSkills(level),
    stats: { totalKills: 0, totalActions: 0, totalBossKills: 0, totalGoldEarned: 0, totalXpEarned: 0, killsByMonster: {}, highestCombatLevel: level },
    abilities: {}, abilityLoadout: [], activeBuffs: [], settings: {}, ...extra,
  };
  for (const [slot, id] of chain) {
    st.equipment[slot] = id;
    st.inventory[id] = 1;
  }
  for (const id of skillIds) {
    st.abilities[id] = { level: Math.max(1, Math.floor(level / 10)), xp: 0 };
    st.abilityLoadout.push({ abilityId: id, trigger: ABILITY_BY_ID[id].defaultTrigger });
  }
  return st;
}

function simSkills(st: any): SimSkill[] {
  return st.abilityLoadout.slice(0, abilitySlotCount(st)).map((s: any) => ({ def: ABILITY_BY_ID[s.abilityId], level: st.abilities[s.abilityId].level, trigger: s.trigger }));
}

describe("组队副本：前后端同一套公式", () => {
  it("两份同源文件除引用那一行外逐字相同", () => {
    const backend = read("../backend/src/party_combat.ts").replace('from "./combat_secondary"', 'from "./combatSecondary"');
    assert.equal(read("../frontend/src/gameplay/partyCombat.ts"), backend);
  });

  it("界面上的自己 = 服务端裁判用的自己（装备、强化、流派、增益）", () => {
    const now = new Date();
    const buffs = ["potion_battle_fury", "potion_iron_skin", "tea_spirit", "drink_fine"].map((id) => {
      const b = P.items.find((i: any) => i.id === id).effect.buff;
      return { id: b.id, name: b.name, sourceItemId: id, expiresAt: new Date(now.getTime() + 3_600_000).toISOString(), stats: b.stats, multipliers: b.multipliers };
    });
    const cases: any[] = [
      player(1, [], []),
      player(24, CHAINS.swamp, ["heavy_chop"]),
      player(60, CHAINS.volcano, LATE_SKILLS, { chapter1Build: "sharpened_edge", chapter2Build: "heavy_sunder", chapter3Build: "gale_flurry", chapter4Build: "elixir_frenzy", activeBuffs: buffs }),
      player(100, derivedChain(100), LATE_SKILLS, { chapter4Build: "feast_vitality" }),
      player(150, derivedChain(150), LATE_SKILLS, { activeBuffs: buffs }),
    ];
    cases[3].equipment.enhancementLevels[cases[3].equipment.main_hand] = 12;
    for (const st of cases) {
      const server = partySelf(st, pack, now);
      const client = squadSelf(combatSheetFromPack(st, P.items, P.equipmentSets), st.combatLevel);
      for (const key of ["level", "atk", "def", "intervalMs", "critRatePct", "critDmgPct", "evasionPct", "accuracy", "evasion", "physResist", "elemResist", "damageType"] as const) {
        assert.equal(client[key], server[key], `Lv${st.combatLevel} ${key}`);
      }
    }
  });

  it("出战技能的冷却、等级倍率两边一致", () => {
    const st = player(100, derivedChain(100), LATE_SKILLS);
    for (const id of LATE_SKILLS) st.abilities[id].level = 37;
    const server = partySkills(st);
    const client = previewAbilities(st.abilityLoadout, st.abilities, abilityCatalog() as any, abilitySlotCount(st));
    assert.equal(server.length, client.length);
    server.forEach((s, i) => {
      assert.equal(s.cooldownMs, abilityEffectiveCooldownMs(client[i].def, client[i].level));
      assert.equal(s.levelMult, 1 + (client[i].level - 1) * client[i].def.levelStep);
    });
    assert.ok(abilityMasteryTier(37).cdReductionPct > 0);
  });

  it("副本卡片上的等级要求 = 服务端的等级门槛", () => {
    const need = (id: string) => Number(P.actions.find((a: any) => a.id === `act_combat_${id}`)?.requirements?.skillLevel || 1);
    for (const stage of P.stages) assert.equal(partyStageLevel(stage.monsters, need), partyRequiredLevel(P, stage.id), stage.id);
  });

  it("客户端：服务端说还早就等够再报同一波；断网重报；其他拒绝原样抛出；重连后的波次以服务端为准", async () => {
    const waits: number[] = [];
    const wait = async (ms: number) => { waits.push(ms); };
    const fail = (props: Record<string, unknown>) => Object.assign(new Error("x"), props);
    let calls = 0;
    const got = await claimPartyWave(async () => {
      calls += 1;
      if (calls === 1) throw fail({ status: 409, code: "party_wave_early", details: { retryAfterMs: 1234 } });
      if (calls === 2) throw new TypeError("Failed to fetch");
      return "ok";
    }, wait);
    assert.deepEqual([got, calls, waits[0]], ["ok", 3, 1334]);
    await assert.rejects(() => claimPartyWave(async () => { throw fail({ status: 409, code: "party_wave_order", details: { expectedWave: 3 } }); }, wait), /x/);
    let tries = 0;
    await assert.rejects(() => claimPartyWave(async () => { tries += 1; throw fail({ status: 502 }); }, wait, 4));
    assert.equal(tries, 4);
    const run = { partyId: "p", startedAt: "s", nextWave: 23 };
    assert.deepEqual([serverWave(run, "p", "s"), serverWave(run, "p", "other"), serverWave(undefined, "p", "s")], [23, 1, 1]);
  });
});

describe("组队副本：次级属性折进期望伤害后的新旧对比（11 个区域 × 三套武器 × 1 / 3 / 6 人）", () => {
  const SEEDS = [1, 2, 3, 4, 5, 6];
  for (const zone of OPEN_ZONE_IDS) {
    it(`${zone}：清波用时与全队受伤在 ±5% 以内，真打的人一次都不会被拒`, () => {
      const dungeon = partyDungeonFor(pack, zone)!;
      const level = dungeon.boss.level;
      const total = { before: 0, after: 0, hurtBefore: 0, hurtAfter: 0 };
      let closest = Infinity;
      let real = 0;
      let expected = 0;
      for (const style of STYLES) {
        for (const size of [1, 3, 6]) {
          const st = player(level, gearFor(zone, level, style), SKILLS[zone] ?? LATE_SKILLS);
          const squad = buildSquad(partySelf(st, pack, new Date()), Array(size - 1).fill(level));
          const skills = simSkills(st);
          const maxMp = currentCombatant(st, pack, new Date()).mp || 50;
          for (const seed of SEEDS) {
            const before = simulateRun({ squad, skills, maxMp, dungeon, seed, secondary: false }, 10);
            const after = simulateRun({ squad, skills, maxMp, dungeon, seed, secondary: true }, 10);
            const n = Math.min(before.filter((r) => r.cleared).length, after.filter((r) => r.cleared).length);
            for (let i = 0; i < n; i++) {
              total.before += before[i].ms;
              total.after += after[i].ms;
              total.hurtBefore += before[i].damageTaken;
              total.hurtAfter += after[i].damageTaken;
            }
            if (seed > 2) continue;
            // 同一批演出用真实裁判走一遍：一次都不能被判「太早」
            const run = structuredClone(st);
            const ctx = { partyId: "sim", startedAt: new Date(1_000_000).toISOString(), stageId: zone, mateLevels: Array(size - 1).fill(level) as number[] };
            let now = 1_000_000;
            for (const r of after) {
              if (!r.cleared) break;
              now += r.ms;
              const verdict = judgeWaveClear(run, pack, ctx, r.wave, new Date(now));
              assert.equal(verdict.kind, "ok", `${zone} ${style} ${size} 人 第 ${r.wave} 波 用时 ${r.ms}：${JSON.stringify(verdict)}`);
              const enemies = partyWave(dungeon, r.wave, size);
              closest = Math.min(closest, r.ms / Math.max(1, minWaveMs(enemies, squad, partySkills(st))));
              expected += expectedWaveMs(enemies, squad, partySkills(st));
              real += r.ms;
              settlePartyWave(run, pack, ctx, r.wave, r.casts, new Date(now), () => 0.99);
              now += 650;
            }
          }
        }
      }
      const speed = total.after / total.before;
      const hurt = total.hurtAfter / total.hurtBefore;
      if (process.env.BALANCE_DEBUG) {
        console.log(`| ${zone} | ${(total.before / 1000).toFixed(0)} → ${(total.after / 1000).toFixed(0)} 秒（${((speed - 1) * 100).toFixed(1)}%） | ${((hurt - 1) * 100).toFixed(1)}% | ${closest.toFixed(2)} | ${(real / expected).toFixed(2)} |`);
      }
      assert.ok(speed >= 0.95 && speed <= 1.05, `${zone} 清波用时 ${(speed * 100).toFixed(1)}%`);
      assert.ok(hurt >= 0.95 && hurt <= 1.05, `${zone} 全队受伤 ${(hurt * 100).toFixed(1)}%`);
      assert.ok(closest > 1, `${zone} 有一波比「最短可能时间」还快：${closest}`);
      assert.ok(real / expected > 1 && real / expected < 1.6, `${zone} 期望用时偏离演出：${real / expected}`);
      assert.ok(real / expected > PARTY_JUDGE.paceFloor * 1.5, "长期速度下限离真打要有足够余地");
    });
  }
});
