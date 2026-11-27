// 进阶进度 · 冒险者学院进修课程 & 四季节庆活动日历 (WL-12)
// 从 progression2.ts 原样拆出；对外一律从 "../progression2" 引用。

import type {
  EnhancedContentPack,
  EnhancedPlayerState,
  AcademyDepartmentId,
  AcademyCourseId,
  AcademyActiveCourse,
  AcademyGraduationRecord,
  AdventurerAcademyState,
  FestivalSeasonId,
  FestivalCommissionId,
  FestivalCommissionKind,
  FestivalShopItemId,
  FestivalShopItemKind,
  FestivalRolloverRecord,
  FestivalCalendarState,
} from "../types";
import { ensurePlayerExtensions, appendLog } from "../storage";
import { syncAchievements } from "../progression";
import { addReputation } from "./reputation";

/* ============================ 冒险者学院进修课程 & 四季节庆活动日历 (WL-12) ============================ */
// 前端 frontend/src/gameplay/academyFestival.ts 逐表逐式 1:1 镜像（scripts/academy-festival-parity.test.ts 守护，
// 「WL-12 core」区段两端逐字一致）。
// - 冒险者学院进修课程（转生永久保留）：以金币 + 真实生活职业成品报名限时课程（进修席位 1，同一时间只修 1 门）；
//   课程到点后按显式 now 结业发放所属学系学分。四系学分阈值解锁跨职业永久被动（采集速度 / 制作速度 /
//   攻防血 / 金币收益），四系学分总和晋阶学院徽章（经验、金币与全局速度），接入 getActionRates 与战斗真实公式。
// - 四季节庆活动日历：按东八区日期划分春耕 / 夏渔 / 秋收 / 冬猎四季，每季 4 份限定委托（交付真实成品或本季真实
//   行动 / 击杀）发放本季节庆代币，节庆商店兑换金币、季节礼包、学院进修推荐信与四季纪念章（永久）。
//   翻季只在显式传入 now（指令 / 视图时钟）时发生；无参 ensure 只做净化（沿用 WL-10 / WL-11 约定）。

/* ---- 以下为与后端逐字对称的表与纯函数（WL-12 core） ---- */

export const ACADEMY_DEPARTMENT_IDS: readonly AcademyDepartmentId[] = ["gathering", "crafting", "tactics", "commerce"];

export const ACADEMY_COURSE_IDS: readonly AcademyCourseId[] = [
  "field_survey",
  "spirit_botany",
  "forge_practicum",
  "master_artisan",
  "squire_drills",
  "dragon_tactics",
  "ledger_basics",
  "guild_economics",
];

export const FESTIVAL_SEASON_IDS: readonly FestivalSeasonId[] = ["spring", "summer", "autumn", "winter"];

export const FESTIVAL_COMMISSION_IDS: readonly FestivalCommissionId[] = [
  "spring_rice_offering",
  "spring_planting_drive",
  "spring_timber_frames",
  "spring_loom_ribbons",
  "summer_fish_feast",
  "summer_net_casting",
  "summer_cool_drinks",
  "summer_seafood_platter",
  "autumn_bread_basket",
  "autumn_livestock_fair",
  "autumn_honey_jars",
  "autumn_vegetable_stew",
  "winter_hunt_patrol",
  "winter_hearty_stew",
  "winter_healing_supply",
  "winter_iron_chains",
];

export const FESTIVAL_SHOP_ITEM_IDS: readonly FestivalShopItemId[] = [
  "festival_gold_pouch",
  "spring_seed_bundle",
  "spring_academy_letter",
  "spring_keepsake",
  "summer_catch_bundle",
  "summer_academy_letter",
  "summer_keepsake",
  "autumn_harvest_bundle",
  "autumn_academy_letter",
  "autumn_keepsake",
  "winter_hunt_bundle",
  "winter_academy_letter",
  "winter_keepsake",
];

/** 进修席位：同一时间只能修读 1 门课程，结业（到点且以显式 now 结算）后才能报名下一门。 */
export const ACADEMY_COURSE_SLOTS = 1;
/** 单系学分上限（防脏档溢出）。 */
export const ACADEMY_CREDIT_CAP = 9999;
/** 节庆季节按东八区日期划分：3~5 月春耕节、6~8 月夏渔节、9~11 月秋收节、12~2 月冬猎节。 */
export const FESTIVAL_TZ_OFFSET_MINUTES = 480;
export const FESTIVAL_TOKEN_CAP = 999;
/** 翻季时未花完的本季节庆代币按 1 枚 = 20 金币折算，随后清零。 */
export const FESTIVAL_TOKEN_GOLD_RATE = 20;

export interface AcademyStats {
  gatherSpeedPct?: number;
  craftSpeedPct?: number;
  xpGainPct?: number;
  goldGainPct?: number;
  bonusAtk?: number;
  bonusDef?: number;
  bonusHp?: number;
}

export const ACADEMY_STAT_KEYS: readonly (keyof AcademyStats)[] = [
  "gatherSpeedPct",
  "craftSpeedPct",
  "xpGainPct",
  "goldGainPct",
  "bonusAtk",
  "bonusDef",
  "bonusHp",
];

export interface AcademyDepartmentTierDef {
  tier: 0 | 1 | 2 | 3 | 4;
  minCredits: number;
  title: string;
  stats: AcademyStats;
}

export interface AcademyDepartmentDef {
  id: AcademyDepartmentId;
  name: string;
  passiveName: string;
  subtitle: string;
  description: string;
  /** 该季节庆商店的「进修推荐信」为本系增加学分。 */
  festivalSeason: FestivalSeasonId;
  tiers: readonly AcademyDepartmentTierDef[];
}

export const ACADEMY_DEPARTMENTS: readonly AcademyDepartmentDef[] = [
  {
    id: "gathering",
    name: "博物采集系",
    passiveName: "野外通识",
    subtitle: "伐木 · 挖矿 · 种植 · 钓鱼 · 采集 · 水晶",
    description: "教授所有采集职业通用的野外知识，修满学分后全部采集行动永久提速。",
    festivalSeason: "spring",
    tiers: [
      { tier: 0, minCredits: 0, title: "未修读", stats: {} },
      { tier: 1, minCredits: 8, title: "采集初阶", stats: { gatherSpeedPct: 3 } },
      { tier: 2, minCredits: 20, title: "采集中阶", stats: { gatherSpeedPct: 6 } },
      { tier: 3, minCredits: 40, title: "采集高阶", stats: { gatherSpeedPct: 10 } },
      { tier: 4, minCredits: 70, title: "博物大师", stats: { gatherSpeedPct: 15 } },
    ],
  },
  {
    id: "crafting",
    name: "匠艺工坊系",
    passiveName: "百工通识",
    subtitle: "木工 · 锻造 · 烹饪 · 缝纫 · 炼金 · 畜牧",
    description: "汇集各工坊的手艺心得，修满学分后全部制作行动永久提速。",
    festivalSeason: "autumn",
    tiers: [
      { tier: 0, minCredits: 0, title: "未修读", stats: {} },
      { tier: 1, minCredits: 8, title: "工坊初阶", stats: { craftSpeedPct: 3 } },
      { tier: 2, minCredits: 20, title: "工坊中阶", stats: { craftSpeedPct: 6 } },
      { tier: 3, minCredits: 40, title: "工坊高阶", stats: { craftSpeedPct: 10 } },
      { tier: 4, minCredits: 70, title: "匠艺大师", stats: { craftSpeedPct: 15 } },
    ],
  },
  {
    id: "tactics",
    name: "骑士战术系",
    passiveName: "战阵通识",
    subtitle: "近战 · 远程 · 魔法 · 防御",
    description: "由退役骑士讲授的战阵课程，修满学分后永久提升攻击、防御与生命上限。",
    festivalSeason: "winter",
    tiers: [
      { tier: 0, minCredits: 0, title: "未修读", stats: {} },
      { tier: 1, minCredits: 8, title: "战术初阶", stats: { bonusAtk: 4, bonusDef: 2, bonusHp: 12 } },
      { tier: 2, minCredits: 20, title: "战术中阶", stats: { bonusAtk: 9, bonusDef: 4, bonusHp: 28 } },
      { tier: 3, minCredits: 40, title: "战术高阶", stats: { bonusAtk: 15, bonusDef: 7, bonusHp: 50 } },
      { tier: 4, minCredits: 70, title: "战术宗师", stats: { bonusAtk: 24, bonusDef: 10, bonusHp: 80 } },
    ],
  },
  {
    id: "commerce",
    name: "商会经营系",
    passiveName: "经营通识",
    subtitle: "单人战斗金币",
    description: "商会账房亲授的经营之道，修满学分后单人战斗金币永久提升。",
    festivalSeason: "summer",
    tiers: [
      { tier: 0, minCredits: 0, title: "未修读", stats: {} },
      { tier: 1, minCredits: 8, title: "经营初阶", stats: { goldGainPct: 2 } },
      { tier: 2, minCredits: 20, title: "经营中阶", stats: { goldGainPct: 4 } },
      { tier: 3, minCredits: 40, title: "经营高阶", stats: { goldGainPct: 7 } },
      { tier: 4, minCredits: 70, title: "商会大师", stats: { goldGainPct: 10 } },
    ],
  },
];

export interface AcademyBadgeDef {
  tier: 0 | 1 | 2 | 3 | 4;
  minCredits: number;
  name: string;
  iconId: string;
  stats: AcademyStats;
}

