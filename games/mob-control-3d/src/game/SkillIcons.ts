import type {
  BoboTechBranchId,
  BuffId,
  CannonCoreModId,
  DebuffId,
  HallTrophyId,
  MechaMode,
  MetaUpgradeId,
  PetCompanionId,
  RelicBannerId,
  SkillBranchId,
  SkillNodeId,
  SkinId,
  SquadFinishId,
  TacticCategory,
  TacticalSubWeaponId,
  WeaponMode,
} from './State';

const skillImg = (id: string): string =>
  `<img class="art-icon-img skill-art-img" src="/assets/icons/${id}.png?v=33" alt="" loading="eager" decoding="async" draggable="false" />`;

const raceImg = (id: string, cls = 'race-art-img'): string =>
  `<img class="art-icon-img ${cls}" src="/assets/icons/race_${id}.png?v=33" alt="" loading="eager" decoding="async" draggable="false" />`;

const metaImg = (id: string): string =>
  `<img class="art-icon-img meta-art-img" src="/assets/icons/${id}.png?v=33" alt="" loading="eager" decoding="async" draggable="false" />`;

const hudImg = (file: string, cls = 'hud-art-img'): string =>
  `<img class="art-icon-img ${cls}" src="/assets/icons/${file}.png?v=33" alt="" loading="eager" decoding="async" draggable="false" />`;

const hudImgV19 = (file: string, cls = 'inline-art-img'): string =>
  `<img class="art-icon-img ${cls}" src="/assets/icons/${file}.png?v=33" alt="" loading="eager" decoding="async" draggable="false" />`;

const rootAssetImgV20 = (file: string, cls = 'inline-art-img'): string =>
  `<img class="art-icon-img ${cls}" src="/assets/${file}.png?v=33" alt="" loading="eager" decoding="async" draggable="false" />`;

const finishImgV21 = (file: string, cls = 'finish-art-img'): string =>
  `<img class="art-icon-img ${cls}" src="/assets/icons/${file}.png?v=33" alt="" loading="eager" decoding="async" draggable="false" />`;

/**
 * 28 AI-Generated Kingdom-Rush / Brawl-Stars Style 2D Thick-Painted Skill Icons
 */
export const SKILL_NODE_SVGS: Record<SkillNodeId, string> = {
  swarm_t1: skillImg('swarm_t1'),
  swarm_t2: skillImg('swarm_t2'),
  swarm_t3: skillImg('swarm_t3'),
  swarm_t4: skillImg('swarm_t4'),
  titan_t1: skillImg('titan_t1'),
  titan_t2: skillImg('titan_t2'),
  titan_t3: skillImg('titan_t3'),
  titan_t4: skillImg('titan_t4'),
  gate_t1: skillImg('gate_t1'),
  gate_t2: skillImg('gate_t2'),
  gate_t3: skillImg('gate_t3'),
  gate_t4: skillImg('gate_t4'),
  plasma_t1: skillImg('plasma_t1'),
  plasma_t2: skillImg('plasma_t2'),
  plasma_t3: skillImg('plasma_t3'),
  plasma_t4: skillImg('plasma_t4'),
  orbital_t1: skillImg('orbital_t1'),
  orbital_t2: skillImg('orbital_t2'),
  orbital_t3: skillImg('orbital_t3'),
  orbital_t4: skillImg('orbital_t4'),
  bastion_t1: skillImg('bastion_t1'),
  bastion_t2: skillImg('bastion_t2'),
  bastion_t3: skillImg('bastion_t3'),
  bastion_t4: skillImg('bastion_t4'),
  tycoon_t1: skillImg('tycoon_t1'),
  tycoon_t2: skillImg('tycoon_t2'),
  tycoon_t3: skillImg('tycoon_t3'),
  tycoon_t4: skillImg('tycoon_t4'),
};

/**
 * 7 Cute Slime Race Mascot Illustrations
 */
export const RACE_MASCOT_ART: Record<SkillBranchId, string> = {
  swarm: raceImg('swarm'),
  titan: raceImg('titan'),
  gate: raceImg('gate'),
  plasma: raceImg('plasma'),
  orbital: raceImg('orbital'),
  bastion: raceImg('bastion'),
  tycoon: raceImg('tycoon'),
};

/**
 * 6 Workshop Out-of-Match Meta-Upgrade Tech Illustrations
 */
export const META_UPGRADE_ART: Record<MetaUpgradeId, string> = {
  meta_attack: metaImg('meta_attack'),
  meta_firerate: metaImg('meta_firerate'),
  meta_bastion: metaImg('meta_bastion'),
  meta_capacitor: metaImg('meta_capacitor'),
  meta_thruster: metaImg('meta_thruster'),
  meta_bounty: metaImg('meta_bounty'),
};

/**
 * 3 Mecha Ultimate Stance Illustrations
 */
