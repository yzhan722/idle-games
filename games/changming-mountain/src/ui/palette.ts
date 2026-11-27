import type { Flame, Hue } from "../core/types.ts";

/** 全作只用一套基调：青绿（石青石绿，山脊勾金线）。 */
export interface Palette {
  sky: string;
  /** 远景上下两端的罩色，让界面和山台更清楚。 */
  hazeTop: string;
  hazeLow: string;
  /** 夜色（乘到画面上），上端与下端。 */
  nightTop: [number, number, number];
  nightLow: [number, number, number];
  /** 灯照出来的光（加到光照图上）。 */
  light: Record<Flame, [number, number, number]>;
  /** 灯火本身的颜色。 */
  flame: Record<Flame, string>;
  select: string;
}

export const HUE_COLOR: Record<Hue, string> = {
  dark: "#6b7280",
  dawn: "#ffb45c",
  verdant: "#63d99a",
  frost: "#86c5ff",
  spring: "#cfe06a",
  jade: "#5fd6d0",
  clear: "#d3b0f2",
  white: "#fff6e0",
};

export const PALETTE: Palette = {
  sky: "#12343a",
  hazeTop: "rgba(6,26,32,0.55)",
  hazeLow: "rgba(6,22,26,0.35)",
  nightTop: [88, 130, 168],
  nightLow: [68, 110, 142],
  light: { dawn: [255, 190, 112], verdant: [122, 236, 170], frost: [140, 196, 255] },
  flame: { dawn: "#ffb45c", verdant: "#63d99a", frost: "#86c5ff" },
  select: "#ffe7a3",
};
