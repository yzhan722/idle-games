import { useEffect, useState, useCallback, useRef } from 'react';
import { apiClient } from '../../services/api';
import { useToast } from '../Toast';
import { T1Art, T1ItemIcon } from '../T1Art';
import { formatAcademyCountdown } from '../../gameplay/academyFestival';
import { formatAirshipDuration } from '../../gameplay/airshipPaladin';
import {
  formatElfStats,
  formatMineGrade,
  getMineVeinMap,
  mineDayIndexFromKey,
  mineGradeTone,
  planElfCommission,
  planMineHaul,
  type ElfExpeditionSourceId,
  type ElfStats,
  type ElfWaystationBonuses,
  type MineGradeId,
} from '../../gameplay/dwarfElf';

/* ============================================================================
   矮人地底矿脉 & 精灵林地驿站 (WL-17)
   并入酒馆面板的两个分页（另有「生涯 → 远期」入口直达）；顶栏胶囊数不变。
   ============================================================================ */

interface MineForgeUse {
  actionId: string;
  name: string;
  level: number;
}

interface MineLayerView {
  layer: number;
  name: string;
  description: string;
  meters: number;
  ores: Array<{ id: string; name: string; have: number; smelt: MineForgeUse | null }>;
  byproduct: { id: string; name: string; have: number; forge: MineForgeUse | null };
  minMiningLevel: number;
  baseMinutes: number;
  durationMs: number;
  vein: {
    layer: number;
    oreId: string;
    oreName: string;
    grade: MineGradeId;
    gradeName: string;
    yieldPct: number;
    byproductId: string;
    byproductName: string;
    byproduct: number;
  };
  yield: { oreId: string; oreQty: number; byproductId: string; byproductQty: number; grade: MineGradeId; gradeName: string } | null;
  reached: boolean;
  levelOk: boolean;
  haulsUsed: number;
  haulsLeft: number;
  canHaul: boolean;
  block: string | null;
}

interface MineUpgradeView {
  level: number;
  name: string;
  maxLevel: number;
  materials: Array<{ itemId: string; name: string; need: number; have: number }>;
  canUpgrade: boolean;
  block: string | null;
}

interface ElfCommissionBase {
  slot: number;
  id: string;
  client: string;
  favor: number;
  gold: number;
  minTier: number;
  done: boolean;
  canDeliver: boolean;
  fullBoard: boolean;
  block: string | null;
}

interface ElfGatherCommissionView extends ElfCommissionBase {
  kind: 'gather';
  itemId: string;
  itemName: string;
  actionId: string;
  actionName: string;
  skillName: string;
  level: number;
  qty: number;
  have: number;
}

interface ElfExpeditionCommissionView extends ElfCommissionBase {
  kind: 'expedition';
  sourceId: ElfExpeditionSourceId;
  sourceName: string;
  source: string;
  artId: string;
  unit: string;
  target: number;
  progress: number;
  current: number;
  base: number;
}

type ElfCommissionView = ElfGatherCommissionView | ElfExpeditionCommissionView;

