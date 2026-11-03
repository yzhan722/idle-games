import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMemoryStorage } from "./storage_memory";
import { summarizeOrders } from "./storage";
import enhancedContentPack from "../../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack } from "./types";

const pack = enhancedContentPack as EnhancedContentPack;

describe("MWI market summary (best ask / bid per item)", () => {
  it("folds orders into lowest ask, highest bid and depth per side", () => {
    const q = summarizeOrders([
      { itemId: "wood_1", type: "sell", price: 12, quantity: 5 },
      { itemId: "wood_1", type: "sell", price: 9, quantity: 2 },
      { itemId: "wood_1", type: "buy", price: 6, quantity: 10 },
      { itemId: "wood_1", type: "buy", price: 7, quantity: 1 },
      { itemId: "lumber_1", type: "buy", price: 20, quantity: 3 },
      { itemId: "ore_1", type: "sell", price: 5, quantity: 0 }, // exhausted rows are ignored
    ]);
    assert.deepEqual(q.wood_1, { ask: 9, askQty: 7, bid: 7, bidQty: 11 });
    assert.deepEqual(q.lumber_1, { askQty: 0, bid: 20, bidQty: 3 });
    assert.equal(q.ore_1, undefined);
  });

  it("the memory store reports live orders and drops them when cancelled", async () => {
    const storage = createMemoryStorage();
    const seller = await storage.findOrCreateGuestUser(`mkt-s-${Math.random()}`);
    const buyer = await storage.findOrCreateGuestUser(`mkt-b-${Math.random()}`);
    const s = await storage.getOrCreatePlayerState(seller.id, pack.version);
    s.inventory.wood_1 = 10;
    await storage.savePlayerState(seller.id, s);
    const b = await storage.getOrCreatePlayerState(buyer.id, pack.version);
    b.inventory.gold = 1000;
    await storage.savePlayerState(buyer.id, b);

    const ask = await storage.createTradingOrder({ userId: seller.id, itemId: "wood_1", quantity: 4, price: 11, type: "sell" });
    await storage.createTradingOrder({ userId: buyer.id, itemId: "wood_1", quantity: 3, price: 8, type: "buy" });
    assert.deepEqual((await storage.getMarketSummary()).wood_1, { ask: 11, askQty: 4, bid: 8, bidQty: 3 });

    await storage.cancelTradingOrder({ userId: seller.id, orderId: ask.id });
    assert.deepEqual((await storage.getMarketSummary()).wood_1, { askQty: 0, bid: 8, bidQty: 3 });
    await storage.close();
  });
});
