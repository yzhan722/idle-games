// 进阶进度 · 声望系统
// 从 progression2.ts 原样拆出；对外一律从 "../progression2" 引用。

import type { EnhancedContentPack, EnhancedPlayerState, ReputationTierDef, ReputationState } from "../types";
import { ensurePlayerExtensions, appendLog } from "../storage";
import { syncAchievements } from "../progression";
import { todayLocal } from "../time";
import { PROTECTION_MIRROR_ID } from "../enhancement_math";
import { GUILD_HONOR_SHOP } from "./guild_bounty";

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
    summary: "军需官特批强化定纹镜，强化失败时只降 1 级，不归零",
    effectText: "立即获得 定纹镜 ×1",
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
    summary: "前线军需署签发的讨伐战卷，提高单人与组队讨伐的经验与金币",
    effectText: "2小时内 经验 +20% · 战斗金币 +20%（可叠加至12小时）",
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
    effectText: "佩戴加成：采集速度 +4% · 制作速度 +4% · 战斗金币 +4%",
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
    effectText: "佩戴加成：经验获取 +6% · 战斗金币 +5%",
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
    effectText: "佩戴加成：采集/制作速度与经验/战斗金币 各 +6%",
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
    grantedItems.push({ itemId: PROTECTION_MIRROR_ID, name: "定纹镜", qty: 1 });
    rewardSummary = "获得 定纹镜 ×1";
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
