import { highestActiveBonus } from "./set_bonus";
import { EQUIP_SLOT_KEYS } from "./equipment_equip";
import { syncAchievements } from "./progression";
import { isStageOpen } from "./zones";
import {
  findEnhancementRuleForItem,
  hasEnhancementSkill,
  enhancementUnlockIds,
} from "./enhancement_utils";
import {
  MAX_ENHANCEMENT_LEVEL,
  PROTECTION_MIRROR_ID,
  enhancementBonusPct,
  enhancementMaterials,
  enhancementSlotMultiplier,
  enhancementStatMultiplier,
  enhancementSuccessBreakdown,
  ensureEnhancingSkill,
  equippedEnhanceToolBonus,
  itemLevelForEnhancement,
  ownsEnhanceableItem,
  performEnhancementAttempt,
} from "./enhancement_math";
import {
  appendLog,
  getXpForLevel,
  grantProfessionXp,
  ensureProfessionSkills,
  professionLevelForTree,
  CRAFT_SKILL_BY_PROFESSION,
  isDurabilityBroken,
} from "./storage";
import type {
  EnhancedPlayerState,
  EnhancedContentPack,
  EnhancementRequest,
  EnhancementResult,
  DurabilityInfo,
  RepairRequest,
  RepairResult,
  PriceHistory,
  PlayerEquipmentStats,
  EquipmentSetBonus,
} from "./types";

export function validateItemQuantity(quantity: number): boolean {
  return Number.isInteger(quantity) && Number.isFinite(quantity) && quantity >= 1 && quantity <= 999999;
}

export function validatePrice(price: number): boolean {
  return Number.isInteger(price) && Number.isFinite(price) && price >= 1 && price <= 1000000000;
}

export function countEquippedCopies(st: EnhancedPlayerState, itemId: string): number {
  const eq = (st.equipment || {}) as Record<string, unknown>;
  return EQUIP_SLOT_KEYS.filter((s) => eq[s] === itemId).length;
}

// ========== 技能系统纯领域逻辑 ==========

export function applyAwardSkillExperience(
  st: EnhancedPlayerState,
  professionId: string,
  xpAmount: number,
): { leveledUp: boolean; newLevel: number } {
  const skillKey = `skill_${professionId}`;
  let playerSkill = st.skills[skillKey];
  if (!playerSkill) {
    playerSkill = { level: 1, xp: 0, unlockedRecipes: [], enhancementLevel: 0 };
    st.skills[skillKey] = playerSkill;
  }

  const levelBefore = playerSkill.level;
  playerSkill.xp += xpAmount;
  let xpForNextLevel = getXpForLevel(playerSkill.level);
  while (playerSkill.xp >= xpForNextLevel && playerSkill.level < 200) {
    playerSkill.level += 1;
    playerSkill.xp -= xpForNextLevel;
    appendLog(st, `${professionId} 技能升级到 ${playerSkill.level} 级！`);
    xpForNextLevel = getXpForLevel(playerSkill.level);
  }
  if (playerSkill.level >= 200) playerSkill.level = 200;
  return { leveledUp: playerSkill.level > levelBefore, newLevel: playerSkill.level };
}

// ========== 强化系统纯领域逻辑 ==========

