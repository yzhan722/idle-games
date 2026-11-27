// 周榜写入凭据测试：node --test scripts/leaderboard_auth.test.mjs（进程内调用 Worker，KV 用内存假件，不开端口、不开浏览器）
import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../deploy/worker.mjs';
import { SHARE_ID_PATTERN, WRITE_KEY_PATTERN, createShareId, createWriteKey } from '../src/game/Leaderboard.ts';
import { loadTs, newHeadlessState } from './lib/load_ts.mjs';

const { S } = await loadTs({ S: 'src/game/State.ts' });

const WEEK_MS = 7 * 24 * 3600 * 1000;
const WEEK_START = 316800000 + 2950 * WEEK_MS;
const realNow = Date.now;
let clock = WEEK_START + 3 * 24 * 3600 * 1000;
test.beforeEach(() => {
  // 每个用例往后挪 10 分钟：新建行的每分钟限额不会跨用例累计
  clock += 600000;
  Date.now = () => clock;
});
test.after(() => {
  Date.now = realNow;
});

const makeKv = (seed) => {
  const store = new Map([['real_players_weekly_w2950', JSON.stringify(seed || [])]]);
  const env = {
    puts: 0,
    MOB_CONTROL_LEADERBOARD: {
      get: async (k) => (store.has(k) ? JSON.parse(store.get(k)) : null),
      put: async (k, v) => {
        env.puts++;
        store.set(k, v);
      },
    },
    rows: (week = 2950) => JSON.parse(store.get(`real_players_weekly_w${week}`) || '[]'),
    raw: () => [...store.values()].join('\n'),
  };
  return env;
};
const send = async (env, init) => (await worker.fetch(new Request('https://example.test/api/leaderboard', init), env)).text();
const post = async (env, body) => JSON.parse(await send(env, { method: 'POST', body: JSON.stringify(body) }));
const get = async (env) => JSON.parse(await send(env));
const score = (extra) => ({ name: '真人甲', bestStage: 12, totalKills: 900, playTimeSeconds: 1800, skinName: '海盐汽水糖', badgeColor: '#25c4f8', ...extra });

const K1 = createWriteKey();
const K2 = createWriteKey();

test('密钥与分享编号的格式；每次都不同', () => {
  assert.match(K1, WRITE_KEY_PATTERN);
  assert.notEqual(K1, K2);
  assert.match(createShareId(), SHARE_ID_PATTERN);
});

test('首次写入绑定：KV 里只有密钥哈希；榜单不给编号、哈希、时间，公开编号与密钥、编号无关', async () => {
  const env = makeKv();
  const d = await post(env, score({ playerId: 'cmd_secret_1', writeKey: K1 }));
  assert.equal(d.accepted, true);
  const [row] = env.rows();
  assert.match(row.keyHash, /^[0-9a-f]{64}$/);
  assert.notEqual(row.keyHash, K1);
  assert.ok(!env.raw().includes(K1));
  for (const text of [JSON.stringify(d), await send(env)]) {
    for (const leak of [K1, row.keyHash, 'cmd_secret_1', 'playerId', 'keyHash', 'updatedAt', 'writeKey']) {
      assert.ok(!text.includes(leak), leak);
    }
  }
  assert.match(d.selfPublicId, /^u_[0-9a-f]{16}$/);
  assert.equal(d.top10[0].publicId, d.selfPublicId);
  assert.ok(!row.keyHash.includes(d.selfPublicId.slice(2)));
  assert.equal(d.top10.length, 10);
});

test('拿到编号但密钥不对 / 没有密钥：改不了名也刷不了分', async () => {
  const env = makeKv();
  await post(env, score({ playerId: 'p1', writeKey: K1 }));
  const before = env.rows();
  clock += 60000;
  const wrong = await post(env, score({ playerId: 'p1', writeKey: K2, name: '冒名', bestStage: 999 }));
  assert.equal(wrong.accepted, false);
  assert.equal(wrong.reason, 'key_mismatch');
  assert.equal(wrong.selfPublicId, undefined);
  const none = await post(env, score({ playerId: 'p1', name: '冒名', bestStage: 999 }));
  assert.equal(none.reason, 'key_required');
  assert.equal((await post(env, score({ playerId: 'p1', writeKey: 'abc' }))).reason, 'bad_key');
  assert.deepEqual(env.rows(), before);
});

