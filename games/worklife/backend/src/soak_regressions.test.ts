import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createMemoryStorage } from "./storage_memory";
import { buyFromShop, sellToShop } from "./systems";
import { doPrestige } from "./progression2";
import { canEquipItem } from "./equipment_equip";
import { startLifeActionNow, ensurePlayerExtensions, getActionRates, getEquippedCombatStats, CRAFT_SKILL_BY_PROFESSION } from "./storage";
import { startHpCombat, tickHpCombat } from "./hp_combat";
import { buyTaskShop, claimGift } from "./tasks";
import { claimDailyQuest, ensureDailyQuests } from "./progression";
import { ensureBounties, rerollBounties } from "./progression2";
import enhancedContentPack from "../../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack, EnhancedPlayerState } from "./types";

const contentPack = enhancedContentPack as EnhancedContentPack;

async function ctx(storage: ReturnType<typeof createMemoryStorage>, name: string) {
  const user = await storage.findOrCreateGuestUser(name);
  const state = await storage.getOrCreatePlayerState(user.id, "1.0.0");
  return { user, state };
}

const ENHANCABLE = "weapon_wooden_sword";
const ENH_PROFESSION = "woodcutter";

function giveEnhancementSkill(state: EnhancedPlayerState) {
  state.skills[`skill_${ENH_PROFESSION}`] = {
    level: 10,
    xp: 0,
    unlockedRecipes: [`${ENH_PROFESSION}_enhancement`],
    enhancementLevel: 0,
  };
}

function giveEnhanceMats(state: EnhancedPlayerState) {
  state.inventory[ENHANCABLE] = (state.inventory[ENHANCABLE] || 0) + 1;
  state.inventory.lumber_1 = (state.inventory.lumber_1 || 0) + 50;
  state.inventory.gold = (state.inventory.gold || 0) + 100000;
}

