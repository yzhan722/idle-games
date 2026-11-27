// collection/dock_observatory.js — ML-9 心愿码头 · ML-10 月光夜行观察站（由 collection_fun.js 原样拆出，对外仍从 ../collection_fun.js 引用）

import {
  getEcoSandboxBusyIds,
  getNonSandboxBusyIds,
  localYmdForSandbox,
  normalizeIdList,
  resolveMonTypesForEco,
} from "./camp.js";
import {
  TREASURE_DOCK_FRAGMENTS,
  grantTreasureMapFragments,
  noteTreasureObservatorySighting,
} from "./island_voyage.js";

// ============================================================================
// ML-9 「星海漂流瓶心愿码头」(Starsea Drift-Bottle Wish Dock)
// 闲置伙伴结伴远海拾贝 → 带回漂流瓶 → 开瓶读心愿回信、拾得海洋奇珍 → 铸造海洋奇珍纪念章（全产 / 闪光光环）
// ============================================================================

export const WISH_DOCK_DAILY_FREE_BOTTLES = 2;
export const WISH_DOCK_FREE_BREEZE_PER_DAY = 1;
export const WISH_DOCK_BREEZE_COIN_COST = 20;
export const WISH_DOCK_BADGE_MAX_LEVEL = 3;
export const WISH_DOCK_OPEN_BATCH = 10;
export const WISH_DOCK_BOTTLE_COIN = 6;
export const WISH_DOCK_LETTER_PROD_ADD = 0.004;

export const WISH_DOCK_ROUTES = Object.freeze([
  {
    id: "shoal",
    name: "星砂浅滩",
    subtitle: "退潮拾贝 · 星纹海贝常伴浪花",
    baseDurationSec: 600,
    maxCrew: 2,
    baseBottles: 2,
    preferredTypes: ["water", "wind", "light"],
    monExp: 160,
    rareChance: 0.1,
    favoredTreasure: "starShell",
  },
  {
    id: "reef",
    name: "珊瑚月礁",
    subtitle: "月潮漫礁 · 珊瑚枝与月辉珍珠",
    baseDurationSec: 1200,
    maxCrew: 3,
    baseBottles: 3,
    preferredTypes: ["water", "grass", "mystic"],
    monExp: 300,
    rareChance: 0.16,
    favoredTreasure: "moonPearl",
  },
  {
    id: "trench",
    name: "深蓝星渊航线",
    subtitle: "远海夜航 · 古舟星罗盘的传说",
    baseDurationSec: 2400,
    maxCrew: 3,
    baseBottles: 5,
    preferredTypes: ["water", "dark", "electric"],
    monExp: 520,
    rareChance: 0.24,
    favoredTreasure: "starCompass",
  },
]);

export const OCEAN_TREASURE_DEFS = Object.freeze([
  { id: "starShell", name: "星纹海贝", weight: 34, rarity: "common", desc: "贝壳上天然生成的星纹，据说能记住潮声" },
  { id: "dreamCoral", name: "绯梦珊瑚枝", weight: 28, rarity: "common", desc: "晚霞色的珊瑚枝，放在枕边会梦见海" },
  { id: "moonPearl", name: "月辉珍珠", weight: 24, rarity: "uncommon", desc: "只在满月潮汐里结成的珍珠，微微发光" },
  { id: "starCompass", name: "古舟星罗盘", weight: 14, rarity: "rare", desc: "远古航船遗落的罗盘，指针永远指向心愿" },
]);

export const OCEAN_BADGE_DEFS = Object.freeze([
  {
    id: "badgeStarShell",
    name: "星纹海贝纪念章",
    treasureId: "starShell",
    desc: "以星纹海贝镶嵌的纪念章，平衡增幅全资源产出与闪光奇遇。",
    costsByLevel: {
      1: { treasure: 3, res: {} },
      2: { treasure: 6, res: { futurecoin: 60 } },
      3: { treasure: 10, res: { futurecoin: 120, shinyStarSand: 2 } },
    },
    bonusesByLevel: {
      1: { prodAdd: 0.03, shinyAdd: 0.03 },
      2: { prodAdd: 0.06, shinyAdd: 0.06 },
      3: { prodAdd: 0.1, shinyAdd: 0.1 },
    },
  },
  {
    id: "badgeDreamCoral",
    name: "绯梦珊瑚纪念章",
    treasureId: "dreamCoral",
    desc: "珊瑚枝雕成的晚霞纪念章，大幅提升全资源产出。",
    costsByLevel: {
      1: { treasure: 3, res: {} },
      2: { treasure: 6, res: { futurecoin: 60 } },
      3: { treasure: 10, res: { futurecoin: 120, ancientGeneAmber: 2 } },
    },
    bonusesByLevel: {
      1: { prodAdd: 0.05, shinyAdd: 0.02 },
      2: { prodAdd: 0.1, shinyAdd: 0.04 },
      3: { prodAdd: 0.16, shinyAdd: 0.07 },
    },
  },
  {
    id: "badgeMoonPearl",
    name: "月辉珍珠纪念章",
    treasureId: "moonPearl",
    desc: "月辉珍珠串成的纪念章，显著提升闪光奇遇率。",
    costsByLevel: {
      1: { treasure: 3, res: {} },
      2: { treasure: 5, res: { futurecoin: 70 } },
      3: { treasure: 9, res: { futurecoin: 140, tuningMint: 1 } },
    },
    bonusesByLevel: {
      1: { prodAdd: 0.02, shinyAdd: 0.06 },
      2: { prodAdd: 0.04, shinyAdd: 0.12 },
      3: { prodAdd: 0.07, shinyAdd: 0.2 },
    },
  },
  {
    id: "badgeStarCompass",
    name: "古舟星罗盘纪念章",
    treasureId: "starCompass",
    desc: "以古舟星罗盘为芯的纪念章，兼顾产出与闪光，并缩短出海拾贝耗时。",
    costsByLevel: {
      1: { treasure: 2, res: {} },
      2: { treasure: 4, res: { futurecoin: 80 } },
      3: { treasure: 6, res: { futurecoin: 160, evolutionStone: 1 } },
    },
    bonusesByLevel: {
      1: { prodAdd: 0.03, shinyAdd: 0.04, tripSpeedAdd: 0.05 },
      2: { prodAdd: 0.07, shinyAdd: 0.08, tripSpeedAdd: 0.1 },
      3: { prodAdd: 0.12, shinyAdd: 0.13, tripSpeedAdd: 0.15 },
    },
  },
]);

/** 四枚纪念章全部铸造（Lv.1+）→「四海奇珍共鸣」；全部 Lv.3 →「满潮共鸣」再叠加一次。 */
export const OCEAN_BADGE_SET_BONUS = Object.freeze({ prodAdd: 0.05, shinyAdd: 0.08 });

export const WISH_REPLY_LETTERS = Object.freeze([
  { id: "letter_lighthouse", title: "灯塔守夜人的回信", body: "你说想看一场流星雨。今晚海风向南，灯塔会为你熄灯半刻，记得抬头。" },
  { id: "letter_whale", title: "鲸歌信使的回信", body: "瓶中愿望被一头老鲸读到了。它说：慢慢长大也没关系，大海从不催促潮汐。" },
  { id: "letter_baker", title: "海港面包坊的回信", body: "你许愿每天都有热乎的早餐。面包师把纸条贴在烤炉旁，明早多烤一炉星星可颂。" },
  { id: "letter_child", title: "小渔村孩子的回信", body: "我也捡到过一只漂流瓶，里面写着「要勇敢」。现在我把这句话转送给你。" },
  { id: "letter_starmap", title: "观星台学徒的回信", body: "你画的那颗小星星，我在星图上找到了它的位置。从此它有了名字，就叫你的名字。" },
  { id: "letter_seagull", title: "码头海鸥邮差的回信", body: "（纸角有一枚爪印）收到！愿望已投递至月亮邮局，回执将在下一次满潮时送达。" },
  { id: "letter_grandma", title: "织网奶奶的回信", body: "孩子，网要一结一结地织，日子也一样。今天辛苦了，晚饭多吃一碗。" },
  { id: "letter_coral", title: "珊瑚花园园丁的回信", body: "你想要一个小花园？我在礁石间为你种下一株绯梦珊瑚，十年后会开成一片晚霞。" },
  { id: "letter_captain", title: "远洋船长的回信", body: "愿望收到：「想去很远的地方」。下一班顺风的船，给你留一个靠窗的位置。" },
  { id: "letter_moon", title: "月光潮汐的回信", body: "潮水替月亮回信：你想念的人，此刻也正望着同一片海。" },
  { id: "letter_lantern", title: "灯笼节摊主的回信", body: "你许愿大家都平安。我把它写在今年最大的那盏灯笼上，整条街都看得见。" },
  { id: "letter_future", title: "一年后的你的回信", body: "别担心，那件让你犹豫的事，你做得很好。顺便，记得多喝水。" },
]);

export function getWishDockRouteDef(routeId) {
  return WISH_DOCK_ROUTES.find((r) => r.id === routeId) || null;
}

export function getOceanTreasureDef(treasureId) {
  return OCEAN_TREASURE_DEFS.find((t) => t.id === treasureId) || null;
}

export function getOceanBadgeDef(badgeId) {
  return OCEAN_BADGE_DEFS.find((b) => b.id === badgeId) || null;
}

export function getWishReplyLetter(letterId) {
  return WISH_REPLY_LETTERS.find((l) => l.id === letterId) || null;
}

export function ensureDriftBottleBucket(state) {
  if (!state || typeof state !== "object") return null;
  if (!state.res || typeof state.res !== "object") state.res = {};
  if (!state.res.driftBottle || typeof state.res.driftBottle !== "object") {
    state.res.driftBottle = { value: 0, cap: 999 };
  }
  if (typeof state.res.driftBottle.value !== "number" || !Number.isFinite(state.res.driftBottle.value)) {
    state.res.driftBottle.value = 0;
  }
  if (typeof state.res.driftBottle.cap !== "number" || state.res.driftBottle.cap <= 0) {
    state.res.driftBottle.cap = 999;
  }
  return state.res.driftBottle;
}

