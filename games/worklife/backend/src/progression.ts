// 进度系统：成就 + 每日任务
// 集中定义静态数据与纯逻辑函数，便于路由层调用与单测。

import type {
  EnhancedPlayerState,
  AchievementDef,
  AchievementProgress,
  PlayerStats,
  DailyQuestState
} from "./types";
import { ensurePlayerExtensions } from "./storage";
import { todayLocal } from "./time";

// ============ 成就定义 ============
// metric 直接对应 PlayerStats 上的累计字段，逻辑统一按 progress >= target 解锁。

export const ACHIEVEMENTS: AchievementDef[] = [
  // —— 采集 ——
  { id: "ach_gather_1", name: "初入山林", description: "累计采集 10 次", category: "gathering", icon: "🌱", metric: "totalGathered", target: 10, reward: { gold: 50 } },
  { id: "ach_gather_2", name: "勤劳樵夫", description: "累计采集 100 次", category: "gathering", icon: "🪓", metric: "totalGathered", target: 100, reward: { gold: 300 } },
  { id: "ach_gather_3", name: "采集大师", description: "累计采集 1000 次", category: "gathering", icon: "🌲", metric: "totalGathered", target: 1000, reward: { gold: 2000 } },
  { id: "ach_gather_4", name: "万物收集者", description: "累计采集 10000 次", category: "gathering", icon: "🏔️", metric: "totalGathered", target: 10000, reward: { gold: 12000 } },

  // —— 制作 ——
  { id: "ach_craft_1", name: "学徒工匠", description: "累计制作 10 件", category: "crafting", icon: "🔨", metric: "totalCrafted", target: 10, reward: { gold: 80 } },
  { id: "ach_craft_2", name: "熟练工匠", description: "累计制作 100 件", category: "crafting", icon: "⚒️", metric: "totalCrafted", target: 100, reward: { gold: 500 } },
  { id: "ach_craft_3", name: "传奇匠人", description: "累计制作 1000 件", category: "crafting", icon: "🛠️", metric: "totalCrafted", target: 1000, reward: { gold: 3000 } },

  // —— 战斗 ——
  { id: "ach_kill_1", name: "初战告捷", description: "累计击杀 10 只怪物", category: "combat", icon: "⚔️", metric: "totalKills", target: 10, reward: { gold: 100 } },
  { id: "ach_kill_2", name: "百战之躯", description: "累计击杀 100 只怪物", category: "combat", icon: "🗡️", metric: "totalKills", target: 100, reward: { gold: 600 } },
  { id: "ach_kill_3", name: "千军斩", description: "累计击杀 1000 只怪物", category: "combat", icon: "💥", metric: "totalKills", target: 1000, reward: { gold: 4000 } },
  { id: "ach_boss_1", name: "首领克星", description: "累计击杀 1 个 BOSS", category: "combat", icon: "👹", metric: "totalBossKills", target: 1, reward: { gold: 500 } },
  { id: "ach_boss_2", name: "屠龙勇士", description: "累计击杀 10 个 BOSS", category: "combat", icon: "🐉", metric: "totalBossKills", target: 10, reward: { gold: 3000 } },

  // —— 财富 ——
  { id: "ach_gold_1", name: "小有积蓄", description: "累计获得 1000 金币", category: "wealth", icon: "🪙", metric: "totalGoldEarned", target: 1000, reward: { gold: 200 } },
  { id: "ach_gold_2", name: "腰缠万贯", description: "累计获得 10000 金币", category: "wealth", icon: "💰", metric: "totalGoldEarned", target: 10000, reward: { gold: 1500 } },
  { id: "ach_gold_3", name: "富可敌国", description: "累计获得 100000 金币", category: "wealth", icon: "💎", metric: "totalGoldEarned", target: 100000, reward: { gold: 10000 } },

  // —— 成长 ——
  { id: "ach_action_1", name: "勤勉不辍", description: "累计完成 500 次动作", category: "progression", icon: "🔁", metric: "totalActions", target: 500, reward: { gold: 400 } },
  { id: "ach_action_2", name: "永不停歇", description: "累计完成 5000 次动作", category: "progression", icon: "♾️", metric: "totalActions", target: 5000, reward: { gold: 3000 } },
  { id: "ach_clvl_1", name: "崭露头角", description: "战斗等级达到 10 级", category: "progression", icon: "📈", metric: "highestCombatLevel", target: 10, reward: { gold: 300 } },
  { id: "ach_clvl_2", name: "百炼成钢", description: "战斗等级达到 50 级", category: "progression", icon: "🔥", metric: "highestCombatLevel", target: 50, reward: { gold: 2000 } },
  { id: "ach_clvl_3", name: "登峰造极", description: "战斗等级达到 100 级", category: "progression", icon: "👑", metric: "highestCombatLevel", target: 100, reward: { gold: 8000 } },

  // —— 杂项 ——
  { id: "ach_enh_1", name: "锻造起步", description: "累计强化 10 次", category: "misc", icon: "✨", metric: "totalEnhancements", target: 10, reward: { gold: 200 } },
  { id: "ach_enh_2", name: "强化专家", description: "累计强化 100 次", category: "misc", icon: "🌟", metric: "totalEnhancements", target: 100, reward: { gold: 2000 } },
  { id: "ach_trade_1", name: "商业新手", description: "累计交易 10 次", category: "misc", icon: "🤝", metric: "totalTrades", target: 10, reward: { gold: 300 } },

  // —— 进阶战斗（对应新增冰封雪山/熔岩深渊区域）——
  { id: "ach_kill_4", name: "万怪伏诛", description: "累计击杀 10000 只怪物", category: "combat", icon: "☄️", metric: "totalKills", target: 10000, reward: { gold: 20000 } },
  { id: "ach_boss_3", name: "诸王终结者", description: "累计击杀 50 个 BOSS", category: "combat", icon: "🔱", metric: "totalBossKills", target: 50, reward: { gold: 15000 } },
  { id: "ach_clvl_4", name: "战神降世", description: "战斗等级达到 150 级", category: "progression", icon: "⚡", metric: "highestCombatLevel", target: 150, reward: { gold: 20000 } },

  // —— 进阶制作（对应高阶锻造/炼金/烹饪）——
  { id: "ach_craft_4", name: "宗师工匠", description: "累计制作 10000 件", category: "crafting", icon: "🏆", metric: "totalCrafted", target: 10000, reward: { gold: 15000 } },

  // —— 财富与消费（对应商店系统的金币回收）——
  { id: "ach_gold_4", name: "富甲天下", description: "累计获得 1000000 金币", category: "wealth", icon: "🏦", metric: "totalGoldEarned", target: 1000000, reward: { gold: 50000 } },
  { id: "ach_spend_1", name: "初尝消费", description: "累计花费 1000 金币", category: "wealth", icon: "🛒", metric: "totalGoldSpent", target: 1000, reward: { gold: 200 } },
  { id: "ach_spend_2", name: "挥金如土", description: "累计花费 50000 金币", category: "wealth", icon: "💸", metric: "totalGoldSpent", target: 50000, reward: { gold: 3000 } },

  // —— 坚持（挂机时长）——
  { id: "ach_time_1", name: "持之以恒", description: "累计游戏时长达到 10 小时", category: "progression", icon: "⏳", metric: "playtimeSeconds", target: 36000, reward: { gold: 1000 } },
  { id: "ach_time_2", name: "时间的旅人", description: "累计游戏时长达到 100 小时", category: "progression", icon: "🕰️", metric: "playtimeSeconds", target: 360000, reward: { gold: 8000 } },

  // —— 神话纪元（对应永劫炼狱/创世神域/万界终焉等终极区域的超长线目标）——
  { id: "ach_kill_5", name: "万界屠戮者", description: "累计击杀 100000 只怪物", category: "combat", icon: "🌌", metric: "totalKills", target: 100000, reward: { gold: 120000 } },
  { id: "ach_boss_4", name: "弑神者", description: "累计击杀 200 个 BOSS", category: "combat", icon: "💀", metric: "totalBossKills", target: 200, reward: { gold: 80000 } },
  { id: "ach_boss_5", name: "万界终结者", description: "累计击杀 1000 个 BOSS", category: "combat", icon: "🌑", metric: "totalBossKills", target: 1000, reward: { gold: 300000 } },
  { id: "ach_gather_5", name: "寰宇拾荒者", description: "累计采集 100000 次", category: "gathering", icon: "🌠", metric: "totalGathered", target: 100000, reward: { gold: 100000 } },
  { id: "ach_craft_5", name: "创世造物主", description: "累计制作 100000 件", category: "crafting", icon: "⚒️", metric: "totalCrafted", target: 100000, reward: { gold: 120000 } },
  { id: "ach_action_3", name: "永恒不息", description: "累计完成 50000 次动作", category: "progression", icon: "🔄", metric: "totalActions", target: 50000, reward: { gold: 80000 } },
  { id: "ach_action_4", name: "亘古长青", description: "累计完成 500000 次动作", category: "progression", icon: "♾️", metric: "totalActions", target: 500000, reward: { gold: 400000 } },
  { id: "ach_gold_5", name: "寰宇巨富", description: "累计获得 100000000 金币", category: "wealth", icon: "🌟", metric: "totalGoldEarned", target: 100000000, reward: { gold: 1000000 } },
  { id: "ach_spend_3", name: "富甲一方的挥霍", description: "累计花费 1000000 金币", category: "wealth", icon: "🪙", metric: "totalGoldSpent", target: 1000000, reward: { gold: 50000 } },
  { id: "ach_enh_3", name: "强化宗师", description: "累计强化 1000 次", category: "misc", icon: "💫", metric: "totalEnhancements", target: 1000, reward: { gold: 30000 } },
  { id: "ach_trade_2", name: "商业巨擘", description: "累计交易 1000 次", category: "misc", icon: "🏪", metric: "totalTrades", target: 1000, reward: { gold: 25000 } },
  { id: "ach_time_3", name: "千年隐者", description: "累计游戏时长达到 500 小时", category: "progression", icon: "🌌", metric: "playtimeSeconds", target: 1800000, reward: { gold: 60000 } },
  { id: "ach_time_4", name: "永恒守望者", description: "累计游戏时长达到 1000 小时", category: "progression", icon: "🔭", metric: "playtimeSeconds", target: 3600000, reward: { gold: 150000 } }
];

