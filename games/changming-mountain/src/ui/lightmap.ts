import { lampPower } from "../core/light.ts";
import type { GameState } from "../core/types.ts";
import type { Layout } from "./layout.ts";
import type { Palette } from "./palette.ts";

const SCALE = 0.5;
/** 光从灯心向外的衰减。 */
const FALLOFF: [number, number][] = [[0, 1], [0.18, 0.78], [0.4, 0.42], [0.65, 0.16], [1, 0]];

type Rgb = [number, number, number];

const shade = ([r, g, b]: Rgb, k: number): string => `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`;

/** 光照图：底色是夜，灯一盏盏加上去，最后整张乘到画面上。 */
export class LightMap {
  private map = document.createElement("canvas");

  paint(ctx: CanvasRenderingContext2D, l: Layout, th: Palette, s: GameState, flicker: (id: number) => number, gloom: number): void {
    const w = Math.ceil(l.w * SCALE);
    const h = Math.ceil(l.h * SCALE);
    if (this.map.width !== w || this.map.height !== h) {
      this.map.width = w;
      this.map.height = h;
    }
    const c = this.map.getContext("2d")!;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = "source-over";
    const k = 1 - gloom * 0.35;
    const night = c.createLinearGradient(0, 0, 0, h);
    night.addColorStop(0, shade(th.nightTop, k));
    night.addColorStop(1, shade(th.nightLow, k));
    c.fillStyle = night;
    c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = "lighter";
    c.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    s.lamps.forEach((lamp, id) => {
      if (!lamp) return;
      const p = l.slots[id];
      const power = lampPower(lamp.level) * (1 - lamp.soot) * s.fuel * flicker(id);
      const y = p.y - l.unit * 0.66;
      const r = l.unit * (1.35 + 0.5 * power);
      const [red, green, blue] = th.light[lamp.flame];
      const a = Math.min(0.95, 0.5 + 0.22 * power);
      const g = c.createRadialGradient(p.x, y, 0, p.x, y, r);
      for (const [at, v] of FALLOFF) g.addColorStop(at, `rgba(${red},${green},${blue},${a * v})`);
      c.fillStyle = g;
      c.fillRect(p.x - r, y - r, r * 2, r * 2);
    });
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(this.map, 0, 0, l.w, l.h);
    ctx.restore();
  }
}
