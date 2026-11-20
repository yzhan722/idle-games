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

  // 赏金契约状态（每日刷新的词缀讨伐委托板）
  bounties?: BountyState;

  // 异世界公会荣誉与稀有锻造徽记状态（跨日与转生持久保留）
  guildHonor?: GuildHonorState;

  // 异世界工坊：传世铭纹附魔台与跨职业套装共鸣图鉴（跨装备更换与转生永久保留）
  heritageWorkshop?: HeritageWorkshopState;

  // 异世界远征商队贸易航路与工坊特批契约柜台（跨日与转生永久保留声望、晶尘与宗师商典）
  caravanTrade?: CaravanTradeState;

  // 异世界工坊：奇美拉炼金魔药釜与深渊试炼双共鸣药剂槽（跨转生永久保留宗师图谱、等阶与药剂储备）
  alchemyCauldron?: AlchemyCauldronState;

  // 异世界公会：星界远古遗迹勘探队与传世圣物陈列馆（跨转生永久保留圣物残片、勘探等阶与四大圣物基座）
  astralRelics?: AstralRelicsState;

  // 异世界工坊：天空锻炉星辰神兵谱与公会秘境试炼契约阵（跨转生永久保留四大星辰神兵纹章等阶与已签契约）
  skyForge?: SkyForgeState;

  // 异世界港湾：港湾垂钓大赛（每周轮换鱼场、周榜段位、奖杯柜与稀有鱼饵配方）
  harborDerby?: HarborDerbyState;

  // 异世界港湾：海港水族馆收藏图鉴（转生永久保留已收藏鱼种、最佳尺寸与主展缸）
  harborAquarium?: HarborAquariumState;

  // 异世界学院：冒险者学院进修课程（转生永久保留四系学分、结业记录与进行中的课程）
  adventurerAcademy?: AdventurerAcademyState;

  // 异世界节庆：四季节庆活动日历（东八区季节、限定委托、节庆代币商店；纪念章转生永久保留）
  festivalCalendar?: FestivalCalendarState;

  // 异世界竞技：天空竞技场赛季排位（东八区自然月赛季、每日挑战次数；赛季称号与竞技场勋章转生永久保留）
  skyArena?: SkyArenaState;

  // 异世界领地：公会领地城镇建设（设施等级、繁荣宝箱领取记录，转生永久保留）
  guildTown?: GuildTownState;

  // 异世界牧场：契约魔兽牧场（首领掉落 + 料理驯服、喂养升阶、出战伙伴；转生永久保留）
  beastRanch?: BeastRanchState;

  // 异世界天候：天候观星占卜塔（东八区日期确定性天候、占卜明日与祈愿记录；转生永久保留）
  weatherTower?: WeatherTowerState;

  // 异世界酒馆：吟游诗人酒馆（东八区日轮换来访冒险者、料理 / 饮品招待、点唱诗篇；名望转生永久保留）
  bardTavern?: BardTavernState;

  // 异世界编年史：冒险者编年史（把存档里真实的里程碑汇编成章节，编撰后解锁称号与小幅永久加成；转生永久保留）
  adventurerChronicle?: AdventurerChronicleState;

  // 异世界飞艇：浮空飞艇商路（在既有城镇间开辟航线、按东八区日行情买卖特产、航线等级与船体；转生永久保留，货舱清空）
  airshipTrade?: AirshipTradeState;

  // 异世界骑士团：圣骑士团荣誉试炼（东八区按周轮换的六关试炼、荣誉勋章与封顶的誓言永久加成；转生永久保留）
  paladinTrial?: PaladinTrialState;

  // 异世界地底：矮人地底矿脉（东八区日确定性矿脉图、矿道深度与矿车，产出直接入背包接入既有锻造材料；转生永久保留，在途矿车清空）
  dwarfMine?: DwarfMineState;

  // 异世界林地：精灵林地驿站（东八区每日采集 / 远征委托、林地好感与封顶的采集永久加成；转生永久保留）
  elfWaystation?: ElfWaystationState;

  // 异世界深海：深海遗迹潜航（东八区日确定性遗迹层与氧气预算、潜水装备，打捞品直接入背包接入既有材料；转生永久保留）
  abyssDive?: AbyssDiveState;

  // 异世界行会：冒险者行会公会战（东八区按周轮换的对手行会、竞技沙盒结算、行会勋章与封顶的永久加成；转生永久保留）
  guildWar?: GuildWarState;

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

