// collection/bakery_park.js — ML-15 云朵烘焙坊与气球旅行 · ML-16 云端游乐园与星空露营 · ML-17（由 collection_fun.js 原样拆出，对外仍从 ../collection_fun.js 引用）

import { localYmdForSandbox, resolveMonTypesForEco } from "./camp.js";
import { addResDirect } from "./dock_observatory.js";
import { awayAliveIdSet, listIdleOutingMons } from "./away_registry.js";

// ============================================================================
// ML-15 「云朵甜点烘焙坊」(Cloud Dessert Bakery)
// 三个工位按属性分工：揉面台（水 / 草 / 岩）→ 云朵烤炉（火 / 电 / 光）→ 装饰台（风 / 暗 / 幻），每个工位 1 位伙伴。
// 一炉甜点依次经过揉面 → 烘烤 → 装饰三道工序，每道工序的工时由该工位的伙伴完成：
// 工位速度 = 1 工时/分 × 1.5（属性契合）×（1 + 亲密 / 200）；工位空着时由其他上岗伙伴临时帮忙（0.4 工时/分），一个人都没有就停工。
// 出炉品质：契合的工位数 0 → ★1，1~2 → ★2，3 → ★3（品质决定「享用」增益时长 ×1 / ×1.25 / ×1.5 与装盒奖励 ×星数）。
// 出炉的甜点放进甜点柜（最多 12 份，满了就停工），第一次出炉即收录进「甜点食谱图鉴」（记录出炉次数与最佳品质）。
// 8 份食谱：前 2 份开局可做，其余按已收录食谱数 1 / 2 / 3 / 4 / 5 / 6 份依次解锁。
// 「享用」一份甜点点亮对应的限时增益（甜香满屋 全产 +8% / 轻盈脚步 捕获 +1.2% / 糖霜闪闪 闪光 +10% / 元气满满 PvE 增伤 +6%），
// 时长可叠加、单项最多 6 小时；「装盒送出」把甜点柜里的甜点换成灵果与未来币。
// 永久：每收录一份食谱 全产 +0.25%，每份 ★3 完美食谱 PvE 增伤 +0.5%。每日一次免费「加急出炉」（之后 20 未来币）立刻做好当前这一炉。
// 上岗伙伴经由上方统一登记表接入防放生锁 / 训练 / 远征 / 冠军赛排除；离线补算 ≤12h（按工序时间顺序结算）；
// 强制放生 / 转生让伙伴下班，食谱图鉴、甜点柜与限时增益保留。
// ============================================================================

export const BAKERY_STATIONS = Object.freeze(
  [
    { id: "knead", name: "揉面台", verb: "揉面", elements: ["water", "grass", "stone"], desc: "水润、草香和岩石般的好臂力，把面团揉得又软又弹。" },
    { id: "bake", name: "云朵烤炉", verb: "烘烤", elements: ["fire", "electric", "light"], desc: "火候、电流与暖光一起照看炉子，烤得金黄蓬松。" },
    { id: "decorate", name: "装饰台", verb: "装饰", elements: ["wind", "dark", "mystic"], desc: "轻风打奶油、影子描花边、幻光点糖霜。" },
  ].map((s) => Object.freeze({ ...s, elements: Object.freeze(s.elements.slice()) })),
);
export const BAKERY_STATION_IDS = Object.freeze(BAKERY_STATIONS.map((s) => s.id));
export const BAKERY_MAX_WORKERS = BAKERY_STATIONS.length;
export const BAKERY_WORK_PER_MIN = 1;
export const BAKERY_MATCH_MUL = 1.5;
export const BAKERY_HELPER_PER_MIN = 0.4;
export const BAKERY_CASE_CAP = 12;
export const BAKERY_MAX_CATCHUP_SEC = 12 * 3600;
export const BAKERY_BUFF_MAX_SEC = 6 * 3600;
export const BAKERY_RUSH_FREE_PER_DAY = 1;
export const BAKERY_RUSH_COIN_COST = 20;
export const BAKERY_RECIPE_PROD_ADD = 0.0025;
export const BAKERY_PERFECT_PVE_ADD = 0.005;
export const BAKERY_EXP_PER_BATCH = 30;
export const BAKERY_LOG_KEEP = 6;
/** Buff duration / box reward multiplier by quality stars (index = stars). */
export const BAKERY_QUALITY_MUL = Object.freeze([1, 1, 1.25, 1.5]);

/** 4 timed buffs a dessert can light up when 「享用」. */
export const BAKERY_BUFF_DEFS = Object.freeze(
  [
    { id: "prod", name: "甜香满屋", value: 0.08, effectText: "全产 +8%" },
    { id: "catch", name: "轻盈脚步", value: 0.012, effectText: "捕获 +1.2%" },
    { id: "shiny", name: "糖霜闪闪", value: 0.1, effectText: "闪光 +10%" },
    { id: "pveOut", name: "元气满满", value: 0.06, effectText: "PvE 增伤 +6%" },
  ].map((b) => Object.freeze(b)),
);

/** 8 recipes: work = 工时 per station (at 1 工时/分), buffMin = base buff minutes when 「享用」. */
export const BAKERY_RECIPE_DEFS = Object.freeze(
  [
    { id: "cloudPuff", name: "云朵奶油泡芙", tier: 1, unlockRecipes: 0, buffId: "prod", buffMin: 30, work: { knead: 8, bake: 12, decorate: 10 }, desc: "一口咬下去像咬到一朵云，奶油会从指缝里偷偷溜走。" },
    { id: "lavaCocoa", name: "熔岩可可小蛋糕", tier: 1, unlockRecipes: 0, buffId: "pveOut", buffMin: 30, work: { knead: 10, bake: 16, decorate: 6 }, desc: "切开时热可可像小火山一样涌出来，吃完浑身是劲。" },
    { id: "dewJelly", name: "晨露果冻杯", tier: 1, unlockRecipes: 1, buffId: "catch", buffMin: 30, work: { knead: 12, bake: 6, decorate: 12 }, desc: "用清晨的露水凝成的果冻，晃一晃会叮叮作响。" },
    { id: "starMacaron", name: "星糖马卡龙", tier: 1, unlockRecipes: 2, buffId: "shiny", buffMin: 30, work: { knead: 10, bake: 10, decorate: 16 }, desc: "撒满星星糖霜的小圆饼，夜里会微微发亮。" },
    { id: "rainbowRoll", name: "彩虹云朵卷", tier: 2, unlockRecipes: 3, buffId: "prod", buffMin: 45, work: { knead: 14, bake: 16, decorate: 16 }, desc: "七种颜色的蛋糕卷成一圈，像把彩虹收进了盘子。" },
    { id: "thunderCrisp", name: "雷莓脆脆饼", tier: 2, unlockRecipes: 4, buffId: "pveOut", buffMin: 45, work: { knead: 12, bake: 18, decorate: 12 }, desc: "咬下去噼啪作响，酸酸甜甜的莓果在舌尖上放小烟花。" },
    { id: "moonMochi", name: "月光团子", tier: 2, unlockRecipes: 5, buffId: "catch", buffMin: 45, work: { knead: 16, bake: 10, decorate: 16 }, desc: "软糯的团子裹着月光色的糖粉，捧在手里轻飘飘的。" },
    { id: "galaxyTart", name: "银河流星挞", tier: 2, unlockRecipes: 6, buffId: "shiny", buffMin: 60, work: { knead: 16, bake: 20, decorate: 20 }, desc: "烘焙坊的招牌：挞皮里铺满星河，偶尔还会划过一颗流星。" },
  ].map((r) => Object.freeze({ ...r, work: Object.freeze({ ...r.work }) })),
);
export const BAKERY_TOTAL_RECIPES = BAKERY_RECIPE_DEFS.length;

export const BAKERY_RES_ZH = Object.freeze({ catnip: "灵果", futurecoin: "未来币" });

const BAKERY_TITLES = Object.freeze([
  { minBatches: 120, name: "烘焙坊主厨" },
  { minBatches: 40, name: "云朵糕点师" },
  { minBatches: 10, name: "甜点师" },
  { minBatches: 0, name: "云朵学徒" },
]);

export function getBakeryStationDef(stationId) {
  return BAKERY_STATIONS.find((s) => s.id === stationId) || null;
}

export function getBakeryRecipeDef(recipeId) {
  return BAKERY_RECIPE_DEFS.find((r) => r.id === recipeId) || null;
}

export function getBakeryBuffDef(buffId) {
  return BAKERY_BUFF_DEFS.find((b) => b.id === buffId) || null;
}

export function getBakeryTitle(totalBatches = 0) {
  const n = Math.max(0, Math.floor(Number(totalBatches) || 0));
  return (BAKERY_TITLES.find((t) => n >= t.minBatches) || BAKERY_TITLES[BAKERY_TITLES.length - 1]).name;
}

/** Total 工时 of one batch of a recipe (all three stations). */
export function getBakeryRecipeWork(recipeId) {
  const r = getBakeryRecipeDef(recipeId);
  if (!r) return 0;
  return BAKERY_STATION_IDS.reduce((s, sid) => s + (r.work[sid] || 0), 0);
}

/** Box rewards of one dessert: 灵果 25 × 星数 + 未来币（食谱阶 × 星数）. */
export function getBakeryDessertRewards(recipeId, stars = 1) {
  const r = getBakeryRecipeDef(recipeId);
  const q = Math.max(1, Math.min(3, Math.floor(Number(stars) || 1)));
  if (!r) return {};
  return { catnip: 25 * q, futurecoin: r.tier * q };
}

/** Stars from the number of element-matched stations: 0 → ★1, 1~2 → ★2, 3 → ★3. */
export function getBakeryQualityFromMatches(matchedStations = 0) {
  const n = Math.max(0, Math.floor(Number(matchedStations) || 0));
  return 1 + (n >= 1 ? 1 : 0) + (n >= BAKERY_MAX_WORKERS ? 1 : 0);
}

function bakeryRecipesOf(state) {
  const r = state?.meta?.cloudBakery?.recipes;
  return r && typeof r === "object" ? r : {};
}

/** Non-mutating: recipes collected in the recipe book (baked at least once). */
export function getBakeryCollectedCount(state) {
  const recipes = bakeryRecipesOf(state);
  return BAKERY_RECIPE_DEFS.filter((r) => (Number(recipes[r.id]?.baked) || 0) > 0).length;
}

export function isBakeryRecipeUnlocked(state, recipeId) {
  const def = getBakeryRecipeDef(recipeId);
  if (!def) return false;
  return getBakeryCollectedCount(state) >= def.unlockRecipes;
}

