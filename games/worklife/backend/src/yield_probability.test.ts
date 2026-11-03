import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defaultEnhancedPlayerState, simulateToNow } from './storage';
import pack from '../../shared/enhanced_content_pack_chinese.json';
import type { EnhancedContentPack, EnhancedPlayerState } from './types';

test('zero-probability yields never drop, even when RNG returns zero', () => {
  const content = structuredClone(pack) as EnhancedContentPack;
  const action = content.actions.find(a => a.id === 'act_chop_wood_t1')!;
  action.yields = [{itemId:'wood_1', qty:1, chance:0}];
  const state = defaultEnhancedPlayerState(pack.version);
  const now = new Date(state.lastSimulatedAt);
  state.mode = 'life_action';
  state.lifeActionState = {actionId:action.id, startedAt:now.toISOString()};
  const after = simulateToNow({state, now:new Date(+now + 5000), contentPack:content, rng:()=>0}).state as EnhancedPlayerState;
  assert.equal(after.inventory.wood_1 || 0, 0);
});