const ACHIEVEMENT_MAP: Record<string, AchievementDef> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a])
);

export function getAchievementDef(id: string): AchievementDef | undefined {
  return ACHIEVEMENT_MAP[id];
}

/**
 * 根据当前 stats 同步所有成就进度，自动解锁达标成就。
 * 返回本次新解锁的成就定义列表（用于前端弹窗提示）。
 */
export function syncAchievements(player: EnhancedPlayerState): AchievementDef[] {
  ensurePlayerExtensions(player);
  const stats = player.stats!;
  const ach = player.achievements!;
  const newlyUnlocked: AchievementDef[] = [];

  for (const def of ACHIEVEMENTS) {
    const current = (stats[def.metric] as number) || 0;
    let prog: AchievementProgress = ach[def.id] || {
      unlocked: false,
      claimed: false,
      progress: 0
    };
    prog.progress = current;
    if (!prog.unlocked && current >= def.target) {
      prog.unlocked = true;
      prog.unlockedAt = new Date().toISOString();
      newlyUnlocked.push(def);
    }
    ach[def.id] = prog;
  }
  return newlyUnlocked;
}

/**
 * 领取某个成就奖励。返回 {ok, gold} 或错误原因。
 */
export function claimAchievement(
  player: EnhancedPlayerState,
  achievementId: string
): { ok: boolean; reason?: string; goldGained?: number } {
  ensurePlayerExtensions(player);
  const def = ACHIEVEMENT_MAP[achievementId];
  if (!def) return { ok: false, reason: "成就不存在" };
  const prog = player.achievements![achievementId];
  if (!prog || !prog.unlocked) return { ok: false, reason: "成就尚未达成" };
  if (prog.claimed) return { ok: false, reason: "奖励已领取" };

  prog.claimed = true;
  const gold = def.reward.gold || 0;
  if (gold > 0) {
    player.inventory.gold = (player.inventory.gold || 0) + gold;
    player.stats!.totalGoldEarned += gold;
  }
  return { ok: true, goldGained: gold };
}

