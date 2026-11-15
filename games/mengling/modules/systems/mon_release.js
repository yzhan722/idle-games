import { getEvoFamilyId } from "../evo_utils.js";
import { monPower } from "../mons.js";
import {
  getAmberImprintedMonIds,
  getBoutiqueStyledMonIds,
  unequipBoutiqueStyle,
  unequipMonPrimalImprints,
} from "./collection_fun.js";

export const BOX_SOFT_LIMIT = 120;
export const BOX_RELEASE_BATCH = 24;
const KEEP_TIERS = new Set(["rare", "epic", "legendary"]);

export function releaseCandyRefund(power) {
  const p = typeof power === "number" && Number.isFinite(power) ? power : 0;
  return Math.max(0, Math.floor(p / 100));
}

/** Ids of mons busy in train / expedition / pve / breed / ecoSandbox / starCamp — skip on batch release. */
export function busyMonIds(state) {
  const ids = new Set();
  for (const id of state?.training?.activeIds || []) if (id != null) ids.add(id);
  for (const id of state?.expedition?.selectedIds || []) if (id != null) ids.add(id);
  for (const id of state?.expedition?.activeIds || []) if (id != null) ids.add(id);
  for (const id of state?.pve?.selectedIds || []) if (id != null) ids.add(id);
  if (state?.pve?.dualSanctum?.primaryId != null) ids.add(state.pve.dualSanctum.primaryId);
  if (state?.pve?.dualSanctum?.partnerId != null) ids.add(state.pve.dualSanctum.partnerId);
  const breed = state?.breeding;
  if (breed && typeof breed === "object") {
    for (const id of breed.parentIds || breed.parents || []) if (id != null) ids.add(id);
    if (breed.aId != null) ids.add(breed.aId);
    if (breed.bId != null) ids.add(breed.bId);
  }
  const ecoZones = state?.meta?.ecoSandbox?.zones;
  if (ecoZones && typeof ecoZones === "object") {
    for (const z of Object.values(ecoZones)) {
      if (!z || typeof z !== "object") continue;
      for (const id of z.squadIds || []) if (id != null) ids.add(id);
      for (const id of z.stagedIds || []) if (id != null) ids.add(id);
    }
  }
  const campIds = state?.meta?.starCamp?.stationedIds;
  if (Array.isArray(campIds)) {
    for (const id of campIds) if (id != null) ids.add(id);
  }
  const leagueSquadIds = state?.pve?.championLeague?.squadIds;
  if (Array.isArray(leagueSquadIds)) {
    for (const id of leagueSquadIds) if (id != null) ids.add(id);
  }
  const corridorSquadIds = state?.pve?.starCorridor?.squadIds;
  if (Array.isArray(corridorSquadIds)) {
    for (const id of corridorSquadIds) if (id != null) ids.add(id);
  }
  for (const id of getBoutiqueStyledMonIds(state)) {
    if (id != null) ids.add(id);
  }
  for (const id of getAmberImprintedMonIds(state)) {
    if (id != null) ids.add(id);
  }
  const natalId = state?.meta?.natalBondMonId;
  if (typeof natalId === "number" && Number.isFinite(natalId) && natalId > 0) {
    ids.add(Math.floor(natalId));
  }
  return ids;
}

/** Weakest mon ids to drop when box exceeds soft limit. */
export function pickWeakMonIds(list, opts = {}) {
  const softLimit = opts.softLimit ?? BOX_SOFT_LIMIT;
  const batch = opts.batch ?? BOX_RELEASE_BATCH;
  const protect = opts.protectIds ?? new Set();
  if (!Array.isArray(list) || list.length <= softLimit) return [];
  const speciesCounts = opts.smartProtect
    ? list.reduce((counts, m) => {
        if (m?.pid) counts.set(m.pid, (counts.get(m.pid) || 0) + 1);
        return counts;
      }, new Map())
    : null;
  const familyCounts = opts.smartProtect
    ? list.reduce((counts, m) => {
        const fam = getEvoFamilyId(m?.pid);
        if (fam) counts.set(fam, (counts.get(fam) || 0) + 1);
        return counts;
      }, new Map())
    : null;
  const ranked = list
    .filter(
      (m) =>
        m &&
        !protect.has(m.id) &&
        (!opts.smartProtect ||
          (!m.isShiny &&
            !KEEP_TIERS.has(m.tier) &&
            Math.max(0, Math.floor(m.stars || 0)) === 0 &&
            Math.max(0, Math.floor(m.hallOfFameRibbons || 0)) === 0 &&
            (!m.pid || (speciesCounts.get(m.pid) || 0) > 1) &&
            (!m.pid || (familyCounts.get(getEvoFamilyId(m.pid)) || 0) > 1)))
    )
    .slice()
    .sort((a, b) => monPower(a) - monPower(b) || (a.lvl || 1) - (b.lvl || 1));
  const dropN = Math.min(batch, list.length - softLimit);
  if (!opts.smartProtect) return ranked.slice(0, dropN).map((m) => m.id);

  const remainingSpecies = new Map(speciesCounts);
  const remainingFamily = new Map(familyCounts);
  const ids = [];
  for (const mon of ranked) {
    if (ids.length >= dropN) break;
    const fam = getEvoFamilyId(mon.pid);
    if (mon.pid && (remainingSpecies.get(mon.pid) || 0) <= 1) continue;
    if (fam && (remainingFamily.get(fam) || 0) <= 1) continue;
    ids.push(mon.id);
    if (mon.pid) remainingSpecies.set(mon.pid, (remainingSpecies.get(mon.pid) || 0) - 1);
    if (fam) remainingFamily.set(fam, (remainingFamily.get(fam) || 0) - 1);
  }
  return ids;
}

/** Remove mons by id; returns { removed, candy, sampleNames }. */
export function releaseMonIds(state, ids, ctx = {}) {
  const idSet = new Set(Array.isArray(ids) ? ids : []);
  if (!idSet.size || !state?.mons?.list) return { removed: 0, candy: 0, sampleNames: [] };
  const { addRes } = ctx;
  const protectSet = ctx?.protectIds instanceof Set ? ctx.protectIds : null;
  let candy = 0;
  const sampleNames = [];
  let removed = 0;
  state.mons.list = state.mons.list.filter((m) => {
    if (!m || !idSet.has(m.id)) return true;
    if (protectSet && protectSet.has(m.id)) return true;
    unequipBoutiqueStyle(state, m.id);
    unequipMonPrimalImprints(state, m.id);
    candy += releaseCandyRefund(monPower(m));
    if (sampleNames.length < 3) sampleNames.push(m.name || "未知萌灵");
    removed += 1;
    return false;
  });
  if (candy > 0 && typeof addRes === "function") addRes("rareCandy", candy);
  return { removed, candy, sampleNames };
}
