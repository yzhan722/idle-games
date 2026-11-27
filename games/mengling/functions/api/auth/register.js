import { createSession, hashPassword, newUid } from "../_auth.js";
import { dbFirst, getDb, handleOptions, json, nowMs, readJson } from "../_db.js";
import { checkRateLimit, ipLimitKey, pruneIpKeys } from "../_rate_limit.js";
import { clampUsername } from "../_uid.js";
import { checkName } from "../../../modules/name_filter.js";

export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return json({ error: "method not allowed" }, { status: 405, req });

  const body = await readJson(req);
  const username = clampUsername(body?.username);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!username) return json({ error: "invalid username" }, { status: 400, req });
  // 用户名会被好友、私信对象看到：命中屏蔽词（辱骂、色情、仇恨、冒充官方）不让注册
  if (!checkName(username).ok) return json({ error: "name not allowed" }, { status: 400, req });
  if (password.length < 4 || password.length > 128) {
    return json({ error: "invalid password" }, { status: 400, req });
  }

  const db = getDb(context.env);
  // 同一来源限次：防批量注册，也防拿「用户名已被占用」批量试名字
  const rl = await checkRateLimit(db, await ipLimitKey("auth/register:ip:", req), { limit: 10, windowSec: 3600 });
  if (!rl.ok) {
    return json({ error: "rate limit exceeded", retryAfterSec: rl.retryAfterSec }, { status: 429, req });
  }
  await pruneIpKeys(db);

  const exists = await dbFirst(db, "SELECT id FROM users WHERE username = ?", [username]);
  if (exists) return json({ error: "username taken" }, { status: 409, req });

  const uid = newUid();
  const password_hash = await hashPassword(password);
  const created_at = nowMs();
  const ins = await db
    .prepare("INSERT INTO users(uid, username, password_hash, created_at) VALUES(?, ?, ?, ?)")
    .bind(uid, username, password_hash, created_at)
    .run();
  const userId = ins?.meta?.last_row_id;
  if (!userId) return json({ error: "register failed" }, { status: 500, req });

  const token = await createSession(db, userId);
  return json({ token, username, uid }, { req });
}
