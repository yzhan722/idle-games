import React, { useEffect, useState, useCallback, useRef } from 'react';
import { apiClient } from '../services/api';
import { useToast } from './Toast';
import { T1Art, T1ItemIcon } from './T1Art';
import { previewCaravanCargoFrontend, type CaravanRouteId } from '../gameplay/caravanTrade';
import type {
  AlchemicalPotionId,
  AlchemicalPotionLevelStats,
  AlchemyCauldronBonuses,
  CauldronMasteryTierDef,
  PotionBrewMode,
  RecipeUpgradeMode,
  ResonanceSlotIndex,
  TwinResonanceBonuses,
} from '../gameplay/alchemyCauldron';
import type {
  AstralCuratorTierDef,
  AstralRelicsBonuses,
  AstralRuinStratumId,
  ExpeditionSurveyMode,
  FullGalleryResonanceDef,
  RelicUpgradeMode,
  SacredRelicId,
  SacredRelicLevelStats,
} from '../gameplay/astralRelics';
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

// ============ 传世铭纹附魔台 & 跨职业套装共鸣图鉴 (WL-6) ============
interface WorkshopCrystalCost {
  itemId: string;
  name: string;
  need: number;
  have: number;
}

interface WorkshopRuneInfo {
  id: string;
  slot: 'weapon' | 'armor' | 'tool';
  slotLabel: string;
  name: string;
  subtitle: string;
  description: string;
  iconId: string;
  rank: number;
  maxRank: number;
  isMax: boolean;
  isEquipped: boolean;
  canAfford: boolean;
  perRank: Record<string, number | undefined>;
  nextCost: {
    targetRank: number;
    forgingEmblems: number;
    gold: number;
    crystals: WorkshopCrystalCost[];
  } | null;
}

interface WorkshopSynthRecipeInfo {
  id: string;
  name: string;
  description: string;
  goldCost: number;
  emblemsOut: number;
  crystals: WorkshopCrystalCost[];
  canAfford: boolean;
}

interface WorkshopCodexTierInfo {
  tier: 1 | 2 | 3;
  milestoneId: string;
  title: string;
  items: Array<{ itemId: string; name: string; unlocked: boolean }>;
  unlockedCount: number;
  totalCount: number;
  completed: boolean;
  claimed: boolean;
  claimable: boolean;
  passiveBonuses: Record<string, number | undefined>;
  reward: { gold: number; reputation: number; forgingEmblems: number };
}

interface WorkshopCodexSetInfo {
  id: string;
  name: string;
  pairLabel: string;
  iconId: string;
  description: string;
  unlockedItemsInSet: number;
  totalItemsInSet: number;
  completedTiersInSet: number;
  tiers: WorkshopCodexTierInfo[];
}

interface WorkshopGlobalMilestoneInfo {
  id: string;
  requiredTiers: number;
  name: string;
  description: string;
  completed: boolean;
  claimed: boolean;
  claimable: boolean;
  passiveBonuses: Record<string, number | undefined>;
  reward: {
    gold: number;
    reputation: number;
    forgingEmblems: number;
    itemList: Array<{ itemId: string; name: string; qty: number }>;
  };
}

interface HeritageWorkshopInfo {
  forgingEmblems: number;
  gold: number;
  crystalsInventory: Record<string, number>;
  equippedRunes: Record<'weapon' | 'armor' | 'tool', string | null>;
  runes: WorkshopRuneInfo[];
  synthesis: {
    dailyLimit: number;
    usedToday: number;
    remainingToday: number;
    recipes: WorkshopSynthRecipeInfo[];
  };
  codex: {
    unlockedItemsCount: number;
    totalTrackedItems: number;
    completedSetTiers: number;
    totalSetTiers: number;
    claimableCount: number;
    sets: WorkshopCodexSetInfo[];
    globalMilestones: WorkshopGlobalMilestoneInfo[];
  };
  bonuses: {
    bonusAtk: number;
    bonusDef: number;
    bonusHp: number;
    armorPenPct: number;
    thornsDefRatio: number;
    intervalMult: number;
    critRateBonusPct: number;
    critDmgBonusPct: number;
    foodHealMult: number;
    potionBuffMult: number;
    gatherSpeedPct: number;
    craftSpeedPct: number;
    gatherDoubleChance: number;
    craftEfficiencyPct: number;
    rareFindPct: number;
    goldGainPct: number;
    xpGainPct: number;
    completedSetTiers: number;
  };
}

function formatRunePerRankLines(perRank: Record<string, number | undefined>, rank: number): string[] {
  const r = Math.max(1, rank);
  const suffix = rank > 0 ? `（当前 Lv.${rank}）` : '（1 阶效果）';
  const tags: string[] = [];
  if (perRank.bonusAtk) tags.push(`攻击 +${perRank.bonusAtk * r}`);
  if (perRank.bonusDef) tags.push(`防御 +${perRank.bonusDef * r}`);
  if (perRank.bonusHp) tags.push(`生命 +${perRank.bonusHp * r}`);
  if (perRank.armorPenPct) tags.push(`破甲穿透 +${Math.round(perRank.armorPenPct * r * 100)}%`);
  if (perRank.thornsDefRatio) tags.push(`反伤护御 +${Math.round(perRank.thornsDefRatio * r * 100)}%防御`);
  if (perRank.intervalReductionPct) tags.push(`攻速间隔 -${Math.round(perRank.intervalReductionPct * r * 10) / 10}%`);
  if (perRank.critRateBonusPct) tags.push(`暴击率 +${Math.round(perRank.critRateBonusPct * r * 10) / 10}%`);
  if (perRank.critDmgBonusPct) tags.push(`暴击伤害 +${perRank.critDmgBonusPct * r}%`);
  if (perRank.foodHealPct) tags.push(`料理恢复 +${perRank.foodHealPct * r}%`);
  if (perRank.potionBuffPct) tags.push(`秘药增益 +${perRank.potionBuffPct * r}%`);
  if (perRank.gatherSpeedPct) tags.push(`采集速度 +${perRank.gatherSpeedPct * r}%`);
  if (perRank.craftSpeedPct) tags.push(`制作速度 +${perRank.craftSpeedPct * r}%`);
  if (perRank.gatherDoubleChance) tags.push(`采集双倍暴击 +${Math.round(perRank.gatherDoubleChance * r * 100)}%`);
  if (perRank.craftEfficiencyPct) tags.push(`制作连作效率 +${perRank.craftEfficiencyPct * r}%`);
  if (perRank.rareFindPct) tags.push(`稀有寻获 +${perRank.rareFindPct * r}%`);
  if (perRank.goldGainPct) tags.push(`金币收益 +${perRank.goldGainPct * r}%`);
  if (tags.length > 0) tags[0] = `${tags[0]} ${suffix}`;
  return tags;
}

function formatCodexPassiveTags(pb: Record<string, number | undefined>): string[] {
  const tags: string[] = [];
  if (pb.bonusAtk) tags.push(`攻击 +${pb.bonusAtk}`);
  if (pb.bonusDef) tags.push(`防御 +${pb.bonusDef}`);
  if (pb.bonusHp) tags.push(`生命 +${pb.bonusHp}`);
  if (pb.armorPenPct) tags.push(`破甲 +${Math.round(pb.armorPenPct * 100)}%`);
  if (pb.critRateBonusPct) tags.push(`暴击 +${pb.critRateBonusPct}%`);
  if (pb.foodHealPct) tags.push(`料理恢复 +${pb.foodHealPct}%`);
  if (pb.potionBuffPct) tags.push(`秘药增益 +${pb.potionBuffPct}%`);
  if (pb.gatherSpeedPct) tags.push(`采集 +${pb.gatherSpeedPct}%`);
  if (pb.craftSpeedPct) tags.push(`制作 +${pb.craftSpeedPct}%`);
  if (pb.gatherDoubleChance) tags.push(`双倍采集 +${Math.round(pb.gatherDoubleChance * 100)}%`);
  if (pb.craftEfficiencyPct) tags.push(`制作效率 +${pb.craftEfficiencyPct}%`);
  if (pb.rareFindPct) tags.push(`寻获 +${pb.rareFindPct}%`);
  if (pb.goldGainPct) tags.push(`金币 +${pb.goldGainPct}%`);
  if (pb.xpGainPct) tags.push(`经验 +${pb.xpGainPct}%`);
  return tags;
}

function formatWorkshopSummaryChips(b: HeritageWorkshopInfo['bonuses']): string[] {
  const chips: string[] = [];
  if (b.bonusAtk > 0) chips.push(`攻击 +${b.bonusAtk}`);
  if (b.bonusDef > 0) chips.push(`防御 +${b.bonusDef}`);
  if (b.bonusHp > 0) chips.push(`生命 +${b.bonusHp}`);
  if (b.armorPenPct > 0) chips.push(`破甲 +${Math.round(b.armorPenPct * 100)}%`);
  if (b.thornsDefRatio > 0) chips.push(`反伤 +${Math.round(b.thornsDefRatio * 100)}%防`);
  if (b.intervalMult < 1) chips.push(`普攻间隔 ×${b.intervalMult}`);
  if (b.critRateBonusPct > 0) chips.push(`暴击率 +${b.critRateBonusPct}%`);
  if (b.critDmgBonusPct > 0) chips.push(`暴伤 +${b.critDmgBonusPct}%`);
  if (b.foodHealMult > 1) chips.push(`料理恢复 +${Math.round((b.foodHealMult - 1) * 100)}%`);
  if (b.potionBuffMult > 1) chips.push(`秘药增益 +${Math.round((b.potionBuffMult - 1) * 100)}%`);
  if (b.gatherSpeedPct > 0) chips.push(`采集速度 +${b.gatherSpeedPct}%`);
  if (b.gatherDoubleChance > 0) chips.push(`采集双倍 +${Math.round(b.gatherDoubleChance * 100)}%`);
  if (b.craftSpeedPct > 0) chips.push(`制作速度 +${b.craftSpeedPct}%`);
  if (b.craftEfficiencyPct > 0) chips.push(`制作效率 +${b.craftEfficiencyPct}%`);
  if (b.rareFindPct > 0) chips.push(`稀有寻获 +${b.rareFindPct}%`);
  if (b.goldGainPct > 0) chips.push(`金币收益 +${b.goldGainPct}%`);
  if (b.xpGainPct > 0) chips.push(`经验收益 +${b.xpGainPct}%`);
  return chips;
}

const RUNE_SLOT_META: Array<{ slot: 'weapon' | 'armor' | 'tool'; label: string; iconId: string }> = [
  { slot: 'weapon', label: '武器铭纹槽', iconId: 'rune_slot_weapon' },
  { slot: 'armor', label: '防具铭纹槽', iconId: 'rune_slot_armor' },
  { slot: 'tool', label: '工具铭纹槽', iconId: 'rune_slot_tool' },
];

