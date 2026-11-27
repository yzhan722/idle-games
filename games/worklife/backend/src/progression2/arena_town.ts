// 进阶进度 · 天空竞技场赛季排位 & 公会领地城镇建设 (WL-13)
// 从 progression2.ts 原样拆出；对外一律从 "../progression2" 引用。

import type {
  EnhancedContentPack,
  EnhancedPlayerState,
  ArenaDivisionId,
  ArenaArchetypeId,
  TownFacilityId,
  ArenaSettlementRecord,
  ArenaDuelRecord,
  SkyArenaState,
  GuildTownState,
  GuildTownUpgradeRecord,
} from "../types";
import { ensurePlayerExtensions, appendLog } from "../storage";
import { syncAchievements } from "../progression";
import { playerBuildExtras, startHpCombat, tickHpCombat } from "../hp_combat";
import { playerCombatant } from "../first_hour_combat";
import { addReputation } from "./reputation";

/* ============================ 天空竞技场赛季排位 & 公会领地城镇建设 (WL-13) ============================ */
// 前端 frontend/src/gameplay/arenaTown.ts 逐表逐式 1:1 镜像（scripts/arena-town-parity.test.ts 守护，
// 「WL-13 core」区段两端逐字一致）。
// - 天空竞技场赛季排位：赛季 = 东八区自然月（每月 1 日 0 点翻季）。30 级 PvE 擂主梯队由「赛季序号 + 梯级」确定性生成
//   （流派 / 称号 / ±6% 生命浮动，每段第 5 级为带内容包首领机制的段位守擂人）。挑战以玩家真实战斗构建直接跑
//   hp_combat 真实战斗引擎（沙盒副本：满血、禁用消耗品与临时增益、10 分钟上限），每个东八区日限 4 次。
//   翻季时按本季梯级结算段位 → 竞技场勋章 + 永久赛季称号（最高称号的攻防血 / 金币 / 经验加成接入真实公式）。
//   翻季 / 换日只在显式传入 now（指令 / 视图时钟）时发生；无参 ensure 只做净化（沿用 WL-10 ~ WL-12 约定）。
// - 公会领地城镇建设（转生永久保留）：以金币 + 真实生活职业成品建造 / 升级 6 座设施（荣耀演武场高阶另需竞技场勋章），
//   议事厅等级是其余设施的上限；设施解锁跨职业被动（采集 / 制作速度、经验、金币、攻防血），设施等级累计繁荣度，
//   繁荣等级再给全局加成并开放一次性繁荣宝箱。全部接入 getActionRates 与战斗 playerBuildExtras。

/* ---- 以下为与后端逐字对称的表与纯函数（WL-13 core） ---- */

export const ARENA_DIVISION_IDS: readonly ArenaDivisionId[] = ["bronze", "silver", "gold", "platinum", "diamond", "sky_king"];

export const ARENA_ARCHETYPE_IDS: readonly ArenaArchetypeId[] = ["iron_wall", "gale", "berserker", "arcane", "knight", "colossus"];

export const TOWN_FACILITY_IDS: readonly TownFacilityId[] = [
  "town_hall",
  "artisan_row",
  "harvest_market",
  "training_grounds",
  "guild_bank",
  "sage_library",
];

/** 赛季按东八区自然月划分（每月 1 日 0 点翻季）；每日挑战次数按东八区日期（0 点）重置。 */
export const ARENA_TZ_OFFSET_MINUTES = 480;
export const ARENA_RUNG_COUNT = 30;
export const ARENA_RUNGS_PER_DIVISION = 5;
/** 每个东八区日最多挑战 4 次（胜负都消耗次数）。 */
export const ARENA_DAILY_ATTEMPTS = 4;
/** 单场对决上限 10 分钟（与 hp_combat / fightPreview 的上限一致），超时未分胜负按落败计。 */
export const ARENA_MAX_FIGHT_MS = 600_000;
export const ARENA_MEDAL_CAP = 99999;
/** 段位守擂人（每段第 5 级）的额外生命倍率。 */
export const ARENA_GATEKEEPER_HP_MULT = 1.3;
export const TOWN_MAX_LEVEL = 5;

export interface ArenaTownStats {
  gatherSpeedPct?: number;
  craftSpeedPct?: number;
  xpGainPct?: number;
  goldGainPct?: number;
  bonusAtk?: number;
  bonusDef?: number;
  bonusHp?: number;
}

export const ARENA_TOWN_STAT_KEYS: readonly (keyof ArenaTownStats)[] = [
  "gatherSpeedPct",
  "craftSpeedPct",
  "xpGainPct",
  "goldGainPct",
  "bonusAtk",
  "bonusDef",
  "bonusHp",
];

export interface ArenaRungDef {
  rung: number;
  /** 擂主等级（只影响技能施放经验，与普通怪物同口径）。 */
  level: number;
  hp: number;
  atk: number;
  def: number;
  /** 击败该梯级擂主的金币奖励。 */
  gold: number;
}

/** 30 级擂主梯队基准属性：取同等级真实怪物的平滑曲线，生命 ×2.2、攻击 ×1.08（精英擂主口径）。 */
export const ARENA_RUNGS: readonly ArenaRungDef[] = [
  { rung: 1, level: 2, hp: 240, atk: 6, def: 5, gold: 40 },
  { rung: 2, level: 4, hp: 290, atk: 9, def: 6, gold: 55 },
  { rung: 3, level: 6, hp: 330, atk: 10, def: 8, gold: 90 },
  { rung: 4, level: 8, hp: 360, atk: 12, def: 9, gold: 140 },
  { rung: 5, level: 10, hp: 400, atk: 14, def: 10, gold: 180 },
  { rung: 6, level: 13, hp: 510, atk: 17, def: 11, gold: 210 },
  { rung: 7, level: 16, hp: 700, atk: 22, def: 12, gold: 250 },
  { rung: 8, level: 19, hp: 920, atk: 24, def: 14, gold: 300 },
  { rung: 9, level: 22, hp: 1060, atk: 26, def: 17, gold: 360 },
  { rung: 10, level: 25, hp: 1360, atk: 30, def: 21, gold: 440 },
  { rung: 11, level: 28, hp: 1670, atk: 33, def: 22, gold: 470 },
  { rung: 12, level: 32, hp: 1800, atk: 41, def: 24, gold: 520 },
  { rung: 13, level: 36, hp: 1940, atk: 54, def: 28, gold: 650 },
  { rung: 14, level: 40, hp: 2180, atk: 63, def: 38, gold: 1000 },
  { rung: 15, level: 44, hp: 2310, atk: 67, def: 45, gold: 1300 },
  { rung: 16, level: 48, hp: 2750, atk: 71, def: 47, gold: 1700 },
  { rung: 17, level: 53, hp: 3740, atk: 81, def: 50, gold: 2400 },
  { rung: 18, level: 58, hp: 4290, atk: 95, def: 58, gold: 3400 },
  { rung: 19, level: 63, hp: 4840, atk: 106, def: 62, gold: 4200 },
  { rung: 20, level: 68, hp: 5940, atk: 127, def: 68, gold: 5500 },
  { rung: 21, level: 74, hp: 6490, atk: 133, def: 80, gold: 6500 },
  { rung: 22, level: 80, hp: 7480, atk: 140, def: 88, gold: 7400 },
  { rung: 23, level: 86, hp: 9900, atk: 164, def: 105, gold: 9400 },
  { rung: 24, level: 92, hp: 11000, atk: 184, def: 112, gold: 10400 },
  { rung: 25, level: 98, hp: 12540, atk: 200, def: 130, gold: 12400 },
  { rung: 26, level: 105, hp: 14300, atk: 211, def: 135, gold: 13000 },
  { rung: 27, level: 115, hp: 16280, atk: 259, def: 165, gold: 15500 },
  { rung: 28, level: 125, hp: 18920, atk: 283, def: 175, gold: 18500 },
  { rung: 29, level: 137, hp: 23760, atk: 324, def: 205, gold: 27000 },
  { rung: 30, level: 150, hp: 33000, atk: 346, def: 250, gold: 37000 },
];

export interface ArenaArchetypeDef {
  id: ArenaArchetypeId;
  name: string;
  style: string;
  hpMult: number;
  atkMult: number;
  defMult: number;
  attackIntervalMs: number;
}

