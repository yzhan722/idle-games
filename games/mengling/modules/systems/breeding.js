/** Breeding & Eugenics 2.0 — high-IV / star / locked-ability inheritance + dynamic shiny odds & pity chain. */

import { pickBreedEventCard } from "./expedition.js";
import { noteShinySpecies } from "./collection_fun.js";
import { ABILITIES, ensureMonAbility, getAbilityInfo, LEGACY_NATURE_TO_ABILITY } from "../abilities.js";
import { clampStar } from "../stars.js";

export const IV_KEYS = Object.freeze(["hp", "atk", "def", "spa", "spd", "spe"]);
export const SHINY_BASE_DENOM = 4096;
export const SHINY_SOFT_PITY_START = 120;
export const SHINY_PITY_CAP = 200;

export function normalizeAbilityLock(val) {
  return val === "a" || val === "b" ? val : "auto";
}

export function ensureBreedingState(state) {
  if (!state.breeding || typeof state.breeding !== "object") {
    state.breeding = {
      on: false,
      aId: null,
      bId: null,
      eggRemainingSec: 0,
      eggTotalSec: 0,
      abilityLock: "auto",
      shinyPity: 0,
    };
    return state.breeding;
  }
  state.breeding.abilityLock = normalizeAbilityLock(state.breeding.abilityLock);
  const pity = state.breeding.shinyPity;
  state.breeding.shinyPity =
    typeof pity === "number" && Number.isFinite(pity) ? Math.max(0, Math.floor(pity)) : 0;
  return state.breeding;
}

function defaultGetMonById(mons, monById, id) {
  if (!id) return null;
  if (monById && typeof monById.get === "function") return monById.get(id) ?? null;
  const list = Array.isArray(mons?.list) ? mons.list : Array.isArray(mons) ? mons : [];
  return list.find((m) => m && m.id === id) ?? null;
}

function fallbackGetBasePid(pid) {
  if (!pid || typeof pid !== "string") return null;
  const evo = globalThis.BEAST_EVO;
  if (!evo || typeof evo !== "object") return pid;
  const prev = {};
  for (const [from, tos] of Object.entries(evo)) {
    if (!Array.isArray(tos)) continue;
    for (const to of tos) {
      if (typeof to === "string" && !prev[to]) prev[to] = from;
    }
  }
  let cur = pid;
  let guard = 0;
  while (prev[cur] && guard < 6) {
    cur = prev[cur];
    guard += 1;
  }
  return cur;
}

export function resolvePairBasePid(a, b, deps = {}) {
  if (!a?.pid || !b?.pid) return null;
  const getBasePid = typeof deps.getBasePid === "function" ? deps.getBasePid : fallbackGetBasePid;
  const sameFamily =
    typeof deps.sameFamily === "function"
      ? deps.sameFamily
      : (pa, pb) => Boolean(pa && pb && getBasePid(pa) === getBasePid(pb));
  const dittoPid = "p132";
  if (a.pid === dittoPid && b.pid !== dittoPid) return getBasePid(b.pid);
  if (b.pid === dittoPid && a.pid !== dittoPid) return getBasePid(a.pid);
  if (sameFamily(a.pid, b.pid)) return getBasePid(a.pid);
  return null;
}

export function sumMonIv(mon) {
  const iv = mon?.iv && typeof mon.iv === "object" ? mon.iv : null;
  if (!iv) return 0;
  let total = 0;
  for (const k of IV_KEYS) {
    const v = iv[k];
    if (typeof v === "number" && Number.isFinite(v)) {
      total += Math.max(0, Math.min(31, Math.floor(v)));
    }
  }
  return total;
}

export function ivGradeTag(ivSum) {
  const s = Math.max(0, Math.floor(ivSum || 0));
  if (s >= 162) return "S+ 天品";
  if (s >= 142) return "S 极品";
  if (s >= 116) return "A 优品";
  if (s >= 88) return "B 良品";
  return "C 凡品";
}

