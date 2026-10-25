import assert from "node:assert/strict";
import { describe, it } from "node:test";
import pack from "../../shared/enhanced_content_pack_chinese.json";
import { getEquippedCombatStats, getEquippedProductionBuffs } from "./storage";
import { highestActiveBonus } from "./set_bonus";
import { hitDamage, mitigatedDamage, type Combatant } from "./first_hour_combat";
import type { EnhancedContentPack } from "./types";

const contentPack = pack as unknown as EnhancedContentPack;
const combatant = (atk: number, def: number, extra: Partial<Combatant> = {}): Combatant => ({
  name: "t",
  hp: 100,
  atk,
  def,
  intervalMs: 2000,
  incomingDamageMult: 1,
  outgoingDamageMult: 1,
  ...extra,
});

describe("ratio damage mitigation: atk² / (atk + floor(def/2))", () => {
  it("is the old linear rule's curve for small defence and never reaches the 1-damage floor by stacking defence", () => {
    assert.equal(mitigatedDamage(100, 0), 100);
    assert.equal(mitigatedDamage(100, 200), 50, "def/2 = atk halves the hit");
    assert.equal(mitigatedDamage(100, 600), 25, "def/2 = 3×atk leaves a quarter");
    // small defence stays close to atk − def/2 (the first hour plays as before)
    assert.ok(Math.abs(mitigatedDamage(40, 8) - (40 - 4)) < 1, `${mitigatedDamage(40, 8)}`);
    // the cliff: under the old rule 1000 defence against 100 atk was a flat 1 damage
    assert.ok(mitigatedDamage(100, 1000) > 15);
    assert.ok(hitDamage(combatant(105, 0), combatant(1, 338)) > 10, "volcano boss atk vs a full magma set no longer rounds to 1");
  });

  it("is strictly decreasing in defence, strictly increasing in attack, and never negative", () => {
    let prev = Infinity;
    for (let def = 0; def <= 4000; def += 50) {
      const d = mitigatedDamage(80, def);
      assert.ok(d > 0 && d < prev, `def ${def}: ${d} !< ${prev}`);
      prev = d;
    }
    let last = 0;
    for (let atk = 1; atk <= 500; atk += 7) {
      const d = mitigatedDamage(atk, 200);
      assert.ok(d > last);
      last = d;
    }
    assert.equal(mitigatedDamage(0, 50), 0);
    assert.equal(mitigatedDamage(-5, 50), 0);
    assert.equal(mitigatedDamage(10, -400), 10, "negative defence never amplifies");
  });

  it("keeps the 1-damage floor and applies the incoming multiplier after mitigation", () => {
    assert.equal(hitDamage(combatant(1, 9999), combatant(1, 9999)), 1);
    assert.equal(hitDamage(combatant(100, 0), combatant(1, 200, { incomingDamageMult: 0.5 })), 25);
    assert.equal(hitDamage(combatant(100, 0, { outgoingDamageMult: 2 }), combatant(1, 0)), 200);
  });
});

describe("set bonuses: only the highest satisfied tier applies", () => {
  it("picks the highest tier whose pieces are met", () => {
    const tiers = [
      { requiredPieces: 2, stats: { atk: 5 } },
      { requiredPieces: 3, stats: { atk: 10 } },
      { requiredPieces: 4, stats: { atk: 20 } },
    ];
    assert.equal(highestActiveBonus(tiers, 1), undefined);
    assert.equal(highestActiveBonus(tiers, 2)?.stats.atk, 5);
    assert.equal(highestActiveBonus(tiers, 3)?.stats.atk, 10);
    assert.equal(highestActiveBonus(tiers, 4)?.stats.atk, 20);
    assert.equal(highestActiveBonus(tiers, 8)?.stats.atk, 20);
    assert.equal(highestActiveBonus(undefined, 3), undefined);
  });

  it("a worn set adds exactly its stated tier to the combat stats, not the stacked sum", () => {
    const set = contentPack.equipmentSets.find((s: any) => s.id === "woodcutter_basic_set") as any;
    assert.ok(set, "woodcutter_basic_set exists");
    const items = new Map(contentPack.items.map((i: any) => [i.id, i]));
    const equipment: Record<string, string> = {};
    const inventory: Record<string, number> = {};
    let itemAtk = 0;
    let itemDef = 0;
    for (const piece of set.pieces) {
      equipment[piece.slot] = piece.itemId;
      inventory[piece.itemId] = 1;
      itemAtk += Number((items.get(piece.itemId) as any)?.atk || 0);
      itemDef += Number((items.get(piece.itemId) as any)?.def || 0);
    }
    const state: any = { inventory, equipment, stats: {} };
    const three = set.bonuses.find((b: any) => b.requiredPieces === 3);
    const stats = getEquippedCombatStats(state, contentPack);
    // the pack text says "3件套：攻击+10，防御+8" — that is the total, not 2-piece + 3-piece (15 / 11)
    assert.equal(stats.atk - itemAtk, three.stats.atk);
    assert.equal(stats.def - itemDef, three.stats.def);
    assert.equal(three.stats.atk, 10);
    assert.equal(three.stats.def, 8);
    // production buffs follow the same rule (3-piece: gather speed +10%, not stacked with lower tiers)
    assert.equal(getEquippedProductionBuffs(state, contentPack).gatherSpeed, 1 + three.stats.gatherSpeed / 100);
  });

  it("no set in the pack stacks beyond its top tier, and every tier of a set is monotone in atk/def", () => {
    for (const set of contentPack.equipmentSets as any[]) {
      let prevAtk = -1;
      let prevDef = -1;
      for (const b of [...set.bonuses].sort((a: any, b: any) => a.requiredPieces - b.requiredPieces)) {
        const atk = Number(b.stats?.atk || 0);
        const def = Number(b.stats?.def || 0);
        assert.ok(atk >= prevAtk && def >= prevDef, `${set.id}: tier ${b.requiredPieces} is weaker than a lower tier`);
        prevAtk = atk;
        prevDef = def;
      }
    }
  });
});
