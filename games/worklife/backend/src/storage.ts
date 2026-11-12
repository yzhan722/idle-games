import { highestActiveBonus } from "./set_bonus";
import type { 
  ContentPack, 
  PlayerState, 
  UserRecord, 
  EnhancedPlayerState, 
  EnhancedContentPack,
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
import type { PlayerCommand, PlayerCommandResult } from './player_commands';
// 声望/转生：永久被动加成与全局倍率，接入 simulateToNow 在线结算。
// 注：progression2 也会从本模块导入 appendLog/ensurePlayerExtensions，
// 二者均仅在函数体内（运行时）相互引用，故此循环依赖在求值期是安全的。
import { getReputationBonuses, getPrestigeMultiplier, getAstrolabeBonuses } from "./progression2";
import { enhancementStatMultiplier } from "./enhancement_math";
import { ensureProgression } from './progression_state';
import { professionMasteryBonuses } from './profession_perks';
import { isMonsterInOpenZone } from "./zones";

/** 用户名已被占用（注册/绑定时由存储层抛出） */
export class UsernameTaken extends Error { constructor() { super("username_taken"); } }

// 存储接口类型定义
export interface Storage {
  init(): Promise<void>;
  close(): Promise<void>;
  healthCheck(): Promise<{ ok: boolean; latencyMs: number }>;
   /** Internal fixture key. Not a public recovery credential. */
  findOrCreateGuestUser(deviceId: string): Promise<UserRecord>;
  /** Always a new guest. Client deviceId must not select this row. */
  createGuestUser(): Promise<UserRecord>;
  getUser(userId: string): Promise<UserRecord | null>;
  setGuestResumeTokenHash(userId: string, hash: string): Promise<void>;
  findUserByResumeTokenHash(hash: string): Promise<UserRecord | null>;
  bindGoogle(userId: string, googleSub: string): Promise<void>;
  /** Google 登录用：按已验证的 sub 查用户；未绑定返回 null。 */
  findUserByGoogleSub(googleSub: string): Promise<UserRecord | null>;
  /** 会话版本 +1：使该用户此前签发的所有 JWT 失效（登出/绑定凭据时调用）。 */
  invalidateSessions(userId: string): Promise<void>;
  /** 账号密码注册：用户名唯一（大小写不敏感），重名抛 UsernameTaken。 */
  createPasswordUser(username: string, passwordHash: string): Promise<UserRecord>;
  /** 登录用：返回含 passwordHash 的记录；未命中返回 null。 */
  findUserByUsername(username: string): Promise<UserRecord | null>;
  /** 给现有账号（游客/Google）补绑用户名+密码；重名抛 UsernameTaken。 */
  bindPassword(userId: string, username: string, passwordHash: string): Promise<void>;
  getOrCreatePlayerState(userId: string, contentVersion: string): Promise<EnhancedPlayerState>;
  simulateToNow(params: { 
    userId: string; 
    state: EnhancedPlayerState; 
    now: Date; 
    contentPack: EnhancedContentPack 
  }): Promise<EnhancedPlayerState>;
  // 直接持久化玩家状态（成就/每日任务/设置等领奖与更新后调用）
  savePlayerState(userId: string, state: EnhancedPlayerState): Promise<EnhancedPlayerState>;
  /** 世界频道系统播报(无 WS 连接时为 no-op)。 */
  announceWorld?(text: string): void;
  executePlayerCommand<T>(command: PlayerCommand<T>): Promise<PlayerCommandResult<T>>;
  startLifeAction(params: { userId: string; actionId: string; quantity?: number; now: Date; contentPack?: EnhancedContentPack }): Promise<EnhancedPlayerState>;
  
  // 新增：技能系统方法
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
  
  /**
   * 跨玩家写接口的幂等边界：同一 (userId, operationId) 已提交过的调用直接重放结果。
   * 与 executePlayerCommand 的差别：多用户操作没有单一 state 可结算/CAS，
   * 幂等粒度是"业务结果"。无 operationId 时直接执行。
   */
  deduplicateOperation<T>(params: {
    userId: string;
    operationId?: string;
    operationPayload?: unknown;
    run: () => Promise<T>;
  }): Promise<{ result: T; deduplicated: boolean }>;

  // 新增：组队方法
  createParty(params: { userId: string; name?: string }): Promise<Party>;
  joinParty(params: { userId: string; partyId: string }): Promise<Party>;
  /** 公开队伍列表（未满员），供队伍发现 */
  listParties(params: { limit?: number }): Promise<Array<{ id: string; name?: string; leaderId: string; memberCount: number; hasActivity: boolean; createdAt: string }>>;
  /** 向目标玩家发组队邀请（任意队员可发；写进对方 state.partyInvites + WS 推送） */
  inviteToParty(params: { userId: string; partyId: string; targetUserId: string }): Promise<{ success: boolean; message?: string }>;
  acceptPartyInvite(params: { userId: string; partyId: string }): Promise<Party>;
  declinePartyInvite(params: { userId: string; partyId: string }): Promise<{ success: boolean }>;
  kickPartyMember(params: { userId: string; partyId: string; memberId: string }): Promise<{ success: boolean; message?: string }>;
  transferPartyLeadership(params: { userId: string; partyId: string; memberId: string }): Promise<{ success: boolean; message?: string }>;
  startPartyActivity(params: {
    userId: string;
    partyId: string;
    activityType: 'combat' | 'group_craft' | 'raid';
    stageId?: string;
    durationMinutes?: number;
    contentPack?: EnhancedContentPack;
  }): Promise<{ success: boolean; message?: string }>;
  completePartyActivity(params: {
    userId: string;
    partyId: string;
    contentPack: EnhancedContentPack;
  }): Promise<{ success: boolean; rewards?: Record<string, Record<string, number>>; message?: string }>;
  cancelPartyActivity(params: {
    userId: string;
    partyId: string;
  }): Promise<{ success: boolean; message?: string }>;
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
    /** 提供内容包时校验 itemId 真实存在，防止挂单幻影物品 */
    contentPack?: EnhancedContentPack;
  }): Promise<TradingOrder>;
  /** 成交一张订单。sell 单：buyerId 是买家；buy 单：buyerId 是卖出方（给收购方交货收金）。 */
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

  // 编排部署下数据库先起来不代表可连接：postgres 镜像跑完 init 脚本后会
  // 重启主服务，中间有一个 ECONNREFUSED 窗口。重试覆盖该窗口，
  // 但绝不静默回退内存存储（会让用户误以为数据已持久化）。
  const maxAttempts = Number(process.env.DB_CONNECT_RETRIES || 15);
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const pg = await createPgStorage(opts.databaseUrl);
      await pg.init();
      return pg;
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) {
        console.warn(`[storage] PostgreSQL 连接失败(${attempt}/${maxAttempts}),2s 后重试…`);
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }
  console.error("[storage] PostgreSQL 连接失败:", lastErr);
  throw new Error(
    `PostgreSQL 连接失败，已配置 DATABASE_URL 但无法建立连接，拒绝回退到内存存储。原因: ${
      lastErr instanceof Error ? lastErr.message : String(lastErr)
    }`
  );
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