function normalizeBakeryDessert(raw) {
  if (!raw || typeof raw !== "object") return null;
  const r = getBakeryRecipeDef(raw.recipeId);
  if (!r) return null;
  return { recipeId: r.id, q: Math.max(1, Math.min(3, Math.floor(Number(raw.q) || 1))) };
}

export function ensureBakeryState(state) {
  if (!state || typeof state !== "object") return null;
  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  const raw = state.meta.cloudBakery && typeof state.meta.cloudBakery === "object" ? state.meta.cloudBakery : {};
  const monList = Array.isArray(state?.mons?.list) ? state.mons.list : null;
  const aliveSet = monList
    ? new Set(
        monList
          .map((m) => (m && typeof m.id === "number" && Number.isFinite(m.id) ? Math.floor(m.id) : null))
          .filter((x) => x !== null && x > 0),
      )
    : null;
  const rawWorkers = raw.workers && typeof raw.workers === "object" ? raw.workers : {};
  const workers = {};
  const used = new Set();
  for (const st of BAKERY_STATIONS) {
    const id = Math.floor(Number(rawWorkers[st.id]) || 0);
    if (id > 0 && !used.has(id) && (!aliveSet || aliveSet.has(id))) {
      workers[st.id] = id;
      used.add(id);
    } else {
      workers[st.id] = 0;
    }
  }
  const rawRecipes = raw.recipes && typeof raw.recipes === "object" ? raw.recipes : {};
  const recipes = {};
  for (const r of BAKERY_RECIPE_DEFS) {
    const e = rawRecipes[r.id];
    if (!e || typeof e !== "object") continue;
    const baked = Math.max(0, Math.min(999999, Math.floor(Number(e.baked) || 0)));
    if (baked <= 0) continue;
    recipes[r.id] = { baked, bestQ: Math.max(1, Math.min(3, Math.floor(Number(e.bestQ) || 1))) };
  }
  const collected = Object.keys(recipes).length;
  const recipeDef = getBakeryRecipeDef(raw.recipeId);
  const recipeId = recipeDef && collected >= recipeDef.unlockRecipes ? recipeDef.id : BAKERY_RECIPE_DEFS[0].id;
  const recipe = getBakeryRecipeDef(recipeId);
  const rb = raw.batch && typeof raw.batch === "object" ? raw.batch : {};
  const stageIdx = Math.max(0, Math.min(BAKERY_STATIONS.length - 1, Math.floor(Number(rb.stageIdx) || 0)));
  const stageNeed = recipe.work[BAKERY_STATION_IDS[stageIdx]];
  const work0 = Number(rb.work);
  const batch = { stageIdx, work: Number.isFinite(work0) && work0 > 0 ? Math.min(stageNeed - 0.001, work0) : 0 };
  const showcase = (Array.isArray(raw.showcase) ? raw.showcase : []).map(normalizeBakeryDessert).filter(Boolean).slice(0, BAKERY_CASE_CAP);
  const rawBuffs = raw.buffs && typeof raw.buffs === "object" ? raw.buffs : {};
  const buffs = {};
  for (const b of BAKERY_BUFF_DEFS) {
    const n = Number(rawBuffs[b.id]);
    buffs[b.id] = Number.isFinite(n) && n > 0 ? Math.min(BAKERY_BUFF_MAX_SEC, n) : 0;
  }
  const lb = raw.lastBatch && typeof raw.lastBatch === "object" ? raw.lastBatch : null;
  const lbRecipe = lb ? getBakeryRecipeDef(lb.recipeId) : null;
  const lastBatch = lbRecipe
    ? {
        recipeId: lbRecipe.id,
        q: Math.max(1, Math.min(3, Math.floor(Number(lb.q) || 1))),
        authors: typeof lb.authors === "string" ? lb.authors.slice(0, 64) : "",
        at: typeof lb.at === "number" && Number.isFinite(lb.at) ? lb.at : 0,
      }
    : null;
  const lx = raw.lastBox && typeof raw.lastBox === "object" ? raw.lastBox : null;
  const lastBox = lx
    ? {
        count: Math.max(0, Math.min(BAKERY_CASE_CAP, Math.floor(Number(lx.count) || 0))),
        rewards: (() => {
          const out = {};
          const src = lx.rewards && typeof lx.rewards === "object" ? lx.rewards : {};
          for (const [rid, v] of Object.entries(src)) {
            const n = Math.max(0, Math.min(99999, Math.floor(Number(v) || 0)));
            if (BAKERY_RES_ZH[rid] && n > 0) out[rid] = n;
          }
          return out;
        })(),
        at: typeof lx.at === "number" && Number.isFinite(lx.at) ? lx.at : 0,
      }
    : null;
  const recentLogs = Array.isArray(raw.recentLogs)
    ? raw.recentLogs.filter((s) => typeof s === "string" && s.trim().length > 0).slice(0, BAKERY_LOG_KEEP)
    : [];
  const clean = {
    initialized: true,
    workers,
    recipeId,
    batch,
    showcase,
    recipes,
    buffs,
    totalBatches: Math.max(0, Math.floor(Number(raw.totalBatches) || 0)),
    totalEaten: Math.max(0, Math.floor(Number(raw.totalEaten) || 0)),
    totalBoxed: Math.max(0, Math.floor(Number(raw.totalBoxed) || 0)),
    rushDate: typeof raw.rushDate === "string" ? raw.rushDate : "",
    rushUsed: Math.max(0, Math.floor(Number(raw.rushUsed) || 0)),
    lastBatch,
    lastBox,
    recentLogs,
  };
  if (state.meta.cloudBakery && typeof state.meta.cloudBakery === "object") {
    Object.assign(state.meta.cloudBakery, clean);
    return state.meta.cloudBakery;
  }
  state.meta.cloudBakery = clean;
  return clean;
}

function bakeryPushLog(bk, line) {
  bk.recentLogs = [line, ...(bk.recentLogs || [])].slice(0, BAKERY_LOG_KEEP);
}

/** Non-mutating read: partners working a bakery station — protected via the away registry. */
export function getBakeryWorkerMonIds(state) {
  const ids = new Set();
  const raw = state?.meta?.cloudBakery?.workers;
  if (!raw || typeof raw !== "object") return ids;
  const monList = Array.isArray(state?.mons?.list) ? state.mons.list : null;
  const validSet = monList ? new Set(monList.filter((m) => m && typeof m.id === "number").map((m) => Math.floor(m.id))) : null;
  for (const sid of BAKERY_STATION_IDS) {
    const id = Math.floor(Number(raw[sid]) || 0);
    if (id > 0 && (!validSet || validSet.has(id))) ids.add(id);
  }
  return ids;
}

/** The station a partner works at (or null). */
export function getBakeryStationOfMon(state, monId) {
  const id = Math.floor(Number(monId) || 0);
  const raw = state?.meta?.cloudBakery?.workers;
  if (id <= 0 || !raw || typeof raw !== "object") return null;
  const sid = BAKERY_STATION_IDS.find((s) => Math.floor(Number(raw[s]) || 0) === id);
  return sid ? getBakeryStationDef(sid) : null;
}

/** Idle partners that may take a bakery station (not busy anywhere, incl. every away activity). */
export function getIdleBakeryCandidates(state) {
  return listIdleOutingMons(state);
}

function bakeryTypesOf(mon, opts = {}) {
  if (typeof opts.getMonTypes === "function") {
    const t = opts.getMonTypes(mon);
    if (Array.isArray(t) && t.length) return t.filter((x) => typeof x === "string");
  }
  return resolveMonTypesForEco(mon, opts);
}

/** Per-worker speed at a station: 1 工时/分 × 1.5（属性契合）×（1 + 亲密 / 200）. */
export function evaluateBakeryWorker(mon, stationId, opts = {}) {
  const station = getBakeryStationDef(stationId);
  if (!mon || !station) return { match: false, perMin: 0, affection: 0, types: [] };
  const types = bakeryTypesOf(mon, opts);
  const match = types.some((t) => station.elements.includes(t));
  const aff = Math.max(0, Math.min(100, typeof mon.affection === "number" && Number.isFinite(mon.affection) ? mon.affection : 0));
  const perMin = Math.round(BAKERY_WORK_PER_MIN * (match ? BAKERY_MATCH_MUL : 1) * (1 + aff / 200) * 1000) / 1000;
  return { match, perMin, affection: aff, types };
}

function bakeryWorkerMon(state, stationId) {
  const id = Math.floor(Number(state?.meta?.cloudBakery?.workers?.[stationId]) || 0);
  if (id <= 0) return null;
  const list = Array.isArray(state?.mons?.list) ? state.mons.list : [];
  return list.find((m) => m && m.id === id) || null;
}

/** Live 工时/分 of each station (empty stations get a 0.4 helper speed while anyone works; nobody → 0). */
export function getBakeryStationSpeeds(state, opts = {}) {
  const out = {};
  const mons = {};
  for (const sid of BAKERY_STATION_IDS) mons[sid] = bakeryWorkerMon(state, sid);
  const anyone = BAKERY_STATION_IDS.some((sid) => mons[sid]);
  for (const sid of BAKERY_STATION_IDS) {
    out[sid] = mons[sid] ? evaluateBakeryWorker(mons[sid], sid, opts).perMin : anyone ? BAKERY_HELPER_PER_MIN : 0;
  }
  return out;
}

/** Quality preview of the batch with the current workers (matched stations + stars). */
export function getBakeryBatchQuality(state, opts = {}) {
  let matched = 0;
  for (const sid of BAKERY_STATION_IDS) {
    const m = bakeryWorkerMon(state, sid);
    if (m && evaluateBakeryWorker(m, sid, opts).match) matched += 1;
  }
  return { matched, stars: getBakeryQualityFromMatches(matched) };
}

/** Seconds until the current batch is done with the current workers (Infinity when nobody works). */
export function getBakeryBatchEtaSec(state, opts = {}) {
  const bk = state?.meta?.cloudBakery;
  if (!bk || typeof bk !== "object" || !bk.batch) return Infinity;
  const recipe = getBakeryRecipeDef(bk.recipeId) || BAKERY_RECIPE_DEFS[0];
  const speeds = getBakeryStationSpeeds(state, opts);
  const stage0 = Math.max(0, Math.floor(Number(bk.batch.stageIdx) || 0));
  let sec = 0;
  for (let i = stage0; i < BAKERY_STATIONS.length; i += 1) {
    const sid = BAKERY_STATION_IDS[i];
    const left = Math.max(0, recipe.work[sid] - (i === stage0 ? Number(bk.batch.work) || 0 : 0));
    if (!(speeds[sid] > 0)) return Infinity;
    sec += (left / speeds[sid]) * 60;
  }
  return sec;
}