describe("soak regressions — market/orderbook", () => {
  it("createTradingOrder rejects invalid qty/price/type and gold", async () => {
    const storage = createMemoryStorage();
    const { user, state } = await ctx(storage, "mkt-seller");
    state.inventory.wood_1 = 100;
    state.inventory.gold = 10000;
    await storage.savePlayerState(user.id, state);

    const bad: Array<[string, number, number, "sell" | "buy"]> = [
      ["wood_1", 0, 10, "sell"],
      ["wood_1", -3, 10, "sell"],
      ["wood_1", NaN, 10, "sell"],
      ["wood_1", 1.5, 10, "sell"],
      ["wood_1", 1, 0, "sell"],
      ["wood_1", 1, -5, "sell"],
      ["wood_1", 1, NaN, "sell"],
      ["gold", 10, 1, "sell"],
      ["gold", 10, 1, "buy"],
    ];
    for (const [itemId, quantity, price, type] of bad) {
      await assert.rejects(
        () => storage.createTradingOrder({ userId: user.id, itemId, quantity, price, type }),
        `${itemId}/${quantity}/${price}/${type} should throw`
      );
    }
    await assert.rejects(
      () => storage.createTradingOrder({ userId: user.id, itemId: "wood_1", quantity: 1, price: 1, type: "swap" as never }),
      /订单类型无效/
    );
    // 库存未被污染
    const after = await storage.getOrCreatePlayerState(user.id, "1.0.0");
    assert.equal(after.inventory.wood_1, 100);
    assert.equal(after.inventory.gold, 10000);
    await storage.close();
  });

  it("executeTrade rejects non-positive/NaN/fractional quantities", async () => {
    const storage = createMemoryStorage();
    const { user: seller, state: ss } = await ctx(storage, "mkt-s2");
    const { user: buyer, state: bs } = await ctx(storage, "mkt-b2");
    ss.inventory.wood_1 = 50;
    bs.inventory.gold = 10000;
    await storage.savePlayerState(seller.id, ss);
    await storage.savePlayerState(buyer.id, bs);

    const order = await storage.createTradingOrder({
      userId: seller.id, itemId: "wood_1", quantity: 10, price: 5, type: "sell",
    });
    for (const q of [0, -3, NaN, 2.5]) {
      await assert.rejects(
        () => storage.executeTrade({ buyerId: buyer.id, orderId: order.id, quantity: q }),
        `quantity=${q} should throw`
      );
    }
    // 合法部分成交仍正常
    const ok = await storage.executeTrade({ buyerId: buyer.id, orderId: order.id, quantity: 2 });
    assert.equal(ok.success, true);
    const b = await storage.getOrCreatePlayerState(buyer.id, "1.0.0");
    assert.equal(b.inventory.wood_1, 2);
    await storage.close();
  });

  it("executeTrade fills buy orders: seller delivers items and receives escrowed gold", async () => {
    const storage = createMemoryStorage();
    const { user: poster, state: ps } = await ctx(storage, "mkt-buyer1");
    const { user: seller, state: ss } = await ctx(storage, "mkt-seller1");
    ps.inventory.gold = 1000;
    ss.inventory.wood_1 = 20;
    await storage.savePlayerState(poster.id, ps);
    await storage.savePlayerState(seller.id, ss);

    // 挂收购单：托管 10x5=50 金币
    const order = await storage.createTradingOrder({
      userId: poster.id, itemId: "wood_1", quantity: 10, price: 5, type: "buy",
    });
    const posterMid = await storage.getOrCreatePlayerState(poster.id, "1.0.0");
    assert.equal(posterMid.inventory.gold, 950, "挂单时金币应被托管");

    // 卖家填单 4 个
    const ok = await storage.executeTrade({ buyerId: seller.id, orderId: order.id, quantity: 4 });
    assert.equal(ok.success, true);
    const sellerAfter = await storage.getOrCreatePlayerState(seller.id, "1.0.0");
    const posterAfter = await storage.getOrCreatePlayerState(poster.id, "1.0.0");
    assert.equal(sellerAfter.inventory.wood_1, 16);
    assert.equal(sellerAfter.inventory.gold, 20, "卖家收到托管金币");
    assert.equal(posterAfter.inventory.wood_1, 4, "买家收到货");
    assert.equal(posterAfter.inventory.gold, 950, "买家金币不再扣（已托管）");
    assert.equal(sellerAfter.stats!.totalTrades, 1);
    assert.equal(posterAfter.stats!.totalTrades, 1);

    // 数量校验仍生效
    await assert.rejects(() => storage.executeTrade({ buyerId: seller.id, orderId: order.id, quantity: 99 }), /订单数量不足/);
    await assert.rejects(() => storage.executeTrade({ buyerId: poster.id, orderId: order.id, quantity: 1 }), /自己的订单/);
    // 卖家货不够时拒绝
    const s2 = await storage.getOrCreatePlayerState(seller.id, "1.0.0");
    s2.inventory.wood_1 = 2;
    await storage.savePlayerState(seller.id, s2);
    await assert.rejects(() => storage.executeTrade({ buyerId: seller.id, orderId: order.id, quantity: 5 }), /物品不足/);
    await storage.close();
  });

  it("createTradingOrder rejects gold and equipped items", async () => {
    const storage = createMemoryStorage();
    const g = await ctx(storage, "mkt-gold");
    g.state.inventory.gold = 5000;
    await assert.rejects(
      () => storage.createTradingOrder({ userId: g.user.id, itemId: "gold", quantity: 10, price: 1, type: "sell" }),
      /invalid_item|金币/
    );

    const e = await ctx(storage, "mkt-eq");
    e.state.inventory.weapon_wooden_sword = 1;
    e.state.equipment.main_hand = "weapon_wooden_sword";
    await assert.rejects(
      () => storage.createTradingOrder({ userId: e.user.id, itemId: "weapon_wooden_sword", quantity: 1, price: 10, type: "sell" }),
      /equipped|装备/
    );
    await storage.close();
  });

  it("getPriceHistory clamps absurd day ranges", async () => {
    const storage = createMemoryStorage();
    const t0 = Date.now();
    const res = await storage.getPriceHistory({ itemId: "wood_1", days: 1e8 });
    assert.ok(Date.now() - t0 < 2000, `took ${Date.now() - t0}ms`);
    assert.ok(Array.isArray(res) && res.length <= 90);
    await storage.close();
  });
});

describe("soak regressions — shop", () => {
  it("buyFromShop/sellToShop reject fractional quantities", () => {
    const state = {
      inventory: { gold: 1000, wood_1: 10 },
      logs: [],
      stats: { totalGoldSpent: 0, totalGoldEarned: 0 },
    } as unknown as EnhancedPlayerState;
    const stock = (contentPack.items as Array<{ id: string }>).find((i) => i.id === "wood_1");
    void stock;
    const buy = buyFromShop(state, contentPack, "copper_ore", 1.5);
    assert.equal(buy.ok, false);
    const sell = sellToShop(state, contentPack, "wood_1", 2.5);
    assert.equal(sell.ok, false);
    assert.equal(state.inventory.wood_1, 10);
    assert.equal(state.inventory.gold, 1000);
  });

  it("sellToShop rejects equipped items", () => {
    const state = {
      inventory: { weapon_wooden_sword: 1, gold: 0 },
      equipment: { main_hand: "weapon_wooden_sword", enhancementLevels: {}, durability: {}, maxDurability: {} },
      logs: [],
      stats: { totalGoldEarned: 0 },
    } as unknown as EnhancedPlayerState;
    const r = sellToShop(state, contentPack, "weapon_wooden_sword", 1);
    assert.equal(r.ok, false);
    assert.match(r.ok === false ? r.reason : "", /装备/);
    assert.equal(state.inventory.weapon_wooden_sword, 1);
  });
});

