import { T1Art } from "./T1Art";
import { SKILL_NAV_GROUP_TITLES, type SkillNavGroup, type SkillNavItem } from "../gameplay/skillNav";
import { xpProgress } from "../gameplay/xp";

export type SkillRowState = { level: number; xp: number };

/** Resolve a nav row's level / xp from the player's skill records (shared by rail and mobile sheets). */
export function rowState(
  item: SkillNavItem,
  skills: Record<string, SkillRowState | undefined>,
  combat: SkillRowState,
  combatSkills?: Record<string, SkillRowState | undefined>
): SkillRowState | undefined {
  if (!item.skillKey) return undefined;
  if (item.skillKey === "combat") return combat;
  if (item.skillKey.startsWith("combat:")) return combatSkills?.[item.skillKey.slice("combat:".length)];
  return skills[item.skillKey];
}

type Props = {
  items: SkillNavItem[];
  activeTab: string;
  /** Row hosting the action that is running right now (green pulse). */
  runningId?: string;
  skills: Record<string, SkillRowState | undefined>;
  combat: SkillRowState;
  /** MWI combat skills (stamina / intelligence / attack / defense / melee). */
  combatSkills?: Record<string, SkillRowState | undefined>;
  lockedIds?: Set<string>;
  /** Rows the current chapter goal points at (rendered with a small 推荐 tag, never hidden). */
  recommendedIds?: Set<string>;
  /** Attention badges by nav id (MWI: claimable tasks, ready gift …). */
  badges?: Record<string, number | undefined>;
  onSelect: (id: string) => void;
  onLocked?: (id: string) => void;
  /** Collapsed = icon rail (desktop narrow / mobile bottom bar renders differently). */
  compact?: boolean;
};

const GROUP_ORDER: SkillNavGroup[] = ["gathering", "production", "combat", "system"];

/**
 * MWI-style left rail: one row per skill with level + XP bar, grouped, running action highlighted.
 * Replaces the four-button GameActionNav once chapter 1 is complete; before that the same component
 * renders just the four chapter-1 rows so the shell does not change shape mid-tutorial.
 */
export function SkillSidebar(props: Props) {
  const groups = GROUP_ORDER.map((g) => ({ group: g, items: props.items.filter((i) => i.group === g) })).filter((g) => g.items.length > 0);
  const stateFor = (item: SkillNavItem): SkillRowState | undefined => rowState(item, props.skills, props.combat, props.combatSkills);
  return (
    <nav className={`game-tabs skill-sidebar${props.compact ? " compact" : ""}`} aria-label="主要行动" data-count={props.items.length}>
      {groups.map(({ group, items }) => (
        <div className="skill-group" key={group} data-group={group}>
          {groups.length > 1 && <div className="skill-group-title">{SKILL_NAV_GROUP_TITLES[group]}</div>}
          {items.map((item) => {
            const st = stateFor(item);
            const prog = st ? xpProgress(st.level, st.xp) : null;
            const locked = props.lockedIds?.has(item.id) || false;
            const recommended = props.recommendedIds?.has(item.id) || false;
            // Readout rows (combat skills) never take the active highlight; the page they open does.
            const active = props.activeTab === item.id && !item.opensTab;
            const running = props.runningId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                title={
                  locked
                    ? `${item.name}（未解锁）`
                    : st && prog
                      ? `${item.name} Lv.${st.level} · ${Math.floor(st.xp)}/${Number.isFinite(prog.need) ? prog.need : "MAX"} XP (${Math.floor(prog.pct)}%)`
                      : item.name
                }
                aria-label={item.ariaLabel || item.name}
                aria-current={active ? "page" : undefined}
                aria-disabled={locked || undefined}
                data-nav-id={item.id}
                onClick={() => {
                  if (locked) { props.onLocked?.(item.id); return; }
                  props.onSelect(item.id);
                }}
                className={`tab-btn skill-row${active ? " active" : ""}${locked ? " locked" : ""}${running ? " running" : ""}${recommended ? " recommended" : ""}`}
              >
                <span className="tab-icon" aria-hidden="true">
                  {item.icon ? <T1Art kind="ui" id={item.icon} fallback={item.emoji} alt="" /> : <span className="skill-emoji">{item.emoji}</span>}
                </span>
                <span className="skill-row-main">
                  <span className="skill-row-head">
                    <span className="tab-name">{item.name}</span>
                    {recommended && !active && <span className="skill-recommended" aria-label="第一章推荐">推荐</span>}
                    {(props.badges?.[item.id] || 0) > 0 && (
                      <span className="skill-badge" aria-label={`${props.badges![item.id]} 项待处理`}>{props.badges![item.id]}</span>
                    )}
                    {st && <span className="skill-level">{st.level}</span>}
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
      ))}
    </nav>
  );
}
