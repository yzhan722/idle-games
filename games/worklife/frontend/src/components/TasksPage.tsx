import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../services/api";
import { GoldIcon, T1Art, T1ItemIcon } from "./T1Art";
import { useToast } from "./Toast";

export type TaskView = {
  id: string;
  kind: "action" | "kill";
  actionId?: string;
  monsterId?: string;
  skillId: string;
  skillName: string;
  name: string;
  target: number;
  progress: number;
  completed: boolean;
  reward: { gold: number; tokens: number };
  assignedAt: string;
};

export type TaskBoard = {
  tasks: TaskView[];
  slots: number;
  nextTaskAt: string;
  cooldownMs: number;
  tokens: number;
  points: number;
  giftPoints: number;
  giftReady: boolean;
  giftsClaimed: number;
  completed: number;
  rerollCost: number;
  cooldownLevel: number;
  maxCooldownLevel: number;
  blockSlots: number;
  blockedSkills: string[];
  skills: Array<{ id: string; name: string }>;
  shop: Array<{ id: string; name: string; blurb: string; cost: number; soldOut: boolean }>;
};

type PackAction = { id: string; yields?: Array<{ itemId: string; qty: number }> };

type Props = {
  actions: PackAction[] | undefined;
  iconOf: (itemId: string) => string;
  /** Player gold — disables the reroll button when the fee is unaffordable. */
  gold: number;
  /** Changes whenever progress-relevant stats change so the board refreshes. */
  progressKey: string;
  onGoldChange: () => void;
};

function fmtCountdown(ms: number): string {
  if (ms <= 0) return "马上";
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  if (h > 0) return `${h} 小时 ${m} 分`;
  if (m > 0) return `${m} 分 ${s} 秒`;
  return `${s} 秒`;
}

/**
 * MWI 任务板. Slots fill one task per cooldown; each task names a concrete action or monster and
 * pays gold + tokens. Tokens go to the shop (cooldown, block slots, crates); 50 points open a gift.
 */
