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
  /** Boss mechanic table: monsters reference these by id in `mechanics` (see boss_mechanics.ts). */
  bossMechanics?: BossMechanicDef[];
};

/**
 * One boss mechanic, as data. `kind` selects the behaviour in boss_mechanics.ts (backend) and
 * gameplay/bossMechanics.ts (frontend preview mirror); `params` are its numbers, `messages` the combat
 * log lines (`{ability}` is filled in), `label` / `desc` what the monster card shows.
 */
export type BossMechanicDef = {
  id: string;
  kind: string;
  label: string;
  desc?: string;
  /** Numbers by name; JSON rows of different kinds carry different keys, so a key may be absent. */
  params: Record<string, number | undefined>;
  messages?: Record<string, string | undefined>;
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
  mode: "idle" | "life_action" | "enhancing" | "combat";
  lifeActionState?: { actionId: string; startedAt: string; quantity?: number; remaining?: number; effectiveDurationMs?: number };
  combatFarmState?: { stageId: string; startedAt: string; seed: string };
  inventory: Record<string, number>;
  equipment: { main_hand?: string; off_hand?: string };
  skills: Record<string, { level: number; xp: number }>;
  logs: Array<{ ts: string; text: string }>;
};

export type HpCombatState = {
  monsterId: string;
  monsterName: string;
  playerHp: number;
  playerMaxHp: number;
  enemyHp: number;
  enemyMaxHp: number;
  playerIntervalMs: number;
  enemyIntervalMs: number;
  enemyBaseIntervalMs: number;
  playerCooldownMs: number;
  enemyCooldownMs: number;
  heavyChopReadyAt: number;
  guardActive: boolean;
  wrathActive: boolean;
  guardUsed?: boolean;
  /** Set once the boss telegraphs the upcoming guard (≤66% HP) so the line logs only once. */
  guardTelegraphed?: boolean;
  log: string[];
  outcome?: "win" | "loss";
  rewardsGranted?: boolean;
  /** Rare drops actually granted on win (what the monster card advertises). */
  drops?: Array<{ itemId: string; name: string; qty: number }>;
  /** Per-food-slot cooldown end (ms epoch). */
  foodReadyAt?: number[];
  /** Per-MP-potion-slot cooldown end (ms epoch). */
  mpReadyAt?: number[];
  /** Consumables the server used during this fight, for the victory panel. */
  consumed?: Array<{ itemId: string; name: string; qty: number }>;
  /** Auto-repeat: wall-clock ms when the next fight against the same monster starts. */
  nextFightAt?: number;
  /** Consecutive wins in the current auto-repeat run. */
  streak?: number;
  /** Defeats in the current auto-repeat run (MWI respawn loop). */
  deaths?: number;
  /** Consecutive defeats right now (reset by any win); trips the auto-repeat death-spiral guard. */
  lossStreak?: number;
  /** MWI battle statistics for the whole auto-repeat run (carried from fight to fight). */
  runStats?: {
    startedAt: number;
    kills: number;
    xp: number;
    gold: number;
    loot: Record<string, number>;
  };
  /** Wall-clock ms when this fight started (enrage timer). */
  startedAt?: number;
  /** MWI enrage stacks (+10% monster damage each, max 10). */
  enrageStacks?: number;
  /** Boss attacks landed so far this fight (drives `charge` mechanics such as the mine boss's rockfall). */
  bossHits?: number;
  /** Per-fight counters of timed boss mechanics (event counts, miasma stacks); see boss_mechanics.ts. */
  mech?: Record<string, number>;
  /** MWI mana: abilities spend it, basic-attack ticks regenerate it. */
  playerMp?: number;
  playerMaxMp?: number;
  /** Per-ability cooldown end (ms epoch), keyed by ability id. */
  abilityReadyAt?: Record<string, number>;
  /** Incoming damage reduction window from 坚守 (ms epoch until). */
  braceUntil?: number;
  /** Active incoming damage multiplier while `braceUntil` is in effect. */
  braceMult?: number;
  /** Combat-skill XP granted on win (30/70 split), for the victory panel. */
  xpGained?: Record<string, number>;
  /** Active ability XP granted via skill casts during this fight. */
  abilityXpGained?: Record<string, number>;
  /** Active abilities that leveled up during this fight. */
  abilityLevelUps?: Array<{ id: string; name: string; level: number }>;
};

