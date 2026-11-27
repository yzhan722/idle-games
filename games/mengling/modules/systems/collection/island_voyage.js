// collection/island_voyage.js — ML-11 云顶浮空岛 · ML-12 寻宝地图远航（由 collection_fun.js 原样拆出，对外仍从 ../collection_fun.js 引用）

import {
  getEcoSandboxBusyIds,
  getNonSandboxBusyIds,
  localYmdForSandbox,
  normalizeIdList,
  resolveMonTypesForEco,
} from "./camp.js";
import { addResDirect } from "./dock_observatory.js";

// ============================================================================
// ML-11 「云顶浮空岛建造」(Cloudtop Sky Island Construction)
// 5 座浮岛设施（Lv.0~5）：消耗灵果 / 灵木 / 灵晶碎片 / 未来币开工，再由 ≤3 只建造伙伴推进工期（无人派工则停工）。
// 设施等级接入真实公式：全产（production）、捕获（effects）、灵蛋孵化速度（tick 蛋计时）、育灵闪光与破壳亲密（breeding）、
// 候鸟栖枝承载与驻留观察速度（季节迁徙）。派工中的伙伴接入 busyMonIds 防放生锁（与 ML-9 / ML-10 同一套路）。
// ============================================================================

export const SKY_ISLAND_MAX_LEVEL = 5;
export const SKY_ISLAND_MAX_CREW = 3;
export const SKY_ISLAND_MAX_CATCHUP_SEC = 12 * 3600;
export const SKY_ISLAND_COST_GROWTH = 1.55;
export const SKY_ISLAND_RALLY_SEC = 900;
export const SKY_ISLAND_FREE_RALLY_PER_DAY = 1;
export const SKY_ISLAND_RALLY_COIN_COST = 20;
export const SKY_ISLAND_LOG_KEEP = 6;
/** 建造契合属性：派工伙伴拥有其一即提升工期推进速度（岩系垒石、火系锻铆、电系驱动、风系托举浮岛）。 */
export const SKY_ISLAND_BUILD_AFFINE_TYPES = Object.freeze(["stone", "fire", "electric", "wind"]);
const SKY_ISLAND_CREW_BASE = Object.freeze([0, 1, 1.6, 2.1]);
/** 浮岛共鸣：设施总等级达到 10 / 25 时额外全产与孵化加成。 */
export const SKY_ISLAND_RESONANCE_TIERS = Object.freeze([
  { tier: 1, minTotal: 10, name: "霞光浮城共鸣", prodAdd: 0.02, hatchSpeedAdd: 0 },
  { tier: 2, minTotal: 25, name: "天穹圣岛共鸣", prodAdd: 0.02, hatchSpeedAdd: 0.05 },
]);

export const SKY_ISLAND_FACILITY_DEFS = Object.freeze([
  {
    id: "cloudField",
    name: "云海灵田",
    icon: "skyIsland",
    baseCost: Object.freeze({ catnip: 120, wood: 60, futurecoin: 20 }),
    baseSec: 900,
    requires: null,
    perLevel: Object.freeze({ prodAdd: 0.015 }),
    desc: "在浮岛云海边开垦灵田，云雾浇灌出的灵果整片都在发光。",
  },
  {
    id: "starHammer",
    name: "浮岛星锤工坊",
    icon: "buildHammer",
    baseCost: Object.freeze({ wood: 90, minerals: 50, futurecoin: 25 }),
    baseSec: 900,
    requires: null,
    perLevel: Object.freeze({ prodAdd: 0.008, catchAdd: 0.005, buildSpeedAdd: 0.06 }),
    desc: "叮叮当当的星锤工坊：替整座浮岛打造工具，后续每一次开工都更快。",
  },
  {
    id: "hatchNest",
    name: "暖云孵化巢",
    icon: "hatchAura",
    baseCost: Object.freeze({ wood: 80, minerals: 70, futurecoin: 35 }),
    baseSec: 1080,
    requires: Object.freeze({ cloudField: 1 }),
    perLevel: Object.freeze({ hatchSpeedAdd: 0.08 }),
    desc: "用晒暖的云絮铺成的灵蛋温床，育灵屋里的灵蛋会更快破壳。",
  },
  {
    id: "migrantPerch",
    name: "候鸟云巢栖枝",
    icon: "migratingBird",
    baseCost: Object.freeze({ wood: 100, catnip: 80, futurecoin: 30 }),
    baseSec: 990,
    requires: Object.freeze({ starHammer: 1 }),
    perLevel: Object.freeze({ migrationSpeedAdd: 0.1, befriendAdd: 0.006 }),
    desc: "高高的云端栖枝，季节迁徙的候鸟萌灵会在这里落脚驻留。",
  },
  {
    id: "rainbowSpring",
    name: "虹泉育灵池",
    icon: "hatchAura",
    baseCost: Object.freeze({ minerals: 110, catnip: 100, futurecoin: 50 }),
    baseSec: 1170,
    requires: Object.freeze({ hatchNest: 2 }),
    perLevel: Object.freeze({ breedShinyAdd: 0.04, hatchAffectionAdd: 2 }),
    desc: "雨后挂着彩虹的温泉池，泡过的灵蛋更亲人，偶尔还会透出闪光。",
  },
]);

const SKY_ISLAND_TITLES = Object.freeze([
  { minTotal: 25, name: "天穹圣岛" },
  { minTotal: 18, name: "云顶仙境" },
  { minTotal: 10, name: "霞光浮城" },
  { minTotal: 5, name: "云田小镇" },
  { minTotal: 1, name: "初垦浮岛" },
  { minTotal: 0, name: "荒芜浮礁" },
]);

export const SKY_ISLAND_RES_ZH = Object.freeze({ catnip: "灵果", wood: "灵木", minerals: "灵晶碎片", futurecoin: "未来币" });

export function getSkyIslandFacilityDef(facilityId) {
  return SKY_ISLAND_FACILITY_DEFS.find((f) => f.id === facilityId) || null;
}

/** Resource cost to build `facilityId` up to `targetLevel` (base × 1.55^(Lv-1), rounded to 5). */
export function getSkyIslandUpgradeCost(facilityId, targetLevel) {
  const def = getSkyIslandFacilityDef(facilityId);
  const lv = Math.max(1, Math.min(SKY_ISLAND_MAX_LEVEL, Math.floor(Number(targetLevel) || 1)));
  if (!def) return {};
  const mul = Math.pow(SKY_ISLAND_COST_GROWTH, lv - 1);
  const out = {};
  for (const [rid, base] of Object.entries(def.baseCost)) out[rid] = Math.max(5, Math.round((base * mul) / 5) * 5);
  return out;
}

/** Work needed (seconds at crew speed ×1.00) to raise a facility to `targetLevel`: baseSec × Lv. */
export function getSkyIslandBuildSec(facilityId, targetLevel) {
  const def = getSkyIslandFacilityDef(facilityId);
  const lv = Math.max(1, Math.min(SKY_ISLAND_MAX_LEVEL, Math.floor(Number(targetLevel) || 1)));
  return def ? def.baseSec * lv : 900 * lv;
}

function readSkyIslandLevels(raw) {
  const levels = {};
  const src = raw && typeof raw === "object" && raw.levels && typeof raw.levels === "object" ? raw.levels : {};
  for (const f of SKY_ISLAND_FACILITY_DEFS) {
    levels[f.id] = Math.max(0, Math.min(SKY_ISLAND_MAX_LEVEL, Math.floor(Number(src[f.id]) || 0)));
  }
  return levels;
}

export function ensureSkyIslandState(state) {
  if (!state || typeof state !== "object") return null;
  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  const raw = state.meta.skyIsland && typeof state.meta.skyIsland === "object" ? state.meta.skyIsland : {};
  const monList = Array.isArray(state?.mons?.list) ? state.mons.list : null;
  const aliveSet = monList
    ? new Set(
        monList
          .map((m) => (m && typeof m.id === "number" && Number.isFinite(m.id) ? Math.floor(m.id) : null))
          .filter((x) => x !== null && x > 0),
      )
    : null;
  const levels = readSkyIslandLevels(raw);
  const crewIds = normalizeIdList(raw.crewIds, SKY_ISLAND_MAX_CREW, aliveSet);

  let build = null;
  const rb = raw.build && typeof raw.build === "object" ? raw.build : null;
  const rbDef = rb ? getSkyIslandFacilityDef(rb.facilityId) : null;
  if (rb && rbDef) {
    const targetLevel = Math.floor(Number(rb.targetLevel) || 0);
    if (targetLevel === levels[rbDef.id] + 1 && targetLevel <= SKY_ISLAND_MAX_LEVEL) {
      const needSec = getSkyIslandBuildSec(rbDef.id, targetLevel);
      const prog = Number(rb.progressSec);
      const cost = {};
      if (rb.cost && typeof rb.cost === "object") {
        for (const [rid, v] of Object.entries(rb.cost)) {
          const n = Math.max(0, Math.floor(Number(v) || 0));
          if (SKY_ISLAND_RES_ZH[rid] && n > 0) cost[rid] = n;
        }
      }
      build = {
        facilityId: rbDef.id,
        targetLevel,
        needSec,
        progressSec: Number.isFinite(prog) && prog > 0 ? Math.min(needSec - 0.001, prog) : 0,
        startedAt: typeof rb.startedAt === "number" && Number.isFinite(rb.startedAt) ? rb.startedAt : 0,
        cost,
      };
    }
  }

  const crewWork = {};
  if (raw.crewWork && typeof raw.crewWork === "object") {
    for (const [k, v] of Object.entries(raw.crewWork)) {
      const id = Math.floor(Number(k) || 0);
      const sec = Math.max(0, Math.min(1e8, Math.floor(Number(v) || 0)));
      if (id > 0 && sec > 0 && (!aliveSet || aliveSet.has(id))) crewWork[String(id)] = sec;
    }
  }
  const recentLogs = Array.isArray(raw.recentLogs)
    ? raw.recentLogs.filter((s) => typeof s === "string" && s.trim().length > 0).slice(0, SKY_ISLAND_LOG_KEEP)
    : [];

  const clean = {
    initialized: true,
    levels,
    crewIds,
    build,
    crewWork,
    rallyDate: typeof raw.rallyDate === "string" ? raw.rallyDate : "",
    rallyUsed: Math.max(0, Math.floor(Number(raw.rallyUsed) || 0)),
    totalBuilt: Math.max(0, Math.floor(Number(raw.totalBuilt) || 0)),
    totalWorkSec: Math.max(0, Math.floor(Number(raw.totalWorkSec) || 0)),
    recentLogs,
  };
  if (state.meta.skyIsland && typeof state.meta.skyIsland === "object") {
    Object.assign(state.meta.skyIsland, clean);
    return state.meta.skyIsland;
  }
  state.meta.skyIsland = clean;
  return clean;
}

