// collection/spring_library.js — ML-13 温泉疗愈乡与邮局 · ML-14 梦境绘本馆（由 collection_fun.js 原样拆出，对外仍从 ../collection_fun.js 引用）

import {
  getEcoSandboxBusyIds,
  getNonSandboxBusyIds,
  localYmdForSandbox,
  normalizeIdList,
  resolveMonTypesForEco,
} from "./camp.js";
import { addResDirect } from "./dock_observatory.js";
import { listIdleOutingMons } from "./away_registry.js";

// ============================================================================
// ML-13 「温泉疗愈乡」(Hot Spring Healing Village)
// 本作没有独立的「疲劳」数值，因此泡汤以「舒缓状态」建模：伙伴在 4 座属性汤池里泡汤，每满 30 分钟完成一轮疗愈，
// 每位泡汤伙伴为该汤池的限时状态续上时长（契合属性更久），并让伙伴亲密度成长（契合属性更多）。
// 限时状态（最多存 6 小时）是全局光环：暖身 PvE 增伤 / 药香 全产 / 轻盈 捕获 / 星辉 闪光，离线补算 ≤12h。
// 泡汤伙伴接入 busyMonIds 防放生锁（与 ML-9 ~ ML-12 同一套路）：放生按钮禁用、不可作升星材料、所有自动派遣均跳过，
// 强制放生会移出汤池，转生召回所有泡汤伙伴（限时状态与疗愈记录保留）。
// ============================================================================

export const HOT_SPRING_SEATS_PER_POOL = 2;
export const HOT_SPRING_ROUND_SEC = 1800;
export const HOT_SPRING_STATE_MAX_SEC = 6 * 3600;
export const HOT_SPRING_MAX_CATCHUP_SEC = 12 * 3600;
export const HOT_SPRING_BASE_STATE_SEC = 1200;
export const HOT_SPRING_MATCH_STATE_SEC = 600;
export const HOT_SPRING_BASE_AFFECTION = 3;
export const HOT_SPRING_MATCH_AFFECTION = 2;
export const HOT_SPRING_FREE_TOWEL_PER_DAY = 1;
export const HOT_SPRING_TOWEL_COIN_COST = 20;
export const HOT_SPRING_LOG_KEEP = 6;

/** 4 种汤池限时状态：每种只作用于一个维度，叠加时长而不叠加强度。 */
export const HOT_SPRING_STATE_DEFS = Object.freeze([
  { id: "warm", name: "暖身", stat: "pveOut", value: 0.05, effectText: "PvE 增伤 +5%", desc: "熔岩暖石把筋骨泡得热乎乎的，出手更有劲。" },
  { id: "herbal", name: "药香", stat: "prod", value: 0.06, effectText: "全产 +6%", desc: "药草香气一直飘到灵田，大家干活更起劲。" },
  { id: "breezy", name: "轻盈", stat: "catch", value: 0.01, effectText: "捕获 +1%", desc: "云雾汤泡完浑身轻飘飘，抛球都更准了。" },
  { id: "starglow", name: "星辉", stat: "shiny", value: 0.1, effectText: "闪光 +10%", desc: "星乳汤的微光留在毛尖上，闪光萌灵更爱靠近。" },
]);

/** 4 座属性汤池：两座开局可用，另两座按累计疗愈轮数解锁；每座 2 个泡汤位。 */
export const HOT_SPRING_POOL_DEFS = Object.freeze([
  {
    id: "emberRock",
    name: "熔岩暖石汤",
    elements: Object.freeze(["fire", "stone"]),
    stateId: "warm",
    unlockRounds: 0,
    desc: "火山余温烘着的岩石池，火系与岩系伙伴泡得最舒服。",
  },
  {
    id: "herbBamboo",
    name: "翠竹药草汤",
    elements: Object.freeze(["grass", "water"]),
    stateId: "herbal",
    unlockRounds: 0,
    desc: "竹林里引来的清泉加上药草包，草系与水系伙伴最爱。",
  },
  {
    id: "breezeMist",
    name: "风铃云雾汤",
    elements: Object.freeze(["wind", "electric"]),
    stateId: "breezy",
    unlockRounds: 4,
    desc: "挂满风铃的露天云雾池，风系与电系伙伴一泡就不想起来。",
  },
  {
    id: "moonMilk",
    name: "月华星乳汤",
    elements: Object.freeze(["light", "dark", "mystic"]),
    stateId: "starglow",
    unlockRounds: 10,
    desc: "只在月色里冒热气的乳白色汤池，光 / 暗 / 幻系伙伴最契合。",
  },
]);

const HOT_SPRING_TITLES = Object.freeze([
  { minRounds: 60, name: "疗愈乡名誉乡长" },
  { minRounds: 20, name: "汤池达人" },
  { minRounds: 5, name: "温泉常客" },
  { minRounds: 0, name: "初来乍到的旅客" },
]);

export function getHotSpringPoolDef(poolId) {
  return HOT_SPRING_POOL_DEFS.find((p) => p.id === poolId) || null;
}

export function getHotSpringStateDef(stateId) {
  return HOT_SPRING_STATE_DEFS.find((s) => s.id === stateId) || null;
}

export function getHotSpringTitle(totalRounds = 0) {
  const n = Math.max(0, Math.floor(Number(totalRounds) || 0));
  return (HOT_SPRING_TITLES.find((t) => n >= t.minRounds) || HOT_SPRING_TITLES[HOT_SPRING_TITLES.length - 1]).name;
}

export function isHotSpringPoolUnlocked(state, poolId) {
  const def = getHotSpringPoolDef(poolId);
  if (!def) return false;
  return Math.max(0, Math.floor(Number(state?.meta?.hotSpring?.totalRounds) || 0)) >= def.unlockRounds;
}

export function ensureHotSpringState(state) {
  if (!state || typeof state !== "object") return null;
  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  const raw = state.meta.hotSpring && typeof state.meta.hotSpring === "object" ? state.meta.hotSpring : {};
  const monList = Array.isArray(state?.mons?.list) ? state.mons.list : null;
  const aliveSet = monList
    ? new Set(
        monList
          .map((m) => (m && typeof m.id === "number" && Number.isFinite(m.id) ? Math.floor(m.id) : null))
          .filter((x) => x !== null && x > 0),
      )
    : null;
  const totalRounds = Math.max(0, Math.floor(Number(raw.totalRounds) || 0));
  const rawPools = raw.pools && typeof raw.pools === "object" ? raw.pools : {};
  const seen = new Set();
  const pools = {};
  for (const def of HOT_SPRING_POOL_DEFS) {
    const rp = rawPools[def.id] && typeof rawPools[def.id] === "object" ? rawPools[def.id] : {};
    const unlocked = totalRounds >= def.unlockRounds;
    const seatIds = unlocked
      ? normalizeIdList(rp.seatIds, HOT_SPRING_SEATS_PER_POOL, aliveSet).filter((id) => {
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        })
      : [];
    const carry = Number(rp.carrySec);
    pools[def.id] = {
      seatIds,
      carrySec: seatIds.length && Number.isFinite(carry) && carry > 0 ? Math.min(HOT_SPRING_ROUND_SEC - 0.001, carry) : 0,
    };
  }
  const rawStates = raw.states && typeof raw.states === "object" ? raw.states : {};
  const states = {};
  for (const sd of HOT_SPRING_STATE_DEFS) {
    const n = Number(rawStates[sd.id]);
    states[sd.id] = Number.isFinite(n) && n > 0 ? Math.min(HOT_SPRING_STATE_MAX_SEC, n) : 0;
  }
  const rawByPool = raw.roundsByPool && typeof raw.roundsByPool === "object" ? raw.roundsByPool : {};
  const roundsByPool = {};
  for (const def of HOT_SPRING_POOL_DEFS) roundsByPool[def.id] = Math.max(0, Math.floor(Number(rawByPool[def.id]) || 0));
  const recentLogs = Array.isArray(raw.recentLogs)
    ? raw.recentLogs.filter((s) => typeof s === "string" && s.trim().length > 0).slice(0, HOT_SPRING_LOG_KEEP)
    : [];
  const clean = {
    initialized: true,
    pools,
    states,
    roundsByPool,
    totalRounds,
    totalAffection: Math.max(0, Math.floor(Number(raw.totalAffection) || 0)),
    towelDate: typeof raw.towelDate === "string" ? raw.towelDate : "",
    towelUsed: Math.max(0, Math.floor(Number(raw.towelUsed) || 0)),
    recentLogs,
  };
  if (state.meta.hotSpring && typeof state.meta.hotSpring === "object") {
    Object.assign(state.meta.hotSpring, clean);
    return state.meta.hotSpring;
  }
  state.meta.hotSpring = clean;
  return clean;
}