export function HeritageWorkshopPanel({
  onClose,
  onChange,
}: {
  onClose: () => void;
  onChange?: () => void;
}) {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const [info, setInfo] = useState<HeritageWorkshopInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'altar' | 'codex'>('altar');
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      apiClient.clearCache();
      const res: any = await apiClient.getHeritageWorkshop();
      setInfo(res);
    } catch (e: any) {
      toastRef.current.error(e?.message || '加载传世铭纹与共鸣图鉴失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleEngrave = async (rune: WorkshopRuneInfo) => {
    setBusyKey(`engrave:${rune.id}`);
    try {
      const res: any = await apiClient.engraveHeritageRune(rune.id);
      if (res?.workshop) setInfo(res.workshop);
      else await load();
      toast.success(`铭纹「${rune.name}」已篆刻升至 ${res?.engraved?.newRank || rune.rank + 1} 阶`);
      onChange?.();
    } catch (e: any) {
      toast.error(e?.message || '篆刻铭纹失败');
    } finally {
      setBusyKey(null);
    }
  };

  const handleEquip = async (slot: 'weapon' | 'armor' | 'tool', runeId: string | null, label: string) => {
    setBusyKey(`equip:${slot}:${runeId || 'none'}`);
    try {
      const res: any = await apiClient.equipHeritageRune(slot, runeId);
      if (res?.workshop) setInfo(res.workshop);
      else await load();
      toast.success(runeId ? `已镶嵌激活「${label}」` : '已卸下该槽位传世铭纹');
      onChange?.();
    } catch (e: any) {
      toast.error(e?.message || '切换铭纹失败');
    } finally {
      setBusyKey(null);
    }
  };

  const handleSynthesize = async (recipe: WorkshopSynthRecipeInfo) => {
    setBusyKey(`synth:${recipe.id}`);
    try {
      const res: any = await apiClient.synthesizeForgingEmblem(recipe.id);
      if (res?.workshop) setInfo(res.workshop);
      else await load();
      toast.success(`熔铸成功：获得稀有锻造徽记 ×${recipe.emblemsOut}`);
      onChange?.();
    } catch (e: any) {
      toast.error(e?.message || '熔铸徽记失败');
    } finally {
      setBusyKey(null);
    }
  };

  const handleClaimMilestone = async (milestoneId: string, label: string) => {
    setBusyKey(`claim:${milestoneId}`);
    try {
      const res: any = await apiClient.claimHeritageCodexMilestone(milestoneId);
      if (res?.workshop) setInfo(res.workshop);
      else await load();
      toast.success(`已领取共鸣奖励「${label}」`);
      onChange?.();
    } catch (e: any) {
      toast.error(e?.message || '领取共鸣奖励失败');
    } finally {
      setBusyKey(null);
    }
  };

  const summaryChips = info ? formatWorkshopSummaryChips(info.bonuses) : [];
  const activeSocketCount = info
    ? (['weapon', 'armor', 'tool'] as const).filter((s) => !!info.equippedRunes[s]).length
    : 0;

  return (
    <PanelModal
      title="传世铭纹附魔台与跨职业共鸣图鉴"
      icon={<T1Art kind="skills" id="rune_altar_core" className="hw-modal-title-icon" fallback="" alt="" />}
      onClose={onClose}
    >
      {loading && !info ? (
        <div className="prog-empty">正在读取异世界工坊圣典…</div>
      ) : !info ? (
        <div className="prog-empty">暂无工坊圣典数据</div>
      ) : (
        <div className="hw-panel-root" data-testid="heritage-workshop-panel">
          {/* 顶部资源与全局共鸣总览 */}
          <div className="hw-hero-card">
            <div className="hw-hero-top">
              <div className="hw-hero-emblem">
                <T1Art kind="skills" id="rune_altar_core" className="hw-hero-core-icon" fallback="" alt="附魔台核心" />
              </div>
              <div className="hw-hero-copy">
                <div className="hw-hero-title">传世槽位附魔 · 跨职业百工共鸣</div>
                <div className="hw-hero-sub">
                  铭纹绑定武器 / 防具 / 工具槽位，更换装备或转生均永久保留；跨职业造物一经采集或制作即永久收录图鉴。
                </div>
              </div>
            </div>

            <div className="hw-wallet-bar">
              <span className="hw-wallet-pill is-emblem">
                <T1Art kind="skills" id="forging_emblem" className="qm-mini-icon" fallback="" alt="" />
                <span>稀有锻造徽记</span>
                <strong>{info.forgingEmblems}</strong>
              </span>
              <span className="hw-wallet-pill">
                <T1Art kind="ui" id="gold" className="qm-mini-icon" fallback="" alt="" />
                <span>金币</span>
                <strong>{info.gold}</strong>
              </span>
              {(['crystal_1', 'crystal_2', 'crystal_3', 'crystal_4'] as const).map((cid) => (
                <span key={cid} className="hw-wallet-pill is-crystal">
                  <T1ItemIcon itemId={cid} className="qm-mini-icon" fallback="" alt="" />
                  <strong>{info.crystalsInventory[cid] ?? 0}</strong>
                </span>
              ))}
              <span className="hw-wallet-pill">
                <span>生效槽位</span>
                <strong>{activeSocketCount} / 3</strong>
              </span>
              <span className="hw-wallet-pill">
                <span>共鸣阶级</span>
                <strong>
                  {info.codex.completedSetTiers} / {info.codex.totalSetTiers}
                </strong>
              </span>
            </div>

            <div className="hw-summary-strip">
              {summaryChips.length > 0 ? (
                summaryChips.map((chip, idx) => (
                  <span key={idx} className="rep-bonus-tag active">
                    {chip}
                  </span>
                ))
              ) : (
                <span className="hw-summary-empty">
                  当前尚未激活传世铭纹或跨职业套装共鸣 —— 可在下方篆刻铭纹或使用晶簇熔铸稀有锻造徽记。
                </span>
              )}
            </div>
          </div>

          {/* 子页签切换 */}
          <div className="prog-filter-row" style={{ marginBottom: 14 }}>
            <button
              type="button"
              data-testid="workshop-tab-altar"
              className={`prog-filter-btn ${tab === 'altar' ? 'active' : ''}`}
              onClick={() => setTab('altar')}
            >
              传世铭纹附魔台（{activeSocketCount}/3）
            </button>
            <button
              type="button"
              data-testid="workshop-tab-codex"
              className={`prog-filter-btn ${tab === 'codex' ? 'active' : ''}`}
              onClick={() => setTab('codex')}
            >
              跨职业套装共鸣图鉴（{info.codex.unlockedItemsCount}/{info.codex.totalTrackedItems}）
              {info.codex.claimableCount > 0 ? ` · 可领 ${info.codex.claimableCount}` : ''}
            </button>
          </div>

          {tab === 'altar' && (
            <div className="hw-altar-view">
              {/* 三大装备槽位基座 */}
              <div className="hw-slot-pedestals">
                {RUNE_SLOT_META.map((sm) => {
                  const activeId = info.equippedRunes[sm.slot];
                  const activeRune = info.runes.find((r) => r.id === activeId);
                  return (
                    <div key={sm.slot} className={`hw-pedestal-card ${activeRune ? 'is-socketed' : ''}`}>
                      <div className="hw-pedestal-icon">
                        <T1Art kind="skills" id={sm.iconId} className="hw-slot-art" fallback="" alt={sm.label} />
                      </div>
                      <div className="hw-pedestal-info">
                        <div className="hw-pedestal-slot">{sm.label}</div>
                        {activeRune ? (
                          <>
                            <div className="hw-pedestal-name">
                              {activeRune.name} <span className="qm-equipped-pill">Lv.{activeRune.rank}</span>
                            </div>
                            <button
                              type="button"
                              className="hw-link-btn"
                              disabled={busyKey !== null}
                              onClick={() => void handleEquip(sm.slot, null, activeRune.name)}
                            >
                              卸下槽位铭纹
                            </button>
                          </>
                        ) : (
                          <div className="hw-pedestal-empty">未镶嵌铭纹</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 六大传世铭纹篆刻卡 */}
              <div className="hw-rune-grid">
                {info.runes.map((rune) => {
                  const effectTags = formatRunePerRankLines(rune.perRank, rune.rank);
                  const engraveBusy = busyKey === `engrave:${rune.id}`;
                  const equipBusy = busyKey === `equip:${rune.slot}:${rune.id}`;
                  return (
                    <div
                      key={rune.id}
                      data-testid={`rune-card-${rune.id}`}
                      className={`hw-rune-card ${rune.isEquipped ? 'is-equipped' : ''} ${rune.rank > 0 ? 'is-unlocked' : ''}`}
                    >
                      <div className="hw-rune-head">
                        <div className="hw-rune-icon-wrap">
                          <T1Art kind="skills" id={rune.iconId} className="hw-rune-icon" fallback="" alt={rune.name} />
                        </div>
                        <div className="hw-rune-head-copy">
                          <div className="hw-rune-title-row">
                            <span className="hw-slot-chip">{rune.slotLabel}</span>
                            <strong className="hw-rune-name">{rune.name}</strong>
                            <span className="astrolabe-rank-pill">
                              Lv.{rune.rank}/{rune.maxRank}
                            </span>
                          </div>
                          <div className="hw-rune-sub">{rune.subtitle}</div>
                        </div>
                      </div>

                      <div className="hw-rune-desc">{rune.description}</div>

                      <div className="hw-bonus-tags">
                        {effectTags.map((t, idx) => (
                          <span key={idx} className={`rep-bonus-tag ${rune.isEquipped ? 'active' : ''}`}>
                            {t}
                          </span>
                        ))}
                      </div>

                      {rune.nextCost ? (
                        <div className="hw-cost-row">
                          <span className="hw-cost-label">升至 {rune.nextCost.targetRank} 阶消耗：</span>
                          <span className={`hw-cost-chip ${info.forgingEmblems >= rune.nextCost.forgingEmblems ? 'ok' : 'lack'}`}>
                            <T1Art kind="skills" id="forging_emblem" className="qm-mini-icon" fallback="" alt="" />
                            徽记 ×{rune.nextCost.forgingEmblems}
                          </span>
                          {rune.nextCost.crystals.map((c) => (
                            <span key={c.itemId} className={`hw-cost-chip ${c.have >= c.need ? 'ok' : 'lack'}`}>
                              <T1ItemIcon itemId={c.itemId} className="qm-mini-icon" fallback="" alt={c.name} />
                              {c.name} {c.have}/{c.need}
                            </span>
                          ))}
                          <span className={`hw-cost-chip ${info.gold >= rune.nextCost.gold ? 'ok' : 'lack'}`}>
                            <T1Art kind="ui" id="gold" className="qm-mini-icon" fallback="" alt="" />
                            {rune.nextCost.gold} 金
                          </span>
                        </div>
                      ) : (
                        <div className="hw-cost-row">
                          <span className="qm-active-tag">已圆满篆刻至最高等阶</span>
                        </div>
                      )}

                      <div className="hw-rune-actions">
                        {!rune.isMax && (
                          <button
                            type="button"
                            data-testid={`engrave-${rune.id}`}
                            className="prog-claim-btn"
                            disabled={!rune.canAfford || busyKey !== null}
                            onClick={() => void handleEngrave(rune)}
                          >
                            {engraveBusy
                              ? '篆刻中…'
                              : rune.rank === 0
                                ? '篆刻解锁（1 阶）'
                                : `升阶铭纹（Lv.${rune.rank + 1}）`}
                          </button>
                        )}
                        {rune.rank > 0 && (
                          <button
                            type="button"
                            data-testid={`equip-${rune.id}`}
                            className={`prog-filter-btn ${rune.isEquipped ? 'active' : ''}`}
                            disabled={rune.isEquipped || busyKey !== null}
                            onClick={() => void handleEquip(rune.slot, rune.id, rune.name)}
                          >
                            {equipBusy ? '镶嵌中…' : rune.isEquipped ? '当前槽位生效中' : '镶嵌至槽位'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 晶簇熔铸锻造徽记保底工坊 */}
              <div className="hw-synth-section">
                <div className="hw-synth-header">
                  <div>
                    <div className="hw-synth-title">工坊晶簇熔铸 · 稀有锻造徽记合成</div>
                    <div className="hw-synth-sub">
                      除公会委托连携赏金外，中后期工匠可直接消耗各阶水晶与金币熔铸「稀有锻造徽记」。
                    </div>
                  </div>
                  <span className="qm-limit-tag">
                    今日剩余 {info.synthesis.remainingToday}/{info.synthesis.dailyLimit} 次
                  </span>
                </div>
                <div className="hw-synth-grid">
                  {info.synthesis.recipes.map((rc) => {
                    const synthBusy = busyKey === `synth:${rc.id}`;
                    return (
                      <div key={rc.id} className="hw-synth-card" data-testid={`synth-card-${rc.id}`}>
                        <div className="hw-synth-card-top">
                          <T1Art kind="skills" id="forging_emblem" className="hw-synth-emblem" fallback="" alt="" />
                          <div>
                            <div className="hw-synth-name">
                              {rc.name} <span className="qm-equipped-pill">+{rc.emblemsOut} 徽记</span>
                            </div>
                            <div className="hw-synth-desc">{rc.description}</div>
                          </div>
                        </div>
                        <div className="hw-cost-row">
                          {rc.crystals.map((c) => (
                            <span key={c.itemId} className={`hw-cost-chip ${c.have >= c.need ? 'ok' : 'lack'}`}>
                              <T1ItemIcon itemId={c.itemId} className="qm-mini-icon" fallback="" alt={c.name} />
                              {c.name} {c.have}/{c.need}
                            </span>
                          ))}
                          <span className={`hw-cost-chip ${info.gold >= rc.goldCost ? 'ok' : 'lack'}`}>
                            <T1Art kind="ui" id="gold" className="qm-mini-icon" fallback="" alt="" />
                            {rc.goldCost} 金
                          </span>
                        </div>
                        <button
                          type="button"
                          data-testid={`synth-btn-${rc.id}`}
                          className="prog-claim-btn"
                          disabled={!rc.canAfford || busyKey !== null}
                          onClick={() => void handleSynthesize(rc)}
                        >
                          {synthBusy ? '熔铸中…' : `熔铸徽记 +${rc.emblemsOut}`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'codex' && (
            <div className="hw-codex-view">
              {/* 全图鉴共鸣里程碑 */}
              <div className="hw-global-milestones">
                <div className="hw-section-heading">
                  <span>全图鉴共鸣圣碑</span>
                  <small>
                    已点亮 {info.codex.completedSetTiers} / {info.codex.totalSetTiers} 阶套装
                  </small>
                </div>
                <div className="hw-gm-grid">
                  {info.codex.globalMilestones.map((gm) => {
                    const pTags = formatCodexPassiveTags(gm.passiveBonuses);
                    const claimBusy = busyKey === `claim:${gm.id}`;
                    return (
                      <div
                        key={gm.id}
                        data-testid={`codex-gm-${gm.id}`}
                        className={`hw-gm-card ${gm.completed ? 'is-done' : ''}`}
                      >
                        <div className="hw-gm-top">
                          <strong>{gm.name}</strong>
                          <span className={`qm-req-tag ${gm.completed ? 'ok' : 'locked'}`}>
                            {info.codex.completedSetTiers}/{gm.requiredTiers} 阶
                          </span>
                        </div>
                        <div className="hw-gm-desc">{gm.description}</div>
                        <div className="hw-bonus-tags">
                          {pTags.map((t, i) => (
                            <span key={i} className={`rep-bonus-tag ${gm.completed ? 'active' : ''}`}>
                              {t}
                            </span>
                          ))}
                        </div>
                        <div className="hw-gm-reward">
                          奖励：{gm.reward.gold} 金 · 声望 +{gm.reward.reputation} · 徽记 +{gm.reward.forgingEmblems}
                          {gm.reward.itemList.map((it) => ` · ${it.name}×${it.qty}`).join('')}
                        </div>
                        <button
                          type="button"
                          data-testid={`claim-${gm.id}`}
                          className="prog-claim-btn"
                          disabled={!gm.claimable || busyKey !== null}
                          onClick={() => void handleClaimMilestone(gm.id, gm.name)}
                        >
                          {claimBusy
                            ? '领取中…'
                            : gm.claimed
                              ? '里程碑已领取'
                              : gm.claimable
                                ? '领取圣碑大奖'
                                : `需点亮 ${gm.requiredTiers} 阶`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 四大跨职业套装共鸣卡片 */}
              <div className="hw-codex-set-list">
                {info.codex.sets.map((set) => (
                  <div key={set.id} className="hw-set-card" data-testid={`codex-set-${set.id}`}>
                    <div className="hw-set-header">
                      <div className="hw-set-emblem-wrap">
                        <T1Art kind="skills" id={set.iconId} className="hw-set-emblem" fallback="" alt={set.name} />
                      </div>
                      <div className="hw-set-head-copy">
                        <div className="hw-set-title-row">
                          <span className="hw-slot-chip">{set.pairLabel}</span>
                          <strong>{set.name}</strong>
                          <span className="qm-limit-tag">
                            已收录 {set.unlockedItemsInSet}/{set.totalItemsInSet} · 共鸣 {set.completedTiersInSet}/3 阶
                          </span>
                        </div>
                        <div className="hw-set-desc">{set.description}</div>
                      </div>
                    </div>

                    <div className="hw-tier-list">
                      {set.tiers.map((tier) => {
                        const pTags = formatCodexPassiveTags(tier.passiveBonuses);
                        const claimBusy = busyKey === `claim:${tier.milestoneId}`;
                        return (
                          <div
                            key={tier.milestoneId}
                            className={`hw-tier-row ${tier.completed ? 'is-completed' : ''}`}
                          >
                            <div className="hw-tier-main">
                              <div className="hw-tier-title-line">
                                <strong>{tier.title}</strong>
                                <span className={`qm-req-tag ${tier.completed ? 'ok' : 'locked'}`}>
                                  {tier.completed ? '被动共鸣已激活' : `${tier.unlockedCount}/${tier.totalCount} 已点亮`}
                                </span>
                              </div>
                              <div className="hw-tier-items">
                                {tier.items.map((it) => (
                                  <span
                                    key={it.itemId}
                                    className={`hw-codex-item-pill ${it.unlocked ? 'unlocked' : 'locked'}`}
                                  >
                                    <T1ItemIcon itemId={it.itemId} className="qm-mini-icon" fallback="" alt={it.name} />
                                    <span>{it.name}</span>
                                    <small>{it.unlocked ? '已收录' : '未收录'}</small>
                                  </span>
                                ))}
                              </div>
                              <div className="hw-bonus-tags">
                                {pTags.map((t, idx) => (
                                  <span key={idx} className={`rep-bonus-tag ${tier.completed ? 'active' : ''}`}>
                                    {t}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="hw-tier-side">
                              <div className="hw-tier-reward-copy">
                                +{tier.reward.gold}金 / +{tier.reward.reputation}声望 / +{tier.reward.forgingEmblems}徽记
                              </div>
                              <button
                                type="button"
                                data-testid={`claim-${tier.milestoneId}`}
                                className="prog-claim-btn"
                                disabled={!tier.claimable || busyKey !== null}
                                onClick={() => void handleClaimMilestone(tier.milestoneId, `${set.name} · ${tier.title}`)}
                              >
                                {claimBusy
                                  ? '领取中…'
                                  : tier.claimed
                                    ? '已领赏'
                                    : tier.claimable
                                      ? '领取共鸣赏'
                                      : '待集齐'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </PanelModal>
  );
}

// =================================================================
// 远征商队贸易航路与工坊特批契约柜台面板 (WL-7)
// =================================================================

interface CaravanRouteViewInfo {
  id: CaravanRouteId;
  name: string;
  townName: string;
  iconId: string;
  favoredCategory: 'lumber_fish_dishes' | 'ore_ingot_tools' | 'herb_cloth_crystal_alchemy';
  favoredLabel: string;
  description: string;
  baseDurationMs: number;
  effectiveDurationMs: number;
  scarcityMultiplier: number;
  hotMultiplier: number;
  hotItems: Array<{ itemId: string; name: string; idleHave: number }>;
}

interface CaravanWagonSlotInfo {
  slot: 0 | 1 | 2;
  unlocked: boolean;
  requiredRepLevel: number;
  status: 'locked' | 'idle' | 'in_transit' | 'ready';
  run: {
    slot: 0 | 1 | 2;
    routeId: CaravanRouteId;
    routeName: string;
    routeIconId: string;
    cargo: Record<string, number>;
    cargoItems: Array<{ itemId: string; name: string; qty: number }>;
    startedAt: number;
    completesAt: number;
    remainingMs: number;
    scarcityMultiplier: number;
    usedExpressPermit?: boolean;
    expectedReward: {
      gold: number;
      astralCrystalDust: number;
      forgingEmblems: number;
      caravanRep: number;
    };
  } | null;
}

interface IdleCargoCatalogEntry {
  itemId: string;
  name: string;
  idleQty: number;
  unitValue: number;
  tier: number;
  category: 'lumber_fish_dishes' | 'ore_ingot_tools' | 'herb_cloth_crystal_alchemy' | null;
}

interface WorkshopSupplyContractView {
  id: string;
  templateId: string;
  name: string;
  description: string;
  rarity: 'standard' | 'urgent' | 'royal';
  fulfilled: boolean;
  canFulfill: boolean;
  demandList: Array<{ itemId: string; name: string; need: number; have: number }>;
  reward: {
    gold: number;
    astralCrystalDust: number;
    forgingEmblems: number;
    honorPoints: number;
    expressPermits: number;
    caravanRep: number;
  };
}

interface AstralDustOfferView {
  id: string;
  name: string;
  description: string;
  dustCost: number;
  dailyLimit?: number;
  usedToday: number;
  remainingToday: number | null;
  canAfford: boolean;
  kind: 'ledger' | 'emblem' | 'crystals' | 'permit';
  emblemsOut?: number;
  expressPermitsOut?: number;
  itemList: Array<{ itemId: string; name: string; qty: number }>;
}

interface CaravanTradeInfo {
  nowMs: number;
  shiftKey: string;
  gold: number;
  astralCrystalDust: number;
  forgingEmblems: number;
  honorPoints: number;
  expressPermits: number;
  caravanRep: number;
  totalRunsCompleted: number;
  totalContractsFulfilled: number;
  reputationTier: {
    level: number;
    title: string;
    minRep: number;
    nextLevelRep: number | null;
    nextTitle: string | null;
    progressPct: number;
    allTiers: Array<{
      level: number;
      minRep: number;
      title: string;
      maxWagons: number;
      gatherDoubleChance: number;
      craftSpeedPct: number;
      goldGainPct: number;
    }>;
  };
  bonuses: {
    level: number;
    title: string;
    ledgerRank: number;
    maxWagons: 1 | 2 | 3;
    maxCargoCapacity: number;
    gatherDoubleChance: number;
    craftSpeedPct: number;
    goldGainPct: number;
    tradeYieldPct: number;
    durationReductionPct: number;
  };
  routes: CaravanRouteViewInfo[];
  wagonSlots: CaravanWagonSlotInfo[];
  idleCargoCatalog: IdleCargoCatalogEntry[];
  contractsBoard: {
    date: string;
    rerollsUsed: number;
    rerollsRemaining: number;
    rerollCost: number;
    contracts: WorkshopSupplyContractView[];
  };
  exchange: {
    ledgerUpgrade: {
      rank: number;
      maxRank: number;
      isMax: boolean;
      nextDustCost: number | null;
      canAfford: boolean;
    };
    offers: AstralDustOfferView[];
  };
}

function formatDurationShort(ms: number): string {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}小时${rm > 0 ? `${rm}分` : ''}`;
  }
  if (m > 0) return s > 0 ? `${m}分${String(s).padStart(2, '0')}秒` : `${m}分钟`;
  return `${s}秒`;
}

const CONTRACT_RARITY_LABELS: Record<'standard' | 'urgent' | 'royal', string> = {
  standard: '常备特批',
  urgent: '加急征调',
  royal: '皇家总契',
};

export function CaravanTradePanel({
  onClose,
  onChange,
}: {
  onClose: () => void;
  onChange?: () => void;
}) {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [info, setInfo] = useState<CaravanTradeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'routes' | 'contracts' | 'exchange'>('routes');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<CaravanRouteId>('frostport');
  const [selectedWagonSlot, setSelectedWagonSlot] = useState<0 | 1 | 2>(0);
  const [draftCargo, setDraftCargo] = useState<Record<string, number>>({});
  const [useExpressPermit, setUseExpressPermit] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      apiClient.clearCache();
      const res: any = await apiClient.getCaravanTrade();
      setInfo(res);
      if (res?.wagonSlots) {
        const firstIdle = (res.wagonSlots as CaravanWagonSlotInfo[]).find((w) => w.status === 'idle');
        if (firstIdle) setSelectedWagonSlot(firstIdle.slot);
      }
    } catch (e: any) {
      toastRef.current.error(e?.message || '加载远征商队与特批契约柜台失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const hasInTransit = info?.wagonSlots.some((w) => w.run && nowTick < w.run.completesAt);
    if (!hasInTransit) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [info, nowTick]);

  const smartFillForRoute = useCallback(
    (routeId: CaravanRouteId, currentInfo: CaravanTradeInfo | null) => {
      if (!currentInfo) return;
      const route = currentInfo.routes.find((r) => r.id === routeId) || currentInfo.routes[0];
      if (!route) return;
      const hotSet = new Set(route.hotItems.map((h) => h.itemId));
      const sorted = [...currentInfo.idleCargoCatalog].sort((a, b) => {
        const aHot = hotSet.has(a.itemId) ? 2 : a.category === route.favoredCategory ? 1 : 0;
        const bHot = hotSet.has(b.itemId) ? 2 : b.category === route.favoredCategory ? 1 : 0;
        if (bHot !== aHot) return bHot - aHot;
        return b.unitValue - a.unitValue;
      });
      const nextCargo: Record<string, number> = {};
      let remCap = currentInfo.bonuses.maxCargoCapacity;
      let typesUsed = 0;
      for (const item of sorted) {
        if (remCap <= 0 || typesUsed >= 4) break;
        if (item.idleQty <= 0) continue;
        const take = Math.min(item.idleQty, remCap, 25);
        if (take > 0) {
          nextCargo[item.itemId] = take;
          remCap -= take;
          typesUsed += 1;
        }
      }
      setDraftCargo(nextCargo);
    },
    []
  );

  // 首次拿到数据时若草稿为空则自动预填紧缺货品，方便一键发车或微调
  const autoSeededRef = useRef(false);
  useEffect(() => {
    if (info && !autoSeededRef.current) {
      autoSeededRef.current = true;
      smartFillForRoute(selectedRouteId, info);
    }
  }, [info, selectedRouteId, smartFillForRoute]);

  const adjustCargoItem = (itemId: string, delta: number, maxIdle: number, maxCap: number) => {
    setDraftCargo((prev) => {
      const cur = prev[itemId] || 0;
      const otherUnits = Object.entries(prev).reduce((s, [k, v]) => (k === itemId ? s : s + v), 0);
      const otherTypes = Object.keys(prev).filter((k) => k !== itemId && (prev[k] || 0) > 0).length;
      if (cur === 0 && delta > 0 && otherTypes >= 6) {
        return prev;
      }
      const nextQty = Math.max(0, Math.min(maxIdle, maxCap - otherUnits, cur + delta));
      const copy = { ...prev };
      if (nextQty <= 0) delete copy[itemId];
      else copy[itemId] = nextQty;
      return copy;
    });
  };

  const applyCaravanUpdate = (nextCaravan: CaravanTradeInfo | undefined) => {
    if (!nextCaravan) return;
    setInfo(nextCaravan);
    setNowTick(Date.now());
    const idleSlot = nextCaravan.wagonSlots.find((w) => w.status === 'idle');
    if (idleSlot) setSelectedWagonSlot(idleSlot.slot);
  };

  const handleDispatch = async () => {
    if (!info) return;
    setBusyKey(`dispatch:${selectedWagonSlot}`);
    try {
      const res: any = await apiClient.dispatchCaravanWagon({
        wagonSlot: selectedWagonSlot,
        routeId: selectedRouteId,
        cargo: draftCargo,
        useExpressPermit: useExpressPermit && info.expressPermits > 0,
      });
      if (res?.caravan) {
        applyCaravanUpdate(res.caravan);
        smartFillForRoute(selectedRouteId, res.caravan);
      } else {
        await load();
      }
      setUseExpressPermit(false);
      toast.success(
        res?.dispatched?.usedExpressPermit
          ? `第 ${selectedWagonSlot + 1} 号商车已凭加急通行证即刻抵达，可立即领取远征收益！`
          : `第 ${selectedWagonSlot + 1} 号远征商车已启程！`
      );
      onChange?.();
    } catch (e: any) {
      toast.error(e?.message || '派遣远征商车失败');
    } finally {
      setBusyKey(null);
    }
  };

  const handleExpedite = async (slot: 0 | 1 | 2) => {
    setBusyKey(`expedite:${slot}`);
    try {
      const res: any = await apiClient.expediteCaravanWagon(slot);
      if (res?.caravan) applyCaravanUpdate(res.caravan);
      else await load();
      toast.success(`第 ${slot + 1} 号商车已加急返航抵达！`);
      onChange?.();
    } catch (e: any) {
      toast.error(e?.message || '使用加急通行证失败');
    } finally {
      setBusyKey(null);
    }
  };

  const handleClaimWagon = async (slot: 0 | 1 | 2) => {
    setBusyKey(`claim:${slot}`);
    try {
      const res: any = await apiClient.claimCaravanWagon(slot);
      if (res?.caravan) applyCaravanUpdate(res.caravan);
      else await load();
      const rw = res?.claimed?.reward;
      const lvUp = res?.claimed?.leveledUpTo;
      toast.success(
        rw
          ? `远征结算：金币 +${rw.gold} · 星晶尘 +${rw.astralCrystalDust}${rw.forgingEmblems > 0 ? ` · 锻造徽记 +${rw.forgingEmblems}` : ''} · 商队声望 +${rw.caravanRep}${lvUp ? `（升至 Lv.${lvUp}！）` : ''}`
          : '已领取远征商队贸易收益'
      );
      onChange?.();
    } catch (e: any) {
      toast.error(e?.message || '领取远征收益失败');
    } finally {
      setBusyKey(null);
    }
  };

  const handleFulfillContract = async (c: WorkshopSupplyContractView) => {
    setBusyKey(`contract:${c.id}`);
    try {
      const res: any = await apiClient.fulfillWorkshopContract(c.id);
      if (res?.caravan) {
        applyCaravanUpdate(res.caravan);
        smartFillForRoute(selectedRouteId, res.caravan);
      } else {
        await load();
      }
      toast.success(
        `特批契约「${c.name}」已交付：星晶尘 +${c.reward.astralCrystalDust} · 锻造徽记 +${c.reward.forgingEmblems} · 荣誉 +${c.reward.honorPoints}`
      );
      onChange?.();
    } catch (e: any) {
      toast.error(e?.message || '交付工坊特批契约失败');
    } finally {
      setBusyKey(null);
    }
  };

  const handleRerollContracts = async () => {
    setBusyKey('reroll-contracts');
    try {
      const res: any = await apiClient.rerollWorkshopContracts();
      if (res?.caravan) applyCaravanUpdate(res.caravan);
      else await load();
      toast.success('工坊特批契约柜台已刷新 4 份新订单');
      onChange?.();
    } catch (e: any) {
      toast.error(e?.message || '刷新契约柜台失败');
    } finally {
      setBusyKey(null);
    }
  };

  const handleRedeemExchange = async (offerId: string, label: string) => {
    setBusyKey(`exchange:${offerId}`);
    try {
      const res: any = await apiClient.redeemAstralDustExchange(offerId);
      if (res?.caravan) applyCaravanUpdate(res.caravan);
      else await load();
      toast.success(`兑换成功：${label}`);
      onChange?.();
    } catch (e: any) {
      toast.error(e?.message || '星晶尘兑换失败');
    } finally {
      setBusyKey(null);
    }
  };

  const selectedRoute = info?.routes.find((r) => r.id === selectedRouteId) || info?.routes[0];
  const cargoPreview = info && selectedRoute
    ? previewCaravanCargoFrontend({
        routeId: selectedRoute.id,
        cargo: draftCargo,
        catalog: info.idleCargoCatalog,
        shiftKey: info.shiftKey,
        caravanRep: info.caravanRep,
        ledgerRank: info.bonuses.ledgerRank,
      })
    : null;

  const targetSlotObj = info?.wagonSlots.find((w) => w.slot === selectedWagonSlot);
  const canDispatchNow =
    Boolean(info) &&
    Boolean(cargoPreview?.valid) &&
    targetSlotObj?.status === 'idle' &&
    (!useExpressPermit || (info?.expressPermits || 0) > 0);

  const readyWagonsCount = info
    ? info.wagonSlots.filter((w) => w.run && (w.status === 'ready' || nowTick >= w.run.completesAt)).length
    : 0;
  const fulfillableContractsCount = info
    ? info.contractsBoard.contracts.filter((c) => c.canFulfill).length
    : 0;

  const bonusChips: string[] = [];
  if (info) {
    if (info.bonuses.gatherDoubleChance > 0) {
      bonusChips.push(`采集双倍产出 +${Math.round(info.bonuses.gatherDoubleChance * 100)}%`);
    }
    if (info.bonuses.craftSpeedPct > 0) {
      bonusChips.push(`制作速度 +${info.bonuses.craftSpeedPct}%`);
    }
    if (info.bonuses.goldGainPct > 0) {
      bonusChips.push(`全局金币收益 +${info.bonuses.goldGainPct}%`);
    }
    if (info.bonuses.tradeYieldPct > 0) {
      bonusChips.push(`商典货值加成 +${info.bonuses.tradeYieldPct}% · 航程 -${info.bonuses.durationReductionPct}%`);
    }
  }

  return (
    <PanelModal
      title="远征商队贸易航路与工坊特批契约柜台"
      icon={<T1Art kind="skills" id="caravan_hub_banner" className="hw-modal-title-icon" fallback="" alt="" />}
      onClose={onClose}
    >
      {loading && !info ? (
        <div className="prog-empty">正在联络异世界远征总驿与工坊契约柜台…</div>
      ) : !info ? (
        <div className="prog-empty">暂无远征商队数据</div>
      ) : (
        <div className="ct-panel-root" data-testid="caravan-trade-panel">
          {/* 顶部总驿概览与货币栏 */}
          <div className="hw-hero-card ct-hero-card">
            <div className="hw-hero-top">
              <div className="hw-hero-emblem ct-hero-emblem">
                <T1Art kind="skills" id="caravan_hub_banner" className="hw-hero-core-icon" fallback="" alt="远征商队总驿" />
              </div>
              <div className="hw-hero-copy">
                <div className="hw-hero-title">
                  商队声望 Lv.{info.reputationTier.level} · {info.reputationTier.title}
                  {info.bonuses.ledgerRank > 0 ? ` · 宗师商典 ${info.bonuses.ledgerRank} 阶` : ''}
                </div>
                <div className="hw-hero-sub">
                  装载闲置物资发往紧缺城镇结算异域星晶尘、稀有锻造徽记与商队声望（穿戴中装备自动锁定保护，转生永久保留声望与商典）。
                </div>
              </div>
            </div>

            <div className="ct-rep-progress-wrap">
              <div className="ct-rep-progress-meta">
                <span>
                  累计商队声望 <strong>{info.caravanRep}</strong>
                  {info.reputationTier.nextLevelRep !== null
                    ? ` / ${info.reputationTier.nextLevelRep}（下一阶：${info.reputationTier.nextTitle}）`
                    : '（已达最高商会等阶）'}
                </span>
                <span>解锁商车：{info.bonuses.maxWagons} / 3 辆 · 单车载重 {info.bonuses.maxCargoCapacity} 件</span>
              </div>
              <div className="ct-rep-bar">
                <div className="ct-rep-bar-fill" style={{ width: `${info.reputationTier.progressPct}%` }} />
              </div>
            </div>

            <div className="hw-wallet-bar">
              <span className="hw-wallet-pill is-dust">
                <T1Art kind="skills" id="astral_crystal_dust" className="qm-mini-icon" fallback="" alt="" />
                <span>异域星晶尘</span>
                <strong data-testid="caravan-wallet-dust">{info.astralCrystalDust}</strong>
              </span>
              <span className="hw-wallet-pill is-emblem">
                <T1Art kind="skills" id="forging_emblem" className="qm-mini-icon" fallback="" alt="" />
                <span>锻造徽记</span>
                <strong data-testid="caravan-wallet-emblems">{info.forgingEmblems}</strong>
              </span>
              <span className="hw-wallet-pill">
                <T1Art kind="skills" id="guild_honor_crest" className="qm-mini-icon" fallback="" alt="" />
                <span>公会荣誉</span>
                <strong>{info.honorPoints}</strong>
              </span>
              <span className="hw-wallet-pill">
                <T1Art kind="skills" id="workshop_contract_ledger" className="qm-mini-icon" fallback="" alt="" />
                <span>加急通行证</span>
                <strong data-testid="caravan-wallet-permits">{info.expressPermits}</strong>
              </span>
              <span className="hw-wallet-pill">
                <T1Art kind="ui" id="gold" className="qm-mini-icon" fallback="" alt="" />
                <span>金币</span>
                <strong>{info.gold}</strong>
              </span>
            </div>

            <div className="hw-summary-strip">
              {bonusChips.length > 0 ? (
                bonusChips.map((chip, idx) => (
                  <span key={idx} className="rep-bonus-tag active">
                    {chip}
                  </span>
                ))
              ) : (
                <span className="hw-summary-empty">
                  完成首趟远征或交付工坊契约即可积累商队声望（Lv.2 起永久提升采集双倍产出、制作速度与全局金币收益；Lv.3 / Lv.5 解锁第 2、3 辆商车）。
                </span>
              )}
            </div>
          </div>

          {/* 三大子模块切换 */}
          <div className="prog-filter-row" style={{ marginBottom: 12 }}>
            <button
              type="button"
              data-testid="caravan-tab-routes"
              className={`prog-filter-btn ${tab === 'routes' ? 'active' : ''}`}
              onClick={() => setTab('routes')}
            >
              远征贸易航路（{info.bonuses.maxWagons}车{readyWagonsCount > 0 ? ` · 可领 ${readyWagonsCount}` : ''}）
            </button>
            <button
              type="button"
              data-testid="caravan-tab-contracts"
              className={`prog-filter-btn ${tab === 'contracts' ? 'active' : ''}`}
              onClick={() => setTab('contracts')}
            >
              工坊特批契约柜台（4单{fulfillableContractsCount > 0 ? ` · 可交 ${fulfillableContractsCount}` : ''}）
            </button>
            <button
              type="button"
              data-testid="caravan-tab-exchange"
              className={`prog-filter-btn ${tab === 'exchange' ? 'active' : ''}`}
              onClick={() => setTab('exchange')}
            >
              星晶尘兑换与商典（Lv.{info.bonuses.ledgerRank}/5）
            </button>
          </div>

          {tab === 'routes' && (
            <div className="ct-routes-view">
              {/* 1~3 辆商车编制栏位 */}
              <div className="ct-wagon-grid">
                {info.wagonSlots.map((ws) => {
                  const run = ws.run;
                  const remainMs = run ? Math.max(0, run.completesAt - nowTick) : 0;
                  const isReady = Boolean(run) && (ws.status === 'ready' || remainMs <= 0);
                  const isSelectedTarget = ws.status === 'idle' && selectedWagonSlot === ws.slot;

                  return (
                    <div
                      key={ws.slot}
                      data-testid={`caravan-wagon-slot-${ws.slot}`}
                      className={`ct-wagon-card status-${isReady ? 'ready' : ws.status} ${isSelectedTarget ? 'is-target' : ''}`}
                    >
                      <div className="ct-wagon-head">
                        <span className="ct-wagon-title">第 {ws.slot + 1} 号远征商车</span>
                        <span className={`ct-wagon-badge state-${isReady ? 'ready' : ws.status}`}>
                          {!ws.unlocked
                            ? `声望 Lv.${ws.requiredRepLevel} 解锁`
                            : isReady
                              ? '已返航待领'
                              : run
                                ? `航行中 ${formatDurationShort(remainMs)}`
                                : isSelectedTarget
                                  ? '当前装车栏位'
                                  : '空闲待命'}
                        </span>
                      </div>

                      {!ws.unlocked ? (
                        <div className="ct-wagon-body-muted">
                          提升商队声望至 Lv.{ws.requiredRepLevel} 即可扩编该远征商车栏位，实现多航路并行贸易。
                        </div>
                      ) : run ? (
                        <div className="ct-wagon-run-body">
                          <div className="ct-wagon-route-line">
                            <T1Art kind="skills" id={run.routeIconId} className="qm-mini-icon" fallback="" alt="" />
                            <strong>{run.routeName}</strong>
                            <span className="ct-scarcity-pill">{run.scarcityMultiplier.toFixed(2)}x</span>
                          </div>
                          <div className="ct-wagon-cargo-tags">
                            {run.cargoItems.map((ci) => (
                              <span key={ci.itemId} className="ct-mini-cargo-chip">
                                <T1ItemIcon itemId={ci.itemId} className="qm-mini-icon" fallback="" alt="" />
                                {ci.name} ×{ci.qty}
                              </span>
                            ))}
                          </div>
                          <div className="ct-wagon-reward-line">
                            预期：+{run.expectedReward.gold}金 · +{run.expectedReward.astralCrystalDust}星晶尘
                            {run.expectedReward.forgingEmblems > 0 ? ` · +${run.expectedReward.forgingEmblems}徽记` : ''}
                            {' · '}+{run.expectedReward.caravanRep}声望
                          </div>
                          <div className="ct-wagon-actions">
                            {isReady ? (
                              <button
                                type="button"
                                data-testid={`claim-wagon-${ws.slot}`}
                                className="prog-claim-btn"
                                disabled={busyKey !== null}
                                onClick={() => void handleClaimWagon(ws.slot)}
                              >
                                {busyKey === `claim:${ws.slot}` ? '结算中…' : '领取远征收益'}
                              </button>
                            ) : (
                              <button
                                type="button"
                                data-testid={`expedite-wagon-${ws.slot}`}
                                className="prog-filter-btn active"
                                disabled={busyKey !== null || info.expressPermits <= 0}
                                onClick={() => void handleExpedite(ws.slot)}
                              >
                                {busyKey === `expedite:${ws.slot}`
                                  ? '加急中…'
                                  : `加急即刻返航（通行证 ${info.expressPermits}）`}
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="ct-wagon-idle-body">
                          <div className="ct-wagon-body-muted">
                            商车整备就绪，选择下方跨城镇贸易航路与装车货品后即可启程。
                          </div>
                          {!isSelectedTarget && (
                            <button
                              type="button"
                              className="prog-filter-btn"
                              onClick={() => setSelectedWagonSlot(ws.slot)}
                            >
                              选为装车栏位
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 三大跨城镇贸易航路选择 */}
              <div className="hw-section-head">
                <h4>跨城镇远征航路 · 当班紧缺行情（每 6 小时轮换）</h4>
                <span className="hw-section-hint">装运偏好紧缺大类可享 1.15x ~ 1.85x 溢价结算</span>
              </div>

              <div className="ct-route-cards">
                {info.routes.map((rt) => {
                  const active = rt.id === selectedRouteId;
                  return (
                    <div
                      key={rt.id}
                      data-testid={`caravan-route-${rt.id}`}
                      className={`ct-route-card ${active ? 'is-selected' : ''}`}
                      onClick={() => {
                        setSelectedRouteId(rt.id);
                        smartFillForRoute(rt.id, info);
                      }}
                    >
                      <div className="ct-route-top">
                        <T1Art kind="skills" id={rt.iconId} className="ct-route-art" fallback="" alt={rt.name} />
                        <div className="ct-route-title-box">
                          <div className="ct-route-name-row">
                            <strong>{rt.name}</strong>
                            <span className="ct-scarcity-pill is-strong">紧缺 {rt.scarcityMultiplier.toFixed(2)}x</span>
                          </div>
                          <div className="ct-route-town">
                            {rt.townName} · 航程 {formatDurationShort(rt.effectiveDurationMs)}
                          </div>
                        </div>
                      </div>
                      <div className="ct-route-favored">偏好大类：{rt.favoredLabel}</div>
                      <div className="ct-route-hot-row">
                        <span className="ct-hot-label">当班急需（{rt.hotMultiplier.toFixed(2)}x）：</span>
                        {rt.hotItems.map((hi) => (
                          <span key={hi.itemId} className="ct-hot-item-chip">
                            <T1ItemIcon itemId={hi.itemId} className="qm-mini-icon" fallback="" alt="" />
                            {hi.name}（闲置 {hi.idleHave}）
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 货舱装载台与实时对称结算预览 */}
              {selectedRoute && cargoPreview && (
                <div className="ct-loader-box">
                  <div className="ct-loader-head">
                    <div>
                      <strong>
                        装车配货台 · 目标航路：{selectedRoute.name}（第 {selectedWagonSlot + 1} 号商车）
                      </strong>
                      <div className="hw-section-hint">
                        载重 {cargoPreview.totalUnits} / {cargoPreview.maxCapacity} 件 · 基础货值 {cargoPreview.baseCargoValue} 金 → 紧缺折算货值{' '}
                        <strong>{cargoPreview.effectiveCargoValue}</strong> 金
                      </div>
                    </div>
                    <div className="ct-loader-quick-btns">
                      <button
                        type="button"
                        data-testid="smart-fill-cargo-btn"
                        className="prog-filter-btn active"
                        onClick={() => smartFillForRoute(selectedRoute.id, info)}
                      >
                        智能装填紧缺货品
                      </button>
                      <button
                        type="button"
                        className="prog-filter-btn"
                        onClick={() => setDraftCargo({})}
                      >
                        清空货舱
                      </button>
                    </div>
                  </div>

                  {info.idleCargoCatalog.length === 0 ? (
                    <div className="prog-empty" style={{ padding: '14px 8px' }}>
                      当前背包暂无可装运的闲置物资（金币与穿戴中装备不会进入货舱），请先前往采集或制作！
                    </div>
                  ) : (
                    <div className="ct-cargo-list">
                      {info.idleCargoCatalog.slice(0, 18).map((item) => {
                        const loaded = draftCargo[item.itemId] || 0;
                        const isHot = selectedRoute.hotItems.some((h) => h.itemId === item.itemId);
                        const isFavored = isHot || item.category === selectedRoute.favoredCategory;
                        const mult = isHot
                          ? selectedRoute.hotMultiplier
                          : isFavored
                            ? selectedRoute.scarcityMultiplier
                            : 1.0;

                        return (
                          <div
                            key={item.itemId}
                            className={`ct-cargo-row ${loaded > 0 ? 'is-loaded' : ''} ${isFavored ? 'is-favored' : ''}`}
                          >
                            <div className="ct-cargo-item-meta">
                              <T1ItemIcon itemId={item.itemId} className="qm-mini-icon" fallback="" alt="" />
                              <span className="ct-cargo-name">{item.name}</span>
                              <small className="ct-cargo-stock">闲置 {item.idleQty} · 单价 {item.unitValue}</small>
                              {isFavored && (
                                <span className={`ct-scarcity-pill ${isHot ? 'is-hot' : ''}`}>
                                  {isHot ? `急需 ${mult.toFixed(2)}x` : `紧缺 ${mult.toFixed(2)}x`}
                                </span>
                              )}
                            </div>
                            <div className="ct-cargo-stepper">
                              <button
                                type="button"
                                className="ct-step-btn"
                                disabled={loaded <= 0}
                                onClick={() => adjustCargoItem(item.itemId, -5, item.idleQty, cargoPreview.maxCapacity)}
                              >
                                -5
                              </button>
                              <button
                                type="button"
                                className="ct-step-btn"
                                disabled={loaded <= 0}
                                onClick={() => adjustCargoItem(item.itemId, -1, item.idleQty, cargoPreview.maxCapacity)}
                              >
                                -1
                              </button>
                              <strong className="ct-loaded-qty">{loaded}</strong>
                              <button
                                type="button"
                                className="ct-step-btn"
                                disabled={loaded >= item.idleQty || cargoPreview.totalUnits >= cargoPreview.maxCapacity}
                                onClick={() => adjustCargoItem(item.itemId, 1, item.idleQty, cargoPreview.maxCapacity)}
                              >
                                +1
                              </button>
                              <button
                                type="button"
                                className="ct-step-btn"
                                disabled={loaded >= item.idleQty || cargoPreview.totalUnits >= cargoPreview.maxCapacity}
                                onClick={() => adjustCargoItem(item.itemId, 5, item.idleQty, cargoPreview.maxCapacity)}
                              >
                                +5
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="ct-dispatch-footer">
                    <div className="ct-preview-rewards">
                      <span className="ct-reward-chip">
                        <T1Art kind="skills" id="astral_crystal_dust" className="qm-mini-icon" fallback="" alt="" />
                        星晶尘 +{cargoPreview.expectedReward.astralCrystalDust}
                      </span>
                      <span className="ct-reward-chip">
                        <T1Art kind="skills" id="forging_emblem" className="qm-mini-icon" fallback="" alt="" />
                        锻造徽记 +{cargoPreview.expectedReward.forgingEmblems}
                      </span>
                      <span className="ct-reward-chip">
                        <T1Art kind="ui" id="gold" className="qm-mini-icon" fallback="" alt="" />
                        金币 +{cargoPreview.expectedReward.gold}
                      </span>
                      <span className="ct-reward-chip">
                        商队声望 +{cargoPreview.expectedReward.caravanRep}
                      </span>
                    </div>

                    <div className="ct-dispatch-controls">
                      <label className="ct-express-toggle">
                        <input
                          type="checkbox"
                          data-testid="toggle-express-permit"
                          checked={useExpressPermit && info.expressPermits > 0}
                          disabled={info.expressPermits <= 0}
                          onChange={(e) => setUseExpressPermit(e.target.checked)}
                        />
                        <span>使用加急通行证立即抵达（剩余 {info.expressPermits} 张）</span>
                      </label>

                      <button
                        type="button"
                        data-testid="dispatch-caravan-btn"
                        className="prog-claim-btn"
                        disabled={!canDispatchNow || busyKey !== null}
                        onClick={() => void handleDispatch()}
                      >
                        {busyKey?.startsWith('dispatch:')
                          ? '发车中…'
                          : targetSlotObj?.status !== 'idle'
                            ? '请先选择空闲商车栏位'
                            : !cargoPreview.valid
                              ? `装车满 ${40} 金可发车`
                              : useExpressPermit && info.expressPermits > 0
                                ? '加急派遣 · 即刻返航'
                                : '派遣远征商车启程'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'contracts' && (
            <div className="ct-contracts-view">
              <div className="hw-section-head">
                <div className="ct-section-title-inline">
                  <T1Art kind="skills" id="workshop_contract_ledger" className="qm-mini-icon" fallback="" alt="" />
                  <h4>工坊特批契约柜台（每日 4 份轮换 · 交付闲置物资即时结清）</h4>
                </div>
                <button
                  type="button"
                  data-testid="reroll-workshop-contracts-btn"
                  className="prog-filter-btn"
                  disabled={
                    busyKey !== null ||
                    info.contractsBoard.rerollsRemaining <= 0 ||
                    info.gold < info.contractsBoard.rerollCost
                  }
                  onClick={() => void handleRerollContracts()}
                >
                  {busyKey === 'reroll-contracts'
                    ? '调阅中…'
                    : `刷新契约柜台（${info.contractsBoard.rerollCost}金 · 剩 ${info.contractsBoard.rerollsRemaining} 次）`}
                </button>
              </div>

              <div className="ct-contract-grid">
                {info.contractsBoard.contracts.map((c, idx) => (
                  <div
                    key={c.id}
                    data-testid={`workshop-contract-${idx}`}
                    className={`ct-contract-card rarity-${c.rarity} ${c.fulfilled ? 'is-fulfilled' : ''}`}
                  >
                    <div className="ct-contract-head">
                      <div>
                        <div className="ct-contract-title-row">
                          <strong>{c.name}</strong>
                          <span className={`ct-rarity-pill rarity-${c.rarity}`}>
                            {CONTRACT_RARITY_LABELS[c.rarity]}
                          </span>
                        </div>
                        <p className="ct-contract-desc">{c.description}</p>
                      </div>
                    </div>

                    <div className="ct-demand-row">
                      {c.demandList.map((d) => (
                        <span
                          key={d.itemId}
                          className={`hw-cost-chip ${d.have >= d.need || c.fulfilled ? 'ok' : 'lack'}`}
                        >
                          <T1ItemIcon itemId={d.itemId} className="qm-mini-icon" fallback="" alt="" />
                          {d.name} {Math.min(d.have, d.need)}/{d.need}
                        </span>
                      ))}
                    </div>

                    <div className="ct-contract-bottom">
                      <div className="ct-contract-rewards">
                        <span className="ct-reward-chip">
                          <T1Art kind="skills" id="astral_crystal_dust" className="qm-mini-icon" fallback="" alt="" />
                          +{c.reward.astralCrystalDust}晶尘
                        </span>
                        <span className="ct-reward-chip">
                          <T1Art kind="skills" id="forging_emblem" className="qm-mini-icon" fallback="" alt="" />
                          +{c.reward.forgingEmblems}徽记
                        </span>
                        <span className="ct-reward-chip">
                          <T1Art kind="skills" id="guild_honor_crest" className="qm-mini-icon" fallback="" alt="" />
                          +{c.reward.honorPoints}荣誉
                        </span>
                        {c.reward.expressPermits > 0 && (
                          <span className="ct-reward-chip">
                            <T1Art kind="skills" id="workshop_contract_ledger" className="qm-mini-icon" fallback="" alt="" />
                            +{c.reward.expressPermits}通行证
                          </span>
                        )}
                        <span className="ct-reward-chip">+{c.reward.gold}金 · +{c.reward.caravanRep}声望</span>
                      </div>

                      <button
                        type="button"
                        data-testid={`fulfill-contract-${c.id}`}
                        className="prog-claim-btn"
                        disabled={!c.canFulfill || busyKey !== null}
                        onClick={() => void handleFulfillContract(c)}
                      >
                        {busyKey === `contract:${c.id}`
                          ? '交付中…'
                          : c.fulfilled
                            ? '今日已交付'
                            : c.canFulfill
                              ? '交付特批契约'
                              : '闲置物资不足'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'exchange' && (
            <div className="ct-exchange-view">
              {/* 永久养成：远征宗师商典 */}
              <div className="ct-ledger-card">
                <div className="ct-ledger-left">
                  <T1Art kind="skills" id="workshop_contract_ledger" className="ct-ledger-art" fallback="" alt="远征宗师商典" />
                  <div className="ct-ledger-copy">
                    <div className="ct-route-name-row">
                      <strong>远征宗师商典（永久传承 · Lv.{info.exchange.ledgerUpgrade.rank}/{info.exchange.ledgerUpgrade.maxRank}）</strong>
                      <span className="qm-equipped-pill">转生永久保留</span>
                    </div>
                    <p className="ct-contract-desc">
                      每升 1 阶永久提升：商队货值结算 +6%、远征航程耗时 -6%、单车载重 +15 件，并额外赋予采集双倍产出 +1%、制作速度 +2%、全局金币收益 +2%！
                    </p>
                  </div>
                </div>
                <div className="ct-ledger-right">
                  {!info.exchange.ledgerUpgrade.isMax && info.exchange.ledgerUpgrade.nextDustCost !== null && (
                    <span className={`hw-cost-chip ${info.exchange.ledgerUpgrade.canAfford ? 'ok' : 'lack'}`}>
                      <T1Art kind="skills" id="astral_crystal_dust" className="qm-mini-icon" fallback="" alt="" />
                      星晶尘 ×{info.exchange.ledgerUpgrade.nextDustCost}
                    </span>
                  )}
                  <button
                    type="button"
                    data-testid="upgrade-caravan-ledger-btn"
                    className="prog-claim-btn"
                    disabled={!info.exchange.ledgerUpgrade.canAfford || busyKey !== null}
                    onClick={() =>
                      void handleRedeemExchange(
                        'ledger_upgrade',
                        `远征宗师商典升至 Lv.${info.exchange.ledgerUpgrade.rank + 1}`
                      )
                    }
                  >
                    {busyKey === 'exchange:ledger_upgrade'
                      ? '升阶中…'
                      : info.exchange.ledgerUpgrade.isMax
                        ? '已臻满阶'
                        : '升阶宗师商典'}
                  </button>
                </div>
              </div>

              {/* 异域星晶尘兑换物资 */}
              <div className="hw-section-head">
                <h4>异域星晶尘兑换所</h4>
                <span className="hw-section-hint">当前持有异域星晶尘：{info.astralCrystalDust}</span>
              </div>

              <div className="hw-synth-grid">
                {info.exchange.offers.map((offer) => (
                  <div key={offer.id} className="ct-offer-card">
                    <div className="ct-offer-head">
                      <T1Art
                        kind="skills"
                        id={offer.kind === 'emblem' ? 'forging_emblem' : offer.kind === 'permit' ? 'workshop_contract_ledger' : 'astral_crystal_dust'}
                        className="ct-offer-icon"
                        fallback=""
                        alt=""
                      />
                      <div>
                        <strong>{offer.name}</strong>
                        {offer.remainingToday !== null && (
                          <div className="hw-section-hint">今日可兑：{offer.remainingToday} / {offer.dailyLimit}</div>
                        )}
                      </div>
                    </div>
                    <p className="ct-contract-desc">{offer.description}</p>
                    {offer.itemList.length > 0 && (
                      <div className="ct-demand-row">
                        {offer.itemList.map((it) => (
                          <span key={it.itemId} className="hw-cost-chip ok">
                            <T1ItemIcon itemId={it.itemId} className="qm-mini-icon" fallback="" alt="" />
                            {it.name} ×{it.qty}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="ct-contract-bottom">
                      <span className={`hw-cost-chip ${info.astralCrystalDust >= offer.dustCost ? 'ok' : 'lack'}`}>
                        <T1Art kind="skills" id="astral_crystal_dust" className="qm-mini-icon" fallback="" alt="" />
                        星晶尘 ×{offer.dustCost}
                      </span>
                      <button
                        type="button"
                        data-testid={`redeem-dust-${offer.id}`}
                        className="prog-claim-btn"
                        disabled={!offer.canAfford || busyKey !== null}
                        onClick={() => void handleRedeemExchange(offer.id, offer.name)}
                      >
                        {busyKey === `exchange:${offer.id}`
                          ? '兑换中…'
                          : offer.remainingToday === 0
                            ? '今日已兑完'
                            : '立即兑换'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* 商队声望 Lv.1~6 永久阶位一览 */}
              <div className="hw-section-head">
                <h4>商队声望永久被动与商车扩编一览（Lv.1 ~ Lv.6）</h4>
              </div>
              <div className="ct-tier-list">
                {info.reputationTier.allTiers.map((t) => {
                  const unlocked = info.caravanRep >= t.minRep;
                  return (
                    <div key={t.level} className={`ct-tier-pill-row ${unlocked ? 'is-unlocked' : ''}`}>
                      <span>
                        <strong>Lv.{t.level} {t.title}</strong>（需 {t.minRep} 声望）
                      </span>
                      <span>
                        商车上限 {t.maxWagons} 辆 · 采集双倍 +{Math.round(t.gatherDoubleChance * 100)}% · 制作速度 +{t.craftSpeedPct}% · 全局金币 +{t.goldGainPct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </PanelModal>
  );
}

// =================================================================
// 异世界工坊「奇美拉炼金魔药釜」与深渊试炼双共鸣药剂槽面板 (WL-8)
// =================================================================

interface CauldronMaterialCostItem {
  itemId: string;
  name: string;
  need: number;
  have: number;
}

interface AlchemicalPotionView {
  id: AlchemicalPotionId;
  name: string;
  subtitle: string;
  description: string;
  iconId: string;
  rank: number;
  maxRank: number;
  charges: number;
  maxCharges: number;
  isEquipped: boolean;
  equippedSlot: ResonanceSlotIndex | null;
  isActive: boolean;
  currentStats: AlchemicalPotionLevelStats;
  nextStats: AlchemicalPotionLevelStats | null;
  brewOptions: {
    essence: {
      costEssence: number;
      chargesOut: number;
      pointsOut: number;
      canAfford: boolean;
    };
    material: {
      gold: number;
      items: CauldronMaterialCostItem[];
      chargesOut: number;
      pointsOut: number;
      canAfford: boolean;
    };
    astralDust: {
      costDust: number;
      chargesOut: number;
      pointsOut: number;
      canAfford: boolean;
    };
  };
  upgradeOptions: {
    targetRank: number;
    cauldronPoints: number;
    standard: {
      gold: number;
      alchemicalEssence: number;
      crystals: CauldronMaterialCostItem[];
      canAfford: boolean;
    };
    astralDust: {
      gold: number;
      astralCrystalDust: number;
      canAfford: boolean;
    };
  } | null;
}

interface TwinResonanceView {
  id: string;
  pair: [AlchemicalPotionId, AlchemicalPotionId];
  name: string;
  subtitle: string;
  description: string;
  baseBonuses: Partial<TwinResonanceBonuses>;
  previewTier: number;
  scaledBonuses: TwinResonanceBonuses;
  isActive: boolean;
}

interface AlchemyCauldronInfo {
  nowMs: number;
  gold: number;
  alchemicalEssence: number;
  astralCrystalDust: number;
  totalBrews: number;
  totalUpgrades: number;
  cauldronPoints: number;
  alchemyCauldronRank: number;
  dailyExtraction: {
    date: string;
    usedToday: number;
    maxPerDay: number;
    remainingToday: number;
    essencePerClaim: number;
  };
  cauldronTier: {
    level: number;
    title: string;
    minPoints: number;
    nextLevelPoints: number | null;
    nextTitle: string | null;
    progressPct: number;
    allTiers: CauldronMasteryTierDef[];
  };
  equippedPotions: [AlchemicalPotionId | null, AlchemicalPotionId | null];
  activeResonance: TwinResonanceView | null;
  allResonances: TwinResonanceView[];
  potions: AlchemicalPotionView[];
  bonuses: AlchemyCauldronBonuses;
}

function formatPotionStatTags(stats: AlchemicalPotionLevelStats | TwinResonanceBonuses): string[] {
  const out: string[] = [];
  if ('bonusAtk' in stats && stats.bonusAtk) out.push(`基础攻击 +${stats.bonusAtk}`);
  if ('bonusDef' in stats && stats.bonusDef) out.push(`基础防御 +${stats.bonusDef}`);
  if ('bonusHp' in stats && stats.bonusHp) out.push(`生命上限 +${stats.bonusHp}`);
  if (stats.combatAtkPct) out.push(`战斗攻击 +${stats.combatAtkPct}%`);
  if ('armorPenPct' in stats && stats.armorPenPct) out.push(`护甲穿透 +${Math.round(stats.armorPenPct * 100)}%`);
  if (stats.bossArmorBreakPct) out.push(`首领破甲 +${Math.round(stats.bossArmorBreakPct * 100)}%`);
  if ('intervalReductionPct' in stats && stats.intervalReductionPct) out.push(`出招提速 +${stats.intervalReductionPct}%`);
  if ('critRateBonusPct' in stats && stats.critRateBonusPct) out.push(`暴击率 +${stats.critRateBonusPct}%`);
  if ('critDmgBonusPct' in stats && stats.critDmgBonusPct) out.push(`暴击伤害 +${stats.critDmgBonusPct}%`);
  if (stats.gatherDoubleChance) out.push(`双倍采集 +${Math.round(stats.gatherDoubleChance * 100)}%`);
  if (stats.gatherSpeedPct) out.push(`采集速度 +${stats.gatherSpeedPct}%`);
  if (stats.craftSpeedPct) out.push(`制作速度 +${stats.craftSpeedPct}%`);
  if (stats.craftEfficiencyPct) out.push(`神匠暴击效率 +${stats.craftEfficiencyPct}%`);
  if (stats.goldGainPct) out.push(`全局金币 +${stats.goldGainPct}%`);
  if (stats.caravanBountyRewardPct) out.push(`商队/悬赏奖励 +${stats.caravanBountyRewardPct}%`);
  if ('rareFindPct' in stats && stats.rareFindPct) out.push(`珍稀掉落 +${stats.rareFindPct}%`);
  return out;
}

export function AlchemyCauldronPanel({
  onClose,
  onChange,
}: {
  onClose: () => void;
  onChange?: () => void;
}) {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [info, setInfo] = useState<AlchemyCauldronInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'cauldron' | 'codex'>('cauldron');
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      apiClient.clearCache();
      const res: any = await apiClient.getAlchemyCauldron();
      setInfo(res);
    } catch (e: any) {
      toastRef.current.error(e?.message || '加载奇美拉炼金魔药釜失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const applyCauldronUpdate = (nextCauldron: AlchemyCauldronInfo | undefined) => {
    if (!nextCauldron) return;
    setInfo(nextCauldron);
  };

  const handleExtractEssence = async () => {
    setBusyKey('extract');
    try {
      const res: any = await apiClient.claimAlchemyExtraction();
      if (res?.cauldron) applyCauldronUpdate(res.cauldron);
      else await load();
      const ex = res?.extracted ?? res;
      toastRef.current.success(
        `免费萃取成功：炼金原液 +${ex?.essenceGained ?? 2}（今日剩余 ${ex?.remainingToday ?? 0} 次）`
      );
      onChange?.();
    } catch (e: any) {
      toastRef.current.error(e?.message || '萃取炼金原液失败');
    } finally {
      setBusyKey(null);
    }
  };

  const handleBrew = async (potion: AlchemicalPotionView, mode: PotionBrewMode) => {
    setBusyKey(`brew:${potion.id}:${mode}`);
    try {
      const res: any = await apiClient.brewAlchemicalPotion({ potionId: potion.id, mode });
      if (res?.cauldron) applyCauldronUpdate(res.cauldron);
      else await load();
      const br = res?.brewed ?? res;
      const added = br?.chargesAdded ?? 0;
      const autoSlot = br?.autoEquippedSlot;
      const lvUp = br?.leveledUpTo;
      toastRef.current.success(
        `炼制成功：「${potion.name}」充能 +${added} 份` +
          (autoSlot === 0 || autoSlot === 1 ? `（已自动装入共鸣槽 ${autoSlot === 0 ? 'A' : 'B'}）` : '') +
          (lvUp ? ` · 炼金宗师等阶升至 Lv.${lvUp}！` : '')
      );
      onChange?.();
    } catch (e: any) {
      toastRef.current.error(e?.message || '炼制奇美拉魔药失败');
    } finally {
      setBusyKey(null);
    }
  };

  const handleUpgradeRecipe = async (potion: AlchemicalPotionView, mode: RecipeUpgradeMode) => {
    setBusyKey(`upgrade:${potion.id}:${mode}`);
    try {
      const res: any = await apiClient.upgradeAlchemicalRecipe({ potionId: potion.id, mode });
      if (res?.cauldron) applyCauldronUpdate(res.cauldron);
      else await load();
      const up = res?.upgraded ?? res;
      const newRank = up?.newRank ?? potion.rank + 1;
      const lvUp = up?.leveledUpTo;
      toastRef.current.success(
        `宗师图谱升阶：「${potion.name}」永久晋升至 Lv.${newRank}（转生永久保留）` +
          (lvUp ? ` · 炼金宗师等阶升至 Lv.${lvUp}！` : '')
      );
      onChange?.();
    } catch (e: any) {
      toastRef.current.error(e?.message || '升阶炼金宗师图谱失败');
    } finally {
      setBusyKey(null);
    }
  };

  const handleEquipSlot = async (
    slotIndex: ResonanceSlotIndex,
    potionId: AlchemicalPotionId | null,
    label: string
  ) => {
    setBusyKey(`equip:${slotIndex}:${potionId || 'clear'}`);
    try {
      const res: any = await apiClient.equipAlchemicalPotion({ slotIndex, potionId });
      if (res?.cauldron) applyCauldronUpdate(res.cauldron);
      else await load();
      const eq = res?.equipped ?? res;
      if (!potionId) {
        toastRef.current.info(`已卸下共鸣药剂槽 ${slotIndex === 0 ? 'A' : 'B'}`);
      } else if (eq?.activeResonanceName) {
        toastRef.current.success(`已装填「${label}」——激活炼金双生共鸣「${eq.activeResonanceName}」！`);
      } else {
        toastRef.current.success(`共鸣药剂槽 ${slotIndex === 0 ? 'A' : 'B'} 已装填「${label}」`);
      }
      onChange?.();
    } catch (e: any) {
      toastRef.current.error(e?.message || '调整共鸣药剂槽失败');
    } finally {
      setBusyKey(null);
    }
  };

  const handleEquipResonancePair = async (resView: TwinResonanceView) => {
    const [pA, pB] = resView.pair;
    setBusyKey(`pair:${resView.id}`);
    try {
      await apiClient.equipAlchemicalPotion({ slotIndex: 0, potionId: pA });
      const res: any = await apiClient.equipAlchemicalPotion({ slotIndex: 1, potionId: pB });
      if (res?.cauldron) applyCauldronUpdate(res.cauldron);
      else await load();
      toastRef.current.success(`双槽一键装填完成 —— 已激活「${resView.name}」！`);
      onChange?.();
    } catch (e: any) {
      toastRef.current.error(e?.message || '装填双生共鸣组合失败');
    } finally {
      setBusyKey(null);
    }
  };

  const activeSlotsCount = info ? info.bonuses.activePotions.length : 0;

  const bonusChips: string[] = [];
  if (info) {
    if (info.bonuses.activeResonanceName) {
      bonusChips.push(`双生共鸣：${info.bonuses.activeResonanceName}（Lv.${info.bonuses.resonanceTier}）`);
    }
    if (info.bonuses.combatAtkPct > 0) bonusChips.push(`战斗攻击 +${info.bonuses.combatAtkPct}%`);
    if (info.bonuses.bossArmorBreakPct > 0) {
      bonusChips.push(`首领破甲 +${Math.round(info.bonuses.bossArmorBreakPct * 100)}%`);
    }
    if (info.bonuses.gatherDoubleChance > 0) {
      bonusChips.push(`双倍采集 +${Math.round(info.bonuses.gatherDoubleChance * 100)}%`);
    }
    if (info.bonuses.gatherSpeedPct > 0) bonusChips.push(`采集速度 +${info.bonuses.gatherSpeedPct}%`);
    if (info.bonuses.craftSpeedPct > 0) bonusChips.push(`制作速度 +${info.bonuses.craftSpeedPct}%`);
    if (info.bonuses.craftEfficiencyPct > 0) bonusChips.push(`神匠效率 +${info.bonuses.craftEfficiencyPct}%`);
    if (info.bonuses.goldGainPct > 0) bonusChips.push(`全局金币 +${info.bonuses.goldGainPct}%`);
    if (info.bonuses.caravanBountyRewardPct > 0) {
      bonusChips.push(`商队/悬赏奖励 +${info.bonuses.caravanBountyRewardPct}%`);
    }
    if (info.bonuses.rareFindPct > 0) bonusChips.push(`珍稀掉落 +${info.bonuses.rareFindPct}%`);
  }

  return (
    <PanelModal
      title="奇美拉炼金魔药釜与深渊试炼双共鸣药剂槽"
      icon={<T1Art kind="skills" id="alchemy_cauldron_hub" className="hw-modal-title-icon" fallback="" alt="" />}
      onClose={onClose}
    >
      {loading && !info ? (
        <div className="prog-empty">正在点燃奇美拉炼金魔药釜与双生共鸣药剂架…</div>
      ) : !info ? (
        <div className="prog-empty">暂无奇美拉炼金魔药釜数据</div>
      ) : (
        <div className="ac-panel-root" data-testid="alchemy-cauldron-panel">
          {/* 顶部炼金总釜概览与原液萃取栏 */}
          <div className="hw-hero-card ac-hero-card">
            <div className="hw-hero-top">
              <div className="hw-hero-emblem ac-hero-emblem">
                <T1Art kind="skills" id="alchemy_cauldron_hub" className="hw-hero-core-icon" fallback="" alt="奇美拉炼金魔药釜" />
              </div>
              <div className="hw-hero-copy">
                <div className="ac-hero-title-row">
                  <span className="hw-hero-title">
                    炼金宗师等阶 Lv.{info.cauldronTier.level} · {info.cauldronTier.title}
                  </span>
                  <span className="qm-equipped-pill">宗师图谱与等阶转生永久保留</span>
                </div>
                <div className="hw-hero-sub">
                  每日免费萃取炼金原液、投入基础采集素材或异域星晶尘即可炼制四大秘药充能；双槽并列装填不同魔药即刻触发 6 组「炼金双生共鸣」（仅讨伐首领胜利消耗 1 份充能，日常采集/制作/普通战斗零损耗常驻加成）。
                </div>
              </div>
            </div>

            <div className="ct-rep-progress-wrap">
              <div className="ct-rep-progress-meta">
                <span>
                  累计炼金炉火点 <strong>{info.cauldronPoints}</strong>
                  {info.cauldronTier.nextLevelPoints !== null
                    ? ` / ${info.cauldronTier.nextLevelPoints}（下一阶：${info.cauldronTier.nextTitle}）`
                    : '（已臻炼金至高宗师满阶）'}
                </span>
                <span>
                  累计炼制 {info.totalBrews} 批 · 图谱升阶 {info.totalUpgrades} 次
                  {info.bonuses.batchBonusCharges > 0 ? ` · 单批额外 +${info.bonuses.batchBonusCharges} 份` : ''}
                </span>
              </div>
              <div className="ct-rep-bar">
                <div className="ct-rep-bar-fill ac-bar-fill" style={{ width: `${info.cauldronTier.progressPct}%` }} />
              </div>
            </div>

            <div className="ac-wallet-extract-row">
              <div className="hw-wallet-bar">
                <span className="hw-wallet-pill is-essence">
                  <T1ItemIcon itemId="weapon_alchemy_bottle_t1" className="qm-mini-icon" fallback="" alt="" />
                  <span>炼金原液</span>
                  <strong data-testid="cauldron-wallet-essence">{info.alchemicalEssence}</strong>
                </span>
                <span className="hw-wallet-pill is-dust">
                  <T1Art kind="skills" id="astral_crystal_dust" className="qm-mini-icon" fallback="" alt="" />
                  <span>异域星晶尘</span>
                  <strong data-testid="cauldron-wallet-dust">{info.astralCrystalDust}</strong>
                </span>
                <span className="hw-wallet-pill">
                  <T1Art kind="ui" id="gold" className="qm-mini-icon" fallback="" alt="" />
                  <span>金币</span>
                  <strong data-testid="cauldron-wallet-gold">{info.gold}</strong>
                </span>
                <span className="hw-wallet-pill">
                  <T1Art kind="skills" id="alchemy_resonance_rack" className="qm-mini-icon" fallback="" alt="" />
                  <span>生效共鸣槽</span>
                  <strong data-testid="cauldron-active-slots">{activeSlotsCount} / 2</strong>
                </span>
              </div>

              <button
                type="button"
                data-testid="cauldron-extract-btn"
                className="prog-claim-btn"
                disabled={info.dailyExtraction.remainingToday <= 0 || busyKey !== null}
                onClick={() => void handleExtractEssence()}
              >
                <T1ItemIcon itemId="weapon_alchemy_bottle_t1" className="qm-mini-icon" fallback="" alt="" />
                {busyKey === 'extract'
                  ? '萃取中…'
                  : info.dailyExtraction.remainingToday > 0
                    ? `免费炼金原液萃取（+${info.dailyExtraction.essencePerClaim} · 余 ${info.dailyExtraction.remainingToday}/${info.dailyExtraction.maxPerDay}）`
                    : '今日免费原液已萃满'}
              </button>
            </div>

            <div className="hw-summary-strip">
              {bonusChips.length > 0 ? (
                bonusChips.map((chip, idx) => (
                  <span key={idx} className="rep-bonus-tag active">
                    {chip}
                  </span>
                ))
              ) : (
                <span className="hw-summary-empty">
                  点击右侧「免费炼金原液萃取」即可立即炼制首批魔药并自动装入共鸣药剂槽！
                </span>
              )}
            </div>
          </div>

          {/* 子视图切换 */}
          <div className="prog-filter-row" style={{ marginBottom: 4 }}>
            <button
              type="button"
              data-testid="cauldron-tab-cauldron"
              className={`prog-filter-btn ${tab === 'cauldron' ? 'active' : ''}`}
              onClick={() => setTab('cauldron')}
            >
              奇美拉魔药釜与双共鸣槽（{activeSlotsCount}/2 生效）
            </button>
            <button
              type="button"
              data-testid="cauldron-tab-codex"
              className={`prog-filter-btn ${tab === 'codex' ? 'active' : ''}`}
              onClick={() => setTab('codex')}
            >
              炼金双生共鸣图谱与宗师阶位（6组共鸣）
            </button>
          </div>

          {tab === 'cauldron' && (
            <div className="ac-main-view">
              {/* 深渊试炼双共鸣药剂槽基座 */}
              <div className="ac-rack-section" data-testid="twin-resonance-rack">
                <div className="ac-rack-header">
                  <div className="ac-rack-header-left">
                    <T1Art kind="skills" id="alchemy_resonance_rack" className="ac-rack-art" fallback="" alt="深渊试炼双共鸣药剂槽" />
                    <div>
                      <div className="ac-rack-title">深渊试炼双共鸣药剂槽（Twin Resonance Potion Slots）</div>
                      <div className="ac-rack-sub">
                        同时装填 2 种不同秘药且储备充能大于 0 时，自动激活对应「炼金双生共鸣」组合技！
                      </div>
                    </div>
                  </div>
                </div>

                <div className="ac-rack-slots">
                  {([0, 1] as const).map((slotIdx) => {
                    const slotLabel = slotIdx === 0 ? '共鸣槽 A · 主脉导流' : '共鸣槽 B · 副脉谐振';
                    const pid = info.equippedPotions[slotIdx];
                    const slotted = pid ? info.potions.find((p) => p.id === pid) || null : null;
                    const statTags = slotted ? formatPotionStatTags(slotted.currentStats) : [];
                    return (
                      <div
                        key={slotIdx}
                        data-testid={`resonance-slot-${slotIdx}`}
                        className={`ac-slot-card ${slotted?.isActive ? 'is-active' : slotted ? 'is-depleted' : ''}`}
                      >
                        <div className="ac-slot-top">
                          <div className="ac-slot-icon-box">
                            {slotted ? (
                              <T1Art kind="skills" id={slotted.iconId} className="ac-slot-potion-art" fallback="" alt={slotted.name} />
                            ) : (
                              <T1Art kind="skills" id="alchemy_resonance_rack" className="ac-slot-empty-art" fallback="" alt="" />
                            )}
                          </div>
                          <div className="ac-slot-copy">
                            <div className="ac-slot-label-row">
                              <span className="ac-slot-badge">{slotLabel}</span>
                              {slotted && (
                                <span className={`ac-charge-pill ${slotted.charges > 0 ? 'ok' : 'empty'}`}>
                                  充能 {slotted.charges} 份
                                </span>
                              )}
                            </div>
                            {slotted ? (
                              <div className="ac-slot-name-row">
                                <strong>{slotted.name}</strong>
                                <span className="astrolabe-rank-pill">图谱 Lv.{slotted.rank}</span>
                              </div>
                            ) : (
                              <div className="ac-slot-empty-text">空置槽位 — 在下方魔药卡点击「装入槽 {slotIdx === 0 ? 'A' : 'B'}」</div>
                            )}
                          </div>
                          {slotted && (
                            <button
                              type="button"
                              data-testid={`unequip-slot-${slotIdx}`}
                              className="hw-link-btn"
                              disabled={busyKey !== null}
                              onClick={() => void handleEquipSlot(slotIdx, null, slotted.name)}
                            >
                              卸下
                            </button>
                          )}
                        </div>
                        {slotted && (
                          <div className="hw-bonus-tags">
                            {statTags.map((t, i) => (
                              <span key={i} className={`rep-bonus-tag ${slotted.isActive ? 'active' : ''}`}>
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 双生共鸣激活横幅 */}
                {info.activeResonance ? (
                  <div className="ac-resonance-active-banner" data-testid="active-twin-resonance">
                    <div className="ac-resonance-banner-head">
                      <span className="ac-resonance-pill">炼金双生共鸣生效中 · Lv.{info.activeResonance.previewTier}</span>
                      <strong>{info.activeResonance.name}</strong>
                      <span className="ac-resonance-subtitle">{info.activeResonance.subtitle}</span>
                    </div>
                    <p className="ac-resonance-desc">{info.activeResonance.description}</p>
                    <div className="hw-bonus-tags">
                      {formatPotionStatTags(info.activeResonance.scaledBonuses).map((tag, idx) => (
                        <span key={idx} className="rep-bonus-tag active">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="ac-resonance-inactive-banner" data-testid="inactive-twin-resonance">
                    双生共鸣待唤醒：在共鸣槽 A 与共鸣槽 B 分别装入 2 种不同且有充能的魔药，即可额外激活「炼金双生共鸣」复合增益！
                  </div>
                )}
              </div>

              {/* 四大核心奇美拉魔药炼制与宗师图谱升阶 */}
              <div className="hw-section-head">
                <h4>四大核心奇美拉魔药 · 批次充能炼制与宗师图谱研习（Lv.1 ~ Lv.5）</h4>
                <span className="hw-section-hint">穿戴中装备自动锁定保护 · 宗师图谱等级转生永久继承</span>
              </div>

              <div className="ac-potion-grid">
                {info.potions.map((p) => {
                  const curTags = formatPotionStatTags(p.currentStats);
                  const nextTags = p.nextStats ? formatPotionStatTags(p.nextStats) : [];
                  return (
                    <div
                      key={p.id}
                      data-testid={`potion-card-${p.id}`}
                      className={`ac-potion-card ${p.isActive ? 'is-equipped' : ''}`}
                    >
                      <div className="hw-rune-head">
                        <div className="hw-rune-icon-wrap ac-potion-icon-wrap">
                          <T1Art kind="skills" id={p.iconId} className="hw-rune-icon" fallback="" alt={p.name} />
                        </div>
                        <div className="hw-rune-head-copy">
                          <div className="hw-rune-title-row">
                            <strong className="hw-rune-name">{p.name}</strong>
                            <span className="astrolabe-rank-pill" data-testid={`potion-rank-${p.id}`}>
                              图谱 Lv.{p.rank}/{p.maxRank}
                            </span>
                            <span
                              className={`ac-charge-pill ${p.charges > 0 ? 'ok' : 'empty'}`}
                              data-testid={`potion-charges-${p.id}`}
                            >
                              储备 {p.charges}/{p.maxCharges}
                            </span>
                          </div>
                          <div className="hw-rune-sub">{p.subtitle}</div>
                        </div>
                      </div>

                      <div className="hw-rune-desc">{p.description}</div>

                      <div className="hw-bonus-tags">
                        {curTags.map((t, idx) => (
                          <span key={idx} className={`rep-bonus-tag ${p.isActive ? 'active' : ''}`}>
                            当前：{t}
                          </span>
                        ))}
                        {nextTags.length > 0 && (
                          <span className="rep-bonus-tag">
                            下一阶（Lv.{p.rank + 1}）：{nextTags.join(' · ')}
                          </span>
                        )}
                      </div>

                      {/* 共鸣槽快捷装填 */}
                      <div className="ac-equip-row">
                        <button
                          type="button"
                          data-testid={`equip-slot-0-${p.id}`}
                          className={`prog-filter-btn ${p.equippedSlot === 0 ? 'active' : ''}`}
                          disabled={p.charges <= 0 || p.equippedSlot === 0 || busyKey !== null}
                          onClick={() => void handleEquipSlot(0, p.id, p.name)}
                        >
                          {p.equippedSlot === 0 ? '已在共鸣槽 A' : '装入槽 A'}
                        </button>
                        <button
                          type="button"
                          data-testid={`equip-slot-1-${p.id}`}
                          className={`prog-filter-btn ${p.equippedSlot === 1 ? 'active' : ''}`}
                          disabled={p.charges <= 0 || p.equippedSlot === 1 || busyKey !== null}
                          onClick={() => void handleEquipSlot(1, p.id, p.name)}
                        >
                          {p.equippedSlot === 1 ? '已在共鸣槽 B' : '装入槽 B'}
                        </button>
                        {p.isEquipped && p.equippedSlot !== null && (
                          <button
                            type="button"
                            data-testid={`unequip-potion-${p.id}`}
                            className="hw-link-btn"
                            disabled={busyKey !== null}
                            onClick={() => void handleEquipSlot(p.equippedSlot!, null, p.name)}
                          >
                            卸下
                          </button>
                        )}
                      </div>

                      {/* 三种批次炼制路径（原液 / 基础采集素材 / 星晶尘） */}
                      <div className="ac-brew-box">
                        <div className="ac-subbox-title">炼制魔药批次充能（任选其一）：</div>
                        <div className="ac-brew-options">
                          <button
                            type="button"
                            data-testid={`brew-essence-${p.id}`}
                            className="ac-brew-btn"
                            disabled={!p.brewOptions.essence.canAfford || busyKey !== null}
                            onClick={() => void handleBrew(p, 'essence')}
                          >
                            <span className="ac-brew-btn-top">
                              <T1ItemIcon itemId="weapon_alchemy_bottle_t1" className="qm-mini-icon" fallback="" alt="" />
                              <strong>原液萃取炼制</strong>
                              <span className="ac-yield-tag">+{p.brewOptions.essence.chargesOut}份</span>
                            </span>
                            <small>消耗 {p.brewOptions.essence.costEssence} 炼金原液</small>
                          </button>

                          <button
                            type="button"
                            data-testid={`brew-material-${p.id}`}
                            className="ac-brew-btn"
                            disabled={!p.brewOptions.material.canAfford || busyKey !== null}
                            onClick={() => void handleBrew(p, 'material')}
                          >
                            <span className="ac-brew-btn-top">
                              <T1Art kind="ui" id="gold" className="qm-mini-icon" fallback="" alt="" />
                              <strong>采集素材炼制</strong>
                              <span className="ac-yield-tag">+{p.brewOptions.material.chargesOut}份</span>
                            </span>
                            <small>
                              {p.brewOptions.material.gold}金 +{' '}
                              {p.brewOptions.material.items
                                .map((m) => `${m.name} ${Math.min(m.have, m.need)}/${m.need}`)
                                .join(' · ')}
                            </small>
                          </button>

                          <button
                            type="button"
                            data-testid={`brew-dust-${p.id}`}
                            className="ac-brew-btn"
                            disabled={!p.brewOptions.astralDust.canAfford || busyKey !== null}
                            onClick={() => void handleBrew(p, 'astral_dust')}
                          >
                            <span className="ac-brew-btn-top">
                              <T1Art kind="skills" id="astral_crystal_dust" className="qm-mini-icon" fallback="" alt="" />
                              <strong>星晶高浓精炼</strong>
                              <span className="ac-yield-tag is-gold">+{p.brewOptions.astralDust.chargesOut}份</span>
                            </span>
                            <small>消耗 {p.brewOptions.astralDust.costDust} 异域星晶尘</small>
                          </button>
                        </div>
                      </div>

                      {/* 永久宗师图谱升阶 (Lv.1 -> Lv.5) */}
                      {p.upgradeOptions ? (
                        <div className="ac-upgrade-box">
                          <div className="ac-subbox-title">
                            宗师图谱永久升阶 → Lv.{p.upgradeOptions.targetRank}（+{p.upgradeOptions.cauldronPoints} 炉火点 · 转生保留）：
                          </div>
                          <div className="hw-cost-row">
                            <span className={`hw-cost-chip ${info.gold >= p.upgradeOptions.standard.gold ? 'ok' : 'lack'}`}>
                              <T1Art kind="ui" id="gold" className="qm-mini-icon" fallback="" alt="" />
                              {p.upgradeOptions.standard.gold}金
                            </span>
                            <span
                              className={`hw-cost-chip ${
                                info.alchemicalEssence >= p.upgradeOptions.standard.alchemicalEssence ? 'ok' : 'lack'
                              }`}
                            >
                              <T1ItemIcon itemId="weapon_alchemy_bottle_t1" className="qm-mini-icon" fallback="" alt="" />
                              原液 {info.alchemicalEssence}/{p.upgradeOptions.standard.alchemicalEssence}
                            </span>
                            {p.upgradeOptions.standard.crystals.map((c) => (
                              <span key={c.itemId} className={`hw-cost-chip ${c.have >= c.need ? 'ok' : 'lack'}`}>
                                <T1ItemIcon itemId={c.itemId} className="qm-mini-icon" fallback="" alt={c.name} />
                                {c.name} {Math.min(c.have, c.need)}/{c.need}
                              </span>
                            ))}
                          </div>
                          <div className="ac-upgrade-btns">
                            <button
                              type="button"
                              data-testid={`upgrade-standard-${p.id}`}
                              className="prog-claim-btn"
                              disabled={!p.upgradeOptions.standard.canAfford || busyKey !== null}
                              onClick={() => void handleUpgradeRecipe(p, 'standard')}
                            >
                              {busyKey === `upgrade:${p.id}:standard`
                                ? '研习中…'
                                : `晶石原液升至 Lv.${p.upgradeOptions.targetRank}`}
                            </button>
                            <button
                              type="button"
                              data-testid={`upgrade-dust-${p.id}`}
                              className="prog-filter-btn active"
                              disabled={!p.upgradeOptions.astralDust.canAfford || busyKey !== null}
                              onClick={() => void handleUpgradeRecipe(p, 'astral_dust')}
                              title={`消耗 ${p.upgradeOptions.astralDust.gold} 金币 + ${p.upgradeOptions.astralDust.astralCrystalDust} 异域星晶尘直接升阶`}
                            >
                              <T1Art kind="skills" id="astral_crystal_dust" className="qm-mini-icon" fallback="" alt="" />
                              {busyKey === `upgrade:${p.id}:astral_dust`
                                ? '升阶中…'
                                : `星晶直升（${p.upgradeOptions.astralDust.gold}金 + ${p.upgradeOptions.astralDust.astralCrystalDust}尘）`}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="ac-upgrade-box is-max">
                          <span className="hw-cost-chip ok">炼金宗师图谱已臻满阶（Lv.5 · 转生永久保留）</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'codex' && (
            <div className="ac-codex-view">
              <div className="hw-section-head">
                <h4>六大「炼金双生共鸣」组合图谱（双槽装填任意 2 种魔药自动触发）</h4>
                <span className="hw-section-hint">共鸣等阶取两瓶魔药图谱等级之较低阶（Lv.1 ~ Lv.5）</span>
              </div>

              <div className="ac-resonance-grid">
                {info.allResonances.map((resDef) => {
                  const [pAId, pBId] = resDef.pair;
                  const potA = info.potions.find((p) => p.id === pAId);
                  const potB = info.potions.find((p) => p.id === pBId);
                  const canQuickEquip = Boolean(
                    potA && potB && potA.charges > 0 && potB.charges > 0 && !resDef.isActive
                  );
                  return (
                    <div
                      key={resDef.id}
                      data-testid={`resonance-codex-${resDef.id}`}
                      className={`ac-resonance-card ${resDef.isActive ? 'is-active' : ''}`}
                    >
                      <div className="ac-res-card-top">
                        <div className="ac-res-pair-icons">
                          {potA && <T1Art kind="skills" id={potA.iconId} className="ac-res-mini-art" fallback="" alt={potA.name} />}
                          <span className="ac-res-plus">+</span>
                          {potB && <T1Art kind="skills" id={potB.iconId} className="ac-res-mini-art" fallback="" alt={potB.name} />}
                        </div>
                        <div className="ac-res-title-box">
                          <div className="hw-rune-title-row">
                            <strong>{resDef.name}</strong>
                            <span className="astrolabe-rank-pill">共鸣 Lv.{resDef.previewTier}</span>
                            {resDef.isActive && <span className="qm-equipped-pill">当前生效</span>}
                          </div>
                          <div className="hw-rune-sub">{resDef.subtitle}</div>
                        </div>
                      </div>
                      <p className="hw-rune-desc">{resDef.description}</p>
                      <div className="hw-bonus-tags">
                        {formatPotionStatTags(resDef.scaledBonuses).map((t, i) => (
                          <span key={i} className={`rep-bonus-tag ${resDef.isActive ? 'active' : ''}`}>
                            {t}
                          </span>
                        ))}
                      </div>
                      <div className="ac-res-card-foot">
                        <span className="hw-section-hint">
                          储备：{potA?.name} {potA?.charges ?? 0}份 · {potB?.name} {potB?.charges ?? 0}份
                        </span>
                        <button
                          type="button"
                          data-testid={`quick-equip-pair-${resDef.id}`}
                          className="prog-filter-btn active"
                          disabled={!canQuickEquip || busyKey !== null}
                          onClick={() => void handleEquipResonancePair(resDef)}
                        >
                          {resDef.isActive
                            ? '双槽生效中'
                            : canQuickEquip
                              ? '一键装填双生组合'
                              : '需两药均有充能'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hw-section-head">
                <h4>炼金宗师等阶（Lv.1 ~ Lv.6 · 全局永久被动加成与批次增产）</h4>
              </div>
              <div className="ct-tier-list">
                {info.cauldronTier.allTiers.map((t) => {
                  const unlocked = info.cauldronTier.level >= t.level;
                  return (
                    <div key={t.level} className={`ct-tier-pill-row ${unlocked ? 'is-unlocked' : ''}`}>
                      <span>
                        <strong>Lv.{t.level} {t.title}</strong>（需 {t.minPoints} 炉火点）
                      </span>
                      <span>
                        攻击 +{t.combatAtkPct}% · 采集速度 +{t.gatherSpeedPct}% · 制作速度 +{t.craftSpeedPct}% · 全局金币 +{t.goldGainPct}% · 药效增幅 +{t.potionBuffPct}%
                        {t.batchBonusCharges > 0 ? ` · 单批额外 +${t.batchBonusCharges} 份` : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </PanelModal>
  );
}

/* ============================================================================
   星界远古遗迹勘探队 & 传世圣物陈列馆 (WL-9)
   ============================================================================ */

interface SurveyYieldPreviewView {
  shardsGained: number;
  astralDustGained: number;
  expeditionXpGained: number;
  isVeinJackpot: boolean;
  nextSurveyNumber: number;
}

interface AstralStratumView {
  id: AstralRuinStratumId;
  name: string;
  subtitle: string;
  description: string;
  iconId: string;
  minCuratorRank: number;
  unlocked: boolean;
  veinBonus: {
    shards: number;
    astralDust: number;
    expeditionXp: number;
  };
  surveyOptions: {
    free: {
      remainingToday: number;
      maxPerDay: number;
      preview: SurveyYieldPreviewView;
      canAfford: boolean;
    };
    coin: {
      costGold: number;
      preview: SurveyYieldPreviewView;
      canAfford: boolean;
    };
    astralDust: {
      costAstralDust: number;
      preview: SurveyYieldPreviewView;
      canAfford: boolean;
    };
  };
}

interface SacredRelicPedestalView {
  id: SacredRelicId;
  name: string;
  subtitle: string;
  description: string;
  iconId: string;
  rank: number;
  maxRank: number;
  isRestored: boolean;
  currentStats: SacredRelicLevelStats | null;
  nextStats: SacredRelicLevelStats | null;
  upgradeOptions: {
    targetRank: 1 | 2 | 3 | 4 | 5;
    expeditionXpGain: number;
    standard: {
      ancientRelicShards: number;
      gold: number;
      items: Array<{ itemId: string; name: string; need: number; have: number }>;
      canAfford: boolean;
    };
    astralDust: {
      ancientRelicShards: number;
      astralCrystalDust: number;
      gold: number;
      canAfford: boolean;
    };
  } | null;
}

interface AstralRelicsInfo {
  nowMs: number;
  gold: number;
  ancientRelicShards: number;
  astralCrystalDust: number;
  expeditionXp: number;
  curatorRank: number;
  totalSurveys: number;
  totalRestorations: number;
  surveysUntilVeinJackpot: number;
  isNextSurveyVeinJackpot: boolean;
  dailySurvey: {
    date: string;
    usedToday: number;
    maxPerDay: number;
    remainingToday: number;
  };
  curatorTier: {
    level: number;
    title: string;
    minXp: number;
    nextLevelXp: number | null;
    nextTitle: string | null;
    progressPct: number;
    allTiers: readonly AstralCuratorTierDef[];
  };
  strata: AstralStratumView[];
  pedestals: SacredRelicPedestalView[];
  fullGalleryResonance: {
    activeTier: number;
    current: FullGalleryResonanceDef | null;
    next: FullGalleryResonanceDef | null;
    allTiers: readonly FullGalleryResonanceDef[];
  };
  bonuses: AstralRelicsBonuses;
}

function formatSacredRelicStats(s: SacredRelicLevelStats | null): string[] {
  if (!s) return [];
  const lines: string[] = [];
  if (s.bonusAtk) lines.push(`基础攻击 +${s.bonusAtk}`);
  if (s.combatAtkPct) lines.push(`战斗攻击 +${s.combatAtkPct}%`);
  if (s.armorPenPct) lines.push(`无视护甲 +${Math.round(s.armorPenPct * 100)}%`);
  if (s.bossArmorBreakPct) lines.push(`首领破甲 +${Math.round(s.bossArmorBreakPct * 100)}%`);
  if (s.critRateBonusPct) lines.push(`暴击率 +${s.critRateBonusPct}%`);
  if (s.critDmgBonusPct) lines.push(`暴击伤害 +${s.critDmgBonusPct}%`);
  if (s.relicCritAmpPct) lines.push(`圣枪裁决增伤 +${s.relicCritAmpPct}%`);
  if (s.intervalReductionPct) lines.push(`攻速提振 +${s.intervalReductionPct}%`);
  if (s.bonusHp) lines.push(`生命上限 +${s.bonusHp}`);
  if (s.gatherDoubleChance) lines.push(`双倍采集 +${Math.round(s.gatherDoubleChance * 100)}%`);
  if (s.gatherSpeedPct) lines.push(`采集速度 +${s.gatherSpeedPct}%`);
  if (s.gatherEfficiencyPct) lines.push(`采集丰产连作 +${s.gatherEfficiencyPct}%`);
  if (s.rareFindPct) lines.push(`珍稀掉落 +${s.rareFindPct}%`);
  if (s.bonusDef) lines.push(`基础防御 +${s.bonusDef}`);
  if (s.craftEfficiencyPct) lines.push(`神匠免费连作 +${s.craftEfficiencyPct}%`);
  if (s.craftSpeedPct) lines.push(`制作速度 +${s.craftSpeedPct}%`);
  if (s.xpGainPct) lines.push(`全技能经验 +${s.xpGainPct}%`);
  if (s.goldGainPct) lines.push(`全局金币 +${s.goldGainPct}%`);
  if (s.caravanBountyRewardPct) lines.push(`商队/悬赏收益 +${s.caravanBountyRewardPct}%`);
  if (s.potionBuffPct) lines.push(`魔药药效 +${s.potionBuffPct}%`);
  if (s.alchemyBatchBonusCharges) lines.push(`奇美拉炼制每批 +${s.alchemyBatchBonusCharges} 份`);
  return lines;
}

export function AstralRelicsPanel({
  onClose,
  onChange,
}: {
  onClose: () => void;
  onChange?: () => void;
}) {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [info, setInfo] = useState<AstralRelicsInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'hall' | 'resonance'>('hall');
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      apiClient.clearCache();
      const res: any = await apiClient.getAstralRelics();
      setInfo(res);
    } catch (e: any) {
      toastRef.current.error(e?.message || '加载星界遗迹与圣物陈列馆失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const applyRelicsUpdate = (nextRelics: AstralRelicsInfo | undefined) => {
    if (!nextRelics) return;
    setInfo(nextRelics);
  };

  const handleSurvey = async (stratum: AstralStratumView, mode: ExpeditionSurveyMode) => {
    setBusyKey(`survey:${stratum.id}:${mode}`);
    try {
      const res: any = await apiClient.dispatchAstralExpedition({ stratumId: stratum.id, mode });
      if (res?.relics) applyRelicsUpdate(res.relics);
      else await load();
      const sv = res?.surveyed ?? res;
      const veinNote = sv?.isVeinJackpot ? ' · 触发星脉富矿暴击！' : '';
      const lvNote = sv?.leveledUpTo ? ` · 馆长阶位晋升至 Lv.${sv.leveledUpTo}！` : '';
      toastRef.current.success(
        `勘探归航（「${stratum.name}」）：圣物残片 +${sv?.shardsGained ?? 0} · 星晶尘 +${sv?.astralDustGained ?? 0} · 勘探阅历 +${sv?.expeditionXpGained ?? 0}${veinNote}${lvNote}`
      );
      onChange?.();
    } catch (e: any) {
      toastRef.current.error(e?.message || '派遣星界遗迹勘探队失败');
    } finally {
      setBusyKey(null);
    }
  };

  const handleUpgradePedestal = async (pedestal: SacredRelicPedestalView, mode: RelicUpgradeMode) => {
    setBusyKey(`upgrade:${pedestal.id}:${mode}`);
    try {
      const res: any = await apiClient.upgradeSacredRelicPedestal({ relicId: pedestal.id, mode });
      if (res?.relics) applyRelicsUpdate(res.relics);
      else await load();
      const up = res?.upgraded ?? res;
      const actionLabel = pedestal.rank === 0 ? '圣物修复点亮' : '圣物基座升阶';
      const fullNote =
        up?.awakenedResonanceTier && up.awakenedResonanceTier > 0
          ? ` · 觉醒全馆共鸣 Lv.${up.awakenedResonanceTier}「${up.awakenedResonanceTitle || ''}」！`
          : '';
      const lvNote = up?.leveledUpTo ? ` · 馆长阶位晋升至 Lv.${up.leveledUpTo}！` : '';
      toastRef.current.success(
        `${actionLabel}：「${pedestal.name}」永久晋升至 Lv.${up?.newRank ?? pedestal.rank + 1}（转生永久保留）${fullNote}${lvNote}`
      );
      onChange?.();
    } catch (e: any) {
      toastRef.current.error(e?.message || '修复或升阶传世圣物基座失败');
    } finally {
      setBusyKey(null);
    }
  };

  const bonusChips: string[] = [];
  if (info) {
    if (info.bonuses.fullGalleryResonanceTitle) {
      bonusChips.push(`全馆共鸣：${info.bonuses.fullGalleryResonanceTitle}（Lv.${info.bonuses.fullGalleryResonanceTier}）`);
    }
    if (info.bonuses.combatAtkPct > 0) bonusChips.push(`战斗攻击 +${info.bonuses.combatAtkPct}%`);
    if (info.bonuses.armorPenPct > 0) bonusChips.push(`无视护甲 +${Math.round(info.bonuses.armorPenPct * 100)}%`);
    if (info.bonuses.bossArmorBreakPct > 0) bonusChips.push(`首领破甲 +${Math.round(info.bonuses.bossArmorBreakPct * 100)}%`);
    if (info.bonuses.relicCritAmpPct > 0) bonusChips.push(`圣枪增伤 +${info.bonuses.relicCritAmpPct}%`);
    if (info.bonuses.gatherDoubleChance > 0) {
      bonusChips.push(`双倍采集 +${Math.round(info.bonuses.gatherDoubleChance * 100)}%`);
    }
    if (info.bonuses.gatherEfficiencyPct > 0) bonusChips.push(`采集连作 +${info.bonuses.gatherEfficiencyPct}%`);
    if (info.bonuses.craftEfficiencyPct > 0) bonusChips.push(`神匠连作 +${info.bonuses.craftEfficiencyPct}%`);
    if (info.bonuses.craftSpeedPct > 0) bonusChips.push(`制作速度 +${info.bonuses.craftSpeedPct}%`);
    if (info.bonuses.goldGainPct > 0) bonusChips.push(`全局金币 +${info.bonuses.goldGainPct}%`);
    if (info.bonuses.caravanBountyRewardPct > 0) {
      bonusChips.push(`商队/悬赏 +${info.bonuses.caravanBountyRewardPct}%`);
    }
    if (info.bonuses.alchemyBatchBonusCharges > 0) {
      bonusChips.push(`炼制每批 +${info.bonuses.alchemyBatchBonusCharges} 份`);
    }
  }

  return (
    <PanelModal
      title="星界远古遗迹勘探队与传世圣物陈列馆"
      icon={<T1Art kind="skills" id="astral_ruin_compass" className="hw-modal-title-icon" fallback="" alt="" />}
      onClose={onClose}
    >
      {loading && !info ? (
        <div className="prog-empty">正在点亮星界远古遗迹勘探图与传世圣物陈列馆…</div>
      ) : !info ? (
        <div className="prog-empty">暂无星界遗迹与圣物陈列馆数据</div>
      ) : (
        <div className="ar-panel-root" data-testid="astral-relics-panel">
          {/* 顶部星界陈列馆总览卡片 */}
          <div className="hw-hero-card ar-hero-card">
            <div className="hw-hero-top">
              <div className="hw-hero-emblem ar-hero-emblem">
                <T1Art kind="skills" id="astral_ruin_compass" className="hw-hero-core-icon" fallback="" alt="星界远古遗迹勘探罗盘" />
              </div>
              <div className="hw-hero-copy">
                <div className="ac-hero-title-row">
                  <span className="hw-hero-title">
                    陈列馆长阶位 Lv.{info.curatorTier.level} · {info.curatorTier.title}
                  </span>
                  <span className="qm-equipped-pill">圣物基座·残片·馆长阶位转生永久保留</span>
                </div>
                <div className="hw-hero-sub">
                  派遣勘探队探索三层星界远古遗迹（每日免费勘探 / 金币补给 / 异域星晶尘深掘），收集「远古圣物残片」修复四大传世圣物基座（Lv.1~5）并点亮全馆四圣共鸣！
                </div>
                <div className="ct-rep-meta">
                  <span>
                    累计勘探与修复阅历 <strong>{info.expeditionXp}</strong>
                    {info.curatorTier.nextLevelXp !== null
                      ? ` / ${info.curatorTier.nextLevelXp}（下一阶：${info.curatorTier.nextTitle}）`
                      : '（已臻太初星穹守秘贤者满阶）'}
                  </span>
                  <span>
                    勘探产出加成：每次额外 +{info.bonuses.surveyBonusShards} 枚圣物残片 · 累计勘探 {info.totalSurveys} 次
                  </span>
                </div>
                <div className="ct-rep-bar-track">
                  <div className="ct-rep-bar-fill ar-bar-fill" style={{ width: `${info.curatorTier.progressPct}%` }} />
                </div>
              </div>
            </div>

            {/* 钱包资源与星脉富矿保底进度条 */}
            <div className="ar-wallet-vein-row">
              <div className="ac-wallet-badges">
                <span className="ac-wallet-badge ar-shard-badge">
                  <T1Art kind="skills" id="relic_shard_crystal" className="ac-badge-icon" fallback="" alt="" />
                  远古圣物残片：<strong data-testid="relics-wallet-shards">{info.ancientRelicShards}</strong>
                </span>
                <span className="ac-wallet-badge">
                  <T1Art kind="skills" id="astral_crystal_dust" className="ac-badge-icon" fallback="" alt="" />
                  异域星晶尘：<strong data-testid="relics-wallet-dust">{info.astralCrystalDust}</strong>
                </span>
                <span className="ac-wallet-badge">
                  金币：<strong data-testid="relics-wallet-gold">{info.gold}</strong>
                </span>
                <span className="ac-wallet-badge">
                  已修复圣物：<strong data-testid="relics-restored-count">{info.bonuses.restoredCount} / 4</strong>
                  （总阶 Lv.{info.bonuses.totalRelicLevels}/20）
                </span>
              </div>
              <div
                className={`ar-vein-pill ${info.isNextSurveyVeinJackpot ? 'jackpot-ready' : ''}`}
                data-testid="relics-vein-status"
              >
                <T1Art kind="skills" id="relic_shard_crystal" className="ac-badge-icon" fallback="" alt="" />
                {info.isNextSurveyVeinJackpot ? (
                  <span>下次勘探必触发「星脉富矿暴击」（额外残片+星晶尘+阅历）！</span>
                ) : (
                  <span>每第 3 次勘探必触发星脉富矿 · 距下次富矿还差 {info.surveysUntilVeinJackpot} 次</span>
                )}
              </div>
            </div>

            {bonusChips.length > 0 && (
              <div className="hw-bonus-strip">
                {bonusChips.map((chip) => (
                  <span key={chip} className="hw-bonus-chip ar-bonus-chip">
                    {chip}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 子页签切换：勘探与陈列主厅 vs 全馆四圣共鸣与馆长阶位录 */}
          <div className="prog-filter-bar">
            <button
              type="button"
              data-testid="relics-tab-hall"
              className={`prog-filter-btn ${tab === 'hall' ? 'active' : ''}`}
              onClick={() => setTab('hall')}
            >
              星界遗迹勘探队 & 四圣基座陈列厅
            </button>
            <button
              type="button"
              data-testid="relics-tab-resonance"
              className={`prog-filter-btn ${tab === 'resonance' ? 'active' : ''}`}
              onClick={() => setTab('resonance')}
            >
              全馆四圣共鸣（Lv.1~5） & 馆长阶位录（Lv.1~6）
            </button>
          </div>

          {tab === 'hall' && (
            <div className="ar-hall-view">
              {/* 第一部分：星界远古遗迹勘探队（三层断层遗迹） */}
              <div className="ar-section-header">
                <div>
                  <div className="ac-rack-title">星界远古遗迹勘探队（三层星界遗迹断层）</div>
                  <div className="ac-rack-sub">
                    每日享有 {info.dailySurvey.maxPerDay} 次免费公会勘探补给（今日剩余{' '}
                    <strong data-testid="relics-free-remaining">{info.dailySurvey.remainingToday}</strong> 次），亦可随时投入金币补给或异域星晶尘深掘高产圣物残片。
                  </div>
                </div>
              </div>

              <div className="ar-stratum-grid">
                {info.strata.map((st) => {
                  const freeOpt = st.surveyOptions.free;
                  const coinOpt = st.surveyOptions.coin;
                  const dustOpt = st.surveyOptions.astralDust;
                  const busyFree = busyKey === `survey:${st.id}:free`;
                  const busyCoin = busyKey === `survey:${st.id}:coin`;
                  const busyDust = busyKey === `survey:${st.id}:astral_dust`;

                  return (
                    <div
                      key={st.id}
                      data-testid={`stratum-card-${st.id}`}
                      className={`ar-stratum-card ${st.unlocked ? 'unlocked' : 'locked'}`}
                    >
                      <div className="ar-stratum-head">
                        <div className="ar-stratum-icon-wrap">
                          <T1Art kind="skills" id={st.iconId} className="ar-stratum-icon" fallback="" alt={st.name} />
                        </div>
                        <div className="ar-stratum-title-col">
                          <div className="ar-stratum-name-row">
                            <strong>{st.name}</strong>
                            <span className={`ar-unlock-tag ${st.unlocked ? 'open' : 'shut'}`}>
                              {st.unlocked ? '已开放勘探' : `需馆长 Lv.${st.minCuratorRank}`}
                            </span>
                          </div>
                          <span className="ar-stratum-subtitle">{st.subtitle}</span>
                        </div>
                      </div>

                      <p className="ar-stratum-desc">{st.description}</p>

                      <div className="ar-vein-preview-note">
                        星脉富矿暴击加成：额外 +{st.veinBonus.shards} 残片 · +{st.veinBonus.astralDust} 星晶尘 · +{st.veinBonus.expeditionXp} 阅历
                      </div>

                      <div className="ar-survey-actions">
                        {/* 1. 每日免费勘探 */}
                        <div className="ar-survey-option-box">
                          <div className="ar-survey-opt-meta">
                            <span className="ar-survey-opt-title">
                              公会免费勘探（剩余 {freeOpt.remainingToday}/{freeOpt.maxPerDay}）
                            </span>
                            <span className="ar-survey-opt-yield">
                              必定产出：+{freeOpt.preview.shardsGained} 残片 · +{freeOpt.preview.astralDustGained} 星晶尘 · +{freeOpt.preview.expeditionXpGained} 阅历
                              {freeOpt.preview.isVeinJackpot ? '（含富矿暴击）' : ''}
                            </span>
                          </div>
                          <button
                            type="button"
                            data-testid={`survey-btn-${st.id}-free`}
                            className="prog-claim-btn ar-survey-btn"
                            disabled={!freeOpt.canAfford || Boolean(busyKey)}
                            onClick={() => handleSurvey(st, 'free')}
                          >
                            {busyFree
                              ? '勘探中…'
                              : !st.unlocked
                              ? `馆长 Lv.${st.minCuratorRank} 解锁`
                              : freeOpt.remainingToday > 0
                              ? '派遣免费勘探'
                              : '今日免费已尽'}
                          </button>
                        </div>

                        {/* 2. 金币补给勘探 */}
                        <div className="ar-survey-option-box">
                          <div className="ar-survey-opt-meta">
                            <span className="ar-survey-opt-title">
                              金币补给勘探（消耗 {coinOpt.costGold} 金）
                            </span>
                            <span className="ar-survey-opt-yield">
                              必定产出：+{coinOpt.preview.shardsGained} 残片 · +{coinOpt.preview.astralDustGained} 星晶尘 · +{coinOpt.preview.expeditionXpGained} 阅历
                              {coinOpt.preview.isVeinJackpot ? '（含富矿暴击）' : ''}
                            </span>
                          </div>
                          <button
                            type="button"
                            data-testid={`survey-btn-${st.id}-coin`}
                            className="prog-claim-btn ar-survey-btn coin"
                            disabled={!coinOpt.canAfford || Boolean(busyKey)}
                            onClick={() => handleSurvey(st, 'coin')}
                          >
                            {busyCoin
                              ? '勘探中…'
                              : !st.unlocked
                              ? `馆长 Lv.${st.minCuratorRank} 解锁`
                              : `金币补给（-${coinOpt.costGold} 金）`}
                          </button>
                        </div>

                        {/* 3. 异域星晶尘深掘 */}
                        <div className="ar-survey-option-box astral">
                          <div className="ar-survey-opt-meta">
                            <span className="ar-survey-opt-title">
                              星晶深脉勘探（消耗 {dustOpt.costAstralDust} 星晶尘）
                            </span>
                            <span className="ar-survey-opt-yield">
                              高倍产出：+{dustOpt.preview.shardsGained} 残片 · 回馈 +{dustOpt.preview.astralDustGained} 星晶尘 · +{dustOpt.preview.expeditionXpGained} 阅历
                              {dustOpt.preview.isVeinJackpot ? '（含富矿暴击）' : ''}
                            </span>
                          </div>
                          <button
                            type="button"
                            data-testid={`survey-btn-${st.id}-astral_dust`}
                            className="prog-claim-btn ar-survey-btn astral"
                            disabled={!dustOpt.canAfford || Boolean(busyKey)}
                            onClick={() => handleSurvey(st, 'astral_dust')}
                          >
                            {busyDust
                              ? '深掘中…'
                              : !st.unlocked
                              ? `馆长 Lv.${st.minCuratorRank} 解锁`
                              : `星晶深掘（-${dustOpt.costAstralDust} 尘）`}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 全馆四圣共鸣状态横幅 */}
              <div className={`ar-resonance-banner ${info.fullGalleryResonance.current ? 'active' : ''}`}>
                <div className="ar-res-banner-left">
                  <div className="ac-rack-title">
                    {info.fullGalleryResonance.current
                      ? `全馆四圣共鸣已激活：Lv.${info.fullGalleryResonance.activeTier}「${info.fullGalleryResonance.current.title}」`
                      : '全馆四圣共鸣尚未点亮（修复全部 4 座圣物基座至 Lv.1 即可激活）'}
                  </div>
                  <div className="ac-rack-sub">
                    {info.fullGalleryResonance.current
                      ? formatSacredRelicStats(info.fullGalleryResonance.current.bonuses).join(' · ')
                      : info.fullGalleryResonance.next
                      ? `下一阶共鸣「${info.fullGalleryResonance.next.title}」预览：${formatSacredRelicStats(info.fullGalleryResonance.next.bonuses).join(' · ')}`
                      : ''}
                  </div>
                </div>
                <button
                  type="button"
                  className="ac-clear-slot-btn"
                  onClick={() => setTab('resonance')}
                >
                  查看共鸣录
                </button>
              </div>

              {/* 第二部分：传世圣物陈列馆（四大传世圣物基座 Lv.0~5） */}
              <div className="ar-section-header">
                <div>
                  <div className="ac-rack-title">传世圣物陈列馆（四大神代圣物基座 · 转生永久保留）</div>
                  <div className="ac-rack-sub">
                    每座基座最高可升至 Lv.5；支持「常规圣物残片+空闲晶石修复」或「异域星晶尘免晶石折算修复」（自动保护已穿戴装备）。
                  </div>
                </div>
              </div>

              <div className="ar-pedestal-grid">
                {info.pedestals.map((p) => {
                  const curLines = formatSacredRelicStats(p.currentStats);
                  const nextLines = formatSacredRelicStats(p.nextStats);
                  const upOpt = p.upgradeOptions;
                  const busyStd = busyKey === `upgrade:${p.id}:standard`;
                  const busyDust = busyKey === `upgrade:${p.id}:astral_dust`;

                  return (
                    <div
                      key={p.id}
                      data-testid={`pedestal-card-${p.id}`}
                      className={`ar-pedestal-card ${p.isRestored ? 'restored' : 'unrestored'}`}
                    >
                      <div className="ar-pedestal-head">
                        <div className="ar-pedestal-icon-frame">
                          <T1Art kind="skills" id={p.iconId} className="ar-pedestal-icon" fallback="" alt={p.name} />
                        </div>
                        <div className="ar-pedestal-title-col">
                          <div className="ar-pedestal-name-row">
                            <strong>{p.name}</strong>
                            <span
                              className={`ar-rank-pill ${p.isRestored ? 'lit' : 'dim'}`}
                              data-testid={`pedestal-rank-${p.id}`}
                            >
                              {p.isRestored ? `已供奉 Lv.${p.rank}/${p.maxRank}` : `待修复 Lv.0/${p.maxRank}`}
                            </span>
                          </div>
                          <span className="ar-stratum-subtitle">{p.subtitle}</span>
                        </div>
                      </div>

                      <p className="ar-stratum-desc">{p.description}</p>

                      <div className="ar-pedestal-stats-box">
                        {curLines.length > 0 ? (
                          <div className="ar-stat-line current">
                            <strong>当前圣物庇护（Lv.{p.rank}）：</strong>
                            <span>{curLines.join(' · ')}</span>
                          </div>
                        ) : (
                          <div className="ar-stat-line unlit">
                            <span>尚未修复点亮 —— 修复至 Lv.1 立即永久生效并计入四圣共鸣</span>
                          </div>
                        )}
                        {nextLines.length > 0 && upOpt && (
                          <div className="ar-stat-line next">
                            <strong>晋升 Lv.{upOpt.targetRank} 预览：</strong>
                            <span>{nextLines.join(' · ')}</span>
                          </div>
                        )}
                      </div>

                      {upOpt ? (
                        <div className="ar-upgrade-box">
                          <div className="ac-upgrade-title">
                            {p.rank === 0 ? '修复点亮圣物基座 → Lv.1' : `圣物基座永久升阶 → Lv.${upOpt.targetRank}`}
                            （+{upOpt.expeditionXpGain} 馆长阅历 · 转生保留）
                          </div>

                          <div className="ar-upgrade-cost-lines">
                            <span className="ar-cost-chip">
                              常规消耗：{upOpt.standard.ancientRelicShards} 残片 + {upOpt.standard.gold} 金
                              {upOpt.standard.items.length > 0 && (
                                <>
                                  {' + '}
                                  {upOpt.standard.items.map((it, idx) => (
                                    <span key={it.itemId} className="ar-inline-item-cost">
                                      {idx > 0 ? '、' : ''}
                                      <T1ItemIcon itemId={it.itemId} fallback="" />
                                      {it.name} {it.have}/{it.need}
                                    </span>
                                  ))}
                                </>
                              )}
                            </span>
                            <span className="ar-cost-chip astral">
                              星晶折算：{upOpt.astralDust.ancientRelicShards} 残片 + {upOpt.astralDust.astralCrystalDust} 星晶尘 + {upOpt.astralDust.gold} 金
                            </span>
                          </div>

                          <div className="ac-upgrade-btns">
                            <button
                              type="button"
                              data-testid={`upgrade-pedestal-${p.id}-standard`}
                              className="prog-claim-btn"
                              disabled={!upOpt.standard.canAfford || Boolean(busyKey)}
                              onClick={() => handleUpgradePedestal(p, 'standard')}
                            >
                              {busyStd
                                ? '供奉中…'
                                : p.rank === 0
                                ? `常规修复 Lv.1（-${upOpt.standard.ancientRelicShards} 残片）`
                                : `常规升阶 Lv.${upOpt.targetRank}（-${upOpt.standard.ancientRelicShards} 残片）`}
                            </button>
                            <button
                              type="button"
                              data-testid={`upgrade-pedestal-${p.id}-astral_dust`}
                              className="prog-claim-btn ar-survey-btn astral"
                              disabled={!upOpt.astralDust.canAfford || Boolean(busyKey)}
                              onClick={() => handleUpgradePedestal(p, 'astral_dust')}
                            >
                              {busyDust
                                ? '共鸣中…'
                                : p.rank === 0
                                ? `星晶修复 Lv.1（-${upOpt.astralDust.astralCrystalDust} 尘）`
                                : `星晶升阶 Lv.${upOpt.targetRank}（-${upOpt.astralDust.astralCrystalDust} 尘）`}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="ac-max-rank-banner">已臻神代传世圣物最高阶（Lv.5 圆满供奉）</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'resonance' && (
            <div className="ac-codex-view">
              <div className="ac-codex-intro">
                当陈列馆内全部 4 座传世圣物基座同步达到 Lv.1 ~ Lv.5 时，自动点亮对应等阶的「全馆四圣共鸣」，与各座圣物庇护及馆长阶位完全叠加，且在转生后 100% 永久保留。
              </div>

              <div className="ac-resonance-grid">
                {info.fullGalleryResonance.allTiers.map((t) => {
                  const isCurrent = info.fullGalleryResonance.activeTier === t.tier;
                  const isUnlocked = info.fullGalleryResonance.activeTier >= t.tier;
                  return (
                    <div
                      key={t.tier}
                      className={`ac-resonance-card ${isCurrent ? 'active' : isUnlocked ? 'unlocked' : ''}`}
                    >
                      <div className="ac-res-card-top">
                        <div>
                          <div className="ac-res-name">
                            Lv.{t.tier} · {t.title}
                          </div>
                          <div className="ac-res-pair">{t.subtitle}</div>
                        </div>
                        <span className={`qm-equipped-pill ${isCurrent ? '' : 'muted'}`}>
                          {isCurrent ? '当前生效中' : isUnlocked ? '已达成' : `需四圣均达 Lv.${t.tier}`}
                        </span>
                      </div>
                      <div className="ac-res-bonuses">
                        {formatSacredRelicStats(t.bonuses).map((b) => (
                          <span key={b} className="hw-bonus-chip ar-bonus-chip">
                            {b}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="ac-mastery-tiers-card">
                <div className="ac-rack-title">星界陈列馆长阶位里程碑（Lv.1 ~ Lv.6 · 转生永久保留）</div>
                <div className="ct-tier-list">
                  {info.curatorTier.allTiers.map((t) => {
                    const unlocked = info.curatorTier.level >= t.level;
                    return (
                      <div key={t.level} className={`ct-tier-pill-row ${unlocked ? 'is-unlocked' : ''}`}>
                        <span>
                          <strong>Lv.{t.level} {t.title}</strong>（需 {t.minXp} 阅历）
                        </span>
                        <span>
                          战斗攻击 +{t.combatAtkPct}% · 采集速度 +{t.gatherSpeedPct}% · 制作速度 +{t.craftSpeedPct}% · 全局金币 +{t.goldGainPct}% · 珍稀掉落 +{t.rareFindPct}%
                          {t.surveyBonusShards > 0 ? ` · 每次勘探额外 +${t.surveyBonusShards} 枚圣物残片` : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </PanelModal>
  );
}
