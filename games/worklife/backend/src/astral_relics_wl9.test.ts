import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { randomUUID } from "node:crypto";
import packJson from "../../shared/enhanced_content_pack_chinese.json";
import type {
  AstralRuinStratumId,
  EnhancedContentPack,
  EnhancedPlayerState,
  ExpeditionSurveyMode,
  RelicUpgradeMode,
  SacredRelicId,
} from "./types";
import { createMemoryStorage } from "./storage_memory";
import { progressionRoutes } from "./routes/progression";
import { progression2Routes } from "./routes/progression2";
import { mapThrownError } from "./http_errors";
import {
  ASTRAL_CURATOR_TIERS,
  ASTRAL_DAILY_FREE_SURVEYS,
  ASTRAL_RUIN_STRATA,
  ASTRAL_VEIN_CADENCE,
  FULL_GALLERY_RESONANCE_TIERS,
  SACRED_RELIC_MAX_RANK,
  SACRED_RELIC_PEDESTALS,
  acceptBounty,
  brewAlchemicalPotion,
  claimBounty,
  claimCaravanWagon,
  dispatchAstralExpedition,
  dispatchCaravanWagon,
  doPrestige,
  ensureAlchemyCauldron,
  ensureAstralRelics,
  ensureBounties,
  ensureCaravanTrade,
  fulfillWorkshopContract,
  getAlchemyCauldronInfo,
  getAstralRelicsBonuses,
  getAstralRelicsInfo,
  getCaravanTradeInfo,
  performReincarnation,
  upgradeSacredRelicPedestal,
} from "./progression2";
import { hitDamage, monsterCombatant, playerCombatant } from "./first_hour_combat";
import { playerBuildExtras, startHpCombat } from "./hp_combat";
import {
  defaultEnhancedPlayerState,
  getActionRates,
  getRareFindMultiplier,
  simulateToNow,
  startLifeActionNow,
} from "./storage";

const pack = packJson as EnhancedContentPack;

async function relicsRouteFixture(patch?: (state: EnhancedPlayerState) => void) {
  const storage = createMemoryStorage();
  const user = await storage.findOrCreateGuestUser(`wl9-relics-${randomUUID()}`);
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
    getRelics: () => invoke("GET", "/progression2/relics"),
    survey: (body: {
      stratumId: AstralRuinStratumId;
      mode: ExpeditionSurveyMode;
      expectedRevision?: number;
    }) => invoke("POST", "/progression2/relics/survey", body),
    upgrade: (body: {
      relicId: SacredRelicId;
      mode?: RelicUpgradeMode;
      expectedRevision?: number;
    }) => invoke("POST", "/progression2/relics/upgrade", body),
  };
}

