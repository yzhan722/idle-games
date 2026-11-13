/** Collection dopamine — shiny gallery + season relics (non-FC unique loot). */

import { REMOTE_CONFIG_DEFAULTS } from "../remote_config.js";
import { getBeastTier } from "../beast_defs.js";

/** Season relics: unique named loot (existing item grants), not another FC daily. */
export const SEASON_RELIC_TABLE = Object.freeze({
  s1: { id: "ember_sigil", name: "余烬印记", item: "rareCandy", chance: 0.14, blurb: "远征余烬凝成印记。" },
  s2: { id: "vial_sigil", name: "药剂印记", item: "hpPotion", chance: 0.18, blurb: "药瓶残液凝成印记。" },
  s3: { id: "peak_sigil", name: "峰顶印记", item: "expCandy", chance: 0.16, blurb: "高阶副本的峰顶印记。" },
});

const DEFAULT_RELIC = SEASON_RELIC_TABLE.s1;

export function resolveSeasonRelicDef(seasonId) {
  const sid = typeof seasonId === "string" && seasonId.trim() ? seasonId.trim() : REMOTE_CONFIG_DEFAULTS.seasonId;
  return SEASON_RELIC_TABLE[sid] || DEFAULT_RELIC;
}

/** @returns {null|{id,name,item,blurb}} */
export function rollSeasonRelic(seasonId, randFloat = Math.random) {
  const def = resolveSeasonRelicDef(seasonId);
  const roll = typeof randFloat === "function" ? randFloat() : Math.random();
  if (roll >= def.chance) return null;
  return { id: def.id, name: def.name, item: def.item, blurb: def.blurb };
}

export function ensureSeasonRelics(state) {
  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  if (!state.meta.seasonRelics || typeof state.meta.seasonRelics !== "object") {
    state.meta.seasonRelics = {};
  }
  return state.meta.seasonRelics;
}

/** Record relic + return grant payload. Caller applies addRes. */
export function noteSeasonRelic(state, relic) {
  if (!relic || typeof relic !== "object" || !relic.id) return null;
  const bag = ensureSeasonRelics(state);
  const prev = Math.max(0, Math.floor(bag[relic.id] || 0));
  bag[relic.id] = prev + 1;
  return { id: relic.id, name: relic.name, item: relic.item, count: bag[relic.id], blurb: relic.blurb || "" };
}

export function seasonRelicLines(state) {
  const bag = state?.meta?.seasonRelics;
  if (!bag || typeof bag !== "object") return [];
  const out = [];
  for (const def of Object.values(SEASON_RELIC_TABLE)) {
    const n = Math.max(0, Math.floor(bag[def.id] || 0));
    if (n > 0) out.push({ id: def.id, name: def.name, count: n, item: def.item });
  }
  return out;
}

/** Shiny species gallery — unique pid keys. */
export function ensureShinyDex(state) {
  if (!state.dex || typeof state.dex !== "object") state.dex = { caught: {} };
  if (!state.dex.shiny || typeof state.dex.shiny !== "object") state.dex.shiny = {};
  return state.dex.shiny;
}

/** Register shiny species; returns milestone payload if a threshold unlocked. */
export function noteShinySpecies(state, species, { silent = false } = {}) {
  if (!species || typeof species !== "object") return null;
  const pid = species.id;
  if (!pid) return null;
  const shiny = ensureShinyDex(state);
  const wasNew = !shiny[pid];
  shiny[pid] = {
    dex: typeof species.dex === "number" ? species.dex : 0,
    name: typeof species.name === "string" ? species.name : String(pid),
    tier: typeof species.tier === "string" && species.tier ? species.tier : undefined,
    at: Date.now(),
  };
  if (!wasNew || silent) return null;
  const unique = Object.keys(shiny).length;
  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  if (!state.meta.shinyMilestones || typeof state.meta.shinyMilestones !== "object") {
    state.meta.shinyMilestones = {};
  }
  const ms = state.meta.shinyMilestones;
  const thresholds = [
    { n: 1, id: "s1", item: "rareCandy", label: "首枚闪光图鉴：跃级糖丸 ×1" },
    { n: 3, id: "s3", item: "expCandy", label: "闪光图鉴×3：历练糖丸 ×1" },
    { n: 5, id: "s5", item: "affectionTreat", label: "闪光图鉴×5：亲密点心 ×1" },
  ];
  for (const t of thresholds) {
    if (unique >= t.n && !ms[t.id]) {
      ms[t.id] = true;
      return { id: t.id, item: t.item, label: t.label, unique };
    }
  }
  return null;
}

