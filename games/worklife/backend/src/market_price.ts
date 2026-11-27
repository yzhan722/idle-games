import { DELETED_ACCOUNT_ID } from "./account_deletion";
import type { TradeRecord } from "./storage";

/**
 * 市场估算价与可挂单区间。
 *
 * 1. 取样：只看最近 WINDOW_DAYS 天的玩家间成交（商会补给站的不算）。
 *    同一对买卖双方同一天只算一个样本（取那天的中位单价），每名玩家最多占 MAX_PER_PLAYER 个样本，
 *    样本里要有至少 MIN_SAMPLES 个、且买方卖方各不少于 2 人，否则当作没有行情。
 *    所以两个号来回倒手、一个号反复自买，都动不了价格。
 * 2. 估价：把样本中位数与基础价值（内容包 value）按「样本越多越信行情」在对数上混合，
 *    再限制在基础价值的 ANCHOR.min～ANCHOR.max 倍。没有行情就等于基础价值。
 * 3. 区间：估价 ÷ 倍数 ～ 估价 × 倍数，倍数从没有行情时的 SPREAD.wide 收窄到行情充足时的 SPREAD.tight。
 *
 * 只在新挂单时检查；已经挂着的单不受影响，可以照常成交或撤下。
 */
export const PRICE_WINDOW_DAYS = 14;
/** 每种物品最多保留 / 读取的成交笔数。 */
export const TRADE_KEEP_PER_ITEM = 200;
/** 同一对玩家同一天最多记这么多笔，免得刷单把别人的成交挤出去。 */
export const TRADE_KEEP_PER_PAIR_DAY = 5;
export const MIN_SAMPLES = 3;
export const MAX_PER_PLAYER = 3;
/** 样本数等于它时，行情与基础价值各占一半。 */
export const TRUST_HALF = 4;
export const ANCHOR = { min: 0.2, max: 25 } as const;
export const SPREAD = { wide: 3, tight: 1.5 } as const;
/** 几个金币的小东西，倍数太小没法挂，上限至少比估价多这么多。 */
export const MIN_HEADROOM = 5;

export type MarketEstimate = {
  itemId: string;
  /** 估算价（整数金币）。 */
  estimate: number;
  /** 可挂单的最低 / 最高单价。 */
  priceRange: { min: number; max: number };
  /** 参与估价的样本数。 */
  samples: number;
  /** trades = 有行情；base = 行情不足，按基础价值。 */
  source: "trades" | "base";
};

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

type Sample = { price: number; buyerId: string; sellerId: string; at: number };

/** 防刷取样：同一对玩家一天一个样本，每人最多 MAX_PER_PLAYER 个，新的优先。 */
export function priceSamples(trades: readonly TradeRecord[], ignoreIds: ReadonlySet<string>, now: Date): Sample[] {
  const since = now.getTime() - PRICE_WINDOW_DAYS * 24 * 3600_000;
  const groups = new Map<string, { prices: number[]; buyerId: string; sellerId: string; at: number }>();
  for (const t of trades) {
    const at = Date.parse(t.at);
    if (!Number.isFinite(at) || at < since || at > now.getTime()) continue;
    if (!(t.price > 0) || !(t.quantity > 0) || t.buyerId === t.sellerId) continue;
    // 注销账号抹去了编号，分不清是谁，不再参与估价
    if ([t.buyerId, t.sellerId].some((id) => ignoreIds.has(id) || id === DELETED_ACCOUNT_ID)) continue;
    const pair = [t.buyerId, t.sellerId].sort().join("|");
    const key = `${pair}|${t.at.slice(0, 10)}`;
    const group = groups.get(key);
    if (group) {
      group.prices.push(t.price);
      group.at = Math.max(group.at, at);
    } else {
      groups.set(key, { prices: [t.price], buyerId: t.buyerId, sellerId: t.sellerId, at });
    }
  }
  const used = new Map<string, number>();
  const out: Sample[] = [];
  for (const g of [...groups.values()].sort((a, b) => b.at - a.at)) {
    const counts = [g.buyerId, g.sellerId].map((id) => used.get(id) ?? 0);
    if (counts.some((n) => n >= MAX_PER_PLAYER)) continue;
    for (const id of [g.buyerId, g.sellerId]) used.set(id, (used.get(id) ?? 0) + 1);
    out.push({ price: median(g.prices), buyerId: g.buyerId, sellerId: g.sellerId, at: g.at });
  }
  return out;
}

export function estimateMarketPrice(params: {
  itemId: string;
  baseValue: number;
  trades: readonly TradeRecord[];
  now: Date;
  /** 不参与估价的账号（商会补给站）。 */
  ignoreIds?: ReadonlySet<string>;
}): MarketEstimate {
  const base = Math.max(1, Number.isFinite(params.baseValue) ? params.baseValue : 1);
  const samples = priceSamples(params.trades, params.ignoreIds ?? new Set(), params.now);
  const enough =
    samples.length >= MIN_SAMPLES &&
    new Set(samples.map((s) => s.buyerId)).size >= 2 &&
    new Set(samples.map((s) => s.sellerId)).size >= 2;
  const trust = enough ? samples.length / (samples.length + TRUST_HALF) : 0;
  const blended = enough
    ? Math.exp((1 - trust) * Math.log(base) + trust * Math.log(Math.max(1, median(samples.map((s) => s.price)))))
    : base;
  const estimate = Math.max(1, Math.round(Math.min(base * ANCHOR.max, Math.max(base * ANCHOR.min, blended))));
  const spread = SPREAD.tight + (SPREAD.wide - SPREAD.tight) * (1 - trust);
  return {
    itemId: params.itemId,
    estimate,
    priceRange: {
      min: Math.max(1, Math.ceil(estimate / spread)),
      max: Math.max(estimate + MIN_HEADROOM, Math.floor(estimate * spread)),
    },
    samples: enough ? samples.length : 0,
    source: enough ? "trades" : "base",
  };
}

export function priceInRange(price: number, estimate: MarketEstimate): boolean {
  return Number.isFinite(price) && price >= estimate.priceRange.min && price <= estimate.priceRange.max;
}
