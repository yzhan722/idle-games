// 吟游诗人酒馆 & 冒险者编年史 (WL-15) —— 前端镜像。
// 与 backend/src/progression2.ts 同名表与纯函数逐字对称（scripts/bard-tavern-parity.test.ts 守护），
// 供面板展示来访冒险者与点单、招待名望 / 小费预览、诗篇增益、名望等级，以及编年史的真实里程碑汇编；
// 酒馆名望等级与已编撰章节的永久攻防血 / 金币通过 combatSheet.combinedBuildFromState 接入（后端 playerBuildExtras 同口径），
// 限时诗篇只作用于生活职业（后端 getActionRates 按 now 判定），不改变任何战斗机制。
// 任何数值改动必须两端同步。
import { cleanBeastLevels } from "./beastWeather";

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

/* ---- 以下为与后端逐字对称的表与纯函数（WL-15 core） ---- */

export const TAVERN_VISITOR_IDS: readonly TavernVisitorId[] = [
  "star_knight",
  "dawn_ranger",
  "verdant_mage",
  "crimson_valkyrie",
  "jade_alchemist",
  "moon_healer",
  "fox_wanderer",
  "cat_cavalier",
];

export const TAVERN_BALLAD_IDS: readonly TavernBalladId[] = ["forest_wander", "forge_hearth", "sage_chant", "golden_toast", "hero_epic"];

export const CHRONICLE_CHAPTER_IDS: readonly ChronicleChapterId[] = [
  "slayer_saga",
  "expedition_journal",
  "harbor_log",
  "academy_annals",
  "arena_epic",
  "beast_bond",
  "legend_finale",
];

export const CHRONICLE_METRIC_IDS: readonly ChronicleMetricId[] = [
  "boss_kinds",
  "boss_kills",
  "relic_surveys",
  "curator_rank",
  "caravan_runs",
  "derby_trophies",
  "derby_best_tier",
  "aquarium_species",
  "academy_graduations",
  "academy_credits",
  "festival_keepsakes",
  "arena_best_rung",
  "arena_wins",
  "arena_titles",
  "beasts_tamed",
  "beast_top_level",
  "ranch_bond_levels",
  "chapters_inscribed",
  "tavern_fame",
  "prestige_count",
];