export function shinyGalleryEntries(state, limit = 12) {
  const shiny = state?.dex?.shiny;
  if (!shiny || typeof shiny !== "object") return [];
  const entries = Object.entries(shiny)
    .map(([pid, v]) => ({
      pid,
      dex: typeof v?.dex === "number" ? v.dex : 0,
      name: typeof v?.name === "string" ? v.name : pid,
      at: typeof v?.at === "number" ? v.at : 0,
    }))
    .sort((a, b) => b.at - a.at);
  const lim = Math.max(0, Math.floor(limit));
  return lim > 0 ? entries.slice(0, lim) : entries;
}

export function shinyUniqueCount(state) {
  const shiny = state?.dex?.shiny;
  if (!shiny || typeof shiny !== "object") return 0;
  return Object.keys(shiny).length;
}

/** Sync gallery from owned shiny mons (migration / repair; no milestone grants). */
export function syncShinyGalleryFromMons(state) {
  const list = Array.isArray(state?.mons?.list) ? state.mons.list : [];
  let added = 0;
  for (const m of list) {
    if (!m || !m.isShiny || !m.pid) continue;
    const before = shinyUniqueCount(state);
    noteShinySpecies(state, { id: m.pid, dex: m.dex, name: m.name, tier: m.tier }, { silent: true });
    if (shinyUniqueCount(state) > before) added += 1;
  }
  return added;
}

/** Plain-text shiny gallery share. Empty gallery → "". */
export function buildShinyShareText(state, limit = 6) {
  const unique = shinyUniqueCount(state);
  const gallery = shinyGalleryEntries(state, 16);
  const names = gallery
    .slice(0, Math.max(0, Math.floor(limit)))
    .map((e) => e.name)
    .filter(Boolean);
  if (!names.length || unique <= 0) return "";
  return `我的闪光馆（${unique}）：${names.join("、")}${gallery.length > 6 ? "…" : ""} — 萌灵放置冒险`;
}

/** Structured payload for a share card / canvas. */
export function shinyShareCardPayload(state) {
  const unique = shinyUniqueCount(state);
  const entries = shinyGalleryEntries(state, 8).map((e) => ({
    pid: e.pid,
    dex: e.dex,
    name: e.name,
  }));
  return { unique, entries, title: "闪光馆", game: "萌灵放置冒险" };
}

/** ML-3 闪光殿堂展柜：最多供奉 6 种已点亮闪光物种，按稀有度与六席共鸣提供全局光环。 */
export const SHINY_SHOWCASE_MAX = 6;

export const SHINY_PEDESTAL_AURA = Object.freeze({
  common:   { prodAdd: 0.03,  trainExpAdd: 0.04, catchAdd: 0.008, label: "常见" },
  uncommon: { prodAdd: 0.045, trainExpAdd: 0.06, catchAdd: 0.012, label: "少见" },
  rare:     { prodAdd: 0.065, trainExpAdd: 0.09, catchAdd: 0.018, label: "稀有" },
  epic:     { prodAdd: 0.10,  trainExpAdd: 0.14, catchAdd: 0.025, label: "史诗" },
});

export const SHINY_FULL_RESONANCE = Object.freeze({
  prodAdd: 0.12,
  trainExpAdd: 0.18,
  catchAdd: 0.03,
});

const SHOWCASE_TIER_WEIGHT = { epic: 4, rare: 3, uncommon: 2, common: 1 };

function resolveShinyEntryTier(pid, entry, getTierByPid) {
  if (typeof entry?.tier === "string" && SHINY_PEDESTAL_AURA[entry.tier]) return entry.tier;
  if (typeof getTierByPid === "function") {
    const custom = getTierByPid(pid);
    if (typeof custom === "string" && SHINY_PEDESTAL_AURA[custom]) return custom;
  }
  const dexNum =
    typeof entry?.dex === "number" && entry.dex > 0
      ? entry.dex
      : Number(String(pid || "").replace(/^p/i, "")) || 0;
  const derived = dexNum > 0 ? getBeastTier(dexNum) : "common";
  return SHINY_PEDESTAL_AURA[derived] ? derived : "common";
}

