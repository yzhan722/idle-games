import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createMemoryStorage } from './storage_memory';
import { tasksRoutes } from './routes/tasks';
import { defaultTaskState } from './tasks';
import { mapThrownError } from './http_errors';
import packJson from '../../shared/enhanced_content_pack_chinese.json';
import type { EnhancedContentPack, EnhancedPlayerState } from './types';

const pack = packJson as EnhancedContentPack;

test('a replayed operationId returns its receipt without re-applying', async () => {
  const storage = createMemoryStorage();
  try {
    const user = await storage.findOrCreateGuestUser(`receipt-${randomUUID()}`);
    await storage.getOrCreatePlayerState(user.id, pack.version);
    let applied = 0;
    const cmd = {
      userId: user.id, now: new Date(), contentPack: pack,
      operationId: 'op-1', operationPayload: { itemId: 'ore_1' },
      apply(state: EnhancedPlayerState) { applied++; state.inventory.gold = (state.inventory.gold || 0) + 10; return { paid: 10 }; },
    };
    const first = await storage.executePlayerCommand(cmd);
    const second = await storage.executePlayerCommand(cmd);
    assert.equal(applied, 1);
    assert.equal(second.deduplicated, true);
    assert.deepEqual(second.result, { paid: 10 });
    assert.equal(first.state.inventory.gold, 10);
    assert.equal(second.state.inventory.gold, 10);
  } finally { await storage.close(); }
});

test('the same operationId with different parameters is a 409 mismatch', async () => {
  const storage = createMemoryStorage();
  try {
    const user = await storage.findOrCreateGuestUser(`receipt-${randomUUID()}`);
    await storage.getOrCreatePlayerState(user.id, pack.version);
    await storage.executePlayerCommand({
      userId: user.id, now: new Date(), contentPack: pack,
      operationId: 'op-1', operationPayload: { itemId: 'ore_1' },
      apply(state: EnhancedPlayerState) { state.inventory.gold = 5; },
    });
    await assert.rejects(
      storage.executePlayerCommand({
        userId: user.id, now: new Date(), contentPack: pack,
        operationId: 'op-1', operationPayload: { itemId: 'ingot_1' },
        apply(state: EnhancedPlayerState) { state.inventory.gold = 9; },
      }),
      /operation_id_mismatch/
    );
    assert.equal((await storage.getOrCreatePlayerState(user.id, pack.version)).inventory.gold, 5);
  } finally { await storage.close(); }
});

test('a rejected command stores no receipt and may retry under the same key', async () => {
  const storage = createMemoryStorage();
  try {
    const user = await storage.findOrCreateGuestUser(`receipt-${randomUUID()}`);
    await storage.getOrCreatePlayerState(user.id, pack.version);
    let shouldFail = true;
    const cmd = {
      userId: user.id, now: new Date(), contentPack: pack,
      operationId: 'op-1', operationPayload: { itemId: 'ore_1' },
      apply(state: EnhancedPlayerState) { if (shouldFail) throw new Error('no_gold'); state.inventory.gold = 7; },
    };
    await assert.rejects(storage.executePlayerCommand(cmd), /no_gold/);
    shouldFail = false;
    const ok = await storage.executePlayerCommand(cmd);
    assert.equal(ok.deduplicated, undefined);
    assert.equal(ok.state.inventory.gold, 7);
  } finally { await storage.close(); }
});

test('receipts survive a memory-storage restart (persisted snapshot)', async () => {
  const persistPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'worklife-receipts-')), 'save.json');
  const userKey = `receipt-${randomUUID()}`;
  const first = createMemoryStorage({ persistPath });
  const user = await first.findOrCreateGuestUser(userKey);
  await first.getOrCreatePlayerState(user.id, pack.version);
  await first.executePlayerCommand({
    userId: user.id, now: new Date(), contentPack: pack,
    operationId: 'op-1', operationPayload: { itemId: 'ore_1' },
    apply(state: EnhancedPlayerState) { state.inventory.gold = 42; return { paid: 1 }; },
  });
  await first.close();

  const second = createMemoryStorage({ persistPath });
  try {
    const replay = await second.executePlayerCommand({
      userId: user.id, now: new Date(), contentPack: pack,
      operationId: 'op-1', operationPayload: { itemId: 'ore_1' },
      apply(state: EnhancedPlayerState) { state.inventory.gold = 99; },
    });
    assert.equal(replay.deduplicated, true);
    assert.equal(replay.state.inventory.gold, 42);
  } finally { await second.close(); }
});

test('a replayed gift claim over HTTP pays once; a mismatched payload 409s', async () => {
  const storage = createMemoryStorage();
  try {
    const user = await storage.findOrCreateGuestUser(`receipt-http-${randomUUID()}`);
    const initial = await storage.getOrCreatePlayerState(user.id, pack.version);
    initial.tasksState = { ...defaultTaskState(new Date()), points: 50, giftsClaimed: 0, tokens: 0 };
    initial.stats!.actionsById = { act_chop_wood_t1: 5 };
    initial.tasksState.tasks = [{
      id: 't1', kind: 'action', actionId: 'act_chop_wood_t1', skillId: 'skill_woodcutter',
      name: '砍伐小白杨 ×5', target: 5, baseline: 0, reward: { gold: 100, tokens: 2 },
      assignedAt: new Date().toISOString(),
    } as any];
    await storage.savePlayerState(user.id, initial);
    const handlers = new Map<string, any>();
    const app = { get(p: string, fn: any) { handlers.set(`GET ${p}`, fn); }, post(p: string, fn: any) { handlers.set(`POST ${p}`, fn); }, delete(p: string, fn: any) { handlers.set(`DELETE ${p}`, fn); } };
    await tasksRoutes(app as any, storage, pack);
    const invoke = async (path: string, body: Record<string, unknown>) => {
      let statusCode = 200;
      const reply = { status(c: number) { statusCode = c; return this; }, send(p: any) { return { statusCode, payload: p }; } };
      try { return await handlers.get(`POST ${path}`)!({ userId: user.id, body }, reply); }
      catch (e) { const m = mapThrownError(e); return reply.status(m.status).send(m.body); }
    };
    const one = await invoke('/tasks/gift/claim', { operationId: 'gift-1' });
    const two = await invoke('/tasks/gift/claim', { operationId: 'gift-1' });
    assert.deepEqual([one.statusCode, two.statusCode], [200, 200]);
    let state = await storage.getOrCreatePlayerState(user.id, pack.version);
    assert.equal(state.inventory.gold, 2000);
    assert.equal(state.tasksState!.giftsClaimed, 1);
    // The same key with different parsed business parameters is a conflict, not a replay.
    const claim = await invoke('/tasks/claim', { operationId: 'claim-1', taskId: 't1' });
    assert.equal(claim.statusCode, 200);
    const mismatch = await invoke('/tasks/claim', { operationId: 'claim-1', taskId: 'other_task' });
    assert.equal(mismatch.statusCode, 409);
    assert.equal(mismatch.payload.error, 'operation_id_mismatch');
    state = await storage.getOrCreatePlayerState(user.id, pack.version);
    assert.equal(state.tasksState!.completed, 1);
  } finally { await storage.close(); }
});
