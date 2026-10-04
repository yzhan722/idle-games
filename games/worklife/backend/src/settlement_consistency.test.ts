import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defaultEnhancedPlayerState, simulateToNow } from './storage';
import { startHpCombat, tickHpCombat } from './hp_combat';
import raw from '../../shared/enhanced_content_pack_chinese.json';
import type { EnhancedContentPack, EnhancedPlayerState } from './types';
const pack = raw as EnhancedContentPack;
const t0 = new Date('2026-09-22T00:00:00Z');
function fighter(monster = 'crab') {
  const p = defaultEnhancedPlayerState(pack.version);
  p.lastSimulatedAt = t0.toISOString();
  p.equipment.main_hand = 'weapon_wooden_sword';
  p.equipment.chest = 'armor_wood_chest';
  p.abilityLoadout = [];
  p.hpCombat = startHpCombat(p, pack, monster, t0);
  return p;
}
test('a fight longer than one minute has the same result when caught up in one request', () => {
  const a = fighter(); const b = structuredClone(a);
  tickHpCombat(a, pack, new Date(+t0 + 180_000), 180_000, () => .99);
  for (let i = 1; i <= 180; i++) tickHpCombat(b, pack, new Date(+t0 + i * 1000), 1000, () => .99);
  assert.equal(a.hpCombat!.outcome, b.hpCombat!.outcome);
  assert.equal(a.hpCombat!.enemyHp, b.hpCombat!.enemyHp);
  assert.deepEqual(a.inventory, b.inventory);
});
test('the player settlement resumes a defeated auto-repeat run', () => {
  const p = fighter('slime');
  p.combatLoadout = { food: [], drink: [], autoRepeat: true };
  p.hpCombat!.outcome = 'loss'; p.hpCombat!.playerHp = 0; p.hpCombat!.nextFightAt = +t0 + 30_000;
  const next = simulateToNow({ state: p, contentPack: pack, now: new Date(+t0 + 31_000), rng: () => .99 }).state as EnhancedPlayerState;
  assert.notEqual(next.hpCombat?.outcome, 'loss');
  assert.equal(next.hpCombat?.deaths, 1);
});
test('bounded offline work resumes until it agrees with segmented online combat', () => {
  let offline = fighter('slime'); let online = structuredClone(offline);
  offline.combatLoadout = online.combatLoadout = { food: [], drink: [], autoRepeat: true };
  const end = new Date(+t0 + 8 * 3600_000);
  for (let i = 1; i <= 480; i++) online = simulateToNow({state: online, now: new Date(+t0 + i * 60_000), contentPack: pack, rng: () => .99}).state as EnhancedPlayerState;
  for (let n=0; n<200 && offline.lastSimulatedAt !== end.toISOString(); n++) offline = simulateToNow({state: offline, now: end, contentPack: pack, rng: () => .99}).state as EnhancedPlayerState;
  assert.equal(offline.lastSimulatedAt, end.toISOString());
  assert.equal(offline.stats!.totalKills, online.stats!.totalKills);
  assert.deepEqual(offline.inventory, online.inventory);
});

test('48 hours offline is capped once and never replays the discarded time', () => {
  let p = fighter('slime');
  p.combatLoadout = { food: [], drink: [], autoRepeat: true };
  const end = new Date(+t0 + 48 * 3600_000);
  for (let i=0; i<500 && p.lastSimulatedAt !== end.toISOString(); i++) p = simulateToNow({state:p, now:end, contentPack:pack, rng:()=>.99}).state as EnhancedPlayerState;
  assert.equal(p.lastSimulatedAt, end.toISOString());
  const kills = p.stats!.totalKills;
  p = simulateToNow({state:p, now:new Date(+end + 1000), contentPack:pack, rng:()=>.99}).state as EnhancedPlayerState;
  assert.ok(p.stats!.totalKills - kills <= 1, 'only one second of new time, not another day');
});

test('an intermission beyond the cap is shifted instead of replaying a discarded day', () => {
  let p = fighter('slime');
  p.combatLoadout = { food: [], drink: [], autoRepeat: true };
  p.hpCombat!.outcome = 'win';
  p.hpCombat!.nextFightAt = +t0 + 24 * 3600_000 + 5000;
  const end = new Date(+t0 + 48 * 3600_000);
  p = simulateToNow({state:p, now:end, contentPack:pack, rng:()=>.99}).state as EnhancedPlayerState;
  p = simulateToNow({state:p, now:new Date(+end + 1000), contentPack:pack, rng:()=>.99}).state as EnhancedPlayerState;
  assert.equal(p.stats!.totalKills, 0);
});

test('storage finishes every offline chunk before returning a state for a command', async () => {
  const { createMemoryStorage } = await import('./storage_memory');
  const storage = createMemoryStorage();
  try {
    const user = await storage.findOrCreateGuestUser('settlement-complete');
    await storage.getOrCreatePlayerState(user.id, pack.version);
    const state = fighter('slime');
    state.combatLoadout = { food: [], drink: [], autoRepeat: true };
    const now = new Date(+t0 + 8 * 3600_000);
    const next = await storage.simulateToNow({ userId: user.id, state, now, contentPack: pack });
    assert.equal(next.lastSimulatedAt, now.toISOString());
    assert.equal(next.settlement?.complete, true);
    assert.ok(next.stats!.totalKills > 100);
  } finally { await storage.close(); }
});

test('memory settlement cannot overwrite a command accepted while it is catching up', async () => {
  const { createMemoryStorage } = await import('./storage_memory');
  const storage = createMemoryStorage();
  try {
    const user = await storage.findOrCreateGuestUser('settlement-race');
    await storage.getOrCreatePlayerState(user.id, pack.version);
    const state = fighter('slime');
    state.combatLoadout = { food: [], drink: [], autoRepeat: true };
    const saved = await storage.savePlayerState(user.id, state);
    const pending = storage.simulateToNow({userId:user.id,state:saved,now:new Date(+t0 + 8*3600_000),contentPack:pack});
    const current = await storage.getOrCreatePlayerState(user.id, pack.version);
    current.inventory.wood_1 = 123;
    await storage.savePlayerState(user.id, current);
    await pending;
    assert.equal((await storage.getOrCreatePlayerState(user.id,pack.version)).inventory.wood_1,123);
  } finally { await storage.close(); }
});
