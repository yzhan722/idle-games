/**
 * 转生（prestige/rebirth）元进度：灵珀结算 + 轮回加成树。
 * 状态存于 state.meta.legacy —— meta 不在 PRESTIGE_RESET_FIELDS 里，天然跨周目存活。
 * 轮回次数单一数据源 = state.era.prestigeCount（不建 meta.rebirths 冗余字段）。
 */
import { dexCaughtCount } from "./effects.js";

export const LEGACY_PERKS = {
  prod:             { name: "轮回余泽", desc: "全资源产出 +12%/级", max: 10, baseCost: 8, icon: "shinyCharm" },
  catch:            { name: "轮回灵契", desc: "捕获率 +4%/级", max: 10, baseCost: 8, icon: "luxuryball" },
  cap:              { name: "轮回仓廪", desc: "资源上限 +15%/级", max: 10, baseCost: 8, icon: "mineralSilo" },
  startTech:        { name: "轮回开物", desc: "转生后开局自带「灵果培育」「灵球基础」科技", max: 1, baseCost: 60, icon: "science" },
  starterMon:       { name: "轮回之缘", desc: "转生后开局赠一只稀有萌灵入队", max: 1, baseCost: 90, icon: "affectionTreat" },
  natalBond:        { name: "本命灵契", desc: "转生时保留 1 只缔契本命萌灵跨周目随行（重置为 Lv.1，保留闪光/星级/个体值/性格/特性/亲密）", max: 1, baseCost: 120, icon: "natalBond" },
  swiftHatch:       { name: "极速孵育", desc: "育灵屋孵蛋耗时 -12%/级（最高 -60%），破壳初始亲密 +6/级", max: 5, baseCost: 25, icon: "swiftHatch" },
  expeditionMaster: { name: "远征达人", desc: "次元远征耗时 -8%/级（最高 -40%），远征经验与未来币收益 +15%/级", max: 5, baseCost: 25, icon: "expeditionMaster" },
};
export const LEGACY_PERK_ORDER = [
  "prod",
  "catch",
  "cap",
  "startTech",
  "starterMon",
  "natalBond",
  "swiftHatch",
  "expeditionMaster",
];

/** 转生仪式门槛：需拥有至少 1 只闪光萌灵（图鉴门槛由悖梦主线 dex_unique 150 隐含）。 */
export const REBIRTH_SHINY_REQ = 1;

export function normalizeLegacy(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const perks = {};
  for (const id of Object.keys(LEGACY_PERKS)) {
    const lvl = typeof src.perks?.[id] === "number" ? src.perks[id] : 0;
    perks[id] = Math.max(0, Math.min(LEGACY_PERKS[id].max, Math.floor(lvl)));
  }
  const essence = typeof src.essence === "number" && Number.isFinite(src.essence) ? src.essence : 0;
  const earned = typeof src.essenceEarned === "number" && Number.isFinite(src.essenceEarned) ? src.essenceEarned : 0;
  return { essence: Math.max(0, Math.floor(essence)), essenceEarned: Math.max(0, Math.floor(earned)), perks };
}

export function ensureLegacy(state) {
  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  state.meta.legacy = normalizeLegacy(state.meta.legacy);
  return state.meta.legacy;
}

export function perkLevel(state, id) {
  const lvl = state?.meta?.legacy?.perks?.[id];
  return Math.max(0, Math.min(LEGACY_PERKS[id]?.max ?? 0, Math.floor(typeof lvl === "number" ? lvl : 0)));
}

export function perkCost(id, level) {
  const def = LEGACY_PERKS[id];
  return def ? def.baseCost * (Math.max(0, Math.floor(level)) + 1) : Infinity;
}

export function canBuyPerk(state, id) {
  const def = LEGACY_PERKS[id];
  if (!def) return false;
  const lvl = perkLevel(state, id);
  if (lvl >= def.max) return false;
  return (state?.meta?.legacy?.essence || 0) >= perkCost(id, lvl);
}

export function buyPerk(state, id) {
  const def = LEGACY_PERKS[id];
  if (!def) return { ok: false, reason: "unknown_perk" };
  const legacy = ensureLegacy(state);
  const lvl = legacy.perks[id];
  if (lvl >= def.max) return { ok: false, reason: "maxed" };
  const cost = perkCost(id, lvl);
  if (legacy.essence < cost) return { ok: false, reason: "essence", need: cost - legacy.essence };
  legacy.essence -= cost;
  legacy.perks[id] = lvl + 1;
  return { ok: true, level: lvl + 1, cost };
}

/**
 * 灵珀结算：主线全通基数 + 图鉴 + 闪光 + 速度加成 + 周目递增。
 * nowMs 显式传入便于 selfcheck 确定性。
 */
