import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  noteSeasonRelic,
  noteShinySpecies,
  resolveSeasonRelicDef,
  rollSeasonRelic,
  seasonRelicLines,
  shinyGalleryEntries,
  shinyUniqueCount,
  syncShinyGalleryFromMons,
  buildShinyShareText,
  shinyShareCardPayload,
  ATLAS_ELEMENTS,
  ELEMENTAL_BOND_DEFS,
  computeElementalBondResonance,
  setAttunedElementalBond,
  setBondAtlasActivePair,
  autofillBondAtlasResonance,
  claimBondAtlasMilestone,
  applyBondCombatStats,
  ECO_SANDBOX_ZONES,
  ECO_RELIC_DEFS,
  ensureEcoSandboxState,
  computeEcoRelicAura,
  getIdleEcoSandboxCandidates,
  evaluateEcoSquadAffinity,
  autoPickEcoSandboxSquad,
  dispatchEcoSandboxZone,
  autoDispatchAllEcoSandbox,
  advanceEcoSandbox,
  syncEcoSandboxWallClock,
  getEcoSandboxFreeSurveysLeft,
  instantCompleteEcoSandboxZone,
  claimEcoSandboxZone,
  claimAllEcoSandboxZones,
  CAMP_RECIPE_DEFS,
  STAR_CAMP_MAX_FEAST_SEC,
  ensureStarCampState,
  evaluateStarCampHarmony,
  computeStarCampAura,
  toggleStarCampCompanion,
  setStarCampSquad,
  clearStarCampSquad,
  autoFillStarCampSquad,
  advanceStarCamp,
  syncStarCampWallClock,
  getStarCampEnsembleLeft,
  performStarCampEnsemble,
  cookCampRecipe,
  BOUTIQUE_ACCESSORY_DEFS,
  BOUTIQUE_SHEEN_STYLES,
  STAR_BOUTIQUE_DAILY_SAND_GRANT,
  ensureStarBoutiqueState,
  canClaimDailyStarSand,
  claimDailyStarSand,
  canSynthesizeStarSand,
  synthesizeStarSand,
  craftOrUpgradeBoutiqueAccessory,
  equipBoutiqueAccessory,
  unequipBoutiqueAccessory,
  unlockOrApplyBoutiqueSheen,
  unequipBoutiqueStyle,
  getBoutiqueStyledMonIds,
  getMonBoutiqueBonus,
  computeStarBoutiqueAura,
  AMBER_IMPRINT_MAX_LEVEL,
  AMBER_REVIVAL_DAILY_GRANT,
  PRIMAL_IMPRINT_DEFS,
  ensureAmberRevivalState,
  canClaimDailyAncientAmber,
  claimDailyAncientAmber,
  canSynthesizeAncientAmber,
  synthesizeAncientAmber,
  awakenOrUpgradePrimalImprint,
  equipPrimalImprint,
  unequipPrimalImprint,
  getAmberImprintedMonIds,
  getMonPrimalImprintBonus,
  computeAmberRevivalAura,
  refinePartnerIvWithAmber,
  advanceAmberIvTraining,
  getCampUnavailableMonIds,
  WISH_DOCK_ROUTES,
  OCEAN_BADGE_DEFS,
  OCEAN_TREASURE_DEFS,
  WISH_REPLY_LETTERS,
  WISH_DOCK_DAILY_FREE_BOTTLES,
  WISH_DOCK_BADGE_MAX_LEVEL,
  WISH_DOCK_BOTTLE_COIN,
  WISH_DOCK_OPEN_BATCH,
  ensureWishDockState,
  getWishDockAwayMonIds,
  getIdleWishDockCandidates,
  evaluateWishDockCrew,
  canClaimDailyDriftBottles,
  claimDailyDriftBottles,
  autoPickWishDockCrew,
  toggleWishDockStagedMon,
  dispatchWishDockRoute,
  advanceWishDock,
  breezeCompleteWishDockRoute,
  claimAllWishDockRoutes,
  openDriftBottles,
  forgeOceanBadge,
  recallWishDockRoute,
  computeWishDockAura,
  NIGHT_OBS_CYCLE_SEC,
  NIGHT_OBS_DUSK_AURA_MUL,
  NIGHT_OBS_DUSK_SIGHTING_MUL,
  NIGHT_OBS_FORM_COST,
  NIGHT_OBS_MAX_STATION,
  NIGHT_OBS_PATROL_SIGHTINGS,
  NOCTURNAL_CREATURE_DEFS,
  NOCTURNAL_FORM_DEFS,
  advanceNightObservatory,
  autoFillNightObservatory,
  awakenNocturnalForm,
  computeNightObservatoryAura,
  ensureNightObservatoryState,
  evaluateNightObservers,
  getIdleNightObservatoryCandidates,
  getMonNocturnalFormBonus,
  getNightObservatoryPhase,
  getNightObservatoryStationedMonIds,
  getNightPatrolFreeLeft,
  getNocturnalCreatureDef,
  getNocturnalFormDefForMon,
  performLanternPatrol,
  recallNightObservatory,
  toggleNightObservatoryMon,
  SKY_ISLAND_FACILITY_DEFS,
  SKY_ISLAND_MAX_CREW,
  SKY_ISLAND_MAX_LEVEL,
  advanceSkyIsland,
  autoFillSkyIslandCrew,
  canStartSkyIslandBuild,
  cancelSkyIslandBuild,
  computeSkyIslandAura,
  ensureSkyIslandState,
  evaluateSkyIslandCrew,
  getIdleSkyIslandCandidates,
  getSkyIslandBuildSec,
  getSkyIslandCrewMonIds,
  getSkyIslandRallyFreeLeft,
  getSkyIslandUpgradeCost,
  performSkyIslandRally,
  recallSkyIslandCrew,
  startSkyIslandBuild,
  toggleSkyIslandCrewMon,
} from "../modules/systems/collection_fun.js";
import { computeTechEffects } from "../modules/systems/effects.js";
import { finalizeProductionRates } from "../modules/systems/production.js";
import { busyMonIds, pickWeakMonIds, releaseMonIds } from "../modules/systems/mon_release.js";
import { computeBreedingShinyInfo, getInheritedIvKeyCount } from "../modules/systems/breeding.js";
import { cloneMonForNatalRebirth } from "../modules/systems/rebirth.js";
import { confirmPrestige, emptyEraState, bumpEraCounter, syncEraQuests } from "../modules/systems/era.js";
import { ERA_DEFS } from "../modules/defs_eras.js";
import { evaluateDuoSynergy, computeDualSanctumBadgeBonus, getAcrobatUnavailableMonIds } from "../modules/systems/pve_tower.js";
import { WEBP_UI_ICONS, renderResSvg, renderUiIcon } from "../modules/render/rpg_svg_icons.js";
import {
  MINT_TUNING_PRESETS,
  formatMonNatureWithTuning,
  applyMintTuningToMon,
  getMonCurrentStats,
  monPower,
} from "../modules/mons.js";
import { simulateBattle, simulateDualBattle } from "../modules/pve_battle.js";
import { defaultState, serializeState, loadFromRaw } from "../modules/state.js";
import * as CF from "../modules/systems/collection_fun.js";
import * as PT from "../modules/systems/pve_tower.js";

{
  const def = resolveSeasonRelicDef("s2");
  assert.equal(def.id, "vial_sigil", "s2 relic");
  const miss = rollSeasonRelic("s1", () => 0.99);
  assert.equal(miss, null, "high roll miss");
  const hit = rollSeasonRelic("s1", () => 0);
  assert.ok(hit && hit.item === "rareCandy", "low roll hit");
  const state = { meta: {} };
  const noted = noteSeasonRelic(state, hit);
  assert.equal(noted.count, 1, "relic count");
  assert.equal(seasonRelicLines(state).length, 1, "relic lines");
}

{
  const state = { dex: { caught: {} }, meta: {} };
  const mile1 = noteShinySpecies(state, { id: "p001b", dex: 1, name: "芽苞苞" });
  assert.equal(mile1?.item, "rareCandy", "first shiny milestone");
  assert.equal(shinyUniqueCount(state), 1, "unique 1");
  const again = noteShinySpecies(state, { id: "p001b", dex: 1, name: "芽苞苞" });
  assert.equal(again, null, "dup no mile");
  noteShinySpecies(state, { id: "p002x", dex: 2, name: "叶团团" });
  const mile3 = noteShinySpecies(state, { id: "p003x", dex: 3, name: "花蓬蓬" });
  assert.equal(mile3?.item, "expCandy", "third shiny milestone");
  assert.equal(shinyGalleryEntries(state, 2).length, 2, "gallery limit");
}

{
  const state = {
    dex: { caught: {}, shiny: {} },
    mons: { list: [{ pid: "p25", dex: 25, name: "星雷灵鼠", isShiny: true }] },
  };
  const n = syncShinyGalleryFromMons(state);
  assert.equal(n, 1, "sync added");
  assert.equal(shinyUniqueCount(state), 1, "synced unique");
  assert.equal(state.meta?.shinyMilestones?.s1, undefined, "silent sync no mile");
}

{
  const state = {
    dex: {
      shiny: {
        p25: { dex: 25, name: "星雷灵鼠", at: 3 },
        p001b: { dex: 1, name: "芽苞苞", at: 2 },
      },
    },
  };
  const text = buildShinyShareText(state);
  assert.ok(text.includes("星雷灵鼠") && text.includes("闪光馆"), "share text");
  assert.equal(shinyShareCardPayload(state).unique, 2, "share card unique");
}

// ML-4: Elemental Bond Resonance Atlas (6 elements, 3-tier progression, attunement, active pair & global hooks)
{
  assert.deepEqual(
    [...ATLAS_ELEMENTS],
    ["fire", "water", "wind", "grass", "light", "dark"],
    "ML-4 atlas covers fire/water/wind/grass/light/dark",
  );
  assert.equal(ELEMENTAL_BOND_DEFS.length, 6, "ML-4 defines 6 multi-element ecological bonds");

  const mockTypesMap = {
    1: ["grass"],
    2: ["grass"],
    3: ["grass"],
    4: ["fire"],
    5: ["fire"],
    6: ["fire", "wind"],
    7: ["water"],
    8: ["water"],
    9: ["water"],
    10: ["grass"],
    11: ["grass"],
    16: ["wind"],
    17: ["wind"],
    18: ["wind"],
    19: ["wind"],
    35: ["light"],
    36: ["light"],
    37: ["fire"],
    58: ["fire"],
    54: ["water"],
    55: ["water"],
    92: ["dark"],
  };

  const emptySnap = computeElementalBondResonance({ dex: { caught: {} }, mons: { list: [] } }, { typesMap: mockTypesMap });
  assert.equal(emptySnap.totalTierScore, 0, "empty dex has 0 bond tiers");
  assert.equal(emptySnap.prodMul, 1, "empty dex prodMul = 1");
  assert.equal(emptySnap.atkMul, 1, "empty dex atkMul = 1");

  // Unlock Tier 1 on ember_gale (fire + wind, 1 each)
  const t1State = {
    dex: { caught: { p004: 1, p016: 1 } },
    mons: { list: [] },
    meta: {},
  };
  const snap1 = computeElementalBondResonance(t1State, { typesMap: mockTypesMap });
  const ember1 = snap1.bonds.find((b) => b.id === "ember_gale");
  assert.equal(ember1.tier, 1, "ember_gale unlocks Tier 1 with 1 fire + 1 wind");
  assert.ok(snap1.prodAdd > 0 && snap1.atkAdd > 0 && snap1.speAdd > 0 && snap1.catchAdd > 0, "Tier 1 grants global bonuses");

  // Unlock Tier 3 on ember_gale (5 fire + 5 wind + 2 starred mons with >=1 two-star) + Tier 1 on twilight_eclipse & steam_bloom
  const richState = {
    dex: {
      caught: {
        p004: 1, p005: 1, p006: 1, p037: 1, p058: 1, // 5 fire (p006 also wind)
        p016: 1, p017: 1, p018: 1, p019: 1,         // +4 wind = 5 wind
        p001: 1, p002: 1, p003: 1,                  // 3 grass
        p007: 1, p008: 1, p009: 1,                  // 3 water
        p035: 1, p092: 1,                           // 1 light + 1 dark
      },
    },
    mons: {
      list: [
        { id: 101, dex: 6, name: "焚天炽翼龙", lvl: 50, stars: 2, types: ["fire", "wind"] },
        { id: 102, dex: 18, name: "苍穹羽皇", lvl: 45, stars: 1, types: ["wind"] },
        { id: 103, dex: 7, name: "沧澜幼龟", lvl: 30, stars: 1, types: ["water"] },
      ],
    },
    meta: {},
    tech: {},
    buildings: {},
    permanentBoosts: { production: 0, capture: 0 },
  };

  const snapRich = computeElementalBondResonance(richState, { typesMap: mockTypesMap });
  const ember3 = snapRich.bonds.find((b) => b.id === "ember_gale");
  assert.equal(ember3.tier, 3, "ember_gale reaches Tier 3 with 5+ species each and starred mons");
  assert.ok(snapRich.totalTierScore >= 8, `expected totalTierScore >= 8, got ${snapRich.totalTierScore}`);

  // Attune switch & locked bond rejection
  const lockTry = setAttunedElementalBond(richState, "unknown_bond", { typesMap: mockTypesMap });
  assert.equal(lockTry.ok, false, "invalid bond rejected");
  const attuneTide = setAttunedElementalBond(richState, "tide_grove", { typesMap: mockTypesMap });
  assert.equal(attuneTide.ok, true, "unlocked bond can be attuned");

  // Active pair binding & autofill amplification
  const dupPair = setBondAtlasActivePair(richState, 101, 101, { typesMap: mockTypesMap });
  assert.equal(dupPair.ok, false, "duplicate mon pair rejected");
  const beforeAuto = computeElementalBondResonance(richState, { typesMap: mockTypesMap });
  const autoRes = autofillBondAtlasResonance(richState, { typesMap: mockTypesMap });
  assert.equal(autoRes.ok, true, "autofill bond resonance succeeds");
  assert.equal(autoRes.pairAmpActive, true, "autofill activates resonant pair amplification");
  const afterAuto = computeElementalBondResonance(richState, { typesMap: mockTypesMap });
  assert.ok(afterAuto.prodAdd > beforeAuto.prodAdd && afterAuto.atkAdd > beforeAuto.atkAdd, "active pair boosts global resonance");

  // Milestone claim & anti-duplicate guard
  const claim1 = claimBondAtlasMilestone(richState, "atlas_t3", { typesMap: mockTypesMap });
  assert.equal(claim1.ok, true, "atlas_t3 milestone claimable");
  assert.equal(claim1.rewards.futurecoin, 180, "atlas_t3 grants 180 futurecoin");
  const claimDup = claimBondAtlasMilestone(richState, "atlas_t3", { typesMap: mockTypesMap });
  assert.equal(claimDup.ok, false, "duplicate milestone claim blocked");

  // Combat stat hook & production/capture integration
  globalThis.BEAST_TYPES = { ...(globalThis.BEAST_TYPES || {}), ...mockTypesMap };
  const baseStats = { hp: 200, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 };
  const boostedStats = applyBondCombatStats(baseStats, richState);
  assert.ok(
    boostedStats.atk > 100 && boostedStats.def > 100 && boostedStats.spe > 100,
    "applyBondCombatStats boosts ATK, DEF, and SPD",
  );
  const techEff = computeTechEffects(richState, { tech: {} }, { serverBuffLevels: new Map() });
  assert.ok(techEff.catchChanceAdd >= afterAuto.catchAdd, "computeTechEffects includes bond catchAdd");
  const prodEff = { catnipPerSec: 10, woodPerSec: 10, mineralsPerSec: 10 };
  finalizeProductionRates(prodEff, richState, 1);
  assert.ok(prodEff.catnipPerSec > 5, "finalizeProductionRates multiplies resource yield by bond prodMul");
}

