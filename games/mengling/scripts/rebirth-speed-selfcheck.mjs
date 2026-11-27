#!/usr/bin/env node
// ML-G2：二周目明显快于一周目（PRD §4.3「二周目速度显著快于一周目（可测断言）」）。
// 同一套玩家策略、同一随机种子、固定日期，先跑一周目到第 5 纪元，再转生跑二周目到第 5 纪元，比用时。
// 用法：node scripts/rebirth-speed-selfcheck.mjs [--verbose]
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
// 模块里的随机数（性格、特性、资质）也走种子，结果可复现
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

const { createPlayerSim } = await import("./_player_sim_core.mjs");
const { ERA_DEFS, getEraDefByIndex } = await import("../modules/defs_eras.js");
const { confirmPrestige, instantiateQuests, bumpEraCounter, syncEraQuests } = await import("../modules/systems/era.js");
const { buyPerk, canBuyPerk, perkCost, perkLevel, rebirthHeadstart, legacyProdMul, legacyCatchAdd, REBIRTH_HEADSTART, LEGACY_PERKS } = await import("../modules/systems/rebirth.js");

const verbose = process.argv.includes("--verbose");
const SEEDS = (process.env.SIM_SEEDS || "1,7,23").split(",").map(Number);
const DT = Number(process.env.SIM_DT) || 10;
const TARGET_ERA = 4; // 第 5 纪元（下标从 0 起）
const MIN_FASTER = 0.25; // 二周目至少快 25%
const MAX_HOURS = 60;

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  }
}

/** 缺图鉴就去缺得最多的区，否则去最好抓的区（两周目同一规则） */
function makePickArea() {
  const ease = new Map();
  const expected = (area, api) => {
    if (!ease.has(area.id)) {
      const W = { common: 80, uncommon: 15, rare: 4, epic: 1 };
      let w = 0;
      let c = 0;
      for (const p of api.defs.beasts.filter(area.pool)) {
        const k = W[p.tier] ?? 1;
        w += k;
        c += k * api.baseCatchChanceByDex(p.dex);
      }
      ease.set(area.id, w > 0 ? c / w : 0);
    }
    return ease.get(area.id);
  };
  return (unlocked, api) => {
    const quests = api.state.era?.quests || [];
    const needDex = quests.some((q) => !q.done && (q.type === "dex_unique" || q.type === "or"));
    let best = unlocked[0];
    let bestScore = -1;
    for (const area of unlocked) {
      const score = needDex
        ? api.defs.beasts.filter((p) => area.pool(p) && !(api.state.dex?.caught?.[p.id] > 0)).length
        : expected(area, api);
      if (score > bestScore) {
        best = area;
        bestScore = score;
      }
    }
    return best.id;
  };
}

function runLap(opts) {
  const sim = createPlayerSim({ dt: DT, pickArea: makePickArea(), ...opts });
  const times = [];
  for (let i = 1; i <= TARGET_ERA; i++) {
    const h = sim.runUntilEra(i, MAX_HOURS);
    times.push(h);
    if (h == null) break;
  }
  return { sim, times };
}

/** 把一周目终点补成「悖梦主线全清 + 1 闪光」，按真实入口转生；灵珀按固定顺序花掉 */
function prestigeFrom(state, { spend = true } = {}) {
  const last = ERA_DEFS.length - 1;
  state.dex.caught = Object.fromEntries((globalThis.BEAST_ROSTER || []).slice(0, 150).map((d) => [`p${String(d).padStart(3, "0")}`, 1]));
  state.shinyCount = Math.max(1, Math.floor(state.shinyCount || 0));
  state.tech = { ...state.tech };
  for (let i = 0; i < 16; i++) state.tech[`__sim${i}`] = true;
  Object.assign(state.era, { index: last, id: getEraDefByIndex(last).id, quests: instantiateQuests(getEraDefByIndex(last), state.era.prestigeCount || 0) });
  for (const k of ["catch_count", "pokeball_earned", "gather_total", "berry_earned"]) bumpEraCounter(state, k, 99999);
  syncEraQuests(state);
  const r = confirmPrestige(state, { addLog: () => {} });
  if (!r.ok) throw new Error(`prestige refused: ${r.reason}`);
  for (let i = 0; i < 16; i++) delete state.tech[`__sim${i}`];
  const bought = [];
  while (spend) {
    const id = ["prod", "catch", "cap"].filter((x) => canBuyPerk(state, x)).sort((a, b) => perkCost(a, perkLevel(state, a)) - perkCost(b, perkLevel(state, b)))[0];
    if (!id || !buyPerk(state, id).ok) break;
    bought.push(id);
  }
  return { essence: r.preview.essence, bought };
}

const reseed = (seed) => {
  seedState = (seed * 2654435761) >>> 0 || 1;
};
const fasterThan = (a, b) => (a != null && b != null && a > 0 ? 1 - b / a : 0);
const eraTime = (lap) => lap.times[TARGET_ERA - 1] ?? null;
const simFails = (lap) => lap.sim.findings.filter((f) => f.sev === "FAIL").map((f) => f.msg);
const fmt = (a) => a.map((x) => (x == null ? "—" : x.toFixed(2))).join(" / ");

