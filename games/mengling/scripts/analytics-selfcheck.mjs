#!/usr/bin/env node
// 匿名留存统计：客户端白名单 / 只发一次 / 可关；服务端白名单、不存账号与 IP、聚合结果。进程内，不开端口。
import { readFileSync } from "node:fs";
import {
  FUNNEL_EVENTS,
  SESSION_BUCKETS_MIN,
  sanitizeEventName,
  sanitizeProps,
  mergeQueues,
  buildIngestPayload,
  createAnalytics,
  dayDiff,
  returnEvent,
  bucketsCrossed,
  isAnalyticsEnabled,
  setAnalyticsEnabled,
  shouldAskAnalytics,
} from "../modules/analytics.js";
import { mergeRemoteConfig, REMOTE_CONFIG_DEFAULTS } from "../modules/remote_config.js";
import { ALLOWED_EVENTS, SESSION_BUCKETS_MIN as SERVER_BUCKETS, normalizeEvents, queryRetention, clampDays } from "../functions/api/_retention.js";
import { onRequest as ingest } from "../functions/api/ops/ingest.js";
import { onRequest as retention, sameKey } from "../functions/api/ops/retention.js";
import { canConfirmDelete, deleteErrorText, initPrivacyPanel } from "../modules/app/privacy_panel.js";
import { LEGAL_DRAFT } from "../modules/legal_status.js";
import { loadSqlite, createFakeD1, ALL_MIGRATIONS, call } from "./_fake_d1.mjs";

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  }
}

const OPT = "mengling_idle_analytics_opt_v1";
const consented = (init = {}) => memStorage({ [OPT]: "on", ...init });
function memStorage(init = {}) {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
    keys: () => [...m.keys()],
  };
}
const QUEUE = "mengling_idle_analytics_queue_v1";
const queued = (s) => JSON.parse(s.getItem(QUEUE) || "[]");

// ── 客户端：事件与属性白名单 ──
assert(
  FUNNEL_EVENTS.join(",") === "session_start,register,first_battle,first_capture,first_rebirth,return_d1,return_d7,session_time",
  "only the retention events"
);
assert([...ALLOWED_EVENTS].sort().join() === [...FUNNEL_EVENTS].sort().join(), "client and server whitelists agree");
assert(SERVER_BUCKETS.join() === SESSION_BUCKETS_MIN.join(), "client and server buckets agree");
assert(sanitizeEventName("session_start") === "session_start", "valid event");
assert(sanitizeEventName("BAD") === "", "reject bad event");
{
  const p = sanitizeProps({ cohort: "2026-11-26", new: true, bucket: 5, uid: "u1", name: "alice", note: "x", dex: 25 });
  assert(JSON.stringify(p) === JSON.stringify({ cohort: "2026-11-26", new: true, bucket: 5 }), "props whitelist only");
  assert(Object.keys(sanitizeProps({ cohort: "yesterday", bucket: 7, new: 1 })).length === 0, "bad values dropped");
}
assert(mergeQueues([{ a: 1 }], [{ b: 2 }]).length === 2, "merge");
assert(mergeQueues([{ a: 1 }], [{ b: 2 }], 1).length === 1, "merge cap");
{
  const payload = buildIngestPayload(
    [
      { event: "session_start", ts: 1000, props: { new: true, uid: "leak" } },
      { event: "gather_click", ts: 1001 },
      { event: "session_time", ts: 1002, props: { bucket: 1 }, sessionId: "older" },
    ],
    { sessionId: "sess", gameVersion: "0.7.58" }
  );
  assert(payload.events.length === 2, "retired events filtered");
  assert(payload.events[0].sessionId === "sess" && payload.events[1].sessionId === "older", "event keeps its own session");
  assert(!JSON.stringify(payload).includes("uid") && !JSON.stringify(payload).includes("leak"), "payload carries no uid");
}

// ── 客户端：回访与时长 ──
assert(dayDiff("2026-11-26", "2026-11-27") === 1, "day diff");
assert(dayDiff("2026-12-31", "2027-01-07") === 7, "day diff across year");
assert(Number.isNaN(dayDiff("legacy", "2026-11-27")), "legacy cohort has no day diff");
assert(returnEvent("2026-11-26", "2026-11-27") === "return_d1" && returnEvent("2026-11-26", "2026-12-03") === "return_d7", "d1 / d7");
assert(returnEvent("2026-11-26", "2026-11-26") === "" && returnEvent("2026-11-26", "2026-11-28") === "" && returnEvent("legacy", "2026-11-27") === "", "other days silent");
assert(bucketsCrossed(0, 59999).length === 0 && bucketsCrossed(45000, 60000).join() === "1", "1 minute bucket");
assert(bucketsCrossed(0, 3600000).join() === "1,5,15,30,60" && bucketsCrossed(3600000, 7200000).length === 0, "each bucket once");

