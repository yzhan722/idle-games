// Account deletion helpers: every table that holds a user's rows, one atomic batch
import { dbFirst, nowMs } from "./_db.js";
import { lacksSafetyTable } from "./_social_safety.js";
import { clampStr } from "./_uid.js";

/** 客户端生成的注销请求号：重试同一请求号直接返回已完成（幂等） */
export function clampRequestId(v) {
  const s = clampStr(v, 64);
  return /^[a-zA-Z0-9-]{16,64}$/.test(s) ? s : null;
}

/** 二次确认：密码之外还要原样输入用户名 */
export function isDeleteConfirmed(body, username) {
  return typeof body?.confirm === "string" && body.confirm.trim() === username;
}

/**
 * 按顺序执行的删除清单。iap_orders 不在内：当前没有支付代码写入，
 * 真开支付后交易记录的保留期要按当地法规另定。
 */
export function accountDeleteStatements(user) {
  const { id, uid } = user;
  return [
    // 先把本人点过的赞从别人的分享里扣掉，再删点赞记录
    [
      "UPDATE achievement_shares SET likes = MAX(0, likes - 1) WHERE id IN (SELECT achievement_id FROM achievement_likes WHERE uid = ?)",
      [uid],
    ],
    ["DELETE FROM achievement_likes WHERE uid = ?", [uid]],
    ["DELETE FROM achievement_likes WHERE achievement_id IN (SELECT id FROM achievement_shares WHERE uid = ?)", [uid]],
    ["DELETE FROM achievement_shares WHERE uid = ?", [uid]],
    ["DELETE FROM pvp_battles WHERE player1_uid = ? OR player2_uid = ?", [uid, uid]],
    ["DELETE FROM pvp_invites WHERE from_uid = ? OR to_uid = ?", [uid, uid]],
    ["DELETE FROM friend_messages WHERE from_uid = ? OR to_uid = ?", [uid, uid]],
    ["DELETE FROM gift_history WHERE from_uid = ? OR to_uid = ?", [uid, uid]],
    ["DELETE FROM friend_requests WHERE from_uid = ? OR to_uid = ?", [uid, uid]],
    ["DELETE FROM friends WHERE uid1 = ? OR uid2 = ?", [uid, uid]],
    // ML-COM3：屏蔽名单（双向）、自己的私信设置、自己提交的和针对自己的举报（快照里有对方发给举报人的私信）
    ["DELETE FROM user_blocks WHERE uid = ? OR blocked_uid = ?", [uid, uid]],
    ["DELETE FROM social_prefs WHERE uid = ?", [uid]],
    ["DELETE FROM user_reports WHERE reporter_uid = ? OR target_uid = ?", [uid, uid]],
    ["DELETE FROM daily_tasks_progress WHERE uid = ?", [uid]],
    ["DELETE FROM server_boss_claims WHERE uid = ?", [uid]],
    ["DELETE FROM server_buff_contrib WHERE uid = ?", [uid]],
    ["DELETE FROM events WHERE uid = ?", [uid]],
    ["DELETE FROM scores WHERE uid = ?", [uid]],
    ["DELETE FROM analytics_events WHERE uid = ?", [uid]],
    ["DELETE FROM rate_limits WHERE substr(key, -length(?)) = ?", [`:${uid}`, `:${uid}`]],
    ["DELETE FROM saves WHERE user_id = ?", [id]],
    ["DELETE FROM sessions WHERE user_id = ?", [id]],
    ["DELETE FROM users WHERE id = ?", [id]],
  ];
}

export async function isDeletionDone(db, requestId) {
  if (!requestId) return false;
  const row = await dbFirst(db, "SELECT request_id FROM account_deletions WHERE request_id = ?", [requestId]);
  return Boolean(row);
}

/** 2026-11-27-social-safety.sql 建的三张表：迁移没跑时不存在，里面也就没有这个人的数据 */
const SAFETY_TABLES = /\b(user_blocks|social_prefs|user_reports)\b/;

/** 一个 batch 内全部删完并记下请求号；任何一条失败整批回滚（D1 batch 是事务） */
export async function deleteAccount(db, user, requestId) {
  const list = accountDeleteStatements(user).concat([
    ["INSERT OR IGNORE INTO account_deletions(request_id, deleted_at) VALUES(?, ?)", [requestId, nowMs()]],
  ]);
  const run = (items) => db.batch(items.map(([sql, binds]) => db.prepare(sql).bind(...binds)));
  try {
    await run(list);
  } catch (e) {
    // 整批已回滚；只因为少了这三张表时，去掉它们再删一次
    if (!lacksSafetyTable(e)) throw e;
    await run(list.filter(([sql]) => !SAFETY_TABLES.test(sql)));
  }
}
