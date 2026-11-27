// 浮空飞艇商路 & 圣骑士团荣誉试炼 (WL-16) —— 前端镜像。
// 与 backend/src/progression2/airship_paladin.ts 同名表与纯函数逐字对称（scripts/airship-paladin-parity.test.ts 守护），
// 供面板展示既有城镇间的航线、东八区日行情与购入 / 卖出预览、航线等级与船体，以及按周轮换的六关试炼幻影、
// 荣誉位阶与誓言加成；誓言的永久攻防血 / 金币通过 combatSheet.combinedBuildFromState 接入（后端 playerBuildExtras 同口径），
// 经验 / 金币倍率由后端 getActionRates 计入。previewPaladinTrialDuel 以 fightPreview.previewFight 逐步镜像后端
// simulatePaladinTrialDuel（与天空竞技场同一 hp_combat 沙盒）。任何数值改动必须两端同步。
import type { CombatSheet } from "./combatSheet";
import { previewFight, type PreviewAbility, type PreviewMonster } from "./fightPreview";
import { resolveMechanicDefs, type BossMechanicDef } from "./bossMechanics";

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

/* ---- 以下为与后端逐字对称的表与纯函数（WL-16 core） ---- */

export const AIRSHIP_TOWN_IDS: readonly AirshipTownId[] = ["guild_town", "frostport", "emberoasis", "starfallspire"];

export const AIRSHIP_GOOD_IDS: readonly AirshipGoodId[] = [
  "cheese_wheel",
  "dyed_cloth",
  "fish_deepsea",
  "snow_pelt",
  "ingot_4",
  "obsidian_chunk",
  "crystal_4",
  "tea_spirit",
];

export const AIRSHIP_ROUTE_IDS: readonly AirshipRouteId[] = [
  "guild_frostport",
  "guild_emberoasis",
  "guild_starfall",
  "frost_ember",
  "ember_starfall",
  "starfall_frost",
];

export const PALADIN_VIRTUE_IDS: readonly PaladinVirtueId[] = ["valor", "aegis", "vigor", "glory"];

export const PALADIN_THEME_IDS: readonly PaladinThemeId[] = ["bulwark", "blade", "radiance", "gale"];

/** 飞艇集市按东八区日期（每日 0 点）换行情、补货。 */
export const AIRSHIP_TZ_OFFSET_MINUTES = 480;
/** 每种特产每个东八区日在产地的存货（件）。 */
export const AIRSHIP_DAILY_STOCK = 40;
/** 单笔买卖的件数上限。 */
export const AIRSHIP_MAX_TRADE_QTY = 999;
/** 产地出售价：基准价的 80% ~ 92%（按日浮动）。 */
export const AIRSHIP_BUY_MIN_PCT = 80;
export const AIRSHIP_BUY_SWING_PCT = 12;
/** 外地收购价围绕需求基准上下浮动的幅度（百分点）。 */
export const AIRSHIP_SELL_SWING_PCT = 25;
/** 计数器上限（防脏档溢出）。 */
export const AIRSHIP_COUNTER_CAP = 1_000_000_000;
/** 一趟载货航程计入航线经验时最多按 100 件货计。 */
export const AIRSHIP_XP_CARGO_CAP = 100;
/** 船体与航线提速合计后，航程最少保留基准时长的 40%。 */
export const AIRSHIP_MIN_DURATION_PCT = 40;

/** 荣誉试炼按东八区自然周（周一 0 点）轮换。 */
export const PALADIN_TZ_OFFSET_MINUTES = 480;
export const PALADIN_WEEK_MS = 7 * 86_400_000;
/** 1970-01-05（周一）为第 0 周。 */
export const PALADIN_WEEK_EPOCH_MS = Date.UTC(1970, 0, 5);
/** 每周挑战次数（胜负都消耗 1 次）。 */
export const PALADIN_WEEKLY_ATTEMPTS = 10;
/** 试炼对决上限 10 分钟（与天空竞技场同一沙盒规则），超时判负。 */
export const PALADIN_MAX_FIGHT_MS = 600_000;
/** 一周内六关全通的额外荣誉勋章。 */
export const PALADIN_FULL_CLEAR_BONUS = 10;
export const PALADIN_MEDAL_CAP = 99_999;
export const PALADIN_VIRTUE_MAX_RANK = 5;
/** 誓言升到第 n 阶花费的荣誉勋章（下标 n-1）。 */
export const PALADIN_VIRTUE_COSTS: readonly number[] = [6, 12, 20, 30, 45];

export interface AirshipTownDef {
  id: AirshipTownId;
  name: string;
  /** 城镇美术：复用 WL-13 公会城镇与 WL-7 远征商队航路的真实图标（skills/<artId>）。 */
  artId: string;
  /** 城镇出处（既有系统）。 */
  source: string;
  description: string;
}

export const AIRSHIP_TOWNS: readonly AirshipTownDef[] = [
  {
    id: "guild_town",
    name: "公会城镇",
    artId: "guild_town",
    source: "天空竞技场与公会城镇",
    description: "你亲手建起的公会城镇，飞艇船坞就挨着集市广场，乳酪与染布是这里的招牌。",
  },
  {
    id: "frostport",
    name: "极北凛风冰港",
    artId: "caravan_route_frostport",
    source: "远征商队 · 凛风冰港航路",
    description: "冰封船坞终年寒风，深海鱼与雪兽厚皮最出名，也最缺热乎的乳酪与金锭。",
  },
  {
    id: "emberoasis",
    name: "炎阳赤砂绿洲",
    artId: "caravan_route_emberoasis",
    source: "远征商队 · 赤砂绿洲航路",
    description: "大漠矿道里出金锭与黑曜石块，商驿高价收购清凉的鱼鲜与各色布匹。",
  },
  {
    id: "starfallspire",
    name: "云巅星坠秘塔",
    artId: "caravan_route_starfallspire",
    source: "远征商队 · 星坠秘塔航路",
    description: "星象法师塔产炽光水晶与灵茶，塔里的学者愿为黑曜石与雪兽厚皮掏出重金。",
  },
];