export const MECHA_MODE_ART: Record<MechaMode, string> = {
  hammer: hudImg('hud_hammer'),
  pyro: hudImg('hud_pyro'),
  aegis: hudImg('hud_aegis'),
};

export const WEAPON_MODE_ART: Record<WeaponMode, string> = {
  gatling: hudImg('ui_rocket', 'hud-art-img'),
  twin: hudImg('ui_bolt', 'hud-art-img'),
  plasma: hudImg('ui_sparkle', 'hud-art-img'),
  scatter: rootAssetImgV20('icon_weapon_scatter', 'hud-art-img'),
  rainbow: rootAssetImgV20('icon_weapon_rainbow', 'hud-art-img'),
};

/**
 * 10 Post-Stage 3-Choice Buff Illustrations
 */
export const REWARD_BUFF_ART: Record<BuffId, string> = {
  rapid_fire: hudImg('meta_firerate', 'reward-art-img'),
  hyper_gene: hudImg('meta_attack', 'reward-art-img'),
  bastion_aegis: hudImg('meta_bastion', 'reward-art-img'),
  nitro_stride: hudImg('meta_thruster', 'reward-art-img'),
  siege_breaker: hudImg('titan_t1', 'reward-art-img'),
  titan_reactor: hudImg('meta_capacitor', 'reward-art-img'),
  plasma_crit: hudImg('tycoon_t1', 'reward-art-img'),
  split_chamber: hudImg('hud_pyro', 'reward-art-img'),
  war_plunder: hudImg('meta_bounty', 'reward-art-img'),
  gate_resonance: hudImg('gate_t1', 'reward-art-img'),
};

/**
 * 6 Candy Armory Skin Illustrations (AI-Generated 3D Vinyl-Toy Diorama Portraits)
 */
export const SKIN_CARD_ART: Record<SkinId, string> = {
  azure: hudImg('skin_azure', 'skin-art-img'),
  crimson: hudImg('skin_crimson', 'skin-art-img'),
  emerald: hudImg('skin_emerald', 'skin-art-img'),
  phantom: hudImg('skin_phantom', 'skin-art-img'),
  imperium: hudImg('skin_imperium', 'skin-art-img'),
  nebula: hudImg('skin_nebula', 'skin-art-img'),
};

export const SQUAD_FINISH_ART: Record<SquadFinishId, string> = {
  candy_gloss: finishImgV21('finish_candy_gloss', 'finish-art-img'),
  brass_steam: finishImgV21('finish_brass_steam', 'finish-art-img'),
  crystal_jelly: finishImgV21('finish_crystal_jelly', 'finish-art-img'),
  starlight_prism: finishImgV21('finish_starlight_prism', 'finish-art-img'),
};

export const TACTICAL_SUBWEAPON_ART: Record<TacticalSubWeaponId, string> = {
  electro_net: finishImgV21('subwpn_electro_net', 'finish-art-img'),
  syrup_bubble: finishImgV21('subwpn_syrup_bubble', 'finish-art-img'),
  rally_horn: finishImgV21('subwpn_rally_horn', 'finish-art-img'),
};

export const TACTICAL_SUBWEAPON_HUD_ART: Record<TacticalSubWeaponId, string> = {
  electro_net: hudImg('subwpn_electro_net', 'hud-art-img'),
  syrup_bubble: hudImg('subwpn_syrup_bubble', 'hud-art-img'),
  rally_horn: hudImg('subwpn_rally_horn', 'hud-art-img'),
};

export const TACTICAL_SUBWEAPON_INLINE_ART: Record<TacticalSubWeaponId, string> = {
  electro_net: hudImgV19('subwpn_electro_net', 'inline-art-img'),
  syrup_bubble: hudImgV19('subwpn_syrup_bubble', 'inline-art-img'),
  rally_horn: hudImgV19('subwpn_rally_horn', 'inline-art-img'),
};

export const BOBO_TECH_ART: Record<BoboTechBranchId, string> = {
  vanguard_charge: finishImgV21('tech_vanguard_charge', 'finish-art-img'),
  heavy_siege: finishImgV21('tech_heavy_siege', 'finish-art-img'),
  candy_bombard: finishImgV21('tech_candy_bombard', 'finish-art-img'),
};

export const BOBO_TECH_HUD_ART: Record<BoboTechBranchId, string> = {
  vanguard_charge: hudImg('tech_vanguard_charge', 'hud-art-img'),
  heavy_siege: hudImg('tech_heavy_siege', 'hud-art-img'),
  candy_bombard: hudImg('tech_candy_bombard', 'hud-art-img'),
};

export const BOBO_TECH_INLINE_ART: Record<BoboTechBranchId, string> = {
  vanguard_charge: hudImgV19('tech_vanguard_charge', 'inline-art-img'),
  heavy_siege: hudImgV19('tech_heavy_siege', 'inline-art-img'),
  candy_bombard: hudImgV19('tech_candy_bombard', 'inline-art-img'),
};

