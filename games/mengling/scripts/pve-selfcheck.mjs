#!/usr/bin/env node
import "../data/beasts.js";
import "../data/beasts_zh.js";
import {
  calcDamage,
  simulateBattle,
  simulateDualBattle,
  recommendedTypes,
  typeMatchScore,
  PVE_MAX_ROUNDS,
  estimateStageEnemyPower,
  pveFightModifiers,
} from "../modules/pve_battle.js";
import { PVE_CHAPTERS } from "../modules/pve_defs.js";
import {
  PVE_TOWER_FLOORS,
  TOWER_WEATHER_AFFIXES,
  TOWER_SEASON_EXCHANGES,
  ensureTowerState,
  getTowerFloor,
  getWeeklyTowerAffix,
  getNextTowerMilestone,
  unitMatchesWeather,
  isEndlessTowerUnlocked,
  DUAL_SANCTUM_TRIALS,
  ensureDualSanctumState,
  isDualSanctumTrialUnlocked,
  evaluateDuoSynergy,
  selectDualSanctumDuo,
  autofillDualSanctumDuo,
  recordDualSanctumVictory,
  claimDualSanctumMilestone,
  computeDualSanctumBadgeBonus,
  CHAMPION_LEAGUE_MAX_TIER,
  CHAMPION_LEAGUE_SQUAD_SIZE,
  CHAMPION_LEAGUE_STAGES,
  ensureChampionLeagueState,
  computeChampionLeagueBonus,
  autofillChampionLeagueSquad,
  setChampionLeagueSquad,
  toggleChampionLeagueSquadMon,
  resetChampionLeagueProgress,
  evaluateLeagueSquadSynergy,
  simulateLeagueGauntlet,
  STAR_CORRIDOR_MAX_TIER,
  STAR_CORRIDOR_SQUAD_SIZE,
  STAR_CORRIDOR_DUAL_ORBITS,
  getStarCorridorFloorDef,
  ensureStarCorridorState,
  computeStarCorridorBonus,
  autofillStarCorridorSquad,
  setStarCorridorSquad,
  toggleStarCorridorSquadMon,
  rotateOrResetStarCorridorOrbit,
  evaluateCorridorSquadSynergy,
  simulateStarCorridorTrial,
  exchangeCorridorMedals,
  ECO_TRI_ROTATIONS,
  ECO_TRI_RUNGS,
  ECO_TRI_SQUAD_SIZE,
  ECO_TRI_CREST_MAX_TIER,
  getEcoTriRotation,
  getEcoTriRungDef,
  ensureEcoTriHallState,
  computeEcoTriCrestBonus,
  autofillEcoTriSquad,
  toggleEcoTriSquadMon,
  setEcoTriSquad,
  evaluateEcoTriSquadSynergy,
  simulateEcoTriTournament,
  restartEcoTriLadder,
  ACROBAT_DAILY_MAX_SHOWS,
  ACROBAT_EXTRA_SHOW_COIN,
  ACROBAT_LANTERN_SCORE_MUL,
  ACROBAT_MOVES,
  ACROBAT_THEMES,
  ACROBAT_TIERS,
  autofillAcrobatRoutine,
  computeAcrobatTrophyBonus,
  detachAcrobatPerformer,
  ensureAcrobatShowState,
  evaluateAcrobatRoutine,
  getAcrobatMovesForMon,
  getAcrobatShowCost,
  getAcrobatTheme,
  getAcrobatTierForScore,
  getAcrobatUnavailableMonIds,
  performAcrobatShow,
  setAcrobatRoutineMove,
  shiftAcrobatSlot,
  toggleAcrobatPerformer,
  MIGRANT_DEFS,
  MIGRATION_RECORD_SEC,
  MIGRATION_SEASONS,
  advanceSeasonMigration,
  autoHostMigrants,
  computeSeasonMigrationBonus,
  ensureSeasonMigrationState,
  evaluateMigrationSpeed,
  getMigrantBefriendChance,
  getMigrantFriendMonIds,
  getMigrantsForSeason,
  getMigrationFeedFreeLeft,
  getMigrationHostCap,
  getMigrationMedalTier,
  getMigrationSeason,
  performMigrationFeed,
  resetSeasonMigrationFriendsForRebirth,
  syncMigrationSeason,
  toggleMigrantHost,
} from "../modules/systems/pve_tower.js";
import {
  cookCampRecipe,
  craftOrUpgradeBoutiqueAccessory,
  equipBoutiqueAccessory,
  unlockOrApplyBoutiqueSheen,
  awakenOrUpgradePrimalImprint,
  equipPrimalImprint,
} from "../modules/systems/collection_fun.js";
import { applyMintTuningToMon, monPower } from "../modules/mons.js";
import { finalizeProductionRates } from "../modules/systems/production.js";
import { computeTechEffects } from "../modules/systems/effects.js";
import { computeBreedingShinyInfo } from "../modules/systems/breeding.js";
import { busyMonIds, pickWeakMonIds } from "../modules/systems/mon_release.js";
import { defaultState, serializeState, loadFromRaw } from "../modules/state.js";
import * as PT2 from "../modules/systems/pve_tower.js";
import * as CF2 from "../modules/systems/collection_fun.js";
import * as MR2 from "../modules/systems/mon_release.js";
import { GAME_STATE_SYNC_VERSION } from "../modules/app/game_state.js";
import { createRenderPve } from "../modules/tabs/pve_tab.js";
import { CAPTURE_AREAS, GAME_CONFIG } from "../modules/config.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  }
}

const realRandom = Math.random;
Math.random = () => 0.5;

