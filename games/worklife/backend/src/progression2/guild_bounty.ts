// 进阶进度 · 异世界公会：每日词缀讨伐委托板 & 连携赏金系统
// 从 progression2.ts 原样拆出；对外一律从 "../progression2" 引用。

import type {
  EnhancedContentPack,
  EnhancedPlayerState,
  Bounty,
  BountyState,
  GuildBountyAffixId,
  GuildComboMilestoneId,
  GuildHonorShopCategory,
  GuildHonorState,
  PlayerStats,
} from "../types";
import { ensurePlayerExtensions, appendLog } from "../storage";
import { syncAchievements } from "../progression";
import { todayLocal } from "../time";
import { PROTECTION_MIRROR_ID } from "../enhancement_math";
import { addReputation, type ReputationBonusPct } from "./reputation";
import { getAlchemyCauldronBonuses } from "./alchemy_cauldron";
import { getAstralRelicsBonuses } from "./astral_relics";

/* ============================ 异世界公会：每日词缀讨伐委托板 & 连携赏金系统 ============================ */

export interface GuildBountyAffixDef {
  id: GuildBountyAffixId;
  name: string;
  enName: string;
  iconKind: "skills";
  iconId: string;
  tone: "emerald" | "crimson" | "cyan" | "amber" | "gold";
  preferredMetrics: Array<"gather" | "craft" | "kill">;
  ecologicalSummary: string;
  activeEffectText: string;
  lingeringEffectText: string;
  activeModifiers: {
    gatherDoubleChance?: number;
    armorPenPct?: number;
    bonusAtk?: number;
    intervalMult?: number;
    combatSpeedPct?: number;
    craftEfficiencyPct?: number;
    craftSpeedPct?: number;
    goldGainPct?: number;
    rareFindPct?: number;
  };
  lingeringModifiers: {
    gatherDoubleChance?: number;
    armorPenPct?: number;
    bonusAtk?: number;
    intervalMult?: number;
    combatSpeedPct?: number;
    craftEfficiencyPct?: number;
    craftSpeedPct?: number;
    goldGainPct?: number;
    rareFindPct?: number;
  };
}

export const GUILD_BOUNTY_AFFIXES: GuildBountyAffixDef[] = [
  {
    id: "bountiful_harvest",
    name: "双倍采集产出",
    enName: "Bountiful Harvest",
    iconKind: "skills",
    iconId: "affix_bountiful_harvest",
    tone: "emerald",
    preferredMetrics: ["gather"],
    ecologicalSummary: "丰饶灵脉涌动，公会勘探区内矿木灵草在委托执行期间成倍析出。",
    activeEffectText: "执行中：采集基础产出 100% 双倍触发",
    lingeringEffectText: "当日余韵：采集双倍率 +12%",
    activeModifiers: { gatherDoubleChance: 1.0 },
    lingeringModifiers: { gatherDoubleChance: 0.12 },
  },
  {
    id: "scorching_sunder",
    name: "炽热护甲破防",
    enName: "Scorching Armor-Break",
    iconKind: "skills",
    iconId: "affix_scorching_sunder",
    tone: "crimson",
    preferredMetrics: ["kill"],
    ecologicalSummary: "熔火裂隙侵蚀魔物甲壳，炽热战意可大幅贯穿敌方护甲防御。",
    activeEffectText: "执行中：护甲穿透 +30% · 攻击力 +6",
    lingeringEffectText: "当日余韵：护甲穿透 +8% · 攻击力 +2",
    activeModifiers: { armorPenPct: 0.3, bonusAtk: 6 },
    lingeringModifiers: { armorPenPct: 0.08, bonusAtk: 2 },
  },
  {
    id: "swift_assault",
    name: "迅捷攻速试炼",
    enName: "Swift Assault Trial",
    iconKind: "skills",
    iconId: "affix_swift_assault",
    tone: "cyan",
    preferredMetrics: ["kill"],
    ecologicalSummary: "疾风魔力充盈讨伐战域，猎手进入高频率连斩试炼节奏。",
    activeEffectText: "执行中：攻击间隔缩短 18%",
    lingeringEffectText: "当日余韵：攻击间隔缩短 5%",
    activeModifiers: { intervalMult: 0.82, combatSpeedPct: 20 },
    lingeringModifiers: { intervalMult: 0.95, combatSpeedPct: 6 },
  },
  {
    id: "artisan_overdrive",
    name: "巧匠炉火共鸣",
    enName: "Artisan Forge Resonance",
    iconKind: "skills",
    iconId: "affix_artisan_overdrive",
    tone: "amber",
    preferredMetrics: ["craft"],
    ecologicalSummary: "公会秘锻炉火与工坊共鸣，制造效率与出炉速度同步跃升。",
    activeEffectText: "执行中：制作效率 +25% · 制作速度 +20%",
    lingeringEffectText: "当日余韵：制作效率 +6% · 制作速度 +5%",
    activeModifiers: { craftEfficiencyPct: 25, craftSpeedPct: 20 },
    lingeringModifiers: { craftEfficiencyPct: 6, craftSpeedPct: 5 },
  },
  {
    id: "gilded_spoils",
    name: "黄金战利悬赏",
    enName: "Gilded Spoils Bounty",
    iconKind: "skills",
    iconId: "affix_gilded_spoils",
    tone: "gold",
    preferredMetrics: ["craft", "gather", "kill"],
    ecologicalSummary: "王都商会联合追加悬赏金，单人讨伐额外获得金币与稀有战利。",
    activeEffectText: "执行中：单人战斗金币 +35% · 战斗稀有掉率 +25% · 单人再 +30%",
    lingeringEffectText: "当日余韵：单人战斗金币 +8% · 战斗稀有掉率 +6% · 单人再 +7.2%",
    activeModifiers: { goldGainPct: 35, rareFindPct: 25 },
    lingeringModifiers: { goldGainPct: 8, rareFindPct: 6 },
  },
];

type BountyTemplate = {
  id: string;
  name: string;
  description: string;
  icon: string;
  iconKind: "skills" | "ui";
  iconId: string;
  metric: "gather" | "craft" | "kill";
  target: number;
  baseGold: number;
  baseRep: number;
  baseHonor: number;
};

