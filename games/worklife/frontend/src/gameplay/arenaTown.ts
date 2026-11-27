// 天空竞技场赛季排位 & 公会领地城镇建设 (WL-13) —— 前端镜像。
// 与 backend/src/progression2/arena_town.ts 同名表与纯函数逐字对称（scripts/arena-town-parity.test.ts 守护），
// 供面板展示擂主梯队、段位 / 称号 / 勋章结算、设施等级与繁荣度，以及 combatSheet 攻防血 / 金币倍率使用；
// previewArenaDuel 以 fightPreview.previewFight 逐步镜像后端 simulateArenaDuel（hp_combat 真实战斗引擎）。
// 任何数值改动必须两端同步。

import type { CombatSheet } from "./combatSheet";
import { previewFight, type PreviewAbility, type PreviewMonster } from "./fightPreview";
import { resolveMechanicDefs, type BossMechanicDef } from "./bossMechanics";

export type ArenaDivisionId = "bronze" | "silver" | "gold" | "platinum" | "diamond" | "sky_king";

export type ArenaArchetypeId = "iron_wall" | "gale" | "berserker" | "arcane" | "knight" | "colossus";

export type TownFacilityId =
  | "town_hall"
  | "artisan_row"
  | "harvest_market"
  | "training_grounds"
  | "guild_bank"
  | "sage_library";

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

/** 竞技场 / 城镇加成 → 面板展示用短句（只列非零项）。 */
export function formatArenaTownStats(s: ArenaTownStats | null | undefined): string[] {
  if (!s) return [];
  const out: string[] = [];
  if (s.gatherSpeedPct) out.push(`采集速度 +${s.gatherSpeedPct}%`);
  if (s.craftSpeedPct) out.push(`制作速度 +${s.craftSpeedPct}%`);
  if (s.xpGainPct) out.push(`生活技能经验 +${s.xpGainPct}%`);
  if (s.goldGainPct) out.push(`单人战斗金币 +${s.goldGainPct}%`);
  if (s.bonusAtk) out.push(`攻击 +${s.bonusAtk}`);
  if (s.bonusDef) out.push(`防御 +${s.bonusDef}`);
  if (s.bonusHp) out.push(`生命 +${s.bonusHp}`);
  return out;
}

/** 对决用时：65_000 → 1 分 5 秒；9_000 → 9 秒。 */
export function formatDuelDuration(ms: number): string {
  const secs = Math.max(1, Math.round((Number(ms) || 0) / 1000));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m <= 0) return `${s} 秒`;
  return s > 0 ? `${m} 分 ${s} 秒` : `${m} 分钟`;
}

/** 擂主 → fightPreview 怪物（附上从内容包 bossMechanics 表解析的守擂人机制）。 */
export function arenaChampionPreviewMonster(champion: ArenaChampion, mechanicTable: readonly BossMechanicDef[] | undefined): PreviewMonster {
  return { ...arenaChampionMonster(champion), mechanicDefs: resolveMechanicDefs(champion.mechanics, mechanicTable) };
}

/**
 * 竞技场对决预演（镜像后端 simulateArenaDuel）：竞技场规则下的战斗面板（满血、无临时增益）+ 已装备技能栏，
 * 对擂主跑 fightPreview.previewFight，上限 10 分钟，超时按落败计。
 */
export function previewArenaDuel(
  sheet: CombatSheet,
  champion: ArenaChampion,
  abilities: PreviewAbility[],
  mechanicTable: readonly BossMechanicDef[] | undefined
) {
  const p = previewFight(sheet, arenaChampionPreviewMonster(champion, mechanicTable), abilities, ARENA_MAX_FIGHT_MS);
  const lost = !p.won && p.playerHpLeft <= 0;
  return {
    won: p.won,
    timeout: !p.won && !lost,
    playerHpLeft: p.playerHpLeft,
    playerMaxHp: sheet.hp,
    enemyHpLeft: p.enemyHpLeft,
    enemyMaxHp: champion.hp,
    durationMs: Math.min(ARENA_MAX_FIGHT_MS, p.durationMs),
  };
}
