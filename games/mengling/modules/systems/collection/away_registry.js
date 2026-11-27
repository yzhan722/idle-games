// collection/away_registry.js — ML-14 统一外出登记表 · ML-16 一键收取的只读汇总（由 collection_fun.js 原样拆出，对外仍从 ../collection_fun.js 引用）

import { getEcoSandboxBusyIds, getNonSandboxBusyIds } from "./camp.js";
import { WISH_DOCK_ROUTES, getNightObservatoryStationedMonIds, getWishDockAwayMonIds } from "./dock_observatory.js";
import {
  TREASURE_VOYAGE_MAX_CREW,
  getSkyIslandCrewMonIds,
  getTreasureFrontier,
  getTreasureIslandDef,
  getTreasureVoyageCrewMonIds,
} from "./island_voyage.js";
import {
  POST_OFFICE_MAX_MESSENGERS,
  getDreamLibraryDreamerIds,
  getFishingAnglerMonIds,
  getHotSpringSoakingMonIds,
  getPostMessengerMonIds,
} from "./spring_library.js";
import {
  BALLOON_COUNT,
  BALLOON_SEATS,
  BEE_HIVE_COUNT,
  BEE_HIVE_NAMES,
  BEE_SEATS,
  ICE_RINK_PROGRAM_NAMES,
  ICE_RINK_SLOTS,
  STARGAZE_SEATS,
  STARGAZE_SITE_COUNT,
  STARGAZE_SITE_NAMES,
  getBakeryWorkerMonIds,
  getBalloonTravelerMonIds,
  getBeeKeeperMonIds,
  getCloudParkOperatorMonIds,
  getIceRinkSkaterMonIds,
  getStargazeCamperMonIds,
} from "./bakery_park.js";

// ============================================================================
// ML-14 统一忙碌排除（单一登记表）
// 所有「人不在家」的外出 / 驻场类玩法都在 AWAY_ACTIVITY_REGISTRY 登记一次：心愿码头出海、月光观察站派驻、浮空岛建造、
// 寻宝远航、温泉泡汤、邮局送信、梦境绘本馆入梦、溪畔钓鱼会垂钓，ML-15 的云朵甜点烘焙坊上岗、彩虹气球旅行，
// 以及 ML-16 的云端游乐园值班、星空露营观测夜营，ML-17 的冰晶溜冰场排练、花田蜜蜂工坊照料。
// getAwayMonIds() 是唯一来源：放生锁 busyMonIds、其他玩法的空闲候选（getNonSandboxBusyIds）、星营 / 杂技 / 乐队不可用名单、
// 升星材料过滤、放生拦截文案，以及三系冠军赛 / 星冠殿堂 / 星轨回廊的自动编队 / 手动编入 / 参赛、训练选人、远征选人都只读这一份名单。
// 以后新增外出玩法只需在这里加一行，不必再到各处各写各的。
// ML-16：有「已归来 / 已降落 / 已完成但还没收取」状态的玩法再登记一个 returned 读取器（只读），
// getAwayReturnedUnits() 汇总后由 pve_tower.js 的 collectAllReturnedPartners()「一键收取已归来伙伴」逐个调用各玩法自己的收取函数。
// ============================================================================

