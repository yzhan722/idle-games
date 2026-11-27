/**
 * 同好会的 PostgreSQL 存储（规则在 circle.ts，表见 migrations/008_circles.sql）。
 * - circles：一行一个同好会，成员、申请、邀请放在 doc（jsonb）；name_key 唯一 = 名字不重。
 * - circle_members：user_id 主键 = 一人只在一个同好会里，也是「我在哪个会」的索引。
 * 并发：每个操作在事务里先 SELECT … FOR UPDATE 锁住这个同好会，再判、再写，同一个会的操作排队；
 * 两个会同时收同一个人，后提交的那个在 circle_members 主键上撞车，整笔回滚并回「已经在一个同好会里了」。
 * 加锁顺序固定为 users（FOR KEY SHARE，按编号）→ player_states → circles，与注销（users FOR UPDATE → … → circles）一致：
 * 注销与接受邀请 / 通过申请 / 建会同时发生时，后来的那个在 users 行上等注销提交，不会互相等成死锁。
 * 查「谁在哪些会的申请 / 邀请里」用 doc @> {"invites":[{"userId":…}]}，这样才走 doc 上的 GIN（jsonb_path_ops）索引。
 * 加入（通过 / 接受 / 建会）在同一个事务里清掉此人在其他会的申请和邀请（txWithdrawElsewhere）。通过 / 接受时先把
 * 这个会和那些会按编号一次锁上，两笔加入交叉（甲进 A 时在 B 有申请、乙进 B 时在 A 有申请）也是按同一顺序排队。
 * name_key 只在新建时按新口径（circleNameKey）写；旧行不重算，见 circle.ts 文件头。
 */
import { randomUUID } from "crypto";
import type { Pool, PoolClient } from "pg";
import {
  CIRCLE_CREATE_COST,
  CIRCLE_MAX_MEMBERS,
  CIRCLE_SEARCH_LIMIT,
  applyCircleAction,
  circleCounters,
  circleNameKey,
  circleSummary,
  circleWeekKey,
  isAcceptableCircleName,
  newCircleDoc,
  normalizeCircleDoc,
  removeAccountFromCircle,
  rollWeek,
  shownCircleName,
  withdrawPending,
  type CircleAction,
  type CircleCounters,
  type CircleDoc,
  type CircleError,
  type CircleHome,
  type CircleOutcome,
  type CircleSummary,
} from "./circle";
import { circleBoardMe } from "./circle";
import { announceCircleOutcome, type CircleEvents } from "./circle_memory";
import { createRankCache } from "./leaderboard";
import { shownName } from "./display_name";
import type { EnhancedPlayerState } from "./types";

/** 事务里发现要整笔回滚的业务失败。 */
class CircleAbort extends Error {
  constructor(readonly code: CircleError) {
    super(code);
  }
}