export function computeEnhancementInfo(
  st: EnhancedPlayerState,
  itemId: string,
  contentPack: EnhancedContentPack,
) {
  const item = (contentPack.items as any[]).find((i) => i.id === itemId);
  if (!item) throw new Error("item_not_found");

  const currentLevel = st.equipment.enhancementLevels?.[itemId] || 0;
  const ruleMatch = findEnhancementRuleForItem(item, contentPack);
  const rule = ruleMatch?.rule ?? null;
  const requiredProfession = ruleMatch?.requiredProfession ?? undefined;
  const skill = ensureEnhancingSkill(st);
  const itemLevel = itemLevelForEnhancement(item, contentPack);
  const isOwned = ownsEnhanceableItem(st, itemId);
  const slotMultiplier = enhancementSlotMultiplier(item);
  const protection = {
    itemId: PROTECTION_MIRROR_ID,
    available: st.inventory[PROTECTION_MIRROR_ID] || 0,
    failWithout: "失败后重置为 +0",
    failWith: "消耗 1 面保护镜；失败只降低 1 级",
  };

  if (!rule) {
    return {
      currentLevel,
      maxLevel: 0,
      nextLevelCost: {},
      successRate: 0,
      baseSuccessRate: 0,
      levelModifier: 0,
      overLevelBonus: 0,
      toolBonus: 0,
      currentStatBonusPct: 0,
      nextStatBonusPct: 0,
      slotMultiplier,
      itemLevel,
      enhancingLevel: skill.level,
      enhancingXp: skill.xp,
      canEnhance: false,
      canAfford: false,
      isOwned,
      requiredProfession: undefined,
      itemType: undefined,
      protection,
    };
  }

  const nextLevel = currentLevel + 1;
  const maxLevel = Math.min(MAX_ENHANCEMENT_LEVEL, Number(rule.maxLevel || MAX_ENHANCEMENT_LEVEL));
  const nextLevelCost =
    nextLevel <= maxLevel ? enhancementMaterials(rule, nextLevel, undefined, item, contentPack) : {};
  const rates = enhancementSuccessBreakdown(
    nextLevel,
    skill.level,
    itemLevel,
    equippedEnhanceToolBonus(st, contentPack),
  );
  const canAfford = Object.entries(nextLevelCost).every(([id, qty]) => (st.inventory[id] || 0) >= qty);

  return {
    currentLevel,
    maxLevel,
    nextLevelCost,
    successRate: rates.finalRate,
    baseSuccessRate: rates.baseRate,
    levelModifier: rates.levelModifier,
    overLevelBonus: rates.overLevelBonus,
    toolBonus: rates.toolBonus,
    currentStatBonusPct: enhancementBonusPct(currentLevel) * slotMultiplier,
    nextStatBonusPct: enhancementBonusPct(Math.min(nextLevel, maxLevel)) * slotMultiplier,
    slotMultiplier,
    itemLevel,
    enhancingLevel: skill.level,
    enhancingXp: skill.xp,
    canEnhance: isOwned && currentLevel < maxLevel,
    canAfford,
    isOwned,
    requiredProfession,
    itemType: rule.itemType,
    protection,
  };
}

