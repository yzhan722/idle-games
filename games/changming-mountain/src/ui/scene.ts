import { TIDE_CALM, TIDE_SURGE } from "../core/data.ts";
import { SLOTS } from "../core/grid.ts";
import type { Trial } from "../core/guide.ts";
import { lampPower } from "../core/light.ts";
import type { Derived } from "../core/light.ts";
import type { Flame, GameState } from "../core/types.ts";
import { art, artCount, sooty, stand } from "./art.ts";
import { paintBackdrop } from "./backdrop.ts";
import type { Layout } from "./layout.ts";
import { LightMap } from "./lightmap.ts";
import { HUE_COLOR } from "./palette.ts";
import type { Palette } from "./palette.ts";

type Ctx = CanvasRenderingContext2D;

export interface SceneView {
  selected: number | null;
  hover: number | null;
  drag: { from: number; x: number; y: number; over: number | null } | null;
  /** 正在考虑放的灯，用来预览光的范围。 */
  preview: { slot: number; flame: Flame } | null;
  /** 拖着的东西放到眼前这处，会变成什么样。 */
  trial: Trial | null;
  /** 新手提示指着的灯位，多半空着；教互换时上面有东西。 */
  guide: number | null;
  exposed: number[];
}

/** 三档灯的贴图高度，和灯火中心离脚点的高度（都以灯位间距为一）。 */
const LAMP_HEIGHT = [0.96, 1.2, 1.32];
const FIRE = [0.6, 0.87, 0.96];
const DISCIPLE_HEIGHT = 0.8;

const tier = (level: number): number => (level >= 5 ? 2 : level >= 3 ? 1 : 0);

function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

