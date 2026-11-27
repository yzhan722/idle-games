import { TERRACES } from "../core/data.ts";
import { SLOTS } from "../core/grid.ts";
import type { Terrain } from "../core/types.ts";
import { art, cover, stand } from "./art.ts";
import { FLOOR } from "./layout.ts";
import type { Layout } from "./layout.ts";
import type { Palette } from "./palette.ts";

type Ctx = CanvasRenderingContext2D;

/** 地物贴图：高度与位置以灯位间距为一，立在台面靠里的一侧。 */
const FEATURE: Partial<Record<Terrain, { name: string; height: number; dx: number; back: number }>> = {
  pine: { name: "pine", height: 1.15, dx: 0.1, back: 0.2 },
  spring: { name: "spring", height: 1.3, dx: 0, back: 0.2 },
  ridge: { name: "windrock", height: 0.4, dx: 0, back: 0.16 },
};

/** 一层雾的位置、大小、浓淡（位置以山景图边长为一）。 */
const VEIL: [number, number, number, number][] = [
  [-0.2, -0.03, 1, 0.85],
  [0.2, -0.045, 1, 0.85],
  [0, 0, 1.15, 0.9],
  [-0.16, 0.035, 0.85, 0.8],
  [0.18, 0.04, 0.85, 0.8],
];

/** 还没修好的山台锁在雾里。 */
function veil(ctx: Ctx, l: Layout, t: number): void {
  const mist = art("mist");
  if (!mist) return;
  const { size } = l.art;
  const y = l.art.y + FLOOR[t] * size;
  ctx.save();
  for (const [dx, dy, k, a] of VEIL) {
    const w = size * 0.5 * k;
    const h = size * 0.15 * k;
    ctx.globalAlpha = a;
    ctx.drawImage(mist, l.cx + dx * size - w / 2, y + dy * size - h / 2, w, h);
  }
  ctx.restore();
}

/** 宽屏时两侧用山景图的镜像接出去，越往外越沉进夜里。 */
function wings(ctx: Ctx, l: Layout, scene: HTMLImageElement): void {
  const { y, size } = l.art;
  const lap = size * 0.13;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(l.cx, 0);
    ctx.scale(side, 1);
    // 以右侧为准：镜像的左沿压在山景图右沿里面。
    const left = size / 2 - lap;
    ctx.save();
    ctx.translate(left + size, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(scene, 0, y, size, size);
    ctx.restore();
    const g = ctx.createLinearGradient(size / 2 - lap * 0.4, 0, size / 2 + size * 0.16, 0);
    g.addColorStop(0, "rgba(6,28,36,0)");
    g.addColorStop(1, "rgba(6,28,36,0.8)");
    ctx.fillStyle = g;
    ctx.fillRect(left, 0, Math.max(0, l.w / 2 - left) + 2, l.h);
    ctx.restore();
  }
}

/** 画不随时间变化的底图：远景、山景、地物。这里都是白天的颜色，夜色由光照图乘上去。 */
export function paintBackdrop(ctx: Ctx, l: Layout, th: Palette, terraces: number): void {
  ctx.fillStyle = th.sky;
  ctx.fillRect(0, 0, l.w, l.h);
  const scroll = art("scroll");
  if (scroll) cover(ctx, scroll, l.w, l.h, 0.42, 0.2);
  const haze = ctx.createLinearGradient(0, 0, 0, l.h);
  haze.addColorStop(0, th.hazeTop);
  haze.addColorStop(1, th.hazeLow);
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, l.w, l.h);

  const scene = art("scene");
  if (scene) {
    wings(ctx, l, scene);
    ctx.drawImage(scene, l.art.x, l.art.y, l.art.size, l.art.size);
  }

  for (const s of SLOTS) {
    const f = FEATURE[s.terrain];
    const img = f && art(f.name);
    if (!f || !img || s.terrace >= terraces) continue;
    const p = l.slots[s.id];
    stand(ctx, img, p.x + l.unit * f.dx, p.y - l.unit * f.back, l.unit * f.height);
  }
  for (let t = TERRACES.length - 1; t >= terraces; t--) veil(ctx, l, t);
}
