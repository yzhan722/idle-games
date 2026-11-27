import { isEmpty, isOpen, lampCost, lampCount, move } from "./actions.ts";
import { HOLD_LAMPS, HUES } from "./data.ts";
import { exposedLamps } from "./engine.ts";
import { DIST, SLOTS } from "./grid.ts";
import { derive } from "./light.ts";
import type { Derived } from "./light.ts";
import type { Flame, GameState, ResourceId } from "./types.ts";

/** 新手的几步：入座、点灯、换一种火、凑够三盏、补上挡不住的。 */
export type GuideStep = "seat" | "lamp" | "mix" | "third" | "cover";
export interface Guide {
  step: GuideStep;
  /** 建议落在哪个灯位。 */
  slot: number | null;
  /** 建议点哪种火，入座和补漏时没有。 */
  flame: Flame | null;
  /** 正在教的是哪名弟子。 */
  who: string | null;
  /** 补漏时该挪哪盏灯，slot 是挪去的地方；没有就是在 slot 添一盏。 */
  from: number | null;
}

const emptySlots = (s: GameState): number[] => SLOTS.filter((x) => isEmpty(s, x.id)).map((x) => x.id);

/** 空位里光最足的一个；一样亮就选靠里的。 */
export function bestSeat(state: GameState): number | null {
  const { field } = derive(state);
  const light = (id: number): number => field[id].dawn + field[id].verdant + field[id].frost;
  const order = emptySlots(state).sort((a, b) => light(b) - light(a) || SLOTS[b].depth - SLOTS[a].depth || a - b);
  return order[0] ?? null;
}

interface Tried {
  id: number;
  d: Derived;
  /** 这样摆会有哪些灯挡不住。 */
  weak: number[];
}

/** 在每个候选空位里各试点一盏灯。 */
function tryLamp(state: GameState, flame: Flame, slots: number[]): Tried[] {
  return slots.map((id) => {
    const t = structuredClone(state);
    t.lamps[id] = { flame, level: 1, soot: 0 };
    const d = derive(t);
    return { id, d, weak: exposedLamps(t, d) };
  });
}

/** 挑挡不住的最少、最靠里、油最多的。 */
function bestLampSlot(state: GameState, flame: Flame, slots: number[]): number | null {
  const net = (x: Tried): number => x.d.income.oil - x.d.upkeep;
  const tried = tryLamp(state, flame, slots).sort(
    (a, b) => a.weak.length - b.weak.length || SLOTS[b.id].depth - SLOTS[a.id].depth || net(b) - net(a) || a.id - b.id,
  );
  return tried[0]?.id ?? null;
}

/** 能让这名弟子照上混色的灯位里，挑挡不住的最少、光最足的。 */
function mixSlot(state: GameState, flame: Flame, slots: number[], who: string): number | null {
  const seen = (x: Tried): { mixed: boolean; amount: number } => {
    const seat = x.d.seats.find((y) => y.disciple === who)!;
    return { mixed: HUES[seat.hue].mix >= 2, amount: seat.amount };
  };
  const tried = tryLamp(state, flame, slots).filter((x) => seen(x).mixed);
  tried.sort((a, b) => a.weak.length - b.weak.length || seen(b).amount - seen(a).amount || a.id - b.id);
  return tried[0]?.id ?? null;
}

/** 教完了：守住过一夜，也有弟子在光里修行过。之后怎么摆都不再提示。 */
const taught = (state: GameState): boolean => state.nightsHeld > 0 && state.disciples.some((x) => x.level > 1 || x.xp > 0);