/**
 * MWI combat skills: stamina (HP), intelligence (MP + ability slots), attack (speed), defense,
 * and the three damage skills melee / ranged / magic — the equipped weapon decides which one trains.
 */
export type CombatSkillId = "stamina" | "intelligence" | "attack" | "defense" | "melee" | "ranged" | "magic";
export type CombatSkillState = { level: number; xp: number };
export type CombatSkills = Record<CombatSkillId, CombatSkillState>;

/** When an equipped ability auto-casts. Abilities are evaluated left to right whenever they are ready. */
export type AbilityTrigger =
  | { type: "always" }
  | { type: "enemy_hp_below"; pct: number }
  | { type: "self_hp_below"; pct: number }
  | { type: "ally_hp_below"; pct: number }
  | { type: "enemies_at_least"; pct: number }
  | { type: "enemy_guard" };

export type AbilitySlot = { abilityId: string; trigger: AbilityTrigger };
export type Chapter1BuildId = "sharpened_edge" | "thick_bark";
export type Chapter2BuildId = "heavy_sunder" | "quenched_thorns";
export type Chapter3BuildId = "gale_flurry" | "relic_hunter";
export type Chapter4BuildId = "elixir_frenzy" | "feast_vitality";
export type AllChapterBuildId = Chapter1BuildId | Chapter2BuildId | Chapter3BuildId | Chapter4BuildId;

