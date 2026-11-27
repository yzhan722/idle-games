import { requireUser, revokeAllSessions } from "../_auth.js";
import { getDb, handleOptions, json } from "../_db.js";
import { checkRateLimit } from "../_rate_limit.js";

/** 退出所有设备（含这一台）：之前签发的令牌全部失效 */
export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return json({ error: "method not allowed" }, { status: 405, req });

  const db = getDb(context.env);
  const user = await requireUser(db, req);
  if (!user) return json({ error: "unauthorized" }, { status: 401, req });

  const rl = await checkRateLimit(db, `auth/logout-all:${user.uid}`, { limit: 5, windowSec: 600 });
  if (!rl.ok) {
    return json({ error: "rate limit exceeded", retryAfterSec: rl.retryAfterSec }, { status: 429, req });
  }

  await revokeAllSessions(db, user.id);
  return json({ ok: true }, { req });
}
