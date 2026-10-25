import type {
  EnhancedContentPack,
  EnhancedPlayerState,
  EnhancementRequest,
  EnhancementResult,
} from "./types";

/** MWI's exact stat bonus table. Index = enhancement level. */
export const ENHANCEMENT_BONUS_PCT = [
  0, 2, 4.2, 6.6, 9.2, 12, 15, 18.2, 21.6, 25.2, 29,
  33.4, 38.4, 44, 50.2, 57, 64.4, 72.4, 81, 90.2, 100,
] as const;

/** MWI's exact base success table. Index = target enhancement level. */
export const ENHANCEMENT_BASE_SUCCESS = [
  0, 0.5, 0.45, 0.45, 0.4, 0.4, 0.4, 0.35, 0.35, 0.35, 0.35,
  0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3,
] as const;

export const MAX_ENHANCEMENT_LEVEL = 20;
export const PROTECTION_MIRROR_ID = "mirror_protection";

type ItemLike = {
  id: string;
  name?: string;
  type?: string;
  slot?: string;
  tier?: number;
  atk?: number;
  def?: number;
  mag?: number;
  hp?: number;
};

type RuleLike = EnhancedContentPack["enhancementRules"][number];
type SkillLike = { level: number; xp: number; unlockedRecipes: string[]; enhancementLevel: number };

export function enhancementBonusPct(level: number): number {
  const safe = Math.max(0, Math.min(MAX_ENHANCEMENT_LEVEL, Math.floor(level)));
  return ENHANCEMENT_BONUS_PCT[safe];
}

/**
 * Every slot, jewelry included, receives the normal enhancement bonus (1×). Jewelry used to get 5×,
 * which made a +20 low-tier ring (×6.0) worth more than a whole tier of gear (×2.0) and turned
 * the two accessory slots into the strongest stat source in the game. Kept as a function so the
 * item-shaped callers (storage, UI payload) do not change.
 */
export function enhancementSlotMultiplier(_item: Pick<ItemLike, "type" | "slot"> | undefined): number {
  return 1;
}

/** Multiplier for an item's base stats, e.g. +10 normal gear = 1.29. */
export function enhancementStatMultiplier(
  level: number,
  item?: Pick<ItemLike, "type" | "slot">
): number {
  return 1 + (enhancementBonusPct(level) * enhancementSlotMultiplier(item)) / 100;
}

export function baseEnhancementSuccess(targetLevel: number): number {
  const safe = Math.max(1, Math.min(MAX_ENHANCEMENT_LEVEL, Math.floor(targetLevel)));
  return ENHANCEMENT_BASE_SUCCESS[safe];
}

/**
 * Content uses 12-level tier bands. Prefer the producing recipe's requirement; fall back to the
 * first level of the item's tier. This gives success math a real item level without hardcoding ids.
 */
export function itemLevelForEnhancement(item: ItemLike, pack: EnhancedContentPack): number {
  const levels = (pack.actions as Array<{
    requirements?: { skillLevel?: number };
    yields?: Array<{ itemId: string }>;
  }>)
    .filter((a) => a.yields?.some((y) => y.itemId === item.id))
    .map((a) => Number(a.requirements?.skillLevel || 1))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (levels.length) return Math.min(...levels);
  return 1 + Math.max(0, Number(item.tier || 1) - 1) * 12;
}

export type EnhancementSuccessBreakdown = {
  targetLevel: number;
  enhancingLevel: number;
  itemLevel: number;
  baseRate: number;
  levelModifier: number;
  overLevelBonus: number;
  toolBonus: number;
  finalRate: number;
};

/**
 * MWI:
 * final = base × (level modifier + tool/achievement bonus + 0.05% per level over item level).
 * Enhancer tools are not content yet, so callers normally pass toolBonus = 0.
 */
export function enhancementSuccessBreakdown(
  targetLevel: number,
  enhancingLevel: number,
  itemLevel: number,
  toolBonus = 0
): EnhancementSuccessBreakdown {
  const safeItem = Math.max(1, itemLevel);
  const safeSkill = Math.max(1, enhancingLevel);
  const baseRate = baseEnhancementSuccess(targetLevel);
  const levelModifier =
    safeSkill >= safeItem ? 1 : Math.min(1, (safeSkill / safeItem + 1) / 2);
  const overLevelBonus = 0.0005 * Math.max(safeSkill - safeItem, 0);
  const finalRate = Math.max(
    0,
    Math.min(1, baseRate * (levelModifier + Math.max(0, toolBonus) + overLevelBonus))
  );
  return {
    targetLevel,
    enhancingLevel: safeSkill,
    itemLevel: safeItem,
    baseRate,
    levelModifier,
    overLevelBonus,
    toolBonus: Math.max(0, toolBonus),
    finalRate,
  };
}

