import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createMemoryStorage } from "./storage_memory";
import enhancedContentPack from "../../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack } from "./types";

const contentPack = enhancedContentPack as EnhancedContentPack;

describe("economy loops", () => {
  it("grants wood from chopping after the action duration elapses", async () => {
    const storage = createMemoryStorage();
    const user = await storage.findOrCreateGuestUser("chopper");
    await storage.getOrCreatePlayerState(user.id, contentPack.version || "1.0.0");
    const t0 = new Date();
    const started = await storage.startLifeAction({
      userId: user.id,
      actionId: "act_chop_wood_t1",
      now: t0,
      contentPack,
    });
    const woodBefore = started.inventory.wood_1 || 0;
    const after = await storage.simulateToNow({
      userId: user.id,
      state: started,
      now: new Date(t0.getTime() + 8000),
      contentPack,
    });
    assert.ok((after.inventory.wood_1 || 0) > woodBefore, `wood ${after.inventory.wood_1} vs ${woodBefore}`);
    await storage.close();
  });

  it("moves gold and items atomically between buyer and seller", async () => {
    const storage = createMemoryStorage();
    const seller = await storage.findOrCreateGuestUser("seller");
    const buyer = await storage.findOrCreateGuestUser("buyer");
    const sellerState = await storage.getOrCreatePlayerState(seller.id, "1.0.0");
    const buyerState = await storage.getOrCreatePlayerState(buyer.id, "1.0.0");
    sellerState.inventory.wood_1 = 2;
    buyerState.inventory.gold = 20;
    await storage.savePlayerState(seller.id, sellerState);
    await storage.savePlayerState(buyer.id, buyerState);

    const listing = await storage.listItemForSale({
      userId: seller.id,
      itemId: "wood_1",
      quantity: 1,
      pricePerUnit: 5,
    });
    const result = await storage.purchaseItem({
      userId: buyer.id,
      listingId: listing.id,
      quantity: 1,
    });
    assert.equal(result.success, true);

    const sellerAfter = await storage.getOrCreatePlayerState(seller.id, "1.0.0");
    const buyerAfter = await storage.getOrCreatePlayerState(buyer.id, "1.0.0");
    assert.equal(sellerAfter.inventory.wood_1, 1);
    assert.ok((sellerAfter.inventory.gold || 0) >= 25);
    assert.equal(buyerAfter.inventory.wood_1, 5);
    assert.ok((buyerAfter.inventory.gold || 0) < 20);
    await storage.close();
  });

  it("consumes enhancement materials when upgrading a wooden sword", async () => {
    const storage = createMemoryStorage();
    const user = await storage.findOrCreateGuestUser("smith");
    const state = await storage.getOrCreatePlayerState(user.id, "1.0.0");
    state.inventory.weapon_wooden_sword = 1;
    state.inventory.lumber_1 = 10;
    state.inventory.gold = 200;
    state.skills.skill_woodcutter = {
      level: 5,
      xp: 0,
      unlockedRecipes: ["woodcutter_enhancement"],
      enhancementLevel: 0,
    };
    await storage.savePlayerState(user.id, state);

    const realRandom = Math.random;
    Math.random = () => 0;
    try {
      const result = await storage.enhanceEquipment({
        userId: user.id,
        request: { itemId: "weapon_wooden_sword", targetLevel: 1, materials: { lumber_1: 2 } },
        contentPack,
      });
      assert.equal(result.success, true, result.failureReason);
      assert.equal(result.newLevel, 1);
      const after = await storage.getOrCreatePlayerState(user.id, "1.0.0");
      assert.ok((after.inventory.lumber_1 || 0) < 10);
    } finally {
      Math.random = realRandom;
    }
    await storage.close();
  });
});
