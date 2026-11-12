import React, { useEffect, useState, useCallback, useRef } from 'react';
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
interface AstrolabeNodeInfo {
  id: string;
  name: string;
  icon: string;
  constellation: string;
  rank: number;
  maxRank: number;
  nextCost: number | null;
  summary: string;
  currentEffect: string;
  nextEffect: string | null;
  canUpgrade: boolean;
}

interface PrestigeInfo {
  count: number;
  points: number;
  spentPoints?: number;
  availablePoints?: number;
  multiplier: number;
  multiplierPercent: number;
  minCombatLevel: number;
  currentCombatLevel: number;
  canPrestige: boolean;
  pointsOnPrestige: number;
  bonusPerPoint: number;
  astrolabeNodes?: AstrolabeNodeInfo[];
}

export function PrestigePanel({
  onClose,
  onChange
}: {
  onClose: () => void;
  onChange?: (mode?: 'prestige' | 'astrolabe') => void;
}) {
  const [info, setInfo] = useState<PrestigeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [nodeBusyId, setNodeBusyId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      apiClient.clearCache();
      const res: any = await apiClient.getPrestige();
      setInfo(res);
    } catch (e) {
      toastRef.current.error('转生信息加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const prestige = async () => {
    setBusy(true);
    try {
      const res: any = await apiClient.doPrestige();
      apiClient.clearCache();
      toast.success(`转生成功！获得 ${res.gainedPoints} 转生点，全局收益 +${Math.round((res.multiplier - 1) * 100)}%`);
      setConfirming(false);
      onChange?.('prestige');
      await load();
    } catch (e: any) {
      toast.error(e?.message || '转生失败');
    } finally {
      setBusy(false);
    }
  };

  const upgradeNode = async (node: AstrolabeNodeInfo) => {
    if (busy || nodeBusyId) return;
    setNodeBusyId(node.id);
    try {
      const res: any = await apiClient.upgradeAstrolabeNode(node.id);
      apiClient.clearCache();
      if (res?.prestige) setInfo(res.prestige);
      else await load();
      toast.success(`已点亮「${node.name}」第 ${res?.newRank ?? node.rank + 1} 阶`);
      onChange?.('astrolabe');
    } catch (e: any) {
      toast.error(e?.message || '星盘升阶失败');
    } finally {
      setNodeBusyId(null);
    }
  };

  const handleRespec = async () => {
    if (busy || nodeBusyId) return;
    setBusy(true);
    try {
      const res: any = await apiClient.respecAstrolabe();
      apiClient.clearCache();
      if (res?.prestige) setInfo(res.prestige);
      else await load();
      toast.success(`已重置传承星盘，返还 ${res?.refundedPoints ?? 0} 点星尘`);
      onChange?.('astrolabe');
    } catch (e: any) {
      toast.error(e?.message || '星盘重置失败');
    } finally {
      setBusy(false);
    }
  };

  const availablePoints = info ? (info.availablePoints ?? Math.max(0, info.points - (info.spentPoints || 0))) : 0;
  const spentPoints = info?.spentPoints || 0;
  const nodes = info?.astrolabeNodes || [];

  return (
    <PanelModal title="转生与传承星盘" icon={<T1Art kind="ui" id="nav-crystal" fallback="" alt="" />} onClose={onClose}>
      {loading && !info ? (
        <div className="prog-loading">加载中…</div>
      ) : !info ? (
        <div className="prog-loading">暂无转生数据</div>
      ) : (
        <>
          <div className="prestige-hero">
            <div className="prestige-stat">
              <div className="prestige-stat-value">{info.count}</div>
              <div className="prestige-stat-label">转生次数</div>
            </div>
            <div className="prestige-stat">
              <div className="prestige-stat-value">{info.points}</div>
              <div className="prestige-stat-label">累计转生点</div>
            </div>
            <div className="prestige-stat astrolabe-dust">
              <div className="prestige-stat-value">{availablePoints}</div>
              <div className="prestige-stat-label">可用星尘</div>
            </div>
            <div className="prestige-stat highlight">
              <div className="prestige-stat-value">+{info.multiplierPercent}%</div>
              <div className="prestige-stat-label">全局收益</div>
            </div>
          </div>

          <div className="prestige-desc">
            转生将<b>重置</b>战斗等级、各职业等级与背包装备，换取<b>永久</b>的全局收益加成
            （每点累计转生点 +{info.bonusPerPoint}%）。同时每点转生点提供 1 点<b>可用星尘</b>，可自由点亮下方<b>异世界传承星盘</b>机制能力，<b>消耗星尘不会削减全局收益倍率</b>。
          </div>

          {nodes.length > 0 && (
            <div className="astrolabe-section">
              <div className="astrolabe-head">
                <div>
                  <div className="sys-section-title" style={{ margin: 0 }}>异世界传承星盘</div>
                  <div className="astrolabe-sub">
                    已凝铸星尘 {spentPoints} 点 · 可分配 {availablePoints} 点
                  </div>
                </div>
                {spentPoints > 0 && (
                  <button
                    type="button"
                    className="prog-filter-btn astrolabe-respec-btn"
                    disabled={busy || Boolean(nodeBusyId)}
                    onClick={handleRespec}
                  >
                    重置星盘
                  </button>
                )}
              </div>

              <div className="astrolabe-grid">
                {nodes.map((node) => {
                  const isMax = node.rank >= node.maxRank;
                  const isUpgrading = nodeBusyId === node.id;
                  return (
                    <div
                      key={node.id}
                      className={`astrolabe-card ${node.rank > 0 ? 'is-lit' : ''} ${isMax ? 'is-max' : ''}`}
                    >
                      <div className="astrolabe-card-top">
                        <div className="astrolabe-icon-wrap">
                          <T1Art kind="skills" id={node.icon} className="astrolabe-node-icon" fallback="" alt={node.name} />
                        </div>
                        <div className="astrolabe-meta">
                          <div className="astrolabe-title-row">
                            <span className="astrolabe-name">{node.name}</span>
                            <span className="astrolabe-constellation">{node.constellation}</span>
                          </div>
                          <div className="astrolabe-pips" aria-label={`星阶 ${node.rank}/${node.maxRank}`}>
                            {Array.from({ length: node.maxRank }, (_, i) => (
                              <span key={i} className={`astrolabe-pip ${i < node.rank ? 'on' : ''}`} />
                            ))}
                            <span className="astrolabe-rank-text">{node.rank}/{node.maxRank}</span>
                          </div>
                        </div>
                      </div>

                      <div className="astrolabe-summary">{node.summary}</div>
                      <div className="astrolabe-effect-cur">当前：{node.currentEffect}</div>
                      {node.nextEffect && (
                        <div className="astrolabe-effect-next">下一阶：{node.nextEffect}</div>
                      )}

                      <button
                        type="button"
                        className={`astrolabe-upgrade-btn ${node.canUpgrade ? 'ready' : ''}`}
                        disabled={isMax || !node.canUpgrade || busy || Boolean(nodeBusyId)}
                        onClick={() => upgradeNode(node)}
                      >
                        {isMax
                          ? '已臻满阶'
                          : isUpgrading
                            ? '凝铸中…'
                            : `${node.rank === 0 ? '点亮星轨' : '升阶星轨'} · ${node.nextCost} 星尘`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="sys-section-title" style={{ marginTop: 18 }}>转生条件</div>
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