export interface AirshipGoodDef {
  /** 内容包真实物品 id（图标即物品美术）。 */
  id: AirshipGoodId;
  /** 产地（只有产地出售，产地不收购）。 */
  origin: AirshipTownId;
  /** 基准价 = 内容包物品 value。 */
  basePrice: number;
  /** 需要的船体等级（贵重货物要更结实的货舱）。 */
  minHull: number;
  /** 外地城镇的收购需求基准（百分比，按日 ±25 浮动）。 */
  demand: Partial<Record<AirshipTownId, number>>;
}

export const AIRSHIP_GOODS: readonly AirshipGoodDef[] = [
  { id: "cheese_wheel", origin: "guild_town", basePrice: 28, minHull: 1, demand: { frostport: 150, emberoasis: 135, starfallspire: 120 } },
  { id: "dyed_cloth", origin: "guild_town", basePrice: 35, minHull: 1, demand: { frostport: 120, emberoasis: 145, starfallspire: 135 } },
  { id: "fish_deepsea", origin: "frostport", basePrice: 87, minHull: 1, demand: { guild_town: 125, emberoasis: 155, starfallspire: 130 } },
  { id: "snow_pelt", origin: "frostport", basePrice: 104, minHull: 2, demand: { guild_town: 130, emberoasis: 115, starfallspire: 150 } },
  { id: "ingot_4", origin: "emberoasis", basePrice: 55, minHull: 1, demand: { guild_town: 135, frostport: 145, starfallspire: 120 } },
  { id: "obsidian_chunk", origin: "emberoasis", basePrice: 198, minHull: 3, demand: { guild_town: 120, frostport: 135, starfallspire: 150 } },
  { id: "crystal_4", origin: "starfallspire", basePrice: 55, minHull: 1, demand: { guild_town: 140, frostport: 130, emberoasis: 125 } },
  { id: "tea_spirit", origin: "starfallspire", basePrice: 60, minHull: 2, demand: { guild_town: 145, frostport: 150, emberoasis: 120 } },
];

export interface AirshipHullDef {
  level: number;
  name: string;
  /** 货舱容量（件）。 */
  capacity: number;
  /** 航程缩短（百分点）。 */
  speedPct: number;
  /** 升到该级的金币花费（1 级为初始船体）。 */
  costGold: number;
  /** 升到该级消耗的真实生活职业成品。 */
  materials: Record<string, number>;
}

export const AIRSHIP_HULLS: readonly AirshipHullDef[] = [
  { level: 1, name: "轻木飞艇", capacity: 20, speedPct: 0, costGold: 0, materials: {} },
  { level: 2, name: "加固木骨飞艇", capacity: 32, speedPct: 5, costGold: 1500, materials: { lumber_3: 20, ingot_2: 12 } },
  { level: 3, name: "银铆远航飞艇", capacity: 46, speedPct: 10, costGold: 4000, materials: { lumber_4: 20, ingot_3: 15, yarn_3: 10 } },
  { level: 4, name: "金帆巡天飞艇", capacity: 60, speedPct: 15, costGold: 9000, materials: { lumber_5: 20, ingot_4: 15, crystal_4: 10 } },
  { level: 5, name: "星辉旗舰飞艇", capacity: 76, speedPct: 20, costGold: 18000, materials: { lumber_6: 20, ingot_5: 18, crystal_5: 12 } },
];

export interface AirshipRouteDef {
  id: AirshipRouteId;
  name: string;
  /** 航线两端的既有城镇（双向通航）。 */
  from: AirshipTownId;
  to: AirshipTownId;
  /** 基准航程（分钟）。 */
  baseMinutes: number;
  /** 开辟航线的金币花费。 */
  openCost: number;
  /** 开辟所需的船体等级。 */
  minHull: number;
  description: string;
}

export const AIRSHIP_ROUTES: readonly AirshipRouteDef[] = [
  {
    id: "guild_frostport",
    name: "北境冰港航线",
    from: "guild_town",
    to: "frostport",
    baseMinutes: 20,
    openCost: 300,
    minHull: 1,
    description: "沿着远征商队的北上旧道升空，云层下就是凛风冰港的灯塔。",
  },
  {
    id: "guild_emberoasis",
    name: "赤砂绿洲航线",
    from: "guild_town",
    to: "emberoasis",
    baseMinutes: 25,
    openCost: 600,
    minHull: 1,
    description: "越过赤色沙海的热气流，绿洲商驿的风铃远远就能听见。",
  },
  {
    id: "guild_starfall",
    name: "星坠云海航线",
    from: "guild_town",
    to: "starfallspire",
    baseMinutes: 30,
    openCost: 900,
    minHull: 1,
    description: "一路爬升穿过云海，星坠秘塔的塔尖就浮在云上。",
  },
  {
    id: "frost_ember",
    name: "冰火长风航线",
    from: "frostport",
    to: "emberoasis",
    baseMinutes: 35,
    openCost: 2500,
    minHull: 2,
    description: "从寒港直下大漠的长风航道，温差剧烈，需要加固过的船体。",
  },
  {
    id: "ember_starfall",
    name: "熔金星路航线",
    from: "emberoasis",
    to: "starfallspire",
    baseMinutes: 35,
    openCost: 3500,
    minHull: 3,
    description: "沿着熔金色的晚霞爬升到星坠秘塔，银铆船体才扛得住高空乱流。",
  },
  {
    id: "starfall_frost",
    name: "极光天穹航线",
    from: "starfallspire",
    to: "frostport",
    baseMinutes: 40,
    openCost: 5000,
    minHull: 4,
    description: "在极光里穿行的最高航道，只有金帆巡天飞艇敢走。",
  },
];

export interface AirshipRouteLevelDef {
  level: number;
  /** 累计航线经验达到该值即升级（每趟载货航程 1 + 每 10 件货 1 点）。 */
  minXp: number;
  /** 航程缩短（百分点）。 */
  speedPct: number;
  /** 经此航线抵港后，在该港卖货的收购价加成（百分比）。 */
  sellBonusPct: number;
}

export const AIRSHIP_ROUTE_LEVELS: readonly AirshipRouteLevelDef[] = [
  { level: 1, minXp: 0, speedPct: 0, sellBonusPct: 0 },
  { level: 2, minXp: 6, speedPct: 4, sellBonusPct: 2 },
  { level: 3, minXp: 18, speedPct: 8, sellBonusPct: 4 },
  { level: 4, minXp: 40, speedPct: 12, sellBonusPct: 6 },
  { level: 5, minXp: 75, speedPct: 16, sellBonusPct: 8 },
];

