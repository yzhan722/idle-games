/** 市场估算价与可挂区间：服务端算（backend/src/market_price.ts），这里只负责显示与输入夹紧。 */
export type MarketEstimate = {
  itemId: string;
  estimate: number;
  priceRange: { min: number; max: number };
  samples: number;
  source: "trades" | "base";
};

/** 一行文字，例如「估价 120 · 可挂 40～360」。 */
export function estimateLine(e: MarketEstimate | null | undefined): string {
  return e ? `估价 ${e.estimate} · 可挂 ${e.priceRange.min}～${e.priceRange.max}` : "";
}

/** 把默认单价夹进可挂区间；还没拿到区间时原样返回（服务端仍会校验）。 */
export function clampToRange(price: number, e: MarketEstimate | null | undefined): number {
  const p = Math.max(1, Math.round(Number.isFinite(price) ? price : 1));
  return e ? Math.min(e.priceRange.max, Math.max(e.priceRange.min, p)) : p;
}

export function outOfRange(price: number, e: MarketEstimate | null | undefined): boolean {
  return Boolean(e) && (price < e!.priceRange.min || price > e!.priceRange.max);
}
