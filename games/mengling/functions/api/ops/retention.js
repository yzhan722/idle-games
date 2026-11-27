import { getDb, handleOptions, json } from "../_db.js";
import { checkRateLimit, ipLimitKey } from "../_rate_limit.js";
import { clampDays, queryRetention } from "../_retention.js";

/** 逐字节比到底，不因前缀相同提前返回 */
export function sameKey(a, b) {
  const x = new TextEncoder().encode(String(a || ""));
  const y = new TextEncoder().encode(String(b || ""));
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i % (x.length || 1)] ?? 0) ^ (y[i % (y.length || 1)] ?? 0);
  return diff === 0 && x.length > 0;
}

/** 留存聚合（只读）：GET /api/ops/retention?days=30，头 X-Ops-Key = 环境变量 OPS_ADMIN_KEY */
export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "GET") return json({ error: "method not allowed" }, { status: 405, req });

  const secret = context.env?.OPS_ADMIN_KEY;
  if (typeof secret !== "string" || secret.length < 16) {
    return json({ ok: false, error: "admin_key_unconfigured" }, { status: 501, req });
  }

  const db = getDb(context.env);
  const rl = await checkRateLimit(db, await ipLimitKey("ops/retention:ip:", req), { limit: 30, windowSec: 60 });
  if (!rl.ok) {
    return json({ error: "rate limit exceeded", retryAfterSec: rl.retryAfterSec }, { status: 429, req });
  }
  if (!sameKey(req.headers.get("X-Ops-Key"), secret)) return json({ error: "unauthorized" }, { status: 401, req });

  const days = clampDays(new URL(req.url).searchParams.get("days"));
  return json({ ok: true, ...(await queryRetention(db, { days })) }, { req });
}
