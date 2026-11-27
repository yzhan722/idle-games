/**
 * 匿名留存统计（WL-COM4）：只回答「新手走到哪一步、隔天和第七天有多少人回来、一次玩多久」。
 *
 * - 落库的只有「日期 + 事件 + 人数」，没有玩家编号、设备、IP；查不出是谁。
 * - 默认关：没配 METRICS_ADMIN_KEY 就完全不采集；隐私政策还是草案时，玩家默认不参与；玩家随时能在设置里开关。
 * - 事件从服务端存档的前后变化里看出来，不给玩家另存标记，也不需要前端上报。
 * - 在线时长在内存里按玩家临时计时，结束时只留一个「落在哪一档」的计数；注销或关掉开关就丢弃。
 */
import { createHash, timingSafeEqual } from "node:crypto";
import { COMBAT_SKILL_IDS } from "./combat_skills";
import { isPartyBotUserId } from "./party_bots";
import type { EnhancedPlayerState, PlayerSettings } from "./types";

/** 与 frontend/src/gameplay/legalDocs.ts 的 LEGAL_DRAFT 一致（scripts/legal-facts.test.ts 守着）。草案期默认不参与统计。 */
export const PRIVACY_DRAFT = true;

export const MILESTONE_EVENTS = ["register", "first_battle", "first_level10", "return_d1", "return_d7"] as const;
/** 在线时长分档：名字与上限（分钟，不含）。 */
export const SESSION_BUCKETS = [
  ["session_0_1", 1],
  ["session_1_5", 5],
  ["session_5_15", 15],
  ["session_15_30", 30],
  ["session_30_60", 60],
  ["session_60_plus", Infinity],
] as const;
export type MilestoneEvent = (typeof MILESTONE_EVENTS)[number];
export type SessionEvent = (typeof SESSION_BUCKETS)[number][0];
export type MetricEvent = MilestoneEvent | SessionEvent;
export const METRIC_EVENTS: readonly MetricEvent[] = [...MILESTONE_EVENTS, ...SESSION_BUCKETS.map(([name]) => name)];

/** 里程碑记在「第一次玩的那天」名下，在线时长记在开始的那天；日期按 UTC。 */
export type MetricRow = { day: string; event: MetricEvent; count: number };

export const METRICS_KEEP_DAYS = 400;
/** 停多久算这次结束。前端在线时至少每 15 秒轮询一次。 */
export const SESSION_GAP_MS = 10 * 60_000;
const DAY_MS = 24 * 3600_000;
const MIN_KEY_LENGTH = 24;
const MAX_TRACKED = 20_000;

/** 猜得到的密钥：照抄示例、常见占位词、翻来覆去几个字符、与登录签名密钥相同。 */
const GUESSABLE_KEY = /example|placeholder|change[-_ ]?me|random_string|your[-_ ]|password|123456/i;
const MIN_KEY_VARIETY = 8;

/** 管理密钥能不能用：太短、太弱、与登录签名密钥相同都当没配（聊天举报的 REPORTS_ADMIN_KEY 同一套规则）。 */
export function adminKeyUsable(key: string | undefined, env: NodeJS.ProcessEnv = process.env): boolean {
  const k = key ?? "";
  return k.trim().length >= MIN_KEY_LENGTH && new Set(k).size >= MIN_KEY_VARIETY && !GUESSABLE_KEY.test(k) && k !== env.JWT_SECRET;
}

/** 定长散列后比较，不泄露长度与前缀。 */
export function adminKeyMatches(given: unknown, key: string | undefined, env: NodeJS.ProcessEnv = process.env): boolean {
  if (!adminKeyUsable(key, env) || typeof given !== "string" || !given) return false;
  const digest = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(digest(given), digest(key!));
}

/** 没配管理密钥、太短或太弱 = 当没配 = 不采集。 */
export function metricsAvailable(env: NodeJS.ProcessEnv = process.env): boolean {
  return adminKeyUsable(env.METRICS_ADMIN_KEY, env);
}

export function metricsKeyMatches(given: unknown, env: NodeJS.ProcessEnv = process.env): boolean {
  return adminKeyMatches(given, env.METRICS_ADMIN_KEY, env);
}

/** 玩家自己选过就听玩家的；没选过时，草案期不参与，正式版参与。 */
export function statsConsent(settings: Pick<PlayerSettings, "shareStats"> | null | undefined, draft = PRIVACY_DRAFT): boolean {
  return settings?.shareStats ?? !draft;
}

export function utcDay(at: Date): string {
  return at.toISOString().slice(0, 10);
}

export function sessionBucket(ms: number): SessionEvent {
  const minutes = Math.max(0, ms) / 60_000;
  return SESSION_BUCKETS.find(([, limit]) => minutes < limit)![0];
}

function highestSkill(state: EnhancedPlayerState): number {
  let best = 1;
  for (const s of Object.values(state.skills ?? {})) best = Math.max(best, Number(s?.level || 1));
  for (const id of COMBAT_SKILL_IDS) best = Math.max(best, Number(state.combatSkills?.[id]?.level || 1));
  return best;
}

/** 这一次存档变化里发生了哪些里程碑（每个玩家一生各一次）。 */
export function milestones(before: EnhancedPlayerState, after: EnhancedPlayerState, now: Date): MilestoneEvent[] {
  const out: MilestoneEvent[] = [];
  if (!(Number(before.stats?.totalKills) > 0) && Number(after.stats?.totalKills) > 0) out.push("first_battle");
  if (!after.prestige?.count && highestSkill(before) < 10 && highestSkill(after) >= 10) out.push("first_level10");
  const start = Date.parse(after.stats?.firstPlayedAt ?? "");
  const last = Date.parse(before.lastSimulatedAt ?? "");
  if (Number.isFinite(start) && Number.isFinite(last)) {
    const today = Math.floor((now.getTime() - start) / DAY_MS);
    const seen = Math.floor((last - start) / DAY_MS);
    if (today === 1 && seen < 1) out.push("return_d1");
    if (today === 7 && seen < 7) out.push("return_d7");
  }
  return out;
}