{
  const s = consented();
  const day1 = createAnalytics({ storage: s, gameVersion: "t" });
  day1.startSession({ isNewPlayer: true, today: "2026-11-26" });
  day1.startSession({ isNewPlayer: true, today: "2026-11-26" });
  day1.trackOnce("first_capture");
  day1.trackOnce("first_capture");
  day1.trackOnce("first_battle", { already: true });
  day1.track("gather_click");
  day1.addActiveTime(60000);
  day1.addActiveTime(1000);
  const q1 = queued(s);
  assert(q1.map((e) => e.event).join() === "session_start,first_capture,session_time", `day1 events: ${q1.map((e) => e.event).join()}`);
  assert(q1[0].props.new === true && q1.every((e) => e.props.cohort === "2026-11-26"), "new player cohort stamped");

  s.setItem(QUEUE, "[]");
  const day2 = createAnalytics({ storage: s });
  day2.startSession({ isNewPlayer: false, today: "2026-11-27" });
  day2.trackOnce("first_battle");
  const again = createAnalytics({ storage: s });
  again.startSession({ today: "2026-11-27" });
  assert(queued(s).map((e) => e.event).join() === "session_start,return_d1,session_start", "d1 once, old-save battle never counted as first");
  assert(queued(s)[0].props.new === false, "returning session is not new");
}
{
  // 老玩家（更新前就有存档）：不进新手批次，也不会被算成次日回访
  const s = consented({ mengling_idle_analytics_first_capture_v1: "1" });
  const a = createAnalytics({ storage: s });
  a.startSession({ isNewPlayer: false, today: "2026-11-26" });
  a.trackOnce("first_capture");
  const q = queued(s);
  assert(q.length === 1 && q[0].props.cohort === "legacy" && q[0].props.new === false, "legacy players kept out of cohorts");
}
{
  // 没表态 = 关：草案期和正式版都不记；正式版只多问一次
  const s0 = memStorage();
  const a0 = createAnalytics({ storage: s0 });
  assert(isAnalyticsEnabled(s0) === false && a0.isEnabled() === false, "off until the player agrees");
  a0.startSession({ isNewPlayer: true, today: "2026-11-26" });
  a0.trackOnce("first_battle");
  a0.addActiveTime(600000);
  assert(queued(s0).length === 0, "nothing recorded before consent");
  assert(shouldAskAnalytics(s0, true) === false && shouldAskAnalytics(s0, false) === true, "draft never asks, the published policy asks once");
  assert(a0.shouldAsk() === !LEGAL_DRAFT, "default follows the draft switch");
  a0.setEnabled(true);
  assert(queued(s0).map((e) => e.event).join() === "session_start" && queued(s0)[0].props.new === true, "agreeing records this session only, not what happened before");
  a0.setEnabled(true);
  assert(queued(s0).length === 1, "agreeing twice does not count twice");
  a0.trackOnce("first_battle");
  assert(queued(s0).length === 1, "the first battle before consent is never sent");
  assert(shouldAskAnalytics(s0, false) === false, "answered: not asked again");
  const refused = memStorage({ [OPT]: "off" });
  assert(shouldAskAnalytics(refused, false) === false && !isAnalyticsEnabled(refused), "a refusal from an earlier version is kept");
  const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); }, removeItem: () => {} };
  assert(isAnalyticsEnabled(broken) === false && shouldAskAnalytics(broken, false) === false && shouldAskAnalytics(null, false) === false, "unreadable storage means off");
}
{
  // 开关：同意后记；关掉立即停并清空；重新打开后不会补发「第一次」
  const s = consented();
  assert(isAnalyticsEnabled(s) === true, "on after consent");
  const a = createAnalytics({ storage: s });
  a.startSession({ isNewPlayer: true, today: "2026-11-26" });
  assert(queued(s).length === 1, "queued while on");
  a.setEnabled(false);
  assert(!isAnalyticsEnabled(s) && s.getItem(QUEUE) === null, "off clears the queue");
  a.trackOnce("first_battle");
  a.addActiveTime(600000);
  assert(queued(s).length === 0, "nothing recorded while off");
  setAnalyticsEnabled(s, true);
  a.trackOnce("first_battle");
  assert(queued(s).length === 0, "no late first event after re-enabling");
  a.setRemoteEnabled(false);
  a.track("session_start");
  assert(queued(s).length === 0 && a.isEnabled() === false, "remote flag stops it too");
}