export function TasksPage(props: Props) {
  const toast = useToast();
  const [board, setBoard] = useState<TaskBoard | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      apiClient.clearCache();
      const b: TaskBoard = await apiClient.getTasks();
      setBoard(b);
    } catch (e: any) {
      toast.error(e?.message || "读取任务板失败");
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load, props.progressKey]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Timer crossing → the server may have handed out a task.
  const [lastAutoLoadAt, setLastAutoLoadAt] = useState(0);
  useEffect(() => {
    if (!board) return;
    const remaining = Date.parse(board.nextTaskAt) - now;
    if (remaining <= 0 && board.tasks.length < board.slots && now - lastAutoLoadAt > 5000) {
      setLastAutoLoadAt(now);
      void load();
    }
  }, [now, board, load, lastAutoLoadAt]);

  const run = async (key: string, fn: () => Promise<{ board?: TaskBoard } & Record<string, unknown>>, ok: (res: any) => string) => {
    if (busy) return;
    setBusy(key);
    try {
      apiClient.clearCache();
      const res = await fn();
      if (res.board) setBoard(res.board);
      toast.success(ok(res));
      props.onGoldChange();
    } catch (e: any) {
      toast.error(e?.message || "操作失败");
    } finally {
      setBusy(null);
    }
  };

  const iconFor = (t: TaskView) => {
    if (t.kind === "kill" && t.monsterId) return <T1Art kind="monster" id={t.monsterId} fallback="👾" alt="" />;
    const a = props.actions?.find((x) => x.id === t.actionId);
    const out = a?.yields?.[0]?.itemId;
    return out ? <T1ItemIcon itemId={out} fallback={props.iconOf(out)} alt="" /> : <span>📋</span>;
  };

  if (!board) {
    return (
      <div className="tasks-page skill-page" data-skill-page="tasks">
        <div className="page-header"><h2 className="section-title">任务</h2></div>
        <div className="loading-message">加载中...</div>
      </div>
    );
  }

  const remaining = Date.parse(board.nextTaskAt) - now;
  const boardFull = board.tasks.length >= board.slots;
  const giftPct = Math.min(100, Math.max(0, ((board.points % Math.max(1, board.giftPoints)) / Math.max(1, board.giftPoints)) * 100));

  return (
    <div className="tasks-page skill-page" data-skill-page="tasks">
      <div className="page-header">
        <h2 className="section-title">任务 <span className="skill-page-level">{board.tasks.length}/{board.slots}</span></h2>
        <div className="page-info"><p>每隔一段时间发一个和你技能相关的任务；完成拿金币和任务代币，不想做的可以重选或丢弃。</p></div>
      </div>

      <div className="tasks-summary">
        <span className="inv-sum" title="任务代币">🎟️ 代币 <strong>{board.tokens}</strong></span>
        <span className="inv-sum" title="下一个任务">
          ⏳ {boardFull ? "任务栏已满，完成或丢弃一个才会发新任务" : `下一个任务：${fmtCountdown(remaining)}`}
          <small className="tasks-cooldown"> · 间隔 {Math.round((board.cooldownMs / 3600_000) * 10) / 10} 小时</small>
        </span>
        <span className="inv-sum" title="累计完成">✅ 已完成 <strong>{board.completed}</strong></span>
        <span className={`inv-sum tasks-gift${board.giftReady ? " ready" : ""}`} title="每 50 任务点一份礼物">
          🎁 小紫牛的礼物
          <span className="tasks-gift-bar" aria-hidden="true"><span style={{ width: `${board.giftReady ? 100 : giftPct}%` }} /></span>
          {board.giftReady ? (
            <button type="button" className="qty-chip active" disabled={!!busy} onClick={() => run("gift", () => apiClient.claimTaskGift(), (r) => `礼物：金币 +${r.gold}，代币 +${r.tokens}${r.book ? "，还有一本技能书" : ""}`)}>
              领取
            </button>
          ) : (
            <small>{board.points % Math.max(1, board.giftPoints)}/{Math.max(1, board.giftPoints)} ({Math.floor(giftPct)}%)</small>
          )}
        </span>
      </div>

      <div className="tasks-grid">
        {board.tasks.map((t) => {
          const pct = Math.min(100, Math.max(0, (t.progress / Math.max(1, t.target)) * 100));
          return (
            <div className={`task-card${t.completed ? " completed" : ""}`} key={t.id} data-task-id={t.id}>
              <div className="task-card-head">
                <span className="task-icon">{iconFor(t)}</span>
                <div className="task-copy">
                  <strong className="task-name">{t.name}</strong>
                  <small className="task-skill">{t.skillName} · {t.kind === "kill" ? "战斗" : "技能"}</small>
                </div>
              </div>
              <div className="task-progress">
                <span className="skill-xp-bar" aria-hidden="true"><span className="skill-xp-fill" style={{ width: `${pct}%` }} /></span>
                <small>{t.progress}/{t.target} ({Math.floor(pct)}%){t.completed ? " · 已完成" : ""}</small>
              </div>
              <div className="task-reward"><GoldIcon /> {t.reward.gold} · 🎟️ {t.reward.tokens}</div>
              <div className="task-actions">
                {t.completed ? (
                  <button type="button" className="btn-action craftable task-claim" disabled={busy === t.id} onClick={() => run(t.id, () => apiClient.claimTask(t.id), (r) => `任务完成：金币 +${r.gold}，代币 +${r.tokens}${r.giftReady ? "，礼物可以领了！" : ""}`)}>
                    领取奖励
                  </button>
                ) : (
                  <>
                    <button type="button" className="qty-chip" disabled={busy === t.id || props.gold < board.rerollCost} title={props.gold < board.rerollCost ? `金币不足：重选要 ${board.rerollCost} 金` : `重选这个任务，花 ${board.rerollCost} 金币（当日每次翻倍）`} onClick={() => run(t.id, () => apiClient.rerollTask(t.id), (r) => `已重选（花了 ${r.cost} 金币）`)}>
                      重选 {board.rerollCost} 金
                    </button>
                    <button type="button" className="qty-chip" disabled={busy === t.id} title="免费丢弃；空出的槽位按冷却补发" onClick={() => run(t.id, () => apiClient.deleteTask(t.id), () => "已丢弃")}>
                      丢弃
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {/* Empty slots collapse into one card: the countdown, plus how many more slots wait behind it. */}
        {board.tasks.length < board.slots && (
          <div className="task-card empty" data-empty-slots={board.slots - board.tasks.length}>
            <span className="task-empty-copy">
              {`下一个任务 ${fmtCountdown(remaining)}`}
              {board.slots - board.tasks.length > 1 && <small>还有 {board.slots - board.tasks.length - 1} 个空槽</small>}
            </span>
          </div>
        )}
      </div>

      <section className="tasks-shop" aria-label="任务商店">
        <h3 className="inv-group-title">任务商店 <small>用代币换永久升级</small></h3>
        <div className="tasks-shop-grid">
          {board.shop.map((item) => (
            <div className="task-shop-item" key={item.id}>
              {item.id.startsWith("charm_") && (
                <span className="task-shop-icon" aria-hidden="true">
                  <T1ItemIcon itemId={item.id} fallback={props.iconOf(item.id)} alt="" />
                </span>
              )}
              <div className="task-copy">
                <strong>{item.name}</strong>
                <small>{item.blurb}{item.id === "cooldown" ? `（${board.cooldownLevel}/${board.maxCooldownLevel}）` : item.id === "block_slot" ? `（已有 ${board.blockSlots}）` : ""}</small>
              </div>
              <button
                type="button"
                className={`qty-chip${board.tokens >= item.cost && !item.soldOut ? " active" : ""}`}
                disabled={item.soldOut || board.tokens < item.cost || busy === item.id}
                onClick={() => run(item.id, () => apiClient.buyTaskShop(item.id), (r) => (r.gained?.gold ? `宝箱：金币 +${r.gained.gold}` : `已购买「${item.name}」`))}
              >
                {item.soldOut ? "已满" : `🎟️ ${item.cost}`}
              </button>
            </div>
          ))}
        </div>
        {board.blockSlots > 0 && (
          <div className="tasks-block" role="group" aria-label="屏蔽技能">
            <small>屏蔽（{board.blockedSkills.length}/{board.blockSlots}）：不再收到这些技能的任务</small>
            <div className="tasks-block-chips">
              {board.skills.map((s) => {
                const on = board.blockedSkills.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`qty-chip${on ? " active" : ""}`}
                    disabled={busy === `block-${s.id}` || (!on && board.blockedSkills.length >= board.blockSlots)}
                    onClick={() => run(`block-${s.id}`, () => apiClient.setTaskBlock(s.id, !on), () => (on ? `已恢复 ${s.name} 的任务` : `已屏蔽 ${s.name} 的任务`))}
                  >
                    {on ? "🚫 " : ""}{s.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