/** MWI base XP; failures award 10% of the success XP. */
export function enhancementXp(itemLevel: number, currentLevel: number, success: boolean): number {
  const base = 1.4 * (1 + Math.max(0, currentLevel)) * (10 + Math.max(1, itemLevel));
  return Math.round(base * (success ? 1 : 0.1) * 10) / 10;
}

export function ensureEnhancingSkill(player: EnhancedPlayerState): SkillLike {
  if (!player.skills.skill_enhancing) {
    player.skills.skill_enhancing = {
      level: 1,
      xp: 0,
      unlockedRecipes: [],
      enhancementLevel: 0,
    };
  }
  return player.skills.skill_enhancing;
}

export function grantEnhancingXp(
  player: EnhancedPlayerState,
  xp: number,
  xpForLevel: (level: number) => number
): { level: number; levelUps: number[] } {
  const skill = ensureEnhancingSkill(player);
  skill.xp = Math.round((skill.xp + Math.max(0, xp)) * 10) / 10;
  const levelUps: number[] = [];
  while (skill.level < 200 && skill.xp >= xpForLevel(skill.level)) {
    skill.xp = Math.round((skill.xp - xpForLevel(skill.level)) * 10) / 10;
    skill.level += 1;
    levelUps.push(skill.level);
  }
  return { level: skill.level, levelUps };
}

export function enhancementMaterials(
  rule: RuleLike,
  targetLevel: number,
  protectionItemId?: string,
  item?: ItemLike,
  pack?: EnhancedContentPack
): Record<string, number> {
  const out: Record<string, number> = {};
  const knownIds = pack ? new Set((pack.items as ItemLike[]).map((i) => i.id)) : undefined;
  const tier = Math.max(1, Number(item?.tier || 1));
  for (const material of rule.materials) {
    // 高阶装备吃同族高阶材料：T5 装备的强化消耗 ingot_5 而不是 ingot_1——
    // 否则强化系统永远只烧 T1 材料，高阶 lumber/ingot/yarn 全是只能卖店的死物。
    let itemId = material.itemId;
    if (item && knownIds && tier > 1) {
      const m = /^(.+)_\d+$/.exec(itemId);
      if (m) {
        const candidate = `${m[1]}_${tier}`;
        if (knownIds.has(candidate)) itemId = candidate;
      }
    }
    out[itemId] = (out[itemId] || 0) + material.quantity * targetLevel;
  }
  if (protectionItemId) out[protectionItemId] = (out[protectionItemId] || 0) + 1;
  return out;
}

/**
 * MWI enhancing tools: the equipped tool's `enhanceSuccess` (e.g. 0.006 = +0.6%), scaled by the
 * tool's own enhancement level at the normal 1× rate.
 */
export function equippedEnhanceToolBonus(player: EnhancedPlayerState, pack: EnhancedContentPack): number {
  const toolId = player.equipment?.tool;
  if (!toolId) return 0;
  // 损坏的工具不提供帮助（耐久语义与幽灵槽一致）
  const dur = (player.equipment as { durability?: Record<string, number> }).durability?.[toolId];
  if (typeof dur === "number" && Number.isFinite(dur) && dur <= 0) return 0;
  const tool = (pack.items as Array<ItemLike & { toolFor?: string; enhanceSuccess?: number }>).find((i) => i.id === toolId);
  if (!tool || tool.toolFor !== "skill_enhancing" || !(Number(tool.enhanceSuccess) > 0)) return 0;
  const enh = Number(player.equipment.enhancementLevels?.[toolId] || 0);
  return Number(tool.enhanceSuccess) * enhancementStatMultiplier(enh, tool);
}

export function ownsEnhanceableItem(player: EnhancedPlayerState, itemId: string): boolean {
  if ((player.inventory[itemId] || 0) > 0) return true;
  return Object.entries(player.equipment || {}).some(
    ([slot, value]) =>
      !["enhancementLevels", "durability", "maxDurability"].includes(slot) &&
      typeof value === "string" &&
      value === itemId
  );
}

