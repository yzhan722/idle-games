import { TERRACES } from "../core/data.ts";
import { SLOTS } from "../core/grid.ts";

export interface Layout {
  w: number;
  h: number;
  /** 灯位间距。 */
  unit: number;
  row: number;
  cx: number;
  /** 山景图的左上角与边长（图是正方形）。 */
  art: { x: number; y: number; size: number };
  slots: { x: number; y: number }[];
}

/** 山景图里三层台面的站脚线、灯位间距（都以图的边长为一）。 */
export const FLOOR = [0.82, 0.612, 0.411];
const PITCH = 0.122;
/** 图里最该看见的一段：山尖以下到底层台沿。 */
const VISIBLE = 0.87;
const FOOT = 0.972;

const COLS = TERRACES[0].terrain.length;

export function makeLayout(w: number, h: number): Layout {
  const size = Math.min((w - 12) / ((COLS - 1) * PITCH + 0.09), h / VISIBLE);
  const unit = size * PITCH;
  const x = (w - size) / 2;
  const y = h - size * FOOT;
  const mid = (COLS - 1) / 2;
  return {
    w,
    h,
    unit,
    row: size * (FLOOR[0] - FLOOR[1]),
    cx: w / 2,
    art: { x, y, size },
    slots: SLOTS.map((s) => ({ x: w / 2 + (s.x - mid) * unit, y: y + FLOOR[s.terrace] * size })),
  };
}

/** 点到哪个灯位；没点中返回 null。 */
export function hit(l: Layout, x: number, y: number): number | null {
  let best: number | null = null;
  let dist = Infinity;
  l.slots.forEach((p, id) => {
    const dx = Math.abs(x - p.x);
    const dy = y - (p.y - l.unit * 0.42);
    if (dx > l.unit * 0.5 || Math.abs(dy) > l.row * 0.5) return;
    const d = dx * dx + dy * dy;
    if (d < dist) {
      dist = d;
      best = id;
    }
  });
  return best;
}
