/**
 * Monster attack recalibration for the ratio damage formula (atk² / (atk + floor(def/2))).
 *
 * Keeps every monster's hp / def / interval / xp / gold / drops and solves ONLY `atk`, per monster, by
 * inverting the deterministic fight: a same-level player (every combat skill at the monster's level)
 * wears the zone's intended chain (zone-chains.ts — real item stats, real skill contribution, real
 * highest-tier set bonus: the same function the game uses) and the monster's atk is bisected to the
 * highest value that still leaves the target share of the player's HP.
 *
 *   node --import tsx scripts/audit/calibrate.ts            # print the table
 *   node --import tsx scripts/audit/calibrate.ts --write    # write atk values into the shared pack
 *
 * Targets (HP left in the zone's own chain, no abilities / food — those make real fights easier):
 *   ordinary: 78% at the zone's first monster sliding to 52% at the last (difficulty climbs inside a
 *             zone), tank +8, fast / brute −3 (plain sim).
 *   boss:     35% HP left, solved on the REAL engine (real-fight.ts: innate 重劈 + the boss's mechanics, no
 *             books / food), and the previous zone's chain must lose to it. Zones without a chain
 *             (locked) keep the plain-sim running-max line.
 * Constraint: the PREVIOUS zone's chain must still beat every ordinary monster with >= 10% HP left —
 * the next set is crafted from this zone's drops, so last zone's gear has to be able to farm them.
 * Forest (the tuned first hour) is only touched with --forest. Abyss … omega have no finalised gear
 * chain: their per-monster solutions are smoothed onto a line and are PROVISIONAL.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { P, monsters, stageOf } from "./lib";
import { monsterCombatant, simulateFight, type Combatant } from "../../backend/src/first_hour_combat";
import { enemyDamageHook, mechanicDefsFor } from "../../backend/src/boss_mechanics";
import { CHAINS, PREV_ZONE, nakedPlayer, playerFor } from "./zone-chains";
import { realBossFight, solveBossAtk } from "./real-fight";

const BOSS_TARGET = 0.35;
/** A boss may be raised to gate out the previous zone's chain only while the zone's own chain keeps this much HP. */
const BOSS_MIN_OWN_LEFT = 0.2;
const FIRST_TRASH = 0.78;
const LAST_TRASH = 0.52;
const ARCH_OFFSET: Record<string, number> = { tank: 0.08, fast: -0.03, brute: -0.03 };
/** Previous-zone gear must still win against ordinary monsters with at least this share of HP left. */
const PREV_GEAR_MIN_LEFT = 0.1;
/**
 * First-hour monsters keep their pre-formula pacing instead of being solved. forest_boss 18 → 14:
 * the old rule left the chapter-1 boss a narrow win at level 10 (first-hour kit + the three ability
 * books, 16 HP left); atk 14 reproduces that margin at levels 12 and 15 under the ratio formula
 * (verified with the real combat engine, scripts/audit/forest-check.ts). Forest trash is untouched.
 */
const PINNED: Record<string, number> = { forest_boss: 14 };

const archetypeOf = (m: any) => (m.id.endsWith("_boss") || m.isBoss ? "boss" : String(m.archetype || "ordinary"));

/** The fight including the boss's charge mechanics (guard / wrath are not modelled by the plain sim). */
const fightWith = (p: Combatant, m: any) => simulateFight(p, monsterCombatant(m), undefined, { enemyDamage: enemyDamageHook(mechanicDefsFor(P, m)) });

function leftWith(atk: number, m: any, p: Combatant): number {
  const r = fightWith(p, { ...m, atk });
  return r.won ? r.playerHpLeft / p.hp : 0;
}

