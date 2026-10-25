import { T1Art } from "./T1Art";
import { T1ItemIcon } from "./T1Art";
import type { SkillActionRow } from "../gameplay/skillActions";

type Props = {
  rows: SkillActionRow[];
  skillName: string;
  skillLevel: number;
  runningActionId?: string;
  /** ISO timestamp of when the running action's current cycle started (drives the row progress bar). */
  runningStartedAt?: string;
  /** Live 0..100 progress percentage synchronized with the header activity ring. */
  runningProgress?: number;
  /** Server-settled effective cycle duration in ms (accounting for tool/perk/buff speed). */
  runningEffectiveDurationMs?: number;
  /** Legacy card ids that have T1 illustrations (poplar today). */
  artIds?: Set<string>;
  nameOf: (itemId: string) => string;
  iconOf: (itemId: string) => string;
  onOpen: (row: SkillActionRow) => void;
  /** Quick start (unlocked row) / stop (running row) without opening the modal. */
  onQuickToggle?: (row: SkillActionRow) => void;
  /** Per-row hint under the title (chapter goal etc.). */
  hintFor?: (row: SkillActionRow) => string | null;
};

const secs = (ms: number) => (ms % 1000 === 0 ? `${ms / 1000}s` : `${(ms / 1000).toFixed(1)}s`);

/**
 * MWI-style skill page body: a level-ordered list of actions. Unlocked rows show time / XP /
 * output; locked rows keep their yields as a preview but lead with the unlock requirement.
 */
export function SkillActionList(props: Props) {
  const next = props.rows.find((r) => !r.unlocked);
  const now = Date.now();
  return (
    <div className="skill-action-list" data-count={props.rows.length}>
      {props.rows.map((row) => {
        const a = row.action;
        const running = props.runningActionId === a.id;
        const hasArt = row.cardId ? props.artIds?.has(row.cardId) : false;
        const hint = props.hintFor?.(row) || null;
        const startMs = running && props.runningStartedAt ? Date.parse(props.runningStartedAt) : NaN;
        const effectiveDurMs =
          running && props.runningEffectiveDurationMs && props.runningEffectiveDurationMs > 0
            ? props.runningEffectiveDurationMs
            : a.duration;
        const fallbackPct =
          Number.isFinite(startMs) && effectiveDurMs > 0
            ? ((((now - startMs) % effectiveDurMs) + effectiveDurMs) % effectiveDurMs / effectiveDurMs) * 100
            : 0;
        const pct =
          running && typeof props.runningProgress === "number" && Number.isFinite(props.runningProgress)
            ? Math.min(100, Math.max(0, props.runningProgress))
            : fallbackPct;
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
                <span className="sar-name">{row.title || a.name}</span>
                {row.unlocked ? (
                  <span className="sar-req">
                    {running && <span className="sar-progress-pct">{Math.floor(pct)}% · </span>}
                    Lv.{row.requiredLevel}
                  </span>
                ) : (
                  <span className="sar-req sar-locked">🔒 再升 {row.levelsToGo} 级</span>
                )}
              </span>
              <span className="sar-meta">
                <span>{secs(running ? effectiveDurMs : a.duration)}</span>
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
            </span>
            {running && (
              <span className="sar-progress" aria-hidden="true">
                <span
                  className="sar-progress-fill"
                  style={{ width: `${pct}%` }}
                />
              </span>
            )}
            {running && <span className="skill-running-dot" aria-label="进行中" />}
            {props.onQuickToggle && row.unlocked && (
              <span
                role="button"
                tabIndex={0}
                className={`sar-quick${running ? " stop" : ""}`}
                title={running ? "停止" : "直接开始（不限次）"}
                aria-label={running ? `停止 ${row.title || a.name}` : `开始 ${row.title || a.name}`}
                onClick={(e) => { e.stopPropagation(); props.onQuickToggle?.(row); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    props.onQuickToggle?.(row);
                  }
                }}
              >
                {running ? "■" : "▶"}
              </span>
            )}
          </button>
        );
      })}
      {props.rows.length === 0 && <div className="sar-empty">这个技能还没有可用的动作</div>}
      {next && (
        <div className="sar-next">
          {props.skillName} Lv.{props.skillLevel} → 下一个解锁：{next.title || next.action.name}（Lv.{next.requiredLevel}）
        </div>
      )}
    </div>
  );
}
