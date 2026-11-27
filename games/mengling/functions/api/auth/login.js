import { createSession, verifyPassword } from "../_auth.js";
import { dbFirst, getDb, handleOptions, json, readJson } from "../_db.js";
import { checkRateLimit, ipLimitKey, pruneIpKeys } from "../_rate_limit.js";
import { clampUsername } from "../_uid.js";

export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return json({ error: "method not allowed" }, { status: 405, req });

  const body = await readJson(req);
  const username = clampUsername(body?.username);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!username || !password) return json({ error: "invalid credentials" }, { status: 400, req });

  const db = getDb(context.env);
  // 同一来源对同一用户名限次：不然可以绕过注销接口的限次，从这里猜密码
  const rl = await checkRateLimit(db, await ipLimitKey("auth/login:ip:", req, { salt: username }), { limit: 20, windowSec: 600 });
  if (!rl.ok) {
    return json({ error: "rate limit exceeded", retryAfterSec: rl.retryAfterSec }, { status: 429, req });
  }
  await pruneIpKeys(db);

  // SELECT *：没跑 009 迁移的库里没有 token_version 列
  const user = await dbFirst(db, "SELECT * FROM users WHERE username = ?", [username]);
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return json({ error: "invalid credentials" }, { status: 401, req });
  }

  const token = await createSession(db, user.id, user.token_version);
  return json({ token, username: user.username, uid: user.uid }, { req });
}
