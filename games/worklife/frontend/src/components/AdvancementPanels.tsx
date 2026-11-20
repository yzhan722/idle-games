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
import type {
  GuildPactAction,
  GuildPactLinkTierDef,
  GuildTrialPactId,
  SkyForgeBonuses,
  SkyForgeTierDef,
  StarEmblemDomain,
  StarEmblemId,
  StarEmblemLevelStats,
} from '../gameplay/skyForge';
import {
  HARBOR_RARITY_LABELS,
  HARBOR_SPECIES,
  buildHarborCatchPool,
  harborPoolOdds,
  type HarborAquariumBonuses,
  type HarborAquariumStats,
  type HarborAquariumTierDef,
  type HarborBaitId,
  type HarborDerbyTierDef,
  type HarborDerbyTierId,
  type HarborGroundId,
  type HarborRodTierDef,
  type HarborSpeciesId,
  type HarborTankThemeId,
  type HarborTrophyTierId,
} from '../gameplay/harborDerby';
import {
  ACADEMY_DEPARTMENTS,
  formatAcademyCountdown,
  formatAcademyStats,
  formatCourseDuration,
  getAcademyDepartmentTier,
  type AcademyBadgeDef,
  type AcademyCourseId,
  type AcademyDepartmentId,
  type AcademyDepartmentTierDef,
  type AcademyFestivalBonuses,
  type AcademyStats,
  type FestivalCommissionId,
  type FestivalCommissionKind,
  type FestivalSeasonDef,
  type FestivalSeasonId,
  type FestivalShopItemId,
  type FestivalShopItemKind,
} from '../gameplay/academyFestival';
import {
  formatArenaTownStats,
  formatDuelDuration,
  type ArenaArchetypeId,
  type ArenaDivisionId,
  type ArenaTownBonuses,
  type ArenaTownStats,
  type TownFacilityId,
} from '../gameplay/arenaTown';
import {
  formatBeastWeatherStats,
  formatWeatherDayLabel,
  planBeastFeed,
  WEATHER_LIFE_SKILLS,
  type BeastRanchBonuses,
  type BeastRoleId,
  type BeastWeatherStats,
  type ContractBeastId,
  type WeatherId,
} from '../gameplay/beastWeather';
import {
  formatBalladRemaining,
  formatTavernStats,
  formatTavernVerdict,
  planTavernServe,
  tavernDayIndexFromKey,
  type ChronicleChapterId,
  type TavernBalladId,
  type TavernChronicleBonuses,
  type TavernChronicleStats,
  type TavernVisitorId,
} from '../gameplay/bardTavern';
import {
  airshipDayIndexFromKey,
  formatAirshipDuration,
  formatAirshipProfit,
  formatAirshipTrend,
  formatPaladinStats,
  planAirshipBuy,
  planAirshipSell,
  type AirshipGoodId,
  type AirshipRouteId,
  type AirshipTownId,
  type PaladinOpponent,
  type PaladinStats,
  type PaladinTrialBonuses,
  type PaladinVirtueId,
} from '../gameplay/airshipPaladin';
import {
  formatElfStats,
  formatMineGrade,
  getMineVeinMap,
  mineDayIndexFromKey,
  mineGradeTone,
  planElfCommission,
  planMineHaul,
  type ElfExpeditionSourceId,
  type ElfStats,
  type ElfWaystationBonuses,
  type MineGradeId,
} from '../gameplay/dwarfElf';
import {
  abyssCurrentTone,
  abyssDayIndexFromKey,
  formatAbyssCurrent,
  formatGuildStats,
  getAbyssRuinMap,
  guildWarWeekIndexFromKey,
  planAbyssDive,
  planGuildWarChallenge,
  type AbyssCurrentId,
  type GuildStats,
  type GuildWarBonuses,
} from '../gameplay/abyssGuild';
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
      title="铭纹附魔台与共鸣图鉴"
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
                  铭纹绑定武器 / 防具 / 工具槽位，换装或转生都保留；跨职业造物采集或制作后即收录图鉴。
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
      title="远征商队与契约柜台"
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
                  把闲置物资运往紧缺城镇，换取星晶尘、锻造徽记与商队声望；穿戴中的装备自动锁定，声望与商典转生保留。
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
      title="奇美拉魔药釜与共鸣槽"
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
                  <span className="qm-equipped-pill" title="宗师图谱与等阶转生永久保留">转生保留</span>
                </div>
                <div className="hw-hero-sub">
                  萃取原液或投入素材为四大秘药充能；双槽装不同魔药触发共鸣，只有首领战胜利消耗 1 份充能。
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
              双共鸣槽（{activeSlotsCount}/2 生效）
            </button>
            <button
              type="button"
              data-testid="cauldron-tab-codex"
              className={`prog-filter-btn ${tab === 'codex' ? 'active' : ''}`}
              onClick={() => setTab('codex')}
            >
              共鸣图谱与宗师阶位
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
                      <div className="ac-rack-title">深渊试炼双共鸣药剂槽</div>
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
      title="遗迹勘探与圣物陈列馆"
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
                  <span className="qm-equipped-pill" title="圣物基座·残片·馆长阶位转生永久保留">转生保留</span>
                </div>
                <div className="hw-hero-sub">
                  派勘探队探索三层星界遗迹收集圣物残片，修复四座圣物基座（Lv.1~5）并点亮全馆共鸣。
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
              遗迹勘探与陈列厅
            </button>
            <button
              type="button"
              data-testid="relics-tab-resonance"
              className={`prog-filter-btn ${tab === 'resonance' ? 'active' : ''}`}
              onClick={() => setTab('resonance')}
            >
              四圣共鸣与馆长阶位
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

/* ============================================================================
   天空锻炉星辰神兵谱 & 公会秘境试炼契约阵 (WL-10)
   ============================================================================ */

interface StarEmblemView {
  id: StarEmblemId;
  name: string;
  subtitle: string;
  description: string;
  iconId: string;
  domain: StarEmblemDomain;
  domainLabel: string;
  level: number;
  maxLevel: number;
  currentStats: StarEmblemLevelStats | null;
  nextStats: StarEmblemLevelStats | null;
  forgeOption: {
    targetLevel: number;
    ancientRelicShards: number;
    astralCrystalDust: number;
    canAfford: boolean;
  } | null;
}

interface GuildTrialPactView {
  id: GuildTrialPactId;
  name: string;
  subtitle: string;
  description: string;
  iconId: string;
  pactTier: number;
  unlockTotalLevels: number;
  unlocked: boolean;
  alignedEmblem: StarEmblemId | null;
  alignedEmblemName: string | null;
  alignedEmblemLevel: number;
  signDust: number;
  boons: StarEmblemLevelStats;
  tradeoffs: StarEmblemLevelStats;
  effectiveTradeoffs: StarEmblemLevelStats;
  mitigated: boolean;
  active: boolean;
  canSign: boolean;
  signBlockReason: string | null;
}

interface SkyForgeInfo {
  nowMs: number;
  ancientRelicShards: number;
  astralCrystalDust: number;
  totalEmblemLevels: number;
  maxTotalLevels: number;
  totalForges: number;
  totalPactsSigned: number;
  forgeTier: {
    tier: number;
    title: string;
    minTotalLevels: number;
    pactSlots: number;
    next: SkyForgeTierDef | null;
    progressPct: number;
    allTiers: readonly SkyForgeTierDef[];
  };
  emblems: StarEmblemView[];
  pacts: GuildTrialPactView[];
  pactSlots: { used: number; max: number; cap: number };
  activePacts: GuildTrialPactId[];
  link: {
    activeTier: number;
    current: GuildPactLinkTierDef | null;
    next: GuildPactLinkTierDef | null;
    allTiers: readonly GuildPactLinkTierDef[];
  };
  mitigation: { emblemLevel: number; forgeTier: number };
  bonuses: SkyForgeBonuses;
}

const PACT_TIER_LABEL: Record<number, string> = { 1: '一阶契约', 2: '二阶契约', 3: '三阶契约' };

function fmtSignedNum(v: number, unit = ''): string {
  return `${v > 0 ? '+' : ''}${v}${unit}`;
}

/** 纹章 / 契约 / 连携数值行：正负号自动带出，契约代价显示为负值。 */
function formatStarEmblemStats(s: StarEmblemLevelStats | null | undefined): string[] {
  if (!s) return [];
  const lines: string[] = [];
  if (s.bonusAtk) lines.push(`基础攻击 ${fmtSignedNum(s.bonusAtk)}`);
  if (s.combatAtkPct) lines.push(`战斗攻击 ${fmtSignedNum(s.combatAtkPct, '%')}`);
  if (s.critRateBonusPct) lines.push(`暴击率 ${fmtSignedNum(s.critRateBonusPct, '%')}`);
  if (s.critDmgBonusPct) lines.push(`暴击伤害 ${fmtSignedNum(s.critDmgBonusPct, '%')}`);
  if (s.intervalReductionPct) lines.push(`攻速提振 ${fmtSignedNum(s.intervalReductionPct, '%')}`);
  if (s.armorPenPct) lines.push(`无视护甲 ${fmtSignedNum(Math.round(s.armorPenPct * 100), '%')}`);
  if (s.bossArmorBreakPct) lines.push(`首领破甲 ${fmtSignedNum(Math.round(s.bossArmorBreakPct * 100), '%')}`);
  if (s.rareFindPct) lines.push(`珍稀掉落 ${fmtSignedNum(s.rareFindPct, '%')}`);
  if (s.bonusDef) lines.push(`基础防御 ${fmtSignedNum(s.bonusDef)}`);
  if (s.craftSpeedPct) lines.push(`制作速度 ${fmtSignedNum(s.craftSpeedPct, '%')}`);
  if (s.craftEfficiencyPct) lines.push(`制作连作 ${fmtSignedNum(s.craftEfficiencyPct, '%')}`);
  if (s.bonusHp) lines.push(`生命上限 ${fmtSignedNum(s.bonusHp)}`);
  if (s.gatherSpeedPct) lines.push(`采集速度 ${fmtSignedNum(s.gatherSpeedPct, '%')}`);
  if (s.gatherDoubleChance) lines.push(`双倍采集 ${fmtSignedNum(Math.round(s.gatherDoubleChance * 100), '%')}`);
  if (s.gatherEfficiencyPct) lines.push(`采集连作 ${fmtSignedNum(s.gatherEfficiencyPct, '%')}`);
  if (s.xpGainPct) lines.push(`全技能经验 ${fmtSignedNum(s.xpGainPct, '%')}`);
  if (s.goldGainPct) lines.push(`全局金币 ${fmtSignedNum(s.goldGainPct, '%')}`);
  return lines;
}

function skyForgeNetChips(b: SkyForgeBonuses): Array<{ text: string; neg: boolean }> {
  const chips: Array<{ text: string; neg: boolean }> = [];
  const push = (label: string, v: number, unit = '%') => {
    if (!v) return;
    chips.push({ text: `${label} ${fmtSignedNum(v, unit)}`, neg: v < 0 });
  };
  push('基础攻击', b.bonusAtk, '');
  push('战斗攻击', b.combatAtkPct);
  push('暴击率', b.critRateBonusPct);
  push('暴击伤害', b.critDmgBonusPct);
  if (b.intervalMult !== 1) push('攻速提振', Math.round((1 - b.intervalMult) * 1000) / 10);
  push('无视护甲', Math.round(b.armorPenPct * 100));
  push('首领破甲', Math.round(b.bossArmorBreakPct * 100));
  push('基础防御', b.bonusDef, '');
  push('生命上限', b.bonusHp, '');
  push('制作速度', b.craftSpeedPct);
  push('制作连作', b.craftEfficiencyPct);
  push('采集速度', b.gatherSpeedPct);
  push('双倍采集', Math.round(b.gatherDoubleChance * 100));
  push('采集连作', b.gatherEfficiencyPct);
  push('全技能经验', b.xpGainPct);
  push('全局金币', b.goldGainPct);
  push('珍稀掉落', b.rareFindPct);
  return chips;
}