/** 酒馆按东八区日期（每日 0 点）换日：来访冒险者、招待与点唱次数都随之轮换。 */
export const TAVERN_TZ_OFFSET_MINUTES = 480;
/** 每个东八区日来访的冒险者人数（从 8 位常客中确定性抽取）。 */
export const TAVERN_VISITORS_PER_DAY = 4;
/** 每个东八区日最多点唱的诗篇次数。 */
export const TAVERN_BALLADS_PER_DAY = 3;
/** 端上冒险者当日点名的料理 / 饮品：该项名望 ×1.5（百分比，整数运算，两端一致）。 */
export const TAVERN_ORDER_MATCH_PCT = 150;
/** 料理与饮品都合点单（完美招待）的额外名望。 */
export const TAVERN_PERFECT_BONUS_FAME = 5;
/** 编年史里程碑读数的上限（防脏档溢出）。 */
export const CHRONICLE_METRIC_CAP = 1_000_000_000;
/** 首领讨伐计入的内容包真实首领（按等级由低到高）。 */
export const CHRONICLE_BOSS_IDS: readonly string[] = [
  "forest_boss",
  "mine_boss",
  "swamp_boss",
  "snow_boss",
  "volcano_boss",
  "abyss_boss",
  "celestial_boss",
  "rift_boss",
  "inferno_boss",
  "genesis_boss",
  "omega_boss",
];
/** WL-11 港湾大赛奖杯段位（由低到高，段位序号 1~4）。 */
export const CHRONICLE_TROPHY_TIERS: readonly string[] = ["bronze", "silver", "gold", "legend"];
/** WL-11 海港水族馆可收藏的鱼种。 */
export const CHRONICLE_AQUARIUM_SPECIES: readonly string[] = [
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
/** WL-12 冒险者学院四系。 */
export const CHRONICLE_ACADEMY_DEPTS: readonly string[] = ["gathering", "crafting", "tactics", "commerce"];
/** WL-12 四季纪念章。 */
export const CHRONICLE_FESTIVAL_SEASONS: readonly string[] = ["spring", "summer", "autumn", "winter"];
/** WL-13 天空竞技场赛季称号段位。 */
export const CHRONICLE_ARENA_DIVISIONS: readonly string[] = ["bronze", "silver", "gold", "platinum", "diamond", "sky_king"];

export interface TavernChronicleStats {
  gatherSpeedPct?: number;
  craftSpeedPct?: number;
  gatherEfficiencyPct?: number;
  craftEfficiencyPct?: number;
  xpGainPct?: number;
  goldGainPct?: number;
  bonusAtk?: number;
  bonusDef?: number;
  bonusHp?: number;
}

export const TAVERN_STAT_KEYS: readonly (keyof TavernChronicleStats)[] = [
  "gatherSpeedPct",
  "craftSpeedPct",
  "gatherEfficiencyPct",
  "craftEfficiencyPct",
  "xpGainPct",
  "goldGainPct",
  "bonusAtk",
  "bonusDef",
  "bonusHp",
];

export interface TavernMenuItemDef {
  /** 内容包真实烹饪成品 id。 */
  itemId: string;
  kind: "dish" | "drink";
  /** 端上这一份带来的基础酒馆名望。 */
  fame: number;
}

/** 酒馆菜单：真实烹饪成品（料理按烹饪等级从低到高，其后为饮品）。 */
export const TAVERN_MENU: readonly TavernMenuItemDef[] = [
  { itemId: "food_simple", kind: "dish", fame: 2 },
  { itemId: "food_grain_meal", kind: "dish", fame: 3 },
  { itemId: "food_hearty_stew", kind: "dish", fame: 4 },
  { itemId: "bread", kind: "dish", fame: 4 },
  { itemId: "food_vegetable_stew", kind: "dish", fame: 5 },
  { itemId: "food_fine", kind: "dish", fame: 6 },
  { itemId: "food_master_feast", kind: "dish", fame: 8 },
  { itemId: "soup_herbal", kind: "dish", fame: 9 },
  { itemId: "dish_grilled_lake", kind: "dish", fame: 9 },
  { itemId: "food_honey_cake", kind: "dish", fame: 10 },
  { itemId: "dish_deepsea_stew", kind: "dish", fame: 12 },
  { itemId: "food_pork_roast", kind: "dish", fame: 14 },
  { itemId: "dish_abyss_platter", kind: "dish", fame: 14 },
  { itemId: "dish_frost_sashimi", kind: "dish", fame: 17 },
  { itemId: "food_royal_banquet", kind: "dish", fame: 20 },
  { itemId: "dish_lava_roast", kind: "dish", fame: 20 },
  { itemId: "dish_star_feast", kind: "dish", fame: 22 },
  { itemId: "dish_dragon_delicacy", kind: "dish", fame: 25 },
  { itemId: "food_divine_feast", kind: "dish", fame: 28 },
  { itemId: "food_cosmos_banquet", kind: "dish", fame: 36 },
  { itemId: "drink_basic", kind: "drink", fame: 3 },
  { itemId: "drink_herbal_tonic", kind: "drink", fame: 5 },
  { itemId: "drink_fine", kind: "drink", fame: 6 },
  { itemId: "tea_spirit", kind: "drink", fame: 8 },
  { itemId: "drink_rich", kind: "drink", fame: 11 },
  { itemId: "drink_arcane", kind: "drink", fame: 20 },
  { itemId: "drink_divine", kind: "drink", fame: 26 },
];

export interface TavernVisitorDef {
  id: TavernVisitorId;
  name: string;
  title: string;
  /** 头像复用角色创建的真实头像美术（ui/<avatarId>）。 */
  avatarId: string;
  quote: string;
  /** 爱吃的料理（当日点单从中确定性抽取）。 */
  dishes: readonly string[];
  /** 爱喝的饮品（当日点单从中确定性抽取）。 */
  drinks: readonly string[];
  /** 每点名望付的小费金币。 */
  tipPerFame: number;
}

export const TAVERN_VISITORS: readonly TavernVisitorDef[] = [
  {
    id: "star_knight",
    name: "罗兰",
    title: "星辉剑士",
    avatarId: "avatar_male_knight",
    quote: "刚从霜冠雪魔的冰原回来，来一份顶饱的热菜，再来一杯醇酒暖暖身子！",
    dishes: ["food_hearty_stew", "food_master_feast", "food_pork_roast", "food_royal_banquet"],
    drinks: ["drink_basic", "drink_rich"],
    tipPerFame: 12,
  },
  {
    id: "dawn_ranger",
    name: "阿尔文",
    title: "晨风游侠",
    avatarId: "avatar_male_ranger",
    quote: "林间赶路一整天，想吃点清爽的湖鲜，配一壶灵茶就好。",
    dishes: ["food_grain_meal", "food_vegetable_stew", "dish_grilled_lake", "dish_star_feast"],
    drinks: ["tea_spirit", "drink_herbal_tonic"],
    tipPerFame: 11,
  },
  {
    id: "verdant_mage",
    name: "墨林",
    title: "苍翠秘术师",
    avatarId: "avatar_male_mage",
    quote: "施法太耗神了……药膳和甜点都行，饮品要能回魔力的那种。",
    dishes: ["soup_herbal", "food_honey_cake", "dish_abyss_platter", "food_divine_feast"],
    drinks: ["tea_spirit", "drink_arcane"],
    tipPerFame: 13,
  },
  {
    id: "crimson_valkyrie",
    name: "布伦希尔",
    title: "绯光女武神",
    avatarId: "avatar_female_valkyrie",
    quote: "烤肉！要火候最旺的那种！今晚我请全场喝一轮佳酿！",
    dishes: ["food_master_feast", "food_pork_roast", "dish_lava_roast", "dish_dragon_delicacy"],
    drinks: ["drink_fine", "drink_rich"],
    tipPerFame: 14,
  },
  {
    id: "jade_alchemist",
    name: "艾琳",
    title: "翠星炼金术师",
    avatarId: "avatar_female_alchemist",
    quote: "实验室的坩埚还在咕嘟——给我一份能边看配方边吃的点心和一杯汤剂。",
    dishes: ["bread", "food_honey_cake", "dish_deepsea_stew", "food_cosmos_banquet"],
    drinks: ["drink_herbal_tonic", "drink_arcane", "drink_divine"],
    tipPerFame: 12,
  },
  {
    id: "moon_healer",
    name: "露娜",
    title: "月华圣女",
    avatarId: "avatar_female_healer",
    quote: "为伤员守了一夜……请给我一碗温补的汤，再泡一壶清心的茶。",
    dishes: ["soup_herbal", "food_vegetable_stew", "food_fine", "food_divine_feast"],
    drinks: ["tea_spirit", "drink_divine"],
    tipPerFame: 11,
  },
  {
    id: "fox_wanderer",
    name: "小葵",
    title: "灵狐冒险家",
    avatarId: "avatar_animal_fox",
    quote: "老板老板，今天有什么好吃的？简单料理也行，要有鱼！",
    dishes: ["food_simple", "bread", "dish_grilled_lake", "dish_frost_sashimi"],
    drinks: ["drink_basic", "drink_fine"],
    tipPerFame: 10,
  },
  {
    id: "cat_cavalier",
    name: "喵爵士",
    title: "星冠猫骑士",
    avatarId: "avatar_animal_cat",
    quote: "本爵士只吃海里来的鲜货。刺身、浓汤、星界鱼宴——喵，统统端上来。",
    dishes: ["food_simple", "dish_deepsea_stew", "dish_frost_sashimi", "dish_star_feast"],
    drinks: ["drink_basic", "tea_spirit"],
    tipPerFame: 13,
  },
];

export interface TavernBalladDef {
  id: TavernBalladId;
  name: string;
  description: string;
  /** 解锁所需的酒馆名望等级。 */
  minFameTier: number;
  costGold: number;
  /** 诗篇增益持续时间（分钟）。 */
  durationMin: number;
  /** 点唱带来的酒馆名望。 */
  fame: number;
  /** 限时增益（只作用于生活职业速度 / 产出、经验与金币收益，不改变战斗机制）。 */
  stats: TavernChronicleStats;
}

export const TAVERN_BALLADS: readonly TavernBalladDef[] = [
  {
    id: "forest_wander",
    name: "林野采风谣",
    description: "轻快的林野小调，跟着节拍采集，脚步与手上的活计都更利落。",
    minFameTier: 0,
    costGold: 300,
    durationMin: 30,
    fame: 4,
    stats: { gatherSpeedPct: 8, gatherEfficiencyPct: 4 },
  },
  {
    id: "forge_hearth",
    name: "炉火匠心曲",
    description: "铁锤与琴弦同拍的工坊号子，炉火更旺、针脚更密。",
    minFameTier: 0,
    costGold: 300,
    durationMin: 30,
    fame: 4,
    stats: { craftSpeedPct: 8, craftEfficiencyPct: 4 },
  },
  {
    id: "sage_chant",
    name: "智者长吟",
    description: "吟诵古老学者的箴言，听者触类旁通，历练积累得更快。",
    minFameTier: 1,
    costGold: 600,
    durationMin: 30,
    fame: 6,
    stats: { xpGainPct: 8 },
  },
  {
    id: "golden_toast",
    name: "金杯祝酒歌",
    description: "满堂举杯的祝酒歌，财源随着酒香一起滚滚而来。",
    minFameTier: 2,
    costGold: 600,
    durationMin: 30,
    fame: 6,
    stats: { goldGainPct: 10 },
  },
  {
    id: "hero_epic",
    name: "屠龙英雄史诗",
    description: "诗人倾尽全力演唱的长篇史诗，整座城镇都为之振奋。",
    minFameTier: 3,
    costGold: 2000,
    durationMin: 45,
    fame: 12,
    stats: { gatherSpeedPct: 5, craftSpeedPct: 5, xpGainPct: 5, goldGainPct: 5 },
  },
];

export interface TavernFameTierDef {
  tier: 0 | 1 | 2 | 3 | 4 | 5;
  /** 累计酒馆名望达到该值即晋升（永久）。 */
  minFame: number;
  name: string;
  stats: TavernChronicleStats;
}

export const TAVERN_FAME_TIERS: readonly TavernFameTierDef[] = [
  { tier: 0, minFame: 0, name: "无名小酒馆", stats: {} },
  { tier: 1, minFame: 60, name: "街角酒肆", stats: { goldGainPct: 1 } },
  { tier: 2, minFame: 200, name: "冒险者驿站", stats: { goldGainPct: 1, xpGainPct: 1 } },
  { tier: 3, minFame: 500, name: "名满王都", stats: { goldGainPct: 2, xpGainPct: 1, craftSpeedPct: 1 } },
  { tier: 4, minFame: 1000, name: "传奇酒馆", stats: { goldGainPct: 2, xpGainPct: 2, craftSpeedPct: 2, gatherSpeedPct: 1 } },
  {
    tier: 5,
    minFame: 1800,
    name: "诗与远方之馆",
    stats: { goldGainPct: 3, xpGainPct: 2, craftSpeedPct: 2, gatherSpeedPct: 2, bonusHp: 30 },
  },
];

export interface ChronicleMetricDef {
  id: ChronicleMetricId;
  name: string;
  /** 读数来源（存档里已有的真实记录）。 */
  source: string;
}

export const CHRONICLE_METRICS: readonly ChronicleMetricDef[] = [
  { id: "boss_kinds", name: "讨伐过的首领种类", source: "生涯击杀统计" },
  { id: "boss_kills", name: "累计讨伐首领", source: "生涯击杀统计" },
  { id: "relic_surveys", name: "遗迹勘探次数", source: "星界遗迹勘探队" },
  { id: "curator_rank", name: "勘探队等阶", source: "星界遗迹勘探队" },
  { id: "caravan_runs", name: "商队远征完成", source: "远征商队" },
  { id: "derby_trophies", name: "垂钓大赛奖杯", source: "港湾垂钓大赛" },
  { id: "derby_best_tier", name: "最高奖杯段位", source: "港湾垂钓大赛" },
  { id: "aquarium_species", name: "水族馆收藏鱼种", source: "海港水族馆" },
  { id: "academy_graduations", name: "学院结业课程", source: "冒险者学院" },
  { id: "academy_credits", name: "学院四系总学分", source: "冒险者学院" },
  { id: "festival_keepsakes", name: "四季纪念章", source: "四季节庆" },
  { id: "arena_best_rung", name: "竞技场最高梯级", source: "天空竞技场" },
  { id: "arena_wins", name: "竞技场生涯胜场", source: "天空竞技场" },
  { id: "arena_titles", name: "赛季称号", source: "天空竞技场" },
  { id: "beasts_tamed", name: "已驯服契约魔兽", source: "契约魔兽牧场" },
  { id: "beast_top_level", name: "魔兽最高等级", source: "契约魔兽牧场" },
  { id: "ranch_bond_levels", name: "牧场羁绊等级之和", source: "契约魔兽牧场" },
  { id: "chapters_inscribed", name: "已编撰的前六卷", source: "冒险者编年史" },
  { id: "tavern_fame", name: "酒馆名望", source: "吟游诗人酒馆" },
  { id: "prestige_count", name: "转生次数", source: "转生" },
];

export interface ChronicleEntryDef {
  metric: ChronicleMetricId;
  target: number;
  label: string;
}

export interface ChronicleChapterDef {
  id: ChronicleChapterId;
  /** 卷名。 */
  name: string;
  /** 编撰后解锁的称号。 */
  title: string;
  description: string;
  /** 本卷收录的三条真实里程碑（全部达成才能编撰）。 */
  entries: readonly ChronicleEntryDef[];
  /** 编撰后的小幅永久加成。 */
  stats: TavernChronicleStats;
}

export const CHRONICLE_CHAPTERS: readonly ChronicleChapterDef[] = [
  {
    id: "slayer_saga",
    name: "第一卷 · 首领讨伐录",
    title: "首领讨伐者",
    description: "从森林管家到更深处的霸主，每一次讨伐都写进卷首。",
    entries: [
      { metric: "boss_kinds", target: 1, label: "初次讨伐首领" },
      { metric: "boss_kinds", target: 4, label: "讨伐四种首领" },
      { metric: "boss_kills", target: 30, label: "累计讨伐首领 30 次" },
    ],
    stats: { bonusAtk: 6, bonusHp: 30 },
  },
  {
    id: "expedition_journal",
    name: "第二卷 · 星界远征志",
    title: "星界远征家",
    description: "遗迹深处的勘探与商队万里的远征，记下每一段旅程。",
    entries: [
      { metric: "relic_surveys", target: 5, label: "遗迹勘探 5 次" },
      { metric: "curator_rank", target: 2, label: "勘探队晋升第 2 阶" },
      { metric: "caravan_runs", target: 5, label: "商队远征 5 趟" },
    ],
    stats: { gatherSpeedPct: 2, gatherEfficiencyPct: 1 },
  },
  {
    id: "harbor_log",
    name: "第三卷 · 港湾垂钓记",
    title: "港湾钓客",
    description: "垂钓大赛的奖杯与水族馆的鳞光，港湾的风也有了名字。",
    entries: [
      { metric: "derby_trophies", target: 1, label: "赢得垂钓大赛奖杯" },
      { metric: "derby_best_tier", target: 2, label: "捧回白银及以上奖杯" },
      { metric: "aquarium_species", target: 6, label: "水族馆收藏 6 种鱼" },
    ],
    stats: { gatherEfficiencyPct: 2, goldGainPct: 1 },
  },
  {
    id: "academy_annals",
    name: "第四卷 · 学院进修录",
    title: "博学贤者",
    description: "学院的课桌与四季的节庆，学问与欢笑一并装订成册。",
    entries: [
      { metric: "academy_graduations", target: 2, label: "学院结业 2 门课程" },
      { metric: "academy_credits", target: 60, label: "四系总学分 60" },
      { metric: "festival_keepsakes", target: 1, label: "收藏一枚四季纪念章" },
    ],
    stats: { xpGainPct: 2, craftSpeedPct: 1 },
  },
  {
    id: "arena_epic",
    name: "第五卷 · 天空竞技史",
    title: "竞技场名宿",
    description: "云端擂台上的每一次胜负，都由诗人谱成战歌。",
    entries: [
      { metric: "arena_best_rung", target: 5, label: "竞技场攀至第 5 梯" },
      { metric: "arena_wins", target: 10, label: "竞技场生涯 10 胜" },
      { metric: "arena_titles", target: 1, label: "获得一枚赛季称号" },
    ],
    stats: { bonusDef: 4, bonusHp: 40 },
  },
  {
    id: "beast_bond",
    name: "第六卷 · 契约魔兽传",
    title: "万兽之友",
    description: "与契约魔兽同行的日子，被写成牧场边的童谣。",
    entries: [
      { metric: "beasts_tamed", target: 2, label: "驯服 2 只契约魔兽" },
      { metric: "beast_top_level", target: 5, label: "培养一只 Lv.5 魔兽" },
      { metric: "ranch_bond_levels", target: 24, label: "牧场羁绊等级之和 24" },
    ],
    stats: { craftSpeedPct: 2, craftEfficiencyPct: 1 },
  },
  {
    id: "legend_finale",
    name: "终章 · 异世界传奇",
    title: "异世界传奇",
    description: "当六卷俱全、酒馆名满王都、又踏上转生之路，传奇才算落笔。",
    entries: [
      { metric: "chapters_inscribed", target: 6, label: "编撰前六卷" },
      { metric: "tavern_fame", target: 500, label: "酒馆名望 500（名满王都）" },
      { metric: "prestige_count", target: 1, label: "完成一次转生" },
    ],
    stats: { goldGainPct: 2, xpGainPct: 2, bonusAtk: 8, bonusHp: 60 },
  },
];

export function isValidTavernVisitorId(id: unknown): id is TavernVisitorId {
  return typeof id === "string" && (TAVERN_VISITOR_IDS as readonly string[]).includes(id);
}

export function isValidTavernBalladId(id: unknown): id is TavernBalladId {
  return typeof id === "string" && (TAVERN_BALLAD_IDS as readonly string[]).includes(id);
}

export function isValidChronicleChapterId(id: unknown): id is ChronicleChapterId {
  return typeof id === "string" && (CHRONICLE_CHAPTER_IDS as readonly string[]).includes(id);
}

function tavernCleanCount(v: unknown, cap: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.min(cap, Math.floor(n)) : 0;
}

function tavernObj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

export function getTavernVisitorDef(id: TavernVisitorId): TavernVisitorDef {
  return TAVERN_VISITORS.find((v) => v.id === id) || TAVERN_VISITORS[0];
}

export function getTavernBalladDef(id: TavernBalladId): TavernBalladDef {
  return TAVERN_BALLADS.find((b) => b.id === id) || TAVERN_BALLADS[0];
}

export function getChronicleChapterDef(id: ChronicleChapterId): ChronicleChapterDef {
  return CHRONICLE_CHAPTERS.find((c) => c.id === id) || CHRONICLE_CHAPTERS[0];
}

/** 菜单条目（不在菜单上的物品返回 null）。 */
export function getTavernMenuItem(itemId: unknown): TavernMenuItemDef | null {
  return TAVERN_MENU.find((m) => m.itemId === itemId) || null;
}

/** 东八区日序号（1970-01-01 东八区 = 0）。 */
export function tavernDayIndex(now: Date | number): number {
  const ms = typeof now === "number" ? now : now.getTime();
  return Math.floor((ms + TAVERN_TZ_OFFSET_MINUTES * 60_000) / 86_400_000);
}

/** 日序号 → 东八区日期键 YYYY-MM-DD。 */
export function tavernDayKeyFromIndex(index: number): string {
  return new Date(Math.floor(index) * 86_400_000).toISOString().slice(0, 10);
}

export function tavernDayKey(now: Date | number): string {
  return tavernDayKeyFromIndex(tavernDayIndex(now));
}

/** 日期键 → 日序号；非法键返回 null。 */
export function tavernDayIndexFromKey(key: unknown): number | null {
  if (typeof key !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const ms = Date.parse(`${key}T00:00:00.000Z`);
  if (!Number.isFinite(ms)) return null;
  const index = Math.floor(ms / 86_400_000);
  return tavernDayKeyFromIndex(index) === key ? index : null;
}

/** 当前东八区日结束（次日 0 点）的 UTC 毫秒时间戳。 */
export function tavernDayEndsAtMs(now: Date | number): number {
  return (tavernDayIndex(now) + 1) * 86_400_000 - TAVERN_TZ_OFFSET_MINUTES * 60_000;
}

/** 32 位整数混合哈希（来访名单与点单的唯一随机源，纯确定性）。 */
export function tavernHash(a: number, b: number): number {
  let h = (Math.imul((a | 0) ^ 0x2545f491, 0x9e3779b1) + Math.imul((b | 0) + 0x61c88647, 0x85ebca77)) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d) >>> 0;
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39) >>> 0;
  h ^= h >>> 15;
  return h >>> 0;
}