/** Finishes the current batch: dessert into the showcase, recipe book entry, worker exp / affection, next batch starts at 揉面. */
function completeBakeryBatch(state, bk, opts = {}) {
  const recipe = getBakeryRecipeDef(bk.recipeId) || BAKERY_RECIPE_DEFS[0];
  const { matched, stars } = getBakeryBatchQuality(state, opts);
  const workers = BAKERY_STATIONS.map((s) => ({ s, m: bakeryWorkerMon(state, s.id) })).filter((x) => x.m);
  const authors = workers.map((x) => `${x.s.verb}：${String(x.m.name || "伙伴").slice(0, 12)}`).join(" · ").slice(0, 64);
  const unlockedBefore = new Set(BAKERY_RECIPE_DEFS.filter((d) => isBakeryRecipeUnlocked(state, d.id)).map((d) => d.id));
  const prev = bk.recipes[recipe.id];
  const newRecipe = !prev || !(prev.baked > 0);
  const newPerfect = stars >= 3 && (!prev || (prev.bestQ || 0) < 3);
  bk.recipes[recipe.id] = { baked: (prev?.baked || 0) + 1, bestQ: Math.max(prev?.bestQ || 0, stars) };
  bk.showcase.push({ recipeId: recipe.id, q: stars });
  for (const { m } of workers) {
    if (typeof opts.addExpToMon === "function") opts.addExpToMon(m, BAKERY_EXP_PER_BATCH);
    else m.exp = Math.max(0, Math.floor((Number(m.exp) || 0) + BAKERY_EXP_PER_BATCH));
    const aff0 = typeof m.affection === "number" && Number.isFinite(m.affection) ? m.affection : 0;
    m.affection = Math.min(100, Math.max(0, aff0 + 1));
  }
  bk.totalBatches = (bk.totalBatches || 0) + 1;
  bk.batch = { stageIdx: 0, work: 0 };
  const at =
    typeof opts.atMs === "number" && Number.isFinite(opts.atMs)
      ? opts.atMs
      : typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs)
        ? opts.nowMs
        : Date.now();
  bk.lastBatch = { recipeId: recipe.id, q: stars, authors, at };
  bakeryPushLog(bk, `【出炉】${recipe.name} ${"★".repeat(stars)} 放进了甜点柜（${authors || "伙伴们"}）`);
  if (newRecipe) bakeryPushLog(bk, `【新食谱收录】「${recipe.name}」收进甜点食谱图鉴（${getBakeryCollectedCount(state)}/${BAKERY_TOTAL_RECIPES}）`);
  else if (newPerfect) bakeryPushLog(bk, `【完美出炉】「${recipe.name}」第一次烤出 ★★★`);
  const unlockedRecipes = BAKERY_RECIPE_DEFS.filter((d) => !unlockedBefore.has(d.id) && isBakeryRecipeUnlocked(state, d.id)).map((d) => d.id);
  for (const id of unlockedRecipes) bakeryPushLog(bk, `【新食谱解锁】「${getBakeryRecipeDef(id)?.name || id}」可以开始烤了`);
  return { recipeId: recipe.id, stars, matched, authors, newRecipe, newPerfect, unlockedRecipes, at };
}

/**
 * Live tick + offline catch-up (≤12h): the batch walks through 揉面 → 烘烤 → 装饰 at each station's speed, batches complete in
 * chronological order (a full showcase stops the line), so one long step lands on the same progress as many short ones.
 * Timed buffs count down with the real elapsed time (they only grow when a dessert is eaten). opts.nowMs = end of the step (ms).
 */
export function advanceBakery(state, dtSec, opts = {}) {
  const bk = state?.meta?.cloudBakery;
  const empty = { batches: [], workDone: 0, caseFull: false, expiredBuffs: [] };
  if (!bk || typeof bk !== "object" || !bk.workers || !bk.batch || !Array.isArray(bk.showcase) || !bk.buffs || !bk.recipes) return empty;
  const dt = typeof dtSec === "number" && Number.isFinite(dtSec) && dtSec > 0 ? dtSec : 0;
  if (dt <= 0) return empty;
  const expiredBuffs = [];
  for (const b of BAKERY_BUFF_DEFS) {
    const before = Number(bk.buffs[b.id]) || 0;
    if (before <= 0) continue;
    const after = Math.max(0, before - dt);
    bk.buffs[b.id] = after;
    if (after <= 0) expiredBuffs.push(b.id);
  }
  const step = Math.min(BAKERY_MAX_CATCHUP_SEC, dt);
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const batches = [];
  let remaining = step;
  let workDone = 0;
  for (let guard = 0; guard < 600 && remaining > 1e-9; guard += 1) {
    if (bk.showcase.length >= BAKERY_CASE_CAP) break;
    const recipe = getBakeryRecipeDef(bk.recipeId) || BAKERY_RECIPE_DEFS[0];
    const stageIdx = Math.max(0, Math.min(BAKERY_STATIONS.length - 1, Math.floor(Number(bk.batch.stageIdx) || 0)));
    const sid = BAKERY_STATION_IDS[stageIdx];
    const perSec = (getBakeryStationSpeeds(state, opts)[sid] || 0) / 60;
    if (!(perSec > 0)) break;
    const missing = Math.max(0, recipe.work[sid] - (Number(bk.batch.work) || 0));
    const t = missing / perSec;
    if (t <= remaining + 1e-9) {
      remaining = Math.max(0, remaining - t);
      workDone += missing;
      if (stageIdx >= BAKERY_STATIONS.length - 1) {
        // `remaining` is in SECONDS: the batch finished `remaining` s before the end of the step → convert to ms for the timestamp.
        batches.push(completeBakeryBatch(state, bk, { ...opts, atMs: nowMs - remaining * 1000 }));
      } else {
        bk.batch = { stageIdx: stageIdx + 1, work: 0 };
      }
    } else {
      bk.batch.work = (Number(bk.batch.work) || 0) + perSec * remaining;
      workDone += perSec * remaining;
      remaining = 0;
    }
  }
  const caseFull = bk.showcase.length >= BAKERY_CASE_CAP;
  return { batches, workDone: Math.round(workDone * 1000) / 1000, caseFull, expiredBuffs };
}

/** Puts an idle partner on a station, or — when the partner already works anywhere in the bakery — sends it home (下班). */
export function assignBakeryWorker(state, stationId, monId, opts = {}) {
  const bk = ensureBakeryState(state);
  if (!bk) return { ok: false, reason: "invalid_state" };
  const id = Math.floor(Number(monId) || 0);
  if (id <= 0) return { ok: false, reason: "invalid_mon" };
  const list = Array.isArray(state.mons?.list) ? state.mons.list : [];
  const cur = BAKERY_STATION_IDS.find((sid) => bk.workers[sid] === id);
  if (cur) {
    bk.workers[cur] = 0;
    bakeryPushLog(bk, `【下班】${list.find((m) => m && m.id === id)?.name || "伙伴"} 摘下围裙离开了${getBakeryStationDef(cur)?.name || "工位"}`);
    return { ok: true, working: false, stationId: cur };
  }
  const station = getBakeryStationDef(stationId);
  if (!station) return { ok: false, reason: "unknown_station" };
  if (bk.workers[station.id]) return { ok: false, reason: "station_full" };
  const mon = getIdleBakeryCandidates(state).find((m) => m.id === id);
  if (!mon) return { ok: false, reason: "mon_busy" };
  bk.workers[station.id] = id;
  const ev = evaluateBakeryWorker(mon, station.id, opts);
  bakeryPushLog(bk, `【上岗】${mon.name || "伙伴"} 系上围裙站到了${station.name}${ev.match ? "（属性契合）" : ""}，上岗期间防放生保护生效`);
  return { ok: true, working: true, stationId: station.id, match: ev.match };
}

/** 「一键排班」: fills every empty station — the fastest (station, partner) pairs first, so matched partners land on their own station. */
export function autoStaffBakery(state, opts = {}) {
  const bk = ensureBakeryState(state);
  if (!bk) return { ok: false, added: [] };
  const idle = getIdleBakeryCandidates(state);
  const pairs = [];
  BAKERY_STATIONS.forEach((s, sIdx) => {
    if (bk.workers[s.id]) return;
    for (const m of idle) pairs.push({ s, sIdx, m, ev: evaluateBakeryWorker(m, s.id, opts) });
  });
  pairs.sort(
    (a, b) =>
      b.ev.perMin - a.ev.perMin ||
      Math.floor(Number(b.m.lvl) || 1) - Math.floor(Number(a.m.lvl) || 1) ||
      (a.m.id || 0) - (b.m.id || 0) ||
      a.sIdx - b.sIdx,
  );
  const usedM = new Set();
  const added = [];
  for (const p of pairs) {
    if (usedM.has(p.m.id) || bk.workers[p.s.id]) continue;
    bk.workers[p.s.id] = p.m.id;
    usedM.add(p.m.id);
    added.push({ stationId: p.s.id, monId: p.m.id, match: p.ev.match });
  }
  if (added.length) {
    bakeryPushLog(bk, `【一键排班】${added.length} 位伙伴系上围裙上岗（契合工位 ${added.filter((a) => a.match).length} 个，上岗期间防放生保护生效）`);
  }
  const full = BAKERY_STATION_IDS.every((sid) => bk.workers[sid]);
  return { ok: added.length > 0, reason: added.length ? "" : full ? "stations_full" : "no_idle_mons", added };
}

/** 「全部下班」: every worker goes home (the half-done batch waits on the counter). */
export function dismissAllBakers(state) {
  const bk = ensureBakeryState(state);
  if (!bk) return { ok: false, dismissed: 0 };
  let dismissed = 0;
  for (const sid of BAKERY_STATION_IDS) {
    if (bk.workers[sid]) dismissed += 1;
    bk.workers[sid] = 0;
  }
  if (dismissed) bakeryPushLog(bk, `【全部下班】${dismissed} 位伙伴摘下围裙回家了，没做完的这一炉留在案板上`);
  return { ok: dismissed > 0, dismissed };
}

