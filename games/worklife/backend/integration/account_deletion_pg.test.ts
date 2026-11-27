import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { createPgStorage } from '../src/storage_pg';
import { DELETED_ACCOUNT_ID, TOMBSTONE_DAYS } from '../src/account_deletion';
import pack from '../../shared/enhanced_content_pack_chinese.json';

test('PostgreSQL: account deletion removes the account, save, orders and receipts, keeps anonymous trades', async () => {
  const url = process.env.TEST_DATABASE_URL;
  assert.ok(url, 'TEST_DATABASE_URL must point to an isolated test PostgreSQL database');
  const storage = await createPgStorage(url);
  await storage.init();
  try {
    const mk = async (key: string) => {
      const user = await storage.findOrCreateGuestUser(`pg-del-${key}-${randomUUID()}`);
      const state = await storage.getOrCreatePlayerState(user.id, pack.version);
      state.inventory.gold = 10_000;
      state.inventory.ore_5 = 50;
      await storage.savePlayerState(user.id, state);
      return user.id;
    };
    const leaver = await mk('leaver');
    const mate = await mk('mate');
    const buyer = await mk('buyer');
    const sold = await storage.createTradingOrder({ userId: leaver, itemId: 'ore_5', quantity: 5, price: 90, type: 'sell' });
    await storage.executeTrade({ buyerId: buyer, orderId: sold.id, quantity: 2 });
    const party = await storage.createParty({ userId: leaver });
    await storage.joinParty({ userId: mate, partyId: party.id });
    await storage.inviteToParty({ userId: leaver, partyId: party.id, targetUserId: buyer });

    const now = new Date();
    assert.deepEqual(await storage.deleteAccount(leaver, now), { ordersRemoved: 1 });
    assert.equal(await storage.getUser(leaver), null);
    assert.equal(await storage.deleteAccount(leaver, now), null);
    assert.equal(await storage.wasAccountDeleted(leaver, now), true);
    assert.equal(await storage.wasAccountDeleted(leaver, new Date(now.getTime() + (TOMBSTONE_DAYS + 1) * 86_400_000)), false);
    assert.equal((await storage.getPartyForUser({ userId: mate })), null);
    assert.equal((await storage.getOrCreatePlayerState(buyer, pack.version)).partyInvites?.length ?? 0, 0);
    const trade = (await storage.getRecentTrades({ itemId: 'ore_5', days: 14, now })).find((t) => t.buyerId === buyer);
    assert.equal(trade?.price, 90);
    assert.equal(trade?.sellerId, DELETED_ACCOUNT_ID);
    const history = await storage.getPriceHistory({ itemId: 'ore_5', days: 2 });
    assert.ok(history.length >= 1, 'trades feed the daily price history');
  } finally {
    await storage.close();
  }
});