/** 学院徽章：按四系学分总和晋阶，徽章加成与各系被动叠加。 */
export const ACADEMY_BADGES: readonly AcademyBadgeDef[] = [
  { tier: 0, minCredits: 0, name: "旁听新生", iconId: "academy_crest", stats: {} },
  { tier: 1, minCredits: 12, name: "铜叶学徒徽章", iconId: "academy_crest", stats: { xpGainPct: 2 } },
  { tier: 2, minCredits: 36, name: "银穗进修徽章", iconId: "academy_crest", stats: { xpGainPct: 4 } },
  { tier: 3, minCredits: 80, name: "金冠学士徽章", iconId: "graduation_cap", stats: { xpGainPct: 6, goldGainPct: 2 } },
  {
    tier: 4,
    minCredits: 150,
    name: "星辉院士徽章",
    iconId: "graduation_cap",
    stats: { xpGainPct: 8, goldGainPct: 3, gatherSpeedPct: 3, craftSpeedPct: 3 },
  },
];

export interface AcademyCourseDef {
  id: AcademyCourseId;
  department: AcademyDepartmentId;
  level: "basic" | "advanced";
  name: string;
  description: string;
  durationMinutes: number;
  goldCost: number;
  /** 报名所需的真实生活职业成品（报名时一次性扣除）。 */
  itemCost: Readonly<Record<string, number>>;
  credits: number;
  minBadgeTier: number;
}

export const ACADEMY_COURSES: readonly AcademyCourseDef[] = [
  {
    id: "field_survey",
    department: "gathering",
    level: "basic",
    name: "野外博物考察",
    description: "带上木板搭营、便当充饥，跟随讲师走遍森林与矿脉辨识资源。",
    durationMinutes: 30,
    goldCost: 200,
    itemCost: { lumber_1: 4, food_simple: 2 },
    credits: 4,
    minBadgeTier: 0,
  },
  {
    id: "spirit_botany",
    department: "gathering",
    level: "advanced",
    name: "灵植栽培研修",
    description: "以灵谷饭款待园丁、亚麻线扎好苗架，研习灵植与稀有作物的采收时机。",
    durationMinutes: 120,
    goldCost: 900,
    itemCost: { food_grain_meal: 6, yarn_2: 3 },
    credits: 11,
    minBadgeTier: 1,
  },
  {
    id: "forge_practicum",
    department: "crafting",
    level: "basic",
    name: "锻冶基础实训",
    description: "交上铜锭与木板做练习件，在工坊导师指点下打磨每一道工序。",
    durationMinutes: 30,
    goldCost: 200,
    itemCost: { ingot_1: 4, lumber_1: 2 },
    credits: 4,
    minBadgeTier: 0,
  },
  {
    id: "master_artisan",
    department: "crafting",
    level: "advanced",
    name: "宗师匠艺研讨",
    description: "以银锭与丝线制作研讨样品，向各工坊宗师请教提速窍门。",
    durationMinutes: 120,
    goldCost: 900,
    itemCost: { ingot_3: 3, yarn_3: 2 },
    credits: 11,
    minBadgeTier: 1,
  },
  {
    id: "squire_drills",
    department: "tactics",
    level: "basic",
    name: "侍从战技操练",
    description: "备好生命药水与料理，在演武场上跟随骑士完成整套操练。",
    durationMinutes: 45,
    goldCost: 300,
    itemCost: { potion_hp_t1: 3, food_simple: 3 },
    credits: 5,
    minBadgeTier: 0,
  },
  {
    id: "dragon_tactics",
    department: "tactics",
    level: "advanced",
    name: "屠龙战术推演",
    description: "在沙盘上推演屠龙战役，高级药水与丰盛炖菜是漫长推演的补给。",
    durationMinutes: 180,
    goldCost: 1400,
    itemCost: { potion_hp_t3: 2, food_hearty_stew: 2 },
    credits: 14,
    minBadgeTier: 2,
  },
  {
    id: "ledger_basics",
    department: "commerce",
    level: "basic",
    name: "商会记账入门",
    description: "用灵面包与提神饮料招待账房先生，学会一本清清楚楚的流水账。",
    durationMinutes: 30,
    goldCost: 400,
    itemCost: { bread: 3, drink_basic: 2 },
    credits: 4,
    minBadgeTier: 0,
  },
  {
    id: "guild_economics",
    department: "commerce",
    level: "advanced",
    name: "公会经济学",
    description: "以精致料理与染布布置商会沙龙，研讨行会定价与远途贸易之道。",
    durationMinutes: 240,
    goldCost: 2000,
    itemCost: { food_fine: 3, dyed_cloth: 2 },
    credits: 16,
    minBadgeTier: 2,
  },
];

export interface FestivalSeasonDef {
  id: FestivalSeasonId;
  name: string;
  shortName: string;
  months: string;
  subtitle: string;
  description: string;
  tokenName: string;
  keepsakeName: string;
  keepsakeStats: AcademyStats;
}

export const FESTIVAL_SEASONS: readonly FestivalSeasonDef[] = [
  {
    id: "spring",
    name: "春耕节",
    shortName: "春耕",
    months: "3~5 月",
    subtitle: "播种 · 纺线 · 修缮农具",
    description: "冰雪消融，公会号召冒险者下田播种、搭建苗架，春耕委托以灵谷饭、种植与纺线为主。",
    tokenName: "青穗花笺",
    keepsakeName: "春耕青穗纪念章",
    keepsakeStats: { gatherSpeedPct: 2 },
  },
  {
    id: "summer",
    name: "夏渔节",
    shortName: "夏渔",
    months: "6~8 月",
    subtitle: "出海 · 鱼宴 · 冰饮",
    description: "港湾渔汛最旺的季节，夏渔委托请冒险者出海撒网、置办鱼宴与消暑冰饮。",
    tokenName: "海贝渔符",
    keepsakeName: "夏渔海贝纪念章",
    keepsakeStats: { goldGainPct: 2 },
  },
  {
    id: "autumn",
    name: "秋收节",
    shortName: "秋收",
    months: "9~11 月",
    subtitle: "烘焙 · 畜牧 · 酿蜜",
    description: "麦浪金黄、牛羊肥壮，秋收委托收集面包、蜂蜜与时蔬炖，并举办畜牧集市。",
    tokenName: "金穗丰收券",
    keepsakeName: "秋收金穗纪念章",
    keepsakeStats: { craftSpeedPct: 2 },
  },
  {
    id: "winter",
    name: "冬猎节",
    shortName: "冬猎",
    months: "12~2 月",
    subtitle: "狩猎 · 炖菜 · 药剂",
    description: "雪原魔物南下，冬猎委托召集冒险者巡猎讨伐，并为猎队备齐炖菜、药水与铁链。",
    tokenName: "雪狼猎牌",
    keepsakeName: "冬猎雪狼纪念章",
    keepsakeStats: { bonusAtk: 5, bonusHp: 20 },
  },
];

/** 四季纪念章全部收齐（四季圆满）时额外获得的永久加成。 */
export const FESTIVAL_FULL_CYCLE_STATS: AcademyStats = { xpGainPct: 3 };

export interface FestivalCommissionDef {
  id: FestivalCommissionId;
  season: FestivalSeasonId;
  name: string;
  description: string;
  /** deliver = 交付真实成品；actions = 本季完成指定前缀的真实行动；kills = 本季累计击杀。 */
  kind: FestivalCommissionKind;
  items: Readonly<Record<string, number>>;
  actionPrefix: string | null;
  /** actions / kills 每次领取所需的本季计数（第 n 次领取需累计 n × target）。 */
  target: number;
  maxClaims: number;
  tokens: number;
  gold: number;
}

