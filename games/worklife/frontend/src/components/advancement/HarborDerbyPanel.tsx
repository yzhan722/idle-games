import { useEffect, useState, useCallback, useRef } from 'react';
import { apiClient } from '../../services/api';
import { useToast } from '../Toast';
import { T1Art, T1ItemIcon } from '../T1Art';
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
} from '../../gameplay/harborDerby';
import { PanelModal } from './PanelModal';

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
  if (s.cookingQualityPct) out.push(`烹饪效率 +${s.cookingQualityPct}%`);
  if (s.goldGainPct) out.push(`单人战斗金币 +${s.goldGainPct}%`);
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
                  我的本周榜（只算自己的渔获，最佳 {info.leaderboardSize} 条计分 · 共 {info.weeklyCatchCount} 条）
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
                    参赛渔获自动入缸（转生保留）；收藏进度解锁主题展缸，加成钓鱼速度、烹饪效率与单人战斗金币。
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
                          钓鱼速度 +{t.fishingSpeedPct}% · 烹饪效率 +{t.cookingQualityPct}% · 单人战斗金币 +{t.goldGainPct}%
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
