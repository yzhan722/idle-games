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
  EnhancementServiceRequest,
  EnhancementProvider
} from "./types";
import { randomUUID } from "crypto";
import path from "path";
import { createPgStorage } from "./storage_pg";
import { createMemoryStorage } from "./storage_memory";
// 声望/转生：永久被动加成与全局倍率，接入离线结算 simulateToNow。
// 注：progression2 也会从本模块导入 appendLog/ensurePlayerExtensions，
// 二者均仅在函数体内（运行时）相互引用，故此循环依赖在求值期是安全的。
import { getReputationBonuses, getPrestigeMultiplier } from "./progression2";

// 存储接口类型定义
export interface Storage {
  init(): Promise<void>;
  close(): Promise<void>;
  healthCheck(): Promise<{ ok: boolean; latencyMs: number }>;
  cleanupExpiredListings(): Promise<number>;
  findOrCreateGuestUser(deviceId: string): Promise<UserRecord>;
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
  }): Promise<EnhancementResult>;
  
  getEnhancementInfo(params: {
    userId: string;
    itemId: string;
    contentPack: EnhancedContentPack;
  }): Promise<{
    currentLevel: number;
    maxLevel: number;
    nextLevelCost: Record<string, number>;
    successRate: number;
    canEnhance: boolean;
    requiredProfession?: string;
  }>;
  
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
    // 新手启动礼包：给少量金币 + 刚好够做第一把木剑的材料(lumber_1 ×3)，
    // 让玩家进游戏就能立刻产出第一件装备并体验商店，加快首次正反馈。
    inventory: { gold: 50, wood_1: 4, lumber_1: 3 },
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
        unlockedRecipes: ["woodcutter_basic_cutting"],
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
    if (slot === "enhancementLevels" || slot === "durability" || slot === "maxDurability") continue;
    const item = findItem(itemId);
    if (!item) continue;
    const enhLevel = (eq.enhancementLevels && eq.enhancementLevels[itemId]) || 0;
    const mult = 1 + enhLevel * 0.1; // 强化每级 +10%
    if (item.atk) atk += item.atk * mult;
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

