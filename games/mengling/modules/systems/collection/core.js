// collection/core.js — ML-1～ML-4：赛季印记、闪光馆与展柜、羁绊图谱等收集底座与共用小工具（由 collection_fun.js 原样拆出，对外仍从 ../collection_fun.js 引用）

import { REMOTE_CONFIG_DEFAULTS } from "../../remote_config.js";
import { getBeastTier, higherTier } from "../../beast_tier.js";
import { computeEcoRelicAura } from "./camp.js";

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
  const prev = shiny[pid];
  const wasNew = !prev;
  const tier = typeof species.tier === "string" && species.tier ? species.tier : undefined;
  shiny[pid] = {
    dex: typeof species.dex === "number" ? species.dex : 0,
    name: typeof species.name === "string" ? species.name : String(pid),
    // 已登记的稀有度只升不降；补登（silent）不改点亮时间
    tier: prev?.tier && tier ? higherTier(prev.tier, tier) : tier ?? prev?.tier,
    at: silent && typeof prev?.at === "number" ? prev.at : Date.now(),
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

/**
 * ML-4 萌灵「属性羁绊共鸣图谱」 (Elemental Bond Resonance Atlas)
 * 围绕 火 / 水 / 风 / 草(森木) / 光 / 暗 六大核心生态元素组合，根据图鉴已收集物种、升星萌灵与双灵结契对解锁三阶全局共鸣加成。
 */
export const ATLAS_ELEMENTS = Object.freeze(["fire", "water", "wind", "grass", "light", "dark"]);

export const ATLAS_ELEMENT_ZH = Object.freeze({
  fire: "火",
  water: "水",
  wind: "风",
  grass: "木·草",
  light: "光",
  dark: "暗",
  electric: "电",
  stone: "岩",
  mystic: "幻",
});

export const ELEMENTAL_BOND_DEFS = Object.freeze([
  {
    id: "ember_gale",
    name: "炽风燎原图谱",
    subtitle: "烈焰乘风 · 疾袭破阵",
    elements: ["fire", "wind"],
    tiers: [
      { tier: 1, minEach: 1, minStars: 0, minHighStars: 0, prodAdd: 0.025, atkAdd: 0.035, defAdd: 0,     speAdd: 0.03,  trainExpAdd: 0.02, catchAdd: 0.005 },
      { tier: 2, minEach: 3, minStars: 1, minHighStars: 0, prodAdd: 0.055, atkAdd: 0.075, defAdd: 0.015, speAdd: 0.065, trainExpAdd: 0.04, catchAdd: 0.01  },
      { tier: 3, minEach: 5, minStars: 2, minHighStars: 1, prodAdd: 0.095, atkAdd: 0.125, defAdd: 0.03,  speAdd: 0.11,  trainExpAdd: 0.07, catchAdd: 0.018 },
    ],
  },
  {
    id: "tide_grove",
    name: "潮汐森木图谱",
    subtitle: "清泉润木 · 生生不息",
    elements: ["water", "grass"],
    tiers: [
      { tier: 1, minEach: 1, minStars: 0, minHighStars: 0, prodAdd: 0.04,  atkAdd: 0.01,  defAdd: 0.035, speAdd: 0,     trainExpAdd: 0.035, catchAdd: 0.006 },
      { tier: 2, minEach: 3, minStars: 1, minHighStars: 0, prodAdd: 0.085, atkAdd: 0.02,  defAdd: 0.075, speAdd: 0.015, trainExpAdd: 0.075, catchAdd: 0.012 },
      { tier: 3, minEach: 5, minStars: 2, minHighStars: 1, prodAdd: 0.14,  atkAdd: 0.035, defAdd: 0.12,  speAdd: 0.03,  trainExpAdd: 0.125, catchAdd: 0.02  },
    ],
  },
  {
    id: "steam_bloom",
    name: "炎泉生机图谱",
    subtitle: "水火润林 · 三才循环",
    elements: ["fire", "water", "grass"],
    tiers: [
      { tier: 1, minEach: 1, minStars: 0, minHighStars: 0, prodAdd: 0.045, atkAdd: 0.025, defAdd: 0.025, speAdd: 0.015, trainExpAdd: 0.03,  catchAdd: 0.008 },
      { tier: 2, minEach: 3, minStars: 1, minHighStars: 0, prodAdd: 0.095, atkAdd: 0.055, defAdd: 0.055, speAdd: 0.03,  trainExpAdd: 0.065, catchAdd: 0.016 },
      { tier: 3, minEach: 5, minStars: 2, minHighStars: 1, prodAdd: 0.155, atkAdd: 0.09,  defAdd: 0.09,  speAdd: 0.05,  trainExpAdd: 0.11,  catchAdd: 0.026 },
    ],
  },
  {
    id: "verdant_zephyr",
    name: "翠岚晨光图谱",
    subtitle: "晴风拂林 · 万物向荣",
    elements: ["wind", "grass", "light"],
    tiers: [
      { tier: 1, minEach: 1, minStars: 0, minHighStars: 0, prodAdd: 0.03,  atkAdd: 0.015, defAdd: 0.02,  speAdd: 0.035, trainExpAdd: 0.045, catchAdd: 0.008 },
      { tier: 2, minEach: 3, minStars: 1, minHighStars: 0, prodAdd: 0.065, atkAdd: 0.03,  defAdd: 0.04,  speAdd: 0.075, trainExpAdd: 0.095, catchAdd: 0.016 },
      { tier: 3, minEach: 5, minStars: 2, minHighStars: 1, prodAdd: 0.11,  atkAdd: 0.055, defAdd: 0.07,  speAdd: 0.125, trainExpAdd: 0.155, catchAdd: 0.026 },
    ],
  },
  {
    id: "twilight_eclipse",
    name: "曜月双极图谱",
    subtitle: "昼夜交辉 · 星蚀平衡",
    elements: ["light", "dark"],
    tiers: [
      { tier: 1, minEach: 1, minStars: 0, minHighStars: 0, prodAdd: 0.03,  atkAdd: 0.035, defAdd: 0.03,  speAdd: 0.025, trainExpAdd: 0.025, catchAdd: 0.01  },
      { tier: 2, minEach: 3, minStars: 1, minHighStars: 0, prodAdd: 0.065, atkAdd: 0.075, defAdd: 0.065, speAdd: 0.055, trainExpAdd: 0.055, catchAdd: 0.02  },
      { tier: 3, minEach: 5, minStars: 2, minHighStars: 1, prodAdd: 0.11,  atkAdd: 0.125, defAdd: 0.11,  speAdd: 0.09,  trainExpAdd: 0.095, catchAdd: 0.032 },
    ],
  },
  {
    id: "abyssal_vortex",
    name: "冥潮暗涌图谱",
    subtitle: "沧渊潜风 · 秘境寻踪",
    elements: ["water", "wind", "dark"],
    tiers: [
      { tier: 1, minEach: 1, minStars: 0, minHighStars: 0, prodAdd: 0.025, atkAdd: 0.02,  defAdd: 0.03,  speAdd: 0.03,  trainExpAdd: 0.035, catchAdd: 0.01  },
      { tier: 2, minEach: 3, minStars: 1, minHighStars: 0, prodAdd: 0.055, atkAdd: 0.045, defAdd: 0.065, speAdd: 0.065, trainExpAdd: 0.075, catchAdd: 0.022 },
      { tier: 3, minEach: 5, minStars: 2, minHighStars: 1, prodAdd: 0.095, atkAdd: 0.075, defAdd: 0.105, speAdd: 0.11,  trainExpAdd: 0.12,  catchAdd: 0.036 },
    ],
  },
]);

export const BOND_ATLAS_ATTUNE_MUL = 1.5;

export const BOND_ACTIVE_PAIR_BONUS = Object.freeze({
  base: { prodAdd: 0.035, atkAdd: 0.04, defAdd: 0.04, speAdd: 0.035, trainExpAdd: 0.045, catchAdd: 0.01 },
  perStar: { prodAdd: 0.008, atkAdd: 0.01, defAdd: 0.01, speAdd: 0.008, trainExpAdd: 0.01, catchAdd: 0.0025 },
  maxStarCounted: 6,
});

export const BOND_ATLAS_MILESTONES = Object.freeze([
  { id: "atlas_t3",  reqTiers: 3,  label: "初窥星图（累计 3 阶）",  rewards: { futurecoin: 180, expCandy: 2 } },
  { id: "atlas_t8",  reqTiers: 8,  label: "万灵谐振（累计 8 阶）",  rewards: { futurecoin: 420, evolutionStone: 2, rareCandy: 1 } },
  { id: "atlas_t14", reqTiers: 14, label: "六极星冕（累计 14 阶）", rewards: { futurecoin: 880, linkRope: 1, rareCandy: 2, shinyCharm: 1 } },
]);

function parseDexFromPid(pid) {
  if (typeof pid === "number" && pid > 0) return Math.floor(pid);
  const m = /^p?0*(\d+)/i.exec(String(pid || "").trim());
  return m ? Number(m[1]) || 0 : 0;
}

export function resolveDexTypes(dex, typesMapOverride = null) {
  const map = typesMapOverride && typeof typesMapOverride === "object" ? typesMapOverride : globalThis.BEAST_TYPES;
  if (!map || typeof map !== "object") return [];
  const raw = map[dex] ?? map[String(dex)];
  if (!Array.isArray(raw)) return [];
  return raw.filter((t) => typeof t === "string" && t.length > 0);
}

function readBondAtlasRaw(state) {
  const raw = state?.meta?.bondAtlas;
  if (!raw || typeof raw !== "object") {
    return { attunedBondId: "", pairIds: [], claimedMilestones: {} };
  }
  const attunedBondId = typeof raw.attunedBondId === "string" ? raw.attunedBondId.trim() : "";
  const pairIds = Array.isArray(raw.pairIds)
    ? raw.pairIds
        .map((x) => (typeof x === "number" && Number.isFinite(x) ? Math.floor(x) : Number(x)))
        .filter((x) => Number.isFinite(x) && x > 0)
        .slice(0, 2)
    : [];
  const uniqPair = pairIds.length === 2 && pairIds[0] === pairIds[1] ? [pairIds[0]] : pairIds;
  const claimedMilestones =
    raw.claimedMilestones && typeof raw.claimedMilestones === "object" ? { ...raw.claimedMilestones } : {};
  return { attunedBondId, pairIds: uniqPair, claimedMilestones };
}

export function ensureBondAtlasState(state) {
  if (!state || typeof state !== "object") {
    return { attunedBondId: "", pairIds: [], claimedMilestones: {} };
  }
  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  const clean = readBondAtlasRaw(state);
  state.meta.bondAtlas = clean;
  return clean;
}

function resolveMonTypesForAtlas(mon, typesMapOverride = null) {
  if (Array.isArray(mon?.types) && mon.types.length > 0) {
    return mon.types.filter((t) => typeof t === "string");
  }
  const dex = typeof mon?.dex === "number" && mon.dex > 0 ? mon.dex : parseDexFromPid(mon?.pid);
  return dex > 0 ? resolveDexTypes(dex, typesMapOverride) : [];
}

/** Pure non-mutating computation of Elemental Bond Resonance Atlas tiers & global bonuses. */
export function computeElementalBondResonance(state, opts = {}) {
  const typesMap = opts?.typesMap || null;
  const caughtMap = state?.dex?.caught && typeof state.dex.caught === "object" ? state.dex.caught : {};
  const monList = Array.isArray(state?.mons?.list) ? state.mons.list.filter(Boolean) : [];
  const atlasCfg = readBondAtlasRaw(state);

  // Build unique collected species -> types map from both dex.caught and owned mons
  const collectedSpeciesTypes = new Map();
  for (const [pid, cnt] of Object.entries(caughtMap)) {
    if (typeof cnt !== "number" || cnt <= 0) continue;
    const dex = parseDexFromPid(pid);
    if (dex <= 0) continue;
    const types = resolveDexTypes(dex, typesMap);
    if (types.length > 0) collectedSpeciesTypes.set(`p${String(dex).padStart(3, "0")}`, types);
  }
  for (const m of monList) {
    const dex = typeof m.dex === "number" && m.dex > 0 ? m.dex : parseDexFromPid(m.pid);
    const key = dex > 0 ? `p${String(dex).padStart(3, "0")}` : String(m.pid || m.id || "");
    if (!key) continue;
    const types = resolveMonTypesForAtlas(m, typesMap);
    if (types.length > 0 && !collectedSpeciesTypes.has(key)) {
      collectedSpeciesTypes.set(key, types);
    }
  }

  const elemSpeciesCounts = {};
  for (const el of Object.keys(ATLAS_ELEMENT_ZH)) elemSpeciesCounts[el] = 0;
  for (const types of collectedSpeciesTypes.values()) {
    const uniq = new Set(types);
    for (const t of uniq) {
      elemSpeciesCounts[t] = (elemSpeciesCounts[t] || 0) + 1;
    }
  }

  // Evaluate each bond's unlocked tier first so we can determine valid attuned bond
  const rawBonds = ELEMENTAL_BOND_DEFS.map((def) => {
    const elemCounts = {};
    let minElemCaught = Infinity;
    for (const el of def.elements) {
      const c = elemSpeciesCounts[el] || 0;
      elemCounts[el] = c;
      if (c < minElemCaught) minElemCaught = c;
    }
    if (!Number.isFinite(minElemCaught)) minElemCaught = 0;

    let starredCount = 0;
    let highStarCount = 0;
    for (const m of monList) {
      const stars = Math.max(0, Math.floor(Number(m.stars) || 0));
      if (stars <= 0) continue;
      const mTypes = resolveMonTypesForAtlas(m, typesMap);
      if (mTypes.some((t) => def.elements.includes(t))) {
        starredCount += 1;
        if (stars >= 2) highStarCount += 1;
      }
    }

    let unlockedTierObj = null;
    for (const tCfg of def.tiers) {
      const enoughSpecies = minElemCaught >= tCfg.minEach;
      const enoughStars = starredCount >= tCfg.minStars;
      const enoughHigh = highStarCount >= tCfg.minHighStars || starredCount >= tCfg.minStars + 2;
      if (enoughSpecies && enoughStars && (tCfg.minHighStars <= 0 || enoughHigh)) {
        unlockedTierObj = tCfg;
      }
    }

    const curTier = unlockedTierObj ? unlockedTierObj.tier : 0;
    const nextTierCfg = def.tiers.find((t) => t.tier === curTier + 1) || null;
    let nextReqText = "已臻星冕满阶";
    if (nextTierCfg) {
      const parts = [`各系收录 ${minElemCaught}/${nextTierCfg.minEach}`];
      if (nextTierCfg.minStars > 0) parts.push(`升星伙伴 ${starredCount}/${nextTierCfg.minStars}`);
      if (nextTierCfg.minHighStars > 0) parts.push(`二星以上 ${highStarCount}/${nextTierCfg.minHighStars}`);
      nextReqText = `下一阶（${nextTierCfg.tier}阶）：${parts.join(" · ")}`;
    }

    return {
      def,
      tier: curTier,
      maxTier: def.tiers.length,
      minElemCaught,
      elemCounts,
      starredCount,
      highStarCount,
      unlockedTierObj,
      nextReqText,
    };
  });

  // Resolve attuned bond: explicit if unlocked, else auto-pick first unlocked bond if none invalidated
  let effectiveAttunedId = "";
  if (atlasCfg.attunedBondId) {
    const found = rawBonds.find((b) => b.def.id === atlasCfg.attunedBondId && b.tier > 0);
    if (found) effectiveAttunedId = found.def.id;
  }
  if (!effectiveAttunedId) {
    const bestAuto = rawBonds.slice().sort((a, b) => b.tier - a.tier)[0];
    if (bestAuto && bestAuto.tier > 0) effectiveAttunedId = bestAuto.def.id;
  }

  let prodAdd = 0;
  let atkAdd = 0;
  let defAdd = 0;
  let speAdd = 0;
  let trainExpAdd = 0;
  let catchAdd = 0;
  let totalTierScore = 0;
  let unlockedBondsCount = 0;

  const bonds = rawBonds.map((rb) => {
    const isAttuned = rb.tier > 0 && rb.def.id === effectiveAttunedId;
    const mul = isAttuned ? BOND_ATLAS_ATTUNE_MUL : 1;
    const base = rb.unlockedTierObj || { prodAdd: 0, atkAdd: 0, defAdd: 0, speAdd: 0, trainExpAdd: 0, catchAdd: 0 };
    const bonus = {
      prodAdd: Number((base.prodAdd * mul).toFixed(4)),
      atkAdd: Number((base.atkAdd * mul).toFixed(4)),
      defAdd: Number((base.defAdd * mul).toFixed(4)),
      speAdd: Number((base.speAdd * mul).toFixed(4)),
      trainExpAdd: Number((base.trainExpAdd * mul).toFixed(4)),
      catchAdd: Number((base.catchAdd * mul).toFixed(4)),
    };
    if (rb.tier > 0) {
      unlockedBondsCount += 1;
      totalTierScore += rb.tier;
      prodAdd += bonus.prodAdd;
      atkAdd += bonus.atkAdd;
      defAdd += bonus.defAdd;
      speAdd += bonus.speAdd;
      trainExpAdd += bonus.trainExpAdd;
      catchAdd += bonus.catchAdd;
    }
    return {
      id: rb.def.id,
      name: rb.def.name,
      subtitle: rb.def.subtitle,
      elements: rb.def.elements.slice(),
      tier: rb.tier,
      maxTier: rb.maxTier,
      minElemCaught: rb.minElemCaught,
      elemCounts: rb.elemCounts,
      starredCount: rb.starredCount,
      highStarCount: rb.highStarCount,
      isAttuned,
      bonus,
      nextReqText: rb.nextReqText,
    };
  });

  // Evaluate Active Pair resonance
  let activePair = {
    valid: false,
    pairAmpActive: false,
    monIds: [],
    mons: [],
    coveredElements: [],
    starSum: 0,
    bonus: { prodAdd: 0, atkAdd: 0, defAdd: 0, speAdd: 0, trainExpAdd: 0, catchAdd: 0 },
  };
  if (atlasCfg.pairIds.length === 2 && atlasCfg.pairIds[0] !== atlasCfg.pairIds[1]) {
    const mA = monList.find((m) => m.id === atlasCfg.pairIds[0]);
    const mB = monList.find((m) => m.id === atlasCfg.pairIds[1]);
    if (mA && mB) {
      const tA = resolveMonTypesForAtlas(mA, typesMap);
      const tB = resolveMonTypesForAtlas(mB, typesMap);
      const unionTypes = Array.from(new Set([...tA, ...tB]));
      const attunedBond = bonds.find((b) => b.id === effectiveAttunedId) || null;
      const targetElems = attunedBond ? attunedBond.elements : ATLAS_ELEMENTS;
      const covered = unionTypes.filter((t) => targetElems.includes(t));
      const pairAmpActive = covered.length >= 2;
      const starSum = Math.min(
        BOND_ACTIVE_PAIR_BONUS.maxStarCounted,
        Math.max(0, Math.floor(Number(mA.stars) || 0)) + Math.max(0, Math.floor(Number(mB.stars) || 0)),
      );
      const pairBonus = pairAmpActive
        ? {
            prodAdd: Number((BOND_ACTIVE_PAIR_BONUS.base.prodAdd + starSum * BOND_ACTIVE_PAIR_BONUS.perStar.prodAdd).toFixed(4)),
            atkAdd: Number((BOND_ACTIVE_PAIR_BONUS.base.atkAdd + starSum * BOND_ACTIVE_PAIR_BONUS.perStar.atkAdd).toFixed(4)),
            defAdd: Number((BOND_ACTIVE_PAIR_BONUS.base.defAdd + starSum * BOND_ACTIVE_PAIR_BONUS.perStar.defAdd).toFixed(4)),
            speAdd: Number((BOND_ACTIVE_PAIR_BONUS.base.speAdd + starSum * BOND_ACTIVE_PAIR_BONUS.perStar.speAdd).toFixed(4)),
            trainExpAdd: Number((BOND_ACTIVE_PAIR_BONUS.base.trainExpAdd + starSum * BOND_ACTIVE_PAIR_BONUS.perStar.trainExpAdd).toFixed(4)),
            catchAdd: Number((BOND_ACTIVE_PAIR_BONUS.base.catchAdd + starSum * BOND_ACTIVE_PAIR_BONUS.perStar.catchAdd).toFixed(4)),
          }
        : { prodAdd: 0, atkAdd: 0, defAdd: 0, speAdd: 0, trainExpAdd: 0, catchAdd: 0 };

      if (pairAmpActive) {
        prodAdd += pairBonus.prodAdd;
        atkAdd += pairBonus.atkAdd;
        defAdd += pairBonus.defAdd;
        speAdd += pairBonus.speAdd;
        trainExpAdd += pairBonus.trainExpAdd;
        catchAdd += pairBonus.catchAdd;
      }

      activePair = {
        valid: true,
        pairAmpActive,
        monIds: [mA.id, mB.id],
        mons: [
          { id: mA.id, dex: mA.dex, name: mA.name, lvl: mA.lvl || 1, stars: mA.stars || 0, isShiny: Boolean(mA.isShiny), types: tA },
          { id: mB.id, dex: mB.dex, name: mB.name, lvl: mB.lvl || 1, stars: mB.stars || 0, isShiny: Boolean(mB.isShiny), types: tB },
        ],
        coveredElements: covered,
        starSum,
        bonus: pairBonus,
      };
    }
  }

  const milestones = BOND_ATLAS_MILESTONES.map((ms) => {
    const unlocked = totalTierScore >= ms.reqTiers;
    const claimed = Boolean(atlasCfg.claimedMilestones[ms.id]);
    return {
      ...ms,
      unlocked,
      claimed,
      canClaim: unlocked && !claimed,
    };
  });

  prodAdd = Number(prodAdd.toFixed(4));
  atkAdd = Number(atkAdd.toFixed(4));
  defAdd = Number(defAdd.toFixed(4));
  speAdd = Number(speAdd.toFixed(4));
  trainExpAdd = Number(trainExpAdd.toFixed(4));
  catchAdd = Number(catchAdd.toFixed(4));

  return {
    bonds,
    elemSpeciesCounts,
    unlockedBondsCount,
    totalBondsCount: ELEMENTAL_BOND_DEFS.length,
    totalTierScore,
    maxTierScore: ELEMENTAL_BOND_DEFS.length * 3,
    attunedBondId: effectiveAttunedId,
    activePair,
    milestones,
    prodAdd,
    atkAdd,
    defAdd,
    speAdd,
    trainExpAdd,
    catchAdd,
    prodMul: Number((1 + prodAdd).toFixed(4)),
    atkMul: Number((1 + atkAdd).toFixed(4)),
    defMul: Number((1 + defAdd).toFixed(4)),
    speMul: Number((1 + speAdd).toFixed(4)),
    trainExpMul: Number((1 + trainExpAdd).toFixed(4)),
  };
}

export function setAttunedElementalBond(state, bondId, opts = {}) {
  if (!state || typeof state !== "object") return { ok: false, reason: "no_state" };
  const cleanId = typeof bondId === "string" ? bondId.trim() : "";
  const snap = computeElementalBondResonance(state, opts);
  const target = snap.bonds.find((b) => b.id === cleanId);
  if (!target) return { ok: false, reason: "invalid_bond" };
  if (target.tier <= 0) return { ok: false, reason: "locked" };
  const cfg = ensureBondAtlasState(state);
  cfg.attunedBondId = cleanId;
  return { ok: true, attunedBondId: cleanId, bondName: target.name, tier: target.tier };
}

export function setBondAtlasActivePair(state, monAId, monBId, opts = {}) {
  if (!state || typeof state !== "object") return { ok: false, reason: "no_state" };
  const cfg = ensureBondAtlasState(state);
  if (monAId == null && monBId == null) {
    cfg.pairIds = [];
    return { ok: true, cleared: true, pairIds: [] };
  }
  const a = Number(monAId);
  const b = Number(monBId);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0 || a === b) {
    return { ok: false, reason: "invalid_pair" };
  }
  const list = Array.isArray(state?.mons?.list) ? state.mons.list : [];
  const monA = list.find((m) => m && m.id === a);
  const monB = list.find((m) => m && m.id === b);
  if (!monA || !monB) return { ok: false, reason: "missing_mon" };
  cfg.pairIds = [Math.floor(a), Math.floor(b)];
  const snap = computeElementalBondResonance(state, opts);
  return {
    ok: true,
    pairIds: cfg.pairIds.slice(),
    pairAmpActive: snap.activePair.pairAmpActive,
    coveredElements: snap.activePair.coveredElements,
  };
}

