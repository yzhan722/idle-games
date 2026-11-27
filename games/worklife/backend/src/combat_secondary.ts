/**
 * 战斗次级属性：命中、闪避、物理抗性（物抗）、元素抗性（元抗）。
 *
 * - 前后端各有一份逐字相同的拷贝：backend/src/combat_secondary.ts 与 frontend/src/gameplay/combatSecondary.ts。
 *   scripts/combat-secondary-parity.test.ts 会比对两份文件，改一边必须同步另一边。
 * - 战斗没有随机数：落空用「落空条」累计，攒满一整次就落空一次，所以预览与服务端结算逐字一致。
 * - 设计依据见 docs/design/COMBAT_SECONDARY.md。只放纯函数，不引用其他模块。
 */

export type DamageType = "physical" | "elemental";
export type SecondaryStats = { accuracy: number; evasion: number; physResist: number; elemResist: number };
export const SECONDARY_KEYS = ["accuracy", "evasion", "physResist", "elemResist"] as const;
export const SECONDARY_LABEL: Record<keyof SecondaryStats, string> = {
  accuracy: "命中",
  evasion: "闪避",
  physResist: "物抗",
  elemResist: "元抗",
};

// ---------------------------------------------------------------------------
// 1. 命中与闪避
// ---------------------------------------------------------------------------

/** 命中 = base + perLevel·等级；玩家再加「攻击」技能每级 perAttackSkill 与装备、食物。 */
export const ACCURACY = { base: 100, perLevel: 10, perAttackSkill: 2 } as const;

export function levelAccuracy(level: number): number {
  return ACCURACY.base + ACCURACY.perLevel * Math.max(1, level);
}

export function playerAccuracy(combatLevel: number, attackLevel: number, bonus = 0): number {
  return levelAccuracy(combatLevel) + ACCURACY.perAttackSkill * (Math.max(1, attackLevel) - 1) + bonus;
}

/**
 * 落空率 = cap · r / (r + half)，r = 对方闪避 ÷ 我方命中。
 * r 很小时约等于 r 本身；r 再大也到不了 cap，所以命中率永远高于 1 − cap（封底）；
 * 对方没有闪避时为 0，必中（封顶）。
 */
export const MISS = { cap: 0.6, half: 0.6 } as const;
/** 落空条用万分点整数累计，避免小数误差。 */
export const MISS_FULL = 10_000;
/** 落空条从一半开始，长短战斗的平均落空次数都与落空率一致。 */
export const MISS_START = 5_000;

/** 落空率（万分点）。没有命中数值的对手（竞技场擂主等）视为必中。 */
export function missBp(accuracy: number | undefined, evasion: number | undefined): number {
  if (!(Number(accuracy) > 0) || !(Number(evasion) > 0)) return 0;
  const r = Number(evasion) / Number(accuracy);
  return Math.round(((MISS.cap * r) / (r + MISS.half)) * MISS_FULL);
}

/** 命中率（百分比，保留 1 位小数），给界面用。 */
export function hitPct(accuracy: number | undefined, evasion: number | undefined): number {
  return Math.round((MISS_FULL - missBp(accuracy, evasion)) / 10) / 10;
}

/** 挥一次：落空条加上落空率，满一整次就落空并扣掉。 */
export function swingMeter(meter: number | undefined, bp: number): { miss: boolean; meter: number } {
  const next = (meter ?? MISS_START) + bp;
  return next >= MISS_FULL ? { miss: true, meter: next - MISS_FULL } : { miss: false, meter: next };
}

// ---------------------------------------------------------------------------
// 2. 抗性
// ---------------------------------------------------------------------------

/** 伤害倍率 = 1 − cap · 抗性 / (|抗性| + half)：每 10 点约 5%，越堆越慢，永远到不了 cap；负数是弱点，反过来多挨打。 */
export const RESIST = { cap: 0.7, half: 140 } as const;

export function resistMult(points: number | undefined): number {
  const p = Number(points || 0);
  if (!p) return 1;
  return 1 - (RESIST.cap * p) / (Math.abs(p) + RESIST.half);
}