/** 眼下该教的一步；没有要教的返回 null。照着做，前三步灯油净收一步不降。 */
export function guide(state: GameState, d: Derived): Guide | null {
  if (taught(state)) return null;
  const tip = (step: GuideStep, slot: number | null, flame: Flame | null = null, who: string | null = null, from: number | null = null): Guide =>
    ({ step, slot, flame, who, from });
  if (!d.seats.length) return tip("seat", bestSeat(state));
  const free = emptySlots(state);
  // 再点一盏要星屑而手里不够：油会攒出来，星屑不会，这时不教添灯。
  const short = (lampCost(state).star ?? 0) > state.res.star;
  const lit = d.seats.find((x) => x.hue !== "dark");
  if (!lit) {
    const beside = SLOTS[d.seats[0].slot].neighbors.filter((n) => free.includes(n));
    return tip("lamp", bestLampSlot(state, "verdant", beside.length ? beside : free), "verdant", d.seats[0].disciple);
  }
  if (state.terraces === 1 && !short && !d.seats.some((x) => HUES[x.hue].mix >= 2)) {
    const flame: Flame = lit.hue === "dawn" ? "verdant" : "dawn";
    const slot = mixSlot(state, flame, free, lit.disciple);
    // 点在哪儿都混不出来（周围占满了）就不拦着，先教后面的。
    if (slot !== null) return tip("mix", slot, flame, lit.disciple);
  }
  if (lampCount(state) < HOLD_LAMPS) return tip("third", bestLampSlot(state, "verdant", free), "verdant");
  const weak = state.nightsHeld === 0 ? exposedLamps(state, d) : [];
  if (!weak.length) return null;
  // 先说旁边添一盏；添了也没用，或者添不起，就说把哪盏挪到哪儿。
  const beside = short ? undefined : weak.map((id) => coverSlot(state, id)).find((x) => x !== null);
  if (beside !== undefined) return tip("cover", beside);
  const shift = shiftWeak(state, weak);
  return tip("cover", shift?.to ?? null, null, null, shift?.from ?? null);
}

/** 把哪盏露着的灯挪到哪儿（有东西就互换），挡不住的会变少，又不把弟子换进黑处；怎么挪都不行时返回 null。 */
export function shiftWeak(state: GameState, weak: number[]): { from: number; to: number } | null {
  const lit = (d: Derived, mix: number): number => d.seats.filter((x) => HUES[x.hue].mix >= mix).length;
  const now = derive(state);
  const found: { from: number; to: number; left: number; keeps: boolean }[] = [];
  for (const from of weak) {
    for (const { id: to } of SLOTS) {
      const trial = isOpen(state, to) ? tryMove(state, from, to) : null;
      if (!trial || trial.exposed.length >= weak.length || lit(trial.d, 1) < lit(now, 1)) continue;
      found.push({ from, to, left: trial.exposed.length, keeps: lit(trial.d, 2) >= lit(now, 2) });
    }
  }
  // 先挑不弄丢混色的，再挑剩得最少的、最靠里的。
  found.sort((a, b) => Number(b.keeps) - Number(a.keeps) || a.left - b.left || SLOTS[b.to].depth - SLOTS[a.to].depth);
  return found[0] ?? null;
}

/** 某盏灯挡不住黑潮时，在旁边哪个空位添一盏就能护住它；添了也不见少（新灯自己又露着）时返回 null，该往里挪。 */
export function coverSlot(state: GameState, id: number): number | null {
  const lamp = state.lamps[id];
  if (!lamp) return null;
  const now = exposedLamps(state, derive(state)).length;
  const near = emptySlots(state).filter((x) => DIST[id][x] <= 2);
  const tried = tryLamp(state, lamp.flame, near).filter((x) => !x.weak.includes(id) && x.weak.length < now);
  tried.sort((a, b) => a.weak.length - b.weak.length || DIST[id][a.id] - DIST[id][b.id] || a.id - b.id);
  return tried[0]?.id ?? null;
}

/** 眼下没有一名弟子在出这样东西（守灯人每秒那点油不算）。 */
export function noSource(d: Derived, k: ResourceId): boolean {
  return !d.seats.some((x) => (x.yields[k] ?? 0) > 0);
}

export interface Trial {
  d: Derived;
  exposed: number[];
}

/** 假如把东西从一处挪到另一处，光色和挡不住的灯会变成怎样；挪不动时返回 null。不改传入的状态。 */
export function tryMove(state: GameState, from: number, to: number): Trial | null {
  const t = structuredClone(state);
  if (!move(t, from, to).ok) return null;
  const d = derive(t);
  return { d, exposed: exposedLamps(t, d) };
}
