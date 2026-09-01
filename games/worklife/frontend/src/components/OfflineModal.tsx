import './OfflineModal.css';

export interface OfflineSummary {
  durationText: string;
  lines: string[]; // 离线收益描述行（来自后端 logs）
}

export function OfflineModal({
  summary,
  onClose
}: {
  summary: OfflineSummary;
  onClose: () => void;
}) {
  return (
    <div className="offline-overlay" onClick={onClose}>
      <div className="offline-modal" onClick={(e) => e.stopPropagation()}>
        <div className="offline-glow" />
        <div className="offline-icon">🌙</div>
        <h2 className="offline-title">欢迎回来！</h2>
        <p className="offline-sub">你离开了 {summary.durationText}</p>

        {summary.lines.length > 0 ? (
          <div className="offline-rewards">
            {summary.lines.map((line, i) => (
              <div key={i} className="offline-reward-line">
                <span className="offline-reward-dot">✦</span>
                <span>{line}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="offline-empty">离线期间没有进行中的活动</div>
        )}

        <button className="offline-confirm" onClick={onClose}>
          收下奖励
        </button>
      </div>
    </div>
  );
}
