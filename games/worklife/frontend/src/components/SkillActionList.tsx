import { T1Art } from "./T1Art";
import { T1ItemIcon } from "./T1Art";
import type { SkillActionRow } from "../gameplay/skillActions";

type Props = {
  rows: SkillActionRow[];
  skillName: string;
  skillLevel: number;
  runningActionId?: string;
  /** Legacy card ids that have T1 illustrations (poplar today). */
  artIds?: Set<string>;
  nameOf: (itemId: string) => string;
  iconOf: (itemId: string) => string;
  onOpen: (row: SkillActionRow) => void;
  /** Per-row hint under the title (chapter goal etc.). */
  hintFor?: (row: SkillActionRow) => string | null;
};

const secs = (ms: number) => (ms % 1000 === 0 ? `${ms / 1000}s` : `${(ms / 1000).toFixed(1)}s`);

/**
 * MWI-style skill page body: a level-ordered list of actions. Unlocked rows show time / XP /
 * output; locked rows stay visible (dimmed) with the level that unlocks them, so the player can see
 * what the next levels buy. The running action gets the same green marker as the sidebar.
 */
export function SkillActionList(props: Props) {
  const next = props.rows.find((r) => !r.unlocked);
  return (
    <div className="skill-action-list" data-count={props.rows.length}>
      {props.rows.map((row) => {
        const a = row.action;
        const running = props.runningActionId === a.id;
        const hasArt = row.cardId ? props.artIds?.has(row.cardId) : false;
        const hint = props.hintFor?.(row) || null;
        return (
          <button
            type="button"
            key={a.id}
            className={`skill-action-row${row.unlocked ? "" : " locked"}${running ? " running" : ""}${hasArt ? " has-art" : ""}`}
            data-action-id={a.id}
            aria-label={row.title || a.name}
            data-locked={!row.unlocked || undefined}
            onClick={() => props.onOpen(row)}
          >
            <span className="sar-art" aria-hidden="true">
              {hasArt && row.cardId ? (
                <T1Art kind="tree" id={row.cardId} fallback="" alt="" />
              ) : row.primaryYield ? (
                <T1ItemIcon itemId={row.primaryYield.itemId} fallback={props.iconOf(row.primaryYield.itemId)} alt="" />
              ) : null}
            </span>
            <span className="sar-main">
              <span className="sar-head">
                <span className="sar-name">
                  {row.title || a.name}
                  {row.title && row.title !== a.name && <small className="sar-verb">{a.name}</small>}
                </span>
                {row.unlocked ? (
                  <span className="sar-req">Lv.{row.requiredLevel}</span>
                ) : (
                  <span className="sar-req sar-locked">🔒 Lv.{row.requiredLevel}</span>
                )}
              </span>
              <span className="sar-meta">
                <span>{secs(a.duration)}</span>
                <span>·</span>
                <span>{a.xp} XP</span>
                {row.primaryYield && (
                  <>
                    <span>·</span>
                    <span className="sar-out">
                      {props.nameOf(row.primaryYield.itemId)}
                      {row.primaryYield.qty > 1 ? ` ×${row.primaryYield.qty}` : ""}
                    </span>
                  </>
                )}
                {row.rareYields.map((y) => (
                  <span key={y.itemId} className="sar-rare">
                    · {props.nameOf(y.itemId)} {Math.round(y.chance * 1000) / 10}%
                  </span>
                ))}
              </span>
              {hint && <span className="sar-hint">{hint}</span>}
              {!row.unlocked && (
                <span className="sar-hint muted">
                  {props.skillName}再升 {row.levelsToGo} 级解锁
                </span>
              )}
            </span>
            {running && <span className="skill-running-dot" aria-label="进行中" />}
          </button>
        );
      })}
      {props.rows.length === 0 && <div className="sar-empty">这个技能还没有可用的动作</div>}
      {next && props.rows.filter((r) => r.unlocked).length === props.rows.indexOf(next) && (
        <div className="sar-next">
          {props.skillName} Lv.{props.skillLevel} → 下一个解锁：{next.action.name}（Lv.{next.requiredLevel}）
        </div>
      )}
    </div>
  );
}