const AWAY_ACTIVITY_REGISTRY = Object.freeze([
  {
    id: "iceRink",
    title: "冰晶溜冰场",
    label: "溜冰排练中",
    releaseHint: "正在冰晶溜冰场排练花样滑冰，领取评分或提前退场后方可放生",
    blockLog: "该萌灵正在冰晶溜冰场排练花样滑冰，请先领取评分或提前退场后再放生",
    read: (s) => getIceRinkSkaterMonIds(s),
    returned: (s) => listIceRinkReturnedUnits(s),
  },
  {
    id: "beeWorkshop",
    title: "花田蜜蜂工坊",
    label: "照料花田中",
    releaseHint: "正在花田蜜蜂工坊照料花田与蜂箱，收取蜂蜜或召回后方可放生",
    blockLog: "该萌灵正在花田蜜蜂工坊照料花田与蜂箱，请先收取蜂蜜或召回后再放生",
    read: (s) => getBeeKeeperMonIds(s),
    returned: (s) => listBeeReturnedUnits(s),
  },
  {
    id: "stargazeCamp",
    title: "星空露营观测",
    label: "夜营观星中",
    releaseHint: "正在星空露营地夜营观星，撤营或收取观测记录后方可放生",
    blockLog: "该萌灵正在星空露营地夜营观星，请先撤营或收取观测记录后再放生",
    read: (s) => getStargazeCamperMonIds(s),
    returned: (s) => listStargazeReturnedUnits(s),
  },
  {
    id: "cloudPark",
    title: "云端游乐园",
    label: "游乐园值班中",
    releaseHint: "正在云端游乐园操作游乐设施，换班后方可放生",
    blockLog: "该萌灵正在云端游乐园操作游乐设施，请先让它换班后再放生",
    read: (s) => getCloudParkOperatorMonIds(s),
  },
  {
    id: "balloonTravel",
    title: "彩虹气球旅行",
    label: "气球旅行中",
    releaseHint: "正在乘彩虹气球去空中群岛旅行，召回或收取纪念品后方可放生",
    blockLog: "该萌灵正在乘彩虹气球去空中群岛旅行，请先召回或收取纪念品后再放生",
    read: (s) => getBalloonTravelerMonIds(s),
    returned: (s) => listBalloonReturnedUnits(s),
  },
  {
    id: "cloudBakery",
    title: "云朵甜点烘焙坊",
    label: "烘焙中",
    releaseHint: "正在云朵甜点烘焙坊上岗烘焙，下班后方可放生",
    blockLog: "该萌灵正在云朵甜点烘焙坊上岗烘焙，请先让它下班后再放生",
    read: (s) => getBakeryWorkerMonIds(s),
  },
  {
    id: "fishingClub",
    title: "溪畔钓鱼会",
    label: "垂钓中",
    releaseHint: "正在溪畔钓鱼会垂钓，收竿后方可放生",
    blockLog: "该萌灵正在溪畔钓鱼会垂钓，请先收竿后再放生",
    read: (s) => getFishingAnglerMonIds(s),
  },
  {
    id: "dreamLibrary",
    title: "梦境绘本馆",
    label: "入梦中",
    releaseHint: "正在梦境绘本馆入梦写绘本，唤醒后方可放生",
    blockLog: "该萌灵正在梦境绘本馆入梦写绘本，请先唤醒后再放生",
    read: (s) => getDreamLibraryDreamerIds(s),
  },
  {
    id: "hotSpring",
    title: "温泉疗愈乡",
    label: "泡汤中",
    releaseHint: "正在温泉疗愈乡泡汤，出浴后方可放生",
    blockLog: "该萌灵正在温泉疗愈乡泡汤，请先出浴后再放生",
    read: (s) => getHotSpringSoakingMonIds(s),
  },
  {
    id: "postOffice",
    title: "萌灵邮局",
    label: "送信中",
    releaseHint: "正在萌灵邮局外出送信，拆开回信后方可放生",
    blockLog: "该萌灵正在萌灵邮局外出送信，请先拆开回信后再放生",
    read: (s) => getPostMessengerMonIds(s),
    returned: (s) => listPostReturnedUnits(s),
  },
  {
    id: "treasureVoyage",
    title: "寻宝地图远航",
    label: "寻宝远航中",
    releaseHint: "正在寻宝地图远航，返航后方可放生",
    blockLog: "该萌灵正在寻宝地图远航，请先返航后再放生",
    read: (s) => getTreasureVoyageCrewMonIds(s),
    returned: (s) => listTreasureVoyageReturnedUnits(s),
  },
  {
    id: "skyIsland",
    title: "云顶浮空岛",
    label: "建造中",
    releaseHint: "正在云顶浮空岛参与建造，撤回后方可放生",
    blockLog: "该萌灵正在云顶浮空岛参与建造，请先撤回后再放生",
    read: (s) => getSkyIslandCrewMonIds(s),
  },
  {
    id: "nightObservatory",
    title: "月光观察站",
    label: "观测中",
    releaseHint: "正在月光夜行生态观察站派驻观测，撤回后方可放生",
    blockLog: "该萌灵正在月光夜行生态观察站派驻观测，请先撤回后再放生",
    read: (s) => getNightObservatoryStationedMonIds(s),
  },
  {
    id: "wishDock",
    title: "心愿码头",
    label: "出海中",
    releaseHint: "正在心愿码头出海拾贝，召回或收取后方可放生",
    blockLog: "该萌灵正在星海漂流瓶心愿码头出海拾贝，请先召回或收取漂流瓶后再放生",
    read: (s) => getWishDockAwayMonIds(s),
    returned: (s) => listWishDockReturnedUnits(s),
  },
]);

