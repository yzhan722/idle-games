import { clamp, randFloat } from "./utils.js";
import { runAutomation } from "./automation.js";
import { eraEncounterRechargeMul } from "./systems/era.js";
import {
  pickExpeditionEventCard,
  resolveSeasonId,
  tickExpeditionMilestones,
} from "./systems/expedition.js";
import {
  bumpSessionExpedition,
  natureAffectionMul,
  natureBreedTimeMul,
  natureEncounterRechargeMul,
  natureResearchDtMul,
  natureSatietyDecayMul,
  natureSatietyRegenMul,
  natureTrainExpMul,
  noteExpeditionDailyDone,
} from "./systems/gameplay_fun.js";
import {
  advanceAmberIvTraining,
  advanceEcoSandbox,
  advanceNightObservatory,
  advanceSkyIsland,
  advanceStarCamp,
  advanceTreasureVoyage,
  advanceHotSpring,
  advanceDreamLibrary,
  advanceBakery,
  getBakeryBuffDef,
  getBakeryRecipeDef,
  advanceCloudPark,
  getAwayReturnedUnits,
  getParkEventDef,
  getParkRideDef,
  getParkTitle,
  advanceWishDock,
  computeAmberRevivalAura,
  computeEcoRelicAura,
  computeElementalBondResonance,
  computeShinyShowcaseAura,
  computeSkyIslandAura,
  computeStarBoutiqueAura,
  computeStarCampAura,
  getMonBoutiqueBonus,
  getTreasureExpeditionFragments,
  grantTreasureMapFragments,
  noteSeasonRelic,
  rollSeasonRelic,
} from "./systems/collection_fun.js";
import {
  advanceBalloonTravel,
  advanceStargazeCamp,
  getStargazeShowerDef,
  getStargazeSiteDef,
  advanceIceRink,
  advanceBeeWorkshop,
  getIceRinkProgramDef,
  getBeeHiveDef,
  getBeeFlowerDef,
  ICE_RINK_BUFF_ZH,
  advanceFishingClub,
  advancePostOffice,
  advanceSeasonMigration,
  computeStarCorridorBonus,
  getBalloonIsleDef,
  getFishingFishDef,
} from "./systems/pve_tower.js";
import { legacyBreedTimeMul } from "./systems/rebirth.js";
import { hatchEgg as hatchEggCore } from "./systems/breeding.js";
import { computeTechEffects } from "./systems/effects.js";