/** Switches the recipe being baked (unlocked recipes only); the batch keeps its current step (work clamped to the new recipe). */
export function selectBakeryRecipe(state, recipeId) {
  const bk = ensureBakeryState(state);
  if (!bk) return { ok: false, reason: "invalid_state" };
  const def = getBakeryRecipeDef(recipeId);
  if (!def) return { ok: false, reason: "unknown_recipe" };
  if (!isBakeryRecipeUnlocked(state, def.id)) return { ok: false, reason: "locked", needRecipes: def.unlockRecipes };
  if (bk.recipeId === def.id) return { ok: false, reason: "already_selected" };
  bk.recipeId = def.id;
  const need = def.work[BAKERY_STATION_IDS[bk.batch.stageIdx] || "knead"];
  bk.batch.work = Math.max(0, Math.min(need - 0.001, Number(bk.batch.work) || 0));
  bakeryPushLog(bk, `【换食谱】案板上摊开了「${def.name}」的食谱卡`);
  return { ok: true, recipeId: def.id };
}

/** 「享用」: eats one dessert of a recipe (best quality first) and extends its timed buff (≤6h per buff). */
export function enjoyBakeryDessert(state, recipeId) {
  const bk = ensureBakeryState(state);
  if (!bk) return { ok: false, reason: "invalid_state" };
  const def = getBakeryRecipeDef(recipeId);
  if (!def) return { ok: false, reason: "unknown_recipe" };
  let idx = -1;
  bk.showcase.forEach((d, i) => {
    if (d.recipeId === def.id && (idx < 0 || d.q > bk.showcase[idx].q)) idx = i;
  });
  if (idx < 0) return { ok: false, reason: "no_dessert" };
  const [dessert] = bk.showcase.splice(idx, 1);
  const buff = getBakeryBuffDef(def.buffId);
  const addSec = Math.round(def.buffMin * 60 * BAKERY_QUALITY_MUL[dessert.q]);
  const before = Number(bk.buffs[buff.id]) || 0;
  bk.buffs[buff.id] = Math.min(BAKERY_BUFF_MAX_SEC, before + addSec);
  bk.totalEaten = (bk.totalEaten || 0) + 1;
  const logLine = `【享用】大家分吃了一份 ${def.name} ${"★".repeat(dessert.q)}，「${buff.name}」${buff.effectText} 续上 ${Math.round(addSec / 60)} 分钟`;
  bakeryPushLog(bk, logLine);
  return {
    ok: true,
    recipeId: def.id,
    q: dessert.q,
    buffId: buff.id,
    addSec,
    remainingSec: bk.buffs[buff.id],
    capped: before + addSec > BAKERY_BUFF_MAX_SEC,
    logLine,
  };
}

/** 「装盒送出」: every dessert in the showcase becomes 灵果 + 未来币 (by recipe tier × stars). */
export function boxBakeryDesserts(state, opts = {}) {
  const bk = ensureBakeryState(state);
  if (!bk) return { ok: false, reason: "invalid_state" };
  if (!bk.showcase.length) return { ok: false, reason: "empty_case" };
  const rewards = {};
  for (const d of bk.showcase) {
    for (const [rid, n] of Object.entries(getBakeryDessertRewards(d.recipeId, d.q))) rewards[rid] = (rewards[rid] || 0) + n;
  }
  for (const [rid, n] of Object.entries(rewards)) addResDirect(state, rid, n, opts);
  const count = bk.showcase.length;
  bk.showcase = [];
  bk.totalBoxed = (bk.totalBoxed || 0) + count;
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  bk.lastBox = { count, rewards: { ...rewards }, at: nowMs };
  const rewardTxt = Object.entries(rewards)
    .map(([rid, n]) => `${BAKERY_RES_ZH[rid] || rid} +${n}`)
    .join("、");
  const logLine = `【装盒送出】${count} 份甜点装进云朵礼盒送了出去，换来 ${rewardTxt}`;
  bakeryPushLog(bk, logLine);
  return { ok: true, count, rewards, logLine };
}

export function getBakeryRushFreeLeft(state, nowMs = Date.now()) {
  const bk = state?.meta?.cloudBakery;
  if (!bk || typeof bk !== "object") return BAKERY_RUSH_FREE_PER_DAY;
  if (bk.rushDate !== localYmdForSandbox(nowMs)) return BAKERY_RUSH_FREE_PER_DAY;
  return Math.max(0, BAKERY_RUSH_FREE_PER_DAY - Math.floor(Number(bk.rushUsed) || 0));
}

/** 「加急出炉」: the current batch is done at once (needs a worker and room in the showcase). Free once per local day, then futurecoin ×20. */
export function performBakeryRush(state, opts = {}) {
  const bk = ensureBakeryState(state);
  if (!bk) return { ok: false, reason: "invalid_state" };
  if (!getBakeryWorkerMonIds(state).size) return { ok: false, reason: "no_workers" };
  if (bk.showcase.length >= BAKERY_CASE_CAP) return { ok: false, reason: "case_full" };
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const today = localYmdForSandbox(nowMs);
  if (bk.rushDate !== today) {
    bk.rushDate = today;
    bk.rushUsed = 0;
  }
  let costKind = "";
  if (bk.rushUsed < BAKERY_RUSH_FREE_PER_DAY) {
    bk.rushUsed += 1;
    costKind = "free_daily";
  } else if ((Number(state.res?.futurecoin?.value) || 0) >= BAKERY_RUSH_COIN_COST) {
    state.res.futurecoin.value = Math.max(0, Math.floor(state.res.futurecoin.value) - BAKERY_RUSH_COIN_COST);
    costKind = "futurecoin";
  } else {
    return { ok: false, reason: "insufficient_rush_cost" };
  }
  const batch = completeBakeryBatch(state, bk, { ...opts, nowMs });
  const logLine = `【加急出炉】炉火一下子旺了起来，${getBakeryRecipeDef(batch.recipeId)?.name || "甜点"} ${"★".repeat(batch.stars)} 提前出炉`;
  bakeryPushLog(bk, logLine);
  return { ok: true, costKind, batch, logLine };
}

/** Forced release / star-up material: the partner leaves its station. */
export function detachBakeryWorker(state, monId) {
  const bk = state?.meta?.cloudBakery;
  const id = Math.floor(Number(monId) || 0);
  if (!bk || typeof bk !== "object" || !bk.workers || typeof bk.workers !== "object" || id <= 0) return { ok: false, detached: false };
  let detached = false;
  for (const sid of BAKERY_STATION_IDS) {
    if (Math.floor(Number(bk.workers[sid]) || 0) === id) {
      bk.workers[sid] = 0;
      detached = true;
    }
  }
  return { ok: true, detached };
}

/** Rebirth: every worker goes home (partner IDs reset); recipe book, showcase, buffs and batch progress are kept. */
export function recallBakeryForRebirth(state) {
  const bk = state?.meta?.cloudBakery;
  if (!bk || typeof bk !== "object" || !bk.workers || typeof bk.workers !== "object") return { ok: false, recalled: 0 };
  let recalled = 0;
  for (const sid of BAKERY_STATION_IDS) {
    if (Math.floor(Number(bk.workers[sid]) || 0) > 0) recalled += 1;
    bk.workers[sid] = 0;
  }
  return { ok: true, recalled };
}

/**
 * Pure non-mutating aggregator (wired into production / effects / breeding / PvE damage):
 * 永久 每收录一份食谱 全产 +0.25%（8 份 = 2%）· 每份 ★3 完美食谱 PvE +0.5%（8 份 = 4%）；
 * 限时 甜香满屋 全产 +8% · 轻盈脚步 捕获 +1.2% · 糖霜闪闪 闪光 +10% · 元气满满 PvE +6%（享用甜点续时，单项 ≤6h）。
 */
export function computeBakeryAura(state) {
  const raw = state?.meta?.cloudBakery;
  const has = Boolean(raw && typeof raw === "object");
  const recipes = bakeryRecipesOf(state);
  let collected = 0;
  let perfect = 0;
  for (const r of BAKERY_RECIPE_DEFS) {
    const e = recipes[r.id];
    if (!e || !((Number(e.baked) || 0) > 0)) continue;
    collected += 1;
    if ((Number(e.bestQ) || 0) >= 3) perfect += 1;
  }
  const permProdAdd = collected * BAKERY_RECIPE_PROD_ADD;
  const permPveOutAdd = perfect * BAKERY_PERFECT_PVE_ADD;
  let prodAdd = permProdAdd;
  let catchAdd = 0;
  let shinyAdd = 0;
  let pveOutAdd = permPveOutAdd;
  const activeBuffs = [];
  const buffs = has && raw.buffs && typeof raw.buffs === "object" ? raw.buffs : {};
  for (const b of BAKERY_BUFF_DEFS) {
    const rem = Math.max(0, Math.min(BAKERY_BUFF_MAX_SEC, Number(buffs[b.id]) || 0));
    if (rem <= 0) continue;
    activeBuffs.push({ id: b.id, name: b.name, effectText: b.effectText, remainingSec: rem });
    if (b.id === "prod") prodAdd += b.value;
    if (b.id === "catch") catchAdd += b.value;
    if (b.id === "shiny") shinyAdd += b.value;
    if (b.id === "pveOut") pveOutAdd += b.value;
  }
  const round4 = (n) => Math.round(n * 10000) / 10000;
  const totalBatches = has ? Math.max(0, Math.floor(Number(raw.totalBatches) || 0)) : 0;
  return {
    recipesCollected: collected,
    totalRecipes: BAKERY_TOTAL_RECIPES,
    perfectRecipes: perfect,
    workers: has ? getBakeryWorkerMonIds(state).size : 0,
    showcase: has && Array.isArray(raw.showcase) ? raw.showcase.length : 0,
    totalBatches,
    title: getBakeryTitle(totalBatches),
    activeBuffs,
    permProdAdd: round4(permProdAdd),
    permPveOutAdd: round4(permPveOutAdd),
    prodAdd: round4(prodAdd),
    prodMul: round4(1 + prodAdd),
    catchAdd: round4(catchAdd),
    shinyAdd: round4(shinyAdd),
    shinyChanceMul: round4(1 + shinyAdd),
    pveOutAdd: round4(pveOutAdd),
    pveOutMul: round4(1 + pveOutAdd),
  };
}

/**
 * ML-15 彩虹气球旅行 lives in pve_tower.js, but its passengers must join the shared away registry above
 * (collection_fun.js cannot import pve_tower.js without a cycle), so the non-mutating reader sits here.
 */
export const BALLOON_COUNT = 2;
export const BALLOON_SEATS = 2;
export const BALLOON_MAX_TRAVELERS = BALLOON_COUNT * BALLOON_SEATS;

