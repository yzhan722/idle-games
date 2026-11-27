/**
 * 同好会的内存存储（规则在 circle.ts）。每个操作从读到写之间没有 await，同一进程里天然排队：
 * 同时加入满员、会长同时被踢与转让都按到达顺序一个个判。数据写进快照文件（memory_snapshot.ts 的 circles）。
 */
import { randomUUID } from "crypto";
import {
  CIRCLE_CREATE_COST,
  CIRCLE_MAX_MEMBERS,
  CIRCLE_SEARCH_LIMIT,
  applyCircleAction,
  circleCounters,
  circleNameKey,
  circleSummary,
  isAcceptableCircleName,
  matchesCircleQuery,
  newCircleDoc,
  normalizeCircleDoc,
  removeAccountFromCircle,
  rollWeek,
  shownCircleName,
  withdrawPending,
  type CircleAction,
  type CircleDoc,
  type CircleHome,
  type CircleOutcome,
  type CircleSummary,
} from "./circle";
import { shownName } from "./display_name";
import { countHigher, createRankCache, sortRows, type RankRow } from "./leaderboard";
import type { EnhancedPlayerState } from "./types";
import { CIRCLE_BOARD_SNAPSHOT_MS, circleBoardMe } from "./circle";

export type CircleEvents = {
  /** 成员变了：把这个人的同好会聊天频道换成 circleId（null = 退出）。 */
  setChannel(userId: string, circleId: string | null): void;
  broadcast(channel: string, msg: unknown): void;
  notifyUser(userId: string, payload: Record<string, unknown>): void;
};

/**
 * 操作成功后通知：频道成员、团内事件、被踢 / 解散 / 当上会长的提醒。两个存储共用。
 * actorId：做这件事的人，他自己界面上已经有回执（如「已解散」），不再给他发提醒，免得一件事弹两条。
 */
export function announceCircleOutcome(events: CircleEvents, before: CircleDoc, outcome: CircleOutcome, action: string, actorId?: string) {
  if (!outcome.ok || !outcome.changed) return;
  const ts = new Date().toISOString();
  const channel = `circle:${before.id}`;
  for (const uid of outcome.joined) events.setChannel(uid, before.id);
  if (outcome.doc === null) {
    events.broadcast(channel, { type: "circle:event", event: "disbanded", ts });
    for (const m of before.members) {
      events.setChannel(m.userId, null);
      if (m.userId !== actorId) events.notifyUser(m.userId, { kind: "circle:disbanded" });
    }
    return;
  }
  for (const uid of outcome.left) {
    events.setChannel(uid, null);
    if (action === "kick") events.notifyUser(uid, { kind: "circle:kicked" });
  }
  if (outcome.joined.length) events.broadcast(channel, { type: "circle:event", event: "member_joined", ts });
  if (outcome.left.length) events.broadcast(channel, { type: "circle:event", event: "member_left", ts });
  if (outcome.leaderChanged) {
    events.broadcast(channel, { type: "circle:event", event: "leader_changed", ts });
    if (outcome.leaderChanged !== actorId) events.notifyUser(outcome.leaderChanged, { kind: "circle:leader" });
  }
  if (action === "invite" || action === "apply") {
    const to = action === "invite" ? outcome.doc.invites.at(-1)?.userId : outcome.doc.leaderId;
    if (to) events.notifyUser(to, { kind: action === "invite" ? "circle:invite" : "circle:apply" });
  }
}

