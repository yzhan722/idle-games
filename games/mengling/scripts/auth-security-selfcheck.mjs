#!/usr/bin/env node
// 登录令牌吊销（token_version）、退出所有设备、注册与私信限流。进程内内存库，不开端口、不连真 D1。
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadSqlite, createFakeD1, ALL_MIGRATIONS, call } from "./_fake_d1.mjs";
import { hashPassword, revokeAllSessions } from "../functions/api/_auth.js";
import { ipGroup } from "../functions/api/_rate_limit.js";
import { onRequest as register } from "../functions/api/auth/register.js";
import { onRequest as login } from "../functions/api/auth/login.js";
import { onRequest as logout } from "../functions/api/auth/logout.js";
import { onRequest as logoutAll } from "../functions/api/auth/logout-all.js";
import { onRequest as del } from "../functions/api/auth/delete.js";
import { onRequest as meta } from "../functions/api/save/meta.js";
import { onRequest as messages } from "../functions/api/social/messages.js";
import { onRequest as achievements } from "../functions/api/social/achievements.js";
import { onRequest as pvpInvite } from "../functions/api/social/pvp-invite.js";
import { onRequest as pvpAccept } from "../functions/api/social/pvp-accept.js";
import { onRequest as friendRequest } from "../functions/api/friends/request.js";
import { onRequest as friendAccept } from "../functions/api/friends/accept.js";
import { onRequest as friendGift } from "../functions/api/friends/gift.js";
import { onRequest as bossClaim } from "../functions/api/server/boss/bully/claim.js";
import { onRequest as eventsPush } from "../functions/api/events/push.js";
import { createCloudSave } from "../modules/cloud_save.js";
import { initLogoutAll, logoutAllErrorText } from "../modules/app/privacy_panel.js";
import { socialFailMsg } from "../modules/social.js";

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const M009 = read("migrations/009_token_version.sql");
const M010 = read("migrations/010_password_bumps_token_version.sql");
assert.ok(!/\b(DROP|DELETE)\b/i.test(M009 + M010.replace(/--[^\n]*/g, "")), "migrations only add");

const DatabaseSync = await loadSqlite();
if (!DatabaseSync) {
  console.log("auth-security-selfcheck: SKIP (needs Node >= 22.5)");
  process.exit(0);
}

const PASS = "pass-1234";
let ipSeq = 0;
const ip = () => ({ "CF-Connecting-IP": `198.51.100.${(ipSeq += 1) % 250}` });
const reg = async (db, username) => (await call(register, db, { body: { username, password: PASS }, headers: ip() })).json();
const signIn = async (db, username, password = PASS) => call(login, db, { body: { username, password }, headers: ip() });
const who = async (db, token) => (await call(meta, db, { method: "GET", token })).status;

/** 迁移前的老库：把新列从表结构里去掉 */
function oldDb() {
  const db = createFakeD1(DatabaseSync, { migrations: ALL_MIGRATIONS });
  db.raw.exec("ALTER TABLE users DROP COLUMN token_version");
  db.raw.exec("ALTER TABLE sessions DROP COLUMN token_version");
  return db;
}
const newDb = () => {
  const db = createFakeD1(DatabaseSync, { migrations: ALL_MIGRATIONS });
  db.raw.exec(M010);
  return db;
};

// 退出所有设备：本人全部令牌失效，别人不受影响，能重新登录
{
  const db = newDb();
  const a = await reg(db, "alice");
  const a2 = await (await signIn(db, "alice")).json();
  const b = await reg(db, "bob");
  assert.equal((await call(logoutAll, db, { method: "GET", token: a.token })).status, 405, "GET refused");
  assert.equal((await call(logoutAll, db, {})).status, 401, "needs a session");
  assert.deepEqual([await who(db, a.token), await who(db, a2.token)], [200, 200]);
  assert.equal((await call(logoutAll, db, { token: a2.token })).status, 200, "logout everywhere");
  assert.deepEqual([await who(db, a.token), await who(db, a2.token), await who(db, b.token)], [401, 401, 200], "all of alice's tokens are dead, bob's lives");
  assert.equal(db.raw.prepare("SELECT token_version v FROM users WHERE username = 'alice'").get().v, 1, "version bumped");
  const a3 = await (await signIn(db, "alice")).json();
  assert.equal(await who(db, a3.token), 200, "can sign in again");
  // 单台退出只影响这一台
  const a4 = await (await signIn(db, "alice")).json();
  await call(logout, db, { token: a4.token });
  assert.deepEqual([await who(db, a3.token), await who(db, a4.token)], [200, 401], "plain logout drops one device");
}