function hotSpringPushLog(hs, line) {
  hs.recentLogs = [line, ...(hs.recentLogs || [])].slice(0, HOT_SPRING_LOG_KEEP);
}

/** Non-mutating read: partners soaking in any pool — protected in busyMonIds. */
export function getHotSpringSoakingMonIds(state) {
  const ids = new Set();
  const pools = state?.meta?.hotSpring?.pools;
  if (!pools || typeof pools !== "object") return ids;
  const monList = Array.isArray(state?.mons?.list) ? state.mons.list : null;
  const validSet = monList ? new Set(monList.filter((m) => m && typeof m.id === "number").map((m) => Math.floor(m.id))) : null;
  for (const def of HOT_SPRING_POOL_DEFS) {
    const seats = pools[def.id]?.seatIds;
    if (!Array.isArray(seats)) continue;
    for (const raw of seats.slice(0, HOT_SPRING_SEATS_PER_POOL)) {
      const id = Math.floor(Number(raw) || 0);
      if (id > 0 && (!validSet || validSet.has(id))) ids.add(id);
    }
  }
  return ids;
}

/** Non-mutating read: the pool a partner is soaking in (or null). */
export function getHotSpringPoolOfMon(state, monId) {
  const id = Math.floor(Number(monId) || 0);
  const pools = state?.meta?.hotSpring?.pools;
  if (!pools || typeof pools !== "object" || id <= 0) return null;
  for (const def of HOT_SPRING_POOL_DEFS) {
    if (Array.isArray(pools[def.id]?.seatIds) && pools[def.id].seatIds.some((x) => Math.floor(Number(x) || 0) === id)) return def;
  }
  return null;
}

/**
 * ML-13 萌灵邮局信使网络 lives in pve_tower.js, but its messenger IDs must join the shared busy sets defined here
 * (collection_fun.js cannot import pve_tower.js without a cycle), so the non-mutating reader sits next to the other busy readers.
 */
export const POST_OFFICE_MAX_MESSENGERS = 3;

/** Non-mutating read: partners carrying letters (en route or back with an unopened reply) — protected in busyMonIds. */
export function getPostMessengerMonIds(state) {
  const ids = new Set();
  const trips = state?.meta?.postOffice?.trips;
  if (!Array.isArray(trips)) return ids;
  const monList = Array.isArray(state?.mons?.list) ? state.mons.list : null;
  const validSet = monList ? new Set(monList.filter((m) => m && typeof m.id === "number").map((m) => Math.floor(m.id))) : null;
  for (const t of trips) {
    if (!t || typeof t !== "object") continue;
    const id = Math.floor(Number(t.monId) || 0);
    if (id > 0 && (!validSet || validSet.has(id))) ids.add(id);
    if (ids.size >= POST_OFFICE_MAX_MESSENGERS) break;
  }
  return ids;
}

/** Idle partners that may take a seat: not training/expedition/PvE/breeding/camp/eco-sandbox/dock/observatory/island/voyage/spring/post. */
export function getIdleHotSpringCandidates(state) {
  const list = Array.isArray(state?.mons?.list) ? state.mons.list.filter(Boolean) : [];
  const extBusy = getNonSandboxBusyIds(state);
  const ecoBusy = getEcoSandboxBusyIds(state);
  return list.filter((m) => m && typeof m.id === "number" && !extBusy.has(m.id) && !ecoBusy.has(m.id));
}

/** Per-soaker yield of one 30-minute round: 汤池契合 (element ∈ pool elements) adds +10 min of state and +2 affection. */
export function evaluateHotSpringSoaker(mon, poolId, opts = {}) {
  const pool = getHotSpringPoolDef(poolId);
  if (!mon || !pool) return { match: false, stateSec: 0, affection: 0 };
  const types = resolveMonTypesForEco(mon, opts);
  const match = types.some((t) => pool.elements.includes(t));
  return {
    match,
    stateSec: HOT_SPRING_BASE_STATE_SEC + (match ? HOT_SPRING_MATCH_STATE_SEC : 0),
    affection: HOT_SPRING_BASE_AFFECTION + (match ? HOT_SPRING_MATCH_AFFECTION : 0),
  };
}

/** Applies one finished soaking round of `poolId` (state time + affection for every soaker). */
function applyHotSpringRound(state, hs, poolId, opts = {}) {
  const pool = getHotSpringPoolDef(poolId);
  const seats = hs.pools[poolId]?.seatIds || [];
  const list = Array.isArray(state.mons?.list) ? state.mons.list : [];
  let stateAdd = 0;
  let affGain = 0;
  let matches = 0;
  for (const id of seats) {
    const m = list.find((x) => x && x.id === id);
    if (!m) continue;
    const ev = evaluateHotSpringSoaker(m, poolId, opts);
    stateAdd += ev.stateSec;
    if (ev.match) matches += 1;
    const aff0 = typeof m.affection === "number" && Number.isFinite(m.affection) ? m.affection : 0;
    const aff1 = Math.min(100, Math.max(0, aff0 + ev.affection));
    affGain += Math.max(0, aff1 - aff0);
    m.affection = aff1;
  }
  if (!pool || stateAdd <= 0) return { stateAdd: 0, affGain: 0, matches: 0 };
  hs.states[pool.stateId] = Math.min(HOT_SPRING_STATE_MAX_SEC, (Number(hs.states[pool.stateId]) || 0) + stateAdd);
  hs.roundsByPool[poolId] = (hs.roundsByPool[poolId] || 0) + 1;
  hs.totalRounds = (hs.totalRounds || 0) + 1;
  hs.totalAffection = (hs.totalAffection || 0) + Math.round(affGain);
  return { stateAdd, affGain, matches };
}

function decayHotSpringStates(hs, sec) {
  if (!(sec > 0)) return [];
  const expired = [];
  for (const sd of HOT_SPRING_STATE_DEFS) {
    const before = Number(hs.states[sd.id]) || 0;
    if (before <= 0) continue;
    const after = Math.max(0, before - sec);
    hs.states[sd.id] = after;
    if (after <= 0) expired.push(sd.id);
  }
  return expired;
}

/**
 * Live tick + offline catch-up (≤12h). Rounds of every occupied pool complete in chronological order, and the timed states decay
 * between them, so a long absence lands on the same remaining time as playing it out live.
 */