/** 擂主流派：按赛季 + 梯级哈希抽取，同一赛季同一梯级恒定，不同赛季换一批对手。 */
export const ARENA_ARCHETYPES: readonly ArenaArchetypeDef[] = [
  { id: "iron_wall", name: "铁壁守卫", style: "厚甲慢攻", hpMult: 1.2, atkMult: 0.85, defMult: 1.6, attackIntervalMs: 3200 },
  { id: "gale", name: "疾风剑客", style: "高速连斩", hpMult: 0.85, atkMult: 0.72, defMult: 0.8, attackIntervalMs: 1500 },
  { id: "berserker", name: "狂怒斗士", style: "重击破绽", hpMult: 0.95, atkMult: 1.3, defMult: 0.6, attackIntervalMs: 2600 },
  { id: "arcane", name: "秘法术士", style: "法术压制", hpMult: 0.9, atkMult: 1.15, defMult: 0.85, attackIntervalMs: 2800 },
  { id: "knight", name: "均衡骑士", style: "攻守兼备", hpMult: 1, atkMult: 1, defMult: 1, attackIntervalMs: 2400 },
  { id: "colossus", name: "巨像力士", style: "巨力血厚", hpMult: 1.45, atkMult: 1.12, defMult: 1.1, attackIntervalMs: 3600 },
];

export const ARENA_CHAMPION_EPITHETS: readonly string[] = [
  "苍穹",
  "雷鸣",
  "赤焰",
  "霜刃",
  "星陨",
  "影袭",
  "金狮",
  "银翼",
  "玄甲",
  "风暴",
  "圣辉",
  "翠影",
];

export interface ArenaDivisionDef {
  id: ArenaDivisionId;
  name: string;
  minRung: number;
  maxRung: number;
  /** 赛季结算时停留在本段位发放的竞技场勋章。 */
  medals: number;
  titleName: string;
  /** 赛季称号永久加成（转生保留；只取已解锁的最高称号）。 */
  titleStats: ArenaTownStats;
  /** 本段守擂人的首领机制候选（取自内容包 bossMechanics 表，按赛季哈希抽取一组）。 */
  gatekeeperMechanics: readonly (readonly string[])[];
}

export const ARENA_DIVISIONS: readonly ArenaDivisionDef[] = [
  {
    id: "bronze",
    name: "青铜",
    minRung: 1,
    maxRung: 5,
    medals: 3,
    titleName: "青铜斗士",
    titleStats: { bonusAtk: 3, bonusHp: 12 },
    gatekeeperMechanics: [["guard_60"], ["nature_wrath_30"]],
  },
  {
    id: "silver",
    name: "白银",
    minRung: 6,
    maxRung: 10,
    medals: 6,
    titleName: "白银剑豪",
    titleStats: { bonusAtk: 7, bonusDef: 3, bonusHp: 28 },
    gatekeeperMechanics: [["rockfall_charge"], ["mine_fury_35"]],
  },
  {
    id: "gold",
    name: "黄金",
    minRung: 11,
    maxRung: 15,
    medals: 10,
    titleName: "黄金霸者",
    titleStats: { bonusAtk: 12, bonusDef: 6, bonusHp: 50 },
    gatekeeperMechanics: [["frost_armor_15"], ["swamp_devour_charge"]],
  },
  {
    id: "platinum",
    name: "铂金",
    minRung: 16,
    maxRung: 20,
    medals: 15,
    titleName: "铂金战神",
    titleStats: { bonusAtk: 20, bonusDef: 10, bonusHp: 85, goldGainPct: 1 },
    gatekeeperMechanics: [["miasma_3s", "magma_fury_30"], ["glacier_lance_charge"]],
  },
  {
    id: "diamond",
    name: "钻石",
    minRung: 21,
    maxRung: 25,
    medals: 22,
    titleName: "钻石传奇",
    titleStats: { bonusAtk: 30, bonusDef: 15, bonusHp: 130, goldGainPct: 2 },
    gatekeeperMechanics: [["eruption_20s", "void_frenzy_35"], ["seraph_aegis_15s", "hellfire_cleave_charge"]],
  },
  {
    id: "sky_king",
    name: "天空王者",
    minRung: 26,
    maxRung: 30,
    medals: 32,
    titleName: "天空竞技之王",
    titleStats: { bonusAtk: 45, bonusDef: 22, bonusHp: 200, goldGainPct: 3, xpGainPct: 2 },
    gatekeeperMechanics: [
      ["void_collapse_16s", "abyss_miasma_3s", "omega_wrath_40"],
      ["chrono_storm_15s", "paradox_strike_charge", "chrono_haste_40"],
    ],
  },
];

export interface TownFacilityLevelDef {
  level: number;
  gold: number;
  /** 升级所需的真实生活职业成品（升级时一次性扣除）。 */
  items: Readonly<Record<string, number>>;
  /** 升级所需的竞技场勋章（仅荣耀演武场高阶需要）。 */
  medals: number;
  /** 达到该等级后的设施加成（非累加，取当前等级这一行）。 */
  stats: ArenaTownStats;
  /** 该等级解锁 / 强化的跨职业被动说明。 */
  perk: string | null;
}

export interface TownFacilityDef {
  id: TownFacilityId;
  name: string;
  subtitle: string;
  description: string;
  iconKind: "skills" | "ui";
  iconId: string;
  /** 每级贡献的繁荣度。 */
  prosperityPerLevel: number;
  levels: readonly TownFacilityLevelDef[];
}