describe("soak regressions — party", () => {
  it("rejects joining a second party while already in one", async () => {
    const storage = createMemoryStorage();
    const a = await ctx(storage, "p-lead");
    const b = await ctx(storage, "p-mid");
    const c = await ctx(storage, "p-dbl");
    const p1 = await storage.createParty({ userId: a.user.id });
    const p2 = await storage.createParty({ userId: b.user.id });
    await storage.joinParty({ userId: c.user.id, partyId: p1.id });
    await assert.rejects(
      () => storage.joinParty({ userId: c.user.id, partyId: p2.id }),
      /already_in_party/
    );
    const after = await storage.getPartyForUser({ userId: c.user.id });
    assert.equal(after?.id, p1.id);
    await storage.close();
  });

  it("rejects users with no player state (ghost members)", async () => {
    const storage = createMemoryStorage();
    const a = await ctx(storage, "p-real");
    const ghost = await storage.findOrCreateGuestUser("p-ghost"); // 故意不建 state
    const party = await storage.createParty({ userId: a.user.id });
    await assert.rejects(
      () => storage.joinParty({ userId: ghost.id, partyId: party.id }),
      /state_not_found/
    );
    await assert.rejects(
      () => storage.createParty({ userId: ghost.id }),
      /state_not_found/
    );
    await storage.close();
  });

  it("getPartyForUser self-heals a dangling partyState pointer", async () => {
    const storage = createMemoryStorage();
    const a = await ctx(storage, "p-heal");
    // 人为制造单侧悬挂：partyState 指向一个不把自己列为成员的队伍
    const b = await ctx(storage, "p-other");
    const party = await storage.createParty({ userId: b.user.id });
    a.state.partyState = { partyId: party.id, role: "member", isLeader: false, joinedAt: new Date().toISOString() };
    await storage.savePlayerState(a.user.id, a.state);
    const res = await storage.getPartyForUser({ userId: a.user.id });
    assert.equal(res, null);
    const after = await storage.getOrCreatePlayerState(a.user.id, "1.0.0");
    assert.equal(after.partyState, undefined);
    await storage.close();
  });

  it("group_craft activity actually grants xp to members' active skill", async () => {
    const storage = createMemoryStorage();
    const a = await ctx(storage, "craft-lead");
    const b = await ctx(storage, "craft-mid");
    const party = await storage.createParty({ userId: a.user.id });
    await storage.joinParty({ userId: b.user.id, partyId: party.id });
    const started = await storage.startPartyActivity({
      userId: a.user.id, partyId: party.id, activityType: "group_craft",
    });
    assert.equal(started.success, true);
    // 新活动是时长制+贡献制：给两成员各造贡献并把活动改到期
    (a.state.stats as any).totalActions = ((a.state.stats as any).totalActions || 0) + 8;
    (b.state.stats as any).totalActions = ((b.state.stats as any).totalActions || 0) + 8;
    const fetched = await storage.getPartyForUser({ userId: a.user.id });
    fetched!.currentActivity!.endsAt = new Date(Date.now() - 1000).toISOString();
    const done = await storage.completePartyActivity({ userId: a.user.id, partyId: party.id, contentPack });
    assert.equal(done.success, true);
    for (const u of [a, b]) {
      const s = await storage.getOrCreatePlayerState(u.user.id, "1.0.0");
      // group_craft 经验发到生产技能（采集/生产已拆分）
      const skillId = CRAFT_SKILL_BY_PROFESSION[s.activeClassId] || `skill_${s.activeClassId}`;
      const skill = s.skills[skillId];
      assert.ok(skill, `${u.user.id} missing skill ${skillId}`);
      assert.ok(
        skill.xp > 0 || skill.level > 1,
        `${s.activeClassId} got xp=${skill.xp} level=${skill.level}, expected xp or a level-up`
      );
    }
    await storage.close();
  });
});

describe("soak regressions — prestige", () => {
  it("clears transient combat/farm/enhance state on prestige", () => {
    const player = {
      combatLevel: 50,
      combatXp: 0,
      combatSkills: {},
      skills: { skill_woodcutter: { level: 20, xp: 0, unlockedRecipes: [], enhancementLevel: 0 } },
      inventory: { gold: 9999, wood_1: 5 },
      equipment: {},
      activeBuffs: [],
      mode: "idle",
      logs: [],
      stats: {},
      prestige: { count: 0, points: 0 },
      hpCombat: { monsterId: "slime", playerHp: 1 },
      combatFarmState: { stageId: "forest", startedAt: "x", seed: "s" },
      enhanceRun: { outcome: undefined },
      activityQueue: [{ id: "q1", actionId: "act_chop_wood_t1" }],
      combatLoadout: { autoRepeat: true },
    } as unknown as EnhancedPlayerState;

    const r = doPrestige(player);
    assert.equal(r.ok, true);
    assert.equal(player.hpCombat, undefined);
    assert.equal(player.combatFarmState, undefined);
    assert.equal(player.enhanceRun, undefined);
    assert.deepEqual(player.activityQueue, []);
    assert.equal(player.combatLoadout, undefined);
    assert.equal(player.mode, "idle");
  });
});

