import { requireUser } from "../_auth.js";
import { dbFirst, getDb, handleOptions, json, nowMs, readJson } from "../_db.js";
import { checkRateLimit } from "../_rate_limit.js";
import {
  REPORT_REASONS,
  hasRecentReport,
  insertReport,
  lacksSafetyTable,
  pruneExpiredReports,
  reportSnapshot,
} from "../_social_safety.js";
import { clampStr, clampUid } from "../_uid.js";

/**
 * 举报（ML-COM3）。POST { targetUid, reason }：服务器自己截快照（对方昵称、用户名、发给你的最近几条私信），
 * 存进 user_reports 等人工处理；对方不会知道。限流：每小时 5 次、每天 20 次；24 小时内对同一人重复举报只记一次。
 * 每次提交顺手删掉到期的举报（REPORT_RETENTION_DAYS）。
 */
export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return json({ error: "method not allowed" }, { status: 405, req });

  const db = getDb(context.env);
  const user = await requireUser(db, req);
  if (!user) return json({ error: "unauthorized" }, { status: 401, req });
  const uid = user.uid;

  const body = await readJson(req);
  const target = clampUid(body?.targetUid);
  const reason = clampStr(body?.reason, 32);
  if (!target || !Object.prototype.hasOwnProperty.call(REPORT_REASONS, reason)) return json({ error: "bad request" }, { status: 400, req });
  if (target === uid) return json({ error: "cannot report self" }, { status: 400, req });

  for (const [key, limit, windowSec] of [[`social/report:${uid}`, 5, 3600], [`social/report/day:${uid}`, 20, 86400]]) {
    const rl = await checkRateLimit(db, key, { limit, windowSec });
    if (!rl.ok) return json({ error: "rate limit exceeded", retryAfterSec: rl.retryAfterSec }, { status: 429, req });
  }

  const exists = await dbFirst(db, "SELECT uid FROM users WHERE uid = ?", [target]);
  if (!exists) return json({ error: "user not found" }, { status: 404, req });

  const now = nowMs();
  try {
    await pruneExpiredReports(db, now);
    if (await hasRecentReport(db, uid, target, now)) return json({ ok: true, duplicate: true }, { req });
    await insertReport(db, { reporter: uid, target, reason, snapshot: await reportSnapshot(db, uid, target), now });
  } catch (e) {
    if (lacksSafetyTable(e)) return json({ error: "not ready" }, { status: 503, req });
    throw e;
  }
  return json({ ok: true, duplicate: false }, { req });
}