/** 某个东八区日来访的冒险者：以日序号哈希对 8 位常客做确定性洗牌，取前 4 位（同一天全服一致）。 */
export function getTavernVisitorsForDay(dayIndex: number): TavernVisitorId[] {
  const d = Number.isFinite(dayIndex) ? Math.floor(dayIndex) : 0;
  const pool = [...TAVERN_VISITOR_IDS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = tavernHash(d, 0x7a5e + i) % (i + 1);
    const t = pool[i];
    pool[i] = pool[j];
    pool[j] = t;
  }
  return pool.slice(0, TAVERN_VISITORS_PER_DAY);
}

/** 冒险者当日的点单：从其爱吃的料理与爱喝的饮品里各确定性抽一样。 */
export function getTavernVisitorOrder(dayIndex: number, visitorId: TavernVisitorId): { dishId: string; drinkId: string } {
  const d = Number.isFinite(dayIndex) ? Math.floor(dayIndex) : 0;
  const def = getTavernVisitorDef(visitorId);
  const vi = TAVERN_VISITOR_IDS.indexOf(def.id);
  return {
    dishId: def.dishes[tavernHash(d, 0xd150 + vi) % def.dishes.length],
    drinkId: def.drinks[tavernHash(d, 0xd21c + vi) % def.drinks.length],
  };
}

