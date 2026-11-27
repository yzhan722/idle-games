import { useEffect, useState, useCallback, useRef } from 'react';
import { apiClient } from '../../services/api';
import { useToast } from '../Toast';
import { T1Art, T1ItemIcon } from '../T1Art';
import type {
  AlchemicalPotionId,
  AlchemicalPotionLevelStats,
  AlchemyCauldronBonuses,
  CauldronMasteryTierDef,
  PotionBrewMode,
  RecipeUpgradeMode,
  ResonanceSlotIndex,
  TwinResonanceBonuses,
} from '../../gameplay/alchemyCauldron';
import { PanelModal } from './PanelModal';

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
  if ('intervalReductionPct' in stats && stats.intervalReductionPct) out.push(`普攻间隔 -${stats.intervalReductionPct}%`);
  if ('critRateBonusPct' in stats && stats.critRateBonusPct) out.push(`组队暴击率 +${stats.critRateBonusPct}%`);
  if ('critDmgBonusPct' in stats && stats.critDmgBonusPct) out.push(`组队暴击伤害 +${stats.critDmgBonusPct}%`);
  if (stats.gatherDoubleChance) out.push(`双倍采集 +${Math.round(stats.gatherDoubleChance * 100)}%`);
  if (stats.gatherSpeedPct) out.push(`采集速度 +${stats.gatherSpeedPct}%`);
  if (stats.craftSpeedPct) out.push(`制作速度 +${stats.craftSpeedPct}%`);
  if (stats.craftEfficiencyPct) out.push(`制作连作效率 +${stats.craftEfficiencyPct}%`);
  if (stats.goldGainPct) out.push(`单人战斗金币 +${stats.goldGainPct}%`);
  if (stats.caravanBountyRewardPct) out.push(`商队/悬赏金币·星晶尘·声望 +${stats.caravanBountyRewardPct}%`);
  if ('rareFindPct' in stats && stats.rareFindPct) out.push(`战斗珍稀掉落 +${stats.rareFindPct}%`);
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
    if (info.bonuses.goldGainPct > 0) bonusChips.push(`单人战斗金币 +${info.bonuses.goldGainPct}%`);
    if (info.bonuses.caravanBountyRewardPct > 0) {
      bonusChips.push(`商队/悬赏金币·星晶尘·声望 +${info.bonuses.caravanBountyRewardPct}%`);
    }
    if (info.bonuses.rareFindPct > 0) bonusChips.push(`战斗珍稀掉落 +${info.bonuses.rareFindPct}%`);
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
                  萃取原液或投入素材为四大秘药充能；双槽装不同魔药触发共鸣，单人首领战胜利时每个已装填的槽消耗 1 份。
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
                        攻击 +{t.combatAtkPct}% · 采集速度 +{t.gatherSpeedPct}% · 制作速度 +{t.craftSpeedPct}% · 单人战斗金币 +{t.goldGainPct}% · 战斗药剂攻防增益 +{t.potionBuffPct}%
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