// ML-5: Secret Realm Eco-Exploration Sandbox & Temperament Mint Directed Tuning Workshop
{
  const projRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
  for (const iconKey of ["ecoCanopy", "ecoCaldera", "ecoTidepool", "ecoAstral", "tuningMint", "ecoRelic"]) {
    const iconFile = path.join(projRoot, "assets", "ui_icons", `${iconKey}.webp`);
    assert.ok(existsSync(iconFile), `ML-5 UI icon exists: ${iconKey}.webp`);
  }

  assert.equal(ECO_SANDBOX_ZONES.length, 4, "ML-5 defines 4 ecological sandbox biomes");
  assert.equal(ECO_RELIC_DEFS.length, 8, "ML-5 defines 8 ancient eco-relics");
  assert.ok(MINT_TUNING_PRESETS.length >= 7, "ML-5 defines >= 7 temperament mint tuning presets");

  const st = defaultState();
  ensureEcoSandboxState(st);
  st.res.tuningMint.value = 3;
  st.res.searchFlare.value = 1;
  st.res.futurecoin.value = 50;

  // Seed busy companions vs idle companions
  st.mons.list = [
    {
      id: 1,
      dex: 6,
      pid: "p006",
      name: "焚天炽翼龙",
      lvl: 40,
      stars: 2,
      types: ["fire", "wind"],
      ability: "hugePower",
      nature: "timid",
      baseStats: { hp: 78, atk: 84, def: 78, spa: 109, spd: 85, spe: 100 },
      iv: { hp: 10, atk: 12, def: 8, spa: 14, spd: 9, spe: 11 },
    },
    {
      id: 2,
      dex: 3,
      pid: "p003",
      name: "花蓬蓬",
      lvl: 35,
      stars: 1,
      types: ["grass", "wind"],
      ability: "harvest",
      nature: "modest",
      baseStats: { hp: 80, atk: 82, def: 83, spa: 100, spd: 100, spe: 80 },
      iv: { hp: 8, atk: 6, def: 8, spa: 12, spd: 10, spe: 7 },
    },
    {
      id: 3,
      dex: 18,
      pid: "p018",
      name: "苍穹羽皇",
      lvl: 30,
      stars: 1,
      types: ["wind", "water"],
      ability: "keenEye",
      nature: "adamant",
      baseStats: { hp: 83, atk: 80, def: 75, spa: 70, spd: 70, spe: 101 },
      iv: { hp: 6, atk: 9, def: 6, spa: 5, spd: 6, spe: 12 },
    },
    {
      id: 4,
      dex: 25,
      pid: "p025",
      name: "星雷灵鼠",
      lvl: 28,
      stars: 0,
      types: ["electric", "fire"],
      ability: "sturdy",
      nature: "jolly",
      baseStats: { hp: 55, atk: 75, def: 50, spa: 75, spd: 60, spe: 95 },
      iv: { hp: 5, atk: 8, def: 5, spa: 8, spd: 5, spe: 10 },
    },
    {
      id: 5,
      dex: 9,
      pid: "p009",
      name: "玄浪甲卫",
      lvl: 32,
      stars: 1,
      types: ["water", "light"],
      ability: "thickFat",
      nature: "bold",
      baseStats: { hp: 79, atk: 83, def: 100, spa: 85, spd: 105, spe: 78 },
      iv: { hp: 9, atk: 5, def: 11, spa: 8, spd: 11, spe: 6 },
    },
    {
      id: 6,
      dex: 92,
      pid: "p092",
      name: "幽影星灵",
      lvl: 36,
      stars: 2,
      isShiny: true,
      types: ["dark", "mystic"],
      ability: "illuminate",
      nature: "calm",
      baseStats: { hp: 60, atk: 65, def: 60, spa: 115, spd: 75, spe: 110 },
      iv: { hp: 7, atk: 4, def: 6, spa: 15, spd: 8, spe: 14 },
    },
    {
      id: 7,
      dex: 4,
      pid: "p004",
      name: "小火苗",
      lvl: 12,
      stars: 0,
      types: ["fire"],
      ability: "blaze",
      nature: "hardy",
      baseStats: { hp: 39, atk: 52, def: 43, spa: 60, spd: 50, spe: 65 },
      iv: { hp: 2, atk: 2, def: 2, spa: 2, spd: 2, spe: 2 },
    },
  ];

  // Mark id=1 as active PvE & natalBond, id=7 as Dual Sanctum partner -> neither may be picked by Eco-Sandbox!
  st.pve.selectedIds = [1];
  st.meta.natalBondMonId = 1;
  st.pve.dualSanctum = { primaryId: null, partnerId: 7 };

  const idleCands = getIdleEcoSandboxCandidates(st, "canopy").map((m) => m.id);
  assert.ok(!idleCands.includes(1) && !idleCands.includes(7), "busy PvE / natal / Dual Sanctum companions excluded from Eco-Sandbox");
  assert.deepEqual(idleCands, [2, 3, 4, 5, 6], "all truly idle companions available for Eco-Sandbox");

  // Reject manual dispatch of busy companions id=1 (PvE/natal) & id=7 (Dual Sanctum)
  const badDispatch = dispatchEcoSandboxZone(st, "canopy", [1, 7]);
  assert.equal(badDispatch.ok, false, "dispatchEcoSandboxZone rejects busy party/natal/Dual Sanctum squad");

  // Affinity scaling check: matching grass/wind + harvest/keenEye beats mismatched low-level squad
  const highEval = evaluateEcoSquadAffinity("canopy", [st.mons.list[1], st.mons.list[2]], st);
  const lowEval = evaluateEcoSquadAffinity("canopy", [st.mons.list[3]], st);
  assert.ok(highEval.affinityMul > lowEval.affinityMul, "matching biome types & abilities increase affinityMul");
  assert.ok(highEval.durationSec < 900, "matching biome abilities shorten exploration durationSec");

  // Auto-pick & dispatch canopy, verify busyMonIds bidirectional protection
  const picked = autoPickEcoSandboxSquad(st, "canopy");
  assert.equal(picked.ok, true, "autoPickEcoSandboxSquad succeeds on canopy");
  assert.ok(picked.stagedIds.includes(2) && picked.stagedIds.includes(3), "autoPick selects high-affinity grass/wind companions");
  const dispCanopy = dispatchEcoSandboxZone(st, "canopy", null, { nowMs: 1_000_000 });
  assert.equal(dispCanopy.ok, true, "dispatchEcoSandboxZone starts canopy exploration");

  const busyAfterDispatch = busyMonIds(st);
  for (const sid of st.meta.ecoSandbox.zones.canopy.squadIds) {
    assert.ok(busyAfterDispatch.has(sid), `dispatched Eco-Sandbox companion #${sid} protected in busyMonIds`);
  }

  // Auto-dispatch remaining zones with remaining idle companions
  const autoAll = autoDispatchAllEcoSandbox(st, { nowMs: 1_000_000 });
  assert.equal(autoAll.ok, true, "autoDispatchAllEcoSandbox dispatches remaining idle companions");

  // Tick progression + wall-clock offline sync
  advanceEcoSandbox(st, 300, { nowMs: 1_300_000 });
  assert.equal(st.meta.ecoSandbox.zones.canopy.elapsedSec, 300, "advanceEcoSandbox advances elapsedSec");
  syncEcoSandboxWallClock(st, 1_300_000 + 2_000_000);
  assert.equal(st.meta.ecoSandbox.zones.canopy.completed, true, "syncEcoSandboxWallClock completes exploration after offline elapsed time");

  // Claim canopy -> grants tuningMint, companion EXP, and guaranteed 1st-clear relic!
  const mintBeforeClaim = st.res.tuningMint.value;
  const mon2ExpBefore = st.mons.list[1].exp || 0;
  const claimCanopy = claimEcoSandboxZone(st, "canopy", { randFloat: () => 0.1 });
  assert.equal(claimCanopy.ok, true, "claimEcoSandboxZone succeeds when completed");
  assert.ok(st.res.tuningMint.value > mintBeforeClaim, "claiming Eco-Sandbox zone grants tuningMint");
  assert.ok((st.mons.list[1].exp || 0) > mon2ExpBefore, "claiming Eco-Sandbox zone grants companion EXP");
  assert.ok(claimCanopy.relicFound && claimCanopy.relicFound.rank === 1, "first clear of biome guarantees ancient eco-relic discovery");

  // Instant survey quota & resource fallback + claimAll with one-click redispatch
  dispatchEcoSandboxZone(st, "canopy", [2, 3], { nowMs: 5_000_000 });
  assert.equal(getEcoSandboxFreeSurveysLeft(st, 5_000_000), 2, "2 free daily instant surveys initially");
  const inst1 = instantCompleteEcoSandboxZone(st, "canopy", { nowMs: 5_000_000 });
  assert.equal(inst1.ok && inst1.costKind === "free_daily", true, "1st instant survey uses free daily quota");
  const batchClaim = claimAllEcoSandboxZones(st, { redispatch: true, nowMs: 5_000_100, randFloat: () => 0.2 });
  assert.equal(batchClaim.ok, true, "claimAllEcoSandboxZones claims all ready zones");
  assert.equal(st.meta.ecoSandbox.zones.canopy.active, true, "claimAllEcoSandboxZones({ redispatch: true }) automatically re-dispatches squad");

  // Unlock all relics to verify computeEcoRelicAura hooks into combat, production, and capture
  for (const r of ECO_RELIC_DEFS) {
    st.meta.ecoSandbox.relics[r.id] = r.maxRank;
  }
  const relicAura = computeEcoRelicAura(st);
  assert.equal(relicAura.unlockedCount, 8, "all 8 relics unlocked");
  assert.ok(relicAura.prodMul > 1.2 && relicAura.atkMul > 1.05 && relicAura.defMul > 1.05 && relicAura.speMul > 1.05, "relic aura aggregates prod/atk/def/spe multipliers");

  const rawCombat = { hp: 200, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 };
  const relicBoostedCombat = applyBondCombatStats(rawCombat, st);
  assert.ok(relicBoostedCombat.atk > 105 && relicBoostedCombat.def > 105 && relicBoostedCombat.spe > 105, "applyBondCombatStats applies eco-relic combat multipliers");

  const relicProd = { catnipPerSec: 10, woodPerSec: 10, mineralsPerSec: 10 };
  finalizeProductionRates(relicProd, st, 1);
  assert.ok(relicProd.catnipPerSec > 10 * 0.65 * 1.2, "finalizeProductionRates includes eco-relic prodMul");

  const relicTech = computeTechEffects(st, { tech: {} }, { serverBuffLevels: new Map() });
  assert.ok(relicTech.catchChanceAdd >= relicAura.catchAdd, "computeTechEffects includes eco-relic catchAdd");

  // Temperament Mint Directed Tuning Workshop: +10%/-10% & neutral, commemorative nature preservation, CP & PvE/Dual battle wiring, save/rebirth persistence
  const targetMon = st.mons.list[0]; // id=1, orig nature = "timid" (怯生)
  const untunedStats = getMonCurrentStats(targetMon);
  const untunedCp = monPower(targetMon);
  assert.equal(formatMonNatureWithTuning(targetMon), "怯生", "untuned companion displays original nature");

  // Reject invalid same-stat tuning
  const invalidTune = applyMintTuningToMon(st, 1, { up: "spa", down: "spa" });
  assert.equal(invalidTune.ok, false, "same up/down stat tuning rejected");

  // Apply +10% SpA / -10% Atk ("灵韵专精")
  const mintBeforeTune = st.res.tuningMint.value;
  const tuneRes = applyMintTuningToMon(st, 1, { up: "spa", down: "atk" });
  assert.equal(tuneRes.ok, true, "applyMintTuningToMon succeeds with valid +10%/-10% spec");
  assert.equal(st.res.tuningMint.value, mintBeforeTune - 1, "applyMintTuningToMon consumes 1 tuningMint");
  assert.equal(targetMon.nature, "timid", "original commemorative nature id is preserved untouched");
  assert.ok(
    formatMonNatureWithTuning(targetMon).includes("怯生 →") && formatMonNatureWithTuning(targetMon).includes("灵攻+10%"),
    "formatMonNatureWithTuning displays 原性格 → 调律偏向",
  );

  // Duplicate identical tuning blocked so player cannot waste mints accidentally
  const dupTune = applyMintTuningToMon(st, 1, { up: "spa", down: "atk" });
  assert.equal(dupTune.ok && true, false, "duplicate identical tuning blocked");
  assert.equal(dupTune.reason, "same_tuning", "duplicate tuning returns same_tuning reason");

  const tunedStats = getMonCurrentStats(targetMon);
  const tunedCp = monPower(targetMon);
  assert.ok(tunedStats.spa > untunedStats.spa, "tuned +10% stat increases in getMonCurrentStats");
  assert.ok(tunedStats.atk < untunedStats.atk, "tuned -10% stat decreases in getMonCurrentStats");
  assert.notEqual(tunedCp, untunedCp, "monPower CP reflects directed mint tuning");

  // Verify PvE & Dual Sanctum battle engines consume tuned stats cleanly
  const battleUnit1 = { ...targetMon, stats: applyBondCombatStats(getMonCurrentStats(targetMon), st) };
  const battleUnit2 = { ...st.mons.list[1], stats: applyBondCombatStats(getMonCurrentStats(st.mons.list[1]), st) };
  const pveSim = simulateBattle(
    [battleUnit1],
    [{ dex: 4, lvl: 12, name: "试炼火苗A", power: 120, types: ["fire"] }],
    "fire",
  );
  assert.equal(pveSim.win, true, "simulateBattle runs cleanly with mint-tuned companion");
  const dualSim = simulateDualBattle(
    battleUnit1,
    battleUnit2,
    [
      { dex: 4, lvl: 12, name: "试炼火苗A", power: 120, types: ["fire"] },
      { dex: 7, lvl: 12, name: "试炼幼龟B", power: 120, types: ["water"] },
    ],
    "fire",
  );
  assert.equal(dualSim.win, true, "simulateDualBattle runs cleanly with mint-tuned companion");

  // Save/Load roundtrip & Natal Rebirth clone preservation
  const rawJson = JSON.parse(JSON.stringify(serializeState(st)));
  const reloaded = loadFromRaw(rawJson);
  const reloadedMon = reloaded.mons.list.find((m) => m && m.id === 1);
  assert.deepEqual(reloadedMon.mintTuning, { up: "spa", down: "atk" }, "mintTuning survives serializeState -> loadFromRaw");
  assert.equal(reloaded.meta.ecoSandbox.relics.relic_emerald_dew, 3, "ecoSandbox relics survive serializeState -> loadFromRaw");

  const rebornClone = cloneMonForNatalRebirth(targetMon, 99);
  assert.deepEqual(rebornClone.mintTuning, { up: "spa", down: "atk" }, "mintTuning survives natal-bond rebirth clone");
  assert.equal(rebornClone.nature, "timid", "original commemorative nature survives natal-bond rebirth clone");

  // Neutral reset tuning ("心平归元": up=null, down=null) restores 1.0x stats while keeping commemorative tuning record
  st.res.tuningMint.value = Math.max(1, st.res.tuningMint.value);
  const neutralRes = applyMintTuningToMon(st, 1, { up: null, down: null });
  assert.equal(neutralRes.ok, true, "neutral 心平归元 tuning succeeds");
  const neutralStats = getMonCurrentStats(targetMon);
  assert.deepEqual(neutralStats, untunedStats, "neutral 心平归元 tuning restores exact 1.0x stats");
  assert.ok(formatMonNatureWithTuning(targetMon).includes("怯生 → 心平归元"), "neutral tuning shows 原性格 → 心平归元");
}

// ============================================================================
// ML-6: 萌灵「星界羁绊露营野餐屋」与料理食谱风味增益工坊
// ============================================================================
{
  const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
  for (const iconKey of [
    "campTentStar",
    "campCookingPot",
    "dishBerryTart",
    "dishFlameSkewers",
    "dishMoonSoup",
    "campPicnicBasket",
  ]) {
    assert.ok(
      existsSync(path.join(rootDir, "assets", "ui_icons", `${iconKey}.webp`)),
      `ML-6 icon asset exists: ${iconKey}.webp`,
    );
    const uiTag = renderUiIcon(iconKey, 24);
    const resTag = renderResSvg(iconKey, 20);
    assert.ok(
      uiTag.includes(`${iconKey}.webp?v=0.7.63`) && resTag.includes(`${iconKey}.webp?v=0.7.63`),
      `rpg_svg_icons wires ${iconKey}.webp?v=0.7.63`,
    );
  }

  const st = defaultState();
  // Baseline uninitialized check: zero unintended buff drift
  const baseCampAura = computeStarCampAura(st);
  assert.equal(baseCampAura.prodMul, 1, "uninitialized starCamp prodMul === 1");
  assert.equal(baseCampAura.catchAdd, 0, "uninitialized starCamp catchAdd === 0");
  assert.equal(baseCampAura.pveComboMul, 1, "uninitialized starCamp pveComboMul === 1");

  st.mons.list = [
    { id: 1, dex: 3, pid: "p003", name: "花蓬蓬", lvl: 30, stars: 1, affection: 20, types: ["grass", "wind"], nature: "jolly", baseStats: { hp: 80, atk: 82, def: 83, spa: 100, spd: 100, spe: 80 }, iv: { hp: 8, atk: 8, def: 8, spa: 8, spd: 8, spe: 8 } },
    { id: 2, dex: 6, pid: "p006", name: "焰翼龙", lvl: 32, stars: 1, affection: 15, types: ["fire"], nature: "brave", baseStats: { hp: 78, atk: 84, def: 78, spa: 109, spd: 85, spe: 100 }, iv: { hp: 8, atk: 8, def: 8, spa: 8, spd: 8, spe: 8 } },
    { id: 3, dex: 9, pid: "p009", name: "沧澜龟", lvl: 28, stars: 1, affection: 10, types: ["water"], nature: "calm", baseStats: { hp: 79, atk: 83, def: 100, spa: 85, spd: 105, spe: 78 }, iv: { hp: 8, atk: 8, def: 8, spa: 8, spd: 8, spe: 8 } },
    { id: 4, dex: 25, pid: "p025", name: "星雷灵鼠", lvl: 26, stars: 0, affection: 12, types: ["electric"], nature: "hasty", baseStats: { hp: 55, atk: 55, def: 40, spa: 50, spd: 50, spe: 90 }, iv: { hp: 6, atk: 6, def: 6, spa: 6, spd: 6, spe: 6 } },
    { id: 5, dex: 37, pid: "p037", name: "暖尾狐", lvl: 18, stars: 0, affection: 5, types: ["fire"], nature: "timid", baseStats: { hp: 45, atk: 41, def: 40, spa: 50, spd: 65, spe: 65 }, iv: { hp: 5, atk: 5, def: 5, spa: 5, spd: 5, spe: 5 } },
    { id: 6, dex: 10, pid: "p010", name: "毛茸茸", lvl: 3, stars: 0, affection: 0, types: ["grass"], nature: "hardy", baseStats: { hp: 45, atk: 30, def: 35, spa: 20, spd: 20, spe: 45 }, iv: { hp: 1, atk: 1, def: 1, spa: 1, spd: 1, spe: 1 } },
  ];
  st.mons.nextId = 7;

  // One-click cozy squad fill stations 4 diverse companions & activates Rainbow Harmony
  const fillRes = autoFillStarCampSquad(st, { nowMs: 10_000_000 });
  assert.equal(fillRes.ok, true, "autoFillStarCampSquad succeeds");
  assert.equal(fillRes.stationedIds.length, 4, "autoFillStarCampSquad fills up to 4 camp slots");
  assert.equal(fillRes.harmony.id, "rainbow_harmony", "4 diverse companions activate 星虹万象共鸣");

  // Stationed companions are protected in busyMonIds and skipped by pickWeakMonIds
  const busySet = busyMonIds(st);
  for (const cid of fillRes.stationedIds) {
    assert.ok(busySet.has(cid), `stationed camp companion #${cid} is protected in busyMonIds`);
  }
  const weakDrop = pickWeakMonIds(st.mons.list, { softLimit: 1, batch: 10, protectIds: busySet });
  for (const cid of fillRes.stationedIds) {
    assert.ok(!weakDrop.includes(cid), `pickWeakMonIds never drops stationed camp companion #${cid}`);
  }

  // Flexible swap: matching-element squad activates 同源星火共鸣 (elemental_chorus)
  setStarCampSquad(st, [2, 5], { nowMs: 10_000_000 });
  const chorusHarmony = evaluateStarCampHarmony([st.mons.list[1], st.mons.list[4]]);
  assert.equal(chorusHarmony.id, "elemental_chorus", "matching fire companions activate 同源星火共鸣");
  toggleStarCampCompanion(st, 1);
  toggleStarCampCompanion(st, 3);
  assert.equal(st.meta.starCamp.stationedIds.length, 4, "toggleStarCampCompanion flexibly adds up to 4 companions");

  // Live tick + wall-clock offline sync advance affection, pantry harvest, and Camp EXP
  const herb0 = st.meta.starCamp.pantry.picnicHerb;
  const berry0 = st.meta.starCamp.pantry.starBerry;
  const affBefore = st.mons.list[1].affection;
  const tickStep = advanceStarCamp(st, 360, { nowMs: 10_360_000 });
  assert.ok(tickStep.forageCycles >= 2, "advanceStarCamp completes forage cycles over 360s");
  assert.ok(st.meta.starCamp.pantry.picnicHerb > herb0 && st.meta.starCamp.pantry.starBerry > berry0, "advanceStarCamp harvests camp pantry ingredients");
  assert.ok(st.mons.list[1].affection > affBefore, "advanceStarCamp raises stationed companion affection");

  const affMid = st.mons.list[1].affection;
  const offlineRes = syncStarCampWallClock(st, 10_360_000 + 1_800_000);
  assert.ok(offlineRes.syncedSec >= 1799 && offlineRes.forageCycles >= 5, "syncStarCampWallClock catches up offline camp progress");
  assert.ok(st.mons.list[1].affection > affMid, "offline wall-clock sync grants additional companion intimacy");

  // Daily 「营火合奏互动」 grants burst intimacy, campToken, and personality flavor log (capped at 2/day)
  assert.equal(getStarCampEnsembleLeft(st, 12_200_000), 2, "2 daily ensemble interactions available initially");
  const ens1 = performStarCampEnsemble(st, { nowMs: 12_200_000, randFloat: () => 0 });
  assert.equal(ens1.ok, true, "1st campfire ensemble succeeds");
  assert.ok(ens1.pantryGained.campToken === 1 && ens1.flavorLine.includes("【营火合奏】"), "campfire ensemble awards campToken and personality flavor log");
  const ens2 = performStarCampEnsemble(st, { nowMs: 12_200_100, randFloat: () => 0.5 });
  assert.equal(ens2.ok, true, "2nd campfire ensemble succeeds");
  const ens3 = performStarCampEnsemble(st, { nowMs: 12_200_200 });
  assert.equal(ens3.ok, false, "3rd campfire ensemble on same day blocked by daily limit");

  // Stock plenty of ingredients to test all 6 Signature Recipes across 3 Flavor Tiers, Codex 6/6 & 3-Star Mastery
  assert.equal(CAMP_RECIPE_DEFS.length, 6, "6 signature camp recipes defined across 3 flavor tiers");
  st.res.catnip.value = 5000;
  st.res.wood.value = 2000;
  st.res.minerals.value = 2000;
  st.res.futurecoin.value = 1000;
  st.res.tuningMint.value = 30;
  st.meta.starCamp.pantry.picnicHerb = 80;
  st.meta.starCamp.pantry.starBerry = 80;
  st.meta.starCamp.pantry.campToken = 20;

  const baseProdSample = { catnipPerSec: 10, woodPerSec: 10, mineralsPerSec: 10 };
  const bareState = defaultState();
  finalizeProductionRates(baseProdSample, bareState, 1);
  const bareTech = computeTechEffects(bareState, { tech: {} }, { serverBuffLevels: new Map() });
  const bareEcoEval = evaluateEcoSquadAffinity("canopy", [st.mons.list[0]], bareState);
  const bareDuoSyn = evaluateDuoSynergy(["fire"], ["wind"], bareState);

  for (const rDef of CAMP_RECIPE_DEFS) {
    const cRes = cookCampRecipe(st, rDef.id, { nowMs: 13_000_000 });
    assert.equal(cRes.ok && cRes.firstDiscovery, true, `first cook discovers recipe ${rDef.name}`);
  }
  const auraAfter6 = computeStarCampAura(st);
  assert.equal(auraAfter6.codexCount, 6, "all 6 recipes discovered in Camp Codex (6/6)");
  assert.ok(auraAfter6.activeFeasts.length <= 3, "concurrent active feasts bounded cleanly to max 3");

  // Cook 星界满汉野餐篮 up to 6 times -> reaches 3-star mastery & stack-safely caps duration at STAR_CAMP_MAX_FEAST_SEC
  let lastCook = null;
  for (let i = 0; i < 5; i += 1) {
    lastCook = cookCampRecipe(st, "dish_astral_picnic", { nowMs: 13_001_000 + i * 100 });
  }
  assert.equal(lastCook.stars, 3, "6 total cooks upgrade recipe to 3-star mastery");
  const feastEntry = st.meta.starCamp.activeFeasts.find((f) => f.recipeId === "dish_astral_picnic");
  assert.ok(feastEntry && feastEntry.remainingSec <= STAR_CAMP_MAX_FEAST_SEC, "re-cooking same dish extends timer stack-safely up to STAR_CAMP_MAX_FEAST_SEC");
  assert.equal(
    st.meta.starCamp.activeFeasts.filter((f) => f.recipeId === "dish_astral_picnic").length,
    1,
    "re-cooking same dish never creates duplicate activeFeasts entries",
  );

  // Verify all 5 Feast Buff channels: Global Production, Training EXP, Capture Rate, Eco-Sandbox Affinity/Yield, PVE/Dual Combo Damage
  const fullCampAura = computeStarCampAura(st);
  assert.ok(
    fullCampAura.prodMul > 1.3 &&
      fullCampAura.trainExpMul > 1.25 &&
      fullCampAura.catchAdd > 0.05 &&
      fullCampAura.ecoAffinityAdd > 0.15 &&
      fullCampAura.ecoYieldMul > 1.15 &&
      fullCampAura.pveComboMul > 1.2,
    "full camp + 3-star grand picnic feast activates all 5 buff multipliers",
  );

  const feastProdSample = { catnipPerSec: 10, woodPerSec: 10, mineralsPerSec: 10 };
  finalizeProductionRates(feastProdSample, st, 1);
  assert.ok(feastProdSample.catnipPerSec > baseProdSample.catnipPerSec * 1.3, "finalizeProductionRates includes starCamp prodMul");

  const feastTech = computeTechEffects(st, { tech: {} }, { serverBuffLevels: new Map() });
  assert.ok(feastTech.catchChanceAdd > bareTech.catchChanceAdd + 0.05, "computeTechEffects includes starCamp catchAdd");

  const feastEcoEval = evaluateEcoSquadAffinity("canopy", [st.mons.list[0]], st);
  assert.ok(
    feastEcoEval.affinityMul > bareEcoEval.affinityMul &&
      feastEcoEval.previewRewards.catnip > bareEcoEval.previewRewards.catnip,
    "evaluateEcoSquadAffinity boosts affinityMul and previewRewards under Camp Feast",
  );

  const feastDuoSyn = evaluateDuoSynergy(["fire"], ["wind"], st);
  const pveBonus = computeDualSanctumBadgeBonus(st);
  assert.ok(feastDuoSyn.comboMul > bareDuoSyn.comboMul * 1.2, "evaluateDuoSynergy scales Dual-Sanctuary comboMul with Camp Feast");
  assert.ok(pveBonus.pveOutMul > 1.2, "computeDualSanctumBadgeBonus includes Camp Feast PvE/Tower outgoing multiplier");

  // Save/Load roundtrip + Rebirth safety
  const savedRaw = JSON.parse(JSON.stringify(serializeState(st)));
  const hydrated = loadFromRaw(savedRaw);
  const hydratedCamp = ensureStarCampState(hydrated);
  assert.equal(hydratedCamp.recipes.dish_astral_picnic.stars, 3, "3-star recipe mastery survives serializeState -> loadFromRaw");
  assert.equal(hydratedCamp.stationedIds.length, 4, "stationedIds survive serializeState -> loadFromRaw");
  assert.ok(hydratedCamp.activeFeasts.length > 0, "activeFeasts survive serializeState -> loadFromRaw");

  // Unlock & trigger rebirth (confirmPrestige) -> preserves Camp Level, Codex, Pantry & Feasts while clearing stale stationedIds
  hydrated.dex.caught = Object.fromEntries([...Array(155)].map((_, i) => [String(i + 1), 1]));
  hydrated.tech = Object.fromEntries([...Array(16)].map((_, i) => [`t${i}`, true]));
  hydrated.buildings.field.owned = 60;
  hydrated.shinyCount = 5;
  hydrated.catchCount = 999;
  hydrated.era = emptyEraState(ERA_DEFS.length - 1);
  bumpEraCounter(hydrated, "catch_count", 999);
  bumpEraCounter(hydrated, "pokeball_earned", 999);
  bumpEraCounter(hydrated, "gather_total", 999);
  bumpEraCounter(hydrated, "berry_earned", 999);
  syncEraQuests(hydrated);
  const prest = confirmPrestige(hydrated);
  assert.equal(prest.ok, true, "confirmPrestige succeeds with starCamp populated");
  assert.equal(hydrated.meta.starCamp.recipes.dish_astral_picnic.stars, 3, "Camp Recipe Codex & mastery persist across rebirth");
  assert.equal(hydrated.meta.starCamp.stationedIds.length, 0, "confirmPrestige cleanly clears stationedIds so reborn IDs never collide");
  clearStarCampSquad(st);
  assert.equal(st.meta.starCamp.stationedIds.length, 0, "clearStarCampSquad empties stationed slots");
}

