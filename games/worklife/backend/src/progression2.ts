// 进阶进度系统：声望（Reputation）+ 赏金契约（Bounty）+ 转生（Prestige）
// 与 progression.ts（成就/每日任务）并列，集中定义静态数据与纯逻辑函数。
//
// 设计原则：
// - 纯函数风格，直接在传入的 player 上原地修改并返回结果信息；不读写存储。
// - 三大系统共同构成中后期长线目标：
//   声望 = 长期累计的永久被动成长；赏金 = 每日可重复的金币/声望来源；转生 = 终局重置循环。

import type {
  EnhancedContentPack,
  EnhancedPlayerState,
  ReputationTierDef,
  ReputationState,
  Bounty,
  BountyState,
  GuildBountyAffixId,
  GuildComboMilestoneId,
  GuildHonorShopCategory,
  GuildHonorState,
  HeritageRuneSlot,
  HeritageRuneId,
  CrossProfResonanceSetId,
  HeritageWorkshopState,
  CaravanRouteId,
  CaravanCargoCategory,
  CaravanWagonSlot,
  CaravanRewardSummary,
  CaravanWagonRun,
  WorkshopSupplyContractInstance,
  CaravanTradeState,
  AlchemicalPotionId,
  PotionBrewMode,
  RecipeUpgradeMode,
  ResonanceSlotIndex,
  AlchemyCauldronState,
  AstralRuinStratumId,
  ExpeditionSurveyMode,
  SacredRelicId,
  RelicUpgradeMode,
  AstralRelicsState,
  PrestigeState,
  PlayerStats
} from "./types";
import { ensurePlayerExtensions, appendLog } from "./storage";
import { defaultCombatSkills } from "./combat_skills";
import { syncAchievements } from "./progression";
import { todayLocal } from "./time";
import { PROTECTION_MIRROR_ID } from "./enhancement_math";

/* ============================ 声望系统 ============================ */

// 声望等级：每达到一层，其 bonuses 永久叠加（百分比点数）。
// 设计为前期增长快、后期边际递减，鼓励长期挂机但不至于失衡。
export const REPUTATION_TIERS: ReputationTierDef[] = [
  { tier: 1, name: "无名之辈", icon: "🌱", required: 0, bonuses: {} },
  { tier: 2, name: "初露锋芒", icon: "🌿", required: 100, bonuses: { gatherSpeed: 3, xpGain: 2 } },
  { tier: 3, name: "小有名气", icon: "🍀", required: 300, bonuses: { craftSpeed: 3, goldGain: 3 } },
  { tier: 4, name: "声名鹊起", icon: "⭐", required: 700, bonuses: { combatSpeed: 4, xpGain: 3 } },
  { tier: 5, name: "远近闻名", icon: "🌟", required: 1500, bonuses: { gatherSpeed: 5, craftSpeed: 5 } },
  { tier: 6, name: "威震一方", icon: "🏅", required: 3000, bonuses: { goldGain: 6, combatSpeed: 5 } },
  { tier: 7, name: "名动天下", icon: "🎖️", required: 6000, bonuses: { xpGain: 6, gatherSpeed: 6 } },
  { tier: 8, name: "传奇人物", icon: "👑", required: 12000, bonuses: { craftSpeed: 8, goldGain: 8 } },
  { tier: 9, name: "万古流芳", icon: "🔱", required: 24000, bonuses: { combatSpeed: 8, xpGain: 8 } },
  { tier: 10, name: "不朽传说", icon: "🌌", required: 50000, bonuses: { gatherSpeed: 10, craftSpeed: 10, combatSpeed: 10, xpGain: 10, goldGain: 10 } }
];

export type QuartermasterCategory = "protection" | "chest" | "scroll" | "title";

export type ReputationBonusPct = {
  gatherSpeed?: number;
  craftSpeed?: number;
  combatSpeed?: number;
  xpGain?: number;
  goldGain?: number;
};

export interface QuartermasterItemDef {
  id: string;
  name: string;
  category: QuartermasterCategory;
  categoryLabel: string;
  iconKind: "materials" | "skills";
  iconId: string;
  cost: number;
  requiredTier: number;
  dailyLimit?: number;
  durationMs?: number;
  maxStackMs?: number;
  bonuses?: ReputationBonusPct;
  titleLabel?: string;
  summary: string;
  effectText: string;
}

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

export const QUARTERMASTER_ITEMS: QuartermasterItemDef[] = [
  {
    id: "qm_protection_mirror",
    name: "护佑宝镜军需配给",
    category: "protection",
    categoryLabel: "强化保护",
    iconKind: "materials",
    iconId: "mirror_protection",
    cost: 80,
    requiredTier: 2,
    dailyLimit: 5,
    summary: "军需官特批强化保护镜，高阶装备冲星失败时免于降级",
    effectText: "立即获得 保护镜 ×1",
  },
  {
    id: "qm_rare_material_chest",
    name: "军需稀有配方材料箱",
    category: "chest",
    categoryLabel: "限购材料箱",
    iconKind: "skills",
    iconId: "qm_supply_chest",
    cost: 120,
    requiredTier: 2,
    dailyLimit: 3,
    summary: "按当前累计声望阶位配发高纯度水晶、稀有精华、秘药与军饷金币",
    effectText: "开启获稀有配方材料包 + 炼金秘药 + 军饷金币",
  },
  {
    id: "qm_scroll_artisan",
    name: "百工神速长效卷轴",
    category: "scroll",
    categoryLabel: "长效生产卷轴",
    iconKind: "skills",
    iconId: "qm_scroll_artisan",
    cost: 90,
    requiredTier: 3,
    durationMs: TWO_HOURS_MS,
    maxStackMs: TWELVE_HOURS_MS,
    bonuses: { gatherSpeed: 15, craftSpeed: 15 },
    summary: "王都工匠行会秘制长效敕令，大幅加快全生活职业采集与制造效率",
    effectText: "2小时内 采集速度 +15% · 制作速度 +15%（可叠加至12小时）",
  },
  {
    id: "qm_scroll_vanguard",
    name: "讨伐先锋长效战卷",
    category: "scroll",
    categoryLabel: "长效战斗卷轴",
    iconKind: "skills",
    iconId: "qm_scroll_vanguard",
    cost: 110,
    requiredTier: 4,
    durationMs: TWO_HOURS_MS,
    maxStackMs: TWELVE_HOURS_MS,
    bonuses: { combatSpeed: 15, xpGain: 20, goldGain: 20 },
    summary: "前线军需署签发的讨伐战卷，强化单人与组队讨伐节奏及战利收益",
    effectText: "2小时内 战斗速度 +15% · 经验 +20% · 金币 +20%（可叠加至12小时）",
  },
  {
    id: "qm_title_warder",
    name: "名号徽章·星辉军需官",
    category: "title",
    categoryLabel: "专属名号徽章",
    iconKind: "skills",
    iconId: "qm_title_warder",
    cost: 260,
    requiredTier: 3,
    titleLabel: "星辉军需官",
    bonuses: { gatherSpeed: 4, craftSpeed: 4, goldGain: 4 },
    summary: "永久解锁并可自由佩戴「星辉军需官」荣誉徽章，彰显后勤统御之名",
    effectText: "佩戴加成：采集速度 +4% · 制作速度 +4% · 金币获取 +4%",
  },
  {
    id: "qm_title_dragonslayer",
    name: "名号徽章·讨魔先锋",
    category: "title",
    categoryLabel: "专属名号徽章",
    iconKind: "skills",
    iconId: "qm_title_dragonslayer",
    cost: 650,
    requiredTier: 5,
    titleLabel: "讨魔先锋",
    bonuses: { combatSpeed: 6, xpGain: 6, goldGain: 5 },
    summary: "永久解锁并可自由佩戴「讨魔先锋」赤龙勋章，震慑深渊魔物",
    effectText: "佩戴加成：战斗速度 +6% · 经验获取 +6% · 金币获取 +5%",
  },
  {
    id: "qm_title_grandmaster",
    name: "名号徽章·万匠宗师",
    category: "title",
    categoryLabel: "专属名号徽章",
    iconKind: "skills",
    iconId: "qm_title_grandmaster",
    cost: 1600,
    requiredTier: 7,
    titleLabel: "万匠宗师",
    bonuses: { gatherSpeed: 6, craftSpeed: 6, combatSpeed: 6, xpGain: 6, goldGain: 6 },
    summary: "永久解锁并可自由佩戴「万匠宗师」紫晶圣徽，百工与武道兼修",
    effectText: "佩戴加成：采集/制作/战斗速度与经验/金币获取 全维度 +6%",
  },
];

/** 确保 reputation 字段存在并归一化扩展字段 */
function ensureReputation(player: EnhancedPlayerState): ReputationState {
  if (!Array.isArray((player as any).logs)) {
    (player as any).logs = [];
  }
  if (!player.reputation) {
    player.reputation = { total: 0, spent: 0 };
  }
  if (typeof player.reputation.total !== "number" || !Number.isFinite(player.reputation.total)) {
    player.reputation.total = 0;
  }
  if (typeof player.reputation.spent !== "number" || !Number.isFinite(player.reputation.spent)) {
    player.reputation.spent = 0;
  }
  return player.reputation;
}

/** 当前可用于军需官商店兑换的声望余额（消耗声望绝不降低累计声望与声望阶位） */
export function getAvailableReputation(player: EnhancedPlayerState): number {
  const rep = ensureReputation(player);
  return Math.max(0, Math.floor(rep.total) - Math.max(0, Math.floor(rep.spent)));
}

/** 根据累计声望计算当前等级定义（始终基于累计声望 total，兑换消耗绝不掉阶） */
export function getReputationTier(total: number): ReputationTierDef {
  let current = REPUTATION_TIERS[0];
  for (const t of REPUTATION_TIERS) {
    if (total >= t.required) current = t;
    else break;
  }
  return current;
}

/** 下一等级（已满级返回 undefined） */
export function getNextReputationTier(total: number): ReputationTierDef | undefined {
  return REPUTATION_TIERS.find((t) => t.required > total);
}

/**
 * 汇总当前声望系统提供的全部被动与军需加成：
 * 1) 累积所有已达成层级的永久被动 bonuses（始终按累计声望 rep.total 判定）；
 * 2) 当前生效中的长效生产/战斗增益卷轴（rep.activeScrolls）；
 * 3) 当前佩戴中的专属名号徽章（rep.equippedTitle）。
 * 返回乘数（如 1.1），由 simulateToNow / hp_combat / party 统一接入。
 */
export function getReputationBonuses(
  player: EnhancedPlayerState,
  now: Date = new Date()
): { gatherSpeed: number; craftSpeed: number; combatSpeed: number; xpGain: number; goldGain: number } {
  const pct: Record<string, number> = { gatherSpeed: 0, craftSpeed: 0, combatSpeed: 0, xpGain: 0, goldGain: 0 };
  const rep = player.reputation;
  const total = rep?.total || 0;
  for (const t of REPUTATION_TIERS) {
    if (total >= t.required) {
      for (const k of Object.keys(pct)) {
        const v = (t.bonuses as any)[k];
        if (typeof v === "number") pct[k] += v;
      }
    }
  }

  const nowMs = now.getTime();
  if (rep?.activeScrolls) {
    for (const item of QUARTERMASTER_ITEMS) {
      if (item.category !== "scroll" || !item.bonuses) continue;
      const exp = Number(rep.activeScrolls[item.id] || 0);
      if (exp > nowMs) {
        for (const k of Object.keys(pct)) {
          const v = (item.bonuses as any)[k];
          if (typeof v === "number") pct[k] += v;
        }
      }
    }
  }

  if (rep?.equippedTitle && Array.isArray(rep.unlockedTitles) && rep.unlockedTitles.includes(rep.equippedTitle)) {
    const titleDef = QUARTERMASTER_ITEMS.find((it) => it.id === rep.equippedTitle && it.category === "title");
    if (titleDef?.bonuses) {
      for (const k of Object.keys(pct)) {
        const v = (titleDef.bonuses as any)[k];
        if (typeof v === "number") pct[k] += v;
      }
    }
  }

  const gh = player.guildHonor;
  if (gh?.equippedFrame && Array.isArray(gh.unlockedFrames) && gh.unlockedFrames.includes(gh.equippedFrame)) {
    const frameDef = GUILD_HONOR_SHOP.find((it) => it.id === gh.equippedFrame && it.category === "frame");
    if (frameDef?.bonuses) {
      for (const k of Object.keys(pct)) {
        const v = (frameDef.bonuses as any)[k];
        if (typeof v === "number") pct[k] += v;
      }
    }
  }

  return {
    gatherSpeed: 1 + pct.gatherSpeed / 100,
    craftSpeed: 1 + pct.craftSpeed / 100,
    combatSpeed: 1 + pct.combatSpeed / 100,
    xpGain: 1 + pct.xpGain / 100,
    goldGain: 1 + pct.goldGain / 100
  };
}

/** 增加声望（赏金/成就等来源调用），返回是否升级 + 新等级 */
export function addReputation(
  player: EnhancedPlayerState,
  amount: number
): { gained: number; total: number; leveledUp: boolean; tier: ReputationTierDef } {
  const rep = ensureReputation(player);
  const before = getReputationTier(rep.total).tier;
  rep.total += Math.max(0, Math.round(amount));
  const tier = getReputationTier(rep.total);
  const leveledUp = tier.tier > before;
  if (leveledUp) {
    appendLog(player, `声望等级提升至「${tier.name}」（${tier.icon}），永久被动加成已增强！`);
  }
  return { gained: amount, total: rep.total, leveledUp, tier };
}

function resolveMaterialChestRewards(
  totalRep: number,
  contentPack?: EnhancedContentPack
): { gold: number; items: Array<{ itemId: string; name: string; qty: number }> } {
  const rawBundle =
    totalRep >= 12000
      ? {
          gold: 3500,
          entries: [
            { itemId: "crystal_5", fallbackName: "圣光水晶", qty: 3 },
            { itemId: "ingot_6", fallbackName: "秘银锭", qty: 3 },
            { itemId: "magma_essence", fallbackName: "熔岩精华", qty: 2 },
            { itemId: "potion_fortune", fallbackName: "幸运药剂", qty: 2 },
          ],
        }
      : totalRep >= 1500
        ? {
            gold: 1500,
            entries: [
              { itemId: "crystal_3", fallbackName: "耀光水晶", qty: 3 },
              { itemId: "elemental_core", fallbackName: "元素核心", qty: 2 },
              { itemId: "ghost_essence", fallbackName: "幽灵精华", qty: 2 },
              { itemId: "potion_artisan", fallbackName: "巧匠药剂", qty: 1 },
            ],
          }
        : {
            gold: 600,
            entries: [
              { itemId: "crystal_2", fallbackName: "辉光水晶", qty: 3 },
              { itemId: "ingot_2", fallbackName: "铁锭", qty: 4 },
              { itemId: "lumber_2", fallbackName: "加固木板", qty: 4 },
              { itemId: "potion_craft_focus", fallbackName: "专注药剂", qty: 1 },
            ],
          };

  const packMap = new Map<string, string>();
  if (Array.isArray((contentPack as any)?.items)) {
    for (const it of (contentPack as any).items) {
      if (it?.id) packMap.set(String(it.id), String(it.name || it.id));
    }
  }

  const items = rawBundle.entries
    .filter((e) => packMap.size === 0 || packMap.has(e.itemId))
    .map((e) => ({
      itemId: e.itemId,
      name: packMap.get(e.itemId) || e.fallbackName,
      qty: e.qty,
    }));

  return { gold: rawBundle.gold, items };
}

/** 声望军需官商店：兑换道具、限购材料箱、长效卷轴或专属名号徽章 */
export function buyQuartermasterItem(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack | undefined,
  itemId: string,
  now: Date = new Date()
): {
  ok: boolean;
  reason?: string;
  itemId?: string;
  spentCost?: number;
  available?: number;
  rewardSummary?: string;
  grantedItems?: Array<{ itemId: string; name: string; qty: number }>;
} {
  ensurePlayerExtensions(player);
  const rep = ensureReputation(player);
  const def = QUARTERMASTER_ITEMS.find((it) => it.id === itemId);
  if (!def) {
    return { ok: false, reason: "未知的军需官商品" };
  }

  const currentTier = getReputationTier(rep.total);
  if (currentTier.tier < def.requiredTier) {
    const reqDef = REPUTATION_TIERS.find((t) => t.tier === def.requiredTier);
    return {
      ok: false,
      reason: `声望阶位不足（需达到 Lv.${def.requiredTier}「${reqDef?.name || ""}」）`,
    };
  }

  const today = todayLocal(now);
  if (!rep.dailyPurchases || rep.dailyPurchases.date !== today) {
    rep.dailyPurchases = { date: today, counts: {} };
  }
  const boughtToday = rep.dailyPurchases.counts[def.id] || 0;
  if (typeof def.dailyLimit === "number" && boughtToday >= def.dailyLimit) {
    return { ok: false, reason: `今日限购次数已达上限（${def.dailyLimit}/${def.dailyLimit}）` };
  }

  rep.unlockedTitles = Array.isArray(rep.unlockedTitles) ? rep.unlockedTitles : [];
  if (def.category === "title" && rep.unlockedTitles.includes(def.id)) {
    return { ok: false, reason: "该专属名号徽章已永久解锁" };
  }

  const nowMs = now.getTime();
  rep.activeScrolls = rep.activeScrolls || {};
  if (def.category === "scroll" && def.durationMs && def.maxStackMs) {
    const curExp = Math.max(nowMs, Number(rep.activeScrolls[def.id] || 0));
    const curRem = curExp - nowMs;
    if (curRem >= def.maxStackMs) {
      return { ok: false, reason: "该长效卷轴剩余时长已达 12 小时叠加储存上限" };
    }
  }

  const available = getAvailableReputation(player);
  if (available < def.cost) {
    return { ok: false, reason: `可用声望不足（需 ${def.cost} 点，当前可用 ${available} 点）` };
  }

  // 扣除可用声望（累加 spent，绝不扣减 total！）
  rep.spent += def.cost;
  if (typeof def.dailyLimit === "number") {
    rep.dailyPurchases.counts[def.id] = boughtToday + 1;
  }

  player.inventory = player.inventory || { gold: 0 };
  const grantedItems: Array<{ itemId: string; name: string; qty: number }> = [];
  let rewardSummary = "";

  if (def.category === "protection") {
    player.inventory[PROTECTION_MIRROR_ID] = (player.inventory[PROTECTION_MIRROR_ID] || 0) + 1;
    grantedItems.push({ itemId: PROTECTION_MIRROR_ID, name: "保护镜", qty: 1 });
    rewardSummary = "获得 保护镜 ×1";
  } else if (def.category === "chest") {
    const bundle = resolveMaterialChestRewards(rep.total, contentPack);
    player.inventory.gold = (player.inventory.gold || 0) + bundle.gold;
    for (const entry of bundle.items) {
      player.inventory[entry.itemId] = (player.inventory[entry.itemId] || 0) + entry.qty;
      grantedItems.push(entry);
    }
    const itemDesc = bundle.items.map((i) => `${i.name}×${i.qty}`).join("、");
    rewardSummary = `开启获得 ${itemDesc} 及金币 +${bundle.gold}`;
  } else if (def.category === "scroll" && def.durationMs && def.maxStackMs) {
    const baseMs = Math.max(nowMs, Number(rep.activeScrolls[def.id] || 0));
    const nextExp = Math.min(nowMs + def.maxStackMs, baseMs + def.durationMs);
    rep.activeScrolls[def.id] = nextExp;
    const totalHours = Math.round(((nextExp - nowMs) / (60 * 60 * 1000)) * 10) / 10;
    rewardSummary = `已激活「${def.name}」，当前剩余有效时长约 ${totalHours} 小时`;
  } else if (def.category === "title") {
    rep.unlockedTitles.push(def.id);
    rep.equippedTitle = def.id;
    rewardSummary = `永久解锁并已佩戴名号「${def.titleLabel || def.name}」`;
  }

  syncAchievements(player);
  appendLog(player, `声望军需兑换「${def.name}」（消耗 ${def.cost} 可用声望）：${rewardSummary}`);
  return {
    ok: true,
    itemId: def.id,
    spentCost: def.cost,
    available: getAvailableReputation(player),
    rewardSummary,
    grantedItems,
  };
}

/** 佩戴或卸下已解锁的声望专属名号徽章 */
export function equipReputationTitle(
  player: EnhancedPlayerState,
  titleId: string | null
): { ok: boolean; reason?: string; equippedTitle: string | null } {
  const rep = ensureReputation(player);
  const unlocked = Array.isArray(rep.unlockedTitles) ? rep.unlockedTitles : [];
  if (!titleId) {
    rep.equippedTitle = null;
    return { ok: true, equippedTitle: null };
  }
  const def = QUARTERMASTER_ITEMS.find((it) => it.id === titleId && it.category === "title");
  if (!def || !unlocked.includes(titleId)) {
    return { ok: false, reason: "尚未解锁该专属名号徽章", equippedTitle: rep.equippedTitle || null };
  }
  rep.equippedTitle = titleId;
  appendLog(player, `已佩戴声望专属名号「${def.titleLabel || def.name}」`);
  return { ok: true, equippedTitle: titleId };
}

/** 声望面板信息（含声望阶位进度、实时加成汇总与军需官商店商品状态） */
export function getReputationInfo(player: EnhancedPlayerState, now: Date = new Date()) {
  const rep = ensureReputation(player);
  const tier = getReputationTier(rep.total);
  const next = getNextReputationTier(rep.total);
  const bonuses = getReputationBonuses(player, now);
  const available = getAvailableReputation(player);
  const today = todayLocal(now);
  const dailyCounts = rep.dailyPurchases?.date === today ? rep.dailyPurchases.counts || {} : {};
  const unlockedTitles = Array.isArray(rep.unlockedTitles) ? rep.unlockedTitles : [];
  const equippedTitleId =
    rep.equippedTitle && unlockedTitles.includes(rep.equippedTitle) ? rep.equippedTitle : null;
  const equippedDef = equippedTitleId
    ? QUARTERMASTER_ITEMS.find((it) => it.id === equippedTitleId && it.category === "title")
    : undefined;
  const nowMs = now.getTime();

  const activeScrolls = QUARTERMASTER_ITEMS.filter((it) => it.category === "scroll")
    .map((it) => {
      const exp = Number(rep.activeScrolls?.[it.id] || 0);
      return {
        id: it.id,
        name: it.name,
        iconKind: it.iconKind,
        iconId: it.iconId,
        remainingMs: Math.max(0, exp - nowMs),
        effectText: it.effectText,
      };
    })
    .filter((s) => s.remainingMs > 0);

  const quartermasterShop = QUARTERMASTER_ITEMS.map((it) => {
    const reqTierDef = REPUTATION_TIERS.find((t) => t.tier === it.requiredTier);
    const unlockedByTier = tier.tier >= it.requiredTier;
    const dailyBought = typeof it.dailyLimit === "number" ? dailyCounts[it.id] || 0 : 0;
    const dailySoldOut = typeof it.dailyLimit === "number" && dailyBought >= it.dailyLimit;
    const isUnlockedTitle = it.category === "title" && unlockedTitles.includes(it.id);
    const isEquippedTitle = it.category === "title" && equippedTitleId === it.id;
    const activeRemainingMs =
      it.category === "scroll" ? Math.max(0, Number(rep.activeScrolls?.[it.id] || 0) - nowMs) : 0;
    const scrollCapped =
      it.category === "scroll" && typeof it.maxStackMs === "number" && activeRemainingMs >= it.maxStackMs;

    let blockReason: string | null = null;
    if (!unlockedByTier) {
      blockReason = `需 Lv.${it.requiredTier}「${reqTierDef?.name || ""}」`;
    } else if (isUnlockedTitle) {
      blockReason = "已永久解锁";
    } else if (dailySoldOut) {
      blockReason = "今日已售罄";
    } else if (scrollCapped) {
      blockReason = "已达12h上限";
    } else if (available < it.cost) {
      blockReason = "可用声望不足";
    }

    return {
      id: it.id,
      name: it.name,
      category: it.category,
      categoryLabel: it.categoryLabel,
      iconKind: it.iconKind,
      iconId: it.iconId,
      cost: it.cost,
      requiredTier: it.requiredTier,
      requiredTierName: reqTierDef?.name || "",
      dailyLimit: it.dailyLimit ?? null,
      dailyBought,
      titleLabel: it.titleLabel ?? null,
      summary: it.summary,
      effectText: it.effectText,
      unlockedByTier,
      isUnlockedTitle,
      isEquippedTitle,
      activeRemainingMs,
      canBuy: blockReason === null,
      blockReason,
    };
  });

  return {
    total: rep.total,
    spent: rep.spent,
    available,
    currentTier: tier,
    nextTier: next,
    progressToNext: next ? Math.max(0, next.required - rep.total) : 0,
    equippedTitle: equippedDef
      ? {
          id: equippedDef.id,
          titleLabel: equippedDef.titleLabel || equippedDef.name,
          name: equippedDef.name,
          iconKind: equippedDef.iconKind,
          iconId: equippedDef.iconId,
          effectText: equippedDef.effectText,
        }
      : null,
    unlockedTitles,
    activeScrolls,
    quartermasterShop,
    activeBonuses: {
      gatherSpeed: Math.round((bonuses.gatherSpeed - 1) * 100),
      craftSpeed: Math.round((bonuses.craftSpeed - 1) * 100),
      combatSpeed: Math.round((bonuses.combatSpeed - 1) * 100),
      xpGain: Math.round((bonuses.xpGain - 1) * 100),
      goldGain: Math.round((bonuses.goldGain - 1) * 100)
    },
    tiers: REPUTATION_TIERS
  };
}

/* ============================ 异世界公会：每日词缀讨伐委托板 & 连携赏金系统 ============================ */

export interface GuildBountyAffixDef {
  id: GuildBountyAffixId;
  name: string;
  enName: string;
  iconKind: "skills";
  iconId: string;
  tone: "emerald" | "crimson" | "cyan" | "amber" | "gold";
  preferredMetrics: Array<"gather" | "craft" | "kill">;
  ecologicalSummary: string;
  activeEffectText: string;
  lingeringEffectText: string;
  activeModifiers: {
    gatherDoubleChance?: number;
    armorPenPct?: number;
    bonusAtk?: number;
    intervalMult?: number;
    combatSpeedPct?: number;
    craftEfficiencyPct?: number;
    craftSpeedPct?: number;
    goldGainPct?: number;
    rareFindPct?: number;
  };
  lingeringModifiers: {
    gatherDoubleChance?: number;
    armorPenPct?: number;
    bonusAtk?: number;
    intervalMult?: number;
    combatSpeedPct?: number;
    craftEfficiencyPct?: number;
    craftSpeedPct?: number;
    goldGainPct?: number;
    rareFindPct?: number;
  };
}

export const GUILD_BOUNTY_AFFIXES: GuildBountyAffixDef[] = [
  {
    id: "bountiful_harvest",
    name: "双倍采集产出",
    enName: "Bountiful Harvest",
    iconKind: "skills",
    iconId: "affix_bountiful_harvest",
    tone: "emerald",
    preferredMetrics: ["gather"],
    ecologicalSummary: "丰饶灵脉涌动，公会勘探区内矿木灵草在委托执行期间成倍析出。",
    activeEffectText: "执行中：采集基础产出 100% 双倍触发",
    lingeringEffectText: "当日余韵：采集双倍暴击率 +12%",
    activeModifiers: { gatherDoubleChance: 1.0 },
    lingeringModifiers: { gatherDoubleChance: 0.12 },
  },
  {
    id: "scorching_sunder",
    name: "炽热护甲破防",
    enName: "Scorching Armor-Break",
    iconKind: "skills",
    iconId: "affix_scorching_sunder",
    tone: "crimson",
    preferredMetrics: ["kill"],
    ecologicalSummary: "熔火裂隙侵蚀魔物甲壳，炽热战意可大幅贯穿敌方护甲防御。",
    activeEffectText: "执行中：护甲穿透 +30% · 攻击力 +6",
    lingeringEffectText: "当日余韵：护甲穿透 +8% · 攻击力 +2",
    activeModifiers: { armorPenPct: 0.3, bonusAtk: 6 },
    lingeringModifiers: { armorPenPct: 0.08, bonusAtk: 2 },
  },
  {
    id: "swift_assault",
    name: "迅捷攻速试炼",
    enName: "Swift Assault Trial",
    iconKind: "skills",
    iconId: "affix_swift_assault",
    tone: "cyan",
    preferredMetrics: ["kill"],
    ecologicalSummary: "疾风魔力充盈讨伐战域，猎手进入高频率连斩试炼节奏。",
    activeEffectText: "执行中：攻击间隔缩短 18% · 讨伐速度 +20%",
    lingeringEffectText: "当日余韵：攻击间隔缩短 5% · 讨伐速度 +6%",
    activeModifiers: { intervalMult: 0.82, combatSpeedPct: 20 },
    lingeringModifiers: { intervalMult: 0.95, combatSpeedPct: 6 },
  },
  {
    id: "artisan_overdrive",
    name: "巧匠炉火共鸣",
    enName: "Artisan Forge Resonance",
    iconKind: "skills",
    iconId: "affix_artisan_overdrive",
    tone: "amber",
    preferredMetrics: ["craft"],
    ecologicalSummary: "公会秘锻炉火与工坊共鸣，制造效率与出炉速度同步跃升。",
    activeEffectText: "执行中：制作效率 +25% · 制作速度 +20%",
    lingeringEffectText: "当日余韵：制作效率 +6% · 制作速度 +5%",
    activeModifiers: { craftEfficiencyPct: 25, craftSpeedPct: 20 },
    lingeringModifiers: { craftEfficiencyPct: 6, craftSpeedPct: 5 },
  },
  {
    id: "gilded_spoils",
    name: "黄金战利悬赏",
    enName: "Gilded Spoils Bounty",
    iconKind: "skills",
    iconId: "affix_gilded_spoils",
    tone: "gold",
    preferredMetrics: ["craft", "gather", "kill"],
    ecologicalSummary: "王都商会联合追加悬赏金，所有作业与讨伐额外析出金币与稀有战利。",
    activeEffectText: "执行中：金币收益 +35% · 稀有掉率 +25%",
    lingeringEffectText: "当日余韵：金币收益 +8% · 稀有掉率 +6%",
    activeModifiers: { goldGainPct: 35, rareFindPct: 25 },
    lingeringModifiers: { goldGainPct: 8, rareFindPct: 6 },
  },
];

type BountyTemplate = {
  id: string;
  name: string;
  description: string;
  icon: string;
  iconKind: "skills" | "ui";
  iconId: string;
  metric: "gather" | "craft" | "kill";
  target: number;
  baseGold: number;
  baseRep: number;
  baseHonor: number;
};

// 契约模板池：覆盖采集/制作/击杀三类，全部绑定 T1 手绘美术键（零 Emoji 占位）。
export const BOUNTY_TEMPLATES: BountyTemplate[] = [
  { id: "bt_gather_50", name: "灵脉物资勘探", description: "采集 50 份异世界资源", icon: "gather_1", iconKind: "ui", iconId: "nav-logging", metric: "gather", target: 50, baseGold: 420, baseRep: 22, baseHonor: 16 },
  { id: "bt_gather_120", name: "丰饶大宗征集", description: "采集 120 份异世界资源", icon: "gather_2", iconKind: "ui", iconId: "nav-gathering", metric: "gather", target: 120, baseGold: 920, baseRep: 48, baseHonor: 24 },
  { id: "bt_gather_250", name: "秘境灵材囤储", description: "采集 250 份异世界资源", icon: "gather_3", iconKind: "ui", iconId: "nav-mining", metric: "gather", target: 250, baseGold: 1850, baseRep: 92, baseHonor: 36 },
  { id: "bt_craft_25", name: "军需工坊急单", description: "制作 25 件工坊制品", icon: "craft_1", iconKind: "ui", iconId: "nav-woodworking", metric: "craft", target: 25, baseGold: 460, baseRep: 24, baseHonor: 18 },
  { id: "bt_craft_60", name: "百工精铸配给", description: "制作 60 件工坊制品", icon: "craft_2", iconKind: "ui", iconId: "nav-smithing", metric: "craft", target: 60, baseGold: 1020, baseRep: 52, baseHonor: 26 },
  { id: "bt_craft_120", name: "王都宗师军备", description: "制作 120 件工坊制品", icon: "craft_3", iconKind: "ui", iconId: "nav-alchemy", metric: "craft", target: 120, baseGold: 2050, baseRep: 105, baseHonor: 38 },
  { id: "bt_kill_30", name: "前线魔物清剿", description: "讨伐击杀 30 只魔物", icon: "kill_1", iconKind: "ui", iconId: "nav-adventure", metric: "kill", target: 30, baseGold: 520, baseRep: 26, baseHonor: 20 },
  { id: "bt_kill_80", name: "裂隙精锐讨伐", description: "讨伐击杀 80 只魔物", icon: "kill_2", iconKind: "ui", iconId: "nav-melee", metric: "kill", target: 80, baseGold: 1150, baseRep: 58, baseHonor: 28 },
  { id: "bt_kill_160", name: "深渊灾兽征讨", description: "讨伐击杀 160 只魔物", icon: "kill_3", iconKind: "ui", iconId: "nav-ranged", metric: "kill", target: 160, baseGold: 2250, baseRep: 112, baseHonor: 40 },
];

export interface GuildComboMilestoneDef {
  id: GuildComboMilestoneId;
  name: string;
  badgeText: string;
  iconKind: "skills";
  iconId: string;
  requiredCount: number; // chain_full 动态对齐当日满板契约数（最小 3，标准 4）
  honorPoints: number;
  forgingEmblems: number;
  gold: number;
  reputation: number;
  bonusItems?: Record<string, number>;
  summary: string;
}

export const GUILD_COMBO_MILESTONES: GuildComboMilestoneDef[] = [
  {
    id: "chain_2",
    name: "二连讨伐连携",
    badgeText: "2-Chain 连携",
    iconKind: "skills",
    iconId: "guild_honor_crest",
    requiredCount: 2,
    honorPoints: 60,
    forgingEmblems: 1,
    gold: 600,
    reputation: 35,
    summary: "同日完成 2 份词缀委托：授予公会荣誉积分与稀有锻造徽记",
  },
  {
    id: "chain_full",
    name: "全板制霸赏金",
    badgeText: "Full-Board 制霸",
    iconKind: "skills",
    iconId: "forging_emblem",
    requiredCount: 4,
    honorPoints: 140,
    forgingEmblems: 3,
    gold: 1500,
    reputation: 80,
    bonusItems: { [PROTECTION_MIRROR_ID]: 1 },
    summary: "同日扫清全板委托：重奖公会荣誉、稀有锻造徽记与强化保护镜",
  },
];

export interface GuildHonorShopItemDef {
  id: string;
  name: string;
  category: GuildHonorShopCategory;
  categoryLabel: string;
  iconKind: "skills" | "materials";
  iconId: string;
  honorCost: number;
  emblemCost: number;
  dailyLimit?: number;
  frameLabel?: string;
  frameTheme?: "crimson" | "astral";
  bonuses?: ReputationBonusPct;
  summary: string;
  effectText: string;
}

export const GUILD_HONOR_SHOP: GuildHonorShopItemDef[] = [
  {
    id: "frame_crimson_vanguard",
    name: "专属边框·绯焰讨伐纹章框",
    category: "frame",
    categoryLabel: "专属公会边框",
    iconKind: "skills",
    iconId: "guild_frame_crimson",
    honorCost: 120,
    emblemCost: 1,
    frameLabel: "绯焰讨伐纹章",
    frameTheme: "crimson",
    bonuses: { combatSpeed: 3, goldGain: 3 },
    summary: "以赤龙鳞金与红莲宝石锻造的公会精锐头像框，解锁后可在顶栏与角色卡佩戴展示",
    effectText: "永久解锁专属边框 · 佩戴加成：战斗速度 +3% · 金币获取 +3%",
  },
  {
    id: "frame_astral_sovereign",
    name: "专属边框·星穹全制霸圣冕框",
    category: "frame",
    categoryLabel: "专属公会边框",
    iconKind: "skills",
    iconId: "guild_frame_astral",
    honorCost: 280,
    emblemCost: 3,
    frameLabel: "星穹全制霸圣冕",
    frameTheme: "astral",
    bonuses: { gatherSpeed: 4, craftSpeed: 4, combatSpeed: 4, xpGain: 5 },
    summary: "唯屡次全板制霸的传奇冒险者方能兑换的白金星冕边框，辉映全公会最高殊荣",
    effectText: "永久解锁专属边框 · 佩戴加成：采集/制作/战斗速度 +4% · 经验获取 +5%",
  },
  {
    id: "supply_forging_emblem_pack",
    name: "秘锻徽记淬火礼匣",
    category: "forging",
    categoryLabel: "锻造徽记补给",
    iconKind: "skills",
    iconId: "forging_emblem",
    honorCost: 80,
    emblemCost: 1,
    dailyLimit: 3,
    summary: "凭稀有锻造徽记向公会铁匠宗师申领强化保护镜与当前等阶高纯度锭晶",
    effectText: "立即获得 保护镜 ×1 + 等阶精炼金属锭/魔力水晶 + 锻造津贴 800 金币",
  },
  {
    id: "supply_bounty_ration_kit",
    name: "公会讨伐战备补给包",
    category: "supply",
    categoryLabel: "讨伐战备补给",
    iconKind: "skills",
    iconId: "qm_supply_chest",
    honorCost: 60,
    emblemCost: 0,
    dailyLimit: 5,
    summary: "公会后勤处配发的速效讨伐秘药与悬赏刷新令，助力连续攻坚词缀委托",
    effectText: "恢复 1 次今日委托板刷新额度 + 战备药剂包 + 讨伐军饷 500 金币",
  },
];

