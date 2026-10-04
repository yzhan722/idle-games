import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { createMemoryStorage } from './storage_memory';
import { systemsRoutes } from './routes/systems';
import { buyPrice, sellPrice, CHECKIN_REWARDS } from './systems';
import { mapThrownError } from './http_errors';
import packJson from '../../shared/enhanced_content_pack_chinese.json';
import type { EnhancedContentPack, EnhancedPlayerState } from './types';

const pack = packJson as EnhancedContentPack;
const itemDef = (id: string) => (pack.items as any[]).find(it => it.id === id)!;
const ORE_UNIT = buyPrice(itemDef('ore_1'));
const ORE_SELL = sellPrice(itemDef('ore_1'));

// Only the HTTP transport is replaced; the registered handlers and storage are real.
async function fixture(inventory: Record<string, number> = { gold: 2000 }) {
  const storage = createMemoryStorage();
  const user = await storage.findOrCreateGuestUser(`systems-command-${randomUUID()}`);
  const initial = await storage.getOrCreatePlayerState(user.id, pack.version);
  initial.inventory = { ...inventory };
  const seeded = await storage.savePlayerState(user.id, initial);
  const handlers = new Map<string, any>();
  const app = {
    get(path: string, fn: any) { handlers.set(`GET ${path}`, fn); },
    post(path: string, fn: any) { handlers.set(`POST ${path}`, fn); },
    delete(path: string, fn: any) { handlers.set(`DELETE ${path}`, fn); },
  };
  await systemsRoutes(app as any, storage, pack);
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
    consume(body: Record<string, unknown> = { itemId: 'food_simple' }) { return invoke('POST', '/systems/consume', body); },
    checkin(body: Record<string, unknown> = {}) { return invoke('POST', '/systems/checkin', body); },
    buy(body: Record<string, unknown> = { itemId: 'ore_1', qty: 1 }) { return invoke('POST', '/systems/shop/buy', body); },
    sell(body: Record<string, unknown> = { itemId: 'ore_1', qty: 1 }) { return invoke('POST', '/systems/shop/sell', body); },
  };
}

test('two concurrent shop buys charge consecutive totals and keep both items', async () => {
  const f = await fixture();
  try {
    const responses = await Promise.all([f.buy(), f.buy()]);
    assert.deepEqual(responses.map(r => r.statusCode), [200, 200]);
    assert.deepEqual(responses.map(r => r.payload.total), [ORE_UNIT, ORE_UNIT]);
    const state = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    assert.equal(state.inventory.gold, 2000 - 2 * ORE_UNIT);
    assert.equal(state.inventory.ore_1, 2);
    assert.equal(state.stats?.totalGoldSpent, 2 * ORE_UNIT);
    assert.ok(state.stateRevision! > 0);
    assert.equal(responses[0].payload.stateRevision + 1, responses[1].payload.stateRevision);
  } finally { await f.storage.close(); }
});

test('two concurrent shop sells debit the stock once per sale and credit both payouts', async () => {
  const f = await fixture({ gold: 0, ore_1: 4 });
  try {
    const responses = await Promise.all([f.sell({ itemId: 'ore_1', qty: 2 }), f.sell({ itemId: 'ore_1', qty: 2 })]);
    assert.deepEqual(responses.map(r => r.statusCode), [200, 200]);
    const state = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    assert.equal(state.inventory.ore_1 || 0, 0);
    assert.equal(state.inventory.gold, 4 * ORE_SELL);
    assert.equal(state.stats?.totalGoldEarned, 4 * ORE_SELL);
  } finally { await f.storage.close(); }
});

test('a rejected shop buy does not persist partial offline settlement', async () => {
  const f = await fixture({ gold: 0, wood_1: 50 });
  try {
    const before = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    const since = new Date(Date.now() - 60_000).toISOString();
    before.mode = 'life_action';
    before.lifeActionState = { actionId: 'act_chop_wood_t1', startedAt: since };
    before.lastSimulatedAt = since;
    await f.storage.savePlayerState(f.userId, before);
    const saved = structuredClone(await f.storage.getOrCreatePlayerState(f.userId, pack.version));
    const response = await f.buy();
    assert.equal(response.statusCode, 400);
    assert.equal(response.payload.error, '金币不足');
    assert.deepEqual(await f.storage.getOrCreatePlayerState(f.userId, pack.version), saved);
  } finally { await f.storage.close(); }
});

test('offline production is settled before evaluating a shop sell', async () => {
  const f = await fixture({ gold: 0, wood_1: 0 });
  try {
    const before = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    const action = pack.actions.find(a => a.id === 'act_chop_wood_t1')!;
    const since = new Date(Date.now() - Number(action.duration) - 100).toISOString();
    before.mode = 'life_action';
    before.lifeActionState = { actionId: action.id, startedAt: since, quantity: 1, remaining: 1 };
    before.lastSimulatedAt = since;
    await f.storage.savePlayerState(f.userId, before);
    const response = await f.sell({ itemId: 'wood_1', qty: 1 });
    assert.equal(response.statusCode, 200);
    assert.equal(response.payload.total, sellPrice(itemDef('wood_1')));
    const state = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    assert.equal(state.inventory.gold, sellPrice(itemDef('wood_1')));
  } finally { await f.storage.close(); }
});

test('concurrent check-ins grant the daily reward once', async () => {
  const f = await fixture({ gold: 0 });
  try {
    const responses = await Promise.all([f.checkin(), f.checkin()]);
    assert.deepEqual(responses.map(r => r.statusCode), [200, 400]);
    assert.equal(responses[1].payload.error, '今天已经签到过了');
    const dayOne = CHECKIN_REWARDS[0];
    const state = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    assert.equal(state.inventory.gold, dayOne.gold);
    assert.equal(state.inventory.ore_1, dayOne.items.ore_1);
    assert.equal(state.checkIn?.totalDays, 1);
  } finally { await f.storage.close(); }
});

test('two concurrent consumes decrement the stock twice', async () => {
  const f = await fixture({ gold: 0, food_simple: 2 });
  try {
    const responses = await Promise.all([f.consume(), f.consume()]);
    assert.deepEqual(responses.map(r => r.statusCode), [200, 200]);
    const state = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    assert.equal(state.inventory.food_simple || 0, 0);
    assert.equal((state.activeBuffs || []).filter(b => b.id === 'buff_food_simple').length, 1);
  } finally { await f.storage.close(); }
});

test('a stale shop buy revision returns the current revision without spending', async () => {
  const f = await fixture();
  try {
    const first = await f.buy();
    assert.equal(first.statusCode, 200);
    const before = structuredClone(await f.storage.getOrCreatePlayerState(f.userId, pack.version));
    const response = await f.buy({ itemId: 'ore_1', qty: 1, expectedRevision: (f.seeded as EnhancedPlayerState).stateRevision ?? 0 });
    assert.equal(response.statusCode, 409);
    assert.equal(response.payload.error, 'state_version_conflict');
    assert.equal(response.payload.stateRevision, before.stateRevision);
    assert.deepEqual(await f.storage.getOrCreatePlayerState(f.userId, pack.version), before);
  } finally { await f.storage.close(); }
});
