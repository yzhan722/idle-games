/**
 * 区域精华（WL-G3）：11 个战斗区域各有一种精华，怪物低概率掉落；用途只接进已有的强化。
 *
 * - 前后端各有一份逐字相同的拷贝：backend/src/zone_essence.ts 与 frontend/src/gameplay/zoneEssence.ts。
 *   scripts/dungeon-essence-parity.test.ts 会比对两份文件，改一边必须同步另一边。
 * - 参数只写在这里；数值与理由见 docs/design/OWN_CURVES.md「区域精华」。只放纯函数，不引用其他模块。
 * - 沼泽、熔岩、裂境、创世、终焉沿用内容包里已有的五种精华；其余六种是新物品，图标先借用意思最近的材料图。
 */

/** 区域 → 精华物品 id。顺序就是区域顺序。 */
export const ZONE_ESSENCE: Readonly<Record<string, string>> = {
  forest: "essence_forest",
  mine: "essence_mine",
  swamp: "ghost_essence",
  snow: "essence_snow",
  volcano: "magma_essence",
  abyss: "essence_abyss",
  celestial: "essence_celestial",
  rift: "space_essence",
  inferno: "essence_inferno",
  genesis: "divine_essence",
  omega: "cosmos_essence",
};

/** 每种精华的阶（与内容包里物品的 tier 相同）：强化哪一阶的装备用哪一种。 */
export const ESSENCE_TIER: Readonly<Record<string, number>> = {
  essence_forest: 1,
  essence_mine: 2,
  ghost_essence: 3,
  essence_snow: 5,
  magma_essence: 6,
  essence_abyss: 7,
  essence_celestial: 8,
  space_essence: 9,
  essence_inferno: 10,
  divine_essence: 11,
  cosmos_essence: 12,
};

export const ESSENCE_RULES = {
  /** 每击败一只普通怪掉 1 个的概率（再乘难度档位掉率与稀有发现）。 */
  dropChance: 0.01,
  /** 首领的掉率。 */
  bossDropChance: 0.06,
  /** 强化辅料：每次尝试多耗 1 个，成功率乘数里加这一份（与强化工具同一处相加）。 */
  enhanceBonus: 0.1,
  /** 每次强化尝试耗几个。 */
  enhanceCost: 1,
} as const;

/** 这个区域的精华；不是战斗区域（竞技场等）返回 undefined。 */
export function zoneEssenceId(zoneId: string | undefined): string | undefined {
  return zoneId ? ZONE_ESSENCE[zoneId] : undefined;
}

export function isZoneEssence(itemId: string): boolean {
  return ESSENCE_TIER[itemId] !== undefined;
}

/** 一只怪的精华基础掉率（未乘档位与稀有发现）。 */
export function essenceBaseChance(isBoss: boolean): number {
  return isBoss ? ESSENCE_RULES.bossDropChance : ESSENCE_RULES.dropChance;
}

/** 强化这一阶装备要用哪种精华：阶不低于装备的最低一种，超过最高阶用最高阶。 */
export function essenceForItemTier(itemTier: unknown): string {
  const t = Math.max(1, Math.floor(Number(itemTier) || 1));
  const sorted = Object.entries(ESSENCE_TIER).sort((a, b) => a[1] - b[1]);
  return (sorted.find(([, tier]) => tier >= t) || sorted[sorted.length - 1])[0];
}

/** 这种精华能辅助强化哪几阶装备：[最低阶, 最高阶]。 */
export function essenceItemTierRange(essenceId: string): [number, number] | undefined {
  const tier = ESSENCE_TIER[essenceId];
  if (tier === undefined) return undefined;
  const below = Object.values(ESSENCE_TIER).filter((t) => t < tier);
  return [below.length ? Math.max(...below) + 1 : 1, tier];
}

/** 物品提示里的一行用途。 */
export function essenceUseLine(essenceId: string): string | undefined {
  const range = essenceItemTierRange(essenceId);
  if (!range) return undefined;
  const tiers = range[0] === range[1] ? `T${range[0]}` : `T${range[0]}–T${range[1]}`;
  return `强化 ${tiers} 装备时可加入：成功率约 +${Math.round(ESSENCE_RULES.enhanceBonus * 100)}%，每次 ${ESSENCE_RULES.enhanceCost} 个`;
}
