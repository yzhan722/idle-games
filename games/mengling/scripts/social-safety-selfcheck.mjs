#!/usr/bin/env node
// 玩家交流管控（ML-COM3）：屏蔽、举报、只收好友私信、昵称屏蔽词、旧数据打码、到期清理、几率公示。
// 进程内内存库（node:sqlite），不开端口、不连真 D1、不开浏览器。
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadSqlite, createFakeD1, ALL_MIGRATIONS, call } from "./_fake_d1.mjs";
import { checkName, displayName, maskText } from "../modules/name_filter.js";
import { NAME_FILTER_WORDS } from "../modules/name_filter_words.js";
import { REPORT_REASON_LABELS, createSocialSystem, safetyFailMsg } from "../modules/social.js";
import { DM_LABEL_OFF, DM_LABEL_ON, initDmFriendsOnly } from "../modules/app/privacy_panel.js";
import { DAILY_SPIN_REWARDS, dailySpinOddsLine } from "../modules/systems/gameplay_fun.js";
import { ADV_SHINY_BASE_DENOM, WILD_SHINY_BASE_DENOM, wildShinyOddsLine, wildShinyRate } from "../modules/systems/ball_catch.js";
import { cleanLeaderboard } from "../modules/systems/world_presence.js";
import { ERA_DEFS } from "../modules/defs_eras.js";
import { CAPTURE_AREAS } from "../modules/config.js";
import { SERVER_BUFF_UI } from "../modules/systems/server_buffs.js";
import { listNpcTrainers } from "../modules/systems/npc_pvp.js";
import { summarizePvpBattle } from "../modules/systems/pvp_narrative.js";
import {
  BLOCK_LIMIT,
  REPORT_REASONS,
  REPORT_RETENTION_DAYS,
  REPORT_SNAPSHOT_MESSAGES,
  lacksSafetyTable,
  maybePruneReports,
  pruneExpiredReports,
} from "../functions/api/_social_safety.js";
import { onRequest as register } from "../functions/api/auth/register.js";
import { onRequest as del } from "../functions/api/auth/delete.js";
import { onRequest as messages } from "../functions/api/social/messages.js";
import { onRequest as block } from "../functions/api/social/block.js";
import { onRequest as prefs } from "../functions/api/social/prefs.js";
import { onRequest as report } from "../functions/api/social/report.js";
import { onRequest as achievements } from "../functions/api/social/achievements.js";
import { onRequest as friendProfile } from "../functions/api/social/friend-profile.js";
import { onRequest as pvpInvite } from "../functions/api/social/pvp-invite.js";
import { onRequest as pvpInvites } from "../functions/api/social/pvp-invites.js";
import { onRequest as pvpAccept } from "../functions/api/social/pvp-accept.js";
import { onRequest as friendRequest } from "../functions/api/friends/request.js";
import { onRequest as friendList } from "../functions/api/friends/list.js";
import { onRequest as leaderboard } from "../functions/api/leaderboard/[board].js";
import { onRequest as scoreSubmit } from "../functions/api/score/submit.js";
import { onRequest as eventsPush } from "../functions/api/events/push.js";
import { onRequest as eventsPull } from "../functions/api/events/pull.js";
import { onRequest as buffs } from "../functions/api/server/buffs/index.js";
import { onRequest as opsReports } from "../functions/api/ops/reports.js";

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const DAY = 24 * 60 * 60 * 1000;

// ---------- 一、屏蔽词：变体、不误伤、打码 ----------
{
  const hit = [
    "傻逼", "傻 逼", "傻_逼", "傻Ｂ", "去 死", "官方客服", "官　方", "管理員小王", "系统消息", "GM小明", "trainer_gm",
    "admin", "Admin_01", "Ａｄｍｉｎ", "ADMIN", "a d m i n", "adm1n", "4dmin", "Ⓐⓓⓜⓘⓝ", "my admin",
    "fuсk" /* 西里尔 с */, "f​u​ck", "bullshit", "s h i t", "nazi", "s e x", "kys", "Mod", "希特勒来了", "fυck" /* 希腊 υ 不算 u */,
  ];
  for (const s of hit.slice(0, -1)) assert.equal(checkName(s).ok, false, `应命中：${JSON.stringify(s)}`);
  const ok = [
    "", "育灵师", "小明", "badminton", "class", "glass hit", "this hit", "pigment", "model", "modern", "skys", "Sexybeast", "gma",
    "Assassin", "Scunthorpe", "grape", "analysis", "Dick", "Mike", "小鸡快跑", "妈妈的猫", "生日你好", "超级系列", "公主", "光明使者",
  ];
  for (const s of ok) assert.equal(checkName(s).ok, true, `不该命中：${JSON.stringify(s)} → ${JSON.stringify(checkName(s).hits)}`);
  // 「fυck」里的 υ 被当成 u，也命中
  assert.equal(checkName("fυck").ok, false, "希腊同形字母");
  // 打码只盖命中的字（连同中间的空格符号），其余原样
  assert.equal(maskText("我是傻 逼吗"), "我是***吗");
  assert.equal(maskText("Admin_01"), "*****_01");
  assert.equal(maskText("GM小明"), "**小明");
  assert.equal(maskText("this hit is fine"), "this hit is fine");
  // 纯数字不当字母读（播报里的数量、等级、战力）；常见词跨词凑出的不算（放行词）
  for (const s of ["恭喜获得 455 金币", "Lv.455", "第455关", "战力 2455", "80085", "叫做爱丽丝", "做爱心便当", "路口交通", "出口交易", "支援交流"]) {
    assert.equal(maskText(s), s, `误伤：${s}`);
  }
  for (const s of ["a55", "4ss", "s3x", "5h1t", "做爱", "口交", "援交"]) assert.equal(checkName(s).ok, false, `应命中：${s}`);
  assert.equal(maskText("455 傻逼 455"), "455 ** 455");
  assert.equal(maskText("叫做爱丽丝，做爱"), "叫做爱丽丝，**", "放行只管它盖住的那一处");
  assert.equal(maskText(null), "");
  // 显示名：只剩星号或空的用默认名；最长 32
  assert.equal(displayName("傻逼"), "育灵师");
  assert.equal(displayName("   "), "育灵师");
  assert.equal(displayName("小明"), "小明");
  assert.equal(displayName("x".repeat(40)).length, 32);
  assert.deepEqual(checkName("官方客服").hits.map((h) => h.category), ["impersonation", "impersonation"]);
  // 词表四类都在、人工可增删
  assert.deepEqual(Object.keys(NAME_FILTER_WORDS).sort(), ["abuse", "hate", "impersonation", "sexual"]);
  assert.match(read("modules/name_filter_words.js"), /人工可增删/);

  // 不误伤：全部萌灵名与称号、纪元、区域、NPC、全服增益、播报原文
  globalThis.window = globalThis;
  await import("../data/beasts.js");
  const names = [
    ...Object.values(globalThis.BEAST_ZH),
    ...Object.values(globalThis.BEAST_TITLE),
    ...ERA_DEFS.map((e) => e.name),
    ...CAPTURE_AREAS.map((a) => a.name),
    ...listNpcTrainers().map((t) => t.name),
    ...Object.values(SERVER_BUFF_UI).map((b) => b.name),
    "育灵师", "林佬",
  ];
  assert.ok(names.length > 320, `names to scan (${names.length})`);
  for (const n of names) assert.equal(checkName(n).ok, true, `误伤游戏里的名字：${n} → ${JSON.stringify(checkName(n).hits)}`);
  const beasts = Object.values(globalThis.BEAST_ZH);
  const templates = [
    ...beasts.flatMap((b) => [`育灵师：捕捉成功 ${b}`, `育灵师：捕捉到闪光 ${b}`, `育灵师：遭遇幻灵 ${b}`, `育灵师：进化成功 ${b} → ${b}`]),
    ...ERA_DEFS.map((e) => `育灵师：迈入时代 ${e.name}`),
    ...CAPTURE_AREAS.map((a) => `育灵师：解锁新区域 ${a.name}`),
    ...Object.values(SERVER_BUFF_UI).map((b) => `育灵师：贡献全服增益 ${b.name}（+10 分钟）`),
    "育灵师：新手：球已到手，去捕捉", "育灵师：新手：第一只到手，去看排行榜", "育灵师：远征完成（急行）", "育灵师：恐吓林佬：HP 10/100",
    "育灵师：林佬被击败：奖励已刷新", "育灵师：发出了好友请求", "育灵师：接受了好友请求", "育灵师：发起了好友对战", "育灵师：好友对战：胜利",
    `育灵师：${summarizePvpBattle({ winner: 2, rounds: 3, battleLog: [] }, "你")}`,
    `育灵师：${summarizePvpBattle({ winner: 1, rounds: 5, battleLog: [] }, "你")}`,
  ];
  for (const t of templates) assert.equal(maskText(t), t, `误伤播报：${t}`);
}