export function advanceHotSpring(state, dtSec, opts = {}) {
  const hs = state?.meta?.hotSpring;
  const empty = { rounds: 0, roundsByPool: {}, affectionGained: 0, expiredStates: [], unlockedPools: [] };
  if (!hs || typeof hs !== "object" || !hs.pools || !hs.states) return empty;
  const step = typeof dtSec === "number" && Number.isFinite(dtSec) && dtSec > 0 ? Math.min(HOT_SPRING_MAX_CATCHUP_SEC, dtSec) : 0;
  if (step <= 0) return empty;
  const soaking = getHotSpringSoakingMonIds(state);
  const events = [];
  for (const def of HOT_SPRING_POOL_DEFS) {
    const p = hs.pools[def.id];
    if (!p) continue;
    const seats = Array.isArray(p.seatIds) ? p.seatIds.filter((id) => soaking.has(id)) : [];
    if (!seats.length) {
      p.carrySec = 0;
      continue;
    }
    const carry0 = Math.max(0, Number(p.carrySec) || 0);
    let t = HOT_SPRING_ROUND_SEC - carry0;
    let n = 0;
    while (t <= step + 1e-9) {
      events.push({ t, poolId: def.id });
      n += 1;
      t += HOT_SPRING_ROUND_SEC;
    }
    p.carrySec = Math.max(0, Math.min(HOT_SPRING_ROUND_SEC - 0.001, carry0 + step - n * HOT_SPRING_ROUND_SEC));
  }
  events.sort((a, b) => a.t - b.t);
  const unlockedBefore = new Set(HOT_SPRING_POOL_DEFS.filter((d) => isHotSpringPoolUnlocked(state, d.id)).map((d) => d.id));
  const expired = new Set();
  const roundsByPool = {};
  let affectionGained = 0;
  let tPrev = 0;
  for (const ev of events) {
    for (const id of decayHotSpringStates(hs, ev.t - tPrev)) expired.add(id);
    tPrev = ev.t;
    const r = applyHotSpringRound(state, hs, ev.poolId, opts);
    affectionGained += r.affGain;
    roundsByPool[ev.poolId] = (roundsByPool[ev.poolId] || 0) + 1;
    for (const sd of HOT_SPRING_STATE_DEFS) if ((hs.states[sd.id] || 0) > 0) expired.delete(sd.id);
  }
  for (const id of decayHotSpringStates(hs, step - tPrev)) expired.add(id);
  const unlockedPools = HOT_SPRING_POOL_DEFS.filter((d) => !unlockedBefore.has(d.id) && isHotSpringPoolUnlocked(state, d.id)).map((d) => d.id);
  if (events.length) {
    const parts = Object.entries(roundsByPool).map(([pid, n]) => `「${getHotSpringPoolDef(pid)?.name || pid}」${n > 1 ? ` ×${n}` : ""}`);
    hotSpringPushLog(hs, `【泡汤疗愈】${parts.join("、")}完成一轮疗愈，限时状态续上了时长，伙伴们更亲近了（亲密 +${Math.round(affectionGained)}）`);
  }
  for (const pid of unlockedPools) hotSpringPushLog(hs, `【汤池开放】累计疗愈 ${hs.totalRounds} 轮，「${getHotSpringPoolDef(pid)?.name || pid}」开放泡汤了`);
  return { rounds: events.length, roundsByPool, affectionGained: Math.round(affectionGained), expiredStates: [...expired], unlockedPools };
}

/** Seats an idle partner in a pool, or — when the partner already soaks anywhere — takes it out of the water (出浴). */
export function toggleHotSpringSoak(state, poolId, monId, opts = {}) {
  const hs = ensureHotSpringState(state);
  if (!hs) return { ok: false, reason: "invalid_state" };
  const id = Math.floor(Number(monId) || 0);
  if (id <= 0) return { ok: false, reason: "invalid_mon" };
  const current = getHotSpringPoolOfMon(state, id);
  if (current) {
    const p = hs.pools[current.id];
    p.seatIds = p.seatIds.filter((x) => x !== id);
    if (!p.seatIds.length) p.carrySec = 0;
    return { ok: true, soaking: false, poolId: current.id };
  }
  const pool = getHotSpringPoolDef(poolId);
  if (!pool) return { ok: false, reason: "unknown_pool" };
  if (!isHotSpringPoolUnlocked(state, pool.id)) return { ok: false, reason: "locked", needRounds: pool.unlockRounds };
  const p = hs.pools[pool.id];
  if (p.seatIds.length >= HOT_SPRING_SEATS_PER_POOL) return { ok: false, reason: "pool_full" };
  if (!getIdleHotSpringCandidates(state).some((m) => m.id === id)) return { ok: false, reason: "mon_busy" };
  p.seatIds = [...p.seatIds, id];
  const mon = (state.mons?.list || []).find((m) => m && m.id === id);
  const ev = evaluateHotSpringSoaker(mon, pool.id, opts);
  hotSpringPushLog(hs, `【入池】${mon?.name || "伙伴"} 泡进了「${pool.name}」${ev.match ? "（汤池契合）" : ""}，泡汤期间防放生保护生效`);
  return { ok: true, soaking: true, poolId: pool.id, match: ev.match };
}

/** 「一键入池」: fills every empty seat of the unlocked pools — element-matched partners first, then partners with room to bond. */
export function autoFillHotSpring(state, opts = {}) {
  const hs = ensureHotSpringState(state);
  if (!hs) return { ok: false, added: [] };
  const added = [];
  const affOf = (m) => (typeof m.affection === "number" && Number.isFinite(m.affection) ? m.affection : 0);
  const rank = (a, b) =>
    (affOf(a) >= 100 ? 1 : 0) - (affOf(b) >= 100 ? 1 : 0) ||
    Math.max(1, Math.floor(Number(b.lvl) || 1)) - Math.max(1, Math.floor(Number(a.lvl) || 1)) ||
    (a.id || 0) - (b.id || 0);
  for (const pass of ["match", "any"]) {
    for (const def of HOT_SPRING_POOL_DEFS) {
      if (!isHotSpringPoolUnlocked(state, def.id)) continue;
      const p = hs.pools[def.id];
      while (p.seatIds.length < HOT_SPRING_SEATS_PER_POOL) {
        const idle = getIdleHotSpringCandidates(state);
        const pool = pass === "match" ? idle.filter((m) => evaluateHotSpringSoaker(m, def.id, opts).match) : idle;
        const pick = pool.sort(rank)[0];
        if (!pick) break;
        p.seatIds = [...p.seatIds, pick.id];
        added.push({ monId: pick.id, poolId: def.id });
      }
    }
  }
  if (added.length) hotSpringPushLog(hs, `【一键入池】${added.length} 只伙伴泡进了温泉（泡汤期间防放生保护生效）`);
  return { ok: added.length > 0, reason: added.length ? "" : "no_idle_or_full", added };
}

/** 「全部出浴」: every soaker leaves the water (round progress resets; the timed states stay). */
export function recallHotSpring(state) {
  const hs = ensureHotSpringState(state);
  if (!hs) return { ok: false, recalled: 0 };
  let recalled = 0;
  for (const def of HOT_SPRING_POOL_DEFS) {
    const p = hs.pools[def.id];
    recalled += p.seatIds.length;
    p.seatIds = [];
    p.carrySec = 0;
  }
  if (recalled) hotSpringPushLog(hs, `【出浴】${recalled} 只伙伴裹着毛巾离开了汤池`);
  return { ok: recalled > 0, recalled };
}

export function getHotSpringTowelFreeLeft(state, nowMs = Date.now()) {
  const hs = state?.meta?.hotSpring;
  if (!hs || typeof hs !== "object") return HOT_SPRING_FREE_TOWEL_PER_DAY;
  if (hs.towelDate !== localYmdForSandbox(nowMs)) return HOT_SPRING_FREE_TOWEL_PER_DAY;
  return Math.max(0, HOT_SPRING_FREE_TOWEL_PER_DAY - Math.floor(Number(hs.towelUsed) || 0));
}

