import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import Fastify from 'fastify';
import { createPgStorage } from '../src/storage_pg';
import { housesRoutes } from '../src/routes/houses';
import { systemsRoutes } from '../src/routes/systems';
import { tasksRoutes } from '../src/routes/tasks';
import { defaultTaskState } from '../src/tasks';
import { buyPrice } from '../src/systems';
import { mapThrownError } from '../src/http_errors';
import { PlayerCommandConflict } from '../src/player_commands';
import packJson from '../../shared/enhanced_content_pack_chinese.json';
import type { EnhancedContentPack } from '../src/types';

const pack = packJson as EnhancedContentPack;

test('real PostgreSQL resource commands across two storage and HTTP instances', async t => {
  const url = process.env.TEST_DATABASE_URL;
  assert.ok(url, 'TEST_DATABASE_URL must point to isolated test PostgreSQL');
  const admin = new Pool({ connectionString: url });
  // The identifier is generated internally from a UUID, never supplied by a player.
  const schema = `commands_${randomUUID().replaceAll('-', '')}`;
  await admin.query(`CREATE SCHEMA "${schema}"`);
  const scoped = new URL(url);
  scoped.searchParams.set('options', `-c search_path=${schema}`);
  const a = await createPgStorage(scoped.toString());
  const b = await createPgStorage(scoped.toString());
  try {
    await a.init(); await b.init();
    await t.test('all committed increments survive contention; exhausted conflicts are explicit', async () => {
      const user = await a.findOrCreateGuestUser(`increments-${randomUUID()}`);
      const before = await a.getOrCreatePlayerState(user.id, pack.version);
      const now = new Date(before.lastSimulatedAt);
      const outcomes = await Promise.allSettled(Array.from({ length: 20 }, (_, i) => (i % 2 ? a : b).executePlayerCommand({
        userId: user.id, now, contentPack: pack,
        apply(state) { state.inventory.gold = (state.inventory.gold || 0) + 1; return state.inventory.gold; },
      })));
      const committed = outcomes.filter(r => r.status === 'fulfilled');
      assert.ok(committed.length > 0);
      for (const r of outcomes) if (r.status === 'rejected') assert.ok(r.reason instanceof PlayerCommandConflict);
      const after = await b.getOrCreatePlayerState(user.id, pack.version);
      assert.equal(after.inventory.gold, committed.length);
      assert.equal(after.stateRevision, before.stateRevision! + committed.length);
      assert.equal(new Set(committed.map(r => r.status === 'fulfilled' ? r.value.result : undefined)).size, committed.length);
    });
    await t.test('simultaneous first commands create one player state safely', async () => {
      const user = await a.findOrCreateGuestUser(`new-state-${randomUUID()}`);
      const now = new Date();
      await Promise.all([a, b].map(storage => storage.executePlayerCommand({ userId: user.id, now, contentPack: pack,
        apply(state) { state.inventory.gold = (state.inventory.gold || 0) + 1; } })));
      assert.equal((await a.getOrCreatePlayerState(user.id, pack.version)).inventory.gold, 2);
    });
    await t.test('business rejection and simulation failure write no partial state', async () => {
      const user = await a.findOrCreateGuestUser(`rollback-${randomUUID()}`);
      const before = await a.getOrCreatePlayerState(user.id, pack.version);
      await assert.rejects(a.executePlayerCommand({ userId: user.id,
        now: new Date(Date.parse(before.lastSimulatedAt) + 60_000), contentPack: pack,
        apply(state) { state.inventory.gold = 500; throw new Error('business_rejected'); } }), /business_rejected/);
      assert.deepEqual(await b.getOrCreatePlayerState(user.id, pack.version), before);
      await assert.rejects(a.executePlayerCommand({ userId: user.id, now: new Date('invalid'), contentPack: pack,
        apply(state) { state.inventory.gold = 500; } }), /invalid_simulation_time/);
      assert.deepEqual(await b.getOrCreatePlayerState(user.id, pack.version), before);
    });
    await t.test('stale expected revision reports the current version and never spends', async () => {
      const user = await a.findOrCreateGuestUser(`revision-${randomUUID()}`);
      const before = await a.getOrCreatePlayerState(user.id, pack.version);
      const now = new Date(before.lastSimulatedAt);
      await a.executePlayerCommand({ userId: user.id, now, contentPack: pack, apply(state) { state.inventory.gold = 20; } });
      const after = await a.getOrCreatePlayerState(user.id, pack.version);
      await assert.rejects(b.executePlayerCommand({ userId: user.id, now, contentPack: pack,
        expectedRevision: before.stateRevision, apply(state) { state.inventory.gold -= 5; } }),
        (error: unknown) => error instanceof PlayerCommandConflict && error.stateRevision === after.stateRevision);
      assert.deepEqual(await b.getOrCreatePlayerState(user.id, pack.version), after);
    });
    await t.test('command revisions are authoritative even if a reducer changes its draft revision', async () => {
      const user = await a.findOrCreateGuestUser(`command-metadata-${randomUUID()}`);
      const before = await a.getOrCreatePlayerState(user.id, pack.version);
      const first = await a.executePlayerCommand({ userId: user.id, now: new Date(before.lastSimulatedAt), contentPack: pack,
        apply(state) { state.inventory.gold = 20; state.stateRevision = 9000; } });
      assert.equal(first.state.stateRevision, before.stateRevision! + 1);
      assert.deepEqual(await b.getOrCreatePlayerState(user.id, pack.version), first.state);
      await b.executePlayerCommand({ userId: user.id, now: new Date(before.lastSimulatedAt), contentPack: pack,
        expectedRevision: first.state.stateRevision, apply(state) { state.inventory.gold -= 5; } });
      assert.equal((await a.getOrCreatePlayerState(user.id, pack.version)).inventory.gold, 15);
    });
    await t.test('real HTTP upgrades retain consecutive costs under concurrent settlement', async () => {
      const user = await a.findOrCreateGuestUser(`house-http-${randomUUID()}`);
      const initial = await a.getOrCreatePlayerState(user.id, pack.version);
      initial.inventory = { gold: 2000, wood_1: 50 };
      await a.savePlayerState(user.id, initial);
      const apps = [Fastify(), Fastify()];
      try {
        for (let i = 0; i < apps.length; i++) {
          apps[i].addHook('preHandler', async req => { (req as any).userId = user.id; });
          apps[i].setErrorHandler((error, _req, reply) => {
            const mapped = mapThrownError(error);
            return reply.status(mapped.status).send(mapped.body);
          });
          await housesRoutes(apps[i], i ? b : a, pack);
        }
        const [first, second, read] = await Promise.all([
          ...apps.map(app => app.inject({ method: 'POST', url: '/houses/upgrade', payload: { roomId: 'lumber_yard' } })),
          apps[1].inject({ method: 'GET', url: '/houses' }),
        ]);
        const responses = [first, second];
        assert.ok(read.statusCode === 200 || read.statusCode === 409);
        if (read.statusCode === 409) assert.equal(read.json().error, 'state_version_conflict');
        assert.deepEqual(responses.map(r => r.statusCode), [200, 200]);
        assert.deepEqual(responses.map(r => r.json().level).sort(), [1, 2]);
        const after = await b.getOrCreatePlayerState(user.id, pack.version);
        assert.equal(after.house?.rooms.lumber_yard, 2);
        assert.equal(after.inventory.gold, 1000);
        assert.equal(after.inventory.wood_1 || 0, 0);
        assert.equal(after.stats?.totalGoldSpent, 1000);
        const stale = await apps[0].inject({ method: 'POST', url: '/houses/upgrade', payload: { roomId: 'lumber_yard', expectedRevision: 0 } });
        assert.equal(stale.statusCode, 409);
        assert.equal(stale.json().stateRevision, after.stateRevision);
        assert.deepEqual(await b.getOrCreatePlayerState(user.id, pack.version), after);
      } finally { await Promise.all(apps.map(app => app.close())); }
    });
    await t.test('real HTTP shop buys retain consecutive charges under concurrent settlement', async () => {
      const user = await a.findOrCreateGuestUser(`shop-http-${randomUUID()}`);
      const initial = await a.getOrCreatePlayerState(user.id, pack.version);
      initial.inventory = { gold: 2000 };
      await a.savePlayerState(user.id, initial);
      const unit = buyPrice((pack.items as any[]).find(it => it.id === 'ore_1'));
      const apps = [Fastify(), Fastify()];
      try {
        for (let i = 0; i < apps.length; i++) {
          apps[i].addHook('preHandler', async req => { (req as any).userId = user.id; });
          apps[i].setErrorHandler((error, _req, reply) => {
            const mapped = mapThrownError(error);
            return reply.status(mapped.status).send(mapped.body);
          });
          await systemsRoutes(apps[i], i ? b : a, pack);
        }
        const responses = await Promise.all(apps.map(app => app.inject({ method: 'POST', url: '/systems/shop/buy', payload: { itemId: 'ore_1', qty: 1 } })));
        assert.deepEqual(responses.map(r => r.statusCode), [200, 200]);
        const after = await b.getOrCreatePlayerState(user.id, pack.version);
        assert.equal(after.inventory.ore_1, 2);
        assert.equal(after.inventory.gold, 2000 - 2 * unit);
        assert.equal(after.stats?.totalGoldSpent, 2 * unit);
        const stale = await apps[0].inject({ method: 'POST', url: '/systems/shop/buy', payload: { itemId: 'ore_1', qty: 1, expectedRevision: 0 } });
        assert.equal(stale.statusCode, 409);
        assert.equal(stale.json().stateRevision, after.stateRevision);
        assert.deepEqual(await b.getOrCreatePlayerState(user.id, pack.version), after);
      } finally { await Promise.all(apps.map(app => app.close())); }
    });
    await t.test('real HTTP task claims pay the reward once across two instances', async () => {
      const user = await a.findOrCreateGuestUser(`tasks-http-${randomUUID()}`);
      const initial = await a.getOrCreatePlayerState(user.id, pack.version);
      const future = new Date(Date.now() + 8 * 3600_000).toISOString();
      initial.tasksState = {
        ...defaultTaskState(new Date()), nextTaskAt: future,
        tasks: [{
          id: 'pg_t1', kind: 'action', actionId: 'act_chop_wood_t1', skillId: 'skill_woodcutter',
          name: '砍伐小白杨 ×5', target: 5, baseline: 0, reward: { gold: 100, tokens: 2 },
          assignedAt: new Date().toISOString(),
        }],
      };
      initial.stats!.actionsById = { act_chop_wood_t1: 5 };
      await a.savePlayerState(user.id, initial);
      const apps = [Fastify(), Fastify()];
      try {
        for (let i = 0; i < apps.length; i++) {
          apps[i].addHook('preHandler', async req => { (req as any).userId = user.id; });
          apps[i].setErrorHandler((error, _req, reply) => {
            const mapped = mapThrownError(error);
            return reply.status(mapped.status).send(mapped.body);
          });
          await tasksRoutes(apps[i], i ? b : a, pack);
        }
        const responses = await Promise.all(apps.map(app => app.inject({ method: 'POST', url: '/tasks/claim', payload: { taskId: 'pg_t1' } })));
        assert.deepEqual(responses.map(r => r.statusCode).sort(), [200, 400]);
        const after = await b.getOrCreatePlayerState(user.id, pack.version);
        assert.equal(after.inventory.gold, 100);
        assert.equal(after.tasksState!.completed, 1);
        assert.equal(after.tasksState!.tokens, 2);
        const stale = await apps[0].inject({ method: 'POST', url: '/tasks/claim', payload: { taskId: 'pg_t1', expectedRevision: 0 } });
        assert.equal(stale.statusCode, 409);
      } finally { await Promise.all(apps.map(app => app.close())); }
    });
    await t.test('a replayed operationId commits once across two instances', async () => {
      const user = await a.findOrCreateGuestUser(`receipt-http-${randomUUID()}`);
      const initial = await a.getOrCreatePlayerState(user.id, pack.version);
      initial.inventory = { gold: 2000 };
      await a.savePlayerState(user.id, initial);
      const unit = buyPrice((pack.items as any[]).find(it => it.id === 'ore_1'));
      const apps = [Fastify(), Fastify()];
      try {
        for (let i = 0; i < apps.length; i++) {
          apps[i].addHook('preHandler', async req => { (req as any).userId = user.id; });
          apps[i].setErrorHandler((error, _req, reply) => {
            const mapped = mapThrownError(error);
            return reply.status(mapped.status).send(mapped.body);
          });
          await systemsRoutes(apps[i], i ? b : a, pack);
        }
        const payload = { itemId: 'ore_1', qty: 1, operationId: `op-${randomUUID()}` };
        const responses = await Promise.all(apps.map(app => app.inject({ method: 'POST', url: '/systems/shop/buy', payload })));
        assert.deepEqual(responses.map(r => r.statusCode), [200, 200]);
        let after = await b.getOrCreatePlayerState(user.id, pack.version);
        assert.equal(after.inventory.ore_1, 1);
        assert.equal(after.inventory.gold, 2000 - unit);
        const again = await apps[0].inject({ method: 'POST', url: '/systems/shop/buy', payload });
        assert.equal(again.statusCode, 200);
        after = await b.getOrCreatePlayerState(user.id, pack.version);
        assert.equal(after.inventory.ore_1, 1);
        const mismatch = await apps[0].inject({ method: 'POST', url: '/systems/shop/buy', payload: { ...payload, qty: 2 } });
        assert.equal(mismatch.statusCode, 409);
        assert.equal(mismatch.json().error, 'operation_id_mismatch');
        assert.deepEqual(await b.getOrCreatePlayerState(user.id, pack.version), after);
      } finally { await Promise.all(apps.map(app => app.close())); }
    });
  } finally {
    await a.close(); await b.close();
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
  }
});
