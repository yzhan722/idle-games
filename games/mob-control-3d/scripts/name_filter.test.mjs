// 昵称过滤与举报测试：node --test scripts/name_filter.test.mjs（Worker 进程内调用，KV 用内存假件，不开端口、不开浏览器）
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import worker from '../deploy/worker.mjs';
import { defaultNameFor, findBlockedTerm, isNameBlocked, safeDisplayName } from '../src/game/nameFilter.mjs';
import { BOT_NAMES } from '../src/game/nameBlocklist.mjs';
import { REPORT_REASONS, parseReportChoice, reportResultText } from '../src/game/Leaderboard.ts';
import { GAME_ROOT, loadTs, newHeadlessState } from './lib/load_ts.mjs';

const read = (f) => readFileSync(path.join(GAME_ROOT, f), 'utf8');

// ---------- 词表与归一化 ----------

test('变体：全角、空格、零宽、大小写、符号、数字代字母、西里尔形近字母都能拦住', () => {
  const cases = {
    傻逼: 'insult',
    '傻 逼': 'insult',
    '傻​逼': 'insult',
    '傻‮逼': 'insult',
    '傻@逼': 'insult',
    'ＦＵＣＫ': 'insult',
    'FuCk': 'insult',
    'f u c k': 'insult',
    'f.u.c.k': 'insult',
    'sh1t': 'insult',
    '$hit': 'insult',
    'b!tch': 'insult',
    'a55': 'insult',
    'p0rn': 'sexual',
    'Sexy宝贝': 'sexual',
    '约 炮': 'sexual',
    '３K党': 'hate',
    '管 理 员': 'impersonation',
    '官方客服': 'impersonation',
    'GM小王': 'impersonation',
    'Admin': 'impersonation',
    'admin123': 'impersonation',
    'a d m i n': 'impersonation',
    'аdmin': 'impersonation', // 第一个是西里尔字母 а
    '薄荷小号手': 'impersonation',
    '薄荷小号手2': 'impersonation',
    '电音喵喵ＤＪ': 'impersonation',
    '我是陪练': 'impersonation',
  };
  for (const [name, category] of Object.entries(cases)) {
    assert.equal(findBlockedTerm(name)?.category, category, name);
  }
});

test('不误伤：默认名、常见英文单词、普通中文昵称', () => {
  const ok = [
    '应援团长1234', '应援团长4559', '应援团长7175', '应援团长5051', 'Class', 'grape', 'peacock', 'badminton', 'Sussex',
    'Hello Kitty', 'Dev', '草莓', '好人', '大笨蛋', '小a小b', 'hi!', '波波', '应援伙伴', 'Assassin',
  ];
  for (const name of ok) assert.equal(findBlockedTerm(name), null, name);
  // 所有 9000 个默认名都不被拦
  for (let n = 1000; n <= 9999; n++) assert.equal(isNameBlocked(`应援团长${n}`), false, String(n));
});

test('默认名：格式和新玩家一样、同一编号每次一样；safeDisplayName 只换命中的', () => {
  assert.match(defaultNameFor('u_abc'), /^应援团长\d{4}$/);
  assert.equal(defaultNameFor('u_abc'), defaultNameFor('u_abc'));
  assert.equal(safeDisplayName('波波', 'u_abc'), '波波');
  assert.equal(safeDisplayName('傻逼', 'u_abc'), defaultNameFor('u_abc'));
});

test('陪练名单和 Worker、State 里的陪练一致（改陪练名字要同步词表）', () => {
  const names = (src) => [...src.matchAll(/\{ name: '([^']+)', bestStage/g)].map((m) => m[1]);
  const fromWorker = names(read('deploy/worker.mjs'));
  const fromState = names(read('src/game/State.ts').split('export const DEFAULT_LEADERBOARD')[1].split('];')[0]);
  assert.equal(fromWorker.length, 10);
  assert.deepEqual([...fromWorker].sort(), [...BOT_NAMES].sort());
  assert.deepEqual([...fromState].sort(), [...BOT_NAMES].sort());
});

test('前端和 Worker 引的是同一个过滤模块；举报原因代码两边一致', () => {
  const w = read('deploy/worker.mjs');
  assert.ok(w.includes("from '../src/game/nameFilter.mjs'"));
  assert.ok(read('src/game/State.ts').includes("from './nameFilter.mjs'"));
  const workerReasons = /const REPORT_REASONS = \[([^\]]*)\]/.exec(w)[1].match(/'(\w+)'/g).map((s) => s.slice(1, -1));
  assert.deepEqual(workerReasons, REPORT_REASONS.map((r) => r.code));
});

