import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { createMemoryStorage } from './storage_memory';
import { progressionRoutes } from './routes/progression';
import { progression2Routes } from './routes/progression2';
import { todayLocal } from './time';
import { mapThrownError } from './http_errors';
import packJson from '../../shared/enhanced_content_pack_chinese.json';
import type { Bounty, EnhancedContentPack, EnhancedPlayerState } from './types';

const pack = packJson as EnhancedContentPack;

const bounty = (id: string, accepted = false, templateId = 'bt_gather_50'): Bounty => ({
  id, templateId, name: '采集契约', description: '', icon: '',
  metric: 'gather', target: 5, baseline: 0, accepted, claimed: false, rarity: 'common',
  reward: { gold: 100, reputation: 10 },
});

// Only the HTTP transport is replaced; the registered handlers and storage are real.
async function fixture(patch?: (state: EnhancedPlayerState) => void) {
  const storage = createMemoryStorage();
  const user = await storage.findOrCreateGuestUser(`progression-command-${randomUUID()}`);
  const initial = await storage.getOrCreatePlayerState(user.id, pack.version);
  patch?.(initial);
  const seeded = await storage.savePlayerState(user.id, initial);
  const handlers = new Map<string, any>();
  const app = {
    get(path: string, fn: any) { handlers.set(`GET ${path}`, fn); },
    post(path: string, fn: any) { handlers.set(`POST ${path}`, fn); },
    delete(path: string, fn: any) { handlers.set(`DELETE ${path}`, fn); },
  };
  await progressionRoutes(app as any, storage, pack);
  await progression2Routes(app as any, storage, pack);
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
    claimAch: (body: Record<string, unknown> = { achievementId: 'ach_gather_1' }) => invoke('/progression/achievements/claim', body),
    claimDaily: (body: Record<string, unknown> = { questId: 'dq1' }) => invoke('/progression/daily/claim', body),
    accept: (body: Record<string, unknown> = { bountyId: 'b1' }) => invoke('/progression2/bounties/accept', body),
    claimBounty: (body: Record<string, unknown> = { bountyId: 'b1' }) => invoke('/progression2/bounties/claim', body),
    reroll: (body: Record<string, unknown> = {}) => invoke('/progression2/bounties/reroll', body),
    prestige: (body: Record<string, unknown> = {}) => invoke('/progression2/prestige', body),
  };
}

test('two concurrent achievement claims pay the reward once', async () => {
  const f = await fixture(s => { s.stats!.totalGathered = 10; });
  try {
    const responses = await Promise.all([f.claimAch(), f.claimAch()]);
    assert.deepEqual(responses.map(r => r.statusCode), [200, 400]);
    assert.equal(responses[0].payload.goldGained, 50);
    const state = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    assert.equal(state.inventory.gold, 50);
    assert.equal(state.achievements!.ach_gather_1.claimed, true);
  } finally { await f.storage.close(); }
});

test('concurrent daily quest claims pay once', async () => {
  const f = await fixture(s => {
    s.stats!.totalGathered = 30;
    s.dailyQuests = {
      date: todayLocal(),
      quests: [{ id: 'dq1', name: '今日采集', description: '', icon: '', metric: 'totalGathered', target: 30, baseline: 0, claimed: false, reward: { gold: 200 } }],
    };
  });
  try {
    const responses = await Promise.all([f.claimDaily(), f.claimDaily()]);
    assert.deepEqual(responses.map(r => r.statusCode), [200, 400]);
    assert.equal(responses[0].payload.goldGained, 200);
    const state = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    assert.equal(state.inventory.gold, 200);
    assert.equal(state.dailyQuests!.quests[0].claimed, true);
  } finally { await f.storage.close(); }
});

test('concurrent bounty accepts mark the contract once', async () => {
  const f = await fixture(s => { s.bounties = { date: todayLocal(), bounties: [bounty('b1'), bounty('b2', false, 'bt_craft_25')], rerollsUsed: 0 }; });
  try {
    const responses = await Promise.all([f.accept(), f.accept()]);
    assert.deepEqual(responses.map(r => r.statusCode), [200, 400]);
    const state = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    const b1 = state.bounties!.bounties.find(b => b.id === 'b1')!;
    assert.equal(b1.accepted, true);
    assert.equal(state.bounties!.bounties.length, 2);
  } finally { await f.storage.close(); }
});