/** 这一下吃哪一种抗性。没写伤害类型的按物理算。 */
export function resistAgainst(
  damageType: DamageType | undefined,
  defender: { physResist?: number; elemResist?: number }
): number {
  return Number((damageType === "elemental" ? defender.elemResist : defender.physResist) || 0);
}

// ---------------------------------------------------------------------------
// 3. 装备、食物上的数值与一行文字
// ---------------------------------------------------------------------------

/** 一组条目的次级属性合计（每件先乘强化倍率，最后一起四舍五入）。 */
export function sumSecondary(rows: ReadonlyArray<{ stats: Partial<SecondaryStats> | undefined; mult?: number }>): SecondaryStats {
  const out: SecondaryStats = { accuracy: 0, evasion: 0, physResist: 0, elemResist: 0 };
  for (const row of rows) {
    if (!row.stats) continue;
    for (const key of SECONDARY_KEYS) out[key] += Number(row.stats[key] || 0) * (row.mult ?? 1);
  }
  for (const key of SECONDARY_KEYS) out[key] = Math.round(out[key]);
  return out;
}

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

/** 物品提示里的一行，例如「命中 +18 · 元抗 +4」；没有次级属性时为空串。 */
export function secondaryLine(stats: Partial<SecondaryStats> | undefined, mult = 1): string {
  if (!stats) return "";
  const total = sumSecondary([{ stats, mult }]);
  return SECONDARY_KEYS.filter((k) => total[k] !== 0)
    .map((k) => `${SECONDARY_LABEL[k]} ${signed(total[k])}`)
    .join(" · ");
}

// ---------------------------------------------------------------------------
// 4. 攻击速度（食物、药剂、套装上的 combatSpeed 点数）
// ---------------------------------------------------------------------------

/** 每点折 0.1% 攻击速度，全部来源合计封顶 3%：多喝几瓶也只是锦上添花，不改变打怪节奏。 */
export const ATTACK_SPEED = { perPoint: 0.1, capPct: 3, minIntervalMs: 800 } as const;

/** 点数（内容包里的 combatSpeed：药剂 1.12 记 12 点，套装 10 记 10 点）→ 真正的攻击速度加成（百分比，1 位小数）。 */
export function attackSpeedPct(points: number): number {
  return Math.min(ATTACK_SPEED.capPct, Math.round(Math.max(0, Number(points) || 0) * ATTACK_SPEED.perPoint * 10) / 10);
}

/** 增益倍率（1.12）→ 点数（12）。 */
export function combatSpeedPoints(multiplier: number | undefined): number {
  return Math.max(0, Math.round((Number(multiplier || 1) - 1) * 1000) / 10);
}

export function attackSpeedInterval(intervalMs: number, points: number): number {
  const pct = attackSpeedPct(points);
  return pct > 0 ? Math.max(Math.min(intervalMs, ATTACK_SPEED.minIntervalMs), Math.round(intervalMs / (1 + pct / 100))) : intervalMs;
}

type Fighter = Partial<SecondaryStats> & { damageType?: DamageType };

/** 战斗预览的一行，例如「命中 96% · 伤害 -4% · 闪避 7% · 受伤 -9%」，没有影响的不写。 */
export function matchupLine(me: Fighter, foe: Fighter): string {
  const pct = (mult: number) => Math.round((mult - 1) * 1000) / 10;
  const parts = [`命中 ${hitPct(me.accuracy, foe.evasion)}%`];
  const dealt = pct(resistMult(resistAgainst(me.damageType, foe)));
  if (dealt) parts.push(`伤害 ${signed(dealt)}%`);
  const dodge = Math.round((100 - hitPct(foe.accuracy, me.evasion)) * 10) / 10;
  if (dodge) parts.push(`闪避 ${dodge}%`);
  const taken = pct(resistMult(resistAgainst(foe.damageType, me)));
  if (taken) parts.push(`受伤 ${signed(taken)}%`);
  return parts.join(" · ");
}