// 契约模板池：覆盖采集/制作/击杀三类，全部绑定 T1 手绘美术键（零 Emoji 占位）。
export const BOUNTY_TEMPLATES: BountyTemplate[] = [
  { id: "bt_gather_50", name: "灵脉物资勘探", description: "采集 50 份异世界资源", icon: "gather_1", iconKind: "ui", iconId: "nav-logging", metric: "gather", target: 50, baseGold: 420, baseRep: 22, baseHonor: 16 },
  { id: "bt_gather_120", name: "丰饶大宗征集", description: "采集 120 份异世界资源", icon: "gather_2", iconKind: "ui", iconId: "nav-gathering", metric: "gather", target: 120, baseGold: 920, baseRep: 48, baseHonor: 24 },
  { id: "bt_gather_250", name: "秘境灵材囤储", description: "采集 250 份异世界资源", icon: "gather_3", iconKind: "ui", iconId: "nav-mining", metric: "gather", target: 250, baseGold: 1850, baseRep: 92, baseHonor: 36 },
  { id: "bt_craft_25", name: "军需工坊急单", description: "制作 25 件工坊制品", icon: "craft_1", iconKind: "ui", iconId: "nav-woodworking", metric: "craft", target: 25, baseGold: 460, baseRep: 24, baseHonor: 18 },
  { id: "bt_craft_60", name: "百工精铸配给", description: "制作 60 件工坊制品", icon: "craft_2", iconKind: "ui", iconId: "nav-smithing", metric: "craft", target: 60, baseGold: 1020, baseRep: 52, baseHonor: 26 },
  { id: "bt_craft_120", name: "王都宗师军备", description: "制作 120 件工坊制品", icon: "craft_3", iconKind: "ui", iconId: "nav-alchemy", metric: "craft", target: 120, baseGold: 2050, baseRep: 105, baseHonor: 38 },
  { id: "bt_kill_30", name: "前线魔物清剿", description: "讨伐击杀 30 只魔物", icon: "kill_1", iconKind: "ui", iconId: "nav-adventure", metric: "kill", target: 30, baseGold: 520, baseRep: 26, baseHonor: 20 },
  { id: "bt_kill_80", name: "裂隙精锐讨伐", description: "讨伐击杀 80 只魔物", icon: "kill_2", iconKind: "ui", iconId: "nav-melee", metric: "kill", target: 80, baseGold: 1150, baseRep: 58, baseHonor: 28 },
  { id: "bt_kill_160", name: "深渊灾兽征讨", description: "讨伐击杀 160 只魔物", icon: "kill_3", iconKind: "ui", iconId: "nav-ranged", metric: "kill", target: 160, baseGold: 2250, baseRep: 112, baseHonor: 40 },
];

export interface GuildComboMilestoneDef {
  id: GuildComboMilestoneId;
  name: string;
  badgeText: string;
  iconKind: "skills";
  iconId: string;
  requiredCount: number; // chain_full 动态对齐当日满板契约数（最小 3，标准 4）
  honorPoints: number;
  forgingEmblems: number;
  gold: number;
  reputation: number;
  bonusItems?: Record<string, number>;
  summary: string;
}

export const GUILD_COMBO_MILESTONES: GuildComboMilestoneDef[] = [
  {
    id: "chain_2",
    name: "二连讨伐连携",
    badgeText: "2-Chain 连携",
    iconKind: "skills",
    iconId: "guild_honor_crest",
    requiredCount: 2,
    honorPoints: 60,
    forgingEmblems: 1,
    gold: 600,
    reputation: 35,
    summary: "同日完成 2 份词缀委托：授予公会荣誉积分与稀有锻造徽记",
  },
  {
    id: "chain_full",
    name: "全板制霸赏金",
    badgeText: "Full-Board 制霸",
    iconKind: "skills",
    iconId: "forging_emblem",
    requiredCount: 4,
    honorPoints: 140,
    forgingEmblems: 3,
    gold: 1500,
    reputation: 80,
    bonusItems: { [PROTECTION_MIRROR_ID]: 1 },
    summary: "同日扫清全板委托：重奖公会荣誉、稀有锻造徽记与强化定纹镜",
  },
];

export interface GuildHonorShopItemDef {
  id: string;
  name: string;
  category: GuildHonorShopCategory;
  categoryLabel: string;
  iconKind: "skills" | "materials";
  iconId: string;
  honorCost: number;
  emblemCost: number;
  dailyLimit?: number;
  frameLabel?: string;
  frameTheme?: "crimson" | "astral";
  bonuses?: ReputationBonusPct;
  summary: string;
  effectText: string;
}

export const GUILD_HONOR_SHOP: GuildHonorShopItemDef[] = [
  {
    id: "frame_crimson_vanguard",
    name: "专属边框·绯焰讨伐纹章框",
    category: "frame",
    categoryLabel: "专属公会边框",
    iconKind: "skills",
    iconId: "guild_frame_crimson",
    honorCost: 120,
    emblemCost: 1,
    frameLabel: "绯焰讨伐纹章",
    frameTheme: "crimson",
    bonuses: { combatSpeed: 3, goldGain: 3 },
    summary: "以赤龙鳞金与红莲宝石锻造的公会精锐头像框，解锁后可在顶栏与角色卡佩戴展示",
    effectText: "永久解锁专属边框 · 佩戴加成：战斗金币 +3%",
  },
  {
    id: "frame_astral_sovereign",
    name: "专属边框·星穹全制霸圣冕框",
    category: "frame",
    categoryLabel: "专属公会边框",
    iconKind: "skills",
    iconId: "guild_frame_astral",
    honorCost: 280,
    emblemCost: 3,
    frameLabel: "星穹全制霸圣冕",
    frameTheme: "astral",
    bonuses: { gatherSpeed: 4, craftSpeed: 4, combatSpeed: 4, xpGain: 5 },
    summary: "唯屡次全板制霸的传奇冒险者方能兑换的白金星冕边框，辉映全公会最高殊荣",
    effectText: "永久解锁专属边框 · 佩戴加成：采集/制作速度 +4% · 经验获取 +5%",
  },
  {
    id: "supply_forging_emblem_pack",
    name: "秘锻徽记淬火礼匣",
    category: "forging",
    categoryLabel: "锻造徽记补给",
    iconKind: "skills",
    iconId: "forging_emblem",
    honorCost: 80,
    emblemCost: 1,
    dailyLimit: 3,
    summary: "凭稀有锻造徽记向公会铁匠宗师申领强化定纹镜与当前等阶高纯度锭晶",
    effectText: "立即获得 定纹镜 ×1 + 等阶精炼金属锭/魔力水晶 + 锻造津贴 800 金币",
  },
  {
    id: "supply_bounty_ration_kit",
    name: "公会讨伐战备补给包",
    category: "supply",
    categoryLabel: "讨伐战备补给",
    iconKind: "skills",
    iconId: "qm_supply_chest",
    honorCost: 60,
    emblemCost: 0,
    dailyLimit: 5,
    summary: "公会后勤处配发的速效讨伐秘药与悬赏刷新令，助力连续攻坚词缀委托",
    effectText: "极·狂战药剂 ×2 + 500 金币；今日用过刷新时恢复 1 次额度",
  },
];

