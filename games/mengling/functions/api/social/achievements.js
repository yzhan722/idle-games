import { requireUser } from "../_auth.js";
import { dbFirst, dbRun, getDb, handleOptions, json, nowMs, readJson } from "../_db.js";
import { checkRateLimit } from "../_rate_limit.js";
import { displayName, maskText } from "../../../modules/name_filter.js";
import { allExceptBlocked } from "../_social_safety.js";
import { clampStr, intOr } from "../_uid.js";

export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;

  const db = getDb(context.env);
  const user = await requireUser(db, req);
  if (!user) return json({ error: "unauthorized" }, { status: 401, req });
  const uid = user.uid;

  if (req.method === "GET") {
    // 屏蔽的人的动态在 SQL 里就去掉，再取最近 50 条（对方刷屏也挤不掉别人的）
    const rows = await allExceptBlocked(
      db,
      `SELECT a.id, a.uid, a.achievement_type, a.achievement_data, a.likes, a.created_at,
              u.username, s.name
       FROM achievement_shares a
       LEFT JOIN users u ON u.uid = a.uid
       LEFT JOIN scores s ON s.uid = a.uid
       WHERE 1 = 1 /*notBlocked*/
       ORDER BY a.created_at DESC
       LIMIT 50`,
      { viewer: uid, column: "a.uid" }
    );
    return json(
      {
        achievements: rows.map((a) => {
          let achievement_data = {};
          try {
            achievement_data = JSON.parse(a.achievement_data || "{}");
          } catch {
          }
          // 分享内容由客户端填，名字照样过一遍屏蔽词
          if (achievement_data && typeof achievement_data.name === "string") achievement_data.name = maskText(achievement_data.name);
          return {
            id: Number(a.id),
            uid: a.uid,
            username: displayName(a.username || a.name || a.uid),
            achievement_type: a.achievement_type,
            achievement_data,
            likes: Number(a.likes) || 0,
            created_at: Number(a.created_at) || 0,
          };
        }),
      },
      { req }
    );
  }

  if (req.method === "POST") {
    const body = await readJson(req);
    const achievementType = clampStr(body?.achievementType, 64);
    const achievementData = body?.achievementData && typeof body.achievementData === "object" ? body.achievementData : {};
    if (!achievementType) return json({ error: "bad request" }, { req });
    const dataJson = JSON.stringify(achievementData);
    if (dataJson.length > 2000) return json({ error: "data too large" }, { status: 413, req });
    for (const [key, limit, windowSec] of [[`social/share:${uid}`, 20, 60], [`social/share/day:${uid}`, 200, 86400]]) {
      const rl = await checkRateLimit(db, key, { limit, windowSec });
      if (!rl.ok) return json({ error: "rate limit exceeded", retryAfterSec: rl.retryAfterSec }, { status: 429, req });
    }
    await dbRun(
      db,
      "INSERT INTO achievement_shares(uid, achievement_type, achievement_data, likes, created_at) VALUES(?, ?, ?, 0, ?)",
      [uid, achievementType, dataJson, nowMs()]
    );
    return json({ ok: true }, { req });
  }

  if (req.method === "PUT") {
    const body = await readJson(req);
    const achievementId = intOr(body?.achievementId, 0);
    if (!achievementId) return json({ error: "bad request" }, { req });
    const rl = await checkRateLimit(db, `social/like:${uid}`, { limit: 60, windowSec: 60 });
    if (!rl.ok) {
      return json({ error: "rate limit exceeded", retryAfterSec: rl.retryAfterSec }, { status: 429, req });
    }

    const exists = await dbFirst(db, "SELECT id FROM achievement_shares WHERE id = ?", [achievementId]);
    if (!exists) return json({ error: "not found" }, { status: 404, req });

    const liked = await dbFirst(
      db,
      "SELECT id FROM achievement_likes WHERE achievement_id = ? AND uid = ?",
      [achievementId, uid]
    );
    if (liked) return json({ error: "already liked" }, { req });

    await dbRun(db, "INSERT INTO achievement_likes(achievement_id, uid, created_at) VALUES(?, ?, ?)", [
      achievementId,
      uid,
      nowMs(),
    ]);
    await dbRun(db, "UPDATE achievement_shares SET likes = likes + 1 WHERE id = ?", [achievementId]);
    return json({ ok: true }, { req });
  }

  return json({ error: "method not allowed" }, { status: 405, req });
}
