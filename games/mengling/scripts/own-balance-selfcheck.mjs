#!/usr/bin/env node
// 自有数值换上以后的平衡断言（ML-COM1）：到各纪元用时、捕捉成功率、各章 PvE 通过率，与换数值前（0.7.59）相差不超过 ±15%。
// BASELINE 是 0.7.59 的聚合结果（同一脚本、同一组种子跑出来的均值），不含任何逐物种数值。
// 用法：node scripts/own-balance-selfcheck.mjs [--measure]（--measure 只打印测量值，用来重定基线）
const FIXED_NOW = Date.UTC(2026, 10, 26, 4, 0, 0);
const RealDate = Date;
globalThis.Date = class FixedDate extends RealDate {
  constructor(...args) {
    if (args.length) super(...args);
    else super(FIXED_NOW);
  }
  static now() {
    return FIXED_NOW;
  }
};
let seedState = 1;
function nextUint32() {
  seedState ^= seedState << 13;
  seedState ^= seedState >>> 17;
  seedState ^= seedState << 5;
  return seedState >>> 0;
}
Object.defineProperty(globalThis, "crypto", {
  configurable: true,
  value: { getRandomValues: (buf) => { for (let i = 0; i < buf.length; i++) buf[i] = nextUint32(); return buf; } },
});
Math.random = () => nextUint32() / 4294967296;
const reseed = (seed) => {
  seedState = (seed * 2654435761) >>> 0 || 1;
};

const { createPlayerSim } = await import("./_player_sim_core.mjs");
const { CAPTURE_AREAS } = await import("../modules/config.js");
const { beasts } = await import("../modules/beast_defs.js");
const { createCaptureSystem } = await import("../modules/app/capture_system.js");
const { simulateBattle, pveFightModifiers, typeMatchScore } = await import("../modules/pve_battle.js");
const { PVE_CHAPTERS } = await import("../modules/pve_defs.js");
const { getMonCurrentStats, monPower, createMonInstance } = await import("../modules/mons.js");
const { createBeastDataClient } = await import("../modules/beast_data.js");

const TOLERANCE = 0.15;
const SEEDS = [1, 7, 23];
const ERAS = 6;
const MAX_HOURS = 40;
const TRIALS = 80;
const LEVEL_FACTORS = [0.6, 0.75, 0.9, 1.05, 1.2, 1.35];
const WEIGHT = { common: 80, uncommon: 15, rare: 4, epic: 1 };

const BASELINE = {
  areaChance: [0.3245, 0.2735, 0.3312, 0.3284, 0.28, 0.265, 0.3098, 0.2131, 0.0471],
  eraHours: [4.0722, 7.85, 10.4278, 12.6889, 16.45, 28.4278],
  eraSuccess: [0.371, 0.397, 0.4131, 0.4354, 0.432, 0.4397],
  pveGrown: [0.6177, 0.5268, 0.6617, 0.5828, 0.5533, 0.549, 0.341, 0.3451],
  pveMixed: [0.4637, 0.373, 0.486, 0.3617, 0.3237, 0.3335, 0.1757, 0.1747],
};

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

// ---- 各生态区平均单球成功率（按遇见权重） ----
const capture = createCaptureSystem({ defs: { beasts }, getState: () => ({ dex: { caught: {} } }), ui: {}, randFloat: Math.random });
const areaChance = CAPTURE_AREAS.map((area) => {
  let w = 0;
  let c = 0;
  for (const p of beasts.filter(area.pool)) {
    w += WEIGHT[p.tier];
    c += WEIGHT[p.tier] * capture.getBaseCatchChanceByDex(p.dex);
  }
  return c / w;
});

// ---- 玩家模拟：到第 2～7 纪元用时与累计捕捉成功率 ----
/** 缺图鉴就去缺得最多的区，否则去最好抓的区（与 rebirth-speed-selfcheck 同一规则） */
function pickArea(unlocked, api) {
  const needDex = (api.state.era?.quests || []).some((q) => !q.done && (q.type === "dex_unique" || q.type === "or"));
  let best = unlocked[0];
  let bestScore = -1;
  for (const area of unlocked) {
    const score = needDex
      ? api.defs.beasts.filter((p) => area.pool(p) && !(api.state.dex?.caught?.[p.id] > 0)).length
      : areaChance[CAPTURE_AREAS.findIndex((a) => a.id === area.id)];
    if (score > bestScore) {
      best = area;
      bestScore = score;
    }
  }
  return best.id;
}
const laps = SEEDS.map((seed) => {
  reseed(seed);
  const sim = createPlayerSim({ seed, dt: 10, pickArea });
  const hours = [];
  const success = [];
  for (let i = 1; i <= ERAS; i++) {
    hours.push(sim.runUntilEra(i, MAX_HOURS));
    success.push(sim.stats.catches / Math.max(1, sim.stats.catches + sim.stats.catchFails));
  }
  return { hours, success, fails: sim.findings.filter((f) => f.sev === "FAIL").map((f) => f.msg) };
});
const eraHours = [...Array(ERAS)].map((_, i) => (laps.every((l) => l.hours[i] != null) ? mean(laps.map((l) => l.hours[i])) : null));
const eraSuccess = [...Array(ERAS)].map((_, i) => mean(laps.map((l) => l.success[i])));

