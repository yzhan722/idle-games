import React, { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../services/api';
import { useToast } from './Toast';
import { getItemName } from '../utils/itemNames';
import './ProgressionPanels.css';
import './SystemPanels.css';

// ============ 通用弹窗外壳（复用 prog 样式）============
function PanelModal({
  title,
  icon,
  onClose,
  children
}: {
  title: string;
  icon: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="prog-overlay" onClick={onClose}>
      <div className="prog-modal" onClick={(e) => e.stopPropagation()}>
        <div className="prog-header">
          <span className="prog-title">
            <span className="prog-title-icon">{icon}</span>
            {title}
          </span>
          <button className="prog-close" onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </div>
        <div className="prog-body">{children}</div>
      </div>
    </div>
  );
}

function formatRemain(sec: number): string {
  if (sec <= 0) return '已结束';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m > 0) return `${m}分${s}秒`;
  return `${s}秒`;
}

function multiplierText(mul?: Record<string, number>): string[] {
  if (!mul) return [];
  const LABEL: Record<string, string> = {
    gatherSpeed: '采集速度',
    craftSpeed: '制作速度',
    combatSpeed: '战斗速度',
    xpGain: '经验获取',
    goldGain: '金币获取'
  };
  return Object.entries(mul).map(([k, v]) => `${LABEL[k] || k} +${Math.round((v - 1) * 100)}%`);
}

// =================================================================
// Buff / 消耗品 面板
// =================================================================
interface BuffView {
  id: string;
  name: string;
  sourceItemId: string;
  expiresAt: string;
  remainingSec: number;
  multipliers?: Record<string, number>;
  stats?: { atk?: number; def?: number };
}

interface UsableItem {
  id: string;
  name: string;
  qty: number;
  desc: string;
  effectText: string[];
  type: string;
}

