import {
  DISCIPLES, DISCIPLE_MAX_LEVEL, DUSTER_RATE, FIRST_STAR, HOLD_LAMPS, HUES, NIGHT_WISH, OFFLINE_CAP, PATTERNS,
  SAVE_VERSION, SLICE_REALM, SOOT_DECAY, SOOT_MAX, STEP, TIDE_BASE, TIDE_CALM, TIDE_CAP, TIDE_DEPTH, TIDE_FIRST,
  TIDE_GENTLE, TIDE_GROWTH, TIDE_SOOT, TIDE_SURGE, VIGIL_COST, VIGIL_HUES, XP_BASE, XP_GROWTH, XP_RATE,
} from "./data.ts";
import { SLOTS } from "./grid.ts";
import { derive, discipleDef } from "./light.ts";
import type { Derived } from "./light.ts";
import type { GameEvent, GameState, Lamp, ResourceId } from "./types.ts";

export function newGame(): GameState {
  return {
    version: SAVE_VERSION,
    time: 0,
    res: { oil: 30, star: 0, insight: 0, wish: 0 },
    lamps: SLOTS.map(() => null),
    disciples: [{ id: DISCIPLES[0].id, slot: null, xp: 0, level: 1 }],
    terraces: 1,
    realm: 0,
    seen: [],
    inscribed: [],
    tide: { phase: "calm", left: TIDE_FIRST, index: 0, sooted: false },
    vigil: { armed: false, holding: false },
    nightsHeld: 0,
    nights: 0,
    fuel: 1,
    savedAt: 0,
  };
}

/** 某次黑潮在某个灯位上的压力；旁边的灯照过来的光不低于它，灯就不会积灰。 */
export function tidePressure(index: number, slot: number): number {
  const base = index === 0 ? TIDE_GENTLE : Math.min(TIDE_CAP, TIDE_BASE + TIDE_GROWTH * index);
  return base * TIDE_DEPTH[Math.min(SLOTS[slot].depth, TIDE_DEPTH.length - 1)];
}

export function xpNeed(level: number): number {
  return XP_BASE * XP_GROWTH ** (level - 1);
}

export interface VigilCheck {
  ok: boolean;
  hues: string[];
  exposed: number[];
  /** 是否有一张记下的灯谱正摆着。 */
  pattern: boolean;
}

/** 守夜条件：至少一张灯谱生效，至少三种混色各照着一名弟子，且没有一盏灯会积灰。 */
export function vigilCheck(state: GameState, d: Derived): VigilCheck {
  const hues = [...new Set(d.seats.filter((s) => HUES[s.hue].mix >= 2).map((s) => s.hue))];
  const exposed = exposedLamps(state, d);
  const pattern = state.inscribed.some((id) => d.patterns.has(id));
  return { ok: pattern && hues.length >= VIGIL_HUES && exposed.length === 0, hues, exposed, pattern };
}

/** 守夜没成是断在哪一条。 */
export function vigilGap(c: VigilCheck): string {
  if (c.exposed.length) return `${c.exposed.length} 盏灯挡不住`;
  if (c.hues.length < VIGIL_HUES) return `混色照人只有 ${c.hues.length} 种`;
  return c.pattern ? "中途断过一次" : "没有灯谱生效";
}

/** 照现在的布置，这次（或下次）黑潮里会积灰的灯位。 */
export function exposedLamps(state: GameState, d: Derived): number[] {
  return SLOTS.filter((s) => state.lamps[s.id] && d.guard[s.id] < tidePressure(state.tide.index, s.id)).map((s) => s.id);
}

export interface StepOptions {
  /** 为 false 时黑潮照常来去，但不让灯积灰（离线时第二次黑潮起）。 */
  soot?: boolean;
}

/** 推进一秒。只改传入的 state。 */
export function step(state: GameState, events: GameEvent[], opts: StepOptions = {}): Derived {
  const d = derive(state);
  const soot = opts.soot ?? true;
  state.time += STEP;

  for (const k of Object.keys(d.income) as ResourceId[]) state.res[k] += d.income[k] * STEP;
  state.res.oil -= d.upkeep * STEP;
  if (state.res.oil < 0) {
    state.res.oil = 0;
    state.fuel = Math.max(0.5, Math.min(1, d.income.oil / Math.max(d.upkeep, 0.001)));
  } else if (state.res.oil > d.upkeep * 5) {
    state.fuel = 1;
  }

  growDisciples(state, d, events);
  settleSoot(state);
  moveTide(state, d, events, soot);

  for (const p of PATTERNS) {
    if (d.patterns.has(p.id) && !state.seen.includes(p.id)) {
      state.seen.push(p.id);
      events.push({ type: "patternSeen", id: p.id });
    }
  }
  return d;
}