/** Non-mutating read: partners aboard a balloon (flying, or landed and waiting to be met) — protected via the away registry. */
export function getBalloonTravelerMonIds(state) {
  const ids = new Set();
  const balloons = state?.meta?.balloonTravel?.balloons;
  if (!Array.isArray(balloons)) return ids;
  const monList = Array.isArray(state?.mons?.list) ? state.mons.list : null;
  const validSet = monList ? new Set(monList.filter((m) => m && typeof m.id === "number").map((m) => Math.floor(m.id))) : null;
  for (const b of balloons.slice(0, BALLOON_COUNT)) {
    const raw = b?.trip?.passengerIds;
    if (!Array.isArray(raw)) continue;
    for (const v of raw.slice(0, BALLOON_SEATS)) {
      const id = Math.floor(Number(v) || 0);
      if (id > 0 && (!validSet || validSet.has(id))) ids.add(id);
    }
  }
  return ids;
}

/** Idle partners that may board a balloon (shared with the bakery and every other outing). */
export function getIdleBalloonCandidates(state) {
  return listIdleOutingMons(state);
}

// ============================================================================
// ML-16 「云端游乐园」(Cloud Amusement Park)
// 三座游乐设施按属性请伙伴值班操作：星光旋转木马（草 / 水 / 幻）、云朵摩天轮（风 / 光 / 暗）、彩虹过山车（火 / 电 / 岩），每座 1 位操作员。
// 有人操作的设施一轮接一轮地运转：每轮基础时长 6 / 10 / 8 分钟，操作员速度 = 1 × 1.5（属性契合）×（1 + 亲密 / 200）；
// 每轮接待游客 6 / 8 / 5 位（游客满意度 ≥50 每轮多 1 位、≥80 多 2 位），每位游客换 1 张门票（售票亭最多存 600 张，满了的部分流失）。
// 游客满意度 0~100：每转完一轮 +1（属性契合 +3），每小时自然回落 12 点；满意度越高全产越高（每点 +0.03%，满 100 = +3%），
// 并决定「游园活动」限时增益的时长倍率（≥50 ×1.25、≥80 ×1.5）。
// 「游园活动」花门票点亮限时增益（星空烟花秀 全产 +6% / 花车大游行 捕获 +1% / 魔法灯光秀 闪光 +8% / 勇者嘉年华 PvE 增伤 +5%），
// 基础 30 分钟，可叠加、单项最多 4 小时，每办一次满意度 +8。「门票兑换礼包」50 张换灵果 120 + 灵木 60 + 未来币 4。
// 累计游客解锁设施（摩天轮 60 位、过山车 200 位）并升游乐园星级（150 / 600 / 1500 / 3500 / 8000 位 → ★1~★5，每星 全产 +0.4%、PvE +0.5%）。
// 每日一次免费「加场演出」（之后 20 未来币）：所有有人操作的设施立刻多转一轮。每轮操作员经验 +6，每座设施每转 5 轮操作员亲密 +1。
// 值班伙伴经由上方统一登记表接入防放生锁 / 训练 / 远征 / 冠军赛排除；离线补算 ≤12h（按各设施转完一轮的先后顺序逐轮结算，
// 满意度在两轮之间连续回落），强制放生 / 转生让伙伴换班，满意度、门票、星级与限时增益保留。
// ============================================================================

export const PARK_RIDES = Object.freeze(
  [
    { id: "carousel", name: "星光旋转木马", short: "旋转木马", elements: ["grass", "water", "mystic"], roundMin: 6, visitors: 6, unlockVisitors: 0, desc: "花藤缠着的木马一圈圈地转，喷泉跟着八音盒的节拍跳舞。" },
    { id: "ferrisWheel", name: "云朵摩天轮", short: "摩天轮", elements: ["wind", "light", "dark"], roundMin: 10, visitors: 8, unlockVisitors: 60, desc: "转到最高处能看见日出，入夜后整片星空都挂在车厢窗外。" },
    { id: "coaster", name: "彩虹过山车", short: "过山车", elements: ["fire", "electric", "stone"], roundMin: 8, visitors: 5, unlockVisitors: 200, desc: "电光推着车厢冲上岩石轨道，再从彩虹上一口气滑下来。" },
  ].map((r) => Object.freeze({ ...r, elements: Object.freeze(r.elements.slice()) })),
);
export const PARK_RIDE_IDS = Object.freeze(PARK_RIDES.map((r) => r.id));
export const PARK_MAX_OPERATORS = PARK_RIDES.length;
export const PARK_MATCH_MUL = 1.5;
export const PARK_SAT_START = 30;
export const PARK_SAT_MAX = 100;
export const PARK_SAT_DECAY_PER_HOUR = 12;
export const PARK_SAT_DECAY_PER_SEC = PARK_SAT_DECAY_PER_HOUR / 3600;
export const PARK_SAT_GAIN_BASE = 1;
export const PARK_SAT_GAIN_MATCH = 3;
export const PARK_SAT_PROD_PER_POINT = 0.0003;
export const PARK_EVENT_SAT_GAIN = 8;
export const PARK_TICKET_CAP = 600;
export const PARK_MAX_CATCHUP_SEC = 12 * 3600;
export const PARK_BUFF_MAX_SEC = 4 * 3600;
export const PARK_SHOW_FREE_PER_DAY = 1;
export const PARK_SHOW_COIN_COST = 20;
export const PARK_EXP_PER_ROUND = 6;
export const PARK_AFFECTION_EVERY = 5;
export const PARK_GIFT_COST = 50;
export const PARK_GIFT_REWARDS = Object.freeze({ catnip: 120, wood: 60, futurecoin: 4 });
export const PARK_STAR_THRESHOLDS = Object.freeze([150, 600, 1500, 3500, 8000]);
export const PARK_MAX_STARS = PARK_STAR_THRESHOLDS.length;
export const PARK_STAR_PROD_ADD = 0.004;
export const PARK_STAR_PVE_ADD = 0.005;
export const PARK_LOG_KEEP = 6;
export const PARK_RES_ZH = Object.freeze({ catnip: "灵果", wood: "灵木", futurecoin: "未来币" });

/** Satisfaction tiers (first match wins): event duration multiplier + extra visitors per round. */
export const PARK_SAT_TIERS = Object.freeze([
  Object.freeze({ min: 80, name: "欢声雷动", eventMul: 1.5, bonusVisitors: 2 }),
  Object.freeze({ min: 50, name: "笑声不断", eventMul: 1.25, bonusVisitors: 1 }),
  Object.freeze({ min: 20, name: "游人渐多", eventMul: 1, bonusVisitors: 0 }),
  Object.freeze({ min: 0, name: "冷冷清清", eventMul: 1, bonusVisitors: 0 }),
]);

/** 4 park events = 4 timed buffs (keyed by event id). */
export const PARK_EVENT_DEFS = Object.freeze(
  [
    { id: "fireworks", name: "星空烟花秀", stat: "prod", value: 0.06, effectText: "全产 +6%", cost: 120, baseMin: 30, desc: "烟花在摩天轮背后一朵朵绽开，整座乐园的伙伴都干劲十足。" },
    { id: "parade", name: "花车大游行", stat: "catch", value: 0.01, effectText: "捕获 +1%", cost: 120, baseMin: 30, desc: "花车沿着云朵大道慢慢走，路边的萌灵都忍不住凑过来看。" },
    { id: "lightShow", name: "魔法灯光秀", stat: "shiny", value: 0.08, effectText: "闪光 +8%", cost: 160, baseMin: 30, desc: "彩光在旋转木马的镜面上跳来跳去，闪闪发亮的伙伴更容易现身。" },
    { id: "carnival", name: "勇者嘉年华", stat: "pveOut", value: 0.05, effectText: "PvE 增伤 +5%", cost: 160, baseMin: 30, desc: "过山车终点的勇者擂台热闹开场，出战的伙伴个个摩拳擦掌。" },
  ].map((e) => Object.freeze(e)),
);
export const PARK_EVENT_IDS = Object.freeze(PARK_EVENT_DEFS.map((e) => e.id));

const PARK_TITLES = Object.freeze(["云端小乐园", "热闹游乐园", "人气游乐园", "云端梦幻乐园", "星光主题乐园", "传说中的云端乐园"]);

export function getParkRideDef(rideId) {
  return PARK_RIDES.find((r) => r.id === rideId) || null;
}

export function getParkEventDef(eventId) {
  return PARK_EVENT_DEFS.find((e) => e.id === eventId) || null;
}

/** Park stars from total visitors (150 / 600 / 1500 / 3500 / 8000 → ★1~★5). */
export function getParkStars(totalVisitors = 0) {
  const n = Math.max(0, Math.floor(Number(totalVisitors) || 0));
  return PARK_STAR_THRESHOLDS.filter((t) => n >= t).length;
}

export function getParkTitle(stars = 0) {
  return PARK_TITLES[Math.max(0, Math.min(PARK_MAX_STARS, Math.floor(Number(stars) || 0)))];
}

export function getParkSatisfactionTier(satisfaction = 0) {
  const s = Math.max(0, Number(satisfaction) || 0);
  return PARK_SAT_TIERS.find((t) => s >= t.min) || PARK_SAT_TIERS[PARK_SAT_TIERS.length - 1];
}

export function isParkRideUnlocked(state, rideId) {
  const def = getParkRideDef(rideId);
  if (!def) return false;
  return Math.max(0, Math.floor(Number(state?.meta?.cloudPark?.totalVisitors) || 0)) >= def.unlockVisitors;
}