test('拿榜上的公开编号或同名去写：只会另起一行，原来那行不动', async () => {
  const env = makeKv();
  const mine = await post(env, score({ playerId: 'p1', writeKey: K1 }));
  clock += 60000;
  await post(env, score({ playerId: mine.selfPublicId, name: '真人甲', bestStage: 3, writeKey: K2 }));
  await post(env, { ...score({ name: '真人甲', bestStage: 4 }), playerId: undefined });
  const own = env.rows().find((r) => r.playerId === 'p1');
  assert.equal(own.bestStage, 12);
  assert.equal(env.rows().length, 3);
  assert.equal(new Set(env.rows().map((r) => r.publicId)).size, 3);
});

test('旧数据：没有密钥的行第一次带密钥写入时绑定，成绩不倒退，之后核对', async () => {
  const legacy = { playerId: 'cmd_old', name: '老玩家', bestStage: 30, totalKills: 8000, playTimeSeconds: 5000, skinName: 's', badgeColor: '#ffffff', isBot: false, updatedAt: clock };
  const env = makeKv([legacy]);
  const g = await get(env);
  assert.equal(g.top10[0].name, '老玩家');
  assert.equal('publicId' in g.top10[0] || 'playerId' in g.top10[0], false);
  const d = await post(env, score({ playerId: 'cmd_old', writeKey: K1, name: '老玩家', bestStage: 2, totalKills: 10, playTimeSeconds: 60 }));
  assert.equal(d.accepted, true);
  assert.equal(env.rows().length, 1);
  assert.deepEqual(
    [env.rows()[0].bestStage, env.rows()[0].totalKills, env.rows()[0].playTimeSeconds],
    [30, 8000, 5000]
  );
  clock += 60000;
  assert.equal((await post(env, score({ playerId: 'cmd_old', writeKey: K2 }))).reason, 'key_mismatch');
});

test('旧客户端（不带密钥）还能更新自己没绑定的行；更旧的无编号行按名字续写', async () => {
  const env = makeKv([{ name: '无编号', bestStage: 5, totalKills: 100, playTimeSeconds: 300, skinName: 's', badgeColor: '#ffffff', isBot: false, updatedAt: 0 }]);
  await post(env, score({ playerId: 'p_old' }));
  clock += 60000;
  const d = await post(env, score({ playerId: 'p_old', bestStage: 14 }));
  assert.equal(d.accepted, true);
  assert.equal(env.rows().find((r) => r.playerId === 'p_old').bestStage, 14);
  await post(env, { ...score({ name: '无编号', bestStage: 6 }), playerId: undefined });
  assert.equal(env.rows().length, 2);
  assert.equal(env.rows().find((r) => r.name === '无编号').bestStage, 6);
  for (const f of ['name', 'bestStage', 'totalKills', 'playTimeSeconds', 'skinName', 'badgeColor', 'isBot']) assert.ok(f in d.top10[0], f);
});

test('换编号不换密钥：仍是同一行；公开编号跨周不变', async () => {
  const env = makeKv();
  const a = await post(env, score({ playerId: 'p1', writeKey: K1 }));
  clock += 60000;
  const b = await post(env, score({ playerId: 'p2', writeKey: K1, bestStage: 13 }));
  assert.equal(env.rows().length, 1);
  assert.equal(b.selfPublicId, a.selfPublicId);
  const saved = clock;
  clock = WEEK_START + WEEK_MS + 3600000;
  const c = await post(env, score({ playerId: 'p2', writeKey: K1, bestStage: 1, totalKills: 1, playTimeSeconds: 10 }));
  assert.equal(c.selfPublicId, a.selfPublicId);
  assert.equal(env.rows(2951).length, 1);
  clock = saved;
});

test('分数上限：关卡 999；时长不超过本周已过时间 + 1 小时；击退按时长封顶；坏数字当 0', async () => {
  const env = makeKv();
  const saved = clock;
  clock = WEEK_START + 2 * 3600000;
  const d = await post(env, score({ playerId: 'x', writeKey: K1, bestStage: 1e9, totalKills: 1e12, playTimeSeconds: 1e12 }));
  const me = d.top10[0];
  assert.equal(me.bestStage, 999);
  assert.equal(me.playTimeSeconds, 3 * 3600);
  assert.equal(me.totalKills, 3 * 3600 * 100 + 5000);
  const bad = await post(env, score({ playerId: 'y', writeKey: K2, bestStage: 'NaN', totalKills: null, playTimeSeconds: -5 }));
  assert.equal(bad.reason, 'empty');
  clock = saved;
});

