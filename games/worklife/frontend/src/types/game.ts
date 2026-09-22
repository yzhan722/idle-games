// 游戏类型定义

export interface PlayerState {
  contentVersion: string;
  lastSimulatedAt: string;
  activeClassId: string;
  mode: "idle" | "life_action" | "combat_farm" | "enhancing";
  /** MWI: enhancing is a timed action — attempts run until the target level or the materials run out. */
  enhanceRun?: {
    itemId: string;
    targetLevel: number;
    useProtection: boolean;
    intervalMs: number;
    nextAttemptAt: number;
    startedAt: number;
    attempts: number;
    successes: number;
    failures: number;
    xpGained: number;
    outcome?: { reason: "reached" | "materials" | "stopped" | "max" | "no_protection"; level: number; at: number };
  };
  lifeActionState?: { actionId: string; startedAt: string; quantity?: number; remaining?: number };
  combatFarmState?: { stageId: string; startedAt: string; seed: string };
  combatLevel: number;
  combatXp: number;
  inventory: Record<string, number>;
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
    tool?: string;
    enhancementLevels: Record<string, number>;
    durability: Record<string, number>;
    maxDurability: Record<string, number>;
  };
  skills: Record<string, SkillState>;
  logs: Array<{ ts: string; text: string }>;
  tradingState: TradingState;
  partyState?: PartyState;
  activityQueue: ActivityQueueItem[];
  /** Derived by GET /player/state: MWI task badge. */
  taskSummary?: { total: number; ready: number; giftReady: boolean };
  stats?: {
    totalKills: number;
    totalBossKills?: number;
    totalDeaths?: number;
    killsByMonster?: Record<string, number>;
    totalGathered?: number;
    totalActions?: number;
    actionsById?: Record<string, number>;
  };
  hpCombat?: {
    monsterId: string;
    monsterName: string;
    playerHp: number;
    playerMaxHp: number;
    enemyHp: number;
    enemyMaxHp: number;
    playerIntervalMs: number;
    enemyIntervalMs: number;
    playerCooldownMs: number;
    enemyCooldownMs: number;
    heavyChopReadyAt: number;
    guardActive: boolean;
    wrathActive: boolean;
    log: string[];
    outcome?: "win" | "loss";
    drops?: Array<{ itemId: string; name: string; qty: number }>;
    consumed?: Array<{ itemId: string; name: string; qty: number }>;
    nextFightAt?: number;
    streak?: number;
    deaths?: number;
    startedAt?: number;
    /** MWI battle statistics for the current auto-repeat run. */
    runStats?: { startedAt: number; kills: number; xp: number; gold: number; loot: Record<string, number> };
    enrageStacks?: number;
    playerMp?: number;
    playerMaxMp?: number;
    abilityReadyAt?: Record<string, number>;
    braceUntil?: number;
    xpGained?: Record<string, number>;
  };
  chapter1Build?: "sharpened_edge" | "thick_bark";
  /** MWI combat skills (server-derived 战斗等级 lives in combatLevel). */
  combatSkills?: Record<CombatSkillId, { level: number; xp: number }>;
  abilities?: Record<string, { level: number; xp: number }>;
  abilityLoadout?: AbilitySlot[];
  combatLoadout?: {
    food: Array<{ itemId: string; triggerMissingHp: number }>;
    drink: Array<{ itemId: string }>;
    autoRepeat?: boolean;
  };
}

export type CombatSkillId = "stamina" | "intelligence" | "attack" | "defense" | "melee" | "ranged" | "magic";

export type AbilityTrigger =
  | { type: "always" }
  | { type: "enemy_hp_below"; pct: number }
  | { type: "self_hp_below"; pct: number }
  | { type: "enemy_guard" };

export type AbilitySlot = { abilityId: string; trigger: AbilityTrigger };

/** Ability definition as served by GET /content (mirrors backend/src/abilities.ts). */
export type AbilityDef = {
  id: string;
  name: string;
  blurb: string;
  cooldownMs: number;
  mpCost: number;
  damageMult?: number;
  healPct?: number;
  guardMult?: number;
  durationMs?: number;
  breaksGuard?: boolean;
  bookItemId?: string;
  defaultTrigger: AbilityTrigger;
  levelStep: number;
};

export interface SkillState {
  level: number;
  xp: number;
  unlockedRecipes: string[];
  enhancementLevel: number;
}

export interface TradingState {
  activeListings: string[];
  purchaseHistory: Array<{
    itemId: string;
    price: number;
    timestamp: string;
  }>;
}

export interface PartyState {
  partyId: string;
  role: string;
  isLeader: boolean;
  joinedAt: string;
}

/** 行动队列条目：当前动作结束后按顺序自动接上；quantity 缺省 = 无限 */
export interface ActivityQueueItem {
  id: string;
  actionId: string;
  quantity?: number;
}

export interface ContentPack {
  version: string;
  classes: GameClass[];
  skills: GameSkill[];
  items: GameItem[];
  actions: GameAction[];
  recipes: GameRecipe[];
  dropTables: DropTable[];
  monsters: GameMonster[];
  stages: GameStage[];
}


export interface GameClass {
  id: string;
  name: string;
  mainHand: string | null;
  offHand: string | null;
  role: string;
}

export interface GameSkill {
  id: string;
  classId: string;
  name: string;
}

export interface GameItem {
  id: string;
  name: string;
  type: string;
  tier: number;
  description?: string;
  stats?: Record<string, number>;
}

export interface GameAction {
  id: string;
  name: string;
  skillId: string;
  duration: number;
  xp: number;
  consumes?: Array<{ itemId: string; qty: number }>;
  yields?: Array<{ itemId: string; qty: number; chance?: number }>;
  requirements?: { skillLevel?: number };
}

export interface GameRecipe {
  id: string;
  name: string;
  skillId: string;
  inputs: Array<{ itemId: string; qty: number }>;
  outputs: Array<{ itemId: string; qty: number }>;
  xp: number;
  duration: number;
}

export interface DropTable {
  id: string;
  drops: Array<{ itemId: string; chance: number; minQty: number; maxQty: number }>;
}

export interface GameMonster {
  id: string;
  name: string;
  level: number;
  hp: number;
  atk: number;
  def: number;
  xp: number;
  dropTableId: string;
}

export interface GameStage {
  id: string;
  name: string;
  monsters: string[];
  requiredLevel: number;
}

// 活动状态
export interface CurrentActivity {
  name: string;
  output: string;
  duration: number;
}

// 战斗状态
export interface BattleState {
  isActive: boolean;
  monster: {
    id: string;
    name: string;
    hp: number;
    maxHp: number;
  };
  playerHp: number;
  playerMaxHp: number;
}

// 交易订单
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

// 聊天消息
export interface ChatMessage {
  id: number;
  sender: string;
  message: string;
  channel: 'world' | 'profession' | 'party';
  timestamp: Date;
}