// ===== 赏金契约系统（异世界公会每日词缀讨伐委托板 & 连携赏金） =====
export type BountyMetric = "gather" | "craft" | "kill";

export type GuildBountyAffixId =
  | "bountiful_harvest"
  | "scorching_sunder"
  | "swift_assault"
  | "artisan_overdrive"
  | "gilded_spoils";

export type GuildComboMilestoneId = "chain_2" | "chain_full";

export type GuildHonorShopCategory = "frame" | "forging" | "supply";

export type Bounty = {
  id: string;             // 实例ID
  templateId: string;     // 模板ID
  name: string;
  description: string;
  icon: string;
  iconKind?: "skills" | "ui" | "materials";
  iconId?: string;
  affixId?: GuildBountyAffixId; // 生态词缀 ID
  metric: BountyMetric;   // 完成判定指标
  target: number;         // 目标数量
  baseline: number;       // 接取时对应 stats 指标的基线值
  accepted: boolean;      // 是否已接取
  claimed: boolean;       // 是否已领奖
  rarity: "common" | "rare" | "epic"; // 稀有度（决定奖励倍率）
  honorReward?: number;   // 单条契约完成授予的公会荣誉积分
  reward: { gold: number; reputation: number; items?: Record<string, number> };
};

export type BountyState = {
  date: string;           // 当前契约板日期 YYYY-MM-DD（东八区业务日）
  seedKey?: string;       // 当日确定性种子标识
  bounties: Bounty[];     // 当日契约列表（默认 4 槽生态词缀委托）
  rerollsUsed: number;    // 当日已使用的刷新次数
  claimedTodayCount?: number; // 当日已完成领奖契约数（刷新不丢失连携计数）
  claimedAffixesToday?: GuildBountyAffixId[]; // 当日已完成契约留存的生态余韵词缀
  comboClaimed?: GuildComboMilestoneId[];     // 当日已领取的连携节点 ID
};

export type GuildHonorState = {
  honorPoints: number;          // 当前可用公会荣誉积分
  totalHonorEarned: number;     // 累计获得的公会荣誉积分
  forgingEmblems: number;       // 当前可用稀有锻造徽记
  totalChainsCompleted: number; // 累计领取连携赏金次数
  fullClears: number;           // 累计达成全板制霸次数
  unlockedFrames: string[];     // 已永久解锁的专属公会头像边框 ID
  equippedFrame: string | null; // 当前佩戴的专属公会头像边框 ID
  dailyPurchases?: {
    date: string;
    counts: Record<string, number>;
  };
};

// ===== 异世界工坊：传世铭纹附魔台 & 跨职业套装共鸣图鉴 (WL-6) =====
export type HeritageRuneSlot = "weapon" | "armor" | "tool";

export type HeritageRuneId =
  | "rune_sunder_edge"
  | "rune_tempest_fang"
  | "rune_bastion_ward"
  | "rune_vital_aegis"
  | "rune_bountiful_pick"
  | "rune_artisan_forge";

export type CrossProfResonanceSetId =
  | "forge_bastion"
  | "moonloom_weave"
  | "hearth_bounty"
  | "arcane_crucible";

export type HeritageWorkshopState = {
  runeRanks: Partial<Record<HeritageRuneId, number>>;
  equippedRunes: Partial<Record<HeritageRuneSlot, HeritageRuneId | null>>;
  emblemSynthesis?: {
    date: string;
    count: number;
  };
  codexUnlockedItems: string[];
  claimedCodexMilestones: string[];
};

// ===== 异世界远征商队贸易航路与工坊特批契约柜台 (WL-7) =====
export type CaravanRouteId = "frostport" | "emberoasis" | "starfallspire";

export type CaravanCargoCategory =
  | "lumber_fish_dishes"
  | "ore_ingot_tools"
  | "herb_cloth_crystal_alchemy";

export type CaravanWagonSlot = 0 | 1 | 2;

export type CaravanRewardSummary = {
  gold: number;
  astralCrystalDust: number;
  forgingEmblems: number;
  caravanRep: number;
};

export type CaravanWagonRun = {
  slot: CaravanWagonSlot;
  routeId: CaravanRouteId;
  cargo: Record<string, number>;
  startedAt: number;
  completesAt: number;
  scarcityMultiplier: number;
  usedExpressPermit?: boolean;
  expectedReward: CaravanRewardSummary;
};

export type WorkshopSupplyContractInstance = {
  id: string;
  templateId: string;
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
  fulfilled: boolean;
};