export const TOWN_FACILITIES: readonly TownFacilityDef[] = [
  {
    id: "town_hall",
    name: "公会议事厅",
    subtitle: "领地中枢 · 设施等级上限",
    description: "公会领地的中枢。议事厅等级决定其余设施可建造的最高等级，每级贡献 4 点繁荣度。",
    iconKind: "skills",
    iconId: "town_hall",
    prosperityPerLevel: 4,
    levels: [
      { level: 1, gold: 800, items: { lumber_1: 12, ingot_1: 6 }, medals: 0, stats: {}, perk: "其余设施可建至 Lv.1" },
      { level: 2, gold: 2500, items: { lumber_2: 12, ingot_2: 8 }, medals: 0, stats: {}, perk: "其余设施可建至 Lv.2" },
      { level: 3, gold: 6000, items: { lumber_3: 12, ingot_3: 8, charcoal: 6 }, medals: 0, stats: {}, perk: "其余设施可建至 Lv.3" },
      { level: 4, gold: 14000, items: { lumber_4: 12, ingot_4: 8, resin: 6 }, medals: 0, stats: {}, perk: "其余设施可建至 Lv.4" },
      { level: 5, gold: 32000, items: { lumber_5: 12, ingot_5: 8, crystal_5: 4 }, medals: 0, stats: {}, perk: "其余设施可建至 Lv.5" },
    ],
  },
  {
    id: "artisan_row",
    name: "匠人工坊街",
    subtitle: "制作提速 · 工坊工具共享",
    description: "锻造、木工、裁缝与炼金的工坊连成一条街，全部制作行动永久提速；三级起工具外借给采集队。",
    iconKind: "skills",
    iconId: "codex_set_forge",
    prosperityPerLevel: 3,
    levels: [
      { level: 1, gold: 600, items: { ingot_1: 8, yarn_1: 6 }, medals: 0, stats: { craftSpeedPct: 2 }, perk: null },
      { level: 2, gold: 1800, items: { ingot_2: 8, yarn_2: 6 }, medals: 0, stats: { craftSpeedPct: 4 }, perk: null },
      {
        level: 3,
        gold: 4500,
        items: { ingot_3: 8, dyed_cloth: 4 },
        medals: 0,
        stats: { craftSpeedPct: 6, gatherSpeedPct: 2 },
        perk: "跨职业被动「工坊工具共享」：采集速度 +2%",
      },
      { level: 4, gold: 11000, items: { ingot_4: 8, yarn_4: 6 }, medals: 0, stats: { craftSpeedPct: 9, gatherSpeedPct: 2 }, perk: null },
      {
        level: 5,
        gold: 26000,
        items: { ingot_5: 8, yarn_5: 6 },
        medals: 0,
        stats: { craftSpeedPct: 12, gatherSpeedPct: 3 },
        perk: "「工坊工具共享」强化：采集速度 +3%",
      },
    ],
  },
  {
    id: "harvest_market",
    name: "丰饶集市",
    subtitle: "采集提速 · 集市余粮",
    description: "农牧、渔获与山货在集市汇聚，全部采集行动永久提速；三级起余粮反哺各工坊。",
    iconKind: "skills",
    iconId: "festival_harvest_basket",
    prosperityPerLevel: 3,
    levels: [
      { level: 1, gold: 600, items: { food_simple: 8, lumber_1: 6 }, medals: 0, stats: { gatherSpeedPct: 2 }, perk: null },
      { level: 2, gold: 1800, items: { bread: 6, milk: 6 }, medals: 0, stats: { gatherSpeedPct: 4 }, perk: null },
      {
        level: 3,
        gold: 4500,
        items: { food_vegetable_stew: 4, food_fine: 3 },
        medals: 0,
        stats: { gatherSpeedPct: 6, craftSpeedPct: 2 },
        perk: "跨职业被动「集市余粮」：制作速度 +2%",
      },
      { level: 4, gold: 11000, items: { honey: 6, cheese_wheel: 4 }, medals: 0, stats: { gatherSpeedPct: 9, craftSpeedPct: 2 }, perk: null },
      {
        level: 5,
        gold: 26000,
        items: { dish_deepsea_stew: 3, food_honey_cake: 4 },
        medals: 0,
        stats: { gatherSpeedPct: 12, craftSpeedPct: 3 },
        perk: "「集市余粮」强化：制作速度 +3%",
      },
    ],
  },
  {
    id: "training_grounds",
    name: "荣耀演武场",
    subtitle: "攻防生命 · 演武护商",
    description: "竞技场冠军坐镇的演武场，永久提升攻击、防御与生命；三级起需要竞技场勋章，并派出护卫护送商队。",
    iconKind: "skills",
    iconId: "war_aura",
    prosperityPerLevel: 3,
    levels: [
      { level: 1, gold: 600, items: { lumber_1: 8, potion_hp_t1: 4 }, medals: 0, stats: { bonusAtk: 4, bonusHp: 15 }, perk: null },
      {
        level: 2,
        gold: 1800,
        items: { ingot_2: 8, potion_hp_t2: 4 },
        medals: 0,
        stats: { bonusAtk: 8, bonusDef: 3, bonusHp: 30 },
        perk: null,
      },
      {
        level: 3,
        gold: 4500,
        items: { ingot_3: 8, potion_hp_t3: 3 },
        medals: 4,
        stats: { bonusAtk: 13, bonusDef: 6, bonusHp: 50, goldGainPct: 1 },
        perk: "跨职业被动「演武护商」：单人战斗金币 +1%",
      },
      {
        level: 4,
        gold: 11000,
        items: { ingot_4: 8, potion_hp_t4: 3 },
        medals: 10,
        stats: { bonusAtk: 19, bonusDef: 9, bonusHp: 75, goldGainPct: 1 },
        perk: null,
      },
      {
        level: 5,
        gold: 26000,
        items: { ingot_5: 8, elixir_legend: 1 },
        medals: 20,
        stats: { bonusAtk: 26, bonusDef: 12, bonusHp: 100, goldGainPct: 2 },
        perk: "「演武护商」强化：单人战斗金币 +2%",
      },
    ],
  },
  {
    id: "guild_bank",
    name: "公会钱庄",
    subtitle: "单人战斗金币 · 账房讲习",
    description: "公会钱庄替冒险者打理账目，单人战斗金币永久提升；三级起账房开设讲习，生活技能经验提升。",
    iconKind: "ui",
    iconId: "gold",
    prosperityPerLevel: 3,
    levels: [
      { level: 1, gold: 800, items: { ingot_1: 10 }, medals: 0, stats: { goldGainPct: 1 }, perk: null },
      { level: 2, gold: 2400, items: { ingot_2: 10, drink_basic: 4 }, medals: 0, stats: { goldGainPct: 2 }, perk: null },
      {
        level: 3,
        gold: 6000,
        items: { ingot_3: 10, drink_fine: 4 },
        medals: 0,
        stats: { goldGainPct: 4, xpGainPct: 1 },
        perk: "跨职业被动「账房讲习」：生活技能经验 +1%",
      },
      { level: 4, gold: 14000, items: { ingot_4: 10, tea_spirit: 4 }, medals: 0, stats: { goldGainPct: 6, xpGainPct: 1 }, perk: null },
      {
        level: 5,
        gold: 32000,
        items: { ingot_5: 10, drink_rich: 4 },
        medals: 0,
        stats: { goldGainPct: 8, xpGainPct: 2 },
        perk: "「账房讲习」强化：生活技能经验 +2%",
      },
    ],
  },
  {
    id: "sage_library",
    name: "贤者书馆",
    subtitle: "生活技能经验 · 百科通识",
    description: "收藏各职业典籍的书馆，生活技能经验永久提升；三级起百科通识让采集与制作同时提速。",
    iconKind: "skills",
    iconId: "codex_set_arcane",
    prosperityPerLevel: 3,
    levels: [
      { level: 1, gold: 600, items: { lumber_1: 8, yarn_1: 6 }, medals: 0, stats: { xpGainPct: 1 }, perk: null },
      { level: 2, gold: 1800, items: { lumber_2: 8, crystal_2: 4 }, medals: 0, stats: { xpGainPct: 2 }, perk: null },
      {
        level: 3,
        gold: 4500,
        items: { lumber_3: 8, crystal_3: 4 },
        medals: 0,
        stats: { xpGainPct: 3, gatherSpeedPct: 1, craftSpeedPct: 1 },
        perk: "跨职业被动「百科通识」：采集 / 制作速度各 +1%",
      },
      {
        level: 4,
        gold: 11000,
        items: { lumber_4: 8, crystal_4: 4 },
        medals: 0,
        stats: { xpGainPct: 5, gatherSpeedPct: 1, craftSpeedPct: 1 },
        perk: null,
      },
      {
        level: 5,
        gold: 26000,
        items: { lumber_5: 8, crystal_5: 4 },
        medals: 0,
        stats: { xpGainPct: 7, gatherSpeedPct: 2, craftSpeedPct: 2 },
        perk: "「百科通识」强化：采集 / 制作速度各 +2%",
      },
    ],
  },
];

export interface TownProsperityTierDef {
  tier: 0 | 1 | 2 | 3 | 4 | 5;
  minPoints: number;
  name: string;
  stats: ArenaTownStats;
  /** 首次达到该繁荣等级可领取一次的繁荣宝箱。 */
  chestGold: number;
  chestItems: Readonly<Record<string, number>>;
}

/** 繁荣度 = Σ 设施等级 × 每级繁荣度（议事厅 4、其余 3，满建 95）。 */
export const TOWN_PROSPERITY_TIERS: readonly TownProsperityTierDef[] = [
  { tier: 0, minPoints: 0, name: "拓荒营地", stats: {}, chestGold: 0, chestItems: {} },
  { tier: 1, minPoints: 8, name: "公会村落", stats: { goldGainPct: 1 }, chestGold: 600, chestItems: { potion_hp_t1: 5, food_simple: 6 } },
  {
    tier: 2,
    minPoints: 20,
    name: "繁荣小镇",
    stats: { goldGainPct: 2, xpGainPct: 1 },
    chestGold: 1500,
    chestItems: { potion_hp_t2: 5, bread: 6 },
  },
  {
    tier: 3,
    minPoints: 38,
    name: "领地城镇",
    stats: { goldGainPct: 3, xpGainPct: 2, gatherSpeedPct: 1, craftSpeedPct: 1 },
    chestGold: 4000,
    chestItems: { potion_hp_t3: 5, crystal_3: 4 },
  },
  {
    tier: 4,
    minPoints: 60,
    name: "天空城邦",
    stats: { goldGainPct: 4, xpGainPct: 3, gatherSpeedPct: 2, craftSpeedPct: 2, bonusHp: 30 },
    chestGold: 9000,
    chestItems: { potion_hp_t4: 5, crystal_4: 4 },
  },
  {
    tier: 5,
    minPoints: 85,
    name: "天空之城",
    stats: { goldGainPct: 6, xpGainPct: 4, gatherSpeedPct: 3, craftSpeedPct: 3, bonusAtk: 10, bonusHp: 60 },
    chestGold: 22000,
    chestItems: { elixir_legend: 2, crystal_5: 4 },
  },
];

export function isValidArenaDivisionId(id: unknown): id is ArenaDivisionId {
  return typeof id === "string" && (ARENA_DIVISION_IDS as readonly string[]).includes(id);
}

export function isValidTownFacilityId(id: unknown): id is TownFacilityId {
  return typeof id === "string" && (TOWN_FACILITY_IDS as readonly string[]).includes(id);
}

function arenaTownCleanCount(v: unknown, cap: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.min(cap, Math.floor(n)) : 0;
}

/** 东八区赛季序号：年 × 12 + 月（0~11）。 */
export function getArenaSeasonIndex(now: Date | number): number {
  const ms = typeof now === "number" ? now : now.getTime();
  const d = new Date(ms + ARENA_TZ_OFFSET_MINUTES * 60_000);
  return d.getUTCFullYear() * 12 + d.getUTCMonth();
}

/** 赛季序号 → 赛季键 YYYY-MM。 */
export function arenaSeasonKeyFromIndex(index: number): string {
  const i = Math.floor(index);
  const month = (((i % 12) + 12) % 12) + 1;
  return `${Math.floor(i / 12)}-${month < 10 ? "0" : ""}${month}`;
}

export function arenaSeasonKey(now: Date | number): string {
  return arenaSeasonKeyFromIndex(getArenaSeasonIndex(now));
}

/** 赛季键 → 赛季序号；非法键返回 null。 */
export function arenaSeasonIndexFromKey(key: unknown): number | null {
  if (typeof key !== "string") return null;
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(key);
  if (!m) return null;
  return Number(m[1]) * 12 + Number(m[2]) - 1;
}

