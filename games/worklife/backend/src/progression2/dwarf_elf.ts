// 进阶进度 · 矮人地底矿脉 & 精灵林地驿站 (WL-17)
// 从 progression2.ts 原样拆出；对外一律从 "../progression2" 引用。

import type {
  EnhancedContentPack,
  EnhancedPlayerState,
  MineGradeId,
  ElfExpeditionSourceId,
  DwarfMineHaul,
  DwarfMineHaulRecord,
  DwarfMineState,
  ElfWaystationState,
} from "../types";
import { ensurePlayerExtensions, appendLog } from "../storage";
import { syncAchievements } from "../progression";
import { addReputation } from "./reputation";
import { tavernItemName } from "./bard_tavern";

/* ============================ 矮人地底矿脉 & 精灵林地驿站 (WL-17) ============================ */
// 前端 frontend/src/gameplay/dwarfElf.ts 逐表逐式 1:1 镜像（scripts/dwarf-elf-parity.test.ts 守护，
// 「WL-17 core」区段两端逐字一致）。
// - 矮人地底矿脉（转生永久保留，在途矿车清空）：六个矿层，每层两种内容包真实矿石（铁匠「挖掘」行动产出、锻造「冶炼」
//   行动消耗）与一种伴生锻造材料（锻造配方真实消耗）。东八区日序号哈希确定每层当天的矿种与品位（贫 / 中 / 富 / 极品），
//   每层每日 2 车；派矿车下井按矿车容量 × 品位倍率带回矿石（富矿 / 极品另带伴生材料），直接入背包接入既有锻造材料。
//   矿道深度（金币 + 坑木木板 + 铁轨金属锭）决定能下到第几层，铁匠采矿等级决定当世能否下到该层（转生后需重新练级）；
//   矿车 1~5 级提高装载量并缩短出车时长。换日与回矿只在显式传入 now 时发生。
// - 精灵林地驿站（转生永久保留）：每个东八区日按张贴时的好感等级张贴三张委托——两张采集委托交出内容包真实采集行动的
//   产出，一张远征委托读取存档里已有的远征商队返航 / 星界遗迹勘探 / 浮空飞艇抵港计数（以张贴时为基线，不新增计数器）；
//   完成委托累积林地好感（全清额外 +6），好感等级给只作用于采集行动的永久加成，逐项封顶（采集速度 5% / 采集产出效率 4% /
//   采集经验 3%），接入 getActionRates。
/* ---- 以下为与后端逐字对称的表与纯函数（WL-17 core） ---- */

export const MINE_GRADE_IDS: readonly MineGradeId[] = ["lean", "common", "rich", "bonanza"];

export const ELF_EXPEDITION_SOURCE_IDS: readonly ElfExpeditionSourceId[] = ["caravan_runs", "relic_surveys", "airship_voyages"];

/** 矮人矿脉与精灵驿站都按东八区日期（每日 0 点）换日：矿脉品位与委托板随之轮换。 */
export const MINE_TZ_OFFSET_MINUTES = 480;
/** 每个矿层每个东八区日可出车的次数（矿脉当日储量）。 */
export const MINE_HAULS_PER_LAYER_PER_DAY = 2;
/** 每层矿道折合的竖井深度（米，仅展示）。 */
export const MINE_METERS_PER_LAYER = 120;
/** 计数器上限（防脏档溢出）。 */
export const MINE_COUNTER_CAP = 1_000_000_000;
/** 每日委托板的三个栏位：0、1 为采集委托，2 为远征委托。 */
export const ELF_BOARD_SLOTS: readonly number[] = [0, 1, 2];
export const ELF_EXPEDITION_SLOT = 2;
/** 当日三张委托全部完成的额外林地好感。 */
export const ELF_FULL_BOARD_BONUS = 6;
/** 林地好感上限（只增不减）。 */
export const ELF_FAVOR_CAP = 99_999;

export interface MineGradeDef {
  id: MineGradeId;
  name: string;
  /** 抽中权重（四档合计 100）。 */
  weight: number;
  /** 矿石产量倍率（百分比，整数运算两端一致）。 */
  yieldPct: number;
  /** 每车额外带回的伴生锻造材料件数。 */
  byproduct: number;
}

export const MINE_GRADES: readonly MineGradeDef[] = [
  { id: "lean", name: "贫矿", weight: 30, yieldPct: 70, byproduct: 0 },
  { id: "common", name: "中品", weight: 40, yieldPct: 100, byproduct: 0 },
  { id: "rich", name: "富矿", weight: 22, yieldPct: 135, byproduct: 1 },
  { id: "bonanza", name: "极品", weight: 8, yieldPct: 180, byproduct: 3 },
];

export interface MineLayerDef {
  layer: number;
  name: string;
  /** 本层可能出现的矿脉：内容包真实矿石（铁匠「挖掘」行动产出、锻造「冶炼」行动消耗）。 */
  ores: readonly string[];
  /** 本层的伴生锻造材料：内容包真实物品（锻造配方消耗）。 */
  byproductId: string;
  /** 下到本层所需的铁匠采矿等级 = 内容包挖掘本层首种矿石的等级要求。 */
  minMiningLevel: number;
  /** 出车基准时长（分钟）。 */
  baseMinutes: number;
  description: string;
}

export const MINE_LAYERS: readonly MineLayerDef[] = [
  {
    layer: 1,
    name: "苔石浅坑道",
    ores: ["ore_1", "ore_2"],
    byproductId: "crystal_1",
    minMiningLevel: 1,
    baseMinutes: 10,
    description: "矮人老矿工口中的练手坑，铜铁矿脉沿着苔石裂缝铺开，偶尔夹着微光水晶。",
  },
  {
    layer: 2,
    name: "回声矿廊",
    ores: ["ore_3", "ore_4"],
    byproductId: "frost_shard",
    minMiningLevel: 24,
    baseMinutes: 14,
    description: "敲一镐能听见三声回响，银金矿脉旁常冻着霜寒碎晶。",
  },
  {
    layer: 3,
    name: "熔脉断层",
    ores: ["ore_5", "ore_6"],
    byproductId: "obsidian_chunk",
    minMiningLevel: 48,
    baseMinutes: 18,
    description: "地热把岩层烤得发红，白金与秘银矿脉之间嵌着黑曜石块。",
  },
  {
    layer: 4,
    name: "冰核深渊",
    ores: ["ore_7", "ore_8"],
    byproductId: "glacier_core",
    minMiningLevel: 72,
    baseMinutes: 22,
    description: "越往下反而越冷，精金与玄铁矿脉缠着冰川之核。",
  },
  {
    layer: 5,
    name: "圣辉矿穹",
    ores: ["ore_9", "ore_10"],
    byproductId: "holy_gold",
    minMiningLevel: 96,
    baseMinutes: 26,
    description: "矿穹顶上透下微光，神域秘银与星陨神铁之间能凿出圣辉金。",
  },
  {
    layer: 6,
    name: "炼狱心核",
    ores: ["ore_11", "ore_12"],
    byproductId: "infernal_core",
    minMiningLevel: 120,
    baseMinutes: 30,
    description: "矮人传说里的世界之底，创世圣矿与寰宇原矿紧挨着炼狱之核。",
  },
];

export interface MineDepthDef {
  /** 矿道深度 = 能下到的最深矿层。 */
  depth: number;
  name: string;
  /** 掘进到该深度的金币花费（1 级为初始矿道）。 */
  costGold: number;
  /** 掘进消耗的真实生活职业成品（坑木支护 + 铁轨）。 */
  materials: Record<string, number>;
}

export const MINE_DEPTHS: readonly MineDepthDef[] = [
  { depth: 1, name: "浅层矿道", costGold: 0, materials: {} },
  { depth: 2, name: "回声支护矿道", costGold: 2500, materials: { lumber_2: 20, ingot_2: 15 } },
  { depth: 3, name: "隔热石拱矿道", costGold: 8000, materials: { lumber_4: 20, ingot_4: 15 } },
  { depth: 4, name: "寒铁加固矿道", costGold: 25000, materials: { lumber_6: 20, ingot_6: 15 } },
  { depth: 5, name: "符文穹顶矿道", costGold: 70000, materials: { lumber_8: 20, ingot_8: 15 } },
  { depth: 6, name: "世界之底竖井", costGold: 180000, materials: { lumber_10: 20, ingot_10: 15 } },
];

