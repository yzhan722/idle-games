import type {
  BuffId,
  DebuffId,
  MechaMode,
  MetaUpgradeId,
  SkillBranchId,
  SkillNodeId,
  SkinId,
} from './State';

const skillImg = (id: string): string =>
  `<img class="art-icon-img skill-art-img" src="/assets/icons/${id}.png?v=16" alt="" loading="eager" decoding="async" draggable="false" />`;

const raceImg = (id: string, cls = 'race-art-img'): string =>
  `<img class="art-icon-img ${cls}" src="/assets/icons/race_${id}.png?v=16" alt="" loading="eager" decoding="async" draggable="false" />`;

const metaImg = (id: string): string =>
  `<img class="art-icon-img meta-art-img" src="/assets/icons/${id}.png?v=16" alt="" loading="eager" decoding="async" draggable="false" />`;

const hudImg = (file: string, cls = 'hud-art-img'): string =>
  `<img class="art-icon-img ${cls}" src="/assets/icons/${file}.png?v=16" alt="" loading="eager" decoding="async" draggable="false" />`;

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
