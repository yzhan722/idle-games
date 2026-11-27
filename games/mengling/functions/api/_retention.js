// Anonymous retention events: whitelist + aggregate queries over analytics_events
import { dbAll } from "./_db.js";
import { clampStr, intOr } from "./_uid.js";

const MAX_EVENTS = 50;
const DAY_MS = 24 * 60 * 60 * 1000;

// 与 modules/analytics.js 的 FUNNEL_EVENTS / SESSION_BUCKETS_MIN 保持一致（analytics-selfcheck 会核对）
export const ALLOWED_EVENTS = new Set([
  "session_start",
  "register",
  "first_battle",
  "first_capture",
  "first_rebirth",
  "return_d1",
  "return_d7",
  "session_time",
]);
export const SESSION_BUCKETS_MIN = [1, 5, 15, 30, 60];

function cleanProps(item) {
  const p = item?.props && typeof item.props === "object" && !Array.isArray(item.props) ? item.props : {};
  const out = {};
  if (p.cohort === "legacy" || (typeof p.cohort === "string" && /^\d{4}-\d{2}-\d{2}$/.test(p.cohort))) out.cohort = p.cohort;
  if (typeof p.new === "boolean") out.new = p.new;
  if (SESSION_BUCKETS_MIN.includes(p.bucket)) out.bucket = p.bucket;
  const v = clampStr(item?.gameVersion, 32);
  if (/^[0-9A-Za-z.-]+$/.test(v)) out.gameVersion = v;
  return out;
}

/** 只留白名单事件和属性；received = 请求里带了多少条（用来区分空请求和旧事件） */
export function normalizeEvents(body, now) {
  const raw = Array.isArray(body?.events) ? body.events : [];
  const events = [];
  for (const item of raw.slice(0, MAX_EVENTS)) {
    const event = clampStr(item?.event, 64);
    if (!ALLOWED_EVENTS.has(event)) continue;
    const ts0 = Number(item?.ts);
    const ts = Number.isFinite(ts0) ? Math.max(0, Math.min(now, Math.floor(ts0))) : now;
    events.push({ event, ts, sessionId: clampStr(item?.sessionId, 64), props: cleanProps(item) });
  }
  return { events, received: raw.length };
}

export function clampDays(v) {
  return v == null || v === "" ? 30 : Math.min(180, Math.max(1, intOr(v, 30)));
}

function rate(n, d) {
  return d > 0 ? Math.round((n / d) * 1000) / 1000 : null;
}

/** 聚合：分事件计数、按首次打开日期的留存、时长分桶。只出计数，不出单条记录。 */
export async function queryRetention(db, { days = 30, now = Date.now() } = {}) {
  const since = now - clampDays(days) * DAY_MS;

  const counts = await dbAll(
    db,
    `SELECT event, COUNT(*) AS n, COUNT(DISTINCT session_id) AS sessions
     FROM analytics_events WHERE created_at >= ? GROUP BY event ORDER BY event`,
    [since]
  );

  const cohortRows = await dbAll(
    db,
    `SELECT json_extract(props_json, '$.cohort') AS cohort,
            SUM(CASE WHEN event = 'session_start' AND json_extract(props_json, '$.new') = 1 THEN 1 ELSE 0 END) AS players,
            SUM(CASE WHEN event = 'register' THEN 1 ELSE 0 END) AS registered,
            SUM(CASE WHEN event = 'first_battle' THEN 1 ELSE 0 END) AS battled,
            SUM(CASE WHEN event = 'first_capture' THEN 1 ELSE 0 END) AS captured,
            SUM(CASE WHEN event = 'first_rebirth' THEN 1 ELSE 0 END) AS reborn,
            SUM(CASE WHEN event = 'return_d1' THEN 1 ELSE 0 END) AS d1,
            SUM(CASE WHEN event = 'return_d7' THEN 1 ELSE 0 END) AS d7
     FROM analytics_events
     WHERE created_at >= ? AND json_extract(props_json, '$.cohort') IS NOT NULL
       AND json_extract(props_json, '$.cohort') <> 'legacy'
     GROUP BY cohort ORDER BY cohort`,
    [since]
  );

  const bucketRows = await dbAll(
    db,
    `SELECT json_extract(props_json, '$.bucket') AS bucket, COUNT(DISTINCT session_id) AS n
     FROM analytics_events WHERE created_at >= ? AND event = 'session_time' GROUP BY bucket`,
    [since]
  );

  const events = {};
  for (const name of ALLOWED_EVENTS) events[name] = { count: 0, sessions: 0 };
  for (const r of counts) {
    if (events[r.event]) events[r.event] = { count: Number(r.n) || 0, sessions: Number(r.sessions) || 0 };
  }

  const cohorts = cohortRows.map((r) => {
    const players = Number(r.players) || 0;
    const num = (k) => Number(r[k]) || 0;
    return {
      cohort: r.cohort,
      players,
      registered: num("registered"),
      battled: num("battled"),
      captured: num("captured"),
      reborn: num("reborn"),
      d1: num("d1"),
      d7: num("d7"),
      newbieRate: rate(num("captured"), players),
      d1Rate: rate(num("d1"), players),
      d7Rate: rate(num("d7"), players),
    };
  });

  // 「达到 ≥X 分钟」→ 互不重叠的区间
  const reached = new Map(bucketRows.map((r) => [Number(r.bucket), Number(r.n) || 0]));
  const sessions = events.session_start.sessions;
  const steps = [sessions, ...SESSION_BUCKETS_MIN.map((m) => reached.get(m) || 0)];
  const labels = ["<1", "1-5", "5-15", "15-30", "30-60", ">=60"];
  const sessionMinutes = {};
  labels.forEach((label, i) => {
    sessionMinutes[label] = Math.max(0, steps[i] - (steps[i + 1] ?? 0));
  });

  return { days: clampDays(days), events, cohorts, sessionMinutes };
}
