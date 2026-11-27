// 捕获系统管理
import { CAPTURE_AREAS } from "../config.js";
import { getTameRate } from "../beast_defs.js";

export function createCaptureSystem({ defs, getState, state, ui, randFloat }) {
  const readState = typeof getState === "function" ? getState : () => state;
  const rng = typeof randFloat === "function" ? randFloat : Math.random;

  // 获取已捕获的唯一萌灵数量
  function getCaughtUniqueCount() {
    const s = readState();
    const caught = s?.dex?.caught ?? {};
    let unique = 0;
    for (const v of Object.values(caught)) {
      const n = typeof v === "number" ? v : 0;
      if (n > 0) unique += 1;
    }
    return unique;
  }

  // 获取捕获区域列表
  function getAreas() {
    const unique = getCaughtUniqueCount();
    return CAPTURE_AREAS.map((area) => ({
      ...area,
      unlocked: unique >= area.unlockReq,
    }));
  }

  // 获取已解锁的区域
  function getUnlockedAreas() {
    return getAreas().filter((a) => a.unlocked);
  }

  // 确保当前区域有效
  function ensureAreaValid() {
    const unlocked = getUnlockedAreas();
    if (unlocked.length === 0) {
      ui.captureAreaId = "meadow";
      return;
    }
    const current = unlocked.find((a) => a.id === ui.captureAreaId);
    if (!current) {
      ui.captureAreaId = unlocked[0].id;
    }
  }

  // 获取当前激活的区域
  function getActiveArea() {
    ensureAreaValid();
    const areas = getAreas();
    return areas.find((a) => a.id === ui.captureAreaId) ?? areas[0];
  }

  // 获取当前区域的萌灵池
  function getPool() {
    const area = getActiveArea();
    const pool = defs.beasts.filter(area.pool);
    return pool;
  }

  // 获取神话萌灵池
  function getMythicPool() {
    return defs.beasts.filter((p) => p && p.tier === "epic");
  }

  // 基础捕获概率 = 物种驯服率（%）
  function getBaseCatchChanceByDex(dex) {
    return getTameRate(dex) / 100;
  }

  // 稀有度的典型捕获概率 = 该稀有度全部物种的均值（用于显示）
  function getBaseCatchChanceByTier(tier) {
    const list = defs.beasts.filter((p) => p && p.tier === tier);
    if (!list.length) return 0;
    return list.reduce((sum, p) => sum + getBaseCatchChanceByDex(p.dex), 0) / list.length;
  }

  // 从池中随机选择萌灵
  function pickRandomFromPool(pool) {
    const weights = {
      common: 80,
      uncommon: 15,
      rare: 4,
      epic: 1,
    };

    let total = 0;
    for (const p of pool) total += weights[p.tier] ?? 1;
    let r = rng() * total;
    for (const p of pool) {
      r -= weights[p.tier] ?? 1;
      if (r <= 0) return p;
    }
    return pool[pool.length - 1];
  }

  return {
    getCaughtUniqueCount,
    getAreas,
    getUnlockedAreas,
    ensureAreaValid,
    getActiveArea,
    getPool,
    getMythicPool,
    getBaseCatchChanceByDex,
    getBaseCatchChanceByTier,
    pickRandomFromPool,
  };
}
