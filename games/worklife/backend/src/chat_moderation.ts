/**
 * 聊天管控：屏蔽与举报（内存与 PostgreSQL 两个存储都用这里的规则）。
 *
 * - 屏蔽：名单存在服务端、随账号走（内存存储写进快照文件，PostgreSQL 写 chat_blocks）。
 *   被屏蔽的人的公聊、私聊、组队邀请都送不到；对方看到的回执和平常一样，不知道被屏蔽。
 * - 举报：选一个原因；服务端只在内存里留每个频道（私聊按两人一对）最近 REPORT_SNAPSHOT_SIZE 条，
 *   举报时把举报人所在频道的这些条抄进举报记录。重启后内存是空的，那时的举报只有举报本身，snapshot 为空数组。
 * - 限流与去重：每人 24 小时最多 REPORT_DAILY_MAX 次；24 小时内对同一个人重复举报只算一次（照样回「已收到」）。
 * - 保存期限：REPORT_KEEP_DAYS 天，到期由服务端定时清除；举报人或被举报人注销时，相关举报一并删除。
 * - 查看：只有管理接口 /admin/chat-reports，请求头 x-admin-key 对上 REPORTS_ADMIN_KEY 才给，没配或不对一律 404。
 */
import { membershipKeyForSend } from "./chat_channels";

export const CHAT_BLOCK_MAX = 200;
export const REPORT_REASONS = ["abuse", "sexual", "hate", "impersonation", "spam", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
export const REPORT_CHANNELS = ["world", "profession", "party", "circle", "private"] as const;
export type ReportChannel = (typeof REPORT_CHANNELS)[number];
/** 每个频道在内存里留最近几条（只为举报取证，不落库）。 */
export const REPORT_SNAPSHOT_SIZE = 20;
export const REPORT_KEEP_DAYS = 90;
export const REPORT_DAILY_MAX = 10;
export const REPORT_DEDUPE_HOURS = 24;
/** 内存里最多留多少个频道 / 私聊对的最近消息；超了先丢最久没说话的。 */
export const CHAT_RING_KEYS_MAX = 2000;

export type ChatLine = { ts: string; sender: string; senderName: string; content: string };
export type ChatReport = {
  id: string;
  reporterId: string;
  targetId: string;
  reason: ReportReason;
  channel: ReportChannel;
  snapshot: ChatLine[];
  createdAt: string;
};
export type ChatBlockResult = { ok: true } | { ok: false; error: "self" | "user_not_found" | "too_many" };
export type ReportOutcome = { ok: true; duplicate: boolean } | { ok: false; error: "self" | "user_not_found" | "report_limited" };

const HOUR_MS = 3600_000;

export function privateKey(a: string, b: string): string {
  return a < b ? `private:${a}:${b}` : `private:${b}:${a}`;
}

/** 举报取证用哪段最近消息：举报人自己所在的频道；私聊取两人这一对。 */
export function reportRingKey(
  channel: ReportChannel,
  reporterId: string,
  targetId: string,
  reporter: { classId?: string | null; partyId?: string | null; circleId?: string | null }
): string | null {
  if (channel === "private") return privateKey(reporterId, targetId);
  return membershipKeyForSend(channel, reporter);
}

/** 每个频道最近 size 条，只在内存里。 */
export function createChatRing(size = REPORT_SNAPSHOT_SIZE, maxKeys = CHAT_RING_KEYS_MAX) {
  const rings = new Map<string, ChatLine[]>();
  return {
    push(key: string, line: ChatLine) {
      const ring = rings.get(key) ?? [];
      rings.delete(key);
      if (rings.size >= maxKeys) rings.delete(rings.keys().next().value as string);
      ring.push(line);
      if (ring.length > size) ring.splice(0, ring.length - size);
      rings.set(key, ring);
    },
    snapshot(key: string | null): ChatLine[] {
      return key ? (rings.get(key) ?? []).map((l) => ({ ...l })) : [];
    },
    /** 注销：这个人说过的话和他的私聊对一起丢掉。 */
    forget(userId: string) {
      for (const [key, ring] of [...rings]) {
        if (key.startsWith("private:") && key.split(":").includes(userId)) {
          rings.delete(key);
          continue;
        }
        const kept = ring.filter((l) => l.sender !== userId);
        if (kept.length) rings.set(key, kept);
        else rings.delete(key);
      }
    },
    size: () => rings.size,
  };
}

/** 这次举报记不记：24 小时内举报过同一个人 = 重复；24 小时内已满额 = 限流。recent 是这个举报人的举报。 */
export function reportGate(recent: Array<Pick<ChatReport, "targetId" | "createdAt">>, targetId: string, now: Date): "ok" | "duplicate" | "limited" {
  const since = now.getTime() - REPORT_DEDUPE_HOURS * HOUR_MS;
  const mine = recent.filter((r) => Date.parse(r.createdAt) > since);
  if (mine.some((r) => r.targetId === targetId)) return "duplicate";
  return mine.length >= REPORT_DAILY_MAX ? "limited" : "ok";
}

export function reportExpired(createdAt: string, now: Date): boolean {
  const at = Date.parse(createdAt);
  return !Number.isFinite(at) || now.getTime() - at > REPORT_KEEP_DAYS * 24 * HOUR_MS;
}