export const FESTIVAL_COMMISSIONS: readonly FestivalCommissionDef[] = [
  {
    id: "spring_rice_offering",
    season: "spring",
    name: "春耕灵谷饭供餐",
    description: "为下田的农人送上热腾腾的灵谷饭。",
    kind: "deliver",
    items: { food_grain_meal: 6 },
    actionPrefix: null,
    target: 0,
    maxClaims: 3,
    tokens: 7,
    gold: 120,
  },
  {
    id: "spring_planting_drive",
    season: "spring",
    name: "春播大会",
    description: "本季完成种植行动，帮公会田地赶在春雨前播完种。",
    kind: "actions",
    items: {},
    actionPrefix: "act_plant_",
    target: 15,
    maxClaims: 3,
    tokens: 8,
    gold: 100,
  },
  {
    id: "spring_timber_frames",
    season: "spring",
    name: "苗架木板募集",
    description: "搭建育苗架需要大量标准木板。",
    kind: "deliver",
    items: { lumber_1: 5 },
    actionPrefix: null,
    target: 0,
    maxClaims: 3,
    tokens: 6,
    gold: 100,
  },
  {
    id: "spring_loom_ribbons",
    season: "spring",
    name: "春祭彩绳编织",
    description: "用棉线编出祈愿彩绳，挂满春耕节的田埂。",
    kind: "deliver",
    items: { yarn_1: 4 },
    actionPrefix: null,
    target: 0,
    maxClaims: 3,
    tokens: 6,
    gold: 100,
  },
  {
    id: "summer_fish_feast",
    season: "summer",
    name: "渔港便当慰劳",
    description: "给出海归来的渔夫送上简单料理。",
    kind: "deliver",
    items: { food_simple: 5 },
    actionPrefix: null,
    target: 0,
    maxClaims: 3,
    tokens: 7,
    gold: 120,
  },
  {
    id: "summer_net_casting",
    season: "summer",
    name: "夏日撒网大赛",
    description: "本季完成钓鱼行动，为夏渔节鱼市备足鲜货。",
    kind: "actions",
    items: {},
    actionPrefix: "act_fish_",
    target: 15,
    maxClaims: 3,
    tokens: 8,
    gold: 100,
  },
  {
    id: "summer_cool_drinks",
    season: "summer",
    name: "消暑冰饮摊",
    description: "为节庆集市准备提神饮料。",
    kind: "deliver",
    items: { drink_basic: 3 },
    actionPrefix: null,
    target: 0,
    maxClaims: 3,
    tokens: 7,
    gold: 100,
  },
  {
    id: "summer_seafood_platter",
    season: "summer",
    name: "海鲜盛宴订单",
    description: "港务长点名要两份精致料理宴请远客。",
    kind: "deliver",
    items: { food_fine: 2 },
    actionPrefix: null,
    target: 0,
    maxClaims: 3,
    tokens: 9,
    gold: 150,
  },
  {
    id: "autumn_bread_basket",
    season: "autumn",
    name: "丰收面包篮",
    description: "装满一篮灵面包，分给参加秋收节的乡亲。",
    kind: "deliver",
    items: { bread: 6 },
    actionPrefix: null,
    target: 0,
    maxClaims: 3,
    tokens: 7,
    gold: 120,
  },
  {
    id: "autumn_livestock_fair",
    season: "autumn",
    name: "秋季畜牧集市",
    description: "本季完成畜牧养殖行动，让集市上的牛羊鸡蜂膘肥体壮。",
    kind: "actions",
    items: {},
    actionPrefix: "act_raise_",
    target: 15,
    maxClaims: 3,
    tokens: 8,
    gold: 100,
  },
  {
    id: "autumn_honey_jars",
    season: "autumn",
    name: "金秋蜜罐",
    description: "收集灵蜜酿造秋收节的蜂蜜酒。",
    kind: "deliver",
    items: { honey: 4 },
    actionPrefix: null,
    target: 0,
    maxClaims: 3,
    tokens: 8,
    gold: 120,
  },
  {
    id: "autumn_vegetable_stew",
    season: "autumn",
    name: "时蔬炖菜大锅",
    description: "为秋收庆典的长桌宴准备时蔬炖。",
    kind: "deliver",
    items: { food_vegetable_stew: 3 },
    actionPrefix: null,
    target: 0,
    maxClaims: 3,
    tokens: 8,
    gold: 120,
  },
  {
    id: "winter_hunt_patrol",
    season: "winter",
    name: "雪原巡猎",
    description: "本季累计击杀魔物，护送冬猎商队穿越雪原。",
    kind: "kills",
    items: {},
    actionPrefix: null,
    target: 25,
    maxClaims: 3,
    tokens: 9,
    gold: 150,
  },
  {
    id: "winter_hearty_stew",
    season: "winter",
    name: "猎队暖身炖菜",
    description: "为冬猎队伍准备丰盛炖菜御寒。",
    kind: "deliver",
    items: { food_hearty_stew: 3 },
    actionPrefix: null,
    target: 0,
    maxClaims: 3,
    tokens: 8,
    gold: 120,
  },
  {
    id: "winter_healing_supply",
    season: "winter",
    name: "雪原急救药箱",
    description: "补齐中级生命药水，以备猎队在风雪中负伤。",
    kind: "deliver",
    items: { potion_hp_t2: 3 },
    actionPrefix: null,
    target: 0,
    maxClaims: 3,
    tokens: 7,
    gold: 100,
  },
  {
    id: "winter_iron_chains",
    season: "winter",
    name: "雪橇铁链锻造",
    description: "用铁锭为雪橇打造防滑铁链。",
    kind: "deliver",
    items: { ingot_2: 4 },
    actionPrefix: null,
    target: 0,
    maxClaims: 3,
    tokens: 6,
    gold: 100,
  },
];

export interface FestivalShopItemDef {
  id: FestivalShopItemId;
  /** null = 四季常驻；否则只在该季节庆商店上架。 */
  season: FestivalSeasonId | null;
  kind: FestivalShopItemKind;
  name: string;
  description: string;
  iconKind: "item" | "skills" | "ui";
  iconId: string;
  cost: number;
  /** 每季限购次数。 */
  limit: number;
  gold: number;
  items: Readonly<Record<string, number>>;
  credits: number;
  department: AcademyDepartmentId | null;
}

export const FESTIVAL_SHOP_ITEMS: readonly FestivalShopItemDef[] = [
  {
    id: "festival_gold_pouch",
    season: null,
    kind: "gold",
    name: "节庆金币袋",
    description: "四季常驻：把节庆代币兑换成实打实的金币。",
    iconKind: "ui",
    iconId: "gold",
    cost: 4,
    limit: 6,
    gold: 500,
    items: {},
    credits: 0,
    department: null,
  },
  {
    id: "spring_seed_bundle",
    season: "spring",
    kind: "items",
    name: "春耕灵种礼包",
    description: "灵草、灵花与灵谷各一束，春播与炼金都用得上。",
    iconKind: "item",
    iconId: "herb_farm",
    cost: 6,
    limit: 3,
    gold: 0,
    items: { herb_farm: 6, flower_spirit: 3, grain: 10 },
    credits: 0,
    department: null,
  },
  {
    id: "spring_academy_letter",
    season: "spring",
    kind: "credits",
    name: "博物系进修推荐信",
    description: "春耕节限定：冒险者学院博物采集系 +3 学分。",
    iconKind: "skills",
    iconId: "course_scroll",
    cost: 10,
    limit: 2,
    gold: 0,
    items: {},
    credits: 3,
    department: "gathering",
  },
  {
    id: "spring_keepsake",
    season: "spring",
    kind: "keepsake",
    name: "春耕青穗纪念章",
    description: "春耕节纪念章（转生永久保留）：采集速度 +2%。",
    iconKind: "skills",
    iconId: "festival_calendar",
    cost: 30,
    limit: 1,
    gold: 0,
    items: {},
    credits: 0,
    department: null,
  },
  {
    id: "summer_catch_bundle",
    season: "summer",
    kind: "items",
    name: "夏渔鲜获礼包",
    description: "深海鱼、鲜虾与海鱼，料理与鱼饵的上好原料。",
    iconKind: "item",
    iconId: "fish_deepsea",
    cost: 6,
    limit: 3,
    gold: 0,
    items: { fish_deepsea: 4, shrimp: 6, fish_sea: 6 },
    credits: 0,
    department: null,
  },
  {
    id: "summer_academy_letter",
    season: "summer",
    kind: "credits",
    name: "商会系进修推荐信",
    description: "夏渔节限定：冒险者学院商会经营系 +3 学分。",
    iconKind: "skills",
    iconId: "course_scroll",
    cost: 10,
    limit: 2,
    gold: 0,
    items: {},
    credits: 3,
    department: "commerce",
  },
  {
    id: "summer_keepsake",
    season: "summer",
    kind: "keepsake",
    name: "夏渔海贝纪念章",
    description: "夏渔节纪念章（转生永久保留）：单人战斗金币 +2%。",
    iconKind: "skills",
    iconId: "festival_calendar",
    cost: 30,
    limit: 1,
    gold: 0,
    items: {},
    credits: 0,
    department: null,
  },
  {
    id: "autumn_harvest_bundle",
    season: "autumn",
    kind: "items",
    name: "秋收丰收礼包",
    description: "灵蜜、灵面粉与灵玉米，烘焙与酿造的好材料。",
    iconKind: "item",
    iconId: "honey",
    cost: 6,
    limit: 3,
    gold: 0,
    items: { honey: 4, flour: 8, corn: 6 },
    credits: 0,
    department: null,
  },
  {
    id: "autumn_academy_letter",
    season: "autumn",
    kind: "credits",
    name: "工坊系进修推荐信",
    description: "秋收节限定：冒险者学院匠艺工坊系 +3 学分。",
    iconKind: "skills",
    iconId: "course_scroll",
    cost: 10,
    limit: 2,
    gold: 0,
    items: {},
    credits: 3,
    department: "crafting",
  },
  {
    id: "autumn_keepsake",
    season: "autumn",
    kind: "keepsake",
    name: "秋收金穗纪念章",
    description: "秋收节纪念章（转生永久保留）：制作速度 +2%。",
    iconKind: "skills",
    iconId: "festival_calendar",
    cost: 30,
    limit: 1,
    gold: 0,
    items: {},
    credits: 0,
    department: null,
  },
  {
    id: "winter_hunt_bundle",
    season: "winter",
    kind: "items",
    name: "冬猎补给礼包",
    description: "兽皮、雪兽厚皮与中级生命药水，冬季狩猎必备。",
    iconKind: "item",
    iconId: "leather_hide",
    cost: 6,
    limit: 3,
    gold: 0,
    items: { leather_hide: 3, snow_pelt: 2, potion_hp_t2: 3 },
    credits: 0,
    department: null,
  },
  {
    id: "winter_academy_letter",
    season: "winter",
    kind: "credits",
    name: "战术系进修推荐信",
    description: "冬猎节限定：冒险者学院骑士战术系 +3 学分。",
    iconKind: "skills",
    iconId: "course_scroll",
    cost: 10,
    limit: 2,
    gold: 0,
    items: {},
    credits: 3,
    department: "tactics",
  },
  {
    id: "winter_keepsake",
    season: "winter",
    kind: "keepsake",
    name: "冬猎雪狼纪念章",
    description: "冬猎节纪念章（转生永久保留）：攻击 +5、生命 +20。",
    iconKind: "skills",
    iconId: "festival_calendar",
    cost: 30,
    limit: 1,
    gold: 0,
    items: {},
    credits: 0,
    department: null,
  },
];