export function addResDirect(state, rid, amt, opts = {}) {
  const n = Math.max(0, Math.floor(Number(amt) || 0));
  if (n <= 0) return;
  if (typeof opts.addRes === "function") {
    opts.addRes(rid, n);
    return;
  }
  if (!state.res || typeof state.res !== "object") state.res = {};
  if (!state.res[rid] || typeof state.res[rid] !== "object") state.res[rid] = { value: 0, cap: 99999 };
  const cap = typeof state.res[rid].cap === "number" && state.res[rid].cap > 0 ? state.res[rid].cap : 99999;
  state.res[rid].value = Math.min(cap, Math.max(0, Number(state.res[rid].value) || 0) + n);
}

function emptyWishDockRoute(routeDef) {
  return {
    active: false,
    completed: false,
    crewIds: [],
    stagedIds: [],
    elapsedSec: 0,
    durationSec: routeDef.baseDurationSec,
    yieldMul: 1,
    bottles: 0,
    rareChance: routeDef.rareChance,
    startedAtMs: 0,
  };
}

export function ensureWishDockState(state) {
  if (!state || typeof state !== "object") return null;
  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  ensureDriftBottleBucket(state);
  const raw = state.meta.wishDock && typeof state.meta.wishDock === "object" ? state.meta.wishDock : {};
  const monList = Array.isArray(state?.mons?.list) ? state.mons.list : null;
  const aliveSet = monList
    ? new Set(
        monList
          .map((m) => (m && typeof m.id === "number" && Number.isFinite(m.id) ? Math.floor(m.id) : null))
          .filter((x) => x !== null && x > 0),
      )
    : null;

  const routes = {};
  const usedIds = new Set();
  const rawRoutes = raw.routes && typeof raw.routes === "object" ? raw.routes : {};
  for (const rDef of WISH_DOCK_ROUTES) {
    const rr = rawRoutes[rDef.id] && typeof rawRoutes[rDef.id] === "object" ? rawRoutes[rDef.id] : {};
    const crewIds = normalizeIdList(rr.crewIds, rDef.maxCrew, aliveSet).filter((id) => !usedIds.has(id));
    const active = Boolean(rr.active) && crewIds.length > 0;
    if (active) for (const id of crewIds) usedIds.add(id);
    const stagedIds = active
      ? []
      : normalizeIdList(rr.stagedIds, rDef.maxCrew, aliveSet).filter((id) => !usedIds.has(id));
    for (const id of stagedIds) usedIds.add(id);
    const durationSec =
      typeof rr.durationSec === "number" && Number.isFinite(rr.durationSec) && rr.durationSec >= 60
        ? Math.round(rr.durationSec)
        : rDef.baseDurationSec;
    const elapsedRaw =
      typeof rr.elapsedSec === "number" && Number.isFinite(rr.elapsedSec) && rr.elapsedSec >= 0 ? rr.elapsedSec : 0;
    const elapsedSec = active ? Math.min(durationSec, elapsedRaw) : 0;
    const completed = active && (Boolean(rr.completed) || elapsedSec >= durationSec);
    routes[rDef.id] = {
      ...emptyWishDockRoute(rDef),
      active,
      completed,
      crewIds: active ? crewIds : [],
      stagedIds,
      elapsedSec: completed ? durationSec : elapsedSec,
      durationSec,
      yieldMul:
        typeof rr.yieldMul === "number" && Number.isFinite(rr.yieldMul) && rr.yieldMul >= 1 ? Math.min(3, rr.yieldMul) : 1,
      bottles: active ? Math.max(0, Math.min(99, Math.floor(Number(rr.bottles) || 0))) : 0,
      rareChance:
        typeof rr.rareChance === "number" && Number.isFinite(rr.rareChance) && rr.rareChance >= 0
          ? Math.min(0.9, rr.rareChance)
          : rDef.rareChance,
      startedAtMs: typeof rr.startedAtMs === "number" && Number.isFinite(rr.startedAtMs) ? rr.startedAtMs : 0,
    };
  }

  const treasures = {};
  const rawTreasures = raw.treasures && typeof raw.treasures === "object" ? raw.treasures : {};
  for (const tDef of OCEAN_TREASURE_DEFS) {
    treasures[tDef.id] = Math.max(0, Math.min(9999, Math.floor(Number(rawTreasures[tDef.id]) || 0)));
  }

  const badges = {};
  const rawBadges = raw.badges && typeof raw.badges === "object" ? raw.badges : {};
  for (const bDef of OCEAN_BADGE_DEFS) {
    badges[bDef.id] = Math.max(0, Math.min(WISH_DOCK_BADGE_MAX_LEVEL, Math.floor(Number(rawBadges[bDef.id]) || 0)));
  }

  const validLetterIds = new Set(WISH_REPLY_LETTERS.map((l) => l.id));
  const lettersRead = Array.isArray(raw.lettersRead)
    ? Array.from(new Set(raw.lettersRead.filter((id) => typeof id === "string" && validLetterIds.has(id))))
    : [];
  const recentLetters = Array.isArray(raw.recentLetters)
    ? raw.recentLetters
        .filter((r) => r && typeof r === "object" && validLetterIds.has(r.id))
        .slice(0, 3)
        .map((r) => ({
          id: r.id,
          from: typeof r.from === "string" && r.from ? r.from.slice(0, 24) : "海风",
          routeName: typeof r.routeName === "string" && r.routeName ? r.routeName.slice(0, 24) : "潮汐",
          at: typeof r.at === "number" && Number.isFinite(r.at) ? r.at : 0,
        }))
    : [];
  const recentCarriers = Array.isArray(raw.recentCarriers)
    ? raw.recentCarriers
        .filter((c) => c && typeof c === "object" && typeof c.name === "string" && c.name)
        .slice(0, 6)
        .map((c) => ({ name: c.name.slice(0, 24), routeName: typeof c.routeName === "string" ? c.routeName.slice(0, 24) : "" }))
    : [];
  const recentLogs = Array.isArray(raw.recentLogs)
    ? raw.recentLogs.filter((s) => typeof s === "string" && s.trim().length > 0).slice(0, 6)
    : [];

  const clean = {
    initialized: true,
    routes,
    treasures,
    badges,
    lettersRead,
    recentLetters,
    recentCarriers,
    dailyClaimDate: typeof raw.dailyClaimDate === "string" ? raw.dailyClaimDate : "",
    breezeDate: typeof raw.breezeDate === "string" ? raw.breezeDate : "",
    breezeUsed: Math.max(0, Math.floor(Number(raw.breezeUsed) || 0)),
    totalTrips: Math.max(0, Math.floor(Number(raw.totalTrips) || 0)),
    totalBottlesFound: Math.max(0, Math.floor(Number(raw.totalBottlesFound) || 0)),
    totalBottlesOpened: Math.max(0, Math.floor(Number(raw.totalBottlesOpened) || 0)),
    totalTreasures: Math.max(0, Math.floor(Number(raw.totalTreasures) || 0)),
    totalBadgeForges: Math.max(0, Math.floor(Number(raw.totalBadgeForges) || 0)),
    recentLogs,
  };

  if (state.meta.wishDock && typeof state.meta.wishDock === "object") {
    Object.assign(state.meta.wishDock, clean);
    return state.meta.wishDock;
  }
  state.meta.wishDock = clean;
  return clean;
}

/** Non-mutating read: partner IDs physically away on an active (or completed-but-unclaimed) dock trip — protected in busyMonIds. */
export function getWishDockAwayMonIds(state) {
  const ids = new Set();
  const routes = state?.meta?.wishDock?.routes;
  if (!routes || typeof routes !== "object") return ids;
  const monList = Array.isArray(state?.mons?.list) ? state.mons.list : null;
  const validSet = monList
    ? new Set(monList.filter((m) => m && typeof m.id === "number").map((m) => Math.floor(m.id)))
    : null;
  for (const rDef of WISH_DOCK_ROUTES) {
    const r = routes[rDef.id];
    if (!r || typeof r !== "object" || !r.active) continue;
    for (const raw of Array.isArray(r.crewIds) ? r.crewIds : []) {
      const id = Math.floor(Number(raw) || 0);
      if (id > 0 && (!validSet || validSet.has(id))) ids.add(id);
    }
  }
  return ids;
}

function getWishDockStagedMonIds(state, excludeRouteId = null) {
  const ids = new Set();
  const routes = state?.meta?.wishDock?.routes;
  if (!routes || typeof routes !== "object") return ids;
  for (const [rid, r] of Object.entries(routes)) {
    if (excludeRouteId && rid === excludeRouteId) continue;
    if (!r || typeof r !== "object" || r.active) continue;
    for (const raw of Array.isArray(r.stagedIds) ? r.stagedIds : []) {
      const id = Math.floor(Number(raw) || 0);
      if (id > 0) ids.add(id);
    }
  }
  return ids;
}

/** Idle partners eligible for a dock route: not busy in training/expedition/PvE/breeding/camp/eco-sandbox/other dock routes. */
export function getIdleWishDockCandidates(state, routeId = null) {
  const list = Array.isArray(state?.mons?.list) ? state.mons.list.filter(Boolean) : [];
  const extBusy = getNonSandboxBusyIds(state);
  const ecoBusy = getEcoSandboxBusyIds(state);
  const dockStaged = getWishDockStagedMonIds(state, routeId);
  return list.filter(
    (m) => m && typeof m.id === "number" && !extBusy.has(m.id) && !ecoBusy.has(m.id) && !dockStaged.has(m.id),
  );
}

export function evaluateWishDockCrew(routeId, crewMons, state = null, opts = {}) {
  const route = getWishDockRouteDef(routeId);
  if (!route) {
    return { yieldMul: 1, durationSec: 600, bottles: 0, rareChance: 0, matchedTypeCount: 0, shinyCount: 0, monExp: 0, crewCount: 0 };
  }
  const mons = (Array.isArray(crewMons) ? crewMons.filter(Boolean) : []).slice(0, route.maxCrew);
  const pref = new Set(route.preferredTypes);
  let score = 0;
  let matchedTypeCount = 0;
  let shinyCount = 0;
  for (const m of mons) {
    score += 0.1;
    const hits = resolveMonTypesForEco(m, opts).filter((t) => pref.has(t)).length;
    if (hits >= 2) {
      score += 0.3;
      matchedTypeCount += 2;
    } else if (hits === 1) {
      score += 0.18;
      matchedTypeCount += 1;
    }
    const lvl = Math.max(1, Math.min(100, Math.floor(Number(m.lvl) || 1)));
    const stars = Math.max(0, Math.min(5, Math.floor(Number(m.stars) || 0)));
    score += lvl / 500 + stars * 0.04;
    if (m.isShiny) {
      score += 0.1;
      shinyCount += 1;
    }
  }
  const yieldMul = Math.round(Math.min(2.4, Math.max(1, 1 + score)) * 100) / 100;
  const aura = state ? computeWishDockAura(state) : { tripSpeedAdd: 0 };
  const speedReduce = Math.min(0.4, aura.tripSpeedAdd || 0);
  const durationSec = Math.max(120, Math.round(route.baseDurationSec * (1 - speedReduce)));
  const bottles = mons.length ? Math.max(1, Math.round(route.baseBottles * yieldMul)) : 0;
  const rareChance =
    Math.round(Math.min(0.85, route.rareChance + shinyCount * 0.06 + (yieldMul - 1) * 0.1) * 10000) / 10000;
  return {
    yieldMul,
    durationSec,
    bottles,
    rareChance,
    matchedTypeCount,
    shinyCount,
    monExp: mons.length ? Math.max(20, Math.round(route.monExp * yieldMul)) : 0,
    crewCount: mons.length,
  };
}

