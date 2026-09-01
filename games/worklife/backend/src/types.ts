export type ContentPack = {
  version: string;
  classes: Array<{ id: string; name: string; mainHand: string | null; offHand: string | null; role: string }>;
  skills: Array<{ id: string; classId: string; name: string }>;
  items: Array<Record<string, unknown>>;
  actions: Array<Record<string, unknown>>;
  recipes: Array<Record<string, unknown>>;
  dropTables: Array<Record<string, unknown>>;
  monsters: Array<Record<string, unknown>>;
  stages: Array<Record<string, unknown>>;
};

// 增强的内容包结构
export type EnhancedContentPack = ContentPack & {
  professionTrees: Array<{
    professionId: string;
    skillNodes: Array<{
      id: string;
      name: string;
      description: string;
      requirements: {
        level: number;
        prerequisites: string[];
      };
      unlocks: {
        recipes?: string[];
        actions?: string[];
        enhancements?: string[];
      };
    }>;
  }>;
  
  enhancementRules: Array<{
    itemType: string;
    requiredProfession: string;
    materials: Array<{
      itemId: string;
      quantity: number;
    }>;
    successRate: number;
    maxLevel: number;
  }>;
  
  equipmentSets: Array<{
    id: string;
    name: string;
    profession: string;
    pieces: Array<{
      slot: string;
      itemId: string;
    }>;
    bonuses: Array<{
      requiredPieces: number;
      stats: Record<string, number>;
      description: string;
    }>;
  }>;
};

export type PlayerState = {
  contentVersion: string;
  lastSimulatedAt: string;
  activeClassId: string;
  mode: "idle" | "life_action" | "combat_farm";
  lifeActionState?: { actionId: string; startedAt: string; quantity?: number; remaining?: number };
  combatFarmState?: { stageId: string; startedAt: string; seed: string };
  inventory: Record<string, number>;
  equipment: { main_hand?: string; off_hand?: string };
  skills: Record<string, { level: number; xp: number }>;
  logs: Array<{ ts: string; text: string }>;
};

// 增强的玩家状态结构
export type EnhancedPlayerState = PlayerState & {
  // 战斗等级系统（独立于职业）
  combatLevel: number;
  combatXp: number;
  
  // 扩展现有技能系统
  skills: Record<string, {
    level: number;
    xp: number;
    unlockedRecipes: string[];
    enhancementLevel: number;
  }>;
  
  // 新增组队状态
  partyState?: {
    partyId: string;
    role: string;
    isLeader: boolean;
    joinedAt: string;
  };
  
  // 增强的装备系统
  equipment: {
    main_hand?: string;
    off_hand?: string;
    head?: string;
    chest?: string;
    legs?: string;
    feet?: string;
    accessory1?: string;
    accessory2?: string;
    enhancementLevels: Record<string, number>;
    durability: Record<string, number>; // 装备耐久度 (当前值)
    maxDurability: Record<string, number>; // 装备最大耐久度
  };
  
  // 交易行相关状态
  tradingState: {
    activeListings: string[];
    purchaseHistory: Array<{
      itemId: string;
      price: number;
      timestamp: string;
    }>;
  };
  
  // 离线进度队列
  activityQueue: Array<{
    actionId: string;
    priority: number;
    estimatedDuration: number;
  }>;

  // 生涯统计（成就/每日任务的数据源）
  stats?: PlayerStats;

  // 成就状态：成就ID -> 进度/解锁/已领奖
  achievements?: Record<string, AchievementProgress>;

  // 每日任务状态
  dailyQuests?: DailyQuestState;

  // 玩家设置（前端偏好，跟随存档）
  settings?: PlayerSettings;

  // 当前生效的增益（Buff）列表
  activeBuffs?: ActiveBuff[];

  // 每日签到状态
  checkIn?: CheckInState;

  // 声望系统状态（累计声望 -> 等级 -> 永久被动加成）
  reputation?: ReputationState;

  // 赏金契约状态（每日刷新的随机契约板）
  bounties?: BountyState;

  // 转生系统状态（重置进度换永久全局倍率）
  prestige?: PrestigeState;
};

// ===== 声望系统 =====
export type ReputationState = {
  total: number;          // 累计获得的声望点数（只增不减，决定声望等级）
  spent: number;          // 已消耗的声望（预留：声望商店）
};

// 声望等级定义（静态）
export type ReputationTierDef = {
  tier: number;           // 等级序号（从 1 开始）
  name: string;           // 等级名称
  icon: string;
  required: number;       // 达到此等级所需累计声望
  // 永久被动加成（百分比点数，如 gatherSpeed:5 表示 +5%），累积生效（达到该层即永久叠加）
  bonuses: {
    gatherSpeed?: number;
    craftSpeed?: number;
    combatSpeed?: number;
    xpGain?: number;
    goldGain?: number;
  };
};

// ===== 赏金契约系统 =====
export type BountyMetric = "gather" | "craft" | "kill";

