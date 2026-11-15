/** Endless weekly trial tower for PvE tab — 1F~8F classic floors + 9F+ infinite procedural floors, weather affixes, and 5F/10F milestone drops. */

import { calcDamage, estimateStageEnemyPower } from "../pve_battle.js";
import { getMonCurrentStats, monPower as defaultMonPower, normalizeMintTuning } from "../mons.js";
import { getStarBonusMul } from "../stars.js";
import {
  computeAmberRevivalAura,
  computeElementalBondResonance,
  computeStarBoutiqueAura,
  computeStarCampAura,
  ensureAncientAmberBucket,
  getMonBoutiqueBonus,
  getMonPrimalImprintBonus,
} from "./collection_fun.js";

export const PVE_TOWER_FLOORS = [
  { floor: 1, name: "塔·1F 虫群", type: "grass", enemies: [{ dex: 10, name: "毛茸茸", lvl: 20, stars: 0 }, { dex: 11, name: "茧团团", lvl: 22, stars: 0 }], rewards: { futurecoin: 40, exp: 400 } },
  { floor: 2, name: "塔·2F 水流", type: "water", enemies: [{ dex: 54, name: "呆鸭鸭", lvl: 24, stars: 0 }, { dex: 55, name: "念力鸭", lvl: 28, stars: 1 }], rewards: { futurecoin: 60, exp: 600 } },
  { floor: 3, name: "塔·3F 烈焰", type: "fire", enemies: [{ dex: 58, name: "汪团团", lvl: 28, stars: 0 }, { dex: 59, name: "疾风汪", lvl: 34, stars: 1 }], rewards: { futurecoin: 80, exp: 900 } },
  { floor: 4, name: "塔·4F 雷鸣", type: "electric", enemies: [{ dex: 25, name: "电毛球", lvl: 32, stars: 1 }, { dex: 26, name: "雷鼓将", lvl: 38, stars: 1 }], rewards: { futurecoin: 100, exp: 1200 } },
  { floor: 5, name: "塔·5F 龙影【里程碑】", type: "mystic", enemies: [{ dex: 147, name: "迷你蛟", lvl: 36, stars: 1 }, { dex: 148, name: "丝带龙", lvl: 42, stars: 2 }], rewards: { futurecoin: 140, exp: 1800, evolutionStone: 1, rareCandy: 1, seasonMark: 1 }, isMilestone: true },
  { floor: 6, name: "塔·6F 恶戏", type: "dark", enemies: [{ dex: 197, name: "夜绒布", lvl: 40, stars: 1 }, { dex: 229, name: "夜焰狼", lvl: 46, stars: 2 }], rewards: { futurecoin: 180, exp: 2200 } },
  { floor: 7, name: "塔·7F 钢壁", type: "stone", enemies: [{ dex: 208, name: "钢鳞长", lvl: 44, stars: 2 }, { dex: 462, name: "磁暴王", lvl: 50, stars: 2 }], rewards: { futurecoin: 220, exp: 2800 } },
  { floor: 8, name: "塔·8F 王者幻影【经典巅顶】", type: "mystic", enemies: [{ dex: 149, name: "胖胖龙", lvl: 52, stars: 2 }, { dex: 230, name: "海龙王", lvl: 55, stars: 2 }, { dex: 148, name: "丝带龙", lvl: 58, stars: 2 }], rewards: { futurecoin: 320, exp: 4000, evolutionStone: 1, seasonMark: 1 } },
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
    { dex: 229, fallback: "夜焰狼" },
  ],
  water: [
    { dex: 55, fallback: "念力鸭" },
    { dex: 121, fallback: "紫微宝星皇" },
    { dex: 230, fallback: "海龙王" },
    { dex: 120, fallback: "辰光海星" },
  ],
  grass: [
    { dex: 71, fallback: "幽林捕蝇皇" },
    { dex: 45, fallback: "绯冠大王花" },
    { dex: 69, fallback: "翠蔓灵芽" },
    { dex: 11, fallback: "茧团团" },
  ],
  electric: [
    { dex: 26, fallback: "雷鼓将" },
    { dex: 82, fallback: "三联磁晶阵" },
    { dex: 462, fallback: "磁暴王" },
    { dex: 25, fallback: "电毛球" },
  ],
  wind: [
    { dex: 17, fallback: "疾风灵隼" },
    { dex: 149, fallback: "胖胖龙" },
    { dex: 42, fallback: "影翼猎蝠" },
    { dex: 16, fallback: "云羽雏雀" },
  ],
  stone: [
    { dex: 95, fallback: "巨岩晶蛇" },
    { dex: 112, fallback: "破山钻角犀" },
    { dex: 208, fallback: "钢鳞长" },
    { dex: 28, fallback: "金刚刺甲兽" },
  ],
  light: [
    { dex: 121, fallback: "紫微宝星皇" },
    { dex: 78, fallback: "逐日天马" },
    { dex: 148, fallback: "丝带龙" },
    { dex: 26, fallback: "天雷御守鼠" },
  ],
  dark: [
    { dex: 197, fallback: "夜绒布" },
    { dex: 229, fallback: "夜焰狼" },
    { dex: 44, fallback: "迷雾梦花" },
    { dex: 42, fallback: "影翼猎蝠" },
  ],
  mystic: [
    { dex: 148, fallback: "丝带龙" },
    { dex: 149, fallback: "胖胖龙" },
    { dex: 230, fallback: "海龙王" },
    { dex: 147, fallback: "迷你蛟" },
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
  const pveOutAdd = Number((badgeOutAdd + campComboAdd + boutiqueOutAdd + leagueOutAdd + amberOutAdd + corridorOutAdd).toFixed(4));
  return {
    badgeCount: count,
    maxBadges: DUAL_SANCTUM_TRIALS.length,
    badgeOutAdd,
    campComboAdd,
    boutiqueOutAdd,
    leagueOutAdd,
    amberOutAdd,
    corridorOutAdd,
    pveOutAdd,
    pveOutMul: Number((1 + pveOutAdd).toFixed(4)),
  };
}