const RARITY_ROLL: Array<{ rarity: Bounty["rarity"]; weight: number; mult: number }> = [
  { rarity: "common", weight: 55, mult: 1.0 },
  { rarity: "rare", weight: 32, mult: 1.6 },
  { rarity: "epic", weight: 13, mult: 2.5 },
];

const MAX_DAILY_REROLLS = 3;
export const BOUNTY_SLOTS = 4;
const REROLL_COST = 500; // 每次刷新消耗金币

function todayUTC(now: Date = new Date()): string {
  return todayLocal(now);
}

/** FNV-1a 32-bit + Mulberry32 确定性伪随机生成器（同日期+同刷新序号恒定产出同一张词缀委托板） */
export function createSeededRng(seedKey: string): () => number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seedKey.length; i++) {
    h ^= seedKey.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  let state = h >>> 0;
  if (state === 0) state = 0x9e3779b9;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildDailyBountySeedKey(date: string, rerollIndex = 0): string {
  return `wl5-guild-bounty:${date}#r${Math.max(0, Math.floor(rerollIndex || 0))}`;
}

function rollRaritySeeded(rng: () => number): { rarity: Bounty["rarity"]; mult: number } {
  const totalW = RARITY_ROLL.reduce((s, r) => s + r.weight, 0);
  let r = rng() * totalW;
  for (const opt of RARITY_ROLL) {
    if (r < opt.weight) return { rarity: opt.rarity, mult: opt.mult };
    r -= opt.weight;
  }
  return { rarity: "common", mult: 1.0 };
}

/** 将 bounty.metric 映射到 stats 累计字段 */
function metricToStat(metric: Bounty["metric"]): keyof PlayerStats {
  if (metric === "gather") return "totalGathered";
  if (metric === "craft") return "totalCrafted";
  return "totalKills";
}

export function getAffixDef(affixId?: string | null): GuildBountyAffixDef {
  return GUILD_BOUNTY_AFFIXES.find((a) => a.id === affixId) || GUILD_BOUNTY_AFFIXES[0];
}

function defaultAffixForTemplate(tplId: string, metric: Bounty["metric"], slotIdx = 0): GuildBountyAffixId {
  if (metric === "gather") return "bountiful_harvest";
  if (metric === "kill") {
    return slotIdx % 2 === 0 || tplId === "bt_kill_30" ? "scorching_sunder" : "swift_assault";
  }
  return slotIdx % 2 === 0 ? "artisan_overdrive" : "gilded_spoils";
}

/** 生成一条确定性词缀契约（baseline 取当前 stats） */
function genBountyFrom(
  tpl: BountyTemplate,
  stats: PlayerStats,
  affixId: GuildBountyAffixId,
  rng: () => number,
  idSuffix: string
): Bounty {
  const { rarity, mult } = rollRaritySeeded(rng);
  const statKey = metricToStat(tpl.metric);
  const affix = getAffixDef(affixId);
  return {
    id: `${tpl.id}_${idSuffix}`,
    templateId: tpl.id,
    name: tpl.name,
    description: tpl.description,
    icon: tpl.icon,
    iconKind: affix.iconKind,
    iconId: affix.iconId,
    affixId: affix.id,
    metric: tpl.metric,
    target: tpl.target,
    baseline: (stats[statKey] as number) || 0,
    accepted: false,
    claimed: false,
    rarity,
    honorReward: Math.max(10, Math.round(tpl.baseHonor * mult)),
    reward: {
      gold: Math.round(tpl.baseGold * mult),
      reputation: Math.round(tpl.baseRep * mult),
    },
  };
}

function pickFromPool<T>(pool: T[], rng: () => number): T {
  const idx = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
  return pool.splice(idx, 1)[0];
}

/**
 * 按日期种子确定性生成一整板词缀委托（默认 4 槽）：
 * - 保证同板契约模板绝不重复、生态词缀绝不重复；
 * - 初始整板恒定覆盖三大核心生态词缀：双倍采集产出、炽热护甲破防、迅捷攻速试炼，以及第 4 槽工坊/黄金悬赏词缀。
 */
export function genDailyAffixBountyBoard(
  date: string,
  stats: PlayerStats,
  count: number = BOUNTY_SLOTS,
  rerollIndex = 0,
  excludeTemplates: Set<string> = new Set(),
  excludeAffixes: Set<GuildBountyAffixId> = new Set()
): Bounty[] {
  const seedKey = buildDailyBountySeedKey(date, rerollIndex);
  const rng = createSeededRng(seedKey);
  const compactDate = date.replace(/[^0-9]/g, "") || "daily";
  const usedTemplates = new Set<string>(excludeTemplates);
  const usedAffixes = new Set<GuildBountyAffixId>(excludeAffixes);
  const out: Bounty[] = [];

  const plannedAffixes: GuildBountyAffixId[] = [
    "bountiful_harvest",
    "scorching_sunder",
    "swift_assault",
    rng() < 0.5 ? "artisan_overdrive" : "gilded_spoils",
  ];
  // 若存在被保留的已接取词缀，则补齐尚未登场的生态词缀
  for (const a of GUILD_BOUNTY_AFFIXES) {
    if (!plannedAffixes.includes(a.id)) plannedAffixes.push(a.id);
  }

  for (const affixId of plannedAffixes) {
    if (out.length >= count) break;
    if (usedAffixes.has(affixId)) continue;
    const affix = getAffixDef(affixId);
    const preferredPool = BOUNTY_TEMPLATES.filter(
      (t) => !usedTemplates.has(t.id) && affix.preferredMetrics.includes(t.metric)
    );
    const fallbackPool = BOUNTY_TEMPLATES.filter((t) => !usedTemplates.has(t.id));
    const pool = preferredPool.length > 0 ? [...preferredPool] : [...fallbackPool];
    if (pool.length === 0) break;
    const tpl = pickFromPool(pool, rng);
    usedTemplates.add(tpl.id);
    usedAffixes.add(affixId);
    const token = Math.floor(rng() * 0xffffff).toString(16).padStart(6, "0");
    out.push(genBountyFrom(tpl, stats, affixId, rng, `${compactDate}r${rerollIndex}s${out.length}_${token}`));
  }

  // 若槽位仍未满（例如保留了较多进行中契约导致词缀池耗尽），继续从剩余模板补齐
  const restPool = BOUNTY_TEMPLATES.filter((t) => !usedTemplates.has(t.id));
  while (out.length < count && restPool.length > 0) {
    const tpl = pickFromPool(restPool, rng);
    usedTemplates.add(tpl.id);
    const unusedAffix =
      GUILD_BOUNTY_AFFIXES.find((a) => !usedAffixes.has(a.id))?.id ||
      defaultAffixForTemplate(tpl.id, tpl.metric, out.length);
    usedAffixes.add(unusedAffix);
    const token = Math.floor(rng() * 0xffffff).toString(16).padStart(6, "0");
    out.push(genBountyFrom(tpl, stats, unusedAffix, rng, `${compactDate}r${rerollIndex}s${out.length}_${token}`));
  }

  return out;
}

/** 确保 guildHonor 持久对象存在并净化非法数值（向后兼容旧存档） */
export function ensureGuildHonor(player: EnhancedPlayerState): GuildHonorState {
  if (!Array.isArray((player as any).logs)) {
    (player as any).logs = [];
  }
  if (!player.guildHonor || typeof player.guildHonor !== "object") {
    player.guildHonor = {
      honorPoints: 0,
      totalHonorEarned: 0,
      forgingEmblems: 0,
      totalChainsCompleted: 0,
      fullClears: 0,
      unlockedFrames: [],
      equippedFrame: null,
    };
  }
  const gh = player.guildHonor;
  const cleanInt = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
  gh.honorPoints = cleanInt(gh.honorPoints);
  gh.totalHonorEarned = Math.max(gh.honorPoints, cleanInt(gh.totalHonorEarned));
  gh.forgingEmblems = cleanInt(gh.forgingEmblems);
  gh.totalChainsCompleted = cleanInt(gh.totalChainsCompleted);
  gh.fullClears = cleanInt(gh.fullClears);
  if (!Array.isArray(gh.unlockedFrames)) gh.unlockedFrames = [];
  gh.unlockedFrames = Array.from(new Set(gh.unlockedFrames.filter((x) => typeof x === "string" && x.length > 0)));
  if (typeof gh.equippedFrame !== "string" || !gh.unlockedFrames.includes(gh.equippedFrame)) {
    gh.equippedFrame = null;
  }
  return gh;
}

/** 为旧版无词缀契约补齐确定性生态词缀与荣誉奖励，不改动其接取/领奖进度 */
function hydrateLegacyBoardInPlace(state: BountyState): void {
  const usedAffixes = new Set<GuildBountyAffixId>();
  const tplMap = new Map(BOUNTY_TEMPLATES.map((t) => [t.id, t]));
  state.bounties.forEach((b, idx) => {
    const tpl = tplMap.get(b.templateId);
    if (!b.affixId || !GUILD_BOUNTY_AFFIXES.some((a) => a.id === b.affixId)) {
      const preferred = GUILD_BOUNTY_AFFIXES.find(
        (a) => !usedAffixes.has(a.id) && a.preferredMetrics.includes(b.metric)
      );
      const fallback = GUILD_BOUNTY_AFFIXES.find((a) => !usedAffixes.has(a.id));
      b.affixId = preferred?.id || fallback?.id || defaultAffixForTemplate(b.templateId, b.metric, idx);
    }
    usedAffixes.add(b.affixId);
    const affix = getAffixDef(b.affixId);
    b.iconKind = affix.iconKind;
    b.iconId = affix.iconId;
    if (typeof b.honorReward !== "number" || !Number.isFinite(b.honorReward) || b.honorReward <= 0) {
      const mult = b.rarity === "epic" ? 2.5 : b.rarity === "rare" ? 1.6 : 1.0;
      b.honorReward = Math.max(10, Math.round((tpl?.baseHonor || 18) * mult));
    }
  });
  if (typeof state.rerollsUsed !== "number" || !Number.isFinite(state.rerollsUsed) || state.rerollsUsed < 0) {
    state.rerollsUsed = 0;
  }
  const claimedInBoard = state.bounties.filter((b) => b.claimed).length;
  const rawClaimedCount =
    typeof state.claimedTodayCount === "number" && Number.isFinite(state.claimedTodayCount) && state.claimedTodayCount >= 0
      ? Math.floor(state.claimedTodayCount)
      : 0;
  state.claimedTodayCount = Math.max(rawClaimedCount, claimedInBoard);
  if (!Array.isArray(state.claimedAffixesToday)) {
    state.claimedAffixesToday = [];
  }
  for (const b of state.bounties) {
    if (b.claimed && b.affixId && !state.claimedAffixesToday.includes(b.affixId)) {
      state.claimedAffixesToday.push(b.affixId);
    }
  }
  if (!Array.isArray(state.comboClaimed)) {
    state.comboClaimed = [];
  }
  if (!state.seedKey) {
    state.seedKey = buildDailyBountySeedKey(state.date, state.rerollsUsed);
  }
}

/** 确保当日契约板存在；跨日则按新日期种子自动轮换（重置刷新次数与当日连携，保留荣誉积分与徽记） */
export function ensureBounties(player: EnhancedPlayerState, now: Date = new Date()): BountyState {
  ensurePlayerExtensions(player);
  ensureGuildHonor(player);
  const stats = player.stats!;
  const today = todayUTC(now);
  const known = new Set(BOUNTY_TEMPLATES.map((t) => t.id));
  const stale = (board: Bounty[] | undefined) =>
    !board ||
    board.length === 0 ||
    new Set(board.map((b) => b.templateId)).size !== board.length ||
    board.some((b) => !known.has(b.templateId));

  if (!player.bounties || player.bounties.date !== today || stale(player.bounties.bounties)) {
    const sameDay = Boolean(player.bounties && player.bounties.date === today);
    const keptRerolls =
      sameDay && typeof player.bounties!.rerollsUsed === "number" && Number.isFinite(player.bounties!.rerollsUsed) && player.bounties!.rerollsUsed >= 0
        ? Math.floor(player.bounties!.rerollsUsed)
        : 0;
    const keptClaimedCount =
      sameDay && typeof player.bounties!.claimedTodayCount === "number" && Number.isFinite(player.bounties!.claimedTodayCount) && player.bounties!.claimedTodayCount >= 0
        ? Math.floor(player.bounties!.claimedTodayCount)
        : 0;
    const keptCombo = sameDay && Array.isArray(player.bounties!.comboClaimed) ? [...player.bounties!.comboClaimed] : [];
    const keptClaimedAffixes =
      sameDay && Array.isArray(player.bounties!.claimedAffixesToday) ? [...player.bounties!.claimedAffixesToday] : [];

    player.bounties = {
      date: today,
      seedKey: buildDailyBountySeedKey(today, keptRerolls),
      bounties: genDailyAffixBountyBoard(today, stats, BOUNTY_SLOTS, keptRerolls),
      rerollsUsed: keptRerolls,
      claimedTodayCount: keptClaimedCount,
      claimedAffixesToday: keptClaimedAffixes,
      comboClaimed: keptCombo,
    };
  } else {
    hydrateLegacyBoardInPlace(player.bounties);
  }
  return player.bounties;
}

/** 某契约当前进度（0..target） */
export function bountyProgress(stats: PlayerStats, b: Bounty): number {
  const cur = (stats[metricToStat(b.metric)] as number) || 0;
  return Math.max(0, Math.min(b.target, cur - b.baseline));
}

export interface ActiveGuildAffixModifiers {
  gatherDoubleChance: number;
  armorPenPct: number;
  bonusAtk: number;
  intervalMult: number;
  combatSpeedPct: number;
  craftEfficiencyPct: number;
  craftSpeedPct: number;
  goldGainPct: number;
  rareFindPct: number;
  activeAffixes: Array<{ id: GuildBountyAffixId; name: string; mode: "active" | "lingering"; effectText: string }>;
}

/**
 * 纯函数：汇总玩家当前委托板上正在执行或当日已完成留存的生态词缀修正值。
 * - 已接取且未满额未领奖（accepted && !claimed && progress < target）：激活完整「执行中」生态词缀效果；
 * - 当日已完成领奖（claimed || claimedAffixesToday）：保留温和的「当日余韵」加成，防止故意卡着不领奖刷无限增益。
 * 不直接依赖系统时钟，确保 hp_combat 与前端 combatSheet 100% 确定性同构。
 */
export function getActiveGuildAffixModifiers(
  player?: Pick<EnhancedPlayerState, "bounties" | "stats"> | null
): ActiveGuildAffixModifiers {
  const res: ActiveGuildAffixModifiers = {
    gatherDoubleChance: 0,
    armorPenPct: 0,
    bonusAtk: 0,
    intervalMult: 1,
    combatSpeedPct: 0,
    craftEfficiencyPct: 0,
    craftSpeedPct: 0,
    goldGainPct: 0,
    rareFindPct: 0,
    activeAffixes: [],
  };
  const board = player?.bounties?.bounties;
  if (!Array.isArray(board) || board.length === 0) return res;
  const stats = (player?.stats || {
    totalGathered: 0,
    totalCrafted: 0,
    totalKills: 0,
  }) as PlayerStats;

  const modeByAffix = new Map<GuildBountyAffixId, "active" | "lingering">();
  for (const b of board) {
    if (!b.affixId) continue;
    if (b.accepted && !b.claimed && bountyProgress(stats, b) < b.target) {
      modeByAffix.set(b.affixId, "active");
    } else if (b.claimed && modeByAffix.get(b.affixId) !== "active") {
      modeByAffix.set(b.affixId, "lingering");
    }
  }
  if (Array.isArray(player?.bounties?.claimedAffixesToday)) {
    for (const aid of player!.bounties!.claimedAffixesToday!) {
      if (!modeByAffix.has(aid)) modeByAffix.set(aid, "lingering");
    }
  }

  for (const [affixId, mode] of modeByAffix.entries()) {
    const def = GUILD_BOUNTY_AFFIXES.find((a) => a.id === affixId);
    if (!def) continue;
    const m = mode === "active" ? def.activeModifiers : def.lingeringModifiers;
    res.gatherDoubleChance = Math.min(1, res.gatherDoubleChance + (m.gatherDoubleChance || 0));
    res.armorPenPct = Math.min(0.75, res.armorPenPct + (m.armorPenPct || 0));
    res.bonusAtk += m.bonusAtk || 0;
    if (m.intervalMult && m.intervalMult > 0) {
      res.intervalMult = Math.max(0.65, Math.round(res.intervalMult * m.intervalMult * 1000) / 1000);
    }
    res.combatSpeedPct += m.combatSpeedPct || 0;
    res.craftEfficiencyPct += m.craftEfficiencyPct || 0;
    res.craftSpeedPct += m.craftSpeedPct || 0;
    res.goldGainPct += m.goldGainPct || 0;
    res.rareFindPct += m.rareFindPct || 0;
    res.activeAffixes.push({
      id: def.id,
      name: def.name,
      mode,
      effectText: mode === "active" ? def.activeEffectText : def.lingeringEffectText,
    });
  }
  return res;
}

/** 接取契约：把 baseline 重置为当前值，从接取时刻开始计数并激活对应生态词缀 */
export function acceptBounty(
  player: EnhancedPlayerState,
  bountyId: string,
  now: Date = new Date()
): { ok: boolean; reason?: string } {
  ensureBounties(player, now);
  const stats = player.stats!;
  const b = player.bounties!.bounties.find((x) => x.id === bountyId);
  if (!b) return { ok: false, reason: "契约不存在" };
  if (b.accepted) return { ok: false, reason: "契约已接取" };
  b.accepted = true;
  b.baseline = (stats[metricToStat(b.metric)] as number) || 0;
  const affix = b.affixId ? getAffixDef(b.affixId) : null;
  appendLog(
    player,
    affix
      ? `接取公会词缀委托「${b.name} · ${affix.name}」（${affix.activeEffectText}）`
      : `接取赏金契约「${b.name}」`
  );
  return { ok: true };
}

/** 领取契约奖励（需已接取且完成），同时推进当日连携计数并授予公会荣誉积分 */
export function claimBounty(
  player: EnhancedPlayerState,
  bountyId: string,
  now: Date = new Date()
): {
  ok: boolean;
  reason?: string;
  gold?: number;
  reputation?: number;
  honorGained?: number;
  items?: Record<string, number>;
} {
  const state = ensureBounties(player, now);
  const gh = ensureGuildHonor(player);
  const stats = player.stats!;
  const b = state.bounties.find((x) => x.id === bountyId);
  if (!b) return { ok: false, reason: "契约不存在" };
  if (!b.accepted) return { ok: false, reason: "请先接取该契约" };
  if (b.claimed) return { ok: false, reason: "奖励已领取" };
  if (bountyProgress(stats, b) < b.target) return { ok: false, reason: "契约尚未完成" };

  b.claimed = true;
  const alchemyRewardPct =
    getAlchemyCauldronBonuses(player).caravanBountyRewardPct +
    getAstralRelicsBonuses(player).caravanBountyRewardPct;
  const rewardMult = 1 + alchemyRewardPct / 100;
  const gold = Math.round((b.reward.gold || 0) * rewardMult);
  player.inventory.gold = (player.inventory.gold || 0) + gold;
  stats.totalGoldEarned += gold;
  const rep = Math.round((b.reward.reputation || 0) * rewardMult);
  addReputation(player, rep);
  const honorGained = Math.max(0, Math.floor(b.honorReward || 0));
  gh.honorPoints += honorGained;
  gh.totalHonorEarned += honorGained;

  state.claimedTodayCount = Math.max(
    (state.claimedTodayCount || 0) + 1,
    state.bounties.filter((x) => x.claimed).length
  );
  if (b.affixId) {
    if (!Array.isArray(state.claimedAffixesToday)) state.claimedAffixesToday = [];
    if (!state.claimedAffixesToday.includes(b.affixId)) state.claimedAffixesToday.push(b.affixId);
  }

  if (b.reward.items) {
    for (const [id, qty] of Object.entries(b.reward.items)) {
      player.inventory[id] = (player.inventory[id] || 0) + qty;
    }
  }
  appendLog(
    player,
    `完成公会委托「${b.name}」：获得金币 ${gold}、声望 ${rep}、公会荣誉 +${honorGained}（今日连携 ${state.claimedTodayCount}）`
  );
  return { ok: true, gold, reputation: rep, honorGained, items: b.reward.items };
}

/** 刷新整个契约板（消耗金币，每日有次数上限；进行中未领奖契约继续保留，已领奖或未接取槽位重掷新词缀契约） */
export function rerollBounties(
  player: EnhancedPlayerState,
  now: Date = new Date()
): { ok: boolean; reason?: string; cost?: number; rerollsLeft?: number } {
  const state = ensureBounties(player, now);
  if (state.rerollsUsed >= MAX_DAILY_REROLLS) {
    return { ok: false, reason: "今日刷新次数已用完" };
  }
  const gold = player.inventory.gold || 0;
  if (gold < REROLL_COST) return { ok: false, reason: "金币不足" };

  // 已接取且尚未领奖的进行中契约必须保留进度；已领奖的槽位可重掷新契约（claimedTodayCount 已独立持久记录当日连携数）。
  const inProgress = state.bounties.filter((b) => b.accepted && !b.claimed);
  const excludeTpls = new Set(inProgress.map((b) => b.templateId));
  const excludeAffixes = new Set(
    inProgress.map((b) => b.affixId).filter((x): x is GuildBountyAffixId => Boolean(x))
  );
  const nextRerollIndex = state.rerollsUsed + 1;
  const needed = Math.max(0, BOUNTY_SLOTS - inProgress.length);
  const fresh = genDailyAffixBountyBoard(
    state.date,
    player.stats!,
    needed,
    nextRerollIndex,
    excludeTpls,
    excludeAffixes
  );

  player.inventory.gold = gold - REROLL_COST;
  player.stats!.totalGoldSpent += REROLL_COST;
  state.rerollsUsed = nextRerollIndex;
  state.seedKey = buildDailyBountySeedKey(state.date, nextRerollIndex);
  state.bounties = [...inProgress, ...fresh];
  syncAchievements(player);
  appendLog(player, `刷新了公会每日词缀委托板（消耗金币 ${REROLL_COST}）`);
  return { ok: true, cost: REROLL_COST, rerollsLeft: MAX_DAILY_REROLLS - state.rerollsUsed };
}

function getFullBoardTargetCount(state: BountyState): number {
  return Math.max(3, state.bounties.length || BOUNTY_SLOTS);
}

/** 领取当日连携里程碑赏金（二连讨伐连携 / 全板制霸赏金） */
export function claimBountyCombo(
  player: EnhancedPlayerState,
  milestoneId: string,
  now: Date = new Date()
): {
  ok: boolean;
  reason?: string;
  milestoneId?: GuildComboMilestoneId;
  honorGained?: number;
  emblemsGained?: number;
  gold?: number;
  reputation?: number;
  items?: Record<string, number>;
} {
  const state = ensureBounties(player, now);
  const gh = ensureGuildHonor(player);
  const def = GUILD_COMBO_MILESTONES.find((m) => m.id === milestoneId);
  if (!def) return { ok: false, reason: "未知的连携赏金档位" };

  const requiredCount = def.id === "chain_full" ? getFullBoardTargetCount(state) : def.requiredCount;
  const completedToday = state.claimedTodayCount || 0;
  if (!Array.isArray(state.comboClaimed)) state.comboClaimed = [];
  if (state.comboClaimed.includes(def.id)) {
    return { ok: false, reason: "今日该连携赏金已领取" };
  }
  if (completedToday < requiredCount) {
    return { ok: false, reason: `今日需完成 ${requiredCount} 份委托方可领取（当前 ${completedToday}/${requiredCount}）` };
  }

  state.comboClaimed.push(def.id);
  gh.honorPoints += def.honorPoints;
  gh.totalHonorEarned += def.honorPoints;
  gh.forgingEmblems += def.forgingEmblems;
  gh.totalChainsCompleted += 1;
  if (def.id === "chain_full") {
    gh.fullClears += 1;
  }

  player.inventory.gold = (player.inventory.gold || 0) + def.gold;
  player.stats!.totalGoldEarned += def.gold;
  addReputation(player, def.reputation);

  const itemsGranted: Record<string, number> = {};
  if (def.bonusItems) {
    for (const [itemId, qty] of Object.entries(def.bonusItems)) {
      player.inventory[itemId] = (player.inventory[itemId] || 0) + qty;
      itemsGranted[itemId] = qty;
    }
  }

  syncAchievements(player);
  appendLog(
    player,
    `达成公会「${def.name}」：获得公会荣誉 +${def.honorPoints}、稀有锻造徽记 +${def.forgingEmblems}、金币 +${def.gold}、声望 +${def.reputation}`
  );
  return {
    ok: true,
    milestoneId: def.id,
    honorGained: def.honorPoints,
    emblemsGained: def.forgingEmblems,
    gold: def.gold,
    reputation: def.reputation,
    items: Object.keys(itemsGranted).length > 0 ? itemsGranted : undefined,
  };
}

function resolveForgingEmblemPackRewards(
  player: EnhancedPlayerState,
  contentPack?: EnhancedContentPack
): { gold: number; items: Array<{ itemId: string; name: string; qty: number }> } {
  const smithLv = Number(player.skills?.skill_blacksmith_craft?.level || player.skills?.skill_blacksmith?.level || 1);
  const combatLv = Number(player.combatLevel || 1);
  const progressLv = Math.max(smithLv, combatLv);

  const rawEntries =
    progressLv >= 35
      ? [
          { itemId: PROTECTION_MIRROR_ID, fallbackName: "保护镜", qty: 1 },
          { itemId: "ingot_4", fallbackName: "金锭", qty: 4 },
          { itemId: "crystal_4", fallbackName: "璀璨水晶", qty: 3 },
        ]
      : progressLv >= 15
        ? [
            { itemId: PROTECTION_MIRROR_ID, fallbackName: "保护镜", qty: 1 },
            { itemId: "ingot_2", fallbackName: "铁锭", qty: 5 },
            { itemId: "crystal_2", fallbackName: "辉光水晶", qty: 3 },
          ]
        : [
            { itemId: PROTECTION_MIRROR_ID, fallbackName: "保护镜", qty: 1 },
            { itemId: "ingot_1", fallbackName: "铜锭", qty: 5 },
            { itemId: "crystal_1", fallbackName: "微光水晶", qty: 3 },
          ];

  const packMap = new Map<string, string>();
  if (Array.isArray((contentPack as any)?.items)) {
    for (const it of (contentPack as any).items) {
      if (it?.id) packMap.set(String(it.id), String(it.name || it.id));
    }
  }

  const items = rawEntries
    .filter((e) => e.itemId === PROTECTION_MIRROR_ID || packMap.size === 0 || packMap.has(e.itemId))
    .map((e) => ({
      itemId: e.itemId,
      name: packMap.get(e.itemId) || e.fallbackName,
      qty: e.qty,
    }));
  return { gold: 800, items };
}

function resolveBountyRationRewards(
  contentPack?: EnhancedContentPack
): { gold: number; items: Array<{ itemId: string; name: string; qty: number }> } {
  const candidates = [
    { itemId: "potion_heal_2", fallbackId: "potion_heal_1", fallbackName: "治疗药水", qty: 3 },
    { itemId: "potion_berserk", fallbackId: "food_berry_pie", fallbackName: "行军口粮", qty: 2 },
  ];
  const packMap = new Map<string, string>();
  if (Array.isArray((contentPack as any)?.items)) {
    for (const it of (contentPack as any).items) {
      if (it?.id) packMap.set(String(it.id), String(it.name || it.id));
    }
  }
  const items: Array<{ itemId: string; name: string; qty: number }> = [];
  for (const c of candidates) {
    if (packMap.size === 0 || packMap.has(c.itemId)) {
      items.push({ itemId: c.itemId, name: packMap.get(c.itemId) || c.fallbackName, qty: c.qty });
    } else if (packMap.has(c.fallbackId)) {
      items.push({ itemId: c.fallbackId, name: packMap.get(c.fallbackId) || c.fallbackName, qty: c.qty });
    }
  }
  return { gold: 500, items };
}

/** 公会荣誉与稀有锻造徽记兑换（专属边框 / 锻造徽记礼匣 / 讨伐战备包） */
export function redeemGuildHonorItem(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack | undefined,
  itemId: string,
  now: Date = new Date()
): {
  ok: boolean;
  reason?: string;
  itemId?: string;
  honorSpent?: number;
  emblemsSpent?: number;
  unlockedFrame?: string;
  restoredReroll?: boolean;
  goldGained?: number;
  itemsGranted?: Array<{ itemId: string; name: string; qty: number }>;
} {
  ensurePlayerExtensions(player);
  const state = ensureBounties(player, now);
  const gh = ensureGuildHonor(player);
  const def = GUILD_HONOR_SHOP.find((it) => it.id === itemId);
  if (!def) return { ok: false, reason: "兑换项不存在" };

  if (def.category === "frame" && gh.unlockedFrames.includes(def.id)) {
    return { ok: false, reason: "该专属边框已永久解锁，可直接佩戴" };
  }

  const today = todayUTC(now);
  if (!gh.dailyPurchases || gh.dailyPurchases.date !== today) {
    gh.dailyPurchases = { date: today, counts: {} };
  }
  const boughtToday = Number(gh.dailyPurchases.counts[def.id] || 0);
  if (typeof def.dailyLimit === "number" && boughtToday >= def.dailyLimit) {
    return { ok: false, reason: `今日兑换已达上限（${def.dailyLimit}/${def.dailyLimit}）` };
  }

  if (gh.honorPoints < def.honorCost) {
    return { ok: false, reason: `公会荣誉积分不足（需要 ${def.honorCost}，当前 ${gh.honorPoints}）` };
  }
  if (gh.forgingEmblems < def.emblemCost) {
    return { ok: false, reason: `稀有锻造徽记不足（需要 ${def.emblemCost}，当前 ${gh.forgingEmblems}）` };
  }

  gh.honorPoints -= def.honorCost;
  gh.forgingEmblems -= def.emblemCost;
  if (typeof def.dailyLimit === "number") {
    gh.dailyPurchases.counts[def.id] = boughtToday + 1;
  }

  if (def.category === "frame") {
    gh.unlockedFrames.push(def.id);
    gh.equippedFrame = def.id;
    appendLog(player, `解锁并佩戴公会专属边框「${def.frameLabel || def.name}」！`);
    return {
      ok: true,
      itemId: def.id,
      honorSpent: def.honorCost,
      emblemsSpent: def.emblemCost,
      unlockedFrame: def.id,
    };
  }

  if (def.id === "supply_forging_emblem_pack") {
    const bundle = resolveForgingEmblemPackRewards(player, contentPack);
    player.inventory.gold = (player.inventory.gold || 0) + bundle.gold;
    player.stats!.totalGoldEarned += bundle.gold;
    for (const it of bundle.items) {
      player.inventory[it.itemId] = (player.inventory[it.itemId] || 0) + it.qty;
    }
    syncAchievements(player);
    appendLog(
      player,
      `兑换「${def.name}」：获得 ${bundle.items.map((x) => `${x.name} ×${x.qty}`).join("、")} 及金币 ${bundle.gold}`
    );
    return {
      ok: true,
      itemId: def.id,
      honorSpent: def.honorCost,
      emblemsSpent: def.emblemCost,
      goldGained: bundle.gold,
      itemsGranted: bundle.items,
    };
  }

  const ration = resolveBountyRationRewards(contentPack);
  player.inventory.gold = (player.inventory.gold || 0) + ration.gold;
  player.stats!.totalGoldEarned += ration.gold;
  for (const it of ration.items) {
    player.inventory[it.itemId] = (player.inventory[it.itemId] || 0) + it.qty;
  }
  const restoredReroll = state.rerollsUsed > 0;
  if (restoredReroll) {
    state.rerollsUsed = Math.max(0, state.rerollsUsed - 1);
  }
  syncAchievements(player);
  appendLog(
    player,
    `兑换「${def.name}」：获得金币 ${ration.gold}${ration.items.length ? `、${ration.items.map((x) => `${x.name} ×${x.qty}`).join("、")}` : ""}${restoredReroll ? "，并恢复 1 次委托刷新额度" : ""}`
  );
  return {
    ok: true,
    itemId: def.id,
    honorSpent: def.honorCost,
    emblemsSpent: def.emblemCost,
    restoredReroll,
    goldGained: ration.gold,
    itemsGranted: ration.items,
  };
}

/** 佩戴或卸下公会专属头像边框（null 表示卸下） */
export function equipGuildFrame(
  player: EnhancedPlayerState,
  frameId: string | null
): { ok: boolean; reason?: string; equippedFrame: string | null } {
  const gh = ensureGuildHonor(player);
  if (frameId === null || frameId === "") {
    gh.equippedFrame = null;
    return { ok: true, equippedFrame: null };
  }
  const def = GUILD_HONOR_SHOP.find((it) => it.id === frameId && it.category === "frame");
  if (!def || !gh.unlockedFrames.includes(frameId)) {
    return { ok: false, reason: "尚未解锁该专属公会边框", equippedFrame: gh.equippedFrame };
  }
  gh.equippedFrame = frameId;
  appendLog(player, `已佩戴公会专属边框「${def.frameLabel || def.name}」`);
  return { ok: true, equippedFrame: frameId };
}

export function getGuildHonorInfo(player: EnhancedPlayerState, now: Date = new Date()) {
  const gh = ensureGuildHonor(player);
  const today = todayUTC(now);
  const dailyCounts = gh.dailyPurchases?.date === today ? gh.dailyPurchases.counts || {} : {};
  const equippedDef = gh.equippedFrame
    ? GUILD_HONOR_SHOP.find((it) => it.id === gh.equippedFrame && it.category === "frame")
    : undefined;

  return {
    honorPoints: gh.honorPoints,
    totalHonorEarned: gh.totalHonorEarned,
    forgingEmblems: gh.forgingEmblems,
    totalChainsCompleted: gh.totalChainsCompleted,
    fullClears: gh.fullClears,
    unlockedFrames: gh.unlockedFrames,
    equippedFrame: equippedDef
      ? {
          id: equippedDef.id,
          frameLabel: equippedDef.frameLabel || equippedDef.name,
          frameTheme: equippedDef.frameTheme || "crimson",
          iconKind: equippedDef.iconKind,
          iconId: equippedDef.iconId,
          bonuses: equippedDef.bonuses || {},
        }
      : null,
    shopItems: GUILD_HONOR_SHOP.map((it) => {
      const unlocked = it.category === "frame" && gh.unlockedFrames.includes(it.id);
      const isEquipped = it.category === "frame" && gh.equippedFrame === it.id;
      const boughtToday = Number(dailyCounts[it.id] || 0);
      const limitReached = typeof it.dailyLimit === "number" && boughtToday >= it.dailyLimit;
      const affordable = gh.honorPoints >= it.honorCost && gh.forgingEmblems >= it.emblemCost;
      return {
        ...it,
        unlocked,
        isEquipped,
        boughtToday,
        dailyRemaining: typeof it.dailyLimit === "number" ? Math.max(0, it.dailyLimit - boughtToday) : null,
        canRedeem: !unlocked && !limitReached && affordable,
      };
    }),
  };
}

/** 契约面板完整信息（含每条实时进度、生态词缀状态、连携赏金进度与荣誉边框兑换） */
export function getBountyInfo(player: EnhancedPlayerState, now: Date = new Date()) {
  const state = ensureBounties(player, now);
  const stats = player.stats!;
  const affixMods = getActiveGuildAffixModifiers(player);
  const fullTarget = getFullBoardTargetCount(state);
  const completedToday = state.claimedTodayCount || 0;
  const comboClaimed = state.comboClaimed || [];

  return {
    date: state.date,
    seedKey: state.seedKey || buildDailyBountySeedKey(state.date, state.rerollsUsed),
    rerollsUsed: state.rerollsUsed,
    maxRerolls: MAX_DAILY_REROLLS,
    rerollCost: REROLL_COST,
    bounties: state.bounties.map((b) => {
      const progress = bountyProgress(stats, b);
      const completed = progress >= b.target;
      const affix = getAffixDef(b.affixId);
      const isModifierActive = Boolean(b.accepted && !b.claimed && !completed);
      const isLingering = Boolean(b.claimed || state.claimedAffixesToday?.includes(affix.id));
      return {
        ...b,
        progress,
        completed,
        affix: {
          id: affix.id,
          name: affix.name,
          enName: affix.enName,
          iconKind: affix.iconKind,
          iconId: affix.iconId,
          tone: affix.tone,
          ecologicalSummary: affix.ecologicalSummary,
          activeEffectText: affix.activeEffectText,
          lingeringEffectText: affix.lingeringEffectText,
          status: isModifierActive ? "active" : isLingering ? "lingering" : "standby",
        },
      };
    }),
    activeAffixSummary: affixMods,
    combo: {
      completedToday,
      fullBoardTarget: fullTarget,
      milestones: GUILD_COMBO_MILESTONES.map((m) => {
        const requiredCount = m.id === "chain_full" ? fullTarget : m.requiredCount;
        const claimed = comboClaimed.includes(m.id);
        const progress = Math.min(requiredCount, completedToday);
        return {
          ...m,
          requiredCount,
          progress,
          claimed,
          claimable: !claimed && completedToday >= requiredCount,
        };
      }),
    },
    guildHonor: getGuildHonorInfo(player, now),
  };
}

/* ============================ 转生系统 ============================ */

// 转生解锁所需的最低战斗等级。每次转生根据当前进度授予转生点，
// 每点提供永久全局 +2% 的全收益倍率，并重置职业/战斗等级、技能经验与背包（保留声望与转生收益）。
const PRESTIGE_MIN_COMBAT_LEVEL = 50;
const PRESTIGE_BONUS_PER_POINT = 0.02; // 每点转生 +2% 全局收益

export interface AstrolabeNodeDef {
  id: string;
  name: string;
  icon: string;
  constellation: string;
  maxRank: number;
  costs: number[];
  summary: string;
  formatEffect: (rank: number) => string;
}

export const PRESTIGE_ASTROLABE_NODES: AstrolabeNodeDef[] = [
  {
    id: "astro_house_keep",
    name: "灵居恒存",
    icon: "astro_house_keep",
    constellation: "圣所座",
    maxRank: 3,
    costs: [2, 3, 5],
    summary: "转生保留高阶房屋等级不重置，并增幅全房间专精效能",
    formatEffect: (r) =>
      r <= 0
        ? "未点亮（转生重置房屋）"
        : r === 1
          ? "保留最高1间房屋不重置（其余上限Lv.2）· 房间效能+10%"
          : r === 2
            ? "保留最高2间房屋不重置（其余上限Lv.5）· 房间效能+20%"
            : "完整保留全部房屋等级（Lv.8）· 房间效能+30%",
  },
  {
    id: "astro_queue_cap",
    name: "行囊统筹",
    icon: "astro_queue_cap",
    constellation: "星轨座",
    maxRank: 3,
    costs: [2, 3, 4],
    summary: "永久扩充行动队列排程槽位上限",
    formatEffect: (r) => (r <= 0 ? "队列上限 5 项" : `行动队列上限 +${r}（共 ${5 + r} 项）`),
  },
  {
    id: "astro_boss_fortune",
    name: "猎首星辉",
    icon: "astro_boss_fortune",
    constellation: "天猎座",
    maxRank: 3,
    costs: [2, 3, 5],
    summary: "提升怪物、首领与采集的稀有掉落发现率",
    formatEffect: (r) => (r <= 0 ? "稀有发现 +0%" : `稀有掉落发现率 +${r * 12}%`),
  },
  {
    id: "astro_starter_kit",
    name: "传世行装",
    icon: "astro_starter_kit",
    constellation: "旅人座",
    maxRank: 3,
    costs: [1, 2, 3],
    summary: "转生后直接继承传世基础工具箱、补给药水与丰厚启动资金",
    formatEffect: (r) =>
      r <= 0
        ? "转生仅保留 100 金币"
        : r === 1
          ? "转生带 1,600 金币 + 3件采集锤斧镰与初级药食"
          : r === 2
            ? "转生带 4,100 金币 + 6件工具铁剑与中量药食"
            : "转生带 8,100 金币 + 全套10件基础工具盾剑与充沛补给",
  },
  {
    id: "astro_gather_crit",
    name: "丰饶双星",
    icon: "astro_gather_crit",
    constellation: "双禾座",
    maxRank: 3,
    costs: [2, 3, 5],
    summary: "采集类行动结算时有几率触发双倍资源暴击产出",
    formatEffect: (r) => (r <= 0 ? "双倍采集率 0%" : `双倍采集暴击率 +${r * 8}%`),
  },
  {
    id: "astro_craft_eff",
    name: "巧匠星轨",
    icon: "astro_craft_eff",
    constellation: "炉锤座",
    maxRank: 3,
    costs: [2, 3, 4],
    summary: "永久提高全生活技能行动效率（触发单周期免费连做）",
    formatEffect: (r) => (r <= 0 ? "生活效率 +0%" : `全生活技能效率 +${r * 8}%`),
  },
  {
    id: "astro_battle_vigor",
    name: "战神宿命",
    icon: "astro_battle_vigor",
    constellation: "破军座",
    maxRank: 3,
    costs: [2, 4, 6],
    summary: "强化单人战斗先天体魄与攻击，并提高战斗经验获取",
    formatEffect: (r) =>
      r <= 0
        ? "战斗加成 +0%"
        : `战斗经验 +${r * 10}% · 先天攻击 +${r * 4} · 生命 +${r * 25}`,
  },
];

export interface AstrolabeBonuses {
  houseKeepTopCount: number;
  houseKeepRestCap: number;
  houseBonusMult: number;
  extraQueueSlots: number;
  rareFindPct: number;
  starterGoldBonus: number;
  starterItems: Record<string, number>;
  gatherDoubleChance: number;
  lifeEfficiencyPct: number;
  combatXpMult: number;
  bonusAtk: number;
  bonusHp: number;
}

function starterKitForRank(rank: number): { goldBonus: number; items: Record<string, number> } {
  if (rank <= 0) return { goldBonus: 0, items: {} };
  if (rank === 1) {
    return {
      goldBonus: 1500,
      items: {
        weapon_logging_axe_t1: 1,
        weapon_forge_hammer_t1: 1,
        weapon_sickle_t1: 1,
        potion_hp_t1: 5,
        food_simple: 10,
      },
    };
  }
  if (rank === 2) {
    return {
      goldBonus: 4000,
      items: {
        weapon_logging_axe_t1: 1,
        weapon_forge_hammer_t1: 1,
        weapon_sickle_t1: 1,
        weapon_hoe_t1: 1,
        weapon_frying_pan_t1: 1,
        weapon_iron_sword: 1,
        potion_hp_t1: 10,
        food_simple: 20,
      },
    };
  }
  return {
    goldBonus: 8000,
    items: {
      weapon_logging_axe_t1: 1,
      weapon_forge_hammer_t1: 1,
      weapon_sickle_t1: 1,
      weapon_hoe_t1: 1,
      weapon_frying_pan_t1: 1,
      weapon_iron_sword: 1,
      weapon_scissors_t1: 1,
      weapon_alchemy_bottle_t1: 1,
      weapon_spatula_t1: 1,
      weapon_shield_t1: 1,
      potion_hp_t1: 20,
      food_simple: 30,
    },
  };
}

export function getAstrolabeRank(
  player: Pick<EnhancedPlayerState, "prestige"> | null | undefined,
  nodeId: string
): number {
  const raw = Number(player?.prestige?.astrolabe?.[nodeId] || 0);
  const def = PRESTIGE_ASTROLABE_NODES.find((n) => n.id === nodeId);
  if (!def || !Number.isFinite(raw) || raw <= 0) return 0;
  return Math.min(def.maxRank, Math.floor(raw));
}

export function getAstrolabeBonuses(
  player?: Pick<EnhancedPlayerState, "prestige"> | null
): AstrolabeBonuses {
  const rHouse = getAstrolabeRank(player, "astro_house_keep");
  const rQueue = getAstrolabeRank(player, "astro_queue_cap");
  const rBoss = getAstrolabeRank(player, "astro_boss_fortune");
  const rKit = getAstrolabeRank(player, "astro_starter_kit");
  const rGather = getAstrolabeRank(player, "astro_gather_crit");
  const rCraft = getAstrolabeRank(player, "astro_craft_eff");
  const rBattle = getAstrolabeRank(player, "astro_battle_vigor");
  const kit = starterKitForRank(rKit);
  return {
    houseKeepTopCount: rHouse === 1 ? 1 : rHouse === 2 ? 2 : rHouse >= 3 ? 99 : 0,
    houseKeepRestCap: rHouse === 1 ? 2 : rHouse === 2 ? 5 : rHouse >= 3 ? 8 : 0,
    houseBonusMult: 1 + rHouse * 0.1,
    extraQueueSlots: rQueue,
    rareFindPct: rBoss * 12,
    starterGoldBonus: kit.goldBonus,
    starterItems: kit.items,
    gatherDoubleChance: rGather * 0.08,
    lifeEfficiencyPct: rCraft * 8,
    combatXpMult: 1 + rBattle * 0.1,
    bonusAtk: rBattle * 4,
    bonusHp: rBattle * 25,
  };
}

function ensurePrestige(player: EnhancedPlayerState): PrestigeState {
  if (!player.prestige) player.prestige = { count: 0, points: 0, spentPoints: 0, astrolabe: {} };
  if (typeof player.prestige.spentPoints !== "number" || player.prestige.spentPoints < 0) {
    player.prestige.spentPoints = 0;
  }
  if (!player.prestige.astrolabe || typeof player.prestige.astrolabe !== "object") {
    player.prestige.astrolabe = {};
  }
  return player.prestige;
}

export function getAvailablePrestigePoints(player: EnhancedPlayerState): number {
  const p = ensurePrestige(player);
  return Math.max(0, Math.floor(p.points || 0) - Math.floor(p.spentPoints || 0));
}

/** 点亮/升级异世界传承星盘节点（消耗可用转生星尘，不削减累计转生点带来的全局基础倍率） */
export function upgradeAstrolabeNode(
  player: EnhancedPlayerState,
  nodeId: string
): { ok: boolean; reason?: string; nodeId?: string; newRank?: number; cost?: number; availablePoints?: number } {
  const p = ensurePrestige(player);
  const def = PRESTIGE_ASTROLABE_NODES.find((n) => n.id === nodeId);
  if (!def) return { ok: false, reason: "未知的传承星盘节点" };
  const currentRank = getAstrolabeRank(player, nodeId);
  if (currentRank >= def.maxRank) {
    return { ok: false, reason: `「${def.name}」已达最高星阶` };
  }
  const cost = def.costs[currentRank];
  const available = getAvailablePrestigePoints(player);
  if (available < cost) {
    return { ok: false, reason: `可用转生星尘不足（需要 ${cost} 点，当前可用 ${available} 点）` };
  }
  const nextRank = currentRank + 1;
  p.astrolabe![nodeId] = nextRank;
  p.spentPoints = (p.spentPoints || 0) + cost;
  appendLog(player, `点亮传承星盘「${def.name}」第 ${nextRank} 阶（消耗 ${cost} 星尘）`);
  return {
    ok: true,
    nodeId,
    newRank: nextRank,
    cost,
    availablePoints: getAvailablePrestigePoints(player),
  };
}

/** 重置异世界传承星盘并全额返还已投入的转生星尘 */
export function respecAstrolabe(
  player: EnhancedPlayerState
): { ok: boolean; reason?: string; refundedPoints?: number; availablePoints?: number } {
  const p = ensurePrestige(player);
  const refunded = Math.floor(p.spentPoints || 0);
  if (refunded <= 0 && Object.keys(p.astrolabe || {}).length === 0) {
    return { ok: false, reason: "当前星盘尚未投入任何转生星尘" };
  }
  if (Array.isArray(player.activityQueue) && player.activityQueue.length > 5) {
    return { ok: false, reason: "请先将行动队列缩减至 5 项以内再重置星盘" };
  }
  p.spentPoints = 0;
  p.astrolabe = {};
  appendLog(player, `重置异世界传承星盘，返还 ${refunded} 点转生星尘`);
  return {
    ok: true,
    refundedPoints: refunded,
    availablePoints: getAvailablePrestigePoints(player),
  };
}

/** 转生全局倍率（>=1） */
export function getPrestigeMultiplier(player: EnhancedPlayerState): number {
  const p = player.prestige?.points || 0;
  return 1 + p * PRESTIGE_BONUS_PER_POINT;
}

/** 根据当前进度估算本次转生可获得的转生点 */
export function estimatePrestigePoints(player: EnhancedPlayerState): number {
  const lvl = player.combatLevel || 1;
  // 综合战斗等级与各职业等级之和，做平方根压缩，避免线性膨胀
  let skillSum = 0;
  for (const s of Object.values(player.skills || {})) skillSum += (s.level || 1);
  const raw = lvl + skillSum / 3;
  return Math.max(0, Math.floor(Math.sqrt(raw) * 2 - 8));
}

/** 转生面板信息 */
export function getPrestigeInfo(player: EnhancedPlayerState) {
  const p = ensurePrestige(player);
  const canPrestige = (player.combatLevel || 1) >= PRESTIGE_MIN_COMBAT_LEVEL;
  const availablePoints = getAvailablePrestigePoints(player);
  const bonuses = getAstrolabeBonuses(player);
  const astrolabeNodes = PRESTIGE_ASTROLABE_NODES.map((n) => {
    const rank = getAstrolabeRank(player, n.id);
    const nextCost = rank < n.maxRank ? n.costs[rank] : null;
    return {
      id: n.id,
      name: n.name,
      icon: n.icon,
      constellation: n.constellation,
      rank,
      maxRank: n.maxRank,
      nextCost,
      summary: n.summary,
      currentEffect: n.formatEffect(rank),
      nextEffect: rank < n.maxRank ? n.formatEffect(rank + 1) : null,
      canUpgrade: nextCost !== null && availablePoints >= nextCost,
    };
  });
  return {
    count: p.count,
    points: p.points,
    spentPoints: p.spentPoints || 0,
    availablePoints,
    multiplier: getPrestigeMultiplier(player),
    multiplierPercent: Math.round((getPrestigeMultiplier(player) - 1) * 100),
    minCombatLevel: PRESTIGE_MIN_COMBAT_LEVEL,
    currentCombatLevel: player.combatLevel || 1,
    canPrestige,
    pointsOnPrestige: canPrestige ? estimatePrestigePoints(player) : 0,
    bonusPerPoint: Math.round(PRESTIGE_BONUS_PER_POINT * 100),
    astrolabeNodes,
    bonuses,
  };
}

/**
 * 执行转生：
 * - 校验最低战斗等级
 * - 授予转生点
 * - 重置：战斗等级/经验、各职业等级/经验、背包（保留启动金币与传世行装）、装备穿戴、活动状态、未受星盘庇护的房屋等级
 * - 保留：声望、成就、转生点与传承星盘、统计（生涯累计）
 */
export function doPrestige(
  player: EnhancedPlayerState
): { ok: boolean; reason?: string; gainedPoints?: number; totalPoints?: number; multiplier?: number } {
  ensurePrestige(player);
  if ((player.combatLevel || 1) < PRESTIGE_MIN_COMBAT_LEVEL) {
    return { ok: false, reason: `战斗等级需达到 ${PRESTIGE_MIN_COMBAT_LEVEL} 级才能转生` };
  }
  const gained = estimatePrestigePoints(player);
  if (gained <= 0) return { ok: false, reason: "当前进度不足以获得转生点" };

  const bonuses = getAstrolabeBonuses(player);

  player.prestige!.count += 1;
  player.prestige!.points += gained;
  player.prestige!.lastPrestigeAt = new Date().toISOString();

  // 重置进度（含派生 combatLevel 的战斗技能，否则下次 ensureCombatSkills 会把等级推导回来，
  // 转生等于没有重置并可被无限重复刷取转生点）
  player.combatLevel = 1;
  player.combatXp = 0;
  player.combatSkills = defaultCombatSkills(1);
  for (const k of Object.keys(player.skills || {})) {
    player.skills[k].level = 1;
    player.skills[k].xp = 0;
    player.skills[k].unlockedRecipes = [];
    player.skills[k].enhancementLevel = 0;
  }
  if (player.tasksState) {
    player.tasksState.tasks = [];
    player.tasksState.nextTaskAt = new Date().toISOString();
  }
  // 灵居恒存（astro_house_keep）：按星盘等阶保留最高等级房屋与其他房间上限，未点亮则重置房屋
  if (player.house?.rooms) {
    if (bonuses.houseKeepTopCount <= 0 && bonuses.houseKeepRestCap <= 0) {
      player.house.rooms = {};
    } else {
      const sorted = Object.entries(player.house.rooms)
        .filter(([, lv]) => Number(lv) > 0)
        .sort((a, b) => Number(b[1]) - Number(a[1]) || a[0].localeCompare(b[0]));
      const nextRooms: Record<string, number> = {};
      sorted.forEach(([roomId, lv], idx) => {
        const kept = idx < bonuses.houseKeepTopCount ? Number(lv) : Math.min(Number(lv), bonuses.houseKeepRestCap);
        if (kept > 0) nextRooms[roomId] = kept;
      });
      player.house.rooms = nextRooms;
    }
  }
  // 背包重置（保留启动金币 + 传世行装工具与补给），装备卸下；进行中的战斗/刷关/强化计时/队列等暂态一并清掉
  player.inventory = {
    gold: 100 + bonuses.starterGoldBonus,
    ...bonuses.starterItems,
  };
  player.equipment = { enhancementLevels: {}, durability: {}, maxDurability: {} };
  player.activeBuffs = [];
  player.mode = "idle";
  player.lifeActionState = undefined;
  player.combatFarmState = undefined;
  player.hpCombat = undefined;
  player.combatHp = undefined;
  player.combatHpAt = undefined;
  player.enhanceRun = undefined;
  player.activityQueue = [];
  player.combatLoadout = undefined;
  if (player.alchemyCauldron) {
    ensureAlchemyCauldron(player);
  }
  if (player.astralRelics) {
    ensureAstralRelics(player);
  }

  const mult = getPrestigeMultiplier(player);
  appendLog(
    player,
    `转生成功！这是第 ${player.prestige!.count} 次转生，获得 ${gained} 转生点，全局收益永久 +${Math.round((mult - 1) * 100)}%`
  );
  return { ok: true, gainedPoints: gained, totalPoints: player.prestige!.points, multiplier: mult };
}

/** 转生别名（与 doPrestige 等价，确保永久保留奇美拉炼金宗师图谱、炼金等阶与魔药槽状态） */
export function performReincarnation(player: EnhancedPlayerState) {
  return doPrestige(player);
}

/* ============================ 传世铭纹附魔台 & 跨职业套装共鸣图鉴 (WL-6) ============================ */

export const HERITAGE_MAX_RUNE_RANK = 5;
export const HERITAGE_DAILY_SYNTHESIS_LIMIT = 12;

export interface HeritageRuneCostTier {
  targetRank: number;
  forgingEmblems: number;
  gold: number;
  crystals: Record<string, number>;
}

export const HERITAGE_RUNE_COSTS: HeritageRuneCostTier[] = [
  { targetRank: 1, forgingEmblems: 1, gold: 300, crystals: { crystal_1: 4 } },
  { targetRank: 2, forgingEmblems: 2, gold: 750, crystals: { crystal_1: 8, crystal_2: 3 } },
  { targetRank: 3, forgingEmblems: 3, gold: 1600, crystals: { crystal_2: 6, crystal_3: 3 } },
  { targetRank: 4, forgingEmblems: 4, gold: 3200, crystals: { crystal_3: 6, crystal_4: 3 } },
  { targetRank: 5, forgingEmblems: 6, gold: 6000, crystals: { crystal_4: 6, crystal_5: 3 } },
];

export interface HeritageRuneDef {
  id: HeritageRuneId;
  slot: HeritageRuneSlot;
  slotLabel: string;
  name: string;
  subtitle: string;
  description: string;
  iconId: string;
  maxRank: number;
  perRank: {
    bonusAtk?: number;
    bonusDef?: number;
    bonusHp?: number;
    armorPenPct?: number;
    thornsDefRatio?: number;
    intervalReductionPct?: number;
    critRateBonusPct?: number;
    critDmgBonusPct?: number;
    foodHealPct?: number;
    potionBuffPct?: number;
    gatherSpeedPct?: number;
    craftSpeedPct?: number;
    gatherDoubleChance?: number;
    craftEfficiencyPct?: number;
    rareFindPct?: number;
    goldGainPct?: number;
  };
}

export const HERITAGE_RUNES: HeritageRuneDef[] = [
  {
    id: "rune_sunder_edge",
    slot: "weapon",
    slotLabel: "武器槽",
    name: "裂甲裁决铭纹",
    subtitle: "重锋贯甲 · 首领护甲撕裂与弱点暴击",
    description: "每阶提升攻击力、首领/魔物护甲穿透与暴击率，随武器槽永久生效，更换武器不失效。",
    iconId: "rune_slot_weapon",
    maxRank: HERITAGE_MAX_RUNE_RANK,
    perRank: { bonusAtk: 4, armorPenPct: 0.04, critRateBonusPct: 1.8 },
  },
  {
    id: "rune_tempest_fang",
    slot: "weapon",
    slotLabel: "武器槽",
    name: "疾雷狂澜铭纹",
    subtitle: "迅雷连斩 · 缩短攻击间隔与暴击伤害",
    description: "每阶缩短普攻间隔并提升攻击力与暴击伤害，专为高频输出流派打造。",
    iconId: "rune_slot_weapon",
    maxRank: HERITAGE_MAX_RUNE_RANK,
    perRank: { bonusAtk: 3, intervalReductionPct: 2.4, critDmgBonusPct: 8 },
  },
  {
    id: "rune_bastion_ward",
    slot: "armor",
    slotLabel: "防具槽",
    name: "圣盾坚壁铭纹",
    subtitle: "不朽壁垒 · 生命上限、护甲与反伤护御",
    description: "每阶提升生命上限、防御力并按防御比例反弹受击伤害，稳固前排承伤能力。",
    iconId: "rune_slot_armor",
    maxRank: HERITAGE_MAX_RUNE_RANK,
    perRank: { bonusHp: 22, bonusDef: 3, thornsDefRatio: 0.06 },
  },
  {
    id: "rune_vital_aegis",
    slot: "armor",
    slotLabel: "防具槽",
    name: "生机秘佑铭纹",
    subtitle: "圣泉护佑 · 生命护御与料理秘药增幅",
    description: "每阶大幅提升生命上限、防御力，并强化战斗料理回复与秘药增益倍率。",
    iconId: "rune_slot_armor",
    maxRank: HERITAGE_MAX_RUNE_RANK,
    perRank: { bonusHp: 28, bonusDef: 2, foodHealPct: 5, potionBuffPct: 4 },
  },
  {
    id: "rune_bountiful_pick",
    slot: "tool",
    slotLabel: "工具槽",
    name: "丰饶双星铭纹",
    subtitle: "万物丰收 · 采集加速、双倍暴击与稀有寻获",
    description: "每阶加快全系采集速度，并赋予采集双倍产出暴击率与稀有掉落加成。",
    iconId: "rune_slot_tool",
    maxRank: HERITAGE_MAX_RUNE_RANK,
    perRank: { gatherSpeedPct: 4, gatherDoubleChance: 0.03, rareFindPct: 3 },
  },
  {
    id: "rune_artisan_forge",
    slot: "tool",
    slotLabel: "工具槽",
    name: "神匠炉火铭纹",
    subtitle: "炉火纯青 · 制作神速、巧匠连作与金币收益",
    description: "每阶提升全系制作极速、免费连作效率（制作暴击）与全局金币收益。",
    iconId: "rune_slot_tool",
    maxRank: HERITAGE_MAX_RUNE_RANK,
    perRank: { craftSpeedPct: 4, craftEfficiencyPct: 5, goldGainPct: 3 },
  },
];

export interface EmblemSynthesisRecipeDef {
  id: string;
  name: string;
  description: string;
  goldCost: number;
  crystalCosts: Record<string, number>;
  emblemsOut: number;
}

export const EMBLEM_SYNTHESIS_RECIPES: EmblemSynthesisRecipeDef[] = [
  {
    id: "synth_glimmer",
    name: "微光晶簇熔铸",
    description: "以初阶微光水晶与金币凝铸 1 枚稀有锻造徽记，中前期即可稳定篆刻铭纹。",
    goldCost: 500,
    crystalCosts: { crystal_1: 6 },
    emblemsOut: 1,
  },
  {
    id: "synth_radiant",
    name: "辉光秘晶精炼",
    description: "以辉光水晶高效熔铸 1 枚稀有锻造徽记，节省金币开销。",
    goldCost: 350,
    crystalCosts: { crystal_2: 3 },
    emblemsOut: 1,
  },
  {
    id: "synth_brilliant",
    name: "高阶耀晶凝铸",
    description: "以高纯度耀光水晶一次熔铸 2 枚稀有锻造徽记，适合中后期冲刺高阶铭纹。",
    goldCost: 200,
    crystalCosts: { crystal_3: 2 },
    emblemsOut: 2,
  },
];

export interface CodexPassiveBonusDef {
  bonusAtk?: number;
  bonusDef?: number;
  bonusHp?: number;
  armorPenPct?: number;
  critRateBonusPct?: number;
  foodHealPct?: number;
  potionBuffPct?: number;
  gatherSpeedPct?: number;
  craftSpeedPct?: number;
  gatherDoubleChance?: number;
  craftEfficiencyPct?: number;
  rareFindPct?: number;
  goldGainPct?: number;
  xpGainPct?: number;
}

export interface CodexMilestoneRewardDef {
  gold: number;
  reputation: number;
  forgingEmblems: number;
  items?: Record<string, number>;
}

export interface CrossProfResonanceTierDef {
  tier: 1 | 2 | 3;
  milestoneId: string;
  title: string;
  itemIds: string[];
  passiveBonuses: CodexPassiveBonusDef;
  reward: CodexMilestoneRewardDef;
}

export interface CrossProfResonanceSetDef {
  id: CrossProfResonanceSetId;
  name: string;
  pairLabel: string;
  iconId: string;
  description: string;
  tiers: CrossProfResonanceTierDef[];
}

export const CROSS_PROF_RESONANCE_SETS: CrossProfResonanceSetDef[] = [
  {
    id: "forge_bastion",
    name: "熔炉星铁共鸣录",
    pairLabel: "挖矿 × 锻造",
    iconId: "codex_set_forge",
    description: "贯通矿脉勘探与百炼神兵，收集各阶矿锭与重装利刃，永久激活破甲与锻造极速共鸣。",
    tiers: [
      {
        tier: 1,
        milestoneId: "forge_bastion:tier_1",
        title: "初阶 · 赤铜试剑",
        itemIds: ["ore_1", "ingot_1", "weapon_iron_sword"],
        passiveBonuses: { bonusAtk: 2, gatherSpeedPct: 2 },
        reward: { gold: 400, reputation: 25, forgingEmblems: 1 },
      },
      {
        tier: 2,
        milestoneId: "forge_bastion:tier_2",
        title: "进阶 · 重甲百炼",
        itemIds: ["ore_3", "armor_blacksmith_iron_chest", "weapon_forge_hammer_t2"],
        passiveBonuses: { bonusAtk: 4, bonusDef: 3, craftSpeedPct: 3 },
        reward: { gold: 1000, reputation: 50, forgingEmblems: 1 },
      },
      {
        tier: 3,
        milestoneId: "forge_bastion:tier_3",
        title: "宗师 · 寒霜星铁",
        itemIds: ["ore_6", "weapon_frost_blade", "armor_frost_chest"],
        passiveBonuses: { bonusAtk: 6, armorPenPct: 0.04, craftEfficiencyPct: 4 },
        reward: { gold: 2400, reputation: 100, forgingEmblems: 2 },
      },
    ],
  },
  {
    id: "moonloom_weave",
    name: "织月灵丝共鸣录",
    pairLabel: "草木采集 × 缝纫",
    iconId: "codex_set_loom",
    description: "萃取林间灵纤维与月华丝线，织就轻灵秘甲，永久提升稀有寻获、防御与采集双倍运势。",
    tiers: [
      {
        tier: 1,
        milestoneId: "moonloom_weave:tier_1",
        title: "初阶 · 晨棉轻纺",
        itemIds: ["fiber_1", "yarn_1", "armor_cloth_chest"],
        passiveBonuses: { bonusDef: 2, rareFindPct: 2 },
        reward: { gold: 400, reputation: 25, forgingEmblems: 1 },
      },
      {
        tier: 2,
        milestoneId: "moonloom_weave:tier_2",
        title: "进阶 · 锦绣裁衣",
        itemIds: ["fiber_3", "armor_tailor_leather_chest", "weapon_scissors_t2"],
        passiveBonuses: { bonusHp: 20, gatherDoubleChance: 0.02, rareFindPct: 3 },
        reward: { gold: 1000, reputation: 50, forgingEmblems: 1 },
      },
      {
        tier: 3,
        milestoneId: "moonloom_weave:tier_3",
        title: "宗师 · 虚空灵织",
        itemIds: ["fiber_4", "weapon_scissors_t3", "armor_void_chest"],
        passiveBonuses: { bonusHp: 35, bonusDef: 4, gatherSpeedPct: 4, rareFindPct: 5 },
        reward: { gold: 2400, reputation: 100, forgingEmblems: 2 },
      },
    ],
  },
  {
    id: "hearth_bounty",
    name: "丰穰暖灶共鸣录",
    pairLabel: "种植农牧 × 烹饪",
    iconId: "codex_set_hearth",
    description: "汇聚牧场鲜产与暖灶珍馐，永久增强生命上限、料理回复倍率与金币经验收成。",
    tiers: [
      {
        tier: 1,
        milestoneId: "hearth_bounty:tier_1",
        title: "初阶 · 田园炊烟",
        itemIds: ["wool", "food_simple", "armor_farmer_cloth_chest"],
        passiveBonuses: { bonusHp: 18, gatherSpeedPct: 2 },
        reward: { gold: 400, reputation: 25, forgingEmblems: 1 },
      },
      {
        tier: 2,
        milestoneId: "hearth_bounty:tier_2",
        title: "进阶 · 蜜香浓汤",
        itemIds: ["honey", "armor_chef_leather_chest", "food_hearty_stew"],
        passiveBonuses: { bonusHp: 30, foodHealPct: 4, goldGainPct: 3 },
        reward: { gold: 1000, reputation: 50, forgingEmblems: 1 },
      },
      {
        tier: 3,
        milestoneId: "hearth_bounty:tier_3",
        title: "宗师 · 百味盛宴",
        itemIds: ["milk", "weapon_frying_pan_t2", "food_master_feast"],
        passiveBonuses: { bonusHp: 50, bonusDef: 4, foodHealPct: 6, xpGainPct: 4 },
        reward: { gold: 2400, reputation: 100, forgingEmblems: 2 },
      },
    ],
  },
  {
    id: "arcane_crucible",
    name: "星晶秘药共鸣录",
    pairLabel: "水晶勘探 × 炼金",
    iconId: "codex_set_arcane",
    description: "调和地脉晶簇与秘传灵药，永久提升奥术攻击、秘药增益威力、暴击率与经验获取。",
    tiers: [
      {
        tier: 1,
        milestoneId: "arcane_crucible:tier_1",
        title: "初阶 · 微光萃液",
        itemIds: ["crystal_1", "potion_hp_t1", "weapon_staff_t1"],
        passiveBonuses: { bonusAtk: 2, xpGainPct: 2 },
        reward: { gold: 400, reputation: 25, forgingEmblems: 1 },
      },
      {
        tier: 2,
        milestoneId: "arcane_crucible:tier_2",
        title: "进阶 · 辉晶秘袍",
        itemIds: ["crystal_2", "armor_alchemist_cloth_robe", "weapon_staff_t2"],
        passiveBonuses: { bonusAtk: 4, potionBuffPct: 4, craftSpeedPct: 3 },
        reward: { gold: 1000, reputation: 50, forgingEmblems: 1 },
      },
      {
        tier: 3,
        milestoneId: "arcane_crucible:tier_3",
        title: "宗师 · 星火灵药",
        itemIds: ["crystal_4", "weapon_staff_t3", "elixir_legend"],
        passiveBonuses: { bonusAtk: 6, critRateBonusPct: 2, potionBuffPct: 6, xpGainPct: 5 },
        reward: { gold: 2400, reputation: 100, forgingEmblems: 2 },
      },
    ],
  },
];

export interface CodexGlobalMilestoneDef {
  id: string;
  requiredTiers: number;
  name: string;
  description: string;
  passiveBonuses: CodexPassiveBonusDef;
  reward: CodexMilestoneRewardDef;
}

export const CODEX_GLOBAL_MILESTONES: CodexGlobalMilestoneDef[] = [
  {
    id: "codex_ms_4",
    requiredTiers: 4,
    name: "四艺初鸣",
    description: "跨职业共鸣累计点亮 4 阶套装，激发工坊全能底蕴。",
    passiveBonuses: { bonusAtk: 3, bonusHp: 25, gatherSpeedPct: 3, craftSpeedPct: 3 },
    reward: { gold: 1200, reputation: 60, forgingEmblems: 2, items: { crystal_2: 4 } },
  },
  {
    id: "codex_ms_8",
    requiredTiers: 8,
    name: "八荒匠魂",
    description: "跨职业共鸣累计点亮 8 阶套装，贯通采锻织烹炼多重技艺。",
    passiveBonuses: { bonusAtk: 5, bonusDef: 4, bonusHp: 40, rareFindPct: 5, goldGainPct: 5 },
    reward: { gold: 3000, reputation: 140, forgingEmblems: 3, items: { crystal_3: 4 } },
  },
  {
    id: "codex_ms_12",
    requiredTiers: 12,
    name: "万匠共鸣 · 全制霸",
    description: "点亮全部 12 阶跨职业套装图鉴，成就异世界传世宗师圣典。",
    passiveBonuses: {
      bonusAtk: 8,
      bonusDef: 6,
      bonusHp: 70,
      armorPenPct: 0.05,
      gatherDoubleChance: 0.03,
      craftEfficiencyPct: 6,
      xpGainPct: 6,
    },
    reward: { gold: 6800, reputation: 300, forgingEmblems: 5, items: { crystal_4: 4, mirror_protection: 2 } },
  },
];

export const ALL_CODEX_TRACKED_ITEM_IDS: Set<string> = new Set(
  CROSS_PROF_RESONANCE_SETS.flatMap((s) => s.tiers.flatMap((t) => t.itemIds))
);

const VALID_RUNE_IDS = new Set<string>(HERITAGE_RUNES.map((r) => r.id));
const VALID_RUNE_SLOTS: HeritageRuneSlot[] = ["weapon", "armor", "tool"];

/** 确保 heritageWorkshop 状态存在并净化脏档数据（向后兼容旧存档） */
export function ensureHeritageWorkshop(player: EnhancedPlayerState): HeritageWorkshopState {
  if (!Array.isArray((player as any).logs)) {
    (player as any).logs = [];
  }
  if (!player.heritageWorkshop || typeof player.heritageWorkshop !== "object") {
    player.heritageWorkshop = {
      runeRanks: {},
      equippedRunes: { weapon: null, armor: null, tool: null },
      codexUnlockedItems: [],
      claimedCodexMilestones: [],
    };
  }
  const hw = player.heritageWorkshop;
  if (!hw.runeRanks || typeof hw.runeRanks !== "object") hw.runeRanks = {};
  for (const key of Object.keys(hw.runeRanks)) {
    if (!VALID_RUNE_IDS.has(key)) {
      delete (hw.runeRanks as Record<string, unknown>)[key];
      continue;
    }
    const raw = (hw.runeRanks as Record<string, unknown>)[key];
    const clean =
      typeof raw === "number" && Number.isFinite(raw) && raw > 0
        ? Math.min(HERITAGE_MAX_RUNE_RANK, Math.floor(raw))
        : 0;
    if (clean > 0) {
      hw.runeRanks[key as HeritageRuneId] = clean;
    } else {
      delete hw.runeRanks[key as HeritageRuneId];
    }
  }

  if (!hw.equippedRunes || typeof hw.equippedRunes !== "object") {
    hw.equippedRunes = { weapon: null, armor: null, tool: null };
  }
  for (const slot of VALID_RUNE_SLOTS) {
    const rid = hw.equippedRunes[slot];
    if (!rid || typeof rid !== "string" || !VALID_RUNE_IDS.has(rid)) {
      hw.equippedRunes[slot] = null;
      continue;
    }
    const def = HERITAGE_RUNES.find((r) => r.id === rid);
    const rank = hw.runeRanks[rid as HeritageRuneId] || 0;
    if (!def || def.slot !== slot || rank <= 0) {
      hw.equippedRunes[slot] = null;
    }
  }

  if (!Array.isArray(hw.codexUnlockedItems)) hw.codexUnlockedItems = [];
  hw.codexUnlockedItems = Array.from(
    new Set(hw.codexUnlockedItems.filter((x) => typeof x === "string" && ALL_CODEX_TRACKED_ITEM_IDS.has(x)))
  );

  if (!Array.isArray(hw.claimedCodexMilestones)) hw.claimedCodexMilestones = [];
  hw.claimedCodexMilestones = Array.from(
    new Set(hw.claimedCodexMilestones.filter((x) => typeof x === "string" && x.length > 0))
  );

  if (hw.emblemSynthesis && typeof hw.emblemSynthesis === "object") {
    const c = hw.emblemSynthesis.count;
    hw.emblemSynthesis = {
      date: typeof hw.emblemSynthesis.date === "string" ? hw.emblemSynthesis.date : "",
      count: typeof c === "number" && Number.isFinite(c) && c > 0 ? Math.floor(c) : 0,
    };
  } else {
    hw.emblemSynthesis = undefined;
  }

  return hw;
}

/** 单件物品产出/掉落时即时点亮跨职业图鉴（若该物品属于图鉴追踪项） */
export function recordCodexItemUnlock(player: EnhancedPlayerState, itemId: string): boolean {
  if (!itemId || !ALL_CODEX_TRACKED_ITEM_IDS.has(itemId)) return false;
  const hw = ensureHeritageWorkshop(player);
  if (hw.codexUnlockedItems.includes(itemId)) return false;
  hw.codexUnlockedItems.push(itemId);
  return true;
}

/** 扫描当前背包、穿戴装备与历史采集统计，自动补齐已获得过的跨职业图鉴条目 */
export function syncHeritageCodex(player: EnhancedPlayerState): string[] {
  const newlyUnlocked: string[] = [];
  const candidates = new Set<string>();
  for (const [id, qty] of Object.entries(player.inventory || {})) {
    if (ALL_CODEX_TRACKED_ITEM_IDS.has(id) && Number(qty) > 0) candidates.add(id);
  }
  for (const [slot, val] of Object.entries((player.equipment || {}) as Record<string, unknown>)) {
    if (slot === "enhancementLevels" || slot === "durability" || slot === "maxDurability") continue;
    if (typeof val === "string" && ALL_CODEX_TRACKED_ITEM_IDS.has(val)) candidates.add(val);
  }
  for (const [id, qty] of Object.entries(player.stats?.gatheredByItem || {})) {
    if (ALL_CODEX_TRACKED_ITEM_IDS.has(id) && Number(qty) > 0) candidates.add(id);
  }
  if (candidates.size === 0 && !player.heritageWorkshop) return newlyUnlocked;
  const hw = ensureHeritageWorkshop(player);
  const existing = new Set(hw.codexUnlockedItems);
  for (const id of candidates) {
    if (!existing.has(id)) {
      hw.codexUnlockedItems.push(id);
      existing.add(id);
      newlyUnlocked.push(id);
    }
  }
  return newlyUnlocked;
}

export interface HeritageWorkshopBonuses {
  bonusAtk: number;
  bonusDef: number;
  bonusHp: number;
  armorPenPct: number;
  thornsDefRatio: number;
  intervalMult: number;
  critRateBonusPct: number;
  critDmgBonusPct: number;
  foodHealMult: number;
  potionBuffMult: number;
  gatherSpeedPct: number;
  craftSpeedPct: number;
  gatherDoubleChance: number;
  craftEfficiencyPct: number;
  rareFindPct: number;
  goldGainPct: number;
  xpGainPct: number;
  completedSetTiers: number;
}

/**
 * 纯函数汇总「传世铭纹附魔台」与「跨职业套装共鸣图鉴」的全局属性与速率加成。
 * 与前端 combatSheet.ts 保持 1:1 确定性对称。
 */
export function getHeritageWorkshopBonuses(
  player?: Pick<EnhancedPlayerState, "heritageWorkshop"> | null
): HeritageWorkshopBonuses {
  const out: HeritageWorkshopBonuses = {
    bonusAtk: 0,
    bonusDef: 0,
    bonusHp: 0,
    armorPenPct: 0,
    thornsDefRatio: 0,
    intervalMult: 1,
    critRateBonusPct: 0,
    critDmgBonusPct: 0,
    foodHealMult: 1,
    potionBuffMult: 1,
    gatherSpeedPct: 0,
    craftSpeedPct: 0,
    gatherDoubleChance: 0,
    craftEfficiencyPct: 0,
    rareFindPct: 0,
    goldGainPct: 0,
    xpGainPct: 0,
    completedSetTiers: 0,
  };
  const hw = player?.heritageWorkshop;
  if (!hw || typeof hw !== "object") return out;

  let foodHealPct = 0;
  let potionBuffPct = 0;

  // 1) 三个槽位当前镶嵌激活的传世铭纹
  const eqRunes = hw.equippedRunes || {};
  const ranks = hw.runeRanks || {};
  for (const slot of VALID_RUNE_SLOTS) {
    const rid = eqRunes[slot];
    if (!rid || typeof rid !== "string") continue;
    const def = HERITAGE_RUNES.find((r) => r.id === rid && r.slot === slot);
    if (!def) continue;
    const rawRank = Number((ranks as Record<string, unknown>)[rid] || 0);
    const r = Number.isFinite(rawRank) && rawRank > 0 ? Math.min(def.maxRank, Math.floor(rawRank)) : 0;
    if (r <= 0) continue;
    const p = def.perRank;
    if (p.bonusAtk) out.bonusAtk += p.bonusAtk * r;
    if (p.bonusDef) out.bonusDef += p.bonusDef * r;
    if (p.bonusHp) out.bonusHp += p.bonusHp * r;
    if (p.armorPenPct) out.armorPenPct = Math.min(0.75, Math.round((out.armorPenPct + p.armorPenPct * r) * 1000) / 1000);
    if (p.thornsDefRatio) {
      out.thornsDefRatio = Math.min(0.85, Math.round((out.thornsDefRatio + p.thornsDefRatio * r) * 1000) / 1000);
    }
    if (p.intervalReductionPct) {
      const m = Math.max(0.7, 1 - (p.intervalReductionPct * r) / 100);
      out.intervalMult = Math.max(0.65, Math.round(out.intervalMult * m * 1000) / 1000);
    }
    if (p.critRateBonusPct) out.critRateBonusPct = Math.round((out.critRateBonusPct + p.critRateBonusPct * r) * 10) / 10;
    if (p.critDmgBonusPct) out.critDmgBonusPct += p.critDmgBonusPct * r;
    if (p.foodHealPct) foodHealPct += p.foodHealPct * r;
    if (p.potionBuffPct) potionBuffPct += p.potionBuffPct * r;
    if (p.gatherSpeedPct) out.gatherSpeedPct += p.gatherSpeedPct * r;
    if (p.craftSpeedPct) out.craftSpeedPct += p.craftSpeedPct * r;
    if (p.gatherDoubleChance) {
      out.gatherDoubleChance = Math.min(0.8, Math.round((out.gatherDoubleChance + p.gatherDoubleChance * r) * 1000) / 1000);
    }
    if (p.craftEfficiencyPct) out.craftEfficiencyPct += p.craftEfficiencyPct * r;
    if (p.rareFindPct) out.rareFindPct += p.rareFindPct * r;
    if (p.goldGainPct) out.goldGainPct += p.goldGainPct * r;
  }

  // 2) 跨职业套装共鸣图鉴已点亮阶级与全局共鸣里程碑被动
  const unlocked = new Set(Array.isArray(hw.codexUnlockedItems) ? hw.codexUnlockedItems : []);
  const addCodexPassive = (pb: CodexPassiveBonusDef) => {
    if (pb.bonusAtk) out.bonusAtk += pb.bonusAtk;
    if (pb.bonusDef) out.bonusDef += pb.bonusDef;
    if (pb.bonusHp) out.bonusHp += pb.bonusHp;
    if (pb.armorPenPct) out.armorPenPct = Math.min(0.75, Math.round((out.armorPenPct + pb.armorPenPct) * 1000) / 1000);
    if (pb.critRateBonusPct) out.critRateBonusPct = Math.round((out.critRateBonusPct + pb.critRateBonusPct) * 10) / 10;
    if (pb.foodHealPct) foodHealPct += pb.foodHealPct;
    if (pb.potionBuffPct) potionBuffPct += pb.potionBuffPct;
    if (pb.gatherSpeedPct) out.gatherSpeedPct += pb.gatherSpeedPct;
    if (pb.craftSpeedPct) out.craftSpeedPct += pb.craftSpeedPct;
    if (pb.gatherDoubleChance) {
      out.gatherDoubleChance = Math.min(0.8, Math.round((out.gatherDoubleChance + pb.gatherDoubleChance) * 1000) / 1000);
    }
    if (pb.craftEfficiencyPct) out.craftEfficiencyPct += pb.craftEfficiencyPct;
    if (pb.rareFindPct) out.rareFindPct += pb.rareFindPct;
    if (pb.goldGainPct) out.goldGainPct += pb.goldGainPct;
    if (pb.xpGainPct) out.xpGainPct += pb.xpGainPct;
  };

  for (const set of CROSS_PROF_RESONANCE_SETS) {
    for (const t of set.tiers) {
      if (t.itemIds.every((id) => unlocked.has(id))) {
        out.completedSetTiers += 1;
        addCodexPassive(t.passiveBonuses);
      }
    }
  }
  for (const gm of CODEX_GLOBAL_MILESTONES) {
    if (out.completedSetTiers >= gm.requiredTiers) {
      addCodexPassive(gm.passiveBonuses);
    }
  }

  if (foodHealPct > 0) out.foodHealMult = Math.round((1 + foodHealPct / 100) * 1000) / 1000;
  if (potionBuffPct > 0) out.potionBuffMult = Math.round((1 + potionBuffPct / 100) * 1000) / 1000;
  return out;
}

/** 篆刻或升阶指定传世铭纹（消耗稀有锻造徽记 + 水晶 + 金币；首次篆刻若该槽为空则自动镶嵌激活） */
export function engraveHeritageRune(
  player: EnhancedPlayerState,
  runeId: string,
  contentPack?: EnhancedContentPack
): {
  ok: boolean;
  reason?: string;
  runeId?: HeritageRuneId;
  newRank?: number;
  equippedSlot?: HeritageRuneSlot;
  cost?: HeritageRuneCostTier;
} {
  ensurePlayerExtensions(player);
  const hw = ensureHeritageWorkshop(player);
  const gh = ensureGuildHonor(player);
  const def = HERITAGE_RUNES.find((r) => r.id === runeId);
  if (!def) return { ok: false, reason: "未知的传世铭纹" };

  const currentRank = hw.runeRanks[def.id] || 0;
  if (currentRank >= def.maxRank) {
    return { ok: false, reason: "该传世铭纹已达最高等阶" };
  }
  const cost = HERITAGE_RUNE_COSTS.find((c) => c.targetRank === currentRank + 1);
  if (!cost) return { ok: false, reason: "铭纹升阶配方缺失" };

  if (gh.forgingEmblems < cost.forgingEmblems) {
    return { ok: false, reason: `稀有锻造徽记不足（需 ${cost.forgingEmblems} 枚，可通过公会连携或下方晶簇熔铸获取）` };
  }
  const goldNow = Number(player.inventory.gold || 0);
  if (goldNow < cost.gold) {
    return { ok: false, reason: `金币不足（需 ${cost.gold} 金币）` };
  }
  for (const [cid, needQty] of Object.entries(cost.crystals)) {
    const haveQty = Number(player.inventory[cid] || 0);
    if (haveQty < needQty) {
      const cName =
        ((contentPack?.items as Array<{ id: string; name?: string }> | undefined) || []).find((i) => i.id === cid)?.name ||
        cid;
      return { ok: false, reason: `${cName}不足（需 ${needQty} 个）` };
    }
  }

  gh.forgingEmblems -= cost.forgingEmblems;
  player.inventory.gold = goldNow - cost.gold;
  if (player.stats) player.stats.totalGoldSpent = (player.stats.totalGoldSpent || 0) + cost.gold;
  for (const [cid, needQty] of Object.entries(cost.crystals)) {
    player.inventory[cid] = Math.max(0, Number(player.inventory[cid] || 0) - needQty);
    if (player.inventory[cid] <= 0) delete player.inventory[cid];
  }

  const nextRank = currentRank + 1;
  hw.runeRanks[def.id] = nextRank;
  if (!hw.equippedRunes[def.slot]) {
    hw.equippedRunes[def.slot] = def.id;
  }
  syncHeritageCodex(player);
  appendLog(player, `传世铭纹「${def.name}」升至 ${nextRank} 阶（${def.slotLabel}）！`);
  return {
    ok: true,
    runeId: def.id,
    newRank: nextRank,
    equippedSlot: def.slot,
    cost,
  };
}

/** 切换武器/防具/工具槽当前激活的传世铭纹（已篆刻铭纹可随时无损切换） */
export function equipHeritageRune(
  player: EnhancedPlayerState,
  slot: string,
  runeId: string | null
): { ok: boolean; reason?: string; slot?: HeritageRuneSlot; equippedRuneId?: HeritageRuneId | null } {
  ensurePlayerExtensions(player);
  const hw = ensureHeritageWorkshop(player);
  if (!VALID_RUNE_SLOTS.includes(slot as HeritageRuneSlot)) {
    return { ok: false, reason: "无效的铭纹槽位" };
  }
  const typedSlot = slot as HeritageRuneSlot;
  if (runeId === null || runeId === "") {
    hw.equippedRunes[typedSlot] = null;
    return { ok: true, slot: typedSlot, equippedRuneId: null };
  }
  const def = HERITAGE_RUNES.find((r) => r.id === runeId);
  if (!def || def.slot !== typedSlot) {
    return { ok: false, reason: "该铭纹与目标装备槽不匹配" };
  }
  const rank = hw.runeRanks[def.id] || 0;
  if (rank <= 0) {
    return { ok: false, reason: "请先篆刻解锁该铭纹再镶嵌" };
  }
  hw.equippedRunes[typedSlot] = def.id;
  appendLog(player, `已在${def.slotLabel}激活传世铭纹「${def.name}」（Lv.${rank}）`);
  return { ok: true, slot: typedSlot, equippedRuneId: def.id };
}

/** 工坊晶簇熔铸保底：消耗水晶与金币直接熔铸「稀有锻造徽记」，让中后期玩家随时推进铭纹养成 */
export function synthesizeForgingEmblem(
  player: EnhancedPlayerState,
  recipeId: string,
  contentPack?: EnhancedContentPack,
  now: Date = new Date()
): {
  ok: boolean;
  reason?: string;
  emblemsGained?: number;
  forgingEmblems?: number;
  synthesesRemainingToday?: number;
} {
  ensurePlayerExtensions(player);
  const hw = ensureHeritageWorkshop(player);
  const gh = ensureGuildHonor(player);
  const recipe = EMBLEM_SYNTHESIS_RECIPES.find((r) => r.id === recipeId);
  if (!recipe) return { ok: false, reason: "未知的徽记熔铸配方" };

  const today = todayLocal(now);
  if (!hw.emblemSynthesis || hw.emblemSynthesis.date !== today) {
    hw.emblemSynthesis = { date: today, count: 0 };
  }
  if (hw.emblemSynthesis.count >= HERITAGE_DAILY_SYNTHESIS_LIMIT) {
    return { ok: false, reason: `今日工坊徽记熔铸次数已达上限（${HERITAGE_DAILY_SYNTHESIS_LIMIT} 次）` };
  }

  const goldNow = Number(player.inventory.gold || 0);
  if (goldNow < recipe.goldCost) {
    return { ok: false, reason: `金币不足（需 ${recipe.goldCost} 金币）` };
  }
  for (const [cid, needQty] of Object.entries(recipe.crystalCosts)) {
    const haveQty = Number(player.inventory[cid] || 0);
    if (haveQty < needQty) {
      const cName =
        ((contentPack?.items as Array<{ id: string; name?: string }> | undefined) || []).find((i) => i.id === cid)?.name ||
        cid;
      return { ok: false, reason: `${cName}不足（需 ${needQty} 个）` };
    }
  }

  player.inventory.gold = goldNow - recipe.goldCost;
  if (player.stats) player.stats.totalGoldSpent = (player.stats.totalGoldSpent || 0) + recipe.goldCost;
  for (const [cid, needQty] of Object.entries(recipe.crystalCosts)) {
    player.inventory[cid] = Math.max(0, Number(player.inventory[cid] || 0) - needQty);
    if (player.inventory[cid] <= 0) delete player.inventory[cid];
  }

  hw.emblemSynthesis.count += 1;
  gh.forgingEmblems += recipe.emblemsOut;
  syncHeritageCodex(player);
  appendLog(player, `通过「${recipe.name}」熔铸获得稀有锻造徽记 ×${recipe.emblemsOut}！`);
  return {
    ok: true,
    emblemsGained: recipe.emblemsOut,
    forgingEmblems: gh.forgingEmblems,
    synthesesRemainingToday: Math.max(0, HERITAGE_DAILY_SYNTHESIS_LIMIT - hw.emblemSynthesis.count),
  };
}

/** 领取跨职业套装共鸣图鉴的单阶套装奖励或全局里程碑大奖 */
export function claimHeritageCodexMilestone(
  player: EnhancedPlayerState,
  milestoneId: string,
  contentPack?: EnhancedContentPack
): {
  ok: boolean;
  reason?: string;
  milestoneId?: string;
  reward?: CodexMilestoneRewardDef;
} {
  ensurePlayerExtensions(player);
  syncHeritageCodex(player);
  const hw = ensureHeritageWorkshop(player);
  const gh = ensureGuildHonor(player);

  if (hw.claimedCodexMilestones.includes(milestoneId)) {
    return { ok: false, reason: "该共鸣图鉴奖励已领取" };
  }

  const unlocked = new Set(hw.codexUnlockedItems);
  let completedSetTiers = 0;
  let matchedReward: CodexMilestoneRewardDef | undefined;
  let matchedLabel = "";

  for (const set of CROSS_PROF_RESONANCE_SETS) {
    for (const t of set.tiers) {
      const done = t.itemIds.every((id) => unlocked.has(id));
      if (done) completedSetTiers += 1;
      if (t.milestoneId === milestoneId) {
        if (!done) return { ok: false, reason: "尚未集齐该阶跨职业套装所需的全部造物" };
        matchedReward = t.reward;
        matchedLabel = `${set.name} · ${t.title}`;
      }
    }
  }

  if (!matchedReward) {
    const gm = CODEX_GLOBAL_MILESTONES.find((m) => m.id === milestoneId);
    if (!gm) return { ok: false, reason: "未知的共鸣图鉴里程碑" };
    if (completedSetTiers < gm.requiredTiers) {
      return { ok: false, reason: `需累计点亮 ${gm.requiredTiers} 阶跨职业套装（当前 ${completedSetTiers} 阶）` };
    }
    matchedReward = gm.reward;
    matchedLabel = gm.name;
  }

  hw.claimedCodexMilestones.push(milestoneId);
  player.inventory.gold = Number(player.inventory.gold || 0) + matchedReward.gold;
  if (player.stats) player.stats.totalGoldEarned = (player.stats.totalGoldEarned || 0) + matchedReward.gold;
  if (matchedReward.reputation > 0) addReputation(player, matchedReward.reputation);
  if (matchedReward.forgingEmblems > 0) gh.forgingEmblems += matchedReward.forgingEmblems;
  if (matchedReward.items) {
    for (const [iid, qty] of Object.entries(matchedReward.items)) {
      if (qty > 0) {
        player.inventory[iid] = Number(player.inventory[iid] || 0) + qty;
        recordCodexItemUnlock(player, iid);
      }
    }
  }
  syncAchievements(player);
  const itemPart = matchedReward.items
    ? "、" +
      Object.entries(matchedReward.items)
        .map(([iid, q]) => {
          const nm =
            ((contentPack?.items as Array<{ id: string; name?: string }> | undefined) || []).find((i) => i.id === iid)
              ?.name || iid;
          return `${nm} ×${q}`;
        })
        .join("、")
    : "";
  appendLog(
    player,
    `领取共鸣图鉴里程碑「${matchedLabel}」：金币 +${matchedReward.gold}、声望 +${matchedReward.reputation}、稀有锻造徽记 +${matchedReward.forgingEmblems}${itemPart}！`
  );
  return { ok: true, milestoneId, reward: matchedReward };
}

/** 构造前端「传世铭纹附魔台与跨职业套装共鸣图鉴」面板完整视图数据 */
export function getHeritageWorkshopInfo(
  player: EnhancedPlayerState,
  contentPack?: EnhancedContentPack,
  now: Date = new Date()
) {
  ensurePlayerExtensions(player);
  syncHeritageCodex(player);
  const hw = ensureHeritageWorkshop(player);
  const gh = ensureGuildHonor(player);
  const itemsById = new Map<string, string>(
    (((contentPack?.items as Array<{ id: string; name?: string }> | undefined) || [])).map((it) => [
      it.id,
      it.name || it.id,
    ])
  );

  const today = todayLocal(now);
  const synthUsedToday = hw.emblemSynthesis?.date === today ? hw.emblemSynthesis.count : 0;
  const goldNow = Number(player.inventory.gold || 0);

  const runes = HERITAGE_RUNES.map((def) => {
    const rank = hw.runeRanks[def.id] || 0;
    const isMax = rank >= def.maxRank;
    const nextCost = isMax ? null : HERITAGE_RUNE_COSTS.find((c) => c.targetRank === rank + 1) || null;
    const crystalsList = nextCost
      ? Object.entries(nextCost.crystals).map(([cid, need]) => ({
          itemId: cid,
          name: itemsById.get(cid) || cid,
          need,
          have: Number(player.inventory[cid] || 0),
        }))
      : [];
    const canAfford =
      !!nextCost &&
      gh.forgingEmblems >= nextCost.forgingEmblems &&
      goldNow >= nextCost.gold &&
      crystalsList.every((c) => c.have >= c.need);
    return {
      ...def,
      rank,
      isMax,
      isEquipped: hw.equippedRunes[def.slot] === def.id,
      nextCost: nextCost
        ? {
            targetRank: nextCost.targetRank,
            forgingEmblems: nextCost.forgingEmblems,
            gold: nextCost.gold,
            crystals: crystalsList,
          }
        : null,
      canAfford,
    };
  });

  const synthesisRecipes = EMBLEM_SYNTHESIS_RECIPES.map((r) => {
    const crystals = Object.entries(r.crystalCosts).map(([cid, need]) => ({
      itemId: cid,
      name: itemsById.get(cid) || cid,
      need,
      have: Number(player.inventory[cid] || 0),
    }));
    const canAfford =
      synthUsedToday < HERITAGE_DAILY_SYNTHESIS_LIMIT &&
      goldNow >= r.goldCost &&
      crystals.every((c) => c.have >= c.need);
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      goldCost: r.goldCost,
      emblemsOut: r.emblemsOut,
      crystals,
      canAfford,
    };
  });

  const unlockedSet = new Set(hw.codexUnlockedItems);
  const claimedSet = new Set(hw.claimedCodexMilestones);
  let completedSetTiers = 0;
  let claimableCount = 0;

  const codexSets = CROSS_PROF_RESONANCE_SETS.map((set) => {
    const tiers = set.tiers.map((t) => {
      const items = t.itemIds.map((iid) => ({
        itemId: iid,
        name: itemsById.get(iid) || iid,
        unlocked: unlockedSet.has(iid),
      }));
      const unlockedCount = items.filter((x) => x.unlocked).length;
      const completed = unlockedCount === items.length;
      if (completed) completedSetTiers += 1;
      const claimed = claimedSet.has(t.milestoneId);
      const claimable = completed && !claimed;
      if (claimable) claimableCount += 1;
      return {
        tier: t.tier,
        milestoneId: t.milestoneId,
        title: t.title,
        items,
        unlockedCount,
        totalCount: items.length,
        completed,
        claimed,
        claimable,
        passiveBonuses: t.passiveBonuses,
        reward: t.reward,
      };
    });
    const unlockedItemsInSet = tiers.reduce((acc, t) => acc + t.unlockedCount, 0);
    const totalItemsInSet = tiers.reduce((acc, t) => acc + t.totalCount, 0);
    return {
      id: set.id,
      name: set.name,
      pairLabel: set.pairLabel,
      iconId: set.iconId,
      description: set.description,
      unlockedItemsInSet,
      totalItemsInSet,
      completedTiersInSet: tiers.filter((t) => t.completed).length,
      tiers,
    };
  });

  const globalMilestones = CODEX_GLOBAL_MILESTONES.map((gm) => {
    const completed = completedSetTiers >= gm.requiredTiers;
    const claimed = claimedSet.has(gm.id);
    const claimable = completed && !claimed;
    if (claimable) claimableCount += 1;
    return {
      id: gm.id,
      requiredTiers: gm.requiredTiers,
      name: gm.name,
      description: gm.description,
      completed,
      claimed,
      claimable,
      passiveBonuses: gm.passiveBonuses,
      reward: {
        ...gm.reward,
        itemList: Object.entries(gm.reward.items || {}).map(([iid, qty]) => ({
          itemId: iid,
          name: itemsById.get(iid) || iid,
          qty,
        })),
      },
    };
  });

  const bonuses = getHeritageWorkshopBonuses(player);

  return {
    forgingEmblems: gh.forgingEmblems,
    gold: goldNow,
    crystalsInventory: {
      crystal_1: Number(player.inventory.crystal_1 || 0),
      crystal_2: Number(player.inventory.crystal_2 || 0),
      crystal_3: Number(player.inventory.crystal_3 || 0),
      crystal_4: Number(player.inventory.crystal_4 || 0),
      crystal_5: Number(player.inventory.crystal_5 || 0),
    },
    equippedRunes: {
      weapon: hw.equippedRunes.weapon || null,
      armor: hw.equippedRunes.armor || null,
      tool: hw.equippedRunes.tool || null,
    },
    runes,
    synthesis: {
      dailyLimit: HERITAGE_DAILY_SYNTHESIS_LIMIT,
      usedToday: synthUsedToday,
      remainingToday: Math.max(0, HERITAGE_DAILY_SYNTHESIS_LIMIT - synthUsedToday),
      recipes: synthesisRecipes,
    },
    codex: {
      unlockedItemsCount: hw.codexUnlockedItems.length,
      totalTrackedItems: ALL_CODEX_TRACKED_ITEM_IDS.size,
      completedSetTiers,
      totalSetTiers: CROSS_PROF_RESONANCE_SETS.reduce((s, x) => s + x.tiers.length, 0),
      claimableCount,
      sets: codexSets,
      globalMilestones,
    },
    bonuses,
  };
}