try {
  const enemy = { side: "enemy", name: "雷压", types: ["electric"], atk: 90, spa: 90, def: 40, spd: 40, spe: 30 };
  const wrongDef = { side: "player", name: "高战风队", types: ["wind"], atk: 80, spa: 80, def: 50, spd: 50 };
  const seDef = { side: "player", name: "岩系克制队", types: ["stone"], atk: 60, spa: 60, def: 50, spd: 50 };
  const wrongHit = calcDamage(enemy, wrongDef, "electric");
  const seHit = calcDamage(enemy, seDef, "electric");
  assert(wrongHit.damage > seHit.damage, "wrong-type team takes more stage pressure damage");

  const wrongTeam = [{
    name: "高战风队",
    types: ["wind"],
    stats: { hp: 340, atk: 160, def: 90, spa: 160, spd: 90, spe: 45 },
  }];
  const seTeam = [{
    name: "岩系克制队",
    types: ["stone"],
    stats: { hp: 306, atk: 136, def: 90, spa: 136, spd: 90, spe: 45 },
  }];
  const enemies = [{ dex: 26, name: "雷鼓将", lvl: 10, stars: 1 }];
  const wrongResult = simulateBattle(wrongTeam, enemies, "electric");
  const seResult = simulateBattle(seTeam, enemies, "electric");
  assert(seResult.teamHpPct > wrongResult.teamHpPct, "SE team preserves more HP than higher-power wrong type");
  assert(seResult.superEffectiveHits > wrongResult.superEffectiveHits, "SE team lands more super-effective hits");

  const specialAttacker = { side: "player", name: "灵攻手", types: ["water"], atk: 40, spa: 100 };
  const physicalAttacker = { side: "player", name: "物攻手", types: ["wind"], atk: 100, spa: 40 };
  const physWall = { side: "enemy", name: "物防墙", types: ["wind"], def: 120, spd: 40 };
  const specWall = { side: "enemy", name: "灵防墙", types: ["wind"], def: 40, spd: 120 };
  assert(calcDamage(specialAttacker, physWall).damage > calcDamage(specialAttacker, specWall).damage, "special attacker checks spd");
  assert(calcDamage(physicalAttacker, specWall).damage > calcDamage(physicalAttacker, physWall).damage, "physical attacker checks def");

  // Recommend: dark stage should prefer light (唯一克制项，互克仍优先)
  const darkRec = recommendedTypes("dark", 3);
  assert(darkRec[0] === "light", `dark stage top recommend is light, got ${darkRec[0]}`);
  assert(typeMatchScore(["light"], "dark").score > typeMatchScore(["dark"], "dark").score, "light scores above dark vs dark stage");

  // Progress damage: high atk should exceed low atk vs same wall
  const high = calcDamage(
    { side: "player", types: ["stone"], atk: 120, spa: 40, def: 50, spd: 50 },
    { side: "enemy", types: ["electric"], atk: 50, spa: 50, def: 50, spd: 50 },
    "electric"
  );
  const low = calcDamage(
    { side: "player", types: ["stone"], atk: 40, spa: 20, def: 50, spd: 50 },
    { side: "enemy", types: ["electric"], atk: 50, spa: 50, def: 50, spd: 50 },
    "electric"
  );
  assert(high.damage > low.damage, "higher atk deals more damage");

  const baselineHit = calcDamage(
    { side: "player", types: ["wind"], atk: 80, spa: 40 },
    { side: "enemy", types: ["wind"], def: 60, spd: 60 },
    "wind"
  );
  const boostedHit = calcDamage(
    { side: "player", types: ["wind"], atk: 80, spa: 40 },
    { side: "enemy", types: ["wind"], def: 60, spd: 60 },
    "wind",
    { playerDamageMul: 1.5 }
  );
  assert(boostedHit.damage > baselineHit.damage, "playerDamageMul increases player damage");

  // Timeout decision: fat enemies + strong remaining HP → decision win not false loss
  // 注：保底伤害（atk/20）绕过防御，需用 HP 池顶住 500 回合磨血
  const stallTeam = [{
    name: "铁壁",
    types: ["light"],
    stats: { hp: 60000, atk: 8, def: 999, spa: 8, spd: 999, spe: 40 },
  }];
  const fatEnemies = [
    { dex: 149, name: "凌霄圣龙", lvl: 55, stars: 2 },
    { dex: 148, name: "丝带龙", lvl: 50, stars: 2 },
    { dex: 230, name: "海龙王", lvl: 50, stars: 2 },
    { dex: 149, name: "凌霄圣龙2", lvl: 45, stars: 2 },
  ];
  const stall = simulateBattle(stallTeam, fatEnemies, "mystic");
  assert(stall.rounds >= PVE_MAX_ROUNDS || stall.win, "stall fight hits cap or finishes");
  if (stall.rounds >= PVE_MAX_ROUNDS) {
    assert(stall.endReason === "decision" || stall.endReason === "timeout", "timeout sets endReason");
    if (stall.teamHpPct > stall.enemyHpPct) {
      assert(stall.win === true && stall.stars === 1, "HP-advantage timeout is 1★ decision win");
    }
  }

  // 2-8 exists and dragonite not ★3 anymore
  const dragon = PVE_CHAPTERS[1].stages.find((s) => s.id === "2-8");
  assert(dragon && dragon.enemies.some((e) => e.dex === 149 && e.stars === 2), "2-8 dragonite stars nerfed to 2");

  const stage11 = PVE_CHAPTERS[0].stages.find((s) => s.id === "1-1");
  assert(stage11 && stage11.enemies.every((e) => e.lvl <= 3), "1-1 enemy lvl tuned for early game");
  const ep = estimateStageEnemyPower(stage11);
  assert(ep > 0 && ep < 900, "1-1 enemy power in teachable range");

  const tut = pveFightModifiers("1-1", false);
  assert(tut.playerDamageMul > 1 && tut.incomingDamageMul < 1 && tut.enemyHpMul < 1, "1-1 first-clear tutorial mods");
  const noviceTeam = Array.from({ length: 6 }, (_, i) => ({
    name: `n${i}`,
    types: ["fire"],
    stats: { hp: 55, atk: 16, def: 12, spa: 16, spd: 12, spe: 14 },
  }));
  const noviceWin = simulateBattle(noviceTeam, stage11.enemies, stage11.type, tut);
  assert(noviceWin.win, "novice SE team can clear 1-1 with tutorial mods");

  assert(PVE_CHAPTERS.length >= 3, "chapter 3 exists");
  const ch3 = PVE_CHAPTERS.find((c) => c.id === "3");
  assert(ch3 && ch3.unlockDex === 55 && ch3.stages.length >= 5, "chapter 3 has 5+ stages @ dex 55");
  assert(ch3.stages[0].id === "3-1" && ch3.stages[0].unlockReq === null, "3-1 first stage open");

  assert(PVE_CHAPTERS.length >= 4, "chapter 4 exists");
  const ch4 = PVE_CHAPTERS.find((c) => c.id === "4");
  assert(ch4 && ch4.unlockDex === 90 && ch4.stages.length >= 4, "chapter 4 has 4+ stages @ dex 90");
  assert(ch4.stages[0].id === "4-1" && ch4.stages[0].unlockReq === null, "4-1 first stage open");
  assert(ch4.name.includes("峰顶"), "chapter 4 peak name");

  // P3 扩容：4→8 章（约 50 关），结构全量校验
  assert(PVE_CHAPTERS.length === 8, `8 chapters expected, got ${PVE_CHAPTERS.length}`);
  const TYPE_SET = new Set(["fire","water","grass","electric","wind","stone","light","dark","mystic"]);
  const roster = new Set(globalThis.BEAST_ROSTER ?? []);
  const zh = globalThis.BEAST_ZH ?? {};
  const stageIds = new Set();
  let stageTotal = 0;
  const REWARD_KEYS = new Set(["futurecoin","exp","evolutionEnergy","evolutionStone","linkRope"]);
  for (const ch of PVE_CHAPTERS) {
    assert(typeof ch.unlockDex === "number" && ch.unlockDex <= 150, `ch${ch.id} unlockDex reachable (${ch.unlockDex})`);
    let prevId = null;
    for (const st of ch.stages) {
      stageTotal += 1;
      assert(!stageIds.has(st.id), `dup stage id ${st.id}`);
      stageIds.add(st.id);
      assert(st.id.startsWith(`${ch.id}-`), `stage ${st.id} not in chapter ${ch.id}`);
      assert(TYPE_SET.has(st.type), `${st.id} bad type ${st.type}`);
      assert(st.unlockReq === prevId, `${st.id} unlockReq should chain from ${prevId}, got ${st.unlockReq}`);
      prevId = st.id;
      assert(st.enemies.length >= 1 && st.enemies.length <= 4, `${st.id} enemy count ${st.enemies.length}`);
      for (const e of st.enemies) {
        if (roster.size) {
          assert(roster.has(e.dex), `${st.id} enemy dex ${e.dex} not in roster`);
          const want = zh[`p${String(e.dex).padStart(3, "0")}`];
          if (want) assert(e.name === want, `${st.id} enemy ${e.dex} name ${e.name} != ${want}`);
        }
        assert(e.lvl >= 1 && e.lvl <= 100, `${st.id} enemy lvl ${e.lvl} out of range`);
        assert(e.stars >= 0 && e.stars <= 3, `${st.id} enemy stars ${e.stars}`);
      }
      for (const k of Object.keys(st.rewards ?? {})) assert(REWARD_KEYS.has(k), `${st.id} bad reward key ${k}`);
      for (const k of Object.keys(st.repeatRewards ?? {})) assert(REWARD_KEYS.has(k), `${st.id} bad repeat key ${k}`);
      assert((st.rewards?.futurecoin ?? 0) > 0 && (st.rewards?.exp ?? 0) > 0, `${st.id} must reward fc+exp`);
    }
  }
  assert(stageTotal === 50, `50 stages expected (2x), got ${stageTotal}`);
  const ch8 = PVE_CHAPTERS.find((c) => c.id === "8");
  assert(ch8 && ch8.stages.at(-1).enemies.some((e) => e.dex === 150), "8-5 梦蚀尊 finale boss present");

  // ML-2: Endless Trial Tower (9F+), Weekly Weather Affixes & Milestone Drops
  assert(PVE_TOWER_FLOORS.length === 8, "classic tower keeps 8 base floors");
  assert(TOWER_WEATHER_AFFIXES.length >= 6, "6+ weekly weather affixes defined");
  assert(TOWER_SEASON_EXCHANGES.length >= 3, "season munitions exchange entries present");

  const towerSave = { meta: {} };
  const tState = ensureTowerState(towerSave, "2026-W45");
  assert(tState.floor === 1 && !isEndlessTowerUnlocked(tState), "fresh tower starts at 1F");
  tState.best = 8;
  tState.floor = 8;
  ensureTowerState(towerSave, "2026-W45");
  assert(tState.floor === 9 && tState.cleared === true && isEndlessTowerUnlocked(tState), "8F clear unlocks 9F endless tower");

  const f9a = getTowerFloor(9, "2026-W45");
  const f9b = getTowerFloor(9, "2026-W45");
  assert(f9a.isEndless && f9a.name === f9b.name && f9a.type === f9b.type, "endless floor 9F deterministic within ISO week");
  const f10 = getTowerFloor(10, "2026-W45");
  const f15 = getTowerFloor(15, "2026-W45");
  const f30 = getTowerFloor(30, "2026-W45");
  assert(
    f10.isMajorBoss && f10.rewards.evolutionStone >= 2 && f10.rewards.rareCandy >= 2 && f10.rewards.seasonMark >= 3 && f10.rewards.linkRope === 1,
    "10F major boss milestone drops evolutionStone, rareCandy, seasonMark & linkRope",
  );
  assert(
    f15.isMilestone && !f15.isMajorBoss && f15.rewards.evolutionStone >= 1 && f15.rewards.rareCandy >= 1 && f15.rewards.seasonMark >= 1,
    "15F elite milestone drops evolutionStone, rareCandy & seasonMark",
  );
  assert(f30.enemies.every((e) => e.statMul > 1 && e.lvl === 100), "deep endless 30F scales past Lv.100 via statMul");
  assert(getNextTowerMilestone(9, "2026-W45").floor === 10 && getNextTowerMilestone(11, "2026-W45").floor === 15, "next milestone helper finds 10F / 15F");

  // Weekly reset preserves allTimeBest while resetting weekly floor to 1
  const tNextWeek = ensureTowerState(towerSave, "2026-W46");
  assert(tNextWeek.floor === 1 && tNextWeek.allTimeBest === 8, "weekly reset keeps allTimeBest");
  const wx45 = getWeeklyTowerAffix("2026-W45");
  const wx46 = getWeeklyTowerAffix("2026-W46");
  assert(wx45.id !== wx46.id, "adjacent ISO weeks rotate weather affix");

  // Weather affix combat modifier (+28% outgoing / -18% incoming for resonant player units)
  const solarWx = TOWER_WEATHER_AFFIXES.find((w) => w.id === "solar_flare");
  assert(unitMatchesWeather(["fire"], solarWx) && !unitMatchesWeather(["water"], solarWx), "unitMatchesWeather checks boostTypes");
  const noWxOut = calcDamage(
    { side: "player", types: ["fire"], atk: 100, spa: 100 },
    { side: "enemy", types: ["wind"], def: 60, spd: 60 },
    "wind",
  );
  const solarOut = calcDamage(
    { side: "player", types: ["fire"], atk: 100, spa: 100 },
    { side: "enemy", types: ["wind"], def: 60, spd: 60 },
    "wind",
    { weatherAffix: solarWx },
  );
  assert(solarOut.damage > noWxOut.damage && solarOut.weatherMul === 1.28, "weather affix boosts resonant player outgoing damage");

  const noWxIn = calcDamage(
    { side: "enemy", types: ["wind"], atk: 100, spa: 100 },
    { side: "player", types: ["fire"], def: 60, spd: 60 },
    "wind",
  );
  const solarIn = calcDamage(
    { side: "enemy", types: ["wind"], atk: 100, spa: 100 },
    { side: "player", types: ["fire"], def: 60, spd: 60 },
    "wind",
    { weatherAffix: solarWx },
  );
  assert(solarIn.damage < noWxIn.damage && solarIn.weatherMul === 0.82, "weather affix reduces resonant player incoming damage");

  const wxBattle = simulateBattle(
    [{ name: "赤焰先锋", types: ["fire"], stats: { hp: 260, atk: 90, def: 70, spa: 110, spd: 70, spe: 80 } }],
    [{ dex: 16, name: "云羽雏雀", lvl: 25, stars: 1 }],
    "wind",
    { weatherAffix: solarWx },
  );
  assert(wxBattle.win && wxBattle.log.some((l) => l.includes("烈日晴空")), "simulateBattle logs active weather affix");

  // ML-4: Dual-Pet Sanctum Trials, Elemental Duo Combo Battle, Badges & Save Persistence
  assert(DUAL_SANCTUM_TRIALS.length === 6, "6 progressive Dual Sanctum trials defined");
  for (const tr of DUAL_SANCTUM_TRIALS) {
    assert(
      Array.isArray(tr.elements) && tr.elements.includes(tr.stageType),
      `Dual Sanctum trial ${tr.id} stageType (${tr.stageType}) matches boss elements (${tr.elements.join(",")})`,
    );
    const rec = Array.from(new Set(tr.elements.flatMap((el) => recommendedTypes(el))));
    assert(rec.length >= 1, `Dual Sanctum trial ${tr.id} yields counter recTypes (${rec.join(",")})`);
  }
  const emberRec = Array.from(new Set(DUAL_SANCTUM_TRIALS[0].elements.flatMap((el) => recommendedTypes(el))));
  assert(
    DUAL_SANCTUM_TRIALS[0].stageType === "fire" && emberRec.includes("water") && emberRec.includes("electric") && !emberRec.includes("fire"),
    "sanctum_ember_gale stageType is fire and recommends water/stone/electric counters",
  );
  const dualSave = defaultState();
  dualSave.mons.list = [
    { id: 1, pid: "p058", dex: 58, name: "炽焰幼犬", lvl: 35, stars: 1, types: ["fire"] },
    { id: 2, pid: "p017", dex: 17, name: "疾风灵隼", lvl: 36, stars: 1, types: ["wind"] },
    { id: 3, pid: "p074", dex: 74, name: "晶簇岩球", lvl: 20, stars: 0, types: ["stone"] },
  ];
  const ds = ensureDualSanctumState(dualSave);
  assert(isDualSanctumTrialUnlocked("sanctum_ember_gale", ds), "first Dual Sanctum trial unlocked initially");
  assert(!isDualSanctumTrialUnlocked("sanctum_tide_grove", ds), "second Dual Sanctum trial locked before clearing first");

  // Duo selection & synergy check
  assert(selectDualSanctumDuo(dualSave, 1, 1).ok === false, "selectDualSanctumDuo rejects duplicate pet id");
  const autoDuo = autofillDualSanctumDuo(dualSave, "sanctum_ember_gale", (m) => m.types, (m) => m.lvl * 12);
  assert(autoDuo.ok && ds.primaryId !== ds.partnerId, "autofillDualSanctumDuo selects 2 distinct pets");
  assert(selectDualSanctumDuo(dualSave, 1, 2).ok === true, "selectDualSanctumDuo sets primary=1, partner=2");

  const fireWindSyn = evaluateDuoSynergy(["fire"], ["wind"]);
  const plainSyn = evaluateDuoSynergy(["fire"], ["stone"]);
  assert(
    fireWindSyn.resonant && fireWindSyn.comboSkill === "炽岚螺旋击" && fireWindSyn.outMul > plainSyn.outMul,
    "fire+wind duo triggers resonant Linked Combo Skill with higher multiplier",
  );

  const dualTrial1 = DUAL_SANCTUM_TRIALS[0];
  const dualBattleRes = simulateDualBattle(
    { id: 1, name: "炽焰幼犬", types: ["fire"], stats: { hp: 220, atk: 95, def: 75, spa: 95, spd: 75, spe: 88 } },
    { id: 2, name: "疾风灵隼", types: ["wind"], stats: { hp: 210, atk: 92, def: 72, spa: 85, spd: 72, spe: 96 } },
    dualTrial1.enemies,
    dualTrial1.stageType,
    { duoSynergy: fireWindSyn },
  );
  assert(
    dualBattleRes.win && dualBattleRes.comboHits >= 1 && dualBattleRes.log.some((l) => l.includes("炽岚螺旋击")),
    "simulateDualBattle wins and executes Linked Combo Skill",
  );

  const v1 = recordDualSanctumVictory(dualSave, "sanctum_ember_gale", dualBattleRes);
  assert(v1.ok && v1.firstClear && v1.badgeEarned && ds.badges.includes("badge_ember_gale"), "first clear awards Sanctum Badge");
  assert(isDualSanctumTrialUnlocked("sanctum_tide_grove", ds), "clearing trial 1 unlocks trial 2");
  const v1Repeat = recordDualSanctumVictory(dualSave, "sanctum_ember_gale", dualBattleRes);
  assert(v1Repeat.ok && !v1Repeat.firstClear && !v1Repeat.badgeEarned && ds.badges.length === 1, "repeat clear does not duplicate badge");

  recordDualSanctumVictory(dualSave, "sanctum_tide_grove", { stars: 3, rounds: 3 });
  assert(computeDualSanctumBadgeBonus(dualSave).badgeCount === 2 && computeDualSanctumBadgeBonus(dualSave).pveOutMul > 1, "2 badges grant PvE damage bonus");
  const m2Claim = claimDualSanctumMilestone(dualSave, "m2");
  assert(m2Claim.ok && m2Claim.rewards.futurecoin === 300, "2-badge milestone m2 claimable");
  assert(claimDualSanctumMilestone(dualSave, "m2").ok === false, "m2 milestone cannot be claimed twice");

  // Save serialization & legacy backward compatibility
  dualSave.meta.bondAtlas = { attunedBondId: "ember_gale", pairIds: [1, 2], claimedMilestones: { atlas_t3: true } };
  const rawJson = JSON.stringify(serializeState(dualSave));
  const reloaded = loadFromRaw(rawJson);
  assert(
    Array.isArray(reloaded.pve?.dualSanctum?.badges) &&
      reloaded.pve.dualSanctum.badges.length === 2 &&
      reloaded.pve.dualSanctum.primaryId === 1 &&
      reloaded.pve.dualSanctum.partnerId === 2 &&
      reloaded.pve.dualSanctum.claimedMilestones?.m2 === true &&
      reloaded.meta?.bondAtlas?.attunedBondId === "ember_gale",
    "serializeState -> loadFromRaw preserves dualSanctum badges, duo, milestones, and bondAtlas",
  );
  const legacyLoaded = loadFromRaw(JSON.stringify({ version: 3, res: {}, pve: { progress: { "1-1": true }, selectedIds: [1] } }));
  const legacyDs = ensureDualSanctumState(legacyLoaded);
  assert(Array.isArray(legacyDs.badges) && legacyDs.badges.length === 0 && legacyLoaded.pve.progress["1-1"] === true, "legacy save loads cleanly with empty dualSanctum");

  // Regression: createRenderPve single-delegated listener (no duplicate click firing) & dual-element recTypes
  const uiSave = defaultState();
  uiSave.mons.list = [
    { id: 1, pid: "p036", dex: 36, name: "月华星后", lvl: 55, stars: 2, types: ["light"] },
    { id: 2, pid: "p094", dex: 94, name: "噬影夜魔王", lvl: 55, stars: 2, types: ["dark"] },
  ];
  const listeners = { click: [], change: [] };
  const mockEl = {
    innerHTML: "",
    addEventListener(type, fn) {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(fn);
    },
  };
  const mockUi = { activeTab: "pve", pveDirty: true };
  let fcEarned = 0;
  let renderFn = null;
  renderFn = createRenderPve({
    elPveList: mockEl,
    ui: mockUi,
    clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
    escapeHtml: (s) => String(s ?? ""),
    monPower: (m) => (m.lvl || 1) * 60,
    renderBeastIcon: () => "",
    getMonCurrentStats: (m) =>
      (m?.lvl || 1) >= 75
        ? { hp: 720, atk: 540, def: 480, spa: 580, spd: 490, spe: 540 }
        : { hp: 620, atk: 190, def: 150, spa: 210, spd: 160, spe: 185 },
    getBeastDataByDex: () => null,
    markPveDirty: () => { mockUi.pveDirty = true; },
    addLog: () => {},
    addRes: (rid, amt) => { if (rid === "futurecoin") fcEarned += amt; },
    addExpToMon: () => {},
    render: () => renderFn(),
    getState: () => uiSave,
    TYPE_ZH: { fire: "火", wind: "风", water: "水", electric: "电", light: "光", dark: "暗" },
    dexCaughtUnique: () => 7,
  });
  renderFn();
  // Simulate clicking [data-dual-auto] 3 times when optimal duo is unchanged
  for (let i = 0; i < 3; i++) {
    const autoTarget = {
      disabled: false,
      hasAttribute: () => false,
      getAttribute: (k) => (k === "data-dual-auto" ? "1" : null),
      closest: (sel) => (sel === "[data-dual-auto]" ? autoTarget : null),
    };
    listeners.click.forEach((fn) => fn({ target: autoTarget }));
  }
  assert(listeners.click.length === 1 && listeners.change.length === 1, "elPveList attaches delegated click/change listeners exactly once");
  // Simulate clicking [data-dual-fight="sanctum_ember_gale"] ONCE
  const fightTarget = {
    disabled: false,
    hasAttribute: () => false,
    getAttribute: (k) => (k === "data-dual-fight" ? "sanctum_ember_gale" : null),
    closest: (sel) => (sel === "[data-dual-fight]" ? fightTarget : null),
  };
  listeners.click.forEach((fn) => fn({ target: fightTarget }));
  assert(fcEarned === 180, `single Dual Sanctum fight click awards First Clear +180 futurecoin once (got ${fcEarned})`);
  assert(
    mockUi.pveBattleResult?.rewardText?.includes("炽风双翼徽章") &&
      Array.isArray(mockUi.pveBattleResult?.stageElements) &&
      mockUi.pveBattleResult.stageElements.join("+") === "fire+wind" &&
      mockUi.pveBattleResult.recTypes.includes("water") &&
      mockUi.pveBattleResult.recTypes.includes("electric"),
    "Dual Sanctum battle result reports First Clear badge reward + fire+wind stageElements + water/electric recTypes",
  );
  assert(mockEl.innerHTML.includes("data-pve-result-overlay"), "Battle Result Modal renders even when dexCount < 10 (chapterLocked)");

  // ==========================================================================
  // ML-7: 萌灵「星冠殿堂挑战赛」(Star Crown Hall Gauntlet)
  // ==========================================================================
  assert(
    CHAMPION_LEAGUE_STAGES.length === 5 &&
      CHAMPION_LEAGUE_STAGES.map((s) => s.shortTitle).join("->") === "炎狱殿主->沧溟殿主->翠岚殿主->星穹殿主->圣殿总冠军",
    "Champion League defines 5 consecutive stages (炎狱殿主 -> 沧溟殿主 -> 翠岚殿主 -> 星穹殿主 -> 圣殿总冠军)",
  );

  const leagueState = defaultState();
  leagueState.res.futurecoin.value = 1500;
  leagueState.res.tuningMint = { value: 6, cap: 999 };
  leagueState.res.shinyStarSand = { value: 40, cap: 9999 };
  leagueState.res.catnip.value = 2000;
  leagueState.res.minerals.value = 500;
  leagueState.meta.starCamp = {
    initialized: true,
    level: 4,
    exp: 0,
    stationedIds: [1, 2],
    pantry: { picnicHerb: 25, starBerry: 25, campToken: 8 },
    recipes: {},
    activeFeasts: [],
  };
  leagueState.mons.list = [
    {
      id: 1,
      dex: 6,
      pid: "p006",
      name: "炽翼炎龙",
      lvl: 82,
      stars: 3,
      types: ["fire", "wind"],
      nature: "modest",
      baseStats: { hp: 92, atk: 84, def: 82, spa: 118, spd: 92, spe: 108 },
      iv: { hp: 14, atk: 12, def: 12, spa: 15, spd: 13, spe: 15 },
    },
    {
      id: 2,
      dex: 9,
      pid: "p009",
      name: "沧澜重龟",
      lvl: 80,
      stars: 3,
      types: ["water"],
      nature: "bold",
      baseStats: { hp: 95, atk: 83, def: 108, spa: 102, spd: 110, spe: 86 },
      iv: { hp: 14, atk: 10, def: 14, spa: 14, spd: 14, spe: 12 },
    },
    {
      id: 3,
      dex: 3,
      pid: "p003",
      name: "花蓬蓬",
      lvl: 80,
      stars: 3,
      types: ["grass", "wind"],
      nature: "timid",
      baseStats: { hp: 90, atk: 82, def: 88, spa: 112, spd: 108, spe: 96 },
      iv: { hp: 14, atk: 10, def: 13, spa: 15, spd: 14, spe: 14 },
    },
    {
      id: 4,
      dex: 25,
      pid: "p025",
      name: "星雷灵鼠",
      lvl: 20,
      stars: 0,
      types: ["electric"],
      nature: "hardy",
      baseStats: { hp: 50, atk: 55, def: 40, spa: 50, spd: 50, spe: 90 },
      iv: { hp: 5, atk: 5, def: 5, spa: 5, spd: 5, spe: 5 },
    },
  ];

  const autoSq = autofillChampionLeagueSquad(leagueState, (m) => m.types, monPower);
  assert(autoSq.ok && autoSq.squadIds.length === CHAMPION_LEAGUE_SQUAD_SIZE, "autofillChampionLeagueSquad fills 3-partner squad");
  assert(setChampionLeagueSquad(leagueState, [1, 2, 3]).ok, "setChampionLeagueSquad sets [1,2,3]");
  const leagueBusy = busyMonIds(leagueState);
  assert(leagueBusy.has(1) && leagueBusy.has(2) && leagueBusy.has(3), "Champion League squad partners are protected in busyMonIds");

  // Verify 4-pillar synergy scaling: Bond (ML-4) + Mint Tuning (ML-5) + Camp Feast (ML-6) + Boutique Accessories (ML-7)
  const squad3 = leagueState.mons.list.slice(0, 3);
  const synBase = evaluateLeagueSquadSynergy(leagueState, squad3, { getMonTypes: (m) => m.types });
  assert(synBase.bondOutAdd > 0, "ML-4 intra-squad elemental duo bond contributes to League synergy");

  applyMintTuningToMon(leagueState, 1, { up: "spa", down: "atk" });
  applyMintTuningToMon(leagueState, 2, { up: "spa", down: "atk" });
  const synAfterMint = evaluateLeagueSquadSynergy(leagueState, squad3, { getMonTypes: (m) => m.types });
  assert(synAfterMint.tuningOutAdd > synBase.tuningOutAdd, "ML-5 Mint Tuning increases League tuningOutAdd");

  cookCampRecipe(leagueState, "dish_flame_skewers", { nowMs: 20_000_000 });
  const synAfterCamp = evaluateLeagueSquadSynergy(leagueState, squad3, { getMonTypes: (m) => m.types });
  assert(synAfterCamp.campOutAdd > 0 && synAfterCamp.totalOutAdd > synAfterMint.totalOutAdd, "ML-6 Camp Cuisine Feast boosts League campOutAdd");

  craftOrUpgradeBoutiqueAccessory(leagueState, "accAuroraCrown", { equipMonId: 1 });
  craftOrUpgradeBoutiqueAccessory(leagueState, "accFairyWings", { equipMonId: 2 });
  equipBoutiqueAccessory(leagueState, "accAuroraCrown", 1);
  equipBoutiqueAccessory(leagueState, "accFairyWings", 2);
  unlockOrApplyBoutiqueSheen(leagueState, "celestial_gold", 3);
  const synAfterBoutique = evaluateLeagueSquadSynergy(leagueState, squad3, { getMonTypes: (m) => m.types });
  assert(
    synAfterBoutique.boutiqueOutAdd > 0 &&
      synAfterBoutique.squadStyledCount === 3 &&
      synAfterBoutique.playerDamageMul > synAfterCamp.playerDamageMul,
    "ML-7 Boutique Accessories & Sheen boost League boutiqueOutAdd and playerDamageMul",
  );

  // Stage-by-stage single bout check + reset check
  const sandBeforeSingle = leagueState.res.shinyStarSand.value;
  const singleStep = simulateLeagueGauntlet(leagueState, { mode: "single", getMonTypes: (m) => m.types });
  assert(
    singleStep.ok && singleStep.win && singleStep.stagesCleared === 1 && leagueState.pve.championLeague.activeStageIdx === 1,
    "single-stage League bout clears Stage 1 (炎狱殿主) and advances activeStageIdx to Stage 2",
  );
  assert(leagueState.res.shinyStarSand.value === sandBeforeSingle + 4, "first clear of Stage 1 grants +4 shinyStarSand");
  resetChampionLeagueProgress(leagueState);
  assert(leagueState.pve.championLeague.activeStageIdx === 0, "resetChampionLeagueProgress resets activeStageIdx to 0");

  // Full 5-stage gauntlet clear -> Hall-of-Fame induction, ribbons on participating partners, Tier 1..5 global aura
  const pwrBeforeRibbon = monPower(leagueState.mons.list[0]);
  const bareProd = { catnipPerSec: 10, woodPerSec: 10, mineralsPerSec: 10 };
  const bareRef = defaultState();
  finalizeProductionRates(bareProd, bareRef, 1);
  const bareTech = computeTechEffects(bareRef, { tech: {} }, { serverBuffLevels: new Map() });

  const fullRun = simulateLeagueGauntlet(leagueState, { mode: "full", getMonTypes: (m) => m.types, nowMs: 25_000_000 });
  assert(
    fullRun.ok &&
      fullRun.win &&
      fullRun.championCleared &&
      fullRun.stagesCleared === 5 &&
      fullRun.hallOfFameTier === 1 &&
      (fullRun.rewardsEarned.shinyStarSand || 0) >= 32,
    "full 5-stage Champion League gauntlet clears all 4 Elites + Grand Champion and awards shinyStarSand",
  );
  assert(
    leagueState.mons.list[0].hallOfFameRibbons === 1 &&
      leagueState.mons.list[1].hallOfFameRibbons === 1 &&
      leagueState.mons.list[2].hallOfFameRibbons === 1 &&
      !leagueState.mons.list[3].hallOfFameRibbons,
    "participating 3 squad partners receive hallOfFameRibbons stamp",
  );
  assert(monPower(leagueState.mons.list[0]) > pwrBeforeRibbon, "hallOfFameRibbons boost partner monPower");

  // Advance Hall-of-Fame to max Tier 5 and verify global production, catch rate, and battle damage bonuses
  for (let k = 0; k < 4; k++) {
    simulateLeagueGauntlet(leagueState, { mode: "full", getMonTypes: (m) => m.types });
  }
  const tier5Bonus = computeChampionLeagueBonus(leagueState);
  assert(
    tier5Bonus.hallOfFameTier === CHAMPION_LEAGUE_MAX_TIER &&
      tier5Bonus.prodAdd === 0.2 &&
      tier5Bonus.catchAdd === 0.04 &&
      tier5Bonus.pveOutAdd === 0.2,
    "Hall-of-Fame Tier 5 grants +20% global production, +4% catch rate, and +20% battle damage",
  );
  const hofOnlyState = defaultState();
  hofOnlyState.pve.championLeague = { hallOfFameTier: 5, championClears: 5 };
  const hofProd = { catnipPerSec: 10, woodPerSec: 10, mineralsPerSec: 10 };
  finalizeProductionRates(hofProd, hofOnlyState, 1);
  const hofTech = computeTechEffects(hofOnlyState, { tech: {} }, { serverBuffLevels: new Map() });
  assert(hofProd.catnipPerSec > bareProd.catnipPerSec * 1.18, "finalizeProductionRates applies Champion League Hall-of-Fame prodMul");
  assert(hofTech.catchChanceAdd >= bareTech.catchChanceAdd + 0.04, "computeTechEffects applies Champion League Hall-of-Fame catchAdd");
  assert(computeDualSanctumBadgeBonus(hofOnlyState).pveOutMul >= 1.2, "computeDualSanctumBadgeBonus includes Hall-of-Fame battle damage bonus");

  // Verify smartProtect in pickWeakMonIds never drops Hall-of-Fame Ribbon holders even if unequipped from active squad
  setChampionLeagueSquad(leagueState, [2, 3]);
  const weakDrops = pickWeakMonIds(leagueState.mons.list, { softLimit: 1, batch: 10, smartProtect: true });
  assert(!weakDrops.includes(1), "pickWeakMonIds smartProtect preserves partner with hallOfFameRibbons > 0");
  toggleChampionLeagueSquadMon(leagueState, 1);

  // Verify PvE Tab delegated [data-pve-league-fight="full"] click populates ui.pveBattleResult
  uiSave.mons.list.push({ id: 3, pid: "p149", dex: 149, name: "凌霄圣龙", lvl: 78, stars: 3, types: ["mystic", "wind"] });
  uiSave.mons.list[0].lvl = 82;
  uiSave.mons.list[1].lvl = 82;
  mockUi.pveDirty = true;
  renderFn();
  const leagueFightTarget = {
    disabled: false,
    hasAttribute: () => false,
    getAttribute: (k) => (k === "data-pve-league-fight" ? "full" : null),
    closest: (sel) => (sel === "[data-pve-league-fight]" ? leagueFightTarget : null),
  };
  listeners.click.forEach((fn) => fn({ target: leagueFightTarget }));
  assert(
    mockUi.pveBattleResult?.championCleared === true &&
      mockUi.pveBattleResult?.rewardText?.includes("冠军殿堂授勋") &&
      mockUi.pveBattleResult?.rewardText?.includes("闪光祈愿星砂"),
    "PvE Tab [data-pve-league-fight='full'] triggers Champion League gauntlet and displays Hall-of-Fame result modal",
  );

  // Save/Load roundtrip for Champion League & Hall-of-Fame Ribbons
  const leagueSaved = JSON.stringify(serializeState(leagueState));
  const leagueReloaded = loadFromRaw(leagueSaved);
  assert(
    leagueReloaded.pve?.championLeague?.hallOfFameTier === 5 &&
      leagueReloaded.mons.list[0].hallOfFameRibbons === 5 &&
      leagueReloaded.pve.championLeague.hallOfFameRecords.length >= 1,
    "serializeState -> loadFromRaw preserves hallOfFameTier, hallOfFameRecords, and partner hallOfFameRibbons",
  );

  // ============================================================================
  // ML-8: 双系星轨回廊无尽试炼（五维共鸣评估 · 星轨勋章与远古基因琥珀结算 · Tier 1~5 全局增幅）
  // ============================================================================
  const corridorState = defaultState();
  corridorState.mons.list = [
    {
      id: 1,
      dex: 6,
      pid: "p006",
      name: "炽翼炎龙",
      lvl: 82,
      stars: 3,
      types: ["fire", "wind"],
      nature: "hardy",
      baseStats: { hp: 92, atk: 84, def: 82, spa: 118, spd: 92, spe: 108 },
      iv: { hp: 14, atk: 12, def: 12, spa: 15, spd: 13, spe: 15 },
    },
    {
      id: 2,
      dex: 9,
      pid: "p009",
      name: "沧澜重龟",
      lvl: 80,
      stars: 3,
      types: ["water", "stone"],
      nature: "hardy",
      baseStats: { hp: 95, atk: 83, def: 108, spa: 102, spd: 110, spe: 86 },
      iv: { hp: 14, atk: 10, def: 14, spa: 14, spd: 14, spe: 12 },
    },
    {
      id: 3,
      dex: 3,
      pid: "p003",
      name: "花蓬蓬",
      lvl: 80,
      stars: 3,
      types: ["grass", "wind"],
      nature: "hardy",
      baseStats: { hp: 90, atk: 82, def: 88, spa: 112, spd: 108, spe: 96 },
      iv: { hp: 14, atk: 10, def: 13, spa: 15, spd: 14, spe: 14 },
    },
    {
      id: 4,
      dex: 25,
      pid: "p025",
      name: "雷光鼠",
      lvl: 78,
      stars: 3,
      types: ["electric", "light"],
      nature: "hardy",
      baseStats: { hp: 82, atk: 85, def: 76, spa: 106, spd: 88, spe: 118 },
      iv: { hp: 13, atk: 12, def: 11, spa: 14, spd: 12, spe: 15 },
    },
    {
      id: 5,
      dex: 10,
      pid: "p010",
      name: "毛茸茸",
      lvl: 2,
      stars: 0,
      types: ["grass"],
      nature: "hardy",
      baseStats: { hp: 45, atk: 30, def: 35, spa: 20, spd: 20, spe: 45 },
      iv: { hp: 1, atk: 1, def: 1, spa: 1, spd: 1, spe: 1 },
    },
  ];
  corridorState.mons.nextId = 6;

  // Verify rotating dual-element orbits across floors 1..12
  assert(STAR_CORRIDOR_DUAL_ORBITS.length === 6, "6 rotating dual-element orbits defined");
  const fl1 = getStarCorridorFloorDef(1, 0);
  const fl2 = getStarCorridorFloorDef(2, 0);
  assert(
    fl1.dualElements.length === 2 && fl2.dualElements.length === 2 && fl1.orbitId !== fl2.orbitId,
    "escalating Star-Rail Corridor rotates dual-element orbits per floor",
  );
  const rotRes = rotateOrResetStarCorridorOrbit(corridorState, { rotateOrbit: true });
  assert(rotRes.ok && rotRes.rotationOffset === 1, "rotateOrResetStarCorridorOrbit advances dual-element orbit phase");
  rotateOrResetStarCorridorOrbit(corridorState, { rotateOrbit: false });
  corridorState.pve.starCorridor.rotationOffset = 0;

  const autoCor = autofillStarCorridorSquad(corridorState, (m) => m.types, monPower);
  assert(
    autoCor.ok && autoCor.squadIds.length === STAR_CORRIDOR_SQUAD_SIZE && !autoCor.squadIds.includes(5),
    "autofillStarCorridorSquad picks top 4 diverse partners",
  );
  for (const id of autoCor.squadIds) {
    assert(busyMonIds(corridorState).has(id), `busyMonIds protects Star-Rail Corridor squad member #${id}`);
  }
  toggleStarCorridorSquadMon(corridorState, 4);
  assert(corridorState.pve.starCorridor.squadIds.length === 3, "toggleStarCorridorSquadMon removes partner #4");
  toggleStarCorridorSquadMon(corridorState, 4);
  assert(corridorState.pve.starCorridor.squadIds.length === 4, "toggleStarCorridorSquadMon re-adds partner #4");

  // Strictly verify 5-pillar synergy monotonicity: Bond + Mint + Camp + Boutique + Primal Imprints
  setStarCorridorSquad(corridorState, [1, 2, 3, 4]);
  const corMons = [1, 2, 3, 4].map((id) => corridorState.mons.list.find((m) => m.id === id));
  const emptySynState = defaultState();
  emptySynState.mons.list = corridorState.mons.list.map((m) => ({ ...m, types: ["stone"] }));
  const syn0 = evaluateCorridorSquadSynergy(emptySynState, emptySynState.mons.list.slice(0, 4), fl1, { getMonTypes: (m) => m.types });
  const syn1Bond = evaluateCorridorSquadSynergy(corridorState, corMons, fl1, { getMonTypes: (m) => m.types });
  assert(syn1Bond.bondOutAdd > syn0.bondOutAdd && syn1Bond.playerDamageMul > syn0.playerDamageMul, "Pillar 1 (Bond Atlas & Duo Combos) boosts corridor synergy");

  corridorState.res.tuningMint = { value: 12, cap: 999 };
  for (const m of corMons) applyMintTuningToMon(corridorState, m.id, { up: "spa", down: "atk" });
  const syn2Mint = evaluateCorridorSquadSynergy(corridorState, corMons, fl1, { getMonTypes: (m) => m.types });
  assert(syn2Mint.tuningOutAdd > syn1Bond.tuningOutAdd && syn2Mint.playerDamageMul > syn1Bond.playerDamageMul, "Pillar 2 (Mint Tuning) boosts corridor synergy");

  corridorState.res.catnip.value = 800;
  corridorState.res.minerals.value = 800;
  corridorState.res.wood.value = 800;
  corridorState.meta.starCamp = { initialized: true, level: 4, exp: 0, stationedIds: [1, 2], pantry: { picnicHerb: 10, starBerry: 10, campToken: 3 }, recipes: {}, activeFeasts: [] };
  cookCampRecipe(corridorState, "dish_flame_skewers");
  const syn3Camp = evaluateCorridorSquadSynergy(corridorState, corMons, fl1, { getMonTypes: (m) => m.types });
  assert(syn3Camp.campOutAdd > 0 && syn3Camp.playerDamageMul > syn2Mint.playerDamageMul, "Pillar 3 (Camp Cuisine) boosts corridor synergy");

  corridorState.res.shinyStarSand.value = 120;
  corridorState.res.futurecoin.value = 3000;
  corridorState.res.evolutionStone = { value: 10, cap: 999 };
  for (const accId of ["accAuroraCrown", "accCozyScarf", "accFairyWings"]) {
    craftOrUpgradeBoutiqueAccessory(corridorState, accId);
    craftOrUpgradeBoutiqueAccessory(corridorState, accId);
    craftOrUpgradeBoutiqueAccessory(corridorState, accId);
  }
  equipBoutiqueAccessory(corridorState, "accAuroraCrown", 1);
  equipBoutiqueAccessory(corridorState, "accCozyScarf", 2);
  equipBoutiqueAccessory(corridorState, "accFairyWings", 3);
  unlockOrApplyBoutiqueSheen(corridorState, 4, "solar_gold");
  const syn4Boutique = evaluateCorridorSquadSynergy(corridorState, corMons, fl1, { getMonTypes: (m) => m.types });
  assert(syn4Boutique.boutiqueOutAdd > 0 && syn4Boutique.playerDamageMul > syn3Camp.playerDamageMul, "Pillar 4 (Starlight Styling) boosts corridor synergy");

  corridorState.res.ancientGeneAmber.value = 150;
  const imprintOrder = ["primalClaw", "primalShell", "primalFern", "primalMeteor"];
  for (let i = 0; i < imprintOrder.length; i += 1) {
    const impId = imprintOrder[i];
    awakenOrUpgradePrimalImprint(corridorState, impId, { equipMonId: i + 1 });
    awakenOrUpgradePrimalImprint(corridorState, impId);
    awakenOrUpgradePrimalImprint(corridorState, impId);
    equipPrimalImprint(corridorState, impId, i + 1);
  }
  const syn5Amber = evaluateCorridorSquadSynergy(corridorState, corMons, fl1, { getMonTypes: (m) => m.types });
  assert(
    syn5Amber.amberOutAdd > 0 &&
      syn5Amber.quadResonanceActive === true &&
      syn5Amber.playerDamageMul > syn4Boutique.playerDamageMul,
    "Pillar 5 (Prehistoric Bloodline Imprints + Quad Resonance) boosts corridor synergy above 4-pillar setup",
  );

  // Simulate single floor (Floor 1 -> Tier 1) and consecutive surges (Floors 2..6, Floors 7..11 -> Tier 5)
  const amberBeforeRun = corridorState.res.ancientGeneAmber.value;
  const corSingle = simulateStarCorridorTrial(corridorState, { mode: "single", getMonTypes: (m) => m.types, nowMs: 60_000_000 });
  assert(
    corSingle.ok &&
      corSingle.win &&
      corSingle.floorsCleared === 1 &&
      corSingle.highestFloorCleared === 1 &&
      corSingle.corridorTier === 1 &&
      (corSingle.rewardsEarned.corridorStarMedals || 0) >= 5 &&
      corridorState.res.ancientGeneAmber.value > amberBeforeRun,
    "single Star-Rail Corridor run clears Floor 1, unlocks Tier 1, and settles corridorStarMedals & ancientGeneAmber",
  );

  const surgeA = simulateStarCorridorTrial(corridorState, { mode: "surge", getMonTypes: (m) => m.types, nowMs: 60_010_000 });
  const surgeB = simulateStarCorridorTrial(corridorState, { mode: "surge", getMonTypes: (m) => m.types, nowMs: 60_020_000 });
  assert(
    surgeA.win &&
      surgeB.win &&
      corridorState.pve.starCorridor.highestFloorCleared >= 11 &&
      corridorState.pve.starCorridor.corridorTier === STAR_CORRIDOR_MAX_TIER,
    "consecutive Star-Rail Corridor surges climb past Floor 10 and unlock max Corridor Tier 5",
  );

  // Verify Corridor Medal supply depot exchange
  const medalsBeforeEx = corridorState.res.corridorStarMedals.value;
  const amberBeforeEx = corridorState.res.ancientGeneAmber.value;
  const exRes = exchangeCorridorMedals(corridorState, "amber_pack");
  assert(
    exRes.ok &&
      corridorState.res.corridorStarMedals.value === medalsBeforeEx - 3 &&
      corridorState.res.ancientGeneAmber.value === amberBeforeEx + 4,
    "exchangeCorridorMedals converts 3 corridorStarMedals into +4 ancientGeneAmber",
  );

  // Verify Corridor Tier 5 permanent global multipliers across production, tech capture/shiny, breeding & PvE
  const tier5CorOnly = defaultState();
  tier5CorOnly.pve.starCorridor = { highestFloorCleared: 10, corridorTier: 5 };
  const corBonus = computeStarCorridorBonus(tier5CorOnly);
  assert(
    corBonus.corridorTier === 5 &&
      corBonus.prodAdd === 0.225 &&
      corBonus.catchAdd === 0.04 &&
      corBonus.shinyAdd === 0.2 &&
      corBonus.ivTrainAdd === 0.25 &&
      corBonus.pveOutAdd === 0.225,
    "Star-Rail Corridor Tier 5 provides permanent +22.5% prod, +4% catch, +20% shiny, +25% IV train, +22.5% PvE damage",
  );
  const corProd = { catnipPerSec: 10, woodPerSec: 10, mineralsPerSec: 10 };
  finalizeProductionRates(corProd, tier5CorOnly, 1);
  const corTech = computeTechEffects(tier5CorOnly, { tech: {} }, { serverBuffLevels: new Map() });
  const bareShinyRef = computeBreedingShinyInfo(bareRef, corridorState.mons.list[0], corridorState.mons.list[1]);
  const corShiny = computeBreedingShinyInfo(tier5CorOnly, corridorState.mons.list[0], corridorState.mons.list[1]);
  assert(corProd.catnipPerSec > bareProd.catnipPerSec * 1.2, "finalizeProductionRates applies Star-Rail Corridor Tier 5 prodMul");
  assert(corTech.catchChanceAdd >= bareTech.catchChanceAdd + 0.04, "computeTechEffects applies Star-Rail Corridor Tier 5 catchAdd");
  assert(corShiny.rate > bareShinyRef.rate * 1.18, "computeBreedingShinyInfo applies Star-Rail Corridor Tier 5 shinyChanceMul");
  assert(computeDualSanctumBadgeBonus(tier5CorOnly).pveOutMul >= 1.225, "computeDualSanctumBadgeBonus includes Star-Rail Corridor Tier 5 damage bonus");

  // Verify PvE Tab delegated [data-pve-corridor-fight="surge"] click populates ui.pveBattleResult
  uiSave.mons.list.push({ id: 4, pid: "p025", dex: 25, name: "雷光鼠", lvl: 80, stars: 3, types: ["electric", "light"] });
  mockUi.pveDirty = true;
  renderFn();
  const corridorFightTarget = {
    disabled: false,
    hasAttribute: () => false,
    getAttribute: (k) => (k === "data-pve-corridor-fight" ? "surge" : null),
    closest: (sel) => (sel === "[data-pve-corridor-fight]" ? corridorFightTarget : null),
  };
  listeners.click.forEach((fn) => fn({ target: corridorFightTarget }));
  assert(
    mockUi.pveBattleResult?.corridorCleared === true &&
      mockUi.pveBattleResult?.rewardText?.includes("星轨回廊突破") &&
      mockUi.pveBattleResult?.rewardText?.includes("星轨回廊勋章") &&
      mockUi.pveBattleResult?.rewardText?.includes("远古基因琥珀"),
    "PvE Tab [data-pve-corridor-fight='surge'] triggers Star-Rail Corridor surge and populates result modal",
  );

  // Save/Load roundtrip for Star-Rail Corridor & corridorStarMedals
  const corSaved = JSON.stringify(serializeState(corridorState));
  const corReloaded = loadFromRaw(corSaved);
  assert(
    corReloaded.pve?.starCorridor?.corridorTier === 5 &&
      corReloaded.pve?.starCorridor?.highestFloorCleared >= 11 &&
      corReloaded.res?.corridorStarMedals?.value > 0 &&
      corReloaded.res?.ancientGeneAmber?.value > 0,
    "serializeState -> loadFromRaw preserves starCorridor tier/progress, corridorStarMedals, and ancientGeneAmber",
  );

  // ============================================================================
  // ML-9: 三系生态大师锦标殿（每日轮换三系法则 · 6 轮锦标阶梯 · 三系冠军徽章 Tier 1~5 全局增幅）
  // ============================================================================
  const dayAt = (k) => new Date(2026, 10, 17 + k, 12, 0, 0).getTime();
  const rotByDay = [0, 1, 2, 3].map((k) => getEcoTriRotation(dayAt(k)));
  assert(ECO_TRI_ROTATIONS.length === 3 && ECO_TRI_RUNGS.length === 6, "3 tri-element rotations and 6 ladder rounds defined");
  assert(
    new Set(rotByDay.slice(0, 3).map((r) => r.id)).size === 3 && rotByDay[3].id === rotByDay[0].id,
    "featured three-element rule rotates every local day and cycles after 3 days",
  );
  assert(
    new Set(ECO_TRI_ROTATIONS.flatMap((r) => r.elements)).size === 9,
    "the three rotations cover all 9 elements (草水火 / 风岩电 / 光暗幻)",
  );
  assert(rotByDay[0].msUntilNext > 0 && rotByDay[0].msUntilNext <= 86_400_000, "rotation exposes a countdown to the next rule change");
  const verdantDay = [0, 1, 2].map(dayAt).find((t) => getEcoTriRotation(t).id === "tri_verdant");
  const tempestDay = [0, 1, 2].map(dayAt).find((t) => getEcoTriRotation(t).id === "tri_tempest");
  const twilightDay = [0, 1, 2].map(dayAt).find((t) => getEcoTriRotation(t).id === "tri_twilight");
  const verdant = getEcoTriRotation(verdantDay);
  assert(verdant.elements.join("/") === "grass/water/fire", "草/水/火 ecology rotation present");
  const r0 = getEcoTriRungDef(verdant, 0);
  const r5 = getEcoTriRungDef(verdant, 5);
  assert(
    r0.enemies.length === 3 &&
      r0.enemies.every((e, i) => e.types[0] === verdant.elements[i]) &&
      r0.stageType === "grass" &&
      getEcoTriRungDef(verdant, 1).stageType === "water" &&
      getEcoTriRungDef(verdant, 2).stageType === "fire",
    "each round fields one rival per featured element and the arena element follows the triad cycle",
  );
  assert(
    r5.isFinal && r5.firstRewards.driftBottle >= 4 && r5.firstRewards.shinyStarSand === 3 && r5.firstRewards.corridorStarMedals === 2,
    "final round first-win pays the champion pool (drift bottles + star sand + corridor medals)",
  );
  assert(r5.enemies.every((e) => e.lvl > r0.enemies[0].lvl && e.stars > r0.enemies[0].stars), "ladder difficulty escalates to the final");

  // Old saves → safe defaults
  const legacyTri = loadFromRaw(JSON.stringify({ version: 3, pve: { progress: { "1-1": true } } }));
  const legacyCrest = computeEcoTriCrestBonus(legacyTri);
  assert(
    legacyCrest.crestTier === 0 && legacyCrest.prodMul === 1 && legacyCrest.shinyChanceMul === 1 && legacyCrest.pveOutMul === 1,
    "legacy save without ecoTriHall loads with a neutral crest bonus",
  );

  const triMon = (id, dex, name, types, lvl = 95, stars = 4) => ({
    id,
    dex,
    pid: `p${String(dex).padStart(3, "0")}`,
    name,
    lvl,
    stars,
    affection: 100,
    types,
    nature: "modest",
    baseStats: { hp: 110, atk: 96, def: 104, spa: 124, spd: 108, spe: 112 },
    iv: { hp: 28, atk: 28, def: 28, spa: 31, spd: 28, spe: 30 },
  });
  const triState = defaultState();
  triState.mons.list = [
    triMon(1, 4, "炽尾幼麟", ["fire"]),
    triMon(2, 7, "沧澜幼龟", ["water"]),
    triMon(3, 10, "翠玉灵蚕", ["grass"]),
    triMon(4, 16, "云羽雏雀", ["wind"]),
    triMon(5, 74, "晶簇岩球", ["stone"]),
    triMon(6, 25, "星雷灵鼠", ["electric"]),
    triMon(7, 29, "紫晶幼兔", ["dark"], 4, 0),
  ];
  triState.mons.nextId = 8;
  const triTypes = (m) => m.types;

  const hall0 = ensureEcoTriHallState(triState, { nowMs: verdantDay });
  assert(hall0.rotationId === "tri_verdant" && hall0.rungIdx === 0 && hall0.crestTier === 0, "ensureEcoTriHallState syncs today's rotation with defaults");
  const autoTri = autofillEcoTriSquad(triState, triTypes, monPower, { nowMs: verdantDay });
  assert(
    autoTri.ok && autoTri.squadIds.length === ECO_TRI_SQUAD_SIZE && [1, 2, 3].every((id) => autoTri.squadIds.includes(id)),
    "autofillEcoTriSquad picks a squad covering 草/水/火 on the verdant day",
  );
  for (const id of autoTri.squadIds) assert(busyMonIds(triState).has(id), `busyMonIds protects tournament squad member #${id}`);
  const fullSyn = evaluateEcoTriSquadSynergy(triState, [1, 2, 3].map((id) => triState.mons.list[id - 1]), verdant, { getMonTypes: triTypes });
  const offSyn = evaluateEcoTriSquadSynergy(triState, [4, 5, 6].map((id) => triState.mons.list[id - 1]), verdant, { getMonTypes: triTypes });
  assert(
    fullSyn.triCycleActive && fullSyn.coveredElements.length === 3 && !offSyn.triCycleActive && fullSyn.playerDamageMul > offSyn.playerDamageMul + 0.4,
    "covering all three featured elements triggers 「三系生态循环」 and out-damages an off-rotation squad",
  );
  assert(fullSyn.incomingDamageMul < offSyn.incomingDamageMul, "三系生态循环 also reduces incoming damage");
  triState.meta.wishDock = { badges: { badgeStarShell: 1, badgeMoonPearl: 2 } };
  const dockCheerSyn = evaluateEcoTriSquadSynergy(triState, [1, 2, 3].map((id) => triState.mons.list[id - 1]), verdant, { getMonTypes: triTypes });
  assert(dockCheerSyn.dockBadgeCount === 2 && dockCheerSyn.incomingDamageMul < fullSyn.incomingDamageMul, "Wish Dock badges add 「海风助威」 damage reduction");
  toggleEcoTriSquadMon(triState, 3);
  assert(triState.pve.ecoTriHall.squadIds.length === 2, "toggleEcoTriSquadMon removes a member");
  toggleEcoTriSquadMon(triState, 3);
  assert(toggleEcoTriSquadMon(triState, 4).ok === false, "squad is capped at 3 partners");

  // Weak squad is stopped early → no crown
  const weakTri = defaultState();
  weakTri.mons.list = [triMon(1, 4, "炽尾幼麟", ["fire"], 20, 0), triMon(2, 7, "沧澜幼龟", ["water"], 20, 0)];
  weakTri.mons.nextId = 3;
  setEcoTriSquad(weakTri, [1, 2]);
  const weakRun = simulateEcoTriTournament(weakTri, { mode: "climb", getMonTypes: triTypes, nowMs: verdantDay });
  assert(weakRun.ok && !weakRun.crowned && weakRun.roundsCleared < 6 && weakTri.pve.ecoTriHall.crestTier === 0, "under-levelled squad is stopped before the final");

  // Strong squad climbs all 6 rounds and is crowned (crest Tier 1) with the champion pool
  const bottlesBefore = triState.res.driftBottle?.value || 0;
  const climb = simulateEcoTriTournament(triState, { mode: "climb", getMonTypes: triTypes, nowMs: verdantDay });
  assert(
    climb.ok && climb.crowned && climb.roundsCleared === 6 && climb.crestTier === 1 && triState.pve.ecoTriHall.championToday,
    "full-coverage squad climbs 6 rounds and is crowned (crest Tier 1)",
  );
  assert(
    (triState.res.driftBottle?.value || 0) > bottlesBefore &&
      climb.rewardsEarned.shinyStarSand === 3 &&
      climb.rewardsEarned.corridorStarMedals === 2,
    "championship grants drift bottles, star sand and corridor medals",
  );
  assert(simulateEcoTriTournament(triState, { mode: "single", getMonTypes: triTypes, nowMs: verdantDay }).reason === "ladder_complete", "finished ladder blocks further fights until restart");
  restartEcoTriLadder(triState, { nowMs: verdantDay });
  const rerun = simulateEcoTriTournament(triState, { mode: "climb", getMonTypes: triTypes, nowMs: verdantDay });
  assert(
    rerun.roundsCleared === 6 && !rerun.crowned && !rerun.rewardsEarned.shinyStarSand && triState.pve.ecoTriHall.crestTier === 1,
    "same-day rematch pays repeat rewards only (no second crown / champion pool)",
  );

  // Next day: ladder resets under a new rule; crown again → Tier 2
  setEcoTriSquad(triState, [4, 5, 6]);
  const tempestRun = simulateEcoTriTournament(triState, { mode: "climb", getMonTypes: triTypes, nowMs: tempestDay });
  assert(
    triState.pve.ecoTriHall.rotationId === "tri_tempest" && tempestRun.crowned && tempestRun.crestTier === 2,
    "a new day resets the ladder under 风/岩/电 and a second crown reaches Tier 2",
  );
  assert(triState.pve.ecoTriHall.triadChampions.tri_verdant === 1 && triState.pve.ecoTriHall.triadChampions.tri_tempest === 1, "per-rule championships are tracked");

  // Crest tier gating: Tier 4 needs 2 rules, Tier 5 needs all 3 rules
  const gate = defaultState();
  gate.pve.ecoTriHall = { totalChampionships: 7, triadChampions: { tri_verdant: 7 } };
  assert(computeEcoTriCrestBonus(gate).crestTier === 3, "single-rule champion is capped at Tier 3");
  gate.pve.ecoTriHall.triadChampions = { tri_verdant: 6, tri_tempest: 1 };
  assert(computeEcoTriCrestBonus(gate).crestTier === 4, "two-rule champion is capped at Tier 4");
  gate.pve.ecoTriHall.triadChampions = { tri_verdant: 5, tri_tempest: 1, tri_twilight: 1 };
  const maxCrest = computeEcoTriCrestBonus(gate);
  assert(
    maxCrest.crestTier === ECO_TRI_CREST_MAX_TIER &&
      maxCrest.tripleMaster &&
      maxCrest.prodAdd === 0.2 &&
      maxCrest.catchAdd === 0.03 &&
      maxCrest.shinyAdd === 0.15 &&
      maxCrest.pveOutAdd === 0.25,
    "Tier 5 三系大师 crest: +20% prod, +3% catch, +15% shiny, +25% PvE damage",
  );
  assert(Boolean(twilightDay), "光/暗/幻 rotation reachable on its day");
  const crestProd = { catnipPerSec: 10, woodPerSec: 10, mineralsPerSec: 10 };
  finalizeProductionRates(crestProd, gate, 1);
  const crestTech = computeTechEffects(gate, { tech: {} }, { serverBuffLevels: new Map() });
  const crestShiny = computeBreedingShinyInfo(gate, triState.mons.list[0], triState.mons.list[1]);
  const crestBareShiny = computeBreedingShinyInfo(defaultState(), triState.mons.list[0], triState.mons.list[1]);
  assert(crestProd.catnipPerSec > bareProd.catnipPerSec * 1.18, "finalizeProductionRates applies 三系冠军徽章 prodMul");
  assert(crestTech.catchChanceAdd >= bareTech.catchChanceAdd + 0.03, "computeTechEffects applies 三系冠军徽章 catchAdd");
  assert(crestTech.shinyChanceMul > bareTech.shinyChanceMul * 1.14, "computeTechEffects applies 三系冠军徽章 shinyChanceMul");
  assert(crestShiny.rate > crestBareShiny.rate * 1.12, "computeBreedingShinyInfo applies 三系冠军徽章 shinyChanceMul");
  assert(computeDualSanctumBadgeBonus(gate).ecoTriOutAdd === 0.25, "computeDualSanctumBadgeBonus includes 三系冠军徽章 PvE damage");

  // Partners away at the Wish Dock sit out the tournament (autofill / toggle / fight all skip them)
  const seaTri = defaultState();
  seaTri.mons.list = [triMon(1, 4, "炽尾幼麟", ["fire"]), triMon(2, 7, "沧澜幼龟", ["water"]), triMon(3, 10, "翠玉灵蚕", ["grass"])];
  seaTri.mons.nextId = 4;
  seaTri.meta.wishDock = { routes: { reef: { active: true, completed: false, crewIds: [2], elapsedSec: 0, durationSec: 1200 } } };
  const seaAuto = autofillEcoTriSquad(seaTri, triTypes, monPower, { nowMs: verdantDay });
  assert(seaAuto.ok && !seaAuto.squadIds.includes(2), "autofillEcoTriSquad skips partners away at the Wish Dock");
  assert(toggleEcoTriSquadMon(seaTri, 2).reason === "mon_at_sea", "toggleEcoTriSquadMon refuses partners away at the Wish Dock");
  setEcoTriSquad(seaTri, [2]);
  const seaRun = simulateEcoTriTournament(seaTri, { mode: "single", getMonTypes: triTypes, nowMs: verdantDay });
  assert(!seaRun.ok && seaRun.reason === "squad_at_sea", "a squad entirely out at sea cannot enter the tournament");

  // Save/Load roundtrip
  const triReloaded = loadFromRaw(JSON.stringify(serializeState(triState)));
  assert(
    triReloaded.pve?.ecoTriHall?.crestTier === 2 &&
      triReloaded.pve.ecoTriHall.totalChampionships === 2 &&
      triReloaded.pve.ecoTriHall.squadIds.length === 3 &&
      triReloaded.pve.ecoTriHall.records.length === 2,
    "serializeState -> loadFromRaw preserves crest tier, championships, squad and records",
  );

  // PvE Tab delegated [data-pve-tri-fight="climb"] click populates ui.pveBattleResult
  mockUi.pveDirty = true;
  renderFn();
  const triFightTarget = {
    disabled: false,
    hasAttribute: () => false,
    getAttribute: (k) => (k === "data-pve-tri-fight" ? "climb" : null),
    closest: (sel) => (sel === "[data-pve-tri-fight]" ? triFightTarget : null),
  };
  listeners.click.forEach((fn) => fn({ target: triFightTarget }));
  assert(
    mockUi.pveBattleResult?.rewardText?.includes("三系锦标赛晋级") &&
      Array.isArray(mockUi.pveBattleResult?.stageElements) &&
      mockUi.pveBattleResult.stageElements.length === 3,
    "PvE Tab [data-pve-tri-fight='climb'] runs the tournament and populates the result modal",
  );

  // ============================================================================
  // ML-10: 萌灵杂技舞台表演赛（每日轮换评审主题 · 3 拍连段编排 · 多样/协奏/羁绊/节拍评分 · 舞台星光奖杯全局增幅）
  // ============================================================================
  const showDay = (k, h = 12) => new Date(2026, 10, 18 + k, h, 0, 0).getTime();
  const themesByDay = [0, 1, 2, 3, 4].map((k) => getAcrobatTheme(showDay(k)));
  assert(ACROBAT_THEMES.length === 4 && ACROBAT_TIERS.length === 4, "4 judge themes and 4 trophy tiers defined");
  assert(
    new Set(themesByDay.slice(0, 4).map((t) => t.id)).size === 4 && themesByDay[4].id === themesByDay[0].id,
    "judge theme rotates every local day and cycles after 4 days",
  );
  assert(new Set(ACROBAT_THEMES.flatMap((t) => t.elements)).size === 9, "the 4 judge themes favour all 9 elements between them");
  assert(themesByDay[0].msUntilNext > 0 && themesByDay[0].msUntilNext <= 86_400_000, "theme exposes a countdown to the next rotation");
  for (const el of ["fire", "water", "grass", "electric", "wind", "stone", "light", "dark", "mystic"]) {
    assert(ACROBAT_MOVES.filter((m) => m.element === el).length === 2, `2 acrobatic moves for ${el}`);
  }
  assert(ACROBAT_MOVES.filter((m) => !m.element).length === 2, "2 universal moves anyone can perform");
  const dayOf = (id) => [0, 1, 2, 3].map((k) => showDay(k)).find((t) => getAcrobatTheme(t).id === id);
  const moonDay = dayOf("show_moonlit");
  const blazeDay = dayOf("show_blaze");
  const tideDay = dayOf("show_tide");
  const summitDay = dayOf("show_summit");
  assert(moonDay && blazeDay && tideDay && summitDay, "every judge theme is reachable on its day");

  // Old saves → neutral trophy bonus
  const legacyShow = loadFromRaw(JSON.stringify({ version: 3, pve: { progress: { "1-1": true } } }));
  const legacyTrophy = computeAcrobatTrophyBonus(legacyShow);
  assert(
    legacyTrophy.trophyStars === 0 && legacyTrophy.prodMul === 1 && legacyTrophy.shinyChanceMul === 1 && legacyTrophy.pveOutMul === 1 && legacyTrophy.catchAdd === 0,
    "legacy save without acrobatShow loads with a neutral trophy bonus",
  );

  const showMon = (id, dex, name, types, lvl = 80, stars = 3, affection = 80) => ({
    id, dex, pid: `p${String(dex).padStart(3, "0")}`, name, lvl, stars, affection, types, nature: "modest",
    baseStats: { hp: 96, atk: 90, def: 90, spa: 110, spd: 96, spe: 104 },
    iv: { hp: 20, atk: 20, def: 20, spa: 24, spd: 20, spe: 22 },
  });
  const showTypes = (m) => m.types;
  const sOpts = (nowMs, extra = {}) => ({ getMonTypes: showTypes, nowMs, ...extra });
  const showState = defaultState();
  showState.mons.list = [
    showMon(1, 4, "炽尾幼麟", ["fire"]),
    showMon(2, 16, "云羽雏雀", ["wind"]),
    showMon(3, 25, "星雷灵鼠", ["electric"]),
    showMon(4, 197, "幽月影狐", ["dark"]),
    showMon(5, 7, "沧澜幼龟", ["water"]),
    showMon(6, 63, "星眠小狐", ["mystic"]),
  ];
  showState.mons.nextId = 7;
  const blaze = getAcrobatTheme(blazeDay);
  assert(blaze.elements.join("/") === "fire/wind/electric" && blaze.tempo.join("") === "313", "炽焰马戏狂欢 favours fire/wind/electric with a 强弱强 tempo");
  const show0 = ensureAcrobatShowState(showState, { nowMs: blazeDay });
  assert(show0.themeId === "show_blaze" && show0.routine.length === 0 && show0.performedToday === 0, "ensureAcrobatShowState syncs today's theme with defaults");
  assert(getAcrobatMovesForMon(showState.mons.list[0], { getMonTypes: showTypes }).map((m) => m.id).join(",") === "fire_hoop,fire_spin,any_bow,any_pyramid", "a fire partner performs the 2 fire moves + 2 universal moves");

  // Scoring pillars
  const R = (...pairs) => pairs.map(([monId, moveId]) => ({ monId, moveId }));
  const evOf = (routine, theme = blaze, extra = {}) => evaluateAcrobatRoutine(showState, routine, theme, sOpts(blazeDay, extra));
  const best = evOf(R([1, "fire_hoop"], [2, "wind_glide"], [3, "electric_flip"]));
  const sameStyle = evOf(R([1, "fire_hoop"], [2, "wind_leap"], [3, "electric_flip"]));
  const threeStyles = evOf(R([1, "fire_spin"], [2, "wind_glide"], [3, "electric_flip"]));
  assert(
    threeStyles.styleCount === 3 && best.styleCount === 2 && sameStyle.styleCount === 1 &&
      threeStyles.breakdown.variety > best.breakdown.variety && best.breakdown.variety > sameStyle.breakdown.variety,
    "move variety: 3 styles > 2 styles > 1 repeated style",
  );
  assert(best.comboLinks.some((c) => c.name === "烈风焚天共鸣"), "adjacent fire → wind moves form the 「烈风焚天共鸣」 relay");
  const noCombo = evOf(R([1, "fire_hoop"], [3, "electric_flip"], [2, "wind_glide"]));
  assert(best.breakdown.synergy > noCombo.breakdown.synergy, "move order matters: breaking the fire→wind relay lowers synergy");
  const offTheme = evOf(R([5, "water_bubbles"], [4, "dark_clone"], [6, "mystic_float"]));
  assert(best.breakdown.synergy > offTheme.breakdown.synergy, "theme-favoured elements raise synergy");
  assert(best.perSlot.map((s) => s.beatHit).join(",") === "perfect,perfect,perfect" && best.breakdown.timing > sameStyle.breakdown.timing, "beats matching the 强弱强 tempo hit perfect timing");
  assert(best.trioBond && best.breakdown.bond >= 13, "affection ≥70 ×3 triggers 「默契三重奏」");
  const lowBond = defaultState();
  lowBond.mons.list = showState.mons.list.slice(0, 3).map((m) => ({ ...m, affection: 10 }));
  const lowBondEv = evaluateAcrobatRoutine(lowBond, R([1, "fire_hoop"], [2, "wind_glide"], [3, "electric_flip"]), blaze, sOpts(blazeDay));
  assert(!lowBondEv.trioBond && lowBondEv.breakdown.bond < best.breakdown.bond, "low affection lowers the bond pillar");
  const rookie = defaultState();
  rookie.mons.list = showState.mons.list.slice(0, 3).map((m) => ({ ...m, lvl: 6, stars: 0, affection: 10 }));
  const rookieEv = evaluateAcrobatRoutine(rookie, R([1, "fire_hoop"], [2, "wind_glide"], [3, "electric_flip"]), blaze, sOpts(blazeDay));
  assert(rookieEv.craftMul < 0.6 && rookieEv.baseScore < 100 && best.baseScore >= 125, "stage craft scales with level: a Lv.6 troupe stays below silver, a Lv.80 troupe reaches gold");
  assert(getAcrobatTierForScore(69) === 0 && getAcrobatTierForScore(70) === 1 && getAcrobatTierForScore(150) === 4, "tier thresholds 70 / 100 / 125 / 150");
  showState.meta.nightObservatory = { forms: { 1: { element: "fire", at: 1 } } };
  const formNight = evaluateAcrobatRoutine(showState, R([1, "fire_hoop"]), blaze, sOpts(showDay(0, 23)));
  const formDay = evaluateAcrobatRoutine(showState, R([1, "fire_hoop"]), blaze, sOpts(showDay(0, 12)));
  delete showState.meta.nightObservatory.forms[1];
  const noForm = evaluateAcrobatRoutine(showState, R([1, "fire_hoop"]), blaze, sOpts(showDay(0, 23)));
  assert(formNight.breakdown.execution > formDay.breakdown.execution && formDay.breakdown.execution > noForm.breakdown.execution, "nocturnal form boosts show execution (+8% night / +4% day)");

  // Routine editing
  assert(toggleAcrobatPerformer(showState, 1, sOpts(blazeDay)).ok, "toggleAcrobatPerformer adds a partner");
  assert(showState.pve.acrobatShow.routine[0].moveId === "fire_hoop", "a new performer defaults to its best theme move");
  toggleAcrobatPerformer(showState, 2, sOpts(blazeDay));
  toggleAcrobatPerformer(showState, 3, sOpts(blazeDay));
  assert(toggleAcrobatPerformer(showState, 4, sOpts(blazeDay)).reason === "routine_full", "routine is capped at 3 performers");
  assert(setAcrobatRoutineMove(showState, 0, "water_bubbles", sOpts(blazeDay)).reason === "move_unavailable", "a fire partner cannot perform a water move");
  assert(setAcrobatRoutineMove(showState, 1, "wind_glide", sOpts(blazeDay)).ok, "setAcrobatRoutineMove picks an available move");
  shiftAcrobatSlot(showState, 2, -1);
  assert(showState.pve.acrobatShow.routine.map((r) => r.monId).join(",") === "1,3,2", "shiftAcrobatSlot swaps the running order");
  shiftAcrobatSlot(showState, 1, 1);
  for (const id of [1, 2, 3]) assert(busyMonIds(showState).has(id), `busyMonIds protects stage performer #${id}`);

  // Partners away at the Wish Dock / stationed at the Moonlit Observatory do not take the stage
  showState.meta.wishDock = { routes: { reef: { active: true, completed: false, crewIds: [4], elapsedSec: 0, durationSec: 1200 } } };
  showState.meta.nightObservatory = { stationedIds: [5], forms: {} };
  assert(getAcrobatUnavailableMonIds(showState).has(4) && getAcrobatUnavailableMonIds(showState).has(5), "dock crew and observatory observers are unavailable for the stage");
  toggleAcrobatPerformer(showState, 3, sOpts(blazeDay));
  assert(toggleAcrobatPerformer(showState, 4, sOpts(blazeDay)).reason === "mon_away", "a partner at sea cannot join the routine");
  assert(toggleAcrobatPerformer(showState, 5, sOpts(blazeDay)).reason === "mon_away", "a stationed observer cannot join the routine");
  const autoRoutine = autofillAcrobatRoutine(showState, sOpts(blazeDay));
  assert(autoRoutine.ok && autoRoutine.routine.length === 3 && autoRoutine.routine.every((r) => r.monId !== 4 && r.monId !== 5), "autofillAcrobatRoutine skips busy partners");
  assert(autoRoutine.projectedScore >= best.baseScore, "autofill finds a routine at least as good as the hand-made one");
  const awayState = defaultState();
  awayState.mons.list = [showMon(1, 4, "炽尾幼麟", ["fire"])];
  awayState.mons.nextId = 2;
  ensureAcrobatShowState(awayState, { nowMs: blazeDay });
  toggleAcrobatPerformer(awayState, 1, sOpts(blazeDay));
  awayState.meta.nightObservatory = { stationedIds: [1] };
  assert(performAcrobatShow(awayState, sOpts(blazeDay)).reason === "routine_away", "a routine whose performers are all busy cannot perform");

  // Perform: tier, rewards, trophy stars; 3 free shows then futurecoin ×20, max 6/day; lantern lights ×1.1
  showState.res.futurecoin = { value: 0, cap: 99999 };
  showState.res.fireflyLantern = { value: 0, cap: 999 };
  const perf1 = performAcrobatShow(showState, sOpts(blazeDay, { randFloat: () => 0.5 }));
  assert(perf1.ok && perf1.live === 0 && perf1.score === perf1.baseScore && perf1.costKind === "free", "first show of the day is free, live roll 0 at rng 0.5");
  assert(perf1.tier >= 3 && showState.pve.acrobatShow.bestTierByTheme.show_blaze === perf1.tier, "a Lv.80 troupe earns gold+ and records the theme's best tier");
  assert(
    perf1.rewards.futurecoin === 10 + perf1.tier * 15 + 40 * perf1.tier && showState.res.futurecoin.value === perf1.rewards.futurecoin,
    "rewards: futurecoin by tier + first-time tier bonus",
  );
  assert(showState.res.fireflyLantern.value === perf1.tier - 1, "silver+ shows hand out firefly lanterns");
  assert(showState.mons.list.find((m) => m.id === autoRoutine.routine[0].monId).exp > 0, "performers gain exp");
  assert(showState.pve.acrobatShow.lastShow?.score === perf1.score && showState.pve.acrobatShow.records.length === 1, "last show + record stored");
  const trophy1 = computeAcrobatTrophyBonus(showState);
  assert(trophy1.trophyStars === perf1.tier && trophy1.prodAdd > 0, "trophy stars follow the best tier per theme");
  performAcrobatShow(showState, sOpts(blazeDay, { randFloat: () => 0.5 }));
  performAcrobatShow(showState, sOpts(blazeDay, { randFloat: () => 0.5 }));
  assert(getAcrobatShowCost(showState, { nowMs: blazeDay }).kind === "coin", "after 3 free shows the next one costs futurecoin");
  showState.res.futurecoin.value = 5;
  assert(performAcrobatShow(showState, sOpts(blazeDay)).reason === "insufficient_coin", "extra show blocked without futurecoin ×20");
  showState.res.futurecoin.value = 500;
  showState.res.fireflyLantern.value = 2;
  const plain = evaluateAcrobatRoutine(showState, showState.pve.acrobatShow.routine, blaze, sOpts(blazeDay)).baseScore;
  const lit = performAcrobatShow(showState, sOpts(blazeDay, { randFloat: () => 0.5, useLanterns: true }));
  assert(lit.ok && lit.costKind === "coin" && lit.score === Math.round(plain * ACROBAT_LANTERN_SCORE_MUL) && showState.res.fireflyLantern.value === lit.rewards.fireflyLantern, "lantern lights cost 2 lanterns and multiply the score ×1.1");
  assert(showState.res.futurecoin.value === 500 - ACROBAT_EXTRA_SHOW_COIN + lit.rewards.futurecoin, "extra show charged futurecoin ×20");
  performAcrobatShow(showState, sOpts(blazeDay));
  performAcrobatShow(showState, sOpts(blazeDay));
  assert(performAcrobatShow(showState, sOpts(blazeDay)).reason === "daily_limit" && showState.pve.acrobatShow.performedToday === ACROBAT_DAILY_MAX_SHOWS, "daily show limit is 6");
  const nextDay = ensureAcrobatShowState(showState, { nowMs: blazeDay + 86_400_000 });
  assert(nextDay.performedToday === 0 && nextDay.themeId !== "show_blaze" && nextDay.bestTierByTheme.show_blaze >= 3, "a new day resets the show count and rotates the judge; trophies persist");

  // Full trophy cabinet → global bonus wiring
  const cab = defaultState();
  cab.pve.acrobatShow = { bestTierByTheme: { show_moonlit: 4, show_blaze: 4, show_tide: 4, show_summit: 4 } };
  const full = computeAcrobatTrophyBonus(cab);
  assert(
    full.trophyStars === 16 && full.allRadiant && full.prodAdd === 0.168 && full.catchAdd === 0.016 && full.shinyAdd === 0.08 && full.pveOutAdd === 0.16,
    "16-star 璀璨星光奖杯: +16.8% prod, +1.6% catch, +8% shiny, +16% PvE damage",
  );
  const cabProd = { catnipPerSec: 10, woodPerSec: 10, mineralsPerSec: 10 };
  finalizeProductionRates(cabProd, cab, 1);
  const cabTech = computeTechEffects(cab, { tech: {} }, { serverBuffLevels: new Map() });
  assert(cabProd.catnipPerSec > bareProd.catnipPerSec * 1.16, "finalizeProductionRates applies the trophy prodMul");
  assert(cabTech.catchChanceAdd >= bareTech.catchChanceAdd + 0.0159 && cabTech.shinyChanceMul > bareTech.shinyChanceMul * 1.07, "computeTechEffects applies trophy catch + shiny");
  const cabShiny = computeBreedingShinyInfo(cab, showState.mons.list[0], showState.mons.list[1]);
  const cabBare = computeBreedingShinyInfo(defaultState(), showState.mons.list[0], showState.mons.list[1]);
  assert(cabShiny.rate > cabBare.rate * 1.06, "computeBreedingShinyInfo applies the trophy shiny bonus");
  assert(computeDualSanctumBadgeBonus(cab).acrobatOutAdd === 0.16, "computeDualSanctumBadgeBonus includes the trophy PvE damage");

  // Save/Load roundtrip + forced release detaches a performer
  const showReloaded = loadFromRaw(JSON.stringify(serializeState(showState)));
  assert(
    showReloaded.pve?.acrobatShow?.bestTierByTheme?.show_blaze >= 3 &&
      showReloaded.pve.acrobatShow.routine.length === 3 &&
      showReloaded.pve.acrobatShow.records.length >= 1,
    "serializeState -> loadFromRaw preserves trophies, routine and records",
  );
  detachAcrobatPerformer(showReloaded, showReloaded.pve.acrobatShow.routine[0].monId);
  assert(showReloaded.pve.acrobatShow.routine.length === 2, "detachAcrobatPerformer removes a released partner from the routine");

  // ML-10 nocturnal forms also lift the ML-9 tournament squad a little at night
  const formTri = defaultState();
  formTri.mons.list = [triMon(1, 4, "炽尾幼麟", ["fire"], 70, 3), triMon(2, 7, "沧澜幼龟", ["water"], 70, 3), triMon(3, 10, "翠玉灵蚕", ["grass"], 70, 3)];
  formTri.mons.nextId = 4;
  setEcoTriSquad(formTri, [1, 2, 3]);
  const nightVerdant = new Date(new Date(verdantDay).setHours(22, 0, 0, 0)).getTime();
  const triNoForm = simulateEcoTriTournament(JSON.parse(JSON.stringify(formTri)), { mode: "single", getMonTypes: triTypes, nowMs: nightVerdant, commit: false });
  formTri.meta.nightObservatory = { forms: { 1: { element: "fire" }, 2: { element: "water" }, 3: { element: "grass" } } };
  const triForm = simulateEcoTriTournament(formTri, { mode: "single", getMonTypes: triTypes, nowMs: nightVerdant, commit: false });
  assert(triForm.ok && triNoForm.ok && (triForm.rungResults[0]?.teamHpPct ?? 0) >= (triNoForm.rungResults[0]?.teamHpPct ?? 0), "nocturnal forms do not weaken (and slightly lift) the tournament squad at night");

  // ============================================================================
  // ML-11: 萌灵「季节迁徙候鸟萌灵」— 本地季节门控（注入时钟）/ 驻留观察 / 迁徙纪念章 / 结伴入队 / 跨季换批 / 存档兼容 / 转生保留
  // ============================================================================
  {
    const at = (y, mo, d, h = 12) => new Date(y, mo - 1, d, h, 0, 0, 0).getTime();
    // 0) Season gate by local month (meteorological seasons; winter keyed by its December)
    const s1 = getMigrationSeason(at(2026, 11, 18, 21));
    assert(s1.id === "autumn" && s1.key === "2026-autumn" && s1.migrants.length === 3, "Nov 18 is autumn (秋穗雁行) with 3 visitors");
    assert(s1.msUntilEnd === at(2026, 12, 1, 0) - at(2026, 11, 18, 21), "autumn visitors depart on Dec 1 00:00");
    const sJan = getMigrationSeason(at(2027, 1, 10));
    assert(sJan.id === "winter" && sJan.key === "2026-winter" && sJan.endMs === at(2027, 3, 1, 0), "January belongs to the 2026 winter (Dec→Feb), departs Mar 1");
    assert(getMigrationSeason(at(2026, 12, 1, 0)).key === "2026-winter" && getMigrationSeason(at(2026, 11, 30, 23)).key === "2026-autumn", "Dec 1 00:00 switches autumn → winter");
    assert(
      getMigrationSeason(at(2026, 3, 1, 0)).id === "spring" && getMigrationSeason(at(2026, 2, 28, 23)).id === "winter" && getMigrationSeason(at(2026, 6, 15)).id === "summer",
      "spring 3~5 / summer 6~8 boundaries",
    );
    assert(MIGRANT_DEFS.length === 12 && MIGRATION_SEASONS.every((s) => getMigrantsForSeason(s.id).length === 3), "12 migrants, 3 per season");
    assert(MIGRANT_DEFS.every((m) => globalThis.BEAST_ZH?.[m.pid] === m.name && Number(m.pid.slice(1)) === m.dex), "every migrant reuses an existing roster creature (no new creature art)");

    // 1) Old saves: neutral defaults
    const legacyMg = loadFromRaw(JSON.stringify({ version: 3, res: { futurecoin: { value: 5, cap: 999 } }, mons: { nextId: 2, list: [{ id: 1, dex: 16, pid: "p016", name: "云羽雏雀", lvl: 5 }] } }));
    assert(legacyMg && !legacyMg.meta.seasonMigration, "legacy save loads without seasonMigration");
    const lb = computeSeasonMigrationBonus(legacyMg);
    assert(lb.prodMul === 1 && lb.shinyChanceMul === 1 && lb.catchAdd === 0 && lb.pveOutAdd === 0 && lb.medalPoints === 0, "legacy migration bonus is neutral");
    assert(advanceSeasonMigration(legacyMg, 99999, { nowMs: at(2026, 11, 18) }).records.length === 0, "advance is a no-op without a tracker");
    assert(computeDualSanctumBadgeBonus(legacyMg).migrationOutAdd === 0, "legacy PvE aggregator has no migration bonus");

    // 2) Hosting: stay-over seats come from the sky-island perch
    const mg0 = defaultState();
    mg0.mons.list = [];
    mg0.mons.nextId = 1;
    const tr = ensureSeasonMigrationState(mg0);
    assert(tr.initialized && tr.seasonKey === "" && getMigrationHostCap(mg0) === 1, "fresh tracker: 1 stay-over seat without a perch");
    const nowA = at(2026, 11, 18, 21);
    syncMigrationSeason(mg0, nowA);
    assert(mg0.meta.seasonMigration.seasonKey === "2026-autumn", "first sync adopts the current season");
    assert(toggleMigrantHost(mg0, "mg_spring_sparrow", { nowMs: nowA }).reason === "not_in_season", "out-of-season visitors cannot be hosted");
    assert(toggleMigrantHost(mg0, "mg_autumn_skyking", { nowMs: nowA }).ok, "host the rare autumn visitor");
    assert(toggleMigrantHost(mg0, "mg_autumn_falcon", { nowMs: nowA }).reason === "host_full", "only 1 seat without a perch");
    mg0.meta.skyIsland = { levels: { migrantPerch: 3 } };
    assert(getMigrationHostCap(mg0) === 3 && evaluateMigrationSpeed(mg0).speedMul === 1.3, "perch Lv.3 → 3 seats, observation ×1.30");
    const ah = autoHostMigrants(mg0, { nowMs: nowA });
    assert(ah.ok && mg0.meta.seasonMigration.hostedIds.length === 3, "auto-host fills the remaining seats");

    // 3) Advance with injected clock + rng: one record per 30 min × perch speed, coins, medal tiers
    const coin0 = mg0.res.futurecoin.value;
    const rA = advanceSeasonMigration(mg0, 3600, { nowMs: nowA, randFloat: () => 0.99 });
    const expectPer = Math.floor((3600 * 1.3) / MIGRATION_RECORD_SEC);
    assert(rA.records.length === expectPer * 3 && rA.befriended.length === 0, `1h hosting 3 visitors at ×1.30 → ${expectPer * 3} records, no befriend at roll 0.99`);
    assert(mg0.res.futurecoin.value - coin0 === rA.coin && rA.coin === expectPer * (3 + 3 + 5), "records pay futurecoin (uncommon 3 / rare 5)");
    const mgs = mg0.meta.seasonMigration;
    assert(mgs.seasonRecords === rA.records.length && mgs.atlas.mg_autumn_skyking === expectPer, "season records and atlas counts");
    const rB = advanceSeasonMigration(mg0, 3 * 3600, { nowMs: nowA + 3 * 3600 * 1000, randFloat: () => 0.99 });
    assert(mgs.seasonRecords >= 20 && mgs.medals.autumn === 2 && rB.medals.includes(1) && rB.medals.includes(2), "records cross 8 and 20 → bronze then silver autumn medal");
    assert(getMigrationMedalTier(7) === 0 && getMigrationMedalTier(8) === 1 && getMigrationMedalTier(20) === 2 && getMigrationMedalTier(40) === 3, "medal thresholds 8 / 20 / 40");
    assert(mgs.medalHistory[0]?.key === "2026-autumn" && mgs.medalHistory[0].tier === 2, "medal history keyed by season instance");

    // 4) Befriend: a low roll adds the existing-art creature (once per visitor per season) and registers the dex
    const listBefore = mg0.mons.list.length;
    const rC = advanceSeasonMigration(mg0, 1800 / 1.3 + 1, { nowMs: nowA + 5 * 3600 * 1000, randFloat: () => 0 });
    assert(rC.befriended.length === 3 && mg0.mons.list.length === listBefore + 3, "a low roll befriends each hosted visitor once");
    const friendMon = mg0.mons.list.find((m) => m.pid === "p018");
    assert(friendMon && friendMon.dex === 18 && friendMon.lvl >= 12 && friendMon.affection >= 30 && mg0.dex.caught.p018 >= 1, "befriended 苍穹羽皇 joins at Lv.12 with affection 30 and a dex entry");
    assert(getMigrantFriendMonIds(mg0).get(friendMon.id) === "mg_autumn_skyking", "friend record maps the partner to its migrant");
    assert(new Set(mg0.mons.list.map((m) => m.id)).size === mg0.mons.list.length && mg0.mons.nextId > Math.max(...mg0.mons.list.map((m) => m.id)), "befriended partners get unique ids and advance nextId");
    const rD = advanceSeasonMigration(mg0, 3600, { nowMs: nowA + 6 * 3600 * 1000, randFloat: () => 0 });
    assert(rD.records.length > 0 && rD.befriended.length === 0, "each visitor befriends at most once per season");
    assert(Math.abs(getMigrantBefriendChance(mg0, "mg_autumn_skyking") - 0.048) < 1e-9, "rare 3% + perch Lv.3 1.8% befriend chance");

    // 5) Daily 撒谷迎候: free once, then 20 coins; every hosted visitor +1 record
    const feedNow = at(2026, 11, 19, 9);
    const recBefore = mgs.seasonRecords;
    const f1 = performMigrationFeed(mg0, { nowMs: feedNow, randFloat: () => 0.99 });
    assert(f1.ok && f1.costKind === "free_daily" && mgs.seasonRecords === recBefore + 3, "free feed adds one record per hosted visitor");
    assert(getMigrationFeedFreeLeft(mg0, feedNow) === 0 && getMigrationFeedFreeLeft(mg0, feedNow + 86_400_000) === 1, "free feed resets on the next local day");
    mg0.res.futurecoin.value = 25;
    const f2 = performMigrationFeed(mg0, { nowMs: feedNow + 1000, randFloat: () => 0.99 });
    assert(f2.ok && f2.costKind === "futurecoin" && mg0.res.futurecoin.value === 25 - 20 + f2.coin, "second feed costs 20 coins");
    mg0.res.futurecoin.value = 0;
    assert(performMigrationFeed(mg0, { nowMs: feedNow + 2000 }).reason === "insufficient_feed_cost", "feed blocked without coins");

    // 6) Offline catch-up across the Dec 1 boundary: autumn visitors depart, winter visitors take the same seats
    const crossRun = advanceSeasonMigration(mg0, 4 * 3600, { nowMs: at(2026, 12, 1, 2), randFloat: () => 0.99 });
    assert(crossRun.rolledOver && mgs.seasonKey === "2026-winter", "catch-up across Dec 1 rolls the tracker to winter");
    assert(mgs.hostedIds.length === 3 && mgs.hostedIds.every((id) => id.startsWith("mg_winter_")), "hosted seats hand over to the winter visitors");
    assert(mgs.medals.autumn >= 2 && mgs.seasonRecords === Object.values(mgs.records).reduce((s, n) => s + n, 0) && mgs.seasonRecords < 20, "autumn medal kept; per-season records restart for winter");
    assert(mgs.befriendedThisSeason.length === 0 && Object.keys(mgs.records).every((id) => id.startsWith("mg_winter_")), "winter starts with a fresh befriend allowance");
    assert(mgs.recentLogs.some((l) => l.includes("候鸟启程")), "season rollover writes a departure log");

    // 7) Medal bonus feeds production / effects / breeding / PvE
    mgs.medals = { spring: 3, summer: 3, autumn: 3, winter: 3 };
    const fullMg = computeSeasonMigrationBonus(mg0);
    assert(
      fullMg.medalPoints === 12 && fullMg.allSeasons && Math.abs(fullMg.prodAdd - (12 * 0.004 + 0.02)) < 1e-9 && Math.abs(fullMg.pveOutAdd - 0.06) < 1e-9,
      "12 medal points → production +6.8% (incl. 四季圆满) · PvE +6%",
    );
    const refMg = defaultState();
    const bareMg = { catnipPerSec: 10, woodPerSec: 10, mineralsPerSec: 10 };
    finalizeProductionRates(bareMg, refMg, 1);
    const medalOnly = defaultState();
    medalOnly.meta.seasonMigration = { medals: { ...mgs.medals } };
    const withMedals = { catnipPerSec: 10, woodPerSec: 10, mineralsPerSec: 10 };
    finalizeProductionRates(withMedals, medalOnly, 1);
    assert(withMedals.catnipPerSec >= bareMg.catnipPerSec * fullMg.prodMul * 0.999, "finalizeProductionRates applies the medal prodMul");
    assert(
      computeTechEffects(medalOnly, { tech: {} }, { serverBuffLevels: new Map() }).shinyChanceMul > computeTechEffects(refMg, { tech: {} }, { serverBuffLevels: new Map() }).shinyChanceMul,
      "computeTechEffects applies the medal shiny bonus",
    );
    assert(computeBreedingShinyInfo(medalOnly).rate > computeBreedingShinyInfo(refMg).rate, "breeding shiny odds include the medal bonus");
    assert(
      Math.abs(computeDualSanctumBadgeBonus(medalOnly).migrationOutAdd - 0.06) < 1e-9 && computeDualSanctumBadgeBonus(medalOnly).pveOutMul > computeDualSanctumBadgeBonus(refMg).pveOutMul,
      "PvE damage aggregator includes the medal bonus",
    );

    // 8) Save/load roundtrip; rebirth keeps medals / atlas and drops stale partner ids
    const reloadedMg = loadFromRaw(JSON.parse(JSON.stringify(serializeState(mg0))));
    const rm = ensureSeasonMigrationState(reloadedMg);
    assert(rm.seasonKey === "2026-winter" && rm.medals.spring === 3 && rm.atlas.mg_autumn_skyking > 0 && rm.friends.length === 3 && rm.hostedIds.length === 3, "tracker survives serializeState -> loadFromRaw");
    resetSeasonMigrationFriendsForRebirth(reloadedMg);
    assert(reloadedMg.meta.seasonMigration.friends.every((f) => f.monId === 0) && computeSeasonMigrationBonus(reloadedMg).medalPoints === 12, "rebirth hook keeps medals and drops stale partner ids");
    const eraSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "modules", "systems", "era.js"), "utf8");
    assert(eraSrc.includes("resetSeasonMigrationFriendsForRebirth(state)") && eraSrc.includes("state.meta.skyIsland.crewIds = []"), "confirmPrestige keeps migration medals and recalls the sky-island crew");
  }

  // ============================================================================
  // ML-12: 萌灵「乐队合奏音乐会」— 声部 / 节奏型 / 和声 / 巡演站解锁 / 巡演奖杯光环 / 外出伙伴不登台 / 存档兼容 / 转生
  // ============================================================================
  {
    // 0) Old saves: neutral defaults
    const legacyBand = loadFromRaw(JSON.stringify({ version: 3, res: { futurecoin: { value: 5, cap: 999 } }, mons: { nextId: 2, list: [{ id: 1, dex: 6, pid: "p006", name: "炽翼炎龙", lvl: 5 }] } }));
    assert(legacyBand && !legacyBand.meta.bandConcert, "legacy save loads without bandConcert");
    const lbb = PT2.computeBandTourBonus(legacyBand);
    assert(lbb.trophyStars === 0 && lbb.prodMul === 1 && lbb.catchAdd === 0 && lbb.shinyChanceMul === 1 && lbb.pveOutAdd === 0, "legacy band tour bonus is neutral");
    assert(computeDualSanctumBadgeBonus(legacyBand).bandTourOutAdd === 0, "PvE aggregator: no band bonus on legacy saves");
    assert(PT2.getBandLineupMonIds(legacyBand).size === 0 && !busyMonIds(legacyBand).has(1), "legacy mon is not in a band lineup");

    // 1) Tables: 4 parts covering all 9 elements, 5 tour stops, 4 tiers
    const allEls = new Set(PT2.BAND_PARTS.flatMap((p) => p.elements));
    assert(PT2.BAND_PARTS.length === 4 && allEls.size === 9, "4 instrument parts cover all 9 elements");
    assert(PT2.BAND_TOUR_STOPS.length === 5 && new Set(PT2.BAND_TOUR_STOPS.map((s) => s.feel)).size === 5, "5 tour stops with 5 different feels");
    assert(PT2.getBandTierForScore(54) === 0 && PT2.getBandTierForScore(55) === 1 && PT2.getBandTierForScore(95) === 3 && PT2.getBandTierForScore(115) === 4, "tier lines 55 / 75 / 95 / 115");

    // 2) Rhythm rules: base rules, noisy penalty, each stop's feel reaches the 19-point max via 一键作曲
    const harbor = PT2.getBandStopDef("harborDusk");
    const def = PT2.evaluateBandPattern(PT2.BAND_DEFAULT_PATTERN, harbor);
    assert(def.points === 13 && def.rules.find((r) => r.id === "downbeat").ok && !def.rules.find((r) => r.feel).ok, "default pattern scores 13 at the harbor (no 轻快 feel yet)");
    const noisy = PT2.evaluateBandPattern([2, 2, 2, 2, 0, 1, 0, 1], harbor);
    assert(noisy.rules.some((r) => r.id === "noisy" && r.pts === -4), "4 heavy beats in a row → 过于吵闹 −4");
    const lyrical = PT2.evaluateBandPattern([2, 0, 1, 0, 2, 0, 1, 0], "forestGlade");
    assert(lyrical.points === 19, "the default groove is a perfect 抒情 pattern (19)");
    const bandSt = defaultState();
    PT2.ensureBandConcertState(bandSt);
    bandSt.meta.bandConcert.bestTierByStop = Object.fromEntries(PT2.BAND_TOUR_STOPS.map((x) => [x.id, 1]));
    for (const s of PT2.BAND_TOUR_STOPS) {
      assert(PT2.selectBandStop(bandSt, s.id).ok, `stop ${s.name} selectable once the previous stop is cleared`);
      const comp = PT2.autofillBandPattern(bandSt);
      assert(comp.ok && comp.points === 19 && PT2.evaluateBandPattern(comp.pattern, s).rules.find((r) => r.feel).ok, `一键作曲 hits the 19-point groove for ${s.name}`);
    }
    bandSt.meta.bandConcert.bestTierByStop = {};
    bandSt.meta.bandConcert.stopId = "harborDusk";
    assert(PT2.setBandBeat(bandSt, 0).ok && PT2.setBandBeat(bandSt, 0, 2).pattern[0] === 2 && !PT2.setBandBeat(bandSt, 9).ok, "beats cycle / set; out-of-range rejected");

    // 3) Ensemble scoring: part fit, stop favour, adjacent-part chords, bond, craft scaling
    const bm = (id, dex, name, types, lvl = 60, extra = {}) => ({
      id, dex, pid: `p${String(dex).padStart(3, "0")}`, name, lvl, stars: 1, types, affection: 75,
      baseStats: { hp: 60, atk: 60, def: 60, spa: 60, spd: 60, spe: 60 }, iv: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 }, ...extra,
    });
    bandSt.mons.list = [
      bm(1, 4, "炽尾幼麟", ["fire"], 70),
      bm(2, 7, "沧澜幼龟", ["water"], 70),
      bm(3, 17, "疾风灵隼", ["wind"], 70),
      bm(4, 94, "噬影夜魔王", ["dark"], 70),
      bm(5, 25, "星雷灵鼠", ["electric"], 70),
      bm(6, 1, "青萝幼龙", ["grass"], 12, { affection: 10 }),
    ];
    bandSt.mons.nextId = 7;
    bandSt.res.futurecoin = { value: 100, cap: 99999 };
    const lineup = { drums: 1, harp: 2, flute: 3, bells: 4 };
    const ens = PT2.evaluateBandEnsemble(bandSt, lineup, [2, 1, 1, 0, 2, 1, 0, 1], harbor);
    assert(ens.memberCount === 4 && ens.perPart.every((x) => x.fit), "fire→灵鼓 / water→竖琴 / wind→风笛 / dark→星铃 all fit their parts");
    assert(ens.perPart.filter((x) => x.fav).map((x) => x.partId).join(",") === "harp,flute", "harbor favours water / wind (竖琴 + 风笛)");
    const chordNames = ens.chords.map((c) => c.name);
    assert(ens.chords.length === 2 && chordNames.includes("炎泉沸海和弦") && chordNames.includes("业火夜袭和弦"), "adjacent chords: 灵鼓(火)→竖琴(水) 炎泉沸海 + 星铃(暗)→灵鼓(火) 业火夜袭 (竖琴→风笛 / 风笛→星铃 none)");
    assert(ens.quartetBond && ens.craftMul === 1 && ens.patternEval.points === 19, "Lv.70 quartet with affection 75 → 默契四重奏, full craft, perfect harbor groove");
    assert(ens.baseScore >= 95 && ens.projectedTier >= 3, `a seasoned, well-arranged band reaches 金音+ (${ens.baseScore})`);
    const rookie = PT2.evaluateBandEnsemble(bandSt, { drums: 6 }, [2, 1, 1, 0, 2, 1, 0, 1], harbor);
    assert(rookie.baseScore < 55 && rookie.craftMul < 0.5, `a lone Lv.12 drummer stays below 铜音 (${rookie.baseScore})`);
    const empty = PT2.evaluateBandEnsemble(bandSt, {}, null, harbor);
    assert(empty.baseScore === 0 && empty.memberCount === 0, "an empty stage scores 0");

    // 4) Lineup edits: moving a member between parts; unavailable partners refused / benched / skipped
    PT2.ensureBandConcertState(bandSt);
    assert(PT2.setBandPartMember(bandSt, "drums", 1).ok && PT2.setBandPartMember(bandSt, "harp", 1).ok, "assign then move #1");
    assert(bandSt.meta.bandConcert.lineup.drums === 0 && bandSt.meta.bandConcert.lineup.harp === 1, "a member occupies only one part");
    PT2.setBandPartMember(bandSt, "harp", 0);
    CF2.ensureWishDockState(bandSt);
    Object.assign(bandSt.meta.wishDock.routes.shoal, { active: true, completed: false, crewIds: [5], elapsedSec: 10 });
    assert(PT2.getBandUnavailableMonIds(bandSt).has(5) && PT2.setBandPartMember(bandSt, "bells", 5).reason === "mon_away", "partners at sea cannot join the band");
    const auto = PT2.autofillBandLineup(bandSt, {});
    assert(auto.ok && !PT2.getBandLineupMonIds(bandSt).has(5) && PT2.getBandLineupMonIds(bandSt).size === 4, "一键组队 fills 4 parts and skips the partner at sea");
    assert(auto.projectedScore === PT2.evaluateBandEnsemble(bandSt).baseScore, "autofill picks the best-scoring arrangement");
    bandSt.meta.bandConcert.lineup.bells = 5;
    const benched = PT2.evaluateBandEnsemble(bandSt, Object.fromEntries(Object.entries(bandSt.meta.bandConcert.lineup).filter(([, id]) => !PT2.getBandUnavailableMonIds(bandSt).has(id))));
    assert(benched.memberCount === 3, "a member at sea is benched for the concert");
    PT2.autofillBandLineup(bandSt, {});
    Object.assign(bandSt.meta.wishDock.routes.shoal, { active: false, crewIds: [] });

    // 5) Busy lock: lineup members are release-protected; forced release detaches them
    const inBand = [...PT2.getBandLineupMonIds(bandSt)];
    assert(inBand.every((id) => busyMonIds(bandSt).has(id)), "band members are protected in busyMonIds");
    const weakBand = pickWeakMonIds(bandSt.mons.list, { softLimit: 1, batch: 10, protectIds: busyMonIds(bandSt) });
    assert(inBand.every((id) => !weakBand.includes(id)), "pickWeakMonIds skips band members");

    // 6) Tour: stop unlock chain, daily free / paid concerts, live roll injection, rewards, best tiers, trophy
    assert(PT2.isBandStopUnlocked(bandSt, "harborDusk") && !PT2.isBandStopUnlocked(bandSt, "forestGlade"), "only the first stop is open at the start");
    assert(PT2.selectBandStop(bandSt, "forestGlade").reason === "locked", "a locked stop cannot be selected");
    PT2.autofillBandPattern(bandSt);
    const day = new Date(2026, 10, 18, 20).getTime();
    const c1 = PT2.performBandConcert(bandSt, { nowMs: day, randFloat: () => 0.5 });
    assert(c1.ok && c1.live === 0 && c1.score === c1.baseScore && c1.costKind === "free" && c1.tier >= 1, `first concert is free, live roll 0 (${c1.score} ${c1.tierName})`);
    assert(c1.unlockedNext === "forestGlade" && PT2.isBandStopUnlocked(bandSt, "forestGlade"), "铜音+ at the harbor unlocks the forest glade");
    assert(c1.rewards.futurecoin === 12 + c1.tier * 14 + 40 * c1.tier && bandSt.meta.bandConcert.bestTierByStop.harborDusk === c1.tier, "rewards + first-time tier bonus, best tier recorded");
    const hi = PT2.performBandConcert(bandSt, { nowMs: day + 1, randFloat: () => 0.999 });
    const lo = PT2.performBandConcert(bandSt, { nowMs: day + 2, randFloat: () => 0 });
    assert(hi.live === 4 && lo.live === -4, "live roll is ±4 from the injected rng");
    const paid = PT2.performBandConcert(bandSt, { nowMs: day + 3, randFloat: () => 0.5 });
    assert(paid.ok && paid.costKind === "coin" && bandSt.res.futurecoin.value >= 0, "the 4th concert of the day costs futurecoin ×20");
    PT2.performBandConcert(bandSt, { nowMs: day + 4, randFloat: () => 0.5 });
    PT2.performBandConcert(bandSt, { nowMs: day + 5, randFloat: () => 0.5 });
    assert(PT2.performBandConcert(bandSt, { nowMs: day + 6 }).reason === "daily_limit", "at most 6 concerts a day");
    assert(PT2.getBandConcertCost(bandSt, { nowMs: day + 86_400_000 }).kind === "free", "the free concerts reset the next local day");
    const trophy = PT2.computeBandTourBonus(bandSt);
    assert(trophy.trophyStars === bandSt.meta.bandConcert.bestTierByStop.harborDusk && trophy.stopsCleared === 1, "trophy stars = sum of best tiers per stop");

    // 7) Tour trophy aura wired into production / effects / breeding / PvE damage
    const fullTour = defaultState();
    fullTour.meta.bandConcert = { bestTierByStop: Object.fromEntries(PT2.BAND_TOUR_STOPS.map((s) => [s.id, 4])) };
    const ft = PT2.computeBandTourBonus(fullTour);
    assert(ft.trophyStars === 20 && ft.fullTour && ft.trophyName === "星穹巡演奖杯" && Math.abs(ft.prodAdd - (20 * 0.006 + 0.03)) < 1e-9 && Math.abs(ft.pveOutAdd - 0.16) < 1e-9, "20 stars → 全产 +15% (incl. 巡演圆满) · PvE +16%");
    const refBand = defaultState();
    const bareB = { catnipPerSec: 10, woodPerSec: 10, mineralsPerSec: 10 };
    finalizeProductionRates(bareB, refBand, 1);
    const tourB = { catnipPerSec: 10, woodPerSec: 10, mineralsPerSec: 10 };
    finalizeProductionRates(tourB, fullTour, 1);
    assert(tourB.catnipPerSec >= bareB.catnipPerSec * ft.prodMul * 0.999, "finalizeProductionRates applies the tour-trophy prodMul");
    const effT = computeTechEffects(fullTour, { tech: {} }, { serverBuffLevels: new Map() });
    const effR = computeTechEffects(refBand, { tech: {} }, { serverBuffLevels: new Map() });
    assert(effT.catchChanceAdd > effR.catchChanceAdd && effT.shinyChanceMul > effR.shinyChanceMul, "computeTechEffects applies the tour-trophy catch / shiny bonus");
    assert(computeBreedingShinyInfo(fullTour).rate > computeBreedingShinyInfo(refBand).rate, "breeding shiny odds include the tour trophy");
    assert(Math.abs(computeDualSanctumBadgeBonus(fullTour).bandTourOutAdd - 0.16) < 1e-9 && computeDualSanctumBadgeBonus(fullTour).pveOutMul > computeDualSanctumBadgeBonus(refBand).pveOutMul, "PvE damage aggregator includes the tour trophy");

    // 8) Save/load roundtrip (dedupe + clamp), forced release detaches, rebirth clears the lineup but keeps the tour
    const savedBand = JSON.parse(JSON.stringify(serializeState(bandSt)));
    const rb = loadFromRaw(savedBand);
    const rbc = PT2.ensureBandConcertState(rb, { nowMs: day });
    assert(rbc.bestTierByStop.harborDusk === bandSt.meta.bandConcert.bestTierByStop.harborDusk && rbc.pattern.join("") === bandSt.meta.bandConcert.pattern.join("") && rbc.totalConcerts === 6, "band survives serializeState -> loadFromRaw");
    const dirty = loadFromRaw(JSON.stringify({ ...savedBand, meta: { ...savedBand.meta, bandConcert: { lineup: { drums: 1, harp: 1, flute: 999 }, pattern: [9, -1, "x"], stopId: "starHall", bestTierByStop: { harborDusk: 9 } } } }));
    const dc = dirty.meta.bandConcert;
    assert(dc.lineup.drums === 1 && dc.lineup.harp === 0 && dc.lineup.flute === 0 && dc.pattern.join("") === PT2.BAND_DEFAULT_PATTERN.join("") && dc.bestTierByStop.harborDusk === 4 && dc.stopId === "harborDusk", "duplicate / dead ids dropped, bad pattern reset, tiers clamped, locked stop falls back");
    const victim = [...PT2.getBandLineupMonIds(rb)][0];
    MR2.releaseMonIds(rb, [victim], { protectIds: new Set() });
    assert(!PT2.getBandLineupMonIds(rb).has(victim), "forced release removes the member from the lineup");
    const eraSrcBand = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "modules", "systems", "era.js"), "utf8");
    assert(eraSrcBand.includes("state.meta.bandConcert.lineup[k] = 0") && eraSrcBand.includes("recallTreasureVoyageForRebirth(state)"), "confirmPrestige clears the band lineup and recalls the treasure voyage");
  }

  // ============================================================================
  // ML-13: 萌灵「邮局信使网络」— 生态区邮路 / 邮筒信件 / 信使派遣与防放生锁 / 往返 / 回信奖励 / 同乡与疾行信使 /
  //        邮戳等级与永久加成 / 信使加急 / 离线补算 12h / 存档兼容 / 强制放生 / 转生召回
  // ============================================================================
  {
    // 0) Old saves: neutral defaults, nothing created by the tick
    const legacyPost = loadFromRaw(JSON.stringify({ version: 3, res: { futurecoin: { value: 5, cap: 999 } }, mons: { nextId: 2, list: [{ id: 1, dex: 17, pid: "p017", name: "疾风灵隼", lvl: 5 }] } }));
    assert(legacyPost && !legacyPost.meta.postOffice, "legacy save loads without postOffice");
    const lpb = PT2.computePostOfficeBonus(legacyPost);
    assert(lpb.prodMul === 1 && lpb.catchAdd === 0 && lpb.tierPoints === 0 && lpb.collected === 0, "legacy postmark bonus is neutral");
    assert(CF2.getPostMessengerMonIds(legacyPost).size === 0 && !busyMonIds(legacyPost).has(1), "legacy mon is not a messenger");
    const lAdv = PT2.advancePostOffice(legacyPost, 99_999);
    assert(lAdv.arrived.length === 0 && lAdv.lettersAdded === 0 && !legacyPost.meta.postOffice, "advancePostOffice is a no-op without a tracker");

    // 1) Routes mirror the existing capture regions (ids, order, unlock thresholds); trip 10 → 50 min; postmark tiers 1 / 5 / 15
    assert(PT2.POST_ROUTES.length === CAPTURE_AREAS.length && PT2.POST_ROUTES.every((r, i) => r.id === CAPTURE_AREAS[i].id && r.unlockReq === CAPTURE_AREAS[i].unlockReq), "9 post routes = the 9 capture regions with the same unlock thresholds");
    assert(PT2.POST_ROUTES[0].tripSec === 600 && PT2.POST_ROUTES[8].tripSec === 3000 && PT2.POST_ROUTES[8].name === "幻梦秘境", "trip 600s → 3000s, region names without the （传说） suffix");
    assert(PT2.getPostRoutePath("brook").join(">") === "芽芽草甸>蜜露林径>溪光浅滩", "a route passes through every earlier region");
    assert(PT2.getPostmarkTier(0) === 0 && PT2.getPostmarkTier(1) === 1 && PT2.getPostmarkTier(4) === 1 && PT2.getPostmarkTier(5) === 2 && PT2.getPostmarkTier(15) === 3, "postmark tiers at 1 / 5 / 15 deliveries");

    const pm = (id, dex, name, types, lvl = 40, extra = {}) => ({
      id, dex, pid: `p${String(dex).padStart(3, "0")}`, name, lvl, stars: 1, types, affection: 50, exp: 0,
      baseStats: { hp: 60, atk: 60, def: 60, spa: 60, spd: 60, spe: 60 }, iv: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 }, ...extra,
    });
    const ps = defaultState();
    ps.mons.list = [
      pm(1, 1, "青萝幼龙", ["grass", "dark"], 50),
      pm(2, 17, "疾风灵隼", ["wind"], 50),
      pm(3, 4, "炽尾幼麟", ["fire"], 30),
      pm(4, 76, "镇岳巨岩尊", ["stone"], 20),
      pm(5, 7, "沧澜幼龟", ["water"], 10),
    ];
    ps.mons.nextId = 6;
    ps.res.futurecoin = { value: 100, cap: 99999 };
    ps.dex.caught = { p001: 1, p004: 1, p007: 1, p017: 1, p076: 1 };

    // 2) Fresh tracker: 3 letters; routes open with their regions
    const po0 = PT2.ensurePostOfficeState(ps);
    assert(po0.letters === 3 && po0.trips.length === 0, "a new post office starts with 3 letters");
    assert(PT2.isPostRouteUnlocked(ps, "meadow") && !PT2.isPostRouteUnlocked(ps, "woods"), "5 dex entries: only 芽芽草甸 is open");
    ps.dex.caught.p025 = 1;
    assert(PT2.isPostRouteUnlocked(ps, "woods") && !PT2.isPostRouteUnlocked(ps, "brook"), "6 dex entries open 蜜露林径 (same threshold as the capture region)");

    // 3) Messenger preview: 疾行 (wind) ×0.8, level −10% at Lv.50; 同乡 from the beast's home region (BEAST_ZONES)
    const evSwift = PT2.evaluatePostMessenger(ps.mons.list[1], "woods");
    assert(evSwift.swift && evSwift.homeTown && evSwift.speedMul === 0.72 && evSwift.tripSec === 648 && evSwift.rewardMul === 1.5 && Math.abs(evSwift.giftChance - 0.38) < 1e-9, "疾风灵隼 → 蜜露林径: swift + hometown, 900s × 0.72 = 648s, ×1.5 rewards, gift 38%");
    const evPlain = PT2.evaluatePostMessenger(ps.mons.list[2], "meadow");
    assert(!evPlain.swift && !evPlain.homeTown && evPlain.tripSec === 564 && evPlain.rewardMul === 1, "炽尾幼麟 → 芽芽草甸: plain messenger, 600s × 0.94 = 564s");
    assert(PT2.evaluatePostMessenger(ps.mons.list[0], "meadow", { getZone: () => "meadow" }).homeTown, "the home-region lookup is injectable");
    assert(PT2.pickPostMessengerFor(ps, "woods").id === 2 && PT2.pickPostMessengerFor(ps, "meadow").id === 1, "best messenger: 同乡 first (疾风灵隼 → 林径, 青萝幼龙 → 草甸)");

    // 4) Dispatch rules: letters, one messenger per route, locked routes, busy partners
    assert(PT2.dispatchPostMessenger(ps, "brook", 3).reason === "locked", "溪光浅滩 still locked");
    const d1 = PT2.dispatchPostMessenger(ps, "woods", 2, { nowMs: 1000 });
    assert(d1.ok && d1.tripSec === 648 && d1.homeTown && ps.meta.postOffice.letters === 2, "dispatch spends a letter");
    assert(PT2.dispatchPostMessenger(ps, "woods", 3).reason === "route_busy", "one messenger per route");
    assert(PT2.dispatchPostMessenger(ps, "meadow", 2).reason === "mon_busy", "a messenger cannot be sent twice");
    CF2.ensureHotSpringState(ps);
    assert(CF2.toggleHotSpringSoak(ps, "emberRock", 3).ok && PT2.dispatchPostMessenger(ps, "meadow", 3).reason === "mon_busy", "a soaking partner cannot carry letters");
    assert(CF2.toggleHotSpringSoak(ps, "", 3).ok, "#3 leaves the water");
    assert(CF2.toggleHotSpringSoak(ps, "emberRock", 2).reason === "mon_busy", "a messenger cannot soak");
    const auto = PT2.autoDispatchPostMessengers(ps, { nowMs: 1000 });
    assert(auto.ok && auto.dispatched.length === 1 && auto.dispatched[0].routeId === "meadow" && auto.dispatched[0].monId === 1, "一键派信 fills the free open route with its 同乡信使");
    assert(ps.meta.postOffice.letters === 1 && ps.meta.postOffice.trips.length === 2, "2 messengers out, 1 letter left");
    assert(PT2.autoDispatchPostMessengers(ps).reason === "no_idle_mons", "no free open route left (reported as no idle pairing)");

    // 5) busyMonIds release lock + every auto-pick skips messengers
    const messengers = [1, 2];
    const busyP = busyMonIds(ps);
    assert(messengers.every((id) => busyP.has(id)), "busyMonIds protects the messengers");
    const weakP = pickWeakMonIds(ps.mons.list, { softLimit: 1, batch: 10, protectIds: busyP });
    assert(messengers.every((id) => !weakP.includes(id)), "pickWeakMonIds skips the messengers");
    assert(MR2.releaseMonIds(ps, messengers, { protectIds: busyMonIds(ps) }).removed === 0, "releaseMonIds refuses to release messengers");
    assert(messengers.every((id) => !CF2.getIdleEcoSandboxCandidates(ps, "canopy").some((m) => m.id === id)), "messengers excluded from eco sandbox");
    assert(messengers.every((id) => CF2.getCampUnavailableMonIds(ps).has(id)), "messengers excluded from star camp");
    assert(messengers.every((id) => !CF2.getIdleWishDockCandidates(ps, "shoal").some((m) => m.id === id)), "messengers excluded from the wish dock");
    assert(messengers.every((id) => !CF2.getIdleNightObservatoryCandidates(ps).some((m) => m.id === id)), "messengers excluded from the observatory");
    assert(messengers.every((id) => !CF2.getIdleSkyIslandCandidates(ps).some((m) => m.id === id)), "messengers excluded from sky-island builders");
    assert(messengers.every((id) => !CF2.getIdleTreasureVoyageCandidates(ps).some((m) => m.id === id)), "messengers excluded from the voyage crew");
    assert(messengers.every((id) => !CF2.getIdleHotSpringCandidates(ps).some((m) => m.id === id)), "messengers excluded from the hot spring");
    assert(messengers.every((id) => PT2.getAcrobatUnavailableMonIds(ps).has(id) && PT2.getBandUnavailableMonIds(ps).has(id)), "messengers benched from the acrobat show and the band");
    CF2.autoFillHotSpring(ps);
    assert(messengers.every((id) => !CF2.getHotSpringSoakingMonIds(ps).has(id)), "hot-spring auto-fill skips messengers");
    CF2.recallHotSpring(ps);
    PT2.autofillBandLineup(ps);
    assert(messengers.every((id) => !PT2.getBandLineupMonIds(ps).has(id)), "band auto-lineup skips messengers");
    for (const p of PT2.BAND_PARTS) ps.meta.bandConcert.lineup[p.id] = 0;
    PT2.autofillAcrobatRoutine(ps);
    assert(ps.pve.acrobatShow.routine.every((r) => !messengers.includes(r.monId)), "acrobat auto-routine skips messengers");
    ps.pve.acrobatShow.routine = [];
    CF2.autoPickTreasureVoyageCrew(ps);
    assert(ps.meta.treasureVoyage.stagedIds.every((id) => !messengers.includes(id)), "voyage auto-crew skips messengers");
    ps.meta.treasureVoyage.stagedIds = [];
    CF2.autoFillNightObservatory(ps);
    assert(messengers.every((id) => !CF2.getNightObservatoryStationedMonIds(ps).has(id)), "observatory auto-fill skips messengers");
    CF2.recallNightObservatory(ps);
    CF2.autoFillSkyIslandCrew(ps);
    assert(messengers.every((id) => !CF2.getSkyIslandCrewMonIds(ps).has(id)), "sky-island auto-fill skips messengers");
    CF2.recallSkyIslandCrew(ps);

    // 6) Walking + mailbox refill (1 letter / 20 min, cap 6); arrival keeps the lock until the reply is opened
    const a1 = PT2.advancePostOffice(ps, 564);
    assert(a1.arrived.length === 1 && a1.arrived[0].routeId === "meadow" && a1.lettersAdded === 0, "the 草甸 messenger is back after 564s");
    assert(PT2.isPostTripArrived(ps.meta.postOffice.trips.find((t) => t.routeId === "meadow")) && busyMonIds(ps).has(1), "a returned messenger stays locked until its reply is opened");
    assert(PT2.claimPostTrip(ps, "woods").reason === "not_arrived", "cannot open a reply that is still on the road");
    const a2 = PT2.advancePostOffice(ps, 636);
    assert(a2.arrived.length === 1 && a2.arrived[0].routeId === "woods" && a2.lettersAdded === 1 && ps.meta.postOffice.letters === 2, "林径 messenger back at 1200s; the mailbox gained 1 letter");

    // 7) Opening replies: deterministic coin + specialty (×1.5 for 同乡), gift by injected rng, exp + affection, postmark
    const coin0 = ps.res.futurecoin.value;
    const c1 = PT2.claimPostTrip(ps, "meadow", { randFloat: () => 0.99 });
    assert(c1.ok && !c1.gotGift && c1.homeTown && c1.rewards.futurecoin === 12 && c1.rewards.catnip === 90 && ps.res.futurecoin.value === coin0 + 12, "草甸 同乡 reply: 8 × 1.5 = 12 coin + 60 × 1.5 = 90 灵果, no gift at roll 0.99");
    assert(c1.postmarkTier === 1 && c1.newTier === 1 && ps.meta.postOffice.postmarks.meadow === 1, "first delivery stamps a 铜戳");
    assert(ps.mons.list[0].exp === 80 && ps.mons.list[0].affection === 54 && !busyMonIds(ps).has(1), "messenger exp +80, affection +4 (同乡), lock lifted");
    assert(c1.text === PT2.getPostReplyLetter("meadow", 0) && ps.meta.postOffice.lastReply.regionName === "芽芽草甸", "the reply letter is recorded");
    const c2 = PT2.claimPostTrip(ps, "woods", { randFloat: () => 0 });
    assert(c2.ok && c2.gotGift && c2.rewards.tuningMint === 1 && c2.rewards.futurecoin === 18 && c2.rewards.wood === 90, "林径 同乡 reply with its gift at roll 0: 12 × 1.5 coin, 60 × 1.5 灵木, 心性调律薄荷 ×1");
    assert(ps.meta.postOffice.trips.length === 0 && ps.meta.postOffice.totalDeliveries === 2 && ps.meta.postOffice.totalHomeTown === 2 && ps.meta.postOffice.totalGifts === 1, "deliveries tallied");
    const plainSend = PT2.dispatchPostMessenger(ps, "meadow", 3);
    PT2.advancePostOffice(ps, plainSend.tripSec);
    const c3 = PT2.claimPostTrip(ps, "meadow", { randFloat: () => 0.99 });
    assert(c3.rewards.futurecoin === 8 && c3.rewards.catnip === 60 && !c3.homeTown && ps.mons.list[2].affection === 52, "plain reply: base rewards, affection +2");
    ps.meta.postOffice.postmarks.meadow = 4;
    PT2.dispatchPostMessenger(ps, "meadow", 3);
    PT2.advancePostOffice(ps, 9999);
    const c4 = PT2.claimPostTrip(ps, "meadow", { randFloat: () => 0.99 });
    assert(c4.postmarkTier === 2 && c4.newTier === 2 && c4.logLine.includes("银戳"), "the 5th delivery upgrades the 嫩芽邮戳 to 银戳");

    // 8) Recall / express / offline catch-up
    ps.meta.postOffice.letters = 3;
    PT2.dispatchPostMessenger(ps, "meadow", 3);
    const rc = PT2.recallPostMessenger(ps, "meadow");
    assert(rc.ok && ps.meta.postOffice.letters === 3 && ps.meta.postOffice.trips.length === 0 && !busyMonIds(ps).has(3), "recalling an en-route messenger refunds its letter");
    PT2.dispatchPostMessenger(ps, "meadow", 3);
    PT2.dispatchPostMessenger(ps, "woods", 2);
    const day = new Date(2026, 10, 18, 20).getTime();
    ps.res.futurecoin.value = 25;
    const e1 = PT2.performPostExpress(ps, { nowMs: day });
    assert(e1.ok && e1.costKind === "free_daily" && e1.count === 2 && ps.meta.postOffice.trips.every((t) => PT2.isPostTripArrived(t)), "free express: every messenger on the road is back at once");
    assert(PT2.performPostExpress(ps, { nowMs: day }).reason === "no_en_route", "express needs a messenger on the road");
    assert(PT2.recallPostMessenger(ps, "meadow").reason === "already_back", "a returned messenger is opened, not recalled");
    const all = PT2.claimAllPostTrips(ps, { randFloat: () => 0.99 });
    assert(all.ok && all.claimed.length === 2 && all.totals.futurecoin > 0, "一键拆信 opens every reply");
    PT2.dispatchPostMessenger(ps, "woods", 2);
    const e2 = PT2.performPostExpress(ps, { nowMs: day + 1000 });
    assert(e2.ok && e2.costKind === "futurecoin" && ps.res.futurecoin.value >= 0, "the second express of the day costs futurecoin ×20");
    assert(PT2.getPostExpressFreeLeft(ps, day) === 0 && PT2.getPostExpressFreeLeft(ps, day + 86_400_000) === 1, "free express resets the next local day");
    PT2.claimAllPostTrips(ps, { randFloat: () => 0.99 });
    ps.meta.postOffice.letters = 0;
    ps.meta.postOffice.letterCarrySec = 0;
    PT2.dispatchPostMessenger(ps, "woods", 2);
    assert(ps.meta.postOffice.trips.length === 0, "no letters → nothing dispatched");
    const off = PT2.advancePostOffice(ps, 99_999);
    assert(off.lettersAdded === 6 && ps.meta.postOffice.letters === 6 && ps.meta.postOffice.letterCarrySec === 0, "offline refill caps at 6 letters (12h cap)");
    PT2.dispatchPostMessenger(ps, "woods", 2);
    const capRun = PT2.advancePostOffice(ps, 10);
    assert(capRun.arrived.length === 0 && ps.meta.postOffice.trips[0].elapsedSec === 10, "trips advance by dt");

    // 9) Postmark album aura wired into production / effects
    const full = defaultState();
    full.meta.postOffice = { postmarks: Object.fromEntries(PT2.POST_ROUTES.map((r) => [r.id, 15])) };
    const fb = PT2.computePostOfficeBonus(full);
    assert(fb.tierPoints === 27 && fb.fullNetwork && Math.abs(fb.prodAdd - 0.0605) < 1e-9 && Math.abs(fb.catchAdd - 0.0108) < 1e-9, "9 gold postmarks: 全产 +6.05% (incl. 信使网络全通) · 捕获 +1.08%");
    const partial = PT2.computePostOfficeBonus(ps);
    assert(partial.tierPoints === 3 && partial.collected === 2 && !partial.fullNetwork && Math.abs(partial.prodAdd - 0.0045) < 1e-9, "银戳 草甸 + 铜戳 林径 = 3 tier points → 全产 +0.45%");
    const refPost = defaultState();
    const bareP = { catnipPerSec: 10, woodPerSec: 10, mineralsPerSec: 10 };
    finalizeProductionRates(bareP, refPost, 1);
    const postP = { catnipPerSec: 10, woodPerSec: 10, mineralsPerSec: 10 };
    finalizeProductionRates(postP, full, 1);
    assert(postP.catnipPerSec >= bareP.catnipPerSec * fb.prodMul * 0.999, "finalizeProductionRates applies the postmark prodMul");
    assert(
      computeTechEffects(full, { tech: {} }, { serverBuffLevels: new Map() }).catchChanceAdd > computeTechEffects(refPost, { tech: {} }, { serverBuffLevels: new Map() }).catchChanceAdd,
      "computeTechEffects applies the postmark catch bonus",
    );

    // 10) Save/load roundtrip, corrupt data, forced release, rebirth recall
    const savedPost = JSON.parse(JSON.stringify(serializeState(ps)));
    const rp = loadFromRaw(savedPost);
    const rpo = PT2.ensurePostOfficeState(rp);
    assert(rpo.trips.length === 1 && rpo.trips[0].monId === 2 && rpo.postmarks.meadow === ps.meta.postOffice.postmarks.meadow && rpo.letters === ps.meta.postOffice.letters, "post office survives serializeState -> loadFromRaw");
    assert(busyMonIds(rp).has(2), "reloaded messenger stays protected");
    const dirtyPost = loadFromRaw(
      JSON.stringify({
        ...savedPost,
        meta: {
          ...savedPost.meta,
          postOffice: {
            letters: 99,
            trips: [
              { routeId: "woods", monId: 2, tripSec: 600, elapsedSec: 9999 },
              { routeId: "woods", monId: 3, tripSec: 600 },
              { routeId: "nowhere", monId: 4 },
              { routeId: "meadow", monId: 999 },
            ],
            postmarks: { meadow: -3, ridge: 2 },
          },
        },
      }),
    );
    const dpo = dirtyPost.meta.postOffice;
    assert(dpo.letters === 6 && dpo.trips.length === 1 && dpo.trips[0].elapsedSec === 600 && !dpo.postmarks.meadow && dpo.postmarks.ridge === 2, "letters clamped, duplicate route / unknown route / dead messenger dropped, progress clamped");
    const lettersBefore = ps.meta.postOffice.letters;
    MR2.releaseMonIds(ps, [2], { protectIds: new Set() });
    assert(ps.meta.postOffice.trips.length === 0 && ps.meta.postOffice.letters === Math.min(6, lettersBefore + 1), "forced release cancels the delivery and refunds the letter");
    PT2.dispatchPostMessenger(ps, "meadow", 1);
    const rbLetters = ps.meta.postOffice.letters;
    const rb = PT2.recallPostOfficeForRebirth(ps);
    assert(rb.recalled === 1 && ps.meta.postOffice.trips.length === 0 && ps.meta.postOffice.letters === Math.min(6, rbLetters + 1) && ps.meta.postOffice.postmarks.meadow >= 5, "rebirth recalls messengers, refunds letters, keeps postmarks");
    const eraSrcPost = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "modules", "systems", "era.js"), "utf8");
    assert(eraSrcPost.includes("recallHotSpringForRebirth(state)") && eraSrcPost.includes("recallPostOfficeForRebirth(state)"), "confirmPrestige recalls soakers and messengers");
  }

  // Mandatory v0.7.63 version sync verification across all 8 versioned files + icon cache-busting
  const projRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
  assert(GAME_CONFIG.VERSION === "0.7.63", "modules/config.js VERSION is 0.7.63");
  assert(GAME_STATE_SYNC_VERSION === "0.7.63", "modules/app/game_state.js GAME_STATE_SYNC_VERSION is 0.7.63");
  const htmlTxt = readFileSync(join(projRoot, "index.html"), "utf8");
  const mainTxt = readFileSync(join(projRoot, "main.js"), "utf8");
  const appTxt = readFileSync(join(projRoot, "app.js"), "utf8");
  const swTxt = readFileSync(join(projRoot, "sw.js"), "utf8");
  const healthTxt = readFileSync(join(projRoot, "functions/api/health.js"), "utf8");
  const gameStateTxt = readFileSync(join(projRoot, "modules/app/game_state.js"), "utf8");
  const helpTxt = readFileSync(join(projRoot, "modules/tabs/help_tab.js"), "utf8");
  const iconsTxt = readFileSync(join(projRoot, "modules/render/rpg_svg_icons.js"), "utf8");
  assert(htmlTxt.includes("0.7.63") && !htmlTxt.includes("0.7.56"), "index.html synced to 0.7.63");
  assert(mainTxt.includes('CURRENT_VERSION = "0.7.63"') && !mainTxt.includes("0.7.56"), "main.js synced to 0.7.63");
  assert(appTxt.includes("0.7.63") && !appTxt.includes("0.7.56"), "app.js synced to 0.7.63");
  assert(swTxt.includes("mengling-v0.7.63") && !swTxt.includes("0.7.56"), "sw.js synced to 0.7.63");
  assert(healthTxt.includes("0.7.63") && !healthTxt.includes("0.7.56"), "functions/api/health.js synced to 0.7.63");
  assert(gameStateTxt.includes("0.7.63") && !gameStateTxt.includes("0.7.56"), "modules/app/game_state.js synced to 0.7.63");
  assert(helpTxt.includes("版本 v0.7.63") && helpTxt.includes("v0.7.56 新增") && helpTxt.includes("v0.7.55 新增"), "modules/tabs/help_tab.js synced to 0.7.63 (ML-16 / ML-15 help blocks kept)");
  assert(iconsTxt.includes(".webp?v=0.7.63") && !iconsTxt.includes("0.7.56"), "rpg_svg_icons.js synced to 0.7.63");
} finally {
  Math.random = realRandom;
}

if (failed) {
  console.error(`pve-selfcheck: ${failed} failed`);
  process.exit(1);
}
console.log("pve-selfcheck: OK");