export type Bounty = {
  id: string;             // 实例ID
  templateId: string;     // 模板ID
  name: string;
  description: string;
  icon: string;
  metric: BountyMetric;   // 完成判定指标
  target: number;         // 目标数量
  baseline: number;       // 接取时对应 stats 指标的基线值
  accepted: boolean;      // 是否已接取
  claimed: boolean;       // 是否已领奖
  rarity: "common" | "rare" | "epic"; // 稀有度（决定奖励倍率）
  reward: { gold: number; reputation: number; items?: Record<string, number> };
};

export type BountyState = {
  date: string;           // 当前契约板日期 YYYY-MM-DD（UTC）
  bounties: Bounty[];     // 当日契约列表
  rerollsUsed: number;    // 当日已使用的刷新次数
};

// ===== 转生系统 =====
export type PrestigeState = {
  count: number;          // 已转生次数
  points: number;         // 累计转生点数（决定永久全局倍率）
  lastPrestigeAt?: string;
};

// 生效中的增益
export type ActiveBuff = {
  id: string;              // buff 模板ID
  name: string;            // 显示名
  sourceItemId: string;    // 来源消耗品ID
  expiresAt: string;       // 过期时间 ISO
  multipliers?: {          // 速度/收益倍率（1.2 = +20%）
    gatherSpeed?: number;
    craftSpeed?: number;
    combatSpeed?: number;
    xpGain?: number;
    goldGain?: number;
  };
  stats?: { atk?: number; def?: number };
};

// 签到状态
export type CheckInState = {
  lastDate: string;        // 上次签到日期 YYYY-MM-DD（UTC）
  streak: number;          // 连续签到天数
  totalDays: number;       // 累计签到天数
};

// 生涯统计数据
export type PlayerStats = {
  totalGathered: number;       // 累计采集次数
  totalCrafted: number;        // 累计制作次数
  totalKills: number;          // 累计击杀怪物
  totalBossKills: number;      // 累计击杀BOSS
  totalGoldEarned: number;     // 累计获得金币
  totalGoldSpent: number;      // 累计花费金币
  totalXpEarned: number;       // 累计获得经验
  totalActions: number;        // 累计动作总数
  totalEnhancements: number;   // 累计强化次数
  totalTrades: number;         // 累计交易次数
  highestCombatLevel: number;  // 历史最高战斗等级
  playtimeSeconds: number;     // 累计在线/挂机时长（秒）
  firstPlayedAt: string;       // 首次游玩时间
  // 按资源细分采集：itemId -> 数量
  gatheredByItem: Record<string, number>;
  // 按怪物细分击杀：monsterId -> 数量
  killsByMonster: Record<string, number>;
};

// 成就进度
export type AchievementProgress = {
  unlocked: boolean;       // 是否达成
  claimed: boolean;        // 是否已领奖
  unlockedAt?: string;     // 达成时间
  progress: number;        // 当前进度值
};

// 成就定义（静态）
export type AchievementDef = {
  id: string;
  name: string;
  description: string;
  category: 'gathering' | 'crafting' | 'combat' | 'wealth' | 'progression' | 'misc';
  icon: string;            // emoji 兜底图标
  metric: keyof Pick<PlayerStats,
    'totalGathered' | 'totalCrafted' | 'totalKills' | 'totalBossKills' |
    'totalGoldEarned' | 'totalGoldSpent' | 'totalActions' | 'totalEnhancements' |
    'totalTrades' | 'highestCombatLevel' | 'playtimeSeconds'>;
  target: number;          // 达成阈值
  reward: { gold?: number };
  hidden?: boolean;        // 隐藏成就（达成前不显示具体描述）
};

// 每日任务状态
export type DailyQuestState = {
  date: string;            // YYYY-MM-DD（UTC）
  quests: Array<{
    id: string;            // 模板ID
    name: string;
    description: string;
    icon: string;
    metric: keyof Pick<PlayerStats,
      'totalGathered' | 'totalCrafted' | 'totalKills' | 'totalActions' | 'totalGoldSpent'>;
    target: number;
    baseline: number;      // 接取时该指标的基线值，用于计算当日增量
    claimed: boolean;
    reward: { gold: number; xp?: number };
  }>;
};

// 玩家设置
export type PlayerSettings = {
  soundEnabled: boolean;
  animationsEnabled: boolean;
  compactMode: boolean;
  notificationsEnabled: boolean;
};

export type UserRecord = {
  id: string;
  guestDeviceId: string | null;
  googleSub: string | null;
  createdAt: string;
};

// 交易行系统类型
export type MarketListing = {
  id: string;
  sellerId: string;
  itemId: string;
  quantity: number;
  pricePerUnit: number;
  listedAt: string;
  expiresAt: string;
  status: 'active' | 'sold' | 'expired' | 'cancelled';
};

export type TradeHistory = {
  id: string;
  buyerId: string;
  sellerId: string;
  itemId: string;
  quantity: number;
  totalPrice: number;
  completedAt: string;
};

export type PriceHistory = {
  itemId: string;
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  volume: number;
  recordDate: string;
};

