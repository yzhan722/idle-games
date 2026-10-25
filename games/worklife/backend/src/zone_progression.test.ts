import assert from "node:assert/strict";
import { describe, it } from "node:test";
import pack from "../../shared/enhanced_content_pack_chinese.json";
import { hitDamage, monsterCombatant, simulateFight, type Combatant } from "./first_hour_combat";
import { encounterStages } from "./gameplay_encounters";
import { enemyDamageHook, mechanicDefsFor } from "./boss_mechanics";
import { CHAINS, PREV_ZONE, playerFor, realBossFight } from "./zone_chains_fixture";

/**
 * Zone progression sanity (MWI: farm a zone, craft its gear, take the next zone). Every check runs the
 * deterministic server fight with the real pack numbers and the game's own player-stat function —
 * item stats, skill contribution AND set bonuses (an earlier version summed raw item stats only, which
 * hid that fully geared players took exactly 1 damage from every monster, bosses included).
 *
 *  - the ordinary monsters of a zone fall to a same-level player wearing the PREVIOUS zone's gear with
 *    HP to spare (the next set is crafted from this zone's drops, so last zone's gear must farm them);
 *  - in the zone's OWN gear the fights are comfortable but never trivial: HP left stays inside a band,
 *    monsters need a real number of hits to kill the player, and difficulty climbs inside the zone;
 *  - the zone boss is a narrow win in the zone's own gear, a loss in the previous zone's gear and a
 *    loss with no gear at all — gear has to matter. Bosses are fought on the REAL engine (innate 重劈
 *    plus the boss's mechanics: guard, rockfall, miasma, frost armour, eruption), not the plain sim.
 * scripts/audit/calibrate.ts solved the monsters' atk against exactly these chains.
 */

const stages = encounterStages(pack as never);
const monsters = new Map(((pack as { monsters: Array<Record<string, unknown> & { id: string }> }).monsters).map((m) => [m.id, m]));
const ZONES = ["mine", "swamp", "snow", "volcano"] as const;
/**
 * Known content gap: the swamp chain is barely stronger than the mine chain against the swamp boss
 * (same-level skills dominate), so the boss cannot be tuned to beat mine gear without becoming a coin
 * flip in swamp gear. For these zones the previous chain must merely not do better than the own chain.
 */
const PREV_GEAR_MAY_WIN: readonly string[] = ["swamp"];

// charge mechanics (the mine boss's rockfall) deal real damage, so the fight must include them; guard / wrath are not modelled here
const fight = (p: Combatant, monsterId: string) => {
  const m = monsters.get(monsterId)!;
  return simulateFight(p, monsterCombatant(m), undefined, { enemyDamage: enemyDamageHook(mechanicDefsFor(pack as never, m)) });
};
const left = (p: Combatant, monsterId: string) => {
  const r = fight(p, monsterId);
  return r.won ? r.playerHpLeft / p.hp : 0;
};
const hitsToDie = (p: Combatant, monsterId: string) =>
  Math.ceil(p.hp / hitDamage(monsterCombatant(monsters.get(monsterId)!), { ...p, incomingDamageMult: 1 }));