// ============ 每日任务 ============
// 每日从模板池中随机抽取 3 个，零点（UTC）刷新。
// 进度 = 当前 stats 指标值 - 接取时的 baseline，封顶 target。

type DailyTemplate = {
  id: string;
  name: string;
  description: string;
  icon: string;
  metric: "totalGathered" | "totalCrafted" | "totalKills" | "totalActions" | "totalGoldSpent";
  target: number;
  reward: { gold: number; xp?: number };
};

const DAILY_TEMPLATES: DailyTemplate[] = [
  { id: "dq_gather_30", name: "今日采集", description: "今日采集 30 次", icon: "🌿", metric: "totalGathered", target: 30, reward: { gold: 200 } },
  { id: "dq_gather_60", name: "勤采不辍", description: "今日采集 60 次", icon: "🍃", metric: "totalGathered", target: 60, reward: { gold: 400 } },
  { id: "dq_craft_15", name: "今日制作", description: "今日制作 15 件", icon: "🔧", metric: "totalCrafted", target: 15, reward: { gold: 250 } },
  { id: "dq_craft_30", name: "匠心独运", description: "今日制作 30 件", icon: "⚙️", metric: "totalCrafted", target: 30, reward: { gold: 450 } },
  { id: "dq_kill_20", name: "今日讨伐", description: "今日击杀 20 只怪物", icon: "⚔️", metric: "totalKills", target: 20, reward: { gold: 300 } },
  { id: "dq_kill_40", name: "猎魔行动", description: "今日击杀 40 只怪物", icon: "🗡️", metric: "totalKills", target: 40, reward: { gold: 550 } },
  { id: "dq_action_50", name: "辛勤一日", description: "今日完成 50 次动作", icon: "🔁", metric: "totalActions", target: 50, reward: { gold: 200 } },
  { id: "dq_action_100", name: "全力以赴", description: "今日完成 100 次动作", icon: "💪", metric: "totalActions", target: 100, reward: { gold: 400 } },
  { id: "dq_kill_80", name: "讨伐精英", description: "今日击杀 80 只怪物", icon: "💥", metric: "totalKills", target: 80, reward: { gold: 800 } },
  { id: "dq_craft_50", name: "量产能手", description: "今日制作 50 件", icon: "🏭", metric: "totalCrafted", target: 50, reward: { gold: 700 } },
  { id: "dq_gather_120", name: "采集狂热", description: "今日采集 120 次", icon: "🌾", metric: "totalGathered", target: 120, reward: { gold: 700 } },
  { id: "dq_spend_2000", name: "今日采购", description: "今日在商店消费 2000 金币", icon: "🛒", metric: "totalGoldSpent", target: 2000, reward: { gold: 300 } }
];