// ============================================================================
// ML-7: 萌灵「星辉配饰流彩造型屋」与星砂凝炼/防放生保护/五维增益自检
// ============================================================================
{
  const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
  for (const iconKey of [
    "boutiqueMirrorStar",
    "accAuroraCrown",
    "accCozyScarf",
    "accFairyWings",
    "leagueEliteCrest",
    "leagueChampionRibbon",
  ]) {
    assert.ok(
      existsSync(path.join(rootDir, "assets", "ui_icons", `${iconKey}.webp`)),
      `ML-7 icon asset exists: ${iconKey}.webp`,
    );
    const uiTag = renderUiIcon(iconKey, 24);
    const resTag = renderResSvg(iconKey, 20);
    assert.ok(
      uiTag.includes(`${iconKey}.webp?v=0.7.63`) && resTag.includes(`${iconKey}.webp?v=0.7.63`),
      `rpg_svg_icons wires ${iconKey}.webp?v=0.7.63`,
    );
  }
  assert.ok(
    renderResSvg("shinyStarSand", 16).includes("boutiqueMirrorStar.webp?v=0.7.63"),
    "shinyStarSand resource icon resolves to boutiqueMirrorStar.webp?v=0.7.63",
  );

  const st = defaultState();
  const baseBqAura = computeStarBoutiqueAura(st);
  assert.equal(baseBqAura.prodMul, 1, "uninitialized starBoutique prodMul === 1");
  assert.equal(baseBqAura.shinyChanceMul, 1, "uninitialized starBoutique shinyChanceMul === 1");
  assert.equal(baseBqAura.affGainMul, 1, "uninitialized starBoutique affGainMul === 1");
  assert.equal(baseBqAura.trainExpMul, 1, "uninitialized starBoutique trainExpMul === 1");
  assert.equal(baseBqAura.combatMul, 1, "uninitialized starBoutique combatMul === 1");

  st.mons.list = [
    { id: 1, dex: 6, pid: "p006", name: "炽翼炎龙", lvl: 35, stars: 1, affection: 20, types: ["fire", "wind"], nature: "modest", baseStats: { hp: 78, atk: 84, def: 78, spa: 109, spd: 85, spe: 100 }, iv: { hp: 8, atk: 8, def: 8, spa: 8, spd: 8, spe: 8 } },
    { id: 2, dex: 9, pid: "p009", name: "沧澜重龟", lvl: 34, stars: 1, affection: 15, types: ["water"], nature: "calm", baseStats: { hp: 79, atk: 83, def: 100, spa: 85, spd: 105, spe: 78 }, iv: { hp: 8, atk: 8, def: 8, spa: 8, spd: 8, spe: 8 } },
    { id: 3, dex: 3, pid: "p003", name: "花蓬蓬", lvl: 32, stars: 1, affection: 18, types: ["grass"], nature: "timid", baseStats: { hp: 80, atk: 82, def: 83, spa: 100, spd: 100, spe: 80 }, iv: { hp: 8, atk: 8, def: 8, spa: 8, spd: 8, spe: 8 } },
    { id: 4, dex: 10, pid: "p010", name: "毛茸茸", lvl: 2, stars: 0, affection: 0, types: ["grass"], nature: "hardy", baseStats: { hp: 45, atk: 30, def: 35, spa: 20, spd: 20, spe: 45 }, iv: { hp: 1, atk: 1, def: 1, spa: 1, spd: 1, spe: 1 } },
  ];
  st.mons.nextId = 5;

  // 1) Daily free Star Sand claim (+6) + Gold synthesis (+4) + Camp herb synthesis (+5)
  assert.equal(canClaimDailyStarSand(st, 30_000_000), true, "daily Star Sand claimable initially");
  const d1 = claimDailyStarSand(st, { nowMs: 30_000_000 });
  assert.equal(d1.ok && d1.gained === STAR_BOUTIQUE_DAILY_SAND_GRANT, true, "daily free Star Sand grants +6 shinyStarSand");
  assert.equal(claimDailyStarSand(st, { nowMs: 30_000_500 }).ok, false, "daily free Star Sand cannot be claimed twice on same day");

  st.res.futurecoin.value = 600;
  st.meta.starCamp = {
    initialized: true,
    level: 2,
    pantry: { picnicHerb: 20, starBerry: 20, campToken: 4 },
  };
  assert.equal(canSynthesizeStarSand(st, "gold"), true, "Gold synthesis affordable");
  assert.equal(canSynthesizeStarSand(st, "herb"), true, "Camp-herb synthesis affordable");
  const synGold = synthesizeStarSand(st, "gold");
  const synHerb = synthesizeStarSand(st, "herb");
  assert.equal(synGold.ok && synGold.gained === 4, true, "Gold synthesis grants +4 shinyStarSand");
  assert.equal(synHerb.ok && synHerb.gained === 5, true, "Camp-herb synthesis grants +5 shinyStarSand");
  assert.equal(st.res.shinyStarSand.value, 15, "total shinyStarSand after daily(6)+gold(4)+herb(5) === 15");

  // 2) Craft & upgrade all 3 accessories Lv.1 -> Lv.3, equip onto partners 1..3, and apply Aurora Sheens
  st.res.shinyStarSand.value = 120;
  assert.equal(BOUTIQUE_ACCESSORY_DEFS.length, 3, "3 Boutique keepsake accessories defined");
  assert.equal(BOUTIQUE_SHEEN_STYLES.length, 4, "4 Aurora Sheen styles defined");

  for (let i = 0; i < BOUTIQUE_ACCESSORY_DEFS.length; i += 1) {
    const def = BOUTIQUE_ACCESSORY_DEFS[i];
    for (let targetLvl = 1; targetLvl <= 3; targetLvl += 1) {
      const cRes = craftOrUpgradeBoutiqueAccessory(st, def.id, { equipMonId: i + 1 });
      assert.equal(cRes.ok && cRes.level === targetLvl, true, `${def.id} crafts/upgrades to Lv.${targetLvl}`);
    }
    equipBoutiqueAccessory(st, def.id, i + 1);
  }
  const sh1 = unlockOrApplyBoutiqueSheen(st, "moonlit_mist", 1);
  const sh2 = unlockOrApplyBoutiqueSheen(st, "aurora_prism", 2);
  assert.equal(sh1.ok && sh1.newlyUnlocked && sh2.ok && sh2.newlyUnlocked, true, "Aurora Sheens unlock & apply cleanly");

  const fullBqAura = computeStarBoutiqueAura(st);
  assert.equal(fullBqAura.craftedCount, 3, "all 3 accessories crafted");
  assert.equal(fullBqAura.totalLevels, 9, "total accessory levels === 9 (3x Lv.3)");
  assert.equal(fullBqAura.equippedCount, 3, "all 3 accessories equipped");
  assert.equal(fullBqAura.trioSetActive, true, "wearing all 3 accessories activates Trio Set Resonance");
  assert.ok(
    fullBqAura.prodMul > 1.35 &&
      fullBqAura.trainExpMul > 1.5 &&
      fullBqAura.affGainMul > 1.9 &&
      fullBqAura.shinyChanceMul > 1.7 &&
      fullBqAura.catchAdd > 0.01 &&
      fullBqAura.combatMul > 1.35,
    "Boutique aura grants global production, training EXP, affection, shiny odds, catch rate, and combat power bonuses",
  );

  // 3) Verify downstream plumbing: production.js, effects.js (shinyChanceMul + catchChanceAdd), breeding.js, pve_tower.js
  const bareRef = defaultState();
  const bareProd = { catnipPerSec: 10, woodPerSec: 10, mineralsPerSec: 10 };
  finalizeProductionRates(bareProd, bareRef, 1);
  const bqProd = { catnipPerSec: 10, woodPerSec: 10, mineralsPerSec: 10 };
  finalizeProductionRates(bqProd, st, 1);
  assert.ok(bqProd.catnipPerSec > bareProd.catnipPerSec * 1.35, "finalizeProductionRates includes Boutique prodMul");

  const bareTech = computeTechEffects(bareRef, { tech: {} }, { serverBuffLevels: new Map() });
  const bqTech = computeTechEffects(st, { tech: {} }, { serverBuffLevels: new Map() });
  assert.ok(bqTech.shinyChanceMul > bareTech.shinyChanceMul * 1.7, "computeTechEffects includes Boutique shinyChanceMul");
  assert.ok(bqTech.catchChanceAdd > bareTech.catchChanceAdd + 0.01, "computeTechEffects includes Boutique catchAdd");

  const bareBreedShiny = computeBreedingShinyInfo(bareRef, st.mons.list[0], st.mons.list[1]);
  const bqBreedShiny = computeBreedingShinyInfo(st, st.mons.list[0], st.mons.list[1]);
  assert.ok(bqBreedShiny.rate > bareBreedShiny.rate * 1.6, "computeBreedingShinyInfo automatically incorporates Boutique shiny aura");
  assert.ok(computeDualSanctumBadgeBonus(st).boutiqueOutAdd > 0.35, "computeDualSanctumBadgeBonus includes Boutique combat aura");

  // 4) Release protection (造型配饰穿戴中保护) & auto-return on explicit unequip / release
  const styledSet = getBoutiqueStyledMonIds(st);
  const busyWithBq = busyMonIds(st);
  for (const id of [1, 2, 3]) {
    assert.ok(styledSet.has(id) && busyWithBq.has(id), `Boutique-styled partner #${id} is protected in busyMonIds`);
  }
  const weakCandidates = pickWeakMonIds(st.mons.list, { softLimit: 1, batch: 10, protectIds: busyWithBq });
  assert.deepEqual(weakCandidates, [4], "pickWeakMonIds skips Boutique-styled partners and only picks unstyled weak mon #4");

  // Equip accessory onto #4, verify busyMonIds blocks release unless unprotected, and verify releaseMonIds auto-returns accessory
  equipBoutiqueAccessory(st, "accFairyWings", 4);
  assert.equal(getMonBoutiqueBonus(st, 4).styled, true, "partner #4 now wears accFairyWings");
  assert.ok(busyMonIds(st).has(4), "partner #4 is immediately protected in busyMonIds");
  const blockedRel = releaseMonIds(st, [4], { protectIds: busyMonIds(st) });
  assert.equal(blockedRel.removed, 0, "releaseMonIds refuses to release protected Boutique-styled partner");
  // If force-released without protectIds, accessory level is preserved and returned to cabinet!
  const forcedRel = releaseMonIds(st, [4], { protectIds: new Set() });
  assert.equal(forcedRel.removed, 1, "explicit unprotected release succeeds");
  assert.equal(st.meta.starBoutique.accessories.accFairyWings.level, 3, "accessory level 3 preserved in cabinet after partner release");
  assert.equal(st.meta.starBoutique.accessories.accFairyWings.equippedMonId, null, "accessory auto-returned (equippedMonId=null)");
  equipBoutiqueAccessory(st, "accFairyWings", 3);

  // 5) Save/Load roundtrip + Rebirth safety (confirmPrestige)
  const rawSaved = JSON.parse(JSON.stringify(serializeState(st)));
  const hydrated = loadFromRaw(rawSaved);
  const hydratedBq = ensureStarBoutiqueState(hydrated);
  assert.equal(hydratedBq.accessories.accAuroraCrown.level, 3, "Lv.3 accessory survives serializeState -> loadFromRaw");
  assert.equal(hydratedBq.accessories.accAuroraCrown.equippedMonId, 1, "equippedMonId survives serializeState -> loadFromRaw");
  assert.ok(hydratedBq.unlockedSheens.includes("moonlit_mist"), "unlockedSheens survive serializeState -> loadFromRaw");
  assert.ok(hydrated.res.shinyStarSand.value > 0, "shinyStarSand resource survives serializeState -> loadFromRaw");

  hydrated.dex.caught = Object.fromEntries([...Array(155)].map((_, i) => [String(i + 1), 1]));
  hydrated.tech = Object.fromEntries([...Array(16)].map((_, i) => [`t${i}`, true]));
  hydrated.buildings.field.owned = 60;
  hydrated.shinyCount = 5;
  hydrated.catchCount = 999;
  hydrated.era = emptyEraState(ERA_DEFS.length - 1);
  bumpEraCounter(hydrated, "catch_count", 999);
  bumpEraCounter(hydrated, "pokeball_earned", 999);
  bumpEraCounter(hydrated, "gather_total", 999);
  bumpEraCounter(hydrated, "berry_earned", 999);
  syncEraQuests(hydrated);
  const prest = confirmPrestige(hydrated);
  assert.equal(prest.ok, true, "confirmPrestige succeeds with starBoutique populated");
  assert.equal(hydrated.meta.starBoutique.accessories.accAuroraCrown.level, 3, "crafted accessory levels persist across rebirth");
  assert.equal(hydrated.meta.starBoutique.accessories.accAuroraCrown.equippedMonId, null, "confirmPrestige clears stale equippedMonId");
  assert.deepEqual(hydrated.meta.starBoutique.sheenByMon, {}, "confirmPrestige clears stale sheenByMon");

  unequipBoutiqueAccessory(st, "accAuroraCrown");
  unequipBoutiqueStyle(st, 2);
  assert.equal(getMonBoutiqueBonus(st, 2).styled, false, "unequipBoutiqueStyle cleanly removes partner styling");
}

// ============================================================================
// ML-8: 萌灵「远古琥珀基因复苏所」与四太古血脉苏醒共鸣 / 潜能淬炼 / 防放生保护自检
// ============================================================================
{
  const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
  for (const iconKey of [
    "amberFossilGem",
    "amberRevivalPod",
    "primalClawTotem",
    "primalShellTotem",
    "starCorridorGate",
    "corridorStarCrest",
  ]) {
    assert.ok(
      existsSync(path.join(rootDir, "assets", "ui_icons", `${iconKey}.webp`)),
      `ML-8 icon asset exists: ${iconKey}.webp`,
    );
    assert.equal(WEBP_UI_ICONS[iconKey], iconKey, `WEBP_UI_ICONS registers ${iconKey}`);
    const uiTag = renderUiIcon(iconKey, 24);
    const resTag = renderResSvg(iconKey, 20);
    assert.ok(
      uiTag.includes(`${iconKey}.webp?v=0.7.63`) && resTag.includes(`${iconKey}.webp?v=0.7.63`),
      `rpg_svg_icons wires ${iconKey}.webp?v=0.7.63`,
    );
  }
  assert.ok(
    renderResSvg("ancientGeneAmber", 16).includes("amberFossilGem.webp?v=0.7.63"),
    "ancientGeneAmber resource icon resolves to amberFossilGem.webp?v=0.7.63",
  );
  assert.ok(
    renderResSvg("corridorStarMedals", 16).includes("corridorStarCrest.webp?v=0.7.63"),
    "corridorStarMedals resource icon resolves to corridorStarCrest.webp?v=0.7.63",
  );

  const st = defaultState();
  const baseAmberAura = computeAmberRevivalAura(st);
  assert.equal(baseAmberAura.prodMul, 1, "uninitialized amberRevival prodMul === 1");
  assert.equal(baseAmberAura.ivTrainMul, 1, "uninitialized amberRevival ivTrainMul === 1");
  assert.equal(baseAmberAura.shinyChanceMul, 1, "uninitialized amberRevival shinyChanceMul === 1");
  assert.equal(baseAmberAura.combatMul, 1, "uninitialized amberRevival combatMul === 1");
  assert.equal(baseAmberAura.catchAdd, 0, "uninitialized amberRevival catchAdd === 0");
  assert.equal(baseAmberAura.quadResonanceActive, false, "uninitialized quadResonanceActive === false");

  st.mons.list = [
    { id: 1, dex: 6, pid: "p006", name: "炽翼炎龙", lvl: 42, stars: 2, affection: 20, types: ["fire", "wind"], nature: "modest", baseStats: { hp: 78, atk: 84, def: 78, spa: 109, spd: 85, spe: 100 }, iv: { hp: 10, atk: 10, def: 10, spa: 12, spd: 10, spe: 12 } },
    { id: 2, dex: 9, pid: "p009", name: "沧澜重龟", lvl: 40, stars: 2, affection: 18, types: ["water"], nature: "calm", baseStats: { hp: 79, atk: 83, def: 100, spa: 85, spd: 105, spe: 78 }, iv: { hp: 10, atk: 9, def: 12, spa: 10, spd: 12, spe: 9 } },
    { id: 3, dex: 3, pid: "p003", name: "花蓬蓬", lvl: 38, stars: 2, affection: 18, types: ["grass", "wind"], nature: "timid", baseStats: { hp: 80, atk: 82, def: 83, spa: 100, spd: 100, spe: 80 }, iv: { hp: 11, atk: 9, def: 10, spa: 12, spd: 11, spe: 10 } },
    { id: 4, dex: 25, pid: "p025", name: "雷光鼠", lvl: 36, stars: 1, affection: 15, types: ["electric"], nature: "jolly", baseStats: { hp: 65, atk: 80, def: 65, spa: 85, spd: 80, spe: 110 }, iv: { hp: 9, atk: 10, def: 8, spa: 10, spd: 9, spe: 13 } },
    { id: 5, dex: 10, pid: "p010", name: "毛茸茸", lvl: 2, stars: 0, affection: 0, types: ["grass"], nature: "hardy", baseStats: { hp: 45, atk: 30, def: 35, spa: 20, spd: 20, spe: 45 }, iv: { hp: 1, atk: 1, def: 1, spa: 1, spd: 1, spe: 1 } },
  ];
  st.mons.nextId = 6;

  // 1) Daily free Amber excavation (+6) + Ecology Sandbox synthesis (+4) + Champion League synthesis (+5)
  assert.equal(canClaimDailyAncientAmber(st, 50_000_000), true, "daily Ancient Amber claimable initially");
  const dAmber = claimDailyAncientAmber(st, { nowMs: 50_000_000 });
  assert.equal(dAmber.ok && dAmber.gained === AMBER_REVIVAL_DAILY_GRANT, true, "daily excavation grants +6 ancientGeneAmber");
  assert.equal(claimDailyAncientAmber(st, { nowMs: 50_000_500 }).ok, false, "daily excavation guarded to once per day");

  st.res.tuningMint = { value: 4, cap: 999 };
  st.res.minerals.value = 500;
  st.res.shinyStarSand.value = 25;
  st.res.futurecoin.value = 1800;
  st.res.wood.value = 600;
  st.res.evolutionStone = { value: 6, cap: 999 };
  assert.equal(canSynthesizeAncientAmber(st, "eco"), true, "canSynthesizeAncientAmber eco");
  assert.equal(canSynthesizeAncientAmber(st, "league"), true, "canSynthesizeAncientAmber league");
  const synEco = synthesizeAncientAmber(st, "eco");
  const synLeague = synthesizeAncientAmber(st, "league");
  assert.equal(synEco.ok && synEco.gained === 4, true, "Ecology Sandbox synthesis yields +4 ancientGeneAmber");
  assert.equal(synLeague.ok && synLeague.gained === 5, true, "Champion League synthesis yields +5 ancientGeneAmber");
  assert.equal(st.res.ancientGeneAmber.value, 15, "total ancientGeneAmber = 6 + 4 + 5 = 15");

  // 2) Appraise & upgrade all 4 Prehistoric Bloodline Imprints Lv.1 -> Lv.3 + equip onto partners #1..#4
  st.res.ancientGeneAmber.value = 140;
  const bareRef = defaultState();
  bareRef.buildings.breedingHouse.owned = 1;
  const bareRates = { catnipPerSec: 10, woodPerSec: 10, mineralsPerSec: 10 };
  finalizeProductionRates(bareRates, bareRef, 1);
  const bareTech = computeTechEffects(bareRef, { tech: {} }, { serverBuffLevels: new Map() });
  const bareShiny = computeBreedingShinyInfo(bareRef, st.mons.list[0], st.mons.list[1]);
  assert.equal(getInheritedIvKeyCount(bareRef), 3, "baseline breeding house Lv.1 inherits 3 IVs");

  const impIds = PRIMAL_IMPRINT_DEFS.map((d) => d.id);
  for (let idx = 0; idx < impIds.length; idx += 1) {
    const impId = impIds[idx];
    const monId = idx + 1;
    const aw1 = awakenOrUpgradePrimalImprint(st, impId, { equipMonId: monId });
    assert.equal(aw1.ok && aw1.level === 1 && aw1.equippedMonId === monId, true, `${impId} awakens Lv.1 and equips onto partner #${monId}`);
    const aw2 = awakenOrUpgradePrimalImprint(st, impId);
    const aw3 = awakenOrUpgradePrimalImprint(st, impId);
    assert.equal(aw2.ok && aw2.level === 2 && aw3.ok && aw3.level === AMBER_IMPRINT_MAX_LEVEL, true, `${impId} upgrades cleanly to Lv.3`);
    assert.equal(awakenOrUpgradePrimalImprint(st, impId).ok, false, `${impId} rejects upgrade past Lv.3`);
  }

  // 3) Verify 「四太古血脉苏醒共鸣」 + downstream production, IV training, capture rate, shiny odds & PvE combat boosts
  const fullAmberAura = computeAmberRevivalAura(st);
  assert.equal(fullAmberAura.awakenedCount, 4, "all 4 Prehistoric Bloodline Imprints awakened");
  assert.equal(fullAmberAura.equippedCount, 4, "all 4 Prehistoric Bloodline Imprints equipped");
  assert.equal(fullAmberAura.quadResonanceActive, true, "四太古血脉苏醒共鸣 activates when all 4 imprints awaken");
  assert.ok(
    fullAmberAura.prodMul > 1.5 &&
      fullAmberAura.ivTrainMul > 2.2 &&
      fullAmberAura.catchAdd >= 0.07 &&
      fullAmberAura.shinyChanceMul > 1.8 &&
      fullAmberAura.combatMul > 1.5,
    "quad resonance + 4x Lv.3 imprints grant full 5-axis aura boosts",
  );

  const boostedRates = { catnipPerSec: 10, woodPerSec: 10, mineralsPerSec: 10 };
  finalizeProductionRates(boostedRates, st, 1);
  assert.ok(boostedRates.catnipPerSec > bareRates.catnipPerSec * 1.45, "finalizeProductionRates applies Amber Revival prodMul");

  const boostedTech = computeTechEffects(st, { tech: {} }, { serverBuffLevels: new Map() });
  assert.ok(boostedTech.catchChanceAdd >= bareTech.catchChanceAdd + 0.07, "computeTechEffects applies Amber Revival catchAdd");
  assert.ok(boostedTech.shinyChanceMul > bareTech.shinyChanceMul * 1.7, "computeTechEffects applies Amber Revival shinyChanceMul");

  const boostedShiny = computeBreedingShinyInfo(st, st.mons.list[0], st.mons.list[1]);
  assert.ok(boostedShiny.rate > bareShiny.rate * 1.7, "computeBreedingShinyInfo applies Amber Revival shinyChanceMul");
  st.buildings.breedingHouse.owned = 1;
  assert.equal(getInheritedIvKeyCount(st), 5, "四太古血脉苏醒共鸣 elevates breeding IV inheritance floor to 5");
  assert.ok(computeDualSanctumBadgeBonus(st).pveOutMul > 1.5, "computeDualSanctumBadgeBonus includes Amber Revival PvE combat bonus");

  // Direct Amber IV refinement + passive training IV breakthrough
  const defBefore = st.mons.list[3].iv.def;
  const refRes = refinePartnerIvWithAmber(st, 4, "def");
  assert.equal(refRes.ok && st.mons.list[3].iv.def >= defBefore + 4, true, "refinePartnerIvWithAmber boosts target IV with quad resonance bonus");
  const advRes = advanceAmberIvTraining(st, st.mons.list[0], 40, 1);
  assert.equal(advRes.upgraded, true, "advanceAmberIvTraining triggers passive IV breakthrough during training");

  // 4) busyMonIds release-lock protection & auto-return on force release
  const imprintedIds = getAmberImprintedMonIds(st);
  assert.equal(imprintedIds.size, 4, "partners #1..#4 registered as imprinted");
  const busySet = busyMonIds(st);
  for (const id of [1, 2, 3, 4]) {
    assert.ok(busySet.has(id), `busyMonIds protects imprinted partner #${id}`);
  }
  const weakList = pickWeakMonIds(st.mons.list, { softLimit: 1, batch: 10, protectIds: busySet });
  assert.deepEqual(weakList, [5], "pickWeakMonIds skips imprinted partners #1..#4 and only picks unequipped weak partner #5");

  equipPrimalImprint(st, "primalMeteor", 5);
  assert.ok(busyMonIds(st).has(5), "partner #5 is immediately protected once imprinted");
  const blockedRel = releaseMonIds(st, [5], { protectIds: busyMonIds(st) });
  assert.equal(blockedRel.removed, 0, "releaseMonIds refuses to release protected imprinted partner");
  const forcedRel = releaseMonIds(st, [5], { protectIds: new Set() });
  assert.equal(forcedRel.removed, 1, "unprotected release removes partner #5");
  assert.equal(st.meta.amberRevival.imprints.primalMeteor.level, 3, "Lv.3 primalMeteor imprint level preserved in pod");
  assert.equal(st.meta.amberRevival.imprints.primalMeteor.equippedMonId, null, "primalMeteor equippedMonId auto-returned to null");
  equipPrimalImprint(st, "primalMeteor", 4);

  // 5) Save/Load roundtrip + Rebirth (confirmPrestige) safety
  const savedJson = JSON.parse(JSON.stringify(serializeState(st)));
  const reloaded = loadFromRaw(savedJson);
  const reloadedAmber = ensureAmberRevivalState(reloaded);
  assert.equal(reloadedAmber.imprints.primalClaw.level, 3, "Lv.3 primalClaw survives serializeState -> loadFromRaw");
  assert.equal(reloadedAmber.imprints.primalClaw.equippedMonId, 1, "equippedMonId survives serializeState -> loadFromRaw");
  assert.ok(reloaded.res.ancientGeneAmber.value > 0, "ancientGeneAmber survives serializeState -> loadFromRaw");

  reloaded.dex.caught = Object.fromEntries([...Array(155)].map((_, i) => [String(i + 1), 1]));
  reloaded.tech = Object.fromEntries([...Array(16)].map((_, i) => [`t${i}`, true]));
  reloaded.buildings.field.owned = 60;
  reloaded.shinyCount = 5;
  reloaded.catchCount = 999;
  reloaded.era = emptyEraState(ERA_DEFS.length - 1);
  bumpEraCounter(reloaded, "catch_count", 999);
  bumpEraCounter(reloaded, "pokeball_earned", 999);
  bumpEraCounter(reloaded, "gather_total", 999);
  bumpEraCounter(reloaded, "berry_earned", 999);
  syncEraQuests(reloaded);
  const prest = confirmPrestige(reloaded);
  assert.equal(prest.ok, true, "confirmPrestige succeeds with amberRevival populated");
  assert.equal(reloaded.meta.amberRevival.imprints.primalClaw.level, 3, "awakened imprint levels persist across rebirth");
  assert.equal(reloaded.meta.amberRevival.imprints.primalClaw.equippedMonId, null, "confirmPrestige clears stale imprint equippedMonId");

  unequipPrimalImprint(st, "primalClaw");
  assert.equal(getMonPrimalImprintBonus(st, 1).imprinted, false, "unequipPrimalImprint cleanly detaches imprint");
}

