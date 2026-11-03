import assert from "node:assert/strict";
import { describe, it } from "node:test";
import pack from "../shared/enhanced_content_pack_chinese.json";
import { activeSetBonuses } from "../frontend/src/gameplay/combatSheet";
import { highestActiveBonus } from "../backend/src/set_bonus";
import { getEquippedCombatStats } from "../backend/src/storage";
import { enhancementStatMultiplier as backendMult } from "../backend/src/enhancement_math";
import { enhancementStatMultiplier as frontendMult } from "../frontend/src/gameplay/enhancement";

const P = pack as any;
const items = new Map<string, any>(P.items.map((i: any) => [i.id, i]));

describe("set bonus parity: frontend mirror == backend rule, for every set and every piece count", () => {
  it("activeSetBonuses (frontend) equals highestActiveBonus (backend) for 0..N worn pieces of each set", () => {
    for (const set of P.equipmentSets) {
      for (let worn = 0; worn <= set.pieces.length; worn++) {
        const equipment: Record<string, string> = {};
        for (const piece of set.pieces.slice(0, worn)) equipment[piece.slot] = piece.itemId;
        const front = activeSetBonuses(equipment as never, [set]);
        const back = highestActiveBonus<{ requiredPieces?: number; stats?: Record<string, number> }>(set.bonuses, worn);
        const wantAtk = Number(back?.stats?.atk || 0);
        const wantDef = Number(back?.stats?.def || 0);
        const gotAtk = front[0]?.atk ?? 0;
        const gotDef = front[0]?.def ?? 0;
        assert.equal(gotAtk, wantAtk, `${set.id} with ${worn} piece(s): atk`);
        assert.equal(gotDef, wantDef, `${set.id} with ${worn} piece(s): def`);
      }
    }
  });

  it("the backend combat stats of a fully worn set are item stats plus exactly the top tier", () => {
    for (const set of P.equipmentSets) {
      const equipment: Record<string, string> = {};
      const inventory: Record<string, number> = {};
      let atk = 0;
      let def = 0;
      for (const piece of set.pieces) {
        equipment[piece.slot] = piece.itemId;
        inventory[piece.itemId] = 1;
        atk += Number(items.get(piece.itemId)?.atk || 0) + Number(items.get(piece.itemId)?.mag || 0);
        def += Number(items.get(piece.itemId)?.def || 0);
      }
      const top = highestActiveBonus<{ requiredPieces?: number; stats?: Record<string, number> }>(set.bonuses, set.pieces.length);
      const stats = getEquippedCombatStats({ inventory, equipment, stats: {} } as never, P);
      // other sets can share a piece with this one; only assert when this set is the sole source of bonus
      const others = P.equipmentSets.filter((s: any) => s.id !== set.id && s.pieces.some((p: any) => equipment[p.slot] === p.itemId));
      if (others.length) continue;
      assert.equal(stats.atk, Math.round(atk + Number(top?.stats?.atk || 0)), `${set.id} atk`);
      assert.equal(stats.def, Math.round(def + Number(top?.stats?.def || 0)), `${set.id} def`);
    }
  });
});

describe("enhancement slot multiplier parity (jewelry is 1× on both sides)", () => {
  it("backend and frontend agree for every gear type at every level", () => {
    for (const item of [{ type: "weapon" }, { type: "armor" }, { type: "accessory" }, { slot: "accessory" }, { type: "offhand" }]) {
      for (let level = 0; level <= 20; level++) {
        assert.equal(backendMult(level, item as never), frontendMult(level, item), `${JSON.stringify(item)} +${level}`);
      }
    }
    assert.equal(backendMult(20, { type: "accessory" } as never), 2);
  });
});