export type CaravanTradeState = {
  caravanRep: number;
  astralCrystalDust: number;
  expressPermits: number;
  ledgerRank: number;
  totalRunsCompleted: number;
  totalContractsFulfilled: number;
  wagons: Partial<Record<CaravanWagonSlot, CaravanWagonRun | null>>;
  contractsBoard?: {
    date: string;
    rerollsUsed: number;
    seedKey: string;
    contracts: WorkshopSupplyContractInstance[];
  };
  dailyDustExchanges?: {
    date: string;
    counts: Record<string, number>;
  };
};

// ===== 异世界工坊：奇美拉炼金魔药釜与深渊试炼双共鸣药剂槽 (WL-8) =====
export type AlchemicalPotionId =
  | "dragon_fury"
  | "elven_bounty"
  | "dwarven_temper"
  | "astral_fortune";

export type PotionBrewMode = "essence" | "material" | "astral_dust";

export type RecipeUpgradeMode = "standard" | "astral_dust";

export type ResonanceSlotIndex = 0 | 1;

export type AlchemyCauldronState = {
  recipeRanks: Record<AlchemicalPotionId, number>;
  potionCharges: Record<AlchemicalPotionId, number>;
  alchemicalEssence: number;
  equippedPotions: [AlchemicalPotionId | null, AlchemicalPotionId | null];
  totalBrews: number;
  totalUpgrades: number;
  cauldronPoints: number;
  alchemyCauldronRank: number;
  dailyExtraction?: {
    date: string;
    claimedCount: number;
  };
};

// ===== 异世界公会：星界远古遗迹勘探队与传世圣物陈列馆 (WL-9) =====
export type AstralRuinStratumId =
  | "outpost_ruins"
  | "obsidian_sanctum"
  | "primordial_corridor";

export type ExpeditionSurveyMode = "free" | "coin" | "astral_dust";

export type SacredRelicId =
  | "solar_spear"
  | "verdant_chalice"
  | "titan_anvil"
  | "chimera_censer";

export type RelicUpgradeMode = "standard" | "astral_dust";

export type AstralRelicsState = {
  ancientRelicShards: number;
  expeditionXp: number;
  curatorRank: number;
  totalSurveys: number;
  totalRestorations: number;
  pedestalRanks: Record<SacredRelicId, number>;
  dailySurvey?: {
    date: string;
    claimedCount: number;
  };
};

// ===== 异世界工坊：天空锻炉星辰神兵谱与公会秘境试炼契约阵 (WL-10) =====
export type StarEmblemId =
  | "star_blade"
  | "crescent_bow"
  | "star_hammer"
  | "amethyst_staff";

export type GuildTrialPactId =
  | "ember_vanguard"
  | "verdant_harvest"
  | "forge_oath"
  | "gale_hunt"
  | "astral_covenant";

export type SkyForgeState = {
  emblemLevels: Record<StarEmblemId, number>;
  totalForges: number;
  activePacts: GuildTrialPactId[];
  totalPactsSigned: number;
};

// ===== 异世界港湾：港湾垂钓大赛与海港水族馆收藏图鉴 (WL-11) =====
export type HarborGroundId = "dawn_pier" | "coral_moon_reef" | "frost_mist_fjord" | "starlit_abyss_port";

export type HarborBaitId = "harbor_worm" | "glow_shrimp" | "sunscale_lure" | "abyss_lantern_lure";

export type HarborSpeciesId =
  | "fish_river"
  | "shrimp"
  | "fish_sea"
  | "fish_lake"
  | "fish_deepsea"
  | "fish_abyss"
  | "fish_frost"
  | "fish_lava"
  | "fish_star"
  | "fish_dragon"
  | "sunscale_carp"
  | "abyss_lantern";

export type HarborDerbyTierId = "none" | "bronze" | "silver" | "gold" | "legend";

export type HarborTrophyTierId = Exclude<HarborDerbyTierId, "none">;

export type HarborTankThemeId =
  | "stream_shallows"
  | "coral_harbor"
  | "frost_grotto"
  | "ember_starlight"
  | "sunscale_palace";

export type HarborCatchRecord = {
  speciesId: HarborSpeciesId;
  sizeCm: number;
  score: number;
  baitId: HarborBaitId;
  featured: boolean;
  trophySize: boolean;
  at: string;
};

export type HarborDerbySettlement = {
  weekKey: string;
  groundId: HarborGroundId;
  tier: HarborDerbyTierId;
  weeklyScore: number;
  entries: number;
  trophyGranted: HarborTrophyTierId | null;
  unlockedRecipes: HarborBaitId[];
  goldReward: number;
  baitReward: Partial<Record<HarborBaitId, number>>;
};