export interface PaladinStats {
  bonusAtk?: number;
  bonusDef?: number;
  bonusHp?: number;
  goldGainPct?: number;
  xpGainPct?: number;
}

export const PALADIN_STAT_KEYS: readonly (keyof PaladinStats)[] = ["bonusAtk", "bonusDef", "bonusHp", "goldGainPct", "xpGainPct"];

/** 荣誉试炼永久加成封顶（四项誓言满阶恰好到顶；脏档再高也不会超过）。 */
export const PALADIN_BONUS_CAPS: Required<PaladinStats> = { bonusAtk: 15, bonusDef: 10, bonusHp: 150, goldGainPct: 5, xpGainPct: 5 };

export interface PaladinFoeDef {
  /** 内容包真实怪物 id（立绘即怪物美术）。 */
  monsterId: string;
  name: string;
  /** 以下战斗属性逐项取自内容包怪物（parity 测试守护）。 */
  level: number;
  hp: number;
  atk: number;
  def: number;
  attackIntervalMs: number;
}

/** 圣骑士团以幻术重现的魔物（真实怪物的战斗属性）。 */
export const PALADIN_FOES: readonly PaladinFoeDef[] = [
  { monsterId: "ore_rat", name: "矿石鼠", level: 15, hp: 313, atk: 18, def: 7, attackIntervalMs: 1500 },
  { monsterId: "magma_worm", name: "岩浆虫", level: 17, hp: 370, atk: 33, def: 13, attackIntervalMs: 3400 },
  { monsterId: "iron_spider", name: "钢铁蜘蛛", level: 18, hp: 462, atk: 24, def: 12, attackIntervalMs: 2400 },
  { monsterId: "swamp_zombie", name: "沼泽僵尸", level: 23, hp: 336, atk: 27, def: 36, attackIntervalMs: 3000 },
  { monsterId: "mud_elemental", name: "泥浆元素", level: 25, hp: 600, atk: 31, def: 21, attackIntervalMs: 3200 },
  { monsterId: "ice_golem", name: "寒冰傀儡", level: 37, hp: 622, atk: 64, def: 52, attackIntervalMs: 3000 },
  { monsterId: "snow_harpy", name: "雪羽鹰身女妖", level: 40, hp: 1085, atk: 68, def: 31, attackIntervalMs: 3400 },
  { monsterId: "frozen_knight", name: "冰封骑士", level: 42, hp: 1352, atk: 50, def: 30, attackIntervalMs: 2400 },
  { monsterId: "yeti", name: "暴雪雪人", level: 44, hp: 1053, atk: 62, def: 69, attackIntervalMs: 3000 },
  { monsterId: "flame_wraith", name: "烈焰怨灵", level: 57, hp: 2434, atk: 97, def: 57, attackIntervalMs: 3400 },
  { monsterId: "inferno_drake", name: "炼狱火龙", level: 59, hp: 1917, atk: 93, def: 114, attackIntervalMs: 3000 },
  { monsterId: "void_specter", name: "虚空幽魂", level: 64, hp: 1879, atk: 115, def: 61, attackIntervalMs: 3400 },
  { monsterId: "dread_knight", name: "恐惧骑士", level: 67, hp: 2538, atk: 106, def: 58, attackIntervalMs: 2400 },
  { monsterId: "sky_guardian", name: "天穹守卫", level: 79, hp: 3142, atk: 135, def: 80, attackIntervalMs: 2400 },
  { monsterId: "seraph_sentinel", name: "炽天哨兵", level: 85, hp: 3519, atk: 157, def: 199, attackIntervalMs: 3000 },
  { monsterId: "divine_colossus", name: "神圣巨像", level: 87, hp: 5769, atk: 179, def: 113, attackIntervalMs: 3400 },
  { monsterId: "archon", name: "执政天神", level: 89, hp: 6638, atk: 193, def: 120, attackIntervalMs: 3200 },
  { monsterId: "soul_reaper", name: "噬魂收割者", level: 111, hp: 6358, atk: 246, def: 150, attackIntervalMs: 3400 },
  { monsterId: "lava_titan", name: "熔岩泰坦", level: 114, hp: 5599, atk: 230, def: 296, attackIntervalMs: 3000 },
  { monsterId: "infernal_dragon", name: "炼狱魔龙", level: 116, hp: 8747, atk: 260, def: 166, attackIntervalMs: 3400 },
  { monsterId: "hell_sovereign", name: "地狱亲王", level: 120, hp: 8208, atk: 245, def: 353, attackIntervalMs: 3000 },
  { monsterId: "astral_judge", name: "星界审判者", level: 133, hp: 12353, atk: 264, def: 169, attackIntervalMs: 2400 },
  { monsterId: "demigod", name: "半神祭司", level: 134, hp: 13115, atk: 310, def: 202, attackIntervalMs: 3400 },
  { monsterId: "genesis_herald", name: "创世先知", level: 135, hp: 14399, atk: 313, def: 210, attackIntervalMs: 3400 },
];

export interface PaladinStageDef {
  stage: number;
  name: string;
  /** 本关幻影的候选魔物（每周按周序号哈希抽一只）。 */
  pool: readonly string[];
  /** 本周首次通关获得的荣誉勋章。 */
  medals: number;
  /** 生命倍率（百分比；终关试炼官额外加厚）。 */
  hpPct: number;
  /** 终关为首领判定，并带上本周誓约的内容包首领机制。 */
  boss: boolean;
}

export const PALADIN_STAGES: readonly PaladinStageDef[] = [
  { stage: 1, name: "见习之试", pool: ["ore_rat", "magma_worm", "iron_spider", "swamp_zombie", "mud_elemental"], medals: 3, hpPct: 100, boss: false },
  { stage: 2, name: "侍从之试", pool: ["ice_golem", "snow_harpy", "frozen_knight", "yeti"], medals: 4, hpPct: 100, boss: false },
  { stage: 3, name: "骑士之试", pool: ["flame_wraith", "inferno_drake", "void_specter", "dread_knight"], medals: 6, hpPct: 100, boss: false },
  { stage: 4, name: "圣殿之试", pool: ["sky_guardian", "seraph_sentinel", "divine_colossus", "archon"], medals: 8, hpPct: 100, boss: false },
  { stage: 5, name: "誓约之试", pool: ["soul_reaper", "lava_titan", "infernal_dragon", "hell_sovereign"], medals: 11, hpPct: 100, boss: false },
  { stage: 6, name: "圣骑士长之试", pool: ["astral_judge", "demigod", "genesis_herald"], medals: 15, hpPct: 130, boss: true },
];