// ============================================================================
// ML-7 「冠军联盟四天王殿堂赛」(Champion League Elite Four & Grand Champion Gauntlet)
// ============================================================================

export const CHAMPION_LEAGUE_MAX_TIER = 5;
export const CHAMPION_LEAGUE_SQUAD_SIZE = 3;

export const CHAMPION_LEAGUE_STAGES = Object.freeze([
  {
    id: "elite_flame",
    order: 1,
    name: "炎狱天王殿",
    shortTitle: "炎狱天王",
    masterTitle: "炎狱天王 · 赤煌",
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
    name: "沧溟天王殿",
    shortTitle: "沧溟天王",
    masterTitle: "沧溟天王 · 澜汐",
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
    name: "翠岚天王殿",
    shortTitle: "翠岚天王",
    masterTitle: "翠岚天王 · 苍叶",
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
    name: "星穹天王殿",
    shortTitle: "星穹天王",
    masterTitle: "星穹天王 · 星璇",
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
  const picked = [];
  for (const rawId of Array.isArray(monIds) ? monIds : []) {
    const id = Math.floor(Number(rawId) || 0);
    if (id > 0 && validSet.has(id) && !picked.includes(id)) {
      picked.push(id);
      if (picked.length >= CHAMPION_LEAGUE_SQUAD_SIZE) break;
    }
  }
  cl.squadIds = picked;
  cl.carryHpRatioByMon = {};
  cl.activeStageIdx = 0;
  return { ok: picked.length > 0, squadIds: cl.squadIds.slice() };
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
  const list = Array.isArray(state?.mons?.list) ? state.mons.list.filter(Boolean) : [];
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

  const squadMons = squadIds
    .map((id) => list.find((m) => m && m.id === id))
    .filter(Boolean)
    .slice(0, CHAMPION_LEAGUE_SQUAD_SIZE);

  if (!squadMons.length) {
    return {
      ok: false,
      reason: "empty_squad",
      championCleared: false,
      stagesCleared: 0,
      stageResults: [],
      rewardsEarned: {},
      log: ["— 需至少编入 1~3 只伙伴方可挑战冠军联盟四天王殿堂 —"],
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
    `— 冠军联盟四天王殿堂赛（${mode === "full" ? "五连战登顶挑战" : `第 ${startIdx + 1}/5 殿逐关挑战`}）—`,
    `阵容加成：总增伤 +${Math.round(synergy.totalOutAdd * 100)}%（羁绊+${Math.round(synergy.bondOutAdd * 100)}% / 调律+${Math.round(synergy.tuningOutAdd * 100)}% / 露营盛宴+${Math.round(synergy.campOutAdd * 100)}% / 星辉配饰+${Math.round(synergy.boutiqueOutAdd * 100)}%）`,
  ];

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
  const picked = [];
  for (const rawId of Array.isArray(monIds) ? monIds : []) {
    const id = Math.floor(Number(rawId) || 0);
    if (id > 0 && validSet.has(id) && !picked.includes(id)) {
      picked.push(id);
      if (picked.length >= STAR_CORRIDOR_SQUAD_SIZE) break;
    }
  }
  sc.squadIds = picked;
  return { ok: picked.length > 0, squadIds: sc.squadIds.slice() };
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
    if (sc.squadIds.length >= STAR_CORRIDOR_SQUAD_SIZE) {
      return { ok: false, reason: "squad_full" };
    }
    sc.squadIds.push(id);
  }
  return { ok: true, squadIds: sc.squadIds.slice() };
}

export function autofillStarCorridorSquad(state, getMonTypesFn, monPowerFn) {
  const sc = ensureStarCorridorState(state);
  const list = Array.isArray(state?.mons?.list) ? state.mons.list.filter(Boolean) : [];
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

  const squadMons = squadIds
    .map((id) => list.find((m) => m && m.id === id))
    .filter(Boolean)
    .slice(0, STAR_CORRIDOR_SQUAD_SIZE);

  if (!squadMons.length) {
    return {
      ok: false,
      reason: "empty_squad",
      win: false,
      floorsCleared: 0,
      floorResults: [],
      rewardsEarned: {},
      log: ["— 需至少编入 1~4 只伙伴方可开启双系星轨回廊试炼 —"],
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



