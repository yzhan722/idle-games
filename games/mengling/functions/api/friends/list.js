import { requireUser } from "../_auth.js";
import { dbAll, dbFirst, getDb, handleOptions, json } from "../_db.js";
import { displayName } from "../../../modules/name_filter.js";
import { allExceptBlocked, blockedUids } from "../_social_safety.js";

export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "GET") return json({ error: "method not allowed" }, { status: 405, req });

  const db = getDb(context.env);
  const user = await requireUser(db, req);
  if (!user) return json({ error: "unauthorized" }, { status: 401, req });
  const uid = user.uid;
  const friendRows = await dbAll(
    db,
    `SELECT CASE WHEN uid1 = ? THEN uid2 ELSE uid1 END AS friend_uid
     FROM friends WHERE uid1 = ? OR uid2 = ?`,
    [uid, uid, uid]
  );

  const blocked = await blockedUids(db, uid);
  const friends = [];
  for (const fr of friendRows) {
    const fuid = fr.friend_uid;
    const user = await dbFirst(db, "SELECT username FROM users WHERE uid = ?", [fuid]);
    const score = await dbFirst(db, "SELECT name FROM scores WHERE uid = ?", [fuid]);
    friends.push({
      uid: fuid,
      username: displayName(user?.username || score?.name || fuid.slice(0, 8)),
      blocked: blocked.has(fuid),
    });
  }

  // 屏蔽之前收到的申请也不再显示：在 SQL 里先去掉再取 50 条
  const pending = await allExceptBlocked(
    db,
    `SELECT r.id, r.from_uid, u.username, s.name
     FROM friend_requests r
     LEFT JOIN users u ON u.uid = r.from_uid
     LEFT JOIN scores s ON s.uid = r.from_uid
     WHERE r.to_uid = ? AND r.status = 'pending' /*notBlocked*/
     ORDER BY r.created_at DESC
     LIMIT 50`,
    { viewer: uid, column: "r.from_uid", before: [uid] }
  );

  return json(
    {
      friends,
      pendingRequests: pending.map((p) => ({
        id: Number(p.id),
        uid: p.from_uid,
        username: displayName(p.username || p.name || p.from_uid?.slice?.(0, 8) || "?"),
      })),
    },
    { req }
  );
}
