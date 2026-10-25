// 进阶进度系统：声望（Reputation）+ 赏金契约（Bounty）+ 转生（Prestige）
// 与 progression.ts（成就/每日任务）并列，集中定义静态数据与纯逻辑函数。
//
// 设计原则：
// - 纯函数风格，直接在传入的 player 上原地修改并返回结果信息；不读写存储。
// - 三大系统共同构成中后期长线目标：
//   声望 = 长期累计的永久被动成长；赏金 = 每日可重复的金币/声望来源；转生 = 终局重置循环。

import type {
  EnhancedPlayerState,
  ReputationTierDef,
  ReputationState,
  Bounty,
  BountyState,
  PrestigeState,
  PlayerStats
} from "./types";
import { ensurePlayerExtensions, appendLog } from "./storage";
import { defaultCombatSkills } from "./combat_skills";
import { syncAchievements } from "./progression";
import { todayLocal } from "./time";

/* ============================ 声望系统 ============================ */

// 声望等级：每达到一层，其 bonuses 永久叠加（百分比点数）。
// 设计为前期增长快、后期边际递减，鼓励长期挂机但不至于失衡。
export const REPUTATION_TIERS: ReputationTierDef[] = [
  { tier: 1, name: "无名之辈", icon: "🌱", required: 0, bonuses: {} },
  { tier: 2, name: "初露锋芒", icon: "🌿", required: 100, bonuses: { gatherSpeed: 3, xpGain: 2 } },
  { tier: 3, name: "小有名气", icon: "🍀", required: 300, bonuses: { craftSpeed: 3, goldGain: 3 } },
  { tier: 4, name: "声名鹊起", icon: "⭐", required: 700, bonuses: { combatSpeed: 4, xpGain: 3 } },
  { tier: 5, name: "远近闻名", icon: "🌟", required: 1500, bonuses: { gatherSpeed: 5, craftSpeed: 5 } },
  { tier: 6, name: "威震一方", icon: "🏅", required: 3000, bonuses: { goldGain: 6, combatSpeed: 5 } },
  { tier: 7, name: "名动天下", icon: "🎖️", required: 6000, bonuses: { xpGain: 6, gatherSpeed: 6 } },
  { tier: 8, name: "传奇人物", icon: "👑", required: 12000, bonuses: { craftSpeed: 8, goldGain: 8 } },
  { tier: 9, name: "万古流芳", icon: "🔱", required: 24000, bonuses: { combatSpeed: 8, xpGain: 8 } },
  { tier: 10, name: "不朽传说", icon: "🌌", required: 50000, bonuses: { gatherSpeed: 10, craftSpeed: 10, combatSpeed: 10, xpGain: 10, goldGain: 10 } }
];

/** 确保 reputation 字段存在 */
function ensureReputation(player: EnhancedPlayerState): ReputationState {
  if (!player.reputation) player.reputation = { total: 0, spent: 0 };
  return player.reputation;
}

/** 根据累计声望计算当前等级定义 */
export function getReputationTier(total: number): ReputationTierDef {
  let current = REPUTATION_TIERS[0];
  for (const t of REPUTATION_TIERS) {
    if (total >= t.required) current = t;
    else break;
  }
  return current;
}

/** 下一等级（已满级返回 undefined） */
export function getNextReputationTier(total: number): ReputationTierDef | undefined {
  return REPUTATION_TIERS.find((t) => t.required > total);
}

/**
 * 汇总当前声望等级提供的永久被动加成（累积所有已达成层级的 bonuses）。
 * 返回乘数（如 1.1），由 simulateToNow 接入采集/制作/战斗/经验/金币。
 */
export function getReputationBonuses(
  player: EnhancedPlayerState
): { gatherSpeed: number; craftSpeed: number; combatSpeed: number; xpGain: number; goldGain: number } {
  const pct: Record<string, number> = { gatherSpeed: 0, craftSpeed: 0, combatSpeed: 0, xpGain: 0, goldGain: 0 };
  const total = player.reputation?.total || 0;
  for (const t of REPUTATION_TIERS) {
    if (total >= t.required) {
      for (const k of Object.keys(pct)) {
        const v = (t.bonuses as any)[k];
        if (typeof v === "number") pct[k] += v;
      }
    }
  }
  return {
    gatherSpeed: 1 + pct.gatherSpeed / 100,
    craftSpeed: 1 + pct.craftSpeed / 100,
    combatSpeed: 1 + pct.combatSpeed / 100,
    xpGain: 1 + pct.xpGain / 100,
    goldGain: 1 + pct.goldGain / 100
  };
}

