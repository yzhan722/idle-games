import {
  BASE_RANGE, BLENDER_SHARE, DISCIPLES, FALLOFF, FAR_LEVEL, FLAMES, FLAME_IDS, HUES, KEEPER_OIL, LAMP_POWER_STEP,
  LAMP_UPKEEP, LEVEL_BONUS, LINE_FALLOFF, MIN_LIGHT, MIX_SHARE, TERRAIN_BOOST,
} from "./data.ts";
import type { DiscipleDef } from "./data.ts";
import { DIST, SLOTS } from "./grid.ts";
import { findPatterns } from "./patterns.ts";
import type { Flame, GameState, Hue, ResourceId, Resources } from "./types.ts";

export type Triple = Record<Flame, number>;

export interface SeatView {
  disciple: string;
  slot: number;
  hue: Hue;
  amount: number;
  factor: number;
  yields: Partial<Resources>;
  notes: string[];
}

export interface Derived {
  /** 每个灯位上三种火的光量，含自身。 */
  field: Triple[];
  /** 每个灯位上来自别的灯的总光量，用来抵挡黑潮。 */
  guard: number[];
  seats: SeatView[];
  income: Resources;
  upkeep: number;
  patterns: Map<string, Set<number>>;
}

export function discipleDef(id: string): DiscipleDef {
  return DISCIPLES.find((d) => d.id === id)!;
}

const MIXES: Record<string, Hue> = {
  "dawn+verdant": "spring",
  "verdant+frost": "jade",
  "dawn+frost": "clear",
  "dawn+verdant+frost": "white",
};

/** 由三种火的光量得到光色和有效光量；各色越均衡，有效光量越高。 */
export function blend(light: Triple, share = MIX_SHARE): { hue: Hue; amount: number } {
  const max = Math.max(light.dawn, light.verdant, light.frost);
  if (max < MIN_LIGHT) return { hue: "dark", amount: 0 };
  const parts = FLAME_IDS.filter((f) => light[f] >= MIN_LIGHT && light[f] >= max * share);
  if (parts.length === 1) return { hue: parts[0], amount: light[parts[0]] };
  const values = parts.map((f) => light[f]);
  const total = values.reduce((a, b) => a + b, 0);
  const balance = Math.min(...values) / Math.max(...values);
  return { hue: MIXES[parts.join("+")], amount: total * (0.6 + 0.4 * balance) };
}

export function lampRange(level: number): number {
  return BASE_RANGE + (level >= FAR_LEVEL ? 1 : 0);
}

export function lampPower(level: number): number {
  return 1 + LAMP_POWER_STEP * (level - 1);
}

export function derive(state: GameState): Derived {
  const patterns = findPatterns(state);
  const on = (id: string, slot: number): boolean =>
    state.inscribed.includes(id) && Boolean(patterns.get(id)?.has(slot));
  const field: Triple[] = SLOTS.map(() => ({ dawn: 0, verdant: 0, frost: 0 }));
  const guard = SLOTS.map(() => 0);
  const seated = state.disciples.filter((d) => d.slot !== null);
  const farSeats = seated.filter((d) => discipleDef(d.id).traits.includes("farsight")).map((d) => d.slot);

  let upkeep = 0;
  state.lamps.forEach((lamp, from) => {
    if (!lamp) return;
    let power = lampPower(lamp.level) * (1 - lamp.soot) * state.fuel;
    if (SLOTS[from].terrain === FLAMES[lamp.flame].terrain) power *= TERRAIN_BOOST;
    if (on("tripod", from)) power *= 1.25;
    const range = lampRange(lamp.level);
    const wide = on("line", from);
    for (const s of SLOTS) {
      if (s.terrace >= state.terraces) continue;
      const d = DIST[from][s.id];
      if (d > range && !(d === range + 1 && farSeats.includes(s.id))) continue;
      const light = power * (wide && d === 2 ? LINE_FALLOFF : FALLOFF[Math.min(d, FALLOFF.length - 1)]);
      field[s.id][lamp.flame] += light;
      if (d > 0) guard[s.id] += light;
    }
    let burn = LAMP_UPKEEP * lamp.level;
    if (on("stairs", from)) burn *= 0.5;
    const thrifty = seated.some(
      (d) => SLOTS[from].neighbors.includes(d.slot!) && discipleDef(d.id).traits.includes("thrifty"),
    );
    upkeep += thrifty ? burn * 0.5 : burn;
  });

  const income: Resources = { oil: KEEPER_OIL, star: 0, insight: 0, wish: 0 };
  const seats: SeatView[] = [];
  for (const d of seated) {
    const def = discipleDef(d.id);
    const slot = d.slot!;
    const { hue, amount } = blend(field[slot], def.traits.includes("blender") ? BLENDER_SHARE : MIX_SHARE);
    const company = SLOTS[slot].neighbors.filter((n) => seated.some((o) => o.slot === n)).length;
    const notes: string[] = [];
    let factor = 1 + LEVEL_BONUS * (d.level - 1);
    const apply = (k: number, note: string): void => {
      factor *= k;
      notes.push(`${note} ×${Number(k.toFixed(2))}`);
    };
    if (def.likes.includes(hue)) apply(1.5, "喜爱此光");
    if (def.dislikes.includes(hue)) apply(0.6, "不喜此光");
    if (def.traits.includes("steady")) apply(1.1, "勤恳");
    if (def.traits.includes("quiet") && company === 0) apply(1.25, "喜静");
    if (def.traits.includes("gregarious") && company > 0) apply(1 + 0.15 * company, "合群");
    if (def.traits.includes("nocturnal") && state.tide.phase === "surge") apply(2, "夜行");
    if (on("facing", slot)) apply(1.3, "对望");
    const yields: Partial<Resources> = {};
    for (const [k, v] of Object.entries(HUES[hue].yields) as [ResourceId, number][]) {
      yields[k] = v * amount * factor;
      income[k] += yields[k]!;
    }
    seats.push({ disciple: d.id, slot, hue, amount, factor, yields, notes });
  }
  return { field, guard, seats, income, upkeep, patterns };
}