/**
 * 招待计划：端上一份料理和 / 或一份饮品（至少一样）。每项基础名望来自菜单；合当日点单的那项名望 ×1.5（向下取整），
 * 两项都合点单再 +5（完美招待）。小费 = 名望 × 冒险者的每点小费。
 * ok = false：未知冒险者 / 当日未来访 / 不在菜单或种类不符 / 什么都没端。
 */
export function planTavernServe(dayIndex: number, visitorId: unknown, dishId: unknown, drinkId: unknown) {
  const d = Number.isFinite(dayIndex) ? Math.floor(dayIndex) : 0;
  const validVisitor = isValidTavernVisitorId(visitorId);
  const visiting = validVisitor && getTavernVisitorsForDay(d).includes(visitorId);
  const order = validVisitor ? getTavernVisitorOrder(d, visitorId) : null;
  const wantDish = dishId !== null && dishId !== undefined;
  const wantDrink = drinkId !== null && drinkId !== undefined;
  const dish = wantDish ? getTavernMenuItem(dishId) : null;
  const drink = wantDrink ? getTavernMenuItem(drinkId) : null;
  const dishOk = !wantDish || (dish !== null && dish.kind === "dish");
  const drinkOk = !wantDrink || (drink !== null && drink.kind === "drink");
  const ok = validVisitor && visiting && dishOk && drinkOk && (wantDish || wantDrink);
  const matchedDish = ok && dish !== null && order !== null && dish.itemId === order.dishId;
  const matchedDrink = ok && drink !== null && order !== null && drink.itemId === order.drinkId;
  const dishFame = ok && dish ? Math.floor((dish.fame * (matchedDish ? TAVERN_ORDER_MATCH_PCT : 100)) / 100) : 0;
  const drinkFame = ok && drink ? Math.floor((drink.fame * (matchedDrink ? TAVERN_ORDER_MATCH_PCT : 100)) / 100) : 0;
  const perfect = matchedDish && matchedDrink;
  const fame = ok ? dishFame + drinkFame + (perfect ? TAVERN_PERFECT_BONUS_FAME : 0) : 0;
  const tipGold = ok && validVisitor ? fame * getTavernVisitorDef(visitorId).tipPerFame : 0;
  const verdict: "perfect" | "pleased" | "fine" | null = !ok ? null : perfect ? "perfect" : matchedDish || matchedDrink ? "pleased" : "fine";
  return {
    ok,
    visiting,
    order,
    dishId: ok && dish ? dish.itemId : null,
    drinkId: ok && drink ? drink.itemId : null,
    dishFame,
    drinkFame,
    matchedDish,
    matchedDrink,
    perfect,
    fame,
    tipGold,
    verdict,
  };
}

