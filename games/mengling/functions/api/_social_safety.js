// 玩家交流管控（ML-COM3）：屏蔽、只收好友私信、举报与到期清理。
// 被屏蔽的一方不会察觉：发给屏蔽者的私信照常回 ok 但不存；好友申请、切磋邀请照常回 ok，存成 muted（屏蔽者看不到，对方自己的「已发出」照常显示）。
// 迁移 scripts/migrations/2026-11-27-social-safety.sql 没跑之前：屏蔽名单当作空、私信按默认「只收好友」，
// 屏蔽 / 设置 / 举报接口回 503，别的社交接口不受影响。
import { dbAll, dbFirst, dbRun, nowMs } from "./_db.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/** 每人最多屏蔽多少人 */
export const BLOCK_LIMIT = 200;
/** 举报原因：键存库，文字给管理员看 */
export const REPORT_REASONS = Object.freeze({
  abuse: "辱骂骚扰",
  sexual: "色情低俗",
  hate: "仇恨歧视",
  impersonation: "冒充官方",
  spam: "广告刷屏",
  other: "其他",
});
/** 举报（含快照）从提交起保存多少天，到期不论处理没处理都删 */
export const REPORT_RETENTION_DAYS = 90;
/** 快照里最多几条对方发给举报人的私信 */
export const REPORT_SNAPSHOT_MESSAGES = 5;
/** 同一人对同一人 24 小时内未处理的举报只记一次 */
export const REPORT_DEDUP_MS = DAY_MS;

/** 真 D1 报的是「D1_ERROR: no such table: user_blocks: SQLITE_ERROR」，旧运行时把原文放在 cause 里：两处都看 */
export const lacksSafetyTable = (e) =>
  [e?.message, e?.cause?.message, e].some((m) => m != null && /no such table: \S*(user_blocks|user_reports|social_prefs)/i.test(String(m)));

async function soft(fn, fallback) {
  try {
    return await fn();
  } catch (e) {
    if (!lacksSafetyTable(e)) throw e;
    return fallback;
  }
}

export async function areFriends(db, a, b) {
  const row = await dbFirst(db, "SELECT id FROM friends WHERE (uid1 = ? AND uid2 = ?) OR (uid1 = ? AND uid2 = ?)", [a, b, b, a]);
  return Boolean(row);
}

/** uid 屏蔽了谁（Set）；没建表时为空 */
export async function blockedUids(db, uid) {
  const rows = await soft(() => dbAll(db, "SELECT blocked_uid FROM user_blocks WHERE uid = ? LIMIT ?", [uid, BLOCK_LIMIT]), []);
  return new Set(rows.map((r) => r.blocked_uid));
}

// 列表查询在 SQL 里就去掉 viewer 屏蔽的人，再 LIMIT（先取 N 条再在 JS 里滤，被屏蔽的人刷满 N 条就把别人的全挤掉）。
// sql 里写占位 /*notBlocked*/，before / after 是占位前后的参数。没建表时去掉这段照常查。
export async function allExceptBlocked(db, sql, { viewer, column, before = [], after = [] }) {
  const filter = `AND ${column} NOT IN (SELECT blocked_uid FROM user_blocks WHERE uid = ?)`;
  try {
    return await dbAll(db, sql.replace("/*notBlocked*/", filter), [...before, viewer, ...after]);
  } catch (e) {
    if (!lacksSafetyTable(e)) throw e;
    return dbAll(db, sql.replace("/*notBlocked*/", ""), [...before, ...after]);
  }
}

/** blocker 是否屏蔽了 target */
export async function isBlocked(db, blocker, target) {
  const row = await soft(() => dbFirst(db, "SELECT 1 AS x FROM user_blocks WHERE uid = ? AND blocked_uid = ?", [blocker, target]), null);
  return Boolean(row);
}