/** Non-mutating read: partner IDs on the sky-island construction crew — protected in busyMonIds. */
export function getSkyIslandCrewMonIds(state) {
  const ids = new Set();
  const raw = state?.meta?.skyIsland?.crewIds;
  if (!Array.isArray(raw)) return ids;
  const monList = Array.isArray(state?.mons?.list) ? state.mons.list : null;
  const validSet = monList
    ? new Set(monList.filter((m) => m && typeof m.id === "number").map((m) => Math.floor(m.id)))
    : null;
  for (const v of raw) {
    const id = Math.floor(Number(v) || 0);
    if (id > 0 && (!validSet || validSet.has(id))) ids.add(id);
    if (ids.size >= SKY_ISLAND_MAX_CREW) break;
  }
  return ids;
}

/** Idle partners eligible for the crew: not training/expedition/PvE/breeding/camp/eco-sandbox/dock/observatory or already on the crew. */
export function getIdleSkyIslandCandidates(state) {
  const list = Array.isArray(state?.mons?.list) ? state.mons.list.filter(Boolean) : [];
  const extBusy = getNonSandboxBusyIds(state);
  const ecoBusy = getEcoSandboxBusyIds(state);
  return list.filter((m) => m && typeof m.id === "number" && !extBusy.has(m.id) && !ecoBusy.has(m.id));
}

function skyIslandCrewMons(state) {
  const list = Array.isArray(state?.mons?.list) ? state.mons.list : [];
  return Array.from(getSkyIslandCrewMonIds(state))
    .map((id) => list.find((m) => m && m.id === id) || null)
    .filter(Boolean);
}

/**
 * Crew build speed: 1 / 2 / 3 helpers → ×1.0 / ×1.6 / ×2.1, +0.12 per build-affine helper (岩/火/电/风),
 * + avg level / 300 (≤ +0.30); the whole sum is boosted by the 星锤工坊 (+6% per level). No crew → 0 (site paused).
 */
export function evaluateSkyIslandCrew(crewMons = [], state = null, opts = {}) {
  const mons = (Array.isArray(crewMons) ? crewMons.filter(Boolean) : []).slice(0, SKY_ISLAND_MAX_CREW);
  const affine = new Set(SKY_ISLAND_BUILD_AFFINE_TYPES);
  let affineCount = 0;
  let lvlSum = 0;
  for (const m of mons) {
    if (resolveMonTypesForEco(m, opts).some((t) => affine.has(t))) affineCount += 1;
    lvlSum += Math.max(1, Math.min(100, Math.floor(Number(m.lvl) || 1)));
  }
  const avgLvl = mons.length ? lvlSum / mons.length : 0;
  const lvlBonus = mons.length ? Math.min(0.3, avgLvl / 300) : 0;
  const workshopLv = readSkyIslandLevels(state?.meta?.skyIsland).starHammer || 0;
  const workshopAdd = workshopLv * (getSkyIslandFacilityDef("starHammer").perLevel.buildSpeedAdd || 0);
  const raw = mons.length ? (SKY_ISLAND_CREW_BASE[mons.length] + affineCount * 0.12 + lvlBonus) * (1 + workshopAdd) : 0;
  return {
    crewCount: mons.length,
    affineCount,
    avgLvl: Math.round(avgLvl * 10) / 10,
    lvlBonus: Math.round(lvlBonus * 100) / 100,
    workshopAdd: Math.round(workshopAdd * 100) / 100,
    speedMul: Math.round(raw * 100) / 100,
  };
}

function scoreMonForSkyIsland(mon, opts = {}) {
  if (!mon) return -1;
  const affine = new Set(SKY_ISLAND_BUILD_AFFINE_TYPES);
  const hits = resolveMonTypesForEco(mon, opts).filter((t) => affine.has(t)).length;
  const lvl = Math.max(1, Math.floor(Number(mon.lvl) || 1));
  return (hits > 0 ? 1000 : 0) + lvl * 5 + Math.max(0, Math.floor(Number(mon.stars) || 0)) * 10;
}

export function toggleSkyIslandCrewMon(state, monId) {
  const isl = ensureSkyIslandState(state);
  if (!isl) return { ok: false, reason: "invalid_state" };
  const id = Math.floor(Number(monId) || 0);
  if (id <= 0) return { ok: false, reason: "invalid_mon" };
  if (isl.crewIds.includes(id)) {
    isl.crewIds = isl.crewIds.filter((x) => x !== id);
    return { ok: true, assigned: false, crewIds: isl.crewIds.slice() };
  }
  if (isl.crewIds.length >= SKY_ISLAND_MAX_CREW) return { ok: false, reason: "crew_full" };
  const idle = new Set(getIdleSkyIslandCandidates(state).map((m) => m.id));
  if (!idle.has(id)) return { ok: false, reason: "mon_busy" };
  isl.crewIds.push(id);
  return { ok: true, assigned: true, crewIds: isl.crewIds.slice() };
}

/** Fills empty crew seats with the best idle builders (build-affine first, then level). Keeps the current crew. */
export function autoFillSkyIslandCrew(state, opts = {}) {
  const isl = ensureSkyIslandState(state);
  if (!isl) return { ok: false, added: [] };
  const free = SKY_ISLAND_MAX_CREW - isl.crewIds.length;
  if (free <= 0) return { ok: false, reason: "crew_full", added: [] };
  const picked = getIdleSkyIslandCandidates(state)
    .slice()
    .sort((a, b) => scoreMonForSkyIsland(b, opts) - scoreMonForSkyIsland(a, opts) || (a.id || 0) - (b.id || 0))
    .slice(0, free)
    .map((m) => m.id);
  isl.crewIds = [...isl.crewIds, ...picked];
  return { ok: picked.length > 0, reason: picked.length ? "" : "no_idle_mons", added: picked, crewIds: isl.crewIds.slice() };
}

/** Recalls one helper (monId) or the whole crew (monId == null). Construction progress is kept (site pauses). */
export function recallSkyIslandCrew(state, monId = null) {
  const isl = ensureSkyIslandState(state);
  if (!isl) return { ok: false, recalled: 0 };
  const before = isl.crewIds.length;
  if (monId == null) isl.crewIds = [];
  else {
    const id = Math.floor(Number(monId) || 0);
    isl.crewIds = isl.crewIds.filter((x) => x !== id);
  }
  return { ok: before !== isl.crewIds.length, recalled: before - isl.crewIds.length };
}

/** Forced release: drops the partner's crew seat and work tally. */
export function detachSkyIslandMon(state, monId) {
  const isl = state?.meta?.skyIsland;
  const id = Math.floor(Number(monId) || 0);
  if (!isl || typeof isl !== "object" || id <= 0) return { ok: false, detached: false };
  let detached = false;
  if (Array.isArray(isl.crewIds) && isl.crewIds.includes(id)) {
    isl.crewIds = isl.crewIds.filter((x) => x !== id);
    detached = true;
  }
  if (isl.crewWork && typeof isl.crewWork === "object" && isl.crewWork[String(id)]) {
    delete isl.crewWork[String(id)];
    detached = true;
  }
  return { ok: true, detached };
}

/** Whether `facilityId` can start its next level now: level cap, prerequisites, one site at a time, resources. */
export function canStartSkyIslandBuild(state, facilityId) {
  const def = getSkyIslandFacilityDef(facilityId);
  if (!def) return { ok: false, reason: "unknown_facility" };
  const levels = readSkyIslandLevels(state?.meta?.skyIsland);
  const cur = levels[def.id] || 0;
  if (cur >= SKY_ISLAND_MAX_LEVEL) return { ok: false, reason: "max_level", currentLevel: cur };
  const targetLevel = cur + 1;
  const cost = getSkyIslandUpgradeCost(def.id, targetLevel);
  const needSec = getSkyIslandBuildSec(def.id, targetLevel);
  const base = { currentLevel: cur, targetLevel, cost, needSec };
  if (def.requires) {
    for (const [rid, need] of Object.entries(def.requires)) {
      if ((levels[rid] || 0) < need) return { ok: false, reason: "locked", requires: { facilityId: rid, level: need }, ...base };
    }
  }
  if (state?.meta?.skyIsland?.build) return { ok: false, reason: "site_busy", ...base };
  const missing = {};
  for (const [rid, need] of Object.entries(cost)) {
    const have = Math.max(0, Math.floor(Number(state?.res?.[rid]?.value) || 0));
    if (have < need) missing[rid] = need - have;
  }
  if (Object.keys(missing).length) return { ok: false, reason: "insufficient_resources", missing, ...base };
  return { ok: true, reason: "", ...base };
}

/** Pays the cost and opens the construction site for the facility's next level (the crew then pushes the work). */
export function startSkyIslandBuild(state, facilityId, opts = {}) {
  const isl = ensureSkyIslandState(state);
  if (!isl) return { ok: false, reason: "invalid_state" };
  const chk = canStartSkyIslandBuild(state, facilityId);
  if (!chk.ok) return chk;
  for (const [rid, need] of Object.entries(chk.cost)) {
    state.res[rid].value = Math.max(0, (Number(state.res[rid].value) || 0) - need);
  }
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const def = getSkyIslandFacilityDef(facilityId);
  isl.build = { facilityId: def.id, targetLevel: chk.targetLevel, needSec: chk.needSec, progressSec: 0, startedAt: nowMs, cost: { ...chk.cost } };
  const logLine = `【云顶浮岛】「${def.name}」Lv.${chk.targetLevel} 开工：${Object.entries(chk.cost)
    .map(([rid, n]) => `${SKY_ISLAND_RES_ZH[rid] || rid} ×${n}`)
    .join("、")}${isl.crewIds.length ? "" : "（还没有建造伙伴，派工后才会推进工期）"}`;
  isl.recentLogs = [logLine, ...(isl.recentLogs || [])].slice(0, SKY_ISLAND_LOG_KEEP);
  return { ok: true, facilityId: def.id, targetLevel: chk.targetLevel, needSec: chk.needSec, cost: chk.cost, logLine };
}

/** Cancels the open site and refunds the paid materials in full (capped by storage). Progress is lost. */
export function cancelSkyIslandBuild(state, opts = {}) {
  const isl = ensureSkyIslandState(state);
  if (!isl || !isl.build) return { ok: false, reason: "no_build" };
  const b = isl.build;
  const refunded = {};
  for (const [rid, n] of Object.entries(b.cost || {})) {
    const before = Math.max(0, Number(state.res?.[rid]?.value) || 0);
    addResDirect(state, rid, n, opts);
    refunded[rid] = Math.max(0, Math.round((Number(state.res?.[rid]?.value) || 0) - before));
  }
  isl.build = null;
  const def = getSkyIslandFacilityDef(b.facilityId);
  const logLine = `【云顶浮岛】取消「${def?.name || b.facilityId}」Lv.${b.targetLevel} 工程，材料已退回`;
  isl.recentLogs = [logLine, ...(isl.recentLogs || [])].slice(0, SKY_ISLAND_LOG_KEEP);
  return { ok: true, refunded, logLine };
}