// ============================================================================
// ML-9: 萌灵「星海漂流瓶心愿码头」— 出海拾贝 / 开瓶读信 / 海洋奇珍纪念章光环 / 防放生锁 / 存档兼容
// ============================================================================
{
  const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
  for (const iconKey of ["wishBottleDock", "driftBottle", "oceanPearlBadge", "starShellTreasure", "ecoChampionHall", "ecoTriCrest"]) {
    assert.ok(existsSync(path.join(rootDir, "assets", "ui_icons", `${iconKey}.webp`)), `ML-9 icon asset exists: ${iconKey}.webp`);
    assert.equal(WEBP_UI_ICONS[iconKey], iconKey, `WEBP_UI_ICONS registers ${iconKey}`);
    assert.ok(
      renderUiIcon(iconKey, 24).includes(`${iconKey}.webp?v=0.7.63`) && renderResSvg(iconKey, 20).includes(`${iconKey}.webp?v=0.7.63`),
      `rpg_svg_icons wires ${iconKey}.webp?v=0.7.63`,
    );
  }
  assert.ok(renderResSvg("driftBottle", 16).includes("driftBottle.webp?v=0.7.63"), "driftBottle resource icon resolves to driftBottle.webp");
  const dockSrc = readFileSync(path.join(rootDir, "modules", "tabs", "functions_tab.js"), "utf8");
  assert.ok(!/<svg/i.test(dockSrc.slice(dockSrc.indexOf("ML-9 Section"), dockSrc.indexOf("ML-8 Section"))), "ML-9 dock UI uses webp icons only (no inline svg)");

  // 0) Old saves: no wishDock → neutral aura, no busy ids, no crash
  const legacy = loadFromRaw(JSON.stringify({ version: 3, res: { futurecoin: { value: 5, cap: 999 } }, mons: { nextId: 2, list: [{ id: 1, dex: 7, pid: "p007", name: "沧澜幼龟", lvl: 5 }] } }));
  assert.ok(legacy && !legacy.meta.wishDock, "legacy save loads without wishDock");
  assert.equal(getWishDockAwayMonIds(legacy).size, 0, "legacy save has no dock-away partners");
  const legacyAura = computeWishDockAura(legacy);
  assert.equal(legacyAura.prodMul, 1, "legacy wishDock prodMul === 1");
  assert.equal(legacyAura.shinyChanceMul, 1, "legacy wishDock shinyChanceMul === 1");
  assert.equal(advanceWishDock(legacy, 999).newlyCompleted.length, 0, "advanceWishDock is a no-op without a dock");
  assert.equal(typeof legacy.res.driftBottle?.value, "number", "legacy save gains driftBottle bucket default");

  const st = defaultState();
  st.mons.list = [
    { id: 1, dex: 7, pid: "p007", name: "沧澜幼龟", lvl: 40, stars: 2, types: ["water"], isShiny: true, baseStats: { hp: 60, atk: 60, def: 60, spa: 60, spd: 60, spe: 60 }, iv: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 } },
    { id: 2, dex: 131, pid: "p131", name: "沧海颂歌龙", lvl: 38, stars: 2, types: ["water", "wind"], baseStats: { hp: 60, atk: 60, def: 60, spa: 60, spd: 60, spe: 60 }, iv: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 } },
    { id: 3, dex: 79, pid: "p079", name: "梦游水獭", lvl: 36, stars: 1, types: ["water", "mystic"], baseStats: { hp: 60, atk: 60, def: 60, spa: 60, spd: 60, spe: 60 }, iv: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 } },
    { id: 4, dex: 25, pid: "p025", name: "星雷灵鼠", lvl: 34, stars: 1, types: ["electric"], baseStats: { hp: 60, atk: 60, def: 60, spa: 60, spd: 60, spe: 60 }, iv: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 } },
    { id: 5, dex: 4, pid: "p004", name: "炽尾幼麟", lvl: 12, stars: 0, types: ["fire"], baseStats: { hp: 60, atk: 60, def: 60, spa: 60, spd: 60, spe: 60 }, iv: { hp: 3, atk: 3, def: 3, spa: 3, spd: 3, spe: 3 } },
    { id: 6, dex: 10, pid: "p010", name: "翠玉灵蚕", lvl: 2, stars: 0, types: ["grass"], baseStats: { hp: 60, atk: 60, def: 60, spa: 60, spd: 60, spe: 60 }, iv: { hp: 1, atk: 1, def: 1, spa: 1, spd: 1, spe: 1 } },
  ];
  st.mons.nextId = 7;
  st.training.activeIds = [6];
  const dock = ensureWishDockState(st);
  assert.equal(WISH_DOCK_ROUTES.length, 3, "3 beachcombing routes");
  assert.equal(OCEAN_BADGE_DEFS.length, 4, "4 Ocean Treasure badges");
  assert.equal(WISH_REPLY_LETTERS.length, 12, "12 wish-reply letters");

  // 1) Idle candidates skip training partners; crew evaluation rewards preferred types & shiny
  const idleShoal = getIdleWishDockCandidates(st, "shoal").map((m) => m.id);
  assert.ok(!idleShoal.includes(6), "training partner #6 is not an idle dock candidate");
  const evMatch = evaluateWishDockCrew("shoal", [st.mons.list[0], st.mons.list[1]], st);
  const evMiss = evaluateWishDockCrew("shoal", [st.mons.list[4]], st);
  assert.ok(evMatch.bottles > evMiss.bottles && evMatch.yieldMul > evMiss.yieldMul, "water/wind/shiny crew yields more bottles than an off-type crew");
  assert.ok(evMatch.rareChance > WISH_DOCK_ROUTES[0].rareChance, "shiny crew raises rare-treasure chance");

  // 2) Daily tide gift (+2) guarded once per day
  assert.equal(canClaimDailyDriftBottles(st, 70_000_000), true, "daily tide gift claimable");
  const gift = claimDailyDriftBottles(st, { nowMs: 70_000_000 });
  assert.equal(gift.ok && gift.gained === WISH_DOCK_DAILY_FREE_BOTTLES && st.res.driftBottle.value === 2, true, "tide gift grants +2 drift bottles");
  assert.equal(claimDailyDriftBottles(st, { nowMs: 70_000_500 }).ok, false, "tide gift guarded to once per day");

  // 3) Dispatch → busyMonIds lock (release / weak-pick / eco sandbox / camp all blocked)
  const pickRes = autoPickWishDockCrew(st, "reef");
  assert.ok(pickRes.ok && pickRes.stagedIds.length === 3 && pickRes.stagedIds.includes(3), "autoPickWishDockCrew prefers reef water/mystic partner #3");
  const disp = dispatchWishDockRoute(st, "reef", null, { nowMs: 70_001_000 });
  assert.ok(disp.ok && disp.bottles >= 3, "dispatchWishDockRoute sends reef crew out");
  const awayIds = getWishDockAwayMonIds(st);
  assert.equal(awayIds.size, 3, "3 reef crew members are away at the dock");
  const busy = busyMonIds(st);
  for (const id of disp.crewIds) assert.ok(busy.has(id), `busyMonIds protects dock crew #${id}`);
  const weak = pickWeakMonIds(st.mons.list, { softLimit: 1, batch: 10, protectIds: busy });
  for (const id of disp.crewIds) assert.ok(!weak.includes(id), `pickWeakMonIds skips dock crew #${id}`);
  const blocked = releaseMonIds(st, disp.crewIds, { protectIds: busyMonIds(st) });
  assert.equal(blocked.removed, 0, "releaseMonIds refuses to release partners away at the dock");
  assert.ok(disp.crewIds.every((id) => !getIdleEcoSandboxCandidates(st, "canopy").some((m) => m.id === id)), "dock crew excluded from eco sandbox candidates");
  assert.ok(disp.crewIds.every((id) => getCampUnavailableMonIds(st).has(id)), "dock crew excluded from star camp");
  assert.equal(dispatchWishDockRoute(st, "shoal", disp.crewIds).ok, false, "away crew cannot be double-booked on another route");
  assert.equal(toggleWishDockStagedMon(st, "shoal", disp.crewIds[0]).ok, false, "away crew cannot be staged on another route");

  // 4) Advance (tick / offline) → completion; still locked until claimed; breeze instant
  assert.equal(advanceWishDock(st, 60).newlyCompleted.length, 0, "trip not finished after 60s");
  const dispShoal = dispatchWishDockRoute(st, "shoal", [4], { nowMs: 70_002_000 });
  assert.ok(dispShoal.ok, "second route dispatch with idle partner #4");
  const breeze = breezeCompleteWishDockRoute(st, "shoal", { nowMs: 70_002_100 });
  assert.equal(breeze.ok && breeze.costKind === "free_daily", true, "first breeze of the day is free");
  assert.equal(st.meta.wishDock.routes.shoal.completed, true, "breeze completes the trip instantly");
  const adv = advanceWishDock(st, 20_000);
  assert.deepEqual(adv.newlyCompleted, ["reef"], "advanceWishDock completes reef trip with large dt (offline catch-up)");
  assert.ok(busyMonIds(st).has(disp.crewIds[0]), "completed-but-unclaimed crew stays protected");

  // 5) Claim → bottles + bonus treasure + crew freed (re-staged)
  const bottlesBefore = st.res.driftBottle.value;
  const claimAll = claimAllWishDockRoutes(st, { randFloat: () => 0.01 });
  assert.ok(claimAll.ok && claimAll.claimed.length === 2, "claimAllWishDockRoutes claims both routes");
  assert.equal(st.res.driftBottle.value, bottlesBefore + claimAll.totalBottles, "claimed bottles land in res.driftBottle");
  assert.ok(claimAll.bonusTreasures.some((t) => t.id === "moonPearl"), "reef bonus treasure is moonPearl");
  assert.equal(getWishDockAwayMonIds(st).size, 0, "crew returns home after claim");
  assert.ok(!busyMonIds(st).has(disp.crewIds[0]), "returned crew loses dock protection");
  assert.ok(st.meta.wishDock.routes.reef.stagedIds.length > 0, "returned crew re-staged for quick redispatch");

  // 6) Open bottles → letters (unique collection) + treasures + futurecoin
  const fcBefore = st.res.futurecoin.value;
  const openedN = Math.min(WISH_DOCK_OPEN_BATCH, st.res.driftBottle.value);
  const opened = openDriftBottles(st, WISH_DOCK_OPEN_BATCH, { randFloat: () => 0.3 });
  assert.ok(opened.ok && opened.opened === openedN && opened.letters.length === openedN, "openDriftBottles opens a batch");
  assert.ok(opened.letters.every((l) => l.title && l.body && l.from), "each bottle yields a wish-reply letter with a carrier");
  assert.ok(opened.newLetters >= 1 && st.meta.wishDock.lettersRead.length === opened.newLetters, "new letters recorded in collection");
  assert.equal(Object.values(opened.treasures).reduce((s, v) => s + v, 0), openedN, "each bottle yields exactly one ocean treasure");
  assert.ok(st.res.futurecoin.value >= fcBefore + openedN * WISH_DOCK_BOTTLE_COIN, "each bottle grants futurecoin");
  st.res.driftBottle.value = 0;
  assert.equal(openDriftBottles(st, 1).ok, false, "cannot open without bottles");

  // 7) Forge 4 badges to Lv.3 → 四海奇珍共鸣 + 满潮共鸣; aura feeds production / tech / breeding
  const bareRef = defaultState();
  const bareRates = { catnipPerSec: 10, woodPerSec: 10, mineralsPerSec: 10 };
  finalizeProductionRates(bareRates, bareRef, 1);
  const bareTech = computeTechEffects(bareRef, { tech: {} }, { serverBuffLevels: new Map() });
  const bareShiny = computeBreedingShinyInfo(bareRef, st.mons.list[0], st.mons.list[1]);
  assert.equal(forgeOceanBadge(st, "badgeStarCompass").ok, false, "forge blocked without enough treasures");
  for (const t of OCEAN_TREASURE_DEFS) st.meta.wishDock.treasures[t.id] = 40;
  st.res.futurecoin.value = 5000;
  st.res.shinyStarSand.value = 10;
  st.res.ancientGeneAmber.value = 10;
  st.res.tuningMint = { value: 5, cap: 999 };
  st.res.evolutionStone = { value: 5, cap: 999 };
  for (const b of OCEAN_BADGE_DEFS) {
    for (let lv = 1; lv <= WISH_DOCK_BADGE_MAX_LEVEL; lv += 1) {
      const f = forgeOceanBadge(st, b.id);
      assert.ok(f.ok && f.level === lv, `${b.id} forges to Lv.${lv}`);
    }
    assert.equal(forgeOceanBadge(st, b.id).ok, false, `${b.id} rejects upgrade past Lv.3`);
  }
  const fullAura = computeWishDockAura(st);
  assert.ok(fullAura.setResonance && fullAura.fullTide && fullAura.badgeCount === 4, "四海奇珍共鸣 + 满潮共鸣 active with 4x Lv.3 badges");
  assert.ok(fullAura.prodMul >= 1.55 && fullAura.shinyChanceMul >= 1.6 && fullAura.tripSpeedAdd === 0.15, "full dock aura: prod/shiny/trip-speed boosts");
  const boostedRates = { catnipPerSec: 10, woodPerSec: 10, mineralsPerSec: 10 };
  finalizeProductionRates(boostedRates, st, 1);
  assert.ok(boostedRates.catnipPerSec > bareRates.catnipPerSec * 1.5, "finalizeProductionRates applies wish dock prodMul");
  const boostedTech = computeTechEffects(st, { tech: {} }, { serverBuffLevels: new Map() });
  assert.ok(boostedTech.shinyChanceMul > bareTech.shinyChanceMul * 1.6, "computeTechEffects applies wish dock shinyChanceMul");
  const boostedShiny = computeBreedingShinyInfo(st, st.mons.list[0], st.mons.list[1]);
  assert.ok(boostedShiny.rate > bareShiny.rate * 1.5, "computeBreedingShinyInfo applies wish dock shinyChanceMul");
  assert.ok(evaluateWishDockCrew("trench", [st.mons.list[0]], st).durationSec < WISH_DOCK_ROUTES[2].baseDurationSec, "compass badge shortens trip duration");

  // 8) Forced release detaches crew cleanly; Save/Load + rebirth safety
  for (const r of Object.values(st.meta.wishDock.routes)) r.stagedIds = [];
  dispatchWishDockRoute(st, "trench", [1, 2], { nowMs: 70_100_000 });
  assert.ok(busyMonIds(st).has(1), "trench crew protected");
  const forced = releaseMonIds(st, [2], { protectIds: new Set() });
  assert.equal(forced.removed, 1, "unprotected release removes partner #2");
  assert.ok(!st.meta.wishDock.routes.trench.crewIds.includes(2) && st.meta.wishDock.routes.trench.active, "forced release detaches #2 but keeps trip with #1");
  const saved = JSON.parse(JSON.stringify(serializeState(st)));
  const reloaded = loadFromRaw(saved);
  const rd = ensureWishDockState(reloaded);
  assert.ok(rd.routes.trench.active && rd.routes.trench.crewIds.includes(1), "active trip survives serializeState -> loadFromRaw");
  assert.equal(rd.badges.badgeMoonPearl, 3, "badge levels survive save/load");
  assert.ok(rd.lettersRead.length >= 1, "letter collection survives save/load");
  assert.ok(busyMonIds(reloaded).has(1), "reloaded dock crew stays protected");
  reloaded.dex.caught = Object.fromEntries([...Array(155)].map((_, i) => [String(i + 1), 1]));
  reloaded.tech = Object.fromEntries([...Array(16)].map((_, i) => [`t${i}`, true]));
  reloaded.buildings.field.owned = 60;
  reloaded.shinyCount = 5;
  reloaded.catchCount = 999;
  reloaded.era = emptyEraState(ERA_DEFS.length - 1);
  bumpEraCounter(reloaded, "catch_count", 999);
  bumpEraCounter(reloaded, "pokeball_earned", 999);
  bumpEraCounter(reloaded, "gather_total", 999);
  bumpEraCounter(reloaded, "berry_earned", 999);
  syncEraQuests(reloaded);
  assert.equal(confirmPrestige(reloaded).ok, true, "confirmPrestige succeeds with wishDock populated");
  assert.equal(reloaded.meta.wishDock.routes.trench.active, false, "rebirth recalls all dock trips");
  assert.equal(reloaded.meta.wishDock.badges.badgeMoonPearl, 3, "badge levels persist across rebirth");
  assert.equal(getWishDockAwayMonIds(reloaded).size, 0, "no dock-away partners after rebirth");
  recallWishDockRoute(st, "trench");
  assert.equal(getWishDockAwayMonIds(st).size, 0, "recallWishDockRoute frees crew");
}

