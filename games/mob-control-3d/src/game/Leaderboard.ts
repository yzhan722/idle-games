import type { LeaderboardEntry } from './State';

/** 榜单展示行：陪练（机器人）不占名次，`rank` 为 null。 */
export interface RankedLeaderboardRow extends LeaderboardEntry {
  rank: number | null;
}

export interface RankedLeaderboard {
  rows: RankedLeaderboardRow[];
  selfRank: number | null;
  hasReal: boolean;
}

export const LEADERBOARD_SIZE = 10;

type Comparator = (a: LeaderboardEntry, b: LeaderboardEntry) => number;

export const compareByPeakStage: Comparator = (a, b) =>
  b.bestStage - a.bestStage || b.totalKills - a.totalKills;

export const compareByPlayTime: Comparator = (a, b) =>
  (b.playTimeSeconds || 0) - (a.playTimeSeconds || 0) || b.bestStage - a.bestStage;

/**
 * 真人在前、陪练在后补位：真人按成绩排名次，陪练只填空位、不参与名次。
 * 本周没有真人时少放一个陪练，腾出一行给提示语。
 */
export function rankLeaderboard(
  realEntries: LeaderboardEntry[],
  botEntries: LeaderboardEntry[],
  compare: Comparator,
  size = LEADERBOARD_SIZE
): RankedLeaderboard {
  const real = [...realEntries].sort(compare).slice(0, size);
  const hasReal = real.length > 0;
  const botSlots = Math.max(0, (hasReal ? size : size - 1) - real.length);
  const bots = [...botEntries].sort(compare).slice(0, botSlots);
  const selfIdx = real.findIndex((e) => e.isSelf);
  return {
    rows: [
      ...real.map((e, i) => ({ ...e, rank: i + 1 })),
      ...bots.map((e) => ({ ...e, isBot: true, rank: null })),
    ],
    selfRank: selfIdx >= 0 ? selfIdx + 1 : null,
    hasReal,
  };
}

/** 昵称来自其他玩家，写进 innerHTML 前必须转义；服务端缺字段时当空串，不能让整个主菜单渲染失败。 */
export function escapeHtml(text: unknown): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 周榜写入密钥：32 字节随机数的十六进制。只随 POST 发给服务端（服务端只存哈希），不出现在榜单和分享链接里。 */
export const WRITE_KEY_PATTERN = /^[0-9a-f]{64}$/;
/** 分享编号：只用来防止重复领见面礼，与玩家编号、写入密钥都无关。 */
export const SHARE_ID_PATTERN = /^s_[0-9a-f]{12}$/;

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < bytes; i++) buf[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function createWriteKey(): string {
  return randomHex(32);
}

export function createShareId(): string {
  return `s_${randomHex(6)}`;
}

/** 昵称截断：不把表情切成半个（半个代理对会让 encodeURIComponent 抛错，分享按钮就没反应了）。 */
export function clipPlayerName(text: string, max = 14): string {
  return text
    .trim()
    .slice(0, max)
    .replace(/\p{Cs}/gu, '')
    .trim();
}

/** 服务端拒收后隔多久补发一次（毫秒）；0 = 不补发。 */
export function leaderboardRetryDelayMs(reason: string | undefined): number {
  if (reason === 'too_fast') return 6000;
  if (reason === 'busy') return 65000;
  if (reason === 'key_mismatch') return 1500;
  return 0;
}

/** 举报原因，顺序就是弹窗里的编号；代码和 deploy/worker.mjs 的 REPORT_REASONS 一致。 */
export const REPORT_REASONS = [
  { code: 'insult', label: '辱骂' },
  { code: 'sexual', label: '色情' },
  { code: 'hate', label: '歧视' },
  { code: 'impersonation', label: '冒充' },
  { code: 'other', label: '其他' },
] as const;
export type ReportReasonCode = (typeof REPORT_REASONS)[number]['code'];

/** 弹窗里填的编号 → 原因代码；填错返回 null。 */
export function parseReportChoice(input: string | null): ReportReasonCode | null {
  const n = Number(String(input ?? '').normalize('NFKC').trim());
  return Number.isInteger(n) && n >= 1 && n <= REPORT_REASONS.length ? REPORT_REASONS[n - 1].code : null;
}

/**
 * window.prompt 的包装：有的内置浏览器（部分 App 内网页、被拦了弹窗的页面）没有 prompt、调用就抛错，
 * 或者不弹框直接返回 null。人不可能在 80 毫秒内点掉弹框，所以这么快回来的 null 也当「弹不出来」。
 */
export function askText(
  message: string,
  defaultValue = '',
  promptFn: ((m: string, d?: string) => string | null) | undefined = globalThis.prompt,
  now: () => number = () => Date.now()
): { value: string | null; unavailable: boolean } {
  if (typeof promptFn !== 'function') return { value: null, unavailable: true };
  const t0 = now();
  try {
    const value = promptFn(message, defaultValue);
    return { value, unavailable: value === null && now() - t0 < 80 };
  } catch {
    return { value: null, unavailable: true };
  }
}

export const PROMPT_UNAVAILABLE_TEXT = '这里弹不出输入框，换个浏览器打开再试';

/** 举报结果给玩家看的一句话。 */
export function reportResultText(ok: boolean, reason?: string): string {
  if (reason === 'duplicate') return '已经举报过了';
  if (ok) return '收到，谢谢';
  if (reason === 'not_ranked') return '本周上榜后才能举报';
  if (reason === 'limit') return '举报太多了，过几天再来';
  if (reason === 'self') return '不能举报自己';
  return '没发出去，稍后再试';
}

export function createPlayerId(): string {
  return `cmd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