export type HarborDerbyState = {
  /** 本周周一日期（东八区业务周，YYYY-MM-DD）；仅显式传入 now 时才会翻周结算。 */
  weekKey: string;
  /** 本周开始时的累计钓鱼行动数（stats.actionsById 中 act_fish_* 之和）。 */
  fishingBaseline: number;
  entriesUsed: number;
  weeklyCatches: HarborCatchRecord[];
  baitStock: Record<HarborBaitId, number>;
  knownRecipes: HarborBaitId[];
  trophies: Record<HarborTrophyTierId, number>;
  totalEntries: number;
  bestWeeklyScore: number;
  lastSettlement: HarborDerbySettlement | null;
};

export type HarborAquariumState = {
  species: Partial<Record<HarborSpeciesId, { count: number; bestSizeCm: number }>>;
  featuredTank: HarborTankThemeId | null;
};

// ===== 异世界学院与节庆：冒险者学院进修课程与四季节庆活动日历 (WL-12) =====
export type AcademyDepartmentId = "gathering" | "crafting" | "tactics" | "commerce";

export type AcademyCourseId =
  | "field_survey"
  | "spirit_botany"
  | "forge_practicum"
  | "master_artisan"
  | "squire_drills"
  | "dragon_tactics"
  | "ledger_basics"
  | "guild_economics";

export type FestivalSeasonId = "spring" | "summer" | "autumn" | "winter";

export type FestivalCommissionKind = "deliver" | "actions" | "kills";

export type FestivalCommissionId =
  | "spring_rice_offering"
  | "spring_planting_drive"
  | "spring_timber_frames"
  | "spring_loom_ribbons"
  | "summer_fish_feast"
  | "summer_net_casting"
  | "summer_cool_drinks"
  | "summer_seafood_platter"
  | "autumn_bread_basket"
  | "autumn_livestock_fair"
  | "autumn_honey_jars"
  | "autumn_vegetable_stew"
  | "winter_hunt_patrol"
  | "winter_hearty_stew"
  | "winter_healing_supply"
  | "winter_iron_chains";

export type FestivalShopItemKind = "gold" | "items" | "credits" | "keepsake";

export type FestivalShopItemId =
  | "festival_gold_pouch"
  | "spring_seed_bundle"
  | "spring_academy_letter"
  | "spring_keepsake"
  | "summer_catch_bundle"
  | "summer_academy_letter"
  | "summer_keepsake"
  | "autumn_harvest_bundle"
  | "autumn_academy_letter"
  | "autumn_keepsake"
  | "winter_hunt_bundle"
  | "winter_academy_letter"
  | "winter_keepsake";

export type AcademyActiveCourse = {
  courseId: AcademyCourseId;
  /** 报名时刻（ISO）；结业时刻恒为 startedAt + 课程时长（净化时重算，防篡改）。 */
  startedAt: string;
  endsAt: string;
};

export type AcademyGraduationRecord = {
  courseId: AcademyCourseId;
  department: AcademyDepartmentId;
  credits: number;
  /** 结业时刻 = 课程 endsAt（不是玩家打开面板的时刻）。 */
  at: string;
  departmentTier: number;
  badgeTier: number;
};

export type AdventurerAcademyState = {
  credits: Record<AcademyDepartmentId, number>;
  completedCourses: Partial<Record<AcademyCourseId, number>>;
  /** 进修席位 1：同一时间只修读 1 门；仅显式传入 now 且到点时才结业发放学分。 */
  activeCourse: AcademyActiveCourse | null;
  totalEnrollments: number;
  totalGraduations: number;
  lastGraduation: AcademyGraduationRecord | null;
};

export type FestivalRolloverRecord = {
  seasonKey: string;
  claims: number;
  tokensConverted: number;
  goldConverted: number;
};

export type FestivalCalendarState = {
  /** 当前节庆季节键（东八区，YYYY-spring|summer|autumn|winter）；仅显式传入 now 时才会翻季。 */
  seasonKey: string;
  /** 本季节庆代币（翻季时按比率折算金币后清零）。 */
  tokens: number;
  claims: Partial<Record<FestivalCommissionId, number>>;
  /** 本季计数类委托（行动 / 击杀）在季初的计数器基线。 */
  baselines: Partial<Record<FestivalCommissionId, number>>;
  purchases: Partial<Record<FestivalShopItemId, number>>;
  /** 四季纪念章（转生永久保留）。 */
  keepsakes: FestivalSeasonId[];
  totalTokensEarned: number;
  totalClaims: number;
  lastRollover: FestivalRolloverRecord | null;
};

