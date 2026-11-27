import { useEffect, useState, useCallback, useRef } from 'react';
import { apiClient } from '../../services/api';
import { useToast } from '../Toast';
import { T1Art, T1ItemIcon } from '../T1Art';
import { formatAcademyCountdown } from '../../gameplay/academyFestival';
import { formatDuelDuration } from '../../gameplay/arenaTown';
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
} from '../../gameplay/airshipPaladin';

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

// 只给同目录的面板用，不从 AdvancementPanels.tsx 再导出
export { AirshipPaladinView };