// ============================================================================
// ML-10: 萌灵「月光夜行生态观察站」— 本地时段门控（注入时钟）/ 派驻防放生锁 / 观察日记 / 夜行形态 / 夜间光环 / 存档兼容
// ============================================================================
{
  const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
  for (const iconKey of ["nightObservatory", "moonlitJournal", "nocturnalCrest", "fireflyLantern", "acrobatStage", "showStarTrophy"]) {
    assert.ok(existsSync(path.join(rootDir, "assets", "ui_icons", `${iconKey}.webp`)), `ML-10 icon asset exists: ${iconKey}.webp`);
    assert.equal(WEBP_UI_ICONS[iconKey], iconKey, `WEBP_UI_ICONS registers ${iconKey}`);
    assert.ok(
      renderUiIcon(iconKey, 24).includes(`${iconKey}.webp?v=0.7.63`) && renderResSvg(iconKey, 20).includes(`${iconKey}.webp?v=0.7.63`),
      `rpg_svg_icons wires ${iconKey}.webp?v=0.7.63`,
    );
  }
  assert.ok(renderResSvg("fireflyLantern", 16).includes("fireflyLantern.webp?v=0.7.63"), "fireflyLantern resource icon resolves to fireflyLantern.webp");
  const ftSrc = readFileSync(path.join(rootDir, "modules", "tabs", "functions_tab.js"), "utf8");
  const ml10Ui = ftSrc.slice(ftSrc.indexOf("ML-10 Section: 萌灵「月光夜行"), ftSrc.indexOf("ML-9 Section"));
  assert.ok(ml10Ui.length > 1000 && !/<svg/i.test(ml10Ui) && !/<canvas/i.test(ml10Ui), "ML-10 UI uses webp icons only (no inline svg / canvas)");

  // 0) Time-of-day gate with an injected clock (19:00 ~ 05:00 = 夜观时段, otherwise 暮光微光模式)
  const at = (h, m = 0, s = 0, day = 18) => new Date(2026, 10, day, h, m, s).getTime();
  const p1859 = getNightObservatoryPhase(at(18, 59));
  assert.ok(p1859.phase === "dusk" && !p1859.isNight && p1859.msUntilChange === 60_000, "18:59 is dusk mode, 1 min until the night window opens");
  assert.equal(p1859.sightingMul, NIGHT_OBS_DUSK_SIGHTING_MUL, "dusk sighting multiplier 0.4");
  assert.equal(p1859.auraMul, NIGHT_OBS_DUSK_AURA_MUL, "dusk aura multiplier 0.4");
  const p1900 = getNightObservatoryPhase(at(19, 0));
  assert.ok(p1900.isNight && p1900.msUntilChange === 10 * 3600_000 && p1900.countdownLabel === "距破晓", "19:00 opens the night window for 10h");
  const p0459 = getNightObservatoryPhase(at(4, 59, 59));
  assert.ok(p0459.isNight && p0459.msUntilChange === 1000, "04:59:59 is still night, 1s to dawn");
  const p0500 = getNightObservatoryPhase(at(5, 0));
  assert.ok(!p0500.isNight && p0500.msUntilChange === 14 * 3600_000 && p0500.countdownLabel === "距入夜", "05:00 switches to dusk mode, 14h until 19:00");
  assert.ok(getNightObservatoryPhase(at(0, 30)).isNight && !getNightObservatoryPhase(at(12, 0)).isNight, "midnight is night, noon is dusk mode");
  assert.equal(p1900.sightingMul, 1, "night sighting multiplier 1");

  // 1) Old saves: no nightObservatory / acrobatShow → neutral aura, no stationed ids, no crash
  const legacy = loadFromRaw(JSON.stringify({ version: 3, res: { futurecoin: { value: 5, cap: 999 } }, mons: { nextId: 2, list: [{ id: 1, dex: 41, pid: "p041", name: "幽谷夜蝠", lvl: 5 }] } }));
  assert.ok(legacy && !legacy.meta.nightObservatory, "legacy save loads without nightObservatory");
  assert.equal(getNightObservatoryStationedMonIds(legacy).size, 0, "legacy save has no stationed observers");
  for (const t of [at(23), at(12)]) {
    const a = computeNightObservatoryAura(legacy, t);
    assert.ok(a.prodMul === 1 && a.shinyChanceMul === 1 && a.discovered === 0, "legacy observatory aura is neutral (night & day)");
  }
  assert.equal(advanceNightObservatory(legacy, 99_999, { nowMs: at(23) }).sightings.length, 0, "advanceNightObservatory is a no-op without an observatory");
  assert.equal(typeof legacy.res.fireflyLantern?.value, "number", "legacy save gains fireflyLantern bucket default");
  assert.equal(busyMonIds(legacy).has(1), false, "legacy mon is not locked");

  const nm = (id, dex, name, types, lvl = 40, stars = 1, extra = {}) => ({
    id, dex, pid: `p${String(dex).padStart(3, "0")}`, name, lvl, stars, types, affection: 60,
    baseStats: { hp: 60, atk: 60, def: 60, spa: 60, spd: 60, spe: 60 }, iv: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 }, ...extra,
  });
  const st = defaultState();
  st.mons.list = [
    nm(1, 197, "幽月影狐", ["dark"], 50, 2),
    nm(2, 63, "星眠小狐", ["mystic"], 45, 2, { isShiny: true }),
    nm(3, 16, "云羽雏雀", ["wind"], 30, 1),
    nm(4, 4, "炽尾幼麟", ["fire"], 60, 3),
    nm(5, 7, "沧澜幼龟", ["water"], 20, 0),
    nm(6, 1, "青萝幼龙", ["grass"], 10, 0),
  ];
  st.mons.nextId = 7;
  st.training.activeIds = [6];
  const obs = ensureNightObservatoryState(st);
  assert.ok(obs.initialized && obs.stationedIds.length === 0, "ensureNightObservatoryState creates a clean observatory");
  assert.equal(NOCTURNAL_CREATURE_DEFS.length, 12, "12 nocturnal creatures in the journal");
  assert.equal(NOCTURNAL_CREATURE_DEFS.filter((c) => c.nightOnly).length, 5, "5 creatures are night-window only");

  // 2) Station: idle candidates skip training partners; auto-fill prefers night-affine types; max 3 seats
  assert.ok(!getIdleNightObservatoryCandidates(st).some((m) => m.id === 6), "training partner #6 is not an idle observer candidate");
  const fill = autoFillNightObservatory(st);
  assert.ok(fill.ok && fill.added.length === NIGHT_OBS_MAX_STATION && [1, 2, 3].every((id) => fill.added.includes(id)), "autoFill stations the dark/mystic/wind partners");
  assert.equal(toggleNightObservatoryMon(st, 4).reason, "station_full", "observatory is capped at 3 seats");
  const ev3 = evaluateNightObservers(st.mons.list.slice(0, 3), st);
  assert.ok(ev3.affineCount === 3 && Math.abs(ev3.speedMul - 1.36) < 1e-9, "3 night-affine observers → observation speed ×1.36");

  // 3) busyMonIds lock — release / weak-pick / sandbox / camp / dock all blocked for stationed partners
  const busy = busyMonIds(st);
  for (const id of [1, 2, 3]) assert.ok(busy.has(id), `busyMonIds protects stationed observer #${id}`);
  const weak = pickWeakMonIds(st.mons.list, { softLimit: 1, batch: 10, protectIds: busy });
  for (const id of [1, 2, 3]) assert.ok(!weak.includes(id), `pickWeakMonIds skips stationed observer #${id}`);
  assert.equal(releaseMonIds(st, [1, 2, 3], { protectIds: busyMonIds(st) }).removed, 0, "releaseMonIds refuses to release stationed observers");
  assert.ok([1, 2, 3].every((id) => !getIdleEcoSandboxCandidates(st, "canopy").some((m) => m.id === id)), "stationed observers excluded from eco sandbox");
  assert.ok([1, 2, 3].every((id) => getCampUnavailableMonIds(st).has(id)), "stationed observers excluded from star camp");
  assert.ok([1, 2, 3].every((id) => !getIdleWishDockCandidates(st, "shoal").some((m) => m.id === id)), "stationed observers excluded from the wish dock");
  dispatchWishDockRoute(st, "shoal", [5], { nowMs: at(12) });
  assert.ok(getWishDockAwayMonIds(st).has(5), "partner #5 sails out from the dock");
  recallNightObservatory(st, 3);
  assert.equal(toggleNightObservatoryMon(st, 5).reason, "mon_busy", "a partner away at the dock cannot be stationed");
  assert.equal(toggleNightObservatoryMon(st, 3).ok, true, "a recalled observer can be re-stationed");
  recallWishDockRoute(st, "shoal");

  // 4) Advance with an injected clock: night records all 12 creatures, dusk mode never shows night-only creatures
  const hi = () => 0.999;
  const nightRun = advanceNightObservatory(st, 3600, { nowMs: at(23), randFloat: hi });
  const expectNight = Math.floor((3600 * 1.36) / NIGHT_OBS_CYCLE_SEC);
  assert.equal(nightRun.sightings.length, expectNight, `1h of night observation with ×1.36 speed → ${expectNight} sightings`);
  assert.ok(nightRun.sightings.every((s) => s.creatureId === "nc_gala_pumpkin" && s.phase === "night"), "night roll at the top of the table can surface the legendary night-only creature");
  assert.ok(nightRun.newDiscoveries.length === 1 && nightRun.lanternsGained === expectNight * 3, "first legendary sighting is a new journal page; legend yields 3 lanterns each at night");
  const lanternsAfterNight = st.res.fireflyLantern.value;
  const duskRun = advanceNightObservatory(st, 3600, { nowMs: at(12), randFloat: hi });
  const expectDusk = Math.floor((3600 * 0.4 * 1.36 + (nightRun.sightings.length ? st.meta.nightObservatory.observeCarrySec * 0 : 0)) / NIGHT_OBS_CYCLE_SEC);
  assert.ok(duskRun.sightings.length >= expectDusk && duskRun.sightings.length <= expectDusk + 1, "dusk mode observes at 40% efficiency");
  assert.ok(duskRun.sightings.length < nightRun.sightings.length, "dusk mode records fewer sightings than the night window");
  const nightOnlyIds = new Set(NOCTURNAL_CREATURE_DEFS.filter((c) => c.nightOnly).map((c) => c.id));
  assert.ok(duskRun.sightings.every((s) => !nightOnlyIds.has(s.creatureId) && s.phase === "dusk"), "dusk mode never surfaces night-only creatures");
  assert.equal(
    st.res.fireflyLantern.value - lanternsAfterNight,
    duskRun.sightings.reduce((s, x) => s + Math.max(0, getNocturnalCreatureDef(x.creatureId).lantern - 1), 0),
    "dusk sightings yield one lantern fewer than at night",
  );
  // Offline catch-up across the 19:00 boundary is split per chunk (18:00~19:00 dusk + 19:00~20:00 night)
  const cross = defaultState();
  cross.mons.list = st.mons.list.slice(0, 3).map((m) => ({ ...m }));
  cross.mons.nextId = 4;
  ensureNightObservatoryState(cross);
  autoFillNightObservatory(cross);
  const crossRun = advanceNightObservatory(cross, 7200, { nowMs: at(20), randFloat: () => 0.2 });
  const expectCross = Math.floor((3600 * 0.4 * 1.36 + 3600 * 1.36) / NIGHT_OBS_CYCLE_SEC);
  assert.equal(crossRun.sightings.length, expectCross, "offline catch-up across 19:00 credits dusk + night chunks separately");
  assert.ok(crossRun.sightings.some((s) => s.phase === "dusk") && crossRun.sightings.some((s) => s.phase === "night"), "catch-up journal entries carry both phases");
  assert.ok(advanceNightObservatory(cross, 1, { nowMs: at(12) }).phaseChanged, "phase change night → dusk is reported for a UI refresh");

  // 5) 提灯夜巡: free once per local day, then futurecoin ×25; needs observers
  st.res.futurecoin.value = 30;
  const patrol1 = performLanternPatrol(st, { nowMs: at(12), randFloat: () => 0.1 });
  assert.ok(patrol1.ok && patrol1.costKind === "free_daily" && patrol1.sightings.length === NIGHT_OBS_PATROL_SIGHTINGS, "first lantern patrol of the day is free and records 3 sightings");
  assert.ok(getNightPatrolFreeLeft(st, at(12)) === 0 && getNightPatrolFreeLeft(st, at(12, 0, 0, 19)) === 1, "free patrol resets on the next local day");
  const patrol2 = performLanternPatrol(st, { nowMs: at(13), randFloat: () => 0.1 });
  assert.ok(patrol2.ok && patrol2.costKind === "futurecoin" && st.res.futurecoin.value === 5, "second patrol costs futurecoin ×25");
  assert.equal(performLanternPatrol(st, { nowMs: at(14) }).reason, "insufficient_patrol_cost", "patrol blocked without coins");
  const lonely = defaultState();
  ensureNightObservatoryState(lonely);
  assert.equal(performLanternPatrol(lonely, { nowMs: at(23) }).reason, "no_observers", "patrol needs at least one observer");

  // 6) Nocturnal forms: ≥3 recorded sightings + lanterns ×4 + futurecoin ×40; small stat at night, reduced in dusk
  st.res.futurecoin.value = 500;
  st.res.fireflyLantern.value = 50;
  assert.equal(awakenNocturnalForm(st, 4).reason, "need_observation", "a partner that never observed cannot awaken a form");
  const formRes = awakenNocturnalForm(st, 1, { nowMs: at(23) });
  assert.ok(formRes.ok && formRes.formName === NOCTURNAL_FORM_DEFS.dark.name, "dark observer awakens 「月蚀影纱」");
  assert.ok(st.res.fireflyLantern.value === 50 - NIGHT_OBS_FORM_COST.fireflyLantern && st.res.futurecoin.value === 500 - NIGHT_OBS_FORM_COST.futurecoin, "form costs lanterns ×4 + futurecoin ×40");
  assert.equal(awakenNocturnalForm(st, 1).reason, "already_awakened", "a form awakens only once");
  const fNight = getMonNocturnalFormBonus(st, 1, at(23));
  const fDay = getMonNocturnalFormBonus(st, 1, at(12));
  assert.ok(fNight.hasForm && fNight.combatMul === 1.05 && fNight.showScoreMul === 1.08 && fDay.combatMul === 1.02 && fDay.showScoreMul === 1.04, "nocturnal form: +5% combat / +8% show at night, +2% / +4% by day");
  assert.equal(getMonNocturnalFormBonus(st, 2, at(23)).hasForm, false, "partners without a form get no bonus");
  assert.equal(getNocturnalFormDefForMon(st.mons.list[3]).name, NOCTURNAL_FORM_DEFS.fire.name, "form name follows the partner's primary element");

  // 7) Aura: night production aura scales with the phase; journal pages give a permanent bonus; feeds production / tech / breeding
  const auraNight = computeNightObservatoryAura(st, at(23));
  const auraDay = computeNightObservatoryAura(st, at(12));
  assert.ok(auraNight.stationedCount === 3 && auraNight.discovered >= 2 && auraNight.formsAwakened === 1, "aura counts observers, journal pages and forms");
  assert.ok(Math.abs(auraDay.nightProdAdd - auraNight.nightProdAdd * NIGHT_OBS_DUSK_AURA_MUL) < 1e-3, "dusk mode applies 40% of the night production aura");
  assert.ok(auraNight.prodMul > auraDay.prodMul && auraDay.prodMul > 1, "night aura is stronger, dusk still above neutral");
  assert.ok(auraNight.shinyChanceMul === auraDay.shinyChanceMul && auraNight.shinyAdd === Math.round(auraNight.discovered * 0.004 * 10000) / 10000, "journal shiny bonus is permanent (time-independent)");
  recallNightObservatory(st);
  const auraIdle = computeNightObservatoryAura(st, at(23));
  assert.ok(auraIdle.nightProdAdd === 0 && auraIdle.journalProdAdd > 0 && auraIdle.prodMul > 1, "without observers only the permanent journal bonus remains");
  autoFillNightObservatory(st);
  const bareRef = defaultState();
  const bareRates = { catnipPerSec: 10, woodPerSec: 10, mineralsPerSec: 10 };
  finalizeProductionRates(bareRates, bareRef, 1);
  const nightRates = { catnipPerSec: 10, woodPerSec: 10, mineralsPerSec: 10 };
  finalizeProductionRates(nightRates, st, 1);
  assert.ok(nightRates.catnipPerSec > bareRates.catnipPerSec * (1 + auraDay.prodAdd * 0.99), "finalizeProductionRates applies the observatory prodMul");
  const bareTech = computeTechEffects(bareRef, { tech: {} }, { serverBuffLevels: new Map() });
  const obsTech = computeTechEffects(st, { tech: {} }, { serverBuffLevels: new Map() });
  assert.ok(obsTech.shinyChanceMul > bareTech.shinyChanceMul, "computeTechEffects applies the journal shiny bonus");
  assert.ok(computeBreedingShinyInfo(st, st.mons.list[3], st.mons.list[4]).rate > computeBreedingShinyInfo(bareRef, st.mons.list[3], st.mons.list[4]).rate, "computeBreedingShinyInfo applies the journal shiny bonus");

  // 8) Forced release detaches the observer (seat, tally, form); save/load roundtrip; rebirth recalls the station
  const keepTally = st.meta.nightObservatory.tally["2"];
  const forced = releaseMonIds(st, [1], { protectIds: new Set() });
  assert.equal(forced.removed, 1, "unprotected release removes observer #1");
  assert.ok(!st.meta.nightObservatory.stationedIds.includes(1) && !st.meta.nightObservatory.forms["1"] && !st.meta.nightObservatory.tally["1"], "forced release drops the seat, tally and nocturnal form");
  assert.ok(st.meta.nightObservatory.tally["2"] === keepTally && st.meta.nightObservatory.stationedIds.includes(2), "other observers keep their seats and tallies");
  const saved = JSON.parse(JSON.stringify(serializeState(st)));
  const reloaded = loadFromRaw(saved);
  const ro = ensureNightObservatoryState(reloaded);
  assert.ok(ro.stationedIds.includes(2) && ro.sightings.nc_gala_pumpkin >= 1 && ro.journal.length > 0, "stationed observers and journal survive serializeState -> loadFromRaw");
  assert.ok(busyMonIds(reloaded).has(2), "reloaded observers stay protected");
  ro.forms["2"] = { element: "mystic", at: 1 };
  reloaded.dex.caught = Object.fromEntries([...Array(155)].map((_, i) => [String(i + 1), 1]));
  reloaded.tech = Object.fromEntries([...Array(16)].map((_, i) => [`t${i}`, true]));
  reloaded.buildings.field.owned = 60;
  reloaded.shinyCount = 5;
  reloaded.catchCount = 999;
  reloaded.era = emptyEraState(ERA_DEFS.length - 1);
  bumpEraCounter(reloaded, "catch_count", 999);
  bumpEraCounter(reloaded, "pokeball_earned", 999);
  bumpEraCounter(reloaded, "gather_total", 999);
  bumpEraCounter(reloaded, "berry_earned", 999);
  syncEraQuests(reloaded);
  const pagesBefore = computeNightObservatoryAura(reloaded, at(23)).discovered;
  reloaded.pve.acrobatShow = { ...(reloaded.pve.acrobatShow || {}), routine: [{ monId: 2, moveId: "any_bow" }] };
  assert.equal(confirmPrestige(reloaded).ok, true, "confirmPrestige succeeds with the observatory populated");
  assert.equal(reloaded.pve.acrobatShow.routine.length, 0, "rebirth clears the acrobat stage routine");
  assert.equal(getNightObservatoryStationedMonIds(reloaded).size, 0, "rebirth recalls every observer");
  assert.ok(Object.keys(reloaded.meta.nightObservatory.forms).length === 0 && Object.keys(reloaded.meta.nightObservatory.tally).length === 0, "rebirth clears per-partner tallies/forms (partner ids reset)");
  assert.equal(computeNightObservatoryAura(reloaded, at(23)).discovered, pagesBefore, "journal pages persist across rebirth");
  recallNightObservatory(st);
  assert.equal(getNightObservatoryStationedMonIds(st).size, 0, "recallNightObservatory frees every observer");
  assert.ok(!busyMonIds(st).has(2), "recalled observers lose the release lock");
}