/** 酒馆名望等级：累计名望决定等级、永久加成与可点唱的诗篇（含下一等级进度）。 */
export function getTavernFameTier(fame: unknown) {
  const n = tavernCleanCount(fame, CHRONICLE_METRIC_CAP);
  let current = TAVERN_FAME_TIERS[0];
  let next: TavernFameTierDef | null = null;
  for (let i = 0; i < TAVERN_FAME_TIERS.length; i++) {
    if (n >= TAVERN_FAME_TIERS[i].minFame) {
      current = TAVERN_FAME_TIERS[i];
      next = TAVERN_FAME_TIERS[i + 1] ?? null;
    }
  }
  const progressPct = next
    ? Math.min(100, Math.max(0, Math.round(((n - current.minFame) / Math.max(1, next.minFame - current.minFame)) * 100)))
    : 100;
  return { fame: n, current, next, progressPct };
}

export type MinimalTavernHolder = {
  bardTavern?: {
    fame?: unknown;
    activeBallad?: unknown;
  } | null;
  adventurerChronicle?: {
    inscribed?: unknown;
    equippedTitle?: unknown;
  } | null;
} | null;

/**
 * 正在演唱的诗篇：结束时刻恒为 startedAt + 诗篇时长（不信任存档里的 endsAt）；
 * 只有 startedAt <= now < 结束时刻 时增益生效（离线模拟按结算时刻 now 判定）。
 */
