/**
 * 稀有发现：战斗掉落的倍率。分两层，层内相加，两层相乘。
 *
 * - 通用层：装备、增益、房屋、星盘、词缀、圣物、天空锻炉……所有来源的百分比相加，单人与组队都算。
 * - 独行层：词缀、圣物、天空锻炉三样相加，再乘 soloFactor，只在单人战斗算。
 * - 界面写的就是结算用的：来源写「+26% · 单人再 +31.2%」，角色面板写最终倍率。
 * - 前后端各有一份逐字相同的拷贝：backend/src/rare_find.ts 与 frontend/src/gameplay/rareFind.ts
 *   （scripts/rare-find-parity.test.ts 比对）。来由与新旧对比见 docs/design/OWN_CURVES.md 第 5 节。
 */
export const RARE_FIND = { soloFactor: 1.2 } as const;

/** 三样来源合计百分点 → 独行层的百分比（1 位小数）。 */
export function soloRarePct(points: number): number {
  return Math.round(points * RARE_FIND.soloFactor * 10) / 10;
}

/** 通用层倍率，也就是组队的倍率。 */
export function rareFindMult(totalPct: number): number {
  return Math.max(0, 1 + totalPct / 100);
}

/** 单人战斗的倍率 = 通用层 × 独行层。 */
export function soloRareFindMult(totalPct: number, soloSourcePoints: number): number {
  return rareFindMult(totalPct) * rareFindMult(soloRarePct(soloSourcePoints));
}

/** 三样来源在界面上的写法。 */
export function rareFindText(points: number): string {
  const signed = (n: number) => `${n > 0 ? "+" : ""}${n}%`;
  return `${signed(points)} · 单人再 ${signed(soloRarePct(points))}`;
}