// ============================================================================
// ML-11: 萌灵「云顶浮空岛建造」— 设施等级 / 工期 / 建造伙伴防放生锁 / 真实公式光环 / 存档兼容 / 转生召回
// ============================================================================
{
  const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
  for (const iconKey of ["skyIsland", "buildHammer", "hatchAura", "migratingBird", "seasonCompass", "migrationMedal"]) {
    assert.ok(existsSync(path.join(rootDir, "assets", "ui_icons", `${iconKey}.webp`)), `ML-11 icon asset exists: ${iconKey}.webp`);
    assert.equal(WEBP_UI_ICONS[iconKey], iconKey, `WEBP_UI_ICONS registers ${iconKey}`);
    assert.ok(
      renderUiIcon(iconKey, 24).includes(`${iconKey}.webp?v=0.7.63`) && renderResSvg(iconKey, 20).includes(`${iconKey}.webp?v=0.7.63`),
      `rpg_svg_icons wires ${iconKey}.webp?v=0.7.63`,
    );
  }
  const ftSrc = readFileSync(path.join(rootDir, "modules", "tabs", "functions_tab.js"), "utf8");
  const ml11Ui = ftSrc.slice(ftSrc.indexOf("ML-11 Section: 萌灵「云顶浮空岛建造」"), ftSrc.indexOf("ML-10 Section: 萌灵「月光夜行"));
  assert.ok(ml11Ui.length > 1000 && !/<svg/i.test(ml11Ui) && !/<canvas/i.test(ml11Ui), "ML-11 UI uses webp icons only (no inline svg / canvas)");
  const tickSrc = readFileSync(path.join(rootDir, "modules", "tick.js"), "utf8");
  assert.ok(/rem0 - dtSec \* hatchSpeedMul/.test(tickSrc) && tickSrc.includes("advanceSkyIsland(state, dtSec)"), "tick.js advances the sky island and speeds the egg countdown by hatchSpeedMul");

  // 0) Old saves: no skyIsland → neutral aura, no crew, no crash
  const legacy = loadFromRaw(JSON.stringify({ version: 3, res: { futurecoin: { value: 5, cap: 999 } }, mons: { nextId: 2, list: [{ id: 1, dex: 76, pid: "p076", name: "镇岳巨岩尊", lvl: 5 }] } }));
  assert.ok(legacy && !legacy.meta.skyIsland, "legacy save loads without skyIsland");
  const legacyAura = computeSkyIslandAura(legacy);
  assert.ok(
    legacyAura.prodMul === 1 && legacyAura.catchAdd === 0 && legacyAura.hatchSpeedMul === 1 && legacyAura.breedShinyMul === 1 && legacyAura.hatchAffectionAdd === 0 && legacyAura.migrantHostCap === 1 && legacyAura.totalLevel === 0,
    "legacy sky-island aura is neutral (host cap 1)",
  );
  assert.equal(getSkyIslandCrewMonIds(legacy).size, 0, "legacy save has no crew");
  assert.deepEqual(advanceSkyIsland(legacy, 99_999), { progressed: 0, completed: null, paused: false, speedMul: 0 }, "advanceSkyIsland is a no-op without an island");
  assert.equal(busyMonIds(legacy).has(1), false, "legacy mon is not locked");

  // 1) Facility table, cost curve and work time
  assert.equal(SKY_ISLAND_FACILITY_DEFS.length, 5, "5 sky-island facilities");
  assert.ok(SKY_ISLAND_FACILITY_DEFS.every((f) => ["skyIsland", "buildHammer", "hatchAura", "migratingBird"].includes(f.icon)), "facility icons are the ML-11 webp set");
  assert.deepEqual(getSkyIslandUpgradeCost("cloudField", 1), { catnip: 120, wood: 60, futurecoin: 20 }, "cloud field Lv.1 cost");
  assert.deepEqual(getSkyIslandUpgradeCost("cloudField", 3), { catnip: 290, wood: 145, futurecoin: 50 }, "cost grows ×1.55 per level (rounded to 5)");
  assert.equal(getSkyIslandBuildSec("hatchNest", 2), 2160, "work time = baseSec × level");
  assert.equal(SKY_ISLAND_MAX_LEVEL, 5, "facilities cap at Lv.5");

  const sm = (id, dex, name, types, lvl = 40, extra = {}) => ({
    id, dex, pid: `p${String(dex).padStart(3, "0")}`, name, lvl, stars: 1, types, affection: 60,
    baseStats: { hp: 60, atk: 60, def: 60, spa: 60, spd: 60, spe: 60 }, iv: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 }, ...extra,
  });
  const st = defaultState();
  st.mons.list = [
    sm(1, 76, "镇岳巨岩尊", ["stone"], 60),
    sm(2, 4, "炽尾幼麟", ["fire"], 60),
    sm(3, 25, "星雷灵鼠", ["electric"], 60),
    sm(4, 7, "沧澜幼龟", ["water"], 90),
    sm(5, 1, "青萝幼龙", ["grass"], 30),
    sm(6, 63, "星眠小狐", ["mystic"], 30),
  ];
  st.mons.nextId = 7;
  st.training.activeIds = [5];
  st.res.catnip = { value: 500, cap: 999 };
  st.res.wood = { value: 500, cap: 999 };
  st.res.minerals = { value: 500, cap: 999 };
  st.res.futurecoin = { value: 300, cap: 99999 };
  const isl = ensureSkyIslandState(st);
  assert.ok(isl.initialized && isl.crewIds.length === 0 && isl.build === null, "ensureSkyIslandState creates a clean island");

  // 2) Prerequisites, one site at a time, payment
  assert.equal(canStartSkyIslandBuild(st, "hatchNest").reason, "locked", "暖云孵化巢 needs 云海灵田 Lv.1");
  const start = startSkyIslandBuild(st, "cloudField", { nowMs: 1 });
  assert.ok(start.ok && st.res.catnip.value === 380 && st.res.wood.value === 440 && st.res.futurecoin.value === 280, "starting Lv.1 pays the material cost");
  assert.equal(startSkyIslandBuild(st, "starHammer").reason, "site_busy", "only one construction site at a time");
  assert.ok(advanceSkyIsland(st, 600).paused && st.meta.skyIsland.build.progressSec === 0, "the site pauses without a crew");

  // 3) Crew: idle candidates skip training partners; auto-fill prefers build-affine types; max 3 seats
  assert.ok(!getIdleSkyIslandCandidates(st).some((m) => m.id === 5), "training partner #5 is not an idle crew candidate");
  const fill = autoFillSkyIslandCrew(st);
  assert.ok(fill.ok && fill.added.length === SKY_ISLAND_MAX_CREW && [1, 2, 3].every((id) => fill.added.includes(id)), "auto-fill picks the stone / fire / electric builders over a higher-level water partner");
  assert.equal(toggleSkyIslandCrewMon(st, 4).reason, "crew_full", "crew is capped at 3 seats");
  const ev3 = evaluateSkyIslandCrew(st.mons.list.slice(0, 3), st);
  assert.ok(ev3.affineCount === 3 && Math.abs(ev3.speedMul - (2.1 + 0.36 + 0.2)) < 1e-9, "3 affine Lv.60 builders → ×2.66 crew speed");
  assert.ok(evaluateSkyIslandCrew([], st).speedMul === 0 && evaluateSkyIslandCrew([st.mons.list[3]], st).speedMul === 1.3, "no crew → 0 · one Lv.90 non-affine helper → ×1.30");

  // 4) busyMonIds lock — release / weak-pick / sandbox / camp / dock / observatory / show auto-picks all skip the crew
  const busy = busyMonIds(st);
  for (const id of [1, 2, 3]) assert.ok(busy.has(id), `busyMonIds protects crew member #${id}`);
  const weak = pickWeakMonIds(st.mons.list, { softLimit: 1, batch: 10, protectIds: busy });
  for (const id of [1, 2, 3]) assert.ok(!weak.includes(id), `pickWeakMonIds skips crew member #${id}`);
  assert.equal(releaseMonIds(st, [1, 2, 3], { protectIds: busyMonIds(st) }).removed, 0, "releaseMonIds refuses to release the crew");
  assert.ok([1, 2, 3].every((id) => !getIdleEcoSandboxCandidates(st, "canopy").some((m) => m.id === id)), "crew excluded from eco sandbox");
  assert.ok([1, 2, 3].every((id) => getCampUnavailableMonIds(st).has(id)), "crew excluded from star camp");
  assert.ok([1, 2, 3].every((id) => !getIdleWishDockCandidates(st, "shoal").some((m) => m.id === id)), "crew excluded from the wish dock");
  assert.ok([1, 2, 3].every((id) => !getIdleNightObservatoryCandidates(st).some((m) => m.id === id)), "crew excluded from the moonlit observatory");
  assert.ok([1, 2, 3].every((id) => getAcrobatUnavailableMonIds(st).has(id)), "crew excluded from the acrobat show");
  autoFillNightObservatory(st);
  assert.ok(getNightObservatoryStationedMonIds(st).has(4) && !getIdleSkyIslandCandidates(st).some((m) => m.id === 4), "observatory partners cannot join the crew");
  recallNightObservatory(st);

  // 5) Advance: crew speed × time, completion raises the level and frees the site
  const need1 = getSkyIslandBuildSec("cloudField", 1);
  const half = advanceSkyIsland(st, 100);
  assert.ok(!half.completed && Math.abs(st.meta.skyIsland.build.progressSec - 100 * 2.66) < 1e-6, "100s of crew work at ×2.66");
  const done = advanceSkyIsland(st, need1);
  assert.ok(done.completed?.facilityId === "cloudField" && done.completed.level === 1 && st.meta.skyIsland.build === null, "site completes at the work target");
  assert.equal(computeSkyIslandAura(st).levels.cloudField, 1, "cloud field is now Lv.1");
  assert.ok(Object.values(st.meta.skyIsland.crewWork).reduce((s, v) => s + v, 0) > 0, "crew work minutes are tallied");

  // 6) 齐心夯土: free once per local day, then futurecoin ×20; needs a site and a crew; can finish a site early
  assert.equal(performSkyIslandRally(st).reason, "no_build", "rally needs an open site");
  assert.ok(startSkyIslandBuild(st, "cloudField").ok && st.meta.skyIsland.build.needSec === 1800, "cloud field Lv.2 site opened (30 min of work)");
  recallSkyIslandCrew(st);
  assert.equal(performSkyIslandRally(st).reason, "no_crew", "rally needs a crew");
  assert.ok(toggleSkyIslandCrewMon(st, 6).ok, "a single Lv.30 mystic helper joins (×1.10)");
  const d0 = new Date(2026, 10, 18, 12).getTime();
  st.res.futurecoin.value = 10;
  const r1 = performSkyIslandRally(st, { nowMs: d0 });
  assert.ok(r1.ok && r1.costKind === "free_daily" && Math.abs(r1.workSec - 990) < 1e-6 && !r1.completed, "first rally of the day is free and pushes 15 min × crew speed");
  assert.ok(getSkyIslandRallyFreeLeft(st, d0) === 0 && getSkyIslandRallyFreeLeft(st, d0 + 86_400_000) === 1, "free rally resets on the next local day");
  assert.equal(performSkyIslandRally(st, { nowMs: d0 + 1000 }).reason, "insufficient_rally_cost", "rally blocked without coins");
  st.res.futurecoin.value = 25;
  const r2 = performSkyIslandRally(st, { nowMs: d0 + 2000 });
  assert.ok(r2.ok && r2.costKind === "futurecoin" && st.res.futurecoin.value === 5 && r2.completed?.level === 2, "a paid rally (futurecoin ×20) finishes the site early");
  recallSkyIslandCrew(st);
  autoFillSkyIslandCrew(st);
  st.res.futurecoin.value = 300;

  // 7) Cancel refunds the materials; locked chain unlocks with levels
  assert.ok(startSkyIslandBuild(st, "hatchNest").ok, "暖云孵化巢 unlocks once 云海灵田 reaches Lv.1");
  const wBefore = st.res.wood.value;
  const cancel = cancelSkyIslandBuild(st);
  assert.ok(cancel.ok && st.meta.skyIsland.build === null && st.res.wood.value === wBefore + getSkyIslandUpgradeCost("hatchNest", 1).wood, "cancel refunds the paid materials");
  st.meta.skyIsland.levels = { cloudField: 5, starHammer: 5, hatchNest: 5, migrantPerch: 5, rainbowSpring: 5 };
  assert.equal(canStartSkyIslandBuild(st, "rainbowSpring").reason, "max_level", "Lv.5 is the cap");

  // 8) Auras wired into real formulas: production / effects / breeding / migration seats
  const full = computeSkyIslandAura(st);
  assert.ok(full.totalLevel === 25 && full.resonanceTier === 2 && full.islandTitle === "天穹圣岛", "all facilities Lv.5 → 天穹圣岛 resonance tier 2");
  assert.ok(Math.abs(full.prodAdd - (0.075 + 0.04 + 0.04)) < 1e-9, "全产 = 灵田 7.5% + 工坊 4% + 共鸣 4%");
  assert.ok(Math.abs(full.hatchSpeedMul - 1.45) < 1e-9 && Math.abs(full.breedShinyMul - 1.2) < 1e-9 && full.hatchAffectionAdd === 10, "孵化 ×1.45 · 育灵闪光 ×1.20 · 破壳亲密 +10");
  assert.ok(full.migrantHostCap === 3 && Math.abs(full.catchAdd - 0.025) < 1e-9, "perch Lv.5 → 3 stay-over seats · 工坊 catch +2.5%");
  const islRef = defaultState();
  const islBare = { catnipPerSec: 10, woodPerSec: 10, mineralsPerSec: 10 };
  finalizeProductionRates(islBare, islRef, 1);
  const islFull = { catnipPerSec: 10, woodPerSec: 10, mineralsPerSec: 10 };
  finalizeProductionRates(islFull, st, 1);
  assert.ok(islFull.catnipPerSec >= islBare.catnipPerSec * (1 + full.prodAdd) - 1e-6, "finalizeProductionRates applies the island prodMul");
  assert.ok(
    computeTechEffects(st, { tech: {} }, { serverBuffLevels: new Map() }).catchChanceAdd > computeTechEffects(islRef, { tech: {} }, { serverBuffLevels: new Map() }).catchChanceAdd,
    "computeTechEffects applies the workshop catch bonus",
  );
  assert.ok(
    computeBreedingShinyInfo(st, st.mons.list[3], st.mons.list[4]).rate > computeBreedingShinyInfo(islRef, st.mons.list[3], st.mons.list[4]).rate,
    "computeBreedingShinyInfo applies the rainbow-spring breeding shiny bonus",
  );
  assert.ok(
    computeBreedingShinyInfo(st, null, null, { shinyChanceMul: 1 }).rate > computeBreedingShinyInfo(islRef, null, null, { shinyChanceMul: 1 }).rate,
    "breeding-only island shiny bonus still applies when the global shiny mul is passed in (tick hatch path)",
  );

  // 9) Forced release detaches the helper; save/load roundtrip; rebirth recalls the crew but keeps levels and the open site
  st.meta.skyIsland.levels = { cloudField: 2, starHammer: 1, hatchNest: 1, migrantPerch: 0, rainbowSpring: 0 };
  startSkyIslandBuild(st, "hatchNest");
  advanceSkyIsland(st, 120);
  const forced = releaseMonIds(st, [2], { protectIds: new Set() });
  assert.equal(forced.removed, 1, "unprotected release removes crew member #2");
  assert.ok(!st.meta.skyIsland.crewIds.includes(2) && !st.meta.skyIsland.crewWork["2"], "forced release drops the seat and work tally");
  assert.ok(st.meta.skyIsland.crewIds.includes(1) && st.meta.skyIsland.crewIds.includes(3), "other helpers keep their seats");
  const saved = JSON.parse(JSON.stringify(serializeState(st)));
  const reloaded = loadFromRaw(saved);
  const ri = ensureSkyIslandState(reloaded);
  assert.ok(ri.crewIds.includes(1) && ri.build?.facilityId === "hatchNest" && ri.build.progressSec > 0 && ri.levels.cloudField === 2, "crew, open site and levels survive serializeState -> loadFromRaw");
  assert.ok(busyMonIds(reloaded).has(1), "reloaded crew stays protected");
  reloaded.dex.caught = Object.fromEntries([...Array(155)].map((_, i) => [String(i + 1), 1]));
  reloaded.tech = Object.fromEntries([...Array(16)].map((_, i) => [`t${i}`, true]));
  reloaded.buildings.field.owned = 60;
  reloaded.shinyCount = 5;
  reloaded.catchCount = 999;
  reloaded.era = emptyEraState(ERA_DEFS.length - 1);
  bumpEraCounter(reloaded, "catch_count", 999);
  bumpEraCounter(reloaded, "pokeball_earned", 999);
  bumpEraCounter(reloaded, "gather_total", 999);
  bumpEraCounter(reloaded, "berry_earned", 999);
  syncEraQuests(reloaded);
  assert.equal(confirmPrestige(reloaded).ok, true, "confirmPrestige succeeds with an island crew on site");
  assert.equal(getSkyIslandCrewMonIds(reloaded).size, 0, "rebirth recalls the whole crew");
  assert.ok(reloaded.meta.skyIsland.levels.cloudField === 2 && reloaded.meta.skyIsland.build?.facilityId === "hatchNest", "facility levels and the open site survive rebirth");
  assert.ok(advanceSkyIsland(reloaded, 600).paused, "after rebirth the site waits for a new crew");
  recallSkyIslandCrew(st);
  assert.equal(getSkyIslandCrewMonIds(st).size, 0, "recallSkyIslandCrew frees the whole crew");
  assert.ok(!busyMonIds(st).has(1), "recalled helpers lose the release lock");
}