test('举报弹窗：编号转原因，填错返回 null；结果提示', () => {
  assert.equal(parseReportChoice('1'), 'insult');
  assert.equal(parseReportChoice(' ４ '), 'impersonation');
  assert.equal(parseReportChoice('5'), 'other');
  for (const bad of [null, '', '0', '6', 'abc', '1.5']) assert.equal(parseReportChoice(bad), null, String(bad));
  assert.equal(reportResultText(true), '收到，谢谢');
  assert.equal(reportResultText(true, 'duplicate'), '已经举报过了');
  assert.equal(reportResultText(false, 'not_ranked'), '本周上榜后才能举报');
});

test('前端改名：命中词表不让改、不扣金币；正常名照常扣', async () => {
  const { S } = await loadTs({ S: 'src/game/State.ts' });
  const s = newHeadlessState(S);
  s.gold = 500000;
  const before = s.playerName;
  assert.deepEqual(s.setPlayerName('ＧＭ 小王'), { ok: false, reason: 'blocked' });
  assert.equal(s.playerName, before);
  assert.equal(s.gold, 500000);
  assert.equal(s.setPlayerName('草莓波波').ok, true);
  assert.equal(s.playerName, '草莓波波');
  assert.ok(s.gold < 500000);
});

// ---------- Worker：写入、读出、举报 ----------

const WEEK_MS = 7 * 24 * 3600 * 1000;
const realNow = Date.now;
let clock = 316800000 + 2950 * WEEK_MS + 2 * 24 * 3600 * 1000;
test.beforeEach(() => {
  clock += 600000; // 每个用例往后挪 10 分钟：每分钟限额不跨用例累计
  Date.now = () => clock;
});
test.after(() => {
  Date.now = realNow;
});

const sha = (t) => createHash('sha256').update(t).digest('hex');
const keyOf = (i) => sha(`test-key-${i}`);
const publicIdOf = (key) => `u_${sha(`mc-lb-public|${sha(`mc-lb-key|${key}`)}`).slice(0, 16)}`;
const seedRow = (i, name = `玩家${i}`) => ({
  playerId: `p${i}`,
  keyHash: sha(`mc-lb-key|${keyOf(i)}`),
  publicId: publicIdOf(keyOf(i)),
  name,
  bestStage: 50 - i,
  totalKills: 1000,
  playTimeSeconds: 600,
  skinName: 's',
  badgeColor: '#ffffff',
  isBot: false,
  updatedAt: 0,
});

const boardKey = () => `real_players_weekly_w${Math.floor((clock - 316800000) / WEEK_MS)}`;
const makeKv = (rows = [], extraEnv = {}) => {
  const store = new Map([[boardKey(), JSON.stringify(rows)]]);
  const env = {
    ...extraEnv,
    putOptions: {},
    MOB_CONTROL_LEADERBOARD: {
      get: async (k) => (store.has(k) ? JSON.parse(store.get(k)) : null),
      put: async (k, v, opt) => {
        env.putOptions[k] = opt;
        store.set(k, v);
      },
    },
    rows: () => JSON.parse(store.get(boardKey()) || '[]'),
    reports: () => JSON.parse(store.get('name_reports_v1') || '{}'),
  };
  return env;
};
const call = async (env, pathname, init) => {
  const res = await worker.fetch(new Request(`https://example.test${pathname}`, init), env);
  return { status: res.status, body: res.headers.get('content-type')?.includes('json') ? await res.json() : await res.text() };
};
const board = async (env) => (await call(env, '/api/leaderboard')).body;
const report = async (env, from, target, reason = 'insult') =>
  (await call(env, '/api/leaderboard/report', {
    method: 'POST',
    body: JSON.stringify({ writeKey: keyOf(from), publicId: publicIdOf(keyOf(target)), reason }),
  })).body;
const nameOf = (b, i) => b.top10.find((r) => r.publicId === publicIdOf(keyOf(i)))?.name;

test('Worker 写入：命中词表的昵称存成默认名，成绩照收；KV 里没有原名', async () => {
  const env = makeKv();
  const key = keyOf(1);
  const d = (await call(env, '/api/leaderboard', {
    method: 'POST',
    body: JSON.stringify({ playerId: 'p1', writeKey: key, name: 'Ｆ u c k 王', bestStage: 9, totalKills: 100, playTimeSeconds: 600, skinName: 's', badgeColor: '#ffffff' }),
  })).body;
  assert.equal(d.accepted, true);
  const [row] = env.rows();
  assert.equal(row.name, defaultNameFor(publicIdOf(key)));
  assert.equal(row.bestStage, 9);
  assert.ok(!JSON.stringify(env.rows()).includes('u c k'));
});