export function isValidAcademyDepartmentId(id: unknown): id is AcademyDepartmentId {
  return typeof id === "string" && (ACADEMY_DEPARTMENT_IDS as readonly string[]).includes(id);
}

export function isValidAcademyCourseId(id: unknown): id is AcademyCourseId {
  return typeof id === "string" && (ACADEMY_COURSE_IDS as readonly string[]).includes(id);
}

export function isValidFestivalSeasonId(id: unknown): id is FestivalSeasonId {
  return typeof id === "string" && (FESTIVAL_SEASON_IDS as readonly string[]).includes(id);
}

export function isValidFestivalCommissionId(id: unknown): id is FestivalCommissionId {
  return typeof id === "string" && (FESTIVAL_COMMISSION_IDS as readonly string[]).includes(id);
}

export function isValidFestivalShopItemId(id: unknown): id is FestivalShopItemId {
  return typeof id === "string" && (FESTIVAL_SHOP_ITEM_IDS as readonly string[]).includes(id);
}

function academyCleanCount(v: unknown, cap: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.min(cap, Math.floor(n)) : 0;
}

/** 各系学分净化：只保留四系、非负整数、单系不超过上限。 */
export function cleanAcademyCredits(raw: unknown): Record<AcademyDepartmentId, number> {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    gathering: academyCleanCount(src.gathering, ACADEMY_CREDIT_CAP),
    crafting: academyCleanCount(src.crafting, ACADEMY_CREDIT_CAP),
    tactics: academyCleanCount(src.tactics, ACADEMY_CREDIT_CAP),
    commerce: academyCleanCount(src.commerce, ACADEMY_CREDIT_CAP),
  };
}

export function sumAcademyCredits(credits: Partial<Record<string, number>> | null | undefined): number {
  if (!credits || typeof credits !== "object") return 0;
  let total = 0;
  for (const id of ACADEMY_DEPARTMENT_IDS) {
    const n = Number(credits[id]);
    if (Number.isFinite(n) && n > 0) total += Math.floor(n);
  }
  return total;
}

/** 某系学分对应的被动阶位与下一阶进度。 */
export function getAcademyDepartmentTier(departmentId: AcademyDepartmentId, credits: number) {
  const dept = ACADEMY_DEPARTMENTS.find((d) => d.id === departmentId) || ACADEMY_DEPARTMENTS[0];
  const c = Number.isFinite(credits) && credits > 0 ? Math.floor(credits) : 0;
  let current = dept.tiers[0];
  let next: AcademyDepartmentTierDef | null = null;
  for (let i = 0; i < dept.tiers.length; i++) {
    if (c >= dept.tiers[i].minCredits) {
      current = dept.tiers[i];
      next = dept.tiers[i + 1] ?? null;
    }
  }
  const progressPct = next
    ? Math.min(100, Math.max(0, Math.round(((c - current.minCredits) / Math.max(1, next.minCredits - current.minCredits)) * 100)))
    : 100;
  return { current, next, progressPct, credits: c };
}

/** 四系学分总和对应的学院徽章。 */
export function getAcademyBadgeTier(totalCredits: number) {
  const c = Number.isFinite(totalCredits) && totalCredits > 0 ? Math.floor(totalCredits) : 0;
  let current = ACADEMY_BADGES[0];
  let next: AcademyBadgeDef | null = null;
  for (let i = 0; i < ACADEMY_BADGES.length; i++) {
    if (c >= ACADEMY_BADGES[i].minCredits) {
      current = ACADEMY_BADGES[i];
      next = ACADEMY_BADGES[i + 1] ?? null;
    }
  }
  const progressPct = next
    ? Math.min(100, Math.max(0, Math.round(((c - current.minCredits) / Math.max(1, next.minCredits - current.minCredits)) * 100)))
    : 100;
  return { current, next, progressPct, totalCredits: c };
}

export function academyCourseDurationMs(courseId: AcademyCourseId): number {
  const course = ACADEMY_COURSES.find((c) => c.id === courseId);
  return course ? course.durationMinutes * 60_000 : 0;
}

/** 进修进度：剩余毫秒、百分比与是否已到结业时间（只读，不结算）。 */
export function getAcademyCourseProgress(
  active: { courseId?: unknown; startedAt?: unknown; endsAt?: unknown } | null | undefined,
  nowMs: number
): { remainingMs: number; progressPct: number; finished: boolean } {
  if (!active || typeof active !== "object") return { remainingMs: 0, progressPct: 0, finished: false };
  const start = typeof active.startedAt === "string" ? Date.parse(active.startedAt) : Number.NaN;
  const end = typeof active.endsAt === "string" ? Date.parse(active.endsAt) : Number.NaN;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || !Number.isFinite(nowMs)) {
    return { remainingMs: 0, progressPct: 0, finished: false };
  }
  const remainingMs = Math.max(0, end - nowMs);
  const progressPct = Math.min(100, Math.max(0, Math.floor(((nowMs - start) / (end - start)) * 100)));
  return { remainingMs, progressPct, finished: nowMs >= end };
}

/** 结业预览：某门课结业后该系阶位与学院徽章的变化。 */
export function previewAcademyGraduation(credits: Partial<Record<string, number>> | null | undefined, courseId: AcademyCourseId) {
  const course = ACADEMY_COURSES.find((c) => c.id === courseId) || ACADEMY_COURSES[0];
  const clean = cleanAcademyCredits(credits);
  const total = sumAcademyCredits(clean);
  const before = getAcademyDepartmentTier(course.department, clean[course.department]).current;
  const after = getAcademyDepartmentTier(course.department, Math.min(ACADEMY_CREDIT_CAP, clean[course.department] + course.credits)).current;
  const badgeBefore = getAcademyBadgeTier(total).current;
  const badgeAfter = getAcademyBadgeTier(total - clean[course.department] + Math.min(ACADEMY_CREDIT_CAP, clean[course.department] + course.credits)).current;
  return {
    department: course.department,
    credits: course.credits,
    departmentTierBefore: before.tier,
    departmentTierAfter: after.tier,
    badgeTierBefore: badgeBefore.tier,
    badgeTierAfter: badgeAfter.tier,
  };
}

/** 纪念章净化：只保留合法季节、去重并按四季顺序排列。 */
export function cleanFestivalKeepsakes(raw: unknown): FestivalSeasonId[] {
  const src = Array.isArray(raw) ? (raw as unknown[]) : [];
  return FESTIVAL_SEASON_IDS.filter((id) => src.includes(id));
}

/** 东八区季节序号：年 × 4 + (0 春 / 1 夏 / 2 秋 / 3 冬)；1~2 月归属上一年的冬季。 */
export function getFestivalSeasonIndex(now: Date | number): number {
  const ms = typeof now === "number" ? now : now.getTime();
  const d = new Date(ms + FESTIVAL_TZ_OFFSET_MINUTES * 60_000);
  return Math.floor((d.getUTCFullYear() * 12 + d.getUTCMonth() - 2) / 3);
}

export function festivalSeasonIdFromIndex(index: number): FestivalSeasonId {
  const i = Math.floor(index);
  return FESTIVAL_SEASON_IDS[((i % 4) + 4) % 4];
}

/** 季节序号 → 季节键 YYYY-season（冬季以 12 月所在年份记）。 */
export function festivalSeasonKeyFromIndex(index: number): string {
  const i = Math.floor(index);
  return `${Math.floor(i / 4)}-${festivalSeasonIdFromIndex(i)}`;
}

export function festivalSeasonKey(now: Date | number): string {
  return festivalSeasonKeyFromIndex(getFestivalSeasonIndex(now));
}

/** 季节键 → 季节序号；非法键返回 null。 */
export function festivalSeasonIndexFromKey(key: unknown): number | null {
  if (typeof key !== "string") return null;
  const m = /^(\d{4})-(spring|summer|autumn|winter)$/.exec(key);
  if (!m) return null;
  return Number(m[1]) * 4 + FESTIVAL_SEASON_IDS.indexOf(m[2] as FestivalSeasonId);
}

/** 该季节开幕（首月 1 日东八区 0 点）的 UTC 毫秒时间戳。 */
export function festivalSeasonStartMs(index: number): number {
  const i = Math.floor(index);
  const year = Math.floor(i / 4);
  const q = ((i % 4) + 4) % 4;
  return Date.UTC(year, 2 + q * 3, 1) - FESTIVAL_TZ_OFFSET_MINUTES * 60_000;
}

/** 该季节结束（下一季开幕）的 UTC 毫秒时间戳。 */
export function festivalSeasonEndsAtMs(index: number): number {
  return festivalSeasonStartMs(Math.floor(index) + 1);
}

export function getFestivalSeasonDef(seasonId: FestivalSeasonId): FestivalSeasonDef {
  return FESTIVAL_SEASONS.find((s) => s.id === seasonId) || FESTIVAL_SEASONS[0];
}

