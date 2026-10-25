import { P, items, craftLevel, monsters, stageOf, slotOf, power, gearItems } from "./lib";
import { defaultCombatSkills } from "../../backend/src/combat_skills";
import { playerCombatant, monsterCombatant, simulateFight, hitDamage } from "../../backend/src/first_hour_combat";
import { getEquippedCombatStats } from "../../backend/src/storage";

// ---- 1. cumulative set-bonus vs description ----
console.log("== set bonus: description tiers vs what the code actually adds (all tiers accumulate)");
for (const s of P.equipmentSets) {
  const eqPieces = s.pieces.length;
  let a = 0, d = 0; const tiers: string[] = [];
  for (const b of s.bonuses) { a += b.stats?.atk || 0; d += b.stats?.def || 0; tiers.push(`${b.requiredPieces}p:${b.stats?.atk || 0}/${b.stats?.def || 0}`); }
  const top = s.bonuses[s.bonuses.length - 1];
  const inflated = s.bonuses.length > 1 && (a > (top.stats?.atk || 0) || d > (top.stats?.def || 0));
  console.log(`${s.id.padEnd(30)} pieces ${eqPieces} tiers [${tiers.join(" ")}] actual total atk ${a} def ${d} | desc top tier atk ${top.stats?.atk || 0} def ${top.stats?.def || 0} ${inflated ? "<-- accumulates beyond stated" : ""}`);
}

// ---- 2. realistic loadouts via the real stat function ----
function setLoadout(L: number): { eq: Record<string, string>; inv: Record<string, number>; label: string } {
  const sets = P.equipmentSets.map((s: any) => ({ s, lv: Math.max(...s.pieces.map((p: any) => craftLevel.get(p.itemId) || 0)) })).filter((x: any) => x.lv <= L && x.s.pieces.length >= 4 && x.s.profession !== "farmer" && x.s.profession !== "chef" && x.s.profession !== "alchemist" || (x.lv <= L && x.s.id === "arcane_sage_set"));
  const attack = sets.filter((x: any) => x.s.pieces.some((p: any) => /weapon|mainhand|main_hand/.test(p.slot) || p.slot === "main_hand") || x.s.pieces.length >= 8 || x.s.profession === "all" || x.s.profession === "combat");
  attack.sort((a: any, b: any) => b.lv - a.lv);
  const eq: Record<string, string> = {}; const inv: Record<string, number> = {};
  const best = attack[0];
  if (best) for (const p of best.s.pieces) { eq[p.slot] = p.itemId; inv[p.itemId] = 1; }
  // fill empty slots with best craftable item
  const bySlot = new Map<string, any[]>();
  for (const i of gearItems) {
    const cl = craftLevel.get(i.id); if (cl === undefined || cl > L) continue;
    if (i.type === "weapon" && /logging|hoe|sickle|scissors|frying|spatula|bottle|hammer/.test(i.id)) continue;
    const sl = slotOf(i); const key = sl === "accessory" ? "accessory1" : sl;
    if (!bySlot.has(key)) bySlot.set(key, []); bySlot.get(key)!.push(i);
  }
  for (const [sl, arr] of bySlot) { if (eq[sl]) continue; arr.sort((a, b) => power(b) - power(a)); eq[sl] = arr[0].id; inv[arr[0].id] = 1; }
  return { eq, inv, label: best ? best.s.id : "(none)" };
}
function sheet(L: number, lo: { eq: any; inv: any } | null) {
  const state: any = { inventory: lo ? { ...lo.inv } : {}, equipment: lo ? { ...lo.eq } : {}, combatSkills: defaultCombatSkills(L), stats: {} };
  return playerCombatant(state, P);
}
console.log("\n== per monster, real stat function incl. set bonuses (no abilities/food/enhancement)");
console.log("zone      monster          L  | A(atk) | naked: dmg/hit res      | set@L: def  dmg/hit res          | set@L-15: dmg/hit res | set used");
const seen = new Map<string, any>();
for (const m of monsters) {
  const L = m.level;
  const lo = setLoadout(L), lo2 = setLoadout(Math.max(1, L - 15));
  const fmt = (p: any) => { const r = simulateFight(p, monsterCombatant(m)); const dmg = hitDamage(monsterCombatant(m), { ...p, incomingDamageMult: 1 }); return { dmg, txt: `${String(dmg).padStart(4)} ${r.won ? "W" + String(Math.round((r.playerHpLeft / p.hp) * 100)).padStart(3) + "%" : "LOSS"}`, p }; };
  const n = fmt(sheet(L, null)), s = fmt(sheet(L, lo)), s2 = fmt(sheet(L, lo2));
  console.log(`${(stageOf.get(m.id) || "?").padEnd(9)} ${m.id.padEnd(16)} ${String(L).padStart(3)} | ${String(m.atk).padStart(5)}  | ${n.txt.padEnd(14)}        | ${String(s.p.def).padStart(4)} ${s.txt.padEnd(14)}        | ${s2.txt.padEnd(14)}        | ${lo.label}${s.dmg === 1 ? "  <-- 1 dmg/hit" : ""}`);
}

