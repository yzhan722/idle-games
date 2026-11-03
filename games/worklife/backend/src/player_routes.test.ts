import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { createMemoryStorage } from './storage_memory';
import { playerRoutes } from './routes/player';
import { mapThrownError } from './http_errors';
import packJson from '../../shared/enhanced_content_pack_chinese.json';
import type { EnhancedContentPack, EnhancedPlayerState } from './types';

const pack = packJson as EnhancedContentPack;

// Only the HTTP transport is replaced; the registered handlers and storage are real.
async function fixture(patch?: (state: EnhancedPlayerState) => void) {
  const storage = createMemoryStorage();
  const user = await storage.findOrCreateGuestUser(`player-command-${randomUUID()}`);
  const initial = await storage.getOrCreatePlayerState(user.id, pack.version);
  patch?.(initial);
  const seeded = await storage.savePlayerState(user.id, initial);
  const handlers = new Map<string, any>();
  const app = {
    get(path: string, fn: any) { handlers.set(`GET ${path}`, fn); },
    post(path: string, fn: any) { handlers.set(`POST ${path}`, fn); },
    delete(path: string, fn: any) { handlers.set(`DELETE ${path}`, fn); },
  };
  await playerRoutes(app as any, storage, pack);
  async function invoke(method: string, path: string, body?: Record<string, unknown>, params?: Record<string, string>) {
    let statusCode = 200;
    const reply = {
      status(code: number) { statusCode = code; return this; },
      send(payload: any) { return { statusCode, payload }; },
    };
    const handler = handlers.get(`${method} ${path}`);
    if (!handler) return reply.status(404).send({ error: 'not_found' });
    try { return await handler({ userId: user.id, body, params }, reply); }
    catch (error) {
      const mapped = mapThrownError(error);
      return reply.status(mapped.status).send(mapped.body);
    }
  }
  const running = (actionId = 'act_chop_wood_t1', agoMs = 60_000) => (s: EnhancedPlayerState) => {
    const since = new Date(Date.now() - agoMs).toISOString();
    s.mode = 'life_action';
    s.lifeActionState = { actionId, startedAt: since };
    s.lastSimulatedAt = since;
  };
  return {
    storage, userId: user.id, seeded, running,
    start: (body: Record<string, unknown> = { actionId: 'act_chop_wood_t1' }) => invoke('POST', '/actions/start', body),
    stop: (body: Record<string, unknown> = {}) => invoke('POST', '/actions/stop', body),
    queue: (body: Record<string, unknown>) => invoke('POST', '/actions/queue', body),
    queueDel: (id: string) => invoke('DELETE', '/actions/queue/:id', undefined, { id }),
    queueClear: (body: Record<string, unknown> = {}) => invoke('POST', '/actions/queue/clear', body),
    queueMove: (body: Record<string, unknown>) => invoke('POST', '/actions/queue/move', body),
    setClass: (body: Record<string, unknown> = { classId: 'farmer' }) => invoke('POST', '/player/class', body),
    getState: () => invoke('GET', '/player/state'),
    ack: (body: Record<string, unknown> = {}) => invoke('POST', '/player/offline-report/ack', body),
  };
}

test('switching actions banks the abandoned run before starting the next one', async () => {
  const f = await fixture();
  try {
    const before = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    f.running('act_chop_wood_t1', 60_000)(before);
    await f.storage.savePlayerState(f.userId, before);
    const response = await f.start({ actionId: 'act_mine_ore_t1' });
    assert.equal(response.statusCode, 200);
    assert.equal(response.payload.lifeActionState.actionId, 'act_mine_ore_t1');
    const state = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    // ~12 completed 5s cycles are banked, not silently dropped by the mode switch.
    assert.ok((state.inventory.wood_1 || 0) >= 10, `wood banked: ${state.inventory.wood_1}`);
    assert.equal(state.mode, 'life_action');
  } finally { await f.storage.close(); }
});

test('concurrent action starts serialize: the second sees the first committed', async () => {
  const f = await fixture();
  try {
    const responses = await Promise.all([f.start({ actionId: 'act_chop_wood_t1' }), f.start({ actionId: 'act_mine_ore_t1' })]);
    assert.deepEqual(responses.map(r => r.statusCode), [200, 200]);
    const state = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    assert.equal(state.lifeActionState.actionId, 'act_mine_ore_t1');
    assert.equal(state.mode, 'life_action');
  } finally { await f.storage.close(); }
});

test('stopping a run hands off to the queued action through one commit', async () => {
  const f = await fixture();
  try {
    const before = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    f.running('act_chop_wood_t1', 30_000)(before);
    before.activityQueue = [{ id: 'q1', actionId: 'act_mine_ore_t1' }];
    await f.storage.savePlayerState(f.userId, before);
    const response = await f.stop();
    assert.equal(response.statusCode, 200);
    assert.equal(response.payload.mode, 'life_action');
    assert.equal(response.payload.lifeActionState.actionId, 'act_mine_ore_t1');
    assert.equal(response.payload.activityQueue.length, 0);
    assert.ok((response.payload.inventory.wood_1 || 0) >= 5);
  } finally { await f.storage.close(); }
});

