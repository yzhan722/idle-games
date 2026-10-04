import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { createMemoryStorage } from './storage_memory';
import { tasksRoutes } from './routes/tasks';
import { defaultTaskState } from './tasks';
import { mapThrownError } from './http_errors';
import packJson from '../../shared/enhanced_content_pack_chinese.json';
import type { EnhancedContentPack, EnhancedPlayerState, Task, TaskState } from './types';

const pack = packJson as EnhancedContentPack;
const FUTURE = new Date(Date.now() + 8 * 3600_000).toISOString();

const task = (id: string, target = 5): Task => ({
  id, kind: 'action', actionId: 'act_chop_wood_t1', skillId: 'skill_woodcutter',
  name: `砍伐小白杨 ×${target}`, target, baseline: 0,
  reward: { gold: 100, tokens: 2 }, assignedAt: new Date().toISOString(),
});

// Only the HTTP transport is replaced; the registered handlers and storage are real.
async function fixture(tasksState?: Partial<TaskState>, stats?: Record<string, unknown>) {
  const storage = createMemoryStorage();
  const user = await storage.findOrCreateGuestUser(`tasks-command-${randomUUID()}`);
  const initial = await storage.getOrCreatePlayerState(user.id, pack.version);
  initial.tasksState = { ...defaultTaskState(new Date()), nextTaskAt: FUTURE, ...tasksState };
  if (stats) Object.assign(initial.stats!, stats);
  const seeded = await storage.savePlayerState(user.id, initial);
  const handlers = new Map<string, any>();
  const app = {
    get(path: string, fn: any) { handlers.set(`GET ${path}`, fn); },
    post(path: string, fn: any) { handlers.set(`POST ${path}`, fn); },
    delete(path: string, fn: any) { handlers.set(`DELETE ${path}`, fn); },
  };
  await tasksRoutes(app as any, storage, pack);
  async function invoke(method: string, path: string, body?: Record<string, unknown>) {
    let statusCode = 200;
    const reply = {
      status(code: number) { statusCode = code; return this; },
      send(payload: any) { return { statusCode, payload }; },
    };
    try { return await handlers.get(`${method} ${path}`)!({ userId: user.id, body }, reply); }
    catch (error) {
      const mapped = mapThrownError(error);
      return reply.status(mapped.status).send(mapped.body);
    }
  }
  return {
    storage, userId: user.id, seeded,
    claim(body: Record<string, unknown> = { taskId: 't1' }) { return invoke('POST', '/tasks/claim', body); },
    reroll(body: Record<string, unknown> = { taskId: 't1' }) { return invoke('POST', '/tasks/reroll', body); },
    del(body: Record<string, unknown> = { taskId: 't1' }) { return invoke('POST', '/tasks/delete', body); },
    block(body: Record<string, unknown>) { return invoke('POST', '/tasks/block', body); },
    buy(body: Record<string, unknown> = { itemId: 'block_slot' }) { return invoke('POST', '/tasks/shop/buy', body); },
    gift(body: Record<string, unknown> = {}) { return invoke('POST', '/tasks/gift/claim', body); },
  };
}

test('two concurrent task claims pay the reward once', async () => {
  const f = await fixture({ tasks: [task('t1')] }, { actionsById: { act_chop_wood_t1: 5 } });
  try {
    const responses = await Promise.all([f.claim(), f.claim()]);
    assert.deepEqual(responses.map(r => r.statusCode), [200, 400]);
    assert.equal(responses[1].payload.error, 'task_not_found');
    const state = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    assert.equal(state.inventory.gold, 100);
    assert.equal(state.tasksState!.tokens, 2);
    assert.equal(state.tasksState!.completed, 1);
    assert.equal(state.tasksState!.tasks.length, 0);
  } finally { await f.storage.close(); }
});

test('concurrent task rerolls charge the escalating daily costs in order', async () => {
  const f = await fixture({ tasks: [task('t1'), task('t2')] });
  try {
    const state0 = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    state0.inventory.gold = 1000;
    await f.storage.savePlayerState(f.userId, state0);
    // Each reroll replaces its target task, so the two commands reroll different entries.
    const responses = await Promise.all([f.reroll({ taskId: 't1' }), f.reroll({ taskId: 't2' })]);
    assert.deepEqual(responses.map(r => r.statusCode), [200, 200]);
    assert.deepEqual(responses.map(r => r.payload.cost), [200, 400]);
    const state = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    assert.equal(state.inventory.gold, 400); // 1000 - 200 - 400
    assert.equal(state.tasksState!.rerollsToday, 2);
    assert.equal(state.stats!.totalGoldSpent, 600);
    assert.ok(state.tasksState!.tasks.every((t: Task) => t.id !== 't1' && t.id !== 't2'));
  } finally { await f.storage.close(); }
});

