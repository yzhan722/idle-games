import type { 
  ContentPack, 
  PlayerState, 
  UserRecord, 
  EnhancedPlayerState, 
  EnhancedContentPack,
  MarketListing,
  TradeHistory,
  Party,
  PartyMember,
  ChatMessage,
  PartyMessage,
  TradingMessage,
  EnhancementRequest,
  EnhancementResult,
  EnhancementInfo,
  EnhancementServiceRequest,
  EnhancementProvider,
  PlayerStats
} from "./types";
import { randomUUID } from "crypto";
import path from "path";
import { createPgStorage } from "./storage_pg";
import { createMemoryStorage } from "./storage_memory";
// 声望/转生：永久被动加成与全局倍率，接入离线结算 simulateToNow。
// 注：progression2 也会从本模块导入 appendLog/ensurePlayerExtensions，
// 二者均仅在函数体内（运行时）相互引用，故此循环依赖在求值期是安全的。
import { getReputationBonuses, getPrestigeMultiplier } from "./progression2";
import { enhancementStatMultiplier } from "./enhancement_math";
import { ensureProgression } from './progression_state';

// 存储接口类型定义
export interface Storage {
  init(): Promise<void>;
  close(): Promise<void>;
  healthCheck(): Promise<{ ok: boolean; latencyMs: number }>;
  cleanupExpiredListings(): Promise<number>;
  /** Internal fixture key. Not a public recovery credential. */
  findOrCreateGuestUser(deviceId: string): Promise<UserRecord>;
  /** Always a new guest. Client deviceId must not select this row. */
  createGuestUser(): Promise<UserRecord>;
  getUser(userId: string): Promise<UserRecord | null>;
  setGuestResumeTokenHash(userId: string, hash: string): Promise<void>;
  findUserByResumeTokenHash(hash: string): Promise<UserRecord | null>;
  bindGoogle(userId: string, googleSub: string): Promise<void>;
  getOrCreatePlayerState(userId: string, contentVersion: string): Promise<EnhancedPlayerState>;
  simulateToNow(params: { 
    userId: string; 
    state: EnhancedPlayerState; 
    now: Date; 
    contentPack: EnhancedContentPack 
  }): Promise<EnhancedPlayerState>;
  // 直接持久化玩家状态（成就/每日任务/设置等领奖与更新后调用）
  savePlayerState(userId: string, state: EnhancedPlayerState): Promise<EnhancedPlayerState>;
  startLifeAction(params: { userId: string; actionId: string; quantity?: number; now: Date; contentPack?: EnhancedContentPack }): Promise<EnhancedPlayerState>;
  startCombatFarm(params: { userId: string; stageId: string; now: Date }): Promise<EnhancedPlayerState>;
  
  // 新增：技能系统方法
  getSkillTree(params: { professionId: string; contentPack: EnhancedContentPack }): Promise<any>;
  unlockSkillNode(params: {
    userId: string;
    professionId: string;
    nodeId: string;
    contentPack: EnhancedContentPack;
  }): Promise<{ success: boolean; message?: string }>;
  getPlayerSkillProgress(params: { userId: string; professionId: string }): Promise<any>;
  awardSkillExperience(params: {
    userId: string;
    professionId: string;
    xpAmount: number;
  }): Promise<{ leveledUp: boolean; newLevel?: number }>;
  
  // 新增：装备强化方法
  enhanceEquipment(params: {
    userId: string;
    request: EnhancementRequest;
    contentPack: EnhancedContentPack;
    /** Test-only deterministic roll; API callers omit it. */
    rng?: () => number;
  }): Promise<EnhancementResult>;
  
  getEnhancementInfo(params: {
    userId: string;
    itemId: string;
    contentPack: EnhancedContentPack;
  }): Promise<EnhancementInfo>;
  
  getEnhancementProviders(params: {
    itemType: string;
    contentPack: EnhancedContentPack;
  }): Promise<EnhancementProvider[]>;

  createEnhancementServiceRequest(params: {
    requesterId: string;
    providerId: string;
    itemId: string;
    targetLevel: number;
    message?: string;
    contentPack: EnhancedContentPack;
  }): Promise<EnhancementServiceRequest>;

  respondToEnhancementServiceRequest(params: {
    requestId: string;
    providerId: string;
    accepted: boolean;
    message?: string;
    contentPack: EnhancedContentPack;
  }): Promise<{ success: boolean; message: string }>;

  getEnhancementServiceRequests(params: {
    userId: string;
    type: 'requester' | 'provider';
  }): Promise<EnhancementServiceRequest[]>;
  
  // 新增：交易行方法
  listItemForSale(params: {
    userId: string;
    itemId: string;
    quantity: number;
    pricePerUnit: number;
    duration?: number;
  }): Promise<MarketListing>;
  purchaseItem(params: {
    userId: string;
    listingId: string;
    quantity: number;
  }): Promise<{ success: boolean; message?: string }>;
  getMarketListings(params: {
    query?: string;
    filters?: any;
  }): Promise<MarketListing[]>;
  
  // 新增：组队方法
  createParty(params: { userId: string; name?: string }): Promise<Party>;
  joinParty(params: { userId: string; partyId: string }): Promise<Party>;
  startPartyActivity(params: {
    userId: string;
    partyId: string;
    activityType: 'combat' | 'group_craft';
    stageId?: string;
  }): Promise<{ success: boolean; message?: string }>;
  completePartyActivity(params: {
    userId: string;
    partyId: string;
    contentPack: EnhancedContentPack;
  }): Promise<{ success: boolean; rewards?: Record<string, Record<string, number>>; message?: string }>;
  leaveParty(params: {
    userId: string;
    partyId: string;
  }): Promise<{ success: boolean; message?: string }>;
  getPartyForUser(params: { userId: string }): Promise<Party | null>;
  
  // 新增：装备耐久度方法
  getDurabilityInfo(params: {
    userId: string;
    itemId: string;
  }): Promise<import("./types").DurabilityInfo>;
  
  repairEquipment(params: {
    userId: string;
    request: import("./types").RepairRequest;
  }): Promise<import("./types").RepairResult>;
  
  reduceDurability(params: {
    userId: string;
    itemId: string;
    amount: number;
  }): Promise<{ success: boolean; newDurability: number; broken: boolean }>;
  
  // 价格历史方法
  getPriceHistory(params: {
    itemId: string;
    days?: number;
  }): Promise<import("./types").PriceHistory[]>;
  
  getItemPriceTrend(params: {
    itemId: string;
  }): Promise<{
    itemId: string;
    currentAverage: number;
    weekAverage: number;
    trend: 'up' | 'down' | 'stable';
    changePercent: number;
  }>;
  
  // 装备套装效果方法
  getEquipmentStats(params: {
    userId: string;
    contentPack: EnhancedContentPack;
  }): Promise<import("./types").PlayerEquipmentStats>;
  
  getActiveSetBonuses(params: {
    userId: string;
    contentPack: EnhancedContentPack;
  }): Promise<import("./types").EquipmentSetBonus[]>;
  
