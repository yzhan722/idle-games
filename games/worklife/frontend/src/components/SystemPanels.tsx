import React, { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../services/api';
import { useToast } from './Toast';
import { getItemName } from '../utils/itemNames';
import './ProgressionPanels.css';
import './SystemPanels.css';

// ============ 通用弹窗外壳（复用 prog 样式）============
function PanelModal({
  title,
  icon,
  onClose,
  children
}: {
  title: string;
  icon: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="prog-overlay" onClick={onClose}>
      <div className="prog-modal" onClick={(e) => e.stopPropagation()}>
        <div className="prog-header">
          <span className="prog-title">
            <span className="prog-title-icon">{icon}</span>
            {title}
          </span>
          <button className="prog-close" onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </div>
        <div className="prog-body">{children}</div>
      </div>
    </div>
  );
}

// =================================================================
// 每日签到 弹窗
// =================================================================
interface CheckInReward {
  day: number;
  gold: number;
  items: Record<string, number>;
  label: string;
}
interface CheckInInfo {
  canCheckIn: boolean;
  streak: number;
  totalDays: number;
  nextCycleDay: number;
  rewards: CheckInReward[];
  lastDate?: string;
}

export function CheckInModal({
  onClose,
  onChange
}: {
  onClose: () => void;
  onChange?: () => void;
}) {
  const [info, setInfo] = useState<CheckInInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await apiClient.getCheckIn();
      setInfo(res);
    } catch (e) {
      toast.error('签到信息加载失败');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const checkIn = async () => {
    setClaiming(true);
    try {
      const res: any = await apiClient.doCheckIn();
      const itemText = Object.entries(res.reward.items || {})
        .map(([k, v]) => `${getItemName(k)}×${v}`)
        .join('、');
      toast.reward(`签到成功（连续${res.streak}天）+${res.reward.gold}金币${itemText ? '、' + itemText : ''}`);
      onChange?.();
      await load();
    } catch (e: any) {
      toast.error(e?.message || '签到失败');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <PanelModal title="每日签到" icon="🎁" onClose={onClose}>
      {loading || !info ? (
        <div className="prog-loading">加载中…</div>
      ) : (
        <>
          <div className="checkin-summary">
            <div className="checkin-stat">
              <span className="checkin-stat-value">{info.streak}</span>
              <span className="checkin-stat-label">连续签到（天）</span>
            </div>
            <div className="checkin-stat">
              <span className="checkin-stat-value">{info.totalDays}</span>
              <span className="checkin-stat-label">累计签到（天）</span>
            </div>
          </div>

          <div className="checkin-grid">
            {info.rewards.map((r) => {
              const isToday = r.day === info.nextCycleDay && info.canCheckIn;
              const claimed = r.day < info.nextCycleDay || (r.day === info.nextCycleDay && !info.canCheckIn);
              return (
                <div
                  key={r.day}
                  className={`checkin-cell ${isToday ? 'today' : ''} ${claimed ? 'claimed' : ''}`}
                >
                  <div className="checkin-day">第{r.day}天</div>
                  <div className="checkin-reward-gold">💰{r.gold}</div>
                  <div className="checkin-reward-items">
                    {Object.entries(r.items).map(([k, v]) => (
                      <span key={k} className="checkin-item">{getItemName(k)}×{v}</span>
                    ))}
                  </div>
                  {claimed && <div className="checkin-check">✓</div>}
                </div>
              );
            })}
          </div>

          <button
            className="checkin-btn"
            disabled={!info.canCheckIn || claiming}
            onClick={checkIn}
          >
            {claiming ? '签到中…' : info.canCheckIn ? `领取第 ${info.nextCycleDay} 天奖励` : '今日已签到'}
          </button>
        </>
      )}
    </PanelModal>
  );
}
