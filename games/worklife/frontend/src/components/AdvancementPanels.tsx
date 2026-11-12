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
// 声望与军需官商店面板 (WL-4)
// =================================================================
interface QuartermasterShopItemInfo {
  id: string;
  name: string;
  category: 'protection' | 'chest' | 'scroll' | 'title';
  categoryLabel: string;
  iconKind: 'materials' | 'skills';
  iconId: string;
  cost: number;
  requiredTier: number;
  requiredTierName: string;
  dailyLimit: number | null;
  dailyBought: number;
  titleLabel: string | null;
  summary: string;
  effectText: string;
  unlockedByTier: boolean;
  isUnlockedTitle: boolean;
  isEquippedTitle: boolean;
  activeRemainingMs: number;
  canBuy: boolean;
  blockReason: string | null;
}

interface ReputationTierInfo {
  tier: number;
  name: string;
  required: number;
  bonuses: {
    gatherSpeed?: number;
    craftSpeed?: number;
    combatSpeed?: number;
    xpGain?: number;
    goldGain?: number;
  };
}

interface ReputationInfo {
  total: number;
  spent: number;
  available: number;
  currentTier: ReputationTierInfo;
  nextTier?: ReputationTierInfo;
  progressToNext: number;
  equippedTitle: {
    id: string;
    titleLabel: string;
    name: string;
    iconKind: 'materials' | 'skills';
    iconId: string;
    effectText: string;
  } | null;
  unlockedTitles: string[];
  activeScrolls: Array<{
    id: string;
    name: string;
    iconKind: 'materials' | 'skills';
    iconId: string;
    remainingMs: number;
    effectText: string;
  }>;
  quartermasterShop: QuartermasterShopItemInfo[];
  activeBonuses: {
    gatherSpeed: number;
    craftSpeed: number;
    combatSpeed: number;
    xpGain: number;
    goldGain: number;
  };
  tiers: ReputationTierInfo[];
}