export function ensureCloudParkState(state) {
  if (!state || typeof state !== "object") return null;
  if (!state.meta || typeof state.meta !== "object") state.meta = {};
  const raw = state.meta.cloudPark && typeof state.meta.cloudPark === "object" ? state.meta.cloudPark : {};
  const aliveSet = awayAliveIdSet(state);
  const totalVisitors = Math.max(0, Math.min(99_999_999, Math.floor(Number(raw.totalVisitors) || 0)));
  const rawOps = raw.operators && typeof raw.operators === "object" ? raw.operators : {};
  const operators = {};
  const used = new Set();
  for (const r of PARK_RIDES) {
    const id = Math.floor(Number(rawOps[r.id]) || 0);
    if (id > 0 && !used.has(id) && (!aliveSet || aliveSet.has(id)) && totalVisitors >= r.unlockVisitors) {
      operators[r.id] = id;
      used.add(id);
    } else {
      operators[r.id] = 0;
    }
  }
  const rawRides = raw.rides && typeof raw.rides === "object" ? raw.rides : {};
  const rides = {};
  for (const r of PARK_RIDES) {
    const e = rawRides[r.id] && typeof rawRides[r.id] === "object" ? rawRides[r.id] : {};
    const need = r.roundMin * 60;
    const w = Number(e.work);
    rides[r.id] = {
      work: Number.isFinite(w) && w > 0 ? Math.min(need - 0.001, w) : 0,
      rounds: Math.max(0, Math.min(99_999_999, Math.floor(Number(e.rounds) || 0))),
      lastVisitors: Math.max(0, Math.min(99, Math.floor(Number(e.lastVisitors) || 0))),
    };
  }
  const sat0 = Number(raw.satisfaction);
  const satisfaction = Number.isFinite(sat0) ? Math.max(0, Math.min(PARK_SAT_MAX, sat0)) : PARK_SAT_START;
  const rawBuffs = raw.buffs && typeof raw.buffs === "object" ? raw.buffs : {};
  const buffs = {};
  for (const e of PARK_EVENT_DEFS) {
    const n = Number(rawBuffs[e.id]);
    buffs[e.id] = Number.isFinite(n) && n > 0 ? Math.min(PARK_BUFF_MAX_SEC, n) : 0;
  }
  const le = raw.lastEvent && typeof raw.lastEvent === "object" ? raw.lastEvent : null;
  const leDef = le ? getParkEventDef(le.eventId) : null;
  const lastEvent = leDef
    ? {
        eventId: leDef.id,
        addSec: Math.max(0, Math.min(PARK_BUFF_MAX_SEC, Math.floor(Number(le.addSec) || 0))),
        eventMul: Math.max(1, Math.min(1.5, Number(le.eventMul) || 1)),
        at: typeof le.at === "number" && Number.isFinite(le.at) ? le.at : 0,
      }
    : null;
  const recentLogs = Array.isArray(raw.recentLogs)
    ? raw.recentLogs.filter((s) => typeof s === "string" && s.trim().length > 0).slice(0, PARK_LOG_KEEP)
    : [];
  const clean = {
    initialized: true,
    operators,
    rides,
    satisfaction,
    tickets: Math.max(0, Math.min(PARK_TICKET_CAP, Math.floor(Number(raw.tickets) || 0))),
    totalVisitors,
    totalRounds: Math.max(0, Math.floor(Number(raw.totalRounds) || 0)),
    totalEvents: Math.max(0, Math.floor(Number(raw.totalEvents) || 0)),
    totalGifts: Math.max(0, Math.floor(Number(raw.totalGifts) || 0)),
    ticketsLost: Math.max(0, Math.floor(Number(raw.ticketsLost) || 0)),
    buffs,
    showDate: typeof raw.showDate === "string" ? raw.showDate : "",
    showUsed: Math.max(0, Math.floor(Number(raw.showUsed) || 0)),
    lastEvent,
    recentLogs,
  };
  if (state.meta.cloudPark && typeof state.meta.cloudPark === "object") {
    Object.assign(state.meta.cloudPark, clean);
    return state.meta.cloudPark;
  }
  state.meta.cloudPark = clean;
  return clean;
}

function parkPushLog(pk, line) {
  pk.recentLogs = [line, ...(pk.recentLogs || [])].slice(0, PARK_LOG_KEEP);
}

/** Non-mutating read: partners operating a park ride — protected via the away registry. */
export function getCloudParkOperatorMonIds(state) {
  const ids = new Set();
  const raw = state?.meta?.cloudPark?.operators;
  if (!raw || typeof raw !== "object") return ids;
  const validSet = awayAliveIdSet(state);
  for (const rid of PARK_RIDE_IDS) {
    const id = Math.floor(Number(raw[rid]) || 0);
    if (id > 0 && (!validSet || validSet.has(id))) ids.add(id);
  }
  return ids;
}

/** The ride a partner operates (or null). */
export function getCloudParkRideOfMon(state, monId) {
  const id = Math.floor(Number(monId) || 0);
  const raw = state?.meta?.cloudPark?.operators;
  if (id <= 0 || !raw || typeof raw !== "object") return null;
  const rid = PARK_RIDE_IDS.find((r) => Math.floor(Number(raw[r]) || 0) === id);
  return rid ? getParkRideDef(rid) : null;
}

/** Idle partners that may operate a ride (not busy anywhere, incl. every away activity). */
export function getIdleParkCandidates(state) {
  return listIdleOutingMons(state);
}

function parkTypesOf(mon, opts = {}) {
  if (typeof opts.getMonTypes === "function") {
    const t = opts.getMonTypes(mon);
    if (Array.isArray(t) && t.length) return t.filter((x) => typeof x === "string");
  }
  return resolveMonTypesForEco(mon, opts);
}

/** Operator preview: speed = 1 × 1.5（属性契合）×（1 + 亲密 / 200）, round time = base / speed, satisfaction +3 (matched) / +1. */
export function evaluateParkOperator(mon, rideId, opts = {}) {
  const ride = getParkRideDef(rideId);
  if (!mon || !ride) return { match: false, speed: 0, roundSec: Infinity, satGain: 0, affection: 0, types: [] };
  const types = parkTypesOf(mon, opts);
  const match = types.some((t) => ride.elements.includes(t));
  const aff = Math.max(0, Math.min(100, typeof mon.affection === "number" && Number.isFinite(mon.affection) ? mon.affection : 0));
  const speed = Math.round((match ? PARK_MATCH_MUL : 1) * (1 + aff / 200) * 1000) / 1000;
  return { match, speed, roundSec: Math.round((ride.roundMin * 60) / speed), satGain: match ? PARK_SAT_GAIN_MATCH : PARK_SAT_GAIN_BASE, affection: aff, types };
}

function parkOperatorMon(state, rideId) {
  const id = Math.floor(Number(state?.meta?.cloudPark?.operators?.[rideId]) || 0);
  if (id <= 0) return null;
  const list = Array.isArray(state?.mons?.list) ? state.mons.list : [];
  return list.find((m) => m && m.id === id) || null;
}

/** Live speed of every ride (0 = nobody operates it or it is still locked). */
export function getParkRideSpeeds(state, opts = {}) {
  const out = {};
  for (const r of PARK_RIDES) {
    const m = isParkRideUnlocked(state, r.id) ? parkOperatorMon(state, r.id) : null;
    out[r.id] = m ? evaluateParkOperator(m, r.id, opts).speed : 0;
  }
  return out;
}

/** Visitors of one round of a ride at the current satisfaction. */
export function getParkRoundVisitors(rideId, satisfaction = 0) {
  const ride = getParkRideDef(rideId);
  if (!ride) return 0;
  return ride.visitors + getParkSatisfactionTier(satisfaction).bonusVisitors;
}

/** Finishes one round: visitors → tickets (cap 600), satisfaction gain, total visitors / stars, operator exp / affection. */
function completeParkRound(state, pk, ride, opts = {}) {
  const mon = parkOperatorMon(state, ride.id);
  const ev = evaluateParkOperator(mon, ride.id, opts);
  const visitors = getParkRoundVisitors(ride.id, pk.satisfaction);
  const room = Math.max(0, PARK_TICKET_CAP - (pk.tickets || 0));
  const tickets = Math.min(room, visitors);
  const lost = visitors - tickets;
  const unlockedBefore = new Set(PARK_RIDES.filter((r) => isParkRideUnlocked(state, r.id)).map((r) => r.id));
  const starsBefore = getParkStars(pk.totalVisitors);
  pk.tickets = (pk.tickets || 0) + tickets;
  pk.ticketsLost = (pk.ticketsLost || 0) + lost;
  pk.totalVisitors = (pk.totalVisitors || 0) + visitors;
  pk.totalRounds = (pk.totalRounds || 0) + 1;
  pk.satisfaction = Math.min(PARK_SAT_MAX, Math.max(0, Number(pk.satisfaction) || 0) + (mon ? ev.satGain : PARK_SAT_GAIN_BASE));
  const rs = pk.rides[ride.id];
  rs.work = 0;
  rs.rounds = (rs.rounds || 0) + 1;
  rs.lastVisitors = visitors;
  if (mon) {
    if (typeof opts.addExpToMon === "function") opts.addExpToMon(mon, PARK_EXP_PER_ROUND);
    else mon.exp = Math.max(0, Math.floor((Number(mon.exp) || 0) + PARK_EXP_PER_ROUND));
    if (rs.rounds % PARK_AFFECTION_EVERY === 0) {
      const aff0 = typeof mon.affection === "number" && Number.isFinite(mon.affection) ? mon.affection : 0;
      mon.affection = Math.min(100, Math.max(0, aff0 + 1));
    }
  }
  const starsAfter = getParkStars(pk.totalVisitors);
  if (starsAfter > starsBefore) parkPushLog(pk, `【游乐园升星】累计接待游客 ${pk.totalVisitors} 位，云端游乐园升为 ${"★".repeat(starsAfter)}「${getParkTitle(starsAfter)}」`);
  const unlockedRides = PARK_RIDES.filter((r) => !unlockedBefore.has(r.id) && isParkRideUnlocked(state, r.id)).map((r) => r.id);
  for (const id of unlockedRides) parkPushLog(pk, `【新设施开放】「${getParkRideDef(id)?.name || id}」建好了，快请伙伴来值班`);
  const at =
    typeof opts.atMs === "number" && Number.isFinite(opts.atMs)
      ? opts.atMs
      : typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs)
        ? opts.nowMs
        : Date.now();
  return { rideId: ride.id, monId: mon?.id || 0, visitors, tickets, lost, match: Boolean(mon && ev.match), starsUp: starsAfter > starsBefore ? starsAfter : 0, unlockedRides, at };
}

/**
 * Live tick + offline catch-up (≤12h): the rides turn round after round at their operators' speed; rounds are settled in
 * chronological order and satisfaction decays continuously between them, so one long step equals many short ones.
 * Timed buffs count down with the real elapsed time. opts.nowMs = end of the step (ms).
 */