test('旧数据：KV 里已有的脏昵称读出时打码，KV 本身不改；陪练名字不受影响', async () => {
  const env = makeKv([seedRow(1, '傻逼一号'), seedRow(2, '正常玩家')]);
  const b = await board(env);
  assert.equal(nameOf(b, 1), defaultNameFor(publicIdOf(keyOf(1))));
  assert.equal(nameOf(b, 2), '正常玩家');
  assert.ok(!JSON.stringify(b).includes('傻逼'));
  assert.equal(env.rows()[0].name, '傻逼一号');
  assert.ok(b.top10.filter((r) => r.isBot).every((r) => BOT_NAMES.includes(r.name)));
});

test('举报：要本周在榜的密钥；目标要在榜上；不能举报自己；原因要合法', async () => {
  const env = makeKv([seedRow(1), seedRow(2)]);
  assert.equal((await report(env, 9, 1)).reason, 'not_ranked');
  assert.equal((await report(env, 1, 1)).reason, 'self');
  assert.equal((await report(env, 1, 7)).reason, 'bad_target');
  assert.equal((await report(env, 1, 2, 'spam')).reason, 'bad_reason');
  const noKey = (await call(env, '/api/leaderboard/report', { method: 'POST', body: JSON.stringify({ publicId: publicIdOf(keyOf(2)), reason: 'insult' }) })).body;
  assert.equal(noKey.reason, 'bad_key');
  assert.equal((await call(env, '/api/leaderboard/report')).status, 405);
  assert.deepEqual(env.reports(), {});
});

test('举报去重：同一人对同一行只算一次；存的是公开编号和原因，不存密钥', async () => {
  const env = makeKv([seedRow(1), seedRow(2)]);
  assert.deepEqual(await report(env, 1, 2, 'sexual'), { ok: true });
  assert.deepEqual(await report(env, 1, 2, 'insult'), { ok: true, reason: 'duplicate' });
  const entry = env.reports()[publicIdOf(keyOf(2))];
  assert.deepEqual(entry.reporters, [publicIdOf(keyOf(1))]);
  assert.deepEqual(entry.reasons, { sexual: 1 });
  const raw = JSON.stringify(env.reports());
  assert.ok(!raw.includes(keyOf(1)) && !raw.includes(seedRow(1).keyHash) && !raw.includes('p1'));
  assert.equal(env.putOptions.name_reports_v1.expirationTtl, 30 * 86400);
});

test('阈值：2 个人举报还显示原名，第 3 个不同的人举报后显示默认名；成绩不变', async () => {
  const env = makeKv([1, 2, 3, 4, 5].map((i) => seedRow(i)));
  await report(env, 1, 5);
  await report(env, 2, 5);
  assert.equal(nameOf(await board(env), 5), '玩家5');
  await report(env, 3, 5);
  const b = await board(env);
  assert.equal(nameOf(b, 5), defaultNameFor(publicIdOf(keyOf(5))));
  assert.equal(b.top10.find((r) => r.publicId === publicIdOf(keyOf(5))).bestStage, 45);
  assert.equal(nameOf(b, 4), '玩家4');
});

test('限流：每人同时最多 10 条；每个实例每分钟最多 20 条', async () => {
  const env = makeKv(Array.from({ length: 14 }, (_, i) => seedRow(i + 1)));
  for (let t = 2; t <= 11; t++) assert.equal((await report(env, 1, t)).ok, true, String(t));
  assert.equal((await report(env, 1, 12)).reason, 'limit');
  // 同一分钟里再来 10 条成功，第 21 条被挡
  for (let t = 3; t <= 12; t++) assert.equal((await report(env, 2, t)).ok, true, String(t));
  assert.equal((await report(env, 3, 13)).reason, 'busy');
  clock += 61000;
  assert.equal((await report(env, 3, 13)).ok, true);
});

test('过期：最后一次举报 30 天后记录清掉，昵称恢复', async () => {
  const env = makeKv([1, 2, 3, 4].map((i) => seedRow(i)));
  for (const from of [1, 2, 3]) await report(env, from, 4);
  assert.notEqual(nameOf(await board(env), 4), '玩家4');
  const rows = env.rows();
  clock += 31 * 86400000;
  // 换周了：把榜搬到新的一周再看
  await env.MOB_CONTROL_LEADERBOARD.put(boardKey(), JSON.stringify(rows));
  assert.equal(nameOf(await board(env), 4), '玩家4');
});