export function getTavernBalladEffect(holder: MinimalTavernHolder | undefined, now: Date | number) {
  const ab = tavernObj(tavernObj(holder?.bardTavern).activeBallad);
  const nowMs = typeof now === "number" ? now : now.getTime();
  const startedMs = typeof ab.startedAt === "string" ? Date.parse(ab.startedAt) : Number.NaN;
  if (!isValidTavernBalladId(ab.balladId) || !Number.isFinite(startedMs)) {
    return { balladId: null as TavernBalladId | null, active: false, startedAtMs: 0, endsAtMs: 0, remainingMs: 0, stats: {} as TavernChronicleStats };
  }
  const def = getTavernBalladDef(ab.balladId);
  const endsAtMs = startedMs + def.durationMin * 60_000;
  const active = nowMs >= startedMs && nowMs < endsAtMs;
  const stats: TavernChronicleStats = {};
  if (active) for (const k of TAVERN_STAT_KEYS) if (def.stats[k]) stats[k] = def.stats[k];
  return { balladId: def.id as TavernBalladId | null, active, startedAtMs: startedMs, endsAtMs, remainingMs: active ? endsAtMs - nowMs : 0, stats };
}

/** 已编撰章节（只认合法章节 id，去重，按章节表顺序）。 */
export function cleanChronicleInscribed(raw: unknown): ChronicleChapterId[] {
  const list = Array.isArray(raw) ? (raw as unknown[]) : [];
  return CHRONICLE_CHAPTER_IDS.filter((id) => list.includes(id));
}

