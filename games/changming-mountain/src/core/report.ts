import { HOLD_LAMPS, PATTERNS } from "./data.ts";
import type { OfflineReport } from "./engine.ts";
import type { GameEvent } from "./types.ts";

/** 一夜过去该说的话；没守住时说清是没灯、灯太少，还是哪几盏没挡住、蒙了多少灰。 */
export function nightText(e: Extract<GameEvent, { type: "tideEnd" }>): string {
  if (e.held) return `守住了这一夜，得愿 ${e.wish.toFixed(1)}`;
  if (e.lit === 0) return "山上没有灯，黑潮漫过去了";
  if (e.lit < HOLD_LAMPS) return `只有 ${e.lit} 盏灯，${HOLD_LAMPS} 盏起才守得住`;
  if (!e.breached) return "有灯没挡住黑潮";
  return e.soot > 0.01 ? `${e.breached} 盏灯没挡住，蒙灰 ${Math.round(e.soot * 100)}%` : `${e.breached} 盏灯没挡住，还好没积灰`;
}

/** 离开这段时间里值得一提的事，一件一行。 */
export function offlineNotes(r: OfflineReport): string[] {
  const out: string[] = [];
  for (const e of r.events) {
    if (e.type === "realm") out.push("守夜成了，境界突破");
    else if (e.type === "vigilFailed") out.push(e.reason);
    else if (e.type === "tideEnd" && e.star > 0) out.push(`潮退处落下星屑 ${e.star}`);
    else if (e.type === "patternSeen") out.push(`摆出了「${PATTERNS.find((p) => p.id === e.id)!.name}」`);
  }
  return out;
}

/** 离开多久才弹窗。 */
export const POPUP_AFTER = 600;

/** 离开一阵回来：一分钟内照常补走，十分钟内只提一句，再久才弹窗。 */
export function awayKind(seconds: number): "step" | "quiet" | "popup" {
  if (seconds < 60) return "step";
  return seconds < POPUP_AFTER ? "quiet" : "popup";
}
