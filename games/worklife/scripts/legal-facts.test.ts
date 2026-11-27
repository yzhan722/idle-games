import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  LEGAL_DOCS,
  LEGAL_DRAFT,
  LEGAL_VERSION,
  LOCAL_STORAGE_KEYS,
  PRIVACY_POLICY,
  TERMS_OF_SERVICE,
  TODO_MARK,
  legalAccepted,
  legalDocFromHash,
} from "../frontend/src/gameplay/legalDocs";
import { DELETE_CONFIRM_TEXT, TOMBSTONE_DAYS } from "../backend/src/account_deletion";
import { CHAT_BLOCK_MAX, REPORT_KEEP_DAYS, REPORT_SNAPSHOT_SIZE } from "../backend/src/chat_moderation";
import { maskAccountName } from "../backend/src/display_name";
import { LEADERBOARD_TTL_MS } from "../backend/src/leaderboard";
import { PRICE_WINDOW_DAYS } from "../backend/src/market_price";
import { METRIC_EVENTS, METRICS_KEEP_DAYS, MILESTONE_EVENTS, PRIVACY_DRAFT, statsConsent } from "../backend/src/retention_metrics";

const root = fileURLToPath(new URL("..", import.meta.url));
function sources(dir: string, exts: string[]): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const name of readdirSync(join(root, dir))) {
    const rel = `${dir}/${name}`;
    if (statSync(join(root, rel)).isDirectory()) out.push(...sources(rel, exts));
    else if (exts.some((e) => name.endsWith(e)) && !name.includes(".test.")) out.push([rel, readFileSync(join(root, rel), "utf8")]);
  }
  return out;
}
const text = (doc: { sections: Array<{ lines: string[] }> }) => doc.sections.flatMap((s) => s.lines).join("\n");

