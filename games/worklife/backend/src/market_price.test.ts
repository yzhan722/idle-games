import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Fastify from "fastify";
import packJson from "../../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack } from "./types";
import type { TradeRecord } from "./storage";
import { DELETED_ACCOUNT_ID } from "./account_deletion";
import { MARKET_NPC_DEVICE_ID, resolvePresetMarketListings } from "./market_presets";
import {
  ANCHOR,
  MAX_PER_PLAYER,
  MIN_HEADROOM,
  MIN_SAMPLES,
  PRICE_WINDOW_DAYS,
  SPREAD,
  TRADE_KEEP_PER_ITEM,
  TRADE_KEEP_PER_PAIR_DAY,
  estimateMarketPrice,
  priceInRange,
  priceSamples,
} from "./market_price";
import { tradingRoutes } from "./routes/trading";
import { createMemoryStorage } from "./storage_memory";

const pack = packJson as unknown as EnhancedContentPack;
const NOW = new Date("2026-11-26T12:00:00.000Z");
const DAY_MS = 24 * 3600_000;

let seq = 0;
function trade(price: number, patch: Partial<TradeRecord> = {}): TradeRecord {
  seq += 1;
  return { itemId: "x", price, quantity: 1, buyerId: `b${seq}`, sellerId: `s${seq}`, at: new Date(NOW.getTime() - seq * 60_000).toISOString(), ...patch };
}
const estimate = (trades: TradeRecord[], baseValue = 100, ignoreIds?: Set<string>) =>
  estimateMarketPrice({ itemId: "x", baseValue, trades, now: NOW, ignoreIds });

describe("市场估算价", () => {
  it("没有成交时按基础价值，区间最宽；基础价值坏掉也给得出价", () => {
    const e = estimate([]);
    assert.deepEqual(e, { itemId: "x", estimate: 100, priceRange: { min: Math.ceil(100 / SPREAD.wide), max: 300 }, samples: 0, source: "base" });
    for (const bad of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const x = estimate([], bad);
      assert.equal(x.estimate, 1);
      assert.deepEqual(x.priceRange, { min: 1, max: 1 + MIN_HEADROOM });
    }
  });

  it("成交越多越信行情、区间越窄；永远落在基础价值的上下限之内", () => {
    let last = 100;
    let lastWidth = Infinity;
    for (const n of [3, 6, 12, 30]) {
      const e = estimate(Array.from({ length: n }, () => trade(200)));
      assert.equal(e.source, "trades");
      assert.equal(e.samples, n);
      assert.ok(e.estimate > last && e.estimate < 200, `${n} 笔：${e.estimate}`);
      const width = e.priceRange.max / e.priceRange.min;
      assert.ok(width < lastWidth, `${n} 笔：区间应收窄`);
      assert.ok(width > SPREAD.tight * SPREAD.tight * 0.95);
      last = e.estimate;
      lastWidth = width;
    }
    const moon = estimate(Array.from({ length: 60 }, () => trade(1_000_000)));
    assert.equal(moon.estimate, 100 * ANCHOR.max);
    const crash = estimate(Array.from({ length: 60 }, () => trade(1)));
    assert.equal(crash.estimate, 100 * ANCHOR.min);
  });

  it("用中位数：少数离谱成交带不动价格", () => {
    const calm = estimate(Array.from({ length: 9 }, () => trade(100)));
    const spiked = estimate([...Array.from({ length: 9 }, () => trade(100)), trade(9999), trade(9999), trade(1)]);
    assert.equal(calm.estimate, 100);
    assert.equal(spiked.estimate, 100);
  });

  it("防刷：两个号来回倒手不算行情；同一对玩家一天只算一个样本", () => {
    const wash = Array.from({ length: 50 }, (_, i) => trade(5000, i % 2 ? { buyerId: "A", sellerId: "B" } : { buyerId: "B", sellerId: "A" }));
    assert.equal(priceSamples(wash, new Set(), NOW).length, 1);
    assert.equal(estimate(wash).source, "base");
    const days = Array.from({ length: 13 }, (_, i) => trade(5000, { buyerId: "A", sellerId: "B", at: new Date(NOW.getTime() - (i + 1) * DAY_MS).toISOString() }));
    assert.ok(priceSamples(days, new Set(), NOW).length <= MAX_PER_PLAYER, "天天倒手也有上限");
    assert.equal(estimate(days).source, "base", "只有一个买方一个卖方，不算行情");
  });

  it("防刷：一个人同时和很多人交易，最多占 MAX_PER_PLAYER 个样本", () => {
    const hub = Array.from({ length: 20 }, (_, i) => trade(5000, { sellerId: "hub", buyerId: `fan${i}` }));
    assert.equal(priceSamples(hub, new Set(), NOW).length, MAX_PER_PLAYER);
    assert.equal(estimate(hub).source, "base", "只有一个卖方，不算行情");
    const honest = Array.from({ length: 12 }, () => trade(100));
    assert.ok(estimate([...hub, ...honest]).estimate <= 110, "混进真实成交后也带不动");
  });

  it("不计：自买自卖、商会补给站、已注销账号、过期与未来时间、坏数据", () => {
    const junk = [
      trade(9000, { buyerId: "same", sellerId: "same" }),
      trade(9000, { sellerId: "npc" }),
      trade(9000, { buyerId: DELETED_ACCOUNT_ID }),
      trade(9000, { at: new Date(NOW.getTime() - (PRICE_WINDOW_DAYS + 1) * DAY_MS).toISOString() }),
      trade(9000, { at: new Date(NOW.getTime() + DAY_MS).toISOString() }),
      trade(9000, { at: "bad" }),
      trade(-1),
      trade(9000, { quantity: 0 }),
    ];
    assert.equal(priceSamples(junk, new Set(["npc"]), NOW).length, 0);
    const e = estimate([...junk, trade(100), trade(100)], 100, new Set(["npc"]));
    assert.equal(e.source, "base", `不足 ${MIN_SAMPLES} 个样本`);
  });

  it("区间边界：最低、最高都能挂，差一个金币就不行；最便宜的东西也留得出空间", () => {
    const e = estimate([], 90);
    assert.equal(priceInRange(e.priceRange.min, e), true);
    assert.equal(priceInRange(e.priceRange.max, e), true);
    assert.equal(priceInRange(e.priceRange.min - 1, e), false);
    assert.equal(priceInRange(e.priceRange.max + 1, e), false);
    assert.equal(priceInRange(Number.NaN, e), false);
    for (const item of pack.items as Array<{ id: string; value?: number }>) {
      if (item.id === "gold") continue;
      const x = estimateMarketPrice({ itemId: item.id, baseValue: Number(item.value || 1), trades: [], now: NOW });
      assert.ok(x.priceRange.min >= 1 && x.priceRange.min <= x.estimate && x.priceRange.max > x.estimate, item.id);
      assert.ok(Number.isInteger(x.priceRange.min) && Number.isInteger(x.priceRange.max));
    }
  });

  it("没有行情时，商会补给站的卖价和收购价都在玩家可挂的区间里", () => {
    for (const listing of resolvePresetMarketListings(pack)) {
      const item = (pack.items as Array<{ id: string; value?: number }>).find((i) => i.id === listing.itemId)!;
      const e = estimateMarketPrice({ itemId: item.id, baseValue: Number(item.value || 1), trades: [], now: NOW });
      assert.ok(priceInRange(listing.price, e), `${item.id}: ${listing.price} 不在 ${e.priceRange.min}～${e.priceRange.max}`);
    }
  });
});