export function applyEnhanceEquipment({
  userId,
  st,
  providerState,
  request,
  contentPack,
  rng,
}: {
  userId: string;
  st: EnhancedPlayerState;
  providerState?: EnhancedPlayerState;
  request: EnhancementRequest;
  contentPack: EnhancedContentPack;
  rng?: () => number;
}): { result: EnhancementResult; consumed: boolean; providerMutated: boolean } {
  const currentLevel = st.equipment.enhancementLevels?.[request.itemId] || 0;
  const fail = (failureReason: string): { result: EnhancementResult; consumed: boolean; providerMutated: boolean } => ({
    result: {
      success: false,
      previousLevel: currentLevel,
      newLevel: currentLevel,
      consumedMaterials: {},
      failureReason,
    },
    consumed: false,
    providerMutated: false,
  });

  const item = (contentPack.items as any[]).find((i) => i.id === request.itemId);
  if (!item) return fail("未知物品");

  const ruleMatch = findEnhancementRuleForItem(item, contentPack);
  const rule = ruleMatch?.rule ?? null;
  if (!rule) return fail("该物品无法强化");

  let serviceFee = 0;
  if (request.serviceProviderId) {
    if (request.serviceProviderId === userId) return fail("不能向自己购买强化服务");
    if (!providerState) return fail("服务提供者不存在");
    const requiredProfession = ruleMatch?.requiredProfession ?? rule.requiredProfession;
    const providerSkill = providerState.skills?.[`skill_${requiredProfession}`];
    if (!providerSkill || !hasEnhancementSkill(providerSkill.unlockedRecipes, requiredProfession, rule.itemType)) {
      return fail("服务提供者不具备对应强化技能");
    }
    serviceFee = Math.floor(
      (rule.materials.find((m: { itemId: string }) => m.itemId === "gold")?.quantity || 100) * 0.5,
    );
    if ((st.inventory.gold || 0) < serviceFee) return fail("金币不足以支付服务费");
  }

  const result = performEnhancementAttempt({
    player: st,
    item,
    rule,
    request,
    pack: contentPack,
    rng,
    xpForLevel: getXpForLevel,
  });

  if (Object.keys(result.consumedMaterials).length === 0) {
    return { result, consumed: false, providerMutated: false };
  }

  appendLog(
    st,
    result.success
      ? `装备强化成功：${item.name} +${result.previousLevel} → +${result.newLevel}（强化经验 +${result.xpGained}）`
      : `${item.name}${result.failureReason}（强化经验 +${result.xpGained}）`,
  );
  for (const level of result.levelUps || []) {
    appendLog(st, `强化技能升级到 ${level} 级！`);
  }

  let providerMutated = false;
  if (request.serviceProviderId && providerState && serviceFee > 0) {
    st.inventory.gold = (st.inventory.gold || 0) - serviceFee;
    providerState.inventory.gold = (providerState.inventory.gold || 0) + serviceFee;
    if (st.stats) st.stats.totalGoldSpent = (st.stats.totalGoldSpent || 0) + serviceFee;
    if (providerState.stats) providerState.stats.totalGoldEarned = (providerState.stats.totalGoldEarned || 0) + serviceFee;
    syncAchievements(st);
    syncAchievements(providerState);
    providerState.stateRevision = (providerState.stateRevision ?? 0) + 1;
    appendLog(providerState, `提供强化服务获得 ${serviceFee} 金币`);
    providerMutated = true;
  }

  st.stateRevision = (st.stateRevision ?? 0) + 1;
  return { result, consumed: true, providerMutated };
}

export function validateEnhancementServiceCreation({
  requesterId,
  providerId,
  requesterState,
  providerState,
  itemId,
  contentPack,
}: {
  requesterId: string;
  providerId: string;
  requesterState?: EnhancedPlayerState;
  providerState?: EnhancedPlayerState;
  itemId: string;
  contentPack: EnhancedContentPack;
}): number {
  if (!requesterState) throw new Error("请求者不存在");
  if (!providerState) throw new Error("服务提供者不存在");
  if (requesterId === providerId) throw new Error("不能向自己发起强化服务");
  if (!requesterState.inventory[itemId] || requesterState.inventory[itemId] < 1) {
    throw new Error("您没有该物品");
  }
  const item = (contentPack.items as any[]).find((i) => i.id === itemId);
  const ruleMatch = item ? findEnhancementRuleForItem(item, contentPack) : null;
  const enhancementRule = ruleMatch?.rule;
  if (!enhancementRule) throw new Error("该物品无法强化");

  const requiredProfession = ruleMatch?.requiredProfession ?? enhancementRule.requiredProfession;
  const providerSkill = providerState.skills?.[`skill_${requiredProfession}`];
  if (
    !providerSkill ||
    !hasEnhancementSkill(providerSkill.unlockedRecipes, requiredProfession, enhancementRule.itemType)
  ) {
    throw new Error("该服务提供者不具备对应强化技能");
  }
  return Math.floor(
    (enhancementRule.materials.find((m: any) => m.itemId === "gold")?.quantity || 100) * 0.5,
  );
}

// ========== 装备耐久、属性与套装纯领域逻辑 ==========

export function computeDurabilityInfo(st: EnhancedPlayerState, itemId: string): DurabilityInfo {
  const isEquipped = Object.values(st.equipment).includes(itemId);
  const inBag = (st.inventory?.[itemId] || 0) > 0;
  if (!isEquipped && !inBag) {
    throw new Error("item_not_equipped");
  }

  const maxDurability = Number.isFinite(st.equipment.maxDurability?.[itemId])
    ? st.equipment.maxDurability![itemId]
    : 100;
  const raw = st.equipment.durability?.[itemId];
  const currentDurability = Number.isFinite(raw) ? raw! : maxDurability;
  const durabilityPercent = maxDurability > 0 ? (currentDurability / maxDurability) * 100 : 0;
  const needsRepair = durabilityPercent < 50;
  const repairCost = Math.ceil((maxDurability - currentDurability) * 0.5);

  return {
    itemId,
    currentDurability,
    maxDurability,
    durabilityPercent: Math.round(durabilityPercent * 10) / 10,
    needsRepair,
    repairCost,
  };
}