assert(mergeRemoteConfig(null).seasonId === REMOTE_CONFIG_DEFAULTS.seasonId, "remote defaults");
assert(mergeRemoteConfig({ seasonId: "s2", shopDefaultFold: { daily: true } }).shopDefaultFold.daily === true, "remote fold");

// ── 设置页：开关与注销弹窗（假 DOM，不开浏览器） ──
assert(canConfirmDelete({ username: "alice", typedName: " alice ", password: "x" }) === true, "typed name + password");
assert(!canConfirmDelete({ username: "alice", typedName: "Alice", password: "x" }) && !canConfirmDelete({ username: "alice", typedName: "alice", password: "" }), "mismatch / empty blocked");
assert(!canConfirmDelete({ username: "", typedName: "", password: "x" }), "logged out blocked");
assert(deleteErrorText({ status: 403 }) === "密码不对" && deleteErrorText(new Error("x")).startsWith("没连上"), "readable errors");
{
  const mk = () => {
    const on = {};
    return {
      hidden: true, value: "", textContent: "", disabled: false, attrs: {},
      addEventListener: (t, f) => { on[t] = f; },
      setAttribute(k, v) { this.attrs[k] = v; },
      getAttribute(k) { return this.attrs[k] ?? null; },
      focus() {},
      fire: (t) => on[t]?.(),
    };
  };
  const ids = ["analyticsAskOverlay", "btnAnalyticsYes", "btnAnalyticsNo", "btnAnalyticsToggle", "accountDeleteOverlay", "accountDeleteName", "accountDeletePassword", "btnAccountDeleteConfirm", "btnAccountDeleteCancel", "accountDeleteStatus", "btnAccountDelete"];
  const els = Object.fromEntries(ids.map((id) => [id, mk()]));
  const link = mk();
  link.attrs["data-legal"] = "隐私政策";
  const doc = { getElementById: (id) => els[id] || null, querySelectorAll: () => [link] };
  const s = consented();
  const analytics = createAnalytics({ storage: s });
  const calls = [];
  let loggedIn = false;
  let fail = null;
  const cloudSave = {
    isLoggedIn: () => loggedIn,
    getUsername: () => (loggedIn ? "alice" : ""),
    deleteAccount: async (a) => {
      calls.push(a);
      if (fail) throw fail;
      loggedIn = false;
    },
  };
  let deleted = 0;
  initPrivacyPanel({ analytics, cloudSave, hint: () => {}, addLog: () => {}, onAccountDeleted: () => { deleted += 1; }, doc });
  assert(link.textContent === (LEGAL_DRAFT ? "隐私政策（草案）" : "隐私政策"), "legal link shows draft state");
  assert(els.btnAnalyticsToggle.textContent.endsWith("开"), "toggle shows the stored choice");
  assert(els.analyticsAskOverlay.hidden === true, "no prompt once the player has answered");
  els.btnAnalyticsToggle.fire("click");
  assert(els.btnAnalyticsToggle.textContent.endsWith("关") && !isAnalyticsEnabled(s), "toggle turns off");
  for (const [draft, pick] of [[true, null], [false, "btnAnalyticsYes"], [false, "btnAnalyticsNo"]]) {
    const els2 = Object.fromEntries(ids.map((id) => [id, mk()]));
    const s2 = memStorage();
    const an2 = createAnalytics({ storage: s2 });
    an2.startSession({ isNewPlayer: true, today: "2026-11-26" });
    initPrivacyPanel({ analytics: an2, cloudSave, hint: () => {}, doc: { getElementById: (id) => els2[id] || null, querySelectorAll: () => [] }, draft });
    assert(els2.btnAnalyticsToggle.textContent.endsWith("关"), "toggle starts off");
    assert(els2.analyticsAskOverlay.hidden === draft, `prompt ${draft ? "hidden while draft" : "shown once published"}`);
    if (!pick) continue;
    els2[pick].fire("click");
    const yes = pick === "btnAnalyticsYes";
    assert(els2.analyticsAskOverlay.hidden === true && isAnalyticsEnabled(s2) === yes && queued(s2).length === (yes ? 1 : 0), `${pick} is remembered`);
    assert(els2.btnAnalyticsToggle.textContent.endsWith(yes ? "开" : "关"), `${pick} updates the toggle`);
  }

  els.btnAccountDelete.fire("click");
  assert(els.accountDeleteOverlay.hidden === true, "logged out: no dialog");
  loggedIn = true;
  els.btnAccountDelete.fire("click");
  assert(els.accountDeleteOverlay.hidden === false && els.btnAccountDeleteConfirm.disabled === true, "dialog opens with confirm disabled");
  els.accountDeleteName.value = "alice";
  els.accountDeleteName.fire("input");
  assert(els.btnAccountDeleteConfirm.disabled === true, "needs password too");
  els.accountDeletePassword.value = " bad ";
  els.accountDeletePassword.fire("input");
  assert(els.btnAccountDeleteConfirm.disabled === false, "both filled");
  fail = Object.assign(new Error("invalid credentials"), { status: 403 });
  await els.btnAccountDeleteConfirm.fire("click");
  assert(els.accountDeleteOverlay.hidden === false && els.accountDeleteStatus.textContent === "密码不对" && deleted === 0, "wrong password stays in dialog");
  fail = null;
  await els.btnAccountDeleteConfirm.fire("click");
  assert(els.accountDeleteOverlay.hidden === true && deleted === 1 && calls.length === 2, "success closes dialog");
  assert(calls.every((c) => c.password === "bad"), "password trimmed the same way as at sign-up");
  assert(els.accountDeletePassword.value === "" && els.accountDeleteName.value === "", "inputs wiped");
}

