import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { createMemoryStorage } from './storage_memory';
import packJson from '../../shared/enhanced_content_pack_chinese.json';
import type { EnhancedContentPack } from './types';
import { PlayerCommandConflict } from './player_commands';

const pack = packJson as EnhancedContentPack;

async function fixture() {
  const storage = createMemoryStorage();
  const user = await storage.findOrCreateGuestUser(`command-${randomUUID()}`);
  const state = await storage.getOrCreatePlayerState(user.id, pack.version);
  return { storage, userId: user.id, now: new Date(state.lastSimulatedAt) };
}

test('a throwing resource command rolls back every draft mutation', async () => {
  const f = await fixture();
  try {
    const before = structuredClone(await f.storage.getOrCreatePlayerState(f.userId, pack.version));
    await assert.rejects(f.storage.executePlayerCommand({ ...f, contentPack: pack, apply(state) {
      state.inventory.gold = 1000;
      state.house = { rooms: { lumber_yard: 1 } };
      throw new Error('business_rejected');
    } }), /business_rejected/);
    assert.deepEqual(await f.storage.getOrCreatePlayerState(f.userId, pack.version), before);
  } finally { await f.storage.close(); }
});

test('invalid settlement time leaves the saved player unchanged', async () => {
  const f = await fixture();
  try {
    const before = structuredClone(await f.storage.getOrCreatePlayerState(f.userId, pack.version));
    await assert.rejects(f.storage.executePlayerCommand({ ...f, now: new Date('invalid'), contentPack: pack,
      apply(state) { state.inventory.gold = 50; } }), /invalid_simulation_time/);
    assert.deepEqual(await f.storage.getOrCreatePlayerState(f.userId, pack.version), before);
  } finally { await f.storage.close(); }
});

test('concurrent resource commands preserve each change and expose increasing revisions', async () => {
  const f = await fixture();
  try {
    const results = await Promise.all(Array.from({ length: 20 }, () => f.storage.executePlayerCommand({
      ...f, contentPack: pack, apply(state) { state.inventory.gold = (state.inventory.gold || 0) + 1; return state.inventory.gold; },
    })));
    assert.equal((await f.storage.getOrCreatePlayerState(f.userId, pack.version)).inventory.gold, 20);
    assert.deepEqual(results.map(r => r.result), Array.from({ length: 20 }, (_, i) => i + 1));
    assert.equal(new Set(results.map(r => r.state.stateRevision)).size, 20);
  } finally { await f.storage.close(); }
});

test('an asynchronous reducer cannot publish its draft', async () => {
  const f = await fixture();
  try {
    const before = structuredClone(await f.storage.getOrCreatePlayerState(f.userId, pack.version));
    await assert.rejects(f.storage.executePlayerCommand({ ...f, contentPack: pack, async apply(state) {
      state.inventory.gold = 1000;
      return 1000;
    } }), /async_player_command/);
    assert.deepEqual(await f.storage.getOrCreatePlayerState(f.userId, pack.version), before);
  } finally { await f.storage.close(); }
});

test('a command cannot commit negative or non-finite inventory', async () => {
  const f = await fixture();
  try {
    const before = structuredClone(await f.storage.getOrCreatePlayerState(f.userId, pack.version));
    for (const gold of [-1, NaN, Infinity]) {
      await assert.rejects(f.storage.executePlayerCommand({ ...f, contentPack: pack,
        apply(state) { state.inventory.gold = gold; } }), /invalid_command_inventory/);
      assert.deepEqual(await f.storage.getOrCreatePlayerState(f.userId, pack.version), before);
    }
  } finally { await f.storage.close(); }
});

test('legacy settlement and save cannot overwrite a newer resource command', async () => {
  const f = await fixture();
  try {
    const obsolete = structuredClone(await f.storage.getOrCreatePlayerState(f.userId, pack.version));
    const outcome = await f.storage.executePlayerCommand({ ...f, contentPack: pack,
      apply(state) { state.inventory.gold = 50; } });
    const current = structuredClone(outcome.state);
    for (const write of [
      () => f.storage.simulateToNow({ ...f, state: obsolete, contentPack: pack }),
      () => f.storage.savePlayerState(f.userId, obsolete),
    ]) {
      await assert.rejects(write(), (error: unknown) => error instanceof PlayerCommandConflict && error.stateRevision === current.stateRevision);
      assert.deepEqual(await f.storage.getOrCreatePlayerState(f.userId, pack.version), current);
    }
  } finally { await f.storage.close(); }
});