export function advanceCloudPark(state, dtSec, opts = {}) {
  const pk = state?.meta?.cloudPark;
  const empty = { rounds: [], visitors: 0, ticketsAdded: 0, ticketsLost: 0, expiredBuffs: [], newStars: 0, unlockedRides: [], ticketsFull: false };
  if (!pk || typeof pk !== "object" || !pk.operators || !pk.rides || !pk.buffs) return empty;
  const dt = typeof dtSec === "number" && Number.isFinite(dtSec) && dtSec > 0 ? dtSec : 0;
  if (dt <= 0) return empty;
  const expiredBuffs = [];
  for (const e of PARK_EVENT_DEFS) {
    const before = Number(pk.buffs[e.id]) || 0;
    if (before <= 0) continue;
    const after = Math.max(0, before - dt);
    pk.buffs[e.id] = after;
    if (after <= 0) expiredBuffs.push(e.id);
  }
  const step = Math.min(PARK_MAX_CATCHUP_SEC, dt);
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const starsBefore = getParkStars(pk.totalVisitors);
  const ticketsFullBefore = (pk.tickets || 0) >= PARK_TICKET_CAP;
  const decay = (sec) => {
    pk.satisfaction = Math.max(0, (Number(pk.satisfaction) || 0) - PARK_SAT_DECAY_PER_SEC * sec);
  };
  const rounds = [];
  let remaining = step;
  for (let guard = 0; guard < 6000 && remaining > 1e-9; guard += 1) {
    const speeds = getParkRideSpeeds(state, opts);
    let next = null;
    for (const r of PARK_RIDES) {
      const sp = speeds[r.id];
      if (!(sp > 0)) continue;
      const t = Math.max(0, (r.roundMin * 60 - (Number(pk.rides[r.id].work) || 0)) / sp);
      if (!next || t < next.t - 1e-9) next = { ride: r, t };
    }
    const finishing = Boolean(next && next.t <= remaining + 1e-9);
    const t = finishing ? Math.max(0, next.t) : remaining;
    for (const r of PARK_RIDES) {
      const sp = speeds[r.id];
      if (!(sp > 0) || (finishing && r.id === next.ride.id)) continue;
      pk.rides[r.id].work = Math.min(r.roundMin * 60, (Number(pk.rides[r.id].work) || 0) + sp * t);
    }
    decay(t);
    remaining = Math.max(0, remaining - t);
    if (!finishing) break;
    // `remaining` is in SECONDS: the round finished `remaining` s before the end of the step → convert to ms for the timestamp.
    rounds.push(completeParkRound(state, pk, next.ride, { ...opts, atMs: nowMs - remaining * 1000 }));
  }
  const ticketsFull = (pk.tickets || 0) >= PARK_TICKET_CAP;
  if (ticketsFull && !ticketsFullBefore && rounds.length) parkPushLog(pk, `【售票亭满了】门票攒满 ${PARK_TICKET_CAP} 张，办一场游园活动或兑换礼包吧（满了以后新门票会流失）`);
  const starsAfter = getParkStars(pk.totalVisitors);
  return {
    rounds,
    visitors: rounds.reduce((s, r) => s + r.visitors, 0),
    ticketsAdded: rounds.reduce((s, r) => s + r.tickets, 0),
    ticketsLost: rounds.reduce((s, r) => s + r.lost, 0),
    expiredBuffs,
    newStars: starsAfter > starsBefore ? starsAfter : 0,
    unlockedRides: rounds.flatMap((r) => r.unlockedRides),
    ticketsFull: ticketsFull && !ticketsFullBefore,
  };
}

/** Puts an idle partner on a ride, or — when the partner already operates any ride — lets it go home (换班). */
export function assignParkOperator(state, rideId, monId, opts = {}) {
  const pk = ensureCloudParkState(state);
  if (!pk) return { ok: false, reason: "invalid_state" };
  const id = Math.floor(Number(monId) || 0);
  if (id <= 0) return { ok: false, reason: "invalid_mon" };
  const list = Array.isArray(state.mons?.list) ? state.mons.list : [];
  const cur = PARK_RIDE_IDS.find((rid) => pk.operators[rid] === id);
  if (cur) {
    pk.operators[cur] = 0;
    parkPushLog(pk, `【换班】${list.find((m) => m && m.id === id)?.name || "伙伴"} 离开了「${getParkRideDef(cur)?.name || "游乐设施"}」的操作台`);
    return { ok: true, operating: false, rideId: cur };
  }
  const ride = getParkRideDef(rideId);
  if (!ride) return { ok: false, reason: "unknown_ride" };
  if (!isParkRideUnlocked(state, ride.id)) return { ok: false, reason: "ride_locked", needVisitors: ride.unlockVisitors };
  if (pk.operators[ride.id]) return { ok: false, reason: "ride_full" };
  const mon = getIdleParkCandidates(state).find((m) => m.id === id);
  if (!mon) return { ok: false, reason: "mon_busy" };
  pk.operators[ride.id] = id;
  const ev = evaluateParkOperator(mon, ride.id, opts);
  parkPushLog(pk, `【上岗值班】${mon.name || "伙伴"} 握住了「${ride.name}」的操作杆${ev.match ? "（属性契合）" : ""}，值班期间防放生保护生效`);
  return { ok: true, operating: true, rideId: ride.id, match: ev.match };
}

/** 「一键排班」: fills every unlocked empty ride — the fastest (ride, partner) pairs first, so matched partners land on their own ride. */
export function autoStaffCloudPark(state, opts = {}) {
  const pk = ensureCloudParkState(state);
  if (!pk) return { ok: false, added: [] };
  const idle = getIdleParkCandidates(state);
  const pairs = [];
  PARK_RIDES.forEach((r, rIdx) => {
    if (pk.operators[r.id] || !isParkRideUnlocked(state, r.id)) return;
    for (const m of idle) pairs.push({ r, rIdx, m, ev: evaluateParkOperator(m, r.id, opts) });
  });
  pairs.sort(
    (a, b) =>
      b.ev.speed - a.ev.speed ||
      Math.floor(Number(b.m.lvl) || 1) - Math.floor(Number(a.m.lvl) || 1) ||
      (a.m.id || 0) - (b.m.id || 0) ||
      a.rIdx - b.rIdx,
  );
  const usedM = new Set();
  const added = [];
  for (const p of pairs) {
    if (usedM.has(p.m.id) || pk.operators[p.r.id]) continue;
    pk.operators[p.r.id] = p.m.id;
    usedM.add(p.m.id);
    added.push({ rideId: p.r.id, monId: p.m.id, match: p.ev.match });
  }
  if (added.length) {
    parkPushLog(pk, `【一键排班】${added.length} 位伙伴到游乐设施值班（属性契合 ${added.filter((a) => a.match).length} 座，值班期间防放生保护生效）`);
  }
  const openRides = PARK_RIDES.filter((r) => isParkRideUnlocked(state, r.id));
  const full = openRides.every((r) => pk.operators[r.id]);
  return { ok: added.length > 0, reason: added.length ? "" : full ? "rides_full" : "no_idle_mons", added };
}

/** 「全部换班」: every operator goes home (the half-turned rounds wait). */
export function dismissParkOperators(state) {
  const pk = ensureCloudParkState(state);
  if (!pk) return { ok: false, dismissed: 0 };
  let dismissed = 0;
  for (const rid of PARK_RIDE_IDS) {
    if (pk.operators[rid]) dismissed += 1;
    pk.operators[rid] = 0;
  }
  if (dismissed) parkPushLog(pk, `【全部换班】${dismissed} 位伙伴交接了操作台回家休息，设施停在原地等下一班`);
  return { ok: dismissed > 0, dismissed };
}

/** 「游园活动」: spends tickets, lights the event's timed buff (base 30 min × satisfaction multiplier, ≤4h) and lifts satisfaction +8. */
export function launchParkEvent(state, eventId, opts = {}) {
  const pk = ensureCloudParkState(state);
  if (!pk) return { ok: false, reason: "invalid_state" };
  const def = getParkEventDef(eventId);
  if (!def) return { ok: false, reason: "unknown_event" };
  if ((pk.tickets || 0) < def.cost) return { ok: false, reason: "not_enough_tickets", need: def.cost };
  const before = Number(pk.buffs[def.id]) || 0;
  if (before >= PARK_BUFF_MAX_SEC - 1) return { ok: false, reason: "buff_full" };
  const tier = getParkSatisfactionTier(pk.satisfaction);
  const addSec = Math.round(def.baseMin * 60 * tier.eventMul);
  pk.tickets -= def.cost;
  pk.buffs[def.id] = Math.min(PARK_BUFF_MAX_SEC, before + addSec);
  pk.satisfaction = Math.min(PARK_SAT_MAX, (Number(pk.satisfaction) || 0) + PARK_EVENT_SAT_GAIN);
  pk.totalEvents = (pk.totalEvents || 0) + 1;
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  pk.lastEvent = { eventId: def.id, addSec, eventMul: tier.eventMul, at: nowMs };
  const logLine = `【游园活动】「${def.name}」开场（门票 -${def.cost}），${def.effectText} 续上 ${Math.round(addSec / 60)} 分钟${tier.eventMul > 1 ? `（满意度「${tier.name}」×${tier.eventMul}）` : ""}`;
  parkPushLog(pk, logLine);
  return { ok: true, eventId: def.id, addSec, eventMul: tier.eventMul, remainingSec: pk.buffs[def.id], capped: before + addSec > PARK_BUFF_MAX_SEC, logLine };
}

/** 「门票兑换礼包」: 50 tickets → 灵果 120 + 灵木 60 + 未来币 4. */
export function exchangeParkTickets(state, opts = {}) {
  const pk = ensureCloudParkState(state);
  if (!pk) return { ok: false, reason: "invalid_state" };
  if ((pk.tickets || 0) < PARK_GIFT_COST) return { ok: false, reason: "not_enough_tickets", need: PARK_GIFT_COST };
  pk.tickets -= PARK_GIFT_COST;
  for (const [rid, n] of Object.entries(PARK_GIFT_REWARDS)) addResDirect(state, rid, n, opts);
  pk.totalGifts = (pk.totalGifts || 0) + 1;
  const txt = Object.entries(PARK_GIFT_REWARDS)
    .map(([rid, n]) => `${PARK_RES_ZH[rid] || rid} +${n}`)
    .join("、");
  const logLine = `【门票兑换】${PARK_GIFT_COST} 张门票换成了游乐园礼包：${txt}`;
  parkPushLog(pk, logLine);
  return { ok: true, rewards: { ...PARK_GIFT_REWARDS }, logLine };
}

export function getParkShowFreeLeft(state, nowMs = Date.now()) {
  const pk = state?.meta?.cloudPark;
  if (!pk || typeof pk !== "object") return PARK_SHOW_FREE_PER_DAY;
  if (pk.showDate !== localYmdForSandbox(nowMs)) return PARK_SHOW_FREE_PER_DAY;
  return Math.max(0, PARK_SHOW_FREE_PER_DAY - Math.floor(Number(pk.showUsed) || 0));
}

