// 智能玩家模拟核心：player-sim.mjs（长跑巡检）与 rebirth-speed-selfcheck.mjs（一 / 二周目对比）共用同一套策略。
import "../data/beasts.js";
import "../data/beasts_zh.js";

import { defaultState, BUILDING_MAX_LEVEL } from "../modules/state.js";
import { createTick } from "../modules/tick.js";
import { createCaptureSystem } from "../modules/app/capture_system.js";
import { awardCaughtBeast as awardCaughtCore } from "../modules/app/capture_award.js";
import {
  createMonInstance as createMonInstance0,
  addExpToMon as addExpToMon0,
  getMonCurrentStats,
  monPower,
} from "../modules/mons.js";
import { clamp } from "../modules/utils.js";
import { calcTypeMul } from "../modules/type_chart.js";
import {
  busyMonIds,
  pickWeakMonIds,
  releaseMonIds,
  BOX_SOFT_LIMIT,
} from "../modules/systems/mon_release.js";
import { beasts } from "../modules/beast_defs.js";
import { BUILDING_DEFS } from "../modules/defs_buildings.js";
import { RESOURCE_DEFS } from "../modules/defs_resources.js";
import { EXTRA_TECH_DEFS } from "../modules/tech_defs.js";
import { CORE_TECH_DEFS } from "../modules/defs_tech_core.js";
import {
  computeTechEffects as computeTechEffects0,
  getBuildingCost as getBuildingCost0,
  getResearchCost as getResearchCost0,
  computeResearchTimeSec as computeResearchTimeSec0,
  getOrbMakeCost as getOrbMakeCost0,
} from "../modules/systems/effects.js";
import {
  accumulateBuildingEffects,
  applyTechAndServerCapToEff,
  computeBaseResourceCaps,
  applyCoreResourceCaps,
  applyStaticItemCaps,
  computeStaticItemCaps,
  ensureDerivedContainers,
  computeUnlockedResourceRates,
  finalizeProductionRates,
  permanentBoostMul,
} from "../modules/systems/production.js";
import { computeDerived as computeDerivedCore } from "../modules/systems/compute_derived.js";
import { serverBuffMul as serverBuffMul0, getServerBuffLevel as getServerBuffLevel0 } from "../modules/systems/server_buffs.js";
import {
  bumpEraCounter,
  syncEraQuests,
  canAdvanceEra,
  advanceEra,
  ensureEraState,
  eraOrbBonusCrafted,
} from "../modules/systems/era.js";
import { simulateBattle, pveFightModifiers } from "../modules/pve_battle.js";
import { getStageById, PVE_CHAPTERS, PVE_DAILY_MAX } from "../modules/pve_defs.js";
import { getExpLevelDef } from "../modules/expedition_defs.js";
import { expeditionTypeMul, pickExpeditionDungeons } from "../modules/systems/expedition.js";
import { TYPE_MUL } from "../modules/type_chart.js";
import {
  luckyCatchMul,
  pityFailStep,
  bumpCatchStreak,
  resetCatchStreak,
  natureIncomingDamageMul,
  natureResCapMul,
  ensureLuckyDay,
  ensureLuckyWeek,
  expeditionNatureTimeMul,
} from "../modules/systems/gameplay_fun.js";

/**
 * @param {{ seed?: number, dt?: number, state?: object, pickArea?: Function|null }} opts
 *   pickArea(unlockedAreas, api) 不传时沿用原策略：永远去最后一个已解锁的生态区
 */
