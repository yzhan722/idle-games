// 进阶进度 · 深海遗迹潜航 & 冒险者行会公会战 (WL-18)
// 从 progression2.ts 原样拆出；对外一律从 "../progression2" 引用。

import type {
  EnhancedContentPack,
  EnhancedPlayerState,
  AbyssCurrentId,
  GuildRivalId,
  AbyssDiveRecord,
  AbyssDiveState,
  GuildWarDuelRecord,
  GuildWarState,
} from "../types";
import { ensurePlayerExtensions, appendLog } from "../storage";
import { syncAchievements } from "../progression";
import { addReputation } from "./reputation";
import { simulateSandboxDuel, type ArenaDuelResult } from "./arena_town";
import { tavernItemName } from "./bard_tavern";
import { PALADIN_FOES, type PaladinFoeDef } from "./airship_paladin";

/* ============================ 深海遗迹潜航 & 冒险者行会公会战 (WL-18) ============================ */
// 前端 frontend/src/gameplay/abyssGuild.ts 逐表逐式 1:1 镜像（scripts/abyss-guild-parity.test.ts 守护，
// 「WL-18 core」区段两端逐字一致）。
// - 深海遗迹潜航（转生永久保留装备与累计记录）：五层遗迹，每层两种内容包真实材料（被既有配方消耗）。东八区日序号哈希
//   确定每层当天的打捞品与海流（平静 / 暗涌 / 沉船潮），海流决定氧气消耗与打捞倍率；每日氧气预算由潜水装备决定，
//   每层每日最多 2 次。打捞品直接入背包接入既有材料。潜水装备 1~5 级（金币 + 真实生活职业成品）提高氧气、打捞倍率与可达深度，
//   厨师（钓鱼）等级决定当世能否下潜到该层（转生后需重新练级）。换日只在显式传入 now 时发生。
// - 冒险者行会公会战（转生永久保留勋章与位阶）：东八区周一 0 点翻周，四个对手行会按周轮换；五个席位的对手成员取自
//   圣骑士团试炼表里真实怪物的战斗属性 × 对手行会倍率，以竞技场沙盒 simulateSandboxDuel 结算（每周 8 次挑战，按顺序）。
//   首次击败某席领取行会勋章（五席全胜额外 +10），累计勋章决定行会位阶与逐项封顶的永久加成（金币 4% / 经验 4%），
//   接入 getActionRates。
/* ---- 以下为与后端逐字对称的表与纯函数（WL-18 core） ---- */

export const ABYSS_CURRENT_IDS: readonly AbyssCurrentId[] = ["calm", "surge", "wreck"];

export const GUILD_RIVAL_IDS: readonly GuildRivalId[] = ["iron_fang", "silver_tide", "stone_wall", "crimson_owl"];

/** 深海遗迹按东八区日期（每日 0 点）换日：遗迹海流、打捞品与氧气预算随之刷新。 */
export const ABYSS_TZ_OFFSET_MINUTES = 480;
/** 每层遗迹每个东八区日最多下潜的次数。 */
export const ABYSS_DIVES_PER_LAYER_PER_DAY = 2;
/** 计数器上限（防脏档溢出）。 */
export const ABYSS_COUNTER_CAP = 1_000_000_000;
/** 公会战周起点：1970-01-05（周一）东八区 0 点 = 第 0 周。 */
export const GUILD_WAR_WEEK_EPOCH_MS = 4 * 86_400_000;
export const GUILD_WAR_WEEK_MS = 7 * 86_400_000;
/** 每个东八区周可发起的公会战挑战次数（胜负都计）。 */
export const GUILD_WAR_WEEKLY_ATTEMPTS = 8;
/** 本周击败对手会长（五席全胜）额外的行会勋章。 */
export const GUILD_WAR_SWEEP_BONUS = 10;
/** 行会勋章累计上限（只增不减）。 */
export const GUILD_MEDAL_CAP = 99_999;

export interface AbyssCurrentDef {
  id: AbyssCurrentId;
  name: string;
  /** 抽中权重（三档合计 100）。 */
  weight: number;
  /** 氧气消耗倍率（百分比，整数运算两端一致）。 */
  oxygenPct: number;
  /** 打捞量倍率（百分比）。 */
  salvagePct: number;
}

export const ABYSS_CURRENTS: readonly AbyssCurrentDef[] = [
  { id: "calm", name: "平静海流", weight: 50, oxygenPct: 100, salvagePct: 100 },
  { id: "surge", name: "暗涌", weight: 32, oxygenPct: 125, salvagePct: 130 },
  { id: "wreck", name: "沉船潮", weight: 18, oxygenPct: 90, salvagePct: 160 },
];

export interface AbyssRuinDef {
  layer: number;
  name: string;
  /** 遗迹所在深度（米，仅展示）。 */
  meters: number;
  /** 本层可能打捞到的既有材料：内容包真实物品（被既有配方消耗）。 */
  salvage: readonly string[];
  /** 每次下潜的打捞基数（件，再乘海流与装备倍率）。 */
  baseQty: number;
  /** 每次下潜的氧气基数（再乘海流倍率）。 */
  baseOxygen: number;
  /** 下到本层所需的厨师（钓鱼）等级。 */
  minChefLevel: number;
  description: string;
}

export const ABYSS_RUINS: readonly AbyssRuinDef[] = [
  {
    layer: 1,
    name: "珊瑚浅礁遗迹",
    meters: 40,
    salvage: ["crystal_2", "fish_sea"],
    baseQty: 10,
    baseOxygen: 40,
    minChefLevel: 1,
    description: "珊瑚缠绕着倒塌的石柱，礁缝里卡着辉光水晶，海鱼成群穿过拱门。",
  },
  {
    layer: 2,
    name: "沉船回廊",
    meters: 120,
    salvage: ["crystal_3", "frost_shard"],
    baseQty: 8,
    baseOxygen: 55,
    minChefLevel: 20,
    description: "几艘远洋商船沉在同一条海沟里，货舱里还封着耀光水晶与霜寒碎晶。",
  },
  {
    layer: 3,
    name: "潮汐神殿",
    meters: 260,
    salvage: ["fish_deepsea", "void_shard"],
    baseQty: 6,
    baseOxygen: 70,
    minChefLevel: 36,
    description: "神殿随潮汐开合，深海鱼在祭坛间游弋，墙缝里嵌着虚空裂片。",
  },
  {
    layer: 4,
    name: "渊光祭坛",
    meters: 480,
    salvage: ["crystal_6", "abyss_core"],
    baseQty: 5,
    baseOxygen: 85,
    minChefLevel: 48,
    description: "无光的海底只有祭坛自己在发亮，神光水晶旁沉睡着深渊之核。",
  },
  {
    layer: 5,
    name: "海皇王座",
    meters: 800,
    salvage: ["fish_abyss", "rift_crystal"],
    baseQty: 4,
    baseOxygen: 100,
    minChefLevel: 60,
    description: "传说中海皇的王座，渊海巨鱼守着王冠上崩落的裂境结晶。",
  },
];

