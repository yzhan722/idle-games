/** Frontend mirror of backend enhancement_math.ts; the curves themselves come from growthCurves.ts. */
import { ENHANCE_MAX_LEVEL, enhanceBaseChance, enhanceBonusPct, enhanceFinalChance } from "./growthCurves";

export const MAX_ENHANCEMENT_LEVEL = ENHANCE_MAX_LEVEL;

export function enhancementBonusPct(level: number): number {
  return enhanceBonusPct(level);
}

/** Mirror of backend enhancementSlotMultiplier: every slot enhances at 1× (jewelry no longer 5×). */
export function enhancementSlotMultiplier(_item?: { type?: string; slot?: string }): number {
  return 1;
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
    return `强化成功率 ×${Math.round((1 + Number(item.enhanceSuccess) * mult) * 10000) / 10000}（随强化等级放大）`;
  }
  if (Number(item.toolSpeed) > 0) {
    return `${skillLabel || "技能"}速度 +${pct(Number(item.toolSpeed) * mult)}%`;
  }
  return "";
}

export function baseEnhancementSuccess(targetLevel: number): number {
  return enhanceBaseChance(targetLevel);
}

export function enhancementSuccessRate(
  targetLevel: number,
  enhancingLevel: number,
  itemLevel: number,
  toolBonus = 0
): number {
  return enhanceFinalChance(targetLevel, enhancingLevel, itemLevel, toolBonus);
}
