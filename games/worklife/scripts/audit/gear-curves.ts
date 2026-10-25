import { P, items, craftLevel, monsters, slotOf, power, gearItems } from "./lib";
import { enhancementStatMultiplier, ENHANCEMENT_BONUS_PCT } from "../../frontend/src/gameplay/enhancement";
console.log("== enhancement multipliers (+0..+20 bonus%):", ENHANCEMENT_BONUS_PCT.join(","));
const acc = gearItems.filter((i: any) => i.type === "accessory" && (i.atk || i.def));
for (const lv of [5, 10, 15, 20]) {
  const w = items.get("weapon_magma_blade"), r = items.get("accessory_magma_ring"), c = items.get("armor_magma_chest");
  console.log(`+${lv}: weapon x${enhancementStatMultiplier(lv, w).toFixed(2)} (atk ${w.atk}->${Math.round(w.atk * enhancementStatMultiplier(lv, w))}) | chest x${enhancementStatMultiplier(lv, c).toFixed(2)} (def ${c.def}->${Math.round(c.def * enhancementStatMultiplier(lv, c))}) | ring x${enhancementStatMultiplier(lv, r).toFixed(2)} (atk ${r.atk}+def ${r.def} -> ${Math.round(r.atk * enhancementStatMultiplier(lv, r))}+${Math.round(r.def * enhancementStatMultiplier(lv, r))})`);
}
console.log("\n== best-in-slot stat by craft level vs monster atk (damage = atk - floor(def/2), floor 1)");
const slots = ["main_hand", "off_hand", "head", "chest", "legs", "hands", "feet", "accessory"];
const mAtkAt = (L: number) => { const m = monsters.filter((x) => x.level <= L && !x.id.endsWith("_boss")).sort((a, b) => b.level - a.level)[0]; return m ? m.atk : 0; };
console.log("craftLv | monster atk | " + slots.join(" | ") + " | total gear def (sum 5 armor+offhand) | def needed for 1-dmg (2*atk)");
for (const L of [10, 20, 30, 40, 50, 60, 75, 90, 105, 120, 135, 149]) {
  const row: string[] = []; let defSum = 0;
  for (const s of slots) {
    const cand = gearItems.filter((i: any) => slotOf(i) === s && (craftLevel.get(i.id) ?? 999) <= L && !(i.type === "weapon" && /logging|hoe|sickle|scissors|frying|spatula|bottle|hammer/.test(i.id)));
    const b = cand.sort((a: any, b: any) => power(b) - power(a))[0];
    row.push(b ? String(power(b)) : "-");
    if (b && !["main_hand", "accessory"].includes(s)) defSum += Number(b.def || 0);
  }
  console.log(`${String(L).padStart(7)} | ${String(mAtkAt(L)).padStart(10)} | ${row.join(" | ")} | ${defSum} | ${2 * mAtkAt(L)}`);
}
console.log("\n== dominated gear (a lower-or-equal craft level item in the same slot has >= power) = dead content");
let dead = 0, total = 0; const ex: string[] = [];
for (const s of slots) {
  const arr = gearItems.filter((i: any) => slotOf(i) === s && craftLevel.has(i.id) && !(i.type === "weapon" && /logging|hoe|sickle|scissors|frying|spatula|bottle|hammer/.test(i.id)));
  let d = 0;
  for (const i of arr) { total++; const better = arr.find((o: any) => o !== i && craftLevel.get(o.id)! <= craftLevel.get(i.id)! && power(o) >= power(i) && (o.value || 0) <= (i.value || 0) * 10 && (craftLevel.get(o.id)! < craftLevel.get(i.id)! || power(o) > power(i))); if (better) { d++; dead++; if (ex.length < 12 && power(i) > 0) ex.push(`${i.id}(cl${craftLevel.get(i.id)},p${power(i)}) < ${better.id}(cl${craftLevel.get(better.id)},p${power(better)})`); } }
  console.log(`${s.padEnd(10)} items ${String(arr.length).padStart(3)} dominated ${d}`);
}
console.log(`total dominated ${dead}/${total}`); console.log(ex.join("\n"));
console.log("\n== price per power by craft level band (value / (atk+def)); outliers = >3x or <1/3 of band median");
const med = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const bands = new Map<number, any[]>();
for (const i of gearItems) { const cl = craftLevel.get(i.id); if (cl === undefined || !power(i) || !i.value) continue; const b = Math.floor(cl / 25); if (!bands.has(b)) bands.set(b, []); bands.get(b)!.push({ ...i, cl, ppv: i.value / power(i) }); }
for (const [b, arr] of [...bands].sort((a, b) => a[0] - b[0])) { const m = med(arr.map((x) => x.ppv)); const out = arr.filter((x) => x.ppv > 3 * m || x.ppv < m / 3); console.log(`craftLv ${b * 25}-${b * 25 + 24}: n=${arr.length} median value/power=${m.toFixed(1)} outliers=${out.map((x) => x.id + "(" + x.ppv.toFixed(1) + ")").slice(0, 6).join(" ")}`); }
console.log("\n== gold sinks vs income: top item values and enhancement cost");
const top = [...gearItems].sort((a: any, b: any) => (b.value || 0) - (a.value || 0)).slice(0, 4).map((i: any) => `${i.id}=${i.value}`);
console.log("most expensive gear:", top.join(", "));
console.log("enhancement rules gold costs:", JSON.stringify(P.enhancementRules.map((r: any) => ({ t: r.itemType, mats: r.materials.map((m: any) => m.itemId + "x" + (m.quantity ?? m.qty)).join("+") }))));