export function autofillBondAtlasResonance(state, opts = {}) {
  if (!state || typeof state !== "object") return { ok: false, reason: "no_state" };
  const cfg = ensureBondAtlasState(state);
  const preSnap = computeElementalBondResonance(state, opts);
  const bestBond = preSnap.bonds
    .filter((b) => b.tier > 0)
    .sort((a, b) => b.tier - a.tier || b.elements.length - a.elements.length)[0];
  if (bestBond) {
    cfg.attunedBondId = bestBond.id;
  }

  const targetElems = bestBond ? bestBond.elements : ATLAS_ELEMENTS;
  const monList = Array.isArray(state?.mons?.list) ? state.mons.list.filter(Boolean) : [];
  let bestPair = null;
  let bestScore = -1;

  for (let i = 0; i < monList.length; i++) {
    const mA = monList[i];
    const tA = resolveMonTypesForAtlas(mA, opts?.typesMap);
    for (let j = i + 1; j < monList.length; j++) {
      const mB = monList[j];
      const tB = resolveMonTypesForAtlas(mB, opts?.typesMap);
      const covered = new Set([...tA, ...tB].filter((t) => targetElems.includes(t)));
      if (covered.size < 2) continue;
      const starScore = (Number(mA.stars) || 0) + (Number(mB.stars) || 0);
      const lvlScore = (Number(mA.lvl) || 1) + (Number(mB.lvl) || 1);
      const score = covered.size * 10000 + starScore * 500 + lvlScore;
      if (score > bestScore) {
        bestScore = score;
        bestPair = [mA.id, mB.id];
      }
    }
  }

  if (bestPair) {
    cfg.pairIds = bestPair;
  }
  const postSnap = computeElementalBondResonance(state, opts);
  return {
    ok: true,
    attunedBondId: postSnap.attunedBondId,
    pairIds: cfg.pairIds.slice(),
    pairAmpActive: postSnap.activePair.pairAmpActive,
  };
}

