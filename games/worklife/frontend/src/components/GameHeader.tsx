import { useEffect, useRef, useState } from "react";

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

const MENU: Array<{ id: ProgPanelId; label: string; hint?: "claim" | "checkin" }> = [
  { id: "daily", label: "每日任务" },
  { id: "achievements", label: "成就", hint: "claim" },
  { id: "checkin", label: "签到", hint: "checkin" },
  { id: "shop", label: "商店" },
  { id: "buffs", label: "增益" },
  { id: "stats", label: "生涯统计" },
  { id: "reputation", label: "声望" },
  { id: "bounties", label: "赏金契约" },
  { id: "prestige", label: "转生" },
  { id: "settings", label: "设置" },
];

type Props = {
  playerMode?: string;
  currentActivity: { name: string; duration: number; mark?: string } | null;
  battleActive: boolean;
  battleMonsterName?: string;
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
  const showActivity =
    (props.currentActivity && props.playerMode === "life_action") || props.battleActive;

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

  return (
    <header className="game-header">
      <div className="header-left">
        <div className="game-logo">
          <div className="logo-icon">工</div>
          <div className="logo-text">
            <span className="logo-title">异世界の</span>
            <span className="logo-subtitle">打工生活</span>
          </div>
        </div>
        <div className="header-gold" title="金币">
          <span className="header-gold-label">金</span>
          <span className="header-gold-value">{props.gold ?? 0}</span>
        </div>
      </div>

      <div className="header-center">
        {showActivity && (
          <div className={`activity-status-center${props.cycleCompleteFlash ? " cycle-complete" : ""}`}>
            <div className="activity-icon-animated">
              {props.battleActive ? "战" : props.currentActivity?.mark || activityLabel(props.activeTab)}
            </div>
            {props.currentActivity && !props.battleActive && (
              <div className="activity-progress-ring">
                <svg viewBox="0 0 36 36" className="progress-ring-svg">
                  <path
                    className="progress-ring-bg"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="progress-ring-fill"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    style={{ strokeDasharray: `${props.progress}, 100` }}
                  />
                </svg>
                <span className="progress-ring-text">{props.progress}%</span>
              </div>
            )}
            <div className="activity-details">
              <div className="activity-name">
                {props.battleActive
                  ? props.battleMonsterName
                  : props.currentActivity
                    ? props.currentActivity.name
                    : ""}
              </div>
              <div className="activity-countdown">
                {props.battleActive
                  ? "自动战斗"
                  : props.currentActivity
                    ? `${Math.ceil((props.currentActivity.duration * (100 - props.progress)) / 100)}/${props.currentActivity.duration}秒`
                    : ""}
              </div>
            </div>
            {props.currentActivity && !props.battleActive && (
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
        )}

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
          {(props.claimableCount > 0 || props.checkInAvailable) && (
            <span className="prog-entry-dot">{props.claimableCount > 0 ? props.claimableCount : "!"}</span>
          )}
        </button>
        {menuOpen && (
          <div className="header-menu" role="menu">
            {MENU.map((item) => (
              <button
                key={item.id}
                className="header-menu-item"
                role="menuitem"
                onClick={() => {
                  props.onOpenProg(item.id);
                  setMenuOpen(false);
                }}
              >
                <span>{item.label}</span>
                {item.hint === "claim" && props.claimableCount > 0 && (
                  <span className="header-menu-badge">{props.claimableCount}</span>
                )}
                {item.hint === "checkin" && props.checkInAvailable && (
                  <span className="header-menu-badge">新</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
