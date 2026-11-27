import { useEffect, useState, useCallback, useRef } from 'react';
import { apiClient } from '../../services/api';
import { useToast } from '../Toast';
import { T1Art, T1ItemIcon } from '../T1Art';
import { previewCaravanCargoFrontend, type CaravanRouteId } from '../../gameplay/caravanTrade';
import { PanelModal } from './PanelModal';

// =================================================================
// 远征商队贸易航路与工坊特批契约柜台面板 (WL-7)
// =================================================================

interface CaravanRouteViewInfo {
  id: CaravanRouteId;
  name: string;
  townName: string;
  iconId: string;
  favoredCategory: 'lumber_fish_dishes' | 'ore_ingot_tools' | 'herb_cloth_crystal_alchemy';
  favoredLabel: string;
  description: string;
  baseDurationMs: number;
  effectiveDurationMs: number;
  scarcityMultiplier: number;
  hotMultiplier: number;
  hotItems: Array<{ itemId: string; name: string; idleHave: number }>;
}

interface CaravanWagonSlotInfo {
  slot: 0 | 1 | 2;
  unlocked: boolean;
  requiredRepLevel: number;
  status: 'locked' | 'idle' | 'in_transit' | 'ready';
  run: {
    slot: 0 | 1 | 2;
    routeId: CaravanRouteId;
    routeName: string;
    routeIconId: string;
    cargo: Record<string, number>;
    cargoItems: Array<{ itemId: string; name: string; qty: number }>;
    startedAt: number;
    completesAt: number;
    remainingMs: number;
    scarcityMultiplier: number;
    usedExpressPermit?: boolean;
    expectedReward: {
      gold: number;
      astralCrystalDust: number;
      forgingEmblems: number;
      caravanRep: number;
    };
  } | null;
}

interface IdleCargoCatalogEntry {
  itemId: string;
  name: string;
  idleQty: number;
  unitValue: number;
  tier: number;
  category: 'lumber_fish_dishes' | 'ore_ingot_tools' | 'herb_cloth_crystal_alchemy' | null;
}

interface WorkshopSupplyContractView {
  id: string;
  templateId: string;
  name: string;
  description: string;
  rarity: 'standard' | 'urgent' | 'royal';
  fulfilled: boolean;
  canFulfill: boolean;
  demandList: Array<{ itemId: string; name: string; need: number; have: number }>;
  reward: {
    gold: number;
    astralCrystalDust: number;
    forgingEmblems: number;
    honorPoints: number;
    expressPermits: number;
    caravanRep: number;
  };
}

interface AstralDustOfferView {
  id: string;
  name: string;
  description: string;
  dustCost: number;
  dailyLimit?: number;
  usedToday: number;
  remainingToday: number | null;
  canAfford: boolean;
  kind: 'ledger' | 'emblem' | 'crystals' | 'permit';
  emblemsOut?: number;
  expressPermitsOut?: number;
  itemList: Array<{ itemId: string; name: string; qty: number }>;
}

interface CaravanTradeInfo {
  nowMs: number;
  shiftKey: string;
  gold: number;
  astralCrystalDust: number;
  forgingEmblems: number;
  honorPoints: number;
  expressPermits: number;
  caravanRep: number;
  totalRunsCompleted: number;
  totalContractsFulfilled: number;
  reputationTier: {
    level: number;
    title: string;
    minRep: number;
    nextLevelRep: number | null;
    nextTitle: string | null;
    progressPct: number;
    allTiers: Array<{
      level: number;
      minRep: number;
      title: string;
      maxWagons: number;
      gatherDoubleChance: number;
      craftSpeedPct: number;
      goldGainPct: number;
    }>;
  };
  bonuses: {
    level: number;
    title: string;
    ledgerRank: number;
    maxWagons: 1 | 2 | 3;
    maxCargoCapacity: number;
    gatherDoubleChance: number;
    craftSpeedPct: number;
    goldGainPct: number;
    tradeYieldPct: number;
    durationReductionPct: number;
  };
  routes: CaravanRouteViewInfo[];
  wagonSlots: CaravanWagonSlotInfo[];
  idleCargoCatalog: IdleCargoCatalogEntry[];
  contractsBoard: {
    date: string;
    rerollsUsed: number;
    rerollsRemaining: number;
    rerollCost: number;
    contracts: WorkshopSupplyContractView[];
  };
  exchange: {
    ledgerUpgrade: {
      rank: number;
      maxRank: number;
      isMax: boolean;
      nextDustCost: number | null;
      canAfford: boolean;
    };
    offers: AstralDustOfferView[];
  };
}

