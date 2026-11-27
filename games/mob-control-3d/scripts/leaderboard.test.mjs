// 周榜规则测试：node --test scripts/leaderboard.test.mjs（不开端口、不开浏览器，Worker 直接进程内调用）
import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../deploy/worker.mjs';
import { compareByPeakStage, compareByPlayTime, escapeHtml, rankLeaderboard } from '../src/game/Leaderboard.ts';

const entry = (name, bestStage, extra = {}) => ({
  name,
  bestStage,
  totalKills: bestStage * 100,
  playTimeSeconds: bestStage * 60,
  skinName: 's',
  badgeColor: '#fff',
  ...extra,
});
const bots = Array.from({ length: 10 }, (_, i) => entry(`bot${i}`, 30 - i, { isBot: true }));

test('没有真人：只放 9 个陪练并提示，陪练没有名次', () => {
  const r = rankLeaderboard([], bots, compareByPeakStage);
  assert.equal(r.hasReal, false);
  assert.equal(r.rows.length, 9);
  assert.ok(r.rows.every((e) => e.isBot && e.rank === null));
  assert.equal(r.selfRank, null);
});

test('真人永远排在陪练前面，名次只在真人之间算', () => {
  const r = rankLeaderboard(
    [entry('b', 1), entry('我', 3, { isSelf: true }), entry('c', 2)],
    bots,
    compareByPeakStage
  );
  assert.deepEqual(r.rows.slice(0, 3).map((e) => [e.name, e.rank]), [['我', 1], ['c', 2], ['b', 3]]);
  assert.ok(r.rows.slice(3).every((e) => e.isBot && e.rank === null));
  assert.equal(r.rows.length, 10);
  assert.equal(r.selfRank, 1);
});

test('真人满 10 个就不放陪练；超出的真人不显示', () => {
  const many = Array.from({ length: 12 }, (_, i) => entry(`p${i}`, i + 1, { isSelf: i === 0 }));
  const r = rankLeaderboard(many, bots, compareByPeakStage);
  assert.equal(r.rows.length, 10);
  assert.ok(r.rows.every((e) => !e.isBot));
  assert.equal(r.selfRank, null);
});

test('活跃榜按时长排', () => {
  const r = rankLeaderboard(
    [entry('少', 9, { playTimeSeconds: 10 }), entry('多', 1, { playTimeSeconds: 999 })],
    [],
    compareByPlayTime
  );
  assert.deepEqual(r.rows.map((e) => e.name), ['多', '少']);
});

test('昵称转义', () => {
  assert.equal(escapeHtml('<img src=x onerror="a\'b&">'), '&lt;img src=x onerror=&quot;a&#39;b&amp;&quot;&gt;');
  assert.equal(escapeHtml(undefined), '');
  assert.equal(escapeHtml(12), '12');
});

const call = async (env, body) => {
  const req = new Request('https://example.test/api/leaderboard', body
    ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
    : undefined);
  return (await worker.fetch(req, env)).json();
};
const memoryKv = () => {
  const store = new Map();
  return {
    MOB_CONTROL_LEADERBOARD: {
      get: async (k) => (store.has(k) ? JSON.parse(store.get(k)) : null),
      put: async (k, v) => void store.set(k, v),
    },
  };
};

test('Worker：空榜全是带 isBot 的陪练，旧字段齐全', async () => {
  const d = await call(memoryKv());
  assert.equal(d.realPlayerCount, 0);
  assert.equal(d.top10.length, 10);
  assert.ok(d.top10.every((e) => e.isBot === true));
  for (const k of ['weekKey', 'nextResetAtMs', 'top10', 'activeTop10', 'realPlayerCount', 'storage']) assert.ok(k in d, k);
  for (const k of ['name', 'bestStage', 'totalKills', 'playTimeSeconds', 'skinName', 'badgeColor']) assert.ok(k in d.top10[0], k);
});

test('Worker：只打了 1 关的真人也排在 28 关的陪练前面；不能自称陪练', async () => {
  const env = memoryKv();
  const d = await call(env, { playerId: 'p1', name: '真人甲', bestStage: 1, totalKills: 5, playTimeSeconds: 70, isBot: true });
  assert.equal(d.top10[0].name, '真人甲');
  assert.equal(d.top10[0].isBot, false);
  assert.equal(d.activeTop10[0].name, '真人甲');
  assert.equal(d.top10.length, 10);
  assert.ok(d.top10.slice(1).every((e) => e.isBot));
  const times = d.activeTop10.slice(1).map((e) => e.playTimeSeconds);
  assert.deepEqual(times, [...times].sort((a, b) => b - a));
});