export interface AbyssGearDef {
  level: number;
  name: string;
  /** 每个东八区日的氧气预算。 */
  oxygen: number;
  /** 打捞量倍率（百分比）。 */
  salvagePct: number;
  /** 能下到的最深遗迹层。 */
  maxLayer: number;
  /** 升到该级的金币花费（1 级为初始装备）。 */
  costGold: number;
  /** 升到该级消耗的真实生活职业成品。 */
  materials: Record<string, number>;
}

export const ABYSS_GEARS: readonly AbyssGearDef[] = [
  { level: 1, name: "粗麻潜水服", oxygen: 100, salvagePct: 100, maxLayer: 1, costGold: 0, materials: {} },
  { level: 2, name: "鞣皮潜水服", oxygen: 140, salvagePct: 115, maxLayer: 2, costGold: 2000, materials: { leather_hide: 8, ingot_2: 12 } },
  { level: 3, name: "黄金头盔潜装", oxygen: 185, salvagePct: 130, maxLayer: 3, costGold: 7000, materials: { dyed_cloth: 10, ingot_4: 12 } },
  { level: 4, name: "秘银呼吸潜装", oxygen: 235, salvagePct: 150, maxLayer: 4, costGold: 22000, materials: { dyed_cloth: 16, ingot_6: 14 } },
  { level: 5, name: "海皇鳞甲潜装", oxygen: 290, salvagePct: 175, maxLayer: 5, costGold: 65000, materials: { leather_hide: 24, ingot_8: 15 } },
];

export interface GuildRivalDef {
  id: GuildRivalId;
  name: string;
  motto: string;
  /** 对手阵容的属性倍率（百分比）。 */
  hpPct: number;
  atkPct: number;
  defPct: number;
  intervalPct: number;
}

export const GUILD_RIVALS: readonly GuildRivalDef[] = [
  { id: "iron_fang", name: "铁牙佣兵团", motto: "只认金币与胜利的老牌佣兵，出手又快又狠", hpPct: 100, atkPct: 112, defPct: 95, intervalPct: 100 },
  { id: "silver_tide", name: "银潮剑会", motto: "剑术流派结成的联盟，攻速奇快", hpPct: 92, atkPct: 104, defPct: 100, intervalPct: 88 },
  { id: "stone_wall", name: "石壁守望会", motto: "城墙守卫出身，皮糙肉厚", hpPct: 125, atkPct: 92, defPct: 118, intervalPct: 108 },
  { id: "crimson_owl", name: "赤枭秘社", motto: "夜行魔导士的秘密结社，攻守均衡", hpPct: 106, atkPct: 106, defPct: 92, intervalPct: 96 },
];

export interface GuildSeatDef {
  seat: number;
  name: string;
  /** 本席可能出阵的魔物（引用圣骑士团试炼表里的真实怪物战斗属性）。 */
  pool: readonly string[];
  /** 席位额外生命倍率（百分比）。 */
  hpPct: number;
  /** 本周首次击败本席的行会勋章。 */
  medals: number;
  boss: boolean;
}

export const GUILD_SEATS: readonly GuildSeatDef[] = [
  { seat: 1, name: "先锋", pool: ["ore_rat", "magma_worm", "iron_spider", "swamp_zombie", "mud_elemental"], hpPct: 100, medals: 3, boss: false },
  { seat: 2, name: "突击手", pool: ["ice_golem", "snow_harpy", "frozen_knight", "yeti"], hpPct: 100, medals: 5, boss: false },
  { seat: 3, name: "中坚", pool: ["flame_wraith", "inferno_drake", "void_specter", "dread_knight"], hpPct: 105, medals: 8, boss: false },
  { seat: 4, name: "副会长", pool: ["sky_guardian", "seraph_sentinel", "divine_colossus", "archon"], hpPct: 110, medals: 12, boss: false },
  { seat: 5, name: "会长", pool: ["soul_reaper", "lava_titan", "infernal_dragon", "hell_sovereign"], hpPct: 120, medals: 18, boss: true },
];

export interface GuildStats {
  goldGainPct?: number;
  xpGainPct?: number;
}

export const GUILD_STAT_KEYS: readonly (keyof GuildStats)[] = ["goldGainPct", "xpGainPct"];

/** 行会位阶永久加成封顶（最高位阶恰好到顶；脏档再高也不会超过）。 */
export const GUILD_BONUS_CAPS: Required<GuildStats> = { goldGainPct: 4, xpGainPct: 4 };

export interface GuildRankDef {
  rank: number;
  /** 累计行会勋章达到该值即晋升。 */
  minMedals: number;
  name: string;
  stats: GuildStats;
}

export const GUILD_RANKS: readonly GuildRankDef[] = [
  { rank: 0, minMedals: 0, name: "见习团员", stats: {} },
  { rank: 1, minMedals: 15, name: "铜徽团员", stats: { goldGainPct: 1 } },
  { rank: 2, minMedals: 50, name: "银徽骑手", stats: { goldGainPct: 1, xpGainPct: 1 } },
  { rank: 3, minMedals: 110, name: "金徽队长", stats: { goldGainPct: 2, xpGainPct: 2 } },
  { rank: 4, minMedals: 200, name: "秘银旗手", stats: { goldGainPct: 3, xpGainPct: 3 } },
  { rank: 5, minMedals: 340, name: "行会传奇", stats: { goldGainPct: 4, xpGainPct: 4 } },
];

export function isValidAbyssCurrentId(id: unknown): id is AbyssCurrentId {
  return typeof id === "string" && (ABYSS_CURRENT_IDS as readonly string[]).includes(id);
}

export function isValidGuildRivalId(id: unknown): id is GuildRivalId {
  return typeof id === "string" && (GUILD_RIVAL_IDS as readonly string[]).includes(id);
}

/** 合法遗迹层：1 ~ 5 的整数。 */
export function isValidAbyssLayer(layer: unknown): layer is number {
  return typeof layer === "number" && Number.isInteger(layer) && layer >= 1 && layer <= ABYSS_RUINS.length;
}

/** 合法公会战席位：1 ~ 5 的整数。 */
export function isValidGuildSeat(seat: unknown): seat is number {
  return typeof seat === "number" && Number.isInteger(seat) && seat >= 1 && seat <= GUILD_SEATS.length;
}

export function abyssCleanCount(v: unknown, cap: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.min(cap, Math.floor(n)) : 0;
}

export function abyssObj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

