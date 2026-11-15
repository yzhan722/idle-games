import assert from "node:assert/strict";
import { existsSync } from "node:fs";
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
} from "../modules/systems/collection_fun.js";
import { computeTechEffects } from "../modules/systems/effects.js";
import { finalizeProductionRates } from "../modules/systems/production.js";
import { busyMonIds, pickWeakMonIds, releaseMonIds } from "../modules/systems/mon_release.js";
import { computeBreedingShinyInfo, getInheritedIvKeyCount } from "../modules/systems/breeding.js";
import { cloneMonForNatalRebirth } from "../modules/systems/rebirth.js";
import { confirmPrestige, emptyEraState, bumpEraCounter, syncEraQuests } from "../modules/systems/era.js";
import { ERA_DEFS } from "../modules/defs_eras.js";
import { evaluateDuoSynergy, computeDualSanctumBadgeBonus } from "../modules/systems/pve_tower.js";
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
    mons: { list: [{ pid: "p25", dex: 25, name: "电毛球", isShiny: true }] },
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
        p25: { dex: 25, name: "电毛球", at: 3 },
        p001b: { dex: 1, name: "芽苞苞", at: 2 },
      },
    },
  };
  const text = buildShinyShareText(state);
  assert.ok(text.includes("电毛球") && text.includes("闪光馆"), "share text");
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
      name: "电毛球",
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
  const targetMon = st.mons.list[0]; // id=1, orig nature = "timid" (胆小)
  const untunedStats = getMonCurrentStats(targetMon);
  const untunedCp = monPower(targetMon);
  assert.equal(formatMonNatureWithTuning(targetMon), "胆小", "untuned companion displays original nature");

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
    formatMonNatureWithTuning(targetMon).includes("胆小 →") && formatMonNatureWithTuning(targetMon).includes("灵攻+10%"),
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
  assert.ok(formatMonNatureWithTuning(targetMon).includes("胆小 → 心平归元"), "neutral tuning shows 原性格 → 心平归元");
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
      uiTag.includes(`${iconKey}.webp?v=0.7.48`) && resTag.includes(`${iconKey}.webp?v=0.7.48`),
      `rpg_svg_icons wires ${iconKey}.webp?v=0.7.48`,
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
    { id: 4, dex: 25, pid: "p025", name: "电毛球", lvl: 26, stars: 0, affection: 12, types: ["electric"], nature: "hasty", baseStats: { hp: 55, atk: 55, def: 40, spa: 50, spd: 50, spe: 90 }, iv: { hp: 6, atk: 6, def: 6, spa: 6, spd: 6, spe: 6 } },
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
      uiTag.includes(`${iconKey}.webp?v=0.7.48`) && resTag.includes(`${iconKey}.webp?v=0.7.48`),
      `rpg_svg_icons wires ${iconKey}.webp?v=0.7.48`,
    );
  }
  assert.ok(
    renderResSvg("shinyStarSand", 16).includes("boutiqueMirrorStar.webp?v=0.7.48"),
    "shinyStarSand resource icon resolves to boutiqueMirrorStar.webp?v=0.7.48",
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
      uiTag.includes(`${iconKey}.webp?v=0.7.48`) && resTag.includes(`${iconKey}.webp?v=0.7.48`),
      `rpg_svg_icons wires ${iconKey}.webp?v=0.7.48`,
    );
  }
  assert.ok(
    renderResSvg("ancientGeneAmber", 16).includes("amberFossilGem.webp?v=0.7.48"),
    "ancientGeneAmber resource icon resolves to amberFossilGem.webp?v=0.7.48",
  );
  assert.ok(
    renderResSvg("corridorStarMedals", 16).includes("corridorStarCrest.webp?v=0.7.48"),
    "corridorStarMedals resource icon resolves to corridorStarCrest.webp?v=0.7.48",
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

console.log("collection-fun-selfcheck: ok");
