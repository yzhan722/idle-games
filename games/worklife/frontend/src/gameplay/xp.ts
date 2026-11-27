import { xpForLevel } from "./growthCurves";

/**
 * XP needed to go from `level` to `level + 1`.
 *
 * Same curve as backend `getXpForLevel` (growth_curves.ts). The server levels a skill up when
 * `skill.xp >= getXpForLevel(skill.level)` and then subtracts that amount, so the UI must call
 * this with the CURRENT level, not `level + 1`. `scripts/xp-parity.test.ts` checks every level.
 */
export function xpToNextLevel(level: number): number {
  return xpForLevel(level);
}

export function xpProgress(level: number, xp: number): { need: number; pct: number; remaining: number } {
  const need = xpToNextLevel(level);
  if (!Number.isFinite(need) || need <= 0) return { need, pct: 100, remaining: 0 };
  const clamped = Math.max(0, xp || 0);
  return { need, pct: Math.min(100, (clamped / need) * 100), remaining: Math.max(0, need - clamped) };
}