export function createPlayerSim({ seed = 1, dt = 30, state: initState = null, pickArea = null } = {}) {
// Deterministic RNG (xorshift)
let rng = seed >>> 0;
function randFloat() {
  rng ^= rng << 13;
  rng ^= rng >>> 17;
  rng ^= rng << 5;
  return ((rng >>> 0) % 1_000_000) / 1_000_000;
}

const findings = [];
function fail(msg) {
  findings.push({ sev: "FAIL", msg });
}
function warn(msg) {
  findings.push({ sev: "WARN", msg });
}
function note(msg) {
  findings.push({ sev: "NOTE", msg });
}

const state = initState ?? defaultState();
ensureEraState(state);
ensureLuckyDay(state);
ensureLuckyWeek(state);

const ui = {
  activeTab: "capture",
  captureAreaId: "meadow",
  serverBuffLevels: new Map(),
  logLastMsg: null,
  logLastCount: 0,
  dexDirty: false,
  captureDirty: false,
  monsDirty: false,
  functionsDirty: false,
  pveDirty: false,
};

const defs = {
  resources: RESOURCE_DEFS,
  buildings: BUILDING_DEFS,
  beasts,
  tech: { ...CORE_TECH_DEFS, ...EXTRA_TECH_DEFS },
};

const speciesByPid = new Map(beasts.map((p) => [p.id, p]));
function getSpeciesByPid(pid) {
  return speciesByPid.get(pid) || null;
}

const logs = [];
function addLog(msg) {
  logs.push(String(msg || ""));
  if (logs.length > 200) logs.shift();
}

function addRes(rid, amount) {
  const r = state.res[rid];
  if (!r) return 0;
  const before = r.value ?? 0;
  const def = defs.resources[rid];
  if (def && def.noCap) {
    r.value = Math.max(0, before + amount);
  } else {
    r.value = clamp(before + amount, 0, r.cap ?? 0);
  }
  return Math.max(0, (r.value ?? 0) - before);
}

function canAfford(cost) {
  for (const [rid, v] of Object.entries(cost || {})) {
    if ((state.res[rid]?.value ?? 0) < v) return false;
  }
  return true;
}

function pay(cost) {
  for (const [rid, v] of Object.entries(cost || {})) {
    if (!state.res[rid]) continue;
    state.res[rid].value = Math.max(0, (state.res[rid].value ?? 0) - v);
  }
}

function computeTechEffects() {
  return computeTechEffects0(state, defs, ui);
}
function getBuildingCost(id) {
  return getBuildingCost0(id, state, defs, ui);
}
function getResearchCost(tdef) {
  return getResearchCost0(tdef, state);
}
function computeResearchTimeSec(tdef) {
  return computeResearchTimeSec0(tdef, state, ui);
}
function getOrbMakeCost(qty = 1) {
  return getOrbMakeCost0(qty, state, ui, null, defs);
}
function serverBuffMul(key) {
  return serverBuffMul0(key, ui);
}
function getServerBuffLevel(key) {
  return getServerBuffLevel0(key, ui);
}

function computeDerived() {
  return computeDerivedCore(state, {
    defs,
    computeTechEffects,
    serverBuffMul,
    clamp,
    addLog,
  });
}

function createMonInstance(species, idOverride = null) {
  const m = createMonInstance0(species, {
    idOverride,
    idFallback: state?.mons?.nextId ?? 1,
  });
  return m;
}

function addExpToMon(mon, expAdd) {
  const add0 = typeof expAdd === "number" && Number.isFinite(expAdd) ? expAdd : 0;
  return addExpToMon0(mon, Math.floor(add0));
}

const capture = createCaptureSystem({ defs, getState: () => state, ui, randFloat });
const {
  getPool: getCapturePool,
  getBaseCatchChanceByDex: baseCatchChanceByDex,
  pickRandomFromPool,
  getAreas: getCaptureAreas,
} = capture;

function syncEraProgress() {
  syncEraQuests(state, getCaptureAreas);
}

function awardCaughtBeast(p, opts = null) {
  awardCaughtCore(state, p, opts, {
    createMonInstance: (s) => createMonInstance(s),
    ui,
    bumpEraCounter,
    syncEraProgress,
    afterAward: () => bumpCatchStreak(state),
  });
}

function doCatch() {
  if ((state.res.pokeball?.value ?? 0) < 1) return false;
  state.res.pokeball.value = Math.max(0, state.res.pokeball.value - 1);
  const pool = getCapturePool();
  if (!pool?.length) {
    warn("catch: empty pool in area " + ui.captureAreaId);
    return false;
  }
  const p = pickRandomFromPool(pool);
  const techEff = computeTechEffects();
  const add = typeof techEff.catchChanceAdd === "number" ? techEff.catchChanceAdd : 0;
  const base = baseCatchChanceByDex(p.dex);
  const fails = typeof state.rng?.catchFails === "number" ? state.rng.catchFails : 0;
  const pity = Math.min(0.02 * Math.max(0, Math.floor(fails)), 0.2);
  let chance = clamp(base * Math.max(1, 1 + add) + pity, 0, 0.95);
  chance = clamp(chance * luckyCatchMul(state, globalThis.BEAST_TYPES?.[p.dex]), 0, 0.95);
  if (randFloat() > chance) {
    if (!state.rng) state.rng = { catchFails: 0 };
    state.rng.catchFails = Math.max(0, (state.rng.catchFails ?? 0) + pityFailStep(state, randFloat));
    resetCatchStreak(state);
    return false;
  }
  if (!state.rng) state.rng = { catchFails: 0 };
  state.rng.catchFails = 0;
  awardCaughtBeast(p, { ballType: "pokeball" });
  return true;
}

function gatherOnce() {
  const charges0 = Math.max(0, Math.floor(state.gatherCharges ?? 0));
  if (charges0 <= 0) return false;
  const cd0 = Math.max(0, state.gatherCdSec ?? 0);
  state.gatherCharges = charges0 - 1;
  if (state.gatherCharges < 1000 && cd0 <= 0) state.gatherCdSec = 10;
  state.gatherClicks = Math.max(0, Math.floor(state.gatherClicks || 0)) + 1;
  const clicks = state.gatherClicks;
  const tierFast = Math.floor((clicks - 1) / 100);
  const tier = tierFast <= 9 ? tierFast : 9 + Math.floor((clicks - 1 - 9 * 100) / 1000);
  const cat = Math.min(100, 3 + tier * 2);
  const wood = Math.min(100, 1 + tier * 0.75);
  const min = Math.min(100, 0.5 + tier * 0.35);
  const catGained = addRes("catnip", cat);
  bumpEraCounter(state, "gather_total", 1);
  // ponytail: count intended gather yield, not post-cap gain — else full warehouse softlocks dawn berry quest
  bumpEraCounter(state, "berry_earned", cat);
  if (state.unlocks?.wood) addRes("wood", wood);
  if (state.unlocks?.minerals) addRes("minerals", min);
  syncEraProgress();
  return true;
}


function pveTeamScore(mon, stage) {
  const atkTypes = globalThis.BEAST_TYPES?.[mon.dex] || ["normal"];
  let typeBonus = 0;
  for (const e of stage.enemies || []) {
    const defTypes = Array.isArray(e.types) && e.types.length ? e.types : [stage.type || "normal"];
    const mul = calcTypeMul(atkTypes, defTypes);
    if (mul >= 2) typeBonus += 400;
    else if (mul <= 0.5) typeBonus -= 150;
  }
  return monPower(mon) + typeBonus;
}

function tryReleaseWeakMons() {
  const list = state.mons?.list || [];
  const ids = pickWeakMonIds(list, {
    protectIds: busyMonIds(state),
    smartProtect: true,
  });
  if (!ids.length) return 0;
  return releaseMonIds(state, ids).removed;
}

function maintainBallStock() {
  if (!state.unlocks?.pokeball) return 0;
  let made = 0;
  const target = (state.era?.questCounters?.catch_count || 0) < 80 ? 20 : 12;
  let guard = 0;
  while ((state.res.pokeball?.value ?? 0) < target && guard++ < 24) {
    const cost1 = getOrbMakeCost(1);
    const woodNeed = cost1.wood ?? 0;
    while ((state.res.wood?.value ?? 0) < woodNeed && (state.gatherCharges ?? 0) > 0) {
      gatherOnce();
      stats.gathers += 1;
    }
    const n = tryCraftBalls(1);
    if (!n) break;
    made += n;
  }
  return made;
}

function tryBuyBuilding() {
  const order = [
    "field",
    "hut",
    "granary",
    "workshop",
    "researchLab",
    "mineralSilo",
    "berryPress",
    "trainingGround",
    "breedingHouse",
    "expeditionPost",
  ];
  const train = state.buildings.trainingGround?.owned ?? 0;
  const breed = state.buildings.breedingHouse?.owned ?? 0;
  const exp = state.buildings.expeditionPost?.owned ?? 0;
  const mineralCap = state.res.minerals?.cap ?? 0;
  const mineralVal = state.res.minerals?.value ?? 0;
  // Prefer unlocking a new building type over pumping early buildings to MAX(50)
  const ranked = order
    .map((bid) => {
      const owned = state.buildings[bid]?.owned ?? 0;
      const unlockBonus = owned === 0 ? 1000 : 0;
      let midPrefer = bid === "trainingGround" || bid === "breedingHouse" || bid === "expeditionPost" ? 100 : 0;
      if (train >= 1 && breed >= 1 && exp < 1 && bid === "expeditionPost") midPrefer += 500;
      if (train >= 1 && breed >= 1 && exp < 1) {
        const expCost = getBuildingCost("expeditionPost");
        const affordExp = canAfford(expCost);
        if (!affordExp && ["field", "hut", "granary", "berryPress", "trainingGround", "breedingHouse"].includes(bid) && owned > 0) {
          midPrefer -= 300;
        }
      }
      if (train >= 1 && breed >= 1 && exp < 1 && (bid === "quarry" || bid === "mineralSilo") && mineralVal >= mineralCap * 0.85) {
        midPrefer += 200;
      }
      const dawnCatch = (state.era?.id || "dawn") === "dawn" && (state.era?.questCounters?.catch_count || 0) < 80;
      if (dawnCatch && (bid === "field" || bid === "hut" || bid === "granary")) {
        midPrefer -= owned * 8;
      }
      return { bid, score: unlockBonus + midPrefer - owned };
    })
    .sort((a, b) => b.score - a.score);
  for (const { bid } of ranked) {
    const bdef = defs.buildings[bid];
    if (!bdef) continue;
    const owned = state.buildings[bid]?.owned ?? 0;
    const dawnCatch = (state.era?.id || "dawn") === "dawn" && (state.era?.questCounters?.catch_count || 0) < 80;
    if (dawnCatch) {
      if ((bid === "field" || bid === "hut") && owned >= 6) continue;
      if (bid === "granary" && owned >= 2) continue;
      if (bid === "workshop" && owned >= 3) continue;
      if ((state.res.pokeball?.value ?? 0) < 8 && ["field", "granary", "berryPress"].includes(bid)) {
        continue;
      }
    }
    const maxLvl =
      typeof bdef.maxLevel === "number" && Number.isFinite(bdef.maxLevel)
        ? Math.max(1, Math.floor(bdef.maxLevel))
        : BUILDING_MAX_LEVEL;
    if (owned >= maxLvl) continue;
    if (typeof bdef.visible === "function" && !bdef.visible(state)) continue;
    const cost = getBuildingCost(bid);
    if (!canAfford(cost)) continue;
    pay(cost);
    if (!state.buildings[bid]) state.buildings[bid] = { owned: 0 };
    state.buildings[bid].owned = owned + 1;
    return bid;
  }
  return null;
}

function canStartResearch(tid) {
  const tdef = defs.tech[tid];
  if (!tdef || state.tech[tid]) return false;
  for (const p of tdef.prereq || []) {
    if (!state.tech[p]) return false;
  }
  if (typeof tdef.req === "function" && !tdef.req(state)) return false;
  return canAfford(getResearchCost(tdef));
}

function tryStartResearch() {
  if (state.research?.tid) return null;
  // Prefer pokeballBasics early
  const order = Object.keys(defs.tech);
  order.sort((a, b) => {
    const pa = a === "pokeballBasics" ? -100 : a === "berryCultivation" ? -90 : 0;
    const pb = b === "pokeballBasics" ? -100 : b === "berryCultivation" ? -90 : 0;
    return pa - pb;
  });
  for (const tid of order) {
    if (!canStartResearch(tid)) continue;
    const tdef = defs.tech[tid];
    const cost = getResearchCost(tdef);
    pay(cost);
    const t = computeResearchTimeSec(tdef);
    state.research = { tid, remainingSec: t, totalSec: t };
    return tid;
  }
  return null;
}

function tryCraftBalls(qtyWanted = 5) {
  if (!state.unlocks?.pokeball) return 0;
  const space = Math.max(0, (state.res.pokeball.cap ?? 0) - (state.res.pokeball.value ?? 0));
  const qty = Math.min(qtyWanted, space);
  if (qty <= 0) return 0;
  const cost = getOrbMakeCost(qty);
  if (!canAfford(cost)) return 0;
  pay(cost);
  const before = state.res.pokeball.value;
  addRes("pokeball", qty);
  const made = Math.max(0, state.res.pokeball.value - before);
  const bonus = eraOrbBonusCrafted(state, made);
  if (bonus > 0) addRes("pokeball", bonus);
  const total = made + bonus;
  state.pokeballMade = Math.max(0, (state.pokeballMade ?? 0) + total);
  if (total > 0) bumpEraCounter(state, "pokeball_earned", total);
  syncEraProgress();
  return total;
}

function tryTrain() {
  const slots = Math.max(0, Math.floor(state.training?.slotSize || 0));
  if (slots <= 0) return;
  const list = state.mons?.list || [];
  if (!list.length) return;
  const ranked = list
    .slice()
    .sort((a, b) => (b.lvl || 1) - (a.lvl || 1) || monPower(b) - monPower(a))
    .slice(0, slots);
  state.training.activeIds = ranked.map((m) => m.id);
}

function tryEra() {
  syncEraProgress();
  if (!canAdvanceEra(state, getCaptureAreas)) return false;
  const before = state.era?.id;
  const ok = advanceEra(state, { addLog, getCaptureAreas });
  if (ok) note(`era advanced ${before} → ${state.era?.id}`);
  return ok;
}

function ensurePve() {
  if (!state.pve || typeof state.pve !== "object") {
    state.pve = { progress: {}, selectedIds: [], dailyAttempts: 0, dailyDate: "" };
  }
  if (!state.pve.progress) state.pve.progress = {};
}

function tryPve() {
  ensurePve();
  if ((state.pve.dailyAttempts || 0) >= PVE_DAILY_MAX) return null;
  const list = state.mons?.list || [];
  if (list.length < 1) return null;
  // pick first unlocked uncleared or any unlocked
  let stageId = null;
  for (const ch of PVE_CHAPTERS) {
    for (const st of ch.stages) {
      const unlocked =
        !st.unlockReq || Boolean(state.pve.progress[st.unlockReq]);
      if (!unlocked) continue;
      stageId = st.id;
      if (!state.pve.progress[st.id]) break;
    }
    if (stageId) break;
  }
  if (!stageId) return null;
  const info = getStageById(stageId);
  if (!info) return null;
  const st = info.stage;
  const teamMons = list
    .slice()
    .sort((a, b) => pveTeamScore(b, st) - pveTeamScore(a, st) || monPower(b) - monPower(a))
    .slice(0, 6);
  state.pve.selectedIds = teamMons.map((m) => m.id);
  state.pve.dailyAttempts = (state.pve.dailyAttempts || 0) + 1;
  const team = teamMons.map((m) => ({
    name: m.name,
    types: globalThis.BEAST_TYPES?.[m.dex] || ["normal"],
    stats: getMonCurrentStats(m, null),
  }));
  const clearedBefore = Boolean(state.pve.progress[st.id]);
  const tut = pveFightModifiers(st.id, clearedBefore);
  const result = simulateBattle(team, st.enemies, st.type, {
    playerDamageMul: tut.playerDamageMul,
    incomingDamageMul: natureIncomingDamageMul(state) * tut.incomingDamageMul,
    enemyHpMul: tut.enemyHpMul,
  });
  if (result.win) {
    state.pve.progress[st.id] = true;
    const stars = result.stars || 1;
    const prev = state.pve.progress[`${st.id}_stars`] || 0;
    if (stars > prev) state.pve.progress[`${st.id}_stars`] = stars;
    const rewards = st.rewards || {};
    if (rewards.futurecoin) addRes("futurecoin", rewards.futurecoin);
    if (rewards.exp) for (const m of teamMons) addExpToMon(m, rewards.exp);
  }
  return { stageId, win: result.win, stars: result.stars, endReason: result.endReason };
}

function tryExpedition() {
  const postLvl = state.buildings?.expeditionPost?.owned ?? 0;
  if (postLvl < 1) return false;
  if (state.expedition?.on && (state.expedition.remainingSec || 0) > 0) return false;
  if (!state.expedition || typeof state.expedition !== "object") {
    state.expedition = {
      on: false,
      selectedLevel: "basic",
      selectedDungeonKey: null,
      selectedIds: [],
      activeIds: [],
      remainingSec: 0,
      totalSec: 0,
      dungeons: {},
    };
  }
  const lvlDef = getExpLevelDef("basic");
  if (postLvl < lvlDef.unlockLvl) return false;
  const typeKeys = Object.keys(TYPE_MUL || {}).length
    ? Object.keys(TYPE_MUL)
    : ["normal", "fire", "water", "grass", "electric"];
  if (!state.expedition.dungeons || typeof state.expedition.dungeons !== "object") {
    state.expedition.dungeons = {};
  }
  if (!state.expedition.dungeons.basic?.length) {
    state.expedition.dungeons.basic = pickExpeditionDungeons(typeKeys);
  }
  const dlist = state.expedition.dungeons.basic || [];
  const d = dlist[0];
  if (!d) return false;
  const list = state.mons?.list || [];
  const sel = list
    .slice()
    .sort((a, b) => monPower(b) - monPower(a))
    .slice(0, 6);
  if (!sel.length) return false;
  const effPower = sel.reduce((acc, m) => acc + monPower(m) * expeditionTypeMul(m, d.type, () => null), 0);
  if (effPower < lvlDef.req) return false;
  const natureTimeMul = expeditionNatureTimeMul(sel);
  const totalSec = Math.max(60, Math.ceil(7200 * natureTimeMul));
  state.expedition.on = true;
  state.expedition.activeIds = sel.map((m) => m.id);
  state.expedition.selectedIds = sel.map((m) => m.id);
  state.expedition.selectedLevel = "basic";
  state.expedition.selectedDungeonKey = d.key;
  state.expedition.remainingSec = totalSec;
  state.expedition.totalSec = totalSec;
  state.expedition.rewardExp = lvlDef.exp;
  state.expedition.rewardCoin = lvlDef.coin;
  return true;
}

function tryAutoResearch() {
  return Boolean(tryStartResearch());
}

const tick = createTick({
  ui,
  defs,
  computeDerived,
  addRes,
  addLog,
  tryAutoResearch,
  markMonsDirty: () => {},
  addExpToMon,
  createMonInstance,
  getServerBuffLevel,
  getSpeciesByPid,
  BUILDING_MAX_LEVEL,
  getBuildingCost,
  canAfford,
  pay,
  getOrbMakeCost,
  getState: () => state,
});

// --- stats ---
const stats = {
  gathers: 0,
  builds: 0,
  researches: 0,
  ballsCrafted: 0,
  catches: 0,
  catchFails: 0,
  eraAdvances: 0,
  pveWins: 0,
  pveLosses: 0,
  expeditionsStarted: 0,
  expeditionsCompleted: 0,
  released: 0,
  steps: 0,
};

function checkInvariants(tag, { noisy = false } = {}) {
  for (const [rid, r] of Object.entries(state.res || {})) {
    if (!r || typeof r !== "object") continue;
    const v = r.value;
    const c = r.cap;
    if (typeof v === "number" && !Number.isFinite(v)) fail(`NaN resource ${rid} @${tag}`);
    if (typeof v === "number" && v < -1e-6) fail(`negative resource ${rid}=${v} @${tag}`);
    if (noisy && typeof c === "number" && Number.isFinite(c) && typeof v === "number" && v > c + 1) {
      warn(`over-cap ${rid} value=${v} cap=${c} @${tag}`);
    }
  }
  if ((state.gatherCharges ?? 0) < 0) fail("gatherCharges < 0");
  if ((state.encounterCharges ?? 0) < 0) fail("encounterCharges < 0");
  if ((state.encounterPlusCharges ?? 0) < 0) fail("encounterPlusCharges < 0");
  const list = state.mons?.list || [];
  const ids = new Set();
  for (const m of list) {
    if (!m || typeof m !== "object") {
      fail("null mon in list");
      continue;
    }
    if (ids.has(m.id)) fail(`duplicate mon id ${m.id}`);
    ids.add(m.id);
    if (typeof m.lvl === "number" && (m.lvl < 1 || m.lvl > 100)) fail(`mon lvl out of range ${m.lvl}`);
  }
}

const actionEvery = Math.max(1, Math.floor(60 / dt)); // ~each minute of sim time
let softlockNoCatch = 0;
let softlockNoResearch = 0;
let lastCatchCount = 0;
let lastTechCount = 0;

computeDerived();
checkInvariants("boot", { noisy: true });

let prevExpOn = Boolean(state.expedition?.on);

function step(t) {
  stats.steps += 1;
  tick(dt);
  const expOn = Boolean(state.expedition?.on);
  if (prevExpOn && !expOn && stats.expeditionsStarted > stats.expeditionsCompleted) {
    stats.expeditionsCompleted += 1;
  }
  prevExpOn = expOn;
  if (t % 3600 < dt) checkInvariants(`t=${t}h`, { noisy: true });
  else if (stats.steps % 120 === 0) checkInvariants(`t=${t}`);

  // Keep training satiety topped so AFK exp works
  if (stats.steps % actionEvery === 0) {
    for (const id of state.training?.activeIds || []) {
      const m = (state.mons?.list || []).find((x) => x && x.id === id);
      if (m && (m.satiety ?? 0) < 30) m.satiety = 100;
    }
  }
  if (stats.steps % actionEvery === 0) {
    // gather burst when low on catnip or early game
    const catnip = state.res.catnip?.value ?? 0;
    const catnipCap = state.res.catnip?.cap ?? 1;
    if (catnip < catnipCap * 0.4 || (state.catchCount || 0) < 20) {
      for (let i = 0; i < 20; i++) {
        if (!gatherOnce()) break;
        stats.gathers += 1;
      }
    }

    if (tryBuyBuilding()) stats.builds += 1;

    const released = tryReleaseWeakMons();
    if (released) stats.released = (stats.released || 0) + released;

    const tid = tryStartResearch();
    if (tid) stats.researches += 1;

    const stocked = maintainBallStock();
    if (stocked) stats.ballsCrafted += stocked;

    // catch loop
    if (state.unlocks?.pokeball) {
      const catchBurst = (state.era?.questCounters?.catch_count || 0) < 80 ? 30 : 15;
      for (let i = 0; i < catchBurst; i++) {
        if ((state.res.pokeball?.value ?? 0) < 1) break;
        if (doCatch()) stats.catches += 1;
        else stats.catchFails += 1;
      }
      // unlock next area when possible
      const areas = getCaptureAreas();
      const unlocked = areas.filter((a) => a.unlocked);
      if (unlocked.length) ui.captureAreaId = pickArea ? pickArea(unlocked, api) : unlocked[unlocked.length - 1].id;
    }

    tryTrain();

    if (tryEra()) stats.eraAdvances += 1;

    const pve = tryPve();
    if (pve) {
      if (pve.win) stats.pveWins += 1;
      else stats.pveLosses += 1;
    }

    if (tryExpedition()) stats.expeditionsStarted += 1;
  }

  // softlock detectors + daily PvE reset (hourly)
  if (t > 0 && t % 3600 < dt) {
    if (Math.floor(t / 3600) % 24 === 0) {
      ensurePve();
      state.pve.dailyAttempts = 0;
    }
    const techN = Object.values(state.tech || {}).filter(Boolean).length;
    if (state.tech.pokeballBasics && (state.catchCount || 0) === lastCatchCount && (state.catchCount || 0) < 5) {
      softlockNoCatch += 1;
    } else {
      softlockNoCatch = 0;
    }
    if (techN === lastTechCount && techN < 3 && (state.res.catnip?.value ?? 0) > 50) {
      softlockNoResearch += 1;
    } else {
      softlockNoResearch = 0;
    }
    lastCatchCount = state.catchCount || 0;
    lastTechCount = techN;
    if (softlockNoCatch >= 3) fail("softlock: pokeballBasics but no catches for 3h");
    if (softlockNoResearch >= 4) warn("stalled research progress 4h with catnip>50");
  }
}

/** 能升纪元时 tryEra 已处理；这里只跑到指定纪元，返回用时（小时），超时返回 null */
function runUntilEra(index, maxHours) {
  const maxSec = Math.floor(maxHours * 3600);
  for (let t = 0; t < maxSec; t += dt) {
    if ((state.era?.index ?? 0) >= index) return (stats.steps * dt) / 3600;
    step(t);
  }
  return (state.era?.index ?? 0) >= index ? (stats.steps * dt) / 3600 : null;
}

const api = {
  state, ui, defs, stats, findings, fail, warn, note, step, runUntilEra, checkInvariants, computeDerived, syncEraProgress,
  getCaptureAreas, getCapturePool, baseCatchChanceByDex, computeTechEffects, createMonInstance,
};
return api;
}