export interface MineCartDef {
  level: number;
  name: string;
  /** 每车装载的矿石基数（块，再乘矿脉品位）。 */
  capacity: number;
  /** 出车时长缩短（百分点）。 */
  speedPct: number;
  /** 升到该级的金币花费（1 级为初始矿车）。 */
  costGold: number;
  /** 升到该级消耗的真实生活职业成品。 */
  materials: Record<string, number>;
}

export const MINE_CARTS: readonly MineCartDef[] = [
  { level: 1, name: "木轮矿车", capacity: 8, speedPct: 0, costGold: 0, materials: {} },
  { level: 2, name: "铁箍矿车", capacity: 12, speedPct: 5, costGold: 1200, materials: { lumber_1: 12, ingot_2: 10 } },
  { level: 3, name: "银轴矿车", capacity: 16, speedPct: 10, costGold: 4500, materials: { lumber_3: 10, ingot_3: 12 } },
  { level: 4, name: "精钢矿车", capacity: 21, speedPct: 15, costGold: 15000, materials: { lumber_5: 10, ingot_5: 12 } },
  { level: 5, name: "符文矿车", capacity: 27, speedPct: 20, costGold: 45000, materials: { lumber_7: 10, ingot_7: 12 } },
];

export interface ElfStats {
  gatherSpeedPct?: number;
  gatherEfficiencyPct?: number;
  gatherXpPct?: number;
}

export const ELF_STAT_KEYS: readonly (keyof ElfStats)[] = ["gatherSpeedPct", "gatherEfficiencyPct", "gatherXpPct"];

/** 林地好感永久加成封顶（最高好感等级恰好到顶；脏档再高也不会超过）。 */
export const ELF_BONUS_CAPS: Required<ElfStats> = { gatherSpeedPct: 5, gatherEfficiencyPct: 4, gatherXpPct: 3 };

export interface ElfFavorTierDef {
  tier: number;
  /** 累计林地好感达到该值即晋升。 */
  minFavor: number;
  name: string;
  /** 该等级的永久加成（只作用于采集行动）。 */
  stats: ElfStats;
}

export const ELF_FAVOR_TIERS: readonly ElfFavorTierDef[] = [
  { tier: 0, minFavor: 0, name: "陌生旅人", stats: {} },
  { tier: 1, minFavor: 30, name: "林间访客", stats: { gatherSpeedPct: 1 } },
  { tier: 2, minFavor: 90, name: "树语之友", stats: { gatherSpeedPct: 2, gatherXpPct: 1 } },
  { tier: 3, minFavor: 200, name: "月桂同伴", stats: { gatherSpeedPct: 3, gatherEfficiencyPct: 2, gatherXpPct: 1 } },
  { tier: 4, minFavor: 380, name: "精灵挚友", stats: { gatherSpeedPct: 4, gatherEfficiencyPct: 3, gatherXpPct: 2 } },
  { tier: 5, minFavor: 650, name: "林地守望者", stats: { gatherSpeedPct: 5, gatherEfficiencyPct: 4, gatherXpPct: 3 } },
];

export interface ElfExpeditionSourceDef {
  id: ElfExpeditionSourceId;
  name: string;
  /** 读数出处（存档里已有的真实计数，不新增计数器）。 */
  source: string;
  /** 图标：复用既有系统的真实美术（skills/<artId>）。 */
  artId: string;
  unit: string;
}

export const ELF_EXPEDITION_SOURCES: readonly ElfExpeditionSourceDef[] = [
  { id: "caravan_runs", name: "远征商车满载归来", source: "远征商队", artId: "caravan_hub_banner", unit: "趟" },
  { id: "relic_surveys", name: "星界遗迹勘探", source: "星界遗迹勘探队", artId: "astral_ruin_compass", unit: "次" },
  { id: "airship_voyages", name: "浮空飞艇抵港", source: "浮空飞艇商路", artId: "trade_airship", unit: "趟" },
];

export interface ElfGatherCommissionDef {
  id: string;
  /** 委托的精灵。 */
  client: string;
  /** 内容包真实采集行动（委托所需物品即其产出）。 */
  actionId: string;
  itemId: string;
  qty: number;
  favor: number;
  gold: number;
  /** 张贴所需的林地好感等级。 */
  minTier: number;
}

export const ELF_GATHER_COMMISSIONS: readonly ElfGatherCommissionDef[] = [
  { id: "elf_poplar", client: "林语者艾菈", actionId: "act_chop_wood_t1", itemId: "wood_1", qty: 20, favor: 5, gold: 280, minTier: 0 },
  { id: "elf_cotton", client: "织叶人茜尔", actionId: "act_gather_fiber_t1", itemId: "fiber_1", qty: 20, favor: 5, gold: 280, minTier: 0 },
  { id: "elf_river", client: "溪畔歌者洛恩", actionId: "act_fish_river_t1", itemId: "fish_river", qty: 12, favor: 5, gold: 300, minTier: 0 },
  { id: "elf_glow", client: "萤光学徒菲雅", actionId: "act_mine_crystal_t1", itemId: "crystal_1", qty: 15, favor: 5, gold: 220, minTier: 0 },
  { id: "elf_copper", client: "林地铁匠托维", actionId: "act_mine_ore_t1", itemId: "ore_1", qty: 15, favor: 5, gold: 220, minTier: 0 },
  { id: "elf_hemlock", client: "林语者艾菈", actionId: "act_chop_wood_t2", itemId: "wood_2", qty: 18, favor: 7, gold: 450, minTier: 1 },
  { id: "elf_flax", client: "织叶人茜尔", actionId: "act_gather_fiber_t2", itemId: "fiber_2", qty: 18, favor: 7, gold: 450, minTier: 1 },
  { id: "elf_shrimp", client: "溪畔歌者洛恩", actionId: "act_fish_shrimp_t1", itemId: "shrimp", qty: 12, favor: 7, gold: 320, minTier: 1 },
  { id: "elf_grain", client: "月桂园丁薇拉", actionId: "act_plant_grain_t1", itemId: "grain", qty: 30, favor: 7, gold: 200, minTier: 1 },
  { id: "elf_willow", client: "林语者艾菈", actionId: "act_chop_wood_t3", itemId: "wood_3", qty: 15, favor: 9, gold: 700, minTier: 2 },
  { id: "elf_herb", client: "月桂园丁薇拉", actionId: "act_plant_herb_t3", itemId: "herb_farm", qty: 12, favor: 9, gold: 420, minTier: 2 },
  { id: "elf_lake", client: "溪畔歌者洛恩", actionId: "act_fish_t3", itemId: "fish_lake", qty: 10, favor: 9, gold: 780, minTier: 2 },
  { id: "elf_resin", client: "萤光学徒菲雅", actionId: "act_tap_resin", itemId: "resin", qty: 10, favor: 9, gold: 420, minTier: 2 },
  { id: "elf_birch", client: "林语者艾菈", actionId: "act_chop_wood_t4", itemId: "wood_4", qty: 12, favor: 11, gold: 1050, minTier: 3 },
  { id: "elf_flower", client: "月桂园丁薇拉", actionId: "act_plant_flower_t4", itemId: "flower_spirit", qty: 10, favor: 11, gold: 560, minTier: 3 },
  { id: "elf_deepsea", client: "溪畔歌者洛恩", actionId: "act_fish_t4", itemId: "fish_deepsea", qty: 8, favor: 11, gold: 1100, minTier: 3 },
  { id: "elf_blaze", client: "萤光学徒菲雅", actionId: "act_mine_crystal_t4", itemId: "crystal_4", qty: 10, favor: 11, gold: 900, minTier: 3 },
  { id: "elf_dusk", client: "林语者艾菈", actionId: "act_chop_wood_t5", itemId: "wood_5", qty: 10, favor: 13, gold: 1650, minTier: 4 },
  { id: "elf_starfiber", client: "织叶人茜尔", actionId: "act_gather_fiber_t5", itemId: "fiber_5", qty: 10, favor: 13, gold: 1650, minTier: 4 },
  { id: "elf_abyss", client: "溪畔歌者洛恩", actionId: "act_fish_t5", itemId: "fish_abyss", qty: 6, favor: 13, gold: 1500, minTier: 4 },
  { id: "elf_holy", client: "萤光学徒菲雅", actionId: "act_mine_crystal_t5", itemId: "crystal_5", qty: 8, favor: 13, gold: 1350, minTier: 4 },
];

