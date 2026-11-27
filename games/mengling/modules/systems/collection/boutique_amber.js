// collection/boutique_amber.js — ML-7 星辉造型屋 · ML-8 远古琥珀复苏所（由 collection_fun.js 原样拆出，对外仍从 ../collection_fun.js 引用）

import { ensureStarCampState, localYmdForSandbox } from "./camp.js";

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
  spa: "灵攻",
  spd: "灵防",
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
    desc: "消耗星冠殿堂奖励：闪光祈愿星砂 ×3 + 未来币 ×40 → 萃炼 +5 远古基因琥珀",
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
  const logLine = `【基因潜能淬炼】${mon.name || "伙伴"} 的${AMBER_IV_STAT_ZH[chosenKey] || chosenKey}资质提升 +${afterIv - beforeIv}（${beforeIv} → ${afterIv}，总个体 ${totalIv}/186）！`;
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