export const CANNON_MOD_ART: Record<CannonCoreModId, string> = {
  overdrive_breech: finishImgV21('mod_overdrive_breech', 'finish-art-img'),
  prism_splitter: finishImgV21('mod_prism_splitter', 'finish-art-img'),
  heavy_mortar: finishImgV21('mod_heavy_mortar', 'finish-art-img'),
};

export const CANNON_MOD_HUD_ART: Record<CannonCoreModId, string> = {
  overdrive_breech: hudImg('mod_overdrive_breech', 'hud-art-img'),
  prism_splitter: hudImg('mod_prism_splitter', 'hud-art-img'),
  heavy_mortar: hudImg('mod_heavy_mortar', 'hud-art-img'),
};

export const CANNON_MOD_INLINE_ART: Record<CannonCoreModId, string> = {
  overdrive_breech: hudImgV19('mod_overdrive_breech', 'inline-art-img'),
  prism_splitter: hudImgV19('mod_prism_splitter', 'inline-art-img'),
  heavy_mortar: hudImgV19('mod_heavy_mortar', 'inline-art-img'),
};

/**
 * MC-10: Bobo Squad Relic Banner Stand (疾风冲锋旗 / 圣盾守护旗 / 星耀狂欢旗) 256x256 RGBA art.
 * `RELIC_BANNER_ICON_URL` is also sampled as the emblem texture of the in-match 3D war banner.
 */
export const RELIC_BANNER_ICON_URL: Record<RelicBannerId, string> = {
  gale_charge: '/assets/icons/banner_gale_charge.png?v=33',
  holy_shield: '/assets/icons/banner_holy_shield.png?v=33',
  star_carnival: '/assets/icons/banner_star_carnival.png?v=33',
};

export const RELIC_BANNER_ART: Record<RelicBannerId, string> = {
  gale_charge: finishImgV21('banner_gale_charge', 'finish-art-img'),
  holy_shield: finishImgV21('banner_holy_shield', 'finish-art-img'),
  star_carnival: finishImgV21('banner_star_carnival', 'finish-art-img'),
};

export const RELIC_BANNER_HUD_ART: Record<RelicBannerId, string> = {
  gale_charge: hudImg('banner_gale_charge', 'hud-art-img'),
  holy_shield: hudImg('banner_holy_shield', 'hud-art-img'),
  star_carnival: hudImg('banner_star_carnival', 'hud-art-img'),
};

export const RELIC_BANNER_INLINE_ART: Record<RelicBannerId, string> = {
  gale_charge: hudImgV19('banner_gale_charge', 'inline-art-img'),
  holy_shield: hudImgV19('banner_holy_shield', 'inline-art-img'),
  star_carnival: hudImgV19('banner_star_carnival', 'inline-art-img'),
};

/**
 * MC-11: Bobo Squad Pet Companion Dock (果冻泡泡水母 / 盾壳小海龟 / 闪电小海马) 256x256 RGBA art.
 */
export const PET_COMPANION_ICON_URL: Record<PetCompanionId, string> = {
  jelly_puff: '/assets/icons/pet_jelly_puff.png?v=33',
  shell_turtle: '/assets/icons/pet_shell_turtle.png?v=33',
  spark_seahorse: '/assets/icons/pet_spark_seahorse.png?v=33',
};

export const PET_COMPANION_ART: Record<PetCompanionId, string> = {
  jelly_puff: finishImgV21('pet_jelly_puff', 'finish-art-img'),
  shell_turtle: finishImgV21('pet_shell_turtle', 'finish-art-img'),
  spark_seahorse: finishImgV21('pet_spark_seahorse', 'finish-art-img'),
};

export const PET_COMPANION_HUD_ART: Record<PetCompanionId, string> = {
  jelly_puff: hudImg('pet_jelly_puff', 'hud-art-img'),
  shell_turtle: hudImg('pet_shell_turtle', 'hud-art-img'),
  spark_seahorse: hudImg('pet_spark_seahorse', 'hud-art-img'),
};

export const PET_COMPANION_INLINE_ART: Record<PetCompanionId, string> = {
  jelly_puff: hudImgV19('pet_jelly_puff', 'inline-art-img'),
  shell_turtle: hudImgV19('pet_shell_turtle', 'inline-art-img'),
  spark_seahorse: hudImgV19('pet_spark_seahorse', 'inline-art-img'),
};

/**
 * MC-12: Honor Trophy Hall — each trophy reuses the 256x256 RGBA art of the currency/mode it commemorates
 * (战役 ui_trophy, 发条核心, 飞艇徽章, 列车金章, 深海珍珠, 冰晶奖章).
 */
