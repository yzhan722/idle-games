// sprites.js — 萌灵立绘
// 只用本地立绘（assets/beasts、assets/beasts_shiny）；缺图或图鉴外的旧物种退回爪印徽记。
// 旧版按物种画的矢量兜底造型与第三方作品角色雷同，已整体移除（ML-COM1），不要再加回来。

import { escapeHtml } from "./utils.js";

export const BEAST_FALLBACK_ART = "./assets/ui_icons/tab_mons.webp";

const pad3 = (n) => String(n).padStart(3, "0");

const getTier = (dex) => {
  const v = globalThis.BEAST_TIER?.[`p${pad3(dex)}`];
  return typeof v === "string" ? v : "common";
};

let evoStageCache = null;
let evoRootCache = null;
function ensureEvoCaches() {
  const evo = globalThis.BEAST_EVO;
  if (!evo || typeof evo !== "object") {
    return { stageMap: new Map(), rootMap: new Map() };
  }
  if (evoStageCache && evoRootCache) {
    return { stageMap: evoStageCache, rootMap: evoRootCache };
  }
  const parentOf = new Map();
  for (const [fromPid, list] of Object.entries(evo)) {
    if (!Array.isArray(list)) continue;
    for (const toPid of list) {
      if (!parentOf.has(toPid)) parentOf.set(toPid, fromPid);
    }
  }
  const stageMap = new Map();
  const rootMap = new Map();
  const allPids = new Set([...Object.keys(evo), ...parentOf.keys()]);
  for (const pid of allPids) {
    let cur = pid;
    let depth = 0;
    const seen = new Set([cur]);
    while (parentOf.has(cur) && depth < 5) {
      const p = parentOf.get(cur);
      if (seen.has(p)) break;
      seen.add(p);
      cur = p;
      depth += 1;
    }
    stageMap.set(pid, depth);
    rootMap.set(pid, cur);
  }
  evoStageCache = stageMap;
  evoRootCache = rootMap;
  return { stageMap, rootMap };
}

function getStageAndRoot(dex) {
  const pid = `p${pad3(dex)}`;
  const { stageMap, rootMap } = ensureEvoCaches();
  const rootPid = rootMap.get(pid) || pid;
  const rootDex = Number(rootPid.slice(1)) || dex;
  let stage = stageMap.get(pid) ?? 0;
  if (rootDex === 133 && dex !== 133) stage = 2;
  const evo = globalThis.BEAST_EVO;
  const isStandalone = !stageMap.has(pid) && !(evo && evo[pid]);
  const tier = getTier(dex);
  if (isStandalone && (tier === "epic" || dex === 150 || dex === 151)) stage = 2;
  else if (isStandalone && (tier === "rare" || dex === 131 || dex === 143)) stage = 1;
  return { stage: Math.min(2, stage), rootDex, tier };
}

let rosterSetCache = null;
const hasLocalHdArt = (dex, isShiny) => {
  const set = isShiny ? globalThis.BEAST_HD_SHINY_DEX : globalThis.BEAST_HD_DEX;
  if (set && typeof set.has === "function") return set.has(Number(dex));
  if (!rosterSetCache && Array.isArray(globalThis.BEAST_ROSTER)) {
    rosterSetCache = new Set(globalThis.BEAST_ROSTER.map(Number));
  }
  return rosterSetCache ? rosterSetCache.has(Number(dex)) : true;
};

const localArtUrl = (dex, isShiny) =>
  isShiny ? `./assets/beasts_shiny/${pad3(dex)}.png` : `./assets/beasts/${pad3(dex)}.png`;

export function installSpriteHandlers() {
  if (typeof globalThis.__beastSpriteOnError !== "function") {
    globalThis.__beastSpriteOnError = (img) => {
      try {
        img.onerror = null;
        img.src = BEAST_FALLBACK_ART;
      } catch {
        try { img?.remove?.(); } catch { /* ignore */ }
      }
    };
  }
}

export const renderBeastIcon = (dex, alt, isShiny = false) => {
  const a = escapeHtml(alt ?? "");
  const d = Number(dex) || 1;
  const src = hasLocalHdArt(d, isShiny) ? localArtUrl(d, isShiny) : BEAST_FALLBACK_ART;
  const { stage, tier } = getStageAndRoot(d);
  const extraCls = `${isShiny ? " mon-icon--shiny" : ""}${tier === "epic" ? " mon-icon--epic" : stage >= 2 ? " mon-icon--stage3" : ""}`;
  return `<img class="mon-icon${extraCls}" src="${src}" data-dex="${escapeHtml(
    String(d),
  )}" data-shiny="${isShiny ? 1 : 0}" alt="${a}" loading="eager" decoding="async" onerror="globalThis.__beastSpriteOnError && globalThis.__beastSpriteOnError(this)" />`;
};