function completeSkyIslandBuild(isl) {
  const b = isl.build;
  const def = getSkyIslandFacilityDef(b.facilityId);
  isl.levels[b.facilityId] = Math.min(SKY_ISLAND_MAX_LEVEL, b.targetLevel);
  isl.build = null;
  isl.totalBuilt = (isl.totalBuilt || 0) + 1;
  const logLine = `【云顶浮岛】「${def?.name || b.facilityId}」升至 Lv.${b.targetLevel}：${describeSkyIslandFacilityEffect(b.facilityId, b.targetLevel)}`;
  isl.recentLogs = [logLine, ...(isl.recentLogs || [])].slice(0, SKY_ISLAND_LOG_KEEP);
  return { facilityId: b.facilityId, name: def?.name || b.facilityId, level: b.targetLevel, logLine };
}

function pushSkyIslandWork(isl, crew, workSec) {
  if (!isl.build || workSec <= 0) return null;
  isl.build.progressSec = (Number(isl.build.progressSec) || 0) + workSec;
  isl.totalWorkSec = Math.floor((isl.totalWorkSec || 0) + workSec);
  if (!isl.crewWork || typeof isl.crewWork !== "object") isl.crewWork = {};
  const share = workSec / Math.max(1, crew.length);
  for (const m of crew) isl.crewWork[String(m.id)] = Math.floor((isl.crewWork[String(m.id)] || 0) + share);
  if (isl.build.progressSec >= isl.build.needSec - 1e-6) return completeSkyIslandBuild(isl);
  return null;
}

/**
 * Advances the open construction site by dtSec (live tick + offline catch-up, ≤12h) at the crew's speed.
 * No-op for saves without a sky island, without an open site, or without a crew (site paused).
 */
export function advanceSkyIsland(state, dtSec, opts = {}) {
  const isl = state?.meta?.skyIsland;
  const empty = { progressed: 0, completed: null, paused: false, speedMul: 0 };
  if (!isl || typeof isl !== "object" || !isl.build || typeof isl.build !== "object") return empty;
  if (!isl.levels || typeof isl.levels !== "object") isl.levels = readSkyIslandLevels(isl);
  const crew = skyIslandCrewMons(state);
  if (!crew.length) return { ...empty, paused: true };
  const step = typeof dtSec === "number" && Number.isFinite(dtSec) && dtSec > 0 ? Math.min(SKY_ISLAND_MAX_CATCHUP_SEC, dtSec) : 0;
  const speedMul = evaluateSkyIslandCrew(crew, state, opts).speedMul;
  const work = step * speedMul;
  const completed = pushSkyIslandWork(isl, crew, work);
  return { progressed: work, completed, paused: false, speedMul };
}

export function getSkyIslandRallyFreeLeft(state, nowMs = Date.now()) {
  const isl = state?.meta?.skyIsland;
  if (!isl || typeof isl !== "object") return SKY_ISLAND_FREE_RALLY_PER_DAY;
  if (isl.rallyDate !== localYmdForSandbox(nowMs)) return SKY_ISLAND_FREE_RALLY_PER_DAY;
  return Math.max(0, SKY_ISLAND_FREE_RALLY_PER_DAY - Math.floor(Number(isl.rallyUsed) || 0));
}

/** 「齐心夯土」: instantly pushes 15 minutes of work at the crew's speed — free once per local day, then futurecoin ×20. */
export function performSkyIslandRally(state, opts = {}) {
  const isl = ensureSkyIslandState(state);
  if (!isl) return { ok: false, reason: "invalid_state" };
  if (!isl.build) return { ok: false, reason: "no_build" };
  const crew = skyIslandCrewMons(state);
  if (!crew.length) return { ok: false, reason: "no_crew" };
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const today = localYmdForSandbox(nowMs);
  if (isl.rallyDate !== today) {
    isl.rallyDate = today;
    isl.rallyUsed = 0;
  }
  let costKind = "";
  if (isl.rallyUsed < SKY_ISLAND_FREE_RALLY_PER_DAY) {
    isl.rallyUsed += 1;
    costKind = "free_daily";
  } else if ((Number(state.res?.futurecoin?.value) || 0) >= SKY_ISLAND_RALLY_COIN_COST) {
    state.res.futurecoin.value = Math.max(0, Math.floor(state.res.futurecoin.value) - SKY_ISLAND_RALLY_COIN_COST);
    costKind = "futurecoin";
  } else {
    return { ok: false, reason: "insufficient_rally_cost" };
  }
  const speedMul = evaluateSkyIslandCrew(crew, state, opts).speedMul;
  const work = SKY_ISLAND_RALLY_SEC * speedMul;
  const def = getSkyIslandFacilityDef(isl.build.facilityId);
  const completed = pushSkyIslandWork(isl, crew, work);
  const logLine = `【齐心夯土】${crew.map((m) => m.name || "伙伴").join("、")} 喊着号子赶工：「${def?.name || ""}」工期推进 ${Math.round(work / 60)} 分钟${completed ? "，提前竣工！" : ""}`;
  isl.recentLogs = [logLine, ...(isl.recentLogs || [])].slice(0, SKY_ISLAND_LOG_KEEP);
  return { ok: true, costKind, workSec: work, completed, logLine };
}

function skyIslandHostCapForPerch(perchLv) {
  const lv = Math.max(0, Math.floor(Number(perchLv) || 0));
  return 1 + (lv >= 1 ? 1 : 0) + (lv >= 3 ? 1 : 0);
}

/** Human-readable effect of a facility at a given level (used by logs and the facility cards). */
export function describeSkyIslandFacilityEffect(facilityId, level) {
  const def = getSkyIslandFacilityDef(facilityId);
  const lv = Math.max(0, Math.min(SKY_ISLAND_MAX_LEVEL, Math.floor(Number(level) || 0)));
  if (!def) return "";
  const pct = (n) => `${Math.round(n * 1000) / 10}%`;
  const p = def.perLevel;
  switch (def.id) {
    case "cloudField":
      return `全资源产出 +${pct(p.prodAdd * lv)}`;
    case "starHammer":
      return `全产 +${pct(p.prodAdd * lv)} · 捕获 +${pct(p.catchAdd * lv)} · 建造速度 +${pct(p.buildSpeedAdd * lv)}`;
    case "hatchNest":
      return `灵蛋孵化速度 +${pct(p.hatchSpeedAdd * lv)}`;
    case "migrantPerch":
      return `候鸟驻留席 ${skyIslandHostCapForPerch(lv)} 席 · 驻留观察 +${pct(p.migrationSpeedAdd * lv)} · 结伴率 +${pct(p.befriendAdd * lv)}`;
    case "rainbowSpring":
      return `育灵闪光率 +${pct(p.breedShinyAdd * lv)} · 破壳亲密 +${p.hatchAffectionAdd * lv}`;
    default:
      return "";
  }
}

export function getSkyIslandTitle(totalLevel) {
  const t = Math.max(0, Math.floor(Number(totalLevel) || 0));
  return (SKY_ISLAND_TITLES.find((x) => t >= x.minTotal) || SKY_ISLAND_TITLES[SKY_ISLAND_TITLES.length - 1]).name;
}

/**
 * Pure non-mutating aggregator of the sky island's real-formula auras.
 * - prodAdd → production.finalizeProductionRates · catchAdd → effects.computeTechEffects
 * - hatchSpeedMul → tick egg countdown · breedShinyMul / hatchAffectionAdd → breeding
 * - migrantHostCap / migrationSpeedAdd / befriendAdd → seasonal migration (pve_tower)
 * Neutral (all ×1 / +0, host cap 1) for saves without a sky island.
 */
export function computeSkyIslandAura(state) {
  const raw = state?.meta?.skyIsland;
  const levels = readSkyIslandLevels(raw);
  const totalLevel = SKY_ISLAND_FACILITY_DEFS.reduce((s, f) => s + (levels[f.id] || 0), 0);
  const maxTotal = SKY_ISLAND_FACILITY_DEFS.length * SKY_ISLAND_MAX_LEVEL;
  const per = (fid, key) => (getSkyIslandFacilityDef(fid)?.perLevel?.[key] || 0) * (levels[fid] || 0);
  const resonance = SKY_ISLAND_RESONANCE_TIERS.filter((r) => totalLevel >= r.minTotal);
  const resonanceTier = resonance.length ? resonance[resonance.length - 1].tier : 0;
  const resonanceProdAdd = resonance.reduce((s, r) => s + r.prodAdd, 0);
  const resonanceHatchAdd = resonance.reduce((s, r) => s + r.hatchSpeedAdd, 0);
  const round4 = (n) => Math.round(n * 10000) / 10000;
  const prodAdd = round4(per("cloudField", "prodAdd") + per("starHammer", "prodAdd") + resonanceProdAdd);
  const catchAdd = round4(per("starHammer", "catchAdd"));
  const hatchSpeedAdd = round4(per("hatchNest", "hatchSpeedAdd") + resonanceHatchAdd);
  const breedShinyAdd = round4(per("rainbowSpring", "breedShinyAdd"));
  const hatchAffectionAdd = Math.floor(per("rainbowSpring", "hatchAffectionAdd"));
  const migrationSpeedAdd = round4(per("migrantPerch", "migrationSpeedAdd"));
  const befriendAdd = round4(per("migrantPerch", "befriendAdd"));
  const buildSpeedAdd = round4(per("starHammer", "buildSpeedAdd"));
  const crewCount = raw && typeof raw === "object" ? getSkyIslandCrewMonIds(state).size : 0;
  const build = raw && typeof raw === "object" && raw.build && typeof raw.build === "object" ? raw.build : null;
  return {
    levels,
    totalLevel,
    maxTotal,
    islandTitle: getSkyIslandTitle(totalLevel),
    resonanceTier,
    resonanceName: resonanceTier ? SKY_ISLAND_RESONANCE_TIERS[resonanceTier - 1].name : "",
    crewCount,
    building: build ? { facilityId: build.facilityId, targetLevel: build.targetLevel } : null,
    prodAdd,
    prodMul: round4(1 + prodAdd),
    catchAdd,
    hatchSpeedAdd,
    hatchSpeedMul: round4(1 + hatchSpeedAdd),
    breedShinyAdd,
    breedShinyMul: round4(1 + breedShinyAdd),
    hatchAffectionAdd,
    migrantHostCap: skyIslandHostCapForPerch(levels.migrantPerch),
    migrationSpeedAdd,
    befriendAdd,
    buildSpeedAdd,
  };
}

