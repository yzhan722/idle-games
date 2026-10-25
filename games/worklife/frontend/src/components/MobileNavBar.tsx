import { T1Art } from "./T1Art";
import { MOBILE_NAV_GROUPS, SKILL_NAV, mobileGroupForTab, type MobileNavGroup, type SkillNavItem } from "../gameplay/skillNav";
import { xpProgress } from "../gameplay/xp";
import { rowState, type SkillRowState } from "./SkillSidebar";

type SheetId = "gathering" | "production" | "more";

type Props = {
  activeTab: string;
  runningId?: string;
  skills: Record<string, SkillRowState | undefined>;
  combat: SkillRowState;
  combatSkills?: Record<string, SkillRowState | undefined>;
  recommendedIds?: Set<string>;
  lockedIds?: Set<string>;
  /** Attention badges by nav id; the group button shows the sum of its rows. */
  badges?: Record<string, number | undefined>;
  openSheet: SheetId | null;
  onOpenSheet: (id: SheetId | null) => void;
  onSelect: (id: string) => void;
  onLocked?: (id: string) => void;
};

/** Which sidebar rows a sheet lists. 更多 = system rows other than the character page. */
export function sheetItems(sheet: SheetId): SkillNavItem[] {
  if (sheet === "gathering") return SKILL_NAV.filter((s) => s.group === "gathering");
  if (sheet === "production") return SKILL_NAV.filter((s) => s.group === "production");
  return SKILL_NAV.filter((s) => s.group === "system" && s.id !== "character");
}

const SHEET_TITLES: Record<SheetId, string> = { gathering: "采集技能", production: "生产技能", more: "更多" };

/**
 * Mobile bottom navigation: five stable groups instead of a 17-item horizontal scroll. Gathering /
 * production / more open a picker sheet listing that group's rows with level + XP bar (the same
 * information the desktop sidebar shows); combat and character switch pages directly.
 */
export function MobileNavBar(props: Props) {
  const activeGroup = mobileGroupForTab(props.activeTab);
  const runningGroup = props.runningId ? mobileGroupForTab(props.runningId) : undefined;
  const stateFor = (item: SkillNavItem): SkillRowState | undefined => rowState(item, props.skills, props.combat, props.combatSkills);
  const groupHasRecommendation = (g: MobileNavGroup["id"]) =>
    [...(props.recommendedIds || [])].some((id) => mobileGroupForTab(id) === g && props.activeTab !== id);
  const groupBadge = (g: MobileNavGroup["id"]) =>
    Object.entries(props.badges || {}).reduce((sum, [id, n]) => sum + (mobileGroupForTab(id) === g ? n || 0 : 0), 0);

  const onGroup = (g: MobileNavGroup) => {
    if (g.id === "combat") { props.onOpenSheet(null); props.onSelect("adventure"); return; }
    if (g.id === "character") { props.onOpenSheet(null); props.onSelect("character"); return; }
    props.onOpenSheet(props.openSheet === g.id ? null : g.id);
  };

  return (
    <>
      {props.openSheet && (
        <div className="mobile-nav-sheet-backdrop" onClick={() => props.onOpenSheet(null)}>
          <div className="mobile-nav-sheet" role="dialog" aria-label={SHEET_TITLES[props.openSheet]} onClick={(e) => e.stopPropagation()}>
            <div className="mobile-nav-sheet-head">
              <strong>{SHEET_TITLES[props.openSheet]}</strong>
              <button type="button" className="mobile-nav-sheet-close" onClick={() => props.onOpenSheet(null)} aria-label="关闭">
                ✕
              </button>
            </div>
            <div className="mobile-nav-sheet-list">
              {sheetItems(props.openSheet).map((item) => {
                const st = stateFor(item);
                const prog = st ? xpProgress(st.level, st.xp) : null;
                const active = props.activeTab === item.id;
                const running = props.runningId === item.id;
                const recommended = props.recommendedIds?.has(item.id) || false;
                const locked = props.lockedIds?.has(item.id) || false;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`mobile-sheet-row${active ? " active" : ""}${running ? " running" : ""}${locked ? " locked" : ""}${recommended ? " recommended" : ""}`}
                    aria-label={item.ariaLabel || item.name}
                    aria-current={active ? "page" : undefined}
                    aria-disabled={locked || undefined}
                    data-nav-id={item.id}
                    onClick={() => {
                      if (locked) { props.onLocked?.(item.id); return; }
                      props.onOpenSheet(null);
                      props.onSelect(item.id);
                    }}
                  >
                    <span className="tab-icon" aria-hidden="true">
                      {item.icon ? <T1Art kind="ui" id={item.icon} fallback={item.emoji} alt="" /> : <span className="skill-emoji">{item.emoji}</span>}
                    </span>
                    <span className="mobile-sheet-row-main">
                      <span className="mobile-sheet-row-head">
                        <span className="tab-name">{item.name}</span>
                        {recommended && !active && <span className="skill-recommended">推荐</span>}
                        {(props.badges?.[item.id] || 0) > 0 && <span className="skill-badge">{props.badges![item.id]}</span>}
                        {st && <span className="skill-level">Lv.{st.level}{prog ? ` · ${Math.floor(prog.pct)}%` : ""}</span>}
                      </span>
                      {prog && (
                        <span className="skill-xp-bar" aria-hidden="true">
                          <span className="skill-xp-fill" style={{ width: `${Math.min(100, Math.max(0, prog.pct))}%` }} />
                        </span>
                      )}
                    </span>
                    {running && <span className="skill-running-dot" aria-label="进行中" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      <nav className="mobile-nav" aria-label="主要行动">
        {MOBILE_NAV_GROUPS.map((g) => {
          const active = activeGroup === g.id && !props.openSheet;
          const sheetOpen = props.openSheet === g.id;
          return (
            <button
              key={g.id}
              type="button"
              className={`mobile-nav-btn${active || sheetOpen ? " active" : ""}${runningGroup === g.id ? " running" : ""}${groupHasRecommendation(g.id) ? " recommended" : ""}`}
              aria-label={g.name}
              aria-current={active ? "page" : undefined}
              aria-expanded={g.id === "gathering" || g.id === "production" || g.id === "more" ? sheetOpen : undefined}
              data-mobile-group={g.id}
              onClick={() => onGroup(g)}
            >
              <span className="tab-icon" aria-hidden="true">
                {g.icon ? <T1Art kind="ui" id={g.icon} fallback={g.emoji} alt="" /> : <span className="skill-emoji">{g.emoji}</span>}
              </span>
              <span className="tab-name">{g.name}</span>
              {runningGroup === g.id && <span className="skill-running-dot" aria-label="进行中" />}
              {groupBadge(g.id) > 0 && <span className="skill-badge mobile-nav-badge">{groupBadge(g.id)}</span>}
            </button>
          );
        })}
      </nav>
    </>
  );
}