// ---------- 二、前后端共用一份规则；入口在已有界面里 ----------
{
  assert.match(read("functions/api/_uid.js"), /from "\.\.\/\.\.\/modules\/name_filter\.js"/, "服务端 import 同一个模块");
  for (const f of ["modules/tabs/leaderboard_tab.js", "modules/app/leaderboard_core.js", "modules/app/save_cloud.js", "modules/app/ticker.js", "modules/systems/world_presence.js"]) {
    assert.match(read(f), /from "\.\.\/name_filter\.js"/, `${f} 用同一份规则`);
  }
  assert.ok(!/document|window|localStorage|fetch\(/.test(read("modules/name_filter.js").replace(/\/\/.*$/gm, "")), "name_filter 是纯模块");
  // 服务端举报原因与界面一致
  assert.deepEqual(REPORT_REASON_LABELS, { ...REPORT_REASONS });
  // 入口：名片、私信行、好友行、申请行上的「⋯」；不加新页
  const rs = read("modules/render/social.js");
  assert.ok((rs.match(/safetyMenuButton\(escapeHtml, /g) || []).length >= 2, "私信行与名片有「⋯」");
  assert.ok((read("modules/friends.js").match(/safetyMenuButton\(escapeHtml, /g) || []).length >= 2, "好友行与申请行有「⋯」");
  const tab = read("modules/tabs/social_tab.js");
  assert.ok(tab.includes("data-safety-menu") && tab.includes("data-safety-unblock") && tab.includes("function openSafetyMenu("), "弹窗与解除");
  assert.ok(!/发送好友请求`\)|向 \$\{friendName\}|对战 \$\{opp\}：胜利`\)\s*;\s*$/m.test(tab) && !tab.includes("`向 ${name} 发送好友请求`"), "全服播报不带对方名字");
  assert.match(read("index.html"), /id="btnDmFriendsOnly"[^>]*>私信：只收好友</);
  assert.equal(safetyFailMsg({ body: { error: "friends only" } }), "对方只收好友私信");
  assert.equal(safetyFailMsg({ status: 403 }), "", "其他 403 还是按登录问题处理");
}

// ---------- 三、几率公示 ----------
{
  const total = DAILY_SPIN_REWARDS.reduce((s, r) => s + r.w, 0);
  assert.equal(total, 100);
  assert.deepEqual(DAILY_SPIN_REWARDS.map((r) => r.w), [40, 28, 15, 12, 5]);
  assert.equal(dailySpinOddsLine(), "几率：+5币 40% · +15币 28% · +30币 15% · 大灵果 12% · +80币 5%");
  assert.match(read("modules/render/future.js"), /\$\{dailySpinOddsLine\(\)\}/);
  assert.match(read("modules/render/tab_stages.js"), /title="\$\{dailySpinOddsLine\(\)\}"/);
  assert.ok(!read("modules/render/tab_stages.js").includes("抽取奇珍"), "不写与奖品不符的「抽取奇珍」");
  assert.ok(!read("modules/render/future.js").includes("诚实表"), "写出数字，不只说「诚实表」");
  assert.equal(WILD_SHINY_BASE_DENOM, 4096);
  assert.equal(wildShinyRate({}), 1 / 4096);
  assert.equal(wildShinyRate({ charmOn: true, shinyMul: 1 }), 2 / 4096);
  assert.equal(wildShinyOddsLine(wildShinyRate({})), "闪光 1/4096");
  assert.equal(wildShinyOddsLine(wildShinyRate({ charmOn: true })), "闪光 1/2048（基础 1/4096）", "正好翻倍不写「约」");
  assert.equal(wildShinyOddsLine(wildShinyRate({ charmOn: true, shinyMul: 1.1 })), "闪光约 1/1862（基础 1/4096）", "除不尽才写「约」");
  assert.match(read("modules/tabs/capture_tab.js"), /const shinyRate = wildShinyRate\(\{ charmOn, shinyMul: techEff\.shinyChanceMul \}\);/, "实际投掷用同一个算法");
  // 高级遭遇另算 1/1024：投掷与按钮提示同源，不再自己写一份
  assert.equal(ADV_SHINY_BASE_DENOM, 1024);
  assert.equal(wildShinyRate({ advanced: true }), 1 / 1024);
  assert.equal(wildShinyOddsLine(wildShinyRate({ advanced: true }), { advanced: true }), "高级遭遇闪光 1/1024");
  assert.equal(wildShinyOddsLine(wildShinyRate({ advanced: true, charmOn: true }), { advanced: true }), "高级遭遇闪光 1/512（基础 1/1024）");
  assert.match(read("modules/tabs/capture_tab.js"), /const shinyRate = wildShinyRate\(\{ charmOn, shinyMul: techEff\.shinyChanceMul, advanced: true \}\);/);
  assert.ok(!/1 \/ 1024/.test(read("modules/tabs/capture_tab.js")), "高级遭遇不再自己写几率");
  assert.match(read("modules/render/capture.js"), /data-capture-action="encounterPlus" title="\$\{escapeHtml\(advShinyOddsLine\)\}"/);
  assert.match(read("modules/render/tab_stages.js"), /data-stage-act="field-hunt-plus"[^\n]*escapeHtml\(advShinyOddsLine\)/);
  assert.match(read("modules/render/capture.js"), /\$\{escapeHtml\(shinyOddsLine\)\}/);
}

// ---------- 四、设置里的「只收好友私信」按钮 ----------
{
  const mkBtn = () => {
    const h = {};
    return { textContent: "", disabled: false, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, addEventListener: (t, f) => (h[t] = f), click: () => h.click() };
  };
  const btn = mkBtn();
  const doc = { getElementById: (id) => (id === "btnDmFriendsOnly" ? btn : null) };
  const hints = [];
  let logged = false;
  let server = { dmFriendsOnly: false };
  const calls = [];
  const fetchImpl = async (url, opt) => {
    calls.push([url, opt.method]);
    if (opt.method === "PUT") server = JSON.parse(opt.body);
    return { ok: true, status: 200, json: async () => ({ ok: true, ...server }) };
  };
  const cloudSave = { isLoggedIn: () => logged, getToken: () => (logged ? "tok" : "") };
  const ctl = initDmFriendsOnly({ cloudSave, lbBaseUrl: () => "https://x.invalid", hint: (t) => hints.push(t), doc, fetchImpl });
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(btn.textContent, DM_LABEL_ON, "没登录显示默认：只收好友");
  await btn.click();
  assert.equal(hints.pop(), "登录后才能设置");
  assert.equal(calls.length, 0, "没登录不发请求");
  logged = true;
  await ctl.load();
  assert.equal(btn.textContent, DM_LABEL_OFF, "登录后按服务器的设置显示");
  await btn.click();
  assert.deepEqual(calls.at(-1), ["https://x.invalid/api/social/prefs", "PUT"]);
  assert.equal(server.dmFriendsOnly, true);
  assert.equal(btn.textContent, DM_LABEL_ON);
  assert.equal(btn.attrs["aria-pressed"], "true");
}

const DatabaseSync = await loadSqlite();
if (!DatabaseSync) {
  console.log("social-safety-selfcheck: SKIP sqlite part (needs Node >= 22.5)");
  process.exit(0);
}

let ipSeq = 0;
const ip = () => ({ "CF-Connecting-IP": `192.0.2.${(ipSeq += 1) % 250}` });
async function reg(db, username) {
  const r = await call(register, db, { body: { username, password: "pass-1234" }, headers: ip() });
  assert.equal(r.status, 200, `register ${username}`);
  return r.json();
}
const body = async (r) => ({ status: r.status, json: await r.json() });
const count = (db, sql, ...v) => Number(db.raw.prepare(sql).get(...v).n);
const befriend = (db, a, b) => db.raw.prepare("INSERT OR IGNORE INTO friends(uid1, uid2, created_at) VALUES(?, ?, 1)").run(...[a.uid, b.uid].sort());
// 新客户端发信带 explain: true（被拒时要原因）；老客户端不带，见「六之三」
const dm = (db, from, to, message = "hi") => call(messages, db, { token: from.token, body: { toUid: to.uid, message, explain: true } });
const inbox = async (db, u) => (await (await call(messages, db, { method: "GET", token: u.token })).json()).messages;
const setDm = (db, u, on) => call(prefs, db, { method: "PUT", token: u.token, body: { dmFriendsOnly: on } });
const team = [{ name: "x", hp: 10, attack: 5, defense: 5 }];
const invite = (db, from, to, explain = true) => call(pvpInvite, db, { token: from.token, body: { toUid: to.uid, teamData: team, ...(explain ? { explain: true } : {}) } });
const invitesOf = async (db, u, box = "in") =>
  (await (await call(pvpInvites, db, { method: "GET", token: u.token, url: `https://test.invalid/api/social/pvp-invites?box=${box}` })).json()).invites;
const ask = (db, from, to) => call(friendRequest, db, { token: from.token, body: { toUsername: to.username } });
const friendsOf = async (db, u) => (await call(friendList, db, { method: "GET", token: u.token })).json();

const db = createFakeD1(DatabaseSync, { migrations: ALL_MIGRATIONS });
const alice = await reg(db, "alice");
const bob = await reg(db, "bob");
const carol = await reg(db, "carol");
const dave = await reg(db, "dave");

// ---------- 五、只收好友私信（默认开） ----------
{
  assert.deepEqual(await body(await call(prefs, db, { method: "GET", token: bob.token })), { status: 200, json: { dmFriendsOnly: true } }, "默认只收好友");
  assert.equal((await call(prefs, db, { method: "GET" })).status, 401);
  assert.deepEqual(await body(await dm(db, alice, bob)), { status: 403, json: { error: "friends only" } }, "陌生人私信被拒");
  assert.equal(count(db, "SELECT COUNT(*) n FROM friend_messages"), 0, "被拒的不存");
  befriend(db, alice, bob);
  assert.equal((await dm(db, alice, bob, "你好")).status, 200, "好友能发");
  assert.equal((await setDm(db, bob, "no")).status, 400, "开关只认 true / false");
  assert.deepEqual(await body(await setDm(db, bob, false)), { status: 200, json: { ok: true, dmFriendsOnly: false } });
  assert.equal((await call(prefs, db, { method: "GET", token: bob.token })).status, 200);
  assert.equal((await dm(db, carol, bob, "陌生人来信")).status, 200, "关掉后陌生人也能发");
  assert.deepEqual((await inbox(db, bob)).map((m) => m.message).sort(), ["你好", "陌生人来信"]);
  assert.equal((await setDm(db, bob, true)).status, 200);
  assert.equal((await dm(db, carol, bob)).status, 403, "再打开又拒");
  assert.equal((await dm(db, bob, carol)).status, 403, "carol 也默认只收好友：bob 发不过去");
}

// ---------- 六、屏蔽：各通道都收不到，对方无感 ----------
{
  await setDm(db, bob, false);
  await setDm(db, dave, false);
  // 对照组：dave 没屏蔽 carol；bob 屏蔽 carol。carol 对两人做同样的事，看到的回应必须一模一样
  assert.equal((await call(block, db, { token: bob.token, body: { targetUid: bob.uid } })).status, 400, "不能屏蔽自己");
  assert.equal((await call(block, db, { token: bob.token, body: { targetUid: "nobody" } })).status, 404);
  assert.equal((await call(block, db, { body: { targetUid: carol.uid } })).status, 401);
  assert.deepEqual(await body(await call(block, db, { token: bob.token, body: { targetUid: carol.uid } })), { status: 200, json: { ok: true, blocked: true } });
  assert.equal((await call(block, db, { token: bob.token, body: { targetUid: carol.uid } })).status, 200, "重复屏蔽无害");

  // 私信
  assert.deepEqual(await body(await dm(db, carol, bob, "屏蔽后")), await body(await dm(db, carol, dave, "屏蔽后")), "私信回应相同");
  assert.ok(!(await inbox(db, bob)).some((m) => m.from_uid === carol.uid), "屏蔽后收不到，屏蔽前那封也不再显示");
  assert.equal(count(db, "SELECT COUNT(*) n FROM friend_messages WHERE from_uid = ? AND to_uid = ? AND message = '屏蔽后'", carol.uid, bob.uid), 0, "被屏蔽的私信不存");
  assert.equal((await inbox(db, dave)).filter((m) => m.from_uid === carol.uid).length, 1, "对照组照常收到");

  // 好友申请：第一次、第二次的回应都和对照组一样
  assert.deepEqual(await body(await ask(db, carol, bob)), await body(await ask(db, carol, dave)), "好友申请回应相同");
  assert.deepEqual(await body(await ask(db, carol, bob)), { status: 200, json: { error: "request pending" } }, "再发也是「已在等待」");
  assert.deepEqual(await body(await ask(db, carol, dave)), { status: 200, json: { error: "request pending" } });
  assert.equal((await friendsOf(db, bob)).pendingRequests.filter((p) => p.uid === carol.uid).length, 0, "屏蔽者看不到申请");
  assert.equal((await friendsOf(db, dave)).pendingRequests.filter((p) => p.uid === carol.uid).length, 1);
  const reqId = db.raw.prepare("SELECT id FROM friend_requests WHERE from_uid = ? AND to_uid = ?").get(carol.uid, bob.uid).id;
  assert.equal(db.raw.prepare("SELECT status FROM friend_requests WHERE id = ?").get(reqId).status, "muted");

  // 切磋邀请（要先是好友）
  befriend(db, carol, bob);
  befriend(db, carol, dave);
  assert.deepEqual(await body(await invite(db, carol, bob)), await body(await invite(db, carol, dave)), "切磋邀请回应相同");
  assert.equal((await invitesOf(db, bob)).filter((i) => i.from_uid === carol.uid).length, 0, "屏蔽者收不到邀请");
  assert.equal((await invitesOf(db, dave)).filter((i) => i.from_uid === carol.uid).length, 1);
  const out = await invitesOf(db, carol, "out");
  assert.deepEqual(out.map((i) => i.to_uid).sort(), [bob.uid, dave.uid].sort(), "对方自己的「已发出」照常两条");
  const mutedInvite = db.raw.prepare("SELECT id FROM pvp_invites WHERE from_uid = ? AND to_uid = ?").get(carol.uid, bob.uid).id;
  assert.deepEqual(await body(await call(pvpAccept, db, { token: bob.token, body: { inviteId: mutedInvite, teamData: team } })), { status: 200, json: { error: "invite not found" } }, "压下的邀请不能应战");
  // 成为好友后私信仍然收不到
  assert.equal((await dm(db, carol, bob, "好友也不行")).status, 200);
  assert.ok(!(await inbox(db, bob)).some((m) => m.from_uid === carol.uid));

  // 好友动态里也看不到
  await call(achievements, db, { token: carol.token, body: { achievementType: "rare_catch", achievementData: { name: "星雷灵鼠" } } });
  assert.ok(!(await (await call(achievements, db, { method: "GET", token: bob.token })).json()).achievements.some((a) => a.uid === carol.uid));
  assert.ok((await (await call(achievements, db, { method: "GET", token: dave.token })).json()).achievements.some((a) => a.uid === carol.uid));

  // 屏蔽者这边：名单、好友行标记；自己也发不过去（会被告知原因）
  assert.deepEqual((await (await call(block, db, { method: "GET", token: bob.token })).json()).blocks.map((b) => [b.uid, b.name]), [[carol.uid, "carol"]]);
  assert.equal((await friendsOf(db, bob)).friends.find((f) => f.uid === carol.uid).blocked, true);
  assert.deepEqual(await body(await dm(db, bob, carol)), { status: 403, json: { error: "you blocked this player" } });
  assert.deepEqual(await body(await ask(db, bob, carol)), { status: 200, json: { error: "you blocked this player" } });
  assert.equal((await invite(db, bob, carol)).status, 403);
  // 0.7.58 及更早的客户端不带 explain：照常回 ok、不存，免得被误报「请重新登录」
  const legacyInvite = await invite(db, bob, carol, false);
  assert.deepEqual(await body(legacyInvite), { status: 200, json: { ok: true } }, "老客户端向自己屏蔽的人发切磋邀请");

  // 被屏蔽的一方看不出来：自己的名单是空的，好友行没有标记，接口里没有任何「被屏蔽」字样
  assert.deepEqual((await (await call(block, db, { method: "GET", token: carol.token })).json()).blocks, []);
  const carolView = JSON.stringify([await friendsOf(db, carol), await invitesOf(db, carol, "out"), await inbox(db, carol)]);
  assert.ok(!/"blocked":true|muted|屏蔽/.test(carolView), "被屏蔽的人看不到任何痕迹");

  // 解除：压下的申请和邀请作废，不会一下子冒出来；之后可以重新申请
  db.raw.prepare("DELETE FROM friends WHERE (uid1 = ? AND uid2 = ?) OR (uid1 = ? AND uid2 = ?)").run(carol.uid, bob.uid, bob.uid, carol.uid);
  assert.deepEqual(await body(await call(block, db, { token: bob.token, body: { targetUid: carol.uid, block: false } })), { status: 200, json: { ok: true, blocked: false } });
  assert.equal(db.raw.prepare("SELECT status FROM friend_requests WHERE id = ?").get(reqId).status, "dropped");
  assert.equal(db.raw.prepare("SELECT status FROM pvp_invites WHERE id = ?").get(mutedInvite).status, "dropped");
  assert.equal((await friendsOf(db, bob)).pendingRequests.length, 0, "解除后旧申请不冒出来");
  assert.deepEqual(await body(await ask(db, carol, bob)), { status: 200, json: { success: true } });
  assert.equal((await friendsOf(db, bob)).pendingRequests.filter((p) => p.uid === carol.uid).length, 1, "重新申请看得到");
  assert.equal((await dm(db, carol, bob, "解除后")).status, 200);
  assert.ok((await inbox(db, bob)).some((m) => m.message === "解除后"));

  // 名单上限
  const ins = db.raw.prepare("INSERT INTO user_blocks(uid, blocked_uid, created_at) VALUES(?, ?, 1)");
  for (let i = 0; i < BLOCK_LIMIT; i += 1) ins.run(dave.uid, `ghost-${i}`);
  assert.deepEqual(await body(await call(block, db, { token: dave.token, body: { targetUid: alice.uid } })), { status: 409, json: { error: "block list full" } });
  db.raw.prepare("DELETE FROM user_blocks WHERE uid = ?").run(dave.uid);
}

// ---------- 六之二、先滤掉被屏蔽的人再取前 N 条：对方刷屏也挤不掉别人的 ----------
{
  const f = createFakeD1(DatabaseSync, { migrations: ALL_MIGRATIONS });
  const [u, spam, pal] = [await reg(f, "uma"), await reg(f, "spammy"), await reg(f, "pal")];
  const later = Date.now() + DAY;
  const msg = f.raw.prepare("INSERT INTO friend_messages(from_uid, to_uid, message, read, created_at) VALUES(?, ?, ?, 0, ?)");
  const share = f.raw.prepare("INSERT INTO achievement_shares(uid, achievement_type, achievement_data, likes, created_at) VALUES(?, 'rare_catch', '{}', 0, ?)");
  const inv = f.raw.prepare("INSERT INTO pvp_invites(from_uid, to_uid, status, team_data, created_at, expires_at) VALUES(?, ?, 'pending', '[]', ?, ?)");
  const fr = f.raw.prepare("INSERT INTO friend_requests(from_uid, to_uid, status, created_at) VALUES(?, ?, 'pending', ?)");
  msg.run(pal.uid, u.uid, "老朋友", 1);
  share.run(pal.uid, 1);
  inv.run(pal.uid, u.uid, 1, later);
  fr.run(pal.uid, u.uid, 1);
  for (let i = 0; i < 120; i += 1) {
    msg.run(spam.uid, u.uid, `刷屏 ${i}`, 10 + i);
    share.run(spam.uid, 10 + i);
    inv.run(spam.uid, u.uid, 10 + i, later);
    fr.run(spam.uid, u.uid, 10 + i);
  }
  assert.equal((await call(block, f, { token: u.token, body: { targetUid: spam.uid } })).status, 200);
  assert.deepEqual((await inbox(f, u)).map((m) => m.message), ["老朋友"], "私信");
  const feed = (await (await call(achievements, f, { method: "GET", token: u.token })).json()).achievements;
  assert.deepEqual(feed.map((a) => a.uid), [pal.uid], "动态");
  assert.deepEqual((await invitesOf(f, u)).map((i) => i.from_uid), [pal.uid], "切磋邀请");
  assert.deepEqual((await friendsOf(f, u)).pendingRequests.map((p) => p.uid), [pal.uid], "好友申请");
  // 别人照常看得到对方的动态
  assert.equal((await (await call(achievements, f, { method: "GET", token: pal.token })).json()).achievements.length, 50);
}

// ---------- 六之三、线上老客户端（0.7.58）发私信被拒：不能提示「请重新登录」，新客户端照旧 ----------
// 0.7.58 modules/social.js 的 sendMessage 与错误判断，原样照抄（只把 addLog 换成收集），代表还没更新的客户端，别改
function socialFailMsg0758(err, fallback) {
  const status =
    typeof err?.status === "number"
      ? err.status
      : typeof err?.message === "string"
        ? Number(err.message.match(/\bHTTP\s+(\d{3})\b/)?.[1] ?? NaN)
        : NaN;
  if (status === 401 || status === 403) return "请重新登录";
  if (status >= 500 && status <= 599) return "社交服务暂时不可用，请稍后再试";
  if (err instanceof TypeError || err?.name === "AbortError") return "网络异常，社交功能暂时不可用";
  return fallback;
}
async function sendMessage0758(fetchImpl, token, toUid, message) {
  const logs = [];
  const addLog = (t) => logs.push(t);
  function httpStatus(err) {
    if (typeof err?.status === "number") return err.status;
    if (typeof err?.message !== "string") return null;
    const m = err.message.match(/\bHTTP\s+(\d{3})\b/);
    return m ? Number(m[1]) : null;
  }
  function socialLogMsg(err, fallback) {
    const msg = socialFailMsg0758(err, fallback);
    const status = httpStatus(err);
    return status ? `社交接口失败（HTTP ${status}）：${msg}` : msg;
  }
  async function readSocialJson(response) {
    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    if (!response.ok) {
      const error = new Error(data?.error ? `HTTP ${response.status}: ${data.error}` : `HTTP ${response.status}`);
      error.status = response.status;
      error.body = data;
      throw error;
    }
    return data || {};
  }
  try {
    const response = await fetchImpl("https://test.invalid/api/social/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ toUid, message }),
    });
    const data = await readSocialJson(response);
    if (data.error) {
      addLog(`发送消息失败：${data.error}`);
      return { ok: false, logs };
    }
    addLog("消息已发送");
    return { ok: true, logs };
  } catch (error) {
    addLog(socialLogMsg(error, "发送消息失败"));
    return { ok: false, logs };
  }
}
{
  const g = createFakeD1(DatabaseSync, { migrations: ALL_MIGRATIONS });
  const [sam, rex, tia, tom, uli, pal] = [await reg(g, "sam"), await reg(g, "rex"), await reg(g, "tia"), await reg(g, "tom"), await reg(g, "uli"), await reg(g, "pal")];
  befriend(g, sam, tia);
  befriend(g, sam, uli);
  befriend(g, sam, pal);
  // rex：陌生人、只收好友（默认）；tia：好友、屏蔽了 sam；tom：陌生人、只收好友、屏蔽了 sam；uli：sam 屏蔽了 TA；pal：对照
  for (const [who, target] of [[tia, sam], [tom, sam], [sam, uli]]) {
    assert.equal((await call(block, g, { token: who.token, body: { targetUid: target.uid } })).status, 200);
  }
  const server = async (url, opt) => messages({ request: new Request(url, opt), env: { DB: g }, params: {} });
  const stored = (to) => count(g, "SELECT COUNT(*) n FROM friend_messages WHERE from_uid = ? AND to_uid = ?", sam.uid, to.uid);

  // 对照：老客户端的判断见到 403 就说「请重新登录」，这正是要躲开的
  assert.equal(socialFailMsg0758({ status: 403 }, "发送消息失败"), "请重新登录");
  const sent = await sendMessage0758(server, sam.token, pal.uid, "对照");
  assert.deepEqual(sent, { ok: true, logs: ["消息已发送"] });
  for (const to of [rex, tia, tom, uli]) {
    assert.deepEqual(await sendMessage0758(server, sam.token, to.uid, "老客户端"), sent, `老客户端发给 ${to.username}：与发送成功一模一样`);
    assert.equal(stored(to), 0, `${to.username} 没收到`);
  }
  assert.equal(stored(pal), 1);
  // 别的失败是普通失败，也不说「请重新登录」
  const plain = await sendMessage0758(server, sam.token, "nobody", "查无此人");
  assert.deepEqual(plain, { ok: false, logs: ["社交接口失败（HTTP 404）：发送消息失败"] });

  // 新客户端（本仓库 modules/social.js）：照旧说原因；被对方屏蔽照旧无感；陌生人被屏蔽与没被屏蔽看到的一样
  const realFetch = globalThis.fetch;
  const realLs = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const realErr = console.error;
  const logs = [];
  try {
    console.error = () => {};
    globalThis.fetch = server;
    Object.defineProperty(globalThis, "localStorage", { configurable: true, writable: true, value: { getItem: () => sam.token } });
    const client = createSocialSystem({ lbBaseUrl: () => "https://test.invalid", lbFetchJson: null, ui: {}, addLog: (t) => logs.push(t) });
    const send = async (to) => [await client.sendMessage(to.uid, "新客户端"), logs.at(-1)];
    assert.deepEqual(await send(rex), [false, "对方只收好友私信"]);
    assert.deepEqual(await send(tom), [false, "对方只收好友私信"], "屏蔽了 sam 的陌生人：与没屏蔽的陌生人一样");
    assert.deepEqual(await send(uli), [false, "你屏蔽了对方，先解除"]);
    assert.deepEqual(await send(tia), [true, "消息已发送"], "被好友屏蔽：照常显示已发送");
    assert.deepEqual(await send(pal), [true, "消息已发送"]);
  } finally {
    console.error = realErr;
    globalThis.fetch = realFetch;
    if (realLs) Object.defineProperty(globalThis, "localStorage", realLs);
    else delete globalThis.localStorage;
  }
  assert.deepEqual([rex, tia, tom, uli, pal].map(stored), [0, 0, 0, 0, 2], "只有对照组收到");
  assert.ok(!logs.some((t) => t.includes("请重新登录")));
}

// ---------- 七、举报：快照、限流、去重 ----------
{
  db.raw.prepare("INSERT INTO scores(uid, name, updatedAt) VALUES(?, ?, 1)").run(carol.uid, "傻逼王");
  const put = db.raw.prepare("INSERT INTO friend_messages(from_uid, to_uid, message, read, created_at) VALUES(?, ?, ?, 0, ?)");
  const t0 = Date.now() + 1000; // 比前面真发的几封都新
  for (let i = 1; i <= 7; i += 1) put.run(carol.uid, bob.uid, `骚扰 ${i}`, t0 + i);
  put.run(bob.uid, carol.uid, "别发了", t0 + 100);
  put.run(carol.uid, dave.uid, "发给别人的", t0 + 200);

  assert.equal((await call(report, db, { body: { targetUid: carol.uid, reason: "abuse" } })).status, 401);
  assert.equal((await call(report, db, { token: bob.token, body: { targetUid: carol.uid, reason: "nope" } })).status, 400, "原因要在列表里");
  assert.equal((await call(report, db, { token: bob.token, body: { targetUid: carol.uid, reason: "toString" } })).status, 400, "原型上的键不算");
  assert.equal((await call(report, db, { token: bob.token, body: { targetUid: bob.uid, reason: "abuse" } })).status, 400, "不能举报自己");
  assert.equal((await call(report, db, { token: bob.token, body: { targetUid: "nobody", reason: "abuse" } })).status, 404);
  assert.equal((await call(report, db, { method: "GET", token: bob.token })).status, 405);

  assert.deepEqual(await body(await call(report, db, { token: bob.token, body: { targetUid: carol.uid, reason: "abuse", snapshot: { fake: 1 } } })), { status: 200, json: { ok: true, duplicate: false } });
  const row = db.raw.prepare("SELECT * FROM user_reports WHERE reporter_uid = ? AND target_uid = ?").get(bob.uid, carol.uid);
  assert.equal(row.reason, "abuse");
  assert.equal(row.status, "open");
  const snap = JSON.parse(row.snapshot_json);
  assert.ok(!("fake" in snap), "快照由服务器截，不收客户端的");
  assert.equal(snap.username, "carol");
  assert.equal(snap.nickname, "傻逼王", "快照存原文给人工看");
  assert.equal(snap.messages.length, REPORT_SNAPSHOT_MESSAGES);
  assert.deepEqual(snap.messages.map((m) => m.message), ["骚扰 7", "骚扰 6", "骚扰 5", "骚扰 4", "骚扰 3"], "只要对方发给举报人的最近几条");
  // 去重：24 小时内同一人对同一人只记一次
  assert.deepEqual(await body(await call(report, db, { token: bob.token, body: { targetUid: carol.uid, reason: "spam" } })), { status: 200, json: { ok: true, duplicate: true } });
  assert.equal(count(db, "SELECT COUNT(*) n FROM user_reports WHERE reporter_uid = ?", bob.uid), 1);
  // 处理过或过了 24 小时就能再举报
  db.raw.prepare("UPDATE user_reports SET created_at = created_at - ? WHERE id = ?").run(DAY + 1, row.id);
  assert.deepEqual((await (await call(report, db, { token: bob.token, body: { targetUid: carol.uid, reason: "hate" } })).json()).duplicate, false);
  // 被举报的人没有任何通知
  assert.ok(!JSON.stringify([await inbox(db, carol), await friendsOf(db, carol)]).includes("举报"));
  // 限流：每小时 5 次（查无此人、去重的那次都算）、每天 20 次；按人算。前面已用 4 次：nobody、首报、去重、过期再报
  assert.equal((await call(report, db, { token: bob.token, body: { targetUid: alice.uid, reason: "other" } })).status, 200, "第 5 次");
  assert.equal((await call(report, db, { token: bob.token, body: { targetUid: dave.uid, reason: "other" } })).status, 429, "第 6 次被限");
  assert.equal(count(db, "SELECT COUNT(*) n FROM user_reports WHERE reporter_uid = ?", bob.uid), 3, "被限的不存");
  assert.equal((await call(report, db, { token: dave.token, body: { targetUid: carol.uid, reason: "abuse" } })).status, 200, "别人不受影响");
  db.raw.exec("UPDATE rate_limits SET window_start = window_start - 3600001 WHERE key LIKE 'social/report:%'");
  db.raw.prepare("UPDATE rate_limits SET count = 20 WHERE key = ?").run(`social/report/day:${dave.uid}`);
  assert.equal((await call(report, db, { token: dave.token, body: { targetUid: alice.uid, reason: "abuse" } })).status, 429, "每天上限");
  // 并发不超发
  const fresh = createFakeD1(DatabaseSync, { migrations: ALL_MIGRATIONS });
  const [x, ...ys] = [await reg(fresh, "xavier"), await reg(fresh, "yan1"), await reg(fresh, "yan2"), await reg(fresh, "yan3"), await reg(fresh, "yan4"), await reg(fresh, "yan5"), await reg(fresh, "yan6"), await reg(fresh, "yan7")];
  const rs = await Promise.all(ys.map((y) => call(report, fresh, { token: x.token, body: { targetUid: y.uid, reason: "spam" } })));
  assert.equal(rs.filter((r) => r.status === 200).length, 5);
  assert.equal(count(fresh, "SELECT COUNT(*) n FROM user_reports"), 5);
}

// ---------- 八、到期清理 ----------
{
  const now = Date.now();
  const add = db.raw.prepare("INSERT INTO user_reports(reporter_uid, target_uid, reason, snapshot_json, status, created_at) VALUES('r', 't', 'abuse', '{}', ?, ?)");
  add.run("open", now - (REPORT_RETENTION_DAYS + 1) * DAY);
  add.run("handled", now - (REPORT_RETENTION_DAYS + 30) * DAY);
  add.run("open", now - (REPORT_RETENTION_DAYS - 1) * DAY);
  const old = () => count(db, "SELECT COUNT(*) n FROM user_reports WHERE reporter_uid = 'r' AND created_at < ?", now - REPORT_RETENTION_DAYS * DAY);
  assert.equal(old(), 2);
  assert.equal(await maybePruneReports(db, now, 0.5), 0, "没抽中不清");
  assert.equal(old(), 2);
  assert.equal(await pruneExpiredReports(db, now), 2, "到期的不论处理没处理都删");
  assert.equal(count(db, "SELECT COUNT(*) n FROM user_reports WHERE reporter_uid = 'r'"), 1, "没到期的留着");
  add.run("open", now - (REPORT_RETENTION_DAYS + 1) * DAY);
  assert.equal(await maybePruneReports(db, now, 0.01), 1, "抽中时顺手清");
  // 提交举报时顺手清
  add.run("open", now - (REPORT_RETENTION_DAYS + 1) * DAY);
  await call(report, db, { token: alice.token, body: { targetUid: carol.uid, reason: "abuse" } });
  assert.equal(old(), 0, "提交举报时清掉到期的");
  // 没建表时清理是空操作
  const bare = createFakeD1(DatabaseSync, { migrations: ALL_MIGRATIONS.filter((m) => !m.includes("social-safety")) });
  assert.equal(await pruneExpiredReports(bare, now), 0);
}

// ---------- 九、管理员查看（OPS_ADMIN_KEY，缺省 404） ----------
{
  const KEY = "k".repeat(24);
  const ops = (opt = {}) => call(opsReports, db, { method: "GET", url: "https://test.invalid/api/ops/reports", ...opt });
  assert.equal((await ops()).status, 404, "没配密钥：404");
  assert.equal((await ops({ env: { OPS_ADMIN_KEY: "short" } })).status, 404, "密钥太短等于没配");
  assert.equal((await ops({ env: { OPS_ADMIN_KEY: KEY } })).status, 401);
  assert.equal((await ops({ env: { OPS_ADMIN_KEY: KEY }, headers: { "X-Ops-Key": "k".repeat(23) } })).status, 401);
  const now = Date.now();
  db.raw.prepare("INSERT INTO user_reports(reporter_uid, target_uid, reason, snapshot_json, status, created_at) VALUES('r', 't', 'abuse', '{}', 'open', ?)").run(now - (REPORT_RETENTION_DAYS + 2) * DAY);
  // 有私信原文：不许缓存（含 401）
  assert.equal((await ops({ env: { OPS_ADMIN_KEY: KEY } })).headers.get("Cache-Control"), "no-store");
  const listRes = await ops({ env: { OPS_ADMIN_KEY: KEY }, headers: { "X-Ops-Key": KEY } });
  assert.equal(listRes.headers.get("Cache-Control"), "no-store");
  const list = await listRes.json();
  assert.equal(list.ok, true);
  assert.equal(list.retentionDays, REPORT_RETENTION_DAYS);
  assert.equal(list.pruned, 1, "管理员查看时也清到期的");
  assert.ok(list.reports.length >= 3 && list.reports.every((r) => r.status === "open"), "默认列出未处理的，不传 limit 也是 50 条以内");
  assert.equal((await (await ops({ ...{ env: { OPS_ADMIN_KEY: KEY }, headers: { "X-Ops-Key": KEY } }, url: "https://test.invalid/api/ops/reports?limit=1" })).json()).reports.length, 1);
  const first = list.reports.find((r) => r.target_uid === carol.uid && r.reporter_uid === dave.uid);
  assert.equal(first.reasonLabel, "辱骂骚扰");
  assert.equal(first.snapshot.username, "carol");
  const auth = { env: { OPS_ADMIN_KEY: KEY }, headers: { "X-Ops-Key": KEY } };
  assert.equal((await call(opsReports, db, { method: "PUT", ...auth, body: { id: first.id, status: "open" } })).status, 400);
  assert.equal((await call(opsReports, db, { method: "PUT", ...auth, body: { id: 999999, status: "handled" } })).status, 404);
  assert.deepEqual(await body(await call(opsReports, db, { method: "PUT", ...auth, body: { id: first.id, status: "handled" } })), { status: 200, json: { ok: true, id: first.id, status: "handled" } });
  const handled = await (await ops({ ...auth, url: "https://test.invalid/api/ops/reports?status=handled" })).json();
  assert.ok(handled.reports.some((r) => r.id === first.id && r.handled_at > 0));
  assert.equal((await ops({ ...auth, url: "https://test.invalid/api/ops/reports?status=weird" })).status, 400);
  assert.equal((await call(opsReports, db, { method: "POST", ...auth, body: {} })).status, 405);
}

// ---------- 十、昵称与播报：拒绝改名 / 打码，旧数据读出时也过一遍 ----------
{
  for (const name of ["admin", "管理员小王", "sysop_01", "傻逼"]) {
    const r = await call(register, db, { body: { username: name, password: "pass-1234" }, headers: ip() });
    assert.deepEqual(await body(r), { status: 400, json: { error: "name not allowed" } }, `注册名 ${name} 被拒`);
  }
  assert.equal((await call(register, db, { body: { username: "badminton", password: "pass-1234" }, headers: ip() })).status, 200, "不误伤");

  // 提交时打码
  await call(scoreSubmit, db, { token: alice.token, body: { name: "GM爱丽丝", dexCount: 3 } });
  assert.equal(db.raw.prepare("SELECT name FROM scores WHERE uid = ?").get(alice.uid).name, "**爱丽丝");
  await call(scoreSubmit, db, { token: dave.token, body: { name: "官方客服", dexCount: 2 } });
  assert.equal(db.raw.prepare("SELECT name FROM scores WHERE uid = ?").get(dave.uid).name, "育灵师", "整名都命中：用默认名");
  // 旧数据：直接写进库的坏名字，读出来打码
  db.raw.prepare("UPDATE scores SET name = ? WHERE uid = ?").run("fuсk王", carol.uid);
  const board = await (await call(leaderboard, db, { method: "GET", url: "https://test.invalid/api/leaderboard/dex?limit=100", params: { board: "dex" } })).json();
  const names = board.items.map((i) => i.attrs.ownerName);
  assert.ok(names.includes("****王") && names.includes("**爱丽丝") && !names.some((n) => !checkName(n).ok), `榜单打码 ${JSON.stringify(names)}`);
  assert.equal(cleanLeaderboard([{ score: 1, attrs: { ownerName: "admin小号", uid: "u1" } }])[0].attrs.ownerName, "*****小号", "前端兜底");

  // 播报：写入时打码；旧数据读出打码
  await call(eventsPush, db, { token: bob.token, body: { name: "admin", msg: "admin：捕捉成功 星雷灵鼠" } });
  const ev = db.raw.prepare("SELECT name, msg FROM events ORDER BY id DESC LIMIT 1").get();
  assert.deepEqual([ev.name, ev.msg], ["育灵师", "*****：捕捉成功 星雷灵鼠"]);
  db.raw.prepare("INSERT INTO events(ts, type, uid, name, msg) VALUES(?, 'info', 'g', 'x', '希特勒：捕捉成功 星雷灵鼠')").run(Date.now());
  const pulled = (await (await call(eventsPull, db, { method: "GET", url: "https://test.invalid/api/events/pull?since=0&limit=50" })).json()).items.map((i) => i.msg);
  assert.ok(pulled.includes("***：捕捉成功 星雷灵鼠") && pulled.every((m) => checkName(m).ok), JSON.stringify(pulled));

  // 全服增益贡献榜
  db.raw.prepare("INSERT INTO server_buff_contrib(key, uid, name, sec, updatedAt) VALUES('exp', 'g', '傻逼', 60, 1)").run();
  const buffItems = (await (await call(buffs, db, { method: "GET" })).json()).items;
  assert.ok(buffItems.flatMap((b) => b.contributors).every((c) => checkName(c.name).ok), "增益榜打码");

  // 私信、好友、邀请、动态、名片里的名字：老账号的坏用户名读出来打码
  db.raw.prepare("UPDATE users SET username = 'admin_old' WHERE uid = ?").run(carol.uid);
  db.raw.prepare("UPDATE scores SET name = '小明' WHERE uid = ?").run(carol.uid);
  befriend(db, carol, bob);
  await dm(db, carol, bob, "老账号");
  assert.equal((await inbox(db, bob)).find((m) => m.message === "老账号").from_name, "*****_old");
  assert.equal((await friendsOf(db, bob)).friends.find((f) => f.uid === carol.uid).username, "*****_old");
  await invite(db, carol, bob);
  assert.ok((await invitesOf(db, bob)).filter((i) => i.from_uid === carol.uid).every((i) => i.from_name === "*****_old"));
  await call(achievements, db, { token: carol.token, body: { achievementType: "rare_catch", achievementData: { name: "纳粹鼠" } } });
  const feed = (await (await call(achievements, db, { method: "GET", token: bob.token })).json()).achievements.filter((a) => a.uid === carol.uid);
  assert.ok(feed.length && feed.every((a) => a.username === "*****_old" && checkName(a.achievement_data.name || "").ok), "动态打码");
  const prof = await (await call(friendProfile, db, { method: "GET", token: bob.token, url: `https://test.invalid/api/social/friend-profile?friendUid=${carol.uid}` })).json();
  assert.equal(prof.user.name, "*****_old");
  db.raw.prepare("UPDATE users SET username = 'carol' WHERE uid = ?").run(carol.uid);
}

// ---------- 十一、注销：屏蔽名单、设置、举报一起删，别人的不动 ----------
{
  await call(block, db, { token: alice.token, body: { targetUid: dave.uid } });
  await call(block, db, { token: dave.token, body: { targetUid: alice.uid } });
  await call(block, db, { token: bob.token, body: { targetUid: carol.uid } });
  await setDm(db, alice, false);
  db.raw.exec("DELETE FROM rate_limits WHERE key LIKE 'social/report%'");
  await call(report, db, { token: carol.token, body: { targetUid: alice.uid, reason: "spam" } });
  const r = await call(del, db, { token: alice.token, body: { requestId: "3f2b8c1e-0000-4000-8000-0000000000c3", confirm: "alice", password: "pass-1234" } });
  assert.equal(r.status, 200);
  assert.equal(count(db, "SELECT COUNT(*) n FROM user_blocks WHERE uid = ? OR blocked_uid = ?", alice.uid, alice.uid), 0);
  assert.equal(count(db, "SELECT COUNT(*) n FROM social_prefs WHERE uid = ?", alice.uid), 0);
  assert.equal(count(db, "SELECT COUNT(*) n FROM user_reports WHERE reporter_uid = ? OR target_uid = ?", alice.uid, alice.uid), 0);
  assert.equal(count(db, "SELECT COUNT(*) n FROM user_blocks WHERE uid = ?", bob.uid), 1, "别人的屏蔽名单不动");
  assert.ok(count(db, "SELECT COUNT(*) n FROM user_reports") > 0, "别人的举报不动");
}

// ---------- 十二、迁移没跑：别的接口照常，新接口 503，注销照常 ----------
{
  // 真 D1 的报错形状（替身 _fake_d1 也照这个抛）；别的表缺了不算
  assert.ok(lacksSafetyTable(new Error("D1_ERROR: no such table: user_blocks: SQLITE_ERROR")));
  assert.ok(lacksSafetyTable(new Error("D1_ERROR", { cause: new Error("no such table: main.social_prefs") })), "原文在 cause 里");
  assert.ok(!lacksSafetyTable(new Error("D1_ERROR: no such table: friends: SQLITE_ERROR")));
  assert.ok(!lacksSafetyTable(null));
  const bare = createFakeD1(DatabaseSync, { migrations: ALL_MIGRATIONS.filter((m) => !m.includes("social-safety")) });
  const p = await reg(bare, "pat");
  const q = await reg(bare, "quinn");
  assert.equal((await dm(bare, p, q)).status, 403, "默认只收好友");
  befriend(bare, p, q);
  assert.equal((await dm(bare, p, q)).status, 200);
  assert.equal((await inbox(bare, q)).length, 1);
  assert.equal((await call(friendRequest, bare, { token: p.token, body: { toUsername: "nobody" } })).status, 200);
  assert.equal((await call(friendList, bare, { method: "GET", token: q.token })).status, 200);
  assert.equal((await invite(bare, p, q)).status, 200);
  assert.equal((await invitesOf(bare, q)).length, 1);
  assert.equal((await call(achievements, bare, { method: "GET", token: q.token })).status, 200);
  assert.deepEqual(await body(await call(prefs, bare, { method: "GET", token: q.token })), { status: 200, json: { dmFriendsOnly: true } });
  assert.equal((await setDm(bare, q, false)).status, 503);
  assert.equal((await call(block, bare, { token: q.token, body: { targetUid: p.uid } })).status, 503);
  assert.equal((await call(block, bare, { method: "GET", token: q.token })).status, 503);
  assert.equal((await call(report, bare, { token: q.token, body: { targetUid: p.uid, reason: "abuse" } })).status, 503);
  const KEY = "k".repeat(24);
  assert.equal((await call(opsReports, bare, { method: "GET", env: { OPS_ADMIN_KEY: KEY }, headers: { "X-Ops-Key": KEY } })).status, 503);
  const r = await call(del, bare, { token: p.token, body: { requestId: "3f2b8c1e-0000-4000-8000-0000000000c4", confirm: "pat", password: "pass-1234" } });
  assert.equal(r.status, 200, "少这三张表也能注销");
  assert.equal(count(bare, "SELECT COUNT(*) n FROM users WHERE uid = ?", p.uid), 0);
  assert.equal(count(bare, "SELECT COUNT(*) n FROM friend_messages"), 0);
}

console.log("social-safety-selfcheck: OK");