/** 该赛季开幕（当月 1 日东八区 0 点）的 UTC 毫秒时间戳。 */
export function arenaSeasonStartMs(index: number): number {
  const i = Math.floor(index);
  return Date.UTC(Math.floor(i / 12), ((i % 12) + 12) % 12, 1) - ARENA_TZ_OFFSET_MINUTES * 60_000;
}

/** 该赛季结束（下月 1 日东八区 0 点）的 UTC 毫秒时间戳。 */
export function arenaSeasonEndsAtMs(index: number): number {
  return arenaSeasonStartMs(Math.floor(index) + 1);
}

/** 东八区日期键 YYYY-MM-DD（每日挑战次数按此重置）。 */
export function arenaDayKey(now: Date | number): string {
  const ms = typeof now === "number" ? now : now.getTime();
  return new Date(ms + ARENA_TZ_OFFSET_MINUTES * 60_000).toISOString().slice(0, 10);
}

/** 当前东八区日结束（次日 0 点）的 UTC 毫秒时间戳。 */
export function arenaDayEndsAtMs(now: Date | number): number {
  const ms = typeof now === "number" ? now : now.getTime();
  const shifted = ms + ARENA_TZ_OFFSET_MINUTES * 60_000;
  return Math.floor(shifted / 86_400_000) * 86_400_000 + 86_400_000 - ARENA_TZ_OFFSET_MINUTES * 60_000;
}

export function isValidArenaDayKey(key: unknown): key is string {
  return typeof key === "string" && /^\d{4}-\d{2}-\d{2}$/.test(key) && Number.isFinite(Date.parse(`${key}T00:00:00Z`));
}

/** 32 位整数混合哈希（擂主生成的唯一随机源，纯确定性）。 */
export function arenaHash(a: number, b: number): number {
  let h = (Math.imul((a | 0) ^ 0x5bd1e995, 0x9e3779b1) + Math.imul((b | 0) + 0x27d4eb2f, 0x85ebca77)) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d) >>> 0;
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39) >>> 0;
  h ^= h >>> 15;
  return h >>> 0;
}

/** 梯级所属段位；0 级（未击败任何擂主）返回 null。 */
export function getArenaDivisionForRung(rung: number): ArenaDivisionDef | null {
  const r = Number.isFinite(rung) ? Math.floor(rung) : 0;
  if (r < 1) return null;
  return ARENA_DIVISIONS.find((d) => r >= d.minRung && r <= d.maxRung) || ARENA_DIVISIONS[ARENA_DIVISIONS.length - 1];
}

export interface ArenaChampion {
  id: string;
  rung: number;
  level: number;
  name: string;
  epithet: string;
  archetype: ArenaArchetypeId;
  archetypeName: string;
  style: string;
  division: ArenaDivisionId;
  divisionName: string;
  /** 每段第 5 级为段位守擂人：首领判定 + 额外生命 + 内容包首领机制。 */
  gatekeeper: boolean;
  hp: number;
  atk: number;
  def: number;
  attackIntervalMs: number;
  isBoss: boolean;
  mechanics: string[];
  gold: number;
}

/** 由赛季序号 + 梯级确定性生成擂主（同一赛季同一梯级恒定，换季换一批流派、称号与 ±6% 生命浮动）。 */
export function generateArenaChampion(seasonIndex: number, rung: number): ArenaChampion {
  const r = Math.min(ARENA_RUNG_COUNT, Math.max(1, Math.floor(Number(rung)) || 1));
  const season = Number.isFinite(seasonIndex) ? Math.floor(seasonIndex) : 0;
  const row = ARENA_RUNGS[r - 1];
  const division = getArenaDivisionForRung(r)!;
  const h = arenaHash(season, r);
  const archetype = ARENA_ARCHETYPES[h % ARENA_ARCHETYPES.length];
  const epithet = ARENA_CHAMPION_EPITHETS[(h >>> 8) % ARENA_CHAMPION_EPITHETS.length];
  const gatekeeper = r % ARENA_RUNGS_PER_DIVISION === 0;
  const jitter = 0.94 + ((h >>> 16) % 13) / 100;
  const hpMult = archetype.hpMult * jitter * (gatekeeper ? ARENA_GATEKEEPER_HP_MULT : 1);
  const pool = division.gatekeeperMechanics;
  const mechanics = gatekeeper && pool.length > 0 ? [...pool[(h >>> 24) % pool.length]] : [];
  return {
    id: `arena_champion_r${r}`,
    rung: r,
    level: row.level,
    name: gatekeeper ? `${division.name}守擂人·${epithet}${archetype.name}` : `${epithet}${archetype.name}`,
    epithet,
    archetype: archetype.id,
    archetypeName: archetype.name,
    style: archetype.style,
    division: division.id,
    divisionName: division.name,
    gatekeeper,
    hp: Math.max(1, Math.round(row.hp * hpMult)),
    atk: Math.max(1, Math.round(row.atk * archetype.atkMult)),
    def: Math.max(0, Math.round(row.def * archetype.defMult)),
    attackIntervalMs: archetype.attackIntervalMs,
    isBoss: gatekeeper,
    mechanics,
    gold: row.gold,
  };
}

/** 整个赛季的 30 级擂主梯队。 */
export function getArenaLadder(seasonIndex: number): ArenaChampion[] {
  const out: ArenaChampion[] = [];
  for (let r = 1; r <= ARENA_RUNG_COUNT; r++) out.push(generateArenaChampion(seasonIndex, r));
  return out;
}

/** 擂主 → 战斗引擎的怪物记录（hp_combat.monsterCombatant / fightPreview.PreviewMonster 同口径；不掉落、不给经验金币）。 */
export function arenaChampionMonster(c: ArenaChampion) {
  return {
    id: c.id,
    name: c.name,
    level: c.level,
    hp: c.hp,
    atk: c.atk,
    def: c.def,
    attackIntervalMs: c.attackIntervalMs,
    isBoss: c.isBoss,
    mechanics: [...c.mechanics],
    gold: 0,
    xp: 0,
  };
}

/** 赛季结算：按本季击败的擂主数（最高梯级）定段位，发放该段勋章与对应赛季称号。 */
export function getArenaSettlement(rung: number) {
  const r = Math.min(ARENA_RUNG_COUNT, arenaTownCleanCount(rung, ARENA_RUNG_COUNT));
  const division = getArenaDivisionForRung(r);
  return {
    rung: r,
    division: division ? division.id : null,
    divisionName: division ? division.name : "未定级",
    medals: division ? division.medals : 0,
    titleName: division ? division.titleName : null,
  };
}

/** 称号净化：只保留合法段位、去重并按段位从低到高排列。 */
export function cleanArenaTitles(raw: unknown): ArenaDivisionId[] {
  const src = Array.isArray(raw) ? (raw as unknown[]) : [];
  return ARENA_DIVISION_IDS.filter((id) => src.includes(id));
}

/** 已解锁的最高赛季称号（生效的永久加成）。 */
export function getArenaBestTitle(titles: unknown): ArenaDivisionDef | null {
  const clean = cleanArenaTitles(titles);
  if (clean.length === 0) return null;
  const best = clean[clean.length - 1];
  return ARENA_DIVISIONS.find((d) => d.id === best) || null;
}

/** 设施等级净化：0~5 整数；其余设施不超过议事厅等级。 */
export function cleanTownFacilities(raw: unknown): Record<TownFacilityId, number> {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const hall = arenaTownCleanCount(src.town_hall, TOWN_MAX_LEVEL);
  const cap = (v: unknown) => Math.min(hall, arenaTownCleanCount(v, TOWN_MAX_LEVEL));
  return {
    town_hall: hall,
    artisan_row: cap(src.artisan_row),
    harvest_market: cap(src.harvest_market),
    training_grounds: cap(src.training_grounds),
    guild_bank: cap(src.guild_bank),
    sage_library: cap(src.sage_library),
  };
}

export function getTownFacilityDef(facilityId: TownFacilityId): TownFacilityDef {
  return TOWN_FACILITIES.find((f) => f.id === facilityId) || TOWN_FACILITIES[0];
}

/** 设施可建造的最高等级：议事厅 5；其余设施 = 议事厅当前等级。 */
export function getTownFacilityCap(facilityId: TownFacilityId, facilities: unknown): number {
  if (facilityId === "town_hall") return TOWN_MAX_LEVEL;
  return cleanTownFacilities(facilities).town_hall;
}

