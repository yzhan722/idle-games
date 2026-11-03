import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defaultEnhancedPlayerState, simulateToNow } from './storage';
import { startHpCombat, tickHpCombat } from './hp_combat';
import { ensureCombatSkills } from './combat_skills';
import raw from '../../shared/enhanced_content_pack_chinese.json';
import type { EnhancedContentPack, EnhancedPlayerState } from './types';
const pack = raw as EnhancedContentPack;
const t0 = new Date('2026-09-22T00:00:00Z');
function fighter(monster = 'crab') {
  const p = defaultEnhancedPlayerState(pack.version);
  p.lastSimulatedAt = t0.toISOString();
  // 装备槽是背包物品的指针：必须在背包里才有属性（幽灵槽按无装备处理）
  p.inventory.weapon_wooden_sword = 1;
  p.inventory.armor_wood_chest = 1;
  p.equipment.main_hand = 'weapon_wooden_sword';
  p.equipment.chest = 'armor_wood_chest';
  p.abilityLoadout = [];
  ensureCombatSkills(p); // 先种 1 级技能（保属性），再抬 combatLevel 过等级门
  p.combatLevel = 10;
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
test('a long gap settles in one call and only pays the short recent window', () => {
  let offline = fighter('slime');
  offline.combatLoadout = { food: [], drink: [], autoRepeat: true };
  const end = new Date(+t0 + 8 * 3600_000);
  offline = simulateToNow({state: offline, now: end, contentPack: pack, rng: () => .99}).state as EnhancedPlayerState;
  assert.equal(offline.lastSimulatedAt, end.toISOString());
  // 8 小时只结算最近 120 秒：击杀数以十计，绝不可能追上分段在线的 8 小时。
  assert.ok(offline.stats!.totalKills < 50, `kills after 8h gap: ${offline.stats!.totalKills}`);
  // 战斗时间锚点被平移进窗口，而不是停在 8 小时前。
  assert.ok(end.getTime() - (offline.hpCombat?.startedAt ?? 0) < 8 * 3600_000, 'combat anchor shifted');
});

test('a multi-day gap is discarded once and never replays', () => {
  let p = fighter('slime');
  p.combatLoadout = { food: [], drink: [], autoRepeat: true };
  const end = new Date(+t0 + 48 * 3600_000);
  p = simulateToNow({state:p, now:end, contentPack:pack, rng:()=>.99}).state as EnhancedPlayerState;
  assert.equal(p.lastSimulatedAt, end.toISOString());
  const kills = p.stats!.totalKills;
  assert.ok(kills < 50, `kills after 48h gap: ${kills}`);
  p = simulateToNow({state:p, now:new Date(+end + 1000), contentPack:pack, rng:()=>.99}).state as EnhancedPlayerState;
  assert.ok(p.stats!.totalKills - kills <= 1, 'only one second of new time, not another day');
});

test('an intermission beyond the settle window is shifted instead of replaying a discarded day', () => {
  let p = fighter('slime');
  p.combatLoadout = { food: [], drink: [], autoRepeat: true };
  p.hpCombat!.outcome = 'win';
  p.hpCombat!.nextFightAt = +t0 + 24 * 3600_000 + 5000;
  const end = new Date(+t0 + 48 * 3600_000);
  p = simulateToNow({state:p, now:end, contentPack:pack, rng:()=>.99}).state as EnhancedPlayerState;
  p = simulateToNow({state:p, now:new Date(+end + 1000), contentPack:pack, rng:()=>.99}).state as EnhancedPlayerState;
  assert.equal(p.stats!.totalKills, 0);
});

test('storage settles the whole allowed window in a single call', async () => {
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
    assert.equal((next as any).settlement, undefined);
    // 离线不再累积收益：8 小时的缺口只结算最近 120 秒的战斗。
    assert.ok(next.stats!.totalKills < 50, `kills after 8h gap: ${next.stats!.totalKills}`);
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