// ===== 异世界竞技与领地：天空竞技场赛季排位与公会领地城镇建设 (WL-13) =====
export type ArenaDivisionId = "bronze" | "silver" | "gold" | "platinum" | "diamond" | "sky_king";

export type ArenaArchetypeId = "iron_wall" | "gale" | "berserker" | "arcane" | "knight" | "colossus";

export type TownFacilityId =
  | "town_hall"
  | "artisan_row"
  | "harvest_market"
  | "training_grounds"
  | "guild_bank"
  | "sage_library";

export type ArenaSettlementRecord = {
  /** 结算的赛季键（东八区自然月，YYYY-MM）。 */
  seasonKey: string;
  /** 该赛季击败的擂主数（= 最高梯级）。 */
  rung: number;
  division: ArenaDivisionId | null;
  medals: number;
  /** 本次结算首次解锁的赛季称号（已拥有则为 null）。 */
  newTitle: ArenaDivisionId | null;
};

export type ArenaDuelRecord = {
  seasonKey: string;
  rung: number;
  championName: string;
  won: boolean;
  /** true = 10 分钟未分胜负（按落败计）。 */
  timeout: boolean;
  playerHpLeft: number;
  playerMaxHp: number;
  enemyHpLeft: number;
  enemyMaxHp: number;
  durationMs: number;
  gold: number;
  at: string;
};

export type SkyArenaState = {
  /** 当前赛季键（东八区自然月 YYYY-MM）；仅显式传入 now 时才会翻季结算。 */
  seasonKey: string;
  /** 本赛季已击败的擂主数（0~30），下一位挑战对象为 rung + 1。 */
  rung: number;
  /** 生涯最高梯级。 */
  bestRung: number;
  /** 每日挑战次数所属的东八区日期（YYYY-MM-DD）；仅显式传入 now 时才会换日重置。 */
  dayKey: string;
  attemptsUsed: number;
  seasonWins: number;
  seasonLosses: number;
  totalWins: number;
  totalLosses: number;
  /** 可用竞技场勋章（赛季结算发放，用于城镇「荣耀演武场」升级；转生保留）。 */
  medals: number;
  totalMedalsEarned: number;
  /** 已解锁的赛季称号（转生永久保留，最高称号生效）。 */
  titles: ArenaDivisionId[];
  seasonsSettled: number;
  lastSettlement: ArenaSettlementRecord | null;
  lastDuel: ArenaDuelRecord | null;
};

export type GuildTownUpgradeRecord = {
  facilityId: TownFacilityId;
  level: number;
  at: string;
};

export type GuildTownState = {
  /** 各设施等级（0~5）；议事厅等级是其余设施的等级上限。 */
  facilities: Record<TownFacilityId, number>;
  /** 已领取的繁荣宝箱（繁荣等级 1~5）。 */
  chestsClaimed: number[];
  totalUpgrades: number;
  goldInvested: number;
  lastUpgrade: GuildTownUpgradeRecord | null;
};

// ===== 异世界牧场与天候：契约魔兽牧场与天候观星占卜塔 (WL-14) =====
export type ContractBeastId = "bloom_bee" | "echo_bat" | "mire_toad" | "frostmane_wolf" | "ember_hound" | "chrono_wyrm";

export type BeastRoleId = "gather" | "craft" | "combat";

export type WeatherId = "sunny" | "rain" | "fog" | "storm" | "aurora";

export type ContractBeastRecord = {
  /** 累计喂养经验（等级由经验表推导，0 = Lv.1，满级 Lv.10）。 */
  xp: number;
  /** 累计喂食的料理份数。 */
  fed: number;
  tamedAt: string;
};

export type BeastRanchEventRecord = {
  kind: "tame" | "feed" | "assign";
  beastId: ContractBeastId;
  level: number;
  foodId: string | null;
  qty: number;
  xpGained: number;
  at: string;
};

export type BeastRanchState = {
  beasts: Partial<Record<ContractBeastId, ContractBeastRecord>>;
  /** 出战伙伴（只有它的职能加成生效）；null = 未指派。 */
  activeBeastId: ContractBeastId | null;
  totalTamed: number;
  totalFeedings: number;
  lastEvent: BeastRanchEventRecord | null;
};

