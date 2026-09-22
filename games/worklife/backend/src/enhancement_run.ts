import type { EnhanceRun, EnhancedContentPack, EnhancedPlayerState } from "./types";
import { appendLog, getXpForLevel } from "./storage";
import { findEnhancementRuleForItem } from "./enhancement_utils";
import {
  MAX_ENHANCEMENT_LEVEL,
  PROTECTION_MIRROR_ID,
  enhancementMaterials,
  ownsEnhanceableItem,
  performEnhancementAttempt,
} from "./enhancement_math";
import { isE2eFast } from "./e2e_fast";

/**
 * MWI 强化是一个计时动作，不是一次点击：玩家设定目标等级，服务端每个间隔尝试一次，成功 +1，
 * 失败按保护规则回退，直到达标、材料耗尽或手动停止。离线期间同样结算。
 */
export const ENHANCE_BASE_INTERVAL_MS = 20_000;

export function enhanceIntervalMs(): number {
  return isE2eFast() ? 400 : ENHANCE_BASE_INTERVAL_MS;
}

type PackItem = { id: string; name?: string; type?: string; slot?: string; tier?: number };

const itemById = (pack: EnhancedContentPack, id: string) =>
  (pack.items as PackItem[]).find((i) => i.id === id);

export type StartEnhanceResult =
  | { ok: true; run: EnhanceRun }
  | { ok: false; error: string; message: string };

export function startEnhanceRun(
  player: EnhancedPlayerState,
  pack: EnhancedContentPack,
  input: { itemId: string; targetLevel: number; useProtection?: boolean },
  now: Date
): StartEnhanceResult {
  if (player.hpCombat && !player.hpCombat.outcome) {
    return { ok: false, error: "in_combat", message: "战斗中不能强化，先停止战斗" };
  }
  const item = itemById(pack, input.itemId);
  if (!item) return { ok: false, error: "unknown_item", message: "未知物品" };
  if (!ownsEnhanceableItem(player, input.itemId)) {
    return { ok: false, error: "item_not_owned", message: "背包和装备栏里都没有这件物品" };
  }
  const ruleMatch = findEnhancementRuleForItem(item, pack);
  if (!ruleMatch) return { ok: false, error: "not_enhanceable", message: "这件物品不能强化" };
  const maxLevel = Math.min(MAX_ENHANCEMENT_LEVEL, Number(ruleMatch.rule.maxLevel || MAX_ENHANCEMENT_LEVEL));
  const current = Number(player.equipment.enhancementLevels?.[input.itemId] || 0);
  const target = Math.floor(Number(input.targetLevel));
  if (!Number.isFinite(target) || target <= current) {
    return { ok: false, error: "bad_target", message: `目标等级必须高于当前的 +${current}` };
  }
  if (target > maxLevel) return { ok: false, error: "bad_target", message: `最高只能强化到 +${maxLevel}` };
  // First attempt must be payable now, so the player never "starts" a run that does nothing.
  const cost = enhancementMaterials(ruleMatch.rule, current + 1, input.useProtection ? PROTECTION_MIRROR_ID : undefined);
  for (const [id, qty] of Object.entries(cost)) {
    if ((player.inventory[id] || 0) < qty) {
      return { ok: false, error: "missing_materials", message: `材料不足：${id}（需要 ${qty}，拥有 ${player.inventory[id] || 0}）` };
    }
  }

  // One activity at a time (MWI): the run replaces whatever skilling action was going.
  player.mode = "enhancing";
  player.lifeActionState = undefined;
  const run: EnhanceRun = {
    itemId: input.itemId,
    targetLevel: target,
    useProtection: !!input.useProtection,
    intervalMs: enhanceIntervalMs(),
    nextAttemptAt: now.getTime() + enhanceIntervalMs(),
    startedAt: now.getTime(),
    attempts: 0,
    successes: 0,
    failures: 0,
    xpGained: 0,
  };
  player.enhanceRun = run;
  appendLog(player, `开始强化 ${item.name || item.id}：+${current} → 目标 +${target}${run.useProtection ? "（使用保护镜）" : ""}`);
  return { ok: true, run };
}