export function resolveParentAbilityId(mon) {
  if (!mon || typeof mon !== "object") return null;
  if (typeof mon.ability === "string" && ABILITIES[mon.ability]) return mon.ability;
  const legacy = typeof mon.nature === "string" ? LEGACY_NATURE_TO_ABILITY[mon.nature] : null;
  return legacy && ABILITIES[legacy] ? legacy : null;
}

export function countDexUniqueCaught(state) {
  const caught = state?.dex?.caught;
  if (!caught || typeof caught !== "object") return 0;
  let n = 0;
  for (const v of Object.values(caught)) {
    if (v) n += 1;
  }
  return n;
}

export function computeDexShinyCharmTier(dexUnique) {
  const u = Math.max(0, Math.floor(dexUnique || 0));
  if (u >= 160) return { rolls: 5, label: "圆满星虹圣契 (+5判)", nextReq: null };
  if (u >= 120) return { rolls: 3, label: "大师虹彩圣印 (+3判)", nextReq: 160 };
  if (u >= 80) return { rolls: 2, label: "中阶虹辉印 (+2判)", nextReq: 120 };
  if (u >= 30) return { rolls: 1, label: "初阶虹辉印 (+1判)", nextReq: 80 };
  return { rolls: 0, label: `未凝聚（${u}/30 图鉴解锁）`, nextReq: 30 };
}

/**
 * Compute dynamic breeding shiny probability from Dex milestones, active Shiny Charm,
 * shiny parents, and consecutive non-shiny hatch pity chain.
 */
export function computeBreedingShinyInfo(state, parentA = null, parentB = null, opts = {}) {
  const dexUnique =
    typeof opts.dexUnique === "number" && Number.isFinite(opts.dexUnique)
      ? Math.max(0, Math.floor(opts.dexUnique))
      : countDexUniqueCaught(state);
  const dexTier = computeDexShinyCharmTier(dexUnique);
  const dexRolls = dexTier.rolls;

  const charmRem =
    typeof state?.shinyCharmRemainingSec === "number" && Number.isFinite(state.shinyCharmRemainingSec)
      ? state.shinyCharmRemainingSec
      : 0;
  const charmActive = charmRem > 0;
  const charmRolls = charmActive ? 3 : 0;

  const shinyParentsCount = (parentA?.isShiny ? 1 : 0) + (parentB?.isShiny ? 1 : 0);
  const parentRolls = shinyParentsCount === 2 ? 8 : shinyParentsCount === 1 ? 4 : 0;

  const pity =
    typeof state?.breeding?.shinyPity === "number" && Number.isFinite(state.breeding.shinyPity)
      ? Math.max(0, Math.floor(state.breeding.shinyPity))
      : 0;
  const pityRolls = Math.min(12, Math.floor(pity / 15));

  const totalRolls = 1 + dexRolls + charmRolls + parentRolls + pityRolls;
  const shinyChanceMul =
    typeof opts.shinyChanceMul === "number" && Number.isFinite(opts.shinyChanceMul)
      ? Math.max(0, opts.shinyChanceMul)
      : 1;

  const softPityBonus =
    pity >= SHINY_SOFT_PITY_START && pity < SHINY_PITY_CAP
      ? ((pity - SHINY_SOFT_PITY_START + 1) / (SHINY_PITY_CAP - SHINY_SOFT_PITY_START + 1)) * 0.12
      : 0;

  const rate =
    pity >= SHINY_PITY_CAP
      ? 1
      : Math.min(1, Math.max(0, (totalRolls / SHINY_BASE_DENOM) * shinyChanceMul + softPityBonus));

  const oddsDenom = rate > 0 ? Math.max(1, Math.round(1 / rate)) : SHINY_BASE_DENOM;
  const pct = rate * 100;
  const pctText = pct >= 10 ? pct.toFixed(1) : pct >= 0.1 ? pct.toFixed(2) : pct.toFixed(3);

  return {
    rate,
    oddsDenom,
    pctText,
    totalRolls,
    dexUnique,
    dexTier,
    dexRolls,
    charmActive,
    charmRolls,
    shinyParentsCount,
    parentRolls,
    pity,
    pityCap: SHINY_PITY_CAP,
    pityRolls,
    softPityActive: pity >= SHINY_SOFT_PITY_START,
  };
}

