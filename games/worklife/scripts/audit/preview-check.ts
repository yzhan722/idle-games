import pack from "../../shared/enhanced_content_pack_chinese.json";
import { previewFight, previewAbilities, difficultyFromPreview, previewLine } from "../../frontend/src/gameplay/fightPreview";
import { combatSheetFromPack } from "../../frontend/src/gameplay/combatSheet";
const P: any = pack;
const mon = (id: string) => P.monsters.find((m: any) => m.id === id);
function sheetFor(build: string | null, chest: boolean, level: number) {
  const eq: any = { main_hand: "weapon_wooden_sword" }; if (chest) eq.chest = "armor_wood_chest";
  const skills: any = {}; for (const k of ["stamina","intelligence","attack","defense","melee","ranged","magic"]) skills[k] = { level, xp: 0 };
  const state: any = { equipment: eq, inventory: {}, combatSkills: skills, chapter1Build: build };
  return combatSheetFromPack(state, P.items, P.equipmentSets);
}
const abil = previewAbilities([{ abilityId: "heavy_chop", trigger: { type: "always" } } as any], undefined, undefined, 1);
for (const [label, build, chest, lvl] of [["sword only L1", null, false, 1], ["sword+bark L1", "thick_bark", false, 1], ["sword+edge L1", "sharpened_edge", false, 1], ["sword+bark L2", "thick_bark", false, 2], ["sword+bark+chest L4", "thick_bark", true, 4]] as const) {
  for (const id of ["slime", "crab", "monkey"]) {
    const r = previewFight(sheetFor(build as any, chest, lvl), mon(id), abil);
    console.log(`${label.padEnd(22)} ${id.padEnd(8)} ${r.won ? "WIN " : "LOSS"} hpLeft ${String(Math.round(r.playerHpLeftPct * 100)).padStart(3)}%  ${difficultyFromPreview(r)}`);
  }
}