describe("WL-9 Astral Ruin Expedition & Sacred Relic Gallery backend mechanics & routes", () => {
  const T_DAY1 = new Date("2026-11-15T09:00:00.000Z");
  const T_DAY2 = new Date("2026-11-16T09:00:00.000Z");

  it("sanitizes dirty saves, grants starter shards on fresh init, and resets daily free survey quota on date rollover", () => {
    const fresh = defaultEnhancedPlayerState(pack.version);
    const arFresh = ensureAstralRelics(fresh, T_DAY1);
    assert.equal(arFresh.ancientRelicShards, 2);
    assert.equal(arFresh.curatorRank, 1);
    assert.equal(arFresh.dailySurvey?.claimedCount, 0);
    assert.deepEqual(arFresh.pedestalRanks, {
      solar_spear: 0,
      verdant_chalice: 0,
      titan_anvil: 0,
      chimera_censer: 0,
    });

    // Inject malformed / corrupted fields
    (fresh as any).astralRelics = {
      ancientRelicShards: -50,
      expeditionXp: Number.NaN,
      curatorRank: 4,
      totalSurveys: 2.9,
      totalRestorations: -4,
      dailySurvey: { date: "2026-11-14", claimedCount: 99 },
      pedestalRanks: {
        solar_spear: 99,
        verdant_chalice: -3,
        titan_anvil: 2.7,
      },
    };
    const sanitized = ensureAstralRelics(fresh, T_DAY1);
    assert.equal(sanitized.ancientRelicShards, 0);
    assert.equal(sanitized.pedestalRanks.solar_spear, SACRED_RELIC_MAX_RANK);
    assert.equal(sanitized.pedestalRanks.verdant_chalice, 0);
    assert.equal(sanitized.pedestalRanks.titan_anvil, 2);
    assert.equal(sanitized.pedestalRanks.chimera_censer, 0);
    assert.ok(sanitized.expeditionXp >= ASTRAL_CURATOR_TIERS[3].minXp);
    assert.equal(sanitized.curatorRank, 4);
    assert.equal(sanitized.dailySurvey?.claimedCount, 0);
  });

  it("dispatches free, coin, and astral_dust surveys across 3 strata with curator gates and deterministic 3rd-survey vein jackpots", () => {
    const state = defaultEnhancedPlayerState(pack.version);
    state.inventory.gold = 5000;
    const ct = ensureCaravanTrade(state, T_DAY1);
    ct.astralCrystalDust = 40;
    const ar = ensureAstralRelics(state, T_DAY1);
    assert.equal(ar.ancientRelicShards, 2);

    // Deeper strata locked at Curator Lv.1
    const lockedMid = dispatchAstralExpedition(state, "obsidian_sanctum", "free", T_DAY1);
    assert.equal(lockedMid.ok, false);
    const lockedDeep = dispatchAstralExpedition(state, "primordial_corridor", "coin", T_DAY1);
    assert.equal(lockedDeep.ok, false);

    // Survey #1 (free): +4 shards, +2 dust, +15 xp (not jackpot)
    const s1 = dispatchAstralExpedition(state, "outpost_ruins", "free", T_DAY1);
    assert.equal(s1.ok, true);
    assert.equal(s1.isVeinJackpot, false);
    assert.equal(s1.shardsGained, 4);
    assert.equal(s1.astralDustGained, 2);
    assert.equal(s1.remainingFreeToday, ASTRAL_DAILY_FREE_SURVEYS - 1);

    // Survey #2 (free): +4 shards, +2 dust, +15 xp (daily free cap reached)
    const s2 = dispatchAstralExpedition(state, "outpost_ruins", "free", T_DAY1);
    assert.equal(s2.ok, true);
    assert.equal(s2.isVeinJackpot, false);
    assert.equal(s2.remainingFreeToday, 0);

    // 3rd free attempt on same day rejected
    const sFreeExhausted = dispatchAstralExpedition(state, "outpost_ruins", "free", T_DAY1);
    assert.equal(sFreeExhausted.ok, false);

    // Survey #3 (coin): 3rd total survey triggers ASTRAL_VEIN_CADENCE = 3 jackpot!
    // totalXp becomes 15 + 15 + (18 + 6) = 54 >= 45 -> levels up to Curator Lv.2!
    const goldBefore = state.inventory.gold;
    const s3 = dispatchAstralExpedition(state, "outpost_ruins", "coin", T_DAY1);
    assert.equal(s3.ok, true);
    assert.equal(s3.isVeinJackpot, true);
    assert.equal(ASTRAL_VEIN_CADENCE, 3);
    assert.equal(s3.shardsGained, 5 + 2);
    assert.equal(s3.astralDustGained, 2 + 1);
    assert.equal(s3.expeditionXpGained, 18 + 6);
    assert.equal(s3.leveledUpTo, 2);
    assert.equal(state.inventory.gold, goldBefore - 320);

    // Curator Lv.2 unlocks Stratum 2 (obsidian_sanctum) and adds +1 surveyBonusShards!
    const dustBefore = ct.astralCrystalDust;
    const s4 = dispatchAstralExpedition(state, "obsidian_sanctum", "astral_dust", T_DAY1);
    assert.equal(s4.ok, true);
    assert.equal(s4.isVeinJackpot, false);
    assert.equal(s4.shardsGained, 19 + 1); // base 19 + Lv.2 curator bonus 1
    assert.equal(ct.astralCrystalDust, dustBefore - 10 + 3);

    // Next day resets daily free survey count
    const infoNextDay = getAstralRelicsInfo(state, pack, T_DAY2);
    assert.equal(infoNextDay.dailySurvey.remainingToday, ASTRAL_DAILY_FREE_SURVEYS);
    const s5Free = dispatchAstralExpedition(state, "obsidian_sanctum", "free", T_DAY2);
    assert.equal(s5Free.ok, true);
  });

  it("restores and upgrades all 4 Sacred Relic Pedestals (Lv.0~5), protects equipped items, and awakens Full-Gallery Resonance", () => {
    const state = defaultEnhancedPlayerState(pack.version);
    state.inventory.gold = 100_000;
    const ar = ensureAstralRelics(state, T_DAY1);
    const ct = ensureCaravanTrade(state, T_DAY1);
    ar.ancientRelicShards = 900;
    ct.astralCrystalDust = 500;

    // Restore 3 pedestals via standard mode and 4th via astral_dust mode -> triggers Full-Gallery Resonance Lv.1!
    assert.equal(upgradeSacredRelicPedestal(state, pack, "solar_spear", "standard", T_DAY1).ok, true);
    assert.equal(upgradeSacredRelicPedestal(state, pack, "verdant_chalice", "standard", T_DAY1).ok, true);
    assert.equal(upgradeSacredRelicPedestal(state, pack, "titan_anvil", "standard", T_DAY1).ok, true);
    const fourth = upgradeSacredRelicPedestal(state, pack, "chimera_censer", "astral_dust", T_DAY1);
    assert.equal(fourth.ok, true);
    assert.equal(fourth.newRank, 1);
    assert.equal(fourth.awakenedResonanceTier, 1);
    assert.equal(fourth.awakenedResonanceTitle, FULL_GALLERY_RESONANCE_TIERS[0].title);

    // Upgrading Lv.1 -> Lv.2 in standard mode requires crystal_1 x2; verify equipped item protection!
    state.inventory.crystal_1 = 2;
    (state.equipment as any).accessory = "crystal_1"; // 1 equipped -> only 1 idle!
    const blockedByEquipped = upgradeSacredRelicPedestal(state, pack, "solar_spear", "standard", T_DAY1);
    assert.equal(blockedByEquipped.ok, false);

    // Adding 1 more idle crystal_1 allows standard upgrade while preserving equipped copy
    state.inventory.crystal_1 = 3;
    const lv2 = upgradeSacredRelicPedestal(state, pack, "solar_spear", "standard", T_DAY1);
    assert.equal(lv2.ok, true);
    assert.equal(lv2.newRank, 2);
    assert.equal(state.inventory.crystal_1, 1);

    // Max all 4 pedestals to Lv.5 via astral_dust mode -> awakens Full-Gallery Resonance Lv.5!
    for (const ped of SACRED_RELIC_PEDESTALS) {
      while ((ar.pedestalRanks[ped.id] || 0) < SACRED_RELIC_MAX_RANK) {
        const res = upgradeSacredRelicPedestal(state, pack, ped.id, "astral_dust", T_DAY1);
        assert.equal(res.ok, true);
      }
      const overMax = upgradeSacredRelicPedestal(state, pack, ped.id, "astral_dust", T_DAY1);
      assert.equal(overMax.ok, false);
    }

    const bonuses = getAstralRelicsBonuses(state);
    assert.equal(bonuses.restoredCount, 4);
    assert.equal(bonuses.totalRelicLevels, 20);
    assert.equal(bonuses.fullGalleryResonanceTier, 5);
    assert.equal(bonuses.fullGalleryResonanceTitle, FULL_GALLERY_RESONANCE_TIERS[4].title);
  });

  it("permanently preserves Sacred Relic Pedestals, shards, and Curator Rank across both doPrestige and performReincarnation", () => {
    const state = defaultEnhancedPlayerState(pack.version);
    state.combatLevel = 60;
    state.skills.woodcutting = { level: 55, xp: 0 };
    state.inventory.gold = 50_000;
    state.inventory.wood_1 = 200;

    const ar = ensureAstralRelics(state, T_DAY1);
    ar.ancientRelicShards = 77;
    ar.expeditionXp = 600;
    ar.curatorRank = 5;
    ar.totalSurveys = 18;
    ar.totalRestorations = 10;
    ar.pedestalRanks = {
      solar_spear: 4,
      verdant_chalice: 3,
      titan_anvil: 2,
      chimera_censer: 3,
    };

    const prePrestige = doPrestige(state);
    assert.equal(prePrestige.ok, true);
    assert.equal(state.astralRelics?.ancientRelicShards, 77);
    assert.equal(state.astralRelics?.curatorRank, 5);
    assert.deepEqual(state.astralRelics?.pedestalRanks, {
      solar_spear: 4,
      verdant_chalice: 3,
      titan_anvil: 2,
      chimera_censer: 3,
    });

    // Restore level reqs and test performReincarnation as well
    state.combatLevel = 60;
    state.skills.woodcutting = { level: 55, xp: 0 };
    state.inventory.wood_1 = 150;
    const reinc = performReincarnation(state);
    assert.equal(reinc.ok, true);
    assert.equal(state.inventory.wood_1 || 0, 0);
    assert.equal(state.astralRelics?.ancientRelicShards, 77);
    assert.equal(state.astralRelics?.expeditionXp, 600);
    assert.equal(state.astralRelics?.curatorRank, 5);
    assert.deepEqual(state.astralRelics?.pedestalRanks, {
      solar_spear: 4,
      verdant_chalice: 3,
      titan_anvil: 2,
      chimera_censer: 3,
    });
    const postBonuses = getAstralRelicsBonuses(state);
    assert.equal(postBonuses.fullGalleryResonanceTier, 2);
    assert.ok(postBonuses.combatAtkPct > 0);
    assert.ok(postBonuses.gatherDoubleChance > 0);
  });

  it("wires Sacred Relic bonuses into gathering/crafting rates, gather double-drop, rare-find, Caravan/Bounty/Contract rewards, Cauldron batch charges, and Normal/Boss combat", async () => {
    const storage = createMemoryStorage();
    const base = defaultEnhancedPlayerState(pack.version);
    const boosted = defaultEnhancedPlayerState(pack.version);

    const ar = ensureAstralRelics(boosted, T_DAY1);
    ar.expeditionXp = 900;
    ar.curatorRank = 6;
    ar.pedestalRanks = {
      solar_spear: 5,
      verdant_chalice: 5,
      titan_anvil: 5,
      chimera_censer: 5,
    };

    const gatherAction = (pack.actions as any[]).find(
      (a) => !String(a.id).startsWith("act_combat_") && (!Array.isArray(a.consumes) || a.consumes.length === 0)
    )!;
    const craftAction = (pack.actions as any[]).find(
      (a) => Array.isArray(a.consumes) && a.consumes.length > 0
    )!;

    const baseGatherRates = getActionRates(base, pack, gatherAction, T_DAY1);
    const boostGatherRates = getActionRates(boosted, pack, gatherAction, T_DAY1);
    assert.ok(boostGatherRates.speedMul > baseGatherRates.speedMul, "Relics must speed up gathering");
    assert.ok(boostGatherRates.efficiencyPct > baseGatherRates.efficiencyPct, "Verdant Chalice must grant gatherEfficiencyPct");
    assert.ok(boostGatherRates.xpMul > baseGatherRates.xpMul);
    assert.ok(boostGatherRates.goldMul > baseGatherRates.goldMul);

    const baseCraftRates = getActionRates(base, pack, craftAction, T_DAY1);
    const boostCraftRates = getActionRates(boosted, pack, craftAction, T_DAY1);
    assert.ok(boostCraftRates.speedMul > baseCraftRates.speedMul, "Titan Anvil must speed up crafting");
    assert.ok(boostCraftRates.efficiencyPct > baseCraftRates.efficiencyPct, "Titan Anvil must grant craftEfficiencyPct");

    assert.ok(getRareFindMultiplier(boosted) > getRareFindMultiplier(base), "Verdant Chalice + Curator must boost rare find");

    // Verify deterministic gatherDoubleChance in simulateToNow
    const oreMineAction = (pack.actions as any[]).find(
      (a) =>
        !String(a.id).startsWith("act_combat_") &&
        (!Array.isArray(a.consumes) || a.consumes.length === 0) &&
        Array.isArray(a.yields) &&
        a.yields.some((y: any) => y.itemId === "ore_1")
    )!;
    for (const sk of Object.values(base.skills)) sk.level = 10;
    for (const sk of Object.values(boosted.skills)) sk.level = 10;
    base.lastSimulatedAt = T_DAY1.toISOString();
    boosted.lastSimulatedAt = T_DAY1.toISOString();
    startLifeActionNow(base, pack, oreMineAction.id, undefined, T_DAY1);
    startLifeActionNow(boosted, pack, oreMineAction.id, undefined, T_DAY1);
    const after30s = new Date(T_DAY1.getTime() + 30_000);
    const outBase = simulateToNow({ state: base, contentPack: pack, now: after30s, rng: () => 0.15 });
    const outBoost = simulateToNow({ state: boosted, contentPack: pack, now: after30s, rng: () => 0.15 });
    assert.ok(
      (outBoost.state.inventory.ore_1 || 0) >= (outBase.state.inventory.ore_1 || 0) * 2 &&
        (outBoost.state.inventory.ore_1 || 0) > 0,
      "Relic gather speed + double-drop + efficiency must >= 2x ore_1 yield when rng=0.15"
    );

    // Verify Chimera Censer alchemyBatchBonusCharges (+3 charges per brew at Lv.5!)
    ensureAlchemyCauldron(base, T_DAY1).alchemicalEssence = 20;
    ensureAlchemyCauldron(boosted, T_DAY1).alchemicalEssence = 20;
    const baseCauldronInfo = getAlchemyCauldronInfo(base, pack, T_DAY1);
    const boostCauldronInfo = getAlchemyCauldronInfo(boosted, pack, T_DAY1);
    assert.equal(
      boostCauldronInfo.potions[0].brewOptions.essence.chargesOut,
      baseCauldronInfo.potions[0].brewOptions.essence.chargesOut + 3
    );
    const brewBase = brewAlchemicalPotion(base, pack, "dragon_fury", "essence", T_DAY1);
    const brewBoost = brewAlchemicalPotion(boosted, pack, "dragon_fury", "essence", T_DAY1);
    assert.equal((brewBoost.chargesAdded || 0) - (brewBase.chargesAdded || 0), 3);

    // Verify Chimera Censer + Full-Gallery Resonance caravanBountyRewardPct (+60% at Lv.5 + Resonance Lv.5)
    const bountyBase = structuredClone(base);
    const bountyBoost = structuredClone(boosted);
    const bList = ensureBounties(bountyBase, T_DAY1);
    ensureBounties(bountyBoost, T_DAY1);
    const targetBountyId = bList.bounties[0].id;
    acceptBounty(bountyBase, targetBountyId, T_DAY1);
    acceptBounty(bountyBoost, targetBountyId, T_DAY1);
    for (const st of [bountyBase.stats!, bountyBoost.stats!]) {
      st.totalGathered = 9999;
      st.totalCrafted = 9999;
      st.totalKills = 9999;
    }
    const claimBaseBounty = claimBounty(bountyBase, targetBountyId, T_DAY1);
    const claimBoostBounty = claimBounty(bountyBoost, targetBountyId, T_DAY1);
    assert.equal(claimBaseBounty.ok, true);
    assert.equal(claimBoostBounty.ok, true);
    assert.ok((claimBoostBounty.gold || 0) > (claimBaseBounty.gold || 0));

    // Caravan wagon & Workshop contract reward boost
    const carBase = structuredClone(base);
    const carBoost = structuredClone(boosted);
    carBase.inventory.wood_1 = 50;
    carBoost.inventory.wood_1 = 50;
    ensureCaravanTrade(carBase, T_DAY1).expressPermits = 2;
    ensureCaravanTrade(carBoost, T_DAY1).expressPermits = 2;
    assert.equal(
      dispatchCaravanWagon(
        carBase,
        pack,
        { wagonSlot: 0, routeId: "frostport", cargo: { wood_1: 10 }, useExpressPermit: true },
        T_DAY1
      ).ok,
      true
    );
    assert.equal(
      dispatchCaravanWagon(
        carBoost,
        pack,
        { wagonSlot: 0, routeId: "frostport", cargo: { wood_1: 10 }, useExpressPermit: true },
        T_DAY1
      ).ok,
      true
    );
    const wagonBase = claimCaravanWagon(carBase, 0, T_DAY1);
    const wagonBoost = claimCaravanWagon(carBoost, 0, T_DAY1);
    assert.ok((wagonBoost.reward?.gold || 0) > (wagonBase.reward?.gold || 0));

    const ctInfoBase = getCaravanTradeInfo(carBase, pack, T_DAY1);
    const contract0 = ctInfoBase.contractsBoard.contracts[0];
    for (const d of contract0.demandList) {
      carBase.inventory[d.itemId] = 100;
      carBoost.inventory[d.itemId] = 100;
    }
    const goldBeforeBase = carBase.inventory.gold || 0;
    const goldBeforeBoost = carBoost.inventory.gold || 0;
    assert.equal(fulfillWorkshopContract(carBase, pack, contract0.id, T_DAY1).ok, true);
    assert.equal(fulfillWorkshopContract(carBoost, pack, contract0.id, T_DAY1).ok, true);
    assert.ok(
      (carBoost.inventory.gold || 0) - goldBeforeBoost > (carBase.inventory.gold || 0) - goldBeforeBase
    );

    // Combat: Solar Spear + Full-Gallery Resonance boosts ATK, armorPenPct, bossArmorBreakPct, and relicCritAmpPct!
    const fightPack = {
      ...pack,
      actions: (pack.actions as any[]).map((a: any) =>
        String(a.id).startsWith("act_combat_") ? { ...a, requirements: {} } : a
      ),
    } as EnhancedContentPack;
    const normalMob = (pack.monsters as any[])[0];
    const bossMob = { ...normalMob, id: "test_boss", name: "星界巨像BOSS", isBoss: true, def: 60 };

    const extBase = playerBuildExtras(base);
    const extBoost = playerBuildExtras(boosted);
    assert.ok(extBoost.combatAtkPct > extBase.combatAtkPct);
    assert.ok(extBoost.armorPenPct > extBase.armorPenPct);
    assert.ok(extBoost.bossArmorBreakPct > 0);
    assert.ok(extBoost.relicCritAmpPct > 0);

    const pcBase = playerCombatant(base, fightPack, extBase);
    const pcBoost = playerCombatant(boosted, fightPack, extBoost);
    assert.ok(hitDamage(pcBoost, monsterCombatant(normalMob)) > hitDamage(pcBase, monsterCombatant(normalMob)));
    assert.ok(hitDamage(pcBoost, monsterCombatant(bossMob)) > hitDamage(pcBase, monsterCombatant(bossMob)));

    const enc = startHpCombat(boosted, fightPack, normalMob.id, T_DAY1);
    assert.equal(enc.playerMaxHp, pcBoost.hp);
    assert.equal(enc.playerIntervalMs, pcBoost.intervalMs);
  });

  it("exposes GET/POST /progression2/relics* routes with auth guard and stateRevision concurrency", async () => {
    const fx = await relicsRouteFixture((s) => {
      s.inventory.gold = 3000;
      const ct = ensureCaravanTrade(s, T_DAY1);
      ct.astralCrystalDust = 20;
    });

    const unauth = await fx.invoke("GET", "/progression2/relics", undefined, null);
    assert.equal(unauth.statusCode, 401);

    const initial = await fx.getRelics();
    assert.equal(initial.statusCode, 200);
    assert.equal(initial.payload.strata.length, ASTRAL_RUIN_STRATA.length);
    assert.equal(initial.payload.pedestals.length, SACRED_RELIC_PEDESTALS.length);
    assert.equal(initial.payload.ancientRelicShards, 2);
    const rev0 = initial.payload.stateRevision;

    // Free survey #1 -> +4 shards => total 6 shards (enough to restore solar_spear in standard mode!)
    const sv1 = await fx.survey({
      stratumId: "outpost_ruins",
      mode: "free",
      expectedRevision: rev0,
    });
    assert.equal(sv1.statusCode, 200);
    assert.equal(sv1.payload.ok, true);
    assert.equal(sv1.payload.relics.ancientRelicShards, 6);
    const rev1 = sv1.payload.stateRevision;
    assert.ok(rev1 > rev0);

    // Stale expectedRevision rejected with 409
    const stale = await fx.upgrade({
      relicId: "solar_spear",
      mode: "standard",
      expectedRevision: rev0,
    });
    assert.equal(stale.statusCode, 409);

    // Valid expectedRevision restores solar_spear to Lv.1!
    const up1 = await fx.upgrade({
      relicId: "solar_spear",
      mode: "standard",
      expectedRevision: rev1,
    });
    assert.equal(up1.statusCode, 200);
    assert.equal(up1.payload.upgraded.newRank, 1);
    const spearView = up1.payload.relics.pedestals.find((p: any) => p.id === "solar_spear");
    assert.equal(spearView.rank, 1);
    assert.equal(spearView.isRestored, true);
  });

  it("unlocks primordial_corridor at Curator Lv.4 and settles deep astral_dust vein jackpots accurately", () => {
    const state = defaultEnhancedPlayerState(pack.version);
    const ar = ensureAstralRelics(state, T_DAY1);
    const ct = ensureCaravanTrade(state, T_DAY1);
    ar.expeditionXp = ASTRAL_CURATOR_TIERS[3].minXp;
    ar.curatorRank = 4;
    ar.totalSurveys = 2; // next (#3) is vein jackpot!
    ct.astralCrystalDust = 30;

    const deep = dispatchAstralExpedition(state, "primordial_corridor", "astral_dust", T_DAY1);
    assert.equal(deep.ok, true);
    assert.equal(deep.isVeinJackpot, true);
    const corridor = ASTRAL_RUIN_STRATA.find((s) => s.id === "primordial_corridor")!;
    const expectedShards =
      corridor.modes.astral_dust.baseShards +
      ASTRAL_CURATOR_TIERS[3].surveyBonusShards +
      corridor.veinBonus.shards;
    assert.equal(deep.shardsGained, expectedShards);
  });

  it("rejects coin and astral_dust surveys or pedestal upgrades cleanly when funds are insufficient without mutating state", () => {
    const state = defaultEnhancedPlayerState(pack.version);
    state.inventory.gold = 10;
    const ar = ensureAstralRelics(state, T_DAY1);
    const ct = ensureCaravanTrade(state, T_DAY1);
    ar.ancientRelicShards = 1;
    ct.astralCrystalDust = 1;

    assert.equal(dispatchAstralExpedition(state, "outpost_ruins", "coin", T_DAY1).ok, false);
    assert.equal(dispatchAstralExpedition(state, "outpost_ruins", "astral_dust", T_DAY1).ok, false);
    assert.equal(upgradeSacredRelicPedestal(state, pack, "solar_spear", "standard", T_DAY1).ok, false);
    assert.equal(upgradeSacredRelicPedestal(state, pack, "solar_spear", "astral_dust", T_DAY1).ok, false);
    assert.equal(state.inventory.gold, 10);
    assert.equal(ar.ancientRelicShards, 1);
    assert.equal(ct.astralCrystalDust, 1);
  });

  it("reaches Curator Rank Lv.6 max progress (100%) and exposes complete getAstralRelicsInfo resonance views", () => {
    const state = defaultEnhancedPlayerState(pack.version);
    const ar = ensureAstralRelics(state, T_DAY1);
    ar.expeditionXp = 1200;
    ar.curatorRank = 6;
    ar.pedestalRanks = {
      solar_spear: 3,
      verdant_chalice: 3,
      titan_anvil: 3,
      chimera_censer: 3,
    };
    const info = getAstralRelicsInfo(state, pack, T_DAY1);
    assert.equal(info.curatorTier.level, 6);
    assert.equal(info.curatorTier.progressPct, 100);
    assert.equal(info.curatorTier.nextLevelXp, null);
    assert.equal(info.fullGalleryResonance.activeTier, 3);
    assert.equal(info.fullGalleryResonance.next?.tier, 4);
  });
});