describe("隐私政策与用户协议：草案与代码对得上", () => {
  it("正式信息没填之前必须是草案；主体、邮箱、管辖都留着待填", () => {
    const all = text(PRIVACY_POLICY) + text(TERMS_OF_SERVICE);
    assert.ok(all.includes(TODO_MARK));
    assert.equal(LEGAL_DRAFT, true, "还有待填项时不能关草案开关");
    for (const word of ["运营主体", "联系邮箱", "适用法律与管辖"]) {
      for (const doc of Object.values(LEGAL_DOCS)) assert.ok(text(doc).includes(word), `${doc.title} 缺 ${word}`);
    }
  });

  it("地址与勾选：#privacy / #terms 打开对应页；换版本要重新勾", () => {
    assert.equal(legalDocFromHash("#privacy")?.id, "privacy");
    assert.equal(legalDocFromHash("#/terms")?.id, "terms");
    assert.equal(legalDocFromHash("#other"), null);
    assert.equal(legalDocFromHash(""), null);
    assert.equal(legalAccepted(LEGAL_VERSION), true);
    assert.equal(legalAccepted("2020"), false);
    assert.equal(legalAccepted(null), false);
  });

  it("本机存储：代码里写进 localStorage 的键都在名单里；不用 Cookie、sessionStorage、IndexedDB", () => {
    const known = LOCAL_STORAGE_KEYS as readonly string[];
    for (const [file, src] of sources("frontend/src", [".ts", ".tsx"])) {
      for (const m of src.matchAll(/localStorage\.setItem\(\s*([^,)]+)/g)) {
        const arg = m[1].trim();
        const literal = /^['"`]([^'"`$]+)/.exec(arg)?.[1];
        const ok = literal ? known.some((k) => literal.startsWith(k)) : ["storageKey", "LEGAL_ACCEPTED_KEY"].includes(arg);
        assert.ok(ok, `${file}: ${arg}`);
      }
      assert.equal(/document\.cookie|sessionStorage\.|indexedDB\./.test(src), false, `${file}: 新的本机存储要写进隐私政策`);
    }
    const party = readFileSync(join(root, "frontend/src/components/PartyPanel.tsx"), "utf8");
    assert.ok(party.includes("const storageKey = `worklife_party_run_"));
  });

  it("没有第三方请求：前端源码和首页里不出现外部网址", () => {
    const pages: Array<[string, string]> = [["frontend/index.html", readFileSync(join(root, "frontend/index.html"), "utf8")]];
    for (const [file, src] of [...sources("frontend/src", [".ts", ".tsx", ".css"]), ...pages]) {
      for (const m of src.matchAll(/https?:\/\/([a-zA-Z0-9.-]+)/g)) {
        assert.ok(["www.w3.org", "api.example.com"].includes(m[1]), `${file}: ${m[0]}`);
      }
    }
  });

  it("聊天不落库，只有屏蔽名单与举报：表、快照字段、条数、天数与隐私政策一致；注销说明与后端一致", () => {
    const schema = readFileSync(join(root, "backend/database/schema.sql"), "utf8");
    const tables = [...schema.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)/g)].map((m) => m[1]);
    assert.deepEqual(tables.filter((t) => /chat|message/.test(t)).sort(), ["chat_blocks", "chat_reports"]);
    const snapshotFields = [...readFileSync(join(root, "backend/src/memory_snapshot.ts"), "utf8").matchAll(/^\s+(chat\w*)\?:/gm)].map((m) => m[1]);
    assert.deepEqual([...new Set(snapshotFields)], ["chatBlocks", "chatReports"]);
    const policy = text(PRIVACY_POLICY);
    assert.ok(policy.includes(`最近 ${REPORT_SNAPSHOT_SIZE} 条，重启即清空`));
    assert.ok(policy.includes(`内存里该频道最近 ${REPORT_SNAPSHOT_SIZE} 条`));
    assert.ok(policy.includes(`举报保存 ${REPORT_KEEP_DAYS} 天，到期自动清除，只有持管理密钥的运营方能看`));
    assert.ok(policy.includes(`你屏蔽的人（最多 ${CHAT_BLOCK_MAX} 人）存在服务器上`));
    assert.ok(policy.includes(`要等那份举报 ${REPORT_KEEP_DAYS} 天到期`));
    const lib = readFileSync(join(root, "backend/src/chat_moderation.ts"), "utf8");
    assert.ok(lib.includes("REPORTS_ADMIN_KEY") && readFileSync(join(root, "backend/src/routes/chat.ts"), "utf8").includes("process.env.REPORTS_ADMIN_KEY"));
    assert.ok(text(PRIVACY_POLICY).includes(`${TOMBSTONE_DAYS} 天后失效，之后有人注销时一并清除`));
    const panel = readFileSync(join(root, "frontend/src/components/DeleteAccountSection.tsx"), "utf8");
    assert.ok(panel.includes(`'${DELETE_CONFIRM_TEXT}'`), "前后端的确认文字要一致");
  });

  it("匿名统计：后端的默认值跟着草案开关走；事件、保留天数、开关位置与隐私政策写的一致", () => {
    assert.equal(PRIVACY_DRAFT, LEGAL_DRAFT, "前后端的草案开关要一起改");
    assert.equal(statsConsent(undefined), !LEGAL_DRAFT);
    const policy = text(PRIVACY_POLICY);
    const said: Record<string, string> = {
      register: "注册", first_battle: "第一次打赢", first_level10: "第一次到 10 级", return_d1: "第 1 天", return_d7: "第 7 天",
    };
    assert.deepEqual(Object.keys(said), [...MILESTONE_EVENTS], "加了新事件要写进隐私政策");
    for (const word of [...Object.values(said), "每次在线多久", `${METRICS_KEEP_DAYS} 天`, "设置 → 匿名统计"]) assert.ok(policy.includes(word), word);
    assert.ok(METRIC_EVENTS.every((e) => (MILESTONE_EVENTS as readonly string[]).includes(e) || e.startsWith("session_")));
    assert.ok(readFileSync(join(root, "frontend/src/components/ProgressionPanels.tsx"), "utf8").includes('<div className="settings-label">匿名统计</div>'));
    assert.equal(policy.includes("没有广告、统计分析"), false);
  });

  it("排行榜与导出存档：隐私政策写的与代码一致", () => {
    const policy = text(PRIVACY_POLICY);
    assert.ok(policy.includes("真人榜会显示角色名、总等级、战斗等级和最远区域"));
    assert.equal(LEADERBOARD_TTL_MS, 60_000, "隐私政策写了大约一分钟后消失");
    const exported = readFileSync(join(root, "frontend/src/components/ProgressionPanels.tsx"), "utf8");
    const body = exported.slice(exported.indexOf("const exportData"), exported.indexOf("const handleImportSaveCode"));
    assert.doesNotMatch(body, /token/i);
    assert.ok(policy.includes("不含登录凭证"));
  });

  it("账号名不带进角色名：建角与改名的输入框只放玩家自己起的名字；同名打码写进了隐私政策", () => {
    const main = readFileSync(join(root, "frontend/src/components/NewGameInterface.tsx"), "utf8");
    const chosen = /const chosenName[^\n]*/.exec(main)![0];
    assert.equal(/username|fallbackName/.test(chosen), false);
    assert.ok(main.includes("currentName={chosenName}"));
    assert.ok(main.includes("renameDraft={chosenName}"));
    const panel = readFileSync(join(root, "frontend/src/components/PlayerRightPanel.tsx"), "utf8");
    assert.ok(panel.includes("setNameDraft(props.renameDraft)"));
    assert.equal(panel.includes("setNameDraft(props.playerName)"), false);
    for (const [file, src] of sources("frontend/src", [".ts", ".tsx"])) {
      assert.equal(/playerName:\s*(user\??\.username|playerName|fallbackName)/.test(src), false, `${file}: 账号名不能当角色名提交`);
    }
    const policy = text(PRIVACY_POLICY);
    assert.ok(policy.includes("角色名和账号名相同的，榜上只显示第一个字"));
    assert.ok(policy.includes("建角时名字是空的"));
    assert.equal(maskAccountName("alice01", "alice01"), "a＊＊");
  });

  it("保存多久：登录凭证、估价窗口、备份份数、没有自动清除的表，与代码一致", () => {
    const policy = text(PRIVACY_POLICY);
    const auth = readFileSync(join(root, "backend/src/routes/auth.ts"), "utf8");
    assert.ok(policy.includes(`登录凭证（最长 ${/expiresIn: "(\d+)d"/.exec(auth)![1]} 天`));
    assert.ok(policy.includes(`行情估价只看最近 ${PRICE_WINDOW_DAYS} 天`));
    const backup = readFileSync(join(root, "scripts/backup-db.ps1"), "utf8");
    assert.ok(policy.includes(`备份脚本留最近 ${/-Skip (\d+)/.exec(backup)![1]} 份`));
    const pg = readFileSync(join(root, "backend/src/storage_pg.ts"), "utf8");
    assert.equal(/DELETE FROM trade_history|DELETE FROM player_command_receipts WHERE created_at/.test(pg), false, "有了自动清除要写进隐私政策");
    assert.equal([...pg.matchAll(/DELETE FROM account_deletions/g)].length, 1, "墓碑只在下一次注销时清");
    assert.ok(policy.includes("注销前做的数据库备份里还有旧数据"));
  });

  it("谁能看到：强化服务列表、默认名、建号播报、转发路径写进了隐私政策", () => {
    const policy = text(PRIVACY_POLICY);
    const pg = readFileSync(join(root, "backend/src/storage_pg.ts"), "utf8");
    assert.match(pg, /isOnline: wsConnections\.has\(row\.user_id\)/);
    assert.ok(policy.includes("学会强化的玩家会列在强化服务里：玩家编号、职业等级、是否在线"));
    // 默认名由 display_name.ts 的 shownName 统一给出（聊天、播报、队伍都用它）
    assert.ok(policy.includes(`加编号前 ${/玩家_\$\{userId\.slice\(0, (\d+)\)\}/.exec(readFileSync(join(root, "backend/src/display_name.ts"), "utf8"))![1]} 位`));
    assert.match(readFileSync(join(root, "backend/src/world_announce.ts"), "utf8"), /欢迎新村民/);
    assert.ok(policy.includes("建好角色、首次击败首领"));
    for (const m of readFileSync(join(root, "deploy/worker.mjs"), "utf8").matchAll(/https:\/\/([a-z0-9.-]+)/g)) assert.ok(policy.includes(m[1]), m[1]);
    assert.ok(policy.includes("Cloudflare"));
  });

  it("技术日志：后端信任反向代理，日志里可能是玩家的 IP；日志里没有请求头和正文", () => {
    const index = readFileSync(join(root, "backend/src/index.ts"), "utf8");
    assert.match(index, /trustProxy: parseTrustProxy/);
    assert.match(index, /\{ reqId: req\.id, method: req\.method, url: req\.url, statusCode: reply\.statusCode, durationMs: reply\.elapsedTime \}/);
    assert.ok(text(PRIVACY_POLICY).includes("每次请求的时间、网址、来源地址（可能就是你的 IP 地址）与端口、结果和耗时"));
  });

  it("同好会：团内能看到什么、团聊不落库、注销与导出，与代码一致", () => {
    const policy = text(PRIVACY_POLICY);
    const schema = readFileSync(join(root, "backend/database/schema.sql"), "utf8");
    const migration = readFileSync(join(root, "backend/database/migrations/008_circles.sql"), "utf8");
    // 只有两张表、没有正文列：团聊和其他聊天一样不落库
    const tables = [...schema.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)/g)].map((m) => m[1]).filter((t) => t.startsWith("circle"));
    assert.deepEqual(tables.sort(), ["circle_members", "circles"]);
    assert.equal(/\b(content|message)\b/i.test(migration), false);
    assert.ok(policy.includes("团内聊天和其他聊天一样不存记录"));
    // 成员、在线、本周数只给会内：接口只有成员拿得到 circle
    const memory = readFileSync(join(root, "backend/src/circle_memory.ts"), "utf8");
    assert.match(memory, /const id = memberOf\.get\(userId\);\s+const doc = id \? circles\.get\(id\) : undefined;/);
    assert.match(memory, /applications: isLeader \? doc\.applications\.map\(named\) : \[\]/);
    assert.ok(policy.includes("谁都能搜到会名和人数；成员名单、在线状态、本周击杀与采集制作只有同一个会的成员看得到；会长还看得到申请和邀请的人"));
    const rules = readFileSync(join(root, "backend/src/circle.ts"), "utf8");
    assert.match(rules, /export function circleSummary[\s\S]*?return \{ id: doc\.id, name: shownCircleName\(doc\.name\), memberCount: doc\.members\.length, max: CIRCLE_MAX_MEMBERS \};/);
    // 注销：会长转给最早加入的成员，没有成员就解散
    assert.match(rules, /a\.joinedAt\.localeCompare\(b\.joinedAt\)/);
    assert.ok(policy.includes("同好会会长注销会转给最早加入的成员，没有成员就解散；你的申请和收到的邀请一并删除"));
    assert.ok(readFileSync(join(root, "backend/src/account_deletion.ts"), "utf8").includes("同好会"));
    // 存档里不放同好会：导出不含其他成员
    assert.ok(rules.includes("存档里不放同好会的任何东西"));
    assert.ok(policy.includes("也不含同好会和其他成员的信息"));
    assert.ok(text(TERMS_OF_SERVICE).includes("不给任何加成"));
    // 团榜：只有会名和分数，分数取真人榜那张表
    assert.ok(policy.includes("团榜只显示会名和成员总等级之和（只算能上真人榜的成员），不显示成员"));
    assert.match(readFileSync(join(root, "backend/src/circle_pg.ts"), "utf8"), /LEFT JOIN player_rankings r ON r\.user_id = m\.user_id/);
    assert.match(memory, /userId: c\.id, name: shownCircleName\(c\.name\), score: circleScore\(c\)/);
  });

  it("注销迁移与服务端建表一致", () => {
    const migration = readFileSync(join(root, "backend/database/migrations/004_account_deletion_and_trades.sql"), "utf8");
    const init = readFileSync(join(root, "backend/src/storage_pg.ts"), "utf8");
    const schema = readFileSync(join(root, "backend/database/schema.sql"), "utf8");
    for (const part of ["CREATE TABLE IF NOT EXISTS account_deletions", "idx_trade_history_buyer", "idx_trade_history_seller"]) {
      for (const [name, src] of [["migration", migration], ["init", init], ["schema", schema]]) assert.ok(src.includes(part), `${name} 缺 ${part}`);
    }
  });
});