function scoreMonForWishDock(mon, route, opts = {}) {
  if (!mon || !route) return -1;
  const pref = new Set(route.preferredTypes);
  const hits = resolveMonTypesForEco(mon, opts).filter((t) => pref.has(t)).length;
  const lvl = Math.max(1, Math.floor(Number(mon.lvl) || 1));
  const stars = Math.max(0, Math.floor(Number(mon.stars) || 0));
  return hits * 1000 + (mon.isShiny ? 400 : 0) + stars * 120 + lvl * 6;
}

export function toggleWishDockStagedMon(state, routeId, monId) {
  const dock = ensureWishDockState(state);
  const route = getWishDockRouteDef(routeId);
  if (!dock || !route) return { ok: false, reason: "unknown_route" };
  const r = dock.routes[routeId];
  if (r.active) return { ok: false, reason: "route_busy" };
  const id = Math.floor(Number(monId));
  if (!Number.isFinite(id) || id <= 0) return { ok: false, reason: "invalid_mon" };
  if (r.stagedIds.includes(id)) {
    r.stagedIds = r.stagedIds.filter((x) => x !== id);
    return { ok: true, stagedIds: r.stagedIds.slice() };
  }
  if (r.stagedIds.length >= route.maxCrew) return { ok: false, reason: "crew_full" };
  const idleSet = new Set(getIdleWishDockCandidates(state, routeId).map((m) => m.id));
  if (!idleSet.has(id)) return { ok: false, reason: "mon_busy" };
  r.stagedIds.push(id);
  return { ok: true, stagedIds: r.stagedIds.slice() };
}

export function autoPickWishDockCrew(state, routeId, opts = {}) {
  const dock = ensureWishDockState(state);
  const route = getWishDockRouteDef(routeId);
  if (!dock || !route) return { ok: false, reason: "unknown_route" };
  const r = dock.routes[routeId];
  if (r.active) return { ok: false, reason: "route_busy" };
  const candidates = getIdleWishDockCandidates(state, routeId);
  if (!candidates.length) {
    r.stagedIds = [];
    return { ok: false, reason: "no_idle_mons", stagedIds: [] };
  }
  const picked = candidates
    .slice()
    .sort((a, b) => scoreMonForWishDock(b, route, opts) - scoreMonForWishDock(a, route, opts) || (a.id || 0) - (b.id || 0))
    .slice(0, route.maxCrew)
    .map((m) => m.id);
  r.stagedIds = picked;
  return { ok: true, stagedIds: picked.slice() };
}

export function dispatchWishDockRoute(state, routeId, crewIdsOpt = null, opts = {}) {
  const dock = ensureWishDockState(state);
  const route = getWishDockRouteDef(routeId);
  if (!dock || !route) return { ok: false, reason: "unknown_route" };
  const r = dock.routes[routeId];
  if (r.active) return { ok: false, reason: "already_active" };
  const idleById = new Map(getIdleWishDockCandidates(state, routeId).map((m) => [m.id, m]));
  const rawIds = Array.isArray(crewIdsOpt) ? crewIdsOpt : r.stagedIds;
  const validIds = normalizeIdList(rawIds, route.maxCrew).filter((id) => idleById.has(id));
  if (!validIds.length) return { ok: false, reason: "empty_or_busy_crew" };
  const crewMons = validIds.map((id) => idleById.get(id)).filter(Boolean);
  const ev = evaluateWishDockCrew(routeId, crewMons, state, opts);
  const ts = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  r.active = true;
  r.completed = false;
  r.crewIds = validIds;
  r.stagedIds = [];
  r.elapsedSec = 0;
  r.durationSec = ev.durationSec;
  r.yieldMul = ev.yieldMul;
  r.bottles = ev.bottles;
  r.rareChance = ev.rareChance;
  r.startedAtMs = ts;
  const names = crewMons.map((m) => m.name || "伙伴").join("、");
  const logLine = `【扬帆出海】${names} 结伴前往「${route.name}」拾贝，预计带回漂流瓶 ×${ev.bottles}（出海期间防放生保护生效）`;
  dock.recentLogs = [logLine, ...(dock.recentLogs || [])].slice(0, 6);
  return { ok: true, routeId, crewIds: validIds.slice(), durationSec: ev.durationSec, bottles: ev.bottles, yieldMul: ev.yieldMul, logLine };
}

export function autoDispatchAllWishDock(state, opts = {}) {
  const dock = ensureWishDockState(state);
  if (!dock) return { ok: false, dispatched: [] };
  const dispatched = [];
  for (const rDef of WISH_DOCK_ROUTES) {
    const r = dock.routes[rDef.id];
    if (r.active) continue;
    if (!r.stagedIds.length) {
      const picked = autoPickWishDockCrew(state, rDef.id, opts);
      if (!picked.ok) continue;
    }
    const res = dispatchWishDockRoute(state, rDef.id, null, opts);
    if (res.ok) dispatched.push(rDef.id);
  }
  return { ok: dispatched.length > 0, dispatched };
}

export function recallWishDockRoute(state, routeId) {
  const dock = ensureWishDockState(state);
  const route = getWishDockRouteDef(routeId);
  if (!dock || !route) return { ok: false, reason: "unknown_route" };
  const r = dock.routes[routeId];
  if (!r.active) return { ok: false, reason: "not_active" };
  const prev = r.crewIds.slice();
  r.active = false;
  r.completed = false;
  r.crewIds = [];
  r.elapsedSec = 0;
  r.bottles = 0;
  const idleSet = new Set(getIdleWishDockCandidates(state, routeId).map((m) => m.id));
  r.stagedIds = prev.filter((id) => idleSet.has(id));
  return { ok: true, routeId };
}

/** Advances active dock trips by dtSec (live tick + offline catch-up). Reads raw state; no-op for saves without a dock. */
export function advanceWishDock(state, dtSec) {
  const routes = state?.meta?.wishDock?.routes;
  if (!routes || typeof routes !== "object") return { newlyCompleted: [] };
  const step = typeof dtSec === "number" && Number.isFinite(dtSec) && dtSec > 0 ? dtSec : 0;
  const newlyCompleted = [];
  for (const rDef of WISH_DOCK_ROUTES) {
    const r = routes[rDef.id];
    if (!r || typeof r !== "object" || !r.active || r.completed) continue;
    const dur =
      typeof r.durationSec === "number" && Number.isFinite(r.durationSec) && r.durationSec > 0 ? r.durationSec : rDef.baseDurationSec;
    const prev = typeof r.elapsedSec === "number" && Number.isFinite(r.elapsedSec) ? r.elapsedSec : 0;
    r.elapsedSec = Math.min(dur, prev + step);
    if (r.elapsedSec >= dur) {
      r.elapsedSec = dur;
      r.completed = true;
      newlyCompleted.push(rDef.id);
    }
  }
  return { newlyCompleted };
}

export function getWishDockBreezeLeft(state, nowMs = Date.now()) {
  const dock = state?.meta?.wishDock;
  if (!dock || typeof dock !== "object") return WISH_DOCK_FREE_BREEZE_PER_DAY;
  if (dock.breezeDate !== localYmdForSandbox(nowMs)) return WISH_DOCK_FREE_BREEZE_PER_DAY;
  return Math.max(0, WISH_DOCK_FREE_BREEZE_PER_DAY - Math.floor(Number(dock.breezeUsed) || 0));
}

/** 「顺风速航」: instantly completes an active trip — free once per day, then futurecoin ×20. */
export function breezeCompleteWishDockRoute(state, routeId, opts = {}) {
  const dock = ensureWishDockState(state);
  const route = getWishDockRouteDef(routeId);
  if (!dock || !route) return { ok: false, reason: "unknown_route" };
  const r = dock.routes[routeId];
  if (!r.active) return { ok: false, reason: "not_active" };
  if (r.completed) return { ok: true, costKind: "already_done" };
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const today = localYmdForSandbox(nowMs);
  if (dock.breezeDate !== today) {
    dock.breezeDate = today;
    dock.breezeUsed = 0;
  }
  let costKind = "";
  if (dock.breezeUsed < WISH_DOCK_FREE_BREEZE_PER_DAY) {
    dock.breezeUsed += 1;
    costKind = "free_daily";
  } else if ((Number(state.res?.futurecoin?.value) || 0) >= WISH_DOCK_BREEZE_COIN_COST) {
    state.res.futurecoin.value = Math.max(0, Math.floor(state.res.futurecoin.value) - WISH_DOCK_BREEZE_COIN_COST);
    costKind = "futurecoin";
  } else {
    return { ok: false, reason: "insufficient_breeze_cost" };
  }
  r.elapsedSec = r.durationSec;
  r.completed = true;
  return { ok: true, routeId, costKind };
}

function pickOceanTreasureId(rng) {
  const total = OCEAN_TREASURE_DEFS.reduce((s, t) => s + t.weight, 0);
  let roll = Math.max(0, Math.min(0.999999, Number(rng()) || 0)) * total;
  for (const t of OCEAN_TREASURE_DEFS) {
    if (roll < t.weight) return t.id;
    roll -= t.weight;
  }
  return OCEAN_TREASURE_DEFS[0].id;
}

