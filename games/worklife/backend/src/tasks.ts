import { randomUUID } from "crypto";
import type { EnhancedContentPack, EnhancedPlayerState, Task, TaskState } from "./types";
import { appendLog, ensurePlayerExtensions } from "./storage";
import { syncAchievements } from "./progression";
import { todayLocal } from "./time";
import { isMonsterInOpenZone } from "./zones";

const newTaskId = () => `task_${randomUUID().slice(0, 8)}`;

/**
 * MWI 任务板 (Tasks).
 *
 * A task is handed out every cooldown (8h → 4h with upgrades) into up to 8 slots. Tasks name a
 * specific action ("砍伐小白杨 ×120") or monster ("击败果冻史莱姆 ×30"), lean toward the player's
 * higher skills, and pay gold + task tokens. Tokens buy cooldown upgrades, block slots for skills
 * the player never wants tasks in, and loot crates; every 50 task points opens a gift.
 */
export const TASK_SLOTS = 8;
export const BASE_COOLDOWN_MS = 8 * 3600_000;
export const COOLDOWN_STEP_MS = 30 * 60_000;
export const MAX_COOLDOWN_LEVEL = 8; // 8h − 8 × 30min = 4h
export const GIFT_POINTS = 50;
export const REROLL_BASE_GOLD = 200;
export const REROLL_MAX_GOLD = 6400;
/** How much play a task should represent: 20–45 minutes of the action. */
const TARGET_MINUTES_MIN = 20;
const TARGET_MINUTES_MAX = 45;

export type TaskShopItem = {
  id: string;
  name: string;
  blurb: string;
  cost: (state: TaskState) => number;
  soldOut: (state: TaskState) => boolean;
};

export const TASK_SHOP: TaskShopItem[] = [
  {
    id: "cooldown",
    name: "任务冷却 −30 分钟",
    blurb: "下一个任务来得更快（最低 4 小时）",
    cost: (s) => 20 + s.cooldownLevel * 10,
    soldOut: (s) => s.cooldownLevel >= MAX_COOLDOWN_LEVEL,
  },
  {
    id: "block_slot",
    name: "屏蔽槽位 +1",
    blurb: "屏蔽一个技能，不再收到它的任务",
    cost: (s) => 30 + s.blockSlots * 20,
    soldOut: (s) => s.blockSlots >= 6,
  },
  {
    id: "crate",
    name: "大宝箱",
    blurb: "金币 800–1500 与几份消耗品",
    cost: () => 15,
    soldOut: () => false,
  },
  // MWI charms: bought once, worn in an accessory slot, they focus the 70% combat-XP share.
  ...(["stamina", "intelligence", "attack", "defense"] as const).map((skill) => ({
    id: `charm_${skill}`,
    name: `训练护符·${{ stamina: "耐力", intelligence: "智力", attack: "攻击", defense: "防御" }[skill]}`,
    blurb: "佩戴在饰品槽：击杀的 70% 经验全给这条技能",
    cost: () => 25,
    soldOut: () => false,
  })),
];

/** Shop items the player may own at most once (charms). */
const ONE_PER_PLAYER = new Set(["charm_stamina", "charm_intelligence", "charm_attack", "charm_defense"]);

export function ownsShopItem(player: EnhancedPlayerState, itemId: string): boolean {
  if ((player.inventory[itemId] || 0) > 0) return true;
  const eq = player.equipment as Record<string, unknown> | undefined;
  return !!eq && Object.entries(eq).some(([slot, v]) => slot.startsWith("accessory") && v === itemId);
}

export function cooldownMs(state: TaskState): number {
  return Math.max(4 * 3600_000, BASE_COOLDOWN_MS - state.cooldownLevel * COOLDOWN_STEP_MS);
}

export function rerollCost(state: TaskState, day: string): number {
  const n = state.rerollDay === day ? state.rerollsToday : 0;
  return Math.min(REROLL_MAX_GOLD, REROLL_BASE_GOLD * 2 ** n);
}

function dayKey(now: Date): string {
  // 与其他每日系统（签到/赏金）一致按东八区切日，而不是 UTC
  return todayLocal(now);
}

type PackAction = {
  id: string;
  name?: string;
  skillId?: string;
  duration?: number;
  xp?: number;
  requirements?: { skillLevel?: number };
  consumes?: Array<{ itemId: string; qty: number }>;
  yields?: Array<{ itemId: string; qty: number }>;
};

