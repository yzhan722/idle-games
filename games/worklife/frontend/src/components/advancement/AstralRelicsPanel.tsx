import { useEffect, useState, useCallback, useRef } from 'react';
import { apiClient } from '../../services/api';
import { useToast } from '../Toast';
import { T1Art, T1ItemIcon } from '../T1Art';
import type {
  AstralCuratorTierDef,
  AstralRelicsBonuses,
  AstralRuinStratumId,
  ExpeditionSurveyMode,
  FullGalleryResonanceDef,
  RelicUpgradeMode,
  SacredRelicId,
  SacredRelicLevelStats,
} from '../../gameplay/astralRelics';
import { PanelModal } from './PanelModal';
import { rareFindText } from '../../gameplay/rareFind';

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
  if (s.critRateBonusPct) lines.push(`组队暴击率 +${s.critRateBonusPct}%`);
  if (s.critDmgBonusPct) lines.push(`组队暴击伤害 +${s.critDmgBonusPct}%`);
  if (s.relicCritAmpPct) lines.push(`圣枪裁决增伤 +${s.relicCritAmpPct}%`);
  if (s.intervalReductionPct) lines.push(`普攻间隔 -${s.intervalReductionPct}%`);
  if (s.bonusHp) lines.push(`生命上限 +${s.bonusHp}`);
  if (s.gatherDoubleChance) lines.push(`双倍采集 +${Math.round(s.gatherDoubleChance * 100)}%`);
  if (s.gatherSpeedPct) lines.push(`采集速度 +${s.gatherSpeedPct}%`);
  if (s.gatherEfficiencyPct) lines.push(`采集丰产连作 +${s.gatherEfficiencyPct}%`);
  if (s.rareFindPct) lines.push(`战斗珍稀掉落 ${rareFindText(s.rareFindPct)}`);
  if (s.bonusDef) lines.push(`基础防御 +${s.bonusDef}`);
  if (s.craftEfficiencyPct) lines.push(`神匠免费连作 +${s.craftEfficiencyPct}%`);
  if (s.craftSpeedPct) lines.push(`制作速度 +${s.craftSpeedPct}%`);
  if (s.xpGainPct) lines.push(`生活与单人战斗经验 +${s.xpGainPct}%`);
  if (s.goldGainPct) lines.push(`单人战斗金币 +${s.goldGainPct}%`);
  if (s.caravanBountyRewardPct) lines.push(`商队/悬赏金币·星晶尘·声望 +${s.caravanBountyRewardPct}%`);
  if (s.potionBuffPct) lines.push(`战斗药剂攻防增益 +${s.potionBuffPct}%`);
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
    if (info.bonuses.goldGainPct > 0) bonusChips.push(`单人战斗金币 +${info.bonuses.goldGainPct}%`);
    if (info.bonuses.caravanBountyRewardPct > 0) {
      bonusChips.push(`商队/悬赏金币·星晶尘·声望 +${info.bonuses.caravanBountyRewardPct}%`);
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
                          战斗攻击 +{t.combatAtkPct}% · 采集速度 +{t.gatherSpeedPct}% · 制作速度 +{t.craftSpeedPct}% · 单人战斗金币 +{t.goldGainPct}% · 战斗珍稀掉落 {rareFindText(t.rareFindPct)}
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