/* ============================ 远征商队贸易航路 & 工坊特批契约柜台 (WL-7) ============================ */

export const CARAVAN_MAX_LEDGER_RANK = 5;
export const CARAVAN_LEDGER_COSTS: readonly number[] = [25, 50, 85, 135, 195];
export const CARAVAN_BASE_WAGON_CAPACITY = 60;
export const CARAVAN_LEDGER_CAPACITY_PER_RANK = 15;
export const CARAVAN_MIN_CARGO_VALUE = 40;
export const CARAVAN_MAX_CARGO_TYPES = 6;
export const CARAVAN_CONTRACT_MAX_REROLLS = 3;
export const CARAVAN_CONTRACT_REROLL_COST = 150;

export interface CaravanRepTierDef {
  level: number;
  minRep: number;
  title: string;
  maxWagons: 1 | 2 | 3;
  gatherDoubleChance: number;
  craftSpeedPct: number;
  goldGainPct: number;
}

export const CARAVAN_REP_TIERS: readonly CaravanRepTierDef[] = [
  { level: 1, minRep: 0, title: "初途行商", maxWagons: 1, gatherDoubleChance: 0, craftSpeedPct: 0, goldGainPct: 0 },
  { level: 2, minRep: 100, title: "驿路熟客", maxWagons: 1, gatherDoubleChance: 0.03, craftSpeedPct: 4, goldGainPct: 4 },
  { level: 3, minRep: 280, title: "跨镇领航商", maxWagons: 2, gatherDoubleChance: 0.06, craftSpeedPct: 8, goldGainPct: 8 },
  { level: 4, minRep: 580, title: "皇家特许行会", maxWagons: 2, gatherDoubleChance: 0.1, craftSpeedPct: 12, goldGainPct: 13 },
  { level: 5, minRep: 1050, title: "星界远航巨贾", maxWagons: 3, gatherDoubleChance: 0.14, craftSpeedPct: 17, goldGainPct: 18 },
  { level: 6, minRep: 1700, title: "万邦星途总商会", maxWagons: 3, gatherDoubleChance: 0.19, craftSpeedPct: 22, goldGainPct: 24 },
];

