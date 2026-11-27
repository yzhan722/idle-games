#!/usr/bin/env node
// 隐私政策 / 用户协议草案与代码对得上：天数、份数、分桶、公开字段、本机存储、第三方。纯文本，不开端口、不联网。
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { LEGAL_DRAFT } from "../modules/legal_status.js";
import { SESSION_BUCKETS_MIN, FUNNEL_EVENTS } from "../modules/analytics.js";
import { SESSION_TTL_MS } from "../functions/api/_auth.js";
import { accountDeleteStatements } from "../functions/api/_account.js";
import { ipGroup } from "../functions/api/_rate_limit.js";
import { REPORT_RETENTION_DAYS, REPORT_SNAPSHOT_MESSAGES, REPORT_DEDUP_MS } from "../functions/api/_social_safety.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(path.join(root, f), "utf8").replace(/\r\n/g, "\n");
function files(dir, ext) {
  return readdirSync(path.join(root, dir)).flatMap((n) => {
    const rel = `${dir}/${n}`;
    if (statSync(path.join(root, rel)).isDirectory()) return files(rel, ext);
    return rel.endsWith(ext) ? [rel] : [];
  });
}
const plain = (html) => html.replace(/<[^>]+>/g, "");
const privacy = plain(read("legal/privacy.html"));
const terms = plain(read("legal/terms.html"));
const says = (t) => assert.ok(privacy.includes(t), `隐私政策里没有：${t}`);
const DAY = 24 * 60 * 60 * 1000;

// 待填项没补齐不能关草案
assert.ok(LEGAL_DRAFT || !/待填/.test(privacy + terms), "还有待填项时不能关草案开关");
for (const w of ["运营主体", "联系邮箱", "适用法律与管辖"]) for (const doc of [privacy, terms]) assert.ok(doc.includes(w), w);

