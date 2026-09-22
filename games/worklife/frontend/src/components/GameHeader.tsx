import { useEffect, useRef, useState } from "react";
import { T1Art } from "./T1Art";
import { CAREER_GROUPS } from "../gameplay/ia";

export type ProgPanelId =
  | "achievements"
  | "daily"
  | "stats"
  | "settings"
  | "buffs"
  | "shop"
  | "checkin"
  | "reputation"
  | "bounties"
  | "prestige";

const LABELS: Record<ProgPanelId, string> = {
  daily: "每日任务",
  achievements: "成就",
  checkin: "签到",
  shop: "商店",
  buffs: "增益",
  stats: "生涯统计",
  reputation: "声望",
  bounties: "赏金契约",
  prestige: "转生",
  settings: "设置",
};

const HINT: Partial<Record<ProgPanelId, "claim" | "checkin">> = {
  achievements: "claim",
  checkin: "checkin",
};

type Props = {
  playerMode?: string;
  currentActivity: { name: string; duration: number; mark?: string } | null;
  /** 批量制作：服务端剩余件数 / 请求总数（非批量时为 undefined） */
  batchRemaining?: number;
  batchTotal?: number;
  battleActive: boolean;
  battleMonsterName?: string;
  /** MWI timed enhancing: shown in the activity slot like any other action. */
  enhanceRun?: { itemName: string; level: number; target: number; nextAttemptAt: number; intervalMs: number } | null;
  onStopEnhance?: () => void;
  cycleCompleteFlash: boolean;
  activeTab: string;
  progress: number;
  onStopActivity: () => void;
  onStopBattle: () => void;
  rewardNotification: { show: boolean; xp: number; gold: number; key: number };
  onOpenProg: (id: ProgPanelId) => void;
  claimableCount: number;
  checkInAvailable: boolean;
  gold?: number;
  /** MWI-style total level (sum of skill levels incl. combat); hidden in chapter 1. */
  totalLevel?: number;
  chapterComplete?: boolean;
};

function activityLabel(tab: string) {
  if (tab === "logging") return "伐";
  if (tab === "mining") return "矿";
  if (tab === "farming") return "农";
  if (tab === "fishing") return "渔";
  if (tab === "gathering") return "采";
  if (tab === "crystal_mining") return "晶";
  if (tab === "enhance" || tab.includes("craft") || tab === "cooking" || tab === "smithing" || tab === "tailoring" || tab === "alchemy") return "制";
  return "工";
}