export function createTick(ctx) {
  const ui = ctx.ui;
  const defs = ctx.defs;
  const computeDerived = ctx.computeDerived;
  const addRes = ctx.addRes;
  const addLog = ctx.addLog;
  const tryAutoResearch = ctx.tryAutoResearch;
  const markMonsDirty = ctx.markMonsDirty;
  const addExpToMon = ctx.addExpToMon;
  const createMonInstance = ctx.createMonInstance;
  const getServerBuffLevel = ctx.getServerBuffLevel;
  const getSpeciesByPid = ctx.getSpeciesByPid;
  const BUILDING_MAX_LEVEL = ctx.BUILDING_MAX_LEVEL;
  const getBuildingCost = ctx.getBuildingCost;
  const canAfford = ctx.canAfford;
  const pay = ctx.pay;
  const getOrbMakeCost = ctx.getOrbMakeCost;
  const getState = ctx.getState;
  const pushTickerEvent = ctx.pushTickerEvent;
  const onResearchComplete = ctx.onResearchComplete;

  // Cached monById/aliveSet — only rebuilt when mons list changes
  let __cachedMonById = null;
  let __cachedAliveSet = null;
  let __cachedMonsLen = -1;
  let __cachedNextId = -1;

  function getMonMaps(mons, nextId) {
    const len = mons.length;
    if (__cachedMonById && len === __cachedMonsLen && nextId === __cachedNextId) {
      return { monById: __cachedMonById, aliveSet: __cachedAliveSet };
    }
    const monById = new Map();
    const aliveSet = new Set();
    for (const m of mons) {
      if (!m || typeof m !== "object") continue;
      const id = typeof m.id === "number" && Number.isFinite(m.id) ? m.id : null;
      if (id === null) continue;
      monById.set(id, m);
      aliveSet.add(id);
    }
    __cachedMonById = monById;
    __cachedAliveSet = aliveSet;
    __cachedMonsLen = len;
    __cachedNextId = nextId;
    return { monById, aliveSet };
  }

  function ensureExpeditionState(state) {
    if (!state.expedition || typeof state.expedition !== "object") {
      state.expedition = {
        on: false,
        selectedLevel: "basic",
        selectedDungeonKey: null,
        selectedIds: [],
        activeIds: [],
        remainingSec: 0,
        totalSec: 0,
        rewardExp: 0,
        rewardCoin: 0,
        rewardPotionTotal: 0,
        dungeonType: null,
        dungeons: null,
      };
    }
    if (!Array.isArray(state.expedition.selectedIds)) state.expedition.selectedIds = [];
    if (!Array.isArray(state.expedition.activeIds)) state.expedition.activeIds = [];
  }

  function regenExpeditionDungeons(state) {
    ensureExpeditionState(state);
    const typeMap = globalThis.TYPE_ZH;
    const types = typeMap && typeof typeMap === "object" ? Object.keys(typeMap) : [];
    if (types.length <= 0) return;

    const pick3 = () => {
      const picks = [];
      const seen = new Set();
      let guard = 0;
      while (picks.length < 3 && guard < 200) {
        guard += 1;
        const t = types[Math.floor(Math.random() * types.length)];
        if (!t || seen.has(t)) continue;
        seen.add(t);
        picks.push({ key: `${t}_${Math.floor(Math.random() * 1e9)}`, type: t });
      }
      return picks;
    };

    state.expedition.dungeons = {
      basic: pick3(),
      intermediate: pick3(),
      advanced: pick3(),
      super: pick3(),
      master: pick3(),
    };

    const lvl = typeof state.expedition.selectedLevel === "string" && state.expedition.selectedLevel ? state.expedition.selectedLevel : "basic";
    const list = state.expedition.dungeons?.[lvl];
    const picks = Array.isArray(list) ? list : [];
    const curKey = typeof state.expedition.selectedDungeonKey === "string" ? state.expedition.selectedDungeonKey : null;
    if (!curKey || !picks.some((x) => x && x.key === curKey)) {
      state.expedition.selectedDungeonKey = picks[0]?.key ?? null;
    }
  }

  let __evoPrev = null;
  function __getEvoPrev() {
    if (__evoPrev) return __evoPrev;
    const evo = globalThis.BEAST_EVO;
    const prev = {};
    if (evo && typeof evo === "object") {
      for (const [from, tos] of Object.entries(evo)) {
        if (!Array.isArray(tos)) continue;
        for (const to of tos) {
          if (typeof to !== "string") continue;
          if (!prev[to]) prev[to] = from;
        }
      }
    }
    __evoPrev = prev;
    return __evoPrev;
  }

  function getBasePid(pid) {
    if (!pid || typeof pid !== "string") return null;
    const prev = __getEvoPrev();
    let cur = pid;
    let guard = 0;
    while (prev[cur] && guard < 6) {
      cur = prev[cur];
      guard += 1;
    }
    return cur;
  }

  function sameFamily(pidA, pidB) {
    if (!pidA || !pidB) return false;
    if (pidA === pidB) return true;
    return getBasePid(pidA) === getBasePid(pidB);
  }

  function breedingEggTotalSec(lvl) {
    const l = Math.max(0, Math.min(10, Math.floor(typeof lvl === "number" && Number.isFinite(lvl) ? lvl : 0)));
    if (l <= 0) return 0;
    // 优化：基础时间从12h降为6h，epic萌灵乘数从×10降为×4（约1天/只，可接受）
    const hours = Math.max(1, 7 - l);
    return hours * 3600;
  }

  function ensureBreedingState(state) {
    if (!state.breeding || typeof state.breeding !== "object") {
      state.breeding = { on: false, aId: null, bId: null, eggRemainingSec: 0, eggTotalSec: 0 };
    }
  }

  function stopBreeding(state) {
    ensureBreedingState(state);
    state.breeding.on = false;
    state.breeding.eggRemainingSec = 0;
    state.breeding.eggTotalSec = 0;
  }

  function getMonById(mons, monById, id) {
    if (!id) return null;
    if (monById && typeof monById.get === "function") {
      return monById.get(id) ?? null;
    }
    return mons.find((m) => m && m.id === id) ?? null;
  }

  function ensureEggTimer(state, mons, monById) {
    ensureBreedingState(state);
    if (!state.breeding.on) return;
    const lvl = state.buildings?.breedingHouse?.owned ?? 0;
    if (lvl <= 0) return;
    const aId = typeof state.breeding.aId === "number" && Number.isFinite(state.breeding.aId) ? state.breeding.aId : null;
    const bId = typeof state.breeding.bId === "number" && Number.isFinite(state.breeding.bId) ? state.breeding.bId : null;
    if (!aId || !bId || aId === bId) {
      state.breeding.eggRemainingSec = 0;
      state.breeding.eggTotalSec = 0;
      return;
    }
    const a = getMonById(mons, monById, aId);
    const b = getMonById(mons, monById, bId);
    if (!a || !b) {
      stopBreeding(state);
      return;
    }

    const dittoPid = "p132";
    const eligible = a.pid === dittoPid || b.pid === dittoPid || sameFamily(a.pid, b.pid);
    if (!eligible) {
      state.breeding.eggRemainingSec = 0;
      state.breeding.eggTotalSec = 0;
      return;
    }

    if ((state.breeding.eggRemainingSec ?? 0) > 0) return;
    let t = breedingEggTotalSec(lvl) * natureBreedTimeMul(state) * legacyBreedTimeMul(state);
    let basePid = null;
    if (a.pid === dittoPid && b.pid !== dittoPid) basePid = getBasePid(b.pid);
    else if (b.pid === dittoPid && a.pid !== dittoPid) basePid = getBasePid(a.pid);
    else if (sameFamily(a.pid, b.pid)) basePid = getBasePid(a.pid);
    const sp = basePid && typeof getSpeciesByPid === "function" ? getSpeciesByPid(basePid) : null;
    if (sp && sp.tier === "epic") t *= 4; // 优化：epic孵蛋时间从×10降为×4（约1天可得）
    state.breeding.eggTotalSec = t;
    state.breeding.eggRemainingSec = t;
  }

  function hatchEgg(state, mons, monById) {
    const techEff = typeof computeTechEffects === "function" ? computeTechEffects(state) : null;
    const shinyChanceMul =
      typeof techEff?.shinyChanceMul === "number" && Number.isFinite(techEff.shinyChanceMul)
        ? techEff.shinyChanceMul
        : 1;
    return hatchEggCore(state, {
      mons,
      monById,
      getMonById,
      getBasePid,
      sameFamily,
      getSpeciesByPid,
      createMonInstance,
      randFloat,
      addLog,
      addRes,
      ui,
      shinyChanceMul,
    });
  }

  return function tick(dtSec, opts = null) {
    const offline = Boolean(opts && typeof opts === "object" && opts.offline);
    const state = getState();
    // 累加游戏总时长（仅非离线计算时）
    if (!offline && typeof state.totalPlayMs === "number") {
      state.totalPlayMs += dtSec * 1000;
    }

    const eff = computeDerived();

    if (!state.skills || typeof state.skills !== "object") {
      state.skills = {
        hugeBerryBuffRemainingSec: 0,
        fairyAffGainRemainingSec: 0,
        rockBuildBoostRemainingSec: 0,
        darkPveDamageBoostRemainingSec: 0,
      };
    }

    const huge0 =
      typeof state.skills.hugeBerryBuffRemainingSec === "number" && Number.isFinite(state.skills.hugeBerryBuffRemainingSec)
        ? state.skills.hugeBerryBuffRemainingSec
        : 0;
    const huge1 = huge0 > 0 ? Math.max(0, huge0 - dtSec) : 0;
    if (huge1 !== huge0) state.skills.hugeBerryBuffRemainingSec = huge1;

    const fairy0 =
      typeof state.skills.fairyAffGainRemainingSec === "number" && Number.isFinite(state.skills.fairyAffGainRemainingSec)
        ? state.skills.fairyAffGainRemainingSec
        : 0;
    const fairy1 = fairy0 > 0 ? Math.max(0, fairy0 - dtSec) : 0;
    if (fairy1 !== fairy0) state.skills.fairyAffGainRemainingSec = fairy1;

    const rock0 =
      typeof state.skills.rockBuildBoostRemainingSec === "number" && Number.isFinite(state.skills.rockBuildBoostRemainingSec)
        ? state.skills.rockBuildBoostRemainingSec
        : 0;
    const rock1 = rock0 > 0 ? Math.max(0, rock0 - dtSec) : 0;
    if (rock1 !== rock0) state.skills.rockBuildBoostRemainingSec = rock1;

    const dark0 =
      typeof state.skills.darkPveDamageBoostRemainingSec === "number" && Number.isFinite(state.skills.darkPveDamageBoostRemainingSec)
        ? state.skills.darkPveDamageBoostRemainingSec
        : 0;
    const dark1 = dark0 > 0 ? Math.max(0, dark0 - dtSec) : 0;
    if (dark1 !== dark0) state.skills.darkPveDamageBoostRemainingSec = dark1;

    const expBoost0 =
      typeof state.expBoostRemainingSec === "number" && Number.isFinite(state.expBoostRemainingSec) ? state.expBoostRemainingSec : 0;
    const expBoost1 = expBoost0 > 0 ? Math.max(0, expBoost0 - dtSec) : 0;
    if (expBoost0 !== expBoost1) {
      state.expBoostRemainingSec = expBoost1;
      if (ui.activeTab === "future") ui.futureDirty = true;
    }
    const expBoostOn = expBoost1 > 0;

    const captureBoost0 =
      typeof state.captureBoostRemainingSec === "number" && Number.isFinite(state.captureBoostRemainingSec)
        ? state.captureBoostRemainingSec
        : 0;
    const captureBoost1 = captureBoost0 > 0 ? Math.max(0, captureBoost0 - dtSec) : 0;
    if (captureBoost0 !== captureBoost1) {
      state.captureBoostRemainingSec = captureBoost1;
      if (ui.activeTab === "future") ui.futureDirty = true;
    }

    const prodBoost0 =
      typeof state.prodBoostRemainingSec === "number" && Number.isFinite(state.prodBoostRemainingSec)
        ? state.prodBoostRemainingSec
        : 0;
    const prodBoost1 = prodBoost0 > 0 ? Math.max(0, prodBoost0 - dtSec) : 0;
    if (prodBoost0 !== prodBoost1) {
      state.prodBoostRemainingSec = prodBoost1;
      if (ui.activeTab === "future") ui.futureDirty = true;
    }

    const shinyCharm0 =
      typeof state.shinyCharmRemainingSec === "number" && Number.isFinite(state.shinyCharmRemainingSec) ? state.shinyCharmRemainingSec : 0;
    const shinyCharm1 = shinyCharm0 > 0 ? Math.max(0, shinyCharm0 - dtSec) : 0;
    if (shinyCharm0 !== shinyCharm1) state.shinyCharmRemainingSec = shinyCharm1;

    const encPlusCharges0 =
      typeof state.encounterPlusCharges === "number" && Number.isFinite(state.encounterPlusCharges) ? state.encounterPlusCharges : 1;
    const encPlusCd0 =
      typeof state.encounterPlusCdSec === "number" && Number.isFinite(state.encounterPlusCdSec) ? state.encounterPlusCdSec : 0;
    const encPlusMaxBonus = typeof state.permanentBoosts?.encPlusMax === "number" ? Math.max(0, Math.min(20, Math.floor(state.permanentBoosts.encPlusMax))) : 0;
    const maxCharges = 10 + encPlusMaxBonus;
    const eraRechargeMul = eraEncounterRechargeMul(state) * natureEncounterRechargeMul(state);
    const rechargeSec = 600 * eraRechargeMul;

    let encPlusCharges1 = Math.max(0, Math.min(maxCharges, Math.floor(encPlusCharges0)));
    let encPlusCd1 = Math.max(0, encPlusCd0);

    // 离线时批量恢复充能，在线时逐tick恢复
    if (offline) {
      const totalOfflineSec = dtSec;
      const remainCd = encPlusCd1 > 0 ? encPlusCd1 : 0;
      const secAfterFirstCharge = Math.max(0, totalOfflineSec - remainCd);
      const firstCharge = (remainCd > 0 && totalOfflineSec >= remainCd) ? 1 : 0;
      const extraCharges = rechargeSec > 0 ? Math.floor(secAfterFirstCharge / rechargeSec) : 0;
      const gained = firstCharge + extraCharges;
      encPlusCharges1 = Math.min(maxCharges, encPlusCharges1 + gained);
      if (encPlusCharges1 >= maxCharges) {
        encPlusCd1 = 0;
      } else if (gained > 0) {
        encPlusCd1 = rechargeSec - (secAfterFirstCharge % rechargeSec);
      } else {
        encPlusCd1 = Math.max(0, encPlusCd1 - totalOfflineSec);
      }
    } else {
      if (encPlusCharges1 >= maxCharges) {
        encPlusCd1 = 0;
      } else {
        if (encPlusCd1 <= 0) {
          encPlusCd1 = rechargeSec;
        } else {
          encPlusCd1 = Math.max(0, encPlusCd1 - dtSec);
          if (encPlusCd1 <= 0) {
            encPlusCharges1 = Math.min(maxCharges, encPlusCharges1 + 1);
            encPlusCd1 = encPlusCharges1 >= maxCharges ? 0 : rechargeSec;
          }
        }
      }
    }

    if (encPlusCharges0 !== encPlusCharges1 || encPlusCd0 !== encPlusCd1) {
      state.encounterPlusCharges = encPlusCharges1;
      state.encounterPlusCdSec = encPlusCd1;
      if (ui.activeTab === "capture") ui.captureDirty = true;
    }

    const gatherCharges0 =
      typeof state.gatherCharges === "number" && Number.isFinite(state.gatherCharges) ? state.gatherCharges : 1000;
    const gatherCd0 = typeof state.gatherCdSec === "number" && Number.isFinite(state.gatherCdSec) ? state.gatherCdSec : 0;
    const gatherMax = 1000;
    const gatherRechargeSec = 10;
    let gatherCharges1 = Math.max(0, Math.min(gatherMax, Math.floor(gatherCharges0)));
    let gatherCd1 = Math.max(0, gatherCd0);

    if (offline) {
      const remainCd = gatherCd1 > 0 ? gatherCd1 : 0;
      const secAfterFirst = Math.max(0, dtSec - remainCd);
      const firstCharge = (remainCd > 0 && dtSec >= remainCd) ? 1 : 0;
      const extraCharges = gatherRechargeSec > 0 ? Math.floor(secAfterFirst / gatherRechargeSec) : 0;
      gatherCharges1 = Math.min(gatherMax, gatherCharges1 + firstCharge + extraCharges);
      if (gatherCharges1 >= gatherMax) {
        gatherCd1 = 0;
      } else if (firstCharge + extraCharges > 0) {
        gatherCd1 = gatherRechargeSec - (secAfterFirst % gatherRechargeSec);
      } else {
        gatherCd1 = Math.max(0, gatherCd1 - dtSec);
      }
    } else {
      if (gatherCharges1 >= gatherMax) {
        gatherCd1 = 0;
      } else {
        if (gatherCd1 <= 0) {
          gatherCd1 = gatherRechargeSec;
        } else {
          gatherCd1 = Math.max(0, gatherCd1 - dtSec);
          if (gatherCd1 <= 0) {
            gatherCharges1 = Math.min(gatherMax, gatherCharges1 + 1);
            gatherCd1 = gatherCharges1 >= gatherMax ? 0 : gatherRechargeSec;
          }
        }
      }
    }

    if (gatherCharges0 !== gatherCharges1 || gatherCd0 !== gatherCd1) {
      state.gatherCharges = gatherCharges1;
      state.gatherCdSec = gatherCd1;
      if (ui) ui.bonfireDirty = true;
    }

    const encCharges0 = typeof state.encounterCharges === "number" && Number.isFinite(state.encounterCharges) ? state.encounterCharges : 100;
    const encCd0 = typeof state.encounterCdSec === "number" && Number.isFinite(state.encounterCdSec) ? state.encounterCdSec : 0;
    const encMax = 100;
    const encRechargeSec = 60 * eraRechargeMul;
    let encCharges1 = Math.max(0, Math.min(encMax, Math.floor(encCharges0)));
    let encCd1 = Math.max(0, encCd0);

    if (offline) {
      const remainCd = encCd1 > 0 ? encCd1 : 0;
      const secAfterFirst = Math.max(0, dtSec - remainCd);
      const firstCharge = (remainCd > 0 && dtSec >= remainCd) ? 1 : 0;
      const extraCharges = encRechargeSec > 0 ? Math.floor(secAfterFirst / encRechargeSec) : 0;
      encCharges1 = Math.min(encMax, encCharges1 + firstCharge + extraCharges);
      if (encCharges1 >= encMax) {
        encCd1 = 0;
      } else if (firstCharge + extraCharges > 0) {
        encCd1 = encRechargeSec - (secAfterFirst % encRechargeSec);
      } else {
        encCd1 = Math.max(0, encCd1 - dtSec);
      }
    } else {
      if (encCharges1 >= encMax) {
        encCd1 = 0;
      } else {
        if (encCd1 <= 0) {
          encCd1 = encRechargeSec;
        } else {
          encCd1 = Math.max(0, encCd1 - dtSec);
          if (encCd1 <= 0) {
            encCharges1 = Math.min(encMax, encCharges1 + 1);
            encCd1 = encCharges1 >= encMax ? 0 : encRechargeSec;
          }
        }
      }
    }

    if (encCharges0 !== encCharges1 || encCd0 !== encCd1) {
      state.encounterCharges = encCharges1;
      state.encounterCdSec = encCd1;
      if (ui.activeTab === "capture") ui.captureDirty = true;
    }

    if (!offline && state.research && typeof state.research === "object" && state.research.tid) {
      const tid = state.research.tid;
      const tdef = defs.tech?.[tid];
      const rem0 =
        typeof state.research.remainingSec === "number" && Number.isFinite(state.research.remainingSec) ? state.research.remainingSec : 0;
      const rem1 = rem0 - dtSec * natureResearchDtMul(state);
      state.research.remainingSec = rem1;
      if (rem1 <= 0) {
        state.research = null;
        if (tdef && !state.tech[tid]) {
          state.tech[tid] = true;
          addLog(`研究完成：${tdef.name}`);
          if (typeof onResearchComplete === "function") onResearchComplete(tid);
          // Starter balls granted in computeDerived via meta.starterBallsGranted
          tryAutoResearch();
        }
      }
    }

    if (!offline && (!state.research || !(typeof state.research === "object" && state.research.tid))) {
      tryAutoResearch();
    }

    if (!offline) {
      const autoCraftCfg0 =
        state.unlocks?.autoCraft && state.auto?.autoCraft && typeof state.auto.autoCraft === "object" ? state.auto.autoCraft : null;
      const autoCraftWanted = Boolean(autoCraftCfg0 && Object.values(autoCraftCfg0).some((v) => Boolean(v)));
      if (autoCraftWanted && (!state.crafting || typeof state.crafting !== "object")) {
        state.crafting = {
          evolutionEnergy: null,
          evolutionStone: null,
          linkRope: null,
          hugeBerry: null,
          megaStone: null,
        };
      }

      if (state.crafting && typeof state.crafting === "object") {
        if (state.crafting.type) {
          const type0 = state.crafting.type;
          const type = type0 === "evolutionStone" ? "evolutionEnergy" : type0;
          const remainingSec =
            typeof state.crafting.remainingSec === "number" && Number.isFinite(state.crafting.remainingSec) ? state.crafting.remainingSec : 0;
          const totalSec =
            typeof state.crafting.totalSec === "number" && Number.isFinite(state.crafting.totalSec) && state.crafting.totalSec > 0
              ? state.crafting.totalSec
              : remainingSec;
          state.crafting = {
            evolutionEnergy: type === "evolutionEnergy" && remainingSec > 0 ? { remainingSec, totalSec } : null,
            evolutionStone: type === "evolutionStone" && remainingSec > 0 ? { remainingSec, totalSec } : null,
            linkRope: type === "linkRope" && remainingSec > 0 ? { remainingSec, totalSec } : null,
            hugeBerry: type === "hugeBerry" && remainingSec > 0 ? { remainingSec, totalSec } : null,
            megaStone: type === "megaStone" && remainingSec > 0 ? { remainingSec, totalSec } : null,
          };
        }

        const craftObj = state.crafting;
        let any = false;

        if (state.unlocks?.autoCraft) {
          const autoCfg = state.auto?.autoCraft && typeof state.auto.autoCraft === "object" ? state.auto.autoCraft : null;
          if (autoCfg) {
            const canStart = (k) => {
              const t = craftObj?.[k];
              return !(t && typeof t === "object" && typeof t.remainingSec === "number" && t.remainingSec > 0);
            };
            const startTask = (k, totalSec) => {
              craftObj[k] = { remainingSec: totalSec, totalSec };
              if (ui && ui.activeTab === "future") ui.futureDirty = true;
            };

            const canStartEnergy = () => {
              const t0 = craftObj?.evolutionEnergy;
              const t1 = craftObj?.evolutionStone;
              const on0 = Boolean(t0 && typeof t0 === "object" && typeof t0.remainingSec === "number" && t0.remainingSec > 0);
              const on1 = Boolean(t1 && typeof t1 === "object" && typeof t1.remainingSec === "number" && t1.remainingSec > 0);
              return !(on0 || on1);
            };

            if ((autoCfg.evolutionEnergy || autoCfg.evolutionStone) && canStartEnergy()) {
              const made0 =
                typeof state.evolutionStoneMade === "number" && Number.isFinite(state.evolutionStoneMade)
                  ? Math.max(0, Math.floor(state.evolutionStoneMade))
                  : 0;
              const stoneCost = Math.min(5000, 300 + made0 * 10);
              const stoneTime = 600;
              if ((state.res.minerals?.value ?? 0) >= stoneCost) {
                state.res.minerals.value = Math.max(0, (state.res.minerals?.value ?? 0) - stoneCost);
                startTask("evolutionEnergy", stoneTime);
                addLog("自动合成：灵晶石（10分钟）");
              }
            }

            if (autoCfg.linkRope && canStart("linkRope")) {
              const ropeCostStone = 3;
              const ropeTime = 900;
              if ((state.res.evolutionStone?.value ?? 0) >= ropeCostStone) {
                state.res.evolutionStone.value = Math.max(0, (state.res.evolutionStone?.value ?? 0) - ropeCostStone);
                startTask("linkRope", ropeTime);
                addLog("自动合成：灵契绳（15分钟）");
              }
            }

            if (autoCfg.megaStone && canStart("megaStone")) {
              const megaCostStone = 10;
              const megaTime = 1200;
              if ((state.res.evolutionStone?.value ?? 0) >= megaCostStone) {
                state.res.evolutionStone.value = Math.max(0, (state.res.evolutionStone?.value ?? 0) - megaCostStone);
                startTask("megaStone", megaTime);
                addLog("自动合成：觉醒石（20分钟）");
              }
            }

            if (autoCfg.hugeBerry && canStart("hugeBerry")) {
              const hugeCostCatnip = 5000;
              const hugeCostBig = 30;
              const hugeTime = 900;
              if ((state.res.catnip?.value ?? 0) >= hugeCostCatnip && (state.res.bigBerry?.value ?? 0) >= hugeCostBig) {
                state.res.catnip.value = Math.max(0, (state.res.catnip?.value ?? 0) - hugeCostCatnip);
                state.res.bigBerry.value = Math.max(0, (state.res.bigBerry?.value ?? 0) - hugeCostBig);
                startTask("hugeBerry", hugeTime);
                addLog("自动合成：巨大灵果（15分钟）");
              }
            }
          }
        }

        const stone = craftObj.evolutionEnergy ?? craftObj.evolutionStone;
        const stoneKey = craftObj.evolutionEnergy ? "evolutionEnergy" : craftObj.evolutionStone ? "evolutionStone" : null;
        if (stone && typeof stone === "object" && stoneKey) {
          any = true;
          const rem0 = typeof stone.remainingSec === "number" && Number.isFinite(stone.remainingSec) ? stone.remainingSec : 0;
          const rem1 = rem0 - dtSec;
          stone.remainingSec = rem1;
          if (rem1 <= 0) {
            addRes("evolutionStone", 1);
            addLog("合成完成：灵晶石 +1", true);
            state.evolutionStoneMade = Math.max(0, (state.evolutionStoneMade ?? 0) + 1);
            craftObj[stoneKey] = null;
            if (ui.activeTab === "future") ui.futureDirty = true;
          }
        }

        const rope = craftObj.linkRope;
        if (rope && typeof rope === "object") {
          any = true;
          const rem0 = typeof rope.remainingSec === "number" && Number.isFinite(rope.remainingSec) ? rope.remainingSec : 0;
          const rem1 = rem0 - dtSec;
          rope.remainingSec = rem1;
          if (rem1 <= 0) {
            addRes("linkRope", 1);
            addLog("合成完成：灵契绳 +1", true);
            craftObj.linkRope = null;
          }
        }

        const huge = craftObj.hugeBerry;
        if (huge && typeof huge === "object") {
          any = true;
          const rem0 = typeof huge.remainingSec === "number" && Number.isFinite(huge.remainingSec) ? huge.remainingSec : 0;
          const rem1 = rem0 - dtSec;
          huge.remainingSec = rem1;
          if (rem1 <= 0) {
            addRes("hugeBerry", 1);
            addLog("合成完成：巨大灵果 +1", true);
            craftObj.hugeBerry = null;
          }
        }

        const mega = craftObj.megaStone;
        if (mega && typeof mega === "object") {
          any = true;
          const rem0 = typeof mega.remainingSec === "number" && Number.isFinite(mega.remainingSec) ? mega.remainingSec : 0;
          const rem1 = rem0 - dtSec;
          mega.remainingSec = rem1;
          if (rem1 <= 0) {
            addRes("megaStone", 1);
            addLog("合成完成：觉醒石 +1", true);
            craftObj.megaStone = null;
          }
        }

        if (any && ui.activeTab === "future") {
          ui.futureDirty = true;
        }
      }
    }

    if (eff.catnipPerSec > 0) {
      const add = eff.catnipPerSec * dtSec;
      addRes("catnip", add);
      state.resourceProduced = Math.max(0, (Number.isFinite(state.resourceProduced) ? state.resourceProduced : 0) + add);
    }

    if (state.unlocks.wood) {
      if (eff.woodPerSec > 0) {
        const add = eff.woodPerSec * dtSec;
        addRes("wood", add);
        state.resourceProduced = Math.max(0, (Number.isFinite(state.resourceProduced) ? state.resourceProduced : 0) + add);
      }
    }

    if (state.unlocks.minerals) {
      if (eff.mineralsPerSec > 0) {
        const add = eff.mineralsPerSec * dtSec;
        addRes("minerals", add);
        state.resourceProduced = Math.max(0, (Number.isFinite(state.resourceProduced) ? state.resourceProduced : 0) + add);
      }
    }

    if (!offline) {
      runAutomation({
        state,
        defs,
        ui,
        dtSec,
        BUILDING_MAX_LEVEL,
        getBuildingCost,
        canAfford,
        pay,
        getOrbMakeCost,
        addRes,
        addLog,
      });
    }

    const mons = Array.isArray(state.mons?.list) ? state.mons.list : [];
    if (
      Boolean(state.auto?.autoFeedBigBerry) &&
      (state.res.bigBerry?.value ?? 0) >= 1 &&
      mons.some((m) => m && typeof m === "object" && (typeof m.satiety === "number" ? m.satiety : 100) < 30)
    ) {
      state.res.bigBerry.value = Math.max(0, state.res.bigBerry.value - 1);
      for (const m of mons) {
        if (!m || typeof m !== "object") continue;
        const sat0 = clamp(typeof m.satiety === "number" && Number.isFinite(m.satiety) ? m.satiety : 100, 0, 100);
        m.satiety = clamp(sat0 + 50, 0, 100);
      }
    }
    let monById = null;
    let aliveSet = null;
    if (mons.length > 0) {
      const maps = getMonMaps(mons, state.mons?.nextId ?? -1);
      monById = maps.monById;
      aliveSet = maps.aliveSet;
    }

    if (!state.training || typeof state.training !== "object") state.training = { activeIds: [], slotSize: 0 };
    if (!Array.isArray(state.training.activeIds)) state.training.activeIds = [];
    const trainingIds = state.training.activeIds;
    const trainingSet = trainingIds.length > 0 ? new Set(trainingIds) : null;

    const breedingLvl = state.buildings?.breedingHouse?.owned ?? 0;
    const breedingUnlocked = breedingLvl > 0;
    ensureBreedingState(state);
    const breedingOn = breedingUnlocked && Boolean(state.breeding.on);
    const breedingAId = typeof state.breeding.aId === "number" && Number.isFinite(state.breeding.aId) ? state.breeding.aId : null;
    const breedingBId = typeof state.breeding.bId === "number" && Number.isFinite(state.breeding.bId) ? state.breeding.bId : null;

    if (mons.length > 0) {
      const satietyMulBase = 1;
      const trainExpMul = 10;
      const satRegen = huge1 > 0 ? (10 / 3600) * dtSec : 0;
      const affRateBase = dtSec / (60 * 60 * 2);
      const affLvl = typeof getServerBuffLevel === "function" ? Math.max(0, Math.floor(getServerBuffLevel("aff") || 0)) : 0;
      const affGainMul = (1 + 0.1 * affLvl) * (fairy1 > 0 ? 2 : 1);
      let satietyUiChanged = false;
      let affectionUiChanged = false;
      let expAdded = false;
      let skillTimerChanged = false;
      for (const m of mons) {
        if (!m || typeof m !== "object") continue;

        const cd0 = typeof m.skillCdRemainingSec === "number" && Number.isFinite(m.skillCdRemainingSec) ? m.skillCdRemainingSec : 0;
        const cd1 = cd0 > 0 ? Math.max(0, cd0 - dtSec) : 0;
        if (cd1 !== cd0) {
          m.skillCdRemainingSec = cd1;
          skillTimerChanged = true;
        }

        const at0 = typeof m.skillActiveType === "string" && m.skillActiveType ? m.skillActiveType : null;
        const ar0 =
          typeof m.skillActiveRemainingSec === "number" && Number.isFinite(m.skillActiveRemainingSec) ? m.skillActiveRemainingSec : 0;
        if (at0 && ar0 > 0) {
          const ar1 = Math.max(0, ar0 - dtSec);
          if (ar1 !== ar0) {
            m.skillActiveRemainingSec = ar1;
            skillTimerChanged = true;
          }
          if (ar1 <= 0) {
            if (at0 === "grass") {
              addRes("bigBerry", 1);
              addLog("果树成熟：大灵果 +1", true);
            }
            m.skillActiveType = null;
            m.skillActiveRemainingSec = 0;
            skillTimerChanged = true;
          }
        }

        const mega0 =
          typeof m.megaAuraRemainingSec === "number" && Number.isFinite(m.megaAuraRemainingSec) ? m.megaAuraRemainingSec : 0;
        const mega1 = mega0 > 0 ? Math.max(0, mega0 - dtSec) : 0;
        if (mega1 !== mega0) {
          m.megaAuraRemainingSec = mega1;
          skillTimerChanged = true;
        }

        const isTraining = trainingSet ? trainingSet.has(m.id) : false;
        const isBreeding = breedingOn && (m.id === breedingAId || m.id === breedingBId);
        const satietyMul = satietyMulBase * (isTraining ? 2 : 1) * natureSatietyDecayMul(m);
        const loss = (dtSec / 600) * satietyMul;
        const affRate = affRateBase * natureAffectionMul(m);

        const sat0 = clamp(typeof m.satiety === "number" && Number.isFinite(m.satiety) ? m.satiety : 100, 0, 100);
        const breedRegen = isBreeding ? dtSec / 60 : 0;
        const sat1 = clamp(sat0 - loss + satRegen * natureSatietyRegenMul(m) + breedRegen, 0, 100);
        m.satiety = sat1;
        if (Math.ceil(sat0) !== Math.ceil(sat1)) satietyUiChanged = true;

        if (!offline) {
          const aff0 = clamp(typeof m.affection === "number" && Number.isFinite(m.affection) ? m.affection : 0, 0, 100);
          const affCarry0 =
            typeof m.affectionCarry === "number" && Number.isFinite(m.affectionCarry) ? Math.max(0, m.affectionCarry) : 0;

          if (sat1 > 0) {
            const boutiqueAffMul = computeStarBoutiqueAura(state).affGainMul;
            const monBoutiqueAff = getMonBoutiqueBonus(state, m.id).styled ? 1.15 : 1;
            const affCarry1 = affCarry0 + affRate * affGainMul * boutiqueAffMul * monBoutiqueAff;
            const affAdd = Math.floor(affCarry1);
            m.affectionCarry = affCarry1 - affAdd;
            m.affectionDecayCarry = 0;
            if (affAdd > 0 && aff0 < 100) {
              const aff1 = clamp(aff0 + affAdd, 0, 100);
              m.affection = aff1;
              if (Math.floor(aff0) !== Math.floor(aff1)) affectionUiChanged = true;
            }
          }
        }

        if (sat1 >= 0) {
          const carry0 = typeof m.autoExpCarry === "number" && Number.isFinite(m.autoExpCarry) ? Math.max(0, m.autoExpCarry) : 0;
          const natureMul = isTraining ? natureTrainExpMul(m, trainingIds.length) : 1;
          const showcaseTrainMul = isTraining ? computeShinyShowcaseAura(state).trainExpMul : 1;
          const bondTrainMul = isTraining ? computeElementalBondResonance(state).trainExpMul : 1;
          const ecoTrainMul = isTraining ? computeEcoRelicAura(state).trainExpMul : 1;
          const campTrainMul = isTraining ? computeStarCampAura(state).trainExpMul : 1;
          const boutiqueTrainMul = isTraining ? computeStarBoutiqueAura(state).trainExpMul : 1;
          const amberTrainMul = isTraining ? computeAmberRevivalAura(state).ivTrainMul : 1;
          const corridorTrainMul = isTraining ? computeStarCorridorBonus(state).ivTrainMul : 1;
          const satBonus = sat1 >= 50 ? 1.25 : 1;
          const expMul = (isBreeding ? 50 : isTraining ? trainExpMul * showcaseTrainMul * bondTrainMul * ecoTrainMul * campTrainMul * boutiqueTrainMul * amberTrainMul * corridorTrainMul * natureMul : 1) * satBonus;
          if (isTraining) {
            const ivStep = advanceAmberIvTraining(state, m, dtSec, corridorTrainMul);
            if (ivStep.upgraded) expAdded = true;
          }
          const carry1 = carry0 + (dtSec / 300) * expMul;
          const add = Math.floor(carry1);
          m.autoExpCarry = carry1 - add;
          if (add > 0) {
            addExpToMon(m, add);
            expAdded = true;
            if (isTraining) {
              if (!state.meta || typeof state.meta !== "object") state.meta = {};
              state.meta.trainingExpGained =
                Math.max(0, Math.floor(state.meta.trainingExpGained || 0)) + add;
            }
          }
        }
      }

      if (ui.activeTab === "mons" && (satietyUiChanged || affectionUiChanged || expAdded || skillTimerChanged)) {
        markMonsDirty();
      }
    }

    if (breedingOn && mons.length > 0) {
      ensureEggTimer(state, mons, monById);
      const rem0 = typeof state.breeding.eggRemainingSec === "number" && Number.isFinite(state.breeding.eggRemainingSec) ? state.breeding.eggRemainingSec : 0;
      if (rem0 > 0) {
        // ML-11 暖云孵化巢 / 天穹圣岛共鸣：灵蛋孵化速度光环（倒计时按 ×hatchSpeedMul 推进）
        const hatchSpeedMul = state.meta?.skyIsland ? computeSkyIslandAura(state).hatchSpeedMul : 1;
        const rem1 = Math.max(0, rem0 - dtSec * hatchSpeedMul);
        state.breeding.eggRemainingSec = rem1;
        if (rem1 <= 0) {
          hatchEgg(state, mons, monById);
          state.breeding.eggRemainingSec = 0;
          state.breeding.eggTotalSec = 0;
          ensureEggTimer(state, mons, monById);
        }
        if (ui) ui.functionsDirty = true;
      }
    } else {
      if (state.breeding && typeof state.breeding === "object") {
        state.breeding.eggRemainingSec = 0;
        state.breeding.eggTotalSec = 0;
      }
    }

    ensureExpeditionState(state);
    if (!state.expedition.dungeons || typeof state.expedition.dungeons !== "object") {
      regenExpeditionDungeons(state);
    }

    const expOn = Boolean(state.expedition.on);
    const expRem0 =
      typeof state.expedition.remainingSec === "number" && Number.isFinite(state.expedition.remainingSec) ? Math.max(0, state.expedition.remainingSec) : 0;
    if (expOn && expRem0 > 0) {
      const expRem1 = Math.max(0, expRem0 - dtSec);
      if (expRem1 !== expRem0) {
        const lines = tickExpeditionMilestones(state.expedition, expRem0, expRem1);
        for (const line of lines) addLog(line);
        state.expedition.remainingSec = expRem1;
        if (ui) ui.functionsDirty = true;
      }
      if (expRem1 <= 0) {
        const ids = Array.isArray(state.expedition.activeIds) ? state.expedition.activeIds : [];
        const lvlKey = typeof state.expedition.selectedLevel === "string" ? state.expedition.selectedLevel : "";
        const expAdd = typeof state.expedition.rewardExp === "number" && Number.isFinite(state.expedition.rewardExp) ? Math.max(0, Math.floor(state.expedition.rewardExp)) : 0;
        const coinAdd = typeof state.expedition.rewardCoin === "number" && Number.isFinite(state.expedition.rewardCoin) ? Math.max(0, Math.floor(state.expedition.rewardCoin)) : 0;
        const potTotal =
          typeof state.expedition.rewardPotionTotal === "number" && Number.isFinite(state.expedition.rewardPotionTotal)
            ? Math.max(0, Math.floor(state.expedition.rewardPotionTotal))
            : 0;

        const potMap = {};

        if (mons.length > 0 && expAdd > 0) {
          const idSet = new Set(ids);
          for (const m of mons) {
            if (!m || typeof m !== "object") continue;
            if (!idSet.has(m.id)) continue;
            addExpToMon(m, expAdd);
          }
        }
        if (coinAdd > 0) addRes("futurecoin", coinAdd);

        const eventCard = pickExpeditionEventCard(randFloat);
        let eventBonus = 0;
        if (eventCard?.bonusFuturecoin > 0) {
          eventBonus = Math.max(0, Math.floor(eventCard.bonusFuturecoin));
          addRes("futurecoin", eventBonus);
        }

        if (potTotal > 0) {
          const pool = ["hpPotion", "atkPotion", "defPotion", "spaPotion", "spdPotion", "spePotion"];
          for (let i = 0; i < potTotal; i += 1) {
            const rid = pool[Math.floor(Math.random() * pool.length)];
            addRes(rid, 1);
            potMap[rid] = (potMap[rid] ?? 0) + 1;
          }
        }

        const masterballAdd = lvlKey === "master" ? 1 : 0;
        if (masterballAdd > 0) addRes("masterball", masterballAdd);

        const seasonId = resolveSeasonId(ui?.remoteConfig);
        const relicRoll = rollSeasonRelic(seasonId, randFloat);
        let seasonRelic = null;
        if (relicRoll) {
          seasonRelic = noteSeasonRelic(state, relicRoll);
          if (seasonRelic?.item) {
            addRes(seasonRelic.item, 1);
            addLog(`赛季掉落：${seasonRelic.name}（${seasonRelic.blurb}）→ 获得道具`, true);
          }
        }

        // ML-12 寻宝地图远航：远征完成带回藏宝图残片（初 / 中级 ×1 · 高级 / 超级 ×2 · 大师及以上 ×3）
        const mapFragment = grantTreasureMapFragments(state, "expedition", getTreasureExpeditionFragments(lvlKey), { addRes });
        if (mapFragment > 0) addLog(`远征战利品：藏宝图残片 +${mapFragment}（可在功能页拼合藏宝图）`);

        const wasQuick = Boolean(state.expedition.quick);
        state.expedition.on = false;
        state.expedition.activeIds = [];
        state.expedition.remainingSec = 0;
        state.expedition.totalSec = 0;
        state.expedition.rewardExp = 0;
        state.expedition.rewardCoin = 0;
        state.expedition.rewardPotionTotal = 0;
        state.expedition.dungeonType = null;
        state.expedition.quick = false;
        state.expedition.milestonesFired = {};
        regenExpeditionDungeons(state);

        if (!state.meta || typeof state.meta !== "object") state.meta = {};
        state.meta.expeditionsCompleted =
          Math.max(0, Math.floor(state.meta.expeditionsCompleted || 0)) + 1;
        bumpSessionExpedition(state);
        noteExpeditionDailyDone(state);

        addLog(wasQuick ? "远征完成（急行）" : "远征完成", true);
        if (eventCard?.title) addLog(`奇遇：${eventCard.title} — ${eventCard.blurb}`, true);
        if (typeof pushTickerEvent === "function") {
          pushTickerEvent("expedition", wasQuick ? "远征完成（急行）" : "远征完成");
        }
        if (ui) {
          ui.expeditionRewardModalOpen = true;
          ui.expeditionRewardModalData = {
            expPerMon: expAdd,
            monCount: ids.length,
            futurecoin: coinAdd + eventBonus,
            potions: potMap,
            masterball: masterballAdd,
            eventCard,
            seasonRelic,
            mapFragment,
            quick: wasQuick,
          };
          ui.functionsDirty = true;
          ui.futureDirty = true;
          ui.overlaysDirty = true;
        }
        if (ui.activeTab === "mons") markMonsDirty();
      }
    }

    if (state.training && typeof state.training === "object") {
      const before = Array.isArray(state.training.activeIds) ? state.training.activeIds : [];
      const alive = aliveSet ?? new Set();
      const after = before.filter((id) => alive.has(id));
      if (after.length !== before.length) {
        state.training.activeIds = after;
        if (ui) ui.functionsDirty = true;
      }
    }

    if (state.expedition && typeof state.expedition === "object") {
      const alive = aliveSet ?? new Set();
      const sel0 = Array.isArray(state.expedition.selectedIds) ? state.expedition.selectedIds : [];
      const act0 = Array.isArray(state.expedition.activeIds) ? state.expedition.activeIds : [];
      const sel1 = sel0.filter((id) => alive.has(id));
      const act1 = act0.filter((id) => alive.has(id));
      if (sel1.length !== sel0.length) state.expedition.selectedIds = sel1;
      if (act1.length !== act0.length) state.expedition.activeIds = act1;
    }

    const ecoStep = advanceEcoSandbox(state, dtSec);
    if (ecoStep.newlyCompleted.length > 0) {
      addLog(`秘境生态沙盘：${ecoStep.newlyCompleted.length} 处生态区勘探圆满，可前往育灵中枢收取心性调律薄荷与遗物！`, true);
      if (ui) ui.functionsDirty = true;
    }

    const dockStep = advanceWishDock(state, dtSec);
    if (dockStep.newlyCompleted.length > 0) {
      addLog(`星海漂流瓶心愿码头：${dockStep.newlyCompleted.length} 条拾贝航线满载归港，快去功能页收取漂流瓶、拆读心愿回信！`, true);
      if (ui) ui.functionsDirty = true;
    }

    // ML-10 月光夜行生态观察站：按本地时段（夜观 / 暮光微光）记录夜行萌灵出没
    const nightStep = advanceNightObservatory(state, dtSec);
    if (nightStep.newDiscoveries.length > 0) {
      addLog(
        `月光夜行生态观察站：观察日记新增 ${nightStep.newDiscoveries.map((s) => `「${s.creatureName}」`).join("、")}，快去功能页翻阅夜行萌灵记录！`,
        true,
      );
    }
    if (nightStep.sightings.length > 0 || nightStep.phaseChanged) {
      if (ui) ui.functionsDirty = true;
    }
    if (nightStep.mapFragments > 0) addLog(`月光夜行生态观察站：观察员在草丛里拾到藏宝图残片 +${nightStep.mapFragments}`);

    // ML-11 云顶浮空岛建造：建造伙伴按工期推进开放中的工地（无人派工则停工；进度条由功能页局部刷新）
    const islandStep = advanceSkyIsland(state, dtSec);
    if (islandStep.completed) {
      addLog(`云顶浮空岛：${islandStep.completed.logLine.replace(/^【云顶浮岛】/, "")}`, true);
      if (ui) {
        ui.functionsDirty = true;
        ui.monsDirty = true;
      }
    }

    // ML-12 寻宝地图远航：寻宝船队按航程推进，抵达后切换为登岛探索（进度条由功能页局部刷新）
    const voyageStep = advanceTreasureVoyage(state, dtSec);
    if (voyageStep.arrived) {
      addLog(`寻宝地图远航：船队抵达「${voyageStep.islandName}」，快去功能页一格一格探索宝岛！`, true);
      if (ui) ui.functionsDirty = true;
    }

    // ML-13 温泉疗愈乡：每座有人泡汤的汤池每 30 分钟完成一轮疗愈（续上限时状态 + 亲密成长），限时状态随时间流逝（离线补算 ≤12h）
    const springStep = advanceHotSpring(state, dtSec);
    if (springStep.rounds > 0 || springStep.expiredStates.length > 0 || springStep.unlockedPools.length > 0) {
      if (springStep.unlockedPools.length > 0) addLog(`温泉疗愈乡：累计疗愈轮数达标，新汤池开放泡汤了！`, true);
      if (ui) ui.functionsDirty = true;
      if (springStep.affectionGained > 0 && ui?.activeTab === "mons") markMonsDirty();
    }

    // ML-13 萌灵邮局信使网络：邮筒每 20 分钟收到 1 封待寄信件，外出信使沿邮路往返（进度条由功能页局部刷新）
    const postStep = advancePostOffice(state, dtSec);
    if (postStep.arrived.length > 0) {
      addLog(`萌灵邮局：${postStep.arrived.map((a) => `${a.monName}（${a.regionName}）`).join("、")} 带着回信回来了，快去功能页拆信、盖邮戳！`, true);
      if (ui) ui.functionsDirty = true;
    }
    if (postStep.lettersAdded > 0 && ui) ui.functionsDirty = true;

    // ML-14 梦境绘本馆：入梦伙伴按灵感速度写绘本，攒满一章收进一张插页（灵感条由功能页局部刷新，离线补算 ≤12h）
    const dreamStep = advanceDreamLibrary(state, dtSec, { addRes, addExpToMon });
    if (dreamStep.chapters.length > 0) {
      const newPages = dreamStep.chapters.filter((c) => c.newPage).length;
      const doneBooks = dreamStep.chapters.filter((c) => c.bookComplete).map((c) => c.bookId);
      addLog(
        `梦境绘本馆：伙伴们在梦里写完 ${dreamStep.chapters.length} 章童话${newPages ? `，收进 ${newPages} 张绘本插页` : ""}${doneBooks.length ? "，有一本绘本全部写完了！" : ""}`,
        true,
      );
      if (ui) ui.functionsDirty = true;
      if (ui?.activeTab === "mons") markMonsDirty();
    }

    // ML-14 溪畔钓鱼会：每 15 分钟钓手们按当时开放的溪段各抛一竿，钓获进鱼篓并登记图鉴（离线补算 ≤12h）
    const fishingStep = advanceFishingClub(state, dtSec, { randFloat });
    if (fishingStep.caught.length > 0 || fishingStep.casts > 0) {
      if (fishingStep.newSpecies.length > 0) {
        addLog(`溪畔钓鱼会：钓获图鉴新登记 ${fishingStep.newSpecies.map((id) => `「${getFishingFishDef(id)?.name || id}」`).join("、")}！`, true);
      }
      if (fishingStep.newTier > 0) addLog("溪畔钓鱼会：钓鱼会奖杯升级了，快去功能页看看！", true);
      if (ui) ui.functionsDirty = true;
    }

    // ML-15 云朵甜点烘焙坊：揉面 → 烘烤 → 装饰三道工序按工位速度推进，出炉进甜点柜；限时增益按真实流逝倒数（离线补算 ≤12h）
    const bakeryStep = advanceBakery(state, dtSec, { addRes, addExpToMon, nowMs: Date.now() });
    if (bakeryStep.batches.length > 0) {
      const newRecipes = bakeryStep.batches.filter((b) => b.newRecipe).map((b) => `「${getBakeryRecipeDef(b.recipeId)?.name || b.recipeId}」`);
      addLog(
        `云朵甜点烘焙坊：${bakeryStep.batches.length} 炉甜点出炉放进了甜点柜${newRecipes.length ? `，食谱图鉴新收录 ${newRecipes.join("、")}` : ""}${bakeryStep.caseFull ? "（甜点柜满了，记得享用或装盒）" : ""}`,
        newRecipes.length > 0,
      );
      if (ui) ui.functionsDirty = true;
      if (ui?.activeTab === "mons") markMonsDirty();
    }
    if (bakeryStep.expiredBuffs.length > 0) {
      addLog(`云朵甜点烘焙坊：${bakeryStep.expiredBuffs.map((id) => `「${getBakeryBuffDef(id)?.name || id}」`).join("、")}增益结束了，再享用一份甜点就能续上`);
      if (ui) ui.functionsDirty = true;
    }

    // ML-15 彩虹气球旅行：飞行中的气球按航程推进，降落后带回纪念品等待收取（目的地起飞时锁定，离线补算 ≤12h）
    const balloonStep = advanceBalloonTravel(state, dtSec, { randFloat });
    if (balloonStep.landed.length > 0) {
      addLog(
        `彩虹气球旅行：${balloonStep.landed.map((l) => `${l.idx + 1} 号气球从「${getBalloonIsleDef(l.isleId)?.name || l.isleId}」带回 ${l.haul.length} 件纪念品`).join("；")}，去功能页收取吧！`,
        true,
      );
      if (ui) ui.functionsDirty = true;
    }
    if (balloonStep.cancelled > 0 && ui) ui.functionsDirty = true;

    // ML-16 云端游乐园：有人值班的设施按操作员速度一轮接一轮地转，游客换门票、满意度在两轮之间连续回落；限时增益按真实流逝倒数（离线补算 ≤12h）
    const parkStep = advanceCloudPark(state, dtSec, { addRes, addExpToMon, nowMs: Date.now() });
    if (parkStep.rounds.length > 0) {
      if (offline || parkStep.rounds.length >= 6) {
        addLog(`云端游乐园：设施们转了 ${parkStep.rounds.length} 轮，接待游客 ${parkStep.visitors} 位，门票 +${parkStep.ticketsAdded}${parkStep.ticketsLost ? `（售票亭满了，流失 ${parkStep.ticketsLost} 张）` : ""}`);
      }
      if (parkStep.newStars > 0) addLog(`云端游乐园：累计游客达标，游乐园升为 ${"★".repeat(parkStep.newStars)}「${getParkTitle(parkStep.newStars)}」！`, true);
      for (const rid of parkStep.unlockedRides) addLog(`云端游乐园：「${getParkRideDef(rid)?.name || rid}」建好了，快去功能页请伙伴来值班！`, true);
      if (parkStep.ticketsFull) addLog("云端游乐园：售票亭的门票攒满了，办一场游园活动或兑换礼包吧");
      if (ui) ui.functionsDirty = true;
      if (ui?.activeTab === "mons") markMonsDirty();
    }
    if (parkStep.expiredBuffs.length > 0) {
      addLog(`云端游乐园：${parkStep.expiredBuffs.map((id) => `「${getParkEventDef(id)?.name || id}」`).join("、")}散场了，再办一场游园活动就能续上`);
      if (ui) ui.functionsDirty = true;
    }

    // ML-16 星空露营观测：夜营中的营地按时长推进，天亮归营后带回观测记录等待收取（星空与流星雨在出发时锁定，离线补算 ≤12h）
    const stargazeStep = advanceStargazeCamp(state, dtSec, { randFloat });
    if (stargazeStep.returned.length > 0) {
      addLog(
        `星空露营观测：${stargazeStep.returned
          .map((r) => `「${getStargazeSiteDef(r.siteId)?.name || r.siteId}」记下 ${r.haul.length} 条观测记录${r.meteors ? `（含 ${getStargazeShowerDef(state.meta?.stargazeCamp?.sites?.[r.idx]?.trip?.showerId)?.name || "流星"}）` : ""}`)
          .join("；")}，去功能页收取吧！`,
        true,
      );
      if (ui) ui.functionsDirty = true;
    }
    if (stargazeStep.cancelled > 0 && ui) ui.functionsDirty = true;

    // ML-17 冰晶溜冰场：排练按时长推进，演出结束后评分待领取；限时增益按真实秒数倒数（dtSec 为秒，离线补算 ≤12h）
    const rinkStep = advanceIceRink(state, dtSec, {});
    if (rinkStep.finished) {
      addLog(`冰晶溜冰场：「${getIceRinkProgramDef(rinkStep.finished.programId)?.name || "节目"}」演出结束，评分 ${rinkStep.finished.score} 分（${rinkStep.finished.grade} 级），去功能页领取评分吧！`, true);
      if (ui) ui.functionsDirty = true;
    }
    if (rinkStep.expiredBuffs.length > 0) {
      addLog(`冰晶溜冰场：${rinkStep.expiredBuffs.map((k) => ICE_RINK_BUFF_ZH[k] || k).join("、")}限时增益结束了，再排一场节目就能续上`);
      if (ui) ui.functionsDirty = true;
    }
    if (rinkStep.cancelled && ui) ui.functionsDirty = true;

    // ML-17 花田蜜蜂工坊：照料中的蜂箱按时长推进，完成后蜂蜜等待收取（花种在出发时锁定，离线补算 ≤12h）
    const beeStep = advanceBeeWorkshop(state, dtSec, { randFloat });
    if (beeStep.done.length > 0) {
      addLog(
        `花田蜜蜂工坊：${beeStep.done.map((r) => `「${getBeeHiveDef(r.hiveId)?.name || r.hiveId}」酿好 ${r.jars} 罐${getBeeFlowerDef(r.flowerId)?.honey || "蜂蜜"}`).join("；")}，去功能页收取吧！`,
        true,
      );
      if (ui) ui.functionsDirty = true;
    }
    if (beeStep.cancelled > 0 && ui) ui.functionsDirty = true;

    // ML-16「一键收取已归来伙伴」提示：已归来 / 已降落 / 已完成但还没收取的外出单位变多时提醒一次（读统一外出登记表）
    const returnedNow = getAwayReturnedUnits(state).length;
    if (ui) {
      const prevReturned = typeof ui.awayReturnedCount === "number" ? ui.awayReturnedCount : 0;
      if (returnedNow > prevReturned) {
        addLog(`外出归来：有 ${returnedNow} 处外出的伙伴已归来待收取，去功能页点「一键收取已归来伙伴」吧`, true);
        ui.functionsDirty = true;
      } else if (returnedNow !== prevReturned) {
        ui.functionsDirty = true;
      }
      ui.awayReturnedCount = returnedNow;
    }

    // ML-11 季节迁徙候鸟萌灵：驻留候鸟按本地季节写观察记录 / 迁徙纪念章 / 偶尔结伴入队
    const migrationStep = advanceSeasonMigration(state, dtSec, { createMonInstance, getSpeciesByPid, randFloat });
    if (migrationStep.befriended.length > 0) {
      addLog(`季节迁徙：${migrationStep.befriended.map((b) => `「${b.name}」`).join("、")} 决定结伴留在浮岛，已加入伙伴队伍！`, true);
      if (ui) ui.dexDirty = true;
      markMonsDirty();
    }
    if (migrationStep.medals.length > 0) {
      addLog(`季节迁徙：本季观察记录达标，迁徙纪念章升至「${["", "铜羽", "银羽", "金羽"][Math.max(...migrationStep.medals)] || "铜羽"}」！`, true);
    }
    if (migrationStep.records.length > 0 || migrationStep.rolledOver) {
      if (ui) ui.functionsDirty = true;
    }

    const campStep = advanceStarCamp(state, dtSec);
    if (campStep.leveledUp || campStep.forageCycles > 0 || campStep.expiredFeasts.length > 0) {
      if (campStep.leveledUp) {
        addLog(`星界露营野餐屋升级至 Lv.${state.meta?.starCamp?.level || 1}！营火共鸣与采集效率进一步提升`, true);
      }
      if (ui) ui.functionsDirty = true;
    }
    if (campStep.affectionChanged && ui?.activeTab === "mons") {
      markMonsDirty();
    }

    for (const rid of Object.keys(state.res)) {
      const def = defs.resources[rid];
      if (def && def.noCap) continue;
      state.res[rid].value = clamp(state.res[rid].value, 0, state.res[rid].cap);
    }
  };
}
