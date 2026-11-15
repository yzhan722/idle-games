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