export interface PaladinThemeDef {
  id: PaladinThemeId;
  name: string;
  /** 幻影名前缀。 */
  prefix: string;
  description: string;
  /** 本周幻影的属性倍率（百分比，整数运算两端一致）。 */
  hpPct: number;
  atkPct: number;
  defPct: number;
  intervalPct: number;
  /** 终关试炼官带上的内容包首领机制。 */
  mechanics: readonly string[];
}

export const PALADIN_THEMES: readonly PaladinThemeDef[] = [
  {
    id: "bulwark",
    name: "坚盾之周",
    prefix: "坚盾",
    description: "幻影披上圣骑士团的塔盾，防御 +25%；试炼官血量六成时举盾格挡，重劈可破。",
    hpPct: 100,
    atkPct: 100,
    defPct: 125,
    intervalPct: 100,
    mechanics: ["guard_60"],
  },
  {
    id: "blade",
    name: "烈刃之周",
    prefix: "烈刃",
    description: "幻影的兵刃燃起圣火，攻击 +15%；试炼官三成血时进入狂怒。",
    hpPct: 100,
    atkPct: 115,
    defPct: 100,
    intervalPct: 100,
    mechanics: ["nature_wrath_30"],
  },
  {
    id: "radiance",
    name: "圣光之周",
    prefix: "圣光",
    description: "圣光加护幻影，生命 +20%；试炼官每 15 秒展开六翼神盾。",
    hpPct: 120,
    atkPct: 100,
    defPct: 100,
    intervalPct: 100,
    mechanics: ["seraph_aegis_15s"],
  },
  {
    id: "gale",
    name: "疾风之周",
    prefix: "疾风",
    description: "疾风祝福让幻影出手更快，攻击间隔 -12%；试炼官四成血时开启时间加速领域。",
    hpPct: 100,
    atkPct: 100,
    defPct: 100,
    intervalPct: 88,
    mechanics: ["chrono_haste_40"],
  },
];

export interface PaladinVirtueDef {
  id: PaladinVirtueId;
  name: string;
  description: string;
  /** 每阶永久加成（满 5 阶即达封顶）。 */
  perRank: PaladinStats;
}

export const PALADIN_VIRTUES: readonly PaladinVirtueDef[] = [
  { id: "valor", name: "勇气誓言", description: "向圣骑士团宣誓不退，每阶攻击 +3。", perRank: { bonusAtk: 3 } },
  { id: "aegis", name: "守护誓言", description: "以盾护佑同伴，每阶防御 +2。", perRank: { bonusDef: 2 } },
  { id: "vigor", name: "坚忍誓言", description: "在试炼中磨砺体魄，每阶生命 +30。", perRank: { bonusHp: 30 } },
  { id: "glory", name: "荣光誓言", description: "荣光随行，每阶单人战斗金币与生活技能经验各 +1%。", perRank: { goldGainPct: 1, xpGainPct: 1 } },
];

export interface PaladinHonorRankDef {
  rank: number;
  /** 累计获得的荣誉勋章（只增不减）达到该值即晋升。 */
  minMedals: number;
  name: string;
}

/** 荣誉位阶：誓言升到第 n 阶需要位阶 ≥ n-1。 */
export const PALADIN_HONOR_RANKS: readonly PaladinHonorRankDef[] = [
  { rank: 0, minMedals: 0, name: "见习侍从" },
  { rank: 1, minMedals: 20, name: "圣骑士团侍从" },
  { rank: 2, minMedals: 60, name: "白银骑士" },
  { rank: 3, minMedals: 140, name: "圣殿骑士" },
  { rank: 4, minMedals: 260, name: "圣骑士" },
  { rank: 5, minMedals: 420, name: "圣骑士长" },
];

export function isValidAirshipTownId(id: unknown): id is AirshipTownId {
  return typeof id === "string" && (AIRSHIP_TOWN_IDS as readonly string[]).includes(id);
}

export function isValidAirshipGoodId(id: unknown): id is AirshipGoodId {
  return typeof id === "string" && (AIRSHIP_GOOD_IDS as readonly string[]).includes(id);
}

export function isValidAirshipRouteId(id: unknown): id is AirshipRouteId {
  return typeof id === "string" && (AIRSHIP_ROUTE_IDS as readonly string[]).includes(id);
}

export function isValidPaladinVirtueId(id: unknown): id is PaladinVirtueId {
  return typeof id === "string" && (PALADIN_VIRTUE_IDS as readonly string[]).includes(id);
}

function airshipCleanCount(v: unknown, cap: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.min(cap, Math.floor(n)) : 0;
}

function airshipObj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

export function getAirshipTownDef(id: AirshipTownId): AirshipTownDef {
  return AIRSHIP_TOWNS.find((t) => t.id === id) || AIRSHIP_TOWNS[0];
}

export function getAirshipGoodDef(id: AirshipGoodId): AirshipGoodDef {
  return AIRSHIP_GOODS.find((g) => g.id === id) || AIRSHIP_GOODS[0];
}

export function getAirshipRouteDef(id: AirshipRouteId): AirshipRouteDef {
  return AIRSHIP_ROUTES.find((r) => r.id === id) || AIRSHIP_ROUTES[0];
}

/** 船体等级（脏数据按 1 级；超出按满级）。 */
export function getAirshipHull(level: unknown): AirshipHullDef {
  const n = Math.min(AIRSHIP_HULLS.length, Math.max(1, airshipCleanCount(level, AIRSHIP_HULLS.length)));
  return AIRSHIP_HULLS[n - 1];
}

/** 东八区日序号（1970-01-01 东八区 = 0）。 */
export function airshipDayIndex(now: Date | number): number {
  const ms = typeof now === "number" ? now : now.getTime();
  return Math.floor((ms + AIRSHIP_TZ_OFFSET_MINUTES * 60_000) / 86_400_000);
}

/** 日序号 → 东八区日期键 YYYY-MM-DD。 */
export function airshipDayKeyFromIndex(index: number): string {
  return new Date(Math.floor(index) * 86_400_000).toISOString().slice(0, 10);
}