describe("soak regressions — durability", () => {
  it("reduceDurability rejects negative/NaN amounts", async () => {
    const storage = createMemoryStorage();
    const { user, state } = await ctx(storage, "dur-u");
    state.inventory.weapon_wooden_sword = 1;
    state.equipment.main_hand = "weapon_wooden_sword";
    state.equipment.durability = { weapon_wooden_sword: 50 };
    state.equipment.maxDurability = { weapon_wooden_sword: 100 };
    await storage.savePlayerState(user.id, state);

    for (const bad of [-10, NaN, Infinity]) {
      const r = await storage.reduceDurability({ userId: user.id, itemId: "weapon_wooden_sword", amount: bad });
      assert.equal(r.success, false, `amount=${bad}`);
      assert.equal(state.equipment.durability.weapon_wooden_sword, 50);
    }
    const ok = await storage.reduceDurability({ userId: user.id, itemId: "weapon_wooden_sword", amount: 10 });
    assert.equal(ok.success, true);
    assert.equal(ok.newDurability, 40);
    await storage.close();
  });

  it("repairEquipment: never-damaged gear is 'no repair needed', NaN target rejected", async () => {
    const storage = createMemoryStorage();
    const { user, state } = await ctx(storage, "rep-u");
    state.inventory.weapon_wooden_sword = 1;
    state.inventory.gold = 1000;
    state.equipment.main_hand = "weapon_wooden_sword";
    // durability 从未记录 → 视为满耐久，不该收全款修理费
    state.equipment.durability = {};
    state.equipment.maxDurability = { weapon_wooden_sword: 100 };
    await storage.savePlayerState(user.id, state);

    const fresh = await storage.repairEquipment({ userId: user.id, request: { itemId: "weapon_wooden_sword", repairType: "full" } });
    assert.equal(fresh.success, false);
    assert.match(fresh.message || "", /无需修复/);
    assert.equal(state.inventory.gold, 1000);

    state.equipment.durability.weapon_wooden_sword = 40;
    const nan = await storage.repairEquipment({
      userId: user.id,
      request: { itemId: "weapon_wooden_sword", repairType: "partial", targetDurability: NaN },
    });
    assert.equal(nan.success, false);
    assert.equal(state.inventory.gold, 1000);
    await storage.close();
  });

  it("getDurabilityInfo: untouched gear reads full, explicit 0 stays broken", async () => {
    const storage = createMemoryStorage();
    const { user, state } = await ctx(storage, "dur-info");
    state.inventory.weapon_wooden_sword = 1;
    state.equipment.main_hand = "weapon_wooden_sword";
    state.equipment.durability = {};
    state.equipment.maxDurability = {};
    await storage.savePlayerState(user.id, state);

    const fresh = await storage.getDurabilityInfo({ userId: user.id, itemId: "weapon_wooden_sword" });
    assert.equal(fresh.currentDurability, fresh.maxDurability);
    assert.equal(fresh.needsRepair, false);

    state.equipment.durability.weapon_wooden_sword = 0;
    const broken = await storage.getDurabilityInfo({ userId: user.id, itemId: "weapon_wooden_sword" });
    assert.equal(broken.currentDurability, 0);
    assert.equal(broken.needsRepair, true);
    await storage.close();
  });
});