test('a completed bounty claim pays gold and reputation exactly once', async () => {
  const f = await fixture(s => {
    s.stats!.totalGathered = 5;
    s.bounties = { date: todayLocal(), bounties: [bounty('b1', true)], rerollsUsed: 0 };
  });
  try {
    const responses = await Promise.all([f.claimBounty(), f.claimBounty()]);
    assert.deepEqual(responses.map(r => r.statusCode), [200, 400]);
    const state = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    assert.equal(state.inventory.gold, 100);
    assert.equal(state.bounties!.bounties[0].claimed, true);
  } finally { await f.storage.close(); }
});

test('bounty rerolls under concurrency debit gold per roll and stop at the daily cap', async () => {
  const f = await fixture(s => {
    s.inventory.gold = 5000;
    s.bounties = { date: todayLocal(), bounties: [bounty('b1'), bounty('b2', false, 'bt_craft_25'), bounty('b3', false, 'bt_kill_30'), bounty('b4', false, 'bt_gather_120'), bounty('b5', false, 'bt_craft_60')], rerollsUsed: 0 };
  });
  try {
    const responses = await Promise.all([f.reroll(), f.reroll(), f.reroll(), f.reroll()]);
    assert.deepEqual(responses.map(r => r.statusCode), [200, 200, 200, 400]);
    assert.equal(responses[3].payload.error, '今日刷新次数已用完');
    const state = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    assert.equal(state.inventory.gold, 3500); // 5000 - 3 × 500
    assert.equal(state.bounties!.rerollsUsed, 3);
    assert.equal(state.stats!.totalGoldSpent, 1500);
  } finally { await f.storage.close(); }
});

test('a bounty board reroll never offers the same contract twice', async () => {
  const f = await fixture(s => {
    s.inventory.gold = 5000;
    s.bounties = { date: todayLocal(), bounties: [bounty('b1')], rerollsUsed: 0 };
  });
  try {
    const res = await f.reroll();
    assert.equal(res.statusCode, 200);
    const state = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    const templateIds = state.bounties!.bounties.map(b => b.templateId);
    assert.equal(new Set(templateIds).size, templateIds.length, 'board must not contain duplicate contracts');
  } finally { await f.storage.close(); }
});

test('prestige under concurrency resets progress once', async () => {
  const f = await fixture(s => { s.combatLevel = 50; s.inventory = { gold: 999, wood_1: 40 }; });
  try {
    const responses = await Promise.all([f.prestige(), f.prestige()]);
    assert.deepEqual(responses.map(r => r.statusCode), [200, 400]);
    const state = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    assert.equal(state.prestige!.count, 1);
    assert.ok(state.prestige!.points > 0);
    assert.equal(state.combatLevel, 1);
    assert.deepEqual(Object.keys(state.inventory), ['gold']);
  } finally { await f.storage.close(); }
});

test('a stale bounty reroll revision returns the current revision without spending', async () => {
  const f = await fixture(s => {
    s.inventory.gold = 5000;
    s.bounties = { date: todayLocal(), bounties: [bounty('b1')], rerollsUsed: 0 };
  });
  try {
    const first = await f.reroll();
    assert.equal(first.statusCode, 200);
    const before = structuredClone(await f.storage.getOrCreatePlayerState(f.userId, pack.version));
    const response = await f.reroll({ expectedRevision: (f.seeded as EnhancedPlayerState).stateRevision ?? 0 });
    assert.equal(response.statusCode, 409);
    assert.equal(response.payload.error, 'state_version_conflict');
    assert.equal(response.payload.stateRevision, before.stateRevision);
    assert.deepEqual(await f.storage.getOrCreatePlayerState(f.userId, pack.version), before);
  } finally { await f.storage.close(); }
});

test('a rejected achievement claim does not persist partial offline settlement', async () => {
  const f = await fixture();
  try {
    const before = await f.storage.getOrCreatePlayerState(f.userId, pack.version);
    const since = new Date(Date.now() - 60_000).toISOString();
    before.mode = 'life_action';
    before.lifeActionState = { actionId: 'act_chop_wood_t1', startedAt: since };
    before.lastSimulatedAt = since;
    await f.storage.savePlayerState(f.userId, before);
    const saved = structuredClone(await f.storage.getOrCreatePlayerState(f.userId, pack.version));
    const response = await f.claimAch({ achievementId: 'ach_missing' });
    assert.equal(response.statusCode, 400);
    assert.equal(response.payload.error, '成就不存在');
    assert.deepEqual(await f.storage.getOrCreatePlayerState(f.userId, pack.version), saved);
  } finally { await f.storage.close(); }
});