export interface CaravanRouteDef {
  id: CaravanRouteId;
  name: string;
  townName: string;
  iconId: string;
  favoredCategory: CaravanCargoCategory;
  favoredLabel: string;
  description: string;
  baseDurationMs: number;
  goldReturnRatio: number;
  baseDust: number;
  dustDivisor: number;
  baseRep: number;
  emblemThreshold: number;
  hotCandidateIds: string[];
}

export const CARAVAN_TRADE_ROUTES: readonly CaravanRouteDef[] = [
  {
    id: "frostport",
    name: "凛风冰港航路",
    townName: "极北凛风冰港",
    iconId: "caravan_route_frostport",
    favoredCategory: "lumber_fish_dishes",
    favoredLabel: "原木 / 板材 / 渔获 / 料理补给",
    description: "冰封船坞终年急缺耐寒木材与热食鱼鲜，装运林木板材与料理渔获可获高额寒港紧缺溢价。",
    baseDurationMs: 12 * 60 * 1000,
    goldReturnRatio: 1.32,
    baseDust: 4,
    dustDivisor: 88,
    baseRep: 24,
    emblemThreshold: 340,
    hotCandidateIds: [
      "wood_1",
      "lumber_1",
      "fish_river",
      "food_simple",
      "lumber_2",
      "fish_sea",
      "food_fine",
      "dish_grilled_lake",
    ],
  },
  {
    id: "emberoasis",
    name: "赤砂绿洲航路",
    townName: "炎阳赤砂绿洲",
    iconId: "caravan_route_emberoasis",
    favoredCategory: "ore_ingot_tools",
    favoredLabel: "矿石 / 金属锭 / 锻造工具与军备",
    description: "大漠商驿扩建矿道与护卫队，常年高价收购各类矿石、金属锭与百工锻造工具器械。",
    baseDurationMs: 20 * 60 * 1000,
    goldReturnRatio: 1.38,
    baseDust: 6,
    dustDivisor: 80,
    baseRep: 32,
    emblemThreshold: 300,
    hotCandidateIds: [
      "ore_1",
      "ingot_1",
      "ore_2",
      "ingot_2",
      "weapon_iron_sword",
      "weapon_logging_axe_t1",
      "weapon_forge_hammer_t1",
      "ingot_3",
    ],
  },
  {
    id: "starfallspire",
    name: "星坠秘塔航路",
    townName: "云巅星坠秘塔",
    iconId: "caravan_route_starfallspire",
    favoredCategory: "herb_cloth_crystal_alchemy",
    favoredLabel: "灵草 / 纺织丝布 / 辉光水晶 / 秘药炼金",
    description: "星象法师塔长年消耗灵草、织物法袍、辉光水晶与炼金秘药，返航盛产高纯度异域星晶尘。",
    baseDurationMs: 30 * 60 * 1000,
    goldReturnRatio: 1.44,
    baseDust: 8,
    dustDivisor: 72,
    baseRep: 42,
    emblemThreshold: 270,
    hotCandidateIds: [
      "fiber_1",
      "yarn_1",
      "crystal_1",
      "potion_hp_t1",
      "crystal_2",
      "potion_mp_t2",
      "herb_farm",
      "dyed_cloth",
    ],
  },
];

export interface WorkshopContractTemplateDef {
  id: string;
  slotGroup: 0 | 1 | 2 | 3;
  name: string;
  description: string;
  rarity: "standard" | "urgent" | "royal";
  demands: Record<string, number>;
  reward: {
    gold: number;
    astralCrystalDust: number;
    forgingEmblems: number;
    honorPoints: number;
    expressPermits: number;
    caravanRep: number;
  };
}

export const WORKSHOP_CONTRACT_TEMPLATES: readonly WorkshopContractTemplateDef[] = [
  {
    id: "wc_frost_timber",
    slotGroup: 0,
    name: "寒港船坞修缮木料单",
    description: "向凛风冰港造船工坊交付基础原木与标准木板，换取星晶尘与加急通行证。",
    rarity: "standard",
    demands: { wood_1: 12, lumber_1: 6 },
    reward: { gold: 320, astralCrystalDust: 12, forgingEmblems: 1, honorPoints: 25, expressPermits: 1, caravanRep: 24 },
  },
  {
    id: "wc_camp_provisions",
    slotGroup: 0,
    name: "边疆驿站热食配给契",
    description: "筹措河鱼与简单料理支援远征哨站，结算工坊荣誉与星晶尘。",
    rarity: "standard",
    demands: { fish_river: 6, food_simple: 4 },
    reward: { gold: 360, astralCrystalDust: 14, forgingEmblems: 1, honorPoints: 28, expressPermits: 0, caravanRep: 26 },
  },
  {
    id: "wc_reinforced_planks",
    slotGroup: 0,
    name: "加固车轴木工急调令",
    description: "商队总驿急需加固木板与坚硬原木修整重型货车。",
    rarity: "urgent",
    demands: { wood_2: 10, lumber_2: 6 },
    reward: { gold: 520, astralCrystalDust: 18, forgingEmblems: 1, honorPoints: 35, expressPermits: 1, caravanRep: 32 },
  },
  {
    id: "wc_copper_smelt",
    slotGroup: 1,
    name: "赤砂矿道铜锭特批单",
    description: "交付铜矿石与铜锭支援绿洲熔炉，奖励稀有锻造徽记与异域星晶尘。",
    rarity: "standard",
    demands: { ore_1: 12, ingot_1: 6 },
    reward: { gold: 350, astralCrystalDust: 14, forgingEmblems: 1, honorPoints: 30, expressPermits: 0, caravanRep: 26 },
  },
  {
    id: "wc_iron_armory",
    slotGroup: 1,
    name: "绿洲护卫队铁器军需契",
    description: "打造铁锭与铁剑列装商路护卫，获取丰厚锻造徽记与公会荣誉。",
    rarity: "urgent",
    demands: { ingot_2: 6, weapon_iron_sword: 1 },
    reward: { gold: 640, astralCrystalDust: 22, forgingEmblems: 2, honorPoints: 45, expressPermits: 1, caravanRep: 38 },
  },
  {
    id: "wc_silver_ingots",
    slotGroup: 1,
    name: "秘银前哨精炼银锭单",
    description: "向高阶锻造局供应银矿石与银锭，附赠商队加急通行证。",
    rarity: "urgent",
    demands: { ore_3: 8, ingot_3: 5 },
    reward: { gold: 780, astralCrystalDust: 25, forgingEmblems: 2, honorPoints: 50, expressPermits: 1, caravanRep: 42 },
  },
  {
    id: "wc_weaver_bolts",
    slotGroup: 2,
    name: "远航篷布棉纺采购契",
    description: "交付棉花与棉线缝制防风商车篷布，稳定换取星晶尘与荣誉。",
    rarity: "standard",
    demands: { fiber_1: 12, yarn_1: 6 },
    reward: { gold: 340, astralCrystalDust: 15, forgingEmblems: 1, honorPoints: 28, expressPermits: 0, caravanRep: 25 },
  },
  {
    id: "wc_alchemy_vials",
    slotGroup: 2,
    name: "星坠学派晶药补给单",
    description: "上缴微光水晶与初级生命药水供法师塔实验，回馈星晶尘与通行证。",
    rarity: "urgent",
    demands: { crystal_1: 8, potion_hp_t1: 4 },
    reward: { gold: 560, astralCrystalDust: 20, forgingEmblems: 1, honorPoints: 40, expressPermits: 1, caravanRep: 34 },
  },
  {
    id: "wc_radiant_arcana",
    slotGroup: 2,
    name: "辉光秘药高阶征调书",
    description: "调拨辉光水晶与中级魔力药水，支援星坠秘塔结界运转。",
    rarity: "urgent",
    demands: { crystal_2: 6, potion_mp_t2: 3 },
    reward: { gold: 720, astralCrystalDust: 26, forgingEmblems: 2, honorPoints: 48, expressPermits: 1, caravanRep: 40 },
  },
  {
    id: "wc_royal_pioneer",
    slotGroup: 3,
    name: "皇家开拓团百工联供契",
    description: "跨职业集齐标准木板、铜锭与初级生命药水，一次性签发高额星晶尘、双倍徽记与加急通行证。",
    rarity: "royal",
    demands: { lumber_1: 8, ingot_1: 6, potion_hp_t1: 3 },
    reward: { gold: 880, astralCrystalDust: 30, forgingEmblems: 2, honorPoints: 60, expressPermits: 1, caravanRep: 48 },
  },
  {
    id: "wc_royal_expedition",
    slotGroup: 3,
    name: "星界远征军总军需敕令",
    description: "跨职业交付加固木板、亚麻线与辉光水晶，获皇家最高规格晶尘与徽记嘉奖。",
    rarity: "royal",
    demands: { lumber_2: 6, yarn_2: 6, crystal_2: 5 },
    reward: { gold: 1180, astralCrystalDust: 36, forgingEmblems: 3, honorPoints: 75, expressPermits: 1, caravanRep: 56 },
  },
  {
    id: "wc_royal_banquet_forge",
    slotGroup: 3,
    name: "万邦商会庆典特供总契",
    description: "汇集铁锭、精致料理与耀光水晶筹备商会大典，直接赐予三枚稀有锻造徽记与大量星晶尘。",
    rarity: "royal",
    demands: { ingot_2: 6, food_fine: 4, crystal_3: 3 },
    reward: { gold: 1380, astralCrystalDust: 42, forgingEmblems: 3, honorPoints: 85, expressPermits: 1, caravanRep: 64 },
  },
];

export interface AstralDustExchangeOfferDef {
  id: string;
  name: string;
  description: string;
  dustCost: number;
  dailyLimit?: number;
  kind: "ledger" | "emblem" | "crystals" | "permit";
  emblemsOut?: number;
  expressPermitsOut?: number;
  itemsOut?: Record<string, number>;
}