/** 从存档里已有的真实记录读出编年史里程碑（不新增任何计数器；脏数据按 0 处理）。 */
export function getChronicleMetrics(holder: unknown): Record<ChronicleMetricId, number> {
  const h = tavernObj(holder);
  const n = (v: unknown) => tavernCleanCount(v, CHRONICLE_METRIC_CAP);
  const stats = tavernObj(h.stats);
  const kills = tavernObj(stats.killsByMonster);
  let bossKinds = 0;
  let bossKillSum = 0;
  for (const id of CHRONICLE_BOSS_IDS) {
    const k = n(kills[id]);
    if (k > 0) bossKinds += 1;
    bossKillSum += k;
  }
  const relics = tavernObj(h.astralRelics);
  const trophies = tavernObj(tavernObj(h.harborDerby).trophies);
  let derbyTrophies = 0;
  let derbyBestTier = 0;
  CHRONICLE_TROPHY_TIERS.forEach((t, i) => {
    const c = n(trophies[t]);
    derbyTrophies += c;
    if (c > 0) derbyBestTier = i + 1;
  });
  const species = tavernObj(tavernObj(h.harborAquarium).species);
  let aquariumSpecies = 0;
  for (const id of CHRONICLE_AQUARIUM_SPECIES) if (n(tavernObj(species[id]).count) > 0) aquariumSpecies += 1;
  const academy = tavernObj(h.adventurerAcademy);
  const credits = tavernObj(academy.credits);
  let academyCredits = 0;
  for (const dept of CHRONICLE_ACADEMY_DEPTS) academyCredits += n(credits[dept]);
  const keepsakesRaw = tavernObj(h.festivalCalendar).keepsakes;
  const keepsakes = Array.isArray(keepsakesRaw) ? (keepsakesRaw as unknown[]) : [];
  const arena = tavernObj(h.skyArena);
  const titlesRaw = Array.isArray(arena.titles) ? (arena.titles as unknown[]) : [];
  const levels = cleanBeastLevels(tavernObj(h.beastRanch).beasts);
  let beastsTamed = 0;
  let beastTopLevel = 0;
  let bondLevels = 0;
  for (const lv of Object.values(levels)) {
    if (lv > 0) beastsTamed += 1;
    beastTopLevel = Math.max(beastTopLevel, lv);
    bondLevels += lv;
  }
  const inscribed = cleanChronicleInscribed(tavernObj(h.adventurerChronicle).inscribed);
  return {
    boss_kinds: bossKinds,
    boss_kills: Math.min(CHRONICLE_METRIC_CAP, Math.max(n(stats.totalBossKills), bossKillSum)),
    relic_surveys: n(relics.totalSurveys),
    curator_rank: n(relics.curatorRank),
    caravan_runs: n(tavernObj(h.caravanTrade).totalRunsCompleted),
    derby_trophies: Math.min(CHRONICLE_METRIC_CAP, derbyTrophies),
    derby_best_tier: derbyBestTier,
    aquarium_species: aquariumSpecies,
    academy_graduations: n(academy.totalGraduations),
    academy_credits: Math.min(CHRONICLE_METRIC_CAP, academyCredits),
    festival_keepsakes: CHRONICLE_FESTIVAL_SEASONS.filter((s) => keepsakes.includes(s)).length,
    arena_best_rung: n(arena.bestRung),
    arena_wins: n(arena.totalWins),
    arena_titles: CHRONICLE_ARENA_DIVISIONS.filter((t) => titlesRaw.includes(t)).length,
    beasts_tamed: beastsTamed,
    beast_top_level: beastTopLevel,
    ranch_bond_levels: bondLevels,
    chapters_inscribed: inscribed.filter((id) => id !== "legend_finale").length,
    tavern_fame: n(tavernObj(h.bardTavern).fame),
    prestige_count: n(tavernObj(h.prestige).count),
  };
}