function glow(ctx: Ctx, x: number, y: number, r: number, hex: string, a: number): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(hex, a));
  g.addColorStop(0.3, rgba(hex, a * 0.45));
  g.addColorStop(1, rgba(hex, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

export class Scene {
  private back = document.createElement("canvas");
  private backKey = "";
  private lights = new LightMap();
  private still = matchMedia("(prefers-reduced-motion: reduce)");

  draw(ctx: Ctx, l: Layout, th: Palette, s: GameState, d: Derived, v: SceneView, now: number, dpr: number): void {
    const t = this.still.matches ? 0 : now / 1000;
    const key = `${l.w}x${l.h}@${dpr}:${s.terraces}:${artCount()}`;
    if (key !== this.backKey) {
      this.backKey = key;
      this.back.width = l.w * dpr;
      this.back.height = l.h * dpr;
      const b = this.back.getContext("2d")!;
      b.setTransform(dpr, 0, 0, dpr, 0, 0);
      paintBackdrop(b, l, th, s.terraces);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.back, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const near = this.tideNear(s);
    this.paintDisciples(ctx, l, d, v, t);
    this.lights.paint(ctx, l, th, s, (id) => this.flicker(t, id), near);
    this.paintAura(ctx, l, v.trial?.d ?? d, v);
    this.paintMarks(ctx, l, th, s, v, t);
    this.paintLamps(ctx, l, th, s, v, t);
    this.paintEmbers(ctx, l, th, s, t);
    this.paintTide(ctx, l, near, t);
    if (v.drag) this.paintDrag(ctx, l, th, s, v);
  }

  private flicker(t: number, id: number): number {
    return t === 0 ? 1 : 0.95 + 0.05 * Math.sin(t * 5.3 + id * 2.1) * Math.sin(t * 2.1 + id);
  }

  /** 黑潮逼近的程度，0 到 1。 */
  private tideNear(s: GameState): number {
    const { phase, left } = s.tide;
    return phase === "surge"
      ? Math.min(1, (TIDE_SURGE - left) / 4 + 0.55) * Math.min(1, left / 3 + 0.35)
      : Math.max(0, 1 - left / Math.min(40, TIDE_CALM)) * 0.5;
  }

  private paintDisciples(ctx: Ctx, l: Layout, d: Derived, v: SceneView, t: number): void {
    for (const seat of d.seats) {
      if (v.drag?.from === seat.slot) continue;
      const p = l.slots[seat.slot];
      const bob = t === 0 ? 0 : Math.sin(t * 1.4 + seat.slot) * l.unit * 0.006;
      this.disciple(ctx, l, p.x, p.y + bob, seat.disciple);
    }
  }

  /** 脚下的影子。 */
  private shadow(ctx: Ctx, x: number, y: number, r: number): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.24);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, "rgba(20,26,30,0.55)");
    g.addColorStop(1, "rgba(20,26,30,0)");
    ctx.fillStyle = g;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();
  }

  private disciple(ctx: Ctx, l: Layout, x: number, y: number, id: string): void {
    const img = art(`d_${id}`);
    if (!img) return;
    this.shadow(ctx, x, y + l.unit * 0.04, l.unit * 0.46);
    stand(ctx, img, x, y + l.unit * 0.1, l.unit * DISCIPLE_HEIGHT);
  }

  /** 弟子身上的光色：一圈光晕和肩旁一点光。拖动时画的是放下之后的光色。 */
  private paintAura(ctx: Ctx, l: Layout, d: Derived, v: SceneView): void {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (const seat of d.seats) {
      if (v.drag?.from === seat.slot && !v.trial) continue;
      const p = l.slots[seat.slot];
      const hue = HUE_COLOR[seat.hue];
      if (seat.amount > 0) glow(ctx, p.x, p.y - l.unit * 0.36, l.unit * 0.62, hue, 0.34);
      glow(ctx, p.x + l.unit * 0.3, p.y - l.unit * 0.66, l.unit * 0.13, hue, 1);
      glow(ctx, p.x + l.unit * 0.3, p.y - l.unit * 0.66, l.unit * 0.05, "#ffffff", 0.8);
    }
    ctx.restore();
  }

  private paintMarks(ctx: Ctx, l: Layout, th: Palette, s: GameState, v: SceneView, t: number): void {
    for (const slot of SLOTS) {
      if (slot.terrace >= s.terraces) continue;
      const p = l.slots[slot.id];
      const empty = !s.lamps[slot.id] && !s.disciples.some((x) => x.slot === slot.id);
      const active = v.selected === slot.id || v.drag?.over === slot.id;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, l.unit * 0.3, l.unit * 0.085, 0, 0, 7);
      if (active) {
        ctx.strokeStyle = th.select;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.fillStyle = rgba(th.select, 0.18);
        ctx.fill();
      } else if (v.guide === slot.id) {
        // 新手提示指着的灯位：光圈一明一暗。
        const k = t === 0 ? 1 : 0.75 + 0.25 * Math.sin(t * 3);
        ctx.strokeStyle = rgba(th.select, 0.95 * k);
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.fillStyle = rgba(th.select, 0.22 * k);
        ctx.fill();
      } else if (empty || v.hover === slot.id) {
        ctx.strokeStyle = rgba(th.select, v.hover === slot.id ? 0.75 : 0.34);
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      if (slot.terrain !== "rock" && empty) {
        const tint = slot.terrain === "pine" ? "#63d99a" : slot.terrain === "spring" ? "#86c5ff" : "#ffb45c";
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        glow(ctx, p.x, p.y, l.unit * 0.12, tint, 0.9);
        ctx.restore();
      }
    }
    const pv = v.preview;
    if (!pv) return;
    for (const n of SLOTS[pv.slot].neighbors) {
      if (SLOTS[n].terrace >= s.terraces) continue;
      const p = l.slots[n];
      ctx.fillStyle = rgba(th.flame[pv.flame], 0.34);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, l.unit * 0.34, l.unit * 0.1, 0, 0, 7);
      ctx.fill();
    }
  }

  private paintLamps(ctx: Ctx, l: Layout, th: Palette, s: GameState, v: SceneView, t: number): void {
    const weak = v.trial?.exposed ?? v.exposed;
    for (let terrace = s.terraces - 1; terrace >= 0; terrace--) {
      for (const slot of SLOTS) {
        const lamp = s.lamps[slot.id];
        if (slot.terrace !== terrace || !lamp || v.drag?.from === slot.id) continue;
        const p = l.slots[slot.id];
        this.lamp(ctx, l, th, p.x, p.y, lamp.flame, lamp.level, lamp.soot, this.flicker(t, slot.id) * s.fuel);
        if (weak.includes(slot.id)) this.weakRing(ctx, l, slot.id);
      }
    }
    // 拖着的灯要落的地方，和它换出来的灯。
    if (v.drag && v.trial) {
      const { from, over } = v.drag;
      for (const id of [from, over]) if (id !== null && weak.includes(id) && (id === from || !s.lamps[id])) this.weakRing(ctx, l, id);
    }
  }

  /** 下次黑潮挡不住的灯，脚下一圈红光。 */
  private weakRing(ctx: Ctx, l: Layout, id: number): void {
    const p = l.slots[id];
    ctx.strokeStyle = "rgba(255,110,96,0.95)";
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 1, l.unit * 0.25, l.unit * 0.075, 0, 0, 7);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private lamp(ctx: Ctx, l: Layout, th: Palette, x: number, y: number, flame: Flame, level: number, soot: number, k: number): void {
    const u = l.unit;
    const grade = tier(level);
    const name = `lamp${grade + 1}_${flame}`;
    const img = art(name);
    if (img) {
      const h = u * LAMP_HEIGHT[grade];
      this.shadow(ctx, x, y, u * 0.26);
      stand(ctx, img, x, y + u * 0.04, h);
      const ash = soot > 0.01 ? sooty(name) : null;
      if (ash) {
        ctx.save();
        ctx.globalAlpha *= Math.min(0.85, soot * 1.3);
        stand(ctx, ash, x, y + u * 0.04, h);
        ctx.restore();
      }
    }
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    glow(ctx, x, y - u * FIRE[grade], u * (0.5 + 0.12 * lampPower(level)), th.flame[flame], 0.5 * k * (1 - soot));
    for (let i = 0; i < level; i++) glow(ctx, x + (i - (level - 1) / 2) * u * 0.075, y - u * 0.07, u * 0.045, th.flame[flame], 1);
    ctx.restore();
  }

  /** 灯上飘起的火星。 */
  private paintEmbers(ctx: Ctx, l: Layout, th: Palette, s: GameState, t: number): void {
    if (t === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    s.lamps.forEach((lamp, id) => {
      if (!lamp) return;
      const p = l.slots[id];
      for (let i = 0; i < 2; i++) {
        const life = (t * 0.22 + id * 0.37 + i * 0.5) % 1;
        const x = p.x + Math.sin(t * 0.9 + id * 1.7 + i * 2.4) * l.unit * 0.12 * (0.4 + life);
        const y = p.y - l.unit * (FIRE[tier(lamp.level)] + 0.2 + life * 0.75);
        glow(ctx, x, y, l.unit * 0.035, th.flame[lamp.flame], Math.sin(life * Math.PI) * 0.8 * (1 - lamp.soot) * s.fuel);
      }
    });
    ctx.restore();
  }

  private paintTide(ctx: Ctx, l: Layout, near: number, t: number): void {
    // 窄屏两边留白少，黑潮少进一点，别把边上的灯全盖住。
    const room = Math.min(1, Math.max(0.35, (l.w / l.unit - 5.5) / 3));
    const reach = (0.03 + near * 0.27) * room;
    const cloud = art("tide");
    if (!cloud || near <= 0) return;
    const w = Math.max(l.w * 0.46, l.h * 0.4);
    for (const side of [-1, 1]) {
      for (const layer of [0, 1]) {
        const shown = l.w * reach * (layer ? 0.78 : 1) + Math.sin(t * 0.6 + side + layer * 2) * 10;
        const drift = Math.sin(t * 0.22 + side * 2 + layer) * l.h * 0.04;
        ctx.save();
        ctx.globalAlpha = Math.min(1, near * 1.15) * (layer ? 1 : 0.85);
        ctx.translate(side < 0 ? 0 : l.w, layer ? l.h : 0);
        ctx.scale(-side, layer ? -1 : 1);
        ctx.drawImage(cloud, shown - w * 0.8, drift - l.h * 0.06, w, l.h * 1.12);
        ctx.restore();
      }
    }
  }

  private paintDrag(ctx: Ctx, l: Layout, th: Palette, s: GameState, v: SceneView): void {
    const { from, x, y } = v.drag!;
    ctx.save();
    ctx.globalAlpha = 0.9;
    const lamp = s.lamps[from];
    const who = s.disciples.find((z) => z.slot === from);
    if (lamp) this.lamp(ctx, l, th, x, y + l.unit * 0.4, lamp.flame, lamp.level, lamp.soot, 1);
    else if (who) this.disciple(ctx, l, x, y + l.unit * 0.3, who.id);
    ctx.restore();
  }
}