/** Registered away activities (id + labels), in lookup priority order. */
export const AWAY_ACTIVITY_DEFS = Object.freeze(
  AWAY_ACTIVITY_REGISTRY.map(({ id, title, label, releaseHint, blockLog, returned }) =>
    Object.freeze({ id, title, label, releaseHint, blockLog, returnable: typeof returned === "function" }),
  ),
);

/** ML-16: ids of the away activities that have a「已归来 / 已降落 / 已完成但未收取」state (one-click collect covers exactly these). */
export const AWAY_RETURNABLE_ACTIVITY_IDS = Object.freeze(AWAY_ACTIVITY_REGISTRY.filter((a) => typeof a.returned === "function").map((a) => a.id));

/** The single source of truth: every partner currently away on an outing / stationed activity (non-mutating). */
export function getAwayMonIds(state) {
  const ids = new Set();
  for (const act of AWAY_ACTIVITY_REGISTRY) {
    for (const id of act.read(state)) {
      if (typeof id === "number" && Number.isFinite(id) && id > 0) ids.add(Math.floor(id));
    }
  }
  return ids;
}

/** monId → away activity ({ id, label, releaseHint, blockLog }); the first registered activity wins. */
export function getAwayActivityMap(state) {
  const map = new Map();
  AWAY_ACTIVITY_REGISTRY.forEach((act, idx) => {
    for (const id of act.read(state)) {
      if (typeof id === "number" && id > 0 && !map.has(id)) map.set(id, AWAY_ACTIVITY_DEFS[idx]);
    }
  });
  return map;
}

/** The away activity a partner is on (or null). */
export function getAwayActivityOfMon(state, monId) {
  const id = Math.floor(Number(monId) || 0);
  if (id <= 0) return null;
  for (let i = 0; i < AWAY_ACTIVITY_REGISTRY.length; i += 1) {
    if (AWAY_ACTIVITY_REGISTRY[i].read(state).has(id)) return AWAY_ACTIVITY_DEFS[i];
  }
  return null;
}

/** Shared picker filter (squad auto-fill / training / expedition): drops every away partner from a mon list. */
export function excludeAwayMons(state, mons) {
  const away = getAwayMonIds(state);
  return (Array.isArray(mons) ? mons : []).filter((m) => m && typeof m.id === "number" && !away.has(m.id));
}

/** Shared id-list sanitizer for persisted selections (e.g. the expedition team) — keeps order, drops away partners. */
export function dropAwayMonIds(state, ids) {
  const away = getAwayMonIds(state);
  return (Array.isArray(ids) ? ids : []).filter((id) => !away.has(Math.floor(Number(id) || 0)));
}

/** Idle partners for any new outing: not busy in training / expedition / PvE / breeding / camp / sandbox / any away activity. */
export function listIdleOutingMons(state) {
  const list = Array.isArray(state?.mons?.list) ? state.mons.list.filter(Boolean) : [];
  const extBusy = getNonSandboxBusyIds(state);
  const ecoBusy = getEcoSandboxBusyIds(state);
  return list.filter((m) => m && typeof m.id === "number" && !extBusy.has(m.id) && !ecoBusy.has(m.id));
}

// ---------------------------------------------------------------------------
// ML-16「一键收取已归来伙伴」：只读汇总。每个 returned 读取器返回该玩法里「已归来 / 已降落 / 已完成但还没收取」的单位，
// 每个单位带 { key, ref, monIds, text }：ref 交给该玩法自己的收取函数（码头 routeId / 邮局 routeId / 气球 idx / 夜营 idx / 远航 reason）。
// ---------------------------------------------------------------------------

