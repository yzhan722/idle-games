// 无界面模拟：让三种水平的玩家各玩一遍小样，输出关键节点时间；卡死或明显过快过慢就报错退出。
// 另有两种新手：「照提示」只做界面写着的事，必须守住第一夜、修到第三层；「乱摆」随机点灯、不挪不换，是对照，多半该守不住也修不到。
// 两种都不许卡在五盏灯（第六盏起要星屑）。
// 用法：node scripts/simulate.ts [--trace]
import {
  armVigil, inscribe, isEmpty, isOpen, lampCost, lampCount, move, openTerrace, placeLamp, seat, setFlame, shortage, upgradeCost,
  upgradeLamp, wipe,
} from "../src/core/actions.ts";
import { FLAME_IDS, LAMP_MAX_LEVEL, PATTERNS, RESOURCES, TERRACES, VIGIL_COST } from "../src/core/data.ts";
import { exposedLamps, newGame, step, vigilCheck } from "../src/core/engine.ts";
import { SLOTS } from "../src/core/grid.ts";
import { bestSeat, coverSlot, guide, noSource, tryMove } from "../src/core/guide.ts";
import { derive } from "../src/core/light.ts";
import type { Flame, GameEvent, GameState, ResourceId } from "../src/core/types.ts";

const TRACE = process.argv.includes("--trace");
const LIMIT = 3 * 3600;

/** 简单的线性同余随机，保证每次模拟结果一致。 */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

interface Profile {
  name: string;
  /** 每隔多少秒看一眼游戏。 */
  every: number;
  /** 每次最多做几个动作。 */
  moves: number;
  /** 每次重排时试多少种摆法。 */
  tries: number;
  /** 平均用时该在多少分钟之间。守夜只能落在 11:00、14:20、17:40 这些点上，中位会整格跳，所以看平均。 */
  min: number;
  max: number;
}
const PROFILES: Profile[] = [
  { name: "熟练", every: 5, moves: 3, tries: 60, min: 12, max: 16 },
  { name: "普通", every: 15, moves: 2, tries: 24, min: 13, max: 20 },
  { name: "偶尔看看", every: 90, moves: 3, tries: 24, min: 16, max: 30 },
];

/** 现在最缺什么：够用的资源权重降下来，缺的升上去。 */
function weights(s: GameState): Record<ResourceId, number> {
  const need: Record<ResourceId, number> = { oil: 40, star: 10, insight: 0, wish: 0 };
  const want = (c: Partial<Record<ResourceId, number>>): void => {
    for (const [k, v] of Object.entries(c) as [ResourceId, number][]) need[k] = Math.max(need[k], v);
  };
  want(lampCost(s));
  for (const l of s.lamps) if (l && l.level < LAMP_MAX_LEVEL) want(upgradeCost(Math.min(l.level, 3)));
  const next = TERRACES[s.terraces];
  if (next) want(next.cost);
  else need.wish = VIGIL_COST;
  const p = PATTERNS.find((x) => !s.inscribed.includes(x.id));
  if (p) want({ insight: p.cost });
  const base: Record<ResourceId, number> = { oil: 1, star: 2.5, insight: 3, wish: next ? 4 : 70 };
  for (const k of Object.keys(base) as ResourceId[]) {
    const r = s.res[k] / Math.max(need[k], 0.01);
    base[k] *= r < 0.3 ? 1.8 : r < 1 ? 1.2 : r < 2 ? 0.5 : 0.15;
  }
  return base;
}

function score(s: GameState, vigil: boolean): number {
  const d = derive(s);
  if (vigil) {
    const c = vigilCheck(s, d);
    return (c.pattern ? 20 : 0) + c.hues.length * 10 - c.exposed.length * 4 + Math.tanh((d.income.oil - d.upkeep) / 10);
  }
  const w = weights(s);
  let v = 0;
  for (const k of Object.keys(w) as ResourceId[]) v += d.income[k] * w[k];
  v -= d.upkeep * (s.res.oil < 20 ? 3 : 1);
  return v - exposedLamps(s, d).length * 0.15;
}

const clone = (s: GameState): GameState => structuredClone(s);