export function claimBondAtlasMilestone(state, milestoneId, opts = {}) {
  if (!state || typeof state !== "object") return { ok: false, reason: "no_state" };
  const cfg = ensureBondAtlasState(state);
  const snap = computeElementalBondResonance(state, opts);
  const ms = snap.milestones.find((m) => m.id === milestoneId);
  if (!ms) return { ok: false, reason: "unknown_milestone" };
  if (!ms.unlocked) return { ok: false, reason: "locked" };
  if (ms.claimed) return { ok: false, reason: "already_claimed" };
  cfg.claimedMilestones[ms.id] = true;
  return { ok: true, id: ms.id, label: ms.label, rewards: { ...ms.rewards } };
}

export function applyBondCombatStats(stats, state, opts = {}) {
  if (!stats || typeof stats !== "object") return stats;
  const res = computeElementalBondResonance(state, opts);
  const eco = computeEcoRelicAura(state);
  const atkMul = res.atkMul * eco.atkMul;
  const defMul = res.defMul * eco.defMul;
  const speMul = res.speMul * eco.speMul;
  if (atkMul <= 1 && defMul <= 1 && speMul <= 1) return stats;
  return {
    ...stats,
    atk: Math.max(1, Math.floor((Number(stats.atk) || 1) * atkMul)),
    spa: Math.max(1, Math.floor((Number(stats.spa ?? stats.atk) || 1) * atkMul)),
    def: Math.max(1, Math.floor((Number(stats.def) || 1) * defMul)),
    spd: Math.max(1, Math.floor((Number(stats.spd ?? stats.def) || 1) * defMul)),
    spe: Math.max(1, Math.floor((Number(stats.spe) || 1) * speMul)),
  };
}
