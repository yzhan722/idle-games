import { useEffect, useState, useCallback, useRef } from 'react';
import { apiClient } from '../../services/api';
import { useToast } from '../Toast';
import { T1Art, T1ItemIcon } from '../T1Art';
import { formatAcademyCountdown } from '../../gameplay/academyFestival';
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
} from '../../gameplay/abyssGuild';

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
          <strong>本周对手：{g.rival.name}（系统行会，不是玩家）</strong>
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
        对手行会由系统生成，每周一东八区 0 点轮换，五席成员用游戏里魔物的战斗属性；对决按竞技场规则结算（满血、禁用补给与临时增益、10 分钟判负）。行会勋章只增不减、转生永久保留。
        {g.lastDuel
          ? ` 最近一战：第 ${g.lastDuel.seat} 席「${g.lastDuel.opponentName}」${g.lastDuel.won ? `获胜，勋章 +${g.lastDuel.medals}` : g.lastDuel.timeout ? '10 分钟未分胜负' : '落败'}。`
          : ''}
      </div>
    </div>
  );
}

// 只给同目录的面板用，不从 AdvancementPanels.tsx 再导出
export { AbyssGuildView };