// ============================================================================
// ML-12: 萌灵「寻宝地图远航」— 3 个残片来源 / 拼图 / 确定性宝岛网格 / 船员防放生锁 / 逐格探索 / 返航 / 纪念品光环 / 存档兼容 / 转生召回
// ============================================================================
{
  const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
  for (const iconKey of ["treasureMap", "mapFragment", "treasureIsland", "bandStage", "instrumentSet", "tourTrophy"]) {
    assert.ok(existsSync(path.join(rootDir, "assets", "ui_icons", `${iconKey}.webp`)), `ML-12 icon asset exists: ${iconKey}.webp`);
    assert.equal(WEBP_UI_ICONS[iconKey], iconKey, `WEBP_UI_ICONS registers ${iconKey}`);
    assert.ok(
      renderUiIcon(iconKey, 24).includes(`${iconKey}.webp?v=0.7.63`) && renderResSvg(iconKey, 20).includes(`${iconKey}.webp?v=0.7.63`),
      `rpg_svg_icons wires ${iconKey}.webp?v=0.7.63`,
    );
  }
  assert.ok(renderResSvg("mapFragment", 16).includes("mapFragment.webp?v=0.7.63"), "mapFragment resource icon resolves to mapFragment.webp");
  const ftSrc = readFileSync(path.join(rootDir, "modules", "tabs", "functions_tab.js"), "utf8");
  const ml12Ui = ftSrc.slice(ftSrc.indexOf("ML-12 Section: 萌灵「寻宝地图远航」"), ftSrc.indexOf("ML-11 Section: 萌灵「云顶浮空岛建造」"));
  assert.ok(ml12Ui.length > 4000 && ml12Ui.includes("ML-12 Section: 萌灵「乐队合奏音乐会」"), "ML-12 treasure + band UI sections exist ahead of ML-11");
  assert.ok(!/<svg/i.test(ml12Ui) && !/<canvas/i.test(ml12Ui), "ML-12 UI uses webp icons only (no inline svg / canvas)");
  assert.ok(!/\p{Extended_Pictographic}/u.test(ml12Ui), "ML-12 UI has no emoji");
  const tickSrc = readFileSync(path.join(rootDir, "modules", "tick.js"), "utf8");
  assert.ok(
    tickSrc.includes("advanceTreasureVoyage(state, dtSec)") && tickSrc.includes('grantTreasureMapFragments(state, "expedition", getTreasureExpeditionFragments(lvlKey), { addRes })'),
    "tick.js advances the voyage and grants expedition map fragments",
  );
  const monsRenderSrc = readFileSync(path.join(rootDir, "modules", "render", "mons.js"), "utf8");
  const monsTabSrc = readFileSync(path.join(rootDir, "modules", "tabs", "mons_tab.js"), "utf8");
  // ML-14 起：升星材料过滤 / 放生按钮 / 放生拦截统一读 collection_fun.js 的外出登记表（getAwayActivityMap / getAwayActivityOfMon）
  const voyageAway = CF.AWAY_ACTIVITY_DEFS.find((a) => a.id === "treasureVoyage");
  assert.ok(
    monsRenderSrc.includes("!awayMap.has(x.id)") && monsRenderSrc.includes("awayMap.get(m.id).releaseHint") && voyageAway?.releaseHint === "正在寻宝地图远航，返航后方可放生",
    "Mons list: voyage crew are not star-up material and their release button is disabled (unified away registry)",
  );
  assert.ok(
    monsTabSrc.includes("!awayIds.has(sid)") && monsTabSrc.includes("getAwayActivityOfMon(state, id)") && voyageAway?.blockLog.includes("该萌灵正在寻宝地图远航"),
    "Mons tab: star-up and single release both refuse the voyage crew (unified away registry)",
  );

  // 0) Old saves: no treasureVoyage → neutral aura, no crew, map-fragment bucket defaulted, no crash
  const legacy = loadFromRaw(JSON.stringify({ version: 3, res: { futurecoin: { value: 5, cap: 999 } }, mons: { nextId: 2, list: [{ id: 1, dex: 7, pid: "p007", name: "沧澜幼龟", lvl: 5 }] } }));
  assert.ok(legacy && !legacy.meta.treasureVoyage, "legacy save loads without treasureVoyage");
  assert.equal(typeof legacy.res.mapFragment?.value, "number", "legacy save gains a mapFragment bucket default");
  const legacyAura = CF.computeTreasureVoyageAura(legacy);
  assert.ok(legacyAura.prodMul === 1 && legacyAura.shinyChanceMul === 1 && legacyAura.catchAdd === 0 && legacyAura.keepsakeCount === 0 && !legacyAura.voyaging, "legacy treasure aura is neutral");
  assert.equal(CF.getTreasureVoyageCrewMonIds(legacy).size, 0, "legacy save has no voyage crew");
  assert.deepEqual(CF.advanceTreasureVoyage(legacy, 99_999), { arrived: false, progressed: 0 }, "advanceTreasureVoyage is a no-op without a tracker");
  assert.ok(!busyMonIds(legacy).has(1) && !legacy.meta.treasureVoyage, "legacy mon is not locked and no tracker was created");

  // 1) Fragment sources: expedition table, wish-dock claims (shoal ×1 / trench ×2), observatory every 3 sightings, cap 99
  assert.ok(
    CF.getTreasureExpeditionFragments("basic") === 1 &&
      CF.getTreasureExpeditionFragments("intermediate") === 1 &&
      CF.getTreasureExpeditionFragments("advanced") === 2 &&
      CF.getTreasureExpeditionFragments("super") === 2 &&
      CF.getTreasureExpeditionFragments("master") === 3 &&
      CF.getTreasureExpeditionFragments("legend") === 3 &&
      CF.getTreasureExpeditionFragments("???") === 1,
    "expedition fragment table 1/1/2/2/3/3/3 (unknown → 1)",
  );
  assert.deepEqual(CF.TREASURE_FRAGMENT_SOURCES.map((s) => s.id), ["dock", "observatory", "expedition"], "3 fragment sources from existing activities");
  const tm = (id, dex, name, types, lvl = 40, extra = {}) => ({
    id, dex, pid: `p${String(dex).padStart(3, "0")}`, name, lvl, stars: 1, types, affection: 60, exp: 0,
    baseStats: { hp: 60, atk: 60, def: 60, spa: 60, spd: 60, spe: 60 }, iv: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 }, ...extra,
  });
  const st = defaultState();
  st.mons.list = [
    tm(1, 7, "沧澜幼龟", ["water"], 60),
    tm(2, 76, "镇岳巨岩尊", ["stone"], 60),
    tm(3, 36, "月华星后", ["light"], 60),
    tm(4, 4, "炽尾幼麟", ["fire"], 90),
    tm(5, 63, "星眠小狐", ["mystic"], 30),
    tm(6, 94, "噬影夜魔王", ["dark"], 50),
    tm(7, 1, "青萝幼龙", ["grass"], 20),
  ];
  st.mons.nextId = 8;
  st.res.futurecoin = { value: 500, cap: 99999 };
  CF.ensureWishDockState(st);
  for (const [rid, crewId] of [["shoal", 6], ["trench", 7]]) {
    Object.assign(st.meta.wishDock.routes[rid], { active: true, completed: true, crewIds: [crewId], elapsedSec: 600, bottles: 2 });
  }
  const claims = claimAllWishDockRoutes(st, { randFloat: () => 0.99 });
  assert.ok(claims.ok && claims.mapFragments === 3 && st.res.mapFragment.value === 3, "dock claims: 星砂浅滩 ×1 + 深蓝星渊 ×2 map fragments");
  assert.ok(claims.claimed.find((c) => c.routeId === "trench").logLine.includes("藏宝图残片 +2"), "dock claim log mentions the fragments");
  assert.equal(st.meta.treasureVoyage.fragmentSources.dock, 3, "dock contribution is tallied");
  CF.ensureNightObservatoryState(st);
  assert.ok(CF.toggleNightObservatoryMon(st, 6).ok, "observer #6 stationed");
  const patrol = CF.performLanternPatrol(st, { nowMs: new Date(2026, 10, 18, 23).getTime(), randFloat: () => 0.1 });
  assert.ok(patrol.ok && patrol.sightings.length === 3 && patrol.mapFragments === 1, "3 recorded sightings hand over 1 map fragment");
  assert.ok(st.res.mapFragment.value === 4 && st.meta.treasureVoyage.fragmentSources.observatory === 1 && st.meta.treasureVoyage.obsCarry === 0, "observatory fragment stored, carry reset");
  const nightRun = CF.advanceNightObservatory(st, 1200, { nowMs: new Date(2026, 10, 18, 23, 30).getTime(), randFloat: () => 0.1 });
  assert.ok(nightRun.sightings.length >= 1 && st.meta.treasureVoyage.obsCarry === nightRun.sightings.length % 3, "live sightings keep counting toward the next fragment");
  CF.recallNightObservatory(st);
  assert.equal(CF.grantTreasureMapFragments(st, "expedition", 2), 2, "an advanced expedition grants 2 fragments");
  const fragNow = st.res.mapFragment.value;
  st.res.mapFragment.value = 98;
  assert.equal(CF.grantTreasureMapFragments(st, "expedition", 3), 1, "the fragment bucket caps at 99");
  st.res.mapFragment.value = fragNow;

  // 2) Assemble: 6 fragments → 1 map, at most 5 maps
  st.res.mapFragment.value = 5;
  assert.equal(CF.assembleTreasureMap(st).reason, "not_enough_fragments", "5 fragments are not enough");
  st.res.mapFragment.value = 13;
  const asm = CF.assembleTreasureMap(st);
  assert.ok(asm.ok && st.meta.treasureVoyage.maps === 1 && st.res.mapFragment.value === 7, "6 fragments → 1 treasure map");
  st.meta.treasureVoyage.maps = CF.TREASURE_MAP_MAX_MAPS;
  assert.equal(CF.assembleTreasureMap(st).reason, "maps_full", "at most 5 maps are kept");
  st.meta.treasureVoyage.maps = 1;

  // 3) Deterministic island layout from the seed
  const g1 = CF.generateTreasureIslandGrid("palmCove", 12345);
  const g2 = CF.generateTreasureIslandGrid("palmCove", 12345);
  assert.deepEqual(g1, g2, "same island + seed → identical 5×5 layout");
  assert.ok(g1.grid.length === 25 && g1.grid[CF.TREASURE_START_IDX] === "beach" && CF.TREASURE_START_IDX === 22, "landing beach at the bottom centre");
  assert.ok(g1.grid.filter((c) => c === "xmark").length === 1 && g1.grid[g1.xIdx] === "xmark" && g1.xIdx < 10, "exactly one X in the far two rows");
  assert.ok(g1.hintIdx.length === 4 && g1.hintIdx.includes(g1.xIdx), "the 2×2 red hint ring contains the X");
  const palm = CF.getTreasureIslandDef("palmCove");
  for (const [code, n] of Object.entries(palm.layout)) assert.equal(g1.grid.filter((c) => c === code).length, n, `palmCove layout places ${n} × ${code}`);
  assert.notDeepEqual(CF.generateTreasureIslandGrid("palmCove", 777).grid, g1.grid, "a different seed reshuffles the island");

  // 4) Crew roles: navigator / pathfinder / seeker
  const trio = st.mons.list.slice(0, 3);
  const ev = CF.evaluateTreasureVoyageCrew(trio, st);
  assert.ok(ev.navigators === 1 && ev.pathfinders === 1 && ev.seekers === 1 && ev.stamina === 18 && ev.sailMul === 0.85 && ev.lootMul === 1.1, "water/stone/light Lv.60 trio → stamina 18 · sail ×0.85 · loot ×1.10");
  assert.equal(CF.evaluateTreasureVoyageCrew([], st).stamina, 0, "no crew → no stamina");

  // 5) Setting sail: unlock gate, map + crew required, seed injected via randFloat
  assert.equal(CF.startTreasureVoyage(st, "mistVolcano").reason, "locked", "雾隐火山岛 needs 2 finished voyages");
  assert.equal(CF.startTreasureVoyage(st, "palmCove").reason, "no_crew", "a crew is required");
  assert.ok(CF.toggleTreasureVoyageCrewMon(st, 1).ok && CF.autoPickTreasureVoyageCrew(st).ok, "stage #1 then auto-pick the rest");
  assert.deepEqual(st.meta.treasureVoyage.stagedIds.slice().sort(), [1, 2, 3], "auto-pick prefers role coverage (stone / light) over the Lv.90 fire partner");
  assert.ok(!busyMonIds(st).has(1), "staged (not yet sailing) partners are not locked");
  const sail = CF.startTreasureVoyage(st, "palmCove", { randFloat: () => 0.37, nowMs: 1000 });
  const seed = Math.floor(0.37 * 2147483647) >>> 0;
  assert.ok(sail.ok && sail.seed === seed && sail.sailNeedSec === 510 && sail.stamina === 18, "sail: seed from the injected rng, 600s × 0.85 = 510s, stamina 18");
  const voy = () => st.meta.treasureVoyage.voyage; // ensure* re-normalizes the voyage object, so always re-read it
  assert.deepEqual(voy().grid, CF.generateTreasureIslandGrid("palmCove", seed).grid, "voyage grid = generator(seed)");
  assert.ok(st.meta.treasureVoyage.maps === 0 && st.meta.treasureVoyage.stagedIds.length === 0, "one map spent, staging cleared");
  assert.equal(CF.startTreasureVoyage(st, "palmCove").reason, "voyage_active", "one voyage at a time");

  // 6) busyMonIds release lock + every auto-pick skips the voyage crew
  const busy = busyMonIds(st);
  for (const id of [1, 2, 3]) assert.ok(busy.has(id), `busyMonIds protects voyage crew #${id}`);
  const weak = pickWeakMonIds(st.mons.list, { softLimit: 1, batch: 10, protectIds: busy });
  for (const id of [1, 2, 3]) assert.ok(!weak.includes(id), `pickWeakMonIds skips voyage crew #${id}`);
  assert.equal(releaseMonIds(st, [1, 2, 3], { protectIds: busyMonIds(st) }).removed, 0, "releaseMonIds refuses to release the crew");
  assert.ok([1, 2, 3].every((id) => !getIdleEcoSandboxCandidates(st, "canopy").some((m) => m.id === id)), "crew excluded from eco sandbox");
  assert.ok([1, 2, 3].every((id) => getCampUnavailableMonIds(st).has(id)), "crew excluded from star camp");
  assert.ok([1, 2, 3].every((id) => !getIdleWishDockCandidates(st, "shoal").some((m) => m.id === id)), "crew excluded from the wish dock");
  assert.ok([1, 2, 3].every((id) => !getIdleNightObservatoryCandidates(st).some((m) => m.id === id)), "crew excluded from the moonlit observatory");
  assert.ok([1, 2, 3].every((id) => !CF.getIdleSkyIslandCandidates(st).some((m) => m.id === id)), "crew excluded from sky-island builders");
  assert.ok([1, 2, 3].every((id) => getAcrobatUnavailableMonIds(st).has(id)), "crew excluded from the acrobat show");
  assert.ok([1, 2, 3].every((id) => PT.getBandUnavailableMonIds(st).has(id)), "crew excluded from the band concert");
  CF.autoFillSkyIslandCrew(st);
  assert.ok([1, 2, 3].every((id) => !CF.getSkyIslandCrewMonIds(st).has(id)), "sky-island auto-fill skips the voyage crew");
  CF.recallSkyIslandCrew(st);
  autoFillNightObservatory(st);
  assert.ok([1, 2, 3].every((id) => !getNightObservatoryStationedMonIds(st).has(id)), "observatory auto-fill skips the voyage crew");
  recallNightObservatory(st);
  PT.autofillAcrobatRoutine(st);
  assert.ok(st.pve.acrobatShow.routine.every((r) => ![1, 2, 3].includes(r.monId)), "acrobat auto-routine skips the voyage crew");
  st.pve.acrobatShow.routine = [];
  PT.autofillBandLineup(st);
  assert.ok([1, 2, 3].every((id) => !PT.getBandLineupMonIds(st).has(id)), "band auto-lineup skips the voyage crew");
  for (const p of PT.BAND_PARTS) st.meta.bandConcert.lineup[p.id] = 0;
  CF.autoPickWishDockCrew(st, "shoal");
  assert.ok(st.meta.wishDock.routes.shoal.stagedIds.every((id) => ![1, 2, 3].includes(id)), "dock auto-crew skips the voyage crew");
  st.meta.wishDock.routes.shoal.stagedIds = [];
  assert.equal(CF.toggleSkyIslandCrewMon(st, 1).reason, "mon_busy", "a voyage crew member cannot be put on the island crew");
  assert.ok(Object.values(PT.ensureSeasonMigrationState(st).hostedIds).every((x) => typeof x === "string"), "migration hosting seats visitors, never partners (nothing to exclude)");

  // 7) Sailing → arrival (offline catch-up ≤12h); exploring is blocked while sailing
  assert.equal(CF.exploreTreasureTile(st, 17).reason, "still_sailing", "cannot explore while sailing");
  const half = CF.advanceTreasureVoyage(st, 200);
  assert.ok(!half.arrived && voy().sailSec === 200, "200s of sailing");
  const arrive = CF.advanceTreasureVoyage(st, 99_999);
  assert.ok(arrive.arrived && voy().phase === "exploring" && voy().sailSec === 510, "arrival switches to exploring");

  // 8) Step-by-step exploration: adjacency, stamina, deterministic rewards credited immediately
  assert.equal(CF.exploreTreasureTile(st, 0).reason, "not_adjacent", "only fog next to explored tiles can be entered");
  assert.deepEqual(CF.getTreasureFrontier(voy()).sort((a, b) => a - b), [17, 21, 23], "frontier from the beach: up / left / right");
  const predicted = CF.computeTreasureTileReward(voy(), 17);
  const coinBefore = st.res.futurecoin.value;
  const resBefore = Object.fromEntries(Object.keys(predicted.res).map((rid) => [rid, Number(st.res[rid]?.value) || 0]));
  const step1 = CF.exploreTreasureTile(st, 17);
  assert.ok(step1.ok && voy().revealed[17] === 1 && voy().steps === 1, "tile #17 explored");
  const wantStamina = Math.max(0, 18 - 1 + Math.min(0, predicted.staminaDelta)) + Math.max(0, predicted.staminaDelta);
  assert.equal(voy().stamina, wantStamina, "stamina −1 per step (trap −1 more, spring +3)");
  for (const [rid, n] of Object.entries(predicted.res)) {
    const credited = (Number(st.res[rid]?.value) || 0) - resBefore[rid];
    assert.ok(credited === n || (rid === "futurecoin" && credited >= n), `tile loot ${rid} +${n} credited immediately`);
  }
  assert.deepEqual(CF.computeTreasureTileReward(voy(), 17), predicted, "tile rewards are a pure function of (seed, tile)");
  void coinBefore;
  const twin = JSON.parse(JSON.stringify(st));
  const autoA = CF.autoExploreTreasureIsland(st, { addExpToMon: (m, n) => { m.exp = (m.exp || 0) + n; } });
  const autoB = CF.autoExploreTreasureIsland(twin);
  assert.deepEqual(autoA.steps.map((s) => s.idx), autoB.steps.map((s) => s.idx), "auto-explore is deterministic for the same seed");
  assert.deepEqual(autoA.finished.summary.haul, autoB.finished.summary.haul, "identical haul for the same seed");
  assert.ok(autoA.ok && autoA.finished?.ok && autoA.finished.summary.reason === "exhausted", "auto-explore spends the stamina and sails home");
  assert.ok(autoA.steps.some((s) => s.code === "xmark") && autoA.finished.summary.foundX, "the greedy route digs up the X inside the red ring");
  assert.ok(st.meta.treasureVoyage.keepsakes.coconutChime === 1, "the X hands over the 椰壳风铃 keepsake");
  const lastV = st.meta.treasureVoyage.lastVoyage;
  assert.ok(st.meta.treasureVoyage.voyage === null && st.meta.treasureVoyage.totalVoyages === 1 && lastV.steps === 1 + autoA.steps.length, "voyage closed and logged");
  assert.ok(lastV.expPerMon === 30 * lastV.steps && lastV.returnCoin === 2 * lastV.steps && st.mons.list[0].exp === lastV.expPerMon, "return bonus: crew exp +30 / futurecoin +2 per tile");
  assert.ok([1, 2, 3].every((id) => !busyMonIds(st).has(id)), "returning frees the release lock");

  // 9) Keepsake aura wired into production / effects / breeding
  st.meta.treasureVoyage.keepsakes = Object.fromEntries(CF.TREASURE_KEEPSAKE_DEFS.map((k) => [k.id, 1]));
  const full = CF.computeTreasureVoyageAura(st);
  assert.ok(full.fullSet && full.title === "寻宝传说" && Math.abs(full.prodAdd - (0.036 + 0.03)) < 1e-9 && Math.abs(full.shinyAdd - 0.03) < 1e-9 && Math.abs(full.catchAdd - 0.012) < 1e-9, "6 keepsakes → 全产 +6.6% · 闪光 +3% · 捕获 +1.2%");
  const ref = defaultState();
  const bare = { catnipPerSec: 10, woodPerSec: 10, mineralsPerSec: 10 };
  finalizeProductionRates(bare, ref, 1);
  const boosted = { catnipPerSec: 10, woodPerSec: 10, mineralsPerSec: 10 };
  finalizeProductionRates(boosted, st, 1);
  assert.ok(boosted.catnipPerSec >= bare.catnipPerSec * full.prodMul - 1e-6, "finalizeProductionRates applies the keepsake prodMul");
  assert.ok(
    computeTechEffects(st, { tech: {} }, { serverBuffLevels: new Map() }).catchChanceAdd > computeTechEffects(ref, { tech: {} }, { serverBuffLevels: new Map() }).catchChanceAdd,
    "computeTechEffects applies the keepsake catch bonus",
  );
  assert.ok(computeBreedingShinyInfo(st, st.mons.list[3], st.mons.list[4]).rate > computeBreedingShinyInfo(ref, st.mons.list[3], st.mons.list[4]).rate, "breeding shiny odds include the keepsake aura");

  // 10) Unlock chain, gull assist, abort while sailing refunds the map
  st.meta.treasureVoyage.totalVoyages = 2;
  assert.ok(CF.isTreasureIslandUnlocked(st, "mistVolcano") && !CF.isTreasureIslandUnlocked(st, "starRuins"), "2 voyages unlock 雾隐火山岛, 星沙古堡岛 still needs 5");
  assert.equal(CF.performTreasureGullAssist(st).reason, "no_voyage", "gull assist needs a voyage");
  st.meta.treasureVoyage.maps = 2;
  CF.autoPickTreasureVoyageCrew(st);
  assert.ok(CF.startTreasureVoyage(st, "mistVolcano", { seed: 4242 }).ok, "sail to 雾隐火山岛 with an explicit seed");
  const d0 = new Date(2026, 10, 18, 12).getTime();
  st.res.futurecoin.value = 25;
  const gull1 = CF.performTreasureGullAssist(st, { nowMs: d0 });
  assert.ok(gull1.ok && gull1.costKind === "free_daily" && gull1.kind === "arrive" && st.meta.treasureVoyage.voyage.phase === "exploring", "free gull assist: instant arrival");
  const stam0 = st.meta.treasureVoyage.voyage.stamina;
  const gull2 = CF.performTreasureGullAssist(st, { nowMs: d0 + 1000 });
  assert.ok(gull2.ok && gull2.costKind === "futurecoin" && gull2.kind === "stamina" && st.meta.treasureVoyage.voyage.stamina === stam0 + 3 && st.res.futurecoin.value === 5, "paid gull assist: +3 stamina for futurecoin ×20");
  assert.equal(CF.performTreasureGullAssist(st, { nowMs: d0 + 2000 }).reason, "insufficient_gull_cost", "gull blocked without coins");
  assert.ok(CF.getTreasureGullFreeLeft(st, d0) === 0 && CF.getTreasureGullFreeLeft(st, d0 + 86_400_000) === 1, "free gull resets the next local day");
  const ret = CF.returnFromTreasureVoyage(st);
  assert.ok(ret.ok && !ret.aborted && st.meta.treasureVoyage.totalVoyages === 3, "manual return while exploring closes the voyage");
  CF.autoPickTreasureVoyageCrew(st);
  assert.ok(CF.startTreasureVoyage(st, "palmCove", { seed: 99 }).ok && st.meta.treasureVoyage.maps === 0, "sail again (last map)");
  const abort = CF.returnFromTreasureVoyage(st);
  assert.ok(abort.ok && abort.aborted && abort.refundedMap && st.meta.treasureVoyage.maps === 1 && st.meta.treasureVoyage.totalVoyages === 3, "turning back while sailing refunds the map and does not count");

  // 11) Forced release detaches crew; emptied crew ends the voyage; save/load roundtrip; rebirth recalls the crew
  CF.autoPickTreasureVoyageCrew(st);
  const crew3 = st.meta.treasureVoyage.stagedIds.slice();
  assert.ok(CF.startTreasureVoyage(st, "palmCove", { seed: 2026 }).ok, "sail with a 3-partner crew");
  const forced = releaseMonIds(st, [crew3[0]], { protectIds: new Set() });
  assert.ok(forced.removed === 1 && !st.meta.treasureVoyage.voyage.crewIds.includes(crew3[0]) && st.meta.treasureVoyage.voyage.crewIds.length === 2, "forced release drops the partner from the voyage crew");
  const saved = JSON.parse(JSON.stringify(serializeState(st)));
  const reloaded = loadFromRaw(saved);
  const rv = CF.ensureTreasureVoyageState(reloaded).voyage;
  assert.ok(rv && rv.phase === "sailing" && rv.grid.length === 25 && rv.seed === 2026 && rv.crewIds.length === 2, "voyage survives serializeState -> loadFromRaw");
  assert.ok(rv.crewIds.every((id) => busyMonIds(reloaded).has(id)), "reloaded crew stays protected");
  const bogus = loadFromRaw(JSON.stringify({ ...saved, meta: { ...saved.meta, treasureVoyage: { ...saved.meta.treasureVoyage, maps: 99, voyage: { ...saved.meta.treasureVoyage.voyage, grid: ["lava"] } } } }));
  assert.ok(bogus.meta.treasureVoyage.voyage === null && bogus.meta.treasureVoyage.maps === CF.TREASURE_MAP_MAX_MAPS, "corrupt grids are dropped and map counts clamped on load");
  releaseMonIds(st, st.meta.treasureVoyage.voyage.crewIds.slice(), { protectIds: new Set() });
  assert.ok(st.meta.treasureVoyage.voyage === null && st.meta.treasureVoyage.maps === 1, "an emptied sailing crew ends the voyage and refunds the map");
  reloaded.dex.caught = Object.fromEntries([...Array(155)].map((_, i) => [String(i + 1), 1]));
  reloaded.tech = Object.fromEntries([...Array(16)].map((_, i) => [`t${i}`, true]));
  reloaded.buildings.field.owned = 60;
  reloaded.shinyCount = 5;
  reloaded.catchCount = 999;
  reloaded.era = emptyEraState(ERA_DEFS.length - 1);
  bumpEraCounter(reloaded, "catch_count", 999);
  bumpEraCounter(reloaded, "pokeball_earned", 999);
  bumpEraCounter(reloaded, "gather_total", 999);
  bumpEraCounter(reloaded, "berry_earned", 999);
  syncEraQuests(reloaded);
  const mapsBefore = reloaded.meta.treasureVoyage.maps;
  assert.equal(confirmPrestige(reloaded).ok, true, "confirmPrestige succeeds with a voyage at sea");
  assert.ok(CF.getTreasureVoyageCrewMonIds(reloaded).size === 0 && reloaded.meta.treasureVoyage.voyage === null, "rebirth recalls the voyage crew");
  assert.ok(reloaded.meta.treasureVoyage.maps === mapsBefore + 1 && reloaded.meta.treasureVoyage.keepsakes.coconutChime === 1, "a sailing voyage refunds its map on rebirth; keepsakes are permanent");
}

