import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { createPgStorage } from '../src/storage_pg';
import { CIRCLE_CREATE_COST, CIRCLE_MAX_MEMBERS } from '../src/circle';
import pack from '../../shared/enhanced_content_pack_chinese.json';

// 同好会（circle.ts）在 PostgreSQL 上的并发与注销：要一个隔离的测试库（TEST_DATABASE_URL），npm run test:pg 才跑。
const url = process.env.TEST_DATABASE_URL;

test('PostgreSQL: circles — create charges gold once, the last seat goes to one person, kick vs transfer stays consistent, deletion hands over', async () => {
  assert.ok(url, 'TEST_DATABASE_URL must point to an isolated test PostgreSQL database');
  const storage = await createPgStorage(url);
  await storage.init();
  try {
    const mk = async (gold = 0) => {
      const user = await storage.findOrCreateGuestUser(`pg-circle-${randomUUID()}`);
      const state = await storage.getOrCreatePlayerState(user.id, pack.version);
      state.inventory.gold = gold;
      await storage.savePlayerState(user.id, state);
      return user.id;
    };
    const now = () => new Date();
    const lead = await mk(5000);
    const name = `并发${randomUUID().slice(0, 6)}`;
    const [c1, c2] = await Promise.all([
      storage.createCircle({ userId: lead, name, now: now() }),
      storage.createCircle({ userId: lead, name: `${name}乙`, now: now() }),
    ]);
    assert.deepEqual([c1.ok, c2.ok].sort(), [false, true], 'one person, one circle');
    assert.equal((await storage.getOrCreatePlayerState(lead, pack.version)).inventory.gold, 5000 - CIRCLE_CREATE_COST);
    const other = await mk(5000);
    assert.deepEqual(await storage.createCircle({ userId: other, name: ` ${name} `, now: now() }), { ok: false, error: 'name_taken' });

    const home = await storage.getCircleHome({ userId: lead, now: now() });
    const circleId = home.circle!.id;
    for (let i = 1; i < CIRCLE_MAX_MEMBERS - 1; i++) {
      const m = await mk();
      await storage.circleAction({ userId: m, action: 'apply', circleId, now: now() });
      assert.ok((await storage.circleAction({ userId: lead, action: 'approve', targetUserId: m, now: now() })).ok);
    }
    const [x, y] = [await mk(), await mk()];
    await storage.circleAction({ userId: lead, action: 'invite', targetUserId: x, now: now() });
    await storage.circleAction({ userId: lead, action: 'invite', targetUserId: y, now: now() });
    const seats = await Promise.all([
      storage.circleAction({ userId: x, action: 'accept', circleId, now: now() }),
      storage.circleAction({ userId: y, action: 'accept', circleId, now: now() }),
    ]);
    assert.deepEqual(seats.map((s) => s.ok).sort(), [false, true]);
    assert.equal((await storage.getCircleHome({ userId: lead, now: now() })).circle!.memberCount, CIRCLE_MAX_MEMBERS);

    const deputy = (await storage.getCircleHome({ userId: lead, now: now() })).circle!.members[1].userId;
    const race = await Promise.all([
      storage.circleAction({ userId: lead, action: 'transfer', targetUserId: deputy, now: now() }),
      storage.circleAction({ userId: lead, action: 'kick', targetUserId: deputy, now: now() }),
    ]);
    assert.deepEqual(race.map((r) => r.ok).sort(), [false, true]);
    const after = (await storage.getCircleHome({ userId: lead, now: now() })).circle!;
    assert.equal(after.members.filter((m) => m.isLeader).length, 1);

    const leaderNow = after.members.find((m) => m.isLeader)!.userId;
    await storage.deleteAccount(leaderNow, now());
    const viewer = after.members.find((m) => !m.isLeader)!.userId;
    const handed = (await storage.getCircleHome({ userId: viewer, now: now() })).circle!;
    assert.equal(handed.members.some((m) => m.userId === leaderNow), false);
    assert.equal(handed.members.filter((m) => m.isLeader).length, 1);
  } finally {
    await storage.close();
  }
});

test('PostgreSQL: circles — deleting an account while it accepts an invite (or is approved) never deadlocks; reject cooldown', async () => {
  assert.ok(url, 'TEST_DATABASE_URL must point to an isolated test PostgreSQL database');
  const storage = await createPgStorage(url);
  await storage.init();
  try {
    const mk = async (gold = 0) => {
      const user = await storage.findOrCreateGuestUser(`pg-circle-${randomUUID()}`);
      const state = await storage.getOrCreatePlayerState(user.id, pack.version);
      state.inventory.gold = gold;
      await storage.savePlayerState(user.id, state);
      return user.id;
    };
    const now = () => new Date();
    const lead = await mk(5000);
    assert.ok((await storage.createCircle({ userId: lead, name: `锁序${randomUUID().slice(0, 6)}`, now: now() })).ok);
    const circleId = (await storage.getCircleHome({ userId: lead, now: now() })).circle!.id;
    for (let round = 0; round < 5; round++) {
      const u = await mk();
      await storage.circleAction({ userId: lead, action: 'invite', targetUserId: u, now: now() });
      const v = await mk();
      await storage.circleAction({ userId: v, action: 'apply', circleId, now: now() });
      // 两条都不能抛（死锁会变成 500）；注销之后会里不能留着这个人
      const settled = await Promise.allSettled([
        storage.deleteAccount(u, now()),
        storage.circleAction({ userId: u, action: 'accept', circleId, now: now() }),
        storage.deleteAccount(v, now()),
        storage.circleAction({ userId: lead, action: 'approve', targetUserId: v, now: now() }),
      ]);
      assert.deepEqual(settled.map((s) => s.status), ['fulfilled', 'fulfilled', 'fulfilled', 'fulfilled']);
      const members = (await storage.getCircleHome({ userId: lead, now: now() })).circle!.members.map((m) => m.userId);
      assert.equal(members.includes(u) || members.includes(v), false);
    }
    const w = await mk();
    await storage.circleAction({ userId: w, action: 'apply', circleId, now: now() });
    assert.ok((await storage.circleAction({ userId: lead, action: 'reject', targetUserId: w, now: now() })).ok);
    assert.deepEqual(await storage.circleAction({ userId: w, action: 'apply', circleId, now: now() }), { ok: false, error: 'apply_cooldown' });
  } finally {
    await storage.close();
  }
});
