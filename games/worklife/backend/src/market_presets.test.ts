import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createMemoryStorage } from "./storage_memory";
import {
  MARKET_NPC_DEVICE_ID,
  PRESET_MARKET_SPECS,
  ensurePresetMarketOrders,
  resolvePresetMarketListings,
} from "./market_presets";
import enhancedContentPack from "../../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack } from "./types";

const contentPack = enhancedContentPack as EnhancedContentPack;

describe("preset market resources (商会补给站)", () => {
  it("resolves all preset specs against the content pack with prices strictly above normal item value", () => {
    const itemMap = new Map(contentPack.items.map((i: any) => [i.id, i]));
    const listings = resolvePresetMarketListings(contentPack);
    assert.equal(listings.length, PRESET_MARKET_SPECS.length);

    const listingById = new Map(listings.map((l) => [l.itemId, l]));
    for (const listing of listings) {
      const item = itemMap.get(listing.itemId) as any;
      assert.ok(item, `preset item ${listing.itemId} must exist in content pack`);
      const normalPrice = Number(item.value || 1);
      assert.ok(
        listing.price > normalPrice,
        `${listing.itemId}: preset price ${listing.price} must be higher than normal value ${normalPrice}`
      );
      assert.ok(
        listing.price >= Math.ceil(normalPrice * 1.65),
        `${listing.itemId}: preset price ${listing.price} should have >=1.65x markup over ${normalPrice}`
      );
    }

    // Refined materials must be priced higher than their raw counterparts (T1-T2 only; T3+ have no preset sell orders)
    for (const tier of [1, 2]) {
      assert.ok(listingById.get(`lumber_${tier}`)!.price > listingById.get(`wood_${tier}`)!.price);
      assert.ok(listingById.get(`ingot_${tier}`)!.price > listingById.get(`ore_${tier}`)!.price);
      assert.ok(listingById.get(`yarn_${tier}`)!.price > listingById.get(`fiber_${tier}`)!.price);
    }
    // High-tier materials and rare drops do not have preset sell orders
    assert.equal(listingById.get("wood_3"), undefined);
    assert.equal(listingById.get("mirror_protection"), undefined);
    assert.equal(listingById.get("poison_sac"), undefined);
  });

  it("seeds preset sell and buy orders idempotently, lets players buy starter resources, and replenishes when low", async () => {
    const storage = createMemoryStorage();
    await ensurePresetMarketOrders(storage, contentPack);
    // Second call is a no-op when stock is healthy
    await ensurePresetMarketOrders(storage, contentPack);

    const summary = await storage.getMarketSummary();
    assert.ok(summary.wood_1?.ask && summary.wood_1.ask > 8);
    assert.equal(summary.wood_1?.askQty, 300);
    assert.ok(summary.wood_1?.bid && summary.wood_1.bid < 8);
    assert.ok((summary.wood_1?.bidQty || 0) > 0);
    // High-tier / rare materials have buy (bid) orders but NO preset sell (ask) orders
    assert.equal(summary.wood_3?.ask, undefined);
    assert.ok(summary.wood_3?.bid && summary.wood_3.bid > 0);
    assert.ok(summary.charcoal?.ask && summary.charcoal.ask > 10);
    assert.ok(summary.grain?.ask && summary.grain.ask > 3);
    assert.ok(summary.ingot_1?.ask && summary.ingot_1.ask > 8);

    const woodOrders = await storage.getTradingOrders({ itemId: "wood_1" });
    const woodSellOrders = woodOrders.filter((o) => o.type === "sell");
    const woodBuyOrders = woodOrders.filter((o) => o.type === "buy");
    assert.equal(woodSellOrders.length, 1);
    assert.equal(woodBuyOrders.length, 1);
    assert.equal(woodSellOrders[0].username, MARKET_NPC_DEVICE_ID);

    // A new player with starter gold can buy cross-profession resources from the preset order
    const buyer = await storage.findOrCreateGuestUser("starter-buyer");
    const buyerState = await storage.getOrCreatePlayerState(buyer.id, contentPack.version);
    buyerState.inventory.gold = 5000;
    await storage.savePlayerState(buyer.id, buyerState);

    const tradeRes = await storage.executeTrade({
      buyerId: buyer.id,
      orderId: woodSellOrders[0].id,
      quantity: 200, // leaves 100 (< 40% of 300 = 120), triggering replenishment on next check
    });
    assert.equal(tradeRes.success, true);

    const buyerAfter = await storage.getOrCreatePlayerState(buyer.id, contentPack.version);
    assert.equal(buyerAfter.inventory.wood_1, 200);

    // Replenish brings wood_1 back up to targetQty (300)
    await ensurePresetMarketOrders(storage, contentPack, "wood_1");
    const summaryAfter = await storage.getMarketSummary();
    assert.equal(summaryAfter.wood_1?.askQty, 300);

    await storage.close();
  });
});