export function getFestivalCommissionsForSeason(seasonId: FestivalSeasonId): FestivalCommissionDef[] {
  return FESTIVAL_COMMISSIONS.filter((c) => c.season === seasonId);
}

export function getFestivalShopForSeason(seasonId: FestivalSeasonId): FestivalShopItemDef[] {
  return FESTIVAL_SHOP_ITEMS.filter((s) => s.season === null || s.season === seasonId);
}

/** 委托计数器：actions = stats.actionsById 中指定前缀行动完成次数之和；kills = stats.totalKills；deliver 恒为 0。 */
export function countFestivalCommissionCounter(
  def: FestivalCommissionDef,
  stats: { actionsById?: unknown; totalKills?: unknown } | null | undefined
): number {
  if (!stats || typeof stats !== "object") return 0;
  if (def.kind === "kills") {
    const n = Number(stats.totalKills);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }
  if (def.kind !== "actions" || !def.actionPrefix) return 0;
  const byId = stats.actionsById;
  if (!byId || typeof byId !== "object") return 0;
  let total = 0;
  for (const [k, v] of Object.entries(byId as Record<string, unknown>)) {
    if (!k.startsWith(def.actionPrefix)) continue;
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) total += Math.floor(n);
  }
  return total;
}

/** 计数类委托进度：本季计数（计数器 - 季初基线）对第 claims + 1 次领取所需的 (claims + 1) × target。 */
export function getFestivalCommissionProgress(def: FestivalCommissionDef, seasonCount: number, claims: number) {
  const done = Number.isFinite(claims) && claims > 0 ? Math.min(def.maxClaims, Math.floor(claims)) : 0;
  const count = Number.isFinite(seasonCount) && seasonCount > 0 ? Math.floor(seasonCount) : 0;
  if (def.kind === "deliver") {
    return { seasonCount: 0, progress: 0, required: 0, ready: done < def.maxClaims, completed: done >= def.maxClaims };
  }
  const required = def.target * Math.min(def.maxClaims, done + 1);
  const progress = Math.max(0, Math.min(def.target, count - def.target * done));
  return {
    seasonCount: count,
    progress,
    required,
    ready: done < def.maxClaims && count >= required,
    completed: done >= def.maxClaims,
  };
}

export interface AcademyFestivalBonuses {
  totalCredits: number;
  departmentCredits: Record<AcademyDepartmentId, number>;
  departmentTiers: Record<AcademyDepartmentId, number>;
  badgeTier: number;
  badgeName: string;
  keepsakes: FestivalSeasonId[];
  fullCycle: boolean;
  gatherSpeedPct: number;
  craftSpeedPct: number;
  xpGainPct: number;
  goldGainPct: number;
  bonusAtk: number;
  bonusDef: number;
  bonusHp: number;
}

export type MinimalAcademyFestivalHolder = {
  adventurerAcademy?: {
    credits?: unknown;
  } | null;
  festivalCalendar?: {
    keepsakes?: unknown;
  } | null;
} | null;

/** 学院 + 节庆永久加成 = 四系被动阶位 + 学院徽章 + 四季纪念章（收齐四季再叠加四季圆满）。 */
export function getAcademyFestivalBonuses(holder?: MinimalAcademyFestivalHolder): AcademyFestivalBonuses {
  const ac = holder?.adventurerAcademy;
  const fc = holder?.festivalCalendar;
  const credits = cleanAcademyCredits(ac && typeof ac === "object" ? ac.credits : null);
  const keepsakes = cleanFestivalKeepsakes(fc && typeof fc === "object" ? fc.keepsakes : null);
  const totalCredits = sumAcademyCredits(credits);
  const badge = getAcademyBadgeTier(totalCredits).current;
  const fullCycle = keepsakes.length === FESTIVAL_SEASON_IDS.length;
  const sum: Required<AcademyStats> = {
    gatherSpeedPct: 0,
    craftSpeedPct: 0,
    xpGainPct: 0,
    goldGainPct: 0,
    bonusAtk: 0,
    bonusDef: 0,
    bonusHp: 0,
  };
  const add = (s: AcademyStats) => {
    for (const k of ACADEMY_STAT_KEYS) sum[k] += s[k] || 0;
  };
  const departmentTiers: Record<AcademyDepartmentId, number> = { gathering: 0, crafting: 0, tactics: 0, commerce: 0 };
  for (const dept of ACADEMY_DEPARTMENTS) {
    const tier = getAcademyDepartmentTier(dept.id, credits[dept.id]).current;
    departmentTiers[dept.id] = tier.tier;
    add(tier.stats);
  }
  add(badge.stats);
  for (const id of keepsakes) add(getFestivalSeasonDef(id).keepsakeStats);
  if (fullCycle) add(FESTIVAL_FULL_CYCLE_STATS);
  return {
    totalCredits,
    departmentCredits: credits,
    departmentTiers,
    badgeTier: badge.tier,
    badgeName: badge.name,
    keepsakes,
    fullCycle,
    ...sum,
  };
}

/* ---- 以上为 WL-12 core ---- */

function academyCleanInt(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallback;
}

function fmtAcademyRemaining(ms: number): string {
  const totalMin = Math.max(1, Math.ceil(ms / 60_000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return m > 0 ? `${h} 小时 ${m} 分` : `${h} 小时`;
  return `${m} 分钟`;
}

function academyItemName(contentPack: EnhancedContentPack | undefined, itemId: string): string {
  return ((contentPack?.items as Array<{ id: string; name?: string }> | undefined) || []).find((i) => i.id === itemId)?.name || itemId;
}

/** 进行中的课程净化：课程必须合法、开课时间可解析；结业时间一律按开课时间 + 课程时长重算（防脏档拉长 / 缩短）。 */
function sanitizeAcademyActiveCourse(raw: unknown): AcademyActiveCourse | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!isValidAcademyCourseId(r.courseId) || typeof r.startedAt !== "string") return null;
  const start = Date.parse(r.startedAt);
  if (!Number.isFinite(start)) return null;
  return {
    courseId: r.courseId,
    startedAt: new Date(start).toISOString(),
    endsAt: new Date(start + academyCourseDurationMs(r.courseId)).toISOString(),
  };
}

function sanitizeAcademyGraduation(raw: unknown): AcademyGraduationRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!isValidAcademyCourseId(r.courseId)) return null;
  const course = ACADEMY_COURSES.find((c) => c.id === r.courseId)!;
  const at = typeof r.at === "string" && Number.isFinite(Date.parse(r.at)) ? r.at : new Date(0).toISOString();
  return {
    courseId: course.id,
    department: course.department,
    credits: course.credits,
    at,
    departmentTier: Math.min(4, academyCleanInt(r.departmentTier, 0)),
    badgeTier: Math.min(4, academyCleanInt(r.badgeTier, 0)),
  };
}

/** 结业（内部）：发放该系学分、累计结业次数、记录结业单并在晋阶时写日志。结业时刻取课程 endsAt。 */
function graduateAcademyCourse(player: EnhancedPlayerState, ac: AdventurerAcademyState): void {
  const active = ac.activeCourse!;
  const course = ACADEMY_COURSES.find((c) => c.id === active.courseId)!;
  const dept = ACADEMY_DEPARTMENTS.find((d) => d.id === course.department)!;
  const prevBadge = getAcademyBadgeTier(sumAcademyCredits(ac.credits)).current;
  const prevTier = getAcademyDepartmentTier(course.department, ac.credits[course.department]).current;
  ac.credits[course.department] = Math.min(ACADEMY_CREDIT_CAP, ac.credits[course.department] + course.credits);
  ac.completedCourses[course.id] = (ac.completedCourses[course.id] || 0) + 1;
  ac.totalGraduations += 1;
  const badge = getAcademyBadgeTier(sumAcademyCredits(ac.credits)).current;
  const tier = getAcademyDepartmentTier(course.department, ac.credits[course.department]).current;
  ac.lastGraduation = {
    courseId: course.id,
    department: course.department,
    credits: course.credits,
    at: active.endsAt,
    departmentTier: tier.tier,
    badgeTier: badge.tier,
  };
  ac.activeCourse = null;
  appendLog(
    player,
    `冒险者学院「${course.name}」结业：${dept.name} +${course.credits} 学分（本系累计 ${ac.credits[course.department]}）。`
  );
  if (tier.tier > prevTier.tier) {
    appendLog(player, `${dept.name}「${dept.passiveName}」晋升「${tier.title}」，跨职业永久被动提升（转生保留）！`);
  }
  if (badge.tier > prevBadge.tier) {
    appendLog(player, `冒险者学院授予「${badge.name}」！`);
  }
}

/**
 * 确保 adventurerAcademy 存在并净化脏档（旧存档首次打开面板时补齐空学院；转生永久保留）。
 * 仅显式传入 now（指令 / 视图时钟）且到点时才结业发放学分；无参调用（ensurePlayerExtensions / 转生净化）
 * 只做净化，绝不按墙钟结业（沿用 WL-10 / WL-11 的显式时钟约定）。
 */