/** 东八区日序号（1970-01-01 东八区 = 0）。 */
export function abyssDayIndex(now: Date | number): number {
  const ms = typeof now === "number" ? now : now.getTime();
  return Math.floor((ms + ABYSS_TZ_OFFSET_MINUTES * 60_000) / 86_400_000);
}

/** 日序号 → 东八区日期键 YYYY-MM-DD。 */
export function abyssDayKeyFromIndex(index: number): string {
  return new Date(Math.floor(index) * 86_400_000).toISOString().slice(0, 10);
}

export function abyssDayKey(now: Date | number): string {
  return abyssDayKeyFromIndex(abyssDayIndex(now));
}

/** 日期键 → 日序号；非法键返回 null。 */
export function abyssDayIndexFromKey(key: unknown): number | null {
  if (typeof key !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const ms = Date.parse(`${key}T00:00:00.000Z`);
  if (!Number.isFinite(ms)) return null;
  const index = Math.floor(ms / 86_400_000);
  return abyssDayKeyFromIndex(index) === key ? index : null;
}

/** 当前东八区日结束（次日 0 点）的 UTC 毫秒时间戳。 */
export function abyssDayEndsAtMs(now: Date | number): number {
  return (abyssDayIndex(now) + 1) * 86_400_000 - ABYSS_TZ_OFFSET_MINUTES * 60_000;
}

/** 东八区周序号（1970-01-05 周一 0 点 = 第 0 周）。 */
export function guildWarWeekIndex(now: Date | number): number {
  const ms = typeof now === "number" ? now : now.getTime();
  return Math.floor((ms + ABYSS_TZ_OFFSET_MINUTES * 60_000 - GUILD_WAR_WEEK_EPOCH_MS) / GUILD_WAR_WEEK_MS);
}

/** 周序号 → 周键（该周周一的东八区日期 YYYY-MM-DD）。 */
export function guildWarWeekKeyFromIndex(index: number): string {
  return new Date(GUILD_WAR_WEEK_EPOCH_MS + Math.floor(index) * GUILD_WAR_WEEK_MS).toISOString().slice(0, 10);
}

export function guildWarWeekKey(now: Date | number): string {
  return guildWarWeekKeyFromIndex(guildWarWeekIndex(now));
}

/** 周键 → 周序号；非法键或不是周一返回 null。 */
export function guildWarWeekIndexFromKey(key: unknown): number | null {
  if (typeof key !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const ms = Date.parse(`${key}T00:00:00.000Z`);
  if (!Number.isFinite(ms)) return null;
  const diff = ms - GUILD_WAR_WEEK_EPOCH_MS;
  if (diff % GUILD_WAR_WEEK_MS !== 0) return null;
  const index = diff / GUILD_WAR_WEEK_MS;
  return guildWarWeekKeyFromIndex(index) === key ? index : null;
}

/** 本周结束（下周一东八区 0 点）的 UTC 毫秒时间戳。 */
export function guildWarWeekEndsAtMs(now: Date | number): number {
  return GUILD_WAR_WEEK_EPOCH_MS + (guildWarWeekIndex(now) + 1) * GUILD_WAR_WEEK_MS - ABYSS_TZ_OFFSET_MINUTES * 60_000;
}

/** 32 位整数混合哈希（遗迹与对手阵容的唯一随机源，纯确定性）。 */
export function abyssHash(a: number, b: number): number {
  let h = (Math.imul((a | 0) ^ 0x3c6ef372, 0x9e3779b1) + Math.imul((b | 0) + 0x1f83d9ab, 0x85ebca77)) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

/** 遗迹层定义（脏数据按 1 层；超出按最深层）。 */
export function getAbyssRuinDef(layer: unknown): AbyssRuinDef {
  const n = Math.min(ABYSS_RUINS.length, Math.max(1, abyssCleanCount(layer, ABYSS_RUINS.length)));
  return ABYSS_RUINS[n - 1];
}

/** 潜水装备等级（脏数据按 1 级；超出按满级）。 */
export function getAbyssGear(level: unknown): AbyssGearDef {
  const n = Math.min(ABYSS_GEARS.length, Math.max(1, abyssCleanCount(level, ABYSS_GEARS.length)));
  return ABYSS_GEARS[n - 1];
}

export function getAbyssCurrentDef(id: AbyssCurrentId): AbyssCurrentDef {
  return ABYSS_CURRENTS.find((c) => c.id === id) || ABYSS_CURRENTS[0];
}

/** 某个东八区日某层遗迹：打捞品、海流与氧气消耗都由日序号与层号哈希确定（同一天全服一致）。 */
export function getAbyssRuin(dayIndex: number, layer: unknown) {
  const d = Number.isFinite(dayIndex) ? Math.floor(dayIndex) : 0;
  const def = getAbyssRuinDef(layer);
  const itemId = def.salvage[abyssHash(d, 0x0a10 + def.layer) % def.salvage.length];
  const roll = abyssHash(d, 0x0a20 + def.layer) % 100;
  let acc = 0;
  let current = ABYSS_CURRENTS[ABYSS_CURRENTS.length - 1];
  for (const c of ABYSS_CURRENTS) {
    acc += c.weight;
    if (roll < acc) {
      current = c;
      break;
    }
  }
  return {
    layer: def.layer,
    itemId,
    current: current.id,
    currentName: current.name,
    salvagePct: current.salvagePct,
    oxygenCost: Math.max(1, Math.round((def.baseOxygen * current.oxygenPct) / 100)),
  };
}

/** 某个东八区日的整张遗迹图（五层）。 */
export function getAbyssRuinMap(dayIndex: number) {
  return ABYSS_RUINS.map((r) => getAbyssRuin(dayIndex, r.layer));
}

/** 一次下潜的打捞：打捞基数 × 海流倍率 × 装备倍率（至少 1 件）。 */
export function getAbyssSalvage(dayIndex: number, layer: unknown, gearLevel: unknown) {
  const ruin = getAbyssRuin(dayIndex, layer);
  const def = getAbyssRuinDef(layer);
  const gear = getAbyssGear(gearLevel);
  return {
    layer: ruin.layer,
    itemId: ruin.itemId,
    current: ruin.current,
    currentName: ruin.currentName,
    oxygenCost: ruin.oxygenCost,
    qty: Math.max(1, Math.floor((def.baseQty * ruin.salvagePct * gear.salvagePct) / 10_000)),
  };
}

/** 今日各层已下潜次数净化：只认 1 ~ 5 层，每层不超过当日上限。 */
export function cleanAbyssDivesToday(raw: unknown): Record<string, number> {
  const src = abyssObj(raw);
  const out: Record<string, number> = {};
  for (const r of ABYSS_RUINS) {
    const n = abyssCleanCount(src[String(r.layer)], ABYSS_DIVES_PER_LAYER_PER_DAY);
    if (n > 0) out[String(r.layer)] = n;
  }
  return out;
}

/** 下潜计划：潜水装备深度、厨师（钓鱼）等级、当日次数与剩余氧气，共同决定能否下潜某层。 */
export function planAbyssDive(dayIndex: number, layer: unknown, gearLevel: unknown, chefLevel: unknown, divesToday: unknown, oxygenUsed: unknown) {
  const valid = isValidAbyssLayer(layer);
  const def = getAbyssRuinDef(layer);
  const gear = getAbyssGear(gearLevel);
  const gearOk = valid && gear.maxLayer >= def.layer;
  const level = abyssCleanCount(chefLevel, ABYSS_COUNTER_CAP);
  const levelOk = valid && level >= def.minChefLevel;
  const used = valid ? cleanAbyssDivesToday(divesToday)[String(def.layer)] || 0 : 0;
  const divesLeft = valid ? ABYSS_DIVES_PER_LAYER_PER_DAY - used : 0;
  const oxygenLeft = gear.oxygen - abyssCleanCount(oxygenUsed, gear.oxygen);
  const salvage = valid ? getAbyssSalvage(dayIndex, def.layer, gear.level) : null;
  const oxygenCost = salvage ? salvage.oxygenCost : 0;
  const oxygenOk = valid && oxygenLeft >= oxygenCost;
  return {
    ok: valid && gearOk && levelOk && divesLeft > 0 && oxygenOk,
    layer: valid ? def.layer : null,
    gearOk,
    levelOk,
    chefLevel: level,
    divesLeft,
    oxygenBudget: gear.oxygen,
    oxygenLeft,
    oxygenCost,
    oxygenOk,
    salvage,
  };
}

/** 潜水装备升级计划：下一级的金币与真实材料是否齐备（满级返回 maxed）。 */
export function planAbyssGearUpgrade(gearLevel: unknown, gold: unknown, inventory: unknown) {
  const current = getAbyssGear(gearLevel);
  const next = ABYSS_GEARS.find((g) => g.level === current.level + 1) ?? null;
  const inv = abyssObj(inventory);
  const g = abyssCleanCount(gold, Number.MAX_SAFE_INTEGER);
  const materials = next
    ? Object.entries(next.materials).map(([itemId, need]) => ({ itemId, need, have: abyssCleanCount(inv[itemId], ABYSS_COUNTER_CAP) }))
    : [];
  const goldOk = next !== null && g >= next.costGold;
  const materialsOk = materials.every((m) => m.have >= m.need);
  return { ok: next !== null && goldOk && materialsOk, maxed: next === null, current, next, goldOk, materialsOk, materials };
}

/** 本周对手行会：四个行会按周序号依次轮换。 */
export function getGuildRival(weekIndex: number): GuildRivalDef {
  const w = Number.isFinite(weekIndex) ? Math.floor(weekIndex) : 0;
  const n = GUILD_RIVALS.length;
  return GUILD_RIVALS[((w % n) + n) % n];
}

export function getGuildFoeDef(monsterId: string): PaladinFoeDef {
  return PALADIN_FOES.find((f) => f.monsterId === monsterId) || PALADIN_FOES[0];
}

export interface GuildWarOpponent {
  id: string;
  seat: number;
  seatName: string;
  monsterId: string;
  /** 完整称呼：「对手行会 + 席位 · 魔物」（战报与日志用）。 */
  name: string;
  /** 魔物本名（卡片已显示席位与对手行会时只写它）。 */
  foeName: string;
  rivalId: GuildRivalId;
  level: number;
  hp: number;
  atk: number;
  def: number;
  attackIntervalMs: number;
  isBoss: boolean;
  medals: number;
}

/** 由周序号 + 席位确定性生成对手成员（同一周全服一致）：真实怪物属性 × 本周对手行会倍率 × 席位生命倍率。 */
export function generateGuildWarOpponent(weekIndex: number, seat: number): GuildWarOpponent {
  const s = Math.min(GUILD_SEATS.length, Math.max(1, Math.floor(Number(seat)) || 1));
  const w = Number.isFinite(weekIndex) ? Math.floor(weekIndex) : 0;
  const def = GUILD_SEATS[s - 1];
  const rival = getGuildRival(w);
  const foe = getGuildFoeDef(def.pool[abyssHash(w, 0x6e10 + s) % def.pool.length]);
  return {
    id: `guild_war_s${s}`,
    seat: s,
    seatName: def.name,
    monsterId: foe.monsterId,
    name: `${rival.name}${def.name} · ${foe.name}`,
    foeName: foe.name,
    rivalId: rival.id,
    level: foe.level,
    hp: Math.max(1, Math.round((foe.hp * def.hpPct * rival.hpPct) / 10_000)),
    atk: Math.max(1, Math.round((foe.atk * rival.atkPct) / 100)),
    def: Math.max(0, Math.round((foe.def * rival.defPct) / 100)),
    attackIntervalMs: Math.max(800, Math.round((foe.attackIntervalMs * rival.intervalPct) / 100)),
    isBoss: def.boss,
    medals: def.medals,
  };
}

/** 本周五席的对手阵容。 */
export function getGuildWarLineup(weekIndex: number): GuildWarOpponent[] {
  return GUILD_SEATS.map((s) => generateGuildWarOpponent(weekIndex, s.seat));
}

/** 对手成员 → 战斗引擎的怪物记录（与竞技场 / 荣誉试炼同口径；不掉落、不给经验金币）。 */
export function guildWarOpponentMonster(o: GuildWarOpponent) {
  return {
    id: o.id,
    name: o.name,
    level: o.level,
    hp: o.hp,
    atk: o.atk,
    def: o.def,
    attackIntervalMs: o.attackIntervalMs,
    isBoss: o.isBoss,
    mechanics: [] as string[],
    gold: 0,
    xp: 0,
  };
}

/** 本周已击败的席位：只认从第 1 席起连续的前缀（席位必须按顺序挑战）。 */
export function cleanGuildWarCleared(raw: unknown): number[] {
  const list = Array.isArray(raw) ? (raw as unknown[]) : [];
  const out: number[] = [];
  for (const s of GUILD_SEATS) {
    if (!list.includes(s.seat)) break;
    out.push(s.seat);
  }
  return out;
}

/** 本周首次击败某席的行会勋章（第 5 席同时达成五席全胜，额外 +10）。 */
export function getGuildWarSeatReward(seat: number) {
  const s = Math.min(GUILD_SEATS.length, Math.max(1, Math.floor(Number(seat)) || 1));
  const sweep = s === GUILD_SEATS.length;
  const base = GUILD_SEATS[s - 1].medals;
  return { seat: s, medals: base + (sweep ? GUILD_WAR_SWEEP_BONUS : 0), base, sweep };
}

/** 行会位阶：累计行会勋章决定位阶（含下一位阶进度）。 */
export function getGuildRank(totalMedals: unknown) {
  const n = abyssCleanCount(totalMedals, GUILD_MEDAL_CAP);
  let current = GUILD_RANKS[0];
  let next: GuildRankDef | null = null;
  for (let i = 0; i < GUILD_RANKS.length; i++) {
    if (n >= GUILD_RANKS[i].minMedals) {
      current = GUILD_RANKS[i];
      next = GUILD_RANKS[i + 1] ?? null;
    }
  }
  const progressPct = next
    ? Math.min(100, Math.max(0, Math.round(((n - current.minMedals) / Math.max(1, next.minMedals - current.minMedals)) * 100)))
    : 100;
  return { totalMedals: n, current, next, progressPct };
}

/** 挑战计划：席位按顺序、本周未击败、本周还有挑战次数。 */
export function planGuildWarChallenge(weekIndex: number, seat: unknown, cleared: unknown, attemptsUsed: unknown) {
  const valid = isValidGuildSeat(seat);
  const done = cleanGuildWarCleared(cleared);
  const target = done.length + 1;
  const already = valid && done.includes(seat);
  const inOrder = valid && seat === target;
  const used = abyssCleanCount(attemptsUsed, GUILD_WAR_WEEKLY_ATTEMPTS);
  const attemptsLeft = GUILD_WAR_WEEKLY_ATTEMPTS - used;
  return {
    ok: valid && !already && inOrder && attemptsLeft > 0,
    seat: valid ? seat : null,
    target: target > GUILD_SEATS.length ? null : target,
    already,
    inOrder,
    attemptsLeft,
    opponent: valid ? generateGuildWarOpponent(weekIndex, seat) : null,
    reward: valid ? getGuildWarSeatReward(seat) : null,
  };
}

export type MinimalGuildWarHolder = {
  guildWar?: {
    totalMedals?: unknown;
  } | null;
} | null;

export interface GuildWarBonuses {
  totalMedals: number;
  rank: number;
  rankName: string;
  goldGainPct: number;
  xpGainPct: number;
}

/** 行会位阶的永久加成：按位阶取值，逐项封顶（金币 4% / 经验 4%）。 */
export function getGuildWarBonuses(holder?: MinimalGuildWarHolder): GuildWarBonuses {
  const gw = abyssObj(holder?.guildWar);
  const rank = getGuildRank(gw.totalMedals);
  const out: Required<GuildStats> = { goldGainPct: 0, xpGainPct: 0 };
  for (const k of GUILD_STAT_KEYS) out[k] = Math.min(GUILD_BONUS_CAPS[k], Math.max(0, rank.current.stats[k] || 0));
  return { totalMedals: rank.totalMedals, rank: rank.current.rank, rankName: rank.current.name, ...out };
}

/* ---- 以上为 WL-18 core ---- */

const ABYSS_EPOCH_ISO = new Date(0).toISOString();

function abyssIsoOr(v: unknown, fallback: string): string {
  const ms = typeof v === "string" ? Date.parse(v) : Number.NaN;
  return Number.isFinite(ms) ? new Date(ms).toISOString() : fallback;
}

const abyssGold = (player: EnhancedPlayerState) => Math.floor(Number(player.inventory.gold || 0));

/** 厨师（钓鱼）等级（skill_chef，转生会重置）：决定能下潜到哪些遗迹层。 */
const abyssChefLevel = (player: EnhancedPlayerState) => Math.max(1, Math.floor(Number((player.skills as any)?.skill_chef?.level || 1)));

/** 物品名（内容包真实名称；无内容包时回落到物品 id）。 */
function abyssItemName(contentPack: EnhancedContentPack | undefined, itemId: string): string {
  return tavernItemName(contentPack, itemId);
}

function sanitizeAbyssDiveRecord(raw: unknown): AbyssDiveRecord | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (!isValidAbyssLayer(r.layer) || !isValidAbyssCurrentId(r.current)) return null;
  const def = getAbyssRuinDef(r.layer);
  if (typeof r.itemId !== "string" || !def.salvage.includes(r.itemId)) return null;
  return {
    layer: def.layer,
    itemId: r.itemId,
    qty: abyssCleanCount(r.qty, ABYSS_COUNTER_CAP),
    current: r.current,
    oxygen: abyssCleanCount(r.oxygen, ABYSS_COUNTER_CAP),
    at: abyssIsoOr(r.at, ABYSS_EPOCH_ISO),
  };
}

/**
 * 确保 abyssDive 存在并净化脏档（旧存档首次打开面板时领到粗麻潜水服，不赠送任何打捞品）。
 * 仅显式传入 now（指令 / 视图时钟）时才会换日（新的遗迹图、补满氧气与各层次数）；无参调用
 * （ensurePlayerExtensions / 转生净化）只做净化，绝不按墙钟推进（无效日期键回落到纪元日，下一次显式 now 再前推）。
 */
export function ensureAbyssDive(player: EnhancedPlayerState, now?: Date): AbyssDiveState {
  if (!Array.isArray((player as any).logs)) {
    (player as any).logs = [];
  }
  if (!player.inventory || typeof player.inventory !== "object") {
    player.inventory = { gold: 0 };
  }
  const fallbackDayKey = now !== undefined ? abyssDayKey(now) : abyssDayKeyFromIndex(0);
  if (!player.abyssDive || typeof player.abyssDive !== "object" || Array.isArray(player.abyssDive)) {
    player.abyssDive = {
      dayKey: fallbackDayKey,
      gearLevel: 1,
      oxygenUsed: 0,
      divesToday: {},
      totalDives: 0,
      totalSalvage: 0,
      deepestLayer: 0,
      lastDive: null,
    };
  }
  const ad = player.abyssDive;
  if (abyssDayIndexFromKey(ad.dayKey) === null) ad.dayKey = fallbackDayKey;
  ad.gearLevel = getAbyssGear(ad.gearLevel).level;
  ad.oxygenUsed = abyssCleanCount(ad.oxygenUsed, getAbyssGear(ad.gearLevel).oxygen);
  ad.divesToday = cleanAbyssDivesToday(ad.divesToday);
  ad.totalDives = abyssCleanCount(ad.totalDives, ABYSS_COUNTER_CAP);
  ad.totalSalvage = abyssCleanCount(ad.totalSalvage, ABYSS_COUNTER_CAP);
  ad.deepestLayer = abyssCleanCount(ad.deepestLayer, ABYSS_RUINS.length);
  ad.lastDive = sanitizeAbyssDiveRecord(ad.lastDive);
  if (now !== undefined) {
    const cur = abyssDayIndex(now);
    const stored = abyssDayIndexFromKey(ad.dayKey)!;
    // 只向前换日（时钟回拨不回滚）：换上新一天的遗迹图，补满氧气与各层次数
    if (cur > stored) {
      ad.dayKey = abyssDayKeyFromIndex(cur);
      ad.oxygenUsed = 0;
      ad.divesToday = {};
    }
  }
  return ad;
}

function sanitizeGuildWarDuel(raw: unknown): GuildWarDuelRecord | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (guildWarWeekIndexFromKey(r.weekKey) === null || !isValidGuildSeat(r.seat) || !isValidGuildRivalId(r.rivalId)) return null;
  return {
    weekKey: r.weekKey as string,
    seat: r.seat,
    rivalId: r.rivalId,
    opponentName: typeof r.opponentName === "string" ? r.opponentName.slice(0, 60) : "",
    won: r.won === true,
    timeout: r.timeout === true,
    medals: abyssCleanCount(r.medals, GUILD_MEDAL_CAP),
    at: abyssIsoOr(r.at, ABYSS_EPOCH_ISO),
  };
}

/**
 * 确保 guildWar 存在并净化脏档（旧存档首次打开面板时登记入会：0 勋章，不赠送任何加成）。
 * 仅显式传入 now 时才会翻周（换对手行会、补满挑战次数、清空本周战绩）；无参调用只做净化。
 */
export function ensureGuildWar(player: EnhancedPlayerState, now?: Date): GuildWarState {
  if (!Array.isArray((player as any).logs)) {
    (player as any).logs = [];
  }
  const fallbackWeekKey = now !== undefined ? guildWarWeekKey(now) : guildWarWeekKeyFromIndex(0);
  if (!player.guildWar || typeof player.guildWar !== "object" || Array.isArray(player.guildWar)) {
    player.guildWar = {
      weekKey: fallbackWeekKey,
      attemptsUsed: 0,
      cleared: [],
      totalMedals: 0,
      totalWins: 0,
      totalDuels: 0,
      sweeps: 0,
      lastDuel: null,
    };
  }
  const gw = player.guildWar;
  if (guildWarWeekIndexFromKey(gw.weekKey) === null) gw.weekKey = fallbackWeekKey;
  gw.attemptsUsed = abyssCleanCount(gw.attemptsUsed, GUILD_WAR_WEEKLY_ATTEMPTS);
  gw.cleared = cleanGuildWarCleared(gw.cleared);
  gw.totalMedals = abyssCleanCount(gw.totalMedals, GUILD_MEDAL_CAP);
  gw.totalDuels = abyssCleanCount(gw.totalDuels, ABYSS_COUNTER_CAP);
  gw.totalWins = Math.min(gw.totalDuels, abyssCleanCount(gw.totalWins, ABYSS_COUNTER_CAP));
  gw.sweeps = Math.min(gw.totalWins, abyssCleanCount(gw.sweeps, ABYSS_COUNTER_CAP));
  gw.lastDuel = sanitizeGuildWarDuel(gw.lastDuel);
  if (now !== undefined) {
    const cur = guildWarWeekIndex(now);
    const stored = guildWarWeekIndexFromKey(gw.weekKey)!;
    // 只向前翻周（时钟回拨不回滚）：换上本周的对手行会，补满挑战次数
    if (cur > stored) {
      gw.weekKey = guildWarWeekKeyFromIndex(cur);
      gw.attemptsUsed = 0;
      gw.cleared = [];
    }
  }
  return gw;
}

/** 视图统一推进潜航（换日）与公会战（翻周）时钟，保证落库状态与响应视图一致。 */
function ensureAbyssGuildClocks(player: EnhancedPlayerState, now: Date) {
  return { ad: ensureAbyssDive(player, now), gw: ensureGuildWar(player, now) };
}

/** 下潜遗迹：按今日遗迹图消耗氧气，打捞品直接入背包（每层每日 2 次；只在显式 now 换日）。 */
export function diveAbyssRuin(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack | undefined,
  layer: number,
  now: Date,
  expectedDayKey?: string
): {
  ok: boolean;
  reason?: string;
  layer?: number;
  itemId?: string;
  qty?: number;
  current?: AbyssCurrentId;
  oxygenCost?: number;
  oxygenLeft?: number;
} {
  ensurePlayerExtensions(player);
  if (!isValidAbyssLayer(layer)) return { ok: false, reason: "未知的遗迹层" };
  const ad = ensureAbyssDive(player, now);
  if (expectedDayKey !== undefined && expectedDayKey !== ad.dayKey) {
    return { ok: false, reason: `日期已更替：今天的遗迹图是 ${ad.dayKey}，请刷新后再试` };
  }
  const def = getAbyssRuinDef(layer);
  const plan = planAbyssDive(abyssDayIndexFromKey(ad.dayKey)!, layer, ad.gearLevel, abyssChefLevel(player), ad.divesToday, ad.oxygenUsed);
  if (!plan.gearOk) return { ok: false, reason: `潜水装备还下不到第 ${def.layer} 层「${def.name}」` };
  if (!plan.levelOk) return { ok: false, reason: `下潜「${def.name}」需厨师（钓鱼）等级 ${def.minChefLevel}（当前 ${plan.chefLevel}）` };
  if (plan.divesLeft <= 0) return { ok: false, reason: `「${def.name}」今天已下潜 ${ABYSS_DIVES_PER_LAYER_PER_DAY} 次，明天遗迹会重新开放` };
  if (!plan.oxygenOk) return { ok: false, reason: `氧气不足：下潜「${def.name}」需 ${plan.oxygenCost}，今日剩余 ${plan.oxygenLeft}` };
  const s = plan.salvage!;
  player.inventory[s.itemId] = Math.floor(Number(player.inventory[s.itemId] || 0)) + s.qty;
  ad.oxygenUsed = Math.min(plan.oxygenBudget, ad.oxygenUsed + s.oxygenCost);
  ad.divesToday = { ...ad.divesToday, [String(def.layer)]: (ad.divesToday[String(def.layer)] || 0) + 1 };
  ad.totalDives = Math.min(ABYSS_COUNTER_CAP, ad.totalDives + 1);
  ad.totalSalvage = Math.min(ABYSS_COUNTER_CAP, ad.totalSalvage + s.qty);
  ad.deepestLayer = Math.max(ad.deepestLayer, def.layer);
  ad.lastDive = { layer: def.layer, itemId: s.itemId, qty: s.qty, current: s.current, oxygen: s.oxygenCost, at: now.toISOString() };
  syncAchievements(player);
  appendLog(
    player,
    `深海遗迹潜航：下潜第 ${def.layer} 层「${def.name}」（${s.currentName}），消耗氧气 ${s.oxygenCost}，打捞到「${abyssItemName(contentPack, s.itemId)}」×${s.qty}。`
  );
  return {
    ok: true,
    layer: def.layer,
    itemId: s.itemId,
    qty: s.qty,
    current: s.current,
    oxygenCost: s.oxygenCost,
    oxygenLeft: plan.oxygenBudget - ad.oxygenUsed,
  };
}

/** 潜水装备升级：金币 + 真实生活职业成品，提高每日氧气、打捞倍率与可达深度（转生永久保留）。 */
export function upgradeAbyssGear(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack | undefined,
  now: Date
): { ok: boolean; reason?: string; gearLevel?: number; oxygen?: number; spentGold?: number } {
  ensurePlayerExtensions(player);
  const ad = ensureAbyssDive(player, now);
  const plan = planAbyssGearUpgrade(ad.gearLevel, abyssGold(player), player.inventory);
  if (plan.maxed || !plan.next) return { ok: false, reason: `潜水装备已是最高等级「${plan.current.name}」` };
  const next = plan.next;
  if (!plan.goldOk) return { ok: false, reason: `金币不足：升级「${next.name}」需 ${next.costGold} 金币` };
  if (!plan.materialsOk) {
    const missing = plan.materials
      .filter((m) => m.have < m.need)
      .map((m) => `${abyssItemName(contentPack, m.itemId)} ×${m.need}（现有 ${m.have}）`)
      .join("、");
    return { ok: false, reason: `材料不足：${missing}` };
  }
  player.inventory.gold = abyssGold(player) - next.costGold;
  if (player.stats) player.stats.totalGoldSpent = (player.stats.totalGoldSpent || 0) + next.costGold;
  for (const m of plan.materials) {
    player.inventory[m.itemId] = Math.floor(Number(player.inventory[m.itemId] || 0)) - m.need;
    if (player.inventory[m.itemId] <= 0) delete player.inventory[m.itemId];
  }
  ad.gearLevel = next.level;
  addReputation(player, 2);
  syncAchievements(player);
  appendLog(player, `深海遗迹潜航：换上「${next.name}」，每日氧气 ${next.oxygen}、打捞 ×${next.salvagePct}%，可下潜到第 ${next.maxLayer} 层。`);
  return { ok: true, gearLevel: next.level, oxygen: next.oxygen, spentGold: next.costGold };
}

/**
 * 公会战挑战：以玩家真实战斗构建挑战本周对手行会的下一席，复用竞技场沙盒 simulateSandboxDuel 结算
 * （满血入场、禁用补给与临时增益、上限 10 分钟、不动真实存档）。消耗 1 次本周挑战次数，胜则领取行会勋章。
 */
export function challengeGuildWar(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack | undefined,
  seat: number,
  now: Date,
  expectedWeekKey?: string
): {
  ok: boolean;
  reason?: string;
  seat?: number;
  won?: boolean;
  timeout?: boolean;
  opponentName?: string;
  medals?: number;
  sweep?: boolean;
  totalMedals?: number;
  rank?: number;
  rankUp?: boolean;
  attemptsLeft?: number;
  duel?: ArenaDuelResult;
} {
  ensurePlayerExtensions(player);
  if (!contentPack) return { ok: false, reason: "公会战暂未开放（缺少内容包）" };
  if (!isValidGuildSeat(seat)) return { ok: false, reason: "未知的公会战席位" };
  const gw = ensureGuildWar(player, now);
  if (expectedWeekKey !== undefined && expectedWeekKey !== gw.weekKey) {
    return { ok: false, reason: `已换周：本周公会战从 ${gw.weekKey} 开始，请刷新后再试` };
  }
  const weekIndex = guildWarWeekIndexFromKey(gw.weekKey)!;
  const plan = planGuildWarChallenge(weekIndex, seat, gw.cleared, gw.attemptsUsed);
  const seatDef = GUILD_SEATS[seat - 1];
  if (plan.already) return { ok: false, reason: `本周已击败对手「${seatDef.name}」` };
  if (!plan.inOrder) return { ok: false, reason: `需先击败第 ${plan.target ?? GUILD_SEATS.length} 席「${GUILD_SEATS[(plan.target ?? 1) - 1].name}」` };
  if (plan.attemptsLeft <= 0) return { ok: false, reason: `本周挑战次数已用完（每周 ${GUILD_WAR_WEEKLY_ATTEMPTS} 次），下周一 0 点重置` };
  const opponent = plan.opponent!;
  const duel = simulateSandboxDuel(player, contentPack, guildWarOpponentMonster(opponent), now);
  gw.attemptsUsed = Math.min(GUILD_WAR_WEEKLY_ATTEMPTS, gw.attemptsUsed + 1);
  gw.totalDuels = Math.min(ABYSS_COUNTER_CAP, gw.totalDuels + 1);
  const prevRank = getGuildRank(gw.totalMedals).current.rank;
  let medals = 0;
  let sweep = false;
  if (duel.won) {
    const reward = plan.reward!;
    medals = reward.medals;
    sweep = reward.sweep;
    gw.cleared = cleanGuildWarCleared([...gw.cleared, seat]);
    gw.totalMedals = Math.min(GUILD_MEDAL_CAP, gw.totalMedals + medals);
    gw.totalWins = Math.min(gw.totalDuels, gw.totalWins + 1);
    if (sweep) gw.sweeps = Math.min(gw.totalWins, gw.sweeps + 1);
    addReputation(player, sweep ? 4 : 2);
  }
  gw.lastDuel = {
    weekKey: gw.weekKey,
    seat,
    rivalId: opponent.rivalId,
    opponentName: opponent.name,
    won: duel.won,
    timeout: duel.timeout,
    medals,
    at: now.toISOString(),
  };
  syncAchievements(player);
  const rank = getGuildRank(gw.totalMedals).current;
  appendLog(
    player,
    duel.won
      ? `冒险者行会公会战：击败「${opponent.name}」，行会勋章 +${medals}${sweep ? `（五席全胜，含额外 +${GUILD_WAR_SWEEP_BONUS}）` : ""}${
          rank.rank > prevRank ? `，位阶升至「${rank.name}」！` : "。"
        }`
      : `冒险者行会公会战：${duel.timeout ? "与" : "不敌"}「${opponent.name}」${duel.timeout ? "缠斗 10 分钟未分胜负" : ""}，本周还剩 ${
          GUILD_WAR_WEEKLY_ATTEMPTS - gw.attemptsUsed
        } 次挑战。`
  );
  return {
    ok: true,
    seat,
    won: duel.won,
    timeout: duel.timeout,
    opponentName: opponent.name,
    medals,
    sweep,
    totalMedals: gw.totalMedals,
    rank: rank.rank,
    rankUp: rank.rank > prevRank,
    attemptsLeft: GUILD_WAR_WEEKLY_ATTEMPTS - gw.attemptsUsed,
    duel,
  };
}

/** 构造前端「深海遗迹潜航 & 冒险者行会公会战」视图（会补齐两份状态，并按显式 now 换日 / 翻周）。 */
export function getAbyssGuildInfo(player: EnhancedPlayerState, contentPack: EnhancedContentPack | undefined, now: Date) {
  ensurePlayerExtensions(player);
  const { ad, gw } = ensureAbyssGuildClocks(player, now);
  const itemName = (id: string) => abyssItemName(contentPack, id);
  const have = (id: string) => Math.floor(Number(player.inventory[id] || 0));
  const gold = abyssGold(player);
  const today = abyssDayIndexFromKey(ad.dayKey)!;
  const chefLevel = abyssChefLevel(player);
  const actions = ((contentPack as any)?.actions || []) as Array<{ id: string; name: string; consumes?: Array<{ itemId: string }> }>;
  // 打捞品接入既有材料：找内容包里消耗该物品的真实配方
  const useOf = (itemId: string) => {
    const a = actions.find((x) => (x.consumes || []).some((c) => c.itemId === itemId));
    return a ? a.name : null;
  };
  const gear = getAbyssGear(ad.gearLevel);
  const gearPlan = planAbyssGearUpgrade(ad.gearLevel, gold, player.inventory);
  const layers = ABYSS_RUINS.map((r) => {
    const plan = planAbyssDive(today, r.layer, ad.gearLevel, chefLevel, ad.divesToday, ad.oxygenUsed);
    const s = plan.salvage!;
    let block: string | null = null;
    if (!plan.gearOk) block = "需升级潜水装备";
    else if (!plan.levelOk) block = `需厨师 Lv.${r.minChefLevel}`;
    else if (plan.divesLeft <= 0) block = "今日已潜完";
    else if (!plan.oxygenOk) block = "氧气不足";
    return {
      layer: r.layer,
      name: r.name,
      meters: r.meters,
      description: r.description,
      minChefLevel: r.minChefLevel,
      salvage: r.salvage.map((id) => ({ id, name: itemName(id), have: have(id), use: useOf(id) })),
      ruin: { itemId: s.itemId, itemName: itemName(s.itemId), current: s.current, currentName: s.currentName, oxygenCost: s.oxygenCost, qty: s.qty },
      gearOk: plan.gearOk,
      levelOk: plan.levelOk,
      divesUsed: ABYSS_DIVES_PER_LAYER_PER_DAY - plan.divesLeft,
      divesLeft: plan.divesLeft,
      canDive: plan.ok,
      block,
    };
  });

  const weekIndex = guildWarWeekIndexFromKey(gw.weekKey)!;
  const rival = getGuildRival(weekIndex);
  const rank = getGuildRank(gw.totalMedals);
  const target = gw.cleared.length + 1;
  const attemptsLeft = GUILD_WAR_WEEKLY_ATTEMPTS - gw.attemptsUsed;
  const seats = getGuildWarLineup(weekIndex).map((o) => {
    const plan = planGuildWarChallenge(weekIndex, o.seat, gw.cleared, gw.attemptsUsed);
    return {
      ...o,
      reward: plan.reward!.medals,
      cleared: plan.already,
      isTarget: o.seat === target,
      canChallenge: plan.ok && Boolean(contentPack),
      block: plan.already ? "已击败" : !plan.inOrder ? "需按顺序挑战" : plan.attemptsLeft <= 0 ? "本周次数已用完" : null,
    };
  });

  return {
    nowMs: now.getTime(),
    bonuses: getGuildWarBonuses(player),
    dive: {
      dayKey: ad.dayKey,
      dayEndsAtMs: (today + 1) * 86_400_000 - ABYSS_TZ_OFFSET_MINUTES * 60_000,
      gold,
      chefLevel,
      oxygen: { budget: gear.oxygen, used: ad.oxygenUsed, left: gear.oxygen - ad.oxygenUsed },
      divesPerLayer: ABYSS_DIVES_PER_LAYER_PER_DAY,
      gear: {
        level: gear.level,
        name: gear.name,
        oxygen: gear.oxygen,
        salvagePct: gear.salvagePct,
        maxLayer: gear.maxLayer,
        maxLevel: ABYSS_GEARS.length,
        next: gearPlan.next
          ? { level: gearPlan.next.level, name: gearPlan.next.name, oxygen: gearPlan.next.oxygen, salvagePct: gearPlan.next.salvagePct, maxLayer: gearPlan.next.maxLayer, costGold: gearPlan.next.costGold }
          : null,
        materials: gearPlan.materials.map((m) => ({ ...m, name: itemName(m.itemId) })),
        canUpgrade: gearPlan.ok,
        block: gearPlan.maxed ? "已满级" : !gearPlan.goldOk ? "金币不足" : !gearPlan.materialsOk ? "材料不足" : null,
        steps: ABYSS_GEARS.map((g) => ({ level: g.level, name: g.name, oxygen: g.oxygen, reached: g.level <= gear.level })),
      },
      layers,
      totals: { dives: ad.totalDives, salvage: ad.totalSalvage, deepest: ad.deepestLayer },
      lastDive: ad.lastDive
        ? { ...ad.lastDive, layerName: getAbyssRuinDef(ad.lastDive.layer).name, itemName: itemName(ad.lastDive.itemId), currentName: getAbyssCurrentDef(ad.lastDive.current).name }
        : null,
    },
    guild: {
      weekKey: gw.weekKey,
      weekEndsAtMs: GUILD_WAR_WEEK_EPOCH_MS + (weekIndex + 1) * GUILD_WAR_WEEK_MS - ABYSS_TZ_OFFSET_MINUTES * 60_000,
      rival: { ...rival },
      nextRival: { ...getGuildRival(weekIndex + 1) },
      attemptsUsed: gw.attemptsUsed,
      attemptsLeft,
      attemptsPerWeek: GUILD_WAR_WEEKLY_ATTEMPTS,
      sweepBonus: GUILD_WAR_SWEEP_BONUS,
      clearedCount: gw.cleared.length,
      seats,
      rank: {
        totalMedals: rank.totalMedals,
        rank: rank.current.rank,
        name: rank.current.name,
        stats: { ...rank.current.stats },
        next: rank.next ? { rank: rank.next.rank, name: rank.next.name, minMedals: rank.next.minMedals, stats: { ...rank.next.stats } } : null,
        progressPct: rank.progressPct,
        ranks: GUILD_RANKS.map((r) => ({ rank: r.rank, name: r.name, minMedals: r.minMedals, stats: { ...r.stats }, reached: rank.totalMedals >= r.minMedals })),
      },
      caps: { ...GUILD_BONUS_CAPS },
      totals: { duels: gw.totalDuels, wins: gw.totalWins, sweeps: gw.sweeps },
      lastDuel: gw.lastDuel ? { ...gw.lastDuel } : null,
    },
  };
}
