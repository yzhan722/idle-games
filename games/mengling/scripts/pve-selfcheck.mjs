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
import { GAME_STATE_SYNC_VERSION } from "../modules/app/game_state.js";
import { createRenderPve } from "../modules/tabs/pve_tab.js";
import { GAME_CONFIG } from "../modules/config.js";
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

  const specialAttacker = { side: "player", name: "特攻手", types: ["water"], atk: 40, spa: 100 };
  const physicalAttacker = { side: "player", name: "物攻手", types: ["wind"], atk: 100, spa: 40 };
  const physWall = { side: "enemy", name: "物防墙", types: ["wind"], def: 120, spd: 40 };
  const specWall = { side: "enemy", name: "特防墙", types: ["wind"], def: 40, spd: 120 };
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
    { dex: 149, name: "胖胖龙", lvl: 55, stars: 2 },
    { dex: 148, name: "丝带龙", lvl: 50, stars: 2 },
    { dex: 230, name: "海龙王", lvl: 50, stars: 2 },
    { dex: 149, name: "胖胖龙2", lvl: 45, stars: 2 },
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
  // ML-7: 萌灵「冠军联盟四天王殿堂赛」(Champion League Elite Four & Grand Champion Gauntlet)
  // ==========================================================================
  assert(
    CHAMPION_LEAGUE_STAGES.length === 5 &&
      CHAMPION_LEAGUE_STAGES.map((s) => s.shortTitle).join("->") === "炎狱天王->沧溟天王->翠岚天王->星穹天王->圣殿总冠军",
    "Champion League defines 5 consecutive stages (炎狱天王 -> 沧溟天王 -> 翠岚天王 -> 星穹天王 -> 圣殿总冠军)",
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
      name: "电毛球",
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
    "single-stage League bout clears Stage 1 (炎狱天王) and advances activeStageIdx to Stage 2",
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

  // Mandatory v0.7.48 version sync verification across all 8 versioned files + icon cache-busting
  const projRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
  assert(GAME_CONFIG.VERSION === "0.7.48", "modules/config.js VERSION is 0.7.48");
  assert(GAME_STATE_SYNC_VERSION === "0.7.48", "modules/app/game_state.js GAME_STATE_SYNC_VERSION is 0.7.48");
  const htmlTxt = readFileSync(join(projRoot, "index.html"), "utf8");
  const mainTxt = readFileSync(join(projRoot, "main.js"), "utf8");
  const appTxt = readFileSync(join(projRoot, "app.js"), "utf8");
  const swTxt = readFileSync(join(projRoot, "sw.js"), "utf8");
  const healthTxt = readFileSync(join(projRoot, "functions/api/health.js"), "utf8");
  const gameStateTxt = readFileSync(join(projRoot, "modules/app/game_state.js"), "utf8");
  const helpTxt = readFileSync(join(projRoot, "modules/tabs/help_tab.js"), "utf8");
  const iconsTxt = readFileSync(join(projRoot, "modules/render/rpg_svg_icons.js"), "utf8");
  assert(htmlTxt.includes("0.7.48") && !htmlTxt.includes("0.7.47"), "index.html synced to 0.7.48");
  assert(mainTxt.includes('CURRENT_VERSION = "0.7.48"') && !mainTxt.includes("0.7.47"), "main.js synced to 0.7.48");
  assert(appTxt.includes("0.7.48") && !appTxt.includes("0.7.47"), "app.js synced to 0.7.48");
  assert(swTxt.includes("mengling-v0.7.48") && !swTxt.includes("0.7.47"), "sw.js synced to 0.7.48");
  assert(healthTxt.includes("0.7.48") && !healthTxt.includes("0.7.47"), "functions/api/health.js synced to 0.7.48");
  assert(gameStateTxt.includes("0.7.48") && !gameStateTxt.includes("0.7.47"), "modules/app/game_state.js synced to 0.7.48");
  assert(helpTxt.includes("0.7.48"), "modules/tabs/help_tab.js synced to 0.7.48");
  assert(iconsTxt.includes(".webp?v=0.7.48") && !iconsTxt.includes("0.7.47"), "rpg_svg_icons.js synced to 0.7.48");
} finally {
  Math.random = realRandom;
}

if (failed) {
  console.error(`pve-selfcheck: ${failed} failed`);
  process.exit(1);
}
console.log("pve-selfcheck: OK");