type PackMonster = { id: string; name?: string; level?: number; xp?: number; gold?: number; isBoss?: boolean };

const SKILL_NAMES: Record<string, string> = {
  // 采集侧（skill_<profession>）
  skill_woodcutter: "伐木",
  skill_blacksmith: "挖矿",
  skill_farmer: "种植",
  skill_chef: "钓鱼",
  skill_tailor: "采集",
  skill_alchemist: "采晶",
  // 生产侧（skill_<动作名>）
  skill_woodworking: "木工",
  skill_smithing: "锻造",
  skill_husbandry: "畜牧",
  skill_cooking: "烹饪",
  skill_tailoring: "缝纫",
  skill_alchemy: "炼金",
  skill_combat: "战斗",
};

export function skillDisplayName(skillId: string): string {
  return SKILL_NAMES[skillId] || skillId;
}

function roundTo(n: number, step: number): number {
  return Math.max(step, Math.round(n / step) * step);
}

/** Actions the player can start right now in a skill (level met, not combat). */
function eligibleActions(pack: EnhancedContentPack, player: EnhancedPlayerState, skillId: string): PackAction[] {
  const level = player.skills?.[skillId]?.level || 1;
  return (pack.actions as PackAction[]).filter(
    (a) =>
      a.skillId === skillId &&
      !a.id.startsWith("act_combat_") &&
      Number(a.duration) > 0 &&
      (a.requirements?.skillLevel || 1) <= level
  );
}

/** Monsters worth tasking: the player has beaten them, or the starter slime, in an open zone and within combat level. */
function eligibleMonsters(pack: EnhancedContentPack, player: EnhancedPlayerState): PackMonster[] {
  const kills = player.stats?.killsByMonster || {};
  const combatLevel = player.combatLevel || 1;
  const actions = (pack.actions || []) as PackAction[];
  const list = (pack.monsters as PackMonster[]).filter((m) => {
    if (m.isBoss) return false;
    if (!isMonsterInOpenZone(pack, m.id)) return false;
    const reqLvl = Number(actions.find((a) => a.id === `act_combat_${m.id}`)?.requirements?.skillLevel || 1);
    if (combatLevel < reqLvl) return false;
    return (kills[m.id] || 0) > 0 || m.id === "slime";
  });
  return list.length ? list : (pack.monsters as PackMonster[]).filter((m) => m.id === "slime");
}

/**
 * Pick a skill weighted by level (MWI: tasks lean toward the skills you actually play), skipping
 * blocked skills. Combat counts as a skill with the derived combat level.
 */
function pickSkill(player: EnhancedPlayerState, blocked: Set<string>, rng: () => number): string | undefined {
  const entries: Array<[string, number]> = Object.entries(player.skills || {})
    // Only skills with task generators belong here. `skill_enhancing` has its own attempt metric,
    // not a pack action, and is intentionally omitted until enhancement-specific tasks exist.
    .filter(([id]) => !blocked.has(id) && !!SKILL_NAMES[id])
    .map(([id, s]) => [id, Math.max(1, s.level || 1)]);
  if (!blocked.has("skill_combat")) entries.push(["skill_combat", Math.max(1, player.combatLevel || 1)]);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  if (!total) return undefined;
  let r = rng() * total;
  for (const [id, w] of entries) {
    if (r < w) return id;
    r -= w;
  }
  return entries[entries.length - 1]?.[0];
}