export function claimWishDockRoute(state, routeId, opts = {}) {
  const dock = ensureWishDockState(state);
  const route = getWishDockRouteDef(routeId);
  if (!dock || !route) return { ok: false, reason: "unknown_route" };
  const r = dock.routes[routeId];
  if (!r.active || !r.completed) return { ok: false, reason: "not_ready" };
  const rng = typeof opts.randFloat === "function" ? opts.randFloat : Math.random;
  const list = Array.isArray(state.mons?.list) ? state.mons.list : [];
  const crewMons = r.crewIds.map((id) => list.find((m) => m && m.id === id)).filter(Boolean);

  const bottles = Math.max(1, Math.floor(r.bottles || route.baseBottles));
  const bucket = ensureDriftBottleBucket(state);
  bucket.value = Math.min(bucket.cap || 999, Math.max(0, Number(bucket.value) || 0) + bottles);

  const expPerMon = Math.max(20, Math.round(route.monExp * (r.yieldMul || 1)));
  for (const m of crewMons) {
    if (typeof opts.addExpToMon === "function") opts.addExpToMon(m, expPerMon);
    else m.exp = Math.max(0, Math.floor((Number(m.exp) || 0) + expPerMon));
  }

  let bonusTreasure = null;
  if (rng() < (r.rareChance ?? route.rareChance)) {
    const tid = route.favoredTreasure || pickOceanTreasureId(rng);
    dock.treasures[tid] = Math.min(9999, (dock.treasures[tid] || 0) + 1);
    dock.totalTreasures = (dock.totalTreasures || 0) + 1;
    bonusTreasure = { id: tid, name: getOceanTreasureDef(tid)?.name || tid };
  }

  const carriers = crewMons.map((m) => ({ name: String(m.name || "伙伴").slice(0, 24), routeName: route.name }));
  dock.recentCarriers = [...carriers, ...(dock.recentCarriers || [])].slice(0, 6);
  dock.totalTrips = (dock.totalTrips || 0) + 1;
  dock.totalBottlesFound = (dock.totalBottlesFound || 0) + bottles;

  const prevCrew = r.crewIds.slice();
  r.active = false;
  r.completed = false;
  r.crewIds = [];
  r.elapsedSec = 0;
  r.bottles = 0;
  const idleSet = new Set(getIdleWishDockCandidates(state, routeId).map((m) => m.id));
  r.stagedIds = prevCrew.filter((id) => idleSet.has(id));

  let redispatched = false;
  if (opts.redispatch) {
    if (!r.stagedIds.length) autoPickWishDockCrew(state, routeId, opts);
    redispatched = Boolean(dispatchWishDockRoute(state, routeId, null, opts).ok);
  }

  // ML-12 寻宝地图远航：归港船员顺手带回藏宝图残片（浅滩 / 月礁 ×1，星渊 ×2）
  const mapFragments = grantTreasureMapFragments(state, "dock", TREASURE_DOCK_FRAGMENTS[route.id] ?? 1, opts);
  const bonusTxt = bonusTreasure ? `，还顺手捞起稀有「${bonusTreasure.name}」` : "";
  const fragTxt = mapFragments > 0 ? `，藏宝图残片 +${mapFragments}` : "";
  const logLine = `【满载归港】「${route.name}」船员带回漂流瓶 ×${bottles}${bonusTxt}${fragTxt}（船员经验 +${expPerMon}）`;
  dock.recentLogs = [logLine, ...(dock.recentLogs || [])].slice(0, 6);
  return {
    ok: true,
    routeId,
    routeName: route.name,
    bottles,
    expPerMon,
    bonusTreasure,
    mapFragments,
    redispatched,
    crewCount: crewMons.length,
    logLine,
  };
}

export function claimAllWishDockRoutes(state, opts = {}) {
  const dock = ensureWishDockState(state);
  if (!dock) return { ok: false, claimed: [], totalBottles: 0, bonusTreasures: [] };
  const claimed = [];
  const bonusTreasures = [];
  let totalBottles = 0;
  let mapFragments = 0;
  for (const rDef of WISH_DOCK_ROUTES) {
    const r = dock.routes[rDef.id];
    if (!r.active || !r.completed) continue;
    const res = claimWishDockRoute(state, rDef.id, opts);
    if (res.ok) {
      claimed.push(res);
      totalBottles += res.bottles;
      mapFragments += res.mapFragments || 0;
      if (res.bonusTreasure) bonusTreasures.push(res.bonusTreasure);
    }
  }
  return { ok: claimed.length > 0, claimed, totalBottles, bonusTreasures, mapFragments };
}

export function canClaimDailyDriftBottles(state, nowMs = Date.now()) {
  const dock = state?.meta?.wishDock;
  const claimed = dock && typeof dock === "object" ? dock.dailyClaimDate : "";
  return claimed !== localYmdForSandbox(nowMs);
}

/** 「潮汐馈赠」: free +2 drift bottles once per local day. */
export function claimDailyDriftBottles(state, opts = {}) {
  const dock = ensureWishDockState(state);
  if (!dock) return { ok: false, reason: "invalid_state" };
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const today = localYmdForSandbox(nowMs);
  if (dock.dailyClaimDate === today) return { ok: false, reason: "already_claimed_today" };
  dock.dailyClaimDate = today;
  const bucket = ensureDriftBottleBucket(state);
  bucket.value = Math.min(bucket.cap || 999, Math.max(0, Number(bucket.value) || 0) + WISH_DOCK_DAILY_FREE_BOTTLES);
  const logLine = `【潮汐馈赠】清晨的浪花把漂流瓶 ×${WISH_DOCK_DAILY_FREE_BOTTLES} 推上了码头，快拆开读读心愿回信吧！`;
  dock.recentLogs = [logLine, ...(dock.recentLogs || [])].slice(0, 6);
  return { ok: true, gained: WISH_DOCK_DAILY_FREE_BOTTLES, totalBottles: bucket.value, logLine };
}

export function canOpenDriftBottles(state) {
  return Math.floor(Number(state?.res?.driftBottle?.value) || 0) >= 1;
}

/** Opens up to WISH_DOCK_OPEN_BATCH drift bottles: each yields one wish-reply letter, one ocean treasure and futurecoin ×6. */
export function openDriftBottles(state, count = 1, opts = {}) {
  const dock = ensureWishDockState(state);
  if (!dock) return { ok: false, reason: "invalid_state" };
  const bucket = ensureDriftBottleBucket(state);
  const have = Math.max(0, Math.floor(Number(bucket.value) || 0));
  const n = Math.max(0, Math.min(WISH_DOCK_OPEN_BATCH, Math.floor(Number(count) || 0), have));
  if (n <= 0) return { ok: false, reason: "no_bottles" };
  const rng = typeof opts.randFloat === "function" ? opts.randFloat : Math.random;
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const pickIdx = (len) => Math.max(0, Math.min(len - 1, Math.floor((Number(rng()) || 0) * len)));

  const letters = [];
  const treasures = {};
  let newLetters = 0;
  for (let i = 0; i < n; i += 1) {
    const unread = WISH_REPLY_LETTERS.filter((l) => !dock.lettersRead.includes(l.id));
    const letter =
      unread.length > 0 && rng() < 0.65 ? unread[pickIdx(unread.length)] : WISH_REPLY_LETTERS[pickIdx(WISH_REPLY_LETTERS.length)];
    const isNew = !dock.lettersRead.includes(letter.id);
    if (isNew) {
      dock.lettersRead.push(letter.id);
      newLetters += 1;
    }
    const carrier = dock.recentCarriers.length > 0 ? dock.recentCarriers[pickIdx(dock.recentCarriers.length)] : null;
    letters.push({
      id: letter.id,
      title: letter.title,
      body: letter.body,
      from: carrier?.name || "海风",
      routeName: carrier?.routeName || "潮汐",
      isNew,
    });
    const tid = pickOceanTreasureId(rng);
    dock.treasures[tid] = Math.min(9999, (dock.treasures[tid] || 0) + 1);
    treasures[tid] = (treasures[tid] || 0) + 1;
  }

  bucket.value = Math.max(0, have - n);
  const coins = n * WISH_DOCK_BOTTLE_COIN;
  addResDirect(state, "futurecoin", coins, opts);
  dock.totalBottlesOpened = (dock.totalBottlesOpened || 0) + n;
  dock.totalTreasures = (dock.totalTreasures || 0) + n;
  const recent = letters
    .slice()
    .reverse()
    .map((l) => ({ id: l.id, from: l.from, routeName: l.routeName, at: nowMs }));
  dock.recentLetters = [...recent, ...(dock.recentLetters || [])].slice(0, 3);

  const treasureTxt = Object.entries(treasures)
    .map(([tid, amt]) => `${getOceanTreasureDef(tid)?.name || tid} ×${amt}`)
    .join("、");
  const logLine = `【拆瓶读信】开启漂流瓶 ×${n}：收到心愿回信 ${n} 封${newLetters > 0 ? `（新信笺 ${newLetters} 封）` : ""}，拾得 ${treasureTxt}，未来币 +${coins}`;
  dock.recentLogs = [logLine, ...(dock.recentLogs || [])].slice(0, 6);
  return { ok: true, opened: n, letters, treasures, coins, newLetters, remainingBottles: bucket.value, logLine };
}

export function getOceanBadgeNextCost(state, badgeId) {
  const def = getOceanBadgeDef(badgeId);
  if (!def) return null;
  const cur = Math.max(0, Math.min(WISH_DOCK_BADGE_MAX_LEVEL, Math.floor(Number(state?.meta?.wishDock?.badges?.[badgeId]) || 0)));
  if (cur >= WISH_DOCK_BADGE_MAX_LEVEL) return null;
  return def.costsByLevel[cur + 1] || null;
}

export function canForgeOceanBadge(state, badgeId) {
  const def = getOceanBadgeDef(badgeId);
  const cost = getOceanBadgeNextCost(state, badgeId);
  if (!def || !cost) return false;
  const haveTreasure = Math.floor(Number(state?.meta?.wishDock?.treasures?.[def.treasureId]) || 0);
  if (haveTreasure < cost.treasure) return false;
  for (const [rid, need] of Object.entries(cost.res || {})) {
    if ((Number(state?.res?.[rid]?.value) || 0) < need) return false;
  }
  return true;
}