/** 繁荣度与繁荣等级（含下一等级进度）。 */
export function getTownProsperity(facilities: unknown) {
  const clean = cleanTownFacilities(facilities);
  let points = 0;
  for (const f of TOWN_FACILITIES) points += clean[f.id] * f.prosperityPerLevel;
  let current = TOWN_PROSPERITY_TIERS[0];
  let next: TownProsperityTierDef | null = null;
  for (let i = 0; i < TOWN_PROSPERITY_TIERS.length; i++) {
    if (points >= TOWN_PROSPERITY_TIERS[i].minPoints) {
      current = TOWN_PROSPERITY_TIERS[i];
      next = TOWN_PROSPERITY_TIERS[i + 1] ?? null;
    }
  }
  const progressPct = next
    ? Math.min(100, Math.max(0, Math.round(((points - current.minPoints) / Math.max(1, next.minPoints - current.minPoints)) * 100)))
    : 100;
  return { points, current, next, progressPct };
}

/** 繁荣宝箱领取记录净化：1~5 去重升序。 */
export function cleanTownChests(raw: unknown): number[] {
  const src = Array.isArray(raw) ? (raw as unknown[]) : [];
  const out: number[] = [];
  for (const t of TOWN_PROSPERITY_TIERS) {
    if (t.tier > 0 && src.includes(t.tier)) out.push(t.tier);
  }
  return out;
}

export interface ArenaTownBonuses {
  titles: ArenaDivisionId[];
  titleDivision: ArenaDivisionId | null;
  titleName: string | null;
  facilityLevels: Record<TownFacilityId, number>;
  prosperityPoints: number;
  prosperityTier: number;
  prosperityName: string;
  gatherSpeedPct: number;
  craftSpeedPct: number;
  xpGainPct: number;
  goldGainPct: number;
  bonusAtk: number;
  bonusDef: number;
  bonusHp: number;
}

export type MinimalArenaTownHolder = {
  skyArena?: {
    titles?: unknown;
  } | null;
  guildTown?: {
    facilities?: unknown;
  } | null;
} | null;

/** 竞技场 + 城镇永久加成 = 最高赛季称号 + 各设施当前等级 + 繁荣等级。 */
export function getArenaTownBonuses(holder?: MinimalArenaTownHolder): ArenaTownBonuses {
  const sa = holder?.skyArena;
  const gt = holder?.guildTown;
  const titles = cleanArenaTitles(sa && typeof sa === "object" ? sa.titles : null);
  const facilities = cleanTownFacilities(gt && typeof gt === "object" ? gt.facilities : null);
  const title = getArenaBestTitle(titles);
  const prosperity = getTownProsperity(facilities);
  const sum: Required<ArenaTownStats> = {
    gatherSpeedPct: 0,
    craftSpeedPct: 0,
    xpGainPct: 0,
    goldGainPct: 0,
    bonusAtk: 0,
    bonusDef: 0,
    bonusHp: 0,
  };
  const add = (s: ArenaTownStats) => {
    for (const k of ARENA_TOWN_STAT_KEYS) sum[k] += s[k] || 0;
  };
  if (title) add(title.titleStats);
  for (const f of TOWN_FACILITIES) {
    const lv = facilities[f.id];
    if (lv > 0) add(f.levels[lv - 1].stats);
  }
  add(prosperity.current.stats);
  return {
    titles,
    titleDivision: title ? title.id : null,
    titleName: title ? title.titleName : null,
    facilityLevels: facilities,
    prosperityPoints: prosperity.points,
    prosperityTier: prosperity.current.tier,
    prosperityName: prosperity.current.name,
    ...sum,
  };
}

/* ---- 以上为 WL-13 core ---- */

function arenaTownCleanInt(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallback;
}

function arenaTownItemName(contentPack: EnhancedContentPack | undefined, itemId: string): string {
  return ((contentPack?.items as Array<{ id: string; name?: string }> | undefined) || []).find((i) => i.id === itemId)?.name || itemId;
}

function arenaSeasonLabel(index: number): string {
  const i = Math.floor(index);
  return `${Math.floor(i / 12)} 年 ${(((i % 12) + 12) % 12) + 1} 月赛季`;
}

function sanitizeArenaSettlement(raw: unknown): ArenaSettlementRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (arenaSeasonIndexFromKey(r.seasonKey) === null) return null;
  const settle = getArenaSettlement(arenaTownCleanInt(r.rung, 0));
  return {
    seasonKey: r.seasonKey as string,
    rung: settle.rung,
    division: settle.division,
    medals: settle.medals,
    newTitle: isValidArenaDivisionId(r.newTitle) ? r.newTitle : null,
  };
}

function sanitizeArenaDuel(raw: unknown): ArenaDuelRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (arenaSeasonIndexFromKey(r.seasonKey) === null) return null;
  const rung = Math.min(ARENA_RUNG_COUNT, Math.max(1, arenaTownCleanInt(r.rung, 1)));
  const at = typeof r.at === "string" && Number.isFinite(Date.parse(r.at)) ? r.at : new Date(0).toISOString();
  return {
    seasonKey: r.seasonKey as string,
    rung,
    championName: typeof r.championName === "string" ? r.championName.slice(0, 40) : `第 ${rung} 级擂主`,
    won: r.won === true,
    timeout: r.timeout === true && r.won !== true,
    playerHpLeft: arenaTownCleanInt(r.playerHpLeft, 0),
    playerMaxHp: arenaTownCleanInt(r.playerMaxHp, 0),
    enemyHpLeft: arenaTownCleanInt(r.enemyHpLeft, 0),
    enemyMaxHp: arenaTownCleanInt(r.enemyMaxHp, 0),
    durationMs: Math.min(ARENA_MAX_FIGHT_MS, arenaTownCleanInt(r.durationMs, 0)),
    gold: r.won === true ? arenaTownCleanInt(r.gold, 0) : 0,
    at,
  };
}

/** 赛季结算（内部）：按本季梯级定段位，发放勋章、解锁称号，记录结算单并开启新赛季（梯级归零）。 */
function settleArenaSeason(player: EnhancedPlayerState, sa: SkyArenaState, nextIndex: number): void {
  const settle = getArenaSettlement(sa.rung);
  const prevIndex = arenaSeasonIndexFromKey(sa.seasonKey)!;
  let newTitle: ArenaDivisionId | null = null;
  if (settle.division) {
    sa.medals = Math.min(ARENA_MEDAL_CAP, sa.medals + settle.medals);
    sa.totalMedalsEarned += settle.medals;
    if (!sa.titles.includes(settle.division)) {
      sa.titles = cleanArenaTitles([...sa.titles, settle.division]);
      newTitle = settle.division;
    }
    appendLog(
      player,
      `天空竞技场「${arenaSeasonLabel(prevIndex)}」结算：${settle.divisionName}段位（第 ${settle.rung} 级），获得 ${settle.medals} 枚竞技场勋章${
        newTitle ? `，解锁赛季称号「${settle.titleName}」` : ""
      }。`
    );
  }
  if (sa.rung > 0 || sa.seasonWins > 0 || sa.seasonLosses > 0) {
    sa.lastSettlement = { seasonKey: sa.seasonKey, rung: settle.rung, division: settle.division, medals: settle.medals, newTitle };
    sa.seasonsSettled += 1;
  }
  sa.seasonKey = arenaSeasonKeyFromIndex(nextIndex);
  sa.rung = 0;
  sa.seasonWins = 0;
  sa.seasonLosses = 0;
  appendLog(player, `天空竞技场「${arenaSeasonLabel(nextIndex)}」开幕：新一批擂主登场，梯级从第 1 级重新攀登！`);
}

/**
 * 确保 skyArena 存在并净化脏档（旧存档首次打开面板时补齐空记录，不赠送任何勋章或称号；转生永久保留）。
 * 仅显式传入 now（指令 / 视图时钟）时才会：东八区自然月前进 → 赛季结算；东八区日期前进 → 重置今日挑战次数。
 * 无参调用（ensurePlayerExtensions / 转生净化）只做净化，绝不按墙钟翻季或换日（沿用 WL-10 ~ WL-12 的显式时钟约定）。
 */
