import type { DungeonRun, EnhancedContentPack, EnhancedPlayerState, HpCombatState } from "./types";
import { appendLog } from "./storage";
import { recordCodexItemUnlock } from "./progression2";
import { todayLocal } from "./time";
import { isStageOpen } from "./zones";
import { ZONE_TIER_NAMES, clampTier, zoneTierKillsLeft } from "./zone_tiers";
import {
  DUNGEON_RULES,
  dungeonClearPool,
  dungeonCountDay,
  dungeonRunsLeft,
  dungeonWaves,
  dungeonZoneCleared,
  pickClearReward,
  type DungeonMonster,
} from "./dungeon_rules";

/**
 * 单人地下城（WL-G3）的存档状态。规则与参数在 dungeon_rules.ts（前后端同源）。
 *
 * 每一波就是一场普通的 hpCombat：开打、结算、掉落都走 hp_combat.ts 原来那一套，这里只管
 * 「下一波打谁」「什么时候结束」「通关奖励」。离线（两次结算隔太久）直接按已过的波数结束。
 * 不引用 hp_combat.ts，避免循环依赖；开第一波由路由调用 startHpCombat。
 */

type PackMonster = DungeonMonster & { name?: string };

function zoneMonsters(pack: EnhancedContentPack, zoneId: string): { zone?: { id: string; monsters: string[] }; monsters: PackMonster[] } {
  const zone = (pack.stages as Array<{ id: string; monsters?: string[] }>).find((s) => s.id === zoneId);
  if (!zone?.monsters?.length) return { monsters: [] };
  const all = pack.monsters as PackMonster[];
  const monsters = zone.monsters.map((id) => all.find((m) => m.id === id)).filter(Boolean) as PackMonster[];
  return { zone: { id: zone.id, monsters: zone.monsters }, monsters };
}

export function isDungeonActive(player: EnhancedPlayerState): boolean {
  return !!player.dungeonRun && !player.dungeonRun.outcome;
}

/** 进行中的地下城下一场打谁、用哪一档；不在地下城里返回 undefined。 */
export function dungeonNextFight(player: EnhancedPlayerState): { monsterId: string; tier: number } | undefined {
  const run = player.dungeonRun;
  if (!run || run.outcome || run.cleared >= run.waves.length) return undefined;
  return { monsterId: run.waves[run.cleared], tier: run.tier };
}

export type StartDungeonResult =
  | { ok: true; monsterId: string; tier: number }
  | { ok: false; error: string; message: string };

/** 校验并登记一次地下城（扣当天次数）；成功后由调用方用返回的怪物与档位开第一波。 */
export function startDungeon(
  player: EnhancedPlayerState,
  pack: EnhancedContentPack,
  zoneId: string,
  rawTier: number,
  now: Date
): StartDungeonResult {
  const { zone, monsters } = zoneMonsters(pack, zoneId);
  if (!zone || !isStageOpen(zone.id)) return { ok: false, error: "stage_locked", message: "该区域尚未开放" };
  const waves = dungeonWaves(monsters);
  if (waves.length === 0) return { ok: false, error: "no_dungeon", message: "这个区域没有首领，开不了地下城" };
  if (!dungeonZoneCleared(player.stats, monsters)) {
    return { ok: false, error: "zone_not_cleared", message: "先击败一次这个区域的首领" };
  }
  const tier = clampTier(rawTier);
  const left = zoneTierKillsLeft(player.stats, zone, tier);
  if (left > 0) return { ok: false, error: "tier_locked", message: `「${ZONE_TIER_NAMES[tier]}」还没开放` };
  if (isDungeonActive(player) || (player.hpCombat && !player.hpCombat.outcome)) {
    return { ok: false, error: "already_in_combat", message: "先结束当前战斗" };
  }
  if (player.enhanceRun && !player.enhanceRun.outcome) return { ok: false, error: "already_enhancing", message: "先停止强化" };
  const actions = pack.actions as Array<{ id: string; requirements?: { skillLevel?: number } }>;
  const need = Math.max(...waves.map((id) => Number(actions.find((a) => a.id === `act_combat_${id}`)?.requirements?.skillLevel || 1)));
  if ((player.combatLevel || 1) < need) return { ok: false, error: "skill_level_required", message: `战斗等级不足，需要 ${need} 级` };
  const today = todayLocal(now);
  const runsLeft = dungeonRunsLeft(player.dungeonDaily, today);
  if (runsLeft <= 0) return { ok: false, error: "no_runs_left", message: `今天的 ${DUNGEON_RULES.runsPerDay} 次已用完` };
  player.dungeonDaily = { day: dungeonCountDay(player.dungeonDaily, today), runs: DUNGEON_RULES.runsPerDay - runsLeft + 1 };
  player.dungeonRun = { zoneId: zone.id, tier, waves, cleared: 0, startedAt: now.getTime() };
  appendLog(player, `进入地下城：${zoneId}${tier ? `（${ZONE_TIER_NAMES[tier]}）` : ""}，共 ${waves.length} 波`);
  return { ok: true, monsterId: waves[0], tier };
}

