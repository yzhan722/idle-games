import {
  DISCIPLES, LAMP_MAX_LEVEL, PATTERNS, REFUND, RESOURCES, SLICE_REALM, TERRACES, VIGIL_COST, WIPE_AMOUNT,
} from "./data.ts";
import { SLOTS } from "./grid.ts";
import type { ActionResult, Flame, GameEvent, GameState, ResourceId } from "./types.ts";

export type Cost = Partial<Record<ResourceId, number>>;
const OK: ActionResult = { ok: true };
const no = (reason: string): ActionResult => ({ ok: false, reason });

export function lampCount(state: GameState): number {
  return state.lamps.reduce((n, l) => n + (l ? 1 : 0), 0);
}

/** 已有 n 盏灯时，再点一盏的价格。 */
function costAt(n: number): Cost {
  const cost: Cost = { oil: Math.round(8 * 1.32 ** n) };
  if (n >= 5) cost.star = Math.round(2 * 1.3 ** (n - 5));
  return cost;
}

export function lampCost(state: GameState): Cost {
  return costAt(lampCount(state));
}

export function upgradeCost(level: number): Cost {
  return { oil: Math.round(15 * 1.9 ** (level - 1)), star: Math.round(5 * 1.9 ** (level - 1)) };
}

export function shortage(state: GameState, cost: Cost): string | null {
  for (const [k, v] of Object.entries(cost) as [ResourceId, number][]) {
    if (state.res[k] < v) return `${RESOURCES[k].name}不够：${RESOURCES[k].from}`;
  }
  return null;
}

function pay(state: GameState, cost: Cost): void {
  for (const [k, v] of Object.entries(cost) as [ResourceId, number][]) state.res[k] -= v;
}

export function isOpen(state: GameState, slot: number): boolean {
  return Boolean(SLOTS[slot]) && SLOTS[slot].terrace < state.terraces;
}

export function discipleAt(state: GameState, slot: number): string | null {
  return state.disciples.find((d) => d.slot === slot)?.id ?? null;
}

export function isEmpty(state: GameState, slot: number): boolean {
  return isOpen(state, slot) && !state.lamps[slot] && !discipleAt(state, slot);
}

export function placeLamp(state: GameState, slot: number, flame: Flame): ActionResult {
  if (!isEmpty(state, slot)) return no("这里放不下灯");
  const cost = lampCost(state);
  const lack = shortage(state, cost);
  if (lack) return no(lack);
  pay(state, cost);
  state.lamps[slot] = { flame, level: 1, soot: 0 };
  return OK;
}

/** 拆这盏灯能退多少：点灯（按拆后再点的价格算）和历次升灯的花费，油和星屑都退一半。 */
export function removeRefund(state: GameState, slot: number): Cost {
  const lamp = state.lamps[slot];
  if (!lamp) return {};
  const spent: Cost = costAt(lampCount(state) - 1);
  for (let level = 1; level < lamp.level; level++) {
    for (const [k, v] of Object.entries(upgradeCost(level)) as [ResourceId, number][]) spent[k] = (spent[k] ?? 0) + v;
  }
  const back: Cost = {};
  for (const [k, v] of Object.entries(spent) as [ResourceId, number][]) {
    if (Math.floor(v * REFUND) > 0) back[k] = Math.floor(v * REFUND);
  }
  return back;
}

export function removeLamp(state: GameState, slot: number): ActionResult {
  if (!state.lamps[slot]) return no("这里没有灯");
  for (const [k, v] of Object.entries(removeRefund(state, slot)) as [ResourceId, number][]) state.res[k] += v;
  state.lamps[slot] = null;
  return OK;
}

export function upgradeLamp(state: GameState, slot: number): ActionResult {
  const lamp = state.lamps[slot];
  if (!lamp) return no("这里没有灯");
  if (lamp.level >= LAMP_MAX_LEVEL) return no("已经升到头了");
  const cost = upgradeCost(lamp.level);
  const lack = shortage(state, cost);
  if (lack) return no(lack);
  pay(state, cost);
  lamp.level += 1;
  return OK;
}

/** 换火不花钱，鼓励反复试。涨潮时不能换。 */
export function setFlame(state: GameState, slot: number, flame: Flame): ActionResult {
  const lamp = state.lamps[slot];
  if (!lamp) return no("这里没有灯");
  if (state.tide.phase === "surge") return no("涨潮时不能换火");
  lamp.flame = flame;
  return OK;
}

/** 移动灯或弟子；目标上有东西就互换。涨潮时不能动。 */
export function move(state: GameState, from: number, to: number): ActionResult {
  if (from === to) return no("原地没动");
  if (!isOpen(state, from) || !isOpen(state, to)) return no("这层山台还没修好");
  if (state.tide.phase === "surge") return no("涨潮时不能挪动");
  const a = state.disciples.find((d) => d.slot === from);
  const b = state.disciples.find((d) => d.slot === to);
  if (!state.lamps[from] && !a) return no("这里没有东西可挪");
  [state.lamps[from], state.lamps[to]] = [state.lamps[to], state.lamps[from]];
  if (a) a.slot = to;
  if (b) b.slot = from;
  return OK;
}

export function seat(state: GameState, id: string, slot: number | null): ActionResult {
  const who = state.disciples.find((d) => d.id === id);
  if (!who) return no("这名弟子还没上山");
  if (slot !== null && who.slot !== slot && !isEmpty(state, slot)) return no("这里坐不下");
  if (state.tide.phase === "surge") return no("涨潮时不能挪动");
  who.slot = slot;
  return OK;
}

/** 拂去一些烟灰。 */
export function wipe(state: GameState, slot: number): ActionResult {
  const lamp = state.lamps[slot];
  if (!lamp || lamp.soot <= 0) return no("这盏灯很干净");
  lamp.soot = Math.max(0, lamp.soot - WIPE_AMOUNT);
  return OK;
}

function join(state: GameState, id: string, events: GameEvent[]): void {
  if (state.disciples.some((d) => d.id === id)) return;
  state.disciples.push({ id, slot: null, xp: 0, level: 1 });
  events.push({ type: "joined", id });
}

export function openTerrace(state: GameState, events: GameEvent[]): ActionResult {
  const next = TERRACES[state.terraces];
  if (!next) return no("小样里的山台都修好了");
  const lack = shortage(state, next.cost);
  if (lack) return no(lack);
  pay(state, next.cost);
  state.terraces += 1;
  if (state.terraces === 2) join(state, DISCIPLES[1].id, events);
  if (state.terraces === 3) join(state, DISCIPLES[3].id, events);
  return OK;
}

export function inscribe(state: GameState, id: string, events: GameEvent[]): ActionResult {
  const p = PATTERNS.find((x) => x.id === id);
  if (!p) return no("没有这张灯谱");
  if (!state.seen.includes(id)) return no("还没摆出过这个阵形");
  if (state.inscribed.includes(id)) return no("已经记下了");
  const lack = shortage(state, { insight: p.cost });
  if (lack) return no(lack);
  pay(state, { insight: p.cost });
  state.inscribed.push(id);
  join(state, DISCIPLES[2].id, events);
  return OK;
}

/** 约定守下一次黑潮；涨潮开始后不能再约，也不能反悔。 */
export function armVigil(state: GameState, armed: boolean): ActionResult {
  if (state.realm >= SLICE_REALM) return no("小样里的境界都突破了");
  if (state.tide.phase === "surge") return no("黑潮已经来了");
  const lack = armed ? shortage(state, { wish: VIGIL_COST }) : null;
  if (lack) return no(lack);
  state.vigil.armed = armed;
  return OK;
}