export function airshipDayKey(now: Date | number): string {
  return airshipDayKeyFromIndex(airshipDayIndex(now));
}

/** 日期键 → 日序号；非法键返回 null。 */
export function airshipDayIndexFromKey(key: unknown): number | null {
  if (typeof key !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const ms = Date.parse(`${key}T00:00:00.000Z`);
  if (!Number.isFinite(ms)) return null;
  const index = Math.floor(ms / 86_400_000);
  return airshipDayKeyFromIndex(index) === key ? index : null;
}

/** 当前东八区日结束（次日 0 点）的 UTC 毫秒时间戳。 */
export function airshipDayEndsAtMs(now: Date | number): number {
  return (airshipDayIndex(now) + 1) * 86_400_000 - AIRSHIP_TZ_OFFSET_MINUTES * 60_000;
}

/** 32 位整数混合哈希（行情与试炼幻影的唯一随机源，纯确定性）。 */
export function airshipHash(a: number, b: number): number {
  let h = (Math.imul((a | 0) ^ 0x3c6ef372, 0x9e3779b1) + Math.imul((b | 0) + 0x1b873593, 0x85ebca77)) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d) >>> 0;
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39) >>> 0;
  h ^= h >>> 15;
  return h >>> 0;
}

/** 产地今日出售价：基准价 × (80% ~ 92%)，按东八区日序号哈希确定（同一天全服一致）。 */
export function getAirshipBuyQuote(dayIndex: number, goodId: unknown) {
  if (!isValidAirshipGoodId(goodId)) return null;
  const d = Number.isFinite(dayIndex) ? Math.floor(dayIndex) : 0;
  const def = getAirshipGoodDef(goodId);
  const gi = AIRSHIP_GOOD_IDS.indexOf(def.id);
  const pct = AIRSHIP_BUY_MIN_PCT + (airshipHash(d, 0xb100 + gi) % (AIRSHIP_BUY_SWING_PCT + 1));
  return { goodId: def.id, townId: def.origin, pct, price: Math.max(1, Math.floor((def.basePrice * pct) / 100)) };
}

/**
 * 外地今日收购价：基准价 × (需求基准 ± 25%)，再乘抵港航线的等级加成；产地不收购本地特产（返回 null）。
 */
export function getAirshipSellQuote(dayIndex: number, townId: unknown, goodId: unknown, sellBonusPct: unknown = 0) {
  if (!isValidAirshipTownId(townId) || !isValidAirshipGoodId(goodId)) return null;
  const def = getAirshipGoodDef(goodId);
  const demand = def.demand[townId];
  if (def.origin === townId || !demand) return null;
  const d = Number.isFinite(dayIndex) ? Math.floor(dayIndex) : 0;
  const ti = AIRSHIP_TOWN_IDS.indexOf(townId);
  const gi = AIRSHIP_GOOD_IDS.indexOf(def.id);
  const pct = demand - AIRSHIP_SELL_SWING_PCT + (airshipHash(d, 0x5e00 + ti * 16 + gi) % (AIRSHIP_SELL_SWING_PCT * 2 + 1));
  const bonusPct = airshipCleanCount(sellBonusPct, 100);
  const listPrice = Math.max(1, Math.floor((def.basePrice * pct) / 100));
  return { goodId: def.id, townId, pct, bonusPct, listPrice, price: Math.max(1, Math.floor((listPrice * (100 + bonusPct)) / 100)) };
}

/** 某个东八区日的全图行情：各城镇出售的本地特产与收购的外地特产（不含航线加成）。 */
export function getAirshipMarket(dayIndex: number) {
  return AIRSHIP_TOWN_IDS.map((townId) => ({
    townId,
    buys: AIRSHIP_GOODS.filter((g) => g.origin === townId).map((g) => getAirshipBuyQuote(dayIndex, g.id)!),
    sells: AIRSHIP_GOODS.filter((g) => g.origin !== townId).map((g) => getAirshipSellQuote(dayIndex, townId, g.id)!),
  }));
}

/** 航线等级：累计航线经验决定等级、提速与收购价加成（含下一级进度）。 */
export function getAirshipRouteLevel(xp: unknown) {
  const n = airshipCleanCount(xp, AIRSHIP_COUNTER_CAP);
  let current = AIRSHIP_ROUTE_LEVELS[0];
  let next: AirshipRouteLevelDef | null = null;
  for (let i = 0; i < AIRSHIP_ROUTE_LEVELS.length; i++) {
    if (n >= AIRSHIP_ROUTE_LEVELS[i].minXp) {
      current = AIRSHIP_ROUTE_LEVELS[i];
      next = AIRSHIP_ROUTE_LEVELS[i + 1] ?? null;
    }
  }
  const progressPct = next
    ? Math.min(100, Math.max(0, Math.round(((n - current.minXp) / Math.max(1, next.minXp - current.minXp)) * 100)))
    : 100;
  return { xp: n, level: current.level, speedPct: current.speedPct, sellBonusPct: current.sellBonusPct, current, next, progressPct };
}

/** 航线另一端：fromTown 不是该航线的端点时返回 null。 */
export function airshipRouteDestination(routeId: unknown, fromTown: unknown): AirshipTownId | null {
  if (!isValidAirshipRouteId(routeId) || !isValidAirshipTownId(fromTown)) return null;
  const r = getAirshipRouteDef(routeId);
  if (r.from === fromTown) return r.to;
  if (r.to === fromTown) return r.from;
  return null;
}

/** 航程时长 = 基准分钟 × (100 - 船体提速 - 航线提速)%，最少保留 40%。 */
export function getAirshipVoyageMs(routeId: unknown, routeXp: unknown, hullLevel: unknown): number {
  if (!isValidAirshipRouteId(routeId)) return 0;
  const r = getAirshipRouteDef(routeId);
  const pct = Math.max(AIRSHIP_MIN_DURATION_PCT, 100 - getAirshipHull(hullLevel).speedPct - getAirshipRouteLevel(routeXp).speedPct);
  return Math.round((r.baseMinutes * 60_000 * pct) / 100);
}

/** 一趟航程的航线经验：载货才计（1 + 每 10 件货 1 点，最多按 100 件计）；空船不计。 */
export function airshipVoyageXp(cargoUnits: unknown): number {
  const n = airshipCleanCount(cargoUnits, AIRSHIP_XP_CARGO_CAP);
  return n > 0 ? 1 + Math.floor(n / 10) : 0;
}