export function ensureAdventurerAcademy(player: EnhancedPlayerState, now?: Date): AdventurerAcademyState {
  if (!Array.isArray((player as any).logs)) {
    (player as any).logs = [];
  }
  if (!player.adventurerAcademy || typeof player.adventurerAcademy !== "object") {
    player.adventurerAcademy = {
      credits: { gathering: 0, crafting: 0, tactics: 0, commerce: 0 },
      completedCourses: {},
      activeCourse: null,
      totalEnrollments: 0,
      totalGraduations: 0,
      lastGraduation: null,
    };
  }
  const ac = player.adventurerAcademy;
  ac.credits = cleanAcademyCredits(ac.credits);
  const rawDone = ac.completedCourses && typeof ac.completedCourses === "object" ? (ac.completedCourses as Record<string, unknown>) : {};
  const done: Partial<Record<AcademyCourseId, number>> = {};
  let graduations = 0;
  for (const id of ACADEMY_COURSE_IDS) {
    const n = academyCleanInt(rawDone[id], 0);
    if (n > 0) {
      done[id] = n;
      graduations += n;
    }
  }
  ac.completedCourses = done;
  ac.activeCourse = sanitizeAcademyActiveCourse(ac.activeCourse);
  ac.totalGraduations = Math.max(academyCleanInt(ac.totalGraduations, 0), graduations);
  ac.totalEnrollments = Math.max(academyCleanInt(ac.totalEnrollments, 0), ac.totalGraduations + (ac.activeCourse ? 1 : 0));
  ac.lastGraduation = sanitizeAcademyGraduation(ac.lastGraduation);

  if (now !== undefined && ac.activeCourse && now.getTime() >= Date.parse(ac.activeCourse.endsAt)) {
    graduateAcademyCourse(player, ac);
  }
  return ac;
}

/** 本季计数类委托的季初基线：当前计数器值（季初之前的行动 / 击杀不计入本季）。 */
function festivalBaselinesFor(player: EnhancedPlayerState, seasonId: FestivalSeasonId): Partial<Record<FestivalCommissionId, number>> {
  const out: Partial<Record<FestivalCommissionId, number>> = {};
  for (const def of getFestivalCommissionsForSeason(seasonId)) {
    if (def.kind === "deliver") continue;
    out[def.id] = countFestivalCommissionCounter(def, player.stats);
  }
  return out;
}

function sanitizeFestivalRollover(raw: unknown): FestivalRolloverRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (festivalSeasonIndexFromKey(r.seasonKey) === null) return null;
  return {
    seasonKey: r.seasonKey as string,
    claims: academyCleanInt(r.claims, 0),
    tokensConverted: Math.min(FESTIVAL_TOKEN_CAP, academyCleanInt(r.tokensConverted, 0)),
    goldConverted: academyCleanInt(r.goldConverted, 0),
  };
}

/**
 * 确保 festivalCalendar 存在并净化脏档。
 * 仅显式传入 now 且东八区季节前进时才翻季：未花完的节庆代币按比率折算金币，委托 / 商店限购清零，
 * 并以当前计数器重设新季基线；无参调用只做净化，绝不按墙钟翻季。
 */
export function ensureFestivalCalendar(player: EnhancedPlayerState, now?: Date): FestivalCalendarState {
  const clock = now ?? new Date();
  if (!Array.isArray((player as any).logs)) {
    (player as any).logs = [];
  }
  if (!player.inventory || typeof player.inventory !== "object") {
    player.inventory = { gold: 0 };
  }
  if (!player.festivalCalendar || typeof player.festivalCalendar !== "object") {
    const idx = getFestivalSeasonIndex(clock);
    player.festivalCalendar = {
      seasonKey: festivalSeasonKeyFromIndex(idx),
      tokens: 0,
      claims: {},
      // 首次打开日历：季初基线 = 当前计数器（之前的行动 / 击杀不追溯计入，也不赠送任何代币）
      baselines: festivalBaselinesFor(player, festivalSeasonIdFromIndex(idx)),
      purchases: {},
      keepsakes: [],
      totalTokensEarned: 0,
      totalClaims: 0,
      lastRollover: null,
    };
  }
  const fc = player.festivalCalendar;
  if (festivalSeasonIndexFromKey(fc.seasonKey) === null) {
    fc.seasonKey = festivalSeasonKey(clock);
  }
  const seasonId = festivalSeasonIdFromIndex(festivalSeasonIndexFromKey(fc.seasonKey)!);
  fc.tokens = Math.min(FESTIVAL_TOKEN_CAP, academyCleanInt(fc.tokens, 0));
  const rawClaims = fc.claims && typeof fc.claims === "object" ? (fc.claims as Record<string, unknown>) : {};
  const rawBase = fc.baselines && typeof fc.baselines === "object" ? (fc.baselines as Record<string, unknown>) : {};
  const claims: Partial<Record<FestivalCommissionId, number>> = {};
  const baselines: Partial<Record<FestivalCommissionId, number>> = {};
  let claimSum = 0;
  for (const def of getFestivalCommissionsForSeason(seasonId)) {
    const n = Math.min(def.maxClaims, academyCleanInt(rawClaims[def.id], 0));
    if (n > 0) {
      claims[def.id] = n;
      claimSum += n;
    }
    if (def.kind !== "deliver") {
      const counter = countFestivalCommissionCounter(def, player.stats);
      baselines[def.id] = Math.min(counter, academyCleanInt(rawBase[def.id], counter));
    }
  }
  fc.claims = claims;
  fc.baselines = baselines;
  const rawPurchases = fc.purchases && typeof fc.purchases === "object" ? (fc.purchases as Record<string, unknown>) : {};
  const purchases: Partial<Record<FestivalShopItemId, number>> = {};
  for (const item of getFestivalShopForSeason(seasonId)) {
    const n = Math.min(item.limit, academyCleanInt(rawPurchases[item.id], 0));
    if (n > 0) purchases[item.id] = n;
  }
  fc.purchases = purchases;
  fc.keepsakes = cleanFestivalKeepsakes(fc.keepsakes);
  fc.totalTokensEarned = academyCleanInt(fc.totalTokensEarned, 0);
  fc.totalClaims = Math.max(academyCleanInt(fc.totalClaims, 0), claimSum);
  fc.lastRollover = sanitizeFestivalRollover(fc.lastRollover);

  if (now !== undefined) {
    const curIdx = getFestivalSeasonIndex(clock);
    const storedIdx = festivalSeasonIndexFromKey(fc.seasonKey)!;
    // 只向前翻季（时钟回拨不回滚）；跨多季只折算一次剩余代币
    if (curIdx > storedIdx) {
      const leftover = fc.tokens;
      const goldConverted = leftover * FESTIVAL_TOKEN_GOLD_RATE;
      if (goldConverted > 0) {
        player.inventory.gold = (player.inventory.gold || 0) + goldConverted;
        if (player.stats) player.stats.totalGoldEarned = (player.stats.totalGoldEarned || 0) + goldConverted;
      }
      const purchaseSum = Object.values(fc.purchases).reduce<number>((s, n) => s + (n || 0), 0);
      if (leftover > 0 || claimSum > 0 || purchaseSum > 0) {
        fc.lastRollover = { seasonKey: fc.seasonKey, claims: claimSum, tokensConverted: leftover, goldConverted };
      }
      const prevSeason = getFestivalSeasonDef(seasonId);
      const nextId = festivalSeasonIdFromIndex(curIdx);
      const nextSeason = getFestivalSeasonDef(nextId);
      fc.seasonKey = festivalSeasonKeyFromIndex(curIdx);
      fc.tokens = 0;
      fc.claims = {};
      fc.purchases = {};
      fc.baselines = festivalBaselinesFor(player, nextId);
      if (goldConverted > 0) {
        appendLog(player, `${prevSeason.name}落幕：剩余 ${leftover} 枚「${prevSeason.tokenName}」折算为 ${goldConverted} 金币。`);
      }
      appendLog(player, `四季节庆日历翻季：${nextSeason.name}（${nextSeason.months}）开幕，限定委托与节庆商店已更新！`);
    }
  }
  return fc;
}

/** 指令内统一推进两份时钟（结业 + 翻季），保证落库状态与响应视图一致。 */
function ensureAcademyFestivalClocks(player: EnhancedPlayerState, now: Date) {
  return { ac: ensureAdventurerAcademy(player, now), fc: ensureFestivalCalendar(player, now) };
}