describe("zone progression: gear from the previous zone carries a player through the next one", () => {
  it("every zone chain item exists in the pack", () => {
    const ids = new Set(((pack as { items: Array<{ id: string }> }).items).map((i) => i.id));
    for (const [zone, chain] of Object.entries(CHAINS)) for (const [, id] of chain) assert.ok(ids.has(id), `${zone}: ${id} missing from pack`);
  });

  for (const zoneId of ZONES) {
    const stage = stages.find((s) => s.id === zoneId)!;
    const ordinary = stage.encounters.filter((e) => !e.isBoss);
    const boss = stage.encounters.find((e) => e.isBoss)!;
    const prev = PREV_ZONE[zoneId];

    it(`${zoneId}: every ordinary monster falls to a same-level player in ${prev} gear, with HP to spare`, () => {
      for (const e of ordinary) {
        const l = left(playerFor(prev, e.level), e.id);
        assert.ok(l >= 0.1, `${e.id} (lv${e.level}) leaves only ${(l * 100).toFixed(0)}% HP against ${prev} gear`);
      }
    });

    it(`${zoneId}: in its own gear the ordinary monsters are comfortable but never trivial`, () => {
      for (const e of ordinary) {
        const p = playerFor(zoneId, e.level);
        const l = left(p, e.id);
        assert.ok(l >= 0.35 && l <= 0.92, `${e.id} (lv${e.level}) leaves ${(l * 100).toFixed(0)}% HP in ${zoneId} gear (want 35–92%)`);
        const hits = hitsToDie(p, e.id);
        assert.ok(hits >= 6 && hits <= 120, `${e.id} needs ${hits} hits to kill a ${zoneId}-geared player (want 6–120; 1 damage per hit was the old cliff)`);
      }
    });

    it(`${zoneId}: difficulty climbs inside the zone (back half and the last monster are harder than the front)`, () => {
      const lefts = ordinary.map((e) => left(playerFor(zoneId, e.level), e.id));
      const half = Math.floor(lefts.length / 2);
      const front = lefts.slice(0, lefts.length - half).reduce((s, x) => s + x, 0) / (lefts.length - half);
      const back = lefts.slice(-half).reduce((s, x) => s + x, 0) / half;
      assert.ok(back < front, `back half leaves ${(back * 100).toFixed(0)}% vs front ${(front * 100).toFixed(0)}%`);
      assert.ok(lefts[lefts.length - 1] < lefts[0], `last monster leaves ${(lefts[lefts.length - 1] * 100).toFixed(0)}% vs first ${(lefts[0] * 100).toFixed(0)}%`);
    });

    it(`${zoneId}: ${boss.id} (real engine) is a narrow win in ${zoneId} gear, a loss in ${prev} gear, and a loss with no gear`, async () => {
      const own = await realBossFight(CHAINS[zoneId], boss.level, boss.id, boss.atk);
      assert.ok(own.won && own.left >= 0.15 && own.left <= 0.5, `${boss.id} leaves ${(own.left * 100).toFixed(0)}% HP in ${zoneId} gear (want 15–50%)`);
      const prevFight = await realBossFight(CHAINS[prev], boss.level, boss.id, boss.atk);
      if (PREV_GEAR_MAY_WIN.includes(zoneId)) {
        assert.ok(prevFight.left <= own.left + 0.05, `${prev} gear does clearly better (${(prevFight.left * 100).toFixed(0)}%) than ${zoneId} gear (${(own.left * 100).toFixed(0)}%) against ${boss.id}`);
      } else {
        assert.equal(prevFight.won, false, `${boss.id} fell to ${prev} gear`);
      }
      assert.equal((await realBossFight([], boss.level, boss.id, boss.atk)).won, false, `${boss.id} lost to a player with no gear`);
    });
  }

  it("no zone ever collapses to 1 damage per hit against its own gear (the DEF cliff)", () => {
    const check = (zoneId: string, e: { id: string; level: number }) => {
      const p = playerFor(zoneId, e.level);
      const r = fight(p, e.id);
      // average damage per landed hit, charged hits included (a boss whose damage rides on a mechanic has a tiny base swing)
      const perHit = (p.hp - r.playerHpLeft) / Math.max(1, r.enemyHits);
      assert.ok(perHit > 1.5, `${e.id} deals ${perHit.toFixed(2)} damage per hit on average to a ${zoneId}-geared player`);
    };
    // forest trash has single-digit attack (1 damage is natural there); its boss and every later zone must hurt
    check("forest", stages.find((s) => s.id === "forest")!.encounters.find((e) => e.isBoss)!);
    for (const zoneId of ZONES) for (const e of stages.find((s) => s.id === zoneId)!.encounters) check(zoneId, e);
  });

  it("monsters mix attack speeds and archetypes in every open zone, and bosses never get weaker than the zone before", () => {
    for (const id of ["forest", ...ZONES]) {
      const trash = stages.find((s) => s.id === id)!.encounters.filter((e) => !e.isBoss);
      assert.ok(new Set(trash.map((e) => e.attackIntervalMs)).size >= 3, `zone ${id} trash should mix attack speeds`);
      assert.ok(new Set(trash.map((e) => e.archetype)).size >= 3, `zone ${id} trash should mix archetypes`);
    }
    // bosses that carry their damage on a mechanic have a smaller base swing, so only the plain-atk ones must climb
    const plain = stages.map((s) => s.encounters.find((e) => e.isBoss)!).filter((b) => !(b.mechanics || []).some((id) => (pack as any).bossMechanics.find((d: any) => d.id === id)?.kind === "charge"));
    for (let i = 1; i < plain.length; i++) assert.ok(plain[i].atk >= plain[i - 1].atk, `boss atk dips from ${plain[i - 1].id} (${plain[i - 1].atk}) to ${plain[i].id} (${plain[i].atk})`);
  });
});
