import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defaultEnhancedPlayerState, simulateToNow } from './storage';
import pack from '../../shared/enhanced_content_pack_chinese.json';
import type { EnhancedContentPack } from './types';

test('migrates forest completion once and retains it after inventory changes', () => {
  const state = defaultEnhancedPlayerState(pack.version);
  state.stats!.killsByMonster.forest_boss = 1;
  const now = new Date(state.lastSimulatedAt);
  const next = simulateToNow({ state, now, contentPack: pack as EnhancedContentPack }).state as any;
  assert.equal(next.progression?.schemaVersion, 1);
  assert.equal(next.progression?.completedChapters.forest?.source, 'migration');
  const marker = structuredClone(next.progression.completedChapters.forest);
  next.inventory = { gold: 0 }; next.equipment.main_hand = 'weapon_frost_blade';
  const again = simulateToNow({ state: next, now, contentPack: pack as EnhancedContentPack }).state as any;
  assert.deepEqual(again.progression.completedChapters.forest, marker);
  assert.equal(again.inventory.gold, 0);
});

test('a consumed starter item does not erase an achieved milestone', () => {
  const state = defaultEnhancedPlayerState(pack.version);
  state.inventory.lumber_1 = 1;
  const now = new Date(state.lastSimulatedAt);
  const next = simulateToNow({ state, now, contentPack: pack as EnhancedContentPack }).state as any;
  assert.ok(next.progression?.completedMilestones.board);
  delete next.inventory.lumber_1;
  const again = simulateToNow({ state: next, now, contentPack: pack as EnhancedContentPack }).state as any;
  assert.ok(again.progression.completedMilestones.board);
});
