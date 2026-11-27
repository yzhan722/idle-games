// collection/camp.js — ML-5 秘境生态沙盘 · ML-6 星界露营野餐屋（由 collection_fun.js 原样拆出，对外仍从 ../collection_fun.js 引用）

import { resolveDexTypes } from "./core.js";
import { getAwayMonIds } from "./away_registry.js";

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

export function localYmdForSandbox(nowMs = Date.now()) {
  const d = new Date(nowMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getEcoZoneDef(zoneId) {
  return ECO_SANDBOX_ZONES.find((z) => z.id === zoneId) || null;
}

export function normalizeIdList(arr, maxLen = 3, aliveSet = null) {
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

export function resolveMonTypesForEco(mon, opts = {}) {
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
  hardy: "踏实", lonely: "独处", brave: "豪爽", adamant: "倔强", naughty: "捣蛋",
  bold: "敢闯", docile: "老实", relaxed: "慵懒", impish: "机灵", lax: "随缘",
  timid: "怯生", hasty: "风火", serious: "较真", jolly: "爱笑", naive: "好奇",
  modest: "文静", mild: "慢热", quiet: "沉静", bashful: "腼腆", rash: "冒失",
  calm: "恬静", gentle: "暖心", sassy: "傲娇", careful: "心细", quirky: "善变",
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