// ---- PvE：9 只里挑 4 只出战，队伍等级 = 关卡平均等级 × 系数；真实属性表 + 真实战斗 ----
const { getBeastDataByDex } = createBeastDataClient();
const byPid = new Map(beasts.map((b) => [b.id, b]));
const evolvedPids = new Set(Object.values(globalThis.BEAST_EVO).flat());
const roots = beasts.filter((b) => !evolvedPids.has(b.id));
function needLevel(from, to, stage) {
  const r = globalThis.BEAST_EVO_REQ?.[from]?.[to];
  const lvl = r && typeof r === "object" ? r.lvl : r;
  return lvl > 0 ? lvl : stage === 0 ? 16 : 36;
}
/** 按等级能进化到哪一段 */
function grow(pid, lvl) {
  let cur = pid;
  for (let stage = 0; ; stage++) {
    const ok = (globalThis.BEAST_EVO[cur] || []).filter((to) => lvl >= needLevel(cur, to, stage));
    if (!ok.length) return cur;
    cur = ok[Math.floor(Math.random() * ok.length)];
  }
}
function chapterPass(chapter, index, kind) {
  const pool = beasts.filter((b) => b.zone <= Math.min(7, index + 1));
  const total = pool.reduce((a, b) => a + WEIGHT[b.tier], 0);
  const drawWild = () => {
    let r = Math.random() * total;
    for (const b of pool) {
      r -= WEIGHT[b.tier];
      if (r <= 0) return b;
    }
    return pool[pool.length - 1];
  };
  let wins = 0;
  let n = 0;
  for (const st of chapter.stages) {
    const base = mean(st.enemies.map((e) => e.lvl || 1));
    for (const f of LEVEL_FACTORS) {
      const lvl = Math.max(1, Math.min(100, Math.round(base * f)));
      for (let k = 0; k < TRIALS; k++) {
        const box = [...Array(9)].map((_, i) => {
          const sp = kind === "wild" ? drawWild() : byPid.get(grow(roots[Math.floor(Math.random() * roots.length)].id, lvl));
          return Object.assign(createMonInstance(sp, { idFallback: i + 1 }), { lvl });
        });
        const score = (m) => monPower(m, getBeastDataByDex) * (1 + typeMatchScore(globalThis.BEAST_TYPES[m.dex], st.type).score / 250);
        const team = box
          .sort((a, b) => score(b) - score(a))
          .slice(0, 4)
          .map((m) => ({ name: m.name, types: globalThis.BEAST_TYPES[m.dex], stats: getMonCurrentStats(m, getBeastDataByDex) }));
        n += 1;
        if (simulateBattle(team, st.enemies, st.type, pveFightModifiers(st.id, false)).win) wins += 1;
      }
    }
  }
  return wins / n;
}
reseed(99);
const pveGrown = PVE_CHAPTERS.map((ch, i) => chapterPass(ch, i, "grown"));
reseed(99);
const pveWild = PVE_CHAPTERS.map((ch, i) => chapterPass(ch, i, "wild"));
/** 养成队与刚抓来的野队各占一半 */
const pveMixed = pveGrown.map((v, i) => (v + pveWild[i]) / 2);

const measured = { areaChance, eraHours, eraSuccess, pveGrown, pveMixed };
const r4 = (xs) => xs.map((x) => (x == null ? null : Math.round(x * 10000) / 10000));
if (process.argv.includes("--measure")) {
  for (const [k, v] of Object.entries(measured)) console.log(`  ${k}: [${r4(v).join(", ")}],`);
  process.exit(0);
}

let failed = 0;
const worst = {};
for (const [key, base] of Object.entries(BASELINE)) {
  base.forEach((b, i) => {
    const now = measured[key][i];
    const diff = now == null ? Infinity : now / b - 1;
    if (Math.abs(diff) > Math.abs(worst[key] ?? 0)) worst[key] = diff;
    if (Math.abs(diff) > TOLERANCE) {
      failed += 1;
      console.error(`FAIL: ${key}[${i}] ${b} → ${now?.toFixed?.(4)}（${(diff * 100).toFixed(1)}%，允许 ±${TOLERANCE * 100}%）`);
    }
  });
}
for (const lap of laps) for (const msg of lap.fails) {
  failed += 1;
  console.error("FAIL: sim", msg);
}
if (failed) {
  console.error(`own-balance-selfcheck: ${failed} failed`);
  process.exit(1);
}
console.log(`own-balance-selfcheck: OK（最大偏差 ${Object.entries(worst).map(([k, v]) => `${k} ${(v * 100).toFixed(1)}%`).join("，")}）`);