/** Forges (Lv.1) or upgrades (Lv.2~3) an Ocean Treasure Commemorative Badge (海洋奇珍纪念章). */
export function forgeOceanBadge(state, badgeId) {
  const dock = ensureWishDockState(state);
  const def = getOceanBadgeDef(badgeId);
  if (!dock || !def) return { ok: false, reason: "unknown_badge" };
  const cur = dock.badges[def.id] || 0;
  if (cur >= WISH_DOCK_BADGE_MAX_LEVEL) return { ok: false, reason: "max_level" };
  if (!canForgeOceanBadge(state, badgeId)) return { ok: false, reason: "insufficient_materials" };
  const cost = def.costsByLevel[cur + 1];
  dock.treasures[def.treasureId] = Math.max(0, (dock.treasures[def.treasureId] || 0) - cost.treasure);
  for (const [rid, need] of Object.entries(cost.res || {})) {
    state.res[rid].value = Math.max(0, (Number(state.res[rid].value) || 0) - need);
  }
  dock.badges[def.id] = cur + 1;
  dock.totalBadgeForges = (dock.totalBadgeForges || 0) + 1;
  const logLine = `【奇珍铸章】「${def.name}」${cur === 0 ? "铸造完成" : `升阶至 Lv.${cur + 1}`}，海洋奇珍光环增强！`;
  dock.recentLogs = [logLine, ...(dock.recentLogs || [])].slice(0, 6);
  return { ok: true, badgeId: def.id, badgeName: def.name, level: cur + 1, logLine };
}

/** Removes a partner from any dock crew / staging (used on forced release); empties a trip whose crew is gone. */
export function detachWishDockMon(state, monId) {
  const routes = state?.meta?.wishDock?.routes;
  const id = Math.floor(Number(monId) || 0);
  if (!routes || typeof routes !== "object" || id <= 0) return { ok: false, detached: false };
  let detached = false;
  for (const r of Object.values(routes)) {
    if (!r || typeof r !== "object") continue;
    if (Array.isArray(r.crewIds) && r.crewIds.includes(id)) {
      r.crewIds = r.crewIds.filter((x) => x !== id);
      detached = true;
      if (!r.crewIds.length) {
        r.active = false;
        r.completed = false;
        r.elapsedSec = 0;
        r.bottles = 0;
      }
    }
    if (Array.isArray(r.stagedIds) && r.stagedIds.includes(id)) {
      r.stagedIds = r.stagedIds.filter((x) => x !== id);
      detached = true;
    }
  }
  return { ok: true, detached };
}

/** Pure non-mutating aggregator: Ocean Treasure badge aura for all-production, shiny odds and dock trip speed. */
export function computeWishDockAura(state) {
  const raw = state?.meta?.wishDock;
  const maxTotalLevels = OCEAN_BADGE_DEFS.length * WISH_DOCK_BADGE_MAX_LEVEL;
  if (!raw || typeof raw !== "object") {
    return {
      badgeCount: 0,
      totalLevels: 0,
      maxTotalLevels,
      setResonance: false,
      fullTide: false,
      lettersCollected: 0,
      lettersTotal: WISH_REPLY_LETTERS.length,
      prodAdd: 0,
      prodMul: 1,
      shinyAdd: 0,
      shinyChanceMul: 1,
      tripSpeedAdd: 0,
    };
  }
  const rawBadges = raw.badges && typeof raw.badges === "object" ? raw.badges : {};
  let badgeCount = 0;
  let totalLevels = 0;
  let maxedCount = 0;
  let prodAdd = 0;
  let shinyAdd = 0;
  let tripSpeedAdd = 0;
  for (const def of OCEAN_BADGE_DEFS) {
    const lvl = Math.max(0, Math.min(WISH_DOCK_BADGE_MAX_LEVEL, Math.floor(Number(rawBadges[def.id]) || 0)));
    if (lvl <= 0) continue;
    badgeCount += 1;
    totalLevels += lvl;
    if (lvl >= WISH_DOCK_BADGE_MAX_LEVEL) maxedCount += 1;
    const b = def.bonusesByLevel[lvl] || {};
    prodAdd += b.prodAdd || 0;
    shinyAdd += b.shinyAdd || 0;
    tripSpeedAdd += b.tripSpeedAdd || 0;
  }
  const setResonance = badgeCount >= OCEAN_BADGE_DEFS.length;
  const fullTide = maxedCount >= OCEAN_BADGE_DEFS.length;
  if (setResonance) {
    prodAdd += OCEAN_BADGE_SET_BONUS.prodAdd;
    shinyAdd += OCEAN_BADGE_SET_BONUS.shinyAdd;
  }
  if (fullTide) {
    prodAdd += OCEAN_BADGE_SET_BONUS.prodAdd;
    shinyAdd += OCEAN_BADGE_SET_BONUS.shinyAdd;
  }
  const validLetterIds = new Set(WISH_REPLY_LETTERS.map((l) => l.id));
  const lettersCollected = Array.isArray(raw.lettersRead)
    ? new Set(raw.lettersRead.filter((id) => validLetterIds.has(id))).size
    : 0;
  prodAdd += lettersCollected * WISH_DOCK_LETTER_PROD_ADD;

  const round4 = (n) => Math.round(n * 10000) / 10000;
  prodAdd = round4(Math.min(0.6, prodAdd));
  shinyAdd = round4(Math.min(0.9, shinyAdd));
  tripSpeedAdd = round4(Math.min(0.4, tripSpeedAdd));
  return {
    badgeCount,
    totalLevels,
    maxTotalLevels,
    setResonance,
    fullTide,
    lettersCollected,
    lettersTotal: WISH_REPLY_LETTERS.length,
    prodAdd,
    prodMul: round4(1 + prodAdd),
    shinyAdd,
    shinyChanceMul: round4(1 + shinyAdd),
    tripSpeedAdd,
  };
}

// ============================================================================
// ML-10 「月光夜行生态观察站」(Moonlit Nocturnal Eco Observatory)
// 本地时段：19:00~次日 05:00 为「夜观时段」（全效观测 · 全部夜行萌灵现身 · 夜间产出光环 100%）；
// 其余时段为「暮光微光模式」（观测效率 40% · 仅常见/少见夜行萌灵现身 · 光环 40%），白天玩家不会被完全锁在门外。
// 派驻伙伴（≤3）持续记录夜行萌灵出没 → 观察日记 / 萤火灯笼 → 唤醒夜行限定形态（外观 + 小幅属性）。
// 派驻中的伙伴接入 busyMonIds 防放生锁（与 ML-9 心愿码头同一套路）。
// ============================================================================

export const NIGHT_OBS_OPEN_HOUR = 19;
export const NIGHT_OBS_CLOSE_HOUR = 5;
export const NIGHT_OBS_MAX_STATION = 3;
export const NIGHT_OBS_CYCLE_SEC = 600;
export const NIGHT_OBS_DUSK_SIGHTING_MUL = 0.4;
export const NIGHT_OBS_DUSK_AURA_MUL = 0.4;
export const NIGHT_OBS_MAX_CATCHUP_SEC = 12 * 3600;
export const NIGHT_OBS_MAX_SIGHTINGS_PER_STEP = 48;
export const NIGHT_OBS_JOURNAL_KEEP = 20;
export const NIGHT_OBS_PATROL_SIGHTINGS = 3;
export const NIGHT_OBS_FREE_PATROL_PER_DAY = 1;
export const NIGHT_OBS_PATROL_COIN_COST = 25;
export const NIGHT_OBS_FORM_TALLY_REQ = 3;
export const NIGHT_OBS_FORM_COST = Object.freeze({ fireflyLantern: 4, futurecoin: 40 });
/** 夜视契合属性：派驻伙伴拥有其一即提升观测效率。 */
export const NIGHT_OBS_AFFINE_TYPES = Object.freeze(["dark", "light", "mystic", "wind"]);

/** 12 种夜行萌灵（取自原创灵兽名录，夜观时段限定的 5 种在暮光微光模式下不会现身）。 */
export const NOCTURNAL_CREATURE_DEFS = Object.freeze([
  { id: "nc_dusk_bat", dex: 41, name: "幽谷夜蝠", rarity: "common", weight: 30, nightOnly: false, lantern: 1, lureTypes: ["dark", "wind"], note: "倒挂在观察站屋檐下，用蓝色音波环把整座山谷的轮廓画给我们看。" },
  { id: "nc_star_sprout", dex: 43, name: "星夜曼陀芽", rarity: "common", weight: 30, nightOnly: false, lantern: 1, lureTypes: ["grass", "dark"], note: "白天把自己埋进土里装睡，太阳一落山就探出星光眼睛打量路人。" },
  { id: "nc_amethyst_bunny", dex: 29, name: "紫晶幼兔", rarity: "common", weight: 28, nightOnly: false, lantern: 1, lureTypes: ["dark", "light"], note: "额上的紫晶在月下微微发亮，嚼夜光浆果时耳朵会一抖一抖。" },
  { id: "nc_crescent_cub", dex: 216, name: "新月蜜熊崽", rarity: "common", weight: 26, nightOnly: false, lantern: 1, lureTypes: ["wind", "grass"], note: "循着蜂蜜味摸到观察站门口，额头的金月把门牌照得一清二楚。" },
  { id: "nc_moon_fairy", dex: 35, name: "月咏花仙", rarity: "uncommon", weight: 16, nightOnly: false, lantern: 1, lureTypes: ["light", "mystic"], note: "三五成群在湖畔转圈跳舞，脚尖点过的水面开出一圈圈月光。" },
  { id: "nc_pumpkin_lamp", dex: 710, name: "幽火南瓜灵", rarity: "uncommon", weight: 15, nightOnly: false, lantern: 2, lureTypes: ["fire", "grass"], note: "提着肚子里的琥珀火光巡山，还顺手帮迷路的萤火虫指了回家的路。" },
  { id: "nc_phantom_fox", dex: 570, name: "幻夜赤尾狐", rarity: "uncommon", weight: 14, nightOnly: false, lantern: 1, lureTypes: ["dark", "mystic"], note: "我们数了三遍，草丛里到底有一只还是五只？——全是它的分身。" },
  { id: "nc_shadow_bat", dex: 42, name: "影翼猎蝠", rarity: "rare", weight: 8, nightOnly: true, lantern: 2, lureTypes: ["dark", "wind"], note: "无声滑过林冠的一道夜幕，只有月光照到翼尖时才看得见它。" },
  { id: "nc_mist_wisp", dex: 92, name: "冥雾星魂", rarity: "rare", weight: 7, nightOnly: true, lantern: 2, lureTypes: ["dark", "mystic"], note: "紫色幽火在雾里飘了一整夜，靠近时观察站的温度计降了三度。" },
  { id: "nc_moonring_fox", dex: 197, name: "幽月影狐", rarity: "rare", weight: 7, nightOnly: true, lantern: 2, lureTypes: ["dark", "light"], note: "静立在山脊上一动不动，金色月环和天上的月亮重叠成了一个。" },
  { id: "nc_moon_empress", dex: 36, name: "月华星后", rarity: "legend", weight: 2.5, nightOnly: true, lantern: 3, lureTypes: ["light", "water"], note: "新月光轮缓缓升起，整片月见花园像被洗过一样清亮——这一页要用金墨抄写。" },
  { id: "nc_gala_pumpkin", dex: 711, name: "夜宴南瓜爵", rarity: "legend", weight: 2.5, nightOnly: true, lantern: 3, lureTypes: ["fire", "dark"], note: "林间亮起一排白烛，南瓜公爵向观察站的伙伴们递来了星光假面舞会的请柬。" },
]);