export function getInheritedIvKeyCount(state) {
  const lvl = Math.max(1, Math.floor(state?.buildings?.breedingHouse?.owned ?? 1));
  if (lvl >= 8) return 5;
  if (lvl >= 5) return 4;
  return 3;
}

export function computeStarInheritanceBounds(parentA, parentB) {
  const sA = clampStar(parentA?.stars);
  const sB = clampStar(parentB?.stars);
  const sumS = sA + sB;
  const maxS = Math.max(sA, sB);
  const guaranteedStars = Math.min(3, Math.floor(sumS / 3));
  const bonusStarChance =
    maxS > guaranteedStars ? Math.min(0.85, 0.22 * maxS + 0.08 * Math.min(sA, sB)) : 0;
  const maxStarsOut = Math.min(3, Math.min(maxS, guaranteedStars + (bonusStarChance > 0 ? 1 : 0)));
  return { sA, sB, guaranteedStars, maxStarsOut, bonusStarChance };
}

export function computeBreedingPreview(state, parentA, parentB, opts = {}) {
  const abilityLock = normalizeAbilityLock(opts.abilityLock ?? state?.breeding?.abilityLock);
  const shinyInfo = computeBreedingShinyInfo(state, parentA, parentB, opts);
  const inheritedIvCount = getInheritedIvKeyCount(state);

  const abIdA = resolveParentAbilityId(parentA);
  const abIdB = resolveParentAbilityId(parentB);
  const abInfoA = abIdA ? getAbilityInfo(abIdA) : null;
  const abInfoB = abIdB ? getAbilityInfo(abIdB) : null;

  let abilityPreviewText = "双亲优选遗传 (70% 承袭双亲特性)";
  if (abilityLock === "a") {
    abilityPreviewText = abInfoA
      ? `已锁定伙伴 A「${abInfoA.name}」（${abInfoA.desc}）`
      : "已选锁定伙伴 A（待配对后生效）";
  } else if (abilityLock === "b") {
    abilityPreviewText = abInfoB
      ? `已锁定伙伴 B「${abInfoB.name}」（${abInfoB.desc}）`
      : "已选锁定伙伴 B（待配对后生效）";
  } else if (abInfoA && abInfoB) {
    abilityPreviewText =
      abIdA === abIdB
        ? `双亲同源「${abInfoA.name}」（70% 稳定承袭）`
        : `优选承袭「${abInfoA.name}」/「${abInfoB.name}」（70% 遗传）`;
  }

  if (!parentA || !parentB) {
    return {
      hasPair: false,
      eligible: false,
      basePid: null,
      offspringSpecies: null,
      inheritedIvCount,
      ivSumA: parentA ? sumMonIv(parentA) : 0,
      ivSumB: parentB ? sumMonIv(parentB) : 0,
      expectedMinIvSum: 0,
      expectedMaxIvSum: 186,
      starBounds: computeStarInheritanceBounds(parentA, parentB),
      abilityLock,
      abIdA,
      abIdB,
      abInfoA,
      abInfoB,
      abilityPreviewText,
      shinyInfo,
    };
  }

  const basePid = resolvePairBasePid(parentA, parentB, opts);
  const eligible = Boolean(basePid);
  const offspringSpecies =
    basePid && typeof opts.getSpeciesByPid === "function" ? opts.getSpeciesByPid(basePid) : null;

  const ivA = parentA.iv && typeof parentA.iv === "object" ? parentA.iv : {};
  const ivB = parentB.iv && typeof parentB.iv === "object" ? parentB.iv : {};
  const highs = IV_KEYS.map((k) => Math.max(0, Math.min(31, Math.max(ivA[k] ?? 12, ivB[k] ?? 12)))).sort((x, y) => y - x);
  const floors = IV_KEYS.map((k) => Math.min(24, Math.floor(((ivA[k] ?? 10) + (ivB[k] ?? 10)) * 0.35))).sort((x, y) => x - y);

  let expectedMinIvSum = 0;
  for (let i = 0; i < inheritedIvCount; i += 1) {
    expectedMinIvSum += highs[highs.length - 1 - i] ?? 12;
  }
  for (let i = 0; i < 6 - inheritedIvCount; i += 1) {
    expectedMinIvSum += floors[i] ?? 8;
  }
  let expectedMaxIvSum = 0;
  for (let i = 0; i < inheritedIvCount; i += 1) {
    expectedMaxIvSum += Math.min(31, (highs[i] ?? 24) + 2);
  }
  expectedMaxIvSum += (6 - inheritedIvCount) * 31;

  return {
    hasPair: true,
    eligible,
    basePid,
    offspringSpecies,
    inheritedIvCount,
    ivSumA: sumMonIv(parentA),
    ivSumB: sumMonIv(parentB),
    expectedMinIvSum: Math.min(186, expectedMinIvSum),
    expectedMaxIvSum: Math.min(186, Math.max(expectedMinIvSum, expectedMaxIvSum)),
    starBounds: computeStarInheritanceBounds(parentA, parentB),
    abilityLock,
    abIdA,
    abIdB,
    abInfoA,
    abInfoB,
    abilityPreviewText,
    shinyInfo,
  };
}