async function marketApp() {
  const storage = createMemoryStorage();
  const app = Fastify({ logger: false });
  app.addHook("onRequest", async (req) => {
    (req as any).userId = req.headers["x-user"];
  });
  await tradingRoutes(app, storage, pack);
  const player = async (key: string) => {
    const user = await storage.findOrCreateGuestUser(`mp-${key}-${Math.random()}`);
    const state = await storage.getOrCreatePlayerState(user.id, pack.version);
    state.inventory.gold = 1_000_000;
    state.inventory.ore_5 = 500;
    return user.id;
  };
  const value = Number((pack.items as Array<{ id: string; value?: number }>).find((i) => i.id === "ore_5")!.value);
  const order = (userId: string, price: number, type = "sell", extra: object = {}) =>
    app.inject({ method: "POST", url: "/trading/orders", headers: { "x-user": userId }, payload: { itemId: "ore_5", quantity: 1, price, type, ...extra } });
  const getEstimate = async (userId: string, itemId = "ore_5") =>
    app.inject({ method: "GET", url: `/trading/estimate/${itemId}`, headers: { "x-user": userId } });
  return { storage, app, player, value, order, getEstimate, async close() { await app.close(); await storage.close(); } };
}

describe("挂单区间由服务端校验", () => {
  it("出售单、收购单都要在区间内；超出的不扣东西；估价接口给出同样的区间", async () => {
    const m = await marketApp();
    try {
      const a = await m.player("a");
      const e = (await m.getEstimate(a)).json();
      assert.equal(e.estimate, m.value);
      assert.equal(e.source, "base");
      for (const type of ["sell", "buy"]) {
        for (const price of [e.priceRange.min - 1, e.priceRange.max + 1].filter((p) => p >= 1)) {
          const before = JSON.stringify((await m.storage.getOrCreatePlayerState(a, pack.version)).inventory);
          const res = await m.order(a, price, type);
          assert.equal(res.statusCode, 400, `${type} ${price}`);
          assert.equal(res.json().error, "price_out_of_range");
          assert.match(res.json().message, /单价需在 \d+～\d+ 金币之间/);
          assert.equal(JSON.stringify((await m.storage.getOrCreatePlayerState(a, pack.version)).inventory), before, "没有扣物品或金币");
        }
        for (const price of [e.priceRange.min, e.priceRange.max]) assert.equal((await m.order(a, price, type)).statusCode, 200, `${type} ${price}`);
      }
      assert.equal((await m.getEstimate(a, "no_such_item")).statusCode, 404);
      assert.equal((await m.getEstimate(a, "gold")).statusCode, 404);
      assert.equal((await m.app.inject({ method: "GET", url: "/trading/estimate/ore_5" })).statusCode, 401);
    } finally {
      await m.close();
    }
  });

  it("旧挂单不受影响：区间外的老单照样能成交、能撤；同一 operationId 重放不会再校验", async () => {
    const m = await marketApp();
    try {
      const seller = await m.player("seller");
      const buyer = await m.player("buyer");
      const wild = m.value * 50;
      const old1 = await m.storage.createTradingOrder({ userId: seller, itemId: "ore_5", quantity: 1, price: wild, type: "sell" });
      const old2 = await m.storage.createTradingOrder({ userId: seller, itemId: "ore_5", quantity: 1, price: wild, type: "sell" });
      const bought = await m.app.inject({ method: "POST", url: "/trading/buy", headers: { "x-user": buyer }, payload: { orderId: old1.id, quantity: 1 } });
      assert.equal(bought.statusCode, 200);
      const cancelled = await m.app.inject({ method: "DELETE", url: `/trading/orders/${old2.id}`, headers: { "x-user": seller } });
      assert.equal(cancelled.statusCode, 200);

      const first = await m.order(seller, m.value, "sell", { operationId: "op-market-1" });
      const replay = await m.order(seller, m.value, "sell", { operationId: "op-market-1" });
      assert.equal(first.statusCode, 200);
      assert.equal(replay.json().id, first.json().id);
    } finally {
      await m.close();
    }
  });

  it("真实成交之后估价跟着动；和商会补给站的成交不算", async () => {
    const m = await marketApp();
    try {
      const price = Math.round(m.value * 2);
      for (let i = 0; i < 6; i++) {
        const seller = await m.player(`s${i}`);
        const buyer = await m.player(`b${i}`);
        const o = await m.order(seller, price);
        assert.equal(o.statusCode, 200);
        assert.equal((await m.app.inject({ method: "POST", url: "/trading/buy", headers: { "x-user": buyer }, payload: { orderId: o.json().id, quantity: 1 } })).statusCode, 200);
      }
      const viewer = await m.player("viewer");
      const e = (await m.getEstimate(viewer)).json();
      assert.equal(e.source, "trades");
      assert.equal(e.samples, 6);
      assert.ok(e.estimate > m.value && e.estimate < price);

      const npc = await m.storage.findOrCreateGuestUser(MARKET_NPC_DEVICE_ID);
      const npcOrder = (await m.storage.getMyTradingOrders({ userId: npc.id })).find((o) => o.type === "sell")!;
      for (let i = 0; i < 5; i++) {
        const who = await m.player(`n${i}`);
        await m.storage.executeTrade({ buyerId: who, orderId: npcOrder.id, quantity: 1 });
      }
      assert.equal((await m.getEstimate(viewer, npcOrder.itemId)).json().source, "base");
    } finally {
      await m.close();
    }
  });

  it("成交记录有上限：同一对玩家一天最多记几笔，刷单挤不掉别人的成交", async () => {
    const m = await marketApp();
    try {
      const a = await m.player("spam-a");
      const b = await m.player("spam-b");
      const o = await m.storage.createTradingOrder({ userId: a, itemId: "ore_5", quantity: 300, price: 10, type: "sell" });
      for (let i = 0; i < 300; i++) await m.storage.executeTrade({ buyerId: b, orderId: o.id, quantity: 1 });
      const list = await m.storage.getRecentTrades({ itemId: "ore_5", days: 14, now: new Date() });
      assert.equal(list.length, TRADE_KEEP_PER_PAIR_DAY);
      assert.ok(list.length <= TRADE_KEEP_PER_ITEM);
    } finally {
      await m.close();
    }
  });
});