/** 增加声望（赏金/成就等来源调用），返回是否升级 + 新等级 */
export function addReputation(
  player: EnhancedPlayerState,
  amount: number
): { gained: number; total: number; leveledUp: boolean; tier: ReputationTierDef } {
  const rep = ensureReputation(player);
  const before = getReputationTier(rep.total).tier;
  rep.total += Math.max(0, Math.round(amount));
  const tier = getReputationTier(rep.total);
  const leveledUp = tier.tier > before;
  if (leveledUp) {
    appendLog(player, `声望等级提升至「${tier.name}」（${tier.icon}），永久被动加成已增强！`);
  }
  return { gained: amount, total: rep.total, leveledUp, tier };
}

/** 声望面板信息 */
export function getReputationInfo(player: EnhancedPlayerState) {
  const rep = ensureReputation(player);
  const tier = getReputationTier(rep.total);
  const next = getNextReputationTier(rep.total);
  const bonuses = getReputationBonuses(player);
  return {
    total: rep.total,
    spent: rep.spent,
    currentTier: tier,
    nextTier: next,
    progressToNext: next ? Math.max(0, next.required - rep.total) : 0,
    activeBonuses: {
      gatherSpeed: Math.round((bonuses.gatherSpeed - 1) * 100),
      craftSpeed: Math.round((bonuses.craftSpeed - 1) * 100),
      combatSpeed: Math.round((bonuses.combatSpeed - 1) * 100),
      xpGain: Math.round((bonuses.xpGain - 1) * 100),
      goldGain: Math.round((bonuses.goldGain - 1) * 100)
    },
    tiers: REPUTATION_TIERS
  };
}

/* ============================ 赏金契约系统 ============================ */

type BountyTemplate = {
  id: string;
  name: string;
  description: string;
  icon: string;
  metric: "gather" | "craft" | "kill";
  target: number;
  baseGold: number;
  baseRep: number;
};

// 契约模板池：覆盖采集/制作/击杀三类，目标数量与奖励分档。
export const BOUNTY_TEMPLATES: BountyTemplate[] = [
  { id: "bt_gather_50", name: "物资征集", description: "采集 50 份资源", icon: "🌿", metric: "gather", target: 50, baseGold: 400, baseRep: 20 },
  { id: "bt_gather_120", name: "大批征集", description: "采集 120 份资源", icon: "🌾", metric: "gather", target: 120, baseGold: 900, baseRep: 45 },
  { id: "bt_gather_250", name: "囤积如山", description: "采集 250 份资源", icon: "🏔️", metric: "gather", target: 250, baseGold: 1800, baseRep: 90 },
  { id: "bt_craft_25", name: "工坊订单", description: "制作 25 件物品", icon: "🔨", metric: "craft", target: 25, baseGold: 450, baseRep: 22 },
  { id: "bt_craft_60", name: "量产订单", description: "制作 60 件物品", icon: "⚙️", metric: "craft", target: 60, baseGold: 1000, baseRep: 50 },
  { id: "bt_craft_120", name: "宗师订单", description: "制作 120 件物品", icon: "🏭", metric: "craft", target: 120, baseGold: 2000, baseRep: 100 },
  { id: "bt_kill_30", name: "讨伐委托", description: "击杀 30 只怪物", icon: "⚔️", metric: "kill", target: 30, baseGold: 500, baseRep: 25 },
  { id: "bt_kill_80", name: "清剿委托", description: "击杀 80 只怪物", icon: "🗡️", metric: "kill", target: 80, baseGold: 1100, baseRep: 55 },
  { id: "bt_kill_160", name: "无双讨伐", description: "击杀 160 只怪物", icon: "💥", metric: "kill", target: 160, baseGold: 2200, baseRep: 110 }
];