/** Non-mutating read of valid showcased shiny pids (safe for pure effect functions). */
export function readShinyShowcasePids(state) {
  const raw = state?.meta?.shinyShowcase;
  const shinyMap = state?.dex?.shiny;
  if (!Array.isArray(raw) || !shinyMap || typeof shinyMap !== "object") return [];
  const seen = new Set();
  const out = [];
  for (const item of raw) {
    const pid = typeof item === "string" ? item.trim() : "";
    if (!pid || seen.has(pid) || !shinyMap[pid]) continue;
    seen.add(pid);
    out.push(pid);
    if (out.length >= SHINY_SHOWCASE_MAX) break;
  }
  return out;
}

export function ensureShinyShowcase(state) {
  if (!state || typeof state !== "object") return [];
  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  const valid = readShinyShowcasePids(state);
  state.meta.shinyShowcase = valid;
  return valid;
}

export function toggleShinyShowcasePid(state, pid) {
  const cleanPid = typeof pid === "string" ? pid.trim() : "";
  if (!cleanPid || !state?.dex?.shiny?.[cleanPid]) {
    return { ok: false, reason: "not_unlocked", pids: readShinyShowcasePids(state) };
  }
  const cur = ensureShinyShowcase(state);
  const idx = cur.indexOf(cleanPid);
  if (idx >= 0) {
    cur.splice(idx, 1);
    return { ok: true, action: "removed", pid: cleanPid, pids: cur.slice() };
  }
  if (cur.length >= SHINY_SHOWCASE_MAX) {
    return { ok: false, reason: "full", max: SHINY_SHOWCASE_MAX, pids: cur.slice() };
  }
  cur.push(cleanPid);
  return { ok: true, action: "added", pid: cleanPid, pids: cur.slice() };
}

export function autofillShinyShowcase(state, getTierByPid) {
  if (!state || typeof state !== "object") return { ok: false, pids: [] };
  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  const shinyMap = state?.dex?.shiny;
  if (!shinyMap || typeof shinyMap !== "object") {
    state.meta.shinyShowcase = [];
    return { ok: true, pids: [] };
  }
  const ranked = Object.entries(shinyMap)
    .map(([pid, entry]) => {
      const tier = resolveShinyEntryTier(pid, entry, getTierByPid);
      return {
        pid,
        weight: SHOWCASE_TIER_WEIGHT[tier] || 1,
        at: typeof entry?.at === "number" ? entry.at : 0,
      };
    })
    .sort((a, b) => b.weight - a.weight || b.at - a.at || a.pid.localeCompare(b.pid));
  const picked = ranked.slice(0, SHINY_SHOWCASE_MAX).map((x) => x.pid);
  state.meta.shinyShowcase = picked;
  return { ok: true, pids: picked.slice() };
}

export function computeShinyShowcaseAura(state, getTierByPid) {
  const pids = readShinyShowcasePids(state);
  if (!pids.length) {
    return {
      count: 0,
      max: SHINY_SHOWCASE_MAX,
      pids: [],
      entries: [],
      prodAdd: 0,
      trainExpAdd: 0,
      catchAdd: 0,
      prodMul: 1,
      trainExpMul: 1,
      fullResonance: false,
    };
  }
  const shinyMap = state?.dex?.shiny || {};
  let prodAdd = 0;
  let trainExpAdd = 0;
  let catchAdd = 0;
  const entries = [];
  for (const pid of pids) {
    const rawEntry = shinyMap[pid] || {};
    const tier = resolveShinyEntryTier(pid, rawEntry, getTierByPid);
    const cfg = SHINY_PEDESTAL_AURA[tier] || SHINY_PEDESTAL_AURA.common;
    prodAdd += cfg.prodAdd;
    trainExpAdd += cfg.trainExpAdd;
    catchAdd += cfg.catchAdd;
    entries.push({
      pid,
      dex: typeof rawEntry.dex === "number" ? rawEntry.dex : Number(String(pid).replace(/^p/i, "")) || 0,
      name: typeof rawEntry.name === "string" ? rawEntry.name : pid,
      tier,
      tierLabel: cfg.label,
    });
  }
  const fullResonance = entries.length >= SHINY_SHOWCASE_MAX;
  if (fullResonance) {
    prodAdd += SHINY_FULL_RESONANCE.prodAdd;
    trainExpAdd += SHINY_FULL_RESONANCE.trainExpAdd;
    catchAdd += SHINY_FULL_RESONANCE.catchAdd;
  }
  return {
    count: entries.length,
    max: SHINY_SHOWCASE_MAX,
    pids,
    entries,
    prodAdd,
    trainExpAdd,
    catchAdd,
    prodMul: 1 + prodAdd,
    trainExpMul: 1 + trainExpAdd,
    fullResonance,
  };
}