export type WeatherForecastRecord = {
  /** 占卜的目标日（东八区 YYYY-MM-DD）。 */
  dayKey: string;
  /** 该日的天然天候（由日期确定性生成）。 */
  natural: WeatherId;
  /** 祈愿的天候（未祈愿为 null）。 */
  wish: WeatherId | null;
  /** 祈愿时的成功率（%）。 */
  chancePct: number;
  /** 祈愿是否应验（应验则该日天候 = 祈愿天候）。 */
  granted: boolean;
  /** 该日最终天候。 */
  final: WeatherId;
  at: string;
};

export type WeatherHistoryRecord = {
  dayKey: string;
  weather: WeatherId;
  wished: boolean;
};

export type WeatherTowerState = {
  /** 观星塔所在的东八区日期（YYYY-MM-DD）；仅显式传入 now 时才会换日。 */
  dayKey: string;
  /** 今日 / 明日的占卜记录（最多 2 条）。 */
  forecasts: WeatherForecastRecord[];
  /** 近 7 日天候记录（换日时归档）。 */
  history: WeatherHistoryRecord[];
  totalDivinations: number;
  totalWishes: number;
  wishesGranted: number;
  dustSpent: number;
};

// ===== 异世界酒馆与编年史：吟游诗人酒馆与冒险者编年史 (WL-15) =====
export type TavernVisitorId =
  | "star_knight"
  | "dawn_ranger"
  | "verdant_mage"
  | "crimson_valkyrie"
  | "jade_alchemist"
  | "moon_healer"
  | "fox_wanderer"
  | "cat_cavalier";

export type TavernBalladId = "forest_wander" | "forge_hearth" | "sage_chant" | "golden_toast" | "hero_epic";

export type ChronicleChapterId =
  | "slayer_saga"
  | "expedition_journal"
  | "harbor_log"
  | "academy_annals"
  | "arena_epic"
  | "beast_bond"
  | "legend_finale";

export type ChronicleMetricId =
  | "boss_kinds"
  | "boss_kills"
  | "relic_surveys"
  | "curator_rank"
  | "caravan_runs"
  | "derby_trophies"
  | "derby_best_tier"
  | "aquarium_species"
  | "academy_graduations"
  | "academy_credits"
  | "festival_keepsakes"
  | "arena_best_rung"
  | "arena_wins"
  | "arena_titles"
  | "beasts_tamed"
  | "beast_top_level"
  | "ranch_bond_levels"
  | "chapters_inscribed"
  | "tavern_fame"
  | "prestige_count";

export type TavernActiveBallad = {
  balladId: TavernBalladId;
  /** 点唱时刻（ISO）；结束时刻恒为 startedAt + 诗篇时长（净化时重算，防篡改）。 */
  startedAt: string;
  endsAt: string;
};

export type TavernServeRecord = {
  visitorId: TavernVisitorId;
  dayKey: string;
  dishId: string | null;
  drinkId: string | null;
  matchedDish: boolean;
  matchedDrink: boolean;
  fame: number;
  tipGold: number;
  at: string;
};

export type BardTavernState = {
  /** 酒馆所在的东八区日期（YYYY-MM-DD）；仅显式传入 now 时才会换日（重置当日招待与点唱次数）。 */
  dayKey: string;
  /** 今日已招待的来访冒险者（每位每日 1 次）。 */
  served: TavernVisitorId[];
  /** 今日已点唱的诗篇次数。 */
  balladsToday: number;
  /** 正在演唱的诗篇（限时增益；过期后保留到下次点唱前，仅用于展示）。 */
  activeBallad: TavernActiveBallad | null;
  /** 累计酒馆名望（只增不减，决定名望等级与永久加成；转生保留）。 */
  fame: number;
  totalServed: number;
  totalPerfect: number;
  totalBallads: number;
  tipsEarned: number;
  lastServe: TavernServeRecord | null;
};

export type ChronicleInscriptionRecord = {
  chapterId: ChronicleChapterId;
  at: string;
};

export type AdventurerChronicleState = {
  /** 已编撰的章节（编撰时校验真实里程碑；编撰后永久保留，解锁称号与小幅永久加成）。 */
  inscribed: ChronicleChapterId[];
  inscribedAt: Partial<Record<ChronicleChapterId, string>>;
  /** 佩戴的编年史称号（必须是已编撰章节的称号；null = 未佩戴）。 */
  equippedTitle: ChronicleChapterId | null;
  lastInscription: ChronicleInscriptionRecord | null;
};

