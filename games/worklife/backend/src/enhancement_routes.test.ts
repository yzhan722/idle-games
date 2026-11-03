import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { createMemoryStorage } from './storage_memory';
import { enhancementRoutes } from './routes/enhancement';
import { mapThrownError } from './http_errors';
import packJson from '../../shared/enhanced_content_pack_chinese.json';
import type { EnhancedContentPack, EnhancedPlayerState } from './types';

const pack = packJson as EnhancedContentPack;

const stocked = (s: EnhancedPlayerState) => {
  s.inventory = { weapon_wooden_sword: 1, lumber_1: 20, gold: 1000 };
};

// Only the HTTP transport is replaced; the registered handlers and storage are real.
async function fixture(patch?: (state: EnhancedPlayerState) => void) {
  const storage = createMemoryStorage();
  const user = await storage.findOrCreateGuestUser(`enhancement-command-${randomUUID()}`);
  const initial = await storage.getOrCreatePlayerState(user.id, pack.version);
  patch?.(initial);
  const seeded = await storage.savePlayerState(user.id, initial);
  const handlers = new Map<string, any>();
  const app = {
    get(path: string, fn: any) { handlers.set(`GET ${path}`, fn); },
    post(path: string, fn: any) { handlers.set(`POST ${path}`, fn); },
    delete(path: string, fn: any) { handlers.set(`DELETE ${path}`, fn); },
  };
  await enhancementRoutes(app as any, storage, pack);
  async function invoke(path: string, body?: Record<string, unknown>) {
    let statusCode = 200;
    const reply = {
      status(code: number) { statusCode = code; return this; },
      send(payload: any) { return { statusCode, payload }; },
    };
    try { return await handlers.get(`POST ${path}`)!({ userId: user.id, body }, reply); }
    catch (error) {
      const mapped = mapThrownError(error);
      return reply.status(mapped.status).send(mapped.body);
    }
  }
  return {
    storage, userId: user.id, seeded,
    runStart: (body: Record<string, unknown> = { itemId: 'weapon_wooden_sword', targetLevel: 3 }) => invoke('/enhancement/run/start', body),
    runStop: (body: Record<string, unknown> = {}) => invoke('/enhancement/run/stop', body),
  };
}

test('concurrent enhance-run starts serialize and leave one active run', async () => {
  const f = await fixture(stocked);
  try {
    const responses = await Promise.all([f.runStart(), f.runStart()]);
    assert.deepEqual(responses.map(r => r.statusCode), [200, 200]);
    const state = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    assert.equal(state.mode, 'enhancing');
    assert.equal(state.enhanceRun!.itemId, 'weapon_wooden_sword');
    assert.equal(state.enhanceRun!.targetLevel, 3);
    assert.equal(state.enhanceRun!.outcome, undefined);
  } finally { await f.storage.close(); }
});

test('run stop is idempotent through the command boundary', async () => {
  const f = await fixture(stocked);
  try {
    assert.equal((await f.runStart()).statusCode, 200);
    const stopped = await f.runStop();
    assert.equal(stopped.statusCode, 200);
    assert.equal(stopped.payload.mode, 'idle');
    assert.equal(stopped.payload.enhanceRun.outcome.reason, 'stopped');
    const again = await f.runStop();
    assert.equal(again.statusCode, 200);
    const state = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    assert.equal(state.enhanceRun!.outcome!.reason, 'stopped');
    assert.equal(state.mode, 'idle');
  } finally { await f.storage.close(); }
});

test('an enhance run cannot start while in combat', async () => {
  const f = await fixture(s => {
    stocked(s);
    // Un-winnable seeded fight: even if settlement ticks a swing, the enemy survives.
    s.hpCombat = { monsterId: 'slime', monsterName: '史莱姆', playerHp: 10, playerMaxHp: 10, enemyHp: 9999, enemyMaxHp: 9999, playerIntervalMs: 60_000, enemyIntervalMs: 60_000, enemyBaseIntervalMs: 60_000, playerCooldownMs: 0, enemyCooldownMs: 0, heavyChopReadyAt: 0, guardActive: false, wrathActive: false, log: [], playerMp: 0, playerMaxMp: 0, abilityReadyAt: {}, guardUsed: false, streak: 0, deaths: 0, startedAt: Date.now(), enrageStacks: 0 } as any;
  });
  try {
    const response = await f.runStart();
    assert.equal(response.statusCode, 400);
    assert.equal(response.payload.error, 'in_combat');
  } finally { await f.storage.close(); }
});

test('a rejected enhance-run start does not persist partial offline settlement', async () => {
  const f = await fixture(stocked);
  try {
    const before = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    const since = new Date(Date.now() - 60_000).toISOString();
    before.mode = 'life_action';
    before.lifeActionState = { actionId: 'act_chop_wood_t1', startedAt: since };
    before.lastSimulatedAt = since;
    await f.storage.savePlayerState(f.userId, before);
    const saved = structuredClone(await f.storage.getOrCreatePlayerState(f.userId, pack.version));
    const response = await f.runStart({ itemId: 'no_such_item', targetLevel: 3 });
    assert.equal(response.statusCode, 400);
    assert.equal(response.payload.error, 'unknown_item');
    assert.equal(response.payload.message, '未知物品');
    assert.deepEqual(await f.storage.getOrCreatePlayerState(f.userId, pack.version), saved);
  } finally { await f.storage.close(); }
});

test('a stale enhance-run revision returns the current revision without starting', async () => {
  const f = await fixture(stocked);
  try {
    const first = await f.runStart();
    assert.equal(first.statusCode, 200);
    const before = structuredClone(await f.storage.getOrCreatePlayerState(f.userId, pack.version));
    const response = await f.runStop({ expectedRevision: (f.seeded as EnhancedPlayerState).stateRevision ?? 0 });
    assert.equal(response.statusCode, 409);
    assert.equal(response.payload.error, 'state_version_conflict');
    assert.equal(response.payload.stateRevision, before.stateRevision);
    const state = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    assert.equal(state.mode, 'enhancing');
    assert.equal(state.enhanceRun!.outcome, undefined);
  } finally { await f.storage.close(); }
});