const RARITY_ROLL: Array<{ rarity: Bounty["rarity"]; weight: number; mult: number }> = [
  { rarity: "common", weight: 60, mult: 1.0 },
  { rarity: "rare", weight: 30, mult: 1.6 },
  { rarity: "epic", weight: 10, mult: 2.5 }
];

const MAX_DAILY_REROLLS = 3;
const BOUNTY_SLOTS = 5;
const REROLL_COST = 500; // 每次刷新消耗金币

function todayUTC(): string {
  return todayLocal();
}

function rollRarity(): { rarity: Bounty["rarity"]; mult: number } {
  const totalW = RARITY_ROLL.reduce((s, r) => s + r.weight, 0);
  let r = Math.random() * totalW;
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

/** 生成一整板契约：模板无放回抽取，同板不会出现两条相同契约 */
function genBountyBoard(stats: PlayerStats, count: number): Bounty[] {
  const pool = [...BOUNTY_TEMPLATES];
  const out: Bounty[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(genBountyFrom(pool.splice(idx, 1)[0], stats));
  }
  // 槽位多于模板时允许重复补齐（当前 5 槽 < 9 模板，不会触发）
  while (out.length < count) out.push(genBountyFrom(BOUNTY_TEMPLATES[Math.floor(Math.random() * BOUNTY_TEMPLATES.length)], stats));
  return out;
}

/** 生成一条随机契约（baseline 取当前 stats） */
function genBountyFrom(tpl: BountyTemplate, stats: PlayerStats): Bounty {
  const { rarity, mult } = rollRarity();
  const statKey = metricToStat(tpl.metric);
  return {
    id: `${tpl.id}_${Math.random().toString(36).slice(2, 8)}`,
    templateId: tpl.id,
    name: tpl.name,
    description: tpl.description,
    icon: tpl.icon,
    metric: tpl.metric,
    target: tpl.target,
    baseline: (stats[statKey] as number) || 0,
    accepted: false,
    claimed: false,
    rarity,
    reward: { gold: Math.round(tpl.baseGold * mult), reputation: Math.round(tpl.baseRep * mult) }
  };
}

/** 确保当日契约板存在；跨日则刷新（重置刷新次数） */
export function ensureBounties(player: EnhancedPlayerState): BountyState {
  ensurePlayerExtensions(player);
  const stats = player.stats!;
  const today = todayUTC();
  const known = new Set(BOUNTY_TEMPLATES.map(t => t.id));
  const stale = (board: Bounty[] | undefined) =>
    !board || board.length === 0 ||
    new Set(board.map(b => b.templateId)).size !== board.length ||
    board.some(b => !known.has(b.templateId));
  if (!player.bounties || player.bounties.date !== today || stale(player.bounties.bounties)) {
    player.bounties = {
      date: today,
      bounties: genBountyBoard(stats, BOUNTY_SLOTS),
      rerollsUsed: player.bounties && player.bounties.date === today ? player.bounties.rerollsUsed : 0
    };
  }
  return player.bounties;
}

/** 某契约当前进度（0..target） */
export function bountyProgress(stats: PlayerStats, b: Bounty): number {
  const cur = (stats[metricToStat(b.metric)] as number) || 0;
  return Math.max(0, Math.min(b.target, cur - b.baseline));
}

/** 接取契约：把 baseline 重置为当前值，从接取时刻开始计数 */
export function acceptBounty(
  player: EnhancedPlayerState,
  bountyId: string
): { ok: boolean; reason?: string } {
  ensureBounties(player);
  const stats = player.stats!;
  const b = player.bounties!.bounties.find((x) => x.id === bountyId);
  if (!b) return { ok: false, reason: "契约不存在" };
  if (b.accepted) return { ok: false, reason: "契约已接取" };
  b.accepted = true;
  b.baseline = (stats[metricToStat(b.metric)] as number) || 0;
  appendLog(player, `接取赏金契约「${b.name}」`);
  return { ok: true };
}

/** 领取契约奖励（需已接取且完成） */
export function claimBounty(
  player: EnhancedPlayerState,
  bountyId: string
): { ok: boolean; reason?: string; gold?: number; reputation?: number; items?: Record<string, number> } {
  ensureBounties(player);
  const stats = player.stats!;
  const b = player.bounties!.bounties.find((x) => x.id === bountyId);
  if (!b) return { ok: false, reason: "契约不存在" };
  if (!b.accepted) return { ok: false, reason: "请先接取该契约" };
  if (b.claimed) return { ok: false, reason: "奖励已领取" };
  if (bountyProgress(stats, b) < b.target) return { ok: false, reason: "契约尚未完成" };

  b.claimed = true;
  const gold = b.reward.gold || 0;
  player.inventory.gold = (player.inventory.gold || 0) + gold;
  stats.totalGoldEarned += gold;
  const rep = b.reward.reputation || 0;
  addReputation(player, rep);
  if (b.reward.items) {
    for (const [id, qty] of Object.entries(b.reward.items)) {
      player.inventory[id] = (player.inventory[id] || 0) + qty;
    }
  }
  appendLog(player, `完成契约「${b.name}」：获得金币 ${gold}、声望 ${rep}`);
  return { ok: true, gold, reputation: rep, items: b.reward.items };
}

/** 刷新整个契约板（消耗金币，每日有次数上限） */
export function rerollBounties(
  player: EnhancedPlayerState
): { ok: boolean; reason?: string; cost?: number; rerollsLeft?: number } {
  const state = ensureBounties(player);
  if (state.rerollsUsed >= MAX_DAILY_REROLLS) {
    return { ok: false, reason: "今日刷新次数已用完" };
  }
  const gold = player.inventory.gold || 0;
  if (gold < REROLL_COST) return { ok: false, reason: "金币不足" };
  // 已接取的契约必须活着走完：整板重生成会把进行中进度静默清掉。
  const accepted = state.bounties.filter((b) => b.accepted);
  const acceptedTpls = new Set(accepted.map((b) => b.templateId));
  const freshPool = BOUNTY_TEMPLATES.filter((t) => !acceptedTpls.has(t.id));
  const fresh: Bounty[] = [];
  const pool = [...freshPool];
  while (fresh.length + accepted.length < BOUNTY_SLOTS && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    fresh.push(genBountyFrom(pool.splice(idx, 1)[0], player.stats!));
  }
  player.inventory.gold = gold - REROLL_COST;
  player.stats!.totalGoldSpent += REROLL_COST;
  state.rerollsUsed += 1;
  state.bounties = [...accepted, ...fresh];
  syncAchievements(player);
  appendLog(player, `刷新了赏金契约板（消耗金币 ${REROLL_COST}）`);
  return { ok: true, cost: REROLL_COST, rerollsLeft: MAX_DAILY_REROLLS - state.rerollsUsed };
}

/** 契约面板信息（含每条实时进度） */
export function getBountyInfo(player: EnhancedPlayerState) {
  const state = ensureBounties(player);
  const stats = player.stats!;
  return {
    date: state.date,
    rerollsUsed: state.rerollsUsed,
    maxRerolls: MAX_DAILY_REROLLS,
    rerollCost: REROLL_COST,
    bounties: state.bounties.map((b) => ({
      ...b,
      progress: bountyProgress(stats, b),
      completed: bountyProgress(stats, b) >= b.target
    }))
  };
}

/* ============================ 转生系统 ============================ */

// 转生解锁所需的最低战斗等级。每次转生根据当前进度授予转生点，
// 每点提供永久全局 +2% 的全收益倍率，并重置职业/战斗等级、技能经验与背包（保留声望与转生收益）。
const PRESTIGE_MIN_COMBAT_LEVEL = 50;
const PRESTIGE_BONUS_PER_POINT = 0.02; // 每点转生 +2% 全局收益

function ensurePrestige(player: EnhancedPlayerState): PrestigeState {
  if (!player.prestige) player.prestige = { count: 0, points: 0 };
  return player.prestige;
}

/** 转生全局倍率（>=1） */
export function getPrestigeMultiplier(player: EnhancedPlayerState): number {
  const p = player.prestige?.points || 0;
  return 1 + p * PRESTIGE_BONUS_PER_POINT;
}

/** 根据当前进度估算本次转生可获得的转生点 */
export function estimatePrestigePoints(player: EnhancedPlayerState): number {
  const lvl = player.combatLevel || 1;
  // 综合战斗等级与各职业等级之和，做平方根压缩，避免线性膨胀
  let skillSum = 0;
  for (const s of Object.values(player.skills || {})) skillSum += (s.level || 1);
  const raw = lvl + skillSum / 3;
  return Math.max(0, Math.floor(Math.sqrt(raw) * 2 - 8));
}

/** 转生面板信息 */
export function getPrestigeInfo(player: EnhancedPlayerState) {
  ensurePrestige(player);
  const canPrestige = (player.combatLevel || 1) >= PRESTIGE_MIN_COMBAT_LEVEL;
  return {
    count: player.prestige!.count,
    points: player.prestige!.points,
    multiplier: getPrestigeMultiplier(player),
    multiplierPercent: Math.round((getPrestigeMultiplier(player) - 1) * 100),
    minCombatLevel: PRESTIGE_MIN_COMBAT_LEVEL,
    currentCombatLevel: player.combatLevel || 1,
    canPrestige,
    pointsOnPrestige: canPrestige ? estimatePrestigePoints(player) : 0,
    bonusPerPoint: Math.round(PRESTIGE_BONUS_PER_POINT * 100)
  };
}

/**
 * 执行转生：
 * - 校验最低战斗等级
 * - 授予转生点
 * - 重置：战斗等级/经验、各职业等级/经验、背包（保留少量启动金币）、装备穿戴、活动状态
 * - 保留：声望、成就、转生点、统计（生涯累计）
 */
export function doPrestige(
  player: EnhancedPlayerState
): { ok: boolean; reason?: string; gainedPoints?: number; totalPoints?: number; multiplier?: number } {
  ensurePrestige(player);
  if ((player.combatLevel || 1) < PRESTIGE_MIN_COMBAT_LEVEL) {
    return { ok: false, reason: `战斗等级需达到 ${PRESTIGE_MIN_COMBAT_LEVEL} 级才能转生` };
  }
  const gained = estimatePrestigePoints(player);
  if (gained <= 0) return { ok: false, reason: "当前进度不足以获得转生点" };

  player.prestige!.count += 1;
  player.prestige!.points += gained;
  player.prestige!.lastPrestigeAt = new Date().toISOString();

  // 重置进度（含派生 combatLevel 的战斗技能，否则下次 ensureCombatSkills 会把等级推导回来，
  // 转生等于没有重置并可被无限重复刷取转生点）
  player.combatLevel = 1;
  player.combatXp = 0;
  player.combatSkills = defaultCombatSkills(1);
  for (const k of Object.keys(player.skills || {})) {
    player.skills[k].level = 1;
    player.skills[k].xp = 0;
    player.skills[k].unlockedRecipes = [];
    player.skills[k].enhancementLevel = 0;
  }
  if (player.tasksState) {
    player.tasksState.tasks = [];
    player.tasksState.nextTaskAt = new Date().toISOString();
  }
  // 背包重置（保留启动金币），装备卸下；进行中的战斗/刷关/强化计时/队列等暂态一并清掉，
  // 否则旧世界的 hpCombat 会带着满管血跨转生延续
  player.inventory = { gold: 100 };
  player.equipment = { enhancementLevels: {}, durability: {}, maxDurability: {} };
  player.activeBuffs = [];
  player.mode = "idle";
  player.lifeActionState = undefined;
  player.combatFarmState = undefined;
  player.hpCombat = undefined;
  player.combatHp = undefined;
  player.combatHpAt = undefined;
  player.enhanceRun = undefined;
  player.activityQueue = [];
  player.combatLoadout = undefined;

  const mult = getPrestigeMultiplier(player);
  appendLog(
    player,
    `转生成功！这是第 ${player.prestige!.count} 次转生，获得 ${gained} 转生点，全局收益永久 +${Math.round((mult - 1) * 100)}%`
  );
  return { ok: true, gainedPoints: gained, totalPoints: player.prestige!.points, multiplier: mult };
}