export function createMemoryCircles(deps: {
  states: Map<string, EnhancedPlayerState>;
  hasUser(userId: string): boolean;
  /** who 屏蔽了 from。 */
  blocked(who: string, from: string): boolean;
  isOnline(userId: string): boolean;
  /** 这个人在真人榜上的总等级；不上榜（没起名字、系统账号、数据异常）为 0。 */
  rankTotal(userId: string): number;
  persist(): void;
  events: CircleEvents;
}) {
  const circles = new Map<string, CircleDoc>();
  /** userId → 所在的同好会编号（一人一个）。 */
  const memberOf = new Map<string, string>();

  // 团榜：最多每 CIRCLE_BOARD_SNAPSHOT_MS 重算一次，再套真人榜的缓存
  let boardSnapshot: { at: number; rows: RankRow[] } | null = null;
  const circleScore = (doc: CircleDoc) => doc.members.reduce((sum, m) => sum + deps.rankTotal(m.userId), 0);
  function boardRows(): RankRow[] {
    const now = Date.now();
    if (boardSnapshot && now >= boardSnapshot.at && now - boardSnapshot.at < CIRCLE_BOARD_SNAPSHOT_MS) return boardSnapshot.rows;
    const rows = sortRows([...circles.values()].map((c) => ({ userId: c.id, name: shownCircleName(c.name), score: circleScore(c) })));
    boardSnapshot = { at: now, rows };
    return rows;
  }
  const boardCache = createRankCache({
    top: async (_board, limit) => boardRows().slice(0, limit),
    countAbove: async (_board, score) => countHigher(boardRows(), score),
  });

  function index(doc: CircleDoc) {
    for (const m of doc.members) memberOf.set(m.userId, doc.id);
  }

  function write(before: CircleDoc, outcome: CircleOutcome) {
    if (!outcome.ok || !outcome.changed) return;
    if (outcome.doc === null) {
      circles.delete(before.id);
      for (const m of before.members) if (memberOf.get(m.userId) === before.id) memberOf.delete(m.userId);
    } else {
      circles.set(before.id, outcome.doc);
      for (const uid of outcome.left) if (memberOf.get(uid) === before.id) memberOf.delete(uid);
      index(outcome.doc);
    }
    // 解散、改名单后团榜下一次请求重算（会名不会改，分数最多晚一个缓存周期）
    if (outcome.doc === null || outcome.joined.length || outcome.left.length) {
      boardSnapshot = null;
      boardCache.clear();
    }
    deps.persist();
  }

  /** 这些人刚加入 keepId：清掉他们在其他会的申请和收到的邀请（与这次加入同步完成，中间没有 await）。 */
  function withdrawElsewhere(userIds: string[], keepId: string) {
    let dirty = false;
    for (const uid of userIds) {
      for (const doc of circles.values()) {
        if (doc.id === keepId) continue;
        const next = withdrawPending(doc, uid);
        if (next) {
          circles.set(doc.id, next);
          dirty = true;
        }
      }
    }
    if (dirty) deps.persist();
  }

  const nameOf = (userId: string) => shownName(userId, deps.states.get(userId)?.settings?.playerName);
  const counters = (userId: string) => circleCounters(deps.states.get(userId)?.stats);
  const requestsOf = (userId: string, kind: "invites" | "applications"): CircleSummary[] =>
    [...circles.values()].filter((c) => c[kind].some((r) => r.userId === userId)).map(circleSummary);

  return {
    load(list: unknown[]) {
      for (const raw of list) {
        const doc = normalizeCircleDoc(raw);
        if (!doc || !doc.members.length) continue;
        circles.set(doc.id, doc);
        index(doc);
      }
    },
    dump(): CircleDoc[] {
      return [...circles.values()];
    },
    circleIdOf(userId: string): string | null {
      return memberOf.get(userId) ?? null;
    },
    /** 换周：把所有成员的本周起点重记成此刻的累计数（index.ts 每分钟调一次，没换周什么都不做）。返回改了几个会。 */
    rollWeeks(now: Date): number {
      let n = 0;
      for (const doc of circles.values()) {
        let changed = false;
        for (const m of doc.members) changed = rollWeek(m, counters(m.userId), now).changed || changed;
        if (changed) n++;
      }
      if (n) deps.persist();
      return n;
    },
    /** 注销：成员、申请、邀请里删掉；会长转给最早加入的，没人就解散。 */
    removeAccount(userId: string) {
      for (const doc of [...circles.values()]) {
        const outcome = removeAccountFromCircle(doc, userId);
        write(doc, outcome);
        announceCircleOutcome(deps.events, doc, outcome, "account_deleted");
      }
      memberOf.delete(userId);
    },
    methods: {
      async getCircleBoard({ userId, now }: { userId: string; now: Date }) {
        const id = memberOf.get(userId);
        const doc = id ? circles.get(id) : undefined;
        const me = circleBoardMe(doc ? { id: doc.id, name: doc.name, score: circleScore(doc) } : null);
        return boardCache.view({ board: "total", userId: doc?.id ?? "", entry: me, now });
      },
      async getCircleHome({ userId, now }: { userId: string; now: Date }): Promise<CircleHome> {
        const id = memberOf.get(userId);
        const doc = id ? circles.get(id) : undefined;
        const home: CircleHome = {
          circle: null,
          invites: requestsOf(userId, "invites"),
          applied: requestsOf(userId, "applications"),
          createCost: CIRCLE_CREATE_COST,
        };
        if (!doc) return home;
        let changed = false;
        const members = doc.members.map((m) => {
          const rolled = rollWeek(m, counters(m.userId), now);
          changed ||= rolled.changed;
          return {
            userId: m.userId,
            name: nameOf(m.userId),
            isLeader: m.userId === doc.leaderId,
            online: deps.isOnline(m.userId),
            joinedAt: m.joinedAt,
            week: rolled.week,
          };
        });
        if (changed) deps.persist();
        const isLeader = doc.leaderId === userId;
        const named = (r: { userId: string; at: string }) => ({ userId: r.userId, name: nameOf(r.userId), at: r.at });
        home.circle = {
          id: doc.id,
          name: shownCircleName(doc.name),
          memberCount: doc.members.length,
          max: CIRCLE_MAX_MEMBERS,
          isLeader,
          members,
          applications: isLeader ? doc.applications.map(named) : [],
          invited: isLeader ? doc.invites.map(named) : [],
        };
        return home;
      },
      async searchCircles({ query, limit }: { query: string; limit: number }): Promise<CircleSummary[]> {
        return [...circles.values()]
          .filter((c) => matchesCircleQuery(c, query))
          .sort((a, b) => b.members.length - a.members.length || a.createdAt.localeCompare(b.createdAt))
          .slice(0, Math.min(limit, CIRCLE_SEARCH_LIMIT))
          .map(circleSummary);
      },
      async createCircle({ userId, name, now }: { userId: string; name: string; now: Date }): Promise<CircleOutcome> {
        if (!isAcceptableCircleName(name)) return { ok: false, error: "name_invalid" };
        if (memberOf.has(userId)) return { ok: false, error: "already_in_circle" };
        const key = circleNameKey(name);
        if ([...circles.values()].some((c) => c.nameKey === key)) return { ok: false, error: "name_taken" };
        const st = deps.states.get(userId);
        if (!st) return { ok: false, error: "user_not_found" };
        if ((st.inventory?.gold ?? 0) < CIRCLE_CREATE_COST) return { ok: false, error: "not_enough_gold" };
        st.inventory.gold -= CIRCLE_CREATE_COST;
        if (st.stats) st.stats.totalGoldSpent = (st.stats.totalGoldSpent ?? 0) + CIRCLE_CREATE_COST;
        st.stateRevision = (st.stateRevision ?? 0) + 1;
        const doc = newCircleDoc({ id: randomUUID(), name, leaderId: userId, now, counters: counters(userId) });
        const outcome: CircleOutcome = { ok: true, doc, joined: [userId], left: [], changed: true };
        write(doc, outcome);
        withdrawElsewhere([userId], doc.id);
        deps.events.setChannel(userId, doc.id);
        return outcome;
      },
      async circleAction({
        userId,
        action,
        circleId,
        targetUserId,
        now,
      }: {
        userId: string;
        action: CircleAction;
        circleId?: string;
        targetUserId?: string;
        now: Date;
      }): Promise<CircleOutcome> {
        const id = circleId ?? memberOf.get(userId);
        if (!id) return { ok: false, error: "not_in_circle" };
        const doc = circles.get(id);
        if (!doc) return { ok: false, error: "circle_not_found" };
        if (targetUserId && action === "invite" && !deps.hasUser(targetUserId)) return { ok: false, error: "user_not_found" };
        // 对方屏蔽了会长：邀请送不到，回执和平常一样（与组队邀请一致）
        if (targetUserId && action === "invite" && doc.leaderId === userId && deps.blocked(targetUserId, userId)) {
          return { ok: true, doc, joined: [], left: [], changed: false };
        }
        const outcome = applyCircleAction(doc, {
          action,
          actorId: userId,
          targetId: targetUserId,
          now,
          actorCircle: memberOf.get(userId) ?? null,
          targetCircle: targetUserId ? (memberOf.get(targetUserId) ?? null) : null,
          actorCounters: counters(userId),
          targetCounters: targetUserId ? counters(targetUserId) : undefined,
        });
        write(doc, outcome);
        if (outcome.ok && outcome.joined.length) withdrawElsewhere(outcome.joined, doc.id);
        announceCircleOutcome(deps.events, doc, outcome, action, userId);
        return outcome;
      },
    },
  };
}