export function generateTask(
  player: EnhancedPlayerState,
  pack: EnhancedContentPack,
  now: Date,
  rng: () => number = Math.random,
  avoidKey?: string
): Task | undefined {
  const state = player.tasksState!;
  const blocked = new Set(state.blockedSkills);
  const existingKeys = new Set(
    (state.tasks || []).map((t) => (t.kind === "kill" ? `kill:${t.monsterId}` : `act:${t.actionId}`))
  );
  if (avoidKey) existingKeys.add(avoidKey);
  const stats = player.stats!;
  for (let attempt = 0; attempt < 6; attempt++) {
    const skillId = pickSkill(player, blocked, rng);
    if (!skillId) return undefined;
    const minutes = TARGET_MINUTES_MIN + rng() * (TARGET_MINUTES_MAX - TARGET_MINUTES_MIN);
    if (skillId === "skill_combat") {
      const fullPool = eligibleMonsters(pack, player);
      const dedupPool = fullPool.filter((m) => !existingKeys.has(`kill:${m.id}`));
      const pool = dedupPool.length > 0 ? dedupPool : fullPool;
      const m = pool[Math.floor(rng() * pool.length)];
      if (!m) continue;
      // ~40s per kill including intermission at T1 → 30–70 kills for a 20–45 minute task
      const target = roundTo((minutes * 60) / 40, 5);
      const tokens = target >= 60 ? 3 : target >= 40 ? 2 : 1;
      return {
        id: newTaskId(),
        kind: "kill",
        monsterId: m.id,
        skillId,
        name: `击败${m.name || m.id} ×${target}`,
        target,
        baseline: stats.killsByMonster?.[m.id] || 0,
        reward: { gold: Math.round(target * (Number(m.gold || 5) * 0.6 + 4)), tokens },
        assignedAt: now.toISOString(),
      };
    }
    const fullPool = eligibleActions(pack, player, skillId);
    if (!fullPool.length) continue;
    const dedupPool = fullPool.filter((a) => !existingKeys.has(`act:${a.id}`));
    const pool = dedupPool.length > 0 ? dedupPool : fullPool;
    const a = pool[Math.floor(rng() * pool.length)];
    const durationSec = Math.max(1, Number(a.duration) / 1000);
    const target = roundTo((minutes * 60) / durationSec, durationSec >= 20 ? 5 : 10);
    const tokens = minutes >= 38 ? 3 : minutes >= 28 ? 2 : 1;
    return {
      id: newTaskId(),
      kind: "action",
      actionId: a.id,
      skillId,
      name: `${a.name || a.id} ×${target}`,
      target,
      baseline: stats.actionsById?.[a.id] || 0,
      // ~2–3× the gold/minute of T1 combat: tasks are a bonus on top of what the action itself yields.
      reward: { gold: Math.round(target * (Number(a.xp || 5) * 0.25 + 1)), tokens },
      assignedAt: now.toISOString(),
    };
  }
  return undefined;
}

export function defaultTaskState(now: Date): TaskState {
  return {
    tasks: [],
    nextTaskAt: now.toISOString(),
    tokens: 0,
    points: 0,
    giftsClaimed: 0,
    cooldownLevel: 0,
    blockSlots: 0,
    blockedSkills: [],
    rerollsToday: 0,
    rerollDay: dayKey(now),
    completed: 0,
  };
}

/**
 * Hand out every task the elapsed cooldowns allow (offline catch-up), up to the free slots.
 * Called from simulateToNow so the board fills while the player is away.
 */
export function ensureTasks(
  player: EnhancedPlayerState,
  pack: EnhancedContentPack,
  now: Date,
  rng: () => number = Math.random
): TaskState {
  ensurePlayerExtensions(player);
  if (!player.tasksState) player.tasksState = defaultTaskState(now);
  const state = player.tasksState;
  let guard = 0;
  while (Date.parse(state.nextTaskAt) <= now.getTime() && guard++ < TASK_SLOTS + 1) {
    if (state.tasks.length >= TASK_SLOTS) {
      // Full board: the timer waits (MWI does not bank tasks past the slot cap).
      state.nextTaskAt = now.toISOString();
      break;
    }
    const at = new Date(Date.parse(state.nextTaskAt));
    const task = generateTask(player, pack, at, rng);
    if (task) state.tasks.push(task);
    state.nextTaskAt = new Date(at.getTime() + cooldownMs(state)).toISOString();
  }
  if (Date.parse(state.nextTaskAt) <= now.getTime()) {
    state.nextTaskAt = state.tasks.length >= TASK_SLOTS
      ? now.toISOString()
      : new Date(now.getTime() + cooldownMs(state)).toISOString();
  }
  return state;
}

export function taskProgress(player: EnhancedPlayerState, t: Task): number {
  const stats = player.stats!;
  const cur = t.kind === "kill" ? stats.killsByMonster?.[t.monsterId || ""] || 0 : stats.actionsById?.[t.actionId || ""] || 0;
  return Math.max(0, Math.min(t.target, cur - t.baseline));
}