describe("soak regressions — corrupt save resilience", () => {
  it("simulateToNow repairs a corrupt lastSimulatedAt instead of 500ing forever", async () => {
    const storage = createMemoryStorage();
    const { user, state } = await ctx(storage, "corrupt-u");
    // 内存适配器存引用：直接改脏字段即可，不要再 savePlayerState（会撞 revision CAS）
    state.lastSimulatedAt = "not-a-date";

    const out = await storage.simulateToNow({ userId: user.id, state, now: new Date(), contentPack });
    assert.ok(Number.isFinite(Date.parse(out.lastSimulatedAt)), "lastSimulatedAt should be repaired");
    await storage.close();
  });

  it("simulateToNow strips legacy offline fields (report + settlement cursor)", async () => {
    const storage = createMemoryStorage();
    const { user, state } = await ctx(storage, "corrupt-u2");
    (state as any).settlement = { processedUntil: "x", targetUntil: "bad", requestedUntil: "bad", complete: false, cappedByOfflineLimit: false };
    (state as any).offlineReport = { from: "x", to: "y", durationMs: 1, actions: [], items: {}, stopReasons: [] };

    const out = await storage.simulateToNow({ userId: user.id, state, now: new Date(), contentPack });
    assert.equal((out as any).settlement, undefined);
    assert.equal((out as any).offlineReport, undefined);
    await storage.close();
  });

  it("simulateToNow prunes item ids the content pack no longer ships", async () => {
    const storage = createMemoryStorage();
    const { user, state } = await ctx(storage, "stale-items-u");
    state.inventory.deleted_item_x = 5;
    state.inventory.wood_1 = 3;
    state.equipment = state.equipment || ({} as any);
    (state.equipment as any).off_hand = "deleted_shield";
    (state.equipment as any).durability = { deleted_item_x: 50 };
    state.combatLoadout = { food: ["deleted_food", "food_simple"], drink: [] } as any;

    const out = await storage.simulateToNow({ userId: user.id, state, now: new Date(), contentPack });
    assert.equal(out.inventory.deleted_item_x, undefined);
    assert.equal(out.inventory.wood_1, 3, "known items are untouched");
    assert.equal((out.equipment as any).off_hand, undefined);
    assert.equal((out.equipment as any).durability.deleted_item_x, undefined);
    assert.deepEqual((out.combatLoadout as any).food, ["food_simple"]);
    await storage.close();
  });
});

describe("soak regressions — enhancement services", () => {
  it("rejects self-service requests at creation", async () => {
    const storage = createMemoryStorage();
    const { user, state } = await ctx(storage, "enh-self");
    giveEnhanceMats(state);
    giveEnhancementSkill(state);
    await storage.savePlayerState(user.id, state);

    await assert.rejects(
      () => storage.createEnhancementServiceRequest({
        requesterId: user.id, providerId: user.id, itemId: ENHANCABLE, targetLevel: 1, contentPack,
      }),
      /自己/
    );
    await storage.close();
  });

  it("rejects unqualified providers at creation and acceptance", async () => {
    const storage = createMemoryStorage();
    const req = await ctx(storage, "enh-req");
    const prov = await ctx(storage, "enh-novice"); // 无强化技能
    giveEnhanceMats(req.state);
    await storage.savePlayerState(req.user.id, req.state);

    await assert.rejects(
      () => storage.createEnhancementServiceRequest({
        requesterId: req.user.id, providerId: prov.user.id, itemId: ENHANCABLE, targetLevel: 1, contentPack,
      }),
      /资质|技能/
    );

    // 有资质的提供者能接单，服务费从请求者转给提供者（不再凭空铸造）
    const prov2 = await ctx(storage, "enh-smith");
    giveEnhancementSkill(prov2.state);
    await storage.savePlayerState(prov2.user.id, prov2.state);
    const request = await storage.createEnhancementServiceRequest({
      requesterId: req.user.id, providerId: prov2.user.id, itemId: ENHANCABLE, targetLevel: 1, contentPack,
    });
    const reqGold = req.state.inventory.gold || 0;
    const provGold = prov2.state.inventory.gold || 0;
    await storage.respondToEnhancementServiceRequest({
      requestId: request.id, providerId: prov2.user.id, accepted: true, contentPack,
    });
    const reqAfter = await storage.getOrCreatePlayerState(req.user.id, "1.0.0");
    const provAfter = await storage.getOrCreatePlayerState(prov2.user.id, "1.0.0");
    const fee = request.serviceFee;
    assert.ok((provAfter.inventory.gold || 0) - provGold <= fee, `provider gained more than the fee`);
    // 请求者支付：材料费 + 服务费
    assert.ok(reqGold - (reqAfter.inventory.gold || 0) >= fee, "requester was not charged the fee");
    await storage.close();
  });

  it("enhanceEquipment refuses a self serviceProviderId", async () => {
    const storage = createMemoryStorage();
    const { user, state } = await ctx(storage, "enh-direct");
    giveEnhanceMats(state);
    giveEnhancementSkill(state);
    await storage.savePlayerState(user.id, state);

    const res = await storage.enhanceEquipment({
      userId: user.id,
      request: { itemId: ENHANCABLE, targetLevel: 1, materials: {}, serviceProviderId: user.id },
      contentPack,
    });
    assert.equal(res.success, false);
    assert.match(res.failureReason || "", /自己/);
    await storage.close();
  });

  it("getEnhancementProviders drops stale index entries after skill loss", async () => {
    const storage = createMemoryStorage();
    const { user, state } = await ctx(storage, "enh-stale");
    state.skills[`skill_${ENH_PROFESSION}`] = {
      level: 10, xp: 0, unlockedRecipes: [`${ENH_PROFESSION}_enhancement`], enhancementLevel: 0,
    };
    await storage.savePlayerState(user.id, state);

    const rules = contentPack.enhancementRules.filter((r) => r.requiredProfession === ENH_PROFESSION);
    assert.ok(rules.length > 0);
    const itemType = rules[0].itemType;

    const before = await storage.getEnhancementProviders({ itemType, contentPack });
    assert.ok(before.some((p) => p.userId === user.id), "provider should be listed");

    // 模拟失去技能（索引仍留着 userId）；内存适配器共享引用，直接改即可
    const latest = await storage.getOrCreatePlayerState(user.id, "1.0.0");
    latest.skills[`skill_${ENH_PROFESSION}`].unlockedRecipes = [];

    const after = await storage.getEnhancementProviders({ itemType, contentPack });
    assert.ok(!after.some((p) => p.userId === user.id), "stale provider should be evicted on read");
    await storage.close();
  });
});

