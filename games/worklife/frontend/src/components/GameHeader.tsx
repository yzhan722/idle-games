import { useEffect, useRef, useState } from "react";
import { GuildFramedAvatar, T1Art } from "./T1Art";
import { CAREER_GROUPS } from "../gameplay/ia";

export type ProgPanelId =
  | "achievements"
  | "daily"
  | "settings"
  | "checkin"
  | "reputation"
  | "workshop"
  | "caravan"
  | "cauldron"
  | "relics"
  | "forge"
  | "harbor"
  | "academy"
  | "arena"
  | "ranch"
  | "tavern"
  | "airship"
  | "mine"
  | "abyss"
  | "prestige";

// 菜单名与顶栏胶囊同名（≤4 字），完整名称见各面板标题
const LABELS: Record<ProgPanelId, string> = {
  daily: "每日任务",
  achievements: "成就",
  checkin: "签到",
  reputation: "声望军需",
  workshop: "铭纹图鉴",
  caravan: "远征商队",
  cauldron: "魔药釜",
  relics: "圣物馆",
  forge: "天空锻炉",
  harbor: "港湾大赛",
  academy: "学院节庆",
  arena: "竞技城镇",
  ranch: "牧场天候",
  tavern: "酒馆编年",
  airship: "飞艇试炼",
  mine: "矿脉驿站",
  abyss: "潜航会战",
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
  battleSubtitle?: string;
  /** Timed enhancing: shown in the activity slot like any other action. */
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
  /** Total level (sum of skill levels incl. combat); hidden in chapter 1. */
  totalLevel?: number;
  chapterComplete?: boolean;
  equippedTitle?: { titleLabel: string; iconId: string } | null;
  playerAvatar?: string;
  playerGender?: string;
  equippedGuildFrame?: { id: string; label: string } | null;
  onOpenGuildBounty?: () => void;
};

function activityArtId(tab: string, activityName?: string): string {
  const n = activityName || "";
  if (tab === "logging" || /伐|原木|树/.test(n)) return "nav-logging";
  if (tab === "mining" || /矿|挖/.test(n)) return "nav-mining";
  if (tab === "farming" || /农|种|麦/.test(n)) return "nav-farming";
  if (tab === "fishing" || /钓|鱼/.test(n)) return "nav-fishing";
  if (tab === "gathering" || /采|草|果/.test(n)) return "nav-gathering";
  if (tab === "crystal_mining" || /晶/.test(n)) return "nav-crystal";
  if (tab === "husbandry" || /牧|养/.test(n)) return "nav-husbandry";
  if (tab === "cooking" || /烹|烤|汤/.test(n)) return "nav-cooking";
  if (tab === "smithing" || /锻|锭|剑|甲/.test(n)) return "nav-smithing";
  if (tab === "tailoring" || /缝|布|袍/.test(n)) return "nav-tailoring";
  if (tab === "alchemy" || /炼|药/.test(n)) return "nav-alchemy";
  if (tab === "woodworking" || tab.includes("craft") || /木板|木工/.test(n)) return "nav-woodworking";
  if (tab === "enhance") return "nav-enhance";
  if (tab === "trading") return "nav-trading";
  if (tab === "inventory") return "nav-inventory";
  if (tab === "character") return "nav-character";
  if (tab === "tasks") return "nav-tasks";
  if (tab === "houses") return "nav-houses";
  if (tab === "party") return "nav-party";
  if (tab === "adventure" || tab === "combat") return "nav-adventure";
  return "logo";
}

const fmtSec = (s: number) => (Number.isInteger(s) ? `${s}` : s.toFixed(1));

