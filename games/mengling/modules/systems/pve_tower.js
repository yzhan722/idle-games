/** Endless weekly trial tower for PvE tab — 1F~8F classic floors + 9F+ infinite procedural floors, weather affixes, and 5F/10F milestone drops. */

import { calcDamage, estimateStageEnemyPower } from "../pve_battle.js";
import {
  createMonInstance as createMonInstanceRaw,
  getMonCurrentStats,
  monPower as defaultMonPower,
  normalizeMintTuning,
} from "../mons.js";
import { getStarBonusMul } from "../stars.js";
import {
  computeAmberRevivalAura,
  computeElementalBondResonance,
  computeSkyIslandAura,
  computeStarBoutiqueAura,
  computeStarCampAura,
  computeWishDockAura,
  ensureAncientAmberBucket,
  getWishDockAwayMonIds,
  getMonBoutiqueBonus,
  getMonNocturnalFormBonus,
  getMonPrimalImprintBonus,
  getNightObservatoryStationedMonIds,
  getSkyIslandCrewMonIds,
  getTreasureVoyageCrewMonIds,
  computeHotSpringAura,
  getEcoSandboxBusyIds,
  getHotSpringSoakingMonIds,
  getNonSandboxBusyIds,
  getPostMessengerMonIds,
  POST_OFFICE_MAX_MESSENGERS,
  computeDreamLibraryAura,
  excludeAwayMons,
  FISHING_MAX_ANGLERS,
  getAwayActivityMap,
  getAwayActivityOfMon,
  getAwayMonIds,
  getFishingAnglerMonIds,
  getIdleFishingCandidates,
  BALLOON_COUNT,
  BALLOON_SEATS,
  computeBakeryAura,
  getBalloonTravelerMonIds,
  getIdleBalloonCandidates,
  claimWishDockRoute,
  computeCloudParkAura,
  getAwayReturnedUnits,
  getIdleStargazeCandidates,
  returnFromTreasureVoyage,
  STARGAZE_MAX_CAMPERS,
  STARGAZE_SEATS,
  STARGAZE_SITE_COUNT,
  STARGAZE_SITE_NAMES,
  BEE_HIVE_COUNT,
  BEE_HIVE_NAMES,
  BEE_MAX_KEEPERS,
  BEE_SEATS,
  getIdleBeeCandidates,
  getIdleIceRinkCandidates,
  ICE_RINK_PROGRAM_NAMES,
  ICE_RINK_SLOTS,
} from "./collection_fun.js";
import { CAPTURE_AREAS } from "../config.js";
import { beastZone, ZONE_IDS, ZONE_LABELS } from "../beast_defs.js";

export const PVE_TOWER_FLOORS = [
  { floor: 1, name: "塔·1F 虫群", type: "grass", enemies: [{ dex: 10, name: "翠玉灵蚕", lvl: 20, stars: 0 }, { dex: 11, name: "凝翠星茧", lvl: 22, stars: 0 }], rewards: { futurecoin: 40, exp: 400 } },
  { floor: 2, name: "塔·2F 水流", type: "water", enemies: [{ dex: 54, name: "涟漪小鸭", lvl: 24, stars: 0 }, { dex: 55, name: "沧澜灵鸭皇", lvl: 28, stars: 1 }], rewards: { futurecoin: 60, exp: 600 } },
  { floor: 3, name: "塔·3F 烈焰", type: "fire", enemies: [{ dex: 58, name: "炽焰幼犬", lvl: 28, stars: 0 }, { dex: 59, name: "燎原炎狮犬", lvl: 34, stars: 1 }], rewards: { futurecoin: 80, exp: 900 } },
  { floor: 4, name: "塔·4F 雷鸣", type: "electric", enemies: [{ dex: 25, name: "星雷灵鼠", lvl: 32, stars: 1 }, { dex: 26, name: "天雷御守鼠", lvl: 38, stars: 1 }], rewards: { futurecoin: 100, exp: 1200 } },
  { floor: 5, name: "塔·5F 龙影【里程碑】", type: "mystic", enemies: [{ dex: 147, name: "云渊幼蛟", lvl: 36, stars: 1 }, { dex: 148, name: "瑞霭灵龙", lvl: 42, stars: 2 }], rewards: { futurecoin: 140, exp: 1800, evolutionStone: 1, rareCandy: 1, seasonMark: 1 }, isMilestone: true },
  { floor: 6, name: "塔·6F 恶戏", type: "dark", enemies: [{ dex: 197, name: "幽月影狐", lvl: 40, stars: 1 }, { dex: 229, name: "炼狱魔狼王", lvl: 46, stars: 2 }], rewards: { futurecoin: 180, exp: 2200 } },
  { floor: 7, name: "塔·7F 钢壁", type: "stone", enemies: [{ dex: 208, name: "耀钢龙蛇", lvl: 44, stars: 2 }, { dex: 462, name: "苍穹磁暴舰", lvl: 50, stars: 2 }], rewards: { futurecoin: 220, exp: 2800 } },
  { floor: 8, name: "塔·8F 王者幻影【经典巅顶】", type: "mystic", enemies: [{ dex: 149, name: "凌霄圣龙", lvl: 52, stars: 2 }, { dex: 230, name: "沧溟海龙皇", lvl: 55, stars: 2 }, { dex: 148, name: "瑞霭灵龙", lvl: 58, stars: 2 }], rewards: { futurecoin: 320, exp: 4000, evolutionStone: 1, seasonMark: 1 } },
];

export const TOWER_WEATHER_AFFIXES = [
  {
    id: "solar_flare",
    name: "烈日晴空",
    boostTypes: ["fire", "grass", "light"],
    outMul: 1.28,
    inMul: 0.82,
    enemyOutMul: 1.12,
    desc: "晴昼高照：火 / 草 / 光系萌灵伤害 +28% · 承伤 -18%",
  },
  {
    id: "thunder_tempest",
    name: "雷鸣暴雨",
    boostTypes: ["water", "electric", "wind"],
    outMul: 1.28,
    inMul: 0.82,
    enemyOutMul: 1.12,
    desc: "狂澜激荡：水 / 电 / 风系萌灵伤害 +28% · 承伤 -18%",
  },
  {
    id: "astral_mist",
    name: "星界迷雾",
    boostTypes: ["mystic", "dark", "light"],
    outMul: 1.28,
    inMul: 0.82,
    enemyOutMul: 1.12,
    desc: "星雾弥漫：秘 / 暗 / 光系萌灵伤害 +28% · 承伤 -18%",
  },
  {
    id: "terra_sandstorm",
    name: "岩罡沙暴",
    boostTypes: ["stone", "fire", "dark"],
    outMul: 1.28,
    inMul: 0.82,
    enemyOutMul: 1.12,
    desc: "砺岩呼啸：岩 / 火 / 暗系萌灵伤害 +28% · 承伤 -18%",
  },
  {
    id: "gale_bloom",
    name: "翠岚疾风",
    boostTypes: ["wind", "grass", "water"],
    outMul: 1.28,
    inMul: 0.82,
    enemyOutMul: 1.12,
    desc: "春风化雨：风 / 草 / 水系萌灵伤害 +28% · 承伤 -18%",
  },
  {
    id: "aurora_surge",
    name: "极光磁暴",
    boostTypes: ["electric", "mystic", "stone"],
    outMul: 1.28,
    inMul: 0.82,
    enemyOutMul: 1.12,
    desc: "磁极共振：电 / 秘 / 岩系萌灵伤害 +28% · 承伤 -18%",
  },
];

export const TOWER_SEASON_EXCHANGES = [
  { id: "stone", rid: "evolutionStone", amount: 1, cost: 2, label: "灵晶石 ×1" },
  { id: "candy", rid: "rareCandy", amount: 2, cost: 3, label: "跃级糖丸 ×2" },
  { id: "crown", rid: "goldBottleCap", amount: 1, cost: 8, label: "金桂冠 ×1" },
];

const ENDLESS_TYPES = ["fire", "water", "grass", "electric", "wind", "stone", "light", "dark", "mystic"];

const ENDLESS_ZONE_TITLES = {
  fire: ["熔星回廊", "赤炎祭坛", "焚天阶梯"],
  water: ["沧溟深涡", "寒潮镜殿", "渊海长廊"],
  grass: ["森罗秘苑", "古木灵台", "翡翠迷宫"],
  electric: ["雷霆天枢", "磁暴尖塔", "紫电长阶"],
  wind: ["苍穹风眼", "流云浮廊", "天风祭坛"],
  stone: ["玄岩堡垒", "晶簇王庭", "重岳回廊"],
  light: ["破晓圣坛", "辉光星殿", "曜金天阶"],
  dark: ["永夜影廊", "冥月深渊", "暗影王座"],
  mystic: ["星界幻境", "龙魂圣殿", "虚空回廊"],
};

const ENDLESS_SPECIES_POOL = {
  fire: [
    { dex: 58, fallback: "炽焰幼犬" },
    { dex: 78, fallback: "逐日天马" },
    { dex: 59, fallback: "燎原炎狮犬" },
    { dex: 229, fallback: "炼狱魔狼王" },
  ],
  water: [
    { dex: 55, fallback: "沧澜灵鸭皇" },
    { dex: 121, fallback: "紫微宝星皇" },
    { dex: 230, fallback: "沧溟海龙皇" },
    { dex: 120, fallback: "辰光海星" },
  ],
  grass: [
    { dex: 71, fallback: "幽林捕蝇皇" },
    { dex: 45, fallback: "绯冠大王花" },
    { dex: 69, fallback: "翠蔓灵芽" },
    { dex: 11, fallback: "凝翠星茧" },
  ],
  electric: [
    { dex: 26, fallback: "天雷御守鼠" },
    { dex: 82, fallback: "三联磁晶阵" },
    { dex: 462, fallback: "苍穹磁暴舰" },
    { dex: 25, fallback: "星雷灵鼠" },
  ],
  wind: [
    { dex: 17, fallback: "疾风灵隼" },
    { dex: 149, fallback: "凌霄圣龙" },
    { dex: 42, fallback: "影翼猎蝠" },
    { dex: 16, fallback: "云羽雏雀" },
  ],
  stone: [
    { dex: 95, fallback: "巨岩晶蛇" },
    { dex: 112, fallback: "破山钻角犀" },
    { dex: 208, fallback: "耀钢龙蛇" },
    { dex: 28, fallback: "金刚刺甲兽" },
  ],
  light: [
    { dex: 121, fallback: "紫微宝星皇" },
    { dex: 78, fallback: "逐日天马" },
    { dex: 148, fallback: "瑞霭灵龙" },
    { dex: 26, fallback: "天雷御守鼠" },
  ],
  dark: [
    { dex: 197, fallback: "幽月影狐" },
    { dex: 229, fallback: "炼狱魔狼王" },
    { dex: 44, fallback: "迷雾梦花" },
    { dex: 42, fallback: "影翼猎蝠" },
  ],
  mystic: [
    { dex: 148, fallback: "瑞霭灵龙" },
    { dex: 149, fallback: "凌霄圣龙" },
    { dex: 230, fallback: "沧溟海龙皇" },
    { dex: 147, fallback: "云渊幼蛟" },
  ],
};

export function isoWeekKey(d = new Date()) {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = x.getUTCDay() || 7;
  x.setUTCDate(x.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((x - yearStart) / 86400000 + 1) / 7);
  return `${x.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function parseWeekSerial(weekKey = isoWeekKey()) {
  const m = /^(\d{4})-W(\d{1,2})$/.exec(String(weekKey || ""));
  if (m) {
    return Number(m[1]) * 53 + Number(m[2]);
  }
  let h = 2166136261;
  const s = String(weekKey || "2026-W01");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function seededHash(weekKey, floor, salt = 0) {
  let h = (parseWeekSerial(weekKey) ^ Math.imul(floor, 374761393) ^ Math.imul(salt + 1, 668265263)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

export function getWeeklyTowerAffix(weekKey = isoWeekKey()) {
  const serial = parseWeekSerial(weekKey);
  const idx = ((serial % TOWER_WEATHER_AFFIXES.length) + TOWER_WEATHER_AFFIXES.length) % TOWER_WEATHER_AFFIXES.length;
  return TOWER_WEATHER_AFFIXES[idx];
}

export function unitMatchesWeather(types, affix) {
  if (!affix || !Array.isArray(affix.boostTypes) || !Array.isArray(types)) return false;
  return types.some((t) => affix.boostTypes.includes(t));
}

export function countWeatherResonantMons(mons, getMonTypesFn, affix) {
  if (!Array.isArray(mons) || !affix) return 0;
  let count = 0;
  for (const m of mons) {
    if (!m) continue;
    const types = typeof getMonTypesFn === "function" ? getMonTypesFn(m) : m.types || [];
    if (unitMatchesWeather(types, affix)) count += 1;
  }
  return count;
}

export function ensureTowerState(state, weekOverride = null) {
  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  const week = weekOverride || isoWeekKey();
  let t = state.meta.pveTower;
  const prevAllTime = Math.max(0, Math.floor(t?.allTimeBest || t?.best || 0));
  if (!t || typeof t !== "object" || t.week !== week) {
    t = { week, floor: 1, best: 0, cleared: false, allTimeBest: prevAllTime };
    state.meta.pveTower = t;
  }
  if (typeof t.floor !== "number" || !Number.isFinite(t.floor)) t.floor = 1;
  if (typeof t.best !== "number" || !Number.isFinite(t.best)) t.best = 0;
  if (typeof t.cleared !== "boolean") t.cleared = false;
  if (typeof t.allTimeBest !== "number" || !Number.isFinite(t.allTimeBest)) t.allTimeBest = prevAllTime;
  t.floor = Math.max(1, Math.floor(t.floor));
  t.best = Math.max(0, Math.floor(t.best));
  if (t.best >= PVE_TOWER_FLOORS.length || t.floor > PVE_TOWER_FLOORS.length) {
    t.cleared = true;
    if (t.floor === PVE_TOWER_FLOORS.length && t.best >= PVE_TOWER_FLOORS.length) {
      t.floor = PVE_TOWER_FLOORS.length + 1;
    }
  }
  t.allTimeBest = Math.max(t.allTimeBest, t.best);
  return t;
}

/** True once the classic 8F apex has been conquered this week (unlocking 9F+ endless floors). */
export function isTowerCleared(tower) {
  return Boolean(tower && tower.cleared);
}

export function isEndlessTowerUnlocked(tower) {
  return Boolean(tower && (tower.cleared || (tower.best || 0) >= PVE_TOWER_FLOORS.length || (tower.floor || 1) > PVE_TOWER_FLOORS.length));
}

function resolveBeastName(dex, fallback) {
  const zh = globalThis.BEAST_ZH;
  if (zh && typeof zh === "object") {
    const padded = `p${String(dex).padStart(3, "0")}`;
    if (typeof zh[padded] === "string" && zh[padded].trim()) return zh[padded].trim();
    const plain = `p${dex}`;
    if (typeof zh[plain] === "string" && zh[plain].trim()) return zh[plain].trim();
  }
  return fallback;
}

export function getTowerFloor(floor, weekKey = isoWeekKey()) {
  const n = Math.max(1, Math.floor(floor || 1));
  if (n <= PVE_TOWER_FLOORS.length) {
    return PVE_TOWER_FLOORS[n - 1] || null;
  }

  const serial = parseWeekSerial(weekKey);
  const typeIdx = ((serial * 5 + n * 7) % ENDLESS_TYPES.length + ENDLESS_TYPES.length) % ENDLESS_TYPES.length;
  const type = ENDLESS_TYPES[typeIdx];
  const titles = ENDLESS_ZONE_TITLES[type] || ENDLESS_ZONE_TITLES.mystic;
  const titleBase = titles[seededHash(weekKey, n, 1) % titles.length];
  const isMajorBoss = n % 10 === 0;
  const isEliteMilestone = n % 5 === 0;
  const suffix = isMajorBoss ? "【领主里程碑】" : isEliteMilestone ? "【精英里程碑】" : "";

  const pool = ENDLESS_SPECIES_POOL[type] || ENDLESS_SPECIES_POOL.mystic;
  const enemyCount = isMajorBoss ? 4 : 3;
  const depth = n - PVE_TOWER_FLOORS.length; // 1 on 9F, 2 on 10F, ...
  const rawBaseLvl = 56 + depth * 3;
  const baseLvl = Math.min(100, rawBaseLvl);
  const statMul = rawBaseLvl > 100 ? Number((1 + (rawBaseLvl - 100) * 0.025).toFixed(3)) : 1;

  const enemies = [];
  for (let i = 0; i < enemyCount; i++) {
    const pick = pool[seededHash(weekKey, n, 10 + i) % pool.length];
    const isAce = i === enemyCount - 1;
    const lvl = Math.min(100, Math.max(54, rawBaseLvl + (isAce ? (isMajorBoss ? 4 : 2) : i - 1)));
    const stars = n >= 22 ? 3 : n >= 14 ? (isAce ? 3 : 2) : isEliteMilestone && isAce ? 3 : 2;
    enemies.push({
      dex: pick.dex,
      name: resolveBeastName(pick.dex, pick.fallback),
      lvl,
      stars,
      types: [type],
      statMul: isMajorBoss && isAce ? Number((statMul * 1.08).toFixed(3)) : statMul,
    });
  }

  const rewards = {
    futurecoin: 320 + depth * 45 + (isMajorBoss ? 260 : isEliteMilestone ? 120 : 0),
    exp: 4200 + depth * 560 + (isMajorBoss ? 3000 : isEliteMilestone ? 1200 : 0),
  };

  if (isEliteMilestone) {
    rewards.evolutionStone = (isMajorBoss ? 2 : 1) + Math.floor(n / 20);
    rewards.rareCandy = (isMajorBoss ? 2 : 1) + Math.floor(n / 25);
    rewards.seasonMark = (isMajorBoss ? 3 : 1) + Math.floor(n / 20);
    if (isMajorBoss) {
      rewards.linkRope = 1;
    }
  }

  return {
    floor: n,
    name: `无尽·${n}F ${titleBase}${suffix}`,
    type,
    isEndless: true,
    isMilestone: isEliteMilestone,
    isMajorBoss,
    enemies,
    rewards,
  };
}

export function getNextTowerMilestone(floor, weekKey = isoWeekKey()) {
  const n = Math.max(1, Math.floor(floor || 1));
  const nextFloor = n % 5 === 0 ? n : n + (5 - (n % 5));
  return getTowerFloor(nextFloor, weekKey);
}

/**
 * ML-4 「双打圣殿试炼」 (Dual-Pet Sanctum Challenge Trials)
 * 玩家编组 主战 + 协战 双灵搭档，触发元素双打共鸣与合体连携技，依次挑战六大双打圣殿宗师，赢取圣殿荣耀徽章与里程碑奖励。
 */
export const DUAL_SANCTUM_TRIALS = Object.freeze([
  {
    id: "sanctum_ember_gale",
    order: 1,
    name: "绯炎疾风圣殿",
    masterTitle: "双翼宗师 · 赤岚 & 苍羽",
    stageType: "fire",
    elements: ["fire", "wind"],
    badgeId: "badge_ember_gale",
    badgeName: "炽风双翼徽章",
    unlockReq: null,
    enemies: [
      { dex: 58, name: "炽焰幼犬", lvl: 16, stars: 1, types: ["fire"] },
      { dex: 17, name: "疾风灵隼", lvl: 18, stars: 1, types: ["wind"] },
    ],
    rewards: { futurecoin: 180, exp: 1200, evolutionStone: 2, seasonMark: 2 },
    repeatRewards: { futurecoin: 60, exp: 450 },
  },
  {
    id: "sanctum_tide_grove",
    order: 2,
    name: "碧潮森罗圣殿",
    masterTitle: "林海宗师 · 汐澜 & 青萝",
    stageType: "water",
    elements: ["water", "grass"],
    badgeId: "badge_tide_grove",
    badgeName: "森澜甘露徽章",
    unlockReq: "sanctum_ember_gale",
    enemies: [
      { dex: 61, name: "潮汐战蛙", lvl: 28, stars: 1, types: ["water"] },
      { dex: 2, name: "翠冠森龙", lvl: 30, stars: 1, types: ["grass", "dark"] },
    ],
    rewards: { futurecoin: 280, exp: 2400, evolutionStone: 2, rareCandy: 1, seasonMark: 2 },
    repeatRewards: { futurecoin: 95, exp: 800 },
  },
  {
    id: "sanctum_volt_crag",
    order: 3,
    name: "雷霆磐岳圣殿",
    masterTitle: "镇岳宗师 · 惊雷 & 破山",
    stageType: "electric",
    elements: ["electric", "stone"],
    badgeId: "badge_volt_crag",
    badgeName: "雷岳镇魂徽章",
    unlockReq: "sanctum_tide_grove",
    enemies: [
      { dex: 26, name: "天雷御守鼠", lvl: 40, stars: 2, types: ["electric"] },
      { dex: 112, name: "破山钻角犀", lvl: 42, stars: 2, types: ["stone"] },
    ],
    rewards: { futurecoin: 400, exp: 4200, evolutionStone: 3, rareCandy: 2, seasonMark: 3 },
    repeatRewards: { futurecoin: 130, exp: 1400 },
  },
  {
    id: "sanctum_steam_flare",
    order: 4,
    name: "熔渊沧溟圣殿",
    masterTitle: "炎海宗师 · 焚天 & 覆海",
    stageType: "fire",
    elements: ["fire", "water"],
    badgeId: "badge_steam_flare",
    badgeName: "炎澜交辉徽章",
    unlockReq: "sanctum_volt_crag",
    enemies: [
      { dex: 59, name: "燎原炎狮犬", lvl: 52, stars: 2, types: ["fire"] },
      { dex: 130, name: "覆海苍龙", lvl: 55, stars: 2, types: ["water", "wind"] },
    ],
    rewards: { futurecoin: 560, exp: 6800, evolutionStone: 4, rareCandy: 2, linkRope: 1, seasonMark: 4 },
    repeatRewards: { futurecoin: 180, exp: 2200 },
  },
  {
    id: "sanctum_eclipse_twin",
    order: 5,
    name: "曜月星蚀圣殿",
    masterTitle: "双极宗师 · 日冕 & 幽月",
    stageType: "dark",
    elements: ["light", "dark"],
    badgeId: "badge_eclipse_twin",
    badgeName: "日月同辉徽章",
    unlockReq: "sanctum_steam_flare",
    enemies: [
      { dex: 36, name: "月华星后", lvl: 66, stars: 2, types: ["light"] },
      { dex: 94, name: "噬影夜魔王", lvl: 68, stars: 3, types: ["dark"] },
    ],
    rewards: { futurecoin: 780, exp: 10000, evolutionStone: 5, rareCandy: 3, linkRope: 1, seasonMark: 5 },
    repeatRewards: { futurecoin: 240, exp: 3200 },
  },
  {
    id: "sanctum_astral_crown",
    order: 6,
    name: "万象星穹总圣殿",
    masterTitle: "首席圣主 · 凌霄 & 太虚",
    stageType: "mystic",
    elements: ["wind", "mystic"],
    badgeId: "badge_astral_crown",
    badgeName: "星穹双圣徽章",
    unlockReq: "sanctum_eclipse_twin",
    enemies: [
      { dex: 149, name: "凌霄圣龙", lvl: 80, stars: 3, types: ["mystic", "wind"] },
      { dex: 150, name: "太虚星蚀尊", lvl: 84, stars: 3, types: ["mystic"] },
    ],
    rewards: { futurecoin: 1200, exp: 16000, evolutionStone: 6, rareCandy: 4, megaStone: 1, linkRope: 2, seasonMark: 8 },
    repeatRewards: { futurecoin: 360, exp: 5000 },
  },
]);

export const DUO_ELEMENTAL_COMBOS = Object.freeze([
  {
    id: "blazing_tempest",
    pair: ["fire", "wind"],
    name: "烈风焚天共鸣",
    comboSkill: "炽岚螺旋击",
    outMul: 1.32,
    inMul: 0.9,
    speMul: 1.15,
    comboMul: 1.55,
    healPct: 0,
    desc: "火借风势：双打伤害 +32% · 速度 +15% · 连携技《炽岚螺旋击》",
  },
  {
    id: "verdant_tide",
    pair: ["water", "grass"],
    name: "森澜苏生共鸣",
    comboSkill: "甘霖万木阵",
    outMul: 1.25,
    inMul: 0.82,
    speMul: 1.06,
    comboMul: 1.45,
    healPct: 0.12,
    desc: "水润森木：双打伤害 +25% · 承伤 -18% · 连携回复双灵 12% 生命",
  },
  {
    id: "steam_burst",
    pair: ["fire", "water"],
    name: "炎泉沸海共鸣",
    comboSkill: "沸海爆炎破",
    outMul: 1.30,
    inMul: 0.86,
    speMul: 1.08,
    comboMul: 1.52,
    healPct: 0,
    desc: "水火激荡：双打伤害 +30% · 承伤 -14% · 连携技《沸海爆炎破》",
  },
  {
    id: "eclipse_judgment",
    pair: ["light", "dark"],
    name: "日月星蚀共鸣",
    comboSkill: "双极裁决光",
    outMul: 1.35,
    inMul: 0.88,
    speMul: 1.12,
    comboMul: 1.60,
    healPct: 0.06,
    desc: "光暗交融：双打伤害 +35% · 速度 +12% · 连携技《双极裁决光》",
  },
  {
    id: "zephyr_petal",
    pair: ["wind", "grass"],
    name: "翠岚飞叶共鸣",
    comboSkill: "千叶暴风舞",
    outMul: 1.26,
    inMul: 0.88,
    speMul: 1.18,
    comboMul: 1.48,
    healPct: 0.06,
    desc: "疾风卷叶：双打伤害 +26% · 速度 +18% · 连携技《千叶暴风舞》",
  },
  {
    id: "abyss_tide",
    pair: ["water", "dark"],
    name: "冥潮蚀影共鸣",
    comboSkill: "渊海暗月斩",
    outMul: 1.28,
    inMul: 0.85,
    speMul: 1.1,
    comboMul: 1.5,
    healPct: 0,
    desc: "暗流潜袭：双打伤害 +28% · 承伤 -15% · 连携技《渊海暗月斩》",
  },
  {
    id: "dawn_radiance",
    pair: ["light", "wind"],
    name: "晨曦极光共鸣",
    comboSkill: "破晓流光矢",
    outMul: 1.27,
    inMul: 0.88,
    speMul: 1.16,
    comboMul: 1.48,
    healPct: 0.05,
    desc: "极光乘风：双打伤害 +27% · 速度 +16% · 连携技《破晓流光矢》",
  },
  {
    id: "thunder_bastion",
    pair: ["electric", "stone"],
    name: "磁暴崩岩共鸣",
    comboSkill: "雷岳碎星锤",
    outMul: 1.29,
    inMul: 0.84,
    speMul: 1.1,
    comboMul: 1.52,
    healPct: 0,
    desc: "电磁引岩：双打伤害 +29% · 承伤 -16% · 连携技《雷岳碎星锤》",
  },
  {
    id: "hellfire_night",
    pair: ["fire", "dark"],
    name: "业火夜袭共鸣",
    comboSkill: "冥炎双牙裂",
    outMul: 1.31,
    inMul: 0.9,
    speMul: 1.12,
    comboMul: 1.54,
    healPct: 0,
    desc: "暗夜炽焰：双打伤害 +31% · 速度 +12% · 连携技《冥炎双牙裂》",
  },
  {
    id: "solar_grove",
    pair: ["fire", "grass"],
    name: "晴阳繁林共鸣",
    comboSkill: "日冕森罗炮",
    outMul: 1.28,
    inMul: 0.88,
    speMul: 1.1,
    comboMul: 1.5,
    healPct: 0.05,
    desc: "阳光催荣：双打伤害 +28% · 速度 +10% · 连携技《日冕森罗炮》",
  },
]);

export const DUAL_SANCTUM_MILESTONES = Object.freeze([
  { id: "m2", reqBadges: 2, label: "双圣初鸣（2枚徽章）", rewards: { futurecoin: 300, rareCandy: 2, seasonMark: 3 } },
  { id: "m4", reqBadges: 4, label: "四象制霸（4枚徽章）", rewards: { futurecoin: 650, evolutionStone: 4, linkRope: 1, seasonMark: 5 } },
  { id: "m6", reqBadges: 6, label: "圣殿全冠（6枚徽章）", rewards: { futurecoin: 1500, megaStone: 2, goldBottleCap: 1, shinyCharm: 1, seasonMark: 10 } },
]);

export function getDualSanctumTrial(trialId) {
  return DUAL_SANCTUM_TRIALS.find((t) => t.id === trialId) || null;
}

export function ensureDualSanctumState(state) {
  if (!state || typeof state !== "object") {
    return {
      primaryId: null,
      partnerId: null,
      selectedTrialId: DUAL_SANCTUM_TRIALS[0].id,
      cleared: {},
      badges: [],
      claimedMilestones: {},
    };
  }
  if (!state.pve || typeof state.pve !== "object") {
    state.pve = { progress: {}, dailyAttempts: 0, dailyResetDate: "", selectedIds: [] };
  }
  if (!state.pve.dualSanctum || typeof state.pve.dualSanctum !== "object") {
    state.pve.dualSanctum = {
      primaryId: null,
      partnerId: null,
      selectedTrialId: DUAL_SANCTUM_TRIALS[0].id,
      cleared: {},
      badges: [],
      claimedMilestones: {},
    };
  }
  const raw = state.pve.dualSanctum;
  raw.primaryId =
    typeof raw.primaryId === "number" && Number.isFinite(raw.primaryId) && raw.primaryId > 0
      ? Math.floor(raw.primaryId)
      : null;
  raw.partnerId =
    typeof raw.partnerId === "number" && Number.isFinite(raw.partnerId) && raw.partnerId > 0
      ? Math.floor(raw.partnerId)
      : null;
  if (raw.primaryId && raw.partnerId === raw.primaryId) raw.partnerId = null;

  if (!getDualSanctumTrial(raw.selectedTrialId)) {
    raw.selectedTrialId = DUAL_SANCTUM_TRIALS[0].id;
  }
  if (!raw.cleared || typeof raw.cleared !== "object") raw.cleared = {};
  for (const [tid, entry] of Object.entries(raw.cleared)) {
    if (!getDualSanctumTrial(tid) || !entry) {
      delete raw.cleared[tid];
      continue;
    }
    if (typeof entry === "object") {
      entry.stars = Math.max(1, Math.min(3, Math.floor(Number(entry.stars) || 1)));
      entry.clears = Math.max(1, Math.floor(Number(entry.clears) || 1));
      entry.bestRounds = Math.max(1, Math.floor(Number(entry.bestRounds) || 1));
    } else {
      raw.cleared[tid] = { stars: 1, clears: 1, bestRounds: 10 };
    }
  }

  const validBadgeSet = new Set(DUAL_SANCTUM_TRIALS.map((t) => t.badgeId));
  const badgeSet = new Set();
  if (Array.isArray(raw.badges)) {
    for (const b of raw.badges) {
      if (typeof b === "string" && validBadgeSet.has(b)) badgeSet.add(b);
    }
  }
  for (const tid of Object.keys(raw.cleared)) {
    const tr = getDualSanctumTrial(tid);
    if (tr) badgeSet.add(tr.badgeId);
  }
  raw.badges = Array.from(badgeSet);

  if (!raw.claimedMilestones || typeof raw.claimedMilestones !== "object") {
    raw.claimedMilestones = {};
  }
  for (const [mk, mv] of Object.entries(raw.claimedMilestones)) {
    if (!mv) delete raw.claimedMilestones[mk];
    else raw.claimedMilestones[mk] = true;
  }

  return raw;
}

export function isDualSanctumTrialUnlocked(trialId, dualState) {
  const tr = getDualSanctumTrial(trialId);
  if (!tr) return false;
  if (!tr.unlockReq) return true;
  return Boolean(dualState?.cleared?.[tr.unlockReq]);
}

export function evaluateDuoSynergy(primaryTypes = [], partnerTypes = [], state = null) {
  const pArr = Array.isArray(primaryTypes) ? primaryTypes.filter((t) => typeof t === "string") : [];
  const sArr = Array.isArray(partnerTypes) ? partnerTypes.filter((t) => typeof t === "string") : [];
  const campComboMul = state ? computeStarCampAura(state).pveComboMul || 1 : 1;
  const scaleCombo = (v) => Number((v * campComboMul).toFixed(4));
  if (!pArr.length || !sArr.length) {
    return {
      id: "none",
      name: "待结成双灵搭档",
      comboSkill: "协战普攻",
      resonant: false,
      outMul: 1,
      inMul: 1,
      speMul: 1,
      comboMul: scaleCombo(1.15),
      feastComboMul: campComboMul,
      healPct: 0,
      matchedElements: [],
      desc: "编入主战与协战 2 只萌灵即可激活双打连携",
    };
  }

  // Check cross-pet named elemental combo pairs (one element from primary, the other from partner)
  for (const combo of DUO_ELEMENTAL_COMBOS) {
    const [e1, e2] = combo.pair;
    const crossMatch = (pArr.includes(e1) && sArr.includes(e2)) || (pArr.includes(e2) && sArr.includes(e1));
    if (crossMatch) {
      return {
        id: combo.id,
        name: combo.name,
        comboSkill: combo.comboSkill,
        resonant: true,
        outMul: combo.outMul,
        inMul: combo.inMul,
        speMul: combo.speMul,
        comboMul: scaleCombo(combo.comboMul),
        feastComboMul: campComboMul,
        healPct: combo.healPct,
        matchedElements: [e1, e2],
        desc: combo.desc,
      };
    }
  }

  const shared = pArr.find((t) => sArr.includes(t));
  if (shared) {
    return {
      id: `same_${shared}`,
      name: "纯元同调共鸣",
      comboSkill: "同源双星破",
      resonant: true,
      outMul: 1.18,
      inMul: 0.92,
      speMul: 1.06,
      comboMul: scaleCombo(1.32),
      feastComboMul: campComboMul,
      healPct: 0,
      matchedElements: [shared],
      desc: "同系双灵同调：双打伤害 +18% · 承伤 -8% · 连携技《同源双星破》",
    };
  }

  return {
    id: "tactical_duo",
    name: "异系战术协战",
    comboSkill: "双星夹击阵",
    resonant: false,
    outMul: 1.12,
    inMul: 0.95,
    speMul: 1.04,
    comboMul: scaleCombo(1.24),
    feastComboMul: campComboMul,
    healPct: 0,
    matchedElements: [pArr[0], sArr[0]].filter(Boolean),
    desc: "异系互补协战：双打伤害 +12% · 承伤 -5% · 连携技《双星夹击阵》",
  };
}

export function selectDualSanctumDuo(state, primaryId, partnerId) {
  const ds = ensureDualSanctumState(state);
  const list = Array.isArray(state?.mons?.list) ? state.mons.list.filter(Boolean) : [];
  const pId = primaryId != null ? Number(primaryId) : null;
  const sId = partnerId != null ? Number(partnerId) : null;

  if (pId != null && (!Number.isFinite(pId) || !list.some((m) => m.id === pId))) {
    return { ok: false, reason: "invalid_primary" };
  }
  if (sId != null && (!Number.isFinite(sId) || !list.some((m) => m.id === sId))) {
    return { ok: false, reason: "invalid_partner" };
  }
  if (pId != null && sId != null && pId === sId) {
    return { ok: false, reason: "duplicate_mon" };
  }
  ds.primaryId = pId != null ? Math.floor(pId) : null;
  ds.partnerId = sId != null ? Math.floor(sId) : null;
  return { ok: true, primaryId: ds.primaryId, partnerId: ds.partnerId };
}

export function autofillDualSanctumDuo(state, trialId, getMonTypesFn, monPowerFn) {
  const ds = ensureDualSanctumState(state);
  const list = Array.isArray(state?.mons?.list) ? state.mons.list.filter(Boolean) : [];
  if (list.length < 2) {
    ds.primaryId = list[0]?.id ?? null;
    ds.partnerId = null;
    return { ok: false, reason: "need_two_mons", primaryId: ds.primaryId, partnerId: null };
  }
  const trial = getDualSanctumTrial(trialId || ds.selectedTrialId) || DUAL_SANCTUM_TRIALS[0];
  const getTypes = typeof getMonTypesFn === "function" ? getMonTypesFn : (m) => m.types || [];
  const getPwr = typeof monPowerFn === "function" ? monPowerFn : (m) => (Number(m.lvl) || 1) * 10;

  // Rank top 12 candidates for O(N^2) optimal pair evaluation
  const pool = list
    .map((m) => ({ m, types: getTypes(m), pwr: getPwr(m) }))
    .sort((a, b) => b.pwr - a.pwr)
    .slice(0, 12);

  let bestPair = [pool[0].m.id, pool[1].m.id];
  let bestScore = -Infinity;
  const bossTypes = Array.from(new Set(trial.enemies.flatMap((e) => e.types || [trial.stageType])));

  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      const a = pool[i];
      const b = pool[j];
      const syn = evaluateDuoSynergy(a.types, b.types);
      const basePwr = a.pwr + b.pwr;
      let bossBonus = 1;
      for (const bt of bossTypes) {
        if (bt === "fire" && (a.types.includes("water") || b.types.includes("water"))) bossBonus += 0.14;
        if (bt === "water" && (a.types.includes("grass") || b.types.includes("grass"))) bossBonus += 0.14;
        if (bt === "grass" && (a.types.includes("fire") || b.types.includes("fire"))) bossBonus += 0.14;
        if (bt === "wind" && (a.types.includes("electric") || b.types.includes("electric"))) bossBonus += 0.14;
        if (bt === "stone" && (a.types.includes("wind") || b.types.includes("wind"))) bossBonus += 0.14;
        if (bt === "electric" && (a.types.includes("stone") || b.types.includes("stone"))) bossBonus += 0.14;
        if (bt === "light" && (a.types.includes("dark") || b.types.includes("dark"))) bossBonus += 0.14;
        if (bt === "dark" && (a.types.includes("light") || b.types.includes("light"))) bossBonus += 0.14;
      }
      const score = basePwr * syn.outMul * syn.comboMul * bossBonus + (syn.resonant ? 200 : 0);
      if (score > bestScore) {
        bestScore = score;
        bestPair = a.pwr >= b.pwr ? [a.m.id, b.m.id] : [b.m.id, a.m.id];
      }
    }
  }

  ds.primaryId = bestPair[0];
  ds.partnerId = bestPair[1];
  return { ok: true, primaryId: ds.primaryId, partnerId: ds.partnerId };
}

export function recordDualSanctumVictory(state, trialId, battleResult = {}) {
  const ds = ensureDualSanctumState(state);
  const trial = getDualSanctumTrial(trialId);
  if (!trial) return { ok: false, reason: "invalid_trial" };

  const firstClear = !ds.cleared[trial.id];
  const stars = Math.max(1, Math.min(3, Math.floor(Number(battleResult.stars) || 1)));
  const rounds = Math.max(1, Math.floor(Number(battleResult.rounds) || 1));

  if (firstClear) {
    ds.cleared[trial.id] = { stars, clears: 1, bestRounds: rounds };
  } else {
    const prev = ds.cleared[trial.id];
    prev.stars = Math.max(prev.stars || 1, stars);
    prev.clears = (prev.clears || 1) + 1;
    prev.bestRounds = Math.min(prev.bestRounds || rounds, rounds);
  }

  let badgeEarned = false;
  if (!ds.badges.includes(trial.badgeId)) {
    ds.badges.push(trial.badgeId);
    badgeEarned = true;
  }

  // Advance selectedTrialId automatically on first clear if next trial exists
  if (firstClear) {
    const nextTrial = DUAL_SANCTUM_TRIALS.find((t) => t.unlockReq === trial.id);
    if (nextTrial) ds.selectedTrialId = nextTrial.id;
  }

  const rewards = firstClear ? { ...trial.rewards } : { ...(trial.repeatRewards || trial.rewards) };
  return {
    ok: true,
    firstClear,
    badgeEarned,
    badgeId: trial.badgeId,
    badgeName: trial.badgeName,
    rewards,
  };
}

export function claimDualSanctumMilestone(state, milestoneId) {
  const ds = ensureDualSanctumState(state);
  const ms = DUAL_SANCTUM_MILESTONES.find((m) => m.id === milestoneId);
  if (!ms) return { ok: false, reason: "unknown_milestone" };
  if (ds.badges.length < ms.reqBadges) return { ok: false, reason: "locked" };
  if (ds.claimedMilestones[ms.id]) return { ok: false, reason: "already_claimed" };
  ds.claimedMilestones[ms.id] = true;
  return { ok: true, id: ms.id, label: ms.label, rewards: { ...ms.rewards } };
}

export function computeDualSanctumBadgeBonus(state) {
  const badges = Array.isArray(state?.pve?.dualSanctum?.badges) ? state.pve.dualSanctum.badges.length : 0;
  const count = Math.max(0, Math.min(DUAL_SANCTUM_TRIALS.length, badges));
  const badgeOutAdd = Number((count * 0.025).toFixed(4));
  const campComboAdd = state ? computeStarCampAura(state).pveComboAdd || 0 : 0;
  const boutiqueOutAdd = state ? computeStarBoutiqueAura(state).combatAdd || 0 : 0;
  const leagueOutAdd = state ? computeChampionLeagueBonus(state).pveOutAdd || 0 : 0;
  const amberOutAdd = state ? computeAmberRevivalAura(state).combatAdd || 0 : 0;
  const corridorOutAdd = state ? computeStarCorridorBonus(state).pveOutAdd || 0 : 0;
  const ecoTriOutAdd = state ? computeEcoTriCrestBonus(state).pveOutAdd || 0 : 0;
  const acrobatOutAdd = state ? computeAcrobatTrophyBonus(state).pveOutAdd || 0 : 0;
  const migrationOutAdd = state ? computeSeasonMigrationBonus(state).pveOutAdd || 0 : 0;
  const bandTourOutAdd = state ? computeBandTourBonus(state).pveOutAdd || 0 : 0;
  const hotSpringOutAdd = state ? computeHotSpringAura(state).pveOutAdd || 0 : 0;
  const dreamOutAdd = state ? computeDreamLibraryAura(state).pveOutAdd || 0 : 0;
  const fishingOutAdd = state ? computeFishingClubBonus(state).pveOutAdd || 0 : 0;
  const bakeryOutAdd = state ? computeBakeryAura(state).pveOutAdd || 0 : 0;
  const balloonOutAdd = state ? computeBalloonTravelBonus(state).pveOutAdd || 0 : 0;
  const parkOutAdd = state ? computeCloudParkAura(state).pveOutAdd || 0 : 0;
  const stargazeOutAdd = state ? computeStargazeCampBonus(state).pveOutAdd || 0 : 0;
  const iceRinkOutAdd = state ? computeIceRinkBuffs(state).pveOutAdd || 0 : 0;
  const pveOutAdd = Number(
    (
      badgeOutAdd +
      campComboAdd +
      boutiqueOutAdd +
      leagueOutAdd +
      amberOutAdd +
      corridorOutAdd +
      ecoTriOutAdd +
      acrobatOutAdd +
      migrationOutAdd +
      bandTourOutAdd +
      hotSpringOutAdd +
      dreamOutAdd +
      fishingOutAdd +
      bakeryOutAdd +
      balloonOutAdd +
      parkOutAdd +
      stargazeOutAdd +
      iceRinkOutAdd
    ).toFixed(4),
  );
  return {
    badgeCount: count,
    maxBadges: DUAL_SANCTUM_TRIALS.length,
    badgeOutAdd,
    campComboAdd,
    boutiqueOutAdd,
    leagueOutAdd,
    amberOutAdd,
    corridorOutAdd,
    ecoTriOutAdd,
    acrobatOutAdd,
    migrationOutAdd,
    bandTourOutAdd,
    hotSpringOutAdd,
    dreamOutAdd,
    fishingOutAdd,
    bakeryOutAdd,
    balloonOutAdd,
    parkOutAdd,
    stargazeOutAdd,
    iceRinkOutAdd,
    pveOutAdd,
    pveOutMul: Number((1 + pveOutAdd).toFixed(4)),
  };
}

// ============================================================================
// ML-7 「星冠殿堂挑战赛」(Star Crown Hall Gauntlet)
// ============================================================================

export const CHAMPION_LEAGUE_MAX_TIER = 5;
export const CHAMPION_LEAGUE_SQUAD_SIZE = 3;

export const CHAMPION_LEAGUE_STAGES = Object.freeze([
  {
    id: "elite_flame",
    order: 1,
    name: "炎狱殿主厅",
    shortTitle: "炎狱殿主",
    masterTitle: "炎狱殿主 · 赤煌",
    stageType: "fire",
    elements: ["fire", "stone"],
    enemies: [
      { dex: 59, name: "燎原炎狮犬", lvl: 30, stars: 1, types: ["fire"] },
      { dex: 76, name: "镇岳巨岩尊", lvl: 32, stars: 1, types: ["stone", "fire"] },
    ],
    firstRewards: { shinyStarSand: 4, futurecoin: 160, exp: 1500 },
    repeatRewards: { shinyStarSand: 1, futurecoin: 55, exp: 550 },
  },
  {
    id: "elite_tide",
    order: 2,
    name: "沧溟殿主厅",
    shortTitle: "沧溟殿主",
    masterTitle: "沧溟殿主 · 澜汐",
    stageType: "water",
    elements: ["water", "electric"],
    enemies: [
      { dex: 9, name: "镇海重炮龟", lvl: 42, stars: 1, types: ["water"] },
      { dex: 130, name: "覆海苍龙", lvl: 44, stars: 2, types: ["water", "wind"] },
    ],
    firstRewards: { shinyStarSand: 5, futurecoin: 240, exp: 2600 },
    repeatRewards: { shinyStarSand: 1, futurecoin: 80, exp: 900 },
  },
  {
    id: "elite_verdant",
    order: 3,
    name: "翠岚殿主厅",
    shortTitle: "翠岚殿主",
    masterTitle: "翠岚殿主 · 苍叶",
    stageType: "grass",
    elements: ["grass", "wind"],
    enemies: [
      { dex: 3, name: "森罗古龙", lvl: 54, stars: 2, types: ["grass"] },
      { dex: 18, name: "苍穹羽皇", lvl: 56, stars: 2, types: ["wind", "grass"] },
    ],
    firstRewards: { shinyStarSand: 6, futurecoin: 340, exp: 4200 },
    repeatRewards: { shinyStarSand: 2, futurecoin: 115, exp: 1400 },
  },
  {
    id: "elite_astral",
    order: 4,
    name: "星穹殿主厅",
    shortTitle: "星穹殿主",
    masterTitle: "星穹殿主 · 星璇",
    stageType: "light",
    elements: ["light", "dark"],
    enemies: [
      { dex: 36, name: "月华星后", lvl: 66, stars: 2, types: ["light"] },
      { dex: 94, name: "噬影夜魔王", lvl: 68, stars: 3, types: ["dark"] },
    ],
    firstRewards: { shinyStarSand: 8, futurecoin: 480, exp: 6500 },
    repeatRewards: { shinyStarSand: 2, futurecoin: 160, exp: 2200 },
  },
  {
    id: "grand_champion",
    order: 5,
    name: "圣殿总冠军巅峰殿",
    shortTitle: "圣殿总冠军",
    masterTitle: "圣殿总冠军 · 曜宸",
    stageType: "light",
    elements: ["fire", "water", "light"],
    isChampion: true,
    enemies: [
      { dex: 6, name: "焚天炽翼龙", lvl: 74, stars: 3, types: ["fire", "wind"] },
      { dex: 149, name: "凌霄圣龙", lvl: 77, stars: 3, types: ["mystic", "wind"] },
      { dex: 150, name: "太虚星蚀尊", lvl: 80, stars: 3, types: ["mystic", "light"] },
    ],
    firstRewards: { shinyStarSand: 12, futurecoin: 800, exp: 11000, seasonMark: 5 },
    repeatRewards: { shinyStarSand: 4, futurecoin: 280, exp: 3800, seasonMark: 2 },
  },
]);

export function getChampionLeagueStage(stageIdOrIdx) {
  if (typeof stageIdOrIdx === "number" && Number.isFinite(stageIdOrIdx)) {
    return CHAMPION_LEAGUE_STAGES[Math.max(0, Math.min(CHAMPION_LEAGUE_STAGES.length - 1, Math.floor(stageIdOrIdx)))] || null;
  }
  return CHAMPION_LEAGUE_STAGES.find((s) => s.id === stageIdOrIdx) || null;
}

export function ensureChampionLeagueState(state) {
  if (!state || typeof state !== "object") {
    return {
      squadIds: [],
      activeStageIdx: 0,
      carryHpRatioByMon: {},
      clearedStages: {},
      hallOfFameTier: 0,
      championClears: 0,
      hallOfFameRecords: [],
      lastRunSummary: null,
    };
  }
  if (!state.pve || typeof state.pve !== "object") {
    state.pve = { progress: {}, dailyAttempts: 0, dailyResetDate: "", selectedIds: [] };
  }
  const raw = state.pve.championLeague && typeof state.pve.championLeague === "object" ? state.pve.championLeague : {};

  const monList = Array.isArray(state?.mons?.list) ? state.mons.list : null;
  const validMonSet = monList
    ? new Set(monList.filter((m) => m && typeof m.id === "number" && m.id > 0).map((m) => Math.floor(m.id)))
    : null;

  const squadIds = [];
  if (Array.isArray(raw.squadIds)) {
    for (const item of raw.squadIds) {
      const id = Math.floor(Number(item) || 0);
      if (id <= 0 || squadIds.includes(id)) continue;
      if (validMonSet && !validMonSet.has(id)) continue;
      squadIds.push(id);
      if (squadIds.length >= CHAMPION_LEAGUE_SQUAD_SIZE) break;
    }
  }

  const activeStageIdx = Math.max(0, Math.min(CHAMPION_LEAGUE_STAGES.length - 1, Math.floor(Number(raw.activeStageIdx) || 0)));

  const carryHpRatioByMon = {};
  if (raw.carryHpRatioByMon && typeof raw.carryHpRatioByMon === "object") {
    for (const [k, v] of Object.entries(raw.carryHpRatioByMon)) {
      const mid = Math.floor(Number(k) || 0);
      const ratio = Number(v);
      if (mid > 0 && Number.isFinite(ratio) && ratio > 0) {
        carryHpRatioByMon[String(mid)] = Math.max(0.05, Math.min(1, ratio));
      }
    }
  }

  const clearedStages = {};
  if (raw.clearedStages && typeof raw.clearedStages === "object") {
    for (const stg of CHAMPION_LEAGUE_STAGES) {
      const c = raw.clearedStages[stg.id];
      if (!c) continue;
      clearedStages[stg.id] = {
        clears: Math.max(1, Math.floor(Number(c.clears) || 1)),
        stars: Math.max(1, Math.min(3, Math.floor(Number(c.stars) || 1))),
        bestRounds: Math.max(1, Math.floor(Number(c.bestRounds) || 8)),
      };
    }
  }

  const championClears = Math.max(
    clearedStages.grand_champion?.clears || 0,
    Math.floor(Number(raw.championClears) || 0),
  );
  const hallOfFameTier = Math.max(
    0,
    Math.min(CHAMPION_LEAGUE_MAX_TIER, Math.max(Math.min(CHAMPION_LEAGUE_MAX_TIER, championClears), Math.floor(Number(raw.hallOfFameTier) || 0))),
  );

  const hallOfFameRecords = Array.isArray(raw.hallOfFameRecords)
    ? raw.hallOfFameRecords
        .filter((r) => r && typeof r === "object")
        .slice(0, 6)
        .map((r) => ({
          tier: Math.max(1, Math.min(CHAMPION_LEAGUE_MAX_TIER, Math.floor(Number(r.tier) || 1))),
          at: typeof r.at === "number" && Number.isFinite(r.at) ? r.at : 0,
          rounds: Math.max(1, Math.floor(Number(r.rounds) || 1)),
          squad: Array.isArray(r.squad)
            ? r.squad.slice(0, 3).map((m) => ({
                id: Math.floor(Number(m?.id) || 0),
                dex: Math.floor(Number(m?.dex) || 1),
                name: typeof m?.name === "string" ? m.name : "伙伴",
                lvl: Math.max(1, Math.floor(Number(m?.lvl) || 1)),
                ribbons: Math.max(1, Math.floor(Number(m?.ribbons) || 1)),
              }))
            : [],
        }))
    : [];

  const clean = {
    squadIds,
    activeStageIdx,
    carryHpRatioByMon,
    clearedStages,
    hallOfFameTier,
    championClears,
    hallOfFameRecords,
    lastRunSummary: raw.lastRunSummary && typeof raw.lastRunSummary === "object" ? raw.lastRunSummary : null,
  };

  if (state.pve.championLeague && typeof state.pve.championLeague === "object") {
    Object.assign(state.pve.championLeague, clean);
    return state.pve.championLeague;
  }
  state.pve.championLeague = clean;
  return clean;
}

export function computeChampionLeagueBonus(state) {
  const rawTier = Math.floor(Number(state?.pve?.championLeague?.hallOfFameTier) || 0);
  const rawClears = Math.floor(Number(state?.pve?.championLeague?.championClears) || 0);
  const tier = Math.max(0, Math.min(CHAMPION_LEAGUE_MAX_TIER, Math.max(rawTier, Math.min(CHAMPION_LEAGUE_MAX_TIER, rawClears))));
  const round4 = (n) => Math.round(n * 10000) / 10000;
  const prodAdd = round4(tier * 0.04);
  const catchAdd = round4(tier * 0.008);
  const pveOutAdd = round4(tier * 0.04);
  return {
    hallOfFameTier: tier,
    maxTier: CHAMPION_LEAGUE_MAX_TIER,
    championClears: Math.max(0, rawClears),
    prodAdd,
    prodMul: round4(1 + prodAdd),
    catchAdd,
    pveOutAdd,
    pveOutMul: round4(1 + pveOutAdd),
  };
}

export function setChampionLeagueSquad(state, monIds = []) {
  const cl = ensureChampionLeagueState(state);
  const list = Array.isArray(state?.mons?.list) ? state.mons.list.filter(Boolean) : [];
  const validSet = new Set(list.map((m) => m.id));
  // ML-15 统一忙碌排除：手动编入同样拒绝外出 / 驻场中的伙伴（读 collection_fun.js 外出登记表）
  const awayIds = getAwayMonIds(state);
  const picked = [];
  const rejectedAway = [];
  for (const rawId of Array.isArray(monIds) ? monIds : []) {
    const id = Math.floor(Number(rawId) || 0);
    if (id > 0 && validSet.has(id) && !picked.includes(id)) {
      if (awayIds.has(id)) {
        if (!rejectedAway.includes(id)) rejectedAway.push(id);
        continue;
      }
      picked.push(id);
      if (picked.length >= CHAMPION_LEAGUE_SQUAD_SIZE) break;
    }
  }
  cl.squadIds = picked;
  cl.carryHpRatioByMon = {};
  cl.activeStageIdx = 0;
  return { ok: picked.length > 0, squadIds: cl.squadIds.slice(), rejectedAway };
}

export function toggleChampionLeagueSquadMon(state, monId) {
  const cl = ensureChampionLeagueState(state);
  const id = Math.floor(Number(monId) || 0);
  const list = Array.isArray(state?.mons?.list) ? state.mons.list.filter(Boolean) : [];
  if (!list.some((m) => m.id === id)) return { ok: false, reason: "invalid_mon" };
  const idx = cl.squadIds.indexOf(id);
  if (idx >= 0) {
    cl.squadIds.splice(idx, 1);
  } else {
    // ML-15 统一忙碌排除：外出 / 驻场中的伙伴不能手动编入星冠殿堂（原因码 mon_away，附外出玩法 id 与标签）
    const away = getAwayActivityOfMon(state, id);
    if (away) return { ok: false, reason: "mon_away", awayId: away.id, awayLabel: away.label };
    if (cl.squadIds.length >= CHAMPION_LEAGUE_SQUAD_SIZE) {
      return { ok: false, reason: "squad_full" };
    }
    cl.squadIds.push(id);
  }
  cl.carryHpRatioByMon = {};
  cl.activeStageIdx = 0;
  return { ok: true, squadIds: cl.squadIds.slice() };
}

export function autofillChampionLeagueSquad(state, getMonTypesFn, monPowerFn) {
  const cl = ensureChampionLeagueState(state);
  // ML-14 统一忙碌排除：自动编队跳过外出 / 驻场中的伙伴
  const list = excludeAwayMons(state, Array.isArray(state?.mons?.list) ? state.mons.list : []);
  if (!list.length) {
    cl.squadIds = [];
    return { ok: false, reason: "no_mons", squadIds: [] };
  }
  const getTypes = typeof getMonTypesFn === "function" ? getMonTypesFn : (m) => m.types || [];
  const getPwr = typeof monPowerFn === "function" ? monPowerFn : (m) => defaultMonPower(m);

  const scored = list
    .map((m) => {
      const basePwr = getPwr(m);
      const bq = getMonBoutiqueBonus(state, m.id);
      const tuned = normalizeMintTuning(m.mintTuning) ? 1.08 : 1;
      const types = getTypes(m);
      return { m, types, score: basePwr * bq.combatMul * tuned };
    })
    .sort((a, b) => b.score - a.score);

  const chosen = [];
  const seenTypes = new Set();
  while (chosen.length < CHAMPION_LEAGUE_SQUAD_SIZE && chosen.length < scored.length) {
    let bestItem = null;
    let bestVal = -Infinity;
    for (const item of scored) {
      if (chosen.some((c) => c.m.id === item.m.id)) continue;
      const newElemBonus = item.types.some((t) => !seenTypes.has(t)) ? 1.12 : 1;
      const val = item.score * newElemBonus;
      if (val > bestVal) {
        bestVal = val;
        bestItem = item;
      }
    }
    if (!bestItem) break;
    chosen.push(bestItem);
    for (const t of bestItem.types) seenTypes.add(t);
  }

  cl.squadIds = chosen.map((c) => c.m.id);
  cl.carryHpRatioByMon = {};
  cl.activeStageIdx = 0;
  return { ok: cl.squadIds.length > 0, squadIds: cl.squadIds.slice() };
}

export function resetChampionLeagueProgress(state) {
  const cl = ensureChampionLeagueState(state);
  cl.activeStageIdx = 0;
  cl.carryHpRatioByMon = {};
  return { ok: true, activeStageIdx: 0 };
}

/**
 * Evaluates all 4 expansion synergy pillars (ML-4 Bond + ML-5 Tuned Nature + ML-6 Starlight Camp + ML-7 Boutique Accessories)
 * for a Champion League 3-partner squad.
 */
export function evaluateLeagueSquadSynergy(state, squadMons = [], opts = {}) {
  const mons = Array.isArray(squadMons) ? squadMons.filter(Boolean).slice(0, CHAMPION_LEAGUE_SQUAD_SIZE) : [];
  const getTypes =
    typeof opts.getMonTypes === "function"
      ? opts.getMonTypes
      : (m) => (Array.isArray(m?.types) ? m.types : opts.getBeastDataByDex?.(m?.dex)?.types || []);

  // 1) ML-4 Element Bond Resonance (Bond Atlas + Intra-Squad Duo Combos)
  const atlasRes = state ? computeElementalBondResonance(state) : { pveOutAdd: 0, activeName: "" };
  const activeCombos = [];
  let duoPairBonus = 0;
  for (let i = 0; i < mons.length; i++) {
    for (let j = i + 1; j < mons.length; j++) {
      const syn = evaluateDuoSynergy(getTypes(mons[i]), getTypes(mons[j]), null);
      if (syn.resonant) {
        if (!activeCombos.includes(syn.name)) activeCombos.push(syn.name);
        duoPairBonus += Math.max(0.04, (syn.outMul - 1) * 0.28);
      }
    }
  }
  const bondOutAdd = Math.min(0.32, (atlasRes.pveOutAdd || 0) + duoPairBonus + (atlasRes.unlockedBondsCount || 0) * 0.015);

  // 2) ML-5 Tuned Nature (Mint Tuning + Offensive/Speed Natures)
  let tunedCount = 0;
  let combatNatureCount = 0;
  for (const m of mons) {
    if (normalizeMintTuning(m.mintTuning)) tunedCount += 1;
    if (m.nature && m.nature !== "hardy" && m.nature !== "docile" && m.nature !== "serious" && m.nature !== "bashful" && m.nature !== "quirky") {
      combatNatureCount += 1;
    }
  }
  const tuningOutAdd = Math.min(0.24, tunedCount * 0.055 + combatNatureCount * 0.015);
  const speAdd = Math.min(0.18, tunedCount * 0.04 + (activeCombos.length > 0 ? 0.04 : 0));

  // 3) ML-6 Starlight Camp & Cuisine Buffs
  const campAura = state ? computeStarCampAura(state, opts) : { pveComboAdd: 0, activeFeasts: [], stationedCount: 0 };
  const campOutAdd = Math.min(0.45, campAura.pveComboAdd || 0);
  const interStageHealPct = Math.min(
    0.65,
    0.35 + (campAura.activeFeasts?.length || 0) * 0.06 + (campAura.stationedCount > 0 ? 0.04 : 0),
  );

  // 4) ML-7 Starlight Styling Boutique Accessories & Aurora Sheen
  const boutiqueGlobal = state ? computeStarBoutiqueAura(state) : { combatAdd: 0, equippedCount: 0 };
  let squadStyledCount = 0;
  let squadPersonalCombatAdd = 0;
  for (const m of mons) {
    const b = getMonBoutiqueBonus(state, m.id);
    if (b.styled) {
      squadStyledCount += 1;
      squadPersonalCombatAdd += b.combatAdd;
    }
  }
  const boutiqueOutAdd = Math.min(
    0.5,
    (boutiqueGlobal.combatAdd || 0) + (mons.length > 0 ? squadPersonalCombatAdd / mons.length : 0),
  );

  // Existing Sanctum Badges & Hall-of-Fame Tier
  const badgeCount = Array.isArray(state?.pve?.dualSanctum?.badges) ? state.pve.dualSanctum.badges.length : 0;
  const sanctumOutAdd = Math.min(0.15, badgeCount * 0.025);
  const leagueBonus = computeChampionLeagueBonus(state);

  const round4 = (n) => Math.round(n * 10000) / 10000;
  const totalOutAdd = round4(bondOutAdd + tuningOutAdd + campOutAdd + boutiqueOutAdd + sanctumOutAdd + leagueBonus.pveOutAdd);
  const dmgReduction = round4(
    Math.min(
      0.32,
      (activeCombos.length > 0 ? 0.06 : 0) +
        tunedCount * 0.02 +
        (campAura.activeFeasts?.length > 0 ? 0.05 : 0) +
        squadStyledCount * 0.04,
    ),
  );

  return {
    squadCount: mons.length,
    bondOutAdd: round4(bondOutAdd),
    activeCombos,
    tunedCount,
    tuningOutAdd: round4(tuningOutAdd),
    feastCount: campAura.activeFeasts?.length || 0,
    campOutAdd: round4(campOutAdd),
    squadStyledCount,
    boutiqueOutAdd: round4(boutiqueOutAdd),
    hallOfFameTier: leagueBonus.hallOfFameTier,
    leagueTierOutAdd: leagueBonus.pveOutAdd,
    totalOutAdd,
    playerDamageMul: round4(1 + totalOutAdd),
    incomingDamageMul: round4(1 - dmgReduction),
    speMul: round4(1 + speAdd),
    interStageHealPct: round4(interStageHealPct),
  };
}

function makeLeagueEnemyUnits(stage) {
  const stageType = stage.stageType || "light";
  const specialTypes = new Set(["fire", "water", "electric", "grass", "wind", "mystic", "light"]);
  const specialLean = specialTypes.has(stageType);
  return stage.enemies.map((e, idx) => {
    const lvl = Math.max(1, Math.min(100, Math.floor(e.lvl || 30)));
    const tierBonus = e.stars >= 3 ? 42 : e.stars >= 2 ? 26 : e.stars >= 1 ? 12 : 0;
    const dexBase = e.dex || 1;
    const starMul = getStarBonusMul(e.stars || 0);
    // 5-stage consecutive gauntlet scale (0.86x per boss so 11-boss endurance run rewards synergy without attrition wall)
    const lvlMul = (1 + (lvl - 1) * 0.032) * starMul * 0.86;
    const maxHp = Math.max(1, Math.floor((50 + (dexBase % 45) + tierBonus) * lvlMul));
    return {
      side: "enemy",
      idx,
      name: e.name || `守殿灵兽${idx + 1}`,
      types: Array.isArray(e.types) && e.types.length ? e.types.slice(0, 2) : [stageType],
      maxHp,
      hp: maxHp,
      atk: Math.max(1, Math.floor((45 + (dexBase % 40) + tierBonus + (specialLean ? -3 : 5)) * lvlMul)),
      spa: Math.max(1, Math.floor((43 + ((dexBase * 7) % 42) + tierBonus + (specialLean ? 5 : -3)) * lvlMul)),
      def: Math.max(1, Math.floor((40 + (dexBase % 35) + tierBonus + (specialLean ? -2 : 3)) * lvlMul)),
      spd: Math.max(1, Math.floor((38 + ((dexBase * 5) % 36) + tierBonus + (specialLean ? 3 : -2)) * lvlMul)),
      spe: Math.max(1, Math.floor((42 + (dexBase % 38) + tierBonus) * lvlMul)),
    };
  });
}

export function estimateLeagueStagePower(stage) {
  if (!stage) return 0;
  return estimateStageEnemyPower({ type: stage.stageType, enemies: stage.enemies });
}

function applyRewardGrant(state, rewards, { addRes, addExpToMon, squadMons }) {
  for (const [rid, amt0] of Object.entries(rewards || {})) {
    const amt = Math.max(0, Math.floor(Number(amt0) || 0));
    if (amt <= 0) continue;
    if (rid === "exp") {
      if (typeof addExpToMon === "function") {
        for (const m of squadMons) addExpToMon(m, amt);
      } else {
        for (const m of squadMons) m.exp = Math.max(0, Math.floor((m.exp || 0) + amt));
      }
      continue;
    }
    if (typeof addRes === "function") {
      addRes(rid, amt);
    } else if (state?.res) {
      if (!state.res[rid] || typeof state.res[rid] !== "object") {
        state.res[rid] = { value: 0, cap: 9999 };
      }
      const cap = typeof state.res[rid].cap === "number" && state.res[rid].cap > 0 ? state.res[rid].cap : 9999;
      state.res[rid].value = Math.min(cap, Math.max(0, (state.res[rid].value || 0) + amt));
    }
  }
}

/**
 * Simulates the 5-stage consecutive Champion League Elite Four & Grand Champion Gauntlet
 * (or a single active stage when opts.mode === "single") with a 3-partner squad.
 */
export function simulateLeagueGauntlet(state, opts = {}) {
  const cl = ensureChampionLeagueState(state);
  const list = Array.isArray(state?.mons?.list) ? state.mons.list.filter(Boolean) : [];
  const getTypes =
    typeof opts.getMonTypes === "function"
      ? opts.getMonTypes
      : (m) => (Array.isArray(m?.types) && m.types.length ? m.types : opts.getBeastDataByDex?.(m?.dex)?.types || ["wind"]);
  const getStats =
    typeof opts.getMonCurrentStats === "function"
      ? opts.getMonCurrentStats
      : (m) => getMonCurrentStats(m, opts.getBeastDataByDex);

  let squadIds = Array.isArray(opts.squadIds) && opts.squadIds.length
    ? opts.squadIds
    : cl.squadIds;
  if (!squadIds.length && list.length > 0) {
    autofillChampionLeagueSquad(state, getTypes, opts.monPower);
    squadIds = cl.squadIds;
  }

  // ML-15 统一忙碌排除：已在队中但正在外出 / 驻场的伙伴本场不出战（保留席位，回来后自动归队）
  const leagueAwayMap = getAwayActivityMap(state);
  const squadAll = squadIds
    .map((id) => list.find((m) => m && m.id === id))
    .filter(Boolean)
    .slice(0, CHAMPION_LEAGUE_SQUAD_SIZE);
  const benchedAway = squadAll
    .filter((m) => leagueAwayMap.has(m.id))
    .map((m) => ({ monId: m.id, name: m.name || `伙伴#${m.id}`, awayId: leagueAwayMap.get(m.id).id, awayLabel: leagueAwayMap.get(m.id).label }));
  const squadMons = squadAll.filter((m) => !leagueAwayMap.has(m.id));

  if (!squadMons.length) {
    const away = benchedAway.length > 0;
    return {
      ok: false,
      reason: away ? "squad_away" : "empty_squad",
      benchedAway,
      championCleared: false,
      stagesCleared: 0,
      stageResults: [],
      rewardsEarned: {},
      log: [
        away
          ? `— 冠军小队的伙伴都在外出（${benchedAway.map((b) => `${b.name} ${b.awayLabel}`).join("、")}），叫回来或重新编队后再挑战 —`
          : "— 需至少编入 1~3 只伙伴方可挑战星冠殿堂 —",
      ],
    };
  }

  const commit = opts.commit !== false;
  const mode = opts.mode === "single" ? "single" : "full";
  const synergy = evaluateLeagueSquadSynergy(state, squadMons, {
    getMonTypes: getTypes,
    getBeastDataByDex: opts.getBeastDataByDex,
  });

  // Build persistent gauntlet player units with personal Boutique + Ribbon + Synergy stats
  const playerUnits = squadMons.map((m, idx) => {
    const rawStats = getStats(m);
    const bq = getMonBoutiqueBonus(state, m.id);
    const ribbonMul = 1 + Math.min(5, Math.max(0, Math.floor(m.hallOfFameRibbons || 0))) * 0.04;
    const unitMul = bq.combatMul * ribbonMul;
    const maxHp = Math.max(1, Math.floor((rawStats.hp || 40) * unitMul));
    const carryRatio =
      mode === "single" && cl.activeStageIdx > 0 && cl.carryHpRatioByMon[String(m.id)]
        ? cl.carryHpRatioByMon[String(m.id)]
        : 1;
    return {
      side: "player",
      idx,
      monId: m.id,
      name: m.name || `伙伴#${m.id}`,
      types: getTypes(m),
      maxHp,
      hp: Math.max(1, Math.floor(maxHp * carryRatio)),
      atk: Math.max(1, Math.floor((rawStats.atk || 25) * unitMul)),
      spa: Math.max(1, Math.floor((rawStats.spa || rawStats.atk || 25) * unitMul)),
      def: Math.max(1, Math.floor((rawStats.def || 25) * unitMul)),
      spd: Math.max(1, Math.floor((rawStats.spd || rawStats.def || 25) * unitMul)),
      spe: Math.max(1, Math.floor((rawStats.spe || 25) * unitMul * synergy.speMul)),
    };
  });

  const startIdx = mode === "single" ? cl.activeStageIdx : 0;
  const endIdx = mode === "single" ? cl.activeStageIdx : CHAMPION_LEAGUE_STAGES.length - 1;

  const log = [
    `— 星冠殿堂挑战赛（${mode === "full" ? "五连战登顶挑战" : `第 ${startIdx + 1}/5 殿逐关挑战`}）—`,
    `阵容加成：总增伤 +${Math.round(synergy.totalOutAdd * 100)}%（羁绊+${Math.round(synergy.bondOutAdd * 100)}% / 调律+${Math.round(synergy.tuningOutAdd * 100)}% / 露营盛宴+${Math.round(synergy.campOutAdd * 100)}% / 星辉配饰+${Math.round(synergy.boutiqueOutAdd * 100)}%）`,
  ];
  if (benchedAway.length) log.push(`本场不出战：${benchedAway.map((b) => `${b.name}（${b.awayLabel}）`).join("、")}`);

  const stageResults = [];
  const rewardsEarned = {};
  let stagesCleared = 0;
  let totalRounds = 0;
  let stoppedStage = null;

  for (let sIdx = startIdx; sIdx <= endIdx; sIdx++) {
    const stage = CHAMPION_LEAGUE_STAGES[sIdx];
    const enemyUnits = makeLeagueEnemyUnits(stage);
    log.push(`【第 ${stage.order} 战 · ${stage.masterTitle}】守殿阵容：${enemyUnits.map((e) => e.name).join(" ＆ ")}`);

    let pIdx = playerUnits.findIndex((u) => u.hp > 0);
    if (pIdx < 0) pIdx = 0;
    let eIdx = 0;
    let rounds = 0;
    const maxRounds = 180;
    const dmgOpts = {
      playerDamageMul: synergy.playerDamageMul,
      incomingDamageMul: synergy.incomingDamageMul,
    };

    while (pIdx < playerUnits.length && eIdx < enemyUnits.length && rounds < maxRounds) {
      rounds += 1;
      const p = playerUnits[pIdx];
      const e = enemyUnits[eIdx];
      if (p.hp <= 0) {
        const nextAlive = playerUnits.findIndex((u, k) => k > pIdx && u.hp > 0);
        if (nextAlive < 0) {
          pIdx = playerUnits.length;
          break;
        }
        pIdx = nextAlive;
        continue;
      }
      if (e.hp <= 0) {
        eIdx += 1;
        continue;
      }

      const pFirst = p.spe >= e.spe;
      const first = pFirst ? p : e;
      const second = pFirst ? e : p;

      const hit1 = calcDamage(first, second, stage.stageType, dmgOpts);
      second.hp = Math.max(0, second.hp - hit1.damage);
      if (second.hp <= 0) {
        if (second.side === "enemy") {
          log.push(`  R${rounds}: ${first.name} 击破 ${second.name}！`);
          eIdx += 1;
        } else {
          log.push(`  R${rounds}: ${second.name} 力战退场！`);
          const nextAlive = playerUnits.findIndex((u) => u.hp > 0);
          pIdx = nextAlive >= 0 ? nextAlive : playerUnits.length;
        }
        continue;
      }

      const hit2 = calcDamage(second, first, stage.stageType, dmgOpts);
      first.hp = Math.max(0, first.hp - hit2.damage);
      if (first.hp <= 0) {
        if (first.side === "enemy") {
          log.push(`  R${rounds}: ${second.name} 反击击破 ${first.name}！`);
          eIdx += 1;
        } else {
          log.push(`  R${rounds}: ${first.name} 力战退场！`);
          const nextAlive = playerUnits.findIndex((u) => u.hp > 0);
          pIdx = nextAlive >= 0 ? nextAlive : playerUnits.length;
        }
      }
    }

    totalRounds += rounds;
    const totalMaxHp = playerUnits.reduce((acc, u) => acc + u.maxHp, 0);
    const remHp = playerUnits.reduce((acc, u) => acc + Math.max(0, u.hp), 0);
    const teamHpPct = totalMaxHp > 0 ? remHp / totalMaxHp : 0;
    const enemyMaxHp = enemyUnits.reduce((acc, u) => acc + u.maxHp, 0);
    const enemyRemHp = enemyUnits.reduce((acc, u) => acc + Math.max(0, u.hp), 0);
    const enemyHpPct = enemyMaxHp > 0 ? enemyRemHp / enemyMaxHp : 0;

    const win = eIdx >= enemyUnits.length || (rounds >= maxRounds && teamHpPct > enemyHpPct);
    const stars = win ? (teamHpPct > 0.68 ? 3 : teamHpPct > 0.32 ? 2 : 1) : 0;

    stageResults.push({
      stageId: stage.id,
      order: stage.order,
      title: stage.masterTitle,
      win,
      stars,
      rounds,
      teamHpPct: Number(teamHpPct.toFixed(4)),
    });

    if (!win) {
      stoppedStage = stage;
      log.push(`— 止步于【${stage.masterTitle}】，整备配饰与露营料理后可再次冲击！—`);
      break;
    }

    stagesCleared += 1;
    const firstClear = !cl.clearedStages[stage.id];
    const stageRw = firstClear ? stage.firstRewards : stage.repeatRewards;
    for (const [rk, rv] of Object.entries(stageRw)) {
      rewardsEarned[rk] = (rewardsEarned[rk] || 0) + rv;
    }

    if (commit) {
      if (firstClear) {
        cl.clearedStages[stage.id] = { clears: 1, stars, bestRounds: rounds };
      } else {
        const prev = cl.clearedStages[stage.id];
        prev.clears = (prev.clears || 1) + 1;
        prev.stars = Math.max(prev.stars || 1, stars);
        prev.bestRounds = Math.min(prev.bestRounds || rounds, rounds);
      }
      applyRewardGrant(state, stageRw, {
        addRes: opts.addRes,
        addExpToMon: opts.addExpToMon,
        squadMons,
      });
    }

    log.push(`  【攻克】${stage.masterTitle}（${stars}星 · 剩余总血量 ${Math.round(teamHpPct * 100)}%）`);

    // Intermission recovery before next Elite / Champion bout
    const hasNextBout = mode === "full" ? sIdx < endIdx : sIdx < CHAMPION_LEAGUE_STAGES.length - 1;
    if (hasNextBout) {
      for (const u of playerUnits) {
        if (u.hp > 0) {
          u.hp = Math.min(u.maxHp, u.hp + Math.floor(u.maxHp * synergy.interStageHealPct));
        } else {
          // Second-wind rally from campfire warmth revives fallen partner at 30% HP
          u.hp = Math.max(1, Math.floor(u.maxHp * 0.3));
        }
      }
    }
  }

  const lastClearedStageId = stageResults.filter((r) => r.win).pop()?.stageId || null;
  const championCleared = lastClearedStageId === "grand_champion";
  let ribbonStampedIds = [];
  let newHallOfFameTier = cl.hallOfFameTier;

  if (commit) {
    if (mode === "single") {
      if (championCleared || stoppedStage) {
        cl.activeStageIdx = 0;
        cl.carryHpRatioByMon = {};
      } else {
        cl.activeStageIdx = Math.min(CHAMPION_LEAGUE_STAGES.length - 1, startIdx + 1);
        const nextCarry = {};
        for (const u of playerUnits) {
          nextCarry[String(u.monId)] = Number(Math.max(0.1, Math.min(1, u.hp / u.maxHp)).toFixed(4));
        }
        cl.carryHpRatioByMon = nextCarry;
      }
    } else {
      cl.activeStageIdx = 0;
      cl.carryHpRatioByMon = {};
    }

    if (championCleared) {
      cl.championClears = (cl.championClears || 0) + 1;
      cl.hallOfFameTier = Math.min(CHAMPION_LEAGUE_MAX_TIER, Math.max(cl.hallOfFameTier || 0, cl.championClears));
      newHallOfFameTier = cl.hallOfFameTier;

      const nowAt = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
      for (const m of squadMons) {
        const prevRibbons = typeof m.hallOfFameRibbons === "number" && Number.isFinite(m.hallOfFameRibbons)
          ? Math.max(0, Math.floor(m.hallOfFameRibbons))
          : 0;
        m.hallOfFameRibbons = prevRibbons + 1;
        if (!m.firstHallOfFameAt) m.firstHallOfFameAt = nowAt;
        ribbonStampedIds.push(m.id);
      }

      const record = {
        tier: newHallOfFameTier,
        at: nowAt,
        rounds: totalRounds,
        squad: squadMons.map((m) => ({
          id: m.id,
          dex: m.dex || 1,
          name: m.name || "伙伴",
          lvl: m.lvl || 1,
          ribbons: m.hallOfFameRibbons || 1,
        })),
      };
      cl.hallOfFameRecords = [record, ...(cl.hallOfFameRecords || [])].slice(0, 6);
      log.push(
        `【殿堂授勋】荣登冠军殿堂（殿堂阶位 Tier ${newHallOfFameTier}/${CHAMPION_LEAGUE_MAX_TIER}）！参战伙伴已刻印【冠军殿堂绶带】！`,
      );
    }

    cl.lastRunSummary = {
      mode,
      stagesCleared,
      championCleared,
      totalRounds,
      stoppedTitle: stoppedStage?.masterTitle || null,
      rewardsEarned: { ...rewardsEarned },
      hallOfFameTier: newHallOfFameTier,
      ribbonStampedIds,
    };
  }

  return {
    ok: true,
    mode,
    win: stagesCleared > 0 && !stoppedStage,
    championCleared,
    stagesCleared,
    totalStages: mode === "full" ? CHAMPION_LEAGUE_STAGES.length : 1,
    totalRounds,
    stoppedStageId: stoppedStage?.id || null,
    stoppedTitle: stoppedStage?.masterTitle || null,
    stageResults,
    rewardsEarned,
    ribbonStampedIds,
    hallOfFameTier: newHallOfFameTier,
    synergy,
    benchedAway,
    log,
  };
}

// ============================================================================
// ML-8 「双系星轨回廊无尽试炼」(Dual-Element Star-Rail Corridor Endless Trial)
// ============================================================================

export const STAR_CORRIDOR_MAX_TIER = 5;
export const STAR_CORRIDOR_SQUAD_SIZE = 4;
export const STAR_CORRIDOR_SURGE_STEPS = 5;
export const STAR_CORRIDOR_TIER_FLOORS = Object.freeze([1, 3, 5, 8, 10]);

export const STAR_CORRIDOR_DUAL_ORBITS = Object.freeze([
  {
    id: "orbit_ember_gale",
    name: "赤焰苍风星轨",
    shortName: "赤焰苍风",
    elements: ["fire", "wind"],
    recTypes: ["water", "stone", "electric"],
    bossPair: [
      { dex: 6, name: "炽翼天龙" },
      { dex: 18, name: "苍穹风暴隼" },
    ],
    vanguard: { dex: 59, name: "烈风炎狮" },
    desc: "烈焰与罡风双轨交织：出战水 / 岩 / 电或同频双系伙伴可引发星轨破阵增幅",
  },
  {
    id: "orbit_tide_volt",
    name: "沧澜紫电星轨",
    shortName: "沧澜紫电",
    elements: ["water", "electric"],
    recTypes: ["grass", "stone", "mystic"],
    bossPair: [
      { dex: 130, name: "怒涛苍蛟" },
      { dex: 26, name: "紫电雷鼓王" },
    ],
    vanguard: { dex: 121, name: "渊海宝星皇" },
    desc: "怒潮与雷霆双轨共振：出战草 / 岩 / 秘或同频双系伙伴可引发星轨破阵增幅",
  },
  {
    id: "orbit_verdant_crag",
    name: "森罗玄岩星轨",
    shortName: "森罗玄岩",
    elements: ["grass", "stone"],
    recTypes: ["fire", "wind", "water"],
    bossPair: [
      { dex: 3, name: "森罗巨龙" },
      { dex: 112, name: "裂岳重甲尊" },
    ],
    vanguard: { dex: 95, name: "古脉晶岩蛇" },
    desc: "古藤与玄岩双轨盘桓：出战火 / 风 / 水或同频双系伙伴可引发星轨破阵增幅",
  },
  {
    id: "orbit_dawn_umbral",
    name: "破晓永夜星轨",
    shortName: "破晓永夜",
    elements: ["light", "dark"],
    recTypes: ["dark", "light", "mystic"],
    bossPair: [
      { dex: 36, name: "曜光星月后" },
      { dex: 94, name: "冥影夜魔尊" },
    ],
    vanguard: { dex: 197, name: "月影星绒兽" },
    desc: "辉光与永夜双轨逆旋：出战光 / 暗 / 秘系伙伴可引发阴阳星轨共鸣增幅",
  },
  {
    id: "orbit_astral_tide",
    name: "星穹渊海星轨",
    shortName: "星穹渊海",
    elements: ["mystic", "water"],
    recTypes: ["mystic", "grass", "electric"],
    bossPair: [
      { dex: 149, name: "星穹圣翼龙" },
      { dex: 230, name: "沧溟龙皇" },
    ],
    vanguard: { dex: 148, name: "星雾灵蛟" },
    desc: "秘境龙魂与渊海双轨回旋：出战秘 / 草 / 电系伙伴可引发星轨破阵增幅",
  },
  {
    id: "orbit_solar_thunder",
    name: "曜火雷霆星轨",
    shortName: "曜火雷霆",
    elements: ["fire", "electric"],
    recTypes: ["water", "stone", "grass"],
    bossPair: [
      { dex: 78, name: "日曜天马皇" },
      { dex: 462, name: "极光磁暴尊" },
    ],
    vanguard: { dex: 229, name: "赤雷冥焰狼" },
    desc: "日曜与磁暴双轨轰鸣：出战水 / 岩 / 草系伙伴可引发星轨破阵增幅",
  },
]);

export const STAR_CORRIDOR_EXCHANGES = Object.freeze([
  {
    id: "amber_pack",
    costMedals: 3,
    rid: "ancientGeneAmber",
    amount: 4,
    label: "远古基因琥珀 ×4",
    desc: "消耗星轨回廊勋章 ×3 兑换远古基因琥珀 ×4",
  },
  {
    id: "sand_pack",
    costMedals: 3,
    rid: "shinyStarSand",
    amount: 4,
    label: "闪光祈愿星砂 ×4",
    desc: "消耗星轨回廊勋章 ×3 兑换闪光祈愿星砂 ×4",
  },
  {
    id: "mint_pack",
    costMedals: 4,
    rid: "tuningMint",
    amount: 2,
    label: "心性调律薄荷 ×2",
    desc: "消耗星轨回廊勋章 ×4 兑换心性调律薄荷 ×2",
  },
]);

export function getStarCorridorTierForFloor(highestFloor = 0) {
  const f = Math.max(0, Math.floor(Number(highestFloor) || 0));
  let tier = 0;
  for (let i = 0; i < STAR_CORRIDOR_TIER_FLOORS.length; i += 1) {
    if (f >= STAR_CORRIDOR_TIER_FLOORS[i]) tier = i + 1;
  }
  return Math.min(STAR_CORRIDOR_MAX_TIER, tier);
}

export function getStarCorridorFloorDef(floorRaw = 1, rotationOffset = 0) {
  const floor = Math.max(1, Math.floor(Number(floorRaw) || 1));
  const off = Math.max(0, Math.floor(Number(rotationOffset) || 0));
  const orbitIdx = (floor - 1 + off) % STAR_CORRIDOR_DUAL_ORBITS.length;
  const orbit = STAR_CORRIDOR_DUAL_ORBITS[orbitIdx];
  const [elemA, elemB] = orbit.elements;
  const isMilestone = STAR_CORRIDOR_TIER_FLOORS.includes(floor) || floor % 5 === 0;
  const baseLvl = Math.min(100, 26 + (floor - 1) * 4);
  const stars = floor >= 10 ? 3 : floor >= 5 ? 2 : floor >= 2 ? 1 : 0;

  const enemies = [
    {
      dex: orbit.bossPair[0].dex,
      name: `${orbit.bossPair[0].name}·星轨卫`,
      lvl: baseLvl,
      stars,
      types: [elemA, elemB],
    },
    {
      dex: orbit.bossPair[1].dex,
      name: `${orbit.bossPair[1].name}·双极主`,
      lvl: Math.min(100, baseLvl + 2),
      stars: isMilestone ? Math.min(3, stars + 1) : stars,
      types: [elemB, elemA],
    },
  ];
  if (isMilestone || floor >= 6) {
    enemies.push({
      dex: orbit.vanguard.dex,
      name: `${orbit.vanguard.name}·星核尊`,
      lvl: Math.min(100, baseLvl + 3),
      stars: Math.min(3, stars + 1),
      types: [elemA, elemB],
    });
  }

  const firstMedals = 3 + Math.floor((floor - 1) / 2) + (isMilestone ? 2 : 0);
  const firstAmber = 2 + Math.floor((floor - 1) / 3) + (isMilestone ? 1 : 0);
  const repeatMedals = 1 + Math.floor((floor - 1) / 4) + (isMilestone ? 1 : 0);
  const repeatAmber = 1 + (isMilestone ? 1 : 0);

  return {
    floor,
    orbitId: orbit.id,
    orbitName: orbit.name,
    orbitShortName: orbit.shortName,
    title: `星轨回廊第 ${floor} 重 · ${orbit.name}`,
    dualElements: [elemA, elemB],
    recTypes: orbit.recTypes.slice(),
    stageType: elemA,
    secondaryType: elemB,
    isMilestone,
    desc: orbit.desc,
    enemies,
    firstRewards: {
      corridorStarMedals: firstMedals,
      ancientGeneAmber: firstAmber,
      futurecoin: 95 + floor * 35,
      exp: 900 + floor * 380,
    },
    repeatRewards: {
      corridorStarMedals: repeatMedals,
      ancientGeneAmber: repeatAmber,
      futurecoin: 35 + floor * 12,
      exp: 320 + floor * 140,
    },
  };
}

function ensureCorridorMedalsBucket(state) {
  if (!state || typeof state !== "object") return null;
  if (!state.res || typeof state.res !== "object") state.res = {};
  if (!state.res.corridorStarMedals || typeof state.res.corridorStarMedals !== "object") {
    state.res.corridorStarMedals = { value: 0, cap: 9999 };
  }
  if (typeof state.res.corridorStarMedals.value !== "number" || !Number.isFinite(state.res.corridorStarMedals.value)) {
    state.res.corridorStarMedals.value = 0;
  }
  if (typeof state.res.corridorStarMedals.cap !== "number" || state.res.corridorStarMedals.cap <= 0) {
    state.res.corridorStarMedals.cap = 9999;
  }
  return state.res.corridorStarMedals;
}

export function ensureStarCorridorState(state) {
  if (!state || typeof state !== "object") {
    return {
      squadIds: [],
      currentFloor: 1,
      highestFloorCleared: 0,
      corridorTier: 0,
      rotationOffset: 0,
      totalClears: 0,
      totalMedalsEarned: 0,
      clearedFloors: {},
      records: [],
      lastRunSummary: null,
    };
  }
  if (!state.pve || typeof state.pve !== "object") {
    state.pve = { progress: {}, dailyAttempts: 0, dailyResetDate: "", selectedIds: [] };
  }
  ensureCorridorMedalsBucket(state);
  ensureAncientAmberBucket(state);

  const raw = state.pve.starCorridor && typeof state.pve.starCorridor === "object" ? state.pve.starCorridor : {};
  const monList = Array.isArray(state?.mons?.list) ? state.mons.list : null;
  const validMonSet = monList
    ? new Set(monList.filter((m) => m && typeof m.id === "number" && m.id > 0).map((m) => Math.floor(m.id)))
    : null;

  const squadIds = [];
  if (Array.isArray(raw.squadIds)) {
    for (const item of raw.squadIds) {
      const id = Math.floor(Number(item) || 0);
      if (id <= 0 || squadIds.includes(id)) continue;
      if (validMonSet && !validMonSet.has(id)) continue;
      squadIds.push(id);
      if (squadIds.length >= STAR_CORRIDOR_SQUAD_SIZE) break;
    }
  }

  const clearedFloors = {};
  let maxKeyFloor = 0;
  if (raw.clearedFloors && typeof raw.clearedFloors === "object") {
    for (const [fk, fv] of Object.entries(raw.clearedFloors)) {
      const fn = Math.floor(Number(fk) || 0);
      if (fn <= 0 || !fv) continue;
      maxKeyFloor = Math.max(maxKeyFloor, fn);
      clearedFloors[String(fn)] = {
        clears: Math.max(1, Math.floor(Number(fv.clears) || 1)),
        stars: Math.max(1, Math.min(3, Math.floor(Number(fv.stars) || 1))),
        bestRounds: Math.max(1, Math.floor(Number(fv.bestRounds) || 6)),
      };
    }
  }

  const highestFloorCleared = Math.max(maxKeyFloor, Math.max(0, Math.floor(Number(raw.highestFloorCleared) || 0)));
  const currentFloor = Math.max(1, Math.floor(Number(raw.currentFloor) || (highestFloorCleared + 1)));
  const derivedTier = getStarCorridorTierForFloor(highestFloorCleared);
  const corridorTier = Math.max(
    0,
    Math.min(STAR_CORRIDOR_MAX_TIER, Math.max(derivedTier, Math.floor(Number(raw.corridorTier) || 0))),
  );

  const records = Array.isArray(raw.records)
    ? raw.records
        .filter((r) => r && typeof r === "object")
        .slice(0, 6)
        .map((r) => ({
          floor: Math.max(1, Math.floor(Number(r.floor) || 1)),
          tier: Math.max(0, Math.min(STAR_CORRIDOR_MAX_TIER, Math.floor(Number(r.tier) || 0))),
          orbitName: typeof r.orbitName === "string" ? r.orbitName : "双系星轨",
          at: typeof r.at === "number" && Number.isFinite(r.at) ? r.at : 0,
          rounds: Math.max(1, Math.floor(Number(r.rounds) || 1)),
          squadNames: Array.isArray(r.squadNames) ? r.squadNames.filter((s) => typeof s === "string").slice(0, 4) : [],
        }))
    : [];

  const clean = {
    squadIds,
    currentFloor,
    highestFloorCleared,
    corridorTier,
    rotationOffset: Math.max(0, Math.floor(Number(raw.rotationOffset) || 0)) % STAR_CORRIDOR_DUAL_ORBITS.length,
    totalClears: Math.max(0, Math.floor(Number(raw.totalClears) || 0)),
    totalMedalsEarned: Math.max(0, Math.floor(Number(raw.totalMedalsEarned) || 0)),
    clearedFloors,
    records,
    lastRunSummary: raw.lastRunSummary && typeof raw.lastRunSummary === "object" ? raw.lastRunSummary : null,
  };

  if (state.pve.starCorridor && typeof state.pve.starCorridor === "object") {
    Object.assign(state.pve.starCorridor, clean);
    return state.pve.starCorridor;
  }
  state.pve.starCorridor = clean;
  return clean;
}

export function computeStarCorridorBonus(state) {
  const sc = state?.pve?.starCorridor;
  const highestFloorCleared = Math.max(0, Math.floor(Number(sc?.highestFloorCleared) || 0));
  const rawTier = Math.max(0, Math.floor(Number(sc?.corridorTier) || 0));
  const tier = Math.max(0, Math.min(STAR_CORRIDOR_MAX_TIER, Math.max(rawTier, getStarCorridorTierForFloor(highestFloorCleared))));
  const round4 = (n) => Math.round(n * 10000) / 10000;
  const prodAdd = round4(tier * 0.045);
  const catchAdd = round4(tier * 0.008);
  const shinyAdd = round4(tier * 0.04);
  const ivTrainAdd = round4(tier * 0.05);
  const pveOutAdd = round4(tier * 0.045);
  return {
    corridorTier: tier,
    maxTier: STAR_CORRIDOR_MAX_TIER,
    highestFloorCleared,
    nextTierFloor: STAR_CORRIDOR_TIER_FLOORS[tier] || null,
    prodAdd,
    prodMul: round4(1 + prodAdd),
    catchAdd,
    shinyAdd,
    shinyChanceMul: round4(1 + shinyAdd),
    ivTrainAdd,
    ivTrainMul: round4(1 + ivTrainAdd),
    pveOutAdd,
    pveOutMul: round4(1 + pveOutAdd),
  };
}

export function setStarCorridorSquad(state, monIds = []) {
  const sc = ensureStarCorridorState(state);
  const list = Array.isArray(state?.mons?.list) ? state.mons.list.filter(Boolean) : [];
  const validSet = new Set(list.map((m) => m.id));
  // ML-15 统一忙碌排除：手动编入同样拒绝外出 / 驻场中的伙伴（读 collection_fun.js 外出登记表）
  const awayIds = getAwayMonIds(state);
  const picked = [];
  const rejectedAway = [];
  for (const rawId of Array.isArray(monIds) ? monIds : []) {
    const id = Math.floor(Number(rawId) || 0);
    if (id > 0 && validSet.has(id) && !picked.includes(id)) {
      if (awayIds.has(id)) {
        if (!rejectedAway.includes(id)) rejectedAway.push(id);
        continue;
      }
      picked.push(id);
      if (picked.length >= STAR_CORRIDOR_SQUAD_SIZE) break;
    }
  }
  sc.squadIds = picked;
  return { ok: picked.length > 0, squadIds: sc.squadIds.slice(), rejectedAway };
}

export function toggleStarCorridorSquadMon(state, monId) {
  const sc = ensureStarCorridorState(state);
  const id = Math.floor(Number(monId) || 0);
  const list = Array.isArray(state?.mons?.list) ? state.mons.list.filter(Boolean) : [];
  if (!list.some((m) => m.id === id)) return { ok: false, reason: "invalid_mon" };
  const idx = sc.squadIds.indexOf(id);
  if (idx >= 0) {
    sc.squadIds.splice(idx, 1);
  } else {
    // ML-15 统一忙碌排除：外出 / 驻场中的伙伴不能手动编入星轨回廊（原因码 mon_away，附外出玩法 id 与标签）
    const away = getAwayActivityOfMon(state, id);
    if (away) return { ok: false, reason: "mon_away", awayId: away.id, awayLabel: away.label };
    if (sc.squadIds.length >= STAR_CORRIDOR_SQUAD_SIZE) {
      return { ok: false, reason: "squad_full" };
    }
    sc.squadIds.push(id);
  }
  return { ok: true, squadIds: sc.squadIds.slice() };
}

export function autofillStarCorridorSquad(state, getMonTypesFn, monPowerFn) {
  const sc = ensureStarCorridorState(state);
  // ML-14 统一忙碌排除：自动编队跳过外出 / 驻场中的伙伴
  const list = excludeAwayMons(state, Array.isArray(state?.mons?.list) ? state.mons.list : []);
  if (!list.length) {
    sc.squadIds = [];
    return { ok: false, reason: "no_mons", squadIds: [] };
  }
  const floorDef = getStarCorridorFloorDef(sc.currentFloor, sc.rotationOffset);
  const recSet = new Set([...(floorDef.recTypes || []), ...(floorDef.dualElements || [])]);
  const getTypes = typeof getMonTypesFn === "function" ? getMonTypesFn : (m) => m.types || [];
  const getPwr = typeof monPowerFn === "function" ? monPowerFn : (m) => defaultMonPower(m);

  const scored = list
    .map((m) => {
      const basePwr = getPwr(m);
      const bq = getMonBoutiqueBonus(state, m.id);
      const imp = getMonPrimalImprintBonus(state, m.id);
      const tuned = normalizeMintTuning(m.mintTuning) ? 1.08 : 1;
      const types = getTypes(m);
      const orbitMul = types.some((t) => recSet.has(t)) ? 1.15 : 1;
      return { m, types, score: basePwr * bq.combatMul * imp.combatMul * tuned * orbitMul };
    })
    .sort((a, b) => b.score - a.score);

  const chosen = [];
  const seenTypes = new Set();
  while (chosen.length < STAR_CORRIDOR_SQUAD_SIZE && chosen.length < scored.length) {
    let bestItem = null;
    let bestVal = -Infinity;
    for (const item of scored) {
      if (chosen.some((c) => c.m.id === item.m.id)) continue;
      const newElemBonus = item.types.some((t) => !seenTypes.has(t)) ? 1.12 : 1;
      const val = item.score * newElemBonus;
      if (val > bestVal) {
        bestVal = val;
        bestItem = item;
      }
    }
    if (!bestItem) break;
    chosen.push(bestItem);
    for (const t of bestItem.types) seenTypes.add(t);
  }

  sc.squadIds = chosen.map((c) => c.m.id);
  return { ok: sc.squadIds.length > 0, squadIds: sc.squadIds.slice() };
}

export function rotateOrResetStarCorridorOrbit(state, opts = {}) {
  const sc = ensureStarCorridorState(state);
  if (typeof opts.floor === "number" && Number.isFinite(opts.floor) && opts.floor >= 1) {
    sc.currentFloor = Math.max(1, Math.min(sc.highestFloorCleared + 1, Math.floor(opts.floor)));
  }
  if (opts.rotateOrbit) {
    sc.rotationOffset = (sc.rotationOffset + 1) % STAR_CORRIDOR_DUAL_ORBITS.length;
  }
  return { ok: true, currentFloor: sc.currentFloor, rotationOffset: sc.rotationOffset };
}

/**
 * Evaluates all 5 expansion synergy pillars (Bond Atlas + Nature Mint + Camp Cuisine + Starlight Styling + Primal Bloodline Imprints)
 * plus Dual-Element Orbit resonance for a Star-Rail Corridor squad.
 */
export function evaluateCorridorSquadSynergy(state, squadMons = [], floorDef = null, opts = {}) {
  const mons = Array.isArray(squadMons) ? squadMons.filter(Boolean).slice(0, STAR_CORRIDOR_SQUAD_SIZE) : [];
  const getTypes =
    typeof opts.getMonTypes === "function"
      ? opts.getMonTypes
      : (m) => (Array.isArray(m?.types) && m.types.length ? m.types : opts.getBeastDataByDex?.(m?.dex)?.types || []);

  // 1) Bond Atlas + Intra-Squad Duo Combos
  const atlasRes = state ? computeElementalBondResonance(state) : { pveOutAdd: 0, unlockedBondsCount: 0 };
  const activeCombos = [];
  let duoPairBonus = 0;
  for (let i = 0; i < mons.length; i += 1) {
    for (let j = i + 1; j < mons.length; j += 1) {
      const syn = evaluateDuoSynergy(getTypes(mons[i]), getTypes(mons[j]), null);
      if (syn.resonant) {
        if (!activeCombos.includes(syn.name)) activeCombos.push(syn.name);
        duoPairBonus += Math.max(0.04, (syn.outMul - 1) * 0.25);
      }
    }
  }
  const bondOutAdd = Math.min(0.35, (atlasRes.pveOutAdd || 0) + duoPairBonus + (atlasRes.unlockedBondsCount || 0) * 0.015);

  // 2) Nature Mint Tuning
  let tunedCount = 0;
  let combatNatureCount = 0;
  for (const m of mons) {
    if (normalizeMintTuning(m.mintTuning)) tunedCount += 1;
    if (m.nature && !["hardy", "docile", "serious", "bashful", "quirky"].includes(m.nature)) {
      combatNatureCount += 1;
    }
  }
  const tuningOutAdd = Math.min(0.26, tunedCount * 0.055 + combatNatureCount * 0.015);

  // 3) Camp Cuisine & Warmth
  const campAura = state ? computeStarCampAura(state, opts) : { pveComboAdd: 0, activeFeasts: [], stationedCount: 0 };
  const campOutAdd = Math.min(0.45, campAura.pveComboAdd || 0);
  const interFloorHealPct = Math.min(
    0.7,
    0.38 + (campAura.activeFeasts?.length || 0) * 0.06 + (campAura.stationedCount > 0 ? 0.05 : 0),
  );

  // 4) Starlight Styling Boutique
  const boutiqueGlobal = state ? computeStarBoutiqueAura(state) : { combatAdd: 0 };
  let squadStyledCount = 0;
  let squadBoutiquePersonal = 0;
  for (const m of mons) {
    const b = getMonBoutiqueBonus(state, m.id);
    if (b.styled) {
      squadStyledCount += 1;
      squadBoutiquePersonal += b.combatAdd;
    }
  }
  const boutiqueOutAdd = Math.min(
    0.5,
    (boutiqueGlobal.combatAdd || 0) + (mons.length > 0 ? squadBoutiquePersonal / mons.length : 0),
  );

  // 5) Prehistoric Bloodline Imprints (Amber Revival Lab + Quad Resonance)
  const amberGlobal = state ? computeAmberRevivalAura(state) : { combatAdd: 0, quadResonanceActive: false };
  let squadImprintedCount = 0;
  let squadImprintPersonal = 0;
  for (const m of mons) {
    const imp = getMonPrimalImprintBonus(state, m.id);
    if (imp.imprinted) {
      squadImprintedCount += 1;
      squadImprintPersonal += imp.combatAdd;
    }
  }
  const amberOutAdd = Math.min(
    0.65,
    (amberGlobal.combatAdd || 0) + (mons.length > 0 ? squadImprintPersonal / mons.length : 0),
  );

  // Rotating Dual-Element Orbit Match
  const activeFloor = floorDef || getStarCorridorFloorDef(state?.pve?.starCorridor?.currentFloor || 1, state?.pve?.starCorridor?.rotationOffset || 0);
  const orbitFocusSet = new Set([...(activeFloor.dualElements || []), ...(activeFloor.recTypes || [])]);
  let orbitMatchCount = 0;
  for (const m of mons) {
    if (getTypes(m).some((t) => orbitFocusSet.has(t))) orbitMatchCount += 1;
  }
  const orbitOutAdd = Math.min(0.24, orbitMatchCount * 0.06);

  const corridorBonus = computeStarCorridorBonus(state);
  const leagueBonus = computeChampionLeagueBonus(state);
  const round4 = (n) => Math.round(n * 10000) / 10000;

  const totalOutAdd = round4(
    bondOutAdd +
      tuningOutAdd +
      campOutAdd +
      boutiqueOutAdd +
      amberOutAdd +
      orbitOutAdd +
      corridorBonus.pveOutAdd +
      leagueBonus.pveOutAdd * 0.5,
  );
  const dmgReduction = round4(
    Math.min(
      0.38,
      (activeCombos.length > 0 ? 0.05 : 0) +
        tunedCount * 0.02 +
        (campAura.activeFeasts?.length > 0 ? 0.05 : 0) +
        squadStyledCount * 0.03 +
        squadImprintedCount * 0.045 +
        (amberGlobal.quadResonanceActive ? 0.05 : 0),
    ),
  );
  const speAdd = round4(Math.min(0.24, tunedCount * 0.035 + squadImprintedCount * 0.03 + (activeCombos.length > 0 ? 0.04 : 0)));

  return {
    squadCount: mons.length,
    bondOutAdd: round4(bondOutAdd),
    activeCombos,
    tunedCount,
    tuningOutAdd: round4(tuningOutAdd),
    feastCount: campAura.activeFeasts?.length || 0,
    campOutAdd: round4(campOutAdd),
    squadStyledCount,
    boutiqueOutAdd: round4(boutiqueOutAdd),
    squadImprintedCount,
    quadResonanceActive: Boolean(amberGlobal.quadResonanceActive),
    amberOutAdd: round4(amberOutAdd),
    orbitMatchCount,
    orbitOutAdd: round4(orbitOutAdd),
    corridorTier: corridorBonus.corridorTier,
    corridorTierOutAdd: corridorBonus.pveOutAdd,
    totalOutAdd,
    playerDamageMul: round4(1 + totalOutAdd),
    incomingDamageMul: round4(1 - dmgReduction),
    speMul: round4(1 + speAdd),
    interFloorHealPct: round4(interFloorHealPct),
  };
}

export function estimateCorridorFloorPower(floorDef) {
  if (!floorDef) return 0;
  return estimateStageEnemyPower({ type: floorDef.stageType, enemies: floorDef.enemies });
}

function makeCorridorEnemyUnits(floorDef) {
  const stageType = floorDef.stageType || "light";
  const specialTypes = new Set(["fire", "water", "electric", "grass", "wind", "mystic", "light"]);
  const specialLean = specialTypes.has(stageType);
  return floorDef.enemies.map((e, idx) => {
    const lvl = Math.max(1, Math.min(100, Math.floor(e.lvl || 26)));
    const tierBonus = e.stars >= 3 ? 38 : e.stars >= 2 ? 22 : e.stars >= 1 ? 10 : 0;
    const dexBase = e.dex || 1;
    const starMul = getStarBonusMul(e.stars || 0);
    const endlessScale = floorDef.floor > 12 ? 1 + (floorDef.floor - 12) * 0.06 : 1;
    const lvlMul = (1 + (lvl - 1) * 0.03) * starMul * 0.84 * endlessScale;
    const maxHp = Math.max(1, Math.floor((48 + (dexBase % 42) + tierBonus) * lvlMul));
    return {
      side: "enemy",
      idx,
      name: e.name || `星轨守卫${idx + 1}`,
      types: Array.isArray(e.types) && e.types.length ? e.types.slice(0, 2) : floorDef.dualElements.slice(0, 2),
      maxHp,
      hp: maxHp,
      atk: Math.max(1, Math.floor((43 + (dexBase % 38) + tierBonus + (specialLean ? -3 : 5)) * lvlMul)),
      spa: Math.max(1, Math.floor((42 + ((dexBase * 7) % 40) + tierBonus + (specialLean ? 5 : -3)) * lvlMul)),
      def: Math.max(1, Math.floor((38 + (dexBase % 34) + tierBonus + (specialLean ? -2 : 3)) * lvlMul)),
      spd: Math.max(1, Math.floor((37 + ((dexBase * 5) % 34) + tierBonus + (specialLean ? 3 : -2)) * lvlMul)),
      spe: Math.max(1, Math.floor((40 + (dexBase % 36) + tierBonus) * lvlMul)),
    };
  });
}

/**
 * Simulates the escalating rotating Dual-Element Star-Rail Corridor (`星轨回廊第 1..N 重`).
 * Supports `mode: "single"` (1 floor) or `mode: "surge"` (up to 5 consecutive floors in one surge).
 */
export function simulateStarCorridorTrial(state, opts = {}) {
  const sc = ensureStarCorridorState(state);
  const list = Array.isArray(state?.mons?.list) ? state.mons.list.filter(Boolean) : [];
  const getTypes =
    typeof opts.getMonTypes === "function"
      ? opts.getMonTypes
      : (m) => (Array.isArray(m?.types) && m.types.length ? m.types : opts.getBeastDataByDex?.(m?.dex)?.types || ["wind"]);
  const getStats =
    typeof opts.getMonCurrentStats === "function"
      ? opts.getMonCurrentStats
      : (m) => getMonCurrentStats(m, opts.getBeastDataByDex);

  let squadIds = Array.isArray(opts.squadIds) && opts.squadIds.length ? opts.squadIds : sc.squadIds;
  if (!squadIds.length && list.length > 0) {
    autofillStarCorridorSquad(state, getTypes, opts.monPower);
    squadIds = sc.squadIds;
  }

  // ML-15 统一忙碌排除：已在队中但正在外出 / 驻场的伙伴本场不出战（保留席位，回来后自动归队）
  const corridorAwayMap = getAwayActivityMap(state);
  const squadAll = squadIds
    .map((id) => list.find((m) => m && m.id === id))
    .filter(Boolean)
    .slice(0, STAR_CORRIDOR_SQUAD_SIZE);
  const benchedAway = squadAll
    .filter((m) => corridorAwayMap.has(m.id))
    .map((m) => ({ monId: m.id, name: m.name || `伙伴#${m.id}`, awayId: corridorAwayMap.get(m.id).id, awayLabel: corridorAwayMap.get(m.id).label }));
  const squadMons = squadAll.filter((m) => !corridorAwayMap.has(m.id));

  if (!squadMons.length) {
    const away = benchedAway.length > 0;
    return {
      ok: false,
      reason: away ? "squad_away" : "empty_squad",
      benchedAway,
      win: false,
      floorsCleared: 0,
      floorResults: [],
      rewardsEarned: {},
      log: [
        away
          ? `— 回廊小队的伙伴都在外出（${benchedAway.map((b) => `${b.name} ${b.awayLabel}`).join("、")}），叫回来或重新编队后再挑战 —`
          : "— 需至少编入 1~4 只伙伴方可开启双系星轨回廊试炼 —",
      ],
    };
  }

  const commit = opts.commit !== false;
  const mode = opts.mode === "single" ? "single" : "surge";
  const startFloor = Math.max(1, Math.floor(Number(opts.startFloor) || sc.currentFloor || 1));
  const stepCount = mode === "single" ? 1 : Math.max(1, Math.min(10, Math.floor(Number(opts.maxFloors) || STAR_CORRIDOR_SURGE_STEPS)));

  const firstFloorDef = getStarCorridorFloorDef(startFloor, sc.rotationOffset);
  const baseSynergy = evaluateCorridorSquadSynergy(state, squadMons, firstFloorDef, {
    getMonTypes: getTypes,
    getBeastDataByDex: opts.getBeastDataByDex,
  });

  const playerUnits = squadMons.map((m, idx) => {
    const rawStats = getStats(m);
    const bq = getMonBoutiqueBonus(state, m.id);
    const imp = getMonPrimalImprintBonus(state, m.id);
    const ribbonMul = 1 + Math.min(5, Math.max(0, Math.floor(m.hallOfFameRibbons || 0))) * 0.04;
    const unitMul = bq.combatMul * imp.combatMul * ribbonMul;
    const maxHp = Math.max(1, Math.floor((rawStats.hp || 40) * unitMul));
    return {
      side: "player",
      idx,
      monId: m.id,
      name: m.name || `伙伴#${m.id}`,
      types: getTypes(m),
      maxHp,
      hp: maxHp,
      atk: Math.max(1, Math.floor((rawStats.atk || 25) * unitMul)),
      spa: Math.max(1, Math.floor((rawStats.spa || rawStats.atk || 25) * unitMul)),
      def: Math.max(1, Math.floor((rawStats.def || 25) * unitMul)),
      spd: Math.max(1, Math.floor((rawStats.spd || rawStats.def || 25) * unitMul)),
      spe: Math.max(1, Math.floor((rawStats.spe || 25) * unitMul * baseSynergy.speMul)),
    };
  });

  const log = [
    `— 双系星轨回廊无尽试炼（${mode === "surge" ? `第 ${startFloor}~${startFloor + stepCount - 1} 重星轨连战` : `第 ${startFloor} 重逐层试炼`}）—`,
    `五维共鸣：总增伤 +${Math.round(baseSynergy.totalOutAdd * 100)}%（羁绊+${Math.round(baseSynergy.bondOutAdd * 100)}% / 调律+${Math.round(baseSynergy.tuningOutAdd * 100)}% / 盛宴+${Math.round(baseSynergy.campOutAdd * 100)}% / 配饰+${Math.round(baseSynergy.boutiqueOutAdd * 100)}% / 太古印记+${Math.round(baseSynergy.amberOutAdd * 100)}%）`,
  ];
  if (benchedAway.length) log.push(`本场不出战：${benchedAway.map((b) => `${b.name}（${b.awayLabel}）`).join("、")}`);

  const floorResults = [];
  const rewardsEarned = {};
  let floorsCleared = 0;
  let totalRounds = 0;
  let stoppedFloorDef = null;
  let lastClearedFloor = sc.highestFloorCleared;

  for (let step = 0; step < stepCount; step += 1) {
    const floorNum = startFloor + step;
    const fDef = getStarCorridorFloorDef(floorNum, sc.rotationOffset);
    const floorSynergy = evaluateCorridorSquadSynergy(state, squadMons, fDef, {
      getMonTypes: getTypes,
      getBeastDataByDex: opts.getBeastDataByDex,
    });
    const enemyUnits = makeCorridorEnemyUnits(fDef);
    log.push(`【${fDef.title}】双系守卫：${enemyUnits.map((e) => e.name).join(" ＆ ")}`);

    let pIdx = playerUnits.findIndex((u) => u.hp > 0);
    if (pIdx < 0) pIdx = 0;
    let eIdx = 0;
    let rounds = 0;
    const maxRounds = 180;
    const dmgOpts = {
      playerDamageMul: floorSynergy.playerDamageMul,
      incomingDamageMul: floorSynergy.incomingDamageMul,
    };

    while (pIdx < playerUnits.length && eIdx < enemyUnits.length && rounds < maxRounds) {
      rounds += 1;
      const p = playerUnits[pIdx];
      const e = enemyUnits[eIdx];
      if (p.hp <= 0) {
        const nextAlive = playerUnits.findIndex((u, k) => k > pIdx && u.hp > 0);
        if (nextAlive < 0) {
          pIdx = playerUnits.length;
          break;
        }
        pIdx = nextAlive;
        continue;
      }
      if (e.hp <= 0) {
        eIdx += 1;
        continue;
      }

      const activeStageElem = rounds % 2 === 1 ? fDef.stageType : fDef.secondaryType;
      const pFirst = p.spe >= e.spe;
      const first = pFirst ? p : e;
      const second = pFirst ? e : p;

      const hit1 = calcDamage(first, second, activeStageElem, dmgOpts);
      second.hp = Math.max(0, second.hp - hit1.damage);
      if (second.hp <= 0) {
        if (second.side === "enemy") {
          log.push(`  R${rounds}: ${first.name} 贯星击破 ${second.name}！`);
          eIdx += 1;
        } else {
          log.push(`  R${rounds}: ${second.name} 暂退星轨！`);
          const nextAlive = playerUnits.findIndex((u) => u.hp > 0);
          pIdx = nextAlive >= 0 ? nextAlive : playerUnits.length;
        }
        continue;
      }

      const hit2 = calcDamage(second, first, activeStageElem, dmgOpts);
      first.hp = Math.max(0, first.hp - hit2.damage);
      if (first.hp <= 0) {
        if (first.side === "enemy") {
          log.push(`  R${rounds}: ${second.name} 反击击破 ${first.name}！`);
          eIdx += 1;
        } else {
          log.push(`  R${rounds}: ${first.name} 暂退星轨！`);
          const nextAlive = playerUnits.findIndex((u) => u.hp > 0);
          pIdx = nextAlive >= 0 ? nextAlive : playerUnits.length;
        }
      }
    }

    totalRounds += rounds;
    const totalMaxHp = playerUnits.reduce((acc, u) => acc + u.maxHp, 0);
    const remHp = playerUnits.reduce((acc, u) => acc + Math.max(0, u.hp), 0);
    const teamHpPct = totalMaxHp > 0 ? remHp / totalMaxHp : 0;
    const enemyMaxHp = enemyUnits.reduce((acc, u) => acc + u.maxHp, 0);
    const enemyRemHp = enemyUnits.reduce((acc, u) => acc + Math.max(0, u.hp), 0);
    const enemyHpPct = enemyMaxHp > 0 ? enemyRemHp / enemyMaxHp : 0;

    const win = eIdx >= enemyUnits.length || (rounds >= maxRounds && teamHpPct > enemyHpPct);
    const stars = win ? (teamHpPct > 0.66 ? 3 : teamHpPct > 0.32 ? 2 : 1) : 0;

    floorResults.push({
      floor: floorNum,
      orbitId: fDef.orbitId,
      orbitName: fDef.orbitName,
      title: fDef.title,
      dualElements: fDef.dualElements,
      win,
      stars,
      rounds,
      teamHpPct: Number(teamHpPct.toFixed(4)),
    });

    if (!win) {
      stoppedFloorDef = fDef;
      log.push(`— 止步于【${fDef.title}】，唤醒太古血脉印记或调配双系克制阵容后可继续攀登！—`);
      break;
    }

    floorsCleared += 1;
    lastClearedFloor = Math.max(lastClearedFloor, floorNum);
    const floorKey = String(floorNum);
    const firstClear = !sc.clearedFloors[floorKey];
    const floorRw = firstClear ? fDef.firstRewards : fDef.repeatRewards;
    for (const [rk, rv] of Object.entries(floorRw)) {
      rewardsEarned[rk] = (rewardsEarned[rk] || 0) + rv;
    }

    if (commit) {
      if (firstClear) {
        sc.clearedFloors[floorKey] = { clears: 1, stars, bestRounds: rounds };
      } else {
        const prev = sc.clearedFloors[floorKey];
        prev.clears = (prev.clears || 1) + 1;
        prev.stars = Math.max(prev.stars || 1, stars);
        prev.bestRounds = Math.min(prev.bestRounds || rounds, rounds);
      }
      sc.totalClears = (sc.totalClears || 0) + 1;
      sc.totalMedalsEarned = (sc.totalMedalsEarned || 0) + (floorRw.corridorStarMedals || 0);
      sc.highestFloorCleared = Math.max(sc.highestFloorCleared || 0, floorNum);
      sc.currentFloor = Math.max(sc.currentFloor || 1, floorNum + 1);
      sc.corridorTier = Math.min(
        STAR_CORRIDOR_MAX_TIER,
        Math.max(sc.corridorTier || 0, getStarCorridorTierForFloor(sc.highestFloorCleared)),
      );
      applyRewardGrant(state, floorRw, {
        addRes: opts.addRes,
        addExpToMon: opts.addExpToMon,
        squadMons,
      });
    }

    log.push(
      `  【破阵】攻克第 ${floorNum} 重（${stars}星 · 勋章+${floorRw.corridorStarMedals} · 远古琥珀+${floorRw.ancientGeneAmber}）`,
    );

    if (step < stepCount - 1) {
      for (const u of playerUnits) {
        if (u.hp > 0) {
          u.hp = Math.min(u.maxHp, u.hp + Math.floor(u.maxHp * floorSynergy.interFloorHealPct));
        } else {
          u.hp = Math.max(1, Math.floor(u.maxHp * 0.35));
        }
      }
    }
  }

  const prevTier = baseSynergy.corridorTier;
  const newCorridorTier = commit ? sc.corridorTier : Math.max(prevTier, getStarCorridorTierForFloor(lastClearedFloor));
  const tierAdvanced = newCorridorTier > prevTier;

  if (commit && floorsCleared > 0) {
    const nowAt = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
    const lastSuccess = floorResults.filter((r) => r.win).pop();
    const rec = {
      floor: lastSuccess?.floor || sc.highestFloorCleared,
      tier: newCorridorTier,
      orbitName: lastSuccess?.orbitName || firstFloorDef.orbitName,
      at: nowAt,
      rounds: totalRounds,
      squadNames: squadMons.map((m) => m.name || "伙伴"),
    };
    sc.records = [rec, ...(sc.records || [])].slice(0, 6);
    if (tierAdvanced) {
      log.push(`【星轨晋阶】永久解锁星轨回廊阶位 Tier ${newCorridorTier}/${STAR_CORRIDOR_MAX_TIER}（全局产量、捕获、闪光、潜能与战斗伤害永久提升）！`);
    }
  }

  if (commit) {
    sc.lastRunSummary = {
      mode,
      startFloor,
      floorsCleared,
      highestFloorCleared: sc.highestFloorCleared,
      nextFloor: sc.currentFloor,
      corridorTier: newCorridorTier,
      totalRounds,
      stoppedTitle: stoppedFloorDef?.title || null,
      rewardsEarned: { ...rewardsEarned },
    };
  }

  return {
    ok: true,
    mode,
    win: floorsCleared > 0,
    fullSurgeCleared: floorsCleared === stepCount && !stoppedFloorDef,
    floorsCleared,
    startFloor,
    highestFloorCleared: commit ? sc.highestFloorCleared : lastClearedFloor,
    nextFloor: commit ? sc.currentFloor : startFloor + floorsCleared,
    corridorTier: newCorridorTier,
    tierAdvanced,
    totalRounds,
    stoppedFloor: stoppedFloorDef?.floor || null,
    stoppedTitle: stoppedFloorDef?.title || null,
    floorResults,
    rewardsEarned,
    synergy: baseSynergy,
    benchedAway,
    log,
  };
}

export function canExchangeCorridorMedals(state, exchangeId) {
  const ex = STAR_CORRIDOR_EXCHANGES.find((x) => x.id === exchangeId);
  if (!state || !ex) return false;
  const have = Number(state?.res?.corridorStarMedals?.value) || 0;
  return have >= ex.costMedals;
}

export function exchangeCorridorMedals(state, exchangeId, opts = {}) {
  ensureStarCorridorState(state);
  const ex = STAR_CORRIDOR_EXCHANGES.find((x) => x.id === exchangeId);
  if (!ex) return { ok: false, reason: "unknown_exchange" };
  const medalBucket = ensureCorridorMedalsBucket(state);
  if ((medalBucket?.value || 0) < ex.costMedals) {
    return { ok: false, reason: "insufficient_medals" };
  }
  medalBucket.value = Math.max(0, (medalBucket.value || 0) - ex.costMedals);
  applyRewardGrant(state, { [ex.rid]: ex.amount }, { addRes: opts.addRes, squadMons: [] });
  return {
    ok: true,
    exchangeId: ex.id,
    label: ex.label,
    rid: ex.rid,
    amount: ex.amount,
    costMedals: ex.costMedals,
    remainingMedals: medalBucket.value,
  };
}




// ============================================================================
// ML-9 「三系生态大师锦标殿」(Tri-Element Ecology Master Championship Hall)
// 每日按本地日期轮换「三系生态法则」（草/水/火 · 风/岩/电 · 光/暗/幻），三灵战队逐轮攀登 6 轮锦标赛阶梯，
// 夺冠累积「三系冠军徽章」Tier 1~5（Tier 4 需 2 种法则夺冠、Tier 5 需 3 种法则全制霸），提供全局增幅。
// ============================================================================

export const ECO_TRI_SQUAD_SIZE = 3;
export const ECO_TRI_CREST_MAX_TIER = 5;

export const ECO_TRI_RUNGS = Object.freeze([
  { name: "海选资格赛", lvl: 34, stars: 0, statMul: 1.1 },
  { name: "小组循环赛", lvl: 42, stars: 1, statMul: 1.25 },
  { name: "八强淘汰赛", lvl: 50, stars: 1, statMul: 1.4 },
  { name: "四强争霸赛", lvl: 58, stars: 2, statMul: 1.55 },
  { name: "巅峰半决赛", lvl: 66, stars: 2, statMul: 1.7 },
  { name: "生态大师冠军战", lvl: 72, stars: 2, statMul: 1.8, isFinal: true },
]);

export const ECO_TRI_ROTATIONS = Object.freeze([
  {
    id: "tri_verdant",
    name: "翠森·沧澜·炎阳生态环",
    shortName: "草水火生态环",
    elements: ["grass", "water", "fire"],
    master: "生态大师 · 青岚",
    rule: "火克草、草克水、水克火：三系首尾相衔的经典生态循环",
    rosters: {
      grass: [
        { dex: 285, name: "森林小伞菇" },
        { dex: 10, name: "翠玉灵蚕" },
        { dex: 11, name: "凝翠星茧" },
        { dex: 470, name: "森语叶狐" },
        { dex: 182, name: "晴空花舞姬" },
        { dex: 3, name: "森罗古龙" },
      ],
      water: [
        { dex: 54, name: "涟漪小鸭" },
        { dex: 116, name: "碧波小海马" },
        { dex: 117, name: "棘冠海刺龙" },
        { dex: 134, name: "汐澜水狐" },
        { dex: 55, name: "沧澜灵鸭皇" },
        { dex: 9, name: "镇海重炮龟" },
      ],
      fire: [
        { dex: 240, name: "熔火幼兽" },
        { dex: 58, name: "炽焰幼犬" },
        { dex: 126, name: "炽炎火灵兽" },
        { dex: 136, name: "炽焰火狐" },
        { dex: 59, name: "燎原炎狮犬" },
        { dex: 467, name: "炼狱炎魔皇" },
      ],
    },
  },
  {
    id: "tri_tempest",
    name: "苍风·玄岩·雷霆生态环",
    shortName: "风岩电生态环",
    elements: ["wind", "stone", "electric"],
    master: "生态大师 · 磐霆",
    rule: "电克风、风克岩、岩克电：疾风、磐岩与雷霆互相制衡",
    rosters: {
      wind: [
        { dex: 16, name: "云羽雏雀" },
        { dex: 133, name: "星绒幼狐" },
        { dex: 17, name: "疾风灵隼" },
        { dex: 53, name: "金瞳灵豹" },
        { dex: 471, name: "霜华冰狐" },
        { dex: 18, name: "苍穹羽皇" },
      ],
      stone: [
        { dex: 74, name: "晶簇岩球" },
        { dex: 111, name: "重甲岩犀" },
        { dex: 67, name: "破岩战将" },
        { dex: 112, name: "破山钻角犀" },
        { dex: 208, name: "耀钢龙蛇" },
        { dex: 76, name: "镇岳巨岩尊" },
      ],
      electric: [
        { dex: 239, name: "雷角幼灵" },
        { dex: 417, name: "星电飞鼠" },
        { dex: 25, name: "星雷灵鼠" },
        { dex: 125, name: "狂雷战兽" },
        { dex: 135, name: "惊雷电狐" },
        { dex: 466, name: "雷霆泰坦王" },
      ],
    },
  },
  {
    id: "tri_twilight",
    name: "曜光·幽影·幻境生态环",
    shortName: "光暗幻生态环",
    elements: ["light", "dark", "mystic"],
    master: "生态大师 · 夜曦",
    rule: "光暗互克、幻系自克：镜像对决，谁的克制更快谁就赢",
    rosters: {
      light: [
        { dex: 173, name: "星露幼灵" },
        { dex: 684, name: "云糖绒球" },
        { dex: 35, name: "月咏花仙" },
        { dex: 685, name: "星甜慕斯姬" },
        { dex: 700, name: "绯星仙狐" },
        { dex: 36, name: "月华星后" },
      ],
      dark: [
        { dex: 29, name: "紫晶幼兔" },
        { dex: 92, name: "冥雾星魂" },
        { dex: 30, name: "紫棘灵兽" },
        { dex: 93, name: "裂影鬼爪" },
        { dex: 197, name: "幽月影狐" },
        { dex: 94, name: "噬影夜魔王" },
      ],
      mystic: [
        { dex: 63, name: "星眠小狐" },
        { dex: 360, name: "乐天小蓝团" },
        { dex: 64, name: "念力灵狐" },
        { dex: 148, name: "瑞霭灵龙" },
        { dex: 196, name: "曜光星狐" },
        { dex: 65, name: "天机星圣狐" },
      ],
    },
  },
]);

function ecoTriLocalYmd(nowMs = Date.now()) {
  const d = new Date(nowMs);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Today's featured three-element rule — rotates every local day (day index since epoch mod 3). */
export function getEcoTriRotation(nowMs = Date.now()) {
  const d = new Date(nowMs);
  const dayIdx = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  const n = ECO_TRI_ROTATIONS.length;
  const idx = ((dayIdx % n) + n) % n;
  const nextMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
  return {
    ...ECO_TRI_ROTATIONS[idx],
    index: idx,
    dayKey: ecoTriLocalYmd(nowMs),
    msUntilNext: Math.max(0, nextMidnight - nowMs),
    next: ECO_TRI_ROTATIONS[(idx + 1) % n],
  };
}

export function getEcoTriRotationById(rotationId) {
  return ECO_TRI_ROTATIONS.find((r) => r.id === rotationId) || ECO_TRI_ROTATIONS[0];
}

export function getEcoTriRungDef(rotationRaw, rungIdxRaw = 0) {
  const rotation = rotationRaw && Array.isArray(rotationRaw.elements) ? rotationRaw : getEcoTriRotationById(rotationRaw);
  const r = Math.max(0, Math.min(ECO_TRI_RUNGS.length - 1, Math.floor(Number(rungIdxRaw) || 0)));
  const rung = ECO_TRI_RUNGS[r];
  const stageType = rotation.elements[r % rotation.elements.length];
  const isFinal = Boolean(rung.isFinal);
  const enemies = rotation.elements.map((el) => {
    const pool = rotation.rosters[el] || [];
    const pick = pool[Math.min(r, pool.length - 1)] || { dex: 1, name: "锦标选手" };
    return {
      dex: pick.dex,
      name: isFinal ? `${pick.name}·大师王牌` : `${pick.name}·锦标选手`,
      lvl: Math.min(100, rung.lvl + (el === stageType ? 2 : 0) + (isFinal ? 3 : 0)),
      stars: Math.min(3, rung.stars + (isFinal ? 1 : 0)),
      types: [el],
    };
  });
  const firstRewards = {
    futurecoin: 70 + r * 35,
    exp: 700 + r * 320,
    driftBottle: r >= 3 ? 2 : 1,
  };
  if (isFinal) {
    firstRewards.driftBottle += 3;
    firstRewards.shinyStarSand = 3;
    firstRewards.corridorStarMedals = 2;
  }
  return {
    rungIdx: r,
    rungNo: r + 1,
    name: rung.name,
    isFinal,
    statMul: rung.statMul || 1,
    rotationId: rotation.id,
    rotationName: rotation.name,
    elements: rotation.elements.slice(),
    stageType,
    title: `${rung.name} · ${rotation.shortName}`,
    enemies,
    firstRewards,
    repeatRewards: { futurecoin: 25 + r * 10, exp: 260 + r * 110 },
  };
}

export function estimateEcoTriRungPower(rungDef) {
  if (!rungDef) return 0;
  return estimateStageEnemyPower({ type: rungDef.stageType, enemies: rungDef.enemies });
}

function deriveEcoTriCrestTier(totalChampionships, triadChampions) {
  const total = Math.max(0, Math.floor(Number(totalChampionships) || 0));
  const distinct = ECO_TRI_ROTATIONS.filter((rot) => (Number(triadChampions?.[rot.id]) || 0) > 0).length;
  let tier = Math.min(ECO_TRI_CREST_MAX_TIER, total);
  if (distinct < 2) tier = Math.min(tier, 3);
  else if (distinct < 3) tier = Math.min(tier, 4);
  return { tier, distinct };
}

export function ensureEcoTriHallState(state, opts = {}) {
  if (!state || typeof state !== "object") return null;
  if (!state.pve || typeof state.pve !== "object") {
    state.pve = { progress: {}, dailyAttempts: 0, dailyResetDate: "", selectedIds: [] };
  }
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const rotation = getEcoTriRotation(nowMs);
  const raw = state.pve.ecoTriHall && typeof state.pve.ecoTriHall === "object" ? state.pve.ecoTriHall : {};
  const monList = Array.isArray(state?.mons?.list) ? state.mons.list : null;
  const validMonSet = monList
    ? new Set(monList.filter((m) => m && typeof m.id === "number" && m.id > 0).map((m) => Math.floor(m.id)))
    : null;

  const squadIds = [];
  for (const item of Array.isArray(raw.squadIds) ? raw.squadIds : []) {
    const id = Math.floor(Number(item) || 0);
    if (id <= 0 || squadIds.includes(id)) continue;
    if (validMonSet && !validMonSet.has(id)) continue;
    squadIds.push(id);
    if (squadIds.length >= ECO_TRI_SQUAD_SIZE) break;
  }

  const triadChampions = {};
  for (const rot of ECO_TRI_ROTATIONS) {
    triadChampions[rot.id] = Math.max(0, Math.floor(Number(raw.triadChampions?.[rot.id]) || 0));
  }
  const totalChampionships = Math.max(
    Math.max(0, Math.floor(Number(raw.totalChampionships) || 0)),
    Object.values(triadChampions).reduce((s, v) => s + v, 0),
  );
  const crest = deriveEcoTriCrestTier(totalChampionships, triadChampions);

  const sameDay = raw.dayKey === rotation.dayKey;
  const clearedToday = {};
  if (sameDay && raw.clearedToday && typeof raw.clearedToday === "object") {
    for (const [k, v] of Object.entries(raw.clearedToday)) {
      const idx = Math.floor(Number(k));
      if (!Number.isFinite(idx) || idx < 0 || idx >= ECO_TRI_RUNGS.length || !v) continue;
      clearedToday[String(idx)] = {
        stars: Math.max(1, Math.min(3, Math.floor(Number(v.stars) || 1))),
        rounds: Math.max(1, Math.floor(Number(v.rounds) || 1)),
      };
    }
  }

  const records = Array.isArray(raw.records)
    ? raw.records
        .filter((r) => r && typeof r === "object")
        .slice(0, 6)
        .map((r) => ({
          dayKey: typeof r.dayKey === "string" ? r.dayKey.slice(0, 10) : "",
          rotationName: typeof r.rotationName === "string" ? r.rotationName : "三系生态环",
          crestTier: Math.max(0, Math.min(ECO_TRI_CREST_MAX_TIER, Math.floor(Number(r.crestTier) || 0))),
          rounds: Math.max(1, Math.floor(Number(r.rounds) || 1)),
          squadNames: Array.isArray(r.squadNames) ? r.squadNames.filter((s) => typeof s === "string").slice(0, 3) : [],
          at: typeof r.at === "number" && Number.isFinite(r.at) ? r.at : 0,
        }))
    : [];

  const clean = {
    squadIds,
    dayKey: rotation.dayKey,
    rotationId: rotation.id,
    rungIdx: sameDay ? Math.max(0, Math.min(ECO_TRI_RUNGS.length, Math.floor(Number(raw.rungIdx) || 0))) : 0,
    clearedToday,
    championToday: sameDay ? Boolean(raw.championToday) : false,
    totalChampionships,
    triadChampions,
    crestTier: crest.tier,
    bestRung: Math.max(0, Math.min(ECO_TRI_RUNGS.length, Math.floor(Number(raw.bestRung) || 0))),
    totalRungClears: Math.max(0, Math.floor(Number(raw.totalRungClears) || 0)),
    records,
    lastRunSummary: raw.lastRunSummary && typeof raw.lastRunSummary === "object" ? raw.lastRunSummary : null,
  };

  if (state.pve.ecoTriHall && typeof state.pve.ecoTriHall === "object") {
    Object.assign(state.pve.ecoTriHall, clean);
    return state.pve.ecoTriHall;
  }
  state.pve.ecoTriHall = clean;
  return clean;
}

/** Pure non-mutating read: permanent 「三系冠军徽章」 global bonus (production / capture / shiny / PvE damage). */
export function computeEcoTriCrestBonus(state) {
  const raw = state?.pve?.ecoTriHall;
  const triadChampions = raw?.triadChampions && typeof raw.triadChampions === "object" ? raw.triadChampions : {};
  const total = Math.max(
    Math.max(0, Math.floor(Number(raw?.totalChampionships) || 0)),
    ECO_TRI_ROTATIONS.reduce((s, rot) => s + Math.max(0, Math.floor(Number(triadChampions[rot.id]) || 0)), 0),
  );
  const { tier, distinct } = deriveEcoTriCrestTier(total, triadChampions);
  const round4 = (n) => Math.round(n * 10000) / 10000;
  const prodAdd = round4(tier * 0.04);
  const catchAdd = round4(tier * 0.006);
  const shinyAdd = round4(tier * 0.03);
  const pveOutAdd = round4(tier * 0.05);
  let nextTierHint = "";
  if (tier < ECO_TRI_CREST_MAX_TIER) {
    if (tier >= 3 && distinct < 2) nextTierHint = "在另一种生态法则日夺冠可解锁 Tier 4";
    else if (tier >= 4 && distinct < 3) nextTierHint = "三种生态法则全部夺冠可解锁 Tier 5";
    else nextTierHint = `再夺冠 1 次晋升 Tier ${tier + 1}`;
  }
  return {
    crestTier: tier,
    maxTier: ECO_TRI_CREST_MAX_TIER,
    totalChampionships: total,
    distinctTriads: distinct,
    tripleMaster: distinct >= ECO_TRI_ROTATIONS.length,
    nextTierHint,
    prodAdd,
    prodMul: round4(1 + prodAdd),
    catchAdd,
    shinyAdd,
    shinyChanceMul: round4(1 + shinyAdd),
    pveOutAdd,
    pveOutMul: round4(1 + pveOutAdd),
  };
}

export function setEcoTriSquad(state, monIds = []) {
  const hall = ensureEcoTriHallState(state);
  const list = Array.isArray(state?.mons?.list) ? state.mons.list.filter(Boolean) : [];
  const validSet = new Set(list.map((m) => m.id));
  const picked = [];
  for (const rawId of Array.isArray(monIds) ? monIds : []) {
    const id = Math.floor(Number(rawId) || 0);
    if (id > 0 && validSet.has(id) && !picked.includes(id)) {
      picked.push(id);
      if (picked.length >= ECO_TRI_SQUAD_SIZE) break;
    }
  }
  hall.squadIds = picked;
  return { ok: picked.length > 0, squadIds: hall.squadIds.slice() };
}

export function toggleEcoTriSquadMon(state, monId) {
  const hall = ensureEcoTriHallState(state);
  const id = Math.floor(Number(monId) || 0);
  const list = Array.isArray(state?.mons?.list) ? state.mons.list.filter(Boolean) : [];
  if (!list.some((m) => m.id === id)) return { ok: false, reason: "invalid_mon" };
  const idx = hall.squadIds.indexOf(id);
  if (idx >= 0) {
    hall.squadIds.splice(idx, 1);
  } else {
    // ML-14 统一忙碌排除：任何外出 / 驻场中的伙伴都不能编入（出海沿用旧原因码 mon_at_sea）
    const away = getAwayActivityOfMon(state, id);
    if (away) return { ok: false, reason: away.id === "wishDock" ? "mon_at_sea" : "mon_away", awayLabel: away.label };
    if (hall.squadIds.length >= ECO_TRI_SQUAD_SIZE) return { ok: false, reason: "squad_full" };
    hall.squadIds.push(id);
  }
  return { ok: true, squadIds: hall.squadIds.slice() };
}

/** Picks the strongest 3 partners, preferring a squad that covers all three featured elements (「三系生态循环」). */
export function autofillEcoTriSquad(state, getMonTypesFn, monPowerFn, opts = {}) {
  const hall = ensureEcoTriHallState(state, opts);
  // ML-14 统一忙碌排除：自动编队跳过所有外出 / 驻场中的伙伴（码头 / 观察站 / 浮岛 / 远航 / 温泉 / 邮局 / 绘本馆 / 钓鱼会）
  const list = excludeAwayMons(state, Array.isArray(state?.mons?.list) ? state.mons.list : []);
  if (!list.length) {
    hall.squadIds = [];
    return { ok: false, reason: "no_mons", squadIds: [], coveredElements: [] };
  }
  const rotation = getEcoTriRotationById(hall.rotationId);
  const featured = new Set(rotation.elements);
  const getTypes = typeof getMonTypesFn === "function" ? getMonTypesFn : (m) => m.types || [];
  const getPwr = typeof monPowerFn === "function" ? monPowerFn : (m) => defaultMonPower(m);
  const scored = list.map((m) => {
    const types = getTypes(m) || [];
    const bq = getMonBoutiqueBonus(state, m.id);
    const imp = getMonPrimalImprintBonus(state, m.id);
    const tuned = normalizeMintTuning(m.mintTuning) ? 1.08 : 1;
    const homeMul = types.some((t) => featured.has(t)) ? 1.18 : 1;
    return { m, types, score: getPwr(m) * bq.combatMul * imp.combatMul * tuned * homeMul };
  });
  const chosen = [];
  const covered = new Set();
  while (chosen.length < ECO_TRI_SQUAD_SIZE && chosen.length < scored.length) {
    let best = null;
    let bestVal = -Infinity;
    for (const item of scored) {
      if (chosen.includes(item)) continue;
      const newCover = item.types.some((t) => featured.has(t) && !covered.has(t)) ? 1.25 : 1;
      const val = item.score * newCover;
      if (val > bestVal) {
        bestVal = val;
        best = item;
      }
    }
    if (!best) break;
    chosen.push(best);
    for (const t of best.types) if (featured.has(t)) covered.add(t);
  }
  hall.squadIds = chosen.map((c) => c.m.id);
  return { ok: hall.squadIds.length > 0, squadIds: hall.squadIds.slice(), coveredElements: Array.from(covered) };
}

/** Restarts today's ladder from round 1 after a championship (first-clear rewards stay claimed; repeat rewards apply). */
export function restartEcoTriLadder(state, opts = {}) {
  const hall = ensureEcoTriHallState(state, opts);
  hall.rungIdx = 0;
  return { ok: true, rungIdx: 0 };
}

/**
 * Evaluates the featured three-element rule plus the existing synergy pillars
 * (Bond Atlas + duo combos, Mint Tuning, Camp Cuisine, Starlight Styling, Primal Imprints, Wish Dock badges, Corridor / Crest tiers).
 */
export function evaluateEcoTriSquadSynergy(state, squadMons = [], rotationRaw = null, opts = {}) {
  const mons = Array.isArray(squadMons) ? squadMons.filter(Boolean).slice(0, ECO_TRI_SQUAD_SIZE) : [];
  const rotation =
    rotationRaw && Array.isArray(rotationRaw.elements)
      ? rotationRaw
      : getEcoTriRotationById(rotationRaw || state?.pve?.ecoTriHall?.rotationId || getEcoTriRotation(opts.nowMs).id);
  const getTypes =
    typeof opts.getMonTypes === "function"
      ? opts.getMonTypes
      : (m) => (Array.isArray(m?.types) && m.types.length ? m.types : opts.getBeastDataByDex?.(m?.dex)?.types || []);
  const featured = new Set(rotation.elements);
  const round4 = (n) => Math.round(n * 10000) / 10000;

  // Featured three-element rule
  const coveredElements = [];
  let homeMemberCount = 0;
  for (const m of mons) {
    const types = getTypes(m) || [];
    if (types.some((t) => featured.has(t))) homeMemberCount += 1;
    for (const t of types) if (featured.has(t) && !coveredElements.includes(t)) coveredElements.push(t);
  }
  const triCycleActive = coveredElements.length >= rotation.elements.length;
  const triOutAdd = Math.min(0.35, coveredElements.length * 0.07 + (triCycleActive ? 0.14 : 0));
  const homeOutAdd = Math.min(0.12, homeMemberCount * 0.04);

  // 1) Bond Atlas + intra-squad duo combos
  const atlasRes = state ? computeElementalBondResonance(state) : { pveOutAdd: 0, unlockedBondsCount: 0 };
  const activeCombos = [];
  let duoPairBonus = 0;
  for (let i = 0; i < mons.length; i += 1) {
    for (let j = i + 1; j < mons.length; j += 1) {
      const syn = evaluateDuoSynergy(getTypes(mons[i]), getTypes(mons[j]), null);
      if (syn.resonant) {
        if (!activeCombos.includes(syn.name)) activeCombos.push(syn.name);
        duoPairBonus += Math.max(0.04, (syn.outMul - 1) * 0.25);
      }
    }
  }
  const bondOutAdd = Math.min(0.3, (atlasRes.pveOutAdd || 0) + duoPairBonus + (atlasRes.unlockedBondsCount || 0) * 0.015);

  // 2) Mint tuning
  let tunedCount = 0;
  let combatNatureCount = 0;
  for (const m of mons) {
    if (normalizeMintTuning(m.mintTuning)) tunedCount += 1;
    if (m.nature && !["hardy", "docile", "serious", "bashful", "quirky"].includes(m.nature)) combatNatureCount += 1;
  }
  const tuningOutAdd = Math.min(0.2, tunedCount * 0.05 + combatNatureCount * 0.015);

  // 3) Camp cuisine
  const campAura = state ? computeStarCampAura(state, opts) : { pveComboAdd: 0, activeFeasts: [] };
  const campOutAdd = Math.min(0.4, campAura.pveComboAdd || 0);
  const feastCount = campAura.activeFeasts?.length || 0;

  // 4) Starlight styling
  const boutiqueGlobal = state ? computeStarBoutiqueAura(state) : { combatAdd: 0 };
  let squadStyledCount = 0;
  let styledPersonal = 0;
  for (const m of mons) {
    const b = getMonBoutiqueBonus(state, m.id);
    if (b.styled) {
      squadStyledCount += 1;
      styledPersonal += b.combatAdd;
    }
  }
  const boutiqueOutAdd = Math.min(0.4, (boutiqueGlobal.combatAdd || 0) + (mons.length ? styledPersonal / mons.length : 0));

  // 5) Primal imprints
  const amberGlobal = state ? computeAmberRevivalAura(state) : { combatAdd: 0 };
  let squadImprintedCount = 0;
  let imprintPersonal = 0;
  for (const m of mons) {
    const imp = getMonPrimalImprintBonus(state, m.id);
    if (imp.imprinted) {
      squadImprintedCount += 1;
      imprintPersonal += imp.combatAdd;
    }
  }
  const amberOutAdd = Math.min(0.5, (amberGlobal.combatAdd || 0) + (mons.length ? imprintPersonal / mons.length : 0));

  // 6) Wish Dock badges → 「海风助威」 damage reduction
  const dockAura = state ? computeWishDockAura(state) : { badgeCount: 0 };
  const dockBadgeCount = dockAura.badgeCount || 0;

  const crestBonus = computeEcoTriCrestBonus(state);
  const corridorBonus = computeStarCorridorBonus(state);

  const totalOutAdd = round4(
    triOutAdd +
      homeOutAdd +
      bondOutAdd +
      tuningOutAdd +
      campOutAdd +
      boutiqueOutAdd +
      amberOutAdd +
      crestBonus.pveOutAdd +
      corridorBonus.pveOutAdd * 0.5,
  );
  const dmgReduction = round4(
    Math.min(
      0.36,
      (activeCombos.length > 0 ? 0.05 : 0) +
        tunedCount * 0.02 +
        (feastCount > 0 ? 0.05 : 0) +
        squadStyledCount * 0.03 +
        squadImprintedCount * 0.04 +
        (triCycleActive ? 0.06 : 0) +
        dockBadgeCount * 0.015,
    ),
  );
  const speAdd = round4(Math.min(0.2, tunedCount * 0.03 + squadImprintedCount * 0.03 + (triCycleActive ? 0.05 : 0)));
  const interRungHealPct = round4(Math.min(0.7, 0.4 + feastCount * 0.06 + (triCycleActive ? 0.08 : 0)));

  return {
    squadCount: mons.length,
    rotationId: rotation.id,
    featuredElements: rotation.elements.slice(),
    coveredElements,
    triCycleActive,
    homeMemberCount,
    triOutAdd: round4(triOutAdd),
    homeOutAdd: round4(homeOutAdd),
    bondOutAdd: round4(bondOutAdd),
    activeCombos,
    tunedCount,
    tuningOutAdd: round4(tuningOutAdd),
    feastCount,
    campOutAdd: round4(campOutAdd),
    squadStyledCount,
    boutiqueOutAdd: round4(boutiqueOutAdd),
    squadImprintedCount,
    amberOutAdd: round4(amberOutAdd),
    dockBadgeCount,
    crestTier: crestBonus.crestTier,
    crestOutAdd: crestBonus.pveOutAdd,
    corridorTierOutAdd: round4(corridorBonus.pveOutAdd * 0.5),
    totalOutAdd,
    playerDamageMul: round4(1 + totalOutAdd),
    incomingDamageMul: round4(1 - dmgReduction),
    speMul: round4(1 + speAdd),
    interRungHealPct,
  };
}

function makeEcoTriEnemyUnits(rungDef) {
  const specialTypes = new Set(["fire", "water", "electric", "grass", "wind", "mystic", "light"]);
  const specialLean = specialTypes.has(rungDef.stageType);
  return rungDef.enemies.map((e, idx) => {
    const lvl = Math.max(1, Math.min(100, Math.floor(e.lvl || 30)));
    const tierBonus = e.stars >= 3 ? 38 : e.stars >= 2 ? 22 : e.stars >= 1 ? 10 : 0;
    const dexBase = e.dex || 1;
    const lvlMul = (1 + (lvl - 1) * 0.03) * getStarBonusMul(e.stars || 0) * 0.84 * (rungDef.statMul || 1);
    const maxHp = Math.max(1, Math.floor((48 + (dexBase % 42) + tierBonus) * lvlMul));
    return {
      side: "enemy",
      idx,
      name: e.name || `锦标选手${idx + 1}`,
      types: Array.isArray(e.types) && e.types.length ? e.types.slice(0, 2) : [rungDef.stageType],
      maxHp,
      hp: maxHp,
      atk: Math.max(1, Math.floor((43 + (dexBase % 38) + tierBonus + (specialLean ? -3 : 5)) * lvlMul)),
      spa: Math.max(1, Math.floor((42 + ((dexBase * 7) % 40) + tierBonus + (specialLean ? 5 : -3)) * lvlMul)),
      def: Math.max(1, Math.floor((38 + (dexBase % 34) + tierBonus + (specialLean ? -2 : 3)) * lvlMul)),
      spd: Math.max(1, Math.floor((37 + ((dexBase * 5) % 34) + tierBonus + (specialLean ? 3 : -2)) * lvlMul)),
      spe: Math.max(1, Math.floor((40 + (dexBase % 36) + tierBonus) * lvlMul)),
    };
  });
}

/**
 * Simulates today's Tri-Element Championship ladder.
 * `mode: "single"` fights the current round; `mode: "climb"` fights every remaining round with HP carry-over.
 * Winning the final round for the first time today crowns a champion and advances the 「三系冠军徽章」 crest.
 */
export function simulateEcoTriTournament(state, opts = {}) {
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const hall = ensureEcoTriHallState(state, { nowMs });
  const rotation = getEcoTriRotationById(hall.rotationId);
  const list = Array.isArray(state?.mons?.list) ? state.mons.list.filter(Boolean) : [];
  const getTypes =
    typeof opts.getMonTypes === "function"
      ? opts.getMonTypes
      : (m) => (Array.isArray(m?.types) && m.types.length ? m.types : opts.getBeastDataByDex?.(m?.dex)?.types || ["wind"]);
  const getStats =
    typeof opts.getMonCurrentStats === "function" ? opts.getMonCurrentStats : (m) => getMonCurrentStats(m, opts.getBeastDataByDex);

  if (hall.rungIdx >= ECO_TRI_RUNGS.length) {
    return {
      ok: false,
      reason: "ladder_complete",
      win: false,
      roundsCleared: 0,
      rungResults: [],
      rewardsEarned: {},
      log: ["— 今日锦标赛已夺冠，可点击「重赛今日锦标」再战复刷奖励 —"],
    };
  }

  let squadIds = Array.isArray(opts.squadIds) && opts.squadIds.length ? opts.squadIds : hall.squadIds;
  if (!squadIds.length && list.length > 0) {
    autofillEcoTriSquad(state, getTypes, opts.monPower, { nowMs });
    squadIds = hall.squadIds;
  }
  // ML-14 统一忙碌排除：外出 / 驻场中的战队伙伴本场不参赛
  const awayIds = getAwayMonIds(state);
  const awayAtSea = getWishDockAwayMonIds(state);
  const squadMons = squadIds
    .map((id) => list.find((m) => m && m.id === id))
    .filter((m) => m && !awayIds.has(m.id))
    .slice(0, ECO_TRI_SQUAD_SIZE);
  if (!squadMons.length) {
    const atSea = squadIds.some((id) => awayAtSea.has(id));
    const away = !atSea && squadIds.some((id) => awayIds.has(id));
    return {
      ok: false,
      reason: atSea ? "squad_at_sea" : away ? "squad_away" : "empty_squad",
      win: false,
      roundsCleared: 0,
      rungResults: [],
      rewardsEarned: {},
      log: [
        atSea
          ? "— 战队伙伴正在星海漂流瓶心愿码头出海，召回或收取漂流瓶后再来报名 —"
          : away
            ? "— 战队伙伴都在外出（温泉 / 邮局 / 绘本馆 / 钓鱼会等），叫回来或重新编队后再来报名 —"
            : "— 需至少编入 1~3 只伙伴方可报名三系生态大师锦标赛 —",
      ],
    };
  }

  const commit = opts.commit !== false;
  const mode = opts.mode === "single" ? "single" : "climb";
  const startRung = hall.rungIdx;
  const stepCount = mode === "single" ? 1 : ECO_TRI_RUNGS.length - startRung;
  const baseSynergy = evaluateEcoTriSquadSynergy(state, squadMons, rotation, {
    getMonTypes: getTypes,
    getBeastDataByDex: opts.getBeastDataByDex,
    nowMs,
  });

  const playerUnits = squadMons.map((m, idx) => {
    const rawStats = getStats(m) || {};
    const bq = getMonBoutiqueBonus(state, m.id);
    const imp = getMonPrimalImprintBonus(state, m.id);
    const ribbonMul = 1 + Math.min(5, Math.max(0, Math.floor(m.hallOfFameRibbons || 0))) * 0.04;
    // ML-10 夜行限定形态：夜观时段 +5% / 暮光微光模式 +2% 战斗属性
    const nocturnalMul = getMonNocturnalFormBonus(state, m.id, nowMs).combatMul;
    const unitMul = bq.combatMul * imp.combatMul * ribbonMul * nocturnalMul;
    const maxHp = Math.max(1, Math.floor((rawStats.hp || 40) * unitMul));
    return {
      side: "player",
      idx,
      monId: m.id,
      name: m.name || `伙伴#${m.id}`,
      types: getTypes(m),
      maxHp,
      hp: maxHp,
      atk: Math.max(1, Math.floor((rawStats.atk || 25) * unitMul)),
      spa: Math.max(1, Math.floor((rawStats.spa || rawStats.atk || 25) * unitMul)),
      def: Math.max(1, Math.floor((rawStats.def || 25) * unitMul)),
      spd: Math.max(1, Math.floor((rawStats.spd || rawStats.def || 25) * unitMul)),
      spe: Math.max(1, Math.floor((rawStats.spe || 25) * unitMul * baseSynergy.speMul)),
    };
  });

  const typeZhShort = { fire: "火", water: "水", grass: "草", electric: "电", wind: "风", stone: "岩", light: "光", dark: "暗", mystic: "幻" };
  const log = [
    `— 三系生态大师锦标赛 · 今日法则「${rotation.name}」（${rotation.elements.map((t) => typeZhShort[t] || t).join("/")}）—`,
    `战队共鸣：总增伤 +${Math.round(baseSynergy.totalOutAdd * 100)}%（三系覆盖 ${baseSynergy.coveredElements.length}/3${baseSynergy.triCycleActive ? " · 三系生态循环" : ""} +${Math.round(baseSynergy.triOutAdd * 100)}% / 主场 +${Math.round(baseSynergy.homeOutAdd * 100)}% / 羁绊 +${Math.round(baseSynergy.bondOutAdd * 100)}% / 太古印记 +${Math.round(baseSynergy.amberOutAdd * 100)}%）`,
  ];

  const rungResults = [];
  const rewardsEarned = {};
  let roundsCleared = 0;
  let totalRounds = 0;
  let stoppedRungDef = null;
  let crowned = false;

  for (let step = 0; step < stepCount; step += 1) {
    const rIdx = startRung + step;
    const rDef = getEcoTriRungDef(rotation, rIdx);
    const syn = evaluateEcoTriSquadSynergy(state, squadMons, rotation, {
      getMonTypes: getTypes,
      getBeastDataByDex: opts.getBeastDataByDex,
      nowMs,
    });
    const enemyUnits = makeEcoTriEnemyUnits(rDef);
    log.push(`【第 ${rDef.rungNo} 轮 · ${rDef.name}】${typeZhShort[rDef.stageType] || rDef.stageType}系主场：${enemyUnits.map((e) => e.name).join(" ＆ ")}`);

    let pIdx = playerUnits.findIndex((u) => u.hp > 0);
    if (pIdx < 0) pIdx = 0;
    let eIdx = 0;
    let rounds = 0;
    const maxRounds = 180;
    const dmgOpts = { playerDamageMul: syn.playerDamageMul, incomingDamageMul: syn.incomingDamageMul };

    while (pIdx < playerUnits.length && eIdx < enemyUnits.length && rounds < maxRounds) {
      rounds += 1;
      const p = playerUnits[pIdx];
      const e = enemyUnits[eIdx];
      if (p.hp <= 0) {
        const nextAlive = playerUnits.findIndex((u, k) => k > pIdx && u.hp > 0);
        if (nextAlive < 0) {
          pIdx = playerUnits.length;
          break;
        }
        pIdx = nextAlive;
        continue;
      }
      if (e.hp <= 0) {
        eIdx += 1;
        continue;
      }
      // 生态场地按三系法则逐回合轮转（草→水→火…）
      const fieldElem = rotation.elements[(rIdx + rounds - 1) % rotation.elements.length];
      const pFirst = p.spe >= e.spe;
      const first = pFirst ? p : e;
      const second = pFirst ? e : p;

      const hit1 = calcDamage(first, second, fieldElem, dmgOpts);
      second.hp = Math.max(0, second.hp - hit1.damage);
      if (second.hp <= 0) {
        if (second.side === "enemy") {
          log.push(`  R${rounds}: ${first.name} 击败 ${second.name}！`);
          eIdx += 1;
        } else {
          log.push(`  R${rounds}: ${second.name} 力竭退场！`);
          const nextAlive = playerUnits.findIndex((u) => u.hp > 0);
          pIdx = nextAlive >= 0 ? nextAlive : playerUnits.length;
        }
        continue;
      }
      const hit2 = calcDamage(second, first, fieldElem, dmgOpts);
      first.hp = Math.max(0, first.hp - hit2.damage);
      if (first.hp <= 0) {
        if (first.side === "enemy") {
          log.push(`  R${rounds}: ${second.name} 反击击败 ${first.name}！`);
          eIdx += 1;
        } else {
          log.push(`  R${rounds}: ${first.name} 力竭退场！`);
          const nextAlive = playerUnits.findIndex((u) => u.hp > 0);
          pIdx = nextAlive >= 0 ? nextAlive : playerUnits.length;
        }
      }
    }

    totalRounds += rounds;
    const totalMaxHp = playerUnits.reduce((acc, u) => acc + u.maxHp, 0);
    const remHp = playerUnits.reduce((acc, u) => acc + Math.max(0, u.hp), 0);
    const teamHpPct = totalMaxHp > 0 ? remHp / totalMaxHp : 0;
    const enemyMaxHp = enemyUnits.reduce((acc, u) => acc + u.maxHp, 0);
    const enemyRemHp = enemyUnits.reduce((acc, u) => acc + Math.max(0, u.hp), 0);
    const enemyHpPct = enemyMaxHp > 0 ? enemyRemHp / enemyMaxHp : 0;
    const win = eIdx >= enemyUnits.length || (rounds >= maxRounds && teamHpPct > enemyHpPct);
    const stars = win ? (teamHpPct > 0.66 ? 3 : teamHpPct > 0.32 ? 2 : 1) : 0;

    rungResults.push({
      rungIdx: rIdx,
      rungNo: rDef.rungNo,
      name: rDef.name,
      title: rDef.title,
      stageType: rDef.stageType,
      win,
      stars,
      rounds,
      teamHpPct: Number(teamHpPct.toFixed(4)),
    });

    if (!win) {
      stoppedRungDef = rDef;
      log.push(`— 止步于【${rDef.title}】：补齐三系覆盖或强化羁绊、印记后再来挑战！—`);
      break;
    }

    roundsCleared += 1;
    const key = String(rIdx);
    const firstToday = !hall.clearedToday[key];
    const rw = firstToday ? { ...rDef.firstRewards } : { ...rDef.repeatRewards };
    if (!firstToday && rDef.isFinal) {
      // 冠军奖池只在当日首冠发放
      delete rw.shinyStarSand;
      delete rw.corridorStarMedals;
    }
    for (const [rk, rv] of Object.entries(rw)) rewardsEarned[rk] = (rewardsEarned[rk] || 0) + rv;

    if (commit) {
      if (firstToday) hall.clearedToday[key] = { stars, rounds };
      else {
        const prev = hall.clearedToday[key];
        prev.stars = Math.max(prev.stars || 1, stars);
        prev.rounds = Math.min(prev.rounds || rounds, rounds);
      }
      hall.rungIdx = Math.max(hall.rungIdx, rIdx + 1);
      hall.bestRung = Math.max(hall.bestRung || 0, rIdx + 1);
      hall.totalRungClears = (hall.totalRungClears || 0) + 1;
      applyRewardGrant(state, rw, { addRes: opts.addRes, addExpToMon: opts.addExpToMon, squadMons });
    }
    log.push(`  【晋级】第 ${rDef.rungNo} 轮 ${stars} 星（${firstToday ? "当日首胜" : "复赛"}${rw.driftBottle ? ` · 漂流瓶 +${rw.driftBottle}` : ""}）`);

    if (rDef.isFinal && commit && !hall.championToday) {
      hall.championToday = true;
      hall.totalChampionships = (hall.totalChampionships || 0) + 1;
      hall.triadChampions[rotation.id] = (hall.triadChampions[rotation.id] || 0) + 1;
      hall.crestTier = deriveEcoTriCrestTier(hall.totalChampionships, hall.triadChampions).tier;
      crowned = true;
      hall.records = [
        {
          dayKey: hall.dayKey,
          rotationName: rotation.name,
          crestTier: hall.crestTier,
          rounds: totalRounds,
          squadNames: squadMons.map((m) => m.name || "伙伴"),
          at: nowMs,
        },
        ...(hall.records || []),
      ].slice(0, 6);
      log.push(`【加冕】${rotation.master} 认可了你的战队！三系冠军徽章晋升 Tier ${hall.crestTier}/${ECO_TRI_CREST_MAX_TIER}`);
    }

    if (step < stepCount - 1) {
      for (const u of playerUnits) {
        if (u.hp > 0) u.hp = Math.min(u.maxHp, u.hp + Math.floor(u.maxHp * syn.interRungHealPct));
        else u.hp = Math.max(1, Math.floor(u.maxHp * 0.3));
      }
    }
  }

  const crestTier = commit ? hall.crestTier : computeEcoTriCrestBonus(state).crestTier;
  if (commit) {
    hall.lastRunSummary = {
      mode,
      startRung: startRung + 1,
      roundsCleared,
      nextRung: hall.rungIdx + 1,
      crowned,
      crestTier,
      totalRounds,
      stoppedTitle: stoppedRungDef?.title || null,
      rewardsEarned: { ...rewardsEarned },
      at: nowMs,
    };
  }

  return {
    ok: true,
    mode,
    win: roundsCleared > 0,
    crowned,
    rotationId: rotation.id,
    rotationName: rotation.name,
    featuredElements: rotation.elements.slice(),
    startRung,
    roundsCleared,
    nextRungIdx: commit ? hall.rungIdx : startRung + roundsCleared,
    crestTier,
    totalRounds,
    stoppedTitle: stoppedRungDef?.title || null,
    rungResults,
    rewardsEarned,
    synergy: baseSynergy,
    log,
  };
}

// ============================================================================
// ML-10 「萌灵杂技舞台表演赛」(Acrobat Stage Show Contest)
// 每日按本地日期轮换评审主题（4 种），编排 3 只伙伴 × 各 1 个杂技招式的连段节目；
// 得分 = 表演功底 + 招式多样 + 属性协奏 + 评审风格 + 羁绊默契 + 节拍时机 + 现场发挥(±5)；
// 按分数线评定 铜星 / 银星 / 金星 / 璀璨星光，每个主题的最佳评级累积为「舞台星光奖杯」星数（0~16），提供全局增幅。
// 心愿码头出海中、月光观察站派驻中的伙伴不登台（与 ML-9 锦标赛排除出海伙伴同一套路）。
// ============================================================================

export const ACROBAT_ROUTINE_SIZE = 3;
export const ACROBAT_DAILY_FREE_SHOWS = 3;
export const ACROBAT_DAILY_MAX_SHOWS = 6;
export const ACROBAT_EXTRA_SHOW_COIN = 20;
export const ACROBAT_LANTERN_LIGHT_COST = 2;
export const ACROBAT_LANTERN_SCORE_MUL = 1.1;
export const ACROBAT_TROPHY_MAX_TIER = 4;

export const ACROBAT_STYLE_ZH = Object.freeze({ aerial: "空翻", spin: "旋转", balance: "平衡", illusion: "幻术", power: "力量" });
export const ACROBAT_BEAT_ZH = Object.freeze({ 1: "轻拍", 2: "中拍", 3: "重拍" });

export const ACROBAT_TIERS = Object.freeze([
  { tier: 1, name: "铜星", minScore: 70 },
  { tier: 2, name: "银星", minScore: 100 },
  { tier: 3, name: "金星", minScore: 125 },
  { tier: 4, name: "璀璨星光", minScore: 150 },
]);

/** 杂技招式：每种属性 2 招 + 2 个通用招式（任何伙伴都能表演）。 */
export const ACROBAT_MOVES = Object.freeze([
  { id: "fire_hoop", name: "火环穿跃", element: "fire", style: "aerial", beat: 3, base: 15 },
  { id: "fire_spin", name: "焰尾旋舞", element: "fire", style: "spin", beat: 2, base: 13 },
  { id: "water_handstand", name: "水幕倒立", element: "water", style: "balance", beat: 1, base: 12 },
  { id: "water_bubbles", name: "泡泡连环抛", element: "water", style: "spin", beat: 2, base: 13 },
  { id: "grass_swing", name: "藤蔓秋千", element: "grass", style: "aerial", beat: 2, base: 13 },
  { id: "grass_tower", name: "花瓣平衡塔", element: "grass", style: "balance", beat: 1, base: 12 },
  { id: "electric_flip", name: "电光翻腾", element: "electric", style: "aerial", beat: 3, base: 15 },
  { id: "electric_juggle", name: "静电绒球杂耍", element: "electric", style: "spin", beat: 2, base: 13 },
  { id: "wind_leap", name: "旋风高跳", element: "wind", style: "aerial", beat: 3, base: 14 },
  { id: "wind_glide", name: "羽毛滑翔", element: "wind", style: "balance", beat: 1, base: 12 },
  { id: "stone_lift", name: "巨石托举", element: "stone", style: "power", beat: 3, base: 16 },
  { id: "stone_pillar", name: "岩柱单足立", element: "stone", style: "balance", beat: 2, base: 13 },
  { id: "light_ribbon", name: "星光彩带舞", element: "light", style: "spin", beat: 2, base: 13 },
  { id: "light_mirror", name: "月光镜像", element: "light", style: "illusion", beat: 1, base: 14 },
  { id: "dark_clone", name: "影子分身术", element: "dark", style: "illusion", beat: 2, base: 15 },
  { id: "dark_vanish", name: "夜幕消失术", element: "dark", style: "illusion", beat: 3, base: 14 },
  { id: "mystic_float", name: "念力悬浮球", element: "mystic", style: "illusion", beat: 1, base: 14 },
  { id: "mystic_rings", name: "星环穿梭", element: "mystic", style: "aerial", beat: 2, base: 14 },
  { id: "any_bow", name: "翻滚致意", element: "", style: "balance", beat: 1, base: 9 },
  { id: "any_pyramid", name: "叠罗汉", element: "", style: "power", beat: 2, base: 10 },
]);

/** 评审主题：每日轮换（日序号 mod 4），9 种属性全部至少被一个主题偏爱。 */
export const ACROBAT_THEMES = Object.freeze([
  {
    id: "show_moonlit",
    name: "月下幻影夜场",
    judge: "夜幕评审 · 银枭夫人",
    elements: ["dark", "mystic", "light"],
    styles: ["illusion", "balance"],
    tempo: [1, 2, 3],
    tempoName: "渐强三拍",
    motto: "灯光暗下的那一刻，才是幻术真正开始的时候。",
  },
  {
    id: "show_blaze",
    name: "炽焰马戏狂欢",
    judge: "火环团长 · 焰鬃",
    elements: ["fire", "wind", "electric"],
    styles: ["aerial", "power"],
    tempo: [3, 1, 3],
    tempoName: "强弱强",
    motto: "跳得更高、转得更快、让观众的爆米花都忘了吃！",
  },
  {
    id: "show_tide",
    name: "潮汐水幕剧场",
    judge: "水幕导演 · 汐澜",
    elements: ["water", "grass", "mystic"],
    styles: ["spin", "balance"],
    tempo: [2, 2, 3],
    tempoName: "潮汐回旋",
    motto: "像潮水一样，一浪推着一浪，最后一下要拍上礁石。",
  },
  {
    id: "show_summit",
    name: "岩峰杂耍擂台",
    judge: "力量裁判 · 磐叔",
    elements: ["stone", "electric", "fire"],
    styles: ["power", "balance"],
    tempo: [3, 2, 1],
    tempoName: "先声夺人",
    motto: "第一下就要镇住全场，后面稳稳收住就是好节目。",
  },
]);

export function getAcrobatMoveDef(moveId) {
  return ACROBAT_MOVES.find((m) => m.id === moveId) || null;
}

export function getAcrobatThemeById(themeId) {
  return ACROBAT_THEMES.find((t) => t.id === themeId) || ACROBAT_THEMES[0];
}

/** Today's judge theme — rotates every local day (day index since epoch mod 4). */
export function getAcrobatTheme(nowMs = Date.now()) {
  const d = new Date(nowMs);
  const dayIdx = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  const n = ACROBAT_THEMES.length;
  const idx = (((dayIdx + 1) % n) + n) % n;
  const nextMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
  return {
    ...ACROBAT_THEMES[idx],
    index: idx,
    dayKey: ecoTriLocalYmd(nowMs),
    msUntilNext: Math.max(0, nextMidnight - nowMs),
    next: ACROBAT_THEMES[(idx + 1) % n],
  };
}

export function getAcrobatTierForScore(score) {
  const s = Math.max(0, Number(score) || 0);
  let tier = 0;
  for (const t of ACROBAT_TIERS) if (s >= t.minScore) tier = t.tier;
  return tier;
}

export function getAcrobatTierName(tier) {
  return ACROBAT_TIERS.find((t) => t.tier === tier)?.name || "未入围";
}

function acrobatTypesOf(mon, opts = {}) {
  if (typeof opts.getMonTypes === "function") {
    const t = opts.getMonTypes(mon);
    if (Array.isArray(t) && t.length) return t.filter((x) => typeof x === "string");
  }
  if (Array.isArray(mon?.types) && mon.types.length) return mon.types.filter((x) => typeof x === "string");
  const api = typeof opts.getBeastDataByDex === "function" ? opts.getBeastDataByDex(mon?.dex) : null;
  if (Array.isArray(api?.types) && api.types.length) return api.types.filter((x) => typeof x === "string");
  const g = globalThis.BEAST_TYPES?.[mon?.dex] ?? globalThis.BEAST_TYPES?.[String(mon?.dex)];
  return Array.isArray(g) ? g.filter((x) => typeof x === "string") : [];
}

/** Moves a partner can perform: the two moves of each of its elements + the two universal moves. */
export function getAcrobatMovesForMon(mon, opts = {}) {
  const types = new Set(acrobatTypesOf(mon, opts));
  return ACROBAT_MOVES.filter((mv) => !mv.element || types.has(mv.element));
}

/** Partners that cannot take the stage: everyone on an away activity (ML-14 unified registry: dock / observatory / island / voyage / spring / post / dream / fishing). */
export function getAcrobatUnavailableMonIds(state) {
  return getAwayMonIds(state);
}

export function ensureAcrobatShowState(state, opts = {}) {
  if (!state || typeof state !== "object") return null;
  if (!state.pve || typeof state.pve !== "object") {
    state.pve = { progress: {}, dailyAttempts: 0, dailyResetDate: "", selectedIds: [] };
  }
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const theme = getAcrobatTheme(nowMs);
  const raw = state.pve.acrobatShow && typeof state.pve.acrobatShow === "object" ? state.pve.acrobatShow : {};
  const monList = Array.isArray(state?.mons?.list) ? state.mons.list : null;
  const validMonSet = monList
    ? new Set(monList.filter((m) => m && typeof m.id === "number" && m.id > 0).map((m) => Math.floor(m.id)))
    : null;

  const routine = [];
  for (const item of Array.isArray(raw.routine) ? raw.routine : []) {
    if (!item || typeof item !== "object") continue;
    const id = Math.floor(Number(item.monId) || 0);
    if (id <= 0 || routine.some((r) => r.monId === id)) continue;
    if (validMonSet && !validMonSet.has(id)) continue;
    const moveId = typeof item.moveId === "string" && getAcrobatMoveDef(item.moveId) ? item.moveId : "any_bow";
    routine.push({ monId: id, moveId });
    if (routine.length >= ACROBAT_ROUTINE_SIZE) break;
  }

  const bestTierByTheme = {};
  const bestScoreByTheme = {};
  for (const t of ACROBAT_THEMES) {
    bestTierByTheme[t.id] = Math.max(0, Math.min(ACROBAT_TROPHY_MAX_TIER, Math.floor(Number(raw.bestTierByTheme?.[t.id]) || 0)));
    bestScoreByTheme[t.id] = Math.max(0, Math.min(9999, Math.floor(Number(raw.bestScoreByTheme?.[t.id]) || 0)));
  }

  const sameDay = raw.dayKey === theme.dayKey;
  const records = Array.isArray(raw.records)
    ? raw.records
        .filter((r) => r && typeof r === "object")
        .slice(0, 5)
        .map((r) => ({
          dayKey: typeof r.dayKey === "string" ? r.dayKey.slice(0, 10) : "",
          themeName: typeof r.themeName === "string" ? r.themeName.slice(0, 24) : "杂技舞台",
          score: Math.max(0, Math.floor(Number(r.score) || 0)),
          tier: Math.max(0, Math.min(ACROBAT_TROPHY_MAX_TIER, Math.floor(Number(r.tier) || 0))),
          performers: Array.isArray(r.performers) ? r.performers.filter((s) => typeof s === "string").slice(0, 3) : [],
          at: typeof r.at === "number" && Number.isFinite(r.at) ? r.at : 0,
        }))
    : [];

  const clean = {
    routine,
    dayKey: theme.dayKey,
    themeId: theme.id,
    performedToday: sameDay ? Math.max(0, Math.min(ACROBAT_DAILY_MAX_SHOWS, Math.floor(Number(raw.performedToday) || 0))) : 0,
    bestScoreToday: sameDay ? Math.max(0, Math.floor(Number(raw.bestScoreToday) || 0)) : 0,
    bestTierByTheme,
    bestScoreByTheme,
    totalPerformances: Math.max(0, Math.floor(Number(raw.totalPerformances) || 0)),
    records,
    lastShow: raw.lastShow && typeof raw.lastShow === "object" ? raw.lastShow : null,
  };
  if (state.pve.acrobatShow && typeof state.pve.acrobatShow === "object") {
    Object.assign(state.pve.acrobatShow, clean);
    return state.pve.acrobatShow;
  }
  state.pve.acrobatShow = clean;
  return clean;
}

/** Pure non-mutating read: 「舞台星光奖杯」 global bonus from the best tier earned under each judge theme (0~16 stars). */
export function computeAcrobatTrophyBonus(state) {
  const raw = state?.pve?.acrobatShow;
  const best = raw?.bestTierByTheme && typeof raw.bestTierByTheme === "object" ? raw.bestTierByTheme : {};
  let stars = 0;
  let radiantThemes = 0;
  for (const t of ACROBAT_THEMES) {
    const tier = Math.max(0, Math.min(ACROBAT_TROPHY_MAX_TIER, Math.floor(Number(best[t.id]) || 0)));
    stars += tier;
    if (tier >= ACROBAT_TROPHY_MAX_TIER) radiantThemes += 1;
  }
  const maxStars = ACROBAT_THEMES.length * ACROBAT_TROPHY_MAX_TIER;
  const allRadiant = radiantThemes >= ACROBAT_THEMES.length;
  const round4 = (n) => Math.round(n * 10000) / 10000;
  const prodAdd = round4(stars * 0.008 + (allRadiant ? 0.04 : 0));
  const catchAdd = round4(stars * 0.001);
  const shinyAdd = round4(stars * 0.005);
  const pveOutAdd = round4(stars * 0.01);
  const trophyName =
    stars <= 0 ? "未获奖杯" : stars <= 4 ? "铜星舞台奖杯" : stars <= 8 ? "银星舞台奖杯" : stars <= 12 ? "金星舞台奖杯" : "璀璨星光奖杯";
  return {
    trophyStars: stars,
    maxStars,
    radiantThemes,
    allRadiant,
    trophyName,
    prodAdd,
    prodMul: round4(1 + prodAdd),
    catchAdd,
    shinyAdd,
    shinyChanceMul: round4(1 + shinyAdd),
    pveOutAdd,
    pveOutMul: round4(1 + pveOutAdd),
  };
}

function acrobatBestMoveFor(mon, theme, opts = {}) {
  const moves = getAcrobatMovesForMon(mon, opts);
  const fav = new Set(theme.elements);
  const favStyles = new Set(theme.styles);
  let best = moves[0] || getAcrobatMoveDef("any_bow");
  let bestVal = -Infinity;
  for (const mv of moves) {
    const v = mv.base + (mv.element && fav.has(mv.element) ? 8 : 0) + (favStyles.has(mv.style) ? 6 : 0);
    if (v > bestVal) {
      bestVal = v;
      best = mv;
    }
  }
  return best;
}

export function toggleAcrobatPerformer(state, monId, opts = {}) {
  const show = ensureAcrobatShowState(state, opts);
  const id = Math.floor(Number(monId) || 0);
  const mon = (state?.mons?.list || []).find((m) => m && m.id === id) || null;
  if (!show || !mon) return { ok: false, reason: "invalid_mon" };
  const idx = show.routine.findIndex((r) => r.monId === id);
  if (idx >= 0) {
    show.routine.splice(idx, 1);
    return { ok: true, routine: show.routine.slice() };
  }
  if (getAcrobatUnavailableMonIds(state).has(id)) return { ok: false, reason: "mon_away" };
  if (show.routine.length >= ACROBAT_ROUTINE_SIZE) return { ok: false, reason: "routine_full" };
  const theme = getAcrobatThemeById(show.themeId);
  show.routine.push({ monId: id, moveId: acrobatBestMoveFor(mon, theme, opts).id });
  return { ok: true, routine: show.routine.slice() };
}

export function setAcrobatRoutineMove(state, slotIdx, moveId, opts = {}) {
  const show = ensureAcrobatShowState(state, opts);
  const idx = Math.floor(Number(slotIdx));
  const slot = show?.routine?.[idx];
  if (!slot) return { ok: false, reason: "empty_slot" };
  const mon = (state?.mons?.list || []).find((m) => m && m.id === slot.monId) || null;
  if (!mon) return { ok: false, reason: "invalid_mon" };
  if (!getAcrobatMovesForMon(mon, opts).some((mv) => mv.id === moveId)) return { ok: false, reason: "move_unavailable" };
  slot.moveId = moveId;
  return { ok: true, routine: show.routine.slice() };
}

/** Swaps a routine slot with its previous slot (dir = -1) or next slot (dir = +1). */
export function shiftAcrobatSlot(state, slotIdx, dir = -1, opts = {}) {
  const show = ensureAcrobatShowState(state, opts);
  const a = Math.floor(Number(slotIdx));
  const b = a + (dir < 0 ? -1 : 1);
  if (!show || a < 0 || b < 0 || a >= show.routine.length || b >= show.routine.length) return { ok: false, reason: "out_of_range" };
  const tmp = show.routine[a];
  show.routine[a] = show.routine[b];
  show.routine[b] = tmp;
  return { ok: true, routine: show.routine.slice() };
}

export function detachAcrobatPerformer(state, monId) {
  const show = state?.pve?.acrobatShow;
  const id = Math.floor(Number(monId) || 0);
  if (!show || !Array.isArray(show.routine) || id <= 0) return { ok: false, detached: false };
  const before = show.routine.length;
  show.routine = show.routine.filter((r) => r && r.monId !== id);
  return { ok: true, detached: show.routine.length !== before };
}

function acrobatResolveEntries(state, routineRaw, opts = {}) {
  const list = Array.isArray(state?.mons?.list) ? state.mons.list : [];
  const out = [];
  for (const r of Array.isArray(routineRaw) ? routineRaw : []) {
    const mon = r?.mon || list.find((m) => m && m.id === r?.monId) || null;
    if (!mon || out.some((e) => e.mon.id === mon.id)) continue;
    const moves = getAcrobatMovesForMon(mon, opts);
    const mv = moves.find((x) => x.id === r.moveId) || moves[0] || getAcrobatMoveDef("any_bow");
    out.push({ mon, move: mv });
    if (out.length >= ACROBAT_ROUTINE_SIZE) break;
  }
  return out;
}

/**
 * Pure scorer (no live roll). Pillars:
 *  - execution 表演功底: move base × (1 + Lv/250 + ★×2.5%) × shiny 1.04 × nocturnal form (night 1.08 / dusk 1.04)
 *  - variety 招式多样: 2 styles +7 / 3 styles +15, repeated move −8
 *  - synergy 属性协奏: theme element +8 per move; adjacent moves forming a duo combo +8 (named relay), same element +3
 *  - style 评审风格: theme style +6 per move
 *  - bond 羁绊默契: average affection ×0.1, +5 「默契三重奏」 when all 3 performers have affection ≥ 70
 *  - timing 节拍时机: beat matches the theme tempo +7 (off by one +2), plus speed precision ≤ +1.5 per performer
 * Choreography pillars (variety / synergy / style / timing) scale with stage craft = 0.5 + 0.5 × min(1, avg Lv / 60),
 * so a freshly caught troupe cannot out-score a seasoned one just by copying the right move order.
 */
export function evaluateAcrobatRoutine(state, routineRaw = [], themeRaw = null, opts = {}) {
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const theme =
    themeRaw && Array.isArray(themeRaw.elements)
      ? themeRaw
      : getAcrobatThemeById(themeRaw || state?.pve?.acrobatShow?.themeId || getAcrobatTheme(nowMs).id);
  const entries = acrobatResolveEntries(state, routineRaw, opts);
  const favEl = new Set(theme.elements);
  const favStyles = new Set(theme.styles);
  const round1 = (n) => Math.round(n * 10) / 10;
  const getStats =
    typeof opts.getMonCurrentStats === "function" ? opts.getMonCurrentStats : (m) => getMonCurrentStats(m, opts.getBeastDataByDex);

  let execution = 0;
  let formCount = 0;
  const perSlot = [];
  for (const [i, e] of entries.entries()) {
    const lvl = Math.max(1, Math.min(100, Math.floor(Number(e.mon.lvl) || 1)));
    const stars = Math.max(0, Math.min(5, Math.floor(Number(e.mon.stars) || 0)));
    const form = getMonNocturnalFormBonus(state, e.mon.id, nowMs);
    if (form.hasForm) formCount += 1;
    const pts = e.move.base * (1 + lvl / 250 + stars * 0.025) * (e.mon.isShiny ? 1.04 : 1) * form.showScoreMul;
    execution += pts;
    const want = theme.tempo[i] || 2;
    const diff = Math.abs((e.move.beat || 2) - want);
    perSlot.push({
      monId: e.mon.id,
      monName: e.mon.name || "伙伴",
      moveId: e.move.id,
      moveName: e.move.name,
      element: e.move.element,
      style: e.move.style,
      beat: e.move.beat,
      wantBeat: want,
      beatHit: diff === 0 ? "perfect" : diff === 1 ? "near" : "miss",
      favoredElement: Boolean(e.move.element && favEl.has(e.move.element)),
      favoredStyle: favStyles.has(e.move.style),
      formName: form.hasForm ? form.formName : "",
      points: round1(pts),
    });
  }

  const styleCount = new Set(entries.map((e) => e.move.style)).size;
  const dupMoves = entries.length - new Set(entries.map((e) => e.move.id)).size;
  const variety = (entries.length >= 2 ? (styleCount >= 3 ? 15 : styleCount === 2 ? 7 : 0) : 0) - dupMoves * 8;

  let synergy = 0;
  const comboLinks = [];
  for (const e of entries) if (e.move.element && favEl.has(e.move.element)) synergy += 8;
  for (let i = 0; i + 1 < entries.length; i += 1) {
    const a = entries[i].move.element;
    const b = entries[i + 1].move.element;
    if (!a || !b) continue;
    if (a === b) {
      synergy += 3;
      comboLinks.push({ fromIdx: i, name: "同调接力", kind: "same" });
      continue;
    }
    const combo = DUO_ELEMENTAL_COMBOS.find((c) => c.pair.includes(a) && c.pair.includes(b));
    if (combo) {
      synergy += 8;
      comboLinks.push({ fromIdx: i, name: combo.name, kind: "combo" });
    }
  }

  const style = entries.filter((e) => favStyles.has(e.move.style)).length * 6;

  const affs = entries.map((e) => Math.max(0, Math.min(100, Number(e.mon.affection) || 0)));
  const avgAff = affs.length ? affs.reduce((s, v) => s + v, 0) / affs.length : 0;
  const trio = entries.length >= ACROBAT_ROUTINE_SIZE && affs.every((a) => a >= 70);
  const bond = avgAff * 0.1 + (trio ? 5 : 0);

  let timing = 0;
  for (const [i, e] of entries.entries()) {
    const slot = perSlot[i];
    timing += slot.beatHit === "perfect" ? 7 : slot.beatHit === "near" ? 2 : 0;
    let spe = 20 + (Number(e.mon.lvl) || 1);
    try {
      const st = getStats(e.mon);
      if (st && Number.isFinite(Number(st.spe))) spe = Number(st.spe);
    } catch {
      /* fall back to level-based speed */
    }
    timing += Math.min(1.5, Math.max(0, spe / 80));
  }

  const avgLvl = entries.length
    ? entries.reduce((s, e) => s + Math.max(1, Math.min(100, Math.floor(Number(e.mon.lvl) || 1))), 0) / entries.length
    : 1;
  const craftMul = Math.round((0.5 + 0.5 * Math.min(1, avgLvl / 60)) * 1000) / 1000;
  const craft = (v) => (v > 0 ? v * craftMul : v);
  const breakdown = {
    execution: round1(execution),
    variety: round1(craft(variety)),
    synergy: round1(craft(synergy)),
    style: round1(craft(style)),
    bond: round1(bond),
    timing: round1(craft(timing)),
  };
  const baseScore = Math.max(
    0,
    Math.round(breakdown.execution + breakdown.variety + breakdown.synergy + breakdown.style + breakdown.bond + breakdown.timing),
  );
  return {
    themeId: theme.id,
    performerCount: entries.length,
    styleCount,
    comboLinks,
    trioBond: trio,
    craftMul,
    formCount,
    perSlot,
    breakdown,
    baseScore,
    projectedTier: getAcrobatTierForScore(baseScore),
  };
}

/** Picks the best 1~3 available partners + moves + order for today's theme (bounded search over the top 8 partners). */
export function autofillAcrobatRoutine(state, opts = {}) {
  const show = ensureAcrobatShowState(state, opts);
  if (!show) return { ok: false, reason: "invalid_state", routine: [] };
  const away = getAcrobatUnavailableMonIds(state);
  const list = Array.isArray(state?.mons?.list) ? state.mons.list.filter((m) => m && !away.has(m.id)) : [];
  if (!list.length) {
    show.routine = [];
    return { ok: false, reason: "no_mons", routine: [] };
  }
  const theme = getAcrobatThemeById(show.themeId);
  const favEl = new Set(theme.elements);
  const favStyles = new Set(theme.styles);
  const quick = (m) => {
    const lvl = Math.max(1, Math.min(100, Math.floor(Number(m.lvl) || 1)));
    const stars = Math.max(0, Math.min(5, Math.floor(Number(m.stars) || 0)));
    const mv = acrobatBestMoveFor(m, theme, opts);
    return mv.base * (1 + lvl / 250 + stars * 0.025) + (Number(m.affection) || 0) * 0.04 + (mv.element && favEl.has(mv.element) ? 8 : 0);
  };
  const pool = list
    .slice()
    .sort((a, b) => quick(b) - quick(a) || (a.id || 0) - (b.id || 0))
    .slice(0, 8);
  const topMoves = (m) => {
    const moves = getAcrobatMovesForMon(m, opts)
      .map((mv) => ({ mv, v: mv.base + (mv.element && favEl.has(mv.element) ? 8 : 0) + (favStyles.has(mv.style) ? 6 : 0) }))
      .sort((a, b) => b.v - a.v);
    const pick = [];
    for (const x of moves) {
      if (pick.length >= 3) break;
      if (!pick.some((p) => p.style === x.mv.style && p.element === x.mv.element)) pick.push(x.mv);
    }
    return pick.length ? pick : [getAcrobatMoveDef("any_bow")];
  };
  const movesByMon = new Map(pool.map((m) => [m.id, topMoves(m)]));
  const size = Math.min(ACROBAT_ROUTINE_SIZE, pool.length);
  let best = null;
  let bestScore = -Infinity;
  const tryRoutine = (routine) => {
    const ev = evaluateAcrobatRoutine(state, routine, theme, opts);
    if (ev.baseScore > bestScore) {
      bestScore = ev.baseScore;
      best = routine.map((r) => ({ monId: r.monId, moveId: r.moveId }));
    }
  };
  const recurse = (chosen) => {
    if (chosen.length === size) {
      tryRoutine(chosen);
      return;
    }
    for (const m of pool) {
      if (chosen.some((c) => c.monId === m.id)) continue;
      for (const mv of movesByMon.get(m.id)) recurse([...chosen, { monId: m.id, mon: m, moveId: mv.id }]);
    }
  };
  recurse([]);
  show.routine = best || [];
  return { ok: show.routine.length > 0, routine: show.routine.slice(), projectedScore: bestScore };
}

export function getAcrobatShowCost(state, opts = {}) {
  const show = ensureAcrobatShowState(state, opts);
  const n = show?.performedToday || 0;
  if (n >= ACROBAT_DAILY_MAX_SHOWS) return { canPerform: false, kind: "limit", coin: 0, left: 0 };
  if (n < ACROBAT_DAILY_FREE_SHOWS) return { canPerform: true, kind: "free", coin: 0, left: ACROBAT_DAILY_FREE_SHOWS - n };
  return { canPerform: true, kind: "coin", coin: ACROBAT_EXTRA_SHOW_COIN, left: ACROBAT_DAILY_MAX_SHOWS - n };
}

/**
 * Performs today's routine: scores it (+ live roll ±5, optional 萤火舞台灯 ×1.1), awards a tier and rewards,
 * updates the per-theme best tier (trophy stars). First 3 shows a day are free, the next 3 cost futurecoin ×20.
 */
export function performAcrobatShow(state, opts = {}) {
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const show = ensureAcrobatShowState(state, { nowMs });
  if (!show) return { ok: false, reason: "invalid_state" };
  const theme = getAcrobatThemeById(show.themeId);
  const cost = getAcrobatShowCost(state, { nowMs });
  if (!cost.canPerform) return { ok: false, reason: "daily_limit" };
  if (!show.routine.length && opts.autofill !== false) autofillAcrobatRoutine(state, { ...opts, nowMs });
  const away = getAcrobatUnavailableMonIds(state);
  const ready = show.routine.filter((r) => !away.has(r.monId));
  if (!ready.length) {
    return { ok: false, reason: show.routine.length ? "routine_away" : "empty_routine" };
  }
  if (cost.kind === "coin" && (Number(state.res?.futurecoin?.value) || 0) < cost.coin) {
    return { ok: false, reason: "insufficient_coin" };
  }
  const wantLanterns = Boolean(opts.useLanterns);
  const lanternHave = Math.floor(Number(state.res?.fireflyLantern?.value) || 0);
  if (wantLanterns && lanternHave < ACROBAT_LANTERN_LIGHT_COST) return { ok: false, reason: "insufficient_lanterns" };

  const ev = evaluateAcrobatRoutine(state, ready, theme, { ...opts, nowMs });
  const rng = typeof opts.randFloat === "function" ? opts.randFloat : Math.random;
  const live = Math.max(-5, Math.min(5, Math.round(((Number(rng()) || 0) - 0.5) * 10)));
  const lanternMul = wantLanterns ? ACROBAT_LANTERN_SCORE_MUL : 1;
  const score = Math.max(0, Math.round((ev.baseScore + live) * lanternMul));
  const tier = getAcrobatTierForScore(score);

  if (cost.kind === "coin") state.res.futurecoin.value = Math.max(0, Math.floor(state.res.futurecoin.value) - cost.coin);
  if (wantLanterns) state.res.fireflyLantern.value = Math.max(0, lanternHave - ACROBAT_LANTERN_LIGHT_COST);

  const prevBest = show.bestTierByTheme[theme.id] || 0;
  const rewards = {
    futurecoin: 10 + tier * 15,
    exp: 100 + tier * 90,
  };
  if (tier >= 2) rewards.fireflyLantern = tier - 1;
  let newTierBonus = false;
  if (tier > prevBest) {
    rewards.futurecoin += 40 * (tier - prevBest);
    if (tier >= ACROBAT_TROPHY_MAX_TIER) rewards.shinyStarSand = 2;
    newTierBonus = true;
  }
  const squadMons = ev.perSlot.map((s) => (state.mons?.list || []).find((m) => m && m.id === s.monId)).filter(Boolean);
  applyRewardGrant(state, rewards, { addRes: opts.addRes, addExpToMon: opts.addExpToMon, squadMons });

  show.performedToday += 1;
  show.totalPerformances = (show.totalPerformances || 0) + 1;
  show.bestScoreToday = Math.max(show.bestScoreToday || 0, score);
  show.bestTierByTheme[theme.id] = Math.max(prevBest, tier);
  show.bestScoreByTheme[theme.id] = Math.max(show.bestScoreByTheme[theme.id] || 0, score);
  const performers = ev.perSlot.map((s) => s.monName);
  const comboNames = ev.comboLinks.map((c) => c.name);
  if (tier > 0) {
    show.records = [
      { dayKey: show.dayKey, themeName: theme.name, score, tier, performers, at: nowMs },
      ...(show.records || []),
    ].slice(0, 5);
  }
  const judgeLine =
    tier >= 4
      ? `${theme.judge}起立鼓掌：「这就是今晚的压轴！」`
      : tier === 3
        ? `${theme.judge}频频点头：「节奏与默契都很漂亮。」`
        : tier === 2
          ? `${theme.judge}微笑记下分数：「再贴合一下今天的节拍会更好。」`
          : tier === 1
            ? `${theme.judge}：「有亮点！试试让相邻招式的属性互相呼应。」`
            : `${theme.judge}：「先从今天偏爱的属性与风格练起吧。」`;
  show.lastShow = {
    themeId: theme.id,
    themeName: theme.name,
    score,
    baseScore: ev.baseScore,
    live,
    lanternLit: wantLanterns,
    tier,
    tierName: getAcrobatTierName(tier),
    breakdown: { ...ev.breakdown },
    comboNames,
    performers,
    moves: ev.perSlot.map((s) => s.moveName),
    newTierBonus,
    rewards: { ...rewards },
    judgeLine,
    at: nowMs,
  };
  const logLine = `【杂技舞台】「${theme.name}」${performers.join("、")} 表演得分 ${score}（${getAcrobatTierName(tier)}）${comboNames.length ? ` · 连段「${comboNames.join("」「")}」` : ""}`;
  return {
    ok: true,
    themeId: theme.id,
    themeName: theme.name,
    score,
    baseScore: ev.baseScore,
    live,
    tier,
    tierName: getAcrobatTierName(tier),
    newTierBonus,
    rewards,
    costKind: cost.kind,
    evaluation: ev,
    trophy: computeAcrobatTrophyBonus(state),
    logLine,
  };
}

// ============================================================================
// ML-11 「季节迁徙候鸟萌灵」(Seasonal Migratory Spirits)
// 按本机月份划分四季（3~5 春 / 6~8 夏 / 9~11 秋 / 12~次年 2 冬），每季 3 种候鸟萌灵限时到访（整季窗口，季末启程）。
// 在「候鸟云巢栖枝」驻留招待（席位 1~3，随云顶浮岛栖枝等级提升），驻留每满 30 分钟写下一条观察记录（离线按 30 分钟分段补算，
// 跨季自动换批）；每季记录达 8 / 20 / 40 条分别获得铜羽 / 银羽 / 金羽「迁徙纪念章」，按季节保留最佳成色并提供小幅永久加成；
// 每条记录还有小概率与候鸟结伴，直接以现有灵兽形象加入队伍。转生保留纪念章、迁徙图鉴与结伴记录。
// 候鸟本身不是伙伴，不占用任何伙伴，因此无需进入 busyMonIds。
// ============================================================================

export const MIGRATION_RECORD_SEC = 1800;
export const MIGRATION_MAX_CATCHUP_SEC = 12 * 3600;
export const MIGRATION_MAX_RECORDS_PER_STEP = 48;
export const MIGRATION_FREE_FEED_PER_DAY = 1;
export const MIGRATION_FEED_COIN_COST = 20;
export const MIGRATION_MAX_HOST = 3;
export const MIGRATION_JOURNAL_KEEP = 12;
export const MIGRATION_LOG_KEEP = 6;
export const MIGRATION_FRIEND_AFFECTION = 30;

export const MIGRATION_SEASONS = Object.freeze([
  { id: "spring", name: "春", label: "春归燕阵", startMonth: 3, monthsText: "3~5 月", medalName: "春归燕阵纪念章", blurb: "春风一吹，候鸟萌灵沿着云海北归，栖枝上满是叽叽喳喳的新面孔。" },
  { id: "summer", name: "夏", label: "夏潮鸭渡", startMonth: 6, monthsText: "6~8 月", medalName: "夏潮鸭渡纪念章", blurb: "夏季风把水泽萌灵一路送上浮岛，虹泉边排满了等着歇脚的小队。" },
  { id: "autumn", name: "秋", label: "秋穗雁行", startMonth: 9, monthsText: "9~11 月", medalName: "秋穗雁行纪念章", blurb: "秋天的高空急流里，雁阵般的萌灵借风南下，傍晚会在栖枝停一停。" },
  { id: "winter", name: "冬", label: "冬雪霜羽", startMonth: 12, monthsText: "12~次年 2 月", medalName: "冬雪霜羽纪念章", blurb: "极光垂下来的夜里，冰晶萌灵随着暴风雪星轨南迁，浮岛暖巢成了它们的驿站。" },
]);

export const MIGRATION_MEDAL_TIERS = Object.freeze([
  { tier: 1, name: "铜羽", minRecords: 8 },
  { tier: 2, name: "银羽", minRecords: 20 },
  { tier: 3, name: "金羽", minRecords: 40 },
]);
export const MIGRATION_MEDAL_MAX_TIER = 3;

const MIGRANT_BEFRIEND_BASE = Object.freeze({ common: 0.06, uncommon: 0.045, rare: 0.03 });
const MIGRANT_RECORD_COIN = Object.freeze({ common: 2, uncommon: 3, rare: 5 });
const MIGRANT_FRIEND_LVL = Object.freeze({ common: 5, uncommon: 8, rare: 12 });

/** 12 种候鸟萌灵（每季 3 种），全部沿用现有灵兽形象与名字。 */
export const MIGRANT_DEFS = Object.freeze([
  { id: "mg_spring_sparrow", season: "spring", dex: 16, pid: "p016", name: "云羽雏雀", rarity: "common", note: "一整排雏雀停在栖枝上梳理冠羽，清脆的啼声把浮岛的晨雾都叫散了。" },
  { id: "mg_spring_fluff", season: "spring", dex: 546, pid: "p546", name: "云絮小团", rarity: "common", note: "顺着春风飘来的棉花云团，落在栖枝上就不肯走，要等最暖的那一阵风。" },
  { id: "mg_spring_butterfly", season: "spring", dex: 12, pid: "p012", name: "幻彩星蝶", rarity: "rare", note: "成群的星蝶越过云海北上，翅上的星粉在栖枝上落了薄薄一层。" },
  { id: "mg_summer_duckling", season: "summer", dex: 54, pid: "p054", name: "涟漪小鸭", rarity: "common", note: "抱着水灵珠的小鸭排成一队，从虹泉里一只接一只地扑腾上岸。" },
  { id: "mg_summer_chime", season: "summer", dex: 174, pid: "p174", name: "绒音小团", rarity: "common", note: "夏夜里叮叮当当的风铃声，原来是栖枝上的绒音小团在等季风换向。" },
  { id: "mg_summer_duckking", season: "summer", dex: 55, pid: "p055", name: "沧澜灵鸭皇", rarity: "rare", note: "领航的鸭皇在云端盘旋三圈，整支鸭队才肯落下来歇脚。" },
  { id: "mg_autumn_falcon", season: "autumn", dex: 17, pid: "p017", name: "疾风灵隼", rarity: "uncommon", note: "借着秋天的高空急流南下，停在栖枝顶端，像一枚蓝金色的箭头。" },
  { id: "mg_autumn_cloudloong", season: "autumn", dex: 148, pid: "p148", name: "瑞霭灵龙", rarity: "uncommon", note: "七彩祥云一路从北方拖到浮岛上空，灵龙绕着栖枝慢慢游了一整夜。" },
  { id: "mg_autumn_skyking", season: "autumn", dex: 18, pid: "p018", name: "苍穹羽皇", rarity: "rare", note: "金羽王冠划过晚霞——雁阵最前方的那一位，今晚也在栖枝上落脚了。" },
  { id: "mg_winter_frostling", season: "winter", dex: 582, pid: "p582", name: "霜星幼晶", rarity: "common", note: "小冰灵呼出的冰晶粉尘挂满了栖枝，像一串提前过冬的星星。" },
  { id: "mg_winter_frostspirit", season: "winter", dex: 583, pid: "p583", name: "寒璇冰灵", rarity: "uncommon", note: "绕着暴风雪星轨南迁的冰灵，在暖云孵化巢旁边小心地停了一会儿。" },
  { id: "mg_winter_aurora", season: "winter", dex: 584, pid: "p584", name: "极光双子晶", rarity: "rare", note: "极光垂到浮岛边缘，双子晶在光幕里轻声吟唱，整夜都没有离开。" },
]);

const MIGRANT_RARITY_RANK = Object.freeze({ common: 1, uncommon: 2, rare: 3 });

export function getMigrantDef(migrantId) {
  return MIGRANT_DEFS.find((m) => m.id === migrantId) || null;
}

export function getMigrationSeasonDef(seasonId) {
  return MIGRATION_SEASONS.find((s) => s.id === seasonId) || null;
}

export function getMigrantsForSeason(seasonId) {
  return MIGRANT_DEFS.filter((m) => m.season === seasonId);
}

/**
 * Pure local-calendar season gate (meteorological seasons by local month). Winter spans December → February and is keyed
 * by the year of its December (Jan 2027 → "2026-winter"). Returns the window bounds and a departure countdown.
 */
export function getMigrationSeason(nowMs = Date.now()) {
  const d = new Date(nowMs);
  const month = d.getMonth() + 1;
  const idx = month >= 3 && month <= 5 ? 0 : month >= 6 && month <= 8 ? 1 : month >= 9 && month <= 11 ? 2 : 3;
  const def = MIGRATION_SEASONS[idx];
  const year = month <= 2 ? d.getFullYear() - 1 : d.getFullYear();
  const startMs = new Date(year, def.startMonth - 1, 1, 0, 0, 0, 0).getTime();
  const endMs = new Date(year, def.startMonth - 1 + 3, 1, 0, 0, 0, 0).getTime();
  const next = MIGRATION_SEASONS[(idx + 1) % MIGRATION_SEASONS.length];
  return {
    ...def,
    index: idx,
    year,
    key: `${year}-${def.id}`,
    startMs,
    endMs,
    msUntilEnd: Math.max(0, endMs - nowMs),
    next,
    migrants: getMigrantsForSeason(def.id),
  };
}

export function getMigrationMedalTier(records) {
  const n = Math.max(0, Math.floor(Number(records) || 0));
  let tier = 0;
  for (const t of MIGRATION_MEDAL_TIERS) if (n >= t.minRecords) tier = t.tier;
  return tier;
}

export function getMigrationMedalTierName(tier) {
  return MIGRATION_MEDAL_TIERS.find((t) => t.tier === tier)?.name || "未获章";
}

/** Stay-over seats on the 候鸟云巢栖枝: 1 base, +1 at perch Lv.1, +1 at Lv.3 (max 3). */
export function getMigrationHostCap(state) {
  return Math.max(1, Math.min(MIGRATION_MAX_HOST, computeSkyIslandAura(state).migrantHostCap || 1));
}

/** Observation speed: ×(1 + 候鸟云巢栖枝 10% per level). */
export function evaluateMigrationSpeed(state) {
  const aura = computeSkyIslandAura(state);
  return { speedMul: Math.round((1 + (aura.migrationSpeedAdd || 0)) * 100) / 100, befriendAdd: aura.befriendAdd || 0, hostCap: getMigrationHostCap(state) };
}

export function getMigrantBefriendChance(state, migrantId) {
  const def = getMigrantDef(migrantId);
  if (!def) return 0;
  return Math.round(((MIGRANT_BEFRIEND_BASE[def.rarity] || 0.03) + (computeSkyIslandAura(state).befriendAdd || 0)) * 10000) / 10000;
}

const SEASON_KEY_RE = /^\d{4}-(spring|summer|autumn|winter)$/;

export function ensureSeasonMigrationState(state) {
  if (!state || typeof state !== "object") return null;
  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  const raw = state.meta.seasonMigration && typeof state.meta.seasonMigration === "object" ? state.meta.seasonMigration : {};
  const validIds = new Set(MIGRANT_DEFS.map((m) => m.id));
  const seasonKey = typeof raw.seasonKey === "string" && SEASON_KEY_RE.test(raw.seasonKey) ? raw.seasonKey : "";
  const seasonId = seasonKey ? seasonKey.split("-")[1] : "";
  const cap = getMigrationHostCap(state);
  const hostedIds = Array.isArray(raw.hostedIds)
    ? Array.from(
        new Set(raw.hostedIds.filter((id) => typeof id === "string" && validIds.has(id) && (!seasonId || getMigrantDef(id).season === seasonId))),
      ).slice(0, cap)
    : [];
  const numMap = (src, max, keepFn = () => true) => {
    const out = {};
    if (!src || typeof src !== "object") return out;
    for (const [k, v] of Object.entries(src)) {
      if (!validIds.has(k) || !keepFn(k)) continue;
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) out[k] = Math.min(max, n);
    }
    return out;
  };
  const inSeason = (id) => !seasonId || getMigrantDef(id).season === seasonId;
  const stay = numMap(raw.stay, MIGRATION_RECORD_SEC - 0.001, inSeason);
  const records = {};
  for (const [k, v] of Object.entries(numMap(raw.records, 99999, inSeason))) records[k] = Math.floor(v);
  const atlas = {};
  for (const [k, v] of Object.entries(numMap(raw.atlas, 999999))) atlas[k] = Math.floor(v);
  const medals = {};
  const rawMedals = raw.medals && typeof raw.medals === "object" ? raw.medals : {};
  for (const s of MIGRATION_SEASONS) medals[s.id] = Math.max(0, Math.min(MIGRATION_MEDAL_MAX_TIER, Math.floor(Number(rawMedals[s.id]) || 0)));
  const medalHistory = Array.isArray(raw.medalHistory)
    ? raw.medalHistory
        .filter((h) => h && typeof h === "object" && typeof h.key === "string" && SEASON_KEY_RE.test(h.key))
        .slice(0, 8)
        .map((h) => ({
          key: h.key,
          seasonId: h.key.split("-")[1],
          tier: Math.max(1, Math.min(MIGRATION_MEDAL_MAX_TIER, Math.floor(Number(h.tier) || 1))),
          at: typeof h.at === "number" && Number.isFinite(h.at) ? h.at : 0,
        }))
    : [];
  const befriendedThisSeason = Array.isArray(raw.befriendedThisSeason)
    ? Array.from(new Set(raw.befriendedThisSeason.filter((id) => typeof id === "string" && validIds.has(id) && inSeason(id))))
    : [];
  const friends = Array.isArray(raw.friends)
    ? raw.friends
        .filter((f) => f && typeof f === "object" && validIds.has(f.migrantId))
        .slice(0, 24)
        .map((f) => ({
          migrantId: f.migrantId,
          monId: Math.max(0, Math.floor(Number(f.monId) || 0)),
          seasonKey: typeof f.seasonKey === "string" && SEASON_KEY_RE.test(f.seasonKey) ? f.seasonKey : "",
          at: typeof f.at === "number" && Number.isFinite(f.at) ? f.at : 0,
        }))
    : [];
  const journal = Array.isArray(raw.journal)
    ? raw.journal
        .filter((e) => e && typeof e === "object" && validIds.has(e.migrantId))
        .slice(0, MIGRATION_JOURNAL_KEEP)
        .map((e) => ({
          migrantId: e.migrantId,
          kind: e.kind === "befriend" || e.kind === "medal" ? e.kind : "record",
          tier: Math.max(0, Math.min(MIGRATION_MEDAL_MAX_TIER, Math.floor(Number(e.tier) || 0))),
          at: typeof e.at === "number" && Number.isFinite(e.at) ? e.at : 0,
        }))
    : [];
  const recentLogs = Array.isArray(raw.recentLogs)
    ? raw.recentLogs.filter((s) => typeof s === "string" && s.trim().length > 0).slice(0, MIGRATION_LOG_KEEP)
    : [];
  const clean = {
    initialized: true,
    seasonKey,
    hostedIds,
    stay,
    records,
    seasonRecords: Math.max(0, Math.floor(Number(raw.seasonRecords) || 0)),
    seasonTier: Math.max(0, Math.min(MIGRATION_MEDAL_MAX_TIER, Math.floor(Number(raw.seasonTier) || 0))),
    befriendedThisSeason,
    feedDate: typeof raw.feedDate === "string" ? raw.feedDate : "",
    feedUsed: Math.max(0, Math.floor(Number(raw.feedUsed) || 0)),
    medals,
    medalHistory,
    atlas,
    friends,
    totalRecords: Math.max(0, Math.floor(Number(raw.totalRecords) || 0)),
    totalBefriended: Math.max(0, Math.floor(Number(raw.totalBefriended) || 0)),
    journal,
    recentLogs,
  };
  if (state.meta.seasonMigration && typeof state.meta.seasonMigration === "object") {
    Object.assign(state.meta.seasonMigration, clean);
    return state.meta.seasonMigration;
  }
  state.meta.seasonMigration = clean;
  return clean;
}

function migrationPushLog(mg, line) {
  mg.recentLogs = [line, ...(mg.recentLogs || [])].slice(0, MIGRATION_LOG_KEEP);
}

function migrationPushJournal(mg, entry) {
  mg.journal = [entry, ...(mg.journal || [])].slice(0, MIGRATION_JOURNAL_KEEP);
}

/**
 * Rolls the tracker over to the season active at `nowMs`: previous visitors depart (per-season stay / records / friends reset;
 * medals already earned stay). If the player was hosting, the new season's visitors are welcomed into the same number of seats.
 */
export function syncMigrationSeason(state, nowMs = Date.now()) {
  const mg = state?.meta?.seasonMigration;
  const season = getMigrationSeason(nowMs);
  if (!mg || typeof mg !== "object") return { rolledOver: false, season, prevKey: "" };
  if (mg.seasonKey === season.key) return { rolledOver: false, season, prevKey: mg.seasonKey };
  const prevKey = typeof mg.seasonKey === "string" ? mg.seasonKey : "";
  const wasHosting = Array.isArray(mg.hostedIds) ? mg.hostedIds.length : 0;
  mg.seasonKey = season.key;
  mg.stay = {};
  mg.records = {};
  mg.seasonRecords = 0;
  mg.seasonTier = 0;
  mg.befriendedThisSeason = [];
  const cap = getMigrationHostCap(state);
  mg.hostedIds = wasHosting
    ? season.migrants
        .slice()
        .sort((a, b) => (MIGRANT_RARITY_RANK[b.rarity] || 0) - (MIGRANT_RARITY_RANK[a.rarity] || 0))
        .slice(0, Math.min(cap, wasHosting))
        .map((m) => m.id)
    : [];
  if (prevKey) {
    const prevDef = getMigrationSeasonDef(prevKey.split("-")[1]);
    migrationPushLog(mg, `【候鸟启程】「${prevDef?.label || "上一季"}」的候鸟萌灵已经启程，「${season.label}」的新访客正陆续抵达浮岛栖枝`);
  }
  return { rolledOver: Boolean(prevKey), season, prevKey };
}

function migrationAddRes(state, rid, n, opts = {}) {
  const amt = Math.max(0, Math.floor(Number(n) || 0));
  if (amt <= 0) return;
  if (typeof opts.addRes === "function") {
    opts.addRes(rid, amt);
    return;
  }
  if (!state.res || typeof state.res !== "object") state.res = {};
  if (!state.res[rid] || typeof state.res[rid] !== "object") state.res[rid] = { value: 0, cap: 999999 };
  const cap = typeof state.res[rid].cap === "number" && state.res[rid].cap > 0 ? state.res[rid].cap : 999999;
  state.res[rid].value = Math.min(cap, Math.max(0, Number(state.res[rid].value) || 0) + amt);
}

/** Adds a befriended migrant to the party using the existing creature art/species (no new art). */
function createMigrantFriendMon(state, def, opts = {}) {
  if (!state.mons || typeof state.mons !== "object") state.mons = { nextId: 1, list: [] };
  if (!Array.isArray(state.mons.list)) state.mons.list = [];
  const sp = (typeof opts.getSpeciesByPid === "function" ? opts.getSpeciesByPid(def.pid) : null) || {
    id: def.pid,
    dex: def.dex,
    name: globalThis.BEAST_ZH?.[def.pid] || def.name,
    tier: globalThis.BEAST_TIER?.[def.pid] || def.rarity,
  };
  let mon = null;
  try {
    mon = typeof opts.createMonInstance === "function" ? opts.createMonInstance(sp) : null;
  } catch {
    mon = null;
  }
  if (!mon || typeof mon !== "object") mon = createMonInstanceRaw(sp, { idFallback: state.mons.nextId ?? 1 });
  if (!mon || typeof mon !== "object") return null;
  const used = new Set(state.mons.list.filter(Boolean).map((m) => m.id));
  if (!Number.isFinite(mon.id) || mon.id <= 0 || used.has(mon.id)) {
    mon.id = Math.max(Math.floor(Number(state.mons.nextId) || 1), used.size ? Math.max(...used) + 1 : 1);
  }
  mon.lvl = Math.max(Math.floor(Number(mon.lvl) || 1), MIGRANT_FRIEND_LVL[def.rarity] || 5);
  mon.exp = 0;
  mon.affection = Math.max(Math.floor(Number(mon.affection) || 0), MIGRATION_FRIEND_AFFECTION);
  if (typeof mon.skillCdRemainingSec !== "number") {
    mon.skillCdRemainingSec = 0;
    mon.skillActiveType = null;
    mon.skillActiveRemainingSec = 0;
  }
  state.mons.list.push(mon);
  state.mons.nextId = Math.max(Math.floor(Number(state.mons.nextId) || 1), mon.id + 1);
  if (!state.dex || typeof state.dex !== "object") state.dex = { caught: {} };
  if (!state.dex.caught || typeof state.dex.caught !== "object") state.dex.caught = {};
  state.dex.caught[sp.id] = (Number(state.dex.caught[sp.id]) || 0) + 1;
  return mon;
}

function recordMigrantObservation(state, mg, def, rng, atMs, opts = {}) {
  mg.records[def.id] = (mg.records[def.id] || 0) + 1;
  mg.atlas[def.id] = (mg.atlas[def.id] || 0) + 1;
  mg.seasonRecords = (mg.seasonRecords || 0) + 1;
  mg.totalRecords = (mg.totalRecords || 0) + 1;
  const coin = MIGRANT_RECORD_COIN[def.rarity] || 2;
  migrationAddRes(state, "futurecoin", coin, opts);
  migrationPushJournal(mg, { migrantId: def.id, kind: "record", tier: 0, at: atMs });
  const out = { migrantId: def.id, name: def.name, rarity: def.rarity, coin, befriended: null, medalTier: 0 };

  const tier = getMigrationMedalTier(mg.seasonRecords);
  if (tier > (mg.seasonTier || 0)) {
    mg.seasonTier = tier;
    const seasonId = def.season;
    if (!mg.medals || typeof mg.medals !== "object") mg.medals = {};
    mg.medals[seasonId] = Math.max(Math.floor(Number(mg.medals[seasonId]) || 0), tier);
    const key = mg.seasonKey || `${new Date(atMs).getFullYear()}-${seasonId}`;
    mg.medalHistory = [{ key, seasonId, tier, at: atMs }, ...(mg.medalHistory || []).filter((h) => h.key !== key)].slice(0, 8);
    migrationPushJournal(mg, { migrantId: def.id, kind: "medal", tier, at: atMs });
    const sDef = getMigrationSeasonDef(seasonId);
    migrationPushLog(mg, `【迁徙纪念章】「${sDef?.label || ""}」观察记录满 ${mg.seasonRecords} 条，获得${getMigrationMedalTierName(tier)}「${sDef?.medalName || "迁徙纪念章"}」`);
    out.medalTier = tier;
  }

  const already = Array.isArray(mg.befriendedThisSeason) && mg.befriendedThisSeason.includes(def.id);
  if (!already && opts.allowBefriend !== false) {
    const chance = getMigrantBefriendChance(state, def.id);
    if ((Number(rng()) || 0) < chance) {
      const mon = createMigrantFriendMon(state, def, opts);
      if (mon) {
        mg.befriendedThisSeason = [...(mg.befriendedThisSeason || []), def.id];
        mg.friends = [{ migrantId: def.id, monId: mon.id, seasonKey: mg.seasonKey || "", at: atMs }, ...(mg.friends || [])].slice(0, 24);
        mg.totalBefriended = (mg.totalBefriended || 0) + 1;
        migrationPushJournal(mg, { migrantId: def.id, kind: "befriend", tier: 0, at: atMs });
        migrationPushLog(mg, `【候鸟结伴】驻留的「${def.name}」决定不再启程，跟着你留在了浮岛（Lv.${mon.lvl} · 亲密 ${mon.affection}）`);
        out.befriended = mon;
      }
    }
  }
  return out;
}

/**
 * Advances stay-over observation by dtSec (live tick + offline catch-up, ≤12h). Walks the span in ≤30-minute chunks and resolves
 * the season per chunk, so an offline stretch across a season boundary hands over to the new visitors. No-op without a tracker.
 */
export function advanceSeasonMigration(state, dtSec, opts = {}) {
  const mg = state?.meta?.seasonMigration;
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const empty = { records: [], befriended: [], medals: [], rolledOver: false, coin: 0 };
  if (!mg || typeof mg !== "object") return empty;
  if (!mg.stay || typeof mg.stay !== "object") mg.stay = {};
  if (!mg.records || typeof mg.records !== "object") mg.records = {};
  if (!mg.atlas || typeof mg.atlas !== "object") mg.atlas = {};
  if (!Array.isArray(mg.hostedIds)) mg.hostedIds = [];
  if (!mg.hostedIds.length) {
    // Nobody on the perch: only keep the season key current (cheap per-tick path).
    return { ...empty, rolledOver: syncMigrationSeason(state, nowMs).rolledOver };
  }
  const rng = typeof opts.randFloat === "function" ? opts.randFloat : Math.random;
  const step = typeof dtSec === "number" && Number.isFinite(dtSec) && dtSec > 0 ? Math.min(MIGRATION_MAX_CATCHUP_SEC, dtSec) : 0;
  const speedMul = evaluateMigrationSpeed(state).speedMul;
  const records = [];
  let rolledOver = false;
  let remaining = step;
  let t = nowMs - step * 1000;
  while (remaining > 0) {
    const chunk = Math.min(remaining, MIGRATION_RECORD_SEC);
    const sync = syncMigrationSeason(state, t + chunk * 500);
    if (sync.rolledOver) rolledOver = true;
    for (const id of mg.hostedIds.slice()) {
      const def = getMigrantDef(id);
      if (!def || def.season !== sync.season.id) continue;
      mg.stay[id] = (Number(mg.stay[id]) || 0) + chunk * speedMul;
      while (mg.stay[id] >= MIGRATION_RECORD_SEC && records.length < MIGRATION_MAX_RECORDS_PER_STEP) {
        mg.stay[id] -= MIGRATION_RECORD_SEC;
        records.push(recordMigrantObservation(state, mg, def, rng, Math.round(t + chunk * 1000), opts));
      }
      if (mg.stay[id] >= MIGRATION_RECORD_SEC) mg.stay[id] = MIGRATION_RECORD_SEC - 0.001;
    }
    t += chunk * 1000;
    remaining -= chunk;
  }
  const finalSync = syncMigrationSeason(state, nowMs);
  if (finalSync.rolledOver) rolledOver = true;
  return {
    records,
    befriended: records.filter((r) => r.befriended).map((r) => ({ migrantId: r.migrantId, name: r.name, monId: r.befriended.id })),
    medals: records.filter((r) => r.medalTier > 0).map((r) => r.medalTier),
    rolledOver,
    coin: records.reduce((s, r) => s + (r.coin || 0), 0),
  };
}

/** Hosts / sends off one of the current season's visitors on the perch (seats = getMigrationHostCap). */
export function toggleMigrantHost(state, migrantId, opts = {}) {
  const mg = ensureSeasonMigrationState(state);
  if (!mg) return { ok: false, reason: "invalid_state" };
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const { season } = syncMigrationSeason(state, nowMs);
  const def = getMigrantDef(migrantId);
  if (!def) return { ok: false, reason: "invalid_migrant" };
  if (def.season !== season.id) return { ok: false, reason: "not_in_season" };
  if (mg.hostedIds.includes(def.id)) {
    mg.hostedIds = mg.hostedIds.filter((x) => x !== def.id);
    return { ok: true, hosted: false, hostedIds: mg.hostedIds.slice() };
  }
  if (mg.hostedIds.length >= getMigrationHostCap(state)) return { ok: false, reason: "host_full" };
  mg.hostedIds = [...mg.hostedIds, def.id];
  return { ok: true, hosted: true, hostedIds: mg.hostedIds.slice() };
}

/** Fills free perch seats with this season's visitors (not-yet-befriended first, then rarer first). */
export function autoHostMigrants(state, opts = {}) {
  const mg = ensureSeasonMigrationState(state);
  if (!mg) return { ok: false, added: [] };
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const { season } = syncMigrationSeason(state, nowMs);
  const free = getMigrationHostCap(state) - mg.hostedIds.length;
  if (free <= 0) return { ok: false, reason: "host_full", added: [] };
  const befriended = new Set(mg.befriendedThisSeason || []);
  const picked = season.migrants
    .filter((m) => !mg.hostedIds.includes(m.id))
    .sort(
      (a, b) =>
        (befriended.has(a.id) ? 1 : 0) - (befriended.has(b.id) ? 1 : 0) ||
        (MIGRANT_RARITY_RANK[b.rarity] || 0) - (MIGRANT_RARITY_RANK[a.rarity] || 0),
    )
    .slice(0, free)
    .map((m) => m.id);
  mg.hostedIds = [...mg.hostedIds, ...picked];
  return { ok: picked.length > 0, reason: picked.length ? "" : "no_visitors", added: picked, hostedIds: mg.hostedIds.slice() };
}

export function getMigrationFeedFreeLeft(state, nowMs = Date.now()) {
  const mg = state?.meta?.seasonMigration;
  if (!mg || typeof mg !== "object") return MIGRATION_FREE_FEED_PER_DAY;
  if (mg.feedDate !== ecoTriLocalYmd(nowMs)) return MIGRATION_FREE_FEED_PER_DAY;
  return Math.max(0, MIGRATION_FREE_FEED_PER_DAY - Math.floor(Number(mg.feedUsed) || 0));
}

/** 「撒谷迎候」: every hosted visitor instantly adds one observation record — free once per local day, then futurecoin ×20. */
export function performMigrationFeed(state, opts = {}) {
  const mg = ensureSeasonMigrationState(state);
  if (!mg) return { ok: false, reason: "invalid_state" };
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const { season } = syncMigrationSeason(state, nowMs);
  const hosted = mg.hostedIds.map((id) => getMigrantDef(id)).filter((d) => d && d.season === season.id);
  if (!hosted.length) return { ok: false, reason: "no_hosted" };
  const today = ecoTriLocalYmd(nowMs);
  if (mg.feedDate !== today) {
    mg.feedDate = today;
    mg.feedUsed = 0;
  }
  let costKind = "";
  if (mg.feedUsed < MIGRATION_FREE_FEED_PER_DAY) {
    mg.feedUsed += 1;
    costKind = "free_daily";
  } else if ((Number(state.res?.futurecoin?.value) || 0) >= MIGRATION_FEED_COIN_COST) {
    state.res.futurecoin.value = Math.max(0, Math.floor(state.res.futurecoin.value) - MIGRATION_FEED_COIN_COST);
    costKind = "futurecoin";
  } else {
    return { ok: false, reason: "insufficient_feed_cost" };
  }
  const rng = typeof opts.randFloat === "function" ? opts.randFloat : Math.random;
  const records = hosted.map((def) => recordMigrantObservation(state, mg, def, rng, nowMs, opts));
  const coin = records.reduce((s, r) => s + (r.coin || 0), 0);
  const friends = records.filter((r) => r.befriended);
  const logLine = `【撒谷迎候】栖枝上的${records.map((r) => `「${r.name}」`).join("、")}吃得心满意足，观察记录 +${records.length}（未来币 +${coin}）${friends.length ? `，${friends.map((r) => r.name).join("、")} 决定结伴留下！` : ""}`;
  migrationPushLog(mg, logLine);
  return { ok: true, costKind, records, coin, befriended: friends.map((r) => r.befriended), logLine };
}

/** Rebirth hook: the party is wiped, so friend records lose their (now invalid) partner ids. Medals / atlas / hosting persist. */
export function resetSeasonMigrationFriendsForRebirth(state) {
  const mg = state?.meta?.seasonMigration;
  if (!mg || typeof mg !== "object" || !Array.isArray(mg.friends)) return;
  mg.friends = mg.friends.map((f) => ({ ...f, monId: 0 }));
}

/** Partner ids that joined as befriended migrants (still in the party). */
export function getMigrantFriendMonIds(state) {
  const ids = new Map();
  const friends = state?.meta?.seasonMigration?.friends;
  if (!Array.isArray(friends)) return ids;
  const alive = Array.isArray(state?.mons?.list) ? new Set(state.mons.list.filter(Boolean).map((m) => m.id)) : null;
  for (const f of friends) {
    const id = Math.floor(Number(f?.monId) || 0);
    if (id > 0 && (!alive || alive.has(id)) && !ids.has(id)) ids.set(id, f.migrantId);
  }
  return ids;
}

/**
 * Pure non-mutating read of the permanent 「迁徙纪念章」 bonus: best medal tier per season (0~3 × 4 seasons = 12 points).
 * +0.4% production / +0.4% shiny / +0.15% catch / +0.5% PvE damage per point; all four seasons medalled → extra +2% production.
 */
export function computeSeasonMigrationBonus(state) {
  const raw = state?.meta?.seasonMigration;
  const medalsRaw = raw?.medals && typeof raw.medals === "object" ? raw.medals : {};
  let medalPoints = 0;
  let seasonsWithMedal = 0;
  const medals = {};
  for (const s of MIGRATION_SEASONS) {
    const tier = Math.max(0, Math.min(MIGRATION_MEDAL_MAX_TIER, Math.floor(Number(medalsRaw[s.id]) || 0)));
    medals[s.id] = tier;
    medalPoints += tier;
    if (tier > 0) seasonsWithMedal += 1;
  }
  const allSeasons = seasonsWithMedal >= MIGRATION_SEASONS.length;
  const atlas = raw?.atlas && typeof raw.atlas === "object" ? raw.atlas : {};
  const atlasSeen = MIGRANT_DEFS.filter((m) => (Number(atlas[m.id]) || 0) > 0).length;
  const round4 = (n) => Math.round(n * 10000) / 10000;
  const prodAdd = round4(medalPoints * 0.004 + (allSeasons ? 0.02 : 0));
  const shinyAdd = round4(medalPoints * 0.004);
  const catchAdd = round4(medalPoints * 0.0015);
  const pveOutAdd = round4(medalPoints * 0.005);
  return {
    medals,
    medalPoints,
    maxPoints: MIGRATION_SEASONS.length * MIGRATION_MEDAL_MAX_TIER,
    seasonsWithMedal,
    allSeasons,
    atlasSeen,
    totalMigrants: MIGRANT_DEFS.length,
    prodAdd,
    prodMul: round4(1 + prodAdd),
    shinyAdd,
    shinyChanceMul: round4(1 + shinyAdd),
    catchAdd,
    pveOutAdd,
    pveOutMul: round4(1 + pveOutAdd),
  };
}

// ============================================================================
// ML-12 「萌灵乐队合奏音乐会」(Mengling Band Ensemble Concert Tour)
// 4 个声部（灵鼓 / 竖琴 / 风笛 / 星铃）各编入 1 只伙伴，谱写 8 拍节奏型（休止 / 轻拍 / 重拍），按巡演路线在 5 站依次登台合奏。
// 得分 = 演奏功底 + 和声（声部属性契合 + 站点偏爱属性 + 相邻声部属性和弦）+ 节奏（节奏型规则 + 站点曲风 + 鼓手稳定度）
//        + 羁绊默契 + 现场发挥(±4)；和声与节奏随乐团熟练度（平均等级）缩放。
// 每站最佳评级（铜音 / 银音 / 金音 / 满堂喝彩）累积为「巡演奖杯」星数（0~20），提供全产 / 捕获 / 闪光 / PvE 增伤全局光环；
// 上一站拿到铜音以上才解锁下一站。心愿码头出海、月光观察站派驻、云顶浮岛建造、寻宝远航中的伙伴不登台（与 ML-10 舞台同一套路），
// 编入乐队的伙伴与杂技节目单同等受放生保护。
// ============================================================================

export const BAND_PATTERN_LEN = 8;
export const BAND_DAILY_FREE_CONCERTS = 3;
export const BAND_DAILY_MAX_CONCERTS = 6;
export const BAND_EXTRA_CONCERT_COIN = 20;
export const BAND_TROPHY_MAX_TIER = 4;
export const BAND_DEFAULT_PATTERN = Object.freeze([2, 0, 1, 0, 2, 0, 1, 0]);
export const BAND_BEAT_ZH = Object.freeze({ 0: "休止", 1: "轻拍", 2: "重拍" });

export const BAND_TIERS = Object.freeze([
  { tier: 1, name: "铜音", minScore: 55 },
  { tier: 2, name: "银音", minScore: 75 },
  { tier: 3, name: "金音", minScore: 95 },
  { tier: 4, name: "满堂喝彩", minScore: 115 },
]);

/** 4 个声部：每个声部偏爱的属性合起来覆盖全部 9 种属性。 */
export const BAND_PARTS = Object.freeze([
  { id: "drums", name: "灵鼓", role: "节奏声部", elements: Object.freeze(["fire", "stone", "electric"]) },
  { id: "harp", name: "竖琴", role: "弦乐声部", elements: Object.freeze(["water", "grass", "light"]) },
  { id: "flute", name: "风笛", role: "管乐声部", elements: Object.freeze(["wind", "water", "mystic"]) },
  { id: "bells", name: "星铃", role: "键音声部", elements: Object.freeze(["light", "dark", "mystic", "electric"]) },
]);

/** 巡演 5 站：上一站拿到铜音以上才解锁下一站；每站偏爱 3 种属性与一种曲风。 */
export const BAND_TOUR_STOPS = Object.freeze([
  {
    id: "harborDusk",
    name: "海港黄昏音乐会",
    city: "潮汐港",
    feel: "lively",
    feelName: "轻快",
    feelHint: "轻拍不少于 3 个",
    favElements: Object.freeze(["water", "wind", "electric"]),
    motto: "海风把节拍吹得轻轻的，观众跟着脚尖点地就好。",
  },
  {
    id: "forestGlade",
    name: "林间萤光音乐会",
    city: "翠萝林地",
    feel: "lyrical",
    feelName: "抒情",
    feelHint: "休止不少于 3 个，且重拍不超过 2 个",
    favElements: Object.freeze(["grass", "light", "mystic"]),
    motto: "萤火虫只在安静的时候靠近舞台，留白比敲满更动人。",
  },
  {
    id: "volcanoRave",
    name: "熔岩广场狂欢夜",
    city: "赤焰镇",
    feel: "fiery",
    feelName: "热烈",
    feelHint: "重拍不少于 4 个（别连续 4 个以上）",
    favElements: Object.freeze(["fire", "stone", "electric"]),
    motto: "鼓点要像岩浆一样一阵一阵涌上来，但别一口气敲到底。",
  },
  {
    id: "skyGarden",
    name: "云顶花园午后场",
    city: "云顶浮岛",
    feel: "syncopated",
    feelName: "切分",
    feelHint: "第 2 / 4 / 6 / 8 拍上的重拍不少于 2 个",
    favElements: Object.freeze(["wind", "light", "grass"]),
    motto: "把重音放到反拍上，花园里的风铃会跟着一起晃。",
  },
  {
    id: "starHall",
    name: "星穹大剧院终演",
    city: "星穹城",
    feel: "grand",
    feelName: "恢宏",
    feelHint: "第 1 拍与第 8 拍都是重拍（首尾呼应）",
    favElements: Object.freeze(["mystic", "dark", "light"]),
    motto: "巡演的最后一站：开场与谢幕都要掷地有声。",
  },
]);

export function getBandPartDef(partId) {
  return BAND_PARTS.find((p) => p.id === partId) || null;
}

export function getBandStopDef(stopId) {
  return BAND_TOUR_STOPS.find((s) => s.id === stopId) || null;
}

export function getBandTierForScore(score) {
  const s = Math.max(0, Number(score) || 0);
  let tier = 0;
  for (const t of BAND_TIERS) if (s >= t.minScore) tier = t.tier;
  return tier;
}

export function getBandTierName(tier) {
  return BAND_TIERS.find((t) => t.tier === tier)?.name || "未入围";
}

function normalizeBandPattern(raw) {
  const src = Array.isArray(raw) && raw.length === BAND_PATTERN_LEN ? raw : BAND_DEFAULT_PATTERN;
  return Array.from({ length: BAND_PATTERN_LEN }, (_, i) => Math.max(0, Math.min(2, Math.floor(Number(src[i]) || 0))));
}

/** Partners that cannot play a concert: everyone on an away activity (ML-14 unified registry). */
export function getBandUnavailableMonIds(state) {
  return getAwayMonIds(state);
}

/** A tour stop is open when it is the first stop or the previous stop's best tier is 铜音+. */
export function isBandStopUnlocked(state, stopId) {
  const idx = BAND_TOUR_STOPS.findIndex((s) => s.id === stopId);
  if (idx < 0) return false;
  if (idx === 0) return true;
  const prev = BAND_TOUR_STOPS[idx - 1];
  return Math.floor(Number(state?.meta?.bandConcert?.bestTierByStop?.[prev.id]) || 0) >= 1;
}

export function ensureBandConcertState(state, opts = {}) {
  if (!state || typeof state !== "object") return null;
  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const dayKey = ecoTriLocalYmd(nowMs);
  const raw = state.meta.bandConcert && typeof state.meta.bandConcert === "object" ? state.meta.bandConcert : {};
  const monList = Array.isArray(state?.mons?.list) ? state.mons.list : null;
  const validMonSet = monList ? new Set(monList.filter((m) => m && typeof m.id === "number" && m.id > 0).map((m) => Math.floor(m.id))) : null;
  const lineup = {};
  const used = new Set();
  const rawLineup = raw.lineup && typeof raw.lineup === "object" ? raw.lineup : {};
  for (const p of BAND_PARTS) {
    const id = Math.floor(Number(rawLineup[p.id]) || 0);
    const ok = id > 0 && !used.has(id) && (!validMonSet || validMonSet.has(id));
    lineup[p.id] = ok ? id : 0;
    if (ok) used.add(id);
  }
  const bestTierByStop = {};
  const bestScoreByStop = {};
  for (const s of BAND_TOUR_STOPS) {
    bestTierByStop[s.id] = Math.max(0, Math.min(BAND_TROPHY_MAX_TIER, Math.floor(Number(raw.bestTierByStop?.[s.id]) || 0)));
    bestScoreByStop[s.id] = Math.max(0, Math.min(9999, Math.floor(Number(raw.bestScoreByStop?.[s.id]) || 0)));
  }
  const sameDay = raw.dayKey === dayKey;
  const records = Array.isArray(raw.records)
    ? raw.records
        .filter((r) => r && typeof r === "object")
        .slice(0, 5)
        .map((r) => ({
          stopName: typeof r.stopName === "string" ? r.stopName.slice(0, 24) : "巡演",
          score: Math.max(0, Math.floor(Number(r.score) || 0)),
          tier: Math.max(0, Math.min(BAND_TROPHY_MAX_TIER, Math.floor(Number(r.tier) || 0))),
          members: Array.isArray(r.members) ? r.members.filter((x) => typeof x === "string").map((x) => x.slice(0, 24)).slice(0, 4) : [],
          at: typeof r.at === "number" && Number.isFinite(r.at) ? r.at : 0,
        }))
    : [];
  const clean = {
    initialized: true,
    lineup,
    pattern: normalizeBandPattern(raw.pattern),
    stopId: getBandStopDef(raw.stopId) ? raw.stopId : BAND_TOUR_STOPS[0].id,
    dayKey,
    performedToday: sameDay ? Math.max(0, Math.min(BAND_DAILY_MAX_CONCERTS, Math.floor(Number(raw.performedToday) || 0))) : 0,
    bestTierByStop,
    bestScoreByStop,
    totalConcerts: Math.max(0, Math.floor(Number(raw.totalConcerts) || 0)),
    records,
    lastConcert: raw.lastConcert && typeof raw.lastConcert === "object" ? raw.lastConcert : null,
  };
  if (state.meta.bandConcert && typeof state.meta.bandConcert === "object") {
    Object.assign(state.meta.bandConcert, clean);
  } else {
    state.meta.bandConcert = clean;
  }
  const band = state.meta.bandConcert;
  if (!isBandStopUnlocked(state, band.stopId)) band.stopId = BAND_TOUR_STOPS[0].id;
  return band;
}

/**
 * Pure rhythm scorer for an 8-beat pattern at a tour stop. Base rules: 强拍开场 (beat 1 heavy) +4, 第五拍回响 (beat 5 heavy +3 /
 * light +1), 留白呼吸 (1~4 rests) +3, 强弱有致 (all three beat kinds) +3, 过于吵闹 (≥4 heavy in a row) −4; plus the stop's
 * 曲风 rule +6 (轻快 / 抒情 / 热烈 / 切分 / 恢宏). Max 19.
 */
export function evaluateBandPattern(patternRaw, stopRaw = null) {
  const p = normalizeBandPattern(patternRaw);
  const stop = stopRaw && stopRaw.feel ? stopRaw : getBandStopDef(stopRaw) || BAND_TOUR_STOPS[0];
  const heavy = p.filter((b) => b === 2).length;
  const light = p.filter((b) => b === 1).length;
  const rests = p.filter((b) => b === 0).length;
  let run = 0;
  let maxRun = 0;
  for (const b of p) {
    run = b === 2 ? run + 1 : 0;
    maxRun = Math.max(maxRun, run);
  }
  const offHeavy = [1, 3, 5, 7].filter((i) => p[i] === 2).length;
  const rules = [
    { id: "downbeat", name: "强拍开场", ok: p[0] === 2, pts: p[0] === 2 ? 4 : 0 },
    { id: "echo", name: "第五拍回响", ok: p[4] >= 1, pts: p[4] === 2 ? 3 : p[4] === 1 ? 1 : 0 },
    { id: "breath", name: "留白呼吸", ok: rests >= 1 && rests <= 4, pts: rests >= 1 && rests <= 4 ? 3 : 0 },
    { id: "contrast", name: "强弱有致", ok: heavy > 0 && light > 0 && rests > 0, pts: heavy > 0 && light > 0 && rests > 0 ? 3 : 0 },
  ];
  if (maxRun >= 4) rules.push({ id: "noisy", name: "过于吵闹", ok: false, pts: -4 });
  const feelOk =
    stop.feel === "lively"
      ? light >= 3
      : stop.feel === "lyrical"
        ? rests >= 3 && heavy <= 2
        : stop.feel === "fiery"
          ? heavy >= 4
          : stop.feel === "syncopated"
            ? offHeavy >= 2
            : p[0] === 2 && p[7] === 2;
  rules.push({ id: `feel_${stop.feel}`, name: `${stop.feelName}曲风`, ok: feelOk, pts: feelOk ? 6 : 0, feel: true });
  return { pattern: p, heavy, light, rests, maxHeavyRun: maxRun, rules, points: rules.reduce((s, r) => s + r.pts, 0) };
}

function bandResolveEntries(state, lineupRaw) {
  const list = Array.isArray(state?.mons?.list) ? state.mons.list : [];
  const out = [];
  const used = new Set();
  const src = lineupRaw && typeof lineupRaw === "object" ? lineupRaw : {};
  for (const part of BAND_PARTS) {
    const v = src[part.id];
    const mon = v && typeof v === "object" ? v : list.find((m) => m && m.id === Math.floor(Number(v) || 0)) || null;
    if (!mon || used.has(mon.id)) continue;
    used.add(mon.id);
    out.push({ part, mon });
  }
  return out;
}

/**
 * Pure ensemble scorer (no live roll). Pillars:
 *  - musicianship 演奏功底: 6 × (1 + Lv/100 + ★×4%) × shiny 1.04 per member
 *  - harmony 和声: 声部契合 (member element ∈ part elements) +4 · 站点偏爱 +2 · adjacent parts (灵鼓→竖琴→风笛→星铃→灵鼓)
 *    forming a duo-element chord +5 (same element 同调和声 +2) — max 44
 *  - rhythm 节奏: evaluateBandPattern (max 19) + 鼓手稳定度 min(4, drummer Lv / 20)
 *  - bond 羁绊默契: average affection × 0.1, +5 「默契四重奏」 when all 4 members have affection ≥ 70
 * Harmony and rhythm scale with ensemble craft = 0.3 + 0.7 × min(1, avg Lv / 70), so a fresh band cannot out-play a seasoned one
 * just by copying the right chords and pattern.
 */
export function evaluateBandEnsemble(state, lineupRaw = null, patternRaw = null, stopRaw = null, opts = {}) {
  const band = state?.meta?.bandConcert;
  const stop = stopRaw && stopRaw.feel ? stopRaw : getBandStopDef(stopRaw || band?.stopId) || BAND_TOUR_STOPS[0];
  const entries = bandResolveEntries(state, lineupRaw || band?.lineup || {});
  const pattern = normalizeBandPattern(patternRaw || band?.pattern);
  const round1 = (n) => Math.round(n * 10) / 10;
  const typesOf = (m) => acrobatTypesOf(m, opts);
  const favSet = new Set(stop.favElements);
  let musicianship = 0;
  let harmony = 0;
  const perPart = [];
  for (const e of entries) {
    const lvl = Math.max(1, Math.min(100, Math.floor(Number(e.mon.lvl) || 1)));
    const stars = Math.max(0, Math.min(5, Math.floor(Number(e.mon.stars) || 0)));
    const pts = 6 * (1 + lvl / 100 + stars * 0.04) * (e.mon.isShiny ? 1.04 : 1);
    musicianship += pts;
    const types = typesOf(e.mon);
    const fit = types.some((t) => e.part.elements.includes(t));
    const fav = types.some((t) => favSet.has(t));
    if (fit) harmony += 4;
    if (fav) harmony += 2;
    perPart.push({ partId: e.part.id, partName: e.part.name, monId: e.mon.id, monName: e.mon.name || "伙伴", types, fit, fav, points: round1(pts) });
  }
  const chords = [];
  const byPart = new Map(perPart.map((x) => [x.partId, x]));
  for (let i = 0; i < BAND_PARTS.length; i += 1) {
    const a = byPart.get(BAND_PARTS[i].id);
    const b = byPart.get(BAND_PARTS[(i + 1) % BAND_PARTS.length].id);
    if (!a || !b) continue;
    let combo = null;
    for (const ta of a.types) {
      for (const tb of b.types) {
        if (ta === tb) continue;
        const c = DUO_ELEMENTAL_COMBOS.find((x) => x.pair.includes(ta) && x.pair.includes(tb));
        if (c) {
          combo = c;
          break;
        }
      }
      if (combo) break;
    }
    if (combo) {
      harmony += 5;
      chords.push({ from: a.partId, to: b.partId, kind: "chord", name: combo.name.replace(/共鸣$/, "和弦") });
    } else if (a.types.some((t) => b.types.includes(t))) {
      harmony += 2;
      chords.push({ from: a.partId, to: b.partId, kind: "same", name: "同调和声" });
    }
  }
  const patternEval = evaluateBandPattern(pattern, stop);
  const drummer = entries.find((e) => e.part.id === "drums")?.mon || null;
  const drummerSteady = drummer ? Math.min(4, Math.max(1, Math.floor(Number(drummer.lvl) || 1)) / 20) : 0;
  const rhythm = patternEval.points + drummerSteady;
  const affs = entries.map((e) => Math.max(0, Math.min(100, Number(e.mon.affection) || 0)));
  const avgAff = affs.length ? affs.reduce((s, v) => s + v, 0) / affs.length : 0;
  const quartet = entries.length >= BAND_PARTS.length && affs.every((a) => a >= 70);
  const bond = avgAff * 0.1 + (quartet ? 5 : 0);
  const avgLvl = entries.length
    ? entries.reduce((s, e) => s + Math.max(1, Math.min(100, Math.floor(Number(e.mon.lvl) || 1))), 0) / entries.length
    : 1;
  const craftMul = Math.round((0.3 + 0.7 * Math.min(1, avgLvl / 70)) * 1000) / 1000;
  const craft = (v) => (v > 0 ? v * craftMul : v);
  const breakdown = {
    musicianship: round1(musicianship),
    harmony: round1(craft(harmony)),
    rhythm: round1(craft(rhythm)),
    bond: round1(bond),
  };
  const baseScore = entries.length
    ? Math.max(0, Math.round(breakdown.musicianship + breakdown.harmony + breakdown.rhythm + breakdown.bond))
    : 0;
  return {
    stopId: stop.id,
    memberCount: entries.length,
    perPart,
    chords,
    patternEval,
    drummerSteady: round1(drummerSteady),
    quartetBond: quartet,
    craftMul,
    breakdown,
    baseScore,
    projectedTier: getBandTierForScore(baseScore),
  };
}

/** Sets (or clears with monId 0/null) the member of one part; a member already in another part moves over. */
export function setBandPartMember(state, partId, monId, opts = {}) {
  const band = ensureBandConcertState(state, opts);
  const part = getBandPartDef(partId);
  if (!band || !part) return { ok: false, reason: "invalid_part" };
  const id = Math.floor(Number(monId) || 0);
  if (id <= 0) {
    band.lineup[part.id] = 0;
    return { ok: true, lineup: { ...band.lineup } };
  }
  const mon = (state?.mons?.list || []).find((m) => m && m.id === id) || null;
  if (!mon) return { ok: false, reason: "invalid_mon" };
  if (getBandUnavailableMonIds(state).has(id)) return { ok: false, reason: "mon_away" };
  for (const p of BAND_PARTS) if (band.lineup[p.id] === id) band.lineup[p.id] = 0;
  band.lineup[part.id] = id;
  return { ok: true, lineup: { ...band.lineup } };
}

/** Cycles beat `idx` of the pattern: 休止 → 轻拍 → 重拍 → 休止 (or sets it to `value` when given). */
export function setBandBeat(state, idx, value = null, opts = {}) {
  const band = ensureBandConcertState(state, opts);
  const i = Math.floor(Number(idx));
  if (!band || !Number.isFinite(i) || i < 0 || i >= BAND_PATTERN_LEN) return { ok: false, reason: "invalid_beat" };
  const next = value == null ? (band.pattern[i] + 1) % 3 : Math.max(0, Math.min(2, Math.floor(Number(value) || 0)));
  band.pattern[i] = next;
  return { ok: true, pattern: band.pattern.slice() };
}

export function selectBandStop(state, stopId, opts = {}) {
  const band = ensureBandConcertState(state, opts);
  if (!band || !getBandStopDef(stopId)) return { ok: false, reason: "unknown_stop" };
  if (!isBandStopUnlocked(state, stopId)) return { ok: false, reason: "locked" };
  band.stopId = stopId;
  return { ok: true, stopId };
}

/** 「一键作曲」: exhaustive search over all 3^8 patterns for the current stop (first best in enumeration order). */
export function autofillBandPattern(state, opts = {}) {
  const band = ensureBandConcertState(state, opts);
  if (!band) return { ok: false, reason: "invalid_state" };
  const stop = getBandStopDef(band.stopId) || BAND_TOUR_STOPS[0];
  let best = band.pattern.slice();
  let bestPts = evaluateBandPattern(best, stop).points;
  const p = new Array(BAND_PATTERN_LEN).fill(0);
  const total = 3 ** BAND_PATTERN_LEN;
  for (let n = 0; n < total; n += 1) {
    let x = n;
    for (let i = BAND_PATTERN_LEN - 1; i >= 0; i -= 1) {
      p[i] = x % 3;
      x = Math.floor(x / 3);
    }
    const pts = evaluateBandPattern(p, stop).points;
    if (pts > bestPts) {
      bestPts = pts;
      best = p.slice();
    }
  }
  band.pattern = best;
  return { ok: true, pattern: best.slice(), points: bestPts };
}

/** 「一键组队」: best assignment of the top-8 available partners to the 4 parts for the current stop and pattern. */
export function autofillBandLineup(state, opts = {}) {
  const band = ensureBandConcertState(state, opts);
  if (!band) return { ok: false, reason: "invalid_state", lineup: {} };
  const away = getBandUnavailableMonIds(state);
  const list = Array.isArray(state?.mons?.list) ? state.mons.list.filter((m) => m && !away.has(m.id)) : [];
  if (!list.length) {
    for (const p of BAND_PARTS) band.lineup[p.id] = 0;
    return { ok: false, reason: "no_mons", lineup: { ...band.lineup } };
  }
  const stop = getBandStopDef(band.stopId) || BAND_TOUR_STOPS[0];
  const fav = new Set(stop.favElements);
  const quick = (m) => {
    const lvl = Math.max(1, Math.min(100, Math.floor(Number(m.lvl) || 1)));
    const stars = Math.max(0, Math.min(5, Math.floor(Number(m.stars) || 0)));
    const types = acrobatTypesOf(m, opts);
    return 6 * (1 + lvl / 100 + stars * 0.04) + (Number(m.affection) || 0) * 0.03 + (types.some((t) => fav.has(t)) ? 2 : 0) + lvl * 0.05;
  };
  const pool = list
    .slice()
    .sort((a, b) => quick(b) - quick(a) || (a.id || 0) - (b.id || 0))
    .slice(0, 8);
  const slots = Math.min(BAND_PARTS.length, pool.length);
  let best = null;
  let bestScore = -Infinity;
  const recurse = (partIdx, chosen, used) => {
    if (partIdx === BAND_PARTS.length) {
      if (used.size !== slots) return;
      const ev = evaluateBandEnsemble(state, chosen, band.pattern, stop, opts);
      if (ev.baseScore > bestScore) {
        bestScore = ev.baseScore;
        best = { ...chosen };
      }
      return;
    }
    const part = BAND_PARTS[partIdx];
    const remainingParts = BAND_PARTS.length - partIdx;
    const remainingMons = slots - used.size;
    if (remainingMons < remainingParts) recurse(partIdx + 1, { ...chosen, [part.id]: 0 }, used);
    if (remainingMons <= 0) return;
    for (const m of pool) {
      if (used.has(m.id)) continue;
      used.add(m.id);
      recurse(partIdx + 1, { ...chosen, [part.id]: m.id }, used);
      used.delete(m.id);
    }
  };
  recurse(0, {}, new Set());
  for (const p of BAND_PARTS) band.lineup[p.id] = best ? Math.floor(Number(best[p.id]) || 0) : 0;
  return { ok: Boolean(best), lineup: { ...band.lineup }, projectedScore: bestScore };
}

export function getBandConcertCost(state, opts = {}) {
  const band = ensureBandConcertState(state, opts);
  const n = band?.performedToday || 0;
  if (n >= BAND_DAILY_MAX_CONCERTS) return { canPerform: false, kind: "limit", coin: 0, left: 0 };
  if (n < BAND_DAILY_FREE_CONCERTS) return { canPerform: true, kind: "free", coin: 0, left: BAND_DAILY_FREE_CONCERTS - n };
  return { canPerform: true, kind: "coin", coin: BAND_EXTRA_CONCERT_COIN, left: BAND_DAILY_MAX_CONCERTS - n };
}

/** Pure non-mutating read: 「巡演奖杯」 aura from the best tier at each tour stop (0~20 stars). Neutral without a tracker. */
export function computeBandTourBonus(state) {
  const raw = state?.meta?.bandConcert;
  const best = raw?.bestTierByStop && typeof raw.bestTierByStop === "object" ? raw.bestTierByStop : {};
  let stars = 0;
  let goldStops = 0;
  let stopsCleared = 0;
  for (const s of BAND_TOUR_STOPS) {
    const tier = Math.max(0, Math.min(BAND_TROPHY_MAX_TIER, Math.floor(Number(best[s.id]) || 0)));
    stars += tier;
    if (tier >= 1) stopsCleared += 1;
    if (tier >= 3) goldStops += 1;
  }
  const maxStars = BAND_TOUR_STOPS.length * BAND_TROPHY_MAX_TIER;
  const fullTour = goldStops >= BAND_TOUR_STOPS.length;
  const round4 = (n) => Math.round(n * 10000) / 10000;
  const prodAdd = round4(stars * 0.006 + (fullTour ? 0.03 : 0));
  const catchAdd = round4(stars * 0.0008);
  const shinyAdd = round4(stars * 0.004);
  const pveOutAdd = round4(stars * 0.008);
  const trophyName =
    stars <= 0 ? "未获巡演奖杯" : stars <= 5 ? "铜音巡演奖杯" : stars <= 10 ? "银音巡演奖杯" : stars <= 15 ? "金音巡演奖杯" : "星穹巡演奖杯";
  return {
    trophyStars: stars,
    maxStars,
    stopsCleared,
    goldStops,
    fullTour,
    trophyName,
    prodAdd,
    prodMul: round4(1 + prodAdd),
    catchAdd,
    shinyAdd,
    shinyChanceMul: round4(1 + shinyAdd),
    pveOutAdd,
    pveOutMul: round4(1 + pveOutAdd),
  };
}

/** Forced release / star-up material: removes the partner from the lineup. */
export function detachBandMember(state, monId) {
  const band = state?.meta?.bandConcert;
  const id = Math.floor(Number(monId) || 0);
  if (!band || typeof band !== "object" || !band.lineup || typeof band.lineup !== "object" || id <= 0) return { ok: false, detached: false };
  let detached = false;
  for (const p of BAND_PARTS) {
    if (Math.floor(Number(band.lineup[p.id]) || 0) === id) {
      band.lineup[p.id] = 0;
      detached = true;
    }
  }
  return { ok: true, detached };
}

/** Non-mutating read: partner IDs currently in the band lineup (release-protected like the acrobat routine). */
export function getBandLineupMonIds(state) {
  const ids = new Set();
  const lineup = state?.meta?.bandConcert?.lineup;
  if (!lineup || typeof lineup !== "object") return ids;
  for (const p of BAND_PARTS) {
    const id = Math.floor(Number(lineup[p.id]) || 0);
    if (id > 0) ids.add(id);
  }
  return ids;
}

/**
 * Plays a concert at the current tour stop: scores the lineup (+ live roll ±4), awards a tier and rewards, updates the stop's best
 * tier (tour-trophy stars) and unlocks the next stop at 铜音+. First 3 concerts a day are free, the next 3 cost futurecoin ×20.
 */
export function performBandConcert(state, opts = {}) {
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const band = ensureBandConcertState(state, { nowMs });
  if (!band) return { ok: false, reason: "invalid_state" };
  const stop = getBandStopDef(band.stopId) || BAND_TOUR_STOPS[0];
  const cost = getBandConcertCost(state, { nowMs });
  if (!cost.canPerform) return { ok: false, reason: "daily_limit" };
  if (!getBandLineupMonIds(state).size && opts.autofill !== false) autofillBandLineup(state, { ...opts, nowMs });
  const away = getBandUnavailableMonIds(state);
  const ready = {};
  let readyCount = 0;
  for (const p of BAND_PARTS) {
    const id = band.lineup[p.id];
    if (id > 0 && !away.has(id)) {
      ready[p.id] = id;
      readyCount += 1;
    }
  }
  if (!readyCount) return { ok: false, reason: getBandLineupMonIds(state).size ? "lineup_away" : "empty_lineup" };
  if (cost.kind === "coin" && (Number(state.res?.futurecoin?.value) || 0) < cost.coin) return { ok: false, reason: "insufficient_coin" };
  const ev = evaluateBandEnsemble(state, ready, band.pattern, stop, opts);
  const rng = typeof opts.randFloat === "function" ? opts.randFloat : Math.random;
  const live = Math.max(-4, Math.min(4, Math.round(((Number(rng()) || 0) - 0.5) * 8)));
  const score = Math.max(0, ev.baseScore + live);
  const tier = getBandTierForScore(score);
  if (cost.kind === "coin") state.res.futurecoin.value = Math.max(0, Math.floor(state.res.futurecoin.value) - cost.coin);
  const prevBest = band.bestTierByStop[stop.id] || 0;
  const rewards = { futurecoin: 12 + tier * 14, exp: 90 + tier * 80 };
  let newTierBonus = false;
  if (tier > prevBest) {
    rewards.futurecoin += 40 * (tier - prevBest);
    if (tier >= BAND_TROPHY_MAX_TIER) rewards.shinyStarSand = 2;
    newTierBonus = true;
  }
  const list = state.mons?.list || [];
  const squadMons = ev.perPart.map((x) => list.find((m) => m && m.id === x.monId)).filter(Boolean);
  applyRewardGrant(state, rewards, { addRes: opts.addRes, addExpToMon: opts.addExpToMon, squadMons });
  const stopIdx = BAND_TOUR_STOPS.findIndex((s) => s.id === stop.id);
  const nextStop = BAND_TOUR_STOPS[stopIdx + 1] || null;
  const nextWasLocked = nextStop ? !isBandStopUnlocked(state, nextStop.id) : false;
  band.performedToday += 1;
  band.totalConcerts = (band.totalConcerts || 0) + 1;
  band.bestTierByStop[stop.id] = Math.max(prevBest, tier);
  band.bestScoreByStop[stop.id] = Math.max(band.bestScoreByStop[stop.id] || 0, score);
  const unlockedNext = Boolean(nextStop && nextWasLocked && isBandStopUnlocked(state, nextStop.id));
  const members = ev.perPart.map((x) => `${x.partName}·${x.monName}`);
  if (tier > 0) {
    band.records = [{ stopName: stop.name, score, tier, members: ev.perPart.map((x) => x.monName), at: nowMs }, ...(band.records || [])].slice(0, 5);
  }
  const chordNames = ev.chords.filter((c) => c.kind === "chord").map((c) => c.name);
  const crowdLine =
    tier >= 4
      ? `「${stop.city}」全场起立安可，掌声一直响到散场！`
      : tier === 3
        ? `「${stop.city}」的观众跟着节拍一起拍手，返场呼声很高。`
        : tier === 2
          ? `「${stop.city}」的观众听得很投入，再贴合一下曲风会更好。`
          : tier === 1
            ? `「${stop.city}」响起了礼貌的掌声——试试让相邻声部的属性结成和弦。`
            : `「${stop.city}」的观众有点走神，先从这一站偏爱的属性与曲风练起吧。`;
  band.lastConcert = {
    stopId: stop.id,
    stopName: stop.name,
    score,
    baseScore: ev.baseScore,
    live,
    tier,
    tierName: getBandTierName(tier),
    breakdown: { ...ev.breakdown },
    chordNames,
    members,
    pattern: band.pattern.slice(),
    newTierBonus,
    unlockedNext: unlockedNext ? nextStop.name : "",
    rewards: { ...rewards },
    crowdLine,
    at: nowMs,
  };
  const logLine = `【乐队巡演】「${stop.name}」${ev.perPart.map((x) => x.monName).join("、")} 合奏得分 ${score}（${getBandTierName(tier)}）${chordNames.length ? ` · 和弦「${chordNames.join("」「")}」` : ""}${unlockedNext ? ` · 解锁下一站「${nextStop.name}」` : ""}`;
  return {
    ok: true,
    stopId: stop.id,
    stopName: stop.name,
    score,
    baseScore: ev.baseScore,
    live,
    tier,
    tierName: getBandTierName(tier),
    newTierBonus,
    unlockedNext: unlockedNext ? nextStop.id : "",
    rewards,
    costKind: cost.kind,
    evaluation: ev,
    trophy: computeBandTourBonus(state),
    logLine,
  };
}

// ============================================================================
// ML-13 「萌灵邮局信使网络」(Mengling Post Office Messenger Network)
// 萌灵邮局设在芽芽草甸路口，9 条邮路沿现有捕捉生态区（芽芽草甸 → … → 幻梦秘境）一站站延伸：生态区解锁后邮路随之开通。
// 邮筒每 20 分钟收到 1 封待寄信件（最多 6 封，离线补算 ≤12h），派 1 只空闲伙伴带 1 封信沿邮路出发（最多 3 位信使同时在外），
// 往返时长 = 10 分钟 + 5 分钟 × 生态区序号；风 / 电系「疾行信使」−20%，等级越高越快（最多 −20%）。
// 信使回到邮局后拆开回信：未来币 + 当地特产 + 概率附赠的小礼物，信使获得经验与亲密；送往伙伴故乡生态区的「同乡信使」奖励 ×1.5。
// 每次送达为该生态区的邮戳累计次数：1 / 5 / 15 次升为铜 / 银 / 金戳，邮戳等级永久提供少量全产 / 捕获加成，9 区集齐「信使网络全通」再加全产。
// 外出送信（含已返回待拆回信）的信使接入 busyMonIds 防放生锁（与 ML-9 ~ ML-12 同一套路），强制放生会取消其送信，转生召回全部信使。
// ============================================================================

export const POST_MAX_MESSENGERS = POST_OFFICE_MAX_MESSENGERS;
export const POST_LETTER_CAP = 6;
export const POST_LETTER_REFILL_SEC = 1200;
export const POST_START_LETTERS = 3;
export const POST_MAX_CATCHUP_SEC = 12 * 3600;
export const POST_EXPRESS_FREE_PER_DAY = 1;
export const POST_EXPRESS_COIN_COST = 20;
export const POST_SWIFT_TYPES = Object.freeze(["wind", "electric"]);
export const POST_SWIFT_MUL = 0.8;
export const POST_HOMETOWN_MUL = 1.5;
export const POST_LOG_KEEP = 6;
export const POSTMARK_MAX_TIER = 3;
export const POSTMARK_TIERS = Object.freeze([
  { tier: 1, name: "铜戳", minDeliveries: 1 },
  { tier: 2, name: "银戳", minDeliveries: 5 },
  { tier: 3, name: "金戳", minDeliveries: 15 },
]);

export const POST_RES_ZH = Object.freeze({
  futurecoin: "未来币",
  catnip: "灵果",
  wood: "灵木",
  minerals: "灵晶碎片",
  rareCandy: "跃级糖丸",
  tuningMint: "心性调律薄荷",
  driftBottle: "星海漂流瓶",
  fireflyLantern: "萤火灯笼",
  shinyStarSand: "闪光祈愿星砂",
  ancientGeneAmber: "远古基因琥珀",
});

/** 每个生态区的邮戳图案、当地特产、回信小礼物与两封回信。 */
const POST_REGION_TABLE = Object.freeze({
  meadow: {
    stamp: "嫩芽",
    specialty: { rid: "catnip", n: 60 },
    gift: { rid: "rareCandy", n: 2 },
    letters: ["草甸的小芽芽们说：今天的露水特别甜，谢谢你送来的信！", "牧草堆后面的老萌灵托你带句话：春天的花开得正好。"],
  },
  woods: {
    stamp: "蜜露",
    specialty: { rid: "wood", n: 60 },
    gift: { rid: "tuningMint", n: 1 },
    letters: ["林径里的蜜露工坊回信：新一批蜜露酿好了，附上一点心意。", "树洞邮筒的主人说：你的信让整片林子都安静地听完了。"],
  },
  brook: {
    stamp: "溪光",
    specialty: { rid: "catnip", n: 90 },
    gift: { rid: "driftBottle", n: 1 },
    letters: ["浅滩的水纹把回信写在贝壳上：溪水今天也闪闪发光。", "小鱼们排队来看信使，回信里夹着一片亮晶晶的鳞。"],
  },
  plateau: {
    stamp: "风铃",
    specialty: { rid: "minerals", n: 50 },
    gift: { rid: "fireflyLantern", n: 1 },
    letters: ["高原的风铃响了三声，算是回信——谢谢你跑这么远。", "牧风人说：高原的风会把你的名字吹到很远很远的地方。"],
  },
  dunes: {
    stamp: "星砂",
    specialty: { rid: "minerals", n: 70 },
    gift: { rid: "shinyStarSand", n: 1 },
    letters: ["荒漠驿站回信：星砂夜里会发光，给你装了一小袋。", "骆驼商队托信使带话：下一个绿洲，我们等你。"],
  },
  garden: {
    stamp: "月见",
    specialty: { rid: "catnip", n: 150 },
    gift: { rid: "tuningMint", n: 2 },
    letters: ["月见花园的园丁回信：月光下的花开了，香气夹在信里。", "花园里的小萌灵把花瓣压成了邮票，送给你。"],
  },
  ridge: {
    stamp: "霜晶",
    specialty: { rid: "minerals", n: 110 },
    gift: { rid: "ancientGeneAmber", n: 1 },
    letters: ["山脊上的守望者回信：霜晶在晨光里像星星，路上小心冰。", "冰屋里的炉火很暖，回信的字迹都带着热气。"],
  },
  hollow: {
    stamp: "龙眠",
    specialty: { rid: "wood", n: 180 },
    gift: { rid: "shinyStarSand", n: 2 },
    letters: ["幽谷深处的老龙翻了个身，回信只有一句：好梦。", "谷里的回声把你的信念了一遍又一遍，大家都很喜欢。"],
  },
  sanctum: {
    stamp: "幻梦",
    specialty: { rid: "minerals", n: 160 },
    gift: { rid: "ancientGeneAmber", n: 2 },
    letters: ["秘境的回信是一阵会发光的雾，读完就散成了星星。", "梦里的邮差说：这是第一封寄到幻梦秘境的信吗？"],
  },
});

/** 9 条邮路：一一对应现有捕捉生态区（同序号、同解锁门槛），第 k 条邮路途经前 k 个生态区。 */
export const POST_ROUTES = Object.freeze(
  CAPTURE_AREAS.map((area, idx) => {
    const t = POST_REGION_TABLE[area.id] || POST_REGION_TABLE.meadow;
    return Object.freeze({
      id: area.id,
      idx,
      name: ZONE_LABELS[area.id] || String(area.name || "").replace(/（.*?）/g, ""),
      unlockReq: Math.max(0, Math.floor(Number(area.unlockReq) || 0)),
      tripSec: 600 + 300 * idx,
      coin: 8 + 4 * idx,
      giftChance: Math.round((0.2 + 0.03 * idx) * 1000) / 1000,
      expGain: 80 + 30 * idx,
      stamp: t.stamp,
      postmarkName: `${t.stamp}邮戳`,
      specialty: Object.freeze({ ...t.specialty }),
      gift: Object.freeze({ ...t.gift }),
      letters: Object.freeze(t.letters.slice()),
    });
  }),
);

const POST_TITLES = Object.freeze([
  { minDeliveries: 100, name: "信使网络站长" },
  { minDeliveries: 40, name: "王牌信使" },
  { minDeliveries: 10, name: "草甸邮差" },
  { minDeliveries: 0, name: "见习邮差" },
]);

export function getPostRouteDef(routeId) {
  return POST_ROUTES.find((r) => r.id === routeId) || null;
}

export function getPostTitle(totalDeliveries = 0) {
  const n = Math.max(0, Math.floor(Number(totalDeliveries) || 0));
  return (POST_TITLES.find((t) => n >= t.minDeliveries) || POST_TITLES[POST_TITLES.length - 1]).name;
}

export function getPostmarkTier(deliveries) {
  const n = Math.max(0, Math.floor(Number(deliveries) || 0));
  let tier = 0;
  for (const t of POSTMARK_TIERS) if (n >= t.minDeliveries) tier = t.tier;
  return tier;
}

export function getPostmarkTierName(tier) {
  return POSTMARK_TIERS.find((t) => t.tier === tier)?.name || "未盖戳";
}

/** The route path drawn on the network map: 萌灵邮局 → regions 0..k. */
export function getPostRoutePath(routeId) {
  const def = getPostRouteDef(routeId);
  if (!def) return [];
  return POST_ROUTES.slice(0, def.idx + 1).map((r) => r.name);
}

function postCaughtUnique(state) {
  const caught = state?.dex?.caught;
  if (!caught || typeof caught !== "object") return 0;
  let n = 0;
  for (const v of Object.values(caught)) if (typeof v === "number" && v > 0) n += 1;
  return n;
}

/** A route opens together with its capture region (same 图鉴收录 threshold). */
export function isPostRouteUnlocked(state, routeId) {
  const def = getPostRouteDef(routeId);
  if (!def) return false;
  return postCaughtUnique(state) >= def.unlockReq;
}

function normalizePostTrip(raw, aliveSet) {
  if (!raw || typeof raw !== "object") return null;
  const route = getPostRouteDef(raw.routeId);
  if (!route) return null;
  const monId = Math.floor(Number(raw.monId) || 0);
  if (monId <= 0 || (aliveSet && !aliveSet.has(monId))) return null;
  const tripSec = Math.max(60, Math.min(6 * 3600, Math.round(Number(raw.tripSec) || route.tripSec)));
  const el = Number(raw.elapsedSec);
  return {
    routeId: route.id,
    monId,
    tripSec,
    elapsedSec: Number.isFinite(el) && el > 0 ? Math.min(tripSec, el) : 0,
    homeTown: Boolean(raw.homeTown),
    swift: Boolean(raw.swift),
    startedAt: typeof raw.startedAt === "number" && Number.isFinite(raw.startedAt) ? raw.startedAt : 0,
  };
}

export function ensurePostOfficeState(state) {
  if (!state || typeof state !== "object") return null;
  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  const fresh = !(state.meta.postOffice && typeof state.meta.postOffice === "object");
  const raw = fresh ? {} : state.meta.postOffice;
  const monList = Array.isArray(state?.mons?.list) ? state.mons.list : null;
  const aliveSet = monList
    ? new Set(
        monList
          .map((m) => (m && typeof m.id === "number" && Number.isFinite(m.id) ? Math.floor(m.id) : null))
          .filter((x) => x !== null && x > 0),
      )
    : null;
  const trips = [];
  const seenRoute = new Set();
  const seenMon = new Set();
  for (const t of Array.isArray(raw.trips) ? raw.trips : []) {
    const n = normalizePostTrip(t, aliveSet);
    if (!n || seenRoute.has(n.routeId) || seenMon.has(n.monId)) continue;
    seenRoute.add(n.routeId);
    seenMon.add(n.monId);
    trips.push(n);
    if (trips.length >= POST_MAX_MESSENGERS) break;
  }
  const postmarks = {};
  const rawPm = raw.postmarks && typeof raw.postmarks === "object" ? raw.postmarks : {};
  for (const r of POST_ROUTES) {
    const n = Math.max(0, Math.min(99999, Math.floor(Number(rawPm[r.id]) || 0)));
    if (n > 0) postmarks[r.id] = n;
  }
  const lr = raw.lastReply && typeof raw.lastReply === "object" ? raw.lastReply : null;
  const lrRoute = lr ? getPostRouteDef(lr.routeId) : null;
  const lastReply = lrRoute
    ? {
        routeId: lrRoute.id,
        regionName: lrRoute.name,
        monName: typeof lr.monName === "string" ? lr.monName.slice(0, 24) : "",
        text: typeof lr.text === "string" ? lr.text.slice(0, 120) : "",
        rewards: (() => {
          const out = {};
          const src = lr.rewards && typeof lr.rewards === "object" ? lr.rewards : {};
          for (const [rid, v] of Object.entries(src)) {
            const n = Math.max(0, Math.min(99999, Math.floor(Number(v) || 0)));
            if (POST_RES_ZH[rid] && n > 0) out[rid] = n;
          }
          return out;
        })(),
        homeTown: Boolean(lr.homeTown),
        newTier: Math.max(0, Math.min(POSTMARK_MAX_TIER, Math.floor(Number(lr.newTier) || 0))),
        at: typeof lr.at === "number" && Number.isFinite(lr.at) ? lr.at : 0,
      }
    : null;
  const recentLogs = Array.isArray(raw.recentLogs)
    ? raw.recentLogs.filter((s) => typeof s === "string" && s.trim().length > 0).slice(0, POST_LOG_KEEP)
    : [];
  const carry = Number(raw.letterCarrySec);
  const letters = fresh ? POST_START_LETTERS : Math.max(0, Math.min(POST_LETTER_CAP, Math.floor(Number(raw.letters) || 0)));
  const clean = {
    initialized: true,
    letters,
    letterCarrySec: letters < POST_LETTER_CAP && Number.isFinite(carry) && carry > 0 ? Math.min(POST_LETTER_REFILL_SEC - 0.001, carry) : 0,
    trips,
    postmarks,
    expressDate: typeof raw.expressDate === "string" ? raw.expressDate : "",
    expressUsed: Math.max(0, Math.floor(Number(raw.expressUsed) || 0)),
    totalDeliveries: Math.max(0, Math.floor(Number(raw.totalDeliveries) || 0)),
    totalHomeTown: Math.max(0, Math.floor(Number(raw.totalHomeTown) || 0)),
    totalGifts: Math.max(0, Math.floor(Number(raw.totalGifts) || 0)),
    lastReply,
    recentLogs,
  };
  if (!fresh) {
    Object.assign(state.meta.postOffice, clean);
    return state.meta.postOffice;
  }
  state.meta.postOffice = clean;
  return clean;
}

function postPushLog(po, line) {
  po.recentLogs = [line, ...(po.recentLogs || [])].slice(0, POST_LOG_KEEP);
}

/** Idle partners that may carry a letter (same exclusions as the dock / observatory / island / voyage / hot spring). */
export function getIdlePostMessengerCandidates(state) {
  const list = Array.isArray(state?.mons?.list) ? state.mons.list.filter(Boolean) : [];
  const extBusy = getNonSandboxBusyIds(state);
  const ecoBusy = getEcoSandboxBusyIds(state);
  return list.filter((m) => m && typeof m.id === "number" && !extBusy.has(m.id) && !ecoBusy.has(m.id));
}

function postHomeZoneOf(mon, opts = {}) {
  const z = typeof opts.getZone === "function" ? opts.getZone(mon) : beastZone(mon?.dex);
  if (typeof z === "string") return ZONE_IDS.includes(z) ? z : null;
  const idx = Math.floor(Number(z));
  return Number.isFinite(idx) && idx >= 0 && idx < ZONE_IDS.length ? ZONE_IDS[idx] : null;
}

/**
 * Messenger preview for a route: 疾行信使 (wind / electric) ×0.8 trip time, level ×(1 − min(0.2, Lv / 500)), floor 50%;
 * 同乡信使 (the partner's home capture region is the destination) ×1.5 coin + specialty, +15% gift chance, +2 affection.
 */
export function evaluatePostMessenger(mon, routeId, opts = {}) {
  const route = getPostRouteDef(routeId);
  if (!mon || !route) return null;
  const types = acrobatTypesOf(mon, opts);
  const swift = types.some((t) => POST_SWIFT_TYPES.includes(t));
  const homeZone = postHomeZoneOf(mon, opts);
  const homeTown = homeZone === route.id;
  const lvl = Math.max(1, Math.min(100, Math.floor(Number(mon.lvl) || 1)));
  const speedMul = Math.max(0.5, (swift ? POST_SWIFT_MUL : 1) * (1 - Math.min(0.2, lvl / 500)));
  return {
    routeId: route.id,
    swift,
    homeTown,
    homeZone,
    speedMul: Math.round(speedMul * 1000) / 1000,
    tripSec: Math.max(60, Math.round(route.tripSec * speedMul)),
    rewardMul: homeTown ? POST_HOMETOWN_MUL : 1,
    giftChance: Math.min(0.6, Math.round((route.giftChance + (homeTown ? 0.15 : 0)) * 1000) / 1000),
    expGain: route.expGain,
    affGain: homeTown ? 4 : 2,
  };
}

function scoreMonForPostRoute(mon, routeId, opts = {}) {
  const ev = evaluatePostMessenger(mon, routeId, opts);
  if (!ev) return -1;
  return (ev.homeTown ? 1000 : 0) + (ev.swift ? 300 : 0) + Math.max(1, Math.floor(Number(mon.lvl) || 1)) * 2;
}

/** Best idle messenger for a route (同乡 first, then 疾行, then level). */
export function pickPostMessengerFor(state, routeId, opts = {}) {
  const idle = getIdlePostMessengerCandidates(state);
  return (
    idle
      .slice()
      .sort((a, b) => scoreMonForPostRoute(b, routeId, opts) - scoreMonForPostRoute(a, routeId, opts) || (a.id || 0) - (b.id || 0))[0] || null
  );
}

/** Sends one idle partner with one letter along a route (one messenger per route, at most 3 out at once). */
export function dispatchPostMessenger(state, routeId, monId, opts = {}) {
  const po = ensurePostOfficeState(state);
  if (!po) return { ok: false, reason: "invalid_state" };
  const route = getPostRouteDef(routeId);
  if (!route) return { ok: false, reason: "unknown_route" };
  if (!isPostRouteUnlocked(state, route.id)) return { ok: false, reason: "locked", needDex: route.unlockReq };
  if (po.trips.some((t) => t.routeId === route.id)) return { ok: false, reason: "route_busy" };
  if (po.trips.length >= POST_MAX_MESSENGERS) return { ok: false, reason: "bags_full" };
  if (po.letters < 1) return { ok: false, reason: "no_letters" };
  const id = Math.floor(Number(monId) || 0);
  const mon = getIdlePostMessengerCandidates(state).find((m) => m.id === id);
  if (!mon) return { ok: false, reason: "mon_busy" };
  const ev = evaluatePostMessenger(mon, route.id, opts);
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  po.letters -= 1;
  po.trips = [...po.trips, { routeId: route.id, monId: mon.id, tripSec: ev.tripSec, elapsedSec: 0, homeTown: ev.homeTown, swift: ev.swift, startedAt: nowMs }];
  const logLine = `【寄出信件】${mon.name || "伙伴"} 背上信使包沿「${route.name}」邮路出发（往返约 ${Math.max(1, Math.round(ev.tripSec / 60))} 分钟${ev.homeTown ? " · 同乡信使" : ""}${ev.swift ? " · 疾行" : ""}，送信期间防放生保护生效）`;
  postPushLog(po, logLine);
  return { ok: true, routeId: route.id, monId: mon.id, tripSec: ev.tripSec, homeTown: ev.homeTown, swift: ev.swift, logLine };
}

/** 「一键派信」: fills free messenger bags — routes with the fewest deliveries first (farther first on ties), best messenger each. */
export function autoDispatchPostMessengers(state, opts = {}) {
  const po = ensurePostOfficeState(state);
  if (!po) return { ok: false, dispatched: [] };
  const dispatched = [];
  const routes = POST_ROUTES.filter((r) => isPostRouteUnlocked(state, r.id))
    .slice()
    .sort((a, b) => (po.postmarks[a.id] || 0) - (po.postmarks[b.id] || 0) || b.idx - a.idx);
  for (const r of routes) {
    if (po.letters < 1 || po.trips.length >= POST_MAX_MESSENGERS) break;
    if (po.trips.some((t) => t.routeId === r.id)) continue;
    const mon = pickPostMessengerFor(state, r.id, opts);
    if (!mon) break;
    const res = dispatchPostMessenger(state, r.id, mon.id, opts);
    if (res.ok) dispatched.push(res);
  }
  const reason = dispatched.length ? "" : po.letters < 1 ? "no_letters" : po.trips.length >= POST_MAX_MESSENGERS ? "bags_full" : "no_idle_mons";
  return { ok: dispatched.length > 0, reason, dispatched };
}

/** Live tick + offline catch-up (≤12h): the mailbox refills (1 letter / 20 min, cap 6) and messengers walk their routes. */
export function advancePostOffice(state, dtSec) {
  const po = state?.meta?.postOffice;
  const empty = { arrived: [], lettersAdded: 0 };
  if (!po || typeof po !== "object" || !Array.isArray(po.trips)) return empty;
  const step = typeof dtSec === "number" && Number.isFinite(dtSec) && dtSec > 0 ? Math.min(POST_MAX_CATCHUP_SEC, dtSec) : 0;
  if (step <= 0) return empty;
  let lettersAdded = 0;
  const letters0 = Math.max(0, Math.floor(Number(po.letters) || 0));
  if (letters0 < POST_LETTER_CAP) {
    let carry = Math.max(0, Number(po.letterCarrySec) || 0) + step;
    let letters = letters0;
    while (carry >= POST_LETTER_REFILL_SEC && letters < POST_LETTER_CAP) {
      carry -= POST_LETTER_REFILL_SEC;
      letters += 1;
      lettersAdded += 1;
    }
    po.letters = letters;
    po.letterCarrySec = letters >= POST_LETTER_CAP ? 0 : carry;
  } else {
    po.letterCarrySec = 0;
  }
  const arrived = [];
  const list = Array.isArray(state.mons?.list) ? state.mons.list : [];
  for (const t of po.trips) {
    const need = Math.max(60, Number(t.tripSec) || 600);
    const before = Math.max(0, Number(t.elapsedSec) || 0);
    if (before >= need) continue;
    t.elapsedSec = Math.min(need, before + step);
    if (t.elapsedSec >= need) {
      const route = getPostRouteDef(t.routeId);
      const mon = list.find((m) => m && m.id === t.monId);
      arrived.push({ routeId: t.routeId, regionName: route?.name || "", monName: mon?.name || "信使" });
    }
  }
  if (arrived.length) {
    postPushLog(po, `【信使返回】${arrived.map((a) => `${a.monName}（${a.regionName}）`).join("、")} 带着回信回到了邮局，快去拆信吧`);
  }
  return { arrived, lettersAdded };
}

export function isPostTripArrived(trip) {
  return Boolean(trip) && Math.max(0, Number(trip.elapsedSec) || 0) >= Math.max(60, Number(trip.tripSec) || 600);
}

/** Reply letter text for a route — rotates through the region's letters by delivery count. */
export function getPostReplyLetter(routeId, n = 0) {
  const route = getPostRouteDef(routeId);
  if (!route) return "";
  const k = Math.max(0, Math.floor(Number(n) || 0));
  return route.letters[k % route.letters.length];
}

/** Recalls an en-route messenger (letter goes back into the mailbox). Returned messengers are claimed instead. */
export function recallPostMessenger(state, routeId) {
  const po = ensurePostOfficeState(state);
  if (!po) return { ok: false, reason: "invalid_state" };
  const trip = po.trips.find((t) => t.routeId === routeId);
  if (!trip) return { ok: false, reason: "no_trip" };
  if (isPostTripArrived(trip)) return { ok: false, reason: "already_back" };
  po.trips = po.trips.filter((t) => t !== trip);
  po.letters = Math.min(POST_LETTER_CAP, po.letters + 1);
  const route = getPostRouteDef(routeId);
  const mon = (state.mons?.list || []).find((m) => m && m.id === trip.monId);
  const logLine = `【召回信使】${mon?.name || "信使"} 半路折返「${route?.name || ""}」邮路，信件放回了邮筒`;
  postPushLog(po, logLine);
  return { ok: true, monId: trip.monId, logLine };
}

/**
 * Opens a returned messenger's reply: futurecoin + the region's specialty (×1.5 for a 同乡信使) and, with the route's gift chance
 * (injectable opts.randFloat), the region's small gift; messenger exp / affection; stamps the region's postmark.
 */
export function claimPostTrip(state, routeId, opts = {}) {
  const po = ensurePostOfficeState(state);
  if (!po) return { ok: false, reason: "invalid_state" };
  const trip = po.trips.find((t) => t.routeId === routeId);
  if (!trip) return { ok: false, reason: "no_trip" };
  if (!isPostTripArrived(trip)) return { ok: false, reason: "not_arrived" };
  const route = getPostRouteDef(routeId);
  const list = Array.isArray(state.mons?.list) ? state.mons.list : [];
  const mon = list.find((m) => m && m.id === trip.monId) || null;
  const mul = trip.homeTown ? POST_HOMETOWN_MUL : 1;
  const rewards = {
    futurecoin: Math.round(route.coin * mul),
    [route.specialty.rid]: Math.round(route.specialty.n * mul),
  };
  const giftChance = Math.min(0.6, route.giftChance + (trip.homeTown ? 0.15 : 0));
  const rng = typeof opts.randFloat === "function" ? opts.randFloat : Math.random;
  const gotGift = (Number(rng()) || 0) < giftChance;
  if (gotGift) rewards[route.gift.rid] = (rewards[route.gift.rid] || 0) + route.gift.n;
  applyRewardGrant(state, rewards, { addRes: opts.addRes, addExpToMon: opts.addExpToMon, squadMons: [] });
  const affGain = trip.homeTown ? 4 : 2;
  if (mon) {
    if (typeof opts.addExpToMon === "function") opts.addExpToMon(mon, route.expGain);
    else mon.exp = Math.max(0, Math.floor((Number(mon.exp) || 0) + route.expGain));
    const aff0 = typeof mon.affection === "number" && Number.isFinite(mon.affection) ? mon.affection : 0;
    mon.affection = Math.min(100, Math.max(0, aff0 + affGain));
  }
  const prevCount = po.postmarks[route.id] || 0;
  const prevTier = getPostmarkTier(prevCount);
  po.postmarks[route.id] = prevCount + 1;
  const tier = getPostmarkTier(prevCount + 1);
  const newTier = tier > prevTier ? tier : 0;
  po.totalDeliveries = (po.totalDeliveries || 0) + 1;
  if (trip.homeTown) po.totalHomeTown = (po.totalHomeTown || 0) + 1;
  if (gotGift) po.totalGifts = (po.totalGifts || 0) + 1;
  po.trips = po.trips.filter((t) => t !== trip);
  const text = getPostReplyLetter(route.id, prevCount);
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  po.lastReply = {
    routeId: route.id,
    regionName: route.name,
    monName: String(mon?.name || "信使").slice(0, 24),
    text,
    rewards: { ...rewards },
    homeTown: Boolean(trip.homeTown),
    newTier,
    at: nowMs,
  };
  const rewardTxt = Object.entries(rewards)
    .map(([rid, n]) => `${POST_RES_ZH[rid] || rid} +${n}`)
    .join("、");
  const logLine = `【拆开回信】「${route.name}」${trip.homeTown ? "同乡" : ""}回信：${rewardTxt}${gotGift ? "（附赠小礼物）" : ""}${newTier ? ` · ${route.postmarkName}升为${getPostmarkTierName(newTier)}` : ""}`;
  postPushLog(po, logLine);
  return { ok: true, routeId: route.id, monId: trip.monId, rewards, gotGift, homeTown: Boolean(trip.homeTown), expGain: route.expGain, affGain, postmarkTier: tier, newTier, text, logLine };
}

/** 「一键拆信」: opens every returned messenger's reply. */
export function claimAllPostTrips(state, opts = {}) {
  const po = ensurePostOfficeState(state);
  if (!po) return { ok: false, claimed: [] };
  const claimed = [];
  for (const t of po.trips.slice()) {
    if (!isPostTripArrived(t)) continue;
    const res = claimPostTrip(state, t.routeId, opts);
    if (res.ok) claimed.push(res);
  }
  const totals = {};
  for (const c of claimed) for (const [rid, n] of Object.entries(c.rewards)) totals[rid] = (totals[rid] || 0) + n;
  return { ok: claimed.length > 0, claimed, totals };
}

export function getPostExpressFreeLeft(state, nowMs = Date.now()) {
  const po = state?.meta?.postOffice;
  if (!po || typeof po !== "object") return POST_EXPRESS_FREE_PER_DAY;
  if (po.expressDate !== ecoTriLocalYmd(nowMs)) return POST_EXPRESS_FREE_PER_DAY;
  return Math.max(0, POST_EXPRESS_FREE_PER_DAY - Math.floor(Number(po.expressUsed) || 0));
}

/** 「信使加急」: every messenger still on the road arrives back at once. Free once per local day, then futurecoin ×20. */
export function performPostExpress(state, opts = {}) {
  const po = ensurePostOfficeState(state);
  if (!po) return { ok: false, reason: "invalid_state" };
  const enRoute = po.trips.filter((t) => !isPostTripArrived(t));
  if (!enRoute.length) return { ok: false, reason: "no_en_route" };
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const today = ecoTriLocalYmd(nowMs);
  if (po.expressDate !== today) {
    po.expressDate = today;
    po.expressUsed = 0;
  }
  let costKind = "";
  if (po.expressUsed < POST_EXPRESS_FREE_PER_DAY) {
    po.expressUsed += 1;
    costKind = "free_daily";
  } else if ((Number(state.res?.futurecoin?.value) || 0) >= POST_EXPRESS_COIN_COST) {
    state.res.futurecoin.value = Math.max(0, Math.floor(state.res.futurecoin.value) - POST_EXPRESS_COIN_COST);
    costKind = "futurecoin";
  } else {
    return { ok: false, reason: "insufficient_express_cost" };
  }
  for (const t of enRoute) t.elapsedSec = t.tripSec;
  const logLine = `【信使加急】${enRoute.length} 位信使搭上顺风快车，带着回信回到了邮局`;
  postPushLog(po, logLine);
  return { ok: true, costKind, count: enRoute.length, routes: enRoute.map((t) => t.routeId), logLine };
}

/** Forced release / star-up material: cancels the partner's delivery (an unfinished trip returns its letter). */
export function detachPostMessenger(state, monId) {
  const po = state?.meta?.postOffice;
  const id = Math.floor(Number(monId) || 0);
  if (!po || typeof po !== "object" || !Array.isArray(po.trips) || id <= 0) return { ok: false, detached: false };
  const trip = po.trips.find((t) => t && Math.floor(Number(t.monId) || 0) === id);
  if (!trip) return { ok: true, detached: false };
  po.trips = po.trips.filter((t) => t !== trip);
  if (!isPostTripArrived(trip)) po.letters = Math.min(POST_LETTER_CAP, Math.max(0, Math.floor(Number(po.letters) || 0)) + 1);
  return { ok: true, detached: true };
}

/** Rebirth: every messenger is recalled and its letter goes back to the mailbox; postmarks and delivery records are permanent. */
export function recallPostOfficeForRebirth(state) {
  const po = state?.meta?.postOffice;
  if (!po || typeof po !== "object" || !Array.isArray(po.trips)) return { ok: false, recalled: 0 };
  const recalled = po.trips.length;
  po.letters = Math.min(POST_LETTER_CAP, Math.max(0, Math.floor(Number(po.letters) || 0)) + recalled);
  po.trips = [];
  return { ok: true, recalled };
}

/**
 * Pure non-mutating aggregator of the postmark album (wired into production / effects):
 * each postmark tier point (铜 1 / 银 2 / 金 3, max 27) 全产 +0.15% · 捕获 +0.04%; all 9 regions stamped 「信使网络全通」全产 +2%.
 */
export function computePostOfficeBonus(state) {
  const raw = state?.meta?.postOffice;
  const pm = raw && typeof raw === "object" && raw.postmarks && typeof raw.postmarks === "object" ? raw.postmarks : {};
  let tierPoints = 0;
  let collected = 0;
  let goldCount = 0;
  for (const r of POST_ROUTES) {
    const tier = getPostmarkTier(pm[r.id]);
    tierPoints += tier;
    if (tier >= 1) collected += 1;
    if (tier >= POSTMARK_MAX_TIER) goldCount += 1;
  }
  const fullNetwork = collected >= POST_ROUTES.length;
  const round4 = (n) => Math.round(n * 10000) / 10000;
  const prodAdd = round4(tierPoints * 0.0015 + (fullNetwork ? 0.02 : 0));
  const catchAdd = round4(tierPoints * 0.0004);
  const totalDeliveries = raw && typeof raw === "object" ? Math.max(0, Math.floor(Number(raw.totalDeliveries) || 0)) : 0;
  return {
    tierPoints,
    maxPoints: POST_ROUTES.length * POSTMARK_MAX_TIER,
    collected,
    totalRegions: POST_ROUTES.length,
    goldCount,
    fullNetwork,
    totalDeliveries,
    title: getPostTitle(totalDeliveries),
    letters: raw && typeof raw === "object" ? Math.max(0, Math.floor(Number(raw.letters) || 0)) : 0,
    messengersOut: raw && typeof raw === "object" && Array.isArray(raw.trips) ? raw.trips.length : 0,
    prodAdd,
    prodMul: round4(1 + prodAdd),
    catchAdd,
  };
}

// ============================================================================
// ML-14 「溪畔钓鱼会」(Creekside Fishing Club)
// 溪流分 4 段，按本地时间每 6 小时轮换一次开放溪段（每天错开一段），每段 4 种鱼（2 常见 / 1 稀有 / 1 溪王），共 16 种。
// 最多 3 位钓手：每 15 分钟所有钓手各抛一竿，咬钩率 60%，属性与溪段契合 +20%、等级最多 +10%（上限 95%）；
// 钓手属性与鱼种属性相同时该鱼权重 ×2.5，溪段契合的钓手钓到溪王的权重 ×1.6 ——「按属性挑选钓手」。
// 钓获先放进鱼篓（最多 24 条，满了钓手就只能干等），同时登记进「钓获图鉴」（次数 + 最大尺寸）；收鱼篓时按稀有度结算奖励，
// 钓手每条鱼经验 +40、亲密 +1。图鉴登记 4 / 8 / 12 / 16 种分别升为铜 / 银 / 金 / 彩虹鱼杯（钓鱼会奖杯）。
// 光环：每种已登记鱼 全产 +0.2%；奖杯每级 捕获 +0.25%、PvE +1%；每种溪王 闪光 +2.5%。每日一次免费「撒窝打饵」（之后 20 未来币）。
// 钓手经由统一登记表接入 busyMonIds 防放生锁；离线补算 ≤12h（每一竿按当时的溪段结算）；强制放生 / 转生收竿，图鉴与奖杯永久保留。
// ============================================================================

export const FISHING_ANGLER_MAX = FISHING_MAX_ANGLERS;
export const FISHING_CAST_SEC = 900;
export const FISHING_CREEL_CAP = 24;
export const FISHING_SECTION_HOURS = 6;
export const FISHING_MAX_CATCHUP_SEC = 12 * 3600;
export const FISHING_BASE_BITE = 0.6;
export const FISHING_SECTION_BITE_ADD = 0.2;
export const FISHING_MATCH_WEIGHT_MUL = 2.5;
export const FISHING_LEGEND_SECTION_MUL = 1.6;
export const FISHING_CHUM_FREE_PER_DAY = 1;
export const FISHING_CHUM_COIN_COST = 20;
export const FISHING_LOG_KEEP = 6;
export const FISHING_EXP_PER_FISH = 40;

export const FISHING_SECTIONS = Object.freeze([
  { id: "willowBay", name: "柳荫浅湾", elements: Object.freeze(["water", "grass"]), desc: "垂柳把影子铺在水面上，水流最温柔的一段。" },
  { id: "pebbleRapids", name: "卵石急滩", elements: Object.freeze(["stone", "electric"]), desc: "卵石滩上水花噼啪作响，偶尔蹿起一小串电火花。" },
  { id: "mapleFalls", name: "枫红瀑潭", elements: Object.freeze(["fire", "wind"]), desc: "红枫叶顺着瀑布落进深潭，风一吹水面就起涟漪。" },
  { id: "fireflyPool", name: "萤火回水潭", elements: Object.freeze(["light", "dark", "mystic"]), desc: "回水湾一到傍晚就浮起萤光，传说有只在梦里见过的鱼。" },
]);

export const FISHING_RARITY = Object.freeze({
  common: Object.freeze({ id: "common", name: "常见", weight: 40, rewards: Object.freeze({ catnip: 40 }) }),
  rare: Object.freeze({ id: "rare", name: "稀有", weight: 14, rewards: Object.freeze({ futurecoin: 4, minerals: 30 }) }),
  legend: Object.freeze({ id: "legend", name: "溪王", weight: 3, rewards: Object.freeze({ futurecoin: 15, shinyStarSand: 1 }) }),
});

export const FISHING_FISH_DEFS = Object.freeze(
  [
    { id: "willowMinnow", name: "柳叶小银鱼", sectionId: "willowBay", element: "water", rarity: "common", size: [6, 14] },
    { id: "mossDace", name: "青苔斑点鱼", sectionId: "willowBay", element: "grass", rarity: "common", size: [10, 22] },
    { id: "bubbleFin", name: "泡泡圆鳍鱼", sectionId: "willowBay", element: "water", rarity: "rare", size: [18, 32] },
    { id: "jadeWhisker", name: "翡翠须溪王", sectionId: "willowBay", element: "grass", rarity: "legend", size: [60, 110] },
    { id: "pebbleGoby", name: "卵石小虎鱼", sectionId: "pebbleRapids", element: "stone", rarity: "common", size: [5, 12] },
    { id: "sparkLoach", name: "跳跳电光鳅", sectionId: "pebbleRapids", element: "electric", rarity: "common", size: [8, 18] },
    { id: "armorSturgeon", name: "铠甲岩鲟", sectionId: "pebbleRapids", element: "stone", rarity: "rare", size: [40, 75] },
    { id: "thunderScale", name: "雷鸣金鳞王", sectionId: "pebbleRapids", element: "electric", rarity: "legend", size: [55, 100] },
    { id: "mapleBream", name: "枫红小鲷", sectionId: "mapleFalls", element: "fire", rarity: "common", size: [10, 20] },
    { id: "spraySwallow", name: "飞沫燕尾鱼", sectionId: "mapleFalls", element: "wind", rarity: "common", size: [9, 19] },
    { id: "emberKoi", name: "焰尾锦鲤", sectionId: "mapleFalls", element: "fire", rarity: "rare", size: [30, 55] },
    { id: "galeFin", name: "瀑神飞鳍", sectionId: "mapleFalls", element: "wind", rarity: "legend", size: [70, 130] },
    { id: "glowLantern", name: "萤光提灯鱼", sectionId: "fireflyPool", element: "light", rarity: "common", size: [7, 15] },
    { id: "shadowEel", name: "影纹夜鳗", sectionId: "fireflyPool", element: "dark", rarity: "common", size: [25, 48] },
    { id: "starsandFin", name: "星砂幻鳍鱼", sectionId: "fireflyPool", element: "mystic", rarity: "rare", size: [20, 38] },
    { id: "moonDreamWhale", name: "月影梦鲸", sectionId: "fireflyPool", element: "mystic", rarity: "legend", size: [90, 160] },
  ].map((f) => Object.freeze({ ...f, size: Object.freeze(f.size.slice()) })),
);

export const FISHING_TROPHY_TIERS = Object.freeze([
  { tier: 1, name: "铜鱼杯", minSpecies: 4 },
  { tier: 2, name: "银鱼杯", minSpecies: 8 },
  { tier: 3, name: "金鱼杯", minSpecies: 12 },
  { tier: 4, name: "彩虹鱼杯", minSpecies: 16 },
]);
export const FISHING_TROPHY_MAX_TIER = FISHING_TROPHY_TIERS.length;

export const FISHING_RES_ZH = Object.freeze({
  futurecoin: "未来币",
  catnip: "灵果",
  minerals: "灵晶碎片",
  shinyStarSand: "闪光祈愿星砂",
});

const FISHING_TITLES = Object.freeze([
  { minCaught: 150, name: "钓鱼会会长" },
  { minCaught: 50, name: "溪段老手" },
  { minCaught: 10, name: "钓鱼会会员" },
  { minCaught: 0, name: "溪边新手" },
]);

export function getFishingSectionDef(sectionId) {
  return FISHING_SECTIONS.find((s) => s.id === sectionId) || null;
}

export function getFishingFishDef(fishId) {
  return FISHING_FISH_DEFS.find((f) => f.id === fishId) || null;
}

export function getFishingSectionFish(sectionId) {
  return FISHING_FISH_DEFS.filter((f) => f.sectionId === sectionId);
}

export function getFishingTitle(totalCaught = 0) {
  const n = Math.max(0, Math.floor(Number(totalCaught) || 0));
  return (FISHING_TITLES.find((t) => n >= t.minCaught) || FISHING_TITLES[FISHING_TITLES.length - 1]).name;
}

export function getFishingTrophyTier(speciesCount = 0) {
  const n = Math.max(0, Math.floor(Number(speciesCount) || 0));
  let tier = 0;
  for (const t of FISHING_TROPHY_TIERS) if (n >= t.minSpecies) tier = t.tier;
  return tier;
}

export function getFishingTrophyName(tier) {
  return FISHING_TROPHY_TIERS.find((t) => t.tier === tier)?.name || "未获奖杯";
}

/** Open creek section — rotates every 6 local hours, shifted by one section per day so every section gets every time slot. */
export function getFishingSection(nowMs = Date.now()) {
  const d = new Date(nowMs);
  const dayIdx = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  const block = Math.max(0, Math.min(3, Math.floor(d.getHours() / FISHING_SECTION_HOURS)));
  const n = FISHING_SECTIONS.length;
  const idx = (((dayIdx + block) % n) + n) % n;
  const nextAt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), (block + 1) * FISHING_SECTION_HOURS).getTime();
  return {
    ...FISHING_SECTIONS[idx],
    index: idx,
    msUntilNext: Math.max(0, nextAt - nowMs),
    next: FISHING_SECTIONS[(idx + 1) % n],
  };
}

function normalizeFishingCatch(raw) {
  if (!raw || typeof raw !== "object") return null;
  const fish = getFishingFishDef(raw.fishId);
  if (!fish) return null;
  const size = Number(raw.size);
  return {
    fishId: fish.id,
    size: Number.isFinite(size) ? Math.max(fish.size[0], Math.min(fish.size[1], Math.round(size * 10) / 10)) : fish.size[0],
    monId: Math.max(0, Math.floor(Number(raw.monId) || 0)),
    sectionId: fish.sectionId,
  };
}

export function ensureFishingClubState(state) {
  if (!state || typeof state !== "object") return null;
  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  const raw = state.meta.fishingClub && typeof state.meta.fishingClub === "object" ? state.meta.fishingClub : {};
  const monList = Array.isArray(state?.mons?.list) ? state.mons.list : null;
  const aliveSet = monList
    ? new Set(
        monList
          .map((m) => (m && typeof m.id === "number" && Number.isFinite(m.id) ? Math.floor(m.id) : null))
          .filter((x) => x !== null && x > 0),
      )
    : null;
  const anglerIds = [];
  for (const v of Array.isArray(raw.anglerIds) ? raw.anglerIds : []) {
    const id = Math.floor(Number(v) || 0);
    if (id <= 0 || anglerIds.includes(id) || (aliveSet && !aliveSet.has(id))) continue;
    anglerIds.push(id);
    if (anglerIds.length >= FISHING_ANGLER_MAX) break;
  }
  const creel = (Array.isArray(raw.creel) ? raw.creel : []).map(normalizeFishingCatch).filter(Boolean).slice(0, FISHING_CREEL_CAP);
  const rawDex = raw.dex && typeof raw.dex === "object" ? raw.dex : {};
  const dex = {};
  for (const f of FISHING_FISH_DEFS) {
    const e = rawDex[f.id];
    if (!e || typeof e !== "object") continue;
    const count = Math.max(0, Math.min(999999, Math.floor(Number(e.count) || 0)));
    if (count <= 0) continue;
    const best = Number(e.best);
    dex[f.id] = { count, best: Number.isFinite(best) ? Math.max(f.size[0], Math.min(f.size[1], Math.round(best * 10) / 10)) : f.size[0] };
  }
  const carry = Number(raw.castCarrySec);
  const lh = raw.lastHaul && typeof raw.lastHaul === "object" ? raw.lastHaul : null;
  const lastHaul = lh
    ? {
        count: Math.max(0, Math.min(FISHING_CREEL_CAP, Math.floor(Number(lh.count) || 0))),
        rewards: (() => {
          const out = {};
          const src = lh.rewards && typeof lh.rewards === "object" ? lh.rewards : {};
          for (const [rid, v] of Object.entries(src)) {
            const n = Math.max(0, Math.min(99999, Math.floor(Number(v) || 0)));
            if (FISHING_RES_ZH[rid] && n > 0) out[rid] = n;
          }
          return out;
        })(),
        bestFishId: getFishingFishDef(lh.bestFishId)?.id || "",
        bestSize: Math.max(0, Number(lh.bestSize) || 0),
        at: typeof lh.at === "number" && Number.isFinite(lh.at) ? lh.at : 0,
      }
    : null;
  const recentLogs = Array.isArray(raw.recentLogs)
    ? raw.recentLogs.filter((s) => typeof s === "string" && s.trim().length > 0).slice(0, FISHING_LOG_KEEP)
    : [];
  const clean = {
    initialized: true,
    anglerIds,
    castCarrySec: anglerIds.length && Number.isFinite(carry) && carry > 0 ? Math.min(FISHING_CAST_SEC - 0.001, carry) : 0,
    creel,
    dex,
    totalCaught: Math.max(0, Math.floor(Number(raw.totalCaught) || 0)),
    totalLegend: Math.max(0, Math.floor(Number(raw.totalLegend) || 0)),
    totalCasts: Math.max(0, Math.floor(Number(raw.totalCasts) || 0)),
    chumDate: typeof raw.chumDate === "string" ? raw.chumDate : "",
    chumUsed: Math.max(0, Math.floor(Number(raw.chumUsed) || 0)),
    lastHaul,
    recentLogs,
  };
  if (state.meta.fishingClub && typeof state.meta.fishingClub === "object") {
    Object.assign(state.meta.fishingClub, clean);
    return state.meta.fishingClub;
  }
  state.meta.fishingClub = clean;
  return clean;
}

function fishingPushLog(fc, line) {
  fc.recentLogs = [line, ...(fc.recentLogs || [])].slice(0, FISHING_LOG_KEEP);
}

/**
 * Angler preview for a section: 溪段契合 (any element of the section) +20% bite and ×1.6 溪王 weight;
 * 擅钓 = the section's fish sharing one of the angler's elements (their weight ×2.5); level adds up to +10% bite.
 */
export function evaluateFishingAngler(mon, sectionRaw, opts = {}) {
  const section = typeof sectionRaw === "string" ? getFishingSectionDef(sectionRaw) : sectionRaw && sectionRaw.id ? getFishingSectionDef(sectionRaw.id) : null;
  if (!mon || !section) return null;
  const types = acrobatTypesOf(mon, opts);
  const sectionMatch = types.some((t) => section.elements.includes(t));
  const favFish = getFishingSectionFish(section.id).filter((f) => types.includes(f.element));
  const lvl = Math.max(1, Math.min(100, Math.floor(Number(mon.lvl) || 1)));
  const biteChance = Math.min(0.95, Math.round((FISHING_BASE_BITE + (sectionMatch ? FISHING_SECTION_BITE_ADD : 0) + Math.min(0.1, lvl / 1000)) * 1000) / 1000);
  return {
    sectionId: section.id,
    types,
    sectionMatch,
    favFishIds: favFish.map((f) => f.id),
    biteChance,
    legendMul: sectionMatch ? FISHING_LEGEND_SECTION_MUL : 1,
  };
}

/** Weighted fish table of a section for one angler (shown in the picker and used by every cast). */
export function getFishingCatchOdds(mon, sectionId, opts = {}, castOpts = {}) {
  const ev = evaluateFishingAngler(mon, sectionId, opts);
  if (!ev) return [];
  const rows = getFishingSectionFish(sectionId).map((f) => {
    let w = FISHING_RARITY[f.rarity].weight;
    if (ev.types.includes(f.element)) w *= FISHING_MATCH_WEIGHT_MUL;
    if (f.rarity === "legend") w *= ev.legendMul;
    if (castOpts.boostRare && f.rarity !== "common") w *= 2;
    return { fishId: f.id, weight: w };
  });
  const total = rows.reduce((s, r) => s + r.weight, 0) || 1;
  return rows.map((r) => ({ ...r, chance: Math.round((r.weight / total) * 1000) / 1000 }));
}

function rollFishingCatch(mon, sectionId, opts, rng, castOpts = {}) {
  const ev = evaluateFishingAngler(mon, sectionId, opts);
  if (!ev) return null;
  if (!castOpts.forceBite && (Number(rng()) || 0) >= ev.biteChance) return null;
  const odds = getFishingCatchOdds(mon, sectionId, opts, castOpts);
  const total = odds.reduce((s, r) => s + r.weight, 0);
  let roll = (Number(rng()) || 0) * total;
  let pick = odds[odds.length - 1];
  for (const r of odds) {
    if (roll < r.weight) {
      pick = r;
      break;
    }
    roll -= r.weight;
  }
  const fish = getFishingFishDef(pick.fishId);
  const size = Math.round((fish.size[0] + (fish.size[1] - fish.size[0]) * Math.max(0, Math.min(1, Number(rng()) || 0))) * 10) / 10;
  return { fishId: fish.id, size, monId: mon.id, sectionId: fish.sectionId };
}

/** Puts a catch in the creel and registers it in the catch dex (count + best size). */
function registerFishingCatch(fc, c) {
  const fish = getFishingFishDef(c.fishId);
  const prev = fc.dex[c.fishId];
  const isNew = !prev || !(prev.count > 0);
  fc.dex[c.fishId] = { count: (prev?.count || 0) + 1, best: Math.max(prev?.best || 0, c.size) };
  fc.creel.push({ fishId: c.fishId, size: c.size, monId: c.monId, sectionId: c.sectionId });
  fc.totalCaught = (fc.totalCaught || 0) + 1;
  if (fish?.rarity === "legend") fc.totalLegend = (fc.totalLegend || 0) + 1;
  return { isNew, record: !isNew && c.size > (prev?.best || 0) };
}

function fishingSpeciesCount(fc) {
  return FISHING_FISH_DEFS.filter((f) => (fc?.dex?.[f.id]?.count || 0) > 0).length;
}

function fishingAnglersOf(state) {
  const ids = getFishingAnglerMonIds(state);
  const list = Array.isArray(state?.mons?.list) ? state.mons.list : [];
  return [...ids].map((id) => list.find((m) => m && m.id === id)).filter(Boolean);
}

/**
 * Live tick + offline catch-up (≤12h): every 15 minutes each angler casts once at the section that was open at that moment
 * (opts.nowMs = end of the step, opts.randFloat injectable). A full creel (24) makes the anglers wait.
 */
export function advanceFishingClub(state, dtSec, opts = {}) {
  const fc = state?.meta?.fishingClub;
  const empty = { casts: 0, caught: [], newSpecies: [], creelFull: false, newTier: 0 };
  if (!fc || typeof fc !== "object" || !Array.isArray(fc.anglerIds) || !Array.isArray(fc.creel) || !fc.dex) return empty;
  const step = typeof dtSec === "number" && Number.isFinite(dtSec) && dtSec > 0 ? Math.min(FISHING_MAX_CATCHUP_SEC, dtSec) : 0;
  if (step <= 0) return empty;
  const anglers = fishingAnglersOf(state);
  if (!anglers.length) {
    fc.castCarrySec = 0;
    return empty;
  }
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const rng = typeof opts.randFloat === "function" ? opts.randFloat : Math.random;
  const tierBefore = getFishingTrophyTier(fishingSpeciesCount(fc));
  const carry0 = Math.max(0, Number(fc.castCarrySec) || 0);
  let t = FISHING_CAST_SEC - carry0;
  let casts = 0;
  let creelFull = false;
  const caught = [];
  const newSpecies = [];
  while (t <= step + 1e-9) {
    const section = getFishingSection(nowMs - (step - t) * 1000);
    for (const mon of anglers) {
      if (fc.creel.length >= FISHING_CREEL_CAP) {
        creelFull = true;
        break;
      }
      fc.totalCasts = (fc.totalCasts || 0) + 1;
      const c = rollFishingCatch(mon, section.id, opts, rng);
      if (!c) continue;
      const reg = registerFishingCatch(fc, c);
      caught.push(c);
      if (reg.isNew) newSpecies.push(c.fishId);
    }
    casts += 1;
    t += FISHING_CAST_SEC;
  }
  fc.castCarrySec = Math.max(0, Math.min(FISHING_CAST_SEC - 0.001, carry0 + step - casts * FISHING_CAST_SEC));
  const tierAfter = getFishingTrophyTier(fishingSpeciesCount(fc));
  if (caught.length) {
    const legend = caught.filter((c) => getFishingFishDef(c.fishId)?.rarity === "legend");
    fishingPushLog(
      fc,
      `【溪畔收获】钓手们钓上 ${caught.length} 条鱼${legend.length ? `，其中有溪王「${getFishingFishDef(legend[0].fishId)?.name}」` : ""}${newSpecies.length ? ` · 图鉴新登记 ${newSpecies.length} 种` : ""}`,
    );
  }
  if (tierAfter > tierBefore) fishingPushLog(fc, `【钓鱼会奖杯】图鉴登记 ${fishingSpeciesCount(fc)} 种，奖杯升为「${getFishingTrophyName(tierAfter)}」`);
  return { casts, caught, newSpecies, creelFull, newTier: tierAfter > tierBefore ? tierAfter : 0 };
}

/** Seats an idle partner on a free fishing spot, or — when it already fishes — reels it in (收竿). */
export function toggleFishingAngler(state, monId, opts = {}) {
  const fc = ensureFishingClubState(state);
  if (!fc) return { ok: false, reason: "invalid_state" };
  const id = Math.floor(Number(monId) || 0);
  if (id <= 0) return { ok: false, reason: "invalid_mon" };
  const list = Array.isArray(state.mons?.list) ? state.mons.list : [];
  if (fc.anglerIds.includes(id)) {
    fc.anglerIds = fc.anglerIds.filter((x) => x !== id);
    if (!fc.anglerIds.length) fc.castCarrySec = 0;
    fishingPushLog(fc, `【收竿】${list.find((m) => m && m.id === id)?.name || "钓手"} 收起钓竿回家了`);
    return { ok: true, fishing: false };
  }
  if (fc.anglerIds.length >= FISHING_ANGLER_MAX) return { ok: false, reason: "spots_full" };
  const mon = getIdleFishingCandidates(state).find((m) => m.id === id);
  if (!mon) return { ok: false, reason: "mon_busy" };
  fc.anglerIds = [...fc.anglerIds, id];
  const section = getFishingSection(typeof opts.nowMs === "number" ? opts.nowMs : Date.now());
  const ev = evaluateFishingAngler(mon, section.id, opts);
  fishingPushLog(fc, `【下竿】${mon.name || "伙伴"} 在「${section.name}」甩出了钓竿${ev?.sectionMatch ? "（溪段契合）" : ""}，垂钓期间防放生保护生效`);
  return { ok: true, fishing: true, sectionMatch: Boolean(ev?.sectionMatch) };
}

function scoreFishingAngler(mon, sectionId, opts) {
  const ev = evaluateFishingAngler(mon, sectionId, opts);
  if (!ev) return -1;
  return (ev.sectionMatch ? 1000 : 0) + ev.favFishIds.length * 120 + Math.max(1, Math.floor(Number(mon.lvl) || 1));
}

/** 「一键选钓手」: fills the free spots — section-matched partners first, then the ones that favor most of the section's fish, then level. */
export function autoPickFishingAnglers(state, opts = {}) {
  const fc = ensureFishingClubState(state);
  if (!fc) return { ok: false, added: [] };
  const section = getFishingSection(typeof opts.nowMs === "number" ? opts.nowMs : Date.now());
  const added = [];
  while (fc.anglerIds.length < FISHING_ANGLER_MAX) {
    const pick = getIdleFishingCandidates(state)
      .slice()
      .sort((a, b) => scoreFishingAngler(b, section.id, opts) - scoreFishingAngler(a, section.id, opts) || (a.id || 0) - (b.id || 0))[0];
    if (!pick) break;
    fc.anglerIds = [...fc.anglerIds, pick.id];
    added.push(pick.id);
  }
  if (added.length) fishingPushLog(fc, `【一键选钓手】${added.length} 位钓手在「${section.name}」下竿（垂钓期间防放生保护生效）`);
  return { ok: added.length > 0, reason: added.length ? "" : fc.anglerIds.length >= FISHING_ANGLER_MAX ? "spots_full" : "no_idle_mons", added, sectionId: section.id };
}

/** 「全部收竿」: every angler reels in (the creel stays). */
export function recallFishingAnglers(state) {
  const fc = ensureFishingClubState(state);
  if (!fc) return { ok: false, recalled: 0 };
  const recalled = fc.anglerIds.length;
  fc.anglerIds = [];
  fc.castCarrySec = 0;
  if (recalled) fishingPushLog(fc, `【全部收竿】${recalled} 位钓手收起钓竿，鱼篓还留在码头`);
  return { ok: recalled > 0, recalled };
}

/** 「收鱼篓」: settles every fish in the creel by rarity; anglers get +40 exp and +1 affection per fish they caught. */
export function claimFishingCreel(state, opts = {}) {
  const fc = ensureFishingClubState(state);
  if (!fc) return { ok: false, reason: "invalid_state" };
  if (!fc.creel.length) return { ok: false, reason: "empty_creel" };
  const rewards = {};
  const perMon = new Map();
  let best = null;
  for (const c of fc.creel) {
    const fish = getFishingFishDef(c.fishId);
    if (!fish) continue;
    for (const [rid, n] of Object.entries(FISHING_RARITY[fish.rarity].rewards)) rewards[rid] = (rewards[rid] || 0) + n;
    if (c.monId > 0) perMon.set(c.monId, (perMon.get(c.monId) || 0) + 1);
    const rank = (f) => ({ common: 0, rare: 1, legend: 2 })[f.rarity] || 0;
    if (!best || rank(fish) > rank(getFishingFishDef(best.fishId)) || (rank(fish) === rank(getFishingFishDef(best.fishId)) && c.size > best.size)) best = c;
  }
  applyRewardGrant(state, rewards, { addRes: opts.addRes, addExpToMon: opts.addExpToMon, squadMons: [] });
  const list = Array.isArray(state.mons?.list) ? state.mons.list : [];
  const expByMon = {};
  for (const [monId, n] of perMon) {
    const mon = list.find((m) => m && m.id === monId);
    if (!mon) continue;
    const exp = n * FISHING_EXP_PER_FISH;
    if (typeof opts.addExpToMon === "function") opts.addExpToMon(mon, exp);
    else mon.exp = Math.max(0, Math.floor((Number(mon.exp) || 0) + exp));
    const aff0 = typeof mon.affection === "number" && Number.isFinite(mon.affection) ? mon.affection : 0;
    mon.affection = Math.min(100, Math.max(0, aff0 + n));
    expByMon[monId] = exp;
  }
  const count = fc.creel.length;
  fc.creel = [];
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  fc.lastHaul = { count, rewards: { ...rewards }, bestFishId: best?.fishId || "", bestSize: best?.size || 0, at: nowMs };
  const rewardTxt = Object.entries(rewards)
    .map(([rid, n]) => `${FISHING_RES_ZH[rid] || rid} +${n}`)
    .join("、");
  const logLine = `【收鱼篓】${count} 条鱼换来 ${rewardTxt}${best ? ` · 今篓最佳「${getFishingFishDef(best.fishId)?.name}」${best.size} cm` : ""}`;
  fishingPushLog(fc, logLine);
  return { ok: true, count, rewards, expByMon, bestFishId: best?.fishId || "", bestSize: best?.size || 0, logLine };
}

export function getFishingChumFreeLeft(state, nowMs = Date.now()) {
  const fc = state?.meta?.fishingClub;
  if (!fc || typeof fc !== "object") return FISHING_CHUM_FREE_PER_DAY;
  if (fc.chumDate !== ecoTriLocalYmd(nowMs)) return FISHING_CHUM_FREE_PER_DAY;
  return Math.max(0, FISHING_CHUM_FREE_PER_DAY - Math.floor(Number(fc.chumUsed) || 0));
}

/** 「撒窝打饵」: every angler lands one fish at once (guaranteed bite, rare / 溪王 weight ×2). Free once per local day, then futurecoin ×20. */
export function performFishingChum(state, opts = {}) {
  const fc = ensureFishingClubState(state);
  if (!fc) return { ok: false, reason: "invalid_state" };
  const anglers = fishingAnglersOf(state);
  if (!anglers.length) return { ok: false, reason: "no_anglers" };
  if (fc.creel.length >= FISHING_CREEL_CAP) return { ok: false, reason: "creel_full" };
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const today = ecoTriLocalYmd(nowMs);
  if (fc.chumDate !== today) {
    fc.chumDate = today;
    fc.chumUsed = 0;
  }
  let costKind = "";
  if (fc.chumUsed < FISHING_CHUM_FREE_PER_DAY) {
    fc.chumUsed += 1;
    costKind = "free_daily";
  } else if ((Number(state.res?.futurecoin?.value) || 0) >= FISHING_CHUM_COIN_COST) {
    state.res.futurecoin.value = Math.max(0, Math.floor(state.res.futurecoin.value) - FISHING_CHUM_COIN_COST);
    costKind = "futurecoin";
  } else {
    return { ok: false, reason: "insufficient_chum_cost" };
  }
  const rng = typeof opts.randFloat === "function" ? opts.randFloat : Math.random;
  const section = getFishingSection(nowMs);
  const tierBefore = getFishingTrophyTier(fishingSpeciesCount(fc));
  const caught = [];
  const newSpecies = [];
  for (const mon of anglers) {
    if (fc.creel.length >= FISHING_CREEL_CAP) break;
    fc.totalCasts = (fc.totalCasts || 0) + 1;
    const c = rollFishingCatch(mon, section.id, opts, rng, { forceBite: true, boostRare: true });
    if (!c) continue;
    const reg = registerFishingCatch(fc, c);
    caught.push(c);
    if (reg.isNew) newSpecies.push(c.fishId);
  }
  const tierAfter = getFishingTrophyTier(fishingSpeciesCount(fc));
  const logLine = `【撒窝打饵】「${section.name}」鱼群聚了过来：${caught.map((c) => `${getFishingFishDef(c.fishId)?.name} ${c.size} cm`).join("、")}`;
  fishingPushLog(fc, logLine);
  if (tierAfter > tierBefore) fishingPushLog(fc, `【钓鱼会奖杯】图鉴登记 ${fishingSpeciesCount(fc)} 种，奖杯升为「${getFishingTrophyName(tierAfter)}」`);
  return { ok: true, costKind, caught, newSpecies, sectionId: section.id, newTier: tierAfter > tierBefore ? tierAfter : 0, logLine };
}

/** Forced release / star-up material: reels the angler in; its fish stay in the creel (no exp owner any more). */
export function detachFishingAngler(state, monId) {
  const fc = state?.meta?.fishingClub;
  const id = Math.floor(Number(monId) || 0);
  if (!fc || typeof fc !== "object" || !Array.isArray(fc.anglerIds) || id <= 0) return { ok: false, detached: false };
  const before = fc.anglerIds.length;
  fc.anglerIds = fc.anglerIds.filter((x) => Math.floor(Number(x) || 0) !== id);
  if (Array.isArray(fc.creel)) for (const c of fc.creel) if (c && Math.floor(Number(c.monId) || 0) === id) c.monId = 0;
  if (!fc.anglerIds.length) fc.castCarrySec = 0;
  return { ok: true, detached: fc.anglerIds.length !== before };
}

/** Rebirth: every angler reels in (partner IDs reset — creel fish lose their owner); the catch dex and trophy are permanent. */
export function recallFishingClubForRebirth(state) {
  const fc = state?.meta?.fishingClub;
  if (!fc || typeof fc !== "object" || !Array.isArray(fc.anglerIds)) return { ok: false, recalled: 0 };
  const recalled = fc.anglerIds.length;
  fc.anglerIds = [];
  fc.castCarrySec = 0;
  if (Array.isArray(fc.creel)) for (const c of fc.creel) if (c) c.monId = 0;
  return { ok: true, recalled };
}

/**
 * Pure non-mutating aggregator of the catch dex & trophy (wired into production / effects / breeding / PvE damage):
 * 每种已登记鱼 全产 +0.2%（16 种 = 3.2%）· 奖杯每级 捕获 +0.25%、PvE 增伤 +1% · 每种溪王 闪光 +2.5%。
 */
export function computeFishingClubBonus(state) {
  const raw = state?.meta?.fishingClub;
  const dex = raw && typeof raw === "object" && raw.dex && typeof raw.dex === "object" ? raw.dex : {};
  let species = 0;
  let legends = 0;
  for (const f of FISHING_FISH_DEFS) {
    if ((Number(dex[f.id]?.count) || 0) > 0) {
      species += 1;
      if (f.rarity === "legend") legends += 1;
    }
  }
  const tier = getFishingTrophyTier(species);
  const round4 = (n) => Math.round(n * 10000) / 10000;
  const prodAdd = round4(species * 0.002);
  const catchAdd = round4(tier * 0.0025);
  const shinyAdd = round4(legends * 0.025);
  const pveOutAdd = round4(tier * 0.01);
  const totalCaught = raw && typeof raw === "object" ? Math.max(0, Math.floor(Number(raw.totalCaught) || 0)) : 0;
  return {
    species,
    totalSpecies: FISHING_FISH_DEFS.length,
    legends,
    totalLegends: FISHING_FISH_DEFS.filter((f) => f.rarity === "legend").length,
    trophyTier: tier,
    maxTier: FISHING_TROPHY_MAX_TIER,
    trophyName: getFishingTrophyName(tier),
    nextTier: FISHING_TROPHY_TIERS.find((t) => t.tier === tier + 1) || null,
    totalCaught,
    title: getFishingTitle(totalCaught),
    anglers: raw && typeof raw === "object" ? getFishingAnglerMonIds(state).size : 0,
    creel: raw && typeof raw === "object" && Array.isArray(raw.creel) ? raw.creel.length : 0,
    prodAdd,
    prodMul: round4(1 + prodAdd),
    catchAdd,
    shinyAdd,
    shinyChanceMul: round4(1 + shinyAdd),
    pveOutAdd,
    pveOutMul: round4(1 + pveOutAdd),
  };
}

// ============================================================================
// ML-15 「彩虹气球旅行」(Rainbow Balloon Travel)
// 2 只彩虹气球，每只最多载 2 位伙伴，飞往轮换开放的空中群岛：5 座群岛（棉花糖云岛 / 彩虹瀑布岛 / 晚霞火山岛 / 雷鸣风车岛 /
// 星砂灯塔岛），按本地时间每 8 小时轮换一次，每次同时开放 2 座（每轮换一次换上一座新岛），起飞时只能选开放中的群岛。
// 航程 40~75 分钟（按群岛固定）；降落时每位乘客带回 1 件纪念品，与群岛属性契合的乘客另有 40% 概率多带 1 件，且稀有 / 珍藏权重 ×2。
// 每座群岛 4 件纪念品（2 常见 / 1 稀有 / 1 珍藏），共 20 件；降落的气球停在草坪上等你「收取纪念品」：纪念品登记进「旅行纪念品图鉴」，
// 按稀有度结算奖励（常见 灵果 60 + 灵木 40 · 稀有 未来币 6 + 灵晶碎片 40 · 珍藏 未来币 20 + 闪光星砂 1），乘客经验 +60、亲密 +2。
// 图鉴集齐 5 / 10 / 15 / 20 种升为铜 / 银 / 金 / 彩虹旅行章：每种纪念品 全产 +0.2%，徽章每级 捕获 +0.3%、PvE +1%，每种珍藏 闪光 +2%。
// 每日一次免费「顺风旅行票」（之后 20 未来币）让剩余航程最长的气球立刻降落。飞行中可「召回」（不带回纪念品）。
// 乘客（飞行中 + 已降落待收取）经由 collection_fun.js 统一外出登记表接入防放生锁 / 训练 / 远征 / 冠军赛排除；
// 离线补算 ≤12h（目的地在起飞时锁定，多只气球按降落先后结算）；强制放生 / 转生召回乘客，图鉴与徽章永久保留。
// ============================================================================

export const BALLOON_ROTATE_HOURS = 8;
export const BALLOON_OPEN_ISLES = 2;
export const BALLOON_MATCH_EXTRA_CHANCE = 0.4;
export const BALLOON_MATCH_RARE_MUL = 2;
export const BALLOON_TICKET_FREE_PER_DAY = 1;
export const BALLOON_TICKET_COIN_COST = 20;
export const BALLOON_EXP_PER_TRIP = 60;
export const BALLOON_AFFECTION_PER_TRIP = 2;
export const BALLOON_MAX_CATCHUP_SEC = 12 * 3600;
export const BALLOON_LOG_KEEP = 6;
export { BALLOON_COUNT, BALLOON_SEATS };

export const BALLOON_ISLES = Object.freeze(
  [
    { id: "cottonCloud", name: "棉花糖云岛", elements: ["wind", "light"], tripMin: 40, desc: "软绵绵的云朵堆成小山，踩上去会弹起来。" },
    { id: "rainbowFalls", name: "彩虹瀑布岛", elements: ["water", "grass"], tripMin: 50, desc: "瀑布从云边垂下来，水雾里一年四季都挂着彩虹。" },
    { id: "sunsetVolcano", name: "晚霞火山岛", elements: ["fire", "stone"], tripMin: 60, desc: "一座打着瞌睡的小火山，傍晚会把天空烤成橘红色。" },
    { id: "thunderMill", name: "雷鸣风车岛", elements: ["electric", "wind"], tripMin: 60, desc: "大风车转个不停，把雷云里的电光一圈圈收进灯泡。" },
    { id: "starLighthouse", name: "星砂灯塔岛", elements: ["dark", "mystic"], tripMin: 75, desc: "夜空里最高的灯塔，灯罩里装的是会唱歌的星砂。" },
  ].map((i) => Object.freeze({ ...i, elements: Object.freeze(i.elements.slice()) })),
);

export const BALLOON_RARITY = Object.freeze({
  common: Object.freeze({ id: "common", name: "常见", weight: 60, rewards: Object.freeze({ catnip: 60, wood: 40 }) }),
  rare: Object.freeze({ id: "rare", name: "稀有", weight: 26, rewards: Object.freeze({ futurecoin: 6, minerals: 40 }) }),
  treasure: Object.freeze({ id: "treasure", name: "珍藏", weight: 7, rewards: Object.freeze({ futurecoin: 20, shinyStarSand: 1 }) }),
});

export const BALLOON_SOUVENIR_DEFS = Object.freeze(
  [
    { id: "cottonCandy", name: "云朵棉花糖", isleId: "cottonCloud", rarity: "common" },
    { id: "skyChime", name: "晴空风铃", isleId: "cottonCloud", rarity: "common" },
    { id: "rainbowQuill", name: "彩虹羽毛笔", isleId: "cottonCloud", rarity: "rare" },
    { id: "haloCrown", name: "天光云朵冠", isleId: "cottonCloud", rarity: "treasure" },
    { id: "fallsPostcard", name: "瀑布明信片", isleId: "rainbowFalls", rarity: "common" },
    { id: "mossPot", name: "青苔小盆栽", isleId: "rainbowFalls", rarity: "common" },
    { id: "prismDew", name: "彩虹水晶露", isleId: "rainbowFalls", rarity: "rare" },
    { id: "bridgeGlass", name: "虹桥琉璃杯", isleId: "rainbowFalls", rarity: "treasure" },
    { id: "sunsetPebble", name: "晚霞火山石", isleId: "sunsetVolcano", rarity: "common" },
    { id: "lavaCandy", name: "暖暖火山糖", isleId: "sunsetVolcano", rarity: "common" },
    { id: "emberGlass", name: "熔金沙漏", isleId: "sunsetVolcano", rarity: "rare" },
    { id: "phoenixCrest", name: "火凤羽纹章", isleId: "sunsetVolcano", rarity: "treasure" },
    { id: "millModel", name: "小风车模型", isleId: "thunderMill", rarity: "common" },
    { id: "cloudPouch", name: "雷云棉花袋", isleId: "thunderMill", rarity: "common" },
    { id: "boltGlobe", name: "闪电玻璃球", isleId: "thunderMill", rarity: "rare" },
    { id: "thunderKey", name: "雷鸣风车钥匙", isleId: "thunderMill", rarity: "treasure" },
    { id: "starsandVial", name: "星砂小瓶", isleId: "starLighthouse", rarity: "common" },
    { id: "glowShell", name: "夜光贝壳", isleId: "starLighthouse", rarity: "common" },
    { id: "keeperLamp", name: "灯塔守夜灯", isleId: "starLighthouse", rarity: "rare" },
    { id: "starCompass", name: "星辰罗盘", isleId: "starLighthouse", rarity: "treasure" },
  ].map((x) => Object.freeze(x)),
);

export const BALLOON_BADGE_TIERS = Object.freeze([
  Object.freeze({ tier: 1, name: "铜旅行章", minSpecies: 5 }),
  Object.freeze({ tier: 2, name: "银旅行章", minSpecies: 10 }),
  Object.freeze({ tier: 3, name: "金旅行章", minSpecies: 15 }),
  Object.freeze({ tier: 4, name: "彩虹旅行章", minSpecies: 20 }),
]);
export const BALLOON_BADGE_MAX_TIER = BALLOON_BADGE_TIERS.length;

export const BALLOON_RES_ZH = Object.freeze({
  futurecoin: "未来币",
  catnip: "灵果",
  wood: "灵木",
  minerals: "灵晶碎片",
  shinyStarSand: "闪光祈愿星砂",
});

const BALLOON_TITLES = Object.freeze([
  { minTrips: 60, name: "空中群岛探险家" },
  { minTrips: 20, name: "彩虹领航员" },
  { minTrips: 5, name: "云端旅人" },
  { minTrips: 0, name: "气球新乘客" },
]);

export function getBalloonIsleDef(isleId) {
  return BALLOON_ISLES.find((i) => i.id === isleId) || null;
}

export function getBalloonSouvenirDef(souvenirId) {
  return BALLOON_SOUVENIR_DEFS.find((x) => x.id === souvenirId) || null;
}

export function getBalloonIsleSouvenirs(isleId) {
  return BALLOON_SOUVENIR_DEFS.filter((x) => x.isleId === isleId);
}

export function getBalloonTitle(totalTrips = 0) {
  const n = Math.max(0, Math.floor(Number(totalTrips) || 0));
  return (BALLOON_TITLES.find((t) => n >= t.minTrips) || BALLOON_TITLES[BALLOON_TITLES.length - 1]).name;
}

export function getBalloonBadgeTier(speciesCount = 0) {
  const n = Math.max(0, Math.floor(Number(speciesCount) || 0));
  let tier = 0;
  for (const t of BALLOON_BADGE_TIERS) if (n >= t.minSpecies) tier = t.tier;
  return tier;
}

export function getBalloonBadgeName(tier) {
  return BALLOON_BADGE_TIERS.find((t) => t.tier === tier)?.name || "未获旅行章";
}

/**
 * Open sky isles — rotate every 8 local hours; 2 isles open at once and every rotation swaps one in
 * (rotation index = day × 3 + block, so consecutive blocks — also across midnight — share one isle).
 */
export function getBalloonIsleRotation(nowMs = Date.now()) {
  const d = new Date(nowMs);
  const dayIdx = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  const blocksPerDay = Math.floor(24 / BALLOON_ROTATE_HOURS);
  const block = Math.max(0, Math.min(blocksPerDay - 1, Math.floor(d.getHours() / BALLOON_ROTATE_HOURS)));
  const n = BALLOON_ISLES.length;
  const k = (((dayIdx * blocksPerDay + block) % n) + n) % n;
  const open = Array.from({ length: BALLOON_OPEN_ISLES }, (_, i) => BALLOON_ISLES[(k + i) % n]);
  const nextOpen = Array.from({ length: BALLOON_OPEN_ISLES }, (_, i) => BALLOON_ISLES[(k + 1 + i) % n]);
  const nextAt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), (block + 1) * BALLOON_ROTATE_HOURS).getTime();
  return {
    index: k,
    open,
    openIds: open.map((i) => i.id),
    nextOpen,
    incoming: nextOpen[nextOpen.length - 1],
    leaving: open[0],
    msUntilNext: Math.max(0, nextAt - nowMs),
  };
}

export function isBalloonIsleOpen(isleId, nowMs = Date.now()) {
  return getBalloonIsleRotation(nowMs).openIds.includes(isleId);
}

function normalizeBalloonTrip(raw, aliveSet, usedIds) {
  if (!raw || typeof raw !== "object") return null;
  const isle = getBalloonIsleDef(raw.isleId);
  if (!isle) return null;
  const passengerIds = [];
  for (const v of Array.isArray(raw.passengerIds) ? raw.passengerIds : []) {
    const id = Math.floor(Number(v) || 0);
    if (id <= 0 || passengerIds.includes(id) || usedIds.has(id) || (aliveSet && !aliveSet.has(id))) continue;
    passengerIds.push(id);
    if (passengerIds.length >= BALLOON_SEATS) break;
  }
  const phase = raw.phase === "landed" ? "landed" : "flying";
  if (phase === "flying" && !passengerIds.length) return null;
  for (const id of passengerIds) usedIds.add(id);
  const durationSec = isle.tripMin * 60;
  const elapsed = Number(raw.elapsedSec);
  const haul =
    phase === "landed"
      ? (Array.isArray(raw.haul) ? raw.haul : [])
          .map((h) => {
            const sv = h && typeof h === "object" ? getBalloonSouvenirDef(h.souvenirId) : null;
            if (!sv || sv.isleId !== isle.id) return null;
            const monId = Math.max(0, Math.floor(Number(h.monId) || 0));
            return { souvenirId: sv.id, monId: passengerIds.includes(monId) ? monId : 0 };
          })
          .filter(Boolean)
          .slice(0, BALLOON_SEATS * 2)
      : [];
  return {
    isleId: isle.id,
    passengerIds,
    phase,
    durationSec,
    elapsedSec: phase === "landed" ? durationSec : Number.isFinite(elapsed) && elapsed > 0 ? Math.min(durationSec, elapsed) : 0,
    haul,
    departedAt: typeof raw.departedAt === "number" && Number.isFinite(raw.departedAt) ? raw.departedAt : 0,
  };
}

export function ensureBalloonTravelState(state) {
  if (!state || typeof state !== "object") return null;
  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  const raw = state.meta.balloonTravel && typeof state.meta.balloonTravel === "object" ? state.meta.balloonTravel : {};
  const monList = Array.isArray(state?.mons?.list) ? state.mons.list : null;
  const aliveSet = monList
    ? new Set(
        monList
          .map((m) => (m && typeof m.id === "number" && Number.isFinite(m.id) ? Math.floor(m.id) : null))
          .filter((x) => x !== null && x > 0),
      )
    : null;
  const rawBalloons = Array.isArray(raw.balloons) ? raw.balloons : [];
  const usedIds = new Set();
  const balloons = Array.from({ length: BALLOON_COUNT }, (_, i) => ({ trip: normalizeBalloonTrip(rawBalloons[i]?.trip, aliveSet, usedIds) }));
  const rawAlbum = raw.album && typeof raw.album === "object" ? raw.album : {};
  const album = {};
  for (const sv of BALLOON_SOUVENIR_DEFS) {
    const e = rawAlbum[sv.id];
    const count = Math.max(0, Math.min(999999, Math.floor(Number(e?.count) || 0)));
    if (count > 0) album[sv.id] = { count };
  }
  const lc = raw.lastClaim && typeof raw.lastClaim === "object" ? raw.lastClaim : null;
  const lastClaim = lc
    ? {
        count: Math.max(0, Math.min(99, Math.floor(Number(lc.count) || 0))),
        isleId: getBalloonIsleDef(lc.isleId)?.id || "",
        rewards: (() => {
          const out = {};
          const src = lc.rewards && typeof lc.rewards === "object" ? lc.rewards : {};
          for (const [rid, v] of Object.entries(src)) {
            const n = Math.max(0, Math.min(99999, Math.floor(Number(v) || 0)));
            if (BALLOON_RES_ZH[rid] && n > 0) out[rid] = n;
          }
          return out;
        })(),
        souvenirIds: (Array.isArray(lc.souvenirIds) ? lc.souvenirIds : []).filter((id) => getBalloonSouvenirDef(id)).slice(0, BALLOON_COUNT * BALLOON_SEATS * 2),
        at: typeof lc.at === "number" && Number.isFinite(lc.at) ? lc.at : 0,
      }
    : null;
  const recentLogs = Array.isArray(raw.recentLogs)
    ? raw.recentLogs.filter((s) => typeof s === "string" && s.trim().length > 0).slice(0, BALLOON_LOG_KEEP)
    : [];
  const clean = {
    initialized: true,
    balloons,
    album,
    totalTrips: Math.max(0, Math.floor(Number(raw.totalTrips) || 0)),
    totalSouvenirs: Math.max(0, Math.floor(Number(raw.totalSouvenirs) || 0)),
    ticketDate: typeof raw.ticketDate === "string" ? raw.ticketDate : "",
    ticketUsed: Math.max(0, Math.floor(Number(raw.ticketUsed) || 0)),
    lastClaim,
    recentLogs,
  };
  if (state.meta.balloonTravel && typeof state.meta.balloonTravel === "object") {
    Object.assign(state.meta.balloonTravel, clean);
    return state.meta.balloonTravel;
  }
  state.meta.balloonTravel = clean;
  return clean;
}

function balloonPushLog(bt, line) {
  bt.recentLogs = [line, ...(bt.recentLogs || [])].slice(0, BALLOON_LOG_KEEP);
}

function balloonMonsOf(state, ids) {
  const list = Array.isArray(state?.mons?.list) ? state.mons.list : [];
  return (Array.isArray(ids) ? ids : []).map((id) => list.find((m) => m && m.id === id)).filter(Boolean);
}

/** Passenger preview for an isle: 群岛契合 (any shared element) → +40% extra souvenir chance, rare / 珍藏 weight ×2. */
export function evaluateBalloonPassenger(mon, isleRaw, opts = {}) {
  const isle = typeof isleRaw === "string" ? getBalloonIsleDef(isleRaw) : isleRaw && isleRaw.id ? getBalloonIsleDef(isleRaw.id) : null;
  if (!mon || !isle) return null;
  const types = acrobatTypesOf(mon, opts);
  const match = types.some((t) => isle.elements.includes(t));
  return {
    isleId: isle.id,
    types,
    match,
    extraChance: match ? BALLOON_MATCH_EXTRA_CHANCE : 0,
    rareMul: match ? BALLOON_MATCH_RARE_MUL : 1,
  };
}

/** Weighted souvenir table of an isle for one passenger (shown in the picker and used at landing). */
export function getBalloonSouvenirOdds(mon, isleId, opts = {}) {
  const ev = evaluateBalloonPassenger(mon, isleId, opts);
  if (!ev) return [];
  const rows = getBalloonIsleSouvenirs(isleId).map((sv) => {
    let w = BALLOON_RARITY[sv.rarity].weight;
    if (sv.rarity !== "common") w *= ev.rareMul;
    return { souvenirId: sv.id, weight: w };
  });
  const total = rows.reduce((s, r) => s + r.weight, 0) || 1;
  return rows.map((r) => ({ ...r, chance: Math.round((r.weight / total) * 1000) / 1000 }));
}

function rollBalloonSouvenir(mon, isleId, opts, rng) {
  const odds = getBalloonSouvenirOdds(mon, isleId, opts);
  if (!odds.length) return null;
  const total = odds.reduce((s, r) => s + r.weight, 0);
  let roll = (Number(rng()) || 0) * total;
  let pick = odds[odds.length - 1];
  for (const r of odds) {
    if (roll < r.weight) {
      pick = r;
      break;
    }
    roll -= r.weight;
  }
  return pick.souvenirId;
}

/** Lands a flying balloon: each passenger brings 1 souvenir (+1 at 40% when element-matched). Registration happens on 「收取纪念品」. */
function landBalloon(state, bt, idx, opts, rng) {
  const b = bt.balloons[idx];
  const trip = b?.trip;
  if (!trip || trip.phase !== "flying") return null;
  const isle = getBalloonIsleDef(trip.isleId);
  const haul = [];
  for (const mon of balloonMonsOf(state, trip.passengerIds)) {
    const ev = evaluateBalloonPassenger(mon, isle.id, opts);
    const first = rollBalloonSouvenir(mon, isle.id, opts, rng);
    if (first) haul.push({ souvenirId: first, monId: mon.id });
    if (ev?.match && (Number(rng()) || 0) < BALLOON_MATCH_EXTRA_CHANCE) {
      const extra = rollBalloonSouvenir(mon, isle.id, opts, rng);
      if (extra) haul.push({ souvenirId: extra, monId: mon.id });
    }
  }
  trip.phase = "landed";
  trip.elapsedSec = trip.durationSec;
  trip.haul = haul;
  balloonPushLog(bt, `【气球降落】${idx + 1} 号气球从「${isle.name}」回来了，带回 ${haul.length} 件纪念品，快去草坪迎接`);
  return { idx, isleId: isle.id, haul: haul.slice() };
}

/**
 * Live tick + offline catch-up (≤12h): every flying balloon advances; destinations are locked at take-off so the isle rotation
 * does not matter afterwards. Balloons land in order of their remaining flight time (opts.randFloat injectable).
 */
export function advanceBalloonTravel(state, dtSec, opts = {}) {
  const bt = state?.meta?.balloonTravel;
  const empty = { landed: [], cancelled: 0 };
  if (!bt || typeof bt !== "object" || !Array.isArray(bt.balloons)) return empty;
  const step = typeof dtSec === "number" && Number.isFinite(dtSec) && dtSec > 0 ? Math.min(BALLOON_MAX_CATCHUP_SEC, dtSec) : 0;
  if (step <= 0) return empty;
  const rng = typeof opts.randFloat === "function" ? opts.randFloat : Math.random;
  let cancelled = 0;
  const flying = [];
  bt.balloons.forEach((b, idx) => {
    const trip = b?.trip;
    if (!trip || trip.phase !== "flying") return;
    if (!balloonMonsOf(state, trip.passengerIds).length) {
      b.trip = null;
      cancelled += 1;
      return;
    }
    flying.push({ idx, left: Math.max(0, (Number(trip.durationSec) || 0) - (Number(trip.elapsedSec) || 0)) });
  });
  flying.sort((a, b) => a.left - b.left || a.idx - b.idx);
  const landed = [];
  for (const f of flying) {
    const trip = bt.balloons[f.idx].trip;
    trip.elapsedSec = Math.min(trip.durationSec, (Number(trip.elapsedSec) || 0) + step);
    if (trip.elapsedSec >= trip.durationSec - 1e-9) {
      const r = landBalloon(state, bt, f.idx, opts, rng);
      if (r) landed.push(r);
    }
  }
  return { landed, cancelled };
}

/** Sends balloon `idx` to an open isle with 1~2 idle passengers. */
export function dispatchBalloon(state, idx, isleId, monIds, opts = {}) {
  const bt = ensureBalloonTravelState(state);
  if (!bt) return { ok: false, reason: "invalid_state" };
  const i = Math.floor(Number(idx));
  if (!(i >= 0 && i < BALLOON_COUNT)) return { ok: false, reason: "unknown_balloon" };
  if (bt.balloons[i].trip) return { ok: false, reason: "balloon_busy" };
  const isle = getBalloonIsleDef(isleId);
  if (!isle) return { ok: false, reason: "unknown_isle" };
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  if (!isBalloonIsleOpen(isle.id, nowMs)) return { ok: false, reason: "isle_closed" };
  const ids = [];
  for (const v of Array.isArray(monIds) ? monIds : []) {
    const id = Math.floor(Number(v) || 0);
    if (id > 0 && !ids.includes(id)) ids.push(id);
  }
  if (!ids.length) return { ok: false, reason: "no_passengers" };
  if (ids.length > BALLOON_SEATS) return { ok: false, reason: "too_many_passengers" };
  const idle = getIdleBalloonCandidates(state);
  const mons = ids.map((id) => idle.find((m) => m.id === id) || null);
  if (mons.some((m) => !m)) return { ok: false, reason: "mon_busy" };
  bt.balloons[i].trip = { isleId: isle.id, passengerIds: ids, phase: "flying", durationSec: isle.tripMin * 60, elapsedSec: 0, haul: [], departedAt: nowMs };
  const matchCount = mons.filter((m) => evaluateBalloonPassenger(m, isle.id, opts)?.match).length;
  balloonPushLog(bt, `【起飞】${i + 1} 号气球载着 ${mons.map((m) => m.name || "伙伴").join("、")} 飞向「${isle.name}」（约 ${isle.tripMin} 分钟${matchCount ? ` · 群岛契合 ${matchCount} 位` : ""}），旅行期间防放生保护生效`);
  return { ok: true, idx: i, isleId: isle.id, passengerIds: ids.slice(), durationSec: isle.tripMin * 60, matchCount };
}

function scoreBalloonPassenger(mon, isleId, opts) {
  const ev = evaluateBalloonPassenger(mon, isleId, opts);
  if (!ev) return -1;
  return (ev.match ? 1000 : 0) + Math.max(1, Math.floor(Number(mon.lvl) || 1));
}

/** 「一键派遣」: every idle balloon flies to the open isle its best idle passengers match most (a different isle per balloon when tied). */
export function autoDispatchBalloons(state, opts = {}) {
  const bt = ensureBalloonTravelState(state);
  if (!bt) return { ok: false, dispatched: [] };
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const rotation = getBalloonIsleRotation(nowMs);
  const dispatched = [];
  for (let i = 0; i < BALLOON_COUNT; i += 1) {
    if (bt.balloons[i].trip) continue;
    const idle = getIdleBalloonCandidates(state);
    if (!idle.length) break;
    const targeted = new Set(bt.balloons.map((b) => b.trip?.isleId).filter(Boolean));
    let best = null;
    rotation.open.forEach((isle, order) => {
      const picks = idle
        .slice()
        .sort((a, b) => scoreBalloonPassenger(b, isle.id, opts) - scoreBalloonPassenger(a, isle.id, opts) || (a.id || 0) - (b.id || 0))
        .slice(0, BALLOON_SEATS);
      const matches = picks.filter((m) => evaluateBalloonPassenger(m, isle.id, opts)?.match).length;
      const score = matches * 1000 + (targeted.has(isle.id) ? 0 : 500) - order;
      if (!best || score > best.score) best = { isle, picks, score };
    });
    if (!best || !best.picks.length) break;
    const res = dispatchBalloon(state, i, best.isle.id, best.picks.map((m) => m.id), { ...opts, nowMs });
    if (res.ok) dispatched.push({ idx: i, isleId: res.isleId, passengerIds: res.passengerIds, matchCount: res.matchCount });
  }
  const anyIdleBalloon = bt.balloons.some((b) => !b.trip);
  return {
    ok: dispatched.length > 0,
    reason: dispatched.length ? "" : anyIdleBalloon ? "no_idle_mons" : "balloons_busy",
    dispatched,
  };
}

/** 「召回」: a flying balloon turns back at once (no souvenirs). */
export function recallBalloon(state, idx) {
  const bt = ensureBalloonTravelState(state);
  if (!bt) return { ok: false, reason: "invalid_state" };
  const i = Math.floor(Number(idx));
  const trip = bt.balloons[i]?.trip;
  if (!trip) return { ok: false, reason: "no_trip" };
  if (trip.phase !== "flying") return { ok: false, reason: "already_landed" };
  bt.balloons[i].trip = null;
  balloonPushLog(bt, `【召回】${i + 1} 号气球掉头飞回草坪，这一趟没带回纪念品`);
  return { ok: true, idx: i, recalled: trip.passengerIds.length };
}

/** 「收取纪念品」for one landed balloon: souvenirs → album + rarity rewards; passengers +60 exp / +2 affection and come home. */
export function claimBalloon(state, idx, opts = {}) {
  const bt = ensureBalloonTravelState(state);
  if (!bt) return { ok: false, reason: "invalid_state" };
  const i = Math.floor(Number(idx));
  const trip = bt.balloons[i]?.trip;
  if (!trip || trip.phase !== "landed") return { ok: false, reason: "not_landed" };
  const isle = getBalloonIsleDef(trip.isleId);
  const tierBefore = getBalloonBadgeTier(Object.keys(bt.album).length);
  const rewards = {};
  const newSouvenirs = [];
  for (const h of trip.haul) {
    const sv = getBalloonSouvenirDef(h.souvenirId);
    if (!sv) continue;
    for (const [rid, n] of Object.entries(BALLOON_RARITY[sv.rarity].rewards)) rewards[rid] = (rewards[rid] || 0) + n;
    const prev = bt.album[sv.id];
    if (!prev || !(prev.count > 0)) newSouvenirs.push(sv.id);
    bt.album[sv.id] = { count: (prev?.count || 0) + 1 };
  }
  applyRewardGrant(state, rewards, { addRes: opts.addRes, addExpToMon: opts.addExpToMon, squadMons: [] });
  const passengers = balloonMonsOf(state, trip.passengerIds);
  for (const m of passengers) {
    if (typeof opts.addExpToMon === "function") opts.addExpToMon(m, BALLOON_EXP_PER_TRIP);
    else m.exp = Math.max(0, Math.floor((Number(m.exp) || 0) + BALLOON_EXP_PER_TRIP));
    const aff0 = typeof m.affection === "number" && Number.isFinite(m.affection) ? m.affection : 0;
    m.affection = Math.min(100, Math.max(0, aff0 + BALLOON_AFFECTION_PER_TRIP));
  }
  const count = trip.haul.length;
  bt.balloons[i].trip = null;
  bt.totalTrips = (bt.totalTrips || 0) + 1;
  bt.totalSouvenirs = (bt.totalSouvenirs || 0) + count;
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  bt.lastClaim = { count, isleId: isle?.id || "", rewards: { ...rewards }, souvenirIds: trip.haul.map((h) => h.souvenirId), at: nowMs };
  const tierAfter = getBalloonBadgeTier(Object.keys(bt.album).length);
  const rewardTxt = Object.entries(rewards)
    .map(([rid, n]) => `${BALLOON_RES_ZH[rid] || rid} +${n}`)
    .join("、");
  const logLine = `【收取纪念品】「${isle?.name || ""}」带回 ${count} 件纪念品${newSouvenirs.length ? `（图鉴新登记 ${newSouvenirs.length} 种）` : ""}，换来 ${rewardTxt || "满满的回忆"}`;
  balloonPushLog(bt, logLine);
  if (tierAfter > tierBefore) balloonPushLog(bt, `【旅行徽章】纪念品图鉴登记 ${Object.keys(bt.album).length} 种，徽章升为「${getBalloonBadgeName(tierAfter)}」`);
  return { ok: true, idx: i, isleId: isle?.id || "", count, rewards, newSouvenirs, newTier: tierAfter > tierBefore ? tierAfter : 0, passengers: passengers.map((m) => m.id), logLine };
}

/** 「收取纪念品」for every landed balloon at once. */
export function claimAllBalloons(state, opts = {}) {
  const bt = ensureBalloonTravelState(state);
  if (!bt) return { ok: false, reason: "invalid_state" };
  const results = [];
  for (let i = 0; i < BALLOON_COUNT; i += 1) {
    if (bt.balloons[i]?.trip?.phase === "landed") results.push(claimBalloon(state, i, opts));
  }
  if (!results.length) return { ok: false, reason: "nothing_landed" };
  const rewards = {};
  for (const r of results) for (const [rid, n] of Object.entries(r.rewards || {})) rewards[rid] = (rewards[rid] || 0) + n;
  return {
    ok: true,
    claimed: results.length,
    count: results.reduce((s, r) => s + (r.count || 0), 0),
    rewards,
    newSouvenirs: results.flatMap((r) => r.newSouvenirs || []),
    newTier: Math.max(0, ...results.map((r) => r.newTier || 0)),
    results,
  };
}

export function getBalloonTicketFreeLeft(state, nowMs = Date.now()) {
  const bt = state?.meta?.balloonTravel;
  if (!bt || typeof bt !== "object") return BALLOON_TICKET_FREE_PER_DAY;
  if (bt.ticketDate !== ecoTriLocalYmd(nowMs)) return BALLOON_TICKET_FREE_PER_DAY;
  return Math.max(0, BALLOON_TICKET_FREE_PER_DAY - Math.floor(Number(bt.ticketUsed) || 0));
}

/** 「顺风旅行票」: the flying balloon with the longest remaining flight lands at once. Free once per local day, then futurecoin ×20. */
export function useBalloonTicket(state, opts = {}) {
  const bt = ensureBalloonTravelState(state);
  if (!bt) return { ok: false, reason: "invalid_state" };
  let target = -1;
  let longest = -1;
  bt.balloons.forEach((b, i) => {
    const t = b?.trip;
    if (!t || t.phase !== "flying" || !balloonMonsOf(state, t.passengerIds).length) return;
    const left = Math.max(0, t.durationSec - t.elapsedSec);
    if (left > longest) {
      longest = left;
      target = i;
    }
  });
  if (target < 0) return { ok: false, reason: "no_flying" };
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const today = ecoTriLocalYmd(nowMs);
  if (bt.ticketDate !== today) {
    bt.ticketDate = today;
    bt.ticketUsed = 0;
  }
  let costKind = "";
  if (bt.ticketUsed < BALLOON_TICKET_FREE_PER_DAY) {
    bt.ticketUsed += 1;
    costKind = "free_daily";
  } else if ((Number(state.res?.futurecoin?.value) || 0) >= BALLOON_TICKET_COIN_COST) {
    state.res.futurecoin.value = Math.max(0, Math.floor(state.res.futurecoin.value) - BALLOON_TICKET_COIN_COST);
    costKind = "futurecoin";
  } else {
    return { ok: false, reason: "insufficient_ticket_cost" };
  }
  const rng = typeof opts.randFloat === "function" ? opts.randFloat : Math.random;
  const landed = landBalloon(state, bt, target, opts, rng);
  const logLine = `【顺风旅行票】一阵顺风把 ${target + 1} 号气球提前送回了草坪（省下约 ${Math.max(1, Math.round(longest / 60))} 分钟）`;
  balloonPushLog(bt, logLine);
  return { ok: true, costKind, idx: target, savedSec: longest, landed, logLine };
}

/** Forced release / star-up material: the passenger leaves the basket; an emptied flying balloon turns back. */
export function detachBalloonPassenger(state, monId) {
  const bt = state?.meta?.balloonTravel;
  const id = Math.floor(Number(monId) || 0);
  if (!bt || typeof bt !== "object" || !Array.isArray(bt.balloons) || id <= 0) return { ok: false, detached: false };
  let detached = false;
  for (const b of bt.balloons) {
    const trip = b?.trip;
    if (!trip || !Array.isArray(trip.passengerIds)) continue;
    const before = trip.passengerIds.length;
    trip.passengerIds = trip.passengerIds.filter((x) => Math.floor(Number(x) || 0) !== id);
    if (trip.passengerIds.length !== before) detached = true;
    if (Array.isArray(trip.haul)) for (const h of trip.haul) if (h && Math.floor(Number(h.monId) || 0) === id) h.monId = 0;
    if (trip.phase === "flying" && !trip.passengerIds.length) b.trip = null;
  }
  return { ok: true, detached };
}

/** Rebirth: flying balloons turn back; landed balloons keep their souvenirs (claimable later, no exp owner). Album and badge are permanent. */
export function recallBalloonTravelForRebirth(state) {
  const bt = state?.meta?.balloonTravel;
  if (!bt || typeof bt !== "object" || !Array.isArray(bt.balloons)) return { ok: false, recalled: 0 };
  let recalled = 0;
  for (const b of bt.balloons) {
    const trip = b?.trip;
    if (!trip) continue;
    recalled += Array.isArray(trip.passengerIds) ? trip.passengerIds.length : 0;
    if (trip.phase === "flying") {
      b.trip = null;
      continue;
    }
    trip.passengerIds = [];
    if (Array.isArray(trip.haul)) for (const h of trip.haul) if (h) h.monId = 0;
  }
  return { ok: true, recalled };
}

/**
 * Pure non-mutating aggregator of the souvenir album & travel badge (wired into production / effects / breeding / PvE damage):
 * 每种已登记纪念品 全产 +0.2%（20 种 = 4%）· 旅行徽章每级 捕获 +0.3%、PvE 增伤 +1% · 每种珍藏纪念品 闪光 +2%。
 */
export function computeBalloonTravelBonus(state) {
  const raw = state?.meta?.balloonTravel;
  const has = Boolean(raw && typeof raw === "object");
  const album = has && raw.album && typeof raw.album === "object" ? raw.album : {};
  let species = 0;
  let treasures = 0;
  for (const sv of BALLOON_SOUVENIR_DEFS) {
    if ((Number(album[sv.id]?.count) || 0) > 0) {
      species += 1;
      if (sv.rarity === "treasure") treasures += 1;
    }
  }
  const tier = getBalloonBadgeTier(species);
  const round4 = (n) => Math.round(n * 10000) / 10000;
  const prodAdd = round4(species * 0.002);
  const catchAdd = round4(tier * 0.003);
  const shinyAdd = round4(treasures * 0.02);
  const pveOutAdd = round4(tier * 0.01);
  const balloons = has && Array.isArray(raw.balloons) ? raw.balloons : [];
  const totalTrips = has ? Math.max(0, Math.floor(Number(raw.totalTrips) || 0)) : 0;
  return {
    species,
    totalSpecies: BALLOON_SOUVENIR_DEFS.length,
    treasures,
    totalTreasures: BALLOON_SOUVENIR_DEFS.filter((x) => x.rarity === "treasure").length,
    badgeTier: tier,
    maxTier: BALLOON_BADGE_MAX_TIER,
    badgeName: getBalloonBadgeName(tier),
    nextTier: BALLOON_BADGE_TIERS.find((t) => t.tier === tier + 1) || null,
    totalTrips,
    title: getBalloonTitle(totalTrips),
    travelers: has ? getBalloonTravelerMonIds(state).size : 0,
    flying: balloons.filter((b) => b?.trip?.phase === "flying").length,
    landed: balloons.filter((b) => b?.trip?.phase === "landed").length,
    prodAdd,
    prodMul: round4(1 + prodAdd),
    catchAdd,
    shinyAdd,
    shinyChanceMul: round4(1 + shinyAdd),
    pveOutAdd,
    pveOutMul: round4(1 + pveOutAdd),
  };
}

// ============================================================================
// ML-16 「星空露营观测」(Starry Night Camp & Sky Watch)
// 3 处营地（萤火草坡 40 分钟 · 镜湖星湾 60 分钟 · 云巅观星台 90 分钟），每处最多 2 位伙伴夜营观星。
// 星空按本地时间轮换：12 个星座每 6 小时轮换一次、每次同时可见 3 个（每轮换一次换上一个新星座，3 天走完一圈）；
// 流星雨按本地日期轮换（6 种，每天一种）；出发时间在 19:00~05:00（夜观时段）时流星概率 ×1.5。星空与流星雨都在出发时锁定。
// 归营时每位伙伴记下 1 个可见星座（星座属性与伙伴属性相同时权重 ×2），与营地属性契合的伙伴另有 50% 概率多记 1 个；
// 每位伙伴各有一次机会看到当天的流星雨：营地基础 20% / 30% / 45%，夜观 ×1.5，营地契合 +10%（最高 90%）。
// 归营的营地等你「收取观测记录」：星座记录 灵果 50 + 灵木 30、流星记录 未来币 8 + 灵晶碎片 40，第一次登记进观测图鉴的条目另 +5 未来币；
// 夜营伙伴经验 +50、亲密 +2。观测图鉴 12 星座 + 6 流星雨 = 18 条，登记 4 / 8 / 12 / 18 条升为铜 / 银 / 金 / 星辉营火徽章：
// 每个星座 全产 +0.15%，每种流星雨 闪光 +1.5%，营火徽章每级 捕获 +0.3%、PvE 增伤 +1%。
// 每日一次免费「添柴守夜」（之后 20 未来币）让剩余时间最长的营地立刻天亮归营；夜营中可「撤营」（不带回记录）。
// 夜营伙伴（夜营中 + 归营待收取）经由 collection_fun.js 统一外出登记表接入防放生锁 / 训练 / 远征 / 冠军赛排除；
// 离线补算 ≤12h（星空在出发时锁定，多处营地按归营先后结算）；强制放生 / 转生撤回夜营，图鉴与徽章永久保留。
// ============================================================================

export const STARGAZE_ROTATE_HOURS = 6;
export const STARGAZE_VISIBLE = 3;
export const STARGAZE_NIGHT_START_HOUR = 19;
export const STARGAZE_NIGHT_END_HOUR = 5;
export const STARGAZE_NIGHT_MUL = 1.5;
export const STARGAZE_MATCH_EXTRA_CHANCE = 0.5;
export const STARGAZE_MATCH_METEOR_ADD = 0.1;
export const STARGAZE_METEOR_CAP = 0.9;
export const STARGAZE_STAR_ELEMENT_MUL = 2;
export const STARGAZE_FIRE_FREE_PER_DAY = 1;
export const STARGAZE_FIRE_COIN_COST = 20;
export const STARGAZE_EXP_PER_NIGHT = 50;
export const STARGAZE_AFFECTION_PER_NIGHT = 2;
export const STARGAZE_NEW_ENTRY_COIN = 5;
export const STARGAZE_MAX_CATCHUP_SEC = 12 * 3600;
export const STARGAZE_LOG_KEEP = 6;
export { STARGAZE_MAX_CAMPERS, STARGAZE_SEATS, STARGAZE_SITE_COUNT };

export const STARGAZE_SITES = Object.freeze(
  [
    { id: "fireflyMeadow", name: STARGAZE_SITE_NAMES[0], elements: ["grass", "light", "wind"], campMin: 40, meteorChance: 0.2, desc: "萤火虫在草尖上打着小灯笼，躺下来就能一颗一颗数星星。" },
    { id: "mirrorLake", name: STARGAZE_SITE_NAMES[1], elements: ["water", "mystic", "electric"], campMin: 60, meteorChance: 0.3, desc: "湖面静得像一面镜子，天上地下各挂着一片星空。" },
    { id: "summitDeck", name: STARGAZE_SITE_NAMES[2], elements: ["stone", "dark", "fire"], campMin: 90, meteorChance: 0.45, desc: "离星星最近的山顶，营火噼啪作响，整夜守着流星划过。" },
  ].map((x) => Object.freeze({ ...x, elements: Object.freeze(x.elements.slice()) })),
);

export const STARGAZE_CONSTELLATIONS = Object.freeze(
  [
    { id: "antlerDeer", name: "灵鹿座", element: "grass", desc: "鹿角上挂着七颗小星，春夜里最亮。" },
    { id: "emberPhoenix", name: "火羽座", element: "fire", desc: "张开的羽翼像一团不会熄灭的篝火。" },
    { id: "tideWhale", name: "潮汐鲸座", element: "water", desc: "鲸鱼喷出的水花化成了一串银色的星。" },
    { id: "thunderHorn", name: "雷角座", element: "electric", desc: "两只尖角之间时常闪过细细的电光。" },
    { id: "windKite", name: "风筝座", element: "wind", desc: "一只拖着长尾巴的风筝，永远飞在银河上游。" },
    { id: "stoneTurtle", name: "岩龟座", element: "stone", desc: "慢吞吞的老龟背着一整块星空。" },
    { id: "moonRabbit", name: "月兔座", element: "light", desc: "蹲在月亮旁边捣药的小兔，耳朵是两颗亮星。" },
    { id: "shadowCat", name: "夜猫座", element: "dark", desc: "只有在最黑的夜里才看得见它眨眼。" },
    { id: "dreamButterfly", name: "幻蝶座", element: "mystic", desc: "翅膀上的星点会随着梦境慢慢变换位置。" },
    { id: "lanternFox", name: "提灯狐座", element: "fire", desc: "提着小灯笼的狐狸，给迷路的流星引路。" },
    { id: "cloudSheep", name: "云羊座", element: "wind", desc: "毛茸茸的云羊，数着数着就让人想睡了。" },
    { id: "pearlOtter", name: "珍珠獭座", element: "water", desc: "仰面漂在银河里的水獭，肚皮上抱着一颗珍珠星。" },
  ].map((c) => Object.freeze(c)),
);

export const STARGAZE_SHOWERS = Object.freeze(
  [
    { id: "silverFeather", name: "银羽流星雨", desc: "一根根银色羽毛似的流星，轻飘飘地落进山谷。" },
    { id: "fireflyTrail", name: "萤尾流星雨", desc: "拖着萤火般绿尾巴的流星，一闪一闪地划过草坡。" },
    { id: "rainbowDrizzle", name: "彩虹流星雨", desc: "每一颗都带着不同的颜色，像有人在天上撒彩糖。" },
    { id: "frostCrystal", name: "冰晶流星雨", desc: "冷冽的蓝白色流星，落地前会叮的一声碎成冰花。" },
    { id: "goldenWheat", name: "金穗流星雨", desc: "像麦穗一样金黄的流星，据说看见它会有好收成。" },
    { id: "wishingHeart", name: "心愿流星雨", desc: "最稀奇的流星雨，看见的伙伴都会悄悄许一个愿。" },
  ].map((m) => Object.freeze(m)),
);

export const STARGAZE_ATLAS_SIZE = STARGAZE_CONSTELLATIONS.length + STARGAZE_SHOWERS.length;

export const STARGAZE_REWARDS = Object.freeze({
  star: Object.freeze({ catnip: 50, wood: 30 }),
  meteor: Object.freeze({ futurecoin: 8, minerals: 40 }),
});

export const STARGAZE_BADGE_TIERS = Object.freeze([
  Object.freeze({ tier: 1, name: "铜营火徽章", minEntries: 4 }),
  Object.freeze({ tier: 2, name: "银营火徽章", minEntries: 8 }),
  Object.freeze({ tier: 3, name: "金营火徽章", minEntries: 12 }),
  Object.freeze({ tier: 4, name: "星辉营火徽章", minEntries: 18 }),
]);
export const STARGAZE_BADGE_MAX_TIER = STARGAZE_BADGE_TIERS.length;

export const STARGAZE_RES_ZH = Object.freeze({
  futurecoin: "未来币",
  catnip: "灵果",
  wood: "灵木",
  minerals: "灵晶碎片",
});

const STARGAZE_TITLES = Object.freeze([
  { minNights: 60, name: "银河守望者" },
  { minNights: 20, name: "星图绘制师" },
  { minNights: 5, name: "夜空观察员" },
  { minNights: 0, name: "露营新手" },
]);

export function getStargazeSiteDef(siteId) {
  return STARGAZE_SITES.find((x) => x.id === siteId) || null;
}

export function getStargazeConstellationDef(id) {
  return STARGAZE_CONSTELLATIONS.find((c) => c.id === id) || null;
}

export function getStargazeShowerDef(id) {
  return STARGAZE_SHOWERS.find((m) => m.id === id) || null;
}

/** Atlas entry (constellation or meteor shower) → { kind, def }. */
export function getStargazeEntryDef(id) {
  const c = getStargazeConstellationDef(id);
  if (c) return { kind: "star", def: c };
  const m = getStargazeShowerDef(id);
  if (m) return { kind: "meteor", def: m };
  return null;
}

export function getStargazeTitle(totalNights = 0) {
  const n = Math.max(0, Math.floor(Number(totalNights) || 0));
  return (STARGAZE_TITLES.find((t) => n >= t.minNights) || STARGAZE_TITLES[STARGAZE_TITLES.length - 1]).name;
}

export function getStargazeBadgeTier(entries = 0) {
  const n = Math.max(0, Math.floor(Number(entries) || 0));
  let tier = 0;
  for (const t of STARGAZE_BADGE_TIERS) if (n >= t.minEntries) tier = t.tier;
  return tier;
}

export function getStargazeBadgeName(tier) {
  return STARGAZE_BADGE_TIERS.find((t) => t.tier === tier)?.name || "未获营火徽章";
}

export function isStargazeNightHour(nowMs = Date.now()) {
  const h = new Date(nowMs).getHours();
  return h >= STARGAZE_NIGHT_START_HOUR || h < STARGAZE_NIGHT_END_HOUR;
}

/**
 * The local sky: 3 visible constellations rotate every 6 local hours (index = day × 4 + block, so consecutive blocks — also
 * across midnight — share two constellations); the meteor shower changes with the local date; 19:00~05:00 is the night watch.
 */
export function getStargazeSkyRotation(nowMs = Date.now()) {
  const d = new Date(nowMs);
  const dayIdx = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  const blocksPerDay = Math.floor(24 / STARGAZE_ROTATE_HOURS);
  const block = Math.max(0, Math.min(blocksPerDay - 1, Math.floor(d.getHours() / STARGAZE_ROTATE_HOURS)));
  const n = STARGAZE_CONSTELLATIONS.length;
  const k = (((dayIdx * blocksPerDay + block) % n) + n) % n;
  const visible = Array.from({ length: STARGAZE_VISIBLE }, (_, i) => STARGAZE_CONSTELLATIONS[(k + i) % n]);
  const nextVisible = Array.from({ length: STARGAZE_VISIBLE }, (_, i) => STARGAZE_CONSTELLATIONS[(k + 1 + i) % n]);
  const nextAt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), (block + 1) * STARGAZE_ROTATE_HOURS).getTime();
  const sCount = STARGAZE_SHOWERS.length;
  const shower = STARGAZE_SHOWERS[((dayIdx % sCount) + sCount) % sCount];
  const nextShower = STARGAZE_SHOWERS[(((dayIdx + 1) % sCount) + sCount) % sCount];
  const tomorrow = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
  return {
    index: k,
    visible,
    visibleIds: visible.map((c) => c.id),
    nextVisible,
    incoming: nextVisible[nextVisible.length - 1],
    leaving: visible[0],
    msUntilNext: Math.max(0, nextAt - nowMs),
    shower,
    nextShower,
    msUntilShowerChange: Math.max(0, tomorrow - nowMs),
    isNight: isStargazeNightHour(nowMs),
  };
}

function normalizeStargazeTrip(raw, siteDef, aliveSet, usedIds) {
  if (!raw || typeof raw !== "object" || !siteDef) return null;
  const camperIds = [];
  for (const v of Array.isArray(raw.camperIds) ? raw.camperIds : []) {
    const id = Math.floor(Number(v) || 0);
    if (id <= 0 || camperIds.includes(id) || usedIds.has(id) || (aliveSet && !aliveSet.has(id))) continue;
    camperIds.push(id);
    if (camperIds.length >= STARGAZE_SEATS) break;
  }
  const phase = raw.phase === "returned" ? "returned" : "camping";
  if (phase === "camping" && !camperIds.length) return null;
  for (const id of camperIds) usedIds.add(id);
  const durationSec = siteDef.campMin * 60;
  const elapsed = Number(raw.elapsedSec);
  const skyIds = (Array.isArray(raw.skyIds) ? raw.skyIds : []).filter((id) => getStargazeConstellationDef(id)).slice(0, STARGAZE_VISIBLE);
  const fallbackSky = getStargazeSkyRotation(typeof raw.departedAt === "number" && Number.isFinite(raw.departedAt) && raw.departedAt > 0 ? raw.departedAt : Date.now());
  const showerId = getStargazeShowerDef(raw.showerId)?.id || fallbackSky.shower.id;
  const haul =
    phase === "returned"
      ? (Array.isArray(raw.haul) ? raw.haul : [])
          .map((h) => {
            const e = h && typeof h === "object" ? getStargazeEntryDef(h.id) : null;
            if (!e) return null;
            const monId = Math.max(0, Math.floor(Number(h.monId) || 0));
            return { kind: e.kind, id: e.def.id, monId: camperIds.includes(monId) ? monId : 0 };
          })
          .filter(Boolean)
          .slice(0, STARGAZE_SEATS * 3)
      : [];
  return {
    siteId: siteDef.id,
    camperIds,
    phase,
    durationSec,
    elapsedSec: phase === "returned" ? durationSec : Number.isFinite(elapsed) && elapsed > 0 ? Math.min(durationSec, elapsed) : 0,
    skyIds: skyIds.length === STARGAZE_VISIBLE ? skyIds : fallbackSky.visibleIds.slice(),
    showerId,
    night: Boolean(raw.night),
    haul,
    departedAt: typeof raw.departedAt === "number" && Number.isFinite(raw.departedAt) ? raw.departedAt : 0,
  };
}

export function ensureStargazeCampState(state) {
  if (!state || typeof state !== "object") return null;
  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  const raw = state.meta.stargazeCamp && typeof state.meta.stargazeCamp === "object" ? state.meta.stargazeCamp : {};
  const monList = Array.isArray(state?.mons?.list) ? state.mons.list : null;
  const aliveSet = monList
    ? new Set(
        monList
          .map((m) => (m && typeof m.id === "number" && Number.isFinite(m.id) ? Math.floor(m.id) : null))
          .filter((x) => x !== null && x > 0),
      )
    : null;
  const rawSites = Array.isArray(raw.sites) ? raw.sites : [];
  const usedIds = new Set();
  const sites = STARGAZE_SITES.map((def, i) => ({ trip: normalizeStargazeTrip(rawSites[i]?.trip, def, aliveSet, usedIds) }));
  const rawAtlas = raw.atlas && typeof raw.atlas === "object" ? raw.atlas : {};
  const atlas = {};
  for (const id of [...STARGAZE_CONSTELLATIONS.map((c) => c.id), ...STARGAZE_SHOWERS.map((m) => m.id)]) {
    const count = Math.max(0, Math.min(999999, Math.floor(Number(rawAtlas[id]?.count) || 0)));
    if (count > 0) atlas[id] = { count };
  }
  const lc = raw.lastClaim && typeof raw.lastClaim === "object" ? raw.lastClaim : null;
  const lastClaim = lc
    ? {
        count: Math.max(0, Math.min(99, Math.floor(Number(lc.count) || 0))),
        siteId: getStargazeSiteDef(lc.siteId)?.id || "",
        rewards: (() => {
          const out = {};
          const src = lc.rewards && typeof lc.rewards === "object" ? lc.rewards : {};
          for (const [rid, v] of Object.entries(src)) {
            const n = Math.max(0, Math.min(99999, Math.floor(Number(v) || 0)));
            if (STARGAZE_RES_ZH[rid] && n > 0) out[rid] = n;
          }
          return out;
        })(),
        entryIds: (Array.isArray(lc.entryIds) ? lc.entryIds : []).filter((id) => getStargazeEntryDef(id)).slice(0, STARGAZE_MAX_CAMPERS * 3),
        newEntries: (Array.isArray(lc.newEntries) ? lc.newEntries : []).filter((id) => getStargazeEntryDef(id)).slice(0, STARGAZE_ATLAS_SIZE),
        at: typeof lc.at === "number" && Number.isFinite(lc.at) ? lc.at : 0,
      }
    : null;
  const recentLogs = Array.isArray(raw.recentLogs)
    ? raw.recentLogs.filter((s) => typeof s === "string" && s.trim().length > 0).slice(0, STARGAZE_LOG_KEEP)
    : [];
  const clean = {
    initialized: true,
    sites,
    atlas,
    totalNights: Math.max(0, Math.floor(Number(raw.totalNights) || 0)),
    totalSightings: Math.max(0, Math.floor(Number(raw.totalSightings) || 0)),
    totalMeteors: Math.max(0, Math.floor(Number(raw.totalMeteors) || 0)),
    fireDate: typeof raw.fireDate === "string" ? raw.fireDate : "",
    fireUsed: Math.max(0, Math.floor(Number(raw.fireUsed) || 0)),
    lastClaim,
    recentLogs,
  };
  if (state.meta.stargazeCamp && typeof state.meta.stargazeCamp === "object") {
    Object.assign(state.meta.stargazeCamp, clean);
    return state.meta.stargazeCamp;
  }
  state.meta.stargazeCamp = clean;
  return clean;
}

function stargazePushLog(sg, line) {
  sg.recentLogs = [line, ...(sg.recentLogs || [])].slice(0, STARGAZE_LOG_KEEP);
}

function stargazeMonsOf(state, ids) {
  const list = Array.isArray(state?.mons?.list) ? state.mons.list : [];
  return (Array.isArray(ids) ? ids : []).map((id) => list.find((m) => m && m.id === id)).filter(Boolean);
}

/** Camper preview at a site: 营地契合 (any shared element) → +50% extra constellation, meteor chance +10%. */
export function evaluateStargazeCamper(mon, siteRaw, opts = {}) {
  const site = typeof siteRaw === "string" ? getStargazeSiteDef(siteRaw) : siteRaw && siteRaw.id ? getStargazeSiteDef(siteRaw.id) : null;
  if (!mon || !site) return null;
  const types = acrobatTypesOf(mon, opts);
  const match = types.some((t) => site.elements.includes(t));
  const night = typeof opts.night === "boolean" ? opts.night : isStargazeNightHour(typeof opts.nowMs === "number" ? opts.nowMs : Date.now());
  const meteorChance = Math.min(STARGAZE_METEOR_CAP, site.meteorChance * (night ? STARGAZE_NIGHT_MUL : 1) + (match ? STARGAZE_MATCH_METEOR_ADD : 0));
  return {
    siteId: site.id,
    types,
    match,
    extraChance: match ? STARGAZE_MATCH_EXTRA_CHANCE : 0,
    meteorChance: Math.round(meteorChance * 1000) / 1000,
    night,
  };
}

/** Weighted constellation table for one camper over a locked sky (element-matched constellations ×2). */
export function getStargazeStarOdds(mon, skyIds, opts = {}) {
  const types = mon ? acrobatTypesOf(mon, opts) : [];
  const rows = (Array.isArray(skyIds) ? skyIds : [])
    .map((id) => getStargazeConstellationDef(id))
    .filter(Boolean)
    .map((c) => ({ id: c.id, weight: types.includes(c.element) ? STARGAZE_STAR_ELEMENT_MUL : 1 }));
  const total = rows.reduce((s, r) => s + r.weight, 0) || 1;
  return rows.map((r) => ({ ...r, chance: Math.round((r.weight / total) * 1000) / 1000 }));
}

function rollStargazeStar(mon, skyIds, opts, rng) {
  const odds = getStargazeStarOdds(mon, skyIds, opts);
  if (!odds.length) return null;
  const total = odds.reduce((s, r) => s + r.weight, 0);
  let roll = (Number(rng()) || 0) * total;
  for (const r of odds) {
    if (roll < r.weight) return r.id;
    roll -= r.weight;
  }
  return odds[odds.length - 1].id;
}

/** Dawn at a campsite: every camper notes 1 constellation (+1 at 50% when site-matched) and rolls once for the locked meteor shower. */
function finishStargazeNight(state, sg, idx, opts, rng) {
  const trip = sg.sites[idx]?.trip;
  if (!trip || trip.phase !== "camping") return null;
  const site = getStargazeSiteDef(trip.siteId) || STARGAZE_SITES[idx];
  const haul = [];
  for (const mon of stargazeMonsOf(state, trip.camperIds)) {
    const ev = evaluateStargazeCamper(mon, site.id, { ...opts, night: trip.night });
    const first = rollStargazeStar(mon, trip.skyIds, opts, rng);
    if (first) haul.push({ kind: "star", id: first, monId: mon.id });
    if (ev?.match && (Number(rng()) || 0) < STARGAZE_MATCH_EXTRA_CHANCE) {
      const extra = rollStargazeStar(mon, trip.skyIds, opts, rng);
      if (extra) haul.push({ kind: "star", id: extra, monId: mon.id });
    }
    if ((Number(rng()) || 0) < (ev?.meteorChance || 0)) haul.push({ kind: "meteor", id: trip.showerId, monId: mon.id });
  }
  trip.phase = "returned";
  trip.elapsedSec = trip.durationSec;
  trip.haul = haul;
  const meteors = haul.filter((h) => h.kind === "meteor").length;
  stargazePushLog(sg, `【天亮归营】「${site.name}」的伙伴们收起帐篷回来了，记下 ${haul.length - meteors} 个星座${meteors ? `、${meteors} 次${getStargazeShowerDef(trip.showerId)?.name || "流星"}` : ""}，快去收取观测记录`);
  return { idx, siteId: site.id, haul: haul.slice(), meteors };
}

/**
 * Live tick + offline catch-up (≤12h): every camping site advances; the sky and the meteor shower were locked at departure,
 * so the rotation does not matter afterwards. Sites return in order of their remaining time (opts.randFloat injectable).
 */
export function advanceStargazeCamp(state, dtSec, opts = {}) {
  const sg = state?.meta?.stargazeCamp;
  const empty = { returned: [], cancelled: 0 };
  if (!sg || typeof sg !== "object" || !Array.isArray(sg.sites)) return empty;
  const step = typeof dtSec === "number" && Number.isFinite(dtSec) && dtSec > 0 ? Math.min(STARGAZE_MAX_CATCHUP_SEC, dtSec) : 0;
  if (step <= 0) return empty;
  const rng = typeof opts.randFloat === "function" ? opts.randFloat : Math.random;
  let cancelled = 0;
  const camping = [];
  sg.sites.forEach((site, idx) => {
    const trip = site?.trip;
    if (!trip || trip.phase !== "camping") return;
    if (!stargazeMonsOf(state, trip.camperIds).length) {
      site.trip = null;
      cancelled += 1;
      return;
    }
    camping.push({ idx, left: Math.max(0, (Number(trip.durationSec) || 0) - (Number(trip.elapsedSec) || 0)) });
  });
  camping.sort((a, b) => a.left - b.left || a.idx - b.idx);
  const returned = [];
  for (const c of camping) {
    const trip = sg.sites[c.idx].trip;
    trip.elapsedSec = Math.min(trip.durationSec, (Number(trip.elapsedSec) || 0) + step);
    if (trip.elapsedSec >= trip.durationSec - 1e-9) {
      const r = finishStargazeNight(state, sg, c.idx, opts, rng);
      if (r) returned.push(r);
    }
  }
  return { returned, cancelled };
}

/** Sends 1~2 idle partners on a night camp at site `idx`; the visible sky, the meteor shower and the night watch are locked now. */
export function dispatchStargazeCamp(state, idx, monIds, opts = {}) {
  const sg = ensureStargazeCampState(state);
  if (!sg) return { ok: false, reason: "invalid_state" };
  const i = Math.floor(Number(idx));
  if (!(i >= 0 && i < STARGAZE_SITE_COUNT)) return { ok: false, reason: "unknown_site" };
  if (sg.sites[i].trip) return { ok: false, reason: "site_busy" };
  const site = STARGAZE_SITES[i];
  const ids = [];
  for (const v of Array.isArray(monIds) ? monIds : []) {
    const id = Math.floor(Number(v) || 0);
    if (id > 0 && !ids.includes(id)) ids.push(id);
  }
  if (!ids.length) return { ok: false, reason: "no_campers" };
  if (ids.length > STARGAZE_SEATS) return { ok: false, reason: "too_many_campers" };
  const idle = getIdleStargazeCandidates(state);
  const mons = ids.map((id) => idle.find((m) => m.id === id) || null);
  if (mons.some((m) => !m)) return { ok: false, reason: "mon_busy" };
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const sky = getStargazeSkyRotation(nowMs);
  sg.sites[i].trip = {
    siteId: site.id,
    camperIds: ids,
    phase: "camping",
    durationSec: site.campMin * 60,
    elapsedSec: 0,
    skyIds: sky.visibleIds.slice(),
    showerId: sky.shower.id,
    night: sky.isNight,
    haul: [],
    departedAt: nowMs,
  };
  const matchCount = mons.filter((m) => evaluateStargazeCamper(m, site.id, { ...opts, night: sky.isNight })?.match).length;
  stargazePushLog(
    sg,
    `【出发夜营】${mons.map((m) => m.name || "伙伴").join("、")} 背着帐篷去了「${site.name}」（约 ${site.campMin} 分钟${sky.isNight ? " · 夜观时段" : ""}${matchCount ? ` · 营地契合 ${matchCount} 位` : ""}），夜营期间防放生保护生效`,
  );
  return { ok: true, idx: i, siteId: site.id, camperIds: ids.slice(), durationSec: site.campMin * 60, matchCount, night: sky.isNight, skyIds: sky.visibleIds.slice(), showerId: sky.shower.id };
}

function scoreStargazeCamper(mon, siteId, opts) {
  const ev = evaluateStargazeCamper(mon, siteId, opts);
  if (!ev) return -1;
  return (ev.match ? 1000 : 0) + Math.max(1, Math.floor(Number(mon.lvl) || 1));
}

/** 「一键夜营」: every empty campsite takes its 2 best idle campers (site-matched first, then level). */
export function autoDispatchStargazeCamps(state, opts = {}) {
  const sg = ensureStargazeCampState(state);
  if (!sg) return { ok: false, dispatched: [] };
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const dispatched = [];
  for (let i = 0; i < STARGAZE_SITE_COUNT; i += 1) {
    if (sg.sites[i].trip) continue;
    const idle = getIdleStargazeCandidates(state);
    if (!idle.length) break;
    const site = STARGAZE_SITES[i];
    const picks = idle
      .slice()
      .sort((a, b) => scoreStargazeCamper(b, site.id, opts) - scoreStargazeCamper(a, site.id, opts) || (a.id || 0) - (b.id || 0))
      .slice(0, STARGAZE_SEATS);
    const res = dispatchStargazeCamp(state, i, picks.map((m) => m.id), { ...opts, nowMs });
    if (res.ok) dispatched.push({ idx: i, siteId: res.siteId, camperIds: res.camperIds, matchCount: res.matchCount });
  }
  const anyFree = sg.sites.some((x) => !x.trip);
  return { ok: dispatched.length > 0, reason: dispatched.length ? "" : anyFree ? "no_idle_mons" : "sites_busy", dispatched };
}

/** 「撤营」: a camping site packs up at once (no records). */
export function recallStargazeCamp(state, idx) {
  const sg = ensureStargazeCampState(state);
  if (!sg) return { ok: false, reason: "invalid_state" };
  const i = Math.floor(Number(idx));
  const trip = sg.sites[i]?.trip;
  if (!trip) return { ok: false, reason: "no_trip" };
  if (trip.phase !== "camping") return { ok: false, reason: "already_returned" };
  sg.sites[i].trip = null;
  stargazePushLog(sg, `【撤营】「${STARGAZE_SITES[i].name}」的帐篷提前收起来了，这一夜没留下观测记录`);
  return { ok: true, idx: i, recalled: trip.camperIds.length };
}

/** 「收取观测记录」for one returned site: records → atlas + rewards (new entries +5 coin); campers +50 exp / +2 affection and come home. */
export function claimStargazeSite(state, idx, opts = {}) {
  const sg = ensureStargazeCampState(state);
  if (!sg) return { ok: false, reason: "invalid_state" };
  const i = Math.floor(Number(idx));
  const trip = sg.sites[i]?.trip;
  if (!trip || trip.phase !== "returned") return { ok: false, reason: "not_returned" };
  const site = getStargazeSiteDef(trip.siteId) || STARGAZE_SITES[i];
  const tierBefore = getStargazeBadgeTier(Object.keys(sg.atlas).length);
  const rewards = {};
  const newEntries = [];
  for (const h of trip.haul) {
    const e = getStargazeEntryDef(h.id);
    if (!e) continue;
    for (const [rid, n] of Object.entries(STARGAZE_REWARDS[e.kind])) rewards[rid] = (rewards[rid] || 0) + n;
    const prev = sg.atlas[e.def.id];
    if (!prev || !(prev.count > 0)) {
      newEntries.push(e.def.id);
      rewards.futurecoin = (rewards.futurecoin || 0) + STARGAZE_NEW_ENTRY_COIN;
    }
    sg.atlas[e.def.id] = { count: (prev?.count || 0) + 1 };
  }
  applyRewardGrant(state, rewards, { addRes: opts.addRes, addExpToMon: opts.addExpToMon, squadMons: [] });
  const campers = stargazeMonsOf(state, trip.camperIds);
  for (const m of campers) {
    if (typeof opts.addExpToMon === "function") opts.addExpToMon(m, STARGAZE_EXP_PER_NIGHT);
    else m.exp = Math.max(0, Math.floor((Number(m.exp) || 0) + STARGAZE_EXP_PER_NIGHT));
    const aff0 = typeof m.affection === "number" && Number.isFinite(m.affection) ? m.affection : 0;
    m.affection = Math.min(100, Math.max(0, aff0 + STARGAZE_AFFECTION_PER_NIGHT));
  }
  const count = trip.haul.length;
  const meteors = trip.haul.filter((h) => h.kind === "meteor").length;
  sg.sites[i].trip = null;
  sg.totalNights = (sg.totalNights || 0) + 1;
  sg.totalSightings = (sg.totalSightings || 0) + count;
  sg.totalMeteors = (sg.totalMeteors || 0) + meteors;
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  sg.lastClaim = { count, siteId: site.id, rewards: { ...rewards }, entryIds: trip.haul.map((h) => h.id), newEntries: newEntries.slice(), at: nowMs };
  const tierAfter = getStargazeBadgeTier(Object.keys(sg.atlas).length);
  const rewardTxt = Object.entries(rewards)
    .map(([rid, n]) => `${STARGAZE_RES_ZH[rid] || rid} +${n}`)
    .join("、");
  const logLine = `【收取观测记录】「${site.name}」带回 ${count} 条观测记录${newEntries.length ? `（观测图鉴新登记 ${newEntries.length} 条）` : ""}，换来 ${rewardTxt || "一整夜的好梦"}`;
  stargazePushLog(sg, logLine);
  if (tierAfter > tierBefore) stargazePushLog(sg, `【营火徽章】观测图鉴登记 ${Object.keys(sg.atlas).length} 条，徽章升为「${getStargazeBadgeName(tierAfter)}」`);
  return { ok: true, idx: i, siteId: site.id, count, meteors, rewards, newEntries, newTier: tierAfter > tierBefore ? tierAfter : 0, campers: campers.map((m) => m.id), logLine };
}

/** 「收取观测记录」for every returned site at once. */
export function claimAllStargazeSites(state, opts = {}) {
  const sg = ensureStargazeCampState(state);
  if (!sg) return { ok: false, reason: "invalid_state" };
  const results = [];
  for (let i = 0; i < STARGAZE_SITE_COUNT; i += 1) {
    if (sg.sites[i]?.trip?.phase === "returned") results.push(claimStargazeSite(state, i, opts));
  }
  if (!results.length) return { ok: false, reason: "nothing_returned" };
  const rewards = {};
  for (const r of results) for (const [rid, n] of Object.entries(r.rewards || {})) rewards[rid] = (rewards[rid] || 0) + n;
  return {
    ok: true,
    claimed: results.length,
    count: results.reduce((s, r) => s + (r.count || 0), 0),
    rewards,
    newEntries: results.flatMap((r) => r.newEntries || []),
    newTier: Math.max(0, ...results.map((r) => r.newTier || 0)),
    results,
  };
}

export function getStargazeFireFreeLeft(state, nowMs = Date.now()) {
  const sg = state?.meta?.stargazeCamp;
  if (!sg || typeof sg !== "object") return STARGAZE_FIRE_FREE_PER_DAY;
  if (sg.fireDate !== ecoTriLocalYmd(nowMs)) return STARGAZE_FIRE_FREE_PER_DAY;
  return Math.max(0, STARGAZE_FIRE_FREE_PER_DAY - Math.floor(Number(sg.fireUsed) || 0));
}

/** 「添柴守夜」: the camping site with the longest remaining night sees dawn at once. Free once per local day, then futurecoin ×20. */
export function useStargazeCampfire(state, opts = {}) {
  const sg = ensureStargazeCampState(state);
  if (!sg) return { ok: false, reason: "invalid_state" };
  let target = -1;
  let longest = -1;
  sg.sites.forEach((site, i) => {
    const t = site?.trip;
    if (!t || t.phase !== "camping" || !stargazeMonsOf(state, t.camperIds).length) return;
    const left = Math.max(0, t.durationSec - t.elapsedSec);
    if (left > longest) {
      longest = left;
      target = i;
    }
  });
  if (target < 0) return { ok: false, reason: "no_camping" };
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const today = ecoTriLocalYmd(nowMs);
  if (sg.fireDate !== today) {
    sg.fireDate = today;
    sg.fireUsed = 0;
  }
  let costKind = "";
  if (sg.fireUsed < STARGAZE_FIRE_FREE_PER_DAY) {
    sg.fireUsed += 1;
    costKind = "free_daily";
  } else if ((Number(state.res?.futurecoin?.value) || 0) >= STARGAZE_FIRE_COIN_COST) {
    state.res.futurecoin.value = Math.max(0, Math.floor(state.res.futurecoin.value) - STARGAZE_FIRE_COIN_COST);
    costKind = "futurecoin";
  } else {
    return { ok: false, reason: "insufficient_fire_cost" };
  }
  const rng = typeof opts.randFloat === "function" ? opts.randFloat : Math.random;
  const returned = finishStargazeNight(state, sg, target, opts, rng);
  const logLine = `【添柴守夜】营火烧得正旺，「${STARGAZE_SITES[target].name}」的伙伴们一口气看到了天亮（省下约 ${Math.max(1, Math.round(longest / 60))} 分钟）`;
  stargazePushLog(sg, logLine);
  return { ok: true, costKind, idx: target, savedSec: longest, returned, logLine };
}

/** Forced release / star-up material: the camper leaves the tent; an emptied camping site packs up. */
export function detachStargazeCamper(state, monId) {
  const sg = state?.meta?.stargazeCamp;
  const id = Math.floor(Number(monId) || 0);
  if (!sg || typeof sg !== "object" || !Array.isArray(sg.sites) || id <= 0) return { ok: false, detached: false };
  let detached = false;
  for (const site of sg.sites) {
    const trip = site?.trip;
    if (!trip || !Array.isArray(trip.camperIds)) continue;
    const before = trip.camperIds.length;
    trip.camperIds = trip.camperIds.filter((x) => Math.floor(Number(x) || 0) !== id);
    if (trip.camperIds.length !== before) detached = true;
    if (Array.isArray(trip.haul)) for (const h of trip.haul) if (h && Math.floor(Number(h.monId) || 0) === id) h.monId = 0;
    if (trip.phase === "camping" && !trip.camperIds.length) site.trip = null;
  }
  return { ok: true, detached };
}

/** Rebirth: camping sites pack up; returned sites keep their records (claimable later, no exp owner). Atlas and badge are permanent. */
export function recallStargazeCampForRebirth(state) {
  const sg = state?.meta?.stargazeCamp;
  if (!sg || typeof sg !== "object" || !Array.isArray(sg.sites)) return { ok: false, recalled: 0 };
  let recalled = 0;
  for (const site of sg.sites) {
    const trip = site?.trip;
    if (!trip) continue;
    recalled += Array.isArray(trip.camperIds) ? trip.camperIds.length : 0;
    if (trip.phase === "camping") {
      site.trip = null;
      continue;
    }
    trip.camperIds = [];
    if (Array.isArray(trip.haul)) for (const h of trip.haul) if (h) h.monId = 0;
  }
  return { ok: true, recalled };
}

/**
 * Pure non-mutating aggregator of the sky atlas & campfire badge (wired into production / effects / breeding / PvE damage):
 * 每个已登记星座 全产 +0.15%（12 个 = 1.8%）· 每种已登记流星雨 闪光 +1.5%（6 种 = 9%）· 营火徽章每级 捕获 +0.3%、PvE 增伤 +1%。
 */
export function computeStargazeCampBonus(state) {
  const raw = state?.meta?.stargazeCamp;
  const has = Boolean(raw && typeof raw === "object");
  const atlas = has && raw.atlas && typeof raw.atlas === "object" ? raw.atlas : {};
  const stars = STARGAZE_CONSTELLATIONS.filter((c) => (Number(atlas[c.id]?.count) || 0) > 0).length;
  const showers = STARGAZE_SHOWERS.filter((m) => (Number(atlas[m.id]?.count) || 0) > 0).length;
  const entries = stars + showers;
  const tier = getStargazeBadgeTier(entries);
  const round4 = (n) => Math.round(n * 10000) / 10000;
  const prodAdd = round4(stars * 0.0015);
  const shinyAdd = round4(showers * 0.015);
  const catchAdd = round4(tier * 0.003);
  const pveOutAdd = round4(tier * 0.01);
  const sites = has && Array.isArray(raw.sites) ? raw.sites : [];
  const totalNights = has ? Math.max(0, Math.floor(Number(raw.totalNights) || 0)) : 0;
  let campers = 0;
  for (const site of sites.slice(0, STARGAZE_SITE_COUNT)) campers += Array.isArray(site?.trip?.camperIds) ? site.trip.camperIds.length : 0;
  return {
    stars,
    totalStars: STARGAZE_CONSTELLATIONS.length,
    showers,
    totalShowers: STARGAZE_SHOWERS.length,
    entries,
    totalEntries: STARGAZE_ATLAS_SIZE,
    badgeTier: tier,
    maxTier: STARGAZE_BADGE_MAX_TIER,
    badgeName: getStargazeBadgeName(tier),
    nextTier: STARGAZE_BADGE_TIERS.find((t) => t.tier === tier + 1) || null,
    totalNights,
    title: getStargazeTitle(totalNights),
    campers,
    camping: sites.filter((x) => x?.trip?.phase === "camping").length,
    returned: sites.filter((x) => x?.trip?.phase === "returned").length,
    prodAdd,
    prodMul: round4(1 + prodAdd),
    catchAdd,
    shinyAdd,
    shinyChanceMul: round4(1 + shinyAdd),
    pveOutAdd,
    pveOutMul: round4(1 + pveOutAdd),
  };
}

// ============================================================================
// ML-17 「冰晶溜冰场」(Crystal Ice Rink)
// 一块溜冰场一次排一个节目：3 个节目各有 3 个动作，每个动作对应 2 种属性；按动作顺序编排最多 3 位伙伴上冰排练。
// 每个动作的得分 = 有人上场 50 分 + 伙伴属性与动作契合 30 分 + 等级分（每 5 级 1 分，最多 20 分），节目评分 = 三个动作得分的平均（0~100）。
// 评分 ≥90 / 75 / 60 为 S / A / B 级，其余 C 级；排练时长：雪花圆舞曲 30 分钟 · 极光双人滑 45 分钟 · 冰晶探戈 60 分钟。
// 演出结束后等你「领取评分」（已完成未收取：接入一键收取）：灵晶碎片 30 + 未来币（S 12 / A 8 / B 5 / C 3），刷新节目最高分另 +5 未来币；
// 上场伙伴经验 +40、亲密 +2；同时点亮该节目的限时增益：雪花圆舞曲 全产、极光双人滑 捕获（×0.25）、冰晶探戈 PvE 增伤，
// S +8% 60 分钟 / A +5% 45 分钟 / B +3% 30 分钟 / C +1.5% 20 分钟；同类增益取较高加成与较长剩余时间，每类封顶 60 分钟。
// 排练中可「提前退场」（不评分）。上冰伙伴经由 collection_fun.js 统一外出登记表接入防放生锁 / 训练 / 远征 / 冠军赛排除；
// 离线补算 ≤12h（限时增益按真实秒数倒数）；强制放生只让该伙伴离场，转生时排练中的节目散场、已结束的评分保留待领取。
// ============================================================================

export const ICE_RINK_BASE_SCORE = 50;
export const ICE_RINK_MATCH_SCORE = 30;
export const ICE_RINK_LEVEL_PER_POINT = 5;
export const ICE_RINK_LEVEL_SCORE_CAP = 20;
export const ICE_RINK_EXP = 40;
export const ICE_RINK_AFFECTION = 2;
export const ICE_RINK_BASE_MINERALS = 30;
export const ICE_RINK_BEST_COIN = 5;
export const ICE_RINK_BUFF_MAX_SEC = 60 * 60;
export const ICE_RINK_BUFF_MAX_ADD = 0.08;
export const ICE_RINK_MAX_CATCHUP_SEC = 12 * 3600;
export const ICE_RINK_LOG_KEEP = 6;
export { ICE_RINK_SLOTS };

export const ICE_RINK_PROGRAMS = Object.freeze(
  [
    {
      id: "snowWaltz",
      name: ICE_RINK_PROGRAM_NAMES.snowWaltz,
      rehearseMin: 30,
      buffKind: "prod",
      buffScale: 1,
      moves: [
        { name: "雪花旋转", elements: ["water", "wind"] },
        { name: "冰面滑步", elements: ["grass", "light"] },
        { name: "落雪定格", elements: ["stone", "mystic"] },
      ],
      desc: "轻快的三拍子圆舞曲，适合刚学会滑冰的伙伴。",
    },
    {
      id: "auroraDuet",
      name: ICE_RINK_PROGRAM_NAMES.auroraDuet,
      rehearseMin: 45,
      buffKind: "catch",
      buffScale: 0.25,
      moves: [
        { name: "极光托举", elements: ["light", "electric"] },
        { name: "双人螺旋", elements: ["wind", "mystic"] },
        { name: "星光跳跃", elements: ["fire", "water"] },
      ],
      desc: "伙伴们在极光下托举、旋转，观众看得目不转睛。",
    },
    {
      id: "crystalTango",
      name: ICE_RINK_PROGRAM_NAMES.crystalTango,
      rehearseMin: 60,
      buffKind: "pveOut",
      buffScale: 1,
      moves: [
        { name: "冰刃疾滑", elements: ["fire", "electric"] },
        { name: "暗影交错", elements: ["dark", "stone"] },
        { name: "冰晶终章", elements: ["water", "dark"] },
      ],
      desc: "节奏最快的探戈，冰刀划出一道道冰晶火花。",
    },
  ].map((p) => Object.freeze({ ...p, moves: Object.freeze(p.moves.map((m) => Object.freeze({ ...m, elements: Object.freeze(m.elements.slice()) }))) })),
);

export const ICE_RINK_GRADES = Object.freeze([
  Object.freeze({ grade: "S", minScore: 90, buffAdd: 0.08, buffMin: 60, coin: 12 }),
  Object.freeze({ grade: "A", minScore: 75, buffAdd: 0.05, buffMin: 45, coin: 8 }),
  Object.freeze({ grade: "B", minScore: 60, buffAdd: 0.03, buffMin: 30, coin: 5 }),
  Object.freeze({ grade: "C", minScore: 0, buffAdd: 0.015, buffMin: 20, coin: 3 }),
]);

export const ICE_RINK_BUFF_KINDS = Object.freeze(["prod", "catch", "pveOut"]);
export const ICE_RINK_BUFF_ZH = Object.freeze({ prod: "全产", catch: "捕获", pveOut: "PvE 增伤" });
export const ICE_RINK_RES_ZH = Object.freeze({ futurecoin: "未来币", minerals: "灵晶碎片" });

const ICE_RINK_TITLES = Object.freeze([
  { minShows: 40, name: "冰上明星" },
  { minShows: 15, name: "花滑编舞师" },
  { minShows: 3, name: "冰场常客" },
  { minShows: 0, name: "初次上冰" },
]);

export function getIceRinkProgramDef(id) {
  return ICE_RINK_PROGRAMS.find((p) => p.id === id) || null;
}

export function getIceRinkGrade(score = 0) {
  const s = Math.max(0, Math.min(100, Math.floor(Number(score) || 0)));
  return ICE_RINK_GRADES.find((g) => s >= g.minScore) || ICE_RINK_GRADES[ICE_RINK_GRADES.length - 1];
}

export function getIceRinkTitle(totalShows = 0) {
  const n = Math.max(0, Math.floor(Number(totalShows) || 0));
  return (ICE_RINK_TITLES.find((t) => n >= t.minShows) || ICE_RINK_TITLES[ICE_RINK_TITLES.length - 1]).name;
}

/** Timed buff a program grants at a grade: { kind, add, sec }. */
export function getIceRinkBuffFor(programId, grade) {
  const p = getIceRinkProgramDef(programId);
  const g = ICE_RINK_GRADES.find((x) => x.grade === grade) || null;
  if (!p || !g) return null;
  return { kind: p.buffKind, add: Math.round(g.buffAdd * p.buffScale * 10000) / 10000, sec: Math.min(ICE_RINK_BUFF_MAX_SEC, g.buffMin * 60) };
}

/** One skater on one move: 上场 50 + 契合 30 + 等级分（每 5 级 1 分，≤20）. */
export function evaluateIceRinkSkater(mon, programId, slot, opts = {}) {
  const p = getIceRinkProgramDef(programId);
  const i = Math.floor(Number(slot));
  const move = p?.moves?.[i];
  if (!mon || !move) return null;
  const types = acrobatTypesOf(mon, opts);
  const match = types.some((t) => move.elements.includes(t));
  const lvlScore = Math.min(ICE_RINK_LEVEL_SCORE_CAP, Math.floor(Math.max(1, Math.floor(Number(mon.lvl) || 1)) / ICE_RINK_LEVEL_PER_POINT));
  return { slot: i, move: move.name, types, match, lvlScore, score: ICE_RINK_BASE_SCORE + (match ? ICE_RINK_MATCH_SCORE : 0) + lvlScore };
}

function iceMonsById(state) {
  const map = new Map();
  for (const m of Array.isArray(state?.mons?.list) ? state.mons.list : []) if (m && typeof m.id === "number") map.set(m.id, m);
  return map;
}

/** Score of an arrangement (array aligned to the 3 moves; 0 = empty move). */
export function scoreIceRinkArrangement(state, programId, skaterIds, opts = {}) {
  const byId = iceMonsById(state);
  const slots = [];
  for (let i = 0; i < ICE_RINK_SLOTS; i += 1) {
    const id = Math.floor(Number(skaterIds?.[i]) || 0);
    const mon = id > 0 ? byId.get(id) || null : null;
    const ev = mon ? evaluateIceRinkSkater(mon, programId, i, opts) : null;
    slots.push({ slot: i, monId: mon ? mon.id : 0, match: Boolean(ev?.match), score: ev ? ev.score : 0 });
  }
  const score = Math.round(slots.reduce((s, x) => s + x.score, 0) / ICE_RINK_SLOTS);
  return { slots, score, grade: getIceRinkGrade(score).grade, matchCount: slots.filter((x) => x.match).length };
}

/** 「一键编排」preview: for each move in order, the idle partner that scores best on it (non-mutating). */
export function previewIceRinkArrangement(state, programId, opts = {}) {
  const p = getIceRinkProgramDef(programId);
  if (!p) return null;
  const idle = getIdleIceRinkCandidates(state).slice();
  const picks = [];
  for (let i = 0; i < ICE_RINK_SLOTS; i += 1) {
    let best = null;
    let bestScore = -1;
    for (const m of idle) {
      if (picks.includes(m.id)) continue;
      const ev = evaluateIceRinkSkater(m, p.id, i, opts);
      const s = ev ? ev.score * 1000 - Math.min(999, m.id || 0) : -1;
      if (s > bestScore) {
        bestScore = s;
        best = m;
      }
    }
    picks.push(best ? best.id : 0);
  }
  return { programId: p.id, skaterIds: picks, ...scoreIceRinkArrangement(state, p.id, picks, opts) };
}

function ml17AliveSetOf(state) {
  const monList = Array.isArray(state?.mons?.list) ? state.mons.list : null;
  return monList
    ? new Set(
        monList
          .map((m) => (m && typeof m.id === "number" && Number.isFinite(m.id) ? Math.floor(m.id) : null))
          .filter((x) => x !== null && x > 0),
      )
    : null;
}

function normalizeIceRinkShow(raw, aliveSet) {
  if (!raw || typeof raw !== "object") return null;
  const p = getIceRinkProgramDef(raw.programId);
  if (!p) return null;
  const skaterIds = [];
  for (let i = 0; i < ICE_RINK_SLOTS; i += 1) {
    const id = Math.floor(Number(Array.isArray(raw.skaterIds) ? raw.skaterIds[i] : 0) || 0);
    skaterIds.push(id > 0 && !skaterIds.includes(id) && (!aliveSet || aliveSet.has(id)) ? id : 0);
  }
  const phase = raw.phase === "finished" ? "finished" : "rehearsing";
  if (phase === "rehearsing" && !skaterIds.some((x) => x > 0)) return null;
  const durationSec = p.rehearseMin * 60;
  const elapsed = Number(raw.elapsedSec);
  const score = Math.max(0, Math.min(100, Math.floor(Number(raw.score) || 0)));
  return {
    programId: p.id,
    skaterIds,
    phase,
    durationSec,
    elapsedSec: phase === "finished" ? durationSec : Number.isFinite(elapsed) && elapsed > 0 ? Math.min(durationSec, elapsed) : 0,
    score: phase === "finished" ? score : 0,
    grade: phase === "finished" ? getIceRinkGrade(score).grade : "",
    slotScores: phase === "finished" && Array.isArray(raw.slotScores) ? raw.slotScores.slice(0, ICE_RINK_SLOTS).map((v) => Math.max(0, Math.min(100, Math.floor(Number(v) || 0)))) : [],
    startedAt: typeof raw.startedAt === "number" && Number.isFinite(raw.startedAt) ? raw.startedAt : 0,
  };
}

export function ensureIceRinkState(state) {
  if (!state || typeof state !== "object") return null;
  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  const raw = state.meta.iceRink && typeof state.meta.iceRink === "object" ? state.meta.iceRink : {};
  const aliveSet = ml17AliveSetOf(state);
  const rawBuffs = raw.buffs && typeof raw.buffs === "object" ? raw.buffs : {};
  const buffs = {};
  for (const kind of ICE_RINK_BUFF_KINDS) {
    const b = rawBuffs[kind];
    const add = Math.max(0, Math.min(ICE_RINK_BUFF_MAX_ADD, Number(b?.add) || 0));
    const leftSec = Math.max(0, Math.min(ICE_RINK_BUFF_MAX_SEC, Number(b?.leftSec) || 0));
    if (add > 0 && leftSec > 0) buffs[kind] = { add: Math.round(add * 10000) / 10000, leftSec };
  }
  const rawBest = raw.best && typeof raw.best === "object" ? raw.best : {};
  const best = {};
  for (const p of ICE_RINK_PROGRAMS) {
    const v = Math.max(0, Math.min(100, Math.floor(Number(rawBest[p.id]) || 0)));
    if (v > 0) best[p.id] = v;
  }
  const rawGrades = raw.gradeCounts && typeof raw.gradeCounts === "object" ? raw.gradeCounts : {};
  const gradeCounts = {};
  for (const g of ICE_RINK_GRADES) {
    const v = Math.max(0, Math.floor(Number(rawGrades[g.grade]) || 0));
    if (v > 0) gradeCounts[g.grade] = v;
  }
  const lc = raw.lastClaim && typeof raw.lastClaim === "object" ? raw.lastClaim : null;
  const lcProgram = lc ? getIceRinkProgramDef(lc.programId) : null;
  const lastClaim = lcProgram
    ? {
        programId: lcProgram.id,
        score: Math.max(0, Math.min(100, Math.floor(Number(lc.score) || 0))),
        grade: getIceRinkGrade(lc.score).grade,
        rewards: (() => {
          const out = {};
          for (const [rid, v] of Object.entries(lc.rewards && typeof lc.rewards === "object" ? lc.rewards : {})) {
            const n = Math.max(0, Math.min(99999, Math.floor(Number(v) || 0)));
            if (ICE_RINK_RES_ZH[rid] && n > 0) out[rid] = n;
          }
          return out;
        })(),
        newBest: Boolean(lc.newBest),
        at: typeof lc.at === "number" && Number.isFinite(lc.at) ? lc.at : 0,
      }
    : null;
  const clean = {
    initialized: true,
    show: normalizeIceRinkShow(raw.show, aliveSet),
    buffs,
    best,
    gradeCounts,
    totalShows: Math.max(0, Math.floor(Number(raw.totalShows) || 0)),
    lastClaim,
    recentLogs: Array.isArray(raw.recentLogs) ? raw.recentLogs.filter((s) => typeof s === "string" && s.trim().length > 0).slice(0, ICE_RINK_LOG_KEEP) : [],
  };
  if (state.meta.iceRink && typeof state.meta.iceRink === "object") {
    Object.assign(state.meta.iceRink, clean);
    return state.meta.iceRink;
  }
  state.meta.iceRink = clean;
  return clean;
}

function icePushLog(rink, line) {
  rink.recentLogs = [line, ...(rink.recentLogs || [])].slice(0, ICE_RINK_LOG_KEEP);
}

function finishIceRinkShow(state, rink, opts) {
  const show = rink.show;
  if (!show || show.phase !== "rehearsing") return null;
  const p = getIceRinkProgramDef(show.programId) || ICE_RINK_PROGRAMS[0];
  const res = scoreIceRinkArrangement(state, p.id, show.skaterIds, opts);
  show.phase = "finished";
  show.elapsedSec = show.durationSec;
  show.score = res.score;
  show.grade = res.grade;
  show.slotScores = res.slots.map((x) => x.score);
  icePushLog(rink, `【演出结束】「${p.name}」谢幕，评委打出 ${res.score} 分（${res.grade} 级），快去领取评分与限时增益`);
  return { programId: p.id, score: res.score, grade: res.grade };
}

/** Live tick + offline catch-up (≤12h): the rehearsal advances; timed buffs count down in real seconds. */
export function advanceIceRink(state, dtSec, opts = {}) {
  const rink = state?.meta?.iceRink;
  const empty = { finished: null, cancelled: false, expiredBuffs: [] };
  if (!rink || typeof rink !== "object") return empty;
  const step = typeof dtSec === "number" && Number.isFinite(dtSec) && dtSec > 0 ? Math.min(ICE_RINK_MAX_CATCHUP_SEC, dtSec) : 0;
  if (step <= 0) return empty;
  const expiredBuffs = [];
  if (!rink.buffs || typeof rink.buffs !== "object") rink.buffs = {};
  for (const kind of ICE_RINK_BUFF_KINDS) {
    const b = rink.buffs[kind];
    if (!b) continue;
    b.leftSec = Math.max(0, (Number(b.leftSec) || 0) - step);
    if (!(b.leftSec > 0)) {
      delete rink.buffs[kind];
      expiredBuffs.push(kind);
    }
  }
  let finished = null;
  let cancelled = false;
  const show = rink.show;
  if (show && show.phase === "rehearsing") {
    const byId = iceMonsById(state);
    if (!(show.skaterIds || []).some((id) => id > 0 && byId.has(id))) {
      rink.show = null;
      cancelled = true;
    } else {
      show.elapsedSec = Math.min(show.durationSec, (Number(show.elapsedSec) || 0) + step);
      if (show.elapsedSec >= show.durationSec - 1e-9) finished = finishIceRinkShow(state, rink, opts);
    }
  }
  return { finished, cancelled, expiredBuffs };
}

/** Starts a program with up to 3 idle skaters aligned to its moves (0 = empty move). */
export function startIceRinkShow(state, programId, skaterIds, opts = {}) {
  const rink = ensureIceRinkState(state);
  if (!rink) return { ok: false, reason: "invalid_state" };
  const p = getIceRinkProgramDef(programId);
  if (!p) return { ok: false, reason: "unknown_program" };
  if (rink.show) return { ok: false, reason: "rink_busy" };
  const ids = [];
  for (let i = 0; i < ICE_RINK_SLOTS; i += 1) {
    const id = Math.floor(Number(Array.isArray(skaterIds) ? skaterIds[i] : 0) || 0);
    ids.push(id > 0 && !ids.includes(id) ? id : 0);
  }
  if (!ids.some((x) => x > 0)) return { ok: false, reason: "no_skaters" };
  const idle = new Set(getIdleIceRinkCandidates(state).map((m) => m.id));
  if (ids.some((id) => id > 0 && !idle.has(id))) return { ok: false, reason: "mon_busy" };
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  rink.show = { programId: p.id, skaterIds: ids, phase: "rehearsing", durationSec: p.rehearseMin * 60, elapsedSec: 0, score: 0, grade: "", slotScores: [], startedAt: nowMs };
  const preview = scoreIceRinkArrangement(state, p.id, ids, opts);
  icePushLog(rink, `【上冰排练】${ids.filter((x) => x > 0).length} 位伙伴开始排练「${p.name}」（约 ${p.rehearseMin} 分钟 · 预计 ${preview.score} 分），排练期间防放生保护生效`);
  return { ok: true, programId: p.id, skaterIds: ids.slice(), durationSec: p.rehearseMin * 60, expectScore: preview.score, expectGrade: preview.grade, matchCount: preview.matchCount };
}

/** 「一键编排」: arranges the best idle skaters for the program and starts the rehearsal. */
export function autoArrangeIceRink(state, programId, opts = {}) {
  const rink = ensureIceRinkState(state);
  if (!rink) return { ok: false, reason: "invalid_state" };
  if (rink.show) return { ok: false, reason: "rink_busy" };
  const pre = previewIceRinkArrangement(state, programId, opts);
  if (!pre) return { ok: false, reason: "unknown_program" };
  if (!pre.skaterIds.some((x) => x > 0)) return { ok: false, reason: "no_idle_mons" };
  return startIceRinkShow(state, programId, pre.skaterIds, opts);
}

/** 「提前退场」: a rehearsing program ends at once (no score). */
export function leaveIceRinkShow(state) {
  const rink = ensureIceRinkState(state);
  if (!rink) return { ok: false, reason: "invalid_state" };
  const show = rink.show;
  if (!show) return { ok: false, reason: "no_show" };
  if (show.phase !== "rehearsing") return { ok: false, reason: "already_finished" };
  rink.show = null;
  icePushLog(rink, `【提前退场】「${getIceRinkProgramDef(show.programId)?.name || "节目"}」的排练提前结束，这次没有评分`);
  return { ok: true, left: show.skaterIds.filter((x) => x > 0).length };
}

/** 「领取评分」: rewards + the program's timed buff (same kind: higher add, longer time, ≤60 min); skaters +40 exp / +2 affection and come home. */
export function claimIceRinkShow(state, opts = {}) {
  const rink = ensureIceRinkState(state);
  if (!rink) return { ok: false, reason: "invalid_state" };
  const show = rink.show;
  if (!show || show.phase !== "finished") return { ok: false, reason: "not_finished" };
  const p = getIceRinkProgramDef(show.programId) || ICE_RINK_PROGRAMS[0];
  const g = getIceRinkGrade(show.score);
  const rewards = { minerals: ICE_RINK_BASE_MINERALS, futurecoin: g.coin };
  const newBest = show.score > (rink.best[p.id] || 0);
  if (newBest) {
    rink.best[p.id] = show.score;
    rewards.futurecoin += ICE_RINK_BEST_COIN;
  }
  applyRewardGrant(state, rewards, { addRes: opts.addRes, addExpToMon: opts.addExpToMon, squadMons: [] });
  const byId = iceMonsById(state);
  const skaters = show.skaterIds.map((id) => byId.get(id)).filter(Boolean);
  for (const m of skaters) {
    if (typeof opts.addExpToMon === "function") opts.addExpToMon(m, ICE_RINK_EXP);
    else m.exp = Math.max(0, Math.floor((Number(m.exp) || 0) + ICE_RINK_EXP));
    const aff0 = typeof m.affection === "number" && Number.isFinite(m.affection) ? m.affection : 0;
    m.affection = Math.min(100, Math.max(0, aff0 + ICE_RINK_AFFECTION));
  }
  const buff = getIceRinkBuffFor(p.id, g.grade);
  const prev = rink.buffs[buff.kind];
  rink.buffs[buff.kind] = {
    add: Math.min(ICE_RINK_BUFF_MAX_ADD, Math.max(prev?.add || 0, buff.add)),
    leftSec: Math.min(ICE_RINK_BUFF_MAX_SEC, Math.max(prev?.leftSec || 0, buff.sec)),
  };
  rink.show = null;
  rink.totalShows = (rink.totalShows || 0) + 1;
  rink.gradeCounts[g.grade] = (rink.gradeCounts[g.grade] || 0) + 1;
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  rink.lastClaim = { programId: p.id, score: show.score, grade: g.grade, rewards: { ...rewards }, newBest, at: nowMs };
  const rewardTxt = Object.entries(rewards)
    .map(([rid, n]) => `${ICE_RINK_RES_ZH[rid] || rid} +${n}`)
    .join("、");
  const logLine = `【领取评分】「${p.name}」${show.score} 分（${g.grade} 级）${newBest ? "，刷新最高分" : ""}，换来 ${rewardTxt}；${ICE_RINK_BUFF_ZH[buff.kind]} +${Math.round(buff.add * 1000) / 10}% 持续 ${Math.round(buff.sec / 60)} 分钟`;
  icePushLog(rink, logLine);
  return { ok: true, programId: p.id, score: show.score, grade: g.grade, rewards, newBest, buff: { ...buff }, skaters: skaters.map((m) => m.id), logLine };
}

/** Forced release / star-up material: the skater leaves the ice; an emptied rehearsal ends. */
export function detachIceRinkSkater(state, monId) {
  const rink = state?.meta?.iceRink;
  const id = Math.floor(Number(monId) || 0);
  const show = rink?.show;
  if (!show || !Array.isArray(show.skaterIds) || id <= 0) return { ok: false, detached: false };
  const before = show.skaterIds.filter((x) => x > 0).length;
  show.skaterIds = show.skaterIds.map((x) => (Math.floor(Number(x) || 0) === id ? 0 : x));
  const detached = show.skaterIds.filter((x) => x > 0).length !== before;
  if (show.phase === "rehearsing" && !show.skaterIds.some((x) => x > 0)) rink.show = null;
  return { ok: true, detached };
}

/** Rebirth: a rehearsing program ends; a finished score stays claimable (skaters already home). Buffs and records are kept. */
export function recallIceRinkForRebirth(state) {
  const rink = state?.meta?.iceRink;
  const show = rink?.show;
  if (!show) return { ok: false, recalled: 0 };
  const recalled = Array.isArray(show.skaterIds) ? show.skaterIds.filter((x) => x > 0).length : 0;
  if (show.phase !== "finished") rink.show = null;
  else show.skaterIds = [0, 0, 0];
  return { ok: true, recalled };
}

/** Pure aggregator of the active timed buffs (wired into production / effects / PvE damage). */
export function computeIceRinkBuffs(state) {
  const raw = state?.meta?.iceRink;
  const has = Boolean(raw && typeof raw === "object");
  const buffs = has && raw.buffs && typeof raw.buffs === "object" ? raw.buffs : {};
  const round4 = (n) => Math.round(n * 10000) / 10000;
  const addOf = (kind) => {
    const b = buffs[kind];
    return b && (Number(b.leftSec) || 0) > 0 ? Math.max(0, Math.min(ICE_RINK_BUFF_MAX_ADD, Number(b.add) || 0)) : 0;
  };
  const prodAdd = round4(addOf("prod"));
  const catchAdd = round4(addOf("catch"));
  const pveOutAdd = round4(addOf("pveOut"));
  const active = ICE_RINK_BUFF_KINDS.filter((k) => addOf(k) > 0).map((k) => ({ kind: k, add: addOf(k), leftSec: Math.floor(Number(buffs[k].leftSec) || 0) }));
  const totalShows = has ? Math.max(0, Math.floor(Number(raw.totalShows) || 0)) : 0;
  const show = has && raw.show && typeof raw.show === "object" ? raw.show : null;
  return {
    active,
    totalShows,
    title: getIceRinkTitle(totalShows),
    rehearsing: show?.phase === "rehearsing",
    finished: show?.phase === "finished",
    skaters: show && Array.isArray(show.skaterIds) ? show.skaterIds.filter((x) => x > 0).length : 0,
    prodAdd,
    prodMul: round4(1 + prodAdd),
    catchAdd,
    pveOutAdd,
    pveOutMul: round4(1 + pveOutAdd),
  };
}

// ============================================================================
// ML-17 「花田蜜蜂工坊」(Flower-Field Bee Workshop)
// 3 个蜂箱（向阳蜂箱 40 分钟 · 溪畔蜂箱 60 分钟 · 林间蜂箱 90 分钟），每个最多 2 位伙伴照料花田与蜂箱。
// 花种按本地日期轮换：8 种花每天开 3 种（3 个蜂箱各对着一种），约 3 天开遍；出发时锁定当天的花种。
// 照料完成时每位伙伴酿出 1 罐该花的蜂蜜：伙伴属性与花种相同另 +1 罐，与蜂箱属性契合再有 50% 概率 +1 罐（每位最多 3 罐）。
// 完成的蜂箱等你「收取蜂蜜」（已完成未收取：接入一键收取）：每罐 灵果 40 + 灵木 20，第一次登记进蜂蜜图鉴的蜂蜜另 +6 未来币；
// 照料伙伴经验 +40、亲密 +2。蜂蜜图鉴 8 种，登记 2 / 4 / 6 / 8 种升为铜 / 银 / 金 / 琥珀蜂巢徽章：
// 每种蜂蜜 全产 +0.25%（封顶 2%），蜂巢徽章每级 捕获 +0.25%、闪光 +1%（封顶 1% / 4%）。
// 照料中可「召回」（不带回蜂蜜）。照料伙伴经由统一外出登记表接入防放生锁 / 训练 / 远征 / 冠军赛排除；
// 离线补算 ≤12h（多个蜂箱按完成先后结算）；强制放生 / 转生召回照料中的蜂箱，图鉴与徽章永久保留。
// ============================================================================

export const BEE_BLOOMS_PER_DAY = 3;
export const BEE_FLOWER_MATCH_JARS = 1;
export const BEE_HIVE_MATCH_CHANCE = 0.5;
export const BEE_MAX_JARS_PER_KEEPER = 3;
export const BEE_EXP = 40;
export const BEE_AFFECTION = 2;
export const BEE_NEW_HONEY_COIN = 6;
export const BEE_MAX_CATCHUP_SEC = 12 * 3600;
export const BEE_LOG_KEEP = 6;
export { BEE_HIVE_COUNT, BEE_MAX_KEEPERS, BEE_SEATS };

export const BEE_HIVES = Object.freeze(
  [
    { id: "sunnyHive", name: BEE_HIVE_NAMES[0], elements: ["grass", "light", "fire"], tendMin: 40, desc: "朝南的山坡，蜜蜂一早就嗡嗡地出门采蜜。" },
    { id: "brookHive", name: BEE_HIVE_NAMES[1], elements: ["water", "wind", "electric"], tendMin: 60, desc: "小溪边的花田，风一吹满是花香。" },
    { id: "groveHive", name: BEE_HIVE_NAMES[2], elements: ["stone", "dark", "mystic"], tendMin: 90, desc: "林子深处的老蜂箱，酿出的蜜又浓又香。" },
  ].map((h) => Object.freeze({ ...h, elements: Object.freeze(h.elements.slice()) })),
);

export const BEE_FLOWERS = Object.freeze(
  [
    { id: "sunflower", name: "向日葵", honey: "向日葵蜜", element: "light", desc: "金灿灿的蜜，带着阳光的味道。" },
    { id: "lavender", name: "薰衣草", honey: "薰衣草蜜", element: "mystic", desc: "淡紫色的蜜，闻一闻就想睡个好觉。" },
    { id: "rapeseed", name: "油菜花", honey: "油菜花蜜", element: "grass", desc: "春天最常见的蜜，清甜不腻。" },
    { id: "lotus", name: "荷花", honey: "荷花蜜", element: "water", desc: "清清爽爽的蜜，像夏天池塘的风。" },
    { id: "wildRose", name: "野玫瑰", honey: "玫瑰蜜", element: "fire", desc: "粉红色的蜜，甜里带一点点花瓣香。" },
    { id: "lilyValley", name: "铃兰", honey: "铃兰蜜", element: "wind", desc: "一串串小白铃铛酿出的蜜，轻盈透亮。" },
    { id: "edelweiss", name: "雪绒花", honey: "雪绒花蜜", element: "stone", desc: "高山岩缝里的花，蜜少而珍贵。" },
    { id: "nightJasmine", name: "夜来香", honey: "夜来香蜜", element: "dark", desc: "只在夜里开放，蜜香会悄悄飘满屋子。" },
  ].map((f) => Object.freeze(f)),
);

export const BEE_REWARDS_PER_JAR = Object.freeze({ catnip: 40, wood: 20 });

export const BEE_BADGE_TIERS = Object.freeze([
  Object.freeze({ tier: 1, name: "铜蜂巢徽章", minHoneys: 2 }),
  Object.freeze({ tier: 2, name: "银蜂巢徽章", minHoneys: 4 }),
  Object.freeze({ tier: 3, name: "金蜂巢徽章", minHoneys: 6 }),
  Object.freeze({ tier: 4, name: "琥珀蜂巢徽章", minHoneys: 8 }),
]);
export const BEE_BADGE_MAX_TIER = BEE_BADGE_TIERS.length;

export const BEE_RES_ZH = Object.freeze({ futurecoin: "未来币", catnip: "灵果", wood: "灵木" });

const BEE_TITLES = Object.freeze([
  { minTrips: 50, name: "花田养蜂大师" },
  { minTrips: 15, name: "熟练养蜂人" },
  { minTrips: 3, name: "花田帮手" },
  { minTrips: 0, name: "养蜂学徒" },
]);

export function getBeeHiveDef(id) {
  return BEE_HIVES.find((h) => h.id === id) || null;
}

export function getBeeFlowerDef(id) {
  return BEE_FLOWERS.find((f) => f.id === id) || null;
}

export function getBeeTitle(totalTrips = 0) {
  const n = Math.max(0, Math.floor(Number(totalTrips) || 0));
  return (BEE_TITLES.find((t) => n >= t.minTrips) || BEE_TITLES[BEE_TITLES.length - 1]).name;
}

export function getBeeBadgeTier(honeys = 0) {
  const n = Math.max(0, Math.floor(Number(honeys) || 0));
  let tier = 0;
  for (const t of BEE_BADGE_TIERS) if (n >= t.minHoneys) tier = t.tier;
  return tier;
}

export function getBeeBadgeName(tier) {
  return BEE_BADGE_TIERS.find((t) => t.tier === tier)?.name || "未获蜂巢徽章";
}

/** Today's blooms by local date: 3 consecutive flowers starting at (day × 3) mod 8, hive i faces bloom i; changes at local midnight. */
export function getBeeBloomRotation(nowMs = Date.now()) {
  const d = new Date(nowMs);
  const dayIdx = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  const n = BEE_FLOWERS.length;
  const at = (day) => {
    const k = (((day * BEE_BLOOMS_PER_DAY) % n) + n) % n;
    return Array.from({ length: BEE_BLOOMS_PER_DAY }, (_, i) => BEE_FLOWERS[(k + i) % n]);
  };
  const blooms = at(dayIdx);
  const tomorrow = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
  return {
    dayIdx,
    blooms,
    bloomIds: blooms.map((f) => f.id),
    nextBlooms: at(dayIdx + 1),
    msUntilChange: Math.max(0, tomorrow - nowMs),
  };
}

/** Keeper preview at a hive for a flower: 花种契合 (+1 jar), 蜂箱契合 (50% +1 jar). */
export function evaluateBeeKeeper(mon, hiveId, flowerId, opts = {}) {
  const hive = getBeeHiveDef(hiveId);
  const flower = getBeeFlowerDef(flowerId);
  if (!mon || !hive || !flower) return null;
  const types = acrobatTypesOf(mon, opts);
  const flowerMatch = types.includes(flower.element);
  const hiveMatch = types.some((t) => hive.elements.includes(t));
  return { hiveId: hive.id, flowerId: flower.id, types, flowerMatch, hiveMatch, baseJars: 1 + (flowerMatch ? BEE_FLOWER_MATCH_JARS : 0), extraChance: hiveMatch ? BEE_HIVE_MATCH_CHANCE : 0 };
}

function normalizeBeeTrip(raw, hiveDef, hiveIdx, aliveSet, usedIds) {
  if (!raw || typeof raw !== "object" || !hiveDef) return null;
  const keeperIds = [];
  for (const v of Array.isArray(raw.keeperIds) ? raw.keeperIds : []) {
    const id = Math.floor(Number(v) || 0);
    if (id <= 0 || keeperIds.includes(id) || usedIds.has(id) || (aliveSet && !aliveSet.has(id))) continue;
    keeperIds.push(id);
    if (keeperIds.length >= BEE_SEATS) break;
  }
  const phase = raw.phase === "done" ? "done" : "tending";
  if (phase === "tending" && !keeperIds.length) return null;
  for (const id of keeperIds) usedIds.add(id);
  const durationSec = hiveDef.tendMin * 60;
  const elapsed = Number(raw.elapsedSec);
  const departedAt = typeof raw.departedAt === "number" && Number.isFinite(raw.departedAt) && raw.departedAt > 0 ? raw.departedAt : 0;
  const flowerId = getBeeFlowerDef(raw.flowerId)?.id || getBeeBloomRotation(departedAt || Date.now()).bloomIds[hiveIdx] || BEE_FLOWERS[0].id;
  const haul =
    phase === "done"
      ? (Array.isArray(raw.haul) ? raw.haul : [])
          .map((h) => {
            const f = h && typeof h === "object" ? getBeeFlowerDef(h.flowerId) : null;
            if (!f) return null;
            const monId = Math.max(0, Math.floor(Number(h.monId) || 0));
            return { flowerId: f.id, monId: keeperIds.includes(monId) ? monId : 0 };
          })
          .filter(Boolean)
          .slice(0, BEE_SEATS * BEE_MAX_JARS_PER_KEEPER)
      : [];
  return {
    hiveId: hiveDef.id,
    keeperIds,
    phase,
    durationSec,
    elapsedSec: phase === "done" ? durationSec : Number.isFinite(elapsed) && elapsed > 0 ? Math.min(durationSec, elapsed) : 0,
    flowerId,
    haul,
    departedAt,
  };
}

export function ensureBeeWorkshopState(state) {
  if (!state || typeof state !== "object") return null;
  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  const raw = state.meta.beeWorkshop && typeof state.meta.beeWorkshop === "object" ? state.meta.beeWorkshop : {};
  const aliveSet = ml17AliveSetOf(state);
  const rawHives = Array.isArray(raw.hives) ? raw.hives : [];
  const usedIds = new Set();
  const hives = BEE_HIVES.map((def, i) => ({ trip: normalizeBeeTrip(rawHives[i]?.trip, def, i, aliveSet, usedIds) }));
  const rawCodex = raw.codex && typeof raw.codex === "object" ? raw.codex : {};
  const codex = {};
  for (const f of BEE_FLOWERS) {
    const count = Math.max(0, Math.min(999999, Math.floor(Number(rawCodex[f.id]?.count) || 0)));
    if (count > 0) codex[f.id] = { count };
  }
  const lc = raw.lastClaim && typeof raw.lastClaim === "object" ? raw.lastClaim : null;
  const lastClaim = lc
    ? {
        jars: Math.max(0, Math.min(99, Math.floor(Number(lc.jars) || 0))),
        hiveId: getBeeHiveDef(lc.hiveId)?.id || "",
        flowerId: getBeeFlowerDef(lc.flowerId)?.id || "",
        rewards: (() => {
          const out = {};
          for (const [rid, v] of Object.entries(lc.rewards && typeof lc.rewards === "object" ? lc.rewards : {})) {
            const n = Math.max(0, Math.min(99999, Math.floor(Number(v) || 0)));
            if (BEE_RES_ZH[rid] && n > 0) out[rid] = n;
          }
          return out;
        })(),
        newHoney: Boolean(lc.newHoney),
        at: typeof lc.at === "number" && Number.isFinite(lc.at) ? lc.at : 0,
      }
    : null;
  const clean = {
    initialized: true,
    hives,
    codex,
    totalTrips: Math.max(0, Math.floor(Number(raw.totalTrips) || 0)),
    totalJars: Math.max(0, Math.floor(Number(raw.totalJars) || 0)),
    lastClaim,
    recentLogs: Array.isArray(raw.recentLogs) ? raw.recentLogs.filter((s) => typeof s === "string" && s.trim().length > 0).slice(0, BEE_LOG_KEEP) : [],
  };
  if (state.meta.beeWorkshop && typeof state.meta.beeWorkshop === "object") {
    Object.assign(state.meta.beeWorkshop, clean);
    return state.meta.beeWorkshop;
  }
  state.meta.beeWorkshop = clean;
  return clean;
}

function beePushLog(bw, line) {
  bw.recentLogs = [line, ...(bw.recentLogs || [])].slice(0, BEE_LOG_KEEP);
}

function beeMonsOf(state, ids) {
  const list = Array.isArray(state?.mons?.list) ? state.mons.list : [];
  return (Array.isArray(ids) ? ids : []).map((id) => list.find((m) => m && m.id === id)).filter(Boolean);
}

/** Tending done: every keeper fills 1 jar (+1 flower-matched, +1 at 50% hive-matched, ≤3). */
function finishBeeHive(state, bw, idx, opts, rng) {
  const trip = bw.hives[idx]?.trip;
  if (!trip || trip.phase !== "tending") return null;
  const hive = getBeeHiveDef(trip.hiveId) || BEE_HIVES[idx];
  const flower = getBeeFlowerDef(trip.flowerId) || BEE_FLOWERS[0];
  const haul = [];
  for (const mon of beeMonsOf(state, trip.keeperIds)) {
    const ev = evaluateBeeKeeper(mon, hive.id, flower.id, opts);
    let jars = ev ? ev.baseJars : 1;
    if (ev?.hiveMatch && (Number(rng()) || 0) < BEE_HIVE_MATCH_CHANCE) jars += 1;
    jars = Math.min(BEE_MAX_JARS_PER_KEEPER, jars);
    for (let k = 0; k < jars; k += 1) haul.push({ flowerId: flower.id, monId: mon.id });
  }
  trip.phase = "done";
  trip.elapsedSec = trip.durationSec;
  trip.haul = haul;
  beePushLog(bw, `【照料完成】「${hive.name}」的伙伴们酿好了 ${haul.length} 罐${flower.honey}，快去收取蜂蜜`);
  return { idx, hiveId: hive.id, flowerId: flower.id, jars: haul.length };
}

/** Live tick + offline catch-up (≤12h): every tending hive advances; hives finish in order of their remaining time. */
export function advanceBeeWorkshop(state, dtSec, opts = {}) {
  const bw = state?.meta?.beeWorkshop;
  const empty = { done: [], cancelled: 0 };
  if (!bw || typeof bw !== "object" || !Array.isArray(bw.hives)) return empty;
  const step = typeof dtSec === "number" && Number.isFinite(dtSec) && dtSec > 0 ? Math.min(BEE_MAX_CATCHUP_SEC, dtSec) : 0;
  if (step <= 0) return empty;
  const rng = typeof opts.randFloat === "function" ? opts.randFloat : Math.random;
  let cancelled = 0;
  const tending = [];
  bw.hives.forEach((hive, idx) => {
    const trip = hive?.trip;
    if (!trip || trip.phase !== "tending") return;
    if (!beeMonsOf(state, trip.keeperIds).length) {
      hive.trip = null;
      cancelled += 1;
      return;
    }
    tending.push({ idx, left: Math.max(0, (Number(trip.durationSec) || 0) - (Number(trip.elapsedSec) || 0)) });
  });
  tending.sort((a, b) => a.left - b.left || a.idx - b.idx);
  const done = [];
  for (const t of tending) {
    const trip = bw.hives[t.idx].trip;
    trip.elapsedSec = Math.min(trip.durationSec, (Number(trip.elapsedSec) || 0) + step);
    if (trip.elapsedSec >= trip.durationSec - 1e-9) {
      const r = finishBeeHive(state, bw, t.idx, opts, rng);
      if (r) done.push(r);
    }
  }
  return { done, cancelled };
}

/** Sends 1~2 idle partners to tend hive `idx`; today's flower for that hive is locked now. */
export function dispatchBeeHive(state, idx, monIds, opts = {}) {
  const bw = ensureBeeWorkshopState(state);
  if (!bw) return { ok: false, reason: "invalid_state" };
  const i = Math.floor(Number(idx));
  if (!(i >= 0 && i < BEE_HIVE_COUNT)) return { ok: false, reason: "unknown_hive" };
  if (bw.hives[i].trip) return { ok: false, reason: "hive_busy" };
  const hive = BEE_HIVES[i];
  const ids = [];
  for (const v of Array.isArray(monIds) ? monIds : []) {
    const id = Math.floor(Number(v) || 0);
    if (id > 0 && !ids.includes(id)) ids.push(id);
  }
  if (!ids.length) return { ok: false, reason: "no_keepers" };
  if (ids.length > BEE_SEATS) return { ok: false, reason: "too_many_keepers" };
  const idle = getIdleBeeCandidates(state);
  const mons = ids.map((id) => idle.find((m) => m.id === id) || null);
  if (mons.some((m) => !m)) return { ok: false, reason: "mon_busy" };
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const flower = getBeeBloomRotation(nowMs).blooms[i];
  bw.hives[i].trip = { hiveId: hive.id, keeperIds: ids, phase: "tending", durationSec: hive.tendMin * 60, elapsedSec: 0, flowerId: flower.id, haul: [], departedAt: nowMs };
  const flowerMatch = mons.filter((m) => evaluateBeeKeeper(m, hive.id, flower.id, opts)?.flowerMatch).length;
  beePushLog(bw, `【照料花田】${mons.map((m) => m.name || "伙伴").join("、")} 去「${hive.name}」照料${flower.name}花田（约 ${hive.tendMin} 分钟${flowerMatch ? ` · 花种契合 ${flowerMatch} 位` : ""}），照料期间防放生保护生效`);
  return { ok: true, idx: i, hiveId: hive.id, flowerId: flower.id, keeperIds: ids.slice(), durationSec: hive.tendMin * 60, flowerMatch };
}

function scoreBeeKeeper(mon, hiveId, flowerId, opts) {
  const ev = evaluateBeeKeeper(mon, hiveId, flowerId, opts);
  if (!ev) return -1;
  return (ev.flowerMatch ? 2000 : 0) + (ev.hiveMatch ? 1000 : 0) + Math.max(1, Math.floor(Number(mon.lvl) || 1));
}

/** 「一键照料」: every empty hive takes its 2 best idle keepers (flower-matched first, then hive-matched, then level). */
export function autoDispatchBeeHives(state, opts = {}) {
  const bw = ensureBeeWorkshopState(state);
  if (!bw) return { ok: false, dispatched: [] };
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const blooms = getBeeBloomRotation(nowMs).blooms;
  const dispatched = [];
  for (let i = 0; i < BEE_HIVE_COUNT; i += 1) {
    if (bw.hives[i].trip) continue;
    const idle = getIdleBeeCandidates(state);
    if (!idle.length) break;
    const hive = BEE_HIVES[i];
    const picks = idle
      .slice()
      .sort((a, b) => scoreBeeKeeper(b, hive.id, blooms[i].id, opts) - scoreBeeKeeper(a, hive.id, blooms[i].id, opts) || (a.id || 0) - (b.id || 0))
      .slice(0, BEE_SEATS);
    const res = dispatchBeeHive(state, i, picks.map((m) => m.id), { ...opts, nowMs });
    if (res.ok) dispatched.push({ idx: i, hiveId: res.hiveId, flowerId: res.flowerId, keeperIds: res.keeperIds, flowerMatch: res.flowerMatch });
  }
  const anyFree = bw.hives.some((x) => !x.trip);
  return { ok: dispatched.length > 0, reason: dispatched.length ? "" : anyFree ? "no_idle_mons" : "hives_busy", dispatched };
}

/** 「召回」: a tending hive stops at once (no honey). */
export function recallBeeHive(state, idx) {
  const bw = ensureBeeWorkshopState(state);
  if (!bw) return { ok: false, reason: "invalid_state" };
  const i = Math.floor(Number(idx));
  const trip = bw.hives[i]?.trip;
  if (!trip) return { ok: false, reason: "no_trip" };
  if (trip.phase !== "tending") return { ok: false, reason: "already_done" };
  bw.hives[i].trip = null;
  beePushLog(bw, `【召回】「${BEE_HIVES[i].name}」的伙伴们提前回家了，这一趟没带回蜂蜜`);
  return { ok: true, idx: i, recalled: trip.keeperIds.length };
}

/** 「收取蜂蜜」for one done hive: jars → codex + rewards (new honey +6 coin); keepers +40 exp / +2 affection and come home. */
export function claimBeeHive(state, idx, opts = {}) {
  const bw = ensureBeeWorkshopState(state);
  if (!bw) return { ok: false, reason: "invalid_state" };
  const i = Math.floor(Number(idx));
  const trip = bw.hives[i]?.trip;
  if (!trip || trip.phase !== "done") return { ok: false, reason: "not_done" };
  const hive = getBeeHiveDef(trip.hiveId) || BEE_HIVES[i];
  const tierBefore = getBeeBadgeTier(Object.keys(bw.codex).length);
  const rewards = {};
  let newHoney = false;
  for (const h of trip.haul) {
    const f = getBeeFlowerDef(h.flowerId);
    if (!f) continue;
    for (const [rid, n] of Object.entries(BEE_REWARDS_PER_JAR)) rewards[rid] = (rewards[rid] || 0) + n;
    const prev = bw.codex[f.id];
    if (!prev || !(prev.count > 0)) {
      newHoney = true;
      rewards.futurecoin = (rewards.futurecoin || 0) + BEE_NEW_HONEY_COIN;
    }
    bw.codex[f.id] = { count: (prev?.count || 0) + 1 };
  }
  applyRewardGrant(state, rewards, { addRes: opts.addRes, addExpToMon: opts.addExpToMon, squadMons: [] });
  const keepers = beeMonsOf(state, trip.keeperIds);
  for (const m of keepers) {
    if (typeof opts.addExpToMon === "function") opts.addExpToMon(m, BEE_EXP);
    else m.exp = Math.max(0, Math.floor((Number(m.exp) || 0) + BEE_EXP));
    const aff0 = typeof m.affection === "number" && Number.isFinite(m.affection) ? m.affection : 0;
    m.affection = Math.min(100, Math.max(0, aff0 + BEE_AFFECTION));
  }
  const jars = trip.haul.length;
  const flower = getBeeFlowerDef(trip.flowerId) || BEE_FLOWERS[0];
  bw.hives[i].trip = null;
  bw.totalTrips = (bw.totalTrips || 0) + 1;
  bw.totalJars = (bw.totalJars || 0) + jars;
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  bw.lastClaim = { jars, hiveId: hive.id, flowerId: flower.id, rewards: { ...rewards }, newHoney, at: nowMs };
  const tierAfter = getBeeBadgeTier(Object.keys(bw.codex).length);
  const rewardTxt = Object.entries(rewards)
    .map(([rid, n]) => `${BEE_RES_ZH[rid] || rid} +${n}`)
    .join("、");
  const logLine = `【收取蜂蜜】「${hive.name}」收下 ${jars} 罐${flower.honey}${newHoney ? "（蜂蜜图鉴新登记）" : ""}，换来 ${rewardTxt || "满屋花香"}`;
  beePushLog(bw, logLine);
  if (tierAfter > tierBefore) beePushLog(bw, `【蜂巢徽章】蜂蜜图鉴登记 ${Object.keys(bw.codex).length} 种，徽章升为「${getBeeBadgeName(tierAfter)}」`);
  return { ok: true, idx: i, hiveId: hive.id, flowerId: flower.id, jars, rewards, newHoney, newTier: tierAfter > tierBefore ? tierAfter : 0, keepers: keepers.map((m) => m.id), logLine };
}

/** 「收取蜂蜜」for every done hive at once. */
export function claimAllBeeHives(state, opts = {}) {
  const bw = ensureBeeWorkshopState(state);
  if (!bw) return { ok: false, reason: "invalid_state" };
  const results = [];
  for (let i = 0; i < BEE_HIVE_COUNT; i += 1) {
    if (bw.hives[i]?.trip?.phase === "done") results.push(claimBeeHive(state, i, opts));
  }
  if (!results.length) return { ok: false, reason: "nothing_done" };
  const rewards = {};
  for (const r of results) for (const [rid, n] of Object.entries(r.rewards || {})) rewards[rid] = (rewards[rid] || 0) + n;
  return { ok: true, claimed: results.length, jars: results.reduce((s, r) => s + (r.jars || 0), 0), rewards, newTier: Math.max(0, ...results.map((r) => r.newTier || 0)), results };
}

/** Forced release / star-up material: the keeper leaves the hive; an emptied tending hive stops. */
export function detachBeeKeeper(state, monId) {
  const bw = state?.meta?.beeWorkshop;
  const id = Math.floor(Number(monId) || 0);
  if (!bw || typeof bw !== "object" || !Array.isArray(bw.hives) || id <= 0) return { ok: false, detached: false };
  let detached = false;
  for (const hive of bw.hives) {
    const trip = hive?.trip;
    if (!trip || !Array.isArray(trip.keeperIds)) continue;
    const before = trip.keeperIds.length;
    trip.keeperIds = trip.keeperIds.filter((x) => Math.floor(Number(x) || 0) !== id);
    if (trip.keeperIds.length !== before) detached = true;
    if (Array.isArray(trip.haul)) for (const h of trip.haul) if (h && Math.floor(Number(h.monId) || 0) === id) h.monId = 0;
    if (trip.phase === "tending" && !trip.keeperIds.length) hive.trip = null;
  }
  return { ok: true, detached };
}

/** Rebirth: tending hives stop; done hives keep their honey (claimable later, no exp owner). Codex and badge are permanent. */
export function recallBeeWorkshopForRebirth(state) {
  const bw = state?.meta?.beeWorkshop;
  if (!bw || typeof bw !== "object" || !Array.isArray(bw.hives)) return { ok: false, recalled: 0 };
  let recalled = 0;
  for (const hive of bw.hives) {
    const trip = hive?.trip;
    if (!trip) continue;
    recalled += Array.isArray(trip.keeperIds) ? trip.keeperIds.length : 0;
    if (trip.phase === "tending") {
      hive.trip = null;
      continue;
    }
    trip.keeperIds = [];
    if (Array.isArray(trip.haul)) for (const h of trip.haul) if (h) h.monId = 0;
  }
  return { ok: true, recalled };
}

/**
 * Pure non-mutating aggregator of the honey codex & hive badge (wired into production / effects / breeding):
 * 每种已登记蜂蜜 全产 +0.25%（8 种 = 2%）· 蜂巢徽章每级 捕获 +0.25%、闪光 +1%（4 级 = 1% / 4%）。
 */
export function computeBeeWorkshopBonus(state) {
  const raw = state?.meta?.beeWorkshop;
  const has = Boolean(raw && typeof raw === "object");
  const codex = has && raw.codex && typeof raw.codex === "object" ? raw.codex : {};
  const honeys = BEE_FLOWERS.filter((f) => (Number(codex[f.id]?.count) || 0) > 0).length;
  const tier = getBeeBadgeTier(honeys);
  const round4 = (n) => Math.round(n * 10000) / 10000;
  const prodAdd = round4(honeys * 0.0025);
  const catchAdd = round4(tier * 0.0025);
  const shinyAdd = round4(tier * 0.01);
  const hives = has && Array.isArray(raw.hives) ? raw.hives : [];
  const totalTrips = has ? Math.max(0, Math.floor(Number(raw.totalTrips) || 0)) : 0;
  let keepers = 0;
  for (const hive of hives.slice(0, BEE_HIVE_COUNT)) keepers += Array.isArray(hive?.trip?.keeperIds) ? hive.trip.keeperIds.length : 0;
  return {
    honeys,
    totalHoneys: BEE_FLOWERS.length,
    badgeTier: tier,
    maxTier: BEE_BADGE_MAX_TIER,
    badgeName: getBeeBadgeName(tier),
    nextTier: BEE_BADGE_TIERS.find((t) => t.tier === tier + 1) || null,
    totalTrips,
    totalJars: has ? Math.max(0, Math.floor(Number(raw.totalJars) || 0)) : 0,
    title: getBeeTitle(totalTrips),
    keepers,
    tending: hives.filter((x) => x?.trip?.phase === "tending").length,
    done: hives.filter((x) => x?.trip?.phase === "done").length,
    prodAdd,
    prodMul: round4(1 + prodAdd),
    catchAdd,
    shinyAdd,
    shinyChanceMul: round4(1 + shinyAdd),
  };
}

// ============================================================================
// ML-16 「一键收取已归来伙伴」(Collect every returned partner)
// 读 collection_fun.js 的统一外出登记表（getAwayReturnedUnits）：覆盖所有带「已归来 / 已降落 / 已完成但还没收取」状态的外出玩法——
// 星空露营归营、彩虹气球已降落、邮局信使带着回信回来、寻宝远航体力耗尽 / 整岛探索完、心愿码头满载归港，
// 以及 ML-17 的冰晶溜冰场演出结束（评分待领取）、花田蜜蜂工坊照料完成（蜂蜜待收取）。
// 每个单位都交给该玩法自己的收取函数（claimStargazeSite / claimBalloon / claimPostTrip / returnFromTreasureVoyage / claimWishDockRoute），
// 奖励、图鉴、徽章、经验与亲密照常发放，伙伴随即回家（不再被外出锁住）。登记表里新增带 returned 读取器的玩法时，必须在下表补上收取函数，
// ml16-selfcheck 会核对两边一一对应。
// ============================================================================

const AWAY_RETURN_COLLECTORS = Object.freeze({
  iceRink: (state, unit, opts) => claimIceRinkShow(state, opts),
  beeWorkshop: (state, unit, opts) => claimBeeHive(state, unit.ref.idx, opts),
  stargazeCamp: (state, unit, opts) => claimStargazeSite(state, unit.ref.idx, opts),
  balloonTravel: (state, unit, opts) => claimBalloon(state, unit.ref.idx, opts),
  postOffice: (state, unit, opts) => claimPostTrip(state, unit.ref.routeId, opts),
  treasureVoyage: (state, unit, opts) => returnFromTreasureVoyage(state, { ...opts, reason: unit.ref.reason || "return" }),
  wishDock: (state, unit, opts) => claimWishDockRoute(state, unit.ref.routeId, { ...opts, redispatch: false }),
});

/** Activity ids the one-click collector can settle (must equal collection_fun.js AWAY_RETURNABLE_ACTIVITY_IDS). */
export const AWAY_RETURN_COLLECTOR_IDS = Object.freeze(Object.keys(AWAY_RETURN_COLLECTORS));

/** Non-mutating summary for the functions tab banner: units grouped by activity + partner count. */
export function getReturnedPartnersSummary(state) {
  const units = getAwayReturnedUnits(state);
  const byActivity = [];
  for (const u of units) {
    let g = byActivity.find((x) => x.activityId === u.activityId);
    if (!g) {
      g = { activityId: u.activityId, title: u.title, units: 0, monIds: [] };
      byActivity.push(g);
    }
    g.units += 1;
    for (const id of u.monIds) if (!g.monIds.includes(id)) g.monIds.push(id);
  }
  const monIds = [...new Set(units.flatMap((u) => u.monIds))];
  return { count: units.length, partnerCount: monIds.length, monIds, units, byActivity };
}

/**
 * 「一键收取已归来伙伴」: settles every returned unit through its own activity's claim function (rewards as usual) and
 * reports which partners came home. opts: { addRes, addExpToMon, randFloat, nowMs }.
 */
export function collectAllReturnedPartners(state, opts = {}) {
  const units = getAwayReturnedUnits(state);
  if (!units.length) return { ok: false, reason: "nothing_returned", collected: [], failed: [], freedMonIds: [], byActivity: {} };
  const awayBefore = getAwayMonIds(state);
  const collected = [];
  const failed = [];
  for (const u of units) {
    const fn = AWAY_RETURN_COLLECTORS[u.activityId];
    if (typeof fn !== "function") {
      failed.push({ activityId: u.activityId, key: u.key, reason: "no_collector" });
      continue;
    }
    const res = fn(state, u, opts);
    if (res && res.ok) {
      collected.push({ activityId: u.activityId, title: u.title, key: u.key, monIds: u.monIds.slice(), logLine: res.logLine || "", result: res });
    } else {
      failed.push({ activityId: u.activityId, key: u.key, reason: res?.reason || "failed" });
    }
  }
  const awayAfter = getAwayMonIds(state);
  const freedMonIds = [...awayBefore].filter((id) => !awayAfter.has(id)).sort((a, b) => a - b);
  const byActivity = {};
  for (const c of collected) byActivity[c.activityId] = (byActivity[c.activityId] || 0) + 1;
  return { ok: collected.length > 0, reason: collected.length ? "" : "collect_failed", collected, failed, freedMonIds, byActivity };
}