/** 夜行限定形态：按伙伴主属性决定形态名（外观标签 + 夜间小幅属性）。 */
export const NOCTURNAL_FORM_DEFS = Object.freeze({
  dark: { name: "月蚀影纱", desc: "披上月蚀般的影纱，夜色里几乎隐形" },
  mystic: { name: "星梦夜纱", desc: "周身缠绕星梦薄纱，梦境与现实的边界变得柔软" },
  light: { name: "月华银辉", desc: "毛色镀上一层银白月辉，在暗处也清晰可见" },
  wind: { name: "夜枭羽披", desc: "披上夜枭般的静音羽披，夜航不留一丝风声" },
  water: { name: "月潮荧鳞", desc: "鳞片映出月潮的荧光，随呼吸明灭" },
  grass: { name: "萤苔夜纹", desc: "身上长出会发光的萤苔花纹，像一幅移动的星图" },
  fire: { name: "余烬星火", desc: "火光收敛成点点余烬，在夜风里闪烁如星" },
  electric: { name: "萤雷夜光", desc: "电流化作柔和的萤光，在毛尖上轻轻跳跃" },
  stone: { name: "月岩晶纹", desc: "外壳浮现月岩晶纹，夜里会吸收月光微微发亮" },
});
const NOCTURNAL_FORM_FALLBACK = Object.freeze({ name: "月光夜行", desc: "在月光下观测多晚后觉醒的夜行姿态" });

export function getNocturnalCreatureDef(creatureId) {
  return NOCTURNAL_CREATURE_DEFS.find((c) => c.id === creatureId) || null;
}

/**
 * Pure time-of-day gate. `night` = 19:00~05:00 local; everything else is the reduced `dusk` (暮光微光) mode.
 * Returns the countdown to the next phase change (msUntilChange) so the UI can show「距入夜 / 距破晓」.
 */
export function getNightObservatoryPhase(nowMs = Date.now()) {
  const d = new Date(nowMs);
  const h = d.getHours();
  const isNight = h >= NIGHT_OBS_OPEN_HOUR || h < NIGHT_OBS_CLOSE_HOUR;
  let next;
  if (isNight) {
    next = new Date(d.getFullYear(), d.getMonth(), d.getDate(), NIGHT_OBS_CLOSE_HOUR, 0, 0, 0);
    if (h >= NIGHT_OBS_OPEN_HOUR) next.setDate(next.getDate() + 1);
  } else {
    next = new Date(d.getFullYear(), d.getMonth(), d.getDate(), NIGHT_OBS_OPEN_HOUR, 0, 0, 0);
  }
  const msUntilChange = Math.max(0, next.getTime() - nowMs);
  return {
    phase: isNight ? "night" : "dusk",
    isNight,
    label: isNight ? "夜观时段" : "暮光微光模式",
    windowText: `${String(NIGHT_OBS_OPEN_HOUR).padStart(2, "0")}:00 ~ 次日 ${String(NIGHT_OBS_CLOSE_HOUR).padStart(2, "0")}:00`,
    sightingMul: isNight ? 1 : NIGHT_OBS_DUSK_SIGHTING_MUL,
    auraMul: isNight ? 1 : NIGHT_OBS_DUSK_AURA_MUL,
    nextChangeAt: next.getTime(),
    msUntilChange,
    countdownLabel: isNight ? "距破晓" : "距入夜",
  };
}

export function ensureFireflyLanternBucket(state) {
  if (!state || typeof state !== "object") return null;
  if (!state.res || typeof state.res !== "object") state.res = {};
  if (!state.res.fireflyLantern || typeof state.res.fireflyLantern !== "object") {
    state.res.fireflyLantern = { value: 0, cap: 999 };
  }
  const b = state.res.fireflyLantern;
  if (typeof b.value !== "number" || !Number.isFinite(b.value)) b.value = 0;
  if (typeof b.cap !== "number" || b.cap <= 0) b.cap = 999;
  return b;
}

export function ensureNightObservatoryState(state) {
  if (!state || typeof state !== "object") return null;
  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  ensureFireflyLanternBucket(state);
  const raw = state.meta.nightObservatory && typeof state.meta.nightObservatory === "object" ? state.meta.nightObservatory : {};
  const monList = Array.isArray(state?.mons?.list) ? state.mons.list : null;
  const aliveSet = monList
    ? new Set(
        monList
          .map((m) => (m && typeof m.id === "number" && Number.isFinite(m.id) ? Math.floor(m.id) : null))
          .filter((x) => x !== null && x > 0),
      )
    : null;
  const stationedIds = normalizeIdList(raw.stationedIds, NIGHT_OBS_MAX_STATION, aliveSet);

  const sightings = {};
  const rawSightings = raw.sightings && typeof raw.sightings === "object" ? raw.sightings : {};
  for (const c of NOCTURNAL_CREATURE_DEFS) {
    sightings[c.id] = Math.max(0, Math.min(99999, Math.floor(Number(rawSightings[c.id]) || 0)));
  }

  const keepMon = (idRaw) => {
    const id = Math.floor(Number(idRaw) || 0);
    return id > 0 && (!aliveSet || aliveSet.has(id)) ? id : 0;
  };
  const tally = {};
  if (raw.tally && typeof raw.tally === "object") {
    for (const [k, v] of Object.entries(raw.tally)) {
      const id = keepMon(k);
      const n = Math.max(0, Math.min(99999, Math.floor(Number(v) || 0)));
      if (id && n > 0) tally[String(id)] = n;
    }
  }
  const forms = {};
  if (raw.forms && typeof raw.forms === "object") {
    for (const [k, v] of Object.entries(raw.forms)) {
      const id = keepMon(k);
      if (!id || !v || typeof v !== "object") continue;
      const element = typeof v.element === "string" && NOCTURNAL_FORM_DEFS[v.element] ? v.element : "";
      forms[String(id)] = { element, at: typeof v.at === "number" && Number.isFinite(v.at) ? v.at : 0 };
    }
  }

  const validCreature = new Set(NOCTURNAL_CREATURE_DEFS.map((c) => c.id));
  const journal = Array.isArray(raw.journal)
    ? raw.journal
        .filter((e) => e && typeof e === "object" && validCreature.has(e.creatureId))
        .slice(0, NIGHT_OBS_JOURNAL_KEEP)
        .map((e) => ({
          creatureId: e.creatureId,
          observer: typeof e.observer === "string" && e.observer ? e.observer.slice(0, 24) : "观察员",
          phase: e.phase === "night" ? "night" : "dusk",
          isNew: Boolean(e.isNew),
          at: typeof e.at === "number" && Number.isFinite(e.at) ? e.at : 0,
        }))
    : [];
  const recentLogs = Array.isArray(raw.recentLogs)
    ? raw.recentLogs.filter((s) => typeof s === "string" && s.trim().length > 0).slice(0, 6)
    : [];

  const carry = Number(raw.observeCarrySec);
  const clean = {
    initialized: true,
    stationedIds,
    observeCarrySec: Number.isFinite(carry) && carry > 0 && stationedIds.length > 0 ? Math.min(NIGHT_OBS_CYCLE_SEC - 0.001, carry) : 0,
    sightings,
    tally,
    forms,
    journal,
    lastPhase: raw.lastPhase === "night" || raw.lastPhase === "dusk" ? raw.lastPhase : "",
    patrolDate: typeof raw.patrolDate === "string" ? raw.patrolDate : "",
    patrolUsed: Math.max(0, Math.floor(Number(raw.patrolUsed) || 0)),
    totalSightings: Math.max(0, Math.floor(Number(raw.totalSightings) || 0)),
    totalLanterns: Math.max(0, Math.floor(Number(raw.totalLanterns) || 0)),
    nightSightings: Math.max(0, Math.floor(Number(raw.nightSightings) || 0)),
    recentLogs,
  };

  if (state.meta.nightObservatory && typeof state.meta.nightObservatory === "object") {
    Object.assign(state.meta.nightObservatory, clean);
    return state.meta.nightObservatory;
  }
  state.meta.nightObservatory = clean;
  return clean;
}

/** Non-mutating read: partner IDs stationed at the observatory — protected in busyMonIds. */
export function getNightObservatoryStationedMonIds(state) {
  const ids = new Set();
  const raw = state?.meta?.nightObservatory?.stationedIds;
  if (!Array.isArray(raw)) return ids;
  const monList = Array.isArray(state?.mons?.list) ? state.mons.list : null;
  const validSet = monList
    ? new Set(monList.filter((m) => m && typeof m.id === "number").map((m) => Math.floor(m.id)))
    : null;
  for (const v of raw) {
    const id = Math.floor(Number(v) || 0);
    if (id > 0 && (!validSet || validSet.has(id))) ids.add(id);
    if (ids.size >= NIGHT_OBS_MAX_STATION) break;
  }
  return ids;
}

/** Idle partners eligible to station: not training/expedition/PvE/breeding/camp/eco-sandbox/at-sea or already stationed. */
export function getIdleNightObservatoryCandidates(state) {
  const list = Array.isArray(state?.mons?.list) ? state.mons.list.filter(Boolean) : [];
  const extBusy = getNonSandboxBusyIds(state);
  const ecoBusy = getEcoSandboxBusyIds(state);
  return list.filter((m) => m && typeof m.id === "number" && !extBusy.has(m.id) && !ecoBusy.has(m.id));
}

function nightObsStationedMons(state) {
  const list = Array.isArray(state?.mons?.list) ? state.mons.list : [];
  return Array.from(getNightObservatoryStationedMonIds(state))
    .map((id) => list.find((m) => m && m.id === id) || null)
    .filter(Boolean);
}