test('正常成绩不受上限影响', async () => {
  const env = makeKv();
  const d = await post(env, score({ playerId: 'x', writeKey: K1, bestStage: 60, totalKills: 48620, playTimeSeconds: 14820 }));
  assert.deepEqual([d.top10[0].bestStage, d.top10[0].totalKills, d.top10[0].playTimeSeconds], [60, 48620, 14820]);
});

test('频率：5 秒内第二次不写；内容没变不写 KV；每分钟最多 30 个新玩家行', async () => {
  const env = makeKv();
  await post(env, score({ playerId: 'p1', writeKey: K1 }));
  clock += 2000;
  const fast = await post(env, score({ playerId: 'p1', writeKey: K1, bestStage: 13 }));
  assert.deepEqual([fast.accepted, fast.reason], [false, 'too_fast']);
  assert.equal(fast.top10[0].bestStage, 12);
  assert.ok(fast.selfPublicId);
  clock += 4000;
  assert.equal((await post(env, score({ playerId: 'p1', writeKey: K1, bestStage: 13 }))).accepted, true);
  const puts = env.puts;
  clock += 60000;
  assert.equal((await post(env, score({ playerId: 'p1', writeKey: K1, bestStage: 13 }))).accepted, true);
  assert.equal(env.puts, puts);
  let busy = 0;
  for (let i = 0; i < 40; i++) {
    if ((await post(env, score({ playerId: `n${i}`, writeKey: createWriteKey(), bestStage: 1 }))).reason === 'busy') busy++;
  }
  assert.equal(busy, 10);
});

test('坏请求：不是 JSON、超长、空名字都只回榜单，不写 KV', async () => {
  const env = makeKv();
  for (const body of ['{', 'null', '[]', '"x"', JSON.stringify(score({ pad: 'x'.repeat(5000) })), JSON.stringify(score({ name: ' \u0000\n ' }))]) {
    const d = JSON.parse(await send(env, { method: 'POST', body }));
    assert.equal(d.top10.length, 10);
  }
  assert.equal(env.puts, 0);
});

test('KV 读失败：只展示内存副本，不写回（否则一次抖动就把整张榜冲掉），回 busy', async () => {
  const env = makeKv();
  await post(env, score({ playerId: 'p1', writeKey: K1 }));
  const before = env.rows();
  const puts = env.puts;
  clock += 60000;
  const goodGet = env.MOB_CONTROL_LEADERBOARD.get;
  env.MOB_CONTROL_LEADERBOARD.get = async () => {
    throw new Error('kv down');
  };
  const d = await post(env, score({ playerId: 'p2', writeKey: K2, name: '真人乙' }));
  assert.deepEqual([d.accepted, d.reason], [false, 'busy']);
  assert.equal(d.top10.length, 10);
  assert.equal(env.puts, puts);
  env.MOB_CONTROL_LEADERBOARD.get = goodGet;
  assert.deepEqual(env.rows(), before);
});

test('KV 写失败（同一键每秒只能写一次）：不假装成功，回 busy', async () => {
  const env = makeKv();
  const goodPut = env.MOB_CONTROL_LEADERBOARD.put;
  env.MOB_CONTROL_LEADERBOARD.put = async () => {
    throw new Error('429');
  };
  const d = await post(env, score({ playerId: 'p1', writeKey: K1 }));
  assert.deepEqual([d.accepted, d.reason], [false, 'busy']);
  assert.ok(d.selfPublicId);
  env.MOB_CONTROL_LEADERBOARD.put = goodPut;
  assert.equal((await post(env, score({ playerId: 'p1', writeKey: K1 }))).accepted, true);
  assert.equal(env.rows().length, 1);
});

test('声明超长的请求体不读；昵称去掉反向 / 零宽字符，表情连接符保留', async () => {
  const env = makeKv();
  let read = false;
  const huge = { url: 'https://example.test/api/leaderboard', method: 'POST', headers: new Headers({ 'content-length': '50000000' }), text: async () => ((read = true), '{}') };
  assert.equal((await worker.fetch(huge, env)).status, 200);
  assert.equal(read, false);
  await post(env, score({ playerId: 'p1', writeKey: K1, name: '甲‮​乙👨‍👩‍👧' }));
  assert.equal(env.rows()[0].name, '甲乙👨‍👩‍👧');
  assert.equal((await post(env, score({ playerId: 'p2', writeKey: K2, name: '​⁦' }))).reason, 'empty');
});

