import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { createPgStorage } from '../src/storage_pg';
import { rankEntry } from '../src/leaderboard';
import { defaultCombatSkills } from '../src/combat_skills';
import { utcDay } from '../src/retention_metrics';
import pack from '../../shared/enhanced_content_pack_chinese.json';

const url = process.env.TEST_DATABASE_URL;
const settle = () => new Promise((resolve) => setTimeout(resolve, 300));

test('PostgreSQL: the leaderboard follows saves, skips nameless and system accounts, and drops deleted ones', async () => {
  assert.ok(url, 'TEST_DATABASE_URL must point to an isolated test PostgreSQL database');
  const storage = await createPgStorage(url);
  await storage.init();
  try {
    const mk = async (device: string, name: string | undefined, level: number) => {
      const user = await storage.findOrCreateGuestUser(device);
      const state = await storage.getOrCreatePlayerState(user.id, pack.version);
      state.settings = { soundEnabled: true, animationsEnabled: true, compactMode: false, notificationsEnabled: true, playerName: name };
      state.combatSkills = defaultCombatSkills(level);
      await storage.savePlayerState(user.id, state);
      return user;
    };
    const tag = randomUUID().slice(0, 6);
    const top = await mk(`pg-rank-top-${randomUUID()}`, `榜首甲${tag}`, 198);
    const second = await mk(`pg-rank-second-${randomUUID()}`, `第二乙${tag}`, 197);
    await mk(`pg-rank-anon-${randomUUID()}`, undefined, 199);
    await mk(`party_bot_pg_${randomUUID()}`, `陪练丙${tag}`, 199);
    await settle();
    const view = async (user: typeof top) => {
      const state = await storage.getOrCreatePlayerState(user.id, pack.version);
      return storage.getLeaderboard({ board: 'combat', userId: user.id, entry: rankEntry(state, user), now: new Date() });
    };
    const before = await view(second);
    const mine = before.entries.filter((e) => e.name.endsWith(tag)).map((e) => e.name);
    assert.deepEqual(mine, [`榜首甲${tag}`, `第二乙${tag}`]);
    assert.ok(before.me.listed);
    const rankBefore = before.me.listed ? before.me.rank : 0;
    await storage.deleteAccount(top.id, new Date());
    const after = await view(second);
    assert.equal(after.entries.some((e) => e.name === `榜首甲${tag}`), false);
    assert.equal(after.me.listed ? after.me.rank : 0, rankBefore - 1);
  } finally {
    await storage.close();
  }
});

test('PostgreSQL: a name equal to the login account is masked on the board, the save keeps it', async () => {
  assert.ok(url, 'TEST_DATABASE_URL must point to an isolated test PostgreSQL database');
  const storage = await createPgStorage(url);
  await storage.init();
  try {
    const account = `acc${randomUUID().slice(0, 8)}z`;
    const user = await storage.findOrCreateGuestUser(`pg-rank-mask-${randomUUID()}`);
    const state = await storage.getOrCreatePlayerState(user.id, pack.version);
    state.settings = { soundEnabled: true, animationsEnabled: true, compactMode: false, notificationsEnabled: true, playerName: account };
    state.combatSkills = defaultCombatSkills(200);
    await storage.savePlayerState(user.id, state);
    await settle();
    const other = { listed: 'excluded' as const };
    const names = async () => (await storage.getLeaderboard({ board: 'combat', userId: randomUUID(), entry: other.listed, now: new Date() })).entries.map((e) => e.name);
    assert.ok((await names()).includes(account));
    await storage.bindPassword(user.id, account, 'hash');
    const after = await names();
    assert.equal(after.includes(account), false);
    assert.ok(after.includes('a＊＊'));
    assert.equal((await storage.getOrCreatePlayerState(user.id, pack.version)).settings?.playerName, account);
  } finally {
    await storage.close();
  }
});

test('PostgreSQL: retention counters accumulate per day and old days are pruned', async () => {
  assert.ok(url, 'TEST_DATABASE_URL must point to an isolated test PostgreSQL database');
  const storage = await createPgStorage(url);
  await storage.init();
  try {
    const now = new Date();
    const day = utcDay(now);
    const count = async () => (await storage.readMetrics({ since: day })).find((r) => r.event === 'register')?.count ?? 0;
    const start = await count();
    await storage.bumpMetrics([{ day, event: 'register', count: 2 }, { day: '2000-01-01', event: 'register', count: 5 }], now);
    await storage.bumpMetrics([{ day, event: 'register', count: 1 }], now);
    assert.equal(await count(), start + 3);
    assert.equal((await storage.readMetrics({ since: '1999-01-01' })).some((r) => r.day === '2000-01-01'), false);
  } finally {
    await storage.close();
  }
});
