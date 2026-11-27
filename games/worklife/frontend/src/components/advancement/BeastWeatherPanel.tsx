import { useEffect, useState, useCallback, useRef } from 'react';
import { apiClient } from '../../services/api';
import { useToast } from '../Toast';
import { T1Art, T1ItemIcon } from '../T1Art';
import { formatAcademyCountdown } from '../../gameplay/academyFestival';
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
} from '../../gameplay/beastWeather';
import { PanelModal } from './PanelModal';

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