export function ensureSkyArena(player: EnhancedPlayerState, now?: Date): SkyArenaState {
  const clock = now ?? new Date();
  if (!Array.isArray((player as any).logs)) {
    (player as any).logs = [];
  }
  if (!player.inventory || typeof player.inventory !== "object") {
    player.inventory = { gold: 0 };
  }
  if (!player.skyArena || typeof player.skyArena !== "object") {
    player.skyArena = {
      seasonKey: arenaSeasonKey(clock),
      rung: 0,
      bestRung: 0,
      dayKey: arenaDayKey(clock),
      attemptsUsed: 0,
      seasonWins: 0,
      seasonLosses: 0,
      totalWins: 0,
      totalLosses: 0,
      medals: 0,
      totalMedalsEarned: 0,
      titles: [],
      seasonsSettled: 0,
      lastSettlement: null,
      lastDuel: null,
    };
  }
  const sa = player.skyArena;
  if (arenaSeasonIndexFromKey(sa.seasonKey) === null) {
    sa.seasonKey = arenaSeasonKey(clock);
  }
  if (!isValidArenaDayKey(sa.dayKey)) {
    sa.dayKey = arenaDayKey(clock);
  }
  sa.rung = Math.min(ARENA_RUNG_COUNT, arenaTownCleanInt(sa.rung, 0));
  sa.bestRung = Math.max(sa.rung, Math.min(ARENA_RUNG_COUNT, arenaTownCleanInt(sa.bestRung, 0)));
  sa.attemptsUsed = Math.min(ARENA_DAILY_ATTEMPTS, arenaTownCleanInt(sa.attemptsUsed, 0));
  sa.seasonWins = Math.max(sa.rung, arenaTownCleanInt(sa.seasonWins, 0));
  sa.seasonLosses = arenaTownCleanInt(sa.seasonLosses, 0);
  sa.totalWins = Math.max(sa.seasonWins, arenaTownCleanInt(sa.totalWins, 0));
  sa.totalLosses = Math.max(sa.seasonLosses, arenaTownCleanInt(sa.totalLosses, 0));
  sa.medals = Math.min(ARENA_MEDAL_CAP, arenaTownCleanInt(sa.medals, 0));
  sa.totalMedalsEarned = Math.max(sa.medals, arenaTownCleanInt(sa.totalMedalsEarned, 0));
  sa.titles = cleanArenaTitles(sa.titles);
  sa.seasonsSettled = arenaTownCleanInt(sa.seasonsSettled, 0);
  sa.lastSettlement = sanitizeArenaSettlement(sa.lastSettlement);
  sa.lastDuel = sanitizeArenaDuel(sa.lastDuel);

  if (now !== undefined) {
    const curIdx = getArenaSeasonIndex(clock);
    const storedIdx = arenaSeasonIndexFromKey(sa.seasonKey)!;
    // 只向前翻季（时钟回拨不回滚）；跨多个月只结算一次存档所在赛季
    if (curIdx > storedIdx) settleArenaSeason(player, sa, curIdx);
    const day = arenaDayKey(clock);
    // 只向前换日；YYYY-MM-DD 字符串序与日期序一致
    if (day > sa.dayKey) {
      sa.dayKey = day;
      sa.attemptsUsed = 0;
    }
  }
  return sa;
}

function sanitizeTownUpgrade(raw: unknown): GuildTownUpgradeRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!isValidTownFacilityId(r.facilityId)) return null;
  const at = typeof r.at === "string" && Number.isFinite(Date.parse(r.at)) ? r.at : new Date(0).toISOString();
  return { facilityId: r.facilityId, level: Math.min(TOWN_MAX_LEVEL, Math.max(1, arenaTownCleanInt(r.level, 1))), at };
}

/** 确保 guildTown 存在并净化脏档（城镇没有时钟：任何调用都只做净化；转生永久保留）。 */
export function ensureGuildTown(player: EnhancedPlayerState): GuildTownState {
  if (!Array.isArray((player as any).logs)) {
    (player as any).logs = [];
  }
  if (!player.inventory || typeof player.inventory !== "object") {
    player.inventory = { gold: 0 };
  }
  if (!player.guildTown || typeof player.guildTown !== "object") {
    player.guildTown = {
      facilities: cleanTownFacilities(null),
      chestsClaimed: [],
      totalUpgrades: 0,
      goldInvested: 0,
      lastUpgrade: null,
    };
  }
  const gt = player.guildTown;
  gt.facilities = cleanTownFacilities(gt.facilities);
  // 只能领取已达到的繁荣等级宝箱（脏档里超前的领取记录剔除）
  const tier = getTownProsperity(gt.facilities).current.tier;
  gt.chestsClaimed = cleanTownChests(gt.chestsClaimed).filter((t) => t <= tier);
  const levelSum = TOWN_FACILITY_IDS.reduce((s, id) => s + gt.facilities[id], 0);
  gt.totalUpgrades = Math.max(levelSum, arenaTownCleanInt(gt.totalUpgrades, 0));
  gt.goldInvested = arenaTownCleanInt(gt.goldInvested, 0);
  gt.lastUpgrade = sanitizeTownUpgrade(gt.lastUpgrade);
  return gt;
}

/** 指令内统一推进竞技场时钟（翻季 + 换日）并补齐城镇，保证落库状态与响应视图一致。 */
function ensureArenaTownClocks(player: EnhancedPlayerState, now: Date) {
  return { sa: ensureSkyArena(player, now), gt: ensureGuildTown(player) };
}

export interface ArenaDuelResult {
  won: boolean;
  /** 10 分钟未分胜负（按落败计）。 */
  timeout: boolean;
  playerHpLeft: number;
  playerMaxHp: number;
  enemyHpLeft: number;
  enemyMaxHp: number;
  durationMs: number;
  /** 玩家竞技构建（满血、无临时增益）：攻 / 防 / 生命 / 攻击间隔。 */
  player: { atk: number; def: number; hp: number; intervalMs: number };
  /** 战报末尾几行（来自 hp_combat 引擎日志）。 */
  log: string[];
}

/**
 * 竞技场对决：以玩家真实战斗构建（战斗技能等级 + 装备 + 章节构筑 + 全部永久加成 + 已装备技能栏与触发条件）
 * 挑战擂主，直接复用 hp_combat 真实战斗引擎（startHpCombat + tickHpCombat），在存档的沙盒副本上推演，不动真实存档。
 * 竞技场规则：满血入场、禁用料理 / 饮品 / 魔力药水与临时药剂增益、不连战、上限 10 分钟。
 * 前端 arenaTown.previewArenaDuel 以 fightPreview.previewFight 逐步镜像（scripts/arena-town-parity.test.ts 守护）。
 */
export function simulateArenaDuel(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack,
  champion: ArenaChampion,
  now: Date = new Date()
): ArenaDuelResult {
  return simulateSandboxDuel(player, contentPack, arenaChampionMonster(champion), now);
}

/**
 * 沙盒对决（WL-13 竞技场与 WL-16 荣誉试炼共用）：深拷贝玩家、清空临时增益与战斗补给、满血开打，
 * 直接跑 hp_combat 真实战斗引擎（固定随机源），上限 10 分钟，超时按落败计。
 */
export function simulateSandboxDuel(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack,
  monster: ReturnType<typeof arenaChampionMonster>,
  now: Date
): ArenaDuelResult {
  const sandbox = JSON.parse(JSON.stringify(player)) as EnhancedPlayerState;
  sandbox.activeBuffs = [];
  sandbox.combatLoadout = { food: [], drink: [], mp: [], autoRepeat: false };
  sandbox.combatHp = undefined;
  sandbox.combatHpAt = undefined;
  sandbox.hpCombat = undefined;
  (sandbox as any).logs = [];
  const arenaPack = {
    ...contentPack,
    monsters: [...((contentPack.monsters as Array<Record<string, unknown>>) || []), monster],
  } as EnhancedContentPack;
  const startMs = now.getTime();
  sandbox.hpCombat = startHpCombat(sandbox, arenaPack, monster.id, now);
  const playerMaxHp = sandbox.hpCombat.playerMaxHp;
  const intervalMs = sandbox.hpCombat.playerIntervalMs;
  const build = playerBuildExtras(sandbox);
  const pc = playerCombatant(sandbox, arenaPack, build);
  tickHpCombat(sandbox, arenaPack, new Date(startMs + ARENA_MAX_FIGHT_MS), ARENA_MAX_FIGHT_MS, () => 0.99);
  const enc = sandbox.hpCombat!;
  const won = enc.outcome === "win";
  const lost = enc.outcome === "loss";
  // 引擎在分出胜负的那一刻写入 combatHpAt，以此得出精确用时；超时则为满 10 分钟
  const endMs = won || lost ? Number(sandbox.combatHpAt ?? startMs + ARENA_MAX_FIGHT_MS) : startMs + ARENA_MAX_FIGHT_MS;
  return {
    won,
    timeout: !won && !lost,
    playerHpLeft: Math.max(0, enc.playerHp),
    playerMaxHp,
    enemyHpLeft: Math.max(0, enc.enemyHp),
    enemyMaxHp: enc.enemyMaxHp,
    durationMs: Math.max(0, Math.min(ARENA_MAX_FIGHT_MS, endMs - startMs)),
    player: { atk: pc.atk, def: pc.def, hp: playerMaxHp, intervalMs },
    log: (enc.log || []).slice(-6),
  };
}