// ── 草案开关 ──
{
  const html = ["privacy", "terms"].map((n) => readFileSync(new URL(`../legal/${n}.html`, import.meta.url), "utf8"));
  for (const h of html) {
    assert(h.includes("applyLegalPage") && h.includes("legalDate"), "legal page wired to the draft switch");
    assert(/id="legalDraft">草案/.test(h), "draft banner visible by default");
    if (!LEGAL_DRAFT) assert(!h.includes("待填"), "no placeholders once published");
  }
  assert(html[0].includes("默认关") && !html[0].includes("默认开启") && html[0].includes("草案期不问"), "privacy page says off by default");
  for (const name of ["匿名统计", "注销账号", "第 7 天回来", "Google Fonts"]) assert(html[0].includes(name), `privacy page mentions ${name}`);
  const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  for (const id of ["analyticsAskOverlay", "btnAnalyticsYes", "btnAnalyticsNo", "btnAnalyticsToggle", "btnAccountDelete", "accountDeleteOverlay", "accountDeleteName", "accountDeletePassword", "btnAccountDeleteConfirm"]) {
    assert(index.includes(`id="${id}"`), `index has #${id}`);
  }
}

// ── 服务端：白名单与聚合 ──
{
  const { events, received } = normalizeEvents(
    { events: [{ event: "first_battle", ts: 9e15, uid: "u", props: { cohort: "2026-11-26", uid: "u", name: "n" }, gameVersion: "0.7.58" }, { event: "futurecoin_spend", ts: 1 }] },
    5000
  );
  assert(received === 2 && events.length === 1, "server drops unknown events");
  assert(events[0].ts === 5000, "future timestamps clamped");
  assert(JSON.stringify(events[0]) === JSON.stringify({ event: "first_battle", ts: 5000, sessionId: "", props: { cohort: "2026-11-26", gameVersion: "0.7.58" } }), "server keeps whitelisted fields only");
}
assert(clampDays(null) === 30 && clampDays("7") === 7 && clampDays("9999") === 180 && clampDays("0") === 1, "days clamp");
assert(sameKey("abcdefghijklmnop", "abcdefghijklmnop") && !sameKey("abcdefghijklmnoq", "abcdefghijklmnop") && !sameKey("", "") && !sameKey("abc", "abcabc") && !sameKey(null, "x"), "key compare");