function rearrange(s: GameState, tries: number, rand: () => number, vigil: boolean): GameState {
  let best = s;
  let top = score(s, vigil);
  let cur = s;
  let here = top;
  const open = SLOTS.filter((x) => isOpen(s, x.id)).map((x) => x.id);
  for (let i = 0; i < tries; i++) {
    // 允许偶尔走一步差的，免得卡在局部最优；真人也会推倒重摆。
    const heat = (1 - i / tries) * (vigil ? 6 : 0.4);
    const t = clone(cur);
    const n = 1 + Math.floor(rand() * 2);
    for (let j = 0; j < n; j++) {
      const a = open[Math.floor(rand() * open.length)];
      const b = open[Math.floor(rand() * open.length)];
      if (rand() < 0.35) setFlame(t, a, FLAME_IDS[Math.floor(rand() * 3)]);
      else move(t, a, b);
    }
    const v = score(t, vigil);
    if (v >= here || rand() < Math.exp((v - here) / Math.max(heat, 1e-3))) {
      cur = t;
      here = v;
    }
    if (v > top + 1e-6) {
      best = t;
      top = v;
    }
  }
  return best;
}

function act(s: GameState, p: Profile, rand: () => number, events: GameEvent[]): GameState {
  if (s.tide.phase === "surge") return s;
  for (const d of s.disciples) {
    if (d.slot !== null) continue;
    const free = SLOTS.filter((x) => isEmpty(s, x.id));
    if (free.length) seat(s, d.id, free[Math.floor(rand() * free.length)].id);
  }
  openTerrace(s, events);
  for (const x of PATTERNS) inscribe(s, x.id, events);
  s.lamps.forEach((l, id) => l && l.soot > 0.1 && wipe(s, id));

  const ready = s.terraces >= 3 && s.res.wish >= VIGIL_COST;
  let cur = rearrange(s, p.tries * (ready ? 4 : 1), rand, ready);
  if (ready && vigilCheck(cur, derive(cur)).ok) {
    armVigil(cur, true);
    return cur;
  }

  for (let i = 0; i < p.moves; i++) {
    const base = score(cur, false);
    // 先把修台的油攒出来：只差油时不乱花。
    const next = TERRACES[cur.terraces];
    const saving = next && cur.res.oil > (next.cost.oil ?? 0) * 0.55 && cur.lamps.filter(Boolean).length >= 4;
    let pick: { gain: number; run: (g: GameState) => void } | null = null;
    const consider = (gain: number, run: (g: GameState) => void): void => {
      if (gain > 0.02 && (!pick || gain > pick.gain)) pick = { gain, run };
    };
    if (!saving && !shortage(cur, lampCost(cur))) {
      const cost = lampCost(cur);
      for (const x of SLOTS) {
        if (!isEmpty(cur, x.id)) continue;
        for (const f of FLAME_IDS as Flame[]) {
          const t = clone(cur);
          placeLamp(t, x.id, f);
          consider(((score(t, false) - base) / ((cost.oil ?? 0) + 4 * (cost.star ?? 0))) * 20, (g) => placeLamp(g, x.id, f));
        }
      }
    }
    if (!saving) {
      cur.lamps.forEach((l, id) => {
        if (!l || l.level >= LAMP_MAX_LEVEL || shortage(cur, upgradeCost(l.level))) return;
        const cost = upgradeCost(l.level);
        const t = clone(cur);
        upgradeLamp(t, id);
        consider(((score(t, false) - base) / ((cost.oil ?? 0) + 4 * (cost.star ?? 0))) * 20, (g) => upgradeLamp(g, id));
      });
    }
    if (!pick) break;
    (pick as { run: (g: GameState) => void }).run(cur);
  }
  return cur;
}

const mmss = (t: number): string => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

interface Run {
  done: boolean;
  time: number;
  idle: number;
  line: string;
}

