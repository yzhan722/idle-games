#!/usr/bin/env node
// 账号注销：登录态、二次确认、限流、幂等、整批回滚、不误删他人。进程内内存库，不开端口、不连真 D1。
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadSqlite, createFakeD1, ALL_MIGRATIONS, call } from "./_fake_d1.mjs";
import { accountDeleteStatements, clampRequestId } from "../functions/api/_account.js";
import { onRequest as register } from "../functions/api/auth/register.js";
import { onRequest as login } from "../functions/api/auth/login.js";
import { onRequest as del } from "../functions/api/auth/delete.js";
import { onRequest as save } from "../functions/api/save/index.js";
import { onRequest as scoreSubmit } from "../functions/api/score/submit.js";
import { onRequest as messages } from "../functions/api/social/messages.js";
import { createCloudSave } from "../modules/cloud_save.js";

assert.equal(clampRequestId("short"), null, "short request id refused");
assert.equal(clampRequestId("a b;c--------------------"), null, "bad chars refused");
assert.ok(clampRequestId("3f2b8c1e-0000-4000-8000-000000000001"), "uuid accepted");

// 每张带用户标识的表都要在删除清单里（新加表忘了登记就失败）
{
  const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
  const schema = ["d1_schema.sql", ...ALL_MIGRATIONS].map(read).join("\n");
  const covered = accountDeleteStatements({ id: 1, uid: "u" }).map(([sql]) => sql).join("\n");
  const EXEMPT = new Set(["iap_orders"]); // 交易记录保留期另定，当前无写入
  let seen = 0;
  for (const m of schema.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?(\w+) \(([\s\S]*?)\n\);/g)) {
    const [, table, cols] = m;
    if (!/\b(uid|uid1|uid2|from_uid|to_uid|player1_uid|user_id|winner_uid)\b/.test(cols)) continue;
    if (EXEMPT.has(table)) continue;
    seen += 1;
    assert.ok(new RegExp(`DELETE FROM ${table}\\b`).test(covered), `account deletion covers table ${table}`);
  }
  assert.ok(seen >= 17, `schema scan sees user tables (${seen})`);
}

const DatabaseSync = await loadSqlite();
if (!DatabaseSync) {
  console.log("account-delete-selfcheck: SKIP sqlite part (needs Node >= 22.5)");
  process.exit(0);
}

const db = createFakeD1(DatabaseSync, { migrations: ALL_MIGRATIONS });
const reg = async (username) => {
  const r = await call(register, db, { body: { username, password: "pass-1234" } });
  assert.equal(r.status, 200, `register ${username}`);
  return r.json();
};
const a = await reg("alice");
const b = await reg("bob");
const put = (token, slot, n) =>
  call(save, db, { method: "PUT", url: `https://test.invalid/api/save?slot=${slot}`, token, body: { saveJson: JSON.stringify({ t: n }), updatedAt: n } });
await put(a.token, 0, 1);
await put(a.token, 1, 2);
await put(b.token, 0, 3);