const HALL_TROPHY_FILE: Record<HallTrophyId, string> = {
  campaign_star: 'ui_trophy',
  clockwork_core: 'ui_clockwork_core',
  airship_medal: 'ui_airship_wing_medal',
  train_medal: 'ui_train_gold_medal',
  deep_pearl: 'ui_deep_pearl',
  ice_medal: 'ui_ice_medal',
  lava_core: 'ui_lava_core',
  stardust_badge: 'ui_stardust_badge',
  pumpkin_badge: 'ui_pumpkin_badge',
  scarab_badge: 'ui_scarab_badge',
  emerald_idol_badge: 'ui_emerald_idol_badge',
};

export const HALL_TROPHY_ICON_URL: Record<HallTrophyId, string> = {
  campaign_star: `/assets/icons/${HALL_TROPHY_FILE.campaign_star}.png?v=33`,
  clockwork_core: `/assets/icons/${HALL_TROPHY_FILE.clockwork_core}.png?v=33`,
  airship_medal: `/assets/icons/${HALL_TROPHY_FILE.airship_medal}.png?v=33`,
  train_medal: `/assets/icons/${HALL_TROPHY_FILE.train_medal}.png?v=33`,
  deep_pearl: `/assets/icons/${HALL_TROPHY_FILE.deep_pearl}.png?v=33`,
  ice_medal: `/assets/icons/${HALL_TROPHY_FILE.ice_medal}.png?v=33`,
  lava_core: `/assets/icons/${HALL_TROPHY_FILE.lava_core}.png?v=33`,
  stardust_badge: `/assets/icons/${HALL_TROPHY_FILE.stardust_badge}.png?v=33`,
  pumpkin_badge: `/assets/icons/${HALL_TROPHY_FILE.pumpkin_badge}.png?v=33`,
  scarab_badge: `/assets/icons/${HALL_TROPHY_FILE.scarab_badge}.png?v=33`,
  emerald_idol_badge: `/assets/icons/${HALL_TROPHY_FILE.emerald_idol_badge}.png?v=33`,
};

export const HALL_TROPHY_INLINE_ART: Record<HallTrophyId, string> = {
  campaign_star: hudImgV19(HALL_TROPHY_FILE.campaign_star, 'inline-art-img'),
  clockwork_core: hudImgV19(HALL_TROPHY_FILE.clockwork_core, 'inline-art-img'),
  airship_medal: hudImgV19(HALL_TROPHY_FILE.airship_medal, 'inline-art-img'),
  train_medal: hudImgV19(HALL_TROPHY_FILE.train_medal, 'inline-art-img'),
  deep_pearl: hudImgV19(HALL_TROPHY_FILE.deep_pearl, 'inline-art-img'),
  ice_medal: hudImgV19(HALL_TROPHY_FILE.ice_medal, 'inline-art-img'),
  lava_core: hudImgV19(HALL_TROPHY_FILE.lava_core, 'inline-art-img'),
  stardust_badge: hudImgV19(HALL_TROPHY_FILE.stardust_badge, 'inline-art-img'),
  pumpkin_badge: hudImgV19(HALL_TROPHY_FILE.pumpkin_badge, 'inline-art-img'),
  scarab_badge: hudImgV19(HALL_TROPHY_FILE.scarab_badge, 'inline-art-img'),
  emerald_idol_badge: hudImgV19(HALL_TROPHY_FILE.emerald_idol_badge, 'inline-art-img'),
};

/**
 * MC-13: Bobo Squad Skin Gacha Machine — every skin card uses the shared capsule art (hue-shifted per skin in CSS);
 * the 传说 王冠 skin uses the crown art.
 */
export const GACHA_CAPSULE_ICON_URL = '/assets/icons/skin_capsule.png?v=33';
export const GACHA_CROWN_ICON_URL = '/assets/icons/skin_crown.png?v=33';
export const GACHA_MACHINE_ICON_URL = '/assets/icons/gacha_machine.png?v=33';

/**
 * MC-14: Bobo Squad Themed Lobby Decoration Hall — theme cards share the lobby_theme art (hue-shifted per theme in CSS);
 * the lamp / plant props have their own art, the banner reuses the 星光嘉年华 banner art and the globe the 星尘徽章 art.
 */
export const DECOR_THEME_ICON_URL = '/assets/icons/lobby_theme.png?v=33';
export const DECOR_LAMP_ICON_URL = '/assets/icons/decor_lamp.png?v=33';
export const DECOR_PLANT_ICON_URL = '/assets/icons/decor_plant.png?v=33';
export const DECOR_BANNER_ICON_URL = '/assets/icons/banner_star_carnival.png?v=33';
export const STARDUST_BADGE_ICON_URL = '/assets/icons/ui_stardust_badge.png?v=33';

