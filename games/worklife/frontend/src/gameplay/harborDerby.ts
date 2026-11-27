// 港湾垂钓大赛 & 海港水族馆收藏图鉴 (WL-11) —— 前端镜像。
// 与 backend/src/progression2/harbor_derby.ts 同名表与纯函数逐字对称（scripts/harbor-derby-parity.test.ts 守护），
// 供面板预览鱼种池概率、计分、周榜段位结算预览、大师钓竿与水族馆加成，以及 combatSheet 金币倍率使用；
// 任何数值改动必须两端同步。

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

/** 鱼种池概率（百分比，1 位小数），供面板展示。 */
export function harborPoolOdds(pool: ReadonlyArray<HarborPoolEntry>): Array<HarborPoolEntry & { pct: number }> {
  const total = pool.reduce((s, p) => s + p.weight, 0);
  return pool.map((p) => ({ ...p, pct: total > 0 ? Math.round((p.weight / total) * 1000) / 10 : 0 }));
}