/** 货舱净化：只认合法特产与正整数件数（不超过计数上限）。 */
export function cleanAirshipCargo(raw: unknown): Partial<Record<AirshipGoodId, number>> {
  const src = airshipObj(raw);
  const out: Partial<Record<AirshipGoodId, number>> = {};
  for (const id of AIRSHIP_GOOD_IDS) {
    const n = airshipCleanCount(src[id], AIRSHIP_COUNTER_CAP);
    if (n > 0) out[id] = n;
  }
  return out;
}

/** 货舱里的货物总件数。 */
export function airshipCargoUnits(cargo: unknown): number {
  const c = cleanAirshipCargo(cargo);
  let sum = 0;
  for (const id of AIRSHIP_GOOD_IDS) sum += c[id] || 0;
  return Math.min(AIRSHIP_COUNTER_CAP, sum);
}

function airshipQty(qty: unknown): number {
  const n = Number(qty);
  return Number.isInteger(n) && n >= 1 && n <= AIRSHIP_MAX_TRADE_QTY ? n : 0;
}

/**
 * 购入计划：只能在产地按今日出售价购入；受船体等级、今日存货、货舱空位与金币约束（maxQty 为当前最多可买件数）。
 */
export function planAirshipBuy(
  dayIndex: number,
  townId: unknown,
  hullLevel: unknown,
  goodId: unknown,
  qty: unknown,
  cargo: unknown,
  boughtToday: unknown,
  gold: unknown
) {
  const quote = getAirshipBuyQuote(dayIndex, goodId);
  const def = quote ? getAirshipGoodDef(quote.goodId) : null;
  const hull = getAirshipHull(hullLevel);
  const atOrigin = def !== null && def.origin === townId;
  const hullOk = def !== null && hull.level >= def.minHull;
  const bought = def ? airshipCleanCount(airshipObj(boughtToday)[def.id], AIRSHIP_DAILY_STOCK) : 0;
  const stockLeft = def ? AIRSHIP_DAILY_STOCK - bought : 0;
  const spaceLeft = Math.max(0, hull.capacity - airshipCargoUnits(cargo));
  const affordable = quote ? Math.floor(airshipCleanCount(gold, Number.MAX_SAFE_INTEGER) / quote.price) : 0;
  const maxQty = quote && atOrigin && hullOk ? Math.max(0, Math.min(AIRSHIP_MAX_TRADE_QTY, stockLeft, spaceLeft, affordable)) : 0;
  const n = airshipQty(qty);
  const ok = quote !== null && atOrigin && hullOk && n > 0 && n <= maxQty;
  return {
    ok,
    goodId: quote ? quote.goodId : null,
    pct: quote ? quote.pct : 0,
    unitPrice: quote ? quote.price : 0,
    qty: n,
    total: ok && quote ? n * quote.price : 0,
    maxQty,
    stockLeft,
    spaceLeft,
    atOrigin,
    hullOk,
  };
}

/**
 * 卖出计划：在非产地港口按今日收购价（含抵港航线加成）卖出货舱里的货物；按件数比例摊出成本以计算本笔盈亏。
 */
export function planAirshipSell(
  dayIndex: number,
  townId: unknown,
  goodId: unknown,
  qty: unknown,
  cargo: unknown,
  cargoCost: unknown,
  sellBonusPct: unknown
) {
  const quote = getAirshipSellQuote(dayIndex, townId, goodId, sellBonusPct);
  const held = isValidAirshipGoodId(goodId) ? cleanAirshipCargo(cargo)[goodId] || 0 : 0;
  const costHeld = isValidAirshipGoodId(goodId) ? airshipCleanCount(airshipObj(cargoCost)[goodId], AIRSHIP_COUNTER_CAP) : 0;
  const n = airshipQty(qty);
  const ok = quote !== null && n > 0 && n <= held;
  const total = ok && quote ? n * quote.price : 0;
  const costShare = ok && held > 0 ? Math.floor((costHeld * n) / held) : 0;
  return {
    ok,
    goodId: quote ? quote.goodId : null,
    pct: quote ? quote.pct : 0,
    bonusPct: quote ? quote.bonusPct : 0,
    listPrice: quote ? quote.listPrice : 0,
    unitPrice: quote ? quote.price : 0,
    qty: n,
    held,
    total,
    costShare,
    profit: total - costShare,
  };
}

/** 船体升级计划：下一级的金币与真实材料是否齐备（满级返回 maxed）。 */
export function planAirshipHullUpgrade(hullLevel: unknown, gold: unknown, inventory: unknown) {
  const cur = getAirshipHull(hullLevel);
  const next = AIRSHIP_HULLS.find((h) => h.level === cur.level + 1) ?? null;
  const inv = airshipObj(inventory);
  const g = airshipCleanCount(gold, Number.MAX_SAFE_INTEGER);
  const materials = next
    ? Object.entries(next.materials).map(([itemId, need]) => ({ itemId, need, have: airshipCleanCount(inv[itemId], AIRSHIP_COUNTER_CAP) }))
    : [];
  const goldOk = next !== null && g >= next.costGold;
  const materialsOk = materials.every((m) => m.have >= m.need);
  return { ok: next !== null && goldOk && materialsOk, maxed: next === null, current: cur, next, goldOk, materialsOk, materials };
}

/** 东八区周序号（1970-01-05 周一 0 点 = 第 0 周）。 */
export function paladinWeekIndex(now: Date | number): number {
  const ms = typeof now === "number" ? now : now.getTime();
  return Math.floor((ms + PALADIN_TZ_OFFSET_MINUTES * 60_000 - PALADIN_WEEK_EPOCH_MS) / PALADIN_WEEK_MS);
}

/** 周序号 → 周键（该周周一的东八区日期 YYYY-MM-DD）。 */
export function paladinWeekKeyFromIndex(index: number): string {
  return new Date(PALADIN_WEEK_EPOCH_MS + Math.floor(index) * PALADIN_WEEK_MS).toISOString().slice(0, 10);
}

export function paladinWeekKey(now: Date | number): string {
  return paladinWeekKeyFromIndex(paladinWeekIndex(now));
}

