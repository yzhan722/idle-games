import type { ActivityQueueItem } from "../types/game";

type Props = {
  queue: ActivityQueueItem[];
  max: number;
  /** Currently running action (shown first, not removable here). */
  current?: { name: string; quantity?: number; remaining?: number } | null;
  nameOf: (actionId: string) => string;
  durationOf?: (actionId: string) => number;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onClear: () => void;
};

function formatEta(totalSec: number): string {
  if (!Number.isFinite(totalSec) || totalSec <= 0) return "";
  if (totalSec < 60) return `≈${Math.ceil(totalSec)}s`;
  const mins = Math.floor(totalSec / 60);
  const secs = Math.round(totalSec % 60);
  if (mins < 60) return secs > 0 ? `≈${mins}m${secs}s` : `≈${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `≈${hrs}h${remMins}m` : `≈${hrs}h`;
}

/**
 * MWI-style action queue strip: what runs now, what runs next, in order.
 * Rendered only when something is queued so the chapter-1 shell stays quiet.
 */
export function ActionQueueBar(props: Props) {
  if (!props.queue.length) return null;
  const hasInfinite = props.queue.some((q) => !q.quantity);
  const totalEtaSec = props.durationOf
    ? props.queue.reduce((sum, q) => {
        if (!q.quantity) return sum;
        const sec = props.durationOf!(q.actionId) || 0;
        return sum + sec * q.quantity;
      }, 0)
    : 0;
  return (
    <div className="action-queue-bar" data-queue-length={props.queue.length} aria-label="行动队列">
      <span className="action-queue-label">
        队列 {props.queue.length}/{props.max}
        {totalEtaSec > 0 && (
          <small className="action-queue-eta">
            {" · "}
            {formatEta(totalEtaSec)}
            {hasInfinite ? "+" : ""}
          </small>
        )}
      </span>
      {props.current && (
        <span className="action-queue-item current" title="正在进行">
          <span className="action-queue-name">{props.current.name}</span>
          {typeof props.current.quantity === "number" && (
            <span className="action-queue-qty">
              还剩 {props.current.remaining ?? props.current.quantity}
            </span>
          )}
        </span>
      )}
      {props.queue.map((item, index) => {
        const itemSec = props.durationOf && item.quantity ? (props.durationOf(item.actionId) || 0) * item.quantity : 0;
        return (
          <span className="action-queue-item" key={item.id}>
            <span className="action-queue-order">{index + 1}</span>
            <span className="action-queue-name">{props.nameOf(item.actionId)}</span>
            <span className="action-queue-qty">
              {item.quantity ? `×${item.quantity}` : "∞"}
              {itemSec > 0 ? ` (${formatEta(itemSec)})` : ""}
            </span>
            <button
              type="button"
              className="action-queue-btn"
              aria-label="上移"
              disabled={index === 0}
              onClick={() => props.onMove(item.id, "up")}
            >
              ↑
            </button>
            <button
              type="button"
              className="action-queue-btn"
              aria-label="下移"
              disabled={index === props.queue.length - 1}
              onClick={() => props.onMove(item.id, "down")}
            >
              ↓
            </button>
            <button type="button" className="action-queue-btn remove" aria-label="移出队列" onClick={() => props.onRemove(item.id)}>
              ×
            </button>
          </span>
        );
      })}
      <button type="button" className="action-queue-clear" onClick={props.onClear}>
        清空
      </button>
    </div>
  );
}