/** 「热毛巾招待」: every occupied pool completes one round on the spot. Free once per local day, then futurecoin ×20. */
export function performHotSpringTowel(state, opts = {}) {
  const hs = ensureHotSpringState(state);
  if (!hs) return { ok: false, reason: "invalid_state" };
  const occupied = HOT_SPRING_POOL_DEFS.filter((d) => hs.pools[d.id].seatIds.length > 0);
  if (!occupied.length) return { ok: false, reason: "no_soakers" };
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const today = localYmdForSandbox(nowMs);
  if (hs.towelDate !== today) {
    hs.towelDate = today;
    hs.towelUsed = 0;
  }
  let costKind = "";
  if (hs.towelUsed < HOT_SPRING_FREE_TOWEL_PER_DAY) {
    hs.towelUsed += 1;
    costKind = "free_daily";
  } else if ((Number(state.res?.futurecoin?.value) || 0) >= HOT_SPRING_TOWEL_COIN_COST) {
    state.res.futurecoin.value = Math.max(0, Math.floor(state.res.futurecoin.value) - HOT_SPRING_TOWEL_COIN_COST);
    costKind = "futurecoin";
  } else {
    return { ok: false, reason: "insufficient_towel_cost" };
  }
  const unlockedBefore = new Set(HOT_SPRING_POOL_DEFS.filter((d) => isHotSpringPoolUnlocked(state, d.id)).map((d) => d.id));
  let affGain = 0;
  let stateAdd = 0;
  for (const def of occupied) {
    const r = applyHotSpringRound(state, hs, def.id, opts);
    affGain += r.affGain;
    stateAdd += r.stateAdd;
  }
  const unlockedPools = HOT_SPRING_POOL_DEFS.filter((d) => !unlockedBefore.has(d.id) && isHotSpringPoolUnlocked(state, d.id)).map((d) => d.id);
  const logLine = `【热毛巾招待】${occupied.map((d) => `「${d.name}」`).join("、")}立刻完成一轮疗愈（状态时长 +${Math.round(stateAdd / 60)} 分钟 · 亲密 +${Math.round(affGain)}）`;
  hotSpringPushLog(hs, logLine);
  for (const pid of unlockedPools) hotSpringPushLog(hs, `【汤池开放】累计疗愈 ${hs.totalRounds} 轮，「${getHotSpringPoolDef(pid)?.name || pid}」开放泡汤了`);
  return { ok: true, costKind, pools: occupied.map((d) => d.id), affectionGained: Math.round(affGain), stateAddSec: stateAdd, unlockedPools, logLine };
}

/** Forced release / star-up material: takes the partner out of its pool. */
export function detachHotSpringMon(state, monId) {
  const hs = state?.meta?.hotSpring;
  const id = Math.floor(Number(monId) || 0);
  if (!hs || typeof hs !== "object" || !hs.pools || id <= 0) return { ok: false, detached: false };
  let detached = false;
  for (const def of HOT_SPRING_POOL_DEFS) {
    const p = hs.pools[def.id];
    if (p && Array.isArray(p.seatIds) && p.seatIds.includes(id)) {
      p.seatIds = p.seatIds.filter((x) => x !== id);
      if (!p.seatIds.length) p.carrySec = 0;
      detached = true;
    }
  }
  return { ok: true, detached };
}

/** Rebirth: every soaker is recalled (partner IDs reset); the timed states, rounds and pool unlocks stay. */
export function recallHotSpringForRebirth(state) {
  const hs = state?.meta?.hotSpring;
  if (!hs || typeof hs !== "object" || !hs.pools) return { ok: false, recalled: 0 };
  let recalled = 0;
  for (const def of HOT_SPRING_POOL_DEFS) {
    const p = hs.pools[def.id];
    if (!p) continue;
    recalled += Array.isArray(p.seatIds) ? p.seatIds.length : 0;
    p.seatIds = [];
    p.carrySec = 0;
  }
  return { ok: true, recalled };
}

/**
 * Pure non-mutating aggregator of the active timed states (wired into production / effects / breeding / PvE damage).
 * 暖身 PvE +5% · 药香 全产 +6% · 轻盈 捕获 +1% · 星辉 闪光 +10% while their remaining time is > 0. Neutral without a tracker.
 */
export function computeHotSpringAura(state) {
  const raw = state?.meta?.hotSpring;
  const st = raw && typeof raw === "object" && raw.states && typeof raw.states === "object" ? raw.states : {};
  const activeStates = [];
  let prodAdd = 0;
  let catchAdd = 0;
  let shinyAdd = 0;
  let pveOutAdd = 0;
  for (const sd of HOT_SPRING_STATE_DEFS) {
    const rem = Math.max(0, Math.min(HOT_SPRING_STATE_MAX_SEC, Number(st[sd.id]) || 0));
    if (rem <= 0) continue;
    activeStates.push({ id: sd.id, name: sd.name, remainingSec: rem, effectText: sd.effectText });
    if (sd.stat === "prod") prodAdd += sd.value;
    else if (sd.stat === "catch") catchAdd += sd.value;
    else if (sd.stat === "shiny") shinyAdd += sd.value;
    else if (sd.stat === "pveOut") pveOutAdd += sd.value;
  }
  const round4 = (n) => Math.round(n * 10000) / 10000;
  const totalRounds = raw && typeof raw === "object" ? Math.max(0, Math.floor(Number(raw.totalRounds) || 0)) : 0;
  const soakingCount = raw && typeof raw === "object" ? getHotSpringSoakingMonIds(state).size : 0;
  return {
    activeStates,
    activeCount: activeStates.length,
    soakingCount,
    seats: HOT_SPRING_POOL_DEFS.filter((d) => totalRounds >= d.unlockRounds).length * HOT_SPRING_SEATS_PER_POOL,
    totalRounds,
    title: getHotSpringTitle(totalRounds),
    prodAdd: round4(prodAdd),
    prodMul: round4(1 + prodAdd),
    catchAdd: round4(catchAdd),
    shinyAdd: round4(shinyAdd),
    shinyChanceMul: round4(1 + shinyAdd),
    pveOutAdd: round4(pveOutAdd),
    pveOutMul: round4(1 + pveOutAdd),
  };
}

// ============================================================================
// ML-14 「梦境绘本馆」(Dream Picture-Book Library)
// 3 个梦枕：空闲伙伴入梦后持续产出「灵感」，攒满一章即写成当前绘本的一章童话并收进一张「绘本插页」。
// 5 本童话绘本 × 4 章 = 20 张插页：属性契合的伙伴灵感 ×1.5，亲密度越高写得越快（最多 +50%）。
// 插页永久全产 +0.2%/张，每本绘本集齐 4 张插页点亮专属光环（PvE / 全产 / 捕获 / 闪光），全局生效；离线补算 ≤12h。
// 每章所需灵感 = 360 ×（1 + 0.5 × 书序）×（1 + 0.25 × 章序），写完 20 张插页约需 3 只伙伴连续入梦 2~3 天。
// 写完的绘本可以「重温」再写一遍（只给奖励，不重复给插页）。每日一次免费「晚安朗读」（之后 20 未来币）立刻 +180 灵感。
// 入梦伙伴接入 busyMonIds 防放生锁（经由上方统一登记表），强制放生会唤醒，转生唤醒全部伙伴（插页与进度永久保留）。
// ============================================================================

export const DREAM_PILLOW_COUNT = 3;
export const DREAM_CHAPTERS_PER_BOOK = 4;
export const DREAM_INK_PER_MIN = 1;
export const DREAM_MATCH_MUL = 1.5;
export const DREAM_MAX_CATCHUP_SEC = 12 * 3600;
export const DREAM_CHAPTER_BASE_INK = 360;
export const DREAM_STORY_INK = 180;
export const DREAM_FREE_STORY_PER_DAY = 1;
export const DREAM_STORY_COIN_COST = 20;
export const DREAM_PAGE_PROD_ADD = 0.002;
export const DREAM_BOOK_BONUS_COIN = 30;
export const DREAM_LOG_KEEP = 6;

