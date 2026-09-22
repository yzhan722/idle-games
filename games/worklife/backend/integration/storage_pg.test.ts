import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { createPgStorage } from '../src/storage_pg';
import pack from '../../shared/enhanced_content_pack_chinese.json';
import type { EnhancedContentPack } from '../src/types';

test('PostgreSQL rejects stale clones across independent storage instances', async () => {
  const url = process.env.TEST_DATABASE_URL;
  assert.ok(url, 'TEST_DATABASE_URL must point to an isolated test PostgreSQL database');
  const a = await createPgStorage(url); const b = await createPgStorage(url);
  await a.init(); await b.init();
  try {
    const user = await a.findOrCreateGuestUser(`pg-cas-${randomUUID()}`);
    const first = await a.getOrCreatePlayerState(user.id, pack.version);
    const stale = await b.getOrCreatePlayerState(user.id, pack.version);
    first.inventory.gold = 50;
    const saved = await a.savePlayerState(user.id, { ...first });
    stale.inventory.gold = 100;
    await assert.rejects(b.savePlayerState(user.id, { ...stale }), /state_version_conflict/);
    const current = await b.getOrCreatePlayerState(user.id, pack.version);
    assert.equal(current.inventory.gold, 50);
    const settled = await a.simulateToNow({userId:user.id, state:saved, now:new Date(), contentPack:pack as EnhancedContentPack});
    settled.inventory.gold -= 1;
    await a.savePlayerState(user.id, settled);
    assert.equal((await b.getOrCreatePlayerState(user.id, pack.version)).inventory.gold, 49);
  } finally { await a.close(); await b.close(); }
});