/** Observation speed from stationed partners: base 1, +12% per night-affine observer, +6% per awakened nocturnal form. */
export function evaluateNightObservers(observerMons = [], state = null, opts = {}) {
  const mons = (Array.isArray(observerMons) ? observerMons.filter(Boolean) : []).slice(0, NIGHT_OBS_MAX_STATION);
  const affine = new Set(NIGHT_OBS_AFFINE_TYPES);
  let affineCount = 0;
  let formCount = 0;
  const forms = state?.meta?.nightObservatory?.forms || {};
  for (const m of mons) {
    if (resolveMonTypesForEco(m, opts).some((t) => affine.has(t))) affineCount += 1;
    if (forms[String(m.id)]) formCount += 1;
  }
  const speedMul = mons.length ? Math.round((1 + affineCount * 0.12 + formCount * 0.06) * 100) / 100 : 0;
  return { observerCount: mons.length, affineCount, formCount, speedMul };
}

function scoreMonForNightObservatory(mon, opts = {}) {
  if (!mon) return -1;
  const affine = new Set(NIGHT_OBS_AFFINE_TYPES);
  const hits = resolveMonTypesForEco(mon, opts).filter((t) => affine.has(t)).length;
  const lvl = Math.max(1, Math.floor(Number(mon.lvl) || 1));
  const stars = Math.max(0, Math.floor(Number(mon.stars) || 0));
  return hits * 1000 + (mon.isShiny ? 300 : 0) + stars * 100 + lvl * 5;
}

export function toggleNightObservatoryMon(state, monId) {
  const obs = ensureNightObservatoryState(state);
  if (!obs) return { ok: false, reason: "invalid_state" };
  const id = Math.floor(Number(monId) || 0);
  if (id <= 0) return { ok: false, reason: "invalid_mon" };
  if (obs.stationedIds.includes(id)) {
    obs.stationedIds = obs.stationedIds.filter((x) => x !== id);
    if (!obs.stationedIds.length) obs.observeCarrySec = 0;
    return { ok: true, stationed: false, stationedIds: obs.stationedIds.slice() };
  }
  if (obs.stationedIds.length >= NIGHT_OBS_MAX_STATION) return { ok: false, reason: "station_full" };
  const idle = new Set(getIdleNightObservatoryCandidates(state).map((m) => m.id));
  if (!idle.has(id)) return { ok: false, reason: "mon_busy" };
  obs.stationedIds.push(id);
  return { ok: true, stationed: true, stationedIds: obs.stationedIds.slice() };
}

/** Fills empty observer seats with the best idle night-affine partners (keeps current observers). */
export function autoFillNightObservatory(state, opts = {}) {
  const obs = ensureNightObservatoryState(state);
  if (!obs) return { ok: false, added: [] };
  const free = NIGHT_OBS_MAX_STATION - obs.stationedIds.length;
  if (free <= 0) return { ok: false, reason: "station_full", added: [] };
  const picked = getIdleNightObservatoryCandidates(state)
    .slice()
    .sort((a, b) => scoreMonForNightObservatory(b, opts) - scoreMonForNightObservatory(a, opts) || (a.id || 0) - (b.id || 0))
    .slice(0, free)
    .map((m) => m.id);
  obs.stationedIds = [...obs.stationedIds, ...picked];
  return { ok: picked.length > 0, reason: picked.length ? "" : "no_idle_mons", added: picked, stationedIds: obs.stationedIds.slice() };
}

/** Recalls one observer (monId) or the whole station (monId == null). */
export function recallNightObservatory(state, monId = null) {
  const obs = ensureNightObservatoryState(state);
  if (!obs) return { ok: false, recalled: 0 };
  const before = obs.stationedIds.length;
  if (monId == null) obs.stationedIds = [];
  else {
    const id = Math.floor(Number(monId) || 0);
    obs.stationedIds = obs.stationedIds.filter((x) => x !== id);
  }
  if (!obs.stationedIds.length) obs.observeCarrySec = 0;
  return { ok: before !== obs.stationedIds.length, recalled: before - obs.stationedIds.length };
}

/** Removes a partner from the observatory (forced release): drops its station seat, tally and nocturnal form. */
export function detachNightObservatoryMon(state, monId) {
  const obs = state?.meta?.nightObservatory;
  const id = Math.floor(Number(monId) || 0);
  if (!obs || typeof obs !== "object" || id <= 0) return { ok: false, detached: false };
  let detached = false;
  if (Array.isArray(obs.stationedIds) && obs.stationedIds.includes(id)) {
    obs.stationedIds = obs.stationedIds.filter((x) => x !== id);
    if (!obs.stationedIds.length) obs.observeCarrySec = 0;
    detached = true;
  }
  if (obs.tally && typeof obs.tally === "object" && obs.tally[String(id)]) {
    delete obs.tally[String(id)];
    detached = true;
  }
  if (obs.forms && typeof obs.forms === "object" && obs.forms[String(id)]) {
    delete obs.forms[String(id)];
    detached = true;
  }
  return { ok: true, detached };
}

function pickNocturnalCreature(observerMons, phase, rng, opts = {}) {
  const pool = NOCTURNAL_CREATURE_DEFS.filter((c) => phase.isNight || !c.nightOnly);
  const observerTypes = new Set(observerMons.flatMap((m) => resolveMonTypesForEco(m, opts)));
  const formCount = Math.max(0, Math.floor(Number(opts.formCount) || 0));
  const weighted = pool.map((c) => {
    let w = c.weight;
    if (c.lureTypes.some((t) => observerTypes.has(t))) w *= 1.8;
    if (c.rarity === "rare" || c.rarity === "legend") w *= 1 + formCount * 0.15;
    return { c, w };
  });
  const total = weighted.reduce((s, x) => s + x.w, 0);
  let roll = Math.max(0, Math.min(0.999999, Number(rng()) || 0)) * total;
  for (const x of weighted) {
    if (roll < x.w) return x.c;
    roll -= x.w;
  }
  return weighted[weighted.length - 1].c;
}

function recordNocturnalSighting(state, obs, phase, rng, atMs, opts = {}) {
  const observers = nightObsStationedMons(state);
  if (!observers.length) return null;
  const formCount = observers.filter((m) => obs.forms?.[String(m.id)]).length;
  const creature = pickNocturnalCreature(observers, phase, rng, { ...opts, formCount });
  const lure = new Set(creature.lureTypes);
  const ranked = observers
    .map((m) => ({ m, hits: resolveMonTypesForEco(m, opts).filter((t) => lure.has(t)).length }))
    .sort((a, b) => b.hits - a.hits);
  const top = ranked.filter((r) => r.hits === ranked[0].hits);
  const observer = top[Math.max(0, Math.min(top.length - 1, Math.floor((Number(rng()) || 0) * top.length)))].m;
  const isNew = !(obs.sightings[creature.id] > 0);
  obs.sightings[creature.id] = (obs.sightings[creature.id] || 0) + 1;
  for (const m of observers) obs.tally[String(m.id)] = (obs.tally[String(m.id)] || 0) + 1;
  const lanterns = phase.isNight ? creature.lantern : Math.max(0, creature.lantern - 1);
  if (lanterns > 0) {
    const b = ensureFireflyLanternBucket(state);
    b.value = Math.min(b.cap || 999, Math.max(0, Number(b.value) || 0) + lanterns);
    obs.totalLanterns = (obs.totalLanterns || 0) + lanterns;
  }
  obs.totalSightings = (obs.totalSightings || 0) + 1;
  if (phase.isNight) obs.nightSightings = (obs.nightSightings || 0) + 1;
  const entry = {
    creatureId: creature.id,
    observer: String(observer.name || "伙伴").slice(0, 24),
    phase: phase.phase,
    isNew,
    at: atMs,
  };
  obs.journal = [entry, ...(obs.journal || [])].slice(0, NIGHT_OBS_JOURNAL_KEEP);
  // ML-12 寻宝地图远航：每记录 3 次出没，观察员在草丛里捡到 1 片藏宝图残片
  const mapFragments = noteTreasureObservatorySighting(state, opts);
  return { ...entry, creatureName: creature.name, rarity: creature.rarity, lanterns, mapFragments };
}

/**
 * Advances observation by dtSec (live tick + offline catch-up). Walks the elapsed span in ≤10-minute chunks and
 * evaluates the time-of-day phase per chunk, so an offline stretch crossing 19:00 / 05:00 is credited correctly.
 * No-op for saves without an observatory or without stationed partners.
 */
export function advanceNightObservatory(state, dtSec, opts = {}) {
  const obs = state?.meta?.nightObservatory;
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const phaseNow = getNightObservatoryPhase(nowMs);
  const empty = { sightings: [], newDiscoveries: [], lanternsGained: 0, phase: phaseNow.phase, phaseChanged: false };
  if (!obs || typeof obs !== "object" || !Array.isArray(obs.stationedIds)) return empty;
  const phaseChanged = Boolean(obs.lastPhase) && obs.lastPhase !== phaseNow.phase;
  obs.lastPhase = phaseNow.phase;
  const observers = nightObsStationedMons(state);
  if (!observers.length) return { ...empty, phaseChanged };
  if (!obs.sightings || typeof obs.sightings !== "object") obs.sightings = {};
  if (!obs.tally || typeof obs.tally !== "object") obs.tally = {};
  if (!obs.forms || typeof obs.forms !== "object") obs.forms = {};
  const rng = typeof opts.randFloat === "function" ? opts.randFloat : Math.random;
  const step = typeof dtSec === "number" && Number.isFinite(dtSec) && dtSec > 0 ? Math.min(NIGHT_OBS_MAX_CATCHUP_SEC, dtSec) : 0;
  const speedMul = evaluateNightObservers(observers, state, opts).speedMul;
  const sightings = [];
  let carry = Number.isFinite(Number(obs.observeCarrySec)) ? Math.max(0, Number(obs.observeCarrySec)) : 0;
  let remaining = step;
  let t = nowMs - step * 1000;
  while (remaining > 0) {
    const chunk = Math.min(remaining, 600);
    const ph = getNightObservatoryPhase(t + chunk * 500);
    carry += chunk * ph.sightingMul * speedMul;
    while (carry >= NIGHT_OBS_CYCLE_SEC && sightings.length < NIGHT_OBS_MAX_SIGHTINGS_PER_STEP) {
      carry -= NIGHT_OBS_CYCLE_SEC;
      const s = recordNocturnalSighting(state, obs, ph, rng, Math.round(t + chunk * 1000), opts);
      if (s) sightings.push(s);
    }
    t += chunk * 1000;
    remaining -= chunk;
  }
  obs.observeCarrySec = Math.min(NIGHT_OBS_CYCLE_SEC - 0.001, carry);
  const newDiscoveries = sightings.filter((s) => s.isNew);
  const lanternsGained = sightings.reduce((s, x) => s + (x.lanterns || 0), 0);
  const mapFragments = sightings.reduce((s, x) => s + (x.mapFragments || 0), 0);
  if (newDiscoveries.length) {
    const line = `【观察日记】新增夜行萌灵记录：${newDiscoveries.map((s) => `「${s.creatureName}」`).join("、")}（由 ${newDiscoveries[0].observer} 记录）`;
    obs.recentLogs = [line, ...(obs.recentLogs || [])].slice(0, 6);
  }
  return { sightings, newDiscoveries, lanternsGained, mapFragments, phase: phaseNow.phase, phaseChanged };
}

