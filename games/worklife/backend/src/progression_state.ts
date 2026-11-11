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
  mark('chest', !!eq.chest);
  mark('archetypes', ['slime', 'crab', 'monkey'].every(id => (kills[id] || 0) > 0));
  mark('boss', (kills.forest_boss || 0) > 0);
  if (p.completedMilestones.boss && !p.completedChapters.forest) {
    p.completedChapters.forest = { ...p.completedMilestones.boss };
  }

  // Chapter 2: Mine & Blacksmithing
  mark(
    'ch2_mine_ore',
    (inv.ore_1 || 0) > 0 ||
      (inv.ore_2 || 0) > 0 ||
      (actions.act_mine_ore_t1 || 0) > 0 ||
      (actions.act_mine_ore_t2 || 0) > 0
  );
  mark(
    'ch2_smelt_ingot',
    (inv.ingot_1 || 0) > 0 ||
      (inv.ingot_2 || 0) > 0 ||
      (actions.act_smelt_ingot_t1 || 0) > 0 ||
      (actions.act_smelt_ingot_t2 || 0) > 0
  );
  mark(
    'ch2_forge_weapon',
    (inv.weapon_iron_sword || 0) > 0 ||
      (inv.weapon_steel_axe || 0) > 0 ||
      eq.main_hand === 'weapon_iron_sword' ||
      eq.main_hand === 'weapon_steel_axe' ||
      (actions.act_forge_iron_sword || 0) > 0 ||
      (actions.act_forge_steel_axe || 0) > 0
  );
  mark('ch2_build', !!player.chapter2Build);
  mark(
    'ch2_forge_armor',
    (inv.armor_iron_chest || 0) > 0 ||
      (inv.armor_steel_chest || 0) > 0 ||
      eq.chest === 'armor_iron_chest' ||
      eq.chest === 'armor_steel_chest' ||
      (actions.act_forge_iron_chest || 0) > 0 ||
      (actions.act_forge_steel_chest || 0) > 0
  );
  const mineScoutCount = ['rock_golem', 'crystal_bat', 'ore_rat', 'magma_worm', 'iron_spider', 'gem_thief'].reduce(
    (sum, id) => sum + ((kills[id] || 0) > 0 ? 1 : 0),
    0
  );
  mark('ch2_mine_scouts', mineScoutCount >= 3);
  mark('ch2_boss', (kills.mine_boss || 0) > 0);
  if (p.completedMilestones.ch2_boss && !p.completedChapters.mine) {
    p.completedChapters.mine = { ...p.completedMilestones.ch2_boss };
  }

  // Chapter 3: Swamp & Tailoring
  mark(
    'ch3_gather_fiber',
    (inv.fiber_1 || 0) > 0 ||
      (inv.fiber_2 || 0) > 0 ||
      (inv.fiber_3 || 0) > 0 ||
      (actions.act_gather_fiber_t1 || 0) > 0 ||
      (actions.act_gather_fiber_t2 || 0) > 0
  );
  mark(
    'ch3_spin_yarn',
    (inv.yarn_1 || 0) > 0 ||
      (inv.yarn_2 || 0) > 0 ||
      (actions.act_spin_yarn_t1 || 0) > 0 ||
      (actions.act_spin_yarn_t2 || 0) > 0
  );
  const eqValues = new Set(Object.values(eq).filter((v): v is string => typeof v === 'string'));
  const tailorGarbCount = [
    'armor_cloth_chest',
    'armor_cloth_legs',
    'armor_cloth_boots',
    'armor_cloth_gloves',
    'armor_leather_chest',
    'armor_leather_legs',
    'armor_leather_boots',
    'armor_leather_gloves',
    'armor_tailor_leather_chest',
  ].reduce((sum, id) => sum + ((inv[id] || 0) > 0 || eqValues.has(id) ? 1 : 0), 0);
  mark('ch3_craft_garb', tailorGarbCount >= 2);
  mark('ch3_build', !!player.chapter3Build);
  const swampScoutCount = ['poison_frog', 'swamp_zombie', 'mud_elemental', 'vine_snake', 'ghost_light', 'swamp_troll'].reduce(
    (sum, id) => sum + ((kills[id] || 0) > 0 ? 1 : 0),
    0
  );
  mark('ch3_swamp_scouts', swampScoutCount >= 3);
  mark('ch3_boss', (kills.swamp_boss || 0) > 0);
  if (p.completedMilestones.ch3_boss && !p.completedChapters.swamp) {
    p.completedChapters.swamp = { ...p.completedMilestones.ch3_boss };
  }
}
