// 游戏类型定义

export interface PlayerState {
  contentVersion: string;
  lastSimulatedAt: string;
  activeClassId: string;
  mode: "idle" | "life_action" | "combat_farm";
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
    accessory1?: string;
    accessory2?: string;
    enhancementLevels: Record<string, number>;
    durability: Record<string, number>;
    maxDurability: Record<string, number>;
  };
  skills: Record<string, SkillState>;
  logs: Array<{ ts: string; text: string }>;
  tradingState: TradingState;
  partyState?: PartyState;
  activityQueue: ActivityQueueItem[];
}

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

export interface ActivityQueueItem {
  actionId: string;
  priority: number;
  estimatedDuration: number;
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
