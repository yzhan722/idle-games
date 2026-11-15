import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { randomUUID } from "node:crypto";
import packJson from "../../shared/enhanced_content_pack_chinese.json";
import type { AlchemicalPotionId, EnhancedContentPack, EnhancedPlayerState } from "./types";
import { createMemoryStorage } from "./storage_memory";
import { progressionRoutes } from "./routes/progression";
import { progression2Routes } from "./routes/progression2";
import { mapThrownError } from "./http_errors";
import {
  ALCHEMICAL_POTIONS,
  ALCHEMY_DAILY_FREE_EXTRACTIONS,
  ALCHEMY_ESSENCE_PER_EXTRACTION,
  ALCHEMY_MAX_CHARGES,
  ALCHEMY_MAX_RECIPE_RANK,
  CAULDRON_MASTERY_TIERS,
  TWIN_ALCHEMICAL_RESONANCES,
  acceptBounty,
  brewAlchemicalPotion,
  claimBounty,
  claimCaravanWagon,
  claimDailyAlchemyExtraction,
  consumeEquippedPotionChargesOnBossKill,
  dispatchCaravanWagon,
  doPrestige,
  ensureAlchemyCauldron,
  ensureBounties,
  ensureCaravanTrade,
  equipAlchemicalPotion,
  fulfillWorkshopContract,
  getAlchemyCauldronBonuses,
  getAlchemyCauldronInfo,
  getCaravanTradeInfo,
  performReincarnation,
  upgradeAlchemicalRecipe,
} from "./progression2";
import { hitDamage, monsterCombatant, playerCombatant } from "./first_hour_combat";
import { playerBuildExtras, startHpCombat, tickHpCombat } from "./hp_combat";
import {
  defaultEnhancedPlayerState,
  getActionRates,
  getRareFindMultiplier,
  simulateToNow,
  startLifeActionNow,
} from "./storage";

const pack = packJson as EnhancedContentPack;

async function cauldronRouteFixture(patch?: (state: EnhancedPlayerState) => void) {
  const storage = createMemoryStorage();
  const user = await storage.findOrCreateGuestUser(`wl8-cauldron-${randomUUID()}`);
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
    getCauldron: () => invoke("GET", "/progression2/cauldron"),
    extract: (expectedRevision?: number) =>
      invoke("POST", "/progression2/cauldron/extract", expectedRevision !== undefined ? { expectedRevision } : {}),
    brew: (body: {
      potionId: AlchemicalPotionId;
      mode?: "essence" | "material" | "astral_dust";
      expectedRevision?: number;
    }) => invoke("POST", "/progression2/cauldron/brew", body),
    upgrade: (body: {
      potionId: AlchemicalPotionId;
      mode?: "standard" | "astral_dust";
      expectedRevision?: number;
    }) => invoke("POST", "/progression2/cauldron/upgrade", body),
    equip: (body: {
      slotIndex: number;
      potionId: AlchemicalPotionId | null;
      expectedRevision?: number;
    }) => invoke("POST", "/progression2/cauldron/equip", body),
  };
}