/** 屏蔽 / 解除。解除时把对方被压下的好友申请、切磋邀请作废（不会一下子冒出来），之后对方可以重新申请 */
export async function setBlocked(db, uid, target, on, now = nowMs()) {
  if (!on) {
    await dbRun(db, "DELETE FROM user_blocks WHERE uid = ? AND blocked_uid = ?", [uid, target]);
    await dbRun(db, "UPDATE friend_requests SET status = 'dropped' WHERE from_uid = ? AND to_uid = ? AND status = 'muted'", [target, uid]);
    await dbRun(db, "UPDATE pvp_invites SET status = 'dropped' WHERE from_uid = ? AND to_uid = ? AND status = 'muted'", [target, uid]);
    return { ok: true };
  }
  if (await isBlocked(db, uid, target)) return { ok: true };
  const n = await dbFirst(db, "SELECT COUNT(*) AS n FROM user_blocks WHERE uid = ?", [uid]);
  if (Number(n?.n) >= BLOCK_LIMIT) return { ok: false, error: "block list full" };
  await dbRun(db, "INSERT OR IGNORE INTO user_blocks(uid, blocked_uid, created_at) VALUES(?, ?, ?)", [uid, target, now]);
  return { ok: true };
}

/** 只收好友私信：没有设置行时默认开 */
export async function dmFriendsOnly(db, uid) {
  const row = await soft(() => dbFirst(db, "SELECT dm_friends_only FROM social_prefs WHERE uid = ?", [uid]), null);
  return row ? Number(row.dm_friends_only) !== 0 : true;
}

export async function setDmFriendsOnly(db, uid, on, now = nowMs()) {
  await dbRun(
    db,
    `INSERT INTO social_prefs(uid, dm_friends_only, updated_at) VALUES(?, ?, ?)
     ON CONFLICT(uid) DO UPDATE SET dm_friends_only = excluded.dm_friends_only, updated_at = excluded.updated_at`,
    [uid, on ? 1 : 0, now]
  );
}

/** 到期的举报整行删掉（含快照）；返回删了几条 */
export async function pruneExpiredReports(db, now = nowMs()) {
  const res = await soft(() => dbRun(db, "DELETE FROM user_reports WHERE created_at < ?", [now - REPORT_RETENTION_DAYS * DAY_MS]), null);
  return Number(res?.meta?.changes) || 0;
}

/** 别的接口顺手清：约 2% 的请求触发，失败不影响本次请求 */
export async function maybePruneReports(db, now = nowMs(), roll = Math.random()) {
  if (roll >= 0.02) return 0;
  try {
    return await pruneExpiredReports(db, now);
  } catch {
    return 0;
  }
}

/** 快照由服务器自己截，不信客户端：对方当时的昵称、用户名，发给举报人的最近几条私信（原文，给人工看） */
export async function reportSnapshot(db, reporter, target) {
  const user = await dbFirst(db, "SELECT username FROM users WHERE uid = ?", [target]);
  const score = await dbFirst(db, "SELECT name FROM scores WHERE uid = ?", [target]);
  const messages = await dbAll(
    db,
    "SELECT id, message, created_at FROM friend_messages WHERE from_uid = ? AND to_uid = ? ORDER BY created_at DESC, id DESC LIMIT ?",
    [target, reporter, REPORT_SNAPSHOT_MESSAGES]
  );
  return {
    username: user?.username || "",
    nickname: score?.name || "",
    messages: messages.map((m) => ({ id: Number(m.id), message: String(m.message || ""), created_at: Number(m.created_at) || 0 })),
  };
}

/** 去重：24 小时内同一人对同一人还没处理的举报 */
export async function hasRecentReport(db, reporter, target, now = nowMs()) {
  const row = await dbFirst(
    db,
    "SELECT id FROM user_reports WHERE reporter_uid = ? AND target_uid = ? AND status = 'open' AND created_at >= ? LIMIT 1",
    [reporter, target, now - REPORT_DEDUP_MS]
  );
  return Boolean(row);
}

export async function insertReport(db, { reporter, target, reason, snapshot, now = nowMs() }) {
  await dbRun(
    db,
    "INSERT INTO user_reports(reporter_uid, target_uid, reason, snapshot_json, status, created_at) VALUES(?, ?, ?, ?, 'open', ?)",
    [reporter, target, reason, JSON.stringify(snapshot), now]
  );
}