interface DwarfElfInfo {
  nowMs: number;
  bonuses: ElfWaystationBonuses;
  mine: {
    dayKey: string;
    dayEndsAtMs: number;
    gold: number;
    miningLevel: number;
    depth: MineUpgradeView & {
      meters: number;
      next: { level: number; name: string; costGold: number; meters: number } | null;
      steps: Array<{ level: number; name: string; reached: boolean }>;
    };
    cart: MineUpgradeView & {
      capacity: number;
      speedPct: number;
      next: { level: number; name: string; capacity: number; speedPct: number; costGold: number } | null;
      steps: Array<{ level: number; name: string; capacity: number; reached: boolean }>;
    };
    layers: MineLayerView[];
    haul: {
      layer: number;
      layerName: string;
      dayKey: string;
      startedAtMs: number;
      returnsAtMs: number;
      oreId: string;
      oreName: string;
      oreQty: number;
      grade: MineGradeId;
      gradeName: string;
      byproductId: string;
      byproductName: string;
      byproductQty: number;
    } | null;
    haulsPerLayer: number;
    haulsToday: number;
    totals: { hauls: number; ore: number; byproduct: number; bonanza: number };
    lastHaul: {
      layer: number;
      layerName: string;
      oreName: string;
      oreQty: number;
      gradeName: string;
      byproductName: string;
      byproductQty: number;
      at: string;
    } | null;
  };
  elf: {
    dayKey: string;
    dayEndsAtMs: number;
    gold: number;
    boardTier: number;
    boardTierName: string;
    favor: {
      total: number;
      tier: number;
      name: string;
      stats: ElfStats;
      next: { tier: number; name: string; minFavor: number; stats: ElfStats } | null;
      progressPct: number;
      tiers: Array<{ tier: number; name: string; minFavor: number; stats: ElfStats; reached: boolean }>;
    };
    commissions: ElfCommissionView[];
    completedCount: number;
    boardSize: number;
    fullBoardBonus: number;
    sources: Array<{ id: ElfExpeditionSourceId; name: string; source: string; artId: string; unit: string; current: number; base: number }>;
    caps: Required<ElfStats>;
    totals: { commissions: number; fullBoards: number; gold: number };
    lastCommission: { client: string; name: string; favor: number; gold: number; at: string } | null;
  };
}

