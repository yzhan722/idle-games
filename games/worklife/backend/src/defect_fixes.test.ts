import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { createMemoryStorage } from './storage_memory';
import { partyRoutes } from './routes/party';
import { skillsRoutes } from './routes/skills';
import { mapThrownError } from './http_errors';
import { consumeItem } from './systems';
import { rerollBounties, ensureBounties } from './progression2';
import { enhancementMaterials } from './enhancement_math';
import { roomUpgradeCost, HOUSE_ROOMS } from './houses';
import { setCombatLoadout } from './hp_combat';
import { todayLocal } from './time';
import enhancedContentPack from '../../shared/enhanced_content_pack_chinese.json';
import type { EnhancedContentPack, EnhancedPlayerState } from './types';

const pack = enhancedContentPack as EnhancedContentPack;

function fakeApp() {
  const handlers = new Map<string, any>();
  return {
    handlers,
    get(path: string, fn: any) { handlers.set(`GET ${path}`, fn); },
    post(path: string, fn: any) { handlers.set(`POST ${path}`, fn); },
    delete(path: string, fn: any) { handlers.set(`DELETE ${path}`, fn); },
  };
}

function fakeReply() {
  const captured: { statusCode: number; payload: any } = { statusCode: 200, payload: undefined };
  const reply = {
    captured,
    status(code: number) { captured.statusCode = code; return this; },
    send(payload: any) { captured.payload = payload; return { statusCode: captured.statusCode, payload }; },
  };
  return reply;
}

async function callHandler(handlers: Map<string, any>, method: string, path: string, req: any) {
  const reply = fakeReply();
  const handler = handlers.get(`${method} ${path}`);
  assert.ok(handler, `no handler for ${method} ${path}`);
  try {
    const res = await handler(req, reply);
    return res === undefined ? { statusCode: reply.captured.statusCode, payload: reply.captured.payload } : res;
  } catch (error) {
    const mapped = mapThrownError(error);
    return reply.status(mapped.status).send(mapped.body);
  }
}

test('party ghost operations return 400 with a business error, not 200', async () => {
  const storage = createMemoryStorage();
  const user = await storage.findOrCreateGuestUser(`party-${randomUUID()}`);
  await storage.getOrCreatePlayerState(user.id, pack.version);
  const app = fakeApp();
  await partyRoutes(app as any, storage, pack);
  const ghost = 'no-such-party';
  for (const [path, body] of [
    ['/party/kick', { partyId: ghost, memberId: 'x' }],
    ['/party/transfer-leadership', { partyId: ghost, memberId: 'x' }],
    ['/party/start-activity', { partyId: ghost, activityType: 'combat' }],
    ['/party/complete-activity', { partyId: ghost }],
    ['/party/cancel-activity', { partyId: ghost }],
    ['/party/leave', { partyId: ghost }],
    ['/party/invite/decline', { partyId: ghost }],
  ] as const) {
    const res = await callHandler(app.handlers, 'POST', path, { userId: user.id, body });
    assert.equal(res.statusCode, 400, `${path} returned ${res.statusCode}`);
    assert.equal(res.payload.success, false);
  }
  await storage.close();
});

test('party create rejects an empty name via schema', async () => {
  const storage = createMemoryStorage();
  const user = await storage.findOrCreateGuestUser(`party-${randomUUID()}`);
  const app = fakeApp();
  await partyRoutes(app as any, storage, pack);
  const res = await callHandler(app.handlers, 'POST', '/party/create', { userId: user.id, body: { name: '   ' } });
  assert.equal(res.statusCode, 400);
  await storage.close();
});

test('unknown profession progress returns 404 not 500', async () => {
  const storage = createMemoryStorage();
  const user = await storage.findOrCreateGuestUser(`skills-${randomUUID()}`);
  const app = fakeApp();
  await skillsRoutes(app as any, storage, pack);
  const res = await callHandler(app.handlers, 'GET', '/skills/progress/:professionId', {
    userId: user.id, params: { professionId: 'ghost' }, query: {},
  });
  assert.equal(res.statusCode, 404);
  await storage.close();
});

test('consuming the same buff again stacks remaining time instead of resetting', async () => {
  const storage = createMemoryStorage();
  const user = await storage.findOrCreateGuestUser(`buff-${randomUUID()}`);
  const state = await storage.getOrCreatePlayerState(user.id, pack.version) as EnhancedPlayerState;
  const potion = (pack.items as any[]).find(i => i.effect?.buff?.durationSec);
  assert.ok(potion, 'content pack has no buff item to test with');
  const durationSec = potion.effect.buff.durationSec;
  state.inventory[potion.id] = 2;
  const t0 = new Date();
  assert.equal(consumeItem(state, pack, potion.id, t0).ok, true);
  const first = Date.parse(state.activeBuffs![0].expiresAt);
  assert.equal(consumeItem(state, pack, potion.id, t0).ok, true);
  const second = Date.parse(state.activeBuffs![0].expiresAt);
  assert.equal(second - first, durationSec * 1000, 'second dose must add a full duration');
  assert.equal(state.activeBuffs!.length, 1);
  await storage.close();
});