function growDisciples(state: GameState, d: Derived, events: GameEvent[]): void {
  for (const seat of d.seats) {
    const who = state.disciples.find((x) => x.id === seat.disciple)!;
    if (who.level >= DISCIPLE_MAX_LEVEL) continue;
    who.xp += seat.amount * XP_RATE * STEP;
    while (who.level < DISCIPLE_MAX_LEVEL && who.xp >= xpNeed(who.level)) {
      who.xp -= xpNeed(who.level);
      who.level += 1;
      events.push({ type: "discipleLevel", id: who.id, level: who.level });
    }
  }
}

function settleSoot(state: GameState): void {
  const dusters = state.disciples.filter((x) => x.slot !== null && discipleDef(x.id).traits.includes("duster"));
  state.lamps.forEach((lamp, id) => {
    if (!lamp || lamp.soot <= 0) return;
    const near = dusters.some((x) => SLOTS[id].neighbors.includes(x.slot!));
    lamp.soot = Math.max(0, lamp.soot - SOOT_DECAY * (near ? DUSTER_RATE : 1) * STEP);
  });
}

function moveTide(state: GameState, d: Derived, events: GameEvent[], sooting: boolean): void {
  const tide = state.tide;
  if (tide.phase === "surge") {
    for (const id of exposedLamps(state, d)) {
      const p = tidePressure(tide.index, id);
      tide.sooted = true;
      if (!sooting) continue;
      const lamp = state.lamps[id]!;
      const gain = (((p - d.guard[id]) / p) * TIDE_SOOT) / TIDE_SURGE;
      lamp.soot = Math.min(SOOT_MAX, lamp.soot + (gain + SOOT_DECAY) * STEP);
    }
    if (state.vigil.armed && !vigilCheck(state, d).ok) state.vigil.holding = false;
  }
  tide.left -= STEP;
  if (tide.left > 0) return;

  if (tide.phase === "calm") {
    tide.phase = "surge";
    tide.left = TIDE_SURGE;
    tide.sooted = false;
    state.vigil.holding = state.vigil.armed;
    events.push({ type: "tideStart", index: tide.index });
    return;
  }

  const lit = state.lamps.filter(Boolean).length;
  const held = !tide.sooted && lit >= HOLD_LAMPS;
  const wish = held ? NIGHT_WISH * (1 + lit * 0.1) : 0;
  const star = state.nights === 0 ? FIRST_STAR : 0;
  const weak = exposedLamps(state, d);
  const breached = state.lamps.filter((l, id) => l && tide.sooted && (weak.includes(id) || l.soot > 0.01)) as Lamp[];
  const soot = Math.max(0, ...breached.map((l) => l.soot));
  state.nights += 1;
  if (held) state.nightsHeld += 1;
  state.res.wish += wish;
  state.res.star += star;
  events.push({ type: "tideEnd", index: tide.index, held, wish, lit, breached: breached.length, soot, star });
  endVigil(state, d, events);
  tide.phase = "calm";
  tide.left = TIDE_CALM;
  tide.index += 1;
}

function endVigil(state: GameState, d: Derived, events: GameEvent[]): void {
  if (!state.vigil.armed) return;
  const { holding } = state.vigil;
  state.vigil = { armed: false, holding: false };
  if (!holding) {
    events.push({ type: "vigilFailed", reason: `守夜没成：${vigilGap(vigilCheck(state, d))}，愿没有扣` });
    return;
  }
  if (state.res.wish < VIGIL_COST) {
    events.push({ type: "vigilFailed", reason: "守住了，但愿不够。" });
    return;
  }
  state.res.wish -= VIGIL_COST;
  state.realm = Math.min(SLICE_REALM, state.realm + 1);
  events.push({ type: "realm", realm: state.realm });
}

export interface OfflineReport {
  seconds: number;
  gained: Record<ResourceId, number>;
  nights: number;
  events: GameEvent[];
}

/** 离线结算：与在线同一套规则，最多 8 小时，只有第一次黑潮会让灯积灰。 */
export function settleOffline(state: GameState, seconds: number): OfflineReport {
  const total = Math.floor(Math.max(0, Math.min(OFFLINE_CAP, seconds)));
  const before = { ...state.res };
  const nights = state.nights;
  const events: GameEvent[] = [];
  let tides = 0;
  for (let i = 0; i < total; i++) {
    const from = events.length;
    step(state, events, { soot: tides < 1 });
    if (events.slice(from).some((e) => e.type === "tideEnd")) tides += 1;
  }
  const gained = {} as Record<ResourceId, number>;
  for (const k of Object.keys(before) as ResourceId[]) gained[k] = state.res[k] - before[k];
  return { seconds: total, gained, nights: state.nights - nights, events };
}