export function awayAliveIdSet(state) {
  const monList = Array.isArray(state?.mons?.list) ? state.mons.list : null;
  return monList ? new Set(monList.filter((m) => m && typeof m.id === "number").map((m) => Math.floor(m.id))) : null;
}

function awayAliveIds(raw, validSet, max = 6) {
  const out = [];
  for (const v of Array.isArray(raw) ? raw : []) {
    const id = Math.floor(Number(v) || 0);
    if (id > 0 && !out.includes(id) && (!validSet || validSet.has(id))) out.push(id);
    if (out.length >= max) break;
  }
  return out;
}

/** 心愿码头：满载归港（completed）但还没收取漂流瓶的航线。 */
function listWishDockReturnedUnits(state) {
  const routes = state?.meta?.wishDock?.routes;
  if (!routes || typeof routes !== "object") return [];
  const validSet = awayAliveIdSet(state);
  const out = [];
  for (const rDef of WISH_DOCK_ROUTES) {
    const r = routes[rDef.id];
    if (!r || typeof r !== "object" || !r.active || !r.completed) continue;
    out.push({ key: `wishDock:${rDef.id}`, ref: { routeId: rDef.id }, monIds: awayAliveIds(r.crewIds, validSet), text: `「${rDef.name}」满载归港，漂流瓶待收取` });
  }
  return out;
}

/** 萌灵邮局：带着回信回到邮局、还没拆信的信使。 */
function listPostReturnedUnits(state) {
  const trips = state?.meta?.postOffice?.trips;
  if (!Array.isArray(trips)) return [];
  const validSet = awayAliveIdSet(state);
  const out = [];
  for (const t of trips.slice(0, POST_OFFICE_MAX_MESSENGERS)) {
    if (!t || typeof t !== "object" || typeof t.routeId !== "string") continue;
    const back = Math.max(0, Number(t.elapsedSec) || 0) >= Math.max(60, Number(t.tripSec) || 600);
    if (!back) continue;
    out.push({ key: `postOffice:${t.routeId}`, ref: { routeId: t.routeId }, monIds: awayAliveIds([t.monId], validSet), text: "信使带着回信回到邮局，回信待拆开" });
  }
  return out;
}

/**
 * 寻宝远航：船队已抵达宝岛（登岛探索阶段）就算「已归来」——
 * 体力耗尽 / 整座岛都探索完时收取即满载归航；还有体力时收取等同手动「收队归航」，会提前结束本次探索（面板文字会写明剩余体力）。
 * 仍在海上航行的航程不算。
 */
function listTreasureVoyageReturnedUnits(state) {
  const v = state?.meta?.treasureVoyage?.voyage;
  if (!v || typeof v !== "object" || v.phase !== "exploring" || !Array.isArray(v.crewIds)) return [];
  const stamina = Math.max(0, Math.floor(Number(v.stamina) || 0));
  const exhausted = !(stamina > 0);
  const cleared = !exhausted && getTreasureFrontier(v).length === 0;
  const island = getTreasureIslandDef(v.islandId);
  const name = island?.name || "宝岛";
  const text = exhausted
    ? `「${name}」体力耗尽，船队等你收队归航`
    : cleared
      ? `「${name}」整座岛都探索完了，船队等你收队归航`
      : `船队已抵达「${name}」（还剩体力 ${stamina}），收取会提前结束探索、按已探索 ${Math.max(0, Math.floor(Number(v.steps) || 0))} 格归航`;
  return [
    {
      key: "treasureVoyage:voyage",
      ref: { reason: exhausted ? "exhausted" : cleared ? "cleared" : "return" },
      monIds: awayAliveIds(v.crewIds, awayAliveIdSet(state), TREASURE_VOYAGE_MAX_CREW),
      text,
    },
  ];
}

/** 彩虹气球旅行：已降落、纪念品还没收取的气球（转生后乘客已回家、只剩纪念品的也算）。 */
function listBalloonReturnedUnits(state) {
  const balloons = state?.meta?.balloonTravel?.balloons;
  if (!Array.isArray(balloons)) return [];
  const validSet = awayAliveIdSet(state);
  const out = [];
  balloons.slice(0, BALLOON_COUNT).forEach((b, idx) => {
    const trip = b?.trip;
    if (!trip || typeof trip !== "object" || trip.phase !== "landed") return;
    const haulN = Array.isArray(trip.haul) ? trip.haul.length : 0;
    out.push({ key: `balloonTravel:${idx}`, ref: { idx }, monIds: awayAliveIds(trip.passengerIds, validSet, BALLOON_SEATS), text: `${idx + 1} 号气球已降落，${haulN} 件纪念品待收取` });
  });
  return out;
}

