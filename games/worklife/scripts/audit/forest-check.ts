import { createMemoryStorage } from "../../backend/src/storage_memory";
import pack from "../../shared/enhanced_content_pack_chinese.json";
import { startHpCombat, tickHpCombat, chooseBuild } from "../../backend/src/hp_combat";
import { defaultCombatSkills } from "../../backend/src/combat_skills";
import { CHAINS } from "./zone-chains";
const P: any = pack;
const bossAtk = Number(process.env.FOREST_BOSS_ATK || 0);
const noGate = { ...P, monsters: P.monsters.map((m: any) => (bossAtk && m.id === "forest_boss" ? { ...m, atk: bossAtk } : m)), actions: P.actions.map((a: any) => String(a.id).startsWith("act_combat_") ? { ...a, requirements: {} } : a) };
async function run(label: string, L: number, chain: Array<[string, string]>, build: "sharpened_edge" | "thick_bark" | null, monster: string, abilities: string[]) {
  const st = createMemoryStorage();
  const u = await st.findOrCreateGuestUser("x" + Math.random());
  const s: any = await st.getOrCreatePlayerState(u.id, "1");
  for (const [slot, id] of chain) { s.equipment[slot] = id; s.inventory[id] = 1; }
  s.combatSkills = defaultCombatSkills(L);
  if (build) chooseBuild(s, build);
  s.abilities = { ...(s.abilities || {}) }; for (const a of abilities) s.abilities[a] = { level: 1, xp: 0 };
  s.abilityLoadout = ["heavy_chop", ...abilities].map((id) => ({ abilityId: id, trigger: { type: "always" } }));
  if (abilities.includes("minor_heal")) s.abilityLoadout = s.abilityLoadout.map((x: any) => x.abilityId === "minor_heal" ? { ...x, trigger: { type: "self_hp_below", pct: 50 } } : x);
  const t0 = new Date("2026-09-02T00:00:00Z");
  s.hpCombat = startHpCombat(s, noGate, monster, t0);
  tickHpCombat(s, noGate, new Date(t0.getTime() + 600_000), 600_000, () => 0.99);
  const e = s.hpCombat;
  console.log(`${label.padEnd(46)} ${monster.padEnd(12)} ${e.outcome} hp ${Math.round(e.playerHp)}/${e.playerMaxHp}  fight ${(e.log.length)} log lines`);
}
(async () => {
  const kit1: Array<[string, string]> = [["main_hand", "weapon_wooden_sword"], ["chest", "armor_wood_chest"]];
  for (const L of [10, 12, 15]) {
    for (const build of ["thick_bark", "sharpened_edge"] as const) {
      await run(`L${L} sword+chest ${build}, heavy chop only`, L, kit1, build, "forest_boss", []);
      await run(`L${L} sword+chest ${build}, +smash/brace/heal`, L, kit1, build, "forest_boss", ["smash", "brace", "minor_heal"]);
    }
  }
})();