test('a rejected task claim does not persist partial offline settlement', async () => {
  const f = await fixture();
  try {
    const before = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    const since = new Date(Date.now() - 60_000).toISOString();
    before.mode = 'life_action';
    before.lifeActionState = { actionId: 'act_chop_wood_t1', startedAt: since };
    before.lastSimulatedAt = since;
    // nextTaskAt already elapsed: settlement would add a task AND offline gains.
    before.tasksState = { ...before.tasksState!, nextTaskAt: since };
    await f.storage.savePlayerState(f.userId, before);
    const saved = structuredClone(await f.storage.getOrCreatePlayerState(f.userId, pack.version));
    const response = await f.claim({ taskId: 'missing' });
    assert.equal(response.statusCode, 400);
    assert.equal(response.payload.error, 'task_not_found');
    assert.deepEqual(await f.storage.getOrCreatePlayerState(f.userId, pack.version), saved);
  } finally { await f.storage.close(); }
});

test('concurrent gift claims pay out once', async () => {
  const f = await fixture({ points: 50, giftsClaimed: 0, tokens: 0 });
  try {
    const responses = await Promise.all([f.gift(), f.gift()]);
    assert.deepEqual(responses.map(r => r.statusCode), [200, 400]);
    assert.equal(responses[1].payload.error, 'gift_not_ready');
    const state = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    assert.equal(state.inventory.gold, 2000);
    assert.equal(state.tasksState!.giftsClaimed, 1);
    assert.equal(state.tasksState!.tokens, 5);
  } finally { await f.storage.close(); }
});

test('concurrent token-shop buys debit tokens once per purchase', async () => {
  const f = await fixture({ tokens: 100 });
  try {
    const responses = await Promise.all([f.buy(), f.buy()]);
    assert.deepEqual(responses.map(r => r.statusCode), [200, 200]);
    assert.deepEqual(responses.map(r => r.payload.cost), [30, 50]);
    const state = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    assert.equal(state.tasksState!.tokens, 20);
    assert.equal(state.tasksState!.blockSlots, 2);
  } finally { await f.storage.close(); }
});

test('task deletes succeed once and the block list respects bought slots', async () => {
  const f = await fixture({ tasks: [task('t1'), task('t2')], blockSlots: 1 });
  try {
    const [gone, again] = [await f.del(), await f.del()];
    assert.equal(gone.statusCode, 200);
    assert.equal(again.statusCode, 400);
    assert.equal(again.payload.error, 'task_not_found');
    const [blocked, noSlot] = [
      await f.block({ skillId: 'skill_woodcutter', blocked: true }),
      await f.block({ skillId: 'skill_chef', blocked: true }),
    ];
    assert.equal(blocked.statusCode, 200);
    assert.equal(noSlot.statusCode, 400);
    assert.equal(noSlot.payload.error, 'no_block_slot');
    const state = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    assert.deepEqual(state.tasksState!.tasks.map((t: Task) => t.id), ['t2']);
    assert.deepEqual(state.tasksState!.blockedSkills, ['skill_woodcutter']);
  } finally { await f.storage.close(); }
});

test('a stale task claim revision returns the current revision without paying', async () => {
  const f = await fixture({ tasks: [task('t1')] }, { actionsById: { act_chop_wood_t1: 5 } });
  try {
    const first = await f.claim();
    assert.equal(first.statusCode, 200);
    assert.ok(typeof first.payload.stateRevision === 'number');
    const before = structuredClone(await f.storage.getOrCreatePlayerState(f.userId, pack.version));
    const response = await f.claim({ taskId: 't1', expectedRevision: (f.seeded as EnhancedPlayerState).stateRevision ?? 0 });
    assert.equal(response.statusCode, 409);
    assert.equal(response.payload.error, 'state_version_conflict');
    assert.equal(response.payload.stateRevision, before.stateRevision);
    assert.deepEqual(await f.storage.getOrCreatePlayerState(f.userId, pack.version), before);
  } finally { await f.storage.close(); }
});
