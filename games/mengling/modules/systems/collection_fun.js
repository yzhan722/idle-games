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

// ============================================================================
// ML-5: 秘境生态探索沙盘 (Secret Realm Eco-Exploration Sandbox) & 秘境古遗物图鉴
// ============================================================================

export const ECO_SANDBOX_ZONES = Object.freeze([
  {
    id: "canopy",
    name: "翠微灵林带",
    subtitle: "林露丰饶 · 心性香草初生",
    icon: "ecoCanopy",
    preferredTypes: ["grass", "wind", "water"],
    preferredAbilities: ["harvest", "naturalCure", "earlyBird", "keenEye", "pickup"],
    baseDurationSec: 900,
    maxSquad: 3,
    baseRewards: { tuningMint: 1, catnip: 48, wood: 32, expCandy: 1, futurecoin: 26 },
    monExp: 180,
    relicIds: ["relic_emerald_dew", "relic_zephyr_chime"],
  },
  {
    id: "caldera",
    name: "熔晶流火脉",
    subtitle: "赤晶沸涌 · 灵晶矿核淬炼",
    icon: "ecoCaldera",
    preferredTypes: ["fire", "stone", "electric"],
    preferredAbilities: ["sturdy", "hugePower", "hyperCutter", "hustle", "pressure"],
    baseDurationSec: 1200,
    maxSquad: 3,
    baseRewards: { tuningMint: 1, minerals: 40, evolutionStone: 1, futurecoin: 38 },
    monExp: 280,
    relicIds: ["relic_ember_core", "relic_thunder_prism"],
  },
  {
    id: "tidepool",
    name: "星汐珊瑚湾",
    subtitle: "潮音洗礼 · 螺钿秘宝寻珍",
    icon: "ecoTidepool",
    preferredTypes: ["water", "light", "wind"],
    preferredAbilities: ["thickFat", "cuteCharm", "stickyHold", "gluttony", "compoundEyes"],
    baseDurationSec: 1500,
    maxSquad: 3,
    baseRewards: { tuningMint: 2, evolutionStone: 1, rareCandy: 1, futurecoin: 52 },
    monExp: 380,
    relicIds: ["relic_pearl_compass", "relic_coral_crown"],
  },
  {
    id: "astral",
    name: "幽月星穹境",
    subtitle: "星轨交错 · 远古觉醒圣碑",
    icon: "ecoAstral",
    preferredTypes: ["dark", "mystic", "light", "electric"],
    preferredAbilities: ["illuminate", "synchronize", "innerFocus", "loneWolf", "runAway"],
    baseDurationSec: 1800,
    maxSquad: 3,
    baseRewards: { tuningMint: 2, evolutionStone: 1, megaStone: 1, futurecoin: 68 },
    monExp: 520,
    relicIds: ["relic_astral_astrolabe", "relic_dream_tablet"],
  },
]);

export const ECO_RELIC_DEFS = Object.freeze([
  {
    id: "relic_emerald_dew",
    zoneId: "canopy",
    name: "翠微朝露瓶",
    desc: "全资源产出 +4%/阶",
    maxRank: 3,
    prodAddPerRank: 0.04,
  },
  {
    id: "relic_zephyr_chime",
    zoneId: "canopy",
    name: "风语古木铃",
    desc: "沙盘耗时 -4%/阶 · 捕获率 +0.6%/阶",
    maxRank: 3,
    sandboxSpeedAddPerRank: 0.04,
    catchAddPerRank: 0.006,
  },
  {
    id: "relic_ember_core",
    zoneId: "caldera",
    name: "熔晶赤炎核",
    desc: "全队物攻/灵攻 +2.5%/阶",
    maxRank: 3,
    atkAddPerRank: 0.025,
  },
  {
    id: "relic_thunder_prism",
    zoneId: "caldera",
    name: "雷纹耀石碑",
    desc: "全资源产出 +4.5%/阶",
    maxRank: 3,
    prodAddPerRank: 0.045,
  },
  {
    id: "relic_pearl_compass",
    zoneId: "tidepool",
    name: "星汐螺钿盘",
    desc: "全队物防/灵防 +2.5%/阶 · 薄荷额外掉率 +8%/阶",
    maxRank: 3,
    defAddPerRank: 0.025,
    mintBonusChancePerRank: 0.08,
  },
  {
    id: "relic_coral_crown",
    zoneId: "tidepool",
    name: "潮音琉璃冠",
    desc: "训练场经验 +5%/阶",
    maxRank: 3,
    trainExpAddPerRank: 0.05,
  },
  {
    id: "relic_astral_astrolabe",
    zoneId: "astral",
    name: "幽月星轨仪",
    desc: "全队速度 +3%/阶 · 捕获率 +0.8%/阶",
    maxRank: 3,
    speAddPerRank: 0.03,
    catchAddPerRank: 0.008,
  },
  {
    id: "relic_dream_tablet",
    zoneId: "astral",
    name: "幻梦古圣碑",
    desc: "全资源产出 +5%/阶 · 古遗物寻获率 +6%/阶",
    maxRank: 3,
    prodAddPerRank: 0.05,
    relicChanceAddPerRank: 0.06,
  },
]);

export const ECO_SANDBOX_FREE_DAILY_SURVEYS = 2;