export function GameHeader(props: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const enhancing = !!props.enhanceRun && props.playerMode === "enhancing";
  const showActivity =
    (props.currentActivity && props.playerMode === "life_action") || props.battleActive || enhancing;
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    if (!enhancing) return;
    setTick(Date.now());
    const id = window.setInterval(() => setTick(Date.now()), 50);
    return () => window.clearInterval(id);
  }, [enhancing, props.enhanceRun?.nextAttemptAt]);
  const enhanceRemainingMs = props.enhanceRun ? Math.max(0, props.enhanceRun.nextAttemptAt - tick) : 0;
  const enhancePct = props.enhanceRun
    ? Math.min(100, Math.max(0, 100 - (enhanceRemainingMs / Math.max(1, props.enhanceRun.intervalMs)) * 100))
    : 0;
  const activePct = enhancing ? enhancePct : Math.min(100, Math.max(0, props.progress));

  useEffect(() => {
    const base = "异世界の打工生活 · 奇幻放置冒险与工坊";
    if (props.battleActive && props.battleMonsterName) {
      document.title = `[讨伐] ${props.battleMonsterName} | ${base}`;
    } else if (enhancing && props.enhanceRun) {
      document.title = `[强化] ${props.enhanceRun.itemName} +${props.enhanceRun.level} | ${base}`;
    } else if (props.currentActivity && props.playerMode === "life_action") {
      document.title = `[作业] ${props.currentActivity.name} | ${base}`;
    } else {
      document.title = `${base} RPG`;
    }
  }, [
    props.battleActive,
    props.battleMonsterName,
    enhancing,
    props.enhanceRun?.itemName,
    props.enhanceRun?.level,
    props.currentActivity?.name,
    props.playerMode,
  ]);

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
  // 声望 / 赏金契约 / 转生 本身已带等级门槛（面板内显示解锁条件），入口在第一章通关后即可见，
  // 避免功能完全不可达；数值门槛仍由各面板自身把关。
  const lockedGroupTitles = new Set<string>();
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
        {props.equippedTitle && (
          <button
            type="button"
            className="header-rep-title-pill"
            onClick={() => props.onOpenProg("reputation")}
            title="声望专属名号（点击打开声望军需官商店）"
          >
            <T1Art kind="skills" id={props.equippedTitle.iconId} alt="" className="header-rep-title-icon" />
            <span>{props.equippedTitle.titleLabel}</span>
          </button>
        )}
        {props.equippedGuildFrame && (
          <button
            type="button"
            className="header-guild-frame-pill"
            onClick={props.onOpenGuildBounty}
            title="公会专属边框（点击前往每日词缀讨伐委托板）"
          >
            <GuildFramedAvatar
              avatar={props.playerAvatar}
              gender={props.playerGender}
              frameId={props.equippedGuildFrame.id}
              size={24}
            />
            <span>{props.equippedGuildFrame.label}</span>
          </button>
        )}
      </div>

      <div className="header-center">
        <div
          className={`activity-status-center${props.cycleCompleteFlash ? " cycle-complete" : ""}${showActivity ? "" : " activity-idle"}`}
        >
          <div className="activity-icon-animated">
            {props.battleActive ? (
              <T1Art kind="ui" id="nav-adventure" alt="" className="header-gold-art" />
            ) : enhancing ? (
              <T1Art kind="ui" id="nav-enhance" alt="" className="header-gold-art" />
            ) : (
              <T1Art kind="ui" id={activityArtId(props.activeTab, props.currentActivity?.name)} alt="" className="header-gold-art" />
            )}
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
                  style={{ strokeDasharray: `${activePct.toFixed(1)}, 100` }}
                />
              </svg>
              <span className="progress-ring-text">{Math.floor(activePct)}%</span>
            </div>
          )}
          <div className="activity-details">
            <div className="activity-name">
              {props.battleActive
                ? props.battleMonsterName || "战斗中"
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
                ? props.battleSubtitle || "自动战斗"
                : enhancing
                  ? `下一次尝试 ${(enhanceRemainingMs / 1000).toFixed(1)}/${fmtSec(props.enhanceRun!.intervalMs / 1000)}秒 (${Math.floor(enhancePct)}%)`
                  : props.currentActivity
                    ? `${((props.currentActivity.duration * Math.max(0, 100 - activePct)) / 100).toFixed(1)}/${fmtSec(props.currentActivity.duration)}秒 (${Math.floor(activePct)}%) · 约${Math.round(3600 / Math.max(0.5, props.currentActivity.duration))}/时` +
                      ((props.batchTotal ?? 1) > 1 && typeof props.batchRemaining === "number" ? ` · 剩 ${props.batchRemaining} 件` : "")
                    : "选择技能开始采集、制作或冒险"}
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
        {props.chapterComplete && (
          <>
            <button
              type="button"
              data-testid="header-tavern-chronicle-btn"
              className="header-tavern-pill"
              onClick={() => props.onOpenProg("tavern")}
              title="吟游诗人酒馆与冒险者编年史"
            >
              <T1Art kind="skills" id="bard_tavern" alt="" className="header-caravan-pill-icon" />
              <span>酒馆编年</span>
            </button>
            <button
              type="button"
              data-testid="header-beast-weather-btn"
              className="header-ranch-pill"
              onClick={() => props.onOpenProg("ranch")}
              title="契约魔兽牧场与天候观星塔"
            >
              <T1Art kind="skills" id="beast_ranch" alt="" className="header-caravan-pill-icon" />
              <span>牧场天候</span>
            </button>
            <button
              type="button"
              data-testid="header-arena-town-btn"
              className="header-arena-pill"
              onClick={() => props.onOpenProg("arena")}
              title="天空竞技场赛季排位与公会领地城镇建设"
            >
              <T1Art kind="skills" id="sky_arena" alt="" className="header-caravan-pill-icon" />
              <span>竞技城镇</span>
            </button>
            <button
              type="button"
              data-testid="header-academy-festival-btn"
              className="header-academy-pill"
              onClick={() => props.onOpenProg("academy")}
              title="冒险者学院进修课程与四季节庆活动日历"
            >
              <T1Art kind="skills" id="academy_crest" alt="" className="header-caravan-pill-icon" />
              <span>学院节庆</span>
            </button>
            <button
              type="button"
              data-testid="header-harbor-derby-btn"
              className="header-harbor-pill"
              onClick={() => props.onOpenProg("harbor")}
              title="港湾垂钓大赛与水族馆"
            >
              <T1Art kind="skills" id="fishing_trophy" alt="" className="header-caravan-pill-icon" />
              <span>港湾大赛</span>
            </button>
            <button
              type="button"
              data-testid="header-sky-forge-btn"
              className="header-forge-pill"
              onClick={() => props.onOpenProg("forge")}
              title="天空锻炉与秘境契约"
            >
              <T1Art kind="skills" id="sky_forge" alt="" className="header-caravan-pill-icon" />
              <span>天空锻炉</span>
            </button>
            <button
              type="button"
              data-testid={props.activeTab === "adventure" ? "header-relics-shortcut-btn" : "open-astral-relics-btn"}
              className="header-relics-pill"
              onClick={() => props.onOpenProg("relics")}
              title="遗迹勘探与圣物陈列馆"
            >
              <T1Art kind="skills" id="astral_ruin_compass" alt="" className="header-caravan-pill-icon" />
              <span>圣物馆</span>
            </button>
            <button
              type="button"
              data-testid={props.activeTab === "alchemy" ? "header-cauldron-shortcut-btn" : "open-alchemy-cauldron-btn"}
              className="header-cauldron-pill"
              onClick={() => props.onOpenProg("cauldron")}
              title="奇美拉魔药釜与共鸣槽"
            >
              <T1Art kind="skills" id="alchemy_cauldron_hub" alt="" className="header-caravan-pill-icon" />
              <span>魔药釜</span>
            </button>
            <button
              type="button"
              data-testid={props.activeTab === "trading" ? "header-caravan-shortcut-btn" : "open-caravan-trade-btn"}
              className="header-caravan-pill"
              onClick={() => props.onOpenProg("caravan")}
              title="远征商队与契约柜台"
            >
              <T1Art kind="skills" id="caravan_hub_banner" alt="" className="header-caravan-pill-icon" />
              <span>远征商队</span>
            </button>
          </>
        )}
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