describe("soak regressions — action quantity semantics", () => {
  it("explicit quantity=0/negative/NaN is rejected, not silently unlimited", async () => {
    const storage = createMemoryStorage();
    const { user, state } = await ctx(storage, "qty-u");
    for (const q of [0, -1, NaN, Infinity]) {
      assert.throws(
        () => startLifeActionNow(state, contentPack, "act_chop_wood_t1", q, new Date()),
        /invalid_quantity/,
        `quantity=${q}`
      );
    }
    // undefined 仍是合法的"不限次"
    assert.doesNotThrow(() => startLifeActionNow(state, contentPack, "act_chop_wood_t1", undefined, new Date()));
    void user;
    await storage.close();
  });
});

describe("soak regressions — equip uniqueness", () => {
  it("one copy of an accessory cannot fill both accessory slots", () => {
    const items = contentPack.items as Array<{ id: string; type?: string; slot?: string }>;
    const acc = items.find((i) => i.slot === "accessory" || i.type === "accessory");
    assert.ok(acc, "need an accessory item");
    const equipment: Record<string, unknown> = { accessory1: acc.id };
    const r = canEquipItem({ [acc.id]: 1 }, "accessory2", acc.id, items, equipment);
    assert.equal(r.ok, false, "qty 1 should not fill a second slot");
    const r2 = canEquipItem({ [acc.id]: 2 }, "accessory2", acc.id, items, equipment);
    assert.equal(r2.ok, true, "qty 2 can fill both slots");
  });
});