/** 挑战下一位擂主：消耗 1 次今日挑战次数，胜则晋级并领取金币，负 / 超时只记录战绩。 */
export function challengeSkyArena(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack | undefined,
  now: Date = new Date(),
  expectedRung?: number
): {
  ok: boolean;
  reason?: string;
  won?: boolean;
  timeout?: boolean;
  rung?: number;
  championName?: string;
  gold?: number;
  attemptsLeft?: number;
  duel?: ArenaDuelResult;
} {
  ensurePlayerExtensions(player);
  if (!contentPack) return { ok: false, reason: "竞技场暂未开放（缺少内容包）" };
  const { sa } = ensureArenaTownClocks(player, now);
  if (sa.rung >= ARENA_RUNG_COUNT) {
    return { ok: false, reason: "本赛季已登顶天空竞技场第 30 级，等待月末赛季结算" };
  }
  const target = sa.rung + 1;
  if (expectedRung !== undefined && expectedRung !== target) {
    return { ok: false, reason: `擂主已更替：当前应挑战第 ${target} 级，请刷新后再试` };
  }
  if (sa.attemptsUsed >= ARENA_DAILY_ATTEMPTS) {
    return { ok: false, reason: `今日挑战次数已用完（每个东八区日 ${ARENA_DAILY_ATTEMPTS} 次），明日 0 点重置` };
  }
  const seasonIndex = arenaSeasonIndexFromKey(sa.seasonKey)!;
  const champion = generateArenaChampion(seasonIndex, target);
  const duel = simulateArenaDuel(player, contentPack, champion, now);
  sa.attemptsUsed += 1;
  let gold = 0;
  if (duel.won) {
    sa.rung = target;
    sa.bestRung = Math.max(sa.bestRung, target);
    sa.seasonWins += 1;
    sa.totalWins += 1;
    gold = champion.gold;
    player.inventory.gold = (player.inventory.gold || 0) + gold;
    if (player.stats) player.stats.totalGoldEarned = (player.stats.totalGoldEarned || 0) + gold;
  } else {
    sa.seasonLosses += 1;
    sa.totalLosses += 1;
  }
  sa.lastDuel = {
    seasonKey: sa.seasonKey,
    rung: target,
    championName: champion.name,
    won: duel.won,
    timeout: duel.timeout,
    playerHpLeft: duel.playerHpLeft,
    playerMaxHp: duel.playerMaxHp,
    enemyHpLeft: duel.enemyHpLeft,
    enemyMaxHp: duel.enemyMaxHp,
    durationMs: duel.durationMs,
    gold,
    at: now.toISOString(),
  };
  addReputation(player, duel.won ? 3 : 1);
  syncAchievements(player);
  const secs = Math.max(1, Math.round(duel.durationMs / 1000));
  if (duel.won) {
    const division = getArenaDivisionForRung(target)!;
    appendLog(player, `天空竞技场第 ${target} 级：击败「${champion.name}」（${secs} 秒），获得 ${gold} 金币，当前段位${division.name}。`);
  } else {
    appendLog(
      player,
      `天空竞技场第 ${target} 级：${duel.timeout ? "10 分钟未分胜负，判负" : "败给"}「${champion.name}」（剩余 ${duel.enemyHpLeft}/${duel.enemyMaxHp} 生命）。`
    );
  }
  return {
    ok: true,
    won: duel.won,
    timeout: duel.timeout,
    rung: target,
    championName: champion.name,
    gold,
    attemptsLeft: ARENA_DAILY_ATTEMPTS - sa.attemptsUsed,
    duel,
  };
}

/** 公会城镇：以金币 + 真实生活职业成品（荣耀演武场高阶另需竞技场勋章）建造 / 升级设施。 */
export function upgradeTownFacility(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack | undefined,
  facilityId: TownFacilityId,
  now: Date = new Date()
): {
  ok: boolean;
  reason?: string;
  facilityId?: TownFacilityId;
  level?: number;
  spentGold?: number;
  spentItems?: Record<string, number>;
  spentMedals?: number;
  prosperityPoints?: number;
  prosperityTier?: number;
} {
  ensurePlayerExtensions(player);
  if (!isValidTownFacilityId(facilityId)) {
    return { ok: false, reason: "未知的城镇设施" };
  }
  const { sa, gt } = ensureArenaTownClocks(player, now);
  const def = getTownFacilityDef(facilityId);
  const cur = gt.facilities[facilityId];
  if (cur >= TOWN_MAX_LEVEL) {
    return { ok: false, reason: `「${def.name}」已建至满级 Lv.${TOWN_MAX_LEVEL}` };
  }
  const cap = getTownFacilityCap(facilityId, gt.facilities);
  if (cur + 1 > cap) {
    return {
      ok: false,
      reason: cap === 0 ? "请先建造「公会议事厅」" : `「${def.name}」需先将公会议事厅升至 Lv.${cur + 1}`,
    };
  }
  const lv = def.levels[cur];
  const spentItems: Record<string, number> = {};
  for (const [itemId, qty] of Object.entries(lv.items)) {
    const have = Math.floor(Number(player.inventory[itemId] || 0));
    if (have < qty) {
      return {
        ok: false,
        reason: `${cur === 0 ? "建造" : "升级"}「${def.name}」需「${arenaTownItemName(contentPack, itemId)}」×${qty}（当前 ${have}）`,
      };
    }
    spentItems[itemId] = qty;
  }
  if (lv.medals > 0 && sa.medals < lv.medals) {
    return { ok: false, reason: `「${def.name}」Lv.${lv.level} 需 ${lv.medals} 枚竞技场勋章（当前 ${sa.medals}）` };
  }
  if ((player.inventory.gold || 0) < lv.gold) {
    return { ok: false, reason: `金币不足：${cur === 0 ? "建造" : "升级"}「${def.name}」需 ${lv.gold} 金币` };
  }
  const prevTier = getTownProsperity(gt.facilities).current;
  for (const [itemId, qty] of Object.entries(spentItems)) {
    player.inventory[itemId] = Math.floor(Number(player.inventory[itemId] || 0)) - qty;
    if (player.inventory[itemId] <= 0) delete player.inventory[itemId];
  }
  player.inventory.gold = (player.inventory.gold || 0) - lv.gold;
  if (player.stats) player.stats.totalGoldSpent = (player.stats.totalGoldSpent || 0) + lv.gold;
  if (lv.medals > 0) sa.medals -= lv.medals;
  gt.facilities[facilityId] = cur + 1;
  gt.totalUpgrades += 1;
  gt.goldInvested += lv.gold;
  gt.lastUpgrade = { facilityId, level: cur + 1, at: now.toISOString() };
  const prosperity = getTownProsperity(gt.facilities);
  addReputation(player, 4);
  syncAchievements(player);
  appendLog(
    player,
    `公会城镇「${def.name}」${cur === 0 ? "落成" : "升至"} Lv.${cur + 1}，繁荣度 ${prosperity.points}${lv.perk ? `；${lv.perk}` : ""}。`
  );
  if (prosperity.current.tier > prevTier.tier) {
    appendLog(player, `公会领地晋升「${prosperity.current.name}」！繁荣宝箱已可领取。`);
  }
  return {
    ok: true,
    facilityId,
    level: cur + 1,
    spentGold: lv.gold,
    spentItems,
    spentMedals: lv.medals,
    prosperityPoints: prosperity.points,
    prosperityTier: prosperity.current.tier,
  };
}

/** 繁荣宝箱：每个繁荣等级首次达到后可领取一次（金币 + 真实物品）。 */
export function claimTownProsperityChest(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack | undefined,
  tier: number,
  now: Date = new Date()
): { ok: boolean; reason?: string; tier?: number; gold?: number; items?: Record<string, number> } {
  ensurePlayerExtensions(player);
  const def = TOWN_PROSPERITY_TIERS.find((t) => t.tier === tier && t.tier > 0);
  if (!def) return { ok: false, reason: "未知的繁荣宝箱" };
  const { gt } = ensureArenaTownClocks(player, now);
  const prosperity = getTownProsperity(gt.facilities);
  if (prosperity.current.tier < def.tier) {
    return { ok: false, reason: `「${def.name}」繁荣宝箱需繁荣度 ${def.minPoints}（当前 ${prosperity.points}）` };
  }
  if (gt.chestsClaimed.includes(def.tier)) {
    return { ok: false, reason: `「${def.name}」繁荣宝箱已领取` };
  }
  gt.chestsClaimed = cleanTownChests([...gt.chestsClaimed, def.tier]);
  const items: Record<string, number> = {};
  for (const [id, qty] of Object.entries(def.chestItems)) {
    player.inventory[id] = Math.floor(Number(player.inventory[id] || 0)) + qty;
    items[id] = qty;
  }
  player.inventory.gold = (player.inventory.gold || 0) + def.chestGold;
  if (player.stats) player.stats.totalGoldEarned = (player.stats.totalGoldEarned || 0) + def.chestGold;
  const itemText = Object.entries(items)
    .map(([id, qty]) => `${arenaTownItemName(contentPack, id)}×${qty}`)
    .join("、");
  appendLog(player, `开启「${def.name}」繁荣宝箱：${def.chestGold} 金币${itemText ? `、${itemText}` : ""}。`);
  return { ok: true, tier: def.tier, gold: def.chestGold, items };
}