export function GameHeader(props: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const enhancing = !!props.enhanceRun && props.playerMode === "enhancing";
  const showActivity =
    (props.currentActivity && props.playerMode === "life_action") || props.battleActive || enhancing;
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    if (!enhancing) return;
    const id = window.setInterval(() => setTick(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [enhancing]);
  const enhanceRemainingMs = props.enhanceRun ? Math.max(0, props.enhanceRun.nextAttemptAt - tick) : 0;
  const enhancePct = props.enhanceRun ? Math.round(Math.min(100, Math.max(0, 100 - (enhanceRemainingMs / props.enhanceRun.intervalMs) * 100))) : 0;

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const groups = props.chapterComplete
    ? CAREER_GROUPS
    : CAREER_GROUPS.filter((g) => g.title === "系统");
  // 声望 / 赏金契约 / 转生 的数值量级属于第二章之后；第一章刚结束时先以"第二章开放"占位，避免一次倒出十个系统
  const lockedGroupTitles = new Set(["远期"]);
  const isLocked = (groupTitle: string) => lockedGroupTitles.has(groupTitle);
  // 角标只统计菜单里当前可见且可点的入口：第一章结束前只有"设置"，此时不该亮红点
  const visibleIds = new Set(
    groups.filter((g) => !isLocked(g.title)).flatMap((g) => g.items as readonly ProgPanelId[])
  );
  const claimVisible = visibleIds.has("achievements") || visibleIds.has("daily");
  const checkinVisible = visibleIds.has("checkin");
  const showClaim = claimVisible && props.claimableCount > 0;
  const showCheckin = checkinVisible && props.checkInAvailable;

  return (
    <header className="game-header">
      <div className="header-left">
        <div className="game-logo">
          <div className="logo-icon">
            <T1Art kind="ui" id="logo" alt="异世界の打工生活" />
          </div>
          <div className="logo-text">
            <span className="logo-title">异世界の</span>
            <span className="logo-subtitle">打工生活</span>
          </div>
        </div>
        <div className="header-gold" title="金币">
          <T1Art kind="ui" id="gold" alt="" className="header-gold-art" />
          <span className="header-gold-value">{props.gold ?? 0}</span>
        </div>
        {typeof props.totalLevel === "number" && (
          <div className="header-total-level" title="总等级 = 各技能等级之和（含战斗）">
            <span className="header-total-level-label">总等级</span>
            <span className="header-total-level-value">{props.totalLevel}</span>
          </div>
        )}
      </div>

      <div className="header-center">
        <div
          className={`activity-status-center${props.cycleCompleteFlash ? " cycle-complete" : ""}${showActivity ? "" : " activity-idle"}`}
        >
          <div className="activity-icon-animated">
            {props.battleActive ? "战" : enhancing ? "强" : props.currentActivity?.mark || activityLabel(props.activeTab)}
          </div>
          {((props.currentActivity && !props.battleActive) || enhancing) && (
            <div className="activity-progress-ring">
              <svg viewBox="0 0 36 36" className="progress-ring-svg">
                <path
                  className="progress-ring-bg"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="progress-ring-fill"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  style={{ strokeDasharray: `${enhancing ? enhancePct : props.progress}, 100` }}
                />
              </svg>
              <span className="progress-ring-text">{enhancing ? enhancePct : props.progress}%</span>
            </div>
          )}
          <div className="activity-details">
            <div className="activity-name">
              {props.battleActive
                ? props.battleMonsterName
                : enhancing
                  ? `强化 ${props.enhanceRun!.itemName} +${props.enhanceRun!.level} → +${props.enhanceRun!.target}`
                  : props.currentActivity
                    ? props.currentActivity.name
                    : "空闲"}
              {!props.battleActive && !enhancing && props.currentActivity && (props.batchTotal ?? 1) > 1 && (
                <span className="activity-batch"> ×{props.batchTotal}</span>
              )}
            </div>
            <div className="activity-countdown">
              {props.battleActive
                ? "自动战斗"
                : enhancing
                  ? `下一次尝试 ${Math.ceil(enhanceRemainingMs / 1000)} 秒`
                  : props.currentActivity
                    ? `${Math.ceil((props.currentActivity.duration * (100 - props.progress)) / 100)}/${props.currentActivity.duration}秒` +
                      ((props.batchTotal ?? 1) > 1 && typeof props.batchRemaining === "number" ? ` · 还剩 ${props.batchRemaining} 件` : "")
                    : "点左侧任一技能开始干活"}
            </div>
          </div>
          {enhancing && (
            <button className="stop-activity-btn-center" onClick={props.onStopEnhance} title="停止强化">
              停止
            </button>
          )}
          {props.currentActivity && !props.battleActive && !enhancing && (
            <button className="stop-activity-btn-center" onClick={props.onStopActivity} title="停止采集">
              停止
            </button>
          )}
          {props.battleActive && (
            <button className="stop-activity-btn-center" onClick={props.onStopBattle} title="停止战斗">
              停止
            </button>
          )}
        </div>

        {props.rewardNotification.show && (
          <div className="reward-notification" key={props.rewardNotification.key}>
            <div className="reward-item">
              <span className="reward-text">+{props.rewardNotification.xp} 经验</span>
            </div>
            <div className="reward-item">
              <span className="reward-text">+{props.rewardNotification.gold} 金</span>
            </div>
          </div>
        )}
      </div>

      <div className="header-right" ref={menuRef}>
        <button
          className="header-menu-btn"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          生涯
          {(showClaim || showCheckin) && (
            <span className="prog-entry-dot">{showClaim ? props.claimableCount : "!"}</span>
          )}
        </button>
        {menuOpen && (
          <div className="header-menu" role="menu">
            {groups.map((group) => (
              <div key={group.title} className="header-menu-group">
                <div className="header-menu-group-title">{group.title}</div>
                {group.items.map((id) => {
                  const locked = isLocked(group.title);
                  return (
                    <button
                      key={id}
                      className={`header-menu-item${locked ? " locked" : ""}`}
                      role="menuitem"
                      disabled={locked}
                      title={locked ? "第二章开放" : undefined}
                      onClick={() => {
                        if (locked) return;
                        props.onOpenProg(id);
                        setMenuOpen(false);
                      }}
                    >
                      <span>{LABELS[id]}</span>
                      {locked && <span className="header-menu-badge muted">第二章</span>}
                      {!locked && HINT[id] === "claim" && props.claimableCount > 0 && (
                        <span className="header-menu-badge">{props.claimableCount}</span>
                      )}
                      {!locked && HINT[id] === "checkin" && props.checkInAvailable && (
                        <span className="header-menu-badge">新</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
