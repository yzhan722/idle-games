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

const CRAFT_VERB_RE =
  /^(制作|冶炼|锻造|缝制|烹饪|调制|纺织|炼制|编织|凝铸|镶嵌|熔铸|雕琢|加冕|饲养|调配|晾晒|磨制|压榨|搅制|窖藏|鞣制|驯养|沤制|烧制|劈制|蒸制|烤制|窨制|慢炖|熬制|炙烤|染制|烹煮|烘制|煎制|缫制)/;

export function stripCraftVerb(name: string): string {
  if (!name) return name;
  if (name === "调制饮料") return "提神饮料";
  const stripped = name.replace(CRAFT_VERB_RE, "").trim();
  return stripped || name;
}

type Props = {
  recipes: CraftRecipeView[];
  skillName: string;
  skillLevel: number;
  inventory: Record<string, number>;
  runningActionId?: string;
  /** ISO timestamp of when the running recipe's current cycle started (drives the row progress bar). */
  runningStartedAt?: string;
  /** Live 0..100 progress percentage synchronized with the header activity ring. */
  runningProgress?: number;
  /** Server-settled effective cycle duration in ms (accounting for tool/perk/buff speed). */
  runningEffectiveDurationMs?: number;
  favorites: Set<string>;
  nameOf: (itemId: string) => string;
  iconOf: (itemId: string) => string;
  /** Resolves a `requires.item` (may be a name or an id) to an item id. */
  resolveItemId: (raw: string) => string;
  whyLine?: (recipe: CraftRecipeView) => string;
  onOpen: (recipe: CraftRecipeView) => void;
  onToggleFavorite: (id: string) => void;
  /** Quick start (craftable row) / stop (running row) without opening the modal. */
  onQuickToggle?: (recipe: CraftRecipeView) => void;
};

const secs = (s: number) => (Number.isInteger(s) ? `${s}s` : `${s.toFixed(1)}s`);

/**
 * MWI-style production list: one row per recipe, level-ordered, locked rows dimmed with the unlock
 * level, inputs shown as have/need chips (green when enough, amber when short), output with T1 art.
 */
export function CraftRecipeList(props: Props) {
  const rows = [...props.recipes].sort((a, b) => a.level - b.level || a.time - b.time);
  const next = rows.find((r) => r.level > props.skillLevel);
  const now = Date.now();
  return (
    <div className="craft-recipe-list" data-count={rows.length}>
      {rows.map((r) => {
        const displayName = stripCraftVerb(r.name);
        const outputName = props.nameOf(r.output);
        const showOutMeta = outputName !== displayName || r.outputCount > 1;
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
        const startMs = running && props.runningStartedAt ? Date.parse(props.runningStartedAt) : NaN;
        const durationMs =
          running && props.runningEffectiveDurationMs && props.runningEffectiveDurationMs > 0
            ? props.runningEffectiveDurationMs
            : r.time * 1000;
        const fallbackPct =
          Number.isFinite(startMs) && durationMs > 0
            ? ((((now - startMs) % durationMs) + durationMs) % durationMs / durationMs) * 100
            : 0;
        const pct =
          running && typeof props.runningProgress === "number" && Number.isFinite(props.runningProgress)
            ? Math.min(100, Math.max(0, props.runningProgress))
            : fallbackPct;
        const effectiveTimeSec = durationMs / 1000;
        return (
          <button
            type="button"
            key={r.id}
            className={`craft-row${unlocked ? "" : " locked"}${running ? " running" : ""}${canCraft ? " ready" : unlocked ? " short" : ""}`}
            data-action-id={r.id}
            aria-label={displayName}
            data-locked={!unlocked || undefined}
            onClick={() => props.onOpen({ ...r, name: displayName })}
          >
            <span className="sar-art" aria-hidden="true">
              <T1ItemIcon itemId={r.output} fallback={props.iconOf(r.output)} alt="" />
            </span>
            <span className="sar-main">
              <span className="sar-head">
                <span className="sar-name">
                  {displayName}
                  {props.whyLine && <small className="sar-verb">{props.whyLine(r)}</small>}
                </span>
                <span className="craft-row-right">
                  {unlocked ? (
                    <span className="sar-req">
                      {running && <span className="sar-progress-pct">{Math.floor(pct)}% · </span>}
                      Lv.{r.level}
                    </span>
                  ) : (
                    <span className="sar-req sar-locked">Lv.{r.level} · 差 {r.level - props.skillLevel} 级</span>
                  )}
                  <span
                    role="button"
                    tabIndex={0}
                    className={`craft-row-fav${fav ? " active" : ""}`}
                    title={fav ? "取消收藏" : "收藏配方"}
                    onClick={(e) => { e.stopPropagation(); props.onToggleFavorite(r.id); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        props.onToggleFavorite(r.id);
                      }
                    }}
                  >
                    {fav ? "★" : "☆"}
                  </span>
                </span>
              </span>
              <span className="sar-meta">
                <span>{secs(running ? effectiveTimeSec : r.time)}</span>
                <span>·</span>
                <span>{r.xp} XP</span>
                {showOutMeta && (
                  <>
                    <span>·</span>
                    <span className="sar-out">
                      {outputName !== displayName ? outputName : ""}
                      {r.outputCount > 1 ? `${outputName !== displayName ? " " : ""}×${r.outputCount}` : ""}
                    </span>
                  </>
                )}
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
            {props.onQuickToggle && (running || canCraft) && (
              <span
                role="button"
                tabIndex={0}
                className={`sar-quick${running ? " stop" : ""}`}
                title={running ? "停止" : "直接制作（不限次）"}
                aria-label={running ? `停止 ${displayName}` : `开始 ${displayName}`}
                onClick={(e) => { e.stopPropagation(); props.onQuickToggle?.({ ...r, name: displayName }); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    props.onQuickToggle?.({ ...r, name: displayName });
                  }
                }}
              >
                {running ? "■" : "▶"}
              </span>
            )}
          </button>
        );
      })}
      {rows.length === 0 && <div className="sar-empty">这个分类还没有配方</div>}
      {next && (
        <div className="sar-next">
          {props.skillName} Lv.{props.skillLevel} → 下一个解锁：{stripCraftVerb(next.name)}（Lv.{next.level}）
        </div>
      )}
    </div>
  );
}
