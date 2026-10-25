import { P, items, craftLevel, monsters, stageOf, slotOf, power, gearItems } from "./lib";
import { defaultCombatSkills } from "../../backend/src/combat_skills";
import { playerCombatant, monsterCombatant, simulateFight } from "../../backend/src/first_hour_combat";
import { getXpForLevel } from "../../backend/src/storage";

// reuse loadout builder from real.ts logic (copied, compact)
function setLoadout(L: number) {
  const sets = P.equipmentSets.map((s: any) => ({ s, lv: Math.max(...s.pieces.map((p: any) => craftLevel.get(p.itemId) || 0)) })).filter((x: any) => x.lv <= L && x.s.pieces.length >= 4 && ["all", "combat", "blacksmith", "woodcutter"].includes(x.s.profession));
  sets.sort((a: any, b: any) => b.lv - a.lv);
  const eq: any = {}, inv: any = {};
  if (sets[0]) for (const p of sets[0].s.pieces) { eq[p.slot] = p.itemId; inv[p.itemId] = 1; }
  return { eq, inv };
}
const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
console.log("== rewards per hour (set@L loadout, auto-repeat: fight time + 3s intermission), per zone");
console.log("zone      trashXP/hr(med)  trashGold/hr(med) | bossXP/hr  bossGold/hr  boss/trash xp | xpToLevel@boss  kills of trash for 1 skill-level (30% main share)");
const zones = P.stages.map((s: any) => s.id);
for (const z of zones) {
  const ms = monsters.filter((m) => stageOf.get(m.id) === z);
  const rows = ms.map((m) => {
    const L = m.level; const lo = setLoadout(L);
    const state: any = { inventory: lo.inv, equipment: lo.eq, combatSkills: defaultCombatSkills(L), stats: {} };
    const p = playerCombatant(state, P); const r = simulateFight(p, monsterCombatant(m));
    const t = (r.durationMs + 3000) / 1000;
    return { id: m.id, boss: m.id.endsWith("_boss"), xph: (m.xp / t) * 3600, gph: (m.gold / t) * 3600, xp: m.xp, L, won: r.won };
  });
  const trash = rows.filter((r: any) => !r.boss), boss = rows.find((r: any) => r.boss)!;
  const L = boss.L; const lvlXp = getXpForLevel(L);
  const mainShare = median(trash.map((r: any) => r.xp)) * 0.3;
  console.log(`${z.padEnd(9)} ${String(Math.round(median(trash.map((r: any) => r.xph)))).padStart(12)} ${String(Math.round(median(trash.map((r: any) => r.gph)))).padStart(16)}   | ${String(Math.round(boss.xph)).padStart(9)} ${String(Math.round(boss.gph)).padStart(11)}  x${(boss.xph / median(trash.map((r: any) => r.xph))).toFixed(1).padStart(4)}       | ${String(Math.round(lvlXp)).padStart(8)}   ${(lvlXp / mainShare).toFixed(0)}`);
}

console.log("\n== drop-gated gear: expected kills to collect the monster-drop materials of each craftable set");
const dropper = new Map<string, { m: string; chance: number }[]>();
for (const m of monsters) {
  const add = (id: string, c: number) => { if (!id || !(c > 0)) return; if (!dropper.has(id)) dropper.set(id, []); dropper.get(id)!.push({ m: m.id, chance: c }); };
  const rare = items.get(m.rare) ? m.rare : (P.items.find((i: any) => i.name === m.rare) || {}).id;
  if (rare) add(rare, Number(m.rareChance));
  for (const d of m.drops || []) add(d.itemId, Number(d.chance) * Number(d.qty || 1));
}
const sourceOf = new Map<string, any>();
for (const a of P.actions) for (const y of a.yields || []) if (!sourceOf.has(y.itemId)) sourceOf.set(y.itemId, a);
for (const s of P.equipmentSets) {
  const need = new Map<string, number>();
  for (const pc of s.pieces) { const a = sourceOf.get(pc.itemId); for (const c of a?.consumes || []) if (dropper.has(c.itemId)) need.set(c.itemId, (need.get(c.itemId) || 0) + c.qty); }
  if (!need.size) continue;
  const parts = [...need].map(([id, q]) => { const best = dropper.get(id)!.sort((a, b) => b.chance - a.chance)[0]; return `${id}x${q}@${(best.chance * 100).toFixed(1)}%(${best.m}) ~${Math.round(q / best.chance)} kills`; });
  console.log(`${s.id.padEnd(28)} ${parts.join(" | ")}`);
}