function formatDurationShort(ms: number): string {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}小时${rm > 0 ? `${rm}分` : ''}`;
  }
  if (m > 0) return s > 0 ? `${m}分${String(s).padStart(2, '0')}秒` : `${m}分钟`;
  return `${s}秒`;
}

const CONTRACT_RARITY_LABELS: Record<'standard' | 'urgent' | 'royal', string> = {
  standard: '常备特批',
  urgent: '加急征调',
  royal: '皇家总契',
};

export function CaravanTradePanel({
  onClose,
  onChange,
}: {
  onClose: () => void;
  onChange?: () => void;
}) {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [info, setInfo] = useState<CaravanTradeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'routes' | 'contracts' | 'exchange'>('routes');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<CaravanRouteId>('frostport');
  const [selectedWagonSlot, setSelectedWagonSlot] = useState<0 | 1 | 2>(0);
  const [draftCargo, setDraftCargo] = useState<Record<string, number>>({});
  const [useExpressPermit, setUseExpressPermit] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      apiClient.clearCache();
      const res: any = await apiClient.getCaravanTrade();
      setInfo(res);
      if (res?.wagonSlots) {
        const firstIdle = (res.wagonSlots as CaravanWagonSlotInfo[]).find((w) => w.status === 'idle');
        if (firstIdle) setSelectedWagonSlot(firstIdle.slot);
      }
    } catch (e: any) {
      toastRef.current.error(e?.message || '加载远征商队与特批契约柜台失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const hasInTransit = info?.wagonSlots.some((w) => w.run && nowTick < w.run.completesAt);
    if (!hasInTransit) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [info, nowTick]);

  const smartFillForRoute = useCallback(
    (routeId: CaravanRouteId, currentInfo: CaravanTradeInfo | null) => {
      if (!currentInfo) return;
      const route = currentInfo.routes.find((r) => r.id === routeId) || currentInfo.routes[0];
      if (!route) return;
      const hotSet = new Set(route.hotItems.map((h) => h.itemId));
      const sorted = [...currentInfo.idleCargoCatalog].sort((a, b) => {
        const aHot = hotSet.has(a.itemId) ? 2 : a.category === route.favoredCategory ? 1 : 0;
        const bHot = hotSet.has(b.itemId) ? 2 : b.category === route.favoredCategory ? 1 : 0;
        if (bHot !== aHot) return bHot - aHot;
        return b.unitValue - a.unitValue;
      });
      const nextCargo: Record<string, number> = {};
      let remCap = currentInfo.bonuses.maxCargoCapacity;
      let typesUsed = 0;
      for (const item of sorted) {
        if (remCap <= 0 || typesUsed >= 4) break;
        if (item.idleQty <= 0) continue;
        const take = Math.min(item.idleQty, remCap, 25);
        if (take > 0) {
          nextCargo[item.itemId] = take;
          remCap -= take;
          typesUsed += 1;
        }
      }
      setDraftCargo(nextCargo);
    },
    []
  );

  // 首次拿到数据时若草稿为空则自动预填紧缺货品，方便一键发车或微调
  const autoSeededRef = useRef(false);
  useEffect(() => {
    if (info && !autoSeededRef.current) {
      autoSeededRef.current = true;
      smartFillForRoute(selectedRouteId, info);
    }
  }, [info, selectedRouteId, smartFillForRoute]);

  const adjustCargoItem = (itemId: string, delta: number, maxIdle: number, maxCap: number) => {
    setDraftCargo((prev) => {
      const cur = prev[itemId] || 0;
      const otherUnits = Object.entries(prev).reduce((s, [k, v]) => (k === itemId ? s : s + v), 0);
      const otherTypes = Object.keys(prev).filter((k) => k !== itemId && (prev[k] || 0) > 0).length;
      if (cur === 0 && delta > 0 && otherTypes >= 6) {
        return prev;
      }
      const nextQty = Math.max(0, Math.min(maxIdle, maxCap - otherUnits, cur + delta));
      const copy = { ...prev };
      if (nextQty <= 0) delete copy[itemId];
      else copy[itemId] = nextQty;
      return copy;
    });
  };

  const applyCaravanUpdate = (nextCaravan: CaravanTradeInfo | undefined) => {
    if (!nextCaravan) return;
    setInfo(nextCaravan);
    setNowTick(Date.now());
    const idleSlot = nextCaravan.wagonSlots.find((w) => w.status === 'idle');
    if (idleSlot) setSelectedWagonSlot(idleSlot.slot);
  };

  const handleDispatch = async () => {
    if (!info) return;
    setBusyKey(`dispatch:${selectedWagonSlot}`);
    try {
      const res: any = await apiClient.dispatchCaravanWagon({
        wagonSlot: selectedWagonSlot,
        routeId: selectedRouteId,
        cargo: draftCargo,
        useExpressPermit: useExpressPermit && info.expressPermits > 0,
      });
      if (res?.caravan) {
        applyCaravanUpdate(res.caravan);
        smartFillForRoute(selectedRouteId, res.caravan);
      } else {
        await load();
      }
      setUseExpressPermit(false);
      toast.success(
        res?.dispatched?.usedExpressPermit
          ? `第 ${selectedWagonSlot + 1} 号商车已凭加急通行证即刻抵达，可立即领取远征收益！`
          : `第 ${selectedWagonSlot + 1} 号远征商车已启程！`
      );
      onChange?.();
    } catch (e: any) {
      toast.error(e?.message || '派遣远征商车失败');
    } finally {
      setBusyKey(null);
    }
  };

  const handleExpedite = async (slot: 0 | 1 | 2) => {
    setBusyKey(`expedite:${slot}`);
    try {
      const res: any = await apiClient.expediteCaravanWagon(slot);
      if (res?.caravan) applyCaravanUpdate(res.caravan);
      else await load();
      toast.success(`第 ${slot + 1} 号商车已加急返航抵达！`);
      onChange?.();
    } catch (e: any) {
      toast.error(e?.message || '使用加急通行证失败');
    } finally {
      setBusyKey(null);
    }
  };

  const handleClaimWagon = async (slot: 0 | 1 | 2) => {
    setBusyKey(`claim:${slot}`);
    try {
      const res: any = await apiClient.claimCaravanWagon(slot);
      if (res?.caravan) applyCaravanUpdate(res.caravan);
      else await load();
      const rw = res?.claimed?.reward;
      const lvUp = res?.claimed?.leveledUpTo;
      toast.success(
        rw
          ? `远征结算：金币 +${rw.gold} · 星晶尘 +${rw.astralCrystalDust}${rw.forgingEmblems > 0 ? ` · 锻造徽记 +${rw.forgingEmblems}` : ''} · 商队声望 +${rw.caravanRep}${lvUp ? `（升至 Lv.${lvUp}！）` : ''}`
          : '已领取远征商队贸易收益'
      );
      onChange?.();
    } catch (e: any) {
      toast.error(e?.message || '领取远征收益失败');
    } finally {
      setBusyKey(null);
    }
  };

  const handleFulfillContract = async (c: WorkshopSupplyContractView) => {
    setBusyKey(`contract:${c.id}`);
    try {
      const res: any = await apiClient.fulfillWorkshopContract(c.id);
      if (res?.caravan) {
        applyCaravanUpdate(res.caravan);
        smartFillForRoute(selectedRouteId, res.caravan);
      } else {
        await load();
      }
      toast.success(
        `特批契约「${c.name}」已交付：星晶尘 +${c.reward.astralCrystalDust} · 锻造徽记 +${c.reward.forgingEmblems} · 荣誉 +${c.reward.honorPoints}`
      );
      onChange?.();
    } catch (e: any) {
      toast.error(e?.message || '交付工坊特批契约失败');
    } finally {
      setBusyKey(null);
    }
  };

  const handleRerollContracts = async () => {
    setBusyKey('reroll-contracts');
    try {
      const res: any = await apiClient.rerollWorkshopContracts();
      if (res?.caravan) applyCaravanUpdate(res.caravan);
      else await load();
      toast.success('工坊特批契约柜台已刷新 4 份新订单');
      onChange?.();
    } catch (e: any) {
      toast.error(e?.message || '刷新契约柜台失败');
    } finally {
      setBusyKey(null);
    }
  };

  const handleRedeemExchange = async (offerId: string, label: string) => {
    setBusyKey(`exchange:${offerId}`);
    try {
      const res: any = await apiClient.redeemAstralDustExchange(offerId);
      if (res?.caravan) applyCaravanUpdate(res.caravan);
      else await load();
      toast.success(`兑换成功：${label}`);
      onChange?.();
    } catch (e: any) {
      toast.error(e?.message || '星晶尘兑换失败');
    } finally {
      setBusyKey(null);
    }
  };

  const selectedRoute = info?.routes.find((r) => r.id === selectedRouteId) || info?.routes[0];
  const cargoPreview = info && selectedRoute
    ? previewCaravanCargoFrontend({
        routeId: selectedRoute.id,
        cargo: draftCargo,
        catalog: info.idleCargoCatalog,
        shiftKey: info.shiftKey,
        caravanRep: info.caravanRep,
        ledgerRank: info.bonuses.ledgerRank,
      })
    : null;

  const targetSlotObj = info?.wagonSlots.find((w) => w.slot === selectedWagonSlot);
  const canDispatchNow =
    Boolean(info) &&
    Boolean(cargoPreview?.valid) &&
    targetSlotObj?.status === 'idle' &&
    (!useExpressPermit || (info?.expressPermits || 0) > 0);

  const readyWagonsCount = info
    ? info.wagonSlots.filter((w) => w.run && (w.status === 'ready' || nowTick >= w.run.completesAt)).length
    : 0;
  const fulfillableContractsCount = info
    ? info.contractsBoard.contracts.filter((c) => c.canFulfill).length
    : 0;

  const bonusChips: string[] = [];
  if (info) {
    if (info.bonuses.gatherDoubleChance > 0) {
      bonusChips.push(`采集双倍产出 +${Math.round(info.bonuses.gatherDoubleChance * 100)}%`);
    }
    if (info.bonuses.craftSpeedPct > 0) {
      bonusChips.push(`制作速度 +${info.bonuses.craftSpeedPct}%`);
    }
    if (info.bonuses.goldGainPct > 0) {
      bonusChips.push(`单人战斗金币 +${info.bonuses.goldGainPct}%`);
    }
    if (info.bonuses.tradeYieldPct > 0) {
      bonusChips.push(`商典货值加成 +${info.bonuses.tradeYieldPct}% · 航程 -${info.bonuses.durationReductionPct}%`);
    }
  }

  return (
    <PanelModal
      title="远征商队与契约柜台"
      icon={<T1Art kind="skills" id="caravan_hub_banner" className="hw-modal-title-icon" fallback="" alt="" />}
      onClose={onClose}
    >
      {loading && !info ? (
        <div className="prog-empty">正在联络异世界远征总驿与工坊契约柜台…</div>
      ) : !info ? (
        <div className="prog-empty">暂无远征商队数据</div>
      ) : (
        <div className="ct-panel-root" data-testid="caravan-trade-panel">
          {/* 顶部总驿概览与货币栏 */}
          <div className="hw-hero-card ct-hero-card">
            <div className="hw-hero-top">
              <div className="hw-hero-emblem ct-hero-emblem">
                <T1Art kind="skills" id="caravan_hub_banner" className="hw-hero-core-icon" fallback="" alt="远征商队总驿" />
              </div>
              <div className="hw-hero-copy">
                <div className="hw-hero-title">
                  商队声望 Lv.{info.reputationTier.level} · {info.reputationTier.title}
                  {info.bonuses.ledgerRank > 0 ? ` · 宗师商典 ${info.bonuses.ledgerRank} 阶` : ''}
                </div>
                <div className="hw-hero-sub">
                  把闲置物资运往紧缺城镇，换取星晶尘、锻造徽记与商队声望；穿戴中的装备自动锁定，声望与商典转生保留。
                </div>
              </div>
            </div>

            <div className="ct-rep-progress-wrap">
              <div className="ct-rep-progress-meta">
                <span>
                  累计商队声望 <strong>{info.caravanRep}</strong>
                  {info.reputationTier.nextLevelRep !== null
                    ? ` / ${info.reputationTier.nextLevelRep}（下一阶：${info.reputationTier.nextTitle}）`
                    : '（已达最高商会等阶）'}
                </span>
                <span>解锁商车：{info.bonuses.maxWagons} / 3 辆 · 单车载重 {info.bonuses.maxCargoCapacity} 件</span>
              </div>
              <div className="ct-rep-bar">
                <div className="ct-rep-bar-fill" style={{ width: `${info.reputationTier.progressPct}%` }} />
              </div>
            </div>

            <div className="hw-wallet-bar">
              <span className="hw-wallet-pill is-dust">
                <T1Art kind="skills" id="astral_crystal_dust" className="qm-mini-icon" fallback="" alt="" />
                <span>异域星晶尘</span>
                <strong data-testid="caravan-wallet-dust">{info.astralCrystalDust}</strong>
              </span>
              <span className="hw-wallet-pill is-emblem">
                <T1Art kind="skills" id="forging_emblem" className="qm-mini-icon" fallback="" alt="" />
                <span>锻造徽记</span>
                <strong data-testid="caravan-wallet-emblems">{info.forgingEmblems}</strong>
              </span>
              <span className="hw-wallet-pill">
                <T1Art kind="skills" id="guild_honor_crest" className="qm-mini-icon" fallback="" alt="" />
                <span>公会荣誉</span>
                <strong>{info.honorPoints}</strong>
              </span>
              <span className="hw-wallet-pill">
                <T1Art kind="skills" id="workshop_contract_ledger" className="qm-mini-icon" fallback="" alt="" />
                <span>加急通行证</span>
                <strong data-testid="caravan-wallet-permits">{info.expressPermits}</strong>
              </span>
              <span className="hw-wallet-pill">
                <T1Art kind="ui" id="gold" className="qm-mini-icon" fallback="" alt="" />
                <span>金币</span>
                <strong>{info.gold}</strong>
              </span>
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
                  完成首趟远征或交付工坊契约即可积累商队声望（Lv.2 起永久提升采集双倍产出、制作速度与单人战斗金币；Lv.3 / Lv.5 解锁第 2、3 辆商车）。
                </span>
              )}
            </div>
          </div>

          {/* 三大子模块切换 */}
          <div className="prog-filter-row" style={{ marginBottom: 12 }}>
            <button
              type="button"
              data-testid="caravan-tab-routes"
              className={`prog-filter-btn ${tab === 'routes' ? 'active' : ''}`}
              onClick={() => setTab('routes')}
            >
              远征贸易航路（{info.bonuses.maxWagons}车{readyWagonsCount > 0 ? ` · 可领 ${readyWagonsCount}` : ''}）
            </button>
            <button
              type="button"
              data-testid="caravan-tab-contracts"
              className={`prog-filter-btn ${tab === 'contracts' ? 'active' : ''}`}
              onClick={() => setTab('contracts')}
            >
              工坊特批契约柜台（4单{fulfillableContractsCount > 0 ? ` · 可交 ${fulfillableContractsCount}` : ''}）
            </button>
            <button
              type="button"
              data-testid="caravan-tab-exchange"
              className={`prog-filter-btn ${tab === 'exchange' ? 'active' : ''}`}
              onClick={() => setTab('exchange')}
            >
              星晶尘兑换与商典（Lv.{info.bonuses.ledgerRank}/5）
            </button>
          </div>

          {tab === 'routes' && (
            <div className="ct-routes-view">
              {/* 1~3 辆商车编制栏位 */}
              <div className="ct-wagon-grid">
                {info.wagonSlots.map((ws) => {
                  const run = ws.run;
                  const remainMs = run ? Math.max(0, run.completesAt - nowTick) : 0;
                  const isReady = Boolean(run) && (ws.status === 'ready' || remainMs <= 0);
                  const isSelectedTarget = ws.status === 'idle' && selectedWagonSlot === ws.slot;

                  return (
                    <div
                      key={ws.slot}
                      data-testid={`caravan-wagon-slot-${ws.slot}`}
                      className={`ct-wagon-card status-${isReady ? 'ready' : ws.status} ${isSelectedTarget ? 'is-target' : ''}`}
                    >
                      <div className="ct-wagon-head">
                        <span className="ct-wagon-title">第 {ws.slot + 1} 号远征商车</span>
                        <span className={`ct-wagon-badge state-${isReady ? 'ready' : ws.status}`}>
                          {!ws.unlocked
                            ? `声望 Lv.${ws.requiredRepLevel} 解锁`
                            : isReady
                              ? '已返航待领'
                              : run
                                ? `航行中 ${formatDurationShort(remainMs)}`
                                : isSelectedTarget
                                  ? '当前装车栏位'
                                  : '空闲待命'}
                        </span>
                      </div>

                      {!ws.unlocked ? (
                        <div className="ct-wagon-body-muted">
                          提升商队声望至 Lv.{ws.requiredRepLevel} 即可扩编该远征商车栏位，实现多航路并行贸易。
                        </div>
                      ) : run ? (
                        <div className="ct-wagon-run-body">
                          <div className="ct-wagon-route-line">
                            <T1Art kind="skills" id={run.routeIconId} className="qm-mini-icon" fallback="" alt="" />
                            <strong>{run.routeName}</strong>
                            <span className="ct-scarcity-pill">{run.scarcityMultiplier.toFixed(2)}x</span>
                          </div>
                          <div className="ct-wagon-cargo-tags">
                            {run.cargoItems.map((ci) => (
                              <span key={ci.itemId} className="ct-mini-cargo-chip">
                                <T1ItemIcon itemId={ci.itemId} className="qm-mini-icon" fallback="" alt="" />
                                {ci.name} ×{ci.qty}
                              </span>
                            ))}
                          </div>
                          <div className="ct-wagon-reward-line">
                            预期：+{run.expectedReward.gold}金 · +{run.expectedReward.astralCrystalDust}星晶尘
                            {run.expectedReward.forgingEmblems > 0 ? ` · +${run.expectedReward.forgingEmblems}徽记` : ''}
                            {' · '}+{run.expectedReward.caravanRep}声望
                          </div>
                          <div className="ct-wagon-actions">
                            {isReady ? (
                              <button
                                type="button"
                                data-testid={`claim-wagon-${ws.slot}`}
                                className="prog-claim-btn"
                                disabled={busyKey !== null}
                                onClick={() => void handleClaimWagon(ws.slot)}
                              >
                                {busyKey === `claim:${ws.slot}` ? '结算中…' : '领取远征收益'}
                              </button>
                            ) : (
                              <button
                                type="button"
                                data-testid={`expedite-wagon-${ws.slot}`}
                                className="prog-filter-btn active"
                                disabled={busyKey !== null || info.expressPermits <= 0}
                                onClick={() => void handleExpedite(ws.slot)}
                              >
                                {busyKey === `expedite:${ws.slot}`
                                  ? '加急中…'
                                  : `加急即刻返航（通行证 ${info.expressPermits}）`}
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="ct-wagon-idle-body">
                          <div className="ct-wagon-body-muted">
                            商车整备就绪，选择下方跨城镇贸易航路与装车货品后即可启程。
                          </div>
                          {!isSelectedTarget && (
                            <button
                              type="button"
                              className="prog-filter-btn"
                              onClick={() => setSelectedWagonSlot(ws.slot)}
                            >
                              选为装车栏位
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 三大跨城镇贸易航路选择 */}
              <div className="hw-section-head">
                <h4>跨城镇远征航路 · 当班紧缺行情（每 6 小时轮换）</h4>
                <span className="hw-section-hint">装运偏好紧缺大类可享 1.15x ~ 1.85x 溢价结算</span>
              </div>

              <div className="ct-route-cards">
                {info.routes.map((rt) => {
                  const active = rt.id === selectedRouteId;
                  return (
                    <div
                      key={rt.id}
                      data-testid={`caravan-route-${rt.id}`}
                      className={`ct-route-card ${active ? 'is-selected' : ''}`}
                      onClick={() => {
                        setSelectedRouteId(rt.id);
                        smartFillForRoute(rt.id, info);
                      }}
                    >
                      <div className="ct-route-top">
                        <T1Art kind="skills" id={rt.iconId} className="ct-route-art" fallback="" alt={rt.name} />
                        <div className="ct-route-title-box">
                          <div className="ct-route-name-row">
                            <strong>{rt.name}</strong>
                            <span className="ct-scarcity-pill is-strong">紧缺 {rt.scarcityMultiplier.toFixed(2)}x</span>
                          </div>
                          <div className="ct-route-town">
                            {rt.townName} · 航程 {formatDurationShort(rt.effectiveDurationMs)}
                          </div>
                        </div>
                      </div>
                      <div className="ct-route-favored">偏好大类：{rt.favoredLabel}</div>
                      <div className="ct-route-hot-row">
                        <span className="ct-hot-label">当班急需（{rt.hotMultiplier.toFixed(2)}x）：</span>
                        {rt.hotItems.map((hi) => (
                          <span key={hi.itemId} className="ct-hot-item-chip">
                            <T1ItemIcon itemId={hi.itemId} className="qm-mini-icon" fallback="" alt="" />
                            {hi.name}（闲置 {hi.idleHave}）
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 货舱装载台与实时对称结算预览 */}
              {selectedRoute && cargoPreview && (
                <div className="ct-loader-box">
                  <div className="ct-loader-head">
                    <div>
                      <strong>
                        装车配货台 · 目标航路：{selectedRoute.name}（第 {selectedWagonSlot + 1} 号商车）
                      </strong>
                      <div className="hw-section-hint">
                        载重 {cargoPreview.totalUnits} / {cargoPreview.maxCapacity} 件 · 基础货值 {cargoPreview.baseCargoValue} 金 → 紧缺折算货值{' '}
                        <strong>{cargoPreview.effectiveCargoValue}</strong> 金
                      </div>
                    </div>
                    <div className="ct-loader-quick-btns">
                      <button
                        type="button"
                        data-testid="smart-fill-cargo-btn"
                        className="prog-filter-btn active"
                        onClick={() => smartFillForRoute(selectedRoute.id, info)}
                      >
                        智能装填紧缺货品
                      </button>
                      <button
                        type="button"
                        className="prog-filter-btn"
                        onClick={() => setDraftCargo({})}
                      >
                        清空货舱
                      </button>
                    </div>
                  </div>

                  {info.idleCargoCatalog.length === 0 ? (
                    <div className="prog-empty" style={{ padding: '14px 8px' }}>
                      当前背包暂无可装运的闲置物资（金币与穿戴中装备不会进入货舱），请先前往采集或制作！
                    </div>
                  ) : (
                    <div className="ct-cargo-list">
                      {info.idleCargoCatalog.slice(0, 18).map((item) => {
                        const loaded = draftCargo[item.itemId] || 0;
                        const isHot = selectedRoute.hotItems.some((h) => h.itemId === item.itemId);
                        const isFavored = isHot || item.category === selectedRoute.favoredCategory;
                        const mult = isHot
                          ? selectedRoute.hotMultiplier
                          : isFavored
                            ? selectedRoute.scarcityMultiplier
                            : 1.0;

                        return (
                          <div
                            key={item.itemId}
                            className={`ct-cargo-row ${loaded > 0 ? 'is-loaded' : ''} ${isFavored ? 'is-favored' : ''}`}
                          >
                            <div className="ct-cargo-item-meta">
                              <T1ItemIcon itemId={item.itemId} className="qm-mini-icon" fallback="" alt="" />
                              <span className="ct-cargo-name">{item.name}</span>
                              <small className="ct-cargo-stock">闲置 {item.idleQty} · 单价 {item.unitValue}</small>
                              {isFavored && (
                                <span className={`ct-scarcity-pill ${isHot ? 'is-hot' : ''}`}>
                                  {isHot ? `急需 ${mult.toFixed(2)}x` : `紧缺 ${mult.toFixed(2)}x`}
                                </span>
                              )}
                            </div>
                            <div className="ct-cargo-stepper">
                              <button
                                type="button"
                                className="ct-step-btn"
                                disabled={loaded <= 0}
                                onClick={() => adjustCargoItem(item.itemId, -5, item.idleQty, cargoPreview.maxCapacity)}
                              >
                                -5
                              </button>
                              <button
                                type="button"
                                className="ct-step-btn"
                                disabled={loaded <= 0}
                                onClick={() => adjustCargoItem(item.itemId, -1, item.idleQty, cargoPreview.maxCapacity)}
                              >
                                -1
                              </button>
                              <strong className="ct-loaded-qty">{loaded}</strong>
                              <button
                                type="button"
                                className="ct-step-btn"
                                disabled={loaded >= item.idleQty || cargoPreview.totalUnits >= cargoPreview.maxCapacity}
                                onClick={() => adjustCargoItem(item.itemId, 1, item.idleQty, cargoPreview.maxCapacity)}
                              >
                                +1
                              </button>
                              <button
                                type="button"
                                className="ct-step-btn"
                                disabled={loaded >= item.idleQty || cargoPreview.totalUnits >= cargoPreview.maxCapacity}
                                onClick={() => adjustCargoItem(item.itemId, 5, item.idleQty, cargoPreview.maxCapacity)}
                              >
                                +5
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="ct-dispatch-footer">
                    <div className="ct-preview-rewards">
                      <span className="ct-reward-chip">
                        <T1Art kind="skills" id="astral_crystal_dust" className="qm-mini-icon" fallback="" alt="" />
                        星晶尘 +{cargoPreview.expectedReward.astralCrystalDust}
                      </span>
                      <span className="ct-reward-chip">
                        <T1Art kind="skills" id="forging_emblem" className="qm-mini-icon" fallback="" alt="" />
                        锻造徽记 +{cargoPreview.expectedReward.forgingEmblems}
                      </span>
                      <span className="ct-reward-chip">
                        <T1Art kind="ui" id="gold" className="qm-mini-icon" fallback="" alt="" />
                        金币 +{cargoPreview.expectedReward.gold}
                      </span>
                      <span className="ct-reward-chip">
                        商队声望 +{cargoPreview.expectedReward.caravanRep}
                      </span>
                    </div>

                    <div className="ct-dispatch-controls">
                      <label className="ct-express-toggle">
                        <input
                          type="checkbox"
                          data-testid="toggle-express-permit"
                          checked={useExpressPermit && info.expressPermits > 0}
                          disabled={info.expressPermits <= 0}
                          onChange={(e) => setUseExpressPermit(e.target.checked)}
                        />
                        <span>使用加急通行证立即抵达（剩余 {info.expressPermits} 张）</span>
                      </label>

                      <button
                        type="button"
                        data-testid="dispatch-caravan-btn"
                        className="prog-claim-btn"
                        disabled={!canDispatchNow || busyKey !== null}
                        onClick={() => void handleDispatch()}
                      >
                        {busyKey?.startsWith('dispatch:')
                          ? '发车中…'
                          : targetSlotObj?.status !== 'idle'
                            ? '请先选择空闲商车栏位'
                            : !cargoPreview.valid
                              ? `装车满 ${40} 金可发车`
                              : useExpressPermit && info.expressPermits > 0
                                ? '加急派遣 · 即刻返航'
                                : '派遣远征商车启程'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'contracts' && (
            <div className="ct-contracts-view">
              <div className="hw-section-head">
                <div className="ct-section-title-inline">
                  <T1Art kind="skills" id="workshop_contract_ledger" className="qm-mini-icon" fallback="" alt="" />
                  <h4>工坊特批契约柜台（每日 4 份轮换 · 交付闲置物资即时结清）</h4>
                </div>
                <button
                  type="button"
                  data-testid="reroll-workshop-contracts-btn"
                  className="prog-filter-btn"
                  disabled={
                    busyKey !== null ||
                    info.contractsBoard.rerollsRemaining <= 0 ||
                    info.gold < info.contractsBoard.rerollCost
                  }
                  onClick={() => void handleRerollContracts()}
                >
                  {busyKey === 'reroll-contracts'
                    ? '调阅中…'
                    : `刷新契约柜台（${info.contractsBoard.rerollCost}金 · 剩 ${info.contractsBoard.rerollsRemaining} 次）`}
                </button>
              </div>

              <div className="ct-contract-grid">
                {info.contractsBoard.contracts.map((c, idx) => (
                  <div
                    key={c.id}
                    data-testid={`workshop-contract-${idx}`}
                    className={`ct-contract-card rarity-${c.rarity} ${c.fulfilled ? 'is-fulfilled' : ''}`}
                  >
                    <div className="ct-contract-head">
                      <div>
                        <div className="ct-contract-title-row">
                          <strong>{c.name}</strong>
                          <span className={`ct-rarity-pill rarity-${c.rarity}`}>
                            {CONTRACT_RARITY_LABELS[c.rarity]}
                          </span>
                        </div>
                        <p className="ct-contract-desc">{c.description}</p>
                      </div>
                    </div>

                    <div className="ct-demand-row">
                      {c.demandList.map((d) => (
                        <span
                          key={d.itemId}
                          className={`hw-cost-chip ${d.have >= d.need || c.fulfilled ? 'ok' : 'lack'}`}
                        >
                          <T1ItemIcon itemId={d.itemId} className="qm-mini-icon" fallback="" alt="" />
                          {d.name} {Math.min(d.have, d.need)}/{d.need}
                        </span>
                      ))}
                    </div>

                    <div className="ct-contract-bottom">
                      <div className="ct-contract-rewards">
                        <span className="ct-reward-chip">
                          <T1Art kind="skills" id="astral_crystal_dust" className="qm-mini-icon" fallback="" alt="" />
                          +{c.reward.astralCrystalDust}晶尘
                        </span>
                        <span className="ct-reward-chip">
                          <T1Art kind="skills" id="forging_emblem" className="qm-mini-icon" fallback="" alt="" />
                          +{c.reward.forgingEmblems}徽记
                        </span>
                        <span className="ct-reward-chip">
                          <T1Art kind="skills" id="guild_honor_crest" className="qm-mini-icon" fallback="" alt="" />
                          +{c.reward.honorPoints}荣誉
                        </span>
                        {c.reward.expressPermits > 0 && (
                          <span className="ct-reward-chip">
                            <T1Art kind="skills" id="workshop_contract_ledger" className="qm-mini-icon" fallback="" alt="" />
                            +{c.reward.expressPermits}通行证
                          </span>
                        )}
                        <span className="ct-reward-chip">+{c.reward.gold}金 · +{c.reward.caravanRep}声望</span>
                      </div>

                      <button
                        type="button"
                        data-testid={`fulfill-contract-${c.id}`}
                        className="prog-claim-btn"
                        disabled={!c.canFulfill || busyKey !== null}
                        onClick={() => void handleFulfillContract(c)}
                      >
                        {busyKey === `contract:${c.id}`
                          ? '交付中…'
                          : c.fulfilled
                            ? '今日已交付'
                            : c.canFulfill
                              ? '交付特批契约'
                              : '闲置物资不足'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'exchange' && (
            <div className="ct-exchange-view">
              {/* 永久养成：远征宗师商典 */}
              <div className="ct-ledger-card">
                <div className="ct-ledger-left">
                  <T1Art kind="skills" id="workshop_contract_ledger" className="ct-ledger-art" fallback="" alt="远征宗师商典" />
                  <div className="ct-ledger-copy">
                    <div className="ct-route-name-row">
                      <strong>远征宗师商典（永久传承 · Lv.{info.exchange.ledgerUpgrade.rank}/{info.exchange.ledgerUpgrade.maxRank}）</strong>
                      <span className="qm-equipped-pill">转生永久保留</span>
                    </div>
                    <p className="ct-contract-desc">
                      每升 1 阶永久提升：商队货值结算 +6%、远征航程耗时 -6%、单车载重 +15 件，并额外赋予采集双倍产出 +1%、制作速度 +2%、单人战斗金币 +2%。
                    </p>
                  </div>
                </div>
                <div className="ct-ledger-right">
                  {!info.exchange.ledgerUpgrade.isMax && info.exchange.ledgerUpgrade.nextDustCost !== null && (
                    <span className={`hw-cost-chip ${info.exchange.ledgerUpgrade.canAfford ? 'ok' : 'lack'}`}>
                      <T1Art kind="skills" id="astral_crystal_dust" className="qm-mini-icon" fallback="" alt="" />
                      星晶尘 ×{info.exchange.ledgerUpgrade.nextDustCost}
                    </span>
                  )}
                  <button
                    type="button"
                    data-testid="upgrade-caravan-ledger-btn"
                    className="prog-claim-btn"
                    disabled={!info.exchange.ledgerUpgrade.canAfford || busyKey !== null}
                    onClick={() =>
                      void handleRedeemExchange(
                        'ledger_upgrade',
                        `远征宗师商典升至 Lv.${info.exchange.ledgerUpgrade.rank + 1}`
                      )
                    }
                  >
                    {busyKey === 'exchange:ledger_upgrade'
                      ? '升阶中…'
                      : info.exchange.ledgerUpgrade.isMax
                        ? '已臻满阶'
                        : '升阶宗师商典'}
                  </button>
                </div>
              </div>

              {/* 异域星晶尘兑换物资 */}
              <div className="hw-section-head">
                <h4>异域星晶尘兑换所</h4>
                <span className="hw-section-hint">当前持有异域星晶尘：{info.astralCrystalDust}</span>
              </div>

              <div className="hw-synth-grid">
                {info.exchange.offers.map((offer) => (
                  <div key={offer.id} className="ct-offer-card">
                    <div className="ct-offer-head">
                      <T1Art
                        kind="skills"
                        id={offer.kind === 'emblem' ? 'forging_emblem' : offer.kind === 'permit' ? 'workshop_contract_ledger' : 'astral_crystal_dust'}
                        className="ct-offer-icon"
                        fallback=""
                        alt=""
                      />
                      <div>
                        <strong>{offer.name}</strong>
                        {offer.remainingToday !== null && (
                          <div className="hw-section-hint">今日可兑：{offer.remainingToday} / {offer.dailyLimit}</div>
                        )}
                      </div>
                    </div>
                    <p className="ct-contract-desc">{offer.description}</p>
                    {offer.itemList.length > 0 && (
                      <div className="ct-demand-row">
                        {offer.itemList.map((it) => (
                          <span key={it.itemId} className="hw-cost-chip ok">
                            <T1ItemIcon itemId={it.itemId} className="qm-mini-icon" fallback="" alt="" />
                            {it.name} ×{it.qty}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="ct-contract-bottom">
                      <span className={`hw-cost-chip ${info.astralCrystalDust >= offer.dustCost ? 'ok' : 'lack'}`}>
                        <T1Art kind="skills" id="astral_crystal_dust" className="qm-mini-icon" fallback="" alt="" />
                        星晶尘 ×{offer.dustCost}
                      </span>
                      <button
                        type="button"
                        data-testid={`redeem-dust-${offer.id}`}
                        className="prog-claim-btn"
                        disabled={!offer.canAfford || busyKey !== null}
                        onClick={() => void handleRedeemExchange(offer.id, offer.name)}
                      >
                        {busyKey === `exchange:${offer.id}`
                          ? '兑换中…'
                          : offer.remainingToday === 0
                            ? '今日已兑完'
                            : '立即兑换'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* 商队声望 Lv.1~6 永久阶位一览 */}
              <div className="hw-section-head">
                <h4>商队声望永久被动与商车扩编一览（Lv.1 ~ Lv.6）</h4>
              </div>
              <div className="ct-tier-list">
                {info.reputationTier.allTiers.map((t) => {
                  const unlocked = info.caravanRep >= t.minRep;
                  return (
                    <div key={t.level} className={`ct-tier-pill-row ${unlocked ? 'is-unlocked' : ''}`}>
                      <span>
                        <strong>Lv.{t.level} {t.title}</strong>（需 {t.minRep} 声望）
                      </span>
                      <span>
                        商车上限 {t.maxWagons} 辆 · 采集双倍 +{Math.round(t.gatherDoubleChance * 100)}% · 制作速度 +{t.craftSpeedPct}% · 单人战斗金币 +{t.goldGainPct}%
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