// ---- 客户端 ----
const SAVE_KEY = 'swarm_control_3d_save_v3';
const captureFetch = (reply = {}) => {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url, method: init.method, body: init.body ? JSON.parse(init.body) : null });
    return { ok: true, json: async () => reply };
  };
  return calls;
};
const readSave = () => JSON.parse(globalThis.localStorage.getItem(SAVE_KEY));

test('客户端：旧存档没有密钥时自动补，其他字段不丢；密钥存下来后不再变', () => {
  const seed = newHeadlessState(S);
  seed.save();
  const old = readSave();
  delete old.leaderboardWriteKey;
  delete old.shareId;
  Object.assign(old, { playerId: 'cmd_old_1', playerName: '老玩家', gold: 777, weeklyBestStage: 9 });
  globalThis.localStorage.setItem(SAVE_KEY, JSON.stringify(old));
  const st = new S.GameState();
  assert.match(st.leaderboardWriteKey, WRITE_KEY_PATTERN);
  assert.match(st.shareId, SHARE_ID_PATTERN);
  assert.deepEqual([st.playerId, st.playerName, st.gold, st.weeklyBestStage], ['cmd_old_1', '老玩家', 777, 9]);
  // 读档时就落盘：第二个标签页（还没人存过档）读到的是同一把密钥
  assert.equal(readSave().leaderboardWriteKey, st.leaderboardWriteKey);
  const otherTab = new S.GameState();
  assert.deepEqual([otherTab.leaderboardWriteKey, otherTab.shareId], [st.leaderboardWriteKey, st.shareId]);
  st.save();
  const again = new S.GameState();
  assert.equal(again.leaderboardWriteKey, st.leaderboardWriteKey);
  assert.equal(again.shareId, st.shareId);
  globalThis.localStorage.setItem(SAVE_KEY, JSON.stringify({ ...readSave(), leaderboardWriteKey: 'bad', shareId: 5 }));
  assert.match(new S.GameState().leaderboardWriteKey, WRITE_KEY_PATTERN);
});

test('客户端：旧的默认昵称换成「应援团长」，自己起的名字不动', () => {
  const seed = newHeadlessState(S);
  for (const [from, to] of [['指挥官1234', '应援团长1234'], ['指挥官小明', '指挥官小明'], ['我是指挥官1234', '我是指挥官1234']]) {
    seed.playerName = from;
    seed.save();
    assert.equal(new S.GameState().playerName, to);
  }
});

test('客户端：只有 POST 带密钥，且先落盘再上报；分享链接不含编号和密钥', async () => {
  const st = newHeadlessState(S);
  globalThis.window = { location: { origin: 'https://example.test' } };
  const calls = captureFetch({ selfPublicId: 'u_0123456789abcdef', top10: [] });
  await st.syncRemoteLeaderboard(true);
  assert.equal(calls[0].method, 'GET');
  assert.equal(calls[0].body, null);
  st.weeklyBestStage = 3;
  await st.syncRemoteLeaderboard(false);
  assert.equal(calls[1].method, 'GET');
  await st.syncRemoteLeaderboard(true);
  assert.equal(calls[2].method, 'POST');
  assert.equal(calls[2].body.writeKey, st.leaderboardWriteKey);
  assert.equal(readSave().leaderboardWriteKey, st.leaderboardWriteKey);
  assert.ok(!String(calls[2].url).includes(st.leaderboardWriteKey));
  for (const args of [[], [3, 9]]) {
    const share = JSON.stringify(st.buildShareChallengeText(...args));
    assert.ok(!share.includes(st.playerId) && !share.includes(st.leaderboardWriteKey));
    assert.ok(share.includes(`ref=${st.shareId}`));
  }
  delete globalThis.window;
});

/** 把补发定时器换成手动触发，测试不真等。 */
const withFakeTimers = async (fn) => {
  const real = globalThis.setTimeout;
  const timers = [];
  globalThis.setTimeout = (cb, ms) => timers.push({ cb, ms });
  try {
    await fn(timers);
  } finally {
    globalThis.setTimeout = real;
  }
};