// 数字
says(`有效 ${SESSION_TTL_MS / DAY} 天`);
const saveApi = read("functions/api/save/index.js");
const maxKb = Number(/MAX_SAVE_BYTES = (\d+) \* 1024/.exec(saveApi)[1]);
const maxSlot = Number(/slot < 0 \|\| slot > (\d+)/.exec(saveApi)[1]);
says(`最多 ${maxSlot + 1} 份，每份不超过 ${maxKb} KB`);
says(`单次在线达到 ${SESSION_BUCKETS_MIN.join(" / ")} 分钟`);
const limiter = read("functions/api/_rate_limit.js");
assert.match(limiter, /const DAY_MS = 24 \* 60 \* 60 \* 1000;/);
assert.match(limiter, /DELETE FROM rate_limits WHERE key LIKE '%:ip:%' AND window_start < \?", \[now - DAY_MS\]/);
says("超过 1 天的会陆续清掉");
says(`前 ${/server_buff_contrib WHERE key = \? ORDER BY sec DESC LIMIT (\d+)/.exec(read("functions/api/server/buffs/index.js"))[1]} 名所有人可见`);

// 匿名统计：事件逐个说到，默认关、草案期不问
const eventWords = { session_start: "打开游戏", register: "注册", first_battle: "第一次战斗", first_capture: "第一次捕捉", first_rebirth: "第一次转生", return_d1: "次日回来", return_d7: "第 7 天回来", session_time: "单次在线" };
assert.deepEqual([...FUNNEL_EVENTS].sort(), Object.keys(eventWords).sort(), "加了新事件要写进隐私政策");
Object.values(eventWords).forEach(says);
["匿名统计（默认关）", "草案期不问", "是不是第一次打开"].forEach(says);
assert.equal(/DELETE FROM analytics_events WHERE (created_at|ts)/.test(files("functions", ".js").map(read).join("\n")), false);
says("匿名统计也没有自动清除");

// 自动清理只有这几处；加了到期清理要改「保存多久」（user_blocks 是玩家自己点「解除」，user_reports 是举报到期）
const deletes = files("functions", ".js").filter((f) => f !== "functions/api/_account.js").flatMap((f) => [...read(f).matchAll(/DELETE FROM (\w+)/g)].map((m) => m[1]));
assert.deepEqual([...new Set(deletes)].sort(), ["rate_limits", "sessions", "user_blocks", "user_reports"], "新的自动清理要写进隐私政策");

// 玩家交流管控（ML-COM3）：举报存什么、存多久；屏蔽名单与私信设置存在服务器
const safety = read("functions/api/_social_safety.js");
assert.match(safety, /DELETE FROM user_reports WHERE created_at < \?", \[now - REPORT_RETENTION_DAYS \* DAY_MS\]/);
says(`举报（含快照）保存 ${REPORT_RETENTION_DAYS} 天，到期自动删除`);
says(`对方发给你的最近 ${REPORT_SNAPSHOT_MESSAGES} 条私信原文`);
says(`${REPORT_DEDUP_MS / (60 * 60 * 1000)} 小时内重复举报同一个人只记一次`);
assert.match(read("functions/api/ops/reports.js"), /OPS_ADMIN_KEY/);
says("只有持运营密钥的管理员能看");
assert.match(read("scripts/migrations/2026-11-27-social-safety.sql"), /CREATE TABLE IF NOT EXISTS user_blocks/);
["屏蔽名单", "只有你自己看得到", "「只收好友私信」开关（默认开）", "默认只有好友能给你发私信"].forEach(says);
for (const t of ["user_blocks", "social_prefs", "user_reports"]) assert.ok(accountDeleteStatements({ id: 1, uid: "u" }).some(([sql]) => sql.startsWith(`DELETE FROM ${t} `)), `注销删 ${t}`);
says("屏蔽名单、私信设置、你提交的和针对你的举报");
// 界面上写的数字与服务器一致
const socialTab = read("modules/tabs/social_tab.js");
assert.ok(socialTab.includes(`最近 ${REPORT_SNAPSHOT_MESSAGES} 条私信，保存 ${REPORT_RETENTION_DAYS} 天`), "举报弹窗的说明与服务器一致");

// IP：只进限流哈希，不落库；IPv6 取前半段
for (const f of files("functions", ".js")) if (f !== "functions/api/_rate_limit.js") assert.equal(/CF-Connecting-IP|X-Forwarded-For|User-Agent|request\.cf/i.test(read(f)), false, `${f} 读了访问者信息`);
assert.equal(ipGroup("2001:db8:1:2:3:4:5:6"), "2001:db8:1:2::/64");
says("IPv6 只取前半段");
assert.equal(/\b(ip|ip_address|user_agent)\b/i.test(read("d1_schema.sql").replace(/--.*$/gm, "")), false, "建表里有访问者信息列");

// 公开范围：排行榜与增益榜不用登录就能看，返回账号编号；成就分享、好友、私信、切磋带登录用户名
const board = read("functions/api/leaderboard/[board].js");
assert.equal(/requireUser/.test(board), false);
assert.ok(/uid: r\.uid/.test(board) && !/gameVersion|updatedAt:/.test(board));
says("除游戏版本和更新时间外，所有人都能看到");
for (const f of ["social/achievements", "social/messages", "social/pvp-invites", "friends/list"]) assert.match(read(`functions/api/${f}.js`), /u\.username|SELECT username/, f);
says("所有登录玩家");
assert.match(read("modules/tabs/social_tab.js"), /async function autoShareAchievement\(/);
says("会自动分享一条");
assert.match(read("modules/app/ticker.js"), /uid: ui\?\.lbUid,\n\s+name,/);
says("会自动发一条全服播报");

// 注销：只留请求号与时间；未登录播报按本机编号存，删不到
assert.ok(accountDeleteStatements({ id: 1, uid: "u" }).some(([sql]) => sql === "DELETE FROM events WHERE uid = ?"));
assert.match(read("functions/api/_account.js"), /INSERT OR IGNORE INTO account_deletions\(request_id, deleted_at\)/);
["一个注销请求号和注销时间", "没登录时发的播报", "平台备份里的旧数据"].forEach(says);

// 本机存储：键都在名单里；不用 Cookie、IndexedDB
const KEY_WORDS = {
  save: "自动存档", daily_login: "每日登录日期", log_collapsed: "界面折叠", capture_preview: "界面折叠", future_shop: "界面折叠", audio: "声音设置",
  guide: "新手提示进度", handoff: "新手提示进度", ticker_last: "播报与对战看到哪里", pvp_seen: "播报与对战看到哪里", boss_bully: "首领提醒时间",
  lb_uid: "本机随机编号", lb_name: "昵称", lb_avatar: "头像", cloud_token: "登录状态", cloud_user: "登录状态", cloud_uid: "登录状态", account_delete_req: "没完成的注销请求号", analytics_: "匿名统计的选择",
  bulletin_collapsed: "界面折叠", cloud_backup_done: "自动存档与备份",
  style_fix: "", // 会话存储：样式重载一次的标记，关页就没
};
const front = ["app.js", "main.js", ...files("modules", ".js")];
for (const f of front) {
  const src = read(f);
  assert.equal(/document\.cookie|indexedDB\./.test(src), false, `${f}：新的本机存储要写进隐私政策`);
  for (const m of src.matchAll(/["'`]mengling_idle_(\w+)["'`]/g)) {
    const hit = Object.entries(KEY_WORDS).find(([k]) => m[1].startsWith(k));
    assert.ok(hit, `${f}: mengling_idle_${m[1]} 没写进隐私政策`);
    if (hit[1]) says(hit[1]);
  }
}
says("不用 Cookie");
says("离线用的游戏文件缓存");

// 第三方：首页只加载 Google 字体
const hosts = new Set([...["index.html", "styles.css", "sw.js", ...front].map(read).join("\n").matchAll(/https?:\/\/([a-z0-9.-]+)/gi)].map((m) => m[1]).filter((h) => !["www.w3.org", "127.0.0.1"].includes(h)));
assert.deepEqual([...hosts].sort(), ["fonts.googleapis.com", "fonts.gstatic.com"], "新的第三方要写进隐私政策");
["Google Fonts", "Cloudflare"].forEach(says);

// 导出的文件只有自动存档
const exp = /function exportSaveJson\(\) \{[\s\S]*?\n {2}\}\n/.exec(read("modules/app/save_cloud.js"))[0];
assert.ok(exp.includes("getAutosaveRawJson()") && !/token/i.test(exp));
says("不含登录凭证");

console.log("legal-facts-selfcheck: OK");