const run = (sql, ...v) => db.raw.prepare(sql).run(...v);
const count = (sql, ...v) => Number(db.raw.prepare(sql).get(...v).n);
for (const [me, other] of [[a.uid, b.uid], [b.uid, a.uid]]) {
  run("INSERT INTO scores(uid,name,updatedAt) VALUES(?,?,1)", me, "n");
  run("INSERT INTO events(ts,type,uid,name,msg) VALUES(1,'t',?,'n','m')", me);
  run("INSERT INTO server_buff_contrib VALUES('exp',?,'n',60,1)", me);
  run("INSERT INTO server_boss_claims VALUES('bully',1,?,1)", me);
  run("INSERT INTO friend_requests(from_uid,to_uid,created_at) VALUES(?,?,1)", me, "carol");
  run("INSERT INTO gift_history(from_uid,to_uid,item_type,quantity,created_at) VALUES(?,?,'x',1,1)", me, "carol");
  run("INSERT INTO friend_messages(from_uid,to_uid,message,created_at) VALUES(?,?,'hi',1)", me, other);
  run("INSERT INTO pvp_invites(from_uid,to_uid,created_at,expires_at) VALUES(?,?,1,2)", me, "carol");
  run("INSERT INTO pvp_battles(invite_id,player1_uid,player2_uid,created_at) VALUES(1,?,?,1)", me, "carol");
  run("INSERT INTO daily_tasks_progress VALUES(?,'2026-11-26','{}',0,1)", me);
  run("INSERT INTO analytics_events(ts,event,uid,created_at) VALUES(1,'session_start',?,1)", me);
  run("INSERT INTO rate_limits(key,count,window_start) VALUES(?,1,1)", `score/submit:${me}`);
}
run("INSERT INTO friends(uid1,uid2,created_at) VALUES(?,?,1)", a.uid, b.uid);
run("INSERT INTO achievement_shares(id,uid,achievement_type,achievement_data,likes,created_at) VALUES(1,?,'t','{}',1,1)", a.uid);
run("INSERT INTO achievement_shares(id,uid,achievement_type,achievement_data,likes,created_at) VALUES(2,?,'t','{}',2,1)", b.uid);
run("INSERT INTO achievement_likes(achievement_id,uid,created_at) VALUES(1,?,1)", b.uid);
run("INSERT INTO achievement_likes(achievement_id,uid,created_at) VALUES(2,?,1)", a.uid);
run("INSERT INTO achievement_likes(achievement_id,uid,created_at) VALUES(2,'carol',1)");

const rid = "3f2b8c1e-0000-4000-8000-000000000001";
const ok = { requestId: rid, confirm: "alice", password: "pass-1234" };

assert.equal((await call(del, db, { method: "GET" })).status, 405, "GET refused");
assert.equal((await call(del, db, { body: ok })).status, 401, "no session refused");
assert.equal((await call(del, db, { token: a.token, body: { ...ok, requestId: "x" } })).status, 400, "request id required");
assert.equal((await call(del, db, { token: a.token, body: { ...ok, confirm: "bob" } })).status, 400, "typed username must match");
assert.equal((await call(del, db, { token: a.token, body: { ...ok, confirm: undefined } })).status, 400, "confirm required");
assert.equal((await call(del, db, { token: a.token, body: { ...ok, password: "wrong" } })).status, 403, "password re-check");
assert.equal(count("SELECT COUNT(*) n FROM users"), 2, "nothing deleted by refused calls");
assert.equal(count("SELECT COUNT(*) n FROM saves WHERE user_id = (SELECT id FROM users WHERE uid = ?)", a.uid), 2, "saves intact");

// 整批回滚：清单里任何一条失败都不能只删一半
{
  db.raw.exec("ALTER TABLE account_deletions RENAME TO account_deletions_off");
  await assert.rejects(() => call(del, db, { token: a.token, body: ok }), /account_deletions/, "missing receipt table aborts");
  assert.equal(count("SELECT COUNT(*) n FROM users"), 2, "rolled back: user kept");
  assert.equal(count("SELECT COUNT(*) n FROM scores WHERE uid = ?", a.uid), 1, "rolled back: score kept");
  db.raw.exec("ALTER TABLE account_deletions_off RENAME TO account_deletions");
  db.raw.exec("DELETE FROM rate_limits WHERE key LIKE 'auth/delete:%'");
}

const done = await call(del, db, { token: a.token, body: ok });
assert.equal(done.status, 200, "delete ok");
assert.deepEqual(await done.json(), { ok: true, deleted: true, already: false });

