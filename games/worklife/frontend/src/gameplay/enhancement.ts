/** Frontend mirror of backend enhancement_math.ts (covered by parity tests). */
export const ENHANCEMENT_BONUS_PCT = [
  0, 2, 4.2, 6.6, 9.2, 12, 15, 18.2, 21.6, 25.2, 29,
  33.4, 38.4, 44, 50.2, 57, 64.4, 72.4, 81, 90.2, 100,
] as const;

export const ENHANCEMENT_BASE_SUCCESS = [
  0, 0.5, 0.45, 0.45, 0.4, 0.4, 0.4, 0.35, 0.35, 0.35, 0.35,
  0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3,
] as const;

export const MAX_ENHANCEMENT_LEVEL = 20;

export function enhancementBonusPct(level: number): number {
  const safe = Math.max(0, Math.min(MAX_ENHANCEMENT_LEVEL, Math.floor(level)));
  return ENHANCEMENT_BONUS_PCT[safe];
}

export function enhancementSlotMultiplier(item?: { type?: string; slot?: string }): number {
  return item?.type === "accessory" || item?.slot === "accessory" ? 5 : 1;
}

export function enhancementStatMultiplier(
  level: number,
  item?: { type?: string; slot?: string }
): number {
  return 1 + (enhancementBonusPct(level) * enhancementSlotMultiplier(item)) / 100;
}

type ToolLike = {
  type?: string;
  slot?: string;
  toolFor?: string;
  toolSpeed?: number;
  enhanceSuccess?: number;
};

const pct = (v: number) => Math.round(v * 1000) / 10;

/**
 * One-line effect of a tool-slot item, scaled by its own enhancement level. Speed tools
 * (axe, hammer …) read "<skill>速度 +20%"; the enhancer carries `enhanceSuccess` instead of
 * `toolSpeed` and its skill is not a profession, so it gets its own wording. Returns "" for
 * anything that is not a tool, so callers never format `undefined` into "+NaN%".
 */
export function toolEffectLine(
  item: ToolLike | undefined,
  skillLabel: string | undefined,
  enhancementLevel = 0
): string {
  if (!item?.toolFor) return "";
  const mult = enhancementStatMultiplier(enhancementLevel, item);
  if (Number(item.enhanceSuccess) > 0) {
    return `强化成功率 +${pct(Number(item.enhanceSuccess) * mult)}%（随强化等级放大）`;
  }
  if (Number(item.toolSpeed) > 0) {
    return `${skillLabel || "技能"}速度 +${pct(Number(item.toolSpeed) * mult)}%`;
  }
  return "";
}

export function baseEnhancementSuccess(targetLevel: number): number {
  const safe = Math.max(1, Math.min(MAX_ENHANCEMENT_LEVEL, Math.floor(targetLevel)));
  return ENHANCEMENT_BASE_SUCCESS[safe];
}

export function enhancementSuccessRate(
  targetLevel: number,
  enhancingLevel: number,
  itemLevel: number,
  toolBonus = 0
): number {
  const safeItem = Math.max(1, itemLevel);
  const safeSkill = Math.max(1, enhancingLevel);
  const levelModifier =
    safeSkill >= safeItem ? 1 : Math.min(1, (safeSkill / safeItem + 1) / 2);
  const overLevelBonus = 0.0005 * Math.max(safeSkill - safeItem, 0);
  return Math.max(
    0,
    Math.min(
      1,
      baseEnhancementSuccess(targetLevel) *
        (levelModifier + Math.max(0, toolBonus) + overLevelBonus)
    )
  );
}