test('queue adds while running serialize and the cap still applies', async () => {
  const f = await fixture();
  try {
    const before = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    f.running()(before);
    await f.storage.savePlayerState(f.userId, before);
    const adds = await Promise.all([
      f.queue({ actionId: 'act_mine_ore_t1' }),
      f.queue({ actionId: 'act_chop_wood_t1', quantity: 3 }),
    ]);
    assert.deepEqual(adds.map(r => r.statusCode), [200, 200]);
    let state = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    assert.deepEqual(state.activityQueue.map((q: any) => q.actionId), ['act_mine_ore_t1', 'act_chop_wood_t1']);
    // Fill to the cap: 3 more adds reach 5, the next is refused.
    await f.queue({ actionId: 'act_mine_ore_t1' });
    await f.queue({ actionId: 'act_mine_ore_t1' });
    await f.queue({ actionId: 'act_mine_ore_t1' });
    const full = await f.queue({ actionId: 'act_mine_ore_t1' });
    assert.equal(full.statusCode, 400);
    assert.equal(full.payload.error, 'queue_full');
    state = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    assert.equal(state.activityQueue.length, 5);
  } finally { await f.storage.close(); }
});

test('queue move and clear settle first and keep queue order consistent', async () => {
  const f = await fixture();
  try {
    const before = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    f.running()(before);
    before.activityQueue = [
      { id: 'a', actionId: 'act_mine_ore_t1' },
      { id: 'b', actionId: 'act_mine_ore_t1' },
    ];
    await f.storage.savePlayerState(f.userId, before);
    const moved = await f.queueMove({ id: 'b', direction: 'up' });
    assert.equal(moved.statusCode, 200);
    assert.deepEqual(moved.payload.activityQueue.map((q: any) => q.id), ['b', 'a']);
    const cleared = await f.queueClear();
    assert.equal(cleared.statusCode, 200);
    assert.equal(cleared.payload.activityQueue.length, 0);
  } finally { await f.storage.close(); }
});

test('queueing during an hp fight waits instead of starting a parallel life action', async () => {
  const f = await fixture(s => {
    s.mode = 'idle';
    // outcome 已定但玩家尚未离场的战斗：排队只许入队，不许开工
    s.hpCombat = { monsterId: 'slime', playerHp: 0, playerMaxHp: 10, enemyHp: 5, enemyMaxHp: 10, outcome: 'loss', log: [] } as any;
  });
  try {
    const queued = await f.queue({ actionId: 'act_mine_ore_t1' });
    assert.equal(queued.statusCode, 200);
    let state = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    assert.equal(state.activityQueue.length, 1);
    assert.equal(state.lifeActionState, undefined);
    assert.ok(state.hpCombat, 'fight must still be running');
  } finally { await f.storage.close(); }
});

test('a stale stop revision returns the current revision without stopping', async () => {
  const f = await fixture();
  try {
    const before = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    f.running()(before);
    await f.storage.savePlayerState(f.userId, before);
    const stale = (f.seeded as EnhancedPlayerState).stateRevision ?? 0;
    // A real commit bumps the revision first (queueing is legal while an action runs).
    assert.equal((await f.queue({ actionId: 'act_mine_ore_t1' })).statusCode, 200);
    const current = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    assert.equal(current.mode, 'life_action');
    const response = await f.stop({ expectedRevision: stale });
    assert.equal(response.statusCode, 409);
    assert.equal(response.payload.error, 'state_version_conflict');
    assert.equal(response.payload.stateRevision, current.stateRevision);
    const after = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    assert.equal(after.mode, 'life_action');
  } finally { await f.storage.close(); }
});

test('class switches go through the command boundary', async () => {
  const f = await fixture();
  try {
    const cls = await f.setClass({ classId: 'chef' });
    assert.equal(cls.statusCode, 200);
    const state = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    assert.equal(state.activeClassId, 'chef');
  } finally { await f.storage.close(); }
});

test('offline-report ack route is gone; a long gap pays no catch-up income', async () => {
  const f = await fixture(s => {
    s.mode = 'life_action';
    s.lifeActionState = { actionId: 'act_chop_wood_t1', startedAt: new Date(Date.now() - 8 * 3_600_000).toISOString() };
    s.lastSimulatedAt = new Date(Date.now() - 8 * 3_600_000).toISOString();
  });
  try {
    const gone = await f.ack();
    assert.equal(gone.statusCode, 404);
    const response = await f.getState();
    assert.equal(response.statusCode, 200);
    assert.equal(response.payload.offlineReport, undefined);
    // 8 小时前开工的动作：只有最近 ~120s 结算（5s/轮 ≈ 24 轮上限），不允许上千次追赶。
    const banked = response.payload.inventory.wood_1 || 0;
    assert.ok(banked > 0 && banked <= 30, `wood banked after 8h gap: ${banked}`);
    // 时间锚点已平移：继续挂机的动作剩余时间按新窗口起算，不是 8 小时前。
    const startedAt = Date.parse(response.payload.lifeActionState.startedAt);
    assert.ok(Date.now() - startedAt <= 130_000, `startedAt age: ${Date.now() - startedAt}ms`);
  } finally { await f.storage.close(); }
});