export interface ElfExpeditionCommissionDef {
  id: string;
  client: string;
  sourceId: ElfExpeditionSourceId;
  /** 委托板张贴后需要新完成的次数。 */
  target: number;
  favor: number;
  gold: number;
  minTier: number;
}

export const ELF_EXPEDITION_COMMISSIONS: readonly ElfExpeditionCommissionDef[] = [
  { id: "elf_caravan_1", client: "驿站长希尔凡", sourceId: "caravan_runs", target: 1, favor: 10, gold: 500, minTier: 0 },
  { id: "elf_relic_1", client: "星图守望者奥瑞", sourceId: "relic_surveys", target: 1, favor: 10, gold: 500, minTier: 0 },
  { id: "elf_airship_2", client: "云端信使琪琳", sourceId: "airship_voyages", target: 2, favor: 10, gold: 500, minTier: 0 },
  { id: "elf_caravan_2", client: "驿站长希尔凡", sourceId: "caravan_runs", target: 2, favor: 16, gold: 1500, minTier: 3 },
  { id: "elf_relic_2", client: "星图守望者奥瑞", sourceId: "relic_surveys", target: 2, favor: 16, gold: 1500, minTier: 3 },
  { id: "elf_airship_4", client: "云端信使琪琳", sourceId: "airship_voyages", target: 4, favor: 16, gold: 1500, minTier: 3 },
];

export function isValidMineGradeId(id: unknown): id is MineGradeId {
  return typeof id === "string" && (MINE_GRADE_IDS as readonly string[]).includes(id);
}

export function isValidElfExpeditionSourceId(id: unknown): id is ElfExpeditionSourceId {
  return typeof id === "string" && (ELF_EXPEDITION_SOURCE_IDS as readonly string[]).includes(id);
}

/** 合法矿层：1 ~ 6 的整数。 */
export function isValidMineLayer(layer: unknown): layer is number {
  return typeof layer === "number" && Number.isInteger(layer) && layer >= 1 && layer <= MINE_LAYERS.length;
}

function mineCleanCount(v: unknown, cap: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.min(cap, Math.floor(n)) : 0;
}

function mineObj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

/** 东八区日序号（1970-01-01 东八区 = 0）。 */
export function mineDayIndex(now: Date | number): number {
  const ms = typeof now === "number" ? now : now.getTime();
  return Math.floor((ms + MINE_TZ_OFFSET_MINUTES * 60_000) / 86_400_000);
}

/** 日序号 → 东八区日期键 YYYY-MM-DD。 */
export function mineDayKeyFromIndex(index: number): string {
  return new Date(Math.floor(index) * 86_400_000).toISOString().slice(0, 10);
}

export function mineDayKey(now: Date | number): string {
  return mineDayKeyFromIndex(mineDayIndex(now));
}