export type StateChange = { userId: string; before: EnhancedPlayerState; after: EnhancedPlayerState; now: Date };
export type StateObserver = (change: StateChange) => void;

export function createRetentionMetrics(opts: {
  write(rows: MetricRow[], now: Date): Promise<void>;
  enabled?: () => boolean;
  draft?: boolean;
}) {
  const enabled = opts.enabled ?? (() => metricsAvailable());
  const draft = opts.draft ?? PRIVACY_DRAFT;
  const pending = new Map<string, number>();
  const sessions = new Map<string, { start: number; last: number }>();
  /** 当天已记过的「玩家 + 事件」，防止同一步被两次请求各记一次；只在内存里，过了当天就清。 */
  let counted = new Set<string>();
  let countedDay = "";

  function bump(day: string, event: MetricEvent) {
    const key = `${day}|${event}`;
    pending.set(key, (pending.get(key) ?? 0) + 1);
  }
  function endSession(userId: string) {
    const s = sessions.get(userId);
    if (!s) return;
    sessions.delete(userId);
    bump(utcDay(new Date(s.start)), sessionBucket(s.last - s.start));
  }

  return {
    /** 新建账号。这时还没有玩家自己的设置，只看默认值。 */
    registered(now: Date) {
      if (enabled() && statsConsent(undefined, draft)) bump(utcDay(now), "register");
    },

    observe({ userId, before, after, now }: StateChange) {
      if (!enabled() || isPartyBotUserId(userId)) return;
      if (!statsConsent(after.settings, draft)) {
        sessions.delete(userId);
        return;
      }
      const at = now.getTime();
      const session = sessions.get(userId);
      if (session && at - session.last <= SESSION_GAP_MS) session.last = Math.max(session.last, at);
      else {
        endSession(userId);
        if (sessions.size < MAX_TRACKED) sessions.set(userId, { start: at, last: at });
      }
      const day = utcDay(now);
      if (day !== countedDay || counted.size > MAX_TRACKED) {
        counted = new Set();
        countedDay = day;
      }
      for (const event of milestones(before, after, now)) {
        const key = `${userId}|${event}`;
        if (counted.has(key)) continue;
        counted.add(key);
        const start = Date.parse(after.stats?.firstPlayedAt ?? "");
        bump(utcDay(Number.isFinite(start) ? new Date(start) : now), event);
      }
    },

    /** 关掉开关：正在计的时长马上丢掉，不等下一次请求。 */
    optedOut(userId: string) {
      sessions.delete(userId);
    },

    /** 注销：丢掉内存里的计时与去重标记。 */
    forget(userId: string) {
      sessions.delete(userId);
      for (const event of MILESTONE_EVENTS) counted.delete(`${userId}|${event}`);
    },

    /** 把攒下的计数写进库；写失败就留着下次再写。all = 关服前，把还开着的也结掉。 */
    async flush(now: Date, all = false): Promise<void> {
      for (const [userId, s] of [...sessions]) if (all || now.getTime() - s.last > SESSION_GAP_MS) endSession(userId);
      if (pending.size === 0) return;
      const taken = [...pending];
      pending.clear();
      const rows = taken.map(([key, count]) => {
        const [day, event] = key.split("|");
        return { day, event: event as MetricEvent, count };
      });
      try {
        await opts.write(rows, now);
      } catch (err) {
        for (const [key, count] of taken) pending.set(key, (pending.get(key) ?? 0) + count);
        throw err;
      }
    },
  };
}

export type MetricsReport = {
  since: string;
  days: Array<{ day: string } & Record<MetricEvent, number>>;
  totals: Record<MetricEvent, number>;
  /** 占注册人数的比例；次日 / 7 日只算已经过了那一天的批次。分母为 0 时是 null。 */
  rates: { firstBattle: number | null; level10: number | null; day1: number | null; day7: number | null };
};

export function buildReport(rows: MetricRow[], since: string, now: Date): MetricsReport {
  const zero = () => Object.fromEntries(METRIC_EVENTS.map((e) => [e, 0])) as Record<MetricEvent, number>;
  const byDay = new Map<string, Record<MetricEvent, number>>();
  const totals = zero();
  for (const row of rows) {
    if (row.day < since || !METRIC_EVENTS.includes(row.event)) continue;
    const bucket = byDay.get(row.day) ?? zero();
    bucket[row.event] += row.count;
    totals[row.event] += row.count;
    byDay.set(row.day, bucket);
  }
  const days = [...byDay].sort(([a], [b]) => (a < b ? -1 : 1)).map(([day, counts]) => ({ day, ...counts }));
  const rate = (event: MilestoneEvent, matureDays: number) => {
    const cutoff = utcDay(new Date(now.getTime() - matureDays * DAY_MS));
    const cohort = days.filter((d) => d.day <= cutoff);
    const base = cohort.reduce((n, d) => n + d.register, 0);
    return base > 0 ? Math.round((cohort.reduce((n, d) => n + d[event], 0) / base) * 1000) / 1000 : null;
  };
  return {
    since,
    days,
    totals,
    rates: { firstBattle: rate("first_battle", 0), level10: rate("first_level10", 0), day1: rate("return_d1", 3), day7: rate("return_d7", 9) },
  };
}
