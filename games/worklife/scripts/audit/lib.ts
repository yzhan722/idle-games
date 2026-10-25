import pack from "../../shared/enhanced_content_pack_chinese.json";
import { combatSkillContribution, defaultCombatSkills } from "../../backend/src/combat_skills";
import { monsterCombatant, simulateFight, type Combatant } from "../../backend/src/first_hour_combat";
export const P: any = pack;
export const items: Map<string, any> = new Map(P.items.map((i: any) => [i.id, i]));
export const monsters: any[] = P.monsters;
export const stageOf = new Map<string, string>();
for (const s of P.stages) for (const m of s.monsters) stageOf.set(m, s.id);

// craft level per item (cheapest/lowest craft requirement among actions yielding it)
export const craftLevel = new Map<string, number>();
export const craftSkill = new Map<string, string>();
for (const a of P.actions) for (const y of a.yields || []) {
  const it = items.get(y.itemId);
  if (!it) continue;
  const lv = Number(a.requirements?.skillLevel || 1);
  if (!craftLevel.has(y.itemId) || lv < craftLevel.get(y.itemId)!) { craftLevel.set(y.itemId, lv); craftSkill.set(y.itemId, a.skillId); }
}
const GEAR_TYPES = ["weapon", "armor", "offhand", "accessory"];
export const gearItems = P.items.filter((i: any) => GEAR_TYPES.includes(i.type));
export function slotOf(i: any): string {
  if (i.type === "weapon") return "main_hand";
  if (i.type === "offhand") return "off_hand";
  if (i.type === "accessory") return "accessory";
  return i.slot || "chest";
}
export const power = (i: any) => Number(i.atk || 0) + Number(i.def || 0);
/** best gear craftable at craft level L, per slot */
export function bestGear(L: number): { atk: number; def: number; hp: number; picks: string[] } {
  const bySlot = new Map<string, any[]>();
  for (const i of gearItems) {
    const cl = craftLevel.get(i.id);
    if (cl === undefined || cl > L) continue;
    if (i.type === "weapon" && /axe|hoe|sickle|scissors|pan|spatula|bottle|hammer|logging/.test(i.id) && !/sword|blade|bow|staff/.test(i.id) && !/steel_axe/.test(i.id)) continue; // gathering tools are not combat weapons
    const s = slotOf(i);
    if (!bySlot.has(s)) bySlot.set(s, []);
    bySlot.get(s)!.push(i);
  }
  let atk = 0, def = 0, hp = 0; const picks: string[] = [];
  for (const [s, arr] of bySlot) {
    arr.sort((a, b) => power(b) - power(a));
    const take = s === "accessory" ? 2 : 1;
    for (const i of arr.slice(0, take)) { atk += Number(i.atk || 0); def += Number(i.def || 0); hp += Number(i.hp || 0); picks.push(i.id); }
  }
  return { atk, def, hp, picks };
}
export function player(level: number, gearLevel: number | null): Combatant {
  const sk = combatSkillContribution(defaultCombatSkills(level), "melee");
  const g = gearLevel === null ? { atk: 0, def: 0, hp: 0 } : bestGear(gearLevel);
  return { name: `L${level}`, hp: sk.hp + g.hp, atk: sk.atk + g.atk, def: sk.def + g.def, intervalMs: sk.intervalMs, incomingDamageMult: 1, outgoingDamageMult: 1 };
}
export const fight = (p: Combatant, m: any) => simulateFight(p, monsterCombatant(m));