/** 日期键 → 日序号；非法键返回 null。 */
export function mineDayIndexFromKey(key: unknown): number | null {
  if (typeof key !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const ms = Date.parse(`${key}T00:00:00.000Z`);
  if (!Number.isFinite(ms)) return null;
  const index = Math.floor(ms / 86_400_000);
  return mineDayKeyFromIndex(index) === key ? index : null;
}

/** 当前东八区日结束（次日 0 点）的 UTC 毫秒时间戳。 */
export function mineDayEndsAtMs(now: Date | number): number {
  return (mineDayIndex(now) + 1) * 86_400_000 - MINE_TZ_OFFSET_MINUTES * 60_000;
}

/** 32 位整数混合哈希（矿脉与委托板的唯一随机源，纯确定性）。 */
export function mineHash(a: number, b: number): number {
  let h = (Math.imul((a | 0) ^ 0x6a09e667, 0x9e3779b1) + Math.imul((b | 0) + 0x510e527f, 0x85ebca77)) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

/** 矿层定义（脏数据按 1 层；超出按最深层）。 */
export function getMineLayerDef(layer: unknown): MineLayerDef {
  const n = Math.min(MINE_LAYERS.length, Math.max(1, mineCleanCount(layer, MINE_LAYERS.length)));
  return MINE_LAYERS[n - 1];
}

/** 矿道深度（脏数据按 1 级；超出按最深）。 */
export function getMineDepth(depth: unknown): MineDepthDef {
  const n = Math.min(MINE_DEPTHS.length, Math.max(1, mineCleanCount(depth, MINE_DEPTHS.length)));
  return MINE_DEPTHS[n - 1];
}

/** 矿车等级（脏数据按 1 级；超出按满级）。 */
export function getMineCart(level: unknown): MineCartDef {
  const n = Math.min(MINE_CARTS.length, Math.max(1, mineCleanCount(level, MINE_CARTS.length)));
  return MINE_CARTS[n - 1];
}

export function getMineGradeDef(id: MineGradeId): MineGradeDef {
  return MINE_GRADES.find((g) => g.id === id) || MINE_GRADES[0];
}

/** 某个东八区日某矿层的矿脉：矿种与品位都由日序号与层号哈希确定（同一天全服一致）。 */
export function getMineVein(dayIndex: number, layer: unknown) {
  const d = Number.isFinite(dayIndex) ? Math.floor(dayIndex) : 0;
  const def = getMineLayerDef(layer);
  const oreId = def.ores[mineHash(d, 0x0e00 + def.layer) % def.ores.length];
  const roll = mineHash(d, 0x0f00 + def.layer) % 100;
  let acc = 0;
  let grade = MINE_GRADES[MINE_GRADES.length - 1];
  for (const g of MINE_GRADES) {
    acc += g.weight;
    if (roll < acc) {
      grade = g;
      break;
    }
  }
  return {
    layer: def.layer,
    oreId,
    grade: grade.id,
    gradeName: grade.name,
    yieldPct: grade.yieldPct,
    byproductId: def.byproductId,
    byproduct: grade.byproduct,
  };
}

/** 某个东八区日的整张矿脉图（六层）。 */
export function getMineVeinMap(dayIndex: number) {
  return MINE_LAYERS.map((l) => getMineVein(dayIndex, l.layer));
}

/** 出车时长 = 本层基准分钟 × (100 - 矿车提速)%。 */
export function getMineHaulMs(layer: unknown, cartLevel: unknown): number {
  const def = getMineLayerDef(layer);
  return Math.round((def.baseMinutes * 60_000 * (100 - getMineCart(cartLevel).speedPct)) / 100);
}

/** 一车的产出：矿石 = 矿车容量 × 品位倍率（至少 1 块），富矿 / 极品额外带回本层的伴生锻造材料。 */
export function getMineHaulYield(dayIndex: number, layer: unknown, cartLevel: unknown) {
  const vein = getMineVein(dayIndex, layer);
  const cart = getMineCart(cartLevel);
  return {
    layer: vein.layer,
    oreId: vein.oreId,
    grade: vein.grade,
    gradeName: vein.gradeName,
    oreQty: Math.max(1, Math.floor((cart.capacity * vein.yieldPct) / 100)),
    byproductId: vein.byproductId,
    byproductQty: vein.byproduct,
  };
}

/** 今日各层已出车次数净化：只认 1 ~ 6 层，每层不超过当日储量。 */
export function cleanMineHaulsToday(raw: unknown): Record<string, number> {
  const src = mineObj(raw);
  const out: Record<string, number> = {};
  for (const l of MINE_LAYERS) {
    const n = mineCleanCount(src[String(l.layer)], MINE_HAULS_PER_LAYER_PER_DAY);
    if (n > 0) out[String(l.layer)] = n;
  }
  return out;
}

/** 出车计划：矿道深度、铁匠采矿等级、当日储量与矿车是否在外，共同决定能否下到某层。 */
export function planMineHaul(
  dayIndex: number,
  layer: unknown,
  depth: unknown,
  cartLevel: unknown,
  miningLevel: unknown,
  haulsToday: unknown,
  busy: unknown
) {
  const valid = isValidMineLayer(layer);
  const def = getMineLayerDef(layer);
  const depthOk = valid && getMineDepth(depth).depth >= def.layer;
  const level = mineCleanCount(miningLevel, MINE_COUNTER_CAP);
  const levelOk = valid && level >= def.minMiningLevel;
  const used = valid ? cleanMineHaulsToday(haulsToday)[String(def.layer)] || 0 : 0;
  const haulsLeft = valid ? MINE_HAULS_PER_LAYER_PER_DAY - used : 0;
  const idle = busy !== true;
  return {
    ok: valid && depthOk && levelOk && haulsLeft > 0 && idle,
    layer: valid ? def.layer : null,
    depthOk,
    levelOk,
    miningLevel: level,
    haulsLeft,
    idle,
    durationMs: valid ? getMineHaulMs(def.layer, cartLevel) : 0,
    yield: valid ? getMineHaulYield(dayIndex, def.layer, cartLevel) : null,
  };
}

function mineMaterialPlan(next: { costGold: number; materials: Record<string, number> } | null, gold: unknown, inventory: unknown) {
  const inv = mineObj(inventory);
  const g = mineCleanCount(gold, Number.MAX_SAFE_INTEGER);
  const materials = next
    ? Object.entries(next.materials).map(([itemId, need]) => ({ itemId, need, have: mineCleanCount(inv[itemId], MINE_COUNTER_CAP) }))
    : [];
  const goldOk = next !== null && g >= next.costGold;
  const materialsOk = materials.every((m) => m.have >= m.need);
  return { goldOk, materialsOk, materials };
}

/** 矿道掘进计划：下一深度的金币与真实材料是否齐备（最深返回 maxed）。 */
export function planMineDepthUpgrade(depth: unknown, gold: unknown, inventory: unknown) {
  const current = getMineDepth(depth);
  const next = MINE_DEPTHS.find((d) => d.depth === current.depth + 1) ?? null;
  const m = mineMaterialPlan(next, gold, inventory);
  return { ok: next !== null && m.goldOk && m.materialsOk, maxed: next === null, current, next, ...m };
}

/** 矿车升级计划：下一级的金币与真实材料是否齐备（满级返回 maxed）。 */
export function planMineCartUpgrade(cartLevel: unknown, gold: unknown, inventory: unknown) {
  const current = getMineCart(cartLevel);
  const next = MINE_CARTS.find((c) => c.level === current.level + 1) ?? null;
  const m = mineMaterialPlan(next, gold, inventory);
  return { ok: next !== null && m.goldOk && m.materialsOk, maxed: next === null, current, next, ...m };
}

/** 林地好感等级：累计好感决定等级与永久加成（含下一等级进度）。 */
export function getElfFavorTier(favor: unknown) {
  const n = mineCleanCount(favor, ELF_FAVOR_CAP);
  let current = ELF_FAVOR_TIERS[0];
  let next: ElfFavorTierDef | null = null;
  for (let i = 0; i < ELF_FAVOR_TIERS.length; i++) {
    if (n >= ELF_FAVOR_TIERS[i].minFavor) {
      current = ELF_FAVOR_TIERS[i];
      next = ELF_FAVOR_TIERS[i + 1] ?? null;
    }
  }
  const progressPct = next
    ? Math.min(100, Math.max(0, Math.round(((n - current.minFavor) / Math.max(1, next.minFavor - current.minFavor)) * 100)))
    : 100;
  return { favor: n, current, next, progressPct };
}

export type MinimalElfHolder = {
  elfWaystation?: {
    favor?: unknown;
  } | null;
} | null;

export interface ElfWaystationBonuses {
  favor: number;
  tier: number;
  tierName: string;
  gatherSpeedPct: number;
  gatherEfficiencyPct: number;
  gatherXpPct: number;
}

/** 林地好感的永久加成：按好感等级取值，逐项封顶（采集速度 5% / 采集产出效率 4% / 采集经验 3%），只作用于采集行动。 */
export function getElfWaystationBonuses(holder?: MinimalElfHolder): ElfWaystationBonuses {
  const ew = mineObj(holder?.elfWaystation);
  const tier = getElfFavorTier(ew.favor);
  const out: Required<ElfStats> = { gatherSpeedPct: 0, gatherEfficiencyPct: 0, gatherXpPct: 0 };
  for (const k of ELF_STAT_KEYS) out[k] = Math.min(ELF_BONUS_CAPS[k], Math.max(0, tier.current.stats[k] || 0));
  return { favor: tier.favor, tier: tier.current.tier, tierName: tier.current.name, ...out };
}

/**
 * 某个东八区日的驿站委托板：按张贴时的好感等级筛出委托池，两张不同的采集委托 + 一张远征委托，
 * 都由日序号哈希确定（同一天、同一好感等级全服一致）。
 */
export function getElfBoard(dayIndex: number, boardTier: unknown) {
  const d = Number.isFinite(dayIndex) ? Math.floor(dayIndex) : 0;
  const tier = Math.min(ELF_FAVOR_TIERS.length - 1, mineCleanCount(boardTier, ELF_FAVOR_TIERS.length - 1));
  const gatherPool = ELF_GATHER_COMMISSIONS.filter((c) => c.minTier <= tier);
  const a = mineHash(d, 0xe1f0) % gatherPool.length;
  const b = (a + 1 + (mineHash(d, 0xe1f1) % (gatherPool.length - 1))) % gatherPool.length;
  const expeditionPool = ELF_EXPEDITION_COMMISSIONS.filter((c) => c.minTier <= tier);
  const gather: ElfGatherCommissionDef[] = [gatherPool[a], gatherPool[b]];
  return { dayIndex: d, tier, gather, expedition: expeditionPool[mineHash(d, 0xe1f2) % expeditionPool.length] };
}

/** 今日已完成的委托栏位（只认 0 / 1 / 2，去重升序）。 */
export function cleanElfCompleted(raw: unknown): number[] {
  const list = Array.isArray(raw) ? (raw as unknown[]) : [];
  return ELF_BOARD_SLOTS.filter((s) => list.includes(s));
}

/** 从存档里已有的真实计数读出远征读数（远征商车返航 / 遗迹勘探 / 飞艇抵港；不新增任何计数器，脏数据按 0）。 */
export function getElfExpeditionCounters(holder: unknown): Record<ElfExpeditionSourceId, number> {
  const h = mineObj(holder);
  return {
    caravan_runs: mineCleanCount(mineObj(h.caravanTrade).totalRunsCompleted, MINE_COUNTER_CAP),
    relic_surveys: mineCleanCount(mineObj(h.astralRelics).totalSurveys, MINE_COUNTER_CAP),
    airship_voyages: mineCleanCount(mineObj(h.airshipTrade).totalVoyages, MINE_COUNTER_CAP),
  };
}

/** 远征委托进度 = 当前读数 - 委托板张贴时的基线（读数若被重置则从 0 重新计）。 */
export function getElfExpeditionProgress(current: unknown, base: unknown): number {
  const c = mineCleanCount(current, MINE_COUNTER_CAP);
  const b = mineCleanCount(base, MINE_COUNTER_CAP);
  return c >= b ? c - b : c;
}

/** 交付计划：采集委托（栏位 0 / 1）交出背包里的真实采集物；远征委托（栏位 2）看张贴以来新完成的远征次数。 */
export function planElfCommission(
  dayIndex: number,
  boardTier: unknown,
  slot: unknown,
  completed: unknown,
  inventory: unknown,
  counters: unknown,
  base: unknown
) {
  const board = getElfBoard(dayIndex, boardTier);
  const s = typeof slot === "number" && Number.isInteger(slot) && ELF_BOARD_SLOTS.includes(slot) ? slot : null;
  const done = cleanElfCompleted(completed);
  let kind: "gather" | "expedition" | null = null;
  let commissionId: string | null = null;
  let need = 0;
  let have = 0;
  let favor = 0;
  let gold = 0;
  if (s === ELF_EXPEDITION_SLOT) {
    const def = board.expedition;
    kind = "expedition";
    commissionId = def.id;
    need = def.target;
    have = getElfExpeditionProgress(mineObj(counters)[def.sourceId], mineObj(base)[def.sourceId]);
    favor = def.favor;
    gold = def.gold;
  } else if (s !== null) {
    const def = board.gather[s];
    kind = "gather";
    commissionId = def.id;
    need = def.qty;
    have = mineCleanCount(mineObj(inventory)[def.itemId], MINE_COUNTER_CAP);
    favor = def.favor;
    gold = def.gold;
  }
  const isDone = s !== null && done.includes(s);
  const enough = s !== null && have >= need;
  const ok = s !== null && !isDone && enough;
  const fullBoard = ok && done.length === ELF_BOARD_SLOTS.length - 1;
  return {
    ok,
    slot: s,
    kind,
    commissionId,
    need,
    have,
    enough,
    done: isDone,
    favor,
    gold,
    fullBoard,
    bonusFavor: fullBoard ? ELF_FULL_BOARD_BONUS : 0,
  };
}

/* ---- 以上为 WL-17 core ---- */

const MINE_EPOCH_ISO = new Date(0).toISOString();

function mineIsoOr(v: unknown, fallback: string): string {
  const ms = typeof v === "string" ? Date.parse(v) : Number.NaN;
  return Number.isFinite(ms) ? new Date(ms).toISOString() : fallback;
}

const mineGold = (player: EnhancedPlayerState) => Math.floor(Number(player.inventory.gold || 0));

/** 铁匠采矿等级（skill_blacksmith，转生会重置）：决定能下到哪些矿层。 */
const mineMiningLevel = (player: EnhancedPlayerState) => Math.max(1, Math.floor(Number((player.skills as any)?.skill_blacksmith?.level || 1)));

function sanitizeMineHaul(raw: unknown, depth: number, cartLevel: number): DwarfMineHaul | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const startedMs = typeof r.startedAt === "string" ? Date.parse(r.startedAt) : Number.NaN;
  if (!isValidMineLayer(r.layer) || r.layer > depth || mineDayIndexFromKey(r.dayKey) === null || !Number.isFinite(startedMs)) return null;
  // 回矿时刻恒为出车时刻 + 本层在当前矿车下的时长（矿车在外时不能升级），脏档改不短
  return {
    layer: r.layer,
    dayKey: r.dayKey as string,
    startedAt: new Date(startedMs).toISOString(),
    returnsAt: new Date(startedMs + getMineHaulMs(r.layer, cartLevel)).toISOString(),
  };
}

function sanitizeMineHaulRecord(raw: unknown): DwarfMineHaulRecord | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (!isValidMineLayer(r.layer) || !isValidMineGradeId(r.grade)) return null;
  const def = getMineLayerDef(r.layer);
  if (typeof r.oreId !== "string" || !def.ores.includes(r.oreId)) return null;
  return {
    layer: def.layer,
    oreId: r.oreId,
    oreQty: mineCleanCount(r.oreQty, MINE_COUNTER_CAP),
    grade: r.grade,
    byproductId: def.byproductId,
    byproductQty: mineCleanCount(r.byproductQty, MINE_COUNTER_CAP),
    at: mineIsoOr(r.at, MINE_EPOCH_ISO),
  };
}