/** 5 本童话绘本：每本 4 章、2~3 个契合属性、集齐插页后的专属光环。 */
export const DREAM_BOOK_DEFS = Object.freeze(
  [
    {
      id: "volcano",
      name: "会唱歌的小火山",
      elements: ["fire", "stone"],
      unlockPages: 0,
      aura: { pveOut: 0.04 },
      auraText: "PvE 增伤 +4%",
      desc: "熔岩与岩石的童话，火系与岩系伙伴写得最顺手。",
      chapters: [
        { title: "岩缝里的摇篮曲", text: "小火山每晚都哼着暖暖的歌，岩缝里的小灵兽听着听着就睡着了。" },
        { title: "歌声熄灭的早晨", text: "有一天小火山突然唱不出声，整座山谷都冷得打起了喷嚏。" },
        { title: "石头乐团来帮忙", text: "圆滚滚的石头们排成一排，咚咚咚地替小火山打起了节拍。" },
        { title: "最暖和的合唱", text: "小火山终于又唱起来了，这一次，整座山谷都跟着一起唱。" },
      ],
    },
    {
      id: "honeyForest",
      name: "蜜露森林茶话会",
      elements: ["grass", "water"],
      unlockPages: 0,
      aura: { prod: 0.025 },
      auraText: "全产 +2.5%",
      desc: "草木与溪水的童话，草系与水系伙伴写得最顺手。",
      chapters: [
        { title: "一封叶子请柬", text: "风把一片写着字的叶子吹进树洞：今晚月亮升起时，森林要开茶话会。" },
        { title: "借一点溪水", text: "茶壶里没有水，小灵兽们排着队去溪边，一捧一捧借来了清凉的溪水。" },
        { title: "蜜露不够甜", text: "蜜露茶有点苦，蜜蜂们连夜飞遍花丛，带回了最甜的那一滴。" },
        { title: "森林里的干杯声", text: "月亮升起来了，所有的叶子一起举杯，连露珠都在偷偷地笑。" },
      ],
    },
    {
      id: "windbell",
      name: "风铃与雷云的约定",
      elements: ["wind", "electric"],
      unlockPages: 3,
      aura: { catch: 0.008 },
      auraText: "捕获 +0.8%",
      desc: "风与雷的童话，风系与电系伙伴写得最顺手。",
      chapters: [
        { title: "挂在云上的风铃", text: "高原的风铃想去天上看看，就悄悄挂在了一朵小雷云的尾巴上。" },
        { title: "会打嗝的雷云", text: "小雷云一紧张就打嗝，每打一个嗝，风铃就叮叮当当响一声。" },
        { title: "迷路的小闪电", text: "一道小闪电找不到回家的路，风铃用叮当声给它指了方向。" },
        { title: "天空的约定", text: "雷云答应每次下雨前都先摇一摇风铃，提醒大家记得收衣服。" },
      ],
    },
    {
      id: "moonboat",
      name: "月亮船夜航记",
      elements: ["light", "dark"],
      unlockPages: 7,
      aura: { shiny: 0.08 },
      auraText: "闪光 +8%",
      desc: "月光与影子的童话，光系与暗系伙伴写得最顺手。",
      chapters: [
        { title: "月亮掉进了湖里", text: "湖面上漂着一弯月亮，小灵兽们跳上去，才发现它是一艘会发光的船。" },
        { title: "影子当船桨", text: "船上没有桨，大家就用自己的影子轻轻划水，月亮船悠悠地出发了。" },
        { title: "星星灯塔", text: "夜雾太浓了，一颗星星飞下来站在船头，变成了最亮的灯塔。" },
        { title: "天亮前的归航", text: "天快亮时，月亮船把大家送回岸边，又慢慢升回了天上。" },
      ],
    },
    {
      id: "starfall",
      name: "星星掉进梦里",
      elements: ["mystic", "light", "dark"],
      unlockPages: 12,
      aura: { prod: 0.015, shiny: 0.04 },
      auraText: "全产 +1.5% · 闪光 +4%",
      desc: "绘本馆最深处的童话，幻 / 光 / 暗系伙伴写得最顺手。",
      chapters: [
        { title: "枕头边的星光", text: "半夜里，一颗小星星从窗缝溜进来，躲进了枕头边的梦里。" },
        { title: "梦的另一边", text: "跟着星星往梦里走，草地是软软的云，小河会轻轻地唱歌。" },
        { title: "找回家的路", text: "星星想回天上了，可梦太大太大，大家手牵着手替它找路。" },
        { title: "每个梦里都有一颗星", text: "星星回到了天上，从此每个做梦的小灵兽，枕边都多了一点光。" },
      ],
    },
  ].map((b) =>
    Object.freeze({
      ...b,
      elements: Object.freeze(b.elements.slice()),
      aura: Object.freeze({ ...b.aura }),
      chapters: Object.freeze(b.chapters.map((c) => Object.freeze({ ...c }))),
    }),
  ),
);

export const DREAM_TOTAL_PAGES = DREAM_BOOK_DEFS.length * DREAM_CHAPTERS_PER_BOOK;

const DREAM_TITLES = Object.freeze([
  { minPages: 20, name: "梦境绘本大师" },
  { minPages: 10, name: "童话执笔人" },
  { minPages: 4, name: "见习绘本作者" },
  { minPages: 0, name: "绘本馆新读者" },
]);

export function getDreamBookDef(bookId) {
  return DREAM_BOOK_DEFS.find((b) => b.id === bookId) || null;
}

export function getDreamLibraryTitle(pageCount = 0) {
  const n = Math.max(0, Math.floor(Number(pageCount) || 0));
  return (DREAM_TITLES.find((t) => n >= t.minPages) || DREAM_TITLES[DREAM_TITLES.length - 1]).name;
}

/** Inspiration needed for chapter `chapterIdx` (0..3) of a book: 360 × (1 + 0.5 × 书序) × (1 + 0.25 × 章序). */
export function getDreamChapterNeed(bookId, chapterIdx = 0) {
  const idx = Math.max(0, DREAM_BOOK_DEFS.findIndex((b) => b.id === bookId));
  const c = Math.max(0, Math.min(DREAM_CHAPTERS_PER_BOOK - 1, Math.floor(Number(chapterIdx) || 0)));
  return Math.round(DREAM_CHAPTER_BASE_INK * (1 + 0.5 * idx) * (1 + 0.25 * c));
}

export function dreamPageKey(bookId, chapterIdx) {
  return `${bookId}:${Math.max(0, Math.floor(Number(chapterIdx) || 0))}`;
}

function dreamPagesOf(state) {
  const pages = state?.meta?.dreamLibrary?.pages;
  return pages && typeof pages === "object" ? pages : {};
}

function dreamHasPage(pages, bookId, chapterIdx) {
  return Object.prototype.hasOwnProperty.call(pages, dreamPageKey(bookId, chapterIdx));
}

/** Non-mutating: collected picture-book pages (0..20). */
export function getDreamPageCount(state) {
  const pages = dreamPagesOf(state);
  let n = 0;
  for (const b of DREAM_BOOK_DEFS) for (let c = 0; c < DREAM_CHAPTERS_PER_BOOK; c += 1) if (dreamHasPage(pages, b.id, c)) n += 1;
  return n;
}

/** Non-mutating: the authors recorded on a collected page (null when the page is not collected yet). */
export function getDreamPageAuthors(state, bookId, chapterIdx) {
  const pages = dreamPagesOf(state);
  if (!dreamHasPage(pages, bookId, chapterIdx)) return null;
  const v = pages[dreamPageKey(bookId, chapterIdx)];
  return typeof v === "string" ? v : "";
}

export function isDreamBookUnlocked(state, bookId) {
  const def = getDreamBookDef(bookId);
  if (!def) return false;
  return getDreamPageCount(state) >= def.unlockPages;
}

/** A book is complete once all 4 of its pages are collected. */
export function isDreamBookComplete(state, bookId) {
  const def = getDreamBookDef(bookId);
  if (!def) return false;
  const pages = dreamPagesOf(state);
  for (let c = 0; c < DREAM_CHAPTERS_PER_BOOK; c += 1) if (!dreamHasPage(pages, def.id, c)) return false;
  return true;
}

