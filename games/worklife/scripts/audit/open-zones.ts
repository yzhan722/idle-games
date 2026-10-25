import { P, items, monsters, stageOf } from "./lib";
import { defaultCombatSkills } from "../../backend/src/combat_skills";
import { playerCombatant, monsterCombatant, simulateFight, hitDamage } from "../../backend/src/first_hour_combat";
const L1: Record<string, { slot: string; id: string }[]> = {
  forest: [["main_hand","weapon_wooden_sword"],["chest","armor_wood_chest"],["legs","armor_wood_legs"],["feet","armor_wood_boots"],["hands","armor_wood_gloves"],["off_hand","weapon_shield_t1"]].map(([slot,id])=>({slot,id})),
  mine: [["main_hand","weapon_steel_axe"],["chest","armor_iron_chest"],["legs","armor_iron_legs"],["feet","armor_iron_boots"],["hands","armor_iron_gloves"],["off_hand","weapon_shield_t1"],["accessory1","accessory_pouch_medium"]].map(([slot,id])=>({slot,id})),
  swamp: [["main_hand","weapon_logging_axe_t2"],["chest","armor_blacksmith_iron_chest"],["legs","armor_blacksmith_iron_legs"],["feet","armor_blacksmith_iron_boots"],["hands","armor_blacksmith_iron_gloves"],["off_hand","weapon_shield_t2"],["accessory1","accessory_pouch_medium"]].map(([slot,id])=>({slot,id})),
  snow: [["main_hand","weapon_frost_blade"],["head","armor_frost_head"],["chest","armor_frost_chest"],["legs","armor_frost_legs"],["hands","armor_frost_hands"],["feet","armor_frost_feet"],["off_hand","offhand_frost_shield"],["accessory1","accessory_frost_ring"]].map(([slot,id])=>({slot,id})),
  volcano: [["main_hand","weapon_magma_blade"],["head","armor_magma_head"],["chest","armor_magma_chest"],["legs","armor_magma_legs"],["hands","armor_magma_hands"],["feet","armor_magma_feet"],["off_hand","offhand_magma_shield"],["accessory1","accessory_magma_ring"]].map(([slot,id])=>({slot,id})),
};
console.log("zone     | level | def raw(items) -> def real(items+skill+set bonuses) | atk real | monsters: min..max dmg/hit | boss dmg/hit | boss result");
for (const z of Object.keys(L1)) {
  const ms = monsters.filter((m) => stageOf.get(m.id) === z); const boss = ms.find((m) => m.id.endsWith("_boss"))!;
  const L = boss.level;
  const eq: any = {}, inv: any = {}; let rawDef = 0;
  for (const p of L1[z]) { eq[p.slot] = p.id; inv[p.id] = 1; rawDef += Number(items.get(p.id)?.def || 0); }
  const state: any = { inventory: inv, equipment: eq, combatSkills: defaultCombatSkills(L), stats: {} };
  const pc = playerCombatant(state, P);
  const dmgs = ms.filter((m) => m !== boss).map((m) => hitDamage(monsterCombatant(m), { ...pc, incomingDamageMult: 1 }));
  const bd = hitDamage(monsterCombatant(boss), { ...pc, incomingDamageMult: 1 });
  const r = simulateFight(pc, monsterCombatant(boss));
  console.log(`${z.padEnd(8)} | L${String(L).padStart(3)} | ${String(rawDef).padStart(4)} -> ${String(pc.def).padStart(4)} | ${String(pc.atk).padStart(4)} | ${Math.min(...dmgs)}..${Math.max(...dmgs)} | ${bd} | ${r.won ? "WIN " + Math.round((r.playerHpLeft / pc.hp) * 100) + "% HP left" : "LOSS"} (boss atk ${boss.atk}, hits to die ${Math.ceil(pc.hp / bd)})`);
}