/**
 * MC-15: Haunted Castle Pumpkin Night & Bobo Squad Tactic Deck — the three tactic-card families share one card art each
 * (护盾卡 card_shield / 冲锋卡 card_rush / 人海卡 card_crowd).
 */
export const PUMPKIN_NIGHT_ICON_URL = '/assets/icons/ui_pumpkin_night.png?v=33';
export const PUMPKIN_BADGE_ICON_URL = '/assets/icons/ui_pumpkin_badge.png?v=33';
export const GHOST_ICON_URL = '/assets/icons/ghost.png?v=33';
export const TACTIC_DECK_ICON_URL = '/assets/icons/ui_tactic_deck.png?v=33';
export const TACTIC_CARD_ICON_URL: Record<TacticCategory, string> = {
  shield: '/assets/icons/card_shield.png?v=33',
  rush: '/assets/icons/card_rush.png?v=33',
  crowd: '/assets/icons/card_crowd.png?v=33',
};

/**
 * MC-16: Desert Pyramid Trap Run (lobby card / 圣甲虫徽章 / quicksand & flip-slab traps) and the tactic deck balance badge
 * (main-campaign effect coefficient).
 */
export const PYRAMID_RUN_ICON_URL = '/assets/icons/ui_pyramid_run.png?v=33';
export const SCARAB_BADGE_ICON_URL = '/assets/icons/ui_scarab_badge.png?v=33';
export const QUICKSAND_ICON_URL = '/assets/icons/quicksand_trap.png?v=33';
export const FLIP_SLAB_ICON_URL = '/assets/icons/flip_slab.png?v=33';
export const TACTIC_BALANCE_ICON_URL = '/assets/icons/tactic_balance.png?v=33';

/**
 * MC-17: Jungle Temple Vine Swing (lobby card / 翡翠神像徽章 / vine swing & rolling boulder traps). These four files are
 * stand-in copies of existing approved art (decor_plant / skin_emerald / env_tailwind_belt / ui_barrel) made while the
 * image quota was exhausted; the jungle screens never show them next to their originals.
 */
export const JUNGLE_SWING_ICON_URL = '/assets/icons/ui_jungle_temple.png?v=33';
export const EMERALD_IDOL_ICON_URL = '/assets/icons/ui_emerald_idol_badge.png?v=33';
export const VINE_SWING_ICON_URL = '/assets/icons/vine_swing.png?v=33';
export const ROLLING_BOULDER_ICON_URL = '/assets/icons/rolling_boulder.png?v=33';

/**
 * 100% AI-Generated Hand-Painted Raster Game Art Badges & Micro-Illustrations
 * Zero inline SVGs or raw Unicode emojis anywhere in the UI.
 */