  // WebSocket方法
  wsConnect(userId: string, connection: any): void;
  wsDisconnect(userId: string): void;
  wsMessage(userId: string, raw: string): void;
  
  // 交易系统方法
  getTradingOrders(params: { itemId: string }): Promise<TradingOrder[]>;
  /** MWI market overview: best ask / bid and depth for every item with open orders. */
  getMarketSummary(): Promise<Record<string, MarketQuote>>;
  createTradingOrder(params: {
    userId: string;
    itemId: string;
    quantity: number;
    price: number;
    type: 'sell' | 'buy';
  }): Promise<TradingOrder>;
  executeTrade(params: {
    buyerId: string;
    orderId: string;
    quantity: number;
  }): Promise<{ success: boolean; message?: string }>;
  cancelTradingOrder(params: { userId: string; orderId: string }): Promise<void>;
  getMyTradingOrders(params: { userId: string }): Promise<TradingOrder[]>;
}

// 交易订单类型
export interface TradingOrder {
  id: string;
  userId: string;
  itemId: string;
  quantity: number;
  price: number;
  type: 'sell' | 'buy';
  createdAt: string;
  username?: string;
}

/** Best prices for one item: lowest ask (someone selling) and highest bid (someone buying). */
export interface MarketQuote {
  ask?: number;
  askQty: number;
  bid?: number;
  bidQty: number;
}

/** Fold an order list into per-item quotes (shared by the memory store and tests). */
export function summarizeOrders(orders: Iterable<Pick<TradingOrder, "itemId" | "type" | "price" | "quantity">>): Record<string, MarketQuote> {
  const out: Record<string, MarketQuote> = {};
  for (const o of orders) {
    if (o.quantity <= 0) continue;
    const q = (out[o.itemId] ||= { askQty: 0, bidQty: 0 });
    if (o.type === "sell") {
      q.askQty += o.quantity;
      if (q.ask === undefined || o.price < q.ask) q.ask = o.price;
    } else {
      q.bidQty += o.quantity;
      if (q.bid === undefined || o.price > q.bid) q.bid = o.price;
    }
  }
  return out;
}

