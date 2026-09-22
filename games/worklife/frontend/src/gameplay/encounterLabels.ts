import type { Encounter } from "./encounters";

const ARCHETYPE: Record<string, string> = {
  ordinary: "均衡",
  tank: "高防",
  fast: "快攻",
  slow: "迟缓",
  boss: "首领",
};

const MECHANIC: Record<string, string> = {
  guard_60: "六成血格挡",
  nature_wrath_30: "三成血狂怒",
};

export function archetypeLabel(archetype: string | undefined): string {
  return ARCHETYPE[archetype || ""] || "森林";
}

export function mechanicLabels(mechanics?: string[]): string[] {
  return (mechanics || []).map((id) => MECHANIC[id] || id);
}

/**
 * Level-gap heuristic. The UI now labels encounters from `fightPreview.ts` (a deterministic
 * simulation of the actual fight); this stays only as a coarse fallback when no sheet is available.
 */
export function encounterDifficulty(playerCombatLevel: number, monsterLevel: number): string {
  const delta = monsterLevel - (playerCombatLevel || 1);
  if (delta <= -2) return "轻松";
  if (delta <= 0) return "适中";
  if (delta === 1) return "吃力";
  return "危险";
}

export function encounterRewardLine(monster: Pick<Encounter, "xp" | "gold">): string {
  return `${monster.xp} XP · ${monster.gold} 金`;
}