// ============================================================================
// ML-12 「寻宝地图远航」(Treasure Map Voyage)
// 藏宝图残片来自 3 个现有玩法：心愿码头归港（星砂浅滩 / 珊瑚月礁 ×1、深蓝星渊 ×2）、月光观察站每记录 3 次出没 ×1、
// 远征完成（初 / 中级 ×1 · 高级 / 超级 ×2 · 大师及以上 ×3）。6 片拼合 1 张藏宝图 → 选择宝岛并派 1~3 只伙伴组成寻宝船队扬帆
// （航行计时，离线补算 ≤12h）→ 登岛后在 5×5 宝岛网格上逐格探索：只能踏入与已探索格相邻的迷雾格，每步耗 1 体力，
// 流沙陷阱再扣 1，清泉 +3；金沙 / 椰林 / 漂流木 / 晶石 / 沉船宝箱 / 遗迹神龛 / 宝藏 X 各有确定性奖励。
// 网格由出航时的种子确定性生成（随机源可注入测试），奖励按（种子, 格子）确定性结算；6 件寻宝纪念品永久提供全产 / 闪光 / 捕获光环。
// 远航中的船员接入 busyMonIds 防放生锁（与 ML-9 ~ ML-11 同一套路）：放生按钮禁用、不可作升星材料、所有自动派遣均跳过，
// 强制放生会移出船队（船队清空则提前结束远航），转生召回船队。
// ============================================================================

export const TREASURE_MAP_FRAGMENTS_PER_MAP = 6;
export const TREASURE_MAP_MAX_MAPS = 5;
export const TREASURE_MAP_FRAGMENT_CAP = 99;
export const TREASURE_GRID_SIZE = 5;
export const TREASURE_GRID_CELLS = TREASURE_GRID_SIZE * TREASURE_GRID_SIZE;
export const TREASURE_START_IDX = 22;
export const TREASURE_VOYAGE_MAX_CREW = 3;
export const TREASURE_VOYAGE_MAX_CATCHUP_SEC = 12 * 3600;
export const TREASURE_SPRING_STAMINA = 3;
export const TREASURE_GULL_STAMINA = 3;
export const TREASURE_FREE_GULL_PER_DAY = 1;
export const TREASURE_GULL_COIN_COST = 20;
export const TREASURE_OBS_SIGHTINGS_PER_FRAGMENT = 3;
export const TREASURE_RETURN_EXP_PER_STEP = 30;
export const TREASURE_RETURN_COIN_PER_STEP = 2;
export const TREASURE_KEEPSAKE_DUP_COIN = 30;
export const TREASURE_LOG_KEEP = 6;
export const TREASURE_DOCK_FRAGMENTS = Object.freeze({ shoal: 1, reef: 1, trench: 2 });
export const TREASURE_EXPEDITION_FRAGMENTS = Object.freeze({
  basic: 1,
  intermediate: 1,
  advanced: 2,
  super: 2,
  master: 3,
  elite: 3,
  legend: 3,
});
export const TREASURE_FRAGMENT_SOURCES = Object.freeze([
  { id: "dock", name: "星海漂流瓶心愿码头", rule: "拾贝航线归港：星砂浅滩 / 珊瑚月礁 ×1，深蓝星渊航线 ×2" },
  { id: "observatory", name: "月光夜行生态观察站", rule: "每记录 3 次夜行萌灵出没 ×1（提灯夜巡同样计数）" },
  { id: "expedition", name: "远征", rule: "远征完成：初 / 中级 ×1，高级 / 超级 ×2，大师及以上 ×3" },
]);
/** 船员角色：领航（水 / 风）缩短航程，探路（岩 / 草）多 1 点体力，寻宝直觉（光 / 幻 / 暗）宝物 +10%。 */
export const TREASURE_NAVIGATOR_TYPES = Object.freeze(["water", "wind"]);
export const TREASURE_PATHFINDER_TYPES = Object.freeze(["stone", "grass"]);
export const TREASURE_SEEKER_TYPES = Object.freeze(["light", "mystic", "dark"]);

export const TREASURE_RES_ZH = Object.freeze({
  futurecoin: "未来币",
  catnip: "灵果",
  wood: "灵木",
  minerals: "灵晶碎片",
  shinyStarSand: "闪光祈愿星砂",
  tuningMint: "心性调律薄荷",
  driftBottle: "星海漂流瓶",
  fireflyLantern: "萤火灯笼",
  ancientGeneAmber: "远古基因琥珀",
  rareCandy: "跃级糖丸",
  mapFragment: "藏宝图残片",
});

export const TREASURE_TILE_DEFS = Object.freeze({
  beach: { name: "登岛滩头", short: "滩头", desc: "寻宝船停靠的地方" },
  sand: { name: "金沙滩", short: "金沙", desc: "沙子里埋着零星的未来币" },
  grove: { name: "椰林", short: "椰林", desc: "摇下一大串灵果" },
  driftwood: { name: "漂流木堆", short: "漂流木", desc: "可以搬回去的上好灵木" },
  ore: { name: "晶石矿脉", short: "矿脉", desc: "敲下闪闪发亮的灵晶碎片" },
  chest: { name: "沉船宝箱", short: "宝箱", desc: "被海浪冲上岸的旧宝箱" },
  relic: { name: "遗迹神龛", short: "神龛", desc: "神龛里供着一件寻宝纪念品" },
  trap: { name: "流沙陷阱", short: "流沙", desc: "陷进去要多费 1 点体力" },
  spring: { name: "清泉绿洲", short: "清泉", desc: "喝口泉水，体力 +3" },
  xmark: { name: "宝藏 X 标记", short: "宝藏", desc: "藏宝图上画着红圈的地方" },
});

export const TREASURE_KEEPSAKE_DEFS = Object.freeze([
  { id: "shellCompass", name: "贝壳指南针", island: "palmCove", source: "relic", desc: "指针是一枚小海螺，总是轻轻转向下一座宝岛。" },
  { id: "coconutChime", name: "椰壳风铃", island: "palmCove", source: "xmark", desc: "椰影珊瑚岛宝藏箱里的风铃，一摇就是整片海风。" },
  { id: "lavaGlassAnchor", name: "熔岩琉璃船锚", island: "mistVolcano", source: "relic", desc: "火山口边捡到的琉璃小锚，摸上去还有点温热。" },
  { id: "mistSpyglass", name: "雾晶望远镜", island: "mistVolcano", source: "xmark", desc: "镜片是凝住的雾晶，能看见雾后面藏着的路。" },
  { id: "starSandHourglass", name: "星沙沙漏", island: "starRuins", source: "relic", desc: "古堡里流了一千年的星沙，每次翻转都慢一点点。" },
  { id: "castleCrown", name: "古堡星冠", island: "starRuins", source: "xmark", desc: "星沙古堡最深处的宝冠——寻宝人之间流传的终点。" },
]);

export const TREASURE_ISLAND_DEFS = Object.freeze([
  {
    id: "palmCove",
    name: "椰影珊瑚岛",
    subtitle: "近海暖岛 · 椰林与沉船宝箱",
    unlockVoyages: 0,
    sailSec: 600,
    lootMul: 1,
    bonusItems: 0,
    layout: Object.freeze({ chest: 3, relic: 1, trap: 3, spring: 2, grove: 3, driftwood: 3, ore: 2 }),
    relicKeepsake: "shellCompass",
    crownKeepsake: "coconutChime",
    grand: Object.freeze({ futurecoin: 90, shinyStarSand: 1 }),
    desc: "退潮后露出的珊瑚环礁，椰林里常有被冲上岸的沉船宝箱。",
  },
  {
    id: "mistVolcano",
    name: "雾隐火山岛",
    subtitle: "雾海深处 · 晶石矿脉与流沙",
    unlockVoyages: 2,
    sailSec: 900,
    lootMul: 1.35,
    bonusItems: 0,
    layout: Object.freeze({ chest: 3, relic: 1, trap: 4, spring: 1, grove: 2, driftwood: 2, ore: 3 }),
    relicKeepsake: "lavaGlassAnchor",
    crownKeepsake: "mistSpyglass",
    grand: Object.freeze({ futurecoin: 130, shinyStarSand: 1, ancientGeneAmber: 1 }),
    desc: "终年被雾气包着的火山岛，矿脉丰富，流沙也更多。",
  },
  {
    id: "starRuins",
    name: "星沙古堡岛",
    subtitle: "远洋秘境 · 古堡遗迹与星沙宝藏",
    unlockVoyages: 5,
    sailSec: 1200,
    lootMul: 1.7,
    bonusItems: 1,
    layout: Object.freeze({ chest: 4, relic: 1, trap: 4, spring: 1, grove: 2, driftwood: 2, ore: 3 }),
    relicKeepsake: "starSandHourglass",
    crownKeepsake: "castleCrown",
    grand: Object.freeze({ futurecoin: 180, shinyStarSand: 2, tuningMint: 1 }),
    desc: "传说中的星沙古堡，只在星图对齐时浮出海面，宝箱里的东西也更多。",
  },
]);

const TREASURE_CHEST_TABLE = Object.freeze([
  { rid: "futurecoin", base: 30, scale: true, weight: 30 },
  { rid: "shinyStarSand", base: 1, weight: 12 },
  { rid: "tuningMint", base: 1, weight: 14 },
  { rid: "driftBottle", base: 2, weight: 14 },
  { rid: "fireflyLantern", base: 2, weight: 12 },
  { rid: "ancientGeneAmber", base: 1, weight: 10 },
  { rid: "rareCandy", base: 3, weight: 8 },
]);

const TREASURE_HUNTER_TITLES = Object.freeze([
  { minVoyages: 12, name: "星沙传说船长" },
  { minVoyages: 6, name: "群岛寻宝家" },
  { minVoyages: 2, name: "椰林探险家" },
  { minVoyages: 0, name: "见习寻宝人" },
]);

const TREASURE_TILE_CODES = new Set(Object.keys(TREASURE_TILE_DEFS));

export function getTreasureIslandDef(islandId) {
  return TREASURE_ISLAND_DEFS.find((d) => d.id === islandId) || null;
}

export function getTreasureKeepsakeDef(keepsakeId) {
  return TREASURE_KEEPSAKE_DEFS.find((d) => d.id === keepsakeId) || null;
}

export function getTreasureHunterTitle(totalVoyages = 0) {
  const n = Math.max(0, Math.floor(Number(totalVoyages) || 0));
  return (TREASURE_HUNTER_TITLES.find((t) => n >= t.minVoyages) || TREASURE_HUNTER_TITLES[TREASURE_HUNTER_TITLES.length - 1]).name;
}

