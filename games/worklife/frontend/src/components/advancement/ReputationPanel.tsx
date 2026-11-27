import { useEffect, useState, useCallback, useRef } from 'react';
import { apiClient } from '../../services/api';
import { useToast } from '../Toast';
import { T1Art } from '../T1Art';
import { PanelModal } from './PanelModal';

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
  if (bonuses.xpGain) out.push(`经验获取 +${bonuses.xpGain}%`);
  if (bonuses.goldGain) out.push(`战斗金币 +${bonuses.goldGain}%`);
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
              <span className="rep-tier-bonus">经验获取 +{info.activeBonuses.xpGain}%</span>
              <span className="rep-tier-bonus">战斗金币 +{info.activeBonuses.goldGain}%</span>
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
                  完成公会委托、商队远征、图鉴与各建筑玩法获取声望 · 兑换强化定纹镜、限购稀有配方箱、长效增益卷轴与专属名号
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