export function claimTask(player: EnhancedPlayerState, pack: EnhancedContentPack, taskId: string, now: Date) {
  const state = ensureTasks(player, pack, now);
  const t = state.tasks.find((x) => x.id === taskId);
  if (!t) return { ok: false as const, error: "task_not_found" };
  if (taskProgress(player, t) < t.target) return { ok: false as const, error: "task_incomplete" };
  state.tasks = state.tasks.filter((x) => x.id !== taskId);
  player.inventory.gold = (player.inventory.gold || 0) + t.reward.gold;
  player.stats!.totalGoldEarned += t.reward.gold;
  state.tokens += t.reward.tokens;
  state.points += t.reward.tokens;
  state.completed += 1;
  // A freed slot lets a waiting timer resume immediately.
  if (Date.parse(state.nextTaskAt) < now.getTime()) state.nextTaskAt = now.toISOString();
  syncAchievements(player);
  appendLog(player, `完成任务「${t.name}」：金币 +${t.reward.gold}，任务代币 +${t.reward.tokens}`);
  const giftReady = Math.floor(state.points / GIFT_POINTS) > state.giftsClaimed;
  return { ok: true as const, gold: t.reward.gold, tokens: t.reward.tokens, giftReady };
}

export function deleteTask(player: EnhancedPlayerState, pack: EnhancedContentPack, taskId: string, now: Date) {
  const state = ensureTasks(player, pack, now);
  const before = state.tasks.length;
  state.tasks = state.tasks.filter((x) => x.id !== taskId);
  if (state.tasks.length === before) return { ok: false as const, error: "task_not_found" };
  if (Date.parse(state.nextTaskAt) < now.getTime()) state.nextTaskAt = now.toISOString();
  return { ok: true as const };
}

export function rerollTask(player: EnhancedPlayerState, pack: EnhancedContentPack, taskId: string, now: Date, rng: () => number = Math.random) {
  const state = ensureTasks(player, pack, now);
  const idx = state.tasks.findIndex((x) => x.id === taskId);
  if (idx < 0) return { ok: false as const, error: "task_not_found" };
  const day = dayKey(now);
  const cost = rerollCost(state, day);
  if ((player.inventory.gold || 0) < cost) return { ok: false as const, error: "no_gold", cost };
  const oldTask = state.tasks[idx];
  const avoidKey = oldTask ? (oldTask.kind === "kill" ? `kill:${oldTask.monsterId}` : `act:${oldTask.actionId}`) : undefined;
  const replacement = generateTask(player, pack, now, rng, avoidKey);
  if (!replacement) return { ok: false as const, error: "no_task_available" };
  player.inventory.gold -= cost;
  player.stats!.totalGoldSpent += cost;
  syncAchievements(player);
  if (state.rerollDay !== day) {
    state.rerollDay = day;
    state.rerollsToday = 0;
  }
  state.rerollsToday += 1;
  state.tasks[idx] = replacement;
  appendLog(player, `重选任务（消耗金币 ${cost}）→「${replacement.name}」`);
  return { ok: true as const, cost, task: replacement, nextCost: rerollCost(state, day) };
}

export function setTaskBlock(player: EnhancedPlayerState, pack: EnhancedContentPack, skillId: string, blocked: boolean, now: Date) {
  const state = ensureTasks(player, pack, now);
  if (!SKILL_NAMES[skillId]) return { ok: false as const, error: "unknown_skill" };
  const set = new Set(state.blockedSkills);
  if (blocked) {
    if (set.has(skillId)) return { ok: true as const };
    if (set.size >= state.blockSlots) return { ok: false as const, error: "no_block_slot" };
    set.add(skillId);
  } else {
    set.delete(skillId);
  }
  state.blockedSkills = [...set];
  return { ok: true as const };
}

const CRATE_CONSUMABLES = ["food_simple", "potion_hp_t1", "potion_mp_t1", "drink_basic"];