/** 「加场演出」: every operated (unlocked) ride turns one extra round at once. Free once per local day, then futurecoin ×20. */
export function performParkExtraShow(state, opts = {}) {
  const pk = ensureCloudParkState(state);
  if (!pk) return { ok: false, reason: "invalid_state" };
  const speeds = getParkRideSpeeds(state, opts);
  const running = PARK_RIDES.filter((r) => speeds[r.id] > 0);
  if (!running.length) return { ok: false, reason: "no_operators" };
  const nowMs = typeof opts.nowMs === "number" && Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const today = localYmdForSandbox(nowMs);
  if (pk.showDate !== today) {
    pk.showDate = today;
    pk.showUsed = 0;
  }
  let costKind = "";
  if (pk.showUsed < PARK_SHOW_FREE_PER_DAY) {
    pk.showUsed += 1;
    costKind = "free_daily";
  } else if ((Number(state.res?.futurecoin?.value) || 0) >= PARK_SHOW_COIN_COST) {
    state.res.futurecoin.value = Math.max(0, Math.floor(state.res.futurecoin.value) - PARK_SHOW_COIN_COST);
    costKind = "futurecoin";
  } else {
    return { ok: false, reason: "insufficient_show_cost" };
  }
  const rounds = running.map((r) => completeParkRound(state, pk, r, { ...opts, nowMs }));
  const visitors = rounds.reduce((s, r) => s + r.visitors, 0);
  const logLine = `【加场演出】${running.map((r) => `「${r.short}」`).join("")}各加开一轮，又接待了 ${visitors} 位游客`;
  parkPushLog(pk, logLine);
  return { ok: true, costKind, rounds, visitors, logLine };
}

/** Forced release / star-up material: the partner leaves its ride. */
export function detachCloudParkOperator(state, monId) {
  const pk = state?.meta?.cloudPark;
  const id = Math.floor(Number(monId) || 0);
  if (!pk || typeof pk !== "object" || !pk.operators || typeof pk.operators !== "object" || id <= 0) return { ok: false, detached: false };
  let detached = false;
  for (const rid of PARK_RIDE_IDS) {
    if (Math.floor(Number(pk.operators[rid]) || 0) === id) {
      pk.operators[rid] = 0;
      detached = true;
    }
  }
  return { ok: true, detached };
}

/** Rebirth: every operator goes home (partner IDs reset); satisfaction, tickets, stars, rides' progress and buffs are kept. */
export function recallCloudParkForRebirth(state) {
  const pk = state?.meta?.cloudPark;
  if (!pk || typeof pk !== "object" || !pk.operators || typeof pk.operators !== "object") return { ok: false, recalled: 0 };
  let recalled = 0;
  for (const rid of PARK_RIDE_IDS) {
    if (Math.floor(Number(pk.operators[rid]) || 0) > 0) recalled += 1;
    pk.operators[rid] = 0;
  }
  return { ok: true, recalled };
}

/**
 * Pure non-mutating aggregator (wired into production / effects / breeding / PvE damage):
 * 永久 游乐园星级每星 全产 +0.4%、PvE +0.5%（★5 = 2% / 2.5%）；满意度每点 全产 +0.03%（满 100 = 3%）；
 * 限时 星空烟花秀 全产 +6% · 花车大游行 捕获 +1% · 魔法灯光秀 闪光 +8% · 勇者嘉年华 PvE +5%（单项 ≤4h）。
 */
export function computeCloudParkAura(state) {
  const raw = state?.meta?.cloudPark;
  const has = Boolean(raw && typeof raw === "object");
  const totalVisitors = has ? Math.max(0, Math.floor(Number(raw.totalVisitors) || 0)) : 0;
  const stars = getParkStars(totalVisitors);
  const sat = has ? Math.max(0, Math.min(PARK_SAT_MAX, Number(raw.satisfaction) || 0)) : 0;
  const satProdAdd = Math.floor(sat) * PARK_SAT_PROD_PER_POINT;
  const permProdAdd = stars * PARK_STAR_PROD_ADD;
  const permPveOutAdd = stars * PARK_STAR_PVE_ADD;
  let prodAdd = permProdAdd + satProdAdd;
  let catchAdd = 0;
  let shinyAdd = 0;
  let pveOutAdd = permPveOutAdd;
  const activeBuffs = [];
  const buffs = has && raw.buffs && typeof raw.buffs === "object" ? raw.buffs : {};
  for (const e of PARK_EVENT_DEFS) {
    const rem = Math.max(0, Math.min(PARK_BUFF_MAX_SEC, Number(buffs[e.id]) || 0));
    if (rem <= 0) continue;
    activeBuffs.push({ id: e.id, name: e.name, effectText: e.effectText, remainingSec: rem });
    if (e.stat === "prod") prodAdd += e.value;
    if (e.stat === "catch") catchAdd += e.value;
    if (e.stat === "shiny") shinyAdd += e.value;
    if (e.stat === "pveOut") pveOutAdd += e.value;
  }
  const round4 = (n) => Math.round(n * 10000) / 10000;
  return {
    stars,
    maxStars: PARK_MAX_STARS,
    title: getParkTitle(stars),
    nextStarAt: PARK_STAR_THRESHOLDS[stars] ?? null,
    totalVisitors,
    totalRounds: has ? Math.max(0, Math.floor(Number(raw.totalRounds) || 0)) : 0,
    satisfaction: sat,
    satTier: getParkSatisfactionTier(sat),
    tickets: has ? Math.max(0, Math.floor(Number(raw.tickets) || 0)) : 0,
    operators: has ? getCloudParkOperatorMonIds(state).size : 0,
    activeBuffs,
    satProdAdd: round4(satProdAdd),
    permProdAdd: round4(permProdAdd),
    permPveOutAdd: round4(permPveOutAdd),
    prodAdd: round4(prodAdd),
    prodMul: round4(1 + prodAdd),
    catchAdd: round4(catchAdd),
    shinyAdd: round4(shinyAdd),
    shinyChanceMul: round4(1 + shinyAdd),
    pveOutAdd: round4(pveOutAdd),
    pveOutMul: round4(1 + pveOutAdd),
  };
}

/**
 * ML-16 星空露营观测 lives in pve_tower.js, but its campers must join the shared away registry above
 * (collection_fun.js cannot import pve_tower.js without a cycle), so the non-mutating reader sits here.
 */
export const STARGAZE_SITE_COUNT = 3;
export const STARGAZE_SEATS = 2;
export const STARGAZE_MAX_CAMPERS = STARGAZE_SITE_COUNT * STARGAZE_SEATS;
/** Campsite names by index (the full table lives in pve_tower.js STARGAZE_SITES; kept in sync by ml16-selfcheck). */
export const STARGAZE_SITE_NAMES = Object.freeze(["萤火草坡", "镜湖星湾", "云巅观星台"]);

/** Non-mutating read: partners on a night camp (camping, or back at dawn with unclaimed records) — protected via the away registry. */
export function getStargazeCamperMonIds(state) {
  const ids = new Set();
  const sites = state?.meta?.stargazeCamp?.sites;
  if (!Array.isArray(sites)) return ids;
  const validSet = awayAliveIdSet(state);
  for (const site of sites.slice(0, STARGAZE_SITE_COUNT)) {
    const raw = site?.trip?.camperIds;
    if (!Array.isArray(raw)) continue;
    for (const v of raw.slice(0, STARGAZE_SEATS)) {
      const id = Math.floor(Number(v) || 0);
      if (id > 0 && (!validSet || validSet.has(id))) ids.add(id);
    }
  }
  return ids;
}

/** Idle partners that may go on a night camp (shared with every other outing). */
export function getIdleStargazeCandidates(state) {
  return listIdleOutingMons(state);
}

/**
 * ML-17 冰晶溜冰场 / 花田蜜蜂工坊 live in pve_tower.js; like the night camp, their partners join the shared away registry above
 * (collection_fun.js cannot import pve_tower.js without a cycle), so the non-mutating readers and the tables they need sit here.
 */
export const ICE_RINK_SLOTS = 3;
/** Program names by id (the full table lives in pve_tower.js ICE_RINK_PROGRAMS; kept in sync by ml17-selfcheck). */
export const ICE_RINK_PROGRAM_NAMES = Object.freeze({ snowWaltz: "雪花圆舞曲", auroraDuet: "极光双人滑", crystalTango: "冰晶探戈" });
export const BEE_HIVE_COUNT = 3;
export const BEE_SEATS = 2;
export const BEE_MAX_KEEPERS = BEE_HIVE_COUNT * BEE_SEATS;
/** Hive names by index (the full table lives in pve_tower.js BEE_HIVES; kept in sync by ml17-selfcheck). */
export const BEE_HIVE_NAMES = Object.freeze(["向阳蜂箱", "溪畔蜂箱", "林间蜂箱"]);

/** Non-mutating read: partners skating a program (rehearsing, or finished with an unclaimed score) — protected via the away registry. */
export function getIceRinkSkaterMonIds(state) {
  const ids = new Set();
  const raw = state?.meta?.iceRink?.show?.skaterIds;
  if (!Array.isArray(raw)) return ids;
  const validSet = awayAliveIdSet(state);
  for (const v of raw.slice(0, ICE_RINK_SLOTS)) {
    const id = Math.floor(Number(v) || 0);
    if (id > 0 && (!validSet || validSet.has(id))) ids.add(id);
  }
  return ids;
}

/** Non-mutating read: partners tending a hive (tending, or done with unclaimed honey) — protected via the away registry. */
export function getBeeKeeperMonIds(state) {
  const ids = new Set();
  const hives = state?.meta?.beeWorkshop?.hives;
  if (!Array.isArray(hives)) return ids;
  const validSet = awayAliveIdSet(state);
  for (const hive of hives.slice(0, BEE_HIVE_COUNT)) {
    const raw = hive?.trip?.keeperIds;
    if (!Array.isArray(raw)) continue;
    for (const v of raw.slice(0, BEE_SEATS)) {
      const id = Math.floor(Number(v) || 0);
      if (id > 0 && (!validSet || validSet.has(id))) ids.add(id);
    }
  }
  return ids;
}

/** Idle partners that may skate or tend hives (shared with every other outing). */
export function getIdleIceRinkCandidates(state) {
  return listIdleOutingMons(state);
}

export function getIdleBeeCandidates(state) {
  return listIdleOutingMons(state);
}