/** 星空露营观测：夜营结束归营、观测记录还没收取的营地。 */
function listStargazeReturnedUnits(state) {
  const sites = state?.meta?.stargazeCamp?.sites;
  if (!Array.isArray(sites)) return [];
  const validSet = awayAliveIdSet(state);
  const out = [];
  sites.slice(0, STARGAZE_SITE_COUNT).forEach((site, idx) => {
    const trip = site?.trip;
    if (!trip || typeof trip !== "object" || trip.phase !== "returned") return;
    const haulN = Array.isArray(trip.haul) ? trip.haul.length : 0;
    const name = STARGAZE_SITE_NAMES[idx] || `${idx + 1} 号营地`;
    out.push({ key: `stargazeCamp:${idx}`, ref: { idx }, monIds: awayAliveIds(trip.camperIds, validSet, STARGAZE_SEATS), text: `「${name}」夜营归来，${haulN} 条观测记录待收取` });
  });
  return out;
}

/** ML-17 冰晶溜冰场：演出结束、评分还没领取的节目。 */
function listIceRinkReturnedUnits(state) {
  const show = state?.meta?.iceRink?.show;
  if (!show || typeof show !== "object" || show.phase !== "finished") return [];
  const name = ICE_RINK_PROGRAM_NAMES[show.programId] || "花样滑冰";
  const grade = typeof show.grade === "string" && show.grade ? ` · ${show.grade} 级` : "";
  return [
    {
      key: "iceRink:show",
      ref: {},
      monIds: awayAliveIds(show.skaterIds, awayAliveIdSet(state), ICE_RINK_SLOTS),
      text: `「${name}」演出结束（${Math.max(0, Math.floor(Number(show.score) || 0))} 分${grade}），评分与限时增益待领取`,
    },
  ];
}

/** ML-17 花田蜜蜂工坊：照料完成、蜂蜜还没收取的蜂箱。 */
function listBeeReturnedUnits(state) {
  const hives = state?.meta?.beeWorkshop?.hives;
  if (!Array.isArray(hives)) return [];
  const validSet = awayAliveIdSet(state);
  const out = [];
  hives.slice(0, BEE_HIVE_COUNT).forEach((hive, idx) => {
    const trip = hive?.trip;
    if (!trip || typeof trip !== "object" || trip.phase !== "done") return;
    const jars = Array.isArray(trip.haul) ? trip.haul.length : 0;
    const name = BEE_HIVE_NAMES[idx] || `${idx + 1} 号蜂箱`;
    out.push({ key: `beeWorkshop:${idx}`, ref: { idx }, monIds: awayAliveIds(trip.keeperIds, validSet, BEE_SEATS), text: `「${name}」照料完成，${jars} 罐蜂蜜待收取` });
  });
  return out;
}

/**
 * ML-16 single list of everything the「一键收取已归来伙伴」button can collect, in registry order (non-mutating).
 * Each unit: { activityId, title, label, key, ref, monIds, text }.
 */
export function getAwayReturnedUnits(state) {
  const out = [];
  for (const act of AWAY_ACTIVITY_REGISTRY) {
    if (typeof act.returned !== "function") continue;
    for (const u of act.returned(state) || []) {
      if (!u || typeof u.key !== "string") continue;
      out.push({ activityId: act.id, title: act.title, label: act.label, key: u.key, ref: { ...(u.ref || {}) }, monIds: Array.isArray(u.monIds) ? u.monIds.slice() : [], text: u.text || "" });
    }
  }
  return out;
}

/** Partners that are back home in spirit but still locked as away until their unit is collected (non-mutating). */
export function getAwayReturnedMonIds(state) {
  const ids = new Set();
  for (const u of getAwayReturnedUnits(state)) for (const id of u.monIds) ids.add(id);
  return ids;
}