/** 周键 → 周序号；非法键或不是周一返回 null。 */
export function paladinWeekIndexFromKey(key: unknown): number | null {
  if (typeof key !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const ms = Date.parse(`${key}T00:00:00.000Z`);
  if (!Number.isFinite(ms)) return null;
  const diff = ms - PALADIN_WEEK_EPOCH_MS;
  if (diff % PALADIN_WEEK_MS !== 0) return null;
  const index = diff / PALADIN_WEEK_MS;
  return paladinWeekKeyFromIndex(index) === key ? index : null;
}

/** 本周结束（下周一东八区 0 点）的 UTC 毫秒时间戳。 */
export function paladinWeekEndsAtMs(now: Date | number): number {
  return PALADIN_WEEK_EPOCH_MS + (paladinWeekIndex(now) + 1) * PALADIN_WEEK_MS - PALADIN_TZ_OFFSET_MINUTES * 60_000;
}

/** 本周誓约：四种誓约按周序号依次轮换。 */
export function getPaladinTheme(weekIndex: number): PaladinThemeDef {
  const w = Number.isFinite(weekIndex) ? Math.floor(weekIndex) : 0;
  const n = PALADIN_THEMES.length;
  return PALADIN_THEMES[((w % n) + n) % n];
}

export function getPaladinFoeDef(monsterId: string): PaladinFoeDef {
  return PALADIN_FOES.find((f) => f.monsterId === monsterId) || PALADIN_FOES[0];
}

export interface PaladinOpponent {
  id: string;
  stage: number;
  stageName: string;
  monsterId: string;
  name: string;
  themeId: PaladinThemeId;
  level: number;
  hp: number;
  atk: number;
  def: number;
  attackIntervalMs: number;
  isBoss: boolean;
  mechanics: string[];
  medals: number;
}

/** 由周序号 + 关卡确定性生成本周幻影（同一周全服一致）：真实怪物属性 × 本周誓约倍率，终关加厚并带首领机制。 */
export function generatePaladinOpponent(weekIndex: number, stage: number): PaladinOpponent {
  const s = Math.min(PALADIN_STAGES.length, Math.max(1, Math.floor(Number(stage)) || 1));
  const w = Number.isFinite(weekIndex) ? Math.floor(weekIndex) : 0;
  const def = PALADIN_STAGES[s - 1];
  const theme = getPaladinTheme(w);
  const foe = getPaladinFoeDef(def.pool[airshipHash(w, 0x7a11 + s) % def.pool.length]);
  return {
    id: `paladin_trial_s${s}`,
    stage: s,
    stageName: def.name,
    monsterId: foe.monsterId,
    name: `${def.boss ? "试炼官 · " : ""}${theme.prefix}幻影 · ${foe.name}`,
    themeId: theme.id,
    level: foe.level,
    hp: Math.max(1, Math.round((foe.hp * def.hpPct * theme.hpPct) / 10_000)),
    atk: Math.max(1, Math.round((foe.atk * theme.atkPct) / 100)),
    def: Math.max(0, Math.round((foe.def * theme.defPct) / 100)),
    attackIntervalMs: Math.max(800, Math.round((foe.attackIntervalMs * theme.intervalPct) / 100)),
    isBoss: def.boss,
    mechanics: def.boss ? [...theme.mechanics] : [],
    medals: def.medals,
  };
}

/** 本周六关的幻影阵容。 */
export function getPaladinTrialLineup(weekIndex: number): PaladinOpponent[] {
  return PALADIN_STAGES.map((s) => generatePaladinOpponent(weekIndex, s.stage));
}

/** 幻影 → 战斗引擎的怪物记录（hp_combat.monsterCombatant / fightPreview.PreviewMonster 同口径；不掉落、不给经验金币）。 */
export function paladinOpponentMonster(o: PaladinOpponent) {
  return {
    id: o.id,
    name: o.name,
    level: o.level,
    hp: o.hp,
    atk: o.atk,
    def: o.def,
    attackIntervalMs: o.attackIntervalMs,
    isBoss: o.isBoss,
    mechanics: [...o.mechanics],
    gold: 0,
    xp: 0,
  };
}

/** 本周已通关的关卡：只认从第 1 关起连续的前缀（关卡必须按顺序挑战）。 */
export function cleanPaladinCleared(raw: unknown): number[] {
  const list = Array.isArray(raw) ? (raw as unknown[]) : [];
  const out: number[] = [];
  for (const s of PALADIN_STAGES) {
    if (!list.includes(s.stage)) break;
    out.push(s.stage);
  }
  return out;
}

/** 首次通关某关的荣誉勋章（第 6 关同时达成全通，额外 +10）。 */
export function getPaladinStageReward(stage: number) {
  const s = Math.min(PALADIN_STAGES.length, Math.max(1, Math.floor(Number(stage)) || 1));
  const fullClear = s === PALADIN_STAGES.length;
  const base = PALADIN_STAGES[s - 1].medals;
  return { stage: s, medals: base + (fullClear ? PALADIN_FULL_CLEAR_BONUS : 0), base, fullClear };
}

/** 誓言阶数净化：四项誓言各 0 ~ 5 阶。 */
export function cleanPaladinVirtues(raw: unknown): Record<PaladinVirtueId, number> {
  const src = airshipObj(raw);
  const out = {} as Record<PaladinVirtueId, number>;
  for (const id of PALADIN_VIRTUE_IDS) out[id] = airshipCleanCount(src[id], PALADIN_VIRTUE_MAX_RANK);
  return out;
}

/** 荣誉位阶：累计荣誉勋章决定位阶（含下一位阶进度）。 */
export function getPaladinHonorRank(totalMedals: unknown) {
  const n = airshipCleanCount(totalMedals, PALADIN_MEDAL_CAP);
  let current = PALADIN_HONOR_RANKS[0];
  let next: PaladinHonorRankDef | null = null;
  for (let i = 0; i < PALADIN_HONOR_RANKS.length; i++) {
    if (n >= PALADIN_HONOR_RANKS[i].minMedals) {
      current = PALADIN_HONOR_RANKS[i];
      next = PALADIN_HONOR_RANKS[i + 1] ?? null;
    }
  }
  const progressPct = next
    ? Math.min(100, Math.max(0, Math.round(((n - current.minMedals) / Math.max(1, next.minMedals - current.minMedals)) * 100)))
    : 100;
  return { totalMedals: n, current, next, progressPct };
}

/** 誓言升阶计划：花荣誉勋章把某项誓言升 1 阶（满 5 阶封顶；第 n 阶需荣誉位阶 ≥ n-1）。 */
export function planPaladinVirtue(virtues: unknown, virtueId: unknown, medals: unknown, totalMedals: unknown) {
  const valid = isValidPaladinVirtueId(virtueId);
  const ranks = cleanPaladinVirtues(virtues);
  const rank = valid ? ranks[virtueId] : 0;
  const maxed = valid && rank >= PALADIN_VIRTUE_MAX_RANK;
  const nextRank = maxed ? rank : rank + 1;
  const cost = valid && !maxed ? PALADIN_VIRTUE_COSTS[rank] : 0;
  const honor = getPaladinHonorRank(totalMedals);
  const needHonorRank = Math.max(0, nextRank - 1);
  const rankOk = honor.current.rank >= needHonorRank;
  const have = airshipCleanCount(medals, PALADIN_MEDAL_CAP);
  const enough = have >= cost;
  return {
    ok: valid && !maxed && rankOk && enough,
    virtueId: valid ? virtueId : null,
    rank,
    nextRank,
    maxed,
    cost,
    medals: have,
    enough,
    honorRank: honor.current.rank,
    needHonorRank,
    rankOk,
  };
}

export type MinimalPaladinHolder = {
  paladinTrial?: {
    virtues?: unknown;
    totalMedals?: unknown;
  } | null;
} | null;

export interface PaladinTrialBonuses {
  virtues: Record<PaladinVirtueId, number>;
  virtueRanks: number;
  honorRank: number;
  honorRankName: string;
  bonusAtk: number;
  bonusDef: number;
  bonusHp: number;
  goldGainPct: number;
  xpGainPct: number;
}

/** 荣誉试炼的永久加成 = 四项誓言阶数 × 每阶加成，逐项封顶（攻 15 / 防 10 / 血 150 / 金币 5% / 经验 5%）。 */
export function getPaladinTrialBonuses(holder?: MinimalPaladinHolder): PaladinTrialBonuses {
  const pt = airshipObj(holder?.paladinTrial);
  const virtues = cleanPaladinVirtues(pt.virtues);
  const honor = getPaladinHonorRank(pt.totalMedals);
  const sum: Required<PaladinStats> = { bonusAtk: 0, bonusDef: 0, bonusHp: 0, goldGainPct: 0, xpGainPct: 0 };
  let virtueRanks = 0;
  for (const v of PALADIN_VIRTUES) {
    const r = virtues[v.id];
    virtueRanks += r;
    for (const k of PALADIN_STAT_KEYS) sum[k] += r * (v.perRank[k] || 0);
  }
  for (const k of PALADIN_STAT_KEYS) sum[k] = Math.min(PALADIN_BONUS_CAPS[k], sum[k]);
  return {
    virtues,
    virtueRanks,
    honorRank: honor.current.rank,
    honorRankName: honor.current.name,
    ...sum,
  };
}

/* ---- 以上为 WL-16 core ---- */


/** 誓言 / 荣誉试炼加成 → 面板展示用短句（只列非零项）。 */
export function formatPaladinStats(s: PaladinStats | null | undefined): string[] {
  if (!s) return [];
  const out: string[] = [];
  if (s.bonusAtk) out.push(`攻击 +${s.bonusAtk}`);
  if (s.bonusDef) out.push(`防御 +${s.bonusDef}`);
  if (s.bonusHp) out.push(`生命 +${s.bonusHp}`);
  if (s.goldGainPct) out.push(`单人战斗金币 +${s.goldGainPct}%`);
  if (s.xpGainPct) out.push(`生活技能经验 +${s.xpGainPct}%`);
  return out;
}

/** 航程时长：1_500_000 → 25 分钟；95_000 → 1 分 35 秒；45_000 → 45 秒。 */
export function formatAirshipDuration(ms: number): string {
  const s = Math.max(0, Math.ceil((Number(ms) || 0) / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m <= 0) return `${r} 秒`;
  return r > 0 ? `${m} 分 ${String(r).padStart(2, "0")} 秒` : `${m} 分钟`;
}

/** 行情较昨日：「涨 3」/「跌 2」/「持平」。 */
export function formatAirshipTrend(price: number, prevPrice: number): string {
  const d = Math.round((Number(price) || 0) - (Number(prevPrice) || 0));
  if (d > 0) return `涨 ${d}`;
  if (d < 0) return `跌 ${-d}`;
  return "持平";
}

/** 盈亏：正数「盈 120」，负数「亏 30」。 */
export function formatAirshipProfit(profit: number): string {
  const p = Math.round(Number(profit) || 0);
  return p >= 0 ? `盈 ${p}` : `亏 ${-p}`;
}

/** 幻影 → fightPreview 怪物（附上从内容包 bossMechanics 表解析的试炼官机制）。 */
export function paladinOpponentPreviewMonster(opponent: PaladinOpponent, mechanicTable: readonly BossMechanicDef[] | undefined): PreviewMonster {
  return { ...paladinOpponentMonster(opponent), mechanicDefs: resolveMechanicDefs(opponent.mechanics, mechanicTable) };
}

/**
 * 荣誉试炼对决预演（镜像后端 simulatePaladinTrialDuel）：竞技场规则下的战斗面板（满血、无临时增益）+ 已装备技能栏，
 * 对本周幻影跑 fightPreview.previewFight，上限 10 分钟，超时按落败计。
 */
export function previewPaladinTrialDuel(
  sheet: CombatSheet,
  opponent: PaladinOpponent,
  abilities: PreviewAbility[],
  mechanicTable: readonly BossMechanicDef[] | undefined
) {
  const p = previewFight(sheet, paladinOpponentPreviewMonster(opponent, mechanicTable), abilities, PALADIN_MAX_FIGHT_MS);
  const lost = !p.won && p.playerHpLeft <= 0;
  return {
    won: p.won,
    timeout: !p.won && !lost,
    playerHpLeft: p.playerHpLeft,
    playerMaxHp: sheet.hp,
    enemyHpLeft: p.enemyHpLeft,
    enemyMaxHp: opponent.hp,
    durationMs: Math.min(PALADIN_MAX_FIGHT_MS, p.durationMs),
  };
}
