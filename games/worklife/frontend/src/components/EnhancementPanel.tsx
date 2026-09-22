import { useEffect, useMemo, useState } from "react";
import { apiClient } from "../services/api";
import {
  ENHANCEMENT_BASE_SUCCESS,
  ENHANCEMENT_BONUS_PCT,
  enhancementStatMultiplier,
} from "../gameplay/enhancement";
import { xpProgress } from "../gameplay/xp";
import { T1Art, T1ItemIcon } from "./T1Art";

const SLOT_LABEL: Record<string, string> = {
  main_hand: "主手",
  off_hand: "副手",
  head: "帽子",
  chest: "上衣",
  legs: "裤子",
  feet: "鞋子",
  hands: "手套",
  accessory1: "饰品 1",
  accessory2: "饰品 2",
  tool: "工具",
};

const PROFESSION_LABEL: Record<string, string> = {
  woodcutter: "木制",
  blacksmith: "金属",
  tailor: "布 / 皮",
};

type ItemDef = {
  id: string;
  name?: string;
  type?: string;
  slot?: string;
  tier?: number;
  atk?: number;
  def?: number;
  mag?: number;
  hp?: number;
  toolFor?: string;
  toolSpeed?: number;
  enhanceSuccess?: number;
};

type EnhancementInfo = {
  currentLevel: number;
  maxLevel: number;
  nextLevelCost: Record<string, number>;
  successRate: number;
  baseSuccessRate: number;
  levelModifier: number;
  overLevelBonus: number;
  toolBonus: number;
  currentStatBonusPct: number;
  nextStatBonusPct: number;
  slotMultiplier: number;
  itemLevel: number;
  enhancingLevel: number;
  enhancingXp: number;
  canEnhance: boolean;
  canAfford: boolean;
  isOwned: boolean;
  requiredProfession?: string;
  protection: {
    itemId: string;
    available: number;
    failWithout: string;
    failWith: string;
  };
};

type EnhanceRun = {
  itemId: string;
  targetLevel: number;
  useProtection: boolean;
  intervalMs: number;
  nextAttemptAt: number;
  startedAt: number;
  attempts: number;
  successes: number;
  failures: number;
  xpGained: number;
  outcome?: { reason: "reached" | "materials" | "stopped" | "max" | "no_protection"; level: number; at: number };
};

const OUTCOME_COPY: Record<NonNullable<EnhanceRun["outcome"]>["reason"], string> = {
  reached: "达到目标",
  materials: "材料耗尽，已停止",
  stopped: "已手动停止",
  max: "已到上限",
  no_protection: "保护镜用完，已停止",
};

type Props = {
  playerState: any;
  contentItems?: ItemDef[];
  onRefresh: () => void | Promise<void>;
};

function enhanceable(item: ItemDef | undefined): boolean {
  if (!item) return false;
  return (
    item.type === "weapon" ||
    item.type === "armor" ||
    item.type === "offhand" ||
    item.type === "accessory" ||
    !!item.toolFor
  );
}

function formatPct(v: number): string {
  return `${(v * 100).toFixed(v * 100 < 10 ? 1 : 0)}%`;
}

function statPreview(item: ItemDef, level: number): string[] {
  const mult = enhancementStatMultiplier(level, item);
  const out: string[] = [];
  const stat = (label: string, value: number | undefined) => {
    if (!value) return;
    out.push(`${label} ${value} → ${Math.round(value * mult * 10) / 10}`);
  };
  stat("攻击", item.atk);
  stat("魔法", item.mag);
  stat("防御", item.def);
  stat("生命", item.hp);
  if (item.toolSpeed) {
    out.push(`工具速度 +${Math.round(item.toolSpeed * 100)}% → +${Math.round(item.toolSpeed * mult * 1000) / 10}%`);
  } else if (item.enhanceSuccess) {
    out.push(`强化成功率 +${Math.round(item.enhanceSuccess * 1000) / 10}% → +${Math.round(item.enhanceSuccess * mult * 10000) / 100}%`);
  }
  return out;
}

/**
 * MWI enhancement page:
 * - independent Enhancing skill and item-level success modifier
 * - exact +1…+20 base-rate and nonlinear stat-bonus tables
 * - unprotected failure resets to +0; a Mirror of Protection makes it lose only one level
 * - all owned/equipped gear is visible, not only main/off hand
 */