function localYmdForSandbox(nowMs = Date.now()) {
  const d = new Date(nowMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getEcoZoneDef(zoneId) {
  return ECO_SANDBOX_ZONES.find((z) => z.id === zoneId) || null;
}

function normalizeIdList(arr, maxLen = 3, aliveSet = null) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  const seen = new Set();
  for (const raw of arr) {
    const id = typeof raw === "number" && Number.isFinite(raw) ? Math.floor(raw) : Number(raw);
    if (!Number.isFinite(id) || id <= 0 || seen.has(id)) continue;
    if (aliveSet && !aliveSet.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= maxLen) break;
  }
  return out;
}

export function ensureEcoSandboxState(state) {
  if (!state || typeof state !== "object") return null;
  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  const raw = state.meta.ecoSandbox && typeof state.meta.ecoSandbox === "object" ? state.meta.ecoSandbox : {};
  const hasMonList = Array.isArray(state.mons?.list);
  const aliveSet = hasMonList
    ? new Set(
        state.mons.list
          .map((m) => (m && typeof m.id === "number" && Number.isFinite(m.id) ? Math.floor(m.id) : null))
          .filter((x) => x !== null && x > 0),
      )
    : null;

  const relics = {};
  if (raw.relics && typeof raw.relics === "object") {
    for (const rDef of ECO_RELIC_DEFS) {
      const v = Number(raw.relics[rDef.id]);
      if (Number.isFinite(v) && v > 0) {
        relics[rDef.id] = Math.min(rDef.maxRank, Math.floor(v));
      }
    }
  }

  const zoneClears = {};
  const zones = {};
  const usedAcrossZones = new Set();

  for (const zDef of ECO_SANDBOX_ZONES) {
    const zc = Number(raw.zoneClears?.[zDef.id]);
    zoneClears[zDef.id] = Number.isFinite(zc) && zc > 0 ? Math.floor(zc) : 0;

    const rz = raw.zones?.[zDef.id] && typeof raw.zones[zDef.id] === "object" ? raw.zones[zDef.id] : {};
    const squadIds = normalizeIdList(rz.squadIds, zDef.maxSquad, aliveSet).filter((id) => !usedAcrossZones.has(id));
    for (const id of squadIds) usedAcrossZones.add(id);
    const stagedIds = normalizeIdList(rz.stagedIds, zDef.maxSquad, aliveSet).filter((id) => !usedAcrossZones.has(id));
    for (const id of stagedIds) usedAcrossZones.add(id);

    const durationSec =
      typeof rz.durationSec === "number" && Number.isFinite(rz.durationSec) && rz.durationSec >= 30
        ? Math.round(rz.durationSec)
        : zDef.baseDurationSec;
    const elapsedRaw =
      typeof rz.elapsedSec === "number" && Number.isFinite(rz.elapsedSec) && rz.elapsedSec >= 0
        ? rz.elapsedSec
        : 0;
    const active = Boolean(rz.active) && squadIds.length > 0;
    const elapsedSec = active ? Math.min(durationSec, elapsedRaw) : 0;
    const completed = active && (Boolean(rz.completed) || elapsedSec >= durationSec);
    const affinityMul =
      typeof rz.affinityMul === "number" && Number.isFinite(rz.affinityMul) && rz.affinityMul >= 1
        ? Math.min(3, rz.affinityMul)
        : 1;

    zones[zDef.id] = {
      active,
      completed,
      squadIds,
      stagedIds: active ? [] : stagedIds,
      elapsedSec: completed ? durationSec : elapsedSec,
      durationSec,
      startedAtMs: typeof rz.startedAtMs === "number" && Number.isFinite(rz.startedAtMs) ? rz.startedAtMs : 0,
      lastSyncMs: typeof rz.lastSyncMs === "number" && Number.isFinite(rz.lastSyncMs) ? rz.lastSyncMs : 0,
      affinityMul,
    };
  }

  const surveyDate = typeof raw.surveyDate === "string" ? raw.surveyDate : "";
  const surveyUsed =
    typeof raw.surveyUsed === "number" && Number.isFinite(raw.surveyUsed) && raw.surveyUsed >= 0
      ? Math.floor(raw.surveyUsed)
      : 0;

  const clean = {
    zones,
    relics,
    zoneClears,
    totalCompleted:
      typeof raw.totalCompleted === "number" && Number.isFinite(raw.totalCompleted) && raw.totalCompleted > 0
        ? Math.floor(raw.totalCompleted)
        : 0,
    surveyDate,
    surveyUsed,
  };
  state.meta.ecoSandbox = clean;
  return clean;
}

export function computeEcoRelicAura(state) {
  const relics = state?.meta?.ecoSandbox?.relics && typeof state.meta.ecoSandbox.relics === "object"
    ? state.meta.ecoSandbox.relics
    : {};
  let prodAdd = 0;
  let atkAdd = 0;
  let defAdd = 0;
  let speAdd = 0;
  let trainExpAdd = 0;
  let catchAdd = 0;
  let sandboxSpeedAdd = 0;
  let mintBonusChance = 0;
  let relicChanceAdd = 0;
  let unlockedCount = 0;
  let totalRank = 0;

  const entries = ECO_RELIC_DEFS.map((def) => {
    const rawRank = Number(relics[def.id]);
    const rank = Number.isFinite(rawRank) && rawRank > 0 ? Math.min(def.maxRank, Math.floor(rawRank)) : 0;
    if (rank > 0) {
      unlockedCount += 1;
      totalRank += rank;
      prodAdd += (def.prodAddPerRank || 0) * rank;
      atkAdd += (def.atkAddPerRank || 0) * rank;
      defAdd += (def.defAddPerRank || 0) * rank;
      speAdd += (def.speAddPerRank || 0) * rank;
      trainExpAdd += (def.trainExpAddPerRank || 0) * rank;
      catchAdd += (def.catchAddPerRank || 0) * rank;
      sandboxSpeedAdd += (def.sandboxSpeedAddPerRank || 0) * rank;
      mintBonusChance += (def.mintBonusChancePerRank || 0) * rank;
      relicChanceAdd += (def.relicChanceAddPerRank || 0) * rank;
    }
    return {
      ...def,
      rank,
      unlocked: rank > 0,
    };
  });

  const round4 = (n) => Math.round(n * 10000) / 10000;
  return {
    unlockedCount,
    totalRelics: ECO_RELIC_DEFS.length,
    totalRank,
    maxTotalRank: ECO_RELIC_DEFS.reduce((acc, d) => acc + d.maxRank, 0),
    prodAdd: round4(prodAdd),
    prodMul: round4(1 + prodAdd),
    atkAdd: round4(atkAdd),
    atkMul: round4(1 + atkAdd),
    defAdd: round4(defAdd),
    defMul: round4(1 + defAdd),
    speAdd: round4(speAdd),
    speMul: round4(1 + speAdd),
    trainExpAdd: round4(trainExpAdd),
    trainExpMul: round4(1 + trainExpAdd),
    catchAdd: round4(catchAdd),
    sandboxSpeedAdd: Math.min(0.45, round4(sandboxSpeedAdd)),
    mintBonusChance: round4(mintBonusChance),
    relicChanceAdd: round4(relicChanceAdd),
    entries,
  };
}

/** Collects mon IDs busy in non-sandbox systems (training, expedition, PvE, Dual Sanctum, breeding, natal bond). */
export function getNonSandboxBusyIds(state) {
  const ids = new Set();
  const addId = (raw) => {
    const n = typeof raw === "number" && Number.isFinite(raw) ? Math.floor(raw) : null;
    if (n !== null && n > 0) ids.add(n);
  };
  for (const id of state?.training?.activeIds || []) addId(id);
  for (const id of state?.expedition?.selectedIds || []) addId(id);
  for (const id of state?.expedition?.activeIds || []) addId(id);
  for (const id of state?.pve?.selectedIds || []) addId(id);
  addId(state?.pve?.dualSanctum?.primaryId);
  addId(state?.pve?.dualSanctum?.partnerId);
  const breed = state?.breeding;
  if (breed && typeof breed === "object") {
    for (const id of breed.parentIds || breed.parents || []) addId(id);
    addId(breed.aId);
    addId(breed.bId);
  }
  addId(state?.meta?.natalBondMonId);
  for (const id of state?.meta?.starCamp?.stationedIds || []) addId(id);
  // ML-14：所有外出 / 驻场类玩法（码头 / 观察站 / 浮岛 / 远航 / 温泉 / 邮局 / 绘本馆 / 钓鱼会）统一从登记表读取
  for (const id of getAwayMonIds(state)) addId(id);
  return ids;
}

/** Collects mon IDs currently dispatched or staged inside Eco-Sandbox zones (optionally excluding one zone). */
export function getEcoSandboxBusyIds(state, excludeZoneId = null) {
  const ids = new Set();
  const zones = state?.meta?.ecoSandbox?.zones;
  if (!zones || typeof zones !== "object") return ids;
  for (const [zid, z] of Object.entries(zones)) {
    if (excludeZoneId && zid === excludeZoneId) continue;
    if (!z || typeof z !== "object") continue;
    for (const id of z.squadIds || []) {
      if (typeof id === "number" && Number.isFinite(id) && id > 0) ids.add(Math.floor(id));
    }
    for (const id of z.stagedIds || []) {
      if (typeof id === "number" && Number.isFinite(id) && id > 0) ids.add(Math.floor(id));
    }
  }
  return ids;
}

export function getIdleEcoSandboxCandidates(state, zoneId = null) {
  const list = Array.isArray(state?.mons?.list) ? state.mons.list.filter(Boolean) : [];
  const extBusy = getNonSandboxBusyIds(state);
  const otherZoneBusy = getEcoSandboxBusyIds(state, zoneId);
  return list.filter((m) => m && typeof m.id === "number" && !extBusy.has(m.id) && !otherZoneBusy.has(m.id));
}

function resolveMonTypesForEco(mon, opts = {}) {
  if (Array.isArray(mon?.types) && mon.types.length > 0) {
    return mon.types.filter((t) => typeof t === "string");
  }
  const fromDex = resolveDexTypes(mon?.dex, opts.typesMap || null);
  if (fromDex.length > 0) return fromDex;
  if (typeof opts.getBeastDataByDex === "function" && mon?.dex != null) {
    const api = opts.getBeastDataByDex(mon.dex);
    if (Array.isArray(api?.types)) return api.types.filter((t) => typeof t === "string");
  }
  return [];
}

export function evaluateEcoSquadAffinity(zoneId, squadMons, state = null, opts = {}) {
  const zone = getEcoZoneDef(zoneId);
  if (!zone) {
    return {
      affinityMul: 1,
      durationSec: 900,
      matchedTypeCount: 0,
      matchedTraitCount: 0,
      previewRewards: { tuningMint: 1 },
    };
  }
  const mons = Array.isArray(squadMons) ? squadMons.filter(Boolean).slice(0, zone.maxSquad) : [];
  const prefTypes = new Set(zone.preferredTypes);
  const prefTraits = new Set(zone.preferredAbilities);
  const relicAura = state ? computeEcoRelicAura(state) : { sandboxSpeedAdd: 0, mintBonusChance: 0 };
  const campAura = state && mons.length > 0 ? computeStarCampAura(state) : { ecoAffinityAdd: 0, ecoYieldMul: 1 };

  let score = campAura.ecoAffinityAdd || 0;
  let matchedTypeCount = 0;
  let matchedTraitCount = 0;
  let traitSpeedAdd = 0;

  for (const m of mons) {
    score += 0.12;
    const mTypes = resolveMonTypesForEco(m, opts);
    const hits = mTypes.filter((t) => prefTypes.has(t)).length;
    if (hits >= 2) {
      score += 0.36;
      matchedTypeCount += 2;
    } else if (hits === 1) {
      score += 0.22;
      matchedTypeCount += 1;
    }
    if (typeof m.ability === "string" && prefTraits.has(m.ability)) {
      score += 0.18;
      matchedTraitCount += 1;
      traitSpeedAdd += 0.06;
    }
    const lvl = Math.max(1, Math.min(100, Math.floor(Number(m.lvl) || 1)));
    const stars = Math.max(0, Math.min(5, Math.floor(Number(m.stars) || 0)));
    score += lvl / 500 + stars * 0.05 + (m.isShiny ? 0.08 : 0);
  }

  const affinityMul = Math.round(Math.min(2.8, Math.max(1, 1 + score)) * 100) / 100;
  const totalSpeedReduce = Math.min(0.55, traitSpeedAdd + (relicAura.sandboxSpeedAdd || 0));
  const durationSec = Math.max(120, Math.round(zone.baseDurationSec * (1 - totalSpeedReduce)));

  const previewRewards = {};
  const yieldMul = campAura.ecoYieldMul || 1;
  for (const [rid, baseAmt] of Object.entries(zone.baseRewards)) {
    if (rid === "tuningMint") {
      previewRewards[rid] = Math.max(1, Math.floor(baseAmt * (affinityMul >= 1.75 ? 1.6 : affinityMul >= 1.35 ? 1.25 : 1)));
    } else if (rid === "evolutionStone" || rid === "megaStone" || rid === "rareCandy" || rid === "expCandy") {
      previewRewards[rid] = Math.max(1, Math.floor(baseAmt * (affinityMul >= 1.9 ? 2 : 1)));
    } else {
      previewRewards[rid] = Math.max(1, Math.round(baseAmt * affinityMul * yieldMul));
    }
  }

  return {
    affinityMul,
    durationSec,
    matchedTypeCount,
    matchedTraitCount,
    previewRewards,
    monExp: Math.max(20, Math.round(zone.monExp * affinityMul)),
  };
}

export function scoreMonForEcoZone(mon, zone, opts = {}) {
  if (!mon || !zone) return -1;
  const prefTypes = new Set(zone.preferredTypes);
  const prefTraits = new Set(zone.preferredAbilities);
  const mTypes = resolveMonTypesForEco(mon, opts);
  const typeHits = mTypes.filter((t) => prefTypes.has(t)).length;
  const traitHit = typeof mon.ability === "string" && prefTraits.has(mon.ability) ? 1 : 0;
  const lvl = Math.max(1, Math.floor(Number(mon.lvl) || 1));
  const stars = Math.max(0, Math.floor(Number(mon.stars) || 0));
  return typeHits * 1200 + traitHit * 900 + stars * 200 + (mon.isShiny ? 250 : 0) + lvl * 8;
}

export function toggleEcoSandboxStagedMon(state, zoneId, monId) {
  const sb = ensureEcoSandboxState(state);
  const zone = getEcoZoneDef(zoneId);
  if (!sb || !zone) return { ok: false, reason: "unknown_zone" };
  const zState = sb.zones[zoneId];
  if (zState.active) return { ok: false, reason: "zone_busy" };
  const id = Math.floor(Number(monId));
  if (!Number.isFinite(id) || id <= 0) return { ok: false, reason: "invalid_mon" };

  if (zState.stagedIds.includes(id)) {
    zState.stagedIds = zState.stagedIds.filter((x) => x !== id);
    return { ok: true, stagedIds: zState.stagedIds.slice() };
  }
  if (zState.stagedIds.length >= zone.maxSquad) return { ok: false, reason: "squad_full" };

  const idleSet = new Set(getIdleEcoSandboxCandidates(state, zoneId).map((m) => m.id));
  if (!idleSet.has(id)) return { ok: false, reason: "mon_busy" };

  zState.stagedIds.push(id);
  return { ok: true, stagedIds: zState.stagedIds.slice() };
}

export function autoPickEcoSandboxSquad(state, zoneId, opts = {}) {
  const sb = ensureEcoSandboxState(state);
  const zone = getEcoZoneDef(zoneId);
  if (!sb || !zone) return { ok: false, reason: "unknown_zone" };
  const zState = sb.zones[zoneId];
  if (zState.active) return { ok: false, reason: "zone_busy" };

  const candidates = getIdleEcoSandboxCandidates(state, zoneId);
  if (!candidates.length) {
    zState.stagedIds = [];
    return { ok: false, reason: "no_idle_mons", stagedIds: [] };
  }
  const picked = candidates
    .slice()
    .sort((a, b) => scoreMonForEcoZone(b, zone, opts) - scoreMonForEcoZone(a, zone, opts) || (a.id || 0) - (b.id || 0))
    .slice(0, zone.maxSquad)
    .map((m) => m.id);
  zState.stagedIds = picked;
  return { ok: true, stagedIds: picked.slice() };
}

export function dispatchEcoSandboxZone(state, zoneId, squadIdsOpt = null, opts = {}) {
  const sb = ensureEcoSandboxState(state);
  const zone = getEcoZoneDef(zoneId);
  if (!sb || !zone) return { ok: false, reason: "unknown_zone" };
  const zState = sb.zones[zoneId];
  if (zState.active) return { ok: false, reason: "already_active" };

  const idleCandidates = getIdleEcoSandboxCandidates(state, zoneId);
  const idleById = new Map(idleCandidates.map((m) => [m.id, m]));
  const rawIds = Array.isArray(squadIdsOpt) ? squadIdsOpt : zState.stagedIds;
  const validIds = normalizeIdList(rawIds, zone.maxSquad).filter((id) => idleById.has(id));
  if (!validIds.length) return { ok: false, reason: "empty_or_busy_squad" };

  const squadMons = validIds.map((id) => idleById.get(id)).filter(Boolean);
  const evalRes = evaluateEcoSquadAffinity(zoneId, squadMons, state, opts);
  const ts = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();

  zState.active = true;
  zState.completed = false;
  zState.squadIds = validIds;
  zState.stagedIds = [];
  zState.elapsedSec = 0;
  zState.durationSec = evalRes.durationSec;
  zState.affinityMul = evalRes.affinityMul;
  zState.startedAtMs = ts;
  zState.lastSyncMs = ts;

  return {
    ok: true,
    zoneId,
    squadIds: validIds.slice(),
    durationSec: evalRes.durationSec,
    affinityMul: evalRes.affinityMul,
  };
}

export function autoDispatchAllEcoSandbox(state, opts = {}) {
  const sb = ensureEcoSandboxState(state);
  if (!sb) return { ok: false, dispatched: [] };
  const dispatched = [];
  for (const zDef of ECO_SANDBOX_ZONES) {
    const zState = sb.zones[zDef.id];
    if (zState.active) continue;
    if (!zState.stagedIds.length) {
      const picked = autoPickEcoSandboxSquad(state, zDef.id, opts);
      if (!picked.ok) continue;
    }
    const res = dispatchEcoSandboxZone(state, zDef.id, null, opts);
    if (res.ok) dispatched.push(zDef.id);
  }
  return { ok: dispatched.length > 0, dispatched };
}

export function cancelEcoSandboxZone(state, zoneId) {
  const sb = ensureEcoSandboxState(state);
  const zone = getEcoZoneDef(zoneId);
  if (!sb || !zone) return { ok: false, reason: "unknown_zone" };
  const zState = sb.zones[zoneId];
  if (!zState.active) return { ok: false, reason: "not_active" };
  const prev = zState.squadIds.slice();
  zState.active = false;
  zState.completed = false;
  zState.squadIds = [];
  zState.elapsedSec = 0;
  const idleSet = new Set(getIdleEcoSandboxCandidates(state, zoneId).map((m) => m.id));
  zState.stagedIds = prev.filter((id) => idleSet.has(id));
  return { ok: true, zoneId };
}

/** Advances all active Eco-Sandbox zones by dtSec (used in both live tick and offline catch-up). */
export function advanceEcoSandbox(state, dtSec, opts = {}) {
  const sb = ensureEcoSandboxState(state);
  if (!sb) return { newlyCompleted: [] };
  const step = typeof dtSec === "number" && Number.isFinite(dtSec) && dtSec > 0 ? dtSec : 0;
  const ts = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const newlyCompleted = [];

  for (const zDef of ECO_SANDBOX_ZONES) {
    const z = sb.zones[zDef.id];
    if (!z.active) continue;
    if (z.completed) {
      z.lastSyncMs = ts;
      continue;
    }
    if (step > 0) {
      z.elapsedSec = Math.min(z.durationSec, z.elapsedSec + step);
    }
    z.lastSyncMs = ts;
    if (z.elapsedSec >= z.durationSec) {
      z.elapsedSec = z.durationSec;
      z.completed = true;
      newlyCompleted.push(zDef.id);
    }
  }
  return { newlyCompleted };
}

/** Wall-clock delta catch-up helper when resuming from raw timestamps outside tick. */
export function syncEcoSandboxWallClock(state, nowMs = Date.now()) {
  const sb = ensureEcoSandboxState(state);
  if (!sb) return { newlyCompleted: [] };
  const newlyCompleted = [];
  for (const zDef of ECO_SANDBOX_ZONES) {
    const z = sb.zones[zDef.id];
    if (!z.active || z.completed) continue;
    if (z.lastSyncMs > 0 && nowMs > z.lastSyncMs) {
      const deltaSec = (nowMs - z.lastSyncMs) / 1000;
      z.elapsedSec = Math.min(z.durationSec, z.elapsedSec + deltaSec);
      z.lastSyncMs = nowMs;
      if (z.elapsedSec >= z.durationSec) {
        z.elapsedSec = z.durationSec;
        z.completed = true;
        newlyCompleted.push(zDef.id);
      }
    }
  }
  return { newlyCompleted };
}

export function getEcoSandboxFreeSurveysLeft(state, nowMs = Date.now()) {
  const sb = ensureEcoSandboxState(state);
  if (!sb) return 0;
  const today = localYmdForSandbox(nowMs);
  if (sb.surveyDate !== today) return ECO_SANDBOX_FREE_DAILY_SURVEYS;
  return Math.max(0, ECO_SANDBOX_FREE_DAILY_SURVEYS - sb.surveyUsed);
}

/** Instant survey completion (uses free daily quota first, then searchFlare x1, then futurecoin x15). */
export function instantCompleteEcoSandboxZone(state, zoneId, opts = {}) {
  const sb = ensureEcoSandboxState(state);
  const zone = getEcoZoneDef(zoneId);
  if (!sb || !zone) return { ok: false, reason: "unknown_zone" };
  const z = sb.zones[zoneId];
  if (!z.active) return { ok: false, reason: "not_active" };
  if (z.completed) return { ok: true, costKind: "already_done" };

  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const today = localYmdForSandbox(nowMs);
  if (sb.surveyDate !== today) {
    sb.surveyDate = today;
    sb.surveyUsed = 0;
  }

  let costKind = "";
  if (sb.surveyUsed < ECO_SANDBOX_FREE_DAILY_SURVEYS) {
    sb.surveyUsed += 1;
    costKind = "free_daily";
  } else if ((state.res?.searchFlare?.value ?? 0) >= 1) {
    state.res.searchFlare.value = Math.max(0, Math.floor(state.res.searchFlare.value) - 1);
    costKind = "searchFlare";
  } else if ((state.res?.futurecoin?.value ?? 0) >= 15) {
    state.res.futurecoin.value = Math.max(0, Math.floor(state.res.futurecoin.value) - 15);
    costKind = "futurecoin";
  } else {
    return { ok: false, reason: "insufficient_survey_cost" };
  }

  z.elapsedSec = z.durationSec;
  z.completed = true;
  z.lastSyncMs = nowMs;
  return { ok: true, zoneId, costKind };
}

export function claimEcoSandboxZone(state, zoneId, opts = {}) {
  const sb = ensureEcoSandboxState(state);
  const zone = getEcoZoneDef(zoneId);
  if (!sb || !zone) return { ok: false, reason: "unknown_zone" };
  const z = sb.zones[zoneId];
  if (!z.active || !z.completed) return { ok: false, reason: "not_ready" };

  const list = Array.isArray(state.mons?.list) ? state.mons.list : [];
  const squadMons = z.squadIds.map((id) => list.find((m) => m && m.id === id)).filter(Boolean);
  const evalRes = evaluateEcoSquadAffinity(zoneId, squadMons, state, opts);
  const effMul = Math.max(z.affinityMul || 1, evalRes.affinityMul || 1);
  const relicAura = computeEcoRelicAura(state);
  const campAura = computeStarCampAura(state);
  const yieldMul = campAura.ecoYieldMul || 1;
  const rng = typeof opts.randFloat === "function" ? opts.randFloat : Math.random;

  const rewards = {};
  for (const [rid, baseAmt] of Object.entries(zone.baseRewards)) {
    if (rid === "tuningMint") {
      let amt = Math.max(1, Math.floor(baseAmt * (effMul >= 1.75 ? 1.6 : effMul >= 1.35 ? 1.25 : 1)));
      if (rng() < (relicAura.mintBonusChance || 0) + (effMul - 1) * 0.2) amt += 1;
      rewards[rid] = amt;
    } else if (rid === "evolutionStone" || rid === "megaStone" || rid === "rareCandy" || rid === "expCandy") {
      rewards[rid] = Math.max(1, Math.floor(baseAmt * (effMul >= 1.9 ? 2 : 1)));
    } else {
      rewards[rid] = Math.max(1, Math.round(baseAmt * effMul * yieldMul));
    }
  }

  // Bonus Camp Pantry ingredients harvested alongside Eco-Sandbox exploration
  const campState = ensureStarCampState(state);
  if (campState) {
    campState.pantry.picnicHerb = Math.min(999, (campState.pantry.picnicHerb || 0) + (effMul >= 1.5 ? 2 : 1));
    campState.pantry.starBerry = Math.min(999, (campState.pantry.starBerry || 0) + 1);
  }

  // Apply resource rewards directly or via addRes callback
  for (const [rid, amt] of Object.entries(rewards)) {
    if (amt <= 0) continue;
    if (typeof opts.addRes === "function") {
      opts.addRes(rid, amt);
    } else if (state.res) {
      if (!state.res[rid] || typeof state.res[rid] !== "object") state.res[rid] = { value: 0, cap: 999 };
      const cap = typeof state.res[rid].cap === "number" && state.res[rid].cap > 0 ? state.res[rid].cap : 999999;
      state.res[rid].value = Math.min(cap, Math.max(0, Number(state.res[rid].value) || 0) + amt);
    }
  }

  // Apply companion EXP
  const expPerMon = Math.max(20, Math.round(zone.monExp * effMul));
  for (const m of squadMons) {
    if (typeof opts.addExpToMon === "function") {
      opts.addExpToMon(m, expPerMon);
    } else {
      m.exp = Math.max(0, Math.floor((Number(m.exp) || 0) + expPerMon));
    }
  }

  // Roll Ancient Relic discovery (guaranteed on first completion of each biome!)
  const prevZoneClears = sb.zoneClears[zoneId] || 0;
  const relicChance = prevZoneClears === 0 ? 1 : Math.min(0.85, 0.32 + (effMul - 1) * 0.32 + (relicAura.relicChanceAdd || 0));
  let relicFound = null;
  if (zone.relicIds.length > 0 && rng() < relicChance) {
    const candidates = zone.relicIds
      .map((id) => ECO_RELIC_DEFS.find((r) => r.id === id))
      .filter((r) => r && (sb.relics[r.id] || 0) < r.maxRank);
    if (candidates.length > 0) {
      const pickIdx = Math.min(candidates.length - 1, Math.floor(rng() * candidates.length));
      const picked = candidates[pickIdx];
      const nextRank = Math.min(picked.maxRank, (sb.relics[picked.id] || 0) + 1);
      sb.relics[picked.id] = nextRank;
      relicFound = { id: picked.id, name: picked.name, rank: nextRank, maxRank: picked.maxRank, desc: picked.desc };
    }
  }

  sb.zoneClears[zoneId] = prevZoneClears + 1;
  sb.totalCompleted = (sb.totalCompleted || 0) + 1;

  const prevSquad = z.squadIds.slice();
  z.active = false;
  z.completed = false;
  z.squadIds = [];
  z.elapsedSec = 0;

  const idleSet = new Set(getIdleEcoSandboxCandidates(state, zoneId).map((m) => m.id));
  const reusableIds = prevSquad.filter((id) => idleSet.has(id));
  z.stagedIds = reusableIds;

  let redispatched = false;
  if (opts.redispatch) {
    if (!z.stagedIds.length) {
      autoPickEcoSandboxSquad(state, zoneId, opts);
    }
    const rd = dispatchEcoSandboxZone(state, zoneId, null, opts);
    redispatched = Boolean(rd.ok);
  }

  return {
    ok: true,
    zoneId,
    zoneName: zone.name,
    rewards,
    expPerMon,
    squadCount: squadMons.length,
    relicFound,
    redispatched,
  };
}

export function claimAllEcoSandboxZones(state, opts = {}) {
  const sb = ensureEcoSandboxState(state);
  if (!sb) return { ok: false, claimed: [], totalRewards: {}, relicsFound: [] };
  const claimed = [];
  const totalRewards = {};
  const relicsFound = [];
  for (const zDef of ECO_SANDBOX_ZONES) {
    const z = sb.zones[zDef.id];
    if (!z.active || !z.completed) continue;
    const res = claimEcoSandboxZone(state, zDef.id, opts);
    if (res.ok) {
      claimed.push(res);
      for (const [rid, amt] of Object.entries(res.rewards)) {
        totalRewards[rid] = (totalRewards[rid] || 0) + amt;
      }
      if (res.relicFound) relicsFound.push(res.relicFound);
    }
  }
  return { ok: claimed.length > 0, claimed, totalRewards, relicsFound };
}

// ============================================================================
// ML-6: 萌灵「星界羁绊露营野餐屋」与料理食谱风味增益工坊
// ============================================================================

export const STAR_CAMP_MAX_SLOTS = 4;
export const STAR_CAMP_MAX_LEVEL = 10;
export const STAR_CAMP_FORAGE_CYCLE_SEC = 180;
export const STAR_CAMP_DAILY_ENSEMBLE_LIMIT = 2;
export const STAR_CAMP_MAX_FEAST_SEC = 7200;
export const STAR_CAMP_MAX_ACTIVE_FEASTS = 3;

export const CAMP_RECIPE_DEFS = Object.freeze([
  {
    id: "dish_berry_tart",
    name: "星露灵果蜜挞",
    tier: 1,
    tierLabel: "一阶甜点",
    icon: "dishBerryTart",
    desc: "酥脆金黄挞壳盛满星露灵果与鲜奶油，令全营伙伴甜美雀跃。",
    durationSec: 1800,
    costRes: { catnip: 35 },
    costPantry: { starBerry: 1 },
    bondGain: 4,
    campExp: 35,
    buffs: {
      prodAdd: 0.12,
      catchAdd: 0.02,
      ecoYieldAdd: 0.08,
    },
  },
  {
    id: "dish_canopy_pancake",
    name: "翠微花蜜松饼",
    tier: 1,
    tierLabel: "一阶轻食",
    icon: "campCookingPot",
    desc: "佐以野餐香草与林间清露烘焙的松软薄饼，大幅提振日常历练精神。",
    durationSec: 1800,
    costRes: { catnip: 45, wood: 20 },
    costPantry: { picnicHerb: 1 },
    bondGain: 4,
    campExp: 40,
    buffs: {
      trainExpAdd: 0.18,
      prodAdd: 0.08,
      ecoAffinityAdd: 0.06,
    },
  },
  {
    id: "dish_flame_skewers",
    name: "熔晶香草烤串",
    tier: 2,
    tierLabel: "二阶炙烤",
    icon: "dishFlameSkewers",
    desc: "灵晶炭火慢炙鲜嫩菌菇与星露浆果，激昂战意强化试炼与双打连携。",
    durationSec: 2400,
    costRes: { catnip: 70, minerals: 30 },
    costPantry: { picnicHerb: 2, starBerry: 1 },
    bondGain: 6,
    campExp: 60,
    buffs: {
      pveComboAdd: 0.14,
      trainExpAdd: 0.15,
      prodAdd: 0.1,
    },
  },
  {
    id: "dish_golden_risotto",
    name: "金辉果仁炖饭",
    tier: 2,
    tierLabel: "二阶主食",
    icon: "campTentStar",
    desc: "铜锅文火慢煨果仁与香草高汤，温润灵力源源回馈营地与生态勘探。",
    durationSec: 2400,
    costRes: { catnip: 80, wood: 35, futurecoin: 12 },
    costPantry: { picnicHerb: 1, starBerry: 2 },
    bondGain: 6,
    campExp: 65,
    buffs: {
      prodAdd: 0.18,
      ecoAffinityAdd: 0.12,
      ecoYieldAdd: 0.15,
      catchAdd: 0.025,
    },
  },
  {
    id: "dish_moon_soup",
    name: "幽月珊瑚浓汤",
    tier: 3,
    tierLabel: "三阶珍馐",
    icon: "dishMoonSoup",
    desc: "融汇心性薄荷与星汐贝鲜熬煮的珠光浓汤，澄澈感知并提升捕捉与试炼表现。",
    durationSec: 3600,
    costRes: { catnip: 110, minerals: 45, tuningMint: 1 },
    costPantry: { picnicHerb: 2, starBerry: 2 },
    bondGain: 9,
    campExp: 90,
    buffs: {
      catchAdd: 0.045,
      trainExpAdd: 0.25,
      pveComboAdd: 0.16,
      ecoAffinityAdd: 0.14,
    },
  },
  {
    id: "dish_astral_picnic",
    name: "星界满汉野餐篮",
    tier: 3,
    tierLabel: "三阶盛宴",
    icon: "campPicnicBasket",
    desc: "满载星露佳肴、薄荷清茶与星营徽章的豪华藤编野餐篮，开启全维狂欢盛宴！",
    durationSec: 3600,
    costRes: { catnip: 150, wood: 60, minerals: 60, tuningMint: 1, futurecoin: 25 },
    costPantry: { picnicHerb: 3, starBerry: 3, campToken: 1 },
    bondGain: 12,
    campExp: 130,
    buffs: {
      prodAdd: 0.25,
      trainExpAdd: 0.3,
      catchAdd: 0.05,
      ecoAffinityAdd: 0.18,
      ecoYieldAdd: 0.22,
      pveComboAdd: 0.22,
    },
  },
]);

export function campExpNeedForLevel(level = 1) {
  const lvl = Math.max(1, Math.min(STAR_CAMP_MAX_LEVEL, Math.floor(Number(level) || 1)));
  return 120 + (lvl - 1) * 90;
}

export function getCampRecipeDef(recipeId) {
  return CAMP_RECIPE_DEFS.find((r) => r.id === recipeId) || null;
}

export function getRecipeMasteryInfo(cooksRaw = 0) {
  const cooks = typeof cooksRaw === "number" && Number.isFinite(cooksRaw) && cooksRaw > 0 ? Math.floor(cooksRaw) : 0;
  if (cooks >= 6) {
    return {
      cooks,
      discovered: true,
      stars: 3,
      label: "3星·星厨极意",
      potencyMul: 1.3,
      durationMul: 1.3,
      nextNeed: null,
    };
  }
  if (cooks >= 3) {
    return {
      cooks,
      discovered: true,
      stars: 2,
      label: "2星·炉火纯青",
      potencyMul: 1.15,
      durationMul: 1.15,
      nextNeed: 6,
    };
  }
  if (cooks >= 1) {
    return {
      cooks,
      discovered: true,
      stars: 1,
      label: "1星·初识风味",
      potencyMul: 1,
      durationMul: 1,
      nextNeed: 3,
    };
  }
  return {
    cooks: 0,
    discovered: false,
    stars: 0,
    label: "未解锁食谱",
    potencyMul: 1,
    durationMul: 1,
    nextNeed: 1,
  };
}

export function ensureStarCampState(state) {
  if (!state || typeof state !== "object") return null;
  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  const raw = state.meta.starCamp && typeof state.meta.starCamp === "object" ? state.meta.starCamp : {};
  const initialized = Boolean(raw.initialized);

  const hasMonList = Array.isArray(state.mons?.list);
  const aliveSet = hasMonList
    ? new Set(
        state.mons.list
          .map((m) => (m && typeof m.id === "number" && Number.isFinite(m.id) ? Math.floor(m.id) : null))
          .filter((x) => x !== null && x > 0),
      )
    : null;

  const stationedIds = normalizeIdList(raw.stationedIds, STAR_CAMP_MAX_SLOTS, aliveSet);
  const lvlRaw = Number(raw.level);
  const level =
    Number.isFinite(lvlRaw) && lvlRaw >= 1 ? Math.min(STAR_CAMP_MAX_LEVEL, Math.floor(lvlRaw)) : 1;
  const expRaw = Number(raw.exp);
  const exp = Number.isFinite(expRaw) && expRaw >= 0 ? Math.floor(expRaw) : 0;

  const rawPantry = raw.pantry && typeof raw.pantry === "object" ? raw.pantry : {};
  const clampPantry = (v, defVal) => {
    const n = Number(v);
    if (Number.isFinite(n) && n >= 0) return Math.min(9999, Math.floor(n));
    return defVal;
  };
  const pantry = {
    picnicHerb: clampPantry(rawPantry.picnicHerb, initialized ? 0 : 2),
    starBerry: clampPantry(rawPantry.starBerry, initialized ? 0 : 2),
    campToken: clampPantry(rawPantry.campToken, 0),
  };

  const recipes = {};
  const rawRecipes = raw.recipes && typeof raw.recipes === "object" ? raw.recipes : {};
  for (const rDef of CAMP_RECIPE_DEFS) {
    const rr = rawRecipes[rDef.id];
    const cooksVal = typeof rr === "number" ? rr : rr?.cooks;
    const cooks = typeof cooksVal === "number" && Number.isFinite(cooksVal) && cooksVal > 0 ? Math.floor(cooksVal) : 0;
    if (cooks > 0) {
      const mInfo = getRecipeMasteryInfo(cooks);
      recipes[rDef.id] = { cooks, stars: mInfo.stars };
    }
  }

  const activeFeasts = [];
  const seenFeastIds = new Set();
  if (Array.isArray(raw.activeFeasts)) {
    for (const f of raw.activeFeasts) {
      if (!f || typeof f !== "object") continue;
      const def = getCampRecipeDef(f.recipeId);
      const rem = Number(f.remainingSec);
      if (!def || seenFeastIds.has(def.id) || !Number.isFinite(rem) || rem <= 0) continue;
      seenFeastIds.add(def.id);
      const stars = Math.max(1, Math.min(3, Math.floor(Number(f.stars) || recipes[def.id]?.stars || 1)));
      const potencyMul = stars >= 3 ? 1.3 : stars === 2 ? 1.15 : 1;
      const durCap = STAR_CAMP_MAX_FEAST_SEC;
      activeFeasts.push({
        recipeId: def.id,
        stars,
        potencyMul:
          typeof f.potencyMul === "number" && Number.isFinite(f.potencyMul) && f.potencyMul >= 1
            ? Math.min(1.5, f.potencyMul)
            : potencyMul,
        remainingSec: Math.min(durCap, rem),
        totalSec:
          typeof f.totalSec === "number" && Number.isFinite(f.totalSec) && f.totalSec > 0
            ? Math.min(durCap, f.totalSec)
            : Math.min(durCap, Math.round(def.durationSec * potencyMul)),
      });
      if (activeFeasts.length >= STAR_CAMP_MAX_ACTIVE_FEASTS) break;
    }
  }

  const recentLogs = Array.isArray(raw.recentLogs)
    ? raw.recentLogs
        .filter((s) => typeof s === "string" && s.trim().length > 0)
        .slice(0, 6)
    : [];

  const clean = {
    initialized: true,
    level,
    exp,
    stationedIds,
    pantry,
    recipes,
    activeFeasts,
    forageCarrySec:
      typeof raw.forageCarrySec === "number" && Number.isFinite(raw.forageCarrySec) && raw.forageCarrySec >= 0
        ? Math.min(STAR_CAMP_FORAGE_CYCLE_SEC, raw.forageCarrySec)
        : 0,
    affectionCarry:
      typeof raw.affectionCarry === "number" && Number.isFinite(raw.affectionCarry) && raw.affectionCarry >= 0
        ? Math.min(10, raw.affectionCarry)
        : 0,
    ensembleDate: typeof raw.ensembleDate === "string" ? raw.ensembleDate : "",
    ensembleUsed:
      typeof raw.ensembleUsed === "number" && Number.isFinite(raw.ensembleUsed) && raw.ensembleUsed >= 0
        ? Math.floor(raw.ensembleUsed)
        : 0,
    totalCooks:
      typeof raw.totalCooks === "number" && Number.isFinite(raw.totalCooks) && raw.totalCooks > 0
        ? Math.floor(raw.totalCooks)
        : 0,
    totalForages:
      typeof raw.totalForages === "number" && Number.isFinite(raw.totalForages) && raw.totalForages > 0
        ? Math.floor(raw.totalForages)
        : 0,
    lastSyncMs:
      typeof raw.lastSyncMs === "number" && Number.isFinite(raw.lastSyncMs) && raw.lastSyncMs > 0
        ? raw.lastSyncMs
        : 0,
    recentLogs,
  };
  if (state.meta.starCamp && typeof state.meta.starCamp === "object") {
    Object.assign(state.meta.starCamp, clean);
    return state.meta.starCamp;
  }
  state.meta.starCamp = clean;
  return clean;
}

function addCampExp(camp, gain) {
  if (!camp || !(gain > 0)) return false;
  let leveledUp = false;
  camp.exp = Math.max(0, Math.floor((camp.exp || 0) + gain));
  while (camp.level < STAR_CAMP_MAX_LEVEL) {
    const need = campExpNeedForLevel(camp.level);
    if (camp.exp < need) break;
    camp.exp -= need;
    camp.level += 1;
    leveledUp = true;
  }
  if (camp.level >= STAR_CAMP_MAX_LEVEL) {
    camp.exp = Math.min(camp.exp, campExpNeedForLevel(STAR_CAMP_MAX_LEVEL));
  }
  return leveledUp;
}

/** Companions physically away on active expedition / active eco-sandbox / active breeding cannot station at camp. */
export function getCampUnavailableMonIds(state) {
  const ids = new Set();
  const addId = (raw) => {
    const n = typeof raw === "number" && Number.isFinite(raw) ? Math.floor(raw) : null;
    if (n !== null && n > 0) ids.add(n);
  };
  if (state?.expedition?.on) {
    for (const id of state.expedition.activeIds || []) addId(id);
  }
  if (state?.breeding?.on) {
    addId(state.breeding.aId);
    addId(state.breeding.bId);
  }
  const zones = state?.meta?.ecoSandbox?.zones;
  if (zones && typeof zones === "object") {
    for (const z of Object.values(zones)) {
      if (z?.active) {
        for (const id of z.squadIds || []) addId(id);
      }
    }
  }
  // ML-14：外出 / 驻场类玩法统一从登记表读取
  for (const id of getAwayMonIds(state)) addId(id);
  return ids;
}

export function getAvailableStarCampCandidates(state) {
  const list = Array.isArray(state?.mons?.list) ? state.mons.list.filter(Boolean) : [];
  const away = getCampUnavailableMonIds(state);
  return list.filter((m) => m && typeof m.id === "number" && !away.has(m.id));
}

export function evaluateStarCampHarmony(stationedMons = [], opts = {}) {
  const mons = Array.isArray(stationedMons) ? stationedMons.filter(Boolean).slice(0, STAR_CAMP_MAX_SLOTS) : [];
  if (!mons.length) {
    return {
      id: "empty",
      name: "待邀请驻营伙伴",
      desc: "邀请 1~4 只萌灵围坐星光篝火即可激活【星营伙伴共鸣】与食材采集",
      active: false,
      uniqueTypeCount: 0,
      maxSameTypeCount: 0,
      prodAdd: 0,
      trainExpAdd: 0,
      catchAdd: 0,
      ecoAffinityAdd: 0,
      pveComboAdd: 0,
      campSpeedMul: 1,
    };
  }

  const typeCounts = new Map();
  for (const m of mons) {
    const types = Array.from(new Set(resolveMonTypesForEco(m, opts)));
    for (const t of types) {
      typeCounts.set(t, (typeCounts.get(t) || 0) + 1);
    }
  }
  const uniqueTypeCount = typeCounts.size;
  let maxSameTypeCount = 0;
  for (const c of typeCounts.values()) {
    if (c > maxSameTypeCount) maxSameTypeCount = c;
  }

  if (mons.length >= 3 && uniqueTypeCount >= 4) {
    return {
      id: "rainbow_harmony",
      name: "星虹万象共鸣",
      desc: "多系伙伴星火交织：全产 +8% · 训练经验 +10% · 捕获 +1.5% · 沙盘契合 +0.08 · 营火采集提速 +35%",
      active: true,
      uniqueTypeCount,
      maxSameTypeCount,
      prodAdd: 0.08,
      trainExpAdd: 0.1,
      catchAdd: 0.015,
      ecoAffinityAdd: 0.08,
      pveComboAdd: 0.06,
      campSpeedMul: 1.35,
    };
  }

  if (mons.length >= 2 && maxSameTypeCount >= 2) {
    const tierStep = Math.min(4, maxSameTypeCount) - 2; // 0, 1, 2
    const prodAdd = Number((0.05 + tierStep * 0.02).toFixed(4));
    const pveComboAdd = Number((0.06 + tierStep * 0.03).toFixed(4));
    const trainExpAdd = Number((0.06 + tierStep * 0.02).toFixed(4));
    return {
      id: "elemental_chorus",
      name: "同源星火共鸣",
      desc: `同系伙伴灵脉呼应：全产 +${Math.round(prodAdd * 100)}% · 试炼与双打连携 +${Math.round(pveComboAdd * 100)}% · 训练经验 +${Math.round(trainExpAdd * 100)}% · 营火采集提速 +25%`,
      active: true,
      uniqueTypeCount,
      maxSameTypeCount,
      prodAdd,
      trainExpAdd,
      catchAdd: 0.008,
      ecoAffinityAdd: 0.05,
      pveComboAdd,
      campSpeedMul: 1.25,
    };
  }

  if (mons.length >= 2 && uniqueTypeCount >= 2) {
    return {
      id: "diverse_trio",
      name: "星野协奏共鸣",
      desc: "异系伙伴互补守望：全产 +5% · 训练经验 +6% · 捕获 +1.0% · 沙盘契合 +0.05 · 营火采集提速 +20%",
      active: true,
      uniqueTypeCount,
      maxSameTypeCount,
      prodAdd: 0.05,
      trainExpAdd: 0.06,
      catchAdd: 0.01,
      ecoAffinityAdd: 0.05,
      pveComboAdd: 0.04,
      campSpeedMul: 1.2,
    };
  }

  return {
    id: "solo_hearth",
    name: "独星守夜微光",
    desc: "单灵伴火静憩：全产 +2.5% · 训练经验 +3% · 营火采集提速 +10%（再添伙伴可升级共鸣）",
    active: true,
    uniqueTypeCount,
    maxSameTypeCount,
    prodAdd: 0.025,
    trainExpAdd: 0.03,
    catchAdd: 0,
    ecoAffinityAdd: 0.02,
    pveComboAdd: 0,
    campSpeedMul: 1.1,
  };
}

export function computeStarCampAura(state, opts = {}) {
  const raw = state?.meta?.starCamp;
  if (!raw || typeof raw !== "object") {
    const emptyHarmony = evaluateStarCampHarmony([], opts);
    return {
      level: 1,
      exp: 0,
      expNeed: campExpNeedForLevel(1),
      stationedCount: 0,
      harmony: emptyHarmony,
      codexCount: 0,
      totalRecipes: CAMP_RECIPE_DEFS.length,
      masteredCount: 0,
      activeFeasts: [],
      prodAdd: 0,
      prodMul: 1,
      trainExpAdd: 0,
      trainExpMul: 1,
      catchAdd: 0,
      ecoAffinityAdd: 0,
      ecoYieldAdd: 0,
      ecoYieldMul: 1,
      pveComboAdd: 0,
      pveComboMul: 1,
      campSpeedMul: 1,
    };
  }

  const list = Array.isArray(state?.mons?.list) ? state.mons.list : [];
  const stationedIdsRaw = Array.isArray(raw.stationedIds) ? raw.stationedIds : [];
  const stationedMons = stationedIdsRaw
    .map((id) => list.find((m) => m && m.id === Number(id)))
    .filter(Boolean)
    .slice(0, STAR_CAMP_MAX_SLOTS);
  const harmony = evaluateStarCampHarmony(stationedMons, opts);

  let codexCount = 0;
  let masteredCount = 0;
  const rawRecipes = raw.recipes && typeof raw.recipes === "object" ? raw.recipes : {};
  for (const rDef of CAMP_RECIPE_DEFS) {
    const rr = rawRecipes[rDef.id];
    const cooks = Math.max(0, Math.floor(Number(typeof rr === "number" ? rr : rr?.cooks) || 0));
    if (cooks >= 1) codexCount += 1;
    if (cooks >= 6) masteredCount += 1;
  }

  const campLevel = Math.max(1, Math.min(STAR_CAMP_MAX_LEVEL, Math.floor(Number(raw.level) || 1)));
  const campExp = Math.max(0, Math.floor(Number(raw.exp) || 0));
  const lvlSteps = Math.max(0, campLevel - 1);
  let feastProdAdd = 0;
  let feastTrainAdd = 0;
  let feastCatchAdd = 0;
  let feastEcoAffAdd = 0;
  let feastEcoYieldAdd = 0;
  let feastPveComboAdd = 0;

  const rawFeasts = Array.isArray(raw.activeFeasts) ? raw.activeFeasts : [];
  const activeFeastsDetailed = [];
  const seenFeastIds = new Set();
  for (const f of rawFeasts) {
    if (!f || typeof f !== "object") continue;
    const def = getCampRecipeDef(f.recipeId);
    const rem = Number(f.remainingSec);
    if (!def || seenFeastIds.has(def.id) || !Number.isFinite(rem) || rem <= 0) continue;
    seenFeastIds.add(def.id);
    const stars = Math.max(1, Math.min(3, Math.floor(Number(f.stars) || 1)));
    const scale =
      typeof f.potencyMul === "number" && Number.isFinite(f.potencyMul) && f.potencyMul >= 1
        ? Math.min(1.5, f.potencyMul)
        : stars >= 3
          ? 1.3
          : stars === 2
            ? 1.15
            : 1;
    const b = def.buffs || {};
    feastProdAdd += (b.prodAdd || 0) * scale;
    feastTrainAdd += (b.trainExpAdd || 0) * scale;
    feastCatchAdd += (b.catchAdd || 0) * scale;
    feastEcoAffAdd += (b.ecoAffinityAdd || 0) * scale;
    feastEcoYieldAdd += (b.ecoYieldAdd || 0) * scale;
    feastPveComboAdd += (b.pveComboAdd || 0) * scale;
    activeFeastsDetailed.push({
      ...f,
      stars,
      potencyMul: scale,
      remainingSec: Math.min(STAR_CAMP_MAX_FEAST_SEC, rem),
      name: def.name,
      icon: def.icon || "campCookingPot",
      tier: def.tier || 1,
    });
    if (activeFeastsDetailed.length >= STAR_CAMP_MAX_ACTIVE_FEASTS) break;
  }

  // Stack-safe bounded feast caps
  feastProdAdd = Math.min(0.6, feastProdAdd);
  feastTrainAdd = Math.min(0.75, feastTrainAdd);
  feastCatchAdd = Math.min(0.12, feastCatchAdd);
  feastEcoAffAdd = Math.min(0.35, feastEcoAffAdd);
  feastEcoYieldAdd = Math.min(0.5, feastEcoYieldAdd);
  feastPveComboAdd = Math.min(0.45, feastPveComboAdd);

  const round4 = (n) => Math.round(n * 10000) / 10000;
  const prodAdd = round4(harmony.prodAdd + lvlSteps * 0.015 + codexCount * 0.01 + feastProdAdd);
  const trainExpAdd = round4(harmony.trainExpAdd + feastTrainAdd);
  const catchAdd = round4(harmony.catchAdd + codexCount * 0.002 + feastCatchAdd);
  const ecoAffinityAdd = round4(harmony.ecoAffinityAdd + feastEcoAffAdd);
  const ecoYieldAdd = round4(feastEcoYieldAdd);
  const pveComboAdd = round4(harmony.pveComboAdd + masteredCount * 0.015 + feastPveComboAdd);
  const campSpeedMul = round4((harmony.campSpeedMul || 1) * (1 + lvlSteps * 0.04));

  return {
    level: campLevel,
    exp: campExp,
    expNeed: campExpNeedForLevel(campLevel),
    stationedCount: stationedMons.length,
    harmony,
    codexCount,
    totalRecipes: CAMP_RECIPE_DEFS.length,
    masteredCount,
    activeFeasts: activeFeastsDetailed,
    prodAdd,
    prodMul: round4(1 + prodAdd),
    trainExpAdd,
    trainExpMul: round4(1 + trainExpAdd),
    catchAdd,
    ecoAffinityAdd,
    ecoYieldAdd,
    ecoYieldMul: round4(1 + ecoYieldAdd),
    pveComboAdd,
    pveComboMul: round4(1 + pveComboAdd),
    campSpeedMul,
  };
}

export function toggleStarCampCompanion(state, monId) {
  const camp = ensureStarCampState(state);
  if (!camp) return { ok: false, reason: "invalid_state" };
  const id = Number(monId);
  if (!Number.isFinite(id) || id <= 0) return { ok: false, reason: "invalid_mon" };

  const existingIdx = camp.stationedIds.indexOf(id);
  if (existingIdx >= 0) {
    camp.stationedIds.splice(existingIdx, 1);
    return { ok: true, action: "removed", stationedIds: camp.stationedIds.slice() };
  }

  if (camp.stationedIds.length >= STAR_CAMP_MAX_SLOTS) {
    return { ok: false, reason: "camp_full" };
  }
  const cands = getAvailableStarCampCandidates(state);
  if (!cands.some((m) => m.id === id)) {
    return { ok: false, reason: "mon_unavailable" };
  }
  camp.stationedIds.push(id);
  if (!camp.lastSyncMs) camp.lastSyncMs = Date.now();
  return { ok: true, action: "added", stationedIds: camp.stationedIds.slice() };
}

export function setStarCampSquad(state, monIds = [], opts = {}) {
  const camp = ensureStarCampState(state);
  if (!camp) return { ok: false, reason: "invalid_state" };
  const candSet = new Set(getAvailableStarCampCandidates(state).map((m) => m.id));
  const picked = normalizeIdList(monIds, STAR_CAMP_MAX_SLOTS, candSet);
  if (Array.isArray(monIds) && monIds.length > 0 && picked.length === 0) {
    return { ok: false, reason: "no_eligible_mons" };
  }
  camp.stationedIds = picked;
  camp.lastSyncMs = typeof opts.nowMs === "number" ? opts.nowMs : Date.now();
  return { ok: true, stationedIds: camp.stationedIds.slice() };
}

export function clearStarCampSquad(state) {
  const camp = ensureStarCampState(state);
  if (!camp) return { ok: false };
  camp.stationedIds = [];
  return { ok: true, stationedIds: [] };
}

export function autoFillStarCampSquad(state, opts = {}) {
  const camp = ensureStarCampState(state);
  if (!camp) return { ok: false, reason: "invalid_state" };
  const cands = getAvailableStarCampCandidates(state);
  if (!cands.length) return { ok: false, reason: "no_candidates", stationedIds: [] };

  // Prefer companions that contribute new element diversity while prioritizing companions below max affection
  const chosen = [];
  const chosenIds = new Set();
  const seenTypes = new Set();

  while (chosen.length < STAR_CAMP_MAX_SLOTS && chosen.length < cands.length) {
    let bestMon = null;
    let bestScore = -Infinity;
    for (const m of cands) {
      if (chosenIds.has(m.id)) continue;
      const mTypes = resolveMonTypesForEco(m, opts);
      const newTypes = mTypes.filter((t) => !seenTypes.has(t)).length;
      const aff = typeof m.affection === "number" && Number.isFinite(m.affection) ? m.affection : 0;
      const needBondBonus = aff < 100 ? (100 - aff) * 4 : 0;
      const score = newTypes * 500 + needBondBonus + (m.isShiny ? 150 : 0) + (m.stars || 0) * 80 + (m.lvl || 1) * 3;
      if (score > bestScore) {
        bestScore = score;
        bestMon = m;
      }
    }
    if (!bestMon) break;
    chosen.push(bestMon);
    chosenIds.add(bestMon.id);
    for (const t of resolveMonTypesForEco(bestMon, opts)) seenTypes.add(t);
  }

  camp.stationedIds = chosen.map((m) => m.id);
  camp.lastSyncMs = typeof opts.nowMs === "number" ? opts.nowMs : Date.now();
  return {
    ok: camp.stationedIds.length > 0,
    stationedIds: camp.stationedIds.slice(),
    harmony: evaluateStarCampHarmony(chosen, opts),
  };
}

export function advanceStarCamp(state, dtSec, opts = {}) {
  if (!state?.meta?.starCamp && !(dtSec > 0)) {
    return { expiredFeasts: [], forageCycles: 0, leveledUp: false, affectionChanged: false };
  }
  const camp = ensureStarCampState(state);
  if (!camp || !(dtSec > 0) || !Number.isFinite(dtSec)) {
    return { expiredFeasts: [], forageCycles: 0, leveledUp: false, affectionChanged: false };
  }

  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const expiredFeasts = [];
  if (camp.activeFeasts.length > 0) {
    const kept = [];
    for (const f of camp.activeFeasts) {
      const nextRem = Math.max(0, (Number(f.remainingSec) || 0) - dtSec);
      if (nextRem > 0) {
        f.remainingSec = nextRem;
        kept.push(f);
      } else {
        const def = getCampRecipeDef(f.recipeId);
        expiredFeasts.push(def?.name || f.recipeId);
      }
    }
    camp.activeFeasts = kept;
  }

  const list = Array.isArray(state.mons?.list) ? state.mons.list : [];
  const stationedMons = camp.stationedIds.map((id) => list.find((m) => m && m.id === id)).filter(Boolean);
  let forageCycles = 0;
  let leveledUp = false;
  let affectionChanged = false;

  if (stationedMons.length > 0) {
    const aura = computeStarCampAura(state, opts);
    const speedMul = aura.campSpeedMul || 1;

    // Steady campfire bonding: +1 affection per ~120s scaled by campSpeedMul, plus cozy satiety warmth
    const affCarry1 = (camp.affectionCarry || 0) + (dtSec / 120) * speedMul;
    const steadyAffGain = Math.min(30, Math.floor(affCarry1));
    camp.affectionCarry = Math.min(5, affCarry1 - Math.floor(affCarry1));

    const forageTotal = (camp.forageCarrySec || 0) + dtSec * speedMul;
    const rawCycles = Math.floor(forageTotal / STAR_CAMP_FORAGE_CYCLE_SEC);
    forageCycles = Math.min(48, rawCycles);
    camp.forageCarrySec = forageTotal % STAR_CAMP_FORAGE_CYCLE_SEC;

    if (forageCycles > 0) {
      const squadBonus = stationedMons.length >= 3 ? 2 : 1;
      const herbGain = forageCycles * squadBonus;
      const berryGain = forageCycles * (stationedMons.length >= 2 ? 2 : 1);
      camp.pantry.picnicHerb = Math.min(9999, (camp.pantry.picnicHerb || 0) + herbGain);
      camp.pantry.starBerry = Math.min(9999, (camp.pantry.starBerry || 0) + berryGain);

      const prevTotalForages = camp.totalForages || 0;
      camp.totalForages = prevTotalForages + forageCycles;
      const tokenGain = Math.floor(camp.totalForages / 3) - Math.floor(prevTotalForages / 3);
      if (tokenGain > 0) {
        camp.pantry.campToken = Math.min(9999, (camp.pantry.campToken || 0) + tokenGain);
      }
      if (addCampExp(camp, forageCycles * (12 + stationedMons.length * 4))) {
        leveledUp = true;
      }
    }

    const totalAffGain = steadyAffGain + forageCycles;
    for (const m of stationedMons) {
      const sat0 = typeof m.satiety === "number" && Number.isFinite(m.satiety) ? m.satiety : 80;
      if (sat0 < 100) {
        m.satiety = Math.min(100, sat0 + dtSec * 0.05);
      }
      if (totalAffGain > 0) {
        const aff0 = typeof m.affection === "number" && Number.isFinite(m.affection) ? m.affection : 0;
        const aff1 = Math.min(100, Math.max(0, aff0 + totalAffGain));
        if (Math.floor(aff1) !== Math.floor(aff0)) affectionChanged = true;
        m.affection = aff1;
      }
    }
  }

  camp.lastSyncMs = nowMs;
  return { expiredFeasts, forageCycles, leveledUp, affectionChanged };
}

export function syncStarCampWallClock(state, nowMs = Date.now()) {
  if (!state?.meta?.starCamp) return { syncedSec: 0, forageCycles: 0, expiredFeasts: [] };
  const camp = ensureStarCampState(state);
  if (!camp || !camp.lastSyncMs || nowMs <= camp.lastSyncMs + 1000) {
    if (camp && !camp.lastSyncMs) camp.lastSyncMs = nowMs;
    return { syncedSec: 0, forageCycles: 0, expiredFeasts: [] };
  }
  const deltaSec = Math.min(60 * 60 * 12, (nowMs - camp.lastSyncMs) / 1000);
  const res = advanceStarCamp(state, deltaSec, { nowMs });
  return { syncedSec: deltaSec, ...res };
}

export function getStarCampEnsembleLeft(state, nowMs = Date.now()) {
  const camp = ensureStarCampState(state);
  if (!camp) return 0;
  const today = localYmdForSandbox(nowMs);
  const used = camp.ensembleDate === today ? camp.ensembleUsed : 0;
  return Math.max(0, STAR_CAMP_DAILY_ENSEMBLE_LIMIT - used);
}

const NATURE_ENSEMBLE_FLAVORS = {
  jolly: "踏着星火节拍轻快起舞，把温热的蜜果分给全队伙伴",
  hasty: "迫不及待敲响铜锅边沿打拍子，引得篝火火星欢腾跃动",
  naive: "追着帐篷串灯的光影转圈歌唱，清脆笑声洒满整片草甸",
  brave: "高举木勺守在铜锅旁当大厨，豪爽招呼伙伴们添满热汤",
  adamant: "稳稳劈好带着松香的干柴添入篝火，火光映得大家暖意融融",
  bold: "拍着胸脯领唱星野冒险歌谣，给身旁害羞的伙伴鼓足勇气",
  impish: "悄悄往烤串上多刷了一层甜蜜酱，馋得全营伙伴围拢过来",
  calm: "安静拨动风铃木琴，柔和旋律让星夜下的伙伴们安心依偎",
  gentle: "细心为每位驻营伙伴披好格纹野餐毯，亲密度悄然升温",
  careful: "认真看护铜锅火候，盛出香气四溢的第一碗热汤递给同伴",
  modest: "轻声吟唱古老星界摇篮曲，点点灵光在帐篷四周缓缓流淌",
  timid: "捧着暖呼呼的花蜜茶盏悄悄靠近篝火，露出甜甜微笑",
};

const NATURE_ZH_SHORT = {
  hardy: "勤奋", lonely: "怕寂寞", brave: "勇敢", adamant: "固执", naughty: "顽皮",
  bold: "大胆", docile: "坦率", relaxed: "悠闲", impish: "淘气", lax: "乐天",
  timid: "胆小", hasty: "急躁", serious: "认真", jolly: "开朗", naive: "天真",
  modest: "内敛", mild: "慢吞吞", quiet: "冷静", bashful: "害羞", rash: "马虎",
  calm: "温和", gentle: "温顺", sassy: "自大", careful: "慎重", quirky: "浮躁",
};

export function performStarCampEnsemble(state, opts = {}) {
  const camp = ensureStarCampState(state);
  if (!camp) return { ok: false, reason: "invalid_state" };
  const list = Array.isArray(state.mons?.list) ? state.mons.list : [];
  const stationedMons = camp.stationedIds.map((id) => list.find((m) => m && m.id === id)).filter(Boolean);
  if (!stationedMons.length) return { ok: false, reason: "empty_camp" };

  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const today = localYmdForSandbox(nowMs);
  if (camp.ensembleDate !== today) {
    camp.ensembleDate = today;
    camp.ensembleUsed = 0;
  }
  if (camp.ensembleUsed >= STAR_CAMP_DAILY_ENSEMBLE_LIMIT) {
    return { ok: false, reason: "daily_limit_reached" };
  }

  camp.ensembleUsed += 1;
  const bondGain = 8;
  for (const m of stationedMons) {
    const aff0 = typeof m.affection === "number" && Number.isFinite(m.affection) ? m.affection : 0;
    m.affection = Math.min(100, Math.max(0, aff0 + bondGain));
    const sat0 = typeof m.satiety === "number" && Number.isFinite(m.satiety) ? m.satiety : 80;
    m.satiety = Math.min(100, sat0 + 15);
  }

  const herbGain = 2;
  const berryGain = 2;
  const tokenGain = 1;
  camp.pantry.picnicHerb = Math.min(9999, (camp.pantry.picnicHerb || 0) + herbGain);
  camp.pantry.starBerry = Math.min(9999, (camp.pantry.starBerry || 0) + berryGain);
  camp.pantry.campToken = Math.min(9999, (camp.pantry.campToken || 0) + tokenGain);
  const leveledUp = addCampExp(camp, 45);

  const rng = typeof opts.randFloat === "function" ? opts.randFloat : Math.random;
  const leadMon = stationedMons[Math.min(stationedMons.length - 1, Math.floor(rng() * stationedMons.length))];
  const natKey = typeof leadMon?.nature === "string" ? leadMon.nature : "jolly";
  const natZh = NATURE_ZH_SHORT[natKey] || "纯真";
  const flavorAct =
    NATURE_ENSEMBLE_FLAVORS[natKey] || "围着温暖篝火与同伴合奏星夜小调，营地洋溢着治愈笑声";
  const flavorLine = `【营火合奏】${leadMon.name || "萌灵"}（${natZh}）${flavorAct}！（全驻营亲密 +${bondGain}，获星营徽章 ×1）`;

  camp.recentLogs = [flavorLine, ...(camp.recentLogs || [])].slice(0, 6);
  camp.lastSyncMs = nowMs;

  return {
    ok: true,
    bondGain,
    pantryGained: { picnicHerb: herbGain, starBerry: berryGain, campToken: tokenGain },
    leveledUp,
    level: camp.level,
    remainingLeft: Math.max(0, STAR_CAMP_DAILY_ENSEMBLE_LIMIT - camp.ensembleUsed),
    flavorLine,
  };
}

export function canAffordCampRecipe(state, recipeId) {
  const camp = ensureStarCampState(state);
  const def = getCampRecipeDef(recipeId);
  if (!camp || !def) return false;
  for (const [rid, need] of Object.entries(def.costRes || {})) {
    const have = Number(state?.res?.[rid]?.value) || 0;
    if (have < need) return false;
  }
  for (const [pid, need] of Object.entries(def.costPantry || {})) {
    const have = Number(camp.pantry?.[pid]) || 0;
    if (have < need) return false;
  }
  return true;
}

export function cookCampRecipe(state, recipeId, opts = {}) {
  const camp = ensureStarCampState(state);
  const def = getCampRecipeDef(recipeId);
  if (!camp || !def) return { ok: false, reason: "unknown_recipe" };
  if (!canAffordCampRecipe(state, recipeId)) {
    return { ok: false, reason: "insufficient_ingredients" };
  }

  for (const [rid, need] of Object.entries(def.costRes || {})) {
    state.res[rid].value = Math.max(0, (Number(state.res[rid].value) || 0) - need);
  }
  for (const [pid, need] of Object.entries(def.costPantry || {})) {
    camp.pantry[pid] = Math.max(0, (Number(camp.pantry[pid]) || 0) - need);
  }

  const prevCooks = camp.recipes[def.id]?.cooks || 0;
  const newCooks = prevCooks + 1;
  const mastery = getRecipeMasteryInfo(newCooks);
  camp.recipes[def.id] = { cooks: newCooks, stars: mastery.stars };
  camp.totalCooks = (camp.totalCooks || 0) + 1;

  const addedSec = Math.round(def.durationSec * mastery.durationMul);
  const existing = camp.activeFeasts.find((f) => f.recipeId === def.id);
  if (existing) {
    existing.stars = Math.max(existing.stars || 1, mastery.stars);
    existing.potencyMul = Math.max(existing.potencyMul || 1, mastery.potencyMul);
    existing.remainingSec = Math.min(STAR_CAMP_MAX_FEAST_SEC, (existing.remainingSec || 0) + addedSec);
    existing.totalSec = Math.max(existing.totalSec || addedSec, existing.remainingSec);
  } else {
    if (camp.activeFeasts.length >= STAR_CAMP_MAX_ACTIVE_FEASTS) {
      camp.activeFeasts.sort((a, b) => (a.remainingSec || 0) - (b.remainingSec || 0));
      camp.activeFeasts.shift();
    }
    camp.activeFeasts.push({
      recipeId: def.id,
      stars: mastery.stars,
      potencyMul: mastery.potencyMul,
      remainingSec: Math.min(STAR_CAMP_MAX_FEAST_SEC, addedSec),
      totalSec: Math.min(STAR_CAMP_MAX_FEAST_SEC, addedSec),
    });
  }

  const list = Array.isArray(state.mons?.list) ? state.mons.list : [];
  const stationedMons = camp.stationedIds.map((id) => list.find((m) => m && m.id === id)).filter(Boolean);
  const bondGain = Math.round(def.bondGain * mastery.potencyMul);
  for (const m of stationedMons) {
    const aff0 = typeof m.affection === "number" && Number.isFinite(m.affection) ? m.affection : 0;
    m.affection = Math.min(100, Math.max(0, aff0 + bondGain));
    const sat0 = typeof m.satiety === "number" && Number.isFinite(m.satiety) ? m.satiety : 80;
    m.satiety = Math.min(100, sat0 + 25);
  }

  const leveledUp = addCampExp(camp, def.campExp);
  const firstDiscovery = prevCooks === 0;
  const starUp = prevCooks > 0 && mastery.stars > getRecipeMasteryInfo(prevCooks).stars;
  const tagNote = firstDiscovery ? "【新食谱解锁】" : starUp ? `【熟练晋升 ${mastery.stars}星】` : "【风味呈盘】";
  const logLine = `${tagNote}烹成「${def.name}」（${mastery.label}）${stationedMons.length > 0 ? `，驻营伙伴亲密 +${bondGain}` : ""}！`;
  camp.recentLogs = [logLine, ...(camp.recentLogs || [])].slice(0, 6);
  camp.lastSyncMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();

  return {
    ok: true,
    recipeId: def.id,
    recipeName: def.name,
    firstDiscovery,
    starUp,
    cooks: newCooks,
    stars: mastery.stars,
    masteryLabel: mastery.label,
    bondGain,
    stationedCount: stationedMons.length,
    leveledUp,
    level: camp.level,
    logLine,
  };
}

// ============================================================================
// ML-7 「星辉配饰流彩造型屋」(Starlight Accessory & Aurora Styling Boutique)
// ============================================================================

export const STAR_BOUTIQUE_MAX_LEVEL = 3;
export const STAR_BOUTIQUE_DAILY_SAND_GRANT = 6;
export const STAR_BOUTIQUE_MAX_SHEEN_SLOTS = 3;

export const BOUTIQUE_ACCESSORY_DEFS = Object.freeze([
  {
    id: "accAuroraCrown",
    name: "极光星冕头饰",
    slotLabel: "星冕头饰",
    icon: "accAuroraCrown",
    desc: "镶嵌星虹棱晶的鎏金轻冕，引动祈愿星芒，大幅提升闪光祈愿、全资源产出与伙伴战力。",
    costsByLevel: {
      1: { res: { shinyStarSand: 3 }, pantry: {} },
      2: { res: { shinyStarSand: 5, futurecoin: 45 }, pantry: { starBerry: 1 } },
      3: { res: { shinyStarSand: 8, futurecoin: 90 }, pantry: { starBerry: 2 } },
    },
    bonusesByLevel: {
      1: { prodAdd: 0.04, shinyAdd: 0.08, combatAdd: 0.08, affGainAdd: 0.10, trainExpAdd: 0.03 },
      2: { prodAdd: 0.08, shinyAdd: 0.16, combatAdd: 0.14, affGainAdd: 0.18, trainExpAdd: 0.06 },
      3: { prodAdd: 0.13, shinyAdd: 0.26, combatAdd: 0.22, affGainAdd: 0.28, trainExpAdd: 0.10 },
    },
  },
  {
    id: "accCozyScarf",
    name: "暖绒星纹围巾",
    slotLabel: "暖绒颈饰",
    icon: "accCozyScarf",
    desc: "细密编织流星纹章的蓬松暖绒围巾，令佩戴伙伴倍感安心，显著提升亲密升温与训练历练经验。",
    costsByLevel: {
      1: { res: { shinyStarSand: 3 }, pantry: {} },
      2: { res: { shinyStarSand: 5, futurecoin: 35 }, pantry: { picnicHerb: 2 } },
      3: { res: { shinyStarSand: 8, futurecoin: 75 }, pantry: { picnicHerb: 3 } },
    },
    bonusesByLevel: {
      1: { affGainAdd: 0.20, trainExpAdd: 0.08, prodAdd: 0.03, combatAdd: 0.06, shinyAdd: 0.04 },
      2: { affGainAdd: 0.35, trainExpAdd: 0.15, prodAdd: 0.06, combatAdd: 0.11, shinyAdd: 0.08 },
      3: { affGainAdd: 0.55, trainExpAdd: 0.24, prodAdd: 0.10, combatAdd: 0.18, shinyAdd: 0.14 },
    },
  },
  {
    id: "accFairyWings",
    name: "流光蝶翼披风",
    slotLabel: "流光背饰",
    icon: "accFairyWings",
    desc: "由星雾薄纱裁成的幻彩蝶翼披风，振袂间流光溢彩，强化伙伴殿堂作战威力、训练效率与闪光气运。",
    costsByLevel: {
      1: { res: { shinyStarSand: 4 }, pantry: {} },
      2: { res: { shinyStarSand: 6, futurecoin: 50 }, pantry: { picnicHerb: 1, starBerry: 1 } },
      3: { res: { shinyStarSand: 9, futurecoin: 100 }, pantry: { picnicHerb: 2, starBerry: 2 } },
    },
    bonusesByLevel: {
      1: { combatAdd: 0.10, trainExpAdd: 0.06, shinyAdd: 0.06, prodAdd: 0.03, affGainAdd: 0.08 },
      2: { combatAdd: 0.18, trainExpAdd: 0.12, shinyAdd: 0.12, prodAdd: 0.06, affGainAdd: 0.15 },
      3: { combatAdd: 0.28, trainExpAdd: 0.20, shinyAdd: 0.20, prodAdd: 0.10, affGainAdd: 0.22 },
    },
  },
]);

export const BOUTIQUE_SHEEN_STYLES = Object.freeze([
  {
    id: "aurora_prism",
    name: "极光星虹流彩",
    swatch: "prism",
    unlockCostSand: 2,
    desc: "七彩极光环绕伙伴周身：全产 +2.5% · 闪光祈愿 +6% · 伙伴战力 +5%",
    bonuses: { prodAdd: 0.025, shinyAdd: 0.06, combatAdd: 0.05, affGainAdd: 0.06, trainExpAdd: 0, catchAdd: 0 },
  },
  {
    id: "nebula_rose",
    name: "星云绯樱流彩",
    swatch: "rose",
    unlockCostSand: 2,
    desc: "暖粉星云柔光轻抚：亲密获取 +15% · 训练经验 +5% · 伙伴战力 +4%",
    bonuses: { prodAdd: 0.015, shinyAdd: 0, combatAdd: 0.04, affGainAdd: 0.15, trainExpAdd: 0.05, catchAdd: 0 },
  },
  {
    id: "celestial_gold",
    name: "日曜圣辉流彩",
    swatch: "gold",
    unlockCostSand: 2,
    desc: "璀璨日曜金辉加冕：全产 +3.5% · 伙伴战力 +7% · 训练经验 +3%",
    bonuses: { prodAdd: 0.035, shinyAdd: 0, combatAdd: 0.07, affGainAdd: 0, trainExpAdd: 0.03, catchAdd: 0 },
  },
  {
    id: "moonlit_mist",
    name: "月华霜晶流彩",
    swatch: "moon",
    unlockCostSand: 2,
    desc: "澄澈月华星雾萦绕：闪光祈愿 +8% · 训练经验 +5% · 全局捕获 +0.6% · 战力 +4%",
    bonuses: { prodAdd: 0, shinyAdd: 0.08, combatAdd: 0.04, affGainAdd: 0, trainExpAdd: 0.05, catchAdd: 0.006 },
  },
]);

export const BOUTIQUE_SAND_SYNTH_RECIPES = Object.freeze({
  gold: {
    id: "gold",
    name: "未来币凝砂",
    costRes: { futurecoin: 50 },
    costPantry: {},
    sandGain: 4,
    desc: "消耗 50 未来币凝炼 +4 闪光祈愿星砂",
  },
  herb: {
    id: "herb",
    name: "香草星露凝砂",
    costRes: {},
    costPantry: { picnicHerb: 2, starBerry: 2 },
    sandGain: 5,
    desc: "消耗野餐香草 ×2 + 星露灵果 ×2 萃取 +5 闪光祈愿星砂",
  },
});

export function getBoutiqueAccessoryDef(accId) {
  return BOUTIQUE_ACCESSORY_DEFS.find((a) => a.id === accId) || null;
}

export function getBoutiqueSheenDef(sheenId) {
  return BOUTIQUE_SHEEN_STYLES.find((s) => s.id === sheenId) || null;
}

function ensureShinyStarSandBucket(state) {
  if (!state || typeof state !== "object") return null;
  if (!state.res || typeof state.res !== "object") state.res = {};
  if (!state.res.shinyStarSand || typeof state.res.shinyStarSand !== "object") {
    state.res.shinyStarSand = { value: 0, cap: 9999 };
  }
  if (typeof state.res.shinyStarSand.value !== "number" || !Number.isFinite(state.res.shinyStarSand.value)) {
    state.res.shinyStarSand.value = 0;
  }
  if (typeof state.res.shinyStarSand.cap !== "number" || state.res.shinyStarSand.cap <= 0) {
    state.res.shinyStarSand.cap = 9999;
  }
  return state.res.shinyStarSand;
}

export function ensureStarBoutiqueState(state) {
  if (!state || typeof state !== "object") return null;
  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  ensureShinyStarSandBucket(state);
  const raw = state.meta.starBoutique && typeof state.meta.starBoutique === "object" ? state.meta.starBoutique : {};

  const monList = Array.isArray(state?.mons?.list) ? state.mons.list : null;
  const validMonSet = monList
    ? new Set(
        monList
          .filter((m) => m && typeof m.id === "number" && Number.isFinite(m.id) && m.id > 0)
          .map((m) => Math.floor(m.id)),
      )
    : null;

  const accessories = {};
  const usedEquipMons = new Set();
  const rawAcc = raw.accessories && typeof raw.accessories === "object" ? raw.accessories : {};
  for (const def of BOUTIQUE_ACCESSORY_DEFS) {
    const entry = rawAcc[def.id] && typeof rawAcc[def.id] === "object" ? rawAcc[def.id] : {};
    const level = Math.max(0, Math.min(STAR_BOUTIQUE_MAX_LEVEL, Math.floor(Number(entry.level) || 0)));
    let equippedMonId =
      level > 0 && typeof entry.equippedMonId === "number" && Number.isFinite(entry.equippedMonId) && entry.equippedMonId > 0
        ? Math.floor(entry.equippedMonId)
        : null;
    if (equippedMonId !== null) {
      if ((validMonSet && !validMonSet.has(equippedMonId)) || usedEquipMons.has(equippedMonId)) {
        equippedMonId = null;
      } else {
        usedEquipMons.add(equippedMonId);
      }
    }
    accessories[def.id] = { level, equippedMonId };
  }

  const validSheenIds = new Set(BOUTIQUE_SHEEN_STYLES.map((s) => s.id));
  const unlockedSheens = [];
  if (Array.isArray(raw.unlockedSheens)) {
    for (const sid of raw.unlockedSheens) {
      if (typeof sid === "string" && validSheenIds.has(sid) && !unlockedSheens.includes(sid)) {
        unlockedSheens.push(sid);
      }
    }
  }

  const sheenByMon = {};
  const rawSheenMap = raw.sheenByMon && typeof raw.sheenByMon === "object" ? raw.sheenByMon : {};
  let sheenSlotsUsed = 0;
  for (const [k, sid] of Object.entries(rawSheenMap)) {
    if (sheenSlotsUsed >= STAR_BOUTIQUE_MAX_SHEEN_SLOTS) break;
    const mid = Math.floor(Number(k));
    if (!Number.isFinite(mid) || mid <= 0) continue;
    if (validMonSet && !validMonSet.has(mid)) continue;
    if (typeof sid !== "string" || !validSheenIds.has(sid)) continue;
    if (!unlockedSheens.includes(sid)) unlockedSheens.push(sid);
    sheenByMon[String(mid)] = sid;
    sheenSlotsUsed += 1;
  }

  const selectedMonId =
    typeof raw.selectedMonId === "number" &&
    Number.isFinite(raw.selectedMonId) &&
    raw.selectedMonId > 0 &&
    (!validMonSet || validMonSet.has(Math.floor(raw.selectedMonId)))
      ? Math.floor(raw.selectedMonId)
      : monList && monList[0]?.id
        ? Math.floor(monList[0].id)
        : null;

  const recentLogs = Array.isArray(raw.recentLogs)
    ? raw.recentLogs.filter((s) => typeof s === "string" && s.trim().length > 0).slice(0, 6)
    : [];

  const clean = {
    initialized: true,
    accessories,
    unlockedSheens,
    sheenByMon,
    selectedMonId,
    dailyClaimDate: typeof raw.dailyClaimDate === "string" ? raw.dailyClaimDate : "",
    totalCrafts: Math.max(0, Math.floor(Number(raw.totalCrafts) || 0)),
    totalSyntheses: Math.max(0, Math.floor(Number(raw.totalSyntheses) || 0)),
    recentLogs,
  };

  if (state.meta.starBoutique && typeof state.meta.starBoutique === "object") {
    Object.assign(state.meta.starBoutique, clean);
    return state.meta.starBoutique;
  }
  state.meta.starBoutique = clean;
  return clean;
}

export function canClaimDailyStarSand(state, nowMs = Date.now()) {
  const bq = ensureStarBoutiqueState(state);
  if (!bq) return false;
  const today = localYmdForSandbox(nowMs);
  return bq.dailyClaimDate !== today;
}

export function claimDailyStarSand(state, opts = {}) {
  const bq = ensureStarBoutiqueState(state);
  if (!bq) return { ok: false, reason: "invalid_state" };
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const today = localYmdForSandbox(nowMs);
  if (bq.dailyClaimDate === today) {
    return { ok: false, reason: "already_claimed_today" };
  }
  bq.dailyClaimDate = today;
  const bucket = ensureShinyStarSandBucket(state);
  const gain = STAR_BOUTIQUE_DAILY_SAND_GRANT;
  bucket.value = Math.min(bucket.cap || 9999, Math.max(0, (bucket.value || 0) + gain));
  const logLine = `【星辉凝砂】每日免费祈愿凝得「闪光祈愿星砂 ×${gain}」，可立即前往梳妆台裁制星辉配饰！`;
  bq.recentLogs = [logLine, ...(bq.recentLogs || [])].slice(0, 6);
  return { ok: true, gained: gain, totalSand: bucket.value, logLine };
}

export function canSynthesizeStarSand(state, method = "gold") {
  const recipe = BOUTIQUE_SAND_SYNTH_RECIPES[method];
  if (!state || !recipe) return false;
  for (const [rid, need] of Object.entries(recipe.costRes || {})) {
    const have = Number(state?.res?.[rid]?.value) || 0;
    if (have < need) return false;
  }
  const pantry = state?.meta?.starCamp?.pantry || {};
  for (const [pid, need] of Object.entries(recipe.costPantry || {})) {
    const have = Number(pantry[pid]) || 0;
    if (have < need) return false;
  }
  return true;
}

export function synthesizeStarSand(state, method = "gold") {
  const bq = ensureStarBoutiqueState(state);
  const recipe = BOUTIQUE_SAND_SYNTH_RECIPES[method];
  if (!bq || !recipe) return { ok: false, reason: "unknown_method" };
  if (!canSynthesizeStarSand(state, method)) {
    return { ok: false, reason: "insufficient_cost" };
  }
  for (const [rid, need] of Object.entries(recipe.costRes || {})) {
    state.res[rid].value = Math.max(0, (Number(state.res[rid].value) || 0) - need);
  }
  if (Object.keys(recipe.costPantry || {}).length > 0) {
    const camp = ensureStarCampState(state);
    for (const [pid, need] of Object.entries(recipe.costPantry || {})) {
      camp.pantry[pid] = Math.max(0, (Number(camp.pantry[pid]) || 0) - need);
    }
  }
  const bucket = ensureShinyStarSandBucket(state);
  bucket.value = Math.min(bucket.cap || 9999, Math.max(0, (bucket.value || 0) + recipe.sandGain));
  bq.totalSyntheses = (bq.totalSyntheses || 0) + 1;
  const logLine = `【${recipe.name}】凝炼成功，获得「闪光祈愿星砂 ×${recipe.sandGain}」（当前库存 ${Math.floor(bucket.value)}）`;
  bq.recentLogs = [logLine, ...(bq.recentLogs || [])].slice(0, 6);
  return { ok: true, method: recipe.id, gained: recipe.sandGain, totalSand: bucket.value, logLine };
}

export function getAccessoryNextCost(state, accId) {
  const def = getBoutiqueAccessoryDef(accId);
  if (!def) return null;
  const curLvl = Math.max(0, Math.min(STAR_BOUTIQUE_MAX_LEVEL, Math.floor(Number(state?.meta?.starBoutique?.accessories?.[accId]?.level) || 0)));
  if (curLvl >= STAR_BOUTIQUE_MAX_LEVEL) return null;
  return def.costsByLevel[curLvl + 1] || null;
}

export function canCraftOrUpgradeAccessory(state, accId) {
  const cost = getAccessoryNextCost(state, accId);
  if (!state || !cost) return false;
  for (const [rid, need] of Object.entries(cost.res || {})) {
    const have = Number(state?.res?.[rid]?.value) || 0;
    if (have < need) return false;
  }
  const pantry = state?.meta?.starCamp?.pantry || {};
  for (const [pid, need] of Object.entries(cost.pantry || {})) {
    const have = Number(pantry[pid]) || 0;
    if (have < need) return false;
  }
  return true;
}

export function craftOrUpgradeBoutiqueAccessory(state, accId, opts = {}) {
  const bq = ensureStarBoutiqueState(state);
  const def = getBoutiqueAccessoryDef(accId);
  if (!bq || !def) return { ok: false, reason: "unknown_accessory" };
  const entry = bq.accessories[def.id];
  if (entry.level >= STAR_BOUTIQUE_MAX_LEVEL) {
    return { ok: false, reason: "max_level" };
  }
  const nextLvl = entry.level + 1;
  const cost = def.costsByLevel[nextLvl];
  if (!canCraftOrUpgradeAccessory(state, accId)) {
    return { ok: false, reason: "insufficient_materials" };
  }
  for (const [rid, need] of Object.entries(cost.res || {})) {
    state.res[rid].value = Math.max(0, (Number(state.res[rid].value) || 0) - need);
  }
  if (Object.keys(cost.pantry || {}).length > 0) {
    const camp = ensureStarCampState(state);
    for (const [pid, need] of Object.entries(cost.pantry || {})) {
      camp.pantry[pid] = Math.max(0, (Number(camp.pantry[pid]) || 0) - need);
    }
  }
  entry.level = nextLvl;
  bq.totalCrafts = (bq.totalCrafts || 0) + 1;

  let autoEquippedMonId = null;
  if (nextLvl === 1 && opts.autoEquip !== false) {
    const prefId = opts.equipMonId != null ? Number(opts.equipMonId) : bq.selectedMonId;
    const list = Array.isArray(state?.mons?.list) ? state.mons.list.filter(Boolean) : [];
    const targetMon =
      list.find((m) => m.id === prefId && !Object.values(bq.accessories).some((a) => a.equippedMonId === m.id)) ||
      list.find((m) => !Object.values(bq.accessories).some((a) => a.equippedMonId === m.id)) ||
      null;
    if (targetMon) {
      entry.equippedMonId = targetMon.id;
      autoEquippedMonId = targetMon.id;
    }
  }

  const actionWord = nextLvl === 1 ? "裁制诞生" : `升阶至 Lv.${nextLvl}`;
  const equipSuffix = autoEquippedMonId
    ? `，已自动为伙伴穿戴并开启防放生保护`
    : "";
  const logLine = `【星辉造型屋】「${def.name}」${actionWord}${equipSuffix}！`;
  bq.recentLogs = [logLine, ...(bq.recentLogs || [])].slice(0, 6);

  return {
    ok: true,
    accessoryId: def.id,
    accessoryName: def.name,
    level: nextLvl,
    equippedMonId: entry.equippedMonId,
    logLine,
  };
}

export function equipBoutiqueAccessory(state, accId, monId) {
  const bq = ensureStarBoutiqueState(state);
  const def = getBoutiqueAccessoryDef(accId);
  if (!bq || !def) return { ok: false, reason: "unknown_accessory" };
  const entry = bq.accessories[def.id];
  if (!entry || entry.level <= 0) return { ok: false, reason: "not_crafted" };

  if (monId == null) {
    entry.equippedMonId = null;
    return { ok: true, accessoryId: def.id, equippedMonId: null };
  }

  const id = Math.floor(Number(monId));
  const list = Array.isArray(state?.mons?.list) ? state.mons.list : [];
  const mon = list.find((m) => m && m.id === id);
  if (!mon) return { ok: false, reason: "invalid_mon" };

  for (const [otherId, otherEntry] of Object.entries(bq.accessories)) {
    if (otherId !== def.id && otherEntry.equippedMonId === id) {
      otherEntry.equippedMonId = null;
    }
  }
  entry.equippedMonId = id;
  bq.selectedMonId = id;
  const logLine = `【星辉穿戴】${mon.name || "伙伴"} 穿戴了「${def.name} Lv.${entry.level}」（穿戴保护生效）`;
  bq.recentLogs = [logLine, ...(bq.recentLogs || [])].slice(0, 6);
  return { ok: true, accessoryId: def.id, equippedMonId: id, level: entry.level, logLine };
}

export function unequipBoutiqueAccessory(state, accId) {
  return equipBoutiqueAccessory(state, accId, null);
}

export function unlockOrApplyBoutiqueSheen(state, sheenId, monId = null) {
  const bq = ensureStarBoutiqueState(state);
  const def = getBoutiqueSheenDef(sheenId);
  if (!bq || !def) return { ok: false, reason: "unknown_sheen" };

  let newlyUnlocked = false;
  if (!bq.unlockedSheens.includes(def.id)) {
    const haveSand = Number(state?.res?.shinyStarSand?.value) || 0;
    if (haveSand < def.unlockCostSand) {
      return { ok: false, reason: "insufficient_sand" };
    }
    state.res.shinyStarSand.value = Math.max(0, haveSand - def.unlockCostSand);
    bq.unlockedSheens.push(def.id);
    newlyUnlocked = true;
  }

  const targetId = monId != null ? Math.floor(Number(monId)) : bq.selectedMonId;
  let appliedMonId = null;
  if (targetId != null && Number.isFinite(targetId) && targetId > 0) {
    const list = Array.isArray(state?.mons?.list) ? state.mons.list : [];
    const mon = list.find((m) => m && m.id === targetId);
    if (mon) {
      const key = String(mon.id);
      if (!bq.sheenByMon[key] && Object.keys(bq.sheenByMon).length >= STAR_BOUTIQUE_MAX_SHEEN_SLOTS) {
        const oldestKey = Object.keys(bq.sheenByMon)[0];
        if (oldestKey) delete bq.sheenByMon[oldestKey];
      }
      bq.sheenByMon[key] = def.id;
      bq.selectedMonId = mon.id;
      appliedMonId = mon.id;
      const logLine = `【极光流彩】为 ${mon.name || "伙伴"} 调染「${def.name}」光晕${newlyUnlocked ? "（新流彩图谱已解锁）" : ""}`;
      bq.recentLogs = [logLine, ...(bq.recentLogs || [])].slice(0, 6);
    }
  } else if (newlyUnlocked) {
    const logLine = `【极光流彩】已解锁「${def.name}」流彩光晕图谱！`;
    bq.recentLogs = [logLine, ...(bq.recentLogs || [])].slice(0, 6);
  }

  return { ok: true, sheenId: def.id, newlyUnlocked, appliedMonId };
}

export function clearMonBoutiqueSheen(state, monId) {
  const bq = ensureStarBoutiqueState(state);
  if (!bq) return { ok: false };
  const key = String(Math.floor(Number(monId) || 0));
  if (bq.sheenByMon[key]) delete bq.sheenByMon[key];
  return { ok: true };
}

export function unequipBoutiqueStyle(state, monId) {
  const bq = ensureStarBoutiqueState(state);
  if (!bq) return { ok: false, returnedAccessories: [] };
  const id = Math.floor(Number(monId) || 0);
  const returnedAccessories = [];
  for (const [accId, entry] of Object.entries(bq.accessories)) {
    if (entry.equippedMonId === id) {
      entry.equippedMonId = null;
      returnedAccessories.push(accId);
    }
  }
  delete bq.sheenByMon[String(id)];
  return { ok: true, returnedAccessories };
}

/** Non-mutating read of all valid partner IDs currently wearing an accessory or Aurora Sheen (protected against release). */
export function getBoutiqueStyledMonIds(state) {
  const ids = new Set();
  const raw = state?.meta?.starBoutique;
  if (!raw || typeof raw !== "object") return ids;
  const monList = Array.isArray(state?.mons?.list) ? state.mons.list : null;
  const validSet = monList
    ? new Set(monList.filter((m) => m && typeof m.id === "number").map((m) => Math.floor(m.id)))
    : null;

  const rawAcc = raw.accessories && typeof raw.accessories === "object" ? raw.accessories : {};
  for (const def of BOUTIQUE_ACCESSORY_DEFS) {
    const entry = rawAcc[def.id];
    const lvl = Math.floor(Number(entry?.level) || 0);
    const mid = Math.floor(Number(entry?.equippedMonId) || 0);
    if (lvl > 0 && mid > 0 && (!validSet || validSet.has(mid))) {
      ids.add(mid);
    }
  }
  const rawSheen = raw.sheenByMon && typeof raw.sheenByMon === "object" ? raw.sheenByMon : {};
  for (const [k, sid] of Object.entries(rawSheen)) {
    const mid = Math.floor(Number(k) || 0);
    if (mid > 0 && typeof sid === "string" && getBoutiqueSheenDef(sid) && (!validSet || validSet.has(mid))) {
      ids.add(mid);
    }
  }
  return ids;
}

export function getMonBoutiqueBonus(state, monId) {
  const id = Math.floor(Number(monId) || 0);
  const raw = state?.meta?.starBoutique;
  if (!raw || typeof raw !== "object" || id <= 0) {
    return {
      styled: false,
      accessoryId: null,
      accessoryName: null,
      accessoryIcon: null,
      accessoryLevel: 0,
      sheenId: null,
      sheenName: null,
      combatAdd: 0,
      combatMul: 1,
      affGainAdd: 0,
      affGainMul: 1,
      trainExpAdd: 0,
      shinyAdd: 0,
      prodAdd: 0,
    };
  }
  let accDef = null;
  let accLvl = 0;
  const rawAcc = raw.accessories && typeof raw.accessories === "object" ? raw.accessories : {};
  for (const def of BOUTIQUE_ACCESSORY_DEFS) {
    const entry = rawAcc[def.id];
    const lvl = Math.max(0, Math.min(STAR_BOUTIQUE_MAX_LEVEL, Math.floor(Number(entry?.level) || 0)));
    if (lvl > 0 && Math.floor(Number(entry?.equippedMonId) || 0) === id) {
      accDef = def;
      accLvl = lvl;
      break;
    }
  }
  const sheenIdRaw = raw.sheenByMon && typeof raw.sheenByMon === "object" ? raw.sheenByMon[String(id)] : null;
  const sheenDef = typeof sheenIdRaw === "string" ? getBoutiqueSheenDef(sheenIdRaw) : null;

  const accB = accDef ? accDef.bonusesByLevel[accLvl] || {} : {};
  const shB = sheenDef ? sheenDef.bonuses || {} : {};
  const round4 = (n) => Math.round(n * 10000) / 10000;
  const combatAdd = round4((accB.combatAdd || 0) + (shB.combatAdd || 0));
  const affGainAdd = round4((accB.affGainAdd || 0) + (shB.affGainAdd || 0));
  const trainExpAdd = round4((accB.trainExpAdd || 0) + (shB.trainExpAdd || 0));
  const shinyAdd = round4((accB.shinyAdd || 0) + (shB.shinyAdd || 0));
  const prodAdd = round4((accB.prodAdd || 0) + (shB.prodAdd || 0));

  return {
    styled: Boolean(accDef || sheenDef),
    accessoryId: accDef?.id || null,
    accessoryName: accDef?.name || null,
    accessoryIcon: accDef?.icon || null,
    accessoryLevel: accLvl,
    sheenId: sheenDef?.id || null,
    sheenName: sheenDef?.name || null,
    combatAdd,
    combatMul: round4(1 + combatAdd),
    affGainAdd,
    affGainMul: round4(1 + affGainAdd),
    trainExpAdd,
    shinyAdd,
    prodAdd,
  };
}

/** Pure non-mutating aggregator for global Boutique bonuses across production, training, affection, shiny odds & combat. */
export function computeStarBoutiqueAura(state) {
  const raw = state?.meta?.starBoutique;
  if (!raw || typeof raw !== "object") {
    return {
      craftedCount: 0,
      totalLevels: 0,
      maxTotalLevels: BOUTIQUE_ACCESSORY_DEFS.length * STAR_BOUTIQUE_MAX_LEVEL,
      equippedCount: 0,
      unlockedSheenCount: 0,
      styledMonCount: 0,
      trioSetActive: false,
      prodAdd: 0,
      prodMul: 1,
      trainExpAdd: 0,
      trainExpMul: 1,
      affGainAdd: 0,
      affGainMul: 1,
      shinyAdd: 0,
      shinyChanceMul: 1,
      catchAdd: 0,
      combatAdd: 0,
      combatMul: 1,
      equippedSummary: [],
    };
  }

  const monList = Array.isArray(state?.mons?.list) ? state.mons.list : null;
  const monMap = new Map();
  if (monList) {
    for (const m of monList) {
      if (m && typeof m.id === "number") monMap.set(Math.floor(m.id), m);
    }
  }

  let craftedCount = 0;
  let totalLevels = 0;
  let equippedCount = 0;
  let prodAdd = 0;
  let trainExpAdd = 0;
  let affGainAdd = 0;
  let shinyAdd = 0;
  let catchAdd = 0;
  let combatAdd = 0;
  const equippedSummary = [];

  const rawAcc = raw.accessories && typeof raw.accessories === "object" ? raw.accessories : {};
  for (const def of BOUTIQUE_ACCESSORY_DEFS) {
    const entry = rawAcc[def.id];
    const lvl = Math.max(0, Math.min(STAR_BOUTIQUE_MAX_LEVEL, Math.floor(Number(entry?.level) || 0)));
    if (lvl <= 0) continue;
    craftedCount += 1;
    totalLevels += lvl;
    const b = def.bonusesByLevel[lvl] || {};
    const mid = Math.floor(Number(entry?.equippedMonId) || 0);
    const wornByValidMon = mid > 0 && (!monList || monMap.has(mid));
    // Equipped keepsakes radiate 100% aura; cabinet display keepsakes still grant 40% passive collection aura
    const factor = wornByValidMon ? 1 : 0.4;
    if (wornByValidMon) {
      equippedCount += 1;
      const mon = monMap.get(mid);
      equippedSummary.push({
        accessoryId: def.id,
        accessoryName: def.name,
        icon: def.icon,
        level: lvl,
        monId: mid,
        monName: mon?.name || `#${mid}`,
      });
    }
    prodAdd += (b.prodAdd || 0) * factor;
    trainExpAdd += (b.trainExpAdd || 0) * factor;
    affGainAdd += (b.affGainAdd || 0) * factor;
    shinyAdd += (b.shinyAdd || 0) * factor;
    combatAdd += (b.combatAdd || 0) * (wornByValidMon ? 0.5 : 0.2);
  }

  const unlockedSheenCount = Array.isArray(raw.unlockedSheens)
    ? raw.unlockedSheens.filter((sid) => Boolean(getBoutiqueSheenDef(sid))).length
    : 0;

  const rawSheen = raw.sheenByMon && typeof raw.sheenByMon === "object" ? raw.sheenByMon : {};
  let activeSheenCount = 0;
  for (const [k, sid] of Object.entries(rawSheen)) {
    if (activeSheenCount >= STAR_BOUTIQUE_MAX_SHEEN_SLOTS) break;
    const mid = Math.floor(Number(k) || 0);
    if (mid <= 0 || (monList && !monMap.has(mid))) continue;
    const sDef = typeof sid === "string" ? getBoutiqueSheenDef(sid) : null;
    if (!sDef) continue;
    activeSheenCount += 1;
    const sb = sDef.bonuses || {};
    prodAdd += sb.prodAdd || 0;
    trainExpAdd += sb.trainExpAdd || 0;
    affGainAdd += sb.affGainAdd || 0;
    shinyAdd += sb.shinyAdd || 0;
    catchAdd += sb.catchAdd || 0;
    combatAdd += (sb.combatAdd || 0) * 0.5;
  }

  const trioSetActive = equippedCount >= 3;
  if (trioSetActive) {
    prodAdd += 0.05;
    shinyAdd += 0.10;
    trainExpAdd += 0.06;
    catchAdd += 0.01;
    combatAdd += 0.06;
  }

  const styledMonCount = getBoutiqueStyledMonIds(state).size;
  const round4 = (n) => Math.round(n * 10000) / 10000;
  prodAdd = round4(Math.min(0.65, prodAdd));
  trainExpAdd = round4(Math.min(0.75, trainExpAdd));
  affGainAdd = round4(Math.min(1.2, affGainAdd));
  shinyAdd = round4(Math.min(0.95, shinyAdd));
  catchAdd = round4(Math.min(0.06, catchAdd));
  combatAdd = round4(Math.min(0.55, combatAdd));

  return {
    craftedCount,
    totalLevels,
    maxTotalLevels: BOUTIQUE_ACCESSORY_DEFS.length * STAR_BOUTIQUE_MAX_LEVEL,
    equippedCount,
    unlockedSheenCount,
    styledMonCount,
    trioSetActive,
    prodAdd,
    prodMul: round4(1 + prodAdd),
    trainExpAdd,
    trainExpMul: round4(1 + trainExpAdd),
    affGainAdd,
    affGainMul: round4(1 + affGainAdd),
    shinyAdd,
    shinyChanceMul: round4(1 + shinyAdd),
    catchAdd,
    combatAdd,
    combatMul: round4(1 + combatAdd),
    equippedSummary,
  };
}

// ============================================================================
// ML-8 「远古琥珀基因复苏所」(Ancient Amber Gene Revival Lab)
// ============================================================================

export const AMBER_IMPRINT_MAX_LEVEL = 3;
export const AMBER_REVIVAL_DAILY_GRANT = 6;
export const AMBER_IV_REFINE_COST = 2;
const AMBER_IV_STAT_KEYS = Object.freeze(["hp", "atk", "def", "spa", "spd", "spe"]);
const AMBER_IV_STAT_ZH = Object.freeze({
  hp: "生命",
  atk: "攻击",
  def: "防御",
  spa: "特攻",
  spd: "特防",
  spe: "速度",
});

export const PRIMAL_IMPRINT_DEFS = Object.freeze([
  {
    id: "primalClaw",
    name: "太古苍牙印记",
    slotLabel: "苍牙锋魄",
    icon: "primalClawTotem",
    desc: "封存远古荒原苍牙猎龙基因脉动的赤金图腾，激发伙伴个体潜能淬炼、星轨作战锋芒与全资源产出。",
    costsByLevel: {
      1: { res: { ancientGeneAmber: 3 } },
      2: { res: { ancientGeneAmber: 5, futurecoin: 45 } },
      3: { res: { ancientGeneAmber: 8, futurecoin: 95, evolutionStone: 1 } },
    },
    bonusesByLevel: {
      1: { combatAdd: 0.10, ivTrainAdd: 0.12, prodAdd: 0.04, catchAdd: 0.004, shinyAdd: 0.04 },
      2: { combatAdd: 0.18, ivTrainAdd: 0.22, prodAdd: 0.08, catchAdd: 0.008, shinyAdd: 0.08 },
      3: { combatAdd: 0.28, ivTrainAdd: 0.35, prodAdd: 0.13, catchAdd: 0.012, shinyAdd: 0.14 },
    },
  },
  {
    id: "primalShell",
    name: "沧海旋螺印记",
    slotLabel: "沧海灵甲",
    icon: "primalShellTotem",
    desc: "凝结远古深海旋螺晶壳灵韵的蔚蓝印记，稳固伙伴本源血脉，显著提升全局捕获率、全资源产出与守御战力。",
    costsByLevel: {
      1: { res: { ancientGeneAmber: 3 } },
      2: { res: { ancientGeneAmber: 5, futurecoin: 40 } },
      3: { res: { ancientGeneAmber: 8, futurecoin: 85, minerals: 40 } },
    },
    bonusesByLevel: {
      1: { prodAdd: 0.05, catchAdd: 0.008, combatAdd: 0.07, ivTrainAdd: 0.08, shinyAdd: 0.04 },
      2: { prodAdd: 0.10, catchAdd: 0.015, combatAdd: 0.13, ivTrainAdd: 0.16, shinyAdd: 0.08 },
      3: { prodAdd: 0.16, catchAdd: 0.024, combatAdd: 0.20, ivTrainAdd: 0.26, shinyAdd: 0.12 },
    },
  },
  {
    id: "primalFern",
    name: "森罗古蕨印记",
    slotLabel: "古蕨生机",
    icon: "ecoCanopy",
    desc: "拓印纪元初生巨蕨灵脉的翡翠琥珀印记，滋养萌灵先天资质，大幅加速个体潜能训练突破与全资源产出。",
    costsByLevel: {
      1: { res: { ancientGeneAmber: 3 } },
      2: { res: { ancientGeneAmber: 5, wood: 50, futurecoin: 35 } },
      3: { res: { ancientGeneAmber: 8, wood: 100, tuningMint: 1 } },
    },
    bonusesByLevel: {
      1: { ivTrainAdd: 0.16, prodAdd: 0.05, combatAdd: 0.06, shinyAdd: 0.05, catchAdd: 0.005 },
      2: { ivTrainAdd: 0.28, prodAdd: 0.09, combatAdd: 0.12, shinyAdd: 0.10, catchAdd: 0.010 },
      3: { ivTrainAdd: 0.42, prodAdd: 0.15, combatAdd: 0.19, shinyAdd: 0.16, catchAdd: 0.015 },
    },
  },
  {
    id: "primalMeteor",
    name: "星陨晶龙印记",
    slotLabel: "星陨龙魂",
    icon: "ecoAstral",
    desc: "凝缩天外星陨与古龙晶髓的璀璨印记，引动星穹异色共鸣，显著提升闪光奇遇率、星轨回廊威力与潜能突破。",
    costsByLevel: {
      1: { res: { ancientGeneAmber: 4 } },
      2: { res: { ancientGeneAmber: 6, futurecoin: 55 } },
      3: { res: { ancientGeneAmber: 9, futurecoin: 110, shinyStarSand: 3 } },
    },
    bonusesByLevel: {
      1: { shinyAdd: 0.10, combatAdd: 0.09, ivTrainAdd: 0.10, prodAdd: 0.04, catchAdd: 0.005 },
      2: { shinyAdd: 0.20, combatAdd: 0.17, ivTrainAdd: 0.18, prodAdd: 0.08, catchAdd: 0.010 },
      3: { shinyAdd: 0.32, combatAdd: 0.26, ivTrainAdd: 0.28, prodAdd: 0.13, catchAdd: 0.016 },
    },
  },
]);

export const AMBER_SYNTH_RECIPES = Object.freeze({
  eco: {
    id: "eco",
    name: "秘境生态凝珀",
    costRes: { tuningMint: 1, minerals: 30 },
    amberGain: 4,
    desc: "消耗秘境生态沙盘特产：心性调律薄荷 ×1 + 灵矿 ×30 → 凝结 +4 远古基因琥珀",
  },
  league: {
    id: "league",
    name: "殿堂星辉凝珀",
    costRes: { shinyStarSand: 3, futurecoin: 40 },
    amberGain: 5,
    desc: "消耗冠军联盟殿堂奖励：闪光祈愿星砂 ×3 + 未来币 ×40 → 萃炼 +5 远古基因琥珀",
  },
});

export function getPrimalImprintDef(imprintId) {
  return PRIMAL_IMPRINT_DEFS.find((d) => d.id === imprintId) || null;
}

export function ensureAncientAmberBucket(state) {
  if (!state || typeof state !== "object") return null;
  if (!state.res || typeof state.res !== "object") state.res = {};
  if (!state.res.ancientGeneAmber || typeof state.res.ancientGeneAmber !== "object") {
    state.res.ancientGeneAmber = { value: 0, cap: 9999 };
  }
  if (typeof state.res.ancientGeneAmber.value !== "number" || !Number.isFinite(state.res.ancientGeneAmber.value)) {
    state.res.ancientGeneAmber.value = 0;
  }
  if (typeof state.res.ancientGeneAmber.cap !== "number" || state.res.ancientGeneAmber.cap <= 0) {
    state.res.ancientGeneAmber.cap = 9999;
  }
  return state.res.ancientGeneAmber;
}

export function ensureAmberRevivalState(state) {
  if (!state || typeof state !== "object") return null;
  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  ensureAncientAmberBucket(state);
  const raw = state.meta.amberRevival && typeof state.meta.amberRevival === "object" ? state.meta.amberRevival : {};

  const monList = Array.isArray(state?.mons?.list) ? state.mons.list : null;
  const validMonSet = monList
    ? new Set(
        monList
          .filter((m) => m && typeof m.id === "number" && Number.isFinite(m.id) && m.id > 0)
          .map((m) => Math.floor(m.id)),
      )
    : null;

  const imprints = {};
  const usedEquipMons = new Set();
  const rawImprints = raw.imprints && typeof raw.imprints === "object" ? raw.imprints : {};
  for (const def of PRIMAL_IMPRINT_DEFS) {
    const entry = rawImprints[def.id] && typeof rawImprints[def.id] === "object" ? rawImprints[def.id] : {};
    const level = Math.max(0, Math.min(AMBER_IMPRINT_MAX_LEVEL, Math.floor(Number(entry.level) || 0)));
    let equippedMonId =
      level > 0 && typeof entry.equippedMonId === "number" && Number.isFinite(entry.equippedMonId) && entry.equippedMonId > 0
        ? Math.floor(entry.equippedMonId)
        : null;
    if (equippedMonId !== null) {
      if ((validMonSet && !validMonSet.has(equippedMonId)) || usedEquipMons.has(equippedMonId)) {
        equippedMonId = null;
      } else {
        usedEquipMons.add(equippedMonId);
      }
    }
    imprints[def.id] = { level, equippedMonId };
  }

  const selectedMonId =
    typeof raw.selectedMonId === "number" &&
    Number.isFinite(raw.selectedMonId) &&
    raw.selectedMonId > 0 &&
    (!validMonSet || validMonSet.has(Math.floor(raw.selectedMonId)))
      ? Math.floor(raw.selectedMonId)
      : monList && monList[0]?.id
        ? Math.floor(monList[0].id)
        : null;

  const recentLogs = Array.isArray(raw.recentLogs)
    ? raw.recentLogs.filter((s) => typeof s === "string" && s.trim().length > 0).slice(0, 6)
    : [];

  const clean = {
    initialized: true,
    imprints,
    selectedMonId,
    dailyClaimDate: typeof raw.dailyClaimDate === "string" ? raw.dailyClaimDate : "",
    totalAwakenings: Math.max(0, Math.floor(Number(raw.totalAwakenings) || 0)),
    totalSyntheses: Math.max(0, Math.floor(Number(raw.totalSyntheses) || 0)),
    totalIvRefinements: Math.max(0, Math.floor(Number(raw.totalIvRefinements) || 0)),
    recentLogs,
  };

  if (state.meta.amberRevival && typeof state.meta.amberRevival === "object") {
    Object.assign(state.meta.amberRevival, clean);
    return state.meta.amberRevival;
  }
  state.meta.amberRevival = clean;
  return clean;
}

export function canClaimDailyAncientAmber(state, nowMs = Date.now()) {
  const lab = ensureAmberRevivalState(state);
  if (!lab) return false;
  const today = localYmdForSandbox(nowMs);
  return lab.dailyClaimDate !== today;
}

export function claimDailyAncientAmber(state, opts = {}) {
  const lab = ensureAmberRevivalState(state);
  if (!lab) return { ok: false, reason: "invalid_state" };
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const today = localYmdForSandbox(nowMs);
  if (lab.dailyClaimDate === today) {
    return { ok: false, reason: "already_claimed_today" };
  }
  lab.dailyClaimDate = today;
  const bucket = ensureAncientAmberBucket(state);
  const gain = AMBER_REVIVAL_DAILY_GRANT;
  bucket.value = Math.min(bucket.cap || 9999, Math.max(0, (bucket.value || 0) + gain));
  const logLine = `【地脉掘珀】每日免费勘探掘得「远古基因琥珀 ×${gain}」，可立即鉴定苏醒太古血脉印记！`;
  lab.recentLogs = [logLine, ...(lab.recentLogs || [])].slice(0, 6);
  return { ok: true, gained: gain, totalAmber: bucket.value, logLine };
}

export function canSynthesizeAncientAmber(state, method = "eco") {
  const recipe = AMBER_SYNTH_RECIPES[method];
  if (!state || !recipe) return false;
  for (const [rid, need] of Object.entries(recipe.costRes || {})) {
    const have = Number(state?.res?.[rid]?.value) || 0;
    if (have < need) return false;
  }
  return true;
}

export function synthesizeAncientAmber(state, method = "eco") {
  const lab = ensureAmberRevivalState(state);
  const recipe = AMBER_SYNTH_RECIPES[method];
  if (!lab || !recipe) return { ok: false, reason: "unknown_method" };
  if (!canSynthesizeAncientAmber(state, method)) {
    return { ok: false, reason: "insufficient_cost" };
  }
  for (const [rid, need] of Object.entries(recipe.costRes || {})) {
    state.res[rid].value = Math.max(0, (Number(state.res[rid].value) || 0) - need);
  }
  const bucket = ensureAncientAmberBucket(state);
  bucket.value = Math.min(bucket.cap || 9999, Math.max(0, (bucket.value || 0) + recipe.amberGain));
  lab.totalSyntheses = (lab.totalSyntheses || 0) + 1;
  const logLine = `【${recipe.name}】凝珀成功，获得「远古基因琥珀 ×${recipe.amberGain}」（当前琥珀库存 ${Math.floor(bucket.value)}）`;
  lab.recentLogs = [logLine, ...(lab.recentLogs || [])].slice(0, 6);
  return { ok: true, method: recipe.id, gained: recipe.amberGain, totalAmber: bucket.value, logLine };
}

export function getPrimalImprintNextCost(state, imprintId) {
  const def = getPrimalImprintDef(imprintId);
  if (!def) return null;
  const curLvl = Math.max(
    0,
    Math.min(AMBER_IMPRINT_MAX_LEVEL, Math.floor(Number(state?.meta?.amberRevival?.imprints?.[imprintId]?.level) || 0)),
  );
  if (curLvl >= AMBER_IMPRINT_MAX_LEVEL) return null;
  return def.costsByLevel[curLvl + 1] || null;
}

export function canAwakenOrUpgradeImprint(state, imprintId) {
  const cost = getPrimalImprintNextCost(state, imprintId);
  if (!state || !cost) return false;
  for (const [rid, need] of Object.entries(cost.res || {})) {
    const have = Number(state?.res?.[rid]?.value) || 0;
    if (have < need) return false;
  }
  return true;
}

export function awakenOrUpgradePrimalImprint(state, imprintId, opts = {}) {
  const lab = ensureAmberRevivalState(state);
  const def = getPrimalImprintDef(imprintId);
  if (!lab || !def) return { ok: false, reason: "unknown_imprint" };
  const entry = lab.imprints[def.id];
  if (entry.level >= AMBER_IMPRINT_MAX_LEVEL) {
    return { ok: false, reason: "max_level" };
  }
  const nextLvl = entry.level + 1;
  const cost = def.costsByLevel[nextLvl];
  if (!canAwakenOrUpgradeImprint(state, imprintId)) {
    return { ok: false, reason: "insufficient_materials" };
  }
  for (const [rid, need] of Object.entries(cost.res || {})) {
    state.res[rid].value = Math.max(0, (Number(state.res[rid].value) || 0) - need);
  }
  entry.level = nextLvl;
  lab.totalAwakenings = (lab.totalAwakenings || 0) + 1;

  let autoEquippedMonId = null;
  if (nextLvl === 1 && opts.autoEquip !== false) {
    const prefId = opts.equipMonId != null ? Number(opts.equipMonId) : lab.selectedMonId;
    const list = Array.isArray(state?.mons?.list) ? state.mons.list.filter(Boolean) : [];
    const targetMon =
      list.find((m) => m.id === prefId && !Object.values(lab.imprints).some((a) => a.equippedMonId === m.id)) ||
      list.find((m) => !Object.values(lab.imprints).some((a) => a.equippedMonId === m.id)) ||
      null;
    if (targetMon) {
      entry.equippedMonId = targetMon.id;
      autoEquippedMonId = targetMon.id;
    }
  }

  const actionWord = nextLvl === 1 ? "鉴定苏醒" : `基因升阶至 Lv.${nextLvl}`;
  const equipSuffix = autoEquippedMonId ? "，已自动共鸣刻印至伙伴并开启太古血脉防放生保护" : "";
  const logLine = `【琥珀复苏所】「${def.name}」${actionWord}${equipSuffix}！`;
  lab.recentLogs = [logLine, ...(lab.recentLogs || [])].slice(0, 6);

  return {
    ok: true,
    imprintId: def.id,
    imprintName: def.name,
    level: nextLvl,
    equippedMonId: entry.equippedMonId,
    logLine,
  };
}

export function equipPrimalImprint(state, imprintId, monId) {
  const lab = ensureAmberRevivalState(state);
  const def = getPrimalImprintDef(imprintId);
  if (!lab || !def) return { ok: false, reason: "unknown_imprint" };
  const entry = lab.imprints[def.id];
  if (!entry || entry.level <= 0) return { ok: false, reason: "not_awakened" };

  if (monId == null) {
    entry.equippedMonId = null;
    return { ok: true, imprintId: def.id, equippedMonId: null };
  }

  const id = Math.floor(Number(monId));
  const list = Array.isArray(state?.mons?.list) ? state.mons.list : [];
  const mon = list.find((m) => m && m.id === id);
  if (!mon) return { ok: false, reason: "invalid_mon" };

  for (const [otherId, otherEntry] of Object.entries(lab.imprints)) {
    if (otherId !== def.id && otherEntry.equippedMonId === id) {
      otherEntry.equippedMonId = null;
    }
  }
  entry.equippedMonId = id;
  lab.selectedMonId = id;
  const logLine = `【太古刻印】${mon.name || "伙伴"} 共鸣承载了「${def.name} Lv.${entry.level}」（太古印记保护生效）`;
  lab.recentLogs = [logLine, ...(lab.recentLogs || [])].slice(0, 6);
  return { ok: true, imprintId: def.id, equippedMonId: id, level: entry.level, logLine };
}

export function unequipPrimalImprint(state, imprintId) {
  return equipPrimalImprint(state, imprintId, null);
}

export function unequipMonPrimalImprints(state, monId) {
  const lab = ensureAmberRevivalState(state);
  if (!lab) return { ok: false, returnedImprints: [] };
  const id = Math.floor(Number(monId) || 0);
  const returnedImprints = [];
  for (const [impId, entry] of Object.entries(lab.imprints)) {
    if (entry.equippedMonId === id) {
      entry.equippedMonId = null;
      returnedImprints.push(impId);
    }
  }
  return { ok: true, returnedImprints };
}

/** Non-mutating read of all valid partner IDs currently imprinted with a Prehistoric Bloodline Imprint (protected in busyMonIds). */
export function getAmberImprintedMonIds(state) {
  const ids = new Set();
  const raw = state?.meta?.amberRevival;
  if (!raw || typeof raw !== "object") return ids;
  const monList = Array.isArray(state?.mons?.list) ? state.mons.list : null;
  const validSet = monList
    ? new Set(monList.filter((m) => m && typeof m.id === "number").map((m) => Math.floor(m.id)))
    : null;

  const rawImprints = raw.imprints && typeof raw.imprints === "object" ? raw.imprints : {};
  for (const def of PRIMAL_IMPRINT_DEFS) {
    const entry = rawImprints[def.id];
    const lvl = Math.floor(Number(entry?.level) || 0);
    const mid = Math.floor(Number(entry?.equippedMonId) || 0);
    if (lvl > 0 && mid > 0 && (!validSet || validSet.has(mid))) {
      ids.add(mid);
    }
  }
  return ids;
}

export function getMonPrimalImprintBonus(state, monId) {
  const id = Math.floor(Number(monId) || 0);
  const raw = state?.meta?.amberRevival;
  if (!raw || typeof raw !== "object" || id <= 0) {
    return {
      imprinted: false,
      imprintId: null,
      imprintName: null,
      imprintIcon: null,
      imprintLevel: 0,
      combatAdd: 0,
      combatMul: 1,
      ivTrainAdd: 0,
      ivTrainMul: 1,
      prodAdd: 0,
      catchAdd: 0,
      shinyAdd: 0,
    };
  }
  const rawImprints = raw.imprints && typeof raw.imprints === "object" ? raw.imprints : {};
  let impDef = null;
  let impLvl = 0;
  for (const def of PRIMAL_IMPRINT_DEFS) {
    const entry = rawImprints[def.id];
    const lvl = Math.max(0, Math.min(AMBER_IMPRINT_MAX_LEVEL, Math.floor(Number(entry?.level) || 0)));
    if (lvl > 0 && Math.floor(Number(entry?.equippedMonId) || 0) === id) {
      impDef = def;
      impLvl = lvl;
      break;
    }
  }
  if (!impDef) {
    return {
      imprinted: false,
      imprintId: null,
      imprintName: null,
      imprintIcon: null,
      imprintLevel: 0,
      combatAdd: 0,
      combatMul: 1,
      ivTrainAdd: 0,
      ivTrainMul: 1,
      prodAdd: 0,
      catchAdd: 0,
      shinyAdd: 0,
    };
  }
  const b = impDef.bonusesByLevel[impLvl] || {};
  const round4 = (n) => Math.round(n * 10000) / 10000;
  const combatAdd = round4(b.combatAdd || 0);
  const ivTrainAdd = round4(b.ivTrainAdd || 0);
  return {
    imprinted: true,
    imprintId: impDef.id,
    imprintName: impDef.name,
    imprintIcon: impDef.icon,
    imprintLevel: impLvl,
    combatAdd,
    combatMul: round4(1 + combatAdd),
    ivTrainAdd,
    ivTrainMul: round4(1 + ivTrainAdd),
    prodAdd: round4(b.prodAdd || 0),
    catchAdd: round4(b.catchAdd || 0),
    shinyAdd: round4(b.shinyAdd || 0),
  };
}

/** Pure non-mutating aggregator for global Amber Gene Revival bonuses across production, IV training, capture rate, shiny odds & PvE combat. */
export function computeAmberRevivalAura(state) {
  const raw = state?.meta?.amberRevival;
  if (!raw || typeof raw !== "object") {
    return {
      awakenedCount: 0,
      totalLevels: 0,
      maxTotalLevels: PRIMAL_IMPRINT_DEFS.length * AMBER_IMPRINT_MAX_LEVEL,
      equippedCount: 0,
      imprintedMonCount: 0,
      quadResonanceActive: false,
      prodAdd: 0,
      prodMul: 1,
      ivTrainAdd: 0,
      ivTrainMul: 1,
      catchAdd: 0,
      shinyAdd: 0,
      shinyChanceMul: 1,
      combatAdd: 0,
      combatMul: 1,
      equippedSummary: [],
    };
  }

  const monList = Array.isArray(state?.mons?.list) ? state.mons.list : null;
  const monMap = new Map();
  if (monList) {
    for (const m of monList) {
      if (m && typeof m.id === "number") monMap.set(Math.floor(m.id), m);
    }
  }

  let awakenedCount = 0;
  let totalLevels = 0;
  let equippedCount = 0;
  let prodAdd = 0;
  let ivTrainAdd = 0;
  let catchAdd = 0;
  let shinyAdd = 0;
  let combatAdd = 0;
  const equippedSummary = [];

  const rawImprints = raw.imprints && typeof raw.imprints === "object" ? raw.imprints : {};
  for (const def of PRIMAL_IMPRINT_DEFS) {
    const entry = rawImprints[def.id];
    const lvl = Math.max(0, Math.min(AMBER_IMPRINT_MAX_LEVEL, Math.floor(Number(entry?.level) || 0)));
    if (lvl <= 0) continue;
    awakenedCount += 1;
    totalLevels += lvl;
    const b = def.bonusesByLevel[lvl] || {};
    const mid = Math.floor(Number(entry?.equippedMonId) || 0);
    const wornByValidMon = mid > 0 && (!monList || monMap.has(mid));
    const factor = wornByValidMon ? 1 : 0.45;
    if (wornByValidMon) {
      equippedCount += 1;
      const mon = monMap.get(mid);
      equippedSummary.push({
        imprintId: def.id,
        imprintName: def.name,
        icon: def.icon,
        level: lvl,
        monId: mid,
        monName: mon?.name || `#${mid}`,
      });
    }
    prodAdd += (b.prodAdd || 0) * factor;
    ivTrainAdd += (b.ivTrainAdd || 0) * factor;
    catchAdd += (b.catchAdd || 0) * factor;
    shinyAdd += (b.shinyAdd || 0) * factor;
    combatAdd += (b.combatAdd || 0) * (wornByValidMon ? 0.55 : 0.25);
  }

  // 「四太古血脉苏醒共鸣」: activates when all 4 Prehistoric Bloodline Imprints are awakened (with extra synergy when equipped)
  const quadResonanceActive = awakenedCount >= PRIMAL_IMPRINT_DEFS.length;
  if (quadResonanceActive) {
    const equipRatio = equippedCount >= 4 ? 1 : 0.6 + equippedCount * 0.1;
    prodAdd += 0.08 * equipRatio;
    ivTrainAdd += 0.25 * equipRatio;
    catchAdd += 0.015 * equipRatio;
    shinyAdd += 0.16 * equipRatio;
    combatAdd += 0.10 * equipRatio;
  }

  const imprintedMonCount = getAmberImprintedMonIds(state).size;
  const round4 = (n) => Math.round(n * 10000) / 10000;
  prodAdd = round4(Math.min(0.75, prodAdd));
  ivTrainAdd = round4(Math.min(1.85, ivTrainAdd));
  catchAdd = round4(Math.min(0.085, catchAdd));
  shinyAdd = round4(Math.min(0.95, shinyAdd));
  combatAdd = round4(Math.min(0.68, combatAdd));

  return {
    awakenedCount,
    totalLevels,
    maxTotalLevels: PRIMAL_IMPRINT_DEFS.length * AMBER_IMPRINT_MAX_LEVEL,
    equippedCount,
    imprintedMonCount,
    quadResonanceActive,
    prodAdd,
    prodMul: round4(1 + prodAdd),
    ivTrainAdd,
    ivTrainMul: round4(1 + ivTrainAdd),
    catchAdd,
    shinyAdd,
    shinyChanceMul: round4(1 + shinyAdd),
    combatAdd,
    combatMul: round4(1 + combatAdd),
    equippedSummary,
  };
}

export function canRefinePartnerIvWithAmber(state, monId = null, statKey = "lowest") {
  if (!state || typeof state !== "object") return false;
  const haveAmber = Number(state?.res?.ancientGeneAmber?.value) || 0;
  if (haveAmber < AMBER_IV_REFINE_COST) return false;
  const list = Array.isArray(state?.mons?.list) ? state.mons.list : [];
  const targetId = monId != null ? Math.floor(Number(monId)) : Math.floor(Number(state?.meta?.amberRevival?.selectedMonId) || 0);
  const mon = list.find((m) => m && m.id === targetId) || list[0] || null;
  if (!mon) return false;
  const iv = mon.iv && typeof mon.iv === "object" ? mon.iv : {};
  if (AMBER_IV_STAT_KEYS.includes(statKey)) {
    return (Number(iv[statKey]) || 0) < 31;
  }
  return AMBER_IV_STAT_KEYS.some((k) => (Number(iv[k]) || 0) < 31);
}

/** Spends 2 ancientGeneAmber to directly refine & boost a partner's IVs, scaled by Prehistoric Bloodline Imprint IV-training bonus. */
export function refinePartnerIvWithAmber(state, monId = null, statKey = "lowest") {
  const lab = ensureAmberRevivalState(state);
  if (!lab) return { ok: false, reason: "invalid_state" };
  const bucket = ensureAncientAmberBucket(state);
  if ((bucket?.value || 0) < AMBER_IV_REFINE_COST) {
    return { ok: false, reason: "insufficient_amber" };
  }
  const list = Array.isArray(state?.mons?.list) ? state.mons.list : [];
  const targetId = monId != null ? Math.floor(Number(monId)) : lab.selectedMonId;
  const mon = list.find((m) => m && m.id === targetId) || list[0] || null;
  if (!mon) return { ok: false, reason: "invalid_mon" };
  if (!mon.iv || typeof mon.iv !== "object") {
    mon.iv = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
  }

  let chosenKey = AMBER_IV_STAT_KEYS.includes(statKey) ? statKey : null;
  if (!chosenKey || (Number(mon.iv[chosenKey]) || 0) >= 31) {
    let minVal = 31;
    chosenKey = null;
    for (const k of AMBER_IV_STAT_KEYS) {
      const v = Math.max(0, Math.min(31, Math.floor(Number(mon.iv[k]) || 0)));
      if (v < minVal) {
        minVal = v;
        chosenKey = k;
      }
    }
  }
  if (!chosenKey) {
    return { ok: false, reason: "all_iv_maxed" };
  }

  bucket.value = Math.max(0, (bucket.value || 0) - AMBER_IV_REFINE_COST);
  const aura = computeAmberRevivalAura(state);
  const personal = getMonPrimalImprintBonus(state, mon.id);
  const effIvMul = aura.ivTrainMul * (personal.imprinted ? 1 + personal.ivTrainAdd * 0.5 : 1);
  const gain = 2 + (effIvMul >= 1.35 ? 1 : 0) + (aura.quadResonanceActive ? 1 : 0);

  const beforeIv = Math.max(0, Math.min(31, Math.floor(Number(mon.iv[chosenKey]) || 0)));
  const afterIv = Math.min(31, beforeIv + gain);
  mon.iv[chosenKey] = afterIv;
  lab.selectedMonId = mon.id;
  lab.totalIvRefinements = (lab.totalIvRefinements || 0) + 1;

  const totalIv = AMBER_IV_STAT_KEYS.reduce((s, k) => s + Math.max(0, Math.min(31, Math.floor(Number(mon.iv[k]) || 0))), 0);
  const logLine = `【基因潜能淬炼】${mon.name || "伙伴"} 的${AMBER_IV_STAT_ZH[chosenKey] || chosenKey}个体值提升 +${afterIv - beforeIv}（${beforeIv} → ${afterIv}，总个体 ${totalIv}/186）！`;
  lab.recentLogs = [logLine, ...(lab.recentLogs || [])].slice(0, 6);

  return {
    ok: true,
    monId: mon.id,
    statKey: chosenKey,
    beforeIv,
    afterIv,
    delta: afterIv - beforeIv,
    totalIv,
    remainingAmber: bucket.value,
    logLine,
  };
}

/** Advances passive IV breakthrough progress on actively training partners when Amber Revival aura is active. */
export function advanceAmberIvTraining(state, mon, dtSec = 1, extraIvMul = 1) {
  if (!state || !mon || typeof mon !== "object" || !(dtSec > 0)) return { upgraded: false };
  const aura = computeAmberRevivalAura(state);
  const personal = getMonPrimalImprintBonus(state, mon.id);
  if (aura.awakenedCount <= 0 && !personal.imprinted && !(extraIvMul > 1)) {
    return { upgraded: false };
  }
  if (!mon.iv || typeof mon.iv !== "object") return { upgraded: false };
  const speedMul = aura.ivTrainMul * (personal.imprinted ? personal.ivTrainMul : 1) * Math.max(1, Number(extraIvMul) || 1);
  const prevCarry = typeof mon.ivTrainCarry === "number" && Number.isFinite(mon.ivTrainCarry) ? Math.max(0, mon.ivTrainCarry) : 0;
  const thresholdSec = 90;
  let carry = prevCarry + dtSec * speedMul;
  let upgraded = false;
  let statUpgraded = null;
  while (carry >= thresholdSec) {
    let lowestKey = null;
    let lowestVal = 31;
    for (const k of AMBER_IV_STAT_KEYS) {
      const v = Math.max(0, Math.min(31, Math.floor(Number(mon.iv[k]) || 0)));
      if (v < lowestVal) {
        lowestVal = v;
        lowestKey = k;
      }
    }
    if (!lowestKey) {
      carry = 0;
      break;
    }
    carry -= thresholdSec;
    mon.iv[lowestKey] = Math.min(31, lowestVal + 1);
    upgraded = true;
    statUpgraded = lowestKey;
  }
  mon.ivTrainCarry = Math.round(carry * 1000) / 1000;
  return { upgraded, statKey: statUpgraded };
}



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

function addResDirect(state, rid, amt, opts = {}) {
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
// ML-14 统一忙碌排除（单一登记表）
// 所有「人不在家」的外出 / 驻场类玩法都在 AWAY_ACTIVITY_REGISTRY 登记一次：心愿码头出海、月光观察站派驻、浮空岛建造、
// 寻宝远航、温泉泡汤、邮局送信、梦境绘本馆入梦、溪畔钓鱼会垂钓，ML-15 的云朵甜点烘焙坊上岗、彩虹气球旅行，
// 以及 ML-16 的云端游乐园值班、星空露营观测夜营，ML-17 的冰晶溜冰场排练、花田蜜蜂工坊照料。
// getAwayMonIds() 是唯一来源：放生锁 busyMonIds、其他玩法的空闲候选（getNonSandboxBusyIds）、星营 / 杂技 / 乐队不可用名单、
// 升星材料过滤、放生拦截文案，以及三系冠军赛 / 冠军联盟 / 星轨回廊的自动编队 / 手动编入 / 参赛、训练选人、远征选人都只读这一份名单。
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
function listIdleOutingMons(state) {
  const list = Array.isArray(state?.mons?.list) ? state.mons.list.filter(Boolean) : [];
  const extBusy = getNonSandboxBusyIds(state);
  const ecoBusy = getEcoSandboxBusyIds(state);
  return list.filter((m) => m && typeof m.id === "number" && !extBusy.has(m.id) && !ecoBusy.has(m.id));
}

// ---------------------------------------------------------------------------
// ML-16「一键收取已归来伙伴」：只读汇总。每个 returned 读取器返回该玩法里「已归来 / 已降落 / 已完成但还没收取」的单位，
// 每个单位带 { key, ref, monIds, text }：ref 交给该玩法自己的收取函数（码头 routeId / 邮局 routeId / 气球 idx / 夜营 idx / 远航 reason）。
// ---------------------------------------------------------------------------

function awayAliveIdSet(state) {
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

// ============================================================================
// ML-15 「云朵甜点烘焙坊」(Cloud Dessert Bakery)
// 三个工位按属性分工：揉面台（水 / 草 / 岩）→ 云朵烤炉（火 / 电 / 光）→ 装饰台（风 / 暗 / 幻），每个工位 1 位伙伴。
// 一炉甜点依次经过揉面 → 烘烤 → 装饰三道工序，每道工序的工时由该工位的伙伴完成：
// 工位速度 = 1 工时/分 × 1.5（属性契合）×（1 + 亲密 / 200）；工位空着时由其他上岗伙伴临时帮忙（0.4 工时/分），一个人都没有就停工。
// 出炉品质：契合的工位数 0 → ★1，1~2 → ★2，3 → ★3（品质决定「享用」增益时长 ×1 / ×1.25 / ×1.5 与装盒奖励 ×星数）。
// 出炉的甜点放进甜点柜（最多 12 份，满了就停工），第一次出炉即收录进「甜点食谱图鉴」（记录出炉次数与最佳品质）。
// 8 份食谱：前 2 份开局可做，其余按已收录食谱数 1 / 2 / 3 / 4 / 5 / 6 份依次解锁。
// 「享用」一份甜点点亮对应的限时增益（甜香满屋 全产 +8% / 轻盈脚步 捕获 +1.2% / 糖霜闪闪 闪光 +10% / 元气满满 PvE 增伤 +6%），
// 时长可叠加、单项最多 6 小时；「装盒送出」把甜点柜里的甜点换成灵果与未来币。
// 永久：每收录一份食谱 全产 +0.25%，每份 ★3 完美食谱 PvE 增伤 +0.5%。每日一次免费「加急出炉」（之后 20 未来币）立刻做好当前这一炉。
// 上岗伙伴经由上方统一登记表接入防放生锁 / 训练 / 远征 / 冠军赛排除；离线补算 ≤12h（按工序时间顺序结算）；
// 强制放生 / 转生让伙伴下班，食谱图鉴、甜点柜与限时增益保留。
// ============================================================================

export const BAKERY_STATIONS = Object.freeze(
  [
    { id: "knead", name: "揉面台", verb: "揉面", elements: ["water", "grass", "stone"], desc: "水润、草香和岩石般的好臂力，把面团揉得又软又弹。" },
    { id: "bake", name: "云朵烤炉", verb: "烘烤", elements: ["fire", "electric", "light"], desc: "火候、电流与暖光一起照看炉子，烤得金黄蓬松。" },
    { id: "decorate", name: "装饰台", verb: "装饰", elements: ["wind", "dark", "mystic"], desc: "轻风打奶油、影子描花边、幻光点糖霜。" },
  ].map((s) => Object.freeze({ ...s, elements: Object.freeze(s.elements.slice()) })),
);
export const BAKERY_STATION_IDS = Object.freeze(BAKERY_STATIONS.map((s) => s.id));
export const BAKERY_MAX_WORKERS = BAKERY_STATIONS.length;
export const BAKERY_WORK_PER_MIN = 1;
export const BAKERY_MATCH_MUL = 1.5;
export const BAKERY_HELPER_PER_MIN = 0.4;
export const BAKERY_CASE_CAP = 12;
export const BAKERY_MAX_CATCHUP_SEC = 12 * 3600;
export const BAKERY_BUFF_MAX_SEC = 6 * 3600;
export const BAKERY_RUSH_FREE_PER_DAY = 1;
export const BAKERY_RUSH_COIN_COST = 20;
export const BAKERY_RECIPE_PROD_ADD = 0.0025;
export const BAKERY_PERFECT_PVE_ADD = 0.005;
export const BAKERY_EXP_PER_BATCH = 30;
export const BAKERY_LOG_KEEP = 6;
/** Buff duration / box reward multiplier by quality stars (index = stars). */
export const BAKERY_QUALITY_MUL = Object.freeze([1, 1, 1.25, 1.5]);

/** 4 timed buffs a dessert can light up when 「享用」. */
export const BAKERY_BUFF_DEFS = Object.freeze(
  [
    { id: "prod", name: "甜香满屋", value: 0.08, effectText: "全产 +8%" },
    { id: "catch", name: "轻盈脚步", value: 0.012, effectText: "捕获 +1.2%" },
    { id: "shiny", name: "糖霜闪闪", value: 0.1, effectText: "闪光 +10%" },
    { id: "pveOut", name: "元气满满", value: 0.06, effectText: "PvE 增伤 +6%" },
  ].map((b) => Object.freeze(b)),
);

/** 8 recipes: work = 工时 per station (at 1 工时/分), buffMin = base buff minutes when 「享用」. */
export const BAKERY_RECIPE_DEFS = Object.freeze(
  [
    { id: "cloudPuff", name: "云朵奶油泡芙", tier: 1, unlockRecipes: 0, buffId: "prod", buffMin: 30, work: { knead: 8, bake: 12, decorate: 10 }, desc: "一口咬下去像咬到一朵云，奶油会从指缝里偷偷溜走。" },
    { id: "lavaCocoa", name: "熔岩可可小蛋糕", tier: 1, unlockRecipes: 0, buffId: "pveOut", buffMin: 30, work: { knead: 10, bake: 16, decorate: 6 }, desc: "切开时热可可像小火山一样涌出来，吃完浑身是劲。" },
    { id: "dewJelly", name: "晨露果冻杯", tier: 1, unlockRecipes: 1, buffId: "catch", buffMin: 30, work: { knead: 12, bake: 6, decorate: 12 }, desc: "用清晨的露水凝成的果冻，晃一晃会叮叮作响。" },
    { id: "starMacaron", name: "星糖马卡龙", tier: 1, unlockRecipes: 2, buffId: "shiny", buffMin: 30, work: { knead: 10, bake: 10, decorate: 16 }, desc: "撒满星星糖霜的小圆饼，夜里会微微发亮。" },
    { id: "rainbowRoll", name: "彩虹云朵卷", tier: 2, unlockRecipes: 3, buffId: "prod", buffMin: 45, work: { knead: 14, bake: 16, decorate: 16 }, desc: "七种颜色的蛋糕卷成一圈，像把彩虹收进了盘子。" },
    { id: "thunderCrisp", name: "雷莓脆脆饼", tier: 2, unlockRecipes: 4, buffId: "pveOut", buffMin: 45, work: { knead: 12, bake: 18, decorate: 12 }, desc: "咬下去噼啪作响，酸酸甜甜的莓果在舌尖上放小烟花。" },
    { id: "moonMochi", name: "月光团子", tier: 2, unlockRecipes: 5, buffId: "catch", buffMin: 45, work: { knead: 16, bake: 10, decorate: 16 }, desc: "软糯的团子裹着月光色的糖粉，捧在手里轻飘飘的。" },
    { id: "galaxyTart", name: "银河流星挞", tier: 2, unlockRecipes: 6, buffId: "shiny", buffMin: 60, work: { knead: 16, bake: 20, decorate: 20 }, desc: "烘焙坊的招牌：挞皮里铺满星河，偶尔还会划过一颗流星。" },
  ].map((r) => Object.freeze({ ...r, work: Object.freeze({ ...r.work }) })),
);
export const BAKERY_TOTAL_RECIPES = BAKERY_RECIPE_DEFS.length;

export const BAKERY_RES_ZH = Object.freeze({ catnip: "灵果", futurecoin: "未来币" });

const BAKERY_TITLES = Object.freeze([
  { minBatches: 120, name: "烘焙坊主厨" },
  { minBatches: 40, name: "云朵糕点师" },
  { minBatches: 10, name: "甜点师" },
  { minBatches: 0, name: "云朵学徒" },
]);

export function getBakeryStationDef(stationId) {
  return BAKERY_STATIONS.find((s) => s.id === stationId) || null;
}

export function getBakeryRecipeDef(recipeId) {
  return BAKERY_RECIPE_DEFS.find((r) => r.id === recipeId) || null;
}

export function getBakeryBuffDef(buffId) {
  return BAKERY_BUFF_DEFS.find((b) => b.id === buffId) || null;
}

export function getBakeryTitle(totalBatches = 0) {
  const n = Math.max(0, Math.floor(Number(totalBatches) || 0));
  return (BAKERY_TITLES.find((t) => n >= t.minBatches) || BAKERY_TITLES[BAKERY_TITLES.length - 1]).name;
}

/** Total 工时 of one batch of a recipe (all three stations). */
export function getBakeryRecipeWork(recipeId) {
  const r = getBakeryRecipeDef(recipeId);
  if (!r) return 0;
  return BAKERY_STATION_IDS.reduce((s, sid) => s + (r.work[sid] || 0), 0);
}

/** Box rewards of one dessert: 灵果 25 × 星数 + 未来币（食谱阶 × 星数）. */
export function getBakeryDessertRewards(recipeId, stars = 1) {
  const r = getBakeryRecipeDef(recipeId);
  const q = Math.max(1, Math.min(3, Math.floor(Number(stars) || 1)));
  if (!r) return {};
  return { catnip: 25 * q, futurecoin: r.tier * q };
}

/** Stars from the number of element-matched stations: 0 → ★1, 1~2 → ★2, 3 → ★3. */
export function getBakeryQualityFromMatches(matchedStations = 0) {
  const n = Math.max(0, Math.floor(Number(matchedStations) || 0));
  return 1 + (n >= 1 ? 1 : 0) + (n >= BAKERY_MAX_WORKERS ? 1 : 0);
}

function bakeryRecipesOf(state) {
  const r = state?.meta?.cloudBakery?.recipes;
  return r && typeof r === "object" ? r : {};
}

/** Non-mutating: recipes collected in the recipe book (baked at least once). */
export function getBakeryCollectedCount(state) {
  const recipes = bakeryRecipesOf(state);
  return BAKERY_RECIPE_DEFS.filter((r) => (Number(recipes[r.id]?.baked) || 0) > 0).length;
}

export function isBakeryRecipeUnlocked(state, recipeId) {
  const def = getBakeryRecipeDef(recipeId);
  if (!def) return false;
  return getBakeryCollectedCount(state) >= def.unlockRecipes;
}

function normalizeBakeryDessert(raw) {
  if (!raw || typeof raw !== "object") return null;
  const r = getBakeryRecipeDef(raw.recipeId);
  if (!r) return null;
  return { recipeId: r.id, q: Math.max(1, Math.min(3, Math.floor(Number(raw.q) || 1))) };
}

export function ensureBakeryState(state) {
  if (!state || typeof state !== "object") return null;
  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  const raw = state.meta.cloudBakery && typeof state.meta.cloudBakery === "object" ? state.meta.cloudBakery : {};
  const monList = Array.isArray(state?.mons?.list) ? state.mons.list : null;
  const aliveSet = monList
    ? new Set(
        monList
          .map((m) => (m && typeof m.id === "number" && Number.isFinite(m.id) ? Math.floor(m.id) : null))
          .filter((x) => x !== null && x > 0),
      )
    : null;
  const rawWorkers = raw.workers && typeof raw.workers === "object" ? raw.workers : {};
  const workers = {};
  const used = new Set();
  for (const st of BAKERY_STATIONS) {
    const id = Math.floor(Number(rawWorkers[st.id]) || 0);
    if (id > 0 && !used.has(id) && (!aliveSet || aliveSet.has(id))) {
      workers[st.id] = id;
      used.add(id);
    } else {
      workers[st.id] = 0;
    }
  }
  const rawRecipes = raw.recipes && typeof raw.recipes === "object" ? raw.recipes : {};
  const recipes = {};
  for (const r of BAKERY_RECIPE_DEFS) {
    const e = rawRecipes[r.id];
    if (!e || typeof e !== "object") continue;
    const baked = Math.max(0, Math.min(999999, Math.floor(Number(e.baked) || 0)));
    if (baked <= 0) continue;
    recipes[r.id] = { baked, bestQ: Math.max(1, Math.min(3, Math.floor(Number(e.bestQ) || 1))) };
  }
  const collected = Object.keys(recipes).length;
  const recipeDef = getBakeryRecipeDef(raw.recipeId);
  const recipeId = recipeDef && collected >= recipeDef.unlockRecipes ? recipeDef.id : BAKERY_RECIPE_DEFS[0].id;
  const recipe = getBakeryRecipeDef(recipeId);
  const rb = raw.batch && typeof raw.batch === "object" ? raw.batch : {};
  const stageIdx = Math.max(0, Math.min(BAKERY_STATIONS.length - 1, Math.floor(Number(rb.stageIdx) || 0)));
  const stageNeed = recipe.work[BAKERY_STATION_IDS[stageIdx]];
  const work0 = Number(rb.work);
  const batch = { stageIdx, work: Number.isFinite(work0) && work0 > 0 ? Math.min(stageNeed - 0.001, work0) : 0 };
  const showcase = (Array.isArray(raw.showcase) ? raw.showcase : []).map(normalizeBakeryDessert).filter(Boolean).slice(0, BAKERY_CASE_CAP);
  const rawBuffs = raw.buffs && typeof raw.buffs === "object" ? raw.buffs : {};
  const buffs = {};
  for (const b of BAKERY_BUFF_DEFS) {
    const n = Number(rawBuffs[b.id]);
    buffs[b.id] = Number.isFinite(n) && n > 0 ? Math.min(BAKERY_BUFF_MAX_SEC, n) : 0;
  }
  const lb = raw.lastBatch && typeof raw.lastBatch === "object" ? raw.lastBatch : null;
  const lbRecipe = lb ? getBakeryRecipeDef(lb.recipeId) : null;
  const lastBatch = lbRecipe
    ? {
        recipeId: lbRecipe.id,
        q: Math.max(1, Math.min(3, Math.floor(Number(lb.q) || 1))),
        authors: typeof lb.authors === "string" ? lb.authors.slice(0, 64) : "",
        at: typeof lb.at === "number" && Number.isFinite(lb.at) ? lb.at : 0,
      }
    : null;
  const lx = raw.lastBox && typeof raw.lastBox === "object" ? raw.lastBox : null;
  const lastBox = lx
    ? {
        count: Math.max(0, Math.min(BAKERY_CASE_CAP, Math.floor(Number(lx.count) || 0))),
        rewards: (() => {
          const out = {};
          const src = lx.rewards && typeof lx.rewards === "object" ? lx.rewards : {};
          for (const [rid, v] of Object.entries(src)) {
            const n = Math.max(0, Math.min(99999, Math.floor(Number(v) || 0)));
            if (BAKERY_RES_ZH[rid] && n > 0) out[rid] = n;
          }
          return out;
        })(),
        at: typeof lx.at === "number" && Number.isFinite(lx.at) ? lx.at : 0,
      }
    : null;
  const recentLogs = Array.isArray(raw.recentLogs)
    ? raw.recentLogs.filter((s) => typeof s === "string" && s.trim().length > 0).slice(0, BAKERY_LOG_KEEP)
    : [];
  const clean = {
    initialized: true,
    workers,
    recipeId,
    batch,
    showcase,
    recipes,
    buffs,
    totalBatches: Math.max(0, Math.floor(Number(raw.totalBatches) || 0)),
    totalEaten: Math.max(0, Math.floor(Number(raw.totalEaten) || 0)),
    totalBoxed: Math.max(0, Math.floor(Number(raw.totalBoxed) || 0)),
    rushDate: typeof raw.rushDate === "string" ? raw.rushDate : "",
    rushUsed: Math.max(0, Math.floor(Number(raw.rushUsed) || 0)),
    lastBatch,
    lastBox,
    recentLogs,
  };
  if (state.meta.cloudBakery && typeof state.meta.cloudBakery === "object") {
    Object.assign(state.meta.cloudBakery, clean);
    return state.meta.cloudBakery;
  }
  state.meta.cloudBakery = clean;
  return clean;
}

function bakeryPushLog(bk, line) {
  bk.recentLogs = [line, ...(bk.recentLogs || [])].slice(0, BAKERY_LOG_KEEP);
}

/** Non-mutating read: partners working a bakery station — protected via the away registry. */
export function getBakeryWorkerMonIds(state) {
  const ids = new Set();
  const raw = state?.meta?.cloudBakery?.workers;
  if (!raw || typeof raw !== "object") return ids;
  const monList = Array.isArray(state?.mons?.list) ? state.mons.list : null;
  const validSet = monList ? new Set(monList.filter((m) => m && typeof m.id === "number").map((m) => Math.floor(m.id))) : null;
  for (const sid of BAKERY_STATION_IDS) {
    const id = Math.floor(Number(raw[sid]) || 0);
    if (id > 0 && (!validSet || validSet.has(id))) ids.add(id);
  }
  return ids;
}

/** The station a partner works at (or null). */
export function getBakeryStationOfMon(state, monId) {
  const id = Math.floor(Number(monId) || 0);
  const raw = state?.meta?.cloudBakery?.workers;
  if (id <= 0 || !raw || typeof raw !== "object") return null;
  const sid = BAKERY_STATION_IDS.find((s) => Math.floor(Number(raw[s]) || 0) === id);
  return sid ? getBakeryStationDef(sid) : null;
}

/** Idle partners that may take a bakery station (not busy anywhere, incl. every away activity). */
export function getIdleBakeryCandidates(state) {
  return listIdleOutingMons(state);
}

function bakeryTypesOf(mon, opts = {}) {
  if (typeof opts.getMonTypes === "function") {
    const t = opts.getMonTypes(mon);
    if (Array.isArray(t) && t.length) return t.filter((x) => typeof x === "string");
  }
  return resolveMonTypesForEco(mon, opts);
}

/** Per-worker speed at a station: 1 工时/分 × 1.5（属性契合）×（1 + 亲密 / 200）. */
export function evaluateBakeryWorker(mon, stationId, opts = {}) {
  const station = getBakeryStationDef(stationId);
  if (!mon || !station) return { match: false, perMin: 0, affection: 0, types: [] };
  const types = bakeryTypesOf(mon, opts);
  const match = types.some((t) => station.elements.includes(t));
  const aff = Math.max(0, Math.min(100, typeof mon.affection === "number" && Number.isFinite(mon.affection) ? mon.affection : 0));
  const perMin = Math.round(BAKERY_WORK_PER_MIN * (match ? BAKERY_MATCH_MUL : 1) * (1 + aff / 200) * 1000) / 1000;
  return { match, perMin, affection: aff, types };
}

function bakeryWorkerMon(state, stationId) {
  const id = Math.floor(Number(state?.meta?.cloudBakery?.workers?.[stationId]) || 0);
  if (id <= 0) return null;
  const list = Array.isArray(state?.mons?.list) ? state.mons.list : [];
  return list.find((m) => m && m.id === id) || null;
}

/** Live 工时/分 of each station (empty stations get a 0.4 helper speed while anyone works; nobody → 0). */
export function getBakeryStationSpeeds(state, opts = {}) {
  const out = {};
  const mons = {};
  for (const sid of BAKERY_STATION_IDS) mons[sid] = bakeryWorkerMon(state, sid);
  const anyone = BAKERY_STATION_IDS.some((sid) => mons[sid]);
  for (const sid of BAKERY_STATION_IDS) {
    out[sid] = mons[sid] ? evaluateBakeryWorker(mons[sid], sid, opts).perMin : anyone ? BAKERY_HELPER_PER_MIN : 0;
  }
  return out;
}

/** Quality preview of the batch with the current workers (matched stations + stars). */
export function getBakeryBatchQuality(state, opts = {}) {
  let matched = 0;
  for (const sid of BAKERY_STATION_IDS) {
    const m = bakeryWorkerMon(state, sid);
    if (m && evaluateBakeryWorker(m, sid, opts).match) matched += 1;
  }
  return { matched, stars: getBakeryQualityFromMatches(matched) };
}

/** Seconds until the current batch is done with the current workers (Infinity when nobody works). */
export function getBakeryBatchEtaSec(state, opts = {}) {
  const bk = state?.meta?.cloudBakery;
  if (!bk || typeof bk !== "object" || !bk.batch) return Infinity;
  const recipe = getBakeryRecipeDef(bk.recipeId) || BAKERY_RECIPE_DEFS[0];
  const speeds = getBakeryStationSpeeds(state, opts);
  const stage0 = Math.max(0, Math.floor(Number(bk.batch.stageIdx) || 0));
  let sec = 0;
  for (let i = stage0; i < BAKERY_STATIONS.length; i += 1) {
    const sid = BAKERY_STATION_IDS[i];
    const left = Math.max(0, recipe.work[sid] - (i === stage0 ? Number(bk.batch.work) || 0 : 0));
    if (!(speeds[sid] > 0)) return Infinity;
    sec += (left / speeds[sid]) * 60;
  }
  return sec;
}

/** Finishes the current batch: dessert into the showcase, recipe book entry, worker exp / affection, next batch starts at 揉面. */
function completeBakeryBatch(state, bk, opts = {}) {
  const recipe = getBakeryRecipeDef(bk.recipeId) || BAKERY_RECIPE_DEFS[0];
  const { matched, stars } = getBakeryBatchQuality(state, opts);
  const workers = BAKERY_STATIONS.map((s) => ({ s, m: bakeryWorkerMon(state, s.id) })).filter((x) => x.m);
  const authors = workers.map((x) => `${x.s.verb}：${String(x.m.name || "伙伴").slice(0, 12)}`).join(" · ").slice(0, 64);
  const unlockedBefore = new Set(BAKERY_RECIPE_DEFS.filter((d) => isBakeryRecipeUnlocked(state, d.id)).map((d) => d.id));
  const prev = bk.recipes[recipe.id];
  const newRecipe = !prev || !(prev.baked > 0);
  const newPerfect = stars >= 3 && (!prev || (prev.bestQ || 0) < 3);
  bk.recipes[recipe.id] = { baked: (prev?.baked || 0) + 1, bestQ: Math.max(prev?.bestQ || 0, stars) };
  bk.showcase.push({ recipeId: recipe.id, q: stars });
  for (const { m } of workers) {
    if (typeof opts.addExpToMon === "function") opts.addExpToMon(m, BAKERY_EXP_PER_BATCH);
    else m.exp = Math.max(0, Math.floor((Number(m.exp) || 0) + BAKERY_EXP_PER_BATCH));
    const aff0 = typeof m.affection === "number" && Number.isFinite(m.affection) ? m.affection : 0;
    m.affection = Math.min(100, Math.max(0, aff0 + 1));
  }
  bk.totalBatches = (bk.totalBatches || 0) + 1;
  bk.batch = { stageIdx: 0, work: 0 };
  const at =
    typeof opts.atMs === "number" && Number.isFinite(opts.atMs)
      ? opts.atMs
      : typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs)
        ? opts.nowMs
        : Date.now();
  bk.lastBatch = { recipeId: recipe.id, q: stars, authors, at };
  bakeryPushLog(bk, `【出炉】${recipe.name} ${"★".repeat(stars)} 放进了甜点柜（${authors || "伙伴们"}）`);
  if (newRecipe) bakeryPushLog(bk, `【新食谱收录】「${recipe.name}」收进甜点食谱图鉴（${getBakeryCollectedCount(state)}/${BAKERY_TOTAL_RECIPES}）`);
  else if (newPerfect) bakeryPushLog(bk, `【完美出炉】「${recipe.name}」第一次烤出 ★★★`);
  const unlockedRecipes = BAKERY_RECIPE_DEFS.filter((d) => !unlockedBefore.has(d.id) && isBakeryRecipeUnlocked(state, d.id)).map((d) => d.id);
  for (const id of unlockedRecipes) bakeryPushLog(bk, `【新食谱解锁】「${getBakeryRecipeDef(id)?.name || id}」可以开始烤了`);
  return { recipeId: recipe.id, stars, matched, authors, newRecipe, newPerfect, unlockedRecipes, at };
}

/**
 * Live tick + offline catch-up (≤12h): the batch walks through 揉面 → 烘烤 → 装饰 at each station's speed, batches complete in
 * chronological order (a full showcase stops the line), so one long step lands on the same progress as many short ones.
 * Timed buffs count down with the real elapsed time (they only grow when a dessert is eaten). opts.nowMs = end of the step (ms).
 */
export function advanceBakery(state, dtSec, opts = {}) {
  const bk = state?.meta?.cloudBakery;
  const empty = { batches: [], workDone: 0, caseFull: false, expiredBuffs: [] };
  if (!bk || typeof bk !== "object" || !bk.workers || !bk.batch || !Array.isArray(bk.showcase) || !bk.buffs || !bk.recipes) return empty;
  const dt = typeof dtSec === "number" && Number.isFinite(dtSec) && dtSec > 0 ? dtSec : 0;
  if (dt <= 0) return empty;
  const expiredBuffs = [];
  for (const b of BAKERY_BUFF_DEFS) {
    const before = Number(bk.buffs[b.id]) || 0;
    if (before <= 0) continue;
    const after = Math.max(0, before - dt);
    bk.buffs[b.id] = after;
    if (after <= 0) expiredBuffs.push(b.id);
  }
  const step = Math.min(BAKERY_MAX_CATCHUP_SEC, dt);
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const batches = [];
  let remaining = step;
  let workDone = 0;
  for (let guard = 0; guard < 600 && remaining > 1e-9; guard += 1) {
    if (bk.showcase.length >= BAKERY_CASE_CAP) break;
    const recipe = getBakeryRecipeDef(bk.recipeId) || BAKERY_RECIPE_DEFS[0];
    const stageIdx = Math.max(0, Math.min(BAKERY_STATIONS.length - 1, Math.floor(Number(bk.batch.stageIdx) || 0)));
    const sid = BAKERY_STATION_IDS[stageIdx];
    const perSec = (getBakeryStationSpeeds(state, opts)[sid] || 0) / 60;
    if (!(perSec > 0)) break;
    const missing = Math.max(0, recipe.work[sid] - (Number(bk.batch.work) || 0));
    const t = missing / perSec;
    if (t <= remaining + 1e-9) {
      remaining = Math.max(0, remaining - t);
      workDone += missing;
      if (stageIdx >= BAKERY_STATIONS.length - 1) {
        // `remaining` is in SECONDS: the batch finished `remaining` s before the end of the step → convert to ms for the timestamp.
        batches.push(completeBakeryBatch(state, bk, { ...opts, atMs: nowMs - remaining * 1000 }));
      } else {
        bk.batch = { stageIdx: stageIdx + 1, work: 0 };
      }
    } else {
      bk.batch.work = (Number(bk.batch.work) || 0) + perSec * remaining;
      workDone += perSec * remaining;
      remaining = 0;
    }
  }
  const caseFull = bk.showcase.length >= BAKERY_CASE_CAP;
  return { batches, workDone: Math.round(workDone * 1000) / 1000, caseFull, expiredBuffs };
}

/** Puts an idle partner on a station, or — when the partner already works anywhere in the bakery — sends it home (下班). */
export function assignBakeryWorker(state, stationId, monId, opts = {}) {
  const bk = ensureBakeryState(state);
  if (!bk) return { ok: false, reason: "invalid_state" };
  const id = Math.floor(Number(monId) || 0);
  if (id <= 0) return { ok: false, reason: "invalid_mon" };
  const list = Array.isArray(state.mons?.list) ? state.mons.list : [];
  const cur = BAKERY_STATION_IDS.find((sid) => bk.workers[sid] === id);
  if (cur) {
    bk.workers[cur] = 0;
    bakeryPushLog(bk, `【下班】${list.find((m) => m && m.id === id)?.name || "伙伴"} 摘下围裙离开了${getBakeryStationDef(cur)?.name || "工位"}`);
    return { ok: true, working: false, stationId: cur };
  }
  const station = getBakeryStationDef(stationId);
  if (!station) return { ok: false, reason: "unknown_station" };
  if (bk.workers[station.id]) return { ok: false, reason: "station_full" };
  const mon = getIdleBakeryCandidates(state).find((m) => m.id === id);
  if (!mon) return { ok: false, reason: "mon_busy" };
  bk.workers[station.id] = id;
  const ev = evaluateBakeryWorker(mon, station.id, opts);
  bakeryPushLog(bk, `【上岗】${mon.name || "伙伴"} 系上围裙站到了${station.name}${ev.match ? "（属性契合）" : ""}，上岗期间防放生保护生效`);
  return { ok: true, working: true, stationId: station.id, match: ev.match };
}

/** 「一键排班」: fills every empty station — the fastest (station, partner) pairs first, so matched partners land on their own station. */
export function autoStaffBakery(state, opts = {}) {
  const bk = ensureBakeryState(state);
  if (!bk) return { ok: false, added: [] };
  const idle = getIdleBakeryCandidates(state);
  const pairs = [];
  BAKERY_STATIONS.forEach((s, sIdx) => {
    if (bk.workers[s.id]) return;
    for (const m of idle) pairs.push({ s, sIdx, m, ev: evaluateBakeryWorker(m, s.id, opts) });
  });
  pairs.sort(
    (a, b) =>
      b.ev.perMin - a.ev.perMin ||
      Math.floor(Number(b.m.lvl) || 1) - Math.floor(Number(a.m.lvl) || 1) ||
      (a.m.id || 0) - (b.m.id || 0) ||
      a.sIdx - b.sIdx,
  );
  const usedM = new Set();
  const added = [];
  for (const p of pairs) {
    if (usedM.has(p.m.id) || bk.workers[p.s.id]) continue;
    bk.workers[p.s.id] = p.m.id;
    usedM.add(p.m.id);
    added.push({ stationId: p.s.id, monId: p.m.id, match: p.ev.match });
  }
  if (added.length) {
    bakeryPushLog(bk, `【一键排班】${added.length} 位伙伴系上围裙上岗（契合工位 ${added.filter((a) => a.match).length} 个，上岗期间防放生保护生效）`);
  }
  const full = BAKERY_STATION_IDS.every((sid) => bk.workers[sid]);
  return { ok: added.length > 0, reason: added.length ? "" : full ? "stations_full" : "no_idle_mons", added };
}

/** 「全部下班」: every worker goes home (the half-done batch waits on the counter). */
export function dismissAllBakers(state) {
  const bk = ensureBakeryState(state);
  if (!bk) return { ok: false, dismissed: 0 };
  let dismissed = 0;
  for (const sid of BAKERY_STATION_IDS) {
    if (bk.workers[sid]) dismissed += 1;
    bk.workers[sid] = 0;
  }
  if (dismissed) bakeryPushLog(bk, `【全部下班】${dismissed} 位伙伴摘下围裙回家了，没做完的这一炉留在案板上`);
  return { ok: dismissed > 0, dismissed };
}

/** Switches the recipe being baked (unlocked recipes only); the batch keeps its current step (work clamped to the new recipe). */
export function selectBakeryRecipe(state, recipeId) {
  const bk = ensureBakeryState(state);
  if (!bk) return { ok: false, reason: "invalid_state" };
  const def = getBakeryRecipeDef(recipeId);
  if (!def) return { ok: false, reason: "unknown_recipe" };
  if (!isBakeryRecipeUnlocked(state, def.id)) return { ok: false, reason: "locked", needRecipes: def.unlockRecipes };
  if (bk.recipeId === def.id) return { ok: false, reason: "already_selected" };
  bk.recipeId = def.id;
  const need = def.work[BAKERY_STATION_IDS[bk.batch.stageIdx] || "knead"];
  bk.batch.work = Math.max(0, Math.min(need - 0.001, Number(bk.batch.work) || 0));
  bakeryPushLog(bk, `【换食谱】案板上摊开了「${def.name}」的食谱卡`);
  return { ok: true, recipeId: def.id };
}

/** 「享用」: eats one dessert of a recipe (best quality first) and extends its timed buff (≤6h per buff). */
export function enjoyBakeryDessert(state, recipeId) {
  const bk = ensureBakeryState(state);
  if (!bk) return { ok: false, reason: "invalid_state" };
  const def = getBakeryRecipeDef(recipeId);
  if (!def) return { ok: false, reason: "unknown_recipe" };
  let idx = -1;
  bk.showcase.forEach((d, i) => {
    if (d.recipeId === def.id && (idx < 0 || d.q > bk.showcase[idx].q)) idx = i;
  });
  if (idx < 0) return { ok: false, reason: "no_dessert" };
  const [dessert] = bk.showcase.splice(idx, 1);
  const buff = getBakeryBuffDef(def.buffId);
  const addSec = Math.round(def.buffMin * 60 * BAKERY_QUALITY_MUL[dessert.q]);
  const before = Number(bk.buffs[buff.id]) || 0;
  bk.buffs[buff.id] = Math.min(BAKERY_BUFF_MAX_SEC, before + addSec);
  bk.totalEaten = (bk.totalEaten || 0) + 1;
  const logLine = `【享用】大家分吃了一份 ${def.name} ${"★".repeat(dessert.q)}，「${buff.name}」${buff.effectText} 续上 ${Math.round(addSec / 60)} 分钟`;
  bakeryPushLog(bk, logLine);
  return {
    ok: true,
    recipeId: def.id,
    q: dessert.q,
    buffId: buff.id,
    addSec,
    remainingSec: bk.buffs[buff.id],
    capped: before + addSec > BAKERY_BUFF_MAX_SEC,
    logLine,
  };
}

/** 「装盒送出」: every dessert in the showcase becomes 灵果 + 未来币 (by recipe tier × stars). */
export function boxBakeryDesserts(state, opts = {}) {
  const bk = ensureBakeryState(state);
  if (!bk) return { ok: false, reason: "invalid_state" };
  if (!bk.showcase.length) return { ok: false, reason: "empty_case" };
  const rewards = {};
  for (const d of bk.showcase) {
    for (const [rid, n] of Object.entries(getBakeryDessertRewards(d.recipeId, d.q))) rewards[rid] = (rewards[rid] || 0) + n;
  }
  for (const [rid, n] of Object.entries(rewards)) addResDirect(state, rid, n, opts);
  const count = bk.showcase.length;
  bk.showcase = [];
  bk.totalBoxed = (bk.totalBoxed || 0) + count;
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  bk.lastBox = { count, rewards: { ...rewards }, at: nowMs };
  const rewardTxt = Object.entries(rewards)
    .map(([rid, n]) => `${BAKERY_RES_ZH[rid] || rid} +${n}`)
    .join("、");
  const logLine = `【装盒送出】${count} 份甜点装进云朵礼盒送了出去，换来 ${rewardTxt}`;
  bakeryPushLog(bk, logLine);
  return { ok: true, count, rewards, logLine };
}

export function getBakeryRushFreeLeft(state, nowMs = Date.now()) {
  const bk = state?.meta?.cloudBakery;
  if (!bk || typeof bk !== "object") return BAKERY_RUSH_FREE_PER_DAY;
  if (bk.rushDate !== localYmdForSandbox(nowMs)) return BAKERY_RUSH_FREE_PER_DAY;
  return Math.max(0, BAKERY_RUSH_FREE_PER_DAY - Math.floor(Number(bk.rushUsed) || 0));
}

/** 「加急出炉」: the current batch is done at once (needs a worker and room in the showcase). Free once per local day, then futurecoin ×20. */
export function performBakeryRush(state, opts = {}) {
  const bk = ensureBakeryState(state);
  if (!bk) return { ok: false, reason: "invalid_state" };
  if (!getBakeryWorkerMonIds(state).size) return { ok: false, reason: "no_workers" };
  if (bk.showcase.length >= BAKERY_CASE_CAP) return { ok: false, reason: "case_full" };
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const today = localYmdForSandbox(nowMs);
  if (bk.rushDate !== today) {
    bk.rushDate = today;
    bk.rushUsed = 0;
  }
  let costKind = "";
  if (bk.rushUsed < BAKERY_RUSH_FREE_PER_DAY) {
    bk.rushUsed += 1;
    costKind = "free_daily";
  } else if ((Number(state.res?.futurecoin?.value) || 0) >= BAKERY_RUSH_COIN_COST) {
    state.res.futurecoin.value = Math.max(0, Math.floor(state.res.futurecoin.value) - BAKERY_RUSH_COIN_COST);
    costKind = "futurecoin";
  } else {
    return { ok: false, reason: "insufficient_rush_cost" };
  }
  const batch = completeBakeryBatch(state, bk, { ...opts, nowMs });
  const logLine = `【加急出炉】炉火一下子旺了起来，${getBakeryRecipeDef(batch.recipeId)?.name || "甜点"} ${"★".repeat(batch.stars)} 提前出炉`;
  bakeryPushLog(bk, logLine);
  return { ok: true, costKind, batch, logLine };
}

/** Forced release / star-up material: the partner leaves its station. */
export function detachBakeryWorker(state, monId) {
  const bk = state?.meta?.cloudBakery;
  const id = Math.floor(Number(monId) || 0);
  if (!bk || typeof bk !== "object" || !bk.workers || typeof bk.workers !== "object" || id <= 0) return { ok: false, detached: false };
  let detached = false;
  for (const sid of BAKERY_STATION_IDS) {
    if (Math.floor(Number(bk.workers[sid]) || 0) === id) {
      bk.workers[sid] = 0;
      detached = true;
    }
  }
  return { ok: true, detached };
}

/** Rebirth: every worker goes home (partner IDs reset); recipe book, showcase, buffs and batch progress are kept. */
export function recallBakeryForRebirth(state) {
  const bk = state?.meta?.cloudBakery;
  if (!bk || typeof bk !== "object" || !bk.workers || typeof bk.workers !== "object") return { ok: false, recalled: 0 };
  let recalled = 0;
  for (const sid of BAKERY_STATION_IDS) {
    if (Math.floor(Number(bk.workers[sid]) || 0) > 0) recalled += 1;
    bk.workers[sid] = 0;
  }
  return { ok: true, recalled };
}

/**
 * Pure non-mutating aggregator (wired into production / effects / breeding / PvE damage):
 * 永久 每收录一份食谱 全产 +0.25%（8 份 = 2%）· 每份 ★3 完美食谱 PvE +0.5%（8 份 = 4%）；
 * 限时 甜香满屋 全产 +8% · 轻盈脚步 捕获 +1.2% · 糖霜闪闪 闪光 +10% · 元气满满 PvE +6%（享用甜点续时，单项 ≤6h）。
 */
export function computeBakeryAura(state) {
  const raw = state?.meta?.cloudBakery;
  const has = Boolean(raw && typeof raw === "object");
  const recipes = bakeryRecipesOf(state);
  let collected = 0;
  let perfect = 0;
  for (const r of BAKERY_RECIPE_DEFS) {
    const e = recipes[r.id];
    if (!e || !((Number(e.baked) || 0) > 0)) continue;
    collected += 1;
    if ((Number(e.bestQ) || 0) >= 3) perfect += 1;
  }
  const permProdAdd = collected * BAKERY_RECIPE_PROD_ADD;
  const permPveOutAdd = perfect * BAKERY_PERFECT_PVE_ADD;
  let prodAdd = permProdAdd;
  let catchAdd = 0;
  let shinyAdd = 0;
  let pveOutAdd = permPveOutAdd;
  const activeBuffs = [];
  const buffs = has && raw.buffs && typeof raw.buffs === "object" ? raw.buffs : {};
  for (const b of BAKERY_BUFF_DEFS) {
    const rem = Math.max(0, Math.min(BAKERY_BUFF_MAX_SEC, Number(buffs[b.id]) || 0));
    if (rem <= 0) continue;
    activeBuffs.push({ id: b.id, name: b.name, effectText: b.effectText, remainingSec: rem });
    if (b.id === "prod") prodAdd += b.value;
    if (b.id === "catch") catchAdd += b.value;
    if (b.id === "shiny") shinyAdd += b.value;
    if (b.id === "pveOut") pveOutAdd += b.value;
  }
  const round4 = (n) => Math.round(n * 10000) / 10000;
  const totalBatches = has ? Math.max(0, Math.floor(Number(raw.totalBatches) || 0)) : 0;
  return {
    recipesCollected: collected,
    totalRecipes: BAKERY_TOTAL_RECIPES,
    perfectRecipes: perfect,
    workers: has ? getBakeryWorkerMonIds(state).size : 0,
    showcase: has && Array.isArray(raw.showcase) ? raw.showcase.length : 0,
    totalBatches,
    title: getBakeryTitle(totalBatches),
    activeBuffs,
    permProdAdd: round4(permProdAdd),
    permPveOutAdd: round4(permPveOutAdd),
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
 * ML-15 彩虹气球旅行 lives in pve_tower.js, but its passengers must join the shared away registry above
 * (collection_fun.js cannot import pve_tower.js without a cycle), so the non-mutating reader sits here.
 */
export const BALLOON_COUNT = 2;
export const BALLOON_SEATS = 2;
export const BALLOON_MAX_TRAVELERS = BALLOON_COUNT * BALLOON_SEATS;

/** Non-mutating read: partners aboard a balloon (flying, or landed and waiting to be met) — protected via the away registry. */
export function getBalloonTravelerMonIds(state) {
  const ids = new Set();
  const balloons = state?.meta?.balloonTravel?.balloons;
  if (!Array.isArray(balloons)) return ids;
  const monList = Array.isArray(state?.mons?.list) ? state.mons.list : null;
  const validSet = monList ? new Set(monList.filter((m) => m && typeof m.id === "number").map((m) => Math.floor(m.id))) : null;
  for (const b of balloons.slice(0, BALLOON_COUNT)) {
    const raw = b?.trip?.passengerIds;
    if (!Array.isArray(raw)) continue;
    for (const v of raw.slice(0, BALLOON_SEATS)) {
      const id = Math.floor(Number(v) || 0);
      if (id > 0 && (!validSet || validSet.has(id))) ids.add(id);
    }
  }
  return ids;
}

/** Idle partners that may board a balloon (shared with the bakery and every other outing). */
export function getIdleBalloonCandidates(state) {
  return listIdleOutingMons(state);
}

// ============================================================================
// ML-16 「云端游乐园」(Cloud Amusement Park)
// 三座游乐设施按属性请伙伴值班操作：星光旋转木马（草 / 水 / 幻）、云朵摩天轮（风 / 光 / 暗）、彩虹过山车（火 / 电 / 岩），每座 1 位操作员。
// 有人操作的设施一轮接一轮地运转：每轮基础时长 6 / 10 / 8 分钟，操作员速度 = 1 × 1.5（属性契合）×（1 + 亲密 / 200）；
// 每轮接待游客 6 / 8 / 5 位（游客满意度 ≥50 每轮多 1 位、≥80 多 2 位），每位游客换 1 张门票（售票亭最多存 600 张，满了的部分流失）。
// 游客满意度 0~100：每转完一轮 +1（属性契合 +3），每小时自然回落 12 点；满意度越高全产越高（每点 +0.03%，满 100 = +3%），
// 并决定「游园活动」限时增益的时长倍率（≥50 ×1.25、≥80 ×1.5）。
// 「游园活动」花门票点亮限时增益（星空烟花秀 全产 +6% / 花车大游行 捕获 +1% / 魔法灯光秀 闪光 +8% / 勇者嘉年华 PvE 增伤 +5%），
// 基础 30 分钟，可叠加、单项最多 4 小时，每办一次满意度 +8。「门票兑换礼包」50 张换灵果 120 + 灵木 60 + 未来币 4。
// 累计游客解锁设施（摩天轮 60 位、过山车 200 位）并升游乐园星级（150 / 600 / 1500 / 3500 / 8000 位 → ★1~★5，每星 全产 +0.4%、PvE +0.5%）。
// 每日一次免费「加场演出」（之后 20 未来币）：所有有人操作的设施立刻多转一轮。每轮操作员经验 +6，每座设施每转 5 轮操作员亲密 +1。
// 值班伙伴经由上方统一登记表接入防放生锁 / 训练 / 远征 / 冠军赛排除；离线补算 ≤12h（按各设施转完一轮的先后顺序逐轮结算，
// 满意度在两轮之间连续回落），强制放生 / 转生让伙伴换班，满意度、门票、星级与限时增益保留。
// ============================================================================

export const PARK_RIDES = Object.freeze(
  [
    { id: "carousel", name: "星光旋转木马", short: "旋转木马", elements: ["grass", "water", "mystic"], roundMin: 6, visitors: 6, unlockVisitors: 0, desc: "花藤缠着的木马一圈圈地转，喷泉跟着八音盒的节拍跳舞。" },
    { id: "ferrisWheel", name: "云朵摩天轮", short: "摩天轮", elements: ["wind", "light", "dark"], roundMin: 10, visitors: 8, unlockVisitors: 60, desc: "转到最高处能看见日出，入夜后整片星空都挂在车厢窗外。" },
    { id: "coaster", name: "彩虹过山车", short: "过山车", elements: ["fire", "electric", "stone"], roundMin: 8, visitors: 5, unlockVisitors: 200, desc: "电光推着车厢冲上岩石轨道，再从彩虹上一口气滑下来。" },
  ].map((r) => Object.freeze({ ...r, elements: Object.freeze(r.elements.slice()) })),
);
export const PARK_RIDE_IDS = Object.freeze(PARK_RIDES.map((r) => r.id));
export const PARK_MAX_OPERATORS = PARK_RIDES.length;
export const PARK_MATCH_MUL = 1.5;
export const PARK_SAT_START = 30;
export const PARK_SAT_MAX = 100;
export const PARK_SAT_DECAY_PER_HOUR = 12;
export const PARK_SAT_DECAY_PER_SEC = PARK_SAT_DECAY_PER_HOUR / 3600;
export const PARK_SAT_GAIN_BASE = 1;
export const PARK_SAT_GAIN_MATCH = 3;
export const PARK_SAT_PROD_PER_POINT = 0.0003;
export const PARK_EVENT_SAT_GAIN = 8;
export const PARK_TICKET_CAP = 600;
export const PARK_MAX_CATCHUP_SEC = 12 * 3600;
export const PARK_BUFF_MAX_SEC = 4 * 3600;
export const PARK_SHOW_FREE_PER_DAY = 1;
export const PARK_SHOW_COIN_COST = 20;
export const PARK_EXP_PER_ROUND = 6;
export const PARK_AFFECTION_EVERY = 5;
export const PARK_GIFT_COST = 50;
export const PARK_GIFT_REWARDS = Object.freeze({ catnip: 120, wood: 60, futurecoin: 4 });
export const PARK_STAR_THRESHOLDS = Object.freeze([150, 600, 1500, 3500, 8000]);
export const PARK_MAX_STARS = PARK_STAR_THRESHOLDS.length;
export const PARK_STAR_PROD_ADD = 0.004;
export const PARK_STAR_PVE_ADD = 0.005;
export const PARK_LOG_KEEP = 6;
export const PARK_RES_ZH = Object.freeze({ catnip: "灵果", wood: "灵木", futurecoin: "未来币" });

/** Satisfaction tiers (first match wins): event duration multiplier + extra visitors per round. */
export const PARK_SAT_TIERS = Object.freeze([
  Object.freeze({ min: 80, name: "欢声雷动", eventMul: 1.5, bonusVisitors: 2 }),
  Object.freeze({ min: 50, name: "笑声不断", eventMul: 1.25, bonusVisitors: 1 }),
  Object.freeze({ min: 20, name: "游人渐多", eventMul: 1, bonusVisitors: 0 }),
  Object.freeze({ min: 0, name: "冷冷清清", eventMul: 1, bonusVisitors: 0 }),
]);

/** 4 park events = 4 timed buffs (keyed by event id). */
export const PARK_EVENT_DEFS = Object.freeze(
  [
    { id: "fireworks", name: "星空烟花秀", stat: "prod", value: 0.06, effectText: "全产 +6%", cost: 120, baseMin: 30, desc: "烟花在摩天轮背后一朵朵绽开，整座乐园的伙伴都干劲十足。" },
    { id: "parade", name: "花车大游行", stat: "catch", value: 0.01, effectText: "捕获 +1%", cost: 120, baseMin: 30, desc: "花车沿着云朵大道慢慢走，路边的萌灵都忍不住凑过来看。" },
    { id: "lightShow", name: "魔法灯光秀", stat: "shiny", value: 0.08, effectText: "闪光 +8%", cost: 160, baseMin: 30, desc: "彩光在旋转木马的镜面上跳来跳去，闪闪发亮的伙伴更容易现身。" },
    { id: "carnival", name: "勇者嘉年华", stat: "pveOut", value: 0.05, effectText: "PvE 增伤 +5%", cost: 160, baseMin: 30, desc: "过山车终点的勇者擂台热闹开场，出战的伙伴个个摩拳擦掌。" },
  ].map((e) => Object.freeze(e)),
);
export const PARK_EVENT_IDS = Object.freeze(PARK_EVENT_DEFS.map((e) => e.id));

const PARK_TITLES = Object.freeze(["云端小乐园", "热闹游乐园", "人气游乐园", "云端梦幻乐园", "星光主题乐园", "传说中的云端乐园"]);

export function getParkRideDef(rideId) {
  return PARK_RIDES.find((r) => r.id === rideId) || null;
}

export function getParkEventDef(eventId) {
  return PARK_EVENT_DEFS.find((e) => e.id === eventId) || null;
}

/** Park stars from total visitors (150 / 600 / 1500 / 3500 / 8000 → ★1~★5). */
export function getParkStars(totalVisitors = 0) {
  const n = Math.max(0, Math.floor(Number(totalVisitors) || 0));
  return PARK_STAR_THRESHOLDS.filter((t) => n >= t).length;
}

export function getParkTitle(stars = 0) {
  return PARK_TITLES[Math.max(0, Math.min(PARK_MAX_STARS, Math.floor(Number(stars) || 0)))];
}

export function getParkSatisfactionTier(satisfaction = 0) {
  const s = Math.max(0, Number(satisfaction) || 0);
  return PARK_SAT_TIERS.find((t) => s >= t.min) || PARK_SAT_TIERS[PARK_SAT_TIERS.length - 1];
}

export function isParkRideUnlocked(state, rideId) {
  const def = getParkRideDef(rideId);
  if (!def) return false;
  return Math.max(0, Math.floor(Number(state?.meta?.cloudPark?.totalVisitors) || 0)) >= def.unlockVisitors;
}

export function ensureCloudParkState(state) {
  if (!state || typeof state !== "object") return null;
  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  const raw = state.meta.cloudPark && typeof state.meta.cloudPark === "object" ? state.meta.cloudPark : {};
  const aliveSet = awayAliveIdSet(state);
  const totalVisitors = Math.max(0, Math.min(99_999_999, Math.floor(Number(raw.totalVisitors) || 0)));
  const rawOps = raw.operators && typeof raw.operators === "object" ? raw.operators : {};
  const operators = {};
  const used = new Set();
  for (const r of PARK_RIDES) {
    const id = Math.floor(Number(rawOps[r.id]) || 0);
    if (id > 0 && !used.has(id) && (!aliveSet || aliveSet.has(id)) && totalVisitors >= r.unlockVisitors) {
      operators[r.id] = id;
      used.add(id);
    } else {
      operators[r.id] = 0;
    }
  }
  const rawRides = raw.rides && typeof raw.rides === "object" ? raw.rides : {};
  const rides = {};
  for (const r of PARK_RIDES) {
    const e = rawRides[r.id] && typeof rawRides[r.id] === "object" ? rawRides[r.id] : {};
    const need = r.roundMin * 60;
    const w = Number(e.work);
    rides[r.id] = {
      work: Number.isFinite(w) && w > 0 ? Math.min(need - 0.001, w) : 0,
      rounds: Math.max(0, Math.min(99_999_999, Math.floor(Number(e.rounds) || 0))),
      lastVisitors: Math.max(0, Math.min(99, Math.floor(Number(e.lastVisitors) || 0))),
    };
  }
  const sat0 = Number(raw.satisfaction);
  const satisfaction = Number.isFinite(sat0) ? Math.max(0, Math.min(PARK_SAT_MAX, sat0)) : PARK_SAT_START;
  const rawBuffs = raw.buffs && typeof raw.buffs === "object" ? raw.buffs : {};
  const buffs = {};
  for (const e of PARK_EVENT_DEFS) {
    const n = Number(rawBuffs[e.id]);
    buffs[e.id] = Number.isFinite(n) && n > 0 ? Math.min(PARK_BUFF_MAX_SEC, n) : 0;
  }
  const le = raw.lastEvent && typeof raw.lastEvent === "object" ? raw.lastEvent : null;
  const leDef = le ? getParkEventDef(le.eventId) : null;
  const lastEvent = leDef
    ? {
        eventId: leDef.id,
        addSec: Math.max(0, Math.min(PARK_BUFF_MAX_SEC, Math.floor(Number(le.addSec) || 0))),
        eventMul: Math.max(1, Math.min(1.5, Number(le.eventMul) || 1)),
        at: typeof le.at === "number" && Number.isFinite(le.at) ? le.at : 0,
      }
    : null;
  const recentLogs = Array.isArray(raw.recentLogs)
    ? raw.recentLogs.filter((s) => typeof s === "string" && s.trim().length > 0).slice(0, PARK_LOG_KEEP)
    : [];
  const clean = {
    initialized: true,
    operators,
    rides,
    satisfaction,
    tickets: Math.max(0, Math.min(PARK_TICKET_CAP, Math.floor(Number(raw.tickets) || 0))),
    totalVisitors,
    totalRounds: Math.max(0, Math.floor(Number(raw.totalRounds) || 0)),
    totalEvents: Math.max(0, Math.floor(Number(raw.totalEvents) || 0)),
    totalGifts: Math.max(0, Math.floor(Number(raw.totalGifts) || 0)),
    ticketsLost: Math.max(0, Math.floor(Number(raw.ticketsLost) || 0)),
    buffs,
    showDate: typeof raw.showDate === "string" ? raw.showDate : "",
    showUsed: Math.max(0, Math.floor(Number(raw.showUsed) || 0)),
    lastEvent,
    recentLogs,
  };
  if (state.meta.cloudPark && typeof state.meta.cloudPark === "object") {
    Object.assign(state.meta.cloudPark, clean);
    return state.meta.cloudPark;
  }
  state.meta.cloudPark = clean;
  return clean;
}

function parkPushLog(pk, line) {
  pk.recentLogs = [line, ...(pk.recentLogs || [])].slice(0, PARK_LOG_KEEP);
}

/** Non-mutating read: partners operating a park ride — protected via the away registry. */
export function getCloudParkOperatorMonIds(state) {
  const ids = new Set();
  const raw = state?.meta?.cloudPark?.operators;
  if (!raw || typeof raw !== "object") return ids;
  const validSet = awayAliveIdSet(state);
  for (const rid of PARK_RIDE_IDS) {
    const id = Math.floor(Number(raw[rid]) || 0);
    if (id > 0 && (!validSet || validSet.has(id))) ids.add(id);
  }
  return ids;
}

/** The ride a partner operates (or null). */
export function getCloudParkRideOfMon(state, monId) {
  const id = Math.floor(Number(monId) || 0);
  const raw = state?.meta?.cloudPark?.operators;
  if (id <= 0 || !raw || typeof raw !== "object") return null;
  const rid = PARK_RIDE_IDS.find((r) => Math.floor(Number(raw[r]) || 0) === id);
  return rid ? getParkRideDef(rid) : null;
}

/** Idle partners that may operate a ride (not busy anywhere, incl. every away activity). */
export function getIdleParkCandidates(state) {
  return listIdleOutingMons(state);
}

function parkTypesOf(mon, opts = {}) {
  if (typeof opts.getMonTypes === "function") {
    const t = opts.getMonTypes(mon);
    if (Array.isArray(t) && t.length) return t.filter((x) => typeof x === "string");
  }
  return resolveMonTypesForEco(mon, opts);
}

/** Operator preview: speed = 1 × 1.5（属性契合）×（1 + 亲密 / 200）, round time = base / speed, satisfaction +3 (matched) / +1. */
export function evaluateParkOperator(mon, rideId, opts = {}) {
  const ride = getParkRideDef(rideId);
  if (!mon || !ride) return { match: false, speed: 0, roundSec: Infinity, satGain: 0, affection: 0, types: [] };
  const types = parkTypesOf(mon, opts);
  const match = types.some((t) => ride.elements.includes(t));
  const aff = Math.max(0, Math.min(100, typeof mon.affection === "number" && Number.isFinite(mon.affection) ? mon.affection : 0));
  const speed = Math.round((match ? PARK_MATCH_MUL : 1) * (1 + aff / 200) * 1000) / 1000;
  return { match, speed, roundSec: Math.round((ride.roundMin * 60) / speed), satGain: match ? PARK_SAT_GAIN_MATCH : PARK_SAT_GAIN_BASE, affection: aff, types };
}

function parkOperatorMon(state, rideId) {
  const id = Math.floor(Number(state?.meta?.cloudPark?.operators?.[rideId]) || 0);
  if (id <= 0) return null;
  const list = Array.isArray(state?.mons?.list) ? state.mons.list : [];
  return list.find((m) => m && m.id === id) || null;
}

/** Live speed of every ride (0 = nobody operates it or it is still locked). */
export function getParkRideSpeeds(state, opts = {}) {
  const out = {};
  for (const r of PARK_RIDES) {
    const m = isParkRideUnlocked(state, r.id) ? parkOperatorMon(state, r.id) : null;
    out[r.id] = m ? evaluateParkOperator(m, r.id, opts).speed : 0;
  }
  return out;
}

/** Visitors of one round of a ride at the current satisfaction. */
export function getParkRoundVisitors(rideId, satisfaction = 0) {
  const ride = getParkRideDef(rideId);
  if (!ride) return 0;
  return ride.visitors + getParkSatisfactionTier(satisfaction).bonusVisitors;
}

/** Finishes one round: visitors → tickets (cap 600), satisfaction gain, total visitors / stars, operator exp / affection. */
function completeParkRound(state, pk, ride, opts = {}) {
  const mon = parkOperatorMon(state, ride.id);
  const ev = evaluateParkOperator(mon, ride.id, opts);
  const visitors = getParkRoundVisitors(ride.id, pk.satisfaction);
  const room = Math.max(0, PARK_TICKET_CAP - (pk.tickets || 0));
  const tickets = Math.min(room, visitors);
  const lost = visitors - tickets;
  const unlockedBefore = new Set(PARK_RIDES.filter((r) => isParkRideUnlocked(state, r.id)).map((r) => r.id));
  const starsBefore = getParkStars(pk.totalVisitors);
  pk.tickets = (pk.tickets || 0) + tickets;
  pk.ticketsLost = (pk.ticketsLost || 0) + lost;
  pk.totalVisitors = (pk.totalVisitors || 0) + visitors;
  pk.totalRounds = (pk.totalRounds || 0) + 1;
  pk.satisfaction = Math.min(PARK_SAT_MAX, Math.max(0, Number(pk.satisfaction) || 0) + (mon ? ev.satGain : PARK_SAT_GAIN_BASE));
  const rs = pk.rides[ride.id];
  rs.work = 0;
  rs.rounds = (rs.rounds || 0) + 1;
  rs.lastVisitors = visitors;
  if (mon) {
    if (typeof opts.addExpToMon === "function") opts.addExpToMon(mon, PARK_EXP_PER_ROUND);
    else mon.exp = Math.max(0, Math.floor((Number(mon.exp) || 0) + PARK_EXP_PER_ROUND));
    if (rs.rounds % PARK_AFFECTION_EVERY === 0) {
      const aff0 = typeof mon.affection === "number" && Number.isFinite(mon.affection) ? mon.affection : 0;
      mon.affection = Math.min(100, Math.max(0, aff0 + 1));
    }
  }
  const starsAfter = getParkStars(pk.totalVisitors);
  if (starsAfter > starsBefore) parkPushLog(pk, `【游乐园升星】累计接待游客 ${pk.totalVisitors} 位，云端游乐园升为 ${"★".repeat(starsAfter)}「${getParkTitle(starsAfter)}」`);
  const unlockedRides = PARK_RIDES.filter((r) => !unlockedBefore.has(r.id) && isParkRideUnlocked(state, r.id)).map((r) => r.id);
  for (const id of unlockedRides) parkPushLog(pk, `【新设施开放】「${getParkRideDef(id)?.name || id}」建好了，快请伙伴来值班`);
  const at =
    typeof opts.atMs === "number" && Number.isFinite(opts.atMs)
      ? opts.atMs
      : typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs)
        ? opts.nowMs
        : Date.now();
  return { rideId: ride.id, monId: mon?.id || 0, visitors, tickets, lost, match: Boolean(mon && ev.match), starsUp: starsAfter > starsBefore ? starsAfter : 0, unlockedRides, at };
}

/**
 * Live tick + offline catch-up (≤12h): the rides turn round after round at their operators' speed; rounds are settled in
 * chronological order and satisfaction decays continuously between them, so one long step equals many short ones.
 * Timed buffs count down with the real elapsed time. opts.nowMs = end of the step (ms).
 */
export function advanceCloudPark(state, dtSec, opts = {}) {
  const pk = state?.meta?.cloudPark;
  const empty = { rounds: [], visitors: 0, ticketsAdded: 0, ticketsLost: 0, expiredBuffs: [], newStars: 0, unlockedRides: [], ticketsFull: false };
  if (!pk || typeof pk !== "object" || !pk.operators || !pk.rides || !pk.buffs) return empty;
  const dt = typeof dtSec === "number" && Number.isFinite(dtSec) && dtSec > 0 ? dtSec : 0;
  if (dt <= 0) return empty;
  const expiredBuffs = [];
  for (const e of PARK_EVENT_DEFS) {
    const before = Number(pk.buffs[e.id]) || 0;
    if (before <= 0) continue;
    const after = Math.max(0, before - dt);
    pk.buffs[e.id] = after;
    if (after <= 0) expiredBuffs.push(e.id);
  }
  const step = Math.min(PARK_MAX_CATCHUP_SEC, dt);
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const starsBefore = getParkStars(pk.totalVisitors);
  const ticketsFullBefore = (pk.tickets || 0) >= PARK_TICKET_CAP;
  const decay = (sec) => {
    pk.satisfaction = Math.max(0, (Number(pk.satisfaction) || 0) - PARK_SAT_DECAY_PER_SEC * sec);
  };
  const rounds = [];
  let remaining = step;
  for (let guard = 0; guard < 6000 && remaining > 1e-9; guard += 1) {
    const speeds = getParkRideSpeeds(state, opts);
    let next = null;
    for (const r of PARK_RIDES) {
      const sp = speeds[r.id];
      if (!(sp > 0)) continue;
      const t = Math.max(0, (r.roundMin * 60 - (Number(pk.rides[r.id].work) || 0)) / sp);
      if (!next || t < next.t - 1e-9) next = { ride: r, t };
    }
    const finishing = Boolean(next && next.t <= remaining + 1e-9);
    const t = finishing ? Math.max(0, next.t) : remaining;
    for (const r of PARK_RIDES) {
      const sp = speeds[r.id];
      if (!(sp > 0) || (finishing && r.id === next.ride.id)) continue;
      pk.rides[r.id].work = Math.min(r.roundMin * 60, (Number(pk.rides[r.id].work) || 0) + sp * t);
    }
    decay(t);
    remaining = Math.max(0, remaining - t);
    if (!finishing) break;
    // `remaining` is in SECONDS: the round finished `remaining` s before the end of the step → convert to ms for the timestamp.
    rounds.push(completeParkRound(state, pk, next.ride, { ...opts, atMs: nowMs - remaining * 1000 }));
  }
  const ticketsFull = (pk.tickets || 0) >= PARK_TICKET_CAP;
  if (ticketsFull && !ticketsFullBefore && rounds.length) parkPushLog(pk, `【售票亭满了】门票攒满 ${PARK_TICKET_CAP} 张，办一场游园活动或兑换礼包吧（满了以后新门票会流失）`);
  const starsAfter = getParkStars(pk.totalVisitors);
  return {
    rounds,
    visitors: rounds.reduce((s, r) => s + r.visitors, 0),
    ticketsAdded: rounds.reduce((s, r) => s + r.tickets, 0),
    ticketsLost: rounds.reduce((s, r) => s + r.lost, 0),
    expiredBuffs,
    newStars: starsAfter > starsBefore ? starsAfter : 0,
    unlockedRides: rounds.flatMap((r) => r.unlockedRides),
    ticketsFull: ticketsFull && !ticketsFullBefore,
  };
}

/** Puts an idle partner on a ride, or — when the partner already operates any ride — lets it go home (换班). */
export function assignParkOperator(state, rideId, monId, opts = {}) {
  const pk = ensureCloudParkState(state);
  if (!pk) return { ok: false, reason: "invalid_state" };
  const id = Math.floor(Number(monId) || 0);
  if (id <= 0) return { ok: false, reason: "invalid_mon" };
  const list = Array.isArray(state.mons?.list) ? state.mons.list : [];
  const cur = PARK_RIDE_IDS.find((rid) => pk.operators[rid] === id);
  if (cur) {
    pk.operators[cur] = 0;
    parkPushLog(pk, `【换班】${list.find((m) => m && m.id === id)?.name || "伙伴"} 离开了「${getParkRideDef(cur)?.name || "游乐设施"}」的操作台`);
    return { ok: true, operating: false, rideId: cur };
  }
  const ride = getParkRideDef(rideId);
  if (!ride) return { ok: false, reason: "unknown_ride" };
  if (!isParkRideUnlocked(state, ride.id)) return { ok: false, reason: "ride_locked", needVisitors: ride.unlockVisitors };
  if (pk.operators[ride.id]) return { ok: false, reason: "ride_full" };
  const mon = getIdleParkCandidates(state).find((m) => m.id === id);
  if (!mon) return { ok: false, reason: "mon_busy" };
  pk.operators[ride.id] = id;
  const ev = evaluateParkOperator(mon, ride.id, opts);
  parkPushLog(pk, `【上岗值班】${mon.name || "伙伴"} 握住了「${ride.name}」的操作杆${ev.match ? "（属性契合）" : ""}，值班期间防放生保护生效`);
  return { ok: true, operating: true, rideId: ride.id, match: ev.match };
}

/** 「一键排班」: fills every unlocked empty ride — the fastest (ride, partner) pairs first, so matched partners land on their own ride. */
export function autoStaffCloudPark(state, opts = {}) {
  const pk = ensureCloudParkState(state);
  if (!pk) return { ok: false, added: [] };
  const idle = getIdleParkCandidates(state);
  const pairs = [];
  PARK_RIDES.forEach((r, rIdx) => {
    if (pk.operators[r.id] || !isParkRideUnlocked(state, r.id)) return;
    for (const m of idle) pairs.push({ r, rIdx, m, ev: evaluateParkOperator(m, r.id, opts) });
  });
  pairs.sort(
    (a, b) =>
      b.ev.speed - a.ev.speed ||
      Math.floor(Number(b.m.lvl) || 1) - Math.floor(Number(a.m.lvl) || 1) ||
      (a.m.id || 0) - (b.m.id || 0) ||
      a.rIdx - b.rIdx,
  );
  const usedM = new Set();
  const added = [];
  for (const p of pairs) {
    if (usedM.has(p.m.id) || pk.operators[p.r.id]) continue;
    pk.operators[p.r.id] = p.m.id;
    usedM.add(p.m.id);
    added.push({ rideId: p.r.id, monId: p.m.id, match: p.ev.match });
  }
  if (added.length) {
    parkPushLog(pk, `【一键排班】${added.length} 位伙伴到游乐设施值班（属性契合 ${added.filter((a) => a.match).length} 座，值班期间防放生保护生效）`);
  }
  const openRides = PARK_RIDES.filter((r) => isParkRideUnlocked(state, r.id));
  const full = openRides.every((r) => pk.operators[r.id]);
  return { ok: added.length > 0, reason: added.length ? "" : full ? "rides_full" : "no_idle_mons", added };
}

/** 「全部换班」: every operator goes home (the half-turned rounds wait). */
export function dismissParkOperators(state) {
  const pk = ensureCloudParkState(state);
  if (!pk) return { ok: false, dismissed: 0 };
  let dismissed = 0;
  for (const rid of PARK_RIDE_IDS) {
    if (pk.operators[rid]) dismissed += 1;
    pk.operators[rid] = 0;
  }
  if (dismissed) parkPushLog(pk, `【全部换班】${dismissed} 位伙伴交接了操作台回家休息，设施停在原地等下一班`);
  return { ok: dismissed > 0, dismissed };
}

/** 「游园活动」: spends tickets, lights the event's timed buff (base 30 min × satisfaction multiplier, ≤4h) and lifts satisfaction +8. */
export function launchParkEvent(state, eventId, opts = {}) {
  const pk = ensureCloudParkState(state);
  if (!pk) return { ok: false, reason: "invalid_state" };
  const def = getParkEventDef(eventId);
  if (!def) return { ok: false, reason: "unknown_event" };
  if ((pk.tickets || 0) < def.cost) return { ok: false, reason: "not_enough_tickets", need: def.cost };
  const before = Number(pk.buffs[def.id]) || 0;
  if (before >= PARK_BUFF_MAX_SEC - 1) return { ok: false, reason: "buff_full" };
  const tier = getParkSatisfactionTier(pk.satisfaction);
  const addSec = Math.round(def.baseMin * 60 * tier.eventMul);
  pk.tickets -= def.cost;
  pk.buffs[def.id] = Math.min(PARK_BUFF_MAX_SEC, before + addSec);
  pk.satisfaction = Math.min(PARK_SAT_MAX, (Number(pk.satisfaction) || 0) + PARK_EVENT_SAT_GAIN);
  pk.totalEvents = (pk.totalEvents || 0) + 1;
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  pk.lastEvent = { eventId: def.id, addSec, eventMul: tier.eventMul, at: nowMs };
  const logLine = `【游园活动】「${def.name}」开场（门票 -${def.cost}），${def.effectText} 续上 ${Math.round(addSec / 60)} 分钟${tier.eventMul > 1 ? `（满意度「${tier.name}」×${tier.eventMul}）` : ""}`;
  parkPushLog(pk, logLine);
  return { ok: true, eventId: def.id, addSec, eventMul: tier.eventMul, remainingSec: pk.buffs[def.id], capped: before + addSec > PARK_BUFF_MAX_SEC, logLine };
}

/** 「门票兑换礼包」: 50 tickets → 灵果 120 + 灵木 60 + 未来币 4. */
export function exchangeParkTickets(state, opts = {}) {
  const pk = ensureCloudParkState(state);
  if (!pk) return { ok: false, reason: "invalid_state" };
  if ((pk.tickets || 0) < PARK_GIFT_COST) return { ok: false, reason: "not_enough_tickets", need: PARK_GIFT_COST };
  pk.tickets -= PARK_GIFT_COST;
  for (const [rid, n] of Object.entries(PARK_GIFT_REWARDS)) addResDirect(state, rid, n, opts);
  pk.totalGifts = (pk.totalGifts || 0) + 1;
  const txt = Object.entries(PARK_GIFT_REWARDS)
    .map(([rid, n]) => `${PARK_RES_ZH[rid] || rid} +${n}`)
    .join("、");
  const logLine = `【门票兑换】${PARK_GIFT_COST} 张门票换成了游乐园礼包：${txt}`;
  parkPushLog(pk, logLine);
  return { ok: true, rewards: { ...PARK_GIFT_REWARDS }, logLine };
}

export function getParkShowFreeLeft(state, nowMs = Date.now()) {
  const pk = state?.meta?.cloudPark;
  if (!pk || typeof pk !== "object") return PARK_SHOW_FREE_PER_DAY;
  if (pk.showDate !== localYmdForSandbox(nowMs)) return PARK_SHOW_FREE_PER_DAY;
  return Math.max(0, PARK_SHOW_FREE_PER_DAY - Math.floor(Number(pk.showUsed) || 0));
}

/** 「加场演出」: every operated (unlocked) ride turns one extra round at once. Free once per local day, then futurecoin ×20. */
export function performParkExtraShow(state, opts = {}) {
  const pk = ensureCloudParkState(state);
  if (!pk) return { ok: false, reason: "invalid_state" };
  const speeds = getParkRideSpeeds(state, opts);
  const running = PARK_RIDES.filter((r) => speeds[r.id] > 0);
  if (!running.length) return { ok: false, reason: "no_operators" };
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const today = localYmdForSandbox(nowMs);
  if (pk.showDate !== today) {
    pk.showDate = today;
    pk.showUsed = 0;
  }
  let costKind = "";
  if (pk.showUsed < PARK_SHOW_FREE_PER_DAY) {
    pk.showUsed += 1;
    costKind = "free_daily";
  } else if ((Number(state.res?.futurecoin?.value) || 0) >= PARK_SHOW_COIN_COST) {
    state.res.futurecoin.value = Math.max(0, Math.floor(state.res.futurecoin.value) - PARK_SHOW_COIN_COST);
    costKind = "futurecoin";
  } else {
    return { ok: false, reason: "insufficient_show_cost" };
  }
  const rounds = running.map((r) => completeParkRound(state, pk, r, { ...opts, nowMs }));
  const visitors = rounds.reduce((s, r) => s + r.visitors, 0);
  const logLine = `【加场演出】${running.map((r) => `「${r.short}」`).join("")}各加开一轮，又接待了 ${visitors} 位游客`;
  parkPushLog(pk, logLine);
  return { ok: true, costKind, rounds, visitors, logLine };
}

/** Forced release / star-up material: the partner leaves its ride. */
export function detachCloudParkOperator(state, monId) {
  const pk = state?.meta?.cloudPark;
  const id = Math.floor(Number(monId) || 0);
  if (!pk || typeof pk !== "object" || !pk.operators || typeof pk.operators !== "object" || id <= 0) return { ok: false, detached: false };
  let detached = false;
  for (const rid of PARK_RIDE_IDS) {
    if (Math.floor(Number(pk.operators[rid]) || 0) === id) {
      pk.operators[rid] = 0;
      detached = true;
    }
  }
  return { ok: true, detached };
}

/** Rebirth: every operator goes home (partner IDs reset); satisfaction, tickets, stars, rides' progress and buffs are kept. */
export function recallCloudParkForRebirth(state) {
  const pk = state?.meta?.cloudPark;
  if (!pk || typeof pk !== "object" || !pk.operators || typeof pk.operators !== "object") return { ok: false, recalled: 0 };
  let recalled = 0;
  for (const rid of PARK_RIDE_IDS) {
    if (Math.floor(Number(pk.operators[rid]) || 0) > 0) recalled += 1;
    pk.operators[rid] = 0;
  }
  return { ok: true, recalled };
}

/**
 * Pure non-mutating aggregator (wired into production / effects / breeding / PvE damage):
 * 永久 游乐园星级每星 全产 +0.4%、PvE +0.5%（★5 = 2% / 2.5%）；满意度每点 全产 +0.03%（满 100 = 3%）；
 * 限时 星空烟花秀 全产 +6% · 花车大游行 捕获 +1% · 魔法灯光秀 闪光 +8% · 勇者嘉年华 PvE +5%（单项 ≤4h）。
 */
export function computeCloudParkAura(state) {
  const raw = state?.meta?.cloudPark;
  const has = Boolean(raw && typeof raw === "object");
  const totalVisitors = has ? Math.max(0, Math.floor(Number(raw.totalVisitors) || 0)) : 0;
  const stars = getParkStars(totalVisitors);
  const sat = has ? Math.max(0, Math.min(PARK_SAT_MAX, Number(raw.satisfaction) || 0)) : 0;
  const satProdAdd = Math.floor(sat) * PARK_SAT_PROD_PER_POINT;
  const permProdAdd = stars * PARK_STAR_PROD_ADD;
  const permPveOutAdd = stars * PARK_STAR_PVE_ADD;
  let prodAdd = permProdAdd + satProdAdd;
  let catchAdd = 0;
  let shinyAdd = 0;
  let pveOutAdd = permPveOutAdd;
  const activeBuffs = [];
  const buffs = has && raw.buffs && typeof raw.buffs === "object" ? raw.buffs : {};
  for (const e of PARK_EVENT_DEFS) {
    const rem = Math.max(0, Math.min(PARK_BUFF_MAX_SEC, Number(buffs[e.id]) || 0));
    if (rem <= 0) continue;
    activeBuffs.push({ id: e.id, name: e.name, effectText: e.effectText, remainingSec: rem });
    if (e.stat === "prod") prodAdd += e.value;
    if (e.stat === "catch") catchAdd += e.value;
    if (e.stat === "shiny") shinyAdd += e.value;
    if (e.stat === "pveOut") pveOutAdd += e.value;
  }
  const round4 = (n) => Math.round(n * 10000) / 10000;
  return {
    stars,
    maxStars: PARK_MAX_STARS,
    title: getParkTitle(stars),
    nextStarAt: PARK_STAR_THRESHOLDS[stars] ?? null,
    totalVisitors,
    totalRounds: has ? Math.max(0, Math.floor(Number(raw.totalRounds) || 0)) : 0,
    satisfaction: sat,
    satTier: getParkSatisfactionTier(sat),
    tickets: has ? Math.max(0, Math.floor(Number(raw.tickets) || 0)) : 0,
    operators: has ? getCloudParkOperatorMonIds(state).size : 0,
    activeBuffs,
    satProdAdd: round4(satProdAdd),
    permProdAdd: round4(permProdAdd),
    permPveOutAdd: round4(permPveOutAdd),
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
 * ML-16 星空露营观测 lives in pve_tower.js, but its campers must join the shared away registry above
 * (collection_fun.js cannot import pve_tower.js without a cycle), so the non-mutating reader sits here.
 */
export const STARGAZE_SITE_COUNT = 3;
export const STARGAZE_SEATS = 2;
export const STARGAZE_MAX_CAMPERS = STARGAZE_SITE_COUNT * STARGAZE_SEATS;
/** Campsite names by index (the full table lives in pve_tower.js STARGAZE_SITES; kept in sync by ml16-selfcheck). */
export const STARGAZE_SITE_NAMES = Object.freeze(["萤火草坡", "镜湖星湾", "云巅观星台"]);

/** Non-mutating read: partners on a night camp (camping, or back at dawn with unclaimed records) — protected via the away registry. */
export function getStargazeCamperMonIds(state) {
  const ids = new Set();
  const sites = state?.meta?.stargazeCamp?.sites;
  if (!Array.isArray(sites)) return ids;
  const validSet = awayAliveIdSet(state);
  for (const site of sites.slice(0, STARGAZE_SITE_COUNT)) {
    const raw = site?.trip?.camperIds;
    if (!Array.isArray(raw)) continue;
    for (const v of raw.slice(0, STARGAZE_SEATS)) {
      const id = Math.floor(Number(v) || 0);
      if (id > 0 && (!validSet || validSet.has(id))) ids.add(id);
    }
  }
  return ids;
}

/** Idle partners that may go on a night camp (shared with every other outing). */
export function getIdleStargazeCandidates(state) {
  return listIdleOutingMons(state);
}

/**
 * ML-17 冰晶溜冰场 / 花田蜜蜂工坊 live in pve_tower.js; like the night camp, their partners join the shared away registry above
 * (collection_fun.js cannot import pve_tower.js without a cycle), so the non-mutating readers and the tables they need sit here.
 */
export const ICE_RINK_SLOTS = 3;
/** Program names by id (the full table lives in pve_tower.js ICE_RINK_PROGRAMS; kept in sync by ml17-selfcheck). */
export const ICE_RINK_PROGRAM_NAMES = Object.freeze({ snowWaltz: "雪花圆舞曲", auroraDuet: "极光双人滑", crystalTango: "冰晶探戈" });
export const BEE_HIVE_COUNT = 3;
export const BEE_SEATS = 2;
export const BEE_MAX_KEEPERS = BEE_HIVE_COUNT * BEE_SEATS;
/** Hive names by index (the full table lives in pve_tower.js BEE_HIVES; kept in sync by ml17-selfcheck). */
export const BEE_HIVE_NAMES = Object.freeze(["向阳蜂箱", "溪畔蜂箱", "林间蜂箱"]);

/** Non-mutating read: partners skating a program (rehearsing, or finished with an unclaimed score) — protected via the away registry. */
export function getIceRinkSkaterMonIds(state) {
  const ids = new Set();
  const raw = state?.meta?.iceRink?.show?.skaterIds;
  if (!Array.isArray(raw)) return ids;
  const validSet = awayAliveIdSet(state);
  for (const v of raw.slice(0, ICE_RINK_SLOTS)) {
    const id = Math.floor(Number(v) || 0);
    if (id > 0 && (!validSet || validSet.has(id))) ids.add(id);
  }
  return ids;
}

/** Non-mutating read: partners tending a hive (tending, or done with unclaimed honey) — protected via the away registry. */
export function getBeeKeeperMonIds(state) {
  const ids = new Set();
  const hives = state?.meta?.beeWorkshop?.hives;
  if (!Array.isArray(hives)) return ids;
  const validSet = awayAliveIdSet(state);
  for (const hive of hives.slice(0, BEE_HIVE_COUNT)) {
    const raw = hive?.trip?.keeperIds;
    if (!Array.isArray(raw)) continue;
    for (const v of raw.slice(0, BEE_SEATS)) {
      const id = Math.floor(Number(v) || 0);
      if (id > 0 && (!validSet || validSet.has(id))) ids.add(id);
    }
  }
  return ids;
}

/** Idle partners that may skate or tend hives (shared with every other outing). */
export function getIdleIceRinkCandidates(state) {
  return listIdleOutingMons(state);
}

export function getIdleBeeCandidates(state) {
  return listIdleOutingMons(state);
}
