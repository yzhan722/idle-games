// 隐私说明 / 用户协议草案与代码对得上：node --test scripts/legal_facts.test.mjs（只读文件，不开端口、不开浏览器）
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { loadTs, GAME_ROOT } from './lib/load_ts.mjs';
import { defaultNameFor } from '../src/game/nameFilter.mjs';

const read = (f) => readFileSync(path.join(GAME_ROOT, f), 'utf8').replace(/\r\n/g, '\n');
const { L, B } = await loadTs({ L: 'src/legal/LegalDocs.ts', B: 'src/game/Leaderboard.ts' });
const text = (id) => L.LEGAL_DOCS[id].sections.flatMap((s) => s.items).join('\n');
const privacy = text('privacy');
const worker = read('deploy/worker.mjs');
const state = read('src/game/State.ts');
const sources = readdirSync(path.join(GAME_ROOT, 'src'), { recursive: true })
  .map((f) => String(f).split(path.sep).join('/'))
  .filter((f) => f.endsWith('.ts') && !/SelfChecks/.test(f))
  .map((f) => [f, read(`src/${f}`)]);
const says = (t) => assert.ok(privacy.includes(t), t);

test('还有待填项时必须是草案；主体、邮箱、管辖、日志期限都留着', () => {
  const all = privacy + text('terms');
  assert.ok(L.LEGAL_DRAFT || !all.includes('【待填'));
  for (const w of ['运营主体名称', '联系邮箱', '适用法律与管辖地', '日志留多久', '未成年人']) assert.ok(all.includes(`待填：${w}`), w);
});

test('周榜：过期天数、名次上限、上报门槛、补传间隔与代码一致', () => {
  const ttl = /expirationTtl: (\d+) \* 86400/.exec(worker)[1];
  const rows = /const MAX_ROWS = (\d+);/.exec(worker)[1];
  says(`只留前 ${rows} 名；整张榜最后一次有人写入后 ${ttl} 天自动过期`);
  assert.ok(worker.includes('rows.slice(0, MAX_ROWS)'));
  const sec = /weeklyPlayTimeSeconds >= (\d+);/.exec(state)[1];
  says(`玩满 ${sec} 秒后`);
  const delays = ['too_fast', 'busy', 'key_mismatch'].map((r) => B.leaderboardRetryDelayMs(r));
  assert.ok(Math.min(...delays) >= 1000 && Math.max(...delays) <= 70_000, '说明写的是过几秒到一分钟补传一次');
  says('过几秒到一分钟补传一次');
});

test('周榜：上报字段、公开字段与说明一致', () => {
  const body = /body: shouldPost\s*\? JSON\.stringify\(\{([\s\S]*?)\}\)/.exec(state)[1];
  const sent = [...body.matchAll(/^\s+(\w+):/gm)].map((m) => m[1]);
  const said = { playerId: '玩家编号', writeKey: '写入密钥', name: '昵称', bestStage: '本周最高关卡', totalKills: '本周击败数', playTimeSeconds: '本周游戏时长', skinName: '皮肤名与颜色', badgeColor: '皮肤名与颜色' };
  assert.deepEqual(sent, Object.keys(said), '多报了字段要写进说明');
  Object.values(said).forEach(says);
  const stored = /const next = \{([\s\S]*?)\n {2}\};/.exec(worker)[1];
  const extra = [...stored.matchAll(/^ {4}(\w+)[:,]/gm)].map((m) => m[1]).filter((k) => !(k in said));
  assert.deepEqual(extra, ['keyHash', 'publicId', 'isBot', 'updatedAt'], '多存了字段要写进说明');
  says('服务器另记公开编号和更新时间');
  const pub = /function toPublicRow\(p\) \{([\s\S]*?)\n\}/.exec(worker)[1];
  assert.equal(/playerId|keyHash|updatedAt/.test(pub), false);
  says('不公开：玩家编号、密钥哈希、更新时间');
});