export function computeEssence(state, nowMs = Date.now()) {
  const { unique } = dexCaughtCount(state);
  const shiny = Math.max(0, Math.floor(state?.shinyCount || 0));
  const rebirths = Math.max(0, Math.floor(state?.era?.prestigeCount || 0));
  const cycleStart = state?.era?.cycleStartMs || state?.meta?.createdAt || 0;
  const cycleMs = cycleStart > 0 ? Math.max(0, nowMs - cycleStart) : Infinity;
  const speedBonus = cycleMs < 36 * 3600e3 ? 80 : cycleMs < 72 * 3600e3 ? 40 : 0;
  return 50 + unique + shiny * 10 + speedBonus + rebirths * 15;
}

export function legacyProdMul(state) {
  return 1 + 0.12 * perkLevel(state, "prod");
}

export function legacyCatchAdd(state) {
  return 0.04 * perkLevel(state, "catch");
}

export function legacyCapMul(state) {
  return 1 + 0.15 * perkLevel(state, "cap");
}

export function legacyBreedTimeMul(state) {
  return Math.max(0.4, 1 - 0.12 * perkLevel(state, "swiftHatch"));
}

export function legacyHatchAffectionAdd(state) {
  return 6 * perkLevel(state, "swiftHatch");
}

export function legacyExpeditionTimeMul(state) {
  return Math.max(0.6, 1 - 0.08 * perkLevel(state, "expeditionMaster"));
}

export function legacyExpeditionRewardMul(state) {
  return 1 + 0.15 * perkLevel(state, "expeditionMaster");
}

export function getNatalBondMonId(state) {
  const id = state?.meta?.natalBondMonId;
  return typeof id === "number" && Number.isFinite(id) && id > 0 ? Math.floor(id) : null;
}

export function setNatalBondMonId(state, monId) {
  if (!state || typeof state !== "object") return null;
  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  if (typeof monId === "number" && Number.isFinite(monId) && monId > 0) {
    state.meta.natalBondMonId = Math.floor(monId);
    return state.meta.natalBondMonId;
  }
  state.meta.natalBondMonId = null;
  return null;
}

const TIER_RANK = { epic: 4, legendary: 4, rare: 3, uncommon: 2, common: 1 };

export function resolveNatalBondCandidate(state) {
  const list = Array.isArray(state?.mons?.list) ? state.mons.list.filter(Boolean) : [];
  if (!list.length) return null;
  const lockedId = getNatalBondMonId(state);
  if (lockedId != null) {
    const exact = list.find((m) => m.id === lockedId);
    if (exact) return exact;
  }
  const ranked = list.slice().sort((a, b) => {
    const sa =
      (a.isShiny ? 1e6 : 0) +
      Math.max(0, Math.floor(a.stars || 0)) * 1e4 +
      (TIER_RANK[a.tier] || 0) * 1e3 +
      Math.max(1, Math.floor(a.lvl || a.level || 1));
    const sb =
      (b.isShiny ? 1e6 : 0) +
      Math.max(0, Math.floor(b.stars || 0)) * 1e4 +
      (TIER_RANK[b.tier] || 0) * 1e3 +
      Math.max(1, Math.floor(b.lvl || b.level || 1));
    return sb - sa || (a.id || 0) - (b.id || 0);
  });
  return ranked[0] || null;
}

export function cloneMonForNatalRebirth(mon, newId = 1) {
  if (!mon || typeof mon !== "object") return null;
  const copyObj = (src) => (src && typeof src === "object" ? { ...src } : undefined);
  const out = {
    id: Math.max(1, Math.floor(newId || 1)),
    pid: mon.pid || "p001",
    dex: typeof mon.dex === "number" ? mon.dex : 1,
    name: mon.name || "本命萌灵",
    tier: mon.tier || "common",
    lvl: 1,
    exp: 0,
    autoExpCarry: 0,
    satiety: 100,
    isShiny: Boolean(mon.isShiny),
    stars: Math.max(0, Math.min(5, Math.floor(mon.stars || 0))),
    affection: typeof mon.affection === "number" && Number.isFinite(mon.affection) ? Math.max(0, Math.min(100, mon.affection)) : 20,
    affectionCarry: 0,
    affectionDecayCarry: 0,
    skillCdRemainingSec: 0,
    skillActiveType: null,
    skillActiveRemainingSec: 0,
  };
  if (mon.nature) out.nature = mon.nature;
  if (mon.ability) out.ability = mon.ability;
  if (mon.caughtWith) out.caughtWith = mon.caughtWith;
  out.baseStats =
    mon.baseStats && typeof mon.baseStats === "object"
      ? copyObj(mon.baseStats)
      : { hp: 55, atk: 55, def: 50, spa: 55, spd: 50, spe: 55 };
  out.iv =
    mon.iv && typeof mon.iv === "object"
      ? copyObj(mon.iv)
      : { hp: 15, atk: 15, def: 15, spa: 15, spd: 15, spe: 15 };
  if (mon.statBonus && typeof mon.statBonus === "object") out.statBonus = copyObj(mon.statBonus);
  out.created = typeof mon.created === "number" && Number.isFinite(mon.created) ? mon.created : Date.now();
  return out;
}
