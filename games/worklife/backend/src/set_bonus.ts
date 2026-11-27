import { attackSpeedPct } from "./combat_secondary";

/**
 * Set bonuses: only the HIGHEST satisfied tier applies.
 *
 * The content pack words every tier as a total ("3件套：攻击+10，防御+8"), so a 3-piece wearer gets
 * +10/+8 — not the 2-piece bonus stacked under it. Summing every satisfied tier inflated the top
 * tiers by 1.5–1.75× (omega 4-piece: +1350/+910 against a stated +900/+520). One helper so the
 * combat stats, the production buffs and the set-list endpoints cannot drift apart again; the
 * frontend mirrors it in `combatSheet.activeSetBonuses`.
 */
export type SetBonusLike = { requiredPieces?: number; stats?: Record<string, number> };

export function highestActiveBonus<T extends SetBonusLike>(
  bonuses: T[] | undefined,
  equippedPieces: number
): T | undefined {
  let best: T | undefined;
  for (const bonus of bonuses || []) {
    const need = bonus.requiredPieces || 99;
    if (equippedPieces < need) continue;
    if (!best || need >= (best.requiredPieces || 99)) best = bonus;
  }
  return best;
}

const SET_STAT_TEXT: ReadonlyArray<readonly [string, string, string]> = [
  ["atk", "攻击", ""],
  ["def", "防御", ""],
  ["gatherSpeed", "采集速度", "%"],
  ["craftSpeed", "制作速度", "%"],
  ["xpGain", "生活技能经验", "%"],
];

/**
 * 一档套装的说明文字，只写真会结算的：combatSpeed 按 attackSpeedPct 折成真正的攻击速度；goldGain（套装金币）没有任何结算读取，不写。
 * 内容包里的 description 必须等于它（damage_model.test.ts 守着）。
 */
export function setBonusText(bonus: SetBonusLike): string {
  const parts = SET_STAT_TEXT.filter(([key]) => bonus.stats?.[key]).map(([key, name, unit]) => `${name}+${bonus.stats![key]}${unit}`);
  const speed = attackSpeedPct(Number(bonus.stats?.combatSpeed || 0));
  if (speed > 0) parts.push(`攻击速度+${speed}%`);
  return `${bonus.requiredPieces}件套：${parts.join("，")}`;
}