export function rollEugenicsOffspringTraits(state, parentA, parentB, randFloat = Math.random) {
  const rf = typeof randFloat === "function" ? randFloat : Math.random;
  const inheritedCount = getInheritedIvKeyCount(state);

  const pool = IV_KEYS.slice();
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.max(0, Math.min(i, Math.floor(rf() * (i + 1))));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  const inheritedSet = new Set(pool.slice(0, inheritedCount));

  const ivA = parentA?.iv && typeof parentA.iv === "object" ? parentA.iv : {};
  const ivB = parentB?.iv && typeof parentB.iv === "object" ? parentB.iv : {};
  const iv = {};
  for (const k of IV_KEYS) {
    const va = typeof ivA[k] === "number" && Number.isFinite(ivA[k]) ? Math.max(0, Math.min(31, Math.floor(ivA[k]))) : 12;
    const vb = typeof ivB[k] === "number" && Number.isFinite(ivB[k]) ? Math.max(0, Math.min(31, Math.floor(ivB[k]))) : 12;
    if (inheritedSet.has(k)) {
      const hi = Math.max(va, vb);
      const lo = Math.min(va, vb);
      const picked = rf() < 0.8 ? hi : lo;
      const surge = Math.min(2, Math.floor(rf() * 3));
      iv[k] = Math.max(0, Math.min(31, picked + surge));
    } else {
      const floor = Math.min(24, Math.floor((va + vb) * 0.35));
      const span = Math.max(1, 32 - floor);
      iv[k] = Math.max(0, Math.min(31, floor + Math.floor(rf() * span)));
    }
  }

  const { guaranteedStars, bonusStarChance, sA, sB } = computeStarInheritanceBounds(parentA, parentB);
  const maxParentStars = Math.max(sA, sB);
  const bonusStar = bonusStarChance > 0 && rf() < bonusStarChance ? 1 : 0;
  const stars = Math.min(3, Math.min(maxParentStars, guaranteedStars + bonusStar));

  const lock = normalizeAbilityLock(state?.breeding?.abilityLock);
  const abA = resolveParentAbilityId(parentA) || ensureMonAbility(parentA);
  const abB = resolveParentAbilityId(parentB) || ensureMonAbility(parentB);
  let ability = null;
  if (lock === "a" && abA && ABILITIES[abA]) {
    ability = abA;
  } else if (lock === "b" && abB && ABILITIES[abB]) {
    ability = abB;
  } else if ((abA || abB) && rf() < 0.7) {
    const candidate = rf() < 0.5 ? abA || abB : abB || abA;
    if (candidate && ABILITIES[candidate]) ability = candidate;
  }

  return { iv, stars, ability, lockUsed: lock };
}

/**
 * Hatch the current breeding pair into one mon using Eugenics 2.0 inheritance & dynamic shiny odds.
 * @returns {boolean}
 */