export function SkyForgePanel({
  onClose,
  onChange,
  onOpenRelics,
}: {
  onClose: () => void;
  onChange?: () => void;
  onOpenRelics?: () => void;
}) {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [info, setInfo] = useState<SkyForgeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'codex' | 'pacts'>('codex');
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      apiClient.clearCache();
      const res: any = await apiClient.getSkyForge();
      setInfo(res);
    } catch (e: any) {
      toastRef.current.error(e?.message || '加载天空锻炉与试炼契约阵失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleForge = async (emblem: StarEmblemView) => {
    setBusyKey(`forge:${emblem.id}`);
    try {
      const res: any = await apiClient.forgeStarEmblem({ emblemId: emblem.id });
      if (res?.forge) setInfo(res.forge);
      else await load();
      const fg = res?.forged ?? res;
      const tierNote = fg?.forgeTierUpTo
        ? ` · 锻炉晋升「${fg.forgeTierTitle || ''}」，契约阵位 ${fg.newPactSlots ?? ''} 席`
        : '';
      const pactNote =
        Array.isArray(fg?.unlockedPacts) && fg.unlockedPacts.length > 0
          ? ` · 解锁 ${fg.unlockedPacts.length} 份新试炼契约`
          : '';
      toastRef.current.success(
        `天空锻炉淬炼：「${emblem.name}」晋升至 Lv.${fg?.newLevel ?? emblem.level + 1}（转生永久保留）${tierNote}${pactNote}`
      );
      onChange?.();
    } catch (e: any) {
      toastRef.current.error(e?.message || '淬炼星辰神兵纹章失败');
    } finally {
      setBusyKey(null);
    }
  };

  const handlePact = async (pact: GuildTrialPactView, action: GuildPactAction) => {
    setBusyKey(`pact:${pact.id}`);
    try {
      const res: any = await apiClient.setGuildTrialPact({ pactId: pact.id, action });
      if (res?.forge) setInfo(res.forge);
      else await load();
      const pr = res?.pact ?? res;
      const linkNote = pr?.linkTitle ? ` · 连携「${pr.linkTitle}」生效` : '';
      toastRef.current.success(
        action === 'sign'
          ? `已签署「${pact.name}」（-${pact.signDust} 星晶尘）${linkNote}`
          : `已解除「${pact.name}」，其增益与代价同步撤销`
      );
      onChange?.();
    } catch (e: any) {
      toastRef.current.error(e?.message || (action === 'sign' ? '签署试炼契约失败' : '解除试炼契约失败'));
    } finally {
      setBusyKey(null);
    }
  };

  const netChips = info ? skyForgeNetChips(info.bonuses) : [];

  return (
    <PanelModal
      title="天空锻炉与秘境契约"
      icon={<T1Art kind="skills" id="sky_forge" className="hw-modal-title-icon" fallback="" alt="" />}
      onClose={onClose}
    >
      {loading && !info ? (
        <div className="prog-empty">正在点燃天空锻炉与秘境试炼契约阵…</div>
      ) : !info ? (
        <div className="prog-empty">暂无天空锻炉数据</div>
      ) : (
        <div className="sf-panel-root" data-testid="sky-forge-panel">
          <div className="hw-hero-card sf-hero-card">
            <div className="hw-hero-top">
              <div className="hw-hero-emblem sf-hero-emblem">
                <T1Art kind="skills" id="sky_forge" className="hw-hero-core-icon" fallback="" alt="天空锻炉" />
              </div>
              <div className="hw-hero-copy sf-hero-copy">
                <div className="ac-hero-title-row">
                  <span className="hw-hero-title" data-testid="sky-forge-tier-title">
                    锻炉 {info.forgeTier.tier} 阶 · {info.forgeTier.title}
                  </span>
                  <span className="qm-equipped-pill" title="纹章等阶与已签契约转生永久保留">转生保留</span>
                </div>
                <div className="hw-hero-sub">
                  用圣物残片与星晶尘淬炼四大神兵纹章（Lv.0~5）；神兵谱总阶解锁秘境契约与契约阵位。
                </div>
                <div className="ct-rep-progress-meta sf-progress-meta">
                  <span>
                    神兵谱总阶 <strong data-testid="sky-forge-total-levels">{info.totalEmblemLevels}</strong> / {info.maxTotalLevels}
                    {info.forgeTier.next
                      ? `（下一阶「${info.forgeTier.next.title}」需总阶 ${info.forgeTier.next.minTotalLevels}，契约阵位 ${info.forgeTier.next.pactSlots} 席）`
                      : '（神兵谱圆满：全部契约代价减半）'}
                  </span>
                </div>
                <div className="ct-rep-bar sf-progress-bar">
                  <div className="ct-rep-bar-fill sf-bar-fill" style={{ width: `${info.forgeTier.progressPct}%` }} />
                </div>
              </div>
            </div>

            <div className="sf-wallet-row">
              <div className="ac-wallet-badges">
                <span className="ac-wallet-badge sf-shard-badge">
                  <T1Art kind="skills" id="relic_shard_crystal" className="ac-badge-icon" fallback="" alt="" />
                  远古圣物残片：<strong data-testid="sky-forge-wallet-shards">{info.ancientRelicShards}</strong>
                </span>
                <span className="ac-wallet-badge sf-dust-badge">
                  <T1Art kind="skills" id="astral_crystal_dust" className="ac-badge-icon" fallback="" alt="" />
                  异域星晶尘：<strong data-testid="sky-forge-wallet-dust">{info.astralCrystalDust}</strong>
                </span>
                <span className="ac-wallet-badge">
                  <T1Art kind="skills" id="guild_trial_pact" className="ac-badge-icon" fallback="" alt="" />
                  契约阵位：<strong data-testid="sky-forge-pact-slots">{info.pactSlots.used} / {info.pactSlots.max}</strong>
                </span>
              </div>
              {onOpenRelics && (
                <button type="button" className="sf-goto-relics-btn" onClick={onOpenRelics}>
                  前往遗迹圣物馆获取残片
                </button>
              )}
            </div>

            {(netChips.length > 0 || info.bonuses.linkTitle) && (
              <div className="hw-bonus-strip" data-testid="sky-forge-net-bonuses">
                {info.bonuses.linkTitle && (
                  <span className="sf-chip link">
                    连携 Lv.{info.bonuses.linkTier}「{info.bonuses.linkTitle}」
                  </span>
                )}
                {netChips.map((c) => (
                  <span key={c.text} className={`sf-chip ${c.neg ? 'neg' : 'pos'}`}>
                    {c.text}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="prog-filter-bar sf-tab-bar">
            <button
              type="button"
              data-testid="sky-forge-tab-codex"
              className={`prog-filter-btn ${tab === 'codex' ? 'active' : ''}`}
              onClick={() => setTab('codex')}
            >
              星辰神兵谱（四大纹章）
            </button>
            <button
              type="button"
              data-testid="sky-forge-tab-pacts"
              className={`prog-filter-btn ${tab === 'pacts' ? 'active' : ''}`}
              onClick={() => setTab('pacts')}
            >
              公会秘境试炼契约阵（{info.pactSlots.used}/{info.pactSlots.max}）
            </button>
          </div>

          {tab === 'codex' && (
            <div className="sf-emblem-grid">
              {info.emblems.map((em) => {
                const cur = formatStarEmblemStats(em.currentStats);
                const nxt = formatStarEmblemStats(em.nextStats);
                const opt = em.forgeOption;
                const busy = busyKey === `forge:${em.id}`;
                const shardShort = opt ? info.ancientRelicShards < opt.ancientRelicShards : false;
                const dustShort = opt ? info.astralCrystalDust < opt.astralCrystalDust : false;
                return (
                  <div
                    key={em.id}
                    data-testid={`emblem-card-${em.id}`}
                    className={`sf-emblem-card domain-${em.domain} ${em.level > 0 ? 'forged' : 'cold'}`}
                  >
                    <div className="sf-emblem-head">
                      <div className="sf-emblem-icon-frame">
                        <T1Art kind="skills" id={em.iconId} className="sf-emblem-icon" fallback="" alt={em.name} />
                      </div>
                      <div className="sf-emblem-title-col">
                        <div className="sf-emblem-name-row">
                          <strong>{em.name}</strong>
                          <span className="sf-domain-tag">{em.domainLabel}</span>
                          <span
                            className={`ar-rank-pill ${em.level > 0 ? 'lit' : 'dim'}`}
                            data-testid={`emblem-level-${em.id}`}
                          >
                            Lv.{em.level}/{em.maxLevel}
                          </span>
                        </div>
                        <span className="sf-emblem-subtitle">{em.subtitle}</span>
                        <div className="sf-level-pips" aria-label={`当前 Lv.${em.level}，满阶 Lv.${em.maxLevel}`}>
                          {Array.from({ length: em.maxLevel }, (_, i) => (
                            <span key={i} className={`sf-pip ${i < em.level ? 'on' : ''}`} />
                          ))}
                        </div>
                      </div>
                    </div>

                    <p className="ar-stratum-desc">{em.description}</p>

                    <div className="sf-stats-box">
                      {cur.length > 0 ? (
                        <div className="sf-stat-line current">
                          <strong>当前纹章（Lv.{em.level}）：</strong>
                          <span>{cur.join(' · ')}</span>
                        </div>
                      ) : (
                        <div className="sf-stat-line unlit">尚未淬炼 —— 淬炼至 Lv.1 立即永久生效</div>
                      )}
                      {nxt.length > 0 && opt && (
                        <div className="sf-stat-line next">
                          <strong>淬炼 Lv.{opt.targetLevel} 预览：</strong>
                          <span>{nxt.join(' · ')}</span>
                        </div>
                      )}
                    </div>

                    {opt ? (
                      <div className="sf-forge-box">
                        <div className="sf-cost-row">
                          <span className={`sf-cost-chip ${shardShort ? 'short' : 'ok'}`}>
                            <T1Art kind="skills" id="relic_shard_crystal" className="ac-badge-icon" fallback="" alt="" />
                            残片 {info.ancientRelicShards}/{opt.ancientRelicShards}
                          </span>
                          <span className={`sf-cost-chip ${dustShort ? 'short' : 'ok'}`}>
                            <T1Art kind="skills" id="astral_crystal_dust" className="ac-badge-icon" fallback="" alt="" />
                            星晶尘 {info.astralCrystalDust}/{opt.astralCrystalDust}
                          </span>
                        </div>
                        <button
                          type="button"
                          data-testid={`forge-emblem-${em.id}`}
                          className="prog-claim-btn sf-action-btn sf-forge-btn"
                          disabled={!opt.canAfford || Boolean(busyKey)}
                          onClick={() => handleForge(em)}
                        >
                          {busy
                            ? '淬炼中…'
                            : opt.canAfford
                            ? em.level === 0
                              ? '点燃纹章 Lv.1'
                              : `淬炼至 Lv.${opt.targetLevel}`
                            : shardShort
                            ? '残片不足'
                            : '星晶尘不足'}
                        </button>
                      </div>
                    ) : (
                      <div className="sf-max-banner">已淬炼至星辰神兵满阶 Lv.{em.maxLevel}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'pacts' && (
            <div className="sf-pact-view">
              <div className="sf-slot-row" data-testid="sky-forge-slot-row">
                {Array.from({ length: info.pactSlots.cap }, (_, i) => {
                  const pid = info.activePacts[i];
                  const pact = pid ? info.pacts.find((p) => p.id === pid) : null;
                  const open = i < info.pactSlots.max;
                  return (
                    <div key={i} className={`sf-slot ${pact ? 'filled' : open ? 'open' : 'locked'}`}>
                      <span className="sf-slot-index">第 {i + 1} 席</span>
                      <strong>{pact ? pact.name : open ? '空席 · 可签署' : '未开放'}</strong>
                      {!pact && !open && (
                        <small>
                          需锻炉「{info.forgeTier.allTiers.find((t) => t.pactSlots >= i + 1)?.title || ''}」
                        </small>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className={`ar-resonance-banner sf-link-banner ${info.link.current ? 'active' : ''}`}>
                <div className="ar-res-banner-left">
                  <div className="ac-rack-title">
                    {info.link.current
                      ? `契约连携 Lv.${info.link.activeTier}「${info.link.current.title}」生效中`
                      : '契约连携未激活（同时签署 2 份契约即可触发）'}
                  </div>
                  <div className="ac-rack-sub">
                    {info.link.current
                      ? formatStarEmblemStats(info.link.current.bonuses).join(' · ')
                      : ''}
                    {info.link.next
                      ? `${info.link.current ? ' ｜ ' : ''}下一阶「${info.link.next.title}」（${info.link.next.subtitle}）：${formatStarEmblemStats(info.link.next.bonuses).join(' · ')}`
                      : ''}
                  </div>
                </div>
              </div>

              <div className="sf-intro">
                每份契约同时带来增益与代价；对应纹章达到 Lv.{info.mitigation.emblemLevel} 或锻炉达到 {info.mitigation.forgeTier} 阶时，该契约代价减半。签署消耗异域星晶尘，解除免费但不退还。
              </div>

              <div className="sf-pact-grid">
                {info.pacts.map((p) => {
                  const boons = formatStarEmblemStats(p.boons);
                  const costs = formatStarEmblemStats(p.effectiveTradeoffs);
                  const busy = busyKey === `pact:${p.id}`;
                  const statusText = p.active
                    ? '生效中'
                    : !p.unlocked
                    ? `需总阶 ${p.unlockTotalLevels}`
                    : p.canSign
                    ? '可签署'
                    : p.signBlockReason || '暂不可签';
                  return (
                    <div
                      key={p.id}
                      data-testid={`pact-card-${p.id}`}
                      className={`sf-pact-card ${p.active ? 'active' : p.unlocked ? 'unlocked' : 'locked'}`}
                    >
                      <div className="sf-pact-head">
                        <div className="sf-pact-icon-frame">
                          <T1Art kind="skills" id={p.iconId} className="sf-pact-icon" fallback="" alt={p.name} />
                        </div>
                        <div className="sf-emblem-title-col">
                          <div className="sf-emblem-name-row">
                            <strong>{p.name}</strong>
                            <span className="sf-domain-tag">{PACT_TIER_LABEL[p.pactTier] || `${p.pactTier} 阶契约`}</span>
                            <span
                              className={`sf-pact-status ${p.active ? 'on' : p.canSign ? 'ready' : 'off'}`}
                              data-testid={`pact-status-${p.id}`}
                            >
                              {statusText}
                            </span>
                          </div>
                          <span className="sf-emblem-subtitle">{p.subtitle}</span>
                        </div>
                      </div>

                      <div className="sf-pact-effects">
                        <div className="sf-effect-line boon">
                          <strong>增益</strong>
                          <span>{boons.join(' · ')}</span>
                        </div>
                        <div className={`sf-effect-line cost ${p.mitigated ? 'mitigated' : ''}`}>
                          <strong>代价{p.mitigated ? '（已减半）' : ''}</strong>
                          <span>{costs.join(' · ')}</span>
                        </div>
                        <div className="sf-effect-note">
                          {p.alignedEmblemName
                            ? `共鸣纹章「${p.alignedEmblemName}」Lv.${p.alignedEmblemLevel}${
                                p.alignedEmblemLevel >= info.mitigation.emblemLevel
                                  ? '：代价减半已生效'
                                  : `：达到 Lv.${info.mitigation.emblemLevel} 代价减半`
                              }`
                            : `无共鸣纹章：锻炉 ${info.mitigation.forgeTier} 阶时代价减半`}
                        </div>
                      </div>

                      <div className="sf-pact-actions">
                        {p.active ? (
                          <button
                            type="button"
                            data-testid={`pact-revoke-${p.id}`}
                            className="prog-claim-btn sf-action-btn sf-revoke-btn"
                            disabled={Boolean(busyKey)}
                            onClick={() => handlePact(p, 'revoke')}
                          >
                            {busy ? '解约中…' : '解除契约（不退还星晶尘）'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            data-testid={`pact-sign-${p.id}`}
                            className="prog-claim-btn sf-action-btn sf-sign-btn"
                            disabled={!p.canSign || Boolean(busyKey)}
                            onClick={() => handlePact(p, 'sign')}
                          >
                            {busy
                              ? '签署中…'
                              : p.canSign
                              ? `签署契约（-${p.signDust} 星晶尘）`
                              : p.signBlockReason || '暂不可签'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="sf-tier-card">
                <div className="ac-rack-title">天空锻炉阶位（神兵谱总阶 → 契约阵位）</div>
                <div className="ct-tier-list">
                  {info.forgeTier.allTiers.map((t) => (
                    <div
                      key={t.tier}
                      className={`ct-tier-pill-row ${info.forgeTier.tier >= t.tier ? 'is-unlocked' : ''}`}
                    >
                      <span>
                        <strong>
                          {t.tier} 阶 · {t.title}
                        </strong>
                        （需总阶 {t.minTotalLevels}）
                      </span>
                      <span>
                        契约阵位 {t.pactSlots} 席
                        {t.tier >= info.mitigation.forgeTier ? ' · 全部契约代价减半' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </PanelModal>
  );
}

/* ============================================================================
   港湾垂钓大赛 & 海港水族馆收藏图鉴 (WL-11)
   ============================================================================ */

interface HarborSpeciesBrief {
  id: HarborSpeciesId;
  name: string;
  iconKind: 'item' | 'skills';
  iconId: string;
  rarity: number;
  rarityLabel: string;
}

interface HarborCatchView extends HarborSpeciesBrief {
  speciesId: HarborSpeciesId;
  sizeCm: number;
  score: number;
  baitId: HarborBaitId;
  baitName: string;
  featured: boolean;
  trophySize: boolean;
  at: string;
}

interface HarborBaitView {
  id: HarborBaitId;
  name: string;
  subtitle: string;
  description: string;
  iconId: string;
  rarityShift: number;
  sizeBonusPct: number;
  scoreBonusPct: number;
  unlocksSpecies: HarborSpeciesId | null;
  unlocksSpeciesName: string | null;
  recipeTier: HarborTrophyTierId | null;
  recipeTierName: string | null;
  known: boolean;
  stock: number;
  craftItems: Array<{ itemId: string; name: string; qty: number; have: number }>;
  craftGold: number;
  craftYield: number;
  maxBatches: number;
  canCraft: boolean;
  craftBlockReason: string | null;
  canEnter: boolean;
}

interface HarborTankSpeciesView extends HarborSpeciesBrief {
  collected: boolean;
  count: number;
  bestSizeCm: number;
  maxSizeCm: number;
  minChefLevel: number;
  exclusiveBaitName: string | null;
}

interface HarborTankView {
  id: HarborTankThemeId;
  name: string;
  subtitle: string;
  description: string;
  unlockSpecies: number;
  unlocked: boolean;
  featured: boolean;
  full: boolean;
  resonance: HarborAquariumStats;
  effectiveResonance: Required<HarborAquariumStats>;
  species: HarborTankSpeciesView[];
}

interface HarborEntryResult {
  catches?: Array<{
    speciesId: HarborSpeciesId;
    name: string;
    rarity: number;
    sizeCm: number;
    score: number;
    featured: boolean;
    trophySize: boolean;
    newSpecies: boolean;
    newRecord: boolean;
  }>;
  weeklyScore?: number;
  tierName?: string;
  tierUp?: boolean;
  collectionTitle?: string;
  collectionTierUpTo?: number;
}

interface HarborDerbyInfo {
  nowMs: number;
  weekKey: string;
  weekIndex: number;
  weekEndsAtMs: number;
  ground: {
    id: HarborGroundId;
    name: string;
    subtitle: string;
    description: string;
    sceneId: string;
    featuredSpecies: HarborSpeciesBrief[];
  };
  nextGround: { id: HarborGroundId; name: string; subtitle: string };
  chefLevel: number;
  fishingActionsThisWeek: number;
  castsAvailable: number;
  castsPerEntry: number;
  entriesUsed: number;
  entryCap: number;
  maxEntriesPerRequest: number;
  weeklyScore: number;
  tier: {
    current: HarborDerbyTierDef;
    next: HarborDerbyTierDef | null;
    progressPct: number;
    allTiers: readonly HarborDerbyTierDef[];
  };
  projectedSettlement: {
    weeklyScore: number;
    tierId: HarborDerbyTierId;
    tierName: string;
    trophyGranted: HarborTrophyTierId | null;
    goldReward: number;
    baitReward: Partial<Record<HarborBaitId, number>>;
    unlockedRecipes: HarborBaitId[];
  };
  leaderboardSize: number;
  leaderboard: HarborCatchView[];
  recentCatches: HarborCatchView[];
  weeklyCatchCount: number;
  baits: HarborBaitView[];
  knownRecipes: HarborBaitId[];
  trophies: Record<HarborTrophyTierId, number>;
  trophyPoints: number;
  rod: {
    tier: number;
    title: string;
    sizeBonusPct: number;
    scoreBonusPct: number;
    next: HarborRodTierDef | null;
    progressPct: number;
    allTiers: readonly HarborRodTierDef[];
  };
  totalEntries: number;
  bestWeeklyScore: number;
  lastSettlement: {
    weekKey: string;
    groundId: HarborGroundId;
    groundName: string;
    tier: HarborDerbyTierId;
    tierName: string;
    weeklyScore: number;
    entries: number;
    trophyGranted: HarborTrophyTierId | null;
    unlockedRecipes: HarborBaitId[];
    unlockedRecipeNames: string[];
    goldReward: number;
    baitReward: Partial<Record<HarborBaitId, number>>;
  } | null;
  aquarium: {
    collectedCount: number;
    totalSpecies: number;
    tier: {
      current: HarborAquariumTierDef;
      next: HarborAquariumTierDef | null;
      progressPct: number;
      allTiers: readonly HarborAquariumTierDef[];
    };
    featuredTank: HarborTankThemeId | null;
    fullTankResonanceMult: number;
    tanks: HarborTankView[];
    bonuses: HarborAquariumBonuses;
  };
}

const HARBOR_BAIT_NAME: Record<HarborBaitId, string> = {
  harbor_worm: '港湾蚯蚓饵',
  glow_shrimp: '荧光虾饵',
  sunscale_lure: '金鳞日耀饵',
  abyss_lantern_lure: '渊灯秘饵',
};

const HARBOR_TROPHY_LABEL: Record<HarborTrophyTierId, string> = {
  bronze: '青铜奖杯',
  silver: '白银奖杯',
  gold: '黄金奖杯',
  legend: '传奇金杯',
};

function HarborSpeciesIcon({ sp, className }: { sp: { iconKind: 'item' | 'skills'; iconId: string; name: string }; className: string }) {
  return sp.iconKind === 'item' ? (
    <T1ItemIcon itemId={sp.iconId} className={className} fallback="" alt={sp.name} />
  ) : (
    <T1Art kind="skills" id={sp.iconId} className={className} fallback="" alt={sp.name} />
  );
}

function fmtHarborCountdown(ms: number): string {
  if (!(ms > 0)) return '即将翻周';
  const totalMin = Math.floor(ms / 60_000);
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0) return `${d} 天 ${h} 小时`;
  if (h > 0) return `${h} 小时 ${m} 分`;
  return `${Math.max(1, m)} 分钟`;
}

function formatHarborAquariumStats(s: HarborAquariumStats | null | undefined): string[] {
  if (!s) return [];
  const out: string[] = [];
  if (s.fishingSpeedPct) out.push(`钓鱼速度 +${s.fishingSpeedPct}%`);
  if (s.cookingQualityPct) out.push(`料理品质 +${s.cookingQualityPct}%`);
  if (s.goldGainPct) out.push(`金币收益 +${s.goldGainPct}%`);
  return out;
}

function formatHarborBaitReward(r: Partial<Record<HarborBaitId, number>> | null | undefined): string {
  if (!r) return '';
  return (Object.keys(HARBOR_BAIT_NAME) as HarborBaitId[])
    .filter((id) => (r[id] || 0) > 0)
    .map((id) => `${HARBOR_BAIT_NAME[id]}×${r[id]}`)
    .join('、');
}

function formatHarborBaitEffects(b: { rarityShift: number; sizeBonusPct: number; scoreBonusPct: number; unlocksSpeciesName?: string | null }): string {
  const parts: string[] = [];
  parts.push(b.rarityShift > 0 ? `稀有鱼种偏移 +${b.rarityShift}` : '无稀有偏移');
  if (b.sizeBonusPct) parts.push(`尺寸 +${b.sizeBonusPct}%`);
  if (b.scoreBonusPct) parts.push(`计分 +${b.scoreBonusPct}%`);
  if (b.unlocksSpeciesName) parts.push(`可引出「${b.unlocksSpeciesName}」`);
  return parts.join(' · ');
}

export function HarborDerbyPanel({ onClose, onChange }: { onClose: () => void; onChange?: () => void }) {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [info, setInfo] = useState<HarborDerbyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'derby' | 'bait' | 'aquarium'>('derby');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [baitChoice, setBaitChoice] = useState<HarborBaitId | null>(null);
  const [lastEntry, setLastEntry] = useState<HarborEntryResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      apiClient.clearCache();
      const res: any = await apiClient.getHarborDerby();
      setInfo(res);
    } catch (e: any) {
      toastRef.current.error(e?.message || '加载港湾垂钓大赛与海港水族馆失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // 默认选中：有库存的最高阶已掌握鱼饵，否则港湾蚯蚓饵
  const selectedBait: HarborBaitId = (() => {
    if (!info) return baitChoice || 'harbor_worm';
    if (baitChoice && info.baits.some((b) => b.id === baitChoice && b.known)) return baitChoice;
    const stocked = [...info.baits].reverse().find((b) => b.known && b.stock > 0);
    return stocked ? stocked.id : 'harbor_worm';
  })();

  const handleEnter = async (count: number) => {
    setBusyKey(`enter:${count}`);
    try {
      const res: any = await apiClient.enterHarborDerby({ baitId: selectedBait, count });
      if (res?.harbor) setInfo(res.harbor);
      else await load();
      const entry: HarborEntryResult = res?.entry ?? {};
      setLastEntry(entry);
      const best = (entry.catches || []).reduce<NonNullable<HarborEntryResult['catches']>[number] | null>(
        (a, c) => (!a || c.score > a.score ? c : a),
        null
      );
      const newCount = (entry.catches || []).filter((c) => c.newSpecies).length;
      toastRef.current.success(
        `连投 ${count} 竿：最佳「${best?.name ?? ''}」${best?.sizeCm ?? 0}cm 计 ${best?.score ?? 0} 分 · 周榜 ${entry.weeklyScore ?? 0} 分${
          entry.tierUp ? ` · 段位晋升「${entry.tierName}」` : ''
        }${newCount > 0 ? ` · 水族馆新收藏 ${newCount} 种` : ''}`
      );
      onChange?.();
    } catch (e: any) {
      toastRef.current.error(e?.message || '参赛投竿失败');
    } finally {
      setBusyKey(null);
    }
  };

  const handleCraft = async (bait: HarborBaitView, batches: number) => {
    setBusyKey(`bait:${bait.id}:${batches}`);
    try {
      const res: any = await apiClient.craftHarborBait({ baitId: bait.id, batches });
      if (res?.harbor) setInfo(res.harbor);
      else await load();
      toastRef.current.success(`鱼饵工坊调制「${bait.name}」×${res?.bait?.crafted ?? bait.craftYield * batches}`);
      onChange?.();
    } catch (e: any) {
      toastRef.current.error(e?.message || '调制鱼饵失败');
    } finally {
      setBusyKey(null);
    }
  };

  const handleTank = async (themeId: HarborTankThemeId | null, name: string) => {
    setBusyKey(`tank:${themeId ?? 'none'}`);
    try {
      const res: any = await apiClient.setHarborFeaturedTank({ themeId });
      if (res?.harbor) setInfo(res.harbor);
      else await load();
      toastRef.current.success(themeId ? `主展缸切换为「${name}」，主题共鸣生效` : '已撤下主展缸');
      onChange?.();
    } catch (e: any) {
      toastRef.current.error(e?.message || '设置主展缸失败');
    } finally {
      setBusyKey(null);
    }
  };

  const pool = info ? harborPoolOdds(buildHarborCatchPool(info.ground.id, info.chefLevel, selectedBait)) : [];
  const speciesName = (id: HarborSpeciesId) => HARBOR_SPECIES.find((s) => s.id === id)?.name || id;
  const speciesMeta = (id: HarborSpeciesId) => HARBOR_SPECIES.find((s) => s.id === id)!;
  const selected = info ? info.baits.find((b) => b.id === selectedBait) || null : null;
  const multiCount = info ? Math.min(info.maxEntriesPerRequest, info.castsAvailable, selected?.stock || 0) : 0;
  const totalTrophies = info
    ? (Object.keys(HARBOR_TROPHY_LABEL) as HarborTrophyTierId[]).reduce((s, k) => s + (info.trophies[k] || 0), 0)
    : 0;
  const aqChips = info ? formatHarborAquariumStats(info.aquarium.bonuses) : [];

  return (
    <PanelModal
      title="港湾垂钓大赛与水族馆"
      icon={<T1Art kind="skills" id="fishing_trophy" className="hw-modal-title-icon" fallback="" alt="" />}
      onClose={onClose}
    >
      {loading && !info ? (
        <div className="prog-empty">正在布置港湾鱼场与水族馆展缸…</div>
      ) : !info ? (
        <div className="prog-empty">暂无港湾垂钓大赛数据</div>
      ) : (
        <div className="hd-panel-root" data-testid="harbor-derby-panel">
          <div className="hw-hero-card hd-hero-card">
            <div className="hw-hero-top">
              <div className="hw-hero-emblem hd-hero-emblem">
                <T1Art kind="skills" id="fishing_trophy" className="hw-hero-core-icon" fallback="" alt="港湾垂钓大赛奖杯" />
              </div>
              <div className="hw-hero-copy hd-hero-copy">
                <div className="ac-hero-title-row">
                  <span className="hw-hero-title" data-testid="harbor-ground-title">
                    本周鱼场 · {info.ground.name}
                  </span>
                  <span className="qm-equipped-pill" title="水族馆收藏、奖杯与配方转生永久保留">转生保留</span>
                </div>
                <div className="hw-hero-sub">{info.ground.subtitle}</div>
                <div className="ct-rep-progress-meta hd-progress-meta">
                  <span>
                    周榜 <strong data-testid="harbor-weekly-score">{info.weeklyScore}</strong> 分 · 段位「
                    <strong data-testid="harbor-tier-name">{info.tier.current.name}</strong>」
                    {info.tier.next
                      ? `（「${info.tier.next.name}」需 ${info.tier.next.minScore} 分）`
                      : '（已达最高段位）'}
                  </span>
                  <span className="hd-countdown">
                    距翻周结算 {fmtHarborCountdown(info.weekEndsAtMs - info.nowMs)} · 下周鱼场「{info.nextGround.name}」
                  </span>
                </div>
                <div className="ct-rep-bar hd-progress-bar">
                  <div className="ct-rep-bar-fill hd-bar-fill" style={{ width: `${info.tier.progressPct}%` }} />
                </div>
              </div>
            </div>

            <div className="ac-wallet-badges hd-wallet-row">
              <span className="ac-wallet-badge hd-cast-badge">
                <T1Art kind="ui" id="nav-fishing" className="ac-badge-icon" fallback="" alt="" />
                本周竿次：<strong data-testid="harbor-casts">{info.castsAvailable}</strong>
              </span>
              <span className="ac-wallet-badge">
                参赛：<strong data-testid="harbor-entries">{info.entriesUsed} / {info.entryCap}</strong>
              </span>
              <span className="ac-wallet-badge hd-trophy-badge">
                <T1Art kind="skills" id="fishing_trophy" className="ac-badge-icon" fallback="" alt="" />
                奖杯：<strong data-testid="harbor-trophies">{totalTrophies}</strong>
              </span>
              <span className="ac-wallet-badge hd-rod-badge">
                <T1Art kind="skills" id="master_fishing_rod" className="ac-badge-icon" fallback="" alt="" />
                <strong data-testid="harbor-rod-title">{info.rod.title}</strong>
              </span>
              <span className="ac-wallet-badge hd-aqua-badge">
                <T1Art kind="skills" id="harbor_aquarium" className="ac-badge-icon" fallback="" alt="" />
                水族馆：<strong data-testid="harbor-collected">{info.aquarium.collectedCount} / {info.aquarium.totalSpecies}</strong>
              </span>
            </div>

            {aqChips.length > 0 && (
              <div className="hw-bonus-strip" data-testid="harbor-aquarium-bonuses">
                <span className="hd-chip title">水族馆「{info.aquarium.bonuses.collectionTitle}」</span>
                {aqChips.map((c) => (
                  <span key={c} className="hd-chip">
                    {c}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="prog-filter-bar hd-tab-bar">
            <button
              type="button"
              data-testid="harbor-tab-derby"
              className={`prog-filter-btn ${tab === 'derby' ? 'active' : ''}`}
              onClick={() => setTab('derby')}
            >
              港湾垂钓大赛
            </button>
            <button
              type="button"
              data-testid="harbor-tab-bait"
              className={`prog-filter-btn ${tab === 'bait' ? 'active' : ''}`}
              onClick={() => setTab('bait')}
            >
              鱼饵工坊（稀有配方 {info.knownRecipes.length}/3）
            </button>
            <button
              type="button"
              data-testid="harbor-tab-aquarium"
              className={`prog-filter-btn ${tab === 'aquarium' ? 'active' : ''}`}
              onClick={() => setTab('aquarium')}
            >
              海港水族馆（{info.aquarium.collectedCount}/{info.aquarium.totalSpecies}）
            </button>
          </div>

          {tab === 'derby' && (
            <div className="hd-derby-view">
              <div className="hd-ground-card" data-testid="harbor-ground-card">
                <div className="hd-ground-scene">
                  <T1Art kind="tree" id={info.ground.sceneId} className="hd-ground-scene-img" fallback="" alt={info.ground.name} />
                </div>
                <div className="hd-ground-copy">
                  <div className="hd-ground-name">{info.ground.name}</div>
                  <p className="hd-ground-desc">{info.ground.description}</p>
                  <div className="hd-featured-label">本周主打鱼种（计分 ×1.5、出现率 ×2）</div>
                  <div className="hd-featured-row">
                    {info.ground.featuredSpecies.map((sp) => (
                      <span key={sp.id} className={`hd-species-chip rarity-${sp.rarity}`}>
                        <HarborSpeciesIcon sp={sp} className="hd-chip-icon" />
                        {sp.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="hd-cast-card" data-testid="harbor-cast-card">
                <div className="ac-rack-title">选择鱼饵投竿参赛</div>
                <div className="hd-bait-pills">
                  {info.baits.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      data-testid={`harbor-bait-pick-${b.id}`}
                      className={`hd-bait-pill ${selectedBait === b.id ? 'selected' : ''} ${b.known ? '' : 'locked'}`}
                      disabled={!b.known || Boolean(busyKey)}
                      onClick={() => setBaitChoice(b.id)}
                    >
                      <span className="hd-bait-pill-name">{b.name}</span>
                      <span className="hd-bait-pill-stock">{b.known ? `库存 ${b.stock}` : '未掌握'}</span>
                    </button>
                  ))}
                </div>
                {selected && <div className="hd-bait-effect">{formatHarborBaitEffects(selected)}</div>}

                <div className="hd-pool" data-testid="harbor-pool">
                  <div className="hd-pool-title">
                    本周鱼种池（厨师 Lv.{info.chefLevel} · {HARBOR_BAIT_NAME[selectedBait]}）
                  </div>
                  <div className="hd-pool-grid">
                    {pool.map((p) => {
                      const sp = speciesMeta(p.speciesId);
                      return (
                        <div key={p.speciesId} className={`hd-pool-row ${p.featured ? 'featured' : ''}`}>
                          <HarborSpeciesIcon sp={sp} className="hd-pool-icon" />
                          <span className="hd-pool-name">{sp.name}</span>
                          <span className={`hd-rarity-tag rarity-${sp.rarity}`}>{HARBOR_RARITY_LABELS[sp.rarity]}</span>
                          <span className="hd-pool-pct">{p.pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="hd-cast-actions">
                  <button
                    type="button"
                    data-testid="harbor-enter-1"
                    className="prog-claim-btn hd-action-btn hd-cast-btn"
                    disabled={!selected?.canEnter || Boolean(busyKey)}
                    onClick={() => handleEnter(1)}
                  >
                    {busyKey === 'enter:1'
                      ? '投竿中…'
                      : info.castsAvailable <= 0
                      ? '本周竿次不足'
                      : (selected?.stock || 0) <= 0
                      ? '鱼饵不足'
                      : '投竿 ×1'}
                  </button>
                  <button
                    type="button"
                    data-testid="harbor-enter-multi"
                    className="prog-claim-btn hd-action-btn hd-cast-btn"
                    disabled={multiCount < 2 || Boolean(busyKey)}
                    onClick={() => handleEnter(multiCount)}
                  >
                    {busyKey === `enter:${multiCount}`
                      ? '连投中…'
                      : multiCount >= 2
                      ? `连投 ×${multiCount}`
                      : '连投需 2 竿 + 2 份饵'}
                  </button>
                </div>
                <div className="hd-cast-hint">
                  每竿消耗 {info.castsPerEntry} 次本周真实钓鱼行动 + 1 份鱼饵。本周已完成钓鱼行动 {info.fishingActionsThisWeek} 次（去「钓鱼」页挂机即可积累竿次），每周至多参赛 {info.entryCap} 次。
                </div>
              </div>

              {lastEntry?.catches && lastEntry.catches.length > 0 && (
                <div className="hd-result-card" data-testid="harbor-last-result">
                  <div className="ac-rack-title">刚刚的渔获</div>
                  <div className="hd-result-list">
                    {lastEntry.catches.map((c, i) => {
                      const sp = speciesMeta(c.speciesId);
                      return (
                        <div key={`${c.speciesId}-${i}`} className={`hd-result-row rarity-${c.rarity}`}>
                          <HarborSpeciesIcon sp={sp} className="hd-result-icon" />
                          <span className="hd-result-name">{c.name}</span>
                          <span className="hd-result-size">{c.sizeCm}cm</span>
                          <span className="hd-result-score">{c.score} 分</span>
                          <span className="hd-result-tags">
                            {c.featured && <span className="hd-tag featured">主打</span>}
                            {c.trophySize && <span className="hd-tag trophy">奖杯级</span>}
                            {c.newSpecies && <span className="hd-tag new">新收藏</span>}
                            {c.newRecord && <span className="hd-tag record">新纪录</span>}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="hd-board-card" data-testid="harbor-leaderboard">
                <div className="ac-rack-title">
                  本周周榜（最佳 {info.leaderboardSize} 条渔获计分 · 本周渔获 {info.weeklyCatchCount} 条）
                </div>
                {info.leaderboard.length === 0 ? (
                  <div className="hd-empty-line">本周还没有渔获，选好鱼饵投出第一竿吧。</div>
                ) : (
                  <div className="hd-board-list">
                    {info.leaderboard.map((c, i) => (
                      <div key={`${c.speciesId}-${c.at}-${i}`} className={`hd-board-row rank-${i + 1}`}>
                        <span className="hd-board-rank">{i + 1}</span>
                        <HarborSpeciesIcon sp={c} className="hd-board-icon" />
                        <span className="hd-board-name">
                          {c.name}
                          <small>
                            {c.sizeCm}cm · {c.baitName}
                            {c.featured ? ' · 主打' : ''}
                            {c.trophySize ? ' · 奖杯级' : ''}
                          </small>
                        </span>
                        <span className="hd-board-score">{c.score}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="hd-tier-card">
                <div className="ac-rack-title">周榜段位（周一东八区 0 点翻周时结算）</div>
                <div className="ct-tier-list">
                  {info.tier.allTiers
                    .filter((t) => t.rank > 0)
                    .map((t) => (
                      <div
                        key={t.id}
                        className={`ct-tier-pill-row hd-tier-row ${info.tier.current.rank >= t.rank ? 'is-unlocked' : ''}`}
                      >
                        <span>
                          <strong>{t.name}</strong>（{t.minScore} 分）
                        </span>
                        <span>
                          {t.trophyName} · {t.goldReward} 金币 · {formatHarborBaitReward(t.baitReward)}
                          {t.recipe ? ` · 稀有配方「${HARBOR_BAIT_NAME[t.recipe]}」` : ''}
                        </span>
                      </div>
                    ))}
                </div>
                <div className="hd-projection" data-testid="harbor-projection">
                  {info.projectedSettlement.trophyGranted
                    ? `若此刻结算：「${info.projectedSettlement.tierName}」· ${HARBOR_TROPHY_LABEL[info.projectedSettlement.trophyGranted]} · ${info.projectedSettlement.goldReward} 金币${
                        info.projectedSettlement.unlockedRecipes.length
                          ? ` · 解锁「${info.projectedSettlement.unlockedRecipes.map((id) => HARBOR_BAIT_NAME[id]).join('」「')}」`
                          : ''
                      }`
                    : `若此刻结算：未达「青铜钓手」（需 ${info.tier.allTiers[1]?.minScore ?? 0} 分）`}
                </div>
              </div>

              {info.lastSettlement && (
                <div className="hd-settle-card" data-testid="harbor-last-settlement">
                  <div className="ac-rack-title">
                    上周结算（{info.lastSettlement.weekKey} · {info.lastSettlement.groundName}）
                  </div>
                  <div className="ac-rack-sub">
                    「{info.lastSettlement.tierName}」· 周榜 {info.lastSettlement.weeklyScore} 分 · 参赛 {info.lastSettlement.entries} 次
                    {info.lastSettlement.trophyGranted ? ` · ${HARBOR_TROPHY_LABEL[info.lastSettlement.trophyGranted]}` : ''}
                    {info.lastSettlement.goldReward ? ` · +${info.lastSettlement.goldReward} 金币` : ''}
                    {formatHarborBaitReward(info.lastSettlement.baitReward)
                      ? ` · ${formatHarborBaitReward(info.lastSettlement.baitReward)}`
                      : ''}
                    {info.lastSettlement.unlockedRecipeNames.length
                      ? ` · 习得「${info.lastSettlement.unlockedRecipeNames.join('」「')}」`
                      : ''}
                  </div>
                </div>
              )}

              <div className="hd-cabinet-card" data-testid="harbor-trophy-cabinet">
                <div className="hd-cabinet-head">
                  <T1Art kind="skills" id="master_fishing_rod" className="hd-cabinet-rod" fallback="" alt="大师钓竿" />
                  <div className="hd-cabinet-copy">
                    <div className="ac-rack-title">
                      奖杯柜 · {info.rod.title}（奖杯积分 {info.trophyPoints}）
                    </div>
                    <div className="ac-rack-sub">
                      投竿尺寸 +{info.rod.sizeBonusPct}% · 计分 +{info.rod.scoreBonusPct}%
                      {info.rod.next
                        ? ` ｜ 下一阶「${info.rod.next.title}」需积分 ${info.rod.next.minTrophyPoints}`
                        : ' ｜ 已至大师钓竿满阶'}
                    </div>
                    <div className="ct-rep-bar hd-rod-bar">
                      <div className="ct-rep-bar-fill hd-bar-fill" style={{ width: `${info.rod.progressPct}%` }} />
                    </div>
                  </div>
                </div>
                <div className="hd-trophy-row">
                  {(Object.keys(HARBOR_TROPHY_LABEL) as HarborTrophyTierId[]).map((k) => (
                    <div key={k} className={`hd-trophy-slot tier-${k} ${(info.trophies[k] || 0) > 0 ? 'owned' : ''}`}>
                      <T1Art kind="skills" id="fishing_trophy" className="hd-trophy-icon" fallback="" alt="" />
                      <span>{HARBOR_TROPHY_LABEL[k]}</span>
                      <strong>×{info.trophies[k] || 0}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'bait' && (
            <div className="hd-bait-view">
              <div className="hd-intro">
                鱼饵由真实钓鱼产物（河鱼 / 鲜虾 / 海鱼 / 湖鱼 / 深海鱼 / 渊海巨鱼）调制；稀有鱼饵配方在周榜达到对应段位并于翻周结算时解锁，转生永久保留。
              </div>
              <div className="hd-bait-grid">
                {info.baits.map((b) => (
                  <div
                    key={b.id}
                    data-testid={`harbor-bait-card-${b.id}`}
                    className={`hd-bait-card ${b.known ? 'known' : 'locked'} bait-${b.id}`}
                  >
                    <div className="hd-bait-head">
                      <div className="hd-bait-icon-frame">
                        <T1Art kind="skills" id={b.iconId} className="hd-bait-icon" fallback="" alt={b.name} />
                      </div>
                      <div className="hd-bait-title-col">
                        <div className="hd-bait-name-row">
                          <strong>{b.name}</strong>
                          <span className={`hd-recipe-tag ${b.known ? 'on' : 'off'}`}>
                            {b.recipeTier ? (b.known ? '稀有配方 · 已掌握' : `需「${b.recipeTierName}」结算`) : '基础配方'}
                          </span>
                        </div>
                        <span className="hd-bait-subtitle">{b.subtitle}</span>
                      </div>
                    </div>
                    <p className="ar-stratum-desc">{b.description}</p>
                    <div className="hd-bait-effect">{formatHarborBaitEffects(b)}</div>
                    <div className="sf-cost-row">
                      {b.craftItems.map((it) => (
                        <span key={it.itemId} className={`sf-cost-chip ${it.have >= it.qty ? 'ok' : 'short'}`}>
                          <T1ItemIcon itemId={it.itemId} className="ac-badge-icon" fallback="" alt="" />
                          {it.name} {it.have}/{it.qty}
                        </span>
                      ))}
                      <span className="sf-cost-chip ok">
                        <T1Art kind="ui" id="gold" className="ac-badge-icon" fallback="" alt="" />
                        {b.craftGold} 金币
                      </span>
                    </div>
                    <div className="hd-bait-stock-line">
                      每批产出 {b.craftYield} 份 · 库存 <strong data-testid={`harbor-bait-stock-${b.id}`}>{b.stock}</strong> / 99
                    </div>
                    <div className="hd-bait-actions">
                      <button
                        type="button"
                        data-testid={`harbor-craft-${b.id}`}
                        className="prog-claim-btn hd-action-btn"
                        disabled={!b.canCraft || Boolean(busyKey)}
                        onClick={() => handleCraft(b, 1)}
                      >
                        {busyKey === `bait:${b.id}:1` ? '调制中…' : b.canCraft ? '调制 ×1 批' : b.craftBlockReason || '暂不可调制'}
                      </button>
                      {b.canCraft && b.maxBatches > 1 && (
                        <button
                          type="button"
                          data-testid={`harbor-craft-max-${b.id}`}
                          className="prog-claim-btn hd-action-btn hd-secondary-btn"
                          disabled={Boolean(busyKey)}
                          onClick={() => handleCraft(b, b.maxBatches)}
                        >
                          {busyKey === `bait:${b.id}:${b.maxBatches}` ? '调制中…' : `调制 ×${b.maxBatches} 批`}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'aquarium' && (
            <div className="hd-aquarium-view">
              <div className="hd-aqua-hero" data-testid="harbor-aquarium-hero">
                <div className="hd-aqua-emblem">
                  <T1Art kind="skills" id="harbor_aquarium" className="hd-aqua-hero-icon" fallback="" alt="海港水族馆" />
                </div>
                <div className="hd-aqua-copy">
                  <div className="hw-hero-title">
                    {info.aquarium.tier.current.title} · 收藏 {info.aquarium.collectedCount} / {info.aquarium.totalSpecies} 种
                  </div>
                  <div className="hw-hero-sub">
                    参赛渔获自动入缸（转生保留）；收藏进度解锁主题展缸，加成钓鱼速度、料理品质与金币收益。
                  </div>
                  <div className="ct-rep-progress-meta">
                    <span>
                      {info.aquarium.tier.next
                        ? `下一展阶「${info.aquarium.tier.next.title}」需收藏 ${info.aquarium.tier.next.minSpecies} 种`
                        : '已收齐全部港湾鱼种'}
                    </span>
                  </div>
                  <div className="ct-rep-bar">
                    <div className="ct-rep-bar-fill hd-aqua-fill" style={{ width: `${info.aquarium.tier.progressPct}%` }} />
                  </div>
                  <div className="hw-bonus-strip">
                    {aqChips.length === 0 ? (
                      <span className="hd-chip muted">尚无加成 —— 钓到第 1 种鱼即可开馆</span>
                    ) : (
                      aqChips.map((c) => (
                        <span key={c} className="hd-chip">
                          {c}
                        </span>
                      ))
                    )}
                    {info.aquarium.bonuses.featuredTank && (
                      <span className="hd-chip title">
                        主展缸「{info.aquarium.tanks.find((t) => t.id === info.aquarium.bonuses.featuredTank)?.name}」
                        {info.aquarium.bonuses.featuredTankFull ? '已收齐 · 共鸣翻倍' : '共鸣生效'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="hd-tank-grid">
                {info.aquarium.tanks.map((t) => {
                  const reso = formatHarborAquariumStats(t.resonance);
                  const eff = formatHarborAquariumStats(t.effectiveResonance);
                  return (
                    <div
                      key={t.id}
                      data-testid={`harbor-tank-${t.id}`}
                      className={`hd-tank-card theme-${t.id} ${t.unlocked ? 'unlocked' : 'locked'} ${t.featured ? 'featured' : ''}`}
                    >
                      <div className="hd-tank-head">
                        <div className="hd-tank-title-col">
                          <strong>{t.name}</strong>
                          <span className="hd-tank-subtitle">{t.subtitle}</span>
                        </div>
                        <span className={`hd-tank-status ${t.featured ? 'on' : t.unlocked ? 'ready' : 'off'}`}>
                          {t.featured ? '主展缸' : t.unlocked ? (t.full ? '已收齐' : '已开放') : `收藏 ${t.unlockSpecies} 种开放`}
                        </span>
                      </div>
                      <div className="hd-tank-water">
                        {t.species.map((s) => (
                          <div
                            key={s.id}
                            data-testid={`harbor-species-${s.id}`}
                            className={`hd-fish-slot ${s.collected ? 'collected' : 'empty'} rarity-${s.rarity}`}
                          >
                            <div className="hd-fish-icon-wrap">
                              <HarborSpeciesIcon sp={s} className="hd-fish-icon" />
                            </div>
                            <span className="hd-fish-name">{s.name}</span>
                            <span className={`hd-rarity-tag rarity-${s.rarity}`}>{s.rarityLabel}</span>
                            <span className="hd-fish-meta">
                              {s.collected
                                ? `最佳 ${s.bestSizeCm}cm · ×${s.count}`
                                : s.exclusiveBaitName
                                ? `需「${s.exclusiveBaitName}」`
                                : `厨师 Lv.${s.minChefLevel}`}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="hd-tank-reso">
                        主题共鸣：{reso.join(' · ')}
                        {t.full ? `（已收齐，翻倍为 ${eff.join(' · ')}）` : `（收齐本缸翻倍）`}
                      </div>
                      <div className="hd-tank-actions">
                        {t.featured ? (
                          <button
                            type="button"
                            data-testid={`harbor-tank-unset-${t.id}`}
                            className="prog-claim-btn hd-action-btn hd-secondary-btn"
                            disabled={Boolean(busyKey)}
                            onClick={() => handleTank(null, t.name)}
                          >
                            撤下主展缸
                          </button>
                        ) : (
                          <button
                            type="button"
                            data-testid={`harbor-tank-set-${t.id}`}
                            className="prog-claim-btn hd-action-btn"
                            disabled={!t.unlocked || Boolean(busyKey)}
                            onClick={() => handleTank(t.id, t.name)}
                          >
                            {t.unlocked ? '设为主展缸' : `需收藏 ${t.unlockSpecies} 种`}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hd-tier-card">
                <div className="ac-rack-title">收藏展阶（按已收藏鱼种数）</div>
                <div className="ct-tier-list">
                  {info.aquarium.tier.allTiers
                    .filter((t) => t.tier > 0)
                    .map((t) => (
                      <div
                        key={t.tier}
                        className={`ct-tier-pill-row ${info.aquarium.tier.current.tier >= t.tier ? 'is-unlocked' : ''}`}
                      >
                        <span>
                          <strong>{t.title}</strong>（收藏 {t.minSpecies} 种）
                        </span>
                        <span>
                          钓鱼速度 +{t.fishingSpeedPct}% · 料理品质 +{t.cookingQualityPct}% · 金币收益 +{t.goldGainPct}%
                        </span>
                      </div>
                    ))}
                </div>
                <div className="hd-projection">
                  已收藏：
                  {HARBOR_SPECIES.filter((s) => info.aquarium.tanks.some((t) => t.species.some((x) => x.id === s.id && x.collected)))
                    .map((s) => speciesName(s.id))
                    .join('、') || '暂无'}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </PanelModal>
  );
}

/* ============================================================================
   冒险者学院进修课程 & 四季节庆活动日历 (WL-12)
   ============================================================================ */

interface AcademyCostItemView {
  itemId: string;
  name: string;
  qty: number;
  have: number;
}

interface AcademyGraduationPreview {
  department: AcademyDepartmentId;
  credits: number;
  departmentTierBefore: number;
  departmentTierAfter: number;
  badgeTierBefore: number;
  badgeTierAfter: number;
}

interface AcademyCourseView {
  id: AcademyCourseId;
  name: string;
  level: 'basic' | 'advanced';
  department: AcademyDepartmentId;
  departmentName: string;
  description: string;
  durationMinutes: number;
  goldCost: number;
  items: AcademyCostItemView[];
  credits: number;
  minBadgeTier: number;
  minBadgeName: string;
  completedCount: number;
  preview: AcademyGraduationPreview;
  canEnroll: boolean;
  blockReason: string | null;
}

interface AcademyDepartmentView {
  id: AcademyDepartmentId;
  name: string;
  passiveName: string;
  subtitle: string;
  description: string;
  credits: number;
  tier: AcademyDepartmentTierDef;
  next: AcademyDepartmentTierDef | null;
  progressPct: number;
  allTiers: readonly AcademyDepartmentTierDef[];
  festivalSeason: FestivalSeasonId;
  festivalSeasonName: string;
}

interface AcademyActiveCourseView {
  courseId: AcademyCourseId;
  startedAt: string;
  endsAt: string;
  name: string;
  level: 'basic' | 'advanced';
  department: AcademyDepartmentId;
  departmentName: string;
  credits: number;
  durationMinutes: number;
  remainingMs: number;
  progressPct: number;
  finished: boolean;
  preview: AcademyGraduationPreview;
}

interface FestivalCommissionView {
  id: FestivalCommissionId;
  name: string;
  description: string;
  kind: FestivalCommissionKind;
  items: AcademyCostItemView[];
  actionPrefix: string | null;
  target: number;
  maxClaims: number;
  claims: number;
  tokens: number;
  gold: number;
  seasonCount: number;
  progress: number;
  required: number;
  canClaim: boolean;
  blockReason: string | null;
}

interface FestivalShopItemView {
  id: FestivalShopItemId;
  name: string;
  description: string;
  kind: FestivalShopItemKind;
  iconKind: 'item' | 'skills' | 'ui';
  iconId: string;
  cost: number;
  limit: number;
  purchased: number;
  gold: number;
  items: Array<{ itemId: string; name: string; qty: number }>;
  credits: number;
  department: AcademyDepartmentId | null;
  departmentName: string | null;
  owned: boolean;
  canBuy: boolean;
  blockReason: string | null;
}

interface AcademyFestivalInfo {
  nowMs: number;
  bonuses: AcademyFestivalBonuses;
  academy: {
    slots: number;
    totalCredits: number;
    badge: {
      current: AcademyBadgeDef;
      next: AcademyBadgeDef | null;
      progressPct: number;
      allBadges: readonly AcademyBadgeDef[];
    };
    departments: AcademyDepartmentView[];
    activeCourse: AcademyActiveCourseView | null;
    courses: AcademyCourseView[];
    totalEnrollments: number;
    totalGraduations: number;
    lastGraduation: {
      courseId: AcademyCourseId;
      courseName: string;
      department: AcademyDepartmentId;
      departmentName: string;
      credits: number;
      at: string;
      departmentTier: number;
      badgeTier: number;
      badgeName: string;
    } | null;
  };
  festival: {
    seasonKey: string;
    seasonIndex: number;
    year: number;
    season: FestivalSeasonDef;
    startsAtMs: number;
    endsAtMs: number;
    nextSeason: { id: FestivalSeasonId; name: string; shortName: string; months: string };
    calendar: Array<{
      id: FestivalSeasonId;
      name: string;
      shortName: string;
      months: string;
      subtitle: string;
      current: boolean;
      keepsakeName: string;
      keepsakeStats: AcademyStats;
      keepsakeOwned: boolean;
    }>;
    tokens: number;
    tokenCap: number;
    tokenGoldRate: number;
    commissions: FestivalCommissionView[];
    shop: FestivalShopItemView[];
    keepsakes: FestivalSeasonId[];
    fullCycle: boolean;
    fullCycleStats: AcademyStats;
    totalTokensEarned: number;
    totalClaims: number;
    lastRollover: {
      seasonKey: string;
      seasonName: string;
      claims: number;
      tokensConverted: number;
      goldConverted: number;
    } | null;
  };
}

const ACADEMY_LEVEL_LABEL: Record<'basic' | 'advanced', string> = { basic: '基础课', advanced: '进阶课' };

const FESTIVAL_KIND_LABEL: Record<FestivalCommissionKind, string> = {
  deliver: '交付成品',
  actions: '本季行动',
  kills: '本季击杀',
};

const FESTIVAL_ACTION_LABEL: Record<string, string> = {
  act_plant_: '种植行动',
  act_fish_: '钓鱼行动',
  act_raise_: '畜牧养殖行动',
};

function academyDeptTierTitle(dept: AcademyDepartmentId, tier: number): string {
  const def = ACADEMY_DEPARTMENTS.find((d) => d.id === dept);
  return def?.tiers.find((t) => t.tier === tier)?.title || '';
}

function academyPreviewText(p: AcademyGraduationPreview, deptName: string, credits: number): string {
  const after = getAcademyDepartmentTier(p.department, credits + p.credits);
  if (p.departmentTierAfter > p.departmentTierBefore) {
    return p.departmentTierBefore === 0
      ? `结业后点亮${deptName}「${after.current.title}」`
      : `结业后「${academyDeptTierTitle(p.department, p.departmentTierBefore)}」晋升「${after.current.title}」`;
  }
  return after.next
    ? `结业后${deptName} ${credits} → ${credits + p.credits} 学分（「${after.next.title}」需 ${after.next.minCredits}）`
    : `结业后${deptName} ${credits} → ${credits + p.credits} 学分（已满阶）`;
}

function FestivalShopIcon({ item, className }: { item: FestivalShopItemView; className: string }) {
  if (item.iconKind === 'item') return <T1ItemIcon itemId={item.iconId} className={className} fallback="" alt={item.name} />;
  if (item.iconKind === 'ui') return <T1Art kind="ui" id={item.iconId} className={className} fallback="" alt={item.name} />;
  return <T1Art kind="skills" id={item.iconId} className={className} fallback="" alt={item.name} />;
}

export function AcademyFestivalPanel({ onClose, onChange }: { onClose: () => void; onChange?: () => void }) {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [info, setInfo] = useState<AcademyFestivalInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'academy' | 'festival' | 'shop'>('academy');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  // 服务器时钟偏移：倒计时按「服务器 nowMs + 本地流逝」推算，每 30 秒刷新一次
  const [clientAnchor, setClientAnchor] = useState(() => Date.now());
  const [tick, setTick] = useState(() => Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      apiClient.clearCache();
      const res: any = await apiClient.getAcademyFestival();
      setInfo(res);
      setClientAnchor(Date.now());
      return res as AcademyFestivalInfo;
    } catch (e: any) {
      toastRef.current.error(e?.message || '加载冒险者学院与四季节庆失败');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const t = window.setInterval(() => setTick(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const applyInfo = (res: any) => {
    if (res?.academy) {
      setInfo(res.academy);
      setClientAnchor(Date.now());
    }
  };

  const handleEnroll = async (course: AcademyCourseView) => {
    setBusyKey(`enroll:${course.id}`);
    try {
      const res: any = await apiClient.enrollAcademyCourse({ courseId: course.id });
      if (res?.academy) applyInfo(res);
      else await load();
      toastRef.current.success(`已报名「${course.name}」，${formatCourseDuration(course.durationMinutes)}后结业可得 ${course.credits} 学分`);
      onChange?.();
    } catch (e: any) {
      toastRef.current.error(e?.message || '报名学院课程失败');
    } finally {
      setBusyKey(null);
    }
  };

  const handleGraduate = async () => {
    setBusyKey('graduate');
    const before = info?.academy.totalGraduations ?? 0;
    const res = await load();
    setBusyKey(null);
    if (res && res.academy.totalGraduations > before && res.academy.lastGraduation) {
      toastRef.current.success(
        `「${res.academy.lastGraduation.courseName}」结业：${res.academy.lastGraduation.departmentName} +${res.academy.lastGraduation.credits} 学分`
      );
      onChange?.();
    }
  };

  const handleClaim = async (c: FestivalCommissionView) => {
    setBusyKey(`claim:${c.id}`);
    try {
      const res: any = await apiClient.claimFestivalCommission({ commissionId: c.id });
      if (res?.academy) applyInfo(res);
      else await load();
      toastRef.current.success(`委托「${c.name}」完成：+${c.tokens} ${info?.festival.season.tokenName ?? '节庆代币'} · +${c.gold} 金币`);
      onChange?.();
    } catch (e: any) {
      toastRef.current.error(e?.message || '完成节庆委托失败');
    } finally {
      setBusyKey(null);
    }
  };

  const handleBuy = async (item: FestivalShopItemView) => {
    setBusyKey(`buy:${item.id}`);
    try {
      const res: any = await apiClient.buyFestivalShopItem({ itemId: item.id });
      if (res?.academy) applyInfo(res);
      else await load();
      toastRef.current.success(`节庆商店兑换「${item.name}」`);
      onChange?.();
    } catch (e: any) {
      toastRef.current.error(e?.message || '节庆商店兑换失败');
    } finally {
      setBusyKey(null);
    }
  };

  const serverNow = info ? info.nowMs + Math.max(0, tick - clientAnchor) : 0;
  const active = info?.academy.activeCourse ?? null;
  const activeRemaining = active ? Math.max(0, Date.parse(active.endsAt) - serverNow) : 0;
  const activePct = active
    ? Math.min(100, Math.max(0, Math.floor(((serverNow - Date.parse(active.startedAt)) / Math.max(1, active.durationMinutes * 60_000)) * 100)))
    : 0;
  const activeDone = Boolean(active) && activeRemaining <= 0;
  const bonusChips = info ? formatAcademyStats(info.bonuses) : [];
  const seasonLeft = info ? Math.max(0, info.festival.endsAtMs - serverNow) : 0;
  const deptCredits = (id: AcademyDepartmentId) => info?.academy.departments.find((d) => d.id === id)?.credits ?? 0;
  const claimableCount = info ? info.festival.commissions.filter((c) => c.canClaim).length : 0;
  const seasonClaims = info ? info.festival.commissions.reduce((s, c) => s + c.claims, 0) : 0;

  return (
    <PanelModal
      title="冒险者学院与四季节庆"
      icon={<T1Art kind="skills" id="academy_crest" className="hw-modal-title-icon" fallback="" alt="" />}
      onClose={onClose}
    >
      {loading && !info ? (
        <div className="prog-empty">正在翻开学院课表与节庆日历…</div>
      ) : !info ? (
        <div className="prog-empty">暂无冒险者学院数据</div>
      ) : (
        <div className="af-panel-root" data-testid="academy-festival-panel">
          <div className="hw-hero-card af-hero-card">
            <div className="hw-hero-top">
              <div className="hw-hero-emblem af-hero-emblem">
                <T1Art kind="skills" id="academy_crest" className="hw-hero-core-icon" fallback="" alt="冒险者学院院徽" />
              </div>
              <div className="hw-hero-copy af-hero-copy">
                <div className="ac-hero-title-row">
                  <span className="hw-hero-title" data-testid="academy-badge-name">
                    冒险者学院 · {info.academy.badge.current.name}
                  </span>
                  <span className="qm-equipped-pill" title="学分、徽章与纪念章转生永久保留">转生保留</span>
                </div>
                <div className="ct-rep-progress-meta af-progress-meta">
                  <span>
                    四系学分合计 <strong data-testid="academy-total-credits">{info.academy.totalCredits}</strong>
                    {info.academy.badge.next
                      ? ` · 下一枚「${info.academy.badge.next.name}」需 ${info.academy.badge.next.minCredits} 学分`
                      : ' · 已获最高学院徽章'}
                  </span>
                  <span className="af-season-line">
                    {info.festival.year} {info.festival.season.name}（{info.festival.season.months}）· 距翻季 {formatAcademyCountdown(seasonLeft)}
                  </span>
                </div>
                <div className="ct-rep-bar af-progress-bar">
                  <div className="ct-rep-bar-fill af-bar-fill" style={{ width: `${info.academy.badge.progressPct}%` }} />
                </div>
              </div>
            </div>

            <div className="ac-wallet-badges af-wallet-row">
              <span className="ac-wallet-badge af-course-badge">
                <T1Art kind="skills" id="course_scroll" className="ac-badge-icon" fallback="" alt="" />
                {active ? (
                  <>
                    进修中：<strong data-testid="academy-active-name">{active.name}</strong>
                  </>
                ) : (
                  <>
                    进修席位：<strong data-testid="academy-active-name">空闲</strong>
                  </>
                )}
              </span>
              <span className="ac-wallet-badge af-grad-badge">
                <T1Art kind="skills" id="graduation_cap" className="ac-badge-icon" fallback="" alt="" />
                结业：<strong data-testid="academy-graduations">{info.academy.totalGraduations}</strong> 次
              </span>
              <span className="ac-wallet-badge af-token-badge">
                <T1Art kind="skills" id="festival_shop_tent" className="ac-badge-icon" fallback="" alt="" />
                {info.festival.season.tokenName}：<strong data-testid="festival-tokens">{info.festival.tokens}</strong>
              </span>
              <span className="ac-wallet-badge af-keepsake-badge">
                <T1Art kind="skills" id="festival_calendar" className="ac-badge-icon" fallback="" alt="" />
                纪念章：<strong data-testid="festival-keepsake-count">{info.festival.keepsakes.length} / 4</strong>
              </span>
            </div>

            <div className="hw-bonus-strip" data-testid="academy-bonuses">
              {bonusChips.length === 0 ? (
                <span className="af-chip muted">尚无永久加成 —— 修满 8 学分即可点亮第一条跨职业被动</span>
              ) : (
                bonusChips.map((c) => (
                  <span key={c} className="af-chip">
                    {c}
                  </span>
                ))
              )}
              {info.festival.fullCycle && <span className="af-chip title">四季圆满</span>}
            </div>
          </div>

          <div className="prog-filter-bar af-tab-bar">
            <button
              type="button"
              data-testid="academy-tab-courses"
              className={`prog-filter-btn ${tab === 'academy' ? 'active' : ''}`}
              onClick={() => setTab('academy')}
            >
              学院进修
            </button>
            <button
              type="button"
              data-testid="academy-tab-festival"
              className={`prog-filter-btn ${tab === 'festival' ? 'active' : ''}`}
              onClick={() => setTab('festival')}
            >
              {info.festival.season.shortName}委托{claimableCount > 0 ? `（可领 ${claimableCount}）` : ''}
            </button>
            <button
              type="button"
              data-testid="academy-tab-shop"
              className={`prog-filter-btn ${tab === 'shop' ? 'active' : ''}`}
              onClick={() => setTab('shop')}
            >
              节庆商店
            </button>
          </div>

          {tab === 'academy' && (
            <div className="af-academy-view">
              <div className={`af-active-card ${active ? 'busy' : 'idle'}`} data-testid="academy-active-course">
                <div className="af-active-icon-frame">
                  <T1Art kind="skills" id="course_scroll" className="af-active-icon" fallback="" alt="学院进修课程卷轴" />
                </div>
                <div className="af-active-copy">
                  {active ? (
                    <>
                      <div className="af-active-title">
                        正在进修「{active.name}」
                        <span className={`af-dept-tag dept-${active.department}`}>{active.departmentName}</span>
                        <span className="af-level-tag">{ACADEMY_LEVEL_LABEL[active.level]}</span>
                      </div>
                      <div className="ct-rep-bar af-course-bar">
                        <div
                          className="ct-rep-bar-fill af-course-fill"
                          style={{ width: `${activeDone ? 100 : activePct}%` }}
                        />
                      </div>
                      <div className="af-active-meta">
                        {activeDone
                          ? `课程已到点，结业即得 ${active.credits} 学分`
                          : `还剩 ${formatAcademyCountdown(activeRemaining)} · 结业可得 ${active.credits} 学分`}
                        {' · '}
                        {academyPreviewText(active.preview, active.departmentName, deptCredits(active.department))}
                      </div>
                      {activeDone && (
                        <button
                          type="button"
                          data-testid="academy-graduate-btn"
                          className="prog-claim-btn af-action-btn af-primary-btn"
                          disabled={Boolean(busyKey)}
                          onClick={handleGraduate}
                        >
                          {busyKey === 'graduate' ? '结业中…' : '结业领取学分'}
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="af-active-title">进修席位空闲</div>
                      <div className="af-active-meta">
                        从下方课程目录选择一门报名（同一时间只能修读 {info.academy.slots} 门）。课程到点后打开本面板即结业，学分计入所属学系。
                      </div>
                    </>
                  )}
                </div>
              </div>

              {info.academy.lastGraduation && (
                <div className="af-grad-line" data-testid="academy-last-graduation">
                  <T1Art kind="skills" id="graduation_cap" className="af-grad-icon" fallback="" alt="" />
                  <span>
                    上次结业：「{info.academy.lastGraduation.courseName}」· {info.academy.lastGraduation.departmentName} +
                    {info.academy.lastGraduation.credits} 学分 · 当时徽章「{info.academy.lastGraduation.badgeName}」
                  </span>
                </div>
              )}

              <div className="ac-rack-title">课程目录（报名消耗金币 + 生活职业成品，结业学分计入所属学系）</div>
              <div className="af-course-grid">
                {info.academy.courses.map((c) => (
                  <div
                    key={c.id}
                    data-testid={`academy-course-${c.id}`}
                    className={`af-course-card dept-${c.department} ${c.canEnroll ? 'ready' : 'blocked'} ${active?.courseId === c.id ? 'current' : ''}`}
                  >
                    <div className="af-course-head">
                      <div className="af-course-icon-frame">
                        <T1Art kind="skills" id="course_scroll" className="af-course-icon" fallback="" alt="" />
                      </div>
                      <div className="af-course-title-col">
                        <div className="af-course-name-row">
                          <strong>{c.name}</strong>
                          <span className={`af-dept-tag dept-${c.department}`}>{c.departmentName}</span>
                          <span className="af-level-tag">{ACADEMY_LEVEL_LABEL[c.level]}</span>
                        </div>
                        <span className="af-course-sub">
                          {formatCourseDuration(c.durationMinutes)} · +{c.credits} 学分
                          {c.completedCount > 0 ? ` · 已结业 ×${c.completedCount}` : ''}
                          {info.academy.badge.current.tier < c.minBadgeTier ? ` · 需「${c.minBadgeName}」` : ''}
                        </span>
                      </div>
                    </div>
                    <p className="af-course-desc">{c.description}</p>
                    <div className="sf-cost-row">
                      {c.items.map((it) => (
                        <span key={it.itemId} className={`sf-cost-chip ${it.have >= it.qty ? 'ok' : 'short'}`}>
                          <T1ItemIcon itemId={it.itemId} className="ac-badge-icon" fallback="" alt="" />
                          {it.name} {it.have}/{it.qty}
                        </span>
                      ))}
                      <span className="sf-cost-chip ok">
                        <T1Art kind="ui" id="gold" className="ac-badge-icon" fallback="" alt="" />
                        {c.goldCost} 金币
                      </span>
                    </div>
                    <div className="af-course-preview">{academyPreviewText(c.preview, c.departmentName, deptCredits(c.department))}</div>
                    <button
                      type="button"
                      data-testid={`academy-enroll-${c.id}`}
                      className="prog-claim-btn af-action-btn af-primary-btn"
                      disabled={!c.canEnroll || Boolean(busyKey)}
                      onClick={() => handleEnroll(c)}
                    >
                      {busyKey === `enroll:${c.id}`
                        ? '报名中…'
                        : active?.courseId === c.id
                        ? '进修中'
                        : c.canEnroll
                        ? '报名进修'
                        : c.blockReason || '暂不可报名'}
                    </button>
                  </div>
                ))}
              </div>

              <div className="ac-rack-title">四系跨职业永久被动（学分达标即生效，转生保留）</div>
              <div className="af-dept-grid">
                {info.academy.departments.map((d) => {
                  const cur = formatAcademyStats(d.tier.stats);
                  const nextStats = d.next ? formatAcademyStats(d.next.stats) : [];
                  return (
                    <div key={d.id} data-testid={`academy-dept-${d.id}`} className={`af-dept-card dept-${d.id} tier-${d.tier.tier}`}>
                      <div className="af-dept-head">
                        <strong>{d.name}</strong>
                        <span className="af-dept-tier">{d.tier.title}</span>
                      </div>
                      <div className="af-dept-sub">
                        「{d.passiveName}」· {d.subtitle}
                      </div>
                      <div className="ct-rep-bar af-dept-bar">
                        <div className="ct-rep-bar-fill af-dept-fill" style={{ width: `${d.progressPct}%` }} />
                      </div>
                      <div className="af-dept-meta">
                        学分 <strong>{d.credits}</strong>
                        {d.next ? ` / ${d.next.minCredits}（下一阶「${d.next.title}」）` : '（已满阶）'}
                      </div>
                      <div className="af-dept-stats">
                        {cur.length > 0 ? `当前：${cur.join(' · ')}` : '当前：未点亮'}
                        {nextStats.length > 0 ? ` ｜ 下一阶：${nextStats.join(' · ')}` : ''}
                      </div>
                      <div className="af-dept-note">{d.festivalSeasonName}商店限定：本系进修推荐信 +3 学分</div>
                    </div>
                  );
                })}
              </div>

              <div className="ac-rack-title">学院徽章（四系学分合计晋阶）</div>
              <div className="af-badge-row" data-testid="academy-badges">
                {info.academy.badge.allBadges
                  .filter((b) => b.tier > 0)
                  .map((b) => (
                    <div
                      key={b.tier}
                      className={`af-badge-slot tier-${b.tier} ${info.academy.badge.current.tier >= b.tier ? 'owned' : 'locked'}`}
                    >
                      <T1Art kind="skills" id={b.iconId} className="af-badge-icon" fallback="" alt={b.name} />
                      <strong>{b.name}</strong>
                      <span className="af-badge-req">学分 {b.minCredits}</span>
                      <span className="af-badge-stats">{formatAcademyStats(b.stats).join(' · ')}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {tab === 'festival' && (
            <div className="af-festival-view">
              <div className={`af-season-card season-${info.festival.season.id}`} data-testid="festival-season-card">
                <div className="af-season-emblem">
                  <T1Art kind="skills" id="festival_calendar" className="af-season-icon" fallback="" alt="四季节庆活动日历" />
                </div>
                <div className="af-season-copy">
                  <div className="af-season-title" data-testid="festival-season-name">
                    {info.festival.year} {info.festival.season.name}
                    <span className="af-season-months">{info.festival.season.months} · {info.festival.season.subtitle}</span>
                  </div>
                  <p className="af-season-desc">{info.festival.season.description}</p>
                  <div className="af-season-meta">
                    距翻季 {formatAcademyCountdown(seasonLeft)} · 下一季「{info.festival.nextSeason.name}」（{info.festival.nextSeason.months}）·
                    本季代币「{info.festival.season.tokenName}」翻季时 1 枚折 {info.festival.tokenGoldRate} 金币
                  </div>
                </div>
              </div>

              <div className="af-calendar-strip" data-testid="festival-calendar">
                {info.festival.calendar.map((s) => (
                  <div key={s.id} className={`af-calendar-cell season-${s.id} ${s.current ? 'current' : ''}`}>
                    <strong>{s.name}</strong>
                    <span className="af-calendar-months">{s.months}</span>
                    <span className={`af-calendar-keep ${s.keepsakeOwned ? 'owned' : ''}`}>
                      {s.keepsakeOwned ? '纪念章已收藏' : s.current ? '本季可兑纪念章' : '纪念章未收藏'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="af-commission-head">
                <T1Art kind="skills" id="festival_harvest_basket" className="af-basket-icon" fallback="" alt="节庆限定委托" />
                <div>
                  <div className="ac-rack-title">{info.festival.season.name}限定委托</div>
                  <div className="ac-rack-sub">
                    交付真实成品或完成本季真实行动 / 击杀，每份委托每季限 3 次；本季已完成 {seasonClaims} 次 · 生涯累计获得节庆代币 {info.festival.totalTokensEarned} 枚。
                  </div>
                </div>
              </div>
              <div className="af-commission-list">
                {info.festival.commissions.map((c) => (
                  <div
                    key={c.id}
                    data-testid={`festival-commission-${c.id}`}
                    className={`af-commission-card kind-${c.kind} ${c.canClaim ? 'ready' : ''} ${c.claims >= c.maxClaims ? 'done' : ''}`}
                  >
                    <div className="af-commission-top">
                      <div className="af-commission-title">
                        <strong>{c.name}</strong>
                        <span className={`af-kind-tag kind-${c.kind}`}>{FESTIVAL_KIND_LABEL[c.kind]}</span>
                      </div>
                      <span className="af-claim-pips" aria-label={`已完成 ${c.claims}/${c.maxClaims}`}>
                        {Array.from({ length: c.maxClaims }, (_, i) => (
                          <span key={i} className={`af-pip ${i < c.claims ? 'on' : ''}`} />
                        ))}
                      </span>
                    </div>
                    <p className="af-commission-desc">{c.description}</p>
                    {c.kind === 'deliver' ? (
                      <div className="sf-cost-row">
                        {c.items.map((it) => (
                          <span key={it.itemId} className={`sf-cost-chip ${it.have >= it.qty ? 'ok' : 'short'}`}>
                            <T1ItemIcon itemId={it.itemId} className="ac-badge-icon" fallback="" alt="" />
                            {it.name} {it.have}/{it.qty}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="af-count-block">
                        <div className="ct-rep-bar af-count-bar">
                          <div
                            className="ct-rep-bar-fill af-count-fill"
                            style={{ width: `${c.target > 0 ? Math.round((c.progress / c.target) * 100) : 0}%` }}
                          />
                        </div>
                        <span className="af-count-meta">
                          本季{c.kind === 'kills' ? '击杀' : FESTIVAL_ACTION_LABEL[c.actionPrefix || ''] || '行动'} {c.seasonCount} 次
                          {c.claims < c.maxClaims ? ` · 第 ${c.claims + 1} 次需累计 ${c.required}` : ' · 本季已领满'}
                        </span>
                      </div>
                    )}
                    <div className="af-commission-foot">
                      <span className="af-reward">
                        +{c.tokens} {info.festival.season.tokenName} · +{c.gold} 金币
                      </span>
                      <button
                        type="button"
                        data-testid={`festival-claim-${c.id}`}
                        className="prog-claim-btn af-action-btn af-festival-btn"
                        disabled={!c.canClaim || Boolean(busyKey)}
                        onClick={() => handleClaim(c)}
                      >
                        {busyKey === `claim:${c.id}`
                          ? '提交中…'
                          : c.canClaim
                          ? c.kind === 'deliver'
                            ? '交付委托'
                            : '领取奖励'
                          : c.blockReason || '暂不可领取'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {info.festival.lastRollover && (
                <div className="af-rollover-line" data-testid="festival-last-rollover">
                  上一季（{info.festival.lastRollover.seasonName}）完成委托 {info.festival.lastRollover.claims} 次，剩余{' '}
                  {info.festival.lastRollover.tokensConverted} 枚代币折算 {info.festival.lastRollover.goldConverted} 金币。
                </div>
              )}
            </div>
          )}

          {tab === 'shop' && (
            <div className="af-shop-view">
              <div className={`af-shop-hero season-${info.festival.season.id}`} data-testid="festival-shop-hero">
                <div className="af-shop-emblem">
                  <T1Art kind="skills" id="festival_shop_tent" className="af-shop-icon" fallback="" alt="节庆商店帐篷" />
                </div>
                <div className="af-shop-copy">
                  <div className="af-season-title">
                    {info.festival.season.name}商店
                    <span className="af-season-months">持有「{info.festival.season.tokenName}」{info.festival.tokens} 枚</span>
                  </div>
                  <div className="af-season-meta">
                    商品每季限购，翻季后换上新一季的礼包与纪念章；进修推荐信直接为学院学系增加学分，纪念章转生永久保留。
                  </div>
                </div>
              </div>

              <div className="af-shop-grid">
                {info.festival.shop.map((item) => (
                  <div
                    key={item.id}
                    data-testid={`festival-shop-${item.id}`}
                    className={`af-shop-card kind-${item.kind} ${item.canBuy ? 'ready' : 'blocked'}`}
                  >
                    <div className="af-shop-head">
                      <div className="af-shop-icon-frame">
                        <FestivalShopIcon item={item} className="af-shop-item-icon" />
                      </div>
                      <div className="af-shop-title-col">
                        <strong>{item.name}</strong>
                        <span className="af-shop-sub">
                          {item.cost} 枚 · 本季 {item.purchased}/{item.limit}
                        </span>
                      </div>
                    </div>
                    <p className="af-shop-desc">{item.description}</p>
                    {item.items.length > 0 && (
                      <div className="sf-cost-row">
                        {item.items.map((it) => (
                          <span key={it.itemId} className="sf-cost-chip ok">
                            <T1ItemIcon itemId={it.itemId} className="ac-badge-icon" fallback="" alt="" />
                            {it.name} ×{it.qty}
                          </span>
                        ))}
                      </div>
                    )}
                    {item.kind === 'gold' && <div className="af-shop-grant">获得 {item.gold} 金币</div>}
                    {item.kind === 'credits' && (
                      <div className="af-shop-grant">
                        {item.departmentName} +{item.credits} 学分
                      </div>
                    )}
                    <button
                      type="button"
                      data-testid={`festival-buy-${item.id}`}
                      className="prog-claim-btn af-action-btn af-festival-btn"
                      disabled={!item.canBuy || Boolean(busyKey)}
                      onClick={() => handleBuy(item)}
                    >
                      {busyKey === `buy:${item.id}` ? '兑换中…' : item.canBuy ? '兑换' : item.blockReason || '暂不可兑换'}
                    </button>
                  </div>
                ))}
              </div>

              <div className="ac-rack-title">四季纪念章（转生永久保留，收齐四季额外获得「四季圆满」）</div>
              <div className="af-keepsake-row" data-testid="festival-keepsakes">
                {info.festival.calendar.map((s) => (
                  <div key={s.id} className={`af-keepsake-slot season-${s.id} ${s.keepsakeOwned ? 'owned' : 'locked'}`}>
                    <T1Art kind="skills" id="festival_calendar" className="af-keepsake-icon" fallback="" alt="" />
                    <strong>{s.keepsakeName}</strong>
                    <span>{formatAcademyStats(s.keepsakeStats).join(' · ')}</span>
                    <span className="af-keepsake-state">{s.keepsakeOwned ? '已收藏' : `${s.name}限定兑换`}</span>
                  </div>
                ))}
              </div>
              <div className="af-fullcycle-line">
                四季圆满：{formatAcademyStats(info.festival.fullCycleStats).join(' · ')}
                {info.festival.fullCycle ? '（已生效）' : `（已收藏 ${info.festival.keepsakes.length} / 4）`}
              </div>
            </div>
          )}
        </div>
      )}
    </PanelModal>
  );
}

/* ============================================================================
   天空竞技场赛季排位 & 公会领地城镇建设 (WL-13)
   ============================================================================ */

interface ArenaDuelPreviewView {
  won: boolean;
  timeout: boolean;
  playerHpLeft: number;
  playerMaxHp: number;
  enemyHpLeft: number;
  enemyMaxHp: number;
  durationMs: number;
}

interface ArenaChampionView {
  id: string;
  rung: number;
  level: number;
  name: string;
  epithet: string;
  archetype: ArenaArchetypeId;
  archetypeName: string;
  style: string;
  division: ArenaDivisionId;
  divisionName: string;
  gatekeeper: boolean;
  hp: number;
  atk: number;
  def: number;
  attackIntervalMs: number;
  isBoss: boolean;
  mechanics: string[];
  mechanicLabels: Array<{ id: string; label: string; desc: string }>;
  gold: number;
  preview: ArenaDuelPreviewView | null;
  next: boolean;
}

interface ArenaDuelRecordView extends ArenaDuelPreviewView {
  seasonKey: string;
  rung: number;
  championName: string;
  gold: number;
  at: string;
}

interface TownCostItemView {
  itemId: string;
  name: string;
  qty: number;
  have: number;
}

interface TownFacilityView {
  id: TownFacilityId;
  name: string;
  subtitle: string;
  description: string;
  iconKind: 'skills' | 'ui';
  iconId: string;
  prosperityPerLevel: number;
  level: number;
  maxLevel: number;
  cap: number;
  currentStats: ArenaTownStats;
  currentPerk: string | null;
  next: {
    level: number;
    gold: number;
    medals: number;
    items: TownCostItemView[];
    stats: ArenaTownStats;
    perk: string | null;
  } | null;
  perks: Array<{ level: number; perk: string; unlocked: boolean }>;
  canUpgrade: boolean;
  blockReason: string | null;
}

interface SkyArenaTownInfo {
  nowMs: number;
  bonuses: ArenaTownBonuses;
  arena: {
    seasonKey: string;
    seasonIndex: number;
    seasonLabel: string;
    startsAtMs: number;
    endsAtMs: number;
    dayKey: string;
    dayEndsAtMs: number;
    rungCount: number;
    rung: number;
    bestRung: number;
    division: { id: ArenaDivisionId; name: string } | null;
    attemptsPerDay: number;
    attemptsUsed: number;
    attemptsLeft: number;
    seasonWins: number;
    seasonLosses: number;
    totalWins: number;
    totalLosses: number;
    medals: number;
    totalMedalsEarned: number;
    titles: ArenaDivisionId[];
    bestTitle: { id: ArenaDivisionId; name: string; stats: ArenaTownStats } | null;
    seasonsSettled: number;
    settlementPreview: { rung: number; division: ArenaDivisionId | null; divisionName: string; medals: number; titleName: string | null };
    lastSettlement: {
      seasonKey: string;
      seasonLabel: string;
      rung: number;
      division: ArenaDivisionId | null;
      divisionName: string;
      medals: number;
      newTitle: ArenaDivisionId | null;
      newTitleName: string | null;
    } | null;
    lastDuel: ArenaDuelRecordView | null;
    buildStats: { atk: number; def: number; hp: number; intervalMs: number } | null;
    next: ArenaChampionView | null;
    upcoming: ArenaChampionView[];
    challengeBlock: string | null;
    canChallenge: boolean;
    ladder: Array<{
      rung: number;
      name: string;
      archetypeName: string;
      division: ArenaDivisionId;
      gatekeeper: boolean;
      defeated: boolean;
      current: boolean;
    }>;
    divisions: Array<{
      id: ArenaDivisionId;
      name: string;
      minRung: number;
      maxRung: number;
      medals: number;
      titleName: string;
      titleStats: ArenaTownStats;
      reached: boolean;
      titleOwned: boolean;
    }>;
  };
  town: {
    facilities: TownFacilityView[];
    prosperity: {
      points: number;
      maxPoints: number;
      tier: number;
      name: string;
      stats: ArenaTownStats;
      next: { tier: number; name: string; minPoints: number; stats: ArenaTownStats } | null;
      progressPct: number;
    };
    chests: Array<{
      tier: number;
      name: string;
      minPoints: number;
      stats: ArenaTownStats;
      gold: number;
      items: Array<{ itemId: string; name: string; qty: number }>;
      reached: boolean;
      claimed: boolean;
      canClaim: boolean;
    }>;
    totalUpgrades: number;
    goldInvested: number;
    lastUpgrade: { facilityId: TownFacilityId; facilityName: string; level: number; at: string } | null;
    medals: number;
  };
}

function arenaPreviewText(p: ArenaDuelPreviewView | null): string {
  if (!p) return '暂无预演';
  if (p.won) {
    const pct = p.playerMaxHp > 0 ? Math.round((p.playerHpLeft / p.playerMaxHp) * 100) : 0;
    return `预计胜利 · 剩 ${pct}% 生命 · 约 ${formatDuelDuration(p.durationMs)}`;
  }
  const pct = p.enemyMaxHp > 0 ? Math.round((p.enemyHpLeft / p.enemyMaxHp) * 100) : 0;
  return p.timeout ? `预计 10 分钟内拿不下（擂主剩 ${pct}%）` : `预计落败 · 擂主剩 ${pct}% 生命`;
}

function arenaPreviewTone(p: ArenaDuelPreviewView | null): 'win' | 'close' | 'lose' {
  if (!p || !p.won) return 'lose';
  return p.playerMaxHp > 0 && p.playerHpLeft / p.playerMaxHp < 0.3 ? 'close' : 'win';
}

function TownFacilityIcon({ facility, className }: { facility: TownFacilityView; className: string }) {
  if (facility.iconKind === 'ui') return <T1Art kind="ui" id={facility.iconId} className={className} fallback="" alt={facility.name} />;
  return <T1Art kind="skills" id={facility.iconId} className={className} fallback="" alt={facility.name} />;
}

export function SkyArenaTownPanel({ onClose, onChange }: { onClose: () => void; onChange?: () => void }) {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [info, setInfo] = useState<SkyArenaTownInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'arena' | 'honors' | 'town'>('arena');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [lastLog, setLastLog] = useState<string[]>([]);
  // 服务器时钟偏移：倒计时按「服务器 nowMs + 本地流逝」推算，每 30 秒刷新一次
  const [clientAnchor, setClientAnchor] = useState(() => Date.now());
  const [tick, setTick] = useState(() => Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      apiClient.clearCache();
      const res: any = await apiClient.getSkyArenaTown();
      setInfo(res);
      setClientAnchor(Date.now());
      return res as SkyArenaTownInfo;
    } catch (e: any) {
      toastRef.current.error(e?.message || '加载天空竞技场与公会城镇失败');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const t = window.setInterval(() => setTick(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const applyInfo = (res: any) => {
    if (res?.arena?.arena) {
      setInfo(res.arena);
      setClientAnchor(Date.now());
    }
  };

  const handleChallenge = async () => {
    const next = info?.arena.next;
    if (!next) return;
    setBusyKey('challenge');
    try {
      const res: any = await apiClient.challengeSkyArena({ rung: next.rung });
      if (res?.arena) applyInfo(res);
      else await load();
      const c = res?.challenge;
      setLastLog(Array.isArray(c?.duel?.log) ? c.duel.log : []);
      if (c?.won) {
        toastRef.current.success(`击败「${c.championName}」！晋级第 ${c.rung} 级 · +${c.gold} 金币`);
      } else if (c) {
        toastRef.current.info(c.timeout ? `与「${c.championName}」鏖战 10 分钟未分胜负，判负` : `惜败于「${c.championName}」，强化构建后再来`);
      }
      onChange?.();
    } catch (e: any) {
      toastRef.current.error(e?.message || '挑战擂主失败');
      await load();
    } finally {
      setBusyKey(null);
    }
  };

  const handleUpgrade = async (f: TownFacilityView) => {
    setBusyKey(`build:${f.id}`);
    try {
      const res: any = await apiClient.upgradeTownFacility({ facilityId: f.id });
      if (res?.arena) applyInfo(res);
      else await load();
      toastRef.current.success(`「${f.name}」${f.level === 0 ? '落成' : '升至'} Lv.${f.level + 1}`);
      onChange?.();
    } catch (e: any) {
      toastRef.current.error(e?.message || '城镇建设失败');
    } finally {
      setBusyKey(null);
    }
  };

  const handleChest = async (tier: number, name: string) => {
    setBusyKey(`chest:${tier}`);
    try {
      const res: any = await apiClient.claimTownProsperityChest({ tier });
      if (res?.arena) applyInfo(res);
      else await load();
      toastRef.current.success(`开启「${name}」繁荣宝箱：+${res?.chest?.gold ?? 0} 金币`);
      onChange?.();
    } catch (e: any) {
      toastRef.current.error(e?.message || '领取繁荣宝箱失败');
    } finally {
      setBusyKey(null);
    }
  };

  const serverNow = info ? info.nowMs + Math.max(0, tick - clientAnchor) : 0;
  const seasonLeft = info ? Math.max(0, info.arena.endsAtMs - serverNow) : 0;
  const dayLeft = info ? Math.max(0, info.arena.dayEndsAtMs - serverNow) : 0;
  const bonusChips = info ? formatArenaTownStats(info.bonuses) : [];
  const next = info?.arena.next ?? null;
  const hall = info?.town.facilities.find((f) => f.id === 'town_hall');
  const claimableChests = info ? info.town.chests.filter((c) => c.canClaim).length : 0;
  const upgradable = info ? info.town.facilities.filter((f) => f.canUpgrade).length : 0;

  return (
    <PanelModal
      title="天空竞技场与公会城镇"
      icon={<T1Art kind="skills" id="sky_arena" className="hw-modal-title-icon" fallback="" alt="" />}
      onClose={onClose}
    >
      {loading && !info ? (
        <div className="prog-empty">正在登上天空竞技场、清点城镇账册…</div>
      ) : !info ? (
        <div className="prog-empty">暂无天空竞技场数据</div>
      ) : (
        <div className="at-panel-root" data-testid="arena-town-panel">
          <div className="hw-hero-card at-hero-card">
            <div className="hw-hero-top">
              <div className="hw-hero-emblem at-hero-emblem">
                <T1Art kind="skills" id="sky_arena" className="hw-hero-core-icon" fallback="" alt="天空竞技场" />
              </div>
              <div className="hw-hero-copy at-hero-copy">
                <div className="ac-hero-title-row">
                  <span className="hw-hero-title" data-testid="arena-division-name">
                    天空竞技场 · {info.arena.division ? `${info.arena.division.name}段位` : '未定级'}
                  </span>
                  <span className="qm-equipped-pill" title="称号、勋章与城镇转生永久保留">转生保留</span>
                </div>
                <div className="ct-rep-progress-meta at-progress-meta">
                  <span>
                    {info.arena.seasonLabel} · 第 <strong data-testid="arena-rung">{info.arena.rung}</strong> / {info.arena.rungCount} 级 · 本季{' '}
                    {info.arena.seasonWins} 胜 {info.arena.seasonLosses} 负 · 生涯最高第 {info.arena.bestRung} 级
                  </span>
                  <span className="at-season-line">距赛季结算 {formatAcademyCountdown(seasonLeft)} · 挑战次数 {formatAcademyCountdown(dayLeft)}后重置</span>
                </div>
                <div className="ct-rep-bar at-progress-bar">
                  <div
                    className="ct-rep-bar-fill at-bar-fill"
                    style={{ width: `${Math.round((info.arena.rung / Math.max(1, info.arena.rungCount)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="ac-wallet-badges at-wallet-row">
              <span className="ac-wallet-badge at-attempt-badge">
                <T1Art kind="skills" id="sky_arena" className="ac-badge-icon" fallback="" alt="" />
                今日挑战：<strong data-testid="arena-attempts">{info.arena.attemptsLeft} / {info.arena.attemptsPerDay}</strong>
              </span>
              <span className="ac-wallet-badge at-medal-badge">
                <T1Art kind="skills" id="arena_medal" className="ac-badge-icon" fallback="" alt="" />
                竞技场勋章：<strong data-testid="arena-medals">{info.arena.medals}</strong>
              </span>
              <span className="ac-wallet-badge at-title-badge">
                <T1Art kind="skills" id="season_title" className="ac-badge-icon" fallback="" alt="" />
                称号：<strong data-testid="arena-best-title">{info.arena.bestTitle ? info.arena.bestTitle.name : '暂无'}</strong>
              </span>
              <span className="ac-wallet-badge at-town-badge">
                <T1Art kind="skills" id="guild_town" className="ac-badge-icon" fallback="" alt="" />
                繁荣度：<strong data-testid="town-prosperity">{info.town.prosperity.points}</strong> · {info.town.prosperity.name}
              </span>
            </div>

            <div className="hw-bonus-strip" data-testid="arena-town-bonuses">
              {bonusChips.length === 0 ? (
                <span className="at-chip muted">尚无永久加成 —— 赛季结算解锁称号，建造城镇设施点亮跨职业被动</span>
              ) : (
                bonusChips.map((c) => (
                  <span key={c} className="at-chip">
                    {c}
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="prog-filter-bar at-tab-bar">
            <button
              type="button"
              data-testid="arena-tab-ladder"
              className={`prog-filter-btn ${tab === 'arena' ? 'active' : ''}`}
              onClick={() => setTab('arena')}
            >
              竞技场排位{info.arena.canChallenge ? `（剩 ${info.arena.attemptsLeft} 次）` : ''}
            </button>
            <button
              type="button"
              data-testid="arena-tab-honors"
              className={`prog-filter-btn ${tab === 'honors' ? 'active' : ''}`}
              onClick={() => setTab('honors')}
            >
              赛季荣誉
            </button>
            <button
              type="button"
              data-testid="arena-tab-town"
              className={`prog-filter-btn ${tab === 'town' ? 'active' : ''}`}
              onClick={() => setTab('town')}
            >
              公会城镇{claimableChests + upgradable > 0 ? `（可建 ${upgradable}${claimableChests > 0 ? ` · 宝箱 ${claimableChests}` : ''}）` : ''}
            </button>
          </div>

          {tab === 'arena' && (
            <div className="at-arena-view">
              {next ? (
                <div
                  className={`at-champion-card division-${next.division} ${next.gatekeeper ? 'gatekeeper' : ''}`}
                  data-testid="arena-next-champion"
                >
                  <div className="at-champion-head">
                    <div className="at-champion-emblem">
                      <T1Art kind="skills" id={next.gatekeeper ? 'season_title' : 'sky_arena'} className="at-champion-icon" fallback="" alt="" />
                      <span className="at-rung-tag">第 {next.rung} 级</span>
                    </div>
                    <div className="at-champion-copy">
                      <div className="at-champion-name-row">
                        <strong data-testid="arena-champion-name">{next.name}</strong>
                        <span className={`at-division-tag division-${next.division}`}>{next.divisionName}</span>
                        <span className="at-style-tag">
                          {next.archetypeName} · {next.style}
                        </span>
                        {next.gatekeeper && <span className="at-gate-tag">段位守擂人</span>}
                      </div>
                      <div className="at-stat-compare">
                        <div className="at-stat-col">
                          <span className="at-stat-label">擂主</span>
                          <span>生命 {next.hp}</span>
                          <span>攻击 {next.atk}</span>
                          <span>防御 {next.def}</span>
                          <span>攻击间隔 {(next.attackIntervalMs / 1000).toFixed(1)} 秒</span>
                        </div>
                        {info.arena.buildStats && (
                          <div className="at-stat-col you">
                            <span className="at-stat-label">你的竞技构建</span>
                            <span>生命 {info.arena.buildStats.hp}</span>
                            <span>攻击 {info.arena.buildStats.atk}</span>
                            <span>防御 {info.arena.buildStats.def}</span>
                            <span>攻击间隔 {(info.arena.buildStats.intervalMs / 1000).toFixed(1)} 秒</span>
                          </div>
                        )}
                      </div>
                      {next.mechanicLabels.length > 0 && (
                        <div className="at-mech-row">
                          {next.mechanicLabels.map((m) => (
                            <span key={m.id} className="at-mech-chip" title={m.desc}>
                              {m.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={`at-preview-line tone-${arenaPreviewTone(next.preview)}`} data-testid="arena-preview">
                    {arenaPreviewText(next.preview)}
                  </div>
                  <div className="at-champion-foot">
                    <span className="at-reward">
                      <T1Art kind="ui" id="gold" className="ac-badge-icon" fallback="" alt="" />
                      胜利 +{next.gold} 金币 · 晋级第 {next.rung} 级
                    </span>
                    <button
                      type="button"
                      data-testid="arena-challenge-btn"
                      className={`prog-claim-btn af-action-btn at-challenge-btn ${next.preview && !next.preview.won ? 'risky' : ''}`}
                      disabled={!info.arena.canChallenge || Boolean(busyKey)}
                      onClick={handleChallenge}
                      title={next.preview && !next.preview.won ? '真实战斗引擎预演为落败：挑战仍会消耗 1 次今日次数' : undefined}
                    >
                      {busyKey === 'challenge'
                        ? '对决中…'
                        : !info.arena.canChallenge
                        ? info.arena.challengeBlock || '暂不可挑战'
                        : next.preview && !next.preview.won
                        ? `挑战第 ${next.rung} 级（预计落败）`
                        : `挑战第 ${next.rung} 级`}
                    </button>
                  </div>
                  <div className="at-rule-note">
                    预演与挑战都直接运行真实战斗引擎：满血入场，禁用料理 / 饮品与临时药剂增益，按你的装备、战斗技能、构筑、永久加成与技能栏对决，结果确定。
                  </div>
                </div>
              ) : (
                <div className="at-champion-card summit" data-testid="arena-next-champion">
                  <div className="at-champion-head">
                    <div className="at-champion-emblem">
                      <T1Art kind="skills" id="season_title" className="at-champion-icon" fallback="" alt="" />
                    </div>
                    <div className="at-champion-copy">
                      <strong>本赛季已登顶天空竞技场第 {info.arena.rungCount} 级</strong>
                      <span className="at-rule-note">月末赛季结算时发放天空王者段位勋章与称号。</span>
                    </div>
                  </div>
                </div>
              )}

              {(info.arena.lastDuel || lastLog.length > 0) && (
                <div className="at-duel-report" data-testid="arena-last-duel">
                  {info.arena.lastDuel && (
                    <div className={`at-duel-line ${info.arena.lastDuel.won ? 'won' : 'lost'}`}>
                      上一战：第 {info.arena.lastDuel.rung} 级「{info.arena.lastDuel.championName}」·{' '}
                      {info.arena.lastDuel.won ? '胜利' : info.arena.lastDuel.timeout ? '超时判负' : '落败'} · 用时{' '}
                      {formatDuelDuration(info.arena.lastDuel.durationMs)} · 剩余生命 {info.arena.lastDuel.playerHpLeft}/
                      {info.arena.lastDuel.playerMaxHp}
                      {info.arena.lastDuel.won ? ` · +${info.arena.lastDuel.gold} 金币` : ''}
                    </div>
                  )}
                  {lastLog.length > 0 && (
                    <ul className="at-duel-log">
                      {lastLog.map((line, i) => (
                        <li key={`${i}-${line}`}>{line}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {info.arena.upcoming.length > 1 && (
                <>
                  <div className="ac-rack-title">后续擂主（同一赛季恒定，下月 1 日换一批）</div>
                  <div className="at-upcoming-grid">
                    {info.arena.upcoming.slice(1).map((c) => (
                      <div key={c.rung} className={`at-upcoming-card division-${c.division}`} data-testid={`arena-upcoming-${c.rung}`}>
                        <div className="at-upcoming-head">
                          <span className="at-rung-tag small">第 {c.rung} 级</span>
                          <strong>{c.name}</strong>
                        </div>
                        <span className="at-upcoming-sub">
                          {c.divisionName} · {c.archetypeName} · 生命 {c.hp} · 攻击 {c.atk} · 防御 {c.def}
                        </span>
                        <span className={`at-preview-mini tone-${arenaPreviewTone(c.preview)}`}>{arenaPreviewText(c.preview)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="ac-rack-title">本季擂主梯队（每段 5 级，第 5 级为段位守擂人）</div>
              <div className="at-ladder" data-testid="arena-ladder">
                {info.arena.divisions.map((d) => (
                  <div key={d.id} className={`at-ladder-division division-${d.id} ${d.reached ? 'reached' : ''}`}>
                    <span className="at-ladder-name">{d.name}</span>
                    <div className="at-ladder-pips">
                      {info.arena.ladder
                        .filter((r) => r.division === d.id)
                        .map((r) => (
                          <span
                            key={r.rung}
                            className={`at-pip ${r.defeated ? 'done' : ''} ${r.current ? 'current' : ''} ${r.gatekeeper ? 'gate' : ''}`}
                            title={`第 ${r.rung} 级 · ${r.name}`}
                          >
                            {r.rung}
                          </span>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'honors' && (
            <div className="at-honors-view">
              <div className="at-settle-card" data-testid="arena-settlement-preview">
                <div className="at-settle-emblem">
                  <T1Art kind="skills" id="season_title" className="at-settle-icon" fallback="" alt="赛季称号" />
                </div>
                <div className="at-settle-copy">
                  <div className="at-settle-title">
                    {info.arena.seasonLabel}结算预估：{info.arena.settlementPreview.divisionName}
                    {info.arena.settlementPreview.division ? `（第 ${info.arena.settlementPreview.rung} 级）` : ''}
                  </div>
                  <div className="at-settle-meta">
                    {info.arena.settlementPreview.division
                      ? `月末结算可得竞技场勋章 ×${info.arena.settlementPreview.medals} 与赛季称号「${info.arena.settlementPreview.titleName}」（已拥有则只发勋章）。`
                      : '本赛季尚未击败任何擂主，结算时不发放奖励。'}
                    距结算 {formatAcademyCountdown(seasonLeft)}；结算后梯级归零，新一批擂主登场。
                  </div>
                </div>
              </div>

              {info.arena.lastSettlement && (
                <div className="at-settle-line" data-testid="arena-last-settlement">
                  <T1Art kind="skills" id="arena_medal" className="af-grad-icon" fallback="" alt="" />
                  <span>
                    上赛季（{info.arena.lastSettlement.seasonLabel}）：{info.arena.lastSettlement.divisionName}段位 · 第{' '}
                    {info.arena.lastSettlement.rung} 级 · 勋章 +{info.arena.lastSettlement.medals}
                    {info.arena.lastSettlement.newTitleName ? ` · 解锁称号「${info.arena.lastSettlement.newTitleName}」` : ''}
                  </span>
                </div>
              )}

              <div className="ac-rack-title">段位、勋章与赛季称号（称号转生永久保留，最高称号生效）</div>
              <div className="at-division-grid" data-testid="arena-divisions">
                {info.arena.divisions.map((d) => (
                  <div
                    key={d.id}
                    className={`at-division-card division-${d.id} ${d.titleOwned ? 'owned' : ''} ${
                      info.arena.bestTitle?.id === d.id ? 'active' : ''
                    }`}
                  >
                    <div className="at-division-head">
                      <T1Art kind="skills" id="season_title" className="at-division-icon" fallback="" alt="" />
                      <div>
                        <strong>{d.name}</strong>
                        <span className="at-division-range">
                          第 {d.minRung}~{d.maxRung} 级
                        </span>
                      </div>
                    </div>
                    <span className="at-division-medals">
                      <T1Art kind="skills" id="arena_medal" className="ac-badge-icon" fallback="" alt="" />
                      结算勋章 ×{d.medals}
                    </span>
                    <span className="at-division-title">称号「{d.titleName}」</span>
                    <span className="at-division-stats">{formatArenaTownStats(d.titleStats).join(' · ')}</span>
                    <span className="at-division-state">
                      {info.arena.bestTitle?.id === d.id ? '生效中' : d.titleOwned ? '已拥有' : d.reached ? '本季已达成，待结算' : '未达成'}
                    </span>
                  </div>
                ))}
              </div>
              <div className="at-medal-note">
                竞技场勋章 {info.arena.medals} 枚（生涯累计 {info.arena.totalMedalsEarned} 枚，已结算 {info.arena.seasonsSettled} 个赛季）——用于建造「荣耀演武场」Lv.3~5。
              </div>
            </div>
          )}

          {tab === 'town' && (
            <div className="at-town-view">
              <div className="at-town-hero" data-testid="town-hero">
                <div className="at-town-emblem">
                  <T1Art kind="skills" id="guild_town" className="at-town-icon" fallback="" alt="公会领地城镇" />
                </div>
                <div className="at-town-copy">
                  <div className="at-town-title" data-testid="town-prosperity-name">
                    {info.town.prosperity.name}
                    <span className="at-town-points">
                      繁荣度 {info.town.prosperity.points} / {info.town.prosperity.maxPoints}
                    </span>
                  </div>
                  <div className="ct-rep-bar at-town-bar">
                    <div className="ct-rep-bar-fill at-town-fill" style={{ width: `${info.town.prosperity.progressPct}%` }} />
                  </div>
                  <div className="at-town-meta">
                    {formatArenaTownStats(info.town.prosperity.stats).length > 0
                      ? `繁荣加成：${formatArenaTownStats(info.town.prosperity.stats).join(' · ')}`
                      : '繁荣加成：尚未生效'}
                    {info.town.prosperity.next
                      ? ` ｜ 「${info.town.prosperity.next.name}」需繁荣度 ${info.town.prosperity.next.minPoints}`
                      : ' ｜ 已达最高繁荣等级'}
                  </div>
                  <div className="at-town-meta muted">
                    <T1Art kind="skills" id="town_hall" className="ac-badge-icon" fallback="" alt="" />
                    议事厅 Lv.{hall?.level ?? 0}：其余设施最高可建至 Lv.{hall?.level ?? 0} · 累计建设 {info.town.totalUpgrades} 次 · 投入{' '}
                    {info.town.goldInvested} 金币
                  </div>
                </div>
              </div>

              <div className="ac-rack-title">城镇设施（金币 + 生活职业成品建造；设施等级不超过议事厅）</div>
              <div className="at-facility-grid">
                {info.town.facilities.map((f) => {
                  const cur = formatArenaTownStats(f.currentStats);
                  const nextStats = f.next ? formatArenaTownStats(f.next.stats) : [];
                  return (
                    <div
                      key={f.id}
                      data-testid={`town-facility-${f.id}`}
                      className={`at-facility-card fac-${f.id} ${f.canUpgrade ? 'ready' : 'blocked'} ${f.level >= f.maxLevel ? 'maxed' : ''}`}
                    >
                      <div className="at-facility-head">
                        <div className="at-facility-icon-frame">
                          <TownFacilityIcon facility={f} className="at-facility-icon" />
                        </div>
                        <div className="at-facility-title-col">
                          <div className="at-facility-name-row">
                            <strong>{f.name}</strong>
                            <span className="at-level-tag">
                              Lv.{f.level} / {f.maxLevel}
                            </span>
                          </div>
                          <span className="at-facility-sub">{f.subtitle}</span>
                        </div>
                      </div>
                      <p className="at-facility-desc">{f.description}</p>
                      <div className="at-facility-stats">
                        {f.id === 'town_hall'
                          ? `当前：其余设施上限 Lv.${f.level}`
                          : cur.length > 0
                          ? `当前：${cur.join(' · ')}`
                          : '当前：未建造'}
                        {f.next && (f.id === 'town_hall' ? ` ｜ 下一级：上限 Lv.${f.next.level}` : nextStats.length > 0 ? ` ｜ Lv.${f.next.level}：${nextStats.join(' · ')}` : '')}
                      </div>
                      {f.perks.length > 0 && f.id !== 'town_hall' && (
                        <div className="at-perk-list">
                          {f.perks.map((p) => (
                            <span key={p.level} className={`at-perk ${p.unlocked ? 'on' : ''}`}>
                              Lv.{p.level} {p.perk}
                            </span>
                          ))}
                        </div>
                      )}
                      {f.next && (
                        <div className="sf-cost-row">
                          {f.next.items.map((it) => (
                            <span key={it.itemId} className={`sf-cost-chip ${it.have >= it.qty ? 'ok' : 'short'}`}>
                              <T1ItemIcon itemId={it.itemId} className="ac-badge-icon" fallback="" alt="" />
                              {it.name} {it.have}/{it.qty}
                            </span>
                          ))}
                          {f.next.medals > 0 && (
                            <span className={`sf-cost-chip ${info.town.medals >= f.next.medals ? 'ok' : 'short'}`}>
                              <T1Art kind="skills" id="arena_medal" className="ac-badge-icon" fallback="" alt="" />
                              勋章 {info.town.medals}/{f.next.medals}
                            </span>
                          )}
                          <span className="sf-cost-chip ok">
                            <T1Art kind="ui" id="gold" className="ac-badge-icon" fallback="" alt="" />
                            {f.next.gold} 金币
                          </span>
                        </div>
                      )}
                      <button
                        type="button"
                        data-testid={`town-build-${f.id}`}
                        className="prog-claim-btn af-action-btn at-build-btn"
                        disabled={!f.canUpgrade || Boolean(busyKey)}
                        onClick={() => handleUpgrade(f)}
                      >
                        {busyKey === `build:${f.id}`
                          ? '施工中…'
                          : f.canUpgrade
                          ? f.level === 0
                            ? '建造'
                            : `升级至 Lv.${f.level + 1}`
                          : f.blockReason || '暂不可建造'}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="ac-rack-title">繁荣宝箱（每个繁荣等级首次达到可领一次）</div>
              <div className="at-chest-row" data-testid="town-chests">
                {info.town.chests.map((c) => (
                  <div key={c.tier} className={`at-chest-card ${c.claimed ? 'claimed' : c.reached ? 'ready' : 'locked'}`}>
                    <T1Art kind="skills" id="prosperity_chest" className="at-chest-icon" fallback="" alt="" />
                    <strong>{c.name}</strong>
                    <span className="at-chest-req">繁荣度 {c.minPoints}</span>
                    <span className="at-chest-reward">
                      {c.gold} 金币{c.items.length > 0 ? ` · ${c.items.map((it) => `${it.name}×${it.qty}`).join(' · ')}` : ''}
                    </span>
                    <button
                      type="button"
                      data-testid={`town-chest-${c.tier}`}
                      className="prog-claim-btn af-action-btn at-chest-btn"
                      disabled={!c.canClaim || Boolean(busyKey)}
                      onClick={() => handleChest(c.tier, c.name)}
                    >
                      {busyKey === `chest:${c.tier}` ? '开启中…' : c.claimed ? '已领取' : c.reached ? '领取' : '未达成'}
                    </button>
                  </div>
                ))}
              </div>
              {info.town.lastUpgrade && (
                <div className="at-medal-note" data-testid="town-last-upgrade">
                  最近建设：「{info.town.lastUpgrade.facilityName}」Lv.{info.town.lastUpgrade.level}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </PanelModal>
  );
}

/* ============================================================================
   契约魔兽牧场 & 天候观星占卜塔 (WL-14)
   ============================================================================ */

interface BeastCostItemView {
  itemId: string;
  name: string;
  qty: number;
  have: number;
}

interface ContractBeastView {
  id: ContractBeastId;
  name: string;
  title: string;
  role: BeastRoleId;
  roleName: string;
  artId: string;
  description: string;
  bossId: string;
  bossName: string;
  tamed: boolean;
  active: boolean;
  level: number;
  maxLevel: number;
  xp: number;
  levelXp: number;
  nextXp: number | null;
  progressPct: number;
  fed: number;
  tamedAt: string | null;
  favoriteFood: { itemId: string; name: string; have: number };
  currentStats: BeastWeatherStats;
  nextStats: BeastWeatherStats | null;
  lv1Stats: BeastWeatherStats;
  maxStats: BeastWeatherStats;
  tame: { gold: number; items: BeastCostItemView[]; canTame: boolean; blockReason: string | null };
}

interface WeatherOutputView {
  skillId: string;
  name: string;
  lane: 'gather' | 'craft';
  pct: number;
}

interface WeatherTypeView {
  id: WeatherId;
  name: string;
  short: string;
  weight: number;
  description: string;
  wishDust: number;
  outputs: WeatherOutputView[];
  chancePct: number;
  canWish: boolean;
  wishBlock: string | null;
}

interface BeastWeatherInfo {
  nowMs: number;
  bonuses: BeastRanchBonuses;
  weatherEffect: { active: boolean; dayKey: string; weather: WeatherId; name: string; outputs: WeatherOutputView[] };
  ranch: {
    beasts: ContractBeastView[];
    activeBeastId: ContractBeastId | null;
    foods: Array<{ itemId: string; name: string; xp: number; have: number }>;
    feedMaxQty: number;
    favoriteXpPct: number;
    bond: {
      totalLevels: number;
      maxLevels: number;
      tier: number;
      name: string;
      stats: BeastWeatherStats;
      next: { tier: number; name: string; minLevels: number; stats: BeastWeatherStats } | null;
      progressPct: number;
      tiers: Array<{ tier: number; name: string; minLevels: number; stats: BeastWeatherStats; reached: boolean }>;
    };
    totalTamed: number;
    totalFeedings: number;
    lastEvent: {
      kind: 'tame' | 'feed' | 'assign';
      beastId: ContractBeastId;
      beastName: string;
      level: number;
      foodId: string | null;
      foodName: string | null;
      qty: number;
      xpGained: number;
      at: string;
    } | null;
  };
  weather: {
    dayKey: string;
    dayEndsAtMs: number;
    tomorrowKey: string;
    today: {
      dayKey: string;
      weather: WeatherId;
      name: string;
      short: string;
      description: string;
      natural: WeatherId;
      wished: boolean;
      outputs: WeatherOutputView[];
    };
    tomorrow: {
      dayKey: string;
      divined: boolean;
      natural: WeatherId | null;
      naturalName: string | null;
      wish: WeatherId | null;
      wishName: string | null;
      chancePct: number;
      granted: boolean;
      final: WeatherId | null;
      finalName: string | null;
      outputs: WeatherOutputView[];
    };
    types: WeatherTypeView[];
    history: Array<{ dayKey: string; weather: WeatherId; wished: boolean; name: string; short: string }>;
    insight: {
      totalDivinations: number;
      tier: number;
      name: string;
      wishChancePct: number;
      auroraChancePct: number;
      next: { tier: number; name: string; minDivinations: number; wishChancePct: number } | null;
      progressPct: number;
    };
    dust: number;
    divineDust: number;
    canDivine: boolean;
    divineBlock: string | null;
    wishChanceCap: number;
    totalDivinations: number;
    totalWishes: number;
    wishesGranted: number;
    dustSpent: number;
  };
}

/** 天候产出加成 → 展示条目（星辉极光这类「全部生活职业同幅提升」合并成一条）。 */
function compactWeatherOutputs(outputs: WeatherOutputView[]): Array<{ key: string; label: string; lane: string }> {
  if (outputs.length === WEATHER_LIFE_SKILLS.length && outputs.every((o) => o.pct === outputs[0].pct)) {
    return [{ key: 'all', label: `全部生活职业 +${outputs[0].pct}%`, lane: 'all' }];
  }
  return outputs.map((o) => ({ key: o.skillId, label: `${o.name} +${o.pct}%`, lane: o.lane }));
}

function weatherOutputText(outputs: WeatherOutputView[]): string {
  const list = compactWeatherOutputs(outputs);
  return list.length > 0 ? list.map((o) => o.label).join(' · ') : '无产出加成';
}

export function BeastWeatherPanel({ onClose, onChange }: { onClose: () => void; onChange?: () => void }) {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [info, setInfo] = useState<BeastWeatherInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'ranch' | 'weather'>('ranch');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [feedBeastId, setFeedBeastId] = useState<ContractBeastId | null>(null);
  const [feedFoodId, setFeedFoodId] = useState<string | null>(null);
  const [feedQty, setFeedQty] = useState(1);
  // 服务器时钟偏移：换日倒计时按「服务器 nowMs + 本地流逝」推算，每 30 秒刷新一次
  const [clientAnchor, setClientAnchor] = useState(() => Date.now());
  const [tick, setTick] = useState(() => Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      apiClient.clearCache();
      const res: any = await apiClient.getBeastWeather();
      setInfo(res);
      setClientAnchor(Date.now());
      return res as BeastWeatherInfo;
    } catch (e: any) {
      toastRef.current.error(e?.message || '加载契约魔兽牧场与观星塔失败');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const t = window.setInterval(() => setTick(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const applyInfo = (res: any) => {
    if (res?.ranch?.ranch) {
      setInfo(res.ranch);
      setClientAnchor(Date.now());
    }
  };

  const runAction = async (key: string, call: () => Promise<any>, onOk: (res: any) => void, failText: string) => {
    setBusyKey(key);
    try {
      const res: any = await call();
      if (res?.ranch) applyInfo(res);
      else await load();
      onOk(res);
      onChange?.();
    } catch (e: any) {
      toastRef.current.error(e?.message || failText);
      await load();
    } finally {
      setBusyKey(null);
    }
  };

  const handleTame = (b: ContractBeastView) =>
    runAction(
      `tame:${b.id}`,
      () => apiClient.tameContractBeast({ beastId: b.id }),
      (res) => {
        toastRef.current.success(`契约缔结！「${b.name}」加入牧场${res?.tame?.autoAssigned ? '并出战' : ''}`);
        setFeedBeastId(b.id);
      },
      '驯服契约魔兽失败'
    );

  const handleAssign = (beastId: ContractBeastId | null, name: string) =>
    runAction(
      `assign:${beastId ?? 'none'}`,
      () => apiClient.assignBeastCompanion({ beastId }),
      () => toastRef.current.success(beastId ? `「${name}」出战！` : `「${name}」回到牧场休息`),
      '指派出战伙伴失败'
    );

  const handleDivine = () =>
    runAction(
      'divine',
      () => apiClient.divineTomorrowWeather({ dayKey: info?.weather.tomorrowKey }),
      (res) => {
        const d = res?.ranch?.weather?.tomorrow;
        toastRef.current.success(d?.naturalName ? `星象显示：明日「${d.naturalName}」` : '占卜完成');
      },
      '占卜明日天候失败'
    );

  const handleWish = (w: WeatherTypeView) =>
    runAction(
      `wish:${w.id}`,
      () => apiClient.wishTomorrowWeather({ weather: w.id, dayKey: info?.weather.tomorrowKey }),
      (res) => {
        const r = res?.wish;
        if (r?.granted) toastRef.current.success(`祈愿应验！明日将是「${w.name}」`);
        else toastRef.current.info(`祈愿「${w.name}」未能应验（${r?.chancePct ?? w.chancePct}%）`);
      },
      '祈愿失败'
    );

  const serverNow = info ? info.nowMs + Math.max(0, tick - clientAnchor) : 0;
  const dayLeft = info ? Math.max(0, info.weather.dayEndsAtMs - serverNow) : 0;
  const bonusChips = info ? formatBeastWeatherStats(info.bonuses) : [];
  const tamedBeasts = info ? info.ranch.beasts.filter((b) => b.tamed) : [];
  const active = info?.ranch.beasts.find((b) => b.active) ?? null;
  const feedBeast =
    tamedBeasts.find((b) => b.id === feedBeastId) ??
    (active && active.level < active.maxLevel ? active : null) ??
    tamedBeasts.find((b) => b.level < b.maxLevel) ??
    tamedBeasts[0] ??
    null;
  const foodsInBag = info ? info.ranch.foods.filter((f) => f.have > 0) : [];
  const feedFood =
    foodsInBag.find((f) => f.itemId === feedFoodId) ??
    (feedBeast ? foodsInBag.find((f) => f.itemId === feedBeast.favoriteFood.itemId) : undefined) ??
    foodsInBag[foodsInBag.length - 1] ??
    null;
  const fullPlan = feedBeast && feedFood ? planBeastFeed(feedBeast.id, feedBeast.xp, feedFood.itemId, info?.ranch.feedMaxQty ?? 50) : null;
  const maxQty = fullPlan && fullPlan.ok && feedFood ? Math.max(1, Math.min(feedFood.have, fullPlan.qtyUsed)) : 1;
  const qty = Math.min(Math.max(1, feedQty), maxQty);
  const plan = feedBeast && feedFood ? planBeastFeed(feedBeast.id, feedBeast.xp, feedFood.itemId, qty) : null;
  const tameReady = info ? info.ranch.beasts.filter((b) => b.tame.canTame).length : 0;
  const tomorrow = info?.weather.tomorrow;

  const handleFeed = () => {
    if (!feedBeast || !feedFood || !plan?.ok) return;
    const beastName = feedBeast.name;
    return runAction(
      `feed:${feedBeast.id}`,
      () => apiClient.feedContractBeast({ beastId: feedBeast.id, foodId: feedFood.itemId, qty }),
      (res) => {
        const r = res?.feed;
        toastRef.current.success(
          `「${beastName}」喂养经验 +${r?.xpGained ?? plan.xpGained}${r && r.levelAfter > r.levelBefore ? `，成长至 Lv.${r.levelAfter}！` : ''}`
        );
        setFeedQty(1);
      },
      '喂养失败'
    );
  };

  return (
    <PanelModal
      title="契约魔兽牧场与天候观星塔"
      icon={<T1Art kind="skills" id="beast_ranch" className="hw-modal-title-icon" fallback="" alt="" />}
      onClose={onClose}
    >
      {loading && !info ? (
        <div className="prog-empty">正在清点牧场、登上观星塔…</div>
      ) : !info ? (
        <div className="prog-empty">暂无契约魔兽牧场数据</div>
      ) : (
        <div className="bw-panel-root" data-testid="beast-weather-panel">
          <div className="hw-hero-card bw-hero-card">
            <div className="hw-hero-top">
              <div className="hw-hero-emblem bw-hero-emblem">
                <T1Art kind="skills" id="beast_ranch" className="hw-hero-core-icon" fallback="" alt="契约魔兽牧场" />
              </div>
              <div className="bw-hero-copy">
                <div className="ac-hero-title-row">
                  <span className="hw-hero-title" data-testid="ranch-bond-name">
                    契约魔兽牧场 · {info.ranch.bond.name}
                  </span>
                  <span className="qm-equipped-pill" title="魔兽、等级与观星阅历转生永久保留">转生保留</span>
                </div>
                <div className="bw-hero-meta">
                  <span>
                    已驯服 <strong data-testid="ranch-tamed-count">{tamedBeasts.length}</strong> / {info.ranch.beasts.length} 只 · 羁绊等级{' '}
                    {info.ranch.bond.totalLevels} / {info.ranch.bond.maxLevels}
                    {info.ranch.bond.next
                      ? ` · 距「${info.ranch.bond.next.name}」还差 ${info.ranch.bond.next.minLevels - info.ranch.bond.totalLevels} 级`
                      : ' · 羁绊已满'}
                  </span>
                  <span className="bw-weather-line" data-testid="weather-today-line">
                    今日 {formatWeatherDayLabel(info.weather.today.dayKey)} · {info.weather.today.name}
                    {info.weather.today.wished ? '（祈愿应验）' : ''} · {formatAcademyCountdown(dayLeft)}后换日
                  </span>
                </div>
                <div className="ct-rep-bar bw-bond-bar">
                  <div className="ct-rep-bar-fill bw-bond-fill" style={{ width: `${info.ranch.bond.progressPct}%` }} />
                </div>
              </div>
            </div>

            <div className="ac-wallet-badges bw-wallet-row">
              <span className="ac-wallet-badge bw-companion-badge">
                <T1Art kind="skills" id="contract_seal" className="ac-badge-icon" fallback="" alt="" />
                出战：<strong data-testid="ranch-active-beast">{active ? `${active.name} Lv.${active.level}` : '未指派'}</strong>
              </span>
              <span className="ac-wallet-badge bw-dust-badge">
                <T1Art kind="skills" id="star_dust_vial" className="ac-badge-icon" fallback="" alt="" />
                星晶尘：<strong data-testid="weather-dust">{info.weather.dust}</strong>
              </span>
              <span className="ac-wallet-badge bw-today-badge">
                <T1Art kind="skills" id="weather_orb" className="ac-badge-icon" fallback="" alt="" />
                今日：<strong data-testid="weather-today-name">{info.weather.today.name}</strong>
              </span>
              <span className="ac-wallet-badge bw-insight-badge">
                <T1Art kind="skills" id="weather_tower" className="ac-badge-icon" fallback="" alt="" />
                {info.weather.insight.name} · 祈愿 <strong data-testid="weather-wish-chance">{info.weather.insight.wishChancePct}%</strong>
              </span>
            </div>

            <div className="hw-bonus-strip" data-testid="beast-weather-bonuses">
              {bonusChips.length === 0 && info.weatherEffect.outputs.length === 0 ? (
                <span className="bw-chip muted">尚无加成 —— 驯服契约魔兽并指派出战，或等待有利的天候</span>
              ) : (
                <>
                  {bonusChips.map((c) => (
                    <span key={c} className="bw-chip">
                      {c}
                    </span>
                  ))}
                  {info.weatherEffect.outputs.length > 0 && (
                    <span className="bw-chip weather">
                      {info.weatherEffect.name}产出：{weatherOutputText(info.weatherEffect.outputs)}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="prog-filter-bar bw-tab-bar">
            <button
              type="button"
              data-testid="beast-tab-ranch"
              className={`prog-filter-btn ${tab === 'ranch' ? 'active' : ''}`}
              onClick={() => setTab('ranch')}
            >
              契约牧场{tameReady > 0 ? `（可驯服 ${tameReady}）` : ''}
            </button>
            <button
              type="button"
              data-testid="beast-tab-weather"
              className={`prog-filter-btn ${tab === 'weather' ? 'active' : ''}`}
              onClick={() => setTab('weather')}
            >
              天候观星塔{info.weather.canDivine ? '（可占卜）' : tomorrow && tomorrow.divined && !tomorrow.wish ? '（可祈愿）' : ''}
            </button>
          </div>

          {tab === 'ranch' && (
            <div className="bw-ranch-view">
              <div className="ac-rack-title">契约魔兽（首领真实掉落 + 料理驯服；同一时间一只出战，职能加成按等级成长）</div>
              <div className="bw-beast-grid">
                {info.ranch.beasts.map((b) => {
                  const cur = formatBeastWeatherStats(b.currentStats);
                  const nextStats = b.nextStats ? formatBeastWeatherStats(b.nextStats) : [];
                  return (
                    <div
                      key={b.id}
                      data-testid={`beast-card-${b.id}`}
                      className={`bw-beast-card role-${b.role} ${b.tamed ? 'tamed' : 'wild'} ${b.active ? 'active' : ''}`}
                    >
                      <div className="bw-beast-head">
                        <div className="bw-beast-portrait">
                          <T1Art kind="monster" id={b.artId} className="bw-beast-art" fallback="" alt={b.name} />
                          {b.tamed && <span className="bw-level-tag">Lv.{b.level}</span>}
                        </div>
                        <div className="bw-beast-title-col">
                          <div className="bw-beast-name-row">
                            <strong>{b.name}</strong>
                            <span className={`bw-role-tag role-${b.role}`}>{b.roleName}</span>
                            {b.active && <span className="bw-active-tag">出战中</span>}
                          </div>
                          <span className="bw-beast-sub">{b.title}</span>
                          {b.tamed ? (
                            <>
                              <div className="ct-rep-bar bw-xp-bar">
                                <div className="ct-rep-bar-fill bw-xp-fill" style={{ width: `${b.progressPct}%` }} />
                              </div>
                              <span className="bw-xp-text">
                                {b.nextXp === null ? `满级 · 喂养经验 ${b.xp}` : `喂养经验 ${b.xp} / ${b.nextXp}`}
                              </span>
                            </>
                          ) : (
                            <span className="bw-beast-sub muted">信物来源：{b.bossName}</span>
                          )}
                        </div>
                      </div>
                      <p className="bw-beast-desc">{b.description}</p>
                      <div className="bw-beast-stats">
                        {b.tamed
                          ? `当前：${cur.join(' · ') || '—'}${nextStats.length > 0 ? ` ｜ Lv.${b.level + 1}：${nextStats.join(' · ')}` : ''}`
                          : `Lv.1：${formatBeastWeatherStats(b.lv1Stats).join(' · ')} ｜ Lv.${b.maxLevel}：${formatBeastWeatherStats(b.maxStats).join(' · ')}`}
                      </div>
                      <div className="bw-beast-fav">
                        <T1ItemIcon itemId={b.favoriteFood.itemId} className="ac-badge-icon" fallback="" alt="" />
                        偏好：{b.favoriteFood.name} · 经验 ×{info.ranch.favoriteXpPct / 100}
                      </div>
                      {b.tamed ? (
                        <div className="bw-beast-actions">
                          <button
                            type="button"
                            data-testid={`beast-feed-pick-${b.id}`}
                            className={`prog-filter-btn bw-pick-btn ${feedBeast?.id === b.id ? 'active' : ''}`}
                            disabled={b.level >= b.maxLevel}
                            onClick={() => {
                              setFeedBeastId(b.id);
                              setFeedQty(1);
                            }}
                          >
                            {b.level >= b.maxLevel ? '已满级' : feedBeast?.id === b.id ? '喂养中' : '去喂养'}
                          </button>
                          <button
                            type="button"
                            data-testid={`beast-assign-${b.id}`}
                            className="prog-claim-btn af-action-btn bw-assign-btn"
                            disabled={Boolean(busyKey)}
                            onClick={() => handleAssign(b.active ? null : b.id, b.name)}
                          >
                            {busyKey === `assign:${b.active ? 'none' : b.id}` ? '指派中…' : b.active ? '召回休息' : '指派出战'}
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="sf-cost-row">
                            {b.tame.items.map((it) => (
                              <span key={it.itemId} className={`sf-cost-chip ${it.have >= it.qty ? 'ok' : 'short'}`}>
                                <T1ItemIcon itemId={it.itemId} className="ac-badge-icon" fallback="" alt="" />
                                {it.name} {it.have}/{it.qty}
                              </span>
                            ))}
                            <span className="sf-cost-chip ok">
                              <T1Art kind="ui" id="gold" className="ac-badge-icon" fallback="" alt="" />
                              {b.tame.gold} 金币
                            </span>
                          </div>
                          <button
                            type="button"
                            data-testid={`beast-tame-${b.id}`}
                            className="prog-claim-btn af-action-btn bw-tame-btn"
                            disabled={!b.tame.canTame || Boolean(busyKey)}
                            onClick={() => handleTame(b)}
                          >
                            <T1Art kind="skills" id="contract_seal" className="ac-badge-icon" fallback="" alt="" />
                            {busyKey === `tame:${b.id}` ? '缔结中…' : b.tame.canTame ? '缔结契约' : b.tame.blockReason || '暂不可驯服'}
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="bw-feed-station" data-testid="beast-feed-station">
                <div className="bw-feed-head">
                  <div className="bw-feed-emblem">
                    <T1Art kind="skills" id="beast_feed" className="bw-feed-icon" fallback="" alt="喂养台" />
                  </div>
                  <div className="bw-feed-copy">
                    <strong>喂养台</strong>
                    <span className="bw-rule-note">
                      投喂背包里的真实料理获得喂养经验；偏好料理经验 ×{info.ranch.favoriteXpPct / 100}，只扣到满级所需的份数。
                    </span>
                  </div>
                </div>
                {tamedBeasts.length === 0 ? (
                  <div className="bw-empty">牧场里还没有契约魔兽 —— 先用首领掉落缔结契约吧。</div>
                ) : (
                  <>
                    <div className="bw-feed-beasts">
                      {tamedBeasts.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          data-testid={`beast-feed-target-${b.id}`}
                          className={`bw-feed-beast ${feedBeast?.id === b.id ? 'selected' : ''}`}
                          onClick={() => {
                            setFeedBeastId(b.id);
                            setFeedQty(1);
                          }}
                        >
                          <T1Art kind="monster" id={b.artId} className="ac-badge-icon" fallback="" alt="" />
                          {b.name} Lv.{b.level}
                        </button>
                      ))}
                    </div>
                    {foodsInBag.length === 0 ? (
                      <div className="bw-empty">背包里没有可喂养的料理 —— 去烹饪页做些简单料理、灵面包或更高级的菜肴吧。</div>
                    ) : (
                      <div className="bw-food-grid">
                        {foodsInBag.map((f) => {
                          const fav = feedBeast?.favoriteFood.itemId === f.itemId;
                          return (
                            <button
                              key={f.itemId}
                              type="button"
                              data-testid={`beast-food-${f.itemId}`}
                              className={`bw-food-chip ${feedFood?.itemId === f.itemId ? 'selected' : ''} ${fav ? 'favorite' : ''}`}
                              onClick={() => {
                                setFeedFoodId(f.itemId);
                                setFeedQty(1);
                              }}
                            >
                              <T1ItemIcon itemId={f.itemId} className="bw-food-icon" fallback="" alt="" />
                              <span className="bw-food-name">{f.name}</span>
                              <span className="bw-food-meta">
                                ×{f.have} · +{fav ? Math.floor((f.xp * info.ranch.favoriteXpPct) / 100) : f.xp}/份{fav ? ' · 偏好' : ''}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {feedBeast && feedFood && (
                      <div className="bw-feed-foot">
                        <div className="bw-qty-row">
                          {[1, 5, 10].map((n) => (
                            <button
                              key={n}
                              type="button"
                              data-testid={`beast-feed-qty-${n}`}
                              className={`prog-filter-btn bw-qty-btn ${qty === n ? 'active' : ''}`}
                              disabled={n > maxQty}
                              onClick={() => setFeedQty(n)}
                            >
                              ×{n}
                            </button>
                          ))}
                          <button
                            type="button"
                            data-testid="beast-feed-max"
                            className={`prog-filter-btn bw-qty-btn ${qty === maxQty && maxQty > 10 ? 'active' : ''}`}
                            onClick={() => setFeedQty(maxQty)}
                          >
                            最多 ×{maxQty}
                          </button>
                        </div>
                        <span className="bw-feed-preview" data-testid="beast-feed-preview">
                          {plan && plan.ok
                            ? `喂「${feedBeast.name}」${feedFood.name}×${plan.qtyUsed}：喂养经验 +${plan.xpGained}${
                                plan.levelAfter > plan.levelBefore ? `，Lv.${plan.levelBefore} → Lv.${plan.levelAfter}` : ''
                              }`
                            : `「${feedBeast.name}」已满级`}
                        </span>
                        <button
                          type="button"
                          data-testid="beast-feed-btn"
                          className="prog-claim-btn af-action-btn bw-feed-btn"
                          disabled={!plan?.ok || Boolean(busyKey)}
                          onClick={handleFeed}
                        >
                          <T1Art kind="skills" id="beast_feed" className="ac-badge-icon" fallback="" alt="" />
                          {busyKey === `feed:${feedBeast.id}` ? '喂养中…' : '喂养'}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="ac-rack-title">牧场羁绊（全部魔兽等级之和，不论是否出战都生效）</div>
              <div className="bw-bond-row" data-testid="ranch-bond-tiers">
                {info.ranch.bond.tiers.map((t) => (
                  <div key={t.tier} className={`bw-bond-card ${t.reached ? 'reached' : ''} ${info.ranch.bond.tier === t.tier ? 'current' : ''}`}>
                    <strong>{t.name}</strong>
                    <span className="bw-bond-req">等级之和 {t.minLevels}</span>
                    <span className="bw-bond-stats">{formatBeastWeatherStats(t.stats).join(' · ')}</span>
                  </div>
                ))}
              </div>
              {info.ranch.lastEvent && (
                <div className="bw-note" data-testid="ranch-last-event">
                  最近：
                  {info.ranch.lastEvent.kind === 'tame'
                    ? `驯服「${info.ranch.lastEvent.beastName}」`
                    : info.ranch.lastEvent.kind === 'feed'
                    ? `喂给「${info.ranch.lastEvent.beastName}」${info.ranch.lastEvent.foodName}×${info.ranch.lastEvent.qty}（经验 +${info.ranch.lastEvent.xpGained}，Lv.${info.ranch.lastEvent.level}）`
                    : `「${info.ranch.lastEvent.beastName}」出战`}{' '}
                  · 累计驯服 {info.ranch.totalTamed} 只、喂养 {info.ranch.totalFeedings} 份
                </div>
              )}
            </div>
          )}

          {tab === 'weather' && tomorrow && (
            <div className="bw-weather-view">
              <div className="bw-sky-row">
                <div className={`bw-sky-card today weather-${info.weather.today.weather}`} data-testid="weather-today-card">
                  <div className="bw-sky-emblem">
                    <T1Art kind="skills" id="weather_orb" className="bw-sky-icon" fallback="" alt="今日天候" />
                  </div>
                  <div className="bw-sky-copy">
                    <span className="bw-sky-label">今日 · {formatWeatherDayLabel(info.weather.today.dayKey)}</span>
                    <strong className="bw-sky-name">
                      {info.weather.today.name}
                      {info.weather.today.wished && <span className="bw-wished-tag">祈愿应验</span>}
                    </strong>
                    <span className="bw-sky-desc">{info.weather.today.description}</span>
                    <div className="bw-output-row">
                      {compactWeatherOutputs(info.weather.today.outputs).map((o) => (
                        <span key={o.key} className={`bw-output-chip lane-${o.lane}`}>
                          {o.label}
                        </span>
                      ))}
                    </div>
                    <span className="bw-rule-note">距换日 {formatAcademyCountdown(dayLeft)}（东八区每日 0 点）</span>
                  </div>
                </div>

                <div
                  className={`bw-sky-card tomorrow ${tomorrow.final ? `weather-${tomorrow.final}` : 'unknown'}`}
                  data-testid="weather-tomorrow-card"
                >
                  <div className="bw-sky-emblem">
                    <T1Art kind="skills" id="weather_tower" className="bw-sky-icon" fallback="" alt="观星塔" />
                  </div>
                  <div className="bw-sky-copy">
                    <span className="bw-sky-label">明日 · {formatWeatherDayLabel(tomorrow.dayKey)}</span>
                    {tomorrow.divined ? (
                      <>
                        <strong className="bw-sky-name" data-testid="weather-tomorrow-name">
                          {tomorrow.finalName}
                          {tomorrow.wish && (
                            <span className={`bw-wished-tag ${tomorrow.granted ? '' : 'missed'}`}>
                              {tomorrow.granted ? `祈愿应验（${tomorrow.chancePct}%）` : `祈愿「${tomorrow.wishName}」未应验`}
                            </span>
                          )}
                        </strong>
                        <span className="bw-sky-desc">
                          星象所示天然天候：{tomorrow.naturalName}
                          {tomorrow.wish ? '' : ' —— 可以消耗星晶尘祈愿，把明日偏向你想要的天候。'}
                        </span>
                        <div className="bw-output-row">
                          {compactWeatherOutputs(tomorrow.outputs).map((o) => (
                            <span key={o.key} className={`bw-output-chip lane-${o.lane}`}>
                              {o.label}
                            </span>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <strong className="bw-sky-name" data-testid="weather-tomorrow-name">
                          星象未明
                        </strong>
                        <span className="bw-sky-desc">
                          消耗 {info.weather.divineDust} 异域星晶尘占卜明日的天然天候（每个东八区日 1 次），之后可以祈愿偏转。
                        </span>
                      </>
                    )}
                    <button
                      type="button"
                      data-testid="weather-divine-btn"
                      className="prog-claim-btn af-action-btn bw-divine-btn"
                      disabled={!info.weather.canDivine || Boolean(busyKey)}
                      onClick={handleDivine}
                    >
                      <T1Art kind="skills" id="star_dust_vial" className="ac-badge-icon" fallback="" alt="" />
                      {busyKey === 'divine'
                        ? '观星中…'
                        : info.weather.canDivine
                        ? `占卜明日（${info.weather.divineDust} 星晶尘）`
                        : info.weather.divineBlock || '暂不可占卜'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="ac-rack-title">
                祈愿明日天候（成功率由观星阅历决定，封顶 {info.weather.wishChanceCap}%，星辉极光减半；每日 1 次，确定性判定）
              </div>
              <div className="bw-wish-grid" data-testid="weather-wish-grid">
                {info.weather.types.map((w) => (
                  <div
                    key={w.id}
                    data-testid={`weather-type-${w.id}`}
                    className={`bw-wish-card weather-${w.id} ${tomorrow.final === w.id ? 'chosen' : ''}`}
                  >
                    <div className="bw-wish-head">
                      <T1Art kind="skills" id="weather_orb" className="bw-wish-icon" fallback="" alt="" />
                      <strong>{w.name}</strong>
                      <span className="bw-weight-tag">出现 {w.weight}%</span>
                    </div>
                    <span className="bw-wish-outputs">{weatherOutputText(w.outputs)}</span>
                    <span className="bw-wish-cost">
                      <T1Art kind="skills" id="star_dust_vial" className="ac-badge-icon" fallback="" alt="" />
                      祈愿消耗 {w.wishDust} 星晶尘
                    </span>
                    <button
                      type="button"
                      data-testid={`weather-wish-${w.id}`}
                      className="prog-claim-btn af-action-btn bw-wish-btn"
                      disabled={!w.canWish || Boolean(busyKey)}
                      onClick={() => handleWish(w)}
                    >
                      {busyKey === `wish:${w.id}`
                        ? '祈愿中…'
                        : w.canWish
                        ? `祈愿 ${w.chancePct}%`
                        : w.wishBlock || '暂不可祈愿'}
                    </button>
                  </div>
                ))}
              </div>

              <div className="bw-insight-card" data-testid="weather-insight">
                <T1Art kind="skills" id="weather_tower" className="bw-insight-icon" fallback="" alt="" />
                <div className="bw-insight-copy">
                  <strong>
                    观星阅历：{info.weather.insight.name}（累计占卜 {info.weather.insight.totalDivinations} 次）
                  </strong>
                  <div className="ct-rep-bar bw-insight-bar">
                    <div className="ct-rep-bar-fill bw-insight-fill" style={{ width: `${info.weather.insight.progressPct}%` }} />
                  </div>
                  <span className="bw-rule-note">
                    祈愿成功率 {info.weather.insight.wishChancePct}%（星辉极光 {info.weather.insight.auroraChancePct}%）
                    {info.weather.insight.next
                      ? ` · 累计占卜 ${info.weather.insight.next.minDivinations} 次晋升「${info.weather.insight.next.name}」（${info.weather.insight.next.wishChancePct}%）`
                      : ' · 已达最高阅历'}{' '}
                    · 祈愿 {info.weather.totalWishes} 次、应验 {info.weather.wishesGranted} 次 · 共消耗星晶尘 {info.weather.dustSpent}
                  </span>
                </div>
              </div>

              {info.weather.history.length > 0 && (
                <>
                  <div className="ac-rack-title">近 7 日天候</div>
                  <div className="bw-history-row" data-testid="weather-history">
                    {info.weather.history.map((h) => (
                      <div key={h.dayKey} className={`bw-history-chip weather-${h.weather}`} title={h.name}>
                        <span className="bw-history-day">{formatWeatherDayLabel(h.dayKey)}</span>
                        <strong>{h.short}</strong>
                        {h.wished && <span className="bw-history-wish">祈愿</span>}
                      </div>
                    ))}
                  </div>
                </>
              )}
              <div className="bw-rule-note">
                天候由东八区日期确定性生成、全服一致；登临观星塔后，当天天候的产出加成直接计入对应生活职业的效率（多完成一次 = 多一份产出）。异域星晶尘来自远征商队与遗迹勘探。
              </div>
            </div>
          )}
        </div>
      )}
    </PanelModal>
  );
}

/* ============================================================================
   吟游诗人酒馆 & 冒险者编年史 (WL-15)
   ============================================================================ */

interface TavernMenuView {
  itemId: string;
  name: string;
  kind: 'dish' | 'drink';
  fame: number;
  have: number;
}

interface TavernVisitorView {
  id: TavernVisitorId;
  name: string;
  title: string;
  avatarId: string;
  quote: string;
  tipPerFame: number;
  order: { dish: TavernMenuView; drink: TavernMenuView };
  likes: { dishes: string[]; drinks: string[] };
  perfectFame: number;
  served: boolean;
  record: {
    dishId: string | null;
    drinkId: string | null;
    dishName: string | null;
    drinkName: string | null;
    matchedDish: boolean;
    matchedDrink: boolean;
    fame: number;
    tipGold: number;
    at: string;
  } | null;
}

interface TavernBalladView {
  id: TavernBalladId;
  name: string;
  description: string;
  minFameTier: number;
  minFameName: string;
  costGold: number;
  durationMin: number;
  fame: number;
  stats: TavernChronicleStats;
  unlocked: boolean;
  canRequest: boolean;
  block: string | null;
}

interface ChronicleChapterView {
  id: ChronicleChapterId;
  name: string;
  title: string;
  description: string;
  stats: TavernChronicleStats;
  entries: Array<{
    metric: string;
    label: string;
    target: number;
    value: number;
    done: boolean;
    pct: number;
    metricName: string;
    source: string;
  }>;
  complete: boolean;
  inscribed: boolean;
  inscribedAt: string | null;
  canInscribe: boolean;
  equipped: boolean;
}

interface TavernChronicleInfo {
  nowMs: number;
  bonuses: TavernChronicleBonuses;
  ballad: {
    balladId: TavernBalladId | null;
    active: boolean;
    startedAtMs: number;
    endsAtMs: number;
    remainingMs: number;
    stats: TavernChronicleStats;
    name: string | null;
  };
  tavern: {
    dayKey: string;
    dayEndsAtMs: number;
    visitors: TavernVisitorView[];
    tomorrowVisitors: Array<{ id: TavernVisitorId; name: string; title: string; avatarId: string }>;
    servedToday: number;
    visitorsPerDay: number;
    menu: TavernMenuView[];
    matchPct: number;
    perfectBonus: number;
    ballads: TavernBalladView[];
    balladsToday: number;
    balladsPerDay: number;
    fame: {
      total: number;
      tier: number;
      name: string;
      stats: TavernChronicleStats;
      next: { tier: number; name: string; minFame: number; stats: TavernChronicleStats } | null;
      progressPct: number;
      tiers: Array<{ tier: number; name: string; minFame: number; stats: TavernChronicleStats; reached: boolean }>;
    };
    gold: number;
    totalServed: number;
    totalPerfect: number;
    totalBallads: number;
    tipsEarned: number;
  };
  chronicle: {
    chapters: ChronicleChapterView[];
    inscribedCount: number;
    completeCount: number;
    chapterCount: number;
    entriesDone: number;
    entriesTotal: number;
    equippedTitle: ChronicleChapterId | null;
    equippedTitleName: string | null;
    lastInscription: { chapterId: ChronicleChapterId; at: string; name: string } | null;
  };
}

/** 「2026-11-18T…」→「11 月 18 日」。 */
function chronicleDateLabel(iso: string | null): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${Number(m[2])} 月 ${Number(m[3])} 日` : '';
}

/**
 * 酒馆面板的八个分页：WL-15 酒馆 / 编年史 + WL-16 飞艇商路 / 荣誉试炼 + WL-17 矮人矿脉 / 精灵驿站
 * + WL-18 遗迹潜航 / 公会战（并入既有面板，顶栏不再加胶囊）。
 */
export type TavernPanelTab = 'tavern' | 'chronicle' | 'airship' | 'trial' | 'mine' | 'waystation' | 'dive' | 'guildwar';

/** 面板标题显示当前分页的完整名称；分页按钮只用短名，英雄卡不再重复设施名。 */
const TAVERN_TAB_TITLES: Record<TavernPanelTab, string> = {
  tavern: '吟游诗人酒馆',
  chronicle: '冒险者编年史',
  airship: '浮空飞艇商路',
  trial: '圣骑士团荣誉试炼',
  mine: '矮人地底矿脉',
  waystation: '精灵林地驿站',
  dive: '深海遗迹潜航',
  guildwar: '冒险者行会公会战',
};

export function BardTavernChroniclePanel({
  onClose,
  onChange,
  initialTab,
}: {
  onClose: () => void;
  onChange?: () => void;
  initialTab?: TavernPanelTab;
}) {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [info, setInfo] = useState<TavernChronicleInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TavernPanelTab>(initialTab ?? 'tavern');
  const wl16Tab = tab === 'airship' || tab === 'trial';
  const wl17Tab = tab === 'mine' || tab === 'waystation';
  const wl18Tab = tab === 'dive' || tab === 'guildwar';
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [serveVisitorId, setServeVisitorId] = useState<TavernVisitorId | null>(null);
  // undefined = 自动（优先点单那份），null = 这一项不上，string = 指定菜品
  const [dishPick, setDishPick] = useState<string | null | undefined>(undefined);
  const [drinkPick, setDrinkPick] = useState<string | null | undefined>(undefined);
  // 服务器时钟偏移：换日 / 诗篇倒计时按「服务器 nowMs + 本地流逝」推算
  const [clientAnchor, setClientAnchor] = useState(() => Date.now());
  const [tick, setTick] = useState(() => Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      apiClient.clearCache();
      const res: any = await apiClient.getTavernChronicle();
      setInfo(res);
      setClientAnchor(Date.now());
      return res as TavernChronicleInfo;
    } catch (e: any) {
      toastRef.current.error(e?.message || '加载吟游诗人酒馆与冒险者编年史失败');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const t = window.setInterval(() => setTick(Date.now()), 15_000);
    return () => window.clearInterval(t);
  }, []);

  const runAction = async (key: string, call: () => Promise<any>, onOk: (res: any) => void, failText: string) => {
    setBusyKey(key);
    try {
      const res: any = await call();
      if (res?.tavern?.tavern) {
        setInfo(res.tavern);
        setClientAnchor(Date.now());
      } else {
        await load();
      }
      onOk(res);
      onChange?.();
    } catch (e: any) {
      toastRef.current.error(e?.message || failText);
      await load();
    } finally {
      setBusyKey(null);
    }
  };

  const serverNow = info ? info.nowMs + Math.max(0, tick - clientAnchor) : 0;
  const dayLeft = info ? Math.max(0, info.tavern.dayEndsAtMs - serverNow) : 0;
  const balladLeft = info && info.ballad.active ? Math.max(0, info.ballad.endsAtMs - serverNow) : 0;
  const balladLive = Boolean(info?.ballad.active && balladLeft > 0);
  const dayIndex = info ? tavernDayIndexFromKey(info.tavern.dayKey) ?? 0 : 0;
  const bonusChips = info ? formatTavernStats(info.bonuses) : [];
  const waiting = info ? info.tavern.visitors.filter((v) => !v.served) : [];
  const serveVisitor = waiting.find((v) => v.id === serveVisitorId) ?? waiting[0] ?? null;
  const dishesInBag = info ? info.tavern.menu.filter((m) => m.kind === 'dish' && m.have > 0) : [];
  const drinksInBag = info ? info.tavern.menu.filter((m) => m.kind === 'drink' && m.have > 0) : [];
  const autoPick = (list: TavernMenuView[], orderId: string | undefined) =>
    list.find((m) => m.itemId === orderId)?.itemId ?? (list.length > 0 ? list.reduce((a, b) => (b.fame > a.fame ? b : a)).itemId : null);
  const dishId =
    dishPick === undefined
      ? autoPick(dishesInBag, serveVisitor?.order.dish.itemId)
      : dishPick && dishesInBag.some((m) => m.itemId === dishPick)
      ? dishPick
      : null;
  const drinkId =
    drinkPick === undefined
      ? autoPick(drinksInBag, serveVisitor?.order.drink.itemId)
      : drinkPick && drinksInBag.some((m) => m.itemId === drinkPick)
      ? drinkPick
      : null;
  const plan = serveVisitor ? planTavernServe(dayIndex, serveVisitor.id, dishId, drinkId) : null;
  const inscribable = info ? info.chronicle.chapters.filter((c) => c.canInscribe).length : 0;
  const menuName = (itemId: string | null) => (itemId && info ? info.tavern.menu.find((m) => m.itemId === itemId)?.name ?? itemId : '');

  const pickVisitor = (id: TavernVisitorId) => {
    setServeVisitorId(id);
    setDishPick(undefined);
    setDrinkPick(undefined);
  };

  const handleServe = () => {
    if (!serveVisitor || !plan?.ok) return;
    const v = serveVisitor;
    return runAction(
      `serve:${v.id}`,
      () => apiClient.serveTavernVisitor({ visitorId: v.id, dishId, drinkId, dayKey: info?.tavern.dayKey }),
      (res) => {
        const r = res?.serve;
        const verdict = formatTavernVerdict(r?.verdict ?? plan.verdict);
        toastRef.current.success(
          `「${v.title} · ${v.name}」${verdict}！名望 +${r?.fame ?? plan.fame}，小费 ${r?.tipGold ?? plan.tipGold} 金币`
        );
        setServeVisitorId(null);
        setDishPick(undefined);
        setDrinkPick(undefined);
      },
      '招待失败'
    );
  };

  const handleBallad = (b: TavernBalladView) =>
    runAction(
      `ballad:${b.id}`,
      () => apiClient.requestBardBallad({ balladId: b.id, dayKey: info?.tavern.dayKey }),
      () => toastRef.current.success(`吟游诗人开始演唱「${b.name}」，${b.durationMin} 分钟内增益生效`),
      '点唱失败'
    );

  const handleInscribe = (c: ChronicleChapterView) =>
    runAction(
      `inscribe:${c.id}`,
      () => apiClient.inscribeChronicleChapter({ chapterId: c.id }),
      (res) => toastRef.current.success(`编撰「${c.name}」！解锁称号「${c.title}」${res?.inscribe?.autoEquipped ? '并佩戴' : ''}`),
      '编撰失败'
    );

  const handleTitle = (c: ChronicleChapterView) =>
    runAction(
      `title:${c.id}`,
      () => apiClient.equipChronicleTitle({ chapterId: c.equipped ? null : c.id }),
      () => toastRef.current.success(c.equipped ? `取下称号「${c.title}」` : `佩戴称号「${c.title}」`),
      '更换称号失败'
    );

  return (
    <PanelModal
      title={TAVERN_TAB_TITLES[tab]}
      icon={
        <T1Art
          kind="skills"
          id={
            wl18Tab
              ? tab === 'guildwar' ? 'guild_war' : 'abyss_dive'
              : wl17Tab
              ? tab === 'waystation' ? 'elf_waystation' : 'dwarf_mine'
              : wl16Tab
              ? tab === 'trial' ? 'paladin_trial' : 'trade_airship'
              : tab === 'chronicle' ? 'chronicle_book' : 'bard_tavern'
          }
          className="hw-modal-title-icon"
          fallback=""
          alt=""
        />
      }
      onClose={onClose}
    >
      {loading && !info ? (
        <div className="prog-empty">正在推开酒馆的门、翻开编年史…</div>
      ) : !info ? (
        <div className="prog-empty">暂无吟游诗人酒馆数据</div>
      ) : (
        <div className="tv-panel-root" data-testid="tavern-chronicle-panel">
          <div className="prog-filter-bar tv-tab-bar">
            <button
              type="button"
              data-testid="tavern-tab-tavern"
              className={`prog-filter-btn ${tab === 'tavern' ? 'active' : ''}`}
              onClick={() => setTab('tavern')}
            >
              酒馆{waiting.length > 0 ? `（待招待 ${waiting.length}）` : ''}
            </button>
            <button
              type="button"
              data-testid="tavern-tab-chronicle"
              className={`prog-filter-btn ${tab === 'chronicle' ? 'active' : ''}`}
              onClick={() => setTab('chronicle')}
            >
              编年史{inscribable > 0 ? `（可编撰 ${inscribable}）` : ''}
            </button>
            <button
              type="button"
              data-testid="tavern-tab-airship"
              className={`prog-filter-btn ${tab === 'airship' ? 'active' : ''}`}
              onClick={() => setTab('airship')}
            >
              飞艇商路
            </button>
            <button
              type="button"
              data-testid="tavern-tab-trial"
              className={`prog-filter-btn ${tab === 'trial' ? 'active' : ''}`}
              onClick={() => setTab('trial')}
            >
              荣誉试炼
            </button>
            <button
              type="button"
              data-testid="tavern-tab-mine"
              className={`prog-filter-btn ${tab === 'mine' ? 'active' : ''}`}
              onClick={() => setTab('mine')}
            >
              矮人矿脉
            </button>
            <button
              type="button"
              data-testid="tavern-tab-waystation"
              className={`prog-filter-btn ${tab === 'waystation' ? 'active' : ''}`}
              onClick={() => setTab('waystation')}
            >
              精灵驿站
            </button>
            <button
              type="button"
              data-testid="tavern-tab-dive"
              className={`prog-filter-btn ${tab === 'dive' ? 'active' : ''}`}
              onClick={() => setTab('dive')}
            >
              遗迹潜航
            </button>
            <button
              type="button"
              data-testid="tavern-tab-guildwar"
              className={`prog-filter-btn ${tab === 'guildwar' ? 'active' : ''}`}
              onClick={() => setTab('guildwar')}
            >
              公会战
            </button>
          </div>

          {wl16Tab && <AirshipPaladinView view={tab === 'trial' ? 'trial' : 'airship'} onChange={onChange} />}

          {wl17Tab && <DwarfElfView view={tab === 'waystation' ? 'waystation' : 'mine'} onChange={onChange} />}

          {wl18Tab && <AbyssGuildView view={tab === 'guildwar' ? 'guildwar' : 'dive'} onChange={onChange} />}

          {tab === 'tavern' && (
          <div className="hw-hero-card tv-hero-card">
            <div className="hw-hero-top">
              <div className="hw-hero-emblem tv-hero-emblem">
                <T1Art kind="skills" id="bard_tavern" className="hw-hero-core-icon" fallback="" alt="吟游诗人酒馆" />
              </div>
              <div className="tv-hero-copy">
                <div className="ac-hero-title-row">
                  <span className="hw-hero-title" data-testid="tavern-fame-name">
                    酒馆名望 · {info.tavern.fame.name}
                  </span>
                  <span className="qm-equipped-pill" title="酒馆名望与编年史转生永久保留">
                    转生保留
                  </span>
                </div>
                <div className="tv-hero-meta">
                  <span>
                    {info.tavern.fame.next
                      ? `距「${info.tavern.fame.next.name}」还差 ${info.tavern.fame.next.minFame - info.tavern.fame.total} 名望`
                      : '名望已满'}{' '}
                    · 累计招待 {info.tavern.totalServed} 位（完美 {info.tavern.totalPerfect}）· 小费 {info.tavern.tipsEarned} 金币
                  </span>
                  <span className="tv-day-line" data-testid="tavern-day-line">
                    {formatAcademyCountdown(dayLeft)}后换一批客人
                  </span>
                </div>
                <div className="ct-rep-bar tv-fame-bar">
                  <div className="ct-rep-bar-fill tv-fame-fill" style={{ width: `${info.tavern.fame.progressPct}%` }} />
                </div>
              </div>
            </div>

            <div className="ac-wallet-badges tv-wallet-row">
              <span className="ac-wallet-badge tv-fame-badge">
                <T1Art kind="skills" id="fame_laurel" className="ac-badge-icon" fallback="" alt="" />
                名望 <strong data-testid="tavern-fame-total">{info.tavern.fame.total}</strong>
              </span>
              <span className="ac-wallet-badge tv-served-badge">
                <T1Art kind="skills" id="ale_mug" className="ac-badge-icon" fallback="" alt="" />
                今日招待 <strong data-testid="tavern-served-count">{info.tavern.servedToday}</strong> / {info.tavern.visitorsPerDay}
              </span>
              <span className="ac-wallet-badge tv-ballad-badge">
                <T1Art kind="skills" id="bard_lute" className="ac-badge-icon" fallback="" alt="" />
                <span data-testid="tavern-ballad-status">
                  {balladLive && info.ballad.name
                    ? `演唱中「${info.ballad.name}」· ${formatBalladRemaining(balladLeft)}`
                    : `诗篇 ${info.tavern.balladsToday} / ${info.tavern.balladsPerDay}`}
                </span>
              </span>
              <span className="ac-wallet-badge tv-chronicle-badge">
                <T1Art kind="skills" id="chronicle_book" className="ac-badge-icon" fallback="" alt="" />
                编年史 {info.chronicle.inscribedCount} / {info.chronicle.chapterCount} 卷 · 称号{' '}
                <strong data-testid="chronicle-equipped-title">{info.chronicle.equippedTitleName ?? '未佩戴'}</strong>
              </span>
            </div>

            <div className="hw-bonus-strip" data-testid="tavern-bonuses">
              {bonusChips.length === 0 && !balladLive ? (
                <span className="tv-chip muted">尚无加成 —— 招待冒险者积累名望、编撰编年史，或点一首吟游诗篇</span>
              ) : (
                <>
                  {bonusChips.map((c) => (
                    <span key={c} className="tv-chip">
                      {c}
                    </span>
                  ))}
                  {balladLive && (
                    <span className="tv-chip ballad">
                      {info.ballad.name}：{formatTavernStats(info.ballad.stats).join(' · ')}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
          )}

          {tab === 'tavern' && (
            <div className="tv-tavern-view">
              <div className="ac-rack-title">
                今日来访（合点单名望 ×{info.tavern.matchPct / 100}，料理与饮品全合再 +{info.tavern.perfectBonus}）
              </div>
              <div className="tv-visitor-grid">
                {info.tavern.visitors.map((v) => (
                  <div
                    key={v.id}
                    data-testid={`tavern-visitor-${v.id}`}
                    className={`tv-visitor-card ${v.served ? 'served' : ''} ${serveVisitor?.id === v.id ? 'selected' : ''}`}
                  >
                    <div className="tv-visitor-head">
                      <div className="tv-visitor-portrait">
                        <T1Art kind="ui" id={v.avatarId} className="tv-visitor-art" fallback="" alt={v.name} />
                      </div>
                      <div className="tv-visitor-title-col">
                        <div className="tv-visitor-name-row">
                          <strong>{v.name}</strong>
                          <span className="tv-role-tag">{v.title}</span>
                          {v.served && <span className="tv-served-tag">已招待</span>}
                        </div>
                        <span className="tv-visitor-quote">{v.quote}</span>
                      </div>
                    </div>
                    <div className="tv-order-row">
                      <span className="tv-order-label">今日点单</span>
                      {[v.order.dish, v.order.drink].map((m) => (
                        <span key={m.itemId} className={`tv-order-chip ${m.have > 0 ? 'ok' : 'short'}`}>
                          <T1ItemIcon itemId={m.itemId} className="ac-badge-icon" fallback="" alt="" />
                          {m.name} ×{m.have}
                        </span>
                      ))}
                    </div>
                    <div className="tv-visitor-foot">
                      {v.served && v.record ? (
                        <span className="tv-record-text">
                          已端上 {[v.record.dishName, v.record.drinkName].filter(Boolean).join(' + ')} · 名望 +{v.record.fame} · 小费{' '}
                          {v.record.tipGold}
                        </span>
                      ) : v.served ? (
                        <span className="tv-record-text">今天已经招待过了</span>
                      ) : (
                        <>
                          <span className="tv-perfect-hint">完美招待 +{v.perfectFame} 名望</span>
                          <button
                            type="button"
                            data-testid={`tavern-serve-pick-${v.id}`}
                            className={`prog-filter-btn tv-pick-btn ${serveVisitor?.id === v.id ? 'active' : ''}`}
                            onClick={() => pickVisitor(v.id)}
                          >
                            {serveVisitor?.id === v.id ? '吧台招待中' : '去招待'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="tv-bar-station" data-testid="tavern-serve-station">
                <div className="tv-bar-head">
                  <div className="tv-bar-emblem">
                    <T1Art kind="skills" id="ale_mug" className="tv-bar-icon" fallback="" alt="吧台" />
                  </div>
                  <div className="tv-bar-copy">
                    <strong>吧台{serveVisitor ? ` · 招待「${serveVisitor.title} · ${serveVisitor.name}」` : ''}</strong>
                    <span className="tv-rule-note">从背包选一份料理和一杯饮品（至少一样），再点一次可撤下。</span>
                  </div>
                </div>
                {!serveVisitor ? (
                  <div className="tv-empty">今天的客人都招待完了 —— 东八区 0 点会换一批新面孔。</div>
                ) : dishesInBag.length === 0 && drinksInBag.length === 0 ? (
                  <div className="tv-empty">背包里没有酒馆菜单上的料理或饮品 —— 去烹饪页做些料理、酿些饮品吧。</div>
                ) : (
                  <>
                    <div className="tv-menu-label">料理</div>
                    {dishesInBag.length === 0 ? (
                      <div className="tv-empty">背包里没有料理</div>
                    ) : (
                      <div className="tv-menu-grid">
                        {dishesInBag.map((m) => {
                          const ordered = serveVisitor.order.dish.itemId === m.itemId;
                          return (
                            <button
                              key={m.itemId}
                              type="button"
                              data-testid={`tavern-dish-${m.itemId}`}
                              className={`tv-menu-chip ${dishId === m.itemId ? 'selected' : ''} ${ordered ? 'ordered' : ''}`}
                              onClick={() => setDishPick(dishId === m.itemId ? null : m.itemId)}
                            >
                              <T1ItemIcon itemId={m.itemId} className="tv-menu-icon" fallback="" alt="" />
                              <span className="tv-menu-name">{m.name}</span>
                              <span className="tv-menu-meta">
                                ×{m.have} · 名望 {ordered ? Math.floor((m.fame * info.tavern.matchPct) / 100) : m.fame}
                                {ordered ? ' · 点单' : ''}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <div className="tv-menu-label">饮品</div>
                    {drinksInBag.length === 0 ? (
                      <div className="tv-empty">背包里没有饮品</div>
                    ) : (
                      <div className="tv-menu-grid">
                        {drinksInBag.map((m) => {
                          const ordered = serveVisitor.order.drink.itemId === m.itemId;
                          return (
                            <button
                              key={m.itemId}
                              type="button"
                              data-testid={`tavern-drink-${m.itemId}`}
                              className={`tv-menu-chip drink ${drinkId === m.itemId ? 'selected' : ''} ${ordered ? 'ordered' : ''}`}
                              onClick={() => setDrinkPick(drinkId === m.itemId ? null : m.itemId)}
                            >
                              <T1ItemIcon itemId={m.itemId} className="tv-menu-icon" fallback="" alt="" />
                              <span className="tv-menu-name">{m.name}</span>
                              <span className="tv-menu-meta">
                                ×{m.have} · 名望 {ordered ? Math.floor((m.fame * info.tavern.matchPct) / 100) : m.fame}
                                {ordered ? ' · 点单' : ''}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <div className="tv-bar-foot">
                      <span className="tv-serve-preview" data-testid="tavern-serve-preview">
                        {plan && plan.ok
                          ? `端上 ${[menuName(plan.dishId), menuName(plan.drinkId)].filter(Boolean).join(' + ')}：${formatTavernVerdict(
                              plan.verdict
                            )} · 名望 +${plan.fame} · 小费 ${plan.tipGold} 金币`
                          : '请至少选一份料理或饮品'}
                      </span>
                      <button
                        type="button"
                        data-testid="tavern-serve-btn"
                        className="prog-claim-btn af-action-btn tv-serve-btn"
                        disabled={!plan?.ok || Boolean(busyKey)}
                        onClick={handleServe}
                      >
                        <T1Art kind="skills" id="ale_mug" className="ac-badge-icon" fallback="" alt="" />
                        {busyKey === `serve:${serveVisitor.id}` ? '上菜中…' : '端上吧台'}
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="ac-rack-title">
                吟游诗人点唱（每日 {info.tavern.balladsPerDay} 首，同时只唱一首；增益只作用于生活职业）
              </div>
              {balladLive && info.ballad.name && (
                <div className="tv-stage-banner" data-testid="tavern-active-ballad">
                  <T1Art kind="skills" id="bard_lute" className="tv-stage-icon" fallback="" alt="" />
                  <div className="tv-stage-copy">
                    <strong>正在演唱「{info.ballad.name}」</strong>
                    <span>
                      {formatTavernStats(info.ballad.stats).join(' · ')} · 剩余 {formatBalladRemaining(balladLeft)}
                    </span>
                  </div>
                </div>
              )}
              <div className="tv-ballad-grid" data-testid="tavern-ballads">
                {info.tavern.ballads.map((b) => (
                  <div
                    key={b.id}
                    data-testid={`tavern-ballad-${b.id}`}
                    className={`tv-ballad-card ${b.unlocked ? '' : 'locked'} ${info.ballad.balladId === b.id && balladLive ? 'playing' : ''}`}
                  >
                    <div className="tv-ballad-head">
                      <T1Art kind="skills" id="bard_lute" className="tv-ballad-icon" fallback="" alt="" />
                      <strong>{b.name}</strong>
                    </div>
                    <span className="tv-ballad-desc">{b.description}</span>
                    <span className="tv-ballad-stats">{formatTavernStats(b.stats).join(' · ')}</span>
                    <span className="tv-ballad-meta">
                      {b.durationMin} 分钟 · 名望 +{b.fame}
                      {b.minFameTier > 0 ? ` · 需「${b.minFameName}」` : ''}
                    </span>
                    <button
                      type="button"
                      data-testid={`tavern-ballad-btn-${b.id}`}
                      className="prog-claim-btn af-action-btn tv-ballad-btn"
                      disabled={!b.canRequest || Boolean(busyKey)}
                      onClick={() => handleBallad(b)}
                    >
                      <T1Art kind="ui" id="gold" className="ac-badge-icon" fallback="" alt="" />
                      {busyKey === `ballad:${b.id}` ? '调弦中…' : b.canRequest ? `点唱 ${b.costGold}` : b.block || '暂不可点唱'}
                    </button>
                  </div>
                ))}
              </div>

              <div className="ac-rack-title">酒馆名望等级（名望只增不减，加成永久生效）</div>
              <div className="tv-fame-row" data-testid="tavern-fame-tiers">
                {info.tavern.fame.tiers.map((t) => (
                  <div
                    key={t.tier}
                    className={`tv-fame-card ${t.reached ? 'reached' : ''} ${info.tavern.fame.tier === t.tier ? 'current' : ''}`}
                  >
                    <div className="tv-fame-head">
                      <T1Art kind="skills" id="fame_laurel" className="tv-fame-icon" fallback="" alt="" />
                      <strong>{t.name}</strong>
                    </div>
                    <span className="tv-fame-req">名望 {t.minFame}</span>
                    <span className="tv-fame-stats">{formatTavernStats(t.stats).join(' · ')}</span>
                  </div>
                ))}
              </div>

              <div className="tv-tomorrow-row" data-testid="tavern-tomorrow">
                <span className="tv-tomorrow-label">明日来访</span>
                {info.tavern.tomorrowVisitors.map((v) => (
                  <span key={v.id} className="tv-tomorrow-chip">
                    <T1Art kind="ui" id={v.avatarId} className="ac-badge-icon" fallback="" alt="" />
                    {v.title} · {v.name}
                  </span>
                ))}
              </div>
              <div className="tv-rule-note">
                每天东八区 0 点换一批客人（全服相同），每位每天招待 1 次；菜单只收烹饪做出的料理与饮品。
              </div>
            </div>
          )}

          {tab === 'chronicle' && (
            <div className="tv-chronicle-view">
              <div className="tv-chronicle-hero" data-testid="chronicle-progress">
                <div className="tv-chronicle-emblem">
                  <T1Art kind="skills" id="chronicle_book" className="tv-chronicle-icon" fallback="" alt="冒险者编年史" />
                </div>
                <div className="tv-chronicle-copy">
                  <strong>
                    已编撰 {info.chronicle.inscribedCount} / {info.chronicle.chapterCount} 卷 · 里程碑 {info.chronicle.entriesDone} /{' '}
                    {info.chronicle.entriesTotal}
                    {info.chronicle.equippedTitleName ? ` · 称号「${info.chronicle.equippedTitleName}」` : ' · 未佩戴称号'}
                  </strong>
                  <div className="ct-rep-bar tv-chronicle-bar">
                    <div
                      className="ct-rep-bar-fill tv-chronicle-fill"
                      style={{ width: `${Math.round((info.chronicle.entriesDone * 100) / Math.max(1, info.chronicle.entriesTotal))}%` }}
                    />
                  </div>
                  <span className="tv-rule-note">每卷三条里程碑全部达成即可编撰，解锁称号与小幅永久加成（转生保留）。</span>
                  <div className="tv-chip-row">
                    {formatTavernStats(info.bonuses.chronicleStats).length === 0 ? (
                      <span className="tv-chip muted">编撰第一卷后，这里会列出编年史的永久加成</span>
                    ) : (
                      formatTavernStats(info.bonuses.chronicleStats).map((c) => (
                        <span key={c} className="tv-chip chronicle">
                          {c}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="tv-chapter-grid">
                {info.chronicle.chapters.map((c) => (
                  <div
                    key={c.id}
                    data-testid={`chronicle-chapter-${c.id}`}
                    className={`tv-chapter-card ${c.inscribed ? 'inscribed' : c.complete ? 'complete' : ''} ${c.equipped ? 'equipped' : ''}`}
                  >
                    <div className="tv-chapter-head">
                      <T1Art kind="skills" id={c.inscribed ? 'chronicle_book' : 'quill_inkwell'} className="tv-chapter-icon" fallback="" alt="" />
                      <div className="tv-chapter-title-col">
                        <strong>{c.name}</strong>
                        <span className="tv-title-tag">称号「{c.title}」</span>
                      </div>
                    </div>
                    <span className="tv-chapter-desc">{c.description}</span>
                    <div className="tv-entry-list">
                      {c.entries.map((e, i) => (
                        <div key={`${e.metric}-${i}`} className={`tv-entry ${e.done ? 'done' : ''}`}>
                          <div className="tv-entry-row">
                            <span className="tv-entry-label">{e.label}</span>
                            <span className="tv-entry-value">
                              {e.done ? '达成' : `${e.value} / ${e.target}`}
                            </span>
                          </div>
                          <div className="ct-rep-bar tv-entry-bar">
                            <div className="ct-rep-bar-fill tv-entry-fill" style={{ width: `${e.pct}%` }} />
                          </div>
                          <span className="tv-entry-source">
                            {e.source} · {e.metricName} {e.value}
                          </span>
                        </div>
                      ))}
                    </div>
                    <span className="tv-chapter-stats">编撰加成：{formatTavernStats(c.stats).join(' · ')}</span>
                    {c.inscribed ? (
                      <div className="tv-chapter-foot">
                        <span className="tv-inscribed-text">已编撰{c.inscribedAt ? ` · ${chronicleDateLabel(c.inscribedAt)}` : ''}</span>
                        <button
                          type="button"
                          data-testid={`chronicle-title-${c.id}`}
                          className="prog-filter-btn tv-title-btn"
                          disabled={Boolean(busyKey)}
                          onClick={() => handleTitle(c)}
                        >
                          {busyKey === `title:${c.id}` ? '更换中…' : c.equipped ? '取下称号' : '佩戴称号'}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        data-testid={`chronicle-inscribe-${c.id}`}
                        className="prog-claim-btn af-action-btn tv-inscribe-btn"
                        disabled={!c.canInscribe || Boolean(busyKey)}
                        onClick={() => handleInscribe(c)}
                      >
                        <T1Art kind="skills" id="quill_inkwell" className="ac-badge-icon" fallback="" alt="" />
                        {busyKey === `inscribe:${c.id}` ? '落笔中…' : c.canInscribe ? '编撰本卷' : `尚缺 ${c.entries.filter((e) => !e.done).length} 条里程碑`}
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {info.chronicle.lastInscription && (
                <div className="tv-note" data-testid="chronicle-last">
                  最近编撰：「{info.chronicle.lastInscription.name}」· {chronicleDateLabel(info.chronicle.lastInscription.at)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </PanelModal>
  );
}

/* ============================================================================
   浮空飞艇商路 & 圣骑士团荣誉试炼 (WL-16)
   并入 WL-15「吟游诗人酒馆与冒险者编年史」面板的两个分页（顶栏已 9 枚胶囊，不再新增）。
   ============================================================================ */

interface AirshipGoodView {
  id: AirshipGoodId;
  name: string;
  origin: AirshipTownId;
  originName: string;
  basePrice: number;
  minHull: number;
  unlocked: boolean;
}

interface AirshipMarketTownView {
  townId: AirshipTownId;
  townName: string;
  artId: string;
  here: boolean;
  buys: Array<AirshipGoodView & { pct: number; price: number; prevPrice: number; stockLeft: number }>;
  sells: Array<AirshipGoodView & { pct: number; price: number; prevPrice: number; held: number }>;
}

interface AirshipRouteView {
  id: AirshipRouteId;
  name: string;
  description: string;
  from: AirshipTownId;
  to: AirshipTownId;
  fromName: string;
  toName: string;
  fromArt: string;
  toArt: string;
  baseMinutes: number;
  openCost: number;
  minHull: number;
  opened: boolean;
  xp: number;
  voyages: number;
  level: number;
  speedPct: number;
  sellBonusPct: number;
  next: { level: number; minXp: number; speedPct: number; sellBonusPct: number } | null;
  progressPct: number;
  durationMs: number;
  destination: AirshipTownId | null;
  destinationName: string | null;
  canOpen: boolean;
  openBlock: string | null;
  canLaunch: boolean;
  launchBlock: string | null;
}

interface PaladinStageView extends PaladinOpponent {
  mechanicsInfo: Array<{ id: string; label: string; desc: string }>;
  cleared: boolean;
  isNext: boolean;
  locked: boolean;
  reward: { stage: number; medals: number; base: number; fullClear: boolean };
  preview: {
    won: boolean;
    timeout: boolean;
    playerHpLeft: number;
    playerMaxHp: number;
    enemyHpLeft: number;
    enemyMaxHp: number;
    durationMs: number;
  } | null;
}

interface PaladinVirtueView {
  id: PaladinVirtueId;
  name: string;
  description: string;
  perRank: PaladinStats;
  rank: number;
  maxRank: number;
  stats: PaladinStats;
  nextRank: number;
  cost: number;
  needHonorRank: number;
  needHonorName: string;
  canUpgrade: boolean;
  block: string | null;
}

interface AirshipPaladinInfo {
  nowMs: number;
  bonuses: PaladinTrialBonuses;
  airship: {
    dayKey: string;
    dayEndsAtMs: number;
    gold: number;
    location: { id: AirshipTownId; name: string; artId: string };
    hull: {
      level: number;
      name: string;
      capacity: number;
      speedPct: number;
      maxLevel: number;
      next: {
        level: number;
        name: string;
        capacity: number;
        speedPct: number;
        costGold: number;
        materials: Array<{ itemId: string; name: string; need: number; have: number }>;
      } | null;
      canUpgrade: boolean;
      block: string | null;
    };
    cargo: Array<AirshipGoodView & { qty: number; cost: number }>;
    cargoMap: Partial<Record<AirshipGoodId, number>>;
    cargoCost: Partial<Record<AirshipGoodId, number>>;
    boughtToday: Partial<Record<AirshipGoodId, number>>;
    cargoUnits: number;
    capacity: number;
    voyage: {
      routeId: AirshipRouteId;
      routeName: string;
      from: AirshipTownId;
      to: AirshipTownId;
      fromName: string;
      toName: string;
      departedAtMs: number;
      arrivesAtMs: number;
      cargoUnits: number;
      xpOnArrival: number;
    } | null;
    arrivedVia: { routeId: AirshipRouteId; name: string; level: number; sellBonusPct: number } | null;
    sellBonusPct: number;
    towns: Array<{ id: AirshipTownId; name: string; artId: string; source: string; description: string; here: boolean; specialties: AirshipGoodId[] }>;
    goods: AirshipGoodView[];
    routes: AirshipRouteView[];
    routesOpened: number;
    market: AirshipMarketTownView[];
    dailyStock: number;
    maxTradeQty: number;
    totals: { voyages: number; sales: number; spent: number; profit: number };
    lastSale: { goodId: AirshipGoodId; name: string; townName: string; qty: number; gold: number; profit: number; at: string } | null;
    lastArrival: { routeName: string; toName: string; cargoUnits: number; xpGained: number; at: string } | null;
    hulls: Array<{ level: number; name: string; capacity: number; speedPct: number; reached: boolean }>;
  };
  trial: {
    weekKey: string;
    weekEndsAtMs: number;
    theme: { id: string; name: string; description: string; mechanics: Array<{ id: string; label: string; desc: string }> };
    nextWeekTheme: { id: string; name: string };
    attemptsUsed: number;
    attemptsLeft: number;
    weeklyAttempts: number;
    cleared: number[];
    nextStage: number | null;
    stages: PaladinStageView[];
    player: { atk: number; def: number; hp: number; intervalMs: number } | null;
    medals: number;
    totalMedals: number;
    fullClearBonus: number;
    honor: {
      rank: number;
      name: string;
      next: { rank: number; name: string; minMedals: number } | null;
      progressPct: number;
      ranks: Array<{ rank: number; name: string; minMedals: number; reached: boolean }>;
    };
    virtues: PaladinVirtueView[];
    caps: Required<PaladinStats>;
    bestStage: number;
    weeksFullCleared: number;
    totalWins: number;
    totalLosses: number;
    lastDuel: {
      stage: number;
      opponentName: string;
      won: boolean;
      timeout: boolean;
      enemyHpLeft: number;
      enemyMaxHp: number;
      playerHpLeft: number;
      playerMaxHp: number;
      durationMs: number;
      medals: number;
      at: string;
    } | null;
  };
}

function AirshipPaladinView({ view, onChange }: { view: 'airship' | 'trial'; onChange?: () => void }) {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [info, setInfo] = useState<AirshipPaladinInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  // 每张买卖卡的件数（未手动调整时：购入默认填满可买上限，卖出默认全部卖出）
  const [qtyPick, setQtyPick] = useState<Record<string, number>>({});
  // 服务器时钟偏移：换日 / 航程倒计时按「服务器 nowMs + 本地流逝」推算
  const [clientAnchor, setClientAnchor] = useState(() => Date.now());
  const [tick, setTick] = useState(() => Date.now());
  const arrivalReloadRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      apiClient.clearCache();
      const res: any = await apiClient.getAirshipPaladin();
      setInfo(res);
      setClientAnchor(Date.now());
      return res as AirshipPaladinInfo;
    } catch (e: any) {
      toastRef.current.error(e?.message || '加载浮空飞艇商路与圣骑士团荣誉试炼失败');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const flying = Boolean(info?.airship.voyage);
  useEffect(() => {
    const t = window.setInterval(() => setTick(Date.now()), flying ? 1_000 : 15_000);
    return () => window.clearInterval(t);
  }, [flying]);

  const serverNow = info ? info.nowMs + Math.max(0, tick - clientAnchor) : 0;
  const voyage = info?.airship.voyage ?? null;
  const voyageLeft = voyage ? Math.max(0, voyage.arrivesAtMs - serverNow) : 0;
  // 到点后由服务器结算抵港（显式 now）：每趟航程只自动刷新一次
  useEffect(() => {
    if (!voyage || voyageLeft > 0 || loading) return;
    if (arrivalReloadRef.current === voyage.arrivesAtMs) return;
    arrivalReloadRef.current = voyage.arrivesAtMs;
    void load();
  }, [voyage, voyageLeft, loading, load]);

  const runAction = async (key: string, call: () => Promise<any>, onOk: (res: any) => void, failText: string) => {
    setBusyKey(key);
    try {
      const res: any = await call();
      if (res?.airship?.airship) {
        setInfo(res.airship);
        setClientAnchor(Date.now());
      } else {
        await load();
      }
      setQtyPick({});
      onOk(res);
      onChange?.();
    } catch (e: any) {
      toastRef.current.error(e?.message || failText);
      await load();
    } finally {
      setBusyKey(null);
    }
  };

  if (loading && !info) return <div className="prog-empty">正在升起飞艇的帆、擦亮试炼场的战旗…</div>;
  if (!info) return <div className="prog-empty">暂无浮空飞艇商路与荣誉试炼数据</div>;

  const a = info.airship;
  const t = info.trial;
  const dayIndex = airshipDayIndexFromKey(a.dayKey) ?? 0;
  const dayLeft = Math.max(0, a.dayEndsAtMs - serverNow);
  const weekLeft = Math.max(0, t.weekEndsAtMs - serverNow);
  const hereMarket = a.market.find((m) => m.here) ?? a.market[0];
  const qtyOf = (key: string, fallback: number) => (qtyPick[key] !== undefined ? qtyPick[key] : fallback);
  const setQty = (key: string, n: number, max: number) =>
    setQtyPick((prev) => ({ ...prev, [key]: Math.max(1, Math.min(Math.max(1, max), Math.floor(Number(n) || 1))) }));
  const bonusChips = formatPaladinStats(info.bonuses);
  const capLine = formatPaladinStats(t.caps).join(' · ');
  const voyagePct = voyage
    ? Math.min(100, Math.max(0, Math.round(((serverNow - voyage.departedAtMs) * 100) / Math.max(1, voyage.arrivesAtMs - voyage.departedAtMs))))
    : 0;

  const handleBuy = (goodId: AirshipGoodId, name: string, qty: number) =>
    runAction(
      `buy:${goodId}`,
      () => apiClient.buyAirshipCargo({ goodId, qty, dayKey: a.dayKey }),
      (res) => toastRef.current.success(`购入「${name}」×${res?.buy?.qty ?? qty}，花费 ${res?.buy?.total ?? ''} 金币`),
      '购入失败'
    );
  const handleSell = (goodId: AirshipGoodId, name: string, qty: number) =>
    runAction(
      `sell:${goodId}`,
      () => apiClient.sellAirshipCargo({ goodId, qty, dayKey: a.dayKey }),
      (res) =>
        toastRef.current.success(
          `卖出「${name}」×${res?.sell?.qty ?? qty}，收入 ${res?.sell?.total ?? ''} 金币（${formatAirshipProfit(res?.sell?.profit ?? 0)}）`
        ),
      '卖出失败'
    );
  const handleOpen = (r: AirshipRouteView) =>
    runAction(
      `open:${r.id}`,
      () => apiClient.openAirshipRoute({ routeId: r.id }),
      () => toastRef.current.success(`开辟「${r.name}」：${r.fromName} ↔ ${r.toName}`),
      '开辟航线失败'
    );
  const handleLaunch = (r: AirshipRouteView) =>
    runAction(
      `launch:${r.id}`,
      () => apiClient.launchAirshipVoyage({ routeId: r.id }),
      (res) =>
        toastRef.current.success(
          `飞艇沿「${r.name}」起航，${formatAirshipDuration(res?.launch?.durationMs ?? r.durationMs)}后抵达${r.destinationName ?? ''}`
        ),
      '起航失败'
    );
  const handleHull = () =>
    runAction(
      'hull',
      () => apiClient.upgradeAirshipHull(),
      (res) => toastRef.current.success(`船体升级完成：货舱 ${res?.hull?.capacity ?? ''} 件`),
      '船体升级失败'
    );
  const handleChallenge = (s: PaladinStageView) =>
    runAction(
      `challenge:${s.stage}`,
      () => apiClient.challengePaladinTrial({ stage: s.stage, weekKey: t.weekKey }),
      (res) => {
        const r = res?.challenge;
        if (r?.won) {
          toastRef.current.success(`第 ${s.stage} 关「${s.stageName}」通过！荣誉勋章 +${r.medals}${r.fullClear ? '（本周六关全通）' : ''}`);
        } else {
          toastRef.current.error(`第 ${s.stage} 关「${s.stageName}」${r?.timeout ? '10 分钟未分胜负，判负' : '挑战失败'}，剩余挑战 ${r?.attemptsLeft ?? ''} 次`);
        }
      },
      '挑战失败'
    );
  const handleVirtue = (v: PaladinVirtueView) =>
    runAction(
      `virtue:${v.id}`,
      () => apiClient.upgradePaladinVirtue({ virtueId: v.id }),
      () => toastRef.current.success(`「${v.name}」升至第 ${v.nextRank} 阶`),
      '誓言升阶失败'
    );

  if (view === 'airship') {
    const sellRows = a.cargo.map((c) => {
      const plan = planAirshipSell(dayIndex, a.location.id, c.id, qtyOf(`sell:${c.id}`, c.qty), a.cargoMap, a.cargoCost, a.sellBonusPct);
      return { c, plan, isOrigin: c.origin === a.location.id };
    });
    return (
      <div className="as-view" data-testid="airship-view">
        <div className="hw-hero-card as-hero-card">
          <div className="hw-hero-top">
            <div className="hw-hero-emblem as-hero-emblem">
              <T1Art kind="skills" id="trade_airship" className="hw-hero-core-icon" fallback="" alt="浮空飞艇" />
            </div>
            <div className="as-hero-copy">
              <div className="ac-hero-title-row">
                <span className="hw-hero-title" data-testid="airship-hull-name">
                  船体 · {a.hull.name}
                </span>
                <span className="qm-equipped-pill" title="航线、航线等级与船体转生永久保留；货舱特产转生时清空">
                  转生保留
                </span>
              </div>
              <div className="as-hero-meta">
                <span data-testid="airship-status">
                  {voyage
                    ? `航行中：「${voyage.routeName}」${voyage.fromName} → ${voyage.toName}`
                    : `停靠在${a.location.name}`}
                  {!voyage && a.arrivedVia ? ` · 经「${a.arrivedVia.name}」Lv.${a.arrivedVia.level} 抵港，收购价 +${a.sellBonusPct}%` : ''}
                </span>
                <span className="as-day-line">
                  {formatAcademyCountdown(dayLeft)}后换行情、补满存货 · 船体 Lv.{a.hull.level}（航程 -{a.hull.speedPct}%）
                </span>
              </div>
              <div className="ct-rep-bar as-cargo-bar">
                <div className="ct-rep-bar-fill as-cargo-fill" style={{ width: `${Math.round((a.cargoUnits * 100) / Math.max(1, a.capacity))}%` }} />
              </div>
            </div>
          </div>
          <div className="ac-wallet-badges as-wallet-row">
            <span className="ac-wallet-badge as-gold-badge">
              <T1Art kind="ui" id="gold" className="ac-badge-icon" fallback="" alt="" />
              金币 <strong data-testid="airship-gold">{a.gold}</strong>
            </span>
            <span className="ac-wallet-badge as-cargo-badge">
              <T1Art kind="skills" id="cargo_crate" className="ac-badge-icon" fallback="" alt="" />
              货舱 <strong data-testid="airship-cargo-units">{a.cargoUnits}</strong> / {a.capacity}
            </span>
            <span className="ac-wallet-badge as-dock-badge">
              <T1Art kind="skills" id="airship_dock" className="ac-badge-icon" fallback="" alt="" />
              航线 <strong data-testid="airship-routes-opened">{a.routesOpened}</strong> / {a.routes.length}
            </span>
            <span className="ac-wallet-badge as-profit-badge">
              <T1Art kind="skills" id="trade_airship" className="ac-badge-icon" fallback="" alt="" />
              {a.totals.voyages} 趟航程 · 累计{formatAirshipProfit(a.totals.profit)}
            </span>
          </div>
        </div>

        {voyage && (
          <div className="as-voyage-banner" data-testid="airship-voyage">
            <T1Art kind="skills" id="trade_airship" className="as-voyage-icon" fallback="" alt="" />
            <div className="as-voyage-copy">
              <strong>
                「{voyage.routeName}」{voyage.fromName} → {voyage.toName}
              </strong>
              <span>
                载货 {voyage.cargoUnits} 件 · 抵港航线经验 +{voyage.xpOnArrival} ·{' '}
                {voyageLeft > 0 ? `还有 ${formatAirshipDuration(voyageLeft)}抵港` : '正在靠港…'}
              </span>
              <div className="ct-rep-bar as-voyage-bar">
                <div className="ct-rep-bar-fill as-voyage-fill" style={{ width: `${voyagePct}%` }} />
              </div>
            </div>
          </div>
        )}

        <div className="ac-rack-title">
          {a.location.name}集市 · 今日行情（每种特产每日 {a.dailyStock} 件）
        </div>
        <div className="as-market-here" data-testid="airship-market-here">
          <div className="as-market-col">
            <div className="as-col-title">
              <T1Art kind="skills" id={a.location.artId} className="ac-badge-icon" fallback="" alt="" />
              本地特产 · 产地价购入
            </div>
            {hereMarket.buys.map((g) => {
              const key = `buy:${g.id}`;
              const probe = planAirshipBuy(dayIndex, a.location.id, a.hull.level, g.id, 1, a.cargoMap, a.boughtToday, a.gold);
              const qty = qtyOf(key, Math.max(1, probe.maxQty));
              const plan = planAirshipBuy(dayIndex, a.location.id, a.hull.level, g.id, qty, a.cargoMap, a.boughtToday, a.gold);
              const block = voyage
                ? '航行中'
                : !plan.hullOk
                  ? `需船体 ${g.minHull} 级`
                  : plan.stockLeft <= 0
                    ? '今日售罄'
                    : plan.spaceLeft <= 0
                      ? '货舱已满'
                      : probe.maxQty <= 0
                        ? '金币不足'
                        : null;
              return (
                <div key={g.id} className={`as-trade-card ${g.unlocked ? '' : 'locked'}`} data-testid={`airship-buy-${g.id}`}>
                  <div className="as-trade-head">
                    <T1ItemIcon itemId={g.id} className="as-trade-icon" fallback="" alt={g.name} />
                    <div className="as-trade-title">
                      <strong>{g.name}</strong>
                      <span className="as-trade-meta">
                        单价 {g.price}（基准 {g.basePrice} 的 {g.pct}%）· 较昨日{formatAirshipTrend(g.price, g.prevPrice)}
                      </span>
                      <span className="as-trade-meta">今日存货 {g.stockLeft} / {a.dailyStock}</span>
                    </div>
                  </div>
                  <div className="as-trade-foot">
                    <div className="as-qty">
                      <button type="button" className="prog-filter-btn as-qty-btn" disabled={Boolean(block) || qty <= 1} onClick={() => setQty(key, qty - 1, probe.maxQty)}>
                        -
                      </button>
                      <input
                        className="as-qty-input"
                        type="number"
                        min={1}
                        max={Math.max(1, probe.maxQty)}
                        value={qty}
                        disabled={Boolean(block)}
                        aria-label={`购入「${g.name}」件数`}
                        onChange={(e) => setQty(key, Number(e.target.value), probe.maxQty)}
                      />
                      <button type="button" className="prog-filter-btn as-qty-btn" disabled={Boolean(block) || qty >= probe.maxQty} onClick={() => setQty(key, qty + 1, probe.maxQty)}>
                        +
                      </button>
                      <button type="button" className="prog-filter-btn as-qty-btn" disabled={Boolean(block)} onClick={() => setQty(key, probe.maxQty, probe.maxQty)}>
                        最大
                      </button>
                    </div>
                    <button
                      type="button"
                      data-testid={`airship-buy-btn-${g.id}`}
                      className="prog-claim-btn af-action-btn as-buy-btn"
                      disabled={!plan.ok || Boolean(block) || Boolean(busyKey)}
                      onClick={() => handleBuy(g.id, g.name, plan.qty)}
                    >
                      <T1Art kind="ui" id="gold" className="ac-badge-icon" fallback="" alt="" />
                      {busyKey === key ? '装货中…' : block ? block : `购入 ${plan.qty} 件 · ${plan.total}`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="as-market-col">
            <div className="as-col-title">
              <T1Art kind="skills" id="cargo_crate" className="ac-badge-icon" fallback="" alt="" />
              货舱 · 在{a.location.name}卖出{a.sellBonusPct > 0 ? `（航线加成 +${a.sellBonusPct}%）` : ''}
            </div>
            {sellRows.length === 0 ? (
              <div className="tv-empty">货舱空空如也 —— 在产地买些特产，飞去外地港口高价卖出。</div>
            ) : (
              sellRows.map(({ c, plan, isOrigin }) => {
                const key = `sell:${c.id}`;
                const qty = qtyOf(key, c.qty);
                const quote = hereMarket.sells.find((s) => s.id === c.id);
                const block = voyage ? '航行中' : isOrigin ? '产地不收购' : null;
                return (
                  <div key={c.id} className="as-trade-card sell" data-testid={`airship-sell-${c.id}`}>
                    <div className="as-trade-head">
                      <T1ItemIcon itemId={c.id} className="as-trade-icon" fallback="" alt={c.name} />
                      <div className="as-trade-title">
                        <strong>
                          {c.name} ×{c.qty}
                        </strong>
                        <span className="as-trade-meta">
                          {isOrigin || !quote
                            ? `产自${c.originName}，需运往外地港口出售`
                            : `收购价 ${plan.unitPrice}（${quote.pct}%${plan.bonusPct > 0 ? ` +${plan.bonusPct}%` : ''}）· 较昨日${formatAirshipTrend(quote.price, quote.prevPrice)}`}
                        </span>
                        <span className="as-trade-meta">购入成本 {c.cost} 金币</span>
                      </div>
                    </div>
                    <div className="as-trade-foot">
                      <div className="as-qty">
                        <button type="button" className="prog-filter-btn as-qty-btn" disabled={Boolean(block) || qty <= 1} onClick={() => setQty(key, qty - 1, c.qty)}>
                          -
                        </button>
                        <input
                          className="as-qty-input"
                          type="number"
                          min={1}
                          max={c.qty}
                          value={qty}
                          disabled={Boolean(block)}
                          aria-label={`卖出「${c.name}」件数`}
                          onChange={(e) => setQty(key, Number(e.target.value), c.qty)}
                        />
                        <button type="button" className="prog-filter-btn as-qty-btn" disabled={Boolean(block) || qty >= c.qty} onClick={() => setQty(key, qty + 1, c.qty)}>
                          +
                        </button>
                        <button type="button" className="prog-filter-btn as-qty-btn" disabled={Boolean(block)} onClick={() => setQty(key, c.qty, c.qty)}>
                          全部
                        </button>
                      </div>
                      <button
                        type="button"
                        data-testid={`airship-sell-btn-${c.id}`}
                        className="prog-claim-btn af-action-btn as-sell-btn"
                        disabled={!plan.ok || Boolean(block) || Boolean(busyKey)}
                        onClick={() => handleSell(c.id, c.name, plan.qty)}
                      >
                        <T1Art kind="skills" id="cargo_crate" className="ac-badge-icon" fallback="" alt="" />
                        {busyKey === key ? '卸货中…' : block ? block : `卖出 ${plan.qty} 件 · ${plan.total}（${formatAirshipProfit(plan.profit)}）`}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="ac-rack-title">航线（双向通航；载货航行升级航线，缩短航程、提高抵港收购价）</div>
        <div className="as-route-grid" data-testid="airship-routes">
          {a.routes.map((r) => (
            <div
              key={r.id}
              data-testid={`airship-route-${r.id}`}
              className={`as-route-card ${r.opened ? 'opened' : ''} ${r.destination && r.opened ? 'here' : ''}`}
            >
              <div className="as-route-towns">
                <T1Art kind="skills" id={r.fromArt} className="as-town-icon" fallback="" alt={r.fromName} />
                <span className="as-route-arrow">↔</span>
                <T1Art kind="skills" id={r.toArt} className="as-town-icon" fallback="" alt={r.toName} />
                <div className="as-route-title">
                  <strong>{r.name}</strong>
                  <span>
                    {r.fromName} ↔ {r.toName}
                  </span>
                </div>
              </div>
              <span className="as-route-desc">{r.description}</span>
              <span className="as-route-meta">
                {r.opened
                  ? `Lv.${r.level} · 航程 ${formatAirshipDuration(r.durationMs)} · 抵港收购 +${r.sellBonusPct}% · 已飞 ${r.voyages} 趟`
                  : `基准航程 ${r.baseMinutes} 分钟 · 开辟需船体 ${r.minHull} 级`}
              </span>
              {r.opened && (
                <div className="ct-rep-bar as-route-bar">
                  <div className="ct-rep-bar-fill as-route-fill" style={{ width: `${r.progressPct}%` }} />
                </div>
              )}
              {r.opened && (
                <span className="as-route-xp">
                  航线经验 {r.xp}
                  {r.next ? ` / ${r.next.minXp}（Lv.${r.next.level}：航程 -${r.next.speedPct}%、收购 +${r.next.sellBonusPct}%）` : '（满级）'}
                </span>
              )}
              {r.opened ? (
                <button
                  type="button"
                  data-testid={`airship-launch-${r.id}`}
                  className="prog-claim-btn af-action-btn as-launch-btn"
                  disabled={!r.canLaunch || Boolean(busyKey)}
                  onClick={() => handleLaunch(r)}
                >
                  <T1Art kind="skills" id="trade_airship" className="ac-badge-icon" fallback="" alt="" />
                  {busyKey === `launch:${r.id}` ? '起锚中…' : r.canLaunch ? `起航前往${r.destinationName}` : r.launchBlock || '暂不可起航'}
                </button>
              ) : (
                <button
                  type="button"
                  data-testid={`airship-open-${r.id}`}
                  className="prog-claim-btn af-action-btn as-open-btn"
                  disabled={!r.canOpen || Boolean(busyKey)}
                  onClick={() => handleOpen(r)}
                >
                  <T1Art kind="skills" id="airship_dock" className="ac-badge-icon" fallback="" alt="" />
                  {busyKey === `open:${r.id}` ? '测绘中…' : r.canOpen ? `开辟航线 ${r.openCost}` : r.openBlock || '暂不可开辟'}
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="ac-rack-title">船坞 · 船体升级（航行中不能进坞）</div>
        <div className="as-hull-card" data-testid="airship-hull">
          <div className="as-hull-emblem">
            <T1Art kind="skills" id="airship_dock" className="as-hull-icon" fallback="" alt="飞艇船坞" />
          </div>
          <div className="as-hull-copy">
            <strong>
              当前「{a.hull.name}」Lv.{a.hull.level} · 货舱 {a.hull.capacity} 件 · 航程 -{a.hull.speedPct}%
            </strong>
            {a.hull.next ? (
              <>
                <span className="as-hull-next">
                  下一级「{a.hull.next.name}」：货舱 {a.hull.next.capacity} 件 · 航程 -{a.hull.next.speedPct}%
                </span>
                <div className="as-mat-row">
                  <span className={`as-mat-chip ${a.gold >= a.hull.next.costGold ? 'ok' : 'short'}`}>
                    <T1Art kind="ui" id="gold" className="ac-badge-icon" fallback="" alt="" />
                    {a.hull.next.costGold}
                  </span>
                  {a.hull.next.materials.map((m) => (
                    <span key={m.itemId} className={`as-mat-chip ${m.have >= m.need ? 'ok' : 'short'}`}>
                      <T1ItemIcon itemId={m.itemId} className="ac-badge-icon" fallback="" alt="" />
                      {m.name} {m.have}/{m.need}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <span className="as-hull-next">船体已是最高等级</span>
            )}
            <div className="as-hull-steps">
              {a.hulls.map((h) => (
                <span key={h.level} className={`as-hull-step ${h.reached ? 'reached' : ''} ${h.level === a.hull.level ? 'current' : ''}`}>
                  Lv.{h.level} {h.name} · {h.capacity} 件
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            data-testid="airship-hull-btn"
            className="prog-claim-btn af-action-btn as-hull-btn"
            disabled={!a.hull.canUpgrade || Boolean(busyKey)}
            onClick={handleHull}
          >
            <T1Art kind="skills" id="airship_dock" className="ac-badge-icon" fallback="" alt="" />
            {busyKey === 'hull' ? '进坞中…' : a.hull.canUpgrade ? '进坞升级' : a.hull.block || '暂不可升级'}
          </button>
        </div>

        <div className="ac-rack-title">全图行情（各港今日收购价，未含航线加成）</div>
        <div className="as-town-grid" data-testid="airship-market-all">
          {a.market.map((m) => {
            const town = a.towns.find((x) => x.id === m.townId);
            return (
              <div key={m.townId} className={`as-town-card ${m.here ? 'here' : ''}`}>
                <div className="as-town-head">
                  <T1Art kind="skills" id={m.artId} className="as-town-art" fallback="" alt={m.townName} />
                  <div className="as-town-title">
                    <strong>
                      {m.townName}
                      {m.here ? ' · 停靠中' : ''}
                    </strong>
                    <span>{town?.source}</span>
                  </div>
                </div>
                <span className="as-town-desc">{town?.description}</span>
                <div className="as-town-specials">
                  特产：
                  {m.buys.map((g) => (
                    <span key={g.id} className="as-mini-chip origin">
                      <T1ItemIcon itemId={g.id} className="ac-badge-icon" fallback="" alt="" />
                      {g.name} {g.price}
                    </span>
                  ))}
                </div>
                <div className="as-town-prices">
                  {m.sells.map((g) => (
                    <span key={g.id} className={`as-mini-chip ${g.held > 0 ? 'held' : ''} ${g.unlocked ? '' : 'locked'}`}>
                      <T1ItemIcon itemId={g.id} className="ac-badge-icon" fallback="" alt="" />
                      {g.name} {g.price}（{g.pct}%，{formatAirshipTrend(g.price, g.prevPrice)}）
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="tv-rule-note">
          行情每天东八区 0 点轮换（全服相同），产地不收购本地特产。航线、航线等级与船体转生永久保留，货舱特产转生时清空。
          {a.lastArrival ? ` 最近抵港：沿「${a.lastArrival.routeName}」到${a.lastArrival.toName}，载货 ${a.lastArrival.cargoUnits} 件，航线经验 +${a.lastArrival.xpGained}。` : ''}
          {a.lastSale ? ` 最近成交：在${a.lastSale.townName}卖出「${a.lastSale.name}」×${a.lastSale.qty}，${formatAirshipProfit(a.lastSale.profit)}。` : ''}
        </div>
      </div>
    );
  }

  return (
    <div className="ht-view" data-testid="paladin-trial-view">
      <div className="hw-hero-card ht-hero-card">
        <div className="hw-hero-top">
          <div className="hw-hero-emblem ht-hero-emblem">
            <T1Art kind="skills" id="paladin_trial" className="hw-hero-core-icon" fallback="" alt="圣骑士团荣誉试炼" />
          </div>
          <div className="ht-hero-copy">
            <div className="ac-hero-title-row">
              <span className="hw-hero-title" data-testid="paladin-theme">
                本周「{t.theme.name}」
              </span>
              <span className="qm-equipped-pill" title="荣誉勋章与圣骑士誓言转生永久保留">
                转生保留
              </span>
            </div>
            <div className="ht-hero-meta">
              <span>{t.theme.description}</span>
              <span className="ht-week-line">
                {formatAcademyCountdown(weekLeft)}后轮换为「{t.nextWeekTheme.name}」 · 荣誉位阶「{t.honor.name}」
                {t.honor.next ? `，距「${t.honor.next.name}」还差 ${t.honor.next.minMedals - t.totalMedals} 枚` : '（已满）'}
              </span>
            </div>
            <div className="ct-rep-bar ht-honor-bar">
              <div className="ct-rep-bar-fill ht-honor-fill" style={{ width: `${t.honor.progressPct}%` }} />
            </div>
          </div>
        </div>
        <div className="ac-wallet-badges ht-wallet-row">
          <span className="ac-wallet-badge ht-medal-badge">
            <T1Art kind="skills" id="honor_medal" className="ac-badge-icon" fallback="" alt="" />
            荣誉勋章 <strong data-testid="paladin-medals">{t.medals}</strong>（累计 {t.totalMedals}）
          </span>
          <span className="ac-wallet-badge ht-attempt-badge">
            <T1Art kind="skills" id="trial_banner" className="ac-badge-icon" fallback="" alt="" />
            本周挑战 <strong data-testid="paladin-attempts">{t.attemptsLeft}</strong> / {t.weeklyAttempts}
          </span>
          <span className="ac-wallet-badge ht-clear-badge">
            <T1Art kind="skills" id="paladin_trial" className="ac-badge-icon" fallback="" alt="" />
            本周已通 <strong data-testid="paladin-cleared">{t.cleared.length}</strong> / {t.stages.length} 关
          </span>
        </div>
        <div className="hw-bonus-strip" data-testid="paladin-bonuses">
          {bonusChips.length === 0 ? (
            <span className="tv-chip muted">尚无誓言加成 —— 通关试炼赢取荣誉勋章，再到下方立下誓言</span>
          ) : (
            bonusChips.map((c) => (
              <span key={c} className="tv-chip ht-chip">
                {c}
              </span>
            ))
          )}
          <span className="tv-chip muted">封顶：{capLine}</span>
        </div>
      </div>

      {t.player && (
        <div className="ht-build-line" data-testid="paladin-build">
          你的试炼属性：攻击 {t.player.atk} · 防御 {t.player.def} · 生命 {t.player.hp} · 出手间隔 {(t.player.intervalMs / 1000).toFixed(2)} 秒（满血、不含临时增益）
        </div>
      )}

      <div className="ac-rack-title">
        本周六关（按顺序挑战，胜负都消耗 1 次；首通得荣誉勋章，六关全通再 +{t.fullClearBonus}）
      </div>
      <div className="ht-stage-grid" data-testid="paladin-stages">
        {t.stages.map((s) => (
          <div
            key={s.stage}
            data-testid={`paladin-stage-${s.stage}`}
            className={`ht-stage-card ${s.cleared ? 'cleared' : ''} ${s.isNext ? 'next' : ''} ${s.locked ? 'locked' : ''} ${s.isBoss ? 'boss' : ''}`}
          >
            <div className="ht-stage-head">
              <div className="ht-stage-portrait">
                <T1Art kind="monster" id={s.monsterId} className="ht-stage-art" fallback="" alt={s.name} />
              </div>
              <div className="ht-stage-title">
                <span className="ht-stage-no">
                  第 {s.stage} 关 · {s.stageName}
                </span>
                <strong>{s.name}</strong>
                <span className="ht-stage-stats">
                  Lv.{s.level} · 生命 {s.hp} · 攻击 {s.atk} · 防御 {s.def} · 间隔 {(s.attackIntervalMs / 1000).toFixed(1)} 秒
                </span>
              </div>
            </div>
            {s.mechanicsInfo.length > 0 && (
              <div className="ht-mech-row">
                {s.mechanicsInfo.map((m) => (
                  <span key={m.id} className="ht-mech-tag" title={m.desc}>
                    {m.label}
                  </span>
                ))}
              </div>
            )}
            <div className="ht-stage-foot">
              <span className="ht-reward">
                <T1Art kind="skills" id="honor_medal" className="ac-badge-icon" fallback="" alt="" />
                勋章 +{s.reward.base}
                {s.reward.fullClear ? ` · 全通 +${t.fullClearBonus}` : ''}
              </span>
              <span className={`ht-preview ${s.cleared ? 'done' : s.preview?.won ? 'win' : 'lose'}`} data-testid={`paladin-preview-${s.stage}`}>
                {s.cleared
                  ? '本周已通关'
                  : s.preview
                    ? s.preview.won
                      ? `预演：胜 · 剩余生命 ${s.preview.playerHpLeft}/${s.preview.playerMaxHp} · ${formatDuelDuration(s.preview.durationMs)}`
                      : s.preview.timeout
                        ? `预演：10 分钟未分胜负（判负）`
                        : `预演：落败 · 幻影剩余 ${s.preview.enemyHpLeft}/${s.preview.enemyMaxHp}`
                    : ''}
              </span>
            </div>
            {s.isNext && (
              <button
                type="button"
                data-testid="paladin-challenge-btn"
                className="prog-claim-btn af-action-btn ht-challenge-btn"
                disabled={t.attemptsLeft <= 0 || Boolean(busyKey)}
                onClick={() => handleChallenge(s)}
              >
                <T1Art kind="skills" id="trial_banner" className="ac-badge-icon" fallback="" alt="" />
                {busyKey === `challenge:${s.stage}` ? '试炼中…' : t.attemptsLeft > 0 ? `挑战第 ${s.stage} 关` : '本周次数已用完'}
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="ac-rack-title">圣骑士誓言（花荣誉勋章升阶；第 n 阶需荣誉位阶 ≥ n-1，满 5 阶即达封顶）</div>
      <div className="ht-virtue-grid" data-testid="paladin-virtues">
        {t.virtues.map((v) => (
          <div key={v.id} data-testid={`paladin-virtue-${v.id}`} className={`ht-virtue-card ${v.rank >= v.maxRank ? 'maxed' : ''}`}>
            <div className="ht-virtue-head">
              <T1Art kind="skills" id="honor_medal" className="ht-virtue-icon" fallback="" alt="" />
              <div className="ht-virtue-title">
                <strong>{v.name}</strong>
                <span>
                  第 {v.rank} / {v.maxRank} 阶
                </span>
              </div>
            </div>
            <span className="ht-virtue-desc">{v.description}</span>
            <div className="ht-pips">
              {Array.from({ length: v.maxRank }, (_, i) => (
                <span key={i} className={`ht-pip ${i < v.rank ? 'on' : ''}`} />
              ))}
            </div>
            <span className="ht-virtue-stats">
              当前：{formatPaladinStats(v.stats).join(' · ') || '无'} · 每阶 {formatPaladinStats(v.perRank).join(' · ')}
            </span>
            <button
              type="button"
              data-testid={`paladin-virtue-btn-${v.id}`}
              className="prog-claim-btn af-action-btn ht-virtue-btn"
              disabled={!v.canUpgrade || Boolean(busyKey)}
              onClick={() => handleVirtue(v)}
            >
              <T1Art kind="skills" id="honor_medal" className="ac-badge-icon" fallback="" alt="" />
              {busyKey === `virtue:${v.id}` ? '宣誓中…' : v.canUpgrade ? `升至第 ${v.nextRank} 阶 · ${v.cost} 勋章` : v.block || '暂不可升阶'}
            </button>
          </div>
        ))}
      </div>

      <div className="ht-rank-row" data-testid="paladin-ranks">
        {t.honor.ranks.map((r) => (
          <span key={r.rank} className={`ht-rank-chip ${r.reached ? 'reached' : ''} ${t.honor.rank === r.rank ? 'current' : ''}`}>
            {r.name} · {r.minMedals}
          </span>
        ))}
      </div>
      <div className="tv-rule-note">
        幻影属性取自真实魔物并乘本周倍率；对决与天空竞技场规则相同（满血、不含临时增益、10 分钟未分胜负判负），预演与实战结果一致。
        历史最佳第 {t.bestStage} 关 · 全通 {t.weeksFullCleared} 周 · 胜 {t.totalWins} / 负 {t.totalLosses}。
        {t.lastDuel
          ? ` 最近一战：第 ${t.lastDuel.stage} 关「${t.lastDuel.opponentName}」${t.lastDuel.won ? `胜，勋章 +${t.lastDuel.medals}` : '负'}。`
          : ''}
      </div>
    </div>
  );
}

/* ============================================================================
   矮人地底矿脉 & 精灵林地驿站 (WL-17)
   并入酒馆面板的两个分页（另有「生涯 → 远期」入口直达）；顶栏胶囊数不变。
   ============================================================================ */

interface MineForgeUse {
  actionId: string;
  name: string;
  level: number;
}

interface MineLayerView {
  layer: number;
  name: string;
  description: string;
  meters: number;
  ores: Array<{ id: string; name: string; have: number; smelt: MineForgeUse | null }>;
  byproduct: { id: string; name: string; have: number; forge: MineForgeUse | null };
  minMiningLevel: number;
  baseMinutes: number;
  durationMs: number;
  vein: {
    layer: number;
    oreId: string;
    oreName: string;
    grade: MineGradeId;
    gradeName: string;
    yieldPct: number;
    byproductId: string;
    byproductName: string;
    byproduct: number;
  };
  yield: { oreId: string; oreQty: number; byproductId: string; byproductQty: number; grade: MineGradeId; gradeName: string } | null;
  reached: boolean;
  levelOk: boolean;
  haulsUsed: number;
  haulsLeft: number;
  canHaul: boolean;
  block: string | null;
}

interface MineUpgradeView {
  level: number;
  name: string;
  maxLevel: number;
  materials: Array<{ itemId: string; name: string; need: number; have: number }>;
  canUpgrade: boolean;
  block: string | null;
}

interface ElfCommissionBase {
  slot: number;
  id: string;
  client: string;
  favor: number;
  gold: number;
  minTier: number;
  done: boolean;
  canDeliver: boolean;
  fullBoard: boolean;
  block: string | null;
}

interface ElfGatherCommissionView extends ElfCommissionBase {
  kind: 'gather';
  itemId: string;
  itemName: string;
  actionId: string;
  actionName: string;
  skillName: string;
  level: number;
  qty: number;
  have: number;
}

interface ElfExpeditionCommissionView extends ElfCommissionBase {
  kind: 'expedition';
  sourceId: ElfExpeditionSourceId;
  sourceName: string;
  source: string;
  artId: string;
  unit: string;
  target: number;
  progress: number;
  current: number;
  base: number;
}

type ElfCommissionView = ElfGatherCommissionView | ElfExpeditionCommissionView;

interface DwarfElfInfo {
  nowMs: number;
  bonuses: ElfWaystationBonuses;
  mine: {
    dayKey: string;
    dayEndsAtMs: number;
    gold: number;
    miningLevel: number;
    depth: MineUpgradeView & {
      meters: number;
      next: { level: number; name: string; costGold: number; meters: number } | null;
      steps: Array<{ level: number; name: string; reached: boolean }>;
    };
    cart: MineUpgradeView & {
      capacity: number;
      speedPct: number;
      next: { level: number; name: string; capacity: number; speedPct: number; costGold: number } | null;
      steps: Array<{ level: number; name: string; capacity: number; reached: boolean }>;
    };
    layers: MineLayerView[];
    haul: {
      layer: number;
      layerName: string;
      dayKey: string;
      startedAtMs: number;
      returnsAtMs: number;
      oreId: string;
      oreName: string;
      oreQty: number;
      grade: MineGradeId;
      gradeName: string;
      byproductId: string;
      byproductName: string;
      byproductQty: number;
    } | null;
    haulsPerLayer: number;
    haulsToday: number;
    totals: { hauls: number; ore: number; byproduct: number; bonanza: number };
    lastHaul: {
      layer: number;
      layerName: string;
      oreName: string;
      oreQty: number;
      gradeName: string;
      byproductName: string;
      byproductQty: number;
      at: string;
    } | null;
  };
  elf: {
    dayKey: string;
    dayEndsAtMs: number;
    gold: number;
    boardTier: number;
    boardTierName: string;
    favor: {
      total: number;
      tier: number;
      name: string;
      stats: ElfStats;
      next: { tier: number; name: string; minFavor: number; stats: ElfStats } | null;
      progressPct: number;
      tiers: Array<{ tier: number; name: string; minFavor: number; stats: ElfStats; reached: boolean }>;
    };
    commissions: ElfCommissionView[];
    completedCount: number;
    boardSize: number;
    fullBoardBonus: number;
    sources: Array<{ id: ElfExpeditionSourceId; name: string; source: string; artId: string; unit: string; current: number; base: number }>;
    caps: Required<ElfStats>;
    totals: { commissions: number; fullBoards: number; gold: number };
    lastCommission: { client: string; name: string; favor: number; gold: number; at: string } | null;
  };
}

function DwarfElfView({ view, onChange }: { view: 'mine' | 'waystation'; onChange?: () => void }) {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [info, setInfo] = useState<DwarfElfInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  // 服务器时钟偏移：换日 / 回矿倒计时按「服务器 nowMs + 本地流逝」推算
  const [clientAnchor, setClientAnchor] = useState(() => Date.now());
  const [tick, setTick] = useState(() => Date.now());
  const returnReloadRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      apiClient.clearCache();
      const res: any = await apiClient.getDwarfElf();
      setInfo(res);
      setClientAnchor(Date.now());
      return res as DwarfElfInfo;
    } catch (e: any) {
      toastRef.current.error(e?.message || '加载矮人地底矿脉与精灵林地驿站失败');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const hauling = Boolean(info?.mine.haul);
  useEffect(() => {
    const t = window.setInterval(() => setTick(Date.now()), hauling ? 1_000 : 15_000);
    return () => window.clearInterval(t);
  }, [hauling]);

  const serverNow = info ? info.nowMs + Math.max(0, tick - clientAnchor) : 0;
  const haul = info?.mine.haul ?? null;
  const haulLeft = haul ? Math.max(0, haul.returnsAtMs - serverNow) : 0;
  // 到点后由服务器结算回矿（显式 now）：每趟出车只自动刷新一次
  useEffect(() => {
    if (!haul || haulLeft > 0 || loading) return;
    if (returnReloadRef.current === haul.returnsAtMs) return;
    returnReloadRef.current = haul.returnsAtMs;
    void load();
  }, [haul, haulLeft, loading, load]);

  const runAction = async (key: string, call: () => Promise<any>, onOk: (res: any) => void, failText: string) => {
    setBusyKey(key);
    try {
      const res: any = await call();
      if (res?.mine?.mine) {
        setInfo(res.mine);
        setClientAnchor(Date.now());
      } else {
        await load();
      }
      onOk(res);
      onChange?.();
    } catch (e: any) {
      toastRef.current.error(e?.message || failText);
      await load();
    } finally {
      setBusyKey(null);
    }
  };

  if (loading && !info) return <div className="prog-empty">正在点亮矿灯、推开林地驿站的木门…</div>;
  if (!info) return <div className="prog-empty">暂无矮人地底矿脉与精灵林地驿站数据</div>;

  const m = info.mine;
  const e = info.elf;
  const dayIndex = mineDayIndexFromKey(m.dayKey) ?? 0;
  const elfDayIndex = mineDayIndexFromKey(e.dayKey) ?? 0;
  const mineDayLeft = Math.max(0, m.dayEndsAtMs - serverNow);
  const elfDayLeft = Math.max(0, e.dayEndsAtMs - serverNow);
  const haulsMap: Record<string, number> = Object.fromEntries(m.layers.map((l) => [String(l.layer), l.haulsUsed]));
  const tomorrow = getMineVeinMap(dayIndex + 1);
  const haulPct = haul
    ? Math.min(100, Math.max(0, Math.round(((serverNow - haul.startedAtMs) * 100) / Math.max(1, haul.returnsAtMs - haul.startedAtMs))))
    : 0;
  const bonusChips = formatElfStats(info.bonuses);
  const capLine = formatElfStats(e.caps).join(' · ');

  const handleHaul = (l: MineLayerView) =>
    runAction(
      `haul:${l.layer}`,
      () => apiClient.dispatchMineCart({ layer: l.layer, dayKey: m.dayKey }),
      (res) =>
        toastRef.current.success(
          `矿车下到第 ${l.layer} 层「${l.name}」，${formatAirshipDuration(res?.haul?.durationMs ?? l.durationMs)}后带回「${l.vein.oreName}」×${
            res?.haul?.oreQty ?? l.yield?.oreQty ?? ''
          }`
        ),
      '派矿车失败'
    );
  const handleDepth = () =>
    runAction(
      'depth',
      () => apiClient.upgradeMineDepth(),
      (res) => toastRef.current.success(`矿道掘进到第 ${res?.depth?.depth ?? ''} 层`),
      '矿道掘进失败'
    );
  const handleCart = () =>
    runAction(
      'cart',
      () => apiClient.upgradeMineCart(),
      (res) => toastRef.current.success(`矿车升级完成：每车 ${res?.cart?.capacity ?? ''} 块`),
      '矿车升级失败'
    );
  const handleCommission = (c: ElfCommissionView) =>
    runAction(
      `commission:${c.slot}`,
      () => apiClient.deliverElfCommission({ slot: c.slot, dayKey: e.dayKey }),
      (res) => {
        const r = res?.commission;
        const gain = (r?.favor ?? c.favor) + (r?.bonusFavor ?? 0);
        toastRef.current.success(
          `完成「${c.client}」的委托：林地好感 +${gain}${r?.bonusFavor ? '（今日全清）' : ''}，金币 +${r?.gold ?? c.gold}${r?.tierUp ? '，好感等级提升！' : ''}`
        );
      },
      '交付委托失败'
    );

  if (view === 'mine') {
    return (
      <div className="dm-view" data-testid="mine-view">
        <div className="hw-hero-card dm-hero-card">
          <div className="hw-hero-top">
            <div className="hw-hero-emblem dm-hero-emblem">
              <T1Art kind="skills" id="dwarf_mine" className="hw-hero-core-icon" fallback="" alt="矮人地底矿脉" />
            </div>
            <div className="dm-hero-copy">
              <div className="ac-hero-title-row">
                <span className="hw-hero-title" data-testid="mine-depth-name">
                  矿道 {m.depth.level} 层 · {m.depth.name}
                </span>
                <span className="qm-equipped-pill" title="矿道深度、矿车与累计记录转生永久保留">
                  转生保留
                </span>
              </div>
              <div className="dm-hero-meta">
                <span data-testid="mine-status">
                  {haul
                    ? `矿车在第 ${haul.layer} 层「${haul.layerName}」· ${haulLeft > 0 ? `还有 ${formatAirshipDuration(haulLeft)}回到井口` : '正在出井…'}`
                    : '矿车停在井口'}
                </span>
                <span className="dm-day-line">
                  {formatAcademyCountdown(mineDayLeft)}后换新矿脉 · 竖井深 {m.depth.meters} 米 · 铁匠采矿 Lv.{m.miningLevel}
                </span>
              </div>
              <div className="ct-rep-bar dm-depth-bar">
                <div className="ct-rep-bar-fill dm-depth-fill" style={{ width: `${Math.round((m.depth.level * 100) / Math.max(1, m.depth.maxLevel))}%` }} />
              </div>
            </div>
          </div>
          <div className="ac-wallet-badges dm-wallet-row">
            <span className="ac-wallet-badge dm-gold-badge">
              <T1Art kind="ui" id="gold" className="ac-badge-icon" fallback="" alt="" />
              金币 <strong data-testid="mine-gold">{m.gold}</strong>
            </span>
            <span className="ac-wallet-badge dm-cart-badge">
              <T1Art kind="skills" id="mine_cart" className="ac-badge-icon" fallback="" alt="" />
              {m.cart.name} · 每车 <strong data-testid="mine-cart-capacity">{m.cart.capacity}</strong> 块
            </span>
            <span className="ac-wallet-badge dm-vein-badge">
              <T1Art kind="skills" id="ore_vein" className="ac-badge-icon" fallback="" alt="" />
              今日出车 <strong data-testid="mine-hauls-today">{m.haulsToday}</strong> 车
            </span>
            <span className="ac-wallet-badge dm-total-badge">
              <T1Art kind="skills" id="dwarf_mine" className="ac-badge-icon" fallback="" alt="" />
              累计 {m.totals.hauls} 车 · 矿石 {m.totals.ore} 块 · 极品 {m.totals.bonanza} 次
            </span>
          </div>
        </div>

        {haul && (
          <div className="dm-haul-banner" data-testid="mine-haul">
            <T1Art kind="skills" id="mine_cart" className="dm-haul-icon" fallback="" alt="" />
            <div className="dm-haul-copy">
              <strong>
                第 {haul.layer} 层「{haul.layerName}」· {haul.gradeName}「{haul.oreName}」
              </strong>
              <span>
                预计带回「{haul.oreName}」×{haul.oreQty}
                {haul.byproductQty > 0 ? `、伴生「${haul.byproductName}」×${haul.byproductQty}` : ''} ·{' '}
                {haulLeft > 0 ? `还有 ${formatAirshipDuration(haulLeft)}回到井口` : '正在出井…'}
              </span>
              <div className="ct-rep-bar dm-haul-bar">
                <div className="ct-rep-bar-fill dm-haul-fill" style={{ width: `${haulPct}%` }} />
              </div>
            </div>
          </div>
        )}

        <div className="ac-rack-title">
          今日矿脉（每层每日 {m.haulsPerLayer} 车，矿石与伴生材料直接入背包）
        </div>
        <div className="dm-layer-grid" data-testid="mine-layers">
          {m.layers.map((l) => {
            const probe = planMineHaul(dayIndex, l.layer, m.depth.level, m.cart.level, m.miningLevel, haulsMap, Boolean(haul));
            const canHaul = probe.ok && l.canHaul;
            const ore = l.ores.find((o) => o.id === l.vein.oreId) ?? l.ores[0];
            const next = tomorrow[l.layer - 1];
            const nextOre = l.ores.find((o) => o.id === next?.oreId);
            const key = `haul:${l.layer}`;
            return (
              <div
                key={l.layer}
                data-testid={`mine-layer-${l.layer}`}
                className={`dm-layer-card ${l.reached ? 'reached' : 'locked'} ${l.reached && l.levelOk ? '' : 'dim'} grade-${mineGradeTone(l.vein.grade)}`}
              >
                <div className="dm-layer-head">
                  <T1ItemIcon itemId={l.vein.oreId} className="dm-ore-icon" fallback="" alt={l.vein.oreName} />
                  <div className="dm-layer-title">
                    <strong>
                      第 {l.layer} 层 · {l.name}
                    </strong>
                    <span>
                      深 {l.meters} 米 · 需采矿 Lv.{l.minMiningLevel}
                    </span>
                  </div>
                </div>
                <span className={`dm-grade-chip ${mineGradeTone(l.vein.grade)}`} data-testid={`mine-grade-${l.layer}`}>
                  <T1Art kind="skills" id="ore_vein" className="ac-badge-icon" fallback="" alt="" />
                  {l.vein.oreName} · {formatMineGrade(l.vein.grade)}
                </span>
                <span className="dm-layer-desc">{l.description}</span>
                <span className="dm-layer-meta">
                  每车 ×{l.yield?.oreQty ?? 0}
                  {(l.yield?.byproductQty ?? 0) > 0 ? ` + 伴生「${l.byproduct.name}」×${l.yield?.byproductQty}` : ''} · 出车 {formatAirshipDuration(l.durationMs)}
                </span>
                <div className="as-mat-row">
                  <span className="as-mini-chip">
                    <T1ItemIcon itemId={ore.id} className="ac-badge-icon" fallback="" alt="" />
                    {ore.smelt ? `冶炼「${ore.smelt.name}」Lv.${ore.smelt.level}` : ore.name} · 背包 {ore.have}
                  </span>
                  <span className="as-mini-chip" title={l.byproduct.forge ? `用于锻造「${l.byproduct.forge.name}」` : undefined}>
                    <T1ItemIcon itemId={l.byproduct.id} className="ac-badge-icon" fallback="" alt="" />
                    伴生「{l.byproduct.name}」· 背包 {l.byproduct.have}
                  </span>
                </div>
                <span className="dm-layer-next">
                  明日预告：{next ? `${next.gradeName}「${nextOre?.name ?? next.oreId}」` : '—'}
                </span>
                <button
                  type="button"
                  data-testid={`mine-haul-btn-${l.layer}`}
                  className="prog-claim-btn af-action-btn dm-haul-btn"
                  disabled={!canHaul || Boolean(busyKey)}
                  onClick={() => handleHaul(l)}
                >
                  <T1Art kind="skills" id="mine_cart" className="ac-badge-icon" fallback="" alt="" />
                  {busyKey === key ? '下井中…' : canHaul ? `派矿车下井（剩 ${l.haulsLeft} 车）` : l.block || '暂不可出车'}
                </button>
              </div>
            );
          })}
        </div>

        <div className="ac-rack-title">矿道与矿车（矿车在井下时不能升级）</div>
        <div className="dm-upgrade-grid">
          <div className="dm-upgrade-card" data-testid="mine-depth">
            <div className="dm-upgrade-emblem">
              <T1Art kind="skills" id="dwarf_mine" className="dm-upgrade-icon" fallback="" alt="矿道掘进" />
            </div>
            <div className="dm-upgrade-copy">
              <strong>
                矿道「{m.depth.name}」第 {m.depth.level} / {m.depth.maxLevel} 层 · 深 {m.depth.meters} 米
              </strong>
              {m.depth.next ? (
                <>
                  <span className="dm-upgrade-next">
                    掘进到「{m.depth.next.name}」：可下到第 {m.depth.next.level} 层（深 {m.depth.next.meters} 米）
                  </span>
                  <div className="as-mat-row">
                    <span className={`as-mat-chip ${m.gold >= m.depth.next.costGold ? 'ok' : 'short'}`}>
                      <T1Art kind="ui" id="gold" className="ac-badge-icon" fallback="" alt="" />
                      {m.depth.next.costGold}
                    </span>
                    {m.depth.materials.map((x) => (
                      <span key={x.itemId} className={`as-mat-chip ${x.have >= x.need ? 'ok' : 'short'}`}>
                        <T1ItemIcon itemId={x.itemId} className="ac-badge-icon" fallback="" alt="" />
                        {x.name} {x.have}/{x.need}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <span className="dm-upgrade-next">矿道已掘进到世界之底</span>
              )}
              <div className="as-hull-steps">
                {m.depth.steps.map((d) => (
                  <span key={d.level} className={`as-hull-step ${d.reached ? 'reached' : ''} ${d.level === m.depth.level ? 'current' : ''}`}>
                    {d.level} 层 {d.name}
                  </span>
                ))}
              </div>
            </div>
            <button
              type="button"
              data-testid="mine-depth-btn"
              className="prog-claim-btn af-action-btn dm-depth-btn"
              disabled={!m.depth.canUpgrade || Boolean(busyKey)}
              onClick={handleDepth}
            >
              <T1Art kind="skills" id="dwarf_mine" className="ac-badge-icon" fallback="" alt="" />
              {busyKey === 'depth' ? '掘进中…' : m.depth.canUpgrade ? '掘进矿道' : m.depth.block || '暂不可掘进'}
            </button>
          </div>
          <div className="dm-upgrade-card" data-testid="mine-cart">
            <div className="dm-upgrade-emblem">
              <T1Art kind="skills" id="mine_cart" className="dm-upgrade-icon" fallback="" alt="矮人矿车" />
            </div>
            <div className="dm-upgrade-copy">
              <strong>
                「{m.cart.name}」Lv.{m.cart.level} · 每车 {m.cart.capacity} 块 · 出车 -{m.cart.speedPct}%
              </strong>
              {m.cart.next ? (
                <>
                  <span className="dm-upgrade-next">
                    下一级「{m.cart.next.name}」：每车 {m.cart.next.capacity} 块 · 出车 -{m.cart.next.speedPct}%
                  </span>
                  <div className="as-mat-row">
                    <span className={`as-mat-chip ${m.gold >= m.cart.next.costGold ? 'ok' : 'short'}`}>
                      <T1Art kind="ui" id="gold" className="ac-badge-icon" fallback="" alt="" />
                      {m.cart.next.costGold}
                    </span>
                    {m.cart.materials.map((x) => (
                      <span key={x.itemId} className={`as-mat-chip ${x.have >= x.need ? 'ok' : 'short'}`}>
                        <T1ItemIcon itemId={x.itemId} className="ac-badge-icon" fallback="" alt="" />
                        {x.name} {x.have}/{x.need}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <span className="dm-upgrade-next">矿车已是最高等级</span>
              )}
              <div className="as-hull-steps">
                {m.cart.steps.map((c) => (
                  <span key={c.level} className={`as-hull-step ${c.reached ? 'reached' : ''} ${c.level === m.cart.level ? 'current' : ''}`}>
                    Lv.{c.level} {c.name} · {c.capacity} 块
                  </span>
                ))}
              </div>
            </div>
            <button
              type="button"
              data-testid="mine-cart-btn"
              className="prog-claim-btn af-action-btn dm-cart-btn"
              disabled={!m.cart.canUpgrade || Boolean(busyKey)}
              onClick={handleCart}
            >
              <T1Art kind="skills" id="mine_cart" className="ac-badge-icon" fallback="" alt="" />
              {busyKey === 'cart' ? '改装中…' : m.cart.canUpgrade ? '升级矿车' : m.cart.block || '暂不可升级'}
            </button>
          </div>
        </div>
        <div className="tv-rule-note">
          矿脉每天东八区 0 点轮换（全服相同）。品位产量：贫 70% / 中 100% / 富 135% / 极品 180%，富矿与极品另带伴生锻造材料。
          矿道、矿车与累计记录转生永久保留，但深层仍需本世的铁匠采矿等级；在途矿车的矿石转生时散去。
          {m.lastHaul
            ? ` 最近一车：第 ${m.lastHaul.layer} 层「${m.lastHaul.layerName}」${m.lastHaul.gradeName}，带回「${m.lastHaul.oreName}」×${m.lastHaul.oreQty}${
                m.lastHaul.byproductQty > 0 ? `、「${m.lastHaul.byproductName}」×${m.lastHaul.byproductQty}` : ''
              }。`
            : ''}
        </div>
      </div>
    );
  }

  return (
    <div className="ew-view" data-testid="elf-waystation-view">
      <div className="hw-hero-card ew-hero-card">
        <div className="hw-hero-top">
          <div className="hw-hero-emblem ew-hero-emblem">
            <T1Art kind="skills" id="elf_waystation" className="hw-hero-core-icon" fallback="" alt="精灵林地驿站" />
          </div>
          <div className="ew-hero-copy">
            <div className="ac-hero-title-row">
              <span className="hw-hero-title" data-testid="elf-favor-name">
                林地好感 · {e.favor.name}
              </span>
              <span className="qm-equipped-pill" title="林地好感只增不减、转生永久保留">
                转生保留
              </span>
            </div>
            <div className="ew-hero-meta">
              <span>
                {e.favor.next ? `距「${e.favor.next.name}」还差 ${e.favor.next.minFavor - e.favor.total} 好感` : '好感已满'} · 累计完成委托{' '}
                {e.totals.commissions} 张（全清 {e.totals.fullBoards} 天）
              </span>
              <span className="ew-day-line">{formatAcademyCountdown(elfDayLeft)}后换新委托</span>
            </div>
            <div className="ct-rep-bar ew-favor-bar">
              <div className="ct-rep-bar-fill ew-favor-fill" style={{ width: `${e.favor.progressPct}%` }} />
            </div>
          </div>
        </div>
        <div className="ac-wallet-badges ew-wallet-row">
          <span className="ac-wallet-badge ew-favor-badge">
            <T1Art kind="skills" id="elf_favor" className="ac-badge-icon" fallback="" alt="" />
            林地好感 <strong data-testid="elf-favor-total">{e.favor.total}</strong>
          </span>
          <span className="ac-wallet-badge ew-board-badge">
            <T1Art kind="skills" id="forest_commission" className="ac-badge-icon" fallback="" alt="" />
            今日委托 <strong data-testid="elf-completed">{e.completedCount}</strong> / {e.boardSize}
          </span>
          <span className="ac-wallet-badge ew-gold-badge">
            <T1Art kind="ui" id="gold" className="ac-badge-icon" fallback="" alt="" />
            金币 <strong>{e.gold}</strong>
          </span>
          <span className="ac-wallet-badge ew-bonus-badge" data-testid="elf-bonuses">
            <T1Art kind="skills" id="elf_waystation" className="ac-badge-icon" fallback="" alt="" />
            {bonusChips.length > 0 ? bonusChips.join(' · ') : '提升好感解锁采集加成'}
          </span>
        </div>
      </div>

      <div className="ac-rack-title">
        今日委托板（按「{e.boardTierName}」张贴；全部完成额外 +{e.fullBoardBonus} 好感）
      </div>
      <div className="ew-board" data-testid="elf-board">
        {e.commissions.map((c) => {
          const probe = planElfCommission(
            elfDayIndex,
            e.boardTier,
            c.slot,
            e.commissions.filter((x) => x.done).map((x) => x.slot),
            c.kind === 'gather' ? { [c.itemId]: c.have } : {},
            c.kind === 'expedition' ? { [c.sourceId]: c.current } : {},
            c.kind === 'expedition' ? { [c.sourceId]: c.base } : {}
          );
          const canDeliver = probe.ok && c.canDeliver;
          const need = c.kind === 'gather' ? c.qty : c.target;
          const have = c.kind === 'gather' ? c.have : c.progress;
          const pct = Math.min(100, Math.round((Math.min(have, need) * 100) / Math.max(1, need)));
          const key = `commission:${c.slot}`;
          return (
            <div
              key={c.slot}
              data-testid={`elf-commission-${c.slot}`}
              className={`ew-commission-card ${c.kind} ${c.done ? 'done' : ''} ${canDeliver ? 'ready' : ''}`}
            >
              <div className="ew-commission-head">
                {c.kind === 'gather' ? (
                  <T1ItemIcon itemId={c.itemId} className="ew-commission-icon" fallback="" alt={c.itemName} />
                ) : (
                  <T1Art kind="skills" id={c.artId} className="ew-commission-icon" fallback="" alt={c.sourceName} />
                )}
                <div className="ew-commission-title">
                  <span className="ew-client">
                    {c.kind === 'gather' ? '采集委托' : '远征委托'} · {c.client}
                  </span>
                  <strong>{c.kind === 'gather' ? `交付「${c.itemName}」×${c.qty}` : `${c.sourceName} ×${c.target} ${c.unit}`}</strong>
                </div>
              </div>
              <span className="ew-commission-meta">
                {c.kind === 'gather'
                  ? `${c.skillName.replace(/技能$/, '')}「${c.actionName}」Lv.${c.level} · 背包 ${c.have}/${c.qty}`
                  : `${c.source} · 进度 ${c.progress}/${c.target}`}
              </span>
              <div className="ct-rep-bar ew-commission-bar">
                <div className="ct-rep-bar-fill ew-commission-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="as-mat-row">
                <span className="as-mini-chip ew-reward-chip">
                  <T1Art kind="skills" id="elf_favor" className="ac-badge-icon" fallback="" alt="" />
                  好感 +{c.favor}
                  {c.fullBoard ? ` +${e.fullBoardBonus}（全清）` : ''}
                </span>
                <span className="as-mini-chip ew-reward-chip">
                  <T1Art kind="ui" id="gold" className="ac-badge-icon" fallback="" alt="" />
                  金币 +{c.gold}
                </span>
              </div>
              <button
                type="button"
                data-testid={`elf-deliver-btn-${c.slot}`}
                className="prog-claim-btn af-action-btn ew-deliver-btn"
                disabled={!canDeliver || Boolean(busyKey)}
                onClick={() => handleCommission(c)}
              >
                <T1Art kind="skills" id="forest_commission" className="ac-badge-icon" fallback="" alt="" />
                {busyKey === key ? '交付中…' : c.done ? '已完成' : canDeliver ? (c.kind === 'gather' ? '交付委托' : '领取远征委托') : c.block || '暂不可交付'}
              </button>
            </div>
          );
        })}
      </div>

      <div className="ac-rack-title">林地好感等级（加成只作用于采集行动）</div>
      <div className="ew-tier-grid" data-testid="elf-tiers">
        {e.favor.tiers.map((t) => {
          const chips = formatElfStats(t.stats);
          return (
            <div key={t.tier} className={`ew-tier-card ${t.reached ? 'reached' : ''} ${t.tier === e.favor.tier ? 'current' : ''}`}>
              <div className="ew-tier-head">
                <T1Art kind="skills" id="elf_favor" className="ac-badge-icon" fallback="" alt="" />
                <strong>{t.name}</strong>
              </div>
              <span className="ew-tier-need">好感 {t.minFavor}</span>
              <span className="ew-tier-stats">
                {chips.length > 0 ? chips.map((line) => <span key={line}>{line}</span>) : <span>初次来访，暂无加成</span>}
              </span>
            </div>
          );
        })}
      </div>

      <div className="ac-rack-title">远征读数（委托板张贴时记下基线）</div>
      <div className="ew-source-row" data-testid="elf-sources">
        {e.sources.map((s) => (
          <span key={s.id} className="as-mini-chip ew-source-chip">
            <T1Art kind="skills" id={s.artId} className="ac-badge-icon" fallback="" alt="" />
            {s.source} · {s.name} {s.current} {s.unit}（今日基线 {s.base}）
          </span>
        ))}
      </div>
      <div className="tv-rule-note">
        委托板每天东八区 0 点按当时的好感等级换新；远征委托只计张贴后新完成的商队返航、遗迹勘探或飞艇抵港。林地好感只增不减、转生永久保留；好感加成封顶 {capLine}。
        {e.lastCommission
          ? ` 最近完成：「${e.lastCommission.client}」的委托 ${e.lastCommission.name}，好感 +${e.lastCommission.favor}、金币 +${e.lastCommission.gold}。`
          : ''}
      </div>
    </div>
  );
}

/* ============================ 深海遗迹潜航 & 冒险者行会公会战 (WL-18) ============================ */
// 并入酒馆面板的两个分页（顶栏不加胶囊）：遗迹层、海流、打捞品与氧气预算都来自前后端逐字对称的 abyssGuild 镜像，
// 公会战对手阵容由周序号确定性生成，挑战结果以服务器的竞技沙盒结算为准。

interface AbyssLayerView {
  layer: number;
  name: string;
  meters: number;
  description: string;
  minChefLevel: number;
  salvage: Array<{ id: string; name: string; have: number; use: string | null }>;
  ruin: { itemId: string; itemName: string; current: AbyssCurrentId; currentName: string; oxygenCost: number; qty: number };
  gearOk: boolean;
  levelOk: boolean;
  divesUsed: number;
  divesLeft: number;
  canDive: boolean;
  block: string | null;
}

interface GuildSeatView {
  seat: number;
  seatName: string;
  monsterId: string;
  name: string;
  foeName: string;
  level: number;
  hp: number;
  atk: number;
  def: number;
  attackIntervalMs: number;
  isBoss: boolean;
  medals: number;
  reward: number;
  cleared: boolean;
  isTarget: boolean;
  canChallenge: boolean;
  block: string | null;
}

interface AbyssGuildInfo {
  nowMs: number;
  bonuses: GuildWarBonuses;
  dive: {
    dayKey: string;
    dayEndsAtMs: number;
    gold: number;
    chefLevel: number;
    oxygen: { budget: number; used: number; left: number };
    divesPerLayer: number;
    gear: {
      level: number;
      name: string;
      oxygen: number;
      salvagePct: number;
      maxLayer: number;
      maxLevel: number;
      next: { level: number; name: string; oxygen: number; salvagePct: number; maxLayer: number; costGold: number } | null;
      materials: Array<{ itemId: string; name: string; need: number; have: number }>;
      canUpgrade: boolean;
      block: string | null;
      steps: Array<{ level: number; name: string; oxygen: number; reached: boolean }>;
    };
    layers: AbyssLayerView[];
    totals: { dives: number; salvage: number; deepest: number };
    lastDive: { layer: number; layerName: string; itemName: string; qty: number; currentName: string; oxygen: number; at: string } | null;
  };
  guild: {
    weekKey: string;
    weekEndsAtMs: number;
    rival: { id: string; name: string; motto: string; hpPct: number; atkPct: number; defPct: number; intervalPct: number };
    nextRival: { id: string; name: string };
    attemptsUsed: number;
    attemptsLeft: number;
    attemptsPerWeek: number;
    sweepBonus: number;
    clearedCount: number;
    seats: GuildSeatView[];
    rank: {
      totalMedals: number;
      rank: number;
      name: string;
      stats: GuildStats;
      next: { rank: number; name: string; minMedals: number; stats: GuildStats } | null;
      progressPct: number;
      ranks: Array<{ rank: number; name: string; minMedals: number; stats: GuildStats; reached: boolean }>;
    };
    caps: Required<GuildStats>;
    totals: { duels: number; wins: number; sweeps: number };
    lastDuel: { seat: number; opponentName: string; won: boolean; timeout: boolean; medals: number; at: string } | null;
  };
}

function AbyssGuildView({ view, onChange }: { view: 'dive' | 'guildwar'; onChange?: () => void }) {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [info, setInfo] = useState<AbyssGuildInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  // 服务器时钟偏移：换日 / 翻周倒计时按「服务器 nowMs + 本地流逝」推算
  const [clientAnchor, setClientAnchor] = useState(() => Date.now());
  const [tick, setTick] = useState(() => Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      apiClient.clearCache();
      const res: any = await apiClient.getAbyssGuild();
      setInfo(res);
      setClientAnchor(Date.now());
      return res as AbyssGuildInfo;
    } catch (e: any) {
      toastRef.current.error(e?.message || '加载深海遗迹潜航与冒险者行会公会战失败');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const t = window.setInterval(() => setTick(Date.now()), 15_000);
    return () => window.clearInterval(t);
  }, []);

  const runAction = async (key: string, call: () => Promise<any>, onOk: (res: any) => void, failText: string) => {
    setBusyKey(key);
    try {
      const res: any = await call();
      if (res?.abyss?.dive) {
        setInfo(res.abyss);
        setClientAnchor(Date.now());
      } else {
        await load();
      }
      onOk(res);
      onChange?.();
    } catch (e: any) {
      toastRef.current.error(e?.message || failText);
      await load();
    } finally {
      setBusyKey(null);
    }
  };

  if (loading && !info) return <div className="prog-empty">正在检查潜水装备、翻开公会战对阵表…</div>;
  if (!info) return <div className="prog-empty">暂无深海遗迹潜航与冒险者行会公会战数据</div>;

  const d = info.dive;
  const g = info.guild;
  const serverNow = info.nowMs + Math.max(0, tick - clientAnchor);
  const dayIndex = abyssDayIndexFromKey(d.dayKey) ?? 0;
  const weekIndex = guildWarWeekIndexFromKey(g.weekKey) ?? 0;
  const dayLeft = Math.max(0, d.dayEndsAtMs - serverNow);
  const weekLeft = Math.max(0, g.weekEndsAtMs - serverNow);
  const divesMap: Record<string, number> = Object.fromEntries(d.layers.map((l) => [String(l.layer), l.divesUsed]));
  const tomorrow = getAbyssRuinMap(dayIndex + 1);
  const oxygenPct = Math.round((d.oxygen.left * 100) / Math.max(1, d.oxygen.budget));
  const bonusChips = formatGuildStats(info.bonuses);
  const capLine = formatGuildStats(g.caps).join(' · ');

  const handleDive = (l: AbyssLayerView) =>
    runAction(
      `dive:${l.layer}`,
      () => apiClient.diveAbyssRuin({ layer: l.layer, dayKey: d.dayKey }),
      (res) =>
        toastRef.current.success(
          `下潜「${l.name}」：打捞到「${l.ruin.itemName}」×${res?.dive?.qty ?? l.ruin.qty}，消耗氧气 ${res?.dive?.oxygenCost ?? l.ruin.oxygenCost}`
        ),
      '下潜失败'
    );
  const handleGear = () =>
    runAction(
      'gear',
      () => apiClient.upgradeAbyssGear(),
      (res) => toastRef.current.success(`换上新潜装：每日氧气 ${res?.gear?.oxygen ?? ''}`),
      '潜水装备升级失败'
    );
  const handleChallenge = (s: GuildSeatView) =>
    runAction(
      `challenge:${s.seat}`,
      () => apiClient.challengeGuildWar({ seat: s.seat, weekKey: g.weekKey }),
      (res) => {
        const r = res?.challenge;
        if (r?.won) {
          toastRef.current.success(`击败「${s.name}」！行会勋章 +${r.medals}${r.sweep ? '（五席全胜）' : ''}${r.rankUp ? '，位阶提升！' : ''}`);
        } else {
          toastRef.current.info(`${r?.timeout ? '10 分钟未分胜负' : '落败'}：「${s.name}」，本周还剩 ${r?.attemptsLeft ?? ''} 次`);
        }
      },
      '公会战挑战失败'
    );

  if (view === 'dive') {
    return (
      <div className="ad-view" data-testid="abyss-dive-view">
        <div className="hw-hero-card ad-hero-card">
          <div className="hw-hero-top">
            <div className="hw-hero-emblem ad-hero-emblem">
              <T1Art kind="skills" id="abyss_dive" className="hw-hero-core-icon" fallback="" alt="深海遗迹潜航" />
            </div>
            <div className="ad-hero-copy">
              <div className="ac-hero-title-row">
                <span className="hw-hero-title" data-testid="abyss-gear-name">
                  潜装 Lv.{d.gear.level} · {d.gear.name}
                </span>
                <span className="qm-equipped-pill" title="潜水装备与累计记录转生永久保留">
                  转生保留
                </span>
              </div>
              <div className="ad-hero-meta">
                <span data-testid="abyss-oxygen-line">
                  可下潜到第 {d.gear.maxLayer} 层 · 打捞 ×{d.gear.salvagePct}% · 厨师 Lv.{d.chefLevel}
                </span>
                <span className="ad-day-line">{formatAcademyCountdown(dayLeft)}后遗迹换新、氧气补满</span>
              </div>
              <div className="ct-rep-bar ad-oxygen-bar">
                <div className="ct-rep-bar-fill ad-oxygen-fill" style={{ width: `${oxygenPct}%` }} />
              </div>
            </div>
          </div>
          <div className="ac-wallet-badges ad-wallet-row">
            <span className="ac-wallet-badge ad-oxygen-badge">
              <T1Art kind="skills" id="oxygen_tank" className="ac-badge-icon" fallback="" alt="" />
              氧气 <strong data-testid="abyss-oxygen-left">{d.oxygen.left}</strong> / {d.oxygen.budget}
            </span>
            <span className="ac-wallet-badge ad-gold-badge">
              <T1Art kind="ui" id="gold" className="ac-badge-icon" fallback="" alt="" />
              金币 <strong>{d.gold}</strong>
            </span>
            <span className="ac-wallet-badge ad-total-badge">
              <T1Art kind="skills" id="abyss_dive" className="ac-badge-icon" fallback="" alt="" />
              累计 <strong data-testid="abyss-total-dives">{d.totals.dives}</strong> 潜 · 打捞 {d.totals.salvage} 件
            </span>
          </div>
        </div>

        <div className="ac-rack-title">今日遗迹（每层每日 {d.divesPerLayer} 次，打捞品直接入背包）</div>
        <div className="dm-layer-grid ad-layer-grid" data-testid="abyss-layers">
          {d.layers.map((l) => {
            const probe = planAbyssDive(dayIndex, l.layer, d.gear.level, d.chefLevel, divesMap, d.oxygen.used);
            const canDive = probe.ok && l.canDive;
            const item = l.salvage.find((x) => x.id === l.ruin.itemId) ?? l.salvage[0];
            const next = tomorrow[l.layer - 1];
            const nextItem = l.salvage.find((x) => x.id === next?.itemId);
            const key = `dive:${l.layer}`;
            return (
              <div
                key={l.layer}
                data-testid={`abyss-layer-${l.layer}`}
                className={`dm-layer-card ad-layer-card ${l.gearOk ? 'reached' : 'locked'} ${l.gearOk && l.levelOk ? '' : 'dim'} current-${abyssCurrentTone(l.ruin.current)}`}
              >
                <div className="dm-layer-head">
                  <T1ItemIcon itemId={l.ruin.itemId} className="dm-ore-icon" fallback="" alt={l.ruin.itemName} />
                  <div className="dm-layer-title">
                    <strong>
                      第 {l.layer} 层 · {l.name}
                    </strong>
                    <span>
                      深 {l.meters} 米 · 需厨师 Lv.{l.minChefLevel}
                    </span>
                  </div>
                </div>
                <span className={`ad-current-chip ${abyssCurrentTone(l.ruin.current)}`} data-testid={`abyss-current-${l.layer}`}>
                  <T1Art kind="skills" id="oxygen_tank" className="ac-badge-icon" fallback="" alt="" />
                  {formatAbyssCurrent(l.ruin.current)}
                </span>
                <span className="dm-layer-desc">{l.description}</span>
                <span className="dm-layer-meta">
                  打捞「{l.ruin.itemName}」×{l.ruin.qty} · 氧气 {l.ruin.oxygenCost}
                </span>
                <div className="as-mat-row">
                  <span className="as-mini-chip" title={item.use ? `用于「${item.use}」` : undefined}>
                    <T1ItemIcon itemId={item.id} className="ac-badge-icon" fallback="" alt="" />
                    {item.use ? `用于「${item.use}」` : item.name} · 背包 {item.have}
                  </span>
                </div>
                <span className="dm-layer-next">明日预告：{next ? `${next.currentName}「${nextItem?.name ?? next.itemId}」` : '—'}</span>
                <button
                  type="button"
                  data-testid={`abyss-dive-btn-${l.layer}`}
                  className="prog-claim-btn af-action-btn ad-dive-btn"
                  disabled={!canDive || Boolean(busyKey)}
                  onClick={() => handleDive(l)}
                >
                  <T1Art kind="skills" id="abyss_dive" className="ac-badge-icon" fallback="" alt="" />
                  {busyKey === key ? '下潜中…' : canDive ? `下潜（剩 ${l.divesLeft} 次）` : l.block || '暂不可下潜'}
                </button>
              </div>
            );
          })}
        </div>

        <div className="ac-rack-title">潜水装备</div>
        <div className="dm-upgrade-grid ad-upgrade-grid">
          <div className="dm-upgrade-card" data-testid="abyss-gear">
            <div className="dm-upgrade-emblem">
              <T1Art kind="skills" id="diving_gear" className="dm-upgrade-icon" fallback="" alt="潜水装备" />
            </div>
            <div className="dm-upgrade-copy">
              <strong>
                「{d.gear.name}」Lv.{d.gear.level} / {d.gear.maxLevel} · 氧气 {d.gear.oxygen}
              </strong>
              {d.gear.next ? (
                <>
                  <span className="dm-upgrade-next">
                    下一级「{d.gear.next.name}」：氧气 {d.gear.next.oxygen} · 打捞 ×{d.gear.next.salvagePct}% · 可下到第 {d.gear.next.maxLayer} 层
                  </span>
                  <div className="as-mat-row">
                    <span className={`as-mat-chip ${d.gold >= d.gear.next.costGold ? 'ok' : 'short'}`}>
                      <T1Art kind="ui" id="gold" className="ac-badge-icon" fallback="" alt="" />
                      {d.gear.next.costGold}
                    </span>
                    {d.gear.materials.map((x) => (
                      <span key={x.itemId} className={`as-mat-chip ${x.have >= x.need ? 'ok' : 'short'}`}>
                        <T1ItemIcon itemId={x.itemId} className="ac-badge-icon" fallback="" alt="" />
                        {x.name} {x.have}/{x.need}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <span className="dm-upgrade-next">潜水装备已是最高等级</span>
              )}
              <div className="as-hull-steps">
                {d.gear.steps.map((s) => (
                  <span key={s.level} className={`as-hull-step ${s.reached ? 'reached' : ''} ${s.level === d.gear.level ? 'current' : ''}`}>
                    Lv.{s.level} {s.name}
                  </span>
                ))}
              </div>
            </div>
            <button
              type="button"
              data-testid="abyss-gear-btn"
              className="prog-claim-btn af-action-btn ad-gear-btn"
              disabled={!d.gear.canUpgrade || Boolean(busyKey)}
              onClick={handleGear}
            >
              <T1Art kind="skills" id="diving_gear" className="ac-badge-icon" fallback="" alt="" />
              {busyKey === 'gear' ? '换装中…' : d.gear.canUpgrade ? '升级潜水装备' : d.gear.block || '暂不可升级'}
            </button>
          </div>
        </div>
        <div className="tv-rule-note">
          遗迹每天东八区 0 点轮换（全服相同）。海流：平静 ×100% / 暗涌 氧气 ×125%、打捞 ×130% / 沉船潮 氧气 ×90%、打捞 ×160%。
          潜水装备与累计记录转生永久保留，但深层仍需本世的厨师（钓鱼）等级。
          {d.lastDive
            ? ` 最近一潜：第 ${d.lastDive.layer} 层「${d.lastDive.layerName}」${d.lastDive.currentName}，打捞「${d.lastDive.itemName}」×${d.lastDive.qty}。`
            : ''}
        </div>
      </div>
    );
  }

  return (
    <div className="gw-view" data-testid="guild-war-view">
      <div className="hw-hero-card gw-hero-card">
        <div className="hw-hero-top">
          <div className="hw-hero-emblem gw-hero-emblem">
            <T1Art kind="skills" id="guild_war" className="hw-hero-core-icon" fallback="" alt="冒险者行会公会战" />
          </div>
          <div className="gw-hero-copy">
            <div className="ac-hero-title-row">
              <span className="hw-hero-title" data-testid="guild-rank-name">
                行会位阶 · {g.rank.name}
              </span>
              <span className="qm-equipped-pill" title="行会勋章只增不减、转生永久保留">
                转生保留
              </span>
            </div>
            <div className="gw-hero-meta">
              <span>
                {g.rank.next ? `距「${g.rank.next.name}」还差 ${g.rank.next.minMedals - g.rank.totalMedals} 枚勋章` : '位阶已满'} · 累计胜 {g.totals.wins} 场
                {g.totals.sweeps > 0 ? `（全胜 ${g.totals.sweeps} 周）` : ''}
              </span>
              <span className="gw-week-line">
                {formatAcademyCountdown(weekLeft)}后换对手（下周：{g.nextRival.name}）
              </span>
            </div>
            <div className="ct-rep-bar gw-rank-bar">
              <div className="ct-rep-bar-fill gw-rank-fill" style={{ width: `${g.rank.progressPct}%` }} />
            </div>
          </div>
        </div>
        <div className="ac-wallet-badges gw-wallet-row">
          <span className="ac-wallet-badge gw-medal-badge">
            <T1Art kind="skills" id="guild_medal" className="ac-badge-icon" fallback="" alt="" />
            行会勋章 <strong data-testid="guild-medals">{g.rank.totalMedals}</strong>
          </span>
          <span className="ac-wallet-badge gw-attempt-badge">
            <T1Art kind="skills" id="rival_banner" className="ac-badge-icon" fallback="" alt="" />
            本周挑战 <strong data-testid="guild-attempts-left">{g.attemptsLeft}</strong> / {g.attemptsPerWeek}
          </span>
          <span className="ac-wallet-badge gw-bonus-badge" data-testid="guild-bonuses">
            <T1Art kind="skills" id="guild_war" className="ac-badge-icon" fallback="" alt="" />
            {bonusChips.length > 0 ? bonusChips.join(' · ') : '累积勋章解锁永久加成'}
          </span>
        </div>
      </div>

      <div className="gw-rival-card" data-testid="guild-rival">
        <T1Art kind="skills" id="rival_banner" className="gw-rival-icon" fallback="" alt="" />
        <div className="gw-rival-copy">
          <strong>本周对手：{g.rival.name}</strong>
          <span>
            {g.rival.motto} · 生命 ×{g.rival.hpPct}% · 攻击 ×{g.rival.atkPct}% · 防御 ×{g.rival.defPct}% · 出手间隔 ×{g.rival.intervalPct}%
          </span>
        </div>
      </div>

      <div className="ac-rack-title">五席对阵（按顺序挑战，胜负都消耗 1 次；五席全胜再 +{g.sweepBonus}）</div>
      <div className="ht-stage-grid gw-seat-grid" data-testid="guild-seats">
        {g.seats.map((s) => {
          const probe = planGuildWarChallenge(
            weekIndex,
            s.seat,
            g.seats.filter((x) => x.cleared).map((x) => x.seat),
            g.attemptsUsed
          );
          const canChallenge = probe.ok && s.canChallenge;
          return (
            <div
              key={s.seat}
              data-testid={`guild-seat-${s.seat}`}
              className={`ht-stage-card gw-seat-card ${s.cleared ? 'cleared' : ''} ${s.isTarget ? 'next' : ''} ${s.isBoss ? 'boss' : ''}`}
            >
              <div className="ht-stage-head">
                <div className="ht-stage-portrait">
                  <T1Art kind="monster" id={s.monsterId} className="ht-stage-art" fallback="" alt={s.name} />
                </div>
                <div className="ht-stage-title">
                  <span className="ht-stage-no">
                    第 {s.seat} 席 · {s.seatName}
                  </span>
                  <strong>{s.foeName}</strong>
                  <span className="ht-stage-stats">
                    Lv.{s.level} · 生命 {s.hp} · 攻击 {s.atk} · 防御 {s.def} · 间隔 {(s.attackIntervalMs / 1000).toFixed(1)} 秒
                  </span>
                </div>
              </div>
              <div className="ht-stage-foot">
                <span className="ht-reward">
                  <T1Art kind="skills" id="guild_medal" className="ac-badge-icon" fallback="" alt="" />
                  勋章 +{s.medals}
                  {s.reward > s.medals ? ` · 全胜 +${s.reward - s.medals}` : ''}
                </span>
                <span className={`ht-preview ${s.cleared ? 'done' : ''}`}>{s.cleared ? '本周已击败' : s.isTarget ? '' : s.block ?? ''}</span>
              </div>
              {s.isTarget && (
                <button
                  type="button"
                  data-testid="guild-challenge-btn"
                  className="prog-claim-btn af-action-btn gw-challenge-btn"
                  disabled={!canChallenge || Boolean(busyKey)}
                  onClick={() => handleChallenge(s)}
                >
                  <T1Art kind="skills" id="rival_banner" className="ac-badge-icon" fallback="" alt="" />
                  {busyKey === `challenge:${s.seat}` ? '交战中…' : canChallenge ? `挑战第 ${s.seat} 席` : s.block || '暂不可挑战'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="ac-rack-title">行会位阶（加成封顶 {capLine}）</div>
      <div className="ew-tier-grid gw-rank-grid" data-testid="guild-ranks">
        {g.rank.ranks.map((r) => (
          <div key={r.rank} className={`ew-tier-card ${r.reached ? 'reached' : ''} ${r.rank === g.rank.rank ? 'current' : ''}`}>
            <span className="ew-tier-head">
              <T1Art kind="skills" id="guild_medal" className="ac-badge-icon" fallback="" alt="" />
              <strong>{r.name}</strong>
            </span>
            <span className="ew-tier-need">{r.minMedals} 枚</span>
            <span className="ew-tier-stats">{formatGuildStats(r.stats).join(' · ') || '无加成'}</span>
          </div>
        ))}
      </div>
      <div className="tv-rule-note">
        对手行会每周一东八区 0 点轮换，五席成员取自真实魔物的战斗属性；对决按竞技场规则结算（满血、禁用补给与临时增益、10 分钟判负）。行会勋章只增不减、转生永久保留。
        {g.lastDuel
          ? ` 最近一战：第 ${g.lastDuel.seat} 席「${g.lastDuel.opponentName}」${g.lastDuel.won ? `获胜，勋章 +${g.lastDuel.medals}` : g.lastDuel.timeout ? '10 分钟未分胜负' : '落败'}。`
          : ''}
      </div>
    </div>
  );
}