test('本机存储只有一个存档键；不用 Cookie；没有别的请求和第三方地址', () => {
  for (const [f, src] of sources) {
    for (const m of src.matchAll(/localStorage\.setItem\(\s*([^,)]+)/g)) assert.equal(m[1].trim(), 'STORAGE_KEY', `${f}: ${m[1]}`);
    assert.equal(/document\.cookie|sessionStorage\.|indexedDB\.|sendBeacon|XMLHttpRequest|new WebSocket/.test(src), false, f);
    for (const m of src.matchAll(/fetch\(\s*([^,)]+)/g)) {
      assert.ok(["'/api/leaderboard'", "'/api/leaderboard/report'"].includes(m[1].trim()), `${f}: ${m[0]}`);
    }
    for (const m of src.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)) assert.ok(['www.w3.org', 'mob-control.yinosites.com'].includes(m[1]), `${f}: ${m[0]}`);
  }
  says('不用 Cookie');
});

test('举报：阈值、保存天数、每人上限、总上限、上传与保存的字段和说明一致', () => {
  const num = (name) => Number(new RegExp(`const ${name} = (\\d+);`).exec(worker)[1]);
  const threshold = num('REPORT_HIDE_THRESHOLD');
  const keepDays = num('REPORT_KEEP_DAYS');
  const perReporter = num('REPORTS_PER_REPORTER');
  const targets = num('MAX_REPORT_TARGETS');
  says(`被 ${threshold} 个不同玩家举报的行，昵称先显示成默认名，直到人工处理`);
  says(`每条举报记录在最后一次举报或处理后 ${keepDays} 天删除`);
  says(`每人同时最多有 ${perReporter} 条举报在记录里`);
  says(`最多同时记录 ${targets} 个被举报的行`);
  assert.ok(worker.includes('expirationTtl: REPORT_KEEP_DAYS * 86400'));
  assert.ok(worker.includes('REPORT_KEEP_DAYS * 86400000'), '单条记录也按天数清掉');
  // 前端上传的字段
  const fn = /public async reportLeaderboardName[\s\S]*?\n {2}\}\n/.exec(state)[0];
  const sent = /JSON\.stringify\(\{ ([^}]*) \}\)/.exec(fn)[1].split(',').map((k) => k.trim().split(':')[0]);
  assert.deepEqual(sent, ['writeKey', 'publicId', 'reason']);
  says('你的写入密钥（只用来确认你本周在榜上，不保存）、被举报那行的公开编号、原因');
  // 服务端保存的字段
  const entry = /const entry = \{([\s\S]*?)\n {2}\};/.exec(worker)[1];
  const stored = [...entry.matchAll(/^ {4}(\w+):/gm)].map((m) => m[1]);
  assert.deepEqual(stored, ['nameHash', 'reasons', 'reporters', 'firstAt', 'lastAt', 'status'], '多存了字段要写进说明');
  says('被举报的公开编号、被举报时昵称的哈希、各原因的次数、举报人的公开编号、第一次和最近一次举报时间、处理状态');
  says('改名后旧的举报不再算');
  says('满了先删最早的、人数还没到的记录');
  assert.equal(/keyHash|writeKey|playerId/.test(entry), false, '举报记录不存密钥和玩家编号');
  // 默认名格式与说明一致
  assert.match(defaultNameFor('u_0000000000000000'), /^应援团长\d{4}$/);
  says('默认名「应援团长」加四位数');
});

test('服务端不碰 IP；转发的源站写在说明里', () => {
  assert.equal(/CF-Connecting-IP|X-Forwarded-For|request\.cf\b|user-agent/i.test(worker), false);
  for (const m of worker.matchAll(/https:\/\/([a-z0-9.-]+)/g)) says(m[1]);
  assert.ok(worker.includes('headers: request.headers'), '转发不再带原请求头的话，说明要改');
  says('请求会原样转到源站');
});

test('分享：复制的文字与网址里的内容和说明一致', () => {
  const fn = /public buildShareChallengeText[\s\S]*?\n {2}\}\n/.exec(state)[0];
  assert.ok(fn.includes('ref=${encodeURIComponent(this.shareId)}'));
  assert.ok(fn.includes('&from=${encodeURIComponent(fromName)}') && fn.includes('isNameBlocked(this.playerName)'), '昵称只在过了词表时才带');
  assert.equal(/playerId|leaderboardWriteKey/.test(fn), false);
  says('带有你分享编号和昵称的链接');
  says('编号和昵称写在网址里');
});