function normalizeDreamPages(rawPages) {
  const src = rawPages && typeof rawPages === "object" ? rawPages : {};
  const out = {};
  for (const b of DREAM_BOOK_DEFS) {
    for (let c = 0; c < DREAM_CHAPTERS_PER_BOOK; c += 1) {
      const key = dreamPageKey(b.id, c);
      if (!Object.prototype.hasOwnProperty.call(src, key)) continue;
      const v = src[key];
      if (typeof v === "string") out[key] = v.slice(0, 48);
      else if (v === true || v === 1) out[key] = "";
    }
  }
  return out;
}

export function ensureDreamLibraryState(state) {
  if (!state || typeof state !== "object") return null;
  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  const raw = state.meta.dreamLibrary && typeof state.meta.dreamLibrary === "object" ? state.meta.dreamLibrary : {};
  const monList = Array.isArray(state?.mons?.list) ? state.mons.list : null;
  const aliveSet = monList
    ? new Set(
        monList
          .map((m) => (m && typeof m.id === "number" && Number.isFinite(m.id) ? Math.floor(m.id) : null))
          .filter((x) => x !== null && x > 0),
      )
    : null;
  const pages = normalizeDreamPages(raw.pages);
  const pageCount = Object.keys(pages).length;
  const rawBooks = raw.books && typeof raw.books === "object" ? raw.books : {};
  const books = {};
  for (const def of DREAM_BOOK_DEFS) {
    const rb = rawBooks[def.id] && typeof rawBooks[def.id] === "object" ? rawBooks[def.id] : {};
    const written = Math.max(0, Math.min(DREAM_CHAPTERS_PER_BOOK - 1, Math.floor(Number(rb.written) || 0)));
    const need = getDreamChapterNeed(def.id, written);
    const ink = Number(rb.ink);
    books[def.id] = {
      written,
      ink: Number.isFinite(ink) && ink > 0 ? Math.min(need - 0.001, ink) : 0,
      editions: Math.max(0, Math.min(9999, Math.floor(Number(rb.editions) || 0))),
    };
  }
  const bookDef = getDreamBookDef(raw.bookId);
  const bookId = bookDef && pageCount >= bookDef.unlockPages ? bookDef.id : DREAM_BOOK_DEFS[0].id;
  const lc = raw.lastChapter && typeof raw.lastChapter === "object" ? raw.lastChapter : null;
  const lcBook = lc ? getDreamBookDef(lc.bookId) : null;
  const lastChapter = lcBook
    ? {
        bookId: lcBook.id,
        chapterIdx: Math.max(0, Math.min(DREAM_CHAPTERS_PER_BOOK - 1, Math.floor(Number(lc.chapterIdx) || 0))),
        authors: typeof lc.authors === "string" ? lc.authors.slice(0, 48) : "",
        newPage: Boolean(lc.newPage),
        reread: Boolean(lc.reread),
        at: typeof lc.at === "number" && Number.isFinite(lc.at) ? lc.at : 0,
      }
    : null;
  const recentLogs = Array.isArray(raw.recentLogs)
    ? raw.recentLogs.filter((s) => typeof s === "string" && s.trim().length > 0).slice(0, DREAM_LOG_KEEP)
    : [];
  const clean = {
    initialized: true,
    dreamerIds: normalizeIdList(raw.dreamerIds, DREAM_PILLOW_COUNT, aliveSet),
    bookId,
    books,
    pages,
    totalChapters: Math.max(0, Math.floor(Number(raw.totalChapters) || 0)),
    storyDate: typeof raw.storyDate === "string" ? raw.storyDate : "",
    storyUsed: Math.max(0, Math.floor(Number(raw.storyUsed) || 0)),
    lastChapter,
    recentLogs,
  };
  if (state.meta.dreamLibrary && typeof state.meta.dreamLibrary === "object") {
    Object.assign(state.meta.dreamLibrary, clean);
    return state.meta.dreamLibrary;
  }
  state.meta.dreamLibrary = clean;
  return clean;
}

function dreamPushLog(dl, line) {
  dl.recentLogs = [line, ...(dl.recentLogs || [])].slice(0, DREAM_LOG_KEEP);
}

/** Non-mutating read: partners dreaming on the pillows — protected via the away registry. */
export function getDreamLibraryDreamerIds(state) {
  const ids = new Set();
  const raw = state?.meta?.dreamLibrary?.dreamerIds;
  if (!Array.isArray(raw)) return ids;
  const monList = Array.isArray(state?.mons?.list) ? state.mons.list : null;
  const validSet = monList ? new Set(monList.filter((m) => m && typeof m.id === "number").map((m) => Math.floor(m.id))) : null;
  for (const v of raw) {
    const id = Math.floor(Number(v) || 0);
    if (id > 0 && (!validSet || validSet.has(id))) ids.add(id);
    if (ids.size >= DREAM_PILLOW_COUNT) break;
  }
  return ids;
}

/** Idle partners that may lie down on a dream pillow (not busy anywhere, incl. every away activity). */
export function getIdleDreamCandidates(state) {
  return listIdleOutingMons(state);
}

/** Per-dreamer writing speed: 1 灵感/分钟 × 1.5（属性契合）× (1 + 亲密 / 200)。 */
export function evaluateDreamWriter(mon, bookId, opts = {}) {
  const book = getDreamBookDef(bookId);
  if (!mon || !book) return { match: false, inkPerMin: 0, affection: 0 };
  const types = resolveMonTypesForEco(mon, opts);
  const match = types.some((t) => book.elements.includes(t));
  const aff = Math.max(0, Math.min(100, typeof mon.affection === "number" && Number.isFinite(mon.affection) ? mon.affection : 0));
  const inkPerMin = Math.round(DREAM_INK_PER_MIN * (match ? DREAM_MATCH_MUL : 1) * (1 + aff / 200) * 1000) / 1000;
  return { match, inkPerMin, affection: aff };
}

function dreamersOf(state) {
  const ids = getDreamLibraryDreamerIds(state);
  const list = Array.isArray(state?.mons?.list) ? state.mons.list : [];
  return [...ids].map((id) => list.find((m) => m && m.id === id)).filter(Boolean);
}

/** Total inspiration per minute of the current dreamers on the current book. */
export function getDreamInkRatePerMin(state, opts = {}) {
  const dl = state?.meta?.dreamLibrary;
  if (!dl || typeof dl !== "object") return 0;
  let sum = 0;
  for (const m of dreamersOf(state)) sum += evaluateDreamWriter(m, dl.bookId, opts).inkPerMin;
  return Math.round(sum * 1000) / 1000;
}

function nextUnfinishedDreamBook(state, afterId) {
  const startIdx = Math.max(0, DREAM_BOOK_DEFS.findIndex((b) => b.id === afterId));
  for (let k = 1; k <= DREAM_BOOK_DEFS.length; k += 1) {
    const def = DREAM_BOOK_DEFS[(startIdx + k) % DREAM_BOOK_DEFS.length];
    if (isDreamBookUnlocked(state, def.id) && !isDreamBookComplete(state, def.id)) return def.id;
  }
  return null;
}