const DatabaseSync = await loadSqlite();
if (!DatabaseSync) {
  console.log("analytics-selfcheck: SKIP sqlite part (needs Node >= 22.5)");
} else {
  const db = createFakeD1(DatabaseSync, { migrations: ALL_MIGRATIONS });
  const post = (events, headers = {}) => call(ingest, db, { body: { events }, headers: { "CF-Connecting-IP": "203.0.113.9", ...headers } });
  const ev = (event, sessionId, props = {}) => ({ event, ts: Date.now(), sessionId, props, uid: "acct-1", gameVersion: "0.7.58" });
  const C = "2026-11-26";

  assert((await post([])).status === 400, "empty batch refused");
  const old = await post([{ event: "gather_click", ts: 1 }]);
  assert(old.status === 200 && (await old.json()).accepted === 0, "retired events acknowledged but not stored");

  const batch = [];
  for (let i = 0; i < 4; i++) batch.push(ev("session_start", `n${i}`, { new: true, cohort: C }));
  batch.push(ev("session_start", "back1", { new: false, cohort: C }), ev("return_d1", "back1", { cohort: C }));
  batch.push(ev("session_start", "back7", { new: false, cohort: C }), ev("return_d7", "back7", { cohort: C }));
  batch.push(ev("session_start", "vet", { new: false, cohort: "legacy" }));
  for (const s of ["n0", "n1", "n2"]) batch.push(ev("first_capture", s, { cohort: C }));
  for (const s of ["n0", "n1"]) batch.push(ev("first_battle", s, { cohort: C }));
  batch.push(ev("register", "n0", { cohort: C }), ev("first_rebirth", "vet", { cohort: "legacy" }));
  for (const [s, m] of [["n0", 1], ["n0", 5], ["n1", 1], ["vet", 1], ["vet", 5], ["vet", 15], ["vet", 30], ["vet", 60]]) batch.push(ev("session_time", s, { bucket: m }));
  const r = await post(batch, { Authorization: "Bearer whatever" });
  assert(r.status === 200 && (await r.json()).accepted === batch.length, "batch accepted");

  const rows = db.raw.prepare("SELECT * FROM analytics_events").all();
  assert(rows.length === batch.length && rows.every((x) => x.uid === null), "no account uid stored");
  assert(!JSON.stringify(rows).includes("203.0.113.9") && !JSON.stringify(rows).includes("acct-1"), "no ip / uid anywhere in rows");
  const keys = db.raw.prepare("SELECT key FROM rate_limits").all().map((x) => x.key);
  assert(keys.length === 1 && /^ops\/ingest:ip:[0-9a-f]{24}$/.test(keys[0]), `rate limit key is hashed (${keys.join()})`);

  const out = await queryRetention(db, { days: 30 });
  assert(out.events.session_start.count === 7 && out.events.register.count === 1 && out.events.first_rebirth.count === 1, "per-event counts");
  assert(out.cohorts.length === 1 && out.cohorts[0].cohort === C && out.cohorts[0].players === 4, "one cohort, legacy excluded");
  assert(out.cohorts[0].newbieRate === 0.75 && out.cohorts[0].d1Rate === 0.25 && out.cohorts[0].d7Rate === 0.25, "rates");
  assert(JSON.stringify(out.sessionMinutes) === JSON.stringify({ "<1": 4, "1-5": 1, "5-15": 1, "15-30": 0, "30-60": 0, ">=60": 1 }), `session buckets ${JSON.stringify(out.sessionMinutes)}`);

  const get = (headers, env) => call(retention, db, { method: "GET", url: "https://test.invalid/api/ops/retention?days=7", headers, env });
  assert((await get({}, {})).status === 501, "unconfigured key refuses");
  assert((await get({ "X-Ops-Key": "short" }, { OPS_ADMIN_KEY: "short" })).status === 501, "weak key refuses");
  const KEY = "test-ops-key-0123456789";
  assert((await get({}, { OPS_ADMIN_KEY: KEY })).status === 401, "missing key");
  assert((await get({ "X-Ops-Key": `${KEY}x` }, { OPS_ADMIN_KEY: KEY })).status === 401, "wrong key");
  const okRes = await get({ "X-Ops-Key": KEY }, { OPS_ADMIN_KEY: KEY });
  const okJson = await okRes.json();
  assert(okRes.status === 200 && okJson.ok === true && okJson.days === 7 && okJson.cohorts.length === 1, "aggregates returned");
  assert(!("rows" in okJson) && !JSON.stringify(okJson).includes("n0"), "aggregates only, no session ids");

  let limited = 0;
  for (let i = 0; i < 65; i++) if ((await post([{ event: "ops_probe" }])).status === 429) limited += 1;
  assert(limited > 0, "ingest still rate limited");
}

if (failed) {
  console.error(`analytics-selfcheck: ${failed} failed`);
  process.exit(1);
}
console.log("analytics-selfcheck: ok");