export const UI_ART = {
  trophy: hudImg('ui_trophy', 'inline-art-img'),
  barrel: hudImg('ui_barrel', 'inline-art-img'),
  lootbug: hudImg('ui_lootbug', 'inline-art-img'),
  gift: hudImg('ui_gift', 'inline-art-img'),
  hammer: hudImg('hud_hammer', 'inline-art-img'),
  pyro: hudImg('hud_pyro', 'inline-art-img'),
  aegis: hudImg('hud_aegis', 'inline-art-img'),

  star: hudImg('ui_star', 'inline-art-img'),
  coin: hudImg('ui_coin', 'inline-art-img'),
  crown: hudImg('ui_crown', 'inline-art-img'),
  lock: hudImg('ui_lock', 'inline-art-img'),
  check: hudImg('ui_check', 'inline-art-img'),
  arrowUp: hudImg('ui_arrow_up', 'inline-art-img'),
  refresh: hudImg('ui_refresh', 'inline-art-img'),
  dice: hudImg('ui_dice', 'inline-art-img'),
  palette: hudImg('ui_palette', 'inline-art-img'),
  camera: hudImg('ui_camera', 'inline-art-img'),
  soundOn: hudImg('ui_sound_on', 'inline-art-img'),
  soundOff: hudImg('ui_sound_off', 'inline-art-img'),
  home: hudImg('ui_home', 'inline-art-img'),
  play: hudImg('ui_play', 'inline-art-img'),
  pause: hudImg('ui_pause', 'inline-art-img'),
  rocket: hudImg('ui_rocket', 'inline-art-img'),
  medal1: hudImg('ui_medal1', 'inline-art-img'),
  medal2: hudImg('ui_medal2', 'inline-art-img'),
  medal3: hudImg('ui_medal3', 'inline-art-img'),
  clock: hudImg('ui_clock', 'inline-art-img'),
  edit: hudImg('ui_edit', 'inline-art-img'),
  share: hudImg('ui_share', 'inline-art-img'),
  shard: hudImg('ui_shard', 'inline-art-img'),
  sparkle: hudImg('ui_sparkle', 'inline-art-img'),
  warning: hudImg('ui_warning', 'inline-art-img'),
  flame: hudImg('ui_flame', 'inline-art-img'),
  sword: hudImg('ui_sword', 'inline-art-img'),
  shield: hudImg('ui_shield', 'inline-art-img'),
  bolt: hudImg('ui_bolt', 'inline-art-img'),
  oil: hudImg('ui_barrel', 'inline-art-img'),
  belt: hudImg('meta_thruster', 'inline-art-img'),
  spring: hudImg('meta_capacitor', 'inline-art-img'),
  heart: hudImg('ui_heart', 'inline-art-img'),
  brokenHeart: hudImg('ui_broken_heart', 'inline-art-img'),
  gear: hudImg('ui_gear', 'inline-art-img'),
  note: hudImg('hud_music_note', 'inline-art-img'),
  megaphone: hudImg('ui_megaphone', 'inline-art-img'),
  boom: hudImg('ui_boom', 'inline-art-img'),
  candyVault: hudImgV19('ui_candy_vault', 'inline-art-img'),
  endlessShield: hudImgV19('ui_endless_shield', 'inline-art-img'),
  endlessMedal: hudImgV19('ui_endless_medal', 'inline-art-img'),
  weaponScatter: rootAssetImgV20('icon_weapon_scatter', 'inline-art-img'),
  weaponRainbow: rootAssetImgV20('icon_weapon_rainbow', 'inline-art-img'),
  tacticalAirdrop: rootAssetImgV20('icon_tactical_airdrop', 'inline-art-img'),
  escortCart: hudImgV19('ui_escort_cart', 'inline-art-img'),
  barricade: hudImgV19('ui_barricade', 'inline-art-img'),
  finishCandy: hudImgV19('finish_candy_gloss', 'inline-art-img'),
  finishBrass: hudImgV19('finish_brass_steam', 'inline-art-img'),
  finishCrystal: hudImgV19('finish_crystal_jelly', 'inline-art-img'),
  finishPrism: hudImgV19('finish_starlight_prism', 'inline-art-img'),
  mechaOverlord: hudImgV19('ui_mecha_overlord', 'inline-art-img'),
  mechaOverlordHud: hudImg('ui_mecha_overlord', 'hud-art-img'),
  mechaOverlordArt: finishImgV21('ui_mecha_overlord', 'finish-art-img'),
  mechaCore: hudImgV19('meta_mecha_core', 'inline-art-img'),
  mechaCoreArt: finishImgV21('meta_mecha_core', 'finish-art-img'),
  envTailwind: hudImgV19('env_tailwind_belt', 'inline-art-img'),
  envEmp: hudImgV19('env_emp_zone', 'inline-art-img'),
  envFrosting: hudImgV19('env_frosting_pad', 'inline-art-img'),
  gearTournament: hudImgV19('ui_gear_tournament', 'inline-art-img'),
  gearTournamentArt: finishImgV21('ui_gear_tournament', 'finish-art-img'),
  tournamentChest: hudImgV19('ui_tournament_chest', 'inline-art-img'),
  tournamentChestArt: finishImgV21('ui_tournament_chest', 'finish-art-img'),
  subwpnElectroNet: hudImgV19('subwpn_electro_net', 'inline-art-img'),
  subwpnSyrupBubble: hudImgV19('subwpn_syrup_bubble', 'inline-art-img'),
  subwpnRallyHorn: hudImgV19('subwpn_rally_horn', 'inline-art-img'),
  clockworkColossus: hudImgV19('ui_clockwork_colossus', 'inline-art-img'),
  clockworkColossusArt: finishImgV21('ui_clockwork_colossus', 'finish-art-img'),
  clockworkCore: hudImgV19('ui_clockwork_core', 'inline-art-img'),
  clockworkCoreArt: finishImgV21('ui_clockwork_core', 'finish-art-img'),
  techVanguard: hudImgV19('tech_vanguard_charge', 'inline-art-img'),
  techHeavySiege: hudImgV19('tech_heavy_siege', 'inline-art-img'),
  techCandyBombard: hudImgV19('tech_candy_bombard', 'inline-art-img'),
  airshipEscort: hudImgV19('ui_airship_escort', 'inline-art-img'),
  airshipEscortHud: hudImg('ui_airship_escort', 'hud-art-img'),
  airshipEscortArt: finishImgV21('ui_airship_escort', 'finish-art-img'),
  airshipWingMedal: hudImgV19('ui_airship_wing_medal', 'inline-art-img'),
  airshipWingMedalArt: finishImgV21('ui_airship_wing_medal', 'finish-art-img'),
  modOverdrive: hudImgV19('mod_overdrive_breech', 'inline-art-img'),
  modPrism: hudImgV19('mod_prism_splitter', 'inline-art-img'),
  modHeavyMortar: hudImgV19('mod_heavy_mortar', 'inline-art-img'),
  candyTrainRaid: hudImgV19('ui_candy_train_raid', 'inline-art-img'),
  candyTrainRaidHud: hudImg('ui_candy_train_raid', 'hud-art-img'),
  candyTrainRaidArt: finishImgV21('ui_candy_train_raid', 'finish-art-img'),
  trainGoldMedal: hudImgV19('ui_train_gold_medal', 'inline-art-img'),
  trainGoldMedalArt: finishImgV21('ui_train_gold_medal', 'finish-art-img'),
  bannerGale: hudImgV19('banner_gale_charge', 'inline-art-img'),
  bannerHolyShield: hudImgV19('banner_holy_shield', 'inline-art-img'),
  bannerStarCarnival: hudImgV19('banner_star_carnival', 'inline-art-img'),
  submarineRescue: hudImgV19('ui_submarine_rescue', 'inline-art-img'),
  submarineRescueHud: hudImg('ui_submarine_rescue', 'hud-art-img'),
  submarineRescueArt: finishImgV21('ui_submarine_rescue', 'finish-art-img'),
  deepPearl: hudImgV19('ui_deep_pearl', 'inline-art-img'),
  deepPearlArt: finishImgV21('ui_deep_pearl', 'finish-art-img'),
  petJellyPuff: hudImgV19('pet_jelly_puff', 'inline-art-img'),
  petShellTurtle: hudImgV19('pet_shell_turtle', 'inline-art-img'),
  petSparkSeahorse: hudImgV19('pet_spark_seahorse', 'inline-art-img'),
  glacierSled: hudImgV19('ui_glacier_sled', 'inline-art-img'),
  glacierSledHud: hudImg('ui_glacier_sled', 'hud-art-img'),
  glacierSledArt: finishImgV21('ui_glacier_sled', 'finish-art-img'),
  iceMedal: hudImgV19('ui_ice_medal', 'inline-art-img'),
  iceMedalArt: finishImgV21('ui_ice_medal', 'finish-art-img'),
  trophyHall: hudImgV19('trophy_hall', 'inline-art-img'),
  trophyHallArt: finishImgV21('trophy_hall', 'finish-art-img'),
  trophyGoldCup: hudImgV19('trophy_gold_cup', 'inline-art-img'),
  trophyGoldCupArt: finishImgV21('trophy_gold_cup', 'finish-art-img'),
  displayPedestal: hudImgV19('display_pedestal', 'inline-art-img'),
  displayPedestalArt: finishImgV21('display_pedestal', 'finish-art-img'),
  lavaJump: hudImgV19('ui_lava_jump', 'inline-art-img'),
  lavaJumpHud: hudImg('ui_lava_jump', 'hud-art-img'),
  lavaJumpArt: finishImgV21('ui_lava_jump', 'finish-art-img'),
  lavaCore: hudImgV19('ui_lava_core', 'inline-art-img'),
  lavaCoreArt: finishImgV21('ui_lava_core', 'finish-art-img'),
  gachaMachine: hudImgV19('gacha_machine', 'inline-art-img'),
  gachaMachineArt: finishImgV21('gacha_machine', 'finish-art-img'),
  skinCapsule: hudImgV19('skin_capsule', 'inline-art-img'),
  skinCrown: hudImgV19('skin_crown', 'inline-art-img'),
  asteroidDash: hudImgV19('ui_asteroid_dash', 'inline-art-img'),
  asteroidDashHud: hudImg('ui_asteroid_dash', 'hud-art-img'),
  asteroidDashArt: finishImgV21('ui_asteroid_dash', 'finish-art-img'),
  stardustBadge: hudImgV19('ui_stardust_badge', 'inline-art-img'),
  stardustBadgeArt: finishImgV21('ui_stardust_badge', 'finish-art-img'),
  lobbyTheme: hudImgV19('lobby_theme', 'inline-art-img'),
  lobbyThemeArt: finishImgV21('lobby_theme', 'finish-art-img'),
  decorLamp: hudImgV19('decor_lamp', 'inline-art-img'),
  decorPlant: hudImgV19('decor_plant', 'inline-art-img'),
  pumpkinNight: hudImgV19('ui_pumpkin_night', 'inline-art-img'),
  pumpkinNightArt: finishImgV21('ui_pumpkin_night', 'finish-art-img'),
  pumpkinBadge: hudImgV19('ui_pumpkin_badge', 'inline-art-img'),
  pumpkinBadgeArt: finishImgV21('ui_pumpkin_badge', 'finish-art-img'),
  ghost: hudImgV19('ghost', 'inline-art-img'),
  tacticDeck: hudImgV19('ui_tactic_deck', 'inline-art-img'),
  tacticDeckArt: finishImgV21('ui_tactic_deck', 'finish-art-img'),
  cardShield: hudImgV19('card_shield', 'inline-art-img'),
  cardRush: hudImgV19('card_rush', 'inline-art-img'),
  cardCrowd: hudImgV19('card_crowd', 'inline-art-img'),
  pyramidRun: hudImgV19('ui_pyramid_run', 'inline-art-img'),
  pyramidRunArt: finishImgV21('ui_pyramid_run', 'finish-art-img'),
  scarabBadge: hudImgV19('ui_scarab_badge', 'inline-art-img'),
  scarabBadgeArt: finishImgV21('ui_scarab_badge', 'finish-art-img'),
  quicksand: hudImgV19('quicksand_trap', 'inline-art-img'),
  flipSlab: hudImgV19('flip_slab', 'inline-art-img'),
  tacticBalance: hudImgV19('tactic_balance', 'inline-art-img'),
  jungleSwing: hudImgV19('ui_jungle_temple', 'inline-art-img'),
  jungleSwingArt: finishImgV21('ui_jungle_temple', 'finish-art-img'),
  emeraldIdol: hudImgV19('ui_emerald_idol_badge', 'inline-art-img'),
  emeraldIdolArt: finishImgV21('ui_emerald_idol_badge', 'finish-art-img'),
  vineSwing: hudImgV19('vine_swing', 'inline-art-img'),
  rollingBoulder: hudImgV19('rolling_boulder', 'inline-art-img'),
};

