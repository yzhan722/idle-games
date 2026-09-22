import { T1ItemIcon } from "./T1Art";

export type CraftRecipeView = {
  id: string;
  name: string;
  output: string;
  outputCount: number;
  requires: Array<{ item: string; count: number }>;
  time: number;
  xp: number;
  level: number;
  type?: string;
  atk?: number;
  def?: number;
  hp?: number;
};

type Props = {
  recipes: CraftRecipeView[];
  skillName: string;
  skillLevel: number;
  inventory: Record<string, number>;
  runningActionId?: string;
  favorites: Set<string>;
  nameOf: (itemId: string) => string;
  iconOf: (itemId: string) => string;
  /** Resolves a `requires.item` (may be a name or an id) to an item id. */
  resolveItemId: (raw: string) => string;
  whyLine?: (recipe: CraftRecipeView) => string;
  onOpen: (recipe: CraftRecipeView) => void;
  onToggleFavorite: (id: string) => void;
};

const secs = (s: number) => (Number.isInteger(s) ? `${s}s` : `${s.toFixed(1)}s`);

/**
 * MWI-style production list: one row per recipe, level-ordered, locked rows dimmed with the unlock
 * level, inputs shown as have/need chips (green when enough, amber when short), output with T1 art.
 */
export function CraftRecipeList(props: Props) {
  const rows = [...props.recipes].sort((a, b) => a.level - b.level || a.time - b.time);
  const next = rows.find((r) => r.level > props.skillLevel);
  return (
    <div className="craft-recipe-list" data-count={rows.length}>
      {rows.map((r) => {
        const unlocked = r.level <= props.skillLevel;
        const running = props.runningActionId === r.id;
        const inputs = r.requires.map((req) => {
          const id = props.resolveItemId(req.item);
          const have = props.inventory[id] || 0;
          return { id, need: req.count, have, ok: have >= req.count };
        });
        const canCraft = unlocked && inputs.every((i) => i.ok);
        const maxNow = inputs.length ? Math.min(...inputs.map((i) => Math.floor(i.have / i.need))) : 0;
        const fav = props.favorites.has(r.id);
        return (
          <button
            type="button"
            key={r.id}
            className={`craft-row${unlocked ? "" : " locked"}${running ? " running" : ""}${canCraft ? " ready" : unlocked ? " short" : ""}`}
            data-action-id={r.id}
            aria-label={r.name}
            data-locked={!unlocked || undefined}
            onClick={() => props.onOpen(r)}
          >
            <span className="sar-art" aria-hidden="true">
              <T1ItemIcon itemId={r.output} fallback={props.iconOf(r.output)} alt="" />
            </span>
            <span className="sar-main">
              <span className="sar-head">
                <span className="sar-name">
                  {r.name}
                  {props.whyLine && <small className="sar-verb">{props.whyLine(r)}</small>}
                </span>
                <span className="craft-row-right">
                  {unlocked ? <span className="sar-req">Lv.{r.level}</span> : <span className="sar-req sar-locked">🔒 Lv.{r.level}</span>}
                  <span
                    role="button"
                    tabIndex={-1}
                    className={`craft-row-fav${fav ? " active" : ""}`}
                    title={fav ? "取消收藏" : "收藏配方"}
                    onClick={(e) => { e.stopPropagation(); props.onToggleFavorite(r.id); }}
                  >
                    {fav ? "★" : "☆"}
                  </span>
                </span>
              </span>
              <span className="sar-meta">
                <span>{secs(r.time)}</span>
                <span>·</span>
                <span>{r.xp} XP</span>
                <span>·</span>
                <span className="sar-out">
                  {props.nameOf(r.output)}
                  {r.outputCount > 1 ? ` ×${r.outputCount}` : ""}
                </span>
              </span>
              <span className="craft-row-inputs">
                {inputs.map((i) => (
                  <span key={i.id} className={`craft-input${i.ok ? " ok" : " short"}`} title={props.nameOf(i.id)}>
                    <T1ItemIcon itemId={i.id} fallback={props.iconOf(i.id)} alt="" />
                    <span className="craft-input-count">
                      {i.have}/{i.need}
                    </span>
                  </span>
                ))}
                {unlocked && inputs.length > 0 && (
                  <span className={`craft-row-max${maxNow > 0 ? " ok" : ""}`}>
                    {maxNow > 0 ? `可做 ${maxNow}` : "材料不够"}
                  </span>
                )}
              </span>
              {!unlocked && (
                <span className="sar-hint muted">
                  {props.skillName}再升 {r.level - props.skillLevel} 级解锁
                </span>
              )}
            </span>
            {running && <span className="skill-running-dot" aria-label="进行中" />}
          </button>
        );
      })}
      {rows.length === 0 && <div className="sar-empty">这个分类还没有配方</div>}
      {next && (
        <div className="sar-next">
          {props.skillName} Lv.{props.skillLevel} → 下一个解锁：{next.name}（Lv.{next.level}）
        </div>
      )}
    </div>
  );
}