export function applyRepairEquipment(st: EnhancedPlayerState, request: RepairRequest): RepairResult {
  const isEquipped = Object.values(st.equipment).includes(request.itemId);
  const inBag = (st.inventory?.[request.itemId] || 0) > 0;
  if (!isEquipped && !inBag) {
    return {
      success: false,
      itemId: request.itemId,
      oldDurability: 0,
      newDurability: 0,
      cost: 0,
      message: "装备未装备或不在背包中",
    };
  }

  if (!st.equipment.durability) st.equipment.durability = {};
  if (!st.equipment.maxDurability) st.equipment.maxDurability = {};

  const maxDurability = st.equipment.maxDurability[request.itemId] || 100;
  const rawOld = st.equipment.durability[request.itemId];
  const oldDurability = Number.isFinite(rawOld) ? rawOld! : maxDurability;

  let targetDurability = maxDurability;
  if (request.repairType === "partial" && request.targetDurability !== undefined) {
    if (!Number.isFinite(request.targetDurability) || request.targetDurability < 0) {
      return {
        success: false,
        itemId: request.itemId,
        oldDurability,
        newDurability: oldDurability,
        cost: 0,
        message: "修复目标无效",
      };
    }
    targetDurability = Math.floor(Math.min(request.targetDurability, maxDurability));
  }

  const repairAmount = targetDurability - oldDurability;
  if (repairAmount <= 0) {
    return {
      success: false,
      itemId: request.itemId,
      oldDurability,
      newDurability: oldDurability,
      cost: 0,
      message: "装备无需修复",
    };
  }

  const cost = Math.ceil(repairAmount * 0.5);
  const availableGold = st.inventory.gold || 0;
  if (availableGold < cost) {
    return {
      success: false,
      itemId: request.itemId,
      oldDurability,
      newDurability: oldDurability,
      cost,
      message: `金币不足，需要 ${cost} 金币`,
    };
  }

  st.inventory.gold = availableGold - cost;
  st.equipment.durability[request.itemId] = targetDurability;
  if (st.stats) st.stats.totalGoldSpent = (st.stats.totalGoldSpent || 0) + cost;
  syncAchievements(st);
  st.stateRevision = (st.stateRevision ?? 0) + 1;
  appendLog(st, `修复装备：${request.itemId}，耐久度 ${oldDurability} -> ${targetDurability}，花费 ${cost} 金币`);

  return {
    success: true,
    itemId: request.itemId,
    oldDurability,
    newDurability: targetDurability,
    cost,
    message: "修复成功",
  };
}

export function applyReduceDurability(
  st: EnhancedPlayerState,
  itemId: string,
  amount: number,
): { success: boolean; newDurability: number; broken: boolean } {
  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      success: false,
      newDurability: st.equipment.durability?.[itemId] ?? st.equipment.maxDurability?.[itemId] ?? 0,
      broken: false,
    };
  }

  const isEquipped = Object.values(st.equipment).includes(itemId);
  if (!isEquipped) return { success: false, newDurability: 0, broken: false };

  if (!st.equipment.durability) st.equipment.durability = {};
  if (st.equipment.durability[itemId] === undefined) {
    st.equipment.durability[itemId] = st.equipment.maxDurability?.[itemId] || 100;
  }

  const currentDurability = st.equipment.durability[itemId];
  const cap = st.equipment.maxDurability?.[itemId] || 100;
  const newDurability = Math.min(cap, Math.max(0, currentDurability - amount));
  st.equipment.durability[itemId] = newDurability;
  const broken = newDurability === 0;
  if (broken) {
    appendLog(st, `装备损坏：${itemId}，需要修复才能继续使用`);
  }
  return { success: true, newDurability, broken };
}