/** 矿车回矿：按出车当日的矿脉与当前矿车结算，矿石与伴生锻造材料直接入背包（时间戳取真实回矿时刻）。 */
function returnMineHaul(player: EnhancedPlayerState, dm: DwarfMineState, contentPack?: EnhancedContentPack) {
  const h = dm.haul!;
  const y = getMineHaulYield(mineDayIndexFromKey(h.dayKey)!, h.layer, dm.cartLevel);
  player.inventory[y.oreId] = Math.floor(Number(player.inventory[y.oreId] || 0)) + y.oreQty;
  if (y.byproductQty > 0) {
    player.inventory[y.byproductId] = Math.floor(Number(player.inventory[y.byproductId] || 0)) + y.byproductQty;
  }
  dm.haul = null;
  dm.totalHauls = Math.min(MINE_COUNTER_CAP, dm.totalHauls + 1);
  dm.totalOre = Math.min(MINE_COUNTER_CAP, dm.totalOre + y.oreQty);
  dm.totalByproduct = Math.min(MINE_COUNTER_CAP, dm.totalByproduct + y.byproductQty);
  if (y.grade === "bonanza") dm.bonanzaHauls = Math.min(MINE_COUNTER_CAP, dm.bonanzaHauls + 1);
  dm.lastHaul = {
    layer: y.layer,
    oreId: y.oreId,
    oreQty: y.oreQty,
    grade: y.grade,
    byproductId: y.byproductId,
    byproductQty: y.byproductQty,
    at: h.returnsAt,
  };
  const def = getMineLayerDef(y.layer);
  appendLog(
    player,
    `矮人地底矿脉：矿车从第 ${def.layer} 层「${def.name}」（${y.gradeName}）满载而归，带回「${mineItemName(contentPack, y.oreId)}」×${y.oreQty}${
      y.byproductQty > 0 ? `，伴生「${mineItemName(contentPack, y.byproductId)}」×${y.byproductQty}` : ""
    }。`
  );
}

/** 物品名（内容包真实名称；无内容包时回落到物品 id）。 */
function mineItemName(contentPack: EnhancedContentPack | undefined, itemId: string): string {
  return tavernItemName(contentPack, itemId);
}

/**
 * 确保 dwarfMine 存在并净化脏档（旧存档首次打开面板时开矿：浅层矿道、木轮矿车，不赠送任何矿石）。
 * 仅显式传入 now（指令 / 视图时钟）时才会换日（新的矿脉图、补满各层储量）与回矿；无参调用
 * （ensurePlayerExtensions / 转生净化）只做净化，绝不按墙钟推进（无效日期键回落到纪元日，下一次显式 now 再前推）。
 * contentPack 只用于回矿日志里的物品名。
 */
export function ensureDwarfMine(player: EnhancedPlayerState, now?: Date, contentPack?: EnhancedContentPack): DwarfMineState {
  if (!Array.isArray((player as any).logs)) {
    (player as any).logs = [];
  }
  if (!player.inventory || typeof player.inventory !== "object") {
    player.inventory = { gold: 0 };
  }
  const fallbackDayKey = now !== undefined ? mineDayKey(now) : mineDayKeyFromIndex(0);
  if (!player.dwarfMine || typeof player.dwarfMine !== "object" || Array.isArray(player.dwarfMine)) {
    player.dwarfMine = {
      dayKey: fallbackDayKey,
      depth: 1,
      cartLevel: 1,
      haulsToday: {},
      haul: null,
      totalHauls: 0,
      totalOre: 0,
      totalByproduct: 0,
      bonanzaHauls: 0,
      lastHaul: null,
    };
  }
  const dm = player.dwarfMine;
  if (mineDayIndexFromKey(dm.dayKey) === null) dm.dayKey = fallbackDayKey;
  dm.depth = getMineDepth(dm.depth).depth;
  dm.cartLevel = getMineCart(dm.cartLevel).level;
  dm.haulsToday = cleanMineHaulsToday(dm.haulsToday);
  dm.haul = sanitizeMineHaul(dm.haul, dm.depth, dm.cartLevel);
  dm.totalHauls = mineCleanCount(dm.totalHauls, MINE_COUNTER_CAP);
  dm.totalOre = mineCleanCount(dm.totalOre, MINE_COUNTER_CAP);
  dm.totalByproduct = mineCleanCount(dm.totalByproduct, MINE_COUNTER_CAP);
  dm.bonanzaHauls = Math.min(dm.totalHauls, mineCleanCount(dm.bonanzaHauls, MINE_COUNTER_CAP));
  dm.lastHaul = sanitizeMineHaulRecord(dm.lastHaul);
  if (now !== undefined) {
    if (dm.haul && now.getTime() >= Date.parse(dm.haul.returnsAt)) {
      returnMineHaul(player, dm, contentPack);
    }
    const cur = mineDayIndex(now);
    const stored = mineDayIndexFromKey(dm.dayKey)!;
    // 只向前换日（时钟回拨不回滚）：换上新一天的矿脉图并补满各层储量
    if (cur > stored) {
      dm.dayKey = mineDayKeyFromIndex(cur);
      dm.haulsToday = {};
    }
  }
  return dm;
}

/** 转生：保留矿道深度、矿车与累计记录，在途矿车里的矿石随旧世界散去（不能借矿车把旧世界的财富带进新一世）。 */
export function clearDwarfMineHaulForPrestige(player: EnhancedPlayerState) {
  const dm = ensureDwarfMine(player);
  const haul = dm.haul;
  dm.haul = null;
  if (haul) {
    appendLog(player, `转生：第 ${haul.layer} 层在途矿车里的矿石随旧世界一同散去（矿道深度与矿车保留）。`);
  }
  return Boolean(haul);
}

/**
 * 确保 elfWaystation 存在并净化脏档（旧存档首次打开面板时结识驿站：0 好感，不赠送任何加成）。
 * 仅显式传入 now 时才会换日（按当前好感等级张贴新委托板，并以存档里已有的远征读数为基线）；无参调用只做净化。
 */
