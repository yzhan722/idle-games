import React, { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../services/api';
import { useToast } from './Toast';
import { T1Art } from './T1Art';
import './ProgressionPanels.css';
import './SystemPanels.css';
import './AdvancementPanels.css';
import './T1UiIcons.css';

// ============ 通用弹窗外壳（与 SystemPanels 保持一致）============
function PanelModal({
  title,
  icon,
  onClose,
  children
}: {
  title: string;
  icon: React.ReactNode;
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
// 转生面板
// =================================================================
interface PrestigeInfo {
  count: number;
  points: number;
  multiplier: number;
  multiplierPercent: number;
  minCombatLevel: number;
  currentCombatLevel: number;
  canPrestige: boolean;
  pointsOnPrestige: number;
  bonusPerPoint: number;
}

export function PrestigePanel({
  onClose,
  onChange
}: {
  onClose: () => void;
  onChange?: () => void;
}) {
  const [info, setInfo] = useState<PrestigeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      apiClient.clearCache();
      const res: any = await apiClient.getPrestige();
      setInfo(res);
    } catch (e) {
      toast.error('转生信息加载失败');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const prestige = async () => {
    setBusy(true);
    try {
      const res: any = await apiClient.doPrestige();
      apiClient.clearCache();
      toast.success(`转生成功！获得 ${res.gainedPoints} 转生点，全局收益 +${Math.round((res.multiplier - 1) * 100)}%`);
      setConfirming(false);
      onChange?.();
      await load();
    } catch (e: any) {
      toast.error(e?.message || '转生失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <PanelModal title="转生" icon={<T1Art kind="ui" id="nav-crystal" fallback="" alt="" />} onClose={onClose}>
      {loading || !info ? (
        <div className="prog-loading">加载中…</div>
      ) : (
        <>
          <div className="prestige-hero">
            <div className="prestige-stat">
              <div className="prestige-stat-value">{info.count}</div>
              <div className="prestige-stat-label">转生次数</div>
            </div>
            <div className="prestige-stat">
              <div className="prestige-stat-value">{info.points}</div>
              <div className="prestige-stat-label">转生点</div>
            </div>
            <div className="prestige-stat highlight">
              <div className="prestige-stat-value">+{info.multiplierPercent}%</div>
              <div className="prestige-stat-label">全局收益</div>
            </div>
          </div>

          <div className="prestige-desc">
            转生将<b>重置</b>战斗等级、各职业等级与背包装备，换取<b>永久</b>的全局收益加成
            （每点转生 +{info.bonusPerPoint}%）。已解锁成就将<b>保留</b>。
          </div>

          <div className="sys-section-title" style={{ marginTop: 16 }}>转生条件</div>
          <div className="prestige-cond">
            <div className="prestige-cond-row prestige-cond-row--progress">
              <div className="prestige-cond-line">
                <span>战斗等级</span>
                <span className={info.currentCombatLevel >= info.minCombatLevel ? 'ok' : 'no'}>
                  {info.currentCombatLevel} / {info.minCombatLevel} ({Math.min(100, Math.round((info.currentCombatLevel / Math.max(1, info.minCombatLevel)) * 100))}%)
                </span>
              </div>
              <div className="prestige-lv-track">
                <div
                  className={`prestige-lv-fill ${info.currentCombatLevel >= info.minCombatLevel ? 'is-ready' : ''}`}
                  style={{ width: `${Math.min(100, Math.max(2, Math.round((info.currentCombatLevel / Math.max(1, info.minCombatLevel)) * 100)))}%` }}
                />
              </div>
            </div>
            <div className="prestige-cond-row prestige-cond-row--progress">
              <div className="prestige-cond-line">
                <span>本次可获转生点</span>
                <span className="ok">+{info.pointsOnPrestige}</span>
              </div>
              {info.pointsOnPrestige <= 0 && (
                <div className="prestige-cond-subhint">
                  满 {info.minCombatLevel} 级立得 +1 转生点 · 永久全局收益 +{info.bonusPerPoint}%
                </div>
              )}
            </div>
          </div>

          {!confirming ? (
            <button
              className="checkin-btn"
              style={{ marginTop: 18 }}
              disabled={!info.canPrestige || info.pointsOnPrestige <= 0}
              onClick={() => setConfirming(true)}
            >
              {info.canPrestige
                ? info.pointsOnPrestige > 0
                  ? `转生（获得 +${info.pointsOnPrestige} 转生点）`
                  : '进度不足以获得转生点'
                : `战斗等级需达到 ${info.minCombatLevel} 级`}
            </button>
          ) : (
            <div className="prestige-confirm">
              <div className="prestige-confirm-text">
                <T1Art kind="ui" id="nav-adventure" fallback="" alt="" /> 确认转生？战斗/职业等级与背包装备将被清空，此操作不可撤销。
              </div>
              <div className="prestige-confirm-btns">
                <button className="prog-filter-btn" disabled={busy} onClick={() => setConfirming(false)}>
                  取消
                </button>
                <button className="checkin-btn prestige-confirm-go" disabled={busy} onClick={prestige}>
                  {busy ? '转生中…' : '确认转生'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </PanelModal>
  );
}
