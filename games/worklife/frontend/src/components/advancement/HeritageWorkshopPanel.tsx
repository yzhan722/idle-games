import { useEffect, useState, useCallback, useRef } from 'react';
import { apiClient } from '../../services/api';
import { useToast } from '../Toast';
import { T1Art, T1ItemIcon } from '../T1Art';
import { PanelModal } from './PanelModal';

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
  if (perRank.intervalReductionPct) tags.push(`普攻间隔 -${Math.round(perRank.intervalReductionPct * r * 10) / 10}%`);
  if (perRank.critRateBonusPct) tags.push(`组队暴击率 +${Math.round(perRank.critRateBonusPct * r * 10) / 10}%`);
  if (perRank.critDmgBonusPct) tags.push(`组队暴击伤害 +${perRank.critDmgBonusPct * r}%`);
  if (perRank.foodHealPct) tags.push(`战斗料理恢复 +${perRank.foodHealPct * r}%`);
  if (perRank.potionBuffPct) tags.push(`战斗药剂攻防增益 +${perRank.potionBuffPct * r}%`);
  if (perRank.gatherSpeedPct) tags.push(`采集速度 +${perRank.gatherSpeedPct * r}%`);
  if (perRank.craftSpeedPct) tags.push(`制作速度 +${perRank.craftSpeedPct * r}%`);
  if (perRank.gatherDoubleChance) tags.push(`采集双倍 +${Math.round(perRank.gatherDoubleChance * r * 100)}%`);
  if (perRank.craftEfficiencyPct) tags.push(`制作连作效率 +${perRank.craftEfficiencyPct * r}%`);
  if (perRank.rareFindPct) tags.push(`战斗稀有掉落 +${perRank.rareFindPct * r}%`);
  if (perRank.goldGainPct) tags.push(`单人战斗金币 +${perRank.goldGainPct * r}%`);
  if (tags.length > 0) tags[0] = `${tags[0]} ${suffix}`;
  return tags;
}

function formatCodexPassiveTags(pb: Record<string, number | undefined>): string[] {
  const tags: string[] = [];
  if (pb.bonusAtk) tags.push(`攻击 +${pb.bonusAtk}`);
  if (pb.bonusDef) tags.push(`防御 +${pb.bonusDef}`);
  if (pb.bonusHp) tags.push(`生命 +${pb.bonusHp}`);
  if (pb.armorPenPct) tags.push(`破甲 +${Math.round(pb.armorPenPct * 100)}%`);
  if (pb.critRateBonusPct) tags.push(`组队暴击率 +${pb.critRateBonusPct}%`);
  if (pb.foodHealPct) tags.push(`战斗料理恢复 +${pb.foodHealPct}%`);
  if (pb.potionBuffPct) tags.push(`战斗药剂攻防增益 +${pb.potionBuffPct}%`);
  if (pb.gatherSpeedPct) tags.push(`采集 +${pb.gatherSpeedPct}%`);
  if (pb.craftSpeedPct) tags.push(`制作 +${pb.craftSpeedPct}%`);
  if (pb.gatherDoubleChance) tags.push(`双倍采集 +${Math.round(pb.gatherDoubleChance * 100)}%`);
  if (pb.craftEfficiencyPct) tags.push(`制作效率 +${pb.craftEfficiencyPct}%`);
  if (pb.rareFindPct) tags.push(`战斗稀有掉落 +${pb.rareFindPct}%`);
  if (pb.goldGainPct) tags.push(`单人战斗金币 +${pb.goldGainPct}%`);
  if (pb.xpGainPct) tags.push(`生活与单人战斗经验 +${pb.xpGainPct}%`);
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
  if (b.critRateBonusPct > 0) chips.push(`组队暴击率 +${b.critRateBonusPct}%`);
  if (b.critDmgBonusPct > 0) chips.push(`组队暴击伤害 +${b.critDmgBonusPct}%`);
  if (b.foodHealMult > 1) chips.push(`战斗料理恢复 +${Math.round((b.foodHealMult - 1) * 100)}%`);
  if (b.potionBuffMult > 1) chips.push(`战斗药剂攻防增益 +${Math.round((b.potionBuffMult - 1) * 100)}%`);
  if (b.gatherSpeedPct > 0) chips.push(`采集速度 +${b.gatherSpeedPct}%`);
  if (b.gatherDoubleChance > 0) chips.push(`采集双倍 +${Math.round(b.gatherDoubleChance * 100)}%`);
  if (b.craftSpeedPct > 0) chips.push(`制作速度 +${b.craftSpeedPct}%`);
  if (b.craftEfficiencyPct > 0) chips.push(`制作效率 +${b.craftEfficiencyPct}%`);
  if (b.rareFindPct > 0) chips.push(`战斗稀有掉落 +${b.rareFindPct}%`);
  if (b.goldGainPct > 0) chips.push(`单人战斗金币 +${b.goldGainPct}%`);
  if (b.xpGainPct > 0) chips.push(`生活与单人战斗经验 +${b.xpGainPct}%`);
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