// ===== 异世界飞艇与骑士团：浮空飞艇商路与圣骑士团荣誉试炼 (WL-16) =====
export type AirshipTownId = "guild_town" | "frostport" | "emberoasis" | "starfallspire";

export type AirshipGoodId =
  | "cheese_wheel"
  | "dyed_cloth"
  | "fish_deepsea"
  | "snow_pelt"
  | "ingot_4"
  | "obsidian_chunk"
  | "crystal_4"
  | "tea_spirit";

export type AirshipRouteId =
  | "guild_frostport"
  | "guild_emberoasis"
  | "guild_starfall"
  | "frost_ember"
  | "ember_starfall"
  | "starfall_frost";

export type PaladinVirtueId = "valor" | "aegis" | "vigor" | "glory";

export type PaladinThemeId = "bulwark" | "blade" | "radiance" | "gale";

export type AirshipRouteRecord = {
  /** 航线经验（每趟载货航程 1 + 每 10 件货 1 点），决定航线等级。 */
  xp: number;
  /** 经此航线完成的航程数。 */
  voyages: number;
  openedAt: string;
};

export type AirshipVoyage = {
  routeId: AirshipRouteId;
  from: AirshipTownId;
  to: AirshipTownId;
  departedAt: string;
  /** 抵港时刻恒为 departedAt + 航程时长（净化时按航线等级与船体重算，防篡改）。 */
  arrivesAt: string;
  /** 起航时货舱里的货物件数（抵港时折算航线经验）。 */
  cargoUnits: number;
};

export type AirshipSaleRecord = {
  goodId: AirshipGoodId;
  townId: AirshipTownId;
  qty: number;
  gold: number;
  profit: number;
  at: string;
};

export type AirshipArrivalRecord = {
  routeId: AirshipRouteId;
  to: AirshipTownId;
  cargoUnits: number;
  xpGained: number;
  at: string;
};

export type AirshipTradeState = {
  /** 集市所在的东八区日期（YYYY-MM-DD）；仅显式传入 now 时才会换日（补货、清空今日购入量）。 */
  dayKey: string;
  /** 飞艇停靠的城镇（航行中为出发港）。 */
  location: AirshipTownId;
  /** 正在进行的航程；仅显式传入 now 且到点时才会抵港。 */
  voyage: AirshipVoyage | null;
  /** 最近一次抵港所走的航线（在该港卖货享受航线等级加成）。 */
  arrivedVia: AirshipRouteId | null;
  hullLevel: number;
  /** 已开辟的航线。 */
  routes: Partial<Record<AirshipRouteId, AirshipRouteRecord>>;
  /** 货舱里的特产件数。 */
  cargo: Partial<Record<AirshipGoodId, number>>;
  /** 货舱里各特产的购入总成本（卖出时按件数比例摊销，用于计算盈亏）。 */
  cargoCost: Partial<Record<AirshipGoodId, number>>;
  /** 今日在产地已购入的件数（每种每日 40 件存货）。 */
  boughtToday: Partial<Record<AirshipGoodId, number>>;
  totalVoyages: number;
  totalSales: number;
  totalSpent: number;
  /** 累计已实现盈亏（可为负）。 */
  totalProfit: number;
  lastSale: AirshipSaleRecord | null;
  lastArrival: AirshipArrivalRecord | null;
};

export type PaladinDuelRecord = {
  weekKey: string;
  stage: number;
  opponentName: string;
  won: boolean;
  timeout: boolean;
  playerHpLeft: number;
  playerMaxHp: number;
  enemyHpLeft: number;
  enemyMaxHp: number;
  durationMs: number;
  medals: number;
  at: string;
};

export type PaladinTrialState = {
  /** 本周周键（周一的东八区日期）；仅显式传入 now 时才会翻周（重置通关进度与挑战次数）。 */
  weekKey: string;
  /** 本周已通关的关卡（从第 1 关起连续）。 */
  cleared: number[];
  attemptsUsed: number;
  /** 可花费的荣誉勋章。 */
  medals: number;
  /** 累计获得的荣誉勋章（只增不减，决定荣誉位阶）。 */
  totalMedals: number;
  /** 四项誓言的阶数（各 0 ~ 5 阶，永久加成封顶）。 */
  virtues: Record<PaladinVirtueId, number>;
  bestStage: number;
  weeksFullCleared: number;
  totalWins: number;
  totalLosses: number;
  lastDuel: PaladinDuelRecord | null;
};

// ===== 异世界地底与林地：矮人地底矿脉与精灵林地驿站 (WL-17) =====
export type MineGradeId = "lean" | "common" | "rich" | "bonanza";

