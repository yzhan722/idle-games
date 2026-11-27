import { requireUser } from "../_auth.js";
import { getDb, handleOptions, json, readJson } from "../_db.js";
import { checkRateLimit } from "../_rate_limit.js";
import { dmFriendsOnly, lacksSafetyTable, setDmFriendsOnly } from "../_social_safety.js";

/** 私信设置（ML-COM3）。GET → { dmFriendsOnly }；PUT { dmFriendsOnly: true / false }。默认只收好友私信。 */
export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;

  const db = getDb(context.env);
  const user = await requireUser(db, req);
  if (!user) return json({ error: "unauthorized" }, { status: 401, req });
  const uid = user.uid;

  if (req.method === "GET") return json({ dmFriendsOnly: await dmFriendsOnly(db, uid) }, { req });

  if (req.method === "PUT") {
    const body = await readJson(req);
    if (typeof body?.dmFriendsOnly !== "boolean") return json({ error: "bad request" }, { status: 400, req });
    const rl = await checkRateLimit(db, `social/prefs:${uid}`, { limit: 20, windowSec: 60 });
    if (!rl.ok) return json({ error: "rate limit exceeded", retryAfterSec: rl.retryAfterSec }, { status: 429, req });
    try {
      await setDmFriendsOnly(db, uid, body.dmFriendsOnly);
    } catch (e) {
      if (lacksSafetyTable(e)) return json({ error: "not ready" }, { status: 503, req });
      throw e;
    }
    return json({ ok: true, dmFriendsOnly: body.dmFriendsOnly }, { req });
  }

  return json({ error: "method not allowed" }, { status: 405, req });
}
