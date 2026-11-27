import { OPPOSITES, SLOTS, slotAt } from "./grid.ts";
import type { Flame, GameState } from "./types.ts";

/** 找出场上所有成形的灯谱，返回每种灯谱涉及的灯位（「对望」记弟子所在位）。 */
export function findPatterns(state: GameState): Map<string, Set<number>> {
  const out = new Map<string, Set<number>>();
  const add = (id: string, ids: number[]): void => {
    const set = out.get(id) ?? new Set<number>();
    ids.forEach((i) => set.add(i));
    out.set(id, set);
  };
  const flame = (id: number): Flame | undefined => state.lamps[id]?.flame;

  for (const s of SLOTS) {
    const f = flame(s.id);
    if (!f) continue;

    const r1 = slotAt(s.terrace, s.index + 1);
    const r2 = slotAt(s.terrace, s.index + 2);
    if (r1 && r2 && flame(r1.id) === f && flame(r2.id) === f) add("line", [s.id, r1.id, r2.id]);

    for (const a of s.neighbors) {
      for (const b of s.neighbors) {
        if (a >= b || !SLOTS[a].neighbors.includes(b)) continue;
        const fa = flame(a);
        const fb = flame(b);
        if (fa && fb && fa !== f && fb !== f && fa !== fb) add("tripod", [s.id, a, b]);
      }
    }

    for (const up of s.neighbors) {
      if (SLOTS[up].terrace !== s.terrace + 1 || flame(up) !== f) continue;
      for (const top of SLOTS[up].neighbors) {
        if (SLOTS[top].terrace === s.terrace + 2 && flame(top) === f) add("stairs", [s.id, up, top]);
      }
    }
  }

  for (const d of state.disciples) {
    if (d.slot === null) continue;
    if (OPPOSITES[d.slot].some(([a, b]) => flame(a) && flame(a) === flame(b))) add("facing", [d.slot]);
  }
  return out;
}