const RARITY_ROLL: Array<{ rarity: Bounty["rarity"]; weight: number; mult: number }> = [
  { rarity: "common", weight: 55, mult: 1.0 },
  { rarity: "rare", weight: 32, mult: 1.6 },
  { rarity: "epic", weight: 13, mult: 2.5 },
];

const MAX_DAILY_REROLLS = 3;
export const BOUNTY_SLOTS = 4;
const REROLL_COST = 500; // 每次刷新消耗金币

function todayUTC(now: Date = new Date()): string {
  return todayLocal(now);
}

/** FNV-1a 32-bit + Mulberry32 确定性伪随机生成器（同日期+同刷新序号恒定产出同一张词缀委托板） */
export function createSeededRng(seedKey: string): () => number {
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

export function buildDailyBountySeedKey(date: string, rerollIndex = 0): string {
  return `wl5-guild-bounty:${date}#r${Math.max(0, Math.floor(rerollIndex || 0))}`;
}

function rollRaritySeeded(rng: () => number): { rarity: Bounty["rarity"]; mult: number } {
  const totalW = RARITY_ROLL.reduce((s, r) => s + r.weight, 0);
  let r = rng() * totalW;
  for (const opt of RARITY_ROLL) {
    if (r < opt.weight) return { rarity: opt.rarity, mult: opt.mult };
    r -= opt.weight;
  }
  return { rarity: "common", mult: 1.0 };
}

/** 将 bounty.metric 映射到 stats 累计字段 */
function metricToStat(metric: Bounty["metric"]): keyof PlayerStats {
  if (metric === "gather") return "totalGathered";
  if (metric === "craft") return "totalCrafted";
  return "totalKills";
}

export function getAffixDef(affixId?: string | null): GuildBountyAffixDef {
  return GUILD_BOUNTY_AFFIXES.find((a) => a.id === affixId) || GUILD_BOUNTY_AFFIXES[0];
}

function defaultAffixForTemplate(tplId: string, metric: Bounty["metric"], slotIdx = 0): GuildBountyAffixId {
  if (metric === "gather") return "bountiful_harvest";
  if (metric === "kill") {
    return slotIdx % 2 === 0 || tplId === "bt_kill_30" ? "scorching_sunder" : "swift_assault";
  }
  return slotIdx % 2 === 0 ? "artisan_overdrive" : "gilded_spoils";
}

/** 生成一条确定性词缀契约（baseline 取当前 stats） */
function genBountyFrom(
  tpl: BountyTemplate,
  stats: PlayerStats,
  affixId: GuildBountyAffixId,
  rng: () => number,
  idSuffix: string
): Bounty {
  const { rarity, mult } = rollRaritySeeded(rng);
  const statKey = metricToStat(tpl.metric);
  const affix = getAffixDef(affixId);
  return {
    id: `${tpl.id}_${idSuffix}`,
    templateId: tpl.id,
    name: tpl.name,
    description: tpl.description,
    icon: tpl.icon,
    iconKind: affix.iconKind,
    iconId: affix.iconId,
    affixId: affix.id,
    metric: tpl.metric,
    target: tpl.target,
    baseline: (stats[statKey] as number) || 0,
    accepted: false,
    claimed: false,
    rarity,
    honorReward: Math.max(10, Math.round(tpl.baseHonor * mult)),
    reward: {
      gold: Math.round(tpl.baseGold * mult),
      reputation: Math.round(tpl.baseRep * mult),
    },
  };
}

function pickFromPool<T>(pool: T[], rng: () => number): T {
  const idx = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
  return pool.splice(idx, 1)[0];
}

/**
 * 按日期种子确定性生成一整板词缀委托（默认 4 槽）：
 * - 保证同板契约模板绝不重复、生态词缀绝不重复；
 * - 初始整板恒定覆盖三大核心生态词缀：双倍采集产出、炽热护甲破防、迅捷攻速试炼，以及第 4 槽工坊/黄金悬赏词缀。
 */
export function genDailyAffixBountyBoard(
  date: string,
  stats: PlayerStats,
  count: number = BOUNTY_SLOTS,
  rerollIndex = 0,
  excludeTemplates: Set<string> = new Set(),
  excludeAffixes: Set<GuildBountyAffixId> = new Set()
): Bounty[] {
  const seedKey = buildDailyBountySeedKey(date, rerollIndex);
  const rng = createSeededRng(seedKey);
  const compactDate = date.replace(/[^0-9]/g, "") || "daily";
  const usedTemplates = new Set<string>(excludeTemplates);
  const usedAffixes = new Set<GuildBountyAffixId>(excludeAffixes);
  const out: Bounty[] = [];

  const plannedAffixes: GuildBountyAffixId[] = [
    "bountiful_harvest",
    "scorching_sunder",
    "swift_assault",
    rng() < 0.5 ? "artisan_overdrive" : "gilded_spoils",
  ];
  // 若存在被保留的已接取词缀，则补齐尚未登场的生态词缀
  for (const a of GUILD_BOUNTY_AFFIXES) {
    if (!plannedAffixes.includes(a.id)) plannedAffixes.push(a.id);
  }

  for (const affixId of plannedAffixes) {
    if (out.length >= count) break;
    if (usedAffixes.has(affixId)) continue;
    const affix = getAffixDef(affixId);
    const preferredPool = BOUNTY_TEMPLATES.filter(
      (t) => !usedTemplates.has(t.id) && affix.preferredMetrics.includes(t.metric)
    );
    const fallbackPool = BOUNTY_TEMPLATES.filter((t) => !usedTemplates.has(t.id));
    const pool = preferredPool.length > 0 ? [...preferredPool] : [...fallbackPool];
    if (pool.length === 0) break;
    const tpl = pickFromPool(pool, rng);
    usedTemplates.add(tpl.id);
    usedAffixes.add(affixId);
    const token = Math.floor(rng() * 0xffffff).toString(16).padStart(6, "0");
    out.push(genBountyFrom(tpl, stats, affixId, rng, `${compactDate}r${rerollIndex}s${out.length}_${token}`));
  }

  // 若槽位仍未满（例如保留了较多进行中契约导致词缀池耗尽），继续从剩余模板补齐
  const restPool = BOUNTY_TEMPLATES.filter((t) => !usedTemplates.has(t.id));
  while (out.length < count && restPool.length > 0) {
    const tpl = pickFromPool(restPool, rng);
    usedTemplates.add(tpl.id);
    const unusedAffix =
      GUILD_BOUNTY_AFFIXES.find((a) => !usedAffixes.has(a.id))?.id ||
      defaultAffixForTemplate(tpl.id, tpl.metric, out.length);
    usedAffixes.add(unusedAffix);
    const token = Math.floor(rng() * 0xffffff).toString(16).padStart(6, "0");
    out.push(genBountyFrom(tpl, stats, unusedAffix, rng, `${compactDate}r${rerollIndex}s${out.length}_${token}`));
  }

  return out;
}

/** 确保 guildHonor 持久对象存在并净化非法数值（向后兼容旧存档） */
export function ensureGuildHonor(player: EnhancedPlayerState): GuildHonorState {
  if (!Array.isArray((player as any).logs)) {
    (player as any).logs = [];
  }
  if (!player.guildHonor || typeof player.guildHonor !== "object") {
    player.guildHonor = {
      honorPoints: 0,
      totalHonorEarned: 0,
      forgingEmblems: 0,
      totalChainsCompleted: 0,
      fullClears: 0,
      unlockedFrames: [],
      equippedFrame: null,
    };
  }
  const gh = player.guildHonor;
  const cleanInt = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
  gh.honorPoints = cleanInt(gh.honorPoints);
  gh.totalHonorEarned = Math.max(gh.honorPoints, cleanInt(gh.totalHonorEarned));
  gh.forgingEmblems = cleanInt(gh.forgingEmblems);
  gh.totalChainsCompleted = cleanInt(gh.totalChainsCompleted);
  gh.fullClears = cleanInt(gh.fullClears);
  if (!Array.isArray(gh.unlockedFrames)) gh.unlockedFrames = [];
  gh.unlockedFrames = Array.from(new Set(gh.unlockedFrames.filter((x) => typeof x === "string" && x.length > 0)));
  if (typeof gh.equippedFrame !== "string" || !gh.unlockedFrames.includes(gh.equippedFrame)) {
    gh.equippedFrame = null;
  }
  return gh;
}

/** 为旧版无词缀契约补齐确定性生态词缀与荣誉奖励，不改动其接取/领奖进度 */
function hydrateLegacyBoardInPlace(state: BountyState): void {
  const usedAffixes = new Set<GuildBountyAffixId>();
  const tplMap = new Map(BOUNTY_TEMPLATES.map((t) => [t.id, t]));
  state.bounties.forEach((b, idx) => {
    const tpl = tplMap.get(b.templateId);
    if (!b.affixId || !GUILD_BOUNTY_AFFIXES.some((a) => a.id === b.affixId)) {
      const preferred = GUILD_BOUNTY_AFFIXES.find(
        (a) => !usedAffixes.has(a.id) && a.preferredMetrics.includes(b.metric)
      );
      const fallback = GUILD_BOUNTY_AFFIXES.find((a) => !usedAffixes.has(a.id));
      b.affixId = preferred?.id || fallback?.id || defaultAffixForTemplate(b.templateId, b.metric, idx);
    }
    usedAffixes.add(b.affixId);
    const affix = getAffixDef(b.affixId);
    b.iconKind = affix.iconKind;
    b.iconId = affix.iconId;
    if (typeof b.honorReward !== "number" || !Number.isFinite(b.honorReward) || b.honorReward <= 0) {
      const mult = b.rarity === "epic" ? 2.5 : b.rarity === "rare" ? 1.6 : 1.0;
      b.honorReward = Math.max(10, Math.round((tpl?.baseHonor || 18) * mult));
    }
  });
  if (typeof state.rerollsUsed !== "number" || !Number.isFinite(state.rerollsUsed) || state.rerollsUsed < 0) {
    state.rerollsUsed = 0;
  }
  const claimedInBoard = state.bounties.filter((b) => b.claimed).length;
  const rawClaimedCount =
    typeof state.claimedTodayCount === "number" && Number.isFinite(state.claimedTodayCount) && state.claimedTodayCount >= 0
      ? Math.floor(state.claimedTodayCount)
      : 0;
  state.claimedTodayCount = Math.max(rawClaimedCount, claimedInBoard);
  if (!Array.isArray(state.claimedAffixesToday)) {
    state.claimedAffixesToday = [];
  }
  for (const b of state.bounties) {
    if (b.claimed && b.affixId && !state.claimedAffixesToday.includes(b.affixId)) {
      state.claimedAffixesToday.push(b.affixId);
    }
  }
  if (!Array.isArray(state.comboClaimed)) {
    state.comboClaimed = [];
  }
  if (!state.seedKey) {
    state.seedKey = buildDailyBountySeedKey(state.date, state.rerollsUsed);
  }
}

/** 确保当日契约板存在；跨日则按新日期种子自动轮换（重置刷新次数与当日连携，保留荣誉积分与徽记） */
export function ensureBounties(player: EnhancedPlayerState, now: Date = new Date()): BountyState {
  ensurePlayerExtensions(player);
  ensureGuildHonor(player);
  const stats = player.stats!;
  const today = todayUTC(now);
  const known = new Set(BOUNTY_TEMPLATES.map((t) => t.id));
  const stale = (board: Bounty[] | undefined) =>
    !board ||
    board.length === 0 ||
    new Set(board.map((b) => b.templateId)).size !== board.length ||
    board.some((b) => !known.has(b.templateId));

  if (!player.bounties || player.bounties.date !== today || stale(player.bounties.bounties)) {
    const sameDay = Boolean(player.bounties && player.bounties.date === today);
    const keptRerolls =
      sameDay && typeof player.bounties!.rerollsUsed === "number" && Number.isFinite(player.bounties!.rerollsUsed) && player.bounties!.rerollsUsed >= 0
        ? Math.floor(player.bounties!.rerollsUsed)
        : 0;
    const keptClaimedCount =
      sameDay && typeof player.bounties!.claimedTodayCount === "number" && Number.isFinite(player.bounties!.claimedTodayCount) && player.bounties!.claimedTodayCount >= 0
        ? Math.floor(player.bounties!.claimedTodayCount)
        : 0;
    const keptCombo = sameDay && Array.isArray(player.bounties!.comboClaimed) ? [...player.bounties!.comboClaimed] : [];
    const keptClaimedAffixes =
      sameDay && Array.isArray(player.bounties!.claimedAffixesToday) ? [...player.bounties!.claimedAffixesToday] : [];

    player.bounties = {
      date: today,
      seedKey: buildDailyBountySeedKey(today, keptRerolls),
      bounties: genDailyAffixBountyBoard(today, stats, BOUNTY_SLOTS, keptRerolls),
      rerollsUsed: keptRerolls,
      claimedTodayCount: keptClaimedCount,
      claimedAffixesToday: keptClaimedAffixes,
      comboClaimed: keptCombo,
    };
  } else {
    hydrateLegacyBoardInPlace(player.bounties);
  }
  return player.bounties;
}

/** 某契约当前进度（0..target） */
export function bountyProgress(stats: PlayerStats, b: Bounty): number {
  const cur = (stats[metricToStat(b.metric)] as number) || 0;
  return Math.max(0, Math.min(b.target, cur - b.baseline));
}

export interface ActiveGuildAffixModifiers {
  gatherDoubleChance: number;
  armorPenPct: number;
  bonusAtk: number;
  intervalMult: number;
  combatSpeedPct: number;
  craftEfficiencyPct: number;
  craftSpeedPct: number;
  goldGainPct: number;
  rareFindPct: number;
  activeAffixes: Array<{ id: GuildBountyAffixId; name: string; mode: "active" | "lingering"; effectText: string }>;
}

/**
 * 纯函数：汇总玩家当前委托板上正在执行或当日已完成留存的生态词缀修正值。
 * - 已接取且未满额未领奖（accepted && !claimed && progress < target）：激活完整「执行中」生态词缀效果；
 * - 当日已完成领奖（claimed || claimedAffixesToday）：保留温和的「当日余韵」加成，防止故意卡着不领奖刷无限增益。
 * 不直接依赖系统时钟，确保 hp_combat 与前端 combatSheet 100% 确定性同构。
 */
export function getActiveGuildAffixModifiers(
  player?: Pick<EnhancedPlayerState, "bounties" | "stats"> | null
): ActiveGuildAffixModifiers {
  const res: ActiveGuildAffixModifiers = {
    gatherDoubleChance: 0,
    armorPenPct: 0,
    bonusAtk: 0,
    intervalMult: 1,
    combatSpeedPct: 0,
    craftEfficiencyPct: 0,
    craftSpeedPct: 0,
    goldGainPct: 0,
    rareFindPct: 0,
    activeAffixes: [],
  };
  const board = player?.bounties?.bounties;
  if (!Array.isArray(board) || board.length === 0) return res;
  const stats = (player?.stats || {
    totalGathered: 0,
    totalCrafted: 0,
    totalKills: 0,
  }) as PlayerStats;

  const modeByAffix = new Map<GuildBountyAffixId, "active" | "lingering">();
  for (const b of board) {
    if (!b.affixId) continue;
    if (b.accepted && !b.claimed && bountyProgress(stats, b) < b.target) {
      modeByAffix.set(b.affixId, "active");
    } else if (b.claimed && modeByAffix.get(b.affixId) !== "active") {
      modeByAffix.set(b.affixId, "lingering");
    }
  }
  if (Array.isArray(player?.bounties?.claimedAffixesToday)) {
    for (const aid of player!.bounties!.claimedAffixesToday!) {
      if (!modeByAffix.has(aid)) modeByAffix.set(aid, "lingering");
    }
  }

  for (const [affixId, mode] of modeByAffix.entries()) {
    const def = GUILD_BOUNTY_AFFIXES.find((a) => a.id === affixId);
    if (!def) continue;
    const m = mode === "active" ? def.activeModifiers : def.lingeringModifiers;
    res.gatherDoubleChance = Math.min(1, res.gatherDoubleChance + (m.gatherDoubleChance || 0));
    res.armorPenPct = Math.min(0.75, res.armorPenPct + (m.armorPenPct || 0));
    res.bonusAtk += m.bonusAtk || 0;
    if (m.intervalMult && m.intervalMult > 0) {
      res.intervalMult = Math.max(0.65, Math.round(res.intervalMult * m.intervalMult * 1000) / 1000);
    }
    res.combatSpeedPct += m.combatSpeedPct || 0;
    res.craftEfficiencyPct += m.craftEfficiencyPct || 0;
    res.craftSpeedPct += m.craftSpeedPct || 0;
    res.goldGainPct += m.goldGainPct || 0;
    res.rareFindPct += m.rareFindPct || 0;
    res.activeAffixes.push({
      id: def.id,
      name: def.name,
      mode,
      effectText: mode === "active" ? def.activeEffectText : def.lingeringEffectText,
    });
  }
  return res;
}

/** 接取契约：把 baseline 重置为当前值，从接取时刻开始计数并激活对应生态词缀 */
export function acceptBounty(
  player: EnhancedPlayerState,
  bountyId: string,
  now: Date = new Date()
): { ok: boolean; reason?: string } {
  ensureBounties(player, now);
  const stats = player.stats!;
  const b = player.bounties!.bounties.find((x) => x.id === bountyId);
  if (!b) return { ok: false, reason: "契约不存在" };
  if (b.accepted) return { ok: false, reason: "契约已接取" };
  b.accepted = true;
  b.baseline = (stats[metricToStat(b.metric)] as number) || 0;
  const affix = b.affixId ? getAffixDef(b.affixId) : null;
  appendLog(
    player,
    affix
      ? `接取公会词缀委托「${b.name} · ${affix.name}」（${affix.activeEffectText}）`
      : `接取赏金契约「${b.name}」`
  );
  return { ok: true };
}

/** 领取契约奖励（需已接取且完成），同时推进当日连携计数并授予公会荣誉积分 */
export function claimBounty(
  player: EnhancedPlayerState,
  bountyId: string,
  now: Date = new Date()
): {
  ok: boolean;
  reason?: string;
  gold?: number;
  reputation?: number;
  honorGained?: number;
  items?: Record<string, number>;
} {
  const state = ensureBounties(player, now);
  const gh = ensureGuildHonor(player);
  const stats = player.stats!;
  const b = state.bounties.find((x) => x.id === bountyId);
  if (!b) return { ok: false, reason: "契约不存在" };
  if (!b.accepted) return { ok: false, reason: "请先接取该契约" };
  if (b.claimed) return { ok: false, reason: "奖励已领取" };
  if (bountyProgress(stats, b) < b.target) return { ok: false, reason: "契约尚未完成" };

  b.claimed = true;
  const alchemyRewardPct =
    getAlchemyCauldronBonuses(player).caravanBountyRewardPct +
    getAstralRelicsBonuses(player).caravanBountyRewardPct;
  const rewardMult = 1 + alchemyRewardPct / 100;
  const gold = Math.round((b.reward.gold || 0) * rewardMult);
  player.inventory.gold = (player.inventory.gold || 0) + gold;
  stats.totalGoldEarned += gold;
  const rep = Math.round((b.reward.reputation || 0) * rewardMult);
  addReputation(player, rep);
  const honorGained = Math.max(0, Math.floor(b.honorReward || 0));
  gh.honorPoints += honorGained;
  gh.totalHonorEarned += honorGained;

  state.claimedTodayCount = Math.max(
    (state.claimedTodayCount || 0) + 1,
    state.bounties.filter((x) => x.claimed).length
  );
  if (b.affixId) {
    if (!Array.isArray(state.claimedAffixesToday)) state.claimedAffixesToday = [];
    if (!state.claimedAffixesToday.includes(b.affixId)) state.claimedAffixesToday.push(b.affixId);
  }

  if (b.reward.items) {
    for (const [id, qty] of Object.entries(b.reward.items)) {
      player.inventory[id] = (player.inventory[id] || 0) + qty;
    }
  }
  appendLog(
    player,
    `完成公会委托「${b.name}」：获得金币 ${gold}、声望 ${rep}、公会荣誉 +${honorGained}（今日连携 ${state.claimedTodayCount}）`
  );
  return { ok: true, gold, reputation: rep, honorGained, items: b.reward.items };
}

/** 刷新整个契约板（消耗金币，每日有次数上限；进行中未领奖契约继续保留，已领奖或未接取槽位重掷新词缀契约） */
export function rerollBounties(
  player: EnhancedPlayerState,
  now: Date = new Date()
): { ok: boolean; reason?: string; cost?: number; rerollsLeft?: number } {
  const state = ensureBounties(player, now);
  if (state.rerollsUsed >= MAX_DAILY_REROLLS) {
    return { ok: false, reason: "今日刷新次数已用完" };
  }
  const gold = player.inventory.gold || 0;
  if (gold < REROLL_COST) return { ok: false, reason: "金币不足" };

  // 已接取且尚未领奖的进行中契约必须保留进度；已领奖的槽位可重掷新契约（claimedTodayCount 已独立持久记录当日连携数）。
  const inProgress = state.bounties.filter((b) => b.accepted && !b.claimed);
  const excludeTpls = new Set(inProgress.map((b) => b.templateId));
  const excludeAffixes = new Set(
    inProgress.map((b) => b.affixId).filter((x): x is GuildBountyAffixId => Boolean(x))
  );
  const nextRerollIndex = state.rerollsUsed + 1;
  const needed = Math.max(0, BOUNTY_SLOTS - inProgress.length);
  const fresh = genDailyAffixBountyBoard(
    state.date,
    player.stats!,
    needed,
    nextRerollIndex,
    excludeTpls,
    excludeAffixes
  );

  player.inventory.gold = gold - REROLL_COST;
  player.stats!.totalGoldSpent += REROLL_COST;
  state.rerollsUsed = nextRerollIndex;
  state.seedKey = buildDailyBountySeedKey(state.date, nextRerollIndex);
  state.bounties = [...inProgress, ...fresh];
  syncAchievements(player);
  appendLog(player, `刷新了公会每日词缀委托板（消耗金币 ${REROLL_COST}）`);
  return { ok: true, cost: REROLL_COST, rerollsLeft: MAX_DAILY_REROLLS - state.rerollsUsed };
}

function getFullBoardTargetCount(state: BountyState): number {
  return Math.max(3, state.bounties.length || BOUNTY_SLOTS);
}

/** 领取当日连携里程碑赏金（二连讨伐连携 / 全板制霸赏金） */
export function claimBountyCombo(
  player: EnhancedPlayerState,
  milestoneId: string,
  now: Date = new Date()
): {
  ok: boolean;
  reason?: string;
  milestoneId?: GuildComboMilestoneId;
  honorGained?: number;
  emblemsGained?: number;
  gold?: number;
  reputation?: number;
  items?: Record<string, number>;
} {
  const state = ensureBounties(player, now);
  const gh = ensureGuildHonor(player);
  const def = GUILD_COMBO_MILESTONES.find((m) => m.id === milestoneId);
  if (!def) return { ok: false, reason: "未知的连携赏金档位" };

  const requiredCount = def.id === "chain_full" ? getFullBoardTargetCount(state) : def.requiredCount;
  const completedToday = state.claimedTodayCount || 0;
  if (!Array.isArray(state.comboClaimed)) state.comboClaimed = [];
  if (state.comboClaimed.includes(def.id)) {
    return { ok: false, reason: "今日该连携赏金已领取" };
  }
  if (completedToday < requiredCount) {
    return { ok: false, reason: `今日需完成 ${requiredCount} 份委托方可领取（当前 ${completedToday}/${requiredCount}）` };
  }

  state.comboClaimed.push(def.id);
  gh.honorPoints += def.honorPoints;
  gh.totalHonorEarned += def.honorPoints;
  gh.forgingEmblems += def.forgingEmblems;
  gh.totalChainsCompleted += 1;
  if (def.id === "chain_full") {
    gh.fullClears += 1;
  }

  player.inventory.gold = (player.inventory.gold || 0) + def.gold;
  player.stats!.totalGoldEarned += def.gold;
  addReputation(player, def.reputation);

  const itemsGranted: Record<string, number> = {};
  if (def.bonusItems) {
    for (const [itemId, qty] of Object.entries(def.bonusItems)) {
      player.inventory[itemId] = (player.inventory[itemId] || 0) + qty;
      itemsGranted[itemId] = qty;
    }
  }

  syncAchievements(player);
  appendLog(
    player,
    `达成公会「${def.name}」：获得公会荣誉 +${def.honorPoints}、稀有锻造徽记 +${def.forgingEmblems}、金币 +${def.gold}、声望 +${def.reputation}`
  );
  return {
    ok: true,
    milestoneId: def.id,
    honorGained: def.honorPoints,
    emblemsGained: def.forgingEmblems,
    gold: def.gold,
    reputation: def.reputation,
    items: Object.keys(itemsGranted).length > 0 ? itemsGranted : undefined,
  };
}

function resolveForgingEmblemPackRewards(
  player: EnhancedPlayerState,
  contentPack?: EnhancedContentPack
): { gold: number; items: Array<{ itemId: string; name: string; qty: number }> } {
  const smithLv = Number(player.skills?.skill_blacksmith_craft?.level || player.skills?.skill_blacksmith?.level || 1);
  const combatLv = Number(player.combatLevel || 1);
  const progressLv = Math.max(smithLv, combatLv);

  const rawEntries =
    progressLv >= 35
      ? [
          { itemId: PROTECTION_MIRROR_ID, fallbackName: "定纹镜", qty: 1 },
          { itemId: "ingot_4", fallbackName: "金锭", qty: 4 },
          { itemId: "crystal_4", fallbackName: "璀璨水晶", qty: 3 },
        ]
      : progressLv >= 15
        ? [
            { itemId: PROTECTION_MIRROR_ID, fallbackName: "定纹镜", qty: 1 },
            { itemId: "ingot_2", fallbackName: "铁锭", qty: 5 },
            { itemId: "crystal_2", fallbackName: "辉光水晶", qty: 3 },
          ]
        : [
            { itemId: PROTECTION_MIRROR_ID, fallbackName: "定纹镜", qty: 1 },
            { itemId: "ingot_1", fallbackName: "铜锭", qty: 5 },
            { itemId: "crystal_1", fallbackName: "微光水晶", qty: 3 },
          ];

  const packMap = new Map<string, string>();
  if (Array.isArray((contentPack as any)?.items)) {
    for (const it of (contentPack as any).items) {
      if (it?.id) packMap.set(String(it.id), String(it.name || it.id));
    }
  }

  const items = rawEntries
    .filter((e) => e.itemId === PROTECTION_MIRROR_ID || packMap.size === 0 || packMap.has(e.itemId))
    .map((e) => ({
      itemId: e.itemId,
      name: packMap.get(e.itemId) || e.fallbackName,
      qty: e.qty,
    }));
  return { gold: 800, items };
}

function resolveBountyRationRewards(
  contentPack?: EnhancedContentPack
): { gold: number; items: Array<{ itemId: string; name: string; qty: number }> } {
  const candidates = [
    { itemId: "potion_heal_2", fallbackId: "potion_heal_1", fallbackName: "治疗药水", qty: 3 },
    { itemId: "potion_berserk", fallbackId: "food_berry_pie", fallbackName: "行军口粮", qty: 2 },
  ];
  const packMap = new Map<string, string>();
  if (Array.isArray((contentPack as any)?.items)) {
    for (const it of (contentPack as any).items) {
      if (it?.id) packMap.set(String(it.id), String(it.name || it.id));
    }
  }
  const items: Array<{ itemId: string; name: string; qty: number }> = [];
  for (const c of candidates) {
    if (packMap.size === 0 || packMap.has(c.itemId)) {
      items.push({ itemId: c.itemId, name: packMap.get(c.itemId) || c.fallbackName, qty: c.qty });
    } else if (packMap.has(c.fallbackId)) {
      items.push({ itemId: c.fallbackId, name: packMap.get(c.fallbackId) || c.fallbackName, qty: c.qty });
    }
  }
  return { gold: 500, items };
}

/** 公会荣誉与稀有锻造徽记兑换（专属边框 / 锻造徽记礼匣 / 讨伐战备包） */
export function redeemGuildHonorItem(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack | undefined,
  itemId: string,
  now: Date = new Date()
): {
  ok: boolean;
  reason?: string;
  itemId?: string;
  honorSpent?: number;
  emblemsSpent?: number;
  unlockedFrame?: string;
  restoredReroll?: boolean;
  goldGained?: number;
  itemsGranted?: Array<{ itemId: string; name: string; qty: number }>;
} {
  ensurePlayerExtensions(player);
  const state = ensureBounties(player, now);
  const gh = ensureGuildHonor(player);
  const def = GUILD_HONOR_SHOP.find((it) => it.id === itemId);
  if (!def) return { ok: false, reason: "兑换项不存在" };

  if (def.category === "frame" && gh.unlockedFrames.includes(def.id)) {
    return { ok: false, reason: "该专属边框已永久解锁，可直接佩戴" };
  }

  const today = todayUTC(now);
  if (!gh.dailyPurchases || gh.dailyPurchases.date !== today) {
    gh.dailyPurchases = { date: today, counts: {} };
  }
  const boughtToday = Number(gh.dailyPurchases.counts[def.id] || 0);
  if (typeof def.dailyLimit === "number" && boughtToday >= def.dailyLimit) {
    return { ok: false, reason: `今日兑换已达上限（${def.dailyLimit}/${def.dailyLimit}）` };
  }

  if (gh.honorPoints < def.honorCost) {
    return { ok: false, reason: `公会荣誉积分不足（需要 ${def.honorCost}，当前 ${gh.honorPoints}）` };
  }
  if (gh.forgingEmblems < def.emblemCost) {
    return { ok: false, reason: `稀有锻造徽记不足（需要 ${def.emblemCost}，当前 ${gh.forgingEmblems}）` };
  }

  gh.honorPoints -= def.honorCost;
  gh.forgingEmblems -= def.emblemCost;
  if (typeof def.dailyLimit === "number") {
    gh.dailyPurchases.counts[def.id] = boughtToday + 1;
  }

  if (def.category === "frame") {
    gh.unlockedFrames.push(def.id);
    gh.equippedFrame = def.id;
    appendLog(player, `解锁并佩戴公会专属边框「${def.frameLabel || def.name}」！`);
    return {
      ok: true,
      itemId: def.id,
      honorSpent: def.honorCost,
      emblemsSpent: def.emblemCost,
      unlockedFrame: def.id,
    };
  }

  if (def.id === "supply_forging_emblem_pack") {
    const bundle = resolveForgingEmblemPackRewards(player, contentPack);
    player.inventory.gold = (player.inventory.gold || 0) + bundle.gold;
    player.stats!.totalGoldEarned += bundle.gold;
    for (const it of bundle.items) {
      player.inventory[it.itemId] = (player.inventory[it.itemId] || 0) + it.qty;
    }
    syncAchievements(player);
    appendLog(
      player,
      `兑换「${def.name}」：获得 ${bundle.items.map((x) => `${x.name} ×${x.qty}`).join("、")} 及金币 ${bundle.gold}`
    );
    return {
      ok: true,
      itemId: def.id,
      honorSpent: def.honorCost,
      emblemsSpent: def.emblemCost,
      goldGained: bundle.gold,
      itemsGranted: bundle.items,
    };
  }

  const ration = resolveBountyRationRewards(contentPack);
  player.inventory.gold = (player.inventory.gold || 0) + ration.gold;
  player.stats!.totalGoldEarned += ration.gold;
  for (const it of ration.items) {
    player.inventory[it.itemId] = (player.inventory[it.itemId] || 0) + it.qty;
  }
  const restoredReroll = state.rerollsUsed > 0;
  if (restoredReroll) {
    state.rerollsUsed = Math.max(0, state.rerollsUsed - 1);
  }
  syncAchievements(player);
  appendLog(
    player,
    `兑换「${def.name}」：获得金币 ${ration.gold}${ration.items.length ? `、${ration.items.map((x) => `${x.name} ×${x.qty}`).join("、")}` : ""}${restoredReroll ? "，并恢复 1 次委托刷新额度" : ""}`
  );
  return {
    ok: true,
    itemId: def.id,
    honorSpent: def.honorCost,
    emblemsSpent: def.emblemCost,
    restoredReroll,
    goldGained: ration.gold,
    itemsGranted: ration.items,
  };
}

/** 佩戴或卸下公会专属头像边框（null 表示卸下） */
export function equipGuildFrame(
  player: EnhancedPlayerState,
  frameId: string | null
): { ok: boolean; reason?: string; equippedFrame: string | null } {
  const gh = ensureGuildHonor(player);
  if (frameId === null || frameId === "") {
    gh.equippedFrame = null;
    return { ok: true, equippedFrame: null };
  }
  const def = GUILD_HONOR_SHOP.find((it) => it.id === frameId && it.category === "frame");
  if (!def || !gh.unlockedFrames.includes(frameId)) {
    return { ok: false, reason: "尚未解锁该专属公会边框", equippedFrame: gh.equippedFrame };
  }
  gh.equippedFrame = frameId;
  appendLog(player, `已佩戴公会专属边框「${def.frameLabel || def.name}」`);
  return { ok: true, equippedFrame: frameId };
}

export function getGuildHonorInfo(player: EnhancedPlayerState, now: Date = new Date()) {
  const gh = ensureGuildHonor(player);
  const today = todayUTC(now);
  const dailyCounts = gh.dailyPurchases?.date === today ? gh.dailyPurchases.counts || {} : {};
  const equippedDef = gh.equippedFrame
    ? GUILD_HONOR_SHOP.find((it) => it.id === gh.equippedFrame && it.category === "frame")
    : undefined;

  return {
    honorPoints: gh.honorPoints,
    totalHonorEarned: gh.totalHonorEarned,
    forgingEmblems: gh.forgingEmblems,
    totalChainsCompleted: gh.totalChainsCompleted,
    fullClears: gh.fullClears,
    unlockedFrames: gh.unlockedFrames,
    equippedFrame: equippedDef
      ? {
          id: equippedDef.id,
          frameLabel: equippedDef.frameLabel || equippedDef.name,
          frameTheme: equippedDef.frameTheme || "crimson",
          iconKind: equippedDef.iconKind,
          iconId: equippedDef.iconId,
          bonuses: equippedDef.bonuses || {},
        }
      : null,
    shopItems: GUILD_HONOR_SHOP.map((it) => {
      const unlocked = it.category === "frame" && gh.unlockedFrames.includes(it.id);
      const isEquipped = it.category === "frame" && gh.equippedFrame === it.id;
      const boughtToday = Number(dailyCounts[it.id] || 0);
      const limitReached = typeof it.dailyLimit === "number" && boughtToday >= it.dailyLimit;
      const affordable = gh.honorPoints >= it.honorCost && gh.forgingEmblems >= it.emblemCost;
      return {
        ...it,
        unlocked,
        isEquipped,
        boughtToday,
        dailyRemaining: typeof it.dailyLimit === "number" ? Math.max(0, it.dailyLimit - boughtToday) : null,
        canRedeem: !unlocked && !limitReached && affordable,
      };
    }),
  };
}

/** 契约面板完整信息（含每条实时进度、生态词缀状态、连携赏金进度与荣誉边框兑换） */
export function getBountyInfo(player: EnhancedPlayerState, now: Date = new Date()) {
  const state = ensureBounties(player, now);
  const stats = player.stats!;
  const affixMods = getActiveGuildAffixModifiers(player);
  const fullTarget = getFullBoardTargetCount(state);
  const completedToday = state.claimedTodayCount || 0;
  const comboClaimed = state.comboClaimed || [];

  return {
    date: state.date,
    seedKey: state.seedKey || buildDailyBountySeedKey(state.date, state.rerollsUsed),
    rerollsUsed: state.rerollsUsed,
    maxRerolls: MAX_DAILY_REROLLS,
    rerollCost: REROLL_COST,
    bounties: state.bounties.map((b) => {
      const progress = bountyProgress(stats, b);
      const completed = progress >= b.target;
      const affix = getAffixDef(b.affixId);
      const isModifierActive = Boolean(b.accepted && !b.claimed && !completed);
      const isLingering = Boolean(b.claimed || state.claimedAffixesToday?.includes(affix.id));
      return {
        ...b,
        progress,
        completed,
        affix: {
          id: affix.id,
          name: affix.name,
          enName: affix.enName,
          iconKind: affix.iconKind,
          iconId: affix.iconId,
          tone: affix.tone,
          ecologicalSummary: affix.ecologicalSummary,
          activeEffectText: affix.activeEffectText,
          lingeringEffectText: affix.lingeringEffectText,
          status: isModifierActive ? "active" : isLingering ? "lingering" : "standby",
        },
      };
    }),
    activeAffixSummary: affixMods,
    combo: {
      completedToday,
      fullBoardTarget: fullTarget,
      milestones: GUILD_COMBO_MILESTONES.map((m) => {
        const requiredCount = m.id === "chain_full" ? fullTarget : m.requiredCount;
        const claimed = comboClaimed.includes(m.id);
        const progress = Math.min(requiredCount, completedToday);
        return {
          ...m,
          requiredCount,
          progress,
          claimed,
          claimable: !claimed && completedToday >= requiredCount,
        };
      }),
    },
    guildHonor: getGuildHonorInfo(player, now),
  };
}