export function computeActiveSetBonuses(
  st: EnhancedPlayerState,
  contentPack: EnhancedContentPack,
): EquipmentSetBonus[] {
  const activeSets: EquipmentSetBonus[] = [];
  for (const set of contentPack.equipmentSets || []) {
    let equippedPieces = 0;
    for (const piece of set.pieces) {
      const equippedItem = st.equipment[piece.slot as keyof typeof st.equipment];
      if (
        equippedItem === piece.itemId &&
        (st.inventory?.[piece.itemId] || 0) > 0 &&
        !isDurabilityBroken(st, piece.itemId)
      ) {
        equippedPieces++;
      }
    }
    if (equippedPieces === 0) continue;

    const top = highestActiveBonus(
      set.bonuses as Array<{ requiredPieces?: number; stats?: Record<string, number> }>,
      equippedPieces,
    );
    const activeBonuses = set.bonuses.map((bonus: any) => ({
      ...bonus,
      isActive: bonus === top,
    }));

    const totalStats: Record<string, number> = {};
    for (const bonus of activeBonuses) {
      if (bonus.isActive) {
        for (const [stat, value] of Object.entries(bonus.stats as Record<string, number>)) {
          totalStats[stat] = (totalStats[stat] || 0) + value;
        }
      }
    }

    activeSets.push({
      setId: set.id,
      setName: set.name,
      equippedPieces,
      totalPieces: set.pieces.length,
      activeBonuses,
      totalStats,
    });
  }
  return activeSets;
}

export function computeEquipmentStats(
  st: EnhancedPlayerState,
  contentPack: EnhancedContentPack,
): PlayerEquipmentStats {
  const baseStats: Record<string, number> = {};
  const enhancementStats: Record<string, number> = {};
  const setStats: Record<string, number> = {};

  for (const [slot, itemId] of Object.entries(st.equipment)) {
    if (!itemId || typeof itemId !== "string") continue;
    if (["enhancementLevels", "durability", "maxDurability", "tool"].includes(slot)) continue;
    if ((st.inventory?.[itemId] || 0) <= 0) continue;
    if (isDurabilityBroken(st, itemId)) continue;

    const item = (contentPack.items as any[]).find((i) => i.id === itemId);
    if (!item) continue;

    for (const k of ["atk", "def", "mag", "hp", "mp"] as const) {
      if (item[k]) baseStats[k] = (baseStats[k] || 0) + item[k];
    }

    const enhancementLevel = st.equipment.enhancementLevels?.[itemId] || 0;
    if (enhancementLevel > 0) {
      const bonus = enhancementStatMultiplier(enhancementLevel, item) - 1;
      for (const k of ["atk", "def", "mag", "hp", "mp"] as const) {
        if (item[k]) enhancementStats[k] = (enhancementStats[k] || 0) + item[k] * bonus;
      }
    }
  }

  const activeSets = computeActiveSetBonuses(st, contentPack);
  for (const setBonus of activeSets) {
    for (const [stat, value] of Object.entries(setBonus.totalStats)) {
      setStats[stat] = (setStats[stat] || 0) + value;
    }
  }

  const totalStats: Record<string, number> = {};
  const allStats = new Set([
    ...Object.keys(baseStats),
    ...Object.keys(enhancementStats),
    ...Object.keys(setStats),
  ]);
  for (const stat of allStats) {
    totalStats[stat] = (baseStats[stat] || 0) + (enhancementStats[stat] || 0) + (setStats[stat] || 0);
  }

  return { baseStats, enhancementStats, setStats, totalStats, activeSets };
}