export function simulateToNow(input: { 
  state: PlayerState | EnhancedPlayerState; 
  now: Date; 
  contentPack: ContentPack | EnhancedContentPack 
}): SimulateResult {
  const next = { ...input.state } as EnhancedPlayerState;
  const lastSimulated = new Date(next.lastSimulatedAt);
  const timeDiff = input.now.getTime() - lastSimulated.getTime();

  // 确保统计字段存在（向后兼容旧存档）
  ensurePlayerExtensions(next);
  const stats = next.stats!;

  // 防作弊：检查时间是否倒退
  if (timeDiff < 0) {
    appendLog(next, `检测到时间异常，已重置`);
    next.lastSimulatedAt = input.now.toISOString();
    return { state: next };
  }

  // 小于 1 秒的轮询不得把 lastSimulatedAt 推到“现在”，否则长制作会被拆碎后永远完不成。
  if (timeDiff < 1000) {
    return { state: next };
  }

  let advanceClock = true;

  // 清理过期 Buff 并汇总当前增益效果（用于离线/挂机结算）
  const buffEff = getBuffEffects(next, input.now);
  pruneExpiredBuffs(next, input.now);
  // 离线收益上限：从 8 小时提升至 24 小时，覆盖“睡一觉/上一天班”的真实离线场景
  const maxOfflineTime = 24 * 60 * 60 * 1000; // 24小时
  if (timeDiff > maxOfflineTime) {
    appendLog(next, `离线时间过长，只计算最近24小时的收益`);
  }
  
  // 限制实际计算的时间差
  const effectiveTimeDiff = Math.min(timeDiff, maxOfflineTime);
  
  // 处理职业活动的离线进度
  if (next.mode === 'life_action' && next.lifeActionState) {
    const actionStartTime = new Date(next.lifeActionState.startedAt);
    const actionDuration = effectiveTimeDiff;
    
    // 查找动作定义
    const contentPack = input.contentPack as EnhancedContentPack;
    const action = contentPack.actions.find((a: any) => a.id === next.lifeActionState!.actionId) as any;
    
    if (action && action.duration) {
      // 根据动作类型选择对应的 Buff 速度倍率，缩短有效时长（速度越快，单次耗时越短）
      const isCombatAct = typeof action.id === "string" && action.id.startsWith("act_combat_");
      const hasConsumesAct = Array.isArray(action.consumes) && action.consumes.length > 0;
      // 装备属性参与战斗：ATK 提升战斗速度、DEF 提升战斗金币收益，让装备不再是死属性。
      const equipStats = isCombatAct
        ? getEquippedCombatStats(next, contentPack)
        : { atk: 0, def: 0 };
      // ATK→战斗加速：每点 ATK +0.5% 速度，最高 +200%（3 倍速）；与战斗速度 Buff 叠乘。
      const atkSpeedMul = isCombatAct ? Math.min(3, 1 + equipStats.atk * 0.005) : 1;
      // DEF→战斗金币加成：每点 DEF +0.4% 金币，最高 +150%。
      const defGoldMul = isCombatAct ? Math.min(2.5, 1 + equipStats.def * 0.004) : 1;
      // 套装生产型增益：让集齐整套装备对采集/制作/战斗速度、经验、金币产生真实加成。
      const setBuffs = getEquippedProductionBuffs(next, contentPack);
      // 声望永久被动加成（累计声望等级提供的全局增益）。
      const repBuffs = getReputationBonuses(next);
      // 转生全局倍率（作用于金币与经验，体现“重开换永久强度”）。
      const prestigeMul = getPrestigeMultiplier(next);
      const setSpeedMul =
        (isCombatAct
          ? setBuffs.combatSpeed * repBuffs.combatSpeed
          : hasConsumesAct
          ? setBuffs.craftSpeed * repBuffs.craftSpeed
          : setBuffs.gatherSpeed * repBuffs.gatherSpeed);
      const speedMul =
        (isCombatAct
          ? buffEff.combatSpeed
          : hasConsumesAct
          ? buffEff.craftSpeed
          : buffEff.gatherSpeed) * atkSpeedMul * setSpeedMul;
      const effectiveDuration = Math.max(1, action.duration / (speedMul || 1));
      // 计算可以完成多少次动作
      const completedCycles = Math.floor(actionDuration / effectiveDuration);
      if (completedCycles === 0) {
        advanceClock = false;
      }
      
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
        
        for (let i = 0; i < safeCycles; i++) {
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
          
          if (!canComplete) break;
          actuallyCompleted += 1;
          
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
              
              const chance = yield_.chance || 1.0;
              if (Math.random() <= chance) {
                // 金币收益受 goldGain Buff 影响；战斗金币额外受装备 DEF 加成
                const baseQty =
                  yield_.itemId === 'gold'
                    ? Math.round(
                        yield_.qty *
                          (buffEff.goldGain || 1) *
                          defGoldMul *
                          setBuffs.goldGain *
                          repBuffs.goldGain *
                          prestigeMul
                      )
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
              action.xp * (buffEff.xpGain || 1) * setBuffs.xpGain * repBuffs.xpGain * prestigeMul
            );
            // 统计：累计经验
            stats.totalXpEarned += gainedXp;
            // 检查是否为战斗动作
            const isCombatAction = action.id.startsWith('act_combat_');
            
            if (isCombatAction) {
              // 战斗动作增加战斗经验
              if (!next.combatXp) next.combatXp = 0;
              if (!next.combatLevel) next.combatLevel = 1;
              
              next.combatXp += gainedXp;
              
              // 检查战斗等级升级
              let levelUpXp = getXpForLevel(next.combatLevel);
              while (next.combatXp >= levelUpXp && next.combatLevel < 200) {
                next.combatLevel += 1;
                next.combatXp -= levelUpXp;
                appendLog(next, `战斗等级升级到 ${next.combatLevel} 级！`);
                levelUpXp = getXpForLevel(next.combatLevel);
              }
              
              // 如果达到满级，保留多余经验但不再升级
              if (next.combatLevel >= 200) {
                next.combatLevel = 200;
                appendLog(next, `战斗等级已达到满级 200 级！`);
              }
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
        }
        
        // 记录收益
        if (Object.keys(totalRewards).length > 0) {
          const rewardText = Object.entries(totalRewards)
            .map(([itemId, qty]) => `${itemId} x${qty}`)
            .join(', ');
          appendLog(next, `完成 ${actuallyCompleted} 次 ${action.name}，获得：${rewardText}`);
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
          }
        }

        // 更新动作开始时间（若动作仍在进行）
        if (next.lifeActionState) {
          const remainingTime = actionDuration % effectiveDuration;
          next.lifeActionState.startedAt = new Date(input.now.getTime() - remainingTime).toISOString();
        }
      } else {
        // 一次都没完成：若是材料不足导致的批量制作，也应停止，避免卡在 life_action 模式
        if (
          typeof next.lifeActionState.remaining === 'number' &&
          action.consumes &&
          Array.isArray(action.consumes)
        ) {
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
          }
        }
      }
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
    stats.playtimeSeconds += Math.floor(Math.min(timeDiff, maxOfflineTime) / 1000);
  }
  
  return { state: next };
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

// 装备强化相关工具函数
export function calculateEnhancementSuccess(
  currentLevel: number,
  targetLevel: number,
  baseSuccessRate: number = 0.8
): number {
  // 等级越高，成功率越低
  const levelPenalty = Math.pow(0.9, targetLevel - currentLevel);
  return Math.max(0.1, baseSuccessRate * levelPenalty);
}

export function calculateEnhancementCost(
  itemType: string,
  currentLevel: number,
  targetLevel: number
): Record<string, number> {
  // 基础材料需求，根据物品类型和等级计算
  const baseCost = Math.pow(2, targetLevel - currentLevel);
  
  // 根据物品类型确定所需材料
  const materialMap: Record<string, string> = {
    'weapon': 'ingot_1',
    'armor': 'ingot_1',
    'tool': 'lumber_1',
    'accessory': 'crystal_1'
  };
  
  const materialId = materialMap[itemType] || 'crystal_1';
  return {
    [materialId]: baseCost,
    gold: baseCost * 100
  };
}
