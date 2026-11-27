import { useEffect, useState, useCallback, useRef } from 'react';
import { apiClient } from '../../services/api';
import { useToast } from '../Toast';
import { T1Art, T1ItemIcon } from '../T1Art';
import { formatAcademyCountdown } from '../../gameplay/academyFestival';
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
} from '../../gameplay/bardTavern';
import { PanelModal } from './PanelModal';
import { AirshipPaladinView } from './AirshipPaladinView';
import { DwarfElfView } from './DwarfElfView';
import { AbyssGuildView } from './AbyssGuildView';

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
                      {info.ballad.name}：{formatTavernStats({ ...info.ballad.stats, goldGainPct: 0 }).join(' · ') || '只涨名望'}
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
                吟游诗人点唱（每日 {info.tavern.balladsPerDay} 首，同时只唱一首；增益只作用于生活职业的速度、产出与经验）
              </div>
              {balladLive && info.ballad.name && (
                <div className="tv-stage-banner" data-testid="tavern-active-ballad">
                  <T1Art kind="skills" id="bard_lute" className="tv-stage-icon" fallback="" alt="" />
                  <div className="tv-stage-copy">
                    <strong>正在演唱「{info.ballad.name}」</strong>
                    <span>
                      {[...formatTavernStats({ ...info.ballad.stats, goldGainPct: 0 }), `剩余 ${formatBalladRemaining(balladLeft)}`].join(' · ')}
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
                    <span className="tv-ballad-stats">{formatTavernStats({ ...b.stats, goldGainPct: 0 }).join(' · ') || '只涨名望'}</span>
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