export async function createStorage(opts: { databaseUrl?: string }): Promise<Storage> {
  const isProduction = process.env.NODE_ENV === "production";

  if (!opts.databaseUrl) {
    // 生产环境必须配置数据库，内存存储会在重启时丢失所有玩家数据。
    if (isProduction) {
      throw new Error(
        "DATABASE_URL 未配置：生产环境必须使用持久化数据库存储，拒绝以内存存储启动。"
      );
    }
    const persistPath =
      process.env.MEMORY_STORE_PATH ||
      path.join(__dirname, "..", "data", "worklife-memory.json");
    console.warn(
      `[storage] 未配置 DATABASE_URL，使用文件持久化内存存储：${persistPath}`
    );
    return createMemoryStorage({ persistPath });
  }

  try {
    const pg = await createPgStorage(opts.databaseUrl);
    await pg.init();
    return pg;
  } catch (err) {
    // 配置了数据库却连不上，说明环境异常。绝不静默回退内存存储，
    // 否则会让用户误以为数据已持久化，实则重启即丢失。
    console.error("[storage] PostgreSQL 连接失败:", err);
    throw new Error(
      `PostgreSQL 连接失败，已配置 DATABASE_URL 但无法建立连接，拒绝回退到内存存储。原因: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}

export function defaultPlayerState(contentVersion: string): PlayerState {
  const now = new Date().toISOString();
  return {
    contentVersion,
    lastSimulatedAt: now,
    activeClassId: "woodcutter",
    mode: "idle",
    inventory: { gold: 0 },
    equipment: {},
    skills: {},
    logs: [{ ts: now, text: "欢迎来到 WorkLife" }]
  };
}

// 创建增强的默认玩家状态
export function defaultEnhancedPlayerState(contentVersion: string): EnhancedPlayerState {
  const now = new Date().toISOString();
  return {
    contentVersion,
    lastSimulatedAt: now,
    activeClassId: "woodcutter",
    mode: "idle",
    // 新手从零开始：第一根木头必须自己砍。金币从战斗/目标来，不预置木板跳过伐木循环。
    inventory: { gold: 0 },
    combatLevel: 1, // 战斗等级初始为1
    combatXp: 0, // 战斗经验初始为0
    equipment: {
      enhancementLevels: {},
      durability: {},
      maxDurability: {}
    },
    skills: {
      // 给每个职业初始技能
      skill_woodcutter: {
        level: 1,
        xp: 0,
        unlockedRecipes: ["woodcutter_basic_cutting", "woodcutter_armor_crafting"],
        enhancementLevel: 0
      },
      skill_blacksmith: {
        level: 1,
        xp: 0,
        unlockedRecipes: ["blacksmith_basic_mining"],
        enhancementLevel: 0
      },
      skill_farmer: {
        level: 1,
        xp: 0,
        unlockedRecipes: ["farmer_basic_planting"],
        enhancementLevel: 0
      },
      skill_chef: {
        level: 1,
        xp: 0,
        unlockedRecipes: ["chef_basic_cooking"],
        enhancementLevel: 0
      },
      skill_tailor: {
        level: 1,
        xp: 0,
        unlockedRecipes: ["tailor_basic_processing"],
        enhancementLevel: 0
      },
      skill_alchemist: {
        level: 1,
        xp: 0,
        unlockedRecipes: ["alchemist_basic_brewing"],
        enhancementLevel: 0
      },
      // MWI: Enhancing is its own non-combat skill, not a profession unlock.
      skill_enhancing: {
        level: 1,
        xp: 0,
        unlockedRecipes: [],
        enhancementLevel: 0
      }
    },
    logs: [{ ts: now, text: "欢迎来到 WorkLife！开始你的多职业冒险吧！" }],
    tradingState: {
      activeListings: [],
      purchaseHistory: []
    },
    activityQueue: [],
    stats: defaultPlayerStats(now),
    achievements: {},
    dailyQuests: undefined,
    settings: defaultPlayerSettings()
  };
}

/** 生成默认生涯统计 */
export function defaultPlayerStats(now: string): import("./types").PlayerStats {
  return {
    totalGathered: 0,
    totalCrafted: 0,
    totalKills: 0,
    totalBossKills: 0,
    totalGoldEarned: 0,
    totalGoldSpent: 0,
    totalXpEarned: 0,
    totalActions: 0,
    totalEnhancements: 0,
    totalTrades: 0,
    highestCombatLevel: 1,
    playtimeSeconds: 0,
    firstPlayedAt: now,
    gatheredByItem: {},
    killsByMonster: {}
  };
}

/** 生成默认玩家设置 */
export function defaultPlayerSettings(): import("./types").PlayerSettings {
  return {
    soundEnabled: true,
    animationsEnabled: true,
    compactMode: false,
    notificationsEnabled: true
  };
}

/**
 * 确保旧存档具备新字段（向后兼容迁移）。
 * 直接在传入对象上补齐缺失的 stats/achievements/settings。
 */
export function ensurePlayerExtensions(player: EnhancedPlayerState): EnhancedPlayerState {
  const now = new Date().toISOString();
  if (!player.stats) {
    player.stats = defaultPlayerStats(now);
  } else {
    // 补齐可能缺失的子字段
    const s = player.stats as any;
    const d = defaultPlayerStats(now);
    for (const k of Object.keys(d) as Array<keyof typeof d>) {
      if (s[k] === undefined) s[k] = d[k];
    }
  }
  if (!player.achievements) player.achievements = {};
  if (!player.settings) player.settings = defaultPlayerSettings();
  const { ensureEnhancingSkill } = require("./enhancement_math") as typeof import("./enhancement_math");
  ensureEnhancingSkill(player);
  // MWI combat skills / abilities (lazy require: these modules import helpers from this file).
  const { ensureCombatSkills } = require("./combat_skills") as typeof import("./combat_skills");
  const { ensureAbilities } = require("./abilities") as typeof import("./abilities");
  ensureCombatSkills(player);
  ensureAbilities(player);
  return player;
}

/**
 * 计算升级所需经验值
 * 使用指数成长曲线，满级200级
 * 1-30级快速升级，之后逐渐变缓
 * 
 * 公式: baseXP * (level^exponent) * multiplier
 * - 1-30级: 较低的指数，快速升级
 * - 31-100级: 中等指数，正常速度
 * - 101-200级: 高指数，极慢速度
 */
export function getXpForLevel(level: number): number {
  if (level < 1) return 0;
  if (level >= 200) return Infinity; // 200级为满级
  
  const baseXP = 50; // 基础经验值
  // 新手期基础值与指数：调低后让 1-30 级升级更快，更早体验中高阶内容
  const earlyBaseXP = 40;
  const earlyExp = 1.35;
  // 30 级锚点：后续阶段都基于此衔接，统一用新手期公式计算，避免边界出现断崖
  const level30XP = Math.floor(earlyBaseXP * Math.pow(30, earlyExp));
  
  if (level <= 30) {
    // 1-30级: 快速升级阶段（已下调 base 40 / 指数 1.35，前期更顺滑）
    return Math.floor(earlyBaseXP * Math.pow(level, earlyExp));
  } else if (level <= 100) {
    // 31-100级: 正常升级阶段
    // 使用中等指数 (2.0)，以 30 级锚点衔接
    const offset = 30;
    return Math.floor(level30XP + baseXP * Math.pow(level - offset, 2.0));
  } else {
    // 101-200级: 极慢升级阶段
    // 使用高指数 (2.5)
    const offset = 100;
    const level100XP = Math.floor(level30XP + baseXP * Math.pow(70, 2.0));
    return Math.floor(level100XP + baseXP * Math.pow(level - offset, 2.5) * 2);
  }
}

/**
 * 获取从1级到指定级别的累计经验值
 */
export function getTotalXpForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += getXpForLevel(i);
  }
  return total;
}

export function appendLog(state: PlayerState | EnhancedPlayerState, text: string) {
  const ts = new Date().toISOString();
  state.logs = [...state.logs.slice(-200), { ts, text }];
}

export function pickSeed() {
  return randomUUID().replace(/-/g, "");
}

export function normalizeInv(inv: Record<string, number>) {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(inv)) {
    if (v > 0) out[k] = v;
  }
  return out;
}

/** 清理已过期的 Buff，返回被移除的 buff 列表 */
export function pruneExpiredBuffs(
  player: EnhancedPlayerState,
  now: Date = new Date()
): import("./types").ActiveBuff[] {
  if (!player.activeBuffs || player.activeBuffs.length === 0) return [];
  const nowMs = now.getTime();
  const expired: import("./types").ActiveBuff[] = [];
  const kept: import("./types").ActiveBuff[] = [];
  for (const b of player.activeBuffs) {
    if (Date.parse(b.expiresAt) <= nowMs) expired.push(b);
    else kept.push(b);
  }
  player.activeBuffs = kept;
  return expired;
}

/**
 * 汇总当前所有生效 Buff 的倍率与属性加成。
 * 同类倍率相乘，属性加成相加。
 */
export function getBuffEffects(
  player: EnhancedPlayerState,
  now: Date = new Date()
): {
  gatherSpeed: number;
  craftSpeed: number;
  combatSpeed: number;
  xpGain: number;
  goldGain: number;
  atk: number;
  def: number;
} {
  const eff = {
    gatherSpeed: 1,
    craftSpeed: 1,
    combatSpeed: 1,
    xpGain: 1,
    goldGain: 1,
    atk: 0,
    def: 0
  };
  if (!player.activeBuffs) return eff;
  const nowMs = now.getTime();
  for (const b of player.activeBuffs) {
    if (Date.parse(b.expiresAt) <= nowMs) continue;
    if (b.multipliers) {
      if (b.multipliers.gatherSpeed) eff.gatherSpeed *= b.multipliers.gatherSpeed;
      if (b.multipliers.craftSpeed) eff.craftSpeed *= b.multipliers.craftSpeed;
      if (b.multipliers.combatSpeed) eff.combatSpeed *= b.multipliers.combatSpeed;
      if (b.multipliers.xpGain) eff.xpGain *= b.multipliers.xpGain;
      if (b.multipliers.goldGain) eff.goldGain *= b.multipliers.goldGain;
    }
    if (b.stats) {
      if (b.stats.atk) eff.atk += b.stats.atk;
      if (b.stats.def) eff.def += b.stats.def;
    }
  }
  return eff;
}

/**
 * 汇总当前已穿戴装备提供的攻防属性（基础 + 强化 + 套装）。
 * 让"造更好的装备"真正影响战斗收益：ATK 提升战斗速度、DEF 提升战斗金币收益。
 * 与 getEquipmentStats 的口径保持一致：强化每级 +10% 基础属性。
 */
export function getEquippedCombatStats(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack
): { atk: number; def: number } {
  let atk = 0;
  let def = 0;
  const eq = player.equipment as any;
  if (!eq) return { atk, def };
  const items: any[] = (contentPack as any)?.items || [];
  const findItem = (id: string) => items.find((i: any) => i.id === id);
  for (const [slot, itemId] of Object.entries(eq)) {
    if (!itemId || typeof itemId !== "string") continue;
    if (slot === "enhancementLevels" || slot === "durability" || slot === "maxDurability" || slot === "tool") continue;
    const item = findItem(itemId);
    if (!item) continue;
    const enhLevel = (eq.enhancementLevels && eq.enhancementLevels[itemId]) || 0;
    const mult = enhancementStatMultiplier(enhLevel, item);
    if (item.atk) atk += item.atk * mult;
    // 法杖类以 mag 记伤害；MWI 里魔法伤害与物理伤害同一条路径
    if (item.mag) atk += item.mag * mult;
    if (item.def) def += item.def * mult;
  }
  // 套装加成
  const sets: any[] = (contentPack as any)?.equipmentSets || [];
  for (const set of sets) {
    let equippedPieces = 0;
    for (const piece of set.pieces || []) {
      if (eq[piece.slot] === piece.itemId) equippedPieces++;
    }
    // 内容包字段为 set.bonuses（与 types.ts / storage_memory 保持一致）
    for (const bonus of set.bonuses || []) {
      if (equippedPieces >= (bonus.requiredPieces || 99)) {
        if (bonus.stats?.atk) atk += bonus.stats.atk;
        if (bonus.stats?.def) def += bonus.stats.def;
      }
    }
  }
  return { atk: Math.round(atk), def: Math.round(def) };
}

/**
 * 汇总当前已激活套装提供的「生产型」增益（采集/制作/战斗速度、经验、金币）。
 * 套装 bonus.stats 中的速度/经验/金币以「百分比点数」记（如 combatSpeed:10 表示 +10%）。
 * 返回乘数（如 1.1），让收集整套装备对采集/制作/战斗效率产生真实增益，而不仅是战斗 ATK/DEF。
 */
export function getEquippedProductionBuffs(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack
): { gatherSpeed: number; craftSpeed: number; combatSpeed: number; xpGain: number; goldGain: number } {
  const pct: Record<string, number> = {
    gatherSpeed: 0,
    craftSpeed: 0,
    combatSpeed: 0,
    xpGain: 0,
    goldGain: 0
  };
  const eq = player.equipment as any;
  if (!eq) return { gatherSpeed: 1, craftSpeed: 1, combatSpeed: 1, xpGain: 1, goldGain: 1 };
  const sets: any[] = (contentPack as any)?.equipmentSets || [];
  for (const set of sets) {
    let equippedPieces = 0;
    for (const piece of set.pieces || []) {
      if (eq[piece.slot] === piece.itemId) equippedPieces++;
    }
    for (const bonus of set.bonuses || []) {
      if (equippedPieces >= (bonus.requiredPieces || 99)) {
        const s = bonus.stats || {};
        for (const k of Object.keys(pct)) {
          if (typeof s[k] === "number") pct[k] += s[k];
        }
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

export type SimulateResult = {
  state: PlayerState | EnhancedPlayerState;
};

export type ActionRates = {
  isCombatAct: boolean;
  hasConsumesAct: boolean;
  /** Multiplier applied to base duration (1.25 = 25% faster). */
  speedMul: number;
  effectiveDurationMs: number;
  /** MWI-style efficiency: chance/count of free instant repeats per completed cycle, in percent. */
  efficiencyPct: number;
  /** Where the bonuses come from, for the action panel. */
  speedSources: Array<{ label: string; pct: number }>;
  efficiencySources: Array<{ label: string; pct: number }>;
  xpMul: number;
  goldMul: number;
  defGoldMul: number;
  setBuffs: ReturnType<typeof getEquippedProductionBuffs>;
  repBuffs: ReturnType<typeof getReputationBonuses>;
  prestigeMul: number;
};

/** Sum of an equipment stat (e.g. `efficiency`, `gatherSpeed`) across equipped items, with enhancement. */
function equippedStatSum(player: EnhancedPlayerState, pack: EnhancedContentPack, stat: string): number {
  const eq = player.equipment as any;
  if (!eq) return 0;
  const items: any[] = (pack as any)?.items || [];
  let total = 0;
  for (const [slot, itemId] of Object.entries(eq)) {
    if (!itemId || typeof itemId !== "string") continue;
    if (slot === "enhancementLevels" || slot === "durability" || slot === "maxDurability" || slot === "tool") continue;
    const item = items.find((i: any) => i.id === itemId);
    const v = Number(item?.[stat] ?? item?.stats?.[stat] ?? 0);
    if (!v) continue;
    const enh = (eq.enhancementLevels && eq.enhancementLevels[itemId]) || 0;
    total += v * enhancementStatMultiplier(enh, item);
  }
  return total;
}

/**
 * Everything that changes how fast / how often an action completes for this player, in one place.
 * Used by the simulator and by GET /actions/preview so the panel and the server never disagree.
 *
 * Speed follows the existing multiplicative buff/set/reputation model. Efficiency follows MWI:
 * +1% per skill level above the action's requirement, plus equipment `efficiency`, plus a buff
 * `efficiency` percentage if present; guaranteed repeats = floor(eff/100), remainder is a chance.
 * Efficiency never applies to combat actions.
 */
export function getActionRates(
  player: EnhancedPlayerState,
  pack: EnhancedContentPack,
  action: any,
  now: Date
): ActionRates {
  const buffEff = getBuffEffects(player, now);
  const isCombatAct = typeof action.id === "string" && action.id.startsWith("act_combat_");
  const hasConsumesAct = Array.isArray(action.consumes) && action.consumes.length > 0;
  const equipStats = isCombatAct ? getEquippedCombatStats(player, pack) : { atk: 0, def: 0 };
  // ATK→战斗加速：每点 ATK +0.5% 速度，最高 +200%（3 倍速）；DEF→战斗金币 +0.4%/点，最高 +150%
  const atkSpeedMul = isCombatAct ? Math.min(3, 1 + equipStats.atk * 0.005) : 1;
  const defGoldMul = isCombatAct ? Math.min(2.5, 1 + equipStats.def * 0.004) : 1;
  const setBuffs = getEquippedProductionBuffs(player, pack);
  const repBuffs = getReputationBonuses(player);
  const prestigeMul = getPrestigeMultiplier(player);
  const lane = isCombatAct ? "combatSpeed" : hasConsumesAct ? "craftSpeed" : "gatherSpeed";
  const buffSpeed = (buffEff as any)[lane] as number;
  const setSpeed = (setBuffs as any)[lane] as number;
  const repSpeed = (repBuffs as any)[lane] as number;
  // MWI tool speed: the equipped tool speeds up its own profession's skilling actions (not combat).
  const toolId = (player.equipment as any)?.tool as string | undefined;
  const toolDef = toolId ? ((pack as any).items as any[]).find((i) => i.id === toolId) : undefined;
  const toolApplies = !!toolDef && !isCombatAct && toolDef.toolFor === action.skillId && Number(toolDef.toolSpeed) > 0;
  const toolEnh = toolApplies ? Number((player.equipment as any)?.enhancementLevels?.[toolId!] || 0) : 0;
  const toolSpeedMul = toolApplies
    ? 1 + Number(toolDef.toolSpeed) * enhancementStatMultiplier(toolEnh, toolDef)
    : 1;
  const speedMul = buffSpeed * atkSpeedMul * setSpeed * repSpeed * toolSpeedMul;
  const effectiveDurationMs = Math.max(1, Number(action.duration || 0) / (speedMul || 1));

  const speedSources: Array<{ label: string; pct: number }> = [];
  const pushPct = (arr: typeof speedSources, label: string, mul: number) => {
    const pct = Math.round((mul - 1) * 1000) / 10;
    if (Math.abs(pct) >= 0.05) arr.push({ label, pct });
  };
  if (toolApplies) pushPct(speedSources, `工具 · ${toolDef.name}`, toolSpeedMul);
  pushPct(speedSources, "增益", buffSpeed);
  pushPct(speedSources, "套装", setSpeed);
  pushPct(speedSources, "声望", repSpeed);
  if (isCombatAct) pushPct(speedSources, "攻击力", atkSpeedMul);

  const { houseLevelForSkill, roomForSkill, HOUSE_EFFICIENCY_PER_LEVEL, HOUSE_XP_PER_LEVEL } =
    require("./houses") as typeof import("./houses");
  const houseLevel = isCombatAct ? 0 : houseLevelForSkill(player, action.skillId);
  const houseRoomName = roomForSkill(action.skillId)?.name || "";

  const efficiencySources: Array<{ label: string; pct: number }> = [];
  let efficiencyPct = 0;
  if (!isCombatAct) {
    const reqLevel = Number(action.requirements?.skillLevel || 1);
    const skillLevel = Number(player.skills?.[action.skillId]?.level || 1);
    const levelBonus = Math.max(0, skillLevel - reqLevel);
    if (levelBonus > 0) efficiencySources.push({ label: `等级高出 ${levelBonus} 级`, pct: levelBonus });
    const gearEff = equippedStatSum(player, pack, "efficiency");
    if (gearEff > 0) efficiencySources.push({ label: "装备", pct: Math.round(gearEff * 10) / 10 });
    const buffEffPct = Number((buffEff as any).efficiency || 0);
    if (buffEffPct > 0) efficiencySources.push({ label: "增益", pct: buffEffPct });
    if (houseLevel > 0) efficiencySources.push({ label: `房屋 · ${houseRoomName}`, pct: houseLevel * HOUSE_EFFICIENCY_PER_LEVEL });
    efficiencyPct = efficiencySources.reduce((s, x) => s + x.pct, 0);
  }

  // MWI house: the skill's room adds +1% XP per level (combat XP goes through hp_combat instead).
  const houseXpMul = !isCombatAct && houseLevel > 0 ? 1 + houseLevel * HOUSE_XP_PER_LEVEL : 1;
  const xpMul = (buffEff.xpGain || 1) * setBuffs.xpGain * repBuffs.xpGain * prestigeMul * houseXpMul;
  // 金币收益受 goldGain Buff 影响；战斗金币额外受装备 DEF 加成
  const goldMul = (buffEff.goldGain || 1) * defGoldMul * setBuffs.goldGain * repBuffs.goldGain * prestigeMul;
  return { isCombatAct, hasConsumesAct, speedMul, effectiveDurationMs, efficiencyPct, speedSources, efficiencySources, xpMul, goldMul, defGoldMul, setBuffs, repBuffs, prestigeMul };
}

/**
 * MWI Rare Find: a multiplier on the base chance of any sub-100% yield / rare drop.
 * Sources add together (equipment `rareFind` percent, buff `rareFind`), then apply as ×(1 + total/100).
 * A 0.5% base drop with +10% rare find becomes 0.55%, never 10.5%.
 */
export function getRareFindMultiplier(player: EnhancedPlayerState, pack: EnhancedContentPack, now: Date = new Date()): number {
  const gear = equippedStatSum(player, pack, "rareFind");
  const buffs = getBuffEffects(player, now) as unknown as { rareFind?: number };
  // MWI house: 训练场 adds +1% rare find per level.
  const { houseLevelForSkill, HOUSE_RARE_FIND_PER_LEVEL } = require("./houses") as typeof import("./houses");
  const house = houseLevelForSkill(player, "skill_combat") * HOUSE_RARE_FIND_PER_LEVEL;
  const total = gear + Number(buffs.rareFind || 0) + house;
  return Math.max(0, 1 + total / 100);
}

/** The same probability contract is used by settlement and the action preview. */
export function yieldChance(base: number | undefined, rareFindMultiplier: number): number {
  const chance = base ?? 1;
  if (!Number.isFinite(chance) || chance <= 0) return 0;
  return chance >= 1 ? 1 : Math.min(1, Math.max(0, chance * rareFindMultiplier));
}

/** Free repeats granted by efficiency for one completed time-cycle. */
export function efficiencyRepeats(efficiencyPct: number, rng: () => number = Math.random): number {
  if (!(efficiencyPct > 0)) return 0;
  const guaranteed = Math.floor(efficiencyPct / 100);
  const chance = (efficiencyPct % 100) / 100;
  return guaranteed + (rng() < chance ? 1 : 0);
}

export const ACTION_QUEUE_MAX = 5;

/**
 * Why a queued action cannot start right now (undefined = it can).
 * Shared by the queue API (to reject early) and by the simulator (to skip while offline).
 */
export function queuedActionBlocker(
  state: EnhancedPlayerState,
  pack: EnhancedContentPack,
  actionId: string
): string | undefined {
  const action = (pack.actions as any[]).find((a) => a.id === actionId) as any;
  if (!action) return "unknown_action";
  if (typeof action.id === "string" && action.id.startsWith("act_combat_")) return "combat_not_queueable";
  const reqLevel = action.requirements?.skillLevel || 1;
  if (reqLevel > 1 && (state.skills[action.skillId]?.level || 0) < reqLevel) return `skill_level_required:${reqLevel}`;
  if (Array.isArray(action.consumes)) {
    for (const c of action.consumes) {
      if ((state.inventory[c.itemId] || 0) < c.qty) return `missing_material:${c.itemId}`;
    }
  }
  return undefined;
}

/**
 * Pop queue items until one can start; start it at `at` (the exact moment the previous action ended).
 * Items that cannot start (materials gone, level too low) are dropped with a log line, like MWI.
 */
export function startNextQueuedAction(
  state: EnhancedPlayerState,
  pack: EnhancedContentPack,
  at: Date
): boolean {
  if (!Array.isArray(state.activityQueue)) state.activityQueue = [];
  while (state.activityQueue.length > 0) {
    const item = state.activityQueue.shift()!;
    const action = (pack.actions as any[]).find((a) => a.id === item.actionId) as any;
    const blocker = queuedActionBlocker(state, pack, item.actionId);
    if (blocker) {
      const why = blocker.startsWith("missing_material") ? "材料不足" : blocker.startsWith("skill_level") ? "等级不足" : "无法开始";
      appendLog(state, `队列跳过：${action?.name || item.actionId}（${why}）`);
      continue;
    }
    const qty = typeof item.quantity === "number" && item.quantity > 0 ? Math.min(Math.floor(item.quantity), 5000) : undefined;
    state.mode = "life_action";
    state.lifeActionState = {
      actionId: item.actionId,
      startedAt: at.toISOString(),
      ...(qty !== undefined ? { quantity: qty, remaining: qty } : {}),
    };
    appendLog(state, qty !== undefined ? `队列：开始 ${action.name} ×${qty}` : `队列：开始 ${action.name}`);
    return true;
  }
  return false;
}

type SimulationInput = {
  state: PlayerState | EnhancedPlayerState; 
  now: Date; 
  contentPack: ContentPack | EnhancedContentPack;
  /** Injectable for deterministic tests (efficiency repeats, chance yields). */
  rng?: () => number;
};

/** Bounded chunks preserve their unprocessed time; callers choose scheduling by storage contract. */
function* settlementChunks(input: SimulationInput): Generator<SimulateResult> {
  let state = structuredClone(input.state);
  for (;;) {
    const previousTime = Date.parse(state.lastSimulatedAt);
    const result = simulateToNow({ ...input, state });
    state = result.state;
    yield result;
    if ((state as EnhancedPlayerState).settlement?.complete !== false) return;
    if (Date.parse(state.lastSimulatedAt) <= previousTime) throw new Error('settlement_no_progress');
  }
}

/** PostgreSQL detects writes accepted during a scheduling yield with its revision CAS. */
export async function settleToNow(input: SimulationInput): Promise<SimulateResult> {
  let result!: SimulateResult;
  for (result of settlementChunks(input)) {
    if ((result.state as EnhancedPlayerState).settlement?.complete === false) {
      await new Promise<void>(resolve => setImmediate(resolve));
    }
  }
  return result;
}

/** Memory writes have no database CAS: drain and publish without an event-loop yield. */
export function settleToNowSync(input: SimulationInput): SimulateResult {
  let result!: SimulateResult;
  for (result of settlementChunks(input)) { /* consume every bounded chunk */ }
  return result;
}

export function simulateToNow(input: SimulationInput): SimulateResult {
  const previous = (input.state as EnhancedPlayerState).settlement;
  const last = Date.parse(input.state.lastSimulatedAt);
  if (!Number.isFinite(last) || !Number.isFinite(+input.now)) throw new Error('invalid_simulation_time');
  if (+input.now < last) return { state: input.state };
  const pending = previous && !previous.complete;
  const target = pending ? Date.parse(previous.targetUntil) : Math.min(+input.now, last + 24 * 3600_000);
  const requested = pending ? previous.requestedUntil : input.now.toISOString();
  const result = simulateWindow({ ...input, now: new Date(target) });
  const state = result.state as EnhancedPlayerState;
  const complete = Date.parse(state.lastSimulatedAt) >= target;
  state.settlement = { processedUntil: state.lastSimulatedAt, targetUntil: new Date(target).toISOString(),
    requestedUntil: requested, complete, cappedByOfflineLimit: target < Date.parse(requested) };
  if (complete && state.settlement.cappedByOfflineLimit) {
    const delta = Date.parse(requested) - target;
    state.lastSimulatedAt = requested;
    // Drop only time outside the explicit offline cap, including the action's old time anchor.
    if (state.lifeActionState) {
      state.lifeActionState.startedAt = new Date(Date.parse(state.lifeActionState.startedAt) + delta).toISOString();
    }
    const combat = state.hpCombat;
    if (combat) {
      for (const key of ['startedAt', 'nextFightAt', 'heavyChopReadyAt', 'braceUntil'] as const) {
        if (typeof combat[key] === 'number') combat[key] = combat[key]! + delta;
      }
      if (combat.foodReadyAt) combat.foodReadyAt = combat.foodReadyAt.map(t => t + delta);
      if (combat.abilityReadyAt) for (const key of Object.keys(combat.abilityReadyAt)) combat.abilityReadyAt[key] += delta;
    }
    if (state.enhanceRun && !state.enhanceRun.outcome) state.enhanceRun.nextAttemptAt += delta;
    pruneExpiredBuffs(state, new Date(requested));
    appendLog(state, '离线收益已按24小时上限结算。');
  }
  return result;
}

function simulateWindow(input: SimulationInput): SimulateResult {
  const next = { ...input.state } as EnhancedPlayerState;
  const lastSimulated = new Date(next.lastSimulatedAt);
  const timeDiff = input.now.getTime() - lastSimulated.getTime();

  // 确保统计字段存在（向后兼容旧存档）
  ensurePlayerExtensions(next);
  ensureProgression(next, input.now);
  const stats = next.stats!;

  // 防作弊：检查时间是否倒退
  if (timeDiff < 0) {
    appendLog(next, `检测到时间异常，已重置`);
    next.lastSimulatedAt = input.now.toISOString();
    return { state: next };
  }

  // MWI 任务板：按冷却发任务，离线期间也会填满空槽
  {
    const { ensureTasks } = require("./tasks") as typeof import("./tasks");
    ensureTasks(next, input.contentPack as EnhancedContentPack, input.now, input.rng);
  }

  // Tick a running fight, or a finished one that auto-repeat is about to restart.
  const hpc = next.hpCombat;
  const awaitingRepeat = !!(hpc && hpc.outcome && next.combatLoadout?.autoRepeat && hpc.nextFightAt);
  if (hpc && (!hpc.outcome || awaitingRepeat) && timeDiff > 0) {
    const { tickHpCombat } = require("./hp_combat") as typeof import("./hp_combat");
    const processed = tickHpCombat(next, input.contentPack as EnhancedContentPack, input.now, timeDiff, input.rng);
    if (processed < +input.now) {
      next.lastSimulatedAt = new Date(processed).toISOString();
      addPlaytime(stats, Math.max(0, processed - +lastSimulated));
      ensureProgression(next, new Date(processed));
      return { state: next };
    }
  }

  // 进度以 lifeActionState.startedAt 为锚，所以任意频率的轮询都不会丢进度；这里只挡住
  // 极高频的重复请求。HP 战斗必须吃掉亚秒 tick，否则 250ms 轮询打不出伤害。
  if (timeDiff <= 0) {
    if (next.hpCombat) {
      next.lastSimulatedAt = input.now.toISOString();
    }
    return { state: next };
  }

  let advanceClock = true;

  // 清理过期 Buff 并汇总当前增益效果（用于离线/挂机结算）
  pruneExpiredBuffs(next, input.now);
  // 离线收益上限：从 8 小时提升至 24 小时，覆盖“睡一觉/上一天班”的真实离线场景
  const maxOfflineTime = 24 * 60 * 60 * 1000; // 24小时
  if (timeDiff > maxOfflineTime) {
    appendLog(next, `离线时间过长，只计算最近24小时的收益`);
  }
  
  // 限制实际计算的时间差
  const effectiveTimeDiff = Math.min(timeDiff, maxOfflineTime);
  
  // 队列推进时记录当前动作精确结束的时刻，让离线时间窗剩余部分继续给下一个动作
  let finishedAt: Date | null = null;

  // MWI 强化计时动作：结算到 now（受 24h 离线上限约束）的每一次尝试
  if (next.enhanceRun && !next.enhanceRun.outcome) {
    const { tickEnhanceRun } = require("./enhancement_run") as typeof import("./enhancement_run");
    const untilMs = Math.min(input.now.getTime(), lastSimulated.getTime() + maxOfflineTime);
    const ended = tickEnhanceRun(next, input.contentPack as EnhancedContentPack, untilMs, input.rng);
    if (ended) finishedAt = ended;
  }

  // 处理职业活动的离线进度
  if (next.mode === 'life_action' && next.lifeActionState) {
    const actionStartTime = new Date(next.lifeActionState.startedAt);
    // 以 startedAt（当前这一轮的真实开始时刻）为锚计算进度，而不是上次结算时刻：
    // 否则每次轮询完成一轮后，剩下的零头都会被丢掉，5 秒的动作在 1 秒轮询下会变成 5~6 秒。
    const sinceCycleStart = Math.max(0, input.now.getTime() - actionStartTime.getTime());
    const actionDuration = Math.min(sinceCycleStart, maxOfflineTime);
    
    // 查找动作定义
    const contentPack = input.contentPack as EnhancedContentPack;
    const action = contentPack.actions.find((a: any) => a.id === next.lifeActionState!.actionId) as any;
    
    if (action && action.duration) {
      const rates = getActionRates(next, contentPack, action, input.now);
      const effectiveDuration = rates.effectiveDurationMs;
      // 计算可以完成多少次动作
      const completedCycles = Math.floor(actionDuration / effectiveDuration);
      
      if (completedCycles > 0) {
        // 限制离线进度，最多8小时的收益
        const maxCycles = Math.floor(maxOfflineTime / effectiveDuration);
        const actualCycles = Math.min(completedCycles, maxCycles);
        
        // 防作弊：限制单次最多完成500次动作，防止高级动作产出过多
        let safeCycles = Math.min(actualCycles, 500);

        // 批量制作：若设置了剩余次数（remaining），本次最多只完成剩余次数
        const requestedRemaining =
          typeof next.lifeActionState.remaining === 'number' && next.lifeActionState.remaining >= 0
            ? next.lifeActionState.remaining
            : undefined;
        if (requestedRemaining !== undefined) {
          safeCycles = Math.min(safeCycles, requestedRemaining);
        }

        // 防作弊：限制单个物品最大产出数量
        const MAX_ITEM_OUTPUT = 5000;
        
        // 处理每次完成的奖励
        const totalRewards: Record<string, number> = {};
        // 实际完成的次数（可能因材料不足或剩余次数限制而提前结束）
        let actuallyCompleted = 0;
        // 消耗掉的时间周期数：效率触发的免费重复不占时间，所以要和完成次数分开记
        let timeCyclesUsed = 0;
        let bonusCompletions = 0;
        const rng = input.rng || Math.random;
        
        const rareFindMul = getRareFindMultiplier(next, contentPack, input.now);
        cycles: while (timeCyclesUsed < safeCycles) {
          timeCyclesUsed += 1;
          const repeats = 1 + efficiencyRepeats(rates.efficiencyPct, rng);
          for (let r = 0; r < repeats; r++) {
          // 检查材料需求
          let canComplete = true;
          if (action.consumes && Array.isArray(action.consumes)) {
            for (const consume of action.consumes) {
              const available = next.inventory[consume.itemId] || 0;
              if (available < consume.qty) {
                canComplete = false;
                break;
              }
            }
          }
          
          if (!canComplete) break cycles;
          actuallyCompleted += 1;
          if (r > 0) bonusCompletions += 1;
          
          // 消耗材料
          if (action.consumes && Array.isArray(action.consumes)) {
            for (const consume of action.consumes) {
              next.inventory[consume.itemId] = (next.inventory[consume.itemId] || 0) - consume.qty;
            }
          }

          // 统计：动作类型判定（战斗/制作/采集）
          const isCombat = typeof action.id === 'string' && action.id.startsWith('act_combat_');
          const hasConsumes = Array.isArray(action.consumes) && action.consumes.length > 0;
          stats.totalActions += 1;
          // Per-action tally: MWI-style tasks ("砍伐小白杨 ×120") read their progress from here.
          if (!stats.actionsById) stats.actionsById = {};
          stats.actionsById[action.id] = (stats.actionsById[action.id] || 0) + 1;
          if (isCombat) {
            stats.totalKills += 1;
            const monId: string | undefined = action.monsterId || action.targetId;
            if (monId) {
              stats.killsByMonster[monId] = (stats.killsByMonster[monId] || 0) + 1;
            }
            if (action.isBoss || (typeof action.id === 'string' && action.id.includes('boss'))) {
              stats.totalBossKills += 1;
            }
          } else if (hasConsumes) {
            stats.totalCrafted += 1;
          } else {
            stats.totalGathered += 1;
          }
          
          // 给予奖励（带产出上限检查）
          if (action.yields && Array.isArray(action.yields)) {
            for (const yield_ of action.yields) {
              // 检查是否已达到产出上限
              const currentTotal = totalRewards[yield_.itemId] || 0;
              if (currentTotal >= MAX_ITEM_OUTPUT) continue;
              
              const chance = yieldChance(yield_.chance, rareFindMul);
              if (rng() < chance) {
                // 金币收益受 goldGain Buff 影响；战斗金币额外受装备 DEF 加成
                const baseQty =
                  yield_.itemId === 'gold'
                    ? Math.round(yield_.qty * rates.goldMul)
                    : yield_.qty;
                const addAmount = Math.min(baseQty, MAX_ITEM_OUTPUT - currentTotal);
                const currentAmount = next.inventory[yield_.itemId] || 0;
                next.inventory[yield_.itemId] = currentAmount + addAmount;
                totalRewards[yield_.itemId] = currentTotal + addAmount;
                // 统计：金币与采集物
                if (yield_.itemId === 'gold') {
                  stats.totalGoldEarned += addAmount;
                } else if (!isCombat && !hasConsumes) {
                  stats.gatheredByItem[yield_.itemId] =
                    (stats.gatheredByItem[yield_.itemId] || 0) + addAmount;
                }
              }
            }
          }
          
          // 给予经验（受 xpGain Buff 影响，并叠加套装/声望经验增益与转生全局倍率）
          if (action.xp && action.skillId) {
            const gainedXp = Math.round(
              action.xp * rates.xpMul
            );
            // 统计：累计经验
            stats.totalXpEarned += gainedXp;
            // 检查是否为战斗动作
            const isCombatAction = action.id.startsWith('act_combat_');
            
            if (isCombatAction) {
              // 战斗动作：按 MWI 30/70 规则分给五条战斗技能，战斗等级由其推导
              const { grantCombatXp } = require("./combat_skills") as typeof import("./combat_skills");
              grantCombatXp(next, gainedXp, input.contentPack);
              next.combatXp = (next.combatXp || 0) + gainedXp;
            } else {
              // 非战斗动作增加职业经验
              const playerSkill = next.skills[action.skillId];
              if (playerSkill) {
                playerSkill.xp += gainedXp;
                
                // 检查升级 - 使用新的指数成长曲线
                let levelUpXp = getXpForLevel(playerSkill.level);
                while (playerSkill.xp >= levelUpXp && playerSkill.level < 200) {
                  playerSkill.level += 1;
                  playerSkill.xp -= levelUpXp;
                  appendLog(next, `${action.skillId} 技能升级到 ${playerSkill.level} 级！`);
                  levelUpXp = getXpForLevel(playerSkill.level);
                }
                
                // 如果达到满级，保留多余经验但不再升级
                if (playerSkill.level >= 200) {
                  playerSkill.level = 200;
                  appendLog(next, `${action.skillId} 已达到满级 200 级！`);
                }
              }
            }
          }
          // 批量：完成次数达到剩余次数就停，哪怕这一周期的效率重复还没用完
          if (requestedRemaining !== undefined && actuallyCompleted >= requestedRemaining) break cycles;
          }
        }
        
        // 记录收益
        if (Object.keys(totalRewards).length > 0) {
          const rewardText = Object.entries(totalRewards)
            .map(([itemId, qty]) => `${itemId} x${qty}`)
            .join(', ');
          const bonusText = bonusCompletions > 0 ? `（效率额外 ${bonusCompletions} 次）` : '';
          appendLog(next, `完成 ${actuallyCompleted} 次 ${action.name}${bonusText}，获得：${rewardText}`);
        }

        // 批量制作：扣减剩余次数
        if (requestedRemaining !== undefined && next.lifeActionState) {
          const newRemaining = Math.max(0, requestedRemaining - actuallyCompleted);
          next.lifeActionState.remaining = newRemaining;

          // 判断是否还能继续制作（剩余次数用尽，或材料不足以再完成一次）
          let materialsExhausted = false;
          if (action.consumes && Array.isArray(action.consumes)) {
            for (const consume of action.consumes) {
              if ((next.inventory[consume.itemId] || 0) < consume.qty) {
                materialsExhausted = true;
                break;
              }
            }
          }

          if (newRemaining <= 0 || materialsExhausted) {
            // 批量任务完成（或因材料耗尽提前结束），自动停止
            if (newRemaining <= 0) {
              appendLog(next, `批量制作完成：${action.name} ×${requestedRemaining}`);
            } else {
              appendLog(next, `材料不足，已停止制作：${action.name}（剩余 ${newRemaining} 次未完成）`);
            }
            next.mode = 'idle';
            next.lifeActionState = undefined;
            finishedAt = new Date(actionStartTime.getTime() + timeCyclesUsed * effectiveDuration);
          }
        } else if (action.consumes && Array.isArray(action.consumes)) {
          // 无限制作：下一轮材料不够就停下（银河奶牛的做法），让队列能接上下一个动作，
          // 也避免顶栏一直转却什么都不产出
          let materialsExhausted = false;
          for (const consume of action.consumes) {
            if ((next.inventory[consume.itemId] || 0) < consume.qty) {
              materialsExhausted = true;
              break;
            }
          }
          if (materialsExhausted) {
            appendLog(next, `材料不足，已停止：${action.name}`);
            next.mode = 'idle';
            next.lifeActionState = undefined;
            finishedAt = new Date(actionStartTime.getTime() + timeCyclesUsed * effectiveDuration);
          }
        }

        // 更新动作开始时间（若动作仍在进行）：把没走完的零头留给下一轮
        if (next.lifeActionState) {
          const remainingTime = actionDuration - timeCyclesUsed * effectiveDuration;
          next.lifeActionState.startedAt = new Date(input.now.getTime() - remainingTime).toISOString();
        }
      } else {
        // 一次都没完成：若是材料不足导致的制作，也应停止，避免卡在 life_action 模式
        if (action.consumes && Array.isArray(action.consumes)) {
          let materialsExhausted = false;
          for (const consume of action.consumes) {
            if ((next.inventory[consume.itemId] || 0) < consume.qty) {
              materialsExhausted = true;
              break;
            }
          }
          if (materialsExhausted) {
            appendLog(next, `材料不足，无法制作：${action.name}`);
            next.mode = 'idle';
            next.lifeActionState = undefined;
            finishedAt = actionStartTime;
          }
        }
      }
    }
  }

  // 行动队列：当前动作结束后，立刻从结束时刻接上下一个动作，并把时间窗剩余部分继续结算
  if (next.mode !== 'life_action' && finishedAt && Array.isArray(next.activityQueue) && next.activityQueue.length > 0) {
    const startAt: Date = finishedAt;
    if (startNextQueuedAction(next, input.contentPack as EnhancedContentPack, startAt)) {
      next.lastSimulatedAt = startAt.toISOString();
      addPlaytime(stats, startAt.getTime() - lastSimulated.getTime());
      if ((next.combatLevel || 1) > stats.highestCombatLevel) stats.highestCombatLevel = next.combatLevel || 1;
      return simulateWindow({ state: next, now: input.now, contentPack: input.contentPack, rng: input.rng });
    }
  }

  // 统计：刷新历史最高战斗等级
  if ((next.combatLevel || 1) > stats.highestCombatLevel) {
    stats.highestCombatLevel = next.combatLevel || 1;
  }

  if (next.mode !== "life_action" || !next.lifeActionState) {
    advanceClock = true;
  }
  if (advanceClock) {
    next.lastSimulatedAt = input.now.toISOString();
    addPlaytime(stats, Math.min(timeDiff, maxOfflineTime));
  }
  
  ensureProgression(next, input.now);
  return { state: next };
}

/** Accumulate playtime in ms so sub-second polls do not floor away to nothing. */
function addPlaytime(stats: PlayerStats, ms: number) {
  const total = Math.max(0, ms) + (stats.playtimeCarryMs || 0);
  stats.playtimeSeconds += Math.floor(total / 1000);
  stats.playtimeCarryMs = total % 1000;
}

// 交易行相关工具函数
export function createMarketListing(
  sellerId: string,
  itemId: string,
  quantity: number,
  pricePerUnit: number,
  durationHours: number = 24
): MarketListing {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000);
  
  return {
    id: randomUUID(),
    sellerId,
    itemId,
    quantity,
    pricePerUnit,
    listedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    status: 'active'
  };
}

export function calculateTradingFee(totalPrice: number, feeRate: number = 0.05): number {
  return Math.floor(totalPrice * feeRate);
}

// 组队相关工具函数
export function createParty(leaderId: string, name?: string): Party {
  return {
    id: randomUUID(),
    leaderId,
    members: [{
      userId: leaderId,
      role: 'leader',
      joinedAt: new Date().toISOString(),
      isOnline: true
    }],
    createdAt: new Date().toISOString()
  };
}

export function addPartyMember(party: Party, userId: string, role: string = 'member'): Party {
  if (party.members.length >= 6) {
    throw new Error('Party is full');
  }
  
  if (party.members.some(m => m.userId === userId)) {
    throw new Error('User already in party');
  }
  
  return {
    ...party,
    members: [
      ...party.members,
      {
        userId,
        role,
        joinedAt: new Date().toISOString(),
        isOnline: true
      }
    ]
  };
}