export const ASTRAL_DUST_EXCHANGE_OFFERS: readonly AstralDustExchangeOfferDef[] = [
  {
    id: "dust_forging_emblem",
    name: "星晶凝铸·稀有锻造徽记",
    description: "以异域星晶尘催化熔炉核心，直接凝铸 1 枚稀有锻造徽记用于传世铭纹升阶。",
    dustCost: 18,
    dailyLimit: 8,
    kind: "emblem",
    emblemsOut: 1,
  },
  {
    id: "dust_express_permit",
    name: "驿路特权·商队加急通行证",
    description: "凭星晶尘向总驿签发 1 张商队加急通行证，可令任意远征商车免除等待立即返航结算。",
    dustCost: 12,
    dailyLimit: 6,
    kind: "permit",
    expressPermitsOut: 1,
  },
  {
    id: "dust_crystal_bundle_t2",
    name: "辉耀灵晶补给匣",
    description: "开启获得微光水晶 ×6、辉光水晶 ×4、耀光水晶 ×2，同步点亮跨职业共鸣图鉴。",
    dustCost: 15,
    dailyLimit: 6,
    kind: "crystals",
    itemsOut: { crystal_1: 6, crystal_2: 4, crystal_3: 2 },
  },
  {
    id: "dust_crystal_bundle_t4",
    name: "星穹高阶圣晶秘匣",
    description: "开启获得耀光水晶 ×4、炽光水晶 ×3、圣光水晶 ×1，并额外附赠商队加急通行证 ×1。",
    dustCost: 32,
    dailyLimit: 4,
    kind: "crystals",
    itemsOut: { crystal_3: 4, crystal_4: 3, crystal_5: 1 },
    expressPermitsOut: 1,
  },
];

const VALID_CARAVAN_ROUTES = new Set<string>(CARAVAN_TRADE_ROUTES.map((r) => r.id));
const VALID_WAGON_SLOTS: readonly CaravanWagonSlot[] = [0, 1, 2];

/** 识别货品所属远征紧缺大类（前后端 1:1 纯函数规则） */
export function classifyCaravanCargoCategory(
  itemId: string,
  itemDef?: { id?: string; type?: string; toolFor?: string } | null
): CaravanCargoCategory | null {
  const id = String(itemId || "").trim();
  if (!id || id === "gold") return null;

  if (
    /^(crystal|fiber|yarn|potion|elixir|drink|herb|flower)_/.test(id) ||
    id === "wool" ||
    id === "rabbit_fur" ||
    id === "dyed_cloth" ||
    id === "tea_spirit" ||
    id === "poison_sac" ||
    id === "rotten_heart" ||
    id === "elemental_core" ||
    id === "snake_venom" ||
    id === "ghost_essence" ||
    /^armor_(cloth|farmer_cloth|alchemist_cloth|traveler_cloak)/.test(id) ||
    /^weapon_(scissors|staff|alchemy_bottle)_/.test(id)
  ) {
    return "herb_cloth_crystal_alchemy";
  }

  if (
    /^(wood|lumber|fish|dish|food)_/.test(id) ||
    id === "shrimp" ||
    id === "egg" ||
    id === "milk" ||
    id === "pork" ||
    id === "honey" ||
    id === "grain" ||
    id === "corn" ||
    id === "vegetable" ||
    id === "hay" ||
    id === "feed_animal" ||
    id === "flour" ||
    id === "oil" ||
    id === "bread" ||
    id === "butter" ||
    id === "cheese_wheel" ||
    id === "sauce_secret" ||
    id === "soup_herbal"
  ) {
    return "lumber_fish_dishes";
  }

  if (
    /^(ore|ingot|tool)_/.test(id) ||
    id === "charcoal" ||
    id === "resin" ||
    id === "leather_hide" ||
    id === "mirror_protection" ||
    Boolean(itemDef?.toolFor) ||
    /^(weapon|armor|offhand)_/.test(id)
  ) {
    return "ore_ingot_tools";
  }

  return null;
}

/** 生成 6 小时轮换的城镇紧缺班次种子（每日 4 班确定性轮换） */
export function buildCaravanScarcityShiftKey(now: Date = new Date()): string {
  const date = todayLocal(now);
  const shift = Math.min(3, Math.max(0, Math.floor(now.getHours() / 6)));
  return `wl7-scarcity:${date}#S${shift}`;
}

/** 计算指定航路在当前班次的确定性城镇紧缺系数（严格落在 1.15x ~ 1.85x 区间） */
export function getCaravanRouteScarcity(
  routeId: CaravanRouteId,
  nowOrShiftKey: Date | string = new Date()
): {
  shiftKey: string;
  scarcityMultiplier: number;
  hotItemIds: string[];
  hotMultiplier: number;
} {
  const shiftKey =
    typeof nowOrShiftKey === "string" && nowOrShiftKey.length > 0
      ? nowOrShiftKey
      : buildCaravanScarcityShiftKey(nowOrShiftKey instanceof Date ? nowOrShiftKey : new Date());
  const route = CARAVAN_TRADE_ROUTES.find((r) => r.id === routeId) || CARAVAN_TRADE_ROUTES[0];
  const rng = createSeededRng(`${shiftKey}::route:${route.id}`);
  const rawSteps = Math.floor(rng() * 58); // 0..57 -> 1.15..1.72
  const scarcityMultiplier = Math.round((1.15 + rawSteps * 0.01) * 100) / 100;
  const hotMultiplier = Math.min(1.85, Math.round((scarcityMultiplier + 0.13) * 100) / 100);

  const pool = [...route.hotCandidateIds];
  const hotItemIds: string[] = [];
  while (hotItemIds.length < 2 && pool.length > 0) {
    const idx = Math.floor(rng() * pool.length);
    hotItemIds.push(pool.splice(idx, 1)[0]);
  }
  return {
    shiftKey,
    scarcityMultiplier,
    hotItemIds,
    hotMultiplier,
  };
}

/** 根据累计商队声望返回当前商队等级（Lv.1~Lv.6）与下一级进度 */
export function getCaravanRepTier(caravanRep: number): {
  current: CaravanRepTierDef;
  next: CaravanRepTierDef | null;
  progressPct: number;
} {
  const rep = Number.isFinite(caravanRep) && caravanRep > 0 ? Math.floor(caravanRep) : 0;
  let current = CARAVAN_REP_TIERS[0];
  for (const t of CARAVAN_REP_TIERS) {
    if (rep >= t.minRep) current = t;
  }
  const next = CARAVAN_REP_TIERS.find((t) => t.level === current.level + 1) || null;
  const progressPct = !next
    ? 100
    : Math.min(100, Math.max(0, Math.floor(((rep - current.minRep) / Math.max(1, next.minRep - current.minRep)) * 100)));
  return { current, next, progressPct };
}

export interface CaravanTradeBonuses {
  level: number;
  title: string;
  ledgerRank: number;
  maxWagons: 1 | 2 | 3;
  maxCargoCapacity: number;
  gatherDoubleChance: number;
  craftSpeedPct: number;
  goldGainPct: number;
  tradeYieldPct: number;
  durationReductionPct: number;
}

/**
 * 纯函数汇总「远征商队声望（Lv.1~6）」与「远征宗师商典（Lv.0~5）」的永久全局加成。
 * 与前端 combatSheet.ts / caravanTrade.ts 保持 1:1 确定性对称。
 */
export function getCaravanTradeBonuses(
  player?: Pick<EnhancedPlayerState, "caravanTrade"> | null
): CaravanTradeBonuses {
  const ct = player?.caravanTrade;
  const rawRep = Number(ct?.caravanRep || 0);
  const cleanRep = Number.isFinite(rawRep) && rawRep > 0 ? Math.floor(rawRep) : 0;
  const rawLedger = Number(ct?.ledgerRank || 0);
  const ledgerRank =
    Number.isFinite(rawLedger) && rawLedger > 0
      ? Math.min(CARAVAN_MAX_LEDGER_RANK, Math.floor(rawLedger))
      : 0;

  const { current } = getCaravanRepTier(cleanRep);
  const gatherDoubleChance = Math.min(
    0.5,
    Math.round((current.gatherDoubleChance + ledgerRank * 0.01) * 1000) / 1000
  );
  const craftSpeedPct = current.craftSpeedPct + ledgerRank * 2;
  const goldGainPct = current.goldGainPct + ledgerRank * 2;
  const tradeYieldPct = ledgerRank * 6;
  const durationReductionPct = ledgerRank * 6;
  const maxCargoCapacity = CARAVAN_BASE_WAGON_CAPACITY + ledgerRank * CARAVAN_LEDGER_CAPACITY_PER_RANK;

  return {
    level: current.level,
    title: current.title,
    ledgerRank,
    maxWagons: current.maxWagons,
    maxCargoCapacity,
    gatherDoubleChance,
    craftSpeedPct,
    goldGainPct,
    tradeYieldPct,
    durationReductionPct,
  };
}

/** 统计角色当前穿戴在各装备槽上的物品件数，保护穿戴中装备不被装车或交付契约 */
export function getEquippedItemCounts(player?: Pick<EnhancedPlayerState, "equipment"> | null): Record<string, number> {
  const counts: Record<string, number> = {};
  const eq = (player?.equipment || {}) as Record<string, unknown>;
  for (const [slot, val] of Object.entries(eq)) {
    if (slot === "enhancementLevels" || slot === "durability" || slot === "maxDurability") continue;
    if (typeof val === "string" && val.length > 0) {
      counts[val] = (counts[val] || 0) + 1;
    }
  }
  return counts;
}

/** 返回指定物品当前可安全动用的闲置库存数量（总库存 - 已穿戴件数） */
export function getIdleCargoCount(
  player: Pick<EnhancedPlayerState, "inventory" | "equipment">,
  itemId: string
): number {
  if (!itemId || itemId === "gold") return 0;
  const total = Math.max(0, Math.floor(Number(player.inventory?.[itemId] || 0)));
  if (total <= 0) return 0;
  const equipped = getEquippedItemCounts(player)[itemId] || 0;
  return Math.max(0, total - equipped);
}

export function buildWorkshopContractSeedKey(date: string, rerollIndex = 0): string {
  return `wl7-workshop-contracts:${date}#r${Math.max(0, Math.floor(rerollIndex || 0))}`;
}

export function generateWorkshopContractsForSeed(seedKey: string): WorkshopSupplyContractInstance[] {
  const rng = createSeededRng(seedKey);
  const contracts: WorkshopSupplyContractInstance[] = [];
  for (const slotGroup of [0, 1, 2, 3] as const) {
    const candidates = WORKSHOP_CONTRACT_TEMPLATES.filter((t) => t.slotGroup === slotGroup);
    const chosen = candidates[Math.floor(rng() * candidates.length)] || candidates[0];
    contracts.push({
      id: `wsc_${slotGroup}_${chosen.id}`,
      templateId: chosen.id,
      name: chosen.name,
      description: chosen.description,
      rarity: chosen.rarity,
      demands: { ...chosen.demands },
      reward: { ...chosen.reward },
      fulfilled: false,
    });
  }
  return contracts;
}

/** 确保 caravanTrade 状态存在并净化脏档数据，同时自动维护当日 4 份工坊特批契约 */
export function ensureCaravanTrade(player: EnhancedPlayerState, now: Date = new Date()): CaravanTradeState {
  if (!Array.isArray((player as any).logs)) {
    (player as any).logs = [];
  }
  const cleanNonNeg = (v: unknown, fallback = 0): number =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallback;

  if (!player.caravanTrade || typeof player.caravanTrade !== "object") {
    player.caravanTrade = {
      caravanRep: 0,
      astralCrystalDust: 0,
      expressPermits: 1,
      ledgerRank: 0,
      totalRunsCompleted: 0,
      totalContractsFulfilled: 0,
      wagons: {},
    };
  }
  const ct = player.caravanTrade;
  ct.caravanRep = cleanNonNeg(ct.caravanRep, 0);
  ct.astralCrystalDust = cleanNonNeg(ct.astralCrystalDust, 0);
  ct.expressPermits = cleanNonNeg(ct.expressPermits, 0);
  ct.ledgerRank = Math.min(CARAVAN_MAX_LEDGER_RANK, cleanNonNeg(ct.ledgerRank, 0));
  ct.totalRunsCompleted = cleanNonNeg(ct.totalRunsCompleted, 0);
  ct.totalContractsFulfilled = cleanNonNeg(ct.totalContractsFulfilled, 0);

  if (!ct.wagons || typeof ct.wagons !== "object") {
    ct.wagons = {};
  }
  for (const key of Object.keys(ct.wagons)) {
    const slotNum = Number(key) as CaravanWagonSlot;
    if (!VALID_WAGON_SLOTS.includes(slotNum)) {
      delete (ct.wagons as Record<string, unknown>)[key];
      continue;
    }
    const w = ct.wagons[slotNum];
    if (!w || typeof w !== "object" || !VALID_CARAVAN_ROUTES.has(w.routeId)) {
      delete ct.wagons[slotNum];
      continue;
    }
    const cleanCargo: Record<string, number> = {};
    if (w.cargo && typeof w.cargo === "object") {
      for (const [iid, qty] of Object.entries(w.cargo)) {
        const q = cleanNonNeg(qty, 0);
        if (iid && iid !== "gold" && q > 0) cleanCargo[iid] = q;
      }
    }
    if (Object.keys(cleanCargo).length === 0) {
      delete ct.wagons[slotNum];
      continue;
    }
    const startedAt = cleanNonNeg(w.startedAt, now.getTime());
    const completesAt = Math.max(startedAt, cleanNonNeg(w.completesAt, startedAt));
    const mult =
      typeof w.scarcityMultiplier === "number" && Number.isFinite(w.scarcityMultiplier)
        ? Math.min(1.85, Math.max(1.0, Math.round(w.scarcityMultiplier * 100) / 100))
        : 1.15;
    const er = w.expectedReward || ({} as CaravanRewardSummary);
    ct.wagons[slotNum] = {
      slot: slotNum,
      routeId: w.routeId,
      cargo: cleanCargo,
      startedAt,
      completesAt,
      scarcityMultiplier: mult,
      usedExpressPermit: Boolean(w.usedExpressPermit),
      expectedReward: {
        gold: Math.max(1, cleanNonNeg(er.gold, 50)),
        astralCrystalDust: Math.max(1, cleanNonNeg(er.astralCrystalDust, 4)),
        forgingEmblems: cleanNonNeg(er.forgingEmblems, 0),
        caravanRep: Math.max(1, cleanNonNeg(er.caravanRep, 15)),
      },
    };
  }

  const today = todayLocal(now);
  if (
    !ct.contractsBoard ||
    typeof ct.contractsBoard !== "object" ||
    ct.contractsBoard.date !== today ||
    !Array.isArray(ct.contractsBoard.contracts) ||
    ct.contractsBoard.contracts.length !== 4
  ) {
    const seedKey = buildWorkshopContractSeedKey(today, 0);
    ct.contractsBoard = {
      date: today,
      rerollsUsed: 0,
      seedKey,
      contracts: generateWorkshopContractsForSeed(seedKey),
    };
  } else {
    ct.contractsBoard.rerollsUsed = Math.min(
      CARAVAN_CONTRACT_MAX_REROLLS,
      cleanNonNeg(ct.contractsBoard.rerollsUsed, 0)
    );
  }

  if (
    !ct.dailyDustExchanges ||
    typeof ct.dailyDustExchanges !== "object" ||
    ct.dailyDustExchanges.date !== today
  ) {
    ct.dailyDustExchanges = { date: today, counts: {} };
  } else {
    const cleanCounts: Record<string, number> = {};
    for (const [oid, c] of Object.entries(ct.dailyDustExchanges.counts || {})) {
      const cc = cleanNonNeg(c, 0);
      if (cc > 0) cleanCounts[oid] = cc;
    }
    ct.dailyDustExchanges.counts = cleanCounts;
  }

  return ct;
}

export interface CaravanDispatchPreview {
  ok: boolean;
  reason?: string;
  routeId: CaravanRouteId;
  shiftKey: string;
  totalUnits: number;
  maxCapacity: number;
  baseCargoValue: number;
  effectiveCargoValue: number;
  favoredUnits: number;
  scarcityMultiplier: number;
  hotMultiplier: number;
  durationMs: number;
  expectedReward: CaravanRewardSummary;
  itemBreakdown: Array<{
    itemId: string;
    name: string;
    qty: number;
    unitValue: number;
    appliedMultiplier: number;
    isFavored: boolean;
    isHot: boolean;
    subtotalScore: number;
  }>;
}

/** 纯函数预览装车方案的紧缺溢价、耗时与预期奖励（前后端共用对称公式） */
export function previewCaravanDispatch(
  player: Pick<EnhancedPlayerState, "inventory" | "equipment" | "caravanTrade">,
  contentPack: EnhancedContentPack | undefined,
  routeId: string,
  cargo: Record<string, number>,
  nowOrShiftKey: Date | string = new Date()
): CaravanDispatchPreview {
  const route = CARAVAN_TRADE_ROUTES.find((r) => r.id === routeId) || CARAVAN_TRADE_ROUTES[0];
  const bonuses = getCaravanTradeBonuses(player);
  const scarcity = getCaravanRouteScarcity(route.id, nowOrShiftKey);
  const durationMs = Math.max(
    60 * 1000,
    Math.round(route.baseDurationMs * (1 - bonuses.durationReductionPct / 100))
  );

  const emptyPreview = (reason: string): CaravanDispatchPreview => ({
    ok: false,
    reason,
    routeId: route.id,
    shiftKey: scarcity.shiftKey,
    totalUnits: 0,
    maxCapacity: bonuses.maxCargoCapacity,
    baseCargoValue: 0,
    effectiveCargoValue: 0,
    favoredUnits: 0,
    scarcityMultiplier: scarcity.scarcityMultiplier,
    hotMultiplier: scarcity.hotMultiplier,
    durationMs,
    expectedReward: { gold: 0, astralCrystalDust: 0, forgingEmblems: 0, caravanRep: 0 },
    itemBreakdown: [],
  });

  if (!VALID_CARAVAN_ROUTES.has(routeId)) {
    return emptyPreview("未知的远征贸易航路");
  }
  if (!cargo || typeof cargo !== "object") {
    return emptyPreview("请至少装载一种贸易货品");
  }

  const itemsMap = new Map<string, { id: string; name?: string; value?: number; type?: string; toolFor?: string }>(
    (((contentPack?.items as Array<any> | undefined) || [])).map((it) => [it.id, it])
  );

  const entries = Object.entries(cargo).filter(([, q]) => Number(q) > 0);
  if (entries.length === 0) {
    return emptyPreview("请至少装载一种贸易货品");
  }
  if (entries.length > CARAVAN_MAX_CARGO_TYPES) {
    return emptyPreview(`单辆商车最多混装 ${CARAVAN_MAX_CARGO_TYPES} 种货品`);
  }

  let totalUnits = 0;
  let baseCargoValue = 0;
  let rawEffectiveScore = 0;
  let favoredUnits = 0;
  const itemBreakdown: CaravanDispatchPreview["itemBreakdown"] = [];

  for (const [iid, rawQty] of entries) {
    if (!iid || iid === "gold") {
      return emptyPreview("金币不可作为货品装车");
    }
    const qty = Math.floor(Number(rawQty));
    if (!Number.isFinite(qty) || qty <= 0) {
      return emptyPreview("装车货品数量必须为正整数");
    }
    const itemDef = itemsMap.get(iid);
    if (contentPack?.items && !itemDef) {
      return emptyPreview(`未知的货品：${iid}`);
    }
    const idleHave = getIdleCargoCount(player, iid);
    if (qty > idleHave) {
      const nm = itemDef?.name || iid;
      return emptyPreview(`闲置「${nm}」不足（可装车 ${idleHave} 件，穿戴中装备已自动保护）`);
    }

    const unitValue = Math.max(4, Math.floor(Number(itemDef?.value || 8)));
    const cat = classifyCaravanCargoCategory(iid, itemDef);
    const isHot = scarcity.hotItemIds.includes(iid);
    const isFavored = isHot || cat === route.favoredCategory;
    const appliedMultiplier = isHot
      ? scarcity.hotMultiplier
      : isFavored
        ? scarcity.scarcityMultiplier
        : 1.0;

    const baseSub = unitValue * qty;
    const subtotalScore = Math.round(baseSub * appliedMultiplier * 100) / 100;
    totalUnits += qty;
    baseCargoValue += baseSub;
    rawEffectiveScore += subtotalScore;
    if (isFavored) favoredUnits += qty;

    itemBreakdown.push({
      itemId: iid,
      name: itemDef?.name || iid,
      qty,
      unitValue,
      appliedMultiplier,
      isFavored,
      isHot,
      subtotalScore,
    });
  }

  if (totalUnits > bonuses.maxCargoCapacity) {
    return emptyPreview(`超出商车最大载重（当前 ${totalUnits} / 上限 ${bonuses.maxCargoCapacity} 件）`);
  }
  if (baseCargoValue < CARAVAN_MIN_CARGO_VALUE) {
    return emptyPreview(`装车货品基础总值需满 ${CARAVAN_MIN_CARGO_VALUE} 金（当前 ${baseCargoValue} 金）`);
  }

  const ledgerMult = 1 + bonuses.tradeYieldPct / 100;
  const effectiveCargoValue = Math.round(rawEffectiveScore * ledgerMult);
  const favoredRatio = totalUnits > 0 ? favoredUnits / totalUnits : 0;

  const gold = Math.max(60, Math.round(effectiveCargoValue * route.goldReturnRatio));
  const astralCrystalDust = Math.max(
    route.baseDust,
    route.baseDust + Math.floor(effectiveCargoValue / route.dustDivisor)
  );
  const baseEmblems = Math.floor(effectiveCargoValue / route.emblemThreshold);
  const favoredBonusEmblem = favoredRatio >= 0.5 && effectiveCargoValue >= Math.round(route.emblemThreshold * 0.55) ? 1 : 0;
  const forgingEmblems = Math.min(4, baseEmblems + favoredBonusEmblem);
  const caravanRep = Math.max(
    route.baseRep,
    route.baseRep + Math.floor(effectiveCargoValue / 45)
  );

  return {
    ok: true,
    routeId: route.id,
    shiftKey: scarcity.shiftKey,
    totalUnits,
    maxCapacity: bonuses.maxCargoCapacity,
    baseCargoValue,
    effectiveCargoValue,
    favoredUnits,
    scarcityMultiplier: scarcity.scarcityMultiplier,
    hotMultiplier: scarcity.hotMultiplier,
    durationMs,
    expectedReward: {
      gold,
      astralCrystalDust,
      forgingEmblems,
      caravanRep,
    },
    itemBreakdown,
  };
}

/** 派遣远征商车出发（支持消耗商队加急通行证立即抵达待领奖） */
export function dispatchCaravanWagon(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack | undefined,
  params: {
    wagonSlot: number;
    routeId: string;
    cargo: Record<string, number>;
    useExpressPermit?: boolean;
  },
  now: Date = new Date()
): {
  ok: boolean;
  reason?: string;
  wagon?: CaravanWagonRun;
} {
  ensurePlayerExtensions(player);
  const ct = ensureCaravanTrade(player, now);
  const bonuses = getCaravanTradeBonuses(player);
  const slot = Math.floor(Number(params.wagonSlot)) as CaravanWagonSlot;
  if (!VALID_WAGON_SLOTS.includes(slot)) {
    return { ok: false, reason: "无效的商车栏位" };
  }
  if (slot >= bonuses.maxWagons) {
    return {
      ok: false,
      reason: `第 ${slot + 1} 号商车尚未解锁（提升商队声望至 Lv.${slot === 1 ? 3 : 5} 解锁）`,
    };
  }
  if (ct.wagons[slot]) {
    return { ok: false, reason: `第 ${slot + 1} 号商车正在执行航程或待领取收益` };
  }
  if (params.useExpressPermit && ct.expressPermits <= 0) {
    return { ok: false, reason: "商队加急通行证不足，无法立即加急发车" };
  }

  const preview = previewCaravanDispatch(player, contentPack, params.routeId, params.cargo, now);
  if (!preview.ok) {
    return { ok: false, reason: preview.reason || "装车校验未通过" };
  }

  const cleanCargo: Record<string, number> = {};
  for (const row of preview.itemBreakdown) {
    cleanCargo[row.itemId] = row.qty;
    player.inventory[row.itemId] = Math.max(0, Number(player.inventory[row.itemId] || 0) - row.qty);
    if (player.inventory[row.itemId] <= 0) delete player.inventory[row.itemId];
  }

  const startedAt = now.getTime();
  let usedExpress = false;
  let completesAt = startedAt + preview.durationMs;
  if (params.useExpressPermit) {
    ct.expressPermits -= 1;
    usedExpress = true;
    completesAt = startedAt;
  }

  const route = CARAVAN_TRADE_ROUTES.find((r) => r.id === preview.routeId)!;
  const wagon: CaravanWagonRun = {
    slot,
    routeId: preview.routeId,
    cargo: cleanCargo,
    startedAt,
    completesAt,
    scarcityMultiplier: preview.scarcityMultiplier,
    usedExpressPermit: usedExpress,
    expectedReward: preview.expectedReward,
  };
  ct.wagons[slot] = wagon;

  appendLog(
    player,
    `第 ${slot + 1} 号远征商车已启程前往「${route.name}」（紧缺系数 ${preview.scarcityMultiplier.toFixed(2)}x${usedExpress ? " · 加急通行证即刻抵达" : ""}）！`
  );
  return { ok: true, wagon };
}

/** 对在途商车使用 1 张商队加急通行证，立即完成航程进入可领奖状态 */
export function expediteCaravanWagon(
  player: EnhancedPlayerState,
  wagonSlot: number,
  now: Date = new Date()
): { ok: boolean; reason?: string; wagon?: CaravanWagonRun } {
  ensurePlayerExtensions(player);
  const ct = ensureCaravanTrade(player, now);
  const slot = Math.floor(Number(wagonSlot)) as CaravanWagonSlot;
  if (!VALID_WAGON_SLOTS.includes(slot)) {
    return { ok: false, reason: "无效的商车栏位" };
  }
  const wagon = ct.wagons[slot];
  if (!wagon) {
    return { ok: false, reason: "该商车栏位当前没有在途商队" };
  }
  if (now.getTime() >= wagon.completesAt) {
    return { ok: false, reason: "该商车已抵达终点，请直接领取收益" };
  }
  if (ct.expressPermits <= 0) {
    return { ok: false, reason: "商队加急通行证不足" };
  }

  ct.expressPermits -= 1;
  wagon.completesAt = now.getTime();
  wagon.usedExpressPermit = true;
  appendLog(player, `使用商队加急通行证：第 ${slot + 1} 号远征商车已即刻返航抵达！`);
  return { ok: true, wagon };
}

/** 领取已返航商车的跨城镇贸易结算（异域星晶尘 + 稀有锻造徽记 + 金币 + 商队声望） */
export function claimCaravanWagon(
  player: EnhancedPlayerState,
  wagonSlot: number,
  now: Date = new Date()
): {
  ok: boolean;
  reason?: string;
  reward?: CaravanRewardSummary;
  leveledUpTo?: number;
} {
  ensurePlayerExtensions(player);
  const ct = ensureCaravanTrade(player, now);
  const gh = ensureGuildHonor(player);
  const slot = Math.floor(Number(wagonSlot)) as CaravanWagonSlot;
  if (!VALID_WAGON_SLOTS.includes(slot)) {
    return { ok: false, reason: "无效的商车栏位" };
  }
  const wagon = ct.wagons[slot];
  if (!wagon) {
    return { ok: false, reason: "该栏位没有待结算的远征商车" };
  }
  if (now.getTime() < wagon.completesAt) {
    const remainSec = Math.ceil((wagon.completesAt - now.getTime()) / 1000);
    return { ok: false, reason: `商车尚在途中（剩余 ${remainSec} 秒，可使用加急通行证立即返航）` };
  }

  const prevLevel = getCaravanRepTier(ct.caravanRep).current.level;
  const alchemyRewardPct =
    getAlchemyCauldronBonuses(player).caravanBountyRewardPct +
    getAstralRelicsBonuses(player).caravanBountyRewardPct;
  const rewardMult = 1 + alchemyRewardPct / 100;
  const reward: CaravanRewardSummary = {
    gold: Math.round(wagon.expectedReward.gold * rewardMult),
    astralCrystalDust: Math.round(wagon.expectedReward.astralCrystalDust * rewardMult),
    forgingEmblems: wagon.expectedReward.forgingEmblems,
    caravanRep: Math.round(wagon.expectedReward.caravanRep * rewardMult),
  };
  delete ct.wagons[slot];

  player.inventory.gold = Number(player.inventory.gold || 0) + reward.gold;
  if (player.stats) player.stats.totalGoldEarned = (player.stats.totalGoldEarned || 0) + reward.gold;
  ct.astralCrystalDust += reward.astralCrystalDust;
  if (reward.forgingEmblems > 0) {
    gh.forgingEmblems += reward.forgingEmblems;
  }
  ct.caravanRep += reward.caravanRep;
  ct.totalRunsCompleted += 1;
  addReputation(player, Math.max(5, Math.floor(reward.caravanRep / 3)));
  syncAchievements(player);

  const newLevel = getCaravanRepTier(ct.caravanRep).current.level;
  const route = CARAVAN_TRADE_ROUTES.find((r) => r.id === wagon.routeId);
  const emblemStr = reward.forgingEmblems > 0 ? `、稀有锻造徽记 +${reward.forgingEmblems}` : "";
  appendLog(
    player,
    `远征商车自「${route?.name || wagon.routeId}」满载归来：金币 +${reward.gold}、异域星晶尘 +${reward.astralCrystalDust}${emblemStr}、商队声望 +${reward.caravanRep}！`
  );
  if (newLevel > prevLevel) {
    const tierDef = getCaravanRepTier(ct.caravanRep).current;
    appendLog(
      player,
      `商队声望晋升至 Lv.${newLevel}「${tierDef.title}」！商车编制上限 ${tierDef.maxWagons} 辆，永久采集/制作/金币加成同步提升！`
    );
  }

  return {
    ok: true,
    reward,
    ...(newLevel > prevLevel ? { leveledUpTo: newLevel } : {}),
  };
}

/** 交付「工坊特批契约柜台」订单（校验闲置物资，保护已穿戴装备） */
export function fulfillWorkshopContract(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack | undefined,
  contractId: string,
  now: Date = new Date()
): {
  ok: boolean;
  reason?: string;
  contract?: WorkshopSupplyContractInstance;
} {
  ensurePlayerExtensions(player);
  const ct = ensureCaravanTrade(player, now);
  const gh = ensureGuildHonor(player);
  const board = ct.contractsBoard!;
  const contract = board.contracts.find((c) => c.id === contractId);
  if (!contract) {
    return { ok: false, reason: "未找到指定的工坊特批契约" };
  }
  if (contract.fulfilled) {
    return { ok: false, reason: "该工坊特批契约已交付完成" };
  }

  const itemsById = new Map<string, string>(
    (((contentPack?.items as Array<{ id: string; name?: string }> | undefined) || [])).map((it) => [
      it.id,
      it.name || it.id,
    ])
  );

  for (const [iid, needQty] of Object.entries(contract.demands)) {
    const idleHave = getIdleCargoCount(player, iid);
    if (idleHave < needQty) {
      const nm = itemsById.get(iid) || iid;
      return { ok: false, reason: `闲置「${nm}」不足（需 ${needQty} 件，当前可交付 ${idleHave} 件）` };
    }
  }

  for (const [iid, needQty] of Object.entries(contract.demands)) {
    player.inventory[iid] = Math.max(0, Number(player.inventory[iid] || 0) - needQty);
    if (player.inventory[iid] <= 0) delete player.inventory[iid];
  }

  contract.fulfilled = true;
  ct.totalContractsFulfilled += 1;
  const rw = contract.reward;
  const alchemyRewardPct =
    getAlchemyCauldronBonuses(player).caravanBountyRewardPct +
    getAstralRelicsBonuses(player).caravanBountyRewardPct;
  const rewardMult = 1 + alchemyRewardPct / 100;
  const settledGold = Math.round(rw.gold * rewardMult);
  const settledDust = Math.round(rw.astralCrystalDust * rewardMult);
  const settledRep = Math.round(rw.caravanRep * rewardMult);
  player.inventory.gold = Number(player.inventory.gold || 0) + settledGold;
  if (player.stats) player.stats.totalGoldEarned = (player.stats.totalGoldEarned || 0) + settledGold;
  ct.astralCrystalDust += settledDust;
  gh.forgingEmblems += rw.forgingEmblems;
  gh.honorPoints += rw.honorPoints;
  gh.totalHonorEarned += rw.honorPoints;
  ct.expressPermits += rw.expressPermits;
  ct.caravanRep += settledRep;
  addReputation(player, Math.max(5, Math.floor(settledRep / 3)));
  syncAchievements(player);

  appendLog(
    player,
    `交付工坊特批契约「${contract.name}」：异域星晶尘 +${settledDust}、锻造徽记 +${rw.forgingEmblems}、公会荣誉 +${rw.honorPoints}${rw.expressPermits > 0 ? `、加急通行证 +${rw.expressPermits}` : ""}！`
  );
  return { ok: true, contract };
}

/** 刷新「工坊特批契约柜台」4 份轮换订单 */
export function rerollWorkshopContracts(
  player: EnhancedPlayerState,
  now: Date = new Date()
): {
  ok: boolean;
  reason?: string;
  cost?: number;
  rerollsRemaining?: number;
} {
  ensurePlayerExtensions(player);
  const ct = ensureCaravanTrade(player, now);
  const board = ct.contractsBoard!;
  if (board.rerollsUsed >= CARAVAN_CONTRACT_MAX_REROLLS) {
    return { ok: false, reason: `今日工坊契约柜台刷新次数已达上限（${CARAVAN_CONTRACT_MAX_REROLLS} 次）` };
  }
  const goldNow = Number(player.inventory.gold || 0);
  if (goldNow < CARAVAN_CONTRACT_REROLL_COST) {
    return { ok: false, reason: `金币不足（刷新需 ${CARAVAN_CONTRACT_REROLL_COST} 金币）` };
  }

  player.inventory.gold = goldNow - CARAVAN_CONTRACT_REROLL_COST;
  if (player.stats) player.stats.totalGoldSpent = (player.stats.totalGoldSpent || 0) + CARAVAN_CONTRACT_REROLL_COST;
  board.rerollsUsed += 1;
  const nextSeed = buildWorkshopContractSeedKey(board.date, board.rerollsUsed);
  board.seedKey = nextSeed;
  board.contracts = generateWorkshopContractsForSeed(nextSeed);
  appendLog(player, `已调阅新一轮工坊特批契约柜台订单（消耗 ${CARAVAN_CONTRACT_REROLL_COST} 金币）`);
  return {
    ok: true,
    cost: CARAVAN_CONTRACT_REROLL_COST,
    rerollsRemaining: Math.max(0, CARAVAN_CONTRACT_MAX_REROLLS - board.rerollsUsed),
  };
}

/** 异域星晶尘兑换所：升级永久「远征宗师商典」或兑换锻造徽记 / 晶簇补给 / 加急通行证 */
export function redeemAstralDustExchange(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack | undefined,
  offerId: string,
  now: Date = new Date()
): {
  ok: boolean;
  reason?: string;
  offerId?: string;
  dustSpent?: number;
  newLedgerRank?: number;
} {
  ensurePlayerExtensions(player);
  const ct = ensureCaravanTrade(player, now);
  const gh = ensureGuildHonor(player);

  if (offerId === "ledger_upgrade") {
    if (ct.ledgerRank >= CARAVAN_MAX_LEDGER_RANK) {
      return { ok: false, reason: "远征宗师商典已升至最高等阶" };
    }
    const cost = CARAVAN_LEDGER_COSTS[ct.ledgerRank];
    if (ct.astralCrystalDust < cost) {
      return { ok: false, reason: `异域星晶尘不足（升阶需 ${cost} 晶尘，当前 ${ct.astralCrystalDust}）` };
    }
    ct.astralCrystalDust -= cost;
    ct.ledgerRank += 1;
    appendLog(
      player,
      `远征宗师商典升至第 ${ct.ledgerRank} 阶！永久提升商队货值结算、缩短航程耗时并增强采集/制作/金币收益！`
    );
    return {
      ok: true,
      offerId,
      dustSpent: cost,
      newLedgerRank: ct.ledgerRank,
    };
  }

  const offer = ASTRAL_DUST_EXCHANGE_OFFERS.find((o) => o.id === offerId);
  if (!offer) {
    return { ok: false, reason: "未知的星晶尘兑换条目" };
  }
  const usedToday = ct.dailyDustExchanges?.counts[offer.id] || 0;
  if (offer.dailyLimit !== undefined && usedToday >= offer.dailyLimit) {
    return { ok: false, reason: `「${offer.name}」今日兑换次数已达上限（${offer.dailyLimit} 次）` };
  }
  if (ct.astralCrystalDust < offer.dustCost) {
    return { ok: false, reason: `异域星晶尘不足（需 ${offer.dustCost} 晶尘，当前 ${ct.astralCrystalDust}）` };
  }

  ct.astralCrystalDust -= offer.dustCost;
  ct.dailyDustExchanges!.counts[offer.id] = usedToday + 1;

  if (offer.emblemsOut) {
    gh.forgingEmblems += offer.emblemsOut;
  }
  if (offer.expressPermitsOut) {
    ct.expressPermits += offer.expressPermitsOut;
  }
  if (offer.itemsOut) {
    for (const [iid, qty] of Object.entries(offer.itemsOut)) {
      if (qty > 0) {
        player.inventory[iid] = Number(player.inventory[iid] || 0) + qty;
        recordCodexItemUnlock(player, iid);
      }
    }
  }
  syncHeritageCodex(player);
  const itemsById = new Map<string, string>(
    (((contentPack?.items as Array<{ id: string; name?: string }> | undefined) || [])).map((it) => [
      it.id,
      it.name || it.id,
    ])
  );
  const detailParts: string[] = [];
  if (offer.emblemsOut) detailParts.push(`稀有锻造徽记 ×${offer.emblemsOut}`);
  if (offer.expressPermitsOut) detailParts.push(`商队加急通行证 ×${offer.expressPermitsOut}`);
  if (offer.itemsOut) {
    for (const [iid, q] of Object.entries(offer.itemsOut)) {
      detailParts.push(`${itemsById.get(iid) || iid} ×${q}`);
    }
  }
  appendLog(player, `在星晶尘兑换所换取「${offer.name}」：获得 ${detailParts.join("、")}！`);
  return {
    ok: true,
    offerId: offer.id,
    dustSpent: offer.dustCost,
  };
}