export function ensureElfWaystation(player: EnhancedPlayerState, now?: Date): ElfWaystationState {
  if (!Array.isArray((player as any).logs)) {
    (player as any).logs = [];
  }
  const counters = getElfExpeditionCounters(player);
  const fallbackDayKey = now !== undefined ? mineDayKey(now) : mineDayKeyFromIndex(0);
  if (!player.elfWaystation || typeof player.elfWaystation !== "object" || Array.isArray(player.elfWaystation)) {
    player.elfWaystation = {
      dayKey: fallbackDayKey,
      boardTier: 0,
      completed: [],
      expeditionBase: { ...counters },
      favor: 0,
      totalCommissions: 0,
      fullBoards: 0,
      totalGold: 0,
      lastCommission: null,
    };
  }
  const ew = player.elfWaystation;
  if (mineDayIndexFromKey(ew.dayKey) === null) ew.dayKey = fallbackDayKey;
  ew.favor = mineCleanCount(ew.favor, ELF_FAVOR_CAP);
  const tierNow = getElfFavorTier(ew.favor).current.tier;
  ew.boardTier = Math.min(tierNow, mineCleanCount(ew.boardTier, ELF_FAVOR_TIERS.length - 1));
  ew.completed = cleanElfCompleted(ew.completed);
  // 基线缺失或脏数据时取当前读数（不能凭空让旧的远征记录直接完成委托）
  const baseRaw = mineObj(ew.expeditionBase);
  const base = {} as Record<ElfExpeditionSourceId, number>;
  for (const id of ELF_EXPEDITION_SOURCE_IDS) {
    const v = Number(baseRaw[id]);
    base[id] = Number.isFinite(v) && v >= 0 ? Math.min(MINE_COUNTER_CAP, Math.floor(v)) : counters[id];
  }
  ew.expeditionBase = base;
  ew.totalCommissions = mineCleanCount(ew.totalCommissions, MINE_COUNTER_CAP);
  ew.fullBoards = Math.min(ew.totalCommissions, mineCleanCount(ew.fullBoards, MINE_COUNTER_CAP));
  ew.totalGold = mineCleanCount(ew.totalGold, MINE_COUNTER_CAP);
  const lc = ew.lastCommission as unknown;
  if (lc && typeof lc === "object" && !Array.isArray(lc) && typeof (lc as any).commissionId === "string") {
    const r = lc as Record<string, unknown>;
    const id = r.commissionId as string;
    const known = ELF_GATHER_COMMISSIONS.some((c) => c.id === id) || ELF_EXPEDITION_COMMISSIONS.some((c) => c.id === id);
    ew.lastCommission = known
      ? {
          slot: Math.min(ELF_BOARD_SLOTS.length - 1, mineCleanCount(r.slot, ELF_BOARD_SLOTS.length - 1)),
          commissionId: id,
          favor: mineCleanCount(r.favor, ELF_FAVOR_CAP),
          gold: mineCleanCount(r.gold, MINE_COUNTER_CAP),
          at: mineIsoOr(r.at, MINE_EPOCH_ISO),
        }
      : null;
  } else {
    ew.lastCommission = null;
  }
  if (now !== undefined) {
    const cur = mineDayIndex(now);
    const stored = mineDayIndexFromKey(ew.dayKey)!;
    // 只向前换日（时钟回拨不回滚）：按当前好感等级张贴新委托板，远征基线取此刻的真实读数
    if (cur > stored) {
      ew.dayKey = mineDayKeyFromIndex(cur);
      ew.boardTier = tierNow;
      ew.completed = [];
      ew.expeditionBase = { ...counters };
    }
  }
  return ew;
}

/** 视图统一推进矿脉（换日 / 回矿）与驿站（换日）时钟，保证落库状态与响应视图一致。 */
function ensureDwarfElfClocks(player: EnhancedPlayerState, now: Date, contentPack?: EnhancedContentPack) {
  return { dm: ensureDwarfMine(player, now, contentPack), ew: ensureElfWaystation(player, now) };
}

/** 派矿车下井：沿已掘进的矿道下到某层，按今日矿脉出车（每层每日 2 车；回矿只在显式 now 到点时结算）。 */
export function dispatchMineCart(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack | undefined,
  layer: number,
  now: Date,
  expectedDayKey?: string
): {
  ok: boolean;
  reason?: string;
  layer?: number;
  oreId?: string;
  oreQty?: number;
  grade?: MineGradeId;
  byproductId?: string;
  byproductQty?: number;
  durationMs?: number;
  returnsAt?: string;
} {
  ensurePlayerExtensions(player);
  if (!isValidMineLayer(layer)) return { ok: false, reason: "未知的矿层" };
  const dm = ensureDwarfMine(player, now, contentPack);
  if (expectedDayKey !== undefined && expectedDayKey !== dm.dayKey) {
    return { ok: false, reason: `日期已更替：今天的矿脉图是 ${dm.dayKey}，请刷新后再试` };
  }
  const def = getMineLayerDef(layer);
  if (dm.haul) return { ok: false, reason: `矿车还在第 ${dm.haul.layer} 层「${getMineLayerDef(dm.haul.layer).name}」，回来后才能再出车` };
  const plan = planMineHaul(mineDayIndexFromKey(dm.dayKey)!, layer, dm.depth, dm.cartLevel, mineMiningLevel(player), dm.haulsToday, false);
  if (!plan.depthOk) return { ok: false, reason: `矿道还没掘进到第 ${def.layer} 层「${def.name}」` };
  if (!plan.levelOk) return { ok: false, reason: `下到「${def.name}」需铁匠采矿等级 ${def.minMiningLevel}（当前 ${plan.miningLevel}）` };
  if (plan.haulsLeft <= 0) return { ok: false, reason: `「${def.name}」今天的矿脉储量已采完（每层每日 ${MINE_HAULS_PER_LAYER_PER_DAY} 车），明天换新矿脉` };
  const y = plan.yield!;
  dm.haul = {
    layer: def.layer,
    dayKey: dm.dayKey,
    startedAt: now.toISOString(),
    returnsAt: new Date(now.getTime() + plan.durationMs).toISOString(),
  };
  dm.haulsToday = { ...dm.haulsToday, [String(def.layer)]: (dm.haulsToday[String(def.layer)] || 0) + 1 };
  appendLog(
    player,
    `矮人地底矿脉：矿车下到第 ${def.layer} 层「${def.name}」（今日${y.gradeName}「${mineItemName(contentPack, y.oreId)}」），预计 ${Math.round(
      plan.durationMs / 60_000
    )} 分钟后带回 ${y.oreQty} 块矿石。`
  );
  return {
    ok: true,
    layer: def.layer,
    oreId: y.oreId,
    oreQty: y.oreQty,
    grade: y.grade,
    byproductId: y.byproductId,
    byproductQty: y.byproductQty,
    durationMs: plan.durationMs,
    returnsAt: dm.haul.returnsAt,
  };
}

function spendMineMaterials(player: EnhancedPlayerState, costGold: number, materials: Array<{ itemId: string; need: number }>) {
  player.inventory.gold = mineGold(player) - costGold;
  if (player.stats) player.stats.totalGoldSpent = (player.stats.totalGoldSpent || 0) + costGold;
  for (const m of materials) {
    player.inventory[m.itemId] = Math.floor(Number(player.inventory[m.itemId] || 0)) - m.need;
    if (player.inventory[m.itemId] <= 0) delete player.inventory[m.itemId];
  }
}

function mineMissingText(contentPack: EnhancedContentPack | undefined, materials: Array<{ itemId: string; need: number; have: number }>) {
  return materials
    .filter((m) => m.have < m.need)
    .map((m) => `${mineItemName(contentPack, m.itemId)} ×${m.need}（现有 ${m.have}）`)
    .join("、");
}

/** 矿道掘进：金币 + 真实生活职业成品（坑木支护木板 + 铁轨金属锭），解锁更深的矿层（转生永久保留）。 */
export function upgradeMineDepth(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack | undefined,
  now: Date
): { ok: boolean; reason?: string; depth?: number; spentGold?: number } {
  ensurePlayerExtensions(player);
  const dm = ensureDwarfMine(player, now, contentPack);
  const plan = planMineDepthUpgrade(dm.depth, mineGold(player), player.inventory);
  if (plan.maxed || !plan.next) return { ok: false, reason: `矿道已掘进到最深的「${plan.current.name}」` };
  const next = plan.next;
  if (!plan.goldOk) return { ok: false, reason: `金币不足：掘进「${next.name}」需 ${next.costGold} 金币` };
  if (!plan.materialsOk) return { ok: false, reason: `材料不足：${mineMissingText(contentPack, plan.materials)}` };
  spendMineMaterials(player, next.costGold, plan.materials);
  dm.depth = next.depth;
  addReputation(player, 3);
  syncAchievements(player);
  const layer = getMineLayerDef(next.depth);
  appendLog(
    player,
    `矮人地底矿脉：矿道掘进为「${next.name}」（深 ${next.depth * MINE_METERS_PER_LAYER} 米），可以下到第 ${layer.layer} 层「${layer.name}」了。`
  );
  return { ok: true, depth: next.depth, spentGold: next.costGold };
}

