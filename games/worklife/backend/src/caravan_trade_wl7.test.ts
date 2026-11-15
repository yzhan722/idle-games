import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { randomUUID } from "node:crypto";
import packJson from "../../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack, EnhancedPlayerState } from "./types";
import { createMemoryStorage } from "./storage_memory";
import { progressionRoutes } from "./routes/progression";
import { progression2Routes } from "./routes/progression2";
import { mapThrownError } from "./http_errors";
import {
  ASTRAL_DUST_EXCHANGE_OFFERS,
  CARAVAN_CONTRACT_MAX_REROLLS,
  CARAVAN_CONTRACT_REROLL_COST,
  CARAVAN_LEDGER_COSTS,
  CARAVAN_MAX_LEDGER_RANK,
  CARAVAN_REP_TIERS,
  CARAVAN_TRADE_ROUTES,
  WORKSHOP_CONTRACT_TEMPLATES,
  buildCaravanScarcityShiftKey,
  claimCaravanWagon,
  classifyCaravanCargoCategory,
  dispatchCaravanWagon,
  doPrestige,
  ensureCaravanTrade,
  ensureGuildHonor,
  ensureHeritageWorkshop,
  expediteCaravanWagon,
  fulfillWorkshopContract,
  getCaravanRepTier,
  getCaravanRouteScarcity,
  getCaravanTradeBonuses,
  getCaravanTradeInfo,
  getIdleCargoCount,
  previewCaravanDispatch,
  redeemAstralDustExchange,
  rerollWorkshopContracts,
} from "./progression2";
import { playerBuildExtras } from "./hp_combat";
import {
  defaultEnhancedPlayerState,
  getActionRates,
  simulateToNow,
  startLifeActionNow,
} from "./storage";

const pack = packJson as EnhancedContentPack;

async function caravanRouteFixture(patch?: (state: EnhancedPlayerState) => void) {
  const storage = createMemoryStorage();
  const user = await storage.findOrCreateGuestUser(`wl7-caravan-${randomUUID()}`);
  const initial = await storage.getOrCreatePlayerState(user.id, pack.version);
  patch?.(initial);
  await storage.savePlayerState(user.id, initial);

  const handlers = new Map<string, any>();
  const app = {
    get(path: string, fn: any) {
      handlers.set(`GET ${path}`, fn);
    },
    post(path: string, fn: any) {
      handlers.set(`POST ${path}`, fn);
    },
    delete(path: string, fn: any) {
      handlers.set(`DELETE ${path}`, fn);
    },
  };
  await progressionRoutes(app as any, storage, pack);
  await progression2Routes(app as any, storage, pack);

  async function invoke(
    method: "GET" | "POST",
    path: string,
    body?: Record<string, unknown>,
    overrideUserId?: string | null
  ) {
    let statusCode = 200;
    const reply = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      send(payload: any) {
        return { statusCode, payload };
      },
    };
    try {
      const handler = handlers.get(`${method} ${path}`);
      assert.ok(handler, `Missing route handler: ${method} ${path}`);
      const effectiveUser = overrideUserId === undefined ? user.id : overrideUserId;
      const res = await handler({ userId: effectiveUser, body: body ?? {} }, reply);
      if (res && typeof res === "object" && "statusCode" in res && "payload" in res) {
        return res;
      }
      return { statusCode, payload: res };
    } catch (error) {
      const mapped = mapThrownError(error);
      return reply.status(mapped.status).send(mapped.body);
    }
  }

  return {
    storage,
    userId: user.id,
    invoke,
    getCaravan: () => invoke("GET", "/progression2/caravan"),
    dispatch: (body: {
      wagonSlot: number;
      routeId: "frostport" | "emberoasis" | "starfallspire";
      cargo: Record<string, number>;
      useExpressPermit?: boolean;
      expectedRevision?: number;
    }) => invoke("POST", "/progression2/caravan/dispatch", body),
    expedite: (wagonSlot: number) => invoke("POST", "/progression2/caravan/expedite", { wagonSlot }),
    claim: (wagonSlot: number) => invoke("POST", "/progression2/caravan/claim", { wagonSlot }),
    fulfillContract: (contractId: string) =>
      invoke("POST", "/progression2/caravan/contracts/fulfill", { contractId }),
    rerollContracts: () => invoke("POST", "/progression2/caravan/contracts/reroll", {}),
    exchangeDust: (offerId: string) =>
      invoke("POST", "/progression2/caravan/exchange", { offerId }),
  };
}

