import { requireUser, verifyPassword } from "../_auth.js";
import { clampRequestId, deleteAccount, isDeleteConfirmed, isDeletionDone } from "../_account.js";
import { dbFirst, getDb, handleOptions, json, readJson } from "../_db.js";
import { checkRateLimit } from "../_rate_limit.js";

/** 注销账号：登录态 + 密码 + 原样输入用户名；同一 requestId 重试返回已完成 */
export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return json({ error: "method not allowed" }, { status: 405, req });

  const body = await readJson(req);
  const requestId = clampRequestId(body?.requestId);
  if (!requestId) return json({ error: "bad request" }, { status: 400, req });

  const db = getDb(context.env);
  const user = await requireUser(db, req);
  if (!user) {
    // 上一次已删完但响应丢了：会话已不在，凭请求号确认
    if (await isDeletionDone(db, requestId)) return json({ ok: true, deleted: true, already: true }, { req });
    return json({ error: "unauthorized" }, { status: 401, req });
  }

  const rl = await checkRateLimit(db, `auth/delete:${user.uid}`, { limit: 5, windowSec: 600 });
  if (!rl.ok) {
    return json({ error: "rate limit exceeded", retryAfterSec: rl.retryAfterSec }, { status: 429, req });
  }

  if (!isDeleteConfirmed(body, user.username)) return json({ error: "confirm mismatch" }, { status: 400, req });

  const password = typeof body?.password === "string" ? body.password : "";
  const row = await dbFirst(db, "SELECT password_hash FROM users WHERE id = ?", [user.id]);
  if (!row || !(await verifyPassword(password, row.password_hash))) {
    return json({ error: "invalid credentials" }, { status: 403, req });
  }

  await deleteAccount(db, user, requestId);
  return json({ ok: true, deleted: true, already: false }, { req });
}