/** 矿车升级：金币 + 真实生活职业成品，提高每车装载量并缩短出车时长（矿车在井下时不能升级）。 */
export function upgradeMineCart(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack | undefined,
  now: Date
): { ok: boolean; reason?: string; cartLevel?: number; capacity?: number; spentGold?: number } {
  ensurePlayerExtensions(player);
  const dm = ensureDwarfMine(player, now, contentPack);
  if (dm.haul) return { ok: false, reason: "矿车还在井下，回来后才能升级" };
  const plan = planMineCartUpgrade(dm.cartLevel, mineGold(player), player.inventory);
  if (plan.maxed || !plan.next) return { ok: false, reason: `矿车已是最高等级「${plan.current.name}」` };
  const next = plan.next;
  if (!plan.goldOk) return { ok: false, reason: `金币不足：升级「${next.name}」需 ${next.costGold} 金币` };
  if (!plan.materialsOk) return { ok: false, reason: `材料不足：${mineMissingText(contentPack, plan.materials)}` };
  spendMineMaterials(player, next.costGold, plan.materials);
  dm.cartLevel = next.level;
  addReputation(player, 2);
  syncAchievements(player);
  appendLog(player, `矮人地底矿脉：矿车升级为「${next.name}」：每车装载 ${next.capacity} 块，出车时长缩短 ${next.speedPct}%。`);
  return { ok: true, cartLevel: next.level, capacity: next.capacity, spentGold: next.costGold };
}

/** 完成驿站委托：采集委托交出背包里的真实采集物，远征委托凭张贴以来新完成的远征；领取林地好感与金币。 */
export function deliverElfCommission(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack | undefined,
  slot: number,
  now: Date,
  expectedDayKey?: string
): {
  ok: boolean;
  reason?: string;
  slot?: number;
  commissionId?: string;
  favor?: number;
  bonusFavor?: number;
  gold?: number;
  favorTotal?: number;
  tier?: number;
  tierUp?: boolean;
} {
  ensurePlayerExtensions(player);
  if (!ELF_BOARD_SLOTS.includes(slot)) return { ok: false, reason: "未知的委托栏位" };
  const ew = ensureElfWaystation(player, now);
  if (expectedDayKey !== undefined && expectedDayKey !== ew.dayKey) {
    return { ok: false, reason: `日期已更替：驿站今天的委托板是 ${ew.dayKey}，请刷新后再试` };
  }
  const today = mineDayIndexFromKey(ew.dayKey)!;
  const board = getElfBoard(today, ew.boardTier);
  const counters = getElfExpeditionCounters(player);
  const plan = planElfCommission(today, ew.boardTier, slot, ew.completed, player.inventory, counters, ew.expeditionBase);
  if (plan.done) return { ok: false, reason: "这张委托今天已经完成了，明天驿站会张贴新的委托" };
  let label = "";
  if (plan.kind === "gather") {
    const def = board.gather[slot];
    const name = mineItemName(contentPack, def.itemId);
    label = `「${name}」×${def.qty}`;
    if (!plan.enough) return { ok: false, reason: `背包里的「${name}」不足：需 ${def.qty}，现有 ${plan.have}` };
    player.inventory[def.itemId] = Math.floor(Number(player.inventory[def.itemId] || 0)) - def.qty;
    if (player.inventory[def.itemId] <= 0) delete player.inventory[def.itemId];
  } else {
    const def = board.expedition;
    const src = ELF_EXPEDITION_SOURCES.find((x) => x.id === def.sourceId)!;
    label = `「${src.name}」${def.target} ${src.unit}`;
    if (!plan.enough) {
      return { ok: false, reason: `远征进度不足：委托张贴后还需${src.name} ${def.target - plan.have} ${src.unit}（${src.source}）` };
    }
  }
  const prevTier = getElfFavorTier(ew.favor).current.tier;
  const favorGain = plan.favor + plan.bonusFavor;
  ew.favor = Math.min(ELF_FAVOR_CAP, ew.favor + favorGain);
  ew.completed = cleanElfCompleted([...ew.completed, slot]);
  ew.totalCommissions = Math.min(MINE_COUNTER_CAP, ew.totalCommissions + 1);
  if (plan.fullBoard) ew.fullBoards = Math.min(ew.totalCommissions, ew.fullBoards + 1);
  ew.totalGold = Math.min(MINE_COUNTER_CAP, ew.totalGold + plan.gold);
  ew.lastCommission = { slot, commissionId: plan.commissionId!, favor: favorGain, gold: plan.gold, at: now.toISOString() };
  player.inventory.gold = mineGold(player) + plan.gold;
  if (player.stats) player.stats.totalGoldEarned = (player.stats.totalGoldEarned || 0) + plan.gold;
  addReputation(player, plan.fullBoard ? 3 : 2);
  syncAchievements(player);
  const tier = getElfFavorTier(ew.favor).current;
  appendLog(
    player,
    `精灵林地驿站：完成委托 ${label}，林地好感 +${favorGain}${plan.fullBoard ? `（今日委托全部完成，额外 +${ELF_FULL_BOARD_BONUS}）` : ""}、金币 +${plan.gold}${
      tier.tier > prevTier ? `，好感升至「${tier.name}」！` : "。"
    }`
  );
  return {
    ok: true,
    slot,
    commissionId: plan.commissionId!,
    favor: plan.favor,
    bonusFavor: plan.bonusFavor,
    gold: plan.gold,
    favorTotal: ew.favor,
    tier: tier.tier,
    tierUp: tier.tier > prevTier,
  };
}

