/**
 * 时间/日期工具（无任何内部依赖，避免循环引用）。
 *
 * 每日重置统一走这里：业务“当日”按东八区（中国标准时间）判定，
 * 保证每日任务 / 赏金契约 / 签到等在本地 0 点重置，而不是 UTC 0 点。
 */

/** 每日重置使用的时区偏移（分钟）。东八区 = +8h = 480 分钟。 */
export const DAILY_RESET_TZ_OFFSET_MINUTES = 8 * 60;

/** 返回业务当日日期字符串 YYYY-MM-DD（东八区）。 */
export function todayLocal(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() + DAILY_RESET_TZ_OFFSET_MINUTES * 60_000);
  return shifted.toISOString().slice(0, 10);
}

/** 计算两个 YYYY-MM-DD 之间相差的天数（b - a）。无法解析时返回 Infinity。 */
export function dayDiff(a: string, b: string): number {
  const da = Date.parse(a + "T00:00:00Z");
  const db = Date.parse(b + "T00:00:00Z");
  if (Number.isNaN(da) || Number.isNaN(db)) return Infinity;
  return Math.round((db - da) / 86_400_000);
}