function play(p: Profile, seed: number): Run {
  const marks: string[] = [];
  const rand = rng(seed);
  let s = newGame();
  const events: GameEvent[] = [];
  let idle = 0;
  let lastGain = 0;
  while (s.realm === 0 && s.time < LIMIT) {
    const { terraces } = s;
    const inscribed = s.inscribed.length;
    if (s.time % p.every === 0) s = act(s, p, rand, events);
    if (s.terraces !== terraces) marks.push(`第 ${s.terraces} 层 ${mmss(s.time)}`);
    if (s.inscribed.length !== inscribed) marks.push(`灯谱 ${s.inscribed.length} ${mmss(s.time)}`);
    const n = events.length;
    const d = step(s, events);
    for (const e of events.slice(n)) {
      if (e.type === "vigilFailed") marks.push(`守夜失败 ${mmss(s.time)}`);
    }
    if (d.seats.length) lastGain = s.time;
    idle = Math.max(idle, s.time - lastGain);
    if (TRACE && s.time % 120 === 0) {
      const r = s.res;
      console.log(
        `  ${mmss(s.time)} 灯${s.lamps.filter(Boolean).length} 油${r.oil.toFixed(0)}(${(d.income.oil - d.upkeep).toFixed(2)}) 星${r.star.toFixed(0)}(${d.income.star.toFixed(2)}) 悟${r.insight.toFixed(0)}(${d.income.insight.toFixed(2)}) 愿${r.wish.toFixed(1)}(${d.income.wish.toFixed(3)}) 层${s.terraces} 谱${s.inscribed.length}`,
      );
    }
  }
  const done = s.realm > 0;
  const line = `${done ? mmss(s.time) : "没走完"}，守住 ${s.nightsHeld}/${s.nights} 夜，灯 ${s.lamps.filter(Boolean).length}：${marks.join("，")}`;
  return { done, time: s.time, idle, line };
}

const SEEDS = [1, 7, 42, 99, 2026, 20261125, 314, 2718, 55, 11, 12, 13, 1001, 1002, 1003, 5, 88, 404, 777, 1618, 31415];
let failed = false;
for (const p of PROFILES) {
  const runs = SEEDS.map((seed) => play(p, seed)).sort((a, b) => a.time - b.time);
  const median = runs[Math.floor(runs.length / 2)].time / 60;
  const mean = runs.reduce((n, r) => n + r.time, 0) / runs.length / 60;
  const stuck = runs.filter((r) => !r.done).length;
  const ok = stuck === 0 && mean >= p.min && mean <= p.max;
  if (!ok) failed = true;
  console.log(
    `${ok ? "OK  " : "FAIL"} ${p.name}：${SEEDS.length} 局到「明窍」平均 ${mean.toFixed(1)} 分钟（期望 ${p.min}～${p.max}），中位 ${median.toFixed(1)}，最快 ${mmss(runs[0].time)}，最慢 ${mmss(runs.at(-1)!.time)}，卡死 ${stuck} 局，最长空转 ${Math.max(...runs.map((r) => r.idle))} 秒`,
  );
  console.log(`     中位局 ${runs[Math.floor(runs.length / 2)].line}`);
  if (stuck || runs.at(-1)!.time / 60 > p.max) console.log(`     最慢局 ${runs.at(-1)!.line}`);
}

const NOVICE_LIMIT = 45 * 60;
type Rand = () => number;
const any = <T>(list: T[], rand: Rand): T => list[Math.floor(rand() * list.length)];