describe("soak regressions — NaN containment (corrupt state)", () => {
  function base(): EnhancedPlayerState {
    return {
      inventory: { gold: 1000 }, equipment: {}, skills: {}, logs: [], stats: {
        totalActions: 0, totalKills: 0, totalCrafted: 0, totalGathered: 0,
        totalGoldEarned: 0, totalGoldSpent: 0, totalXpEarned: 0, playtimeSeconds: 0,
        totalEnhancements: 0, totalDeaths: 0, totalItemsSold: 0, totalItemsBought: 0,
        killsByMonster: {}, actionsById: {},
      },
    } as unknown as EnhancedPlayerState;
  }

  it("NaN inventory gold cannot bypass purchase checks", async () => {
    const s = base();
    s.inventory.gold = NaN;
    // buyFromShop 的 "gold >= cost" 判据 fail-closed：NaN 直接拒付
    const buy = buyFromShop(s, contentPack, "copper_ore", 1);
    assert.equal(buy.ok, false);
    // 命令边界里的 ensurePlayerExtensions 把污染归零，恢复成合法的可判定状态
    ensurePlayerExtensions(s);
    assert.equal(s.inventory.gold, 0);
  });

  it("NaN tasks tokens/points cannot mint shop items or gifts", () => {
    const s = base();
    s.tasksState = {
      tasks: [], tokens: NaN, points: NaN, completed: 0, giftsClaimed: 0,
      cooldownLevel: 0, blockSlots: 1, blockedSkills: [], rerollsToday: 0,
      nextTaskAt: new Date().toISOString(),
    } as never;
    const buy = buyTaskShop(s, contentPack, "crate", new Date());
    assert.equal(buy.ok, false);
    const gift = claimGift(s, contentPack, new Date());
    assert.equal(gift.ok, false);
    assert.equal(s.inventory.gold, 1000);
  });

  it("NaN daily-quest baseline cannot bypass the completion check", () => {
    const s = base();
    s.stats!.totalGathered = 0;
    ensureDailyQuests(s);
    const q = s.dailyQuests!.quests[0];
    q.baseline = NaN;
    const res = claimDailyQuest(s, q.id);
    assert.equal(res.ok, false);
  });

  it("NaN bounty reroll count is contained (resets to a bounded counter, costs gold)", () => {
    const s = base();
    s.inventory.gold = 99999;
    ensureBounties(s);
    s.bounties!.rerollsUsed = NaN;
    const goldBefore = s.inventory.gold;
    const r = rerollBounties(s);
    // 污染归零后走正常限额：计数变回有限数且已消耗一次额度，而不是无限 NaN 穿透
    assert.equal(r.ok, true);
    assert.equal(s.bounties!.rerollsUsed, 1);
    assert.ok(s.inventory.gold < goldBefore, "reroll must still cost gold");
  });

  it("ensurePlayerExtensions scrubs every NaN field and logs once", () => {
    const s = base();
    s.inventory.wood_1 = NaN;
    s.skills.skill_woodcutter = { level: NaN, xp: Infinity, unlockedRecipes: [], enhancementLevel: 0 };
    s.equipment.durability = { weapon_wooden_sword: NaN };
    ensurePlayerExtensions(s);
    assert.equal(s.inventory.wood_1, 0);
    assert.equal(s.skills.skill_woodcutter.level, 0);
    assert.equal(s.equipment.durability.weapon_wooden_sword, 0);
    assert.ok((s.logs as Array<{ text: string }>).some((l) => l.text.includes("损坏")));
  });

  it("legacy combat_farm saves fall back to idle (mode was retired — it had no settler)", () => {
    const s = base();
    (s as any).mode = "combat_farm";
    (s as any).combatFarmState = { stageId: "forest", startedAt: "x", seed: "s" };
    (s as any).lifeActionState = { actionId: "a", startedAt: "x" };
    ensurePlayerExtensions(s);
    assert.equal(s.mode, "idle");
    assert.equal(s.combatFarmState, undefined);
    assert.equal(s.lifeActionState, undefined);
  });

  it("dead combatRunState field is stripped from legacy saves", () => {
    const s = base();
    (s as any).combatRunState = { queue: [], active: true };
    ensurePlayerExtensions(s);
    assert.equal((s as any).combatRunState, undefined);
  });

  it("corrupt persistent combatHp resets to full (undefined) or re-anchors its timestamp", () => {
    const s = base();
    s.combatHp = NaN;
    s.combatHpAt = 12345;
    ensurePlayerExtensions(s);
    assert.equal(s.combatHp, undefined);
    assert.equal(s.combatHpAt, undefined);
    s.combatHp = -5;
    ensurePlayerExtensions(s);
    assert.equal(s.combatHp, undefined);
    s.combatHp = 30;
    s.combatHpAt = NaN;
    ensurePlayerExtensions(s);
    assert.equal(s.combatHp, 30);
    assert.ok(Number.isFinite(s.combatHpAt) && s.combatHpAt > 0);
  });

  it("a stale same-day bounty board (duplicate/unknown templates) self-heals", () => {
    const s = base();
    ensureBounties(s);
    const board = s.bounties!.bounties;
    s.bounties = {
      date: s.bounties!.date,
      bounties: [
        { ...board[0], id: "x1", templateId: "bt_gather_50" },
        { ...board[0], id: "x2", templateId: "bt_gather_50" },
        { ...board[0], id: "x3", templateId: "bt_deleted_template" },
      ],
      rerollsUsed: 2,
    };
    ensureBounties(s);
    const ids = s.bounties!.bounties.map(b => b.templateId);
    assert.equal(new Set(ids).size, ids.length, "self-healed board must not contain duplicate contracts");
    assert.ok(ids.every(id => id.startsWith("bt_")), "all entries come from known templates");
    assert.equal(s.bounties!.rerollsUsed, 2, "same-day self-heal keeps the used reroll count");
  });
});