/** 构造前端「远征商队贸易航路与工坊特批契约柜台」面板完整视图数据 */
export function getCaravanTradeInfo(
  player: EnhancedPlayerState,
  contentPack?: EnhancedContentPack,
  now: Date = new Date()
) {
  ensurePlayerExtensions(player);
  const ct = ensureCaravanTrade(player, now);
  const gh = ensureGuildHonor(player);
  const bonuses = getCaravanTradeBonuses(player);
  const repTierInfo = getCaravanRepTier(ct.caravanRep);
  const shiftKey = buildCaravanScarcityShiftKey(now);

  const itemsList = ((contentPack?.items as Array<{
    id: string;
    name?: string;
    value?: number;
    tier?: number;
    type?: string;
    toolFor?: string;
  }> | undefined) || []);
  const itemsMap = new Map(itemsList.map((it) => [it.id, it]));

  const routes = CARAVAN_TRADE_ROUTES.map((r) => {
    const sc = getCaravanRouteScarcity(r.id, shiftKey);
    const effectiveDurationMs = Math.max(
      60 * 1000,
      Math.round(r.baseDurationMs * (1 - bonuses.durationReductionPct / 100))
    );
    return {
      ...r,
      effectiveDurationMs,
      scarcityMultiplier: sc.scarcityMultiplier,
      hotMultiplier: sc.hotMultiplier,
      hotItems: sc.hotItemIds.map((iid) => ({
        itemId: iid,
        name: itemsMap.get(iid)?.name || iid,
        idleHave: getIdleCargoCount(player, iid),
      })),
    };
  });

  const wagonSlots = VALID_WAGON_SLOTS.map((slot) => {
    const unlocked = slot < bonuses.maxWagons;
    const requiredRepLevel = slot === 0 ? 1 : slot === 1 ? 3 : 5;
    const run = ct.wagons[slot] || null;
    if (!run) {
      return {
        slot,
        unlocked,
        requiredRepLevel,
        status: unlocked ? ("idle" as const) : ("locked" as const),
        run: null,
      };
    }
    const ready = now.getTime() >= run.completesAt;
    const routeDef = CARAVAN_TRADE_ROUTES.find((r) => r.id === run.routeId);
    return {
      slot,
      unlocked,
      requiredRepLevel,
      status: ready ? ("ready" as const) : ("in_transit" as const),
      run: {
        ...run,
        routeName: routeDef?.name || run.routeId,
        routeIconId: routeDef?.iconId || "caravan_hub_banner",
        remainingMs: Math.max(0, run.completesAt - now.getTime()),
        cargoItems: Object.entries(run.cargo).map(([iid, qty]) => ({
          itemId: iid,
          name: itemsMap.get(iid)?.name || iid,
          qty,
        })),
      },
    };
  });

  const idleCargoCatalog = Object.keys(player.inventory || {})
    .filter((iid) => iid !== "gold")
    .map((iid) => {
      const idleQty = getIdleCargoCount(player, iid);
      if (idleQty <= 0) return null;
      const def = itemsMap.get(iid);
      const unitValue = Math.max(4, Math.floor(Number(def?.value || 8)));
      const category = classifyCaravanCargoCategory(iid, def);
      return {
        itemId: iid,
        name: def?.name || iid,
        idleQty,
        unitValue,
        tier: Number(def?.tier || 1),
        category,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.unitValue - a.unitValue || a.itemId.localeCompare(b.itemId));

  const board = ct.contractsBoard!;
  const contracts = board.contracts.map((c) => {
    const demandList = Object.entries(c.demands).map(([iid, need]) => ({
      itemId: iid,
      name: itemsMap.get(iid)?.name || iid,
      need,
      have: getIdleCargoCount(player, iid),
    }));
    const canFulfill = !c.fulfilled && demandList.every((d) => d.have >= d.need);
    return {
      ...c,
      demandList,
      canFulfill,
    };
  });

  const ledgerUpgrade = {
    rank: ct.ledgerRank,
    maxRank: CARAVAN_MAX_LEDGER_RANK,
    isMax: ct.ledgerRank >= CARAVAN_MAX_LEDGER_RANK,
    nextDustCost: ct.ledgerRank < CARAVAN_MAX_LEDGER_RANK ? CARAVAN_LEDGER_COSTS[ct.ledgerRank] : null,
    canAfford:
      ct.ledgerRank < CARAVAN_MAX_LEDGER_RANK &&
      ct.astralCrystalDust >= CARAVAN_LEDGER_COSTS[ct.ledgerRank],
  };

  const dustOffers = ASTRAL_DUST_EXCHANGE_OFFERS.map((o) => {
    const usedToday = ct.dailyDustExchanges?.counts[o.id] || 0;
    const remainingToday = o.dailyLimit !== undefined ? Math.max(0, o.dailyLimit - usedToday) : null;
    const canAfford =
      ct.astralCrystalDust >= o.dustCost && (remainingToday === null || remainingToday > 0);
    return {
      ...o,
      usedToday,
      remainingToday,
      canAfford,
      itemList: Object.entries(o.itemsOut || {}).map(([iid, qty]) => ({
        itemId: iid,
        name: itemsMap.get(iid)?.name || iid,
        qty,
      })),
    };
  });

  return {
    nowMs: now.getTime(),
    shiftKey,
    gold: Number(player.inventory.gold || 0),
    astralCrystalDust: ct.astralCrystalDust,
    forgingEmblems: gh.forgingEmblems,
    honorPoints: gh.honorPoints,
    expressPermits: ct.expressPermits,
    caravanRep: ct.caravanRep,
    totalRunsCompleted: ct.totalRunsCompleted,
    totalContractsFulfilled: ct.totalContractsFulfilled,
    reputationTier: {
      level: repTierInfo.current.level,
      title: repTierInfo.current.title,
      minRep: repTierInfo.current.minRep,
      nextLevelRep: repTierInfo.next?.minRep ?? null,
      nextTitle: repTierInfo.next?.title ?? null,
      progressPct: repTierInfo.progressPct,
      allTiers: CARAVAN_REP_TIERS,
    },
    bonuses,
    routes,
    wagonSlots,
    idleCargoCatalog,
    contractsBoard: {
      date: board.date,
      rerollsUsed: board.rerollsUsed,
      rerollsRemaining: Math.max(0, CARAVAN_CONTRACT_MAX_REROLLS - board.rerollsUsed),
      rerollCost: CARAVAN_CONTRACT_REROLL_COST,
      contracts,
    },
    exchange: {
      ledgerUpgrade,
      offers: dustOffers,
    },
  };
}

/* ============================ 奇美拉炼金魔药釜 & 深渊试炼双共鸣药剂槽 (WL-8) ============================ */

export const ALCHEMICAL_POTION_IDS: readonly AlchemicalPotionId[] = [
  "dragon_fury",
  "elven_bounty",
  "dwarven_temper",
  "astral_fortune",
];

export const ALCHEMY_MAX_RECIPE_RANK = 5;
export const ALCHEMY_MAX_CHARGES = 120;
export const ALCHEMY_DAILY_FREE_EXTRACTIONS = 2;
export const ALCHEMY_ESSENCE_PER_EXTRACTION = 2;
export const ALCHEMY_EXTRACTION_POINTS = 6;

export const ALCHEMY_BREW_ESSENCE_COST = 1;
export const ALCHEMY_BREW_ESSENCE_CHARGES = 6;
export const ALCHEMY_BREW_ESSENCE_POINTS = 10;

export const ALCHEMY_BREW_MATERIAL_CHARGES = 6;
export const ALCHEMY_BREW_MATERIAL_POINTS = 12;

export const ALCHEMY_BREW_ASTRAL_DUST_COST = 4;
export const ALCHEMY_BREW_ASTRAL_DUST_CHARGES = 12;
export const ALCHEMY_BREW_ASTRAL_DUST_POINTS = 22;

export interface CauldronMasteryTierDef {
  level: number;
  minPoints: number;
  title: string;
  combatAtkPct: number;
  gatherSpeedPct: number;
  craftSpeedPct: number;
  goldGainPct: number;
  potionBuffPct: number;
  batchBonusCharges: number;
}

export const CAULDRON_MASTERY_TIERS: readonly CauldronMasteryTierDef[] = [
  {
    level: 1,
    minPoints: 0,
    title: "初火学徒",
    combatAtkPct: 0,
    gatherSpeedPct: 0,
    craftSpeedPct: 0,
    goldGainPct: 0,
    potionBuffPct: 0,
    batchBonusCharges: 0,
  },
  {
    level: 2,
    minPoints: 30,
    title: "萃灵药师",
    combatAtkPct: 2,
    gatherSpeedPct: 3,
    craftSpeedPct: 3,
    goldGainPct: 3,
    potionBuffPct: 4,
    batchBonusCharges: 1,
  },
  {
    level: 3,
    minPoints: 90,
    title: "奇美拉司炉",
    combatAtkPct: 4,
    gatherSpeedPct: 6,
    craftSpeedPct: 6,
    goldGainPct: 6,
    potionBuffPct: 8,
    batchBonusCharges: 1,
  },
  {
    level: 4,
    minPoints: 200,
    title: "秘釜炼金导师",
    combatAtkPct: 7,
    gatherSpeedPct: 10,
    craftSpeedPct: 10,
    goldGainPct: 10,
    potionBuffPct: 12,
    batchBonusCharges: 2,
  },
  {
    level: 5,
    minPoints: 380,
    title: "深渊魔药大宗师",
    combatAtkPct: 10,
    gatherSpeedPct: 14,
    craftSpeedPct: 14,
    goldGainPct: 15,
    potionBuffPct: 16,
    batchBonusCharges: 3,
  },
  {
    level: 6,
    minPoints: 620,
    title: "奇美拉圣釜贤者",
    combatAtkPct: 14,
    gatherSpeedPct: 19,
    craftSpeedPct: 19,
    goldGainPct: 20,
    potionBuffPct: 22,
    batchBonusCharges: 4,
  },
];

export interface AlchemicalPotionLevelStats {
  combatAtkPct?: number;
  bossArmorBreakPct?: number;
  gatherDoubleChance?: number;
  gatherSpeedPct?: number;
  craftSpeedPct?: number;
  craftEfficiencyPct?: number;
  goldGainPct?: number;
  caravanBountyRewardPct?: number;
}

export interface AlchemicalPotionDef {
  id: AlchemicalPotionId;
  name: string;
  subtitle: string;
  description: string;
  iconId: string;
  maxRank: number;
  materialBrewCost: {
    gold: number;
    items: Record<string, number>;
  };
  levels: readonly [
    AlchemicalPotionLevelStats,
    AlchemicalPotionLevelStats,
    AlchemicalPotionLevelStats,
    AlchemicalPotionLevelStats,
    AlchemicalPotionLevelStats,
  ];
}

export const ALCHEMICAL_POTIONS: readonly AlchemicalPotionDef[] = [
  {
    id: "dragon_fury",
    name: "巨龙狂怒药剂",
    subtitle: "战斗攻击增幅 · 首领护甲破防",
    description: "融汇赤鳞火晶与矿脉精粹的狂怒秘药，大幅强化战斗攻击百分比并撕裂深渊首领护甲。",
    iconId: "potion_dragon_fury",
    maxRank: 5,
    materialBrewCost: {
      gold: 120,
      items: { ore_1: 4, crystal_1: 2 },
    },
    levels: [
      { combatAtkPct: 6, bossArmorBreakPct: 0.08 },
      { combatAtkPct: 9, bossArmorBreakPct: 0.12 },
      { combatAtkPct: 12, bossArmorBreakPct: 0.16 },
      { combatAtkPct: 16, bossArmorBreakPct: 0.21 },
      { combatAtkPct: 20, bossArmorBreakPct: 0.26 },
    ],
  },
  {
    id: "elven_bounty",
    name: "精灵丰饶灵液",
    subtitle: "双倍采集暴击 · 采集极速丰收",
    description: "凝结晨露森林生机的翠绿灵液，显著提升全采集动作速度并赋予高额双倍产出暴击率。",
    iconId: "potion_elven_bounty",
    maxRank: 5,
    materialBrewCost: {
      gold: 120,
      items: { wood_1: 6, fiber_1: 4 },
    },
    levels: [
      { gatherDoubleChance: 0.06, gatherSpeedPct: 8 },
      { gatherDoubleChance: 0.09, gatherSpeedPct: 12 },
      { gatherDoubleChance: 0.13, gatherSpeedPct: 16 },
      { gatherDoubleChance: 0.17, gatherSpeedPct: 21 },
      { gatherDoubleChance: 0.22, gatherSpeedPct: 27 },
    ],
  },
  {
    id: "dwarven_temper",
    name: "矮人巧匠淬火油",
    subtitle: "工坊制作加速 · 神匠连作暴击",
    description: "矮人炉火秘传的符文淬火金油，全面加快工坊制造节奏并提高神匠免费连作效率。",
    iconId: "potion_dwarven_temper",
    maxRank: 5,
    materialBrewCost: {
      gold: 120,
      items: { wood_1: 4, ore_1: 4 },
    },
    levels: [
      { craftSpeedPct: 8, craftEfficiencyPct: 6 },
      { craftSpeedPct: 12, craftEfficiencyPct: 10 },
      { craftSpeedPct: 16, craftEfficiencyPct: 14 },
      { craftSpeedPct: 21, craftEfficiencyPct: 19 },
      { craftSpeedPct: 27, craftEfficiencyPct: 25 },
    ],
  },
  {
    id: "astral_fortune",
    name: "星界幸运秘药",
    subtitle: "全局金币增幅 · 商队与委托加奖",
    description: "封存星轨流光的幸运星瓶，提升全局金币倍率并额外放大远征商队与公会委托结算收益。",
    iconId: "potion_astral_fortune",
    maxRank: 5,
    materialBrewCost: {
      gold: 140,
      items: { fiber_1: 4, crystal_1: 3 },
    },
    levels: [
      { goldGainPct: 8, caravanBountyRewardPct: 8 },
      { goldGainPct: 12, caravanBountyRewardPct: 12 },
      { goldGainPct: 17, caravanBountyRewardPct: 16 },
      { goldGainPct: 22, caravanBountyRewardPct: 21 },
      { goldGainPct: 28, caravanBountyRewardPct: 26 },
    ],
  },
];

export interface RecipeUpgradeCostTier {
  targetRank: 2 | 3 | 4 | 5;
  cauldronPoints: number;
  standard: {
    gold: number;
    alchemicalEssence: number;
    crystals: Record<string, number>;
  };
  astralDust: {
    gold: number;
    astralCrystalDust: number;
  };
}

export const ALCHEMY_RECIPE_UPGRADE_COSTS: readonly RecipeUpgradeCostTier[] = [
  {
    targetRank: 2,
    cauldronPoints: 35,
    standard: { gold: 400, alchemicalEssence: 2, crystals: { crystal_1: 3 } },
    astralDust: { gold: 250, astralCrystalDust: 8 },
  },
  {
    targetRank: 3,
    cauldronPoints: 55,
    standard: { gold: 1000, alchemicalEssence: 3, crystals: { crystal_1: 6, crystal_2: 2 } },
    astralDust: { gold: 600, astralCrystalDust: 16 },
  },
  {
    targetRank: 4,
    cauldronPoints: 80,
    standard: { gold: 2400, alchemicalEssence: 5, crystals: { crystal_2: 5, crystal_3: 2 } },
    astralDust: { gold: 1400, astralCrystalDust: 28 },
  },
  {
    targetRank: 5,
    cauldronPoints: 120,
    standard: { gold: 5200, alchemicalEssence: 8, crystals: { crystal_3: 5, crystal_4: 2 } },
    astralDust: { gold: 3000, astralCrystalDust: 45 },
  },
];

export interface TwinAlchemicalResonanceDef {
  id: string;
  pairKey: string;
  pair: [AlchemicalPotionId, AlchemicalPotionId];
  name: string;
  subtitle: string;
  description: string;
  baseBonuses: {
    bonusAtk?: number;
    bonusDef?: number;
    bonusHp?: number;
    combatAtkPct?: number;
    armorPenPct?: number;
    bossArmorBreakPct?: number;
    intervalReductionPct?: number;
    critRateBonusPct?: number;
    critDmgBonusPct?: number;
    gatherSpeedPct?: number;
    gatherDoubleChance?: number;
    craftSpeedPct?: number;
    craftEfficiencyPct?: number;
    goldGainPct?: number;
    rareFindPct?: number;
    caravanBountyRewardPct?: number;
  };
}

export const TWIN_ALCHEMICAL_RESONANCES: readonly TwinAlchemicalResonanceDef[] = [
  {
    id: "res_forge_dragonflame",
    pairKey: "dragon_fury+dwarven_temper",
    pair: ["dragon_fury", "dwarven_temper"],
    name: "熔炉龙炎共鸣",
    subtitle: "巨龙狂怒 × 矮人淬火 · 破甲锻炎",
    description: "龙炎贯注矮人神铁，同时强化战斗攻击、全目标破甲、首领破防与工坊锻造效率。",
    baseBonuses: {
      combatAtkPct: 6,
      armorPenPct: 0.08,
      bossArmorBreakPct: 0.08,
      craftSpeedPct: 8,
      craftEfficiencyPct: 6,
    },
  },
  {
    id: "res_starwood_bounty",
    pairKey: "astral_fortune+elven_bounty",
    pair: ["elven_bounty", "astral_fortune"],
    name: "星森丰饶共鸣",
    subtitle: "精灵丰饶 × 星界幸运 · 万物赐福",
    description: "星辉洒落古树灵泉，大幅提高双倍采集暴击、采集速度、全局金币、稀有寻宝与商队悬赏收益。",
    baseBonuses: {
      gatherDoubleChance: 0.07,
      gatherSpeedPct: 10,
      goldGainPct: 10,
      caravanBountyRewardPct: 10,
      rareFindPct: 10,
    },
  },
  {
    id: "res_wildhunt_fang",
    pairKey: "dragon_fury+elven_bounty",
    pair: ["dragon_fury", "elven_bounty"],
    name: "荒野猎龙共鸣",
    subtitle: "巨龙狂怒 × 精灵丰饶 · 疾风追猎",
    description: "林间疾风助燃狂龙血脉，加快出招频率并提升暴击率、战斗攻击与野外采集效率。",
    baseBonuses: {
      combatAtkPct: 5,
      critRateBonusPct: 4,
      intervalReductionPct: 5,
      gatherDoubleChance: 0.05,
      gatherSpeedPct: 8,
    },
  },
  {
    id: "res_starfall_slayer",
    pairKey: "astral_fortune+dragon_fury",
    pair: ["dragon_fury", "astral_fortune"],
    name: "星陨讨魔共鸣",
    subtitle: "巨龙狂怒 × 星界幸运 · 猎首圣辉",
    description: "星陨之力聚焦讨伐锋芒，提升攻击力、首领破防与暴击伤害，并放大讨伐金币与稀有掉落。",
    baseBonuses: {
      combatAtkPct: 6,
      bossArmorBreakPct: 0.1,
      critDmgBonusPct: 18,
      goldGainPct: 12,
      rareFindPct: 12,
    },
  },
  {
    id: "res_verdant_artisan",
    pairKey: "dwarven_temper+elven_bounty",
    pair: ["elven_bounty", "dwarven_temper"],
    name: "万匠生机共鸣",
    subtitle: "精灵丰饶 × 矮人淬火 · 百工常青",
    description: "森灵生机滋养工坊炉火，采集与制作全链路提速增产，并额外巩固生命与护甲。",
    baseBonuses: {
      gatherSpeedPct: 9,
      gatherDoubleChance: 0.06,
      craftSpeedPct: 9,
      craftEfficiencyPct: 8,
      bonusHp: 35,
      bonusDef: 5,
    },
  },
  {
    id: "res_astral_gilded_forge",
    pairKey: "astral_fortune+dwarven_temper",
    pair: ["dwarven_temper", "astral_fortune"],
    name: "星辉秘锻共鸣",
    subtitle: "矮人淬火 × 星界幸运 · 点金圣炉",
    description: "星界气运加持神匠淬火，提升制作极速与连作率，同时加成全局金币、商队悬赏与攻防基础。",
    baseBonuses: {
      craftSpeedPct: 10,
      craftEfficiencyPct: 8,
      goldGainPct: 11,
      caravanBountyRewardPct: 12,
      bonusAtk: 5,
      bonusDef: 4,
    },
  },
];

export function isValidAlchemicalPotionId(id: unknown): id is AlchemicalPotionId {
  return typeof id === "string" && (ALCHEMICAL_POTION_IDS as readonly string[]).includes(id);
}

export function buildTwinResonanceKey(
  slotA?: AlchemicalPotionId | string | null,
  slotB?: AlchemicalPotionId | string | null
): string | null {
  if (!isValidAlchemicalPotionId(slotA) || !isValidAlchemicalPotionId(slotB)) return null;
  if (slotA === slotB) return null;
  return [slotA, slotB].sort().join("+");
}

export function findTwinResonance(
  slotA?: AlchemicalPotionId | string | null,
  slotB?: AlchemicalPotionId | string | null
): TwinAlchemicalResonanceDef | null {
  const key = buildTwinResonanceKey(slotA, slotB);
  if (!key) return null;
  return TWIN_ALCHEMICAL_RESONANCES.find((r) => r.pairKey === key) || null;
}

export function scaleTwinResonanceBonuses(def: TwinAlchemicalResonanceDef, resonanceTier: number) {
  const tier = Math.min(ALCHEMY_MAX_RECIPE_RANK, Math.max(1, Math.floor(resonanceTier || 1)));
  const mult = 1 + (tier - 1) * 0.15;
  const b = def.baseBonuses;
  return {
    bonusAtk: b.bonusAtk ? Math.round(b.bonusAtk * mult) : 0,
    bonusDef: b.bonusDef ? Math.round(b.bonusDef * mult) : 0,
    bonusHp: b.bonusHp ? Math.round(b.bonusHp * mult) : 0,
    combatAtkPct: b.combatAtkPct ? Math.round(b.combatAtkPct * mult) : 0,
    armorPenPct: b.armorPenPct ? Math.round(b.armorPenPct * mult * 1000) / 1000 : 0,
    bossArmorBreakPct: b.bossArmorBreakPct ? Math.round(b.bossArmorBreakPct * mult * 1000) / 1000 : 0,
    intervalReductionPct: b.intervalReductionPct ? Math.round(b.intervalReductionPct * mult * 10) / 10 : 0,
    critRateBonusPct: b.critRateBonusPct ? Math.round(b.critRateBonusPct * mult * 10) / 10 : 0,
    critDmgBonusPct: b.critDmgBonusPct ? Math.round(b.critDmgBonusPct * mult) : 0,
    gatherSpeedPct: b.gatherSpeedPct ? Math.round(b.gatherSpeedPct * mult) : 0,
    gatherDoubleChance: b.gatherDoubleChance ? Math.round(b.gatherDoubleChance * mult * 1000) / 1000 : 0,
    craftSpeedPct: b.craftSpeedPct ? Math.round(b.craftSpeedPct * mult) : 0,
    craftEfficiencyPct: b.craftEfficiencyPct ? Math.round(b.craftEfficiencyPct * mult) : 0,
    goldGainPct: b.goldGainPct ? Math.round(b.goldGainPct * mult) : 0,
    rareFindPct: b.rareFindPct ? Math.round(b.rareFindPct * mult) : 0,
    caravanBountyRewardPct: b.caravanBountyRewardPct ? Math.round(b.caravanBountyRewardPct * mult) : 0,
  };
}

export function getCauldronMasteryTier(cauldronPoints: number, storedRank?: number) {
  const rawPts = Number.isFinite(cauldronPoints) && cauldronPoints > 0 ? Math.floor(cauldronPoints) : 0;
  const rankFloor =
    typeof storedRank === "number" && Number.isFinite(storedRank) && storedRank >= 1
      ? CAULDRON_MASTERY_TIERS[Math.min(CAULDRON_MASTERY_TIERS.length, Math.floor(storedRank)) - 1]?.minPoints || 0
      : 0;
  const pts = Math.max(rawPts, rankFloor);

  let current = CAULDRON_MASTERY_TIERS[0];
  for (const t of CAULDRON_MASTERY_TIERS) {
    if (pts >= t.minPoints) current = t;
  }
  const next = CAULDRON_MASTERY_TIERS.find((t) => t.level === current.level + 1) || null;
  const progressPct = !next
    ? 100
    : Math.min(
        100,
        Math.max(0, Math.floor(((pts - current.minPoints) / Math.max(1, next.minPoints - current.minPoints)) * 100))
      );
  return { current, next, progressPct, effectivePoints: pts };
}

export interface AlchemyCauldronBonuses {
  cauldronRank: number;
  cauldronTitle: string;
  batchBonusCharges: number;
  activePotions: AlchemicalPotionId[];
  activeResonanceId: string | null;
  activeResonanceName: string | null;
  resonanceTier: number;
  bonusAtk: number;
  bonusDef: number;
  bonusHp: number;
  combatAtkPct: number;
  armorPenPct: number;
  bossArmorBreakPct: number;
  intervalMult: number;
  critRateBonusPct: number;
  critDmgBonusPct: number;
  potionBuffMult: number;
  gatherSpeedPct: number;
  gatherDoubleChance: number;
  craftSpeedPct: number;
  craftEfficiencyPct: number;
  goldGainPct: number;
  rareFindPct: number;
  caravanBountyRewardPct: number;
}

export function getAlchemyCauldronBonuses(
  player?: Pick<EnhancedPlayerState, "alchemyCauldron"> | null
): AlchemyCauldronBonuses {
  const ac = player?.alchemyCauldron as
    | {
        recipeRanks?: Partial<Record<string, number>> | null;
        potionCharges?: Partial<Record<string, number>> | null;
        equippedPotions?: ReadonlyArray<string | null | undefined> | null;
        totalBrews?: number;
        totalUpgrades?: number;
        cauldronPoints?: number;
        alchemyCauldronRank?: number;
      }
    | undefined
    | null;

  if (!ac || typeof ac !== "object") {
    return {
      cauldronRank: 1,
      cauldronTitle: CAULDRON_MASTERY_TIERS[0].title,
      batchBonusCharges: 0,
      activePotions: [],
      activeResonanceId: null,
      activeResonanceName: null,
      resonanceTier: 0,
      bonusAtk: 0,
      bonusDef: 0,
      bonusHp: 0,
      combatAtkPct: 0,
      armorPenPct: 0,
      bossArmorBreakPct: 0,
      intervalMult: 1,
      critRateBonusPct: 0,
      critDmgBonusPct: 0,
      potionBuffMult: 1,
      gatherSpeedPct: 0,
      gatherDoubleChance: 0,
      craftSpeedPct: 0,
      craftEfficiencyPct: 0,
      goldGainPct: 0,
      rareFindPct: 0,
      caravanBountyRewardPct: 0,
    };
  }

  const cleanBrews = Number.isFinite(Number(ac.totalBrews)) && Number(ac.totalBrews) > 0 ? Math.floor(Number(ac.totalBrews)) : 0;
  const cleanUpgrades =
    Number.isFinite(Number(ac.totalUpgrades)) && Number(ac.totalUpgrades) > 0 ? Math.floor(Number(ac.totalUpgrades)) : 0;
  const rawPoints = Number.isFinite(Number(ac.cauldronPoints)) && Number(ac.cauldronPoints) > 0 ? Math.floor(Number(ac.cauldronPoints)) : 0;
  const derivedPoints = Math.max(rawPoints, cleanBrews * ALCHEMY_BREW_ESSENCE_POINTS + cleanUpgrades * 35);
  const { current: tier } = getCauldronMasteryTier(derivedPoints, ac.alchemyCauldronRank);

  let bonusAtk = 0;
  let bonusDef = 0;
  let bonusHp = 0;
  let combatAtkPct = tier.combatAtkPct;
  let armorPenPct = 0;
  let bossArmorBreakPct = 0;
  let intervalMult = 1;
  let critRateBonusPct = 0;
  let critDmgBonusPct = 0;
  const potionBuffMult = tier.potionBuffPct > 0 ? Math.round((1 + tier.potionBuffPct / 100) * 1000) / 1000 : 1;
  let gatherSpeedPct = tier.gatherSpeedPct;
  let gatherDoubleChance = 0;
  let craftSpeedPct = tier.craftSpeedPct;
  let craftEfficiencyPct = 0;
  let goldGainPct = tier.goldGainPct;
  let rareFindPct = 0;
  let caravanBountyRewardPct = 0;

  const hasChargesObj = ac.potionCharges !== undefined && ac.potionCharges !== null && typeof ac.potionCharges === "object";
  const rawSlots = Array.isArray(ac.equippedPotions) ? ac.equippedPotions : [];
  const activePotions: AlchemicalPotionId[] = [];
  const seen = new Set<AlchemicalPotionId>();

  const getRank = (pid: AlchemicalPotionId): number => {
    const r = Number(ac.recipeRanks?.[pid] ?? 1);
    if (!Number.isFinite(r) || r < 1) return 1;
    return Math.min(ALCHEMY_MAX_RECIPE_RANK, Math.floor(r));
  };

  for (let i = 0; i < 2; i++) {
    const candidate = rawSlots[i];
    if (!isValidAlchemicalPotionId(candidate) || seen.has(candidate)) continue;
    seen.add(candidate);
    const charges = hasChargesObj
      ? Math.max(0, Math.floor(Number((ac.potionCharges as Record<string, unknown>)[candidate] || 0)))
      : 1;
    if (charges <= 0) continue;

    activePotions.push(candidate);
    const meta = ALCHEMICAL_POTIONS.find((p) => p.id === candidate);
    if (!meta) continue;
    const rank = getRank(candidate);
    const lvStats = meta.levels[rank - 1];
    if (lvStats.combatAtkPct) combatAtkPct += lvStats.combatAtkPct;
    if (lvStats.bossArmorBreakPct) {
      bossArmorBreakPct = Math.min(0.65, Math.round((bossArmorBreakPct + lvStats.bossArmorBreakPct) * 1000) / 1000);
    }
    if (lvStats.gatherDoubleChance) {
      gatherDoubleChance = Math.min(0.65, Math.round((gatherDoubleChance + lvStats.gatherDoubleChance) * 1000) / 1000);
    }
    if (lvStats.gatherSpeedPct) gatherSpeedPct += lvStats.gatherSpeedPct;
    if (lvStats.craftSpeedPct) craftSpeedPct += lvStats.craftSpeedPct;
    if (lvStats.craftEfficiencyPct) craftEfficiencyPct += lvStats.craftEfficiencyPct;
    if (lvStats.goldGainPct) goldGainPct += lvStats.goldGainPct;
    if (lvStats.caravanBountyRewardPct) caravanBountyRewardPct += lvStats.caravanBountyRewardPct;
  }

  let activeResonanceId: string | null = null;
  let activeResonanceName: string | null = null;
  let resonanceTier = 0;

  if (activePotions.length === 2) {
    const resDef = findTwinResonance(activePotions[0], activePotions[1]);
    if (resDef) {
      activeResonanceId = resDef.id;
      activeResonanceName = resDef.name;
      resonanceTier = Math.min(getRank(activePotions[0]), getRank(activePotions[1]));
      const scaled = scaleTwinResonanceBonuses(resDef, resonanceTier);
      bonusAtk += scaled.bonusAtk;
      bonusDef += scaled.bonusDef;
      bonusHp += scaled.bonusHp;
      combatAtkPct += scaled.combatAtkPct;
      if (scaled.armorPenPct > 0) {
        armorPenPct = Math.min(0.75, Math.round((armorPenPct + scaled.armorPenPct) * 1000) / 1000);
      }
      if (scaled.bossArmorBreakPct > 0) {
        bossArmorBreakPct = Math.min(0.65, Math.round((bossArmorBreakPct + scaled.bossArmorBreakPct) * 1000) / 1000);
      }
      if (scaled.intervalReductionPct > 0) {
        const m = Math.max(0.75, 1 - scaled.intervalReductionPct / 100);
        intervalMult = Math.max(0.65, Math.round(intervalMult * m * 1000) / 1000);
      }
      if (scaled.critRateBonusPct > 0) {
        critRateBonusPct = Math.round((critRateBonusPct + scaled.critRateBonusPct) * 10) / 10;
      }
      critDmgBonusPct += scaled.critDmgBonusPct;
      gatherSpeedPct += scaled.gatherSpeedPct;
      if (scaled.gatherDoubleChance > 0) {
        gatherDoubleChance = Math.min(0.65, Math.round((gatherDoubleChance + scaled.gatherDoubleChance) * 1000) / 1000);
      }
      craftSpeedPct += scaled.craftSpeedPct;
      craftEfficiencyPct += scaled.craftEfficiencyPct;
      goldGainPct += scaled.goldGainPct;
      rareFindPct += scaled.rareFindPct;
      caravanBountyRewardPct += scaled.caravanBountyRewardPct;
    }
  }

  return {
    cauldronRank: tier.level,
    cauldronTitle: tier.title,
    batchBonusCharges: tier.batchBonusCharges,
    activePotions,
    activeResonanceId,
    activeResonanceName,
    resonanceTier,
    bonusAtk,
    bonusDef,
    bonusHp,
    combatAtkPct,
    armorPenPct,
    bossArmorBreakPct,
    intervalMult,
    critRateBonusPct,
    critDmgBonusPct,
    potionBuffMult,
    gatherSpeedPct,
    gatherDoubleChance,
    craftSpeedPct,
    craftEfficiencyPct,
    goldGainPct,
    rareFindPct,
    caravanBountyRewardPct,
  };
}

/** 确保 alchemyCauldron 状态存在并净化脏档数据，同时自动维护每日免费炼金原液萃取重置 */
export function ensureAlchemyCauldron(
  player: EnhancedPlayerState,
  now: Date = new Date()
): AlchemyCauldronState {
  if (!Array.isArray((player as any).logs)) {
    (player as any).logs = [];
  }
  const cleanNonNeg = (v: unknown, fallback = 0): number =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallback;

  if (!player.alchemyCauldron || typeof player.alchemyCauldron !== "object") {
    player.alchemyCauldron = {
      recipeRanks: {
        dragon_fury: 1,
        elven_bounty: 1,
        dwarven_temper: 1,
        astral_fortune: 1,
      },
      potionCharges: {
        dragon_fury: 0,
        elven_bounty: 0,
        dwarven_temper: 0,
        astral_fortune: 0,
      },
      alchemicalEssence: 2,
      equippedPotions: [null, null],
      totalBrews: 0,
      totalUpgrades: 0,
      cauldronPoints: 0,
      alchemyCauldronRank: 1,
    };
  }

  const ac = player.alchemyCauldron;
  const rawRanks = (ac.recipeRanks && typeof ac.recipeRanks === "object" ? ac.recipeRanks : {}) as Record<string, unknown>;
  const cleanRanks = {} as Record<AlchemicalPotionId, number>;
  for (const pid of ALCHEMICAL_POTION_IDS) {
    const r = Number(rawRanks[pid]);
    cleanRanks[pid] = Number.isFinite(r) && r >= 1 ? Math.min(ALCHEMY_MAX_RECIPE_RANK, Math.floor(r)) : 1;
  }
  ac.recipeRanks = cleanRanks;

  const rawCharges = (ac.potionCharges && typeof ac.potionCharges === "object" ? ac.potionCharges : {}) as Record<string, unknown>;
  const cleanCharges = {} as Record<AlchemicalPotionId, number>;
  for (const pid of ALCHEMICAL_POTION_IDS) {
    cleanCharges[pid] = Math.min(ALCHEMY_MAX_CHARGES, cleanNonNeg(rawCharges[pid], 0));
  }
  ac.potionCharges = cleanCharges;

  ac.alchemicalEssence = cleanNonNeg(ac.alchemicalEssence, 0);

  const rawEq = Array.isArray(ac.equippedPotions) ? ac.equippedPotions : [null, null];
  const slotA = isValidAlchemicalPotionId(rawEq[0]) ? rawEq[0] : null;
  let slotB = isValidAlchemicalPotionId(rawEq[1]) ? rawEq[1] : null;
  if (slotA && slotB && slotA === slotB) {
    slotB = null;
  }
  ac.equippedPotions = [slotA, slotB];

  ac.totalBrews = cleanNonNeg(ac.totalBrews, 0);
  ac.totalUpgrades = cleanNonNeg(ac.totalUpgrades, 0);
  const rawPts = cleanNonNeg(ac.cauldronPoints, 0);
  const tierInfo = getCauldronMasteryTier(
    Math.max(rawPts, ac.totalBrews * ALCHEMY_BREW_ESSENCE_POINTS + ac.totalUpgrades * 35),
    ac.alchemyCauldronRank
  );
  ac.cauldronPoints = tierInfo.effectivePoints;
  ac.alchemyCauldronRank = tierInfo.current.level;

  const today = todayLocal(now);
  if (
    !ac.dailyExtraction ||
    typeof ac.dailyExtraction !== "object" ||
    ac.dailyExtraction.date !== today
  ) {
    ac.dailyExtraction = { date: today, claimedCount: 0 };
  } else {
    ac.dailyExtraction.claimedCount = Math.min(
      ALCHEMY_DAILY_FREE_EXTRACTIONS,
      cleanNonNeg(ac.dailyExtraction.claimedCount, 0)
    );
  }

  return ac;
}

/** 每日免费「炼金原液萃取」：零门槛产出炼金原液，供早中期冒险者立即开炉炼药 */
export function claimDailyAlchemyExtraction(
  player: EnhancedPlayerState,
  now: Date = new Date()
): {
  ok: boolean;
  reason?: string;
  essenceGained?: number;
  remainingToday?: number;
  leveledUpTo?: number;
} {
  ensurePlayerExtensions(player);
  const ac = ensureAlchemyCauldron(player, now);
  const used = ac.dailyExtraction?.claimedCount || 0;
  if (used >= ALCHEMY_DAILY_FREE_EXTRACTIONS) {
    return { ok: false, reason: `今日免费炼金原液萃取次数已用尽（每日 ${ALCHEMY_DAILY_FREE_EXTRACTIONS} 次）` };
  }

  const prevRank = ac.alchemyCauldronRank;
  ac.dailyExtraction!.claimedCount = used + 1;
  ac.alchemicalEssence += ALCHEMY_ESSENCE_PER_EXTRACTION;
  ac.cauldronPoints += ALCHEMY_EXTRACTION_POINTS;
  const nextTier = getCauldronMasteryTier(ac.cauldronPoints, ac.alchemyCauldronRank);
  ac.alchemyCauldronRank = nextTier.current.level;

  const remainingToday = Math.max(0, ALCHEMY_DAILY_FREE_EXTRACTIONS - ac.dailyExtraction!.claimedCount);
  appendLog(
    player,
    `奇美拉魔药釜「炼金原液萃取」完成：获得炼金原液 +${ALCHEMY_ESSENCE_PER_EXTRACTION}（今日剩余免费萃取 ${remainingToday} 次）！`
  );
  if (ac.alchemyCauldronRank > prevRank) {
    appendLog(
      player,
      `炼金宗师等阶晋升至 Lv.${ac.alchemyCauldronRank}「${nextTier.current.title}」！永久全局加成同步提升！`
    );
  }
  return {
    ok: true,
    essenceGained: ALCHEMY_ESSENCE_PER_EXTRACTION,
    remainingToday,
    ...(ac.alchemyCauldronRank > prevRank ? { leveledUpTo: ac.alchemyCauldronRank } : {}),
  };
}

/** 炼制奇美拉核心炼金魔药批次（支持：炼金原液零门槛炼制 / 金币+采集素材炼制 / 异域星晶尘高浓缩炼制） */
export function brewAlchemicalPotion(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack | undefined,
  potionId: string,
  mode: PotionBrewMode,
  now: Date = new Date()
): {
  ok: boolean;
  reason?: string;
  potionId?: AlchemicalPotionId;
  chargesAdded?: number;
  totalCharges?: number;
  autoEquippedSlot?: ResonanceSlotIndex | null;
  leveledUpTo?: number;
} {
  ensurePlayerExtensions(player);
  const ac = ensureAlchemyCauldron(player, now);
  const ct = ensureCaravanTrade(player, now);

  if (!isValidAlchemicalPotionId(potionId)) {
    return { ok: false, reason: "未知的奇美拉炼金魔药配方" };
  }
  if (mode !== "essence" && mode !== "material" && mode !== "astral_dust") {
    return { ok: false, reason: "无效的炼制触媒模式" };
  }

  const meta = ALCHEMICAL_POTIONS.find((p) => p.id === potionId)!;
  const curCharges = ac.potionCharges[potionId] || 0;
  if (curCharges >= ALCHEMY_MAX_CHARGES) {
    return { ok: false, reason: `「${meta.name}」储备充能已达上限（${ALCHEMY_MAX_CHARGES} 份）` };
  }

  const itemsById = new Map<string, string>(
    (((contentPack?.items as Array<{ id: string; name?: string }> | undefined) || [])).map((it) => [
      it.id,
      it.name || it.id,
    ])
  );

  const prevTier = getCauldronMasteryTier(ac.cauldronPoints, ac.alchemyCauldronRank).current;
  let baseCharges = ALCHEMY_BREW_ESSENCE_CHARGES;
  let pointsGain = ALCHEMY_BREW_ESSENCE_POINTS;

  if (mode === "essence") {
    if (ac.alchemicalEssence < ALCHEMY_BREW_ESSENCE_COST) {
      return {
        ok: false,
        reason: `炼金原液不足（需 ${ALCHEMY_BREW_ESSENCE_COST} 份，当前 ${ac.alchemicalEssence} 份；可先使用每日免费炼金原液萃取）`,
      };
    }
    ac.alchemicalEssence -= ALCHEMY_BREW_ESSENCE_COST;
    baseCharges = ALCHEMY_BREW_ESSENCE_CHARGES;
    pointsGain = ALCHEMY_BREW_ESSENCE_POINTS;
  } else if (mode === "material") {
    const needGold = meta.materialBrewCost.gold;
    const haveGold = Math.floor(Number(player.inventory.gold || 0));
    if (haveGold < needGold) {
      return { ok: false, reason: `金币不足（炼制「${meta.name}」需 ${needGold} 金币，当前 ${haveGold} 金币）` };
    }
    for (const [iid, needQty] of Object.entries(meta.materialBrewCost.items)) {
      const idleHave = getIdleCargoCount(player, iid);
      if (idleHave < needQty) {
        const nm = itemsById.get(iid) || iid;
        return { ok: false, reason: `闲置素材「${nm}」不足（需 ${needQty} 件，当前可用 ${idleHave} 件）` };
      }
    }
    player.inventory.gold = haveGold - needGold;
    for (const [iid, needQty] of Object.entries(meta.materialBrewCost.items)) {
      player.inventory[iid] = Math.max(0, Number(player.inventory[iid] || 0) - needQty);
      if (player.inventory[iid] <= 0) delete player.inventory[iid];
    }
    baseCharges = ALCHEMY_BREW_MATERIAL_CHARGES;
    pointsGain = ALCHEMY_BREW_MATERIAL_POINTS;
  } else {
    if (ct.astralCrystalDust < ALCHEMY_BREW_ASTRAL_DUST_COST) {
      return {
        ok: false,
        reason: `异域星晶尘不足（高浓缩炼制需 ${ALCHEMY_BREW_ASTRAL_DUST_COST} 星晶尘，当前 ${ct.astralCrystalDust}）`,
      };
    }
    ct.astralCrystalDust -= ALCHEMY_BREW_ASTRAL_DUST_COST;
    baseCharges = ALCHEMY_BREW_ASTRAL_DUST_CHARGES;
    pointsGain = ALCHEMY_BREW_ASTRAL_DUST_POINTS;
  }

  const desiredAdd =
    baseCharges +
    prevTier.batchBonusCharges +
    getAstralRelicsBonuses(player).alchemyBatchBonusCharges;
  const nextTotalCharges = Math.min(ALCHEMY_MAX_CHARGES, curCharges + desiredAdd);
  const actualAdded = nextTotalCharges - curCharges;
  ac.potionCharges[potionId] = nextTotalCharges;
  ac.totalBrews += 1;
  ac.cauldronPoints += pointsGain;

  const nextTier = getCauldronMasteryTier(ac.cauldronPoints, ac.alchemyCauldronRank).current;
  ac.alchemyCauldronRank = nextTier.level;

  let autoEquippedSlot: ResonanceSlotIndex | null = null;
  if (!ac.equippedPotions.includes(potionId)) {
    if (ac.equippedPotions[0] === null) {
      ac.equippedPotions[0] = potionId;
      autoEquippedSlot = 0;
    } else if (ac.equippedPotions[1] === null) {
      ac.equippedPotions[1] = potionId;
      autoEquippedSlot = 1;
    }
  }

  addReputation(player, 4);
  syncAchievements(player);

  const resonanceNow = findTwinResonance(ac.equippedPotions[0], ac.equippedPotions[1]);
  const equipHint =
    autoEquippedSlot !== null
      ? `（已自动装入共鸣槽 ${autoEquippedSlot === 0 ? "A" : "B"}${resonanceNow ? `，激活「${resonanceNow.name}」！` : ""}）`
      : "";
  appendLog(
    player,
    `奇美拉炼金魔药釜炼制「${meta.name}」成功：充能 +${actualAdded}（当前 ${nextTotalCharges} 份）${equipHint}`
  );
  if (nextTier.level > prevTier.level) {
    appendLog(
      player,
      `炼金宗师等阶晋升至 Lv.${nextTier.level}「${nextTier.title}」！永久全局加成与单批额外产出提升！`
    );
  }

  return {
    ok: true,
    potionId,
    chargesAdded: actualAdded,
    totalCharges: nextTotalCharges,
    autoEquippedSlot,
    ...(nextTier.level > prevTier.level ? { leveledUpTo: nextTier.level } : {}),
  };
}

/** 研习并升阶「炼金宗师图谱」（Lv.1 -> Lv.5，跨转生永久保留） */
export function upgradeAlchemicalRecipe(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack | undefined,
  potionId: string,
  mode: RecipeUpgradeMode = "standard",
  now: Date = new Date()
): {
  ok: boolean;
  reason?: string;
  potionId?: AlchemicalPotionId;
  newRank?: number;
  leveledUpTo?: number;
} {
  ensurePlayerExtensions(player);
  const ac = ensureAlchemyCauldron(player, now);
  const ct = ensureCaravanTrade(player, now);

  if (!isValidAlchemicalPotionId(potionId)) {
    return { ok: false, reason: "未知的炼金宗师图谱" };
  }
  if (mode !== "standard" && mode !== "astral_dust") {
    return { ok: false, reason: "无效的图谱研习方式" };
  }

  const meta = ALCHEMICAL_POTIONS.find((p) => p.id === potionId)!;
  const curRank = ac.recipeRanks[potionId] || 1;
  if (curRank >= ALCHEMY_MAX_RECIPE_RANK) {
    return { ok: false, reason: `「${meta.name}」宗师图谱已达最高阶 Lv.${ALCHEMY_MAX_RECIPE_RANK}` };
  }

  const targetRank = (curRank + 1) as 2 | 3 | 4 | 5;
  const costTier = ALCHEMY_RECIPE_UPGRADE_COSTS.find((c) => c.targetRank === targetRank)!;
  const itemsById = new Map<string, string>(
    (((contentPack?.items as Array<{ id: string; name?: string }> | undefined) || [])).map((it) => [
      it.id,
      it.name || it.id,
    ])
  );

  const haveGold = Math.floor(Number(player.inventory.gold || 0));
  if (mode === "standard") {
    const std = costTier.standard;
    if (haveGold < std.gold) {
      return { ok: false, reason: `金币不足（升阶至 Lv.${targetRank} 需 ${std.gold} 金币，当前 ${haveGold} 金币）` };
    }
    if (ac.alchemicalEssence < std.alchemicalEssence) {
      return {
        ok: false,
        reason: `炼金原液不足（升阶至 Lv.${targetRank} 需 ${std.alchemicalEssence} 份炼金原液，当前 ${ac.alchemicalEssence} 份）`,
      };
    }
    for (const [cid, needQty] of Object.entries(std.crystals)) {
      const idleHave = getIdleCargoCount(player, cid);
      if (idleHave < needQty) {
        const nm = itemsById.get(cid) || cid;
        return { ok: false, reason: `闲置晶石「${nm}」不足（需 ${needQty} 枚，当前可用 ${idleHave} 枚）` };
      }
    }
    player.inventory.gold = haveGold - std.gold;
    ac.alchemicalEssence -= std.alchemicalEssence;
    for (const [cid, needQty] of Object.entries(std.crystals)) {
      player.inventory[cid] = Math.max(0, Number(player.inventory[cid] || 0) - needQty);
      if (player.inventory[cid] <= 0) delete player.inventory[cid];
    }
  } else {
    const ast = costTier.astralDust;
    if (haveGold < ast.gold) {
      return { ok: false, reason: `金币不足（星晶研习升阶需 ${ast.gold} 金币，当前 ${haveGold} 金币）` };
    }
    if (ct.astralCrystalDust < ast.astralCrystalDust) {
      return {
        ok: false,
        reason: `异域星晶尘不足（升阶至 Lv.${targetRank} 需 ${ast.astralCrystalDust} 星晶尘，当前 ${ct.astralCrystalDust}）`,
      };
    }
    player.inventory.gold = haveGold - ast.gold;
    ct.astralCrystalDust -= ast.astralCrystalDust;
  }

  const prevRank = ac.alchemyCauldronRank;
  ac.recipeRanks[potionId] = targetRank;
  ac.totalUpgrades += 1;
  ac.cauldronPoints += costTier.cauldronPoints;
  ac.potionCharges[potionId] = Math.min(ALCHEMY_MAX_CHARGES, (ac.potionCharges[potionId] || 0) + 4);

  const nextTier = getCauldronMasteryTier(ac.cauldronPoints, ac.alchemyCauldronRank).current;
  ac.alchemyCauldronRank = nextTier.level;

  addReputation(player, 10);
  syncAchievements(player);

  appendLog(
    player,
    `炼金宗师图谱「${meta.name}」永久升阶至 Lv.${targetRank}（跨转生永久保留，并附赠 4 份浓缩充能）！`
  );
  if (nextTier.level > prevRank) {
    appendLog(
      player,
      `炼金宗师等阶晋升至 Lv.${nextTier.level}「${nextTier.title}」！永久全局被动同步提升！`
    );
  }

  return {
    ok: true,
    potionId,
    newRank: targetRank,
    ...(nextTier.level > prevRank ? { leveledUpTo: nextTier.level } : {}),
  };
}

/** 装卸「深渊试炼双共鸣药剂槽」（slot 0 | 1，最多同时装备 2 种不同魔药激活双生共鸣） */
export function equipAlchemicalPotion(
  player: EnhancedPlayerState,
  slotIndex: number,
  potionId: string | null,
  now: Date = new Date()
): {
  ok: boolean;
  reason?: string;
  equippedPotions?: [AlchemicalPotionId | null, AlchemicalPotionId | null];
  activeResonanceName?: string | null;
} {
  ensurePlayerExtensions(player);
  const ac = ensureAlchemyCauldron(player, now);
  if (slotIndex !== 0 && slotIndex !== 1) {
    return { ok: false, reason: "无效的共鸣药剂槽位" };
  }

  if (potionId === null || potionId === "") {
    ac.equippedPotions[slotIndex] = null;
    return {
      ok: true,
      equippedPotions: [...ac.equippedPotions] as [AlchemicalPotionId | null, AlchemicalPotionId | null],
      activeResonanceName: getAlchemyCauldronBonuses(player).activeResonanceName,
    };
  }

  if (!isValidAlchemicalPotionId(potionId)) {
    return { ok: false, reason: "未知的奇美拉炼金魔药" };
  }

  const meta = ALCHEMICAL_POTIONS.find((p) => p.id === potionId)!;
  if ((ac.potionCharges[potionId] || 0) <= 0) {
    return {
      ok: false,
      reason: `「${meta.name}」当前储备充能为 0，请先在魔药釜中炼制至少 1 批后再装入共鸣槽`,
    };
  }

  const otherSlot: ResonanceSlotIndex = slotIndex === 0 ? 1 : 0;
  if (ac.equippedPotions[otherSlot] === potionId) {
    ac.equippedPotions[otherSlot] = ac.equippedPotions[slotIndex];
  }
  ac.equippedPotions[slotIndex] = potionId;

  const bonuses = getAlchemyCauldronBonuses(player);
  if (bonuses.activeResonanceName) {
    appendLog(
      player,
      `深渊试炼双共鸣药剂槽已装填「${meta.name}」——成功激活炼金双生共鸣「${bonuses.activeResonanceName}」！`
    );
  } else {
    appendLog(player, `共鸣药剂槽 ${slotIndex === 0 ? "A" : "B"} 已装填「${meta.name}」`);
  }

  return {
    ok: true,
    equippedPotions: [...ac.equippedPotions] as [AlchemicalPotionId | null, AlchemicalPotionId | null],
    activeResonanceName: bonuses.activeResonanceName,
  };
}

/** 深渊首领讨伐胜利时，每个已激活的共鸣槽消耗 1 份魔药充能 */
export function consumeEquippedPotionChargesOnBossKill(player: EnhancedPlayerState): number {
  const ac = player.alchemyCauldron;
  if (!ac || typeof ac !== "object" || !Array.isArray(ac.equippedPotions)) return 0;
  let consumedCount = 0;
  for (const slotPid of ac.equippedPotions) {
    if (!isValidAlchemicalPotionId(slotPid)) continue;
    const cur = Math.max(0, Math.floor(Number(ac.potionCharges?.[slotPid] || 0)));
    if (cur > 0) {
      ac.potionCharges[slotPid] = cur - 1;
      consumedCount += 1;
    }
  }
  return consumedCount;
}

/** 构造前端「奇美拉炼金魔药釜 & 深渊试炼双共鸣药剂槽」完整视图模型 */
export function getAlchemyCauldronInfo(
  player: EnhancedPlayerState,
  contentPack?: EnhancedContentPack,
  now: Date = new Date()
) {
  ensurePlayerExtensions(player);
  const ac = ensureAlchemyCauldron(player, now);
  const ct = ensureCaravanTrade(player, now);

  const itemsMap = new Map<string, { id: string; name?: string }>(
    (((contentPack?.items as Array<{ id: string; name?: string }> | undefined) || [])).map((it) => [it.id, it])
  );

  const tierInfo = getCauldronMasteryTier(ac.cauldronPoints, ac.alchemyCauldronRank);
  const bonuses = getAlchemyCauldronBonuses(player);
  const haveGold = Math.floor(Number(player.inventory.gold || 0));

  const potions = ALCHEMICAL_POTIONS.map((meta) => {
    const rank = ac.recipeRanks[meta.id] || 1;
    const charges = ac.potionCharges[meta.id] || 0;
    const slotIdx = ac.equippedPotions.indexOf(meta.id);
    const isEquipped = slotIdx === 0 || slotIdx === 1;
    const isActive = isEquipped && charges > 0;
    const atChargeCap = charges >= ALCHEMY_MAX_CHARGES;

    const matItems = Object.entries(meta.materialBrewCost.items).map(([iid, needQty]) => {
      const idleHave = getIdleCargoCount(player, iid);
      return {
        itemId: iid,
        name: itemsMap.get(iid)?.name || iid,
        need: needQty,
        have: idleHave,
      };
    });

    const canBrewEssence = !atChargeCap && ac.alchemicalEssence >= ALCHEMY_BREW_ESSENCE_COST;
    const canBrewMaterial =
      !atChargeCap &&
      haveGold >= meta.materialBrewCost.gold &&
      matItems.every((m) => m.have >= m.need);
    const canBrewAstralDust = !atChargeCap && ct.astralCrystalDust >= ALCHEMY_BREW_ASTRAL_DUST_COST;

    const nextRank = rank < ALCHEMY_MAX_RECIPE_RANK ? ((rank + 1) as 2 | 3 | 4 | 5) : null;
    const upgradeCostTier = nextRank
      ? ALCHEMY_RECIPE_UPGRADE_COSTS.find((u) => u.targetRank === nextRank) || null
      : null;

    const upgradeCrystals = upgradeCostTier
      ? Object.entries(upgradeCostTier.standard.crystals).map(([cid, needQty]) => ({
          itemId: cid,
          name: itemsMap.get(cid)?.name || cid,
          need: needQty,
          have: getIdleCargoCount(player, cid),
        }))
      : [];

    const canUpgradeStandard = Boolean(
      upgradeCostTier &&
        haveGold >= upgradeCostTier.standard.gold &&
        ac.alchemicalEssence >= upgradeCostTier.standard.alchemicalEssence &&
        upgradeCrystals.every((c) => c.have >= c.need)
    );
    const canUpgradeAstralDust = Boolean(
      upgradeCostTier &&
        haveGold >= upgradeCostTier.astralDust.gold &&
        ct.astralCrystalDust >= upgradeCostTier.astralDust.astralCrystalDust
    );

    return {
      id: meta.id,
      name: meta.name,
      subtitle: meta.subtitle,
      description: meta.description,
      iconId: meta.iconId,
      rank,
      maxRank: meta.maxRank,
      charges,
      maxCharges: ALCHEMY_MAX_CHARGES,
      isEquipped,
      equippedSlot: isEquipped ? (slotIdx as ResonanceSlotIndex) : null,
      isActive,
      currentStats: meta.levels[rank - 1],
      nextStats: nextRank ? meta.levels[nextRank - 1] : null,
      brewOptions: {
        essence: {
          costEssence: ALCHEMY_BREW_ESSENCE_COST,
          chargesOut:
            ALCHEMY_BREW_ESSENCE_CHARGES +
            tierInfo.current.batchBonusCharges +
            getAstralRelicsBonuses(player).alchemyBatchBonusCharges,
          pointsOut: ALCHEMY_BREW_ESSENCE_POINTS,
          canAfford: canBrewEssence,
        },
        material: {
          gold: meta.materialBrewCost.gold,
          items: matItems,
          chargesOut:
            ALCHEMY_BREW_MATERIAL_CHARGES +
            tierInfo.current.batchBonusCharges +
            getAstralRelicsBonuses(player).alchemyBatchBonusCharges,
          pointsOut: ALCHEMY_BREW_MATERIAL_POINTS,
          canAfford: canBrewMaterial,
        },
        astralDust: {
          costDust: ALCHEMY_BREW_ASTRAL_DUST_COST,
          chargesOut:
            ALCHEMY_BREW_ASTRAL_DUST_CHARGES +
            tierInfo.current.batchBonusCharges +
            getAstralRelicsBonuses(player).alchemyBatchBonusCharges,
          pointsOut: ALCHEMY_BREW_ASTRAL_DUST_POINTS,
          canAfford: canBrewAstralDust,
        },
      },
      upgradeOptions: upgradeCostTier
        ? {
            targetRank: upgradeCostTier.targetRank,
            cauldronPoints: upgradeCostTier.cauldronPoints,
            standard: {
              gold: upgradeCostTier.standard.gold,
              alchemicalEssence: upgradeCostTier.standard.alchemicalEssence,
              crystals: upgradeCrystals,
              canAfford: canUpgradeStandard,
            },
            astralDust: {
              gold: upgradeCostTier.astralDust.gold,
              astralCrystalDust: upgradeCostTier.astralDust.astralCrystalDust,
              canAfford: canUpgradeAstralDust,
            },
          }
        : null,
    };
  });

  const allResonances = TWIN_ALCHEMICAL_RESONANCES.map((resDef) => {
    const [pA, pB] = resDef.pair;
    const rankA = ac.recipeRanks[pA] || 1;
    const rankB = ac.recipeRanks[pB] || 1;
    const previewTier = Math.min(rankA, rankB);
    const isActive = bonuses.activeResonanceId === resDef.id;
    return {
      ...resDef,
      previewTier,
      scaledBonuses: scaleTwinResonanceBonuses(resDef, previewTier),
      isActive,
    };
  });

  const usedExtractions = ac.dailyExtraction?.claimedCount || 0;

  return {
    nowMs: now.getTime(),
    gold: haveGold,
    alchemicalEssence: ac.alchemicalEssence,
    astralCrystalDust: ct.astralCrystalDust,
    totalBrews: ac.totalBrews,
    totalUpgrades: ac.totalUpgrades,
    cauldronPoints: ac.cauldronPoints,
    alchemyCauldronRank: ac.alchemyCauldronRank,
    dailyExtraction: {
      date: ac.dailyExtraction?.date || todayLocal(now),
      usedToday: usedExtractions,
      maxPerDay: ALCHEMY_DAILY_FREE_EXTRACTIONS,
      remainingToday: Math.max(0, ALCHEMY_DAILY_FREE_EXTRACTIONS - usedExtractions),
      essencePerClaim: ALCHEMY_ESSENCE_PER_EXTRACTION,
    },
    cauldronTier: {
      level: tierInfo.current.level,
      title: tierInfo.current.title,
      minPoints: tierInfo.current.minPoints,
      nextLevelPoints: tierInfo.next?.minPoints ?? null,
      nextTitle: tierInfo.next?.title ?? null,
      progressPct: tierInfo.progressPct,
      allTiers: CAULDRON_MASTERY_TIERS,
    },
    equippedPotions: [...ac.equippedPotions] as [AlchemicalPotionId | null, AlchemicalPotionId | null],
    activeResonance: allResonances.find((r) => r.isActive) || null,
    allResonances,
    potions,
    bonuses,
  };
}

/* ============================ 星界远古遗迹勘探队 & 传世圣物陈列馆 (WL-9) ============================ */

export const ASTRAL_RUIN_STRATUM_IDS: readonly AstralRuinStratumId[] = [
  "outpost_ruins",
  "obsidian_sanctum",
  "primordial_corridor",
];

export const SACRED_RELIC_IDS: readonly SacredRelicId[] = [
  "solar_spear",
  "verdant_chalice",
  "titan_anvil",
  "chimera_censer",
];

export const ASTRAL_DAILY_FREE_SURVEYS = 2;
export const SACRED_RELIC_MAX_RANK = 5;
export const ASTRAL_VEIN_CADENCE = 3;
export const ASTRAL_MIN_SURVEY_XP = 15;
export const ASTRAL_MIN_RESTORE_XP = 25;

export interface AstralCuratorTierDef {
  level: number;
  minXp: number;
  title: string;
  combatAtkPct: number;
  gatherSpeedPct: number;
  craftSpeedPct: number;
  goldGainPct: number;
  rareFindPct: number;
  surveyBonusShards: number;
}

export const ASTRAL_CURATOR_TIERS: readonly AstralCuratorTierDef[] = [
  {
    level: 1,
    minXp: 0,
    title: "遗迹见习勘探员",
    combatAtkPct: 0,
    gatherSpeedPct: 0,
    craftSpeedPct: 0,
    goldGainPct: 0,
    rareFindPct: 0,
    surveyBonusShards: 0,
  },
  {
    level: 2,
    minXp: 45,
    title: "星坠寻迹学者",
    combatAtkPct: 2,
    gatherSpeedPct: 3,
    craftSpeedPct: 3,
    goldGainPct: 3,
    rareFindPct: 2,
    surveyBonusShards: 1,
  },
  {
    level: 3,
    minXp: 130,
    title: "秘殿鉴宝执事",
    combatAtkPct: 4,
    gatherSpeedPct: 6,
    craftSpeedPct: 6,
    goldGainPct: 6,
    rareFindPct: 5,
    surveyBonusShards: 2,
  },
  {
    level: 4,
    minXp: 280,
    title: "星界考古导师",
    combatAtkPct: 7,
    gatherSpeedPct: 10,
    craftSpeedPct: 10,
    goldGainPct: 10,
    rareFindPct: 8,
    surveyBonusShards: 3,
  },
  {
    level: 5,
    minXp: 520,
    title: "神代圣物大馆长",
    combatAtkPct: 10,
    gatherSpeedPct: 14,
    craftSpeedPct: 14,
    goldGainPct: 15,
    rareFindPct: 12,
    surveyBonusShards: 4,
  },
  {
    level: 6,
    minXp: 860,
    title: "太初星穹守秘贤者",
    combatAtkPct: 14,
    gatherSpeedPct: 19,
    craftSpeedPct: 19,
    goldGainPct: 20,
    rareFindPct: 16,
    surveyBonusShards: 6,
  },
];

export interface StratumModeSpec {
  costGold: number;
  costAstralDust: number;
  baseShards: number;
  baseAstralDust: number;
  expeditionXp: number;
}

export interface AstralRuinStratumDef {
  id: AstralRuinStratumId;
  name: string;
  subtitle: string;
  description: string;
  iconId: string;
  minCuratorRank: number;
  veinBonus: {
    shards: number;
    astralDust: number;
    expeditionXp: number;
  };
  modes: Record<ExpeditionSurveyMode, StratumModeSpec>;
}

export const ASTRAL_RUIN_STRATA: readonly AstralRuinStratumDef[] = [
  {
    id: "outpost_ruins",
    name: "浮空前哨废墟",
    subtitle: "浅层浮岛断垣 · 稳定勘探圣物残片与星晶微尘",
    description:
      "异世界公会最早标定的星界断层前哨，风化星岩中散落着大量远古圣物残片与浅层异域星晶尘。",
    iconId: "astral_ruin_compass",
    minCuratorRank: 1,
    veinBonus: {
      shards: 2,
      astralDust: 1,
      expeditionXp: 6,
    },
    modes: {
      free: { costGold: 0, costAstralDust: 0, baseShards: 4, baseAstralDust: 2, expeditionXp: 15 },
      coin: { costGold: 320, costAstralDust: 0, baseShards: 5, baseAstralDust: 2, expeditionXp: 18 },
      astral_dust: { costGold: 0, costAstralDust: 6, baseShards: 11, baseAstralDust: 2, expeditionXp: 32 },
    },
  },
  {
    id: "obsidian_sanctum",
    name: "星坠曜石圣殿",
    subtitle: "中层曜石回音殿 · 富集圣物晶簇与高纯星晶脉",
    description:
      "陨落星辰嵌入黑曜岩脉构筑的远古圣殿，勘探队等阶达 Lv.2 后即可深入采集高密度圣物残片。",
    iconId: "relic_shard_crystal",
    minCuratorRank: 2,
    veinBonus: {
      shards: 3,
      astralDust: 2,
      expeditionXp: 10,
    },
    modes: {
      free: { costGold: 0, costAstralDust: 0, baseShards: 7, baseAstralDust: 4, expeditionXp: 26 },
      coin: { costGold: 780, costAstralDust: 0, baseShards: 9, baseAstralDust: 4, expeditionXp: 30 },
      astral_dust: { costGold: 0, costAstralDust: 10, baseShards: 19, baseAstralDust: 3, expeditionXp: 52 },
    },
  },
  {
    id: "primordial_corridor",
    name: "太初神代回廊",
    subtitle: "深层神代核心圣域 · 巨量传世圣物真核与星穹秘藏",
    description:
      "唯有资深星界考古导师（Lv.4+）方能踏足的神代中枢回廊，每次发掘均可带回丰厚传世残片与星晶尘。",
    iconId: "astral_ruin_compass",
    minCuratorRank: 4,
    veinBonus: {
      shards: 5,
      astralDust: 3,
      expeditionXp: 16,
    },
    modes: {
      free: { costGold: 0, costAstralDust: 0, baseShards: 12, baseAstralDust: 7, expeditionXp: 42 },
      coin: { costGold: 1650, costAstralDust: 0, baseShards: 15, baseAstralDust: 7, expeditionXp: 48 },
      astral_dust: { costGold: 0, costAstralDust: 16, baseShards: 32, baseAstralDust: 5, expeditionXp: 84 },
    },
  },
];

export interface SacredRelicLevelStats {
  bonusAtk?: number;
  bonusDef?: number;
  bonusHp?: number;
  combatAtkPct?: number;
  armorPenPct?: number;
  bossArmorBreakPct?: number;
  relicCritAmpPct?: number;
  critRateBonusPct?: number;
  critDmgBonusPct?: number;
  intervalReductionPct?: number;
  potionBuffPct?: number;
  gatherDoubleChance?: number;
  gatherSpeedPct?: number;
  gatherEfficiencyPct?: number;
  rareFindPct?: number;
  craftSpeedPct?: number;
  craftEfficiencyPct?: number;
  xpGainPct?: number;
  goldGainPct?: number;
  caravanBountyRewardPct?: number;
  alchemyBatchBonusCharges?: number;
}

export interface SacredRelicPedestalMeta {
  id: SacredRelicId;
  name: string;
  subtitle: string;
  description: string;
  iconId: string;
  maxRank: number;
  levels: readonly [
    SacredRelicLevelStats,
    SacredRelicLevelStats,
    SacredRelicLevelStats,
    SacredRelicLevelStats,
    SacredRelicLevelStats,
  ];
}

export const SACRED_RELIC_PEDESTALS: readonly SacredRelicPedestalMeta[] = [
  {
    id: "solar_spear",
    name: "曜阳破军圣枪",
    subtitle: "战斗破甲贯日 · 暴击率与圣枪暴伤增幅",
    description:
      "神代讨伐军团遗留的赤金破城圣枪，供奉于展台后永久赋予护甲穿透、首领破甲、暴击与圣枪裁决伤害增幅。",
    iconId: "relic_solar_spear",
    maxRank: 5,
    levels: [
      { bonusAtk: 6, combatAtkPct: 4, armorPenPct: 0.04, bossArmorBreakPct: 0.05, critRateBonusPct: 2.5, critDmgBonusPct: 10, relicCritAmpPct: 4 },
      { bonusAtk: 12, combatAtkPct: 7, armorPenPct: 0.07, bossArmorBreakPct: 0.09, critRateBonusPct: 4.5, critDmgBonusPct: 18, relicCritAmpPct: 8 },
      { bonusAtk: 19, combatAtkPct: 11, armorPenPct: 0.11, bossArmorBreakPct: 0.13, critRateBonusPct: 6.5, critDmgBonusPct: 28, relicCritAmpPct: 13 },
      { bonusAtk: 27, combatAtkPct: 15, armorPenPct: 0.15, bossArmorBreakPct: 0.18, critRateBonusPct: 9, critDmgBonusPct: 40, relicCritAmpPct: 19 },
      { bonusAtk: 36, combatAtkPct: 20, armorPenPct: 0.2, bossArmorBreakPct: 0.24, critRateBonusPct: 12, critDmgBonusPct: 55, relicCritAmpPct: 26 },
    ],
  },
  {
    id: "verdant_chalice",
    name: "翠微丰饶圣爵",
    subtitle: "万物双倍采集 · 采集连作丰产与珍稀垂青",
    description:
      "镌刻世界树枝叶纹章的翡翠金爵，永久提升生命上限、全采集双倍暴击率、采集速度与额外丰产连作效率。",
    iconId: "relic_verdant_chalice",
    maxRank: 5,
    levels: [
      { bonusHp: 20, gatherDoubleChance: 0.04, gatherSpeedPct: 6, gatherEfficiencyPct: 5, rareFindPct: 4 },
      { bonusHp: 40, gatherDoubleChance: 0.08, gatherSpeedPct: 11, gatherEfficiencyPct: 10, rareFindPct: 8 },
      { bonusHp: 65, gatherDoubleChance: 0.12, gatherSpeedPct: 17, gatherEfficiencyPct: 16, rareFindPct: 13 },
      { bonusHp: 95, gatherDoubleChance: 0.17, gatherSpeedPct: 24, gatherEfficiencyPct: 23, rareFindPct: 19 },
      { bonusHp: 130, gatherDoubleChance: 0.23, gatherSpeedPct: 32, gatherEfficiencyPct: 32, rareFindPct: 26 },
    ],
  },
  {
    id: "titan_anvil",
    name: "泰坦神铸战锤",
    subtitle: "工坊神匠连作 · 极速制造与百工经验共鸣",
    description:
      "泰坦巨匠锻打星铁圣剑时所用的符文神锤，永久提升防御、全制作神匠免费连作效率、制作速度与技能经验。",
    iconId: "relic_titan_anvil",
    maxRank: 5,
    levels: [
      { bonusDef: 5, craftEfficiencyPct: 6, craftSpeedPct: 7, xpGainPct: 3 },
      { bonusDef: 10, craftEfficiencyPct: 12, craftSpeedPct: 13, xpGainPct: 6 },
      { bonusDef: 16, craftEfficiencyPct: 19, craftSpeedPct: 20, xpGainPct: 10 },
      { bonusDef: 23, craftEfficiencyPct: 27, craftSpeedPct: 28, xpGainPct: 14 },
      { bonusDef: 32, craftEfficiencyPct: 36, craftSpeedPct: 38, xpGainPct: 20 },
    ],
  },
  {
    id: "chimera_censer",
    name: "星界奇美拉圣炉",
    subtitle: "炼金批次增产 · 远征商队悬赏与全局金币洪流",
    description:
      "吞吐星辉秘香的传世圣炉，永久增幅全局与战斗金币倍率、远征商队/特批契约/公会悬赏收益，并强化魔药药效与炼制批次产出。",
    iconId: "relic_chimera_censer",
    maxRank: 5,
    levels: [
      { goldGainPct: 6, caravanBountyRewardPct: 6, potionBuffPct: 5, alchemyBatchBonusCharges: 1 },
      { goldGainPct: 12, caravanBountyRewardPct: 12, potionBuffPct: 10, alchemyBatchBonusCharges: 1 },
      { goldGainPct: 19, caravanBountyRewardPct: 19, potionBuffPct: 16, alchemyBatchBonusCharges: 2 },
      { goldGainPct: 27, caravanBountyRewardPct: 27, potionBuffPct: 23, alchemyBatchBonusCharges: 2 },
      { goldGainPct: 36, caravanBountyRewardPct: 36, potionBuffPct: 32, alchemyBatchBonusCharges: 3 },
    ],
  },
];

export interface RelicPedestalUpgradeCostTier {
  targetRank: 1 | 2 | 3 | 4 | 5;
  expeditionXpGain: number;
  standard: {
    ancientRelicShards: number;
    gold: number;
    items: Record<string, number>;
  };
  astralDust: {
    ancientRelicShards: number;
    astralCrystalDust: number;
    gold: number;
  };
}

export const RELIC_PEDESTAL_UPGRADE_COSTS: readonly RelicPedestalUpgradeCostTier[] = [
  {
    targetRank: 1,
    expeditionXpGain: 25,
    standard: { ancientRelicShards: 6, gold: 80, items: {} },
    astralDust: { ancientRelicShards: 4, astralCrystalDust: 4, gold: 50 },
  },
  {
    targetRank: 2,
    expeditionXpGain: 40,
    standard: { ancientRelicShards: 14, gold: 450, items: { crystal_1: 2 } },
    astralDust: { ancientRelicShards: 9, astralCrystalDust: 8, gold: 300 },
  },
  {
    targetRank: 3,
    expeditionXpGain: 65,
    standard: { ancientRelicShards: 26, gold: 1200, items: { crystal_1: 4, crystal_2: 2 } },
    astralDust: { ancientRelicShards: 16, astralCrystalDust: 14, gold: 800 },
  },
  {
    targetRank: 4,
    expeditionXpGain: 95,
    standard: { ancientRelicShards: 44, gold: 2800, items: { crystal_2: 4, crystal_3: 2 } },
    astralDust: { ancientRelicShards: 28, astralCrystalDust: 22, gold: 1800 },
  },
  {
    targetRank: 5,
    expeditionXpGain: 140,
    standard: { ancientRelicShards: 68, gold: 5600, items: { crystal_3: 4, crystal_4: 2 } },
    astralDust: { ancientRelicShards: 42, astralCrystalDust: 34, gold: 3600 },
  },
];

export interface FullGalleryResonanceDef {
  tier: 1 | 2 | 3 | 4 | 5;
  title: string;
  subtitle: string;
  bonuses: SacredRelicLevelStats;
}

export const FULL_GALLERY_RESONANCE_TIERS: readonly FullGalleryResonanceDef[] = [
  {
    tier: 1,
    title: "四圣初醒·微光圣殿",
    subtitle: "四座传世圣物全部修复至 Lv.1+",
    bonuses: {
      combatAtkPct: 4,
      armorPenPct: 0.03,
      relicCritAmpPct: 3,
      critRateBonusPct: 2,
      critDmgBonusPct: 8,
      intervalReductionPct: 2,
      gatherDoubleChance: 0.03,
      gatherEfficiencyPct: 4,
      craftSpeedPct: 5,
      craftEfficiencyPct: 4,
      goldGainPct: 6,
      caravanBountyRewardPct: 5,
    },
  },
  {
    tier: 2,
    title: "四圣谐振·辉耀回廊",
    subtitle: "四座传世圣物全部升阶至 Lv.2+",
    bonuses: {
      combatAtkPct: 7,
      armorPenPct: 0.05,
      relicCritAmpPct: 5,
      critRateBonusPct: 3.5,
      critDmgBonusPct: 14,
      intervalReductionPct: 3.5,
      gatherDoubleChance: 0.05,
      gatherEfficiencyPct: 7,
      craftSpeedPct: 9,
      craftEfficiencyPct: 7,
      goldGainPct: 10,
      caravanBountyRewardPct: 9,
    },
  },
  {
    tier: 3,
    title: "四圣贯星·苍穹秘殿",
    subtitle: "四座传世圣物全部升阶至 Lv.3+",
    bonuses: {
      combatAtkPct: 10,
      armorPenPct: 0.07,
      relicCritAmpPct: 8,
      critRateBonusPct: 5,
      critDmgBonusPct: 20,
      intervalReductionPct: 5,
      gatherDoubleChance: 0.08,
      gatherEfficiencyPct: 11,
      craftSpeedPct: 13,
      craftEfficiencyPct: 11,
      goldGainPct: 15,
      caravanBountyRewardPct: 13,
    },
  },
  {
    tier: 4,
    title: "四圣齐鸣·神代圣堂",
    subtitle: "四座传世圣物全部升阶至 Lv.4+",
    bonuses: {
      combatAtkPct: 14,
      armorPenPct: 0.09,
      relicCritAmpPct: 11,
      critRateBonusPct: 7,
      critDmgBonusPct: 28,
      intervalReductionPct: 6.5,
      gatherDoubleChance: 0.11,
      gatherEfficiencyPct: 15,
      craftSpeedPct: 18,
      craftEfficiencyPct: 15,
      goldGainPct: 21,
      caravanBountyRewardPct: 18,
    },
  },
  {
    tier: 5,
    title: "四圣圆满·太初不朽神殿",
    subtitle: "四座传世圣物全部臻至满阶 Lv.5",
    bonuses: {
      combatAtkPct: 18,
      armorPenPct: 0.12,
      relicCritAmpPct: 15,
      critRateBonusPct: 9.5,
      critDmgBonusPct: 38,
      intervalReductionPct: 8,
      gatherDoubleChance: 0.15,
      gatherEfficiencyPct: 20,
      craftSpeedPct: 24,
      craftEfficiencyPct: 20,
      goldGainPct: 28,
      caravanBountyRewardPct: 24,
    },
  },
];

export function isValidAstralRuinStratumId(id: unknown): id is AstralRuinStratumId {
  return typeof id === "string" && (ASTRAL_RUIN_STRATUM_IDS as readonly string[]).includes(id);
}

export function isValidSacredRelicId(id: unknown): id is SacredRelicId {
  return typeof id === "string" && (SACRED_RELIC_IDS as readonly string[]).includes(id);
}

export function getAstralCuratorTier(expeditionXp: number, storedRank?: number) {
  const rawXp = Number.isFinite(expeditionXp) && expeditionXp > 0 ? Math.floor(expeditionXp) : 0;
  const clampedStored =
    typeof storedRank === "number" && Number.isFinite(storedRank) && storedRank >= 1
      ? Math.min(ASTRAL_CURATOR_TIERS.length, Math.floor(storedRank))
      : 1;
  const storedFloorXp = ASTRAL_CURATOR_TIERS[clampedStored - 1]?.minXp ?? 0;
  const xp = Math.max(rawXp, storedFloorXp);

  let current = ASTRAL_CURATOR_TIERS[0];
  let next: AstralCuratorTierDef | null = null;
  for (let i = 0; i < ASTRAL_CURATOR_TIERS.length; i++) {
    if (xp >= ASTRAL_CURATOR_TIERS[i].minXp) {
      current = ASTRAL_CURATOR_TIERS[i];
      next = ASTRAL_CURATOR_TIERS[i + 1] ?? null;
    }
  }
  const progressPct = next
    ? Math.min(100, Math.max(0, Math.round(((xp - current.minXp) / Math.max(1, next.minXp - current.minXp)) * 100)))
    : 100;

  return { current, next, progressPct, effectiveXp: xp };
}

export function previewExpeditionSurveyYield(
  stratumId: AstralRuinStratumId,
  mode: ExpeditionSurveyMode,
  totalSurveys: number,
  curatorRank: number
): {
  shardsGained: number;
  astralDustGained: number;
  expeditionXpGained: number;
  isVeinJackpot: boolean;
  nextSurveyNumber: number;
} {
  const stratum = ASTRAL_RUIN_STRATA.find((s) => s.id === stratumId) || ASTRAL_RUIN_STRATA[0];
  const spec = stratum.modes[mode];
  const clampedRank =
    Number.isFinite(curatorRank) && curatorRank >= 1
      ? Math.min(ASTRAL_CURATOR_TIERS.length, Math.floor(curatorRank))
      : 1;
  const curatorTier = ASTRAL_CURATOR_TIERS[clampedRank - 1] || ASTRAL_CURATOR_TIERS[0];
  const cleanSurveys = Number.isFinite(totalSurveys) && totalSurveys > 0 ? Math.floor(totalSurveys) : 0;
  const nextSurveyNumber = cleanSurveys + 1;
  const isVeinJackpot = nextSurveyNumber % ASTRAL_VEIN_CADENCE === 0;

  const shardsGained =
    spec.baseShards +
    curatorTier.surveyBonusShards +
    (isVeinJackpot ? stratum.veinBonus.shards : 0);
  const astralDustGained =
    spec.baseAstralDust + (isVeinJackpot ? stratum.veinBonus.astralDust : 0);
  const expeditionXpGained =
    spec.expeditionXp + (isVeinJackpot ? stratum.veinBonus.expeditionXp : 0);

  return {
    shardsGained,
    astralDustGained,
    expeditionXpGained,
    isVeinJackpot,
    nextSurveyNumber,
  };
}

export function getFullGalleryResonance(
  pedestalRanks?: Partial<Record<string, number>> | null
): FullGalleryResonanceDef | null {
  if (!pedestalRanks || typeof pedestalRanks !== "object") return null;
  let minRank = SACRED_RELIC_MAX_RANK;
  for (const rid of SACRED_RELIC_IDS) {
    const raw = Number(pedestalRanks[rid]);
    const clean = Number.isFinite(raw) && raw >= 0 ? Math.min(SACRED_RELIC_MAX_RANK, Math.floor(raw)) : 0;
    if (clean < minRank) minRank = clean;
  }
  if (minRank < 1) return null;
  return FULL_GALLERY_RESONANCE_TIERS[minRank - 1] || null;
}

export interface AstralRelicsBonuses {
  curatorRank: number;
  curatorTitle: string;
  surveyBonusShards: number;
  restoredCount: number;
  totalRelicLevels: number;
  fullGalleryResonanceTier: number;
  fullGalleryResonanceTitle: string | null;
  bonusAtk: number;
  bonusDef: number;
  bonusHp: number;
  combatAtkPct: number;
  armorPenPct: number;
  bossArmorBreakPct: number;
  relicCritAmpPct: number;
  intervalMult: number;
  critRateBonusPct: number;
  critDmgBonusPct: number;
  potionBuffMult: number;
  gatherSpeedPct: number;
  gatherDoubleChance: number;
  gatherEfficiencyPct: number;
  craftSpeedPct: number;
  craftEfficiencyPct: number;
  xpGainPct: number;
  goldGainPct: number;
  rareFindPct: number;
  caravanBountyRewardPct: number;
  alchemyBatchBonusCharges: number;
}

export function getAstralRelicsBonuses(
  player?: Pick<EnhancedPlayerState, "astralRelics"> | null
): AstralRelicsBonuses {
  const ar = player?.astralRelics as
    | {
        ancientRelicShards?: number;
        expeditionXp?: number;
        curatorRank?: number;
        totalSurveys?: number;
        totalRestorations?: number;
        pedestalRanks?: Partial<Record<string, number>> | null;
      }
    | undefined
    | null;

  if (!ar || typeof ar !== "object") {
    return {
      curatorRank: 1,
      curatorTitle: ASTRAL_CURATOR_TIERS[0].title,
      surveyBonusShards: 0,
      restoredCount: 0,
      totalRelicLevels: 0,
      fullGalleryResonanceTier: 0,
      fullGalleryResonanceTitle: null,
      bonusAtk: 0,
      bonusDef: 0,
      bonusHp: 0,
      combatAtkPct: 0,
      armorPenPct: 0,
      bossArmorBreakPct: 0,
      relicCritAmpPct: 0,
      intervalMult: 1,
      critRateBonusPct: 0,
      critDmgBonusPct: 0,
      potionBuffMult: 1,
      gatherSpeedPct: 0,
      gatherDoubleChance: 0,
      gatherEfficiencyPct: 0,
      craftSpeedPct: 0,
      craftEfficiencyPct: 0,
      xpGainPct: 0,
      goldGainPct: 0,
      rareFindPct: 0,
      caravanBountyRewardPct: 0,
      alchemyBatchBonusCharges: 0,
    };
  }

  const cleanSurveys =
    Number.isFinite(Number(ar.totalSurveys)) && Number(ar.totalSurveys) > 0
      ? Math.floor(Number(ar.totalSurveys))
      : 0;
  const cleanRestorations =
    Number.isFinite(Number(ar.totalRestorations)) && Number(ar.totalRestorations) > 0
      ? Math.floor(Number(ar.totalRestorations))
      : 0;
  const rawXp =
    Number.isFinite(Number(ar.expeditionXp)) && Number(ar.expeditionXp) > 0
      ? Math.floor(Number(ar.expeditionXp))
      : 0;
  const derivedXp = Math.max(
    rawXp,
    cleanSurveys * ASTRAL_MIN_SURVEY_XP + cleanRestorations * ASTRAL_MIN_RESTORE_XP
  );
  const { current: tier } = getAstralCuratorTier(derivedXp, ar.curatorRank);

  let restoredCount = 0;
  let totalRelicLevels = 0;
  let bonusAtk = 0;
  let bonusDef = 0;
  let bonusHp = 0;
  let combatAtkPct = tier.combatAtkPct;
  let armorPenPct = 0;
  let bossArmorBreakPct = 0;
  let relicCritAmpPct = 0;
  let intervalReductionPct = 0;
  let critRateBonusPct = 0;
  let critDmgBonusPct = 0;
  let potionBuffPct = 0;
  let gatherSpeedPct = tier.gatherSpeedPct;
  let gatherDoubleChance = 0;
  let gatherEfficiencyPct = 0;
  let craftSpeedPct = tier.craftSpeedPct;
  let craftEfficiencyPct = 0;
  let xpGainPct = 0;
  let goldGainPct = tier.goldGainPct;
  let rareFindPct = tier.rareFindPct;
  let caravanBountyRewardPct = 0;
  let alchemyBatchBonusCharges = 0;

  const rawRanks =
    ar.pedestalRanks && typeof ar.pedestalRanks === "object"
      ? (ar.pedestalRanks as Partial<Record<string, number>>)
      : {};
  const cleanRanks: Record<SacredRelicId, number> = {
    solar_spear: 0,
    verdant_chalice: 0,
    titan_anvil: 0,
    chimera_censer: 0,
  };

  const applyStats = (s: SacredRelicLevelStats) => {
    if (s.bonusAtk) bonusAtk += s.bonusAtk;
    if (s.bonusDef) bonusDef += s.bonusDef;
    if (s.bonusHp) bonusHp += s.bonusHp;
    if (s.combatAtkPct) combatAtkPct += s.combatAtkPct;
    if (s.armorPenPct) armorPenPct += s.armorPenPct;
    if (s.bossArmorBreakPct) bossArmorBreakPct += s.bossArmorBreakPct;
    if (s.relicCritAmpPct) relicCritAmpPct += s.relicCritAmpPct;
    if (s.intervalReductionPct) intervalReductionPct += s.intervalReductionPct;
    if (s.critRateBonusPct) critRateBonusPct += s.critRateBonusPct;
    if (s.critDmgBonusPct) critDmgBonusPct += s.critDmgBonusPct;
    if (s.potionBuffPct) potionBuffPct += s.potionBuffPct;
    if (s.gatherSpeedPct) gatherSpeedPct += s.gatherSpeedPct;
    if (s.gatherDoubleChance) gatherDoubleChance += s.gatherDoubleChance;
    if (s.gatherEfficiencyPct) gatherEfficiencyPct += s.gatherEfficiencyPct;
    if (s.rareFindPct) rareFindPct += s.rareFindPct;
    if (s.craftSpeedPct) craftSpeedPct += s.craftSpeedPct;
    if (s.craftEfficiencyPct) craftEfficiencyPct += s.craftEfficiencyPct;
    if (s.xpGainPct) xpGainPct += s.xpGainPct;
    if (s.goldGainPct) goldGainPct += s.goldGainPct;
    if (s.caravanBountyRewardPct) caravanBountyRewardPct += s.caravanBountyRewardPct;
    if (s.alchemyBatchBonusCharges) alchemyBatchBonusCharges += s.alchemyBatchBonusCharges;
  };

  for (const meta of SACRED_RELIC_PEDESTALS) {
    const r = Number(rawRanks[meta.id]);
    const cleanRank = Number.isFinite(r) && r >= 1 ? Math.min(SACRED_RELIC_MAX_RANK, Math.floor(r)) : 0;
    cleanRanks[meta.id] = cleanRank;
    if (cleanRank >= 1) {
      restoredCount += 1;
      totalRelicLevels += cleanRank;
      const lvlStats = meta.levels[cleanRank - 1];
      if (lvlStats) applyStats(lvlStats);
    }
  }

  const fullResonance = getFullGalleryResonance(cleanRanks);
  if (fullResonance) {
    applyStats(fullResonance.bonuses);
  }

  const finalArmorPen = Math.min(0.65, Math.round(armorPenPct * 1000) / 1000);
  const finalBossBreak = Math.min(0.65, Math.round(bossArmorBreakPct * 1000) / 1000);
  const intervalMult =
    intervalReductionPct > 0
      ? Math.max(0.75, Math.round((1 - intervalReductionPct / 100) * 1000) / 1000)
      : 1;
  const potionBuffMult =
    potionBuffPct > 0
      ? Math.round((1 + potionBuffPct / 100) * 1000) / 1000
      : 1;
  const finalCritRate = Math.round(critRateBonusPct * 10) / 10;
  const finalGatherDouble = Math.min(0.6, Math.round(gatherDoubleChance * 1000) / 1000);

  return {
    curatorRank: tier.level,
    curatorTitle: tier.title,
    surveyBonusShards: tier.surveyBonusShards,
    restoredCount,
    totalRelicLevels,
    fullGalleryResonanceTier: fullResonance ? fullResonance.tier : 0,
    fullGalleryResonanceTitle: fullResonance ? fullResonance.title : null,
    bonusAtk,
    bonusDef,
    bonusHp,
    combatAtkPct,
    armorPenPct: finalArmorPen,
    bossArmorBreakPct: finalBossBreak,
    relicCritAmpPct,
    intervalMult,
    critRateBonusPct: finalCritRate,
    critDmgBonusPct,
    potionBuffMult,
    gatherSpeedPct,
    gatherDoubleChance: finalGatherDouble,
    gatherEfficiencyPct,
    craftSpeedPct,
    craftEfficiencyPct,
    xpGainPct,
    goldGainPct,
    rareFindPct,
    caravanBountyRewardPct,
    alchemyBatchBonusCharges,
  };
}

/** 确保 astralRelics 状态存在并净化脏档数据，同时自动维护每日免费遗迹勘探次数重置 */
export function ensureAstralRelics(
  player: EnhancedPlayerState,
  now: Date = new Date()
): AstralRelicsState {
  if (!player.inventory || typeof player.inventory !== "object") {
    player.inventory = { gold: 0 };
  }
  const cleanNonNeg = (v: unknown, fallback = 0): number =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallback;

  if (!player.astralRelics || typeof player.astralRelics !== "object") {
    player.astralRelics = {
      ancientRelicShards: 2,
      expeditionXp: 0,
      curatorRank: 1,
      totalSurveys: 0,
      totalRestorations: 0,
      pedestalRanks: {
        solar_spear: 0,
        verdant_chalice: 0,
        titan_anvil: 0,
        chimera_censer: 0,
      },
    };
  }

  const ar = player.astralRelics;
  ar.ancientRelicShards = cleanNonNeg(ar.ancientRelicShards, 0);
  ar.totalSurveys = cleanNonNeg(ar.totalSurveys, 0);
  ar.totalRestorations = cleanNonNeg(ar.totalRestorations, 0);

  const rawRanks =
    ar.pedestalRanks && typeof ar.pedestalRanks === "object"
      ? (ar.pedestalRanks as Record<string, unknown>)
      : {};
  const cleanRanks = {} as Record<SacredRelicId, number>;
  for (const rid of SACRED_RELIC_IDS) {
    const r = Number(rawRanks[rid]);
    cleanRanks[rid] = Number.isFinite(r) && r >= 0 ? Math.min(SACRED_RELIC_MAX_RANK, Math.floor(r)) : 0;
  }
  ar.pedestalRanks = cleanRanks;

  const rawXp = cleanNonNeg(ar.expeditionXp, 0);
  const tierInfo = getAstralCuratorTier(
    Math.max(rawXp, ar.totalSurveys * ASTRAL_MIN_SURVEY_XP + ar.totalRestorations * ASTRAL_MIN_RESTORE_XP),
    ar.curatorRank
  );
  ar.expeditionXp = tierInfo.effectiveXp;
  ar.curatorRank = tierInfo.current.level;

  const today = todayLocal(now);
  if (
    !ar.dailySurvey ||
    typeof ar.dailySurvey !== "object" ||
    ar.dailySurvey.date !== today
  ) {
    ar.dailySurvey = { date: today, claimedCount: 0 };
  } else {
    ar.dailySurvey.claimedCount = Math.min(
      ASTRAL_DAILY_FREE_SURVEYS,
      cleanNonNeg(ar.dailySurvey.claimedCount, 0)
    );
  }

  return ar;
}

/** 派遣「星界远古遗迹勘探队」进入指定地层（支持每日免费勘探 / 金币补给发掘 / 星晶尘深层精勘） */
export function dispatchAstralExpedition(
  player: EnhancedPlayerState,
  stratumId: AstralRuinStratumId,
  mode: ExpeditionSurveyMode = "free",
  now: Date = new Date()
): {
  ok: boolean;
  reason?: string;
  stratumId?: AstralRuinStratumId;
  mode?: ExpeditionSurveyMode;
  shardsGained?: number;
  astralDustGained?: number;
  expeditionXpGained?: number;
  isVeinJackpot?: boolean;
  remainingFreeToday?: number;
  leveledUpTo?: number;
} {
  ensurePlayerExtensions(player);
  const ar = ensureAstralRelics(player, now);
  const ct = ensureCaravanTrade(player, now);

  if (!isValidAstralRuinStratumId(stratumId)) {
    return { ok: false, reason: "未知的星界远古遗迹地层" };
  }
  const stratum = ASTRAL_RUIN_STRATA.find((s) => s.id === stratumId)!;
  if (ar.curatorRank < stratum.minCuratorRank) {
    return {
      ok: false,
      reason: `「${stratum.name}」需勘探馆长等阶达到 Lv.${stratum.minCuratorRank} 方可深入（当前 Lv.${ar.curatorRank}）`,
    };
  }
  if (mode !== "free" && mode !== "coin" && mode !== "astral_dust") {
    return { ok: false, reason: "未知的勘探派遣模式" };
  }

  const spec = stratum.modes[mode];
  if (mode === "free") {
    const used = ar.dailySurvey?.claimedCount || 0;
    if (used >= ASTRAL_DAILY_FREE_SURVEYS) {
      return {
        ok: false,
        reason: `今日免费遗迹勘探次数已用尽（每日上限 ${ASTRAL_DAILY_FREE_SURVEYS} 次；可改派金币补给勘探或星晶尘深层发掘）`,
      };
    }
    ar.dailySurvey!.claimedCount = used + 1;
  } else if (mode === "coin") {
    const haveGold = Math.floor(Number(player.inventory.gold || 0));
    if (haveGold < spec.costGold) {
      return {
        ok: false,
        reason: `金币不足（派遣「${stratum.name}」补给勘探队需 ${spec.costGold} 金币，当前 ${haveGold} 金币）`,
      };
    }
    player.inventory.gold = haveGold - spec.costGold;
  } else {
    if (ct.astralCrystalDust < spec.costAstralDust) {
      return {
        ok: false,
        reason: `异域星晶尘不足（开启「${stratum.name}」深层晶脉发掘需 ${spec.costAstralDust} 星晶尘，当前 ${ct.astralCrystalDust}）`,
      };
    }
    ct.astralCrystalDust -= spec.costAstralDust;
  }

  const prevRank = ar.curatorRank;
  const settled = previewExpeditionSurveyYield(stratumId, mode, ar.totalSurveys, ar.curatorRank);
  ar.ancientRelicShards += settled.shardsGained;
  ct.astralCrystalDust += settled.astralDustGained;
  ar.expeditionXp += settled.expeditionXpGained;
  ar.totalSurveys += 1;

  const nextTier = getAstralCuratorTier(ar.expeditionXp, ar.curatorRank);
  ar.curatorRank = nextTier.current.level;

  addReputation(player, Math.max(3, Math.floor(settled.expeditionXpGained / 5)));
  syncAchievements(player);

  const veinTag = settled.isVeinJackpot ? "【触发星脉富矿共鸣】" : "";
  appendLog(
    player,
    `星界勘探队自「${stratum.name}」凯旋${veinTag}：远古圣物残片 +${settled.shardsGained}、异域星晶尘 +${settled.astralDustGained}、勘探历练 +${settled.expeditionXpGained}！`
  );
  if (ar.curatorRank > prevRank) {
    appendLog(
      player,
      `传世圣物馆长等阶晋升至 Lv.${ar.curatorRank}「${nextTier.current.title}」！更深遗迹地层与全局圣馆被动同步解锁！`
    );
  }

  const remainingFreeToday = Math.max(0, ASTRAL_DAILY_FREE_SURVEYS - (ar.dailySurvey?.claimedCount || 0));
  return {
    ok: true,
    stratumId,
    mode,
    shardsGained: settled.shardsGained,
    astralDustGained: settled.astralDustGained,
    expeditionXpGained: settled.expeditionXpGained,
    isVeinJackpot: settled.isVeinJackpot,
    remainingFreeToday,
    ...(ar.curatorRank > prevRank ? { leveledUpTo: ar.curatorRank } : {}),
  };
}

/** 修复或升阶「传世圣物陈列馆」四大圣物基座（Lv.0 -> Lv.1~5，跨转生永久保留） */
export function upgradeSacredRelicPedestal(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack | undefined,
  relicId: SacredRelicId,
  mode: RelicUpgradeMode = "standard",
  now: Date = new Date()
): {
  ok: boolean;
  reason?: string;
  relicId?: SacredRelicId;
  newRank?: number;
  expeditionXpGained?: number;
  leveledUpTo?: number;
  awakenedResonanceTier?: number;
  awakenedResonanceTitle?: string | null;
} {
  ensurePlayerExtensions(player);
  const ar = ensureAstralRelics(player, now);
  const ct = ensureCaravanTrade(player, now);

  if (!isValidSacredRelicId(relicId)) {
    return { ok: false, reason: "未知的传世圣物基座" };
  }
  if (mode !== "standard" && mode !== "astral_dust") {
    return { ok: false, reason: "未知的圣物修复升阶模式" };
  }

  const meta = SACRED_RELIC_PEDESTALS.find((p) => p.id === relicId)!;
  const curRank = ar.pedestalRanks[relicId] || 0;
  if (curRank >= SACRED_RELIC_MAX_RANK) {
    return { ok: false, reason: `「${meta.name}」已达传世圣物最高满阶（Lv.${SACRED_RELIC_MAX_RANK}）` };
  }

  const targetRank = (curRank + 1) as 1 | 2 | 3 | 4 | 5;
  const costTier = RELIC_PEDESTAL_UPGRADE_COSTS.find((c) => c.targetRank === targetRank);
  if (!costTier) {
    return { ok: false, reason: "未找到对应圣物升阶配方" };
  }

  const itemsById = new Map<string, string>(
    (((contentPack?.items as Array<{ id: string; name?: string }> | undefined) || [])).map((it) => [
      it.id,
      it.name || it.id,
    ])
  );

  const haveGold = Math.floor(Number(player.inventory.gold || 0));
  if (mode === "standard") {
    const std = costTier.standard;
    if (ar.ancientRelicShards < std.ancientRelicShards) {
      return {
        ok: false,
        reason: `远古圣物残片不足（需 ${std.ancientRelicShards} 枚，当前 ${ar.ancientRelicShards} 枚；可先派遣星界遗迹勘探队获取）`,
      };
    }
    if (haveGold < std.gold) {
      return { ok: false, reason: `金币不足（需 ${std.gold} 金币，当前 ${haveGold} 金币）` };
    }
    for (const [iid, needQty] of Object.entries(std.items)) {
      const idleHave = getIdleCargoCount(player, iid);
      if (idleHave < needQty) {
        const nm = itemsById.get(iid) || iid;
        return { ok: false, reason: `闲置晶石「${nm}」不足（需 ${needQty} 件，当前可用 ${idleHave} 件）` };
      }
    }

    ar.ancientRelicShards -= std.ancientRelicShards;
    player.inventory.gold = haveGold - std.gold;
    for (const [iid, needQty] of Object.entries(std.items)) {
      player.inventory[iid] = Math.max(0, Number(player.inventory[iid] || 0) - needQty);
      if (player.inventory[iid] <= 0) delete player.inventory[iid];
    }
  } else {
    const dustMode = costTier.astralDust;
    if (ar.ancientRelicShards < dustMode.ancientRelicShards) {
      return {
        ok: false,
        reason: `远古圣物残片不足（星晶速修需 ${dustMode.ancientRelicShards} 枚，当前 ${ar.ancientRelicShards} 枚）`,
      };
    }
    if (ct.astralCrystalDust < dustMode.astralCrystalDust) {
      return {
        ok: false,
        reason: `异域星晶尘不足（星晶速修需 ${dustMode.astralCrystalDust} 星晶尘，当前 ${ct.astralCrystalDust}）`,
      };
    }
    if (haveGold < dustMode.gold) {
      return { ok: false, reason: `金币不足（星晶速修需 ${dustMode.gold} 金币，当前 ${haveGold} 金币）` };
    }

    ar.ancientRelicShards -= dustMode.ancientRelicShards;
    ct.astralCrystalDust -= dustMode.astralCrystalDust;
    player.inventory.gold = haveGold - dustMode.gold;
  }

  const prevRank = ar.curatorRank;
  const prevResTier = getFullGalleryResonance(ar.pedestalRanks)?.tier || 0;

  ar.pedestalRanks[relicId] = targetRank;
  ar.totalRestorations += 1;
  ar.expeditionXp += costTier.expeditionXpGain;

  const nextTier = getAstralCuratorTier(ar.expeditionXp, ar.curatorRank).current;
  ar.curatorRank = nextTier.level;

  const nextRes = getFullGalleryResonance(ar.pedestalRanks);
  const nextResTier = nextRes?.tier || 0;

  addReputation(player, 8 + targetRank * 4);
  syncAchievements(player);

  appendLog(
    player,
    targetRank === 1
      ? `传世圣物「${meta.name}」真身修复完成（Lv.1）！永久圣物祝福已注入陈列馆（转生永久保留）！`
      : `传世圣物「${meta.name}」升阶至 Lv.${targetRank}！圣物威能进一步跃升！`
  );
  if (nextResTier > prevResTier && nextRes) {
    appendLog(
      player,
      `全馆共鸣觉醒 —— 激活 Lv.${nextRes.tier}「${nextRes.title}」！四大圣物同辉，全属性共鸣加成生效！`
    );
  }
  if (ar.curatorRank > prevRank) {
    appendLog(
      player,
      `传世圣物馆长等阶晋升至 Lv.${ar.curatorRank}「${nextTier.title}」！永久全局加成同步提升！`
    );
  }

  return {
    ok: true,
    relicId,
    newRank: targetRank,
    expeditionXpGained: costTier.expeditionXpGain,
    ...(ar.curatorRank > prevRank ? { leveledUpTo: ar.curatorRank } : {}),
    ...(nextResTier > prevResTier
      ? { awakenedResonanceTier: nextResTier, awakenedResonanceTitle: nextRes?.title || null }
      : {}),
  };
}

/** 构造前端「星界远古遗迹勘探队 & 传世圣物陈列馆」面板完整视图数据 */
export function getAstralRelicsInfo(
  player: EnhancedPlayerState,
  contentPack?: EnhancedContentPack,
  now: Date = new Date()
) {
  ensurePlayerExtensions(player);
  const ar = ensureAstralRelics(player, now);
  const ct = ensureCaravanTrade(player, now);

  const itemsMap = new Map<string, { id: string; name?: string }>(
    (((contentPack?.items as Array<{ id: string; name?: string }> | undefined) || [])).map((it) => [it.id, it])
  );

  const tierInfo = getAstralCuratorTier(ar.expeditionXp, ar.curatorRank);
  const bonuses = getAstralRelicsBonuses(player);
  const haveGold = Math.floor(Number(player.inventory.gold || 0));
  const usedFreeToday = ar.dailySurvey?.claimedCount || 0;
  const remainingFreeToday = Math.max(0, ASTRAL_DAILY_FREE_SURVEYS - usedFreeToday);

  const nextSurveyNumber = ar.totalSurveys + 1;
  const remToVein = nextSurveyNumber % ASTRAL_VEIN_CADENCE;
  const surveysUntilVeinJackpot = remToVein === 0 ? 1 : ASTRAL_VEIN_CADENCE - remToVein + 1;

  const strata = ASTRAL_RUIN_STRATA.map((st) => {
    const unlocked = ar.curatorRank >= st.minCuratorRank;
    const freePreview = previewExpeditionSurveyYield(st.id, "free", ar.totalSurveys, ar.curatorRank);
    const coinPreview = previewExpeditionSurveyYield(st.id, "coin", ar.totalSurveys, ar.curatorRank);
    const dustPreview = previewExpeditionSurveyYield(st.id, "astral_dust", ar.totalSurveys, ar.curatorRank);

    return {
      id: st.id,
      name: st.name,
      subtitle: st.subtitle,
      description: st.description,
      iconId: st.iconId,
      minCuratorRank: st.minCuratorRank,
      unlocked,
      veinBonus: st.veinBonus,
      surveyOptions: {
        free: {
          remainingToday: remainingFreeToday,
          maxPerDay: ASTRAL_DAILY_FREE_SURVEYS,
          preview: freePreview,
          canAfford: unlocked && remainingFreeToday > 0,
        },
        coin: {
          costGold: st.modes.coin.costGold,
          preview: coinPreview,
          canAfford: unlocked && haveGold >= st.modes.coin.costGold,
        },
        astralDust: {
          costAstralDust: st.modes.astral_dust.costAstralDust,
          preview: dustPreview,
          canAfford: unlocked && ct.astralCrystalDust >= st.modes.astral_dust.costAstralDust,
        },
      },
    };
  });

  const pedestals = SACRED_RELIC_PEDESTALS.map((meta) => {
    const rank = ar.pedestalRanks[meta.id] || 0;
    const isRestored = rank >= 1;
    const nextRank = rank < SACRED_RELIC_MAX_RANK ? ((rank + 1) as 1 | 2 | 3 | 4 | 5) : null;
    const costTier = nextRank
      ? RELIC_PEDESTAL_UPGRADE_COSTS.find((c) => c.targetRank === nextRank) || null
      : null;

    const stdItems = costTier
      ? Object.entries(costTier.standard.items).map(([iid, needQty]) => ({
          itemId: iid,
          name: itemsMap.get(iid)?.name || iid,
          need: needQty,
          have: getIdleCargoCount(player, iid),
        }))
      : [];

    const canUpgradeStandard = Boolean(
      costTier &&
        ar.ancientRelicShards >= costTier.standard.ancientRelicShards &&
        haveGold >= costTier.standard.gold &&
        stdItems.every((it) => it.have >= it.need)
    );

    const canUpgradeAstralDust = Boolean(
      costTier &&
        ar.ancientRelicShards >= costTier.astralDust.ancientRelicShards &&
        ct.astralCrystalDust >= costTier.astralDust.astralCrystalDust &&
        haveGold >= costTier.astralDust.gold
    );

    return {
      id: meta.id,
      name: meta.name,
      subtitle: meta.subtitle,
      description: meta.description,
      iconId: meta.iconId,
      rank,
      maxRank: meta.maxRank,
      isRestored,
      currentStats: isRestored ? meta.levels[rank - 1] : null,
      nextStats: nextRank ? meta.levels[nextRank - 1] : null,
      upgradeOptions: costTier
        ? {
            targetRank: costTier.targetRank,
            expeditionXpGain: costTier.expeditionXpGain,
            standard: {
              ancientRelicShards: costTier.standard.ancientRelicShards,
              gold: costTier.standard.gold,
              items: stdItems,
              canAfford: canUpgradeStandard,
            },
            astralDust: {
              ancientRelicShards: costTier.astralDust.ancientRelicShards,
              astralCrystalDust: costTier.astralDust.astralCrystalDust,
              gold: costTier.astralDust.gold,
              canAfford: canUpgradeAstralDust,
            },
          }
        : null,
    };
  });

  const activeFullRes = getFullGalleryResonance(ar.pedestalRanks);
  const nextResTierNum = (activeFullRes ? activeFullRes.tier + 1 : 1) as 1 | 2 | 3 | 4 | 5 | 6;
  const nextFullRes =
    nextResTierNum <= 5
      ? FULL_GALLERY_RESONANCE_TIERS.find((t) => t.tier === nextResTierNum) || null
      : null;

  return {
    nowMs: now.getTime(),
    gold: haveGold,
    ancientRelicShards: ar.ancientRelicShards,
    astralCrystalDust: ct.astralCrystalDust,
    expeditionXp: ar.expeditionXp,
    curatorRank: ar.curatorRank,
    totalSurveys: ar.totalSurveys,
    totalRestorations: ar.totalRestorations,
    surveysUntilVeinJackpot,
    isNextSurveyVeinJackpot: surveysUntilVeinJackpot === 1,
    dailySurvey: {
      date: ar.dailySurvey?.date || todayLocal(now),
      usedToday: usedFreeToday,
      maxPerDay: ASTRAL_DAILY_FREE_SURVEYS,
      remainingToday: remainingFreeToday,
    },
    curatorTier: {
      level: tierInfo.current.level,
      title: tierInfo.current.title,
      minXp: tierInfo.current.minXp,
      nextLevelXp: tierInfo.next?.minXp ?? null,
      nextTitle: tierInfo.next?.title ?? null,
      progressPct: tierInfo.progressPct,
      allTiers: ASTRAL_CURATOR_TIERS,
    },
    strata,
    pedestals,
    fullGalleryResonance: {
      activeTier: activeFullRes ? activeFullRes.tier : 0,
      current: activeFullRes,
      next: nextFullRes,
      allTiers: FULL_GALLERY_RESONANCE_TIERS,
    },
    bonuses,
  };
}