/** 照提示玩：跟着新手提示走，再做卡片上写着的事；火随便挑，不算账、不推倒重摆。 */
function followHints(s: GameState, rand: Rand, events: GameEvent[]): void {
  const g = guide(s, derive(s));
  if (g?.step === "seat") {
    const who = s.disciples.find((x) => x.slot === null);
    if (who) seat(s, who.id, g.slot);
    return;
  }
  if (g?.step === "cover" && g.slot !== null) {
    if (g.from !== null) move(s, g.from, g.slot);
    else placeLamp(s, g.slot, any(FLAME_IDS, rand));
    return;
  }
  if (g && g.slot !== null) {
    const now = derive(s).seats.find((x) => x.disciple === g.who)?.hue;
    const flames = FLAME_IDS.filter((f) => g.step !== "mix" || f !== now);
    placeLamp(s, g.slot, g.step === "lamp" ? g.flame! : any(flames, rand));
    return;
  }
  for (const x of s.disciples) if (x.slot === null) seat(s, x.id, bestSeat(s));
  openTerrace(s, events);
  for (const x of PATTERNS) inscribe(s, x.id, events);
  s.lamps.forEach((l, id) => l && l.soot > 0.1 && wipe(s, id));
  // 红圈的灯：旁边添一盏，添不了就往里挪。
  const weak = exposedLamps(s, derive(s));
  for (const id of weak) {
    const beside = coverSlot(s, id);
    if (beside !== null) {
      if (placeLamp(s, beside, s.lamps[id]!.flame).ok) return;
      continue;
    }
    const inner = SLOTS.filter((x) => isEmpty(s, x.id) && (tryMove(s, id, x.id)?.exposed.length ?? 99) < weak.length);
    if (inner.length) {
      move(s, id, inner.sort((a, b) => b.depth - a.depth)[0].id);
      return;
    }
  }
  // 卡片上「霜火 → 星屑」那种：缺着又没人在出，就换一盏灯的火。
  const goal = TERRACES[s.terraces]?.cost ?? { wish: VIGIL_COST };
  const d = derive(s);
  for (const [k, v] of Object.entries(goal) as [ResourceId, number][]) {
    if (s.res[k] >= v || !noSource(d, k)) continue;
    for (const f of RESOURCES[k].flames) {
      const works = s.lamps.flatMap((l, id) => {
        if (!l || l.flame === f) return [];
        const t = clone(s);
        setFlame(t, id, f);
        return noSource(derive(t), k) ? [] : [id];
      });
      if (works.length) {
        setFlame(s, any(works, rand), f);
        return;
      }
    }
  }
  // 油宽裕就挨着已有的灯再点一盏。
  if (s.res.oil > (TERRACES[s.terraces]?.cost.oil ?? 0) * 0.5) {
    const free = SLOTS.filter((x) => isEmpty(s, x.id) && x.neighbors.some((n) => s.lamps[n]));
    if (free.length) placeLamp(s, any(free, rand).id, any(FLAME_IDS, rand));
  }
}

/** 乱摆：随机位置点随机的火，弟子随便坐，从不挪动、换火、升灯。 */
function scatter(s: GameState, rand: Rand, events: GameEvent[]): void {
  const free = (): number[] => SLOTS.filter((x) => isEmpty(s, x.id)).map((x) => x.id);
  for (const x of s.disciples) if (x.slot === null && free().length) seat(s, x.id, any(free(), rand));
  openTerrace(s, events);
  for (const x of PATTERNS) inscribe(s, x.id, events);
  if (free().length) placeLamp(s, any(free(), rand), any(FLAME_IDS, rand));
}

interface Novice {
  firstNight: boolean;
  third: number;
  lamps: number;
}
function novice(act: typeof scatter, seed: number): Novice {
  const rand = rng(seed);
  for (let i = 0; i < 5; i++) rand();
  const s = newGame();
  const events: GameEvent[] = [];
  const out: Novice = { firstNight: false, third: Infinity, lamps: 0 };
  while (s.time < NOVICE_LIMIT) {
    if (s.time % 15 === 0 && s.tide.phase === "calm") act(s, rand, events);
    step(s, events);
    out.lamps = Math.max(out.lamps, lampCount(s));
    if (s.terraces >= 3) out.third = Math.min(out.third, s.time);
  }
  const first = events.find((e) => e.type === "tideEnd");
  out.firstNight = first?.type === "tideEnd" && first.held;
  return out;
}

for (const [name, act, guided] of [["照提示", followHints, true], ["乱摆", scatter, false]] as const) {
  const runs = SEEDS.map((seed) => novice(act, seed));
  const held = runs.filter((r) => r.firstNight).length;
  const starved = runs.filter((r) => r.lamps < 6).length;
  const third = runs.map((r) => r.third).sort((a, b) => a - b);
  const reached = third.filter((t) => t < NOVICE_LIMIT).length;
  // 照提示要全成；乱摆要是也多半能成，说明摆法不要紧了。
  const fits = (n: number): boolean => (guided ? n === runs.length : n <= runs.length / 2);
  const ok = starved === 0 && fits(held) && fits(reached);
  if (!ok) failed = true;
  console.log(
    `${ok ? "OK  " : "FAIL"} ${name}：${runs.length} 局守住第一夜 ${held} 局，${NOVICE_LIMIT / 60} 分钟内修到第 3 层 ${reached} 局${reached ? `（${mmss(third[0])}～${mmss(third[reached - 1])}）` : ""}，卡在五盏灯 ${starved} 局`,
  );
}
process.exit(failed ? 1 : 0);