// 会话行还在也没用：版本对不上就失效并清掉（例如删会话那条没执行到）
{
  const db = newDb();
  const a = await reg(db, "alice");
  db.raw.exec("UPDATE users SET token_version = token_version + 1");
  assert.equal(await who(db, a.token), 401, "stale version refused");
  assert.equal(db.raw.prepare("SELECT COUNT(*) n FROM sessions").get().n, 0, "stale session removed");
}

// 验完密码到签发之间被吊销：这枚令牌也无效
{
  const db = newDb();
  await reg(db, "alice");
  const racing = {
    ...db,
    prepare: (sql) => {
      if (/^INSERT INTO sessions/.test(sql.trim())) db.raw.exec("UPDATE users SET token_version = token_version + 1");
      return db.prepare(sql);
    },
  };
  const { token } = await (await signIn(racing, "alice")).json();
  assert.equal(await who(db, token), 401, "token issued with the version seen at password check");
}

// 改密码（现在只有管理员直接改库）：触发器 +1，旧令牌失效；改别的列不动
{
  const db = newDb();
  const a = await reg(db, "alice");
  db.raw.prepare("UPDATE users SET username = 'alice2' WHERE username = 'alice'").run();
  assert.equal(await who(db, a.token), 200, "renaming does not sign out");
  db.raw.prepare("UPDATE users SET password_hash = ? WHERE username = 'alice2'").run(await hashPassword("new-pass-9"));
  assert.equal(await who(db, a.token), 401, "password change signs every device out");
  assert.equal((await signIn(db, "alice2")).status, 401, "old password refused");
  const fresh = await (await signIn(db, "alice2", "new-pass-9")).json();
  assert.equal(await who(db, fresh.token), 200, "new password works");
}

// 注销：同一批里账号与会话都没了，令牌立即失效
{
  const db = newDb();
  const a = await reg(db, "alice");
  const a2 = await (await signIn(db, "alice")).json();
  const r = await call(del, db, { token: a.token, body: { requestId: "3f2b8c1e-0000-4000-8000-000000000001", confirm: "alice", password: PASS } });
  assert.equal(r.status, 200);
  assert.deepEqual([await who(db, a.token), await who(db, a2.token)], [401, 401], "deleted account's tokens are dead");
}

// 旧令牌兼容一次：迁移前登录的人迁移后不掉线，用一次就补上版本；吊销过就不再认
{
  const db = oldDb();
  const a = await reg(db, "alice");
  const a2 = await (await signIn(db, "alice")).json();
  const b = await reg(db, "bob");
  const b2 = await (await signIn(db, "bob")).json();
  assert.equal(await who(db, a.token), 200, "works before the migration (deploy first, migrate later)");
  db.raw.exec(M009);
  db.raw.exec(M010);
  assert.equal(await who(db, a.token), 200, "pre-migration token still works");
  assert.equal(db.raw.prepare("SELECT token_version v FROM sessions WHERE token = ?").get(a.token).v, 0, "and is stamped on first use");
  assert.equal(db.raw.prepare("SELECT token_version v FROM sessions WHERE token = ?").get(a2.token).v, null, "untouched token waits");
  // bob 只剩版本号 +1、会话行没删干净的最坏情况：没补过版本的旧令牌也要失效
  db.raw.exec("UPDATE users SET token_version = 1 WHERE username = 'bob'");
  assert.deepEqual([await who(db, b.token), await who(db, b2.token)], [401, 401], "unstamped tokens die once the account was revoked");
  assert.equal((await call(logoutAll, db, { token: a.token })).status, 200);
  assert.deepEqual([await who(db, a.token), await who(db, a2.token)], [401, 401]);
}

