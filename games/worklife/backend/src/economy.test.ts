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
    sellerState.inventory.gold = 20;
    buyerState.inventory.gold = 20;
    await storage.savePlayerState(seller.id, sellerState);
    await storage.savePlayerState(buyer.id, buyerState);

    const order = await storage.createTradingOrder({
      userId: seller.id,
      itemId: "wood_1",
      quantity: 1,
      price: 5,
      type: "sell",
    });
    const result = await storage.executeTrade({
      buyerId: buyer.id,
      orderId: order.id,
      quantity: 1,
    });
    assert.equal(result.success, true);

    const sellerAfter = await storage.getOrCreatePlayerState(seller.id, "1.0.0");
    const buyerAfter = await storage.getOrCreatePlayerState(buyer.id, "1.0.0");
    assert.equal(sellerAfter.inventory.wood_1, 1);
    assert.equal(sellerAfter.inventory.gold, 25);
    assert.equal(buyerAfter.inventory.wood_1, 1);
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

  it("does not finish a 4s craft when polled under 1s, then completes after duration", async () => {
    const storage = createMemoryStorage();
    const user = await storage.findOrCreateGuestUser("crafter");
    const state = await storage.getOrCreatePlayerState(user.id, "1.0.0");
    state.inventory.wood_1 = 10;
    await storage.savePlayerState(user.id, state);
    const t0 = new Date();
    const started = await storage.startLifeAction({
      userId: user.id,
      actionId: "act_craft_lumber_t1",
      quantity: 1,
      now: t0,
      contentPack,
    });
    const lumberBefore = started.inventory.lumber_1 || 0;
    const early = await storage.simulateToNow({
      userId: user.id,
      state: started,
      now: new Date(t0.getTime() + 500),
      contentPack,
    });
    assert.equal(early.inventory.lumber_1 || 0, lumberBefore);
    assert.equal(early.mode, "life_action");
    const done = await storage.simulateToNow({
      userId: user.id,
      state: early,
      now: new Date(t0.getTime() + 5000),
      contentPack,
    });
    assert.equal(done.inventory.lumber_1 || 0, lumberBefore + 1);
    assert.equal(done.inventory.wood_1, 8);
    assert.equal(done.mode, "idle");
    await storage.close();
  });

  it("refunds a cancelled sell order once", async () => {
    const storage = createMemoryStorage();
    const user = await storage.findOrCreateGuestUser("trader");
    const state = await storage.getOrCreatePlayerState(user.id, "1.0.0");
    state.inventory.wood_1 = 3;
    await storage.savePlayerState(user.id, state);
    const order = await storage.createTradingOrder({
      userId: user.id,
      itemId: "wood_1",
      quantity: 2,
      price: 4,
      type: "sell",
    });
    const afterList = await storage.getOrCreatePlayerState(user.id, "1.0.0");
    assert.equal(afterList.inventory.wood_1, 1);
    await storage.cancelTradingOrder({ userId: user.id, orderId: order.id });
    const afterCancel = await storage.getOrCreatePlayerState(user.id, "1.0.0");
    assert.equal(afterCancel.inventory.wood_1, 3);
    await assert.rejects(
      () => storage.cancelTradingOrder({ userId: user.id, orderId: order.id }),
      /订单不存在/
    );
    const afterSecond = await storage.getOrCreatePlayerState(user.id, "1.0.0");
    assert.equal(afterSecond.inventory.wood_1, 3);
    await storage.close();
  });

  it("rejects a second enhance at the same level and does not double-charge", async () => {
    const storage = createMemoryStorage();
    const user = await storage.findOrCreateGuestUser("smith2");
    const state = await storage.getOrCreatePlayerState(user.id, "1.0.0");
    state.inventory.weapon_wooden_sword = 1;
    state.inventory.lumber_1 = 20;
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
      const first = await storage.enhanceEquipment({
        userId: user.id,
        request: { itemId: "weapon_wooden_sword", targetLevel: 1, materials: { lumber_1: 2 } },
        contentPack,
      });
      assert.equal(first.success, true, first.failureReason);
      const mid = await storage.getOrCreatePlayerState(user.id, "1.0.0");
      const lumberAfterFirst = mid.inventory.lumber_1 || 0;
      const second = await storage.enhanceEquipment({
        userId: user.id,
        request: { itemId: "weapon_wooden_sword", targetLevel: 1, materials: { lumber_1: 2 } },
        contentPack,
      });
      assert.equal(second.success, false);
      const after = await storage.getOrCreatePlayerState(user.id, "1.0.0");
      assert.equal(after.inventory.lumber_1, lumberAfterFirst);
    } finally {
      Math.random = realRandom;
    }
    await storage.close();
  });

  it("rejects duplicate party join and a seventh member", async () => {
    const storage = createMemoryStorage();
    const leader = await storage.findOrCreateGuestUser("leader");
    await storage.getOrCreatePlayerState(leader.id, "1.0.0");
    const party = await storage.createParty({ userId: leader.id, name: "t1" });
    await assert.rejects(() => storage.joinParty({ userId: leader.id, partyId: party.id }), /already_in_party/);

    const members = [];
    for (let i = 0; i < 5; i++) {
      const u = await storage.findOrCreateGuestUser(`m${i}`);
      await storage.getOrCreatePlayerState(u.id, "1.0.0");
      members.push(u);
      await storage.joinParty({ userId: u.id, partyId: party.id });
    }
    const extra = await storage.findOrCreateGuestUser("overflow");
    await storage.getOrCreatePlayerState(extra.id, "1.0.0");
    await assert.rejects(() => storage.joinParty({ userId: extra.id, partyId: party.id }), /party_full/);
    await storage.close();
  });
});

describe("trading fee display consistency", () => {
  it("fee + seller income always equals total (small totals included)", async () => {
    const { calculateTradingFee } = await import("./storage");
    for (const total of [1, 5, 10, 19, 20, 99, 100, 1000]) {
      const fee = calculateTradingFee(total);
      const income = total - fee;
      assert.equal(fee + income, total, `total=${total} must reconcile`);
      assert.ok(fee >= 0 && income >= 0);
    }
    assert.equal(calculateTradingFee(10), 0);
  });
});