describe("soak regressions — durability loop closure", () => {
  function base(): EnhancedPlayerState {
    return {
      inventory: { gold: 1000 }, equipment: {}, skills: {}, logs: [], stats: {
        totalActions: 0, totalKills: 0, totalCrafted: 0, totalGathered: 0,
        totalGoldEarned: 0, totalGoldSpent: 0, totalXpEarned: 0, playtimeSeconds: 0,
        totalEnhancements: 0, totalDeaths: 0, totalItemsSold: 0, totalItemsBought: 0,
        killsByMonster: {}, actionsById: {},
      },
      mode: "idle",
    } as unknown as EnhancedPlayerState;
  }

  it("life-action cycles wear the working tool; a broken tool loses its speed bonus", async () => {
    const storage = createMemoryStorage();
    const { user, state } = await ctx(storage, "wear-tool");
    state.inventory.weapon_logging_axe_t1 = 1;
    state.equipment.tool = "weapon_logging_axe_t1";
    state.skills.skill_woodcutter = { level: 5, xp: 0, unlockedRecipes: [], enhancementLevel: 0 };
    await storage.savePlayerState(user.id, state);
    const t0 = new Date();
    const started = await storage.startLifeAction({
      userId: user.id, actionId: "act_chop_wood_t1", now: t0, contentPack,
    });
    const after = await storage.simulateToNow({
      userId: user.id, state: started, now: new Date(t0.getTime() + 60_000), contentPack,
    });
    const d = after.equipment.durability?.weapon_logging_axe_t1;
    assert.ok(d !== undefined && d < 100 && d > 95, `expected partial wear, got ${d}`);

    // 耐久 0 → 工具不再提供速度加成（幽灵槽同规则）
    const s2 = after;
    s2.equipment.durability!.weapon_logging_axe_t1 = 0;
    const action = (contentPack.actions as any[]).find((a) => a.id === "act_chop_wood_t1");
    const rates = getActionRates(s2, contentPack, action, new Date());
    assert.equal(rates.wornToolId, undefined, "broken tool must not apply");
    assert.ok(!rates.speedSources.some((x) => x.label.startsWith("工具")), "broken tool must not list as a speed source");
    await storage.close();
  });

  it("a resolved fight wears equipped gear; broken gear contributes no combat stats", () => {
    const s = base();
    s.inventory.weapon_wooden_sword = 1;
    s.equipment.main_hand = "weapon_wooden_sword";
    s.equipment.durability = { weapon_wooden_sword: 50 };
    s.equipment.maxDurability = { weapon_wooden_sword: 100 };
    const atkBefore = getEquippedCombatStats(s, contentPack).atk;
    assert.ok(atkBefore > 0, "equipped sword should grant atk");

    const t0 = new Date();
    s.hpCombat = startHpCombat(s, contentPack, "slime", t0);
    s.hpCombat!.enemyHp = 0.1; // 下一刀必胜
    tickHpCombat(s, contentPack, new Date(t0.getTime() + 1000), 1000, () => 0.99);
    assert.equal(s.hpCombat!.outcome, "win");
    const d = s.equipment.durability.weapon_wooden_sword;
    assert.ok(d < 50, `fight should wear gear, got ${d}`);

    // 破损后不再计入战斗属性
    s.equipment.durability.weapon_wooden_sword = 0;
    assert.equal(getEquippedCombatStats(s, contentPack).atk, 0, "broken sword must grant 0 atk");
  });

  it("enhancement attempts wear the equipped enhancing tool", async () => {
    const s = base();
    s.inventory.tool_enhancer_t1 = 1;
    s.inventory.weapon_wooden_sword = 1;
    s.inventory.lumber_1 = 50;
    s.equipment.tool = "tool_enhancer_t1";
    s.skills.skill_woodcutter = { level: 30, xp: 0, unlockedRecipes: ["woodcutter_enhancement"], enhancementLevel: 0 };
    const { startEnhanceRun, tickEnhanceRun } = await import("./enhancement_run");
    const r = startEnhanceRun(s, contentPack, { itemId: "weapon_wooden_sword", targetLevel: 2, useProtection: false }, new Date());
    assert.equal(r.ok, true);
    tickEnhanceRun(s, contentPack, Date.now() + 120_000, () => 0.5);
    const d = s.equipment.durability?.tool_enhancer_t1;
    assert.ok(d !== undefined && d < 100, `enhance tool should wear, got ${d}`);
  });
});

describe("soak regressions — zone gate", () => {
  it("startHpCombat rejects monsters from unshipped stages", () => {
    const s = {
      inventory: { gold: 0 }, equipment: {}, skills: {}, logs: [], stats: {}, mode: "idle",
    } as unknown as EnhancedPlayerState;
    // 未在 OPEN_ZONE_IDS 中的未来关卡——API 直调必须被拒
    const lockedPack = {
      ...contentPack,
      stages: [...(contentPack.stages || []), { id: "unshipped_future_zone", name: "未开放", monsters: ["future_mob"] }],
      monsters: [...(contentPack.monsters || []), { id: "future_mob", name: "未来怪", level: 1, hp: 10, atk: 1, def: 0 }],
    } as unknown as typeof contentPack;
    assert.throws(() => startHpCombat(s, lockedPack, "future_mob", new Date()), /stage_locked/);
    // 开放区域的怪正常开战（森林 slime + 熔岩深渊 lava_slug + 暗影深渊 shadow_crawler）
    const enc = startHpCombat(s, contentPack, "slime", new Date());
    assert.equal(enc.monsterId, "slime");
    s.combatLevel = 45;
    const volEnc = startHpCombat(s, contentPack, "lava_slug", new Date());
    assert.equal(volEnc.monsterId, "lava_slug");
    s.combatLevel = 60;
    const abyssEnc = startHpCombat(s, contentPack, "shadow_crawler", new Date());
    assert.equal(abyssEnc.monsterId, "shadow_crawler");
  });
});
