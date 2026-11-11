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

  // Chapter 4: Snow & Volcano — Farming/Fishing -> Cooking -> Crystal/Alchemy -> Dual Bosses
  mark(
    'ch4_farm_fish',
    (inv.fish_river || 0) > 0 ||
      (inv.fish_sea || 0) > 0 ||
      (inv.fish_lake || 0) > 0 ||
      (inv.fish_deepsea || 0) > 0 ||
      (actions.act_fish_river_t1 || 0) > 0 ||
      (actions.act_fish_sea_t2 || 0) > 0 ||
      (actions.act_fish_shrimp_t1 || 0) > 0 ||
      (actions.act_plant_cotton_t1 || 0) > 0 ||
      (actions.act_plant_flax_t2 || 0) > 0 ||
      (actions.act_plant_silk_t3 || 0) > 0 ||
      (actions.act_plant_magic_t4 || 0) > 0 ||
      (actions.act_raise_sheep_t1 || 0) > 0 ||
      (actions.act_raise_cattle_t2 || 0) > 0 ||
      (actions.act_raise_chicken_t1 || 0) > 0
  );
  mark(
    'ch4_cook_feast',
    (inv.food_simple || 0) > 0 ||
      (inv.food_fine || 0) > 0 ||
      (inv.food_hearty_stew || 0) > 0 ||
      (inv.food_master_feast || 0) > 0 ||
      (inv.food_royal_banquet || 0) > 0 ||
      (actions.act_cook_food_t1 || 0) > 0 ||
      (actions.act_cook_food_t2 || 0) > 0 ||
      (actions.act_cook_food_hearty_stew || 0) > 0 ||
      (actions.act_cook_food_master_feast || 0) > 0 ||
      (actions.act_cook_dish_grilled_lake || 0) > 0 ||
      (actions.act_cook_dish_frost_sashimi || 0) > 0 ||
      (actions.act_cook_dish_deepsea_stew || 0) > 0
  );
  mark(
    'ch4_mine_crystal',
    (inv.crystal_1 || 0) > 0 ||
      (inv.crystal_2 || 0) > 0 ||
      (inv.crystal_3 || 0) > 0 ||
      (inv.crystal_4 || 0) > 0 ||
      (actions.act_mine_crystal_t1 || 0) > 0 ||
      (actions.act_mine_crystal_t2 || 0) > 0 ||
      (actions.act_mine_crystal_t3 || 0) > 0
  );
  mark(
    'ch4_brew_elixir',
    (inv.potion_hp_t1 || 0) > 0 ||
      (inv.potion_hp_t2 || 0) > 0 ||
      (inv.potion_hp_t3 || 0) > 0 ||
      (inv.potion_mp_t1 || 0) > 0 ||
      (inv.potion_mp_t2 || 0) > 0 ||
      (inv.potion_battle_fury || 0) > 0 ||
      (inv.potion_guardian_elixir || 0) > 0 ||
      (inv.potion_iron_skin || 0) > 0 ||
      (inv.potion_arcane_surge || 0) > 0 ||
      (actions.act_brew_potion_hp_t1 || 0) > 0 ||
      (actions.act_brew_potion_hp_t2 || 0) > 0 ||
      (actions.act_brew_potion_hp_t3 || 0) > 0 ||
      (actions.act_brew_potion_mp_t1 || 0) > 0 ||
      (actions.act_brew_potion_mp_t2 || 0) > 0 ||
      (actions.act_brew_potion_battle_fury || 0) > 0 ||
      (actions.act_brew_potion_guardian_elixir || 0) > 0 ||
      (actions.act_brew_potion_iron_skin || 0) > 0 ||
      (actions.act_brew_potion_arcane_surge || 0) > 0
  );
  mark('ch4_build', !!player.chapter4Build);
  mark('ch4_snow_boss', (kills.snow_boss || 0) > 0);
  if (p.completedMilestones.ch4_snow_boss && !p.completedChapters.snow) {
    p.completedChapters.snow = { ...p.completedMilestones.ch4_snow_boss };
  }
  mark('ch4_volcano_boss', (kills.volcano_boss || 0) > 0);
  if (p.completedMilestones.ch4_volcano_boss && !p.completedChapters.volcano) {
    p.completedChapters.volcano = { ...p.completedMilestones.ch4_volcano_boss };
  }
}