test('管理接口：没配密钥或密钥不对都是 404；配了能列出、恢复、继续隐藏', async () => {
  const rows = [1, 2, 3, 4].map((i) => seedRow(i));
  rows[3].name = '真名四号';
  const plain = makeKv(rows);
  assert.equal((await call(plain, '/api/leaderboard/reports')).status, 404);
  const ADMIN = 'admin-secret-0123456789';
  const env = makeKv(rows, { LEADERBOARD_ADMIN_KEY: ADMIN });
  for (const from of [1, 2, 3]) await report(env, from, 4, 'impersonation');
  assert.equal((await call(env, '/api/leaderboard/reports')).status, 404);
  assert.equal((await call(env, '/api/leaderboard/reports', { headers: { authorization: 'Bearer wrong-key-000000000' } })).status, 404);
  const auth = { authorization: `Bearer ${ADMIN}` };
  const list = (await call(env, '/api/leaderboard/reports', { headers: auth })).body;
  assert.equal(list.threshold, 3);
  assert.equal(list.entries.length, 1);
  assert.equal(list.entries[0].name, '真名四号');
  assert.equal(list.entries[0].hidden, true);
  assert.deepEqual(list.entries[0].reasons, { impersonation: 3 });
  // 恢复：昵称显示回来，之后再有人举报也不自动隐藏
  const settle = (action) =>
    call(env, '/api/leaderboard/reports', { method: 'POST', headers: auth, body: JSON.stringify({ publicId: publicIdOf(keyOf(4)), action }) });
  assert.equal((await settle('clear')).status, 200);
  assert.equal(nameOf(await board(env), 4), '真名四号');
  // 人工隐藏：不管人数都隐藏
  await settle('hide');
  assert.equal(nameOf(await board(env), 4), defaultNameFor(publicIdOf(keyOf(4))));
  assert.equal((await settle('bogus')).status, 400);
});

// ---------- 审查补测（2026-11-27） ----------

test('不误伤：中文常见词、拼音、人名地名里碰巧包含屏蔽字', () => {
  const ok = [
    '过去死磕', '回去死磕', '今日你好', '幸运营地', '好运营业中', 'shitou', 'Shitang石头', 'cuntou', 'Nazir', 'Shitake',
    'Scunthorpe', 'Glass', 'Bassist', 'Essex', 'Japan', 'officially', 'gmail', 'Kkkkk',
  ];
  for (const name of ok) assert.equal(findBlockedTerm(name), null, name);
  // 收紧以后带上下文的写法照样拦
  for (const bad of ['你去死', '去死吧', '日你妈', '官方运营', '运营团队', 'bullshit', 'shit', 'Nazis']) assert.ok(isNameBlocked(bad), bad);
});

test('漏网：重复字母、驼峰、复数', () => {
  const cases = { fuuuuck: 'insult', ffuucckk: 'insult', shiiit: 'insult', SHIIIT王: 'insult', TheAdmin: 'impersonation', iamAdmin: 'impersonation', admins: 'impersonation', Addmin: 'impersonation', aDmIn: 'impersonation' };
  for (const [name, category] of Object.entries(cases)) assert.equal(findBlockedTerm(name)?.category, category, name);
  // 压重复字母只比本身没有连写字母的词：ass 压成 as 不会误伤
  for (const name of ['Glass', 'Assassin', 'Pass', 'Mass']) assert.equal(findBlockedTerm(name), null, name);
});

test('性能：超长输入也不会卡（Worker 只给 20 字，这里压 4000 字）', () => {
  const t = performance.now();
  for (const s of ['a b '.repeat(1000), 'f.'.repeat(2000), '傻'.repeat(4000), '́'.repeat(4000)]) findBlockedTerm(s);
  assert.ok(performance.now() - t < 200);
});

test('弹框：没有 prompt、抛错、瞬间返回 null 都算弹不出来；人取消不算', async () => {
  const { askText } = await import('../src/game/Leaderboard.ts');
  let clock2 = 0;
  const now = () => clock2;
  assert.deepEqual(askText('x', '', undefined, now), { value: null, unavailable: true });
  assert.deepEqual(askText('x', '', () => { throw new Error('no'); }, now), { value: null, unavailable: true });
  assert.deepEqual(askText('x', '', () => null, now), { value: null, unavailable: true });
  assert.deepEqual(askText('x', '', () => { clock2 += 2000; return null; }, now), { value: null, unavailable: false });
  assert.deepEqual(askText('x', '', () => '2', now), { value: '2', unavailable: false });
});

