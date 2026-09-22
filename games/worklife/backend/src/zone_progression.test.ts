import assert from "node:assert/strict";
import { describe, it } from "node:test";
import pack from "../../shared/enhanced_content_pack_chinese.json";
import { combatSkillContribution, defaultCombatSkills } from "./combat_skills";
import { monsterCombatant, simulateFight, type Combatant } from "./first_hour_combat";
import { encounterStages } from "./gameplay_encounters";

/**
 * Zone progression sanity (MWI: farm a zone, craft its gear, take the next zone). Every check runs
 * the deterministic server fight with the real pack numbers and the real item stats:
 *  - the ordinary monsters of a zone fall to a same-level player wearing the PREVIOUS zone's gear;
 *  - the zone boss falls to a same-level player wearing the zone's OWN gear (no abilities, no food);
 *  - the zone boss kills a same-level player who wears nothing — gear has to matter.
 * scripts/fix-monster-balance.py wrote the current boss / snow numbers against these loadouts.
 */

type Item = { id: string; atk?: number; def?: number };
const items = new Map(((pack as { items: Item[] }).items).map((i) => [i.id, i]));
const stages = encounterStages(pack as never);
const monsters = new Map(((pack as { monsters: Array<Record<string, unknown> & { id: string }> }).monsters).map((m) => [m.id, m]));

const LOADOUTS: Record<string, string[]> = {
  none: [],
  forest: ["weapon_wooden_sword", "armor_wood_chest", "armor_wood_legs", "armor_wood_boots", "armor_wood_gloves", "weapon_shield_t1"],
  mine: ["weapon_steel_axe", "armor_iron_chest", "armor_iron_legs", "armor_iron_boots", "armor_iron_gloves", "weapon_shield_t1", "accessory_pouch_medium"],
  swamp: ["weapon_logging_axe_t2", "armor_blacksmith_iron_chest", "armor_blacksmith_iron_legs", "armor_blacksmith_iron_boots", "armor_blacksmith_iron_gloves", "weapon_shield_t2", "accessory_pouch_medium"],
  snow: ["weapon_frost_blade", "armor_frost_head", "armor_frost_chest", "armor_frost_legs", "armor_frost_hands", "armor_frost_feet", "offhand_frost_shield", "accessory_frost_ring"],
};
const PREVIOUS: Record<string, string> = { forest: "none", mine: "forest", swamp: "mine", snow: "swamp" };

function gear(loadout: string): { atk: number; def: number } {
  let atk = 0;
  let def = 0;
  for (const id of LOADOUTS[loadout]) {
    const item = items.get(id);
    assert.ok(item, `loadout item ${id} missing from pack`);
    atk += Number(item.atk || 0);
    def += Number(item.def || 0);
  }
  return { atk, def };
}

function player(level: number, loadout: string): Combatant {
  const skills = combatSkillContribution(defaultCombatSkills(level), "melee");
  const g = gear(loadout);
  return { name: `lv${level} ${loadout}`, hp: skills.hp, atk: skills.atk + g.atk, def: skills.def + g.def, intervalMs: skills.intervalMs, incomingDamageMult: 1, outgoingDamageMult: 1 };
}

const fight = (p: Combatant, monsterId: string) => simulateFight(p, monsterCombatant(monsters.get(monsterId)!));

describe("zone progression: gear from the previous zone carries a player through the next one", () => {
  for (const zoneId of ["mine", "swamp", "snow"]) {
    const stage = stages.find((s) => s.id === zoneId)!;
    const ordinary = stage.encounters.filter((e) => !e.isBoss);
    const boss = stage.encounters.find((e) => e.isBoss)!;

    it(`${zoneId}: every ordinary monster falls to a same-level player in ${PREVIOUS[zoneId]} gear`, () => {
      for (const e of ordinary) {
        const r = fight(player(e.level, PREVIOUS[zoneId]), e.id);
        assert.ok(r.won, `${e.id} (lv${e.level}) beat the player in ${PREVIOUS[zoneId]} gear: ${JSON.stringify(r)}`);
      }
    });

    it(`${zoneId}: ${boss.id} falls to a same-level player in ${zoneId} gear, and kills one wearing nothing`, () => {
      const geared = fight(player(boss.level, zoneId), boss.id);
      assert.ok(geared.won, `${boss.id} beat the geared player: ${JSON.stringify(geared)}`);
      const naked = fight(player(boss.level, "none"), boss.id);
      assert.equal(naked.won, false, `${boss.id} lost to a player with no gear: ${JSON.stringify(naked)}`);
    });
  }

  it("monster stats climb monotonically through the open zones and the snow zone", () => {
    const line = ["mine", "swamp", "snow"].flatMap((id) => stages.find((s) => s.id === id)!.encounters.filter((e) => !e.isBoss));
    for (let i = 1; i < line.length; i++) {
      assert.ok(line[i].hp > line[i - 1].hp && line[i].atk > line[i - 1].atk && line[i].def >= line[i - 1].def, `${line[i - 1].id} -> ${line[i].id}`);
    }
  });
});
