import type { EnhancedPlayerState } from './types';

export type ProgressionState = {
  schemaVersion: 1;
  completedMilestones: Record<string, { completedAt: string; source: 'event' | 'migration' }>;
  completedChapters: Record<string, { completedAt: string; source: 'event' | 'migration' }>;
};

/** Record evidence monotonically. Inventory is evidence of achievement, never its lifetime. */
export function ensureProgression(player: EnhancedPlayerState, now: Date, source?: 'event' | 'migration'): void {
  const origin = source ?? (player.progression ? 'event' : 'migration');
  const p = player.progression ??= { schemaVersion: 1, completedMilestones: {}, completedChapters: {} };
  const mark = (id: string, achieved: boolean) => {
    if (achieved && !p.completedMilestones[id]) p.completedMilestones[id] = { completedAt: now.toISOString(), source: origin };
  };
  const inv = player.inventory || {};
  const actions = player.stats?.actionsById || {};
  const kills = player.stats?.killsByMonster || {};
  const eq = player.equipment || {};
  mark('chop', (inv.wood_1 || 0) > 0 || (actions.act_chop_wood_t1 || 0) > 0);
  mark('board', (inv.lumber_1 || 0) > 0 || (actions.act_craft_lumber_t1 || 0) > 0);
  mark('sword', (inv.weapon_wooden_sword || 0) > 0 || (actions.act_craft_weapon_wooden_sword || 0) > 0);
  mark('equip_sword', !!eq.main_hand);
  mark('first_kill', (player.stats?.totalKills || 0) > 0);
  mark('build', !!player.chapter1Build);
  mark('archetypes', ['slime', 'crab', 'monkey'].every(id => (kills[id] || 0) > 0));
  mark('chest', !!eq.chest);
  mark('boss', (kills.forest_boss || 0) > 0);
  if (p.completedMilestones.boss && !p.completedChapters.forest) {
    p.completedChapters.forest = { ...p.completedMilestones.boss };
  }
}
