/**
 * 聊天举报原因：键与后端 backend/src/chat_moderation.ts 的 REPORT_REASONS 一一对应
 * （scripts/name-filter-parity.test.ts 比对）。字要短，按钮放在聊天名字的长按 / 右键菜单里。
 */
export const REPORT_REASON_LABELS = {
  abuse: "辱骂",
  sexual: "色情",
  hate: "仇恨",
  impersonation: "冒充官方",
  spam: "刷屏广告",
  other: "其他",
} as const;

export type ReportReasonId = keyof typeof REPORT_REASON_LABELS;
