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
