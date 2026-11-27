import { requireUser } from "../_auth.js";
import { dbFirst, dbRun, getDb, handleOptions, json, nowMs, readJson } from "../_db.js";
import { checkRateLimit } from "../_rate_limit.js";
import { displayName } from "../../../modules/name_filter.js";
import { allExceptBlocked, areFriends, dmFriendsOnly, isBlocked, maybePruneReports } from "../_social_safety.js";
import { clampStr, clampUid, intOr } from "../_uid.js";

export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;

  const db = getDb(context.env);
  const user = await requireUser(db, req);
  if (!user) return json({ error: "unauthorized" }, { status: 401, req });
  const uid = user.uid;

  if (req.method === "GET") {
    // 屏蔽的人发来的（含屏蔽之前收到的）在 SQL 里就去掉，再取最近 100 封
    const rows = await allExceptBlocked(
      db,
      `SELECT m.id, m.from_uid, m.message, m.read, m.created_at,
              u.username AS from_name, s.name AS score_name
       FROM friend_messages m
       LEFT JOIN users u ON u.uid = m.from_uid
       LEFT JOIN scores s ON s.uid = m.from_uid
       WHERE m.to_uid = ? /*notBlocked*/
       ORDER BY m.created_at DESC
       LIMIT 100`,
      { viewer: uid, column: "m.from_uid", before: [uid] }
    );
    await maybePruneReports(db);
    return json(
      {
        messages: rows.map((m) => ({
          id: Number(m.id),
          from_uid: m.from_uid,
          from_name: displayName(m.from_name || m.score_name || m.from_uid),
          message: m.message,
          read: Number(m.read) || 0,
          created_at: Number(m.created_at) || 0,
        })),
      },
      { req }
    );
  }

  if (req.method === "POST") {
    const body = await readJson(req);
    const toUid = clampUid(body?.toUid);
    const message = clampStr(body?.message, 500);
    if (!toUid) return json({ error: "bad request" }, { status: 400, req });
    if (!message) return json({ error: "empty message" }, { status: 400, req });
    // 一分钟 20 条、一天 300 条；键以 :uid 结尾，注销时一并清掉
    for (const [key, limit, windowSec] of [[`social/message:${uid}`, 20, 60], [`social/message/day:${uid}`, 300, 86400]]) {
      const rl = await checkRateLimit(db, key, { limit, windowSec });
      if (!rl.ok) return json({ error: "rate limit exceeded", retryAfterSec: rl.retryAfterSec }, { status: 429, req });
    }
    // 对方已注销（或编号是编的）就不留信
    const target = await dbFirst(db, "SELECT uid FROM users WHERE uid = ?", [toUid]);
    if (!target) return json({ error: "user not found" }, { status: 404, req });
    // 0.7.58 及更早的客户端不带 explain，见到 403 一律提示「请重新登录」：给它们照常回 ok、不存（与被屏蔽时一样无感）。
    // 新客户端带 explain: true，照旧拿到 403 和原因。
    const refuse = (error) => (body?.explain === true ? json({ error }, { status: 403, req }) : json({ ok: true }, { req }));
    if (await isBlocked(db, uid, toUid)) return refuse("you blocked this player");
    // 对方默认只收好友私信（设置里可关）
    if (!(await areFriends(db, uid, toUid)) && (await dmFriendsOnly(db, toUid))) return refuse("friends only");
    // 对方屏蔽了你：照常回 ok，不存（与正常发送的回应一模一样）
    if (await isBlocked(db, toUid, uid)) return json({ ok: true }, { req });
    await dbRun(
      db,
      "INSERT INTO friend_messages(from_uid, to_uid, message, read, created_at) VALUES(?, ?, ?, 0, ?)",
      [uid, toUid, message, nowMs()]
    );
    return json({ ok: true }, { req });
  }

  if (req.method === "PUT") {
    const body = await readJson(req);
    const messageId = intOr(body?.messageId, 0);
    if (!messageId) return json({ error: "bad request" }, { req });
    const rl = await checkRateLimit(db, `social/message-read:${uid}`, { limit: 120, windowSec: 60 });
    if (!rl.ok) return json({ error: "rate limit exceeded", retryAfterSec: rl.retryAfterSec }, { status: 429, req });
    await dbRun(db, "UPDATE friend_messages SET read = 1 WHERE id = ? AND to_uid = ?", [messageId, uid]);
    return json({ ok: true }, { req });
  }

  return json({ error: "method not allowed" }, { status: 405, req });
}
