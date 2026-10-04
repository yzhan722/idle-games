import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { createMemoryStorage } from './storage_memory';
import { combatHpRoutes } from './routes/combat_hp';
import { mapThrownError } from './http_errors';
import packJson from '../../shared/enhanced_content_pack_chinese.json';
import type { EnhancedContentPack, EnhancedPlayerState } from './types';

const pack = packJson as EnhancedContentPack;

// Only the HTTP transport is replaced; the registered handlers and storage are real.
async function fixture(patch?: (state: EnhancedPlayerState) => void) {
  const storage = createMemoryStorage();
  const user = await storage.findOrCreateGuestUser(`combat-command-${randomUUID()}`);
  const initial = await storage.getOrCreatePlayerState(user.id, pack.version);
  patch?.(initial);
  const seeded = await storage.savePlayerState(user.id, initial);
  const handlers = new Map<string, any>();
  const app = {
    get(path: string, fn: any) { handlers.set(`GET ${path}`, fn); },
    post(path: string, fn: any) { handlers.set(`POST ${path}`, fn); },
    delete(path: string, fn: any) { handlers.set(`DELETE ${path}`, fn); },
  };
  await combatHpRoutes(app as any, storage, pack);
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
    start: (body: Record<string, unknown> = { monsterId: 'slime' }) => invoke('/combat/hp/start', body),
    skill: (body: Record<string, unknown>) => invoke('/combat/hp/skill', body),
    learn: (body: Record<string, unknown> = { itemId: 'book_smash' }) => invoke('/combat/hp/learn', body),
    build: (body: Record<string, unknown> = { id: 'sharpened_edge' }) => invoke('/combat/hp/build', body),
    loadout: (body: Record<string, unknown>) => invoke('/combat/hp/loadout', body),
    flee: (body: Record<string, unknown> = {}) => invoke('/combat/hp/flee', body),
  };
}

test('concurrent combat starts keep exactly one fight and the loser sees 409', async () => {
  const f = await fixture();
  try {
    const responses = await Promise.all([f.start(), f.start()]);
    assert.deepEqual(responses.map(r => r.statusCode), [200, 409]);
    assert.equal(responses[1].payload.error, 'already_in_combat');
    const state = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    assert.equal(state.hpCombat!.monsterId, 'slime');
    assert.equal(state.hpCombat!.outcome, undefined);
  } finally { await f.storage.close(); }
});

test('a rejected combat start does not persist partial offline settlement', async () => {
  const f = await fixture();
  try {
    const before = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    const since = new Date(Date.now() - 60_000).toISOString();
    before.mode = 'life_action';
    before.lifeActionState = { actionId: 'act_chop_wood_t1', startedAt: since };
    before.lastSimulatedAt = since;
    await f.storage.savePlayerState(f.userId, before);
    const saved = structuredClone(await f.storage.getOrCreatePlayerState(f.userId, pack.version));
    const response = await f.start({ monsterId: 'no_such_monster' });
    assert.equal(response.statusCode, 400);
    assert.equal(response.payload.error, 'unknown_monster');
    assert.deepEqual(await f.storage.getOrCreatePlayerState(f.userId, pack.version), saved);
  } finally { await f.storage.close(); }
});

test('concurrent book learns consume the single stock once', async () => {
  const f = await fixture(s => { s.inventory.book_smash = 1; });
  try {
    const responses = await Promise.all([f.learn(), f.learn()]);
    assert.deepEqual(responses.map(r => r.statusCode), [200, 400]);
    assert.equal(responses[0].payload.learnResult.ok, true);
    assert.equal(responses[1].payload.error, 'missing_book');
    const state = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    assert.equal(state.inventory.book_smash || 0, 0);
    // book_smash teaches 猛击 (not innate): the first read learns it at level 1.
    assert.equal(state.abilities!.smash.level, 1);
    assert.equal(state.abilities!.smash.xp, 0);
  } finally { await f.storage.close(); }
});

test('concurrent build picks lock in a single choice', async () => {
  const f = await fixture();
  try {
    const responses = await Promise.all([f.build(), f.build()]);
    assert.deepEqual(responses.map(r => r.statusCode), [200, 400]);
    assert.equal(responses[1].payload.error, 'already_chosen');
    const state = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    assert.equal(state.chapter1Build, 'sharpened_edge');
  } finally { await f.storage.close(); }
});

test('flee clears the fight and auto-repeat, and the next start works through the same boundary', async () => {
  const f = await fixture(s => { s.combatLoadout = { food: [], drink: [], autoRepeat: true }; });
  try {
    const started = await f.start();
    assert.equal(started.statusCode, 200);
    const fled = await f.flee();
    assert.equal(fled.statusCode, 200);
    assert.equal(fled.payload.hpCombat, undefined);
    assert.equal(fled.payload.combatLoadout.autoRepeat, false);
    const restarted = await f.start();
    assert.equal(restarted.statusCode, 200);
    const state = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    assert.equal(state.hpCombat!.monsterId, 'slime');
    assert.equal(state.combatLoadout!.autoRepeat, false);
  } finally { await f.storage.close(); }
});

test('a stale combat build revision returns the current revision without choosing', async () => {
  const f = await fixture();
  try {
    const first = await f.build();
    assert.equal(first.statusCode, 200);
    const before = structuredClone(await f.storage.getOrCreatePlayerState(f.userId, pack.version));
    const response = await f.build({ id: 'thick_bark', expectedRevision: (f.seeded as EnhancedPlayerState).stateRevision ?? 0 });
    assert.equal(response.statusCode, 409);
    assert.equal(response.payload.error, 'state_version_conflict');
    assert.equal(response.payload.stateRevision, before.stateRevision);
    const state = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    assert.equal(state.chapter1Build, 'sharpened_edge');
  } finally { await f.storage.close(); }
});
