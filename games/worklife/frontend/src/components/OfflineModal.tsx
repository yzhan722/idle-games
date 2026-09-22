import './OfflineModal.css';
import { GoldIcon, T1ItemIcon } from './T1Art';

/** Mirror of backend/src/offline_report.ts OfflineReport. */
export type OfflineReport = {
  id: string;
  from: string;
  to: string;
  durationMs: number;
  actions: Array<{ name: string; count: number }>;
  items: Array<{ itemId: string; qty: number }>;
  gold: number;
  skills: Array<{ skillId: string; xp: number; fromLevel: number; toLevel: number }>;
  kills: Array<{ monsterId: string; count: number }>;
  stopped?: string;
  running?: string;
};

function durationText(ms: number): string {
  const min = Math.floor(ms / 60000);
  const h = Math.floor(min / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d} 天 ${h % 24} 小时`;
  if (h > 0) return `${h} 小时 ${min % 60} 分钟`;
  return `${min} 分钟`;
}

const fmt = (n: number) => n.toLocaleString();

/**
 * "While you were away" — the MWI return screen: what ran, what it produced, what levelled,
 * and whether the character is still working or why it stopped.
 */
export function OfflineModal(props: {
  report: OfflineReport;
  nameOf: (itemId: string) => string;
  iconOf: (itemId: string) => string;
  skillNameOf: (skillId: string) => string;
  onClose: () => void;
}) {
  const r = props.report;
  const hasLoot = r.items.length > 0 || r.gold > 0;
  const capped = r.durationMs > 24 * 3600_000;
  return (
    <div className="offline-overlay" onClick={props.onClose}>
      <div className="offline-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="离线报告">
        <div className="offline-glow" />
        <div className="offline-icon">工</div>
        <h2 className="offline-title">欢迎回来！</h2>
        <p className="offline-sub">
          你离开了 {durationText(r.durationMs)}
          {capped && <span className="offline-cap">（离线收益最多结算 24 小时）</span>}
        </p>

        {r.actions.length > 0 && (
          <section className="offline-section">
            <h3>这段时间做了</h3>
            <ul className="offline-list">
              {r.actions.map((a) => (
                <li key={a.name}>
                  <span>{a.name}</span>
                  <strong>×{fmt(a.count)}</strong>
                </li>
              ))}
            </ul>
          </section>
        )}

        {hasLoot && (
          <section className="offline-section">
            <h3>收获</h3>
            <div className="offline-items">
              {r.gold > 0 && (
                <span className="offline-item gold">
                  <span className="offline-item-icon"><GoldIcon /></span>
                  金币 <strong>+{fmt(r.gold)}</strong>
                </span>
              )}
              {r.items.map((it) => (
                <span className="offline-item" key={it.itemId}>
                  <span className="offline-item-icon">
                    <T1ItemIcon itemId={it.itemId} fallback={props.iconOf(it.itemId)} alt="" />
                  </span>
                  {props.nameOf(it.itemId)} <strong>+{fmt(it.qty)}</strong>
                </span>
              ))}
            </div>
          </section>
        )}

        {r.skills.length > 0 && (
          <section className="offline-section">
            <h3>经验</h3>
            <ul className="offline-list">
              {r.skills.map((s) => (
                <li key={s.skillId}>
                  <span>{props.skillNameOf(s.skillId)}</span>
                  <strong>
                    +{fmt(s.xp)} XP
                    {s.toLevel > s.fromLevel && <em className="offline-levelup"> Lv.{s.fromLevel} → {s.toLevel}</em>}
                  </strong>
                </li>
              ))}
            </ul>
          </section>
        )}

        {!r.actions.length && !hasLoot && !r.skills.length && !r.stopped && (
          <div className="offline-empty">这段时间角色在休息，什么都没发生</div>
        )}

        <div className={`offline-status ${r.running ? 'running' : r.stopped ? 'stopped' : ''}`}>
          {r.running ? (
            <>▶ 现在还在「{r.running}」，进度会继续结算</>
          ) : r.stopped ? (
            <>⏸ {r.stopped.replace(/^(队列跳过|材料不足，已停止|材料不足，无法制作|批量制作完成)：?/, (m) => m + ' ')}<small>把采集动作排在队列最后，就不会空转。</small></>
          ) : (
            <>角色现在空闲</>
          )}
        </div>

        <button className="offline-confirm" onClick={props.onClose}>
          {hasLoot ? '收下' : '继续打工'}
        </button>
      </div>
    </div>
  );
}
