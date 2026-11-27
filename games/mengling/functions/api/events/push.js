import { requireUser } from "../_auth.js";
import { dbRun, getDb, handleOptions, json, nowMs, readJson } from "../_db.js";
import { checkRateLimit, ipLimitKey, pruneIpKeys } from "../_rate_limit.js";
import { clampName, clampStr, clampUid } from "../_uid.js";
import { maskText } from "../../../modules/name_filter.js";

/** Soft liveliness: logged-in preferred; guests may post with local uid (stricter RL). */
export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return json({ error: "method not allowed" }, { status: 405, req });

  const db = getDb(context.env);
  const user = await requireUser(db, req);
  const body = await readJson(req);
  const type = clampStr(body?.type, 32) || "info";
  const uid = user?.uid || clampUid(body?.uid) || "guest";
  const name = clampName(body?.name);
  const msg = maskText(clampStr(body?.msg, 200)); // 播报文字里带昵称：屏蔽词打码后再存
  if (!msg) return json({ ok: false, error: "empty msg" }, { status: 400, req });

  // 未登录的编号是客户端自己报的，换一个就绕过去，按来源计
  const rlKey = user ? `events/push:${user.uid}` : await ipLimitKey("events/push:ip:", req);
  const rl = await checkRateLimit(db, rlKey, {
    limit: user ? 30 : 20,
    windowSec: 60,
  });
  if (!rl.ok) {
    return json({ error: "rate limit exceeded", retryAfterSec: rl.retryAfterSec }, { status: 429, req });
  }

  if (!user) await pruneIpKeys(db);

  await dbRun(db, "INSERT INTO events(ts, type, uid, name, msg) VALUES(?, ?, ?, ?, ?)", [
    nowMs(),
    type,
    uid || null,
    name,
    msg,
  ]);
  return json({ ok: true, guest: !user }, { req });
}