/** Writes one chapter of the current book (ink ≥ need): page (first edition), rewards, dreamer exp / affection, auto-advance. */
function completeDreamChapter(state, dl, opts = {}) {
  const def = getDreamBookDef(dl.bookId) || DREAM_BOOK_DEFS[0];
  const bookIdx = DREAM_BOOK_DEFS.indexOf(def);
  const b = dl.books[def.id];
  const chapterIdx = Math.max(0, Math.min(DREAM_CHAPTERS_PER_BOOK - 1, b.written));
  const need = getDreamChapterNeed(def.id, chapterIdx);
  b.ink = Math.max(0, (Number(b.ink) || 0) - need);
  const writers = dreamersOf(state);
  const authors = writers.map((m) => String(m.name || "伙伴").slice(0, 12)).join("、").slice(0, 48);
  const unlockedBefore = new Set(DREAM_BOOK_DEFS.filter((d) => isDreamBookUnlocked(state, d.id)).map((d) => d.id));
  const key = dreamPageKey(def.id, chapterIdx);
  const newPage = !Object.prototype.hasOwnProperty.call(dl.pages, key);
  if (newPage) dl.pages[key] = authors;
  const bookComplete = newPage && isDreamBookComplete(state, def.id);
  const rewards = { futurecoin: newPage ? 6 + 3 * bookIdx : 3 + 2 * bookIdx };
  if (!newPage) rewards.catnip = 60 + 20 * bookIdx;
  if (bookComplete) rewards.futurecoin += DREAM_BOOK_BONUS_COIN;
  for (const [rid, n] of Object.entries(rewards)) addResDirect(state, rid, n, opts);
  const expEach = 60 + 30 * bookIdx;
  for (const m of writers) {
    if (typeof opts.addExpToMon === "function") opts.addExpToMon(m, expEach);
    else m.exp = Math.max(0, Math.floor((Number(m.exp) || 0) + expEach));
    const aff0 = typeof m.affection === "number" && Number.isFinite(m.affection) ? m.affection : 0;
    m.affection = Math.min(100, Math.max(0, aff0 + 2));
  }
  b.written += 1;
  if (b.written >= DREAM_CHAPTERS_PER_BOOK) {
    b.written = 0;
    b.editions = (b.editions || 0) + 1;
  }
  dl.totalChapters = (dl.totalChapters || 0) + 1;
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  dl.lastChapter = { bookId: def.id, chapterIdx, authors, newPage, reread: !newPage, at: nowMs };
  const chapter = def.chapters[chapterIdx];
  dreamPushLog(
    dl,
    `【${newPage ? "写成新章" : "重温旧章"}】《${def.name}》第 ${chapterIdx + 1} 章「${chapter.title}」${newPage ? " · 收进一张绘本插页" : ""}（执笔：${authors || "伙伴们"}）`,
  );
  let switchedTo = null;
  if (bookComplete) {
    dreamPushLog(dl, `【绘本完成】《${def.name}》4 张插页全部集齐，点亮光环「${def.auraText}」`);
    const nextId = nextUnfinishedDreamBook(state, def.id);
    if (nextId) {
      dl.bookId = nextId;
      switchedTo = nextId;
    }
  }
  const unlockedBooks = DREAM_BOOK_DEFS.filter((d) => !unlockedBefore.has(d.id) && isDreamBookUnlocked(state, d.id)).map((d) => d.id);
  for (const id of unlockedBooks) dreamPushLog(dl, `【新绘本上架】集齐 ${getDreamPageCount(state)} 张插页，《${getDreamBookDef(id)?.name || id}》可以开始写了`);
  return { bookId: def.id, chapterIdx, title: chapter.title, text: chapter.text, authors, newPage, bookComplete, rewards, expEach, switchedTo, unlockedBooks };
}

/** Writes every chapter the current ink already covers (used after 晚安朗读). */
function drainDreamChapters(state, dl, opts = {}) {
  const out = [];
  for (let guard = 0; guard < 40; guard += 1) {
    const b = dl.books[dl.bookId];
    if (!b || b.ink < getDreamChapterNeed(dl.bookId, b.written) - 1e-9) break;
    out.push(completeDreamChapter(state, dl, opts));
  }
  return out;
}

/**
 * Live tick + offline catch-up (≤12h): inspiration flows at the dreamers' combined rate; chapters complete in chronological order and a
 * finished book auto-advances to the next unlocked one, so a long absence lands on the same progress as playing it out live.
 */
export function advanceDreamLibrary(state, dtSec, opts = {}) {
  const dl = state?.meta?.dreamLibrary;
  const empty = { chapters: [], inkAdded: 0 };
  if (!dl || typeof dl !== "object" || !dl.books || !dl.pages) return empty;
  const step = typeof dtSec === "number" && Number.isFinite(dtSec) && dtSec > 0 ? Math.min(DREAM_MAX_CATCHUP_SEC, dtSec) : 0;
  if (step <= 0) return empty;
  if (!dreamersOf(state).length) return empty;
  const chapters = [];
  let remaining = step;
  let inkAdded = 0;
  for (let guard = 0; guard < 400 && remaining > 1e-9; guard += 1) {
    const ratePerSec = getDreamInkRatePerMin(state, opts) / 60;
    if (!(ratePerSec > 0)) break;
    const b = dl.books[dl.bookId];
    if (!b) break;
    const need = getDreamChapterNeed(dl.bookId, b.written);
    const missing = Math.max(0, need - (Number(b.ink) || 0));
    const t = missing / ratePerSec;
    if (t <= remaining + 1e-9) {
      remaining -= t;
      inkAdded += missing;
      b.ink = need;
      chapters.push(completeDreamChapter(state, dl, opts));
    } else {
      b.ink = (Number(b.ink) || 0) + ratePerSec * remaining;
      inkAdded += ratePerSec * remaining;
      remaining = 0;
    }
  }
  return { chapters, inkAdded: Math.round(inkAdded * 1000) / 1000 };
}

/** Lies an idle partner down on a free pillow, or — when it already dreams — wakes it up. */
export function toggleDreamer(state, monId, opts = {}) {
  const dl = ensureDreamLibraryState(state);
  if (!dl) return { ok: false, reason: "invalid_state" };
  const id = Math.floor(Number(monId) || 0);
  if (id <= 0) return { ok: false, reason: "invalid_mon" };
  if (dl.dreamerIds.includes(id)) {
    dl.dreamerIds = dl.dreamerIds.filter((x) => x !== id);
    const mon = (state.mons?.list || []).find((m) => m && m.id === id);
    dreamPushLog(dl, `【醒来】${mon?.name || "伙伴"} 揉揉眼睛醒了过来`);
    return { ok: true, dreaming: false };
  }
  if (dl.dreamerIds.length >= DREAM_PILLOW_COUNT) return { ok: false, reason: "pillows_full" };
  const mon = getIdleDreamCandidates(state).find((m) => m.id === id);
  if (!mon) return { ok: false, reason: "mon_busy" };
  dl.dreamerIds = [...dl.dreamerIds, id];
  const ev = evaluateDreamWriter(mon, dl.bookId, opts);
  dreamPushLog(dl, `【入梦】${mon.name || "伙伴"} 枕着梦枕睡着了，开始为《${getDreamBookDef(dl.bookId)?.name || ""}》构思${ev.match ? "（题材契合）" : ""}`);
  return { ok: true, dreaming: true, match: ev.match };
}

/** 「一键入梦」: fills the free pillows — fastest writers for the current book first (题材契合 × 亲密), then level. */
export function autoFillDreamers(state, opts = {}) {
  const dl = ensureDreamLibraryState(state);
  if (!dl) return { ok: false, added: [] };
  const added = [];
  while (dl.dreamerIds.length < DREAM_PILLOW_COUNT) {
    const pick = getIdleDreamCandidates(state)
      .map((m) => ({ m, ev: evaluateDreamWriter(m, dl.bookId, opts) }))
      .sort(
        (a, b) =>
          b.ev.inkPerMin - a.ev.inkPerMin ||
          Math.floor(Number(b.m.lvl) || 1) - Math.floor(Number(a.m.lvl) || 1) ||
          (a.m.id || 0) - (b.m.id || 0),
      )[0];
    if (!pick) break;
    dl.dreamerIds = [...dl.dreamerIds, pick.m.id];
    added.push(pick.m.id);
  }
  if (added.length) dreamPushLog(dl, `【一键入梦】${added.length} 只伙伴枕着梦枕睡着了（入梦期间防放生保护生效）`);
  return { ok: added.length > 0, reason: added.length ? "" : dl.dreamerIds.length >= DREAM_PILLOW_COUNT ? "pillows_full" : "no_idle_mons", added };
}

