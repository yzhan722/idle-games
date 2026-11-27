// 数值规则换代（0.7.60，ML-COM1）的存档迁移：已捕获的稀有度、已进化的形态、已练出的属性、已满足的进化条件都不倒退。
// 旧档判据：meta.numRules 缺失。迁移只做一次，之后新捕获的萌灵按新规则走。

import { getBeastTier, higherTier, TIER_ORDER } from "./beast_tier.js";
import { getEvoTargets, stageIndex } from "./evo_utils.js";

export const NUM_RULES_VERSION = 1;

// 旧版属性总和的算法（按存档里记下的稀有度与段数），只用来算补偿
const OLD_TOTAL = { common: 300, uncommon: 340, rare: 395, epic: 470 };
const OLD_STAGE_MUL = [0.62, 0.82, 1, 1.08];
const OLD_LONER_MUL = 1.05;
const OLD_HEADROOM = 1.08; // 旧版按属性与编号有浮动，取上沿
const OLD_STAGE = { p196: 1, p197: 1, p199: 1, p700: 1 }; // 家族关系改动前的段数
const KEEP_MAX = 1.6;

const statTotal = (dex) => {
  const s = globalThis.BEAST_STATS?.[dex];
  return s ? s.hp + s.atk + s.def + s.spa + s.spd + s.spe : 0;
};

function oldTotal(mon) {
  const stage = OLD_STAGE[mon.pid] ?? stageIndex(mon.pid);
  const loner = stage === 0 && !globalThis.BEAST_EVO?.[mon.pid];
  const base = OLD_TOTAL[mon.tier] ?? OLD_TOTAL.common;
  return base * (loner ? OLD_LONER_MUL : OLD_STAGE_MUL[Math.min(stage, 3)]) * OLD_HEADROOM;
}

const keepRatio = (total, dex) => {
  const now = statTotal(dex);
  const r = now > 0 ? total / now : 1;
  return r > 1 ? Math.min(KEEP_MAX, Math.ceil(r * 1000) / 1000) : 1;
};

export function normalizeStatKeep(v) {
  return typeof v === "number" && Number.isFinite(v) && v > 1 ? Math.min(KEEP_MAX, v) : undefined;
}

// ---- 老伙伴标记的备份（meta.veterans）----
// 0.7.60 之前的客户端按白名单读伙伴，会丢掉 veteran / statKeep，但 meta 里不认识的字段会原样写回。
// 每条：编号.捕获时间(36 进制).图鉴号.稀有度序号.补偿千分比.是否老伙伴

const markKey = (m) => `${Math.floor(m.id)}.${Math.floor(m.created).toString(36)}`;

export function encodeVeterans(list) {
  if (!Array.isArray(list)) return "";
  const out = [];
  for (const m of list) {
    if (!m || !(m.veteran || m.statKeep)) continue;
    if (typeof m.id !== "number" || typeof m.created !== "number" || typeof m.dex !== "number") continue;
    out.push(`${markKey(m)}.${m.dex}.${Math.max(0, TIER_ORDER.indexOf(m.tier))}.${Math.round((normalizeStatKeep(m.statKeep) ?? 0) * 1000)}.${m.veteran ? 1 : 0}`);
  }
  return out.join(",");
}

function decodeVeterans(text) {
  const map = new Map();
  if (typeof text !== "string") return map;
  for (const part of text.split(",")) {
    const m = /^(\d+\.[0-9a-z]+)\.(\d+)\.([0-3])\.(\d+)\.([01])$/.exec(part);
    if (m) map.set(m[1], { dex: Number(m[2]), tier: TIER_ORDER[Number(m[3])], statKeep: normalizeStatKeep(Number(m[4]) / 1000), veteran: m[5] === "1" });
  }
  return map;
}

/** 存档时把标记抄一份进 meta；数据文件没加载成功时标记可能还没补回来，这次不动备份 */
export function mirrorVeterans(meta, list) {
  if (!globalThis.BEAST_STATS) return;
  const text = encodeVeterans(list);
  if (text) meta.veterans = text;
  else delete meta.veterans;
}