// 本人在任何表里都不剩
for (const [table, cols] of [
  ["users", ["uid"]], ["scores", ["uid"]], ["events", ["uid"]], ["server_buff_contrib", ["uid"]], ["server_boss_claims", ["uid"]],
  ["friends", ["uid1", "uid2"]], ["friend_requests", ["from_uid", "to_uid"]], ["gift_history", ["from_uid", "to_uid"]],
  ["friend_messages", ["from_uid", "to_uid"]], ["pvp_invites", ["from_uid", "to_uid"]], ["pvp_battles", ["player1_uid", "player2_uid"]],
  ["achievement_shares", ["uid"]], ["achievement_likes", ["uid"]], ["daily_tasks_progress", ["uid"]], ["analytics_events", ["uid"]],
]) {
  for (const c of cols) assert.equal(count(`SELECT COUNT(*) n FROM ${table} WHERE ${c} = ?`, a.uid), 0, `${table}.${c} cleared`);
}
assert.equal(count("SELECT COUNT(*) n FROM rate_limits WHERE key LIKE ?", `%${a.uid}`), 0, "rate limit keys cleared");
assert.equal(count("SELECT COUNT(*) n FROM sessions"), 1, "only bob's session left");
assert.equal(count("SELECT COUNT(*) n FROM saves"), 1, "only bob's save left");

// 别人的东西没动
for (const t of ["scores", "events", "server_buff_contrib", "server_boss_claims", "pvp_invites", "pvp_battles", "daily_tasks_progress", "analytics_events"]) {
  assert.equal(count(`SELECT COUNT(*) n FROM ${t}`), 1, `${t}: bob's row kept`);
}
assert.equal(count("SELECT likes n FROM achievement_shares WHERE id = 2"), 1, "alice's like removed from bob's share");
assert.equal(count("SELECT COUNT(*) n FROM achievement_likes"), 1, "carol's like kept");
assert.equal((await call(login, db, { body: { username: "bob", password: "pass-1234" } })).status, 200, "bob can still log in");
assert.equal((await call(login, db, { body: { username: "alice", password: "pass-1234" } })).status, 401, "alice is gone");

// 幂等：响应丢了再发一次同一请求号 → 已完成；换请求号 → 401
{
  const again = await call(del, db, { token: a.token, body: ok });
  assert.equal(again.status, 200, "retry ok");
  assert.deepEqual(await again.json(), { ok: true, deleted: true, already: true });
  const other = await call(del, db, { token: a.token, body: { ...ok, requestId: "3f2b8c1e-0000-4000-8000-000000000002" } });
  assert.equal(other.status, 401, "unknown request id stays unauthorized");
  assert.equal(count("SELECT COUNT(*) n FROM account_deletions"), 1, "one receipt");
  const cols = db.raw.prepare("SELECT * FROM account_deletions").get();
  assert.deepEqual(Object.keys(cols).sort(), ["deleted_at", "request_id"], "receipt holds no identity");
}

// 同名可重新注册，拿到新 uid
{
  const a2 = await reg("alice");
  assert.notEqual(a2.uid, a.uid, "new account gets a new uid");
}

// 限流
{
  const c = await reg("carla");
  let limited = 0;
  for (let i = 0; i < 7; i++) {
    const r = await call(del, db, { token: c.token, body: { requestId: rid, confirm: "carla", password: "nope" } });
    if (r.status === 429) limited += 1;
  }
  assert.equal(limited, 2, "5 tries per window");
  assert.equal(count("SELECT COUNT(*) n FROM users WHERE username = 'carla'"), 1, "carla kept");
}

// 并发猜密码：同时发 12 次也只放行 5 次
{
  const d = await reg("dora");
  const rs = await Promise.all([...Array(12)].map(() => call(del, db, { token: d.token, body: { requestId: rid, confirm: "dora", password: "nope" } })));
  assert.equal(rs.filter((r) => r.status === 403).length, 5, "parallel tries share one counter");
  assert.equal(rs.filter((r) => r.status === 429).length, 7, "the rest are limited");
}