/** 冒险者学院报名：消耗金币 + 真实生活职业成品，开课后经过课程时长（按显式 now 结算）结业发放学分。 */
export function enrollAcademyCourse(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack | undefined,
  courseId: AcademyCourseId,
  now: Date = new Date()
): {
  ok: boolean;
  reason?: string;
  courseId?: AcademyCourseId;
  department?: AcademyDepartmentId;
  credits?: number;
  durationMinutes?: number;
  startedAt?: string;
  endsAt?: string;
  spentGold?: number;
  spentItems?: Record<string, number>;
} {
  ensurePlayerExtensions(player);
  if (!isValidAcademyCourseId(courseId)) {
    return { ok: false, reason: "未知的学院课程" };
  }
  const { ac } = ensureAcademyFestivalClocks(player, now);
  const course = ACADEMY_COURSES.find((c) => c.id === courseId)!;
  if (ac.activeCourse) {
    const cur = ACADEMY_COURSES.find((c) => c.id === ac.activeCourse!.courseId)!;
    const prog = getAcademyCourseProgress(ac.activeCourse, now.getTime());
    return {
      ok: false,
      reason: `正在进修「${cur.name}」（还剩 ${fmtAcademyRemaining(prog.remainingMs)}），结业后才能报名下一门（进修席位 ${ACADEMY_COURSE_SLOTS}）`,
    };
  }
  const badge = getAcademyBadgeTier(sumAcademyCredits(ac.credits)).current;
  if (badge.tier < course.minBadgeTier) {
    const need = ACADEMY_BADGES.find((b) => b.tier === course.minBadgeTier)!;
    return { ok: false, reason: `「${course.name}」需持有「${need.name}」（四系学分合计 ${need.minCredits}）` };
  }
  const spentItems: Record<string, number> = {};
  for (const [itemId, qty] of Object.entries(course.itemCost)) {
    const have = Math.floor(Number(player.inventory[itemId] || 0));
    if (have < qty) {
      return {
        ok: false,
        reason: `报名「${course.name}」需「${academyItemName(contentPack, itemId)}」×${qty}（当前 ${have}）`,
      };
    }
    spentItems[itemId] = qty;
  }
  if ((player.inventory.gold || 0) < course.goldCost) {
    return { ok: false, reason: `金币不足：报名「${course.name}」需 ${course.goldCost} 金币` };
  }
  for (const [itemId, qty] of Object.entries(spentItems)) {
    player.inventory[itemId] = Math.floor(Number(player.inventory[itemId] || 0)) - qty;
    if (player.inventory[itemId] <= 0) delete player.inventory[itemId];
  }
  player.inventory.gold = (player.inventory.gold || 0) - course.goldCost;
  if (player.stats) player.stats.totalGoldSpent = (player.stats.totalGoldSpent || 0) + course.goldCost;
  const startedAt = now.toISOString();
  const endsAt = new Date(now.getTime() + academyCourseDurationMs(course.id)).toISOString();
  ac.activeCourse = { courseId: course.id, startedAt, endsAt };
  ac.totalEnrollments += 1;
  addReputation(player, 3);
  syncAchievements(player);
  const dept = ACADEMY_DEPARTMENTS.find((d) => d.id === course.department)!;
  appendLog(
    player,
    `报名冒险者学院「${course.name}」（${dept.name}），进修 ${course.durationMinutes} 分钟后结业可得 ${course.credits} 学分。`
  );
  return {
    ok: true,
    courseId: course.id,
    department: course.department,
    credits: course.credits,
    durationMinutes: course.durationMinutes,
    startedAt,
    endsAt,
    spentGold: course.goldCost,
    spentItems,
  };
}

/** 四季节庆限定委托：交付真实成品，或本季完成指定行动 / 击杀后领取节庆代币与金币（每季限领 maxClaims 次）。 */
export function claimFestivalCommission(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack | undefined,
  commissionId: FestivalCommissionId,
  now: Date = new Date()
): {
  ok: boolean;
  reason?: string;
  commissionId?: FestivalCommissionId;
  tokens?: number;
  gold?: number;
  claims?: number;
  tokenBalance?: number;
  spentItems?: Record<string, number>;
} {
  ensurePlayerExtensions(player);
  if (!isValidFestivalCommissionId(commissionId)) {
    return { ok: false, reason: "未知的节庆委托" };
  }
  const { fc } = ensureAcademyFestivalClocks(player, now);
  const seasonId = festivalSeasonIdFromIndex(festivalSeasonIndexFromKey(fc.seasonKey)!);
  const season = getFestivalSeasonDef(seasonId);
  const def = FESTIVAL_COMMISSIONS.find((c) => c.id === commissionId)!;
  if (def.season !== seasonId) {
    return {
      ok: false,
      reason: `「${def.name}」是${getFestivalSeasonDef(def.season).name}限定委托，当前是${season.name}`,
    };
  }
  const claims = fc.claims[def.id] || 0;
  if (claims >= def.maxClaims) {
    return { ok: false, reason: `「${def.name}」本季已完成 ${def.maxClaims} 次` };
  }
  const spentItems: Record<string, number> = {};
  if (def.kind === "deliver") {
    for (const [itemId, qty] of Object.entries(def.items)) {
      const have = Math.floor(Number(player.inventory[itemId] || 0));
      if (have < qty) {
        return {
          ok: false,
          reason: `交付「${def.name}」需「${academyItemName(contentPack, itemId)}」×${qty}（当前 ${have}）`,
        };
      }
      spentItems[itemId] = qty;
    }
  } else {
    const seasonCount = countFestivalCommissionCounter(def, player.stats) - (fc.baselines[def.id] || 0);
    const prog = getFestivalCommissionProgress(def, seasonCount, claims);
    if (!prog.ready) {
      const unit = def.kind === "kills" ? "次击杀" : "次行动";
      return {
        ok: false,
        reason: `「${def.name}」进度不足：本季已完成 ${prog.seasonCount} ${unit}，第 ${claims + 1} 次领取需累计 ${prog.required} ${unit}`,
      };
    }
  }
  for (const [itemId, qty] of Object.entries(spentItems)) {
    player.inventory[itemId] = Math.floor(Number(player.inventory[itemId] || 0)) - qty;
    if (player.inventory[itemId] <= 0) delete player.inventory[itemId];
  }
  fc.claims[def.id] = claims + 1;
  fc.tokens = Math.min(FESTIVAL_TOKEN_CAP, fc.tokens + def.tokens);
  fc.totalTokensEarned += def.tokens;
  fc.totalClaims += 1;
  if (def.gold > 0) {
    player.inventory.gold = (player.inventory.gold || 0) + def.gold;
    if (player.stats) player.stats.totalGoldEarned = (player.stats.totalGoldEarned || 0) + def.gold;
  }
  addReputation(player, 2);
  syncAchievements(player);
  appendLog(
    player,
    `${season.name}委托「${def.name}」完成（${claims + 1}/${def.maxClaims}）：获得 ${def.tokens} 枚「${season.tokenName}」与 ${def.gold} 金币。`
  );
  return {
    ok: true,
    commissionId: def.id,
    tokens: def.tokens,
    gold: def.gold,
    claims: claims + 1,
    tokenBalance: fc.tokens,
    spentItems,
  };
}

/** 节庆商店：以本季节庆代币兑换金币袋、季节礼包、学院进修推荐信（学分）或四季纪念章（永久）。 */
export function buyFestivalShopItem(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack | undefined,
  itemId: FestivalShopItemId,
  now: Date = new Date()
): {
  ok: boolean;
  reason?: string;
  itemId?: FestivalShopItemId;
  kind?: FestivalShopItemKind;
  cost?: number;
  purchased?: number;
  tokenBalance?: number;
  gold?: number;
  items?: Record<string, number>;
  credits?: number;
  department?: AcademyDepartmentId | null;
  keepsake?: FestivalSeasonId | null;
} {
  ensurePlayerExtensions(player);
  if (!isValidFestivalShopItemId(itemId)) {
    return { ok: false, reason: "未知的节庆商品" };
  }
  const { ac, fc } = ensureAcademyFestivalClocks(player, now);
  const seasonId = festivalSeasonIdFromIndex(festivalSeasonIndexFromKey(fc.seasonKey)!);
  const season = getFestivalSeasonDef(seasonId);
  const def = FESTIVAL_SHOP_ITEMS.find((s) => s.id === itemId)!;
  if (def.season !== null && def.season !== seasonId) {
    return { ok: false, reason: `「${def.name}」只在${getFestivalSeasonDef(def.season).name}上架，当前是${season.name}` };
  }
  const bought = fc.purchases[def.id] || 0;
  if (bought >= def.limit) {
    return { ok: false, reason: `「${def.name}」本季限购 ${def.limit} 次，已售罄` };
  }
  if (def.kind === "keepsake" && fc.keepsakes.includes(seasonId)) {
    return { ok: false, reason: `已拥有「${season.keepsakeName}」` };
  }
  if (fc.tokens < def.cost) {
    return { ok: false, reason: `「${season.tokenName}」不足：需 ${def.cost} 枚（当前 ${fc.tokens}）` };
  }
  fc.tokens -= def.cost;
  fc.purchases[def.id] = bought + 1;
  const granted: Record<string, number> = {};
  if (def.kind === "gold" && def.gold > 0) {
    player.inventory.gold = (player.inventory.gold || 0) + def.gold;
    if (player.stats) player.stats.totalGoldEarned = (player.stats.totalGoldEarned || 0) + def.gold;
  }
  if (def.kind === "items") {
    for (const [id, qty] of Object.entries(def.items)) {
      player.inventory[id] = Math.floor(Number(player.inventory[id] || 0)) + qty;
      granted[id] = qty;
    }
  }
  if (def.kind === "credits" && def.department) {
    const prevTier = getAcademyDepartmentTier(def.department, ac.credits[def.department]).current;
    const prevBadge = getAcademyBadgeTier(sumAcademyCredits(ac.credits)).current;
    ac.credits[def.department] = Math.min(ACADEMY_CREDIT_CAP, ac.credits[def.department] + def.credits);
    const tier = getAcademyDepartmentTier(def.department, ac.credits[def.department]).current;
    const badge = getAcademyBadgeTier(sumAcademyCredits(ac.credits)).current;
    const dept = ACADEMY_DEPARTMENTS.find((d) => d.id === def.department)!;
    if (tier.tier > prevTier.tier) {
      appendLog(player, `${dept.name}「${dept.passiveName}」晋升「${tier.title}」，跨职业永久被动提升（转生保留）！`);
    }
    if (badge.tier > prevBadge.tier) {
      appendLog(player, `冒险者学院授予「${badge.name}」！`);
    }
  }
  if (def.kind === "keepsake") {
    fc.keepsakes = cleanFestivalKeepsakes([...fc.keepsakes, seasonId]);
    if (fc.keepsakes.length === FESTIVAL_SEASON_IDS.length) {
      appendLog(player, "四季纪念章全部收齐：「四季圆满」永久加成生效！");
    }
  }
  appendLog(player, `节庆商店兑换「${def.name}」，花费 ${def.cost} 枚「${season.tokenName}」。`);
  return {
    ok: true,
    itemId: def.id,
    kind: def.kind,
    cost: def.cost,
    purchased: bought + 1,
    tokenBalance: fc.tokens,
    gold: def.kind === "gold" ? def.gold : 0,
    items: granted,
    credits: def.kind === "credits" ? def.credits : 0,
    department: def.department,
    keepsake: def.kind === "keepsake" ? seasonId : null,
  };
}

