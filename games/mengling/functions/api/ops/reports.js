import { dbAll, dbRun, getDb, handleOptions, json as jsonResponse, nowMs, readJson } from "../_db.js";
import { checkRateLimit, ipLimitKey } from "../_rate_limit.js";
import { REPORT_REASONS, REPORT_RETENTION_DAYS, lacksSafetyTable, pruneExpiredReports } from "../_social_safety.js";
import { intOr } from "../_uid.js";
import { sameKey } from "./retention.js";

const STATUSES = new Set(["open", "handled", "dismissed"]);
/** 回应里有私信原文：浏览器和中间缓存都不许留（头是 X-Ops-Key 不是 Authorization，共享缓存不会自动跳过） */
const json = (data, opt = {}) => jsonResponse(data, { ...opt, headers: { "Cache-Control": "no-store" } });

/**
 * 举报人工处理（ML-COM3），头 X-Ops-Key = 环境变量 OPS_ADMIN_KEY；没配密钥时整个接口 404。
 * GET ?status=open|handled|dismissed|all&limit=50：列出举报（含快照）；PUT { id, status: handled|dismissed }：标记处理结果。
 * 每次调用顺手删掉到期的举报。
 */
export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;

  const secret = context.env?.OPS_ADMIN_KEY;
  if (typeof secret !== "string" || secret.length < 16) return json({ error: "not found" }, { status: 404, req });
  if (req.method !== "GET" && req.method !== "PUT") return json({ error: "method not allowed" }, { status: 405, req });

  const db = getDb(context.env);
  const rl = await checkRateLimit(db, await ipLimitKey("ops/reports:ip:", req), { limit: 30, windowSec: 60 });
  if (!rl.ok) return json({ error: "rate limit exceeded", retryAfterSec: rl.retryAfterSec }, { status: 429, req });
  if (!sameKey(req.headers.get("X-Ops-Key"), secret)) return json({ error: "unauthorized" }, { status: 401, req });

  const now = nowMs();
  try {
    const pruned = await pruneExpiredReports(db, now);

    if (req.method === "PUT") {
      const body = await readJson(req);
      const id = intOr(body?.id, 0);
      const status = String(body?.status || "");
      if (!id || status === "open" || !STATUSES.has(status)) return json({ error: "bad request" }, { status: 400, req });
      const res = await dbRun(db, "UPDATE user_reports SET status = ?, handled_at = ? WHERE id = ?", [status, now, id]);
      if (!Number(res?.meta?.changes)) return json({ error: "report not found" }, { status: 404, req });
      return json({ ok: true, id, status }, { req });
    }

    const url = new URL(req.url);
    const status = String(url.searchParams.get("status") || "open");
    const rawLimit = url.searchParams.get("limit");
    const limit = rawLimit == null || rawLimit === "" ? 50 : Math.min(100, Math.max(1, intOr(rawLimit, 50)));
    const all = status === "all";
    if (!all && !STATUSES.has(status)) return json({ error: "bad request" }, { status: 400, req });
    const rows = await dbAll(
      db,
      `SELECT id, reporter_uid, target_uid, reason, snapshot_json, status, created_at, handled_at
       FROM user_reports ${all ? "" : "WHERE status = ?"}
       ORDER BY created_at ASC LIMIT ?`,
      all ? [limit] : [status, limit]
    );
    return json(
      {
        ok: true,
        retentionDays: REPORT_RETENTION_DAYS,
        pruned,
        reports: rows.map((r) => {
          let snapshot = {};
          try {
            snapshot = JSON.parse(r.snapshot_json || "{}");
          } catch {
          }
          return {
            id: Number(r.id),
            reporter_uid: r.reporter_uid,
            target_uid: r.target_uid,
            reason: r.reason,
            reasonLabel: REPORT_REASONS[r.reason] || r.reason,
            snapshot,
            status: r.status,
            created_at: Number(r.created_at) || 0,
            handled_at: r.handled_at == null ? null : Number(r.handled_at),
          };
        }),
      },
      { req }
    );
  } catch (e) {
    if (lacksSafetyTable(e)) return json({ error: "not ready" }, { status: 503, req });
    throw e;
  }
}