/**
 * 职业技能拆分（MWI 语义）：每个职业的「采集」与「生产」是两条独立经验/等级。
 * 采集技能沿用历史 id（skill_<profession>），生产技能用动作名做 id。
 * 技能树节点/强化服务资格等职业级进度仍挂在采集技能对象的 unlockedRecipes 上。
 */
export const GATHER_SKILL_BY_PROFESSION: Record<string, string> = {
  woodcutter: "skill_woodcutter",
  blacksmith: "skill_blacksmith",
  farmer: "skill_farmer",
  chef: "skill_chef",
  tailor: "skill_tailor",
  alchemist: "skill_alchemist",
};
export const CRAFT_SKILL_BY_PROFESSION: Record<string, string> = {
  woodcutter: "skill_woodworking",
  blacksmith: "skill_smithing",
  farmer: "skill_husbandry",
  chef: "skill_cooking",
  tailor: "skill_tailoring",
  alchemist: "skill_alchemy",
};
/** 生产技能 → 采集技能（房屋房间加成/职业归属判定用）。 */
export const GATHER_SKILL_FOR_CRAFT: Record<string, string> = Object.fromEntries(
  Object.entries(CRAFT_SKILL_BY_PROFESSION).map(([prof, craft]) => [craft, GATHER_SKILL_BY_PROFESSION[prof]])
);

function newSkill(unlockedRecipes: string[] = []) {
  return { level: 1, xp: 0, unlockedRecipes, enhancementLevel: 0 };
}

/**
 * 补齐每职业的双技能。老存档迁移：生产技能继承采集技能的等级/经验
 * （拆分前两者本就是同一条经验），unlockedRecipes（树节点进度）只留在采集技能上。
 */
export function ensureProfessionSkills(player: EnhancedPlayerState): void {
  if (!player.skills) player.skills = {};
  for (const prof of Object.keys(GATHER_SKILL_BY_PROFESSION)) {
    const gatherId = GATHER_SKILL_BY_PROFESSION[prof];
    const craftId = CRAFT_SKILL_BY_PROFESSION[prof];
    if (!player.skills[gatherId]) player.skills[gatherId] = newSkill();
    if (!player.skills[craftId]) {
      const g = player.skills[gatherId];
      player.skills[craftId] = { ...newSkill(), level: g.level, xp: g.xp };
    }
  }
}

