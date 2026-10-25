/**
 * Deterministic trace of the boss fights, for proving a refactor changed nothing:
 *
 *   node --import tsx scripts/audit/boss-trace.ts <out.json>
 *
 * Runs every boss through the REAL hp_combat engine (so guard / wrath / telegraph / enrage / ability
 * interplay are all exercised) with a spread of kits, tick granularities and manual heavy-chop
 * timings, and writes the complete log + state after every step. Run it before and after touching the
 * mechanics code and diff the two files: they must be byte-identical.
 */
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createMemoryStorage } from "../../backend/src/storage_memory";
import pack from "../../shared/enhanced_content_pack_chinese.json";
import { chooseBuild, startHpCombat, tickHpCombat, tryHeavyChop, tryCastAbility } from "../../backend/src/hp_combat";
import { defaultCombatSkills } from "../../backend/src/combat_skills";
import { CHAINS } from "./zone-chains";

const P: any = pack;
const noGate = { ...P, actions: P.actions.map((a: any) => (String(a.id).startsWith("act_combat_") ? { ...a, requirements: {} } : a)) };
type Kit = { label: string; L: number; chain: Array<[string, string]>; build: "sharpened_edge" | "thick_bark" | null; books: string[] };
const KITS: Kit[] = [
  { label: "L10 sword+chest bark heavy", L: 10, chain: [["main_hand", "weapon_wooden_sword"], ["chest", "armor_wood_chest"]], build: "thick_bark", books: [] },
  { label: "L12 sword+chest edge books", L: 12, chain: [["main_hand", "weapon_wooden_sword"], ["chest", "armor_wood_chest"]], build: "sharpened_edge", books: ["smash", "brace", "minor_heal"] },
  { label: "L15 sword+chest bark books", L: 15, chain: [["main_hand", "weapon_wooden_sword"], ["chest", "armor_wood_chest"]], build: "thick_bark", books: ["smash", "brace", "minor_heal"] },
  { label: "L10 forest chain", L: 10, chain: CHAINS.forest as any, build: null, books: [] },
  { label: "L20 mine chain", L: 20, chain: CHAINS.mine as any, build: null, books: ["smash", "brace"] },
  { label: "L6 naked", L: 6, chain: [], build: null, books: [] },
];
const BOSSES = ["forest_boss", "mine_boss", "swamp_boss", "snow_boss", "volcano_boss"];
const STEPS = [50, 700, 1500, 4000];

async function run(kit: Kit, boss: string, step: number, manualChop: boolean) {
  const st = createMemoryStorage();
  const u = await st.findOrCreateGuestUser(`t${Math.random()}`);
  const s: any = await st.getOrCreatePlayerState(u.id, "1");
  for (const [slot, id] of kit.chain) {
    s.equipment[slot] = id;
    s.inventory[id] = 1;
  }
  s.combatSkills = defaultCombatSkills(kit.L);
  if (kit.build) chooseBuild(s, kit.build);
  s.abilities = { ...(s.abilities || {}) };
  for (const a of kit.books) s.abilities[a] = { level: 1, xp: 0 };
  s.abilityLoadout = manualChop
    ? []
    : ["heavy_chop", ...kit.books].map((id) => ({ abilityId: id, trigger: id === "minor_heal" ? { type: "self_hp_below", pct: 50 } : { type: "always" } }));
  const t0 = new Date("2026-09-02T00:00:00Z");
  s.hpCombat = startHpCombat(s, noGate, boss, t0);
  const frames: unknown[] = [];
  let t = 0;
  while (t < 240_000 && !s.hpCombat.outcome) {
    t += step;
    const now = new Date(t0.getTime() + t);
    tickHpCombat(s, noGate, now, step, () => 0.99);
    if (manualChop && !s.hpCombat.outcome && t % 3000 < step) tryHeavyChop(s, noGate, now, () => 0.99);
    if (manualChop && !s.hpCombat.outcome && t % 9000 < step) tryCastAbility(s, noGate, "heavy_chop", now, () => 0.99);
    const e = s.hpCombat;
    frames.push({ t, hp: e.playerHp, ehp: e.enemyHp, g: e.guardActive, gu: e.guardUsed, gt: e.guardTelegraphed, w: e.wrathActive, int: e.enemyIntervalMs, en: e.enrageStacks, out: e.outcome, log: e.log.length });
  }
  const e = s.hpCombat;
  return { kit: kit.label, boss, step, manualChop, outcome: e.outcome, playerHp: e.playerHp, enemyHp: e.enemyHp, log: e.log, frames };
}

(async () => {
  const out: unknown[] = [];
  for (const kit of KITS) for (const boss of BOSSES) for (const step of STEPS) for (const manual of [false, true]) out.push(await run(kit, boss, step, manual));
  const text = JSON.stringify(out);
  const file = process.argv[2];
  if (file) writeFileSync(file, text);
  const wins = (out as any[]).filter((r) => r.outcome === "win").length;
  console.log(`scenarios ${out.length} | wins ${wins} | sha256 ${createHash("sha256").update(text).digest("hex")}`);
})();