export function hatchEgg(state, deps = {}) {
  if (!state || typeof state !== "object") return false;
  ensureBreedingState(state);
  const getMonById = typeof deps.getMonById === "function" ? deps.getMonById : defaultGetMonById;
  const getSpeciesByPid = deps.getSpeciesByPid;
  const createMonInstance = deps.createMonInstance;
  const randFloat = typeof deps.randFloat === "function" ? deps.randFloat : Math.random;
  const addLog = typeof deps.addLog === "function" ? deps.addLog : () => {};
  const addRes = typeof deps.addRes === "function" ? deps.addRes : () => {};
  const ui = deps.ui;
  const mons = deps.mons;
  const monById = deps.monById;

  const aId = typeof state.breeding.aId === "number" && Number.isFinite(state.breeding.aId) ? state.breeding.aId : null;
  const bId = typeof state.breeding.bId === "number" && Number.isFinite(state.breeding.bId) ? state.breeding.bId : null;
  if (!aId || !bId || aId === bId) return false;
  const a = getMonById(mons, monById, aId);
  const b = getMonById(mons, monById, bId);
  if (!a || !b) return false;

  const basePid = resolvePairBasePid(a, b, deps);
  if (!basePid) return false;

  const sp = typeof getSpeciesByPid === "function" ? getSpeciesByPid(basePid) : null;
  if (!sp) return false;
  if (typeof createMonInstance !== "function") return false;

  const traits = rollEugenicsOffspringTraits(state, a, b, randFloat);
  const mon = createMonInstance(sp, traits.ability ? { ability: traits.ability } : undefined);
  if (mon && typeof mon === "object") {
    mon.iv = traits.iv;
    if (traits.stars > 0) mon.stars = traits.stars;
    if (traits.ability && ABILITIES[traits.ability]) mon.ability = traits.ability;
  }

  const shinyInfo = computeBreedingShinyInfo(state, a, b, {
    shinyChanceMul: deps.shinyChanceMul,
    dexUnique: deps.dexUnique,
  });
  const shiny = randFloat() < shinyInfo.rate;
  if (shiny) {
    mon.isShiny = true;
    state.breeding.shinyPity = 0;
    addLog(`！！！闪光孵化：${sp.name}（概率 1/${shinyInfo.oddsDenom}）！！！`, true);
  } else {
    state.breeding.shinyPity = shinyInfo.pity + 1;
  }

  const prevHatch = typeof state.hatchCount === "number" && Number.isFinite(state.hatchCount) ? state.hatchCount : 0;
  state.hatchCount = Math.max(0, Math.floor(prevHatch)) + 1;
  if (shiny) {
    const prevShiny = typeof state.shinyCount === "number" && Number.isFinite(state.shinyCount) ? state.shinyCount : 0;
    state.shinyCount = Math.max(0, Math.floor(prevShiny)) + 1;
    const mile = noteShinySpecies(state, sp);
    if (mile?.item) {
      addRes(mile.item, 1);
      addLog(mile.label, true);
    }
  }
  if (!state.mons) state.mons = { nextId: 1, list: [] };
  if (!Array.isArray(state.mons.list)) state.mons.list = [];
  state.mons.list.push(mon);
  state.mons.nextId = Math.max(state.mons.nextId ?? 1, (mon?.id ?? 0) + 1);

  const ivSum = sumMonIv(mon);
  const abInfo = getAbilityInfo(mon?.ability);
  const detailTags = [`潜力 ${ivSum}/186`];
  if ((mon?.stars ?? 0) > 0) detailTags.push(`继承${mon.stars}星`);
  if (abInfo?.name) detailTags.push(`特性「${abInfo.name}」`);
  addLog(`生蛋成功：${sp.name} +1（${detailTags.join(" · ")}）`, true);

  const breedCard = pickBreedEventCard(randFloat);
  if (breedCard?.title) {
    addLog(`孵化奇遇：${breedCard.title} — ${breedCard.blurb}`, true);
    const fc = Math.max(0, Math.floor(breedCard.bonusFuturecoin || 0));
    if (fc > 0) addRes("futurecoin", fc);
  }
  if (ui) {
    ui.monsDirty = true;
    ui.functionsDirty = true;
    ui.dexDirty = true;
  }
  return true;
}
