import { createMemoryStorage } from "../../backend/src/storage_memory";
import pack from "../../shared/enhanced_content_pack_chinese.json";
import { startHpCombat, tickHpCombat } from "../../backend/src/hp_combat";
import { defaultCombatSkills } from "../../backend/src/combat_skills";
import { CHAINS } from "./zone-chains";
const P: any = pack;
const gate = (p: any) => ({ ...p, actions: p.actions.map((a: any) => (String(a.id).startsWith("act_combat_") ? { ...a, requirements: {} } : a)) });
const withMech = gate(P);
const noMech = gate({ ...P, monsters: P.monsters.map((m: any) => (m.id === "mine_boss" ? { ...m, mechanics: [] } : m)) });
async function run(packX: any, label: string, books: string[], loadout: string[]) {
  const st = createMemoryStorage(); const u = await st.findOrCreateGuestUser("p" + Math.random());
  const s: any = await st.getOrCreatePlayerState(u.id, "1");
  for (const [slot, id] of CHAINS.mine) { s.equipment[slot] = id; s.inventory[id] = 1; }
  s.combatSkills = defaultCombatSkills(20);
  s.abilities = { ...(s.abilities || {}) }; for (const b of books) s.abilities[b] = { level: 1, xp: 0 };
  s.abilityLoadout = loadout.map((id) => ({ abilityId: id, trigger: id === "minor_heal" ? { type: "self_hp_below", pct: 50 } : { type: "always" } }));
  const t0 = new Date("2026-09-02T00:00:00Z"); s.hpCombat = startHpCombat(s, packX, "mine_boss", t0);
  for (let t = 1000; t <= 400_000 && !s.hpCombat.outcome; t += 1000) tickHpCombat(s, packX, new Date(t0.getTime() + t), 1000, () => 0.99);
  const e = s.hpCombat; const pct = Math.round((e.playerHp / e.playerMaxHp) * 100);
  return `${label.padEnd(44)} ${e.outcome === "win" ? "WIN " : "LOSS"} ${e.outcome === "win" ? pct + "% HP left" : ""}  (boss attacks ${e.bossHits ?? "-"}, ${Math.round((e.startedAt ? 0 : 0))}s)`;
}
(async () => {
  for (const [label, books, loadout] of [["heavy chop only", [], ["heavy_chop"]], ["heavy + 坚守 (auto, always)", ["brace"], ["heavy_chop", "brace"]], ["heavy + 坚守 + 小治疗", ["brace", "minor_heal"], ["heavy_chop", "brace", "minor_heal"]]] as const) {
    console.log("WITHOUT rockfall |", await run(noMech, label, books as any, loadout as any));
    console.log("WITH rockfall    |", await run(withMech, label, books as any, loadout as any));
  }
})();
