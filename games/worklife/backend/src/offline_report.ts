import type { EnhancedContentPack, EnhancedPlayerState } from "./types";
import { getTotalXpForLevel } from "./storage";

/** Offline threshold: below this a settle is just a poll, not a "welcome back". */
export const OFFLINE_REPORT_MIN_MS = 5 * 60 * 1000;

export type OfflineReport = {
  id: string;
  from: string;
  to: string;
  durationMs: number;
  /** Actions completed while away, from the settle logs ("完成 N 次 X"). */
  actions: Array<{ name: string; count: number }>;
  /** Net positive inventory deltas (gold excluded). */
  items: Array<{ itemId: string; qty: number }>;
  gold: number;
  /** XP gained per skill (incl. combat as "combat"), with level changes. */
  skills: Array<{ skillId: string; xp: number; fromLevel: number; toLevel: number }>;
  kills: Array<{ monsterId: string; count: number }>;
  /** Why the character is idle now, if it stopped while away. */
  stopped?: string;
  /** Still running on return (action name), if any. */
  running?: string;
};

export type SettleSnapshot = {
  inventory: Record<string, number>;
  skills: Record<string, { level: number; xp: number }>;
  combatLevel: number;
  combatXp: number;
  killsByMonster: Record<string, number>;
  logCount: number;
  mode: string;
  actionId?: string;
};

export function snapshotForReport(state: EnhancedPlayerState): SettleSnapshot {
  const skills: Record<string, { level: number; xp: number }> = {};
  for (const [k, v] of Object.entries(state.skills || {})) skills[k] = { level: Number((v as any).level || 1), xp: Number((v as any).xp || 0) };
  return {
    inventory: { ...(state.inventory || {}) },
    skills,
    combatLevel: Number(state.combatLevel || 1),
    combatXp: Number(state.combatXp || 0),
    killsByMonster: { ...((state.stats?.killsByMonster as Record<string, number>) || {}) },
    logCount: (state.logs || []).length,
    mode: state.mode,
    actionId: state.lifeActionState?.actionId,
  };
}

function totalXp(level: number, xp: number): number {
  return getTotalXpForLevel(level) + xp;
}

export function buildOfflineReport(
  before: SettleSnapshot,
  after: EnhancedPlayerState,
  pack: EnhancedContentPack,
  from: Date,
  to: Date
): OfflineReport {
  const items: Array<{ itemId: string; qty: number }> = [];
  for (const [id, qty] of Object.entries(after.inventory || {})) {
    if (id === "gold") continue;
    const d = Number(qty || 0) - Number(before.inventory[id] || 0);
    if (d > 0) items.push({ itemId: id, qty: d });
  }
  items.sort((a, b) => b.qty - a.qty);
  const gold = Number(after.inventory?.gold || 0) - Number(before.inventory.gold || 0);

  const skills: OfflineReport["skills"] = [];
  for (const [k, v] of Object.entries(after.skills || {})) {
    const b = before.skills[k] || { level: 1, xp: 0 };
    const gained = totalXp(Number((v as any).level || 1), Number((v as any).xp || 0)) - totalXp(b.level, b.xp);
    if (gained > 0) skills.push({ skillId: k, xp: gained, fromLevel: b.level, toLevel: Number((v as any).level || 1) });
  }
  const combatGained = totalXp(Number(after.combatLevel || 1), Number(after.combatXp || 0)) - totalXp(before.combatLevel, before.combatXp);
  if (combatGained > 0) skills.push({ skillId: "combat", xp: combatGained, fromLevel: before.combatLevel, toLevel: Number(after.combatLevel || 1) });

  const kills: OfflineReport["kills"] = [];
  for (const [m, c] of Object.entries((after.stats?.killsByMonster as Record<string, number>) || {})) {
    const d = Number(c || 0) - Number(before.killsByMonster[m] || 0);
    if (d > 0) kills.push({ monsterId: m, count: d });
  }

  // Actions: aggregate "完成 N 次 X" lines appended during the settle.
  const newLogs = (after.logs || []).slice(before.logCount).map((l) => l.text);
  const byAction = new Map<string, number>();
  let stopped: string | undefined;
  for (const text of newLogs) {
    const m = text.match(/完成\s*(\d+)\s*次\s*(.+?)(（效率额外.*?）)?，获得/);
    if (m) byAction.set(m[2], (byAction.get(m[2]) || 0) + (parseInt(m[1], 10) || 0));
    if (/材料不足|批量制作完成|队列跳过|保护镜用完|已到强化上限|达到目标 \+\d+，强化结束/.test(text)) stopped = text;
  }
  const actions = [...byAction.entries()].map(([name, count]) => ({ name, count }));
  if (kills.length) {
    const monsters = pack.monsters as any[];
    for (const k of kills) actions.push({ name: `击败 ${monsters.find((x) => x.id === k.monsterId)?.name || k.monsterId}`, count: k.count });
  }
  // MWI timed enhancing: attempts that landed while away, as one aggregated action line.
  const run = after.enhanceRun;
  if (run && (run.outcome ? run.outcome.at : Number.MAX_SAFE_INTEGER) > from.getTime()) {
    const attemptsAway = newLogs.filter((t) => /^强化成功：|强化失败：|重置为 \+0|降到 \+\d+/.test(t)).length;
    if (attemptsAway > 0) {
      const itemName = (pack.items as any[]).find((i) => i.id === run.itemId)?.name || run.itemId;
      const level = Number(after.equipment?.enhancementLevels?.[run.itemId] || 0);
      actions.push({ name: `强化 ${itemName}（现在 +${level}）`, count: attemptsAway });
    }
  }

  let running: string | undefined;
  if (after.mode === "life_action" && after.lifeActionState) {
    running = (pack.actions as any[]).find((a) => a.id === after.lifeActionState!.actionId)?.name || after.lifeActionState.actionId;
  } else if (after.hpCombat && !after.hpCombat.outcome) {
    running = `战斗：${after.hpCombat.monsterName}`;
  } else if (after.mode === "enhancing" && run && !run.outcome) {
    const itemName = (pack.items as any[]).find((i) => i.id === run.itemId)?.name || run.itemId;
    running = `强化：${itemName} → 目标 +${run.targetLevel}`;
  }
  if (running) stopped = undefined;

  return {
    id: `${from.getTime()}-${to.getTime()}`,
    from: from.toISOString(),
    to: to.toISOString(),
    durationMs: to.getTime() - from.getTime(),
    actions,
    items,
    gold,
    skills,
    kills,
    stopped,
    running,
  };
}

/** A report is worth showing when something happened or the character stopped. */
export function reportHasContent(r: OfflineReport): boolean {
  return r.actions.length > 0 || r.items.length > 0 || r.gold !== 0 || r.skills.length > 0 || !!r.stopped;
}
