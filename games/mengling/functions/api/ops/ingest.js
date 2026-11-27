import { dbRun, getDb, handleOptions, json, nowMs, readJson } from "../_db.js";
import { checkRateLimit, ipLimitKey, pruneIpKeys } from "../_rate_limit.js";
import { normalizeEvents } from "../_retention.js";

const RL_PREFIX = "ops/ingest:ip:";

/** 匿名统计入口：不认登录态，不写账号 */
export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return json({ error: "method not allowed" }, { status: 405, req });

  const body = await readJson(req);
  const now = nowMs();
  const { events, received } = normalizeEvents(body, now);
  if (received === 0) return json({ ok: false, error: "no events" }, { status: 400, req });

  const db = getDb(context.env);
  const rl = await checkRateLimit(db, await ipLimitKey(RL_PREFIX, req, { now }), { limit: 60, windowSec: 60 });
  if (!rl.ok) {
    return json({ error: "rate limit exceeded", retryAfterSec: rl.retryAfterSec }, { status: 429, req });
  }
  await pruneIpKeys(db, now);

  for (const e of events) {
    await dbRun(
      db,
      "INSERT INTO analytics_events(ts, event, uid, session_id, props_json, created_at) VALUES(?, ?, NULL, ?, ?, ?)",
      [e.ts, e.event, e.sessionId || null, JSON.stringify(e.props), now]
    );
  }

  // 旧客户端的已停收事件照样回 ok，免得它一直重发
  return json({ ok: true, accepted: events.length }, { req });
}