/** 编年史汇编：逐卷对照真实里程碑（每条 value / target / done），三条全部达成即可编撰；已编撰的卷永久保留。 */
export function getChronicleProgress(holder: unknown) {
  const metrics = getChronicleMetrics(holder);
  const inscribed = cleanChronicleInscribed(tavernObj(tavernObj(holder).adventurerChronicle).inscribed);
  let entriesDone = 0;
  let entriesTotal = 0;
  let completeCount = 0;
  const chapters = CHRONICLE_CHAPTERS.map((c) => {
    const entries = c.entries.map((e) => {
      const value = metrics[e.metric];
      const done = value >= e.target;
      entriesTotal += 1;
      if (done) entriesDone += 1;
      return {
        metric: e.metric,
        label: e.label,
        target: e.target,
        value,
        done,
        pct: Math.min(100, Math.floor((Math.min(value, e.target) * 100) / Math.max(1, e.target))),
      };
    });
    const complete = entries.every((e) => e.done);
    if (complete) completeCount += 1;
    const isInscribed = inscribed.includes(c.id);
    return { id: c.id, entries, complete, inscribed: isInscribed, canInscribe: complete && !isInscribed };
  });
  return { metrics, chapters, inscribed, inscribedCount: inscribed.length, completeCount, entriesDone, entriesTotal };
}

export interface TavernChronicleBonuses {
  fame: number;
  fameTier: number;
  fameTierName: string;
  fameStats: TavernChronicleStats;
  chaptersInscribed: number;
  chronicleStats: TavernChronicleStats;
  /** 佩戴的编年史称号（章节 id；必须已编撰）。 */
  equippedTitle: ChronicleChapterId | null;
  gatherSpeedPct: number;
  craftSpeedPct: number;
  gatherEfficiencyPct: number;
  craftEfficiencyPct: number;
  xpGainPct: number;
  goldGainPct: number;
  bonusAtk: number;
  bonusDef: number;
  bonusHp: number;
}

/** 吟游诗人酒馆与冒险者编年史的永久加成 = 酒馆名望等级 + 全部已编撰章节（限时诗篇另由 getTavernBalladEffect 按 now 计算）。 */
export function getTavernChronicleBonuses(holder?: MinimalTavernHolder): TavernChronicleBonuses {
  const tier = getTavernFameTier(tavernObj(holder?.bardTavern).fame);
  const ch = tavernObj(holder?.adventurerChronicle);
  const inscribed = cleanChronicleInscribed(ch.inscribed);
  const fameStats: TavernChronicleStats = {};
  const chronicleStats: TavernChronicleStats = {};
  const sum: Required<TavernChronicleStats> = {
    gatherSpeedPct: 0,
    craftSpeedPct: 0,
    gatherEfficiencyPct: 0,
    craftEfficiencyPct: 0,
    xpGainPct: 0,
    goldGainPct: 0,
    bonusAtk: 0,
    bonusDef: 0,
    bonusHp: 0,
  };
  for (const k of TAVERN_STAT_KEYS) {
    const f = tier.current.stats[k] || 0;
    let c = 0;
    for (const id of inscribed) c += getChronicleChapterDef(id).stats[k] || 0;
    if (f) fameStats[k] = f;
    if (c) chronicleStats[k] = c;
    sum[k] = f + c;
  }
  const equippedTitle = isValidChronicleChapterId(ch.equippedTitle) && inscribed.includes(ch.equippedTitle) ? ch.equippedTitle : null;
  return {
    fame: tier.fame,
    fameTier: tier.current.tier,
    fameTierName: tier.current.name,
    fameStats,
    chaptersInscribed: inscribed.length,
    chronicleStats,
    equippedTitle,
    ...sum,
  };
}

/* ---- 以上为 WL-15 core ---- */

/** 酒馆 / 编年史 / 诗篇加成 → 面板展示用短句（只列非零项）。 */
export function formatTavernStats(s: TavernChronicleStats | null | undefined): string[] {
  if (!s) return [];
  const out: string[] = [];
  if (s.gatherSpeedPct) out.push(`采集速度 +${s.gatherSpeedPct}%`);
  if (s.gatherEfficiencyPct) out.push(`采集产出 +${s.gatherEfficiencyPct}%`);
  if (s.craftSpeedPct) out.push(`制作速度 +${s.craftSpeedPct}%`);
  if (s.craftEfficiencyPct) out.push(`制作产出 +${s.craftEfficiencyPct}%`);
  if (s.xpGainPct) out.push(`经验 +${s.xpGainPct}%`);
  if (s.goldGainPct) out.push(`金币收益 +${s.goldGainPct}%`);
  if (s.bonusAtk) out.push(`攻击 +${s.bonusAtk}`);
  if (s.bonusDef) out.push(`防御 +${s.bonusDef}`);
  if (s.bonusHp) out.push(`生命 +${s.bonusHp}`);
  return out;
}

/** 招待评价 → 文案。 */
export function formatTavernVerdict(verdict: "perfect" | "pleased" | "fine" | null | undefined): string {
  if (verdict === "perfect") return "完美招待";
  if (verdict === "pleased") return "合点单";
  if (verdict === "fine") return "尚可";
  return "";
}

/** 剩余毫秒 → 「12 分 30 秒」/「45 秒」。 */
export function formatBalladRemaining(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m} 分 ${String(r).padStart(2, "0")} 秒` : `${r} 秒`;
}