/** 返回业务当日日期串 YYYY-MM-DD（东八区，统一自 systems.ts） */
function todayUTC(): string {
  return todayLocal();
}

/** 从模板池随机抽取 n 个不重复 */
function pickRandom<T>(arr: T[], n: number): T[] {
  const pool = [...arr];
  const out: T[] = [];
  while (out.length < n && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

/**
 * 确保玩家拥有当日每日任务；若日期变更则刷新。
 * baseline 取当前 stats 值，从而保证“今日增量”计算正确。
 */
export function ensureDailyQuests(player: EnhancedPlayerState): DailyQuestState {
  ensurePlayerExtensions(player);
  const stats = player.stats!;
  const today = todayUTC();

  if (!player.dailyQuests || player.dailyQuests.date !== today) {
    const picks = pickRandom(DAILY_TEMPLATES, 3);
    player.dailyQuests = {
      date: today,
      quests: picks.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        icon: t.icon,
        metric: t.metric,
        target: t.target,
        baseline: (stats[t.metric] as number) || 0,
        claimed: false,
        reward: t.reward
      }))
    };
  }
  return player.dailyQuests;
}

/** 计算某条每日任务的当前进度（0..target） */
export function dailyProgress(
  stats: PlayerStats,
  quest: DailyQuestState["quests"][number]
): number {
  const current = (stats[quest.metric] as number) || 0;
  return Math.max(0, Math.min(quest.target, current - quest.baseline));
}

/**
 * 领取某条每日任务奖励。
 */
export function claimDailyQuest(
  player: EnhancedPlayerState,
  questId: string
): { ok: boolean; reason?: string; goldGained?: number; xpGained?: number } {
  ensureDailyQuests(player);
  const stats = player.stats!;
  const quest = player.dailyQuests!.quests.find((q) => q.id === questId);
  if (!quest) return { ok: false, reason: "任务不存在" };
  if (quest.claimed) return { ok: false, reason: "奖励已领取" };
  if (dailyProgress(stats, quest) < quest.target) {
    return { ok: false, reason: "任务尚未完成" };
  }
  quest.claimed = true;
  const gold = quest.reward.gold || 0;
  if (gold > 0) {
    player.inventory.gold = (player.inventory.gold || 0) + gold;
    stats.totalGoldEarned += gold;
  }
  return { ok: true, goldGained: gold, xpGained: quest.reward.xp || 0 };
}
