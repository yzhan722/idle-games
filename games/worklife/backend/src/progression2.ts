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
  StarEmblemId,
  GuildTrialPactId,
  SkyForgeState,
  HarborGroundId,
  HarborBaitId,
  HarborSpeciesId,
  HarborDerbyTierId,
  HarborTrophyTierId,
  HarborTankThemeId,
  HarborCatchRecord,
  HarborDerbySettlement,
  HarborDerbyState,
  HarborAquariumState,
  AcademyDepartmentId,
  AcademyCourseId,
  AcademyActiveCourse,
  AcademyGraduationRecord,
  AdventurerAcademyState,
  FestivalSeasonId,
  FestivalCommissionId,
  FestivalCommissionKind,
  FestivalShopItemId,
  FestivalShopItemKind,
  FestivalRolloverRecord,
  FestivalCalendarState,
  ArenaDivisionId,
  ArenaArchetypeId,
  TownFacilityId,
  ArenaSettlementRecord,
  ArenaDuelRecord,
  SkyArenaState,
  GuildTownState,
  GuildTownUpgradeRecord,
  ContractBeastId,
  BeastRoleId,
  WeatherId,
  ContractBeastRecord,
  BeastRanchEventRecord,
  BeastRanchState,
  WeatherForecastRecord,
  WeatherHistoryRecord,
  WeatherTowerState,
  TavernVisitorId,
  TavernBalladId,
  ChronicleChapterId,
  ChronicleMetricId,
  TavernActiveBallad,
  TavernServeRecord,
  BardTavernState,
  AdventurerChronicleState,
  AirshipTownId,
  AirshipGoodId,
  AirshipRouteId,
  AirshipRouteRecord,
  AirshipVoyage,
  AirshipSaleRecord,
  AirshipArrivalRecord,
  AirshipTradeState,
  PaladinVirtueId,
  PaladinThemeId,
  PaladinDuelRecord,
  PaladinTrialState,
  MineGradeId,
  ElfExpeditionSourceId,
  DwarfMineHaul,
  DwarfMineHaulRecord,
  DwarfMineState,
  ElfWaystationState,
  PrestigeState,
  PlayerStats
} from "./types";
import { ensurePlayerExtensions, appendLog } from "./storage";
import { defaultCombatSkills } from "./combat_skills";
import { syncAchievements } from "./progression";
import { todayLocal } from "./time";
import { PROTECTION_MIRROR_ID } from "./enhancement_math";
// WL-13 天空竞技场：擂主对决直接复用 hp_combat 真实战斗引擎（与 storage 一样仅在函数体内运行时引用，循环依赖求值期安全）
import { playerBuildExtras, startHpCombat, tickHpCombat } from "./hp_combat";
import { playerCombatant } from "./first_hour_combat";

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
  // WL-10：天空锻炉神兵纹章等阶与已签契约跨转生永久保留（此处只净化，不重置）
  if (player.skyForge) {
    ensureSkyForge(player);
  }
  // WL-11：海港水族馆收藏图鉴、奖杯柜、稀有鱼饵配方与鱼饵库存跨转生永久保留（无参净化，不翻周）
  if (player.harborDerby) {
    ensureHarborDerby(player);
  }
  if (player.harborAquarium) {
    ensureHarborAquarium(player);
  }
  // WL-12：冒险者学院四系学分 / 结业记录 / 进行中的课程与四季纪念章跨转生永久保留（无参净化，不结业、不翻季）
  if (player.adventurerAcademy) {
    ensureAdventurerAcademy(player);
  }
  if (player.festivalCalendar) {
    ensureFestivalCalendar(player);
  }
  // WL-13：天空竞技场赛季梯级 / 称号 / 竞技场勋章与公会城镇设施跨转生永久保留（无参净化，不翻季、不换日）
  if (player.skyArena) {
    ensureSkyArena(player);
  }
  if (player.guildTown) {
    ensureGuildTown(player);
  }
  // WL-14：契约魔兽牧场（魔兽 / 等级 / 出战伙伴）与天候观星塔（占卜 / 祈愿 / 阅历）跨转生永久保留（无参净化，不换日）
  if (player.beastRanch) {
    ensureBeastRanch(player);
  }
  if (player.weatherTower) {
    ensureWeatherTower(player);
  }
  // WL-15：吟游诗人酒馆（名望 / 招待记录 / 正在演唱的诗篇）与冒险者编年史（已编撰章节 / 称号）跨转生永久保留（无参净化，不换日）
  if (player.bardTavern) {
    ensureBardTavern(player);
  }
  if (player.adventurerChronicle) {
    ensureAdventurerChronicle(player);
  }
  // WL-16：浮空飞艇商路（已开辟航线 / 航线等级 / 船体 / 停靠港 / 进行中的航程）与圣骑士团荣誉试炼（勋章 / 誓言 / 本周进度）
  // 跨转生永久保留（无参净化，不换日、不翻周、不抵港）；货舱里的特产随转生清空——金币已重置，不能借货物把旧世界的财富带进新一世
  if (player.airshipTrade) {
    clearAirshipCargoForPrestige(player);
  }
  if (player.paladinTrial) {
    ensurePaladinTrial(player);
  }
  // WL-17：矮人地底矿脉（矿道深度 / 矿车 / 今日矿脉进度 / 累计记录）与精灵林地驿站（林地好感 / 今日委托板 / 远征基线）
  // 跨转生永久保留（无参净化，不换日、不回矿）；在途矿车里的矿石随转生散去——背包已重置，不能借矿车把旧世界的财富带进新一世
  if (player.dwarfMine) {
    clearDwarfMineHaulForPrestige(player);
  }
  if (player.elfWaystation) {
    ensureElfWaystation(player);
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
export function ensureCaravanTrade(player: EnhancedPlayerState, now?: Date): CaravanTradeState {
  // 仅显式传入 now（指令/视图时钟）时才做每日翻篇；无参调用（ensurePlayerExtensions / 转生净化）只做脏档净化，
  // 避免墙钟与指令时钟跨日不一致时把当日契约板与兑换计数重置。
  const clock = now ?? new Date();
  const rollDaily = now !== undefined;
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
    const startedAt = cleanNonNeg(w.startedAt, clock.getTime());
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

  const today = todayLocal(clock);
  if (
    !ct.contractsBoard ||
    typeof ct.contractsBoard !== "object" ||
    typeof ct.contractsBoard.date !== "string" ||
    (rollDaily && ct.contractsBoard.date !== today) ||
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
    typeof ct.dailyDustExchanges.date !== "string" ||
    (rollDaily && ct.dailyDustExchanges.date !== today)
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
  now?: Date
): AlchemyCauldronState {
  // 仅显式 now 才翻篇每日免费萃取；无参调用只做净化（见 ensureCaravanTrade 注释）。
  const rollDaily = now !== undefined;
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

  const today = todayLocal(now ?? new Date());
  if (
    !ac.dailyExtraction ||
    typeof ac.dailyExtraction !== "object" ||
    typeof ac.dailyExtraction.date !== "string" ||
    (rollDaily && ac.dailyExtraction.date !== today)
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
  now?: Date
): AstralRelicsState {
  // 仅显式 now 才翻篇每日免费勘探；无参调用只做净化（见 ensureCaravanTrade 注释）。
  const rollDaily = now !== undefined;
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

  const today = todayLocal(now ?? new Date());
  if (
    !ar.dailySurvey ||
    typeof ar.dailySurvey !== "object" ||
    typeof ar.dailySurvey.date !== "string" ||
    (rollDaily && ar.dailySurvey.date !== today)
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

/* ============================ 天空锻炉星辰神兵谱 & 公会秘境试炼契约阵 (WL-10) ============================ */
// 前端 frontend/src/gameplay/skyForge.ts 逐表逐式 1:1 镜像（scripts/sky-forge-parity.test.ts 守护）。
// - 神兵谱：消耗 WL-9「远古圣物残片」+「异域星晶尘」淬炼四大星辰传世神兵纹章 Lv.0~5（转生永久保留）。
// - 契约阵：纹章总阶解锁契约与阵位；每份契约 = 增益 + 代价（跨领域取舍）；同阵多契触发连携增益；
//   对应纹章 Lv.4+ 或锻炉满阶时该契约代价减半。签约消耗星晶尘，解约免费不退还。

export const STAR_EMBLEM_IDS: readonly StarEmblemId[] = [
  "star_blade",
  "crescent_bow",
  "star_hammer",
  "amethyst_staff",
];

export const GUILD_TRIAL_PACT_IDS: readonly GuildTrialPactId[] = [
  "ember_vanguard",
  "verdant_harvest",
  "forge_oath",
  "gale_hunt",
  "astral_covenant",
];

export const STAR_EMBLEM_MAX_LEVEL = 5;
export const SKY_FORGE_MAX_TOTAL_LEVELS = STAR_EMBLEM_MAX_LEVEL * 4;
export const GUILD_PACT_MAX_SLOTS = 3;
/** 对应纹章达到该等阶时，契约代价减半。 */
export const PACT_MITIGATION_EMBLEM_LEVEL = 4;
/** 锻炉达到该阶（神兵谱圆满）时，全部契约代价减半。 */
export const PACT_MITIGATION_FORGE_TIER = 4;

export interface StarEmblemLevelStats {
  bonusAtk?: number;
  bonusDef?: number;
  bonusHp?: number;
  combatAtkPct?: number;
  armorPenPct?: number;
  bossArmorBreakPct?: number;
  critRateBonusPct?: number;
  critDmgBonusPct?: number;
  intervalReductionPct?: number;
  gatherSpeedPct?: number;
  gatherDoubleChance?: number;
  gatherEfficiencyPct?: number;
  craftSpeedPct?: number;
  craftEfficiencyPct?: number;
  xpGainPct?: number;
  goldGainPct?: number;
  rareFindPct?: number;
}

export type StarEmblemDomain = "combat" | "hunt" | "craft" | "gather";

export interface StarEmblemMeta {
  id: StarEmblemId;
  name: string;
  subtitle: string;
  description: string;
  iconId: string;
  domain: StarEmblemDomain;
  domainLabel: string;
  levels: readonly [
    StarEmblemLevelStats,
    StarEmblemLevelStats,
    StarEmblemLevelStats,
    StarEmblemLevelStats,
    StarEmblemLevelStats,
  ];
}

export const STAR_EMBLEMS: readonly StarEmblemMeta[] = [
  {
    id: "star_blade",
    name: "星辉圣剑",
    subtitle: "战斗攻势 · 基础攻击、战斗攻击倍率与暴击",
    description: "以星辉淬火的传世圣剑纹章，永久提升基础攻击、战斗攻击百分比、暴击率与暴击伤害。",
    iconId: "star_emblem_blade",
    domain: "combat",
    domainLabel: "战斗",
    levels: [
      { bonusAtk: 5, combatAtkPct: 3, critRateBonusPct: 1.5, critDmgBonusPct: 6 },
      { bonusAtk: 10, combatAtkPct: 6, critRateBonusPct: 3, critDmgBonusPct: 12 },
      { bonusAtk: 16, combatAtkPct: 9, critRateBonusPct: 4.5, critDmgBonusPct: 19 },
      { bonusAtk: 23, combatAtkPct: 13, critRateBonusPct: 6, critDmgBonusPct: 27 },
      { bonusAtk: 31, combatAtkPct: 17, critRateBonusPct: 8, critDmgBonusPct: 36 },
    ],
  },
  {
    id: "crescent_bow",
    name: "新月长弓",
    subtitle: "疾猎贯星 · 攻速、破甲、首领破防与珍稀掉落",
    description: "新月弦光凝成的长弓纹章，永久缩短普攻间隔、提升护甲穿透与首领破甲，并提高狩猎珍稀掉落。",
    iconId: "star_emblem_bow",
    domain: "hunt",
    domainLabel: "狩猎",
    levels: [
      { intervalReductionPct: 2, armorPenPct: 0.03, bossArmorBreakPct: 0.02, rareFindPct: 3 },
      { intervalReductionPct: 3.5, armorPenPct: 0.05, bossArmorBreakPct: 0.04, rareFindPct: 6 },
      { intervalReductionPct: 5, armorPenPct: 0.08, bossArmorBreakPct: 0.06, rareFindPct: 10 },
      { intervalReductionPct: 6.5, armorPenPct: 0.11, bossArmorBreakPct: 0.08, rareFindPct: 14 },
      { intervalReductionPct: 8, armorPenPct: 0.14, bossArmorBreakPct: 0.1, rareFindPct: 19 },
    ],
  },
  {
    id: "star_hammer",
    name: "星铁战锤",
    subtitle: "神匠锻造 · 制作速度、制作连作与基础防御",
    description: "陨星铁锻成的战锤纹章，永久提升全制作速度、免费连作效率，并以星铁护体提高基础防御。",
    iconId: "star_emblem_hammer",
    domain: "craft",
    domainLabel: "制造",
    levels: [
      { bonusDef: 4, craftSpeedPct: 5, craftEfficiencyPct: 4 },
      { bonusDef: 8, craftSpeedPct: 10, craftEfficiencyPct: 8 },
      { bonusDef: 13, craftSpeedPct: 16, craftEfficiencyPct: 13 },
      { bonusDef: 19, craftSpeedPct: 22, craftEfficiencyPct: 18 },
      { bonusDef: 26, craftSpeedPct: 30, craftEfficiencyPct: 24 },
    ],
  },
  {
    id: "amethyst_staff",
    name: "紫晶法杖",
    subtitle: "秘法丰收 · 采集速度、双倍采集、技能经验与生命",
    description: "紫晶秘法凝结的法杖纹章，永久提升全采集速度与双倍采集几率、全技能经验，并以秘法护佑提高生命上限。",
    iconId: "star_emblem_staff",
    domain: "gather",
    domainLabel: "采集",
    levels: [
      { bonusHp: 15, gatherSpeedPct: 5, gatherDoubleChance: 0.03, xpGainPct: 2 },
      { bonusHp: 30, gatherSpeedPct: 10, gatherDoubleChance: 0.06, xpGainPct: 4 },
      { bonusHp: 50, gatherSpeedPct: 15, gatherDoubleChance: 0.09, xpGainPct: 7 },
      { bonusHp: 75, gatherSpeedPct: 21, gatherDoubleChance: 0.13, xpGainPct: 10 },
      { bonusHp: 105, gatherSpeedPct: 28, gatherDoubleChance: 0.17, xpGainPct: 14 },
    ],
  },
];

export interface StarEmblemForgeCostTier {
  targetLevel: 1 | 2 | 3 | 4 | 5;
  ancientRelicShards: number;
  astralCrystalDust: number;
}

export const STAR_EMBLEM_FORGE_COSTS: readonly StarEmblemForgeCostTier[] = [
  { targetLevel: 1, ancientRelicShards: 8, astralCrystalDust: 4 },
  { targetLevel: 2, ancientRelicShards: 16, astralCrystalDust: 9 },
  { targetLevel: 3, ancientRelicShards: 28, astralCrystalDust: 16 },
  { targetLevel: 4, ancientRelicShards: 44, astralCrystalDust: 26 },
  { targetLevel: 5, ancientRelicShards: 66, astralCrystalDust: 40 },
];

export interface SkyForgeTierDef {
  tier: 0 | 1 | 2 | 3 | 4;
  minTotalLevels: number;
  title: string;
  pactSlots: number;
}

export const SKY_FORGE_TIERS: readonly SkyForgeTierDef[] = [
  { tier: 0, minTotalLevels: 0, title: "冷寂天空锻炉", pactSlots: 0 },
  { tier: 1, minTotalLevels: 2, title: "星火初燃锻炉", pactSlots: 1 },
  { tier: 2, minTotalLevels: 7, title: "辉月熔铸天炉", pactSlots: 2 },
  { tier: 3, minTotalLevels: 13, title: "星穹神铸天炉", pactSlots: 3 },
  { tier: 4, minTotalLevels: 20, title: "太初星辰神兵天炉", pactSlots: 3 },
];

export interface GuildTrialPactDef {
  id: GuildTrialPactId;
  name: string;
  subtitle: string;
  description: string;
  iconId: string;
  pactTier: 1 | 2 | 3;
  unlockTotalLevels: number;
  alignedEmblem: StarEmblemId | null;
  signDust: number;
  boons: StarEmblemLevelStats;
  tradeoffs: StarEmblemLevelStats;
}

export const GUILD_TRIAL_PACTS: readonly GuildTrialPactDef[] = [
  {
    id: "ember_vanguard",
    name: "赤焰先锋试炼契",
    subtitle: "以工坊产能换取讨伐攻势",
    description: "立誓先锋讨伐秘境魔物：战斗攻击与暴击伤害大幅提升，但工坊制作速度下降。",
    iconId: "guild_trial_pact",
    pactTier: 1,
    unlockTotalLevels: 2,
    alignedEmblem: "star_blade",
    signDust: 3,
    boons: { combatAtkPct: 8, critDmgBonusPct: 12 },
    tradeoffs: { craftSpeedPct: -8 },
  },
  {
    id: "verdant_harvest",
    name: "翠野丰收试炼契",
    subtitle: "以战斗锋芒换取采集丰产",
    description: "立誓守护秘境翠野：采集速度与采集连作效率提升，但战斗攻击下降。",
    iconId: "guild_trial_pact",
    pactTier: 1,
    unlockTotalLevels: 2,
    alignedEmblem: "amethyst_staff",
    signDust: 3,
    boons: { gatherSpeedPct: 10, gatherEfficiencyPct: 8 },
    tradeoffs: { combatAtkPct: -4 },
  },
  {
    id: "forge_oath",
    name: "星铁匠誓试炼契",
    subtitle: "以采集节奏换取神匠连作",
    description: "立誓闭关星铁工坊：制作速度与免费连作效率提升，但采集速度下降。",
    iconId: "guild_trial_pact",
    pactTier: 2,
    unlockTotalLevels: 6,
    alignedEmblem: "star_hammer",
    signDust: 5,
    boons: { craftSpeedPct: 12, craftEfficiencyPct: 10 },
    tradeoffs: { gatherSpeedPct: -6 },
  },
  {
    id: "gale_hunt",
    name: "新月疾猎试炼契",
    subtitle: "以金币收益换取疾猎破甲",
    description: "立誓追猎新月秘境：攻速、护甲穿透与珍稀掉落提升，但全局金币收益下降。",
    iconId: "guild_trial_pact",
    pactTier: 2,
    unlockTotalLevels: 10,
    alignedEmblem: "crescent_bow",
    signDust: 6,
    boons: { intervalReductionPct: 4, armorPenPct: 0.06, rareFindPct: 8 },
    tradeoffs: { goldGainPct: -8 },
  },
  {
    id: "astral_covenant",
    name: "紫晶星盟终焉契",
    subtitle: "以攻势与产能换取星盟财富与经验",
    description: "与星盟缔结终焉之约：全局金币、全技能经验、双倍采集与暴击率提升，但战斗攻击与制作速度同时下降。",
    iconId: "guild_trial_pact",
    pactTier: 3,
    unlockTotalLevels: 15,
    alignedEmblem: null,
    signDust: 10,
    boons: { goldGainPct: 12, xpGainPct: 10, gatherDoubleChance: 0.05, critRateBonusPct: 3 },
    tradeoffs: { combatAtkPct: -6, craftSpeedPct: -6 },
  },
];

export interface GuildPactLinkTierDef {
  linkTier: 1 | 2;
  minActivePacts: number;
  title: string;
  subtitle: string;
  bonuses: StarEmblemLevelStats;
}

export const GUILD_PACT_LINK_TIERS: readonly GuildPactLinkTierDef[] = [
  {
    linkTier: 1,
    minActivePacts: 2,
    title: "双契连携·星辉共振",
    subtitle: "同时签署 2 份试炼契约",
    bonuses: { combatAtkPct: 3, gatherSpeedPct: 3, craftSpeedPct: 3, goldGainPct: 3 },
  },
  {
    linkTier: 2,
    minActivePacts: 3,
    title: "三契连携·秘境同心",
    subtitle: "同时签署 3 份试炼契约",
    bonuses: {
      combatAtkPct: 6,
      gatherSpeedPct: 6,
      craftSpeedPct: 6,
      goldGainPct: 6,
      intervalReductionPct: 2,
      xpGainPct: 4,
    },
  },
];

export function isValidStarEmblemId(id: unknown): id is StarEmblemId {
  return typeof id === "string" && (STAR_EMBLEM_IDS as readonly string[]).includes(id);
}

export function isValidGuildTrialPactId(id: unknown): id is GuildTrialPactId {
  return typeof id === "string" && (GUILD_TRIAL_PACT_IDS as readonly string[]).includes(id);
}

/** 纹章等阶净化：非数/负数 → 0，小数向下取整，上限 Lv.5。 */
export function cleanStarEmblemLevels(raw?: Partial<Record<string, unknown>> | null): Record<StarEmblemId, number> {
  const src = raw && typeof raw === "object" ? raw : {};
  const out = {} as Record<StarEmblemId, number>;
  for (const id of STAR_EMBLEM_IDS) {
    const n = Number(src[id]);
    out[id] = Number.isFinite(n) && n >= 0 ? Math.min(STAR_EMBLEM_MAX_LEVEL, Math.floor(n)) : 0;
  }
  return out;
}

export function sumStarEmblemLevels(levels: Record<StarEmblemId, number>): number {
  let total = 0;
  for (const id of STAR_EMBLEM_IDS) total += levels[id] || 0;
  return total;
}

export function getSkyForgeTier(totalEmblemLevels: number) {
  const total =
    Number.isFinite(totalEmblemLevels) && totalEmblemLevels > 0
      ? Math.min(SKY_FORGE_MAX_TOTAL_LEVELS, Math.floor(totalEmblemLevels))
      : 0;
  let current = SKY_FORGE_TIERS[0];
  let next: SkyForgeTierDef | null = null;
  for (let i = 0; i < SKY_FORGE_TIERS.length; i++) {
    if (total >= SKY_FORGE_TIERS[i].minTotalLevels) {
      current = SKY_FORGE_TIERS[i];
      next = SKY_FORGE_TIERS[i + 1] ?? null;
    }
  }
  const progressPct = next
    ? Math.min(
        100,
        Math.max(
          0,
          Math.round(((total - current.minTotalLevels) / Math.max(1, next.minTotalLevels - current.minTotalLevels)) * 100)
        )
      )
    : 100;
  return { current, next, progressPct, totalEmblemLevels: total };
}

/** 契约阵净化：去重、剔除非法/未解锁契约，并按当前锻炉阵位截断（保留签约先后顺序）。 */
export function sanitizeActivePacts(raw: unknown, totalEmblemLevels: number): GuildTrialPactId[] {
  const slots = getSkyForgeTier(totalEmblemLevels).current.pactSlots;
  const out: GuildTrialPactId[] = [];
  if (!Array.isArray(raw)) return out;
  for (const id of raw) {
    if (out.length >= slots) break;
    if (!isValidGuildTrialPactId(id) || out.includes(id)) continue;
    const def = GUILD_TRIAL_PACTS.find((p) => p.id === id);
    if (!def || totalEmblemLevels < def.unlockTotalLevels) continue;
    out.push(id);
  }
  return out;
}

export function isPactTradeoffMitigated(
  pact: GuildTrialPactDef,
  emblemLevels: Record<StarEmblemId, number>,
  forgeTier: number
): boolean {
  if (forgeTier >= PACT_MITIGATION_FORGE_TIER) return true;
  if (!pact.alignedEmblem) return false;
  return (emblemLevels[pact.alignedEmblem] || 0) >= PACT_MITIGATION_EMBLEM_LEVEL;
}

/** 契约实际代价：减半时向零取整（全部代价为偶数整数，减半结果恒为整数）。 */
export function effectivePactTradeoffs(pact: GuildTrialPactDef, mitigated: boolean): StarEmblemLevelStats {
  const out: StarEmblemLevelStats = {};
  for (const [k, v] of Object.entries(pact.tradeoffs) as Array<[keyof StarEmblemLevelStats, number]>) {
    if (typeof v !== "number" || v === 0) continue;
    out[k] = mitigated ? Math.trunc(v / 2) : v;
  }
  return out;
}

export function getGuildPactLinkTier(activePactCount: number): GuildPactLinkTierDef | null {
  let best: GuildPactLinkTierDef | null = null;
  for (const t of GUILD_PACT_LINK_TIERS) {
    if (activePactCount >= t.minActivePacts) best = t;
  }
  return best;
}

export interface SkyForgeBonuses {
  totalEmblemLevels: number;
  forgedCount: number;
  forgeTier: number;
  forgeTitle: string;
  pactSlots: number;
  activePacts: GuildTrialPactId[];
  activePactCount: number;
  mitigatedPacts: GuildTrialPactId[];
  linkTier: number;
  linkTitle: string | null;
  bonusAtk: number;
  bonusDef: number;
  bonusHp: number;
  combatAtkPct: number;
  armorPenPct: number;
  bossArmorBreakPct: number;
  intervalMult: number;
  critRateBonusPct: number;
  critDmgBonusPct: number;
  gatherSpeedPct: number;
  gatherDoubleChance: number;
  gatherEfficiencyPct: number;
  craftSpeedPct: number;
  craftEfficiencyPct: number;
  xpGainPct: number;
  goldGainPct: number;
  rareFindPct: number;
}

/** 契约代价下限：净值最多 -30%，防止多契叠加把产能/攻势压穿。 */
export const SKY_FORGE_NEGATIVE_FLOOR_PCT = -30;

export function getSkyForgeBonuses(
  player?: Pick<EnhancedPlayerState, "skyForge"> | null
): SkyForgeBonuses {
  const sf = player?.skyForge as
    | {
        emblemLevels?: Partial<Record<string, number>> | null;
        activePacts?: unknown;
      }
    | undefined
    | null;
  const levels = cleanStarEmblemLevels(sf && typeof sf === "object" ? sf.emblemLevels : null);
  const total = sumStarEmblemLevels(levels);
  const tierInfo = getSkyForgeTier(total);
  const activePacts = sf && typeof sf === "object" ? sanitizeActivePacts(sf.activePacts, total) : [];

  let bonusAtk = 0;
  let bonusDef = 0;
  let bonusHp = 0;
  let combatAtkPct = 0;
  let armorPenPct = 0;
  let bossArmorBreakPct = 0;
  let intervalReductionPct = 0;
  let critRateBonusPct = 0;
  let critDmgBonusPct = 0;
  let gatherSpeedPct = 0;
  let gatherDoubleChance = 0;
  let gatherEfficiencyPct = 0;
  let craftSpeedPct = 0;
  let craftEfficiencyPct = 0;
  let xpGainPct = 0;
  let goldGainPct = 0;
  let rareFindPct = 0;

  const applyStats = (s: StarEmblemLevelStats) => {
    if (s.bonusAtk) bonusAtk += s.bonusAtk;
    if (s.bonusDef) bonusDef += s.bonusDef;
    if (s.bonusHp) bonusHp += s.bonusHp;
    if (s.combatAtkPct) combatAtkPct += s.combatAtkPct;
    if (s.armorPenPct) armorPenPct += s.armorPenPct;
    if (s.bossArmorBreakPct) bossArmorBreakPct += s.bossArmorBreakPct;
    if (s.intervalReductionPct) intervalReductionPct += s.intervalReductionPct;
    if (s.critRateBonusPct) critRateBonusPct += s.critRateBonusPct;
    if (s.critDmgBonusPct) critDmgBonusPct += s.critDmgBonusPct;
    if (s.gatherSpeedPct) gatherSpeedPct += s.gatherSpeedPct;
    if (s.gatherDoubleChance) gatherDoubleChance += s.gatherDoubleChance;
    if (s.gatherEfficiencyPct) gatherEfficiencyPct += s.gatherEfficiencyPct;
    if (s.craftSpeedPct) craftSpeedPct += s.craftSpeedPct;
    if (s.craftEfficiencyPct) craftEfficiencyPct += s.craftEfficiencyPct;
    if (s.xpGainPct) xpGainPct += s.xpGainPct;
    if (s.goldGainPct) goldGainPct += s.goldGainPct;
    if (s.rareFindPct) rareFindPct += s.rareFindPct;
  };

  let forgedCount = 0;
  for (const meta of STAR_EMBLEMS) {
    const lv = levels[meta.id];
    if (lv >= 1) {
      forgedCount += 1;
      const s = meta.levels[lv - 1];
      if (s) applyStats(s);
    }
  }

  const mitigatedPacts: GuildTrialPactId[] = [];
  for (const pid of activePacts) {
    const def = GUILD_TRIAL_PACTS.find((p) => p.id === pid);
    if (!def) continue;
    const mitigated = isPactTradeoffMitigated(def, levels, tierInfo.current.tier);
    if (mitigated) mitigatedPacts.push(pid);
    applyStats(def.boons);
    applyStats(effectivePactTradeoffs(def, mitigated));
  }

  const link = getGuildPactLinkTier(activePacts.length);
  if (link) applyStats(link.bonuses);

  const floor = (v: number) => Math.max(SKY_FORGE_NEGATIVE_FLOOR_PCT, v);
  const intervalMult =
    intervalReductionPct > 0 ? Math.max(0.8, Math.round((1 - intervalReductionPct / 100) * 1000) / 1000) : 1;

  return {
    totalEmblemLevels: total,
    forgedCount,
    forgeTier: tierInfo.current.tier,
    forgeTitle: tierInfo.current.title,
    pactSlots: tierInfo.current.pactSlots,
    activePacts,
    activePactCount: activePacts.length,
    mitigatedPacts,
    linkTier: link ? link.linkTier : 0,
    linkTitle: link ? link.title : null,
    bonusAtk,
    bonusDef,
    bonusHp,
    combatAtkPct: floor(combatAtkPct),
    armorPenPct: Math.min(0.5, Math.round(armorPenPct * 1000) / 1000),
    bossArmorBreakPct: Math.min(0.5, Math.round(bossArmorBreakPct * 1000) / 1000),
    intervalMult,
    critRateBonusPct: Math.round(critRateBonusPct * 10) / 10,
    critDmgBonusPct,
    gatherSpeedPct: floor(gatherSpeedPct),
    gatherDoubleChance: Math.min(0.5, Math.round(gatherDoubleChance * 1000) / 1000),
    gatherEfficiencyPct,
    craftSpeedPct: floor(craftSpeedPct),
    craftEfficiencyPct,
    xpGainPct,
    goldGainPct: floor(goldGainPct),
    rareFindPct,
  };
}

/** 确保 skyForge 状态存在并净化脏档（旧存档首次访问即补齐安全默认值；不赠送任何资源）。 */
export function ensureSkyForge(player: EnhancedPlayerState): SkyForgeState {
  const cleanNonNeg = (v: unknown, fallback = 0): number =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallback;
  if (!player.skyForge || typeof player.skyForge !== "object") {
    player.skyForge = {
      emblemLevels: { star_blade: 0, crescent_bow: 0, star_hammer: 0, amethyst_staff: 0 },
      totalForges: 0,
      activePacts: [],
      totalPactsSigned: 0,
    };
  }
  const sf = player.skyForge;
  sf.emblemLevels = cleanStarEmblemLevels(sf.emblemLevels as Partial<Record<string, unknown>>);
  const total = sumStarEmblemLevels(sf.emblemLevels);
  sf.totalForges = Math.max(cleanNonNeg(sf.totalForges, 0), total);
  sf.activePacts = sanitizeActivePacts(sf.activePacts, total);
  sf.totalPactsSigned = Math.max(cleanNonNeg(sf.totalPactsSigned, 0), sf.activePacts.length);
  return sf;
}

function readCleanWallet(player: EnhancedPlayerState): { shards: number; dust: number } {
  const clean = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
  return {
    shards: clean(player.astralRelics?.ancientRelicShards),
    dust: clean(player.caravanTrade?.astralCrystalDust),
  };
}

/** 天空锻炉淬炼：消耗远古圣物残片 + 异域星晶尘，将指定星辰神兵纹章提升 1 阶（Lv.0 → Lv.5，转生永久保留）。 */
export function forgeStarEmblem(
  player: EnhancedPlayerState,
  emblemId: StarEmblemId,
  now: Date = new Date()
): {
  ok: boolean;
  reason?: string;
  emblemId?: StarEmblemId;
  newLevel?: number;
  totalEmblemLevels?: number;
  spentShards?: number;
  spentDust?: number;
  forgeTierUpTo?: number;
  forgeTierTitle?: string;
  newPactSlots?: number;
  unlockedPacts?: GuildTrialPactId[];
} {
  ensurePlayerExtensions(player);
  if (!isValidStarEmblemId(emblemId)) {
    return { ok: false, reason: "未知的星辰神兵纹章" };
  }
  const sf = ensureSkyForge(player);
  const meta = STAR_EMBLEMS.find((e) => e.id === emblemId)!;
  const cur = sf.emblemLevels[emblemId] || 0;
  if (cur >= STAR_EMBLEM_MAX_LEVEL) {
    return { ok: false, reason: `「${meta.name}」已淬炼至满阶 Lv.${STAR_EMBLEM_MAX_LEVEL}` };
  }
  const targetLevel = (cur + 1) as 1 | 2 | 3 | 4 | 5;
  const cost = STAR_EMBLEM_FORGE_COSTS.find((c) => c.targetLevel === targetLevel);
  if (!cost) return { ok: false, reason: "未找到对应神兵淬炼配方" };

  const wallet = readCleanWallet(player);
  if (wallet.shards < cost.ancientRelicShards) {
    return {
      ok: false,
      reason: `远古圣物残片不足（淬炼 Lv.${targetLevel} 需 ${cost.ancientRelicShards} 枚，当前 ${wallet.shards} 枚；可前往遗迹圣物馆勘探获取）`,
    };
  }
  if (wallet.dust < cost.astralCrystalDust) {
    return {
      ok: false,
      reason: `异域星晶尘不足（淬炼 Lv.${targetLevel} 需 ${cost.astralCrystalDust} 星晶尘，当前 ${wallet.dust}）`,
    };
  }

  const ar = ensureAstralRelics(player, now);
  const ct = ensureCaravanTrade(player, now);
  const prevTotal = sumStarEmblemLevels(sf.emblemLevels);
  const prevTier = getSkyForgeTier(prevTotal).current;

  ar.ancientRelicShards -= cost.ancientRelicShards;
  ct.astralCrystalDust -= cost.astralCrystalDust;
  sf.emblemLevels[emblemId] = targetLevel;
  sf.totalForges += 1;

  const nextTotal = prevTotal + 1;
  const nextTier = getSkyForgeTier(nextTotal).current;
  const unlockedPacts = GUILD_TRIAL_PACTS.filter(
    (p) => p.unlockTotalLevels > prevTotal && p.unlockTotalLevels <= nextTotal
  ).map((p) => p.id);

  addReputation(player, 6 + targetLevel * 3);
  syncAchievements(player);

  appendLog(
    player,
    targetLevel === 1
      ? `天空锻炉点燃「${meta.name}」星辰神兵纹章（Lv.1）！纹章祝福永久生效（转生永久保留）！`
      : `天空锻炉将「${meta.name}」淬炼至 Lv.${targetLevel}！神兵谱总阶 ${nextTotal}/${SKY_FORGE_MAX_TOTAL_LEVELS}。`
  );
  if (nextTier.tier > prevTier.tier) {
    appendLog(
      player,
      `天空锻炉晋升「${nextTier.title}」！公会秘境试炼契约阵位扩展至 ${nextTier.pactSlots} 席！`
    );
  }
  for (const pid of unlockedPacts) {
    const def = GUILD_TRIAL_PACTS.find((p) => p.id === pid)!;
    appendLog(player, `公会秘境试炼契约「${def.name}」已解锁，可前往契约阵签署！`);
  }

  return {
    ok: true,
    emblemId,
    newLevel: targetLevel,
    totalEmblemLevels: nextTotal,
    spentShards: cost.ancientRelicShards,
    spentDust: cost.astralCrystalDust,
    ...(nextTier.tier > prevTier.tier
      ? { forgeTierUpTo: nextTier.tier, forgeTierTitle: nextTier.title, newPactSlots: nextTier.pactSlots }
      : {}),
    ...(unlockedPacts.length > 0 ? { unlockedPacts } : {}),
  };
}

/** 签署或解除公会秘境试炼契约（签约消耗异域星晶尘；解约免费、不退还）。 */
export function setGuildTrialPact(
  player: EnhancedPlayerState,
  pactId: GuildTrialPactId,
  action: "sign" | "revoke",
  now: Date = new Date()
): {
  ok: boolean;
  reason?: string;
  pactId?: GuildTrialPactId;
  action?: "sign" | "revoke";
  activePacts?: GuildTrialPactId[];
  spentDust?: number;
  linkTier?: number;
  linkTitle?: string | null;
} {
  ensurePlayerExtensions(player);
  if (!isValidGuildTrialPactId(pactId)) {
    return { ok: false, reason: "未知的公会秘境试炼契约" };
  }
  if (action !== "sign" && action !== "revoke") {
    return { ok: false, reason: "未知的契约操作" };
  }
  const sf = ensureSkyForge(player);
  const def = GUILD_TRIAL_PACTS.find((p) => p.id === pactId)!;
  const total = sumStarEmblemLevels(sf.emblemLevels);
  const slots = getSkyForgeTier(total).current.pactSlots;

  if (action === "revoke") {
    if (!sf.activePacts.includes(pactId)) {
      return { ok: false, reason: `「${def.name}」尚未签署，无需解除` };
    }
    sf.activePacts = sf.activePacts.filter((p) => p !== pactId);
    const link = getGuildPactLinkTier(sf.activePacts.length);
    appendLog(player, `已解除公会秘境试炼契约「${def.name}」，其增益与代价同步撤销。`);
    return {
      ok: true,
      pactId,
      action,
      activePacts: [...sf.activePacts],
      spentDust: 0,
      linkTier: link ? link.linkTier : 0,
      linkTitle: link ? link.title : null,
    };
  }

  if (sf.activePacts.includes(pactId)) {
    return { ok: false, reason: `「${def.name}」已在契约阵中生效` };
  }
  if (total < def.unlockTotalLevels) {
    return {
      ok: false,
      reason: `「${def.name}」需神兵谱总阶达到 ${def.unlockTotalLevels} 方可签署（当前 ${total}）`,
    };
  }
  if (sf.activePacts.length >= slots) {
    return {
      ok: false,
      reason:
        slots <= 0
          ? `天空锻炉尚未点燃契约阵位（神兵谱总阶达到 ${SKY_FORGE_TIERS[1].minTotalLevels} 开放首席）`
          : `契约阵位已满（${sf.activePacts.length}/${slots}），请先解除一份契约`,
    };
  }
  const wallet = readCleanWallet(player);
  if (wallet.dust < def.signDust) {
    return {
      ok: false,
      reason: `异域星晶尘不足（签署「${def.name}」需 ${def.signDust} 星晶尘，当前 ${wallet.dust}）`,
    };
  }

  const ct = ensureCaravanTrade(player, now);
  ct.astralCrystalDust -= def.signDust;
  sf.activePacts = [...sf.activePacts, pactId];
  sf.totalPactsSigned += 1;
  const link = getGuildPactLinkTier(sf.activePacts.length);
  addReputation(player, 4 + def.pactTier * 2);
  syncAchievements(player);
  appendLog(
    player,
    `签署公会秘境试炼契约「${def.name}」！${link ? `契约阵连携「${link.title}」生效！` : ""}`
  );

  return {
    ok: true,
    pactId,
    action,
    activePacts: [...sf.activePacts],
    spentDust: def.signDust,
    linkTier: link ? link.linkTier : 0,
    linkTitle: link ? link.title : null,
  };
}

/** 构造前端「天空锻炉星辰神兵谱 & 公会秘境试炼契约阵」面板视图（只读：不创建遗迹/商队状态）。 */
export function getSkyForgeInfo(
  player: EnhancedPlayerState,
  _contentPack?: EnhancedContentPack,
  now: Date = new Date()
) {
  ensurePlayerExtensions(player);
  const sf = ensureSkyForge(player);
  const wallet = readCleanWallet(player);
  const total = sumStarEmblemLevels(sf.emblemLevels);
  const tierInfo = getSkyForgeTier(total);
  const bonuses = getSkyForgeBonuses(player);

  const emblems = STAR_EMBLEMS.map((meta) => {
    const level = sf.emblemLevels[meta.id] || 0;
    const nextLevel = level < STAR_EMBLEM_MAX_LEVEL ? ((level + 1) as 1 | 2 | 3 | 4 | 5) : null;
    const cost = nextLevel ? STAR_EMBLEM_FORGE_COSTS.find((c) => c.targetLevel === nextLevel) || null : null;
    return {
      id: meta.id,
      name: meta.name,
      subtitle: meta.subtitle,
      description: meta.description,
      iconId: meta.iconId,
      domain: meta.domain,
      domainLabel: meta.domainLabel,
      level,
      maxLevel: STAR_EMBLEM_MAX_LEVEL,
      currentStats: level >= 1 ? meta.levels[level - 1] : null,
      nextStats: nextLevel ? meta.levels[nextLevel - 1] : null,
      forgeOption: cost
        ? {
            targetLevel: cost.targetLevel,
            ancientRelicShards: cost.ancientRelicShards,
            astralCrystalDust: cost.astralCrystalDust,
            canAfford: wallet.shards >= cost.ancientRelicShards && wallet.dust >= cost.astralCrystalDust,
          }
        : null,
    };
  });

  const slotsMax = tierInfo.current.pactSlots;
  const pacts = GUILD_TRIAL_PACTS.map((def) => {
    const active = sf.activePacts.includes(def.id);
    const unlocked = total >= def.unlockTotalLevels;
    const mitigated = isPactTradeoffMitigated(def, sf.emblemLevels, tierInfo.current.tier);
    const aligned = def.alignedEmblem ? STAR_EMBLEMS.find((e) => e.id === def.alignedEmblem) || null : null;
    let signBlockReason: string | null = null;
    if (!active) {
      if (!unlocked) signBlockReason = `需神兵谱总阶 ${def.unlockTotalLevels}`;
      else if (slotsMax <= 0) signBlockReason = "契约阵位未开放";
      else if (sf.activePacts.length >= slotsMax) signBlockReason = "契约阵位已满";
      else if (wallet.dust < def.signDust) signBlockReason = "星晶尘不足";
    }
    return {
      id: def.id,
      name: def.name,
      subtitle: def.subtitle,
      description: def.description,
      iconId: def.iconId,
      pactTier: def.pactTier,
      unlockTotalLevels: def.unlockTotalLevels,
      unlocked,
      alignedEmblem: def.alignedEmblem,
      alignedEmblemName: aligned ? aligned.name : null,
      alignedEmblemLevel: def.alignedEmblem ? sf.emblemLevels[def.alignedEmblem] || 0 : 0,
      signDust: def.signDust,
      boons: def.boons,
      tradeoffs: def.tradeoffs,
      effectiveTradeoffs: effectivePactTradeoffs(def, mitigated),
      mitigated,
      active,
      canSign: !active && signBlockReason === null,
      signBlockReason,
    };
  });

  const link = getGuildPactLinkTier(sf.activePacts.length);
  const nextLink =
    GUILD_PACT_LINK_TIERS.find((t) => t.minActivePacts > sf.activePacts.length) || null;

  return {
    nowMs: now.getTime(),
    ancientRelicShards: wallet.shards,
    astralCrystalDust: wallet.dust,
    totalEmblemLevels: total,
    maxTotalLevels: SKY_FORGE_MAX_TOTAL_LEVELS,
    totalForges: sf.totalForges,
    totalPactsSigned: sf.totalPactsSigned,
    forgeTier: {
      tier: tierInfo.current.tier,
      title: tierInfo.current.title,
      minTotalLevels: tierInfo.current.minTotalLevels,
      pactSlots: tierInfo.current.pactSlots,
      next: tierInfo.next,
      progressPct: tierInfo.progressPct,
      allTiers: SKY_FORGE_TIERS,
    },
    emblems,
    pacts,
    pactSlots: {
      used: sf.activePacts.length,
      max: slotsMax,
      cap: GUILD_PACT_MAX_SLOTS,
    },
    activePacts: [...sf.activePacts],
    link: {
      activeTier: link ? link.linkTier : 0,
      current: link,
      next: nextLink,
      allTiers: GUILD_PACT_LINK_TIERS,
    },
    mitigation: {
      emblemLevel: PACT_MITIGATION_EMBLEM_LEVEL,
      forgeTier: PACT_MITIGATION_FORGE_TIER,
    },
    bonuses,
  };
}

/* ============================ 港湾垂钓大赛 & 海港水族馆收藏图鉴 (WL-11) ============================ */
// 前端 frontend/src/gameplay/harborDerby.ts 逐表逐式 1:1 镜像（scripts/harbor-derby-parity.test.ts 守护，
// 「WL-11 core」区段两端逐字一致）。
// - 港湾垂钓大赛：每周（东八区周一 0 点）轮换鱼场；每次参赛消耗 1 次本周真实钓鱼行动（act_fish_*）+ 1 份鱼饵
//   （鱼饵由真实钓鱼产物调制），按鱼种稀有度 / 尺寸确定性计分；周榜取本周最佳 5 条渔获，翻周时按段位结算
//   奖杯、金币、鱼饵与稀有鱼饵配方。翻周只在显式传入 now（指令 / 视图时钟）时发生；无参 ensure 只做净化。
// - 海港水族馆收藏图鉴：参赛渔获入缸收藏（转生永久保留），收藏进度解锁主题展缸并对称增幅
//   钓鱼速度（getActionRates 钓鱼行动速度）、料理品质（烹饪行动效率）与金币收益（生产 / 战斗金币倍率）。

/* ---- 以下为与后端逐字对称的表与纯函数（WL-11 core） ---- */

export const HARBOR_GROUND_IDS: readonly HarborGroundId[] = [
  "dawn_pier",
  "coral_moon_reef",
  "frost_mist_fjord",
  "starlit_abyss_port",
];

export const HARBOR_BAIT_IDS: readonly HarborBaitId[] = [
  "harbor_worm",
  "glow_shrimp",
  "sunscale_lure",
  "abyss_lantern_lure",
];

export const HARBOR_SPECIES_IDS: readonly HarborSpeciesId[] = [
  "fish_river",
  "shrimp",
  "fish_sea",
  "fish_lake",
  "fish_deepsea",
  "fish_abyss",
  "fish_frost",
  "fish_lava",
  "fish_star",
  "fish_dragon",
  "sunscale_carp",
  "abyss_lantern",
];

export const HARBOR_TANK_THEME_IDS: readonly HarborTankThemeId[] = [
  "stream_shallows",
  "coral_harbor",
  "frost_grotto",
  "ember_starlight",
  "sunscale_palace",
];

export const HARBOR_TROPHY_TIER_IDS: readonly HarborTrophyTierId[] = ["bronze", "silver", "gold", "legend"];

/** 业务周按东八区周一 0 点翻篇（与每日重置同一时区）。 */
export const HARBOR_TZ_OFFSET_MINUTES = 480;
export const HARBOR_WEEK_MS = 7 * 86_400_000;
/** 1970-01-05 是周一：周序号 = floor((东八区时刻 - 该周一) / 一周)。 */
export const HARBOR_WEEK_EPOCH_MS = Date.UTC(1970, 0, 5);
/** 每周最多参赛（投竿）次数。 */
export const HARBOR_WEEKLY_ENTRY_CAP = 30;
/** 每次参赛消耗的本周真实钓鱼行动次数。 */
export const HARBOR_CASTS_PER_ENTRY = 1;
/** 单次请求最多连投次数。 */
export const HARBOR_MAX_ENTRIES_PER_REQUEST = 5;
/** 周榜只计本周最佳 N 条渔获。 */
export const HARBOR_LEADERBOARD_SIZE = 5;
/** 本周鱼场主打鱼种计分倍率（百分比）。 */
export const HARBOR_FEATURED_SCORE_PCT = 150;
/** 奖杯级尺寸（达到该鱼种尺寸上限）额外计分（百分比）。 */
export const HARBOR_TROPHY_SIZE_SCORE_PCT = 20;
export const HARBOR_FEATURED_WEIGHT_MULT = 2;
export const HARBOR_EXCLUSIVE_LURE_WEIGHT_MULT = 3;
export const HARBOR_BAIT_STOCK_CAP = 99;
export const HARBOR_MAX_CRAFT_BATCHES = 10;
export const HARBOR_FISHING_ACTION_PREFIX = "act_fish_";
/** 稀有度 1~6 的基础出现权重（下标 0 占位）。 */
export const HARBOR_RARITY_WEIGHTS: readonly number[] = [0, 100, 60, 36, 20, 10, 5];
export const HARBOR_RARITY_LABELS: readonly string[] = ["", "普通", "优良", "稀有", "史诗", "传说", "神话"];
/** 主展缸鱼种全部收齐时，其主题共鸣翻倍。 */
export const HARBOR_FULL_TANK_RESONANCE_MULT = 2;

export interface HarborAquariumStats {
  fishingSpeedPct?: number;
  cookingQualityPct?: number;
  goldGainPct?: number;
}

export interface HarborSpeciesDef {
  id: HarborSpeciesId;
  name: string;
  description: string;
  iconKind: "item" | "skills";
  iconId: string;
  rarity: 1 | 2 | 3 | 4 | 5 | 6;
  baseScore: number;
  minSizeCm: number;
  maxSizeCm: number;
  refSizeCm: number;
  minChefLevel: number;
  tankTheme: HarborTankThemeId;
  exclusiveBait: HarborBaitId | null;
}

export const HARBOR_SPECIES: readonly HarborSpeciesDef[] = [
  {
    id: "fish_river",
    name: "河鱼",
    description: "清溪入海口最常见的河鱼，新手钓手的第一尾渔获。",
    iconKind: "item",
    iconId: "fish_river",
    rarity: 1,
    baseScore: 20,
    minSizeCm: 18,
    maxSizeCm: 42,
    refSizeCm: 30,
    minChefLevel: 1,
    tankTheme: "stream_shallows",
    exclusiveBait: null,
  },
  {
    id: "shrimp",
    name: "鲜虾",
    description: "礁石缝里活蹦乱跳的鲜虾，个头虽小却极考验手感。",
    iconKind: "item",
    iconId: "shrimp",
    rarity: 1,
    baseScore: 18,
    minSizeCm: 6,
    maxSizeCm: 14,
    refSizeCm: 10,
    minChefLevel: 10,
    tankTheme: "stream_shallows",
    exclusiveBait: null,
  },
  {
    id: "fish_sea",
    name: "海鱼",
    description: "港湾外海成群洄游的海鱼，肉质肥美。",
    iconKind: "item",
    iconId: "fish_sea",
    rarity: 2,
    baseScore: 40,
    minSizeCm: 30,
    maxSizeCm: 70,
    refSizeCm: 50,
    minChefLevel: 20,
    tankTheme: "coral_harbor",
    exclusiveBait: null,
  },
  {
    id: "fish_lake",
    name: "湖鱼",
    description: "随潮汐溯入港湾的深湖鱼，鳞片泛着青光。",
    iconKind: "item",
    iconId: "fish_lake",
    rarity: 2,
    baseScore: 52,
    minSizeCm: 25,
    maxSizeCm: 65,
    refSizeCm: 45,
    minChefLevel: 24,
    tankTheme: "stream_shallows",
    exclusiveBait: null,
  },
  {
    id: "fish_deepsea",
    name: "深海鱼",
    description: "只在潮落时上浮的幽暗深海鱼，是大赛的常见得分鱼。",
    iconKind: "item",
    iconId: "fish_deepsea",
    rarity: 3,
    baseScore: 90,
    minSizeCm: 40,
    maxSizeCm: 100,
    refSizeCm: 70,
    minChefLevel: 36,
    tankTheme: "coral_harbor",
    exclusiveBait: null,
  },
  {
    id: "fish_abyss",
    name: "渊海巨鱼",
    description: "潜伏在冰峡深渊的巨型鱼，体长动辄两米。",
    iconKind: "item",
    iconId: "fish_abyss",
    rarity: 3,
    baseScore: 135,
    minSizeCm: 80,
    maxSizeCm: 200,
    refSizeCm: 140,
    minChefLevel: 48,
    tankTheme: "frost_grotto",
    exclusiveBait: null,
  },
  {
    id: "fish_frost",
    name: "寒霜冰鱼",
    description: "冰封水域的冰晶鱼，离水即凝出霜花。",
    iconKind: "item",
    iconId: "fish_frost",
    rarity: 4,
    baseScore: 200,
    minSizeCm: 35,
    maxSizeCm: 85,
    refSizeCm: 60,
    minChefLevel: 60,
    tankTheme: "frost_grotto",
    exclusiveBait: null,
  },
  {
    id: "fish_lava",
    name: "熔岩火鱼",
    description: "游弋于海底熔岩口的火鱼，需耐热钓线才能拉上岸。",
    iconKind: "item",
    iconId: "fish_lava",
    rarity: 4,
    baseScore: 280,
    minSizeCm: 40,
    maxSizeCm: 100,
    refSizeCm: 70,
    minChefLevel: 72,
    tankTheme: "ember_starlight",
    exclusiveBait: null,
  },
  {
    id: "fish_star",
    name: "星界游鱼",
    description: "灯塔星光下才会现身的发光鱼，鳞片如星辰。",
    iconKind: "item",
    iconId: "fish_star",
    rarity: 5,
    baseScore: 400,
    minSizeCm: 30,
    maxSizeCm: 90,
    refSizeCm: 60,
    minChefLevel: 84,
    tankTheme: "ember_starlight",
    exclusiveBait: null,
  },
  {
    id: "fish_dragon",
    name: "龙渊神鱼",
    description: "盘踞龙渊的神鱼，传说中的大赛终极猎物。",
    iconKind: "item",
    iconId: "fish_dragon",
    rarity: 6,
    baseScore: 600,
    minSizeCm: 120,
    maxSizeCm: 300,
    refSizeCm: 210,
    minChefLevel: 96,
    tankTheme: "sunscale_palace",
    exclusiveBait: null,
  },
  {
    id: "sunscale_carp",
    name: "金鳞日耀鲤",
    description: "只追逐「金鳞日耀饵」的港湾限定锦鲤，金鳞映日、可遇不可求。",
    iconKind: "skills",
    iconId: "fish_sunscale_carp",
    rarity: 5,
    baseScore: 450,
    minSizeCm: 50,
    maxSizeCm: 120,
    refSizeCm: 85,
    minChefLevel: 24,
    tankTheme: "sunscale_palace",
    exclusiveBait: "sunscale_lure",
  },
  {
    id: "abyss_lantern",
    name: "渊灯鮟鱇",
    description: "提着幽蓝灯笼的深渊鮟鱇，只会被「渊灯秘饵」引出灯塔暗礁。",
    iconKind: "skills",
    iconId: "fish_abyss_lantern",
    rarity: 6,
    baseScore: 700,
    minSizeCm: 60,
    maxSizeCm: 160,
    refSizeCm: 110,
    minChefLevel: 48,
    tankTheme: "sunscale_palace",
    exclusiveBait: "abyss_lantern_lure",
  },
];

export interface HarborGroundDef {
  id: HarborGroundId;
  name: string;
  subtitle: string;
  description: string;
  sceneId: string;
  featuredSpecies: readonly HarborSpeciesId[];
}

export const HARBOR_GROUNDS: readonly HarborGroundDef[] = [
  {
    id: "dawn_pier",
    name: "晨曦栈桥湾",
    subtitle: "清溪入海的木栈桥 · 河鱼、湖鱼与金鳞日耀鲤主打",
    description: "晨光洒满木栈桥，溯溪而下的河鱼与湖鱼聚在桥墩，金鳞日耀鲤偶尔追着金饵跃出水面。",
    sceneId: "river",
    featuredSpecies: ["fish_river", "fish_lake", "sunscale_carp"],
  },
  {
    id: "coral_moon_reef",
    name: "珊瑚月礁港",
    subtitle: "月下珊瑚礁群 · 鲜虾、海鱼与深海鱼主打",
    description: "退潮后的珊瑚月礁露出大片浅滩，鲜虾与海鱼在礁盘间穿梭，深海鱼趁夜上浮觅食。",
    sceneId: "ocean",
    featuredSpecies: ["shrimp", "fish_sea", "fish_deepsea"],
  },
  {
    id: "frost_mist_fjord",
    name: "寒雾冰峡港",
    subtitle: "冰峡深渊港口 · 渊海巨鱼、寒霜冰鱼与龙渊神鱼主打",
    description: "寒雾笼罩的冰峡港水深千尺，渊海巨鱼与寒霜冰鱼在冰层下游弋，龙渊神鱼偶尔掀起冰浪。",
    sceneId: "frost_sea",
    featuredSpecies: ["fish_abyss", "fish_frost", "fish_dragon"],
  },
  {
    id: "starlit_abyss_port",
    name: "星渊灯塔港",
    subtitle: "星光灯塔暗礁 · 熔岩火鱼、星界游鱼与渊灯鮟鱇主打",
    description: "灯塔星光倒映在暗礁深渊，熔岩火鱼与星界游鱼被光引来，渊灯鮟鱇的幽蓝灯笼若隐若现。",
    sceneId: "star_sea",
    featuredSpecies: ["fish_lava", "fish_star", "abyss_lantern"],
  },
];

export interface HarborBaitDef {
  id: HarborBaitId;
  name: string;
  subtitle: string;
  description: string;
  iconId: string;
  rarityShift: number;
  sizeBonusPct: number;
  scoreBonusPct: number;
  unlocksSpecies: HarborSpeciesId | null;
  /** null = 基础配方默认掌握；否则需在对应周榜段位结算时解锁（稀有鱼饵配方）。 */
  recipeTier: HarborTrophyTierId | null;
  craftItems: Readonly<Record<string, number>>;
  craftGold: number;
  craftYield: number;
}

export const HARBOR_BAITS: readonly HarborBaitDef[] = [
  {
    id: "harbor_worm",
    name: "港湾蚯蚓饵",
    subtitle: "基础鱼饵 · 默认掌握",
    description: "以河鱼碎肉拌入港湾湿泥调成的朴素鱼饵，什么鱼都愿意咬一口。",
    iconId: "rare_bait_recipe",
    rarityShift: 0,
    sizeBonusPct: 0,
    scoreBonusPct: 0,
    unlocksSpecies: null,
    recipeTier: null,
    craftItems: { fish_river: 1 },
    craftGold: 20,
    craftYield: 3,
  },
  {
    id: "glow_shrimp",
    name: "荧光虾饵",
    subtitle: "稀有配方 · 白银段位结算解锁",
    description: "以鲜虾熬出的荧光饵浆，夜色里闪闪发亮，更容易引来稀有鱼种。",
    iconId: "rare_bait_recipe",
    rarityShift: 1,
    sizeBonusPct: 6,
    scoreBonusPct: 8,
    unlocksSpecies: null,
    recipeTier: "silver",
    craftItems: { shrimp: 2 },
    craftGold: 60,
    craftYield: 3,
  },
  {
    id: "sunscale_lure",
    name: "金鳞日耀饵",
    subtitle: "稀有配方 · 黄金段位结算解锁",
    description: "以湖鱼与海鱼金鳞打磨的拟饵，日光下金芒四射，能引出港湾限定的金鳞日耀鲤。",
    iconId: "rare_bait_recipe",
    rarityShift: 2,
    sizeBonusPct: 10,
    scoreBonusPct: 12,
    unlocksSpecies: "sunscale_carp",
    recipeTier: "gold",
    craftItems: { fish_lake: 2, fish_sea: 1 },
    craftGold: 200,
    craftYield: 2,
  },
  {
    id: "abyss_lantern_lure",
    name: "渊灯秘饵",
    subtitle: "稀有配方 · 传奇段位结算解锁",
    description: "以渊海巨鱼与深海鱼的发光腺调成的秘饵，幽蓝微光能把渊灯鮟鱇引出暗礁。",
    iconId: "rare_bait_recipe",
    rarityShift: 3,
    sizeBonusPct: 14,
    scoreBonusPct: 18,
    unlocksSpecies: "abyss_lantern",
    recipeTier: "legend",
    craftItems: { fish_abyss: 2, fish_deepsea: 1 },
    craftGold: 500,
    craftYield: 2,
  },
];

export interface HarborDerbyTierDef {
  id: HarborDerbyTierId;
  rank: 0 | 1 | 2 | 3 | 4;
  name: string;
  minScore: number;
  trophy: HarborTrophyTierId | null;
  trophyName: string | null;
  trophyPoints: number;
  goldReward: number;
  baitReward: Readonly<Partial<Record<HarborBaitId, number>>>;
  recipe: HarborBaitId | null;
}

export const HARBOR_DERBY_TIERS: readonly HarborDerbyTierDef[] = [
  {
    id: "none",
    rank: 0,
    name: "未上榜",
    minScore: 0,
    trophy: null,
    trophyName: null,
    trophyPoints: 0,
    goldReward: 0,
    baitReward: {},
    recipe: null,
  },
  {
    id: "bronze",
    rank: 1,
    name: "青铜钓手",
    minScore: 100,
    trophy: "bronze",
    trophyName: "青铜垂钓奖杯",
    trophyPoints: 1,
    goldReward: 300,
    baitReward: { harbor_worm: 3 },
    recipe: null,
  },
  {
    id: "silver",
    rank: 2,
    name: "白银钓手",
    minScore: 500,
    trophy: "silver",
    trophyName: "白银垂钓奖杯",
    trophyPoints: 2,
    goldReward: 800,
    baitReward: { harbor_worm: 3, glow_shrimp: 2 },
    recipe: "glow_shrimp",
  },
  {
    id: "gold",
    rank: 3,
    name: "黄金钓王",
    minScore: 1600,
    trophy: "gold",
    trophyName: "黄金钓王奖杯",
    trophyPoints: 4,
    goldReward: 2000,
    baitReward: { glow_shrimp: 3, sunscale_lure: 1 },
    recipe: "sunscale_lure",
  },
  {
    id: "legend",
    rank: 4,
    name: "传奇海王",
    minScore: 4200,
    trophy: "legend",
    trophyName: "传奇海王金杯",
    trophyPoints: 8,
    goldReward: 5000,
    baitReward: { sunscale_lure: 2, abyss_lantern_lure: 1 },
    recipe: "abyss_lantern_lure",
  },
];

export interface HarborRodTierDef {
  tier: 0 | 1 | 2 | 3 | 4;
  minTrophyPoints: number;
  title: string;
  sizeBonusPct: number;
  scoreBonusPct: number;
}

/** 大师钓竿：按奖杯积分（青铜 1 / 白银 2 / 黄金 4 / 传奇 8）自动晋阶，提升投竿尺寸与计分。 */
export const HARBOR_ROD_TIERS: readonly HarborRodTierDef[] = [
  { tier: 0, minTrophyPoints: 0, title: "港湾竹钓竿", sizeBonusPct: 0, scoreBonusPct: 0 },
  { tier: 1, minTrophyPoints: 1, title: "铜饰海钓竿", sizeBonusPct: 2, scoreBonusPct: 3 },
  { tier: 2, minTrophyPoints: 4, title: "银纹远投竿", sizeBonusPct: 4, scoreBonusPct: 6 },
  { tier: 3, minTrophyPoints: 10, title: "金鳞大师竿", sizeBonusPct: 6, scoreBonusPct: 10 },
  { tier: 4, minTrophyPoints: 24, title: "传奇海王神竿", sizeBonusPct: 9, scoreBonusPct: 15 },
];

export interface HarborTankThemeDef {
  id: HarborTankThemeId;
  name: string;
  subtitle: string;
  description: string;
  unlockSpecies: number;
  resonance: HarborAquariumStats;
}

export const HARBOR_TANK_THEMES: readonly HarborTankThemeDef[] = [
  {
    id: "stream_shallows",
    name: "清溪浅滩缸",
    subtitle: "河鱼 · 鲜虾 · 湖鱼",
    description: "铺满鹅卵石与水草的浅滩展缸，清溪活水循环不息。",
    unlockSpecies: 1,
    resonance: { fishingSpeedPct: 2 },
  },
  {
    id: "coral_harbor",
    name: "珊瑚港湾缸",
    subtitle: "海鱼 · 深海鱼",
    description: "以月礁珊瑚造景的港湾展缸，引来往来商客驻足。",
    unlockSpecies: 3,
    resonance: { goldGainPct: 2 },
  },
  {
    id: "frost_grotto",
    name: "寒霜冰窟缸",
    subtitle: "渊海巨鱼 · 寒霜冰鱼",
    description: "恒温冰晶石砌成的冰窟展缸，冰鱼的霜鳞让厨师灵感迸发。",
    unlockSpecies: 5,
    resonance: { cookingQualityPct: 4 },
  },
  {
    id: "ember_starlight",
    name: "熔岩星渊缸",
    subtitle: "熔岩火鱼 · 星界游鱼",
    description: "半边熔岩微光、半边星砂夜色的双生展缸。",
    unlockSpecies: 8,
    resonance: { fishingSpeedPct: 3, goldGainPct: 1 },
  },
  {
    id: "sunscale_palace",
    name: "金鳞龙宫缸",
    subtitle: "龙渊神鱼 · 金鳞日耀鲤 · 渊灯鮟鱇",
    description: "以金鳞与渊灯点缀的龙宫巨缸，只为港湾传说鱼种而建。",
    unlockSpecies: 11,
    resonance: { fishingSpeedPct: 3, cookingQualityPct: 3, goldGainPct: 2 },
  },
];

export interface HarborAquariumTierDef {
  tier: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  minSpecies: number;
  title: string;
  fishingSpeedPct: number;
  cookingQualityPct: number;
  goldGainPct: number;
}

export const HARBOR_AQUARIUM_TIERS: readonly HarborAquariumTierDef[] = [
  { tier: 0, minSpecies: 0, title: "空置的海港水族馆", fishingSpeedPct: 0, cookingQualityPct: 0, goldGainPct: 0 },
  { tier: 1, minSpecies: 1, title: "清溪初展", fishingSpeedPct: 3, cookingQualityPct: 2, goldGainPct: 1 },
  { tier: 2, minSpecies: 3, title: "珊瑚港湾展", fishingSpeedPct: 6, cookingQualityPct: 5, goldGainPct: 2 },
  { tier: 3, minSpecies: 5, title: "寒霜冰窟展", fishingSpeedPct: 10, cookingQualityPct: 8, goldGainPct: 4 },
  { tier: 4, minSpecies: 8, title: "熔岩星渊展", fishingSpeedPct: 14, cookingQualityPct: 12, goldGainPct: 6 },
  { tier: 5, minSpecies: 11, title: "金鳞龙宫展", fishingSpeedPct: 18, cookingQualityPct: 15, goldGainPct: 8 },
  { tier: 6, minSpecies: 12, title: "海港水族馆·全图鉴", fishingSpeedPct: 22, cookingQualityPct: 18, goldGainPct: 10 },
];

export function isValidHarborGroundId(id: unknown): id is HarborGroundId {
  return typeof id === "string" && (HARBOR_GROUND_IDS as readonly string[]).includes(id);
}

export function isValidHarborBaitId(id: unknown): id is HarborBaitId {
  return typeof id === "string" && (HARBOR_BAIT_IDS as readonly string[]).includes(id);
}

export function isValidHarborSpeciesId(id: unknown): id is HarborSpeciesId {
  return typeof id === "string" && (HARBOR_SPECIES_IDS as readonly string[]).includes(id);
}

export function isValidHarborTankThemeId(id: unknown): id is HarborTankThemeId {
  return typeof id === "string" && (HARBOR_TANK_THEME_IDS as readonly string[]).includes(id);
}

/** 业务周序号（东八区周一 0 点翻篇）。 */
export function getHarborWeekIndex(now: Date | number): number {
  const ms = typeof now === "number" ? now : now.getTime();
  return Math.floor((ms + HARBOR_TZ_OFFSET_MINUTES * 60_000 - HARBOR_WEEK_EPOCH_MS) / HARBOR_WEEK_MS);
}

/** 周序号 → 周一日期键 YYYY-MM-DD。 */
export function harborWeekKeyFromIndex(index: number): string {
  return new Date(HARBOR_WEEK_EPOCH_MS + Math.floor(index) * HARBOR_WEEK_MS).toISOString().slice(0, 10);
}

export function harborWeekKey(now: Date | number): string {
  return harborWeekKeyFromIndex(getHarborWeekIndex(now));
}

/** 周一日期键 → 周序号；非法键（格式错误 / 非周一）返回 null。 */
export function harborWeekIndexFromKey(key: unknown): number | null {
  if (typeof key !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const ms = Date.parse(`${key}T00:00:00Z`);
  if (!Number.isFinite(ms)) return null;
  const diff = ms - HARBOR_WEEK_EPOCH_MS;
  if (diff % HARBOR_WEEK_MS !== 0) return null;
  return diff / HARBOR_WEEK_MS;
}

/** 该业务周结束（下周一东八区 0 点）的 UTC 毫秒时间戳。 */
export function harborWeekEndsAtMs(index: number): number {
  return HARBOR_WEEK_EPOCH_MS + (Math.floor(index) + 1) * HARBOR_WEEK_MS - HARBOR_TZ_OFFSET_MINUTES * 60_000;
}

/** 每周轮换鱼场：周序号对鱼场数取模。 */
export function getHarborGroundForWeek(index: number): HarborGroundDef {
  const n = HARBOR_GROUNDS.length;
  const i = ((Math.floor(index) % n) + n) % n;
  return HARBOR_GROUNDS[i];
}

/** 累计真实钓鱼行动数：stats.actionsById 中所有 act_fish_* 的完成次数之和。 */
export function countHarborFishingActions(actionsById: unknown): number {
  if (!actionsById || typeof actionsById !== "object") return 0;
  let total = 0;
  for (const [k, v] of Object.entries(actionsById as Record<string, unknown>)) {
    if (!k.startsWith(HARBOR_FISHING_ACTION_PREFIX)) continue;
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) total += Math.floor(n);
  }
  return total;
}

/** 本周剩余竿次 = min(本周钓鱼行动 / 每次消耗, 周上限) - 已参赛次数。 */
export function getHarborCastsAvailable(weeklyFishingActions: number, entriesUsed: number): number {
  const fishing = Number.isFinite(weeklyFishingActions) && weeklyFishingActions > 0 ? Math.floor(weeklyFishingActions) : 0;
  const used = Number.isFinite(entriesUsed) && entriesUsed > 0 ? Math.floor(entriesUsed) : 0;
  const earned = Math.min(HARBOR_WEEKLY_ENTRY_CAP, Math.floor(fishing / HARBOR_CASTS_PER_ENTRY));
  return Math.max(0, earned - used);
}

export function getHarborDerbyTier(weeklyScore: number) {
  const score = Number.isFinite(weeklyScore) && weeklyScore > 0 ? Math.floor(weeklyScore) : 0;
  let current = HARBOR_DERBY_TIERS[0];
  let next: HarborDerbyTierDef | null = null;
  for (let i = 0; i < HARBOR_DERBY_TIERS.length; i++) {
    if (score >= HARBOR_DERBY_TIERS[i].minScore) {
      current = HARBOR_DERBY_TIERS[i];
      next = HARBOR_DERBY_TIERS[i + 1] ?? null;
    }
  }
  const progressPct = next
    ? Math.min(
        100,
        Math.max(0, Math.round(((score - current.minScore) / Math.max(1, next.minScore - current.minScore)) * 100))
      )
    : 100;
  return { current, next, progressPct, weeklyScore: score };
}

export function harborTrophyPoints(trophies: Partial<Record<string, unknown>> | null | undefined): number {
  const src = trophies && typeof trophies === "object" ? trophies : {};
  let points = 0;
  for (const tier of HARBOR_DERBY_TIERS) {
    if (!tier.trophy) continue;
    const n = Number(src[tier.trophy]);
    if (Number.isFinite(n) && n > 0) points += Math.floor(n) * tier.trophyPoints;
  }
  return points;
}

export function getHarborRodTier(trophyPoints: number) {
  const pts = Number.isFinite(trophyPoints) && trophyPoints > 0 ? Math.floor(trophyPoints) : 0;
  let current = HARBOR_ROD_TIERS[0];
  let next: HarborRodTierDef | null = null;
  for (let i = 0; i < HARBOR_ROD_TIERS.length; i++) {
    if (pts >= HARBOR_ROD_TIERS[i].minTrophyPoints) {
      current = HARBOR_ROD_TIERS[i];
      next = HARBOR_ROD_TIERS[i + 1] ?? null;
    }
  }
  const progressPct = next
    ? Math.min(
        100,
        Math.max(
          0,
          Math.round(((pts - current.minTrophyPoints) / Math.max(1, next.minTrophyPoints - current.minTrophyPoints)) * 100)
        )
      )
    : 100;
  return { current, next, progressPct, trophyPoints: pts };
}

/** 周榜：按分数降序（同分先钓先上榜）取前 N 条，附原始下标。 */
export function getHarborLeaderboard<T extends { score: number }>(
  catches: ReadonlyArray<T> | null | undefined
): Array<T & { index: number }> {
  const list = Array.isArray(catches) ? catches : [];
  return list
    .map((c, index) => ({ ...c, index }))
    .filter((c) => Number.isFinite(c.score) && c.score >= 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, HARBOR_LEADERBOARD_SIZE);
}

/** 本周周榜积分 = 本周最佳 N 条渔获分数之和。 */
export function computeHarborWeeklyScore(catches: ReadonlyArray<{ score: number }> | null | undefined): number {
  let total = 0;
  for (const c of getHarborLeaderboard(catches)) total += Math.floor(c.score);
  return total;
}

/** 周榜结算：段位 → 奖杯、金币、鱼饵与首次达成的稀有鱼饵配方（含所有更低段位的未掌握配方）。 */
export function computeHarborSettlement(
  catches: ReadonlyArray<{ score: number }> | null | undefined,
  knownRecipes: ReadonlyArray<string> | null | undefined
) {
  const weeklyScore = computeHarborWeeklyScore(catches);
  const tier = getHarborDerbyTier(weeklyScore).current;
  const known = Array.isArray(knownRecipes) ? knownRecipes : [];
  const unlockedRecipes: HarborBaitId[] = [];
  for (const t of HARBOR_DERBY_TIERS) {
    if (t.rank === 0 || t.rank > tier.rank || !t.recipe) continue;
    if (!known.includes(t.recipe) && !unlockedRecipes.includes(t.recipe)) unlockedRecipes.push(t.recipe);
  }
  const baitReward: Partial<Record<HarborBaitId, number>> = {};
  for (const id of HARBOR_BAIT_IDS) {
    const n = tier.baitReward[id];
    if (typeof n === "number" && n > 0) baitReward[id] = n;
  }
  return {
    weeklyScore,
    tierId: tier.id,
    tierName: tier.name,
    trophyGranted: tier.trophy,
    trophyPoints: tier.trophyPoints,
    goldReward: tier.goldReward,
    baitReward,
    unlockedRecipes,
  };
}

export interface HarborPoolEntry {
  speciesId: HarborSpeciesId;
  weight: number;
  featured: boolean;
}

/** 本周鱼场鱼种池：厨师（钓鱼）等级门槛 + 专属鱼饵门槛；权重 = 稀有度基础 × (4 + 鱼饵稀有偏移 × (稀有度-1)) × 主打 × 专属。 */
export function buildHarborCatchPool(groundId: HarborGroundId, chefLevel: number, baitId: HarborBaitId): HarborPoolEntry[] {
  const ground = HARBOR_GROUNDS.find((g) => g.id === groundId) || HARBOR_GROUNDS[0];
  const bait = HARBOR_BAITS.find((b) => b.id === baitId) || HARBOR_BAITS[0];
  const lv = Number.isFinite(chefLevel) && chefLevel > 0 ? Math.floor(chefLevel) : 1;
  const pool: HarborPoolEntry[] = [];
  for (const sp of HARBOR_SPECIES) {
    if (lv < sp.minChefLevel) continue;
    if (sp.exclusiveBait && sp.exclusiveBait !== bait.id) continue;
    const featured = ground.featuredSpecies.includes(sp.id);
    let weight = HARBOR_RARITY_WEIGHTS[sp.rarity] * (4 + bait.rarityShift * (sp.rarity - 1));
    if (featured) weight *= HARBOR_FEATURED_WEIGHT_MULT;
    if (sp.exclusiveBait) weight *= HARBOR_EXCLUSIVE_LURE_WEIGHT_MULT;
    pool.push({ speciesId: sp.id, weight, featured });
  }
  return pool;
}

/** 计分 = 基础分 × 尺寸/标准尺寸 × 主打倍率 × (1 + 鱼饵与钓竿计分加成) × 奖杯级尺寸加成，四舍五入且至少 1 分。 */
export function scoreHarborCatch(
  speciesId: HarborSpeciesId,
  sizeCm: number,
  featured: boolean,
  scoreBonusPct: number
): { score: number; trophySize: boolean } {
  const sp = HARBOR_SPECIES.find((s) => s.id === speciesId);
  if (!sp || !Number.isFinite(sizeCm) || sizeCm <= 0) return { score: 0, trophySize: false };
  const trophySize = sizeCm >= sp.maxSizeCm;
  const bonus = Number.isFinite(scoreBonusPct) && scoreBonusPct > 0 ? scoreBonusPct : 0;
  const pct =
    (featured ? HARBOR_FEATURED_SCORE_PCT : 100) *
    (100 + bonus) *
    (trophySize ? 100 + HARBOR_TROPHY_SIZE_SCORE_PCT : 100);
  const score = Math.max(1, Math.round(((sp.baseScore * sizeCm) / sp.refSizeCm) * pct / 1_000_000));
  return { score, trophySize };
}

/** FNV-1a 32-bit + Mulberry32（与后端 createSeededRng 逐位一致）。 */
export function createHarborRng(seedKey: string): () => number {
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

export function buildHarborEntrySeedKey(weekKey: string, entryIndex: number, totalEntries: number, salt: string): string {
  return `wl11-harbor:${weekKey}#e${Math.max(0, Math.floor(entryIndex || 0))}#t${Math.max(0, Math.floor(totalEntries || 0))}#${salt}`;
}

export interface HarborRollContext {
  groundId: HarborGroundId;
  chefLevel: number;
  baitId: HarborBaitId;
  rodTier: number;
}

/** 确定性投竿：第一次随机抽鱼种（按池权重），第二次随机定尺寸（鱼饵与钓竿放大），随后计分。 */
export function rollHarborCatch(seedKey: string, ctx: HarborRollContext) {
  const rng = createHarborRng(seedKey);
  const pool = buildHarborCatchPool(ctx.groundId, ctx.chefLevel, ctx.baitId);
  const bait = HARBOR_BAITS.find((b) => b.id === ctx.baitId) || HARBOR_BAITS[0];
  const rodIdx = Number.isFinite(ctx.rodTier) ? Math.max(0, Math.min(HARBOR_ROD_TIERS.length - 1, Math.floor(ctx.rodTier))) : 0;
  const rod = HARBOR_ROD_TIERS[rodIdx];
  const total = pool.reduce((s, p) => s + p.weight, 0);
  let pick = pool[0];
  let r = rng() * total;
  for (const p of pool) {
    if (r < p.weight) {
      pick = p;
      break;
    }
    r -= p.weight;
  }
  const sp = HARBOR_SPECIES.find((s) => s.id === pick.speciesId)!;
  const r2 = rng();
  const sizePct = 100 + bait.sizeBonusPct + rod.sizeBonusPct;
  const rawSize = sp.minSizeCm + (sp.maxSizeCm - sp.minSizeCm) * r2;
  const sizeCm = Math.round((rawSize * sizePct) / 10) / 10;
  const { score, trophySize } = scoreHarborCatch(sp.id, sizeCm, pick.featured, bait.scoreBonusPct + rod.scoreBonusPct);
  return { speciesId: sp.id, sizeCm, score, featured: pick.featured, trophySize };
}

/** 水族馆收藏净化：只保留合法鱼种且至少收藏 1 尾，最佳尺寸保留 1 位小数。 */
export function cleanHarborAquariumSpecies(
  raw: unknown
): Partial<Record<HarborSpeciesId, { count: number; bestSizeCm: number }>> {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out: Partial<Record<HarborSpeciesId, { count: number; bestSizeCm: number }>> = {};
  for (const id of HARBOR_SPECIES_IDS) {
    const e = src[id] as { count?: unknown; bestSizeCm?: unknown } | null | undefined;
    if (!e || typeof e !== "object") continue;
    const count = Number(e.count);
    if (!Number.isFinite(count) || count < 1) continue;
    const size = Number(e.bestSizeCm);
    out[id] = {
      count: Math.floor(count),
      bestSizeCm: Number.isFinite(size) && size > 0 ? Math.round(size * 10) / 10 : 0,
    };
  }
  return out;
}

export function countHarborCollectedSpecies(species: Partial<Record<string, { count: number } | undefined>> | null | undefined): number {
  if (!species || typeof species !== "object") return 0;
  let n = 0;
  for (const id of HARBOR_SPECIES_IDS) {
    const e = species[id];
    if (e && e.count >= 1) n += 1;
  }
  return n;
}

export function getHarborAquariumTier(collectedCount: number) {
  const n = Number.isFinite(collectedCount) && collectedCount > 0 ? Math.min(HARBOR_SPECIES_IDS.length, Math.floor(collectedCount)) : 0;
  let current = HARBOR_AQUARIUM_TIERS[0];
  let next: HarborAquariumTierDef | null = null;
  for (let i = 0; i < HARBOR_AQUARIUM_TIERS.length; i++) {
    if (n >= HARBOR_AQUARIUM_TIERS[i].minSpecies) {
      current = HARBOR_AQUARIUM_TIERS[i];
      next = HARBOR_AQUARIUM_TIERS[i + 1] ?? null;
    }
  }
  const progressPct = next
    ? Math.min(
        100,
        Math.max(0, Math.round(((n - current.minSpecies) / Math.max(1, next.minSpecies - current.minSpecies)) * 100))
      )
    : 100;
  return { current, next, progressPct, collectedCount: n };
}

export function isHarborTankUnlocked(themeId: HarborTankThemeId, collectedCount: number): boolean {
  const theme = HARBOR_TANK_THEMES.find((t) => t.id === themeId);
  return Boolean(theme) && collectedCount >= theme!.unlockSpecies;
}

export function isHarborTankFull(
  themeId: HarborTankThemeId,
  species: Partial<Record<string, { count: number } | undefined>> | null | undefined
): boolean {
  const members = HARBOR_SPECIES.filter((s) => s.tankTheme === themeId);
  if (members.length === 0 || !species) return false;
  return members.every((s) => (species[s.id]?.count || 0) >= 1);
}

/** 主展缸净化：非法或尚未解锁的主题一律回退为空。 */
export function sanitizeHarborFeaturedTank(raw: unknown, collectedCount: number): HarborTankThemeId | null {
  if (!isValidHarborTankThemeId(raw)) return null;
  return isHarborTankUnlocked(raw, collectedCount) ? raw : null;
}

export interface HarborAquariumBonuses {
  collectedCount: number;
  totalSpecies: number;
  collectionTier: number;
  collectionTitle: string;
  unlockedTanks: HarborTankThemeId[];
  featuredTank: HarborTankThemeId | null;
  featuredTankFull: boolean;
  fishingSpeedPct: number;
  cookingQualityPct: number;
  goldGainPct: number;
}

export type MinimalHarborAquariumHolder = {
  harborAquarium?: {
    species?: unknown;
    featuredTank?: unknown;
  } | null;
} | null;

/** 水族馆加成 = 收藏进度阶位 + 主展缸主题共鸣（该缸鱼种收齐时共鸣翻倍）。 */
export function getHarborAquariumBonuses(holder?: MinimalHarborAquariumHolder): HarborAquariumBonuses {
  const aq = holder?.harborAquarium;
  const species = cleanHarborAquariumSpecies(aq && typeof aq === "object" ? aq.species : null);
  const collected = countHarborCollectedSpecies(species);
  const tier = getHarborAquariumTier(collected).current;
  const featuredTank = aq && typeof aq === "object" ? sanitizeHarborFeaturedTank(aq.featuredTank, collected) : null;
  let fishingSpeedPct = tier.fishingSpeedPct;
  let cookingQualityPct = tier.cookingQualityPct;
  let goldGainPct = tier.goldGainPct;
  let featuredTankFull = false;
  if (featuredTank) {
    const theme = HARBOR_TANK_THEMES.find((t) => t.id === featuredTank)!;
    featuredTankFull = isHarborTankFull(featuredTank, species);
    const mult = featuredTankFull ? HARBOR_FULL_TANK_RESONANCE_MULT : 1;
    fishingSpeedPct += (theme.resonance.fishingSpeedPct || 0) * mult;
    cookingQualityPct += (theme.resonance.cookingQualityPct || 0) * mult;
    goldGainPct += (theme.resonance.goldGainPct || 0) * mult;
  }
  return {
    collectedCount: collected,
    totalSpecies: HARBOR_SPECIES_IDS.length,
    collectionTier: tier.tier,
    collectionTitle: tier.title,
    unlockedTanks: HARBOR_TANK_THEMES.filter((t) => collected >= t.unlockSpecies).map((t) => t.id),
    featuredTank,
    featuredTankFull,
    fishingSpeedPct,
    cookingQualityPct,
    goldGainPct,
  };
}

/* ---- 以上为 WL-11 core ---- */

function harborChefLevel(player: EnhancedPlayerState): number {
  const lv = Math.floor(Number(player.skills?.skill_chef?.level || 1));
  return Number.isFinite(lv) && lv > 0 ? lv : 1;
}

function harborCleanInt(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallback;
}

function sanitizeHarborCatchRecord(raw: unknown): HarborCatchRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!isValidHarborSpeciesId(r.speciesId) || !isValidHarborBaitId(r.baitId)) return null;
  const size = Number(r.sizeCm);
  const score = Number(r.score);
  if (!Number.isFinite(size) || size <= 0 || !Number.isFinite(score) || score < 0) return null;
  return {
    speciesId: r.speciesId,
    sizeCm: Math.round(size * 10) / 10,
    score: Math.floor(score),
    baitId: r.baitId,
    featured: r.featured === true,
    trophySize: r.trophySize === true,
    at: typeof r.at === "string" ? r.at : new Date(0).toISOString(),
  };
}

function sanitizeHarborSettlement(raw: unknown): HarborDerbySettlement | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (harborWeekIndexFromKey(r.weekKey) === null || !isValidHarborGroundId(r.groundId)) return null;
  const tier = HARBOR_DERBY_TIERS.find((t) => t.id === r.tier);
  if (!tier) return null;
  const baitReward: Partial<Record<HarborBaitId, number>> = {};
  const rawBait = r.baitReward && typeof r.baitReward === "object" ? (r.baitReward as Record<string, unknown>) : {};
  for (const id of HARBOR_BAIT_IDS) {
    const n = harborCleanInt(rawBait[id], 0);
    if (n > 0) baitReward[id] = n;
  }
  const unlocked = Array.isArray(r.unlockedRecipes)
    ? HARBOR_BAIT_IDS.filter((id) => (r.unlockedRecipes as unknown[]).includes(id))
    : [];
  return {
    weekKey: r.weekKey as string,
    groundId: r.groundId,
    tier: tier.id,
    weeklyScore: harborCleanInt(r.weeklyScore, 0),
    entries: Math.min(HARBOR_WEEKLY_ENTRY_CAP, harborCleanInt(r.entries, 0)),
    trophyGranted: tier.trophy,
    unlockedRecipes: unlocked,
    goldReward: harborCleanInt(r.goldReward, 0),
    baitReward,
  };
}

/** 确保 harborAquarium 存在并净化脏档（旧存档首次访问补齐空水族馆；转生永久保留）。 */
export function ensureHarborAquarium(player: EnhancedPlayerState): HarborAquariumState {
  if (!player.harborAquarium || typeof player.harborAquarium !== "object") {
    player.harborAquarium = { species: {}, featuredTank: null };
  }
  const aq = player.harborAquarium;
  aq.species = cleanHarborAquariumSpecies(aq.species);
  aq.featuredTank = sanitizeHarborFeaturedTank(aq.featuredTank, countHarborCollectedSpecies(aq.species));
  return aq;
}

/** 翻周结算（内部）：按上周周榜段位发放奖杯 / 金币 / 鱼饵并解锁稀有鱼饵配方；上周无参赛则不生成结算单。 */
function settleHarborDerbyWeek(player: EnhancedPlayerState, hd: HarborDerbyState): HarborDerbySettlement | null {
  if (hd.entriesUsed <= 0 && hd.weeklyCatches.length === 0) return null;
  const prevIdx = harborWeekIndexFromKey(hd.weekKey) ?? 0;
  const s = computeHarborSettlement(hd.weeklyCatches, hd.knownRecipes);
  if (s.trophyGranted) hd.trophies[s.trophyGranted] = (hd.trophies[s.trophyGranted] || 0) + 1;
  if (s.goldReward > 0) {
    player.inventory.gold = (player.inventory.gold || 0) + s.goldReward;
    if (player.stats) player.stats.totalGoldEarned = (player.stats.totalGoldEarned || 0) + s.goldReward;
  }
  for (const id of HARBOR_BAIT_IDS) {
    const n = s.baitReward[id] || 0;
    if (n > 0) hd.baitStock[id] = Math.min(HARBOR_BAIT_STOCK_CAP, (hd.baitStock[id] || 0) + n);
  }
  for (const rid of s.unlockedRecipes) {
    if (!hd.knownRecipes.includes(rid)) hd.knownRecipes.push(rid);
  }
  hd.knownRecipes = HARBOR_BAIT_IDS.filter((id) => hd.knownRecipes.includes(id));
  hd.bestWeeklyScore = Math.max(hd.bestWeeklyScore, s.weeklyScore);
  const settlement: HarborDerbySettlement = {
    weekKey: hd.weekKey,
    groundId: getHarborGroundForWeek(prevIdx).id,
    tier: s.tierId,
    weeklyScore: s.weeklyScore,
    entries: hd.entriesUsed,
    trophyGranted: s.trophyGranted,
    unlockedRecipes: [...s.unlockedRecipes],
    goldReward: s.goldReward,
    baitReward: { ...s.baitReward },
  };
  if (s.trophyGranted) {
    const def = HARBOR_DERBY_TIERS.find((t) => t.id === s.tierId)!;
    const recipeNote = s.unlockedRecipes.length
      ? `，习得稀有鱼饵配方「${s.unlockedRecipes.map((id) => HARBOR_BAITS.find((b) => b.id === id)!.name).join("」「")}」`
      : "";
    appendLog(
      player,
      `港湾垂钓大赛 ${hd.weekKey} 周结算：周榜 ${s.weeklyScore} 分，荣获「${def.name}」与「${def.trophyName}」，奖励 ${s.goldReward} 金币${recipeNote}！`
    );
  } else {
    appendLog(player, `港湾垂钓大赛 ${hd.weekKey} 周结算：周榜 ${s.weeklyScore} 分，未达青铜段位，下周再接再厉！`);
  }
  return settlement;
}

/**
 * 确保 harborDerby 存在并净化脏档。
 * 仅显式传入 now（指令 / 视图时钟）且业务周前进时才翻周结算；无参调用（ensurePlayerExtensions / 转生净化）
 * 只做净化，绝不按墙钟重置本周渔获与竿次（沿用 WL-10 对 WL-7/8/9 的修复）。
 */
export function ensureHarborDerby(player: EnhancedPlayerState, now?: Date): HarborDerbyState {
  const rollWeekly = now !== undefined;
  const clock = now ?? new Date();
  if (!Array.isArray((player as any).logs)) {
    (player as any).logs = [];
  }
  if (!player.inventory || typeof player.inventory !== "object") {
    player.inventory = { gold: 0 };
  }
  const fishingTotal = countHarborFishingActions(player.stats?.actionsById);
  if (!player.harborDerby || typeof player.harborDerby !== "object") {
    player.harborDerby = {
      weekKey: harborWeekKey(clock),
      // 首次进入大赛：最近的真实钓鱼行动（至多一周上限）计入首周竿次，不赠送任何鱼饵或资源
      fishingBaseline: Math.max(0, fishingTotal - HARBOR_WEEKLY_ENTRY_CAP),
      entriesUsed: 0,
      weeklyCatches: [],
      baitStock: { harbor_worm: 0, glow_shrimp: 0, sunscale_lure: 0, abyss_lantern_lure: 0 },
      knownRecipes: [],
      trophies: { bronze: 0, silver: 0, gold: 0, legend: 0 },
      totalEntries: 0,
      bestWeeklyScore: 0,
      lastSettlement: null,
    };
  }
  const hd = player.harborDerby;
  if (harborWeekIndexFromKey(hd.weekKey) === null) {
    hd.weekKey = harborWeekKey(clock);
  }
  hd.fishingBaseline = Math.min(fishingTotal, harborCleanInt(hd.fishingBaseline, fishingTotal));
  const catches: HarborCatchRecord[] = [];
  if (Array.isArray(hd.weeklyCatches)) {
    for (const raw of hd.weeklyCatches) {
      if (catches.length >= HARBOR_WEEKLY_ENTRY_CAP) break;
      const c = sanitizeHarborCatchRecord(raw);
      if (c) catches.push(c);
    }
  }
  hd.weeklyCatches = catches;
  hd.entriesUsed = Math.min(HARBOR_WEEKLY_ENTRY_CAP, Math.max(catches.length, harborCleanInt(hd.entriesUsed, 0)));
  const rawStock = hd.baitStock && typeof hd.baitStock === "object" ? (hd.baitStock as Record<string, unknown>) : {};
  hd.baitStock = {
    harbor_worm: Math.min(HARBOR_BAIT_STOCK_CAP, harborCleanInt(rawStock.harbor_worm, 0)),
    glow_shrimp: Math.min(HARBOR_BAIT_STOCK_CAP, harborCleanInt(rawStock.glow_shrimp, 0)),
    sunscale_lure: Math.min(HARBOR_BAIT_STOCK_CAP, harborCleanInt(rawStock.sunscale_lure, 0)),
    abyss_lantern_lure: Math.min(HARBOR_BAIT_STOCK_CAP, harborCleanInt(rawStock.abyss_lantern_lure, 0)),
  };
  const rawKnown = Array.isArray(hd.knownRecipes) ? (hd.knownRecipes as unknown[]) : [];
  hd.knownRecipes = HARBOR_BAITS.filter((b) => b.recipeTier !== null && rawKnown.includes(b.id)).map((b) => b.id);
  const rawTrophies = hd.trophies && typeof hd.trophies === "object" ? (hd.trophies as Record<string, unknown>) : {};
  hd.trophies = {
    bronze: harborCleanInt(rawTrophies.bronze, 0),
    silver: harborCleanInt(rawTrophies.silver, 0),
    gold: harborCleanInt(rawTrophies.gold, 0),
    legend: harborCleanInt(rawTrophies.legend, 0),
  };
  hd.totalEntries = Math.max(harborCleanInt(hd.totalEntries, 0), hd.entriesUsed);
  hd.bestWeeklyScore = Math.max(harborCleanInt(hd.bestWeeklyScore, 0), computeHarborWeeklyScore(hd.weeklyCatches));
  hd.lastSettlement = sanitizeHarborSettlement(hd.lastSettlement);

  if (rollWeekly) {
    const curIdx = getHarborWeekIndex(clock);
    const storedIdx = harborWeekIndexFromKey(hd.weekKey)!;
    // 只向前翻周（时钟回拨不回滚）；跨多周只结算最后一个有参赛记录的周
    if (curIdx > storedIdx) {
      const settlement = settleHarborDerbyWeek(player, hd);
      if (settlement) hd.lastSettlement = settlement;
      hd.weekKey = harborWeekKeyFromIndex(curIdx);
      hd.fishingBaseline = fishingTotal;
      hd.entriesUsed = 0;
      hd.weeklyCatches = [];
      const ground = getHarborGroundForWeek(curIdx);
      appendLog(player, `港湾垂钓大赛新一周开赛：本周鱼场「${ground.name}」！`);
    }
  }
  return hd;
}

/** 港湾垂钓大赛参赛（连投 1~5 次）：每次消耗 1 次本周钓鱼行动 + 1 份鱼饵，确定性抽取鱼种与尺寸并计分，渔获入缸收藏。 */
export function enterHarborDerby(
  player: EnhancedPlayerState,
  baitId: HarborBaitId,
  count = 1,
  now: Date = new Date()
): {
  ok: boolean;
  reason?: string;
  baitId?: HarborBaitId;
  catches?: Array<{
    speciesId: HarborSpeciesId;
    name: string;
    rarity: number;
    sizeCm: number;
    score: number;
    featured: boolean;
    trophySize: boolean;
    newSpecies: boolean;
    newRecord: boolean;
  }>;
  weeklyScore?: number;
  tierId?: HarborDerbyTierId;
  tierName?: string;
  tierUp?: boolean;
  castsLeft?: number;
  entriesUsed?: number;
  collectedCount?: number;
  collectionTierUpTo?: number;
  collectionTitle?: string;
  unlockedTanks?: HarborTankThemeId[];
} {
  ensurePlayerExtensions(player);
  if (!isValidHarborBaitId(baitId)) {
    return { ok: false, reason: "未知的鱼饵" };
  }
  const n = Math.floor(Number(count));
  if (!Number.isFinite(n) || n < 1 || n > HARBOR_MAX_ENTRIES_PER_REQUEST) {
    return { ok: false, reason: `单次最多连投 ${HARBOR_MAX_ENTRIES_PER_REQUEST} 竿` };
  }
  const hd = ensureHarborDerby(player, now);
  const bait = HARBOR_BAITS.find((b) => b.id === baitId)!;
  const weekIdx = harborWeekIndexFromKey(hd.weekKey)!;
  const ground = getHarborGroundForWeek(weekIdx);
  const fishingTotal = countHarborFishingActions(player.stats?.actionsById);
  const castsLeft = getHarborCastsAvailable(fishingTotal - hd.fishingBaseline, hd.entriesUsed);

  if (hd.entriesUsed + n > HARBOR_WEEKLY_ENTRY_CAP) {
    return {
      ok: false,
      reason: `本周参赛次数已达上限（${hd.entriesUsed}/${HARBOR_WEEKLY_ENTRY_CAP}），下周一鱼场轮换后再来`,
    };
  }
  if (castsLeft < n) {
    return {
      ok: false,
      reason: `本周竿次不足（需 ${n} 竿，剩余 ${castsLeft} 竿；每完成 ${HARBOR_CASTS_PER_ENTRY} 次钓鱼行动获得 1 竿）`,
    };
  }
  if ((hd.baitStock[baitId] || 0) < n) {
    return {
      ok: false,
      reason: `「${bait.name}」库存不足（需 ${n} 份，当前 ${hd.baitStock[baitId] || 0} 份；可在鱼饵工坊调制）`,
    };
  }

  const aq = ensureHarborAquarium(player);
  const prevScore = computeHarborWeeklyScore(hd.weeklyCatches);
  const prevTier = getHarborDerbyTier(prevScore).current;
  const prevCollected = countHarborCollectedSpecies(aq.species);
  const prevAqTier = getHarborAquariumTier(prevCollected).current;
  const rodTier = getHarborRodTier(harborTrophyPoints(hd.trophies)).current.tier;
  const chefLevel = harborChefLevel(player);
  const salt = String(player.stats?.firstPlayedAt || "");
  const at = now.toISOString();

  const results: NonNullable<ReturnType<typeof enterHarborDerby>["catches"]> = [];
  for (let i = 0; i < n; i++) {
    const seed = buildHarborEntrySeedKey(hd.weekKey, hd.entriesUsed, hd.totalEntries, salt);
    const roll = rollHarborCatch(seed, { groundId: ground.id, chefLevel, baitId, rodTier });
    const sp = HARBOR_SPECIES.find((s) => s.id === roll.speciesId)!;
    hd.baitStock[baitId] -= 1;
    hd.entriesUsed += 1;
    hd.totalEntries += 1;
    hd.weeklyCatches.push({
      speciesId: roll.speciesId,
      sizeCm: roll.sizeCm,
      score: roll.score,
      baitId,
      featured: roll.featured,
      trophySize: roll.trophySize,
      at,
    });
    const prev = aq.species[roll.speciesId];
    const newSpecies = !prev || prev.count < 1;
    const newRecord = !newSpecies && roll.sizeCm > (prev?.bestSizeCm || 0);
    aq.species[roll.speciesId] = {
      count: (prev?.count || 0) + 1,
      bestSizeCm: Math.max(prev?.bestSizeCm || 0, roll.sizeCm),
    };
    results.push({
      speciesId: roll.speciesId,
      name: sp.name,
      rarity: sp.rarity,
      sizeCm: roll.sizeCm,
      score: roll.score,
      featured: roll.featured,
      trophySize: roll.trophySize,
      newSpecies,
      newRecord,
    });
  }

  const weeklyScore = computeHarborWeeklyScore(hd.weeklyCatches);
  hd.bestWeeklyScore = Math.max(hd.bestWeeklyScore, weeklyScore);
  const tier = getHarborDerbyTier(weeklyScore).current;
  const collected = countHarborCollectedSpecies(aq.species);
  const aqTier = getHarborAquariumTier(collected).current;
  const unlockedTanks = HARBOR_TANK_THEMES.filter(
    (t) => t.unlockSpecies > prevCollected && t.unlockSpecies <= collected
  ).map((t) => t.id);

  addReputation(player, 2 * n);
  syncAchievements(player);

  const best = results.reduce((a, b) => (b.score > a.score ? b : a), results[0]);
  appendLog(
    player,
    `港湾垂钓大赛「${ground.name}」连投 ${n} 竿（${bait.name}）：最佳渔获「${best.name}」${best.sizeCm}cm 计 ${best.score} 分，周榜 ${weeklyScore} 分。`
  );
  for (const r of results.filter((x) => x.newSpecies)) {
    appendLog(player, `海港水族馆新收藏「${r.name}」（${HARBOR_RARITY_LABELS[r.rarity]}），已入缸展出（转生永久保留）！`);
  }
  if (tier.rank > prevTier.rank) {
    appendLog(player, `港湾垂钓大赛本周段位晋升「${tier.name}」！周一翻周时按该段位结算奖杯与稀有鱼饵配方。`);
  }
  if (aqTier.tier > prevAqTier.tier) {
    appendLog(player, `海港水族馆收藏进度晋升「${aqTier.title}」，钓鱼速度 / 料理品质 / 金币收益加成提升！`);
  }

  return {
    ok: true,
    baitId,
    catches: results,
    weeklyScore,
    tierId: tier.id,
    tierName: tier.name,
    tierUp: tier.rank > prevTier.rank,
    castsLeft: castsLeft - n,
    entriesUsed: hd.entriesUsed,
    collectedCount: collected,
    ...(aqTier.tier > prevAqTier.tier ? { collectionTierUpTo: aqTier.tier, collectionTitle: aqTier.title } : {}),
    ...(unlockedTanks.length > 0 ? { unlockedTanks } : {}),
  };
}

/** 鱼饵工坊：按配方消耗真实钓鱼产物（鱼 / 虾）与金币批量调制鱼饵（1~10 批，库存上限 99）。 */
export function craftHarborBait(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack | undefined,
  baitId: HarborBaitId,
  batches = 1,
  now: Date = new Date()
): {
  ok: boolean;
  reason?: string;
  baitId?: HarborBaitId;
  batches?: number;
  crafted?: number;
  stock?: number;
  spentItems?: Record<string, number>;
  spentGold?: number;
} {
  ensurePlayerExtensions(player);
  if (!isValidHarborBaitId(baitId)) {
    return { ok: false, reason: "未知的鱼饵配方" };
  }
  const b = Math.floor(Number(batches));
  if (!Number.isFinite(b) || b < 1 || b > HARBOR_MAX_CRAFT_BATCHES) {
    return { ok: false, reason: `每次调制 1~${HARBOR_MAX_CRAFT_BATCHES} 批` };
  }
  const hd = ensureHarborDerby(player, now);
  const bait = HARBOR_BAITS.find((x) => x.id === baitId)!;
  if (bait.recipeTier !== null && !hd.knownRecipes.includes(baitId)) {
    const tier = HARBOR_DERBY_TIERS.find((t) => t.id === bait.recipeTier)!;
    return { ok: false, reason: `尚未掌握「${bait.name}」配方（周榜达到「${tier.name}」并在翻周结算时解锁）` };
  }
  const crafted = bait.craftYield * b;
  const stock = hd.baitStock[baitId] || 0;
  if (stock + crafted > HARBOR_BAIT_STOCK_CAP) {
    return { ok: false, reason: `「${bait.name}」库存将超过上限 ${HARBOR_BAIT_STOCK_CAP}（当前 ${stock}）` };
  }
  const spentItems: Record<string, number> = {};
  for (const [itemId, qty] of Object.entries(bait.craftItems)) {
    const need = qty * b;
    const have = Math.floor(Number(player.inventory[itemId] || 0));
    if (have < need) {
      const label = ((contentPack?.items as Array<{ id: string; name?: string }> | undefined) || []).find((i) => i.id === itemId)?.name || itemId;
      return { ok: false, reason: `鱼获不足：调制 ${b} 批「${bait.name}」需「${label}」×${need}（当前 ${have}）` };
    }
    spentItems[itemId] = need;
  }
  const spentGold = bait.craftGold * b;
  if ((player.inventory.gold || 0) < spentGold) {
    return { ok: false, reason: `金币不足：调制 ${b} 批「${bait.name}」需 ${spentGold} 金币` };
  }
  for (const [itemId, need] of Object.entries(spentItems)) {
    player.inventory[itemId] = Math.floor(Number(player.inventory[itemId] || 0)) - need;
    if (player.inventory[itemId] <= 0) delete player.inventory[itemId];
  }
  player.inventory.gold = (player.inventory.gold || 0) - spentGold;
  if (player.stats) player.stats.totalGoldSpent = (player.stats.totalGoldSpent || 0) + spentGold;
  hd.baitStock[baitId] = stock + crafted;
  appendLog(player, `鱼饵工坊调制「${bait.name}」×${crafted}（${b} 批），库存 ${hd.baitStock[baitId]}。`);
  return { ok: true, baitId, batches: b, crafted, stock: hd.baitStock[baitId], spentItems, spentGold };
}

/** 设置 / 取消海港水族馆主展缸（主题需已由收藏进度解锁）。 */
export function setHarborFeaturedTank(
  player: EnhancedPlayerState,
  themeId: HarborTankThemeId | null
): { ok: boolean; reason?: string; featuredTank?: HarborTankThemeId | null } {
  ensurePlayerExtensions(player);
  const aq = ensureHarborAquarium(player);
  if (themeId === null) {
    if (aq.featuredTank === null) return { ok: false, reason: "当前没有主展缸" };
    aq.featuredTank = null;
    appendLog(player, "海港水族馆已撤下主展缸。");
    return { ok: true, featuredTank: null };
  }
  if (!isValidHarborTankThemeId(themeId)) {
    return { ok: false, reason: "未知的水族馆主题缸" };
  }
  const theme = HARBOR_TANK_THEMES.find((t) => t.id === themeId)!;
  const collected = countHarborCollectedSpecies(aq.species);
  if (!isHarborTankUnlocked(themeId, collected)) {
    return {
      ok: false,
      reason: `「${theme.name}」需收藏 ${theme.unlockSpecies} 种鱼解锁（当前 ${collected} 种）`,
    };
  }
  if (aq.featuredTank === themeId) {
    return { ok: false, reason: `「${theme.name}」已是主展缸` };
  }
  aq.featuredTank = themeId;
  appendLog(player, `海港水族馆主展缸切换为「${theme.name}」，主题共鸣生效！`);
  return { ok: true, featuredTank: themeId };
}

/** 构造前端「港湾垂钓大赛 & 海港水族馆」面板视图（会补齐两份状态并按显式 now 翻周结算）。 */
export function getHarborDerbyInfo(
  player: EnhancedPlayerState,
  contentPack?: EnhancedContentPack,
  now: Date = new Date()
) {
  ensurePlayerExtensions(player);
  const hd = ensureHarborDerby(player, now);
  const aq = ensureHarborAquarium(player);
  const itemName = (id: string): string =>
    ((contentPack?.items as Array<{ id: string; name?: string }> | undefined) || []).find((i) => i.id === id)?.name || id;

  const weekIndex = harborWeekIndexFromKey(hd.weekKey)!;
  const ground = getHarborGroundForWeek(weekIndex);
  const nextGround = getHarborGroundForWeek(weekIndex + 1);
  const chefLevel = harborChefLevel(player);
  const fishingTotal = countHarborFishingActions(player.stats?.actionsById);
  const weeklyFishingActions = Math.max(0, fishingTotal - hd.fishingBaseline);
  const castsAvailable = getHarborCastsAvailable(weeklyFishingActions, hd.entriesUsed);
  const weeklyScore = computeHarborWeeklyScore(hd.weeklyCatches);
  const tierInfo = getHarborDerbyTier(weeklyScore);
  const trophyPoints = harborTrophyPoints(hd.trophies);
  const rodInfo = getHarborRodTier(trophyPoints);
  const projected = computeHarborSettlement(hd.weeklyCatches, hd.knownRecipes);

  const speciesView = (sp: HarborSpeciesDef) => ({
    id: sp.id,
    name: sp.name,
    iconKind: sp.iconKind,
    iconId: sp.iconId,
    rarity: sp.rarity,
    rarityLabel: HARBOR_RARITY_LABELS[sp.rarity],
  });
  const decorate = (c: HarborCatchRecord & { index?: number }) => {
    const sp = HARBOR_SPECIES.find((s) => s.id === c.speciesId)!;
    return {
      ...speciesView(sp),
      speciesId: c.speciesId,
      sizeCm: c.sizeCm,
      score: c.score,
      baitId: c.baitId,
      baitName: HARBOR_BAITS.find((b) => b.id === c.baitId)?.name || c.baitId,
      featured: c.featured,
      trophySize: c.trophySize,
      at: c.at,
    };
  };

  const gold = Math.floor(Number(player.inventory.gold || 0));
  const baits = HARBOR_BAITS.map((b) => {
    const known = b.recipeTier === null || hd.knownRecipes.includes(b.id);
    const stock = hd.baitStock[b.id] || 0;
    const items = Object.entries(b.craftItems).map(([itemId, qty]) => ({
      itemId,
      name: itemName(itemId),
      qty,
      have: Math.floor(Number(player.inventory[itemId] || 0)),
    }));
    let maxBatches = HARBOR_MAX_CRAFT_BATCHES;
    for (const it of items) maxBatches = Math.min(maxBatches, Math.floor(it.have / it.qty));
    if (b.craftGold > 0) maxBatches = Math.min(maxBatches, Math.floor(gold / b.craftGold));
    maxBatches = Math.max(0, Math.min(maxBatches, Math.floor((HARBOR_BAIT_STOCK_CAP - stock) / b.craftYield)));
    const recipeTierDef = b.recipeTier ? HARBOR_DERBY_TIERS.find((t) => t.id === b.recipeTier)! : null;
    let craftBlockReason: string | null = null;
    if (!known) craftBlockReason = `需「${recipeTierDef!.name}」结算解锁`;
    else if (stock + b.craftYield > HARBOR_BAIT_STOCK_CAP) craftBlockReason = "库存已满";
    else if (maxBatches < 1) craftBlockReason = items.some((it) => it.have < it.qty) ? "鱼获不足" : "金币不足";
    const unlocks = b.unlocksSpecies ? HARBOR_SPECIES.find((s) => s.id === b.unlocksSpecies)! : null;
    return {
      id: b.id,
      name: b.name,
      subtitle: b.subtitle,
      description: b.description,
      iconId: b.iconId,
      rarityShift: b.rarityShift,
      sizeBonusPct: b.sizeBonusPct,
      scoreBonusPct: b.scoreBonusPct,
      unlocksSpecies: b.unlocksSpecies,
      unlocksSpeciesName: unlocks ? unlocks.name : null,
      recipeTier: b.recipeTier,
      recipeTierName: recipeTierDef ? recipeTierDef.name : null,
      known,
      stock,
      craftItems: items,
      craftGold: b.craftGold,
      craftYield: b.craftYield,
      maxBatches,
      canCraft: craftBlockReason === null,
      craftBlockReason,
      canEnter: stock > 0 && castsAvailable > 0 && hd.entriesUsed < HARBOR_WEEKLY_ENTRY_CAP,
    };
  });

  const bonuses = getHarborAquariumBonuses(player);
  const aqTier = getHarborAquariumTier(bonuses.collectedCount);
  const tanks = HARBOR_TANK_THEMES.map((t) => {
    const unlocked = isHarborTankUnlocked(t.id, bonuses.collectedCount);
    const full = isHarborTankFull(t.id, aq.species);
    const mult = full ? HARBOR_FULL_TANK_RESONANCE_MULT : 1;
    return {
      id: t.id,
      name: t.name,
      subtitle: t.subtitle,
      description: t.description,
      unlockSpecies: t.unlockSpecies,
      unlocked,
      featured: aq.featuredTank === t.id,
      full,
      resonance: t.resonance,
      effectiveResonance: {
        fishingSpeedPct: (t.resonance.fishingSpeedPct || 0) * mult,
        cookingQualityPct: (t.resonance.cookingQualityPct || 0) * mult,
        goldGainPct: (t.resonance.goldGainPct || 0) * mult,
      },
      species: HARBOR_SPECIES.filter((s) => s.tankTheme === t.id).map((s) => {
        const e = aq.species[s.id];
        const bait = s.exclusiveBait ? HARBOR_BAITS.find((b) => b.id === s.exclusiveBait)! : null;
        return {
          ...speciesView(s),
          collected: Boolean(e && e.count >= 1),
          count: e?.count || 0,
          bestSizeCm: e?.bestSizeCm || 0,
          maxSizeCm: s.maxSizeCm,
          minChefLevel: s.minChefLevel,
          exclusiveBaitName: bait ? bait.name : null,
        };
      }),
    };
  });

  return {
    nowMs: now.getTime(),
    weekKey: hd.weekKey,
    weekIndex,
    weekEndsAtMs: harborWeekEndsAtMs(weekIndex),
    ground: {
      id: ground.id,
      name: ground.name,
      subtitle: ground.subtitle,
      description: ground.description,
      sceneId: ground.sceneId,
      featuredSpecies: ground.featuredSpecies.map((id) => speciesView(HARBOR_SPECIES.find((s) => s.id === id)!)),
    },
    nextGround: { id: nextGround.id, name: nextGround.name, subtitle: nextGround.subtitle },
    chefLevel,
    fishingActionsThisWeek: weeklyFishingActions,
    castsAvailable,
    castsPerEntry: HARBOR_CASTS_PER_ENTRY,
    entriesUsed: hd.entriesUsed,
    entryCap: HARBOR_WEEKLY_ENTRY_CAP,
    maxEntriesPerRequest: HARBOR_MAX_ENTRIES_PER_REQUEST,
    weeklyScore,
    tier: {
      current: tierInfo.current,
      next: tierInfo.next,
      progressPct: tierInfo.progressPct,
      allTiers: HARBOR_DERBY_TIERS,
    },
    projectedSettlement: projected,
    leaderboardSize: HARBOR_LEADERBOARD_SIZE,
    leaderboard: getHarborLeaderboard(hd.weeklyCatches).map(decorate),
    recentCatches: hd.weeklyCatches.slice(-5).reverse().map(decorate),
    weeklyCatchCount: hd.weeklyCatches.length,
    baits,
    knownRecipes: [...hd.knownRecipes],
    trophies: { ...hd.trophies },
    trophyPoints,
    rod: {
      tier: rodInfo.current.tier,
      title: rodInfo.current.title,
      sizeBonusPct: rodInfo.current.sizeBonusPct,
      scoreBonusPct: rodInfo.current.scoreBonusPct,
      next: rodInfo.next,
      progressPct: rodInfo.progressPct,
      allTiers: HARBOR_ROD_TIERS,
    },
    totalEntries: hd.totalEntries,
    bestWeeklyScore: hd.bestWeeklyScore,
    lastSettlement: hd.lastSettlement
      ? {
          ...hd.lastSettlement,
          groundName: HARBOR_GROUNDS.find((g) => g.id === hd.lastSettlement!.groundId)?.name || hd.lastSettlement.groundId,
          tierName: HARBOR_DERBY_TIERS.find((t) => t.id === hd.lastSettlement!.tier)?.name || hd.lastSettlement.tier,
          unlockedRecipeNames: hd.lastSettlement.unlockedRecipes.map(
            (id) => HARBOR_BAITS.find((b) => b.id === id)?.name || id
          ),
        }
      : null,
    aquarium: {
      collectedCount: bonuses.collectedCount,
      totalSpecies: bonuses.totalSpecies,
      tier: {
        current: aqTier.current,
        next: aqTier.next,
        progressPct: aqTier.progressPct,
        allTiers: HARBOR_AQUARIUM_TIERS,
      },
      featuredTank: aq.featuredTank,
      fullTankResonanceMult: HARBOR_FULL_TANK_RESONANCE_MULT,
      tanks,
      bonuses,
    },
  };
}

/* ============================ 冒险者学院进修课程 & 四季节庆活动日历 (WL-12) ============================ */
// 前端 frontend/src/gameplay/academyFestival.ts 逐表逐式 1:1 镜像（scripts/academy-festival-parity.test.ts 守护，
// 「WL-12 core」区段两端逐字一致）。
// - 冒险者学院进修课程（转生永久保留）：以金币 + 真实生活职业成品报名限时课程（进修席位 1，同一时间只修 1 门）；
//   课程到点后按显式 now 结业发放所属学系学分。四系学分阈值解锁跨职业永久被动（采集速度 / 制作速度 /
//   攻防血 / 金币收益），四系学分总和晋阶学院徽章（经验、金币与全局速度），接入 getActionRates 与战斗真实公式。
// - 四季节庆活动日历：按东八区日期划分春耕 / 夏渔 / 秋收 / 冬猎四季，每季 4 份限定委托（交付真实成品或本季真实
//   行动 / 击杀）发放本季节庆代币，节庆商店兑换金币、季节礼包、学院进修推荐信与四季纪念章（永久）。
//   翻季只在显式传入 now（指令 / 视图时钟）时发生；无参 ensure 只做净化（沿用 WL-10 / WL-11 约定）。

/* ---- 以下为与后端逐字对称的表与纯函数（WL-12 core） ---- */

export const ACADEMY_DEPARTMENT_IDS: readonly AcademyDepartmentId[] = ["gathering", "crafting", "tactics", "commerce"];

export const ACADEMY_COURSE_IDS: readonly AcademyCourseId[] = [
  "field_survey",
  "spirit_botany",
  "forge_practicum",
  "master_artisan",
  "squire_drills",
  "dragon_tactics",
  "ledger_basics",
  "guild_economics",
];

export const FESTIVAL_SEASON_IDS: readonly FestivalSeasonId[] = ["spring", "summer", "autumn", "winter"];

export const FESTIVAL_COMMISSION_IDS: readonly FestivalCommissionId[] = [
  "spring_rice_offering",
  "spring_planting_drive",
  "spring_timber_frames",
  "spring_loom_ribbons",
  "summer_fish_feast",
  "summer_net_casting",
  "summer_cool_drinks",
  "summer_seafood_platter",
  "autumn_bread_basket",
  "autumn_livestock_fair",
  "autumn_honey_jars",
  "autumn_vegetable_stew",
  "winter_hunt_patrol",
  "winter_hearty_stew",
  "winter_healing_supply",
  "winter_iron_chains",
];

export const FESTIVAL_SHOP_ITEM_IDS: readonly FestivalShopItemId[] = [
  "festival_gold_pouch",
  "spring_seed_bundle",
  "spring_academy_letter",
  "spring_keepsake",
  "summer_catch_bundle",
  "summer_academy_letter",
  "summer_keepsake",
  "autumn_harvest_bundle",
  "autumn_academy_letter",
  "autumn_keepsake",
  "winter_hunt_bundle",
  "winter_academy_letter",
  "winter_keepsake",
];

/** 进修席位：同一时间只能修读 1 门课程，结业（到点且以显式 now 结算）后才能报名下一门。 */
export const ACADEMY_COURSE_SLOTS = 1;
/** 单系学分上限（防脏档溢出）。 */
export const ACADEMY_CREDIT_CAP = 9999;
/** 节庆季节按东八区日期划分：3~5 月春耕节、6~8 月夏渔节、9~11 月秋收节、12~2 月冬猎节。 */
export const FESTIVAL_TZ_OFFSET_MINUTES = 480;
export const FESTIVAL_TOKEN_CAP = 999;
/** 翻季时未花完的本季节庆代币按 1 枚 = 20 金币折算，随后清零。 */
export const FESTIVAL_TOKEN_GOLD_RATE = 20;

export interface AcademyStats {
  gatherSpeedPct?: number;
  craftSpeedPct?: number;
  xpGainPct?: number;
  goldGainPct?: number;
  bonusAtk?: number;
  bonusDef?: number;
  bonusHp?: number;
}

export const ACADEMY_STAT_KEYS: readonly (keyof AcademyStats)[] = [
  "gatherSpeedPct",
  "craftSpeedPct",
  "xpGainPct",
  "goldGainPct",
  "bonusAtk",
  "bonusDef",
  "bonusHp",
];

export interface AcademyDepartmentTierDef {
  tier: 0 | 1 | 2 | 3 | 4;
  minCredits: number;
  title: string;
  stats: AcademyStats;
}

export interface AcademyDepartmentDef {
  id: AcademyDepartmentId;
  name: string;
  passiveName: string;
  subtitle: string;
  description: string;
  /** 该季节庆商店的「进修推荐信」为本系增加学分。 */
  festivalSeason: FestivalSeasonId;
  tiers: readonly AcademyDepartmentTierDef[];
}

export const ACADEMY_DEPARTMENTS: readonly AcademyDepartmentDef[] = [
  {
    id: "gathering",
    name: "博物采集系",
    passiveName: "野外通识",
    subtitle: "伐木 · 挖矿 · 种植 · 钓鱼 · 采集 · 水晶",
    description: "教授所有采集职业通用的野外知识，修满学分后全部采集行动永久提速。",
    festivalSeason: "spring",
    tiers: [
      { tier: 0, minCredits: 0, title: "未修读", stats: {} },
      { tier: 1, minCredits: 8, title: "采集初阶", stats: { gatherSpeedPct: 3 } },
      { tier: 2, minCredits: 20, title: "采集中阶", stats: { gatherSpeedPct: 6 } },
      { tier: 3, minCredits: 40, title: "采集高阶", stats: { gatherSpeedPct: 10 } },
      { tier: 4, minCredits: 70, title: "博物大师", stats: { gatherSpeedPct: 15 } },
    ],
  },
  {
    id: "crafting",
    name: "匠艺工坊系",
    passiveName: "百工通识",
    subtitle: "木工 · 锻造 · 烹饪 · 缝纫 · 炼金 · 畜牧",
    description: "汇集各工坊的手艺心得，修满学分后全部制作行动永久提速。",
    festivalSeason: "autumn",
    tiers: [
      { tier: 0, minCredits: 0, title: "未修读", stats: {} },
      { tier: 1, minCredits: 8, title: "工坊初阶", stats: { craftSpeedPct: 3 } },
      { tier: 2, minCredits: 20, title: "工坊中阶", stats: { craftSpeedPct: 6 } },
      { tier: 3, minCredits: 40, title: "工坊高阶", stats: { craftSpeedPct: 10 } },
      { tier: 4, minCredits: 70, title: "匠艺大师", stats: { craftSpeedPct: 15 } },
    ],
  },
  {
    id: "tactics",
    name: "骑士战术系",
    passiveName: "战阵通识",
    subtitle: "近战 · 远程 · 魔法 · 防御",
    description: "由退役骑士讲授的战阵课程，修满学分后永久提升攻击、防御与生命上限。",
    festivalSeason: "winter",
    tiers: [
      { tier: 0, minCredits: 0, title: "未修读", stats: {} },
      { tier: 1, minCredits: 8, title: "战术初阶", stats: { bonusAtk: 4, bonusDef: 2, bonusHp: 12 } },
      { tier: 2, minCredits: 20, title: "战术中阶", stats: { bonusAtk: 9, bonusDef: 4, bonusHp: 28 } },
      { tier: 3, minCredits: 40, title: "战术高阶", stats: { bonusAtk: 15, bonusDef: 7, bonusHp: 50 } },
      { tier: 4, minCredits: 70, title: "战术宗师", stats: { bonusAtk: 24, bonusDef: 10, bonusHp: 80 } },
    ],
  },
  {
    id: "commerce",
    name: "商会经营系",
    passiveName: "经营通识",
    subtitle: "生产金币 · 战斗金币",
    description: "商会账房亲授的经营之道，修满学分后生产与战斗的金币收益永久提升。",
    festivalSeason: "summer",
    tiers: [
      { tier: 0, minCredits: 0, title: "未修读", stats: {} },
      { tier: 1, minCredits: 8, title: "经营初阶", stats: { goldGainPct: 2 } },
      { tier: 2, minCredits: 20, title: "经营中阶", stats: { goldGainPct: 4 } },
      { tier: 3, minCredits: 40, title: "经营高阶", stats: { goldGainPct: 7 } },
      { tier: 4, minCredits: 70, title: "商会大师", stats: { goldGainPct: 10 } },
    ],
  },
];

export interface AcademyBadgeDef {
  tier: 0 | 1 | 2 | 3 | 4;
  minCredits: number;
  name: string;
  iconId: string;
  stats: AcademyStats;
}

/** 学院徽章：按四系学分总和晋阶，徽章加成与各系被动叠加。 */
export const ACADEMY_BADGES: readonly AcademyBadgeDef[] = [
  { tier: 0, minCredits: 0, name: "旁听新生", iconId: "academy_crest", stats: {} },
  { tier: 1, minCredits: 12, name: "铜叶学徒徽章", iconId: "academy_crest", stats: { xpGainPct: 2 } },
  { tier: 2, minCredits: 36, name: "银穗进修徽章", iconId: "academy_crest", stats: { xpGainPct: 4 } },
  { tier: 3, minCredits: 80, name: "金冠学士徽章", iconId: "graduation_cap", stats: { xpGainPct: 6, goldGainPct: 2 } },
  {
    tier: 4,
    minCredits: 150,
    name: "星辉院士徽章",
    iconId: "graduation_cap",
    stats: { xpGainPct: 8, goldGainPct: 3, gatherSpeedPct: 3, craftSpeedPct: 3 },
  },
];

export interface AcademyCourseDef {
  id: AcademyCourseId;
  department: AcademyDepartmentId;
  level: "basic" | "advanced";
  name: string;
  description: string;
  durationMinutes: number;
  goldCost: number;
  /** 报名所需的真实生活职业成品（报名时一次性扣除）。 */
  itemCost: Readonly<Record<string, number>>;
  credits: number;
  minBadgeTier: number;
}

export const ACADEMY_COURSES: readonly AcademyCourseDef[] = [
  {
    id: "field_survey",
    department: "gathering",
    level: "basic",
    name: "野外博物考察",
    description: "带上木板搭营、便当充饥，跟随讲师走遍森林与矿脉辨识资源。",
    durationMinutes: 30,
    goldCost: 200,
    itemCost: { lumber_1: 4, food_simple: 2 },
    credits: 4,
    minBadgeTier: 0,
  },
  {
    id: "spirit_botany",
    department: "gathering",
    level: "advanced",
    name: "灵植栽培研修",
    description: "以灵谷饭款待园丁、亚麻线扎好苗架，研习灵植与稀有作物的采收时机。",
    durationMinutes: 120,
    goldCost: 900,
    itemCost: { food_grain_meal: 6, yarn_2: 3 },
    credits: 11,
    minBadgeTier: 1,
  },
  {
    id: "forge_practicum",
    department: "crafting",
    level: "basic",
    name: "锻冶基础实训",
    description: "交上铜锭与木板做练习件，在工坊导师指点下打磨每一道工序。",
    durationMinutes: 30,
    goldCost: 200,
    itemCost: { ingot_1: 4, lumber_1: 2 },
    credits: 4,
    minBadgeTier: 0,
  },
  {
    id: "master_artisan",
    department: "crafting",
    level: "advanced",
    name: "宗师匠艺研讨",
    description: "以银锭与丝线制作研讨样品，向各工坊宗师请教提速窍门。",
    durationMinutes: 120,
    goldCost: 900,
    itemCost: { ingot_3: 3, yarn_3: 2 },
    credits: 11,
    minBadgeTier: 1,
  },
  {
    id: "squire_drills",
    department: "tactics",
    level: "basic",
    name: "侍从战技操练",
    description: "备好生命药水与料理，在演武场上跟随骑士完成整套操练。",
    durationMinutes: 45,
    goldCost: 300,
    itemCost: { potion_hp_t1: 3, food_simple: 3 },
    credits: 5,
    minBadgeTier: 0,
  },
  {
    id: "dragon_tactics",
    department: "tactics",
    level: "advanced",
    name: "屠龙战术推演",
    description: "在沙盘上推演屠龙战役，高级药水与丰盛炖菜是漫长推演的补给。",
    durationMinutes: 180,
    goldCost: 1400,
    itemCost: { potion_hp_t3: 2, food_hearty_stew: 2 },
    credits: 14,
    minBadgeTier: 2,
  },
  {
    id: "ledger_basics",
    department: "commerce",
    level: "basic",
    name: "商会记账入门",
    description: "用灵面包与提神饮料招待账房先生，学会一本清清楚楚的流水账。",
    durationMinutes: 30,
    goldCost: 400,
    itemCost: { bread: 3, drink_basic: 2 },
    credits: 4,
    minBadgeTier: 0,
  },
  {
    id: "guild_economics",
    department: "commerce",
    level: "advanced",
    name: "公会经济学",
    description: "以精致料理与染布布置商会沙龙，研讨行会定价与远途贸易之道。",
    durationMinutes: 240,
    goldCost: 2000,
    itemCost: { food_fine: 3, dyed_cloth: 2 },
    credits: 16,
    minBadgeTier: 2,
  },
];

export interface FestivalSeasonDef {
  id: FestivalSeasonId;
  name: string;
  shortName: string;
  months: string;
  subtitle: string;
  description: string;
  tokenName: string;
  keepsakeName: string;
  keepsakeStats: AcademyStats;
}

export const FESTIVAL_SEASONS: readonly FestivalSeasonDef[] = [
  {
    id: "spring",
    name: "春耕节",
    shortName: "春耕",
    months: "3~5 月",
    subtitle: "播种 · 纺线 · 修缮农具",
    description: "冰雪消融，公会号召冒险者下田播种、搭建苗架，春耕委托以灵谷饭、种植与纺线为主。",
    tokenName: "青穗花笺",
    keepsakeName: "春耕青穗纪念章",
    keepsakeStats: { gatherSpeedPct: 2 },
  },
  {
    id: "summer",
    name: "夏渔节",
    shortName: "夏渔",
    months: "6~8 月",
    subtitle: "出海 · 鱼宴 · 冰饮",
    description: "港湾渔汛最旺的季节，夏渔委托请冒险者出海撒网、置办鱼宴与消暑冰饮。",
    tokenName: "海贝渔符",
    keepsakeName: "夏渔海贝纪念章",
    keepsakeStats: { goldGainPct: 2 },
  },
  {
    id: "autumn",
    name: "秋收节",
    shortName: "秋收",
    months: "9~11 月",
    subtitle: "烘焙 · 畜牧 · 酿蜜",
    description: "麦浪金黄、牛羊肥壮，秋收委托收集面包、蜂蜜与时蔬炖，并举办畜牧集市。",
    tokenName: "金穗丰收券",
    keepsakeName: "秋收金穗纪念章",
    keepsakeStats: { craftSpeedPct: 2 },
  },
  {
    id: "winter",
    name: "冬猎节",
    shortName: "冬猎",
    months: "12~2 月",
    subtitle: "狩猎 · 炖菜 · 药剂",
    description: "雪原魔物南下，冬猎委托召集冒险者巡猎讨伐，并为猎队备齐炖菜、药水与铁链。",
    tokenName: "雪狼猎牌",
    keepsakeName: "冬猎雪狼纪念章",
    keepsakeStats: { bonusAtk: 5, bonusHp: 20 },
  },
];

/** 四季纪念章全部收齐（四季圆满）时额外获得的永久加成。 */
export const FESTIVAL_FULL_CYCLE_STATS: AcademyStats = { xpGainPct: 3 };

export interface FestivalCommissionDef {
  id: FestivalCommissionId;
  season: FestivalSeasonId;
  name: string;
  description: string;
  /** deliver = 交付真实成品；actions = 本季完成指定前缀的真实行动；kills = 本季累计击杀。 */
  kind: FestivalCommissionKind;
  items: Readonly<Record<string, number>>;
  actionPrefix: string | null;
  /** actions / kills 每次领取所需的本季计数（第 n 次领取需累计 n × target）。 */
  target: number;
  maxClaims: number;
  tokens: number;
  gold: number;
}

export const FESTIVAL_COMMISSIONS: readonly FestivalCommissionDef[] = [
  {
    id: "spring_rice_offering",
    season: "spring",
    name: "春耕灵谷饭供餐",
    description: "为下田的农人送上热腾腾的灵谷饭。",
    kind: "deliver",
    items: { food_grain_meal: 6 },
    actionPrefix: null,
    target: 0,
    maxClaims: 3,
    tokens: 7,
    gold: 120,
  },
  {
    id: "spring_planting_drive",
    season: "spring",
    name: "春播大会",
    description: "本季完成种植行动，帮公会田地赶在春雨前播完种。",
    kind: "actions",
    items: {},
    actionPrefix: "act_plant_",
    target: 15,
    maxClaims: 3,
    tokens: 8,
    gold: 100,
  },
  {
    id: "spring_timber_frames",
    season: "spring",
    name: "苗架木板募集",
    description: "搭建育苗架需要大量标准木板。",
    kind: "deliver",
    items: { lumber_1: 5 },
    actionPrefix: null,
    target: 0,
    maxClaims: 3,
    tokens: 6,
    gold: 100,
  },
  {
    id: "spring_loom_ribbons",
    season: "spring",
    name: "春祭彩绳编织",
    description: "用棉线编出祈愿彩绳，挂满春耕节的田埂。",
    kind: "deliver",
    items: { yarn_1: 4 },
    actionPrefix: null,
    target: 0,
    maxClaims: 3,
    tokens: 6,
    gold: 100,
  },
  {
    id: "summer_fish_feast",
    season: "summer",
    name: "渔港便当慰劳",
    description: "给出海归来的渔夫送上简单料理。",
    kind: "deliver",
    items: { food_simple: 5 },
    actionPrefix: null,
    target: 0,
    maxClaims: 3,
    tokens: 7,
    gold: 120,
  },
  {
    id: "summer_net_casting",
    season: "summer",
    name: "夏日撒网大赛",
    description: "本季完成钓鱼行动，为夏渔节鱼市备足鲜货。",
    kind: "actions",
    items: {},
    actionPrefix: "act_fish_",
    target: 15,
    maxClaims: 3,
    tokens: 8,
    gold: 100,
  },
  {
    id: "summer_cool_drinks",
    season: "summer",
    name: "消暑冰饮摊",
    description: "为节庆集市准备提神饮料。",
    kind: "deliver",
    items: { drink_basic: 3 },
    actionPrefix: null,
    target: 0,
    maxClaims: 3,
    tokens: 7,
    gold: 100,
  },
  {
    id: "summer_seafood_platter",
    season: "summer",
    name: "海鲜盛宴订单",
    description: "港务长点名要两份精致料理宴请远客。",
    kind: "deliver",
    items: { food_fine: 2 },
    actionPrefix: null,
    target: 0,
    maxClaims: 3,
    tokens: 9,
    gold: 150,
  },
  {
    id: "autumn_bread_basket",
    season: "autumn",
    name: "丰收面包篮",
    description: "装满一篮灵面包，分给参加秋收节的乡亲。",
    kind: "deliver",
    items: { bread: 6 },
    actionPrefix: null,
    target: 0,
    maxClaims: 3,
    tokens: 7,
    gold: 120,
  },
  {
    id: "autumn_livestock_fair",
    season: "autumn",
    name: "秋季畜牧集市",
    description: "本季完成畜牧养殖行动，让集市上的牛羊鸡蜂膘肥体壮。",
    kind: "actions",
    items: {},
    actionPrefix: "act_raise_",
    target: 15,
    maxClaims: 3,
    tokens: 8,
    gold: 100,
  },
  {
    id: "autumn_honey_jars",
    season: "autumn",
    name: "金秋蜜罐",
    description: "收集灵蜜酿造秋收节的蜂蜜酒。",
    kind: "deliver",
    items: { honey: 4 },
    actionPrefix: null,
    target: 0,
    maxClaims: 3,
    tokens: 8,
    gold: 120,
  },
  {
    id: "autumn_vegetable_stew",
    season: "autumn",
    name: "时蔬炖菜大锅",
    description: "为秋收庆典的长桌宴准备时蔬炖。",
    kind: "deliver",
    items: { food_vegetable_stew: 3 },
    actionPrefix: null,
    target: 0,
    maxClaims: 3,
    tokens: 8,
    gold: 120,
  },
  {
    id: "winter_hunt_patrol",
    season: "winter",
    name: "雪原巡猎",
    description: "本季累计击杀魔物，护送冬猎商队穿越雪原。",
    kind: "kills",
    items: {},
    actionPrefix: null,
    target: 25,
    maxClaims: 3,
    tokens: 9,
    gold: 150,
  },
  {
    id: "winter_hearty_stew",
    season: "winter",
    name: "猎队暖身炖菜",
    description: "为冬猎队伍准备丰盛炖菜御寒。",
    kind: "deliver",
    items: { food_hearty_stew: 3 },
    actionPrefix: null,
    target: 0,
    maxClaims: 3,
    tokens: 8,
    gold: 120,
  },
  {
    id: "winter_healing_supply",
    season: "winter",
    name: "雪原急救药箱",
    description: "补齐中级生命药水，以备猎队在风雪中负伤。",
    kind: "deliver",
    items: { potion_hp_t2: 3 },
    actionPrefix: null,
    target: 0,
    maxClaims: 3,
    tokens: 7,
    gold: 100,
  },
  {
    id: "winter_iron_chains",
    season: "winter",
    name: "雪橇铁链锻造",
    description: "用铁锭为雪橇打造防滑铁链。",
    kind: "deliver",
    items: { ingot_2: 4 },
    actionPrefix: null,
    target: 0,
    maxClaims: 3,
    tokens: 6,
    gold: 100,
  },
];

export interface FestivalShopItemDef {
  id: FestivalShopItemId;
  /** null = 四季常驻；否则只在该季节庆商店上架。 */
  season: FestivalSeasonId | null;
  kind: FestivalShopItemKind;
  name: string;
  description: string;
  iconKind: "item" | "skills" | "ui";
  iconId: string;
  cost: number;
  /** 每季限购次数。 */
  limit: number;
  gold: number;
  items: Readonly<Record<string, number>>;
  credits: number;
  department: AcademyDepartmentId | null;
}

export const FESTIVAL_SHOP_ITEMS: readonly FestivalShopItemDef[] = [
  {
    id: "festival_gold_pouch",
    season: null,
    kind: "gold",
    name: "节庆金币袋",
    description: "四季常驻：把节庆代币兑换成实打实的金币。",
    iconKind: "ui",
    iconId: "gold",
    cost: 4,
    limit: 6,
    gold: 500,
    items: {},
    credits: 0,
    department: null,
  },
  {
    id: "spring_seed_bundle",
    season: "spring",
    kind: "items",
    name: "春耕灵种礼包",
    description: "灵草、灵花与灵谷各一束，春播与炼金都用得上。",
    iconKind: "item",
    iconId: "herb_farm",
    cost: 6,
    limit: 3,
    gold: 0,
    items: { herb_farm: 6, flower_spirit: 3, grain: 10 },
    credits: 0,
    department: null,
  },
  {
    id: "spring_academy_letter",
    season: "spring",
    kind: "credits",
    name: "博物系进修推荐信",
    description: "春耕节限定：冒险者学院博物采集系 +3 学分。",
    iconKind: "skills",
    iconId: "course_scroll",
    cost: 10,
    limit: 2,
    gold: 0,
    items: {},
    credits: 3,
    department: "gathering",
  },
  {
    id: "spring_keepsake",
    season: "spring",
    kind: "keepsake",
    name: "春耕青穗纪念章",
    description: "春耕节纪念章（转生永久保留）：采集速度 +2%。",
    iconKind: "skills",
    iconId: "festival_calendar",
    cost: 30,
    limit: 1,
    gold: 0,
    items: {},
    credits: 0,
    department: null,
  },
  {
    id: "summer_catch_bundle",
    season: "summer",
    kind: "items",
    name: "夏渔鲜获礼包",
    description: "深海鱼、鲜虾与海鱼，料理与鱼饵的上好原料。",
    iconKind: "item",
    iconId: "fish_deepsea",
    cost: 6,
    limit: 3,
    gold: 0,
    items: { fish_deepsea: 4, shrimp: 6, fish_sea: 6 },
    credits: 0,
    department: null,
  },
  {
    id: "summer_academy_letter",
    season: "summer",
    kind: "credits",
    name: "商会系进修推荐信",
    description: "夏渔节限定：冒险者学院商会经营系 +3 学分。",
    iconKind: "skills",
    iconId: "course_scroll",
    cost: 10,
    limit: 2,
    gold: 0,
    items: {},
    credits: 3,
    department: "commerce",
  },
  {
    id: "summer_keepsake",
    season: "summer",
    kind: "keepsake",
    name: "夏渔海贝纪念章",
    description: "夏渔节纪念章（转生永久保留）：金币收益 +2%。",
    iconKind: "skills",
    iconId: "festival_calendar",
    cost: 30,
    limit: 1,
    gold: 0,
    items: {},
    credits: 0,
    department: null,
  },
  {
    id: "autumn_harvest_bundle",
    season: "autumn",
    kind: "items",
    name: "秋收丰收礼包",
    description: "灵蜜、灵面粉与灵玉米，烘焙与酿造的好材料。",
    iconKind: "item",
    iconId: "honey",
    cost: 6,
    limit: 3,
    gold: 0,
    items: { honey: 4, flour: 8, corn: 6 },
    credits: 0,
    department: null,
  },
  {
    id: "autumn_academy_letter",
    season: "autumn",
    kind: "credits",
    name: "工坊系进修推荐信",
    description: "秋收节限定：冒险者学院匠艺工坊系 +3 学分。",
    iconKind: "skills",
    iconId: "course_scroll",
    cost: 10,
    limit: 2,
    gold: 0,
    items: {},
    credits: 3,
    department: "crafting",
  },
  {
    id: "autumn_keepsake",
    season: "autumn",
    kind: "keepsake",
    name: "秋收金穗纪念章",
    description: "秋收节纪念章（转生永久保留）：制作速度 +2%。",
    iconKind: "skills",
    iconId: "festival_calendar",
    cost: 30,
    limit: 1,
    gold: 0,
    items: {},
    credits: 0,
    department: null,
  },
  {
    id: "winter_hunt_bundle",
    season: "winter",
    kind: "items",
    name: "冬猎补给礼包",
    description: "兽皮、雪兽厚皮与中级生命药水，冬季狩猎必备。",
    iconKind: "item",
    iconId: "leather_hide",
    cost: 6,
    limit: 3,
    gold: 0,
    items: { leather_hide: 3, snow_pelt: 2, potion_hp_t2: 3 },
    credits: 0,
    department: null,
  },
  {
    id: "winter_academy_letter",
    season: "winter",
    kind: "credits",
    name: "战术系进修推荐信",
    description: "冬猎节限定：冒险者学院骑士战术系 +3 学分。",
    iconKind: "skills",
    iconId: "course_scroll",
    cost: 10,
    limit: 2,
    gold: 0,
    items: {},
    credits: 3,
    department: "tactics",
  },
  {
    id: "winter_keepsake",
    season: "winter",
    kind: "keepsake",
    name: "冬猎雪狼纪念章",
    description: "冬猎节纪念章（转生永久保留）：攻击 +5、生命 +20。",
    iconKind: "skills",
    iconId: "festival_calendar",
    cost: 30,
    limit: 1,
    gold: 0,
    items: {},
    credits: 0,
    department: null,
  },
];

export function isValidAcademyDepartmentId(id: unknown): id is AcademyDepartmentId {
  return typeof id === "string" && (ACADEMY_DEPARTMENT_IDS as readonly string[]).includes(id);
}

export function isValidAcademyCourseId(id: unknown): id is AcademyCourseId {
  return typeof id === "string" && (ACADEMY_COURSE_IDS as readonly string[]).includes(id);
}

export function isValidFestivalSeasonId(id: unknown): id is FestivalSeasonId {
  return typeof id === "string" && (FESTIVAL_SEASON_IDS as readonly string[]).includes(id);
}

export function isValidFestivalCommissionId(id: unknown): id is FestivalCommissionId {
  return typeof id === "string" && (FESTIVAL_COMMISSION_IDS as readonly string[]).includes(id);
}

export function isValidFestivalShopItemId(id: unknown): id is FestivalShopItemId {
  return typeof id === "string" && (FESTIVAL_SHOP_ITEM_IDS as readonly string[]).includes(id);
}

function academyCleanCount(v: unknown, cap: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.min(cap, Math.floor(n)) : 0;
}

/** 各系学分净化：只保留四系、非负整数、单系不超过上限。 */
export function cleanAcademyCredits(raw: unknown): Record<AcademyDepartmentId, number> {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    gathering: academyCleanCount(src.gathering, ACADEMY_CREDIT_CAP),
    crafting: academyCleanCount(src.crafting, ACADEMY_CREDIT_CAP),
    tactics: academyCleanCount(src.tactics, ACADEMY_CREDIT_CAP),
    commerce: academyCleanCount(src.commerce, ACADEMY_CREDIT_CAP),
  };
}

export function sumAcademyCredits(credits: Partial<Record<string, number>> | null | undefined): number {
  if (!credits || typeof credits !== "object") return 0;
  let total = 0;
  for (const id of ACADEMY_DEPARTMENT_IDS) {
    const n = Number(credits[id]);
    if (Number.isFinite(n) && n > 0) total += Math.floor(n);
  }
  return total;
}

/** 某系学分对应的被动阶位与下一阶进度。 */
export function getAcademyDepartmentTier(departmentId: AcademyDepartmentId, credits: number) {
  const dept = ACADEMY_DEPARTMENTS.find((d) => d.id === departmentId) || ACADEMY_DEPARTMENTS[0];
  const c = Number.isFinite(credits) && credits > 0 ? Math.floor(credits) : 0;
  let current = dept.tiers[0];
  let next: AcademyDepartmentTierDef | null = null;
  for (let i = 0; i < dept.tiers.length; i++) {
    if (c >= dept.tiers[i].minCredits) {
      current = dept.tiers[i];
      next = dept.tiers[i + 1] ?? null;
    }
  }
  const progressPct = next
    ? Math.min(100, Math.max(0, Math.round(((c - current.minCredits) / Math.max(1, next.minCredits - current.minCredits)) * 100)))
    : 100;
  return { current, next, progressPct, credits: c };
}

/** 四系学分总和对应的学院徽章。 */
export function getAcademyBadgeTier(totalCredits: number) {
  const c = Number.isFinite(totalCredits) && totalCredits > 0 ? Math.floor(totalCredits) : 0;
  let current = ACADEMY_BADGES[0];
  let next: AcademyBadgeDef | null = null;
  for (let i = 0; i < ACADEMY_BADGES.length; i++) {
    if (c >= ACADEMY_BADGES[i].minCredits) {
      current = ACADEMY_BADGES[i];
      next = ACADEMY_BADGES[i + 1] ?? null;
    }
  }
  const progressPct = next
    ? Math.min(100, Math.max(0, Math.round(((c - current.minCredits) / Math.max(1, next.minCredits - current.minCredits)) * 100)))
    : 100;
  return { current, next, progressPct, totalCredits: c };
}

export function academyCourseDurationMs(courseId: AcademyCourseId): number {
  const course = ACADEMY_COURSES.find((c) => c.id === courseId);
  return course ? course.durationMinutes * 60_000 : 0;
}

/** 进修进度：剩余毫秒、百分比与是否已到结业时间（只读，不结算）。 */
export function getAcademyCourseProgress(
  active: { courseId?: unknown; startedAt?: unknown; endsAt?: unknown } | null | undefined,
  nowMs: number
): { remainingMs: number; progressPct: number; finished: boolean } {
  if (!active || typeof active !== "object") return { remainingMs: 0, progressPct: 0, finished: false };
  const start = typeof active.startedAt === "string" ? Date.parse(active.startedAt) : Number.NaN;
  const end = typeof active.endsAt === "string" ? Date.parse(active.endsAt) : Number.NaN;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || !Number.isFinite(nowMs)) {
    return { remainingMs: 0, progressPct: 0, finished: false };
  }
  const remainingMs = Math.max(0, end - nowMs);
  const progressPct = Math.min(100, Math.max(0, Math.floor(((nowMs - start) / (end - start)) * 100)));
  return { remainingMs, progressPct, finished: nowMs >= end };
}

/** 结业预览：某门课结业后该系阶位与学院徽章的变化。 */
export function previewAcademyGraduation(credits: Partial<Record<string, number>> | null | undefined, courseId: AcademyCourseId) {
  const course = ACADEMY_COURSES.find((c) => c.id === courseId) || ACADEMY_COURSES[0];
  const clean = cleanAcademyCredits(credits);
  const total = sumAcademyCredits(clean);
  const before = getAcademyDepartmentTier(course.department, clean[course.department]).current;
  const after = getAcademyDepartmentTier(course.department, Math.min(ACADEMY_CREDIT_CAP, clean[course.department] + course.credits)).current;
  const badgeBefore = getAcademyBadgeTier(total).current;
  const badgeAfter = getAcademyBadgeTier(total - clean[course.department] + Math.min(ACADEMY_CREDIT_CAP, clean[course.department] + course.credits)).current;
  return {
    department: course.department,
    credits: course.credits,
    departmentTierBefore: before.tier,
    departmentTierAfter: after.tier,
    badgeTierBefore: badgeBefore.tier,
    badgeTierAfter: badgeAfter.tier,
  };
}

/** 纪念章净化：只保留合法季节、去重并按四季顺序排列。 */
export function cleanFestivalKeepsakes(raw: unknown): FestivalSeasonId[] {
  const src = Array.isArray(raw) ? (raw as unknown[]) : [];
  return FESTIVAL_SEASON_IDS.filter((id) => src.includes(id));
}

/** 东八区季节序号：年 × 4 + (0 春 / 1 夏 / 2 秋 / 3 冬)；1~2 月归属上一年的冬季。 */
export function getFestivalSeasonIndex(now: Date | number): number {
  const ms = typeof now === "number" ? now : now.getTime();
  const d = new Date(ms + FESTIVAL_TZ_OFFSET_MINUTES * 60_000);
  return Math.floor((d.getUTCFullYear() * 12 + d.getUTCMonth() - 2) / 3);
}

export function festivalSeasonIdFromIndex(index: number): FestivalSeasonId {
  const i = Math.floor(index);
  return FESTIVAL_SEASON_IDS[((i % 4) + 4) % 4];
}

/** 季节序号 → 季节键 YYYY-season（冬季以 12 月所在年份记）。 */
export function festivalSeasonKeyFromIndex(index: number): string {
  const i = Math.floor(index);
  return `${Math.floor(i / 4)}-${festivalSeasonIdFromIndex(i)}`;
}

export function festivalSeasonKey(now: Date | number): string {
  return festivalSeasonKeyFromIndex(getFestivalSeasonIndex(now));
}

/** 季节键 → 季节序号；非法键返回 null。 */
export function festivalSeasonIndexFromKey(key: unknown): number | null {
  if (typeof key !== "string") return null;
  const m = /^(\d{4})-(spring|summer|autumn|winter)$/.exec(key);
  if (!m) return null;
  return Number(m[1]) * 4 + FESTIVAL_SEASON_IDS.indexOf(m[2] as FestivalSeasonId);
}

/** 该季节开幕（首月 1 日东八区 0 点）的 UTC 毫秒时间戳。 */
export function festivalSeasonStartMs(index: number): number {
  const i = Math.floor(index);
  const year = Math.floor(i / 4);
  const q = ((i % 4) + 4) % 4;
  return Date.UTC(year, 2 + q * 3, 1) - FESTIVAL_TZ_OFFSET_MINUTES * 60_000;
}

/** 该季节结束（下一季开幕）的 UTC 毫秒时间戳。 */
export function festivalSeasonEndsAtMs(index: number): number {
  return festivalSeasonStartMs(Math.floor(index) + 1);
}

export function getFestivalSeasonDef(seasonId: FestivalSeasonId): FestivalSeasonDef {
  return FESTIVAL_SEASONS.find((s) => s.id === seasonId) || FESTIVAL_SEASONS[0];
}

export function getFestivalCommissionsForSeason(seasonId: FestivalSeasonId): FestivalCommissionDef[] {
  return FESTIVAL_COMMISSIONS.filter((c) => c.season === seasonId);
}

export function getFestivalShopForSeason(seasonId: FestivalSeasonId): FestivalShopItemDef[] {
  return FESTIVAL_SHOP_ITEMS.filter((s) => s.season === null || s.season === seasonId);
}

/** 委托计数器：actions = stats.actionsById 中指定前缀行动完成次数之和；kills = stats.totalKills；deliver 恒为 0。 */
export function countFestivalCommissionCounter(
  def: FestivalCommissionDef,
  stats: { actionsById?: unknown; totalKills?: unknown } | null | undefined
): number {
  if (!stats || typeof stats !== "object") return 0;
  if (def.kind === "kills") {
    const n = Number(stats.totalKills);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }
  if (def.kind !== "actions" || !def.actionPrefix) return 0;
  const byId = stats.actionsById;
  if (!byId || typeof byId !== "object") return 0;
  let total = 0;
  for (const [k, v] of Object.entries(byId as Record<string, unknown>)) {
    if (!k.startsWith(def.actionPrefix)) continue;
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) total += Math.floor(n);
  }
  return total;
}

/** 计数类委托进度：本季计数（计数器 - 季初基线）对第 claims + 1 次领取所需的 (claims + 1) × target。 */
export function getFestivalCommissionProgress(def: FestivalCommissionDef, seasonCount: number, claims: number) {
  const done = Number.isFinite(claims) && claims > 0 ? Math.min(def.maxClaims, Math.floor(claims)) : 0;
  const count = Number.isFinite(seasonCount) && seasonCount > 0 ? Math.floor(seasonCount) : 0;
  if (def.kind === "deliver") {
    return { seasonCount: 0, progress: 0, required: 0, ready: done < def.maxClaims, completed: done >= def.maxClaims };
  }
  const required = def.target * Math.min(def.maxClaims, done + 1);
  const progress = Math.max(0, Math.min(def.target, count - def.target * done));
  return {
    seasonCount: count,
    progress,
    required,
    ready: done < def.maxClaims && count >= required,
    completed: done >= def.maxClaims,
  };
}

export interface AcademyFestivalBonuses {
  totalCredits: number;
  departmentCredits: Record<AcademyDepartmentId, number>;
  departmentTiers: Record<AcademyDepartmentId, number>;
  badgeTier: number;
  badgeName: string;
  keepsakes: FestivalSeasonId[];
  fullCycle: boolean;
  gatherSpeedPct: number;
  craftSpeedPct: number;
  xpGainPct: number;
  goldGainPct: number;
  bonusAtk: number;
  bonusDef: number;
  bonusHp: number;
}

export type MinimalAcademyFestivalHolder = {
  adventurerAcademy?: {
    credits?: unknown;
  } | null;
  festivalCalendar?: {
    keepsakes?: unknown;
  } | null;
} | null;

/** 学院 + 节庆永久加成 = 四系被动阶位 + 学院徽章 + 四季纪念章（收齐四季再叠加四季圆满）。 */
export function getAcademyFestivalBonuses(holder?: MinimalAcademyFestivalHolder): AcademyFestivalBonuses {
  const ac = holder?.adventurerAcademy;
  const fc = holder?.festivalCalendar;
  const credits = cleanAcademyCredits(ac && typeof ac === "object" ? ac.credits : null);
  const keepsakes = cleanFestivalKeepsakes(fc && typeof fc === "object" ? fc.keepsakes : null);
  const totalCredits = sumAcademyCredits(credits);
  const badge = getAcademyBadgeTier(totalCredits).current;
  const fullCycle = keepsakes.length === FESTIVAL_SEASON_IDS.length;
  const sum: Required<AcademyStats> = {
    gatherSpeedPct: 0,
    craftSpeedPct: 0,
    xpGainPct: 0,
    goldGainPct: 0,
    bonusAtk: 0,
    bonusDef: 0,
    bonusHp: 0,
  };
  const add = (s: AcademyStats) => {
    for (const k of ACADEMY_STAT_KEYS) sum[k] += s[k] || 0;
  };
  const departmentTiers: Record<AcademyDepartmentId, number> = { gathering: 0, crafting: 0, tactics: 0, commerce: 0 };
  for (const dept of ACADEMY_DEPARTMENTS) {
    const tier = getAcademyDepartmentTier(dept.id, credits[dept.id]).current;
    departmentTiers[dept.id] = tier.tier;
    add(tier.stats);
  }
  add(badge.stats);
  for (const id of keepsakes) add(getFestivalSeasonDef(id).keepsakeStats);
  if (fullCycle) add(FESTIVAL_FULL_CYCLE_STATS);
  return {
    totalCredits,
    departmentCredits: credits,
    departmentTiers,
    badgeTier: badge.tier,
    badgeName: badge.name,
    keepsakes,
    fullCycle,
    ...sum,
  };
}

/* ---- 以上为 WL-12 core ---- */

function academyCleanInt(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallback;
}

function fmtAcademyRemaining(ms: number): string {
  const totalMin = Math.max(1, Math.ceil(ms / 60_000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return m > 0 ? `${h} 小时 ${m} 分` : `${h} 小时`;
  return `${m} 分钟`;
}

function academyItemName(contentPack: EnhancedContentPack | undefined, itemId: string): string {
  return ((contentPack?.items as Array<{ id: string; name?: string }> | undefined) || []).find((i) => i.id === itemId)?.name || itemId;
}

/** 进行中的课程净化：课程必须合法、开课时间可解析；结业时间一律按开课时间 + 课程时长重算（防脏档拉长 / 缩短）。 */
function sanitizeAcademyActiveCourse(raw: unknown): AcademyActiveCourse | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!isValidAcademyCourseId(r.courseId) || typeof r.startedAt !== "string") return null;
  const start = Date.parse(r.startedAt);
  if (!Number.isFinite(start)) return null;
  return {
    courseId: r.courseId,
    startedAt: new Date(start).toISOString(),
    endsAt: new Date(start + academyCourseDurationMs(r.courseId)).toISOString(),
  };
}

function sanitizeAcademyGraduation(raw: unknown): AcademyGraduationRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!isValidAcademyCourseId(r.courseId)) return null;
  const course = ACADEMY_COURSES.find((c) => c.id === r.courseId)!;
  const at = typeof r.at === "string" && Number.isFinite(Date.parse(r.at)) ? r.at : new Date(0).toISOString();
  return {
    courseId: course.id,
    department: course.department,
    credits: course.credits,
    at,
    departmentTier: Math.min(4, academyCleanInt(r.departmentTier, 0)),
    badgeTier: Math.min(4, academyCleanInt(r.badgeTier, 0)),
  };
}

/** 结业（内部）：发放该系学分、累计结业次数、记录结业单并在晋阶时写日志。结业时刻取课程 endsAt。 */
function graduateAcademyCourse(player: EnhancedPlayerState, ac: AdventurerAcademyState): void {
  const active = ac.activeCourse!;
  const course = ACADEMY_COURSES.find((c) => c.id === active.courseId)!;
  const dept = ACADEMY_DEPARTMENTS.find((d) => d.id === course.department)!;
  const prevBadge = getAcademyBadgeTier(sumAcademyCredits(ac.credits)).current;
  const prevTier = getAcademyDepartmentTier(course.department, ac.credits[course.department]).current;
  ac.credits[course.department] = Math.min(ACADEMY_CREDIT_CAP, ac.credits[course.department] + course.credits);
  ac.completedCourses[course.id] = (ac.completedCourses[course.id] || 0) + 1;
  ac.totalGraduations += 1;
  const badge = getAcademyBadgeTier(sumAcademyCredits(ac.credits)).current;
  const tier = getAcademyDepartmentTier(course.department, ac.credits[course.department]).current;
  ac.lastGraduation = {
    courseId: course.id,
    department: course.department,
    credits: course.credits,
    at: active.endsAt,
    departmentTier: tier.tier,
    badgeTier: badge.tier,
  };
  ac.activeCourse = null;
  appendLog(
    player,
    `冒险者学院「${course.name}」结业：${dept.name} +${course.credits} 学分（本系累计 ${ac.credits[course.department]}）。`
  );
  if (tier.tier > prevTier.tier) {
    appendLog(player, `${dept.name}「${dept.passiveName}」晋升「${tier.title}」，跨职业永久被动提升（转生保留）！`);
  }
  if (badge.tier > prevBadge.tier) {
    appendLog(player, `冒险者学院授予「${badge.name}」！`);
  }
}

/**
 * 确保 adventurerAcademy 存在并净化脏档（旧存档首次打开面板时补齐空学院；转生永久保留）。
 * 仅显式传入 now（指令 / 视图时钟）且到点时才结业发放学分；无参调用（ensurePlayerExtensions / 转生净化）
 * 只做净化，绝不按墙钟结业（沿用 WL-10 / WL-11 的显式时钟约定）。
 */
export function ensureAdventurerAcademy(player: EnhancedPlayerState, now?: Date): AdventurerAcademyState {
  if (!Array.isArray((player as any).logs)) {
    (player as any).logs = [];
  }
  if (!player.adventurerAcademy || typeof player.adventurerAcademy !== "object") {
    player.adventurerAcademy = {
      credits: { gathering: 0, crafting: 0, tactics: 0, commerce: 0 },
      completedCourses: {},
      activeCourse: null,
      totalEnrollments: 0,
      totalGraduations: 0,
      lastGraduation: null,
    };
  }
  const ac = player.adventurerAcademy;
  ac.credits = cleanAcademyCredits(ac.credits);
  const rawDone = ac.completedCourses && typeof ac.completedCourses === "object" ? (ac.completedCourses as Record<string, unknown>) : {};
  const done: Partial<Record<AcademyCourseId, number>> = {};
  let graduations = 0;
  for (const id of ACADEMY_COURSE_IDS) {
    const n = academyCleanInt(rawDone[id], 0);
    if (n > 0) {
      done[id] = n;
      graduations += n;
    }
  }
  ac.completedCourses = done;
  ac.activeCourse = sanitizeAcademyActiveCourse(ac.activeCourse);
  ac.totalGraduations = Math.max(academyCleanInt(ac.totalGraduations, 0), graduations);
  ac.totalEnrollments = Math.max(academyCleanInt(ac.totalEnrollments, 0), ac.totalGraduations + (ac.activeCourse ? 1 : 0));
  ac.lastGraduation = sanitizeAcademyGraduation(ac.lastGraduation);

  if (now !== undefined && ac.activeCourse && now.getTime() >= Date.parse(ac.activeCourse.endsAt)) {
    graduateAcademyCourse(player, ac);
  }
  return ac;
}

/** 本季计数类委托的季初基线：当前计数器值（季初之前的行动 / 击杀不计入本季）。 */
function festivalBaselinesFor(player: EnhancedPlayerState, seasonId: FestivalSeasonId): Partial<Record<FestivalCommissionId, number>> {
  const out: Partial<Record<FestivalCommissionId, number>> = {};
  for (const def of getFestivalCommissionsForSeason(seasonId)) {
    if (def.kind === "deliver") continue;
    out[def.id] = countFestivalCommissionCounter(def, player.stats);
  }
  return out;
}

function sanitizeFestivalRollover(raw: unknown): FestivalRolloverRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (festivalSeasonIndexFromKey(r.seasonKey) === null) return null;
  return {
    seasonKey: r.seasonKey as string,
    claims: academyCleanInt(r.claims, 0),
    tokensConverted: Math.min(FESTIVAL_TOKEN_CAP, academyCleanInt(r.tokensConverted, 0)),
    goldConverted: academyCleanInt(r.goldConverted, 0),
  };
}

/**
 * 确保 festivalCalendar 存在并净化脏档。
 * 仅显式传入 now 且东八区季节前进时才翻季：未花完的节庆代币按比率折算金币，委托 / 商店限购清零，
 * 并以当前计数器重设新季基线；无参调用只做净化，绝不按墙钟翻季。
 */
export function ensureFestivalCalendar(player: EnhancedPlayerState, now?: Date): FestivalCalendarState {
  const clock = now ?? new Date();
  if (!Array.isArray((player as any).logs)) {
    (player as any).logs = [];
  }
  if (!player.inventory || typeof player.inventory !== "object") {
    player.inventory = { gold: 0 };
  }
  if (!player.festivalCalendar || typeof player.festivalCalendar !== "object") {
    const idx = getFestivalSeasonIndex(clock);
    player.festivalCalendar = {
      seasonKey: festivalSeasonKeyFromIndex(idx),
      tokens: 0,
      claims: {},
      // 首次打开日历：季初基线 = 当前计数器（之前的行动 / 击杀不追溯计入，也不赠送任何代币）
      baselines: festivalBaselinesFor(player, festivalSeasonIdFromIndex(idx)),
      purchases: {},
      keepsakes: [],
      totalTokensEarned: 0,
      totalClaims: 0,
      lastRollover: null,
    };
  }
  const fc = player.festivalCalendar;
  if (festivalSeasonIndexFromKey(fc.seasonKey) === null) {
    fc.seasonKey = festivalSeasonKey(clock);
  }
  const seasonId = festivalSeasonIdFromIndex(festivalSeasonIndexFromKey(fc.seasonKey)!);
  fc.tokens = Math.min(FESTIVAL_TOKEN_CAP, academyCleanInt(fc.tokens, 0));
  const rawClaims = fc.claims && typeof fc.claims === "object" ? (fc.claims as Record<string, unknown>) : {};
  const rawBase = fc.baselines && typeof fc.baselines === "object" ? (fc.baselines as Record<string, unknown>) : {};
  const claims: Partial<Record<FestivalCommissionId, number>> = {};
  const baselines: Partial<Record<FestivalCommissionId, number>> = {};
  let claimSum = 0;
  for (const def of getFestivalCommissionsForSeason(seasonId)) {
    const n = Math.min(def.maxClaims, academyCleanInt(rawClaims[def.id], 0));
    if (n > 0) {
      claims[def.id] = n;
      claimSum += n;
    }
    if (def.kind !== "deliver") {
      const counter = countFestivalCommissionCounter(def, player.stats);
      baselines[def.id] = Math.min(counter, academyCleanInt(rawBase[def.id], counter));
    }
  }
  fc.claims = claims;
  fc.baselines = baselines;
  const rawPurchases = fc.purchases && typeof fc.purchases === "object" ? (fc.purchases as Record<string, unknown>) : {};
  const purchases: Partial<Record<FestivalShopItemId, number>> = {};
  for (const item of getFestivalShopForSeason(seasonId)) {
    const n = Math.min(item.limit, academyCleanInt(rawPurchases[item.id], 0));
    if (n > 0) purchases[item.id] = n;
  }
  fc.purchases = purchases;
  fc.keepsakes = cleanFestivalKeepsakes(fc.keepsakes);
  fc.totalTokensEarned = academyCleanInt(fc.totalTokensEarned, 0);
  fc.totalClaims = Math.max(academyCleanInt(fc.totalClaims, 0), claimSum);
  fc.lastRollover = sanitizeFestivalRollover(fc.lastRollover);

  if (now !== undefined) {
    const curIdx = getFestivalSeasonIndex(clock);
    const storedIdx = festivalSeasonIndexFromKey(fc.seasonKey)!;
    // 只向前翻季（时钟回拨不回滚）；跨多季只折算一次剩余代币
    if (curIdx > storedIdx) {
      const leftover = fc.tokens;
      const goldConverted = leftover * FESTIVAL_TOKEN_GOLD_RATE;
      if (goldConverted > 0) {
        player.inventory.gold = (player.inventory.gold || 0) + goldConverted;
        if (player.stats) player.stats.totalGoldEarned = (player.stats.totalGoldEarned || 0) + goldConverted;
      }
      const purchaseSum = Object.values(fc.purchases).reduce<number>((s, n) => s + (n || 0), 0);
      if (leftover > 0 || claimSum > 0 || purchaseSum > 0) {
        fc.lastRollover = { seasonKey: fc.seasonKey, claims: claimSum, tokensConverted: leftover, goldConverted };
      }
      const prevSeason = getFestivalSeasonDef(seasonId);
      const nextId = festivalSeasonIdFromIndex(curIdx);
      const nextSeason = getFestivalSeasonDef(nextId);
      fc.seasonKey = festivalSeasonKeyFromIndex(curIdx);
      fc.tokens = 0;
      fc.claims = {};
      fc.purchases = {};
      fc.baselines = festivalBaselinesFor(player, nextId);
      if (goldConverted > 0) {
        appendLog(player, `${prevSeason.name}落幕：剩余 ${leftover} 枚「${prevSeason.tokenName}」折算为 ${goldConverted} 金币。`);
      }
      appendLog(player, `四季节庆日历翻季：${nextSeason.name}（${nextSeason.months}）开幕，限定委托与节庆商店已更新！`);
    }
  }
  return fc;
}

/** 指令内统一推进两份时钟（结业 + 翻季），保证落库状态与响应视图一致。 */
function ensureAcademyFestivalClocks(player: EnhancedPlayerState, now: Date) {
  return { ac: ensureAdventurerAcademy(player, now), fc: ensureFestivalCalendar(player, now) };
}

/** 冒险者学院报名：消耗金币 + 真实生活职业成品，开课后经过课程时长（按显式 now 结算）结业发放学分。 */
export function enrollAcademyCourse(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack | undefined,
  courseId: AcademyCourseId,
  now: Date = new Date()
): {
  ok: boolean;
  reason?: string;
  courseId?: AcademyCourseId;
  department?: AcademyDepartmentId;
  credits?: number;
  durationMinutes?: number;
  startedAt?: string;
  endsAt?: string;
  spentGold?: number;
  spentItems?: Record<string, number>;
} {
  ensurePlayerExtensions(player);
  if (!isValidAcademyCourseId(courseId)) {
    return { ok: false, reason: "未知的学院课程" };
  }
  const { ac } = ensureAcademyFestivalClocks(player, now);
  const course = ACADEMY_COURSES.find((c) => c.id === courseId)!;
  if (ac.activeCourse) {
    const cur = ACADEMY_COURSES.find((c) => c.id === ac.activeCourse!.courseId)!;
    const prog = getAcademyCourseProgress(ac.activeCourse, now.getTime());
    return {
      ok: false,
      reason: `正在进修「${cur.name}」（还剩 ${fmtAcademyRemaining(prog.remainingMs)}），结业后才能报名下一门（进修席位 ${ACADEMY_COURSE_SLOTS}）`,
    };
  }
  const badge = getAcademyBadgeTier(sumAcademyCredits(ac.credits)).current;
  if (badge.tier < course.minBadgeTier) {
    const need = ACADEMY_BADGES.find((b) => b.tier === course.minBadgeTier)!;
    return { ok: false, reason: `「${course.name}」需持有「${need.name}」（四系学分合计 ${need.minCredits}）` };
  }
  const spentItems: Record<string, number> = {};
  for (const [itemId, qty] of Object.entries(course.itemCost)) {
    const have = Math.floor(Number(player.inventory[itemId] || 0));
    if (have < qty) {
      return {
        ok: false,
        reason: `报名「${course.name}」需「${academyItemName(contentPack, itemId)}」×${qty}（当前 ${have}）`,
      };
    }
    spentItems[itemId] = qty;
  }
  if ((player.inventory.gold || 0) < course.goldCost) {
    return { ok: false, reason: `金币不足：报名「${course.name}」需 ${course.goldCost} 金币` };
  }
  for (const [itemId, qty] of Object.entries(spentItems)) {
    player.inventory[itemId] = Math.floor(Number(player.inventory[itemId] || 0)) - qty;
    if (player.inventory[itemId] <= 0) delete player.inventory[itemId];
  }
  player.inventory.gold = (player.inventory.gold || 0) - course.goldCost;
  if (player.stats) player.stats.totalGoldSpent = (player.stats.totalGoldSpent || 0) + course.goldCost;
  const startedAt = now.toISOString();
  const endsAt = new Date(now.getTime() + academyCourseDurationMs(course.id)).toISOString();
  ac.activeCourse = { courseId: course.id, startedAt, endsAt };
  ac.totalEnrollments += 1;
  addReputation(player, 3);
  syncAchievements(player);
  const dept = ACADEMY_DEPARTMENTS.find((d) => d.id === course.department)!;
  appendLog(
    player,
    `报名冒险者学院「${course.name}」（${dept.name}），进修 ${course.durationMinutes} 分钟后结业可得 ${course.credits} 学分。`
  );
  return {
    ok: true,
    courseId: course.id,
    department: course.department,
    credits: course.credits,
    durationMinutes: course.durationMinutes,
    startedAt,
    endsAt,
    spentGold: course.goldCost,
    spentItems,
  };
}

/** 四季节庆限定委托：交付真实成品，或本季完成指定行动 / 击杀后领取节庆代币与金币（每季限领 maxClaims 次）。 */
export function claimFestivalCommission(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack | undefined,
  commissionId: FestivalCommissionId,
  now: Date = new Date()
): {
  ok: boolean;
  reason?: string;
  commissionId?: FestivalCommissionId;
  tokens?: number;
  gold?: number;
  claims?: number;
  tokenBalance?: number;
  spentItems?: Record<string, number>;
} {
  ensurePlayerExtensions(player);
  if (!isValidFestivalCommissionId(commissionId)) {
    return { ok: false, reason: "未知的节庆委托" };
  }
  const { fc } = ensureAcademyFestivalClocks(player, now);
  const seasonId = festivalSeasonIdFromIndex(festivalSeasonIndexFromKey(fc.seasonKey)!);
  const season = getFestivalSeasonDef(seasonId);
  const def = FESTIVAL_COMMISSIONS.find((c) => c.id === commissionId)!;
  if (def.season !== seasonId) {
    return {
      ok: false,
      reason: `「${def.name}」是${getFestivalSeasonDef(def.season).name}限定委托，当前是${season.name}`,
    };
  }
  const claims = fc.claims[def.id] || 0;
  if (claims >= def.maxClaims) {
    return { ok: false, reason: `「${def.name}」本季已完成 ${def.maxClaims} 次` };
  }
  const spentItems: Record<string, number> = {};
  if (def.kind === "deliver") {
    for (const [itemId, qty] of Object.entries(def.items)) {
      const have = Math.floor(Number(player.inventory[itemId] || 0));
      if (have < qty) {
        return {
          ok: false,
          reason: `交付「${def.name}」需「${academyItemName(contentPack, itemId)}」×${qty}（当前 ${have}）`,
        };
      }
      spentItems[itemId] = qty;
    }
  } else {
    const seasonCount = countFestivalCommissionCounter(def, player.stats) - (fc.baselines[def.id] || 0);
    const prog = getFestivalCommissionProgress(def, seasonCount, claims);
    if (!prog.ready) {
      const unit = def.kind === "kills" ? "次击杀" : "次行动";
      return {
        ok: false,
        reason: `「${def.name}」进度不足：本季已完成 ${prog.seasonCount} ${unit}，第 ${claims + 1} 次领取需累计 ${prog.required} ${unit}`,
      };
    }
  }
  for (const [itemId, qty] of Object.entries(spentItems)) {
    player.inventory[itemId] = Math.floor(Number(player.inventory[itemId] || 0)) - qty;
    if (player.inventory[itemId] <= 0) delete player.inventory[itemId];
  }
  fc.claims[def.id] = claims + 1;
  fc.tokens = Math.min(FESTIVAL_TOKEN_CAP, fc.tokens + def.tokens);
  fc.totalTokensEarned += def.tokens;
  fc.totalClaims += 1;
  if (def.gold > 0) {
    player.inventory.gold = (player.inventory.gold || 0) + def.gold;
    if (player.stats) player.stats.totalGoldEarned = (player.stats.totalGoldEarned || 0) + def.gold;
  }
  addReputation(player, 2);
  syncAchievements(player);
  appendLog(
    player,
    `${season.name}委托「${def.name}」完成（${claims + 1}/${def.maxClaims}）：获得 ${def.tokens} 枚「${season.tokenName}」与 ${def.gold} 金币。`
  );
  return {
    ok: true,
    commissionId: def.id,
    tokens: def.tokens,
    gold: def.gold,
    claims: claims + 1,
    tokenBalance: fc.tokens,
    spentItems,
  };
}

/** 节庆商店：以本季节庆代币兑换金币袋、季节礼包、学院进修推荐信（学分）或四季纪念章（永久）。 */
export function buyFestivalShopItem(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack | undefined,
  itemId: FestivalShopItemId,
  now: Date = new Date()
): {
  ok: boolean;
  reason?: string;
  itemId?: FestivalShopItemId;
  kind?: FestivalShopItemKind;
  cost?: number;
  purchased?: number;
  tokenBalance?: number;
  gold?: number;
  items?: Record<string, number>;
  credits?: number;
  department?: AcademyDepartmentId | null;
  keepsake?: FestivalSeasonId | null;
} {
  ensurePlayerExtensions(player);
  if (!isValidFestivalShopItemId(itemId)) {
    return { ok: false, reason: "未知的节庆商品" };
  }
  const { ac, fc } = ensureAcademyFestivalClocks(player, now);
  const seasonId = festivalSeasonIdFromIndex(festivalSeasonIndexFromKey(fc.seasonKey)!);
  const season = getFestivalSeasonDef(seasonId);
  const def = FESTIVAL_SHOP_ITEMS.find((s) => s.id === itemId)!;
  if (def.season !== null && def.season !== seasonId) {
    return { ok: false, reason: `「${def.name}」只在${getFestivalSeasonDef(def.season).name}上架，当前是${season.name}` };
  }
  const bought = fc.purchases[def.id] || 0;
  if (bought >= def.limit) {
    return { ok: false, reason: `「${def.name}」本季限购 ${def.limit} 次，已售罄` };
  }
  if (def.kind === "keepsake" && fc.keepsakes.includes(seasonId)) {
    return { ok: false, reason: `已拥有「${season.keepsakeName}」` };
  }
  if (fc.tokens < def.cost) {
    return { ok: false, reason: `「${season.tokenName}」不足：需 ${def.cost} 枚（当前 ${fc.tokens}）` };
  }
  fc.tokens -= def.cost;
  fc.purchases[def.id] = bought + 1;
  const granted: Record<string, number> = {};
  if (def.kind === "gold" && def.gold > 0) {
    player.inventory.gold = (player.inventory.gold || 0) + def.gold;
    if (player.stats) player.stats.totalGoldEarned = (player.stats.totalGoldEarned || 0) + def.gold;
  }
  if (def.kind === "items") {
    for (const [id, qty] of Object.entries(def.items)) {
      player.inventory[id] = Math.floor(Number(player.inventory[id] || 0)) + qty;
      granted[id] = qty;
    }
  }
  if (def.kind === "credits" && def.department) {
    const prevTier = getAcademyDepartmentTier(def.department, ac.credits[def.department]).current;
    const prevBadge = getAcademyBadgeTier(sumAcademyCredits(ac.credits)).current;
    ac.credits[def.department] = Math.min(ACADEMY_CREDIT_CAP, ac.credits[def.department] + def.credits);
    const tier = getAcademyDepartmentTier(def.department, ac.credits[def.department]).current;
    const badge = getAcademyBadgeTier(sumAcademyCredits(ac.credits)).current;
    const dept = ACADEMY_DEPARTMENTS.find((d) => d.id === def.department)!;
    if (tier.tier > prevTier.tier) {
      appendLog(player, `${dept.name}「${dept.passiveName}」晋升「${tier.title}」，跨职业永久被动提升（转生保留）！`);
    }
    if (badge.tier > prevBadge.tier) {
      appendLog(player, `冒险者学院授予「${badge.name}」！`);
    }
  }
  if (def.kind === "keepsake") {
    fc.keepsakes = cleanFestivalKeepsakes([...fc.keepsakes, seasonId]);
    if (fc.keepsakes.length === FESTIVAL_SEASON_IDS.length) {
      appendLog(player, "四季纪念章全部收齐：「四季圆满」永久加成生效！");
    }
  }
  appendLog(player, `节庆商店兑换「${def.name}」，花费 ${def.cost} 枚「${season.tokenName}」。`);
  return {
    ok: true,
    itemId: def.id,
    kind: def.kind,
    cost: def.cost,
    purchased: bought + 1,
    tokenBalance: fc.tokens,
    gold: def.kind === "gold" ? def.gold : 0,
    items: granted,
    credits: def.kind === "credits" ? def.credits : 0,
    department: def.department,
    keepsake: def.kind === "keepsake" ? seasonId : null,
  };
}

/** 构造前端「冒险者学院 & 四季节庆」面板视图（会补齐两份状态并按显式 now 结业 / 翻季）。 */
export function getAcademyFestivalInfo(
  player: EnhancedPlayerState,
  contentPack?: EnhancedContentPack,
  now: Date = new Date()
) {
  ensurePlayerExtensions(player);
  const { ac, fc } = ensureAcademyFestivalClocks(player, now);
  const nowMs = now.getTime();
  const itemName = (id: string) => academyItemName(contentPack, id);
  const have = (id: string) => Math.floor(Number(player.inventory[id] || 0));
  const gold = Math.floor(Number(player.inventory.gold || 0));
  const bonuses = getAcademyFestivalBonuses(player);
  const badgeInfo = getAcademyBadgeTier(bonuses.totalCredits);
  const deptName = (id: AcademyDepartmentId) => ACADEMY_DEPARTMENTS.find((d) => d.id === id)!.name;

  const departments = ACADEMY_DEPARTMENTS.map((d) => {
    const t = getAcademyDepartmentTier(d.id, ac.credits[d.id]);
    return {
      id: d.id,
      name: d.name,
      passiveName: d.passiveName,
      subtitle: d.subtitle,
      description: d.description,
      credits: t.credits,
      tier: t.current,
      next: t.next,
      progressPct: t.progressPct,
      allTiers: d.tiers,
      festivalSeason: d.festivalSeason,
      festivalSeasonName: getFestivalSeasonDef(d.festivalSeason).name,
    };
  });

  const activeCourse = ac.activeCourse
    ? (() => {
        const c = ACADEMY_COURSES.find((x) => x.id === ac.activeCourse!.courseId)!;
        const prog = getAcademyCourseProgress(ac.activeCourse, nowMs);
        return {
          ...ac.activeCourse,
          name: c.name,
          level: c.level,
          department: c.department,
          departmentName: deptName(c.department),
          credits: c.credits,
          durationMinutes: c.durationMinutes,
          remainingMs: prog.remainingMs,
          progressPct: prog.progressPct,
          finished: prog.finished,
          preview: previewAcademyGraduation(ac.credits, c.id),
        };
      })()
    : null;

  const courses = ACADEMY_COURSES.map((c) => {
    const items = Object.entries(c.itemCost).map(([itemId, qty]) => ({ itemId, name: itemName(itemId), qty, have: have(itemId) }));
    const needBadge = ACADEMY_BADGES.find((b) => b.tier === c.minBadgeTier)!;
    let blockReason: string | null = null;
    if (ac.activeCourse) blockReason = "进修席位已占用";
    else if (badgeInfo.current.tier < c.minBadgeTier) blockReason = `需「${needBadge.name}」`;
    else if (items.some((it) => it.have < it.qty)) blockReason = "成品不足";
    else if (gold < c.goldCost) blockReason = "金币不足";
    return {
      id: c.id,
      name: c.name,
      level: c.level,
      department: c.department,
      departmentName: deptName(c.department),
      description: c.description,
      durationMinutes: c.durationMinutes,
      goldCost: c.goldCost,
      items,
      credits: c.credits,
      minBadgeTier: c.minBadgeTier,
      minBadgeName: needBadge.name,
      completedCount: ac.completedCourses[c.id] || 0,
      preview: previewAcademyGraduation(ac.credits, c.id),
      canEnroll: blockReason === null,
      blockReason,
    };
  });

  const seasonIndex = festivalSeasonIndexFromKey(fc.seasonKey)!;
  const seasonId = festivalSeasonIdFromIndex(seasonIndex);
  const season = getFestivalSeasonDef(seasonId);
  const nextSeason = getFestivalSeasonDef(festivalSeasonIdFromIndex(seasonIndex + 1));

  const commissions = getFestivalCommissionsForSeason(seasonId).map((def) => {
    const claims = fc.claims[def.id] || 0;
    const seasonCount = def.kind === "deliver" ? 0 : countFestivalCommissionCounter(def, player.stats) - (fc.baselines[def.id] || 0);
    const prog = getFestivalCommissionProgress(def, seasonCount, claims);
    const items = Object.entries(def.items).map(([itemId, qty]) => ({ itemId, name: itemName(itemId), qty, have: have(itemId) }));
    let blockReason: string | null = null;
    if (prog.completed) blockReason = "本季已完成";
    else if (def.kind === "deliver" && items.some((it) => it.have < it.qty)) blockReason = "成品不足";
    else if (def.kind !== "deliver" && !prog.ready) blockReason = def.kind === "kills" ? "击杀不足" : "行动不足";
    return {
      id: def.id,
      name: def.name,
      description: def.description,
      kind: def.kind,
      items,
      actionPrefix: def.actionPrefix,
      target: def.target,
      maxClaims: def.maxClaims,
      claims,
      tokens: def.tokens,
      gold: def.gold,
      seasonCount: prog.seasonCount,
      progress: prog.progress,
      required: prog.required,
      canClaim: blockReason === null,
      blockReason,
    };
  });

  const shop = getFestivalShopForSeason(seasonId).map((def) => {
    const purchased = fc.purchases[def.id] || 0;
    const owned = def.kind === "keepsake" && fc.keepsakes.includes(seasonId);
    let blockReason: string | null = null;
    if (owned) blockReason = "已拥有";
    else if (purchased >= def.limit) blockReason = "本季已售罄";
    else if (fc.tokens < def.cost) blockReason = "代币不足";
    return {
      id: def.id,
      name: def.name,
      description: def.description,
      kind: def.kind,
      iconKind: def.iconKind,
      iconId: def.iconId,
      cost: def.cost,
      limit: def.limit,
      purchased,
      gold: def.gold,
      items: Object.entries(def.items).map(([itemId, qty]) => ({ itemId, name: itemName(itemId), qty })),
      credits: def.credits,
      department: def.department,
      departmentName: def.department ? deptName(def.department) : null,
      owned,
      canBuy: blockReason === null,
      blockReason,
    };
  });

  return {
    nowMs,
    bonuses,
    academy: {
      slots: ACADEMY_COURSE_SLOTS,
      totalCredits: bonuses.totalCredits,
      badge: {
        current: badgeInfo.current,
        next: badgeInfo.next,
        progressPct: badgeInfo.progressPct,
        allBadges: ACADEMY_BADGES,
      },
      departments,
      activeCourse,
      courses,
      totalEnrollments: ac.totalEnrollments,
      totalGraduations: ac.totalGraduations,
      lastGraduation: ac.lastGraduation
        ? {
            ...ac.lastGraduation,
            courseName: ACADEMY_COURSES.find((c) => c.id === ac.lastGraduation!.courseId)!.name,
            departmentName: deptName(ac.lastGraduation.department),
            badgeName: ACADEMY_BADGES.find((b) => b.tier === ac.lastGraduation!.badgeTier)?.name || ACADEMY_BADGES[0].name,
          }
        : null,
    },
    festival: {
      seasonKey: fc.seasonKey,
      seasonIndex,
      year: Math.floor(seasonIndex / 4),
      season,
      startsAtMs: festivalSeasonStartMs(seasonIndex),
      endsAtMs: festivalSeasonEndsAtMs(seasonIndex),
      nextSeason: { id: nextSeason.id, name: nextSeason.name, shortName: nextSeason.shortName, months: nextSeason.months },
      calendar: FESTIVAL_SEASONS.map((s) => ({
        id: s.id,
        name: s.name,
        shortName: s.shortName,
        months: s.months,
        subtitle: s.subtitle,
        current: s.id === seasonId,
        keepsakeName: s.keepsakeName,
        keepsakeStats: s.keepsakeStats,
        keepsakeOwned: fc.keepsakes.includes(s.id),
      })),
      tokens: fc.tokens,
      tokenCap: FESTIVAL_TOKEN_CAP,
      tokenGoldRate: FESTIVAL_TOKEN_GOLD_RATE,
      commissions,
      shop,
      keepsakes: [...fc.keepsakes],
      fullCycle: bonuses.fullCycle,
      fullCycleStats: FESTIVAL_FULL_CYCLE_STATS,
      totalTokensEarned: fc.totalTokensEarned,
      totalClaims: fc.totalClaims,
      lastRollover: fc.lastRollover
        ? {
            ...fc.lastRollover,
            seasonName: (() => {
              const idx = festivalSeasonIndexFromKey(fc.lastRollover!.seasonKey)!;
              return `${Math.floor(idx / 4)} ${getFestivalSeasonDef(festivalSeasonIdFromIndex(idx)).name}`;
            })(),
          }
        : null,
    },
  };
}

/* ============================ 天空竞技场赛季排位 & 公会领地城镇建设 (WL-13) ============================ */
// 前端 frontend/src/gameplay/arenaTown.ts 逐表逐式 1:1 镜像（scripts/arena-town-parity.test.ts 守护，
// 「WL-13 core」区段两端逐字一致）。
// - 天空竞技场赛季排位：赛季 = 东八区自然月（每月 1 日 0 点翻季）。30 级 PvE 擂主梯队由「赛季序号 + 梯级」确定性生成
//   （流派 / 称号 / ±6% 生命浮动，每段第 5 级为带内容包首领机制的段位守擂人）。挑战以玩家真实战斗构建直接跑
//   hp_combat 真实战斗引擎（沙盒副本：满血、禁用消耗品与临时增益、10 分钟上限），每个东八区日限 4 次。
//   翻季时按本季梯级结算段位 → 竞技场勋章 + 永久赛季称号（最高称号的攻防血 / 金币 / 经验加成接入真实公式）。
//   翻季 / 换日只在显式传入 now（指令 / 视图时钟）时发生；无参 ensure 只做净化（沿用 WL-10 ~ WL-12 约定）。
// - 公会领地城镇建设（转生永久保留）：以金币 + 真实生活职业成品建造 / 升级 6 座设施（荣耀演武场高阶另需竞技场勋章），
//   议事厅等级是其余设施的上限；设施解锁跨职业被动（采集 / 制作速度、经验、金币、攻防血），设施等级累计繁荣度，
//   繁荣等级再给全局加成并开放一次性繁荣宝箱。全部接入 getActionRates 与战斗 playerBuildExtras。

/* ---- 以下为与后端逐字对称的表与纯函数（WL-13 core） ---- */

export const ARENA_DIVISION_IDS: readonly ArenaDivisionId[] = ["bronze", "silver", "gold", "platinum", "diamond", "sky_king"];

export const ARENA_ARCHETYPE_IDS: readonly ArenaArchetypeId[] = ["iron_wall", "gale", "berserker", "arcane", "knight", "colossus"];

export const TOWN_FACILITY_IDS: readonly TownFacilityId[] = [
  "town_hall",
  "artisan_row",
  "harvest_market",
  "training_grounds",
  "guild_bank",
  "sage_library",
];

/** 赛季按东八区自然月划分（每月 1 日 0 点翻季）；每日挑战次数按东八区日期（0 点）重置。 */
export const ARENA_TZ_OFFSET_MINUTES = 480;
export const ARENA_RUNG_COUNT = 30;
export const ARENA_RUNGS_PER_DIVISION = 5;
/** 每个东八区日最多挑战 4 次（胜负都消耗次数）。 */
export const ARENA_DAILY_ATTEMPTS = 4;
/** 单场对决上限 10 分钟（与 hp_combat / fightPreview 的上限一致），超时未分胜负按落败计。 */
export const ARENA_MAX_FIGHT_MS = 600_000;
export const ARENA_MEDAL_CAP = 99999;
/** 段位守擂人（每段第 5 级）的额外生命倍率。 */
export const ARENA_GATEKEEPER_HP_MULT = 1.3;
export const TOWN_MAX_LEVEL = 5;

export interface ArenaTownStats {
  gatherSpeedPct?: number;
  craftSpeedPct?: number;
  xpGainPct?: number;
  goldGainPct?: number;
  bonusAtk?: number;
  bonusDef?: number;
  bonusHp?: number;
}

export const ARENA_TOWN_STAT_KEYS: readonly (keyof ArenaTownStats)[] = [
  "gatherSpeedPct",
  "craftSpeedPct",
  "xpGainPct",
  "goldGainPct",
  "bonusAtk",
  "bonusDef",
  "bonusHp",
];

export interface ArenaRungDef {
  rung: number;
  /** 擂主等级（只影响技能施放经验，与普通怪物同口径）。 */
  level: number;
  hp: number;
  atk: number;
  def: number;
  /** 击败该梯级擂主的金币奖励。 */
  gold: number;
}

/** 30 级擂主梯队基准属性：取同等级真实怪物的平滑曲线，生命 ×2.2、攻击 ×1.08（精英擂主口径）。 */
export const ARENA_RUNGS: readonly ArenaRungDef[] = [
  { rung: 1, level: 2, hp: 240, atk: 6, def: 5, gold: 40 },
  { rung: 2, level: 4, hp: 290, atk: 9, def: 6, gold: 55 },
  { rung: 3, level: 6, hp: 330, atk: 10, def: 8, gold: 90 },
  { rung: 4, level: 8, hp: 360, atk: 12, def: 9, gold: 140 },
  { rung: 5, level: 10, hp: 400, atk: 14, def: 10, gold: 180 },
  { rung: 6, level: 13, hp: 510, atk: 17, def: 11, gold: 210 },
  { rung: 7, level: 16, hp: 700, atk: 22, def: 12, gold: 250 },
  { rung: 8, level: 19, hp: 920, atk: 24, def: 14, gold: 300 },
  { rung: 9, level: 22, hp: 1060, atk: 26, def: 17, gold: 360 },
  { rung: 10, level: 25, hp: 1360, atk: 30, def: 21, gold: 440 },
  { rung: 11, level: 28, hp: 1670, atk: 33, def: 22, gold: 470 },
  { rung: 12, level: 32, hp: 1800, atk: 41, def: 24, gold: 520 },
  { rung: 13, level: 36, hp: 1940, atk: 54, def: 28, gold: 650 },
  { rung: 14, level: 40, hp: 2180, atk: 63, def: 38, gold: 1000 },
  { rung: 15, level: 44, hp: 2310, atk: 67, def: 45, gold: 1300 },
  { rung: 16, level: 48, hp: 2750, atk: 71, def: 47, gold: 1700 },
  { rung: 17, level: 53, hp: 3740, atk: 81, def: 50, gold: 2400 },
  { rung: 18, level: 58, hp: 4290, atk: 95, def: 58, gold: 3400 },
  { rung: 19, level: 63, hp: 4840, atk: 106, def: 62, gold: 4200 },
  { rung: 20, level: 68, hp: 5940, atk: 127, def: 68, gold: 5500 },
  { rung: 21, level: 74, hp: 6490, atk: 133, def: 80, gold: 6500 },
  { rung: 22, level: 80, hp: 7480, atk: 140, def: 88, gold: 7400 },
  { rung: 23, level: 86, hp: 9900, atk: 164, def: 105, gold: 9400 },
  { rung: 24, level: 92, hp: 11000, atk: 184, def: 112, gold: 10400 },
  { rung: 25, level: 98, hp: 12540, atk: 200, def: 130, gold: 12400 },
  { rung: 26, level: 105, hp: 14300, atk: 211, def: 135, gold: 13000 },
  { rung: 27, level: 115, hp: 16280, atk: 259, def: 165, gold: 15500 },
  { rung: 28, level: 125, hp: 18920, atk: 283, def: 175, gold: 18500 },
  { rung: 29, level: 137, hp: 23760, atk: 324, def: 205, gold: 27000 },
  { rung: 30, level: 150, hp: 33000, atk: 346, def: 250, gold: 37000 },
];

export interface ArenaArchetypeDef {
  id: ArenaArchetypeId;
  name: string;
  style: string;
  hpMult: number;
  atkMult: number;
  defMult: number;
  attackIntervalMs: number;
}

/** 擂主流派：按赛季 + 梯级哈希抽取，同一赛季同一梯级恒定，不同赛季换一批对手。 */
export const ARENA_ARCHETYPES: readonly ArenaArchetypeDef[] = [
  { id: "iron_wall", name: "铁壁守卫", style: "厚甲慢攻", hpMult: 1.2, atkMult: 0.85, defMult: 1.6, attackIntervalMs: 3200 },
  { id: "gale", name: "疾风剑客", style: "高速连斩", hpMult: 0.85, atkMult: 0.72, defMult: 0.8, attackIntervalMs: 1500 },
  { id: "berserker", name: "狂怒斗士", style: "重击破绽", hpMult: 0.95, atkMult: 1.3, defMult: 0.6, attackIntervalMs: 2600 },
  { id: "arcane", name: "秘法术士", style: "法术压制", hpMult: 0.9, atkMult: 1.15, defMult: 0.85, attackIntervalMs: 2800 },
  { id: "knight", name: "均衡骑士", style: "攻守兼备", hpMult: 1, atkMult: 1, defMult: 1, attackIntervalMs: 2400 },
  { id: "colossus", name: "巨像力士", style: "巨力血厚", hpMult: 1.45, atkMult: 1.12, defMult: 1.1, attackIntervalMs: 3600 },
];

export const ARENA_CHAMPION_EPITHETS: readonly string[] = [
  "苍穹",
  "雷鸣",
  "赤焰",
  "霜刃",
  "星陨",
  "影袭",
  "金狮",
  "银翼",
  "玄甲",
  "风暴",
  "圣辉",
  "翠影",
];

export interface ArenaDivisionDef {
  id: ArenaDivisionId;
  name: string;
  minRung: number;
  maxRung: number;
  /** 赛季结算时停留在本段位发放的竞技场勋章。 */
  medals: number;
  titleName: string;
  /** 赛季称号永久加成（转生保留；只取已解锁的最高称号）。 */
  titleStats: ArenaTownStats;
  /** 本段守擂人的首领机制候选（取自内容包 bossMechanics 表，按赛季哈希抽取一组）。 */
  gatekeeperMechanics: readonly (readonly string[])[];
}

export const ARENA_DIVISIONS: readonly ArenaDivisionDef[] = [
  {
    id: "bronze",
    name: "青铜",
    minRung: 1,
    maxRung: 5,
    medals: 3,
    titleName: "青铜斗士",
    titleStats: { bonusAtk: 3, bonusHp: 12 },
    gatekeeperMechanics: [["guard_60"], ["nature_wrath_30"]],
  },
  {
    id: "silver",
    name: "白银",
    minRung: 6,
    maxRung: 10,
    medals: 6,
    titleName: "白银剑豪",
    titleStats: { bonusAtk: 7, bonusDef: 3, bonusHp: 28 },
    gatekeeperMechanics: [["rockfall_charge"], ["mine_fury_35"]],
  },
  {
    id: "gold",
    name: "黄金",
    minRung: 11,
    maxRung: 15,
    medals: 10,
    titleName: "黄金霸者",
    titleStats: { bonusAtk: 12, bonusDef: 6, bonusHp: 50 },
    gatekeeperMechanics: [["frost_armor_15"], ["swamp_devour_charge"]],
  },
  {
    id: "platinum",
    name: "铂金",
    minRung: 16,
    maxRung: 20,
    medals: 15,
    titleName: "铂金战神",
    titleStats: { bonusAtk: 20, bonusDef: 10, bonusHp: 85, goldGainPct: 1 },
    gatekeeperMechanics: [["miasma_3s", "magma_fury_30"], ["glacier_lance_charge"]],
  },
  {
    id: "diamond",
    name: "钻石",
    minRung: 21,
    maxRung: 25,
    medals: 22,
    titleName: "钻石传奇",
    titleStats: { bonusAtk: 30, bonusDef: 15, bonusHp: 130, goldGainPct: 2 },
    gatekeeperMechanics: [["eruption_20s", "void_frenzy_35"], ["seraph_aegis_15s", "hellfire_cleave_charge"]],
  },
  {
    id: "sky_king",
    name: "天空王者",
    minRung: 26,
    maxRung: 30,
    medals: 32,
    titleName: "天空竞技之王",
    titleStats: { bonusAtk: 45, bonusDef: 22, bonusHp: 200, goldGainPct: 3, xpGainPct: 2 },
    gatekeeperMechanics: [
      ["void_collapse_16s", "abyss_miasma_3s", "omega_wrath_40"],
      ["chrono_storm_15s", "paradox_strike_charge", "chrono_haste_40"],
    ],
  },
];

export interface TownFacilityLevelDef {
  level: number;
  gold: number;
  /** 升级所需的真实生活职业成品（升级时一次性扣除）。 */
  items: Readonly<Record<string, number>>;
  /** 升级所需的竞技场勋章（仅荣耀演武场高阶需要）。 */
  medals: number;
  /** 达到该等级后的设施加成（非累加，取当前等级这一行）。 */
  stats: ArenaTownStats;
  /** 该等级解锁 / 强化的跨职业被动说明。 */
  perk: string | null;
}

export interface TownFacilityDef {
  id: TownFacilityId;
  name: string;
  subtitle: string;
  description: string;
  iconKind: "skills" | "ui";
  iconId: string;
  /** 每级贡献的繁荣度。 */
  prosperityPerLevel: number;
  levels: readonly TownFacilityLevelDef[];
}

export const TOWN_FACILITIES: readonly TownFacilityDef[] = [
  {
    id: "town_hall",
    name: "公会议事厅",
    subtitle: "领地中枢 · 设施等级上限",
    description: "公会领地的中枢。议事厅等级决定其余设施可建造的最高等级，每级贡献 4 点繁荣度。",
    iconKind: "skills",
    iconId: "town_hall",
    prosperityPerLevel: 4,
    levels: [
      { level: 1, gold: 800, items: { lumber_1: 12, ingot_1: 6 }, medals: 0, stats: {}, perk: "其余设施可建至 Lv.1" },
      { level: 2, gold: 2500, items: { lumber_2: 12, ingot_2: 8 }, medals: 0, stats: {}, perk: "其余设施可建至 Lv.2" },
      { level: 3, gold: 6000, items: { lumber_3: 12, ingot_3: 8, charcoal: 6 }, medals: 0, stats: {}, perk: "其余设施可建至 Lv.3" },
      { level: 4, gold: 14000, items: { lumber_4: 12, ingot_4: 8, resin: 6 }, medals: 0, stats: {}, perk: "其余设施可建至 Lv.4" },
      { level: 5, gold: 32000, items: { lumber_5: 12, ingot_5: 8, crystal_5: 4 }, medals: 0, stats: {}, perk: "其余设施可建至 Lv.5" },
    ],
  },
  {
    id: "artisan_row",
    name: "匠人工坊街",
    subtitle: "制作提速 · 工坊工具共享",
    description: "锻造、木工、裁缝与炼金的工坊连成一条街，全部制作行动永久提速；三级起工具外借给采集队。",
    iconKind: "skills",
    iconId: "codex_set_forge",
    prosperityPerLevel: 3,
    levels: [
      { level: 1, gold: 600, items: { ingot_1: 8, yarn_1: 6 }, medals: 0, stats: { craftSpeedPct: 2 }, perk: null },
      { level: 2, gold: 1800, items: { ingot_2: 8, yarn_2: 6 }, medals: 0, stats: { craftSpeedPct: 4 }, perk: null },
      {
        level: 3,
        gold: 4500,
        items: { ingot_3: 8, dyed_cloth: 4 },
        medals: 0,
        stats: { craftSpeedPct: 6, gatherSpeedPct: 2 },
        perk: "跨职业被动「工坊工具共享」：采集速度 +2%",
      },
      { level: 4, gold: 11000, items: { ingot_4: 8, yarn_4: 6 }, medals: 0, stats: { craftSpeedPct: 9, gatherSpeedPct: 2 }, perk: null },
      {
        level: 5,
        gold: 26000,
        items: { ingot_5: 8, yarn_5: 6 },
        medals: 0,
        stats: { craftSpeedPct: 12, gatherSpeedPct: 3 },
        perk: "「工坊工具共享」强化：采集速度 +3%",
      },
    ],
  },
  {
    id: "harvest_market",
    name: "丰饶集市",
    subtitle: "采集提速 · 集市余粮",
    description: "农牧、渔获与山货在集市汇聚，全部采集行动永久提速；三级起余粮反哺各工坊。",
    iconKind: "skills",
    iconId: "festival_harvest_basket",
    prosperityPerLevel: 3,
    levels: [
      { level: 1, gold: 600, items: { food_simple: 8, lumber_1: 6 }, medals: 0, stats: { gatherSpeedPct: 2 }, perk: null },
      { level: 2, gold: 1800, items: { bread: 6, milk: 6 }, medals: 0, stats: { gatherSpeedPct: 4 }, perk: null },
      {
        level: 3,
        gold: 4500,
        items: { food_vegetable_stew: 4, food_fine: 3 },
        medals: 0,
        stats: { gatherSpeedPct: 6, craftSpeedPct: 2 },
        perk: "跨职业被动「集市余粮」：制作速度 +2%",
      },
      { level: 4, gold: 11000, items: { honey: 6, cheese_wheel: 4 }, medals: 0, stats: { gatherSpeedPct: 9, craftSpeedPct: 2 }, perk: null },
      {
        level: 5,
        gold: 26000,
        items: { dish_deepsea_stew: 3, food_honey_cake: 4 },
        medals: 0,
        stats: { gatherSpeedPct: 12, craftSpeedPct: 3 },
        perk: "「集市余粮」强化：制作速度 +3%",
      },
    ],
  },
  {
    id: "training_grounds",
    name: "荣耀演武场",
    subtitle: "攻防生命 · 演武护商",
    description: "竞技场冠军坐镇的演武场，永久提升攻击、防御与生命；三级起需要竞技场勋章，并派出护卫护送商队。",
    iconKind: "skills",
    iconId: "war_aura",
    prosperityPerLevel: 3,
    levels: [
      { level: 1, gold: 600, items: { lumber_1: 8, potion_hp_t1: 4 }, medals: 0, stats: { bonusAtk: 4, bonusHp: 15 }, perk: null },
      {
        level: 2,
        gold: 1800,
        items: { ingot_2: 8, potion_hp_t2: 4 },
        medals: 0,
        stats: { bonusAtk: 8, bonusDef: 3, bonusHp: 30 },
        perk: null,
      },
      {
        level: 3,
        gold: 4500,
        items: { ingot_3: 8, potion_hp_t3: 3 },
        medals: 4,
        stats: { bonusAtk: 13, bonusDef: 6, bonusHp: 50, goldGainPct: 1 },
        perk: "跨职业被动「演武护商」：金币收益 +1%",
      },
      {
        level: 4,
        gold: 11000,
        items: { ingot_4: 8, potion_hp_t4: 3 },
        medals: 10,
        stats: { bonusAtk: 19, bonusDef: 9, bonusHp: 75, goldGainPct: 1 },
        perk: null,
      },
      {
        level: 5,
        gold: 26000,
        items: { ingot_5: 8, elixir_legend: 1 },
        medals: 20,
        stats: { bonusAtk: 26, bonusDef: 12, bonusHp: 100, goldGainPct: 2 },
        perk: "「演武护商」强化：金币收益 +2%",
      },
    ],
  },
  {
    id: "guild_bank",
    name: "公会钱庄",
    subtitle: "金币收益 · 账房讲习",
    description: "公会钱庄替冒险者打理账目，生产与战斗金币收益永久提升；三级起账房开设讲习，全职业经验提升。",
    iconKind: "ui",
    iconId: "gold",
    prosperityPerLevel: 3,
    levels: [
      { level: 1, gold: 800, items: { ingot_1: 10 }, medals: 0, stats: { goldGainPct: 1 }, perk: null },
      { level: 2, gold: 2400, items: { ingot_2: 10, drink_basic: 4 }, medals: 0, stats: { goldGainPct: 2 }, perk: null },
      {
        level: 3,
        gold: 6000,
        items: { ingot_3: 10, drink_fine: 4 },
        medals: 0,
        stats: { goldGainPct: 4, xpGainPct: 1 },
        perk: "跨职业被动「账房讲习」：经验 +1%",
      },
      { level: 4, gold: 14000, items: { ingot_4: 10, tea_spirit: 4 }, medals: 0, stats: { goldGainPct: 6, xpGainPct: 1 }, perk: null },
      {
        level: 5,
        gold: 32000,
        items: { ingot_5: 10, drink_rich: 4 },
        medals: 0,
        stats: { goldGainPct: 8, xpGainPct: 2 },
        perk: "「账房讲习」强化：经验 +2%",
      },
    ],
  },
  {
    id: "sage_library",
    name: "贤者书馆",
    subtitle: "经验加成 · 百科通识",
    description: "收藏各职业典籍的书馆，全部行动经验永久提升；三级起百科通识让采集与制作同时提速。",
    iconKind: "skills",
    iconId: "codex_set_arcane",
    prosperityPerLevel: 3,
    levels: [
      { level: 1, gold: 600, items: { lumber_1: 8, yarn_1: 6 }, medals: 0, stats: { xpGainPct: 1 }, perk: null },
      { level: 2, gold: 1800, items: { lumber_2: 8, crystal_2: 4 }, medals: 0, stats: { xpGainPct: 2 }, perk: null },
      {
        level: 3,
        gold: 4500,
        items: { lumber_3: 8, crystal_3: 4 },
        medals: 0,
        stats: { xpGainPct: 3, gatherSpeedPct: 1, craftSpeedPct: 1 },
        perk: "跨职业被动「百科通识」：采集 / 制作速度各 +1%",
      },
      {
        level: 4,
        gold: 11000,
        items: { lumber_4: 8, crystal_4: 4 },
        medals: 0,
        stats: { xpGainPct: 5, gatherSpeedPct: 1, craftSpeedPct: 1 },
        perk: null,
      },
      {
        level: 5,
        gold: 26000,
        items: { lumber_5: 8, crystal_5: 4 },
        medals: 0,
        stats: { xpGainPct: 7, gatherSpeedPct: 2, craftSpeedPct: 2 },
        perk: "「百科通识」强化：采集 / 制作速度各 +2%",
      },
    ],
  },
];

export interface TownProsperityTierDef {
  tier: 0 | 1 | 2 | 3 | 4 | 5;
  minPoints: number;
  name: string;
  stats: ArenaTownStats;
  /** 首次达到该繁荣等级可领取一次的繁荣宝箱。 */
  chestGold: number;
  chestItems: Readonly<Record<string, number>>;
}

/** 繁荣度 = Σ 设施等级 × 每级繁荣度（议事厅 4、其余 3，满建 95）。 */
export const TOWN_PROSPERITY_TIERS: readonly TownProsperityTierDef[] = [
  { tier: 0, minPoints: 0, name: "拓荒营地", stats: {}, chestGold: 0, chestItems: {} },
  { tier: 1, minPoints: 8, name: "公会村落", stats: { goldGainPct: 1 }, chestGold: 600, chestItems: { potion_hp_t1: 5, food_simple: 6 } },
  {
    tier: 2,
    minPoints: 20,
    name: "繁荣小镇",
    stats: { goldGainPct: 2, xpGainPct: 1 },
    chestGold: 1500,
    chestItems: { potion_hp_t2: 5, bread: 6 },
  },
  {
    tier: 3,
    minPoints: 38,
    name: "领地城镇",
    stats: { goldGainPct: 3, xpGainPct: 2, gatherSpeedPct: 1, craftSpeedPct: 1 },
    chestGold: 4000,
    chestItems: { potion_hp_t3: 5, crystal_3: 4 },
  },
  {
    tier: 4,
    minPoints: 60,
    name: "天空城邦",
    stats: { goldGainPct: 4, xpGainPct: 3, gatherSpeedPct: 2, craftSpeedPct: 2, bonusHp: 30 },
    chestGold: 9000,
    chestItems: { potion_hp_t4: 5, crystal_4: 4 },
  },
  {
    tier: 5,
    minPoints: 85,
    name: "天空之城",
    stats: { goldGainPct: 6, xpGainPct: 4, gatherSpeedPct: 3, craftSpeedPct: 3, bonusAtk: 10, bonusHp: 60 },
    chestGold: 22000,
    chestItems: { elixir_legend: 2, crystal_5: 4 },
  },
];

export function isValidArenaDivisionId(id: unknown): id is ArenaDivisionId {
  return typeof id === "string" && (ARENA_DIVISION_IDS as readonly string[]).includes(id);
}

export function isValidTownFacilityId(id: unknown): id is TownFacilityId {
  return typeof id === "string" && (TOWN_FACILITY_IDS as readonly string[]).includes(id);
}

function arenaTownCleanCount(v: unknown, cap: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.min(cap, Math.floor(n)) : 0;
}

/** 东八区赛季序号：年 × 12 + 月（0~11）。 */
export function getArenaSeasonIndex(now: Date | number): number {
  const ms = typeof now === "number" ? now : now.getTime();
  const d = new Date(ms + ARENA_TZ_OFFSET_MINUTES * 60_000);
  return d.getUTCFullYear() * 12 + d.getUTCMonth();
}

/** 赛季序号 → 赛季键 YYYY-MM。 */
export function arenaSeasonKeyFromIndex(index: number): string {
  const i = Math.floor(index);
  const month = (((i % 12) + 12) % 12) + 1;
  return `${Math.floor(i / 12)}-${month < 10 ? "0" : ""}${month}`;
}

export function arenaSeasonKey(now: Date | number): string {
  return arenaSeasonKeyFromIndex(getArenaSeasonIndex(now));
}

/** 赛季键 → 赛季序号；非法键返回 null。 */
export function arenaSeasonIndexFromKey(key: unknown): number | null {
  if (typeof key !== "string") return null;
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(key);
  if (!m) return null;
  return Number(m[1]) * 12 + Number(m[2]) - 1;
}

/** 该赛季开幕（当月 1 日东八区 0 点）的 UTC 毫秒时间戳。 */
export function arenaSeasonStartMs(index: number): number {
  const i = Math.floor(index);
  return Date.UTC(Math.floor(i / 12), ((i % 12) + 12) % 12, 1) - ARENA_TZ_OFFSET_MINUTES * 60_000;
}

/** 该赛季结束（下月 1 日东八区 0 点）的 UTC 毫秒时间戳。 */
export function arenaSeasonEndsAtMs(index: number): number {
  return arenaSeasonStartMs(Math.floor(index) + 1);
}

/** 东八区日期键 YYYY-MM-DD（每日挑战次数按此重置）。 */
export function arenaDayKey(now: Date | number): string {
  const ms = typeof now === "number" ? now : now.getTime();
  return new Date(ms + ARENA_TZ_OFFSET_MINUTES * 60_000).toISOString().slice(0, 10);
}

/** 当前东八区日结束（次日 0 点）的 UTC 毫秒时间戳。 */
export function arenaDayEndsAtMs(now: Date | number): number {
  const ms = typeof now === "number" ? now : now.getTime();
  const shifted = ms + ARENA_TZ_OFFSET_MINUTES * 60_000;
  return Math.floor(shifted / 86_400_000) * 86_400_000 + 86_400_000 - ARENA_TZ_OFFSET_MINUTES * 60_000;
}

export function isValidArenaDayKey(key: unknown): key is string {
  return typeof key === "string" && /^\d{4}-\d{2}-\d{2}$/.test(key) && Number.isFinite(Date.parse(`${key}T00:00:00Z`));
}

/** 32 位整数混合哈希（擂主生成的唯一随机源，纯确定性）。 */
export function arenaHash(a: number, b: number): number {
  let h = (Math.imul((a | 0) ^ 0x5bd1e995, 0x9e3779b1) + Math.imul((b | 0) + 0x27d4eb2f, 0x85ebca77)) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d) >>> 0;
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39) >>> 0;
  h ^= h >>> 15;
  return h >>> 0;
}

/** 梯级所属段位；0 级（未击败任何擂主）返回 null。 */
export function getArenaDivisionForRung(rung: number): ArenaDivisionDef | null {
  const r = Number.isFinite(rung) ? Math.floor(rung) : 0;
  if (r < 1) return null;
  return ARENA_DIVISIONS.find((d) => r >= d.minRung && r <= d.maxRung) || ARENA_DIVISIONS[ARENA_DIVISIONS.length - 1];
}

export interface ArenaChampion {
  id: string;
  rung: number;
  level: number;
  name: string;
  epithet: string;
  archetype: ArenaArchetypeId;
  archetypeName: string;
  style: string;
  division: ArenaDivisionId;
  divisionName: string;
  /** 每段第 5 级为段位守擂人：首领判定 + 额外生命 + 内容包首领机制。 */
  gatekeeper: boolean;
  hp: number;
  atk: number;
  def: number;
  attackIntervalMs: number;
  isBoss: boolean;
  mechanics: string[];
  gold: number;
}

/** 由赛季序号 + 梯级确定性生成擂主（同一赛季同一梯级恒定，换季换一批流派、称号与 ±6% 生命浮动）。 */
export function generateArenaChampion(seasonIndex: number, rung: number): ArenaChampion {
  const r = Math.min(ARENA_RUNG_COUNT, Math.max(1, Math.floor(Number(rung)) || 1));
  const season = Number.isFinite(seasonIndex) ? Math.floor(seasonIndex) : 0;
  const row = ARENA_RUNGS[r - 1];
  const division = getArenaDivisionForRung(r)!;
  const h = arenaHash(season, r);
  const archetype = ARENA_ARCHETYPES[h % ARENA_ARCHETYPES.length];
  const epithet = ARENA_CHAMPION_EPITHETS[(h >>> 8) % ARENA_CHAMPION_EPITHETS.length];
  const gatekeeper = r % ARENA_RUNGS_PER_DIVISION === 0;
  const jitter = 0.94 + ((h >>> 16) % 13) / 100;
  const hpMult = archetype.hpMult * jitter * (gatekeeper ? ARENA_GATEKEEPER_HP_MULT : 1);
  const pool = division.gatekeeperMechanics;
  const mechanics = gatekeeper && pool.length > 0 ? [...pool[(h >>> 24) % pool.length]] : [];
  return {
    id: `arena_champion_r${r}`,
    rung: r,
    level: row.level,
    name: gatekeeper ? `${division.name}守擂人·${epithet}${archetype.name}` : `${epithet}${archetype.name}`,
    epithet,
    archetype: archetype.id,
    archetypeName: archetype.name,
    style: archetype.style,
    division: division.id,
    divisionName: division.name,
    gatekeeper,
    hp: Math.max(1, Math.round(row.hp * hpMult)),
    atk: Math.max(1, Math.round(row.atk * archetype.atkMult)),
    def: Math.max(0, Math.round(row.def * archetype.defMult)),
    attackIntervalMs: archetype.attackIntervalMs,
    isBoss: gatekeeper,
    mechanics,
    gold: row.gold,
  };
}

/** 整个赛季的 30 级擂主梯队。 */
export function getArenaLadder(seasonIndex: number): ArenaChampion[] {
  const out: ArenaChampion[] = [];
  for (let r = 1; r <= ARENA_RUNG_COUNT; r++) out.push(generateArenaChampion(seasonIndex, r));
  return out;
}

/** 擂主 → 战斗引擎的怪物记录（hp_combat.monsterCombatant / fightPreview.PreviewMonster 同口径；不掉落、不给经验金币）。 */
export function arenaChampionMonster(c: ArenaChampion) {
  return {
    id: c.id,
    name: c.name,
    level: c.level,
    hp: c.hp,
    atk: c.atk,
    def: c.def,
    attackIntervalMs: c.attackIntervalMs,
    isBoss: c.isBoss,
    mechanics: [...c.mechanics],
    gold: 0,
    xp: 0,
  };
}

/** 赛季结算：按本季击败的擂主数（最高梯级）定段位，发放该段勋章与对应赛季称号。 */
export function getArenaSettlement(rung: number) {
  const r = Math.min(ARENA_RUNG_COUNT, arenaTownCleanCount(rung, ARENA_RUNG_COUNT));
  const division = getArenaDivisionForRung(r);
  return {
    rung: r,
    division: division ? division.id : null,
    divisionName: division ? division.name : "未定级",
    medals: division ? division.medals : 0,
    titleName: division ? division.titleName : null,
  };
}

/** 称号净化：只保留合法段位、去重并按段位从低到高排列。 */
export function cleanArenaTitles(raw: unknown): ArenaDivisionId[] {
  const src = Array.isArray(raw) ? (raw as unknown[]) : [];
  return ARENA_DIVISION_IDS.filter((id) => src.includes(id));
}

/** 已解锁的最高赛季称号（生效的永久加成）。 */
export function getArenaBestTitle(titles: unknown): ArenaDivisionDef | null {
  const clean = cleanArenaTitles(titles);
  if (clean.length === 0) return null;
  const best = clean[clean.length - 1];
  return ARENA_DIVISIONS.find((d) => d.id === best) || null;
}

/** 设施等级净化：0~5 整数；其余设施不超过议事厅等级。 */
export function cleanTownFacilities(raw: unknown): Record<TownFacilityId, number> {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const hall = arenaTownCleanCount(src.town_hall, TOWN_MAX_LEVEL);
  const cap = (v: unknown) => Math.min(hall, arenaTownCleanCount(v, TOWN_MAX_LEVEL));
  return {
    town_hall: hall,
    artisan_row: cap(src.artisan_row),
    harvest_market: cap(src.harvest_market),
    training_grounds: cap(src.training_grounds),
    guild_bank: cap(src.guild_bank),
    sage_library: cap(src.sage_library),
  };
}

export function getTownFacilityDef(facilityId: TownFacilityId): TownFacilityDef {
  return TOWN_FACILITIES.find((f) => f.id === facilityId) || TOWN_FACILITIES[0];
}

/** 设施可建造的最高等级：议事厅 5；其余设施 = 议事厅当前等级。 */
export function getTownFacilityCap(facilityId: TownFacilityId, facilities: unknown): number {
  if (facilityId === "town_hall") return TOWN_MAX_LEVEL;
  return cleanTownFacilities(facilities).town_hall;
}

/** 繁荣度与繁荣等级（含下一等级进度）。 */
export function getTownProsperity(facilities: unknown) {
  const clean = cleanTownFacilities(facilities);
  let points = 0;
  for (const f of TOWN_FACILITIES) points += clean[f.id] * f.prosperityPerLevel;
  let current = TOWN_PROSPERITY_TIERS[0];
  let next: TownProsperityTierDef | null = null;
  for (let i = 0; i < TOWN_PROSPERITY_TIERS.length; i++) {
    if (points >= TOWN_PROSPERITY_TIERS[i].minPoints) {
      current = TOWN_PROSPERITY_TIERS[i];
      next = TOWN_PROSPERITY_TIERS[i + 1] ?? null;
    }
  }
  const progressPct = next
    ? Math.min(100, Math.max(0, Math.round(((points - current.minPoints) / Math.max(1, next.minPoints - current.minPoints)) * 100)))
    : 100;
  return { points, current, next, progressPct };
}

/** 繁荣宝箱领取记录净化：1~5 去重升序。 */
export function cleanTownChests(raw: unknown): number[] {
  const src = Array.isArray(raw) ? (raw as unknown[]) : [];
  const out: number[] = [];
  for (const t of TOWN_PROSPERITY_TIERS) {
    if (t.tier > 0 && src.includes(t.tier)) out.push(t.tier);
  }
  return out;
}

export interface ArenaTownBonuses {
  titles: ArenaDivisionId[];
  titleDivision: ArenaDivisionId | null;
  titleName: string | null;
  facilityLevels: Record<TownFacilityId, number>;
  prosperityPoints: number;
  prosperityTier: number;
  prosperityName: string;
  gatherSpeedPct: number;
  craftSpeedPct: number;
  xpGainPct: number;
  goldGainPct: number;
  bonusAtk: number;
  bonusDef: number;
  bonusHp: number;
}

export type MinimalArenaTownHolder = {
  skyArena?: {
    titles?: unknown;
  } | null;
  guildTown?: {
    facilities?: unknown;
  } | null;
} | null;

/** 竞技场 + 城镇永久加成 = 最高赛季称号 + 各设施当前等级 + 繁荣等级。 */
export function getArenaTownBonuses(holder?: MinimalArenaTownHolder): ArenaTownBonuses {
  const sa = holder?.skyArena;
  const gt = holder?.guildTown;
  const titles = cleanArenaTitles(sa && typeof sa === "object" ? sa.titles : null);
  const facilities = cleanTownFacilities(gt && typeof gt === "object" ? gt.facilities : null);
  const title = getArenaBestTitle(titles);
  const prosperity = getTownProsperity(facilities);
  const sum: Required<ArenaTownStats> = {
    gatherSpeedPct: 0,
    craftSpeedPct: 0,
    xpGainPct: 0,
    goldGainPct: 0,
    bonusAtk: 0,
    bonusDef: 0,
    bonusHp: 0,
  };
  const add = (s: ArenaTownStats) => {
    for (const k of ARENA_TOWN_STAT_KEYS) sum[k] += s[k] || 0;
  };
  if (title) add(title.titleStats);
  for (const f of TOWN_FACILITIES) {
    const lv = facilities[f.id];
    if (lv > 0) add(f.levels[lv - 1].stats);
  }
  add(prosperity.current.stats);
  return {
    titles,
    titleDivision: title ? title.id : null,
    titleName: title ? title.titleName : null,
    facilityLevels: facilities,
    prosperityPoints: prosperity.points,
    prosperityTier: prosperity.current.tier,
    prosperityName: prosperity.current.name,
    ...sum,
  };
}

/* ---- 以上为 WL-13 core ---- */

function arenaTownCleanInt(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallback;
}

function arenaTownItemName(contentPack: EnhancedContentPack | undefined, itemId: string): string {
  return ((contentPack?.items as Array<{ id: string; name?: string }> | undefined) || []).find((i) => i.id === itemId)?.name || itemId;
}

function arenaSeasonLabel(index: number): string {
  const i = Math.floor(index);
  return `${Math.floor(i / 12)} 年 ${(((i % 12) + 12) % 12) + 1} 月赛季`;
}

function sanitizeArenaSettlement(raw: unknown): ArenaSettlementRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (arenaSeasonIndexFromKey(r.seasonKey) === null) return null;
  const settle = getArenaSettlement(arenaTownCleanInt(r.rung, 0));
  return {
    seasonKey: r.seasonKey as string,
    rung: settle.rung,
    division: settle.division,
    medals: settle.medals,
    newTitle: isValidArenaDivisionId(r.newTitle) ? r.newTitle : null,
  };
}

function sanitizeArenaDuel(raw: unknown): ArenaDuelRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (arenaSeasonIndexFromKey(r.seasonKey) === null) return null;
  const rung = Math.min(ARENA_RUNG_COUNT, Math.max(1, arenaTownCleanInt(r.rung, 1)));
  const at = typeof r.at === "string" && Number.isFinite(Date.parse(r.at)) ? r.at : new Date(0).toISOString();
  return {
    seasonKey: r.seasonKey as string,
    rung,
    championName: typeof r.championName === "string" ? r.championName.slice(0, 40) : `第 ${rung} 级擂主`,
    won: r.won === true,
    timeout: r.timeout === true && r.won !== true,
    playerHpLeft: arenaTownCleanInt(r.playerHpLeft, 0),
    playerMaxHp: arenaTownCleanInt(r.playerMaxHp, 0),
    enemyHpLeft: arenaTownCleanInt(r.enemyHpLeft, 0),
    enemyMaxHp: arenaTownCleanInt(r.enemyMaxHp, 0),
    durationMs: Math.min(ARENA_MAX_FIGHT_MS, arenaTownCleanInt(r.durationMs, 0)),
    gold: r.won === true ? arenaTownCleanInt(r.gold, 0) : 0,
    at,
  };
}

/** 赛季结算（内部）：按本季梯级定段位，发放勋章、解锁称号，记录结算单并开启新赛季（梯级归零）。 */
function settleArenaSeason(player: EnhancedPlayerState, sa: SkyArenaState, nextIndex: number): void {
  const settle = getArenaSettlement(sa.rung);
  const prevIndex = arenaSeasonIndexFromKey(sa.seasonKey)!;
  let newTitle: ArenaDivisionId | null = null;
  if (settle.division) {
    sa.medals = Math.min(ARENA_MEDAL_CAP, sa.medals + settle.medals);
    sa.totalMedalsEarned += settle.medals;
    if (!sa.titles.includes(settle.division)) {
      sa.titles = cleanArenaTitles([...sa.titles, settle.division]);
      newTitle = settle.division;
    }
    appendLog(
      player,
      `天空竞技场「${arenaSeasonLabel(prevIndex)}」结算：${settle.divisionName}段位（第 ${settle.rung} 级），获得 ${settle.medals} 枚竞技场勋章${
        newTitle ? `，解锁赛季称号「${settle.titleName}」` : ""
      }。`
    );
  }
  if (sa.rung > 0 || sa.seasonWins > 0 || sa.seasonLosses > 0) {
    sa.lastSettlement = { seasonKey: sa.seasonKey, rung: settle.rung, division: settle.division, medals: settle.medals, newTitle };
    sa.seasonsSettled += 1;
  }
  sa.seasonKey = arenaSeasonKeyFromIndex(nextIndex);
  sa.rung = 0;
  sa.seasonWins = 0;
  sa.seasonLosses = 0;
  appendLog(player, `天空竞技场「${arenaSeasonLabel(nextIndex)}」开幕：新一批擂主登场，梯级从第 1 级重新攀登！`);
}

/**
 * 确保 skyArena 存在并净化脏档（旧存档首次打开面板时补齐空记录，不赠送任何勋章或称号；转生永久保留）。
 * 仅显式传入 now（指令 / 视图时钟）时才会：东八区自然月前进 → 赛季结算；东八区日期前进 → 重置今日挑战次数。
 * 无参调用（ensurePlayerExtensions / 转生净化）只做净化，绝不按墙钟翻季或换日（沿用 WL-10 ~ WL-12 的显式时钟约定）。
 */
export function ensureSkyArena(player: EnhancedPlayerState, now?: Date): SkyArenaState {
  const clock = now ?? new Date();
  if (!Array.isArray((player as any).logs)) {
    (player as any).logs = [];
  }
  if (!player.inventory || typeof player.inventory !== "object") {
    player.inventory = { gold: 0 };
  }
  if (!player.skyArena || typeof player.skyArena !== "object") {
    player.skyArena = {
      seasonKey: arenaSeasonKey(clock),
      rung: 0,
      bestRung: 0,
      dayKey: arenaDayKey(clock),
      attemptsUsed: 0,
      seasonWins: 0,
      seasonLosses: 0,
      totalWins: 0,
      totalLosses: 0,
      medals: 0,
      totalMedalsEarned: 0,
      titles: [],
      seasonsSettled: 0,
      lastSettlement: null,
      lastDuel: null,
    };
  }
  const sa = player.skyArena;
  if (arenaSeasonIndexFromKey(sa.seasonKey) === null) {
    sa.seasonKey = arenaSeasonKey(clock);
  }
  if (!isValidArenaDayKey(sa.dayKey)) {
    sa.dayKey = arenaDayKey(clock);
  }
  sa.rung = Math.min(ARENA_RUNG_COUNT, arenaTownCleanInt(sa.rung, 0));
  sa.bestRung = Math.max(sa.rung, Math.min(ARENA_RUNG_COUNT, arenaTownCleanInt(sa.bestRung, 0)));
  sa.attemptsUsed = Math.min(ARENA_DAILY_ATTEMPTS, arenaTownCleanInt(sa.attemptsUsed, 0));
  sa.seasonWins = Math.max(sa.rung, arenaTownCleanInt(sa.seasonWins, 0));
  sa.seasonLosses = arenaTownCleanInt(sa.seasonLosses, 0);
  sa.totalWins = Math.max(sa.seasonWins, arenaTownCleanInt(sa.totalWins, 0));
  sa.totalLosses = Math.max(sa.seasonLosses, arenaTownCleanInt(sa.totalLosses, 0));
  sa.medals = Math.min(ARENA_MEDAL_CAP, arenaTownCleanInt(sa.medals, 0));
  sa.totalMedalsEarned = Math.max(sa.medals, arenaTownCleanInt(sa.totalMedalsEarned, 0));
  sa.titles = cleanArenaTitles(sa.titles);
  sa.seasonsSettled = arenaTownCleanInt(sa.seasonsSettled, 0);
  sa.lastSettlement = sanitizeArenaSettlement(sa.lastSettlement);
  sa.lastDuel = sanitizeArenaDuel(sa.lastDuel);

  if (now !== undefined) {
    const curIdx = getArenaSeasonIndex(clock);
    const storedIdx = arenaSeasonIndexFromKey(sa.seasonKey)!;
    // 只向前翻季（时钟回拨不回滚）；跨多个月只结算一次存档所在赛季
    if (curIdx > storedIdx) settleArenaSeason(player, sa, curIdx);
    const day = arenaDayKey(clock);
    // 只向前换日；YYYY-MM-DD 字符串序与日期序一致
    if (day > sa.dayKey) {
      sa.dayKey = day;
      sa.attemptsUsed = 0;
    }
  }
  return sa;
}

function sanitizeTownUpgrade(raw: unknown): GuildTownUpgradeRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!isValidTownFacilityId(r.facilityId)) return null;
  const at = typeof r.at === "string" && Number.isFinite(Date.parse(r.at)) ? r.at : new Date(0).toISOString();
  return { facilityId: r.facilityId, level: Math.min(TOWN_MAX_LEVEL, Math.max(1, arenaTownCleanInt(r.level, 1))), at };
}

/** 确保 guildTown 存在并净化脏档（城镇没有时钟：任何调用都只做净化；转生永久保留）。 */
export function ensureGuildTown(player: EnhancedPlayerState): GuildTownState {
  if (!Array.isArray((player as any).logs)) {
    (player as any).logs = [];
  }
  if (!player.inventory || typeof player.inventory !== "object") {
    player.inventory = { gold: 0 };
  }
  if (!player.guildTown || typeof player.guildTown !== "object") {
    player.guildTown = {
      facilities: cleanTownFacilities(null),
      chestsClaimed: [],
      totalUpgrades: 0,
      goldInvested: 0,
      lastUpgrade: null,
    };
  }
  const gt = player.guildTown;
  gt.facilities = cleanTownFacilities(gt.facilities);
  // 只能领取已达到的繁荣等级宝箱（脏档里超前的领取记录剔除）
  const tier = getTownProsperity(gt.facilities).current.tier;
  gt.chestsClaimed = cleanTownChests(gt.chestsClaimed).filter((t) => t <= tier);
  const levelSum = TOWN_FACILITY_IDS.reduce((s, id) => s + gt.facilities[id], 0);
  gt.totalUpgrades = Math.max(levelSum, arenaTownCleanInt(gt.totalUpgrades, 0));
  gt.goldInvested = arenaTownCleanInt(gt.goldInvested, 0);
  gt.lastUpgrade = sanitizeTownUpgrade(gt.lastUpgrade);
  return gt;
}

/** 指令内统一推进竞技场时钟（翻季 + 换日）并补齐城镇，保证落库状态与响应视图一致。 */
function ensureArenaTownClocks(player: EnhancedPlayerState, now: Date) {
  return { sa: ensureSkyArena(player, now), gt: ensureGuildTown(player) };
}

export interface ArenaDuelResult {
  won: boolean;
  /** 10 分钟未分胜负（按落败计）。 */
  timeout: boolean;
  playerHpLeft: number;
  playerMaxHp: number;
  enemyHpLeft: number;
  enemyMaxHp: number;
  durationMs: number;
  /** 玩家竞技构建（满血、无临时增益）：攻 / 防 / 生命 / 攻击间隔。 */
  player: { atk: number; def: number; hp: number; intervalMs: number };
  /** 战报末尾几行（来自 hp_combat 引擎日志）。 */
  log: string[];
}

/**
 * 竞技场对决：以玩家真实战斗构建（战斗技能等级 + 装备 + 章节构筑 + 全部永久加成 + 已装备技能栏与触发条件）
 * 挑战擂主，直接复用 hp_combat 真实战斗引擎（startHpCombat + tickHpCombat），在存档的沙盒副本上推演，不动真实存档。
 * 竞技场规则：满血入场、禁用料理 / 饮品 / 魔力药水与临时药剂增益、不连战、上限 10 分钟。
 * 前端 arenaTown.previewArenaDuel 以 fightPreview.previewFight 逐步镜像（scripts/arena-town-parity.test.ts 守护）。
 */
export function simulateArenaDuel(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack,
  champion: ArenaChampion,
  now: Date = new Date()
): ArenaDuelResult {
  return simulateSandboxDuel(player, contentPack, arenaChampionMonster(champion), now);
}

/**
 * 沙盒对决（WL-13 竞技场与 WL-16 荣誉试炼共用）：深拷贝玩家、清空临时增益与战斗补给、满血开打，
 * 直接跑 hp_combat 真实战斗引擎（固定随机源），上限 10 分钟，超时按落败计。
 */
export function simulateSandboxDuel(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack,
  monster: ReturnType<typeof arenaChampionMonster>,
  now: Date
): ArenaDuelResult {
  const sandbox = JSON.parse(JSON.stringify(player)) as EnhancedPlayerState;
  sandbox.activeBuffs = [];
  sandbox.combatLoadout = { food: [], drink: [], mp: [], autoRepeat: false };
  sandbox.combatHp = undefined;
  sandbox.combatHpAt = undefined;
  sandbox.hpCombat = undefined;
  (sandbox as any).logs = [];
  const arenaPack = {
    ...contentPack,
    monsters: [...((contentPack.monsters as Array<Record<string, unknown>>) || []), monster],
  } as EnhancedContentPack;
  const startMs = now.getTime();
  sandbox.hpCombat = startHpCombat(sandbox, arenaPack, monster.id, now);
  const playerMaxHp = sandbox.hpCombat.playerMaxHp;
  const intervalMs = sandbox.hpCombat.playerIntervalMs;
  const build = playerBuildExtras(sandbox);
  const pc = playerCombatant(sandbox, arenaPack, build);
  tickHpCombat(sandbox, arenaPack, new Date(startMs + ARENA_MAX_FIGHT_MS), ARENA_MAX_FIGHT_MS, () => 0.99);
  const enc = sandbox.hpCombat!;
  const won = enc.outcome === "win";
  const lost = enc.outcome === "loss";
  // 引擎在分出胜负的那一刻写入 combatHpAt，以此得出精确用时；超时则为满 10 分钟
  const endMs = won || lost ? Number(sandbox.combatHpAt ?? startMs + ARENA_MAX_FIGHT_MS) : startMs + ARENA_MAX_FIGHT_MS;
  return {
    won,
    timeout: !won && !lost,
    playerHpLeft: Math.max(0, enc.playerHp),
    playerMaxHp,
    enemyHpLeft: Math.max(0, enc.enemyHp),
    enemyMaxHp: enc.enemyMaxHp,
    durationMs: Math.max(0, Math.min(ARENA_MAX_FIGHT_MS, endMs - startMs)),
    player: { atk: pc.atk, def: pc.def, hp: playerMaxHp, intervalMs },
    log: (enc.log || []).slice(-6),
  };
}

/** 挑战下一位擂主：消耗 1 次今日挑战次数，胜则晋级并领取金币，负 / 超时只记录战绩。 */
export function challengeSkyArena(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack | undefined,
  now: Date = new Date(),
  expectedRung?: number
): {
  ok: boolean;
  reason?: string;
  won?: boolean;
  timeout?: boolean;
  rung?: number;
  championName?: string;
  gold?: number;
  attemptsLeft?: number;
  duel?: ArenaDuelResult;
} {
  ensurePlayerExtensions(player);
  if (!contentPack) return { ok: false, reason: "竞技场暂未开放（缺少内容包）" };
  const { sa } = ensureArenaTownClocks(player, now);
  if (sa.rung >= ARENA_RUNG_COUNT) {
    return { ok: false, reason: "本赛季已登顶天空竞技场第 30 级，等待月末赛季结算" };
  }
  const target = sa.rung + 1;
  if (expectedRung !== undefined && expectedRung !== target) {
    return { ok: false, reason: `擂主已更替：当前应挑战第 ${target} 级，请刷新后再试` };
  }
  if (sa.attemptsUsed >= ARENA_DAILY_ATTEMPTS) {
    return { ok: false, reason: `今日挑战次数已用完（每个东八区日 ${ARENA_DAILY_ATTEMPTS} 次），明日 0 点重置` };
  }
  const seasonIndex = arenaSeasonIndexFromKey(sa.seasonKey)!;
  const champion = generateArenaChampion(seasonIndex, target);
  const duel = simulateArenaDuel(player, contentPack, champion, now);
  sa.attemptsUsed += 1;
  let gold = 0;
  if (duel.won) {
    sa.rung = target;
    sa.bestRung = Math.max(sa.bestRung, target);
    sa.seasonWins += 1;
    sa.totalWins += 1;
    gold = champion.gold;
    player.inventory.gold = (player.inventory.gold || 0) + gold;
    if (player.stats) player.stats.totalGoldEarned = (player.stats.totalGoldEarned || 0) + gold;
  } else {
    sa.seasonLosses += 1;
    sa.totalLosses += 1;
  }
  sa.lastDuel = {
    seasonKey: sa.seasonKey,
    rung: target,
    championName: champion.name,
    won: duel.won,
    timeout: duel.timeout,
    playerHpLeft: duel.playerHpLeft,
    playerMaxHp: duel.playerMaxHp,
    enemyHpLeft: duel.enemyHpLeft,
    enemyMaxHp: duel.enemyMaxHp,
    durationMs: duel.durationMs,
    gold,
    at: now.toISOString(),
  };
  addReputation(player, duel.won ? 3 : 1);
  syncAchievements(player);
  const secs = Math.max(1, Math.round(duel.durationMs / 1000));
  if (duel.won) {
    const division = getArenaDivisionForRung(target)!;
    appendLog(player, `天空竞技场第 ${target} 级：击败「${champion.name}」（${secs} 秒），获得 ${gold} 金币，当前段位${division.name}。`);
  } else {
    appendLog(
      player,
      `天空竞技场第 ${target} 级：${duel.timeout ? "10 分钟未分胜负，判负" : "败给"}「${champion.name}」（剩余 ${duel.enemyHpLeft}/${duel.enemyMaxHp} 生命）。`
    );
  }
  return {
    ok: true,
    won: duel.won,
    timeout: duel.timeout,
    rung: target,
    championName: champion.name,
    gold,
    attemptsLeft: ARENA_DAILY_ATTEMPTS - sa.attemptsUsed,
    duel,
  };
}

/** 公会城镇：以金币 + 真实生活职业成品（荣耀演武场高阶另需竞技场勋章）建造 / 升级设施。 */
export function upgradeTownFacility(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack | undefined,
  facilityId: TownFacilityId,
  now: Date = new Date()
): {
  ok: boolean;
  reason?: string;
  facilityId?: TownFacilityId;
  level?: number;
  spentGold?: number;
  spentItems?: Record<string, number>;
  spentMedals?: number;
  prosperityPoints?: number;
  prosperityTier?: number;
} {
  ensurePlayerExtensions(player);
  if (!isValidTownFacilityId(facilityId)) {
    return { ok: false, reason: "未知的城镇设施" };
  }
  const { sa, gt } = ensureArenaTownClocks(player, now);
  const def = getTownFacilityDef(facilityId);
  const cur = gt.facilities[facilityId];
  if (cur >= TOWN_MAX_LEVEL) {
    return { ok: false, reason: `「${def.name}」已建至满级 Lv.${TOWN_MAX_LEVEL}` };
  }
  const cap = getTownFacilityCap(facilityId, gt.facilities);
  if (cur + 1 > cap) {
    return {
      ok: false,
      reason: cap === 0 ? "请先建造「公会议事厅」" : `「${def.name}」需先将公会议事厅升至 Lv.${cur + 1}`,
    };
  }
  const lv = def.levels[cur];
  const spentItems: Record<string, number> = {};
  for (const [itemId, qty] of Object.entries(lv.items)) {
    const have = Math.floor(Number(player.inventory[itemId] || 0));
    if (have < qty) {
      return {
        ok: false,
        reason: `${cur === 0 ? "建造" : "升级"}「${def.name}」需「${arenaTownItemName(contentPack, itemId)}」×${qty}（当前 ${have}）`,
      };
    }
    spentItems[itemId] = qty;
  }
  if (lv.medals > 0 && sa.medals < lv.medals) {
    return { ok: false, reason: `「${def.name}」Lv.${lv.level} 需 ${lv.medals} 枚竞技场勋章（当前 ${sa.medals}）` };
  }
  if ((player.inventory.gold || 0) < lv.gold) {
    return { ok: false, reason: `金币不足：${cur === 0 ? "建造" : "升级"}「${def.name}」需 ${lv.gold} 金币` };
  }
  const prevTier = getTownProsperity(gt.facilities).current;
  for (const [itemId, qty] of Object.entries(spentItems)) {
    player.inventory[itemId] = Math.floor(Number(player.inventory[itemId] || 0)) - qty;
    if (player.inventory[itemId] <= 0) delete player.inventory[itemId];
  }
  player.inventory.gold = (player.inventory.gold || 0) - lv.gold;
  if (player.stats) player.stats.totalGoldSpent = (player.stats.totalGoldSpent || 0) + lv.gold;
  if (lv.medals > 0) sa.medals -= lv.medals;
  gt.facilities[facilityId] = cur + 1;
  gt.totalUpgrades += 1;
  gt.goldInvested += lv.gold;
  gt.lastUpgrade = { facilityId, level: cur + 1, at: now.toISOString() };
  const prosperity = getTownProsperity(gt.facilities);
  addReputation(player, 4);
  syncAchievements(player);
  appendLog(
    player,
    `公会城镇「${def.name}」${cur === 0 ? "落成" : "升至"} Lv.${cur + 1}，繁荣度 ${prosperity.points}${lv.perk ? `；${lv.perk}` : ""}。`
  );
  if (prosperity.current.tier > prevTier.tier) {
    appendLog(player, `公会领地晋升「${prosperity.current.name}」！繁荣宝箱已可领取。`);
  }
  return {
    ok: true,
    facilityId,
    level: cur + 1,
    spentGold: lv.gold,
    spentItems,
    spentMedals: lv.medals,
    prosperityPoints: prosperity.points,
    prosperityTier: prosperity.current.tier,
  };
}

/** 繁荣宝箱：每个繁荣等级首次达到后可领取一次（金币 + 真实物品）。 */
export function claimTownProsperityChest(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack | undefined,
  tier: number,
  now: Date = new Date()
): { ok: boolean; reason?: string; tier?: number; gold?: number; items?: Record<string, number> } {
  ensurePlayerExtensions(player);
  const def = TOWN_PROSPERITY_TIERS.find((t) => t.tier === tier && t.tier > 0);
  if (!def) return { ok: false, reason: "未知的繁荣宝箱" };
  const { gt } = ensureArenaTownClocks(player, now);
  const prosperity = getTownProsperity(gt.facilities);
  if (prosperity.current.tier < def.tier) {
    return { ok: false, reason: `「${def.name}」繁荣宝箱需繁荣度 ${def.minPoints}（当前 ${prosperity.points}）` };
  }
  if (gt.chestsClaimed.includes(def.tier)) {
    return { ok: false, reason: `「${def.name}」繁荣宝箱已领取` };
  }
  gt.chestsClaimed = cleanTownChests([...gt.chestsClaimed, def.tier]);
  const items: Record<string, number> = {};
  for (const [id, qty] of Object.entries(def.chestItems)) {
    player.inventory[id] = Math.floor(Number(player.inventory[id] || 0)) + qty;
    items[id] = qty;
  }
  player.inventory.gold = (player.inventory.gold || 0) + def.chestGold;
  if (player.stats) player.stats.totalGoldEarned = (player.stats.totalGoldEarned || 0) + def.chestGold;
  const itemText = Object.entries(items)
    .map(([id, qty]) => `${arenaTownItemName(contentPack, id)}×${qty}`)
    .join("、");
  appendLog(player, `开启「${def.name}」繁荣宝箱：${def.chestGold} 金币${itemText ? `、${itemText}` : ""}。`);
  return { ok: true, tier: def.tier, gold: def.chestGold, items };
}

/** 构造前端「天空竞技场 & 公会城镇」面板视图（会补齐两份状态，并按显式 now 翻季 / 换日；附带前 3 位擂主的真实引擎预演）。 */
export function getSkyArenaTownInfo(player: EnhancedPlayerState, contentPack?: EnhancedContentPack, now: Date = new Date()) {
  ensurePlayerExtensions(player);
  const { sa, gt } = ensureArenaTownClocks(player, now);
  const nowMs = now.getTime();
  const itemName = (id: string) => arenaTownItemName(contentPack, id);
  const have = (id: string) => Math.floor(Number(player.inventory[id] || 0));
  const gold = Math.floor(Number(player.inventory.gold || 0));
  const bonuses = getArenaTownBonuses(player);
  const seasonIndex = arenaSeasonIndexFromKey(sa.seasonKey)!;
  const ladder = getArenaLadder(seasonIndex);
  const attemptsLeft = Math.max(0, ARENA_DAILY_ATTEMPTS - sa.attemptsUsed);
  const division = getArenaDivisionForRung(sa.rung);
  const settlementPreview = getArenaSettlement(sa.rung);
  const bestTitle = getArenaBestTitle(sa.titles);

  const upcomingChampions = ladder.slice(sa.rung, Math.min(ARENA_RUNG_COUNT, sa.rung + 3));
  const duels = upcomingChampions.map((c) => (contentPack ? simulateArenaDuel(player, contentPack, c, now) : null));
  const buildStats =
    duels[0]?.player ??
    (contentPack && sa.rung >= ARENA_RUNG_COUNT ? simulateArenaDuel(player, contentPack, ladder[ARENA_RUNG_COUNT - 1], now).player : null);
  const mechanicTable = ((contentPack?.bossMechanics as Array<{ id: string; label?: string; desc?: string }> | undefined) || []);
  const upcoming = upcomingChampions.map((c, i) => {
    const duel = duels[i];
    return {
      ...c,
      mechanicLabels: c.mechanics.map((id) => {
        const m = mechanicTable.find((d) => d.id === id);
        return { id, label: m?.label || id, desc: m?.desc || "" };
      }),
      preview: duel
        ? {
            won: duel.won,
            timeout: duel.timeout,
            playerHpLeft: duel.playerHpLeft,
            playerMaxHp: duel.playerMaxHp,
            enemyHpLeft: duel.enemyHpLeft,
            enemyMaxHp: duel.enemyMaxHp,
            durationMs: duel.durationMs,
          }
        : null,
      next: i === 0,
    };
  });
  const next = upcoming[0] ?? null;
  let challengeBlock: string | null = null;
  if (!contentPack) challengeBlock = "竞技场暂未开放";
  else if (sa.rung >= ARENA_RUNG_COUNT) challengeBlock = "本赛季已登顶";
  else if (attemptsLeft <= 0) challengeBlock = "今日次数已用完";

  const facilities = TOWN_FACILITIES.map((f) => {
    const level = gt.facilities[f.id];
    const cap = getTownFacilityCap(f.id, gt.facilities);
    const nextLv = level < TOWN_MAX_LEVEL ? f.levels[level] : null;
    const items = nextLv
      ? Object.entries(nextLv.items).map(([itemId, qty]) => ({ itemId, name: itemName(itemId), qty, have: have(itemId) }))
      : [];
    let blockReason: string | null = null;
    if (!nextLv) blockReason = "已满级";
    else if (level + 1 > cap) blockReason = cap === 0 ? "需先建议事厅" : `需议事厅 Lv.${level + 1}`;
    else if (items.some((it) => it.have < it.qty)) blockReason = "成品不足";
    else if (nextLv.medals > sa.medals) blockReason = "勋章不足";
    else if (gold < nextLv.gold) blockReason = "金币不足";
    return {
      id: f.id,
      name: f.name,
      subtitle: f.subtitle,
      description: f.description,
      iconKind: f.iconKind,
      iconId: f.iconId,
      prosperityPerLevel: f.prosperityPerLevel,
      level,
      maxLevel: TOWN_MAX_LEVEL,
      cap,
      currentStats: level > 0 ? f.levels[level - 1].stats : {},
      currentPerk: level > 0 ? f.levels[level - 1].perk : null,
      next: nextLv
        ? {
            level: nextLv.level,
            gold: nextLv.gold,
            medals: nextLv.medals,
            items,
            stats: nextLv.stats,
            perk: nextLv.perk,
          }
        : null,
      perks: f.levels.filter((l) => l.perk).map((l) => ({ level: l.level, perk: l.perk as string, unlocked: level >= l.level })),
      canUpgrade: blockReason === null,
      blockReason,
    };
  });

  const prosperity = getTownProsperity(gt.facilities);
  const chests = TOWN_PROSPERITY_TIERS.filter((t) => t.tier > 0).map((t) => {
    const claimed = gt.chestsClaimed.includes(t.tier);
    const reached = prosperity.current.tier >= t.tier;
    return {
      tier: t.tier,
      name: t.name,
      minPoints: t.minPoints,
      stats: t.stats,
      gold: t.chestGold,
      items: Object.entries(t.chestItems).map(([itemId, qty]) => ({ itemId, name: itemName(itemId), qty })),
      reached,
      claimed,
      canClaim: reached && !claimed,
    };
  });

  return {
    nowMs,
    bonuses,
    arena: {
      seasonKey: sa.seasonKey,
      seasonIndex,
      seasonLabel: arenaSeasonLabel(seasonIndex),
      startsAtMs: arenaSeasonStartMs(seasonIndex),
      endsAtMs: arenaSeasonEndsAtMs(seasonIndex),
      dayKey: sa.dayKey,
      dayEndsAtMs: arenaDayEndsAtMs(nowMs),
      rungCount: ARENA_RUNG_COUNT,
      rung: sa.rung,
      bestRung: sa.bestRung,
      division: division ? { id: division.id, name: division.name } : null,
      attemptsPerDay: ARENA_DAILY_ATTEMPTS,
      attemptsUsed: sa.attemptsUsed,
      attemptsLeft,
      seasonWins: sa.seasonWins,
      seasonLosses: sa.seasonLosses,
      totalWins: sa.totalWins,
      totalLosses: sa.totalLosses,
      medals: sa.medals,
      totalMedalsEarned: sa.totalMedalsEarned,
      titles: sa.titles,
      bestTitle: bestTitle ? { id: bestTitle.id, name: bestTitle.titleName, stats: bestTitle.titleStats } : null,
      seasonsSettled: sa.seasonsSettled,
      settlementPreview,
      lastSettlement: sa.lastSettlement
        ? {
            ...sa.lastSettlement,
            seasonLabel: arenaSeasonLabel(arenaSeasonIndexFromKey(sa.lastSettlement.seasonKey)!),
            divisionName: getArenaSettlement(sa.lastSettlement.rung).divisionName,
            newTitleName: sa.lastSettlement.newTitle
              ? ARENA_DIVISIONS.find((d) => d.id === sa.lastSettlement!.newTitle)!.titleName
              : null,
          }
        : null,
      lastDuel: sa.lastDuel,
      buildStats,
      next,
      upcoming,
      challengeBlock,
      canChallenge: challengeBlock === null && next !== null,
      ladder: ladder.map((c) => ({
        rung: c.rung,
        name: c.name,
        archetypeName: c.archetypeName,
        division: c.division,
        gatekeeper: c.gatekeeper,
        defeated: c.rung <= sa.rung,
        current: c.rung === sa.rung + 1,
      })),
      divisions: ARENA_DIVISIONS.map((d) => ({
        id: d.id,
        name: d.name,
        minRung: d.minRung,
        maxRung: d.maxRung,
        medals: d.medals,
        titleName: d.titleName,
        titleStats: d.titleStats,
        reached: sa.rung >= d.minRung,
        titleOwned: sa.titles.includes(d.id),
      })),
    },
    town: {
      facilities,
      prosperity: {
        points: prosperity.points,
        maxPoints: TOWN_FACILITIES.reduce((s, f) => s + f.prosperityPerLevel * TOWN_MAX_LEVEL, 0),
        tier: prosperity.current.tier,
        name: prosperity.current.name,
        stats: prosperity.current.stats,
        next: prosperity.next ? { tier: prosperity.next.tier, name: prosperity.next.name, minPoints: prosperity.next.minPoints, stats: prosperity.next.stats } : null,
        progressPct: prosperity.progressPct,
      },
      chests,
      totalUpgrades: gt.totalUpgrades,
      goldInvested: gt.goldInvested,
      lastUpgrade: gt.lastUpgrade
        ? { ...gt.lastUpgrade, facilityName: getTownFacilityDef(gt.lastUpgrade.facilityId).name }
        : null,
      medals: sa.medals,
    },
  };
}

/* ============================ 契约魔兽牧场 & 天候观星占卜塔 (WL-14) ============================ */
// 前端 frontend/src/gameplay/beastWeather.ts 逐表逐式 1:1 镜像（scripts/beast-weather-parity.test.ts 守护，
// 「WL-14 core」区段两端逐字一致）。
// - 契约魔兽牧场（转生永久保留）：以内容包真实首领掉落（保护镜 / 秘银矿石 / 沼泽王冠 / 霜冠 / 魔君之角 / 主宰之心）
//   + 烹饪成品 + 金币驯服 6 只契约魔兽（采集 / 制造 / 战斗三种职能），投喂真实料理获得喂养经验成长 Lv.1~10（偏好料理 ×1.5）。
//   同一时间指派一只出战伙伴：采集 / 制造伙伴接入 getActionRates（速度 + 效率产出 + 经验），战斗伙伴的攻防血与金币
//   接入 playerBuildExtras / combinedBuildFromState（hp_combat、fightPreview 与 WL-13 竞技场沙盒对决同口径）。
//   全部魔兽等级之和另给牧场羁绊（不论是否出战）。
// - 天候观星占卜塔：每个东八区日由日序号哈希按权重确定性生成天候（晴 / 雨 / 雾 / 雷暴 / 极光），登临过观星塔后
//   按 now 所在日期的最终天候提升各生活职业产出（getActionRates 效率来源）。消耗 WL-7/9「异域星晶尘」占卜明日天候，
//   再祈愿把明日偏向所选天候（成功率由观星阅历决定、封顶 55%，确定性判定）；换日只在显式传入 now 时发生，
//   无参 ensure 只做净化（沿用 WL-10 ~ WL-13 约定）。

/* ---- 以下为与后端逐字对称的表与纯函数（WL-14 core） ---- */

export const CONTRACT_BEAST_IDS: readonly ContractBeastId[] = [
  "bloom_bee",
  "echo_bat",
  "mire_toad",
  "frostmane_wolf",
  "ember_hound",
  "chrono_wyrm",
];

export const BEAST_ROLE_IDS: readonly BeastRoleId[] = ["gather", "craft", "combat"];

export const WEATHER_IDS: readonly WeatherId[] = ["sunny", "rain", "fog", "storm", "aurora"];

/** 天候按东八区日期（每日 0 点）换日。 */
export const WEATHER_TZ_OFFSET_MINUTES = 480;
export const BEAST_MAX_LEVEL = 10;
/** 达到各等级所需的累计喂养经验（下标 0 = Lv.1，下标 9 = Lv.10 满级）。 */
export const BEAST_LEVEL_XP: readonly number[] = [0, 60, 160, 320, 560, 900, 1360, 1960, 2720, 3660];
/** 偏好料理的喂养经验倍率（百分比，整数运算，两端一致）。 */
export const BEAST_FAVORITE_XP_PCT = 150;
/** 单次喂养最多投喂的料理份数。 */
export const BEAST_FEED_MAX_QTY = 50;
/** 占卜明日天候消耗的异域星晶尘。 */
export const WEATHER_DIVINE_DUST = 6;
/** 祈愿成功率上限（%）：祈愿只能「偏转」天候，绝不保证应验。 */
export const WEATHER_WISH_CHANCE_CAP = 55;
export const WEATHER_HISTORY_DAYS = 7;

export interface BeastWeatherStats {
  gatherSpeedPct?: number;
  craftSpeedPct?: number;
  gatherEfficiencyPct?: number;
  craftEfficiencyPct?: number;
  xpGainPct?: number;
  goldGainPct?: number;
  bonusAtk?: number;
  bonusDef?: number;
  bonusHp?: number;
}

export const BEAST_STAT_KEYS: readonly (keyof BeastWeatherStats)[] = [
  "gatherSpeedPct",
  "craftSpeedPct",
  "gatherEfficiencyPct",
  "craftEfficiencyPct",
  "xpGainPct",
  "goldGainPct",
  "bonusAtk",
  "bonusDef",
  "bonusHp",
];

export interface BeastRoleDef {
  id: BeastRoleId;
  name: string;
  description: string;
}

export const BEAST_ROLES: readonly BeastRoleDef[] = [
  { id: "gather", name: "采集伙伴", description: "陪同采集：提升采集速度与采集产出" },
  { id: "craft", name: "制造伙伴", description: "协助制造：提升制作速度与制作产出" },
  { id: "combat", name: "战斗伙伴", description: "并肩作战：提升攻击、防御与生命" },
];

export interface BeastFoodDef {
  /** 内容包真实烹饪成品 id。 */
  itemId: string;
  /** 每份料理的喂养经验。 */
  xp: number;
}

/** 可喂养的真实料理（烹饪职业成品），按烹饪等级从低到高排列。 */
export const BEAST_FOODS: readonly BeastFoodDef[] = [
  { itemId: "food_simple", xp: 8 },
  { itemId: "food_grain_meal", xp: 10 },
  { itemId: "bread", xp: 12 },
  { itemId: "food_hearty_stew", xp: 20 },
  { itemId: "food_vegetable_stew", xp: 22 },
  { itemId: "food_fine", xp: 26 },
  { itemId: "soup_herbal", xp: 30 },
  { itemId: "dish_grilled_lake", xp: 36 },
  { itemId: "food_honey_cake", xp: 42 },
  { itemId: "food_master_feast", xp: 55 },
  { itemId: "dish_deepsea_stew", xp: 60 },
  { itemId: "food_pork_roast", xp: 80 },
  { itemId: "dish_abyss_platter", xp: 90 },
  { itemId: "dish_frost_sashimi", xp: 120 },
  { itemId: "dish_lava_roast", xp: 150 },
  { itemId: "dish_star_feast", xp: 180 },
  { itemId: "food_royal_banquet", xp: 200 },
  { itemId: "dish_dragon_delicacy", xp: 240 },
  { itemId: "food_divine_feast", xp: 360 },
  { itemId: "food_cosmos_banquet", xp: 600 },
];

export interface ContractBeastDef {
  id: ContractBeastId;
  name: string;
  title: string;
  role: BeastRoleId;
  /** 立绘复用内容包真实怪物美术（monsters/<artId>）。 */
  artId: string;
  description: string;
  /** 掉落驯服信物的首领（内容包真实首领 id）。 */
  bossId: string;
  /** 驯服消耗：首领真实掉落 + 烹饪成品（一次性扣除）。 */
  tameItems: Readonly<Record<string, number>>;
  tameGold: number;
  /** 偏好料理：喂养经验 ×1.5。 */
  favoriteFood: string;
  /** Lv.1 与 Lv.10 的出战加成；中间等级线性插值后四舍五入（主属性每级至少 +1，逐级严格成长）。 */
  statsLv1: BeastWeatherStats;
  statsMax: BeastWeatherStats;
}

export const CONTRACT_BEASTS: readonly ContractBeastDef[] = [
  {
    id: "bloom_bee",
    name: "蜜语花蜂",
    title: "林间采蜜向导",
    role: "gather",
    artId: "bee",
    description: "以森林管家遗落的保护镜映出契约之影，再用简单料理安抚。它熟知每一片林地与花田，陪同采集时总能多带回一份收获。",
    bossId: "forest_boss",
    tameItems: { mirror_protection: 1, food_simple: 10 },
    tameGold: 600,
    favoriteFood: "food_honey_cake",
    statsLv1: { gatherSpeedPct: 2, gatherEfficiencyPct: 1 },
    statsMax: { gatherSpeedPct: 11, gatherEfficiencyPct: 5 },
  },
  {
    id: "echo_bat",
    name: "晶耳回声蝠",
    title: "矿脉回声探子",
    role: "gather",
    artId: "crystal_bat",
    description: "矿山霸主守护的秘银矿石是它的巢材。回声探路能找出最富的矿脉与晶簇，采集更快、更丰，还能顺带积累历练。",
    bossId: "mine_boss",
    tameItems: { ore_6: 2, food_grain_meal: 10, bread: 6 },
    tameGold: 1500,
    favoriteFood: "food_vegetable_stew",
    statsLv1: { gatherSpeedPct: 3, gatherEfficiencyPct: 2, xpGainPct: 1 },
    statsMax: { gatherSpeedPct: 12, gatherEfficiencyPct: 8, xpGainPct: 3 },
  },
  {
    id: "mire_toad",
    name: "沼泽药蟾",
    title: "工坊药液调和师",
    role: "craft",
    artId: "poison_frog",
    description: "戴过沼泽之王王冠的药蟾，分泌的药液能软化木料、润滑丝线、稳住炉温。协助制造时整条工坊都跟着提速。",
    bossId: "swamp_boss",
    tameItems: { swamp_crown: 1, food_hearty_stew: 8 },
    tameGold: 3000,
    favoriteFood: "soup_herbal",
    statsLv1: { craftSpeedPct: 2, craftEfficiencyPct: 1 },
    statsMax: { craftSpeedPct: 11, craftEfficiencyPct: 6 },
  },
  {
    id: "frostmane_wolf",
    name: "霜鬃雪狼",
    title: "冰原护卫猎手",
    role: "combat",
    artId: "snow_wolf",
    description: "以霜冠雪魔的霜冠为契约信物收服的雪狼，与主人并肩作战，撕咬与护主都毫不含糊。",
    bossId: "snow_boss",
    tameItems: { frost_crown: 1, food_master_feast: 4 },
    tameGold: 6000,
    favoriteFood: "food_pork_roast",
    statsLv1: { bonusAtk: 5, bonusHp: 25 },
    statsMax: { bonusAtk: 32, bonusDef: 12, bonusHp: 160 },
  },
  {
    id: "ember_hound",
    name: "余烬炉犬",
    title: "熔炉鼓风伙计",
    role: "craft",
    artId: "cinder_hound",
    description: "烈焰魔君的魔君之角点燃了它的炉心。蹲在熔炉边吐息鼓风，锻造、炼金与烹饪都能更快出炉，还能多出一份。",
    bossId: "volcano_boss",
    tameItems: { demon_horn: 1, dish_deepsea_stew: 4 },
    tameGold: 12000,
    favoriteFood: "dish_lava_roast",
    statsLv1: { craftSpeedPct: 3, craftEfficiencyPct: 2, xpGainPct: 1 },
    statsMax: { craftSpeedPct: 12, craftEfficiencyPct: 9, xpGainPct: 3 },
  },
  {
    id: "chrono_wyrm",
    name: "时渊幼龙",
    title: "裂隙时空守护龙",
    role: "combat",
    artId: "temporal_wyrm",
    description: "时空主宰的主宰之心孕育出的幼龙，契约之后寸步不离。战斗时以龙鳞护主、以龙息压制强敌，连战利品都更丰厚。",
    bossId: "rift_boss",
    tameItems: { sovereign_heart: 1, food_royal_banquet: 2 },
    tameGold: 30000,
    favoriteFood: "dish_dragon_delicacy",
    statsLv1: { bonusAtk: 12, bonusDef: 5, bonusHp: 60 },
    statsMax: { bonusAtk: 70, bonusDef: 30, bonusHp: 320, goldGainPct: 5 },
  },
];

export interface BeastBondTierDef {
  tier: 0 | 1 | 2 | 3 | 4 | 5;
  /** 全部已驯服魔兽的等级之和达到该值即解锁（与是否出战无关）。 */
  minLevels: number;
  name: string;
  stats: BeastWeatherStats;
}

export const BEAST_BOND_TIERS: readonly BeastBondTierDef[] = [
  { tier: 0, minLevels: 0, name: "空置牧场", stats: {} },
  { tier: 1, minLevels: 1, name: "契约小牧场", stats: { goldGainPct: 1 } },
  { tier: 2, minLevels: 12, name: "灵兽庄园", stats: { goldGainPct: 1, xpGainPct: 1 } },
  { tier: 3, minLevels: 24, name: "魔兽牧野", stats: { goldGainPct: 2, xpGainPct: 2, gatherSpeedPct: 1, craftSpeedPct: 1 } },
  {
    tier: 4,
    minLevels: 40,
    name: "万兽契约原",
    stats: { goldGainPct: 3, xpGainPct: 3, gatherSpeedPct: 2, craftSpeedPct: 2, bonusHp: 30 },
  },
  {
    tier: 5,
    minLevels: 60,
    name: "星契神兽圣域",
    stats: { goldGainPct: 4, xpGainPct: 4, gatherSpeedPct: 3, craftSpeedPct: 3, bonusAtk: 10, bonusHp: 60 },
  },
];

export interface WeatherLifeSkillDef {
  skillId: string;
  name: string;
  lane: "gather" | "craft";
}

/** 受天候影响的 12 个生活职业（内容包真实技能 id）。 */
export const WEATHER_LIFE_SKILLS: readonly WeatherLifeSkillDef[] = [
  { skillId: "skill_woodcutter", name: "伐木", lane: "gather" },
  { skillId: "skill_blacksmith", name: "挖矿", lane: "gather" },
  { skillId: "skill_farmer", name: "种植", lane: "gather" },
  { skillId: "skill_chef", name: "钓鱼", lane: "gather" },
  { skillId: "skill_tailor", name: "采集", lane: "gather" },
  { skillId: "skill_alchemist", name: "水晶", lane: "gather" },
  { skillId: "skill_woodworking", name: "木工", lane: "craft" },
  { skillId: "skill_smithing", name: "锻造", lane: "craft" },
  { skillId: "skill_husbandry", name: "畜牧", lane: "craft" },
  { skillId: "skill_cooking", name: "烹饪", lane: "craft" },
  { skillId: "skill_tailoring", name: "缝纫", lane: "craft" },
  { skillId: "skill_alchemy", name: "炼金", lane: "craft" },
];

export interface WeatherDef {
  id: WeatherId;
  name: string;
  short: string;
  /** 天然天候的抽取权重（总和 100）。 */
  weight: number;
  description: string;
  /** 祈愿该天候消耗的异域星晶尘。 */
  wishDust: number;
  /** 各生活职业的产出加成（%，作为效率来源接入 getActionRates：多完成一次 = 多一份产出）。 */
  outputPct: Readonly<Record<string, number>>;
}

export const WEATHER_TYPES: readonly WeatherDef[] = [
  {
    id: "sunny",
    name: "晴空万里",
    short: "晴",
    weight: 32,
    description: "日照充足，田垄与林地生机勃勃，晾晒的棉麻也干得飞快。",
    wishDust: 10,
    outputPct: { skill_farmer: 12, skill_woodcutter: 10, skill_tailor: 8, skill_woodworking: 6, skill_cooking: 4 },
  },
  {
    id: "rain",
    name: "绵绵细雨",
    short: "雨",
    weight: 26,
    description: "细雨涨满河湖，鱼群浮上水面；牧场草料鲜嫩，灶台与药炉也更湿润好用。",
    wishDust: 10,
    outputPct: { skill_chef: 14, skill_husbandry: 8, skill_farmer: 6, skill_alchemy: 6, skill_cooking: 6 },
  },
  {
    id: "fog",
    name: "晨雾弥漫",
    short: "雾",
    weight: 20,
    description: "浓雾滋养晶簇与灵草，药剂师与织工在静谧中心无旁骛。",
    wishDust: 10,
    outputPct: { skill_alchemist: 12, skill_alchemy: 10, skill_tailoring: 8, skill_woodworking: 6, skill_chef: 4 },
  },
  {
    id: "storm",
    name: "雷暴骤雨",
    short: "雷",
    weight: 16,
    description: "雷霆劈开岩层、显露矿脉，锻炉借雷火淬炼；狂风还吹倒了不少良木。",
    wishDust: 12,
    outputPct: { skill_blacksmith: 14, skill_smithing: 12, skill_woodcutter: 6, skill_tailoring: 4, skill_alchemist: 4 },
  },
  {
    id: "aurora",
    name: "星辉极光",
    short: "极光",
    weight: 6,
    description: "罕见的星辉极光笼罩大地，百业皆旺——所有生活职业产出同时提升。",
    wishDust: 24,
    outputPct: {
      skill_woodcutter: 8,
      skill_blacksmith: 8,
      skill_farmer: 8,
      skill_chef: 8,
      skill_tailor: 8,
      skill_alchemist: 8,
      skill_woodworking: 8,
      skill_smithing: 8,
      skill_husbandry: 8,
      skill_cooking: 8,
      skill_tailoring: 8,
      skill_alchemy: 8,
    },
  },
];

export interface WeatherInsightTierDef {
  tier: 0 | 1 | 2 | 3 | 4;
  /** 累计占卜次数达到该值即晋升。 */
  minDivinations: number;
  name: string;
  /** 祈愿成功率（%；祈愿星辉极光减半）。 */
  wishChancePct: number;
}

export const WEATHER_INSIGHT_TIERS: readonly WeatherInsightTierDef[] = [
  { tier: 0, minDivinations: 0, name: "见习占星师", wishChancePct: 30 },
  { tier: 1, minDivinations: 3, name: "星图学徒", wishChancePct: 36 },
  { tier: 2, minDivinations: 8, name: "观星术士", wishChancePct: 42 },
  { tier: 3, minDivinations: 16, name: "天候祭司", wishChancePct: 48 },
  { tier: 4, minDivinations: 30, name: "星穹大占星师", wishChancePct: 55 },
];

export function isValidContractBeastId(id: unknown): id is ContractBeastId {
  return typeof id === "string" && (CONTRACT_BEAST_IDS as readonly string[]).includes(id);
}

export function isValidWeatherId(id: unknown): id is WeatherId {
  return typeof id === "string" && (WEATHER_IDS as readonly string[]).includes(id);
}

function beastWeatherCleanCount(v: unknown, cap: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.min(cap, Math.floor(n)) : 0;
}

export function getContractBeastDef(id: ContractBeastId): ContractBeastDef {
  return CONTRACT_BEASTS.find((b) => b.id === id) || CONTRACT_BEASTS[0];
}

/** 满级所需的累计喂养经验。 */
export function getBeastMaxXp(): number {
  return BEAST_LEVEL_XP[BEAST_LEVEL_XP.length - 1];
}

/** 累计喂养经验 → 等级（1~10；脏数据按 0 经验处理）。 */
export function getBeastLevel(xp: unknown): number {
  const x = beastWeatherCleanCount(xp, getBeastMaxXp());
  let level = 1;
  for (let i = 0; i < BEAST_LEVEL_XP.length; i++) {
    if (x >= BEAST_LEVEL_XP[i]) level = i + 1;
  }
  return Math.min(BEAST_MAX_LEVEL, level);
}

/** 等级进度：当前等级、本级起点经验、下一级所需经验与进度百分比。 */
export function getBeastLevelProgress(xp: unknown) {
  const x = beastWeatherCleanCount(xp, getBeastMaxXp());
  const level = getBeastLevel(x);
  const levelXp = BEAST_LEVEL_XP[level - 1];
  const nextXp = level < BEAST_MAX_LEVEL ? BEAST_LEVEL_XP[level] : null;
  const progressPct =
    nextXp === null ? 100 : Math.min(100, Math.max(0, Math.round(((x - levelXp) / Math.max(1, nextXp - levelXp)) * 100)));
  return { xp: x, level, levelXp, nextXp, progressPct };
}

/** 指定等级的出战加成：Lv.1 与 Lv.10 之间线性插值后四舍五入（Lv.0 = 未驯服，无加成）；只返回非零项。 */
export function getBeastStatsAtLevel(beastId: ContractBeastId, level: number): BeastWeatherStats {
  const def = getContractBeastDef(beastId);
  const lv = Math.min(BEAST_MAX_LEVEL, Math.max(0, Math.floor(Number(level)) || 0));
  const out: BeastWeatherStats = {};
  if (lv < 1) return out;
  for (const k of BEAST_STAT_KEYS) {
    const a = def.statsLv1[k] || 0;
    const b = def.statsMax[k] || 0;
    const v = Math.round(a + ((b - a) * (lv - 1)) / (BEAST_MAX_LEVEL - 1));
    if (v !== 0) out[k] = v;
  }
  return out;
}

/** 料理的每份喂养经验（不可喂养的物品返回 0）。 */
export function getBeastFoodXp(foodId: unknown): number {
  const f = BEAST_FOODS.find((x) => x.itemId === foodId);
  return f ? f.xp : 0;
}

/**
 * 喂养计划：按每份经验（偏好料理 ×1.5，整数向下取整）累加，只投喂到满级所需的份数为止（不浪费料理）。
 * ok = false：未知魔兽 / 不可喂养的料理 / 份数非法 / 已满级。
 */
export function planBeastFeed(beastId: unknown, currentXp: unknown, foodId: unknown, qty: unknown) {
  const maxXp = getBeastMaxXp();
  const xp0 = beastWeatherCleanCount(currentXp, maxXp);
  const levelBefore = getBeastLevel(xp0);
  const base = getBeastFoodXp(foodId);
  const want = Math.floor(Number(qty));
  const favorite = isValidContractBeastId(beastId) && getContractBeastDef(beastId).favoriteFood === foodId;
  const perItem = Math.floor((base * (favorite ? BEAST_FAVORITE_XP_PCT : 100)) / 100);
  if (!isValidContractBeastId(beastId) || perItem <= 0 || !Number.isFinite(want) || want < 1 || want > BEAST_FEED_MAX_QTY || xp0 >= maxXp) {
    return { ok: false, favorite, perItem, qtyUsed: 0, xpGained: 0, xpBefore: xp0, xpAfter: xp0, levelBefore, levelAfter: levelBefore };
  }
  const needed = Math.ceil((maxXp - xp0) / perItem);
  const qtyUsed = Math.min(want, needed);
  const xpAfter = Math.min(maxXp, xp0 + perItem * qtyUsed);
  return {
    ok: true,
    favorite,
    perItem,
    qtyUsed,
    xpGained: xpAfter - xp0,
    xpBefore: xp0,
    xpAfter,
    levelBefore,
    levelAfter: getBeastLevel(xpAfter),
  };
}

/** 已驯服魔兽的等级表（未驯服 = 0；只认合法魔兽 id 与对象记录）。 */
export function cleanBeastLevels(raw: unknown): Record<ContractBeastId, number> {
  const src = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const out = {} as Record<ContractBeastId, number>;
  for (const id of CONTRACT_BEAST_IDS) {
    const rec = src[id];
    out[id] = rec && typeof rec === "object" && !Array.isArray(rec) ? getBeastLevel((rec as { xp?: unknown }).xp) : 0;
  }
  return out;
}

/** 牧场羁绊：全部已驯服魔兽的等级之和（输入为「魔兽 id → 等级」表）决定羁绊等级（含下一等级进度）。 */
export function getBeastBond(levels: unknown) {
  const src = levels && typeof levels === "object" && !Array.isArray(levels) ? (levels as Record<string, unknown>) : {};
  let totalLevels = 0;
  for (const id of CONTRACT_BEAST_IDS) totalLevels += beastWeatherCleanCount(src[id], BEAST_MAX_LEVEL);
  let current = BEAST_BOND_TIERS[0];
  let next: BeastBondTierDef | null = null;
  for (let i = 0; i < BEAST_BOND_TIERS.length; i++) {
    if (totalLevels >= BEAST_BOND_TIERS[i].minLevels) {
      current = BEAST_BOND_TIERS[i];
      next = BEAST_BOND_TIERS[i + 1] ?? null;
    }
  }
  const progressPct = next
    ? Math.min(100, Math.max(0, Math.round(((totalLevels - current.minLevels) / Math.max(1, next.minLevels - current.minLevels)) * 100)))
    : 100;
  return { totalLevels, maxLevels: CONTRACT_BEAST_IDS.length * BEAST_MAX_LEVEL, current, next, progressPct };
}

export interface BeastRanchBonuses {
  activeBeastId: ContractBeastId | null;
  activeLevel: number;
  activeRole: BeastRoleId | null;
  activeStats: BeastWeatherStats;
  tamedCount: number;
  bondLevels: number;
  bondTier: number;
  bondName: string;
  gatherSpeedPct: number;
  craftSpeedPct: number;
  gatherEfficiencyPct: number;
  craftEfficiencyPct: number;
  xpGainPct: number;
  goldGainPct: number;
  bonusAtk: number;
  bonusDef: number;
  bonusHp: number;
}

export type MinimalBeastRanchHolder = {
  beastRanch?: {
    beasts?: unknown;
    activeBeastId?: unknown;
  } | null;
} | null;

/** 契约魔兽牧场永久加成 = 出战伙伴（按等级插值）+ 牧场羁绊（全部魔兽等级之和）。 */
export function getBeastRanchBonuses(holder?: MinimalBeastRanchHolder): BeastRanchBonuses {
  const br = holder?.beastRanch;
  const levels = cleanBeastLevels(br && typeof br === "object" ? br.beasts : null);
  const activeRaw = br && typeof br === "object" ? br.activeBeastId : null;
  const activeBeastId = isValidContractBeastId(activeRaw) && levels[activeRaw] > 0 ? activeRaw : null;
  const activeLevel = activeBeastId ? levels[activeBeastId] : 0;
  const activeStats = activeBeastId ? getBeastStatsAtLevel(activeBeastId, activeLevel) : {};
  let tamedCount = 0;
  for (const id of CONTRACT_BEAST_IDS) if (levels[id] > 0) tamedCount += 1;
  const bond = getBeastBond(levels);
  const sum: Required<BeastWeatherStats> = {
    gatherSpeedPct: 0,
    craftSpeedPct: 0,
    gatherEfficiencyPct: 0,
    craftEfficiencyPct: 0,
    xpGainPct: 0,
    goldGainPct: 0,
    bonusAtk: 0,
    bonusDef: 0,
    bonusHp: 0,
  };
  for (const k of BEAST_STAT_KEYS) sum[k] += (activeStats[k] || 0) + (bond.current.stats[k] || 0);
  return {
    activeBeastId,
    activeLevel,
    activeRole: activeBeastId ? getContractBeastDef(activeBeastId).role : null,
    activeStats,
    tamedCount,
    bondLevels: bond.totalLevels,
    bondTier: bond.current.tier,
    bondName: bond.current.name,
    ...sum,
  };
}

/** 东八区日序号（1970-01-01 东八区 = 0）。 */
export function weatherDayIndex(now: Date | number): number {
  const ms = typeof now === "number" ? now : now.getTime();
  return Math.floor((ms + WEATHER_TZ_OFFSET_MINUTES * 60_000) / 86_400_000);
}

/** 日序号 → 东八区日期键 YYYY-MM-DD。 */
export function weatherDayKeyFromIndex(index: number): string {
  return new Date(Math.floor(index) * 86_400_000).toISOString().slice(0, 10);
}

export function weatherDayKey(now: Date | number): string {
  return weatherDayKeyFromIndex(weatherDayIndex(now));
}

/** 日期键 → 日序号；非法键返回 null。 */
export function weatherDayIndexFromKey(key: unknown): number | null {
  if (typeof key !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const ms = Date.parse(`${key}T00:00:00.000Z`);
  if (!Number.isFinite(ms)) return null;
  const index = Math.floor(ms / 86_400_000);
  return weatherDayKeyFromIndex(index) === key ? index : null;
}

/** 当前东八区日结束（次日 0 点）的 UTC 毫秒时间戳。 */
export function weatherDayEndsAtMs(now: Date | number): number {
  return (weatherDayIndex(now) + 1) * 86_400_000 - WEATHER_TZ_OFFSET_MINUTES * 60_000;
}

/** 32 位整数混合哈希（天候生成与祈愿判定的唯一随机源，纯确定性）。 */
export function weatherHash(a: number, b: number): number {
  let h = (Math.imul((a | 0) ^ 0x3c6ef372, 0xcc9e2d51) + Math.imul((b | 0) + 0x1b873593, 0x85ebca6b)) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

export function getWeatherDef(id: WeatherId): WeatherDef {
  return WEATHER_TYPES.find((w) => w.id === id) || WEATHER_TYPES[0];
}

/** 某日的天然天候：由东八区日序号哈希后按权重抽取（同一天全服一致）。 */
export function getNaturalWeather(dayIndex: number): WeatherId {
  const d = Number.isFinite(dayIndex) ? Math.floor(dayIndex) : 0;
  const total = WEATHER_TYPES.reduce((s, w) => s + w.weight, 0);
  let roll = weatherHash(d, 0x5eed) % total;
  for (const w of WEATHER_TYPES) {
    if (roll < w.weight) return w.id;
    roll -= w.weight;
  }
  return WEATHER_TYPES[0].id;
}

/** 观星阅历：累计占卜次数决定占星师称号与祈愿成功率。 */
export function getWeatherInsight(totalDivinations: unknown) {
  const n = beastWeatherCleanCount(totalDivinations, 1_000_000);
  let current = WEATHER_INSIGHT_TIERS[0];
  let next: WeatherInsightTierDef | null = null;
  for (let i = 0; i < WEATHER_INSIGHT_TIERS.length; i++) {
    if (n >= WEATHER_INSIGHT_TIERS[i].minDivinations) {
      current = WEATHER_INSIGHT_TIERS[i];
      next = WEATHER_INSIGHT_TIERS[i + 1] ?? null;
    }
  }
  const progressPct = next
    ? Math.min(100, Math.max(0, Math.round(((n - current.minDivinations) / Math.max(1, next.minDivinations - current.minDivinations)) * 100)))
    : 100;
  return { totalDivinations: n, current, next, progressPct };
}

/** 祈愿成功率（%）：观星阅历决定，封顶 55%；祈愿星辉极光减半。 */
export function getWeatherWishChance(totalDivinations: unknown, wish: unknown): number {
  if (!isValidWeatherId(wish)) return 0;
  const base = Math.min(WEATHER_WISH_CHANCE_CAP, getWeatherInsight(totalDivinations).current.wishChancePct);
  return wish === "aurora" ? Math.floor(base / 2) : base;
}

/** 祈愿判定：目标日序号 + 祈愿天候哈希取 0~99，小于成功率即应验（确定性，可复现）。 */
export function rollWeatherWish(dayIndex: number, wish: unknown, chancePct: unknown): boolean {
  if (!isValidWeatherId(wish) || !Number.isFinite(dayIndex)) return false;
  const chance = Math.min(WEATHER_WISH_CHANCE_CAP, beastWeatherCleanCount(chancePct, 100));
  return weatherHash(Math.floor(dayIndex), 0x77150 + WEATHER_IDS.indexOf(wish)) % 100 < chance;
}

export type MinimalWeatherTowerHolder = {
  weatherTower?: {
    forecasts?: unknown;
  } | null;
} | null;

/** 某日的最终天候：该日有已应验的祈愿则为祈愿天候，否则为天然天候。 */
export function getWeatherForDay(dayKey: unknown, tower?: { forecasts?: unknown } | null): WeatherId {
  const index = weatherDayIndexFromKey(dayKey);
  if (index === null) return WEATHER_TYPES[0].id;
  const list = tower && typeof tower === "object" && Array.isArray(tower.forecasts) ? (tower.forecasts as unknown[]) : [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const f = raw as { dayKey?: unknown; wish?: unknown; granted?: unknown };
    if (f.dayKey === dayKey && f.granted === true && isValidWeatherId(f.wish)) return f.wish;
  }
  return getNaturalWeather(index);
}

/** 天候对某个生活职业的产出加成（%）。 */
export function getWeatherOutputPct(weather: WeatherId, skillId: unknown): number {
  const pct = getWeatherDef(weather).outputPct[String(skillId)];
  return typeof pct === "number" && pct > 0 ? pct : 0;
}

/**
 * 天候加护：登临过观星塔（weatherTower 已建立）后，按「now 所在东八区日期」的最终天候提升各生活职业产出；
 * 未登临过观星塔的旧存档不受天候影响（active = false）。
 */
export function getWeatherTowerEffect(holder: MinimalWeatherTowerHolder | undefined, now: Date | number) {
  const tower = holder?.weatherTower;
  const active = Boolean(tower && typeof tower === "object");
  const dayKey = weatherDayKey(now);
  const weather = getWeatherForDay(dayKey, active ? tower : null);
  const outputPct: Record<string, number> = {};
  for (const s of WEATHER_LIFE_SKILLS) {
    const pct = active ? getWeatherOutputPct(weather, s.skillId) : 0;
    if (pct > 0) outputPct[s.skillId] = pct;
  }
  return { active, dayKey, weather, outputPct };
}

/* ---- 以上为 WL-14 core ---- */

function beastWeatherCleanInt(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallback;
}

function beastWeatherIso(v: unknown): string {
  return typeof v === "string" && Number.isFinite(Date.parse(v)) ? v : new Date(0).toISOString();
}

function beastWeatherItemName(contentPack: EnhancedContentPack | undefined, itemId: string): string {
  return ((contentPack?.items as Array<{ id: string; name?: string }> | undefined) || []).find((i) => i.id === itemId)?.name || itemId;
}

function beastWeatherBossName(contentPack: EnhancedContentPack | undefined, bossId: string): string {
  const m = ((contentPack?.monsters as Array<{ id: string; name?: string }> | undefined) || []).find((x) => x.id === bossId);
  return (m?.name || bossId).replace(/\(BOSS\)$/, "");
}

/** 驯服可扣除的数量：身上已装备的同名物品（如沼泽王冠饰品）每件保留 1 份，避免扣出幽灵装备槽。 */
function beastSpareQty(player: EnhancedPlayerState, itemId: string): number {
  const have = Math.floor(Number(player.inventory?.[itemId] || 0));
  const eq = (player.equipment || {}) as unknown as Record<string, unknown>;
  let equipped = 0;
  for (const [slot, v] of Object.entries(eq)) {
    if (slot === "enhancementLevels" || slot === "durability" || slot === "maxDurability") continue;
    if (v === itemId) equipped += 1;
  }
  return Math.max(0, have - equipped);
}

function sanitizeBeastRecord(raw: unknown): ContractBeastRecord | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  return {
    xp: Math.min(getBeastMaxXp(), beastWeatherCleanInt(r.xp, 0)),
    fed: beastWeatherCleanInt(r.fed, 0),
    tamedAt: beastWeatherIso(r.tamedAt),
  };
}

function sanitizeBeastEvent(raw: unknown): BeastRanchEventRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!isValidContractBeastId(r.beastId)) return null;
  if (r.kind !== "tame" && r.kind !== "feed" && r.kind !== "assign") return null;
  return {
    kind: r.kind,
    beastId: r.beastId,
    level: Math.min(BEAST_MAX_LEVEL, Math.max(1, beastWeatherCleanInt(r.level, 1))),
    foodId: typeof r.foodId === "string" && getBeastFoodXp(r.foodId) > 0 ? r.foodId : null,
    qty: Math.min(BEAST_FEED_MAX_QTY, beastWeatherCleanInt(r.qty, 0)),
    xpGained: Math.min(getBeastMaxXp(), beastWeatherCleanInt(r.xpGained, 0)),
    at: beastWeatherIso(r.at),
  };
}

/**
 * 确保 beastRanch 存在并净化脏档（旧存档首次打开面板时补齐空牧场，不赠送任何魔兽；转生永久保留）。
 * 牧场没有时钟：任何调用都只做净化（等级由经验表推导，出战伙伴必须已驯服）。
 */
export function ensureBeastRanch(player: EnhancedPlayerState): BeastRanchState {
  if (!Array.isArray((player as any).logs)) {
    (player as any).logs = [];
  }
  if (!player.inventory || typeof player.inventory !== "object") {
    player.inventory = { gold: 0 };
  }
  if (!player.beastRanch || typeof player.beastRanch !== "object") {
    player.beastRanch = { beasts: {}, activeBeastId: null, totalTamed: 0, totalFeedings: 0, lastEvent: null };
  }
  const br = player.beastRanch;
  const src = br.beasts && typeof br.beasts === "object" && !Array.isArray(br.beasts) ? (br.beasts as Record<string, unknown>) : {};
  const beasts: Partial<Record<ContractBeastId, ContractBeastRecord>> = {};
  for (const id of CONTRACT_BEAST_IDS) {
    const rec = sanitizeBeastRecord(src[id]);
    if (rec) beasts[id] = rec;
  }
  br.beasts = beasts;
  br.activeBeastId = isValidContractBeastId(br.activeBeastId) && beasts[br.activeBeastId] ? br.activeBeastId : null;
  const tamed = Object.keys(beasts).length;
  br.totalTamed = Math.max(tamed, beastWeatherCleanInt(br.totalTamed, 0));
  const fedSum = Object.values(beasts).reduce((s, b) => s + (b?.fed || 0), 0);
  br.totalFeedings = Math.max(fedSum, beastWeatherCleanInt(br.totalFeedings, 0));
  br.lastEvent = sanitizeBeastEvent(br.lastEvent);
  return br;
}

function sanitizeWeatherForecast(raw: unknown): WeatherForecastRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const index = weatherDayIndexFromKey(r.dayKey);
  if (index === null) return null;
  // 天然天候永远按日期重算（脏档改不动）；祈愿只能指向与天然不同的天候
  const natural = getNaturalWeather(index);
  const wish = isValidWeatherId(r.wish) && r.wish !== natural ? r.wish : null;
  const chancePct = wish ? Math.min(WEATHER_WISH_CHANCE_CAP, beastWeatherCleanInt(r.chancePct, 0)) : 0;
  const granted = wish !== null && r.granted === true;
  return {
    dayKey: r.dayKey as string,
    natural,
    wish,
    chancePct,
    granted,
    final: granted && wish ? wish : natural,
    at: beastWeatherIso(r.at),
  };
}

function sanitizeWeatherHistory(raw: unknown): WeatherHistoryRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const index = weatherDayIndexFromKey(r.dayKey);
  if (index === null) return null;
  return {
    dayKey: r.dayKey as string,
    weather: isValidWeatherId(r.weather) ? r.weather : getNaturalWeather(index),
    wished: r.wished === true,
  };
}

/**
 * 确保 weatherTower 存在并净化脏档（旧存档首次打开面板时建立观星塔，从此天候开始作用于生活职业产出；转生永久保留）。
 * 仅显式传入 now（指令 / 视图时钟）时才会换日：把存档日到昨日（最多 7 天）的最终天候归档进近 7 日记录，
 * 并丢弃已过期的占卜；无参调用（ensurePlayerExtensions / 转生净化）只做净化，绝不按墙钟换日（沿用 WL-10 ~ WL-13 约定）。
 */
export function ensureWeatherTower(player: EnhancedPlayerState, now?: Date): WeatherTowerState {
  const clock = now ?? new Date();
  if (!Array.isArray((player as any).logs)) {
    (player as any).logs = [];
  }
  if (!player.inventory || typeof player.inventory !== "object") {
    player.inventory = { gold: 0 };
  }
  if (!player.weatherTower || typeof player.weatherTower !== "object") {
    player.weatherTower = {
      dayKey: weatherDayKey(clock),
      forecasts: [],
      history: [],
      totalDivinations: 0,
      totalWishes: 0,
      wishesGranted: 0,
      dustSpent: 0,
    };
  }
  const wt = player.weatherTower;
  if (weatherDayIndexFromKey(wt.dayKey) === null) {
    wt.dayKey = weatherDayKey(clock);
  }
  wt.totalDivinations = beastWeatherCleanInt(wt.totalDivinations, 0);
  wt.totalWishes = Math.min(wt.totalDivinations, beastWeatherCleanInt(wt.totalWishes, 0));
  wt.wishesGranted = Math.min(wt.totalWishes, beastWeatherCleanInt(wt.wishesGranted, 0));
  wt.dustSpent = beastWeatherCleanInt(wt.dustSpent, 0);

  const forecasts: WeatherForecastRecord[] = [];
  for (const raw of Array.isArray(wt.forecasts) ? (wt.forecasts as unknown[]) : []) {
    const f = sanitizeWeatherForecast(raw);
    if (f && !forecasts.some((x) => x.dayKey === f.dayKey)) forecasts.push(f);
  }
  const history: WeatherHistoryRecord[] = [];
  for (const raw of Array.isArray(wt.history) ? (wt.history as unknown[]) : []) {
    const h = sanitizeWeatherHistory(raw);
    if (h && !history.some((x) => x.dayKey === h.dayKey)) history.push(h);
  }

  if (now !== undefined) {
    const cur = weatherDayIndex(clock);
    const stored = weatherDayIndexFromKey(wt.dayKey)!;
    // 只向前换日（时钟回拨不回滚）；跨多日只归档最近 7 天
    if (cur > stored) {
      for (let d = Math.max(stored, cur - WEATHER_HISTORY_DAYS); d < cur; d++) {
        const key = weatherDayKeyFromIndex(d);
        if (history.some((h) => h.dayKey === key)) continue;
        history.push({
          dayKey: key,
          weather: getWeatherForDay(key, { forecasts }),
          wished: forecasts.some((f) => f.dayKey === key && f.granted),
        });
      }
      wt.dayKey = weatherDayKeyFromIndex(cur);
    }
  }

  // 只保留今日与明日的占卜（相对存档日，不看墙钟）；近 7 日记录只保留存档日之前的日子
  const today = weatherDayIndexFromKey(wt.dayKey)!;
  wt.forecasts = forecasts
    .filter((f) => {
      const idx = weatherDayIndexFromKey(f.dayKey)!;
      return idx >= today && idx <= today + 1;
    })
    .sort((a, b) => (a.dayKey < b.dayKey ? -1 : a.dayKey > b.dayKey ? 1 : 0));
  wt.history = history
    .filter((h) => weatherDayIndexFromKey(h.dayKey)! < today)
    .sort((a, b) => (a.dayKey < b.dayKey ? -1 : a.dayKey > b.dayKey ? 1 : 0))
    .slice(-WEATHER_HISTORY_DAYS);
  return wt;
}

/** 指令内统一推进观星塔时钟（换日）并补齐牧场，保证落库状态与响应视图一致。 */
function ensureBeastWeatherClocks(player: EnhancedPlayerState, now: Date) {
  return { br: ensureBeastRanch(player), wt: ensureWeatherTower(player, now) };
}

/** 驯服契约魔兽：消耗首领真实掉落 + 烹饪成品 + 金币；牧场里还没有出战伙伴时自动出战。 */
export function tameContractBeast(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack | undefined,
  beastId: ContractBeastId,
  now: Date = new Date()
): {
  ok: boolean;
  reason?: string;
  beastId?: ContractBeastId;
  spentGold?: number;
  spentItems?: Record<string, number>;
  autoAssigned?: boolean;
  bondTier?: number;
} {
  ensurePlayerExtensions(player);
  if (!isValidContractBeastId(beastId)) {
    return { ok: false, reason: "未知的契约魔兽" };
  }
  const { br } = ensureBeastWeatherClocks(player, now);
  const def = getContractBeastDef(beastId);
  if (br.beasts[beastId]) {
    return { ok: false, reason: `「${def.name}」已在牧场中` };
  }
  const spentItems: Record<string, number> = {};
  for (const [itemId, qty] of Object.entries(def.tameItems)) {
    const have = beastSpareQty(player, itemId);
    if (have < qty) {
      return {
        ok: false,
        reason: `驯服「${def.name}」需「${beastWeatherItemName(contentPack, itemId)}」×${qty}（当前可用 ${have}）`,
      };
    }
    spentItems[itemId] = qty;
  }
  if ((player.inventory.gold || 0) < def.tameGold) {
    return { ok: false, reason: `金币不足：驯服「${def.name}」需 ${def.tameGold} 金币` };
  }
  const prevBond = getBeastRanchBonuses(player).bondTier;
  for (const [itemId, qty] of Object.entries(spentItems)) {
    player.inventory[itemId] = Math.floor(Number(player.inventory[itemId] || 0)) - qty;
    if (player.inventory[itemId] <= 0) delete player.inventory[itemId];
  }
  player.inventory.gold = (player.inventory.gold || 0) - def.tameGold;
  if (player.stats) player.stats.totalGoldSpent = (player.stats.totalGoldSpent || 0) + def.tameGold;
  br.beasts[beastId] = { xp: 0, fed: 0, tamedAt: now.toISOString() };
  br.totalTamed += 1;
  const autoAssigned = !br.activeBeastId;
  if (autoAssigned) br.activeBeastId = beastId;
  br.lastEvent = { kind: "tame", beastId, level: 1, foodId: null, qty: 0, xpGained: 0, at: now.toISOString() };
  const bond = getBeastRanchBonuses(player);
  addReputation(player, 5);
  syncAchievements(player);
  appendLog(
    player,
    `契约魔兽牧场：以「${beastWeatherBossName(contentPack, def.bossId)}」的掉落为信物，驯服了「${def.name}」（${
      BEAST_ROLES.find((r) => r.id === def.role)!.name
    }）${autoAssigned ? "，并立即出战" : ""}！`
  );
  if (bond.bondTier > prevBond) {
    appendLog(player, `牧场羁绊晋升「${bond.bondName}」！`);
  }
  return { ok: true, beastId, spentGold: def.tameGold, spentItems, autoAssigned, bondTier: bond.bondTier };
}

/** 喂养契约魔兽：投喂真实料理获得喂养经验（偏好料理 ×1.5），只扣到满级所需的份数。 */
export function feedContractBeast(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack | undefined,
  beastId: ContractBeastId,
  foodId: string,
  qty: number,
  now: Date = new Date()
): {
  ok: boolean;
  reason?: string;
  beastId?: ContractBeastId;
  foodId?: string;
  qtyUsed?: number;
  xpGained?: number;
  favorite?: boolean;
  levelBefore?: number;
  levelAfter?: number;
  xp?: number;
} {
  ensurePlayerExtensions(player);
  if (!isValidContractBeastId(beastId)) {
    return { ok: false, reason: "未知的契约魔兽" };
  }
  if (getBeastFoodXp(foodId) <= 0) {
    return { ok: false, reason: "该物品不是可喂养的料理" };
  }
  const { br } = ensureBeastWeatherClocks(player, now);
  const def = getContractBeastDef(beastId);
  const rec = br.beasts[beastId];
  if (!rec) {
    return { ok: false, reason: `尚未驯服「${def.name}」` };
  }
  const plan = planBeastFeed(beastId, rec.xp, foodId, qty);
  if (!plan.ok) {
    return {
      ok: false,
      reason: rec.xp >= getBeastMaxXp() ? `「${def.name}」已成长至满级 Lv.${BEAST_MAX_LEVEL}` : `喂养份数需为 1~${BEAST_FEED_MAX_QTY}`,
    };
  }
  const have = Math.floor(Number(player.inventory[foodId] || 0));
  if (have < plan.qtyUsed) {
    return { ok: false, reason: `「${beastWeatherItemName(contentPack, foodId)}」不足：需 ${plan.qtyUsed} 份（当前 ${have}）` };
  }
  const prevBond = getBeastRanchBonuses(player).bondTier;
  player.inventory[foodId] = have - plan.qtyUsed;
  if (player.inventory[foodId] <= 0) delete player.inventory[foodId];
  rec.xp = plan.xpAfter;
  rec.fed += plan.qtyUsed;
  br.totalFeedings += plan.qtyUsed;
  br.lastEvent = {
    kind: "feed",
    beastId,
    level: plan.levelAfter,
    foodId,
    qty: plan.qtyUsed,
    xpGained: plan.xpGained,
    at: now.toISOString(),
  };
  if (plan.levelAfter > plan.levelBefore) addReputation(player, plan.levelAfter - plan.levelBefore);
  syncAchievements(player);
  appendLog(
    player,
    `喂给「${def.name}」${beastWeatherItemName(contentPack, foodId)}×${plan.qtyUsed}${plan.favorite ? "（偏好料理）" : ""}，喂养经验 +${plan.xpGained}${
      plan.levelAfter > plan.levelBefore ? `，成长至 Lv.${plan.levelAfter}！` : "。"
    }`
  );
  const bond = getBeastRanchBonuses(player);
  if (bond.bondTier > prevBond) {
    appendLog(player, `牧场羁绊晋升「${bond.bondName}」！`);
  }
  return {
    ok: true,
    beastId,
    foodId,
    qtyUsed: plan.qtyUsed,
    xpGained: plan.xpGained,
    favorite: plan.favorite,
    levelBefore: plan.levelBefore,
    levelAfter: plan.levelAfter,
    xp: rec.xp,
  };
}

/** 指派 / 召回出战伙伴（只能指派已驯服的魔兽；同一时间仅一只出战）。 */
export function assignBeastCompanion(
  player: EnhancedPlayerState,
  beastId: ContractBeastId | null,
  now: Date = new Date()
): { ok: boolean; reason?: string; activeBeastId?: ContractBeastId | null } {
  ensurePlayerExtensions(player);
  if (beastId !== null && !isValidContractBeastId(beastId)) {
    return { ok: false, reason: "未知的契约魔兽" };
  }
  const { br } = ensureBeastWeatherClocks(player, now);
  if (beastId === null) {
    if (!br.activeBeastId) return { ok: false, reason: "当前没有出战伙伴" };
    const prev = getContractBeastDef(br.activeBeastId);
    br.activeBeastId = null;
    appendLog(player, `「${prev.name}」回到牧场休息。`);
    return { ok: true, activeBeastId: null };
  }
  const def = getContractBeastDef(beastId);
  const rec = br.beasts[beastId];
  if (!rec) return { ok: false, reason: `尚未驯服「${def.name}」` };
  if (br.activeBeastId === beastId) return { ok: false, reason: `「${def.name}」已在出战` };
  br.activeBeastId = beastId;
  br.lastEvent = { kind: "assign", beastId, level: getBeastLevel(rec.xp), foodId: null, qty: 0, xpGained: 0, at: now.toISOString() };
  appendLog(player, `「${def.name}」（${BEAST_ROLES.find((r) => r.id === def.role)!.name}）出战！`);
  return { ok: true, activeBeastId: beastId };
}

/** 占卜明日天候：消耗异域星晶尘揭示明日天然天候（每个东八区日 1 次），累积观星阅历。 */
export function divineTomorrowWeather(
  player: EnhancedPlayerState,
  now: Date = new Date(),
  expectedDayKey?: string
): { ok: boolean; reason?: string; dayKey?: string; natural?: WeatherId; spentDust?: number; insightTier?: number } {
  ensurePlayerExtensions(player);
  const { wt } = ensureBeastWeatherClocks(player, now);
  const todayIdx = weatherDayIndexFromKey(wt.dayKey)!;
  const tomorrowKey = weatherDayKeyFromIndex(todayIdx + 1);
  if (expectedDayKey !== undefined && expectedDayKey !== tomorrowKey) {
    return { ok: false, reason: `日期已更替：当前可占卜的是 ${tomorrowKey}，请刷新后再试` };
  }
  if (wt.forecasts.some((f) => f.dayKey === tomorrowKey)) {
    return { ok: false, reason: "明日天候已占卜（每个东八区日 1 次），可以继续祈愿" };
  }
  const dust = readCleanWallet(player).dust;
  if (dust < WEATHER_DIVINE_DUST) {
    return { ok: false, reason: `异域星晶尘不足（占卜需 ${WEATHER_DIVINE_DUST} 星晶尘，当前 ${dust}）` };
  }
  const ct = ensureCaravanTrade(player, now);
  ct.astralCrystalDust -= WEATHER_DIVINE_DUST;
  const natural = getNaturalWeather(todayIdx + 1);
  wt.forecasts = [
    ...wt.forecasts,
    { dayKey: tomorrowKey, natural, wish: null, chancePct: 0, granted: false, final: natural, at: now.toISOString() },
  ];
  wt.totalDivinations += 1;
  wt.dustSpent += WEATHER_DIVINE_DUST;
  const prevTier = getWeatherInsight(wt.totalDivinations - 1).current;
  const insight = getWeatherInsight(wt.totalDivinations).current;
  addReputation(player, 2);
  syncAchievements(player);
  appendLog(player, `观星塔占卜：明日（${tomorrowKey}）天然天候为「${getWeatherDef(natural).name}」。`);
  if (insight.tier > prevTier.tier) {
    appendLog(player, `观星阅历晋升「${insight.name}」：祈愿成功率提升至 ${insight.wishChancePct}%！`);
  }
  return { ok: true, dayKey: tomorrowKey, natural, spentDust: WEATHER_DIVINE_DUST, insightTier: insight.tier };
}

/** 为明日祈愿：消耗星晶尘把明日天候偏向所选天候（成功率由观星阅历决定、封顶 55%，确定性判定；每日 1 次）。 */
export function wishTomorrowWeather(
  player: EnhancedPlayerState,
  wish: WeatherId,
  now: Date = new Date(),
  expectedDayKey?: string
): {
  ok: boolean;
  reason?: string;
  dayKey?: string;
  wish?: WeatherId;
  chancePct?: number;
  granted?: boolean;
  final?: WeatherId;
  spentDust?: number;
} {
  ensurePlayerExtensions(player);
  if (!isValidWeatherId(wish)) {
    return { ok: false, reason: "未知的天候" };
  }
  const { wt } = ensureBeastWeatherClocks(player, now);
  const todayIdx = weatherDayIndexFromKey(wt.dayKey)!;
  const tomorrowKey = weatherDayKeyFromIndex(todayIdx + 1);
  if (expectedDayKey !== undefined && expectedDayKey !== tomorrowKey) {
    return { ok: false, reason: `日期已更替：当前可祈愿的是 ${tomorrowKey}，请刷新后再试` };
  }
  const f = wt.forecasts.find((x) => x.dayKey === tomorrowKey);
  if (!f) {
    return { ok: false, reason: "请先占卜明日天候，再选择祈愿" };
  }
  if (f.wish) {
    return { ok: false, reason: `明日已祈愿「${getWeatherDef(f.wish).name}」（每日 1 次）` };
  }
  const def = getWeatherDef(wish);
  if (wish === f.natural) {
    return { ok: false, reason: `明日天然天候已是「${def.name}」，无需祈愿` };
  }
  const dust = readCleanWallet(player).dust;
  if (dust < def.wishDust) {
    return { ok: false, reason: `异域星晶尘不足（祈愿「${def.name}」需 ${def.wishDust} 星晶尘，当前 ${dust}）` };
  }
  const chancePct = getWeatherWishChance(wt.totalDivinations, wish);
  const granted = rollWeatherWish(todayIdx + 1, wish, chancePct);
  const ct = ensureCaravanTrade(player, now);
  ct.astralCrystalDust -= def.wishDust;
  f.wish = wish;
  f.chancePct = chancePct;
  f.granted = granted;
  f.final = granted ? wish : f.natural;
  wt.totalWishes += 1;
  if (granted) wt.wishesGranted += 1;
  wt.dustSpent += def.wishDust;
  addReputation(player, granted ? 3 : 1);
  syncAchievements(player);
  appendLog(
    player,
    granted
      ? `观星塔祈愿应验（${chancePct}%）：明日（${tomorrowKey}）将是「${def.name}」！`
      : `观星塔祈愿「${def.name}」未能应验（${chancePct}%），明日仍是「${getWeatherDef(f.natural).name}」。`
  );
  return { ok: true, dayKey: tomorrowKey, wish, chancePct, granted, final: f.final, spentDust: def.wishDust };
}

/** 构造前端「契约魔兽牧场 & 天候观星塔」面板视图（会补齐两份状态，并按显式 now 换日归档）。 */
export function getBeastWeatherInfo(player: EnhancedPlayerState, contentPack?: EnhancedContentPack, now: Date = new Date()) {
  ensurePlayerExtensions(player);
  const { br, wt } = ensureBeastWeatherClocks(player, now);
  const nowMs = now.getTime();
  const itemName = (id: string) => beastWeatherItemName(contentPack, id);
  const have = (id: string) => Math.floor(Number(player.inventory[id] || 0));
  const gold = Math.floor(Number(player.inventory.gold || 0));
  const bonuses = getBeastRanchBonuses(player);
  const levels = cleanBeastLevels(br.beasts);
  const roleName = (role: BeastRoleId) => BEAST_ROLES.find((r) => r.id === role)!.name;

  const beasts = CONTRACT_BEASTS.map((b) => {
    const rec = br.beasts[b.id];
    const tamed = Boolean(rec);
    const prog = getBeastLevelProgress(rec ? rec.xp : 0);
    const level = tamed ? prog.level : 0;
    const tameItems = Object.entries(b.tameItems).map(([itemId, qty]) => ({
      itemId,
      name: itemName(itemId),
      qty,
      have: beastSpareQty(player, itemId),
    }));
    let tameBlock: string | null = null;
    if (tamed) tameBlock = "已驯服";
    else if (tameItems.some((it) => it.have < it.qty)) tameBlock = "信物或料理不足";
    else if (gold < b.tameGold) tameBlock = "金币不足";
    return {
      id: b.id,
      name: b.name,
      title: b.title,
      role: b.role,
      roleName: roleName(b.role),
      artId: b.artId,
      description: b.description,
      bossId: b.bossId,
      bossName: beastWeatherBossName(contentPack, b.bossId),
      tamed,
      active: br.activeBeastId === b.id,
      level,
      maxLevel: BEAST_MAX_LEVEL,
      xp: prog.xp,
      levelXp: prog.levelXp,
      nextXp: tamed ? prog.nextXp : null,
      progressPct: tamed ? prog.progressPct : 0,
      fed: rec ? rec.fed : 0,
      tamedAt: rec ? rec.tamedAt : null,
      favoriteFood: { itemId: b.favoriteFood, name: itemName(b.favoriteFood), have: have(b.favoriteFood) },
      currentStats: tamed ? getBeastStatsAtLevel(b.id, level) : {},
      nextStats: tamed && level < BEAST_MAX_LEVEL ? getBeastStatsAtLevel(b.id, level + 1) : null,
      lv1Stats: getBeastStatsAtLevel(b.id, 1),
      maxStats: getBeastStatsAtLevel(b.id, BEAST_MAX_LEVEL),
      tame: { gold: b.tameGold, items: tameItems, canTame: tameBlock === null, blockReason: tameBlock },
    };
  });
  const bond = getBeastBond(levels);
  const lastEvent = br.lastEvent
    ? {
        ...br.lastEvent,
        beastName: getContractBeastDef(br.lastEvent.beastId).name,
        foodName: br.lastEvent.foodId ? itemName(br.lastEvent.foodId) : null,
      }
    : null;

  const todayIdx = weatherDayIndexFromKey(wt.dayKey)!;
  const tomorrowKey = weatherDayKeyFromIndex(todayIdx + 1);
  const dust = readCleanWallet(player).dust;
  const insight = getWeatherInsight(wt.totalDivinations);
  const outputsOf = (w: WeatherId) =>
    WEATHER_LIFE_SKILLS.map((s) => ({ skillId: s.skillId, name: s.name, lane: s.lane, pct: getWeatherOutputPct(w, s.skillId) })).filter(
      (x) => x.pct > 0
    );
  const todayWeather = getWeatherForDay(wt.dayKey, wt);
  const todayForecast = wt.forecasts.find((f) => f.dayKey === wt.dayKey) || null;
  const tomorrowForecast = wt.forecasts.find((f) => f.dayKey === tomorrowKey) || null;
  let divineBlock: string | null = null;
  if (tomorrowForecast) divineBlock = "明日已占卜";
  else if (dust < WEATHER_DIVINE_DUST) divineBlock = "星晶尘不足";
  const types = WEATHER_TYPES.map((w) => {
    const chancePct = getWeatherWishChance(wt.totalDivinations, w.id);
    let wishBlock: string | null = null;
    if (!tomorrowForecast) wishBlock = "先占卜明日";
    else if (tomorrowForecast.wish) wishBlock = "明日已祈愿";
    else if (tomorrowForecast.natural === w.id) wishBlock = "天然即是";
    else if (dust < w.wishDust) wishBlock = "星晶尘不足";
    return {
      id: w.id,
      name: w.name,
      short: w.short,
      weight: w.weight,
      description: w.description,
      wishDust: w.wishDust,
      outputs: outputsOf(w.id),
      chancePct,
      canWish: wishBlock === null,
      wishBlock,
    };
  });
  const effect = getWeatherTowerEffect(player, now);

  return {
    nowMs,
    bonuses,
    weatherEffect: {
      ...effect,
      name: getWeatherDef(effect.weather).name,
      outputs: outputsOf(effect.weather).filter((o) => (effect.outputPct[o.skillId] || 0) > 0),
    },
    ranch: {
      beasts,
      activeBeastId: br.activeBeastId,
      foods: BEAST_FOODS.map((f) => ({ itemId: f.itemId, name: itemName(f.itemId), xp: f.xp, have: have(f.itemId) })),
      feedMaxQty: BEAST_FEED_MAX_QTY,
      favoriteXpPct: BEAST_FAVORITE_XP_PCT,
      bond: {
        totalLevels: bond.totalLevels,
        maxLevels: bond.maxLevels,
        tier: bond.current.tier,
        name: bond.current.name,
        stats: bond.current.stats,
        next: bond.next ? { tier: bond.next.tier, name: bond.next.name, minLevels: bond.next.minLevels, stats: bond.next.stats } : null,
        progressPct: bond.progressPct,
        tiers: BEAST_BOND_TIERS.filter((t) => t.tier > 0).map((t) => ({
          tier: t.tier,
          name: t.name,
          minLevels: t.minLevels,
          stats: t.stats,
          reached: bond.totalLevels >= t.minLevels,
        })),
      },
      totalTamed: br.totalTamed,
      totalFeedings: br.totalFeedings,
      lastEvent,
    },
    weather: {
      dayKey: wt.dayKey,
      dayEndsAtMs: (todayIdx + 1) * 86_400_000 - WEATHER_TZ_OFFSET_MINUTES * 60_000,
      tomorrowKey,
      today: {
        dayKey: wt.dayKey,
        weather: todayWeather,
        name: getWeatherDef(todayWeather).name,
        short: getWeatherDef(todayWeather).short,
        description: getWeatherDef(todayWeather).description,
        natural: getNaturalWeather(todayIdx),
        wished: Boolean(todayForecast && todayForecast.granted),
        outputs: outputsOf(todayWeather),
      },
      tomorrow: tomorrowForecast
        ? {
            dayKey: tomorrowKey,
            divined: true,
            natural: tomorrowForecast.natural as WeatherId | null,
            naturalName: getWeatherDef(tomorrowForecast.natural).name as string | null,
            wish: tomorrowForecast.wish,
            wishName: tomorrowForecast.wish ? getWeatherDef(tomorrowForecast.wish).name : null,
            chancePct: tomorrowForecast.chancePct,
            granted: tomorrowForecast.granted,
            final: tomorrowForecast.final as WeatherId | null,
            finalName: getWeatherDef(tomorrowForecast.final).name as string | null,
            outputs: outputsOf(tomorrowForecast.final),
          }
        : {
            dayKey: tomorrowKey,
            divined: false,
            natural: null,
            naturalName: null,
            wish: null,
            wishName: null,
            chancePct: 0,
            granted: false,
            final: null,
            finalName: null,
            outputs: [] as ReturnType<typeof outputsOf>,
          },
      types,
      history: wt.history.map((h) => ({ ...h, name: getWeatherDef(h.weather).name, short: getWeatherDef(h.weather).short })),
      insight: {
        totalDivinations: insight.totalDivinations,
        tier: insight.current.tier,
        name: insight.current.name,
        wishChancePct: getWeatherWishChance(wt.totalDivinations, "sunny"),
        auroraChancePct: getWeatherWishChance(wt.totalDivinations, "aurora"),
        next: insight.next
          ? { tier: insight.next.tier, name: insight.next.name, minDivinations: insight.next.minDivinations, wishChancePct: insight.next.wishChancePct }
          : null,
        progressPct: insight.progressPct,
      },
      dust,
      divineDust: WEATHER_DIVINE_DUST,
      canDivine: divineBlock === null,
      divineBlock,
      wishChanceCap: WEATHER_WISH_CHANCE_CAP,
      totalDivinations: wt.totalDivinations,
      totalWishes: wt.totalWishes,
      wishesGranted: wt.wishesGranted,
      dustSpent: wt.dustSpent,
    },
  };
}

/* ============================ 吟游诗人酒馆 & 冒险者编年史 (WL-15) ============================ */
// 前端 frontend/src/gameplay/bardTavern.ts 逐表逐式 1:1 镜像（scripts/bard-tavern-parity.test.ts 守护，
// 「WL-15 core」区段两端逐字一致）。
// - 吟游诗人酒馆（转生永久保留）：8 位常客按东八区日序号哈希确定性洗牌，每日来访 4 位并各点一份真实料理 + 一份真实饮品
//   （内容包烹饪成品）。招待时端上背包里的料理 / 饮品换取酒馆名望与小费，合点单 ×1.5、全合再 +5。累计名望晋升 6 级，
//   名望等级给小幅永久加成（采集 / 制作速度、经验、金币，最高级 +30 生命），接入 getActionRates 与 playerBuildExtras /
//   combinedBuildFromState。花金币点唱吟游诗篇（每日 3 次、同一时间一首）获得名望与 30~45 分钟限时增益，
//   增益按 now 判定后接入 getActionRates（离线模拟按结算时刻）。换日只在显式传入 now 时发生，无参 ensure 只做净化
//   （沿用 WL-10 ~ WL-14 约定）。
// - 冒险者编年史（转生永久保留）：直接读取存档里已有的真实记录（生涯击杀统计里的首领、WL-9 遗迹勘探、WL-7 商队远征、
//   WL-11 垂钓奖杯与水族馆、WL-12 学院学分 / 结业与四季纪念章、WL-13 竞技场梯级 / 胜场 / 称号、WL-14 契约魔兽、
//   转生次数与酒馆名望），不新增任何计数器；七卷章节各收录三条里程碑，全部达成即可编撰，解锁称号与小幅永久加成。

/* ---- 以下为与后端逐字对称的表与纯函数（WL-15 core） ---- */

export const TAVERN_VISITOR_IDS: readonly TavernVisitorId[] = [
  "star_knight",
  "dawn_ranger",
  "verdant_mage",
  "crimson_valkyrie",
  "jade_alchemist",
  "moon_healer",
  "fox_wanderer",
  "cat_cavalier",
];

export const TAVERN_BALLAD_IDS: readonly TavernBalladId[] = ["forest_wander", "forge_hearth", "sage_chant", "golden_toast", "hero_epic"];

export const CHRONICLE_CHAPTER_IDS: readonly ChronicleChapterId[] = [
  "slayer_saga",
  "expedition_journal",
  "harbor_log",
  "academy_annals",
  "arena_epic",
  "beast_bond",
  "legend_finale",
];

export const CHRONICLE_METRIC_IDS: readonly ChronicleMetricId[] = [
  "boss_kinds",
  "boss_kills",
  "relic_surveys",
  "curator_rank",
  "caravan_runs",
  "derby_trophies",
  "derby_best_tier",
  "aquarium_species",
  "academy_graduations",
  "academy_credits",
  "festival_keepsakes",
  "arena_best_rung",
  "arena_wins",
  "arena_titles",
  "beasts_tamed",
  "beast_top_level",
  "ranch_bond_levels",
  "chapters_inscribed",
  "tavern_fame",
  "prestige_count",
];

/** 酒馆按东八区日期（每日 0 点）换日：来访冒险者、招待与点唱次数都随之轮换。 */
export const TAVERN_TZ_OFFSET_MINUTES = 480;
/** 每个东八区日来访的冒险者人数（从 8 位常客中确定性抽取）。 */
export const TAVERN_VISITORS_PER_DAY = 4;
/** 每个东八区日最多点唱的诗篇次数。 */
export const TAVERN_BALLADS_PER_DAY = 3;
/** 端上冒险者当日点名的料理 / 饮品：该项名望 ×1.5（百分比，整数运算，两端一致）。 */
export const TAVERN_ORDER_MATCH_PCT = 150;
/** 料理与饮品都合点单（完美招待）的额外名望。 */
export const TAVERN_PERFECT_BONUS_FAME = 5;
/** 编年史里程碑读数的上限（防脏档溢出）。 */
export const CHRONICLE_METRIC_CAP = 1_000_000_000;
/** 首领讨伐计入的内容包真实首领（按等级由低到高）。 */
export const CHRONICLE_BOSS_IDS: readonly string[] = [
  "forest_boss",
  "mine_boss",
  "swamp_boss",
  "snow_boss",
  "volcano_boss",
  "abyss_boss",
  "celestial_boss",
  "rift_boss",
  "inferno_boss",
  "genesis_boss",
  "omega_boss",
];
/** WL-11 港湾大赛奖杯段位（由低到高，段位序号 1~4）。 */
export const CHRONICLE_TROPHY_TIERS: readonly string[] = ["bronze", "silver", "gold", "legend"];
/** WL-11 海港水族馆可收藏的鱼种。 */
export const CHRONICLE_AQUARIUM_SPECIES: readonly string[] = [
  "fish_river",
  "shrimp",
  "fish_sea",
  "fish_lake",
  "fish_deepsea",
  "fish_abyss",
  "fish_frost",
  "fish_lava",
  "fish_star",
  "fish_dragon",
  "sunscale_carp",
  "abyss_lantern",
];
/** WL-12 冒险者学院四系。 */
export const CHRONICLE_ACADEMY_DEPTS: readonly string[] = ["gathering", "crafting", "tactics", "commerce"];
/** WL-12 四季纪念章。 */
export const CHRONICLE_FESTIVAL_SEASONS: readonly string[] = ["spring", "summer", "autumn", "winter"];
/** WL-13 天空竞技场赛季称号段位。 */
export const CHRONICLE_ARENA_DIVISIONS: readonly string[] = ["bronze", "silver", "gold", "platinum", "diamond", "sky_king"];

export interface TavernChronicleStats {
  gatherSpeedPct?: number;
  craftSpeedPct?: number;
  gatherEfficiencyPct?: number;
  craftEfficiencyPct?: number;
  xpGainPct?: number;
  goldGainPct?: number;
  bonusAtk?: number;
  bonusDef?: number;
  bonusHp?: number;
}

export const TAVERN_STAT_KEYS: readonly (keyof TavernChronicleStats)[] = [
  "gatherSpeedPct",
  "craftSpeedPct",
  "gatherEfficiencyPct",
  "craftEfficiencyPct",
  "xpGainPct",
  "goldGainPct",
  "bonusAtk",
  "bonusDef",
  "bonusHp",
];

export interface TavernMenuItemDef {
  /** 内容包真实烹饪成品 id。 */
  itemId: string;
  kind: "dish" | "drink";
  /** 端上这一份带来的基础酒馆名望。 */
  fame: number;
}

/** 酒馆菜单：真实烹饪成品（料理按烹饪等级从低到高，其后为饮品）。 */
export const TAVERN_MENU: readonly TavernMenuItemDef[] = [
  { itemId: "food_simple", kind: "dish", fame: 2 },
  { itemId: "food_grain_meal", kind: "dish", fame: 3 },
  { itemId: "food_hearty_stew", kind: "dish", fame: 4 },
  { itemId: "bread", kind: "dish", fame: 4 },
  { itemId: "food_vegetable_stew", kind: "dish", fame: 5 },
  { itemId: "food_fine", kind: "dish", fame: 6 },
  { itemId: "food_master_feast", kind: "dish", fame: 8 },
  { itemId: "soup_herbal", kind: "dish", fame: 9 },
  { itemId: "dish_grilled_lake", kind: "dish", fame: 9 },
  { itemId: "food_honey_cake", kind: "dish", fame: 10 },
  { itemId: "dish_deepsea_stew", kind: "dish", fame: 12 },
  { itemId: "food_pork_roast", kind: "dish", fame: 14 },
  { itemId: "dish_abyss_platter", kind: "dish", fame: 14 },
  { itemId: "dish_frost_sashimi", kind: "dish", fame: 17 },
  { itemId: "food_royal_banquet", kind: "dish", fame: 20 },
  { itemId: "dish_lava_roast", kind: "dish", fame: 20 },
  { itemId: "dish_star_feast", kind: "dish", fame: 22 },
  { itemId: "dish_dragon_delicacy", kind: "dish", fame: 25 },
  { itemId: "food_divine_feast", kind: "dish", fame: 28 },
  { itemId: "food_cosmos_banquet", kind: "dish", fame: 36 },
  { itemId: "drink_basic", kind: "drink", fame: 3 },
  { itemId: "drink_herbal_tonic", kind: "drink", fame: 5 },
  { itemId: "drink_fine", kind: "drink", fame: 6 },
  { itemId: "tea_spirit", kind: "drink", fame: 8 },
  { itemId: "drink_rich", kind: "drink", fame: 11 },
  { itemId: "drink_arcane", kind: "drink", fame: 20 },
  { itemId: "drink_divine", kind: "drink", fame: 26 },
];

export interface TavernVisitorDef {
  id: TavernVisitorId;
  name: string;
  title: string;
  /** 头像复用角色创建的真实头像美术（ui/<avatarId>）。 */
  avatarId: string;
  quote: string;
  /** 爱吃的料理（当日点单从中确定性抽取）。 */
  dishes: readonly string[];
  /** 爱喝的饮品（当日点单从中确定性抽取）。 */
  drinks: readonly string[];
  /** 每点名望付的小费金币。 */
  tipPerFame: number;
}

export const TAVERN_VISITORS: readonly TavernVisitorDef[] = [
  {
    id: "star_knight",
    name: "罗兰",
    title: "星辉剑士",
    avatarId: "avatar_male_knight",
    quote: "刚从霜冠雪魔的冰原回来，来一份顶饱的热菜，再来一杯醇酒暖暖身子！",
    dishes: ["food_hearty_stew", "food_master_feast", "food_pork_roast", "food_royal_banquet"],
    drinks: ["drink_basic", "drink_rich"],
    tipPerFame: 12,
  },
  {
    id: "dawn_ranger",
    name: "阿尔文",
    title: "晨风游侠",
    avatarId: "avatar_male_ranger",
    quote: "林间赶路一整天，想吃点清爽的湖鲜，配一壶灵茶就好。",
    dishes: ["food_grain_meal", "food_vegetable_stew", "dish_grilled_lake", "dish_star_feast"],
    drinks: ["tea_spirit", "drink_herbal_tonic"],
    tipPerFame: 11,
  },
  {
    id: "verdant_mage",
    name: "墨林",
    title: "苍翠秘术师",
    avatarId: "avatar_male_mage",
    quote: "施法太耗神了……药膳和甜点都行，饮品要能回魔力的那种。",
    dishes: ["soup_herbal", "food_honey_cake", "dish_abyss_platter", "food_divine_feast"],
    drinks: ["tea_spirit", "drink_arcane"],
    tipPerFame: 13,
  },
  {
    id: "crimson_valkyrie",
    name: "布伦希尔",
    title: "绯光女武神",
    avatarId: "avatar_female_valkyrie",
    quote: "烤肉！要火候最旺的那种！今晚我请全场喝一轮佳酿！",
    dishes: ["food_master_feast", "food_pork_roast", "dish_lava_roast", "dish_dragon_delicacy"],
    drinks: ["drink_fine", "drink_rich"],
    tipPerFame: 14,
  },
  {
    id: "jade_alchemist",
    name: "艾琳",
    title: "翠星炼金术师",
    avatarId: "avatar_female_alchemist",
    quote: "实验室的坩埚还在咕嘟——给我一份能边看配方边吃的点心和一杯汤剂。",
    dishes: ["bread", "food_honey_cake", "dish_deepsea_stew", "food_cosmos_banquet"],
    drinks: ["drink_herbal_tonic", "drink_arcane", "drink_divine"],
    tipPerFame: 12,
  },
  {
    id: "moon_healer",
    name: "露娜",
    title: "月华圣女",
    avatarId: "avatar_female_healer",
    quote: "为伤员守了一夜……请给我一碗温补的汤，再泡一壶清心的茶。",
    dishes: ["soup_herbal", "food_vegetable_stew", "food_fine", "food_divine_feast"],
    drinks: ["tea_spirit", "drink_divine"],
    tipPerFame: 11,
  },
  {
    id: "fox_wanderer",
    name: "小葵",
    title: "灵狐冒险家",
    avatarId: "avatar_animal_fox",
    quote: "老板老板，今天有什么好吃的？简单料理也行，要有鱼！",
    dishes: ["food_simple", "bread", "dish_grilled_lake", "dish_frost_sashimi"],
    drinks: ["drink_basic", "drink_fine"],
    tipPerFame: 10,
  },
  {
    id: "cat_cavalier",
    name: "喵爵士",
    title: "星冠猫骑士",
    avatarId: "avatar_animal_cat",
    quote: "本爵士只吃海里来的鲜货。刺身、浓汤、星界鱼宴——喵，统统端上来。",
    dishes: ["food_simple", "dish_deepsea_stew", "dish_frost_sashimi", "dish_star_feast"],
    drinks: ["drink_basic", "tea_spirit"],
    tipPerFame: 13,
  },
];

export interface TavernBalladDef {
  id: TavernBalladId;
  name: string;
  description: string;
  /** 解锁所需的酒馆名望等级。 */
  minFameTier: number;
  costGold: number;
  /** 诗篇增益持续时间（分钟）。 */
  durationMin: number;
  /** 点唱带来的酒馆名望。 */
  fame: number;
  /** 限时增益（只作用于生活职业速度 / 产出、经验与金币收益，不改变战斗机制）。 */
  stats: TavernChronicleStats;
}

export const TAVERN_BALLADS: readonly TavernBalladDef[] = [
  {
    id: "forest_wander",
    name: "林野采风谣",
    description: "轻快的林野小调，跟着节拍采集，脚步与手上的活计都更利落。",
    minFameTier: 0,
    costGold: 300,
    durationMin: 30,
    fame: 4,
    stats: { gatherSpeedPct: 8, gatherEfficiencyPct: 4 },
  },
  {
    id: "forge_hearth",
    name: "炉火匠心曲",
    description: "铁锤与琴弦同拍的工坊号子，炉火更旺、针脚更密。",
    minFameTier: 0,
    costGold: 300,
    durationMin: 30,
    fame: 4,
    stats: { craftSpeedPct: 8, craftEfficiencyPct: 4 },
  },
  {
    id: "sage_chant",
    name: "智者长吟",
    description: "吟诵古老学者的箴言，听者触类旁通，历练积累得更快。",
    minFameTier: 1,
    costGold: 600,
    durationMin: 30,
    fame: 6,
    stats: { xpGainPct: 8 },
  },
  {
    id: "golden_toast",
    name: "金杯祝酒歌",
    description: "满堂举杯的祝酒歌，财源随着酒香一起滚滚而来。",
    minFameTier: 2,
    costGold: 600,
    durationMin: 30,
    fame: 6,
    stats: { goldGainPct: 10 },
  },
  {
    id: "hero_epic",
    name: "屠龙英雄史诗",
    description: "诗人倾尽全力演唱的长篇史诗，整座城镇都为之振奋。",
    minFameTier: 3,
    costGold: 2000,
    durationMin: 45,
    fame: 12,
    stats: { gatherSpeedPct: 5, craftSpeedPct: 5, xpGainPct: 5, goldGainPct: 5 },
  },
];

export interface TavernFameTierDef {
  tier: 0 | 1 | 2 | 3 | 4 | 5;
  /** 累计酒馆名望达到该值即晋升（永久）。 */
  minFame: number;
  name: string;
  stats: TavernChronicleStats;
}

export const TAVERN_FAME_TIERS: readonly TavernFameTierDef[] = [
  { tier: 0, minFame: 0, name: "无名小酒馆", stats: {} },
  { tier: 1, minFame: 60, name: "街角酒肆", stats: { goldGainPct: 1 } },
  { tier: 2, minFame: 200, name: "冒险者驿站", stats: { goldGainPct: 1, xpGainPct: 1 } },
  { tier: 3, minFame: 500, name: "名满王都", stats: { goldGainPct: 2, xpGainPct: 1, craftSpeedPct: 1 } },
  { tier: 4, minFame: 1000, name: "传奇酒馆", stats: { goldGainPct: 2, xpGainPct: 2, craftSpeedPct: 2, gatherSpeedPct: 1 } },
  {
    tier: 5,
    minFame: 1800,
    name: "诗与远方之馆",
    stats: { goldGainPct: 3, xpGainPct: 2, craftSpeedPct: 2, gatherSpeedPct: 2, bonusHp: 30 },
  },
];

export interface ChronicleMetricDef {
  id: ChronicleMetricId;
  name: string;
  /** 读数来源（存档里已有的真实记录）。 */
  source: string;
}

export const CHRONICLE_METRICS: readonly ChronicleMetricDef[] = [
  { id: "boss_kinds", name: "讨伐过的首领种类", source: "生涯击杀统计" },
  { id: "boss_kills", name: "累计讨伐首领", source: "生涯击杀统计" },
  { id: "relic_surveys", name: "遗迹勘探次数", source: "星界遗迹勘探队" },
  { id: "curator_rank", name: "勘探队等阶", source: "星界遗迹勘探队" },
  { id: "caravan_runs", name: "商队远征完成", source: "远征商队" },
  { id: "derby_trophies", name: "垂钓大赛奖杯", source: "港湾垂钓大赛" },
  { id: "derby_best_tier", name: "最高奖杯段位", source: "港湾垂钓大赛" },
  { id: "aquarium_species", name: "水族馆收藏鱼种", source: "海港水族馆" },
  { id: "academy_graduations", name: "学院结业课程", source: "冒险者学院" },
  { id: "academy_credits", name: "学院四系总学分", source: "冒险者学院" },
  { id: "festival_keepsakes", name: "四季纪念章", source: "四季节庆" },
  { id: "arena_best_rung", name: "竞技场最高梯级", source: "天空竞技场" },
  { id: "arena_wins", name: "竞技场生涯胜场", source: "天空竞技场" },
  { id: "arena_titles", name: "赛季称号", source: "天空竞技场" },
  { id: "beasts_tamed", name: "已驯服契约魔兽", source: "契约魔兽牧场" },
  { id: "beast_top_level", name: "魔兽最高等级", source: "契约魔兽牧场" },
  { id: "ranch_bond_levels", name: "牧场羁绊等级之和", source: "契约魔兽牧场" },
  { id: "chapters_inscribed", name: "已编撰的前六卷", source: "冒险者编年史" },
  { id: "tavern_fame", name: "酒馆名望", source: "吟游诗人酒馆" },
  { id: "prestige_count", name: "转生次数", source: "转生" },
];

export interface ChronicleEntryDef {
  metric: ChronicleMetricId;
  target: number;
  label: string;
}

export interface ChronicleChapterDef {
  id: ChronicleChapterId;
  /** 卷名。 */
  name: string;
  /** 编撰后解锁的称号。 */
  title: string;
  description: string;
  /** 本卷收录的三条真实里程碑（全部达成才能编撰）。 */
  entries: readonly ChronicleEntryDef[];
  /** 编撰后的小幅永久加成。 */
  stats: TavernChronicleStats;
}

export const CHRONICLE_CHAPTERS: readonly ChronicleChapterDef[] = [
  {
    id: "slayer_saga",
    name: "第一卷 · 首领讨伐录",
    title: "首领讨伐者",
    description: "从森林管家到更深处的霸主，每一次讨伐都写进卷首。",
    entries: [
      { metric: "boss_kinds", target: 1, label: "初次讨伐首领" },
      { metric: "boss_kinds", target: 4, label: "讨伐四种首领" },
      { metric: "boss_kills", target: 30, label: "累计讨伐首领 30 次" },
    ],
    stats: { bonusAtk: 6, bonusHp: 30 },
  },
  {
    id: "expedition_journal",
    name: "第二卷 · 星界远征志",
    title: "星界远征家",
    description: "遗迹深处的勘探与商队万里的远征，记下每一段旅程。",
    entries: [
      { metric: "relic_surveys", target: 5, label: "遗迹勘探 5 次" },
      { metric: "curator_rank", target: 2, label: "勘探队晋升第 2 阶" },
      { metric: "caravan_runs", target: 5, label: "商队远征 5 趟" },
    ],
    stats: { gatherSpeedPct: 2, gatherEfficiencyPct: 1 },
  },
  {
    id: "harbor_log",
    name: "第三卷 · 港湾垂钓记",
    title: "港湾钓客",
    description: "垂钓大赛的奖杯与水族馆的鳞光，港湾的风也有了名字。",
    entries: [
      { metric: "derby_trophies", target: 1, label: "赢得垂钓大赛奖杯" },
      { metric: "derby_best_tier", target: 2, label: "捧回白银及以上奖杯" },
      { metric: "aquarium_species", target: 6, label: "水族馆收藏 6 种鱼" },
    ],
    stats: { gatherEfficiencyPct: 2, goldGainPct: 1 },
  },
  {
    id: "academy_annals",
    name: "第四卷 · 学院进修录",
    title: "博学贤者",
    description: "学院的课桌与四季的节庆，学问与欢笑一并装订成册。",
    entries: [
      { metric: "academy_graduations", target: 2, label: "学院结业 2 门课程" },
      { metric: "academy_credits", target: 60, label: "四系总学分 60" },
      { metric: "festival_keepsakes", target: 1, label: "收藏一枚四季纪念章" },
    ],
    stats: { xpGainPct: 2, craftSpeedPct: 1 },
  },
  {
    id: "arena_epic",
    name: "第五卷 · 天空竞技史",
    title: "竞技场名宿",
    description: "云端擂台上的每一次胜负，都由诗人谱成战歌。",
    entries: [
      { metric: "arena_best_rung", target: 5, label: "竞技场攀至第 5 梯" },
      { metric: "arena_wins", target: 10, label: "竞技场生涯 10 胜" },
      { metric: "arena_titles", target: 1, label: "获得一枚赛季称号" },
    ],
    stats: { bonusDef: 4, bonusHp: 40 },
  },
  {
    id: "beast_bond",
    name: "第六卷 · 契约魔兽传",
    title: "万兽之友",
    description: "与契约魔兽同行的日子，被写成牧场边的童谣。",
    entries: [
      { metric: "beasts_tamed", target: 2, label: "驯服 2 只契约魔兽" },
      { metric: "beast_top_level", target: 5, label: "培养一只 Lv.5 魔兽" },
      { metric: "ranch_bond_levels", target: 24, label: "牧场羁绊等级之和 24" },
    ],
    stats: { craftSpeedPct: 2, craftEfficiencyPct: 1 },
  },
  {
    id: "legend_finale",
    name: "终章 · 异世界传奇",
    title: "异世界传奇",
    description: "当六卷俱全、酒馆名满王都、又踏上转生之路，传奇才算落笔。",
    entries: [
      { metric: "chapters_inscribed", target: 6, label: "编撰前六卷" },
      { metric: "tavern_fame", target: 500, label: "酒馆名望 500（名满王都）" },
      { metric: "prestige_count", target: 1, label: "完成一次转生" },
    ],
    stats: { goldGainPct: 2, xpGainPct: 2, bonusAtk: 8, bonusHp: 60 },
  },
];

export function isValidTavernVisitorId(id: unknown): id is TavernVisitorId {
  return typeof id === "string" && (TAVERN_VISITOR_IDS as readonly string[]).includes(id);
}

export function isValidTavernBalladId(id: unknown): id is TavernBalladId {
  return typeof id === "string" && (TAVERN_BALLAD_IDS as readonly string[]).includes(id);
}

export function isValidChronicleChapterId(id: unknown): id is ChronicleChapterId {
  return typeof id === "string" && (CHRONICLE_CHAPTER_IDS as readonly string[]).includes(id);
}

function tavernCleanCount(v: unknown, cap: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.min(cap, Math.floor(n)) : 0;
}

function tavernObj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

export function getTavernVisitorDef(id: TavernVisitorId): TavernVisitorDef {
  return TAVERN_VISITORS.find((v) => v.id === id) || TAVERN_VISITORS[0];
}

export function getTavernBalladDef(id: TavernBalladId): TavernBalladDef {
  return TAVERN_BALLADS.find((b) => b.id === id) || TAVERN_BALLADS[0];
}

export function getChronicleChapterDef(id: ChronicleChapterId): ChronicleChapterDef {
  return CHRONICLE_CHAPTERS.find((c) => c.id === id) || CHRONICLE_CHAPTERS[0];
}

/** 菜单条目（不在菜单上的物品返回 null）。 */
export function getTavernMenuItem(itemId: unknown): TavernMenuItemDef | null {
  return TAVERN_MENU.find((m) => m.itemId === itemId) || null;
}

/** 东八区日序号（1970-01-01 东八区 = 0）。 */
export function tavernDayIndex(now: Date | number): number {
  const ms = typeof now === "number" ? now : now.getTime();
  return Math.floor((ms + TAVERN_TZ_OFFSET_MINUTES * 60_000) / 86_400_000);
}

/** 日序号 → 东八区日期键 YYYY-MM-DD。 */
export function tavernDayKeyFromIndex(index: number): string {
  return new Date(Math.floor(index) * 86_400_000).toISOString().slice(0, 10);
}

export function tavernDayKey(now: Date | number): string {
  return tavernDayKeyFromIndex(tavernDayIndex(now));
}

/** 日期键 → 日序号；非法键返回 null。 */
export function tavernDayIndexFromKey(key: unknown): number | null {
  if (typeof key !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const ms = Date.parse(`${key}T00:00:00.000Z`);
  if (!Number.isFinite(ms)) return null;
  const index = Math.floor(ms / 86_400_000);
  return tavernDayKeyFromIndex(index) === key ? index : null;
}

/** 当前东八区日结束（次日 0 点）的 UTC 毫秒时间戳。 */
export function tavernDayEndsAtMs(now: Date | number): number {
  return (tavernDayIndex(now) + 1) * 86_400_000 - TAVERN_TZ_OFFSET_MINUTES * 60_000;
}

/** 32 位整数混合哈希（来访名单与点单的唯一随机源，纯确定性）。 */
export function tavernHash(a: number, b: number): number {
  let h = (Math.imul((a | 0) ^ 0x2545f491, 0x9e3779b1) + Math.imul((b | 0) + 0x61c88647, 0x85ebca77)) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d) >>> 0;
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39) >>> 0;
  h ^= h >>> 15;
  return h >>> 0;
}

/** 某个东八区日来访的冒险者：以日序号哈希对 8 位常客做确定性洗牌，取前 4 位（同一天全服一致）。 */
export function getTavernVisitorsForDay(dayIndex: number): TavernVisitorId[] {
  const d = Number.isFinite(dayIndex) ? Math.floor(dayIndex) : 0;
  const pool = [...TAVERN_VISITOR_IDS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = tavernHash(d, 0x7a5e + i) % (i + 1);
    const t = pool[i];
    pool[i] = pool[j];
    pool[j] = t;
  }
  return pool.slice(0, TAVERN_VISITORS_PER_DAY);
}

/** 冒险者当日的点单：从其爱吃的料理与爱喝的饮品里各确定性抽一样。 */
export function getTavernVisitorOrder(dayIndex: number, visitorId: TavernVisitorId): { dishId: string; drinkId: string } {
  const d = Number.isFinite(dayIndex) ? Math.floor(dayIndex) : 0;
  const def = getTavernVisitorDef(visitorId);
  const vi = TAVERN_VISITOR_IDS.indexOf(def.id);
  return {
    dishId: def.dishes[tavernHash(d, 0xd150 + vi) % def.dishes.length],
    drinkId: def.drinks[tavernHash(d, 0xd21c + vi) % def.drinks.length],
  };
}

/**
 * 招待计划：端上一份料理和 / 或一份饮品（至少一样）。每项基础名望来自菜单；合当日点单的那项名望 ×1.5（向下取整），
 * 两项都合点单再 +5（完美招待）。小费 = 名望 × 冒险者的每点小费。
 * ok = false：未知冒险者 / 当日未来访 / 不在菜单或种类不符 / 什么都没端。
 */
export function planTavernServe(dayIndex: number, visitorId: unknown, dishId: unknown, drinkId: unknown) {
  const d = Number.isFinite(dayIndex) ? Math.floor(dayIndex) : 0;
  const validVisitor = isValidTavernVisitorId(visitorId);
  const visiting = validVisitor && getTavernVisitorsForDay(d).includes(visitorId);
  const order = validVisitor ? getTavernVisitorOrder(d, visitorId) : null;
  const wantDish = dishId !== null && dishId !== undefined;
  const wantDrink = drinkId !== null && drinkId !== undefined;
  const dish = wantDish ? getTavernMenuItem(dishId) : null;
  const drink = wantDrink ? getTavernMenuItem(drinkId) : null;
  const dishOk = !wantDish || (dish !== null && dish.kind === "dish");
  const drinkOk = !wantDrink || (drink !== null && drink.kind === "drink");
  const ok = validVisitor && visiting && dishOk && drinkOk && (wantDish || wantDrink);
  const matchedDish = ok && dish !== null && order !== null && dish.itemId === order.dishId;
  const matchedDrink = ok && drink !== null && order !== null && drink.itemId === order.drinkId;
  const dishFame = ok && dish ? Math.floor((dish.fame * (matchedDish ? TAVERN_ORDER_MATCH_PCT : 100)) / 100) : 0;
  const drinkFame = ok && drink ? Math.floor((drink.fame * (matchedDrink ? TAVERN_ORDER_MATCH_PCT : 100)) / 100) : 0;
  const perfect = matchedDish && matchedDrink;
  const fame = ok ? dishFame + drinkFame + (perfect ? TAVERN_PERFECT_BONUS_FAME : 0) : 0;
  const tipGold = ok && validVisitor ? fame * getTavernVisitorDef(visitorId).tipPerFame : 0;
  const verdict: "perfect" | "pleased" | "fine" | null = !ok ? null : perfect ? "perfect" : matchedDish || matchedDrink ? "pleased" : "fine";
  return {
    ok,
    visiting,
    order,
    dishId: ok && dish ? dish.itemId : null,
    drinkId: ok && drink ? drink.itemId : null,
    dishFame,
    drinkFame,
    matchedDish,
    matchedDrink,
    perfect,
    fame,
    tipGold,
    verdict,
  };
}

/** 酒馆名望等级：累计名望决定等级、永久加成与可点唱的诗篇（含下一等级进度）。 */
export function getTavernFameTier(fame: unknown) {
  const n = tavernCleanCount(fame, CHRONICLE_METRIC_CAP);
  let current = TAVERN_FAME_TIERS[0];
  let next: TavernFameTierDef | null = null;
  for (let i = 0; i < TAVERN_FAME_TIERS.length; i++) {
    if (n >= TAVERN_FAME_TIERS[i].minFame) {
      current = TAVERN_FAME_TIERS[i];
      next = TAVERN_FAME_TIERS[i + 1] ?? null;
    }
  }
  const progressPct = next
    ? Math.min(100, Math.max(0, Math.round(((n - current.minFame) / Math.max(1, next.minFame - current.minFame)) * 100)))
    : 100;
  return { fame: n, current, next, progressPct };
}

export type MinimalTavernHolder = {
  bardTavern?: {
    fame?: unknown;
    activeBallad?: unknown;
  } | null;
  adventurerChronicle?: {
    inscribed?: unknown;
    equippedTitle?: unknown;
  } | null;
} | null;

/**
 * 正在演唱的诗篇：结束时刻恒为 startedAt + 诗篇时长（不信任存档里的 endsAt）；
 * 只有 startedAt <= now < 结束时刻 时增益生效（离线模拟按结算时刻 now 判定）。
 */
export function getTavernBalladEffect(holder: MinimalTavernHolder | undefined, now: Date | number) {
  const ab = tavernObj(tavernObj(holder?.bardTavern).activeBallad);
  const nowMs = typeof now === "number" ? now : now.getTime();
  const startedMs = typeof ab.startedAt === "string" ? Date.parse(ab.startedAt) : Number.NaN;
  if (!isValidTavernBalladId(ab.balladId) || !Number.isFinite(startedMs)) {
    return { balladId: null as TavernBalladId | null, active: false, startedAtMs: 0, endsAtMs: 0, remainingMs: 0, stats: {} as TavernChronicleStats };
  }
  const def = getTavernBalladDef(ab.balladId);
  const endsAtMs = startedMs + def.durationMin * 60_000;
  const active = nowMs >= startedMs && nowMs < endsAtMs;
  const stats: TavernChronicleStats = {};
  if (active) for (const k of TAVERN_STAT_KEYS) if (def.stats[k]) stats[k] = def.stats[k];
  return { balladId: def.id as TavernBalladId | null, active, startedAtMs: startedMs, endsAtMs, remainingMs: active ? endsAtMs - nowMs : 0, stats };
}

/** 已编撰章节（只认合法章节 id，去重，按章节表顺序）。 */
export function cleanChronicleInscribed(raw: unknown): ChronicleChapterId[] {
  const list = Array.isArray(raw) ? (raw as unknown[]) : [];
  return CHRONICLE_CHAPTER_IDS.filter((id) => list.includes(id));
}

/** 从存档里已有的真实记录读出编年史里程碑（不新增任何计数器；脏数据按 0 处理）。 */
export function getChronicleMetrics(holder: unknown): Record<ChronicleMetricId, number> {
  const h = tavernObj(holder);
  const n = (v: unknown) => tavernCleanCount(v, CHRONICLE_METRIC_CAP);
  const stats = tavernObj(h.stats);
  const kills = tavernObj(stats.killsByMonster);
  let bossKinds = 0;
  let bossKillSum = 0;
  for (const id of CHRONICLE_BOSS_IDS) {
    const k = n(kills[id]);
    if (k > 0) bossKinds += 1;
    bossKillSum += k;
  }
  const relics = tavernObj(h.astralRelics);
  const trophies = tavernObj(tavernObj(h.harborDerby).trophies);
  let derbyTrophies = 0;
  let derbyBestTier = 0;
  CHRONICLE_TROPHY_TIERS.forEach((t, i) => {
    const c = n(trophies[t]);
    derbyTrophies += c;
    if (c > 0) derbyBestTier = i + 1;
  });
  const species = tavernObj(tavernObj(h.harborAquarium).species);
  let aquariumSpecies = 0;
  for (const id of CHRONICLE_AQUARIUM_SPECIES) if (n(tavernObj(species[id]).count) > 0) aquariumSpecies += 1;
  const academy = tavernObj(h.adventurerAcademy);
  const credits = tavernObj(academy.credits);
  let academyCredits = 0;
  for (const dept of CHRONICLE_ACADEMY_DEPTS) academyCredits += n(credits[dept]);
  const keepsakesRaw = tavernObj(h.festivalCalendar).keepsakes;
  const keepsakes = Array.isArray(keepsakesRaw) ? (keepsakesRaw as unknown[]) : [];
  const arena = tavernObj(h.skyArena);
  const titlesRaw = Array.isArray(arena.titles) ? (arena.titles as unknown[]) : [];
  const levels = cleanBeastLevels(tavernObj(h.beastRanch).beasts);
  let beastsTamed = 0;
  let beastTopLevel = 0;
  let bondLevels = 0;
  for (const lv of Object.values(levels)) {
    if (lv > 0) beastsTamed += 1;
    beastTopLevel = Math.max(beastTopLevel, lv);
    bondLevels += lv;
  }
  const inscribed = cleanChronicleInscribed(tavernObj(h.adventurerChronicle).inscribed);
  return {
    boss_kinds: bossKinds,
    boss_kills: Math.min(CHRONICLE_METRIC_CAP, Math.max(n(stats.totalBossKills), bossKillSum)),
    relic_surveys: n(relics.totalSurveys),
    curator_rank: n(relics.curatorRank),
    caravan_runs: n(tavernObj(h.caravanTrade).totalRunsCompleted),
    derby_trophies: Math.min(CHRONICLE_METRIC_CAP, derbyTrophies),
    derby_best_tier: derbyBestTier,
    aquarium_species: aquariumSpecies,
    academy_graduations: n(academy.totalGraduations),
    academy_credits: Math.min(CHRONICLE_METRIC_CAP, academyCredits),
    festival_keepsakes: CHRONICLE_FESTIVAL_SEASONS.filter((s) => keepsakes.includes(s)).length,
    arena_best_rung: n(arena.bestRung),
    arena_wins: n(arena.totalWins),
    arena_titles: CHRONICLE_ARENA_DIVISIONS.filter((t) => titlesRaw.includes(t)).length,
    beasts_tamed: beastsTamed,
    beast_top_level: beastTopLevel,
    ranch_bond_levels: bondLevels,
    chapters_inscribed: inscribed.filter((id) => id !== "legend_finale").length,
    tavern_fame: n(tavernObj(h.bardTavern).fame),
    prestige_count: n(tavernObj(h.prestige).count),
  };
}

/** 编年史汇编：逐卷对照真实里程碑（每条 value / target / done），三条全部达成即可编撰；已编撰的卷永久保留。 */
export function getChronicleProgress(holder: unknown) {
  const metrics = getChronicleMetrics(holder);
  const inscribed = cleanChronicleInscribed(tavernObj(tavernObj(holder).adventurerChronicle).inscribed);
  let entriesDone = 0;
  let entriesTotal = 0;
  let completeCount = 0;
  const chapters = CHRONICLE_CHAPTERS.map((c) => {
    const entries = c.entries.map((e) => {
      const value = metrics[e.metric];
      const done = value >= e.target;
      entriesTotal += 1;
      if (done) entriesDone += 1;
      return {
        metric: e.metric,
        label: e.label,
        target: e.target,
        value,
        done,
        pct: Math.min(100, Math.floor((Math.min(value, e.target) * 100) / Math.max(1, e.target))),
      };
    });
    const complete = entries.every((e) => e.done);
    if (complete) completeCount += 1;
    const isInscribed = inscribed.includes(c.id);
    return { id: c.id, entries, complete, inscribed: isInscribed, canInscribe: complete && !isInscribed };
  });
  return { metrics, chapters, inscribed, inscribedCount: inscribed.length, completeCount, entriesDone, entriesTotal };
}

export interface TavernChronicleBonuses {
  fame: number;
  fameTier: number;
  fameTierName: string;
  fameStats: TavernChronicleStats;
  chaptersInscribed: number;
  chronicleStats: TavernChronicleStats;
  /** 佩戴的编年史称号（章节 id；必须已编撰）。 */
  equippedTitle: ChronicleChapterId | null;
  gatherSpeedPct: number;
  craftSpeedPct: number;
  gatherEfficiencyPct: number;
  craftEfficiencyPct: number;
  xpGainPct: number;
  goldGainPct: number;
  bonusAtk: number;
  bonusDef: number;
  bonusHp: number;
}

/** 吟游诗人酒馆与冒险者编年史的永久加成 = 酒馆名望等级 + 全部已编撰章节（限时诗篇另由 getTavernBalladEffect 按 now 计算）。 */
export function getTavernChronicleBonuses(holder?: MinimalTavernHolder): TavernChronicleBonuses {
  const tier = getTavernFameTier(tavernObj(holder?.bardTavern).fame);
  const ch = tavernObj(holder?.adventurerChronicle);
  const inscribed = cleanChronicleInscribed(ch.inscribed);
  const fameStats: TavernChronicleStats = {};
  const chronicleStats: TavernChronicleStats = {};
  const sum: Required<TavernChronicleStats> = {
    gatherSpeedPct: 0,
    craftSpeedPct: 0,
    gatherEfficiencyPct: 0,
    craftEfficiencyPct: 0,
    xpGainPct: 0,
    goldGainPct: 0,
    bonusAtk: 0,
    bonusDef: 0,
    bonusHp: 0,
  };
  for (const k of TAVERN_STAT_KEYS) {
    const f = tier.current.stats[k] || 0;
    let c = 0;
    for (const id of inscribed) c += getChronicleChapterDef(id).stats[k] || 0;
    if (f) fameStats[k] = f;
    if (c) chronicleStats[k] = c;
    sum[k] = f + c;
  }
  const equippedTitle = isValidChronicleChapterId(ch.equippedTitle) && inscribed.includes(ch.equippedTitle) ? ch.equippedTitle : null;
  return {
    fame: tier.fame,
    fameTier: tier.current.tier,
    fameTierName: tier.current.name,
    fameStats,
    chaptersInscribed: inscribed.length,
    chronicleStats,
    equippedTitle,
    ...sum,
  };
}

/* ---- 以上为 WL-15 core ---- */

function tavernCleanInt(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallback;
}

function tavernIso(v: unknown): string {
  return typeof v === "string" && Number.isFinite(Date.parse(v)) ? v : new Date(0).toISOString();
}

function tavernItemName(contentPack: EnhancedContentPack | undefined, itemId: string): string {
  return ((contentPack?.items as Array<{ id: string; name?: string }> | undefined) || []).find((i) => i.id === itemId)?.name || itemId;
}

function sanitizeTavernServe(raw: unknown): TavernServeRecord | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (!isValidTavernVisitorId(r.visitorId) || tavernDayIndexFromKey(r.dayKey) === null) return null;
  const dish = getTavernMenuItem(r.dishId);
  const drink = getTavernMenuItem(r.drinkId);
  return {
    visitorId: r.visitorId,
    dayKey: r.dayKey as string,
    dishId: dish && dish.kind === "dish" ? dish.itemId : null,
    drinkId: drink && drink.kind === "drink" ? drink.itemId : null,
    matchedDish: r.matchedDish === true,
    matchedDrink: r.matchedDrink === true,
    fame: tavernCleanInt(r.fame, 0),
    tipGold: tavernCleanInt(r.tipGold, 0),
    at: tavernIso(r.at),
  };
}

function sanitizeTavernBallad(raw: unknown): TavernActiveBallad | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (!isValidTavernBalladId(r.balladId) || typeof r.startedAt !== "string") return null;
  const startedMs = Date.parse(r.startedAt);
  if (!Number.isFinite(startedMs)) return null;
  // 结束时刻恒为 startedAt + 诗篇时长（脏档改不长增益）
  return {
    balladId: r.balladId,
    startedAt: new Date(startedMs).toISOString(),
    endsAt: new Date(startedMs + getTavernBalladDef(r.balladId).durationMin * 60_000).toISOString(),
  };
}

/**
 * 确保 bardTavern 存在并净化脏档（旧存档首次打开面板时开张，不赠送任何名望；转生永久保留）。
 * 仅显式传入 now（指令 / 视图时钟）时才会换日：清空当日招待名单与点唱次数；
 * 无参调用（ensurePlayerExtensions / 转生净化）只做净化，绝不按墙钟换日（沿用 WL-10 ~ WL-14 约定）。
 */
export function ensureBardTavern(player: EnhancedPlayerState, now?: Date): BardTavernState {
  const clock = now ?? new Date();
  if (!Array.isArray((player as any).logs)) {
    (player as any).logs = [];
  }
  if (!player.inventory || typeof player.inventory !== "object") {
    player.inventory = { gold: 0 };
  }
  if (!player.bardTavern || typeof player.bardTavern !== "object") {
    player.bardTavern = {
      dayKey: tavernDayKey(clock),
      served: [],
      balladsToday: 0,
      activeBallad: null,
      fame: 0,
      totalServed: 0,
      totalPerfect: 0,
      totalBallads: 0,
      tipsEarned: 0,
      lastServe: null,
    };
  }
  const tv = player.bardTavern;
  if (tavernDayIndexFromKey(tv.dayKey) === null) {
    tv.dayKey = tavernDayKey(clock);
  }
  if (now !== undefined) {
    const cur = tavernDayIndex(clock);
    const stored = tavernDayIndexFromKey(tv.dayKey)!;
    // 只向前换日（时钟回拨不回滚）
    if (cur > stored) {
      tv.dayKey = tavernDayKeyFromIndex(cur);
      tv.served = [];
      tv.balladsToday = 0;
    }
  }
  const today = tavernDayIndexFromKey(tv.dayKey)!;
  const visitors = getTavernVisitorsForDay(today);
  const servedRaw = Array.isArray(tv.served) ? (tv.served as unknown[]) : [];
  // 招待名单只认当日真正来访的冒险者（脏档塞不进别人）
  tv.served = visitors.filter((id) => servedRaw.includes(id));
  tv.balladsToday = Math.min(TAVERN_BALLADS_PER_DAY, tavernCleanInt(tv.balladsToday, 0));
  tv.activeBallad = sanitizeTavernBallad(tv.activeBallad);
  tv.fame = Math.min(CHRONICLE_METRIC_CAP, tavernCleanInt(tv.fame, 0));
  tv.totalServed = Math.max(tv.served.length, tavernCleanInt(tv.totalServed, 0));
  tv.totalPerfect = Math.min(tv.totalServed, tavernCleanInt(tv.totalPerfect, 0));
  tv.totalBallads = Math.max(tv.balladsToday, tavernCleanInt(tv.totalBallads, 0));
  tv.tipsEarned = tavernCleanInt(tv.tipsEarned, 0);
  tv.lastServe = sanitizeTavernServe(tv.lastServe);
  return tv;
}

/** 确保 adventurerChronicle 存在并净化脏档（没有时钟：任何调用都只做净化；称号必须来自已编撰章节）。 */
export function ensureAdventurerChronicle(player: EnhancedPlayerState): AdventurerChronicleState {
  if (!Array.isArray((player as any).logs)) {
    (player as any).logs = [];
  }
  if (!player.adventurerChronicle || typeof player.adventurerChronicle !== "object") {
    player.adventurerChronicle = { inscribed: [], inscribedAt: {}, equippedTitle: null, lastInscription: null };
  }
  const ch = player.adventurerChronicle;
  ch.inscribed = cleanChronicleInscribed(ch.inscribed);
  const atRaw = ch.inscribedAt && typeof ch.inscribedAt === "object" && !Array.isArray(ch.inscribedAt) ? (ch.inscribedAt as Record<string, unknown>) : {};
  const inscribedAt: Partial<Record<ChronicleChapterId, string>> = {};
  for (const id of ch.inscribed) inscribedAt[id] = tavernIso(atRaw[id]);
  ch.inscribedAt = inscribedAt;
  ch.equippedTitle = isValidChronicleChapterId(ch.equippedTitle) && ch.inscribed.includes(ch.equippedTitle) ? ch.equippedTitle : null;
  const last = ch.lastInscription as unknown;
  ch.lastInscription =
    last && typeof last === "object" && isValidChronicleChapterId((last as any).chapterId) && ch.inscribed.includes((last as any).chapterId)
      ? { chapterId: (last as any).chapterId, at: tavernIso((last as any).at) }
      : null;
  return ch;
}

/** 指令内统一推进酒馆时钟（换日）并补齐编年史，保证落库状态与响应视图一致。 */
function ensureTavernChronicleClocks(player: EnhancedPlayerState, now: Date) {
  return { tv: ensureBardTavern(player, now), ch: ensureAdventurerChronicle(player) };
}

/** 招待来访冒险者：端上背包里的真实料理和 / 或饮品，换取酒馆名望与小费（每位冒险者每日 1 次）。 */
export function serveTavernVisitor(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack | undefined,
  visitorId: TavernVisitorId,
  dishId: string | null,
  drinkId: string | null,
  now: Date = new Date(),
  expectedDayKey?: string
): {
  ok: boolean;
  reason?: string;
  visitorId?: TavernVisitorId;
  dishId?: string | null;
  drinkId?: string | null;
  fame?: number;
  tipGold?: number;
  verdict?: "perfect" | "pleased" | "fine";
  matchedDish?: boolean;
  matchedDrink?: boolean;
  fameTotal?: number;
  fameTier?: number;
} {
  ensurePlayerExtensions(player);
  if (!isValidTavernVisitorId(visitorId)) {
    return { ok: false, reason: "未知的冒险者" };
  }
  const { tv } = ensureTavernChronicleClocks(player, now);
  if (expectedDayKey !== undefined && expectedDayKey !== tv.dayKey) {
    return { ok: false, reason: `日期已更替：酒馆今天是 ${tv.dayKey}，请刷新后再试` };
  }
  const def = getTavernVisitorDef(visitorId);
  const today = tavernDayIndexFromKey(tv.dayKey)!;
  if (!getTavernVisitorsForDay(today).includes(visitorId)) {
    return { ok: false, reason: `「${def.title} · ${def.name}」今天没有来酒馆` };
  }
  if (tv.served.includes(visitorId)) {
    return { ok: false, reason: `今天已经招待过「${def.title} · ${def.name}」了` };
  }
  const plan = planTavernServe(today, visitorId, dishId ?? null, drinkId ?? null);
  if (!plan.ok) {
    return { ok: false, reason: dishId == null && drinkId == null ? "请至少端上一份料理或饮品" : "只能端上酒馆菜单里的料理与饮品" };
  }
  for (const itemId of [plan.dishId, plan.drinkId]) {
    if (!itemId) continue;
    const have = Math.floor(Number(player.inventory[itemId] || 0));
    if (have < 1) {
      return { ok: false, reason: `背包里没有「${tavernItemName(contentPack, itemId)}」` };
    }
  }
  const prevTier = getTavernFameTier(tv.fame).current;
  for (const itemId of [plan.dishId, plan.drinkId]) {
    if (!itemId) continue;
    player.inventory[itemId] = Math.floor(Number(player.inventory[itemId] || 0)) - 1;
    if (player.inventory[itemId] <= 0) delete player.inventory[itemId];
  }
  player.inventory.gold = (player.inventory.gold || 0) + plan.tipGold;
  if (player.stats) player.stats.totalGoldEarned = (player.stats.totalGoldEarned || 0) + plan.tipGold;
  tv.fame = Math.min(CHRONICLE_METRIC_CAP, tv.fame + plan.fame);
  tv.served = getTavernVisitorsForDay(today).filter((id) => id === visitorId || tv.served.includes(id));
  tv.totalServed += 1;
  if (plan.perfect) tv.totalPerfect += 1;
  tv.tipsEarned += plan.tipGold;
  tv.lastServe = {
    visitorId,
    dayKey: tv.dayKey,
    dishId: plan.dishId,
    drinkId: plan.drinkId,
    matchedDish: plan.matchedDish,
    matchedDrink: plan.matchedDrink,
    fame: plan.fame,
    tipGold: plan.tipGold,
    at: now.toISOString(),
  };
  const tier = getTavernFameTier(tv.fame).current;
  addReputation(player, plan.perfect ? 3 : plan.matchedDish || plan.matchedDrink ? 2 : 1);
  syncAchievements(player);
  const served = [plan.dishId, plan.drinkId].filter(Boolean).map((id) => tavernItemName(contentPack, id as string)).join(" + ");
  appendLog(
    player,
    `吟游诗人酒馆：为「${def.title} · ${def.name}」端上${served}${
      plan.perfect ? "（完美招待！）" : plan.matchedDish || plan.matchedDrink ? "（合点单）" : ""
    }，酒馆名望 +${plan.fame}，小费 ${plan.tipGold} 金币。`
  );
  if (tier.tier > prevTier.tier) {
    appendLog(player, `酒馆名望晋升「${tier.name}」！`);
  }
  return {
    ok: true,
    visitorId,
    dishId: plan.dishId,
    drinkId: plan.drinkId,
    fame: plan.fame,
    tipGold: plan.tipGold,
    verdict: plan.verdict!,
    matchedDish: plan.matchedDish,
    matchedDrink: plan.matchedDrink,
    fameTotal: tv.fame,
    fameTier: tier.tier,
  };
}

/** 点唱吟游诗篇：花金币获得名望与限时增益（名望等级解锁诗篇；每日 3 次；同一时间只演唱一首）。 */
export function requestBardBallad(
  player: EnhancedPlayerState,
  balladId: TavernBalladId,
  now: Date = new Date(),
  expectedDayKey?: string
): {
  ok: boolean;
  reason?: string;
  balladId?: TavernBalladId;
  endsAt?: string;
  fameGained?: number;
  spentGold?: number;
  fameTotal?: number;
} {
  ensurePlayerExtensions(player);
  if (!isValidTavernBalladId(balladId)) {
    return { ok: false, reason: "未知的诗篇" };
  }
  const { tv } = ensureTavernChronicleClocks(player, now);
  if (expectedDayKey !== undefined && expectedDayKey !== tv.dayKey) {
    return { ok: false, reason: `日期已更替：酒馆今天是 ${tv.dayKey}，请刷新后再试` };
  }
  const def = getTavernBalladDef(balladId);
  const tier = getTavernFameTier(tv.fame).current;
  if (tier.tier < def.minFameTier) {
    const need = TAVERN_FAME_TIERS[def.minFameTier];
    return { ok: false, reason: `「${def.name}」需酒馆名望达到「${need.name}」（${need.minFame}）` };
  }
  if (tv.balladsToday >= TAVERN_BALLADS_PER_DAY) {
    return { ok: false, reason: `今天的诗篇已点满 ${TAVERN_BALLADS_PER_DAY} 首，诗人明天再来` };
  }
  const fx = getTavernBalladEffect(player, now);
  if (fx.active && fx.balladId) {
    return {
      ok: false,
      reason: `诗人正在演唱「${getTavernBalladDef(fx.balladId).name}」，还剩 ${Math.ceil(fx.remainingMs / 60_000)} 分钟`,
    };
  }
  if ((player.inventory.gold || 0) < def.costGold) {
    return { ok: false, reason: `金币不足：点唱「${def.name}」需 ${def.costGold} 金币` };
  }
  player.inventory.gold = (player.inventory.gold || 0) - def.costGold;
  if (player.stats) player.stats.totalGoldSpent = (player.stats.totalGoldSpent || 0) + def.costGold;
  const endsAt = new Date(now.getTime() + def.durationMin * 60_000).toISOString();
  tv.activeBallad = { balladId, startedAt: now.toISOString(), endsAt };
  tv.balladsToday += 1;
  tv.totalBallads += 1;
  tv.fame = Math.min(CHRONICLE_METRIC_CAP, tv.fame + def.fame);
  const nextTier = getTavernFameTier(tv.fame).current;
  addReputation(player, 1);
  syncAchievements(player);
  appendLog(player, `吟游诗人开始演唱「${def.name}」（${def.durationMin} 分钟），酒馆名望 +${def.fame}。`);
  if (nextTier.tier > tier.tier) {
    appendLog(player, `酒馆名望晋升「${nextTier.name}」！`);
  }
  return { ok: true, balladId, endsAt, fameGained: def.fame, spentGold: def.costGold, fameTotal: tv.fame };
}

/** 编撰编年史章节：服务端按存档里的真实里程碑校验三条全部达成；编撰后解锁称号与小幅永久加成（首卷自动佩戴称号）。 */
export function inscribeChronicleChapter(
  player: EnhancedPlayerState,
  chapterId: ChronicleChapterId,
  now: Date = new Date()
): { ok: boolean; reason?: string; chapterId?: ChronicleChapterId; title?: string; autoEquipped?: boolean; chaptersInscribed?: number } {
  ensurePlayerExtensions(player);
  if (!isValidChronicleChapterId(chapterId)) {
    return { ok: false, reason: "未知的编年史章节" };
  }
  const { ch } = ensureTavernChronicleClocks(player, now);
  const def = getChronicleChapterDef(chapterId);
  if (ch.inscribed.includes(chapterId)) {
    return { ok: false, reason: `「${def.name}」已编撰` };
  }
  const progress = getChronicleProgress(player).chapters.find((c) => c.id === chapterId)!;
  const missing = progress.entries.find((e) => !e.done);
  if (missing) {
    return { ok: false, reason: `「${def.name}」尚未完成：${missing.label}（当前 ${missing.value} / ${missing.target}）` };
  }
  ch.inscribed = cleanChronicleInscribed([...ch.inscribed, chapterId]);
  ch.inscribedAt = { ...ch.inscribedAt, [chapterId]: now.toISOString() };
  ch.lastInscription = { chapterId, at: now.toISOString() };
  const autoEquipped = ch.equippedTitle === null;
  if (autoEquipped) ch.equippedTitle = chapterId;
  addReputation(player, 10);
  syncAchievements(player);
  appendLog(player, `冒险者编年史：编撰「${def.name}」，解锁称号「${def.title}」${autoEquipped ? "并佩戴" : ""}！`);
  return { ok: true, chapterId, title: def.title, autoEquipped, chaptersInscribed: ch.inscribed.length };
}

/** 佩戴 / 取下编年史称号（只能佩戴已编撰章节的称号）。 */
export function equipChronicleTitle(
  player: EnhancedPlayerState,
  chapterId: ChronicleChapterId | null,
  now: Date = new Date()
): { ok: boolean; reason?: string; equippedTitle?: ChronicleChapterId | null } {
  ensurePlayerExtensions(player);
  if (chapterId !== null && !isValidChronicleChapterId(chapterId)) {
    return { ok: false, reason: "未知的编年史章节" };
  }
  const { ch } = ensureTavernChronicleClocks(player, now);
  if (chapterId === null) {
    if (!ch.equippedTitle) return { ok: false, reason: "当前没有佩戴编年史称号" };
    const prev = getChronicleChapterDef(ch.equippedTitle);
    ch.equippedTitle = null;
    appendLog(player, `取下编年史称号「${prev.title}」。`);
    return { ok: true, equippedTitle: null };
  }
  const def = getChronicleChapterDef(chapterId);
  if (!ch.inscribed.includes(chapterId)) return { ok: false, reason: `尚未编撰「${def.name}」，无法佩戴「${def.title}」` };
  if (ch.equippedTitle === chapterId) return { ok: false, reason: `已佩戴「${def.title}」` };
  ch.equippedTitle = chapterId;
  appendLog(player, `佩戴编年史称号「${def.title}」。`);
  return { ok: true, equippedTitle: chapterId };
}

/** 构造前端「吟游诗人酒馆 & 冒险者编年史」面板视图（会补齐两份状态，并按显式 now 换日）。 */
export function getTavernChronicleInfo(player: EnhancedPlayerState, contentPack?: EnhancedContentPack, now: Date = new Date()) {
  ensurePlayerExtensions(player);
  const { tv, ch } = ensureTavernChronicleClocks(player, now);
  const nowMs = now.getTime();
  const itemName = (id: string) => tavernItemName(contentPack, id);
  const have = (id: string) => Math.floor(Number(player.inventory[id] || 0));
  const gold = Math.floor(Number(player.inventory.gold || 0));
  const today = tavernDayIndexFromKey(tv.dayKey)!;
  const fameTier = getTavernFameTier(tv.fame);
  const bonuses = getTavernChronicleBonuses(player);
  const ballad = getTavernBalladEffect(player, now);
  const menuView = (itemId: string) => {
    const m = getTavernMenuItem(itemId)!;
    return { itemId, name: itemName(itemId), kind: m.kind, fame: m.fame, have: have(itemId) };
  };

  const visitors = getTavernVisitorsForDay(today).map((id) => {
    const v = getTavernVisitorDef(id);
    const order = getTavernVisitorOrder(today, id);
    const served = tv.served.includes(id);
    const record = served && tv.lastServe && tv.lastServe.visitorId === id && tv.lastServe.dayKey === tv.dayKey ? tv.lastServe : null;
    return {
      id,
      name: v.name,
      title: v.title,
      avatarId: v.avatarId,
      quote: v.quote,
      tipPerFame: v.tipPerFame,
      order: { dish: menuView(order.dishId), drink: menuView(order.drinkId) },
      likes: { dishes: v.dishes.map((d) => itemName(d)), drinks: v.drinks.map((d) => itemName(d)) },
      perfectFame: planTavernServe(today, id, order.dishId, order.drinkId).fame,
      served,
      record: record
        ? {
            ...record,
            dishName: record.dishId ? itemName(record.dishId) : null,
            drinkName: record.drinkId ? itemName(record.drinkId) : null,
          }
        : null,
    };
  });
  const tomorrowVisitors = getTavernVisitorsForDay(today + 1).map((id) => {
    const v = getTavernVisitorDef(id);
    return { id, name: v.name, title: v.title, avatarId: v.avatarId };
  });
  const ballads = TAVERN_BALLADS.map((b) => {
    const unlocked = fameTier.current.tier >= b.minFameTier;
    let block: string | null = null;
    if (!unlocked) block = `需「${TAVERN_FAME_TIERS[b.minFameTier].name}」`;
    else if (ballad.active) block = "诗人演唱中";
    else if (tv.balladsToday >= TAVERN_BALLADS_PER_DAY) block = "今日已点满";
    else if (gold < b.costGold) block = "金币不足";
    return {
      id: b.id,
      name: b.name,
      description: b.description,
      minFameTier: b.minFameTier,
      minFameName: TAVERN_FAME_TIERS[b.minFameTier].name,
      costGold: b.costGold,
      durationMin: b.durationMin,
      fame: b.fame,
      stats: b.stats,
      unlocked,
      canRequest: block === null,
      block,
    };
  });

  const progress = getChronicleProgress(player);
  const metricDef = (id: ChronicleMetricId) => CHRONICLE_METRICS.find((m) => m.id === id)!;
  const chapters = progress.chapters.map((c) => {
    const def = getChronicleChapterDef(c.id);
    return {
      id: c.id,
      name: def.name,
      title: def.title,
      description: def.description,
      stats: def.stats,
      entries: c.entries.map((e) => ({ ...e, metricName: metricDef(e.metric).name, source: metricDef(e.metric).source })),
      complete: c.complete,
      inscribed: c.inscribed,
      inscribedAt: ch.inscribedAt[c.id] ?? null,
      canInscribe: c.canInscribe,
      equipped: ch.equippedTitle === c.id,
    };
  });
  const equippedDef = ch.equippedTitle ? getChronicleChapterDef(ch.equippedTitle) : null;

  return {
    nowMs,
    bonuses,
    ballad: {
      ...ballad,
      name: ballad.balladId ? getTavernBalladDef(ballad.balladId).name : null,
    },
    tavern: {
      dayKey: tv.dayKey,
      dayEndsAtMs: (today + 1) * 86_400_000 - TAVERN_TZ_OFFSET_MINUTES * 60_000,
      visitors,
      tomorrowVisitors,
      servedToday: tv.served.length,
      visitorsPerDay: TAVERN_VISITORS_PER_DAY,
      menu: TAVERN_MENU.map((m) => menuView(m.itemId)),
      matchPct: TAVERN_ORDER_MATCH_PCT,
      perfectBonus: TAVERN_PERFECT_BONUS_FAME,
      ballads,
      balladsToday: tv.balladsToday,
      balladsPerDay: TAVERN_BALLADS_PER_DAY,
      fame: {
        total: fameTier.fame,
        tier: fameTier.current.tier,
        name: fameTier.current.name,
        stats: fameTier.current.stats,
        next: fameTier.next ? { tier: fameTier.next.tier, name: fameTier.next.name, minFame: fameTier.next.minFame, stats: fameTier.next.stats } : null,
        progressPct: fameTier.progressPct,
        tiers: TAVERN_FAME_TIERS.filter((t) => t.tier > 0).map((t) => ({
          tier: t.tier,
          name: t.name,
          minFame: t.minFame,
          stats: t.stats,
          reached: fameTier.fame >= t.minFame,
        })),
      },
      gold,
      totalServed: tv.totalServed,
      totalPerfect: tv.totalPerfect,
      totalBallads: tv.totalBallads,
      tipsEarned: tv.tipsEarned,
    },
    chronicle: {
      chapters,
      inscribedCount: progress.inscribedCount,
      completeCount: progress.completeCount,
      chapterCount: CHRONICLE_CHAPTERS.length,
      entriesDone: progress.entriesDone,
      entriesTotal: progress.entriesTotal,
      equippedTitle: ch.equippedTitle,
      equippedTitleName: equippedDef ? equippedDef.title : null,
      lastInscription: ch.lastInscription
        ? { ...ch.lastInscription, name: getChronicleChapterDef(ch.lastInscription.chapterId).name }
        : null,
    },
  };
}

/* ============================ 浮空飞艇商路 & 圣骑士团荣誉试炼 (WL-16) ============================ */
// 前端 frontend/src/gameplay/airshipPaladin.ts 逐表逐式 1:1 镜像（scripts/airship-paladin-parity.test.ts 守护，
// 「WL-16 core」区段两端逐字一致）。
// - 浮空飞艇商路（转生永久保留，货舱清空）：在既有城镇（WL-13 公会城镇 + WL-7 远征商队的凛风冰港 / 赤砂绿洲 / 星坠秘塔）
//   之间开辟 6 条双向航线；8 种特产都是内容包真实物品（基准价 = 物品 value），产地按东八区日序号哈希定出售价（80%~92%），
//   外地按需求基准 ±25% 定收购价，每种每日 40 件存货。航线随载货航程积累经验升到 Lv.5（提速 + 收购价加成），
//   船体用金币 + 真实生活职业成品升到 5 级（货舱 20→76 件、航程 -20%）。换日与抵港只在显式传入 now 时发生。
// - 圣骑士团荣誉试炼（转生永久保留）：东八区自然周轮换四种誓约与六关幻影（真实怪物的战斗属性 × 本周誓约倍率，
//   终关试炼官带内容包首领机制），直接用 WL-13 竞技场同一沙盒跑 hp_combat 真实战斗结算；首通领荣誉勋章，
//   勋章升四项誓言（各 5 阶），永久加成逐项封顶（攻 15 / 防 10 / 血 150 / 金币 5% / 经验 5%），接入
//   playerBuildExtras / combinedBuildFromState 与 getActionRates。

/* ---- 以下为与后端逐字对称的表与纯函数（WL-16 core） ---- */

export const AIRSHIP_TOWN_IDS: readonly AirshipTownId[] = ["guild_town", "frostport", "emberoasis", "starfallspire"];

export const AIRSHIP_GOOD_IDS: readonly AirshipGoodId[] = [
  "cheese_wheel",
  "dyed_cloth",
  "fish_deepsea",
  "snow_pelt",
  "ingot_4",
  "obsidian_chunk",
  "crystal_4",
  "tea_spirit",
];

export const AIRSHIP_ROUTE_IDS: readonly AirshipRouteId[] = [
  "guild_frostport",
  "guild_emberoasis",
  "guild_starfall",
  "frost_ember",
  "ember_starfall",
  "starfall_frost",
];

export const PALADIN_VIRTUE_IDS: readonly PaladinVirtueId[] = ["valor", "aegis", "vigor", "glory"];

export const PALADIN_THEME_IDS: readonly PaladinThemeId[] = ["bulwark", "blade", "radiance", "gale"];

/** 飞艇集市按东八区日期（每日 0 点）换行情、补货。 */
export const AIRSHIP_TZ_OFFSET_MINUTES = 480;
/** 每种特产每个东八区日在产地的存货（件）。 */
export const AIRSHIP_DAILY_STOCK = 40;
/** 单笔买卖的件数上限。 */
export const AIRSHIP_MAX_TRADE_QTY = 999;
/** 产地出售价：基准价的 80% ~ 92%（按日浮动）。 */
export const AIRSHIP_BUY_MIN_PCT = 80;
export const AIRSHIP_BUY_SWING_PCT = 12;
/** 外地收购价围绕需求基准上下浮动的幅度（百分点）。 */
export const AIRSHIP_SELL_SWING_PCT = 25;
/** 计数器上限（防脏档溢出）。 */
export const AIRSHIP_COUNTER_CAP = 1_000_000_000;
/** 一趟载货航程计入航线经验时最多按 100 件货计。 */
export const AIRSHIP_XP_CARGO_CAP = 100;
/** 船体与航线提速合计后，航程最少保留基准时长的 40%。 */
export const AIRSHIP_MIN_DURATION_PCT = 40;

/** 荣誉试炼按东八区自然周（周一 0 点）轮换。 */
export const PALADIN_TZ_OFFSET_MINUTES = 480;
export const PALADIN_WEEK_MS = 7 * 86_400_000;
/** 1970-01-05（周一）为第 0 周。 */
export const PALADIN_WEEK_EPOCH_MS = Date.UTC(1970, 0, 5);
/** 每周挑战次数（胜负都消耗 1 次）。 */
export const PALADIN_WEEKLY_ATTEMPTS = 10;
/** 试炼对决上限 10 分钟（与天空竞技场同一沙盒规则），超时判负。 */
export const PALADIN_MAX_FIGHT_MS = 600_000;
/** 一周内六关全通的额外荣誉勋章。 */
export const PALADIN_FULL_CLEAR_BONUS = 10;
export const PALADIN_MEDAL_CAP = 99_999;
export const PALADIN_VIRTUE_MAX_RANK = 5;
/** 誓言升到第 n 阶花费的荣誉勋章（下标 n-1）。 */
export const PALADIN_VIRTUE_COSTS: readonly number[] = [6, 12, 20, 30, 45];

export interface AirshipTownDef {
  id: AirshipTownId;
  name: string;
  /** 城镇美术：复用 WL-13 公会城镇与 WL-7 远征商队航路的真实图标（skills/<artId>）。 */
  artId: string;
  /** 城镇出处（既有系统）。 */
  source: string;
  description: string;
}

export const AIRSHIP_TOWNS: readonly AirshipTownDef[] = [
  {
    id: "guild_town",
    name: "公会城镇",
    artId: "guild_town",
    source: "天空竞技场与公会城镇",
    description: "你亲手建起的公会城镇，飞艇船坞就挨着集市广场，乳酪与染布是这里的招牌。",
  },
  {
    id: "frostport",
    name: "极北凛风冰港",
    artId: "caravan_route_frostport",
    source: "远征商队 · 凛风冰港航路",
    description: "冰封船坞终年寒风，深海鱼与雪兽厚皮最出名，也最缺热乎的乳酪与金锭。",
  },
  {
    id: "emberoasis",
    name: "炎阳赤砂绿洲",
    artId: "caravan_route_emberoasis",
    source: "远征商队 · 赤砂绿洲航路",
    description: "大漠矿道里出金锭与黑曜石块，商驿高价收购清凉的鱼鲜与各色布匹。",
  },
  {
    id: "starfallspire",
    name: "云巅星坠秘塔",
    artId: "caravan_route_starfallspire",
    source: "远征商队 · 星坠秘塔航路",
    description: "星象法师塔产炽光水晶与灵茶，塔里的学者愿为黑曜石与雪兽厚皮掏出重金。",
  },
];

export interface AirshipGoodDef {
  /** 内容包真实物品 id（图标即物品美术）。 */
  id: AirshipGoodId;
  /** 产地（只有产地出售，产地不收购）。 */
  origin: AirshipTownId;
  /** 基准价 = 内容包物品 value。 */
  basePrice: number;
  /** 需要的船体等级（贵重货物要更结实的货舱）。 */
  minHull: number;
  /** 外地城镇的收购需求基准（百分比，按日 ±25 浮动）。 */
  demand: Partial<Record<AirshipTownId, number>>;
}

export const AIRSHIP_GOODS: readonly AirshipGoodDef[] = [
  { id: "cheese_wheel", origin: "guild_town", basePrice: 28, minHull: 1, demand: { frostport: 150, emberoasis: 135, starfallspire: 120 } },
  { id: "dyed_cloth", origin: "guild_town", basePrice: 35, minHull: 1, demand: { frostport: 120, emberoasis: 145, starfallspire: 135 } },
  { id: "fish_deepsea", origin: "frostport", basePrice: 87, minHull: 1, demand: { guild_town: 125, emberoasis: 155, starfallspire: 130 } },
  { id: "snow_pelt", origin: "frostport", basePrice: 104, minHull: 2, demand: { guild_town: 130, emberoasis: 115, starfallspire: 150 } },
  { id: "ingot_4", origin: "emberoasis", basePrice: 55, minHull: 1, demand: { guild_town: 135, frostport: 145, starfallspire: 120 } },
  { id: "obsidian_chunk", origin: "emberoasis", basePrice: 198, minHull: 3, demand: { guild_town: 120, frostport: 135, starfallspire: 150 } },
  { id: "crystal_4", origin: "starfallspire", basePrice: 55, minHull: 1, demand: { guild_town: 140, frostport: 130, emberoasis: 125 } },
  { id: "tea_spirit", origin: "starfallspire", basePrice: 60, minHull: 2, demand: { guild_town: 145, frostport: 150, emberoasis: 120 } },
];

export interface AirshipHullDef {
  level: number;
  name: string;
  /** 货舱容量（件）。 */
  capacity: number;
  /** 航程缩短（百分点）。 */
  speedPct: number;
  /** 升到该级的金币花费（1 级为初始船体）。 */
  costGold: number;
  /** 升到该级消耗的真实生活职业成品。 */
  materials: Record<string, number>;
}

export const AIRSHIP_HULLS: readonly AirshipHullDef[] = [
  { level: 1, name: "轻木飞艇", capacity: 20, speedPct: 0, costGold: 0, materials: {} },
  { level: 2, name: "加固木骨飞艇", capacity: 32, speedPct: 5, costGold: 1500, materials: { lumber_3: 20, ingot_2: 12 } },
  { level: 3, name: "银铆远航飞艇", capacity: 46, speedPct: 10, costGold: 4000, materials: { lumber_4: 20, ingot_3: 15, yarn_3: 10 } },
  { level: 4, name: "金帆巡天飞艇", capacity: 60, speedPct: 15, costGold: 9000, materials: { lumber_5: 20, ingot_4: 15, crystal_4: 10 } },
  { level: 5, name: "星辉旗舰飞艇", capacity: 76, speedPct: 20, costGold: 18000, materials: { lumber_6: 20, ingot_5: 18, crystal_5: 12 } },
];

export interface AirshipRouteDef {
  id: AirshipRouteId;
  name: string;
  /** 航线两端的既有城镇（双向通航）。 */
  from: AirshipTownId;
  to: AirshipTownId;
  /** 基准航程（分钟）。 */
  baseMinutes: number;
  /** 开辟航线的金币花费。 */
  openCost: number;
  /** 开辟所需的船体等级。 */
  minHull: number;
  description: string;
}

export const AIRSHIP_ROUTES: readonly AirshipRouteDef[] = [
  {
    id: "guild_frostport",
    name: "北境冰港航线",
    from: "guild_town",
    to: "frostport",
    baseMinutes: 20,
    openCost: 300,
    minHull: 1,
    description: "沿着远征商队的北上旧道升空，云层下就是凛风冰港的灯塔。",
  },
  {
    id: "guild_emberoasis",
    name: "赤砂绿洲航线",
    from: "guild_town",
    to: "emberoasis",
    baseMinutes: 25,
    openCost: 600,
    minHull: 1,
    description: "越过赤色沙海的热气流，绿洲商驿的风铃远远就能听见。",
  },
  {
    id: "guild_starfall",
    name: "星坠云海航线",
    from: "guild_town",
    to: "starfallspire",
    baseMinutes: 30,
    openCost: 900,
    minHull: 1,
    description: "一路爬升穿过云海，星坠秘塔的塔尖就浮在云上。",
  },
  {
    id: "frost_ember",
    name: "冰火长风航线",
    from: "frostport",
    to: "emberoasis",
    baseMinutes: 35,
    openCost: 2500,
    minHull: 2,
    description: "从寒港直下大漠的长风航道，温差剧烈，需要加固过的船体。",
  },
  {
    id: "ember_starfall",
    name: "熔金星路航线",
    from: "emberoasis",
    to: "starfallspire",
    baseMinutes: 35,
    openCost: 3500,
    minHull: 3,
    description: "沿着熔金色的晚霞爬升到星坠秘塔，银铆船体才扛得住高空乱流。",
  },
  {
    id: "starfall_frost",
    name: "极光天穹航线",
    from: "starfallspire",
    to: "frostport",
    baseMinutes: 40,
    openCost: 5000,
    minHull: 4,
    description: "在极光里穿行的最高航道，只有金帆巡天飞艇敢走。",
  },
];

export interface AirshipRouteLevelDef {
  level: number;
  /** 累计航线经验达到该值即升级（每趟载货航程 1 + 每 10 件货 1 点）。 */
  minXp: number;
  /** 航程缩短（百分点）。 */
  speedPct: number;
  /** 经此航线抵港后，在该港卖货的收购价加成（百分比）。 */
  sellBonusPct: number;
}

export const AIRSHIP_ROUTE_LEVELS: readonly AirshipRouteLevelDef[] = [
  { level: 1, minXp: 0, speedPct: 0, sellBonusPct: 0 },
  { level: 2, minXp: 6, speedPct: 4, sellBonusPct: 2 },
  { level: 3, minXp: 18, speedPct: 8, sellBonusPct: 4 },
  { level: 4, minXp: 40, speedPct: 12, sellBonusPct: 6 },
  { level: 5, minXp: 75, speedPct: 16, sellBonusPct: 8 },
];

export interface PaladinStats {
  bonusAtk?: number;
  bonusDef?: number;
  bonusHp?: number;
  goldGainPct?: number;
  xpGainPct?: number;
}

export const PALADIN_STAT_KEYS: readonly (keyof PaladinStats)[] = ["bonusAtk", "bonusDef", "bonusHp", "goldGainPct", "xpGainPct"];

/** 荣誉试炼永久加成封顶（四项誓言满阶恰好到顶；脏档再高也不会超过）。 */
export const PALADIN_BONUS_CAPS: Required<PaladinStats> = { bonusAtk: 15, bonusDef: 10, bonusHp: 150, goldGainPct: 5, xpGainPct: 5 };

export interface PaladinFoeDef {
  /** 内容包真实怪物 id（立绘即怪物美术）。 */
  monsterId: string;
  name: string;
  /** 以下战斗属性逐项取自内容包怪物（parity 测试守护）。 */
  level: number;
  hp: number;
  atk: number;
  def: number;
  attackIntervalMs: number;
}

/** 圣骑士团以幻术重现的魔物（真实怪物的战斗属性）。 */
export const PALADIN_FOES: readonly PaladinFoeDef[] = [
  { monsterId: "ore_rat", name: "矿石鼠", level: 15, hp: 313, atk: 18, def: 7, attackIntervalMs: 1500 },
  { monsterId: "magma_worm", name: "岩浆虫", level: 17, hp: 370, atk: 33, def: 13, attackIntervalMs: 3400 },
  { monsterId: "iron_spider", name: "钢铁蜘蛛", level: 18, hp: 462, atk: 24, def: 12, attackIntervalMs: 2400 },
  { monsterId: "swamp_zombie", name: "沼泽僵尸", level: 23, hp: 336, atk: 27, def: 36, attackIntervalMs: 3000 },
  { monsterId: "mud_elemental", name: "泥浆元素", level: 25, hp: 600, atk: 31, def: 21, attackIntervalMs: 3200 },
  { monsterId: "ice_golem", name: "寒冰傀儡", level: 37, hp: 622, atk: 64, def: 52, attackIntervalMs: 3000 },
  { monsterId: "snow_harpy", name: "雪羽鹰身女妖", level: 40, hp: 1085, atk: 68, def: 31, attackIntervalMs: 3400 },
  { monsterId: "frozen_knight", name: "冰封骑士", level: 42, hp: 1352, atk: 50, def: 30, attackIntervalMs: 2400 },
  { monsterId: "yeti", name: "暴雪雪人", level: 44, hp: 1053, atk: 62, def: 69, attackIntervalMs: 3000 },
  { monsterId: "flame_wraith", name: "烈焰怨灵", level: 57, hp: 2434, atk: 97, def: 57, attackIntervalMs: 3400 },
  { monsterId: "inferno_drake", name: "炼狱火龙", level: 59, hp: 1917, atk: 93, def: 114, attackIntervalMs: 3000 },
  { monsterId: "void_specter", name: "虚空幽魂", level: 64, hp: 1879, atk: 115, def: 61, attackIntervalMs: 3400 },
  { monsterId: "dread_knight", name: "恐惧骑士", level: 67, hp: 2538, atk: 106, def: 58, attackIntervalMs: 2400 },
  { monsterId: "sky_guardian", name: "天穹守卫", level: 79, hp: 3142, atk: 135, def: 80, attackIntervalMs: 2400 },
  { monsterId: "seraph_sentinel", name: "炽天哨兵", level: 85, hp: 3519, atk: 157, def: 199, attackIntervalMs: 3000 },
  { monsterId: "divine_colossus", name: "神圣巨像", level: 87, hp: 5769, atk: 179, def: 113, attackIntervalMs: 3400 },
  { monsterId: "archon", name: "执政天神", level: 89, hp: 6638, atk: 193, def: 120, attackIntervalMs: 3200 },
  { monsterId: "soul_reaper", name: "噬魂收割者", level: 111, hp: 6358, atk: 246, def: 150, attackIntervalMs: 3400 },
  { monsterId: "lava_titan", name: "熔岩泰坦", level: 114, hp: 5599, atk: 230, def: 296, attackIntervalMs: 3000 },
  { monsterId: "infernal_dragon", name: "炼狱魔龙", level: 116, hp: 8747, atk: 260, def: 166, attackIntervalMs: 3400 },
  { monsterId: "hell_sovereign", name: "地狱亲王", level: 120, hp: 8208, atk: 245, def: 353, attackIntervalMs: 3000 },
  { monsterId: "astral_judge", name: "星界审判者", level: 133, hp: 12353, atk: 264, def: 169, attackIntervalMs: 2400 },
  { monsterId: "demigod", name: "半神祭司", level: 134, hp: 13115, atk: 310, def: 202, attackIntervalMs: 3400 },
  { monsterId: "genesis_herald", name: "创世先知", level: 135, hp: 14399, atk: 313, def: 210, attackIntervalMs: 3400 },
];

export interface PaladinStageDef {
  stage: number;
  name: string;
  /** 本关幻影的候选魔物（每周按周序号哈希抽一只）。 */
  pool: readonly string[];
  /** 本周首次通关获得的荣誉勋章。 */
  medals: number;
  /** 生命倍率（百分比；终关试炼官额外加厚）。 */
  hpPct: number;
  /** 终关为首领判定，并带上本周誓约的内容包首领机制。 */
  boss: boolean;
}

export const PALADIN_STAGES: readonly PaladinStageDef[] = [
  { stage: 1, name: "见习之试", pool: ["ore_rat", "magma_worm", "iron_spider", "swamp_zombie", "mud_elemental"], medals: 3, hpPct: 100, boss: false },
  { stage: 2, name: "侍从之试", pool: ["ice_golem", "snow_harpy", "frozen_knight", "yeti"], medals: 4, hpPct: 100, boss: false },
  { stage: 3, name: "骑士之试", pool: ["flame_wraith", "inferno_drake", "void_specter", "dread_knight"], medals: 6, hpPct: 100, boss: false },
  { stage: 4, name: "圣殿之试", pool: ["sky_guardian", "seraph_sentinel", "divine_colossus", "archon"], medals: 8, hpPct: 100, boss: false },
  { stage: 5, name: "誓约之试", pool: ["soul_reaper", "lava_titan", "infernal_dragon", "hell_sovereign"], medals: 11, hpPct: 100, boss: false },
  { stage: 6, name: "圣骑士长之试", pool: ["astral_judge", "demigod", "genesis_herald"], medals: 15, hpPct: 130, boss: true },
];

export interface PaladinThemeDef {
  id: PaladinThemeId;
  name: string;
  /** 幻影名前缀。 */
  prefix: string;
  description: string;
  /** 本周幻影的属性倍率（百分比，整数运算两端一致）。 */
  hpPct: number;
  atkPct: number;
  defPct: number;
  intervalPct: number;
  /** 终关试炼官带上的内容包首领机制。 */
  mechanics: readonly string[];
}

export const PALADIN_THEMES: readonly PaladinThemeDef[] = [
  {
    id: "bulwark",
    name: "坚盾之周",
    prefix: "坚盾",
    description: "幻影披上圣骑士团的塔盾，防御 +25%；试炼官血量六成时举盾格挡，重劈可破。",
    hpPct: 100,
    atkPct: 100,
    defPct: 125,
    intervalPct: 100,
    mechanics: ["guard_60"],
  },
  {
    id: "blade",
    name: "烈刃之周",
    prefix: "烈刃",
    description: "幻影的兵刃燃起圣火，攻击 +15%；试炼官三成血时进入狂怒。",
    hpPct: 100,
    atkPct: 115,
    defPct: 100,
    intervalPct: 100,
    mechanics: ["nature_wrath_30"],
  },
  {
    id: "radiance",
    name: "圣光之周",
    prefix: "圣光",
    description: "圣光加护幻影，生命 +20%；试炼官每 15 秒展开六翼神盾。",
    hpPct: 120,
    atkPct: 100,
    defPct: 100,
    intervalPct: 100,
    mechanics: ["seraph_aegis_15s"],
  },
  {
    id: "gale",
    name: "疾风之周",
    prefix: "疾风",
    description: "疾风祝福让幻影出手更快，攻击间隔 -12%；试炼官四成血时开启时间加速领域。",
    hpPct: 100,
    atkPct: 100,
    defPct: 100,
    intervalPct: 88,
    mechanics: ["chrono_haste_40"],
  },
];

export interface PaladinVirtueDef {
  id: PaladinVirtueId;
  name: string;
  description: string;
  /** 每阶永久加成（满 5 阶即达封顶）。 */
  perRank: PaladinStats;
}

export const PALADIN_VIRTUES: readonly PaladinVirtueDef[] = [
  { id: "valor", name: "勇气誓言", description: "向圣骑士团宣誓不退，每阶攻击 +3。", perRank: { bonusAtk: 3 } },
  { id: "aegis", name: "守护誓言", description: "以盾护佑同伴，每阶防御 +2。", perRank: { bonusDef: 2 } },
  { id: "vigor", name: "坚忍誓言", description: "在试炼中磨砺体魄，每阶生命 +30。", perRank: { bonusHp: 30 } },
  { id: "glory", name: "荣光誓言", description: "荣光随行，每阶金币收益与经验各 +1%。", perRank: { goldGainPct: 1, xpGainPct: 1 } },
];

export interface PaladinHonorRankDef {
  rank: number;
  /** 累计获得的荣誉勋章（只增不减）达到该值即晋升。 */
  minMedals: number;
  name: string;
}

/** 荣誉位阶：誓言升到第 n 阶需要位阶 ≥ n-1。 */
export const PALADIN_HONOR_RANKS: readonly PaladinHonorRankDef[] = [
  { rank: 0, minMedals: 0, name: "见习侍从" },
  { rank: 1, minMedals: 20, name: "圣骑士团侍从" },
  { rank: 2, minMedals: 60, name: "白银骑士" },
  { rank: 3, minMedals: 140, name: "圣殿骑士" },
  { rank: 4, minMedals: 260, name: "圣骑士" },
  { rank: 5, minMedals: 420, name: "圣骑士长" },
];

export function isValidAirshipTownId(id: unknown): id is AirshipTownId {
  return typeof id === "string" && (AIRSHIP_TOWN_IDS as readonly string[]).includes(id);
}

export function isValidAirshipGoodId(id: unknown): id is AirshipGoodId {
  return typeof id === "string" && (AIRSHIP_GOOD_IDS as readonly string[]).includes(id);
}

export function isValidAirshipRouteId(id: unknown): id is AirshipRouteId {
  return typeof id === "string" && (AIRSHIP_ROUTE_IDS as readonly string[]).includes(id);
}

export function isValidPaladinVirtueId(id: unknown): id is PaladinVirtueId {
  return typeof id === "string" && (PALADIN_VIRTUE_IDS as readonly string[]).includes(id);
}

function airshipCleanCount(v: unknown, cap: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.min(cap, Math.floor(n)) : 0;
}

function airshipObj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

export function getAirshipTownDef(id: AirshipTownId): AirshipTownDef {
  return AIRSHIP_TOWNS.find((t) => t.id === id) || AIRSHIP_TOWNS[0];
}

export function getAirshipGoodDef(id: AirshipGoodId): AirshipGoodDef {
  return AIRSHIP_GOODS.find((g) => g.id === id) || AIRSHIP_GOODS[0];
}

export function getAirshipRouteDef(id: AirshipRouteId): AirshipRouteDef {
  return AIRSHIP_ROUTES.find((r) => r.id === id) || AIRSHIP_ROUTES[0];
}

/** 船体等级（脏数据按 1 级；超出按满级）。 */
export function getAirshipHull(level: unknown): AirshipHullDef {
  const n = Math.min(AIRSHIP_HULLS.length, Math.max(1, airshipCleanCount(level, AIRSHIP_HULLS.length)));
  return AIRSHIP_HULLS[n - 1];
}

/** 东八区日序号（1970-01-01 东八区 = 0）。 */
export function airshipDayIndex(now: Date | number): number {
  const ms = typeof now === "number" ? now : now.getTime();
  return Math.floor((ms + AIRSHIP_TZ_OFFSET_MINUTES * 60_000) / 86_400_000);
}

/** 日序号 → 东八区日期键 YYYY-MM-DD。 */
export function airshipDayKeyFromIndex(index: number): string {
  return new Date(Math.floor(index) * 86_400_000).toISOString().slice(0, 10);
}

export function airshipDayKey(now: Date | number): string {
  return airshipDayKeyFromIndex(airshipDayIndex(now));
}

/** 日期键 → 日序号；非法键返回 null。 */
export function airshipDayIndexFromKey(key: unknown): number | null {
  if (typeof key !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const ms = Date.parse(`${key}T00:00:00.000Z`);
  if (!Number.isFinite(ms)) return null;
  const index = Math.floor(ms / 86_400_000);
  return airshipDayKeyFromIndex(index) === key ? index : null;
}

/** 当前东八区日结束（次日 0 点）的 UTC 毫秒时间戳。 */
export function airshipDayEndsAtMs(now: Date | number): number {
  return (airshipDayIndex(now) + 1) * 86_400_000 - AIRSHIP_TZ_OFFSET_MINUTES * 60_000;
}

/** 32 位整数混合哈希（行情与试炼幻影的唯一随机源，纯确定性）。 */
export function airshipHash(a: number, b: number): number {
  let h = (Math.imul((a | 0) ^ 0x3c6ef372, 0x9e3779b1) + Math.imul((b | 0) + 0x1b873593, 0x85ebca77)) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d) >>> 0;
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39) >>> 0;
  h ^= h >>> 15;
  return h >>> 0;
}

/** 产地今日出售价：基准价 × (80% ~ 92%)，按东八区日序号哈希确定（同一天全服一致）。 */
export function getAirshipBuyQuote(dayIndex: number, goodId: unknown) {
  if (!isValidAirshipGoodId(goodId)) return null;
  const d = Number.isFinite(dayIndex) ? Math.floor(dayIndex) : 0;
  const def = getAirshipGoodDef(goodId);
  const gi = AIRSHIP_GOOD_IDS.indexOf(def.id);
  const pct = AIRSHIP_BUY_MIN_PCT + (airshipHash(d, 0xb100 + gi) % (AIRSHIP_BUY_SWING_PCT + 1));
  return { goodId: def.id, townId: def.origin, pct, price: Math.max(1, Math.floor((def.basePrice * pct) / 100)) };
}

/**
 * 外地今日收购价：基准价 × (需求基准 ± 25%)，再乘抵港航线的等级加成；产地不收购本地特产（返回 null）。
 */
export function getAirshipSellQuote(dayIndex: number, townId: unknown, goodId: unknown, sellBonusPct: unknown = 0) {
  if (!isValidAirshipTownId(townId) || !isValidAirshipGoodId(goodId)) return null;
  const def = getAirshipGoodDef(goodId);
  const demand = def.demand[townId];
  if (def.origin === townId || !demand) return null;
  const d = Number.isFinite(dayIndex) ? Math.floor(dayIndex) : 0;
  const ti = AIRSHIP_TOWN_IDS.indexOf(townId);
  const gi = AIRSHIP_GOOD_IDS.indexOf(def.id);
  const pct = demand - AIRSHIP_SELL_SWING_PCT + (airshipHash(d, 0x5e00 + ti * 16 + gi) % (AIRSHIP_SELL_SWING_PCT * 2 + 1));
  const bonusPct = airshipCleanCount(sellBonusPct, 100);
  const listPrice = Math.max(1, Math.floor((def.basePrice * pct) / 100));
  return { goodId: def.id, townId, pct, bonusPct, listPrice, price: Math.max(1, Math.floor((listPrice * (100 + bonusPct)) / 100)) };
}

/** 某个东八区日的全图行情：各城镇出售的本地特产与收购的外地特产（不含航线加成）。 */
export function getAirshipMarket(dayIndex: number) {
  return AIRSHIP_TOWN_IDS.map((townId) => ({
    townId,
    buys: AIRSHIP_GOODS.filter((g) => g.origin === townId).map((g) => getAirshipBuyQuote(dayIndex, g.id)!),
    sells: AIRSHIP_GOODS.filter((g) => g.origin !== townId).map((g) => getAirshipSellQuote(dayIndex, townId, g.id)!),
  }));
}

/** 航线等级：累计航线经验决定等级、提速与收购价加成（含下一级进度）。 */
export function getAirshipRouteLevel(xp: unknown) {
  const n = airshipCleanCount(xp, AIRSHIP_COUNTER_CAP);
  let current = AIRSHIP_ROUTE_LEVELS[0];
  let next: AirshipRouteLevelDef | null = null;
  for (let i = 0; i < AIRSHIP_ROUTE_LEVELS.length; i++) {
    if (n >= AIRSHIP_ROUTE_LEVELS[i].minXp) {
      current = AIRSHIP_ROUTE_LEVELS[i];
      next = AIRSHIP_ROUTE_LEVELS[i + 1] ?? null;
    }
  }
  const progressPct = next
    ? Math.min(100, Math.max(0, Math.round(((n - current.minXp) / Math.max(1, next.minXp - current.minXp)) * 100)))
    : 100;
  return { xp: n, level: current.level, speedPct: current.speedPct, sellBonusPct: current.sellBonusPct, current, next, progressPct };
}

/** 航线另一端：fromTown 不是该航线的端点时返回 null。 */
export function airshipRouteDestination(routeId: unknown, fromTown: unknown): AirshipTownId | null {
  if (!isValidAirshipRouteId(routeId) || !isValidAirshipTownId(fromTown)) return null;
  const r = getAirshipRouteDef(routeId);
  if (r.from === fromTown) return r.to;
  if (r.to === fromTown) return r.from;
  return null;
}

/** 航程时长 = 基准分钟 × (100 - 船体提速 - 航线提速)%，最少保留 40%。 */
export function getAirshipVoyageMs(routeId: unknown, routeXp: unknown, hullLevel: unknown): number {
  if (!isValidAirshipRouteId(routeId)) return 0;
  const r = getAirshipRouteDef(routeId);
  const pct = Math.max(AIRSHIP_MIN_DURATION_PCT, 100 - getAirshipHull(hullLevel).speedPct - getAirshipRouteLevel(routeXp).speedPct);
  return Math.round((r.baseMinutes * 60_000 * pct) / 100);
}

/** 一趟航程的航线经验：载货才计（1 + 每 10 件货 1 点，最多按 100 件计）；空船不计。 */
export function airshipVoyageXp(cargoUnits: unknown): number {
  const n = airshipCleanCount(cargoUnits, AIRSHIP_XP_CARGO_CAP);
  return n > 0 ? 1 + Math.floor(n / 10) : 0;
}

/** 货舱净化：只认合法特产与正整数件数（不超过计数上限）。 */
export function cleanAirshipCargo(raw: unknown): Partial<Record<AirshipGoodId, number>> {
  const src = airshipObj(raw);
  const out: Partial<Record<AirshipGoodId, number>> = {};
  for (const id of AIRSHIP_GOOD_IDS) {
    const n = airshipCleanCount(src[id], AIRSHIP_COUNTER_CAP);
    if (n > 0) out[id] = n;
  }
  return out;
}

/** 货舱里的货物总件数。 */
export function airshipCargoUnits(cargo: unknown): number {
  const c = cleanAirshipCargo(cargo);
  let sum = 0;
  for (const id of AIRSHIP_GOOD_IDS) sum += c[id] || 0;
  return Math.min(AIRSHIP_COUNTER_CAP, sum);
}

function airshipQty(qty: unknown): number {
  const n = Number(qty);
  return Number.isInteger(n) && n >= 1 && n <= AIRSHIP_MAX_TRADE_QTY ? n : 0;
}

/**
 * 购入计划：只能在产地按今日出售价购入；受船体等级、今日存货、货舱空位与金币约束（maxQty 为当前最多可买件数）。
 */
export function planAirshipBuy(
  dayIndex: number,
  townId: unknown,
  hullLevel: unknown,
  goodId: unknown,
  qty: unknown,
  cargo: unknown,
  boughtToday: unknown,
  gold: unknown
) {
  const quote = getAirshipBuyQuote(dayIndex, goodId);
  const def = quote ? getAirshipGoodDef(quote.goodId) : null;
  const hull = getAirshipHull(hullLevel);
  const atOrigin = def !== null && def.origin === townId;
  const hullOk = def !== null && hull.level >= def.minHull;
  const bought = def ? airshipCleanCount(airshipObj(boughtToday)[def.id], AIRSHIP_DAILY_STOCK) : 0;
  const stockLeft = def ? AIRSHIP_DAILY_STOCK - bought : 0;
  const spaceLeft = Math.max(0, hull.capacity - airshipCargoUnits(cargo));
  const affordable = quote ? Math.floor(airshipCleanCount(gold, Number.MAX_SAFE_INTEGER) / quote.price) : 0;
  const maxQty = quote && atOrigin && hullOk ? Math.max(0, Math.min(AIRSHIP_MAX_TRADE_QTY, stockLeft, spaceLeft, affordable)) : 0;
  const n = airshipQty(qty);
  const ok = quote !== null && atOrigin && hullOk && n > 0 && n <= maxQty;
  return {
    ok,
    goodId: quote ? quote.goodId : null,
    pct: quote ? quote.pct : 0,
    unitPrice: quote ? quote.price : 0,
    qty: n,
    total: ok && quote ? n * quote.price : 0,
    maxQty,
    stockLeft,
    spaceLeft,
    atOrigin,
    hullOk,
  };
}

/**
 * 卖出计划：在非产地港口按今日收购价（含抵港航线加成）卖出货舱里的货物；按件数比例摊出成本以计算本笔盈亏。
 */
export function planAirshipSell(
  dayIndex: number,
  townId: unknown,
  goodId: unknown,
  qty: unknown,
  cargo: unknown,
  cargoCost: unknown,
  sellBonusPct: unknown
) {
  const quote = getAirshipSellQuote(dayIndex, townId, goodId, sellBonusPct);
  const held = isValidAirshipGoodId(goodId) ? cleanAirshipCargo(cargo)[goodId] || 0 : 0;
  const costHeld = isValidAirshipGoodId(goodId) ? airshipCleanCount(airshipObj(cargoCost)[goodId], AIRSHIP_COUNTER_CAP) : 0;
  const n = airshipQty(qty);
  const ok = quote !== null && n > 0 && n <= held;
  const total = ok && quote ? n * quote.price : 0;
  const costShare = ok && held > 0 ? Math.floor((costHeld * n) / held) : 0;
  return {
    ok,
    goodId: quote ? quote.goodId : null,
    pct: quote ? quote.pct : 0,
    bonusPct: quote ? quote.bonusPct : 0,
    listPrice: quote ? quote.listPrice : 0,
    unitPrice: quote ? quote.price : 0,
    qty: n,
    held,
    total,
    costShare,
    profit: total - costShare,
  };
}

/** 船体升级计划：下一级的金币与真实材料是否齐备（满级返回 maxed）。 */
export function planAirshipHullUpgrade(hullLevel: unknown, gold: unknown, inventory: unknown) {
  const cur = getAirshipHull(hullLevel);
  const next = AIRSHIP_HULLS.find((h) => h.level === cur.level + 1) ?? null;
  const inv = airshipObj(inventory);
  const g = airshipCleanCount(gold, Number.MAX_SAFE_INTEGER);
  const materials = next
    ? Object.entries(next.materials).map(([itemId, need]) => ({ itemId, need, have: airshipCleanCount(inv[itemId], AIRSHIP_COUNTER_CAP) }))
    : [];
  const goldOk = next !== null && g >= next.costGold;
  const materialsOk = materials.every((m) => m.have >= m.need);
  return { ok: next !== null && goldOk && materialsOk, maxed: next === null, current: cur, next, goldOk, materialsOk, materials };
}

/** 东八区周序号（1970-01-05 周一 0 点 = 第 0 周）。 */
export function paladinWeekIndex(now: Date | number): number {
  const ms = typeof now === "number" ? now : now.getTime();
  return Math.floor((ms + PALADIN_TZ_OFFSET_MINUTES * 60_000 - PALADIN_WEEK_EPOCH_MS) / PALADIN_WEEK_MS);
}

/** 周序号 → 周键（该周周一的东八区日期 YYYY-MM-DD）。 */
export function paladinWeekKeyFromIndex(index: number): string {
  return new Date(PALADIN_WEEK_EPOCH_MS + Math.floor(index) * PALADIN_WEEK_MS).toISOString().slice(0, 10);
}

export function paladinWeekKey(now: Date | number): string {
  return paladinWeekKeyFromIndex(paladinWeekIndex(now));
}

/** 周键 → 周序号；非法键或不是周一返回 null。 */
export function paladinWeekIndexFromKey(key: unknown): number | null {
  if (typeof key !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const ms = Date.parse(`${key}T00:00:00.000Z`);
  if (!Number.isFinite(ms)) return null;
  const diff = ms - PALADIN_WEEK_EPOCH_MS;
  if (diff % PALADIN_WEEK_MS !== 0) return null;
  const index = diff / PALADIN_WEEK_MS;
  return paladinWeekKeyFromIndex(index) === key ? index : null;
}

/** 本周结束（下周一东八区 0 点）的 UTC 毫秒时间戳。 */
export function paladinWeekEndsAtMs(now: Date | number): number {
  return PALADIN_WEEK_EPOCH_MS + (paladinWeekIndex(now) + 1) * PALADIN_WEEK_MS - PALADIN_TZ_OFFSET_MINUTES * 60_000;
}

/** 本周誓约：四种誓约按周序号依次轮换。 */
export function getPaladinTheme(weekIndex: number): PaladinThemeDef {
  const w = Number.isFinite(weekIndex) ? Math.floor(weekIndex) : 0;
  const n = PALADIN_THEMES.length;
  return PALADIN_THEMES[((w % n) + n) % n];
}

export function getPaladinFoeDef(monsterId: string): PaladinFoeDef {
  return PALADIN_FOES.find((f) => f.monsterId === monsterId) || PALADIN_FOES[0];
}

export interface PaladinOpponent {
  id: string;
  stage: number;
  stageName: string;
  monsterId: string;
  name: string;
  themeId: PaladinThemeId;
  level: number;
  hp: number;
  atk: number;
  def: number;
  attackIntervalMs: number;
  isBoss: boolean;
  mechanics: string[];
  medals: number;
}

/** 由周序号 + 关卡确定性生成本周幻影（同一周全服一致）：真实怪物属性 × 本周誓约倍率，终关加厚并带首领机制。 */
export function generatePaladinOpponent(weekIndex: number, stage: number): PaladinOpponent {
  const s = Math.min(PALADIN_STAGES.length, Math.max(1, Math.floor(Number(stage)) || 1));
  const w = Number.isFinite(weekIndex) ? Math.floor(weekIndex) : 0;
  const def = PALADIN_STAGES[s - 1];
  const theme = getPaladinTheme(w);
  const foe = getPaladinFoeDef(def.pool[airshipHash(w, 0x7a11 + s) % def.pool.length]);
  return {
    id: `paladin_trial_s${s}`,
    stage: s,
    stageName: def.name,
    monsterId: foe.monsterId,
    name: `${def.boss ? "试炼官 · " : ""}${theme.prefix}幻影 · ${foe.name}`,
    themeId: theme.id,
    level: foe.level,
    hp: Math.max(1, Math.round((foe.hp * def.hpPct * theme.hpPct) / 10_000)),
    atk: Math.max(1, Math.round((foe.atk * theme.atkPct) / 100)),
    def: Math.max(0, Math.round((foe.def * theme.defPct) / 100)),
    attackIntervalMs: Math.max(800, Math.round((foe.attackIntervalMs * theme.intervalPct) / 100)),
    isBoss: def.boss,
    mechanics: def.boss ? [...theme.mechanics] : [],
    medals: def.medals,
  };
}

/** 本周六关的幻影阵容。 */
export function getPaladinTrialLineup(weekIndex: number): PaladinOpponent[] {
  return PALADIN_STAGES.map((s) => generatePaladinOpponent(weekIndex, s.stage));
}

/** 幻影 → 战斗引擎的怪物记录（hp_combat.monsterCombatant / fightPreview.PreviewMonster 同口径；不掉落、不给经验金币）。 */
export function paladinOpponentMonster(o: PaladinOpponent) {
  return {
    id: o.id,
    name: o.name,
    level: o.level,
    hp: o.hp,
    atk: o.atk,
    def: o.def,
    attackIntervalMs: o.attackIntervalMs,
    isBoss: o.isBoss,
    mechanics: [...o.mechanics],
    gold: 0,
    xp: 0,
  };
}

/** 本周已通关的关卡：只认从第 1 关起连续的前缀（关卡必须按顺序挑战）。 */
export function cleanPaladinCleared(raw: unknown): number[] {
  const list = Array.isArray(raw) ? (raw as unknown[]) : [];
  const out: number[] = [];
  for (const s of PALADIN_STAGES) {
    if (!list.includes(s.stage)) break;
    out.push(s.stage);
  }
  return out;
}

/** 首次通关某关的荣誉勋章（第 6 关同时达成全通，额外 +10）。 */
export function getPaladinStageReward(stage: number) {
  const s = Math.min(PALADIN_STAGES.length, Math.max(1, Math.floor(Number(stage)) || 1));
  const fullClear = s === PALADIN_STAGES.length;
  const base = PALADIN_STAGES[s - 1].medals;
  return { stage: s, medals: base + (fullClear ? PALADIN_FULL_CLEAR_BONUS : 0), base, fullClear };
}

/** 誓言阶数净化：四项誓言各 0 ~ 5 阶。 */
export function cleanPaladinVirtues(raw: unknown): Record<PaladinVirtueId, number> {
  const src = airshipObj(raw);
  const out = {} as Record<PaladinVirtueId, number>;
  for (const id of PALADIN_VIRTUE_IDS) out[id] = airshipCleanCount(src[id], PALADIN_VIRTUE_MAX_RANK);
  return out;
}

/** 荣誉位阶：累计荣誉勋章决定位阶（含下一位阶进度）。 */
export function getPaladinHonorRank(totalMedals: unknown) {
  const n = airshipCleanCount(totalMedals, PALADIN_MEDAL_CAP);
  let current = PALADIN_HONOR_RANKS[0];
  let next: PaladinHonorRankDef | null = null;
  for (let i = 0; i < PALADIN_HONOR_RANKS.length; i++) {
    if (n >= PALADIN_HONOR_RANKS[i].minMedals) {
      current = PALADIN_HONOR_RANKS[i];
      next = PALADIN_HONOR_RANKS[i + 1] ?? null;
    }
  }
  const progressPct = next
    ? Math.min(100, Math.max(0, Math.round(((n - current.minMedals) / Math.max(1, next.minMedals - current.minMedals)) * 100)))
    : 100;
  return { totalMedals: n, current, next, progressPct };
}

/** 誓言升阶计划：花荣誉勋章把某项誓言升 1 阶（满 5 阶封顶；第 n 阶需荣誉位阶 ≥ n-1）。 */
export function planPaladinVirtue(virtues: unknown, virtueId: unknown, medals: unknown, totalMedals: unknown) {
  const valid = isValidPaladinVirtueId(virtueId);
  const ranks = cleanPaladinVirtues(virtues);
  const rank = valid ? ranks[virtueId] : 0;
  const maxed = valid && rank >= PALADIN_VIRTUE_MAX_RANK;
  const nextRank = maxed ? rank : rank + 1;
  const cost = valid && !maxed ? PALADIN_VIRTUE_COSTS[rank] : 0;
  const honor = getPaladinHonorRank(totalMedals);
  const needHonorRank = Math.max(0, nextRank - 1);
  const rankOk = honor.current.rank >= needHonorRank;
  const have = airshipCleanCount(medals, PALADIN_MEDAL_CAP);
  const enough = have >= cost;
  return {
    ok: valid && !maxed && rankOk && enough,
    virtueId: valid ? virtueId : null,
    rank,
    nextRank,
    maxed,
    cost,
    medals: have,
    enough,
    honorRank: honor.current.rank,
    needHonorRank,
    rankOk,
  };
}

export type MinimalPaladinHolder = {
  paladinTrial?: {
    virtues?: unknown;
    totalMedals?: unknown;
  } | null;
} | null;

export interface PaladinTrialBonuses {
  virtues: Record<PaladinVirtueId, number>;
  virtueRanks: number;
  honorRank: number;
  honorRankName: string;
  bonusAtk: number;
  bonusDef: number;
  bonusHp: number;
  goldGainPct: number;
  xpGainPct: number;
}

/** 荣誉试炼的永久加成 = 四项誓言阶数 × 每阶加成，逐项封顶（攻 15 / 防 10 / 血 150 / 金币 5% / 经验 5%）。 */
export function getPaladinTrialBonuses(holder?: MinimalPaladinHolder): PaladinTrialBonuses {
  const pt = airshipObj(holder?.paladinTrial);
  const virtues = cleanPaladinVirtues(pt.virtues);
  const honor = getPaladinHonorRank(pt.totalMedals);
  const sum: Required<PaladinStats> = { bonusAtk: 0, bonusDef: 0, bonusHp: 0, goldGainPct: 0, xpGainPct: 0 };
  let virtueRanks = 0;
  for (const v of PALADIN_VIRTUES) {
    const r = virtues[v.id];
    virtueRanks += r;
    for (const k of PALADIN_STAT_KEYS) sum[k] += r * (v.perRank[k] || 0);
  }
  for (const k of PALADIN_STAT_KEYS) sum[k] = Math.min(PALADIN_BONUS_CAPS[k], sum[k]);
  return {
    virtues,
    virtueRanks,
    honorRank: honor.current.rank,
    honorRankName: honor.current.name,
    ...sum,
  };
}

/* ---- 以上为 WL-16 core ---- */

const AIRSHIP_EPOCH_ISO = new Date(0).toISOString();

function airshipIsoOr(v: unknown, fallback: string): string {
  const ms = typeof v === "string" ? Date.parse(v) : Number.NaN;
  return Number.isFinite(ms) ? new Date(ms).toISOString() : fallback;
}

function airshipSignedInt(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(-AIRSHIP_COUNTER_CAP, Math.min(AIRSHIP_COUNTER_CAP, Math.trunc(n)));
}

function sanitizeAirshipVoyage(
  raw: unknown,
  routes: Partial<Record<AirshipRouteId, AirshipRouteRecord>>,
  hullLevel: number,
  cargoUnits: number
): AirshipVoyage | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (!isValidAirshipRouteId(r.routeId) || !routes[r.routeId]) return null;
  const to = airshipRouteDestination(r.routeId, r.from);
  const departedMs = typeof r.departedAt === "string" ? Date.parse(r.departedAt) : Number.NaN;
  if (!to || !Number.isFinite(departedMs)) return null;
  // 抵港时刻恒为起航时刻 + 当前航线等级与船体下的航程（航行中二者都不会变化），脏档改不短航程
  const ms = getAirshipVoyageMs(r.routeId, routes[r.routeId]!.xp, hullLevel);
  return {
    routeId: r.routeId,
    from: r.from as AirshipTownId,
    to,
    departedAt: new Date(departedMs).toISOString(),
    arrivesAt: new Date(departedMs + ms).toISOString(),
    cargoUnits,
  };
}

function sanitizeAirshipSale(raw: unknown): AirshipSaleRecord | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (!isValidAirshipGoodId(r.goodId) || !isValidAirshipTownId(r.townId)) return null;
  return {
    goodId: r.goodId,
    townId: r.townId,
    qty: airshipCleanCount(r.qty, AIRSHIP_COUNTER_CAP),
    gold: airshipCleanCount(r.gold, AIRSHIP_COUNTER_CAP),
    profit: airshipSignedInt(r.profit),
    at: airshipIsoOr(r.at, AIRSHIP_EPOCH_ISO),
  };
}

function sanitizeAirshipArrival(raw: unknown): AirshipArrivalRecord | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (!isValidAirshipRouteId(r.routeId) || !isValidAirshipTownId(r.to)) return null;
  return {
    routeId: r.routeId,
    to: r.to,
    cargoUnits: airshipCleanCount(r.cargoUnits, AIRSHIP_COUNTER_CAP),
    xpGained: airshipCleanCount(r.xpGained, AIRSHIP_COUNTER_CAP),
    at: airshipIsoOr(r.at, AIRSHIP_EPOCH_ISO),
  };
}

/** 抵港：按起航时的货物件数结算航线经验，停靠到目的港（时间戳取真实抵港时刻）。 */
function landAirshipVoyage(player: EnhancedPlayerState, at: AirshipTradeState) {
  const v = at.voyage!;
  const route = at.routes[v.routeId]!;
  const def = getAirshipRouteDef(v.routeId);
  const prevLevel = getAirshipRouteLevel(route.xp).level;
  const xpGained = airshipVoyageXp(v.cargoUnits);
  route.xp = Math.min(AIRSHIP_COUNTER_CAP, route.xp + xpGained);
  route.voyages = Math.min(AIRSHIP_COUNTER_CAP, route.voyages + 1);
  at.location = v.to;
  at.arrivedVia = v.routeId;
  at.voyage = null;
  at.totalVoyages = Math.min(AIRSHIP_COUNTER_CAP, at.totalVoyages + 1);
  at.lastArrival = { routeId: v.routeId, to: v.to, cargoUnits: v.cargoUnits, xpGained, at: v.arrivesAt };
  const level = getAirshipRouteLevel(route.xp).level;
  appendLog(
    player,
    `浮空飞艇沿「${def.name}」抵达${getAirshipTownDef(v.to).name}${
      v.cargoUnits > 0 ? `，载货 ${v.cargoUnits} 件，航线经验 +${xpGained}` : "（空船，不计航线经验）"
    }${level > prevLevel ? `，「${def.name}」升至 Lv.${level}！` : "。"}`
  );
}

/**
 * 确保 airshipTrade 存在并净化脏档（旧存档首次打开面板时建造船坞：停在公会城镇、1 级船体、尚未开辟航线）。
 * 仅显式传入 now（指令 / 视图时钟）时才会换日（补货）与抵港；无参调用（ensurePlayerExtensions / 转生净化）
 * 只做净化，绝不按墙钟推进（无效日期键回落到纪元日，下一次显式 now 再前推）。
 */
export function ensureAirshipTrade(player: EnhancedPlayerState, now?: Date): AirshipTradeState {
  if (!Array.isArray((player as any).logs)) {
    (player as any).logs = [];
  }
  if (!player.inventory || typeof player.inventory !== "object") {
    player.inventory = { gold: 0 };
  }
  const fallbackDayKey = now !== undefined ? airshipDayKey(now) : airshipDayKeyFromIndex(0);
  if (!player.airshipTrade || typeof player.airshipTrade !== "object" || Array.isArray(player.airshipTrade)) {
    player.airshipTrade = {
      dayKey: fallbackDayKey,
      location: "guild_town",
      voyage: null,
      arrivedVia: null,
      hullLevel: 1,
      routes: {},
      cargo: {},
      cargoCost: {},
      boughtToday: {},
      totalVoyages: 0,
      totalSales: 0,
      totalSpent: 0,
      totalProfit: 0,
      lastSale: null,
      lastArrival: null,
    };
  }
  const at = player.airshipTrade;
  if (airshipDayIndexFromKey(at.dayKey) === null) at.dayKey = fallbackDayKey;
  at.hullLevel = getAirshipHull(at.hullLevel).level;
  const routesRaw = airshipObj(at.routes);
  const routes: Partial<Record<AirshipRouteId, AirshipRouteRecord>> = {};
  for (const id of AIRSHIP_ROUTE_IDS) {
    const r = routesRaw[id];
    if (!r || typeof r !== "object" || Array.isArray(r)) continue;
    const rr = r as Record<string, unknown>;
    routes[id] = {
      xp: airshipCleanCount(rr.xp, AIRSHIP_COUNTER_CAP),
      voyages: airshipCleanCount(rr.voyages, AIRSHIP_COUNTER_CAP),
      openedAt: airshipIsoOr(rr.openedAt, AIRSHIP_EPOCH_ISO),
    };
  }
  at.routes = routes;
  if (!isValidAirshipTownId(at.location)) at.location = "guild_town";
  // 货舱：只认合法特产，超出船体容量的部分（脏档）按特产表顺序截掉；成本只保留仍在舱里的特产
  const cargo = cleanAirshipCargo(at.cargo);
  const costRaw = airshipObj(at.cargoCost);
  let room = getAirshipHull(at.hullLevel).capacity;
  const cargoOut: Partial<Record<AirshipGoodId, number>> = {};
  const costOut: Partial<Record<AirshipGoodId, number>> = {};
  for (const id of AIRSHIP_GOOD_IDS) {
    const q = Math.min(room, cargo[id] || 0);
    if (q <= 0) continue;
    cargoOut[id] = q;
    room -= q;
    const c = airshipCleanCount(costRaw[id], AIRSHIP_COUNTER_CAP);
    if (c > 0) costOut[id] = c;
  }
  at.cargo = cargoOut;
  at.cargoCost = costOut;
  at.voyage = sanitizeAirshipVoyage(at.voyage, at.routes, at.hullLevel, airshipCargoUnits(at.cargo));
  if (at.voyage) at.location = at.voyage.from;
  const boughtRaw = airshipObj(at.boughtToday);
  const bought: Partial<Record<AirshipGoodId, number>> = {};
  for (const id of AIRSHIP_GOOD_IDS) {
    const n = airshipCleanCount(boughtRaw[id], AIRSHIP_DAILY_STOCK);
    if (n > 0) bought[id] = n;
  }
  at.boughtToday = bought;
  at.arrivedVia =
    !at.voyage && isValidAirshipRouteId(at.arrivedVia) && at.routes[at.arrivedVia] && airshipRouteDestination(at.arrivedVia, at.location)
      ? at.arrivedVia
      : null;
  at.totalVoyages = airshipCleanCount(at.totalVoyages, AIRSHIP_COUNTER_CAP);
  at.totalSales = airshipCleanCount(at.totalSales, AIRSHIP_COUNTER_CAP);
  at.totalSpent = airshipCleanCount(at.totalSpent, AIRSHIP_COUNTER_CAP);
  at.totalProfit = airshipSignedInt(at.totalProfit);
  at.lastSale = sanitizeAirshipSale(at.lastSale);
  at.lastArrival = sanitizeAirshipArrival(at.lastArrival);
  if (now !== undefined) {
    const cur = airshipDayIndex(now);
    const stored = airshipDayIndexFromKey(at.dayKey)!;
    // 只向前换日（时钟回拨不回滚）：补满各产地的今日存货
    if (cur > stored) {
      at.dayKey = airshipDayKeyFromIndex(cur);
      at.boughtToday = {};
    }
    if (at.voyage && now.getTime() >= Date.parse(at.voyage.arrivesAt)) {
      landAirshipVoyage(player, at);
    }
  }
  return at;
}

/** 转生：保留航线 / 船体 / 停靠港与进行中的航程，清空货舱（航程的载货件数随之归零）。 */
export function clearAirshipCargoForPrestige(player: EnhancedPlayerState) {
  const at = ensureAirshipTrade(player);
  const units = airshipCargoUnits(at.cargo);
  at.cargo = {};
  at.cargoCost = {};
  ensureAirshipTrade(player);
  if (units > 0) appendLog(player, `转生：飞艇货舱里的 ${units} 件特产随旧世界一同散去（航线、航线等级与船体保留）。`);
  return units;
}

/**
 * 确保 paladinTrial 存在并净化脏档（旧存档首次打开面板时入团：0 勋章、誓言 0 阶，不赠送任何加成）。
 * 仅显式传入 now 时才会翻周（重置本周通关进度与挑战次数）；无参调用只做净化。
 */
export function ensurePaladinTrial(player: EnhancedPlayerState, now?: Date): PaladinTrialState {
  if (!Array.isArray((player as any).logs)) {
    (player as any).logs = [];
  }
  const fallbackWeekKey = now !== undefined ? paladinWeekKey(now) : paladinWeekKeyFromIndex(0);
  if (!player.paladinTrial || typeof player.paladinTrial !== "object" || Array.isArray(player.paladinTrial)) {
    player.paladinTrial = {
      weekKey: fallbackWeekKey,
      cleared: [],
      attemptsUsed: 0,
      medals: 0,
      totalMedals: 0,
      virtues: cleanPaladinVirtues(null),
      bestStage: 0,
      weeksFullCleared: 0,
      totalWins: 0,
      totalLosses: 0,
      lastDuel: null,
    };
  }
  const pt = player.paladinTrial;
  if (paladinWeekIndexFromKey(pt.weekKey) === null) pt.weekKey = fallbackWeekKey;
  if (now !== undefined) {
    const cur = paladinWeekIndex(now);
    const stored = paladinWeekIndexFromKey(pt.weekKey)!;
    // 只向前翻周（时钟回拨不回滚）
    if (cur > stored) {
      pt.weekKey = paladinWeekKeyFromIndex(cur);
      pt.cleared = [];
      pt.attemptsUsed = 0;
    }
  }
  pt.cleared = cleanPaladinCleared(pt.cleared);
  pt.attemptsUsed = Math.max(pt.cleared.length, airshipCleanCount(pt.attemptsUsed, PALADIN_WEEKLY_ATTEMPTS));
  pt.medals = airshipCleanCount(pt.medals, PALADIN_MEDAL_CAP);
  pt.totalMedals = Math.max(pt.medals, airshipCleanCount(pt.totalMedals, PALADIN_MEDAL_CAP));
  pt.virtues = cleanPaladinVirtues(pt.virtues);
  pt.bestStage = Math.max(pt.cleared.length, airshipCleanCount(pt.bestStage, PALADIN_STAGES.length));
  pt.weeksFullCleared = airshipCleanCount(pt.weeksFullCleared, AIRSHIP_COUNTER_CAP);
  pt.totalWins = Math.max(pt.cleared.length, airshipCleanCount(pt.totalWins, AIRSHIP_COUNTER_CAP));
  pt.totalLosses = airshipCleanCount(pt.totalLosses, AIRSHIP_COUNTER_CAP);
  const ld = pt.lastDuel as unknown;
  if (ld && typeof ld === "object" && !Array.isArray(ld) && paladinWeekIndexFromKey((ld as any).weekKey) !== null) {
    const r = ld as Record<string, unknown>;
    pt.lastDuel = {
      weekKey: r.weekKey as string,
      stage: Math.min(PALADIN_STAGES.length, Math.max(1, airshipCleanCount(r.stage, PALADIN_STAGES.length))),
      opponentName: typeof r.opponentName === "string" ? r.opponentName.slice(0, 60) : "",
      won: r.won === true,
      timeout: r.timeout === true,
      playerHpLeft: airshipCleanCount(r.playerHpLeft, AIRSHIP_COUNTER_CAP),
      playerMaxHp: airshipCleanCount(r.playerMaxHp, AIRSHIP_COUNTER_CAP),
      enemyHpLeft: airshipCleanCount(r.enemyHpLeft, AIRSHIP_COUNTER_CAP),
      enemyMaxHp: airshipCleanCount(r.enemyMaxHp, AIRSHIP_COUNTER_CAP),
      durationMs: airshipCleanCount(r.durationMs, PALADIN_MAX_FIGHT_MS),
      medals: airshipCleanCount(r.medals, PALADIN_MEDAL_CAP),
      at: airshipIsoOr(r.at, AIRSHIP_EPOCH_ISO),
    };
  } else {
    pt.lastDuel = null;
  }
  return pt;
}

/** 视图统一推进飞艇（换日 / 抵港）与试炼（翻周）时钟（指令只推进自己那一份，被拒时不顺带建档），保证落库状态与响应视图一致。 */
function ensureAirshipPaladinClocks(player: EnhancedPlayerState, now: Date) {
  return { at: ensureAirshipTrade(player, now), pt: ensurePaladinTrial(player, now) };
}

const airshipGold = (player: EnhancedPlayerState) => Math.floor(Number(player.inventory.gold || 0));

/** 开辟飞艇航线：花金币在两座既有城镇间开通航线（船体等级达标即可，不要求停在端点）。 */
export function openAirshipRoute(
  player: EnhancedPlayerState,
  routeId: AirshipRouteId,
  now: Date
): { ok: boolean; reason?: string; routeId?: AirshipRouteId; cost?: number; routesOpened?: number } {
  ensurePlayerExtensions(player);
  if (!isValidAirshipRouteId(routeId)) return { ok: false, reason: "未知的飞艇航线" };
  const at = ensureAirshipTrade(player, now);
  const def = getAirshipRouteDef(routeId);
  if (at.routes[routeId]) return { ok: false, reason: `「${def.name}」已经开通` };
  if (at.hullLevel < def.minHull) {
    return { ok: false, reason: `开辟「${def.name}」需船体达到 ${def.minHull} 级「${getAirshipHull(def.minHull).name}」` };
  }
  if (airshipGold(player) < def.openCost) return { ok: false, reason: `金币不足：开辟「${def.name}」需 ${def.openCost} 金币` };
  player.inventory.gold = airshipGold(player) - def.openCost;
  if (player.stats) player.stats.totalGoldSpent = (player.stats.totalGoldSpent || 0) + def.openCost;
  at.routes = { ...at.routes, [routeId]: { xp: 0, voyages: 0, openedAt: now.toISOString() } };
  addReputation(player, 2);
  syncAchievements(player);
  appendLog(
    player,
    `浮空飞艇商路：开辟「${def.name}」（${getAirshipTownDef(def.from).name} ↔ ${getAirshipTownDef(def.to).name}），花费 ${def.openCost} 金币。`
  );
  return { ok: true, routeId, cost: def.openCost, routesOpened: Object.keys(at.routes).length };
}

/** 在产地按今日出售价购入特产装进货舱（每种每日 40 件存货；受船体等级与货舱容量约束）。 */
export function buyAirshipCargo(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack | undefined,
  goodId: AirshipGoodId,
  qty: number,
  now: Date,
  expectedDayKey?: string
): { ok: boolean; reason?: string; goodId?: AirshipGoodId; qty?: number; unitPrice?: number; total?: number; cargoUnits?: number; stockLeft?: number } {
  ensurePlayerExtensions(player);
  if (!isValidAirshipGoodId(goodId)) return { ok: false, reason: "未知的特产" };
  const at = ensureAirshipTrade(player, now);
  if (expectedDayKey !== undefined && expectedDayKey !== at.dayKey) {
    return { ok: false, reason: `日期已更替：飞艇集市今天是 ${at.dayKey}，请刷新后再试` };
  }
  if (at.voyage) return { ok: false, reason: "飞艇正在航行中，抵港后才能交易" };
  const def = getAirshipGoodDef(goodId);
  const name = tavernItemName(contentPack, goodId);
  const town = getAirshipTownDef(at.location);
  const today = airshipDayIndexFromKey(at.dayKey)!;
  const plan = planAirshipBuy(today, at.location, at.hullLevel, goodId, qty, at.cargo, at.boughtToday, airshipGold(player));
  if (!plan.atOrigin) return { ok: false, reason: `「${name}」只在${getAirshipTownDef(def.origin).name}出售` };
  if (!plan.hullOk) return { ok: false, reason: `运载「${name}」需船体达到 ${def.minHull} 级「${getAirshipHull(def.minHull).name}」` };
  if (plan.qty <= 0) return { ok: false, reason: `购入件数需为 1 ~ ${AIRSHIP_MAX_TRADE_QTY} 的整数` };
  if (plan.stockLeft <= 0) return { ok: false, reason: `${town.name}今天的「${name}」已经售罄，明天补货` };
  if (plan.spaceLeft <= 0) return { ok: false, reason: "货舱已满，先去外地港口卖掉一些货吧" };
  if (!plan.ok) {
    if (plan.qty > plan.stockLeft) return { ok: false, reason: `${town.name}今天的「${name}」只剩 ${plan.stockLeft} 件` };
    if (plan.qty > plan.spaceLeft) return { ok: false, reason: `货舱只剩 ${plan.spaceLeft} 个空位` };
    return { ok: false, reason: `金币不足：${plan.qty} 件「${name}」需 ${plan.qty * plan.unitPrice} 金币` };
  }
  player.inventory.gold = airshipGold(player) - plan.total;
  if (player.stats) player.stats.totalGoldSpent = (player.stats.totalGoldSpent || 0) + plan.total;
  at.cargo = { ...at.cargo, [goodId]: (at.cargo[goodId] || 0) + plan.qty };
  at.cargoCost = { ...at.cargoCost, [goodId]: Math.min(AIRSHIP_COUNTER_CAP, (at.cargoCost[goodId] || 0) + plan.total) };
  at.boughtToday = { ...at.boughtToday, [goodId]: (at.boughtToday[goodId] || 0) + plan.qty };
  at.totalSpent = Math.min(AIRSHIP_COUNTER_CAP, at.totalSpent + plan.total);
  appendLog(player, `浮空飞艇商路：在${town.name}购入「${name}」×${plan.qty}（单价 ${plan.unitPrice}），花费 ${plan.total} 金币。`);
  return {
    ok: true,
    goodId,
    qty: plan.qty,
    unitPrice: plan.unitPrice,
    total: plan.total,
    cargoUnits: airshipCargoUnits(at.cargo),
    stockLeft: plan.stockLeft - plan.qty,
  };
}

/** 在外地港口按今日收购价（含抵港航线的等级加成）卖出货舱里的特产；产地不收购本地特产。 */
export function sellAirshipCargo(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack | undefined,
  goodId: AirshipGoodId,
  qty: number,
  now: Date,
  expectedDayKey?: string
): { ok: boolean; reason?: string; goodId?: AirshipGoodId; qty?: number; unitPrice?: number; total?: number; profit?: number; bonusPct?: number } {
  ensurePlayerExtensions(player);
  if (!isValidAirshipGoodId(goodId)) return { ok: false, reason: "未知的特产" };
  const at = ensureAirshipTrade(player, now);
  if (expectedDayKey !== undefined && expectedDayKey !== at.dayKey) {
    return { ok: false, reason: `日期已更替：飞艇集市今天是 ${at.dayKey}，请刷新后再试` };
  }
  if (at.voyage) return { ok: false, reason: "飞艇正在航行中，抵港后才能交易" };
  const def = getAirshipGoodDef(goodId);
  const name = tavernItemName(contentPack, goodId);
  const town = getAirshipTownDef(at.location);
  if (def.origin === at.location) return { ok: false, reason: `${town.name}是「${name}」的产地，不收购本地特产` };
  const held = at.cargo[goodId] || 0;
  if (held <= 0) return { ok: false, reason: `货舱里没有「${name}」` };
  const bonus = at.arrivedVia && at.routes[at.arrivedVia] ? getAirshipRouteLevel(at.routes[at.arrivedVia]!.xp).sellBonusPct : 0;
  const today = airshipDayIndexFromKey(at.dayKey)!;
  const plan = planAirshipSell(today, at.location, goodId, qty, at.cargo, at.cargoCost, bonus);
  if (plan.qty <= 0) return { ok: false, reason: `卖出件数需为 1 ~ ${AIRSHIP_MAX_TRADE_QTY} 的整数` };
  if (!plan.ok) return { ok: false, reason: `货舱里只有 ${held} 件「${name}」` };
  player.inventory.gold = airshipGold(player) + plan.total;
  if (player.stats) player.stats.totalGoldEarned = (player.stats.totalGoldEarned || 0) + plan.total;
  const left = held - plan.qty;
  const cargo = { ...at.cargo };
  const cost = { ...at.cargoCost };
  if (left > 0) {
    cargo[goodId] = left;
    cost[goodId] = Math.max(0, (cost[goodId] || 0) - plan.costShare);
  } else {
    delete cargo[goodId];
    delete cost[goodId];
  }
  at.cargo = cargo;
  at.cargoCost = cost;
  at.totalSales = Math.min(AIRSHIP_COUNTER_CAP, at.totalSales + plan.total);
  at.totalProfit = airshipSignedInt(at.totalProfit + plan.profit);
  at.lastSale = { goodId, townId: at.location, qty: plan.qty, gold: plan.total, profit: plan.profit, at: now.toISOString() };
  addReputation(player, plan.profit > 0 ? 2 : 1);
  syncAchievements(player);
  appendLog(
    player,
    `浮空飞艇商路：在${town.name}卖出「${name}」×${plan.qty}（单价 ${plan.unitPrice}${plan.bonusPct > 0 ? `，含航线加成 +${plan.bonusPct}%` : ""}），收入 ${plan.total} 金币，${
      plan.profit >= 0 ? `盈利 ${plan.profit}` : `亏损 ${-plan.profit}`
    }。`
  );
  return { ok: true, goodId, qty: plan.qty, unitPrice: plan.unitPrice, total: plan.total, profit: plan.profit, bonusPct: plan.bonusPct };
}

/** 起航：沿已开辟的航线从当前港口飞往另一端（航程由航线等级与船体决定；抵港只在显式 now 到点时结算）。 */
export function launchAirshipVoyage(
  player: EnhancedPlayerState,
  routeId: AirshipRouteId,
  now: Date
): { ok: boolean; reason?: string; routeId?: AirshipRouteId; from?: AirshipTownId; to?: AirshipTownId; arrivesAt?: string; durationMs?: number; cargoUnits?: number; xpOnArrival?: number } {
  ensurePlayerExtensions(player);
  if (!isValidAirshipRouteId(routeId)) return { ok: false, reason: "未知的飞艇航线" };
  const at = ensureAirshipTrade(player, now);
  if (at.voyage) return { ok: false, reason: `飞艇正在飞往${getAirshipTownDef(at.voyage.to).name}` };
  const def = getAirshipRouteDef(routeId);
  const route = at.routes[routeId];
  if (!route) return { ok: false, reason: `尚未开辟「${def.name}」` };
  const to = airshipRouteDestination(routeId, at.location);
  if (!to) return { ok: false, reason: `飞艇停在${getAirshipTownDef(at.location).name}，「${def.name}」不经过这里` };
  const durationMs = getAirshipVoyageMs(routeId, route.xp, at.hullLevel);
  const cargoUnits = airshipCargoUnits(at.cargo);
  const from = at.location;
  at.voyage = {
    routeId,
    from,
    to,
    departedAt: now.toISOString(),
    arrivesAt: new Date(now.getTime() + durationMs).toISOString(),
    cargoUnits,
  };
  at.arrivedVia = null;
  appendLog(
    player,
    `浮空飞艇沿「${def.name}」从${getAirshipTownDef(from).name}起航，预计 ${Math.round(durationMs / 60_000)} 分钟后抵达${getAirshipTownDef(to).name}（载货 ${cargoUnits} 件）。`
  );
  return { ok: true, routeId, from, to, arrivesAt: at.voyage.arrivesAt, durationMs, cargoUnits, xpOnArrival: airshipVoyageXp(cargoUnits) };
}

/** 船坞升级船体：金币 + 真实生活职业成品（木板 / 金属锭 / 丝线 / 水晶），扩容货舱并缩短航程。 */
export function upgradeAirshipHull(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack | undefined,
  now: Date
): { ok: boolean; reason?: string; hullLevel?: number; capacity?: number; spentGold?: number } {
  ensurePlayerExtensions(player);
  const at = ensureAirshipTrade(player, now);
  if (at.voyage) return { ok: false, reason: "飞艇正在航行中，回港后才能进坞升级" };
  const plan = planAirshipHullUpgrade(at.hullLevel, airshipGold(player), player.inventory);
  if (plan.maxed || !plan.next) return { ok: false, reason: `船体已是最高等级「${plan.current.name}」` };
  const next = plan.next;
  if (!plan.goldOk) return { ok: false, reason: `金币不足：升级「${next.name}」需 ${next.costGold} 金币` };
  if (!plan.materialsOk) {
    const missing = plan.materials
      .filter((m) => m.have < m.need)
      .map((m) => `${tavernItemName(contentPack, m.itemId)} ×${m.need}（现有 ${m.have}）`)
      .join("、");
    return { ok: false, reason: `材料不足：${missing}` };
  }
  player.inventory.gold = airshipGold(player) - next.costGold;
  if (player.stats) player.stats.totalGoldSpent = (player.stats.totalGoldSpent || 0) + next.costGold;
  for (const m of plan.materials) {
    player.inventory[m.itemId] = Math.floor(Number(player.inventory[m.itemId] || 0)) - m.need;
    if (player.inventory[m.itemId] <= 0) delete player.inventory[m.itemId];
  }
  at.hullLevel = next.level;
  addReputation(player, 3);
  syncAchievements(player);
  appendLog(player, `浮空飞艇进坞升级为「${next.name}」：货舱 ${next.capacity} 件，航程缩短 ${next.speedPct}%。`);
  return { ok: true, hullLevel: next.level, capacity: next.capacity, spentGold: next.costGold };
}

/** 荣誉试炼对决：与天空竞技场同一沙盒（满血、无临时增益、真实 hp_combat 引擎、10 分钟上限）。 */
export function simulatePaladinTrialDuel(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack,
  opponent: PaladinOpponent,
  now: Date
): ArenaDuelResult {
  return simulateSandboxDuel(player, contentPack, paladinOpponentMonster(opponent), now);
}

/** 挑战本周下一关试炼：消耗 1 次本周挑战次数；胜则首通领取荣誉勋章（六关全通再 +10），负 / 超时只记录战绩。 */
export function challengePaladinTrial(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack | undefined,
  stage: number,
  now: Date,
  expectedWeekKey?: string
): {
  ok: boolean;
  reason?: string;
  won?: boolean;
  timeout?: boolean;
  stage?: number;
  opponentName?: string;
  medals?: number;
  fullClear?: boolean;
  attemptsLeft?: number;
  duel?: ArenaDuelResult;
} {
  ensurePlayerExtensions(player);
  if (!contentPack) return { ok: false, reason: "荣誉试炼暂未开放（缺少内容包）" };
  const pt = ensurePaladinTrial(player, now);
  if (expectedWeekKey !== undefined && expectedWeekKey !== pt.weekKey) {
    return { ok: false, reason: `试炼已轮换：本周从 ${pt.weekKey} 开始，请刷新后再试` };
  }
  const next = pt.cleared.length + 1;
  if (next > PALADIN_STAGES.length) return { ok: false, reason: "本周六关试炼已全部通过，下周一换新的誓约与幻影" };
  if (stage !== next) return { ok: false, reason: `试炼需按顺序挑战：当前应挑战第 ${next} 关「${PALADIN_STAGES[next - 1].name}」` };
  if (pt.attemptsUsed >= PALADIN_WEEKLY_ATTEMPTS) {
    return { ok: false, reason: `本周挑战次数已用完（每周 ${PALADIN_WEEKLY_ATTEMPTS} 次），下周一 0 点重置` };
  }
  const weekIndex = paladinWeekIndexFromKey(pt.weekKey)!;
  const opponent = generatePaladinOpponent(weekIndex, next);
  const duel = simulatePaladinTrialDuel(player, contentPack, opponent, now);
  pt.attemptsUsed += 1;
  let medals = 0;
  let fullClear = false;
  if (duel.won) {
    const reward = getPaladinStageReward(next);
    medals = reward.medals;
    fullClear = reward.fullClear;
    pt.cleared = [...pt.cleared, next];
    pt.medals = Math.min(PALADIN_MEDAL_CAP, pt.medals + medals);
    pt.totalMedals = Math.min(PALADIN_MEDAL_CAP, pt.totalMedals + medals);
    pt.bestStage = Math.max(pt.bestStage, next);
    pt.totalWins += 1;
    if (fullClear) pt.weeksFullCleared += 1;
  } else {
    pt.totalLosses += 1;
  }
  pt.lastDuel = {
    weekKey: pt.weekKey,
    stage: next,
    opponentName: opponent.name,
    won: duel.won,
    timeout: duel.timeout,
    playerHpLeft: duel.playerHpLeft,
    playerMaxHp: duel.playerMaxHp,
    enemyHpLeft: duel.enemyHpLeft,
    enemyMaxHp: duel.enemyMaxHp,
    durationMs: duel.durationMs,
    medals,
    at: now.toISOString(),
  };
  addReputation(player, duel.won ? 3 : 1);
  syncAchievements(player);
  const secs = Math.max(1, Math.round(duel.durationMs / 1000));
  if (duel.won) {
    appendLog(
      player,
      `圣骑士团荣誉试炼第 ${next} 关「${opponent.stageName}」：击败「${opponent.name}」（${secs} 秒），荣誉勋章 +${medals}${fullClear ? "（本周六关全通！）" : ""}。`
    );
  } else {
    appendLog(
      player,
      `圣骑士团荣誉试炼第 ${next} 关「${opponent.stageName}」：${duel.timeout ? "10 分钟未分胜负，判负" : "败给"}「${opponent.name}」（剩余 ${duel.enemyHpLeft}/${duel.enemyMaxHp} 生命）。`
    );
  }
  return {
    ok: true,
    won: duel.won,
    timeout: duel.timeout,
    stage: next,
    opponentName: opponent.name,
    medals,
    fullClear,
    attemptsLeft: PALADIN_WEEKLY_ATTEMPTS - pt.attemptsUsed,
    duel,
  };
}

/** 誓言升阶：花荣誉勋章把一项誓言升 1 阶（满 5 阶；第 n 阶需荣誉位阶 ≥ n-1），永久加成逐项封顶。 */
export function upgradePaladinVirtue(
  player: EnhancedPlayerState,
  virtueId: PaladinVirtueId,
  now: Date
): { ok: boolean; reason?: string; virtueId?: PaladinVirtueId; rank?: number; cost?: number; medalsLeft?: number } {
  ensurePlayerExtensions(player);
  if (!isValidPaladinVirtueId(virtueId)) return { ok: false, reason: "未知的誓言" };
  const pt = ensurePaladinTrial(player, now);
  const def = PALADIN_VIRTUES.find((v) => v.id === virtueId)!;
  const plan = planPaladinVirtue(pt.virtues, virtueId, pt.medals, pt.totalMedals);
  if (plan.maxed) return { ok: false, reason: `「${def.name}」已满 ${PALADIN_VIRTUE_MAX_RANK} 阶（加成封顶）` };
  if (!plan.rankOk) {
    const need = PALADIN_HONOR_RANKS[plan.needHonorRank];
    return { ok: false, reason: `「${def.name}」第 ${plan.nextRank} 阶需荣誉位阶达到「${need.name}」（累计勋章 ${need.minMedals}）` };
  }
  if (!plan.enough) return { ok: false, reason: `荣誉勋章不足：「${def.name}」第 ${plan.nextRank} 阶需 ${plan.cost} 枚` };
  pt.medals -= plan.cost;
  pt.virtues = { ...pt.virtues, [virtueId]: plan.nextRank };
  addReputation(player, 2);
  syncAchievements(player);
  appendLog(player, `圣骑士团：「${def.name}」升至第 ${plan.nextRank} 阶，花费荣誉勋章 ${plan.cost} 枚。`);
  return { ok: true, virtueId, rank: plan.nextRank, cost: plan.cost, medalsLeft: pt.medals };
}

/** 构造前端「浮空飞艇商路 & 圣骑士团荣誉试炼」视图（会补齐两份状态，并按显式 now 换日 / 抵港 / 翻周；附带未通关各关的真实引擎预演）。 */
export function getAirshipPaladinInfo(player: EnhancedPlayerState, contentPack: EnhancedContentPack | undefined, now: Date) {
  ensurePlayerExtensions(player);
  const { at, pt } = ensureAirshipPaladinClocks(player, now);
  const itemName = (id: string) => tavernItemName(contentPack, id);
  const have = (id: string) => Math.floor(Number(player.inventory[id] || 0));
  const gold = airshipGold(player);
  const today = airshipDayIndexFromKey(at.dayKey)!;
  const hull = getAirshipHull(at.hullLevel);
  const hullPlan = planAirshipHullUpgrade(at.hullLevel, gold, player.inventory);
  const cargoUnits = airshipCargoUnits(at.cargo);
  const arrivedLevel = at.arrivedVia && at.routes[at.arrivedVia] ? getAirshipRouteLevel(at.routes[at.arrivedVia]!.xp) : null;
  const sellBonusPct = arrivedLevel ? arrivedLevel.sellBonusPct : 0;
  const townName = (id: AirshipTownId) => getAirshipTownDef(id).name;

  const routes = AIRSHIP_ROUTES.map((r) => {
    const rec = at.routes[r.id];
    const lv = getAirshipRouteLevel(rec?.xp ?? 0);
    const dest = airshipRouteDestination(r.id, at.location);
    let openBlock: string | null = null;
    if (rec) openBlock = "已开通";
    else if (at.hullLevel < r.minHull) openBlock = `需船体 ${r.minHull} 级`;
    else if (gold < r.openCost) openBlock = "金币不足";
    let launchBlock: string | null = null;
    if (!rec) launchBlock = "尚未开辟";
    else if (at.voyage) launchBlock = "航行中";
    else if (!dest) launchBlock = `不经过${townName(at.location)}`;
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      from: r.from,
      to: r.to,
      fromName: townName(r.from),
      toName: townName(r.to),
      fromArt: getAirshipTownDef(r.from).artId,
      toArt: getAirshipTownDef(r.to).artId,
      baseMinutes: r.baseMinutes,
      openCost: r.openCost,
      minHull: r.minHull,
      opened: Boolean(rec),
      xp: lv.xp,
      voyages: rec?.voyages ?? 0,
      level: lv.level,
      speedPct: lv.speedPct,
      sellBonusPct: lv.sellBonusPct,
      next: lv.next ? { level: lv.next.level, minXp: lv.next.minXp, speedPct: lv.next.speedPct, sellBonusPct: lv.next.sellBonusPct } : null,
      progressPct: lv.progressPct,
      durationMs: getAirshipVoyageMs(r.id, rec?.xp ?? 0, at.hullLevel),
      destination: dest,
      destinationName: dest ? townName(dest) : null,
      canOpen: openBlock === null,
      openBlock,
      canLaunch: launchBlock === null,
      launchBlock,
    };
  });

  const goodView = (id: AirshipGoodId) => {
    const g = getAirshipGoodDef(id);
    return { id, name: itemName(id), origin: g.origin, originName: townName(g.origin), basePrice: g.basePrice, minHull: g.minHull, unlocked: at.hullLevel >= g.minHull };
  };
  const market = getAirshipMarket(today).map((m) => ({
    townId: m.townId,
    townName: townName(m.townId),
    artId: getAirshipTownDef(m.townId).artId,
    here: m.townId === at.location,
    buys: m.buys.map((q) => ({
      ...goodView(q.goodId),
      pct: q.pct,
      price: q.price,
      prevPrice: getAirshipBuyQuote(today - 1, q.goodId)!.price,
      stockLeft: AIRSHIP_DAILY_STOCK - (at.boughtToday[q.goodId] || 0),
    })),
    sells: m.sells.map((q) => ({
      ...goodView(q.goodId),
      pct: q.pct,
      price: q.listPrice,
      prevPrice: getAirshipSellQuote(today - 1, m.townId, q.goodId)!.listPrice,
      held: at.cargo[q.goodId] || 0,
    })),
  }));

  const weekIndex = paladinWeekIndexFromKey(pt.weekKey)!;
  const theme = getPaladinTheme(weekIndex);
  const lineup = getPaladinTrialLineup(weekIndex);
  const nextStage = pt.cleared.length < PALADIN_STAGES.length ? pt.cleared.length + 1 : null;
  const mechanicTable = ((contentPack as any)?.bossMechanics || []) as Array<{ id: string; label?: string; desc?: string }>;
  const mechanicView = (id: string) => {
    const m = mechanicTable.find((x) => x.id === id);
    return { id, label: m?.label || id, desc: m?.desc || "" };
  };
  const buildRef: { v: ArenaDuelResult["player"] | null } = { v: null };
  const stages = lineup.map((o) => {
    const cleared = pt.cleared.includes(o.stage);
    const preview = !cleared && contentPack ? simulatePaladinTrialDuel(player, contentPack, o, now) : null;
    if (preview && !buildRef.v) buildRef.v = preview.player;
    const reward = getPaladinStageReward(o.stage);
    return {
      ...o,
      mechanicsInfo: o.mechanics.map(mechanicView),
      cleared,
      isNext: nextStage === o.stage,
      locked: nextStage !== null && o.stage > nextStage,
      reward,
      preview: preview
        ? {
            won: preview.won,
            timeout: preview.timeout,
            playerHpLeft: preview.playerHpLeft,
            playerMaxHp: preview.playerMaxHp,
            enemyHpLeft: preview.enemyHpLeft,
            enemyMaxHp: preview.enemyMaxHp,
            durationMs: preview.durationMs,
          }
        : null,
    };
  });
  const honor = getPaladinHonorRank(pt.totalMedals);
  const virtues = PALADIN_VIRTUES.map((v) => {
    const plan = planPaladinVirtue(pt.virtues, v.id, pt.medals, pt.totalMedals);
    let block: string | null = null;
    if (plan.maxed) block = "已满阶";
    else if (!plan.rankOk) block = `需「${PALADIN_HONOR_RANKS[plan.needHonorRank].name}」`;
    else if (!plan.enough) block = "勋章不足";
    const stats: PaladinStats = {};
    for (const k of PALADIN_STAT_KEYS) if (v.perRank[k]) stats[k] = (v.perRank[k] || 0) * plan.rank;
    return {
      id: v.id,
      name: v.name,
      description: v.description,
      perRank: v.perRank,
      rank: plan.rank,
      maxRank: PALADIN_VIRTUE_MAX_RANK,
      stats,
      nextRank: plan.nextRank,
      cost: plan.cost,
      needHonorRank: plan.needHonorRank,
      needHonorName: PALADIN_HONOR_RANKS[plan.needHonorRank].name,
      canUpgrade: plan.ok,
      block,
    };
  });

  return {
    nowMs: now.getTime(),
    bonuses: getPaladinTrialBonuses(player),
    airship: {
      dayKey: at.dayKey,
      dayEndsAtMs: (today + 1) * 86_400_000 - AIRSHIP_TZ_OFFSET_MINUTES * 60_000,
      gold,
      location: { id: at.location, name: townName(at.location), artId: getAirshipTownDef(at.location).artId },
      hull: {
        level: hull.level,
        name: hull.name,
        capacity: hull.capacity,
        speedPct: hull.speedPct,
        maxLevel: AIRSHIP_HULLS.length,
        next: hullPlan.next
          ? {
              level: hullPlan.next.level,
              name: hullPlan.next.name,
              capacity: hullPlan.next.capacity,
              speedPct: hullPlan.next.speedPct,
              costGold: hullPlan.next.costGold,
              materials: hullPlan.materials.map((m) => ({ ...m, name: itemName(m.itemId) })),
            }
          : null,
        canUpgrade: hullPlan.ok && !at.voyage,
        block: hullPlan.maxed
          ? "已满级"
          : at.voyage
            ? "航行中"
            : !hullPlan.goldOk
              ? "金币不足"
              : !hullPlan.materialsOk
                ? "材料不足"
                : null,
      },
      cargo: AIRSHIP_GOOD_IDS.filter((id) => (at.cargo[id] || 0) > 0).map((id) => ({
        ...goodView(id),
        qty: at.cargo[id] || 0,
        cost: at.cargoCost[id] || 0,
      })),
      cargoMap: at.cargo,
      cargoCost: at.cargoCost,
      boughtToday: at.boughtToday,
      cargoUnits,
      capacity: hull.capacity,
      voyage: at.voyage
        ? {
            ...at.voyage,
            routeName: getAirshipRouteDef(at.voyage.routeId).name,
            fromName: townName(at.voyage.from),
            toName: townName(at.voyage.to),
            departedAtMs: Date.parse(at.voyage.departedAt),
            arrivesAtMs: Date.parse(at.voyage.arrivesAt),
            xpOnArrival: airshipVoyageXp(at.voyage.cargoUnits),
          }
        : null,
      arrivedVia: at.arrivedVia && arrivedLevel ? { routeId: at.arrivedVia, name: getAirshipRouteDef(at.arrivedVia).name, level: arrivedLevel.level, sellBonusPct } : null,
      sellBonusPct,
      towns: AIRSHIP_TOWNS.map((t) => ({
        id: t.id,
        name: t.name,
        artId: t.artId,
        source: t.source,
        description: t.description,
        here: t.id === at.location,
        specialties: AIRSHIP_GOODS.filter((g) => g.origin === t.id).map((g) => g.id),
      })),
      goods: AIRSHIP_GOOD_IDS.map(goodView),
      routes,
      routesOpened: Object.keys(at.routes).length,
      market,
      dailyStock: AIRSHIP_DAILY_STOCK,
      maxTradeQty: AIRSHIP_MAX_TRADE_QTY,
      totals: { voyages: at.totalVoyages, sales: at.totalSales, spent: at.totalSpent, profit: at.totalProfit },
      lastSale: at.lastSale ? { ...at.lastSale, name: itemName(at.lastSale.goodId), townName: townName(at.lastSale.townId) } : null,
      lastArrival: at.lastArrival
        ? { ...at.lastArrival, routeName: getAirshipRouteDef(at.lastArrival.routeId).name, toName: townName(at.lastArrival.to) }
        : null,
      hulls: AIRSHIP_HULLS.map((h) => ({ level: h.level, name: h.name, capacity: h.capacity, speedPct: h.speedPct, reached: at.hullLevel >= h.level })),
      materialsHave: Object.fromEntries(
        [...new Set(AIRSHIP_HULLS.flatMap((h) => Object.keys(h.materials)))].map((id) => [id, have(id)])
      ),
    },
    trial: {
      weekKey: pt.weekKey,
      weekEndsAtMs: PALADIN_WEEK_EPOCH_MS + (weekIndex + 1) * PALADIN_WEEK_MS - PALADIN_TZ_OFFSET_MINUTES * 60_000,
      theme: { id: theme.id, name: theme.name, description: theme.description, mechanics: theme.mechanics.map(mechanicView) },
      nextWeekTheme: { id: getPaladinTheme(weekIndex + 1).id, name: getPaladinTheme(weekIndex + 1).name },
      attemptsUsed: pt.attemptsUsed,
      attemptsLeft: PALADIN_WEEKLY_ATTEMPTS - pt.attemptsUsed,
      weeklyAttempts: PALADIN_WEEKLY_ATTEMPTS,
      cleared: pt.cleared,
      nextStage,
      stages,
      player: buildRef.v,
      medals: pt.medals,
      totalMedals: pt.totalMedals,
      fullClearBonus: PALADIN_FULL_CLEAR_BONUS,
      honor: {
        rank: honor.current.rank,
        name: honor.current.name,
        next: honor.next ? { rank: honor.next.rank, name: honor.next.name, minMedals: honor.next.minMedals } : null,
        progressPct: honor.progressPct,
        ranks: PALADIN_HONOR_RANKS.map((r) => ({ ...r, reached: honor.totalMedals >= r.minMedals })),
      },
      virtues,
      caps: PALADIN_BONUS_CAPS,
      bestStage: pt.bestStage,
      weeksFullCleared: pt.weeksFullCleared,
      totalWins: pt.totalWins,
      totalLosses: pt.totalLosses,
      lastDuel: pt.lastDuel,
    },
  };
}

/* ============================ 矮人地底矿脉 & 精灵林地驿站 (WL-17) ============================ */
// 前端 frontend/src/gameplay/dwarfElf.ts 逐表逐式 1:1 镜像（scripts/dwarf-elf-parity.test.ts 守护，
// 「WL-17 core」区段两端逐字一致）。
// - 矮人地底矿脉（转生永久保留，在途矿车清空）：六个矿层，每层两种内容包真实矿石（铁匠「挖掘」行动产出、锻造「冶炼」
//   行动消耗）与一种伴生锻造材料（锻造配方真实消耗）。东八区日序号哈希确定每层当天的矿种与品位（贫 / 中 / 富 / 极品），
//   每层每日 2 车；派矿车下井按矿车容量 × 品位倍率带回矿石（富矿 / 极品另带伴生材料），直接入背包接入既有锻造材料。
//   矿道深度（金币 + 坑木木板 + 铁轨金属锭）决定能下到第几层，铁匠采矿等级决定当世能否下到该层（转生后需重新练级）；
//   矿车 1~5 级提高装载量并缩短出车时长。换日与回矿只在显式传入 now 时发生。
// - 精灵林地驿站（转生永久保留）：每个东八区日按张贴时的好感等级张贴三张委托——两张采集委托交出内容包真实采集行动的
//   产出，一张远征委托读取存档里已有的远征商队返航 / 星界遗迹勘探 / 浮空飞艇抵港计数（以张贴时为基线，不新增计数器）；
//   完成委托累积林地好感（全清额外 +6），好感等级给只作用于采集行动的永久加成，逐项封顶（采集速度 5% / 采集产出效率 4% /
//   采集经验 3%），接入 getActionRates。
/* ---- 以下为与后端逐字对称的表与纯函数（WL-17 core） ---- */

export const MINE_GRADE_IDS: readonly MineGradeId[] = ["lean", "common", "rich", "bonanza"];

export const ELF_EXPEDITION_SOURCE_IDS: readonly ElfExpeditionSourceId[] = ["caravan_runs", "relic_surveys", "airship_voyages"];

/** 矮人矿脉与精灵驿站都按东八区日期（每日 0 点）换日：矿脉品位与委托板随之轮换。 */
export const MINE_TZ_OFFSET_MINUTES = 480;
/** 每个矿层每个东八区日可出车的次数（矿脉当日储量）。 */
export const MINE_HAULS_PER_LAYER_PER_DAY = 2;
/** 每层矿道折合的竖井深度（米，仅展示）。 */
export const MINE_METERS_PER_LAYER = 120;
/** 计数器上限（防脏档溢出）。 */
export const MINE_COUNTER_CAP = 1_000_000_000;
/** 每日委托板的三个栏位：0、1 为采集委托，2 为远征委托。 */
export const ELF_BOARD_SLOTS: readonly number[] = [0, 1, 2];
export const ELF_EXPEDITION_SLOT = 2;
/** 当日三张委托全部完成的额外林地好感。 */
export const ELF_FULL_BOARD_BONUS = 6;
/** 林地好感上限（只增不减）。 */
export const ELF_FAVOR_CAP = 99_999;

export interface MineGradeDef {
  id: MineGradeId;
  name: string;
  /** 抽中权重（四档合计 100）。 */
  weight: number;
  /** 矿石产量倍率（百分比，整数运算两端一致）。 */
  yieldPct: number;
  /** 每车额外带回的伴生锻造材料件数。 */
  byproduct: number;
}

export const MINE_GRADES: readonly MineGradeDef[] = [
  { id: "lean", name: "贫矿", weight: 30, yieldPct: 70, byproduct: 0 },
  { id: "common", name: "中品", weight: 40, yieldPct: 100, byproduct: 0 },
  { id: "rich", name: "富矿", weight: 22, yieldPct: 135, byproduct: 1 },
  { id: "bonanza", name: "极品", weight: 8, yieldPct: 180, byproduct: 3 },
];

export interface MineLayerDef {
  layer: number;
  name: string;
  /** 本层可能出现的矿脉：内容包真实矿石（铁匠「挖掘」行动产出、锻造「冶炼」行动消耗）。 */
  ores: readonly string[];
  /** 本层的伴生锻造材料：内容包真实物品（锻造配方消耗）。 */
  byproductId: string;
  /** 下到本层所需的铁匠采矿等级 = 内容包挖掘本层首种矿石的等级要求。 */
  minMiningLevel: number;
  /** 出车基准时长（分钟）。 */
  baseMinutes: number;
  description: string;
}

export const MINE_LAYERS: readonly MineLayerDef[] = [
  {
    layer: 1,
    name: "苔石浅坑道",
    ores: ["ore_1", "ore_2"],
    byproductId: "crystal_1",
    minMiningLevel: 1,
    baseMinutes: 10,
    description: "矮人老矿工口中的练手坑，铜铁矿脉沿着苔石裂缝铺开，偶尔夹着微光水晶。",
  },
  {
    layer: 2,
    name: "回声矿廊",
    ores: ["ore_3", "ore_4"],
    byproductId: "frost_shard",
    minMiningLevel: 24,
    baseMinutes: 14,
    description: "敲一镐能听见三声回响，银金矿脉旁常冻着霜寒碎晶。",
  },
  {
    layer: 3,
    name: "熔脉断层",
    ores: ["ore_5", "ore_6"],
    byproductId: "obsidian_chunk",
    minMiningLevel: 48,
    baseMinutes: 18,
    description: "地热把岩层烤得发红，白金与秘银矿脉之间嵌着黑曜石块。",
  },
  {
    layer: 4,
    name: "冰核深渊",
    ores: ["ore_7", "ore_8"],
    byproductId: "glacier_core",
    minMiningLevel: 72,
    baseMinutes: 22,
    description: "越往下反而越冷，精金与玄铁矿脉缠着冰川之核。",
  },
  {
    layer: 5,
    name: "圣辉矿穹",
    ores: ["ore_9", "ore_10"],
    byproductId: "holy_gold",
    minMiningLevel: 96,
    baseMinutes: 26,
    description: "矿穹顶上透下微光，神域秘银与星陨神铁之间能凿出圣辉金。",
  },
  {
    layer: 6,
    name: "炼狱心核",
    ores: ["ore_11", "ore_12"],
    byproductId: "infernal_core",
    minMiningLevel: 120,
    baseMinutes: 30,
    description: "矮人传说里的世界之底，创世圣矿与寰宇原矿紧挨着炼狱之核。",
  },
];

export interface MineDepthDef {
  /** 矿道深度 = 能下到的最深矿层。 */
  depth: number;
  name: string;
  /** 掘进到该深度的金币花费（1 级为初始矿道）。 */
  costGold: number;
  /** 掘进消耗的真实生活职业成品（坑木支护 + 铁轨）。 */
  materials: Record<string, number>;
}

export const MINE_DEPTHS: readonly MineDepthDef[] = [
  { depth: 1, name: "浅层矿道", costGold: 0, materials: {} },
  { depth: 2, name: "回声支护矿道", costGold: 2500, materials: { lumber_2: 20, ingot_2: 15 } },
  { depth: 3, name: "隔热石拱矿道", costGold: 8000, materials: { lumber_4: 20, ingot_4: 15 } },
  { depth: 4, name: "寒铁加固矿道", costGold: 25000, materials: { lumber_6: 20, ingot_6: 15 } },
  { depth: 5, name: "符文穹顶矿道", costGold: 70000, materials: { lumber_8: 20, ingot_8: 15 } },
  { depth: 6, name: "世界之底竖井", costGold: 180000, materials: { lumber_10: 20, ingot_10: 15 } },
];

export interface MineCartDef {
  level: number;
  name: string;
  /** 每车装载的矿石基数（块，再乘矿脉品位）。 */
  capacity: number;
  /** 出车时长缩短（百分点）。 */
  speedPct: number;
  /** 升到该级的金币花费（1 级为初始矿车）。 */
  costGold: number;
  /** 升到该级消耗的真实生活职业成品。 */
  materials: Record<string, number>;
}

export const MINE_CARTS: readonly MineCartDef[] = [
  { level: 1, name: "木轮矿车", capacity: 8, speedPct: 0, costGold: 0, materials: {} },
  { level: 2, name: "铁箍矿车", capacity: 12, speedPct: 5, costGold: 1200, materials: { lumber_1: 12, ingot_2: 10 } },
  { level: 3, name: "银轴矿车", capacity: 16, speedPct: 10, costGold: 4500, materials: { lumber_3: 10, ingot_3: 12 } },
  { level: 4, name: "精钢矿车", capacity: 21, speedPct: 15, costGold: 15000, materials: { lumber_5: 10, ingot_5: 12 } },
  { level: 5, name: "符文矿车", capacity: 27, speedPct: 20, costGold: 45000, materials: { lumber_7: 10, ingot_7: 12 } },
];

export interface ElfStats {
  gatherSpeedPct?: number;
  gatherEfficiencyPct?: number;
  gatherXpPct?: number;
}

export const ELF_STAT_KEYS: readonly (keyof ElfStats)[] = ["gatherSpeedPct", "gatherEfficiencyPct", "gatherXpPct"];

/** 林地好感永久加成封顶（最高好感等级恰好到顶；脏档再高也不会超过）。 */
export const ELF_BONUS_CAPS: Required<ElfStats> = { gatherSpeedPct: 5, gatherEfficiencyPct: 4, gatherXpPct: 3 };

export interface ElfFavorTierDef {
  tier: number;
  /** 累计林地好感达到该值即晋升。 */
  minFavor: number;
  name: string;
  /** 该等级的永久加成（只作用于采集行动）。 */
  stats: ElfStats;
}

export const ELF_FAVOR_TIERS: readonly ElfFavorTierDef[] = [
  { tier: 0, minFavor: 0, name: "陌生旅人", stats: {} },
  { tier: 1, minFavor: 30, name: "林间访客", stats: { gatherSpeedPct: 1 } },
  { tier: 2, minFavor: 90, name: "树语之友", stats: { gatherSpeedPct: 2, gatherXpPct: 1 } },
  { tier: 3, minFavor: 200, name: "月桂同伴", stats: { gatherSpeedPct: 3, gatherEfficiencyPct: 2, gatherXpPct: 1 } },
  { tier: 4, minFavor: 380, name: "精灵挚友", stats: { gatherSpeedPct: 4, gatherEfficiencyPct: 3, gatherXpPct: 2 } },
  { tier: 5, minFavor: 650, name: "林地守望者", stats: { gatherSpeedPct: 5, gatherEfficiencyPct: 4, gatherXpPct: 3 } },
];

export interface ElfExpeditionSourceDef {
  id: ElfExpeditionSourceId;
  name: string;
  /** 读数出处（存档里已有的真实计数，不新增计数器）。 */
  source: string;
  /** 图标：复用既有系统的真实美术（skills/<artId>）。 */
  artId: string;
  unit: string;
}

export const ELF_EXPEDITION_SOURCES: readonly ElfExpeditionSourceDef[] = [
  { id: "caravan_runs", name: "远征商车满载归来", source: "远征商队", artId: "caravan_hub_banner", unit: "趟" },
  { id: "relic_surveys", name: "星界遗迹勘探", source: "星界遗迹勘探队", artId: "astral_ruin_compass", unit: "次" },
  { id: "airship_voyages", name: "浮空飞艇抵港", source: "浮空飞艇商路", artId: "trade_airship", unit: "趟" },
];

export interface ElfGatherCommissionDef {
  id: string;
  /** 委托的精灵。 */
  client: string;
  /** 内容包真实采集行动（委托所需物品即其产出）。 */
  actionId: string;
  itemId: string;
  qty: number;
  favor: number;
  gold: number;
  /** 张贴所需的林地好感等级。 */
  minTier: number;
}

export const ELF_GATHER_COMMISSIONS: readonly ElfGatherCommissionDef[] = [
  { id: "elf_poplar", client: "林语者艾菈", actionId: "act_chop_wood_t1", itemId: "wood_1", qty: 20, favor: 5, gold: 280, minTier: 0 },
  { id: "elf_cotton", client: "织叶人茜尔", actionId: "act_gather_fiber_t1", itemId: "fiber_1", qty: 20, favor: 5, gold: 280, minTier: 0 },
  { id: "elf_river", client: "溪畔歌者洛恩", actionId: "act_fish_river_t1", itemId: "fish_river", qty: 12, favor: 5, gold: 300, minTier: 0 },
  { id: "elf_glow", client: "萤光学徒菲雅", actionId: "act_mine_crystal_t1", itemId: "crystal_1", qty: 15, favor: 5, gold: 220, minTier: 0 },
  { id: "elf_copper", client: "林地铁匠托维", actionId: "act_mine_ore_t1", itemId: "ore_1", qty: 15, favor: 5, gold: 220, minTier: 0 },
  { id: "elf_hemlock", client: "林语者艾菈", actionId: "act_chop_wood_t2", itemId: "wood_2", qty: 18, favor: 7, gold: 450, minTier: 1 },
  { id: "elf_flax", client: "织叶人茜尔", actionId: "act_gather_fiber_t2", itemId: "fiber_2", qty: 18, favor: 7, gold: 450, minTier: 1 },
  { id: "elf_shrimp", client: "溪畔歌者洛恩", actionId: "act_fish_shrimp_t1", itemId: "shrimp", qty: 12, favor: 7, gold: 320, minTier: 1 },
  { id: "elf_grain", client: "月桂园丁薇拉", actionId: "act_plant_grain_t1", itemId: "grain", qty: 30, favor: 7, gold: 200, minTier: 1 },
  { id: "elf_willow", client: "林语者艾菈", actionId: "act_chop_wood_t3", itemId: "wood_3", qty: 15, favor: 9, gold: 700, minTier: 2 },
  { id: "elf_herb", client: "月桂园丁薇拉", actionId: "act_plant_herb_t3", itemId: "herb_farm", qty: 12, favor: 9, gold: 420, minTier: 2 },
  { id: "elf_lake", client: "溪畔歌者洛恩", actionId: "act_fish_t3", itemId: "fish_lake", qty: 10, favor: 9, gold: 780, minTier: 2 },
  { id: "elf_resin", client: "萤光学徒菲雅", actionId: "act_tap_resin", itemId: "resin", qty: 10, favor: 9, gold: 420, minTier: 2 },
  { id: "elf_birch", client: "林语者艾菈", actionId: "act_chop_wood_t4", itemId: "wood_4", qty: 12, favor: 11, gold: 1050, minTier: 3 },
  { id: "elf_flower", client: "月桂园丁薇拉", actionId: "act_plant_flower_t4", itemId: "flower_spirit", qty: 10, favor: 11, gold: 560, minTier: 3 },
  { id: "elf_deepsea", client: "溪畔歌者洛恩", actionId: "act_fish_t4", itemId: "fish_deepsea", qty: 8, favor: 11, gold: 1100, minTier: 3 },
  { id: "elf_blaze", client: "萤光学徒菲雅", actionId: "act_mine_crystal_t4", itemId: "crystal_4", qty: 10, favor: 11, gold: 900, minTier: 3 },
  { id: "elf_dusk", client: "林语者艾菈", actionId: "act_chop_wood_t5", itemId: "wood_5", qty: 10, favor: 13, gold: 1650, minTier: 4 },
  { id: "elf_starfiber", client: "织叶人茜尔", actionId: "act_gather_fiber_t5", itemId: "fiber_5", qty: 10, favor: 13, gold: 1650, minTier: 4 },
  { id: "elf_abyss", client: "溪畔歌者洛恩", actionId: "act_fish_t5", itemId: "fish_abyss", qty: 6, favor: 13, gold: 1500, minTier: 4 },
  { id: "elf_holy", client: "萤光学徒菲雅", actionId: "act_mine_crystal_t5", itemId: "crystal_5", qty: 8, favor: 13, gold: 1350, minTier: 4 },
];

export interface ElfExpeditionCommissionDef {
  id: string;
  client: string;
  sourceId: ElfExpeditionSourceId;
  /** 委托板张贴后需要新完成的次数。 */
  target: number;
  favor: number;
  gold: number;
  minTier: number;
}

export const ELF_EXPEDITION_COMMISSIONS: readonly ElfExpeditionCommissionDef[] = [
  { id: "elf_caravan_1", client: "驿站长希尔凡", sourceId: "caravan_runs", target: 1, favor: 10, gold: 500, minTier: 0 },
  { id: "elf_relic_1", client: "星图守望者奥瑞", sourceId: "relic_surveys", target: 1, favor: 10, gold: 500, minTier: 0 },
  { id: "elf_airship_2", client: "云端信使琪琳", sourceId: "airship_voyages", target: 2, favor: 10, gold: 500, minTier: 0 },
  { id: "elf_caravan_2", client: "驿站长希尔凡", sourceId: "caravan_runs", target: 2, favor: 16, gold: 1500, minTier: 3 },
  { id: "elf_relic_2", client: "星图守望者奥瑞", sourceId: "relic_surveys", target: 2, favor: 16, gold: 1500, minTier: 3 },
  { id: "elf_airship_4", client: "云端信使琪琳", sourceId: "airship_voyages", target: 4, favor: 16, gold: 1500, minTier: 3 },
];

export function isValidMineGradeId(id: unknown): id is MineGradeId {
  return typeof id === "string" && (MINE_GRADE_IDS as readonly string[]).includes(id);
}

export function isValidElfExpeditionSourceId(id: unknown): id is ElfExpeditionSourceId {
  return typeof id === "string" && (ELF_EXPEDITION_SOURCE_IDS as readonly string[]).includes(id);
}

/** 合法矿层：1 ~ 6 的整数。 */
export function isValidMineLayer(layer: unknown): layer is number {
  return typeof layer === "number" && Number.isInteger(layer) && layer >= 1 && layer <= MINE_LAYERS.length;
}

function mineCleanCount(v: unknown, cap: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.min(cap, Math.floor(n)) : 0;
}

function mineObj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

/** 东八区日序号（1970-01-01 东八区 = 0）。 */
export function mineDayIndex(now: Date | number): number {
  const ms = typeof now === "number" ? now : now.getTime();
  return Math.floor((ms + MINE_TZ_OFFSET_MINUTES * 60_000) / 86_400_000);
}

/** 日序号 → 东八区日期键 YYYY-MM-DD。 */
export function mineDayKeyFromIndex(index: number): string {
  return new Date(Math.floor(index) * 86_400_000).toISOString().slice(0, 10);
}

export function mineDayKey(now: Date | number): string {
  return mineDayKeyFromIndex(mineDayIndex(now));
}

/** 日期键 → 日序号；非法键返回 null。 */
export function mineDayIndexFromKey(key: unknown): number | null {
  if (typeof key !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const ms = Date.parse(`${key}T00:00:00.000Z`);
  if (!Number.isFinite(ms)) return null;
  const index = Math.floor(ms / 86_400_000);
  return mineDayKeyFromIndex(index) === key ? index : null;
}

/** 当前东八区日结束（次日 0 点）的 UTC 毫秒时间戳。 */
export function mineDayEndsAtMs(now: Date | number): number {
  return (mineDayIndex(now) + 1) * 86_400_000 - MINE_TZ_OFFSET_MINUTES * 60_000;
}

/** 32 位整数混合哈希（矿脉与委托板的唯一随机源，纯确定性）。 */
export function mineHash(a: number, b: number): number {
  let h = (Math.imul((a | 0) ^ 0x6a09e667, 0x9e3779b1) + Math.imul((b | 0) + 0x510e527f, 0x85ebca77)) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

/** 矿层定义（脏数据按 1 层；超出按最深层）。 */
export function getMineLayerDef(layer: unknown): MineLayerDef {
  const n = Math.min(MINE_LAYERS.length, Math.max(1, mineCleanCount(layer, MINE_LAYERS.length)));
  return MINE_LAYERS[n - 1];
}

/** 矿道深度（脏数据按 1 级；超出按最深）。 */
export function getMineDepth(depth: unknown): MineDepthDef {
  const n = Math.min(MINE_DEPTHS.length, Math.max(1, mineCleanCount(depth, MINE_DEPTHS.length)));
  return MINE_DEPTHS[n - 1];
}

/** 矿车等级（脏数据按 1 级；超出按满级）。 */
export function getMineCart(level: unknown): MineCartDef {
  const n = Math.min(MINE_CARTS.length, Math.max(1, mineCleanCount(level, MINE_CARTS.length)));
  return MINE_CARTS[n - 1];
}

export function getMineGradeDef(id: MineGradeId): MineGradeDef {
  return MINE_GRADES.find((g) => g.id === id) || MINE_GRADES[0];
}

/** 某个东八区日某矿层的矿脉：矿种与品位都由日序号与层号哈希确定（同一天全服一致）。 */
export function getMineVein(dayIndex: number, layer: unknown) {
  const d = Number.isFinite(dayIndex) ? Math.floor(dayIndex) : 0;
  const def = getMineLayerDef(layer);
  const oreId = def.ores[mineHash(d, 0x0e00 + def.layer) % def.ores.length];
  const roll = mineHash(d, 0x0f00 + def.layer) % 100;
  let acc = 0;
  let grade = MINE_GRADES[MINE_GRADES.length - 1];
  for (const g of MINE_GRADES) {
    acc += g.weight;
    if (roll < acc) {
      grade = g;
      break;
    }
  }
  return {
    layer: def.layer,
    oreId,
    grade: grade.id,
    gradeName: grade.name,
    yieldPct: grade.yieldPct,
    byproductId: def.byproductId,
    byproduct: grade.byproduct,
  };
}

/** 某个东八区日的整张矿脉图（六层）。 */
export function getMineVeinMap(dayIndex: number) {
  return MINE_LAYERS.map((l) => getMineVein(dayIndex, l.layer));
}

/** 出车时长 = 本层基准分钟 × (100 - 矿车提速)%。 */
export function getMineHaulMs(layer: unknown, cartLevel: unknown): number {
  const def = getMineLayerDef(layer);
  return Math.round((def.baseMinutes * 60_000 * (100 - getMineCart(cartLevel).speedPct)) / 100);
}

/** 一车的产出：矿石 = 矿车容量 × 品位倍率（至少 1 块），富矿 / 极品额外带回本层的伴生锻造材料。 */
export function getMineHaulYield(dayIndex: number, layer: unknown, cartLevel: unknown) {
  const vein = getMineVein(dayIndex, layer);
  const cart = getMineCart(cartLevel);
  return {
    layer: vein.layer,
    oreId: vein.oreId,
    grade: vein.grade,
    gradeName: vein.gradeName,
    oreQty: Math.max(1, Math.floor((cart.capacity * vein.yieldPct) / 100)),
    byproductId: vein.byproductId,
    byproductQty: vein.byproduct,
  };
}

/** 今日各层已出车次数净化：只认 1 ~ 6 层，每层不超过当日储量。 */
export function cleanMineHaulsToday(raw: unknown): Record<string, number> {
  const src = mineObj(raw);
  const out: Record<string, number> = {};
  for (const l of MINE_LAYERS) {
    const n = mineCleanCount(src[String(l.layer)], MINE_HAULS_PER_LAYER_PER_DAY);
    if (n > 0) out[String(l.layer)] = n;
  }
  return out;
}

/** 出车计划：矿道深度、铁匠采矿等级、当日储量与矿车是否在外，共同决定能否下到某层。 */
export function planMineHaul(
  dayIndex: number,
  layer: unknown,
  depth: unknown,
  cartLevel: unknown,
  miningLevel: unknown,
  haulsToday: unknown,
  busy: unknown
) {
  const valid = isValidMineLayer(layer);
  const def = getMineLayerDef(layer);
  const depthOk = valid && getMineDepth(depth).depth >= def.layer;
  const level = mineCleanCount(miningLevel, MINE_COUNTER_CAP);
  const levelOk = valid && level >= def.minMiningLevel;
  const used = valid ? cleanMineHaulsToday(haulsToday)[String(def.layer)] || 0 : 0;
  const haulsLeft = valid ? MINE_HAULS_PER_LAYER_PER_DAY - used : 0;
  const idle = busy !== true;
  return {
    ok: valid && depthOk && levelOk && haulsLeft > 0 && idle,
    layer: valid ? def.layer : null,
    depthOk,
    levelOk,
    miningLevel: level,
    haulsLeft,
    idle,
    durationMs: valid ? getMineHaulMs(def.layer, cartLevel) : 0,
    yield: valid ? getMineHaulYield(dayIndex, def.layer, cartLevel) : null,
  };
}

function mineMaterialPlan(next: { costGold: number; materials: Record<string, number> } | null, gold: unknown, inventory: unknown) {
  const inv = mineObj(inventory);
  const g = mineCleanCount(gold, Number.MAX_SAFE_INTEGER);
  const materials = next
    ? Object.entries(next.materials).map(([itemId, need]) => ({ itemId, need, have: mineCleanCount(inv[itemId], MINE_COUNTER_CAP) }))
    : [];
  const goldOk = next !== null && g >= next.costGold;
  const materialsOk = materials.every((m) => m.have >= m.need);
  return { goldOk, materialsOk, materials };
}

/** 矿道掘进计划：下一深度的金币与真实材料是否齐备（最深返回 maxed）。 */
export function planMineDepthUpgrade(depth: unknown, gold: unknown, inventory: unknown) {
  const current = getMineDepth(depth);
  const next = MINE_DEPTHS.find((d) => d.depth === current.depth + 1) ?? null;
  const m = mineMaterialPlan(next, gold, inventory);
  return { ok: next !== null && m.goldOk && m.materialsOk, maxed: next === null, current, next, ...m };
}

/** 矿车升级计划：下一级的金币与真实材料是否齐备（满级返回 maxed）。 */
export function planMineCartUpgrade(cartLevel: unknown, gold: unknown, inventory: unknown) {
  const current = getMineCart(cartLevel);
  const next = MINE_CARTS.find((c) => c.level === current.level + 1) ?? null;
  const m = mineMaterialPlan(next, gold, inventory);
  return { ok: next !== null && m.goldOk && m.materialsOk, maxed: next === null, current, next, ...m };
}

/** 林地好感等级：累计好感决定等级与永久加成（含下一等级进度）。 */
export function getElfFavorTier(favor: unknown) {
  const n = mineCleanCount(favor, ELF_FAVOR_CAP);
  let current = ELF_FAVOR_TIERS[0];
  let next: ElfFavorTierDef | null = null;
  for (let i = 0; i < ELF_FAVOR_TIERS.length; i++) {
    if (n >= ELF_FAVOR_TIERS[i].minFavor) {
      current = ELF_FAVOR_TIERS[i];
      next = ELF_FAVOR_TIERS[i + 1] ?? null;
    }
  }
  const progressPct = next
    ? Math.min(100, Math.max(0, Math.round(((n - current.minFavor) / Math.max(1, next.minFavor - current.minFavor)) * 100)))
    : 100;
  return { favor: n, current, next, progressPct };
}

export type MinimalElfHolder = {
  elfWaystation?: {
    favor?: unknown;
  } | null;
} | null;

export interface ElfWaystationBonuses {
  favor: number;
  tier: number;
  tierName: string;
  gatherSpeedPct: number;
  gatherEfficiencyPct: number;
  gatherXpPct: number;
}

/** 林地好感的永久加成：按好感等级取值，逐项封顶（采集速度 5% / 采集产出效率 4% / 采集经验 3%），只作用于采集行动。 */
export function getElfWaystationBonuses(holder?: MinimalElfHolder): ElfWaystationBonuses {
  const ew = mineObj(holder?.elfWaystation);
  const tier = getElfFavorTier(ew.favor);
  const out: Required<ElfStats> = { gatherSpeedPct: 0, gatherEfficiencyPct: 0, gatherXpPct: 0 };
  for (const k of ELF_STAT_KEYS) out[k] = Math.min(ELF_BONUS_CAPS[k], Math.max(0, tier.current.stats[k] || 0));
  return { favor: tier.favor, tier: tier.current.tier, tierName: tier.current.name, ...out };
}

/**
 * 某个东八区日的驿站委托板：按张贴时的好感等级筛出委托池，两张不同的采集委托 + 一张远征委托，
 * 都由日序号哈希确定（同一天、同一好感等级全服一致）。
 */
export function getElfBoard(dayIndex: number, boardTier: unknown) {
  const d = Number.isFinite(dayIndex) ? Math.floor(dayIndex) : 0;
  const tier = Math.min(ELF_FAVOR_TIERS.length - 1, mineCleanCount(boardTier, ELF_FAVOR_TIERS.length - 1));
  const gatherPool = ELF_GATHER_COMMISSIONS.filter((c) => c.minTier <= tier);
  const a = mineHash(d, 0xe1f0) % gatherPool.length;
  const b = (a + 1 + (mineHash(d, 0xe1f1) % (gatherPool.length - 1))) % gatherPool.length;
  const expeditionPool = ELF_EXPEDITION_COMMISSIONS.filter((c) => c.minTier <= tier);
  const gather: ElfGatherCommissionDef[] = [gatherPool[a], gatherPool[b]];
  return { dayIndex: d, tier, gather, expedition: expeditionPool[mineHash(d, 0xe1f2) % expeditionPool.length] };
}

/** 今日已完成的委托栏位（只认 0 / 1 / 2，去重升序）。 */
export function cleanElfCompleted(raw: unknown): number[] {
  const list = Array.isArray(raw) ? (raw as unknown[]) : [];
  return ELF_BOARD_SLOTS.filter((s) => list.includes(s));
}

/** 从存档里已有的真实计数读出远征读数（远征商车返航 / 遗迹勘探 / 飞艇抵港；不新增任何计数器，脏数据按 0）。 */
export function getElfExpeditionCounters(holder: unknown): Record<ElfExpeditionSourceId, number> {
  const h = mineObj(holder);
  return {
    caravan_runs: mineCleanCount(mineObj(h.caravanTrade).totalRunsCompleted, MINE_COUNTER_CAP),
    relic_surveys: mineCleanCount(mineObj(h.astralRelics).totalSurveys, MINE_COUNTER_CAP),
    airship_voyages: mineCleanCount(mineObj(h.airshipTrade).totalVoyages, MINE_COUNTER_CAP),
  };
}

/** 远征委托进度 = 当前读数 - 委托板张贴时的基线（读数若被重置则从 0 重新计）。 */
export function getElfExpeditionProgress(current: unknown, base: unknown): number {
  const c = mineCleanCount(current, MINE_COUNTER_CAP);
  const b = mineCleanCount(base, MINE_COUNTER_CAP);
  return c >= b ? c - b : c;
}

/** 交付计划：采集委托（栏位 0 / 1）交出背包里的真实采集物；远征委托（栏位 2）看张贴以来新完成的远征次数。 */
export function planElfCommission(
  dayIndex: number,
  boardTier: unknown,
  slot: unknown,
  completed: unknown,
  inventory: unknown,
  counters: unknown,
  base: unknown
) {
  const board = getElfBoard(dayIndex, boardTier);
  const s = typeof slot === "number" && Number.isInteger(slot) && ELF_BOARD_SLOTS.includes(slot) ? slot : null;
  const done = cleanElfCompleted(completed);
  let kind: "gather" | "expedition" | null = null;
  let commissionId: string | null = null;
  let need = 0;
  let have = 0;
  let favor = 0;
  let gold = 0;
  if (s === ELF_EXPEDITION_SLOT) {
    const def = board.expedition;
    kind = "expedition";
    commissionId = def.id;
    need = def.target;
    have = getElfExpeditionProgress(mineObj(counters)[def.sourceId], mineObj(base)[def.sourceId]);
    favor = def.favor;
    gold = def.gold;
  } else if (s !== null) {
    const def = board.gather[s];
    kind = "gather";
    commissionId = def.id;
    need = def.qty;
    have = mineCleanCount(mineObj(inventory)[def.itemId], MINE_COUNTER_CAP);
    favor = def.favor;
    gold = def.gold;
  }
  const isDone = s !== null && done.includes(s);
  const enough = s !== null && have >= need;
  const ok = s !== null && !isDone && enough;
  const fullBoard = ok && done.length === ELF_BOARD_SLOTS.length - 1;
  return {
    ok,
    slot: s,
    kind,
    commissionId,
    need,
    have,
    enough,
    done: isDone,
    favor,
    gold,
    fullBoard,
    bonusFavor: fullBoard ? ELF_FULL_BOARD_BONUS : 0,
  };
}

/* ---- 以上为 WL-17 core ---- */

const MINE_EPOCH_ISO = new Date(0).toISOString();

function mineIsoOr(v: unknown, fallback: string): string {
  const ms = typeof v === "string" ? Date.parse(v) : Number.NaN;
  return Number.isFinite(ms) ? new Date(ms).toISOString() : fallback;
}

const mineGold = (player: EnhancedPlayerState) => Math.floor(Number(player.inventory.gold || 0));

/** 铁匠采矿等级（skill_blacksmith，转生会重置）：决定能下到哪些矿层。 */
const mineMiningLevel = (player: EnhancedPlayerState) => Math.max(1, Math.floor(Number((player.skills as any)?.skill_blacksmith?.level || 1)));

function sanitizeMineHaul(raw: unknown, depth: number, cartLevel: number): DwarfMineHaul | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const startedMs = typeof r.startedAt === "string" ? Date.parse(r.startedAt) : Number.NaN;
  if (!isValidMineLayer(r.layer) || r.layer > depth || mineDayIndexFromKey(r.dayKey) === null || !Number.isFinite(startedMs)) return null;
  // 回矿时刻恒为出车时刻 + 本层在当前矿车下的时长（矿车在外时不能升级），脏档改不短
  return {
    layer: r.layer,
    dayKey: r.dayKey as string,
    startedAt: new Date(startedMs).toISOString(),
    returnsAt: new Date(startedMs + getMineHaulMs(r.layer, cartLevel)).toISOString(),
  };
}

function sanitizeMineHaulRecord(raw: unknown): DwarfMineHaulRecord | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (!isValidMineLayer(r.layer) || !isValidMineGradeId(r.grade)) return null;
  const def = getMineLayerDef(r.layer);
  if (typeof r.oreId !== "string" || !def.ores.includes(r.oreId)) return null;
  return {
    layer: def.layer,
    oreId: r.oreId,
    oreQty: mineCleanCount(r.oreQty, MINE_COUNTER_CAP),
    grade: r.grade,
    byproductId: def.byproductId,
    byproductQty: mineCleanCount(r.byproductQty, MINE_COUNTER_CAP),
    at: mineIsoOr(r.at, MINE_EPOCH_ISO),
  };
}

/** 矿车回矿：按出车当日的矿脉与当前矿车结算，矿石与伴生锻造材料直接入背包（时间戳取真实回矿时刻）。 */
function returnMineHaul(player: EnhancedPlayerState, dm: DwarfMineState, contentPack?: EnhancedContentPack) {
  const h = dm.haul!;
  const y = getMineHaulYield(mineDayIndexFromKey(h.dayKey)!, h.layer, dm.cartLevel);
  player.inventory[y.oreId] = Math.floor(Number(player.inventory[y.oreId] || 0)) + y.oreQty;
  if (y.byproductQty > 0) {
    player.inventory[y.byproductId] = Math.floor(Number(player.inventory[y.byproductId] || 0)) + y.byproductQty;
  }
  dm.haul = null;
  dm.totalHauls = Math.min(MINE_COUNTER_CAP, dm.totalHauls + 1);
  dm.totalOre = Math.min(MINE_COUNTER_CAP, dm.totalOre + y.oreQty);
  dm.totalByproduct = Math.min(MINE_COUNTER_CAP, dm.totalByproduct + y.byproductQty);
  if (y.grade === "bonanza") dm.bonanzaHauls = Math.min(MINE_COUNTER_CAP, dm.bonanzaHauls + 1);
  dm.lastHaul = {
    layer: y.layer,
    oreId: y.oreId,
    oreQty: y.oreQty,
    grade: y.grade,
    byproductId: y.byproductId,
    byproductQty: y.byproductQty,
    at: h.returnsAt,
  };
  const def = getMineLayerDef(y.layer);
  appendLog(
    player,
    `矮人地底矿脉：矿车从第 ${def.layer} 层「${def.name}」（${y.gradeName}）满载而归，带回「${mineItemName(contentPack, y.oreId)}」×${y.oreQty}${
      y.byproductQty > 0 ? `，伴生「${mineItemName(contentPack, y.byproductId)}」×${y.byproductQty}` : ""
    }。`
  );
}

/** 物品名（内容包真实名称；无内容包时回落到物品 id）。 */
function mineItemName(contentPack: EnhancedContentPack | undefined, itemId: string): string {
  return tavernItemName(contentPack, itemId);
}

/**
 * 确保 dwarfMine 存在并净化脏档（旧存档首次打开面板时开矿：浅层矿道、木轮矿车，不赠送任何矿石）。
 * 仅显式传入 now（指令 / 视图时钟）时才会换日（新的矿脉图、补满各层储量）与回矿；无参调用
 * （ensurePlayerExtensions / 转生净化）只做净化，绝不按墙钟推进（无效日期键回落到纪元日，下一次显式 now 再前推）。
 * contentPack 只用于回矿日志里的物品名。
 */
export function ensureDwarfMine(player: EnhancedPlayerState, now?: Date, contentPack?: EnhancedContentPack): DwarfMineState {
  if (!Array.isArray((player as any).logs)) {
    (player as any).logs = [];
  }
  if (!player.inventory || typeof player.inventory !== "object") {
    player.inventory = { gold: 0 };
  }
  const fallbackDayKey = now !== undefined ? mineDayKey(now) : mineDayKeyFromIndex(0);
  if (!player.dwarfMine || typeof player.dwarfMine !== "object" || Array.isArray(player.dwarfMine)) {
    player.dwarfMine = {
      dayKey: fallbackDayKey,
      depth: 1,
      cartLevel: 1,
      haulsToday: {},
      haul: null,
      totalHauls: 0,
      totalOre: 0,
      totalByproduct: 0,
      bonanzaHauls: 0,
      lastHaul: null,
    };
  }
  const dm = player.dwarfMine;
  if (mineDayIndexFromKey(dm.dayKey) === null) dm.dayKey = fallbackDayKey;
  dm.depth = getMineDepth(dm.depth).depth;
  dm.cartLevel = getMineCart(dm.cartLevel).level;
  dm.haulsToday = cleanMineHaulsToday(dm.haulsToday);
  dm.haul = sanitizeMineHaul(dm.haul, dm.depth, dm.cartLevel);
  dm.totalHauls = mineCleanCount(dm.totalHauls, MINE_COUNTER_CAP);
  dm.totalOre = mineCleanCount(dm.totalOre, MINE_COUNTER_CAP);
  dm.totalByproduct = mineCleanCount(dm.totalByproduct, MINE_COUNTER_CAP);
  dm.bonanzaHauls = Math.min(dm.totalHauls, mineCleanCount(dm.bonanzaHauls, MINE_COUNTER_CAP));
  dm.lastHaul = sanitizeMineHaulRecord(dm.lastHaul);
  if (now !== undefined) {
    if (dm.haul && now.getTime() >= Date.parse(dm.haul.returnsAt)) {
      returnMineHaul(player, dm, contentPack);
    }
    const cur = mineDayIndex(now);
    const stored = mineDayIndexFromKey(dm.dayKey)!;
    // 只向前换日（时钟回拨不回滚）：换上新一天的矿脉图并补满各层储量
    if (cur > stored) {
      dm.dayKey = mineDayKeyFromIndex(cur);
      dm.haulsToday = {};
    }
  }
  return dm;
}

/** 转生：保留矿道深度、矿车与累计记录，在途矿车里的矿石随旧世界散去（不能借矿车把旧世界的财富带进新一世）。 */
export function clearDwarfMineHaulForPrestige(player: EnhancedPlayerState) {
  const dm = ensureDwarfMine(player);
  const haul = dm.haul;
  dm.haul = null;
  if (haul) {
    appendLog(player, `转生：第 ${haul.layer} 层在途矿车里的矿石随旧世界一同散去（矿道深度与矿车保留）。`);
  }
  return Boolean(haul);
}

/**
 * 确保 elfWaystation 存在并净化脏档（旧存档首次打开面板时结识驿站：0 好感，不赠送任何加成）。
 * 仅显式传入 now 时才会换日（按当前好感等级张贴新委托板，并以存档里已有的远征读数为基线）；无参调用只做净化。
 */
export function ensureElfWaystation(player: EnhancedPlayerState, now?: Date): ElfWaystationState {
  if (!Array.isArray((player as any).logs)) {
    (player as any).logs = [];
  }
  const counters = getElfExpeditionCounters(player);
  const fallbackDayKey = now !== undefined ? mineDayKey(now) : mineDayKeyFromIndex(0);
  if (!player.elfWaystation || typeof player.elfWaystation !== "object" || Array.isArray(player.elfWaystation)) {
    player.elfWaystation = {
      dayKey: fallbackDayKey,
      boardTier: 0,
      completed: [],
      expeditionBase: { ...counters },
      favor: 0,
      totalCommissions: 0,
      fullBoards: 0,
      totalGold: 0,
      lastCommission: null,
    };
  }
  const ew = player.elfWaystation;
  if (mineDayIndexFromKey(ew.dayKey) === null) ew.dayKey = fallbackDayKey;
  ew.favor = mineCleanCount(ew.favor, ELF_FAVOR_CAP);
  const tierNow = getElfFavorTier(ew.favor).current.tier;
  ew.boardTier = Math.min(tierNow, mineCleanCount(ew.boardTier, ELF_FAVOR_TIERS.length - 1));
  ew.completed = cleanElfCompleted(ew.completed);
  // 基线缺失或脏数据时取当前读数（不能凭空让旧的远征记录直接完成委托）
  const baseRaw = mineObj(ew.expeditionBase);
  const base = {} as Record<ElfExpeditionSourceId, number>;
  for (const id of ELF_EXPEDITION_SOURCE_IDS) {
    const v = Number(baseRaw[id]);
    base[id] = Number.isFinite(v) && v >= 0 ? Math.min(MINE_COUNTER_CAP, Math.floor(v)) : counters[id];
  }
  ew.expeditionBase = base;
  ew.totalCommissions = mineCleanCount(ew.totalCommissions, MINE_COUNTER_CAP);
  ew.fullBoards = Math.min(ew.totalCommissions, mineCleanCount(ew.fullBoards, MINE_COUNTER_CAP));
  ew.totalGold = mineCleanCount(ew.totalGold, MINE_COUNTER_CAP);
  const lc = ew.lastCommission as unknown;
  if (lc && typeof lc === "object" && !Array.isArray(lc) && typeof (lc as any).commissionId === "string") {
    const r = lc as Record<string, unknown>;
    const id = r.commissionId as string;
    const known = ELF_GATHER_COMMISSIONS.some((c) => c.id === id) || ELF_EXPEDITION_COMMISSIONS.some((c) => c.id === id);
    ew.lastCommission = known
      ? {
          slot: Math.min(ELF_BOARD_SLOTS.length - 1, mineCleanCount(r.slot, ELF_BOARD_SLOTS.length - 1)),
          commissionId: id,
          favor: mineCleanCount(r.favor, ELF_FAVOR_CAP),
          gold: mineCleanCount(r.gold, MINE_COUNTER_CAP),
          at: mineIsoOr(r.at, MINE_EPOCH_ISO),
        }
      : null;
  } else {
    ew.lastCommission = null;
  }
  if (now !== undefined) {
    const cur = mineDayIndex(now);
    const stored = mineDayIndexFromKey(ew.dayKey)!;
    // 只向前换日（时钟回拨不回滚）：按当前好感等级张贴新委托板，远征基线取此刻的真实读数
    if (cur > stored) {
      ew.dayKey = mineDayKeyFromIndex(cur);
      ew.boardTier = tierNow;
      ew.completed = [];
      ew.expeditionBase = { ...counters };
    }
  }
  return ew;
}

/** 视图统一推进矿脉（换日 / 回矿）与驿站（换日）时钟，保证落库状态与响应视图一致。 */
function ensureDwarfElfClocks(player: EnhancedPlayerState, now: Date, contentPack?: EnhancedContentPack) {
  return { dm: ensureDwarfMine(player, now, contentPack), ew: ensureElfWaystation(player, now) };
}

/** 派矿车下井：沿已掘进的矿道下到某层，按今日矿脉出车（每层每日 2 车；回矿只在显式 now 到点时结算）。 */
export function dispatchMineCart(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack | undefined,
  layer: number,
  now: Date,
  expectedDayKey?: string
): {
  ok: boolean;
  reason?: string;
  layer?: number;
  oreId?: string;
  oreQty?: number;
  grade?: MineGradeId;
  byproductId?: string;
  byproductQty?: number;
  durationMs?: number;
  returnsAt?: string;
} {
  ensurePlayerExtensions(player);
  if (!isValidMineLayer(layer)) return { ok: false, reason: "未知的矿层" };
  const dm = ensureDwarfMine(player, now, contentPack);
  if (expectedDayKey !== undefined && expectedDayKey !== dm.dayKey) {
    return { ok: false, reason: `日期已更替：今天的矿脉图是 ${dm.dayKey}，请刷新后再试` };
  }
  const def = getMineLayerDef(layer);
  if (dm.haul) return { ok: false, reason: `矿车还在第 ${dm.haul.layer} 层「${getMineLayerDef(dm.haul.layer).name}」，回来后才能再出车` };
  const plan = planMineHaul(mineDayIndexFromKey(dm.dayKey)!, layer, dm.depth, dm.cartLevel, mineMiningLevel(player), dm.haulsToday, false);
  if (!plan.depthOk) return { ok: false, reason: `矿道还没掘进到第 ${def.layer} 层「${def.name}」` };
  if (!plan.levelOk) return { ok: false, reason: `下到「${def.name}」需铁匠采矿等级 ${def.minMiningLevel}（当前 ${plan.miningLevel}）` };
  if (plan.haulsLeft <= 0) return { ok: false, reason: `「${def.name}」今天的矿脉储量已采完（每层每日 ${MINE_HAULS_PER_LAYER_PER_DAY} 车），明天换新矿脉` };
  const y = plan.yield!;
  dm.haul = {
    layer: def.layer,
    dayKey: dm.dayKey,
    startedAt: now.toISOString(),
    returnsAt: new Date(now.getTime() + plan.durationMs).toISOString(),
  };
  dm.haulsToday = { ...dm.haulsToday, [String(def.layer)]: (dm.haulsToday[String(def.layer)] || 0) + 1 };
  appendLog(
    player,
    `矮人地底矿脉：矿车下到第 ${def.layer} 层「${def.name}」（今日${y.gradeName}「${mineItemName(contentPack, y.oreId)}」），预计 ${Math.round(
      plan.durationMs / 60_000
    )} 分钟后带回 ${y.oreQty} 块矿石。`
  );
  return {
    ok: true,
    layer: def.layer,
    oreId: y.oreId,
    oreQty: y.oreQty,
    grade: y.grade,
    byproductId: y.byproductId,
    byproductQty: y.byproductQty,
    durationMs: plan.durationMs,
    returnsAt: dm.haul.returnsAt,
  };
}

function spendMineMaterials(player: EnhancedPlayerState, costGold: number, materials: Array<{ itemId: string; need: number }>) {
  player.inventory.gold = mineGold(player) - costGold;
  if (player.stats) player.stats.totalGoldSpent = (player.stats.totalGoldSpent || 0) + costGold;
  for (const m of materials) {
    player.inventory[m.itemId] = Math.floor(Number(player.inventory[m.itemId] || 0)) - m.need;
    if (player.inventory[m.itemId] <= 0) delete player.inventory[m.itemId];
  }
}

function mineMissingText(contentPack: EnhancedContentPack | undefined, materials: Array<{ itemId: string; need: number; have: number }>) {
  return materials
    .filter((m) => m.have < m.need)
    .map((m) => `${mineItemName(contentPack, m.itemId)} ×${m.need}（现有 ${m.have}）`)
    .join("、");
}

/** 矿道掘进：金币 + 真实生活职业成品（坑木支护木板 + 铁轨金属锭），解锁更深的矿层（转生永久保留）。 */
export function upgradeMineDepth(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack | undefined,
  now: Date
): { ok: boolean; reason?: string; depth?: number; spentGold?: number } {
  ensurePlayerExtensions(player);
  const dm = ensureDwarfMine(player, now, contentPack);
  const plan = planMineDepthUpgrade(dm.depth, mineGold(player), player.inventory);
  if (plan.maxed || !plan.next) return { ok: false, reason: `矿道已掘进到最深的「${plan.current.name}」` };
  const next = plan.next;
  if (!plan.goldOk) return { ok: false, reason: `金币不足：掘进「${next.name}」需 ${next.costGold} 金币` };
  if (!plan.materialsOk) return { ok: false, reason: `材料不足：${mineMissingText(contentPack, plan.materials)}` };
  spendMineMaterials(player, next.costGold, plan.materials);
  dm.depth = next.depth;
  addReputation(player, 3);
  syncAchievements(player);
  const layer = getMineLayerDef(next.depth);
  appendLog(
    player,
    `矮人地底矿脉：矿道掘进为「${next.name}」（深 ${next.depth * MINE_METERS_PER_LAYER} 米），可以下到第 ${layer.layer} 层「${layer.name}」了。`
  );
  return { ok: true, depth: next.depth, spentGold: next.costGold };
}

/** 矿车升级：金币 + 真实生活职业成品，提高每车装载量并缩短出车时长（矿车在井下时不能升级）。 */
export function upgradeMineCart(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack | undefined,
  now: Date
): { ok: boolean; reason?: string; cartLevel?: number; capacity?: number; spentGold?: number } {
  ensurePlayerExtensions(player);
  const dm = ensureDwarfMine(player, now, contentPack);
  if (dm.haul) return { ok: false, reason: "矿车还在井下，回来后才能升级" };
  const plan = planMineCartUpgrade(dm.cartLevel, mineGold(player), player.inventory);
  if (plan.maxed || !plan.next) return { ok: false, reason: `矿车已是最高等级「${plan.current.name}」` };
  const next = plan.next;
  if (!plan.goldOk) return { ok: false, reason: `金币不足：升级「${next.name}」需 ${next.costGold} 金币` };
  if (!plan.materialsOk) return { ok: false, reason: `材料不足：${mineMissingText(contentPack, plan.materials)}` };
  spendMineMaterials(player, next.costGold, plan.materials);
  dm.cartLevel = next.level;
  addReputation(player, 2);
  syncAchievements(player);
  appendLog(player, `矮人地底矿脉：矿车升级为「${next.name}」：每车装载 ${next.capacity} 块，出车时长缩短 ${next.speedPct}%。`);
  return { ok: true, cartLevel: next.level, capacity: next.capacity, spentGold: next.costGold };
}

/** 完成驿站委托：采集委托交出背包里的真实采集物，远征委托凭张贴以来新完成的远征；领取林地好感与金币。 */
export function deliverElfCommission(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack | undefined,
  slot: number,
  now: Date,
  expectedDayKey?: string
): {
  ok: boolean;
  reason?: string;
  slot?: number;
  commissionId?: string;
  favor?: number;
  bonusFavor?: number;
  gold?: number;
  favorTotal?: number;
  tier?: number;
  tierUp?: boolean;
} {
  ensurePlayerExtensions(player);
  if (!ELF_BOARD_SLOTS.includes(slot)) return { ok: false, reason: "未知的委托栏位" };
  const ew = ensureElfWaystation(player, now);
  if (expectedDayKey !== undefined && expectedDayKey !== ew.dayKey) {
    return { ok: false, reason: `日期已更替：驿站今天的委托板是 ${ew.dayKey}，请刷新后再试` };
  }
  const today = mineDayIndexFromKey(ew.dayKey)!;
  const board = getElfBoard(today, ew.boardTier);
  const counters = getElfExpeditionCounters(player);
  const plan = planElfCommission(today, ew.boardTier, slot, ew.completed, player.inventory, counters, ew.expeditionBase);
  if (plan.done) return { ok: false, reason: "这张委托今天已经完成了，明天驿站会张贴新的委托" };
  let label = "";
  if (plan.kind === "gather") {
    const def = board.gather[slot];
    const name = mineItemName(contentPack, def.itemId);
    label = `「${name}」×${def.qty}`;
    if (!plan.enough) return { ok: false, reason: `背包里的「${name}」不足：需 ${def.qty}，现有 ${plan.have}` };
    player.inventory[def.itemId] = Math.floor(Number(player.inventory[def.itemId] || 0)) - def.qty;
    if (player.inventory[def.itemId] <= 0) delete player.inventory[def.itemId];
  } else {
    const def = board.expedition;
    const src = ELF_EXPEDITION_SOURCES.find((x) => x.id === def.sourceId)!;
    label = `「${src.name}」${def.target} ${src.unit}`;
    if (!plan.enough) {
      return { ok: false, reason: `远征进度不足：委托张贴后还需${src.name} ${def.target - plan.have} ${src.unit}（${src.source}）` };
    }
  }
  const prevTier = getElfFavorTier(ew.favor).current.tier;
  const favorGain = plan.favor + plan.bonusFavor;
  ew.favor = Math.min(ELF_FAVOR_CAP, ew.favor + favorGain);
  ew.completed = cleanElfCompleted([...ew.completed, slot]);
  ew.totalCommissions = Math.min(MINE_COUNTER_CAP, ew.totalCommissions + 1);
  if (plan.fullBoard) ew.fullBoards = Math.min(ew.totalCommissions, ew.fullBoards + 1);
  ew.totalGold = Math.min(MINE_COUNTER_CAP, ew.totalGold + plan.gold);
  ew.lastCommission = { slot, commissionId: plan.commissionId!, favor: favorGain, gold: plan.gold, at: now.toISOString() };
  player.inventory.gold = mineGold(player) + plan.gold;
  if (player.stats) player.stats.totalGoldEarned = (player.stats.totalGoldEarned || 0) + plan.gold;
  addReputation(player, plan.fullBoard ? 3 : 2);
  syncAchievements(player);
  const tier = getElfFavorTier(ew.favor).current;
  appendLog(
    player,
    `精灵林地驿站：完成委托 ${label}，林地好感 +${favorGain}${plan.fullBoard ? `（今日委托全部完成，额外 +${ELF_FULL_BOARD_BONUS}）` : ""}、金币 +${plan.gold}${
      tier.tier > prevTier ? `，好感升至「${tier.name}」！` : "。"
    }`
  );
  return {
    ok: true,
    slot,
    commissionId: plan.commissionId!,
    favor: plan.favor,
    bonusFavor: plan.bonusFavor,
    gold: plan.gold,
    favorTotal: ew.favor,
    tier: tier.tier,
    tierUp: tier.tier > prevTier,
  };
}

/** 构造前端「矮人地底矿脉 & 精灵林地驿站」视图（会补齐两份状态，并按显式 now 换日 / 回矿）。 */
export function getDwarfElfInfo(player: EnhancedPlayerState, contentPack: EnhancedContentPack | undefined, now: Date) {
  ensurePlayerExtensions(player);
  const { dm, ew } = ensureDwarfElfClocks(player, now, contentPack);
  const itemName = (id: string) => mineItemName(contentPack, id);
  const have = (id: string) => Math.floor(Number(player.inventory[id] || 0));
  const gold = mineGold(player);
  const today = mineDayIndexFromKey(dm.dayKey)!;
  const miningLevel = mineMiningLevel(player);
  const actions = ((contentPack as any)?.actions || []) as Array<{
    id: string;
    name: string;
    skillId: string;
    requirements?: { skillLevel?: number };
    consumes?: Array<{ itemId: string; qty: number }>;
    yields?: Array<{ itemId: string }>;
  }>;
  const skills = ((contentPack as any)?.skills || []) as Array<{ id: string; name: string }>;
  // 产出接入既有锻造材料：找内容包里消耗该物品的锻造（skill_smithing）配方
  const forgeUse = (itemId: string) => {
    const a = actions.find((x) => x.skillId === "skill_smithing" && (x.consumes || []).some((c) => c.itemId === itemId));
    return a ? { actionId: a.id, name: a.name, level: Number(a.requirements?.skillLevel || 1) } : null;
  };
  const cart = getMineCart(dm.cartLevel);
  const depth = getMineDepth(dm.depth);
  const depthPlan = planMineDepthUpgrade(dm.depth, gold, player.inventory);
  const cartPlan = planMineCartUpgrade(dm.cartLevel, gold, player.inventory);
  const layers = MINE_LAYERS.map((l) => {
    const plan = planMineHaul(today, l.layer, dm.depth, dm.cartLevel, miningLevel, dm.haulsToday, Boolean(dm.haul));
    const vein = getMineVein(today, l.layer);
    let block: string | null = null;
    if (!plan.depthOk) block = `需掘进到第 ${l.layer} 层`;
    else if (!plan.levelOk) block = `需采矿 Lv.${l.minMiningLevel}`;
    else if (plan.haulsLeft <= 0) block = "今日已采完";
    else if (!plan.idle) block = dm.haul && dm.haul.layer === l.layer ? "矿车在本层" : "矿车在外";
    return {
      layer: l.layer,
      name: l.name,
      description: l.description,
      meters: l.layer * MINE_METERS_PER_LAYER,
      ores: l.ores.map((id) => ({ id, name: itemName(id), have: have(id), smelt: forgeUse(id) })),
      byproduct: { id: l.byproductId, name: itemName(l.byproductId), have: have(l.byproductId), forge: forgeUse(l.byproductId) },
      minMiningLevel: l.minMiningLevel,
      baseMinutes: l.baseMinutes,
      durationMs: getMineHaulMs(l.layer, dm.cartLevel),
      vein: { ...vein, oreName: itemName(vein.oreId), byproductName: itemName(vein.byproductId) },
      yield: plan.yield,
      reached: plan.depthOk,
      levelOk: plan.levelOk,
      haulsUsed: MINE_HAULS_PER_LAYER_PER_DAY - plan.haulsLeft,
      haulsLeft: plan.haulsLeft,
      canHaul: plan.ok,
      block,
    };
  });
  const upgradeView = (
    p: ReturnType<typeof planMineDepthUpgrade> | ReturnType<typeof planMineCartUpgrade>,
    busyBlock: string | null
  ) => ({
    materials: p.materials.map((m) => ({ ...m, name: itemName(m.itemId) })),
    canUpgrade: p.ok && !busyBlock,
    block: p.maxed ? "已满级" : busyBlock ? busyBlock : !p.goldOk ? "金币不足" : !p.materialsOk ? "材料不足" : null,
  });
  const haulYield = dm.haul ? getMineHaulYield(mineDayIndexFromKey(dm.haul.dayKey)!, dm.haul.layer, dm.cartLevel) : null;

  const elfToday = mineDayIndexFromKey(ew.dayKey)!;
  const board = getElfBoard(elfToday, ew.boardTier);
  const counters = getElfExpeditionCounters(player);
  const actionView = (id: string) => {
    const a = actions.find((x) => x.id === id);
    return {
      actionId: id,
      actionName: a?.name || id,
      skillName: skills.find((s) => s.id === a?.skillId)?.name || "",
      level: Number(a?.requirements?.skillLevel || 1),
    };
  };
  const commissions = ELF_BOARD_SLOTS.map((slot) => {
    const plan = planElfCommission(elfToday, ew.boardTier, slot, ew.completed, player.inventory, counters, ew.expeditionBase);
    if (slot === ELF_EXPEDITION_SLOT) {
      const def = board.expedition;
      const src = ELF_EXPEDITION_SOURCES.find((x) => x.id === def.sourceId)!;
      return {
        slot,
        kind: "expedition" as const,
        id: def.id,
        client: def.client,
        sourceId: def.sourceId,
        sourceName: src.name,
        source: src.source,
        artId: src.artId,
        unit: src.unit,
        target: def.target,
        progress: Math.min(def.target, plan.have),
        current: counters[def.sourceId],
        base: ew.expeditionBase[def.sourceId],
        favor: def.favor,
        gold: def.gold,
        minTier: def.minTier,
        done: plan.done,
        canDeliver: plan.ok,
        fullBoard: plan.fullBoard,
        block: plan.done ? "已完成" : !plan.enough ? "远征进度不足" : null,
      };
    }
    const def = board.gather[slot];
    return {
      slot,
      kind: "gather" as const,
      id: def.id,
      client: def.client,
      itemId: def.itemId,
      itemName: itemName(def.itemId),
      ...actionView(def.actionId),
      qty: def.qty,
      have: plan.have,
      favor: def.favor,
      gold: def.gold,
      minTier: def.minTier,
      done: plan.done,
      canDeliver: plan.ok,
      fullBoard: plan.fullBoard,
      block: plan.done ? "已完成" : !plan.enough ? "背包数量不足" : null,
    };
  });
  const favorTier = getElfFavorTier(ew.favor);
  const lastDef = ew.lastCommission
    ? ELF_GATHER_COMMISSIONS.find((c) => c.id === ew.lastCommission!.commissionId) ??
      ELF_EXPEDITION_COMMISSIONS.find((c) => c.id === ew.lastCommission!.commissionId)
    : undefined;

  return {
    nowMs: now.getTime(),
    bonuses: getElfWaystationBonuses(player),
    mine: {
      dayKey: dm.dayKey,
      dayEndsAtMs: (today + 1) * 86_400_000 - MINE_TZ_OFFSET_MINUTES * 60_000,
      gold,
      miningLevel,
      depth: {
        level: depth.depth,
        name: depth.name,
        meters: depth.depth * MINE_METERS_PER_LAYER,
        maxLevel: MINE_DEPTHS.length,
        next: depthPlan.next
          ? { level: depthPlan.next.depth, name: depthPlan.next.name, costGold: depthPlan.next.costGold, meters: depthPlan.next.depth * MINE_METERS_PER_LAYER }
          : null,
        ...upgradeView(depthPlan, null),
        steps: MINE_DEPTHS.map((d) => ({ level: d.depth, name: d.name, reached: dm.depth >= d.depth })),
      },
      cart: {
        level: cart.level,
        name: cart.name,
        capacity: cart.capacity,
        speedPct: cart.speedPct,
        maxLevel: MINE_CARTS.length,
        next: cartPlan.next
          ? { level: cartPlan.next.level, name: cartPlan.next.name, capacity: cartPlan.next.capacity, speedPct: cartPlan.next.speedPct, costGold: cartPlan.next.costGold }
          : null,
        ...upgradeView(cartPlan, dm.haul ? "矿车在井下" : null),
        steps: MINE_CARTS.map((c) => ({ level: c.level, name: c.name, capacity: c.capacity, reached: dm.cartLevel >= c.level })),
      },
      layers,
      haul:
        dm.haul && haulYield
          ? {
              layerName: getMineLayerDef(dm.haul.layer).name,
              dayKey: dm.haul.dayKey,
              startedAtMs: Date.parse(dm.haul.startedAt),
              returnsAtMs: Date.parse(dm.haul.returnsAt),
              ...haulYield,
              oreName: itemName(haulYield.oreId),
              byproductName: itemName(haulYield.byproductId),
            }
          : null,
      haulsPerLayer: MINE_HAULS_PER_LAYER_PER_DAY,
      haulsToday: Object.values(dm.haulsToday).reduce((s, n) => s + n, 0),
      grades: MINE_GRADES.map((g) => ({ ...g })),
      totals: { hauls: dm.totalHauls, ore: dm.totalOre, byproduct: dm.totalByproduct, bonanza: dm.bonanzaHauls },
      lastHaul: dm.lastHaul
        ? {
            ...dm.lastHaul,
            layerName: getMineLayerDef(dm.lastHaul.layer).name,
            gradeName: getMineGradeDef(dm.lastHaul.grade).name,
            oreName: itemName(dm.lastHaul.oreId),
            byproductName: itemName(dm.lastHaul.byproductId),
          }
        : null,
    },
    elf: {
      dayKey: ew.dayKey,
      dayEndsAtMs: (elfToday + 1) * 86_400_000 - MINE_TZ_OFFSET_MINUTES * 60_000,
      gold,
      boardTier: ew.boardTier,
      boardTierName: ELF_FAVOR_TIERS[ew.boardTier].name,
      favor: {
        total: favorTier.favor,
        tier: favorTier.current.tier,
        name: favorTier.current.name,
        stats: favorTier.current.stats,
        next: favorTier.next ? { tier: favorTier.next.tier, name: favorTier.next.name, minFavor: favorTier.next.minFavor, stats: favorTier.next.stats } : null,
        progressPct: favorTier.progressPct,
        tiers: ELF_FAVOR_TIERS.map((t) => ({ ...t, reached: favorTier.favor >= t.minFavor })),
      },
      commissions,
      completedCount: ew.completed.length,
      boardSize: ELF_BOARD_SLOTS.length,
      fullBoardBonus: ELF_FULL_BOARD_BONUS,
      sources: ELF_EXPEDITION_SOURCES.map((s) => ({ ...s, current: counters[s.id], base: ew.expeditionBase[s.id] })),
      caps: ELF_BONUS_CAPS,
      totals: { commissions: ew.totalCommissions, fullBoards: ew.fullBoards, gold: ew.totalGold },
      lastCommission:
        ew.lastCommission && lastDef
          ? { ...ew.lastCommission, client: lastDef.client, name: "itemId" in lastDef ? `「${itemName(lastDef.itemId)}」×${lastDef.qty}` : `远征委托 ×${lastDef.target}` }
          : null,
    },
  };
}