test('分享链接：旧存档的脏昵称不进链接，正常昵称照带', async () => {
  const { S } = await loadTs({ S: 'src/game/State.ts' });
  const s = newHeadlessState(S);
  const hadWindow = 'window' in globalThis;
  const prevWindow = globalThis.window;
  globalThis.window = { location: { origin: 'https://example.test' } };
  try {
    s.playerName = '傻逼大王';
    assert.ok(!s.buildShareChallengeText().url.includes('from='));
    s.playerName = '草莓波波';
    assert.ok(s.buildShareChallengeText().url.includes(`from=${encodeURIComponent('草莓波波')}`));
  } finally {
    if (hadWindow) globalThis.window = prevWindow;
    else delete globalThis.window;
  }
});

test('举报跟着昵称走：被隐藏后改名就显示新名字；新名字的举报重新计数', async () => {
  const env = makeKv([1, 2, 3, 4, 5].map((i) => seedRow(i)));
  for (const from of [1, 2, 3]) await report(env, from, 5);
  assert.equal(nameOf(await board(env), 5), defaultNameFor(publicIdOf(keyOf(5))));
  const rows = env.rows();
  rows.find((r) => r.publicId === publicIdOf(keyOf(5))).name = '新名字';
  await env.MOB_CONTROL_LEADERBOARD.put(boardKey(), JSON.stringify(rows));
  assert.equal(nameOf(await board(env), 5), '新名字');
  // 之前举报过旧名字的人可以再举报新名字，计数从 1 开始
  assert.deepEqual(await report(env, 1, 5), { ok: true });
  assert.equal(env.reports()[publicIdOf(keyOf(5))].reporters.length, 1);
  assert.equal(nameOf(await board(env), 5), '新名字');
});

test('举报表满了：先挤掉最早的、人数没到的记录；管理员隐藏的不挤', async () => {
  const env = makeKv([1, 2, 3].map((i) => seedRow(i)));
  const filler = {};
  for (let i = 0; i < 200; i++) {
    filler[`u_fill${String(i).padStart(11, '0')}`] = { reasons: { other: 1 }, reporters: ['u_x'], firstAt: clock - 1000 + i, lastAt: clock - 1000 + i, status: i === 0 ? 'hidden' : 'open' };
  }
  await env.MOB_CONTROL_LEADERBOARD.put('name_reports_v1', JSON.stringify(filler));
  assert.deepEqual(await report(env, 1, 2), { ok: true });
  const after = env.reports();
  assert.equal(Object.keys(after).length, 200);
  assert.ok(after.u_fill00000000000, '管理员隐藏的留着');
  assert.equal(after.u_fill00000000001, undefined, '最早的未达人数记录被挤掉');
  assert.ok(after[publicIdOf(keyOf(2))]);
});

test('过期记录读的时候就从 KV 里删掉，不只是不显示', async () => {
  const env = makeKv([1, 2].map((i) => seedRow(i)));
  await env.MOB_CONTROL_LEADERBOARD.put('name_reports_v1', JSON.stringify({ u_old: { reasons: { other: 1 }, reporters: ['u_x'], firstAt: 0, lastAt: clock - 31 * 86400000, status: 'open' } }));
  await call(env, '/api/leaderboard/report', { method: 'POST', body: JSON.stringify({ reason: 'insult' }) });
  assert.deepEqual(env.reports(), {});
});

test('管理接口的 404 也不让缓存', async () => {
  const res = await worker.fetch(new Request('https://example.test/api/leaderboard/reports'), makeKv());
  assert.equal(res.status, 404);
  assert.equal(res.headers.get('cache-control'), 'no-store');
});

test('Worker 能打包：照 wrangler 的做法用 esbuild 从 deploy/worker.mjs 打成一个文件，过滤模块和词表都在里面', async () => {
  const { build } = await import('esbuild');
  const out = await build({
    entryPoints: [path.join(GAME_ROOT, 'deploy/worker.mjs')],
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    charset: 'utf8',
    write: false,
    logLevel: 'silent',
  });
  const code = out.outputFiles[0].text;
  assert.ok(!/from ['"]\.\.?\//.test(code), '打包后不该还有相对路径 import');
  assert.ok(code.includes('草泥马') && code.includes('function findBlockedTerm'));
});