export type ElfExpeditionSourceId = "caravan_runs" | "relic_surveys" | "airship_voyages";

export type DwarfMineHaul = {
  /** 下井的矿层（1 ~ 6，不超过矿道深度）。 */
  layer: number;
  /** 出车当天（东八区）的矿脉日期键：回矿时按该日矿脉品位与当前矿车结算产出。 */
  dayKey: string;
  startedAt: string;
  /** 回矿时刻恒为 startedAt + 本层出车时长（净化时按矿车等级重算，防篡改）。 */
  returnsAt: string;
};

export type DwarfMineHaulRecord = {
  layer: number;
  oreId: string;
  oreQty: number;
  grade: MineGradeId;
  byproductId: string;
  byproductQty: number;
  at: string;
};

export type DwarfMineState = {
  /** 矿脉图所在的东八区日期（YYYY-MM-DD）；仅显式传入 now 时才会换日（新矿脉、补满各层储量）。 */
  dayKey: string;
  /** 矿道深度 = 能下到的最深矿层（1 ~ 6）。 */
  depth: number;
  cartLevel: number;
  /** 今日各层已出车次数（键为层号字符串，每层每日 2 车）。 */
  haulsToday: Record<string, number>;
  /** 正在井下的矿车；仅显式传入 now 且到点时才会回矿入背包。 */
  haul: DwarfMineHaul | null;
  totalHauls: number;
  totalOre: number;
  totalByproduct: number;
  bonanzaHauls: number;
  lastHaul: DwarfMineHaulRecord | null;
};

export type ElfCommissionRecord = {
  slot: number;
  commissionId: string;
  /** 本次获得的林地好感（含全清奖励）。 */
  favor: number;
  gold: number;
  at: string;
};

export type ElfWaystationState = {
  /** 委托板所在的东八区日期；仅显式传入 now 时才会换日（重新张贴委托板）。 */
  dayKey: string;
  /** 今日委托板张贴时的林地好感等级（决定委托池，当天不变）。 */
  boardTier: number;
  /** 今日已完成的委托栏位（0、1 为采集委托，2 为远征委托）。 */
  completed: number[];
  /** 今日委托板张贴时读到的远征计数（远征委托只认此后新完成的次数）。 */
  expeditionBase: Record<ElfExpeditionSourceId, number>;
  /** 累计林地好感（只增不减，决定好感等级与永久加成）。 */
  favor: number;
  totalCommissions: number;
  fullBoards: number;
  totalGold: number;
  lastCommission: ElfCommissionRecord | null;
};

// ===== 异世界深海与行会：深海遗迹潜航与冒险者行会公会战 (WL-18) =====
export type AbyssCurrentId = "calm" | "surge" | "wreck";

export type GuildRivalId = "iron_fang" | "silver_tide" | "stone_wall" | "crimson_owl";

export type AbyssDiveRecord = {
  layer: number;
  itemId: string;
  qty: number;
  current: AbyssCurrentId;
  /** 本次消耗的氧气。 */
  oxygen: number;
  at: string;
};

export type AbyssDiveState = {
  /** 遗迹图所在的东八区日期（YYYY-MM-DD）；仅显式传入 now 时才会换日（新遗迹图、补满氧气与各层次数）。 */
  dayKey: string;
  gearLevel: number;
  /** 今日已消耗的氧气（不超过当前装备的每日预算）。 */
  oxygenUsed: number;
  /** 今日各层已下潜次数（键为层号字符串，每层每日 2 次）。 */
  divesToday: Record<string, number>;
  totalDives: number;
  totalSalvage: number;
  deepestLayer: number;
  lastDive: AbyssDiveRecord | null;
};

export type GuildWarDuelRecord = {
  weekKey: string;
  seat: number;
  rivalId: GuildRivalId;
  opponentName: string;
  won: boolean;
  timeout: boolean;
  medals: number;
  at: string;
};

export type GuildWarState = {
  /** 本周周一（东八区）日期键；仅显式传入 now 时才会翻周（换对手行会、补满次数、清空本周战绩）。 */
  weekKey: string;
  attemptsUsed: number;
  /** 本周已击败的席位（从第 1 席起连续）。 */
  cleared: number[];
  /** 累计行会勋章（只增不减，决定行会位阶与永久加成）。 */
  totalMedals: number;
  totalDuels: number;
  totalWins: number;
  sweeps: number;
  lastDuel: GuildWarDuelRecord | null;
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