/** 构造前端「天空竞技场 & 公会城镇」面板视图（会补齐两份状态，并按显式 now 翻季 / 换日；附带前 3 位擂主的真实引擎预演）。 */
export function getSkyArenaTownInfo(player: EnhancedPlayerState, contentPack?: EnhancedContentPack, now: Date = new Date()) {
  ensurePlayerExtensions(player);
  const { sa, gt } = ensureArenaTownClocks(player, now);
  const nowMs = now.getTime();
  const itemName = (id: string) => arenaTownItemName(contentPack, id);
  const have = (id: string) => Math.floor(Number(player.inventory[id] || 0));
  const gold = Math.floor(Number(player.inventory.gold || 0));
  const bonuses = getArenaTownBonuses(player);
  const seasonIndex = arenaSeasonIndexFromKey(sa.seasonKey)!;
  const ladder = getArenaLadder(seasonIndex);
  const attemptsLeft = Math.max(0, ARENA_DAILY_ATTEMPTS - sa.attemptsUsed);
  const division = getArenaDivisionForRung(sa.rung);
  const settlementPreview = getArenaSettlement(sa.rung);
  const bestTitle = getArenaBestTitle(sa.titles);

  const upcomingChampions = ladder.slice(sa.rung, Math.min(ARENA_RUNG_COUNT, sa.rung + 3));
  const duels = upcomingChampions.map((c) => (contentPack ? simulateArenaDuel(player, contentPack, c, now) : null));
  const buildStats =
    duels[0]?.player ??
    (contentPack && sa.rung >= ARENA_RUNG_COUNT ? simulateArenaDuel(player, contentPack, ladder[ARENA_RUNG_COUNT - 1], now).player : null);
  const mechanicTable = ((contentPack?.bossMechanics as Array<{ id: string; label?: string; desc?: string }> | undefined) || []);
  const upcoming = upcomingChampions.map((c, i) => {
    const duel = duels[i];
    return {
      ...c,
      mechanicLabels: c.mechanics.map((id) => {
        const m = mechanicTable.find((d) => d.id === id);
        return { id, label: m?.label || id, desc: m?.desc || "" };
      }),
      preview: duel
        ? {
            won: duel.won,
            timeout: duel.timeout,
            playerHpLeft: duel.playerHpLeft,
            playerMaxHp: duel.playerMaxHp,
            enemyHpLeft: duel.enemyHpLeft,
            enemyMaxHp: duel.enemyMaxHp,
            durationMs: duel.durationMs,
          }
        : null,
      next: i === 0,
    };
  });
  const next = upcoming[0] ?? null;
  let challengeBlock: string | null = null;
  if (!contentPack) challengeBlock = "竞技场暂未开放";
  else if (sa.rung >= ARENA_RUNG_COUNT) challengeBlock = "本赛季已登顶";
  else if (attemptsLeft <= 0) challengeBlock = "今日次数已用完";

  const facilities = TOWN_FACILITIES.map((f) => {
    const level = gt.facilities[f.id];
    const cap = getTownFacilityCap(f.id, gt.facilities);
    const nextLv = level < TOWN_MAX_LEVEL ? f.levels[level] : null;
    const items = nextLv
      ? Object.entries(nextLv.items).map(([itemId, qty]) => ({ itemId, name: itemName(itemId), qty, have: have(itemId) }))
      : [];
    let blockReason: string | null = null;
    if (!nextLv) blockReason = "已满级";
    else if (level + 1 > cap) blockReason = cap === 0 ? "需先建议事厅" : `需议事厅 Lv.${level + 1}`;
    else if (items.some((it) => it.have < it.qty)) blockReason = "成品不足";
    else if (nextLv.medals > sa.medals) blockReason = "勋章不足";
    else if (gold < nextLv.gold) blockReason = "金币不足";
    return {
      id: f.id,
      name: f.name,
      subtitle: f.subtitle,
      description: f.description,
      iconKind: f.iconKind,
      iconId: f.iconId,
      prosperityPerLevel: f.prosperityPerLevel,
      level,
      maxLevel: TOWN_MAX_LEVEL,
      cap,
      currentStats: level > 0 ? f.levels[level - 1].stats : {},
      currentPerk: level > 0 ? f.levels[level - 1].perk : null,
      next: nextLv
        ? {
            level: nextLv.level,
            gold: nextLv.gold,
            medals: nextLv.medals,
            items,
            stats: nextLv.stats,
            perk: nextLv.perk,
          }
        : null,
      perks: f.levels.filter((l) => l.perk).map((l) => ({ level: l.level, perk: l.perk as string, unlocked: level >= l.level })),
      canUpgrade: blockReason === null,
      blockReason,
    };
  });

  const prosperity = getTownProsperity(gt.facilities);
  const chests = TOWN_PROSPERITY_TIERS.filter((t) => t.tier > 0).map((t) => {
    const claimed = gt.chestsClaimed.includes(t.tier);
    const reached = prosperity.current.tier >= t.tier;
    return {
      tier: t.tier,
      name: t.name,
      minPoints: t.minPoints,
      stats: t.stats,
      gold: t.chestGold,
      items: Object.entries(t.chestItems).map(([itemId, qty]) => ({ itemId, name: itemName(itemId), qty })),
      reached,
      claimed,
      canClaim: reached && !claimed,
    };
  });

  return {
    nowMs,
    bonuses,
    arena: {
      seasonKey: sa.seasonKey,
      seasonIndex,
      seasonLabel: arenaSeasonLabel(seasonIndex),
      startsAtMs: arenaSeasonStartMs(seasonIndex),
      endsAtMs: arenaSeasonEndsAtMs(seasonIndex),
      dayKey: sa.dayKey,
      dayEndsAtMs: arenaDayEndsAtMs(nowMs),
      rungCount: ARENA_RUNG_COUNT,
      rung: sa.rung,
      bestRung: sa.bestRung,
      division: division ? { id: division.id, name: division.name } : null,
      attemptsPerDay: ARENA_DAILY_ATTEMPTS,
      attemptsUsed: sa.attemptsUsed,
      attemptsLeft,
      seasonWins: sa.seasonWins,
      seasonLosses: sa.seasonLosses,
      totalWins: sa.totalWins,
      totalLosses: sa.totalLosses,
      medals: sa.medals,
      totalMedalsEarned: sa.totalMedalsEarned,
      titles: sa.titles,
      bestTitle: bestTitle ? { id: bestTitle.id, name: bestTitle.titleName, stats: bestTitle.titleStats } : null,
      seasonsSettled: sa.seasonsSettled,
      settlementPreview,
      lastSettlement: sa.lastSettlement
        ? {
            ...sa.lastSettlement,
            seasonLabel: arenaSeasonLabel(arenaSeasonIndexFromKey(sa.lastSettlement.seasonKey)!),
            divisionName: getArenaSettlement(sa.lastSettlement.rung).divisionName,
            newTitleName: sa.lastSettlement.newTitle
              ? ARENA_DIVISIONS.find((d) => d.id === sa.lastSettlement!.newTitle)!.titleName
              : null,
          }
        : null,
      lastDuel: sa.lastDuel,
      buildStats,
      next,
      upcoming,
      challengeBlock,
      canChallenge: challengeBlock === null && next !== null,
      ladder: ladder.map((c) => ({
        rung: c.rung,
        name: c.name,
        archetypeName: c.archetypeName,
        division: c.division,
        gatekeeper: c.gatekeeper,
        defeated: c.rung <= sa.rung,
        current: c.rung === sa.rung + 1,
      })),
      divisions: ARENA_DIVISIONS.map((d) => ({
        id: d.id,
        name: d.name,
        minRung: d.minRung,
        maxRung: d.maxRung,
        medals: d.medals,
        titleName: d.titleName,
        titleStats: d.titleStats,
        reached: sa.rung >= d.minRung,
        titleOwned: sa.titles.includes(d.id),
      })),
    },
    town: {
      facilities,
      prosperity: {
        points: prosperity.points,
        maxPoints: TOWN_FACILITIES.reduce((s, f) => s + f.prosperityPerLevel * TOWN_MAX_LEVEL, 0),
        tier: prosperity.current.tier,
        name: prosperity.current.name,
        stats: prosperity.current.stats,
        next: prosperity.next ? { tier: prosperity.next.tier, name: prosperity.next.name, minPoints: prosperity.next.minPoints, stats: prosperity.next.stats } : null,
        progressPct: prosperity.progressPct,
      },
      chests,
      totalUpgrades: gt.totalUpgrades,
      goldInvested: gt.goldInvested,
      lastUpgrade: gt.lastUpgrade
        ? { ...gt.lastUpgrade, facilityName: getTownFacilityDef(gt.lastUpgrade.facilityId).name }
        : null,
      medals: sa.medals,
    },
  };
}