// 没跑迁移：登录、注册、退出所有设备照样可用（靠删会话）
{
  const db = oldDb();
  const a = await reg(db, "alice");
  const a2 = await (await signIn(db, "alice")).json();
  assert.equal((await call(logoutAll, db, { token: a.token })).status, 200, "logout-all works without the column");
  assert.deepEqual([await who(db, a.token), await who(db, a2.token)], [401, 401]);
  // 别的数据库错误不能被当成「没迁移」吞掉
  const broken = { ...db, prepare: (sql) => { if (/FROM sessions/.test(sql)) throw new Error("D1_ERROR: network"); return db.prepare(sql); } };
  await assert.rejects(() => who(broken, a.token), /network/, "other errors surface");
}

// 迁移只成了一半（两条 ALTER 只过一条）：登录、鉴权、退出所有设备照旧；补跑另一条后也不乱认
for (const [first, second] of [["users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0", "sessions ADD COLUMN token_version INTEGER"], ["sessions ADD COLUMN token_version INTEGER", "users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0"]]) {
  const db = oldDb();
  const before = await reg(db, "alice");
  db.raw.exec(`ALTER TABLE ${first}`);
  const a = await (await signIn(db, "alice")).json();
  const b = await reg(db, "bob");
  assert.deepEqual([await who(db, before.token), await who(db, a.token), await who(db, b.token)], [200, 200, 200], `half migrated (${first}): everything works`);
  assert.equal((await call(logoutAll, db, { token: a.token })).status, 200);
  assert.deepEqual([await who(db, before.token), await who(db, a.token), await who(db, b.token)], [401, 401, 200], "logout-all still revokes");
  db.raw.exec(`ALTER TABLE ${second}`);
  assert.equal(await who(db, b.token), 200, "others stay signed in after the second half");
  assert.equal(await who(db, before.token), 401, "revoked ones stay out");
  const again = await (await signIn(db, "alice")).json();
  assert.equal(await who(db, again.token), 200);
}
// 触发器文件按 wrangler 的办法拆语句（认大写 BEGIN / CASE … END）后逐条执行也成立；只按分号拆会断，说明注释里的提醒是必要的
{
  const split = (sql) => {
    const out = [];
    let cur = "";
    let depth = 0;
    for (const ch of sql.replace(/--[^\n]*/g, "")) {
      if (depth && /\sEND$/.test(cur) && /[;\s]/.test(ch)) depth -= 1;
      if (ch === ";" && depth === 0) { out.push(cur); cur = ""; continue; }
      cur += ch;
      if (/\s(BEGIN|CASE)\s$/.test(cur)) depth += 1;
    }
    return [...out, cur].map((x) => x.trim()).filter(Boolean);
  };
  assert.deepEqual([split(M009).length, split(M010).length], [2, 1], "statements per file");
  const db = oldDb();
  for (const st of [...split(M009), ...split(M010)]) db.raw.prepare(st).run();
  for (const st of split(M010)) db.raw.prepare(st).run(); // 010 可以重跑
  const a = await reg(db, "alice");
  db.raw.prepare("UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE username = 'alice'").run(await hashPassword("new-pass-9"));
  assert.equal(await who(db, a.token), 401, "doing both by hand and by trigger still signs out");
  assert.equal(await who(db, (await (await signIn(db, "alice", "new-pass-9")).json()).token), 200);
  assert.throws(() => M010.replace(/--[^\n]*/g, "").split(";").filter((x) => x.trim()).forEach((x) => oldDb().raw.prepare(x)), /incomplete input/, "a plain split on semicolons would break it");
  assert.ok(!/\b(BEGIN|CASE|END)\b|;/i.test((M009 + M010).match(/--[^\n]*/g).join("")), "no keyword or semicolon in the comments to confuse a splitter");
}
// 连限流表都没有的库（只跑过 d1_schema.sql）：放行，不能因此登录不了；别的错误照样报
{
  const db = createFakeD1(DatabaseSync);
  assert.throws(() => db.raw.prepare("SELECT 1 FROM rate_limits"), /no such table/);
  const log = console.error;
  console.error = () => {};
  const a = await reg(db, "alice");
  assert.equal((await signIn(db, "alice")).status, 200, "sign in works without the limiter table");
  assert.equal((await call(logoutAll, db, { token: a.token })).status, 200);
  console.error = log;
  const broken = { ...db, prepare: (sql) => { if (/rate_limits/.test(sql)) throw new Error("D1_ERROR: network"); return db.prepare(sql); } };
  await assert.rejects(() => signIn(broken, "alice"), /network/, "other limiter errors surface");
}
// IPv6 按 /64 算一个来源
{
  assert.equal(ipGroup("2001:db8:1:2:aaaa::1"), ipGroup("2001:0DB8:0001:0002:ffff:1:2:3"));
  assert.notEqual(ipGroup("2001:db8:1:2::1"), ipGroup("2001:db8:1:3::1"));
  assert.equal(ipGroup("2001:db8::1"), "2001:db8:0:0::/64");
  assert.deepEqual([ipGroup("203.0.113.5"), ipGroup("::ffff:203.0.113.5")], ["203.0.113.5", "203.0.113.5"]);
  const db = newDb();
  const rs = [];
  for (let i = 0; i < 12; i += 1) rs.push((await call(register, db, { body: { username: `six${i}`, password: PASS }, headers: { "CF-Connecting-IP": `2001:db8:5:6::${i + 1}` } })).status);
  assert.equal(rs.filter((x) => x === 429).length, 2, "rotating inside one /64 does not help");
}

