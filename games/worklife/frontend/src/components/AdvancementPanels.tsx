import React, { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../services/api';
import { useToast } from './Toast';
import './ProgressionPanels.css';
import './SystemPanels.css';
import './AdvancementPanels.css';

// ============ 通用弹窗外壳（与 SystemPanels 保持一致）============
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

const RARITY_LABEL: Record<string, { text: string; cls: string }> = {
  common: { text: '普通', cls: 'rar-common' },
  rare: { text: '稀有', cls: 'rar-rare' },
  epic: { text: '史诗', cls: 'rar-epic' }
};

// =================================================================
// 声望面板
// =================================================================
interface RepTier {
  tier: number;
  name: string;
  icon: string;
  required: number;
  bonuses: Record<string, number>;
}
interface RepInfo {
  total: number;
  spent: number;
  currentTier: RepTier;
  nextTier?: RepTier;
  progressToNext: number;
  activeBonuses: {
    gatherSpeed: number;
    craftSpeed: number;
    combatSpeed: number;
    xpGain: number;
    goldGain: number;
  };
  tiers: RepTier[];
}

const BONUS_LABEL: Record<string, string> = {
  gatherSpeed: '采集速度',
  craftSpeed: '制作速度',
  combatSpeed: '战斗速度',
  xpGain: '经验获取',
  goldGain: '金币获取'
};

export function ReputationPanel({ onClose }: { onClose: () => void }) {
  const [info, setInfo] = useState<RepInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res: any = await apiClient.getReputation();
        setInfo(res);
      } catch (e) {
        toast.error('声望信息加载失败');
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  const activeBonusEntries = info
    ? Object.entries(info.activeBonuses).filter(([, v]) => v > 0)
    : [];

  // 进度条：从当前等级 required 到下一等级 required 的占比
  let pct = 100;
  if (info && info.nextTier) {
    const span = info.nextTier.required - info.currentTier.required;
    const got = info.total - info.currentTier.required;
    pct = span > 0 ? Math.max(0, Math.min(100, Math.round((got / span) * 100))) : 0;
  }

  return (
    <PanelModal title="声望" icon="🏛️" onClose={onClose}>
      {loading || !info ? (
        <div className="prog-loading">加载中…</div>
      ) : (
        <>
          <div className="rep-hero">
            <div className="rep-hero-icon">{info.currentTier.icon}</div>
            <div className="rep-hero-main">
              <div className="rep-hero-tier">
                Lv.{info.currentTier.tier}「{info.currentTier.name}」
              </div>
              <div className="rep-hero-total">
                累计声望 <b>{info.total.toLocaleString()}</b>
              </div>
              {info.nextTier ? (
                <>
                  <div className="rep-progress-bar">
                    <div className="rep-progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="rep-progress-text">
                    距「{info.nextTier.name}」还需 {info.progressToNext.toLocaleString()} 声望
                  </div>
                </>
              ) : (
                <div className="rep-progress-text">已达到最高声望等级 🌌</div>
              )}
            </div>
          </div>

          <div className="sys-section-title">当前永久加成</div>
          {activeBonusEntries.length === 0 ? (
            <div className="sys-empty-inline">提升声望可解锁永久全局加成</div>
          ) : (
            <div className="rep-bonus-row">
              {activeBonusEntries.map(([k, v]) => (
                <span key={k} className="buff-tag">
                  {BONUS_LABEL[k] || k} +{v}%
                </span>
              ))}
            </div>
          )}

          <div className="sys-section-title" style={{ marginTop: 18 }}>声望等级一览</div>
          <div className="rep-tier-list">
            {info.tiers.map((t) => {
              const reached = info.total >= t.required;
              const isCurrent = t.tier === info.currentTier.tier;
              return (
                <div
                  key={t.tier}
                  className={`rep-tier-card ${reached ? 'reached' : ''} ${isCurrent ? 'current' : ''}`}
                >
                  <div className="rep-tier-left">
                    <span className="rep-tier-icon">{t.icon}</span>
                    <span className="rep-tier-name">
                      Lv.{t.tier} {t.name}
                    </span>
                  </div>
                  <div className="rep-tier-mid">
                    {Object.entries(t.bonuses).length === 0 ? (
                      <span className="rep-tier-noeff">起始等级</span>
                    ) : (
                      Object.entries(t.bonuses).map(([k, v]) => (
                        <span key={k} className="rep-tier-bonus">
                          {BONUS_LABEL[k] || k}+{v}%
                        </span>
                      ))
                    )}
                  </div>
                  <div className="rep-tier-req">
                    {reached ? '✓ 已达成' : `需 ${t.required.toLocaleString()}`}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </PanelModal>
  );
}

// =================================================================
// 赏金契约面板
// =================================================================
interface BountyView {
  id: string;
  name: string;
  description: string;
  icon: string;
  metric: 'gather' | 'craft' | 'kill';
  target: number;
  accepted: boolean;
  claimed: boolean;
  rarity: 'common' | 'rare' | 'epic';
  reward: { gold: number; reputation: number; items?: Record<string, number> };
  progress: number;
  completed: boolean;
}
interface BountyInfo {
  date: string;
  rerollsUsed: number;
  maxRerolls: number;
  rerollCost: number;
  bounties: BountyView[];
}

export function BountiesPanel({
  onClose,
  onChange
}: {
  onClose: () => void;
  onChange?: () => void;
}) {
  const [info, setInfo] = useState<BountyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await apiClient.getBounties();
      setInfo(res);
    } catch (e) {
      toast.error('契约板加载失败');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const accept = async (b: BountyView) => {
    setBusy(b.id);
    try {
      const res: any = await apiClient.acceptBounty(b.id);
      setInfo(res);
      toast.success(`已接取契约「${b.name}」`);
    } catch (e: any) {
      toast.error(e?.message || '接取失败');
    } finally {
      setBusy(null);
    }
  };

  const claim = async (b: BountyView) => {
    setBusy(b.id);
    try {
      const res: any = await apiClient.claimBounty(b.id);
      setInfo(res);
      const r = res.reward || {};
      toast.success(`领取奖励：金币 +${r.gold || 0}，声望 +${r.reputation || 0}`);
      onChange?.();
    } catch (e: any) {
      toast.error(e?.message || '领取失败');
    } finally {
      setBusy(null);
    }
  };

  const reroll = async () => {
    setBusy('__reroll__');
    try {
      const res: any = await apiClient.rerollBounties();
      setInfo(res);
      toast.success(`已刷新契约板（消耗 ${res.cost || 0} 金币）`);
      onChange?.();
    } catch (e: any) {
      toast.error(e?.message || '刷新失败');
    } finally {
      setBusy(null);
    }
  };

  return (
    <PanelModal title="赏金契约" icon="📜" onClose={onClose}>
      {loading || !info ? (
        <div className="prog-loading">加载中…</div>
      ) : (
        <>
          <div className="bounty-topbar">
            <div className="bounty-hint">每日刷新 · 接取后从当前进度开始计数</div>
            <button
              className="prog-filter-btn"
              disabled={busy === '__reroll__' || info.rerollsUsed >= info.maxRerolls}
              onClick={reroll}
            >
              🔄 刷新（{info.rerollCost}💰 · 余 {info.maxRerolls - info.rerollsUsed}）
            </button>
          </div>

          <div className="bounty-list">
            {info.bounties.map((b) => {
              const pct = Math.round((b.progress / b.target) * 100);
              const rar = RARITY_LABEL[b.rarity] || RARITY_LABEL.common;
              return (
                <div key={b.id} className={`bounty-card ${b.claimed ? 'done' : ''}`}>
                  <div className="bounty-head">
                    <span className="bounty-name">
                      {b.icon} {b.name}
                    </span>
                    <span className={`bounty-rarity ${rar.cls}`}>{rar.text}</span>
                  </div>
                  <div className="bounty-desc">{b.description}</div>
                  <div className="bounty-progress-bar">
                    <div
                      className={`bounty-progress-fill ${b.completed ? 'full' : ''}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  <div className="bounty-progress-text">
                    {b.progress} / {b.target}
                  </div>
                  <div className="bounty-footer">
                    <div className="bounty-reward">
                      <span className="bounty-reward-gold">💰 {b.reward.gold}</span>
                      <span className="bounty-reward-rep">🏛️ {b.reward.reputation}</span>
                    </div>
                    {b.claimed ? (
                      <span className="bounty-claimed">✓ 已完成</span>
                    ) : !b.accepted ? (
                      <button
                        className="prog-filter-btn"
                        disabled={busy === b.id}
                        onClick={() => accept(b)}
                      >
                        接取
                      </button>
                    ) : (
                      <button
                        className="ach-claim-btn"
                        disabled={busy === b.id || !b.completed}
                        onClick={() => claim(b)}
                      >
                        {b.completed ? '领取奖励' : '进行中'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </PanelModal>
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
    <PanelModal title="转生" icon="♻️" onClose={onClose}>
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
            （每点转生 +{info.bonusPerPoint}%）。声望、成就与生涯统计将<b>保留</b>。
          </div>

          <div className="sys-section-title" style={{ marginTop: 16 }}>转生条件</div>
          <div className="prestige-cond">
            <div className="prestige-cond-row">
              <span>战斗等级</span>
              <span className={info.currentCombatLevel >= info.minCombatLevel ? 'ok' : 'no'}>
                {info.currentCombatLevel} / {info.minCombatLevel}
              </span>
            </div>
            <div className="prestige-cond-row">
              <span>本次可获转生点</span>
              <span className="ok">+{info.pointsOnPrestige}</span>
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
                ⚠️ 确认转生？战斗/职业等级与背包装备将被清空，此操作不可撤销。
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