/** 收尾：写结果（从这一轮的战斗统计取各波之和）与日志。 */
export function endDungeon(
  player: EnhancedPlayerState,
  atMs: number,
  outcome: NonNullable<DungeonRun["outcome"]>,
  enc?: HpCombatState,
  reward?: string
): void {
  const run = player.dungeonRun;
  if (!run || run.outcome) return;
  const rs = enc?.runStats;
  const loot = { ...(rs?.loot || {}) };
  if (reward) loot[reward] = (loot[reward] || 0) + 1;
  run.outcome = outcome;
  run.endedAt = atMs;
  run.result = { xp: Math.round((rs?.xp || 0) * 10) / 10, gold: rs?.gold || 0, loot, ...(reward ? { reward } : {}) };
  const word = { clear: "全部通过", fail: "战败", left: "中途离开", offline: "离线超时" }[outcome];
  appendLog(player, `地下城${word}：${run.cleared}/${run.waves.length} 波，经验 ${run.result.xp}、金币 ${run.result.gold}`);
}

/** 结算弹窗看过了：记在存档里，刷新、换设备都不再弹；没看过的下次打开页面补弹。 */
export function markDungeonResultSeen(player: EnhancedPlayerState, startedAt: number): boolean {
  const run = player.dungeonRun;
  if (!run || !run.outcome || run.startedAt !== startedAt || run.resultSeen) return false;
  run.resultSeen = true;
  return true;
}

/** 自己离开（逃跑、换打别的怪）：按已过的波数结束。 */
export function leaveDungeon(player: EnhancedPlayerState, now: Date): void {
  if (isDungeonActive(player)) endDungeon(player, now.getTime(), "left", player.hpCombat);
}

/**
 * 一场打完后调用（hp_combat.tickOneFight）：胜了推进一波或全通，败了结束。
 * 地下城自己决定下一场什么时候开：胜了歇 `intermissionMs`，败了不重生、不续打。
 */
export function dungeonAfterFight(
  player: EnhancedPlayerState,
  pack: EnhancedContentPack,
  enc: HpCombatState,
  simMs: number,
  intermissionMs: number,
  rng: () => number,
  pushLog: (enc: HpCombatState, line: string) => void
): void {
  const run = player.dungeonRun;
  if (!run || run.outcome || run.waves[run.cleared] !== enc.monsterId || !enc.outcome) return;
  if (enc.outcome === "loss") {
    enc.nextFightAt = undefined;
    pushLog(enc, `地下城失败：通过 ${run.cleared}/${run.waves.length} 波`);
    endDungeon(player, simMs, "fail", enc);
    return;
  }
  run.cleared += 1;
  if (run.cleared < run.waves.length) {
    enc.nextFightAt = simMs + intermissionMs;
    pushLog(enc, `第 ${run.cleared}/${run.waves.length} 波通过`);
    return;
  }
  enc.nextFightAt = undefined;
  const all = pack.monsters as PackMonster[];
  const items = (pack.items || []) as Array<{ id: string; name?: string }>;
  const pool = dungeonClearPool(run.waves.map((id) => all.find((m) => m.id === id)).filter(Boolean) as PackMonster[]);
  const picked = pickClearReward(pool, rng());
  const item = picked ? items.find((i) => i.id === picked) || items.find((i) => i.name === picked) : undefined;
  if (item) {
    player.inventory[item.id] = (player.inventory[item.id] || 0) + 1;
    recordCodexItemUnlock(player, item.id);
    pushLog(enc, `通关奖励：${item.name || item.id} ×1`);
  }
  pushLog(enc, `地下城全部通过！`);
  endDungeon(player, simMs, "clear", enc, item?.id);
}

/**
 * 每次结算前调用（storage.simulateToNow）：离线太久、或战斗已经不是地下城这一波（被别的入口换掉）时结束。
 * 返回 "offline" 时调用方要把挂着的战斗收掉；"left" 时战斗已经是别的，不动。
 */
export function settleDungeonPresence(player: EnhancedPlayerState, lastMs: number, nowMs: number): "offline" | "left" | undefined {
  const run = player.dungeonRun;
  if (!run || run.outcome) return undefined;
  if (nowMs - lastMs > DUNGEON_RULES.offlineGapMs) {
    endDungeon(player, lastMs, "offline", player.hpCombat);
    return "offline";
  }
  const enc = player.hpCombat;
  const fighting = !!enc && !enc.outcome && enc.monsterId === run.waves[run.cleared];
  const between = !!enc && enc.outcome === "win" && !!enc.nextFightAt && enc.monsterId === run.waves[run.cleared - 1];
  if (!fighting && !between) {
    endDungeon(player, lastMs, "left", enc);
    return "left";
  }
  return undefined;
}