export function createPgCircles(deps: {
  pool: Pool;
  withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T>;
  txLoadStateForUpdate(client: PoolClient, userId: string): Promise<{ state: EnhancedPlayerState; contentVersion: string }>;
  txPersistState(client: PoolClient, userId: string, state: EnhancedPlayerState, contentVersion: string): Promise<void>;
  isOnline(userId: string): boolean;
  events: CircleEvents;
}) {
  const { pool } = deps;

  async function profiles(db: Pool | PoolClient, ids: string[]): Promise<Map<string, { name: string; counters: CircleCounters }>> {
    const out = new Map<string, { name: string; counters: CircleCounters }>();
    if (!ids.length) return out;
    const { rows } = await db.query(
      "SELECT user_id, state_json->'settings'->>'playerName' AS name, state_json->'stats' AS stats FROM player_states WHERE user_id = ANY($1::uuid[])",
      [ids],
    );
    for (const r of rows) out.set(r.user_id, { name: shownName(r.user_id, r.name), counters: circleCounters(r.stats) });
    return out;
  }

  /** 事务里写回一次操作的结果：解散删行（circle_members 级联），否则改 doc、增删成员索引。 */
  async function txWrite(client: PoolClient, before: CircleDoc, outcome: CircleOutcome) {
    if (!outcome.ok || !outcome.changed) return;
    if (outcome.doc === null) {
      await client.query("DELETE FROM circles WHERE id = $1", [before.id]);
      return;
    }
    await client.query("UPDATE circles SET doc = $2::jsonb WHERE id = $1", [before.id, JSON.stringify(outcome.doc)]);
    if (outcome.left.length) {
      await client.query("DELETE FROM circle_members WHERE circle_id = $1 AND user_id = ANY($2::uuid[])", [before.id, outcome.left]);
    }
    for (const uid of outcome.joined) {
      const ins = await client.query(
        "INSERT INTO circle_members (user_id, circle_id, joined_at) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO NOTHING",
        [uid, before.id, new Date().toISOString()],
      );
      if (ins.rowCount !== 1) throw new CircleAbort("already_in_circle");
    }
  }

  async function circleIdOf(db: Pool | PoolClient, userId: string): Promise<string | null> {
    const { rows } = await db.query("SELECT circle_id FROM circle_members WHERE user_id = $1", [userId]);
    return rows[0]?.circle_id ?? null;
  }

  /** 「doc 的 kind 列表里有 userId」的包含查询参数（整份 doc 上的 @> 才用得上 GIN 索引）。 */
  const listed = (kind: "invites" | "applications" | "rejected", userId: string) => JSON.stringify({ [kind]: [{ userId }] });

  /** 锁住这几个账号行（FOR KEY SHARE，按编号）：注销拿着 FOR UPDATE 时在这里等，见文件头的加锁顺序。返回还在的编号。 */
  async function lockUsers(client: PoolClient, ids: string[]): Promise<Set<string>> {
    const { rows } = await client.query("SELECT id FROM users WHERE id = ANY($1::uuid[]) ORDER BY id FOR KEY SHARE", [[...new Set(ids)]]);
    return new Set(rows.map((r: { id: string }) => r.id));
  }

  async function requestsOf(userId: string, kind: "invites" | "applications"): Promise<CircleSummary[]> {
    const { rows } = await pool.query("SELECT doc FROM circles WHERE doc @> $1::jsonb ORDER BY created_at", [listed(kind, userId)]);
    return rows.map((r: { doc: unknown }) => normalizeCircleDoc(r.doc)).filter((d): d is CircleDoc => !!d).map(circleSummary);
  }

  /** 这些人刚加入 keepId（同一个事务里）：清掉他们在其他会的申请和收到的邀请，拒绝记录留着。锁按编号。 */
  async function txWithdrawElsewhere(client: PoolClient, userIds: string[], keepId: string) {
    for (const uid of userIds) {
      const { rows } = await client.query(
        "SELECT doc FROM circles WHERE id <> $1 AND (doc @> $2::jsonb OR doc @> $3::jsonb) ORDER BY id FOR UPDATE",
        [keepId, listed("applications", uid), listed("invites", uid)],
      );
      for (const r of rows) {
        const doc = normalizeCircleDoc(r.doc);
        const next = doc ? withdrawPending(doc, uid) : null;
        if (doc && next) await client.query("UPDATE circles SET doc = $2::jsonb WHERE id = $1", [doc.id, JSON.stringify(next)]);
      }
    }
  }

  const fail = (error: CircleError): CircleOutcome => ({ ok: false, error });
  /** 本进程上一次整体换周是哪一周（rollWeeks）。 */
  let rolledWeek: string | null = null;

  // 团榜：分数取 player_rankings（真人榜那张表，只有能上榜的人），没上榜的成员算 0
  const SCORES = `SELECT c.id, c.name, COALESCE(SUM(r.total_level), 0)::bigint AS score
                    FROM circles c JOIN circle_members m ON m.circle_id = c.id
                    LEFT JOIN player_rankings r ON r.user_id = m.user_id
                   GROUP BY c.id, c.name`;
  const boardCache = createRankCache({
    top: async (_board, limit) => {
      const { rows } = await pool.query(`${SCORES} ORDER BY score DESC, c.id LIMIT $1`, [limit]);
      return rows.map((r: { id: string; name: string; score: string }) => ({ userId: r.id, name: shownCircleName(r.name), score: Number(r.score) }));
    },
    countAbove: async (_board, score) => {
      const { rows } = await pool.query(`SELECT count(*) AS n FROM (${SCORES}) t WHERE t.score > $1`, [score]);
      return Number(rows[0]?.n ?? 0);
    },
  });

  return {
    circleIdOf: (userId: string) => circleIdOf(pool, userId),

    /** 注销（在 deleteAccount 的事务里）：成员、申请、邀请里删掉；会长转给最早加入的，没人就解散。返回提交后要发的通知。 */
    async txRemoveAccount(client: PoolClient, userId: string): Promise<Array<[CircleDoc, CircleOutcome]>> {
      const { rows } = await client.query(
        `SELECT doc FROM circles
          WHERE id IN (SELECT circle_id FROM circle_members WHERE user_id = $1)
             OR doc @> $2::jsonb OR doc @> $3::jsonb OR doc @> $4::jsonb
          ORDER BY id FOR UPDATE`,
        [userId, listed("applications", userId), listed("invites", userId), listed("rejected", userId)],
      );
      const done: Array<[CircleDoc, CircleOutcome]> = [];
      for (const r of rows) {
        const doc = normalizeCircleDoc(r.doc);
        if (!doc) continue;
        const outcome = removeAccountFromCircle(doc, userId);
        await txWrite(client, doc, outcome);
        done.push([doc, outcome]);
      }
      await client.query("DELETE FROM circle_members WHERE user_id = $1", [userId]);
      return done;
    },
    announceRemoved(done: Array<[CircleDoc, CircleOutcome]>) {
      for (const [doc, outcome] of done) announceCircleOutcome(deps.events, doc, outcome, "account_deleted");
      if (done.length) boardCache.clear();
    },

    /** 换周：所有会的成员起点重记成此刻库里的累计数。本进程这一周已经做过就直接返回（index.ts 每分钟调一次）。 */
    async rollWeeks(now: Date): Promise<number> {
      const week = circleWeekKey(now);
      if (rolledWeek === week) return 0;
      const { rows } = await pool.query("SELECT id FROM circles ORDER BY id");
      let n = 0;
      for (const { id } of rows as Array<{ id: string }>) {
        const changed = await deps.withTransaction(async (client) => {
          const locked = await client.query("SELECT doc FROM circles WHERE id = $1 FOR UPDATE", [id]);
          const doc = normalizeCircleDoc(locked.rows[0]?.doc);
          if (!doc) return false;
          const info = await profiles(client, doc.members.map((m) => m.userId));
          let dirty = false;
          for (const m of doc.members) dirty = rollWeek(m, info.get(m.userId)?.counters ?? { kills: 0, made: 0 }, now).changed || dirty;
          if (dirty) await client.query("UPDATE circles SET doc = $2::jsonb WHERE id = $1", [id, JSON.stringify(doc)]);
          return dirty;
        });
        if (changed) n++;
      }
      rolledWeek = week;
      return n;
    },

    methods: {
      async getCircleBoard({ userId, now }: { userId: string; now: Date }) {
        // 条件放 WHERE：HAVING 里带子查询时 PostgreSQL 不会把它下推，会先把所有会都聚合一遍
        const { rows } = await pool.query(
          `SELECT c.id, c.name, COALESCE(SUM(r.total_level), 0)::bigint AS score
             FROM circles c JOIN circle_members m ON m.circle_id = c.id
             LEFT JOIN player_rankings r ON r.user_id = m.user_id
            WHERE c.id = (SELECT circle_id FROM circle_members WHERE user_id = $1)
            GROUP BY c.id, c.name`,
          [userId],
        );
        const mine = rows[0] as { id: string; name: string; score: string } | undefined;
        const me = circleBoardMe(mine ? { id: mine.id, name: mine.name, score: Number(mine.score) } : null);
        return boardCache.view({ board: "total", userId: mine?.id ?? "", entry: me, now });
      },
      async getCircleHome({ userId, now }: { userId: string; now: Date }): Promise<CircleHome> {
        const [invites, applied] = [await requestsOf(userId, "invites"), await requestsOf(userId, "applications")];
        const home: CircleHome = { circle: null, invites, applied, createCost: CIRCLE_CREATE_COST };
        const mine = await pool.query("SELECT c.doc FROM circle_members m JOIN circles c ON c.id = m.circle_id WHERE m.user_id = $1", [userId]);
        let doc = normalizeCircleDoc(mine.rows[0]?.doc);
        if (!doc) return home;
        const ids = [...new Set([...doc.members, ...doc.applications, ...doc.invites].map((m) => m.userId))];
        const info = await profiles(pool, ids);
        const zero = { kills: 0, made: 0 };
        // 本周起点要重记：锁住这一行再算，免得盖掉同时发生的进出
        if (doc.members.some((m) => rollWeek({ ...m }, info.get(m.userId)?.counters ?? zero, now).changed)) {
          doc = await deps.withTransaction(async (client) => {
            const locked = await client.query("SELECT doc FROM circles WHERE id = $1 FOR UPDATE", [doc!.id]);
            const fresh = normalizeCircleDoc(locked.rows[0]?.doc);
            if (!fresh) return null;
            for (const m of fresh.members) rollWeek(m, info.get(m.userId)?.counters ?? zero, now);
            await client.query("UPDATE circles SET doc = $2::jsonb WHERE id = $1", [fresh.id, JSON.stringify(fresh)]);
            return fresh;
          });
          if (!doc || !doc.members.some((m) => m.userId === userId)) return home;
        }
        const isLeader = doc.leaderId === userId;
        const named = (r: { userId: string; at: string }) => ({ userId: r.userId, name: info.get(r.userId)?.name ?? shownName(r.userId, null), at: r.at });
        home.circle = {
          id: doc.id,
          name: shownCircleName(doc.name),
          memberCount: doc.members.length,
          max: CIRCLE_MAX_MEMBERS,
          isLeader,
          members: doc.members.map((m) => ({
            userId: m.userId,
            name: info.get(m.userId)?.name ?? shownName(m.userId, null),
            isLeader: m.userId === doc!.leaderId,
            online: deps.isOnline(m.userId),
            joinedAt: m.joinedAt,
            week: rollWeek({ ...m }, info.get(m.userId)?.counters ?? zero, now).week,
          })),
          applications: isLeader ? doc.applications.map(named) : [],
          invited: isLeader ? doc.invites.map(named) : [],
        };
        return home;
      },

      async searchCircles({ query, limit }: { query: string; limit: number }): Promise<CircleSummary[]> {
        const { rows } = await pool.query(
          "SELECT doc FROM circles WHERE position($1 in name_key) > 0 ORDER BY jsonb_array_length(doc->'members') DESC, created_at LIMIT $2",
          [circleNameKey(query), Math.min(limit, CIRCLE_SEARCH_LIMIT)],
        );
        return rows.map((r: { doc: unknown }) => normalizeCircleDoc(r.doc)).filter((d): d is CircleDoc => !!d).map(circleSummary);
      },

      async createCircle({ userId, name, now }: { userId: string; name: string; now: Date }): Promise<CircleOutcome> {
        if (!isAcceptableCircleName(name)) return fail("name_invalid");
        try {
          const outcome = await deps.withTransaction(async (client): Promise<CircleOutcome> => {
            // 先锁账号行再锁存档行（加锁顺序见文件头）：同一个人同时点两次建会，第二次等第一次提交后看到「已经在会里」
            if (!(await lockUsers(client, [userId])).has(userId)) return fail("user_not_found");
            const { state, contentVersion } = await deps.txLoadStateForUpdate(client, userId);
            if (await circleIdOf(client, userId)) return fail("already_in_circle");
            if ((state.inventory?.gold ?? 0) < CIRCLE_CREATE_COST) return fail("not_enough_gold");
            const doc = newCircleDoc({ id: randomUUID(), name, leaderId: userId, now, counters: circleCounters(state.stats) });
            const ins = await client.query(
              "INSERT INTO circles (id, name, name_key, doc, created_at) VALUES ($1, $2, $3, $4::jsonb, $5) ON CONFLICT (name_key) DO NOTHING",
              [doc.id, doc.name, doc.nameKey, JSON.stringify(doc), doc.createdAt],
            );
            if (ins.rowCount !== 1) return fail("name_taken");
            const mem = await client.query(
              "INSERT INTO circle_members (user_id, circle_id, joined_at) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO NOTHING",
              [userId, doc.id, doc.createdAt],
            );
            if (mem.rowCount !== 1) throw new CircleAbort("already_in_circle");
            await txWithdrawElsewhere(client, [userId], doc.id);
            state.inventory.gold -= CIRCLE_CREATE_COST;
            if (state.stats) state.stats.totalGoldSpent = (state.stats.totalGoldSpent ?? 0) + CIRCLE_CREATE_COST;
            await deps.txPersistState(client, userId, state, contentVersion);
            return { ok: true, doc, joined: [userId], left: [], changed: true };
          });
          if (outcome.ok && outcome.doc) {
            deps.events.setChannel(userId, outcome.doc.id);
            boardCache.clear();
          }
          return outcome;
        } catch (e) {
          if (e instanceof CircleAbort) return fail(e.code);
          throw e;
        }
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
        let before: CircleDoc | null = null;
        try {
          const outcome = await deps.withTransaction(async (client): Promise<CircleOutcome> => {
            const alive = await lockUsers(client, targetUserId ? [userId, targetUserId] : [userId]);
            if (!alive.has(userId)) return fail("user_not_found");
            const id = circleId ?? (await circleIdOf(client, userId));
            if (!id) return fail("not_in_circle");
            // 通过 / 接受：此人有申请、邀请的其他会加入后要清掉，连同这个会按编号一次锁上（见文件头）
            const joiner = action === "accept" ? userId : action === "approve" ? targetUserId : undefined;
            if (joiner) {
              const others = await client.query("SELECT id FROM circles WHERE doc @> $1::jsonb OR doc @> $2::jsonb", [
                listed("applications", joiner),
                listed("invites", joiner),
              ]);
              const ids = [id, ...others.rows.map((r: { id: string }) => r.id)];
              await client.query("SELECT id FROM circles WHERE id = ANY($1::uuid[]) ORDER BY id FOR UPDATE", [ids]);
            }
            const row = await client.query("SELECT doc FROM circles WHERE id = $1 FOR UPDATE", [id]);
            before = normalizeCircleDoc(row.rows[0]?.doc);
            if (!before) return fail("circle_not_found");
            if (targetUserId && action === "invite") {
              if (!alive.has(targetUserId)) return fail("user_not_found");
              // 对方屏蔽了会长：邀请送不到，回执和平常一样（与组队邀请一致）
              const blocked = await client.query("SELECT 1 FROM chat_blocks WHERE user_id = $1 AND blocked_user_id = $2", [targetUserId, userId]);
              if (blocked.rows[0] && before.leaderId === userId) return { ok: true, doc: before, joined: [], left: [], changed: false };
            }
            const ids = targetUserId ? [userId, targetUserId] : [userId];
            const where = await client.query("SELECT user_id, circle_id FROM circle_members WHERE user_id = ANY($1::uuid[])", [ids]);
            const circleOf = (uid: string) => where.rows.find((r: { user_id: string }) => r.user_id === uid)?.circle_id ?? null;
            const info = await profiles(client, ids);
            const outcome = applyCircleAction(before, {
              action,
              actorId: userId,
              targetId: targetUserId,
              now,
              actorCircle: circleOf(userId),
              targetCircle: targetUserId ? circleOf(targetUserId) : null,
              actorCounters: info.get(userId)?.counters,
              targetCounters: targetUserId ? info.get(targetUserId)?.counters : undefined,
            });
            await txWrite(client, before, outcome);
            if (outcome.ok && outcome.joined.length) await txWithdrawElsewhere(client, outcome.joined, before.id);
            return outcome;
          });
          if (before) announceCircleOutcome(deps.events, before, outcome, action, userId);
          if (outcome.ok && (outcome.doc === null || outcome.joined.length || outcome.left.length)) boardCache.clear();
          return outcome;
        } catch (e) {
          if (e instanceof CircleAbort) return fail(e.code);
          throw e;
        }
      },
    },
  };
}