test('bounty reroll keeps accepted contracts alive', async () => {
  const storage = createMemoryStorage();
  const user = await storage.findOrCreateGuestUser(`bounty-${randomUUID()}`);
  const state = await storage.getOrCreatePlayerState(user.id, pack.version) as EnhancedPlayerState;
  const board = ensureBounties(state);
  const accepted = board.bounties[0];
  accepted.accepted = true;
  state.inventory.gold = 10_000;
  const res = rerollBounties(state);
  assert.equal(res.ok, true);
  const kept = ensureBounties(state).bounties.find(b => b.id === accepted.id);
  assert.ok(kept, 'accepted bounty vanished after reroll');
  assert.equal(kept!.accepted, true);
  await storage.close();
});

test('enhancement consumes same-family material at the equipment tier', () => {
  const rule = { materials: [{ itemId: 'ingot_1', quantity: 2 }] } as any;
  const t5 = (pack.items as any[]).find(i => i.id === 'ingot_5');
  assert.ok(t5, 'ingot_5 missing from pack');
  const low = enhancementMaterials(rule, 1, undefined, { tier: 1 } as any, pack);
  assert.deepEqual(low, { ingot_1: 2 });
  const high = enhancementMaterials(rule, 1, undefined, { tier: 5 } as any, pack);
  assert.deepEqual(high, { ingot_5: 2 });
  // tier whose family member does not exist falls back to the base material
  const fallback = enhancementMaterials({ materials: [{ itemId: 'poison_sac', quantity: 1 }] } as any, 1, undefined, { tier: 9 } as any, pack);
  assert.deepEqual(fallback, { poison_sac: 1 });
});

test('laboratory upper levels consume higher-tier crystals', () => {
  const lab = HOUSE_ROOMS.find(r => r.id === 'laboratory')!;
  assert.equal(roomUpgradeCost(lab, 5).materials[0].itemId, 'crystal_5');
  assert.equal(roomUpgradeCost(lab, 8).materials[0].itemId, 'crystal_8');
  // 4-entry rooms keep the two-level band behaviour
  const yard = HOUSE_ROOMS.find(r => r.id === 'lumber_yard')!;
  assert.equal(roomUpgradeCost(yard, 3).materials[0].itemId, 'wood_2');
});

test('combat loadout triggerMissingHp is clamped to max HP', async () => {
  const storage = createMemoryStorage();
  const user = await storage.findOrCreateGuestUser(`loadout-${randomUUID()}`);
  const state = await storage.getOrCreatePlayerState(user.id, pack.version) as EnhancedPlayerState;
  const food = (pack.items as any[]).find(i => (i.type === 'food' || i.type === 'consumable') && Number(i.effect?.hp) > 0);
  assert.ok(food, 'no hp-food item in pack');
  state.inventory[food.id] = 5;
  const res = setCombatLoadout(state, pack, { food: [{ itemId: food.id, triggerMissingHp: 999_999 }] });
  assert.equal(res.ok, true, JSON.stringify(res));
  const trig = state.combatLoadout!.food[0].triggerMissingHp;
  assert.ok(trig > 0 && trig < 999_999, `trigger ${trig} not clamped`);
  await storage.close();
});

test('task day key follows the shared UTC+8 boundary', async () => {
  const tasks = await import('./tasks');
  // 23:30 UTC is already the next day in UTC+8 — must not roll tasks early
  const now = new Date('2025-01-10T15:30:00Z'); // 23:30 UTC+8 same day
  const next = new Date('2025-01-10T16:30:00Z'); // 00:30 UTC+8 next day
  assert.equal(todayLocal(now), '2025-01-10');
  assert.equal(todayLocal(next), '2025-01-11');
  assert.ok(tasks, 'tasks module loads');
});

test('simulate prunes dead loadout entries stored as objects', async () => {
  const storage = createMemoryStorage();
  const user = await storage.findOrCreateGuestUser(`prune-${randomUUID()}`);
  const state = await storage.getOrCreatePlayerState(user.id, pack.version) as EnhancedPlayerState;
  const food = (pack.items as any[]).find(i => i.type === 'food');
  state.combatLoadout = {
    food: [{ itemId: 'ghost_item_404', triggerMissingHp: 10 }, { itemId: food.id, triggerMissingHp: 10 }],
    drink: [{ itemId: 'ghost_drink_404' }],
    autoRepeat: false,
  } as any;
  state.lastSimulatedAt = new Date(Date.now() - 1000).toISOString();
  const sim = await storage.simulateToNow({ userId: user.id, state, contentPack: pack, now: new Date() });
  const loadout = (sim as any).combatLoadout;
  assert.deepEqual(loadout.food.map((e: any) => e.itemId), [food.id]);
  assert.equal(loadout.drink.length, 0);
  await storage.close();
});