/** 构造前端「矮人地底矿脉 & 精灵林地驿站」视图（会补齐两份状态，并按显式 now 换日 / 回矿）。 */
export function getDwarfElfInfo(player: EnhancedPlayerState, contentPack: EnhancedContentPack | undefined, now: Date) {
  ensurePlayerExtensions(player);
  const { dm, ew } = ensureDwarfElfClocks(player, now, contentPack);
  const itemName = (id: string) => mineItemName(contentPack, id);
  const have = (id: string) => Math.floor(Number(player.inventory[id] || 0));
  const gold = mineGold(player);
  const today = mineDayIndexFromKey(dm.dayKey)!;
  const miningLevel = mineMiningLevel(player);
  const actions = ((contentPack as any)?.actions || []) as Array<{
    id: string;
    name: string;
    skillId: string;
    requirements?: { skillLevel?: number };
    consumes?: Array<{ itemId: string; qty: number }>;
    yields?: Array<{ itemId: string }>;
  }>;
  const skills = ((contentPack as any)?.skills || []) as Array<{ id: string; name: string }>;
  // 产出接入既有锻造材料：找内容包里消耗该物品的锻造（skill_smithing）配方
  const forgeUse = (itemId: string) => {
    const a = actions.find((x) => x.skillId === "skill_smithing" && (x.consumes || []).some((c) => c.itemId === itemId));
    return a ? { actionId: a.id, name: a.name, level: Number(a.requirements?.skillLevel || 1) } : null;
  };
  const cart = getMineCart(dm.cartLevel);
  const depth = getMineDepth(dm.depth);
  const depthPlan = planMineDepthUpgrade(dm.depth, gold, player.inventory);
  const cartPlan = planMineCartUpgrade(dm.cartLevel, gold, player.inventory);
  const layers = MINE_LAYERS.map((l) => {
    const plan = planMineHaul(today, l.layer, dm.depth, dm.cartLevel, miningLevel, dm.haulsToday, Boolean(dm.haul));
    const vein = getMineVein(today, l.layer);
    let block: string | null = null;
    if (!plan.depthOk) block = `需掘进到第 ${l.layer} 层`;
    else if (!plan.levelOk) block = `需采矿 Lv.${l.minMiningLevel}`;
    else if (plan.haulsLeft <= 0) block = "今日已采完";
    else if (!plan.idle) block = dm.haul && dm.haul.layer === l.layer ? "矿车在本层" : "矿车在外";
    return {
      layer: l.layer,
      name: l.name,
      description: l.description,
      meters: l.layer * MINE_METERS_PER_LAYER,
      ores: l.ores.map((id) => ({ id, name: itemName(id), have: have(id), smelt: forgeUse(id) })),
      byproduct: { id: l.byproductId, name: itemName(l.byproductId), have: have(l.byproductId), forge: forgeUse(l.byproductId) },
      minMiningLevel: l.minMiningLevel,
      baseMinutes: l.baseMinutes,
      durationMs: getMineHaulMs(l.layer, dm.cartLevel),
      vein: { ...vein, oreName: itemName(vein.oreId), byproductName: itemName(vein.byproductId) },
      yield: plan.yield,
      reached: plan.depthOk,
      levelOk: plan.levelOk,
      haulsUsed: MINE_HAULS_PER_LAYER_PER_DAY - plan.haulsLeft,
      haulsLeft: plan.haulsLeft,
      canHaul: plan.ok,
      block,
    };
  });
  const upgradeView = (
    p: ReturnType<typeof planMineDepthUpgrade> | ReturnType<typeof planMineCartUpgrade>,
    busyBlock: string | null
  ) => ({
    materials: p.materials.map((m) => ({ ...m, name: itemName(m.itemId) })),
    canUpgrade: p.ok && !busyBlock,
    block: p.maxed ? "已满级" : busyBlock ? busyBlock : !p.goldOk ? "金币不足" : !p.materialsOk ? "材料不足" : null,
  });
  const haulYield = dm.haul ? getMineHaulYield(mineDayIndexFromKey(dm.haul.dayKey)!, dm.haul.layer, dm.cartLevel) : null;

  const elfToday = mineDayIndexFromKey(ew.dayKey)!;
  const board = getElfBoard(elfToday, ew.boardTier);
  const counters = getElfExpeditionCounters(player);
  const actionView = (id: string) => {
    const a = actions.find((x) => x.id === id);
    return {
      actionId: id,
      actionName: a?.name || id,
      skillName: skills.find((s) => s.id === a?.skillId)?.name || "",
      level: Number(a?.requirements?.skillLevel || 1),
    };
  };
  const commissions = ELF_BOARD_SLOTS.map((slot) => {
    const plan = planElfCommission(elfToday, ew.boardTier, slot, ew.completed, player.inventory, counters, ew.expeditionBase);
    if (slot === ELF_EXPEDITION_SLOT) {
      const def = board.expedition;
      const src = ELF_EXPEDITION_SOURCES.find((x) => x.id === def.sourceId)!;
      return {
        slot,
        kind: "expedition" as const,
        id: def.id,
        client: def.client,
        sourceId: def.sourceId,
        sourceName: src.name,
        source: src.source,
        artId: src.artId,
        unit: src.unit,
        target: def.target,
        progress: Math.min(def.target, plan.have),
        current: counters[def.sourceId],
        base: ew.expeditionBase[def.sourceId],
        favor: def.favor,
        gold: def.gold,
        minTier: def.minTier,
        done: plan.done,
        canDeliver: plan.ok,
        fullBoard: plan.fullBoard,
        block: plan.done ? "已完成" : !plan.enough ? "远征进度不足" : null,
      };
    }
    const def = board.gather[slot];
    return {
      slot,
      kind: "gather" as const,
      id: def.id,
      client: def.client,
      itemId: def.itemId,
      itemName: itemName(def.itemId),
      ...actionView(def.actionId),
      qty: def.qty,
      have: plan.have,
      favor: def.favor,
      gold: def.gold,
      minTier: def.minTier,
      done: plan.done,
      canDeliver: plan.ok,
      fullBoard: plan.fullBoard,
      block: plan.done ? "已完成" : !plan.enough ? "背包数量不足" : null,
    };
  });
  const favorTier = getElfFavorTier(ew.favor);
  const lastDef = ew.lastCommission
    ? ELF_GATHER_COMMISSIONS.find((c) => c.id === ew.lastCommission!.commissionId) ??
      ELF_EXPEDITION_COMMISSIONS.find((c) => c.id === ew.lastCommission!.commissionId)
    : undefined;

  return {
    nowMs: now.getTime(),
    bonuses: getElfWaystationBonuses(player),
    mine: {
      dayKey: dm.dayKey,
      dayEndsAtMs: (today + 1) * 86_400_000 - MINE_TZ_OFFSET_MINUTES * 60_000,
      gold,
      miningLevel,
      depth: {
        level: depth.depth,
        name: depth.name,
        meters: depth.depth * MINE_METERS_PER_LAYER,
        maxLevel: MINE_DEPTHS.length,
        next: depthPlan.next
          ? { level: depthPlan.next.depth, name: depthPlan.next.name, costGold: depthPlan.next.costGold, meters: depthPlan.next.depth * MINE_METERS_PER_LAYER }
          : null,
        ...upgradeView(depthPlan, null),
        steps: MINE_DEPTHS.map((d) => ({ level: d.depth, name: d.name, reached: dm.depth >= d.depth })),
      },
      cart: {
        level: cart.level,
        name: cart.name,
        capacity: cart.capacity,
        speedPct: cart.speedPct,
        maxLevel: MINE_CARTS.length,
        next: cartPlan.next
          ? { level: cartPlan.next.level, name: cartPlan.next.name, capacity: cartPlan.next.capacity, speedPct: cartPlan.next.speedPct, costGold: cartPlan.next.costGold }
          : null,
        ...upgradeView(cartPlan, dm.haul ? "矿车在井下" : null),
        steps: MINE_CARTS.map((c) => ({ level: c.level, name: c.name, capacity: c.capacity, reached: dm.cartLevel >= c.level })),
      },
      layers,
      haul:
        dm.haul && haulYield
          ? {
              layerName: getMineLayerDef(dm.haul.layer).name,
              dayKey: dm.haul.dayKey,
              startedAtMs: Date.parse(dm.haul.startedAt),
              returnsAtMs: Date.parse(dm.haul.returnsAt),
              ...haulYield,
              oreName: itemName(haulYield.oreId),
              byproductName: itemName(haulYield.byproductId),
            }
          : null,
      haulsPerLayer: MINE_HAULS_PER_LAYER_PER_DAY,
      haulsToday: Object.values(dm.haulsToday).reduce((s, n) => s + n, 0),
      grades: MINE_GRADES.map((g) => ({ ...g })),
      totals: { hauls: dm.totalHauls, ore: dm.totalOre, byproduct: dm.totalByproduct, bonanza: dm.bonanzaHauls },
      lastHaul: dm.lastHaul
        ? {
            ...dm.lastHaul,
            layerName: getMineLayerDef(dm.lastHaul.layer).name,
            gradeName: getMineGradeDef(dm.lastHaul.grade).name,
            oreName: itemName(dm.lastHaul.oreId),
            byproductName: itemName(dm.lastHaul.byproductId),
          }
        : null,
    },
    elf: {
      dayKey: ew.dayKey,
      dayEndsAtMs: (elfToday + 1) * 86_400_000 - MINE_TZ_OFFSET_MINUTES * 60_000,
      gold,
      boardTier: ew.boardTier,
      boardTierName: ELF_FAVOR_TIERS[ew.boardTier].name,
      favor: {
        total: favorTier.favor,
        tier: favorTier.current.tier,
        name: favorTier.current.name,
        stats: favorTier.current.stats,
        next: favorTier.next ? { tier: favorTier.next.tier, name: favorTier.next.name, minFavor: favorTier.next.minFavor, stats: favorTier.next.stats } : null,
        progressPct: favorTier.progressPct,
        tiers: ELF_FAVOR_TIERS.map((t) => ({ ...t, reached: favorTier.favor >= t.minFavor })),
      },
      commissions,
      completedCount: ew.completed.length,
      boardSize: ELF_BOARD_SLOTS.length,
      fullBoardBonus: ELF_FULL_BOARD_BONUS,
      sources: ELF_EXPEDITION_SOURCES.map((s) => ({ ...s, current: counters[s.id], base: ew.expeditionBase[s.id] })),
      caps: ELF_BONUS_CAPS,
      totals: { commissions: ew.totalCommissions, fullBoards: ew.fullBoards, gold: ew.totalGold },
      lastCommission:
        ew.lastCommission && lastDef
          ? { ...ew.lastCommission, client: lastDef.client, name: "itemId" in lastDef ? `「${itemName(lastDef.itemId)}」×${lastDef.qty}` : `远征委托 ×${lastDef.target}` }
          : null,
    },
  };
}
