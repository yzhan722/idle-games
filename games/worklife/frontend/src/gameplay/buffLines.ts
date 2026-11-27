import { SECONDARY_LABEL, attackSpeedPct, combatSpeedPoints } from "./combatSecondary";

/**
 * 食物 / 药剂增益 → 一行文字，只写服务端真的会结算的效果。
 * - combatSpeed 折成真正的攻击速度（combatSecondary.attackSpeedPct，合计封顶 3%），下一场战斗起算。
 * - goldGain 只作用于战斗掉落的金币；rareFind 只作用于战斗掉落。
 */
export type BuffLike = {
  name?: string;
  durationSec?: number;
  multipliers?: Record<string, number | undefined>;
  stats?: Record<string, number | undefined>;
};

const MULT_LABEL: Record<string, string> = {
  gatherSpeed: "采集速度",
  craftSpeed: "制作速度",
  xpGain: "经验",
  goldGain: "战斗金币",
};

const STAT_LABEL: Record<string, string> = { atk: "攻击", def: "防御", ...SECONDARY_LABEL };
const STAT_PCT_LABEL: Record<string, string> = { efficiency: "效率", rareFind: "战斗稀有掉落" };

export function buffParts(buff: BuffLike | undefined | null): string[] {
  if (!buff) return [];
  const out: string[] = [];
  for (const [key, value] of Object.entries(buff.stats || {})) {
    if (!value) continue;
    if (STAT_LABEL[key]) out.push(`${STAT_LABEL[key]} +${value}`);
    else if (STAT_PCT_LABEL[key]) out.push(`${STAT_PCT_LABEL[key]} +${value}%`);
  }
  for (const [key, value] of Object.entries(buff.multipliers || {})) {
    if (key === "combatSpeed") {
      const speed = attackSpeedPct(combatSpeedPoints(value));
      if (speed) out.push(`攻击速度 +${speed}%`);
      continue;
    }
    const pct = Math.round((Number(value) - 1) * 100);
    if (MULT_LABEL[key] && pct) out.push(`${MULT_LABEL[key]} +${pct}%`);
  }
  return out;
}

/** 例如「攻击 +6 · 10 分钟」；没有会生效的增益时为空串（不单独写时长）。 */
export function buffLine(buff: BuffLike | undefined | null): string {
  const parts = buffParts(buff);
  if (!parts.length) return "";
  if (buff?.durationSec) parts.push(`${Math.round(buff.durationSec / 60)} 分钟`);
  return parts.join(" · ");
}