export function computeItemPriceTrend(itemId: string, history: PriceHistory[]) {
  if (history.length === 0) {
    return { itemId, currentAverage: 0, weekAverage: 0, trend: "stable" as const, changePercent: 0 };
  }
  const currentAverage = history[0]?.averagePrice || 0;
  const weekAverage = history.reduce((sum, h) => sum + h.averagePrice, 0) / history.length;
  let trend: "up" | "down" | "stable" = "stable";
  let changePercent = 0;
  if (history.length >= 2) {
    const oldAverage = history[history.length - 1].averagePrice;
    if (oldAverage > 0) {
      changePercent = ((currentAverage - oldAverage) / oldAverage) * 100;
      if (changePercent > 5) trend = "up";
      else if (changePercent < -5) trend = "down";
    }
  }
  return {
    itemId,
    currentAverage,
    weekAverage,
    trend,
    changePercent: Math.round(changePercent * 100) / 100,
  };
}

// ========== 组队活动与交易纯领域逻辑 ==========

export function validatePartyActivityTarget({
  activityType,
  stageId,
  memberCount,
  contentPack,
}: {
  activityType: "combat" | "group_craft" | "raid";
  stageId?: string;
  memberCount: number;
  contentPack?: EnhancedContentPack;
}): {
  ok: boolean;
  message?: string;
  raidBossId?: string;
  raidBossName?: string;
  bossKillsNeeded?: number;
} {
  if (activityType === "combat" || activityType === "raid") {
    if (!stageId) return { ok: false, message: "战斗类活动需要指定关卡" };
    const stage = contentPack ? (contentPack.stages as any[]).find((s: any) => s.id === stageId) : null;
    if (contentPack && !stage) return { ok: false, message: "关卡不存在" };
    if (!isStageOpen(stageId)) return { ok: false, message: "该关卡尚未开放" };
    if (activityType === "raid") {
      const ids: string[] = stage?.monsters ?? [];
      const boss = contentPack
        ? ids
            .map((id) => (contentPack.monsters as any[]).find((m: any) => m.id === id))
            .find((m) => m && (m.isBoss || String(m.id).endsWith("_boss"))) ??
          ids
            .map((id) => (contentPack.monsters as any[]).find((m: any) => m.id === id))
            .filter(Boolean)
            .at(-1)
        : null;
      const raidBossId = boss?.id ?? ids.at(-1);
      if (!raidBossId) return { ok: false, message: "该关卡没有可讨伐的首领" };
      return {
        ok: true,
        raidBossId,
        raidBossName: boss?.name ?? raidBossId,
        bossKillsNeeded: memberCount * 2,
      };
    }
  }
  return { ok: true };
}

export function snapshotMemberBaseline(state?: EnhancedPlayerState, raidBossId?: string) {
  const stats = state?.stats as any;
  return {
    kills: stats?.totalKills || 0,
    bossKills: stats?.totalBossKills || 0,
    raidBossKills: raidBossId ? stats?.killsByMonster?.[raidBossId] || 0 : 0,
    actions: stats?.totalActions || 0,
    xp: stats?.totalXpEarned || 0,
  };
}

