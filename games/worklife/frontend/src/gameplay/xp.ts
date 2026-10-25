/**
 * XP needed to go from `level` to `level + 1`.
 *
 * Mirror of backend `getXpForLevel` in `backend/src/storage.ts`. The server levels a
 * skill up when `skill.xp >= getXpForLevel(skill.level)` and then subtracts that amount,
 * so the UI must call this with the CURRENT level, not `level + 1`.
 * `xp.test.ts` asserts byte-for-byte parity with the backend for every level.
 */
export function xpToNextLevel(level: number): number {
  if (level < 1) return 0;
  if (level >= 200) return Infinity;

  const earlyBaseXP = 40;
  const earlyExp = 1.35;
  if (level <= 15) {
    return Math.floor(earlyBaseXP * Math.pow(level, earlyExp));
  }

  const level15XP = Math.floor(earlyBaseXP * Math.pow(15, earlyExp));
  if (level <= 30) {
    return Math.floor(level15XP + 65 * Math.pow(level - 15, 1.65));
  }

  const level30XP = Math.floor(level15XP + 65 * Math.pow(15, 1.65));
  if (level <= 100) {
    return Math.floor(level30XP + 56 * Math.pow(level - 30, 1.96));
  }

  const level100XP = Math.floor(level30XP + 56 * Math.pow(70, 1.96));
  const d = level - 100;
  return Math.floor(level100XP + 9500 * d + 110 * Math.pow(d, 2.15));
}

export function xpProgress(level: number, xp: number): { need: number; pct: number; remaining: number } {
  const need = xpToNextLevel(level);
  if (!Number.isFinite(need) || need <= 0) return { need, pct: 100, remaining: 0 };
  const clamped = Math.max(0, xp || 0);
  return { need, pct: Math.min(100, (clamped / need) * 100), remaining: Math.max(0, need - clamped) };
}