// 整批：版本 +1 与删会话要么都成，要么都不成
{
  const db = newDb();
  const a = await reg(db, "alice");
  const half = { ...db, batch: async () => { throw new Error("D1_ERROR: down"); } };
  await assert.rejects(() => revokeAllSessions(half, 1), /down/);
  assert.equal(await who(db, a.token), 200, "failed revoke changes nothing");
}

// 退出所有设备限次
{
  const db = newDb();
  await reg(db, "alice");
  let limited = 0;
  for (let i = 0; i < 7; i += 1) {
    const { token } = await (await signIn(db, "alice")).json();
    if ((await call(logoutAll, db, { token })).status === 429) limited += 1;
  }
  assert.equal(limited, 2, "5 per 10 minutes");
}

// 注册限流：同一来源 10 次 / 小时（含重名试探），并发不超发，换来源不受影响，不存 IP 原文
{
  const db = newDb();
  const from = { "CF-Connecting-IP": "203.0.113.50" };
  const rs = await Promise.all([...Array(14)].map((_, i) => call(register, db, { body: { username: `user${i}`, password: PASS }, headers: from })));
  assert.equal(rs.filter((r) => r.status === 200).length, 10, "10 per hour, parallel included");
  assert.equal(rs.filter((r) => r.status === 429).length, 4);
  assert.ok((await rs.find((r) => r.status === 429).json()).retryAfterSec > 0, "tells when to retry");
  assert.equal((await call(register, db, { body: { username: "user0", password: PASS }, headers: from })).status, 429, "name probing is limited too");
  assert.equal((await call(register, db, { body: { username: "other", password: PASS }, headers: { "CF-Connecting-IP": "203.0.113.51" } })).status, 200, "another address is fine");
  assert.equal((await call(register, db, { body: { username: "x", password: PASS }, headers: from })).status, 400, "bad input is refused before counting");
  const keys = db.raw.prepare("SELECT key FROM rate_limits WHERE key LIKE 'auth/register:%'").all().map((x) => x.key);
  assert.ok(keys.length === 2 && keys.every((k) => /^auth\/register:ip:[0-9a-f]{24}$/.test(k)), "only a daily hash is stored");
  // 窗口过了就恢复
  db.raw.exec("UPDATE rate_limits SET window_start = window_start - 3600001");
  assert.equal((await call(register, db, { body: { username: "later", password: PASS }, headers: from })).status, 200, "window resets");
}

