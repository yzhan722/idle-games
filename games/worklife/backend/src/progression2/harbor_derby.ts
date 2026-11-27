// 进阶进度 · 港湾垂钓大赛 & 海港水族馆收藏图鉴 (WL-11)
// 从 progression2.ts 原样拆出；对外一律从 "../progression2" 引用。

import type {
  EnhancedContentPack,
  EnhancedPlayerState,
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
} from "../types";
import { ensurePlayerExtensions, appendLog } from "../storage";
import { syncAchievements } from "../progression";
import { addReputation } from "./reputation";

/* ============================ 港湾垂钓大赛 & 海港水族馆收藏图鉴 (WL-11) ============================ */
// 前端 frontend/src/gameplay/harborDerby.ts 逐表逐式 1:1 镜像（scripts/harbor-derby-parity.test.ts 守护，
// 「WL-11 core」区段两端逐字一致）。
// - 港湾垂钓大赛：每周（东八区周一 0 点）轮换鱼场；每次参赛消耗 1 次本周真实钓鱼行动（act_fish_*）+ 1 份鱼饵
//   （鱼饵由真实钓鱼产物调制），按鱼种稀有度 / 尺寸确定性计分；周榜取本周最佳 5 条渔获，翻周时按段位结算
//   奖杯、金币、鱼饵与稀有鱼饵配方。翻周只在显式传入 now（指令 / 视图时钟）时发生；无参 ensure 只做净化。
// - 海港水族馆收藏图鉴：参赛渔获入缸收藏（转生永久保留），收藏进度解锁主题展缸并对称增幅
//   钓鱼速度（getActionRates 钓鱼行动速度）、烹饪效率与单人战斗金币。

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
    appendLog(player, `海港水族馆收藏进度晋升「${aqTier.title}」，钓鱼速度 / 烹饪效率 / 单人战斗金币提升！`);
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