export function BuffsPanel({
  onClose,
  onChange
}: {
  onClose: () => void;
  onChange?: () => void;
}) {
  const [buffs, setBuffs] = useState<BuffView[]>([]);
  const [usables, setUsables] = useState<UsableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [using, setUsing] = useState<string | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [buffRes, content, stateRes]: any[] = await Promise.all([
        apiClient.getBuffs(),
        apiClient.getContentPack(),
        apiClient.get('/player/state')
      ]);
      setBuffs(buffRes.buffs || []);

      const items: any[] = content.items || [];
      const inv: Record<string, number> = stateRes.inventory || {};
      const list: UsableItem[] = [];
      for (const [itemId, qty] of Object.entries(inv)) {
        if (!qty || qty <= 0) continue;
        const def = items.find((it) => it.id === itemId);
        if (!def) continue;
        if (def.type !== 'food' && def.type !== 'consumable') continue;
        const eff = def.effect || {};
        const effectText: string[] = [];
        if (typeof eff.hp === 'number') effectText.push(`恢复生命 ${eff.hp}`);
        if (typeof eff.mp === 'number') effectText.push(`恢复魔力 ${eff.mp}`);
        if (eff.buff) {
          const durMin = Math.round((eff.buff.durationSec || 0) / 60);
          effectText.push(...multiplierText(eff.buff.multipliers));
          if (eff.buff.stats?.atk) effectText.push(`攻击 +${eff.buff.stats.atk}`);
          if (eff.buff.stats?.def) effectText.push(`防御 +${eff.buff.stats.def}`);
          if (durMin > 0) effectText.push(`持续 ${durMin} 分钟`);
        }
        list.push({
          id: itemId,
          name: def.name || itemId,
          qty,
          desc: def.description || '',
          effectText,
          type: def.type
        });
      }
      // 有 buff 的排前面
      list.sort((a, b) => (b.effectText.length - a.effectText.length));
      setUsables(list);
    } catch (e) {
      toast.error('增益信息加载失败');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
    const t = setInterval(() => {
      setBuffs((prev) =>
        prev
          .map((b) => ({ ...b, remainingSec: b.remainingSec - 1 }))
          .filter((b) => b.remainingSec > -1)
      );
    }, 1000);
    return () => clearInterval(t);
  }, [load]);

  const use = async (item: UsableItem) => {
    setUsing(item.id);
    try {
      const res: any = await apiClient.consumeItem(item.id);
      if (res.buff) toast.success(`使用 ${item.name}，获得增益「${res.buff.name}」`);
      else toast.success(`使用了 ${item.name}`);
      onChange?.();
      await load();
    } catch (e: any) {
      toast.error(e?.message || '使用失败');
    } finally {
      setUsing(null);
    }
  };

  return (
    <PanelModal title="增益 / 消耗品" icon="🧪" onClose={onClose}>
      <div className="sys-section-title">当前生效的增益</div>
      {buffs.length === 0 ? (
        <div className="sys-empty-inline">暂无生效的增益，使用药水或食物来获得加成</div>
      ) : (
        <div className="buff-active-list">
          {buffs.map((b) => (
            <div key={b.id} className="buff-active-card">
              <div className="buff-active-head">
                <span className="buff-active-name">⚡ {b.name}</span>
                <span className="buff-active-timer">{formatRemain(b.remainingSec)}</span>
              </div>
              <div className="buff-active-effects">
                {[...multiplierText(b.multipliers),
                  ...(b.stats?.atk ? [`攻击 +${b.stats.atk}`] : []),
                  ...(b.stats?.def ? [`防御 +${b.stats.def}`] : [])
                ].map((t, i) => (
                  <span key={i} className="buff-tag">{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="sys-section-title" style={{ marginTop: 18 }}>背包中的可用物品</div>
      {loading ? (
        <div className="prog-loading">加载中…</div>
      ) : usables.length === 0 ? (
        <div className="sys-empty-inline">背包里没有可使用的食物或药水</div>
      ) : (
        <div className="usable-grid">
          {usables.map((it) => (
            <div key={it.id} className="usable-card">
              <div className="usable-info">
                <div className="usable-name">
                  {it.name}
                  <span className="usable-qty">×{it.qty}</span>
                </div>
                <div className="usable-effects">
                  {it.effectText.length > 0
                    ? it.effectText.map((t, i) => <span key={i} className="buff-tag">{t}</span>)
                    : <span className="usable-noeff">{it.desc || '无特殊效果'}</span>}
                </div>
              </div>
              <button
                className="ach-claim-btn"
                disabled={using === it.id}
                onClick={() => use(it)}
              >
                {using === it.id ? '…' : '使用'}
              </button>
            </div>
          ))}
        </div>
      )}
    </PanelModal>
  );
}

// =================================================================
// 商店 面板（购买 / 出售）
// =================================================================
interface ShopItem {
  id: string;
  name: string;
  type: string;
  tier?: number;
  description?: string;
  buyPrice: number;
}
interface SellRow {
  id: string;
  name: string;
  qty: number;
  unit: number;
}

export function ShopPanel({
  onClose,
  onChange
}: {
  onClose: () => void;
  onChange?: () => void;
}) {
  const [tab, setTab] = useState<'buy' | 'sell'>('buy');
  const [stock, setStock] = useState<ShopItem[]>([]);
  const [sellRows, setSellRows] = useState<SellRow[]>([]);
  const [gold, setGold] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [shopRes, content, prices, stateRes]: any[] = await Promise.all([
        apiClient.getShop(),
        apiClient.getContentPack(),
        apiClient.getSellPrices(),
        apiClient.get('/player/state')
      ]);
      setStock(shopRes.stock || []);
      setGold(shopRes.gold || 0);

      const items: any[] = content.items || [];
      const inv: Record<string, number> = stateRes.inventory || {};
      const pmap: Record<string, number> = prices.prices || {};
      const rows: SellRow[] = [];
      for (const [itemId, qty] of Object.entries(inv)) {
        if (itemId === 'gold' || !qty || qty <= 0) continue;
        if (!(itemId in pmap)) continue;
        const def = items.find((it) => it.id === itemId);
        rows.push({ id: itemId, name: def?.name || itemId, qty, unit: pmap[itemId] });
      }
      rows.sort((a, b) => b.unit - a.unit);
      setSellRows(rows);
    } catch (e) {
      toast.error('商店加载失败');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const getQty = (id: string) => Math.max(1, qtyMap[id] || 1);
  const setQty = (id: string, v: number) =>
    setQtyMap((m) => ({ ...m, [id]: Math.max(1, Math.min(9999, v || 1)) }));

  const buy = async (it: ShopItem) => {
    const qty = getQty(it.id);
    setBusy(it.id);
    try {
      const res: any = await apiClient.shopBuy(it.id, qty);
      setGold(res.gold ?? gold);
      toast.success(`购买 ${it.name} ×${qty}，花费 ${res.total} 金币`);
      onChange?.();
    } catch (e: any) {
      toast.error(e?.message || '购买失败');
    } finally {
      setBusy(null);
    }
  };

  const sell = async (row: SellRow) => {
    const qty = getQty('sell_' + row.id);
    const realQty = Math.min(qty, row.qty);
    setBusy(row.id);
    try {
      const res: any = await apiClient.shopSell(row.id, realQty);
      setGold(res.gold ?? gold);
      toast.success(`出售 ${row.name} ×${realQty}，获得 ${res.total} 金币`);
      onChange?.();
      await load();
    } catch (e: any) {
      toast.error(e?.message || '出售失败');
    } finally {
      setBusy(null);
    }
  };

  return (
    <PanelModal title="商店" icon="🏪" onClose={onClose}>
      <div className="shop-topbar">
        <div className="shop-tabs">
          <button
            className={`prog-filter-btn ${tab === 'buy' ? 'active' : ''}`}
            onClick={() => setTab('buy')}
          >
            🛒 购买
          </button>
          <button
            className={`prog-filter-btn ${tab === 'sell' ? 'active' : ''}`}
            onClick={() => setTab('sell')}
          >
            💰 出售
          </button>
        </div>
        <div className="shop-gold">持有金币：<b>{gold.toLocaleString()}</b> 💰</div>
      </div>

      {loading ? (
        <div className="prog-loading">加载中…</div>
      ) : tab === 'buy' ? (
        <div className="shop-list">
          {stock.map((it) => (
            <div key={it.id} className="shop-row">
              <div className="shop-row-info">
                <div className="shop-row-name">{it.name}</div>
                <div className="shop-row-desc">{it.description || `${it.type}`}</div>
              </div>
              <div className="shop-row-price">{it.buyPrice} 💰</div>
              <input
                className="shop-qty"
                type="number"
                min={1}
                value={getQty(it.id)}
                onChange={(e) => setQty(it.id, parseInt(e.target.value, 10))}
              />
              <button
                className="ach-claim-btn"
                disabled={busy === it.id || gold < it.buyPrice * getQty(it.id)}
                onClick={() => buy(it)}
              >
                {busy === it.id ? '…' : '购买'}
              </button>
            </div>
          ))}
        </div>
      ) : sellRows.length === 0 ? (
        <div className="sys-empty-inline">背包里没有可出售的物品</div>
      ) : (
        <div className="shop-list">
          {sellRows.map((row) => (
            <div key={row.id} className="shop-row">
              <div className="shop-row-info">
                <div className="shop-row-name">{row.name}</div>
                <div className="shop-row-desc">持有 {row.qty} 个 · 单价 {row.unit} 💰</div>
              </div>
              <div className="shop-row-price">{row.unit} 💰</div>
              <input
                className="shop-qty"
                type="number"
                min={1}
                max={row.qty}
                value={Math.min(getQty('sell_' + row.id), row.qty)}
                onChange={(e) => setQty('sell_' + row.id, parseInt(e.target.value, 10))}
              />
              <button
                className="ach-claim-btn"
                disabled={busy === row.id}
                onClick={() => sell(row)}
              >
                {busy === row.id ? '…' : '出售'}
              </button>
            </div>
          ))}
        </div>
      )}
    </PanelModal>
  );
}

// =================================================================
// 每日签到 弹窗
// =================================================================
interface CheckInReward {
  day: number;
  gold: number;
  items: Record<string, number>;
  label: string;
}
interface CheckInInfo {
  canCheckIn: boolean;
  streak: number;
  totalDays: number;
  nextCycleDay: number;
  rewards: CheckInReward[];
  lastDate?: string;
}

export function CheckInModal({
  onClose,
  onChange
}: {
  onClose: () => void;
  onChange?: () => void;
}) {
  const [info, setInfo] = useState<CheckInInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await apiClient.getCheckIn();
      setInfo(res);
    } catch (e) {
      toast.error('签到信息加载失败');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const checkIn = async () => {
    setClaiming(true);
    try {
      const res: any = await apiClient.doCheckIn();
      const itemText = Object.entries(res.reward.items || {})
        .map(([k, v]) => `${getItemName(k)}×${v}`)
        .join('、');
      toast.reward(`签到成功（连续${res.streak}天）+${res.reward.gold}金币${itemText ? '、' + itemText : ''}`);
      onChange?.();
      await load();
    } catch (e: any) {
      toast.error(e?.message || '签到失败');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <PanelModal title="每日签到" icon="🎁" onClose={onClose}>
      {loading || !info ? (
        <div className="prog-loading">加载中…</div>
      ) : (
        <>
          <div className="checkin-summary">
            <div className="checkin-stat">
              <span className="checkin-stat-value">{info.streak}</span>
              <span className="checkin-stat-label">连续签到（天）</span>
            </div>
            <div className="checkin-stat">
              <span className="checkin-stat-value">{info.totalDays}</span>
              <span className="checkin-stat-label">累计签到（天）</span>
            </div>
          </div>

          <div className="checkin-grid">
            {info.rewards.map((r) => {
              const isToday = r.day === info.nextCycleDay && info.canCheckIn;
              const claimed = r.day < info.nextCycleDay || (r.day === info.nextCycleDay && !info.canCheckIn);
              return (
                <div
                  key={r.day}
                  className={`checkin-cell ${isToday ? 'today' : ''} ${claimed ? 'claimed' : ''}`}
                >
                  <div className="checkin-day">第{r.day}天</div>
                  <div className="checkin-reward-gold">💰{r.gold}</div>
                  <div className="checkin-reward-items">
                    {Object.entries(r.items).map(([k, v]) => (
                      <span key={k} className="checkin-item">{getItemName(k)}×{v}</span>
                    ))}
                  </div>
                  {claimed && <div className="checkin-check">✓</div>}
                </div>
              );
            })}
          </div>

          <button
            className="checkin-btn"
            disabled={!info.canCheckIn || claiming}
            onClick={checkIn}
          >
            {claiming ? '签到中…' : info.canCheckIn ? `领取第 ${info.nextCycleDay} 天奖励` : '今日已签到'}
          </button>
        </>
      )}
    </PanelModal>
  );
}