type StopReason = NonNullable<EnhanceRun["outcome"]>["reason"];

export function stopEnhanceRun(player: EnhancedPlayerState, now: Date, reason: StopReason = "stopped") {
  const run = player.enhanceRun;
  if (player.mode === "enhancing") player.mode = "idle";
  if (!run || run.outcome) return;
  run.outcome = {
    reason,
    level: Number(player.equipment.enhancementLevels?.[run.itemId] || 0),
    at: now.getTime(),
  };
}

/**
 * Settle every attempt whose time has come, up to `untilMs`. Returns the moment the run ended
 * (so the action queue can continue from there) or null while it is still going.
 */
export function tickEnhanceRun(
  player: EnhancedPlayerState,
  pack: EnhancedContentPack,
  untilMs: number,
  rng: () => number = Math.random
): Date | null {
  const run = player.enhanceRun;
  if (!run || run.outcome) return null;
  if (player.mode !== "enhancing") {
    // Another activity took over (life action / combat start); close the run at that point.
    stopEnhanceRun(player, new Date(untilMs), "stopped");
    return null;
  }
  const item = itemById(pack, run.itemId);
  const ruleMatch = item ? findEnhancementRuleForItem(item, pack) : null;
  if (!item || !ruleMatch) {
    stopEnhanceRun(player, new Date(untilMs), "stopped");
    return new Date(untilMs);
  }
  const levelOf = () => Number(player.equipment.enhancementLevels?.[run.itemId] || 0);
  let guard = 0;
  while (run.nextAttemptAt <= untilMs && guard++ < 20_000) {
    const current = levelOf();
    if (current >= run.targetLevel) {
      player.mode = "idle";
      run.outcome = { reason: "reached", level: current, at: run.nextAttemptAt };
      return new Date(run.nextAttemptAt);
    }
    if (run.useProtection && (player.inventory[PROTECTION_MIRROR_ID] || 0) < 1) {
      player.mode = "idle";
      run.outcome = { reason: "no_protection", level: current, at: run.nextAttemptAt };
      appendLog(player, `保护镜用完了，强化 ${item.name || item.id} 已停在 +${current}`);
      return new Date(run.nextAttemptAt);
    }
    const result = performEnhancementAttempt({
      player,
      item,
      rule: ruleMatch.rule,
      request: {
        itemId: run.itemId,
        targetLevel: current + 1,
        materials: {},
        protectionItemId: run.useProtection ? PROTECTION_MIRROR_ID : undefined,
      },
      pack,
      rng,
      xpForLevel: getXpForLevel,
    });
    if (Object.keys(result.consumedMaterials).length === 0) {
      // Validation stopped the attempt: out of materials (or the cap). Nothing was spent.
      const reason = /材料不足/.test(result.failureReason || "") ? "materials" : "max";
      player.mode = "idle";
      run.outcome = { reason, level: current, at: run.nextAttemptAt };
      appendLog(
        player,
        reason === "materials"
          ? `材料不足，强化 ${item.name || item.id} 停在 +${current}`
          : `${item.name || item.id} 已到强化上限 +${current}`
      );
      return new Date(run.nextAttemptAt);
    }
    run.attempts += 1;
    run.xpGained = Math.round((run.xpGained + (result.xpGained || 0)) * 10) / 10;
    if (result.success) {
      run.successes += 1;
      appendLog(player, `强化成功：${item.name || item.id} +${result.previousLevel} → +${result.newLevel}`);
    } else {
      run.failures += 1;
      appendLog(player, `${item.name || item.id}${result.failureReason || "强化失败"}`);
    }
    for (const level of result.levelUps || []) appendLog(player, `强化技能升级到 ${level} 级！`);
    const at = run.nextAttemptAt;
    run.nextAttemptAt += run.intervalMs;
    if (result.newLevel >= run.targetLevel) {
      player.mode = "idle";
      run.outcome = { reason: "reached", level: result.newLevel, at };
      appendLog(player, `${item.name || item.id} 达到目标 +${result.newLevel}，强化结束`);
      return new Date(at);
    }
  }
  return null;
}