function fmtRemainingDuration(ms: number): string {
  const totalMinutes = Math.max(1, Math.ceil(ms / 60000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0 && m > 0) return `${h}小时${m}分`;
  if (h > 0) return `${h}小时`;
  return `${m}分钟`;
}

function tierCrestIconId(tier: number): string {
  if (tier >= 7) return 'qm_title_grandmaster';
  if (tier >= 5) return 'qm_title_dragonslayer';
  return 'qm_title_warder';
}

function formatTierBonuses(bonuses: ReputationTierInfo['bonuses']): string[] {
  const out: string[] = [];
  if (bonuses.gatherSpeed) out.push(`采集速度 +${bonuses.gatherSpeed}%`);
  if (bonuses.craftSpeed) out.push(`制作速度 +${bonuses.craftSpeed}%`);
  if (bonuses.combatSpeed) out.push(`战斗速度 +${bonuses.combatSpeed}%`);
  if (bonuses.xpGain) out.push(`经验获取 +${bonuses.xpGain}%`);
  if (bonuses.goldGain) out.push(`金币获取 +${bonuses.goldGain}%`);
  return out;
}

export function ReputationPanel({
  onClose,
  onChange
}: {
  onClose: () => void;
  onChange?: () => void;
}) {
  const [info, setInfo] = useState<ReputationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [showTiers, setShowTiers] = useState(false);
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      apiClient.clearCache();
      const res: any = await apiClient.getReputation();
      setInfo(res);
    } catch {
      toastRef.current.error('声望军需信息加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleBuy = async (item: QuartermasterShopItemInfo) => {
    if (busyItemId) return;
    setBusyItemId(item.id);
    try {
      const res: any = await apiClient.buyQuartermasterItem(item.id);
      apiClient.clearCache();
      if (res?.reputation) setInfo(res.reputation);
      else await load();
      toastRef.current.success(res?.purchase?.rewardSummary || `已兑换「${item.name}」`);
      onChange?.();
    } catch (e: any) {
      toastRef.current.error(e?.message || '军需兑换失败');
    } finally {
      setBusyItemId(null);
    }
  };

  const handleEquipTitle = async (titleId: string | null, label: string) => {
    if (busyItemId) return;
    setBusyItemId(titleId || '__unequip__');
    try {
      const res: any = await apiClient.equipReputationTitle(titleId);
      apiClient.clearCache();
      if (res?.reputation) setInfo(res.reputation);
      else await load();
      toastRef.current.success(titleId ? `已佩戴名号「${label}」` : '已卸下专属名号');
      onChange?.();
    } catch (e: any) {
      toastRef.current.error(e?.message || '名号切换失败');
    } finally {
      setBusyItemId(null);
    }
  };

  const curReq = info?.currentTier?.required ?? 0;
  const nextReq = info?.nextTier?.required ?? curReq;
  const tierPct = !info
    ? 0
    : !info.nextTier
      ? 100
      : Math.min(100, Math.max(2, Math.round(((info.total - curReq) / Math.max(1, nextReq - curReq)) * 100)));

  return (
    <PanelModal
      title="声望与军需官商店"
      icon={<T1Art kind="skills" id="qm_title_warder" fallback="" alt="" />}
      onClose={onClose}
    >
      {loading && !info ? (
        <div className="prog-loading">加载中…</div>
      ) : !info ? (
        <div className="prog-loading">暂无声望数据</div>
      ) : (
        <>
          <div className="prestige-hero rep-qm-hero-stats">
            <div className="prestige-stat">
              <div className="prestige-stat-value rep-stat-tier">Lv.{info.currentTier.tier}</div>
              <div className="prestige-stat-label">{info.currentTier.name}</div>
            </div>
            <div className="prestige-stat">
              <div className="prestige-stat-value">{info.total}</div>
              <div className="prestige-stat-label">累计声望（不掉阶）</div>
            </div>
            <div className="prestige-stat astrolabe-dust">
              <div className="prestige-stat-value">{info.available}</div>
              <div className="prestige-stat-label">可用军需声望</div>
            </div>
            <div className="prestige-stat highlight">
              <div className="prestige-stat-value rep-stat-title-text">
                {info.equippedTitle ? info.equippedTitle.titleLabel : '无名号'}
              </div>
              <div className="prestige-stat-label">当前佩戴名号</div>
            </div>
          </div>

          <div className="rep-hero">
            <div className="astrolabe-icon-wrap rep-crest-box">
              <T1Art
                kind={info.equippedTitle ? info.equippedTitle.iconKind : 'skills'}
                id={info.equippedTitle ? info.equippedTitle.iconId : tierCrestIconId(info.currentTier.tier)}
                className="astrolabe-node-icon"
                fallback=""
                alt={info.currentTier.name}
              />
            </div>
            <div className="rep-hero-main">
              <div className="rep-hero-tier-row">
                <span className="rep-hero-tier">
                  Lv.{info.currentTier.tier} · {info.currentTier.name}
                </span>
                {info.equippedTitle && (
                  <span className="qm-equipped-pill">
                    名号：{info.equippedTitle.titleLabel}
                  </span>
                )}
              </div>
              <div className="rep-hero-total">
                累计获得 <b>{info.total}</b> 点 · 已兑换军需 <b>{info.spent}</b> 点 · 可用余额 <b>{info.available}</b> 点
              </div>
              <div className="rep-progress-bar">
                <div className="rep-progress-fill" style={{ width: `${tierPct}%` }} />
              </div>
              <div className="rep-progress-text">
                {info.nextTier
                  ? `距离下一阶 Lv.${info.nextTier.tier}「${info.nextTier.name}」还需累计 ${info.progressToNext} 点声望（消费军需声望绝不降低阶位与被动加成）`
                  : '已达成最高声望阶位「不朽传说」！'}
              </div>
            </div>
          </div>

          <div className="qm-active-summary">
            <div className="qm-bonus-chips">
              <span className="rep-tier-bonus">采集速度 +{info.activeBonuses.gatherSpeed}%</span>
              <span className="rep-tier-bonus">制作速度 +{info.activeBonuses.craftSpeed}%</span>
              <span className="rep-tier-bonus">战斗速度 +{info.activeBonuses.combatSpeed}%</span>
              <span className="rep-tier-bonus">经验获取 +{info.activeBonuses.xpGain}%</span>
              <span className="rep-tier-bonus">金币获取 +{info.activeBonuses.goldGain}%</span>
            </div>
            {info.activeScrolls.length > 0 && (
              <div className="qm-scroll-active-bar">
                {info.activeScrolls.map((sc) => (
                  <div key={sc.id} className="qm-scroll-pill">
                    <T1Art kind={sc.iconKind} id={sc.iconId} className="qm-mini-icon" fallback="" alt={sc.name} />
                    <span>{sc.name} · 剩余 {fmtRemainingDuration(sc.remainingMs)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="astrolabe-section qm-shop-section">
            <div className="astrolabe-head">
              <div>
                <div className="sys-section-title" style={{ margin: 0 }}>声望军需官商店</div>
                <div className="astrolabe-sub">
                  完成赏金契约与生涯成就获取声望 · 兑换强化保护镜、限购稀有配方箱、长效增益卷轴与专属名号
                </div>
              </div>
              <button
                type="button"
                className="prog-filter-btn astrolabe-respec-btn"
                onClick={() => setShowTiers((v) => !v)}
              >
                {showTiers ? '收起阶位表' : '查看十阶加成'}
              </button>
            </div>

            <div className="astrolabe-grid qm-shop-grid">
              {info.quartermasterShop.map((item) => {
                const isBusy = busyItemId === item.id;
                const isTitleUnlocked = item.category === 'title' && item.isUnlockedTitle;
                return (
                  <div
                    key={item.id}
                    className={`astrolabe-card qm-item-card ${isTitleUnlocked || item.activeRemainingMs > 0 ? 'is-lit' : ''} ${item.isEquippedTitle ? 'is-max' : ''}`}
                  >
                    <div className="astrolabe-card-top">
                      <div className="astrolabe-icon-wrap">
                        <T1Art
                          kind={item.iconKind}
                          id={item.iconId}
                          className="astrolabe-node-icon"
                          fallback=""
                          alt={item.name}
                        />
                      </div>
                      <div className="astrolabe-meta">
                        <div className="astrolabe-title-row">
                          <span className="astrolabe-name">{item.name}</span>
                          <span className="astrolabe-constellation">{item.categoryLabel}</span>
                        </div>
                        <div className="qm-sub-badges">
                          <span className={`qm-req-tag ${item.unlockedByTier ? 'ok' : 'locked'}`}>
                            Lv.{item.requiredTier} {item.requiredTierName}
                          </span>
                          {item.dailyLimit !== null && (
                            <span className="qm-limit-tag">
                              今日 {item.dailyBought}/{item.dailyLimit}
                            </span>
                          )}
                          {item.activeRemainingMs > 0 && (
                            <span className="qm-active-tag">
                              生效中 · {fmtRemainingDuration(item.activeRemainingMs)}
                            </span>
                          )}
                          {item.isEquippedTitle && (
                            <span className="qm-active-tag">佩戴中</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="astrolabe-summary">{item.summary}</div>
                    <div className="astrolabe-effect-cur">{item.effectText}</div>

                    {isTitleUnlocked ? (
                      <button
                        type="button"
                        className={`astrolabe-upgrade-btn ${item.isEquippedTitle ? '' : 'ready'}`}
                        disabled={Boolean(busyItemId)}
                        onClick={() =>
                          handleEquipTitle(
                            item.isEquippedTitle ? null : item.id,
                            item.titleLabel || item.name
                          )
                        }
                      >
                        {item.isEquippedTitle
                          ? '正在佩戴 · 点击卸下'
                          : `佩戴名号「${item.titleLabel || item.name}」`}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={`astrolabe-upgrade-btn ${item.canBuy ? 'ready' : ''}`}
                        disabled={!item.canBuy || Boolean(busyItemId)}
                        onClick={() => handleBuy(item)}
                      >
                        {isBusy
                          ? '军需调拨中…'
                          : item.canBuy
                            ? `兑换 · ${item.cost} 声望`
                            : `${item.blockReason || '不可兑换'}（${item.cost} 声望）`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {showTiers && (
            <div style={{ marginTop: 16 }}>
              <div className="sys-section-title">声望十阶永久被动一览</div>
              <div className="rep-tier-list">
                {info.tiers.map((t) => {
                  const reached = info.total >= t.required;
                  const isCurrent = info.currentTier.tier === t.tier;
                  const bList = formatTierBonuses(t.bonuses);
                  return (
                    <div
                      key={t.tier}
                      className={`rep-tier-card ${reached ? 'reached' : ''} ${isCurrent ? 'current' : ''}`}
                    >
                      <div className="rep-tier-left">
                        <T1Art
                          kind="skills"
                          id={tierCrestIconId(t.tier)}
                          className="qm-mini-icon"
                          fallback=""
                          alt=""
                        />
                        <span className="rep-tier-name">
                          Lv.{t.tier} {t.name}
                        </span>
                      </div>
                      <div className="rep-tier-mid">
                        {bList.length > 0 ? (
                          bList.map((txt) => (
                            <span key={txt} className="rep-tier-bonus">
                              {txt}
                            </span>
                          ))
                        ) : (
                          <span className="rep-tier-noeff">初始阶位</span>
                        )}
                      </div>
                      <div className="rep-tier-req">
                        {reached ? '已达成' : `累计 ${t.required}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </PanelModal>
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