/**
 * 5 Defeat Affliction Debuff Illustrations
 */
export const DEBUFF_ART: Record<DebuffId, string> = {
  barrel_overheat: UI_ART.flame,
  gene_instability: UI_ART.warning,
  shield_fracture: UI_ART.brokenHeart,
  reactor_leak: UI_ART.soundOff,
  cryo_sludge: UI_ART.oil,
};

const EMOJI_TO_ART_MAP: Array<[string, string]> = [
  ['👑', UI_ART.crown],
  ['🏆', UI_ART.trophy],
  ['🎁', UI_ART.gift],
  ['🧨', UI_ART.barrel],
  ['💰', UI_ART.lootbug],
  ['🪙', UI_ART.coin],
  ['⭐', UI_ART.star],
  ['🌟', UI_ART.star],
  ['★', UI_ART.star],
  ['🔒', UI_ART.lock],
  ['✅', UI_ART.check],
  ['✔', UI_ART.check],
  ['⬆️', UI_ART.arrowUp],
  ['🔄', UI_ART.refresh],
  ['🎲', UI_ART.dice],
  ['🎨', UI_ART.palette],
  ['🎥', UI_ART.camera],
  ['🔊', UI_ART.soundOn],
  ['🔇', UI_ART.soundOff],
  ['🏠', UI_ART.home],
  ['▶️', UI_ART.play],
  ['🚀', UI_ART.rocket],
  ['🥇', UI_ART.medal1],
  ['🥈', UI_ART.medal2],
  ['🥉', UI_ART.medal3],
  ['⏱️', UI_ART.clock],
  ['⏳', UI_ART.clock],
  ['✏️', UI_ART.edit],
  ['📤', UI_ART.share],
  ['🧩', UI_ART.shard],
  ['✨', UI_ART.sparkle],
  ['🎉', UI_ART.sparkle],
  ['🎊', UI_ART.sparkle],
  ['⚠️', UI_ART.warning],
  ['🔥', UI_ART.flame],
  ['⚔️', UI_ART.sword],
  ['🛡️', UI_ART.shield],
  ['🏰', UI_ART.shield],
  ['⚡', UI_ART.bolt],
  ['🛢️', UI_ART.oil],
  ['⏩', UI_ART.belt],
  ['💖', UI_ART.heart],
  ['💔', UI_ART.brokenHeart],
  ['💸', UI_ART.coin],
  ['⚙️', UI_ART.gear],
  ['🛠️', UI_ART.gear],
  ['🎵', UI_ART.note],
  ['🎶', UI_ART.note],
  ['🎆', UI_ART.pyro],
  ['📢', UI_ART.megaphone],
  ['💥', UI_ART.boom],
  ['☄️', UI_ART.flame],
  ['👹', UI_ART.warning],
  ['🌊', UI_ART.sparkle],
  ['🗿', UI_ART.shield],
  ['🎯', UI_ART.star],
  ['🫧', RACE_MASCOT_ART.swarm],
  ['💧', RACE_MASCOT_ART.swarm],
  ['🍮', RACE_MASCOT_ART.titan],
  ['🎀', RACE_MASCOT_ART.gate],
  ['🍪', RACE_MASCOT_ART.bastion],
];

/**
 * Replaces raw Unicode emoji characters in any UI or popup string with inline 2D game art icons.
 */
export function replaceEmojiWithArt(input: string): string {
  let out = input;
  for (const [emoji, art] of EMOJI_TO_ART_MAP) {
    if (out.includes(emoji)) {
      out = out.split(emoji).join(art);
    }
  }
  return out;
}