/** 技能树节点要求的「职业等级」= 采集/生产两侧最高者（哪条腿都能推进职业树）。 */
export function professionLevelForTree(player: EnhancedPlayerState, professionId: string): number {
  return Math.max(
    player.skills?.[GATHER_SKILL_BY_PROFESSION[professionId] || ""]?.level || 0,
    player.skills?.[CRAFT_SKILL_BY_PROFESSION[professionId] || ""]?.level || 0
  );
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
      // 每职业双技能：采集（skill_<profession>）+ 生产（skill_<动作名>），互不共享经验
      skill_woodcutter: newSkill(["woodcutter_basic_cutting", "woodcutter_armor_crafting"]),
      skill_woodworking: newSkill(),
      skill_blacksmith: newSkill(["blacksmith_basic_mining"]),
      skill_smithing: newSkill(),
      skill_farmer: newSkill(["farmer_basic_planting"]),
      skill_husbandry: newSkill(),
      skill_chef: newSkill(["chef_basic_cooking"]),
      skill_cooking: newSkill(),
      skill_tailor: newSkill(["tailor_basic_processing"]),
      skill_tailoring: newSkill(),
      skill_alchemist: newSkill(["alchemist_basic_brewing"]),
      skill_alchemy: newSkill(),
      // MWI: Enhancing is its own non-combat skill, not a profession unlock.
      skill_enhancing: newSkill()
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
/**
 * NaN/Infinity 无法落进 JSON，只会来自进程内缺陷；它们一旦出现就会让所有
 * "余额 < 花费"、"进度 < 目标" 比较穿透（NaN 比较恒为 false）——无限领奖、
 * 免单购物都从这类污染来。统一归零，胜过在每张存档上炸出不同的洞。
 */
function sanitizeFiniteNumbers(node: unknown, dirtyKeys: string[]): void {
  if (!node || typeof node !== "object" || node instanceof Date) return;
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (typeof v === "number") {
      if (!Number.isFinite(v)) {
        (node as Record<string, unknown>)[k] = 0;
        dirtyKeys.push(k);
      }
    } else if (v && typeof v === "object") {
      sanitizeFiniteNumbers(v, dirtyKeys);
    }
  }
}

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
  const eqMaxDur = (player as any).equipment?.maxDurability;
  if (eqMaxDur && typeof eqMaxDur === "object") {
    for (const [k, v] of Object.entries(eqMaxDur)) {
      if (typeof v === "number" && (!Number.isFinite(v) || v <= 0)) delete eqMaxDur[k];
    }
  }
  // 数值防腐（见上）：inventory/stats/skills/tasks/bounties/耐久等所有数字字段
  const dirty: string[] = [];
  sanitizeFiniteNumbers(player, dirty);
  if (dirty.length) appendLog(player, `检测到 ${dirty.length} 个损坏的数值字段，已重置`);
  // combat_farm 模式已下线（历史上没有独立结算器，进入即永久卡死）：老存档残留一律回退 idle
  if ((player.mode as string) === "combat_farm") {
    player.mode = "idle";
    player.combatFarmState = undefined;
    player.lifeActionState = undefined;
  }
  // combatRunState 字段已删除（功能由 hp 连战覆盖）：残留一律剥离
  if ((player as any).combatRunState !== undefined) delete (player as any).combatRunState;
  // 离线系统已下线：报告与分块结算游标属于尸体数据，残留一律剥离
  if ((player as any).offlineReport !== undefined) delete (player as any).offlineReport;
  if ((player as any).settlement !== undefined) delete (player as any).settlement;
  // 持久战斗血量防腐：负值/0/NaN 一律视为满血（0 血出战斗属于尸体数据，阵亡本就复活满血）；
  // 时间戳非法则重锚，防止回血计错
  if (player.combatHp !== undefined && (!Number.isFinite(player.combatHp) || player.combatHp <= 0)) {
    player.combatHp = undefined;
    player.combatHpAt = undefined;
  } else if (player.combatHp !== undefined && (!Number.isFinite(player.combatHpAt) || (player.combatHpAt as number) <= 0)) {
    player.combatHpAt = Date.now();
  }
  if (!player.achievements) player.achievements = {};
  if (!player.settings) player.settings = defaultPlayerSettings();
  // 采集/生产技能拆分：老存档补出缺失的生产技能（继承采集等级），新存档补全 12 项
  ensureProfessionSkills(player);
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

  // 1-15级：新手引导与开荒期（保持轻快节奏，Lv1=40，Lv15=1548）
  const earlyBaseXP = 40;
  const earlyExp = 1.35;
  if (level <= 15) {
    return Math.floor(earlyBaseXP * Math.pow(level, earlyExp));
  }

  // 16-30级：初阶过渡期（平滑拉升斜率，Lv30=7,246）
  const level15XP = Math.floor(earlyBaseXP * Math.pow(15, earlyExp));
  if (level <= 30) {
    return Math.floor(level15XP + 65 * Math.pow(level - 15, 1.65));
  }

  // 31-100级：中长线挂机成长期（匹配 500-1000 小时全技能生命周期，Lv50=27,053，Lv100=239,716）
  const level30XP = Math.floor(level15XP + 65 * Math.pow(15, 1.65));
  if (level <= 100) {
    return Math.floor(level30XP + 56 * Math.pow(level - 30, 1.96));
  }

  // 101-199级：终局大师期（带一阶导数连续项 9500*d，彻底消除 Lv101 斜率回跌）
  const level100XP = Math.floor(level30XP + 56 * Math.pow(70, 1.96));
  const d = level - 100;
  return Math.floor(level100XP + 9500 * d + 110 * Math.pow(d, 2.15));
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

/**
 * 给职业技能加经验并按共享曲线升级（与 simulateWindow 里动作结算同一套逻辑）。
 * 返回升到的等级列表，供调用方写日志。
 */