export function EnhancementPanel({ playerState, contentItems = [], onRefresh }: Props) {
  const run: EnhanceRun | undefined = playerState?.enhanceRun;
  const runActive = playerState?.mode === "enhancing" && !!run && !run.outcome;
  const [selectedItem, setSelectedItem] = useState<string | null>(runActive ? run!.itemId : null);
  const [info, setInfo] = useState<EnhancementInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [attempting, setAttempting] = useState(false);
  const [useProtection, setUseProtection] = useState(false);
  const [targetLevel, setTargetLevel] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const byId = useMemo(() => new Map(contentItems.map((i) => [i.id, i])), [contentItems]);

  useEffect(() => {
    if (!runActive) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [runActive]);

  // While a run is going, the page follows the item being enhanced.
  useEffect(() => {
    if (runActive && run && selectedItem !== run.itemId) setSelectedItem(run.itemId);
  }, [runActive, run, selectedItem]);

  const items = useMemo(() => {
    const equipment = playerState?.equipment || {};
    const slotsByItem = new Map<string, string[]>();
    for (const [slot, value] of Object.entries(equipment)) {
      if (typeof value !== "string" || !SLOT_LABEL[slot]) continue;
      if (!slotsByItem.has(value)) slotsByItem.set(value, []);
      slotsByItem.get(value)!.push(SLOT_LABEL[slot]);
    }
    const ids = new Set<string>(slotsByItem.keys());
    for (const [id, count] of Object.entries(playerState?.inventory || {})) {
      if (id !== "gold" && Number(count) > 0 && enhanceable(byId.get(id))) ids.add(id);
    }
    return [...ids]
      .map((id) => {
        const def = byId.get(id);
        return def
          ? {
              ...def,
              currentLevel: Number(equipment.enhancementLevels?.[id] || 0),
              quantity: Number(playerState.inventory?.[id] || 0),
              slots: slotsByItem.get(id) || [],
            }
          : null;
      })
      .filter((x): x is NonNullable<typeof x> => !!x && enhanceable(x))
      .sort((a, b) => b.currentLevel - a.currentLevel || Number(b.tier || 0) - Number(a.tier || 0) || (a.name || a.id).localeCompare(b.name || b.id, "zh-CN"));
  }, [playerState, byId]);

  useEffect(() => {
    if (!selectedItem && items.length) setSelectedItem(items[0].id);
    if (selectedItem && !items.some((i) => i.id === selectedItem)) setSelectedItem(items[0]?.id || null);
  }, [items, selectedItem]);

  useEffect(() => {
    if (!selectedItem) {
      setInfo(null);
      return;
    }
    let cancelled = false;
    setLoadingInfo(true);
    apiClient
      .getEnhancementInfo(selectedItem)
      .then((next: EnhancementInfo) => {
        if (cancelled) return;
        setInfo(next);
        if (!next.protection.available) setUseProtection(false);
      })
      .catch(() => {
        if (!cancelled) setInfo(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingInfo(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedItem, playerState?.equipment?.enhancementLevels, playerState?.inventory]);

  // Default target: one level up; clamp whenever the item or its level changes.
  useEffect(() => {
    if (!info) return;
    const min = info.currentLevel + 1;
    if (targetLevel === null || targetLevel < min || targetLevel > info.maxLevel) {
      setTargetLevel(Math.min(info.maxLevel, min));
    }
  }, [info, targetLevel]);

  const item = selectedItem ? byId.get(selectedItem) : undefined;
  const skill = playerState?.skills?.skill_enhancing || { level: info?.enhancingLevel || 1, xp: info?.enhancingXp || 0 };
  const skillProgress = xpProgress(skill.level || 1, skill.xp || 0);
  const protectionAffordable = !!info?.protection.available;
  const materialsAffordable =
    !!info &&
    Object.entries(info.nextLevelCost).every(
      ([id, qty]) => Number(playerState?.inventory?.[id] || 0) >= qty
    );
  const canAttempt =
    !!selectedItem &&
    !!info?.canEnhance &&
    materialsAffordable &&
    (!useProtection || protectionAffordable) &&
    !attempting &&
    !runActive;

  const handleStart = async () => {
    if (!selectedItem || !info || !canAttempt || targetLevel === null) return;
    setAttempting(true);
    setMessage("");
    try {
      apiClient.clearCache();
      await apiClient.startEnhanceRun(selectedItem, targetLevel, useProtection);
      await onRefresh();
    } catch (error: any) {
      setMessage(`✗ ${error?.message || "开始强化失败"}`);
    } finally {
      setAttempting(false);
    }
  };

  const handleStop = async () => {
    setAttempting(true);
    try {
      apiClient.clearCache();
      await apiClient.stopEnhanceRun();
      await onRefresh();
    } catch (error: any) {
      setMessage(`✗ ${error?.message || "停止失败"}`);
    } finally {
      setAttempting(false);
    }
  };

  const runItem = run ? byId.get(run.itemId) : undefined;
  const runLevel = run ? Number(playerState?.equipment?.enhancementLevels?.[run.itemId] || 0) : 0;
  const runRemainingMs = run ? Math.max(0, run.nextAttemptAt - now) : 0;
  const runPct = run ? Math.min(100, Math.max(0, 100 - (runRemainingMs / run.intervalMs) * 100)) : 0;

  return (
    <div className="enhancement-panel skill-page" data-skill-page="enhance">
      <div className="page-header">
        <h2 className="section-title">
          强化 <span className="skill-page-level">Lv.{skill.level || 1}</span>
        </h2>
        <div className="page-info">
          <p>强化装备到 +20。成功率由强化等级和物品等级决定；失败默认归零，保护镜能把损失改成降低 1 级。</p>
        </div>
      </div>

      <div className="enhancing-skill-progress">
        <span>强化经验</span>
        <span className="skill-xp-bar" aria-hidden="true">
          <span className="skill-xp-fill" style={{ width: `${skillProgress.pct}%` }} />
        </span>
        <small>
          {Math.floor(skill.xp || 0)}/{Number.isFinite(skillProgress.need) ? skillProgress.need : "MAX"}
        </small>
      </div>

      {run && (runActive || run.outcome) && (
        <section className={`enhance-run${runActive ? " active" : " done"}`} aria-label="强化进行中" data-run-state={runActive ? "active" : run.outcome?.reason}>
          <div className="enhance-run-head">
            <T1ItemIcon itemId={run.itemId} fallback="◈" alt="" />
            <div className="task-copy">
              <strong>
                {runActive ? "正在强化" : OUTCOME_COPY[run.outcome!.reason]} · {runItem?.name || run.itemId}
              </strong>
              <small>
                当前 +{runLevel} · 目标 +{run.targetLevel}
                {run.useProtection ? " · 使用保护镜" : ""} · 已尝试 {run.attempts} 次（成功 {run.successes} / 失败 {run.failures}）
                {run.xpGained ? ` · 强化经验 +${run.xpGained}` : ""}
              </small>
            </div>
            {runActive ? (
              <button type="button" className="qty-chip enhance-run-stop" disabled={attempting} onClick={handleStop}>
                停止
              </button>
            ) : null}
          </div>
          {runActive && (
            <div className="enhance-run-timer">
              <span className="skill-xp-bar" aria-hidden="true">
                <span className="skill-xp-fill" style={{ width: `${runPct}%` }} />
              </span>
              <small>下一次尝试 {Math.ceil(runRemainingMs / 1000)} 秒 · 每次 {Math.round(run.intervalMs / 1000)} 秒</small>
            </div>
          )}
        </section>
      )}

      <div className="enhancement-layout">
        <section className="enhancement-equipment" aria-label="可强化装备">
          <h3 className="inv-group-title">可强化装备 <small>{items.length}</small></h3>
          {items.length === 0 ? (
            <div className="inventory-empty inv-page-empty">
              <div className="empty-icon">✨</div>
              <p>背包和装备栏里还没有可强化的装备。</p>
            </div>
          ) : (
            <div className="enhancement-item-grid">
              {items.map((entry) => (
                <button
                  type="button"
                  key={entry.id}
                  className={`enhancement-item${selectedItem === entry.id ? " selected" : ""}`}
                  data-item-id={entry.id}
                  onClick={() => {
                    setSelectedItem(entry.id);
                    setMessage("");
                  }}
                >
                  <span className="enhancement-item-icon">
                    <T1ItemIcon itemId={entry.id} fallback="◈" alt="" />
                  </span>
                  <span className="enhancement-item-copy">
                    <strong>{entry.name || entry.id}</strong>
                    <small>
                      {entry.slots.length ? entry.slots.join(" / ") : `背包 ×${entry.quantity}`}
                    </small>
                  </span>
                  <span className="enhancement-item-level">+{entry.currentLevel}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="enhancement-details" aria-label="强化详情">
          {!selectedItem || !item ? (
            <div className="inventory-empty inv-page-empty"><p>选择一件装备。</p></div>
          ) : loadingInfo || !info ? (
            <div className="loading-message">读取强化信息...</div>
          ) : info.maxLevel === 0 ? (
            <div className="inventory-empty inv-page-empty"><p>这件物品没有匹配的强化规则。</p></div>
          ) : (
            <>
              <div className="enhancement-target">
                <T1ItemIcon itemId={item.id} fallback="◈" alt="" />
                <div className="task-copy">
                  <strong>{item.name || item.id}</strong>
                  <small>
                    物品 Lv.{info.itemLevel} · {PROFESSION_LABEL[info.requiredProfession || ""] || "通用"}材料
                    {info.slotMultiplier === 5 ? " · 饰品 5× 加成" : ""}
                  </small>
                </div>
                <span className="enhancement-level-arrow">
                  +{info.currentLevel} <b>→</b> +{Math.min(info.currentLevel + 1, info.maxLevel)}
                </span>
              </div>

              <div className="enhancement-stat-preview">
                <div>
                  <small>属性加成</small>
                  <strong>
                    +{info.currentStatBonusPct}% → +{info.nextStatBonusPct}%
                  </strong>
                </div>
                {statPreview(item, info.currentLevel + 1).map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </div>

              {info.currentLevel >= info.maxLevel ? (
                <div className="enhancement-max">已达到 +{info.maxLevel}</div>
              ) : (
                <>
                  <div className="enhancement-rate-card">
                    <div className="enhancement-rate-main">
                      <span>本次成功率</span>
                      <strong>{formatPct(info.successRate)}</strong>
                    </div>
                    <div className="enhancement-rate-breakdown">
                      <span>+{info.currentLevel + 1} 基础 {formatPct(info.baseSuccessRate)}</span>
                      <span>
                        等级修正 ×{info.levelModifier.toFixed(3)}
                        {info.enhancingLevel < info.itemLevel
                          ? `（强化 ${info.enhancingLevel} < 物品 ${info.itemLevel}）`
                          : "（无低级惩罚）"}
                      </span>
                      {info.overLevelBonus > 0 && (
                        <span>超等级 +{formatPct(info.overLevelBonus)}</span>
                      )}
                      <span>
                        {info.toolBonus > 0
                          ? `强化工具 +${(info.toolBonus * 100).toFixed(2)}%`
                          : "没有强化工具（锻造 6 级可做初级强化器，+0.6%）"}
                      </span>
                    </div>
                  </div>

                  <div className="enhancement-materials">
                    <h4>每次尝试消耗</h4>
                    {Object.entries(info.nextLevelCost).map(([id, qty]) => {
                      const have = Number(playerState?.inventory?.[id] || 0);
                      const def = byId.get(id);
                      return (
                        <span key={id} className={have >= qty ? "ok" : "short"}>
                          {id === "gold" ? (
                            <T1Art kind="ui" id="gold" alt="" fallback="●" />
                          ) : (
                            <T1ItemIcon itemId={id} fallback="◆" alt="" />
                          )}
                          {def?.name || (id === "gold" ? "金币" : id)} {have}/{qty}
                        </span>
                      );
                    })}
                  </div>

                  <label className={`enhancement-protection${useProtection ? " active" : ""}`}>
                    <input
                      type="checkbox"
                      checked={useProtection}
                      disabled={!protectionAffordable}
                      onChange={(e) => setUseProtection(e.target.checked)}
                    />
                    <T1ItemIcon itemId={info.protection.itemId} fallback="✦" alt="" />
                    <span>
                      <strong>使用保护镜（拥有 {info.protection.available}）</strong>
                      <small>
                        {protectionAffordable
                          ? info.protection.failWith
                          : `没有保护镜：${info.protection.failWithout}`}
                      </small>
                    </span>
                  </label>

                  <div className={`enhancement-risk ${useProtection ? " protected" : ""}`}>
                    {useProtection
                      ? `失败：+${info.currentLevel} → +${Math.max(0, info.currentLevel - 1)}`
                      : `失败：+${info.currentLevel} → +0`}
                  </div>

                  <label className="enhancement-target-row">
                    <span>目标等级</span>
                    <select
                      className="ability-select enhancement-target-select"
                      value={targetLevel ?? info.currentLevel + 1}
                      disabled={runActive}
                      onChange={(e) => setTargetLevel(Number(e.target.value))}
                    >
                      {Array.from({ length: info.maxLevel - info.currentLevel }, (_, i) => info.currentLevel + 1 + i).map((lv) => (
                        <option key={lv} value={lv}>
                          +{lv}
                        </option>
                      ))}
                    </select>
                    <small>每次尝试 20 秒，成功 +1，达到目标或材料耗尽自动停止；离线也会继续</small>
                  </label>

                  <button
                    type="button"
                    className={`btn-action enhancement-attempt${canAttempt ? " craftable" : ""}`}
                    disabled={!canAttempt}
                    onClick={handleStart}
                  >
                    {runActive
                      ? "强化进行中"
                      : attempting
                        ? "开始中..."
                        : !materialsAffordable
                          ? "材料不足"
                          : `开始强化 → +${targetLevel ?? info.currentLevel + 1}（本次 ${formatPct(info.successRate)}）`}
                  </button>
                </>
              )}
              {message && (
                <div className={`enhancement-message${message.startsWith("✓") ? " success" : " failure"}`}>
                  {message}
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <details className="enhancement-table">
        <summary>查看 +1 ～ +20 完整表</summary>
        <div className="enhancement-table-grid">
          {ENHANCEMENT_BONUS_PCT.slice(1).map((bonus, index) => {
            const level = index + 1;
            return (
              <span key={level}>
                <b>+{level}</b>
                <small>属性 +{bonus}%</small>
                <small>基础成功 {Math.round(ENHANCEMENT_BASE_SUCCESS[level] * 100)}%</small>
              </span>
            );
          })}
        </div>
      </details>
    </div>
  );
}
