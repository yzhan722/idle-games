import { useEffect, useState, useCallback, useRef } from 'react';
import { apiClient } from '../../services/api';
import { useToast } from '../Toast';
import { T1Art } from '../T1Art';
import type {
  GuildPactAction,
  GuildPactLinkTierDef,
  GuildTrialPactId,
  SkyForgeBonuses,
  SkyForgeTierDef,
  StarEmblemDomain,
  StarEmblemId,
  StarEmblemLevelStats,
} from '../../gameplay/skyForge';
import { PanelModal } from './PanelModal';
import { rareFindText } from '../../gameplay/rareFind';

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
  if (s.critRateBonusPct) lines.push(`组队暴击率 ${fmtSignedNum(s.critRateBonusPct, '%')}`);
  if (s.critDmgBonusPct) lines.push(`组队暴击伤害 ${fmtSignedNum(s.critDmgBonusPct, '%')}`);
  if (s.intervalReductionPct) lines.push(`普攻间隔 ${fmtSignedNum(-s.intervalReductionPct, '%')}`);
  if (s.armorPenPct) lines.push(`无视护甲 ${fmtSignedNum(Math.round(s.armorPenPct * 100), '%')}`);
  if (s.bossArmorBreakPct) lines.push(`首领破甲 ${fmtSignedNum(Math.round(s.bossArmorBreakPct * 100), '%')}`);
  if (s.rareFindPct) lines.push(`战斗珍稀掉落 ${rareFindText(s.rareFindPct)}`);
  if (s.bonusDef) lines.push(`基础防御 ${fmtSignedNum(s.bonusDef)}`);
  if (s.craftSpeedPct) lines.push(`制作速度 ${fmtSignedNum(s.craftSpeedPct, '%')}`);
  if (s.craftEfficiencyPct) lines.push(`制作连作 ${fmtSignedNum(s.craftEfficiencyPct, '%')}`);
  if (s.bonusHp) lines.push(`生命上限 ${fmtSignedNum(s.bonusHp)}`);
  if (s.gatherSpeedPct) lines.push(`采集速度 ${fmtSignedNum(s.gatherSpeedPct, '%')}`);
  if (s.gatherDoubleChance) lines.push(`双倍采集 ${fmtSignedNum(Math.round(s.gatherDoubleChance * 100), '%')}`);
  if (s.gatherEfficiencyPct) lines.push(`采集连作 ${fmtSignedNum(s.gatherEfficiencyPct, '%')}`);
  if (s.xpGainPct) lines.push(`生活与单人战斗经验 ${fmtSignedNum(s.xpGainPct, '%')}`);
  if (s.goldGainPct) lines.push(`单人战斗金币 ${fmtSignedNum(s.goldGainPct, '%')}`);
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
  push('组队暴击率', b.critRateBonusPct);
  push('组队暴击伤害', b.critDmgBonusPct);
  if (b.intervalMult !== 1) push('普攻间隔缩短', Math.round((1 - b.intervalMult) * 1000) / 10);
  push('无视护甲', Math.round(b.armorPenPct * 100));
  push('首领破甲', Math.round(b.bossArmorBreakPct * 100));
  push('基础防御', b.bonusDef, '');
  push('生命上限', b.bonusHp, '');
  push('制作速度', b.craftSpeedPct);
  push('制作连作', b.craftEfficiencyPct);
  push('采集速度', b.gatherSpeedPct);
  push('双倍采集', Math.round(b.gatherDoubleChance * 100));
  push('采集连作', b.gatherEfficiencyPct);
  push('生活与单人战斗经验', b.xpGainPct);
  push('单人战斗金币', b.goldGainPct);
  if (b.rareFindPct) chips.push({ text: `战斗珍稀掉落 ${rareFindText(b.rareFindPct)}`, neg: b.rareFindPct < 0 });
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