/** 伙伴身上的标记丢了、备份里还有：补回来；在旧版客户端里进化过的按进化规则换算 */
function restoreVeterans(list, text) {
  const marks = decodeVeterans(text);
  if (!marks.size) return;
  const valid = list.filter((m) => m && typeof m.id === "number" && typeof m.created === "number");
  const unclaimed = new Map(marks);
  for (const m of valid) unclaimed.delete(markKey(m));
  for (const m of valid) {
    if (m.veteran || m.statKeep) continue;
    let mark = marks.get(markKey(m));
    if (!mark) {
      // 在旧版里转生时带过去的那只换了编号，捕获时间和物种没变
      const suffix = `.${Math.floor(m.created).toString(36)}`;
      const key = [...unclaimed.keys()].find((k) => k.endsWith(suffix) && unclaimed.get(k).dex === m.dex);
      mark = key && unclaimed.get(key);
      if (key) unclaimed.delete(key);
    }
    if (!mark) continue;
    if (mark.veteran) m.veteran = true;
    if (mark.statKeep) m.statKeep = mark.statKeep;
    if (m.dex === mark.dex) m.tier = higherTier(mark.tier, m.tier);
    else carryVeteran(m, { dex: mark.dex, tier: mark.tier, statKeep: mark.statKeep });
  }
}

/**
 * 云存档拉取前调用：远端那份若是旧版客户端存的（标记被丢、备份也没有），把本机这份的标记并进去。
 * 只认同一条存档线（建档时间相同），远端已有的不动。两份都是存档原文对象；返回是否改动了 remote。
 */
export function protectVeterans(remote, local) {
  const createdAt = remote?.meta?.createdAt;
  if (typeof createdAt !== "number" || createdAt !== local?.meta?.createdAt || !Array.isArray(remote?.mons?.list)) return false;
  const keys = (text) => (typeof text === "string" && text ? text.split(",") : []);
  const keyOf = (part) => part.split(".").slice(0, 2).join(".");
  const inRemote = new Set(remote.mons.list.filter((m) => m && typeof m.id === "number" && typeof m.created === "number").map(markKey));
  const marked = new Set(keys(encodeVeterans(remote.mons.list)).concat(keys(remote.meta.veterans)).map(keyOf));
  const add = new Map();
  for (const part of keys(encodeVeterans(local?.mons?.list)).concat(keys(local?.meta?.veterans))) {
    const k = keyOf(part);
    if (inRemote.has(k) && !marked.has(k) && !add.has(k)) add.set(k, part);
  }
  if (!add.size) return false;
  remote.meta.veterans = keys(remote.meta.veterans).concat([...add.values()]).join(",");
  return true;
}

/** 读档后调用：oldRules 是存档里的 meta.numRules */
export function migrateToOwnNumbers(state, oldRules) {
  const list = Array.isArray(state?.mons?.list) ? state.mons.list : [];
  const fromOld = !(typeof oldRules === "number" && oldRules >= NUM_RULES_VERSION);
  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  // 数据文件没加载成功时不迁移、也不记「已迁移」，下次读档再补
  if (!globalThis.BEAST_STATS) {
    state.meta.numRules = fromOld ? 0 : oldRules;
    return;
  }
  restoreVeterans(list, state.meta.veterans);
  for (const m of list) {
    if (!m || typeof m.dex !== "number" || !globalThis.BEAST_STATS?.[m.dex]) continue;
    const tier = getBeastTier(m.dex);
    if (fromOld) {
      const keep = keepRatio(oldTotal(m), m.dex);
      if (keep > 1) m.statKeep = keep;
      const kept = higherTier(m.tier, tier);
      if (kept !== tier || getEvoTargets({ ...m, veteran: true }).length) m.veteran = true;
    }
    m.tier = m.veteran ? higherTier(m.tier, tier) : tier;
  }
  state.meta.numRules = NUM_RULES_VERSION;
}

/** 老伙伴进化：稀有度取高，属性总和不低于进化前 */
export function carryVeteran(mon, before) {
  if (!mon?.veteran && !mon?.statKeep) return;
  mon.tier = higherTier(before.tier, mon.tier);
  const keep = keepRatio(statTotal(before.dex) * (before.statKeep ?? 1), mon.dex);
  if (keep > 1) mon.statKeep = keep;
  else delete mon.statKeep;
}
