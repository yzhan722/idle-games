// Auth helpers: PBKDF2 password hash + Bearer sessions
import { dbFirst, dbRun, nowMs } from "./_db.js";
import { clampStr } from "./_uid.js";

const PBKDF2_ITERS = 100000;
const SALT_BYTES = 16;
const KEY_BYTES = 32;

function b64(buf) {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function fromB64(s) {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const enc = new TextEncoder().encode(String(password || ""));
  const key = await crypto.subtle.importKey("raw", enc, "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITERS },
    key,
    KEY_BYTES * 8
  );
  return `pbkdf2$${PBKDF2_ITERS}$${b64(salt)}$${b64(bits)}`;
}

export async function verifyPassword(password, stored) {
  const parts = String(stored || "").split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iters = Number(parts[1]);
  if (!Number.isFinite(iters) || iters < 1000) return false;
  const salt = fromB64(parts[2]);
  const expect = fromB64(parts[3]);
  const enc = new TextEncoder().encode(String(password || ""));
  const key = await crypto.subtle.importKey("raw", enc, "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: iters },
    key,
    expect.length * 8
  );
  const got = new Uint8Array(bits);
  if (got.length !== expect.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got[i] ^ expect[i];
  return diff === 0;
}

export function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return b64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function newUid() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function bearerToken(req) {
  const h = req.headers.get("Authorization") || "";
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m ? clampStr(m[1], 256) : "";
}

// 90 天到期看 created_at；提前失效看 token_version（见 revokeAllSessions）
export const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000;

export function isSessionExpired(createdAt, now = nowMs()) {
  const t = Number(createdAt);
  if (!Number.isFinite(t) || t <= 0) return true;
  return now - t > SESSION_TTL_MS;
}

/** 还没跑 migrations/009 的库：没有 token_version 列，按旧写法走（不因为先部署后迁移而全员掉线） */
const lacksTokenVersion = (e) => /no such column|has no column named/i.test(String(e?.message || e));

export async function requireUser(db, req) {
  const token = bearerToken(req);
  if (!token) return null;
  const find = (extra) =>
    dbFirst(
      db,
      `SELECT u.id, u.uid, u.username, s.created_at AS sessionCreatedAt${extra}
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = ?`,
      [token]
    );
  let row;
  try {
    row = await find(", u.token_version AS userVersion, s.token_version AS sessionVersion");
  } catch (e) {
    if (!lacksTokenVersion(e)) throw e;
    row = await find("");
  }
  if (!row) return null;
  if (isSessionExpired(row.sessionCreatedAt) || !(await tokenVersionOk(db, token, row))) {
    await destroySession(db, token);
    return null;
  }
  return { id: row.id, uid: row.uid, username: row.username };
}

/** 令牌版本要与账号一致；迁移前签发的令牌没有版本号，账号没吊销过才认，并补上版本号（只兼容这一次） */
async function tokenVersionOk(db, token, row) {
  if (row.userVersion === undefined) return true;
  const version = Number(row.userVersion) || 0;
  if (row.sessionVersion === null) {
    if (version !== 0) return false;
    await dbRun(db, "UPDATE sessions SET token_version = 0 WHERE token = ? AND token_version IS NULL", [token]);
    return true;
  }
  return Number(row.sessionVersion) === version;
}

/** version 取验密码时读到的账号版本：验完密码到签发之间被吊销的话，这枚令牌也无效 */
export async function createSession(db, userId, version = 0) {
  const token = newToken();
  try {
    await dbRun(db, "INSERT INTO sessions(token, user_id, created_at, token_version) VALUES(?, ?, ?, ?)", [
      token,
      userId,
      nowMs(),
      Number(version) || 0,
    ]);
  } catch (e) {
    if (!lacksTokenVersion(e)) throw e;
    await dbRun(db, "INSERT INTO sessions(token, user_id, created_at) VALUES(?, ?, ?)", [token, userId, nowMs()]);
  }
  return token;
}

/** 退出所有设备：账号版本 +1 并删掉全部会话（改密码由 migrations/010 的触发器 +1；注销时账号与会话在同一批里删掉） */
export async function revokeAllSessions(db, userId) {
  const drop = () => db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(userId);
  try {
    await db.batch([db.prepare("UPDATE users SET token_version = token_version + 1 WHERE id = ?").bind(userId), drop()]);
  } catch (e) {
    if (!lacksTokenVersion(e)) throw e;
    await db.batch([drop()]);
  }
}

export async function destroySession(db, token) {
  if (!token) return;
  await dbRun(db, "DELETE FROM sessions WHERE token = ?", [token]);
}