// 组队系统类型
export type Party = {
  id: string;
  leaderId: string;
  members: Array<{
    userId: string;
    role: string;
    joinedAt: string;
    isOnline: boolean;
  }>;
  currentActivity?: {
    type: 'combat' | 'group_craft';
    stageId?: string;
    startedAt: string;
  };
  createdAt: string;
};

export type PartyMember = {
  partyId: string;
  userId: string;
  role: string;
  joinedAt: string;
  isOnline: boolean;
  isReady: boolean;
};

export type PartyActivity = {
  id: string;
  partyId: string;
  type: 'combat' | 'group_craft';
  stageId?: string;
  startedAt: string;
  completedAt?: string;
  rewards?: Record<string, any>;
};

// WebSocket消息类型
export type ChatMessage = {
  type: 'chat:message' | 'chat:join' | 'chat:leave' | 'chat:system';
  channel: 'world' | 'profession' | 'party' | 'private';
  sender?: string;
  recipient?: string; // 私聊时使用
  content: string;
  timestamp: string;
  senderProfession?: string;
};

export type PartyMessage = {
  type: 'party:invite' | 'party:join' | 'party:leave' | 'party:activity' | 'party:update';
  partyId: string;
  userId: string;
  data?: any;
};

export type TradingMessage = {
  type: 'trading:sold' | 'trading:purchased' | 'trading:expired' | 'trading:listed';
  listingId: string;
  itemId: string;
  quantity: number;
  price: number;
  buyerId?: string;
  sellerId?: string;
};

// 装备强化系统类型
export type EnhancementRequest = {
  itemId: string;
  targetLevel: number;
  materials: Record<string, number>;
  serviceProviderId?: string; // 跨职业强化时的服务提供者
};

export type EnhancementServiceRequest = {
  id: string;
  requesterId: string;
  providerId: string;
  itemId: string;
  targetLevel: number;
  serviceFee: number;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  responseMessage?: string;
};

export type EnhancementProvider = {
  userId: string;
  profession: string;
  skillLevel: number;
  serviceFee: number;
  isOnline: boolean;
  completedServices: number;
  rating: number;
};

export type EnhancementResult = {
  success: boolean;
  newLevel: number;
  consumedMaterials: Record<string, number>;
  bonusStats?: Record<string, number>;
  failureReason?: string;
};

// 装备耐久度系统类型
export type DurabilityInfo = {
  itemId: string;
  currentDurability: number;
  maxDurability: number;
  durabilityPercent: number;
  needsRepair: boolean;
  repairCost: number;
};

export type RepairRequest = {
  itemId: string;
  repairType: 'full' | 'partial'; // 完全修复或部分修复
  targetDurability?: number; // 部分修复时的目标耐久度
};

export type RepairResult = {
  success: boolean;
  itemId: string;
  oldDurability: number;
  newDurability: number;
  cost: number;
  message?: string;
};

// 装备套装系统类型
export type EquipmentSetBonus = {
  setId: string;
  setName: string;
  equippedPieces: number;
  totalPieces: number;
  activeBonuses: Array<{
    requiredPieces: number;
    stats: Record<string, number>;
    description: string;
    isActive: boolean;
  }>;
  totalStats: Record<string, number>;
};

export type PlayerEquipmentStats = {
  baseStats: Record<string, number>;
  enhancementStats: Record<string, number>;
  setStats: Record<string, number>;
  totalStats: Record<string, number>;
  activeSets: EquipmentSetBonus[];
};

// 技能树系统类型
export type SkillNode = {
  id: string;
  professionId: string;
  name: string;
  description: string;
  requirements: {
    level: number;
    prerequisites: string[];
  };
  unlocks: {
    recipes?: string[];
    actions?: string[];
    enhancements?: string[];
  };
};

export type PlayerSkillProgress = {
  userId: string;
  professionId: string;
  level: number;
  xp: number;
  unlockedNodes: string[];
  enhancementLevel: number;
};

// API请求/响应类型
export type TradingListRequest = {
  itemId: string;
  quantity: number;
  pricePerUnit: number;
  duration?: number; // 小时数，默认24小时
};

export type TradingPurchaseRequest = {
  listingId: string;
  quantity: number;
};

export type TradingSearchRequest = {
  query?: string;
  itemType?: string[];
  tier?: number[];
  profession?: string[];
  priceRange?: { min: number; max: number };
  sortBy?: 'price' | 'quantity' | 'listedAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
};

export type PartyCreateRequest = {
  name?: string;
  description?: string;
  maxMembers?: number;
};

export type PartyInviteRequest = {
  partyId: string;
  targetUserId: string;
};

export type PartyJoinRequest = {
  partyId: string;
  inviteId?: string;
};

// 错误类型
export type GameError = {
  code: string;
  message: string;
  details?: Record<string, any>;
};

export type ValidationError = GameError & {
  field: string;
  value: any;
};

export type BusinessLogicError = GameError & {
  operation: string;
  context: Record<string, any>;
};