export function settlePartyActivityMemberStates({
  activity,
  members,
  getMemberState,
}: {
  activity: NonNullable<import("./types").Party["currentActivity"]>;
  members: Array<{ userId: string }>;
  getMemberState: (userId: string) => EnhancedPlayerState | undefined;
}): {
  rewards: Record<string, Record<string, number>>;
  contributions: Record<string, number>;
  zeroContribution: boolean;
} {
  const durationFactor = Math.max(0.1, (activity.durationMinutes ?? 30) / 30);
  const rewards: Record<string, Record<string, number>> = {};
  const contributions: Record<string, number> = {};

  if (activity.baseline) {
    for (const m of members) {
      const base = activity.baseline[m.userId];
      const stats = getMemberState(m.userId)?.stats as any;
      if (!base || !stats) {
        contributions[m.userId] = 0;
        continue;
      }
      const kills = Math.max(0, (stats.totalKills || 0) - base.kills);
      const raidBossKills = activity.raidBossId
        ? Math.max(0, (stats.killsByMonster?.[activity.raidBossId] || 0) - base.raidBossKills)
        : 0;
      const actions = Math.max(0, (stats.totalActions || 0) - base.actions);
      contributions[m.userId] =
        activity.type === "group_craft"
          ? actions
          : activity.type === "raid"
            ? raidBossKills * 10 + kills
            : kills;
    }
    const totalC = Object.values(contributions).reduce((a, b) => a + b, 0);
    if (totalC <= 0) {
      return { rewards, contributions, zeroContribution: true };
    }
    const split = (pool: number) => {
      const shares: Record<string, number> = {};
      let assigned = 0;
      let top: string | null = null;
      for (const m of members) {
        shares[m.userId] = Math.floor((pool * contributions[m.userId]) / totalC);
        assigned += shares[m.userId];
        if (!top || contributions[m.userId] > contributions[top]) top = m.userId;
      }
      if (top) shares[top] += pool - assigned;
      return shares;
    };

    if (activity.type === "group_craft") {
      const xpShares = split(Math.round(60 * members.length * durationFactor));
      for (const m of members) {
        const xp = xpShares[m.userId];
        if (xp <= 0) continue;
        rewards[m.userId] = { xp };
        const s = getMemberState(m.userId);
        if (s) {
          ensureProfessionSkills(s);
          const skillId = CRAFT_SKILL_BY_PROFESSION[s.activeClassId] || `skill_${s.activeClassId}`;
          const ups = grantProfessionXp(s, skillId, xp);
          appendLog(s, `队伍活动完成，${s.activeClassId} 获得 ${xp} 经验`);
          for (const lv of ups) appendLog(s, `${skillId} 技能升级到 ${lv} 级！`);
        }
      }
    } else {
      const bossKillsTotal = activity.raidBossId
        ? members.reduce(
            (n, m) =>
              n +
              Math.max(
                0,
                ((getMemberState(m.userId)?.stats as any)?.killsByMonster?.[activity.raidBossId!] || 0) -
                  (activity.baseline![m.userId]?.raidBossKills || 0),
              ),
            0,
          )
        : 0;
      const pool =
        activity.type === "raid"
          ? Math.round((150 * members.length + 80 * bossKillsTotal) * durationFactor)
          : Math.round(120 * members.length * durationFactor);
      const goldShares = split(pool);
      for (const m of members) {
        const gold = goldShares[m.userId];
        if (gold <= 0) continue;
        rewards[m.userId] = { gold };
        const s = getMemberState(m.userId);
        if (s) {
          s.inventory.gold = (s.inventory.gold || 0) + gold;
          appendLog(s, `队伍活动完成，按贡献分得 ${gold} 金币`);
        }
      }
    }
    return { rewards, contributions, zeroContribution: false };
  }

  // 无基线旧存档兼容平摊
  for (const m of members) {
    const s = getMemberState(m.userId);
    if (activity.type === "group_craft") {
      const xp = 50;
      rewards[m.userId] = { xp };
      if (s) {
        ensureProfessionSkills(s);
        const skillId = CRAFT_SKILL_BY_PROFESSION[s.activeClassId] || `skill_${s.activeClassId}`;
        const ups = grantProfessionXp(s, skillId, xp);
        appendLog(s, `队伍制作完成，${s.activeClassId} 获得 ${xp} 经验`);
        for (const lv of ups) appendLog(s, `${skillId} 技能升级到 ${lv} 级！`);
      }
    } else {
      const gold = 100;
      rewards[m.userId] = { gold };
      if (s) {
        s.inventory.gold = (s.inventory.gold || 0) + gold;
        appendLog(s, `队伍活动完成，获得 ${gold} 金币`);
      }
    }
  }
  return { rewards, contributions, zeroContribution: false };
}

export function validateTradingOrderInput({
  itemId,
  quantity,
  price,
  type,
  contentPack,
}: {
  itemId: string;
  quantity: number;
  price: number;
  type: "buy" | "sell";
  contentPack?: EnhancedContentPack;
}) {
  if (type !== "buy" && type !== "sell") throw new Error("订单类型无效");
  if (!validateItemQuantity(quantity)) throw new Error("订单数量无效");
  if (!validatePrice(price)) throw new Error("订单价格无效");
  if (itemId === "gold") throw new Error("金币不可挂单");
  if (contentPack && !(contentPack.items as any[]).some((i) => i.id === itemId)) {
    throw new Error("物品不存在");
  }
}