// 1) 三个种子：一周目 → 转生（灵珀花在产出 / 捕获 / 仓廪）→ 二周目
const rows = [];
for (const seed of SEEDS) {
  reseed(seed);
  const lap1 = runLap({ seed });
  const t1 = eraTime(lap1);
  assert(t1 != null, `seed ${seed}: lap 1 reaches era ${TARGET_ERA + 1}`);
  const dawn1 = instantiateQuests(ERA_DEFS[0], 0).find((q) => q.type === "catch_count").target;

  const st = lap1.sim.state;
  const { essence, bought } = prestigeFrom(st);
  const dawn2 = st.era.quests.find((q) => q.type === "catch_count").target;
  assert(st.era.prestigeCount === 1 && st.era.index === 0, `seed ${seed}: lap 2 starts at dawn`);
  assert(dawn2 === Math.ceil(dawn1 * 1.5), `seed ${seed}: lap 2 quests are ×1.5 (${dawn1} → ${dawn2})`);

  reseed(seed);
  const lap2 = runLap({ seed, state: st });
  const t2 = eraTime(lap2);
  const faster = fasterThan(t1, t2);
  rows.push({ seed, faster });
  assert(t2 != null && faster >= MIN_FASTER, `seed ${seed}: lap 2 at least ${MIN_FASTER * 100}% faster (${fmt([t1])}h → ${fmt([t2])}h, ${(faster * 100).toFixed(1)}%)`);
  lap1.times.forEach((h, i) => assert(lap2.times[i] != null && lap2.times[i] <= h, `seed ${seed}: era ${i + 2} not slower in lap 2 (${fmt([h])} → ${fmt([lap2.times[i]])})`));
  assert(simFails(lap1).length + simFails(lap2).length === 0, `seed ${seed}: no sim failures (${[...simFails(lap1), ...simFails(lap2)].join("; ")})`);
  if (verbose) {
    console.log(`seed ${seed}  灵珀 ${essence}（买 ${bought.length} 级）\n  一周目到第 2～5 纪元（h）：${fmt(lap1.times)}\n  二周目到第 2～5 纪元（h）：${fmt(lap2.times)}\n  快 ${(faster * 100).toFixed(1)}%`);
  }

  // 2) 只对第一个种子：一点灵珀不花，也要快得出来；再连转两次，确认 ×1.5 叠加后不崩
  if (seed === SEEDS[0]) {
    reseed(seed);
    const plain1 = runLap({ seed });
    prestigeFrom(plain1.sim.state, { spend: false });
    reseed(seed);
    const plain2 = runLap({ seed, state: plain1.sim.state });
    const plain = fasterThan(eraTime(plain1), eraTime(plain2));
    if (verbose) console.log(`seed ${seed}  不花灵珀：二周目到第 2～5 纪元（h）：${fmt(plain2.times)}，快 ${(plain * 100).toFixed(1)}%`);
    assert(plain >= MIN_FASTER, `seed ${seed}: lap 2 without spending essence still ${MIN_FASTER * 100}% faster (${(plain * 100).toFixed(1)}%)`);

    let state = lap2.sim.state;
    for (const n of [2, 3]) {
      prestigeFrom(state);
      assert(state.era.prestigeCount === n, `lap ${n + 1}: prestigeCount`);
      reseed(seed);
      const lap = runLap({ seed, state });
      if (verbose) console.log(`seed ${seed}  第 ${n + 1} 周目到第 2～5 纪元（h）：${fmt(lap.times)}`);
      assert(eraTime(lap) != null, `lap ${n + 1}: still reaches era ${TARGET_ERA + 1} within ${MAX_HOURS}h`);
      assert(eraTime(lap) <= t1 * 1.5, `lap ${n + 1}: at most 1.5× lap 1 (${fmt([eraTime(lap)])}h vs ${fmt([t1])}h)`);
      assert(simFails(lap).length === 0, `lap ${n + 1}: no sim failures`);
      state = lap.sim.state;
    }
  }
}

// 3) 很多周目以后：目标、加成都是有限正数，加成封顶
for (const n of [1, 5, 10, 20, 50]) {
  const s = { era: { prestigeCount: n }, meta: { legacy: { perks: {} } } };
  const hs = rebirthHeadstart(s);
  assert(hs.prodMul > 1 && hs.prodMul <= 1 + REBIRTH_HEADSTART.prodMax && hs.catchAdd > 0 && hs.catchAdd <= REBIRTH_HEADSTART.catchMax, `headstart capped at n=${n}`);
  for (const def of ERA_DEFS) {
    for (const q of instantiateQuests(def, n)) assert(Number.isSafeInteger(q.target) && q.target > 0, `quest ${q.id} target finite at n=${n} (${q.target})`);
  }
}
assert(rebirthHeadstart({ era: { prestigeCount: 0 } }).prodMul === 1 && rebirthHeadstart({}).catchAdd === 0, "no headstart on lap 1");
{
  const full = { era: { prestigeCount: 50 }, meta: { legacy: { perks: Object.fromEntries(Object.keys(LEGACY_PERKS).map((k) => [k, LEGACY_PERKS[k].max])) } } };
  assert(legacyProdMul(full) <= 5 && legacyCatchAdd(full) <= 1, `maxed legacy stays bounded (prod ×${legacyProdMul(full)}, catch +${legacyCatchAdd(full)})`);
}

if (failed) {
  console.error(`rebirth-speed-selfcheck: ${failed} failed`);
  process.exit(1);
}
console.log(`rebirth-speed-selfcheck: OK（二周目到第 ${TARGET_ERA + 1} 纪元快 ${rows.map((r) => `${(r.faster * 100).toFixed(0)}%`).join(" / ")}）`);