// ============================================================================
// ML-13: 萌灵「温泉疗愈乡」— 汤池属性 / 泡汤位 / 防放生锁 + 全部自动挑选排除 / 30 分钟一轮疗愈 / 舒缓状态时长与流逝 /
//        离线补算 12h / 热毛巾招待 / 光环接线 / 强制放生 / 存档兼容 / 转生召回
// ============================================================================
{
  const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
  for (const iconKey of ["hotSpring", "bathBucket", "relaxTowel", "postOffice", "messengerBag", "postmarkStamp"]) {
    assert.ok(existsSync(path.join(rootDir, "assets", "ui_icons", `${iconKey}.webp`)), `ML-13 icon asset exists: ${iconKey}.webp`);
    assert.equal(WEBP_UI_ICONS[iconKey], iconKey, `WEBP_UI_ICONS registers ${iconKey}`);
    assert.ok(
      renderUiIcon(iconKey, 24).includes(`${iconKey}.webp?v=0.7.63`) && renderResSvg(iconKey, 20).includes(`${iconKey}.webp?v=0.7.63`),
      `rpg_svg_icons wires ${iconKey}.webp?v=0.7.63`,
    );
  }
  const ftSrc = readFileSync(path.join(rootDir, "modules", "tabs", "functions_tab.js"), "utf8");
  const ml13Ui = ftSrc.slice(ftSrc.indexOf("ML-13 Section: 萌灵「温泉疗愈乡」"), ftSrc.indexOf("ML-12 Section: 萌灵「寻宝地图远航」"));
  assert.ok(ml13Ui.length > 4000 && ml13Ui.includes("ML-13 Section: 萌灵「邮局信使网络」"), "ML-13 hot spring + post office UI sections exist ahead of ML-12");
  assert.ok(!/<svg/i.test(ml13Ui) && !/<canvas/i.test(ml13Ui), "ML-13 UI uses webp icons only (no inline svg / canvas)");
  assert.ok(!/\p{Extended_Pictographic}/u.test(ml13Ui), "ML-13 UI has no emoji");
  assert.ok(ftSrc.includes("patchHotSpringLiveDom(stLive)") && ftSrc.includes("patchPostOfficeLiveDom(stLive)"), "ML-13 progress bars are live-patched between full re-renders");
  const tickSrc = readFileSync(path.join(rootDir, "modules", "tick.js"), "utf8");
  assert.ok(tickSrc.includes("advanceHotSpring(state, dtSec)") && tickSrc.includes("advancePostOffice(state, dtSec)"), "tick.js advances the hot spring and the post office");
  const monsRenderSrc = readFileSync(path.join(rootDir, "modules", "render", "mons.js"), "utf8");
  const monsTabSrc = readFileSync(path.join(rootDir, "modules", "tabs", "mons_tab.js"), "utf8");
  const springAway = CF.AWAY_ACTIVITY_DEFS.find((a) => a.id === "hotSpring");
  const postAway = CF.AWAY_ACTIVITY_DEFS.find((a) => a.id === "postOffice");
  assert.ok(
    monsRenderSrc.includes("!awayMap.has(x.id)") &&
      monsRenderSrc.includes("awayMap.get(m.id).releaseHint") &&
      springAway?.releaseHint === "正在温泉疗愈乡泡汤，出浴后方可放生" &&
      postAway?.releaseHint === "正在萌灵邮局外出送信，拆开回信后方可放生",
    "Mons list: soakers / messengers are not star-up material and their release button is disabled (unified away registry)",
  );
  assert.ok(
    monsTabSrc.includes("!awayIds.has(sid)") && monsTabSrc.includes("getAwayActivityOfMon(state, id)") && springAway?.blockLog.includes("该萌灵正在温泉疗愈乡泡汤") && postAway?.blockLog.includes("该萌灵正在萌灵邮局外出送信"),
    "Mons tab: star-up and single release both refuse soakers and messengers (unified away registry)",
  );

  // 0) Old saves: no hotSpring → neutral aura, no soakers, advance is a no-op that creates nothing
  const legacy = loadFromRaw(JSON.stringify({ version: 3, res: { futurecoin: { value: 5, cap: 999 } }, mons: { nextId: 2, list: [{ id: 1, dex: 4, pid: "p004", name: "炽尾幼麟", lvl: 5 }] } }));
  assert.ok(legacy && !legacy.meta.hotSpring, "legacy save loads without hotSpring");
  const legacyAura = CF.computeHotSpringAura(legacy);
  assert.ok(
    legacyAura.prodMul === 1 && legacyAura.shinyChanceMul === 1 && legacyAura.catchAdd === 0 && legacyAura.pveOutAdd === 0 && legacyAura.activeCount === 0 && legacyAura.soakingCount === 0,
    "legacy hot-spring aura is neutral",
  );
  assert.equal(CF.getHotSpringSoakingMonIds(legacy).size, 0, "legacy save has no soakers");
  assert.equal(CF.advanceHotSpring(legacy, 99_999).rounds, 0, "advanceHotSpring is a no-op without a tracker");
  assert.ok(!busyMonIds(legacy).has(1) && !legacy.meta.hotSpring, "legacy mon is not locked and no tracker was created");
  assert.equal(PT.computeDualSanctumBadgeBonus(legacy).hotSpringOutAdd, 0, "PvE aggregator: no hot-spring bonus on legacy saves");

  // 1) Tables: 4 pools cover all 9 elements, 4 timed states, unlock rounds 0 / 0 / 4 / 10
  const poolEls = new Set(CF.HOT_SPRING_POOL_DEFS.flatMap((p) => p.elements));
  assert.ok(CF.HOT_SPRING_POOL_DEFS.length === 4 && poolEls.size === 9, "4 pools cover all 9 elements");
  assert.deepEqual(CF.HOT_SPRING_POOL_DEFS.map((p) => p.unlockRounds), [0, 0, 4, 10], "pool unlocks at 0 / 0 / 4 / 10 rounds");
  assert.deepEqual(CF.HOT_SPRING_STATE_DEFS.map((s) => s.id), ["warm", "herbal", "breezy", "starglow"], "4 timed states");
  assert.ok(CF.HOT_SPRING_ROUND_SEC === 1800 && CF.HOT_SPRING_STATE_MAX_SEC === 21600 && CF.HOT_SPRING_MAX_CATCHUP_SEC === 43200, "30-min rounds, 6h state cap, 12h catch-up");

  const hm = (id, dex, name, types, lvl = 40, extra = {}) => ({
    id, dex, pid: `p${String(dex).padStart(3, "0")}`, name, lvl, stars: 1, types, affection: 60, exp: 0,
    baseStats: { hp: 60, atk: 60, def: 60, spa: 60, spd: 60, spe: 60 }, iv: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 }, ...extra,
  });
  const st = defaultState();
  st.mons.list = [
    hm(1, 4, "炽尾幼麟", ["fire"], 60),
    hm(2, 76, "镇岳巨岩尊", ["stone"], 55),
    hm(3, 1, "青萝幼龙", ["grass"], 50),
    hm(4, 7, "沧澜幼龟", ["water"], 45),
    hm(5, 17, "疾风灵隼", ["wind"], 44),
    hm(6, 36, "月华星后", ["light"], 43),
    hm(7, 25, "星雷灵鼠", ["electric"], 90),
    hm(8, 94, "噬影夜魔王", ["dark"], 42),
  ];
  st.mons.nextId = 9;
  st.res.futurecoin = { value: 500, cap: 99999 };
  const hs0 = CF.ensureHotSpringState(st);
  assert.ok(hs0.initialized && hs0.totalRounds === 0 && Object.values(hs0.states).every((v) => v === 0), "fresh tracker: no rounds, no states");
  assert.ok(CF.isHotSpringPoolUnlocked(st, "emberRock") && CF.isHotSpringPoolUnlocked(st, "herbBamboo") && !CF.isHotSpringPoolUnlocked(st, "breezeMist"), "two pools open at the start");

  // 2) Seating: match detection, locked pool, full pool, toggling out
  const evFire = CF.evaluateHotSpringSoaker(st.mons.list[0], "emberRock");
  const evWater = CF.evaluateHotSpringSoaker(st.mons.list[3], "emberRock");
  assert.ok(evFire.match && evFire.stateSec === 1800 && evFire.affection === 5 && !evWater.match && evWater.stateSec === 1200 && evWater.affection === 3, "契合 soaker: +30 min / +5 affection; others +20 min / +3");
  assert.equal(CF.toggleHotSpringSoak(st, "breezeMist", 5).reason, "locked", "风铃云雾汤 needs 4 rounds");
  assert.ok(CF.toggleHotSpringSoak(st, "emberRock", 1).soaking, "炽尾幼麟 soaks in 熔岩暖石汤");
  assert.ok(CF.toggleHotSpringSoak(st, "emberRock", 7).ok, "a second (unmatched) soaker joins");
  assert.equal(CF.toggleHotSpringSoak(st, "emberRock", 2).reason, "pool_full", "2 seats per pool");
  const out = CF.toggleHotSpringSoak(st, "", 7);
  assert.ok(out.ok && !out.soaking && out.poolId === "emberRock" && !CF.getHotSpringSoakingMonIds(st).has(7), "toggling a soaker takes it out of the water");
  const filled = CF.autoFillHotSpring(st);
  assert.ok(filled.ok && filled.added.length === 3, "一键入池 fills the 3 free seats of the open pools");
  assert.deepEqual(st.meta.hotSpring.pools.emberRock.seatIds, [1, 2], "熔岩暖石汤 takes the stone partner (契合) before the Lv.90 electric one");
  assert.deepEqual(st.meta.hotSpring.pools.herbBamboo.seatIds.slice().sort(), [3, 4], "翠竹药草汤 takes the grass + water partners");
  assert.equal(CF.autoFillHotSpring(st).reason, "no_idle_or_full", "no free seats left");
  const soakers = [1, 2, 3, 4];

  // 3) busyMonIds release lock + every auto-pick skips the soakers
  const busy = busyMonIds(st);
  for (const id of soakers) assert.ok(busy.has(id), `busyMonIds protects soaker #${id}`);
  const weak = pickWeakMonIds(st.mons.list, { softLimit: 1, batch: 10, protectIds: busy });
  for (const id of soakers) assert.ok(!weak.includes(id), `pickWeakMonIds skips soaker #${id}`);
  assert.equal(releaseMonIds(st, soakers, { protectIds: busyMonIds(st) }).removed, 0, "releaseMonIds refuses to release soakers");
  assert.ok(soakers.every((id) => !getIdleEcoSandboxCandidates(st, "canopy").some((m) => m.id === id)), "soakers excluded from eco sandbox");
  assert.ok(soakers.every((id) => getCampUnavailableMonIds(st).has(id)), "soakers excluded from star camp");
  assert.ok(soakers.every((id) => !getIdleWishDockCandidates(st, "shoal").some((m) => m.id === id)), "soakers excluded from the wish dock");
  assert.ok(soakers.every((id) => !getIdleNightObservatoryCandidates(st).some((m) => m.id === id)), "soakers excluded from the moonlit observatory");
  assert.ok(soakers.every((id) => !CF.getIdleSkyIslandCandidates(st).some((m) => m.id === id)), "soakers excluded from sky-island builders");
  assert.ok(soakers.every((id) => !CF.getIdleTreasureVoyageCandidates(st).some((m) => m.id === id)), "soakers excluded from the treasure voyage crew");
  assert.ok(soakers.every((id) => !PT.getIdlePostMessengerCandidates(st).some((m) => m.id === id)), "soakers excluded from the post-office messengers");
  assert.ok(soakers.every((id) => getAcrobatUnavailableMonIds(st).has(id)), "soakers excluded from the acrobat show");
  assert.ok(soakers.every((id) => PT.getBandUnavailableMonIds(st).has(id)), "soakers excluded from the band concert");
  CF.autoFillSkyIslandCrew(st);
  assert.ok(soakers.every((id) => !CF.getSkyIslandCrewMonIds(st).has(id)), "sky-island auto-fill skips soakers");
  CF.recallSkyIslandCrew(st);
  autoFillNightObservatory(st);
  assert.ok(soakers.every((id) => !getNightObservatoryStationedMonIds(st).has(id)), "observatory auto-fill skips soakers");
  recallNightObservatory(st);
  CF.autoPickTreasureVoyageCrew(st);
  assert.ok(st.meta.treasureVoyage.stagedIds.every((id) => !soakers.includes(id)), "voyage auto-crew skips soakers");
  st.meta.treasureVoyage.stagedIds = [];
  PT.autofillAcrobatRoutine(st);
  assert.ok(st.pve.acrobatShow.routine.every((r) => !soakers.includes(r.monId)), "acrobat auto-routine skips soakers");
  st.pve.acrobatShow.routine = [];
  PT.autofillBandLineup(st);
  assert.ok(soakers.every((id) => !PT.getBandLineupMonIds(st).has(id)), "band auto-lineup skips soakers");
  for (const p of PT.BAND_PARTS) st.meta.bandConcert.lineup[p.id] = 0;
  CF.autoPickWishDockCrew(st, "shoal");
  assert.ok(st.meta.wishDock.routes.shoal.stagedIds.every((id) => !soakers.includes(id)), "dock auto-crew skips soakers");
  st.meta.wishDock.routes.shoal.stagedIds = [];
  PT.autoDispatchPostMessengers(st);
  assert.ok(st.meta.postOffice.trips.every((t) => !soakers.includes(t.monId)), "post-office auto-dispatch skips soakers");
  for (const t of st.meta.postOffice.trips.slice()) PT.recallPostMessenger(st, t.routeId);
  assert.equal(CF.toggleSkyIslandCrewMon(st, 1).reason, "mon_busy", "a soaker cannot be put on the island crew");
  assert.equal(CF.toggleTreasureVoyageCrewMon(st, 1).reason, "mon_busy", "a soaker cannot join the voyage crew");

  // 4) Rounds: 30 minutes per round, both pools fully 契合 → +60 min of their state per round, +5 affection each
  assert.equal(CF.advanceHotSpring(st, 1799).rounds, 0, "no round before 30 minutes");
  const r1 = CF.advanceHotSpring(st, 1);
  assert.ok(r1.rounds === 2 && r1.roundsByPool.emberRock === 1 && r1.roundsByPool.herbBamboo === 1, "both pools finish a round at 30 minutes");
  assert.ok(st.meta.hotSpring.states.warm === 3600 && st.meta.hotSpring.states.herbal === 3600 && st.meta.hotSpring.states.breezy === 0, "2 契合 soakers → 暖身 / 药香 +60 min each");
  assert.ok(soakers.every((id) => st.mons.list.find((m) => m.id === id).affection === 65) && r1.affectionGained === 20, "each 契合 soaker gains +5 affection");
  assert.equal(st.meta.hotSpring.totalRounds, 2, "rounds tallied per pool");
  const aura1 = CF.computeHotSpringAura(st);
  assert.ok(aura1.activeCount === 2 && aura1.prodAdd === 0.06 && aura1.pveOutAdd === 0.05 && aura1.catchAdd === 0 && aura1.shinyChanceMul === 1, "暖身 PvE +5% · 药香 全产 +6% active");

  const twinA = JSON.parse(JSON.stringify(st));
  const twinB = JSON.parse(JSON.stringify(st));
  CF.advanceHotSpring(twinA, 7200);
  for (let i = 0; i < 4; i += 1) CF.advanceHotSpring(twinB, 1800);
  assert.ok(twinA.meta.hotSpring.states.warm === 10800, "4 more rounds: each decays 30 min then adds 60 min (3600 → 10800)");
  assert.deepEqual(twinA.meta.hotSpring.states, twinB.meta.hotSpring.states, "one 2h step lands on the same states as four 30-min steps");

  // 5) Offline catch-up capped at 12h: chronological rounds, states capped at 6h, affection capped at 100, new pools unlock
  const off = CF.advanceHotSpring(st, 99_999);
  assert.ok(off.rounds === 48 && off.roundsByPool.emberRock === 24, "99 999 s of absence is capped at 12h = 24 rounds per pool");
  assert.ok(st.meta.hotSpring.states.warm === 21600 && st.meta.hotSpring.states.herbal === 21600, "timed states cap at 6 hours");
  assert.ok(soakers.every((id) => st.mons.list.find((m) => m.id === id).affection === 100), "affection caps at 100");
  assert.ok(st.meta.hotSpring.totalRounds === 50 && off.unlockedPools.includes("breezeMist") && off.unlockedPools.includes("moonMilk"), "50 rounds unlock 风铃云雾汤 (4) and 月华星乳汤 (10)");

  // 6) States decay once nobody soaks (they keep working after leaving the water)
  assert.ok(CF.recallHotSpring(st).recalled === 4 && CF.getHotSpringSoakingMonIds(st).size === 0, "全部出浴 frees every soaker");
  assert.ok(soakers.every((id) => !busyMonIds(st).has(id)), "leaving the water lifts the release lock");
  CF.advanceHotSpring(st, 3600);
  assert.ok(st.meta.hotSpring.states.warm === 18000 && CF.computeHotSpringAura(st).prodAdd === 0.06, "states tick down after leaving the water, still active");
  const exp = CF.advanceHotSpring(st, 18000);
  assert.ok(exp.expiredStates.includes("warm") && exp.expiredStates.includes("herbal") && CF.computeHotSpringAura(st).activeCount === 0, "states expire when their time runs out");

  // 7) 热毛巾招待: free once per local day, then futurecoin ×20; needs a soaker
  assert.equal(CF.performHotSpringTowel(st).reason, "no_soakers", "towel needs somebody in the water");
  assert.ok(CF.toggleHotSpringSoak(st, "breezeMist", 5).ok && CF.toggleHotSpringSoak(st, "moonMilk", 6).ok, "the newly opened pools take soakers");
  const d0 = new Date(2026, 10, 18, 12).getTime();
  st.res.futurecoin.value = 25;
  const t1 = CF.performHotSpringTowel(st, { nowMs: d0 });
  assert.ok(t1.ok && t1.costKind === "free_daily" && t1.pools.length === 2 && st.meta.hotSpring.states.breezy === 1800 && st.meta.hotSpring.states.starglow === 1800, "free towel: both occupied pools finish a round on the spot");
  const t2 = CF.performHotSpringTowel(st, { nowMs: d0 + 1000 });
  assert.ok(t2.ok && t2.costKind === "futurecoin" && st.res.futurecoin.value === 5 && st.meta.hotSpring.states.breezy === 3600, "paid towel costs futurecoin ×20");
  assert.equal(CF.performHotSpringTowel(st, { nowMs: d0 + 2000 }).reason, "insufficient_towel_cost", "towel blocked without coins");
  assert.ok(CF.getHotSpringTowelFreeLeft(st, d0) === 0 && CF.getHotSpringTowelFreeLeft(st, d0 + 86_400_000) === 1, "free towel resets the next local day");

  // 8) Aura wiring: production / effects / breeding / PvE damage
  const aura = CF.computeHotSpringAura(st);
  assert.ok(aura.catchAdd === 0.01 && aura.shinyAdd === 0.1 && aura.shinyChanceMul === 1.1, "轻盈 捕获 +1% · 星辉 闪光 +10% active");
  const ref = defaultState();
  st.meta.hotSpring.states.herbal = 600;
  st.meta.hotSpring.states.warm = 600;
  const bare = { catnipPerSec: 10, woodPerSec: 10, mineralsPerSec: 10 };
  finalizeProductionRates(bare, ref, 1);
  const boosted = { catnipPerSec: 10, woodPerSec: 10, mineralsPerSec: 10 };
  finalizeProductionRates(boosted, st, 1);
  assert.ok(boosted.catnipPerSec >= bare.catnipPerSec * 1.06 - 1e-6, "finalizeProductionRates applies 药香");
  const effS = computeTechEffects(st, { tech: {} }, { serverBuffLevels: new Map() });
  const effR = computeTechEffects(ref, { tech: {} }, { serverBuffLevels: new Map() });
  assert.ok(effS.catchChanceAdd > effR.catchChanceAdd && effS.shinyChanceMul > effR.shinyChanceMul, "computeTechEffects applies 轻盈 / 星辉");
  assert.ok(computeBreedingShinyInfo(st, st.mons.list[0], st.mons.list[1]).rate > computeBreedingShinyInfo(ref, st.mons.list[0], st.mons.list[1]).rate, "breeding shiny odds include 星辉");
  assert.ok(Math.abs(PT.computeDualSanctumBadgeBonus(st).hotSpringOutAdd - 0.05) < 1e-9, "PvE damage aggregator includes 暖身");

  // 9) Forced release detaches; save/load roundtrip; corrupt data clamped; rebirth recalls soakers but keeps states / rounds
  const forced = releaseMonIds(st, [5], { protectIds: new Set() });
  assert.ok(forced.removed === 1 && !CF.getHotSpringSoakingMonIds(st).has(5) && st.meta.hotSpring.pools.breezeMist.seatIds.length === 0, "forced release takes the partner out of its pool");
  const saved = JSON.parse(JSON.stringify(serializeState(st)));
  const reloaded = loadFromRaw(saved);
  const rhs = CF.ensureHotSpringState(reloaded);
  assert.ok(rhs.totalRounds === st.meta.hotSpring.totalRounds && rhs.pools.moonMilk.seatIds[0] === 6 && rhs.states.starglow === st.meta.hotSpring.states.starglow, "hot spring survives serializeState -> loadFromRaw");
  assert.ok(busyMonIds(reloaded).has(6), "reloaded soaker stays protected");
  const bogus = loadFromRaw(
    JSON.stringify({
      ...saved,
      meta: {
        ...saved.meta,
        hotSpring: { totalRounds: 2, pools: { emberRock: { seatIds: [6, 6, 999] }, herbBamboo: { seatIds: [6] }, moonMilk: { seatIds: [8] } }, states: { warm: 999_999, herbal: -5, breezy: "x" } },
      },
    }),
  );
  const bh = bogus.meta.hotSpring;
  assert.ok(bh.pools.emberRock.seatIds.join() === "6" && bh.pools.herbBamboo.seatIds.length === 0 && bh.pools.moonMilk.seatIds.length === 0, "dead / duplicate ids dropped, seats in still-locked pools dropped");
  assert.ok(bh.states.warm === 21600 && bh.states.herbal === 0 && bh.states.breezy === 0, "state timers clamped on load");
  reloaded.dex.caught = Object.fromEntries([...Array(155)].map((_, i) => [String(i + 1), 1]));
  reloaded.tech = Object.fromEntries([...Array(16)].map((_, i) => [`t${i}`, true]));
  reloaded.buildings.field.owned = 60;
  reloaded.shinyCount = 5;
  reloaded.catchCount = 999;
  reloaded.era = emptyEraState(ERA_DEFS.length - 1);
  bumpEraCounter(reloaded, "catch_count", 999);
  bumpEraCounter(reloaded, "pokeball_earned", 999);
  bumpEraCounter(reloaded, "gather_total", 999);
  bumpEraCounter(reloaded, "berry_earned", 999);
  syncEraQuests(reloaded);
  const roundsBefore = reloaded.meta.hotSpring.totalRounds;
  const starglowBefore = reloaded.meta.hotSpring.states.starglow;
  assert.equal(confirmPrestige(reloaded).ok, true, "confirmPrestige succeeds with partners in the hot spring");
  assert.ok(Object.values(reloaded.meta.hotSpring.pools).every((p) => p.seatIds.length === 0 && p.carrySec === 0), "rebirth recalls every soaker");
  assert.ok(reloaded.meta.hotSpring.totalRounds === roundsBefore && reloaded.meta.hotSpring.states.starglow === starglowBefore, "rounds and timed states survive rebirth");
}

console.log("collection-fun-selfcheck: ok");