test('客户端：编号被别人占用时换新编号，密钥不变，并补发一次', async () => {
  await withFakeTimers(async (timers) => {
    const st = newHeadlessState(S);
    st.weeklyBestStage = 3;
    const [id, key] = [st.playerId, st.leaderboardWriteKey];
    const calls = captureFetch({ accepted: false, reason: 'key_mismatch' });
    await st.syncRemoteLeaderboard(true);
    assert.notEqual(st.playerId, id);
    assert.equal(st.leaderboardWriteKey, key);
    assert.equal(readSave().playerId, st.playerId);
    const newId = st.playerId;
    timers[0].cb();
    assert.deepEqual([calls.length, calls[1].body.playerId, calls[1].body.writeKey], [2, newId, key]);
  });
});

test('客户端：5 秒内连过两关被限频时补发一次，补的是最新成绩；补发失败不再排，正常收下不排', async () => {
  await withFakeTimers(async (timers) => {
    const st = newHeadlessState(S);
    st.weeklyBestStage = 3;
    const calls = captureFetch({ accepted: false, reason: 'too_fast' });
    await st.syncRemoteLeaderboard(true);
    await st.syncRemoteLeaderboard(true);
    assert.deepEqual(timers.map((t) => t.ms), [6000]);
    st.weeklyBestStage = 4;
    timers[0].cb();
    await new Promise((r) => setImmediate(r));
    assert.equal(calls.length, 3);
    assert.equal(calls[2].body.bestStage, 4);
    assert.equal(timers.length, 1);
    captureFetch({ accepted: true });
    await st.syncRemoteLeaderboard(true);
    captureFetch({ accepted: false, reason: 'empty' });
    await st.syncRemoteLeaderboard(true);
    assert.equal(timers.length, 1);
    captureFetch({ accepted: false, reason: 'busy' });
    await st.syncRemoteLeaderboard(false);
    assert.equal(timers.length, 1);
    await st.syncRemoteLeaderboard(true);
    assert.equal(timers[1].ms, 65000);
  });
});

test('客户端：昵称截断不留半个表情，分享链接不会抛错', () => {
  const st = newHeadlessState(S);
  globalThis.window = { location: { origin: 'https://example.test' } };
  st.gold = 1e9;
  assert.equal(st.setPlayerName('一二三四五六七八九十甲乙丙😀').ok, true);
  assert.equal(st.playerName, '一二三四五六七八九十甲乙丙');
  assert.ok(st.buildShareChallengeText().url.includes('from='));
  // 旧存档里已经存了半个表情的也能救回来
  st.save();
  globalThis.localStorage.setItem(SAVE_KEY, JSON.stringify({ ...readSave(), playerName: '甲\ud83d' }));
  const again = new S.GameState();
  assert.equal(again.playerName, '甲');
  assert.doesNotThrow(() => again.buildShareChallengeText());
  delete globalThis.window;
});

test('客户端：榜单用公开编号认自己，同名的别人照常显示；旧服务端仍按编号 / 名字认', async () => {
  const st = newHeadlessState(S);
  st.weeklyBestStage = 3;
  const row = (extra) => ({ name: st.playerName, bestStage: 8, totalKills: 1, playTimeSeconds: 60, skinName: 's', badgeColor: '#fff', isBot: false, ...extra });
  captureFetch({
    selfPublicId: 'u_aaaaaaaaaaaaaaaa',
    top10: [row({ publicId: 'u_bbbbbbbbbbbbbbbb' }), row({ publicId: 'u_aaaaaaaaaaaaaaaa', name: '改名前' })],
    realPlayerCount: 2,
  });
  await st.syncRemoteLeaderboard(true);
  const names = st.getTop10Leaderboard().top10.filter((r) => !r.isBot);
  assert.deepEqual(names.map((r) => [r.isSelf, r.publicId]), [[false, 'u_bbbbbbbbbbbbbbbb'], [true, 'u_aaaaaaaaaaaaaaaa']]);

  const st2 = newHeadlessState(S);
  st2.weeklyBestStage = 3;
  captureFetch({ top10: [row({ playerId: st2.playerId, name: '改名前' }), row({ name: st2.playerName })] });
  await st2.syncRemoteLeaderboard(true);
  assert.equal(st2.getTop10Leaderboard().top10.filter((r) => !r.isBot).length, 1);
});