export function applyTradingOrderEscrow({
  state,
  itemId,
  quantity,
  price,
  type,
}: {
  state: EnhancedPlayerState;
  itemId: string;
  quantity: number;
  price: number;
  type: "buy" | "sell";
}) {
  if (type === "sell") {
    const currentQuantity = state.inventory[itemId] || 0;
    const equippedCopies = countEquippedCopies(state, itemId);
    if (equippedCopies > 0 && currentQuantity - quantity < equippedCopies) {
      throw new Error("装备中的物品不能挂单");
    }
    if (currentQuantity < quantity) {
      throw new Error(`物品数量不足，当前拥有: ${currentQuantity}`);
    }
    state.inventory[itemId] = currentQuantity - quantity;
    if (state.inventory[itemId] <= 0) delete state.inventory[itemId];
  } else {
    const totalCost = quantity * price;
    const currentGold = state.inventory.gold || 0;
    if (currentGold < totalCost) {
      throw new Error(`金币不足，需要: ${totalCost}，当前拥有: ${currentGold}`);
    }
    state.inventory.gold = currentGold - totalCost;
  }
  state.stateRevision = (state.stateRevision ?? 0) + 1;
}

export function applyTradeSettlement({
  orderType,
  itemId,
  quantity,
  price,
  fillerState,
  posterState,
}: {
  orderType: "buy" | "sell";
  itemId: string;
  quantity: number;
  price: number;
  fillerState: EnhancedPlayerState;
  posterState: EnhancedPlayerState;
}): number {
  const totalCost = quantity * price;
  if (orderType === "sell") {
    const gold = fillerState.inventory.gold || 0;
    if (gold < totalCost) {
      throw new Error(`金币不足，需要: ${totalCost}，当前拥有: ${gold}`);
    }
    fillerState.inventory.gold = gold - totalCost;
    fillerState.inventory[itemId] = (fillerState.inventory[itemId] || 0) + quantity;
    posterState.inventory.gold = (posterState.inventory.gold || 0) + totalCost;
    if (fillerState.stats) fillerState.stats.totalGoldSpent = (fillerState.stats.totalGoldSpent || 0) + totalCost;
    if (posterState.stats) posterState.stats.totalGoldEarned = (posterState.stats.totalGoldEarned || 0) + totalCost;
    appendLog(posterState, `订单成交：${itemId} x${quantity} 获得 ${totalCost} 金币`);
  } else {
    const have = fillerState.inventory[itemId] || 0;
    if (have < quantity) {
      throw new Error(`物品不足，需要: ${quantity}，当前拥有: ${have}`);
    }
    const equippedCopies = countEquippedCopies(fillerState, itemId);
    if (equippedCopies > 0 && have - quantity < equippedCopies) {
      throw new Error("装备中的物品不能出售");
    }
    fillerState.inventory[itemId] = have - quantity;
    if (fillerState.inventory[itemId] <= 0) delete fillerState.inventory[itemId];
    fillerState.inventory.gold = (fillerState.inventory.gold || 0) + totalCost;
    posterState.inventory[itemId] = (posterState.inventory[itemId] || 0) + quantity;
    if (fillerState.stats) fillerState.stats.totalGoldEarned = (fillerState.stats.totalGoldEarned || 0) + totalCost;
    if (posterState.stats) posterState.stats.totalGoldSpent = (posterState.stats.totalGoldSpent || 0) + totalCost;
    appendLog(posterState, `收购成交：${itemId} x${quantity} 花费 ${totalCost} 金币`);
  }
  if (fillerState.stats) fillerState.stats.totalTrades = (fillerState.stats.totalTrades || 0) + 1;
  if (posterState.stats) posterState.stats.totalTrades = (posterState.stats.totalTrades || 0) + 1;
  syncAchievements(fillerState);
  syncAchievements(posterState);
  fillerState.stateRevision = (fillerState.stateRevision ?? 0) + 1;
  posterState.stateRevision = (posterState.stateRevision ?? 0) + 1;
  return totalCost;
}
