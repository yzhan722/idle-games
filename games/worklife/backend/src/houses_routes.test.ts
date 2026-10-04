import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { createMemoryStorage } from './storage_memory';
import { housesRoutes } from './routes/houses';
import { mapThrownError } from './http_errors';
import packJson from '../../shared/enhanced_content_pack_chinese.json';
import type { EnhancedContentPack, EnhancedPlayerState } from './types';

const pack = packJson as EnhancedContentPack;

// Only the HTTP transport is replaced; the registered handler and storage are real.
async function fixture() {
  const storage = createMemoryStorage();
  const user = await storage.findOrCreateGuestUser(`house-command-${randomUUID()}`);
  const initial = await storage.getOrCreatePlayerState(user.id, pack.version);
  initial.inventory = { gold: 2000, wood_1: 50 };
  const seeded = await storage.savePlayerState(user.id, initial);
  let handler: any;
  let getHandler: any;
  await housesRoutes({ get(_path: string, fn: any) { getHandler = fn; }, post(_path: string, fn: any) { handler = fn; } } as any, storage, pack);
  async function invoke(fn: any, body?: Record<string, unknown>) {
    let statusCode = 200;
    const reply = {
      status(code: number) { statusCode = code; return this; },
      send(payload: any) { return { statusCode, payload }; },
    };
    try { return await fn({ userId: user.id, body }, reply); }
    catch (error) {
      const mapped = mapThrownError(error);
      return reply.status(mapped.status).send(mapped.body);
    }
  }
  return {
    storage, userId: user.id, seeded,
    getHouse() { return invoke(getHandler); },
    async upgrade(body: Record<string, unknown> = { roomId: 'lumber_yard' }) {
      return invoke(handler, body);
    },
  };
}

test('two concurrent house upgrades charge consecutive costs and retain both levels', async () => {
  const f = await fixture();
  try {
    const responses = await Promise.all([f.upgrade(), f.upgrade()]);
    assert.deepEqual(responses.map(r => r.statusCode), [200, 200]);
    const state = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    assert.equal(state.house?.rooms.lumber_yard, 2);
    assert.equal(state.inventory.gold, 1000); // 2000 - 200 - 800
    assert.equal(state.inventory.wood_1 || 0, 0); // 50 - 20 - 30
    assert.equal(state.stats?.totalGoldSpent, 1000);
  } finally { await f.storage.close(); }
});

test('concurrent house settlement cannot erase a successful upgrade', async () => {
  const f = await fixture();
  try {
    const [read, upgrade] = await Promise.all([f.getHouse(), f.upgrade()]);
    assert.equal(upgrade.statusCode, 200);
    assert.ok(read.statusCode === 200 || read.statusCode === 409);
    if (read.statusCode === 409) assert.equal(read.payload.error, 'state_version_conflict');
    const state = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    assert.equal(state.house?.rooms.lumber_yard, 1);
    assert.equal(state.inventory.gold, 1800);
    assert.equal(state.inventory.wood_1, 30);
    assert.equal(state.stats?.totalGoldSpent, 200);
    assert.ok(state.stateRevision! >= upgrade.payload.stateRevision);
  } finally { await f.storage.close(); }
});

test('rejected house upgrade does not persist partial offline settlement', async () => {
  const f = await fixture();
  try {
    const before = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    const since = new Date(Date.now() - 60_000).toISOString();
    before.inventory = { gold: 0, wood_1: 50 };
    before.mode = 'life_action';
    before.lifeActionState = { actionId: 'act_chop_wood_t1', startedAt: since };
    before.lastSimulatedAt = since;
    await f.storage.savePlayerState(f.userId, before);
    const saved = structuredClone(await f.storage.getOrCreatePlayerState(f.userId, pack.version));
    const response = await f.upgrade();
    assert.equal(response.statusCode, 400);
    assert.equal(response.payload.error, 'no_gold');
    assert.deepEqual(await f.storage.getOrCreatePlayerState(f.userId, pack.version), saved);
  } finally { await f.storage.close(); }
});

test('offline production is settled before evaluating a house upgrade cost', async () => {
  const f = await fixture();
  try {
    const before = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    const action = pack.actions.find(a => a.id === 'act_chop_wood_t1')!;
    const since = new Date(Date.now() - Number(action.duration) - 100).toISOString();
    before.inventory = { gold: 200, wood_1: 19 };
    before.mode = 'life_action';
    before.lifeActionState = { actionId: action.id, startedAt: since, quantity: 1, remaining: 1 };
    before.lastSimulatedAt = since;
    await f.storage.savePlayerState(f.userId, before);
    const response = await f.upgrade();
    assert.equal(response.statusCode, 200);
    assert.equal(response.payload.level, 1);
    const state = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    assert.equal(state.inventory.gold || 0, 0);
    assert.equal(state.inventory.wood_1 || 0, 0);
    assert.equal(state.house?.rooms.lumber_yard, 1);
  } finally { await f.storage.close(); }
});

test('a stale house upgrade revision returns the current revision without spending', async () => {
  const f = await fixture();
  try {
    const first = await f.upgrade();
    assert.equal(first.statusCode, 200);
    const before = structuredClone(await f.storage.getOrCreatePlayerState(f.userId, pack.version));
    const response = await f.upgrade({ roomId: 'lumber_yard', expectedRevision: (f.seeded as EnhancedPlayerState).stateRevision ?? 0 });
    assert.equal(response.statusCode, 409);
    assert.equal(response.payload.error, 'state_version_conflict');
    assert.equal(response.payload.stateRevision, before.stateRevision);
    assert.deepEqual(await f.storage.getOrCreatePlayerState(f.userId, pack.version), before);
  } finally { await f.storage.close(); }
});