export function grantProfessionXp(state: EnhancedPlayerState, skillId: string, xp: number): number[] {
  const skill = state.skills?.[skillId];
  const ups: number[] = [];
  if (!skill || !Number.isFinite(xp) || xp <= 0) return ups;
  skill.xp += xp;
  if (state.stats) state.stats.totalXpEarned += xp;
  let need = getXpForLevel(skill.level);
  while (skill.xp >= need && skill.level < 200) {
    skill.level += 1;
    skill.xp -= need;
    ups.push(skill.level);
    need = getXpForLevel(skill.level);
  }
  return ups;
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
  if (inv && Object.prototype.hasOwnProperty.call(inv, "gold")) {
    out.gold = Math.max(0, Math.floor(Number(inv.gold) || 0));
  }
  for (const [k, v] of Object.entries(inv)) {
    if (k === "gold") continue;
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
  efficiency: number;
  rareFind: number;
} {
  const eff = {
    gatherSpeed: 1,
    craftSpeed: 1,
    combatSpeed: 1,
    xpGain: 1,
    goldGain: 1,
    atk: 0,
    def: 0,
    efficiency: 0,
    rareFind: 0,
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
      if ((b.multipliers as any).efficiency) eff.efficiency += Number((b.multipliers as any).efficiency);
      if ((b.multipliers as any).rareFind) eff.rareFind += Number((b.multipliers as any).rareFind);
    }
    if (b.stats) {
      if (b.stats.atk) eff.atk += b.stats.atk;
      if (b.stats.def) eff.def += b.stats.def;
      if ((b.stats as any).efficiency) eff.efficiency += Number((b.stats as any).efficiency);
      if ((b.stats as any).rareFind) eff.rareFind += Number((b.stats as any).rareFind);
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
    // 幽灵槽防护：槽位引用背包里已没有的物品（被卖/被挂单/旧脏档）时不计入战斗属性
    if ((player.inventory?.[itemId] || 0) <= 0) continue;
    // 损坏的装备不提供战斗属性
    if (isDurabilityBroken(player, itemId)) continue;
    const item = findItem(itemId);
    if (!item) continue;
    const enhLevel = (eq.enhancementLevels && eq.enhancementLevels[itemId]) || 0;
    const mult = enhancementStatMultiplier(enhLevel, item);
    if (item.atk) atk += item.atk * mult;
    // 法杖类以 mag 记伤害；MWI 里魔法伤害与物理伤害同一条路径
    if (item.mag) atk += item.mag * mult;
    if (item.def) def += item.def * mult;
  }
  // 套装加成（同样跳过幽灵槽：引用了背包里没有的物品不算件数）
  const sets: any[] = (contentPack as any)?.equipmentSets || [];
  for (const set of sets) {
    let equippedPieces = 0;
    for (const piece of set.pieces || []) {
      if (eq[piece.slot] === piece.itemId && (player.inventory?.[piece.itemId] || 0) > 0 && !isDurabilityBroken(player, piece.itemId)) equippedPieces++;
    }
    // 内容包字段为 set.bonuses（与 types.ts / storage_memory 保持一致）；只取已满足的最高档
    const top = highestActiveBonus<{ requiredPieces?: number; stats?: Record<string, number> }>(set.bonuses, equippedPieces);
    if (top?.stats?.atk) atk += top.stats.atk;
    if (top?.stats?.def) def += top.stats.def;
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
      if (eq[piece.slot] === piece.itemId && (player.inventory?.[piece.itemId] || 0) > 0 && !isDurabilityBroken(player, piece.itemId)) equippedPieces++;
    }
    const top = highestActiveBonus<{ requiredPieces?: number; stats?: Record<string, number> }>(set.bonuses, equippedPieces);
    const s = top?.stats || {};
    for (const k of Object.keys(pct)) {
      if (typeof s[k] === "number") pct[k] += s[k];
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
  /** 本轮实际提供加速的工具——结算时按完成周期数磨损它。 */
  wornToolId?: string;
};

/**
 * 耐久语义：durability[itemId] === 0 = 装备损坏——与幽灵槽同规则，不计任何属性。
 * 未记录（undefined）= 满耐久新装备；NaN 已在 ensurePlayerExtensions 防腐归零前被拦下。
 */
export function isDurabilityBroken(player: EnhancedPlayerState, itemId: string): boolean {
  const d = (player.equipment as any)?.durability?.[itemId];
  return typeof d === "number" && Number.isFinite(d) && d <= 0;
}

/** 通用损耗落点：把已装备物品的耐久扣减 amount（允许小数累积），跌破 0 记损坏日志。 */
export function applyDurabilityWear(player: EnhancedPlayerState, itemId: string, amount: number): void {
  const eq = player.equipment as any;
  if (!eq || !itemId || !Number.isFinite(amount) || amount <= 0) return;
  const cap = Number.isFinite(eq.maxDurability?.[itemId]) ? Number(eq.maxDurability[itemId]) : 100;
  const cur = Number.isFinite(eq.durability?.[itemId]) ? Number(eq.durability[itemId]) : cap;
  const next = Math.min(cap, Math.max(0, cur - amount));
  if (next === cur) return;
  eq.durability = eq.durability || {};
  eq.maxDurability = eq.maxDurability || {};
  if (!Number.isFinite(eq.maxDurability[itemId])) eq.maxDurability[itemId] = cap;
  eq.durability[itemId] = next;
  if (next === 0 && cur > 0) appendLog(player, `装备损坏：${itemId}，需修理后才会生效`);
}

/** Sum of an equipment stat (e.g. `efficiency`, `gatherSpeed`) across equipped items, with enhancement. */
function equippedStatSum(player: EnhancedPlayerState, pack: EnhancedContentPack, stat: string): number {
  const eq = player.equipment as any;
  if (!eq) return 0;
  const items: any[] = (pack as any)?.items || [];
  let total = 0;
  for (const [slot, itemId] of Object.entries(eq)) {
    if (!itemId || typeof itemId !== "string") continue;
    if (slot === "enhancementLevels" || slot === "durability" || slot === "maxDurability" || slot === "tool") continue;
    // 幽灵槽防护：槽位引用着背包里已经没有的物品（旧档/历史脏数据）时不计入属性
    if ((player.inventory?.[itemId] || 0) <= 0) continue;
    // 损坏的装备不提供属性（与幽灵槽同规则，修好后自动恢复）
    if (isDurabilityBroken(player, itemId)) continue;
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
  const repBuffs = getReputationBonuses(player, now);
  const prestigeMul = getPrestigeMultiplier(player);
  const lane = isCombatAct ? "combatSpeed" : hasConsumesAct ? "craftSpeed" : "gatherSpeed";
  const buffSpeed = (buffEff as any)[lane] as number;
  const setSpeed = (setBuffs as any)[lane] as number;
  const repSpeed = (repBuffs as any)[lane] as number;
  // MWI tool speed: the equipped tool speeds up its own profession's skilling actions (not combat).
  const toolId = (player.equipment as any)?.tool as string | undefined;
  // 幽灵槽防护：工具已不在背包（被卖/挂单/旧脏档）或已损坏时不提供加速
  const toolOwned = !!toolId && (player.inventory?.[toolId] || 0) > 0 && !isDurabilityBroken(player, toolId);
  const toolDef = toolOwned ? ((pack as any).items as any[]).find((i) => i.id === toolId) : undefined;
  const toolApplies = !!toolDef && !isCombatAct && toolDef.toolFor === action.skillId && Number(toolDef.toolSpeed) > 0;
  const toolEnh = toolApplies ? Number((player.equipment as any)?.enhancementLevels?.[toolId!] || 0) : 0;
  const toolSpeedMul = toolApplies
    ? 1 + Number(toolDef.toolSpeed) * enhancementStatMultiplier(toolEnh, toolDef)
    : 1;
  const mastery = isCombatAct
    ? { active: false, speedMul: 1, efficiencyPct: 0 }
    : professionMasteryBonuses(
        player.activeClassId,
        action.skillId,
        Number(player.skills?.[action.skillId]?.level || 1),
        GATHER_SKILL_BY_PROFESSION,
        CRAFT_SKILL_BY_PROFESSION
      );
  const speedMul = buffSpeed * atkSpeedMul * setSpeed * repSpeed * toolSpeedMul * mastery.speedMul;
  const effectiveDurationMs = Math.max(1, Number(action.duration || 0) / (speedMul || 1));

  const speedSources: Array<{ label: string; pct: number }> = [];
  const pushPct = (arr: typeof speedSources, label: string, mul: number) => {
    const pct = Math.round((mul - 1) * 1000) / 10;
    if (Math.abs(pct) >= 0.05) arr.push({ label, pct });
  };
  if (toolApplies) pushPct(speedSources, `工具 · ${toolDef.name}`, toolSpeedMul);
  if (mastery.active) pushPct(speedSources, "本职专精", mastery.speedMul);
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
    const astro = getAstrolabeBonuses(player);
    if (houseLevel > 0) {
      efficiencySources.push({
        label: `房屋 · ${houseRoomName}`,
        pct: Math.round(houseLevel * HOUSE_EFFICIENCY_PER_LEVEL * astro.houseBonusMult * 10) / 10,
      });
    }
    if (mastery.efficiencyPct > 0) efficiencySources.push({ label: "本职专精", pct: mastery.efficiencyPct });
    if (astro.lifeEfficiencyPct > 0) {
      efficiencySources.push({ label: "传承星盘 · 巧匠星轨", pct: astro.lifeEfficiencyPct });
    }
    efficiencyPct = efficiencySources.reduce((s, x) => s + x.pct, 0);
  }

  // MWI house: the skill's room adds +1% XP per level (combat XP goes through hp_combat instead).
  const astroForXp = getAstrolabeBonuses(player);
  const houseXpMul = !isCombatAct && houseLevel > 0 ? 1 + houseLevel * HOUSE_XP_PER_LEVEL * astroForXp.houseBonusMult : 1;
  const xpMul = (buffEff.xpGain || 1) * setBuffs.xpGain * repBuffs.xpGain * prestigeMul * houseXpMul;
  // 金币收益受 goldGain Buff 影响；战斗金币额外受装备 DEF 加成
  const goldMul = (buffEff.goldGain || 1) * defGoldMul * setBuffs.goldGain * repBuffs.goldGain * prestigeMul;
  return { isCombatAct, hasConsumesAct, speedMul, effectiveDurationMs, efficiencyPct, speedSources, efficiencySources, xpMul, goldMul, defGoldMul, setBuffs, repBuffs, prestigeMul, wornToolId: toolApplies ? toolId : undefined };
}

/**
 * MWI Rare Find: a multiplier on the base chance of any sub-100% yield / rare drop.
 * Sources add together (equipment `rareFind` percent, buff `rareFind`), then apply as ×(1 + total/100).
 * A 0.5% base drop with +10% rare find becomes 0.55%, never 10.5%.
 */
export function getRareFindMultiplier(player: EnhancedPlayerState, pack: EnhancedContentPack, now: Date = new Date()): number {
  const gear = equippedStatSum(player, pack, "rareFind");
  const buffs = getBuffEffects(player, now) as unknown as { rareFind?: number };
  const astro = getAstrolabeBonuses(player);
  // MWI house: 训练场 adds +1% rare find per level (amplified by astro_house_keep).
  const { houseLevelForSkill, HOUSE_RARE_FIND_PER_LEVEL } = require("./houses") as typeof import("./houses");
  const house = houseLevelForSkill(player, "skill_combat") * HOUSE_RARE_FIND_PER_LEVEL * astro.houseBonusMult;
  const tailorBonus = player.activeClassId === "tailor" ? 15 : 0;
  const total = gear + Number(buffs.rareFind || 0) + house + tailorBonus + astro.rareFindPct;
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

export function getActionQueueMax(player?: Pick<EnhancedPlayerState, "prestige"> | null): number {
  return ACTION_QUEUE_MAX + getAstrolabeBonuses(player).extraQueueSlots;
}

/**
 * Why a queued action cannot start right now (undefined = it can).
 * Shared by the queue API (to reject early) and by the simulator (to skip while settling).
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
 * Pure start for a life action: validates existence and skill level (anti-cheat), then switches
 * mode. Throws Error("unknown_action") / Error("skill_level_required:<n>") for callers to map.
 * Callers settle first — starting this on an un-settled state discards the pending cycles.
 */
export function startLifeActionNow(
  state: EnhancedPlayerState,
  pack: EnhancedContentPack | undefined,
  actionId: string,
  quantity: number | undefined,
  now: Date
): void {
  if (Array.isArray(pack?.actions)) {
    const action = (pack.actions as any[]).find((a) => a.id === actionId) as any;
    if (!action) throw new Error("unknown_action");
    // 非战斗动作按 skillId 校验对应职业技能等级；战斗动作按战斗等级校验
    const isCombatAct = typeof action.id === "string" && action.id.startsWith("act_combat_");
    if (isCombatAct) {
      // 战斗动作同样受区域门限制：act_combat_* 直接起刷曾可绕过未开放区域
      const monsterId = (action as { monsterId?: string; targetId?: string }).monsterId
        ?? (action as { monsterId?: string; targetId?: string }).targetId
        ?? actionId.replace(/^act_combat_/, "");
      if (!isMonsterInOpenZone(pack!, monsterId)) throw new Error("stage_locked");
    }
    const reqLevel = action.requirements?.skillLevel || 1;
    if (reqLevel > 1) {
      const currentLevel = isCombatAct
        ? (state.combatLevel || 1)
        : (state.skills[action.skillId]?.level || 0);
      if (currentLevel < reqLevel) {
        throw new Error(`skill_level_required:${reqLevel}`);
      }
    }
  }
  // 规整批量制作数量：缺省（undefined）为不限次；显式传入非法值（0/负数/NaN/Infinity）
  // 拒绝而不是悄悄变成不限次——否则上游校验缺口会把 quantity=0 刷成无限挂机。
  let normalizedQty: number | undefined = undefined;
  if (quantity !== undefined) {
    if (typeof quantity !== "number" || !Number.isFinite(quantity) || quantity <= 0) {
      throw new Error("invalid_quantity");
    }
    normalizedQty = Math.min(Math.floor(quantity), 5000);
    if (normalizedQty <= 0) throw new Error("invalid_quantity");
  }
  // 战斗与生活动作严格互斥：开始生活动作时自动终止任何进行中或等待连战的战斗
  if (state.hpCombat) {
    if (!state.hpCombat.outcome) {
      const { persistCombatHp } = require("./hp_combat") as typeof import("./hp_combat");
      persistCombatHp(state, state.hpCombat.playerHp, now.getTime());
    }
    state.hpCombat = undefined;
  }
  if (state.combatLoadout?.autoRepeat) {
    state.combatLoadout = { ...state.combatLoadout, autoRepeat: false };
  }
  state.combatFarmState = undefined;
  let effectiveDurationMs: number | undefined = undefined;
  if (Array.isArray(pack?.actions)) {
    const action = (pack.actions as any[]).find((a) => a.id === actionId) as any;
    if (action && action.duration) {
      effectiveDurationMs = Math.round(getActionRates(state, pack!, action, now).effectiveDurationMs);
    }
  }
  state.mode = "life_action";
  state.lastSimulatedAt = now.toISOString();
  state.lifeActionState = {
    actionId,
    startedAt: now.toISOString(),
    ...(normalizedQty !== undefined ? { quantity: normalizedQty, remaining: normalizedQty } : {}),
    ...(effectiveDurationMs !== undefined ? { effectiveDurationMs } : {}),
  };
  appendLog(state, normalizedQty !== undefined ? `开始工作：${actionId} ×${normalizedQty}` : `开始工作：${actionId}`);
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
    const effectiveDurationMs = action && action.duration
      ? Math.round(getActionRates(state, pack, action, at).effectiveDurationMs)
      : undefined;
    if (state.hpCombat?.outcome) {
      state.hpCombat = undefined;
    }
    state.mode = "life_action";
    state.lifeActionState = {
      actionId: item.actionId,
      startedAt: at.toISOString(),
      ...(qty !== undefined ? { quantity: qty, remaining: qty } : {}),
      ...(effectiveDurationMs !== undefined ? { effectiveDurationMs } : {}),
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

/** 单次结算的最大时间窗：离线不产生收益——超过一个轮询间隔的间隔全部丢弃。
 *  前端在线时每 ~15s 轮询一次；关掉页面后的时间直接作废，进行中的动作/战斗/强化
 *  时间锚点平移到"刚离开 120 秒"，相当于挂机期间时间冻结。 */
const MAX_SETTLE_WINDOW_MS = 120_000;

export function simulateToNow(input: SimulationInput): SimulateResult {
  if (!Number.isFinite(+input.now)) throw new Error('invalid_simulation_time');
  let last = Date.parse(input.state.lastSimulatedAt);
  // 存档时间戳损坏（脏数据/手动改档）：重置为 now，而不是让玩家此后每个请求都 500 永久卡死。
  if (!Number.isFinite(last)) {
    input.state.lastSimulatedAt = input.now.toISOString();
    appendLog(input.state, '检测到存档时间异常，已重置');
    last = +input.now;
  }
  if (+input.now < last) return { state: input.state };
  const delta = +input.now - last - MAX_SETTLE_WINDOW_MS;
  if (delta > 0) {
    // 窗口溢出（离线/掉线）：把整个时间轴平移 delta，使待结算窗口恰好是最近 120 秒。
    const state = input.state as EnhancedPlayerState;
    state.lastSimulatedAt = new Date(last + delta).toISOString();
    if (state.lifeActionState?.startedAt) {
      const parsedStart = Date.parse(state.lifeActionState.startedAt);
      state.lifeActionState.startedAt = new Date((Number.isFinite(parsedStart) ? parsedStart : last) + delta).toISOString();
    }
    const combat = state.hpCombat;
    if (combat) {
      for (const key of ['startedAt', 'nextFightAt', 'heavyChopReadyAt', 'braceUntil'] as const) {
        if (typeof combat[key] === 'number') combat[key] = combat[key]! + delta;
      }
      if (combat.foodReadyAt) combat.foodReadyAt = combat.foodReadyAt.map(t => t + delta);
      if (combat.mpReadyAt) combat.mpReadyAt = combat.mpReadyAt.map(t => t + delta);
      if (combat.abilityReadyAt) for (const key of Object.keys(combat.abilityReadyAt)) combat.abilityReadyAt[key] += delta;
      if (combat.runStats?.startedAt) combat.runStats.startedAt += delta;
    }
    if (state.enhanceRun && !state.enhanceRun.outcome) {
      state.enhanceRun.nextAttemptAt += delta;
      state.enhanceRun.startedAt += delta;
    }
    // combatHpAt / nextTaskAt 等按真实挂钟走的锚点不平移：脱战回血和每日刷新本就看离线时长。
    pruneExpiredBuffs(state, input.now);
  }
  return simulateWindow({ ...input, now: input.now });
}

function simulateWindow(input: SimulationInput): SimulateResult {
  const next = { ...input.state } as EnhancedPlayerState;
  const lastSimulated = new Date(next.lastSimulatedAt);
  const timeDiff = input.now.getTime() - lastSimulated.getTime();

  // 确保统计字段存在（向后兼容旧存档）
  ensurePlayerExtensions(next);
  // 物品防腐：内容包中不存在的物品 id 一律剔除（背包/装备/强化/耐久/消耗品槽）
  {
    const known = new Set(["gold", ...((input.contentPack as EnhancedContentPack).items || []).map(i => i.id)]);
    const pruned: string[] = [];
    const inv = next.inventory || {};
    for (const k of Object.keys(inv)) if (!known.has(k)) { pruned.push(k); delete inv[k]; }
    const eq = next.equipment as any;
    if (eq) {
      for (const mapKey of ["enhancementLevels", "durability", "maxDurability"]) {
        const m = eq[mapKey];
        if (m && typeof m === "object") for (const k of Object.keys(m)) if (!known.has(k)) { pruned.push(k); delete m[k]; }
      }
      for (const [k, v] of Object.entries(eq)) {
        if (typeof v === "string" && v && !known.has(v)) { pruned.push(v); delete eq[k]; }
      }
    }
    const loadout = next.combatLoadout as any;
    if (loadout) for (const key of ["food", "mp", "drink"]) {
      if (Array.isArray(loadout[key])) {
        // 槽位条目是对象 { itemId, triggerMissingHp? }，不是裸字符串 ——
        // 此前按字符串比对，死引用永远清不掉。
        const entryId = (e: any) => (e && typeof e === "object" ? e.itemId : e);
        const bad = loadout[key].filter((e: any) => !known.has(entryId(e)));
        if (bad.length) {
          pruned.push(...bad.map(entryId));
          loadout[key] = loadout[key].filter((e: any) => known.has(entryId(e)));
        }
      }
    }
    if (pruned.length) appendLog(next, `清理失效物品 ${pruned.length} 处：${[...new Set(pruned)].join('、')}`);
  }
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
  const awaitingRepeat = !!(hpc && hpc.outcome && hpc.nextFightAt);
  if (hpc && (!hpc.outcome || awaitingRepeat) && timeDiff > 0) {
    const { tickHpCombat } = require("./hp_combat") as typeof import("./hp_combat");
    const processed = tickHpCombat(next, input.contentPack as EnhancedContentPack, input.now, timeDiff, input.rng);
    if (processed < +input.now) {
      const processedDate = new Date(processed);
      pruneExpiredBuffs(next, processedDate);
      if ((next.combatLevel || 1) > stats.highestCombatLevel) {
        stats.highestCombatLevel = next.combatLevel || 1;
      }
      next.lastSimulatedAt = processedDate.toISOString();
      addPlaytime(stats, Math.max(0, processed - +lastSimulated));
      ensureProgression(next, processedDate);
      return { state: next };
    }
  }

  // mode 与战斗状态同步：开打/战后重复 期间保持 "combat"（不再向客户端谎报 idle），
  // 且战斗与生活动作严格互斥，战斗或连战等待期间绝不允许同时保留 lifeActionState。
  if (next.hpCombat && (!next.hpCombat.outcome || awaitingRepeat)) {
    next.mode = "combat";
    next.lifeActionState = undefined;
  } else if (next.mode === "combat" && !awaitingRepeat) {
    next.mode = "idle";
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

  // 清理过期 Buff 并汇总当前增益效果
  pruneExpiredBuffs(next, input.now);
  
  // 队列推进时记录当前动作精确结束的时刻，让窗口剩余部分继续给下一个动作
  let finishedAt: Date | null = null;

  // MWI 强化计时动作：结算窗口内的每一次尝试（窗口上限见 MAX_SETTLE_WINDOW_MS）
  if (next.enhanceRun && !next.enhanceRun.outcome) {
    const { tickEnhanceRun } = require("./enhancement_run") as typeof import("./enhancement_run");
    // lastSim 之前的尝试属于已作废/已结算时间：钳住 nextAttemptAt，防止遗留锚点在一个小窗口内补发数千次。
    next.enhanceRun.nextAttemptAt = Math.max(next.enhanceRun.nextAttemptAt, lastSimulated.getTime());
    const ended = tickEnhanceRun(next, input.contentPack as EnhancedContentPack, input.now.getTime(), input.rng);
    if (ended) finishedAt = ended;
  }

  // 处理职业活动的流逝进度
  if (next.mode === 'life_action' && next.lifeActionState) {
    let actionStartTime = new Date(next.lifeActionState.startedAt);
    // 以 startedAt（当前这一轮的真实开始时刻）为锚计算进度，而不是上次结算时刻：
    // 否则每次轮询完成一轮后，剩下的零头都会被丢掉，5 秒的动作在 1 秒轮询下会变成 5~6 秒。
    const sinceCycleStart = Math.max(0, input.now.getTime() - actionStartTime.getTime());
    let actionDuration = sinceCycleStart;
    
    // 查找动作定义
    const contentPack = input.contentPack as EnhancedContentPack;
    const action = contentPack.actions.find((a: any) => a.id === next.lifeActionState!.actionId) as any;
    
    if (action && action.duration) {
      const rates = getActionRates(next, contentPack, action, input.now);
      const effectiveDuration = rates.effectiveDurationMs;
      // 只结算落在 (lastSimulated, now] 内的周期：把锚点快进到上一个结算时刻所在的周期起点，
      // 窗口之前的完成属于已作废/已结算的时间——防止 startedAt 远早于 lastSimulatedAt
      // 的存档（遗留/损坏）在一个小窗口内超发，并让下方 finishedAt/重锚逻辑拿到一致的时间轴。
      const alreadySettled = Math.max(0, Math.floor((lastSimulated.getTime() - actionStartTime.getTime()) / effectiveDuration));
      actionStartTime = new Date(actionStartTime.getTime() + alreadySettled * effectiveDuration);
      actionDuration = Math.max(0, input.now.getTime() - actionStartTime.getTime());
      const completedCycles = Math.max(0, Math.floor(actionDuration / effectiveDuration));
      
      if (completedCycles > 0) {
        const actualCycles = completedCycles;
        
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
          if (r === 0) timeCyclesUsed += 1;
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
                const gatherDoubleChance = !isCombat && !hasConsumes && yield_.itemId !== 'gold'
                  ? getAstrolabeBonuses(next).gatherDoubleChance
                  : 0;
                const critMult = gatherDoubleChance > 0 && rng() < gatherDoubleChance ? 2 : 1;
                // 金币收益受 goldGain Buff 影响；战斗金币额外受装备 DEF 加成；采集物可受丰饶双星暴击翻倍
                const baseQty =
                  yield_.itemId === 'gold'
                    ? Math.round(yield_.qty * rates.goldMul)
                    : yield_.qty * critMult;
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
                const levelBeforeLoop = playerSkill.level;
                playerSkill.xp += gainedXp;
                
                // 检查升级 - 使用新的指数成长曲线
                let levelUpXp = getXpForLevel(playerSkill.level);
                while (playerSkill.xp >= levelUpXp && playerSkill.level < 200) {
                  playerSkill.level += 1;
                  playerSkill.xp -= levelUpXp;
                  appendLog(next, `${action.skillId} 技能升级到 ${playerSkill.level} 级！`);
                  levelUpXp = getXpForLevel(playerSkill.level);
                }
                
                // 如果刚达到满级，记录一次日志并保留多余经验
                if (playerSkill.level >= 200) {
                  playerSkill.level = 200;
                  if (levelBeforeLoop < 200) {
                    appendLog(next, `${action.skillId} 已达到满级 200 级！`);
                  }
                }
              }
            }
          }
          // 批量：完成次数达到剩余次数就停，哪怕这一周期的效率重复还没用完
          if (requestedRemaining !== undefined && actuallyCompleted >= requestedRemaining) break cycles;
          }
        }

        // 工具磨损：每个实际消耗的时间周期 -0.1 耐久（效率额外次数不占时间不磨损）；
        // 满 100 耐久 ≈ 1000 个周期后需修理，是温和的持续金币消耗点
        if (rates.wornToolId && timeCyclesUsed > 0) {
          const toolWearPerCycle = next.activeClassId === "woodcutter" ? 0.05 : 0.1;
          applyDurabilityWear(next, rates.wornToolId, timeCyclesUsed * toolWearPerCycle);
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
            finishedAt = new Date(Math.max(lastSimulated.getTime(), actionStartTime.getTime() + timeCyclesUsed * effectiveDuration));
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
            finishedAt = new Date(Math.max(lastSimulated.getTime(), actionStartTime.getTime() + timeCyclesUsed * effectiveDuration));
          }
        }

        // 更新动作开始时间（若动作仍在进行）：把没走完的零头留给下一轮
        if (next.lifeActionState) {
          const remainingTime = actionDuration - timeCyclesUsed * effectiveDuration;
          next.lifeActionState.startedAt = new Date(input.now.getTime() - remainingTime).toISOString();
          next.lifeActionState.effectiveDurationMs = Math.round(effectiveDuration);
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
            finishedAt = new Date(Math.max(lastSimulated.getTime(), actionStartTime.getTime()));
          }
        }
        if (next.lifeActionState) {
          next.lifeActionState.effectiveDurationMs = Math.round(effectiveDuration);
        }
      }
    }
  }

  // 行动队列：当前动作结束后，立刻从结束时刻接上下一个动作，并把时间窗剩余部分继续结算。
  // 正在进行的战斗（或连战等待中）时不接，由 flee 入口统一接续；已结算且非连战的旧战斗残影允许接续。
  const activeSoloCombat = Boolean(
    next.hpCombat && (!next.hpCombat.outcome || (next.combatLoadout?.autoRepeat && next.hpCombat.nextFightAt))
  );
  if (next.mode !== 'life_action' && !activeSoloCombat && finishedAt && Array.isArray(next.activityQueue) && next.activityQueue.length > 0) {
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
    addPlaytime(stats, timeDiff);
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
export function calculateTradingFee(totalPrice: number, feeRate: number = 0.05): number {
  return Math.floor(totalPrice * feeRate);
}

// 组队相关工具函数
export function createParty(leaderId: string, name?: string): Party {
  return {
    id: randomUUID(),
    ...(name ? { name } : {}),
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