describe("WL-7 Expedition Caravan Trade Routes & Workshop Special Supply Contracts", () => {
  it("validates zero Emoji and verifies all route hot items, contract demands, and exchange items exist in content pack", () => {
    const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
    const packItemIds = new Set((pack.items as Array<{ id: string }>).map((it) => it.id));

    assert.equal(CARAVAN_REP_TIERS.length, 6);
    assert.equal(CARAVAN_REP_TIERS[0].maxWagons, 1);
    assert.equal(CARAVAN_REP_TIERS[2].maxWagons, 2);
    assert.equal(CARAVAN_REP_TIERS[4].maxWagons, 3);
    for (const tier of CARAVAN_REP_TIERS) {
      assert.equal(emojiRegex.test(tier.title), false, `Tier ${tier.level} title contains Emoji`);
    }

    assert.equal(CARAVAN_TRADE_ROUTES.length, 3);
    assert.deepEqual(
      CARAVAN_TRADE_ROUTES.map((r) => r.id),
      ["frostport", "emberoasis", "starfallspire"]
    );
    for (const route of CARAVAN_TRADE_ROUTES) {
      assert.equal(emojiRegex.test(route.name), false);
      assert.equal(emojiRegex.test(route.townName), false);
      assert.equal(emojiRegex.test(route.description), false);
      assert.equal(emojiRegex.test(route.favoredLabel), false);
      for (const iid of route.hotCandidateIds) {
        assert.equal(packItemIds.has(iid), true, `Route ${route.id} missing hot item ${iid} in pack`);
        assert.equal(
          classifyCaravanCargoCategory(iid),
          route.favoredCategory,
          `Hot item ${iid} should match route ${route.id} favoredCategory`
        );
      }
    }

    assert.equal(WORKSHOP_CONTRACT_TEMPLATES.length, 12);
    for (const grp of [0, 1, 2, 3] as const) {
      assert.equal(
        WORKSHOP_CONTRACT_TEMPLATES.filter((t) => t.slotGroup === grp).length,
        3,
        `Slot group ${grp} should have 3 templates`
      );
    }
    for (const tpl of WORKSHOP_CONTRACT_TEMPLATES) {
      assert.equal(emojiRegex.test(tpl.name), false);
      assert.equal(emojiRegex.test(tpl.clientTitle), false);
      assert.equal(emojiRegex.test(tpl.description), false);
      for (const iid of Object.keys(tpl.demands)) {
        assert.equal(packItemIds.has(iid), true, `Contract ${tpl.id} demands missing item ${iid}`);
      }
    }

    for (const offer of ASTRAL_DUST_EXCHANGE_OFFERS) {
      assert.equal(emojiRegex.test(offer.name), false);
      assert.equal(emojiRegex.test(offer.description), false);
      for (const iid of Object.keys(offer.itemsOut ?? {})) {
        assert.equal(packItemIds.has(iid), true, `Exchange offer ${offer.id} outputs missing item ${iid}`);
      }
    }
  });

  it("sanitizes corrupted saves in ensureCaravanTrade and keeps deterministic scarcity within 1.15x ~ 1.85x", () => {
    const now = new Date("2026-11-15T10:00:00.000Z");
    const state = defaultEnhancedPlayerState(pack.version || "1.0.0");
    (state as any).caravanTrade = {
      caravanRep: -99,
      astralCrystalDust: Number.NaN,
      expressPermits: 4.8,
      ledgerRank: 99,
      totalRunsCompleted: -2,
      totalContractsFulfilled: 3.7,
      wagons: {
        0: {
          slot: 0,
          routeId: "frostport",
          cargo: { wood_1: 12.9, bad_zero: 0, neg: -4 },
          startedAt: 1000,
          completesAt: 2000,
          scarcityMultiplier: 9.99,
          expectedReward: { gold: 180.6, astralCrystalDust: 6.2, forgingEmblems: 1.9, caravanRep: 28.4 },
        },
        1: {
          slot: 1,
          routeId: "invalid_route",
          cargo: { ore_1: 10 },
          startedAt: 1000,
          completesAt: 2000,
          scarcityMultiplier: 1.3,
          expectedReward: { gold: 100, astralCrystalDust: 5, forgingEmblems: 0, caravanRep: 20 },
        },
      },
      dailyDustExchanges: { date: "1999-01-01", counts: { dust_forging_emblem: 99 } },
    };

    const ct = ensureCaravanTrade(state, now);
    assert.equal(ct.caravanRep, 0);
    assert.equal(ct.astralCrystalDust, 0);
    assert.equal(ct.expressPermits, 4);
    assert.equal(ct.ledgerRank, CARAVAN_MAX_LEDGER_RANK);
    assert.equal(ct.totalRunsCompleted, 0);
    assert.equal(ct.totalContractsFulfilled, 3);
    assert.ok(ct.wagons[0]);
    assert.deepEqual(ct.wagons[0]?.cargo, { wood_1: 12 });
    assert.equal(ct.wagons[0]?.scarcityMultiplier, 1.85);
    assert.equal(ct.wagons[1], undefined, "Invalid route wagon should be stripped");
    assert.equal(ct.contractsBoard?.contracts.length, 4, "Should populate 4 rotating contracts");
    assert.deepEqual(ct.dailyDustExchanges?.counts, {}, "Outdated daily exchange date resets counts");

    // Deterministic scarcity across 24 shifts stays strictly inside [1.15, 1.85]
    for (let dayOffset = 0; dayOffset < 6; dayOffset++) {
      for (const hour of [1, 7, 13, 20]) {
        const dt = new Date(2026, 10, 15 + dayOffset, hour, 0, 0);
        const shiftKey = buildCaravanScarcityShiftKey(dt);
        for (const route of CARAVAN_TRADE_ROUTES) {
          const s1 = getCaravanRouteScarcity(route.id, dt);
          const s2 = getCaravanRouteScarcity(route.id, shiftKey);
          assert.deepEqual(s1, s2, "Scarcity must be deterministic for same shiftKey");
          assert.ok(s1.scarcityMultiplier >= 1.15 && s1.scarcityMultiplier <= 1.85);
          assert.ok(s1.hotMultiplier >= s1.scarcityMultiplier && s1.hotMultiplier <= 1.85);
          assert.equal(s1.hotItemIds.length, 2);
        }
      }
    }
  });

  it("protects equipped gear, enforces wagon slot unlocks (Lv.1/3/5), and runs dispatch -> expedite -> claim lifecycle", () => {
    const t0 = new Date("2026-11-15T09:00:00.000Z");
    const state = defaultEnhancedPlayerState(pack.version || "1.0.0");
    state.inventory.weapon_iron_sword = 1;
    (state.equipment as any).main_hand = "weapon_iron_sword";
    state.inventory.wood_1 = 30;
    state.inventory.lumber_1 = 15;
    state.inventory.fish_river = 15;
    state.inventory.ore_1 = 30;
    state.inventory.ingot_1 = 15;

    // Equipped sword has 0 idle cargo -> dispatch rejected
    assert.equal(getIdleCargoCount(state, "weapon_iron_sword"), 0);
    const eqAttempt = dispatchCaravanWagon(
      state,
      pack,
      { wagonSlot: 0, routeId: "emberoasis", cargo: { weapon_iron_sword: 1 } },
      t0
    );
    assert.equal(eqAttempt.ok, false);
    assert.equal(state.inventory.weapon_iron_sword, 1);

    // At Lv.1 (0 rep), Wagon Slot 1 (2nd wagon) is locked
    const lockedAttempt = dispatchCaravanWagon(
      state,
      pack,
      { wagonSlot: 1, routeId: "frostport", cargo: { wood_1: 20, lumber_1: 10 } },
      t0
    );
    assert.equal(lockedAttempt.ok, false);

    // Dispatch Wagon Slot 0 on Frostport timed run
    const d0 = dispatchCaravanWagon(
      state,
      pack,
      { wagonSlot: 0, routeId: "frostport", cargo: { wood_1: 20, lumber_1: 10, fish_river: 10 } },
      t0
    );
    assert.equal(d0.ok, true);
    assert.equal(state.inventory.wood_1, 10);
    assert.equal(state.inventory.lumber_1, 5);

    // Early claim before arrival is rejected
    const earlyClaim = claimCaravanWagon(state, 0, new Date(t0.getTime() + 60_000));
    assert.equal(earlyClaim.ok, false);

    // Expedite without permit fails; with permit completes immediately
    const ct = ensureCaravanTrade(state, t0);
    ct.expressPermits = 0;
    assert.equal(expediteCaravanWagon(state, 0, new Date(t0.getTime() + 60_000)).ok, false);
    ct.expressPermits = 2;
    const expRes = expediteCaravanWagon(state, 0, new Date(t0.getTime() + 60_000));
    assert.equal(expRes.ok, true);
    assert.equal(ct.expressPermits, 1);

    // Claim credits gold, astralCrystalDust, forgingEmblems (when earned), and caravanRep
    const goldBefore = state.inventory.gold || 0;
    const claimRes = claimCaravanWagon(state, 0, new Date(t0.getTime() + 60_000));
    assert.equal(claimRes.ok, true);
    assert.ok((claimRes.reward?.gold ?? 0) >= 60);
    assert.ok((claimRes.reward?.astralCrystalDust ?? 0) >= 4);
    assert.ok((claimRes.reward?.caravanRep ?? 0) >= 24);
    assert.equal(state.inventory.gold, goldBefore + (claimRes.reward?.gold ?? 0));
    assert.equal(ct.astralCrystalDust, claimRes.reward?.astralCrystalDust);
    assert.equal(ct.wagons[0], undefined);

    // Boost Caravan Rep to Lv.3 (280) -> unlocks Wagon Slot 1; instant dispatch with useExpressPermit: true
    ct.caravanRep = 280;
    assert.equal(getCaravanRepTier(ct.caravanRep).current.maxWagons, 2);
    const instantDispatch = dispatchCaravanWagon(
      state,
      pack,
      { wagonSlot: 1, routeId: "emberoasis", cargo: { ore_1: 25, ingot_1: 12 }, useExpressPermit: true },
      t0
    );
    assert.equal(instantDispatch.ok, true);
    assert.equal(ct.expressPermits, 0);
    assert.equal(instantDispatch.wagon?.completesAt, t0.getTime());
    assert.equal(claimCaravanWagon(state, 1, t0).ok, true);

    // Boost Caravan Rep to Lv.5 (1050) -> unlocks Wagon Slot 2 (3rd wagon)
    ct.caravanRep = 1050;
    assert.equal(getCaravanRepTier(ct.caravanRep).current.maxWagons, 3);
  });

  it("fulfills and rerolls Workshop Contracts, exchanges Astral Crystal Dust, upgrades Ledger, and persists across Prestige", () => {
    const now = new Date("2026-11-15T11:00:00.000Z");
    const state = defaultEnhancedPlayerState(pack.version || "1.0.0");
    state.inventory.gold = 5_000;
    const ct = ensureCaravanTrade(state, now);
    const firstContract = ct.contractsBoard!.contracts[0];
    assert.ok(firstContract);

    // Stock exact demands of contract 0 and fulfill it
    for (const [iid, qty] of Object.entries(firstContract.demands)) {
      state.inventory[iid] = qty + 2;
    }
    const fulfill1 = fulfillWorkshopContract(state, pack, firstContract.id, now);
    assert.equal(fulfill1.ok, true);
    assert.equal(firstContract.fulfilled, true);
    assert.equal(ct.astralCrystalDust, firstContract.reward.astralCrystalDust);
    assert.equal(ensureGuildHonor(state).forgingEmblems, firstContract.reward.forgingEmblems);
    assert.equal(ensureGuildHonor(state).honorPoints, firstContract.reward.honorPoints);
    // Duplicate fulfill rejected
    assert.equal(fulfillWorkshopContract(state, pack, firstContract.id, now).ok, false);

    // Reroll up to CARAVAN_CONTRACT_MAX_REROLLS (3), 4th rejected
    for (let i = 0; i < CARAVAN_CONTRACT_MAX_REROLLS; i++) {
      const rr = rerollWorkshopContracts(state, now);
      assert.equal(rr.ok, true);
      assert.equal(rr.cost, CARAVAN_CONTRACT_REROLL_COST);
    }
    assert.equal(rerollWorkshopContracts(state, now).ok, false);

    // Astral Crystal Dust Exchange: upgrade Ledger Rank 0 -> 5, redeem emblem + crystal bundle
    ct.astralCrystalDust = 1_000;
    for (let expectedRank = 1; expectedRank <= CARAVAN_MAX_LEDGER_RANK; expectedRank++) {
      const up = redeemAstralDustExchange(state, pack, "ledger_upgrade", now);
      assert.equal(up.ok, true);
      assert.equal(up.newLedgerRank, expectedRank);
      assert.equal(up.dustSpent, CARAVAN_LEDGER_COSTS[expectedRank - 1]);
    }
    assert.equal(redeemAstralDustExchange(state, pack, "ledger_upgrade", now).ok, false);

    const emblemsBefore = ensureGuildHonor(state).forgingEmblems;
    assert.equal(redeemAstralDustExchange(state, pack, "dust_forging_emblem", now).ok, true);
    assert.equal(ensureGuildHonor(state).forgingEmblems, emblemsBefore + 1);

    assert.equal(redeemAstralDustExchange(state, pack, "dust_crystal_bundle_t2", now).ok, true);
    assert.equal(state.inventory.crystal_1, 6);
    assert.equal(state.inventory.crystal_2, 4);
    assert.equal(state.inventory.crystal_3, 2);
    assert.equal(
      ensureHeritageWorkshop(state).codexUnlockedItems.includes("crystal_2"),
      true,
      "Crystal bundle redemption should record Heritage Codex item unlock"
    );

    // Prestige preserves Caravan Rep, Astral Crystal Dust, Express Permits, and Master Ledger Rank!
    ct.caravanRep = 650;
    ct.expressPermits = 3;
    const dustSnap = ct.astralCrystalDust;
    for (const sk of Object.values(state.skills)) sk.level = 55;
    state.combatLevel = 55;
    const pRes = doPrestige(state);
    assert.equal(pRes.ok, true);
    assert.equal(state.caravanTrade?.caravanRep, 650);
    assert.equal(state.caravanTrade?.ledgerRank, 5);
    assert.equal(state.caravanTrade?.expressPermits, 3);
    assert.equal(state.caravanTrade?.astralCrystalDust, dustSnap);
  });

  it("wires Caravan Reputation & Master Ledger passive bonuses into craft speed, gather double-yield, gold rates, and combat", () => {
    const day = new Date("2026-11-15T08:00:00.000Z");
    const baseState = defaultEnhancedPlayerState(pack.version || "1.0.0");
    const boostedState = defaultEnhancedPlayerState(pack.version || "1.0.0");

    const ct = ensureCaravanTrade(boostedState, day);
    ct.caravanRep = 1700; // Lv.6: +19% gatherDouble, +22% craftSpeed, +24% goldGain
    ct.ledgerRank = 5; // Ledger Lv.5: +5% gatherDouble, +10% craftSpeed, +10% goldGain => +24% double, +32% craft, +34% gold

    const bonuses = getCaravanTradeBonuses(boostedState);
    assert.equal(bonuses.level, 6);
    assert.equal(bonuses.maxWagons, 3);
    assert.equal(bonuses.gatherDoubleChance, 0.24);
    assert.equal(bonuses.craftSpeedPct, 32);
    assert.equal(bonuses.goldGainPct, 34);

    const craftAction = (pack.actions as any[]).find(
      (a) => !String(a.id).startsWith("act_combat_") && Array.isArray(a.consumes) && a.consumes.length > 0
    );
    assert.ok(craftAction);
    const baseCraft = getActionRates(baseState, pack, craftAction, day);
    const boostCraft = getActionRates(boostedState, pack, craftAction, day);
    assert.ok(boostCraft.speedMul > baseCraft.speedMul, "Caravan passive should increase craft speedMul");
    assert.ok(boostCraft.goldMul > baseCraft.goldMul, "Caravan passive should increase action goldMul");
    assert.equal(
      boostCraft.speedSources.some((s) => s.label === "远征商队"),
      true,
      "speedSources should attribute 远征商队"
    );

    // Combat goldMult reflects +34% goldGainPct
    const baseExtras = playerBuildExtras(baseState);
    const boostExtras = playerBuildExtras(boostedState);
    assert.ok(Math.abs(boostExtras.goldMult - (baseExtras.goldMult + 0.34)) < 1e-9);

    // Gather simulation double yield when rng < 0.24
    const copperMineAction = (pack.actions as any[]).find(
      (a) =>
        !String(a.id).startsWith("act_combat_") &&
        (!Array.isArray(a.consumes) || a.consumes.length === 0) &&
        Array.isArray(a.yields) &&
        a.yields.some((y: any) => y.itemId === "ore_1")
    );
    assert.ok(copperMineAction);
    for (const sk of Object.values(baseState.skills)) sk.level = 10;
    for (const sk of Object.values(boostedState.skills)) sk.level = 10;
    baseState.lastSimulatedAt = day.toISOString();
    boostedState.lastSimulatedAt = day.toISOString();
    startLifeActionNow(baseState, pack, copperMineAction.id, undefined, day);
    startLifeActionNow(boostedState, pack, copperMineAction.id, undefined, day);

    const after30s = new Date(day.getTime() + 30_000);
    const simBase = simulateToNow({ state: baseState, contentPack: pack, now: after30s, rng: () => 0.1 });
    const simBoost = simulateToNow({ state: boostedState, contentPack: pack, now: after30s, rng: () => 0.1 });
    assert.ok(
      (simBoost.state.inventory.ore_1 || 0) >= (simBase.state.inventory.ore_1 || 0) * 2,
      "Caravan gatherDoubleChance (24%) should double ore_1 yield when rng=0.10"
    );
  });

  it("exposes all 7 /progression2/caravan* HTTP routes with auth, revision increments, and end-to-end mutations", async () => {
    const fx = await caravanRouteFixture((s) => {
      s.inventory.gold = 3_000;
      s.inventory.wood_1 = 40;
      s.inventory.lumber_1 = 20;
      s.inventory.ore_1 = 40;
      s.inventory.ingot_1 = 20;
      const ct = ensureCaravanTrade(s);
      ct.caravanRep = 320; // Lv.3 -> 2 wagons
      ct.astralCrystalDust = 60;
      ct.expressPermits = 2;
      for (const [iid, qty] of Object.entries(ct.contractsBoard!.contracts[0].demands)) {
        s.inventory[iid] = Number(s.inventory[iid] || 0) + qty;
      }
    });

    // Unauthenticated returns 401
    const unauth = await fx.invoke("GET", "/progression2/caravan", undefined, null);
    assert.equal(unauth.statusCode, 401);

    // 1. GET /progression2/caravan
    const initRes = await fx.getCaravan();
    assert.equal(initRes.statusCode, 200);
    assert.equal(initRes.payload.routes.length, 3);
    assert.equal(initRes.payload.wagonSlots.length, 3);
    assert.equal(initRes.payload.contractsBoard.contracts.length, 4);
    const rev0 = initRes.payload.stateRevision;

    // 2. POST /progression2/caravan/dispatch (timed) + POST /progression2/caravan/expedite + POST /progression2/caravan/claim
    const dispRes = await fx.dispatch({
      wagonSlot: 0,
      routeId: "frostport",
      cargo: { wood_1: 20, lumber_1: 10 },
    });
    assert.equal(dispRes.statusCode, 200);
    assert.equal(dispRes.payload.ok, true);
    assert.ok(dispRes.payload.stateRevision > rev0);

    const expRes = await fx.expedite(0);
    assert.equal(expRes.statusCode, 200);
    assert.equal(expRes.payload.ok, true);

    const claimRes = await fx.claim(0);
    assert.equal(claimRes.statusCode, 200);
    assert.equal(claimRes.payload.ok, true);
    assert.ok(claimRes.payload.claimed.reward.gold >= 60);

    // 3. POST /progression2/caravan/contracts/fulfill & /reroll
    const firstCid = initRes.payload.contractsBoard.contracts[0].id;
    const fulRes = await fx.fulfillContract(firstCid);
    assert.equal(fulRes.statusCode, 200);
    assert.equal(fulRes.payload.ok, true);

    const rrRes = await fx.rerollContracts();
    assert.equal(rrRes.statusCode, 200);
    assert.equal(rrRes.payload.ok, true);

    // 4. POST /progression2/caravan/exchange
    const exRes = await fx.exchangeDust("ledger_upgrade");
    assert.equal(exRes.statusCode, 200);
    assert.equal(exRes.payload.ok, true);
    assert.equal(exRes.payload.caravan.exchange.ledgerUpgrade.rank, 1);
  });
});