export function getNightPatrolFreeLeft(state, nowMs = Date.now()) {
  const obs = state?.meta?.nightObservatory;
  if (!obs || typeof obs !== "object") return NIGHT_OBS_FREE_PATROL_PER_DAY;
  if (obs.patrolDate !== localYmdForSandbox(nowMs)) return NIGHT_OBS_FREE_PATROL_PER_DAY;
  return Math.max(0, NIGHT_OBS_FREE_PATROL_PER_DAY - Math.floor(Number(obs.patrolUsed) || 0));
}

/** 「提灯夜巡」: 3 instant sightings in the current phase — free once per local day, then futurecoin ×25. */
export function performLanternPatrol(state, opts = {}) {
  const obs = ensureNightObservatoryState(state);
  if (!obs) return { ok: false, reason: "invalid_state" };
  if (!nightObsStationedMons(state).length) return { ok: false, reason: "no_observers" };
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const today = localYmdForSandbox(nowMs);
  if (obs.patrolDate !== today) {
    obs.patrolDate = today;
    obs.patrolUsed = 0;
  }
  let costKind = "";
  if (obs.patrolUsed < NIGHT_OBS_FREE_PATROL_PER_DAY) {
    obs.patrolUsed += 1;
    costKind = "free_daily";
  } else if ((Number(state.res?.futurecoin?.value) || 0) >= NIGHT_OBS_PATROL_COIN_COST) {
    state.res.futurecoin.value = Math.max(0, Math.floor(state.res.futurecoin.value) - NIGHT_OBS_PATROL_COIN_COST);
    costKind = "futurecoin";
  } else {
    return { ok: false, reason: "insufficient_patrol_cost" };
  }
  const phase = getNightObservatoryPhase(nowMs);
  const rng = typeof opts.randFloat === "function" ? opts.randFloat : Math.random;
  const sightings = [];
  for (let i = 0; i < NIGHT_OBS_PATROL_SIGHTINGS; i += 1) {
    const s = recordNocturnalSighting(state, obs, phase, rng, nowMs, opts);
    if (s) sightings.push(s);
  }
  const lanterns = sightings.reduce((s, x) => s + (x.lanterns || 0), 0);
  const mapFragments = sightings.reduce((s, x) => s + (x.mapFragments || 0), 0);
  const newOnes = sightings.filter((s) => s.isNew);
  const logLine = `【提灯夜巡】${phase.isNight ? "夜观时段" : "暮光微光模式"}巡山记录 ${sightings.length} 次：${sightings.map((s) => s.creatureName).join("、")}${newOnes.length ? `（新日记 ${newOnes.length} 页）` : ""}${lanterns ? `，萤火灯笼 +${lanterns}` : ""}${mapFragments ? `，藏宝图残片 +${mapFragments}` : ""}`;
  obs.recentLogs = [logLine, ...(obs.recentLogs || [])].slice(0, 6);
  return { ok: true, costKind, phase: phase.phase, sightings, lanterns, mapFragments, newDiscoveries: newOnes, logLine };
}

function resolveNocturnalFormElement(mon, opts = {}) {
  const types = resolveMonTypesForEco(mon, opts);
  return types.find((t) => NOCTURNAL_FORM_DEFS[t]) || "";
}

export function getNocturnalFormDefForMon(mon, opts = {}) {
  const el = resolveNocturnalFormElement(mon, opts);
  const def = (el && NOCTURNAL_FORM_DEFS[el]) || NOCTURNAL_FORM_FALLBACK;
  return { element: el, name: def.name, desc: def.desc };
}

export function canAwakenNocturnalForm(state, monId) {
  const obs = state?.meta?.nightObservatory;
  const id = Math.floor(Number(monId) || 0);
  if (!obs || id <= 0) return false;
  if (obs.forms?.[String(id)]) return false;
  if (!(Array.isArray(state?.mons?.list) && state.mons.list.some((m) => m && m.id === id))) return false;
  if ((Number(obs.tally?.[String(id)]) || 0) < NIGHT_OBS_FORM_TALLY_REQ) return false;
  for (const [rid, need] of Object.entries(NIGHT_OBS_FORM_COST)) {
    if ((Number(state?.res?.[rid]?.value) || 0) < need) return false;
  }
  return true;
}

/** Awakens a partner's nocturnal-only form (needs ≥3 recorded sightings at the observatory + lanterns ×4 + futurecoin ×40). */
export function awakenNocturnalForm(state, monId, opts = {}) {
  const obs = ensureNightObservatoryState(state);
  const id = Math.floor(Number(monId) || 0);
  const mon = (state?.mons?.list || []).find((m) => m && m.id === id) || null;
  if (!obs || !mon) return { ok: false, reason: "invalid_mon" };
  if (obs.forms[String(id)]) return { ok: false, reason: "already_awakened" };
  if ((Number(obs.tally[String(id)]) || 0) < NIGHT_OBS_FORM_TALLY_REQ) return { ok: false, reason: "need_observation" };
  if (!canAwakenNocturnalForm(state, id)) return { ok: false, reason: "insufficient_materials" };
  for (const [rid, need] of Object.entries(NIGHT_OBS_FORM_COST)) {
    state.res[rid].value = Math.max(0, (Number(state.res[rid].value) || 0) - need);
  }
  const def = getNocturnalFormDefForMon(mon, opts);
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  obs.forms[String(id)] = { element: def.element, at: nowMs };
  const logLine = `【夜行形态】${mon.name || "伙伴"} 在月光下觉醒「${def.name}」：${def.desc}（夜观时段战斗与表演属性小幅提升）`;
  obs.recentLogs = [logLine, ...(obs.recentLogs || [])].slice(0, 6);
  return { ok: true, monId: id, formName: def.name, element: def.element, logLine };
}

/** Pure read: a partner's nocturnal form. Cosmetic always; stat bonus is full at night, reduced in dusk mode. */
export function getMonNocturnalFormBonus(state, monId, nowMs = Date.now()) {
  const id = Math.floor(Number(monId) || 0);
  const f = state?.meta?.nightObservatory?.forms?.[String(id)];
  if (!f || typeof f !== "object") {
    return { hasForm: false, formName: "", formDesc: "", element: "", nightActive: false, combatMul: 1, showScoreMul: 1 };
  }
  const def = (f.element && NOCTURNAL_FORM_DEFS[f.element]) || NOCTURNAL_FORM_FALLBACK;
  const isNight = getNightObservatoryPhase(nowMs).isNight;
  return {
    hasForm: true,
    formName: def.name,
    formDesc: def.desc,
    element: f.element || "",
    nightActive: isNight,
    combatMul: isNight ? 1.05 : 1.02,
    showScoreMul: isNight ? 1.08 : 1.04,
  };
}

/**
 * Pure non-mutating aggregator.
 * - Night production aura (needs ≥1 stationed observer): 3% per observer + 0.4% per journal page + 0.5% per form (≤15%),
 *   scaled by the phase (night 100% / dusk 40%).
 * - Permanent journal bonus: +0.3% production and +0.4% shiny odds per discovered creature (12 pages max).
 */
export function computeNightObservatoryAura(state, nowMs = Date.now()) {
  const phase = getNightObservatoryPhase(nowMs);
  const raw = state?.meta?.nightObservatory;
  const base = {
    phase: phase.phase,
    isNight: phase.isNight,
    auraMul: phase.auraMul,
    stationedCount: 0,
    discovered: 0,
    totalCreatures: NOCTURNAL_CREATURE_DEFS.length,
    formsAwakened: 0,
    nightAuraBaseAdd: 0,
    nightProdAdd: 0,
    journalProdAdd: 0,
    prodAdd: 0,
    prodMul: 1,
    shinyAdd: 0,
    shinyChanceMul: 1,
  };
  if (!raw || typeof raw !== "object") return base;
  const stationedCount = getNightObservatoryStationedMonIds(state).size;
  const sightings = raw.sightings && typeof raw.sightings === "object" ? raw.sightings : {};
  const discovered = NOCTURNAL_CREATURE_DEFS.filter((c) => (Number(sightings[c.id]) || 0) > 0).length;
  const aliveIds = Array.isArray(state?.mons?.list) ? new Set(state.mons.list.filter(Boolean).map((m) => String(m.id))) : null;
  const formsAwakened =
    raw.forms && typeof raw.forms === "object" ? Object.keys(raw.forms).filter((k) => !aliveIds || aliveIds.has(k)).length : 0;
  const round4 = (n) => Math.round(n * 10000) / 10000;
  const nightAuraBaseAdd = stationedCount > 0 ? Math.min(0.15, stationedCount * 0.03 + discovered * 0.004 + formsAwakened * 0.005) : 0;
  const nightProdAdd = round4(nightAuraBaseAdd * phase.auraMul);
  const journalProdAdd = round4(discovered * 0.003);
  const prodAdd = round4(nightProdAdd + journalProdAdd);
  const shinyAdd = round4(discovered * 0.004);
  return {
    ...base,
    stationedCount,
    discovered,
    formsAwakened,
    nightAuraBaseAdd: round4(nightAuraBaseAdd),
    nightProdAdd,
    journalProdAdd,
    prodAdd,
    prodMul: round4(1 + prodAdd),
    shinyAdd,
    shinyChanceMul: round4(1 + shinyAdd),
  };
}
