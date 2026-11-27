import { requireUser } from "../_auth.js";
import { dbFirst, dbRun, getDb, handleOptions, json, nowMs, readJson } from "../_db.js";
import { checkRateLimit } from "../_rate_limit.js";
import { isBlocked } from "../_social_safety.js";
import { clampUid } from "../_uid.js";

const TTL_MS = 24 * 60 * 60 * 1000;

function normalizeTeamData(arr) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  for (const m of arr.slice(0, 6)) {
    if (!m || typeof m !== "object") continue;
    const name = typeof m.name === "string" ? m.name.slice(0, 32) : "";
    if (!name) continue;
    const hp = Math.max(1, Math.min(9999, Math.floor(Number(m.hp) || 100)));
    const attack = Math.max(1, Math.min(9999, Math.floor(Number(m.attack) || 50)));
    const defense = Math.max(1, Math.min(9999, Math.floor(Number(m.defense) || 50)));
    const speed = Math.max(1, Math.min(9999, Math.floor(Number(m.speed) || 50)));
    const level = Math.max(1, Math.min(100, Math.floor(Number(m.level) || 1)));
    const types = Array.isArray(m.types) ? m.types.filter((t) => typeof t === "string").slice(0, 2) : [];
    out.push({
      id: typeof m.id === "number" ? m.id : undefined,
      name,
      dex: typeof m.dex === "number" ? Math.floor(m.dex) : 0,
      isShiny: Boolean(m.isShiny),
      level,
      hp,
      attack,
      defense,
      speed,
      types,
      stats: { hp, atk: attack, def: defense, spe: speed },
    });
  }
  return out;
}

export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return json({ error: "method not allowed" }, { status: 405, req });

  const db = getDb(context.env);
  const user = await requireUser(db, req);
  if (!user) return json({ error: "unauthorized" }, { status: 401, req });

  const body = await readJson(req);
  const fromUid = user.uid;
  const toUid = clampUid(body?.toUid);
  const teamData = normalizeTeamData(body?.teamData);
  if (!toUid || toUid === fromUid) return json({ error: "bad request" }, { status: 400, req });
  if (teamData.length < 1) return json({ error: "empty team" }, { status: 400, req });
  for (const [key, limit, windowSec] of [[`social/pvp-invite:${fromUid}`, 10, 60], [`social/pvp-invite/day:${fromUid}`, 100, 86400]]) {
    const rl = await checkRateLimit(db, key, { limit, windowSec });
    if (!rl.ok) return json({ error: "rate limit exceeded", retryAfterSec: rl.retryAfterSec }, { status: 429, req });
  }

  const friendship = await dbFirst(
    db,
    `SELECT id FROM friends WHERE (uid1 = ? AND uid2 = ?) OR (uid1 = ? AND uid2 = ?)`,
    [fromUid, toUid, toUid, fromUid]
  );
  if (!friendship) return json({ error: "not friends" }, { status: 403, req });
  // 自己屏蔽了对方：新客户端（带 explain）拿到原因；0.7.58 及更早的客户端见 403 会提示「请重新登录」，给它们照常回 ok、不存
  if (await isBlocked(db, fromUid, toUid)) {
    return body?.explain === true ? json({ error: "you blocked this player" }, { status: 403, req }) : json({ ok: true }, { req });
  }

  // 对方屏蔽了你：照常回 ok，存成 muted（对方收不到，你的「已发出」照常显示到过期）
  const status = (await isBlocked(db, toUid, fromUid)) ? "muted" : "pending";
  const now = nowMs();
  await dbRun(
    db,
    "INSERT INTO pvp_invites(from_uid, to_uid, status, team_data, created_at, expires_at) VALUES(?, ?, ?, ?, ?, ?)",
    [fromUid, toUid, status, JSON.stringify(teamData), now, now + TTL_MS]
  );
  return json({ ok: true }, { req });
}