/** 构造前端「冒险者学院 & 四季节庆」面板视图（会补齐两份状态并按显式 now 结业 / 翻季）。 */
export function getAcademyFestivalInfo(
  player: EnhancedPlayerState,
  contentPack?: EnhancedContentPack,
  now: Date = new Date()
) {
  ensurePlayerExtensions(player);
  const { ac, fc } = ensureAcademyFestivalClocks(player, now);
  const nowMs = now.getTime();
  const itemName = (id: string) => academyItemName(contentPack, id);
  const have = (id: string) => Math.floor(Number(player.inventory[id] || 0));
  const gold = Math.floor(Number(player.inventory.gold || 0));
  const bonuses = getAcademyFestivalBonuses(player);
  const badgeInfo = getAcademyBadgeTier(bonuses.totalCredits);
  const deptName = (id: AcademyDepartmentId) => ACADEMY_DEPARTMENTS.find((d) => d.id === id)!.name;

  const departments = ACADEMY_DEPARTMENTS.map((d) => {
    const t = getAcademyDepartmentTier(d.id, ac.credits[d.id]);
    return {
      id: d.id,
      name: d.name,
      passiveName: d.passiveName,
      subtitle: d.subtitle,
      description: d.description,
      credits: t.credits,
      tier: t.current,
      next: t.next,
      progressPct: t.progressPct,
      allTiers: d.tiers,
      festivalSeason: d.festivalSeason,
      festivalSeasonName: getFestivalSeasonDef(d.festivalSeason).name,
    };
  });

  const activeCourse = ac.activeCourse
    ? (() => {
        const c = ACADEMY_COURSES.find((x) => x.id === ac.activeCourse!.courseId)!;
        const prog = getAcademyCourseProgress(ac.activeCourse, nowMs);
        return {
          ...ac.activeCourse,
          name: c.name,
          level: c.level,
          department: c.department,
          departmentName: deptName(c.department),
          credits: c.credits,
          durationMinutes: c.durationMinutes,
          remainingMs: prog.remainingMs,
          progressPct: prog.progressPct,
          finished: prog.finished,
          preview: previewAcademyGraduation(ac.credits, c.id),
        };
      })()
    : null;

  const courses = ACADEMY_COURSES.map((c) => {
    const items = Object.entries(c.itemCost).map(([itemId, qty]) => ({ itemId, name: itemName(itemId), qty, have: have(itemId) }));
    const needBadge = ACADEMY_BADGES.find((b) => b.tier === c.minBadgeTier)!;
    let blockReason: string | null = null;
    if (ac.activeCourse) blockReason = "进修席位已占用";
    else if (badgeInfo.current.tier < c.minBadgeTier) blockReason = `需「${needBadge.name}」`;
    else if (items.some((it) => it.have < it.qty)) blockReason = "成品不足";
    else if (gold < c.goldCost) blockReason = "金币不足";
    return {
      id: c.id,
      name: c.name,
      level: c.level,
      department: c.department,
      departmentName: deptName(c.department),
      description: c.description,
      durationMinutes: c.durationMinutes,
      goldCost: c.goldCost,
      items,
      credits: c.credits,
      minBadgeTier: c.minBadgeTier,
      minBadgeName: needBadge.name,
      completedCount: ac.completedCourses[c.id] || 0,
      preview: previewAcademyGraduation(ac.credits, c.id),
      canEnroll: blockReason === null,
      blockReason,
    };
  });

  const seasonIndex = festivalSeasonIndexFromKey(fc.seasonKey)!;
  const seasonId = festivalSeasonIdFromIndex(seasonIndex);
  const season = getFestivalSeasonDef(seasonId);
  const nextSeason = getFestivalSeasonDef(festivalSeasonIdFromIndex(seasonIndex + 1));

  const commissions = getFestivalCommissionsForSeason(seasonId).map((def) => {
    const claims = fc.claims[def.id] || 0;
    const seasonCount = def.kind === "deliver" ? 0 : countFestivalCommissionCounter(def, player.stats) - (fc.baselines[def.id] || 0);
    const prog = getFestivalCommissionProgress(def, seasonCount, claims);
    const items = Object.entries(def.items).map(([itemId, qty]) => ({ itemId, name: itemName(itemId), qty, have: have(itemId) }));
    let blockReason: string | null = null;
    if (prog.completed) blockReason = "本季已完成";
    else if (def.kind === "deliver" && items.some((it) => it.have < it.qty)) blockReason = "成品不足";
    else if (def.kind !== "deliver" && !prog.ready) blockReason = def.kind === "kills" ? "击杀不足" : "行动不足";
    return {
      id: def.id,
      name: def.name,
      description: def.description,
      kind: def.kind,
      items,
      actionPrefix: def.actionPrefix,
      target: def.target,
      maxClaims: def.maxClaims,
      claims,
      tokens: def.tokens,
      gold: def.gold,
      seasonCount: prog.seasonCount,
      progress: prog.progress,
      required: prog.required,
      canClaim: blockReason === null,
      blockReason,
    };
  });

  const shop = getFestivalShopForSeason(seasonId).map((def) => {
    const purchased = fc.purchases[def.id] || 0;
    const owned = def.kind === "keepsake" && fc.keepsakes.includes(seasonId);
    let blockReason: string | null = null;
    if (owned) blockReason = "已拥有";
    else if (purchased >= def.limit) blockReason = "本季已售罄";
    else if (fc.tokens < def.cost) blockReason = "代币不足";
    return {
      id: def.id,
      name: def.name,
      description: def.description,
      kind: def.kind,
      iconKind: def.iconKind,
      iconId: def.iconId,
      cost: def.cost,
      limit: def.limit,
      purchased,
      gold: def.gold,
      items: Object.entries(def.items).map(([itemId, qty]) => ({ itemId, name: itemName(itemId), qty })),
      credits: def.credits,
      department: def.department,
      departmentName: def.department ? deptName(def.department) : null,
      owned,
      canBuy: blockReason === null,
      blockReason,
    };
  });

  return {
    nowMs,
    bonuses,
    academy: {
      slots: ACADEMY_COURSE_SLOTS,
      totalCredits: bonuses.totalCredits,
      badge: {
        current: badgeInfo.current,
        next: badgeInfo.next,
        progressPct: badgeInfo.progressPct,
        allBadges: ACADEMY_BADGES,
      },
      departments,
      activeCourse,
      courses,
      totalEnrollments: ac.totalEnrollments,
      totalGraduations: ac.totalGraduations,
      lastGraduation: ac.lastGraduation
        ? {
            ...ac.lastGraduation,
            courseName: ACADEMY_COURSES.find((c) => c.id === ac.lastGraduation!.courseId)!.name,
            departmentName: deptName(ac.lastGraduation.department),
            badgeName: ACADEMY_BADGES.find((b) => b.tier === ac.lastGraduation!.badgeTier)?.name || ACADEMY_BADGES[0].name,
          }
        : null,
    },
    festival: {
      seasonKey: fc.seasonKey,
      seasonIndex,
      year: Math.floor(seasonIndex / 4),
      season,
      startsAtMs: festivalSeasonStartMs(seasonIndex),
      endsAtMs: festivalSeasonEndsAtMs(seasonIndex),
      nextSeason: { id: nextSeason.id, name: nextSeason.name, shortName: nextSeason.shortName, months: nextSeason.months },
      calendar: FESTIVAL_SEASONS.map((s) => ({
        id: s.id,
        name: s.name,
        shortName: s.shortName,
        months: s.months,
        subtitle: s.subtitle,
        current: s.id === seasonId,
        keepsakeName: s.keepsakeName,
        keepsakeStats: s.keepsakeStats,
        keepsakeOwned: fc.keepsakes.includes(s.id),
      })),
      tokens: fc.tokens,
      tokenCap: FESTIVAL_TOKEN_CAP,
      tokenGoldRate: FESTIVAL_TOKEN_GOLD_RATE,
      commissions,
      shop,
      keepsakes: [...fc.keepsakes],
      fullCycle: bonuses.fullCycle,
      fullCycleStats: FESTIVAL_FULL_CYCLE_STATS,
      totalTokensEarned: fc.totalTokensEarned,
      totalClaims: fc.totalClaims,
      lastRollover: fc.lastRollover
        ? {
            ...fc.lastRollover,
            seasonName: (() => {
              const idx = festivalSeasonIndexFromKey(fc.lastRollover!.seasonKey)!;
              return `${Math.floor(idx / 4)} ${getFestivalSeasonDef(festivalSeasonIdFromIndex(idx)).name}`;
            })(),
          }
        : null,
    },
  };
}
