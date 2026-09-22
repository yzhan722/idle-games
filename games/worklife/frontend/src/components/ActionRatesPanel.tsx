import type { ActionPreview } from "../services/api";

/**
 * MWI-style rates block for an action panel: effective time, speed/efficiency with sources,
 * and per-hour actions / XP / outputs. Numbers come from the server (`/actions/preview`), so
 * they always agree with what the simulator will actually grant.
 */
export function ActionRatesPanel(props: { preview: ActionPreview | null; loading?: boolean }) {
  const p = props.preview;
  if (!p) {
    return <div className="action-rates action-rates-loading">{props.loading ? "计算收益…" : ""}</div>;
  }
  const secs = (ms: number) => (ms / 1000).toFixed(ms % 1000 === 0 ? 0 : 1);
  const fmt = (n: number) => (n >= 100 ? Math.round(n).toLocaleString() : n.toFixed(n >= 10 ? 0 : 1));
  const speedTitle = p.speedSources.length ? p.speedSources.map((s) => `${s.label} ${s.pct > 0 ? "+" : ""}${s.pct}%`).join(" · ") : "没有速度加成";
  const effTitle = p.efficiencySources.length ? p.efficiencySources.map((s) => `${s.label} +${s.pct}%`).join(" · ") : "效率来自等级高出需求、装备与增益";
  return (
    <div className="action-rates" data-testid="action-rates">
      <div className="action-rates-row">
        <span className="action-rates-label">单次</span>
        <span className="action-rates-value">
          {p.speedPct > 0 ? (
            <>
              <s>{secs(p.baseDurationMs)}s</s> {secs(p.effectiveDurationMs)}s
            </>
          ) : (
            <>{secs(p.effectiveDurationMs)}s</>
          )}
          <span className="action-rates-sub" title={speedTitle}>
            速度 {p.speedPct > 0 ? `+${p.speedPct}%` : "—"}
          </span>
          <span className={`action-rates-sub${p.efficiencyPct > 0 ? " good" : ""}`} title={effTitle}>
            效率 {p.efficiencyPct > 0 ? `+${p.efficiencyPct}%` : "—"}
          </span>
        </span>
      </div>
      <div className="action-rates-row">
        <span className="action-rates-label">每小时</span>
        <span className="action-rates-value">
          约 {fmt(p.actionsPerHour)} 次 · {fmt(p.xpPerHour)} XP
          {p.outputsPerHour.filter((o) => o.itemId !== "gold").map((o) => (
            <span key={o.itemId} className="action-rates-out">
              · {o.name} {fmt(o.qty)}
              {o.chance < 1 ? <small>（{Math.round(o.chance * 1000) / 10}%）</small> : null}
            </span>
          ))}
          {p.outputsPerHour.filter((o) => o.itemId === "gold").map((o) => (
            <span key={o.itemId} className="action-rates-out"> · 金币 {fmt(o.qty)}</span>
          ))}
        </span>
      </div>
      {p.inputsPerHour.length > 0 && (
        <div className="action-rates-row">
          <span className="action-rates-label">消耗/小时</span>
          <span className="action-rates-value">
            {p.inputsPerHour.map((i) => `${i.name} ${fmt(i.qty)}`).join(" · ")}
          </span>
        </div>
      )}
      {p.efficiencyPct === 0 && p.skillLevel <= p.requiredLevel && (
        <div className="action-rates-hint">再升 1 级，这个动作就有 1% 概率白送一次（效率）。</div>
      )}
    </div>
  );
}
