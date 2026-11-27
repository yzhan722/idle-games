import { requireUser } from "../_auth.js";
import { dbAll, dbFirst, getDb, handleOptions, json, readJson } from "../_db.js";
import { checkRateLimit } from "../_rate_limit.js";
import { BLOCK_LIMIT, lacksSafetyTable, setBlocked } from "../_social_safety.js";
import { clampUid } from "../_uid.js";
import { displayName } from "../../../modules/name_filter.js";

/**
 * 屏蔽名单（ML-COM3）。GET：我屏蔽了谁；POST { targetUid, block }：屏蔽（默认）或解除。
 * 对方不会收到任何通知，见 _social_safety.js。
 */
export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;

  const db = getDb(context.env);
  const user = await requireUser(db, req);
  if (!user) return json({ error: "unauthorized" }, { status: 401, req });
  const uid = user.uid;

  try {
    if (req.method === "GET") {
      const rows = await dbAll(
        db,
        `SELECT b.blocked_uid, b.created_at, u.username, s.name
         FROM user_blocks b
         LEFT JOIN users u ON u.uid = b.blocked_uid
         LEFT JOIN scores s ON s.uid = b.blocked_uid
         WHERE b.uid = ?
         ORDER BY b.created_at DESC
         LIMIT ?`,
        [uid, BLOCK_LIMIT]
      );
      return json(
        {
          blocks: rows.map((r) => ({
            uid: r.blocked_uid,
            name: displayName(r.username || r.name || String(r.blocked_uid || "").slice(0, 8)),
            created_at: Number(r.created_at) || 0,
          })),
        },
        { req }
      );
    }

    if (req.method === "POST") {
      const body = await readJson(req);
      const target = clampUid(body?.targetUid);
      const on = body?.block !== false;
      if (!target) return json({ error: "bad request" }, { status: 400, req });
      if (target === uid) return json({ error: "cannot block self" }, { status: 400, req });
      const rl = await checkRateLimit(db, `social/block:${uid}`, { limit: 30, windowSec: 60 });
      if (!rl.ok) return json({ error: "rate limit exceeded", retryAfterSec: rl.retryAfterSec }, { status: 429, req });
      if (on) {
        const exists = await dbFirst(db, "SELECT uid FROM users WHERE uid = ?", [target]);
        if (!exists) return json({ error: "user not found" }, { status: 404, req });
      }
      const res = await setBlocked(db, uid, target, on);
      if (!res.ok) return json({ error: res.error }, { status: 409, req });
      return json({ ok: true, blocked: on }, { req });
    }
  } catch (e) {
    if (lacksSafetyTable(e)) return json({ error: "not ready" }, { status: 503, req });
    throw e;
  }

  return json({ error: "method not allowed" }, { status: 405, req });
}