// 登录接口也限次：不能从那边绕过去猜密码
{
  let limited = 0;
  for (let i = 0; i < 22; i++) if ((await call(login, db, { body: { username: "bob", password: "nope" }, headers: { "CF-Connecting-IP": "203.0.113.7" } })).status === 429) limited += 1;
  assert.equal(limited, 2, "20 login tries per window");
  assert.equal((await call(login, db, { body: { username: "bob", password: "pass-1234" }, headers: { "CF-Connecting-IP": "203.0.113.8" } })).status, 200, "another address is not locked out");
  const keys = db.raw.prepare("SELECT key FROM rate_limits WHERE key LIKE 'auth/login:%'").all().map((x) => x.key);
  assert.ok(keys.every((k) => /^auth\/login:ip:[0-9a-f]{24}$/.test(k)), "login limiter stores neither name nor address");
}

// 注销后：给已注销的编号留言被拒；迟到的榜单提交不会把人写回去
{
  const before = count("SELECT COUNT(*) n FROM friend_messages");
  assert.equal((await call(messages, db, { token: b.token, body: { toUid: a.uid, message: "在吗" } })).status, 404, "no message to a deleted account");
  assert.equal(count("SELECT COUNT(*) n FROM friend_messages"), before, "nothing stored");

  const e = await reg("erin");
  const racing = {
    ...db,
    prepare: (sql) => {
      // 登录态校验通过之后、写榜之前，账号刚好删完
      if (/^INSERT INTO scores/.test(sql.trim())) {
        db.raw.exec("DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE username = 'erin')");
        db.raw.exec("DELETE FROM users WHERE username = 'erin'");
      }
      return db.prepare(sql);
    },
  };
  assert.equal((await call(scoreSubmit, racing, { token: e.token, body: { name: "erin", power: 9 } })).status, 200, "late submit answered");
  assert.equal(count("SELECT COUNT(*) n FROM scores WHERE uid = ?", e.uid), 0, "late submit leaves no row");
  assert.equal((await call(scoreSubmit, db, { token: b.token, body: { name: "bob", power: 7 } })).status, 200, "normal submit");
  assert.equal(count("SELECT power n FROM scores WHERE uid = ?", b.uid), 7, "normal submit still updates the row");
}

// 客户端：请求号跟着账号走
{
  const store = new Map();
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => void store.set(k, String(v)), removeItem: (k) => void store.delete(k) };
  globalThis.window = { setInterval: () => 1, clearInterval: () => {} };
  const sent = [];
  let mode = "lost";
  globalThis.fetch = async (path, opt) => {
    sent.push({ path, body: opt?.body ? JSON.parse(opt.body) : null });
    if (mode === "lost") throw new TypeError("network");
    return new Response(JSON.stringify({ ok: true, deleted: true }), { status: 200 });
  };
  const signIn = (name) => {
    store.set("mengling_idle_cloud_token_v1", `t-${name}`);
    store.set("mengling_idle_cloud_user_v1", name);
  };
  const cloud = createCloudSave({ encodeSaveText: (x) => x, decodeSaveText: (x) => x, autosaveKey: "a", slotKeys: [] });
  const ids = () => sent.filter((x) => x.path === "/api/auth/delete").map((x) => x.body.requestId);
  signIn("alice");
  await assert.rejects(() => cloud.deleteAccount({ confirm: "alice", password: "p" }));
  await assert.rejects(() => cloud.deleteAccount({ confirm: "alice", password: "p" }));
  assert.equal(ids()[0], ids()[1], "retry keeps the same request id");
  signIn("bob");
  mode = "ok";
  await cloud.deleteAccount({ confirm: "bob", password: "p" });
  assert.notEqual(ids()[2], ids()[0], "another account never reuses a pending id");
  assert.ok(!cloud.isLoggedIn() && cloud.getUsername() === "" && cloud.getCloudUid() === "", "login state cleared after deletion");
  assert.equal(store.has("mengling_idle_account_delete_req_v1"), false, "request id forgotten after success");
}

console.log("account-delete-selfcheck: OK");
