// D1-backed fixed-window rate limiter (one row per key)
import { dbFirst, dbRun, nowMs } from "./_db.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/** IPv6 一户通常分到整段 /64，逐个地址计数等于不限：取前四组；IPv4（含映射写法）原样 */
export function ipGroup(ip) {
  const s = String(ip).toLowerCase();
  if (!s.includes(":") || s.includes(".")) return s.replace(/^::ffff:/, "");
  const [head, tail] = s.split("%")[0].split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const gap = tail === undefined ? 0 : Math.max(0, 8 - left.length - right.length);
  const groups = [...left, ...Array(gap).fill("0"), ...right].slice(0, 4).map((g) => g.replace(/^0+(?=.)/, ""));
  return `${groups.join(":")}::/64`;
}

/** 没跑 2026-07-12-rate-limits.sql 的库：没有这张表，放行（不因为少一张计数表就登录不了） */
const lacksTable = (e) => /no such table: \S*rate_limits/i.test(String(e?.message || e));

function clientIp(req) {
  const cf = req.headers.get("CF-Connecting-IP");
  if (cf) return ipGroup(cf.slice(0, 64));
  const xff = req.headers.get("X-Forwarded-For");
  if (xff) return ipGroup(xff.split(",")[0].trim().slice(0, 64));
  return "unknown";
}

/** IP 只用来限流：按天加盐取哈希，不存原文；salt 可再混入用户名等，同样不存原文 */
export async function ipLimitKey(prefix, req, { salt = "", now = nowMs() } = {}) {
  const day = new Date(now).toISOString().slice(0, 10);
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${day}|${clientIp(req)}${salt ? `|${salt}` : ""}`));
  const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${prefix}${hex.slice(0, 24)}`;
}

/** 带 IP 哈希的键按天换，旧键顺手清掉（约 2% 的请求触发） */
export async function pruneIpKeys(db, now = nowMs()) {
  if (Math.random() >= 0.02) return;
  try {
    await dbRun(db, "DELETE FROM rate_limits WHERE key LIKE '%:ip:%' AND window_start < ?", [now - DAY_MS]);
  } catch (e) {
    if (!lacksTable(e)) throw e;
  }
}

/** 一条语句里计数并取回：并发请求不会都读到旧计数而一起放行 */
export async function checkRateLimit(db, key, { limit, windowSec }) {
  const now = nowMs();
  const windowMs = windowSec * 1000;
  let row;
  try {
    row = await dbFirst(
      db,
      `INSERT INTO rate_limits(key, count, window_start) VALUES(?, 1, ?)
       ON CONFLICT(key) DO UPDATE SET
         count = CASE WHEN excluded.window_start - rate_limits.window_start >= ? THEN 1 ELSE rate_limits.count + 1 END,
         window_start = CASE WHEN excluded.window_start - rate_limits.window_start >= ? THEN excluded.window_start ELSE rate_limits.window_start END
       RETURNING count, window_start`,
      [key, now, windowMs, windowMs]
    );
  } catch (e) {
    if (!lacksTable(e)) throw e;
    console.error("rate_limits table missing, not limiting");
    return { ok: true, retryAfterSec: 0 };
  }
  if ((Number(row?.count) || 0) <= limit) return { ok: true, retryAfterSec: 0 };
  return { ok: false, retryAfterSec: Math.max(1, Math.ceil((Number(row.window_start) + windowMs - now) / 1000)) };
}