/** Highest atk that still leaves at least `target` of the player's HP (bisection; left is monotone in atk). */
function solveAtk(m: any, p: Combatant, target: number): number {
  let lo = 1;
  let hi = 4000;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (leftWith(mid, m, p) >= target) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

async function main() {
const write = process.argv.includes("--write");
const touchForest = process.argv.includes("--forest");

type Row = { id: string; zone: string; L: number; arch: string; before: number; exact: number; after: number; target: number; m: any };
const rows: Row[] = [];
for (const zone of P.stages.map((s: any) => s.id as string)) {
  if (zone === "forest" && !touchForest) continue;
  const inZone = monsters.filter((m) => stageOf.get(m.id) === zone).sort((a, b) => a.level - b.level);
  const trash = inZone.filter((m) => archetypeOf(m) !== "boss");
  for (const m of inZone) {
    const L = m.level;
    const arch = archetypeOf(m);
    const pos = trash.length > 1 ? Math.max(0, trash.indexOf(m)) / (trash.length - 1) : 0;
    const base = FIRST_TRASH + (LAST_TRASH - FIRST_TRASH) * pos;
    const target = arch === "boss" ? BOSS_TARGET : Math.min(0.9, Math.max(0.35, base + (ARCH_OFFSET[arch] ?? 0)));
    let exact = solveAtk(m, playerFor(zone, L), target);
    if (arch === "boss" && CHAINS[zone] && !PINNED[m.id]) {
      // Real engine: solve against the zone's own chain, then make sure the previous zone's chain loses.
      exact = await solveBossAtk(CHAINS[zone], L, m.id, target);
      if (PREV_ZONE[zone] && (await realBossFight(CHAINS[PREV_ZONE[zone]], L, m.id, exact)).won) {
        // Raise to the first atk the previous zone's chain loses to — but only while the zone's own chain keeps
        // a real margin there; when the two chains are nearly equal against this boss (swamp), keep the target.
        const gate = (await solveBossAtk(CHAINS[PREV_ZONE[zone]], L, m.id, 1e-9)) + 1;
        if ((await realBossFight(CHAINS[zone], L, m.id, gate)).left >= BOSS_MIN_OWN_LEFT) exact = Math.max(exact, gate);
      }
    } else if (arch !== "boss" && PREV_ZONE[zone]) exact = Math.min(exact, solveAtk(m, playerFor(PREV_ZONE[zone], L), PREV_GEAR_MIN_LEFT));
    // A boss is a gate: the previous zone's gear must lose. Take the first atk that beats it, as long
    // as the zone's own chain keeps winning (the test asserts 20–50% HP left).
    if (arch === "boss" && !CHAINS[zone] && PREV_ZONE[zone] && leftWith(exact, m, playerFor(PREV_ZONE[zone], L)) > 0) {
      exact = Math.max(exact, solveAtk(m, playerFor(PREV_ZONE[zone], L), 1e-9) + 1);
    }
    rows.push({ id: m.id, zone, L, arch, before: m.atk, exact, after: exact, target, m });
  }
}

// ---- zones without a hand-picked chain (abyss … omega): smooth the noisy per-monster solutions ----
function fitLine(pts: Array<[number, number]>): (x: number) => number {
  const n = pts.length;
  const sx = pts.reduce((s, p) => s + p[0], 0);
  const sy = pts.reduce((s, p) => s + p[1], 0);
  const sxx = pts.reduce((s, p) => s + p[0] * p[0], 0);
  const sxy = pts.reduce((s, p) => s + p[0] * p[1], 0);
  const b = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  const a = (sy - b * sx) / n;
  return (x) => a + b * x;
}
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const anchored = rows.filter((r) => r.L >= 46 && r.arch !== "boss"); // volcano (exact) + locked (noisy)
const factor: Record<string, number> = { ordinary: 1, tank: 1, fast: 1, brute: 1, slow: 1 };
let trashFit = fitLine(anchored.map((r) => [r.L, r.exact / (factor[r.arch] ?? 1)]));
for (let it = 0; it < 4; it++) {
  for (const a of Object.keys(factor)) {
    const mine = anchored.filter((r) => r.arch === a);
    if (mine.length) factor[a] = median(mine.map((r) => r.exact / trashFit(r.L)));
  }
  trashFit = fitLine(anchored.map((r) => [r.L, r.exact / (factor[r.arch] ?? 1)]));
}
// bosses must never get weaker as zones climb: running max of the exact solution, volcano as the floor
let bossFloor = Math.max(...rows.filter((r) => r.arch === "boss" && CHAINS[r.zone]).map((r) => r.exact));
for (const r of rows.filter((x) => x.arch === "boss" && !CHAINS[x.zone]).sort((a, b) => a.L - b.L)) {
  bossFloor = Math.max(bossFloor, r.exact);
  r.after = bossFloor;
}
for (const r of rows) {
  if (CHAINS[r.zone] || r.arch === "boss") continue;
  r.after = Math.max(1, Math.round(trashFit(r.L) * (factor[r.arch] ?? 1)));
}

const fmtReal = (x: { won: boolean; left: number }) => (x.won ? `${String(Math.round(x.left * 100)).padStart(3)}%` : "LOSS");
const fightLeft = async (chainZone: string, r: Row) => {
  if (r.arch === "boss" && CHAINS[r.zone]) return fmtReal(await realBossFight(CHAINS[chainZone], r.L, r.id, r.after));
  const p = playerFor(chainZone, r.L);
  const res = fightWith(p, { ...r.m, atk: r.after });
  return res.won ? `${String(Math.round((res.playerHpLeft / p.hp) * 100)).padStart(3)}%` : "LOSS";
};
const nakedResult = async (r: Row) => (r.arch === "boss" && CHAINS[r.zone] ? ((await realBossFight([], r.L, r.id, r.after)).won ? "WIN " : "LOSS") : fightWith(nakedPlayer(r.L), { ...r.m, atk: r.after }).won ? "WIN " : "LOSS");

console.log("zone      monster          L   arch      atk before -> after (exact)   own chain | prev chain | naked   (target)");
for (const r of rows) {
  const own = await fightLeft(r.zone, r);
  const prev = PREV_ZONE[r.zone] ? await fightLeft(PREV_ZONE[r.zone], r) : "  - ";
  const naked = await nakedResult(r);
  console.log(
    `${r.zone.padEnd(9)} ${r.id.padEnd(16)} ${String(r.L).padStart(3)} ${r.arch.padEnd(9)} ${String(r.before).padStart(5)} -> ${String(r.after).padStart(5)} (${String(r.exact).padStart(4)})   ${own}  |  ${prev}  | ${naked}  (${(r.target * 100).toFixed(0)}%)`
  );
}
console.log("\narchetype factors vs the smoothed trash line (locked zones):", JSON.stringify(Object.fromEntries(Object.entries(factor).map(([k, v]) => [k, +v.toFixed(2)]))));

if (write) {
  const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../shared/enhanced_content_pack_chinese.json");
  const raw = readFileSync(file, "utf8");
  const pack = JSON.parse(raw);
  const byId = new Map(rows.map((r) => [r.id, r.after]));
  // Pinned (not solved): the chapter-1 boss keeps its pre-formula pacing — see PINNED above.
  for (const [id, atk] of Object.entries(PINNED)) byId.set(id, atk);
  let changed = 0;
  for (const m of pack.monsters) {
    const next = byId.get(m.id);
    if (next !== undefined && m.atk !== next) {
      m.atk = next;
      changed++;
    }
  }
  // The pack file is `JSON.stringify(pack, null, 1)` byte-for-byte (verified), so only atk lines change.
  const text = JSON.stringify(pack, null, 1) + (raw.endsWith("\n") ? "\n" : "");
  writeFileSync(file, text, "utf8");
  console.log(`\nwrote ${changed} atk value(s) to ${path.basename(file)}`);
}
}
main();