/** Small deterministic PRNG (mulberry32) — the island layout and every tile reward derive from the voyage seed. */
function treasureRng(seed) {
  let a = Math.floor(Number(seed) || 0) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic 5×5 island layout for (islandId, seed): landing beach at the bottom centre (#22), one X treasure in the far
 * two rows, a 2×2 hint ring around it (drawn on the map), then the island's tile mix shuffled over the remaining cells.
 */
export function generateTreasureIslandGrid(islandId, seed) {
  const def = getTreasureIslandDef(islandId) || TREASURE_ISLAND_DEFS[0];
  const r = treasureRng(seed);
  const grid = new Array(TREASURE_GRID_CELLS).fill("sand");
  grid[TREASURE_START_IDX] = "beach";
  const xCol = Math.min(TREASURE_GRID_SIZE - 1, Math.floor(r() * TREASURE_GRID_SIZE));
  const xRow = Math.min(1, Math.floor(r() * 2));
  const xIdx = xRow * TREASURE_GRID_SIZE + xCol;
  grid[xIdx] = "xmark";
  const hr = Math.max(0, Math.min(TREASURE_GRID_SIZE - 2, xRow - (r() < 0.5 ? 0 : 1)));
  const hc = Math.max(0, Math.min(TREASURE_GRID_SIZE - 2, xCol - (r() < 0.5 ? 0 : 1)));
  const hintIdx = [hr * 5 + hc, hr * 5 + hc + 1, (hr + 1) * 5 + hc, (hr + 1) * 5 + hc + 1];
  const pool = [];
  for (let i = 0; i < TREASURE_GRID_CELLS; i += 1) if (i !== TREASURE_START_IDX && i !== xIdx) pool.push(i);
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(r() * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  let p = 0;
  for (const [code, n] of Object.entries(def.layout)) {
    for (let k = 0; k < n && p < pool.length; k += 1) grid[pool[p++]] = code;
  }
  return { grid, xIdx, hintIdx };
}

export function ensureMapFragmentBucket(state) {
  if (!state || typeof state !== "object") return null;
  if (!state.res || typeof state.res !== "object") state.res = {};
  if (!state.res.mapFragment || typeof state.res.mapFragment !== "object") {
    state.res.mapFragment = { value: 0, cap: TREASURE_MAP_FRAGMENT_CAP };
  }
  const b = state.res.mapFragment;
  if (typeof b.value !== "number" || !Number.isFinite(b.value)) b.value = 0;
  if (typeof b.cap !== "number" || b.cap <= 0) b.cap = TREASURE_MAP_FRAGMENT_CAP;
  return b;
}

function readTreasureResMap(src, maxPer = 99999) {
  const out = {};
  if (!src || typeof src !== "object") return out;
  for (const [rid, v] of Object.entries(src)) {
    const n = Math.max(0, Math.min(maxPer, Math.floor(Number(v) || 0)));
    if (TREASURE_RES_ZH[rid] && n > 0) out[rid] = n;
  }
  return out;
}

function normalizeTreasureVoyage(rv, aliveSet) {
  if (!rv || typeof rv !== "object") return null;
  const island = getTreasureIslandDef(rv.islandId);
  if (!island) return null;
  const crewIds = normalizeIdList(rv.crewIds, TREASURE_VOYAGE_MAX_CREW, aliveSet);
  if (!crewIds.length) return null;
  if (!Array.isArray(rv.grid) || rv.grid.length !== TREASURE_GRID_CELLS || !rv.grid.every((c) => TREASURE_TILE_CODES.has(c))) return null;
  const grid = rv.grid.slice();
  grid[TREASURE_START_IDX] = "beach";
  const revealed = Array.from({ length: TREASURE_GRID_CELLS }, (_, i) => (Array.isArray(rv.revealed) && rv.revealed[i] ? 1 : 0));
  revealed[TREASURE_START_IDX] = 1;
  const sailNeedSec = Math.max(60, Math.min(24 * 3600, Math.round(Number(rv.sailNeedSec) || island.sailSec)));
  const phase = rv.phase === "exploring" ? "exploring" : "sailing";
  const sailRaw = Number(rv.sailSec);
  const hintIdx = Array.isArray(rv.hintIdx)
    ? rv.hintIdx.map((i) => Math.floor(Number(i))).filter((i) => Number.isFinite(i) && i >= 0 && i < TREASURE_GRID_CELLS).slice(0, 4)
    : [];
  const maxStamina = Math.max(1, Math.min(99, Math.floor(Number(rv.maxStamina) || 1)));
  const keepsakesFound = Array.isArray(rv.keepsakesFound) ? rv.keepsakesFound.filter((k) => getTreasureKeepsakeDef(k)).slice(0, 6) : [];
  return {
    islandId: island.id,
    crewIds,
    phase,
    sailNeedSec,
    sailSec: phase === "exploring" ? sailNeedSec : Number.isFinite(sailRaw) && sailRaw > 0 ? Math.min(sailNeedSec, sailRaw) : 0,
    seed: Math.floor(Number(rv.seed) || 0) >>> 0,
    grid,
    revealed,
    hintIdx,
    stamina: Math.max(0, Math.min(99, Math.floor(Number(rv.stamina) || 0))),
    maxStamina,
    steps: Math.max(0, Math.min(TREASURE_GRID_CELLS, Math.floor(Number(rv.steps) || 0))),
    foundX: Boolean(rv.foundX),
    lootMul: Math.max(1, Math.min(2, Number(rv.lootMul) || 1)),
    haul: readTreasureResMap(rv.haul),
    keepsakesFound,
    startedAt: typeof rv.startedAt === "number" && Number.isFinite(rv.startedAt) ? rv.startedAt : 0,
  };
}

export function ensureTreasureVoyageState(state) {
  if (!state || typeof state !== "object") return null;
  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  ensureMapFragmentBucket(state);
  const raw = state.meta.treasureVoyage && typeof state.meta.treasureVoyage === "object" ? state.meta.treasureVoyage : {};
  const monList = Array.isArray(state?.mons?.list) ? state.mons.list : null;
  const aliveSet = monList
    ? new Set(
        monList
          .map((m) => (m && typeof m.id === "number" && Number.isFinite(m.id) ? Math.floor(m.id) : null))
          .filter((x) => x !== null && x > 0),
      )
    : null;
  const voyage = normalizeTreasureVoyage(raw.voyage, aliveSet);
  const crewSet = new Set(voyage ? voyage.crewIds : []);
  const stagedIds = normalizeIdList(raw.stagedIds, TREASURE_VOYAGE_MAX_CREW, aliveSet).filter((id) => !crewSet.has(id));
  const keepsakes = {};
  const rawKs = raw.keepsakes && typeof raw.keepsakes === "object" ? raw.keepsakes : {};
  for (const k of TREASURE_KEEPSAKE_DEFS) {
    const n = Math.max(0, Math.min(999, Math.floor(Number(rawKs[k.id]) || 0)));
    if (n > 0) keepsakes[k.id] = n;
  }
  const fragmentSources = {};
  const rawSrc = raw.fragmentSources && typeof raw.fragmentSources === "object" ? raw.fragmentSources : {};
  for (const s of TREASURE_FRAGMENT_SOURCES) fragmentSources[s.id] = Math.max(0, Math.floor(Number(rawSrc[s.id]) || 0));
  const lv = raw.lastVoyage && typeof raw.lastVoyage === "object" ? raw.lastVoyage : null;
  const lastVoyage =
    lv && getTreasureIslandDef(lv.islandId)
      ? {
          islandId: lv.islandId,
          islandName: getTreasureIslandDef(lv.islandId).name,
          steps: Math.max(0, Math.floor(Number(lv.steps) || 0)),
          foundX: Boolean(lv.foundX),
          haul: readTreasureResMap(lv.haul),
          keepsakes: Array.isArray(lv.keepsakes) ? lv.keepsakes.filter((k) => getTreasureKeepsakeDef(k)).slice(0, 6) : [],
          crewNames: Array.isArray(lv.crewNames) ? lv.crewNames.filter((s) => typeof s === "string").map((s) => s.slice(0, 24)).slice(0, 3) : [],
          reason: typeof lv.reason === "string" ? lv.reason.slice(0, 24) : "return",
          expPerMon: Math.max(0, Math.floor(Number(lv.expPerMon) || 0)),
          returnCoin: Math.max(0, Math.floor(Number(lv.returnCoin) || 0)),
          at: typeof lv.at === "number" && Number.isFinite(lv.at) ? lv.at : 0,
        }
      : null;
  const recentLogs = Array.isArray(raw.recentLogs)
    ? raw.recentLogs.filter((s) => typeof s === "string" && s.trim().length > 0).slice(0, TREASURE_LOG_KEEP)
    : [];
  const clean = {
    initialized: true,
    maps: Math.max(0, Math.min(TREASURE_MAP_MAX_MAPS, Math.floor(Number(raw.maps) || 0))),
    obsCarry: Math.max(0, Math.min(TREASURE_OBS_SIGHTINGS_PER_FRAGMENT - 1, Math.floor(Number(raw.obsCarry) || 0))),
    fragmentSources,
    stagedIds,
    voyage,
    keepsakes,
    gullDate: typeof raw.gullDate === "string" ? raw.gullDate : "",
    gullUsed: Math.max(0, Math.floor(Number(raw.gullUsed) || 0)),
    totalVoyages: Math.max(0, Math.floor(Number(raw.totalVoyages) || 0)),
    totalTiles: Math.max(0, Math.floor(Number(raw.totalTiles) || 0)),
    totalGrandFound: Math.max(0, Math.floor(Number(raw.totalGrandFound) || 0)),
    totalFragments: Math.max(0, Math.floor(Number(raw.totalFragments) || 0)),
    totalMapsAssembled: Math.max(0, Math.floor(Number(raw.totalMapsAssembled) || 0)),
    lastVoyage,
    recentLogs,
  };
  if (state.meta.treasureVoyage && typeof state.meta.treasureVoyage === "object") {
    Object.assign(state.meta.treasureVoyage, clean);
    return state.meta.treasureVoyage;
  }
  state.meta.treasureVoyage = clean;
  return clean;
}

function treasurePushLog(tv, line) {
  tv.recentLogs = [line, ...(tv.recentLogs || [])].slice(0, TREASURE_LOG_KEEP);
}

/** Non-mutating read: partners sailing / exploring on the active voyage — protected in busyMonIds. */
export function getTreasureVoyageCrewMonIds(state) {
  const ids = new Set();
  const v = state?.meta?.treasureVoyage?.voyage;
  if (!v || typeof v !== "object" || !Array.isArray(v.crewIds)) return ids;
  const monList = Array.isArray(state?.mons?.list) ? state.mons.list : null;
  const validSet = monList ? new Set(monList.filter((m) => m && typeof m.id === "number").map((m) => Math.floor(m.id))) : null;
  for (const raw of v.crewIds) {
    const id = Math.floor(Number(raw) || 0);
    if (id > 0 && (!validSet || validSet.has(id))) ids.add(id);
    if (ids.size >= TREASURE_VOYAGE_MAX_CREW) break;
  }
  return ids;
}

/** Idle partners eligible for the voyage crew: not training/expedition/PvE/breeding/camp/eco-sandbox/dock/observatory/sky island. */
export function getIdleTreasureVoyageCandidates(state) {
  const list = Array.isArray(state?.mons?.list) ? state.mons.list.filter(Boolean) : [];
  const extBusy = getNonSandboxBusyIds(state);
  const ecoBusy = getEcoSandboxBusyIds(state);
  return list.filter((m) => m && typeof m.id === "number" && !extBusy.has(m.id) && !ecoBusy.has(m.id));
}

/**
 * Crew roles: 领航 (water / wind) −15% sailing time each (≥40% of base), 探路 (stone / grass) +1 stamina each,
 * 寻宝直觉 (light / mystic / dark) +10% tile loot each. Stamina = 6 + 3 × crew + pathfinders + min(4, ⌊avg Lv / 25⌋).
 */
export function evaluateTreasureVoyageCrew(crewMons = [], state = null, opts = {}) {
  const mons = (Array.isArray(crewMons) ? crewMons.filter(Boolean) : []).slice(0, TREASURE_VOYAGE_MAX_CREW);
  const nav = new Set(TREASURE_NAVIGATOR_TYPES);
  const path = new Set(TREASURE_PATHFINDER_TYPES);
  const seek = new Set(TREASURE_SEEKER_TYPES);
  let navigators = 0;
  let pathfinders = 0;
  let seekers = 0;
  let lvlSum = 0;
  for (const m of mons) {
    const types = resolveMonTypesForEco(m, opts);
    if (types.some((t) => nav.has(t))) navigators += 1;
    if (types.some((t) => path.has(t))) pathfinders += 1;
    if (types.some((t) => seek.has(t))) seekers += 1;
    lvlSum += Math.max(1, Math.min(100, Math.floor(Number(m.lvl) || 1)));
  }
  const avgLvl = mons.length ? lvlSum / mons.length : 0;
  const lvlStamina = mons.length ? Math.min(4, Math.floor(avgLvl / 25)) : 0;
  return {
    crewCount: mons.length,
    navigators,
    pathfinders,
    seekers,
    avgLvl: Math.round(avgLvl * 10) / 10,
    sailMul: Math.round(Math.max(0.4, 1 - 0.15 * navigators) * 100) / 100,
    stamina: mons.length ? 6 + 3 * mons.length + pathfinders + lvlStamina : 0,
    lvlStamina,
    lootMul: Math.round((1 + 0.1 * seekers) * 100) / 100,
  };
}

function scoreMonForTreasureVoyage(mon, opts = {}) {
  if (!mon) return -1;
  const types = resolveMonTypesForEco(mon, opts);
  const roles =
    (types.some((t) => TREASURE_NAVIGATOR_TYPES.includes(t)) ? 1 : 0) +
    (types.some((t) => TREASURE_PATHFINDER_TYPES.includes(t)) ? 1 : 0) +
    (types.some((t) => TREASURE_SEEKER_TYPES.includes(t)) ? 1 : 0);
  return roles * 400 + Math.max(1, Math.floor(Number(mon.lvl) || 1)) * 5 + Math.max(0, Math.floor(Number(mon.stars) || 0)) * 10;
}

export function toggleTreasureVoyageCrewMon(state, monId) {
  const tv = ensureTreasureVoyageState(state);
  if (!tv) return { ok: false, reason: "invalid_state" };
  if (tv.voyage) return { ok: false, reason: "voyage_active" };
  const id = Math.floor(Number(monId) || 0);
  if (id <= 0) return { ok: false, reason: "invalid_mon" };
  if (tv.stagedIds.includes(id)) {
    tv.stagedIds = tv.stagedIds.filter((x) => x !== id);
    return { ok: true, staged: false, stagedIds: tv.stagedIds.slice() };
  }
  if (tv.stagedIds.length >= TREASURE_VOYAGE_MAX_CREW) return { ok: false, reason: "crew_full" };
  if (!getIdleTreasureVoyageCandidates(state).some((m) => m.id === id)) return { ok: false, reason: "mon_busy" };
  tv.stagedIds = [...tv.stagedIds, id];
  return { ok: true, staged: true, stagedIds: tv.stagedIds.slice() };
}

/** Fills empty crew seats with the best idle partners (role coverage first, then level). Keeps already-staged partners. */
export function autoPickTreasureVoyageCrew(state, opts = {}) {
  const tv = ensureTreasureVoyageState(state);
  if (!tv) return { ok: false, added: [] };
  if (tv.voyage) return { ok: false, reason: "voyage_active", added: [] };
  const idle = getIdleTreasureVoyageCandidates(state);
  const idleSet = new Set(idle.map((m) => m.id));
  tv.stagedIds = tv.stagedIds.filter((id) => idleSet.has(id));
  const free = TREASURE_VOYAGE_MAX_CREW - tv.stagedIds.length;
  if (free <= 0) return { ok: false, reason: "crew_full", added: [] };
  const picked = idle
    .filter((m) => !tv.stagedIds.includes(m.id))
    .sort((a, b) => scoreMonForTreasureVoyage(b, opts) - scoreMonForTreasureVoyage(a, opts) || (a.id || 0) - (b.id || 0))
    .slice(0, free)
    .map((m) => m.id);
  tv.stagedIds = [...tv.stagedIds, ...picked];
  return { ok: picked.length > 0, reason: picked.length ? "" : "no_idle_mons", added: picked, stagedIds: tv.stagedIds.slice() };
}

/** Hot-path accessor for the fragment hooks: reuses an already-normalized tracker, otherwise creates one with neutral defaults. */
function treasureTrackerForGrant(state) {
  const raw = state?.meta?.treasureVoyage;
  if (raw && typeof raw === "object" && raw.initialized && raw.fragmentSources && typeof raw.fragmentSources === "object") return raw;
  return ensureTreasureVoyageState(state);
}

/** Grants map fragments from one of the three source activities (dock / observatory / expedition). Returns the amount stored. */
export function grantTreasureMapFragments(state, source, amount, opts = {}) {
  const n = Math.max(0, Math.floor(Number(amount) || 0));
  if (!state || typeof state !== "object" || n <= 0) return 0;
  const tv = treasureTrackerForGrant(state);
  const bucket = ensureMapFragmentBucket(state);
  if (!tv || !bucket) return 0;
  const before = Math.max(0, Number(bucket.value) || 0);
  addResDirect(state, "mapFragment", n, opts);
  const after = Math.max(0, Number(state.res?.mapFragment?.value) || 0);
  const gained = Math.max(0, Math.round(after - before));
  const key = TREASURE_FRAGMENT_SOURCES.some((s) => s.id === source) ? source : "";
  if (key && gained > 0) tv.fragmentSources[key] = (tv.fragmentSources[key] || 0) + gained;
  tv.totalFragments = (tv.totalFragments || 0) + gained;
  return gained;
}

/** Observatory hook: every 3rd recorded sighting hands over one map fragment. */
export function noteTreasureObservatorySighting(state, opts = {}) {
  const tv = treasureTrackerForGrant(state);
  if (!tv) return 0;
  tv.obsCarry = Math.max(0, Math.floor(Number(tv.obsCarry) || 0)) + 1;
  if (tv.obsCarry < TREASURE_OBS_SIGHTINGS_PER_FRAGMENT) return 0;
  tv.obsCarry -= TREASURE_OBS_SIGHTINGS_PER_FRAGMENT;
  return grantTreasureMapFragments(state, "observatory", 1, opts);
}

export function getTreasureExpeditionFragments(levelKey) {
  return TREASURE_EXPEDITION_FRAGMENTS[levelKey] || 1;
}

/** 「拼合藏宝图」: 6 fragments → 1 treasure map (at most 5 maps kept). */
export function assembleTreasureMap(state) {
  const tv = ensureTreasureVoyageState(state);
  if (!tv) return { ok: false, reason: "invalid_state" };
  const bucket = ensureMapFragmentBucket(state);
  const have = Math.max(0, Math.floor(Number(bucket.value) || 0));
  if (tv.maps >= TREASURE_MAP_MAX_MAPS) return { ok: false, reason: "maps_full", have };
  if (have < TREASURE_MAP_FRAGMENTS_PER_MAP) return { ok: false, reason: "not_enough_fragments", have, need: TREASURE_MAP_FRAGMENTS_PER_MAP };
  bucket.value = have - TREASURE_MAP_FRAGMENTS_PER_MAP;
  tv.maps += 1;
  tv.totalMapsAssembled = (tv.totalMapsAssembled || 0) + 1;
  const logLine = `【拼合藏宝图】${TREASURE_MAP_FRAGMENTS_PER_MAP} 片残片严丝合缝地拼成了一张藏宝图（现有 ${tv.maps} 张）`;
  treasurePushLog(tv, logLine);
  return { ok: true, maps: tv.maps, fragmentsLeft: bucket.value, logLine };
}

export function isTreasureIslandUnlocked(state, islandId) {
  const def = getTreasureIslandDef(islandId);
  if (!def) return false;
  return Math.max(0, Math.floor(Number(state?.meta?.treasureVoyage?.totalVoyages) || 0)) >= def.unlockVoyages;
}

/** Spends one map, generates the island from a seed (opts.seed or the injected opts.randFloat) and sets sail with the staged crew. */
export function startTreasureVoyage(state, islandId, opts = {}) {
  const tv = ensureTreasureVoyageState(state);
  if (!tv) return { ok: false, reason: "invalid_state" };
  if (tv.voyage) return { ok: false, reason: "voyage_active" };
  const island = getTreasureIslandDef(islandId);
  if (!island) return { ok: false, reason: "unknown_island" };
  if (!isTreasureIslandUnlocked(state, island.id)) return { ok: false, reason: "locked", needVoyages: island.unlockVoyages };
  if (tv.maps < 1) return { ok: false, reason: "no_map" };
  const idleById = new Map(getIdleTreasureVoyageCandidates(state).map((m) => [m.id, m]));
  const rawIds = Array.isArray(opts.crewIds) ? opts.crewIds : tv.stagedIds;
  const crewIds = normalizeIdList(rawIds, TREASURE_VOYAGE_MAX_CREW).filter((id) => idleById.has(id));
  if (!crewIds.length) return { ok: false, reason: "no_crew" };
  const crew = crewIds.map((id) => idleById.get(id));
  const ev = evaluateTreasureVoyageCrew(crew, state, opts);
  const rng = typeof opts.randFloat === "function" ? opts.randFloat : Math.random;
  const seed =
    typeof opts.seed === "number" && Number.isFinite(opts.seed)
      ? Math.floor(opts.seed) >>> 0
      : Math.floor(Math.max(0, Math.min(0.999999999, Number(rng()) || 0)) * 2147483647) >>> 0;
  const layout = generateTreasureIslandGrid(island.id, seed);
  const revealed = new Array(TREASURE_GRID_CELLS).fill(0);
  revealed[TREASURE_START_IDX] = 1;
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  tv.maps -= 1;
  tv.stagedIds = [];
  tv.voyage = {
    islandId: island.id,
    crewIds,
    phase: "sailing",
    sailNeedSec: Math.max(60, Math.round(island.sailSec * ev.sailMul)),
    sailSec: 0,
    seed,
    grid: layout.grid,
    revealed,
    hintIdx: layout.hintIdx,
    stamina: ev.stamina,
    maxStamina: ev.stamina,
    steps: 0,
    foundX: false,
    lootMul: ev.lootMul,
    haul: {},
    keepsakesFound: [],
    startedAt: nowMs,
  };
  const names = crew.map((m) => m.name || "伙伴").join("、");
  const logLine = `【扬帆寻宝】${names} 带着藏宝图驶向「${island.name}」（航程 ${Math.round(tv.voyage.sailNeedSec / 60)} 分钟 · 体力 ${ev.stamina}，远航期间防放生保护生效）`;
  treasurePushLog(tv, logLine);
  return { ok: true, islandId: island.id, crewIds: crewIds.slice(), sailNeedSec: tv.voyage.sailNeedSec, stamina: ev.stamina, seed, logLine };
}

/** Advances the sailing leg by dtSec (live tick + offline catch-up ≤12h). Arrival switches the voyage to exploring. */
export function advanceTreasureVoyage(state, dtSec) {
  const tv = state?.meta?.treasureVoyage;
  const v = tv && typeof tv === "object" ? tv.voyage : null;
  if (!v || typeof v !== "object" || v.phase !== "sailing") return { arrived: false, progressed: 0 };
  const step = typeof dtSec === "number" && Number.isFinite(dtSec) && dtSec > 0 ? Math.min(TREASURE_VOYAGE_MAX_CATCHUP_SEC, dtSec) : 0;
  const need = Math.max(60, Number(v.sailNeedSec) || 600);
  const before = Math.max(0, Number(v.sailSec) || 0);
  v.sailSec = Math.min(need, before + step);
  if (v.sailSec >= need) {
    v.phase = "exploring";
    const island = getTreasureIslandDef(v.islandId);
    const logLine = `【登岛】寻宝船队抵达「${island?.name || "宝岛"}」，从滩头开始一格一格探索吧（体力 ${v.stamina}）`;
    treasurePushLog(tv, logLine);
    return { arrived: true, progressed: v.sailSec - before, islandName: island?.name || "", logLine };
  }
  return { arrived: false, progressed: v.sailSec - before };
}

export function getTreasureFrontier(voyage) {
  const v = voyage;
  if (!v || !Array.isArray(v.revealed)) return [];
  const out = [];
  for (let i = 0; i < TREASURE_GRID_CELLS; i += 1) {
    if (v.revealed[i]) continue;
    const r = Math.floor(i / TREASURE_GRID_SIZE);
    const c = i % TREASURE_GRID_SIZE;
    const nb = [
      r > 0 ? i - TREASURE_GRID_SIZE : -1,
      r < TREASURE_GRID_SIZE - 1 ? i + TREASURE_GRID_SIZE : -1,
      c > 0 ? i - 1 : -1,
      c < TREASURE_GRID_SIZE - 1 ? i + 1 : -1,
    ];
    if (nb.some((n) => n >= 0 && v.revealed[n])) out.push(i);
  }
  return out;
}

/** Deterministic reward of tile `idx` for this voyage (seed-derived). Keepsake duplicates are resolved by the caller. */
export function computeTreasureTileReward(voyage, idx) {
  const v = voyage;
  const island = getTreasureIslandDef(v?.islandId) || TREASURE_ISLAND_DEFS[0];
  const code = Array.isArray(v?.grid) ? v.grid[idx] : "";
  const r = treasureRng(((Math.floor(Number(v?.seed) || 0) >>> 0) ^ Math.imul(idx + 1, 2654435761)) >>> 0);
  const crewLoot = Math.max(1, Number(v?.lootMul) || 1);
  const mul = island.lootMul * crewLoot;
  const scaled = (base, spread) => Math.max(1, Math.round((base + Math.floor(r() * (spread + 1))) * mul));
  const res = {};
  let keepsake = null;
  let staminaDelta = 0;
  switch (code) {
    case "sand":
      res.futurecoin = scaled(3, 3);
      break;
    case "grove":
      res.catnip = scaled(40, 30);
      break;
    case "driftwood":
      res.wood = scaled(30, 25);
      break;
    case "ore":
      res.minerals = scaled(25, 20);
      break;
    case "chest": {
      const total = TREASURE_CHEST_TABLE.reduce((s, e) => s + e.weight, 0);
      let roll = r() * total;
      let pick = TREASURE_CHEST_TABLE[0];
      for (const e of TREASURE_CHEST_TABLE) {
        if (roll < e.weight) {
          pick = e;
          break;
        }
        roll -= e.weight;
      }
      res[pick.rid] = pick.scale ? Math.round(pick.base * mul) : pick.base + (island.bonusItems || 0);
      break;
    }
    case "relic":
      keepsake = island.relicKeepsake;
      res.futurecoin = Math.round(10 * mul);
      break;
    case "xmark":
      keepsake = island.crownKeepsake;
      for (const [rid, n] of Object.entries(island.grand)) res[rid] = rid === "futurecoin" ? Math.round(n * crewLoot) : n;
      break;
    case "trap":
      staminaDelta = -1;
      break;
    case "spring":
      staminaDelta = TREASURE_SPRING_STAMINA;
      break;
    default:
      break;
  }
  return { code, res, keepsake, staminaDelta };
}

function treasureResText(res) {
  return Object.entries(res || {})
    .filter(([, n]) => n > 0)
    .map(([rid, n]) => `${TREASURE_RES_ZH[rid] || rid} +${n}`)
    .join("、");
}

function treasureEndSummary(v, reason, crewNames = [], expPerMon = 0, returnCoin = 0, nowMs = Date.now()) {
  const island = getTreasureIslandDef(v.islandId);
  return {
    islandId: v.islandId,
    islandName: island?.name || "",
    steps: Math.max(0, Math.floor(Number(v.steps) || 0)),
    foundX: Boolean(v.foundX),
    haul: { ...(v.haul || {}) },
    keepsakes: Array.isArray(v.keepsakesFound) ? v.keepsakesFound.slice() : [],
    crewNames,
    reason,
    expPerMon,
    returnCoin,
    at: nowMs,
  };
}

/** Ends the voyage. Sailing → aborted (map refunded). Exploring → return bonus (crew exp / futurecoin per explored tile) unless opts.noBonus. */
export function returnFromTreasureVoyage(state, opts = {}) {
  const tv = ensureTreasureVoyageState(state);
  if (!tv) return { ok: false, reason: "invalid_state" };
  const v = tv.voyage;
  if (!v) return { ok: false, reason: "no_voyage" };
  const island = getTreasureIslandDef(v.islandId);
  const list = Array.isArray(state.mons?.list) ? state.mons.list : [];
  const crew = v.crewIds.map((id) => list.find((m) => m && m.id === id) || null).filter(Boolean);
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  if (v.phase === "sailing") {
    tv.maps = Math.min(TREASURE_MAP_MAX_MAPS, (tv.maps || 0) + 1);
    tv.voyage = null;
    const logLine = `【中途返航】寻宝船队还没抵达「${island?.name || "宝岛"}」就调头回港，藏宝图已收回`;
    treasurePushLog(tv, logLine);
    return { ok: true, aborted: true, refundedMap: true, logLine };
  }
  const bonus = !opts.noBonus;
  const expPerMon = bonus ? TREASURE_RETURN_EXP_PER_STEP * v.steps : 0;
  const returnCoin = bonus ? TREASURE_RETURN_COIN_PER_STEP * v.steps : 0;
  if (expPerMon > 0) {
    for (const m of crew) {
      if (typeof opts.addExpToMon === "function") opts.addExpToMon(m, expPerMon);
      else m.exp = Math.max(0, Math.floor((Number(m.exp) || 0) + expPerMon));
    }
  }
  if (returnCoin > 0) addResDirect(state, "futurecoin", returnCoin, opts);
  tv.totalVoyages = (tv.totalVoyages || 0) + 1;
  const reason = typeof opts.reason === "string" && opts.reason ? opts.reason : "return";
  tv.lastVoyage = treasureEndSummary(
    v,
    reason,
    crew.map((m) => String(m.name || "伙伴").slice(0, 24)),
    expPerMon,
    returnCoin,
    nowMs,
  );
  tv.voyage = null;
  const reasonTxt = reason === "exhausted" ? "体力耗尽，" : reason === "cleared" ? "整座岛都探索完了，" : "";
  const logLine = `【满载归航】${reasonTxt}「${island?.name || "宝岛"}」探索 ${v.steps} 格${v.foundX ? "，挖到了宝藏 X" : ""}${bonus ? `（船员经验 +${expPerMon} · 归航奖励未来币 +${returnCoin}）` : ""}`;
  treasurePushLog(tv, logLine);
  return { ok: true, aborted: false, summary: { ...tv.lastVoyage }, expPerMon, returnCoin, logLine };
}

/**
 * Explores one fog tile next to an explored tile: −1 stamina (trap −1 more, spring +3), credits the tile's loot and keepsake
 * immediately. When stamina runs out (or the island is fully explored) the crew sails home automatically.
 */
export function exploreTreasureTile(state, idx, opts = {}) {
  const tv = ensureTreasureVoyageState(state);
  if (!tv) return { ok: false, reason: "invalid_state" };
  const v = tv.voyage;
  if (!v) return { ok: false, reason: "no_voyage" };
  if (v.phase !== "exploring") return { ok: false, reason: "still_sailing" };
  const i = Math.floor(Number(idx));
  if (!Number.isFinite(i) || i < 0 || i >= TREASURE_GRID_CELLS) return { ok: false, reason: "invalid_tile" };
  if (v.revealed[i]) return { ok: false, reason: "already_explored" };
  if (!getTreasureFrontier(v).includes(i)) return { ok: false, reason: "not_adjacent" };
  if (v.stamina < 1) return { ok: false, reason: "no_stamina" };
  const island = getTreasureIslandDef(v.islandId);
  const rw = computeTreasureTileReward(v, i);
  v.revealed[i] = 1;
  v.steps += 1;
  v.stamina = Math.max(0, v.stamina - 1 + Math.min(0, rw.staminaDelta)) + Math.max(0, rw.staminaDelta);
  const credited = { ...rw.res };
  let keepsakeDup = false;
  if (rw.keepsake) {
    keepsakeDup = (tv.keepsakes[rw.keepsake] || 0) > 0;
    tv.keepsakes[rw.keepsake] = (tv.keepsakes[rw.keepsake] || 0) + 1;
    if (!v.keepsakesFound.includes(rw.keepsake)) v.keepsakesFound.push(rw.keepsake);
    if (keepsakeDup) credited.futurecoin = (credited.futurecoin || 0) + TREASURE_KEEPSAKE_DUP_COIN;
  }
  for (const [rid, n] of Object.entries(credited)) {
    addResDirect(state, rid, n, opts);
    v.haul[rid] = (v.haul[rid] || 0) + n;
  }
  if (rw.code === "xmark") {
    v.foundX = true;
    tv.totalGrandFound = (tv.totalGrandFound || 0) + 1;
  }
  tv.totalTiles = (tv.totalTiles || 0) + 1;
  const tile = TREASURE_TILE_DEFS[rw.code] || TREASURE_TILE_DEFS.sand;
  const ksDef = rw.keepsake ? getTreasureKeepsakeDef(rw.keepsake) : null;
  const lootTxt = treasureResText(credited);
  const extra =
    rw.code === "trap" ? "，陷进流沙多耗 1 点体力" : rw.code === "spring" ? `，喝口泉水体力 +${TREASURE_SPRING_STAMINA}` : "";
  const ksTxt = ksDef
    ? `，${keepsakeDup ? "又" : ""}找到纪念品「${ksDef.name}」${keepsakeDup ? `（重复，折算未来币 +${TREASURE_KEEPSAKE_DUP_COIN}）` : ""}`
    : "";
  const logLine = `【寻宝探索】「${island?.name || "宝岛"}」${tile.name}${lootTxt ? `：${lootTxt}` : ""}${ksTxt}${extra}（剩余体力 ${v.stamina}）`;
  treasurePushLog(tv, logLine);
  let finished = null;
  if (v.stamina <= 0 || getTreasureFrontier(v).length === 0) {
    finished = returnFromTreasureVoyage(state, { ...opts, reason: v.stamina <= 0 ? "exhausted" : "cleared" });
  }
  return {
    ok: true,
    idx: i,
    code: rw.code,
    tileName: tile.name,
    reward: credited,
    keepsake: rw.keepsake,
    keepsakeDup,
    staminaLeft: finished ? 0 : v.stamina,
    foundX: rw.code === "xmark",
    finished,
    logLine,
  };
}

/** Greedy auto-explore: heads for the map's red hint ring until the X is dug up, then sweeps the nearest fog; stops when the crew sails home. */
export function autoExploreTreasureIsland(state, opts = {}) {
  const tv = ensureTreasureVoyageState(state);
  if (!tv?.voyage) return { ok: false, reason: "no_voyage", steps: [] };
  if (tv.voyage.phase !== "exploring") return { ok: false, reason: "still_sailing", steps: [] };
  const maxSteps = Math.max(1, Math.min(TREASURE_GRID_CELLS, Math.floor(Number(opts.maxSteps) || TREASURE_GRID_CELLS)));
  const steps = [];
  let finished = null;
  while (steps.length < maxSteps && tv.voyage && tv.voyage.phase === "exploring" && tv.voyage.stamina > 0) {
    const v = tv.voyage;
    const frontier = getTreasureFrontier(v);
    if (!frontier.length) break;
    const hint = v.hintIdx.length ? v.hintIdx : [2];
    const tr = v.foundX ? Math.floor(TREASURE_START_IDX / 5) : hint.reduce((s, i) => s + Math.floor(i / 5), 0) / hint.length;
    const tc = v.foundX ? TREASURE_START_IDX % 5 : hint.reduce((s, i) => s + (i % 5), 0) / hint.length;
    const dist = (i) => Math.abs(Math.floor(i / 5) - tr) + Math.abs((i % 5) - tc);
    const pick = frontier.slice().sort((a, b) => dist(a) - dist(b) || a - b)[0];
    const res = exploreTreasureTile(state, pick, opts);
    if (!res.ok) break;
    steps.push(res);
    if (res.finished) {
      finished = res.finished;
      break;
    }
  }
  return { ok: steps.length > 0, steps, finished };
}

export function getTreasureGullFreeLeft(state, nowMs = Date.now()) {
  const tv = state?.meta?.treasureVoyage;
  if (!tv || typeof tv !== "object") return TREASURE_FREE_GULL_PER_DAY;
  if (tv.gullDate !== localYmdForSandbox(nowMs)) return TREASURE_FREE_GULL_PER_DAY;
  return Math.max(0, TREASURE_FREE_GULL_PER_DAY - Math.floor(Number(tv.gullUsed) || 0));
}

/** 「海鸥领航」: sailing → arrive instantly; exploring → +3 stamina. Free once per local day, then futurecoin ×20. */
export function performTreasureGullAssist(state, opts = {}) {
  const tv = ensureTreasureVoyageState(state);
  if (!tv) return { ok: false, reason: "invalid_state" };
  const v = tv.voyage;
  if (!v) return { ok: false, reason: "no_voyage" };
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const today = localYmdForSandbox(nowMs);
  if (tv.gullDate !== today) {
    tv.gullDate = today;
    tv.gullUsed = 0;
  }
  let costKind = "";
  if (tv.gullUsed < TREASURE_FREE_GULL_PER_DAY) {
    tv.gullUsed += 1;
    costKind = "free_daily";
  } else if ((Number(state.res?.futurecoin?.value) || 0) >= TREASURE_GULL_COIN_COST) {
    state.res.futurecoin.value = Math.max(0, Math.floor(state.res.futurecoin.value) - TREASURE_GULL_COIN_COST);
    costKind = "futurecoin";
  } else {
    return { ok: false, reason: "insufficient_gull_cost" };
  }
  const island = getTreasureIslandDef(v.islandId);
  let kind = "stamina";
  if (v.phase === "sailing") {
    v.sailSec = v.sailNeedSec;
    v.phase = "exploring";
    kind = "arrive";
  } else {
    v.stamina += TREASURE_GULL_STAMINA;
  }
  const logLine =
    kind === "arrive"
      ? `【海鸥领航】海鸥群在前面引路，寻宝船队顺风抵达「${island?.name || "宝岛"}」`
      : `【海鸥领航】海鸥叼来椰子补给，船队体力 +${TREASURE_GULL_STAMINA}（现有 ${v.stamina}）`;
  treasurePushLog(tv, logLine);
  return { ok: true, costKind, kind, stamina: v.stamina, logLine };
}

/** Forced release: drops the partner from the staged crew and the active voyage; an emptied crew ends the voyage early. */
export function detachTreasureVoyageMon(state, monId) {
  const tv = state?.meta?.treasureVoyage;
  const id = Math.floor(Number(monId) || 0);
  if (!tv || typeof tv !== "object" || id <= 0) return { ok: false, detached: false };
  let detached = false;
  if (Array.isArray(tv.stagedIds) && tv.stagedIds.includes(id)) {
    tv.stagedIds = tv.stagedIds.filter((x) => x !== id);
    detached = true;
  }
  const v = tv.voyage;
  if (v && typeof v === "object" && Array.isArray(v.crewIds) && v.crewIds.includes(id)) {
    v.crewIds = v.crewIds.filter((x) => x !== id);
    detached = true;
    if (!v.crewIds.length) {
      if (v.phase === "sailing") {
        tv.maps = Math.min(TREASURE_MAP_MAX_MAPS, Math.floor(Number(tv.maps) || 0) + 1);
      } else {
        tv.totalVoyages = Math.floor(Number(tv.totalVoyages) || 0) + 1;
        tv.lastVoyage = treasureEndSummary(v, "crew_released");
      }
      tv.voyage = null;
    }
  }
  return { ok: true, detached };
}

/** Rebirth: the voyage crew is recalled (a sailing voyage refunds its map; an island in progress ends without the return bonus). */
export function recallTreasureVoyageForRebirth(state) {
  const tv = state?.meta?.treasureVoyage;
  if (!tv || typeof tv !== "object") return { ok: false, recalled: false };
  tv.stagedIds = [];
  const v = tv.voyage;
  if (!v || typeof v !== "object") return { ok: true, recalled: false };
  if (v.phase === "sailing") {
    tv.maps = Math.min(TREASURE_MAP_MAX_MAPS, Math.floor(Number(tv.maps) || 0) + 1);
  } else {
    tv.totalVoyages = Math.floor(Number(tv.totalVoyages) || 0) + 1;
    tv.lastVoyage = treasureEndSummary(v, "rebirth");
  }
  tv.voyage = null;
  return { ok: true, recalled: true };
}

/**
 * Pure non-mutating aggregator of the keepsake aura (wired into production / effects / breeding):
 * each distinct keepsake 全产 +0.6% · 闪光 +0.5% · 捕获 +0.2%; all 6 → 「寻宝传说」全产再 +3%. Neutral without a tracker.
 */
export function computeTreasureVoyageAura(state) {
  const raw = state?.meta?.treasureVoyage;
  const ks = raw && typeof raw === "object" && raw.keepsakes && typeof raw.keepsakes === "object" ? raw.keepsakes : {};
  const owned = TREASURE_KEEPSAKE_DEFS.filter((k) => Math.floor(Number(ks[k.id]) || 0) > 0).length;
  const total = TREASURE_KEEPSAKE_DEFS.length;
  const fullSet = owned >= total;
  const round4 = (n) => Math.round(n * 10000) / 10000;
  const prodAdd = round4(owned * 0.006 + (fullSet ? 0.03 : 0));
  const shinyAdd = round4(owned * 0.005);
  const catchAdd = round4(owned * 0.002);
  const totalVoyages = raw && typeof raw === "object" ? Math.max(0, Math.floor(Number(raw.totalVoyages) || 0)) : 0;
  return {
    keepsakeCount: owned,
    totalKeepsakes: total,
    fullSet,
    totalVoyages,
    title: fullSet ? "寻宝传说" : getTreasureHunterTitle(totalVoyages),
    maps: raw && typeof raw === "object" ? Math.max(0, Math.floor(Number(raw.maps) || 0)) : 0,
    voyaging: Boolean(raw && typeof raw === "object" && raw.voyage),
    prodAdd,
    prodMul: round4(1 + prodAdd),
    shinyAdd,
    shinyChanceMul: round4(1 + shinyAdd),
    catchAdd,
  };
}