// 私信限流：20 条 / 分钟、300 条 / 天，按人算，并发不超发；读信不受限；注销清掉计数
{
  const db = newDb();
  const a = await reg(db, "alice");
  const b = await reg(db, "bob");
  // 私信默认只收好友（ML-COM3），这里两人先是好友
  db.raw.prepare("INSERT INTO friends(uid1, uid2, created_at) VALUES(?, ?, 1)").run(...[a.uid, b.uid].sort());
  const send = (token, to, message = "hi") => call(messages, db, { token, body: { toUid: to, message } });
  const rs = await Promise.all([...Array(25)].map(() => send(a.token, b.uid)));
  assert.equal(rs.filter((r) => r.status === 200).length, 20, "20 per minute");
  assert.equal(rs.filter((r) => r.status === 429).length, 5);
  assert.equal(db.raw.prepare("SELECT COUNT(*) n FROM friend_messages").get().n, 20, "limited messages are not stored");
  assert.equal((await send(b.token, a.uid)).status, 200, "bob is counted separately");
  assert.equal((await call(messages, db, { method: "GET", token: b.token })).status, 200, "reading is not limited");
  db.raw.exec("UPDATE rate_limits SET window_start = window_start - 60001 WHERE key LIKE 'social/message:%'");
  assert.equal((await send(a.token, b.uid)).status, 200, "minute window resets");
  db.raw.prepare("UPDATE rate_limits SET count = 300 WHERE key = ?").run(`social/message/day:${a.uid}`);
  db.raw.exec("UPDATE rate_limits SET window_start = window_start - 60001 WHERE key LIKE 'social/message:%'");
  assert.equal((await send(a.token, b.uid)).status, 429, "daily cap");
  await call(del, db, { token: a.token, body: { requestId: "3f2b8c1e-0000-4000-8000-000000000009", confirm: "alice", password: PASS } });
  assert.equal(db.raw.prepare("SELECT COUNT(*) n FROM rate_limits WHERE key LIKE ?").get(`%${a.uid}`).n, 0, "counters go with the account");
  assert.ok(socialFailMsg({ status: 429 }, "x").includes("太频繁"), "player sees why");
}

// 其余写接口也限次：按人算、并发不超发、别人不受影响、注销时计数一起清
{
  const db = newDb();
  const a = await reg(db, "alice");
  const b = await reg(db, "bob");
  const burst = async (handler, n, body, opt = {}) => (await Promise.all([...Array(n)].map(() => call(handler, db, { token: a.token, body, ...opt })))).filter((r) => r.status !== 429).length;
  db.raw.prepare("INSERT INTO friends(uid1, uid2, created_at) VALUES(?, ?, 1)").run(...[a.uid, b.uid].sort());
  const team = [{ name: "x", hp: 1, attack: 1, defense: 1 }];
  assert.equal(await burst(friendRequest, 15, { toUsername: "nobody" }), 10, "friend requests 10 / min, probing for names included");
  assert.equal(await burst(friendAccept, 35, { requestId: 1 }), 30);
  assert.equal(await burst(pvpInvite, 15, { toUid: b.uid, teamData: team }), 10, "PvP invites 10 / min");
  assert.equal(db.raw.prepare("SELECT COUNT(*) n FROM pvp_invites").get().n, 10, "limited invites are not stored");
  assert.equal(await burst(pvpAccept, 35, { inviteId: 1 }), 30);
  assert.equal(await burst(achievements, 25, { achievementType: "t", achievementData: {} }), 20);
  assert.equal(await burst(achievements, 65, { achievementId: 999 }, { method: "PUT" }), 60);
  assert.equal(await burst(bossClaim, 25, {}), 20);
  assert.equal(await burst(messages, 125, { messageId: 1 }, { method: "PUT" }), 120);
  db.raw.exec("UPDATE rate_limits SET window_start = 0");
  // 先过每分钟那条，再过每天那条
  const gift = await burst(friendGift, 15, { toUid: b.uid, itemType: "berry" });
  assert.ok(gift <= 10, "gift bursts are capped");
  assert.equal((await call(achievements, db, { token: a.token, body: { achievementType: "t", achievementData: { x: "y".repeat(3000) } } })).status, 413, "oversized share refused");
  assert.equal((await call(pvpInvite, db, { token: b.token, body: { toUid: a.uid, teamData: team } })).status, 200, "bob is counted separately");
  for (const [handler, key, body] of [[friendRequest, "friends/request/day", { toUsername: "nobody" }], [pvpInvite, "social/pvp-invite/day", { toUid: b.uid, teamData: team }], [achievements, "social/share/day", { achievementType: "t" }]]) {
    db.raw.prepare("INSERT INTO rate_limits(key, count, window_start) VALUES(?, 9999, ?) ON CONFLICT(key) DO UPDATE SET count = 9999, window_start = excluded.window_start").run(`${key}:${a.uid}`, Date.now());
    assert.equal((await call(handler, db, { token: a.token, body })).status, 429, `${key} cap`);
  }
  assert.equal((await call(del, db, { token: a.token, body: { requestId: "3f2b8c1e-0000-4000-8000-00000000000a", confirm: "alice", password: PASS } })).status, 200);
  assert.equal(db.raw.prepare("SELECT COUNT(*) n FROM rate_limits WHERE key LIKE ?").get(`%${a.uid}%`).n, 0, "every counter goes with the account");
  // 未登录的跑马灯：换编号绕不过去，也不存 IP 原文
  const from = { "CF-Connecting-IP": "203.0.113.99" };
  let passed = 0;
  for (let i = 0; i < 25; i += 1) if ((await call(eventsPush, db, { body: { uid: `fake-${i}`, msg: "hi" }, headers: from })).status === 200) passed += 1;
  assert.equal(passed, 20, "guest broadcasts are counted by source");
  const keys = db.raw.prepare("SELECT key FROM rate_limits WHERE key LIKE 'events/push:%'").all().map((x) => x.key);
  assert.ok(keys.length === 1 && /^events\/push:ip:[0-9a-f]{24}$/.test(keys[0]), "one hashed key");
}

