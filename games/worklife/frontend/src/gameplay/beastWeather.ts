// 契约魔兽牧场 & 天候观星占卜塔 (WL-14) —— 前端镜像。
// 与 backend/src/progression2/beast_weather.ts 同名表与纯函数逐字对称（scripts/beast-weather-parity.test.ts 守护），
// 供面板展示魔兽驯服 / 喂养 / 出战加成、牧场羁绊、每日天候与占卜祈愿，以及 combatSheet 攻防血 / 金币倍率使用。
// 战斗伙伴只以平铺攻防血 + 金币收益接入 combinedBuildFromState（后端 playerBuildExtras 同口径），
// 因此 fightPreview / hp_combat / WL-13 竞技场沙盒对决不需要任何新战斗机制即可保持对称。
// 任何数值改动必须两端同步。

export type ContractBeastId = "bloom_bee" | "echo_bat" | "mire_toad" | "frostmane_wolf" | "ember_hound" | "chrono_wyrm";

export type BeastRoleId = "gather" | "craft" | "combat";

export type WeatherId = "sunny" | "rain" | "fog" | "storm" | "aurora";

/* ---- 以下为与后端逐字对称的表与纯函数（WL-14 core） ---- */

export const CONTRACT_BEAST_IDS: readonly ContractBeastId[] = [
  "bloom_bee",
  "echo_bat",
  "mire_toad",
  "frostmane_wolf",
  "ember_hound",
  "chrono_wyrm",
];

export const BEAST_ROLE_IDS: readonly BeastRoleId[] = ["gather", "craft", "combat"];

export const WEATHER_IDS: readonly WeatherId[] = ["sunny", "rain", "fog", "storm", "aurora"];

/** 天候按东八区日期（每日 0 点）换日。 */
export const WEATHER_TZ_OFFSET_MINUTES = 480;
export const BEAST_MAX_LEVEL = 10;
/** 达到各等级所需的累计喂养经验（下标 0 = Lv.1，下标 9 = Lv.10 满级）。 */
export const BEAST_LEVEL_XP: readonly number[] = [0, 60, 160, 320, 560, 900, 1360, 1960, 2720, 3660];
/** 偏好料理的喂养经验倍率（百分比，整数运算，两端一致）。 */
export const BEAST_FAVORITE_XP_PCT = 150;
/** 单次喂养最多投喂的料理份数。 */
export const BEAST_FEED_MAX_QTY = 50;
/** 占卜明日天候消耗的异域星晶尘。 */
export const WEATHER_DIVINE_DUST = 6;
/** 祈愿成功率上限（%）：祈愿只能「偏转」天候，绝不保证应验。 */
export const WEATHER_WISH_CHANCE_CAP = 55;
export const WEATHER_HISTORY_DAYS = 7;