/** 「全部醒来」: every dreamer wakes up (ink already gathered stays on the book). */
export function wakeAllDreamers(state) {
  const dl = ensureDreamLibraryState(state);
  if (!dl) return { ok: false, woken: 0 };
  const woken = dl.dreamerIds.length;
  dl.dreamerIds = [];
  if (woken) dreamPushLog(dl, `【全部醒来】${woken} 只伙伴伸着懒腰醒了过来，灵感留在了书页上`);
  return { ok: woken > 0, woken };
}

/** Switches the book being written (unlocked books only; each book keeps its own chapter progress). */
export function selectDreamBook(state, bookId) {
  const dl = ensureDreamLibraryState(state);
  if (!dl) return { ok: false, reason: "invalid_state" };
  const def = getDreamBookDef(bookId);
  if (!def) return { ok: false, reason: "unknown_book" };
  if (!isDreamBookUnlocked(state, def.id)) return { ok: false, reason: "locked", needPages: def.unlockPages };
  if (dl.bookId === def.id) return { ok: false, reason: "already_selected" };
  dl.bookId = def.id;
  dreamPushLog(dl, `【换一本写】梦枕边摊开了《${def.name}》${isDreamBookComplete(state, def.id) ? "（重温版，只给奖励不再给插页）" : ""}`);
  return { ok: true, bookId: def.id, reread: isDreamBookComplete(state, def.id) };
}

export function getDreamStoryFreeLeft(state, nowMs = Date.now()) {
  const dl = state?.meta?.dreamLibrary;
  if (!dl || typeof dl !== "object") return DREAM_FREE_STORY_PER_DAY;
  if (dl.storyDate !== localYmdForSandbox(nowMs)) return DREAM_FREE_STORY_PER_DAY;
  return Math.max(0, DREAM_FREE_STORY_PER_DAY - Math.floor(Number(dl.storyUsed) || 0));
}

/** 「晚安朗读」: +180 inspiration to the current book at once (chapters complete immediately). Free once per local day, then futurecoin ×20. */
export function performDreamStory(state, opts = {}) {
  const dl = ensureDreamLibraryState(state);
  if (!dl) return { ok: false, reason: "invalid_state" };
  if (!dreamersOf(state).length) return { ok: false, reason: "no_dreamers" };
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const today = localYmdForSandbox(nowMs);
  if (dl.storyDate !== today) {
    dl.storyDate = today;
    dl.storyUsed = 0;
  }
  let costKind = "";
  if (dl.storyUsed < DREAM_FREE_STORY_PER_DAY) {
    dl.storyUsed += 1;
    costKind = "free_daily";
  } else if ((Number(state.res?.futurecoin?.value) || 0) >= DREAM_STORY_COIN_COST) {
    state.res.futurecoin.value = Math.max(0, Math.floor(state.res.futurecoin.value) - DREAM_STORY_COIN_COST);
    costKind = "futurecoin";
  } else {
    return { ok: false, reason: "insufficient_story_cost" };
  }
  const book = getDreamBookDef(dl.bookId);
  const b = dl.books[dl.bookId];
  b.ink = (Number(b.ink) || 0) + DREAM_STORY_INK;
  const chapters = drainDreamChapters(state, dl, { ...opts, nowMs });
  const logLine = `【晚安朗读】给入梦的伙伴们读了一段《${book?.name || ""}》，灵感 +${DREAM_STORY_INK}${chapters.length ? ` · 写成 ${chapters.length} 章` : ""}`;
  dreamPushLog(dl, logLine);
  return { ok: true, costKind, ink: DREAM_STORY_INK, chapters, logLine };
}

/** Forced release / star-up material: wakes the partner. */
export function detachDreamer(state, monId) {
  const dl = state?.meta?.dreamLibrary;
  const id = Math.floor(Number(monId) || 0);
  if (!dl || typeof dl !== "object" || !Array.isArray(dl.dreamerIds) || id <= 0) return { ok: false, detached: false };
  const before = dl.dreamerIds.length;
  dl.dreamerIds = dl.dreamerIds.filter((x) => Math.floor(Number(x) || 0) !== id);
  return { ok: true, detached: dl.dreamerIds.length !== before };
}

/** Rebirth: every dreamer wakes (partner IDs reset); pages, chapter progress and editions are permanent. */
export function recallDreamLibraryForRebirth(state) {
  const dl = state?.meta?.dreamLibrary;
  if (!dl || typeof dl !== "object" || !Array.isArray(dl.dreamerIds)) return { ok: false, woken: 0 };
  const woken = dl.dreamerIds.length;
  dl.dreamerIds = [];
  return { ok: true, woken };
}

/**
 * Pure non-mutating aggregator (wired into production / effects / breeding / PvE damage):
 * 每张插页 全产 +0.2%（20 张 = 4%）；集齐一本：小火山 PvE +4% · 茶话会 全产 +2.5% · 风铃 捕获 +0.8% · 月亮船 闪光 +8% · 星星 全产 +1.5% 闪光 +4%。
 */
export function computeDreamLibraryAura(state) {
  const raw = state?.meta?.dreamLibrary;
  const pageCount = getDreamPageCount(state);
  const completeBookIds = DREAM_BOOK_DEFS.filter((b) => isDreamBookComplete(state, b.id)).map((b) => b.id);
  let prodAdd = pageCount * DREAM_PAGE_PROD_ADD;
  let catchAdd = 0;
  let shinyAdd = 0;
  let pveOutAdd = 0;
  for (const id of completeBookIds) {
    const a = getDreamBookDef(id).aura;
    prodAdd += a.prod || 0;
    catchAdd += a.catch || 0;
    shinyAdd += a.shiny || 0;
    pveOutAdd += a.pveOut || 0;
  }
  const round4 = (n) => Math.round(n * 10000) / 10000;
  return {
    pageCount,
    totalPages: DREAM_TOTAL_PAGES,
    completeBooks: completeBookIds.length,
    completeBookIds,
    totalBooks: DREAM_BOOK_DEFS.length,
    dreamingCount: raw && typeof raw === "object" ? getDreamLibraryDreamerIds(state).size : 0,
    title: getDreamLibraryTitle(pageCount),
    prodAdd: round4(prodAdd),
    prodMul: round4(1 + prodAdd),
    catchAdd: round4(catchAdd),
    shinyAdd: round4(shinyAdd),
    shinyChanceMul: round4(1 + shinyAdd),
    pveOutAdd: round4(pveOutAdd),
    pveOutMul: round4(1 + pveOutAdd),
  };
}

/**
 * ML-14 溪畔钓鱼会 lives in pve_tower.js, but its anglers must join the shared away registry above
 * (collection_fun.js cannot import pve_tower.js without a cycle), so the non-mutating reader sits here.
 */
export const FISHING_MAX_ANGLERS = 3;

/** Non-mutating read: partners fishing at the creek — protected via the away registry. */
export function getFishingAnglerMonIds(state) {
  const ids = new Set();
  const raw = state?.meta?.fishingClub?.anglerIds;
  if (!Array.isArray(raw)) return ids;
  const monList = Array.isArray(state?.mons?.list) ? state.mons.list : null;
  const validSet = monList ? new Set(monList.filter((m) => m && typeof m.id === "number").map((m) => Math.floor(m.id))) : null;
  for (const v of raw) {
    const id = Math.floor(Number(v) || 0);
    if (id > 0 && (!validSet || validSet.has(id))) ids.add(id);
    if (ids.size >= FISHING_MAX_ANGLERS) break;
  }
  return ids;
}

/** Idle partners that may join the fishing club (shared with the dream library and every other outing). */
export function getIdleFishingCandidates(state) {
  return listIdleOutingMons(state);
}