type AttemptInput = {
  player: EnhancedPlayerState;
  item: ItemLike;
  rule: RuleLike;
  request: EnhancementRequest;
  pack: EnhancedContentPack;
  rng?: () => number;
  xpForLevel: (level: number) => number;
  toolBonus?: number;
};

/**
 * Mutates one player state atomically in memory. Persistence / DB locks stay with the storage
 * adapter. Validation failures consume nothing. A real roll failure consumes materials and:
 * - no protection → +0
 * - Mirror of Protection → current level - 1
 */
export function performEnhancementAttempt(input: AttemptInput): EnhancementResult {
  const { player, item, rule, request, pack, xpForLevel } = input;
  const currentLevel = Number(player.equipment.enhancementLevels?.[request.itemId] || 0);
  const baseResult = {
    previousLevel: currentLevel,
    newLevel: currentLevel,
    consumedMaterials: {} as Record<string, number>,
  };
  if (!ownsEnhanceableItem(player, request.itemId)) {
    return { success: false, ...baseResult, failureReason: "物品不存在" };
  }
  if (request.targetLevel !== currentLevel + 1) {
    return { success: false, ...baseResult, failureReason: "只能逐级强化" };
  }
  const maxLevel = Math.min(MAX_ENHANCEMENT_LEVEL, Number(rule.maxLevel || MAX_ENHANCEMENT_LEVEL));
  if (request.targetLevel > maxLevel) {
    return {
      success: false,
      ...baseResult,
      failureReason: `强化等级不能超过 +${maxLevel}`,
    };
  }
  if (
    request.protectionItemId &&
    request.protectionItemId !== PROTECTION_MIRROR_ID
  ) {
    return { success: false, ...baseResult, failureReason: "不支持的保护道具" };
  }

  const materials = enhancementMaterials(
    rule,
    request.targetLevel,
    request.protectionItemId,
    item,
    pack
  );
  for (const [itemId, required] of Object.entries(materials)) {
    if ((player.inventory[itemId] || 0) < required) {
      return {
        success: false,
        ...baseResult,
        failureReason: `材料不足：${itemId} (需要 ${required}, 拥有 ${player.inventory[itemId] || 0})`,
      };
    }
  }

  const skill = ensureEnhancingSkill(player);
  const itemLevel = itemLevelForEnhancement(item, pack);
  const breakdown = enhancementSuccessBreakdown(
    request.targetLevel,
    skill.level,
    itemLevel,
    input.toolBonus ?? equippedEnhanceToolBonus(player, pack)
  );
  const success = (input.rng || Math.random)() < breakdown.finalRate;

  for (const [itemId, required] of Object.entries(materials)) {
    player.inventory[itemId] -= required;
    if (player.inventory[itemId] <= 0) delete player.inventory[itemId];
  }

  if (!player.equipment.enhancementLevels) player.equipment.enhancementLevels = {};
  const protectedFailure = !success && !!request.protectionItemId;
  const newLevel = success
    ? request.targetLevel
    : protectedFailure
      ? Math.max(0, currentLevel - 1)
      : 0;
  player.equipment.enhancementLevels[request.itemId] = newLevel;

  const xpGained = enhancementXp(itemLevel, currentLevel, success);
  const xp = grantEnhancingXp(player, xpGained, xpForLevel);
  if (player.stats) {
    player.stats.totalEnhancements = (player.stats.totalEnhancements || 0) + 1;
    player.stats.totalXpEarned = (player.stats.totalXpEarned || 0) + xpGained;
  }

  return {
    success,
    previousLevel: currentLevel,
    newLevel,
    consumedMaterials: materials,
    protected: protectedFailure,
    protectionItemId: request.protectionItemId,
    successRate: breakdown.finalRate,
    xpGained,
    enhancingLevel: xp.level,
    levelUps: xp.levelUps,
    statBonusPct: enhancementBonusPct(newLevel) * enhancementSlotMultiplier(item),
    failureReason: success
      ? undefined
      : protectedFailure
        ? `强化失败：保护镜生效，强化从 +${currentLevel} 降到 +${newLevel}`
        : `强化失败：强化从 +${currentLevel} 重置为 +0`,
  };
}