export interface BeastWeatherStats {
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

export const BEAST_STAT_KEYS: readonly (keyof BeastWeatherStats)[] = [
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

export interface BeastRoleDef {
  id: BeastRoleId;
  name: string;
  description: string;
}

export const BEAST_ROLES: readonly BeastRoleDef[] = [
  { id: "gather", name: "采集伙伴", description: "陪同采集：提升采集速度与采集产出" },
  { id: "craft", name: "制造伙伴", description: "协助制造：提升制作速度与制作产出" },
  { id: "combat", name: "战斗伙伴", description: "并肩作战：提升攻击、防御与生命" },
];

export interface BeastFoodDef {
  /** 内容包真实烹饪成品 id。 */
  itemId: string;
  /** 每份料理的喂养经验。 */
  xp: number;
}

/** 可喂养的真实料理（烹饪职业成品），按烹饪等级从低到高排列。 */
export const BEAST_FOODS: readonly BeastFoodDef[] = [
  { itemId: "food_simple", xp: 8 },
  { itemId: "food_grain_meal", xp: 10 },
  { itemId: "bread", xp: 12 },
  { itemId: "food_hearty_stew", xp: 20 },
  { itemId: "food_vegetable_stew", xp: 22 },
  { itemId: "food_fine", xp: 26 },
  { itemId: "soup_herbal", xp: 30 },
  { itemId: "dish_grilled_lake", xp: 36 },
  { itemId: "food_honey_cake", xp: 42 },
  { itemId: "food_master_feast", xp: 55 },
  { itemId: "dish_deepsea_stew", xp: 60 },
  { itemId: "food_pork_roast", xp: 80 },
  { itemId: "dish_abyss_platter", xp: 90 },
  { itemId: "dish_frost_sashimi", xp: 120 },
  { itemId: "dish_lava_roast", xp: 150 },
  { itemId: "dish_star_feast", xp: 180 },
  { itemId: "food_royal_banquet", xp: 200 },
  { itemId: "dish_dragon_delicacy", xp: 240 },
  { itemId: "food_divine_feast", xp: 360 },
  { itemId: "food_cosmos_banquet", xp: 600 },
];

export interface ContractBeastDef {
  id: ContractBeastId;
  name: string;
  title: string;
  role: BeastRoleId;
  /** 立绘复用内容包真实怪物美术（monsters/<artId>）。 */
  artId: string;
  description: string;
  /** 掉落驯服信物的首领（内容包真实首领 id）。 */
  bossId: string;
  /** 驯服消耗：首领真实掉落 + 烹饪成品（一次性扣除）。 */
  tameItems: Readonly<Record<string, number>>;
  tameGold: number;
  /** 偏好料理：喂养经验 ×1.5。 */
  favoriteFood: string;
  /** Lv.1 与 Lv.10 的出战加成；中间等级线性插值后四舍五入（主属性每级至少 +1，逐级严格成长）。 */
  statsLv1: BeastWeatherStats;
  statsMax: BeastWeatherStats;
}

export const CONTRACT_BEASTS: readonly ContractBeastDef[] = [
  {
    id: "bloom_bee",
    name: "蜜语花蜂",
    title: "林间采蜜向导",
    role: "gather",
    artId: "bee",
    description: "以森林管家遗落的定纹镜映出契约之影，再用简单料理安抚。它熟知每一片林地与花田，陪同采集时总能多带回一份收获。",
    bossId: "forest_boss",
    tameItems: { mirror_protection: 1, food_simple: 10 },
    tameGold: 600,
    favoriteFood: "food_honey_cake",
    statsLv1: { gatherSpeedPct: 2, gatherEfficiencyPct: 1 },
    statsMax: { gatherSpeedPct: 11, gatherEfficiencyPct: 5 },
  },
  {
    id: "echo_bat",
    name: "晶耳回声蝠",
    title: "矿脉回声探子",
    role: "gather",
    artId: "crystal_bat",
    description: "矿山霸主守护的秘银矿石是它的巢材。回声探路能找出最富的矿脉与晶簇，采集更快、更丰，还能顺带积累历练。",
    bossId: "mine_boss",
    tameItems: { ore_6: 2, food_grain_meal: 10, bread: 6 },
    tameGold: 1500,
    favoriteFood: "food_vegetable_stew",
    statsLv1: { gatherSpeedPct: 3, gatherEfficiencyPct: 2, xpGainPct: 1 },
    statsMax: { gatherSpeedPct: 12, gatherEfficiencyPct: 8, xpGainPct: 3 },
  },
  {
    id: "mire_toad",
    name: "沼泽药蟾",
    title: "工坊药液调和师",
    role: "craft",
    artId: "poison_frog",
    description: "戴过沼泽之王王冠的药蟾，分泌的药液能软化木料、润滑丝线、稳住炉温。协助制造时整条工坊都跟着提速。",
    bossId: "swamp_boss",
    tameItems: { swamp_crown: 1, food_hearty_stew: 8 },
    tameGold: 3000,
    favoriteFood: "soup_herbal",
    statsLv1: { craftSpeedPct: 2, craftEfficiencyPct: 1 },
    statsMax: { craftSpeedPct: 11, craftEfficiencyPct: 6 },
  },
  {
    id: "frostmane_wolf",
    name: "霜鬃雪狼",
    title: "冰原护卫猎手",
    role: "combat",
    artId: "snow_wolf",
    description: "以霜冠雪魔的霜冠为契约信物收服的雪狼，与主人并肩作战，撕咬与护主都毫不含糊。",
    bossId: "snow_boss",
    tameItems: { frost_crown: 1, food_master_feast: 4 },
    tameGold: 6000,
    favoriteFood: "food_pork_roast",
    statsLv1: { bonusAtk: 5, bonusHp: 25 },
    statsMax: { bonusAtk: 32, bonusDef: 12, bonusHp: 160 },
  },
  {
    id: "ember_hound",
    name: "余烬炉犬",
    title: "熔炉鼓风伙计",
    role: "craft",
    artId: "cinder_hound",
    description: "烈焰魔君的魔君之角点燃了它的炉心。蹲在熔炉边吐息鼓风，锻造、炼金与烹饪都能更快出炉，还能多出一份。",
    bossId: "volcano_boss",
    tameItems: { demon_horn: 1, dish_deepsea_stew: 4 },
    tameGold: 12000,
    favoriteFood: "dish_lava_roast",
    statsLv1: { craftSpeedPct: 3, craftEfficiencyPct: 2, xpGainPct: 1 },
    statsMax: { craftSpeedPct: 12, craftEfficiencyPct: 9, xpGainPct: 3 },
  },
  {
    id: "chrono_wyrm",
    name: "时渊幼龙",
    title: "裂隙时空守护龙",
    role: "combat",
    artId: "temporal_wyrm",
    description: "时空主宰的主宰之心孕育出的幼龙，契约之后寸步不离。战斗时以龙鳞护主、以龙息压制强敌，连战利品都更丰厚。",
    bossId: "rift_boss",
    tameItems: { sovereign_heart: 1, food_royal_banquet: 2 },
    tameGold: 30000,
    favoriteFood: "dish_dragon_delicacy",
    statsLv1: { bonusAtk: 12, bonusDef: 5, bonusHp: 60 },
    statsMax: { bonusAtk: 70, bonusDef: 30, bonusHp: 320, goldGainPct: 5 },
  },
];

export interface BeastBondTierDef {
  tier: 0 | 1 | 2 | 3 | 4 | 5;
  /** 全部已驯服魔兽的等级之和达到该值即解锁（与是否出战无关）。 */
  minLevels: number;
  name: string;
  stats: BeastWeatherStats;
}

export const BEAST_BOND_TIERS: readonly BeastBondTierDef[] = [
  { tier: 0, minLevels: 0, name: "空置牧场", stats: {} },
  { tier: 1, minLevels: 1, name: "契约小牧场", stats: { goldGainPct: 1 } },
  { tier: 2, minLevels: 12, name: "灵兽庄园", stats: { goldGainPct: 1, xpGainPct: 1 } },
  { tier: 3, minLevels: 24, name: "魔兽牧野", stats: { goldGainPct: 2, xpGainPct: 2, gatherSpeedPct: 1, craftSpeedPct: 1 } },
  {
    tier: 4,
    minLevels: 40,
    name: "万兽契约原",
    stats: { goldGainPct: 3, xpGainPct: 3, gatherSpeedPct: 2, craftSpeedPct: 2, bonusHp: 30 },
  },
  {
    tier: 5,
    minLevels: 60,
    name: "星契神兽圣域",
    stats: { goldGainPct: 4, xpGainPct: 4, gatherSpeedPct: 3, craftSpeedPct: 3, bonusAtk: 10, bonusHp: 60 },
  },
];

export interface WeatherLifeSkillDef {
  skillId: string;
  name: string;
  lane: "gather" | "craft";
}

/** 受天候影响的 12 个生活职业（内容包真实技能 id）。 */
export const WEATHER_LIFE_SKILLS: readonly WeatherLifeSkillDef[] = [
  { skillId: "skill_woodcutter", name: "伐木", lane: "gather" },
  { skillId: "skill_blacksmith", name: "挖矿", lane: "gather" },
  { skillId: "skill_farmer", name: "种植", lane: "gather" },
  { skillId: "skill_chef", name: "钓鱼", lane: "gather" },
  { skillId: "skill_tailor", name: "采集", lane: "gather" },
  { skillId: "skill_alchemist", name: "水晶", lane: "gather" },
  { skillId: "skill_woodworking", name: "木工", lane: "craft" },
  { skillId: "skill_smithing", name: "锻造", lane: "craft" },
  { skillId: "skill_husbandry", name: "畜牧", lane: "craft" },
  { skillId: "skill_cooking", name: "烹饪", lane: "craft" },
  { skillId: "skill_tailoring", name: "缝纫", lane: "craft" },
  { skillId: "skill_alchemy", name: "炼金", lane: "craft" },
];

export interface WeatherDef {
  id: WeatherId;
  name: string;
  short: string;
  /** 天然天候的抽取权重（总和 100）。 */
  weight: number;
  description: string;
  /** 祈愿该天候消耗的异域星晶尘。 */
  wishDust: number;
  /** 各生活职业的产出加成（%，作为效率来源接入 getActionRates：多完成一次 = 多一份产出）。 */
  outputPct: Readonly<Record<string, number>>;
}

export const WEATHER_TYPES: readonly WeatherDef[] = [
  {
    id: "sunny",
    name: "晴空万里",
    short: "晴",
    weight: 32,
    description: "日照充足，田垄与林地生机勃勃，晾晒的棉麻也干得飞快。",
    wishDust: 10,
    outputPct: { skill_farmer: 12, skill_woodcutter: 10, skill_tailor: 8, skill_woodworking: 6, skill_cooking: 4 },
  },
  {
    id: "rain",
    name: "绵绵细雨",
    short: "雨",
    weight: 26,
    description: "细雨涨满河湖，鱼群浮上水面；牧场草料鲜嫩，灶台与药炉也更湿润好用。",
    wishDust: 10,
    outputPct: { skill_chef: 14, skill_husbandry: 8, skill_farmer: 6, skill_alchemy: 6, skill_cooking: 6 },
  },
  {
    id: "fog",
    name: "晨雾弥漫",
    short: "雾",
    weight: 20,
    description: "浓雾滋养晶簇与灵草，药剂师与织工在静谧中心无旁骛。",
    wishDust: 10,
    outputPct: { skill_alchemist: 12, skill_alchemy: 10, skill_tailoring: 8, skill_woodworking: 6, skill_chef: 4 },
  },
  {
    id: "storm",
    name: "雷暴骤雨",
    short: "雷",
    weight: 16,
    description: "雷霆劈开岩层、显露矿脉，锻炉借雷火淬炼；狂风还吹倒了不少良木。",
    wishDust: 12,
    outputPct: { skill_blacksmith: 14, skill_smithing: 12, skill_woodcutter: 6, skill_tailoring: 4, skill_alchemist: 4 },
  },
  {
    id: "aurora",
    name: "星辉极光",
    short: "极光",
    weight: 6,
    description: "罕见的星辉极光笼罩大地，百业皆旺——所有生活职业产出同时提升。",
    wishDust: 24,
    outputPct: {
      skill_woodcutter: 8,
      skill_blacksmith: 8,
      skill_farmer: 8,
      skill_chef: 8,
      skill_tailor: 8,
      skill_alchemist: 8,
      skill_woodworking: 8,
      skill_smithing: 8,
      skill_husbandry: 8,
      skill_cooking: 8,
      skill_tailoring: 8,
      skill_alchemy: 8,
    },
  },
];

export interface WeatherInsightTierDef {
  tier: 0 | 1 | 2 | 3 | 4;
  /** 累计占卜次数达到该值即晋升。 */
  minDivinations: number;
  name: string;
  /** 祈愿成功率（%；祈愿星辉极光减半）。 */
  wishChancePct: number;
}

export const WEATHER_INSIGHT_TIERS: readonly WeatherInsightTierDef[] = [
  { tier: 0, minDivinations: 0, name: "见习占星师", wishChancePct: 30 },
  { tier: 1, minDivinations: 3, name: "星图学徒", wishChancePct: 36 },
  { tier: 2, minDivinations: 8, name: "观星术士", wishChancePct: 42 },
  { tier: 3, minDivinations: 16, name: "天候祭司", wishChancePct: 48 },
  { tier: 4, minDivinations: 30, name: "星穹大占星师", wishChancePct: 55 },
];

export function isValidContractBeastId(id: unknown): id is ContractBeastId {
  return typeof id === "string" && (CONTRACT_BEAST_IDS as readonly string[]).includes(id);
}

export function isValidWeatherId(id: unknown): id is WeatherId {
  return typeof id === "string" && (WEATHER_IDS as readonly string[]).includes(id);
}

function beastWeatherCleanCount(v: unknown, cap: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.min(cap, Math.floor(n)) : 0;
}

export function getContractBeastDef(id: ContractBeastId): ContractBeastDef {
  return CONTRACT_BEASTS.find((b) => b.id === id) || CONTRACT_BEASTS[0];
}

/** 满级所需的累计喂养经验。 */
export function getBeastMaxXp(): number {
  return BEAST_LEVEL_XP[BEAST_LEVEL_XP.length - 1];
}

/** 累计喂养经验 → 等级（1~10；脏数据按 0 经验处理）。 */
export function getBeastLevel(xp: unknown): number {
  const x = beastWeatherCleanCount(xp, getBeastMaxXp());
  let level = 1;
  for (let i = 0; i < BEAST_LEVEL_XP.length; i++) {
    if (x >= BEAST_LEVEL_XP[i]) level = i + 1;
  }
  return Math.min(BEAST_MAX_LEVEL, level);
}

/** 等级进度：当前等级、本级起点经验、下一级所需经验与进度百分比。 */
export function getBeastLevelProgress(xp: unknown) {
  const x = beastWeatherCleanCount(xp, getBeastMaxXp());
  const level = getBeastLevel(x);
  const levelXp = BEAST_LEVEL_XP[level - 1];
  const nextXp = level < BEAST_MAX_LEVEL ? BEAST_LEVEL_XP[level] : null;
  const progressPct =
    nextXp === null ? 100 : Math.min(100, Math.max(0, Math.round(((x - levelXp) / Math.max(1, nextXp - levelXp)) * 100)));
  return { xp: x, level, levelXp, nextXp, progressPct };
}

/** 指定等级的出战加成：Lv.1 与 Lv.10 之间线性插值后四舍五入（Lv.0 = 未驯服，无加成）；只返回非零项。 */
export function getBeastStatsAtLevel(beastId: ContractBeastId, level: number): BeastWeatherStats {
  const def = getContractBeastDef(beastId);
  const lv = Math.min(BEAST_MAX_LEVEL, Math.max(0, Math.floor(Number(level)) || 0));
  const out: BeastWeatherStats = {};
  if (lv < 1) return out;
  for (const k of BEAST_STAT_KEYS) {
    const a = def.statsLv1[k] || 0;
    const b = def.statsMax[k] || 0;
    const v = Math.round(a + ((b - a) * (lv - 1)) / (BEAST_MAX_LEVEL - 1));
    if (v !== 0) out[k] = v;
  }
  return out;
}

/** 料理的每份喂养经验（不可喂养的物品返回 0）。 */
export function getBeastFoodXp(foodId: unknown): number {
  const f = BEAST_FOODS.find((x) => x.itemId === foodId);
  return f ? f.xp : 0;
}

/**
 * 喂养计划：按每份经验（偏好料理 ×1.5，整数向下取整）累加，只投喂到满级所需的份数为止（不浪费料理）。
 * ok = false：未知魔兽 / 不可喂养的料理 / 份数非法 / 已满级。
 */
export function planBeastFeed(beastId: unknown, currentXp: unknown, foodId: unknown, qty: unknown) {
  const maxXp = getBeastMaxXp();
  const xp0 = beastWeatherCleanCount(currentXp, maxXp);
  const levelBefore = getBeastLevel(xp0);
  const base = getBeastFoodXp(foodId);
  const want = Math.floor(Number(qty));
  const favorite = isValidContractBeastId(beastId) && getContractBeastDef(beastId).favoriteFood === foodId;
  const perItem = Math.floor((base * (favorite ? BEAST_FAVORITE_XP_PCT : 100)) / 100);
  if (!isValidContractBeastId(beastId) || perItem <= 0 || !Number.isFinite(want) || want < 1 || want > BEAST_FEED_MAX_QTY || xp0 >= maxXp) {
    return { ok: false, favorite, perItem, qtyUsed: 0, xpGained: 0, xpBefore: xp0, xpAfter: xp0, levelBefore, levelAfter: levelBefore };
  }
  const needed = Math.ceil((maxXp - xp0) / perItem);
  const qtyUsed = Math.min(want, needed);
  const xpAfter = Math.min(maxXp, xp0 + perItem * qtyUsed);
  return {
    ok: true,
    favorite,
    perItem,
    qtyUsed,
    xpGained: xpAfter - xp0,
    xpBefore: xp0,
    xpAfter,
    levelBefore,
    levelAfter: getBeastLevel(xpAfter),
  };
}

/** 已驯服魔兽的等级表（未驯服 = 0；只认合法魔兽 id 与对象记录）。 */
export function cleanBeastLevels(raw: unknown): Record<ContractBeastId, number> {
  const src = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const out = {} as Record<ContractBeastId, number>;
  for (const id of CONTRACT_BEAST_IDS) {
    const rec = src[id];
    out[id] = rec && typeof rec === "object" && !Array.isArray(rec) ? getBeastLevel((rec as { xp?: unknown }).xp) : 0;
  }
  return out;
}

/** 牧场羁绊：全部已驯服魔兽的等级之和（输入为「魔兽 id → 等级」表）决定羁绊等级（含下一等级进度）。 */
export function getBeastBond(levels: unknown) {
  const src = levels && typeof levels === "object" && !Array.isArray(levels) ? (levels as Record<string, unknown>) : {};
  let totalLevels = 0;
  for (const id of CONTRACT_BEAST_IDS) totalLevels += beastWeatherCleanCount(src[id], BEAST_MAX_LEVEL);
  let current = BEAST_BOND_TIERS[0];
  let next: BeastBondTierDef | null = null;
  for (let i = 0; i < BEAST_BOND_TIERS.length; i++) {
    if (totalLevels >= BEAST_BOND_TIERS[i].minLevels) {
      current = BEAST_BOND_TIERS[i];
      next = BEAST_BOND_TIERS[i + 1] ?? null;
    }
  }
  const progressPct = next
    ? Math.min(100, Math.max(0, Math.round(((totalLevels - current.minLevels) / Math.max(1, next.minLevels - current.minLevels)) * 100)))
    : 100;
  return { totalLevels, maxLevels: CONTRACT_BEAST_IDS.length * BEAST_MAX_LEVEL, current, next, progressPct };
}

export interface BeastRanchBonuses {
  activeBeastId: ContractBeastId | null;
  activeLevel: number;
  activeRole: BeastRoleId | null;
  activeStats: BeastWeatherStats;
  tamedCount: number;
  bondLevels: number;
  bondTier: number;
  bondName: string;
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

export type MinimalBeastRanchHolder = {
  beastRanch?: {
    beasts?: unknown;
    activeBeastId?: unknown;
  } | null;
} | null;

/** 契约魔兽牧场永久加成 = 出战伙伴（按等级插值）+ 牧场羁绊（全部魔兽等级之和）。 */
export function getBeastRanchBonuses(holder?: MinimalBeastRanchHolder): BeastRanchBonuses {
  const br = holder?.beastRanch;
  const levels = cleanBeastLevels(br && typeof br === "object" ? br.beasts : null);
  const activeRaw = br && typeof br === "object" ? br.activeBeastId : null;
  const activeBeastId = isValidContractBeastId(activeRaw) && levels[activeRaw] > 0 ? activeRaw : null;
  const activeLevel = activeBeastId ? levels[activeBeastId] : 0;
  const activeStats = activeBeastId ? getBeastStatsAtLevel(activeBeastId, activeLevel) : {};
  let tamedCount = 0;
  for (const id of CONTRACT_BEAST_IDS) if (levels[id] > 0) tamedCount += 1;
  const bond = getBeastBond(levels);
  const sum: Required<BeastWeatherStats> = {
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
  for (const k of BEAST_STAT_KEYS) sum[k] += (activeStats[k] || 0) + (bond.current.stats[k] || 0);
  return {
    activeBeastId,
    activeLevel,
    activeRole: activeBeastId ? getContractBeastDef(activeBeastId).role : null,
    activeStats,
    tamedCount,
    bondLevels: bond.totalLevels,
    bondTier: bond.current.tier,
    bondName: bond.current.name,
    ...sum,
  };
}

/** 东八区日序号（1970-01-01 东八区 = 0）。 */
export function weatherDayIndex(now: Date | number): number {
  const ms = typeof now === "number" ? now : now.getTime();
  return Math.floor((ms + WEATHER_TZ_OFFSET_MINUTES * 60_000) / 86_400_000);
}

/** 日序号 → 东八区日期键 YYYY-MM-DD。 */
export function weatherDayKeyFromIndex(index: number): string {
  return new Date(Math.floor(index) * 86_400_000).toISOString().slice(0, 10);
}

export function weatherDayKey(now: Date | number): string {
  return weatherDayKeyFromIndex(weatherDayIndex(now));
}

/** 日期键 → 日序号；非法键返回 null。 */
export function weatherDayIndexFromKey(key: unknown): number | null {
  if (typeof key !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const ms = Date.parse(`${key}T00:00:00.000Z`);
  if (!Number.isFinite(ms)) return null;
  const index = Math.floor(ms / 86_400_000);
  return weatherDayKeyFromIndex(index) === key ? index : null;
}

/** 当前东八区日结束（次日 0 点）的 UTC 毫秒时间戳。 */
export function weatherDayEndsAtMs(now: Date | number): number {
  return (weatherDayIndex(now) + 1) * 86_400_000 - WEATHER_TZ_OFFSET_MINUTES * 60_000;
}

/** 32 位整数混合哈希（天候生成与祈愿判定的唯一随机源，纯确定性）。 */
export function weatherHash(a: number, b: number): number {
  let h = (Math.imul((a | 0) ^ 0x3c6ef372, 0xcc9e2d51) + Math.imul((b | 0) + 0x1b873593, 0x85ebca6b)) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

export function getWeatherDef(id: WeatherId): WeatherDef {
  return WEATHER_TYPES.find((w) => w.id === id) || WEATHER_TYPES[0];
}

/** 某日的天然天候：由东八区日序号哈希后按权重抽取（同一天全服一致）。 */
export function getNaturalWeather(dayIndex: number): WeatherId {
  const d = Number.isFinite(dayIndex) ? Math.floor(dayIndex) : 0;
  const total = WEATHER_TYPES.reduce((s, w) => s + w.weight, 0);
  let roll = weatherHash(d, 0x5eed) % total;
  for (const w of WEATHER_TYPES) {
    if (roll < w.weight) return w.id;
    roll -= w.weight;
  }
  return WEATHER_TYPES[0].id;
}

/** 观星阅历：累计占卜次数决定占星师称号与祈愿成功率。 */
export function getWeatherInsight(totalDivinations: unknown) {
  const n = beastWeatherCleanCount(totalDivinations, 1_000_000);
  let current = WEATHER_INSIGHT_TIERS[0];
  let next: WeatherInsightTierDef | null = null;
  for (let i = 0; i < WEATHER_INSIGHT_TIERS.length; i++) {
    if (n >= WEATHER_INSIGHT_TIERS[i].minDivinations) {
      current = WEATHER_INSIGHT_TIERS[i];
      next = WEATHER_INSIGHT_TIERS[i + 1] ?? null;
    }
  }
  const progressPct = next
    ? Math.min(100, Math.max(0, Math.round(((n - current.minDivinations) / Math.max(1, next.minDivinations - current.minDivinations)) * 100)))
    : 100;
  return { totalDivinations: n, current, next, progressPct };
}

/** 祈愿成功率（%）：观星阅历决定，封顶 55%；祈愿星辉极光减半。 */
export function getWeatherWishChance(totalDivinations: unknown, wish: unknown): number {
  if (!isValidWeatherId(wish)) return 0;
  const base = Math.min(WEATHER_WISH_CHANCE_CAP, getWeatherInsight(totalDivinations).current.wishChancePct);
  return wish === "aurora" ? Math.floor(base / 2) : base;
}

/** 祈愿判定：目标日序号 + 祈愿天候哈希取 0~99，小于成功率即应验（确定性，可复现）。 */
export function rollWeatherWish(dayIndex: number, wish: unknown, chancePct: unknown): boolean {
  if (!isValidWeatherId(wish) || !Number.isFinite(dayIndex)) return false;
  const chance = Math.min(WEATHER_WISH_CHANCE_CAP, beastWeatherCleanCount(chancePct, 100));
  return weatherHash(Math.floor(dayIndex), 0x77150 + WEATHER_IDS.indexOf(wish)) % 100 < chance;
}

export type MinimalWeatherTowerHolder = {
  weatherTower?: {
    forecasts?: unknown;
  } | null;
} | null;

/** 某日的最终天候：该日有已应验的祈愿则为祈愿天候，否则为天然天候。 */
export function getWeatherForDay(dayKey: unknown, tower?: { forecasts?: unknown } | null): WeatherId {
  const index = weatherDayIndexFromKey(dayKey);
  if (index === null) return WEATHER_TYPES[0].id;
  const list = tower && typeof tower === "object" && Array.isArray(tower.forecasts) ? (tower.forecasts as unknown[]) : [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const f = raw as { dayKey?: unknown; wish?: unknown; granted?: unknown };
    if (f.dayKey === dayKey && f.granted === true && isValidWeatherId(f.wish)) return f.wish;
  }
  return getNaturalWeather(index);
}

/** 天候对某个生活职业的产出加成（%）。 */
export function getWeatherOutputPct(weather: WeatherId, skillId: unknown): number {
  const pct = getWeatherDef(weather).outputPct[String(skillId)];
  return typeof pct === "number" && pct > 0 ? pct : 0;
}

/**
 * 天候加护：登临过观星塔（weatherTower 已建立）后，按「now 所在东八区日期」的最终天候提升各生活职业产出；
 * 未登临过观星塔的旧存档不受天候影响（active = false）。
 */
export function getWeatherTowerEffect(holder: MinimalWeatherTowerHolder | undefined, now: Date | number) {
  const tower = holder?.weatherTower;
  const active = Boolean(tower && typeof tower === "object");
  const dayKey = weatherDayKey(now);
  const weather = getWeatherForDay(dayKey, active ? tower : null);
  const outputPct: Record<string, number> = {};
  for (const s of WEATHER_LIFE_SKILLS) {
    const pct = active ? getWeatherOutputPct(weather, s.skillId) : 0;
    if (pct > 0) outputPct[s.skillId] = pct;
  }
  return { active, dayKey, weather, outputPct };
}

/* ---- 以上为 WL-14 core ---- */

/** 魔兽 / 羁绊 / 天候加成 → 面板展示用短句（只列非零项）。 */
export function formatBeastWeatherStats(s: BeastWeatherStats | null | undefined): string[] {
  if (!s) return [];
  const out: string[] = [];
  if (s.gatherSpeedPct) out.push(`采集速度 +${s.gatherSpeedPct}%`);
  if (s.gatherEfficiencyPct) out.push(`采集产出 +${s.gatherEfficiencyPct}%`);
  if (s.craftSpeedPct) out.push(`制作速度 +${s.craftSpeedPct}%`);
  if (s.craftEfficiencyPct) out.push(`制作产出 +${s.craftEfficiencyPct}%`);
  if (s.xpGainPct) out.push(`生活技能经验 +${s.xpGainPct}%`);
  if (s.goldGainPct) out.push(`单人战斗金币 +${s.goldGainPct}%`);
  if (s.bonusAtk) out.push(`攻击 +${s.bonusAtk}`);
  if (s.bonusDef) out.push(`防御 +${s.bonusDef}`);
  if (s.bonusHp) out.push(`生命 +${s.bonusHp}`);
  return out;
}

/** 某天候提升的生活职业 → ["钓鱼 +14%", "畜牧 +8%", …]。 */
export function formatWeatherOutputs(weather: WeatherId): string[] {
  return WEATHER_LIFE_SKILLS.map((s) => ({ name: s.name, pct: getWeatherOutputPct(weather, s.skillId) }))
    .filter((x) => x.pct > 0)
    .map((x) => `${x.name} +${x.pct}%`);
}

/** 东八区日期键 → 「11 月 19 日」。 */
export function formatWeatherDayLabel(dayKey: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dayKey));
  if (!m) return String(dayKey);
  return `${Number(m[2])} 月 ${Number(m[3])} 日`;
}