function DwarfElfView({ view, onChange }: { view: 'mine' | 'waystation'; onChange?: () => void }) {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [info, setInfo] = useState<DwarfElfInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  // 服务器时钟偏移：换日 / 回矿倒计时按「服务器 nowMs + 本地流逝」推算
  const [clientAnchor, setClientAnchor] = useState(() => Date.now());
  const [tick, setTick] = useState(() => Date.now());
  const returnReloadRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      apiClient.clearCache();
      const res: any = await apiClient.getDwarfElf();
      setInfo(res);
      setClientAnchor(Date.now());
      return res as DwarfElfInfo;
    } catch (e: any) {
      toastRef.current.error(e?.message || '加载矮人地底矿脉与精灵林地驿站失败');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const hauling = Boolean(info?.mine.haul);
  useEffect(() => {
    const t = window.setInterval(() => setTick(Date.now()), hauling ? 1_000 : 15_000);
    return () => window.clearInterval(t);
  }, [hauling]);

  const serverNow = info ? info.nowMs + Math.max(0, tick - clientAnchor) : 0;
  const haul = info?.mine.haul ?? null;
  const haulLeft = haul ? Math.max(0, haul.returnsAtMs - serverNow) : 0;
  // 到点后由服务器结算回矿（显式 now）：每趟出车只自动刷新一次
  useEffect(() => {
    if (!haul || haulLeft > 0 || loading) return;
    if (returnReloadRef.current === haul.returnsAtMs) return;
    returnReloadRef.current = haul.returnsAtMs;
    void load();
  }, [haul, haulLeft, loading, load]);

  const runAction = async (key: string, call: () => Promise<any>, onOk: (res: any) => void, failText: string) => {
    setBusyKey(key);
    try {
      const res: any = await call();
      if (res?.mine?.mine) {
        setInfo(res.mine);
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

  if (loading && !info) return <div className="prog-empty">正在点亮矿灯、推开林地驿站的木门…</div>;
  if (!info) return <div className="prog-empty">暂无矮人地底矿脉与精灵林地驿站数据</div>;

  const m = info.mine;
  const e = info.elf;
  const dayIndex = mineDayIndexFromKey(m.dayKey) ?? 0;
  const elfDayIndex = mineDayIndexFromKey(e.dayKey) ?? 0;
  const mineDayLeft = Math.max(0, m.dayEndsAtMs - serverNow);
  const elfDayLeft = Math.max(0, e.dayEndsAtMs - serverNow);
  const haulsMap: Record<string, number> = Object.fromEntries(m.layers.map((l) => [String(l.layer), l.haulsUsed]));
  const tomorrow = getMineVeinMap(dayIndex + 1);
  const haulPct = haul
    ? Math.min(100, Math.max(0, Math.round(((serverNow - haul.startedAtMs) * 100) / Math.max(1, haul.returnsAtMs - haul.startedAtMs))))
    : 0;
  const bonusChips = formatElfStats(info.bonuses);
  const capLine = formatElfStats(e.caps).join(' · ');

  const handleHaul = (l: MineLayerView) =>
    runAction(
      `haul:${l.layer}`,
      () => apiClient.dispatchMineCart({ layer: l.layer, dayKey: m.dayKey }),
      (res) =>
        toastRef.current.success(
          `矿车下到第 ${l.layer} 层「${l.name}」，${formatAirshipDuration(res?.haul?.durationMs ?? l.durationMs)}后带回「${l.vein.oreName}」×${
            res?.haul?.oreQty ?? l.yield?.oreQty ?? ''
          }`
        ),
      '派矿车失败'
    );
  const handleDepth = () =>
    runAction(
      'depth',
      () => apiClient.upgradeMineDepth(),
      (res) => toastRef.current.success(`矿道掘进到第 ${res?.depth?.depth ?? ''} 层`),
      '矿道掘进失败'
    );
  const handleCart = () =>
    runAction(
      'cart',
      () => apiClient.upgradeMineCart(),
      (res) => toastRef.current.success(`矿车升级完成：每车 ${res?.cart?.capacity ?? ''} 块`),
      '矿车升级失败'
    );
  const handleCommission = (c: ElfCommissionView) =>
    runAction(
      `commission:${c.slot}`,
      () => apiClient.deliverElfCommission({ slot: c.slot, dayKey: e.dayKey }),
      (res) => {
        const r = res?.commission;
        const gain = (r?.favor ?? c.favor) + (r?.bonusFavor ?? 0);
        toastRef.current.success(
          `完成「${c.client}」的委托：林地好感 +${gain}${r?.bonusFavor ? '（今日全清）' : ''}，金币 +${r?.gold ?? c.gold}${r?.tierUp ? '，好感等级提升！' : ''}`
        );
      },
      '交付委托失败'
    );

  if (view === 'mine') {
    return (
      <div className="dm-view" data-testid="mine-view">
        <div className="hw-hero-card dm-hero-card">
          <div className="hw-hero-top">
            <div className="hw-hero-emblem dm-hero-emblem">
              <T1Art kind="skills" id="dwarf_mine" className="hw-hero-core-icon" fallback="" alt="矮人地底矿脉" />
            </div>
            <div className="dm-hero-copy">
              <div className="ac-hero-title-row">
                <span className="hw-hero-title" data-testid="mine-depth-name">
                  矿道 {m.depth.level} 层 · {m.depth.name}
                </span>
                <span className="qm-equipped-pill" title="矿道深度、矿车与累计记录转生永久保留">
                  转生保留
                </span>
              </div>
              <div className="dm-hero-meta">
                <span data-testid="mine-status">
                  {haul
                    ? `矿车在第 ${haul.layer} 层「${haul.layerName}」· ${haulLeft > 0 ? `还有 ${formatAirshipDuration(haulLeft)}回到井口` : '正在出井…'}`
                    : '矿车停在井口'}
                </span>
                <span className="dm-day-line">
                  {formatAcademyCountdown(mineDayLeft)}后换新矿脉 · 竖井深 {m.depth.meters} 米 · 铁匠采矿 Lv.{m.miningLevel}
                </span>
              </div>
              <div className="ct-rep-bar dm-depth-bar">
                <div className="ct-rep-bar-fill dm-depth-fill" style={{ width: `${Math.round((m.depth.level * 100) / Math.max(1, m.depth.maxLevel))}%` }} />
              </div>
            </div>
          </div>
          <div className="ac-wallet-badges dm-wallet-row">
            <span className="ac-wallet-badge dm-gold-badge">
              <T1Art kind="ui" id="gold" className="ac-badge-icon" fallback="" alt="" />
              金币 <strong data-testid="mine-gold">{m.gold}</strong>
            </span>
            <span className="ac-wallet-badge dm-cart-badge">
              <T1Art kind="skills" id="mine_cart" className="ac-badge-icon" fallback="" alt="" />
              {m.cart.name} · 每车 <strong data-testid="mine-cart-capacity">{m.cart.capacity}</strong> 块
            </span>
            <span className="ac-wallet-badge dm-vein-badge">
              <T1Art kind="skills" id="ore_vein" className="ac-badge-icon" fallback="" alt="" />
              今日出车 <strong data-testid="mine-hauls-today">{m.haulsToday}</strong> 车
            </span>
            <span className="ac-wallet-badge dm-total-badge">
              <T1Art kind="skills" id="dwarf_mine" className="ac-badge-icon" fallback="" alt="" />
              累计 {m.totals.hauls} 车 · 矿石 {m.totals.ore} 块 · 极品 {m.totals.bonanza} 次
            </span>
          </div>
        </div>

        {haul && (
          <div className="dm-haul-banner" data-testid="mine-haul">
            <T1Art kind="skills" id="mine_cart" className="dm-haul-icon" fallback="" alt="" />
            <div className="dm-haul-copy">
              <strong>
                第 {haul.layer} 层「{haul.layerName}」· {haul.gradeName}「{haul.oreName}」
              </strong>
              <span>
                预计带回「{haul.oreName}」×{haul.oreQty}
                {haul.byproductQty > 0 ? `、伴生「${haul.byproductName}」×${haul.byproductQty}` : ''} ·{' '}
                {haulLeft > 0 ? `还有 ${formatAirshipDuration(haulLeft)}回到井口` : '正在出井…'}
              </span>
              <div className="ct-rep-bar dm-haul-bar">
                <div className="ct-rep-bar-fill dm-haul-fill" style={{ width: `${haulPct}%` }} />
              </div>
            </div>
          </div>
        )}

        <div className="ac-rack-title">
          今日矿脉（每层每日 {m.haulsPerLayer} 车，矿石与伴生材料直接入背包）
        </div>
        <div className="dm-layer-grid" data-testid="mine-layers">
          {m.layers.map((l) => {
            const probe = planMineHaul(dayIndex, l.layer, m.depth.level, m.cart.level, m.miningLevel, haulsMap, Boolean(haul));
            const canHaul = probe.ok && l.canHaul;
            const ore = l.ores.find((o) => o.id === l.vein.oreId) ?? l.ores[0];
            const next = tomorrow[l.layer - 1];
            const nextOre = l.ores.find((o) => o.id === next?.oreId);
            const key = `haul:${l.layer}`;
            return (
              <div
                key={l.layer}
                data-testid={`mine-layer-${l.layer}`}
                className={`dm-layer-card ${l.reached ? 'reached' : 'locked'} ${l.reached && l.levelOk ? '' : 'dim'} grade-${mineGradeTone(l.vein.grade)}`}
              >
                <div className="dm-layer-head">
                  <T1ItemIcon itemId={l.vein.oreId} className="dm-ore-icon" fallback="" alt={l.vein.oreName} />
                  <div className="dm-layer-title">
                    <strong>
                      第 {l.layer} 层 · {l.name}
                    </strong>
                    <span>
                      深 {l.meters} 米 · 需采矿 Lv.{l.minMiningLevel}
                    </span>
                  </div>
                </div>
                <span className={`dm-grade-chip ${mineGradeTone(l.vein.grade)}`} data-testid={`mine-grade-${l.layer}`}>
                  <T1Art kind="skills" id="ore_vein" className="ac-badge-icon" fallback="" alt="" />
                  {l.vein.oreName} · {formatMineGrade(l.vein.grade)}
                </span>
                <span className="dm-layer-desc">{l.description}</span>
                <span className="dm-layer-meta">
                  每车 ×{l.yield?.oreQty ?? 0}
                  {(l.yield?.byproductQty ?? 0) > 0 ? ` + 伴生「${l.byproduct.name}」×${l.yield?.byproductQty}` : ''} · 出车 {formatAirshipDuration(l.durationMs)}
                </span>
                <div className="as-mat-row">
                  <span className="as-mini-chip">
                    <T1ItemIcon itemId={ore.id} className="ac-badge-icon" fallback="" alt="" />
                    {ore.smelt ? `冶炼「${ore.smelt.name}」Lv.${ore.smelt.level}` : ore.name} · 背包 {ore.have}
                  </span>
                  <span className="as-mini-chip" title={l.byproduct.forge ? `用于锻造「${l.byproduct.forge.name}」` : undefined}>
                    <T1ItemIcon itemId={l.byproduct.id} className="ac-badge-icon" fallback="" alt="" />
                    伴生「{l.byproduct.name}」· 背包 {l.byproduct.have}
                  </span>
                </div>
                <span className="dm-layer-next">
                  明日预告：{next ? `${next.gradeName}「${nextOre?.name ?? next.oreId}」` : '—'}
                </span>
                <button
                  type="button"
                  data-testid={`mine-haul-btn-${l.layer}`}
                  className="prog-claim-btn af-action-btn dm-haul-btn"
                  disabled={!canHaul || Boolean(busyKey)}
                  onClick={() => handleHaul(l)}
                >
                  <T1Art kind="skills" id="mine_cart" className="ac-badge-icon" fallback="" alt="" />
                  {busyKey === key ? '下井中…' : canHaul ? `派矿车下井（剩 ${l.haulsLeft} 车）` : l.block || '暂不可出车'}
                </button>
              </div>
            );
          })}
        </div>

        <div className="ac-rack-title">矿道与矿车（矿车在井下时不能升级）</div>
        <div className="dm-upgrade-grid">
          <div className="dm-upgrade-card" data-testid="mine-depth">
            <div className="dm-upgrade-emblem">
              <T1Art kind="skills" id="dwarf_mine" className="dm-upgrade-icon" fallback="" alt="矿道掘进" />
            </div>
            <div className="dm-upgrade-copy">
              <strong>
                矿道「{m.depth.name}」第 {m.depth.level} / {m.depth.maxLevel} 层 · 深 {m.depth.meters} 米
              </strong>
              {m.depth.next ? (
                <>
                  <span className="dm-upgrade-next">
                    掘进到「{m.depth.next.name}」：可下到第 {m.depth.next.level} 层（深 {m.depth.next.meters} 米）
                  </span>
                  <div className="as-mat-row">
                    <span className={`as-mat-chip ${m.gold >= m.depth.next.costGold ? 'ok' : 'short'}`}>
                      <T1Art kind="ui" id="gold" className="ac-badge-icon" fallback="" alt="" />
                      {m.depth.next.costGold}
                    </span>
                    {m.depth.materials.map((x) => (
                      <span key={x.itemId} className={`as-mat-chip ${x.have >= x.need ? 'ok' : 'short'}`}>
                        <T1ItemIcon itemId={x.itemId} className="ac-badge-icon" fallback="" alt="" />
                        {x.name} {x.have}/{x.need}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <span className="dm-upgrade-next">矿道已掘进到世界之底</span>
              )}
              <div className="as-hull-steps">
                {m.depth.steps.map((d) => (
                  <span key={d.level} className={`as-hull-step ${d.reached ? 'reached' : ''} ${d.level === m.depth.level ? 'current' : ''}`}>
                    {d.level} 层 {d.name}
                  </span>
                ))}
              </div>
            </div>
            <button
              type="button"
              data-testid="mine-depth-btn"
              className="prog-claim-btn af-action-btn dm-depth-btn"
              disabled={!m.depth.canUpgrade || Boolean(busyKey)}
              onClick={handleDepth}
            >
              <T1Art kind="skills" id="dwarf_mine" className="ac-badge-icon" fallback="" alt="" />
              {busyKey === 'depth' ? '掘进中…' : m.depth.canUpgrade ? '掘进矿道' : m.depth.block || '暂不可掘进'}
            </button>
          </div>
          <div className="dm-upgrade-card" data-testid="mine-cart">
            <div className="dm-upgrade-emblem">
              <T1Art kind="skills" id="mine_cart" className="dm-upgrade-icon" fallback="" alt="矮人矿车" />
            </div>
            <div className="dm-upgrade-copy">
              <strong>
                「{m.cart.name}」Lv.{m.cart.level} · 每车 {m.cart.capacity} 块 · 出车 -{m.cart.speedPct}%
              </strong>
              {m.cart.next ? (
                <>
                  <span className="dm-upgrade-next">
                    下一级「{m.cart.next.name}」：每车 {m.cart.next.capacity} 块 · 出车 -{m.cart.next.speedPct}%
                  </span>
                  <div className="as-mat-row">
                    <span className={`as-mat-chip ${m.gold >= m.cart.next.costGold ? 'ok' : 'short'}`}>
                      <T1Art kind="ui" id="gold" className="ac-badge-icon" fallback="" alt="" />
                      {m.cart.next.costGold}
                    </span>
                    {m.cart.materials.map((x) => (
                      <span key={x.itemId} className={`as-mat-chip ${x.have >= x.need ? 'ok' : 'short'}`}>
                        <T1ItemIcon itemId={x.itemId} className="ac-badge-icon" fallback="" alt="" />
                        {x.name} {x.have}/{x.need}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <span className="dm-upgrade-next">矿车已是最高等级</span>
              )}
              <div className="as-hull-steps">
                {m.cart.steps.map((c) => (
                  <span key={c.level} className={`as-hull-step ${c.reached ? 'reached' : ''} ${c.level === m.cart.level ? 'current' : ''}`}>
                    Lv.{c.level} {c.name} · {c.capacity} 块
                  </span>
                ))}
              </div>
            </div>
            <button
              type="button"
              data-testid="mine-cart-btn"
              className="prog-claim-btn af-action-btn dm-cart-btn"
              disabled={!m.cart.canUpgrade || Boolean(busyKey)}
              onClick={handleCart}
            >
              <T1Art kind="skills" id="mine_cart" className="ac-badge-icon" fallback="" alt="" />
              {busyKey === 'cart' ? '改装中…' : m.cart.canUpgrade ? '升级矿车' : m.cart.block || '暂不可升级'}
            </button>
          </div>
        </div>
        <div className="tv-rule-note">
          矿脉每天东八区 0 点轮换（全服相同）。品位产量：贫 70% / 中 100% / 富 135% / 极品 180%，富矿与极品另带伴生锻造材料。
          矿道、矿车与累计记录转生永久保留，但深层仍需本世的铁匠采矿等级；在途矿车的矿石转生时散去。
          {m.lastHaul
            ? ` 最近一车：第 ${m.lastHaul.layer} 层「${m.lastHaul.layerName}」${m.lastHaul.gradeName}，带回「${m.lastHaul.oreName}」×${m.lastHaul.oreQty}${
                m.lastHaul.byproductQty > 0 ? `、「${m.lastHaul.byproductName}」×${m.lastHaul.byproductQty}` : ''
              }。`
            : ''}
        </div>
      </div>
    );
  }

  return (
    <div className="ew-view" data-testid="elf-waystation-view">
      <div className="hw-hero-card ew-hero-card">
        <div className="hw-hero-top">
          <div className="hw-hero-emblem ew-hero-emblem">
            <T1Art kind="skills" id="elf_waystation" className="hw-hero-core-icon" fallback="" alt="精灵林地驿站" />
          </div>
          <div className="ew-hero-copy">
            <div className="ac-hero-title-row">
              <span className="hw-hero-title" data-testid="elf-favor-name">
                林地好感 · {e.favor.name}
              </span>
              <span className="qm-equipped-pill" title="林地好感只增不减、转生永久保留">
                转生保留
              </span>
            </div>
            <div className="ew-hero-meta">
              <span>
                {e.favor.next ? `距「${e.favor.next.name}」还差 ${e.favor.next.minFavor - e.favor.total} 好感` : '好感已满'} · 累计完成委托{' '}
                {e.totals.commissions} 张（全清 {e.totals.fullBoards} 天）
              </span>
              <span className="ew-day-line">{formatAcademyCountdown(elfDayLeft)}后换新委托</span>
            </div>
            <div className="ct-rep-bar ew-favor-bar">
              <div className="ct-rep-bar-fill ew-favor-fill" style={{ width: `${e.favor.progressPct}%` }} />
            </div>
          </div>
        </div>
        <div className="ac-wallet-badges ew-wallet-row">
          <span className="ac-wallet-badge ew-favor-badge">
            <T1Art kind="skills" id="elf_favor" className="ac-badge-icon" fallback="" alt="" />
            林地好感 <strong data-testid="elf-favor-total">{e.favor.total}</strong>
          </span>
          <span className="ac-wallet-badge ew-board-badge">
            <T1Art kind="skills" id="forest_commission" className="ac-badge-icon" fallback="" alt="" />
            今日委托 <strong data-testid="elf-completed">{e.completedCount}</strong> / {e.boardSize}
          </span>
          <span className="ac-wallet-badge ew-gold-badge">
            <T1Art kind="ui" id="gold" className="ac-badge-icon" fallback="" alt="" />
            金币 <strong>{e.gold}</strong>
          </span>
          <span className="ac-wallet-badge ew-bonus-badge" data-testid="elf-bonuses">
            <T1Art kind="skills" id="elf_waystation" className="ac-badge-icon" fallback="" alt="" />
            {bonusChips.length > 0 ? bonusChips.join(' · ') : '提升好感解锁采集加成'}
          </span>
        </div>
      </div>

      <div className="ac-rack-title">
        今日委托板（按「{e.boardTierName}」张贴；全部完成额外 +{e.fullBoardBonus} 好感）
      </div>
      <div className="ew-board" data-testid="elf-board">
        {e.commissions.map((c) => {
          const probe = planElfCommission(
            elfDayIndex,
            e.boardTier,
            c.slot,
            e.commissions.filter((x) => x.done).map((x) => x.slot),
            c.kind === 'gather' ? { [c.itemId]: c.have } : {},
            c.kind === 'expedition' ? { [c.sourceId]: c.current } : {},
            c.kind === 'expedition' ? { [c.sourceId]: c.base } : {}
          );
          const canDeliver = probe.ok && c.canDeliver;
          const need = c.kind === 'gather' ? c.qty : c.target;
          const have = c.kind === 'gather' ? c.have : c.progress;
          const pct = Math.min(100, Math.round((Math.min(have, need) * 100) / Math.max(1, need)));
          const key = `commission:${c.slot}`;
          return (
            <div
              key={c.slot}
              data-testid={`elf-commission-${c.slot}`}
              className={`ew-commission-card ${c.kind} ${c.done ? 'done' : ''} ${canDeliver ? 'ready' : ''}`}
            >
              <div className="ew-commission-head">
                {c.kind === 'gather' ? (
                  <T1ItemIcon itemId={c.itemId} className="ew-commission-icon" fallback="" alt={c.itemName} />
                ) : (
                  <T1Art kind="skills" id={c.artId} className="ew-commission-icon" fallback="" alt={c.sourceName} />
                )}
                <div className="ew-commission-title">
                  <span className="ew-client">
                    {c.kind === 'gather' ? '采集委托' : '远征委托'} · {c.client}
                  </span>
                  <strong>{c.kind === 'gather' ? `交付「${c.itemName}」×${c.qty}` : `${c.sourceName} ×${c.target} ${c.unit}`}</strong>
                </div>
              </div>
              <span className="ew-commission-meta">
                {c.kind === 'gather'
                  ? `${c.skillName.replace(/技能$/, '')}「${c.actionName}」Lv.${c.level} · 背包 ${c.have}/${c.qty}`
                  : `${c.source} · 进度 ${c.progress}/${c.target}`}
              </span>
              <div className="ct-rep-bar ew-commission-bar">
                <div className="ct-rep-bar-fill ew-commission-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="as-mat-row">
                <span className="as-mini-chip ew-reward-chip">
                  <T1Art kind="skills" id="elf_favor" className="ac-badge-icon" fallback="" alt="" />
                  好感 +{c.favor}
                  {c.fullBoard ? ` +${e.fullBoardBonus}（全清）` : ''}
                </span>
                <span className="as-mini-chip ew-reward-chip">
                  <T1Art kind="ui" id="gold" className="ac-badge-icon" fallback="" alt="" />
                  金币 +{c.gold}
                </span>
              </div>
              <button
                type="button"
                data-testid={`elf-deliver-btn-${c.slot}`}
                className="prog-claim-btn af-action-btn ew-deliver-btn"
                disabled={!canDeliver || Boolean(busyKey)}
                onClick={() => handleCommission(c)}
              >
                <T1Art kind="skills" id="forest_commission" className="ac-badge-icon" fallback="" alt="" />
                {busyKey === key ? '交付中…' : c.done ? '已完成' : canDeliver ? (c.kind === 'gather' ? '交付委托' : '领取远征委托') : c.block || '暂不可交付'}
              </button>
            </div>
          );
        })}
      </div>

      <div className="ac-rack-title">林地好感等级（加成只作用于采集行动）</div>
      <div className="ew-tier-grid" data-testid="elf-tiers">
        {e.favor.tiers.map((t) => {
          const chips = formatElfStats(t.stats);
          return (
            <div key={t.tier} className={`ew-tier-card ${t.reached ? 'reached' : ''} ${t.tier === e.favor.tier ? 'current' : ''}`}>
              <div className="ew-tier-head">
                <T1Art kind="skills" id="elf_favor" className="ac-badge-icon" fallback="" alt="" />
                <strong>{t.name}</strong>
              </div>
              <span className="ew-tier-need">好感 {t.minFavor}</span>
              <span className="ew-tier-stats">
                {chips.length > 0 ? chips.map((line) => <span key={line}>{line}</span>) : <span>初次来访，暂无加成</span>}
              </span>
            </div>
          );
        })}
      </div>

      <div className="ac-rack-title">远征读数（委托板张贴时记下基线）</div>
      <div className="ew-source-row" data-testid="elf-sources">
        {e.sources.map((s) => (
          <span key={s.id} className="as-mini-chip ew-source-chip">
            <T1Art kind="skills" id={s.artId} className="ac-badge-icon" fallback="" alt="" />
            {s.source} · {s.name} {s.current} {s.unit}（今日基线 {s.base}）
          </span>
        ))}
      </div>
      <div className="tv-rule-note">
        委托板每天东八区 0 点按当时的好感等级换新；远征委托只计张贴后新完成的商队返航、遗迹勘探或飞艇抵港。林地好感只增不减、转生永久保留；好感加成封顶 {capLine}。
        {e.lastCommission
          ? ` 最近完成：「${e.lastCommission.client}」的委托 ${e.lastCommission.name}，好感 +${e.lastCommission.favor}、金币 +${e.lastCommission.gold}。`
          : ''}
      </div>
    </div>
  );
}

// 只给同目录的面板用，不从 AdvancementPanels.tsx 再导出
export { DwarfElfView };