describe("WL-8 Chimera Alchemy Cauldron & Twin Resonance Potion Slots (Backend)", () => {
  const T0 = new Date(2026, 10, 15, 10, 0, 0);
  const T_NEXT_DAY = new Date(2026, 10, 16, 10, 0, 0);

  it("sanitizes dirty/legacy saves cleanly in ensureAlchemyCauldron", () => {
    const state = defaultEnhancedPlayerState(pack.version || "1.0.0");
    (state as any).alchemyCauldron = {
      alchemyCauldronRank: 99,
      cauldronPoints: -50,
      totalBrews: -3,
      totalUpgrades: "bad",
      alchemicalEssence: -10,
      recipeRanks: {
        dragon_fury: 9,
        elven_bounty: 0,
        dwarven_temper: 3.8,
        astral_fortune: -2,
      },
      potionCharges: {
        dragon_fury: 999,
        elven_bounty: -5,
        dwarven_temper: 4,
      },
      equippedPotions: ["dragon_fury", "dragon_fury"], // duplicate potion in both slots
    };

    const ac = ensureAlchemyCauldron(state, T0);
    assert.equal(ac.alchemyCauldronRank, 6); // monotone rank clamped to 6
    assert.equal(ac.cauldronPoints, 620); // monotone floor aligned with Rank 6
    assert.equal(ac.totalBrews, 0);
    assert.equal(ac.totalUpgrades, 0);
    assert.equal(ac.alchemicalEssence, 0);
    assert.equal(ac.recipeRanks.dragon_fury, ALCHEMY_MAX_RECIPE_RANK);
    assert.equal(ac.recipeRanks.elven_bounty, 1);
    assert.equal(ac.recipeRanks.dwarven_temper, 3);
    assert.equal(ac.recipeRanks.astral_fortune, 1);
    assert.equal(ac.potionCharges.dragon_fury, ALCHEMY_MAX_CHARGES);
    assert.equal(ac.potionCharges.elven_bounty, 0);
    assert.deepEqual(ac.equippedPotions, ["dragon_fury", null]);
  });

  it("lets early-game players claim daily free alchemical essence and immediately brew + auto-equip potions", () => {
    const state = defaultEnhancedPlayerState(pack.version || "1.0.0");
    state.inventory = { gold: 0 };

    for (let i = 1; i <= ALCHEMY_DAILY_FREE_EXTRACTIONS; i++) {
      const res = claimDailyAlchemyExtraction(state, T0);
      assert.equal(res.ok, true);
      assert.equal(res.essenceGained, ALCHEMY_ESSENCE_PER_EXTRACTION);
      assert.equal(res.remainingToday, ALCHEMY_DAILY_FREE_EXTRACTIONS - i);
    }
    const capped = claimDailyAlchemyExtraction(state, T0);
    assert.equal(capped.ok, false);
    assert.match(capped.reason || "", /萃取次数已用尽/);

    // Next calendar day resets free extractions (2 starter + 2*2 day1 + 2 day2 = 8 essence)
    const nextDayClaim = claimDailyAlchemyExtraction(state, T_NEXT_DAY);
    assert.equal(nextDayClaim.ok, true);
    assert.equal(state.alchemyCauldron?.alchemicalEssence, 8);

    // Brew 2 distinct potions using free essence; verify auto-equip into Slot A and Slot B
    const brewA = brewAlchemicalPotion(state, pack, "dragon_fury", "essence", T_NEXT_DAY);
    assert.equal(brewA.ok, true);
    assert.equal(brewA.autoEquippedSlot, 0);
    assert.equal(brewA.chargesAdded, 6);

    const brewB = brewAlchemicalPotion(state, pack, "dwarven_temper", "essence", T_NEXT_DAY);
    assert.equal(brewB.ok, true);
    assert.equal(brewB.autoEquippedSlot, 1);

    const bonuses = getAlchemyCauldronBonuses(state);
    assert.deepEqual(bonuses.activePotions, ["dragon_fury", "dwarven_temper"]);
    assert.equal(bonuses.activeResonanceId, "res_forge_dragonflame");
    assert.equal(bonuses.activeResonanceName, "熔炉龙炎共鸣");
  });

  it("supports all 3 brew modes (essence, material with idle-cargo protection, astral_dust) and upgrades Recipes Lv.1->5 + Cauldron Rank Lv.1->6", () => {
    const state = defaultEnhancedPlayerState(pack.version || "1.0.0");
    state.inventory = {
      gold: 80_000,
      ore_1: 30,
      crystal_1: 60,
      crystal_2: 60,
      crystal_3: 60,
      crystal_4: 60,
      wood_1: 30,
      fiber_1: 30,
    };
    const ct = ensureCaravanTrade(state, T0);
    ct.astralCrystalDust = 600;
    const ac = ensureAlchemyCauldron(state, T0);
    ac.alchemicalEssence = 80;

    // Lock 28 ore_1 inside an in-transit caravan wagon so only 2 idle ore_1 remain (dragon_fury needs 4 ore_1 + 2 crystal_1)
    const dispatchRes = dispatchCaravanWagon(
      state,
      pack,
      { wagonSlot: 0, routeId: "emberoasis", cargo: { ore_1: 28 } },
      T0
    );
    assert.equal(dispatchRes.ok, true);

    const blockedMatBrew = brewAlchemicalPotion(state, pack, "dragon_fury", "material", T0);
    assert.equal(blockedMatBrew.ok, false);
    assert.match(blockedMatBrew.reason || "", /闲置素材/);

    // Restore ore_1 and brew via material mode
    state.inventory.ore_1 = 45;
    const okMatBrew = brewAlchemicalPotion(state, pack, "dragon_fury", "material", T0);
    assert.equal(okMatBrew.ok, true);
    assert.equal(okMatBrew.chargesAdded, 6);

    // Brew via astral_dust mode
    const dustBrew = brewAlchemicalPotion(state, pack, "astral_fortune", "astral_dust", T0);
    assert.equal(dustBrew.ok, true);
    assert.ok((dustBrew.chargesAdded || 0) >= 12);

    // Upgrade dragon_fury from Lv.1 -> Lv.5 mixing standard & astral_dust modes
    const up2 = upgradeAlchemicalRecipe(state, pack, "dragon_fury", "standard", T0);
    assert.equal(up2.ok, true);
    assert.equal(up2.newRank, 2);

    const up3 = upgradeAlchemicalRecipe(state, pack, "dragon_fury", "astral_dust", T0);
    assert.equal(up3.ok, true);
    assert.equal(up3.newRank, 3);

    const up4 = upgradeAlchemicalRecipe(state, pack, "dragon_fury", "standard", T0);
    assert.equal(up4.ok, true);
    assert.equal(up4.newRank, 4);

    const up5 = upgradeAlchemicalRecipe(state, pack, "dragon_fury", "astral_dust", T0);
    assert.equal(up5.ok, true);
    assert.equal(up5.newRank, 5);

    const upMax = upgradeAlchemicalRecipe(state, pack, "dragon_fury", "astral_dust", T0);
    assert.equal(upMax.ok, false);
    assert.match(upMax.reason || "", /最高/);

    // Upgrade remaining 3 potions to push cauldronPoints past 620 -> Cauldron Rank Lv.6!
    for (const pid of ["elven_bounty", "dwarven_temper", "astral_fortune"] as AlchemicalPotionId[]) {
      for (let target = 2; target <= 5; target++) {
        const r = upgradeAlchemicalRecipe(state, pack, pid, "astral_dust", T0);
        assert.equal(r.ok, true, `Failed upgrading ${pid} to ${target}: ${r.reason}`);
      }
    }

    assert.equal(ac.alchemyCauldronRank, 6);
    assert.equal(CAULDRON_MASTERY_TIERS[5].level, 6);
    const info = getAlchemyCauldronInfo(state, pack, T0);
    assert.equal(info.cauldronTier.level, 6);
    assert.equal(info.bonuses.batchBonusCharges, 4);
  });

  it("activates all 6 unordered Twin Alchemical Resonance pairs symmetrically and swaps slots without duplication", () => {
    assert.equal(ALCHEMICAL_POTIONS.length, 4);
    assert.equal(TWIN_ALCHEMICAL_RESONANCES.length, 6);

    const state = defaultEnhancedPlayerState(pack.version || "1.0.0");
    const ac = ensureAlchemyCauldron(state, T0);
    for (const p of ALCHEMICAL_POTIONS) {
      ac.potionCharges[p.id] = 10;
      ac.recipeRanks[p.id] = 3;
    }

    // Cannot equip a potion with 0 charges
    ac.potionCharges.astral_fortune = 0;
    const zeroEquip = equipAlchemicalPotion(state, 0, "astral_fortune", T0);
    assert.equal(zeroEquip.ok, false);
    ac.potionCharges.astral_fortune = 10;

    // Equip all 6 unordered pairs in both [A, B] and [B, A] orders
    for (const resDef of TWIN_ALCHEMICAL_RESONANCES) {
      const [pA, pB] = resDef.pair;

      assert.equal(equipAlchemicalPotion(state, 0, pA, T0).ok, true);
      const eqAB = equipAlchemicalPotion(state, 1, pB, T0);
      assert.equal(eqAB.ok, true);
      assert.equal(eqAB.activeResonanceName, resDef.name);
      const bonAB = getAlchemyCauldronBonuses(state);
      assert.equal(bonAB.activeResonanceId, resDef.id);
      assert.equal(bonAB.resonanceTier, 3);

      // Equipping pB into Slot 0 when pB is already in Slot 1 swaps them cleanly -> [pB, pA]
      const swapRes = equipAlchemicalPotion(state, 0, pB, T0);
      assert.equal(swapRes.ok, true);
      assert.deepEqual(swapRes.equippedPotions, [pB, pA]);
      const bonBA = getAlchemyCauldronBonuses(state);
      assert.equal(bonBA.activeResonanceId, resDef.id);
      assert.equal(bonBA.combatAtkPct, bonAB.combatAtkPct);
      assert.equal(bonBA.bossArmorBreakPct, bonAB.bossArmorBreakPct);
      assert.equal(bonBA.gatherDoubleChance, bonAB.gatherDoubleChance);
      assert.equal(bonBA.gatherSpeedPct, bonAB.gatherSpeedPct);
      assert.equal(bonBA.craftSpeedPct, bonAB.craftSpeedPct);
      assert.equal(bonBA.craftEfficiencyPct, bonAB.craftEfficiencyPct);
      assert.equal(bonBA.goldGainPct, bonAB.goldGainPct);
      assert.equal(bonBA.caravanBountyRewardPct, bonAB.caravanBountyRewardPct);
    }

    // Unequipping Slot 1 drops Twin Resonance while keeping Slot 0 active
    const clear1 = equipAlchemicalPotion(state, 1, null, T0);
    assert.equal(clear1.ok, true);
    assert.equal(getAlchemyCauldronBonuses(state).activeResonanceId, null);
  });

  it("persists Recipe Ranks (Lv.1~5), Cauldron Mastery Rank, Essence, Charges, and Equipped Slots across performReincarnation / doPrestige", () => {
    const state = defaultEnhancedPlayerState(pack.version || "1.0.0");
    state.combatLevel = 60;
    state.skills.woodcutting = { level: 55, xp: 0 };
    state.inventory.gold = 9000;

    const ac = ensureAlchemyCauldron(state, T0);
    ac.alchemyCauldronRank = 4;
    ac.cauldronPoints = 280;
    ac.totalBrews = 15;
    ac.totalUpgrades = 6;
    ac.alchemicalEssence = 12;
    ac.recipeRanks = {
      dragon_fury: 5,
      elven_bounty: 4,
      dwarven_temper: 3,
      astral_fortune: 2,
    };
    ac.potionCharges = {
      dragon_fury: 18,
      elven_bounty: 9,
      dwarven_temper: 6,
      astral_fortune: 4,
    };
    ac.equippedPotions = ["dragon_fury", "elven_bounty"];

    const res = performReincarnation(state);
    assert.equal(res.ok, true);
    assert.ok(state.alchemyCauldron);
    assert.equal(state.alchemyCauldron.alchemyCauldronRank, 4);
    assert.ok(state.alchemyCauldron.cauldronPoints >= 280);
    assert.equal(state.alchemyCauldron.alchemicalEssence, 12);
    assert.deepEqual(state.alchemyCauldron.recipeRanks, {
      dragon_fury: 5,
      elven_bounty: 4,
      dwarven_temper: 3,
      astral_fortune: 2,
    });
    assert.deepEqual(state.alchemyCauldron.potionCharges, {
      dragon_fury: 18,
      elven_bounty: 9,
      dwarven_temper: 6,
      astral_fortune: 4,
    });
    assert.deepEqual(state.alchemyCauldron.equippedPotions, ["dragon_fury", "elven_bounty"]);

    // Also verify doPrestige alias directly on a second reincarnation
    state.combatLevel = 60;
    const res2 = doPrestige(state);
    assert.equal(res2.ok, true);
    assert.equal(state.alchemyCauldron?.recipeRanks.dragon_fury, 5);
  });

  it("wires Cauldron & Twin Resonance bonuses into combat (ATK% + Boss Armor Break%), gathering, crafting, gold, bounties, and caravan rewards", () => {
    const baseState = defaultEnhancedPlayerState(pack.version || "1.0.0");
    baseState.combatLevel = 15;
    baseState.inventory = { gold: 1000, weapon_iron_sword: 1, wood_1: 40, lumber_1: 30 };
    (baseState.equipment as any).main_hand = "weapon_iron_sword";

    const buffedState = structuredClone(baseState);
    const ac = ensureAlchemyCauldron(buffedState, T0);
    ac.alchemyCauldronRank = 5;
    ac.cauldronPoints = 420;
    ac.recipeRanks = {
      dragon_fury: 5,
      elven_bounty: 5,
      dwarven_temper: 5,
      astral_fortune: 5,
    };
    ac.potionCharges = {
      dragon_fury: 10,
      elven_bounty: 10,
      dwarven_temper: 10,
      astral_fortune: 10,
    };
    ac.equippedPotions = ["dragon_fury", "dwarven_temper"]; // 熔炉龙炎共鸣

    // 1. Combat ATK % & Boss Armor Break %
    const baseExtras = playerBuildExtras(baseState);
    const buffedExtras = playerBuildExtras(buffedState);
    assert.ok(buffedExtras.combatAtkPct > baseExtras.combatAtkPct);
    assert.ok(buffedExtras.bossArmorBreakPct > 0);

    const pBase = playerCombatant(baseState, pack, baseExtras);
    const pBuff = playerCombatant(buffedState, pack, buffedExtras);
    assert.ok(pBuff.atk > pBase.atk);

    // Same ATK comparison isolating bossArmorBreakPct against Boss vs Non-Boss
    const normalHighDef = monsterCombatant({ id: "mob_stone", name: "岩石守卫", hp: 500, atk: 20, def: 120, isBoss: false });
    const bossHighDef = monsterCombatant({ id: "boss_stone", name: "深渊巨像BOSS", hp: 500, atk: 20, def: 120, isBoss: true });
    const sameAtkNoBreak = { ...pBuff, bossArmorBreakPct: 0 };
    assert.equal(hitDamage(pBuff, normalHighDef), hitDamage(sameAtkNoBreak, normalHighDef));
    assert.ok(
      hitDamage(pBuff, bossHighDef) > hitDamage(sameAtkNoBreak, bossHighDef),
      "bossArmorBreakPct must increase damage specifically against Boss monsters"
    );

    // 2. Gathering & Crafting action rates + Rare Find
    const gatherAction = (pack.actions as any[]).find(
      (a) => !String(a.id).startsWith("act_combat_") && (!Array.isArray(a.consumes) || a.consumes.length === 0)
    )!;
    const craftAction = (pack.actions as any[]).find(
      (a) => Array.isArray(a.consumes) && a.consumes.length > 0
    )!;
    const baseGatherRates = getActionRates(baseState, pack, gatherAction, T0);
    const buffGatherRates = getActionRates(buffedState, pack, gatherAction, T0);
    assert.ok(buffGatherRates.speedMul > baseGatherRates.speedMul);
    assert.ok(buffGatherRates.speedSources.some((s) => s.label === "奇美拉魔药釜"));
    assert.ok(buffGatherRates.goldMul > baseGatherRates.goldMul);

    const baseCraftRates = getActionRates(baseState, pack, craftAction, T0);
    const buffCraftRates = getActionRates(buffedState, pack, craftAction, T0);
    assert.ok(buffCraftRates.speedMul > baseCraftRates.speedMul);
    assert.ok(buffCraftRates.efficiencyPct > baseCraftRates.efficiencyPct);
    assert.ok(
      getRareFindMultiplier({
        ...buffedState,
        alchemyCauldron: {
          ...buffedState.alchemyCauldron!,
          equippedPotions: ["elven_bounty", "astral_fortune"],
        },
      }) > getRareFindMultiplier(baseState)
    );

    // 3. Double Gather Chance in simulateToNow (equip elven_bounty + astral_fortune)
    ac.equippedPotions = ["elven_bounty", "astral_fortune"]; // 星森丰饶共鸣
    const gatherBase = structuredClone(baseState);
    const gatherBoost = structuredClone(buffedState);
    assert.ok(getAlchemyCauldronBonuses(gatherBoost).gatherDoubleChance >= 0.33);
    const oreMineAction = (pack.actions as any[]).find(
      (a) =>
        !String(a.id).startsWith("act_combat_") &&
        (!Array.isArray(a.consumes) || a.consumes.length === 0) &&
        Array.isArray(a.yields) &&
        a.yields.some((y: any) => y.itemId === "ore_1")
    )!;
    for (const sk of Object.values(gatherBase.skills)) sk.level = 10;
    for (const sk of Object.values(gatherBoost.skills)) sk.level = 10;
    gatherBase.lastSimulatedAt = T0.toISOString();
    gatherBoost.lastSimulatedAt = T0.toISOString();
    startLifeActionNow(gatherBase, pack, oreMineAction.id, undefined, T0);
    startLifeActionNow(gatherBoost, pack, oreMineAction.id, undefined, T0);
    const after30s = new Date(T0.getTime() + 30_000);
    const simBase = simulateToNow({ state: gatherBase, contentPack: pack, now: after30s, rng: () => 0.15 });
    const simBoost = simulateToNow({ state: gatherBoost, contentPack: pack, now: after30s, rng: () => 0.15 });
    assert.ok(
      (simBoost.state.inventory.ore_1 || 0) >= (simBase.state.inventory.ore_1 || 0) * 2 &&
        (simBoost.state.inventory.ore_1 || 0) > 0,
      "Alchemy Cauldron gatherDoubleChance + gatherSpeedPct must >= 2x ore_1 yield when rng=0.15"
    );

    // 4. Bounty & Caravan reward bonus (caravanBountyRewardPct)
    const bountyBase = structuredClone(baseState);
    const bountyBuff = structuredClone(buffedState);
    bountyBuff.alchemyCauldron!.equippedPotions = ["elven_bounty", "astral_fortune"];
    const bListA = ensureBounties(bountyBase, T0);
    ensureBounties(bountyBuff, T0);
    const targetBountyId = bListA.bounties[0].id;
    acceptBounty(bountyBase, targetBountyId, T0);
    acceptBounty(bountyBuff, targetBountyId, T0);
    for (const st of [bountyBase.stats!, bountyBuff.stats!]) {
      st.totalGathered = 9999;
      st.totalCrafted = 9999;
      st.totalKills = 9999;
    }
    const claimA = claimBounty(bountyBase, targetBountyId, T0);
    const claimB = claimBounty(bountyBuff, targetBountyId, T0);
    assert.equal(claimA.ok, true);
    assert.equal(claimB.ok, true);
    assert.ok((claimB.gold || 0) > (claimA.gold || 0), "astral_fortune must increase Bounty gold reward");

    // Caravan claim & Workshop contract gold boost
    const carBase = structuredClone(baseState);
    const carBuff = structuredClone(buffedState);
    carBuff.alchemyCauldron!.equippedPotions = ["elven_bounty", "astral_fortune"];
    ensureCaravanTrade(carBase, T0).expressPermits = 2;
    ensureCaravanTrade(carBuff, T0).expressPermits = 2;
    assert.equal(
      dispatchCaravanWagon(
        carBase,
        pack,
        { wagonSlot: 0, routeId: "frostport", cargo: { wood_1: 10 }, useExpressPermit: true },
        T0
      ).ok,
      true
    );
    assert.equal(
      dispatchCaravanWagon(
        carBuff,
        pack,
        { wagonSlot: 0, routeId: "frostport", cargo: { wood_1: 10 }, useExpressPermit: true },
        T0
      ).ok,
      true
    );
    const wClaimA = claimCaravanWagon(carBase, 0, T0);
    const wClaimB = claimCaravanWagon(carBuff, 0, T0);
    assert.ok(
      (wClaimB.reward?.gold || 0) > (wClaimA.reward?.gold || 0),
      "astral_fortune must increase Caravan gold"
    );

    const ctInfoA = getCaravanTradeInfo(carBase, pack, T0);
    const contract0 = ctInfoA.contractsBoard.contracts[0];
    for (const d of contract0.demandList) {
      carBase.inventory[d.itemId] = 100;
      carBuff.inventory[d.itemId] = 100;
    }
    const goldBeforeA = carBase.inventory.gold;
    const goldBeforeB = carBuff.inventory.gold;
    assert.equal(fulfillWorkshopContract(carBase, pack, contract0.id, T0).ok, true);
    assert.equal(fulfillWorkshopContract(carBuff, pack, contract0.id, T0).ok, true);
    assert.ok(
      carBuff.inventory.gold - goldBeforeB > carBase.inventory.gold - goldBeforeA,
      "astral_fortune must increase Workshop Supply Contract gold"
    );

    // 5. Boss defeat consumes 1 charge from each equipped potion; normal monster defeat consumes 0
    const bossMonster =
      (pack.monsters as any[]).find((m) => m.id === "forest_boss") ||
      (pack.monsters as any[]).find((m) => m.isBoss) ||
      (pack.monsters as any[])[0];
    const normalMonster = (pack.monsters as any[]).find((m) => m.id === "slime") || (pack.monsters as any[]).find((m) => !m.isBoss)!;
    const fightPack = {
      ...pack,
      actions: (pack.actions as any[]).map((a: any) =>
        String(a.id).startsWith("act_combat_") ? { ...a, requirements: {} } : a
      ),
    } as EnhancedContentPack;

    const combatPlayer = structuredClone(buffedState);
    combatPlayer.combatLevel = 50;
    combatPlayer.combatSkills = {
      melee: { level: 90, xp: 0 },
      ranged: { level: 90, xp: 0 },
      magic: { level: 90, xp: 0 },
      defense: { level: 90, xp: 0 },
      stamina: { level: 90, xp: 0 },
      intelligence: { level: 90, xp: 0 },
    };
    if (combatPlayer.combatLoadout) {
      combatPlayer.combatLoadout.autoRepeat = false;
    }
    combatPlayer.alchemyCauldron!.equippedPotions = ["dragon_fury", "dwarven_temper"];
    combatPlayer.alchemyCauldron!.potionCharges.dragon_fury = 2;
    combatPlayer.alchemyCauldron!.potionCharges.dwarven_temper = 1;

    combatPlayer.hpCombat = startHpCombat(combatPlayer, fightPack, normalMonster.id, T0);
    tickHpCombat(combatPlayer, fightPack, new Date(T0.getTime() + 60_000), 60_000);
    assert.equal(combatPlayer.hpCombat?.outcome, "win");
    assert.equal(combatPlayer.alchemyCauldron!.potionCharges.dragon_fury, 2, "Normal mob must not consume potion charge");

    const weakBossPack = {
      ...fightPack,
      monsters: (fightPack.monsters as any[]).map((m) =>
        m.id === bossMonster.id ? { ...m, isBoss: true, hp: 20, atk: 1, def: 2, mechanics: [] } : m
      ),
    } as EnhancedContentPack;
    combatPlayer.hpCombat = startHpCombat(combatPlayer, weakBossPack, bossMonster.id, new Date(T0.getTime() + 70_000));
    tickHpCombat(combatPlayer, weakBossPack, new Date(T0.getTime() + 95_000), 25_000);
    assert.equal(combatPlayer.hpCombat?.outcome, "win");
    assert.equal(combatPlayer.alchemyCauldron!.potionCharges.dragon_fury, 1);
    assert.equal(combatPlayer.alchemyCauldron!.potionCharges.dwarven_temper, 0);
    assert.equal(
      getAlchemyCauldronBonuses(combatPlayer).activeResonanceId,
      null,
      "Depleting one slot to 0 charges must deactivate Twin Resonance until re-brewed"
    );

    assert.equal(consumeEquippedPotionChargesOnBossKill(combatPlayer), 1);
    assert.equal(combatPlayer.alchemyCauldron!.potionCharges.dragon_fury, 0);
  });

  it("exposes all 5 /progression2/cauldron* HTTP routes with auth guard, revision concurrency, and state mutations", async () => {
    const fx = await cauldronRouteFixture((st) => {
      st.inventory.gold = 10_000;
      st.inventory.crystal_1 = 20;
      ensureCaravanTrade(st, T0).astralCrystalDust = 30;
    });

    // 401 when unauthenticated
    const unauth = await fx.invoke("GET", "/progression2/cauldron", undefined, null);
    assert.equal(unauth.statusCode, 401);

    const initGet = await fx.getCauldron();
    assert.equal(initGet.statusCode, 200);
    assert.equal(initGet.payload.potions.length, 4);
    assert.equal(initGet.payload.allResonances.length, 6);

    // Extract free essence -> stateRevision increments
    const extRes = await fx.extract();
    assert.equal(extRes.statusCode, 200);
    assert.equal(extRes.payload.ok, true);
    const revAfterExtract = extRes.payload.stateRevision;
    assert.ok(typeof revAfterExtract === "number" && revAfterExtract >= 1);

    // Stale expectedRevision returns 409 conflict
    const conflictRes = await fx.extract(revAfterExtract - 1);
    assert.equal(conflictRes.statusCode, 409);

    // Brew 2 potions & upgrade 1 recipe & equip slots via HTTP
    const brew1 = await fx.brew({ potionId: "dragon_fury", mode: "essence", expectedRevision: revAfterExtract });
    assert.equal(brew1.statusCode, 200);
    assert.equal(brew1.payload.cauldron.equippedPotions[0], "dragon_fury");

    const brew2 = await fx.brew({ potionId: "astral_fortune", mode: "astral_dust" });
    assert.equal(brew2.statusCode, 200);
    assert.equal(brew2.payload.cauldron.activeResonance?.id, "res_starfall_slayer");

    const upg = await fx.upgrade({ potionId: "dragon_fury", mode: "astral_dust" });
    assert.equal(upg.statusCode, 200);
    assert.equal(upg.payload.upgraded.newRank, 2);

    const eqSwap = await fx.equip({ slotIndex: 0, potionId: "astral_fortune" });
    assert.equal(eqSwap.statusCode, 200);
    assert.deepEqual(eqSwap.payload.equipped.equippedPotions, ["astral_fortune", "dragon_fury"]);
    assert.equal(eqSwap.payload.equipped.activeResonanceName, "星陨讨魔共鸣");

    const badSlot = await fx.equip({ slotIndex: 5, potionId: "dragon_fury" });
    assert.equal(badSlot.statusCode, 400);
  });
});
