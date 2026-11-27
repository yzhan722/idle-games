import { TERRACES } from "./data.ts";
import type { Slot } from "./types.ts";

function build(): Slot[] {
  const slots: Slot[] = [];
  const at = new Map<string, number>();
  TERRACES.forEach((t, terrace) => {
    t.terrain.forEach((terrain, index) => {
      const id = slots.length;
      at.set(`${terrace}:${index}`, id);
      slots.push({
        id,
        terrace,
        index,
        x: index + terrace * 0.5,
        terrain,
        depth: Math.min(index, t.terrain.length - 1 - index),
        neighbors: [],
      });
    });
  });
  for (const s of slots) {
    // 上一层错半格：前一序号在左上，同序号在右上。
    const around = [
      [s.terrace, s.index - 1],
      [s.terrace, s.index + 1],
      [s.terrace + 1, s.index - 1],
      [s.terrace + 1, s.index],
      [s.terrace - 1, s.index],
      [s.terrace - 1, s.index + 1],
    ];
    for (const [t, i] of around) {
      const id = at.get(`${t}:${i}`);
      if (id !== undefined) s.neighbors.push(id);
    }
  }
  return slots;
}

export const SLOTS: Slot[] = build();

const INDEX = new Map(SLOTS.map((s) => [`${s.terrace}:${s.index}`, s]));
export function slotAt(terrace: number, index: number): Slot | undefined {
  return INDEX.get(`${terrace}:${index}`);
}

/** 方向键走到哪个灯位；走到边上就不动，返回 null。上下层错半格，正对着没有就取左边那个。 */
export function arrowTarget(id: number, key: string): number | null {
  const s = SLOTS[id];
  if (key === "ArrowLeft") return slotAt(s.terrace, s.index - 1)?.id ?? null;
  if (key === "ArrowRight") return slotAt(s.terrace, s.index + 1)?.id ?? null;
  const row = s.terrace + (key === "ArrowUp" ? 1 : -1);
  return (slotAt(row, s.index) ?? slotAt(row, s.index - 1))?.id ?? null;
}

/** 灯位之间隔几步。 */
export const DIST: number[][] = SLOTS.map((from) => {
  const d = SLOTS.map(() => 99);
  d[from.id] = 0;
  const queue = [from.id];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const n of SLOTS[cur].neighbors) {
      if (d[n] > d[cur] + 1) {
        d[n] = d[cur] + 1;
        queue.push(n);
      }
    }
  }
  return d;
});

/** 过中心相对的两个邻位：左右、左上与右下、右上与左下。 */
export const OPPOSITES: [number, number][][] = SLOTS.map((s) => {
  const pairs = [
    [slotAt(s.terrace, s.index - 1), slotAt(s.terrace, s.index + 1)],
    [slotAt(s.terrace + 1, s.index - 1), slotAt(s.terrace - 1, s.index + 1)],
    [slotAt(s.terrace + 1, s.index), slotAt(s.terrace - 1, s.index)],
  ];
  return pairs.filter(([a, b]) => a && b).map(([a, b]) => [a!.id, b!.id] as [number, number]);
});
