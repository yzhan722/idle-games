import { requireUser } from "../_auth.js";
import { dbFirst, dbRun, getDb, handleOptions, json, nowMs, readJson } from "../_db.js";
import { checkRateLimit } from "../_rate_limit.js";
import { isBlocked } from "../_social_safety.js";
import { clampStr } from "../_uid.js";

export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return json({ error: "method not allowed" }, { status: 405, req });

  const db = getDb(context.env);
  const user = await requireUser(db, req);
  if (!user) return json({ error: "unauthorized" }, { status: 401, req });
  const fromUid = user.uid;

  const body = await readJson(req);
  const toUsername = clampStr(body?.toUsername, 32);
  if (!toUsername) return json({ error: "bad request" }, { status: 400, req });
  // 一分钟 10 次、一天 60 次（含用户名不存在的试探）
  for (const [key, limit, windowSec] of [[`friends/request:${fromUid}`, 10, 60], [`friends/request/day:${fromUid}`, 60, 86400]]) {
    const rl = await checkRateLimit(db, key, { limit, windowSec });
    if (!rl.ok) return json({ error: "rate limit exceeded", retryAfterSec: rl.retryAfterSec }, { status: 429, req });
  }

  let toUser = await dbFirst(db, "SELECT uid, username FROM users WHERE username = ?", [toUsername]);
  if (!toUser) {
    const byScore = await dbFirst(db, "SELECT uid, name AS username FROM scores WHERE name = ?", [toUsername]);
    if (byScore) toUser = { uid: byScore.uid, username: byScore.username };
  }
  if (!toUser?.uid) return json({ error: "user not found" }, { req });
  if (toUser.uid === fromUid) return json({ error: "cannot friend self" }, { req });
  if (await isBlocked(db, fromUid, toUser.uid)) return json({ error: "you blocked this player" }, { req });

  const already = await dbFirst(
    db,
    `SELECT id FROM friends WHERE (uid1 = ? AND uid2 = ?) OR (uid1 = ? AND uid2 = ?)`,
    [fromUid, toUser.uid, toUser.uid, fromUid]
  );
  if (already) return json({ error: "already friends" }, { req });

  const pending = await dbFirst(
    db,
    `SELECT id FROM friend_requests WHERE from_uid = ? AND to_uid = ? AND status IN ('pending', 'muted')`,
    [fromUid, toUser.uid]
  );
  if (pending) return json({ error: "request pending" }, { req });

  // 对方屏蔽了你：照常回成功，存成 muted（对方看不到，你再发也是「已在等待」，和正常一样）
  const status = (await isBlocked(db, toUser.uid, fromUid)) ? "muted" : "pending";
  await dbRun(
    db,
    "INSERT INTO friend_requests(from_uid, to_uid, status, created_at) VALUES(?, ?, ?, ?)",
    [fromUid, toUser.uid, status, nowMs()]
  );
  return json({ success: true }, { req });
}