// 客户端：成功才清登录态；断网不清；401 清
{
  const store = new Map();
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  globalThis.document = { getElementById: () => null };
  globalThis.window = { clearInterval() {}, setInterval: () => 0, clearTimeout() {}, setTimeout: () => 0 };
  const cs = createCloudSave({ encodeSaveText: (x) => x, decodeSaveText: (x) => x, autosaveKey: "k", slotKeys: [] });
  const TOKEN = "mengling_idle_cloud_token_v1";
  let next;
  globalThis.fetch = async (url, opt) => { assert.ok(url === "/api/auth/logout-all" && opt.headers.Authorization === "Bearer t"); return next(); };
  store.set(TOKEN, "t");
  next = () => { throw new TypeError("Failed to fetch"); };
  await assert.rejects(() => cs.logoutAll());
  assert.equal(cs.isLoggedIn(), true, "offline: still signed in");
  next = () => new Response(JSON.stringify({ error: "rate limit exceeded" }), { status: 429 });
  await assert.rejects(() => cs.logoutAll(), (e) => logoutAllErrorText(e).includes("太频繁"));
  assert.equal(cs.isLoggedIn(), true, "limited: still signed in");
  next = () => new Response(JSON.stringify({ ok: true }));
  await cs.logoutAll();
  assert.equal(cs.isLoggedIn(), false, "done: signed out here too");
  store.set(TOKEN, "t");
  next = () => new Response("{}", { status: 401 });
  await assert.rejects(() => cs.logoutAll(), (e) => logoutAllErrorText(e).includes("本机已退出"));
  assert.equal(cs.isLoggedIn(), false);
}

// 设置页按钮：点两次才执行；5 秒不点复原；没登录只提示
{
  const listeners = [];
  const btn = { textContent: "退出所有设备", disabled: false, addEventListener: (_, f) => listeners.push(f) };
  const click = () => listeners[0]();
  let timer = null;
  let calls = 0;
  let logged = true;
  const hints = [];
  let result = async () => {};
  let done = 0;
  initLogoutAll({
    cloudSave: { isLoggedIn: () => logged, logoutAll: async () => { calls += 1; return result(); } },
    hint: (t) => hints.push(t), onDone: () => { done += 1; },
    doc: { getElementById: (id) => (id === "btnLogoutAll" ? btn : null) },
    setTimer: (f) => { timer = f; return 1; }, clearTimer: () => { timer = null; },
  });
  await click();
  assert.ok(calls === 0 && btn.textContent.includes("再点一次") && hints.at(-1).includes("重新登录"), "first click only arms");
  timer();
  assert.equal(btn.textContent, "退出所有设备", "disarms by itself");
  await click();
  await click();
  assert.ok(calls === 1 && done === 1 && btn.textContent === "退出所有设备" && btn.disabled === false, "second click signs out");
  result = async () => { throw Object.assign(new TypeError("Failed to fetch"), {}); };
  await click();
  await click();
  assert.ok(hints.at(-1).includes("没有退出") && btn.disabled === false, "failure is told and the button comes back");
  logged = false;
  await click();
  assert.ok(calls === 2 && hints.at(-1).includes("没有登录"), "signed-out click only hints");
  assert.ok(read("index.html").includes('id="btnLogoutAll"'), "button is on the settings page");
}

console.log("auth-security-selfcheck: OK");
