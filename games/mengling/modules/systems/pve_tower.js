/** Endless weekly trial tower for PvE tab — 1F~8F classic floors + 9F+ infinite procedural floors, weather affixes, and 5F/10F milestone drops. */

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
