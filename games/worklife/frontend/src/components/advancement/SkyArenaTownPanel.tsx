import { useEffect, useState, useCallback, useRef } from 'react';
import { apiClient } from '../../services/api';
import { useToast } from '../Toast';
import { T1Art, T1ItemIcon } from '../T1Art';
import { formatAcademyCountdown } from '../../gameplay/academyFestival';
import {
  formatArenaTownStats,
  formatDuelDuration,
  type ArenaArchetypeId,
  type ArenaDivisionId,
  type ArenaTownBonuses,
  type ArenaTownStats,
  type TownFacilityId,
} from '../../gameplay/arenaTown';
import { PanelModal } from './PanelModal';
import { RankBoardView } from './RankBoardView';
import { CircleView } from './CircleView';

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
  const [tab, setTab] = useState<'arena' | 'honors' | 'town' | 'ranks' | 'circle'>('arena');
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
            <button
              type="button"
              data-testid="arena-tab-ranks"
              className={`prog-filter-btn ${tab === 'ranks' ? 'active' : ''}`}
              onClick={() => setTab('ranks')}
            >
              真人榜
            </button>
            <button
              type="button"
              data-testid="arena-tab-circle"
              className={`prog-filter-btn ${tab === 'circle' ? 'active' : ''}`}
              onClick={() => setTab('circle')}
              title="真人玩家自己组的团：一起聊天、看看本周干了多少，不给加成"
            >
              同好会
            </button>
          </div>

          {tab === 'ranks' && <RankBoardView />}
          {tab === 'circle' && <CircleView />}

          {tab === 'arena' && (
            <div className="at-arena-view">
              <div className="at-system-note">擂主都是系统角色，不是玩家</div>
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
              <div className="at-system-note">城镇只属于你自己，没有别的玩家</div>
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