export function buyTaskShop(player: EnhancedPlayerState, pack: EnhancedContentPack, itemId: string, now: Date, rng: () => number = Math.random) {
  const state = ensureTasks(player, pack, now);
  const item = TASK_SHOP.find((i) => i.id === itemId);
  if (!item) return { ok: false as const, error: "unknown_item" };
  if (item.soldOut(state) || (ONE_PER_PLAYER.has(item.id) && ownsShopItem(player, item.id))) {
    return { ok: false as const, error: "sold_out" };
  }
  const cost = item.cost(state);
  if (state.tokens < cost) return { ok: false as const, error: "no_tokens", cost };
  state.tokens -= cost;
  const gained: Record<string, number> = {};
  if (ONE_PER_PLAYER.has(item.id)) {
    player.inventory[item.id] = (player.inventory[item.id] || 0) + 1;
    gained[item.id] = 1;
    appendLog(player, `任务商店：买下${item.name}`);
  } else if (item.id === "cooldown") {
    state.cooldownLevel += 1;
    // The pending timer shortens too, otherwise the purchase only pays off a cycle later.
    state.nextTaskAt = new Date(Math.min(Date.parse(state.nextTaskAt), now.getTime() + cooldownMs(state))).toISOString();
    appendLog(player, `任务冷却缩短到 ${Math.round(cooldownMs(state) / 3600_000 * 10) / 10} 小时`);
  } else if (item.id === "block_slot") {
    state.blockSlots += 1;
    appendLog(player, `任务屏蔽槽位 +1（现在 ${state.blockSlots} 个）`);
  } else if (item.id === "crate") {
    const gold = 800 + Math.floor(rng() * 701);
    player.inventory.gold = (player.inventory.gold || 0) + gold;
    player.stats!.totalGoldEarned += gold;
    gained.gold = gold;
    const items = (pack.items as Array<{ id: string }>).map((i) => i.id);
    for (let i = 0; i < 3; i++) {
      const pick = CRATE_CONSUMABLES[Math.floor(rng() * CRATE_CONSUMABLES.length)];
      if (!items.includes(pick)) continue;
      player.inventory[pick] = (player.inventory[pick] || 0) + 1;
      gained[pick] = (gained[pick] || 0) + 1;
    }
    appendLog(player, `打开大宝箱：金币 +${gold}`);
    syncAchievements(player);
  }
  return { ok: true as const, cost, gained };
}

export function claimGift(player: EnhancedPlayerState, pack: EnhancedContentPack, now: Date, rng: () => number = Math.random) {
  const state = ensureTasks(player, pack, now);
  if (Math.floor(state.points / GIFT_POINTS) <= state.giftsClaimed) return { ok: false as const, error: "gift_not_ready" };
  state.giftsClaimed += 1;
  const gold = 2000;
  player.inventory.gold = (player.inventory.gold || 0) + gold;
  player.stats!.totalGoldEarned += gold;
  state.tokens += 5;
  const books = ["book_smash", "book_minor_heal", "book_brace"].filter((b) => (pack.items as Array<{ id: string }>).some((i) => i.id === b));
  const book = books[Math.floor(rng() * books.length)];
  if (book) player.inventory[book] = (player.inventory[book] || 0) + 1;
  syncAchievements(player);
  appendLog(player, `打开小紫牛的礼物：金币 +${gold}，任务代币 +5${book ? "，还有一本技能书" : ""}`);
  return { ok: true as const, gold, tokens: 5, book };
}

/** Badge numbers for the nav (derived on read, never stored). */
export function taskSummary(player: EnhancedPlayerState): { total: number; ready: number; giftReady: boolean } {
  const state = player.tasksState;
  const tasks = state?.tasks || [];
  return {
    total: tasks.length,
    ready: tasks.filter((t) => taskProgress(player, t) >= t.target).length,
    giftReady: !!state && Math.floor(state.points / GIFT_POINTS) > state.giftsClaimed,
  };
}

export function taskBoardView(player: EnhancedPlayerState, pack: EnhancedContentPack, now: Date) {
  const state = ensureTasks(player, pack, now);
  const day = dayKey(now);
  return {
    tasks: state.tasks.map((t) => ({ ...t, progress: taskProgress(player, t), completed: taskProgress(player, t) >= t.target, skillName: skillDisplayName(t.skillId) })),
    slots: TASK_SLOTS,
    nextTaskAt: state.nextTaskAt,
    cooldownMs: cooldownMs(state),
    tokens: state.tokens,
    points: state.points,
    giftPoints: GIFT_POINTS,
    giftReady: Math.floor(state.points / GIFT_POINTS) > state.giftsClaimed,
    giftsClaimed: state.giftsClaimed,
    completed: state.completed,
    rerollCost: rerollCost(state, day),
    cooldownLevel: state.cooldownLevel,
    maxCooldownLevel: MAX_COOLDOWN_LEVEL,
    blockSlots: state.blockSlots,
    blockedSkills: state.blockedSkills,
    skills: Object.keys(SKILL_NAMES).map((id) => ({ id, name: SKILL_NAMES[id] })),
    shop: TASK_SHOP.map((i) => ({
      id: i.id,
      name: i.name,
      blurb: i.blurb,
      cost: i.cost(state),
      soldOut: i.soldOut(state) || (ONE_PER_PLAYER.has(i.id) && ownsShopItem(player, i.id)),
    })),
  };
}
