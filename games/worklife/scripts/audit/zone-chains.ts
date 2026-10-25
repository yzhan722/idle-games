/**
 * The intended gear chain per zone, shared by the monster calibration script and
 * backend/src/zone_progression.test.ts so the numbers that were solved and the numbers that are
 * guarded use the exact same player.
 *
 * Forest … volcano are hand-picked single-profession chains (the set a player can really craft from
 * that zone's drops). Zones without a finalised chain (abyss … omega, still locked) fall back to the
 * best set the zone's level can craft, filled with best-in-slot — a provisional stand-in that is
 * optimistic about cross-profession trading.
 */
import { P, craftLevel, slotOf, power, gearItems } from "./lib";
import { defaultCombatSkills } from "../../backend/src/combat_skills";
import { playerCombatant, type Combatant } from "../../backend/src/first_hour_combat";

export type Chain = Array<[slot: string, itemId: string]>;

export const CHAINS: Record<string, Chain> = {
  forest: [["main_hand", "weapon_wooden_sword"], ["chest", "armor_wood_chest"], ["legs", "armor_wood_legs"], ["feet", "armor_wood_boots"], ["hands", "armor_wood_gloves"], ["off_hand", "weapon_shield_t1"]],
  mine: [["main_hand", "weapon_steel_axe"], ["chest", "armor_iron_chest"], ["legs", "armor_iron_legs"], ["feet", "armor_iron_boots"], ["hands", "armor_iron_gloves"], ["off_hand", "weapon_shield_t1"], ["accessory1", "accessory_pouch_medium"]],
  swamp: [["main_hand", "weapon_logging_axe_t2"], ["chest", "armor_blacksmith_iron_chest"], ["legs", "armor_blacksmith_iron_legs"], ["feet", "armor_blacksmith_iron_boots"], ["hands", "armor_blacksmith_iron_gloves"], ["off_hand", "weapon_shield_t2"], ["accessory1", "accessory_pouch_medium"]],
  snow: [["main_hand", "weapon_frost_blade"], ["head", "armor_frost_head"], ["chest", "armor_frost_chest"], ["legs", "armor_frost_legs"], ["hands", "armor_frost_hands"], ["feet", "armor_frost_feet"], ["off_hand", "offhand_frost_shield"], ["accessory1", "accessory_frost_ring"]],
  volcano: [["main_hand", "weapon_magma_blade"], ["head", "armor_magma_head"], ["chest", "armor_magma_chest"], ["legs", "armor_magma_legs"], ["hands", "armor_magma_hands"], ["feet", "armor_magma_feet"], ["off_hand", "offhand_magma_shield"], ["accessory1", "accessory_magma_ring"]],
};

/** The zone a player comes from: its set must still carry them through the next zone's ordinary monsters. */
export const PREV_ZONE: Record<string, string> = { mine: "forest", swamp: "mine", snow: "swamp", volcano: "snow" };

export function derivedChain(L: number): Chain {
  const sets = P.equipmentSets
    .map((s: any) => ({ s, lv: Math.max(...s.pieces.map((p: any) => craftLevel.get(p.itemId) || 0)) }))
    .filter((x: any) => x.lv <= L && x.s.pieces.length >= 4 && ["all", "combat", "blacksmith", "woodcutter"].includes(x.s.profession));
  sets.sort((a: any, b: any) => b.lv - a.lv);
  const eq = new Map<string, string>();
  if (sets[0]) for (const p of sets[0].s.pieces) eq.set(p.slot, p.itemId);
  const bySlot = new Map<string, any[]>();
  for (const i of gearItems) {
    const cl = craftLevel.get(i.id);
    if (cl === undefined || cl > L) continue;
    if (i.type === "weapon" && /logging|hoe|sickle|scissors|frying|spatula|bottle|hammer/.test(i.id)) continue;
    const sl = slotOf(i);
    const key = sl === "accessory" ? "accessory1" : sl;
    if (!bySlot.has(key)) bySlot.set(key, []);
    bySlot.get(key)!.push(i);
  }
  for (const [sl, arr] of bySlot) {
    if (eq.has(sl)) continue;
    arr.sort((a, b) => power(b) - power(a));
    eq.set(sl, arr[0].id);
  }
  return [...eq];
}

/** A level-L player (every combat skill at L) wearing the zone's chain, via the game's own stat function. */
export function playerFor(zone: string, L: number, chain?: Chain): Combatant {
  const useChain = chain ?? CHAINS[zone] ?? derivedChain(L);
  const equipment: Record<string, string> = {};
  const inventory: Record<string, number> = {};
  for (const [slot, id] of useChain) {
    equipment[slot] = id;
    inventory[id] = 1;
  }
  const state: any = { inventory, equipment, combatSkills: defaultCombatSkills(L), stats: {} };
  return playerCombatant(state, P);
}

/** The same player with no gear at all. */
export function nakedPlayer(L: number): Combatant {
  return playerCombatant({ inventory: {}, equipment: {}, combatSkills: defaultCombatSkills(L), stats: {} } as any, P);
}