// 增强的玩家状态结构
export type EnhancedPlayerState = PlayerState & {
  /** Database CAS revision; must survive state copies. Never accepted from client commands. */
  stateRevision?: number;
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
  /** 收到的未处理组队邀请（最多保留 10 条，24 小时有效） */
  partyInvites?: Array<{ partyId: string; fromUserId: string; invitedAt: string }>;
  
  // 增强的装备系统
  equipment: {
    main_hand?: string;
    off_hand?: string;
    head?: string;
    chest?: string;
    legs?: string;
    feet?: string;
    hands?: string;
    accessory1?: string;
    accessory2?: string;
    /** MWI-style tool slot (axe / hammer / hoe …): skilling speed only, excluded from combat stats. */
    tool?: string;
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
  
  // 行动队列（银河奶牛式）：当前动作结束后按顺序自动接上；quantity 缺省 = 无限
  activityQueue: Array<{
    id: string;
    actionId: string;
    quantity?: number;
  }>;

  hpCombat?: HpCombatState;
  /**
   * Persistent combat HP (MWI: survives between fights; the enemy always starts full).
   * undefined = full. Regenerates out of combat — see COMBAT_HP_FULL_REGEN_MS in hp_combat.
   */
  combatHp?: number;
  /** Wall-clock ms when combatHp was last written; out-of-combat regen accrues from here. */
  combatHpAt?: number;
  progression?: import('./progression_state').ProgressionState;
  chapter1Build?: Chapter1BuildId;
  chapter2Build?: Chapter2BuildId;
  chapter3Build?: Chapter3BuildId;
  chapter4Build?: Chapter4BuildId;

  /** MWI combat skills; `combatLevel` is derived from these (see combat_skills.ts). */
  combatSkills?: CombatSkills;
  /** Learned abilities (from books) with their own level / xp. */
  abilities?: Record<string, { level: number; xp: number }>;
  /** Equipped abilities in cast priority order; slot count comes from intelligence. */
  abilityLoadout?: AbilitySlot[];

  /**
   * MWI-style combat loadout: consumables the server auto-uses during HP combat.
   * food: eaten when missing HP >= triggerMissingHp (30s cooldown per slot).
   * drink: re-applied whenever its buff is not active.
   * autoRepeat: after a win, start the same monster again after a short intermission.
   */
  combatLoadout?: {
    food: Array<{ itemId: string; triggerMissingHp: number }>;
    drink: Array<{ itemId: string; triggerMissingMp?: number }>;
    mp?: Array<{ itemId: string; triggerMissingMp: number }>;
    autoRepeat?: boolean;
  };


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

  // MWI 任务板：按冷却逐个发放的技能任务、任务代币与代币商店
  tasksState?: TaskState;

  // MWI 房屋：每个技能一间房，等级 → 该技能永久加成
  house?: { rooms: Record<string, number> };

  // MWI 强化是计时动作：设目标等级后按间隔反复尝试，直到达标 / 材料耗尽 / 手动停止
  enhanceRun?: EnhanceRun;

  // 转生系统状态（重置进度换永久全局倍率）
  prestige?: PrestigeState;
};

export type EnhanceRun = {
  itemId: string;
  targetLevel: number;
  useProtection: boolean;
  intervalMs: number;
  /** Epoch ms of the next attempt; attempts before `now` are settled by simulateToNow. */
  nextAttemptAt: number;
  startedAt: number;
  attempts: number;
  successes: number;
  failures: number;
  xpGained: number;
  outcome?: {
    reason: "reached" | "materials" | "stopped" | "max" | "no_protection";
    level: number;
    at: number;
  };
};

// ===== 声望系统 =====
export type ReputationState = {
  total: number;          // 累计获得的声望点数（只增不减，决定声望等级）
  spent: number;          // 已消耗的声望（声望军需官商店兑换累计消耗）
  dailyPurchases?: {
    date: string;         // YYYY-MM-DD（按本地日切重置每日限购）
    counts: Record<string, number>;
  };
  activeScrolls?: Record<string, number>; // scrollId -> 到期时间戳 epoch ms
  unlockedTitles?: string[];              // 已永久解锁的专属名号徽章 ID 列表
  equippedTitle?: string | null;          // 当前佩戴的专属名号徽章 ID
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
  spentPoints?: number;   // 已投入传承星盘的转生点数（不影响全局基础倍率）
  astrolabe?: Record<string, number>; // 异世界传承星盘节点等级 (nodeId -> rank)
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
  totalDeaths?: number;        // 累计阵亡（MWI 重生循环）
  totalGoldEarned: number;     // 累计获得金币
  totalGoldSpent: number;      // 累计花费金币
  totalXpEarned: number;       // 累计获得经验
  totalActions: number;        // 累计动作总数
  totalEnhancements: number;   // 累计强化次数
  totalTrades: number;         // 累计交易次数
  highestCombatLevel: number;  // 历史最高战斗等级
  playtimeSeconds: number;     // 累计在线/挂机时长（秒）
  playtimeCarryMs?: number;    // 不足 1 秒的零头，跨次轮询累加，避免高频轮询把时长吃掉
  firstPlayedAt: string;       // 首次游玩时间
  // 按资源细分采集：itemId -> 数量
  gatheredByItem: Record<string, number>;
  // 按怪物细分击杀：monsterId -> 数量
  killsByMonster: Record<string, number>;
  // 按动作细分完成次数：actionId -> 次数（任务板进度来源）
  actionsById?: Record<string, number>;
};

/* ===== MWI 任务板 ===== */
export type Task = {
  id: string;
  kind: "action" | "kill";
  /** Pack action id for gather / craft tasks. */
  actionId?: string;
  /** Monster id for kill tasks. */
  monsterId?: string;
  skillId: string;
  name: string;
  target: number;
  /** stats counter at assignment; progress = counter − baseline. */
  baseline: number;
  reward: { gold: number; tokens: number };
  assignedAt: string;
  claimed?: boolean;
};

export type TaskState = {
  tasks: Task[];
  /** When the next task is handed out (ISO). */
  nextTaskAt: string;
  tokens: number;
  /** Task points accumulate one per token earned; every 50 → a gift. */
  points: number;
  giftsClaimed: number;
  /** Token-shop upgrades. */
  cooldownLevel: number;
  blockSlots: number;
  blockedSkills: string[];
  /** Reroll cost doubles within a day. */
  rerollsToday: number;
  rerollDay: string;
  /** Lifetime counters for the sheet. */
  completed: number;
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
  /** 自定义展示名（空则回退到「玩家_xxxxxx」派生名） */
  playerName?: string;
  /** 建角时选的头像（emoji），角色面板/组队显示 */
  avatar?: string;
  /** 建角时选的性别外观（male / female / animal） */
  gender?: 'male' | 'female' | 'animal' | 'secret';
  /** 是否已完成建角流程（老存档无此标记 → 下次进游戏补一次） */
  characterCreated?: boolean;
  /** 开场三步引导是否已看完 */
  tutorialDone?: boolean;
};

export type UserRecord = {
  id: string;
  guestDeviceId: string | null;
  googleSub: string | null;
  /** 账号密码登录的用户名（全局唯一，大小写不敏感；null = 非账号用户） */
  username?: string | null;
  /** scrypt 口令散列（`scrypt$N$r$p$salt$hash`），永不回传给客户端 */
  passwordHash?: string | null;
  createdAt: string;
  /** SHA-256 hex of the guest resume token. Never the token itself. */
  guestResumeTokenHash?: string | null;
  /** 会话版本号：JWT 里的 av 必须等于它，绑定/登出时递增即吊销旧 token。缺省视为 1。 */
  authVersion?: number;
};

// 交易行系统类型
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
  name?: string;
  leaderId: string;
  members: Array<{
    userId: string;
    role: string;
    joinedAt: string;
    isOnline: boolean;
    isReady?: boolean;
    isBot?: boolean;
    title?: string;
    /** 展示名：自定义名或派生名（读出时 enrich，不落库） */
    displayName?: string;
  }>;
  allReady?: boolean;
  currentActivity?: {
    type: 'combat' | 'group_craft' | 'raid';
    stageId?: string;
    startedAt: string;
    /** 时长制活动：开始时刻 + 截止时刻 + 成员基线快照；旧存档的活动缺省这些字段，按旧规则平摊 */
    endsAt?: string;
    durationMinutes?: number;
    raidBossId?: string;
    raidBossName?: string;
    bossKillsNeeded?: number;
    /** 活动开始时每个成员的统计基线（贡献 = 结算时统计差值） */
    baseline?: Record<string, { kills: number; bossKills: number; raidBossKills: number; actions: number; xp: number }>;
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
  /** MWI protection: consumes one mirror; a failed attempt loses one level instead of resetting. */
  protectionItemId?: string;
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
  previousLevel: number;
  newLevel: number;
  consumedMaterials: Record<string, number>;
  bonusStats?: Record<string, number>;
  protected?: boolean;
  protectionItemId?: string;
  successRate?: number;
  xpGained?: number;
  enhancingLevel?: number;
  levelUps?: number[];
  statBonusPct?: number;
  failureReason?: string;
};

export type EnhancementInfo = {
  currentLevel: number;
  maxLevel: number;
  nextLevelCost: Record<string, number>;
  successRate: number;
  baseSuccessRate: number;
  levelModifier: number;
  overLevelBonus: number;
  toolBonus: number;
  currentStatBonusPct: number;
  nextStatBonusPct: number;
  slotMultiplier: number;
  itemLevel: number;
  enhancingLevel: number;
  enhancingXp: number;
  canEnhance: boolean;
  canAfford: boolean;
  isOwned: boolean;
  requiredProfession?: string;
  /** 匹配到的强化规则 itemType——前端用它查询可接单的服务提供者 */
  itemType?: string;
  protection: {
    itemId: string;
    available: number;
    failWithout: string;
    failWith: string;
  };
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
