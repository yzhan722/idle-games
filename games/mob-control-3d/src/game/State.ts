import { SkinPalette } from './HumanoidModels';
import { ThemeId } from './SceneThemes';
import {
  BOBO_TECH_ART,
  BOBO_TECH_HUD_ART,
  BOBO_TECH_INLINE_ART,
  CANNON_MOD_ART,
  CANNON_MOD_HUD_ART,
  CANNON_MOD_INLINE_ART,
  DEBUFF_ART,
  MECHA_MODE_ART,
  META_UPGRADE_ART,
  PET_COMPANION_ART,
  PET_COMPANION_HUD_ART,
  PET_COMPANION_ICON_URL,
  PET_COMPANION_INLINE_ART,
  HALL_TROPHY_ICON_URL,
  HALL_TROPHY_INLINE_ART,
  GACHA_CAPSULE_ICON_URL,
  GACHA_CROWN_ICON_URL,
  DECOR_BANNER_ICON_URL,
  DECOR_LAMP_ICON_URL,
  DECOR_PLANT_ICON_URL,
  DECOR_THEME_ICON_URL,
  STARDUST_BADGE_ICON_URL,
  TACTIC_CARD_ICON_URL,
  RACE_MASCOT_ART,
  RELIC_BANNER_ART,
  RELIC_BANNER_HUD_ART,
  RELIC_BANNER_ICON_URL,
  RELIC_BANNER_INLINE_ART,
  REWARD_BUFF_ART,
  SKILL_NODE_SVGS,
  TACTICAL_SUBWEAPON_ART,
  TACTICAL_SUBWEAPON_HUD_ART,
  TACTICAL_SUBWEAPON_INLINE_ART,
  UI_ART,
  WEAPON_MODE_ART,
} from './SkillIcons';

export type WeaponMode = 'gatling' | 'twin' | 'plasma' | 'scatter' | 'rainbow';

export type MechaMode = 'hammer' | 'pyro' | 'aegis';

export type TacticalSubWeaponId = 'electro_net' | 'syrup_bubble' | 'rally_horn';

export type TournamentStageId = 1 | 2 | 3;

export type BoboTechBranchId = 'vanguard_charge' | 'heavy_siege' | 'candy_bombard';

export type CannonCoreModId = 'overdrive_breech' | 'prism_splitter' | 'heavy_mortar';

export const CANNON_CORE_MOD_ORDER: CannonCoreModId[] = [
  'overdrive_breech',
  'prism_splitter',
  'heavy_mortar',
];

export const CANNON_CORE_MOD_MAX_LEVEL = 5;

export interface CannonCoreModSpec {
  id: CannonCoreModId;
  icon: string;
  hudIcon: string;
  inlineIcon: string;
  name: string;
  shortName: string;
  subtitle: string;
  desc: string;
  accentColor: string;
  medalCosts: [number, number, number, number, number];
  goldCosts: [number, number, number, number, number];
  maxLevel: number;
  statText: (lvl: number) => string;
}

export const CANNON_CORE_MODS: Record<CannonCoreModId, CannonCoreModSpec> = {
  overdrive_breech: {
    id: 'overdrive_breech',
    icon: CANNON_MOD_ART.overdrive_breech,
    hudIcon: CANNON_MOD_HUD_ART.overdrive_breech,
    inlineIcon: CANNON_MOD_INLINE_ART.overdrive_breech,
    name: '过载双发膛',
    shortName: '双发膛',
    subtitle: '双联汽缸 · 基础提速 · 高频双连点射',
    desc: '强化蒸汽母炮基础连发韵律，并每隔数发触发一次高速双发连点脉冲弹幕',
    accentColor: '#f59e0b',
    medalCosts: [2, 3, 4, 5, 7],
    goldCosts: [380, 620, 920, 1320, 1820],
    maxLevel: CANNON_CORE_MOD_MAX_LEVEL,
    statText: (lvl) => {
      const eff = Math.max(1, lvl);
      const firePct = 6 + (eff - 1) * 3;
      const everyShots = Math.max(2, 4 - Math.floor(eff / 2));
      const tapCount = eff >= 4 ? 3 : 2;
      return `基础射速+${firePct}% · 每${everyShots}发触发${tapCount}连急促点射`;
    },
  },
  prism_splitter: {
    id: 'prism_splitter',
    icon: CANNON_MOD_ART.prism_splitter,
    hudIcon: CANNON_MOD_HUD_ART.prism_splitter,
    inlineIcon: CANNON_MOD_INLINE_ART.prism_splitter,
    name: '棱镜散射镜',
    shortName: '棱镜镜',
    subtitle: '虹光折射 · 扇面双三裂 · 超能充能体',
    desc: '炮口加装星彩水晶棱镜，每隔数发折射出带倾角的双生/三联棱镜充能波波兵',
    accentColor: '#38bdf8',
    medalCosts: [2, 3, 4, 5, 7],
    goldCosts: [420, 660, 960, 1360, 1860],
    maxLevel: CANNON_CORE_MOD_MAX_LEVEL,
    statText: (lvl) => {
      const eff = Math.max(1, lvl);
      const everyShots = Math.max(2, 4 - Math.floor(eff / 2));
      const splitCount = eff >= 3 ? 3 : 2;
      const dmgPct = 15 + eff * 6;
      return `每${everyShots}发折射${splitCount}枚棱镜充能波波 · 棱镜伤害+${dmgPct}%`;
    },
  },
  heavy_mortar: {
    id: 'heavy_mortar',
    icon: CANNON_MOD_ART.heavy_mortar,
    hudIcon: CANNON_MOD_HUD_ART.heavy_mortar,
    inlineIcon: CANNON_MOD_INLINE_ART.heavy_mortar,
    name: '蓄能重炮管',
    shortName: '重炮管',
    subtitle: '液压套筒 · 巨型重甲兵 · 轰塔破城震波',
    desc: '每隔数发抛射一枚披挂护盾的巨型重装迫击波波，落地引发破城震波并对敌塔造成高额伤害',
    accentColor: '#f43f5e',
    medalCosts: [2, 3, 4, 5, 7],
    goldCosts: [440, 680, 980, 1400, 1900],
    maxLevel: CANNON_CORE_MOD_MAX_LEVEL,
    statText: (lvl) => {
      const eff = Math.max(1, lvl);
      const everyShots = Math.max(3, 5 - Math.floor(eff / 2));
      const siegePct = 65 + eff * 18;
      return `每${everyShots}发抛射重装巨型波波 · 对塔与攻城伤害+${siegePct}%`;
    },
  },
};

// ============================================================================
// MC-10: Bobo Squad Relic Banner Stand (波波战队圣物战旗台)
// ============================================================================

export type RelicBannerId = 'gale_charge' | 'holy_shield' | 'star_carnival';

export const RELIC_BANNER_ORDER: RelicBannerId[] = ['gale_charge', 'holy_shield', 'star_carnival'];

export const RELIC_BANNER_MAX_LEVEL = 5;

export interface RelicBannerSpec {
  id: RelicBannerId;
  icon: string;
  hudIcon: string;
  inlineIcon: string;
  iconUrl: string;
  name: string;
  shortName: string;
  subtitle: string;
  desc: string;
  accentColor: string;
  accentHex: number;
  medalCosts: [number, number, number, number, number];
  goldCosts: [number, number, number, number, number];
  maxLevel: number;
  statText: (lvl: number) => string;
}

/** Pure per-level banner numbers (aura radius excludes the 列车金章 milestone multiplier). */
export function computeRelicBannerNumbers(id: RelicBannerId, lvl: number): {
  moveSpeedMult: number;
  surgeIntervalSec: number;
  surgeDurationSec: number;
  surgeSpeedMult: number;
  surgeDmgMult: number;
  hpMult: number;
  auraDmgReduction: number;
  shieldEveryNth: number;
  goldMult: number;
  critChance: number;
  critMult: number;
  baseAuraRadius: number;
} {
  const on = lvl >= 1;
  const eff = Math.max(1, Math.min(RELIC_BANNER_MAX_LEVEL, Math.floor(lvl)));
  const isGale = on && id === 'gale_charge';
  const isShield = on && id === 'holy_shield';
  const isStar = on && id === 'star_carnival';
  return {
    moveSpeedMult: isGale ? 1.06 + (eff - 1) * 0.03 : 1.0,
    surgeIntervalSec: isGale ? 10 - eff : 0,
    surgeDurationSec: isGale ? 2.0 + eff * 0.2 : 0,
    surgeSpeedMult: isGale ? 1.3 + eff * 0.04 : 1.0,
    surgeDmgMult: isGale ? 1.15 + eff * 0.05 : 1.0,
    hpMult: isShield ? 1.08 + (eff - 1) * 0.05 : 1.0,
    auraDmgReduction: isShield ? 0.08 + (eff - 1) * 0.04 : 0,
    shieldEveryNth: isShield ? Math.max(4, 8 - eff) : 0,
    goldMult: isStar ? 1.08 + (eff - 1) * 0.05 : 1.0,
    critChance: isStar ? 0.08 + (eff - 1) * 0.04 : 0,
    critMult: isStar ? 1.8 + eff * 0.1 : 1.0,
    baseAuraRadius: on ? 4.6 + eff * 0.35 : 0,
  };
}

export const RELIC_BANNERS: Record<RelicBannerId, RelicBannerSpec> = {
  gale_charge: {
    id: 'gale_charge',
    icon: RELIC_BANNER_ART.gale_charge,
    hudIcon: RELIC_BANNER_HUD_ART.gale_charge,
    inlineIcon: RELIC_BANNER_INLINE_ART.gale_charge,
    iconUrl: RELIC_BANNER_ICON_URL.gale_charge,
    name: '疾风冲锋旗',
    shortName: '疾风旗',
    subtitle: '迅捷 · 冲锋号角 · 光环内周期疾风突进',
    desc: '战旗插在波波大军中央：全军移速提升，并周期吹响疾风冲锋号，光环内波波短时间爆发移速与近战伤害',
    accentColor: '#2dd4bf',
    accentHex: 0x2dd4bf,
    medalCosts: [2, 3, 4, 5, 7],
    goldCosts: [400, 650, 950, 1350, 1850],
    maxLevel: RELIC_BANNER_MAX_LEVEL,
    statText: (lvl) => {
      const n = computeRelicBannerNumbers('gale_charge', Math.max(1, lvl));
      return `全军移速+${Math.round((n.moveSpeedMult - 1) * 100)}% · 每${n.surgeIntervalSec}s冲锋${n.surgeDurationSec.toFixed(1)}s · 光环内移速+${Math.round((n.surgeSpeedMult - 1) * 100)}% 伤害+${Math.round((n.surgeDmgMult - 1) * 100)}%`;
    },
  },
  holy_shield: {
    id: 'holy_shield',
    icon: RELIC_BANNER_ART.holy_shield,
    hudIcon: RELIC_BANNER_HUD_ART.holy_shield,
    inlineIcon: RELIC_BANNER_INLINE_ART.holy_shield,
    iconUrl: RELIC_BANNER_ICON_URL.holy_shield,
    name: '圣盾守护旗',
    shortName: '圣盾旗',
    subtitle: '坚韧 · 圣盾光环 · 周期赐予护盾',
    desc: '圣盾战旗守护波波方阵：全军生命提升，光环内受到的伤害降低，并每隔数只出兵赐予一层冰晶护盾',
    accentColor: '#60a5fa',
    accentHex: 0x60a5fa,
    medalCosts: [2, 3, 4, 5, 7],
    goldCosts: [420, 680, 980, 1380, 1880],
    maxLevel: RELIC_BANNER_MAX_LEVEL,
    statText: (lvl) => {
      const n = computeRelicBannerNumbers('holy_shield', Math.max(1, lvl));
      return `全军生命+${Math.round((n.hpMult - 1) * 100)}% · 光环内减伤${Math.round(n.auraDmgReduction * 100)}% · 每${n.shieldEveryNth}只出兵赐护盾`;
    },
  },
  star_carnival: {
    id: 'star_carnival',
    icon: RELIC_BANNER_ART.star_carnival,
    hudIcon: RELIC_BANNER_HUD_ART.star_carnival,
    inlineIcon: RELIC_BANNER_INLINE_ART.star_carnival,
    iconUrl: RELIC_BANNER_ICON_URL.star_carnival,
    name: '星耀狂欢旗',
    shortName: '星耀旗',
    subtitle: '财富 · 星耀暴击 · 金币狂欢',
    desc: '星耀狂欢战旗点亮全场：全部金币收益提升，光环内波波近战与破车攻击概率触发星耀暴击',
    accentColor: '#e879f9',
    accentHex: 0xe879f9,
    medalCosts: [2, 3, 4, 5, 7],
    goldCosts: [440, 700, 1000, 1400, 1900],
    maxLevel: RELIC_BANNER_MAX_LEVEL,
    statText: (lvl) => {
      const n = computeRelicBannerNumbers('star_carnival', Math.max(1, lvl));
      return `金币收益+${Math.round((n.goldMult - 1) * 100)}% · 光环内暴击率${Math.round(n.critChance * 100)}% · 暴击x${n.critMult.toFixed(1)}`;
    },
  },
};

// ============================================================================
// MC-11: Bobo Squad Pet Companion Dock (波波战队萌宠伙伴坞)
// ============================================================================

export type PetCompanionId = 'jelly_puff' | 'shell_turtle' | 'spark_seahorse';

export const PET_COMPANION_ORDER: PetCompanionId[] = ['jelly_puff', 'shell_turtle', 'spark_seahorse'];

export const PET_COMPANION_MAX_LEVEL = 5;

export interface PetCompanionSpec {
  id: PetCompanionId;
  icon: string;
  hudIcon: string;
  inlineIcon: string;
  iconUrl: string;
  name: string;
  shortName: string;
  role: string;
  subtitle: string;
  desc: string;
  accentColor: string;
  accentHex: number;
  pearlCosts: [number, number, number, number, number];
  goldCosts: [number, number, number, number, number];
  maxLevel: number;
  statText: (lvl: number) => string;
}

/** Pure per-level pet numbers (excludes the 深海珍珠 milestone pet-power multiplier). */
export function computePetCompanionNumbers(id: PetCompanionId, lvl: number): {
  goldMult: number;
  magnetRadius: number;
  magnetIntervalSec: number;
  magnetGold: number;
  magnetPull: number;
  dmgTakenMult: number;
  shellIntervalSec: number;
  shellShieldCount: number;
  shellRadius: number;
  sparkIntervalSec: number;
  sparkChainTargets: number;
  sparkDmg: number;
  comboKillsPerSpark: number;
} {
  const on = lvl >= 1;
  const eff = Math.max(1, Math.min(PET_COMPANION_MAX_LEVEL, Math.floor(lvl)));
  const isJelly = on && id === 'jelly_puff';
  const isTurtle = on && id === 'shell_turtle';
  const isSeahorse = on && id === 'spark_seahorse';
  return {
    goldMult: isJelly ? 1.06 + (eff - 1) * 0.04 : 1.0,
    magnetRadius: isJelly ? 4.2 + eff * 0.6 : 0,
    magnetIntervalSec: isJelly ? 6.5 - eff * 0.5 : 0,
    magnetGold: isJelly ? 3 + eff * 3 : 0,
    magnetPull: isJelly ? 0.35 + eff * 0.05 : 0,
    dmgTakenMult: isTurtle ? 1 - (0.05 + (eff - 1) * 0.03) : 1.0,
    shellIntervalSec: isTurtle ? 9.5 - eff * 0.7 : 0,
    shellShieldCount: isTurtle ? 2 + eff * 2 : 0,
    shellRadius: isTurtle ? 5.0 + eff * 0.3 : 0,
    sparkIntervalSec: isSeahorse ? 7.5 - eff * 0.6 : 0,
    sparkChainTargets: isSeahorse ? 2 + eff : 0,
    sparkDmg: isSeahorse ? 26 + eff * 14 : 0,
    comboKillsPerSpark: isSeahorse ? Math.max(4, 10 - eff) : 0,
  };
}

export const PET_COMPANIONS: Record<PetCompanionId, PetCompanionSpec> = {
  jelly_puff: {
    id: 'jelly_puff',
    icon: PET_COMPANION_ART.jelly_puff,
    hudIcon: PET_COMPANION_HUD_ART.jelly_puff,
    inlineIcon: PET_COMPANION_INLINE_ART.jelly_puff,
    iconUrl: PET_COMPANION_ICON_URL.jelly_puff,
    name: '果冻泡泡水母',
    shortName: '泡泡水母',
    role: '拾取磁吸',
    subtitle: '拾取 · 磁吸脉冲 · 金币泡泡',
    desc: '软萌果冻水母漂在波波大军头顶：全部金币拾取提升，并周期释放磁吸脉冲，把营救泡泡与战术空投箱吸到身边、顺手吸来散落金币',
    accentColor: '#f472b6',
    accentHex: 0xf472b6,
    pearlCosts: [2, 3, 4, 5, 7],
    goldCosts: [380, 620, 920, 1320, 1820],
    maxLevel: PET_COMPANION_MAX_LEVEL,
    statText: (lvl) => {
      const n = computePetCompanionNumbers('jelly_puff', Math.max(1, lvl));
      return `金币拾取+${Math.round((n.goldMult - 1) * 100)}% · 每${n.magnetIntervalSec.toFixed(1)}s磁吸脉冲 半径${n.magnetRadius.toFixed(1)}m · 吸金+${n.magnetGold}`;
    },
  },
  shell_turtle: {
    id: 'shell_turtle',
    icon: PET_COMPANION_ART.shell_turtle,
    hudIcon: PET_COMPANION_HUD_ART.shell_turtle,
    inlineIcon: PET_COMPANION_INLINE_ART.shell_turtle,
    iconUrl: PET_COMPANION_ICON_URL.shell_turtle,
    name: '盾壳小海龟',
    shortName: '小海龟',
    role: '护盾防御',
    subtitle: '防御 · 盾壳泡泡 · 全军减伤',
    desc: '背着黄铜齿轮盾壳的小海龟守在方阵里：全军与潜艇/基地受到的伤害降低，并周期为身边波波套上抵挡一次伤害的盾壳泡泡',
    accentColor: '#2dd4bf',
    accentHex: 0x2dd4bf,
    pearlCosts: [2, 3, 4, 5, 7],
    goldCosts: [420, 680, 980, 1380, 1880],
    maxLevel: PET_COMPANION_MAX_LEVEL,
    statText: (lvl) => {
      const n = computePetCompanionNumbers('shell_turtle', Math.max(1, lvl));
      return `全军受伤-${Math.round((1 - n.dmgTakenMult) * 100)}% · 每${n.shellIntervalSec.toFixed(1)}s为${n.shellShieldCount}只波波套盾壳泡泡`;
    },
  },
  spark_seahorse: {
    id: 'spark_seahorse',
    icon: PET_COMPANION_ART.spark_seahorse,
    hudIcon: PET_COMPANION_HUD_ART.spark_seahorse,
    inlineIcon: PET_COMPANION_INLINE_ART.spark_seahorse,
    iconUrl: PET_COMPANION_ICON_URL.spark_seahorse,
    name: '闪电小海马',
    shortName: '小海马',
    role: '连击电花',
    subtitle: '连击 · 闪电链 · 弹射电花',
    desc: '尾巴卷着电花的小海马为波波连击充能：周期或每累计数次击杀释放闪电链，在红军、水母与珊瑚之间弹射造成伤害',
    accentColor: '#fb923c',
    accentHex: 0xfb923c,
    pearlCosts: [2, 3, 4, 5, 7],
    goldCosts: [460, 720, 1020, 1420, 1920],
    maxLevel: PET_COMPANION_MAX_LEVEL,
    statText: (lvl) => {
      const n = computePetCompanionNumbers('spark_seahorse', Math.max(1, lvl));
      return `每${n.sparkIntervalSec.toFixed(1)}s或每${n.comboKillsPerSpark}连杀放闪电链 · 弹射${n.sparkChainTargets}目标 · 每跳${n.sparkDmg}伤害`;
    },
  },
};

// ============================================================================
// MC-12: Bobo Squad Honor Trophy Hall (波波战队荣誉奖杯陈列馆)
// ============================================================================

export type HallTrophyId =
  | 'campaign_star'
  | 'clockwork_core'
  | 'airship_medal'
  | 'train_medal'
  | 'deep_pearl'
  | 'ice_medal'
  | 'lava_core'
  | 'stardust_badge'
  | 'pumpkin_badge'
  | 'scarab_badge'
  | 'emerald_idol_badge';

export const HALL_TROPHY_ORDER: HallTrophyId[] = [
  'campaign_star',
  'clockwork_core',
  'airship_medal',
  'train_medal',
  'deep_pearl',
  'ice_medal',
  'lava_core',
  'stardust_badge',
  'pumpkin_badge',
  'scarab_badge',
  'emerald_idol_badge',
];

export const TROPHY_HALL_SLOT_COUNT = 6;
/** 冰晶奖章 / gold cost to unlock display slot #i (slot 0 is free). */
export const TROPHY_SLOT_MEDAL_COSTS = [0, 2, 3, 4, 6, 8] as const;
export const TROPHY_SLOT_GOLD_COSTS = [0, 900, 1500, 2300, 3300, 4600] as const;
export const HALL_TROPHY_TIER_NAMES = ['未获得', '青铜', '白银', '黄金'] as const;

export type HallTrophyBuffKind = 'power' | 'siege' | 'fire' | 'dmg' | 'hp' | 'speed' | 'gold';

export interface HallTrophySpec {
  id: HallTrophyId;
  name: string;
  sourceLabel: string;
  metricLabel: string;
  unit: string;
  /** Metric needed for 青铜 / 白银 / 黄金 tiers (read from existing saved counters, never duplicated). */
  thresholds: [number, number, number];
  buffKind: HallTrophyBuffKind;
  buffLabel: string;
  /** Global buff while displayed, per tier (fraction, e.g. 0.04 = +4%). */
  buffPerTier: [number, number, number];
  accentColor: string;
  accentHex: number;
  inlineIcon: string;
  iconUrl: string;
}

export const HALL_TROPHIES: Record<HallTrophyId, HallTrophySpec> = {
  campaign_star: {
    id: 'campaign_star',
    name: '战役征程奖杯',
    sourceLabel: '主线战役',
    metricLabel: '最高通关',
    unit: '关',
    thresholds: [5, 15, 30],
    buffKind: 'power',
    buffLabel: '波波战力',
    buffPerTier: [0.02, 0.04, 0.06],
    accentColor: '#facc15',
    accentHex: 0xfacc15,
    inlineIcon: HALL_TROPHY_INLINE_ART.campaign_star,
    iconUrl: HALL_TROPHY_ICON_URL.campaign_star,
  },
  clockwork_core: {
    id: 'clockwork_core',
    name: '发条核心奖杯',
    sourceLabel: '巨型发条首领攻坚',
    metricLabel: '攻坚胜场',
    unit: '场',
    thresholds: [1, 3, 6],
    buffKind: 'siege',
    buffLabel: '攻城伤害',
    buffPerTier: [0.05, 0.1, 0.15],
    accentColor: '#fb923c',
    accentHex: 0xfb923c,
    inlineIcon: HALL_TROPHY_INLINE_ART.clockwork_core,
    iconUrl: HALL_TROPHY_ICON_URL.clockwork_core,
  },
  airship_medal: {
    id: 'airship_medal',
    name: '飞艇徽章奖杯',
    sourceLabel: '云端飞艇母舰护航',
    metricLabel: '累计飞艇徽章',
    unit: '枚',
    thresholds: [3, 8, 16],
    buffKind: 'fire',
    buffLabel: '母炮射速',
    buffPerTier: [0.02, 0.04, 0.06],
    accentColor: '#38bdf8',
    accentHex: 0x38bdf8,
    inlineIcon: HALL_TROPHY_INLINE_ART.airship_medal,
    iconUrl: HALL_TROPHY_ICON_URL.airship_medal,
  },
  train_medal: {
    id: 'train_medal',
    name: '列车金章奖杯',
    sourceLabel: '彩虹糖果列车突袭',
    metricLabel: '累计列车金章',
    unit: '枚',
    thresholds: [3, 8, 16],
    buffKind: 'dmg',
    buffLabel: '波波攻击',
    buffPerTier: [0.03, 0.05, 0.08],
    accentColor: '#f472b6',
    accentHex: 0xf472b6,
    inlineIcon: HALL_TROPHY_INLINE_ART.train_medal,
    iconUrl: HALL_TROPHY_ICON_URL.train_medal,
  },
  deep_pearl: {
    id: 'deep_pearl',
    name: '深海珍珠奖杯',
    sourceLabel: '深海潜艇泡泡营救',
    metricLabel: '累计深海珍珠',
    unit: '颗',
    thresholds: [3, 8, 16],
    buffKind: 'hp',
    buffLabel: '波波生命',
    buffPerTier: [0.03, 0.05, 0.08],
    accentColor: '#2dd4bf',
    accentHex: 0x2dd4bf,
    inlineIcon: HALL_TROPHY_INLINE_ART.deep_pearl,
    iconUrl: HALL_TROPHY_ICON_URL.deep_pearl,
  },
  ice_medal: {
    id: 'ice_medal',
    name: '冰晶奖章奖杯',
    sourceLabel: '冰川雪橇竞速冲关',
    metricLabel: '累计冰晶奖章',
    unit: '枚',
    thresholds: [3, 8, 16],
    buffKind: 'speed',
    buffLabel: '波波移速',
    buffPerTier: [0.02, 0.04, 0.06],
    accentColor: '#7dd3fc',
    accentHex: 0x7dd3fc,
    inlineIcon: HALL_TROPHY_INLINE_ART.ice_medal,
    iconUrl: HALL_TROPHY_ICON_URL.ice_medal,
  },
  // MC-13: reads the existing lifetime 熔岩晶核 counter (cores spent in the gacha machine still count)
  lava_core: {
    id: 'lava_core',
    name: '熔岩晶核奖杯',
    sourceLabel: '火山熔岩跳台突围战',
    metricLabel: '累计熔岩晶核',
    unit: '颗',
    thresholds: [3, 8, 16],
    buffKind: 'gold',
    buffLabel: '金币收益',
    buffPerTier: [0.02, 0.04, 0.06],
    accentColor: '#fb923c',
    accentHex: 0xf97316,
    inlineIcon: HALL_TROPHY_INLINE_ART.lava_core,
    iconUrl: HALL_TROPHY_ICON_URL.lava_core,
  },
  // MC-14: reads the existing lifetime 星尘徽章 counter (badges spent on lobby decor still count)
  stardust_badge: {
    id: 'stardust_badge',
    name: '星尘徽章奖杯',
    sourceLabel: '星际陨石带护盾突围',
    metricLabel: '累计星尘徽章',
    unit: '枚',
    thresholds: [3, 8, 16],
    buffKind: 'fire',
    buffLabel: '母炮射速',
    buffPerTier: [0.02, 0.03, 0.05],
    accentColor: '#a78bfa',
    accentHex: 0xa78bfa,
    inlineIcon: HALL_TROPHY_INLINE_ART.stardust_badge,
    iconUrl: HALL_TROPHY_ICON_URL.stardust_badge,
  },
  // MC-15: reads the existing lifetime 南瓜灯徽章 counter (badges spent on tactic cards still count)
  pumpkin_badge: {
    id: 'pumpkin_badge',
    name: '南瓜灯徽章奖杯',
    sourceLabel: '幽灵古堡南瓜夜',
    metricLabel: '累计南瓜灯徽章',
    unit: '枚',
    thresholds: [3, 8, 16],
    buffKind: 'dmg',
    buffLabel: '波波攻击',
    buffPerTier: [0.02, 0.04, 0.06],
    accentColor: '#fb923c',
    accentHex: 0xfb923c,
    inlineIcon: HALL_TROPHY_INLINE_ART.pumpkin_badge,
    iconUrl: HALL_TROPHY_ICON_URL.pumpkin_badge,
  },
  // MC-16: reads the existing lifetime 圣甲虫徽章 counter
  scarab_badge: {
    id: 'scarab_badge',
    name: '圣甲虫徽章奖杯',
    sourceLabel: '沙漠金字塔机关跑酷',
    metricLabel: '累计圣甲虫徽章',
    unit: '枚',
    thresholds: [3, 8, 16],
    buffKind: 'hp',
    buffLabel: '波波生命',
    buffPerTier: [0.02, 0.04, 0.06],
    accentColor: '#eab308',
    accentHex: 0xeab308,
    inlineIcon: HALL_TROPHY_INLINE_ART.scarab_badge,
    iconUrl: HALL_TROPHY_ICON_URL.scarab_badge,
  },
  // MC-17: reads the existing lifetime 翡翠神像徽章 counter
  emerald_idol_badge: {
    id: 'emerald_idol_badge',
    name: '翡翠神像徽章奖杯',
    sourceLabel: '丛林神庙藤蔓秋千',
    metricLabel: '累计翡翠神像徽章',
    unit: '枚',
    thresholds: [3, 8, 16],
    buffKind: 'speed',
    buffLabel: '波波移速',
    buffPerTier: [0.02, 0.04, 0.06],
    accentColor: '#10b981',
    accentHex: 0x10b981,
    inlineIcon: HALL_TROPHY_INLINE_ART.emerald_idol_badge,
    iconUrl: HALL_TROPHY_ICON_URL.emerald_idol_badge,
  },
};

// ============================================================================
// MC-14: Bobo Squad Themed Lobby Decoration Hall (波波战队主题装修大厅)
// ============================================================================

export type DecorThemeId = 'navy_classic' | 'candy_pink' | 'mint_garden' | 'glacier_aurora' | 'lava_forge' | 'starlight_dome';
export type DecorPropId = 'star_lamp' | 'jelly_plant' | 'squad_banner' | 'stardust_globe';
/** Currencies the decoration hall accepts: coins or a mode currency (星尘徽章 / 熔岩晶核 / 冰晶奖章). */
export type DecorCurrency = 'gold' | 'stardust' | 'lava' | 'ice';

export interface DecorThemeSpec {
  id: DecorThemeId;
  name: string;
  desc: string;
  currency: DecorCurrency;
  cost: number;
  /** Comfort points while this theme is active. */
  comfort: number;
  /** 3D lobby room palette: wallpaper base / stripes, floor / floor ring, pedestal velvet tier & ivory base tint. */
  wallHex: number;
  wallStripeHex: number;
  floorHex: number;
  floorRingHex: number;
  velvetHex: number;
  velvetEmissiveHex: number;
  ivoryHex: number;
  /** CSS colors for the lobby pedestal frame & the workshop swatch. */
  cssWall: string;
  cssFloor: string;
  cssAccent: string;
  /** CSS hue-rotate (deg) applied to the shared lobby_theme art so every theme card reads differently. */
  iconHue: number;
  iconUrl: string;
}

export interface DecorPropSpec {
  id: DecorPropId;
  name: string;
  desc: string;
  currency: DecorCurrency;
  cost: number;
  comfort: number;
  iconUrl: string;
}

export const DECOR_THEME_ORDER: DecorThemeId[] = [
  'navy_classic',
  'candy_pink',
  'mint_garden',
  'glacier_aurora',
  'lava_forge',
  'starlight_dome',
];

export const DECOR_PROP_ORDER: DecorPropId[] = ['star_lamp', 'jelly_plant', 'squad_banner', 'stardust_globe'];
export const DECOR_SLOT_COUNT = 4;
export const DECOR_SLOT_NAMES = ['左后角', '右后角', '左前角', '右前角'] as const;
/**
 * Decor is cosmetic first: it repaints the lobby room / pedestal and places 3D props. The only gameplay effect is a tiny
 * capped comfort bonus: +0.5% coin income per comfort point (active theme + placed props), capped at +3%.
 */
export const DECOR_COMFORT_GOLD_PER_POINT = 0.005;
export const DECOR_COMFORT_GOLD_CAP = 0.03;
export const DECOR_CURRENCY_LABEL: Record<DecorCurrency, string> = {
  gold: '金币',
  stardust: '星尘徽章',
  lava: '熔岩晶核',
  ice: '冰晶奖章',
};

export const DECOR_THEMES: Record<DecorThemeId, DecorThemeSpec> = {
  navy_classic: {
    id: 'navy_classic',
    name: '海军蓝应援厅',
    desc: '波波战队的初始大厅：深海军蓝墙纸 · 金边地板 · 青绿丝绒展台',
    currency: 'gold',
    cost: 0,
    comfort: 0,
    wallHex: 0x1e3a8a,
    wallStripeHex: 0x2b4fb3,
    floorHex: 0x16224a,
    floorRingHex: 0xfacc15,
    velvetHex: 0x0f766e,
    velvetEmissiveHex: 0x042f2e,
    ivoryHex: 0xfef3c7,
    cssWall: '#1e40af',
    cssFloor: '#0c2157',
    cssAccent: '#facc15',
    iconHue: 0,
    iconUrl: DECOR_THEME_ICON_URL,
  },
  candy_pink: {
    id: 'candy_pink',
    name: '草莓糖霜厅',
    desc: '草莓奶油条纹墙纸 · 莓果地板 · 粉色丝绒展台',
    currency: 'gold',
    cost: 1500,
    comfort: 1,
    wallHex: 0xf472b6,
    wallStripeHex: 0xfbcfe8,
    floorHex: 0x9d174d,
    floorRingHex: 0xfde68a,
    velvetHex: 0xdb2777,
    velvetEmissiveHex: 0x500724,
    ivoryHex: 0xfff1f2,
    cssWall: '#ec4899',
    cssFloor: '#831843',
    cssAccent: '#fde68a',
    iconHue: -60,
    iconUrl: DECOR_THEME_ICON_URL,
  },
  mint_garden: {
    id: 'mint_garden',
    name: '薄荷花园厅',
    desc: '薄荷叶条纹墙纸 · 草坪地板 · 翠绿丝绒展台',
    currency: 'gold',
    cost: 2600,
    comfort: 1,
    wallHex: 0x34d399,
    wallStripeHex: 0xa7f3d0,
    floorHex: 0x166534,
    floorRingHex: 0xfef08a,
    velvetHex: 0x059669,
    velvetEmissiveHex: 0x022c22,
    ivoryHex: 0xf0fdf4,
    cssWall: '#10b981',
    cssFloor: '#14532d',
    cssAccent: '#fef08a',
    iconHue: 120,
    iconUrl: DECOR_THEME_ICON_URL,
  },
  glacier_aurora: {
    id: 'glacier_aurora',
    name: '冰川极光厅',
    desc: '极光冰蓝墙纸 · 冰湖地板 · 冰晶丝绒展台（冰晶奖章兑换）',
    currency: 'ice',
    cost: 5,
    comfort: 2,
    wallHex: 0x38bdf8,
    wallStripeHex: 0xe0f2fe,
    floorHex: 0x1e3a5f,
    floorRingHex: 0xa5f3fc,
    velvetHex: 0x0284c7,
    velvetEmissiveHex: 0x082f49,
    ivoryHex: 0xf0f9ff,
    cssWall: '#0ea5e9',
    cssFloor: '#0c4a6e',
    cssAccent: '#a5f3fc',
    iconHue: 170,
    iconUrl: DECOR_THEME_ICON_URL,
  },
  lava_forge: {
    id: 'lava_forge',
    name: '熔岩锻造厅',
    desc: '熔岩锻铁墙纸 · 黑曜石地板 · 赤红丝绒展台（熔岩晶核兑换）',
    currency: 'lava',
    cost: 5,
    comfort: 2,
    wallHex: 0x9a3412,
    wallStripeHex: 0xf97316,
    floorHex: 0x292524,
    floorRingHex: 0xfb923c,
    velvetHex: 0xb91c1c,
    velvetEmissiveHex: 0x450a0a,
    ivoryHex: 0xfed7aa,
    cssWall: '#c2410c',
    cssFloor: '#1c1917',
    cssAccent: '#fb923c',
    iconHue: -25,
    iconUrl: DECOR_THEME_ICON_URL,
  },
  starlight_dome: {
    id: 'starlight_dome',
    name: '星空穹顶厅',
    desc: '星云紫墙纸 · 星轨地板 · 银河丝绒展台（星尘徽章兑换）',
    currency: 'stardust',
    cost: 5,
    comfort: 2,
    wallHex: 0x3730a3,
    wallStripeHex: 0x818cf8,
    floorHex: 0x0b1030,
    floorRingHex: 0xc4b5fd,
    velvetHex: 0x7c3aed,
    velvetEmissiveHex: 0x2e1065,
    ivoryHex: 0xe0e7ff,
    cssWall: '#4338ca',
    cssFloor: '#0b1030',
    cssAccent: '#c4b5fd',
    iconHue: 220,
    iconUrl: DECOR_THEME_ICON_URL,
  },
};

export const DECOR_PROPS: Record<DecorPropId, DecorPropSpec> = {
  star_lamp: {
    id: 'star_lamp',
    name: '星光落地灯',
    desc: '黄铜灯杆 + 暖黄灯罩，照亮奖杯展台',
    currency: 'gold',
    cost: 900,
    comfort: 1,
    iconUrl: DECOR_LAMP_ICON_URL,
  },
  jelly_plant: {
    id: 'jelly_plant',
    name: '果冻盆栽',
    desc: '糖霜花盆里长出的 Q 弹果冻叶与小花苞',
    currency: 'gold',
    cost: 1200,
    comfort: 1,
    iconUrl: DECOR_PLANT_ICON_URL,
  },
  squad_banner: {
    id: 'squad_banner',
    name: '战队应援横幅',
    desc: '双杆应援横幅，挂着波波战队金色星徽（熔岩晶核兑换）',
    currency: 'lava',
    cost: 3,
    comfort: 2,
    iconUrl: DECOR_BANNER_ICON_URL,
  },
  stardust_globe: {
    id: 'stardust_globe',
    name: '星尘地球仪',
    desc: '缓缓自转的星图地球仪与环绕小卫星（星尘徽章兑换）',
    currency: 'stardust',
    cost: 3,
    comfort: 2,
    iconUrl: STARDUST_BADGE_ICON_URL,
  },
};


// ============================================================================
// MC-15: Bobo Squad Tactic Deck (波波战队战术卡组)
// ============================================================================

export type TacticCardId =
  | 'shield_open'
  | 'shield_half'
  | 'shield_crisis'
  | 'rush_open'
  | 'rush_half'
  | 'rush_final'
  | 'crowd_open'
  | 'crowd_crisis'
  | 'crowd_final';
/** Card families: each family shares one card art (shield / rush / crowd). */
export type TacticCategory = 'shield' | 'rush' | 'crowd';
/**
 * When an equipped card fires during a match (once per match):
 * - `start`: 1 s into the match.
 * - `half`: the stage is half done (boss HP <= 50% / course progress >= 50%).
 * - `final`: the final stretch (boss HP <= 20% / course progress >= 80%).
 * - `crisis`: the squad is in trouble (base HP <= 50% in base battles; Bobos <= 50% of the match peak in squad runs).
 */
export type TacticTrigger = 'start' | 'half' | 'final' | 'crisis';
/** Currencies that unlock tactic cards: coins or a mode currency earned in the lobby modes. */
export type TacticCurrency = 'gold' | 'train' | 'pearl' | 'ice' | 'lava' | 'stardust' | 'pumpkin';

export interface TacticCardSpec {
  id: TacticCardId;
  name: string;
  category: TacticCategory;
  trigger: TacticTrigger;
  /** shield: Bobos given a one-hit candy shield · rush: march-speed bonus (fraction) · crowd: Bobos added. */
  value: number;
  /** rush only: how long the speed bonus lasts. */
  durationSec: number;
  currency: TacticCurrency;
  cost: number;
  desc: string;
  iconUrl: string;
}

export const TACTIC_DECK_SIZE = 3;
/** Effect caps per match (the whole deck together): shields granted, Bobos added, speed bonus (rush never stacks). */
export const TACTIC_SHIELD_CAP = 24;
export const TACTIC_CROWD_CAP = 16;
export const TACTIC_RUSH_CAP = 0.25;
/** A rush card's bonus is also capped in time (seconds). */
export const TACTIC_RUSH_MAX_SEC = 6;
/**
 * MC-16 balance: main-campaign stages run the deck at this effect coefficient (card values and the per-match caps are
 * all scaled: shields 10/14/20 -> 6/8/12 · cap 24 -> 14, Bobos 6/10/8 -> 4/6/5 · cap 16 -> 10, rush +15/20/25% ->
 * +9/12/15% · cap +25% -> +15%). Lobby modes keep ×1.0. Players can also switch the deck off for the campaign.
 */
export const TACTIC_CAMPAIGN_EFFECT_MULT = 0.6;

/** Per-match effect profile of the tactic deck (MC-16: campaign coefficient / switch vs lobby modes). */
export interface TacticEffectProfile {
  isCampaign: boolean;
  enabled: boolean;
  mult: number;
  shieldCap: number;
  crowdCap: number;
  rushCap: number;
  label: string;
}

/** Scales a card value by the effect coefficient (counts round to the nearest whole Bobo, never below 1). */
export function scaleTacticValue(value: number, mult: number, isCount: boolean): number {
  if (mult >= 0.999) return value;
  if (!isCount) return Number((value * mult).toFixed(4));
  return Math.max(1, Math.round(value * mult));
}

export const TACTIC_CATEGORY_LABEL: Record<TacticCategory, string> = {
  shield: '护盾卡',
  rush: '冲锋卡',
  crowd: '人海卡',
};
export const TACTIC_TRIGGER_LABEL: Record<TacticTrigger, string> = {
  start: '开局 1 秒',
  half: '进度过半',
  final: '终局冲刺（进度 80%）',
  crisis: '危急时（基地 ≤50% / 波波 ≤ 峰值一半）',
};
export const TACTIC_CURRENCY_LABEL: Record<TacticCurrency, string> = {
  gold: '金币',
  train: '列车金章',
  pearl: '深海珍珠',
  ice: '冰晶奖章',
  lava: '熔岩晶核',
  stardust: '星尘徽章',
  pumpkin: '南瓜灯徽章',
};

export const TACTIC_CARD_ORDER: TacticCardId[] = [
  'shield_open',
  'shield_half',
  'shield_crisis',
  'rush_open',
  'rush_half',
  'rush_final',
  'crowd_open',
  'crowd_crisis',
  'crowd_final',
];

export const TACTIC_CARDS: Record<TacticCardId, TacticCardSpec> = {
  shield_open: {
    id: 'shield_open',
    name: '开局糖霜盾',
    category: 'shield',
    trigger: 'start',
    value: 10,
    durationSec: 0,
    currency: 'gold',
    cost: 1200,
    desc: '开局 1 秒：给 10 只波波套上能挡 1 次伤害的糖霜护盾',
    iconUrl: TACTIC_CARD_ICON_URL.shield,
  },
  shield_half: {
    id: 'shield_half',
    name: '中场守护阵',
    category: 'shield',
    trigger: 'half',
    value: 14,
    durationSec: 0,
    currency: 'ice',
    cost: 3,
    desc: '进度过半：给 14 只波波补上糖霜护盾',
    iconUrl: TACTIC_CARD_ICON_URL.shield,
  },
  shield_crisis: {
    id: 'shield_crisis',
    name: '危急护盾墙',
    category: 'shield',
    trigger: 'crisis',
    value: 20,
    durationSec: 0,
    currency: 'pearl',
    cost: 3,
    desc: '危急时：给 20 只波波紧急套盾',
    iconUrl: TACTIC_CARD_ICON_URL.shield,
  },
  rush_open: {
    id: 'rush_open',
    name: '开局疾行号',
    category: 'rush',
    trigger: 'start',
    value: 0.15,
    durationSec: 4,
    currency: 'gold',
    cost: 1500,
    desc: '开局 1 秒：波波行进速度 +15%，持续 4 秒',
    iconUrl: TACTIC_CARD_ICON_URL.rush,
  },
  rush_half: {
    id: 'rush_half',
    name: '过半冲锋号',
    category: 'rush',
    trigger: 'half',
    value: 0.2,
    durationSec: 5,
    currency: 'stardust',
    cost: 3,
    desc: '进度过半：波波行进速度 +20%，持续 5 秒',
    iconUrl: TACTIC_CARD_ICON_URL.rush,
  },
  rush_final: {
    id: 'rush_final',
    name: '终点冲刺令',
    category: 'rush',
    trigger: 'final',
    value: 0.25,
    durationSec: 5,
    currency: 'lava',
    cost: 3,
    desc: '终局冲刺：波波行进速度 +25%，持续 5 秒',
    iconUrl: TACTIC_CARD_ICON_URL.rush,
  },
  crowd_open: {
    id: 'crowd_open',
    name: '开局援军',
    category: 'crowd',
    trigger: 'start',
    value: 6,
    durationSec: 0,
    currency: 'gold',
    cost: 1800,
    desc: '开局 1 秒：6 只援军波波加入队伍',
    iconUrl: TACTIC_CARD_ICON_URL.crowd,
  },
  crowd_crisis: {
    id: 'crowd_crisis',
    name: '危急增援',
    category: 'crowd',
    trigger: 'crisis',
    value: 10,
    durationSec: 0,
    currency: 'train',
    cost: 3,
    desc: '危急时：10 只增援波波赶到',
    iconUrl: TACTIC_CARD_ICON_URL.crowd,
  },
  crowd_final: {
    id: 'crowd_final',
    name: '终局人海',
    category: 'crowd',
    trigger: 'final',
    value: 8,
    durationSec: 0,
    currency: 'pumpkin',
    cost: 3,
    desc: '终局冲刺：8 只波波压阵冲线',
    iconUrl: TACTIC_CARD_ICON_URL.crowd,
  },
};

// ============================================================================
// MC-13: Bobo Squad Skin Gacha Machine (波波战队皮肤扭蛋机)
// ============================================================================

export type GachaSkinId =
  | 'mint_cap'
  | 'peach_bow'
  | 'sprout_leaf'
  | 'pirate_hat'
  | 'bunny_ears'
  | 'lava_horns'
  | 'halo_angel'
  | 'royal_crown';

export type GachaRarity = 'N' | 'R' | 'SR' | 'SSR';

export interface GachaRaritySpec {
  id: GachaRarity;
  name: string;
  /** Roll weight out of 100 (before pity). */
  weight: number;
  color: string;
  /** Coins refunded when a duplicate of this rarity is rolled. */
  dupCoins: number;
}

export const GACHA_RARITY_ORDER: GachaRarity[] = ['N', 'R', 'SR', 'SSR'];

export const GACHA_RARITIES: Record<GachaRarity, GachaRaritySpec> = {
  N: { id: 'N', name: '普通', weight: 55, color: '#94a3b8', dupCoins: 200 },
  R: { id: 'R', name: '稀有', weight: 30, color: '#38bdf8', dupCoins: 450 },
  SR: { id: 'SR', name: '史诗', weight: 12, color: '#c084fc', dupCoins: 1000 },
  SSR: { id: 'SSR', name: '传说', weight: 3, color: '#facc15', dupCoins: 2400 },
};

export const GACHA_SINGLE_COST_CORES = 2;
export const GACHA_SINGLE_COST_GOLD = 800;
export const GACHA_TEN_COST_CORES = 18;
export const GACHA_TEN_COST_GOLD = 7200;
/** Pity: the 10th roll since the last 史诗-or-better is a guaranteed 史诗+; the 50th since the last 传说 is a 传说. */
export const GACHA_PITY_SR = 10;
export const GACHA_PITY_SSR = 50;
/**
 * Skins are cosmetic: equipping one only changes the look of the Bobo troopers. The only gameplay effect is a tiny
 * capped collection bonus: +0.4% gold income per owned gacha skin, capped at +3% (all 8 skins = +3%).
 */
export const GACHA_COLLECTION_GOLD_PER_SKIN = 0.004;
export const GACHA_COLLECTION_GOLD_CAP = 0.03;

export interface GachaSkinSpec {
  id: GachaSkinId;
  name: string;
  rarity: GachaRarity;
  desc: string;
  accessoryLabel: string;
  /** Per-instance candy tints that replace the colorway on every Bobo trooper (primary / accent / glow). */
  tints: [number, number, number];
  bodyEmissiveHex: number;
  bodyEmissiveBoost: number;
  bodyMetalness: number;
  accessoryEmissiveHex: number;
  accessoryEmissiveIntensity: number;
  accessoryMetalness: number;
  accessoryRoughness: number;
  /** CSS gradient for the collection card swatch. */
  swatch: string;
  /** CSS hue-rotate (deg) applied to the shared capsule art so every skin card reads differently. */
  capsuleHue: number;
  iconUrl: string;
}

export const GACHA_SKIN_ORDER: GachaSkinId[] = [
  'mint_cap',
  'peach_bow',
  'sprout_leaf',
  'pirate_hat',
  'bunny_ears',
  'lava_horns',
  'halo_angel',
  'royal_crown',
];

export const GACHA_SKINS: Record<GachaSkinId, GachaSkinSpec> = {
  mint_cap: {
    id: 'mint_cap',
    name: '薄荷鸭舌帽',
    rarity: 'N',
    desc: '清凉薄荷绿果冻波波 · 白檐薄荷鸭舌帽',
    accessoryLabel: '鸭舌帽',
    tints: [0x5eead4, 0x99f6e4, 0xccfbf1],
    bodyEmissiveHex: 0x064e3b,
    bodyEmissiveBoost: 0.04,
    bodyMetalness: 0.04,
    accessoryEmissiveHex: 0x0d9488,
    accessoryEmissiveIntensity: 0.16,
    accessoryMetalness: 0.05,
    accessoryRoughness: 0.42,
    swatch: 'linear-gradient(135deg, #5eead4 0%, #ccfbf1 100%)',
    capsuleHue: 150,
    iconUrl: GACHA_CAPSULE_ICON_URL,
  },
  peach_bow: {
    id: 'peach_bow',
    name: '蜜桃蝴蝶结',
    rarity: 'N',
    desc: '蜜桃粉果冻波波 · 头顶草莓蝴蝶结',
    accessoryLabel: '蝴蝶结',
    tints: [0xfda4af, 0xfecdd3, 0xffe4e6],
    bodyEmissiveHex: 0x4c0519,
    bodyEmissiveBoost: 0.04,
    bodyMetalness: 0.04,
    accessoryEmissiveHex: 0xe11d48,
    accessoryEmissiveIntensity: 0.22,
    accessoryMetalness: 0.05,
    accessoryRoughness: 0.32,
    swatch: 'linear-gradient(135deg, #fb7185 0%, #ffe4e6 100%)',
    capsuleHue: -40,
    iconUrl: GACHA_CAPSULE_ICON_URL,
  },
  sprout_leaf: {
    id: 'sprout_leaf',
    name: '嫩芽小叶',
    rarity: 'N',
    desc: '青柠果冻波波 · 头顶冒出两片嫩芽',
    accessoryLabel: '嫩芽',
    tints: [0xa3e635, 0xd9f99d, 0xfef08a],
    bodyEmissiveHex: 0x1a2e05,
    bodyEmissiveBoost: 0.04,
    bodyMetalness: 0.04,
    accessoryEmissiveHex: 0x16a34a,
    accessoryEmissiveIntensity: 0.2,
    accessoryMetalness: 0.02,
    accessoryRoughness: 0.4,
    swatch: 'linear-gradient(135deg, #84cc16 0%, #fef08a 100%)',
    capsuleHue: 80,
    iconUrl: GACHA_CAPSULE_ICON_URL,
  },
  pirate_hat: {
    id: 'pirate_hat',
    name: '海盗三角帽',
    rarity: 'R',
    desc: '深海蓝果冻波波 · 金边海盗三角帽',
    accessoryLabel: '三角帽',
    tints: [0x3b82f6, 0x1d4ed8, 0xfacc15],
    bodyEmissiveHex: 0x172554,
    bodyEmissiveBoost: 0.06,
    bodyMetalness: 0.08,
    accessoryEmissiveHex: 0x1e293b,
    accessoryEmissiveIntensity: 0.1,
    accessoryMetalness: 0.35,
    accessoryRoughness: 0.38,
    swatch: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 60%, #facc15 100%)',
    capsuleHue: 200,
    iconUrl: GACHA_CAPSULE_ICON_URL,
  },
  bunny_ears: {
    id: 'bunny_ears',
    name: '糖霜兔耳',
    rarity: 'R',
    desc: '糖霜白果冻波波 · 粉芯长兔耳',
    accessoryLabel: '兔耳',
    tints: [0xf5f3ff, 0xe9d5ff, 0xfbcfe8],
    bodyEmissiveHex: 0x3b0764,
    bodyEmissiveBoost: 0.06,
    bodyMetalness: 0.04,
    accessoryEmissiveHex: 0xf472b6,
    accessoryEmissiveIntensity: 0.18,
    accessoryMetalness: 0.04,
    accessoryRoughness: 0.3,
    swatch: 'linear-gradient(135deg, #f5f3ff 0%, #e9d5ff 50%, #f9a8d4 100%)',
    capsuleHue: 260,
    iconUrl: GACHA_CAPSULE_ICON_URL,
  },
  lava_horns: {
    id: 'lava_horns',
    name: '熔岩小恶魔角',
    rarity: 'SR',
    desc: '熔岩橙发光果冻波波 · 一对炽热小恶魔角',
    accessoryLabel: '恶魔角',
    tints: [0xf97316, 0xef4444, 0xfde047],
    bodyEmissiveHex: 0x9a3412,
    bodyEmissiveBoost: 0.26,
    bodyMetalness: 0.1,
    accessoryEmissiveHex: 0xf97316,
    accessoryEmissiveIntensity: 0.75,
    accessoryMetalness: 0.2,
    accessoryRoughness: 0.3,
    swatch: 'linear-gradient(135deg, #7f1d1d 0%, #f97316 55%, #fde047 100%)',
    capsuleHue: -15,
    iconUrl: GACHA_CAPSULE_ICON_URL,
  },
  halo_angel: {
    id: 'halo_angel',
    name: '天使光环',
    rarity: 'SR',
    desc: '奶油珍珠果冻波波 · 漂浮金色光环与小羽翼',
    accessoryLabel: '光环',
    tints: [0xfffbeb, 0xfef3c7, 0xbae6fd],
    bodyEmissiveHex: 0x78350f,
    bodyEmissiveBoost: 0.1,
    bodyMetalness: 0.06,
    accessoryEmissiveHex: 0xfacc15,
    accessoryEmissiveIntensity: 0.95,
    accessoryMetalness: 0.3,
    accessoryRoughness: 0.2,
    swatch: 'linear-gradient(135deg, #fffbeb 0%, #fde68a 55%, #bae6fd 100%)',
    capsuleHue: 30,
    iconUrl: GACHA_CAPSULE_ICON_URL,
  },
  royal_crown: {
    id: 'royal_crown',
    name: '星辉王冠',
    rarity: 'SSR',
    desc: '鎏金星辉果冻波波 · 宝石王冠',
    accessoryLabel: '王冠',
    tints: [0xfacc15, 0xfde68a, 0xc084fc],
    bodyEmissiveHex: 0x713f12,
    bodyEmissiveBoost: 0.16,
    bodyMetalness: 0.42,
    accessoryEmissiveHex: 0xf59e0b,
    accessoryEmissiveIntensity: 0.4,
    accessoryMetalness: 0.78,
    accessoryRoughness: 0.18,
    swatch: 'linear-gradient(135deg, #a16207 0%, #facc15 50%, #c084fc 100%)',
    capsuleHue: 0,
    iconUrl: GACHA_CROWN_ICON_URL,
  },
};

export interface GachaRollResult {
  id: GachaSkinId;
  rarity: GachaRarity;
  isNew: boolean;
  dupCoins: number;
  pity: 'sr' | 'ssr' | null;
}

export const BOBO_TECH_BRANCH_ORDER: BoboTechBranchId[] = [
  'vanguard_charge',
  'heavy_siege',
  'candy_bombard',
];

export const BOBO_TECH_MAX_LEVEL = 5;

export interface BoboTechBranchSpec {
  id: BoboTechBranchId;
  icon: string;
  hudIcon: string;
  inlineIcon: string;
  name: string;
  shortName: string;
  subtitle: string;
  desc: string;
  doctrineBonusText: string;
  accentColor: string;
  coreCosts: [number, number, number, number, number];
  goldCosts: [number, number, number, number, number];
  maxLevel: number;
  statText: (lvl: number, isActiveDoctrine: boolean) => string;
}

export const BOBO_TECH_BRANCHES: Record<BoboTechBranchId, BoboTechBranchSpec> = {
  vanguard_charge: {
    id: 'vanguard_charge',
    icon: BOBO_TECH_ART.vanguard_charge,
    hudIcon: BOBO_TECH_HUD_ART.vanguard_charge,
    inlineIcon: BOBO_TECH_INLINE_ART.vanguard_charge,
    name: '迅捷冲锋营',
    shortName: '冲锋营',
    subtitle: '疾风羽翼 · 穿门疾驰 · 残影闪避',
    desc: '提升波波全军冲锋移速，穿过倍增门后触发疾风急行，并赋予近战残影闪避率',
    doctrineBonusText: '主战策加成：移速额外+6% · 穿门冲刺+12% · 披挂青羽冲锋翼饰',
    accentColor: '#38bdf8',
    coreCosts: [1, 2, 3, 4, 5],
    goldCosts: [240, 420, 680, 1050, 1520],
    maxLevel: BOBO_TECH_MAX_LEVEL,
    statText: (lvl, isActive) => {
      const movePct = lvl * 5 + (isActive ? 6 : 0);
      const surgePct = (lvl > 0 ? 14 + lvl * 6 : 0) + (isActive ? 12 : 0);
      const dodgePct = lvl * 3 + (isActive ? 4 : 0);
      return `移速+${movePct}% · 穿门冲刺+${surgePct}% · 闪避${dodgePct}%`;
    },
  },
  heavy_siege: {
    id: 'heavy_siege',
    icon: BOBO_TECH_ART.heavy_siege,
    hudIcon: BOBO_TECH_HUD_ART.heavy_siege,
    inlineIcon: BOBO_TECH_INLINE_ART.heavy_siege,
    name: '重甲破城营',
    shortName: '破城营',
    subtitle: '发条重盾 · 护甲减伤 · 弱点破拆',
    desc: '强化波波生命值与出膛前锋护盾概率，显著放大对发条首领弱点与敌塔的破城伤害',
    doctrineBonusText: '主战策加成：弱点与攻城伤害额外+15% · 护盾率+10% · 披挂金铜重盾肩甲',
    accentColor: '#f59e0b',
    coreCosts: [1, 2, 3, 4, 5],
    goldCosts: [260, 450, 720, 1100, 1600],
    maxLevel: BOBO_TECH_MAX_LEVEL,
    statText: (lvl, isActive) => {
      const hpPct = lvl * 8 + (isActive ? 8 : 0);
      const siegePct = lvl * 12 + (isActive ? 15 : 0);
      const shieldPct = lvl * 7 + (isActive ? 10 : 0);
      return `生命+${hpPct}% · 破城与弱点+${siegePct}% · 前锋盾${shieldPct}%`;
    },
  },
  candy_bombard: {
    id: 'candy_bombard',
    icon: BOBO_TECH_ART.candy_bombard,
    hudIcon: BOBO_TECH_HUD_ART.candy_bombard,
    inlineIcon: BOBO_TECH_INLINE_ART.candy_bombard,
    name: '爆裂糖弹营',
    shortName: '糖弹营',
    subtitle: '彩虹糖弹 · 碰撞溅射 · 母炮连射',
    desc: '赋予波波近战碰撞糖衣爆裂溅射伤害，并同步提升蒸汽母炮连发射速',
    doctrineBonusText: '主战策加成：糖弹溅射伤害+16% · 母炮射速额外+6% · 顶戴爆裂糖衣核心冠',
    accentColor: '#f472b6',
    coreCosts: [1, 2, 3, 4, 5],
    goldCosts: [250, 440, 700, 1080, 1560],
    maxLevel: BOBO_TECH_MAX_LEVEL,
    statText: (lvl, isActive) => {
      const splashPct = (lvl > 0 ? 16 + lvl * 8 : 0) + (isActive ? 16 : 0);
      const firePct = lvl * 4 + (isActive ? 6 : 0);
      return `碰撞糖爆溅射${splashPct}% · 母炮射速+${firePct}%`;
    },
  },
};

export const TACTICAL_SUBWEAPON_ORDER: TacticalSubWeaponId[] = [
  'electro_net',
  'syrup_bubble',
  'rally_horn',
];

export const TACTICAL_SUBWEAPON_MAX_LEVEL = 5;

export interface TacticalSubWeaponSpec {
  id: TacticalSubWeaponId;
  icon: string;
  hudIcon: string;
  inlineIcon: string;
  name: string;
  shortName: string;
  subtitle: string;
  desc: string;
  accentColor: string;
  baseCost: number;
  costMult: number;
  maxLevel: number;
  statText: (lvl: number) => string;
}

export const TACTICAL_SUBWEAPONS: Record<TacticalSubWeaponId, TacticalSubWeaponSpec> = {
  electro_net: {
    id: 'electro_net',
    icon: TACTICAL_SUBWEAPON_ART.electro_net,
    hudIcon: TACTICAL_SUBWEAPON_HUD_ART.electro_net,
    inlineIcon: TACTICAL_SUBWEAPON_INLINE_ART.electro_net,
    name: '电磁网弹',
    shortName: '电磁网',
    subtitle: '电弧麻痹 · 剥离塔盾',
    desc: '发射范围青蓝电磁网弹，麻痹减速红方集群并直接剥离敌方据点与副塔护盾',
    accentColor: '#22d3ee',
    baseCost: 220,
    costMult: 1.55,
    maxLevel: TACTICAL_SUBWEAPON_MAX_LEVEL,
    statText: (lvl) => {
      const dur = (3.6 + (lvl - 1) * 0.45).toFixed(1);
      const strip = 3 + lvl;
      return `麻痹${dur}s · 破盾-${strip}层 · CD ${(11.5 - (lvl - 1) * 0.65).toFixed(1)}s`;
    },
  },
  syrup_bubble: {
    id: 'syrup_bubble',
    icon: TACTICAL_SUBWEAPON_ART.syrup_bubble,
    hudIcon: TACTICAL_SUBWEAPON_HUD_ART.syrup_bubble,
    inlineIcon: TACTICAL_SUBWEAPON_INLINE_ART.syrup_bubble,
    name: '糖浆减速泡',
    shortName: '糖浆泡',
    subtitle: '琥珀粉泡 · 减速易伤',
    desc: '在桥面铺设琥珀粉红黏稠糖浆泡区，大幅迟滞红方推进并使其承受伤害放大',
    accentColor: '#f472b6',
    baseCost: 240,
    costMult: 1.55,
    maxLevel: TACTICAL_SUBWEAPON_MAX_LEVEL,
    statText: (lvl) => {
      const slowPct = Math.round((1 - (0.38 - (lvl - 1) * 0.03)) * 100);
      const vulnPct = Math.round((0.32 + (lvl - 1) * 0.09) * 100);
      return `减速${slowPct}% · 易伤+${vulnPct}% · 持续${(6.5 + (lvl - 1) * 0.7).toFixed(1)}s`;
    },
  },
  rally_horn: {
    id: 'rally_horn',
    icon: TACTICAL_SUBWEAPON_ART.rally_horn,
    hudIcon: TACTICAL_SUBWEAPON_HUD_ART.rally_horn,
    inlineIcon: TACTICAL_SUBWEAPON_INLINE_ART.rally_horn,
    name: '鼓舞号角光环',
    shortName: '号角环',
    subtitle: '黄金号角 · 攻移双增',
    desc: '围绕领队与前锋波波团吹响黄金号角光环，大幅提升全军移速、攻速与炮台射速',
    accentColor: '#f59e0b',
    baseCost: 250,
    costMult: 1.55,
    maxLevel: TACTICAL_SUBWEAPON_MAX_LEVEL,
    statText: (lvl) => {
      const movePct = Math.round((0.35 + (lvl - 1) * 0.07) * 100);
      const atkPct = Math.round((0.32 + (lvl - 1) * 0.08) * 100);
      return `移速+${movePct}% · 攻速+${atkPct}% · 持续${(5.8 + (lvl - 1) * 0.65).toFixed(1)}s`;
    },
  },
};

export interface TournamentStageSpec {
  stage: TournamentStageId;
  badgeText: string;
  shortTitle: string;
  streakMultiplier: number;
  streakLabel: string;
  themeId: ThemeId;
  baseCoins: number;
  baseCards: number;
  baseBricks: number;
  baseTrophies: number;
  matchWinTrophies: number;
}

export const TOURNAMENT_STAGES: Record<TournamentStageId, TournamentStageSpec> = {
  1: {
    stage: 1,
    badgeText: '第 1/3 战 · 铜齿预赛',
    shortTitle: '铜齿预赛',
    streakMultiplier: 1.5,
    streakLabel: '1.5x',
    themeId: 'wasteland',
    baseCoins: 520,
    baseCards: 2,
    baseBricks: 36,
    baseTrophies: 12,
    matchWinTrophies: 4,
  },
  2: {
    stage: 2,
    badgeText: '第 2/3 战 · 银齿半决赛',
    shortTitle: '银齿半决赛',
    streakMultiplier: 2.2,
    streakLabel: '2.2x',
    themeId: 'cyberhive',
    baseCoins: 760,
    baseCards: 3,
    baseBricks: 58,
    baseTrophies: 20,
    matchWinTrophies: 6,
  },
  3: {
    stage: 3,
    badgeText: '第 3/3 战 · 金齿巅峰决战',
    shortTitle: '金齿巅峰决战',
    streakMultiplier: 3.5,
    streakLabel: '3.5x',
    themeId: 'royal',
    baseCoins: 1120,
    baseCards: 5,
    baseBricks: 92,
    baseTrophies: 34,
    matchWinTrophies: 10,
  },
};

export const TOURNAMENT_TROPHY_MILESTONES = [15, 45, 90, 160, 260] as const;

export type MetaUpgradeId =
  | 'meta_attack'
  | 'meta_firerate'
  | 'meta_bastion'
  | 'meta_capacitor'
  | 'meta_thruster'
  | 'meta_bounty';

export interface MetaUpgradeSpec {
  id: MetaUpgradeId;
  icon: string;
  name: string;
  desc: string;
  baseCost: number;
  costMult: number;
  maxLevel: number;
  statPerLevelText: (lvl: number) => string;
}

export const META_UPGRADES: MetaUpgradeSpec[] = [
  {
    id: 'meta_attack',
    icon: META_UPGRADE_ART.meta_attack,
    name: '全军攻击',
    desc: '波波团与领队基础伤害',
    baseCost: 180,
    costMult: 1.52,
    maxLevel: 20,
    statPerLevelText: (lvl) => `当前 +${lvl * 3}% (每级+3%)`,
  },
  {
    id: 'meta_firerate',
    icon: META_UPGRADE_ART.meta_firerate,
    name: '基础射速',
    desc: '波波蒸汽炮基础射速',
    baseCost: 200,
    costMult: 1.52,
    maxLevel: 20,
    statPerLevelText: (lvl) => `当前 +${(lvl * 2.5).toFixed(1).replace(/\.0$/, '')}% (每级+2.5%)`,
  },
  {
    id: 'meta_bastion',
    icon: META_UPGRADE_ART.meta_bastion,
    name: '基地生命',
    desc: '我方泡泡站最大生命',
    baseCost: 160,
    costMult: 1.48,
    maxLevel: 20,
    statPerLevelText: (lvl) => `当前 +${lvl * 5}% (每级+5%)`,
  },
  {
    id: 'meta_capacitor',
    icon: META_UPGRADE_ART.meta_capacitor,
    name: '初始充能',
    desc: '双大招开局初始能量',
    baseCost: 220,
    costMult: 1.58,
    maxLevel: 8,
    statPerLevelText: (lvl) => `当前 +${lvl * 3}% (每级+3%)`,
  },
  {
    id: 'meta_thruster',
    icon: META_UPGRADE_ART.meta_thruster,
    name: '行军移速',
    desc: '波波兵冲锋推进移速',
    baseCost: 180,
    costMult: 1.52,
    maxLevel: 10,
    statPerLevelText: (lvl) => `当前 +${lvl * 2}% (每级+2%)`,
  },
  {
    id: 'meta_bounty',
    icon: META_UPGRADE_ART.meta_bounty,
    name: '金币加成',
    desc: '击败敌人与通关金币收益',
    baseCost: 200,
    costMult: 1.52,
    maxLevel: 20,
    statPerLevelText: (lvl) => `当前 +${lvl * 4}% (每级+4%)`,
  },
];

export type SkinId = 'azure' | 'crimson' | 'emerald' | 'phantom' | 'imperium' | 'nebula';

export type SkinRankTier = 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS';

export interface SkinRankSpec {
  index: number;
  tier: SkinRankTier;
  title: string;
  shardsToNext: number;
  goldToNext: number;
  bonusMult: number;
  color: string;
  bg: string;
}

export const SKIN_RANK_SPECS: SkinRankSpec[] = [
  {
    index: 0,
    tier: 'C',
    title: 'C阶·制式',
    shardsToNext: 100,
    goldToNext: 8000,
    bonusMult: 1.0,
    color: '#cbd5e1',
    bg: 'rgba(51, 65, 85, 0.85)',
  },
  {
    index: 1,
    tier: 'B',
    title: 'B阶·精良',
    shardsToNext: 220,
    goldToNext: 20000,
    bonusMult: 1.35,
    color: '#38bdf8',
    bg: 'rgba(14, 116, 144, 0.85)',
  },
  {
    index: 2,
    tier: 'A',
    title: 'A阶·稀有',
    shardsToNext: 400,
    goldToNext: 45000,
    bonusMult: 1.75,
    color: '#c084fc',
    bg: 'rgba(107, 33, 168, 0.85)',
  },
  {
    index: 3,
    tier: 'S',
    title: 'S阶·史诗',
    shardsToNext: 700,
    goldToNext: 95000,
    bonusMult: 2.25,
    color: '#facc15',
    bg: 'rgba(161, 98, 7, 0.88)',
  },
  {
    index: 4,
    tier: 'SS',
    title: 'SS阶·传说',
    shardsToNext: 1100,
    goldToNext: 200000,
    bonusMult: 2.9,
    color: '#fb923c',
    bg: 'rgba(194, 65, 12, 0.9)',
  },
  {
    index: 5,
    tier: 'SSS',
    title: 'SSS阶·神话',
    shardsToNext: 0,
    goldToNext: 0,
    bonusMult: 3.8,
    color: '#f472b6',
    bg: 'linear-gradient(135deg, #db2777, #ca8a04)',
  },
];

export interface SkinShardDropReport {
  skinId: SkinId;
  skinName: string;
  badgeColor: string;
  amount: number;
  currentShards: number;
  nextRequired: number;
  rankSpec: SkinRankSpec;
  canAscendNow: boolean;
}

export interface SkinSpec {
  id: SkinId;
  name: string;
  tag: string;
  desc: string;
  statLabel: string;
  statValueAtRank: (rankIdx: number) => string;
  bonusText: string;
  bonusTextAtRank: (rankIdx: number) => string;
  cost: number;
  ascendGoldMult: number;
  previewGradient: string;
  badgeColor: string;
  palette: SkinPalette;
}

export type SquadFinishId =
  | 'candy_gloss'
  | 'brass_steam'
  | 'crystal_jelly'
  | 'starlight_prism';

export interface SquadFinishSpec {
  id: SquadFinishId;
  name: string;
  tag: string;
  desc: string;
  bonusText: string;
  costGold: number;
  costShards: number;
  milestoneEscortClears: number;
  milestoneEscortPct: number;
  milestoneBarricades: number;
  milestoneHint: string;
  previewGradient: string;
  badgeColor: string;
  modeIndex: 0 | 1 | 2 | 3;
  unitRoughness: number;
  unitMetalness: number;
  unitEmissiveIntensity: number;
  rimHex: number;
  specBoost: number;
  cannonBarrelHex: number;
  cannonTrimHex: number;
  cannonMetalness: number;
  cannonRoughness: number;
  cartArmorHex: number;
  cartTrimHex: number;
}

export const SQUAD_FINISH_CATALOG: SquadFinishSpec[] = [
  {
    id: 'candy_gloss',
    name: '蜜糖琉璃釉',
    tag: '经典釉面',
    desc: '高光双点糖衣清漆，波波团与蒸汽炮呈现晶莹Q弹搪胶质感',
    bonusText: '泡泡站生命 +3%',
    costGold: 0,
    costShards: 0,
    milestoneEscortClears: 0,
    milestoneEscortPct: 0,
    milestoneBarricades: 0,
    milestoneHint: '初始解锁',
    previewGradient: 'linear-gradient(135deg, #38bdf8 0%, #fb7185 100%)',
    badgeColor: '#38bdf8',
    modeIndex: 0,
    unitRoughness: 0.14,
    unitMetalness: 0.04,
    unitEmissiveIntensity: 0.05,
    rimHex: 0xffffff,
    specBoost: 1.0,
    cannonBarrelHex: 0xfff8eb,
    cannonTrimHex: 0xd89e32,
    cannonMetalness: 0.12,
    cannonRoughness: 0.24,
    cartArmorHex: 0xfef3c7,
    cartTrimHex: 0xd97706,
  },
  {
    id: 'brass_steam',
    name: '黄铜蒸汽甲',
    tag: '重装金属',
    desc: '抛光赤铜与皇家黄铜蒸汽装甲镀层，战车冲角与炮管闪耀金属光泽',
    bonusText: '冲角与攻城伤害 +10%',
    costGold: 3600,
    costShards: 0,
    milestoneEscortClears: 0,
    milestoneEscortPct: 0,
    milestoneBarricades: 4,
    milestoneHint: '累计撞碎 4 座护送路障可免费解锁',
    previewGradient: 'linear-gradient(135deg, #f59e0b 0%, #b45309 55%, #fef08a 100%)',
    badgeColor: '#f59e0b',
    modeIndex: 1,
    unitRoughness: 0.20,
    unitMetalness: 0.68,
    unitEmissiveIntensity: 0.10,
    rimHex: 0xfbbf24,
    specBoost: 1.18,
    cannonBarrelHex: 0xeab308,
    cannonTrimHex: 0xfef08a,
    cannonMetalness: 0.72,
    cannonRoughness: 0.18,
    cartArmorHex: 0xd97706,
    cartTrimHex: 0xfef08a,
  },
  {
    id: 'crystal_jelly',
    name: '晶透冰果冻',
    tag: '冰晶透光',
    desc: '薄荷冰晶高透果冻折射材质，附带清凉水光边缘与冰晶炮身',
    bonusText: '波波团移速 +6%',
    costGold: 2400,
    costShards: 3,
    milestoneEscortClears: 0,
    milestoneEscortPct: 0,
    milestoneBarricades: 0,
    milestoneHint: '消耗金币与糖衣碎片调配解锁',
    previewGradient: 'linear-gradient(135deg, #2dd4bf 0%, #38bdf8 55%, #cffafe 100%)',
    badgeColor: '#2dd4bf',
    modeIndex: 2,
    unitRoughness: 0.08,
    unitMetalness: 0.14,
    unitEmissiveIntensity: 0.14,
    rimHex: 0x67e8f9,
    specBoost: 1.28,
    cannonBarrelHex: 0xa5f3fc,
    cannonTrimHex: 0x38bdf8,
    cannonMetalness: 0.28,
    cannonRoughness: 0.09,
    cartArmorHex: 0x67e8f9,
    cartTrimHex: 0x0284c7,
  },
  {
    id: 'starlight_prism',
    name: '星芒幻彩棱镜',
    tag: '护送荣耀',
    desc: '全息虹彩星芒棱镜镀膜，随视角流转紫金青极光，战车推进速度飙升',
    bonusText: '全军战力 +5% · 战车推进 +12%',
    costGold: 12000,
    costShards: 5,
    milestoneEscortClears: 1,
    milestoneEscortPct: 60,
    milestoneBarricades: 0,
    milestoneHint: '战车护送推进 ≥60% 或通关 1 次免费解锁',
    previewGradient: 'linear-gradient(135deg, #a855f7 0%, #ec4899 48%, #facc15 100%)',
    badgeColor: '#e879f9',
    modeIndex: 3,
    unitRoughness: 0.10,
    unitMetalness: 0.48,
    unitEmissiveIntensity: 0.18,
    rimHex: 0xe879f9,
    specBoost: 1.32,
    cannonBarrelHex: 0xd8b4fe,
    cannonTrimHex: 0xfacc15,
    cannonMetalness: 0.56,
    cannonRoughness: 0.12,
    cartArmorHex: 0xa855f7,
    cartTrimHex: 0xfacc15,
  },
];

export const SKINS_CATALOG: SkinSpec[] = [
  {
    id: 'azure',
    name: '海盐汽水糖',
    tag: '经典',
    desc: '天蓝、青柠绿与珊瑚粉缤纷三色果冻波波团 + 象牙黄铜蒸汽炮',
    statLabel: '泡泡站生命',
    statValueAtRank: (idx) => {
      const m = SKIN_RANK_SPECS[idx]?.bonusMult || 1;
      return `+${(1.5 * m).toFixed(1).replace(/\.0$/, '')}%`;
    },
    bonusText: '泡泡站生命 +1.5%',
    bonusTextAtRank: (idx) => {
      const m = SKIN_RANK_SPECS[idx]?.bonusMult || 1;
      return `泡泡站生命 +${(1.5 * m).toFixed(1).replace(/\.0$/, '')}%`;
    },
    cost: 0,
    ascendGoldMult: 1.0,
    previewGradient: 'linear-gradient(135deg, #25c4f8, #7ce838, #fb6d7f)',
    badgeColor: '#25c4f8',
    palette: {
      primary: 0x25c4f8,
      secondary: 0x12a4db,
      dark: 0x2c3340,
      accent: 0x67dcff,
      glow: 0xff7ac6,
      emissive: 0x0a2536,
    },
  },
  {
    id: 'crimson',
    name: '草莓甜心冻',
    tag: '人气',
    desc: '蜜桃粉与草莓红Q弹糖果波波团 + 蜜金黄铜蒸汽炮',
    statLabel: '全军战力',
    statValueAtRank: (idx) => {
      const m = SKIN_RANK_SPECS[idx]?.bonusMult || 1;
      return `+${(2 * m).toFixed(1).replace(/\.0$/, '')}%`;
    },
    bonusText: '全军战力 +2%',
    bonusTextAtRank: (idx) => {
      const m = SKIN_RANK_SPECS[idx]?.bonusMult || 1;
      return `全军战力 +${(2 * m).toFixed(1).replace(/\.0$/, '')}%`;
    },
    cost: 5000,
    ascendGoldMult: 1.2,
    previewGradient: 'linear-gradient(135deg, #fb6d7f, #ffb3c1)',
    badgeColor: '#fb6d7f',
    palette: {
      primary: 0xfb6d7f,
      secondary: 0xe64d63,
      dark: 0x3b2229,
      accent: 0xffa6b6,
      glow: 0xffe066,
      emissive: 0x38121a,
    },
  },
  {
    id: 'emerald',
    name: '青苹果软糖',
    tag: '史诗',
    desc: '鲜嫩青柠与薄荷苹果果冻波波团 + 翡翠黄铜蒸汽炮',
    statLabel: '发射射速',
    statValueAtRank: (idx) => {
      const m = SKIN_RANK_SPECS[idx]?.bonusMult || 1;
      return `+${(2 * m).toFixed(1).replace(/\.0$/, '')}%`;
    },
    bonusText: '发射射速 +2%',
    bonusTextAtRank: (idx) => {
      const m = SKIN_RANK_SPECS[idx]?.bonusMult || 1;
      return `发射射速 +${(2 * m).toFixed(1).replace(/\.0$/, '')}%`;
    },
    cost: 12000,
    ascendGoldMult: 1.5,
    previewGradient: 'linear-gradient(135deg, #56d334, #a8f25a)',
    badgeColor: '#58b938',
    palette: {
      primary: 0x7ce838,
      secondary: 0x52c224,
      dark: 0x22361c,
      accent: 0xaef768,
      glow: 0xfff07c,
      emissive: 0x16330e,
    },
  },
  {
    id: 'phantom',
    name: '葡萄星梦冻',
    tag: '史诗',
    desc: '薰衣草紫与香芋牛奶果冻波波团 + 星光偶像荧光棒',
    statLabel: '演出充能',
    statValueAtRank: (idx) => {
      const m = SKIN_RANK_SPECS[idx]?.bonusMult || 1;
      return `+${(4 * m).toFixed(1).replace(/\.0$/, '')}%`;
    },
    bonusText: '演出充能 +4%',
    bonusTextAtRank: (idx) => {
      const m = SKIN_RANK_SPECS[idx]?.bonusMult || 1;
      return `演出充能 +${(4 * m).toFixed(1).replace(/\.0$/, '')}%`;
    },
    cost: 25000,
    ascendGoldMult: 1.8,
    previewGradient: 'linear-gradient(135deg, #a86cf5, #f472b6)',
    badgeColor: '#a86cf5',
    palette: {
      primary: 0xa86cf5,
      secondary: 0x884ce0,
      dark: 0x2a1d3d,
      accent: 0xd4a5ff,
      glow: 0xff85d8,
      emissive: 0x261240,
    },
  },
  {
    id: 'imperium',
    name: '皇家焦糖布丁',
    tag: '传说',
    desc: '黄金奶油布丁波波团 + 皇家纯金雕花蒸汽礼炮',
    statLabel: '赏金收益',
    statValueAtRank: (idx) => {
      const m = SKIN_RANK_SPECS[idx]?.bonusMult || 1;
      return `+${(5 * m).toFixed(1).replace(/\.0$/, '')}%`;
    },
    bonusText: '赏金收益 +5%',
    bonusTextAtRank: (idx) => {
      const m = SKIN_RANK_SPECS[idx]?.bonusMult || 1;
      return `赏金收益 +${(5 * m).toFixed(1).replace(/\.0$/, '')}%`;
    },
    cost: 50000,
    ascendGoldMult: 2.2,
    previewGradient: 'linear-gradient(135deg, #f5b627, #ffe680)',
    badgeColor: '#d99016',
    palette: {
      primary: 0xf7b731,
      secondary: 0xd99316,
      dark: 0x3b2a12,
      accent: 0xffe27a,
      glow: 0xffffff,
      emissive: 0x422b0a,
    },
  },
  {
    id: 'nebula',
    name: '梦幻偶像舞台',
    tag: '神话',
    desc: '樱花粉与苏打蓝渐变应援波波团 + 闪耀演唱会主炮',
    statLabel: '战力与射速',
    statValueAtRank: (idx) => {
      const m = SKIN_RANK_SPECS[idx]?.bonusMult || 1;
      return `+${(4 * m).toFixed(1).replace(/\.0$/, '')}%`;
    },
    bonusText: '战力与射速 +4%',
    bonusTextAtRank: (idx) => {
      const m = SKIN_RANK_SPECS[idx]?.bonusMult || 1;
      return `战力与射速 +${(4 * m).toFixed(1).replace(/\.0$/, '')}%`;
    },
    cost: 100000,
    ascendGoldMult: 3.0,
    previewGradient: 'linear-gradient(135deg, #ff6fa8, #35d0ff)',
    badgeColor: '#ee5c9c',
    palette: {
      primary: 0xff6fa8,
      secondary: 0x25c4f8,
      dark: 0x2e1f38,
      accent: 0x6ce0ff,
      glow: 0xfff08a,
      emissive: 0x3a1028,
    },
  },
];

export interface MechaSpec {
  id: MechaMode;
  icon: string;
  name: string;
  shortName: string;
  desc: string;
  bannerDesc: string;
}

export const MECHA_SPECS: Record<MechaMode, MechaSpec> = {
  hammer: {
    id: 'hammer',
    icon: MECHA_MODE_ART.hammer,
    name: '重锤跃击',
    shortName: '重锤',
    desc: '领队跃击震波+重甲破防180%',
    bannerDesc: '重锤跃击震飞 · 对重甲与首领造成180%暴击',
  },
  pyro: {
    id: 'pyro',
    icon: MECHA_MODE_ART.pyro,
    name: '礼花清场',
    shortName: '礼花',
    desc: '前方扇形星光礼花清场',
    bannerDesc: '星光礼花连射 · 瞬间清扫前排密集敌群',
  },
  aegis: {
    id: 'aegis',
    icon: MECHA_MODE_ART.aegis,
    name: '护盾光环',
    shortName: '护盾',
    desc: '群体护盾+友军减伤回血光环',
    bannerDesc: '守护光环展开 · 周围波波兵减伤50%并持续回血',
  },
};

export const MECHA_ORDER: MechaMode[] = ['hammer', 'pyro', 'aegis'];

export interface WeaponSpec {
  id: WeaponMode;
  icon: string;
  name: string;
  shortName: string;
  desc: string;
  bannerDesc: string;
  fireRateMult: number;
  accentColor: number;
}

export const WEAPON_SPECS: Record<WeaponMode, WeaponSpec> = {
  gatling: {
    id: 'gatling',
    icon: WEAPON_MODE_ART.gatling,
    name: '速射连发炮',
    shortName: '速射',
    desc: '经典高射速蒸汽连发泡泡炮',
    bannerDesc: '经典高射速蒸汽炮 · 稳定连发稳健推线',
    fireRateMult: 1.0,
    accentColor: 0x38bdf8,
  },
  scatter: {
    id: 'scatter',
    icon: WEAPON_MODE_ART.scatter,
    name: '弹射散弹泡泡炮',
    shortName: '散弹',
    desc: '三向扇形弹幕 + 路缘二次弹射压制',
    bannerDesc: '弹射散弹泡泡炮 · 三发扇形齐射并可弹墙折射穿插倍率门',
    fireRateMult: 0.78,
    accentColor: 0x22d3ee,
  },
  rainbow: {
    id: 'rainbow',
    icon: WEAPON_MODE_ART.rainbow,
    name: '蓄力彩虹贯通炮',
    shortName: '彩虹',
    desc: '每4发蓄力释放贯穿全线的彩虹光束与精英泡泡',
    bannerDesc: '蓄力彩虹贯通炮 · 周期贯穿彩虹光束击穿红军并充能倍率门',
    fireRateMult: 0.88,
    accentColor: 0xf472b6,
  },
  twin: {
    id: 'twin',
    icon: WEAPON_MODE_ART.twin,
    name: '双管脉冲炮',
    shortName: '双管',
    desc: '双发并行脉冲速射压制两翼',
    bannerDesc: '双管脉冲炮 · 左右并行发射覆盖宽阔门阵',
    fireRateMult: 0.9,
    accentColor: 0x60a5fa,
  },
  plasma: {
    id: 'plasma',
    icon: WEAPON_MODE_ART.plasma,
    name: '高能等离子炮',
    shortName: '等离子',
    desc: '高伤重装泡泡弹 + 强化倍率充能',
    bannerDesc: '高能等离子炮 · 发射高攻重装波波并加快能量积累',
    fireRateMult: 0.8,
    accentColor: 0xc084fc,
  },
};

export const WEAPON_ORDER: WeaponMode[] = ['gatling', 'scatter', 'rainbow', 'twin', 'plasma'];

export type SkillBranchId = 'swarm' | 'titan' | 'gate' | 'plasma' | 'orbital' | 'bastion' | 'tycoon';

export type SkillNodeId =
  | 'swarm_t1'
  | 'swarm_t2'
  | 'swarm_t3'
  | 'swarm_t4'
  | 'titan_t1'
  | 'titan_t2'
  | 'titan_t3'
  | 'titan_t4'
  | 'gate_t1'
  | 'gate_t2'
  | 'gate_t3'
  | 'gate_t4'
  | 'plasma_t1'
  | 'plasma_t2'
  | 'plasma_t3'
  | 'plasma_t4'
  | 'orbital_t1'
  | 'orbital_t2'
  | 'orbital_t3'
  | 'orbital_t4'
  | 'bastion_t1'
  | 'bastion_t2'
  | 'bastion_t3'
  | 'bastion_t4'
  | 'tycoon_t1'
  | 'tycoon_t2'
  | 'tycoon_t3'
  | 'tycoon_t4';

export interface SkillNodeSpec {
  id: SkillNodeId;
  branchId: SkillBranchId;
  tier: 1 | 2 | 3 | 4;
  icon: string;
  name: string;
  desc: string;
  maxRank: number;
  pointCost: number;
  prereq?: SkillNodeId;
  isKeystone?: boolean;
  statText: (rank: number) => string;
}

export interface SkillBranchSpec {
  id: SkillBranchId;
  icon: string;
  name: string;
  raceName: string;
  unitName: string;
  heroName: string;
  modelDesc: string;
  subtitle: string;
  accentColor: string;
  hammerMorphName: string;
  hammerMorphDesc: string;
  orbitalMorphName: string;
  orbitalMorphDesc: string;
  nodes: SkillNodeSpec[];
}

export const SKILL_TREE_BRANCHES: SkillBranchSpec[] = [
  {
    id: 'swarm',
    icon: RACE_MASCOT_ART.swarm,
    name: '波波族·分裂流',
    raceName: '波波族',
    unitName: '水滴波波',
    heroName: '波波领队',
    modelDesc: '纯白头带 · 双持荧光棒',
    subtitle: '极速分裂 · 退场自爆 · 基地孵兵',
    accentColor: '#25c4f8',
    hammerMorphName: '重锤召唤',
    hammerMorphDesc: '跃击震地召唤波波小队，领队退场分裂多只水滴波波',
    orbitalMorphName: '波波空投',
    orbitalMorphDesc: '礼花光柱化为空投舱，按进阶级数空降大批波波兵',
    nodes: [
      {
        id: 'swarm_t1',
        branchId: 'swarm',
        tier: 1,
        icon: SKILL_NODE_SVGS.swarm_t1,
        name: '双联速射',
        desc: '基础兵化为灵巧水滴波波(移速+10%)，射速与双联齐射率大幅提升',
        maxRank: 3,
        pointCost: 1,
        statText: (r) => `射速+${r * 12}% · 齐射率+${r * 32}% · 波波移速+10%`,
      },
      {
        id: 'swarm_t2',
        branchId: 'swarm',
        tier: 2,
        icon: SKILL_NODE_SVGS.swarm_t2,
        name: '集群加速',
        desc: '场上波波数量越多移速与攻速越快；穿过蓝门有概率额外分裂+1只波波',
        maxRank: 3,
        pointCost: 1,
        prereq: 'swarm_t1',
        statText: (r) => `每15只+${r * 2}%移速 · 过门${r * 15}%额外+1兵`,
      },
      {
        id: 'swarm_t3',
        branchId: 'swarm',
        tier: 3,
        icon: SKILL_NODE_SVGS.swarm_t3,
        name: '退场自爆',
        desc: '波波兵与领队退场时炸开泡泡，对周围敌人造成范围伤害',
        maxRank: 3,
        pointCost: 2,
        prereq: 'swarm_t2',
        statText: (r) => `退场范围伤 ${28 + r * 22}% · 领队分裂${4 + r * 2}兵`,
      },
      {
        id: 'swarm_t4',
        branchId: 'swarm',
        tier: 4,
        icon: SKILL_NODE_SVGS.swarm_t4,
        name: '三联分裂',
        desc: '常驻双/三联齐射，近战击败18%分裂新波波，泡泡站每6.5s自动孵出波波群，解锁【完全体大招】',
        maxRank: 1,
        pointCost: 4,
        prereq: 'swarm_t3',
        isKeystone: true,
        statText: (r) =>
          r > 0 ? '三联齐射 + 击败18%分裂 + 自动孵兵 + 完全体大招' : '效果：三联齐射 + 击败分裂 + 自动孵兵 + 完全体大招',
      },
    ],
  },
  {
    id: 'titan',
    icon: RACE_MASCOT_ART.titan,
    name: '布丁族·合体流',
    raceName: '布丁族',
    unitName: '巨型布丁',
    heroName: '布丁大王',
    modelDesc: '焦糖皇冠 · 华夫大木槌',
    subtitle: '巨化重装 · 范围顺劈 · 吞噬合体',
    accentColor: '#e87e24',
    hammerMorphName: '震地合体',
    hammerMorphDesc: '连环震地破防，震波令周围友军布丁合体升阶',
    orbitalMorphName: '巨型空降',
    orbitalMorphDesc: '空投合体大布丁，并令场上友军布丁升阶进化',
    nodes: [
      {
        id: 'titan_t1',
        branchId: 'titan',
        tier: 1,
        icon: SKILL_NODE_SVGS.titan_t1,
        name: '巨化合体',
        desc: '基础波波巨化且同阶可两两合体！射速降低，单体血量与攻击显著提升',
        maxRank: 3,
        pointCost: 1,
        statText: (r) =>
          `射速-${r === 1 ? 45 : r === 2 ? 52 : 58}% · 体型×${(1.38 + r * 0.12).toFixed(2)} · 血×${(1.55 + r * 0.35).toFixed(2)} 攻×${(1.4 + r * 0.25).toFixed(2)}`,
      },
      {
        id: 'titan_t2',
        branchId: 'titan',
        tier: 2,
        icon: SKILL_NODE_SVGS.titan_t2,
        name: '三阶进化',
        desc: '开放三阶布丁合体上限，每次两两合体获得额外属性增幅',
        maxRank: 3,
        pointCost: 1,
        prereq: 'titan_t1',
        statText: (r) => `开放3阶大布丁 · 合体属性额外+${r * 8}%`,
      },
      {
        id: 'titan_t3',
        branchId: 'titan',
        tier: 3,
        icon: SKILL_NODE_SVGS.titan_t3,
        name: '重击顺劈',
        desc: '大布丁普攻附加范围顺劈与减伤；释放大招可令友军布丁升阶',
        maxRank: 3,
        pointCost: 2,
        prereq: 'titan_t2',
        statText: (r) => `顺劈${10 + r * 8}%范围伤 · 减伤+${r * 5}% · 技能促合体`,
      },
      {
        id: 'titan_t4',
        branchId: 'titan',
        tier: 4,
        icon: SKILL_NODE_SVGS.titan_t4,
        name: '四阶觉醒',
        desc: '蒸汽炮25%概率直出二阶布丁，开放四阶合体上限，双领队同场，解锁【完全体大招】',
        maxRank: 1,
        pointCost: 4,
        prereq: 'titan_t3',
        isKeystone: true,
        statText: (r) =>
          r > 0 ? '25%直出2阶 + 4阶合体 + 双领队 + 完全体大招' : '效果：25%直出2阶 + 4阶合体 + 双领队 + 完全体大招',
      },
    ],
  },
  {
    id: 'gate',
    icon: RACE_MASCOT_ART.gate,
    name: '兔耳族·倍增流',
    raceName: '兔耳族',
    unitName: '兔耳波波',
    heroName: '兔耳领队',
    modelDesc: '萌系长兔耳 · 星光魔法棒',
    subtitle: '蓝门升7阶 · 横幅自喷兵 · 红门翻蓝',
    accentColor: '#ec609e',
    hammerMorphName: '横幅升阶',
    hammerMorphDesc: '跃击升级全图蓝门、将红门翻转为蓝门并喷涌波波兵',
    orbitalMorphName: '红门翻转',
    orbitalMorphDesc: '礼花将红门逆转为蓝门，并令所有蓝门升阶与集体喷兵',
    nodes: [
      {
        id: 'gate_t1',
        branchId: 'gate',
        tier: 1,
        icon: SKILL_NODE_SVGS.gate_t1,
        name: '倍增充能',
        desc: '蓝门充能升级提速，红门翻转加快且扣减降低，附加双联分流',
        maxRank: 3,
        pointCost: 1,
        statText: (r) => `蓝门充能×${r + 1}倍 · 红门逆转+${r * 45}% · 双联+${r * 20}%`,
      },
      {
        id: 'gate_t2',
        branchId: 'gate',
        tier: 2,
        icon: SKILL_NODE_SVGS.gate_t2,
        name: '高阶蓝门',
        desc: '突破蓝门+4上限至最高+7！满级时所有+N门固定额外+1兵',
        maxRank: 3,
        pointCost: 1,
        prereq: 'gate_t1',
        statText: (r) => `蓝门上限升至+${4 + r}${r >= 3 ? ' · 所有+N门额外+1兵' : ''}`,
      },
      {
        id: 'gate_t3',
        branchId: 'gate',
        tier: 3,
        icon: SKILL_NODE_SVGS.gate_t3,
        name: '过门强化',
        desc: '穿过蓝门的波波获得护盾与增伤；每道蓝门定期发射星光并自动喷兵',
        maxRank: 3,
        pointCost: 2,
        prereq: 'gate_t2',
        statText: (r) => `过门血+${r * 16}% 攻+${r * 10}% · 蓝门每4.2s自喷${r}兵`,
      },
      {
        id: 'gate_t4',
        branchId: 'gate',
        tier: 4,
        icon: SKILL_NODE_SVGS.gate_t4,
        name: '双倍倍增',
        desc: '开局自动翻转1座红门，过门22%概率暴击双倍出兵，翻门触发全屏治疗波，解锁【完全体大招】',
        maxRank: 1,
        pointCost: 4,
        prereq: 'gate_t3',
        isKeystone: true,
        statText: (r) =>
          r > 0 ? '开局翻红门 + 22%双倍暴击 + 翻转全屏波 + 完全体大招' : '效果：开局翻红门 + 22%双倍过门 + 完全体大招',
      },
    ],
  },
  {
    id: 'plasma',
    icon: RACE_MASCOT_ART.plasma,
    name: '喵喵族·电音流',
    raceName: '喵喵族',
    unitName: '电音喵兵',
    heroName: '电音领队',
    modelDesc: '猫耳金耳机 · 闪电荧光棒',
    subtitle: '高能暴击 · 连锁闪电 · 落雷激光',
    accentColor: '#e6a100',
    hammerMorphName: '雷电震击',
    hammerMorphDesc: '跃击迸发多道闪电麻痹敌群，并高能强化周围友军',
    orbitalMorphName: '全员超频',
    orbitalMorphDesc: '礼花化为电网，将场上波波集体进化为高能电音兵',
    nodes: [
      {
        id: 'plasma_t1',
        branchId: 'plasma',
        tier: 1,
        icon: SKILL_NODE_SVGS.plasma_t1,
        name: '电音暴击',
        desc: '蒸汽炮高概率射出黄金电音兵，并提升电音兵的暴击伤害与移速',
        maxRank: 3,
        pointCost: 1,
        statText: (r) => `电音兵率+${r * 22}% · 电音暴伤+${r * 16}%`,
      },
      {
        id: 'plasma_t2',
        branchId: 'plasma',
        tier: 2,
        icon: SKILL_NODE_SVGS.plasma_t2,
        name: '连锁闪电',
        desc: '电音兵攻击50%概率触发弹射闪电链，领队跃击迸发全屏电弧',
        maxRank: 3,
        pointCost: 1,
        prereq: 'plasma_t1',
        statText: (r) => `50%弹射${r + 1}道电弧(${40 + r * 12}%伤) · 跃击+${r * 3}道雷`,
      },
      {
        id: 'plasma_t3',
        branchId: 'plasma',
        tier: 3,
        icon: SKILL_NODE_SVGS.plasma_t3,
        name: '落雷破甲',
        desc: '对重甲/首领/护盾造成额外破防与震晕；每隔数秒自动降下落雷',
        maxRank: 3,
        pointCost: 2,
        prereq: 'plasma_t2',
        statText: (r) => `破甲+${r * 18}% · 每${(4.2 - r * 0.5).toFixed(1)}s自动落雷`,
      },
      {
        id: 'plasma_t4',
        branchId: 'plasma',
        tier: 4,
        icon: SKILL_NODE_SVGS.plasma_t4,
        name: '贯穿激光',
        desc: '常驻100%黄金电音兵，每15发普攻或放技能自动齐射3道贯穿激光，解锁【完全体大招】',
        maxRank: 1,
        pointCost: 4,
        prereq: 'plasma_t3',
        isKeystone: true,
        statText: (r) =>
          r > 0 ? '100%电音兵 + 3道贯穿激光 + 完全体大招' : '效果：100%电音兵 + 3道贯穿激光 + 完全体大招',
      },
    ],
  },
  {
    id: 'orbital',
    icon: RACE_MASCOT_ART.orbital,
    name: '云朵族·礼花流',
    raceName: '云朵族',
    unitName: '云朵波波',
    heroName: '云朵领队',
    modelDesc: '蓬松云翼 · 黄金指挥杖',
    subtitle: '飞艇轰炸 · 旋涡聚怪 · 双招互充',
    accentColor: '#a855f7',
    hammerMorphName: '音符飞弹',
    hammerMorphDesc: '跃击齐射追踪音符飞弹，并大幅回充全屏礼花能量',
    orbitalMorphName: '旋涡礼花',
    orbitalMorphDesc: '礼花生成旋涡聚拢敌群，并留下持续灼烧的星火区',
    nodes: [
      {
        id: 'orbital_t1',
        branchId: 'orbital',
        tier: 1,
        icon: SKILL_NODE_SVGS.orbital_t1,
        name: '飞艇轰炸',
        desc: '充能速度与开局能量提升；空中飞艇每隔数秒自动投下礼花弹轰击敌群',
        maxRank: 3,
        pointCost: 1,
        statText: (r) => `充能+${r * 16}% · 每${(5.6 - r * 0.7).toFixed(1)}s飞艇自动轰炸`,
      },
      {
        id: 'orbital_t2',
        branchId: 'orbital',
        tier: 2,
        icon: SKILL_NODE_SVGS.orbital_t2,
        name: '聚怪易伤',
        desc: '飞艇轰炸与大招均产生聚怪旋涡并施加易伤减速；领队跃击齐射追踪飞弹',
        maxRank: 3,
        pointCost: 1,
        prereq: 'orbital_t1',
        statText: (r) => `旋涡聚怪+易伤${15 + r * 10}% · 跃击齐射${r + 1}枚飞弹`,
      },
      {
        id: 'orbital_t3',
        branchId: 'orbital',
        tier: 3,
        icon: SKILL_NODE_SVGS.orbital_t3,
        name: '回能连射',
        desc: '释放任一大招后蒸汽炮进入【速射+双联+高能】过载，并向另一大招返还充能',
        maxRank: 3,
        pointCost: 2,
        prereq: 'orbital_t2',
        statText: (r) => `过载连射${(1.5 + r * 1.3).toFixed(1)}s · 双招互返+${8 + r * 6}%充能`,
      },
      {
        id: 'orbital_t4',
        branchId: 'orbital',
        tier: 4,
        icon: SKILL_NODE_SVGS.orbital_t4,
        name: '全屏星火',
        desc: '飞艇升级双联礼花弹，大招进化为全屏轰炸并留下4.5s灼烧星火区，解锁【完全体大招】',
        maxRank: 1,
        pointCost: 4,
        prereq: 'orbital_t3',
        isKeystone: true,
        statText: (r) =>
          r > 0 ? '双联飞艇轰炸 + 4.5s星火区 + 完全体大招' : '效果：双联轰炸 + 4.5s全屏星火 + 完全体大招',
      },
    ],
  },
  {
    id: 'bastion',
    icon: RACE_MASCOT_ART.bastion,
    name: '曲奇族·堡垒流',
    raceName: '曲奇族',
    unitName: '曲奇盾兵',
    heroName: '曲奇统领',
    modelDesc: '战旗披风 · 黄铜圆盾与长枪',
    subtitle: '全军护盾 · 基地副炮 · 卫队反推',
    accentColor: '#4eb832',
    hammerMorphName: '修复震退',
    hammerMorphDesc: '跃击修复泡泡站与友军生命，并强力震退敌群与震碎障碍',
    orbitalMorphName: '卫队空降',
    orbitalMorphDesc: '礼花修复泡泡站、震碎障碍，并在防线前空投重装曲奇卫队',
    nodes: [
      {
        id: 'bastion_t1',
        branchId: 'bastion',
        tier: 1,
        icon: SKILL_NODE_SVGS.bastion_t1,
        name: '坚固盾甲',
        desc: '泡泡站生命提升且每秒自愈；所有出战波波手执圆盾，血量与减伤显著提升',
        maxRank: 3,
        pointCost: 1,
        statText: (r) => `泡泡站HP+${r * 18}% · 全军血量+${r * 18}% 减伤+${r * 8}%`,
      },
      {
        id: 'bastion_t2',
        branchId: 'bastion',
        tier: 2,
        icon: SKILL_NODE_SVGS.bastion_t2,
        name: '基地副炮',
        desc: '泡泡站两侧架设双联副炮，自动远距轰击桥面敌人并附带击退',
        maxRank: 3,
        pointCost: 1,
        prereq: 'bastion_t1',
        statText: (r) => `双副炮每${(1.45 - r * 0.2).toFixed(2)}s远距轰击 (${22 + r * 14}×战力)`,
      },
      {
        id: 'bastion_t3',
        branchId: 'bastion',
        tier: 3,
        icon: SKILL_NODE_SVGS.bastion_t3,
        name: '重装卫士',
        desc: '攻城破障增伤且大幅减免地形伤害；每隔数发普攻直接派出1名重装卫士',
        maxRank: 3,
        pointCost: 2,
        prereq: 'bastion_t2',
        statText: (r) => `攻城+${r * 20}% · 每${13 - r * 2}发普攻直出1名重装卫士`,
      },
      {
        id: 'bastion_t4',
        branchId: 'bastion',
        tier: 4,
        icon: SKILL_NODE_SVGS.bastion_t4,
        name: '守护反推',
        desc: '每9.5s或泡泡站受损时自动爆发全屏反推波并空投4名重装卫士，解锁【完全体大招】',
        maxRank: 1,
        pointCost: 4,
        prereq: 'bastion_t3',
        isKeystone: true,
        statText: (r) =>
          r > 0 ? '周期全屏反推波 + 4名重装卫士 + 完全体大招' : '效果：全屏守护反推波 + 4名卫士 + 完全体大招',
      },
    ],
  },
  {
    id: 'tycoon',
    icon: RACE_MASCOT_ART.tycoon,
    name: '招财族·赏金流',
    raceName: '招财族',
    unitName: '招财波波',
    heroName: '招财领队',
    modelDesc: '招财金角 · 聚宝金币筒',
    subtitle: '高倍爆金 · 升级打折 · 存款增伤',
    accentColor: '#e09b14',
    hammerMorphName: '震地爆金',
    hammerMorphDesc: '领队每次跃击震地爆出金币喷泉，并附带高额破防伤害',
    orbitalMorphName: '招财礼花',
    orbitalMorphDesc: '礼花清场爆高倍金币，并召唤黄金送宝猪与招财小队',
    nodes: [
      {
        id: 'tycoon_t1',
        branchId: 'tycoon',
        tier: 1,
        icon: SKILL_NODE_SVGS.tycoon_t1,
        name: '击败爆金',
        desc: '全渠道金币大幅提升，击败敌人30%概率额外爆金，释放大招直接喷发金币',
        maxRank: 3,
        pointCost: 1,
        statText: (r) => `赏金+${r * 16}% · 击败爆金 · 跃击每下+${r * 6 + 5}金币`,
      },
      {
        id: 'tycoon_t2',
        branchId: 'tycoon',
        tier: 2,
        icon: SKILL_NODE_SVGS.tycoon_t2,
        name: '升级折扣',
        desc: '局内升级大幅打折；黄金送宝怪刷新加快、移速变慢且爆金量提升50%',
        maxRank: 3,
        pointCost: 1,
        prereq: 'tycoon_t1',
        statText: (r) => `局内升级-${r * 10}% · 送宝怪高频慢速且赏金+50%`,
      },
      {
        id: 'tycoon_t3',
        branchId: 'tycoon',
        tier: 3,
        icon: SKILL_NODE_SVGS.tycoon_t3,
        name: '存款增伤',
        desc: '持有的金币存款按比例转化为全军战力；普攻有概率射出黄金招财兵(击败必爆金)',
        maxRank: 3,
        pointCost: 2,
        prereq: 'tycoon_t2',
        statText: (r) => `存款最高+${r * 22}%战力 · 普攻${r * 10}%射出招财兵`,
      },
      {
        id: 'tycoon_t4',
        branchId: 'tycoon',
        tier: 4,
        icon: SKILL_NODE_SVGS.tycoon_t4,
        name: '招财空投',
        desc: '每赚180金币或放技能自动空投5只招财精英兵，局内升级20%免单连升，解锁【完全体大招】',
        maxRank: 1,
        pointCost: 4,
        prereq: 'tycoon_t3',
        isKeystone: true,
        statText: (r) =>
          r > 0 ? '赚金空投招财兵 + 20%升级免单 + 完全体大招' : '效果：空投招财精英兵 + 升级免单 + 完全体大招',
      },
    ],
  },
];

export const ALL_SKILL_NODES: SkillNodeSpec[] = SKILL_TREE_BRANCHES.flatMap((b) => b.nodes);

export type BuffId =
  | 'rapid_fire'
  | 'hyper_gene'
  | 'split_chamber'
  | 'nitro_stride'
  | 'titan_reactor'
  | 'bastion_aegis'
  | 'plasma_crit'
  | 'gate_resonance'
  | 'siege_breaker'
  | 'war_plunder';

export type BuffRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type DebuffId =
  | 'barrel_overheat'
  | 'gene_instability'
  | 'shield_fracture'
  | 'reactor_leak'
  | 'cryo_sludge';

export interface ActiveDebuff {
  id: DebuffId;
  icon: string;
  title: string;
  desc: string;
  shortText: string;
  remainingStages: number;
}

export interface DefeatPenaltyReport {
  lostBuffTitle: string | null;
  lostBuffIcon: string | null;
  lostGold: number;
  inflictedDebuff: ActiveDebuff;
  cleanseCost: number;
}

export interface RewardOption {
  id: BuffId;
  icon: string;
  title: string;
  rarity: BuffRarity;
  rarityLabel: string;
  stacksGranted: number;
  desc: string;
  currentText: string;
}

export interface LeaderboardEntry {
  playerId?: string;
  name: string;
  bestStage: number;
  totalKills: number;
  playTimeSeconds?: number;
  skinName: string;
  badgeColor: string;
  isBot?: boolean;
  isSelf?: boolean;
}

export const DEFAULT_LEADERBOARD: LeaderboardEntry[] = [
  { name: '好男人未来', bestStage: 28, totalKills: 48620, playTimeSeconds: 14820, skinName: '梦幻偶像舞台', badgeColor: '#ee5c9c', isBot: true },
  { name: '星梦应援团长', bestStage: 23, totalKills: 36410, playTimeSeconds: 11580, skinName: '皇家焦糖布丁', badgeColor: '#d99016', isBot: true },
  { name: '焦糖布丁大王', bestStage: 19, totalKills: 29850, playTimeSeconds: 9420, skinName: '皇家焦糖布丁', badgeColor: '#d99016', isBot: true },
  { name: '电音喵喵DJ', bestStage: 16, totalKills: 23190, playTimeSeconds: 7650, skinName: '葡萄星梦冻', badgeColor: '#a86cf5', isBot: true },
  { name: '兔耳魔法师', bestStage: 14, totalKills: 19400, playTimeSeconds: 6380, skinName: '葡萄星梦冻', badgeColor: '#a86cf5', isBot: true },
  { name: '青柠汽水波波', bestStage: 12, totalKills: 15820, playTimeSeconds: 5120, skinName: '青苹果软糖', badgeColor: '#58b938', isBot: true },
  { name: '蒸汽工坊克星', bestStage: 9, totalKills: 11260, playTimeSeconds: 3840, skinName: '青苹果软糖', badgeColor: '#58b938', isBot: true },
  { name: '草莓甜心主唱', bestStage: 6, totalKills: 7450, playTimeSeconds: 2560, skinName: '草莓甜心冻', badgeColor: '#fb6d7f', isBot: true },
  { name: '泡泡站长老王', bestStage: 4, totalKills: 4680, playTimeSeconds: 1620, skinName: '草莓甜心冻', badgeColor: '#fb6d7f', isBot: true },
  { name: '见习应援生', bestStage: 2, totalKills: 1920, playTimeSeconds: 780, skinName: '海盐汽水糖', badgeColor: '#25c4f8', isBot: true },
];

export interface SaveState {
  gold: number;
  unlockedLevel: number;
  currentLevelIndex: number;
  fireRateLevel: number;
  powerLevel: number;
  championLevel: number;
  lootLevel: number;
  weapon?: WeaponMode;
  mechaMode?: MechaMode;
  metaLevels?: Partial<Record<MetaUpgradeId, number>>;
  ownedSkins?: SkinId[];
  equippedSkin?: SkinId;
  skinRanks?: Partial<Record<SkinId, number>>;
  skinShards?: Partial<Record<SkinId, number>>;
  ownedFinishes?: SquadFinishId[];
  equippedFinish?: SquadFinishId;
  playerId?: string;
  playerName?: string;
  bestStageCleared?: number;
  bestEndlessWave?: number;
  bestEscortProgressPct?: number;
  bestEscortClearSec?: number;
  escortClears?: number;
  totalBarricadesBroken?: number;
  mechaCoreLevel?: number;
  mechaCannonLevel?: number;
  totalMechaSummons?: number;
  totalMechaSmashes?: number;
  claimedMechaMilestoneTier?: number;
  equippedSubWeapon?: TacticalSubWeaponId;
  subWeaponLevels?: Partial<Record<TacticalSubWeaponId, number>>;
  totalSubWeaponCasts?: number;
  tournamentStage?: TournamentStageId;
  tournamentWinStreak?: number;
  tournamentCupTier?: number;
  tournamentTrophies?: number;
  tournamentBricks?: number;
  pendingTournamentChestStage?: 0 | 1 | 2 | 3;
  tournamentChestsClaimed?: number;
  clockworkCores?: number;
  colossusRaidClears?: number;
  totalColossusWeakpointsBroken?: number;
  bestColossusClearSec?: number;
  boboTechLevels?: Partial<Record<BoboTechBranchId, number>>;
  activeBoboTechDoctrine?: BoboTechBranchId;
  airshipWingMedals?: number;
  lifetimeAirshipWingMedals?: number;
  airshipEscortClears?: number;
  bestAirshipProgressPct?: number;
  bestAirshipClearSec?: number;
  totalAirshipDropPods?: number;
  totalAntiAirTurretsCleared?: number;
  cannonModLevels?: Partial<Record<CannonCoreModId, number>>;
  activeCannonMod?: CannonCoreModId;
  totalCannonModBursts?: number;
  trainGoldMedals?: number;
  lifetimeTrainGoldMedals?: number;
  candyTrainRaidClears?: number;
  bestTrainCarsBroken?: number;
  bestTrainClearSec?: number;
  totalTrainCarsBroken?: number;
  totalTrainTreasureLooted?: number;
  relicBannerLevels?: Partial<Record<RelicBannerId, number>>;
  activeRelicBanner?: RelicBannerId;
  totalRelicBannerProcs?: number;
  deepPearls?: number;
  lifetimeDeepPearls?: number;
  submarineRescueClears?: number;
  bestSubmarineRescuedBobos?: number;
  bestSubmarineClearSec?: number;
  totalBubblesPopped?: number;
  totalJellyfishCleared?: number;
  totalCoralBroken?: number;
  petLevels?: Partial<Record<PetCompanionId, number>>;
  activePet?: PetCompanionId;
  totalPetProcs?: number;
  iceMedals?: number;
  lifetimeIceMedals?: number;
  glacierSledClears?: number;
  bestSledFinishSec?: number;
  bestSledSurvivors?: number;
  totalSledGatesPassed?: number;
  totalSledRidersLost?: number;
  trophyHallSlots?: number;
  trophyDisplay?: Array<HallTrophyId | null>;
  lavaCores?: number;
  lifetimeLavaCores?: number;
  lavaJumpClears?: number;
  bestLavaFinishSec?: number;
  bestLavaSurvivors?: number;
  totalLavaHops?: number;
  totalLavaBobosLost?: number;
  ownedGachaSkins?: GachaSkinId[];
  equippedGachaSkin?: GachaSkinId | null;
  gachaPity?: number;
  gachaSsrPity?: number;
  totalGachaRolls?: number;
  stardustBadges?: number;
  lifetimeStardustBadges?: number;
  asteroidDashClears?: number;
  bestAsteroidFinishSec?: number;
  bestAsteroidSurvivors?: number;
  totalAsteroidShieldBlocks?: number;
  totalAsteroidBobosLost?: number;
  ownedDecorThemes?: DecorThemeId[];
  activeDecorTheme?: DecorThemeId;
  ownedDecorProps?: DecorPropId[];
  decorSlots?: Array<DecorPropId | null>;
  pumpkinBadges?: number;
  lifetimePumpkinBadges?: number;
  pumpkinNightClears?: number;
  bestPumpkinFinishSec?: number;
  bestPumpkinSurvivors?: number;
  totalPumpkinGhostsDispelled?: number;
  totalPumpkinBobosLost?: number;
  ownedTacticCards?: TacticCardId[];
  tacticDeck?: Array<TacticCardId | null>;
  totalTacticTriggers?: number;
  tacticCampaignEnabled?: boolean;
  scarabBadges?: number;
  lifetimeScarabBadges?: number;
  pyramidRunClears?: number;
  bestPyramidFinishSec?: number;
  bestPyramidSurvivors?: number;
  totalPyramidTrapsDodged?: number;
  totalPyramidBobosLost?: number;
  emeraldIdolBadges?: number;
  lifetimeEmeraldIdolBadges?: number;
  jungleSwingClears?: number;
  bestJungleFinishSec?: number;
  bestJungleSurvivors?: number;
  totalJungleTrapsDodged?: number;
  totalJungleBobosLost?: number;
  goldSkullBadges?: number;
  lifetimeGoldSkullBadges?: number;
  pirateBoardingClears?: number;
  bestPirateFinishSec?: number;
  bestPirateSurvivors?: number;
  totalPirateTrapsDodged?: number;
  totalPirateBobosLost?: number;
  totalMatchesPlayed?: number;
  lifetimeKills?: number;
  playTimeSeconds?: number;
  leaderboardWeekKey?: string;
  weeklyBestStage?: number;
  weeklyKills?: number;
  weeklyPlayTimeSeconds?: number;
  skillNodes?: Partial<Record<SkillNodeId, number>>;
  selectedRaceId?: SkillBranchId;
  bonusTalentPoints?: number;
  skillRespecCount?: number;
  stagesPlayedSinceRespec?: number;
  lastShareBonusDate?: string;
  claimedReferralFrom?: string;
  buffStacks: Partial<Record<BuffId, number>>;
  activeDebuffs: ActiveDebuff[];
}

const STORAGE_KEY = 'swarm_control_3d_save_v3';

export const DEBUFF_CATALOG: Omit<ActiveDebuff, 'remainingStages'>[] = [
  {
    id: 'barrel_overheat',
    icon: DEBUFF_ART.barrel_overheat,
    title: '蒸汽阀泄压',
    desc: '蒸汽炮气压表波动，发射射速降低 15%',
    shortText: '射速-15%',
  },
  {
    id: 'gene_instability',
    icon: DEBUFF_ART.gene_instability,
    title: '糖分不足疲软',
    desc: '波波果冻团缺乏糖分补给，全军生命与攻击降低 15%',
    shortText: '战力-15%',
  },
  {
    id: 'shield_fracture',
    icon: DEBUFF_ART.shield_fracture,
    title: '泡泡站围栏破损',
    desc: '我方泡泡站防护受损，最大生命值降低 25%',
    shortText: '泡泡站HP-25%',
  },
  {
    id: 'reactor_leak',
    icon: DEBUFF_ART.reactor_leak,
    title: '音响扩音受阻',
    desc: '安可演唱会与礼花秀充能效率降低 30%',
    shortText: '充能-30%',
  },
  {
    id: 'cryo_sludge',
    icon: DEBUFF_ART.cryo_sludge,
    title: '工坊黑油沾染',
    desc: '鞋底沾上厂房黑机油，波波团冲锋移速降低 12%',
    shortText: '移速-12%',
  },
];

export const RENAME_GOLD_COST = 100000;

export class GameState {
  public gold = 160;
  public unlockedLevel = 50;
  public currentLevelIndex = 0;

  public fireRateLevel = 1;
  public powerLevel = 1;
  public championLevel = 1;
  public lootLevel = 1;

  // Out-of-match Meta-Progression (Permanent Base Tech Upgrades & High-Price Armory Skins)
  public metaLevels: Partial<Record<MetaUpgradeId, number>> = {};
  public ownedSkins: SkinId[] = ['azure'];
  public equippedSkin: SkinId = 'azure';
  public skinRanks: Partial<Record<SkinId, number>> = {};
  public skinShards: Partial<Record<SkinId, number>> = {};
  public ownedFinishes: SquadFinishId[] = ['candy_gloss'];
  public equippedFinish: SquadFinishId = 'candy_gloss';

  // 7-Branch Tactical Race & Skill Tree State
  public skillNodes: Partial<Record<SkillNodeId, number>> = {};
  public selectedRaceId: SkillBranchId = 'swarm';
  public bonusTalentPoints = 0;
  public skillRespecCount = 0;
  public stagesPlayedSinceRespec = 0;
  public lastShareBonusDate = '';
  public claimedReferralFrom = '';

  // Commander Profile & Leaderboard Stats
  public playerId = `cmd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  public playerName = `指挥官${Math.floor(1000 + Math.random() * 9000)}`;
  public bestStageCleared = 0;
  public bestEndlessWave = 0;
  public bestEscortProgressPct = 0;
  public bestEscortClearSec = 0;
  public escortClears = 0;
  public totalBarricadesBroken = 0;
  public mechaCoreLevel = 0;
  public mechaCannonLevel = 0;
  public totalMechaSummons = 0;
  public totalMechaSmashes = 0;
  public claimedMechaMilestoneTier = 0;

  // MC-7: Leader Tactical Sub-Weapon Slot & Gear Summit Tournament
  public equippedSubWeapon: TacticalSubWeaponId = 'electro_net';
  public subWeaponLevels: Record<TacticalSubWeaponId, number> = {
    electro_net: 1,
    syrup_bubble: 1,
    rally_horn: 1,
  };
  public totalSubWeaponCasts = 0;
  public tournamentStage: TournamentStageId = 1;
  public tournamentWinStreak = 0;
  public tournamentCupTier = 1;
  public tournamentTrophies = 0;
  public tournamentBricks = 0;
  public pendingTournamentChestStage: 0 | 1 | 2 | 3 = 0;
  public tournamentChestsClaimed = 0;

  // MC-8: Giant Clockwork Toy Colossus Raid & Bobo 3-Branch Specialization Tech Tree
  public clockworkCores = 0;
  public colossusRaidClears = 0;
  public totalColossusWeakpointsBroken = 0;
  public bestColossusClearSec = 0;
  public boboTechLevels: Record<BoboTechBranchId, number> = {
    vanguard_charge: 0,
    heavy_siege: 0,
    candy_bombard: 0,
  };
  public activeBoboTechDoctrine: BoboTechBranchId = 'vanguard_charge';

  // MC-9: Cloud Airship Mothership Escort & Steam Cannon Core Module Workbench
  public airshipWingMedals = 0;
  public lifetimeAirshipWingMedals = 0;
  public airshipEscortClears = 0;
  public bestAirshipProgressPct = 0;
  public bestAirshipClearSec = 0;
  public totalAirshipDropPods = 0;
  public totalAntiAirTurretsCleared = 0;
  public cannonModLevels: Record<CannonCoreModId, number> = {
    overdrive_breech: 1,
    prism_splitter: 0,
    heavy_mortar: 0,
  };
  public activeCannonMod: CannonCoreModId = 'overdrive_breech';
  public totalCannonModBursts = 0;

  // MC-10: Rainbow Candy Train Raid & Bobo Squad Relic Banner Stand
  public trainGoldMedals = 0;
  public lifetimeTrainGoldMedals = 0;
  public candyTrainRaidClears = 0;
  public bestTrainCarsBroken = 0;
  public bestTrainClearSec = 0;
  public totalTrainCarsBroken = 0;
  public totalTrainTreasureLooted = 0;
  public relicBannerLevels: Record<RelicBannerId, number> = {
    gale_charge: 1,
    holy_shield: 0,
    star_carnival: 0,
  };
  public activeRelicBanner: RelicBannerId = 'gale_charge';
  public totalRelicBannerProcs = 0;

  // MC-11: Deep-Sea Submarine Bubble Rescue & Bobo Squad Pet Companion Dock
  public deepPearls = 0;
  public lifetimeDeepPearls = 0;
  public submarineRescueClears = 0;
  public bestSubmarineRescuedBobos = 0;
  public bestSubmarineClearSec = 0;
  public totalBubblesPopped = 0;
  public totalJellyfishCleared = 0;
  public totalCoralBroken = 0;
  /** Starter gift: the 果冻泡泡水母 is adopted at Lv.1 so one pet always follows the squad. */
  public petLevels: Record<PetCompanionId, number> = {
    jelly_puff: 1,
    shell_turtle: 0,
    spark_seahorse: 0,
  };
  public activePet: PetCompanionId = 'jelly_puff';
  public totalPetProcs = 0;

  // MC-12: Glacier Sled Race (冰晶奖章) & Bobo Squad Honor Trophy Hall
  public iceMedals = 0;
  public lifetimeIceMedals = 0;
  public glacierSledClears = 0;
  public bestSledFinishSec = 0;
  public bestSledSurvivors = 0;
  public totalSledGatesPassed = 0;
  public totalSledRidersLost = 0;
  /** Unlocked display slots in the trophy hall (slot #1 is free). */
  public trophyHallSlots = 1;
  /** Trophy placed in each of the 6 display slots (null = empty). */
  public trophyDisplay: Array<HallTrophyId | null> = [null, null, null, null, null, null];

  // MC-13: Volcano Lava Jump Breakout (熔岩晶核) & Bobo Squad Skin Gacha Machine
  public lavaCores = 0;
  public lifetimeLavaCores = 0;
  public lavaJumpClears = 0;
  public bestLavaFinishSec = 0;
  public bestLavaSurvivors = 0;
  public totalLavaHops = 0;
  public totalLavaBobosLost = 0;
  public ownedGachaSkins: GachaSkinId[] = [];
  /** Equipped gacha skin (null = the plain colorway look). */
  public equippedGachaSkin: GachaSkinId | null = null;
  /** Rolls since the last 史诗-or-better (0..GACHA_PITY_SR - 1). */
  public gachaPity = 0;
  /** Rolls since the last 传说 (0..GACHA_PITY_SSR - 1). */
  public gachaSsrPity = 0;
  public totalGachaRolls = 0;

  // MC-14: Asteroid Belt Shield Breakout (星尘徽章) & Themed Lobby Decoration Hall
  public stardustBadges = 0;
  public lifetimeStardustBadges = 0;
  public asteroidDashClears = 0;
  public bestAsteroidFinishSec = 0;
  public bestAsteroidSurvivors = 0;
  public totalAsteroidShieldBlocks = 0;
  public totalAsteroidBobosLost = 0;
  /** Owned lobby themes (海军蓝应援厅 is always owned). */
  public ownedDecorThemes: DecorThemeId[] = ['navy_classic'];
  public activeDecorTheme: DecorThemeId = 'navy_classic';
  public ownedDecorProps: DecorPropId[] = [];
  /** Decor prop placed in each of the 4 lobby room corners (null = empty). */
  public decorSlots: Array<DecorPropId | null> = [null, null, null, null];

  // MC-15: Haunted Castle Pumpkin Night (南瓜灯徽章) & Bobo Squad Tactic Deck
  public pumpkinBadges = 0;
  public lifetimePumpkinBadges = 0;
  public pumpkinNightClears = 0;
  public bestPumpkinFinishSec = 0;
  public bestPumpkinSurvivors = 0;
  public totalPumpkinGhostsDispelled = 0;
  public totalPumpkinBobosLost = 0;
  /** Tactic cards unlocked with coins / mode currencies. */
  public ownedTacticCards: TacticCardId[] = [];
  /** The 3-card deck taken into the next match (null = empty slot). */
  public tacticDeck: Array<TacticCardId | null> = [null, null, null];
  public totalTacticTriggers = 0;
  /** MC-16: the deck also fires in main-campaign stages (at TACTIC_CAMPAIGN_EFFECT_MULT); off = campaign runs card-free. */
  public tacticCampaignEnabled = true;

  // MC-16: Desert Pyramid Trap Run (圣甲虫徽章)
  public scarabBadges = 0;
  public lifetimeScarabBadges = 0;
  public pyramidRunClears = 0;
  public bestPyramidFinishSec = 0;
  public bestPyramidSurvivors = 0;
  public totalPyramidTrapsDodged = 0;
  public totalPyramidBobosLost = 0;

  // MC-17: Jungle Temple Vine Swing (翡翠神像徽章)
  public emeraldIdolBadges = 0;
  public lifetimeEmeraldIdolBadges = 0;
  public jungleSwingClears = 0;
  public bestJungleFinishSec = 0;
  public bestJungleSurvivors = 0;
  public totalJungleTrapsDodged = 0;
  public totalJungleBobosLost = 0;
  // MC-18: Pirate Plank Breakout (金骷髅徽章)
  public goldSkullBadges = 0;
  public lifetimeGoldSkullBadges = 0;
  public pirateBoardingClears = 0;
  public bestPirateFinishSec = 0;
  public bestPirateSurvivors = 0;
  public totalPirateTrapsDodged = 0;
  public totalPirateBobosLost = 0;

  public totalMatchesPlayed = 0;
  public lifetimeKills = 0;
  public playTimeSeconds = 0;
  public leaderboardWeekKey = '';
  public weeklyBestStage = 0;
  public weeklyKills = 0;
  public weeklyPlayTimeSeconds = 0;
  private playTimeSaveAccum = 0;
  public remoteLeaderboard: LeaderboardEntry[] = [...DEFAULT_LEADERBOARD];
  public remoteActiveLeaderboard: LeaderboardEntry[] = [...DEFAULT_LEADERBOARD];
  public remoteRealPlayerCount = 0;

  // Post-stage Rogue-lite Buff Stacks & Defeat Affliction Debuffs
  public buffStacks: Partial<Record<BuffId, number>> = {};
  public activeDebuffs: ActiveDebuff[] = [];

  public weapon: WeaponMode = 'gatling';
  public mechaMode: MechaMode = 'hammer';
  public championCharge = 25;
  public orbitalCharge = 15;
  public mechaOverlordCharge = 35;
  public subWeaponCharge = 100;

  public stageClonesSpawned = 0;
  public stageMutantsKilled = 0;
  public stageGoldEarned = 0;
  public runCombatTimePool = 0;
  public runKillsPool = 0;
  public runSpawnsPool = 0;
  public runSiegePool = 0;
  public activeSceneThemeId: ThemeId = 'wasteland';

  constructor() {
    this.leaderboardWeekKey = this.getLeaderboardWeekInfo().weekKey;
    this.load();
  }

  public load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<SaveState>;
      if (typeof parsed.gold === 'number') this.gold = parsed.gold;
      // Always default to Stage 1 (index 0) and fresh Lv.1 in-run state on startup
      this.currentLevelIndex = 0;
      this.fireRateLevel = 1;
      this.powerLevel = 1;
      this.championLevel = 1;
      this.lootLevel = 1;
      this.buffStacks = {};
      this.activeDebuffs = [];
      if (parsed.weapon && WEAPON_SPECS[parsed.weapon]) {
        this.weapon = parsed.weapon;
      }
      if (parsed.mechaMode && MECHA_SPECS[parsed.mechaMode]) {
        this.mechaMode = parsed.mechaMode;
      }
      if (parsed.metaLevels && typeof parsed.metaLevels === 'object') {
        this.metaLevels = { ...parsed.metaLevels };
      }
      if (Array.isArray(parsed.ownedSkins) && parsed.ownedSkins.length > 0) {
        this.ownedSkins = Array.from(new Set(['azure', ...parsed.ownedSkins]));
      }
      if (parsed.equippedSkin && this.ownedSkins.includes(parsed.equippedSkin)) {
        this.equippedSkin = parsed.equippedSkin;
      }
      if (parsed.skinRanks && typeof parsed.skinRanks === 'object') {
        this.skinRanks = { ...parsed.skinRanks };
      }
      if (parsed.skinShards && typeof parsed.skinShards === 'object') {
        this.skinShards = { ...parsed.skinShards };
      }
      if (Array.isArray(parsed.ownedFinishes) && parsed.ownedFinishes.length > 0) {
        const validIds = new Set(SQUAD_FINISH_CATALOG.map((f) => f.id));
        const filtered = parsed.ownedFinishes.filter((fid): fid is SquadFinishId => validIds.has(fid));
        this.ownedFinishes = Array.from(new Set<SquadFinishId>(['candy_gloss', ...filtered]));
      }
      if (parsed.equippedFinish && this.ownedFinishes.includes(parsed.equippedFinish)) {
        this.equippedFinish = parsed.equippedFinish;
      }
      if (typeof parsed.playerId === 'string' && parsed.playerId.trim()) {
        this.playerId = parsed.playerId.trim().slice(0, 40);
      }
      if (typeof parsed.playerName === 'string' && parsed.playerName.trim()) {
        this.playerName = parsed.playerName.trim().slice(0, 14);
      }
      if (typeof parsed.bestStageCleared === 'number') {
        this.bestStageCleared = Math.max(0, parsed.bestStageCleared);
      }
      if (typeof parsed.bestEndlessWave === 'number') {
        this.bestEndlessWave = Math.max(0, Math.floor(parsed.bestEndlessWave));
      }
      if (typeof parsed.bestEscortProgressPct === 'number') {
        this.bestEscortProgressPct = Math.max(0, Math.min(100, Math.round(parsed.bestEscortProgressPct)));
      }
      if (typeof parsed.bestEscortClearSec === 'number') {
        this.bestEscortClearSec = Math.max(0, Number(parsed.bestEscortClearSec.toFixed(1)));
      }
      if (typeof parsed.escortClears === 'number') {
        this.escortClears = Math.max(0, Math.floor(parsed.escortClears));
      }
      if (typeof parsed.totalBarricadesBroken === 'number') {
        this.totalBarricadesBroken = Math.max(0, Math.floor(parsed.totalBarricadesBroken));
      }
      if (typeof parsed.mechaCoreLevel === 'number') {
        this.mechaCoreLevel = Math.max(0, Math.min(12, Math.floor(parsed.mechaCoreLevel)));
      }
      if (typeof parsed.mechaCannonLevel === 'number') {
        this.mechaCannonLevel = Math.max(0, Math.min(12, Math.floor(parsed.mechaCannonLevel)));
      }
      if (typeof parsed.totalMechaSummons === 'number') {
        this.totalMechaSummons = Math.max(0, Math.floor(parsed.totalMechaSummons));
      }
      if (typeof parsed.totalMechaSmashes === 'number') {
        this.totalMechaSmashes = Math.max(0, Math.floor(parsed.totalMechaSmashes));
      }
      if (typeof parsed.claimedMechaMilestoneTier === 'number') {
        this.claimedMechaMilestoneTier = Math.max(0, Math.min(4, Math.floor(parsed.claimedMechaMilestoneTier)));
      }
      if (parsed.equippedSubWeapon && TACTICAL_SUBWEAPONS[parsed.equippedSubWeapon]) {
        this.equippedSubWeapon = parsed.equippedSubWeapon;
      }
      if (parsed.subWeaponLevels && typeof parsed.subWeaponLevels === 'object') {
        for (const swId of TACTICAL_SUBWEAPON_ORDER) {
          const rawLvl = parsed.subWeaponLevels[swId];
          if (typeof rawLvl === 'number' && Number.isFinite(rawLvl)) {
            this.subWeaponLevels[swId] = Math.max(
              1,
              Math.min(TACTICAL_SUBWEAPON_MAX_LEVEL, Math.floor(rawLvl))
            );
          }
        }
      }
      if (typeof parsed.totalSubWeaponCasts === 'number') {
        this.totalSubWeaponCasts = Math.max(0, Math.floor(parsed.totalSubWeaponCasts));
      }
      if (parsed.tournamentStage === 1 || parsed.tournamentStage === 2 || parsed.tournamentStage === 3) {
        this.tournamentStage = parsed.tournamentStage;
      }
      if (typeof parsed.tournamentWinStreak === 'number') {
        this.tournamentWinStreak = Math.max(0, Math.floor(parsed.tournamentWinStreak));
      }
      if (typeof parsed.tournamentCupTier === 'number') {
        this.tournamentCupTier = Math.max(1, Math.floor(parsed.tournamentCupTier));
      }
      if (typeof parsed.tournamentTrophies === 'number') {
        this.tournamentTrophies = Math.max(0, Math.floor(parsed.tournamentTrophies));
      }
      if (typeof parsed.tournamentBricks === 'number') {
        this.tournamentBricks = Math.max(0, Math.floor(parsed.tournamentBricks));
      }
      if (
        parsed.pendingTournamentChestStage === 0 ||
        parsed.pendingTournamentChestStage === 1 ||
        parsed.pendingTournamentChestStage === 2 ||
        parsed.pendingTournamentChestStage === 3
      ) {
        this.pendingTournamentChestStage = parsed.pendingTournamentChestStage;
      }
      if (typeof parsed.tournamentChestsClaimed === 'number') {
        this.tournamentChestsClaimed = Math.max(0, Math.floor(parsed.tournamentChestsClaimed));
      }
      if (typeof parsed.clockworkCores === 'number' && Number.isFinite(parsed.clockworkCores)) {
        this.clockworkCores = Math.max(0, Math.floor(parsed.clockworkCores));
      }
      if (typeof parsed.colossusRaidClears === 'number' && Number.isFinite(parsed.colossusRaidClears)) {
        this.colossusRaidClears = Math.max(0, Math.floor(parsed.colossusRaidClears));
      }
      if (
        typeof parsed.totalColossusWeakpointsBroken === 'number' &&
        Number.isFinite(parsed.totalColossusWeakpointsBroken)
      ) {
        this.totalColossusWeakpointsBroken = Math.max(0, Math.floor(parsed.totalColossusWeakpointsBroken));
      }
      if (typeof parsed.bestColossusClearSec === 'number' && Number.isFinite(parsed.bestColossusClearSec)) {
        this.bestColossusClearSec = Math.max(0, Number(parsed.bestColossusClearSec.toFixed(1)));
      }
      if (parsed.boboTechLevels && typeof parsed.boboTechLevels === 'object') {
        for (const branchId of BOBO_TECH_BRANCH_ORDER) {
          const rawLvl = parsed.boboTechLevels[branchId];
          if (typeof rawLvl === 'number' && Number.isFinite(rawLvl)) {
            this.boboTechLevels[branchId] = Math.max(0, Math.min(BOBO_TECH_MAX_LEVEL, Math.floor(rawLvl)));
          }
        }
      }
      if (parsed.activeBoboTechDoctrine && BOBO_TECH_BRANCHES[parsed.activeBoboTechDoctrine]) {
        this.activeBoboTechDoctrine = parsed.activeBoboTechDoctrine;
      }
      if (typeof parsed.airshipWingMedals === 'number' && Number.isFinite(parsed.airshipWingMedals)) {
        this.airshipWingMedals = Math.max(0, Math.floor(parsed.airshipWingMedals));
      }
      if (
        typeof parsed.lifetimeAirshipWingMedals === 'number' &&
        Number.isFinite(parsed.lifetimeAirshipWingMedals)
      ) {
        this.lifetimeAirshipWingMedals = Math.max(
          this.airshipWingMedals,
          Math.floor(parsed.lifetimeAirshipWingMedals)
        );
      } else {
        this.lifetimeAirshipWingMedals = Math.max(this.lifetimeAirshipWingMedals, this.airshipWingMedals);
      }
      if (typeof parsed.airshipEscortClears === 'number' && Number.isFinite(parsed.airshipEscortClears)) {
        this.airshipEscortClears = Math.max(0, Math.floor(parsed.airshipEscortClears));
      }
      if (typeof parsed.bestAirshipProgressPct === 'number' && Number.isFinite(parsed.bestAirshipProgressPct)) {
        this.bestAirshipProgressPct = Math.max(0, Math.min(100, Math.round(parsed.bestAirshipProgressPct)));
      }
      if (typeof parsed.bestAirshipClearSec === 'number' && Number.isFinite(parsed.bestAirshipClearSec)) {
        this.bestAirshipClearSec = Math.max(0, Number(parsed.bestAirshipClearSec.toFixed(1)));
      }
      if (typeof parsed.totalAirshipDropPods === 'number' && Number.isFinite(parsed.totalAirshipDropPods)) {
        this.totalAirshipDropPods = Math.max(0, Math.floor(parsed.totalAirshipDropPods));
      }
      if (
        typeof parsed.totalAntiAirTurretsCleared === 'number' &&
        Number.isFinite(parsed.totalAntiAirTurretsCleared)
      ) {
        this.totalAntiAirTurretsCleared = Math.max(0, Math.floor(parsed.totalAntiAirTurretsCleared));
      }
      if (parsed.cannonModLevels && typeof parsed.cannonModLevels === 'object') {
        for (const modId of CANNON_CORE_MOD_ORDER) {
          const rawModLvl = parsed.cannonModLevels[modId];
          if (typeof rawModLvl === 'number' && Number.isFinite(rawModLvl)) {
            this.cannonModLevels[modId] = Math.max(0, Math.min(CANNON_CORE_MOD_MAX_LEVEL, Math.floor(rawModLvl)));
          }
        }
      }
      if (parsed.activeCannonMod && CANNON_CORE_MODS[parsed.activeCannonMod]) {
        this.activeCannonMod = parsed.activeCannonMod;
        if (this.cannonModLevels[this.activeCannonMod] <= 0) {
          const firstUnlocked = CANNON_CORE_MOD_ORDER.find((m) => this.cannonModLevels[m] >= 1);
          if (firstUnlocked) {
            this.activeCannonMod = firstUnlocked;
          } else {
            this.cannonModLevels.overdrive_breech = 1;
            this.activeCannonMod = 'overdrive_breech';
          }
        }
      }
      if (typeof parsed.totalCannonModBursts === 'number' && Number.isFinite(parsed.totalCannonModBursts)) {
        this.totalCannonModBursts = Math.max(0, Math.floor(parsed.totalCannonModBursts));
      }
      // MC-10: Rainbow Candy Train Raid medals & Relic Banner Stand (old saves fall back to defaults)
      const readCount = (v: unknown): number | null =>
        typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : null;
      const trainMedalsRaw = readCount(parsed.trainGoldMedals);
      if (trainMedalsRaw !== null) this.trainGoldMedals = trainMedalsRaw;
      const lifeTrainRaw = readCount(parsed.lifetimeTrainGoldMedals);
      this.lifetimeTrainGoldMedals = Math.max(this.trainGoldMedals, lifeTrainRaw ?? 0);
      const trainClearsRaw = readCount(parsed.candyTrainRaidClears);
      if (trainClearsRaw !== null) this.candyTrainRaidClears = trainClearsRaw;
      const bestCarsRaw = readCount(parsed.bestTrainCarsBroken);
      if (bestCarsRaw !== null) this.bestTrainCarsBroken = Math.min(12, bestCarsRaw);
      if (typeof parsed.bestTrainClearSec === 'number' && Number.isFinite(parsed.bestTrainClearSec)) {
        this.bestTrainClearSec = Math.max(0, Number(parsed.bestTrainClearSec.toFixed(1)));
      }
      const totalCarsRaw = readCount(parsed.totalTrainCarsBroken);
      if (totalCarsRaw !== null) this.totalTrainCarsBroken = totalCarsRaw;
      const totalTreasureRaw = readCount(parsed.totalTrainTreasureLooted);
      if (totalTreasureRaw !== null) this.totalTrainTreasureLooted = totalTreasureRaw;
      if (parsed.relicBannerLevels && typeof parsed.relicBannerLevels === 'object') {
        for (const bannerId of RELIC_BANNER_ORDER) {
          const rawBannerLvl = parsed.relicBannerLevels[bannerId];
          if (typeof rawBannerLvl === 'number' && Number.isFinite(rawBannerLvl)) {
            this.relicBannerLevels[bannerId] = Math.max(
              0,
              Math.min(RELIC_BANNER_MAX_LEVEL, Math.floor(rawBannerLvl))
            );
          }
        }
      }
      if (parsed.activeRelicBanner && RELIC_BANNERS[parsed.activeRelicBanner]) {
        this.activeRelicBanner = parsed.activeRelicBanner;
      }
      if (this.relicBannerLevels[this.activeRelicBanner] <= 0) {
        const firstBanner = RELIC_BANNER_ORDER.find((b) => this.relicBannerLevels[b] >= 1);
        if (firstBanner) {
          this.activeRelicBanner = firstBanner;
        } else {
          this.relicBannerLevels.gale_charge = 1;
          this.activeRelicBanner = 'gale_charge';
        }
      }
      const bannerProcsRaw = readCount(parsed.totalRelicBannerProcs);
      if (bannerProcsRaw !== null) this.totalRelicBannerProcs = bannerProcsRaw;
      // MC-11: Deep pearls & pet companion dock (old saves fall back to defaults; dirty values clamped)
      const pearlsRaw = readCount(parsed.deepPearls);
      if (pearlsRaw !== null) this.deepPearls = Math.min(99999, pearlsRaw);
      const lifePearlsRaw = readCount(parsed.lifetimeDeepPearls);
      this.lifetimeDeepPearls = Math.max(this.deepPearls, Math.min(99999, lifePearlsRaw ?? 0));
      const subClearsRaw = readCount(parsed.submarineRescueClears);
      if (subClearsRaw !== null) this.submarineRescueClears = Math.min(99999, subClearsRaw);
      const bestRescuedRaw = readCount(parsed.bestSubmarineRescuedBobos);
      if (bestRescuedRaw !== null) this.bestSubmarineRescuedBobos = Math.min(600, bestRescuedRaw);
      if (typeof parsed.bestSubmarineClearSec === 'number' && Number.isFinite(parsed.bestSubmarineClearSec)) {
        this.bestSubmarineClearSec = Math.max(0, Math.min(3600, Number(parsed.bestSubmarineClearSec.toFixed(1))));
      }
      const bubblesRaw = readCount(parsed.totalBubblesPopped);
      if (bubblesRaw !== null) this.totalBubblesPopped = bubblesRaw;
      const jellyRaw = readCount(parsed.totalJellyfishCleared);
      if (jellyRaw !== null) this.totalJellyfishCleared = jellyRaw;
      const coralRaw = readCount(parsed.totalCoralBroken);
      if (coralRaw !== null) this.totalCoralBroken = coralRaw;
      if (parsed.petLevels && typeof parsed.petLevels === 'object') {
        for (const petId of PET_COMPANION_ORDER) {
          const rawPetLvl = (parsed.petLevels as Record<string, unknown>)[petId];
          if (typeof rawPetLvl === 'number' && Number.isFinite(rawPetLvl)) {
            this.petLevels[petId] = Math.max(0, Math.min(PET_COMPANION_MAX_LEVEL, Math.floor(rawPetLvl)));
          }
        }
      }
      if (typeof parsed.activePet === 'string' && PET_COMPANION_ORDER.includes(parsed.activePet as PetCompanionId)) {
        this.activePet = parsed.activePet as PetCompanionId;
      }
      if (this.petLevels[this.activePet] <= 0) {
        const firstPet = PET_COMPANION_ORDER.find((pid) => this.petLevels[pid] >= 1);
        if (firstPet) {
          this.activePet = firstPet;
        } else {
          this.petLevels.jelly_puff = 1;
          this.activePet = 'jelly_puff';
        }
      }
      const petProcsRaw = readCount(parsed.totalPetProcs);
      if (petProcsRaw !== null) this.totalPetProcs = petProcsRaw;
      // MC-13: Lava cores, lava jump records & skin gacha (old saves fall back to defaults; dirty values clamped).
      // Loaded before the trophy hall so a displayed 熔岩晶核奖杯 validates against the restored counter.
      const coresRaw = readCount(parsed.lavaCores);
      if (coresRaw !== null) this.lavaCores = Math.min(99999, coresRaw);
      const lifeCoresRaw = readCount(parsed.lifetimeLavaCores);
      this.lifetimeLavaCores = Math.max(this.lavaCores, Math.min(99999, lifeCoresRaw ?? 0));
      const lavaClearsRaw = readCount(parsed.lavaJumpClears);
      if (lavaClearsRaw !== null) this.lavaJumpClears = Math.min(99999, lavaClearsRaw);
      if (typeof parsed.bestLavaFinishSec === 'number' && Number.isFinite(parsed.bestLavaFinishSec)) {
        this.bestLavaFinishSec = Math.max(0, Math.min(3600, Number(parsed.bestLavaFinishSec.toFixed(1))));
      }
      const bestLavaSurvRaw = readCount(parsed.bestLavaSurvivors);
      if (bestLavaSurvRaw !== null) this.bestLavaSurvivors = Math.min(600, bestLavaSurvRaw);
      const lavaHopsRaw = readCount(parsed.totalLavaHops);
      if (lavaHopsRaw !== null) this.totalLavaHops = lavaHopsRaw;
      const lavaLostRaw = readCount(parsed.totalLavaBobosLost);
      if (lavaLostRaw !== null) this.totalLavaBobosLost = lavaLostRaw;
      this.ownedGachaSkins = [];
      if (Array.isArray(parsed.ownedGachaSkins)) {
        for (const raw of parsed.ownedGachaSkins as unknown[]) {
          if (typeof raw !== 'string' || !GACHA_SKIN_ORDER.includes(raw as GachaSkinId)) continue;
          if (!this.ownedGachaSkins.includes(raw as GachaSkinId)) this.ownedGachaSkins.push(raw as GachaSkinId);
        }
      }
      const eqGachaRaw: unknown = parsed.equippedGachaSkin;
      this.equippedGachaSkin =
        typeof eqGachaRaw === 'string' && this.ownedGachaSkins.includes(eqGachaRaw as GachaSkinId)
          ? (eqGachaRaw as GachaSkinId)
          : null;
      this.gachaPity = Math.min(GACHA_PITY_SR - 1, readCount(parsed.gachaPity) ?? 0);
      this.gachaSsrPity = Math.min(GACHA_PITY_SSR - 1, readCount(parsed.gachaSsrPity) ?? 0);
      const gachaRollsRaw = readCount(parsed.totalGachaRolls);
      if (gachaRollsRaw !== null) this.totalGachaRolls = Math.min(9999999, gachaRollsRaw);
      // MC-14: Stardust badges, asteroid records & lobby decor (old saves fall back to defaults; dirty values clamped).
      // Loaded before the trophy hall so a displayed 星尘徽章奖杯 validates against the restored counter.
      const starRaw = readCount(parsed.stardustBadges);
      this.stardustBadges = starRaw !== null ? Math.min(99999, starRaw) : 0;
      const lifeStarRaw = readCount(parsed.lifetimeStardustBadges);
      this.lifetimeStardustBadges = Math.max(this.stardustBadges, Math.min(99999, lifeStarRaw ?? 0));
      const astClearsRaw = readCount(parsed.asteroidDashClears);
      this.asteroidDashClears = astClearsRaw !== null ? Math.min(99999, astClearsRaw) : 0;
      this.bestAsteroidFinishSec = 0;
      if (typeof parsed.bestAsteroidFinishSec === 'number' && Number.isFinite(parsed.bestAsteroidFinishSec)) {
        this.bestAsteroidFinishSec = Math.max(0, Math.min(3600, Number(parsed.bestAsteroidFinishSec.toFixed(1))));
      }
      const bestAstSurvRaw = readCount(parsed.bestAsteroidSurvivors);
      this.bestAsteroidSurvivors = bestAstSurvRaw !== null ? Math.min(600, bestAstSurvRaw) : 0;
      const astBlocksRaw = readCount(parsed.totalAsteroidShieldBlocks);
      this.totalAsteroidShieldBlocks = astBlocksRaw !== null ? Math.min(9999999, astBlocksRaw) : 0;
      const astLostRaw = readCount(parsed.totalAsteroidBobosLost);
      this.totalAsteroidBobosLost = astLostRaw !== null ? Math.min(9999999, astLostRaw) : 0;
      this.ownedDecorThemes = ['navy_classic'];
      if (Array.isArray(parsed.ownedDecorThemes)) {
        for (const raw of parsed.ownedDecorThemes as unknown[]) {
          if (typeof raw !== 'string' || !DECOR_THEME_ORDER.includes(raw as DecorThemeId)) continue;
          if (!this.ownedDecorThemes.includes(raw as DecorThemeId)) this.ownedDecorThemes.push(raw as DecorThemeId);
        }
      }
      const themeRaw: unknown = parsed.activeDecorTheme;
      this.activeDecorTheme =
        typeof themeRaw === 'string' && this.ownedDecorThemes.includes(themeRaw as DecorThemeId)
          ? (themeRaw as DecorThemeId)
          : 'navy_classic';
      this.ownedDecorProps = [];
      if (Array.isArray(parsed.ownedDecorProps)) {
        for (const raw of parsed.ownedDecorProps as unknown[]) {
          if (typeof raw !== 'string' || !DECOR_PROP_ORDER.includes(raw as DecorPropId)) continue;
          if (!this.ownedDecorProps.includes(raw as DecorPropId)) this.ownedDecorProps.push(raw as DecorPropId);
        }
      }
      this.decorSlots = [null, null, null, null];
      if (Array.isArray(parsed.decorSlots)) {
        const seenProps = new Set<DecorPropId>();
        for (let i = 0; i < Math.min(DECOR_SLOT_COUNT, parsed.decorSlots.length); i++) {
          const raw: unknown = parsed.decorSlots[i];
          if (typeof raw !== 'string' || !this.ownedDecorProps.includes(raw as DecorPropId)) continue;
          if (seenProps.has(raw as DecorPropId)) continue;
          seenProps.add(raw as DecorPropId);
          this.decorSlots[i] = raw as DecorPropId;
        }
      }
      // MC-15: Pumpkin badges, pumpkin-night records & the tactic deck (old saves fall back to defaults; dirty values
      // clamped). Loaded before the trophy hall so a displayed 南瓜灯徽章奖杯 validates against the restored counter.
      const pumpkinRaw = readCount(parsed.pumpkinBadges);
      this.pumpkinBadges = pumpkinRaw !== null ? Math.min(99999, pumpkinRaw) : 0;
      const lifePumpkinRaw = readCount(parsed.lifetimePumpkinBadges);
      this.lifetimePumpkinBadges = Math.max(this.pumpkinBadges, Math.min(99999, lifePumpkinRaw ?? 0));
      const pkClearsRaw = readCount(parsed.pumpkinNightClears);
      this.pumpkinNightClears = pkClearsRaw !== null ? Math.min(99999, pkClearsRaw) : 0;
      this.bestPumpkinFinishSec = 0;
      if (typeof parsed.bestPumpkinFinishSec === 'number' && Number.isFinite(parsed.bestPumpkinFinishSec)) {
        this.bestPumpkinFinishSec = Math.max(0, Math.min(3600, Number(parsed.bestPumpkinFinishSec.toFixed(1))));
      }
      const bestPkSurvRaw = readCount(parsed.bestPumpkinSurvivors);
      this.bestPumpkinSurvivors = bestPkSurvRaw !== null ? Math.min(600, bestPkSurvRaw) : 0;
      const pkDispelRaw = readCount(parsed.totalPumpkinGhostsDispelled);
      this.totalPumpkinGhostsDispelled = pkDispelRaw !== null ? Math.min(9999999, pkDispelRaw) : 0;
      const pkLostRaw = readCount(parsed.totalPumpkinBobosLost);
      this.totalPumpkinBobosLost = pkLostRaw !== null ? Math.min(9999999, pkLostRaw) : 0;
      this.ownedTacticCards = [];
      if (Array.isArray(parsed.ownedTacticCards)) {
        for (const raw of parsed.ownedTacticCards as unknown[]) {
          if (typeof raw !== 'string' || !TACTIC_CARD_ORDER.includes(raw as TacticCardId)) continue;
          if (!this.ownedTacticCards.includes(raw as TacticCardId)) this.ownedTacticCards.push(raw as TacticCardId);
        }
      }
      this.tacticDeck = [null, null, null];
      if (Array.isArray(parsed.tacticDeck)) {
        const seenCards = new Set<TacticCardId>();
        for (let i = 0; i < Math.min(TACTIC_DECK_SIZE, parsed.tacticDeck.length); i++) {
          const raw: unknown = parsed.tacticDeck[i];
          if (typeof raw !== 'string' || !this.ownedTacticCards.includes(raw as TacticCardId)) continue;
          if (seenCards.has(raw as TacticCardId)) continue;
          seenCards.add(raw as TacticCardId);
          this.tacticDeck[i] = raw as TacticCardId;
        }
      }
      const tacticTrigRaw = readCount(parsed.totalTacticTriggers);
      this.totalTacticTriggers = tacticTrigRaw !== null ? Math.min(9999999, tacticTrigRaw) : 0;
      // MC-16: campaign switch (anything but an explicit false keeps it on) & 圣甲虫徽章 / pyramid records, loaded before
      // the trophy hall so a displayed 圣甲虫徽章奖杯 validates against the restored counter
      this.tacticCampaignEnabled = parsed.tacticCampaignEnabled !== false;
      const scarabRaw = readCount(parsed.scarabBadges);
      this.scarabBadges = scarabRaw !== null ? Math.min(99999, scarabRaw) : 0;
      const lifeScarabRaw = readCount(parsed.lifetimeScarabBadges);
      this.lifetimeScarabBadges = Math.max(this.scarabBadges, Math.min(99999, lifeScarabRaw ?? 0));
      const pyClearsRaw = readCount(parsed.pyramidRunClears);
      this.pyramidRunClears = pyClearsRaw !== null ? Math.min(99999, pyClearsRaw) : 0;
      this.bestPyramidFinishSec = 0;
      if (typeof parsed.bestPyramidFinishSec === 'number' && Number.isFinite(parsed.bestPyramidFinishSec)) {
        this.bestPyramidFinishSec = Math.max(0, Math.min(3600, Number(parsed.bestPyramidFinishSec.toFixed(1))));
      }
      const bestPySurvRaw = readCount(parsed.bestPyramidSurvivors);
      this.bestPyramidSurvivors = bestPySurvRaw !== null ? Math.min(600, bestPySurvRaw) : 0;
      const pyDodgedRaw = readCount(parsed.totalPyramidTrapsDodged);
      this.totalPyramidTrapsDodged = pyDodgedRaw !== null ? Math.min(9999999, pyDodgedRaw) : 0;
      const pyLostRaw = readCount(parsed.totalPyramidBobosLost);
      this.totalPyramidBobosLost = pyLostRaw !== null ? Math.min(9999999, pyLostRaw) : 0;
      // MC-17: 翡翠神像徽章 / jungle records (old saves fall back to defaults; dirty values clamped), loaded before the
      // trophy hall so a displayed 翡翠神像徽章奖杯 validates against the restored counter
      const idolRaw = readCount(parsed.emeraldIdolBadges);
      this.emeraldIdolBadges = idolRaw !== null ? Math.min(99999, idolRaw) : 0;
      const lifeIdolRaw = readCount(parsed.lifetimeEmeraldIdolBadges);
      this.lifetimeEmeraldIdolBadges = Math.max(this.emeraldIdolBadges, Math.min(99999, lifeIdolRaw ?? 0));
      const jgClearsRaw = readCount(parsed.jungleSwingClears);
      this.jungleSwingClears = jgClearsRaw !== null ? Math.min(99999, jgClearsRaw) : 0;
      this.bestJungleFinishSec = 0;
      if (typeof parsed.bestJungleFinishSec === 'number' && Number.isFinite(parsed.bestJungleFinishSec)) {
        this.bestJungleFinishSec = Math.max(0, Math.min(3600, Number(parsed.bestJungleFinishSec.toFixed(1))));
      }
      const bestJgSurvRaw = readCount(parsed.bestJungleSurvivors);
      this.bestJungleSurvivors = bestJgSurvRaw !== null ? Math.min(600, bestJgSurvRaw) : 0;
      const jgDodgedRaw = readCount(parsed.totalJungleTrapsDodged);
      this.totalJungleTrapsDodged = jgDodgedRaw !== null ? Math.min(9999999, jgDodgedRaw) : 0;
      const jgLostRaw = readCount(parsed.totalJungleBobosLost);
      this.totalJungleBobosLost = jgLostRaw !== null ? Math.min(9999999, jgLostRaw) : 0;
      // MC-18: 金骷髅徽章 / pirate records (old saves fall back to defaults; dirty values clamped)
      const skullRaw = readCount(parsed.goldSkullBadges);
      this.goldSkullBadges = skullRaw !== null ? Math.min(99999, skullRaw) : 0;
      const lifeSkullRaw = readCount(parsed.lifetimeGoldSkullBadges);
      this.lifetimeGoldSkullBadges = Math.max(this.goldSkullBadges, Math.min(99999, lifeSkullRaw ?? 0));
      const prClearsRaw = readCount(parsed.pirateBoardingClears);
      this.pirateBoardingClears = prClearsRaw !== null ? Math.min(99999, prClearsRaw) : 0;
      this.bestPirateFinishSec = 0;
      if (typeof parsed.bestPirateFinishSec === 'number' && Number.isFinite(parsed.bestPirateFinishSec)) {
        this.bestPirateFinishSec = Math.max(0, Math.min(3600, Number(parsed.bestPirateFinishSec.toFixed(1))));
      }
      const bestPrSurvRaw = readCount(parsed.bestPirateSurvivors);
      this.bestPirateSurvivors = bestPrSurvRaw !== null ? Math.min(600, bestPrSurvRaw) : 0;
      const prDodgedRaw = readCount(parsed.totalPirateTrapsDodged);
      this.totalPirateTrapsDodged = prDodgedRaw !== null ? Math.min(9999999, prDodgedRaw) : 0;
      const prLostRaw = readCount(parsed.totalPirateBobosLost);
      this.totalPirateBobosLost = prLostRaw !== null ? Math.min(9999999, prLostRaw) : 0;
      // MC-12: Ice medals, sled records & trophy hall (old saves fall back to defaults; dirty values clamped)
      const iceRaw = readCount(parsed.iceMedals);
      if (iceRaw !== null) this.iceMedals = Math.min(99999, iceRaw);
      const lifeIceRaw = readCount(parsed.lifetimeIceMedals);
      this.lifetimeIceMedals = Math.max(this.iceMedals, Math.min(99999, lifeIceRaw ?? 0));
      const sledClearsRaw = readCount(parsed.glacierSledClears);
      if (sledClearsRaw !== null) this.glacierSledClears = Math.min(99999, sledClearsRaw);
      if (typeof parsed.bestSledFinishSec === 'number' && Number.isFinite(parsed.bestSledFinishSec)) {
        this.bestSledFinishSec = Math.max(0, Math.min(3600, Number(parsed.bestSledFinishSec.toFixed(1))));
      }
      const bestSurvRaw = readCount(parsed.bestSledSurvivors);
      if (bestSurvRaw !== null) this.bestSledSurvivors = Math.min(600, bestSurvRaw);
      const sledGatesRaw = readCount(parsed.totalSledGatesPassed);
      if (sledGatesRaw !== null) this.totalSledGatesPassed = sledGatesRaw;
      const sledLostRaw = readCount(parsed.totalSledRidersLost);
      if (sledLostRaw !== null) this.totalSledRidersLost = sledLostRaw;
      const slotsRaw = readCount(parsed.trophyHallSlots);
      this.trophyHallSlots = Math.max(1, Math.min(TROPHY_HALL_SLOT_COUNT, slotsRaw ?? 1));
      this.trophyDisplay = [null, null, null, null, null, null];
      if (Array.isArray(parsed.trophyDisplay)) {
        const seen = new Set<HallTrophyId>();
        for (let i = 0; i < Math.min(this.trophyHallSlots, parsed.trophyDisplay.length); i++) {
          const raw: unknown = parsed.trophyDisplay[i];
          if (typeof raw !== 'string' || !HALL_TROPHY_ORDER.includes(raw as HallTrophyId)) continue;
          const tid = raw as HallTrophyId;
          if (seen.has(tid) || this.getHallTrophyTier(tid) < 1) continue;
          seen.add(tid);
          this.trophyDisplay[i] = tid;
        }
      }
      if (typeof parsed.totalMatchesPlayed === 'number') {
        this.totalMatchesPlayed = Math.max(this.bestStageCleared, parsed.totalMatchesPlayed);
      } else {
        this.totalMatchesPlayed = this.bestStageCleared;
      }
      if (typeof parsed.lifetimeKills === 'number') {
        this.lifetimeKills = Math.max(0, parsed.lifetimeKills);
      }
      if (typeof parsed.playTimeSeconds === 'number' && parsed.playTimeSeconds > 0) {
        this.playTimeSeconds = Math.max(0, parsed.playTimeSeconds);
      } else if (this.totalMatchesPlayed > 0 || this.lifetimeKills > 0) {
        this.playTimeSeconds = Math.round(this.totalMatchesPlayed * 45 + this.lifetimeKills * 0.12);
      }
      const curWeekKey = this.getLeaderboardWeekInfo().weekKey;
      if (typeof parsed.leaderboardWeekKey === 'string' && parsed.leaderboardWeekKey === curWeekKey) {
        this.leaderboardWeekKey = curWeekKey;
        this.weeklyBestStage = Math.max(0, Number(parsed.weeklyBestStage) || 0);
        this.weeklyKills = Math.max(0, Number(parsed.weeklyKills) || 0);
        this.weeklyPlayTimeSeconds = Math.max(0, Number(parsed.weeklyPlayTimeSeconds) || 0);
      } else {
        this.leaderboardWeekKey = curWeekKey;
        this.weeklyBestStage = 0;
        this.weeklyKills = 0;
        this.weeklyPlayTimeSeconds = 0;
      }
      if (parsed.skillNodes && typeof parsed.skillNodes === 'object') {
        this.skillNodes = { ...parsed.skillNodes };
      }
      if (
        typeof parsed.selectedRaceId === 'string' &&
        SKILL_TREE_BRANCHES.some((b) => b.id === parsed.selectedRaceId)
      ) {
        this.selectedRaceId = parsed.selectedRaceId as SkillBranchId;
      }
      if (typeof parsed.bonusTalentPoints === 'number') {
        this.bonusTalentPoints = Math.max(0, parsed.bonusTalentPoints);
      }
      if (typeof parsed.skillRespecCount === 'number') {
        this.skillRespecCount = Math.max(0, parsed.skillRespecCount);
      }
      if (typeof parsed.stagesPlayedSinceRespec === 'number') {
        this.stagesPlayedSinceRespec = Math.max(0, parsed.stagesPlayedSinceRespec);
      } else {
        this.stagesPlayedSinceRespec = this.totalMatchesPlayed;
      }
      if (typeof parsed.lastShareBonusDate === 'string') {
        this.lastShareBonusDate = parsed.lastShareBonusDate;
      }
      if (typeof parsed.claimedReferralFrom === 'string') {
        this.claimedReferralFrom = parsed.claimedReferralFrom;
      }
      this.sanitizeSkillTreeState();
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Resets all in-run temporary progression when ending a run (returning to Main Menu)
   * or starting a fresh run from Stage 1.
   * Only out-of-match meta progression (gold, metaLevels, ownedSkins/skinRanks/skinShards,
   * skillNodes/bonusTalentPoints, and leaderboard stats) is permanently retained.
   */
  public resetRunProgression(): void {
    this.currentLevelIndex = 0;
    this.fireRateLevel = 1;
    this.powerLevel = 1;
    this.championLevel = 1;
    this.lootLevel = 1;
    this.runCombatTimePool = 0;
    this.runKillsPool = 0;
    this.runSpawnsPool = 0;
    this.runSiegePool = 0;
    this.buffStacks = {};
    this.activeDebuffs = [];
    const startCharge = this.getStartingSkillCharge();
    this.championCharge = startCharge;
    this.orbitalCharge = startCharge;
    this.mechaOverlordCharge = Math.min(100, Math.max(35, startCharge + this.mechaCoreLevel * 4));
    this.subWeaponCharge = 100;
    this.save();
  }

  public save(): void {
    try {
      const data: SaveState = {
        gold: Math.floor(this.gold),
        unlockedLevel: this.unlockedLevel,
        currentLevelIndex: 0,
        fireRateLevel: 1,
        powerLevel: 1,
        championLevel: 1,
        lootLevel: 1,
        weapon: this.weapon,
        mechaMode: this.mechaMode,
        metaLevels: this.metaLevels,
        ownedSkins: this.ownedSkins,
        equippedSkin: this.equippedSkin,
        skinRanks: this.skinRanks,
        skinShards: this.skinShards,
        ownedFinishes: this.ownedFinishes,
        equippedFinish: this.equippedFinish,
        playerId: this.playerId,
        playerName: this.playerName,
        bestStageCleared: this.bestStageCleared,
        bestEndlessWave: this.bestEndlessWave,
        bestEscortProgressPct: this.bestEscortProgressPct,
        bestEscortClearSec: this.bestEscortClearSec,
        escortClears: this.escortClears,
        totalBarricadesBroken: this.totalBarricadesBroken,
        mechaCoreLevel: this.mechaCoreLevel,
        mechaCannonLevel: this.mechaCannonLevel,
        totalMechaSummons: this.totalMechaSummons,
        totalMechaSmashes: this.totalMechaSmashes,
        claimedMechaMilestoneTier: this.claimedMechaMilestoneTier,
        equippedSubWeapon: this.equippedSubWeapon,
        subWeaponLevels: { ...this.subWeaponLevels },
        totalSubWeaponCasts: this.totalSubWeaponCasts,
        tournamentStage: this.tournamentStage,
        tournamentWinStreak: this.tournamentWinStreak,
        tournamentCupTier: this.tournamentCupTier,
        tournamentTrophies: this.tournamentTrophies,
        tournamentBricks: this.tournamentBricks,
        pendingTournamentChestStage: this.pendingTournamentChestStage,
        tournamentChestsClaimed: this.tournamentChestsClaimed,
        clockworkCores: Math.max(0, Math.floor(this.clockworkCores)),
        colossusRaidClears: Math.max(0, Math.floor(this.colossusRaidClears)),
        totalColossusWeakpointsBroken: Math.max(0, Math.floor(this.totalColossusWeakpointsBroken)),
        bestColossusClearSec: this.bestColossusClearSec,
        boboTechLevels: { ...this.boboTechLevels },
        activeBoboTechDoctrine: this.activeBoboTechDoctrine,
        airshipWingMedals: Math.max(0, Math.floor(this.airshipWingMedals)),
        lifetimeAirshipWingMedals: Math.max(
          Math.max(0, Math.floor(this.airshipWingMedals)),
          Math.floor(this.lifetimeAirshipWingMedals)
        ),
        airshipEscortClears: Math.max(0, Math.floor(this.airshipEscortClears)),
        bestAirshipProgressPct: Math.max(0, Math.min(100, Math.round(this.bestAirshipProgressPct))),
        bestAirshipClearSec: this.bestAirshipClearSec,
        totalAirshipDropPods: Math.max(0, Math.floor(this.totalAirshipDropPods)),
        totalAntiAirTurretsCleared: Math.max(0, Math.floor(this.totalAntiAirTurretsCleared)),
        cannonModLevels: { ...this.cannonModLevels },
        activeCannonMod: this.activeCannonMod,
        totalCannonModBursts: Math.max(0, Math.floor(this.totalCannonModBursts)),
        trainGoldMedals: Math.max(0, Math.floor(this.trainGoldMedals)),
        lifetimeTrainGoldMedals: Math.max(
          Math.max(0, Math.floor(this.trainGoldMedals)),
          Math.floor(this.lifetimeTrainGoldMedals)
        ),
        candyTrainRaidClears: Math.max(0, Math.floor(this.candyTrainRaidClears)),
        bestTrainCarsBroken: Math.max(0, Math.floor(this.bestTrainCarsBroken)),
        bestTrainClearSec: this.bestTrainClearSec,
        totalTrainCarsBroken: Math.max(0, Math.floor(this.totalTrainCarsBroken)),
        totalTrainTreasureLooted: Math.max(0, Math.floor(this.totalTrainTreasureLooted)),
        relicBannerLevels: { ...this.relicBannerLevels },
        activeRelicBanner: this.activeRelicBanner,
        totalRelicBannerProcs: Math.max(0, Math.floor(this.totalRelicBannerProcs)),
        deepPearls: Math.max(0, Math.floor(this.deepPearls)),
        lifetimeDeepPearls: Math.max(Math.max(0, Math.floor(this.deepPearls)), Math.floor(this.lifetimeDeepPearls)),
        submarineRescueClears: Math.max(0, Math.floor(this.submarineRescueClears)),
        bestSubmarineRescuedBobos: Math.max(0, Math.floor(this.bestSubmarineRescuedBobos)),
        bestSubmarineClearSec: this.bestSubmarineClearSec,
        totalBubblesPopped: Math.max(0, Math.floor(this.totalBubblesPopped)),
        totalJellyfishCleared: Math.max(0, Math.floor(this.totalJellyfishCleared)),
        totalCoralBroken: Math.max(0, Math.floor(this.totalCoralBroken)),
        petLevels: { ...this.petLevels },
        activePet: this.activePet,
        totalPetProcs: Math.max(0, Math.floor(this.totalPetProcs)),
        iceMedals: Math.max(0, Math.floor(this.iceMedals)),
        lifetimeIceMedals: Math.max(Math.max(0, Math.floor(this.iceMedals)), Math.floor(this.lifetimeIceMedals)),
        glacierSledClears: Math.max(0, Math.floor(this.glacierSledClears)),
        bestSledFinishSec: this.bestSledFinishSec,
        bestSledSurvivors: Math.max(0, Math.floor(this.bestSledSurvivors)),
        totalSledGatesPassed: Math.max(0, Math.floor(this.totalSledGatesPassed)),
        totalSledRidersLost: Math.max(0, Math.floor(this.totalSledRidersLost)),
        trophyHallSlots: this.getUnlockedTrophySlots(),
        trophyDisplay: this.trophyDisplay.slice(0, TROPHY_HALL_SLOT_COUNT),
        lavaCores: Math.max(0, Math.floor(this.lavaCores)),
        lifetimeLavaCores: Math.max(Math.max(0, Math.floor(this.lavaCores)), Math.floor(this.lifetimeLavaCores)),
        lavaJumpClears: Math.max(0, Math.floor(this.lavaJumpClears)),
        bestLavaFinishSec: this.bestLavaFinishSec,
        bestLavaSurvivors: Math.max(0, Math.floor(this.bestLavaSurvivors)),
        totalLavaHops: Math.max(0, Math.floor(this.totalLavaHops)),
        totalLavaBobosLost: Math.max(0, Math.floor(this.totalLavaBobosLost)),
        ownedGachaSkins: [...this.ownedGachaSkins],
        equippedGachaSkin: this.equippedGachaSkin,
        gachaPity: Math.max(0, Math.min(GACHA_PITY_SR - 1, Math.floor(this.gachaPity))),
        gachaSsrPity: Math.max(0, Math.min(GACHA_PITY_SSR - 1, Math.floor(this.gachaSsrPity))),
        totalGachaRolls: Math.max(0, Math.floor(this.totalGachaRolls)),
        stardustBadges: Math.max(0, Math.floor(this.stardustBadges)),
        lifetimeStardustBadges: Math.max(Math.max(0, Math.floor(this.stardustBadges)), Math.floor(this.lifetimeStardustBadges)),
        asteroidDashClears: Math.max(0, Math.floor(this.asteroidDashClears)),
        bestAsteroidFinishSec: this.bestAsteroidFinishSec,
        bestAsteroidSurvivors: Math.max(0, Math.floor(this.bestAsteroidSurvivors)),
        totalAsteroidShieldBlocks: Math.max(0, Math.floor(this.totalAsteroidShieldBlocks)),
        totalAsteroidBobosLost: Math.max(0, Math.floor(this.totalAsteroidBobosLost)),
        ownedDecorThemes: [...this.ownedDecorThemes],
        activeDecorTheme: this.activeDecorTheme,
        ownedDecorProps: [...this.ownedDecorProps],
        decorSlots: this.decorSlots.slice(0, DECOR_SLOT_COUNT),
        pumpkinBadges: Math.max(0, Math.floor(this.pumpkinBadges)),
        lifetimePumpkinBadges: Math.max(Math.max(0, Math.floor(this.pumpkinBadges)), Math.floor(this.lifetimePumpkinBadges)),
        pumpkinNightClears: Math.max(0, Math.floor(this.pumpkinNightClears)),
        bestPumpkinFinishSec: this.bestPumpkinFinishSec,
        bestPumpkinSurvivors: Math.max(0, Math.floor(this.bestPumpkinSurvivors)),
        totalPumpkinGhostsDispelled: Math.max(0, Math.floor(this.totalPumpkinGhostsDispelled)),
        totalPumpkinBobosLost: Math.max(0, Math.floor(this.totalPumpkinBobosLost)),
        ownedTacticCards: [...this.ownedTacticCards],
        tacticDeck: this.tacticDeck.slice(0, TACTIC_DECK_SIZE),
        totalTacticTriggers: Math.max(0, Math.floor(this.totalTacticTriggers)),
        tacticCampaignEnabled: this.tacticCampaignEnabled,
        scarabBadges: Math.max(0, Math.floor(this.scarabBadges)),
        lifetimeScarabBadges: Math.max(Math.max(0, Math.floor(this.scarabBadges)), Math.floor(this.lifetimeScarabBadges)),
        pyramidRunClears: Math.max(0, Math.floor(this.pyramidRunClears)),
        bestPyramidFinishSec: this.bestPyramidFinishSec,
        bestPyramidSurvivors: Math.max(0, Math.floor(this.bestPyramidSurvivors)),
        totalPyramidTrapsDodged: Math.max(0, Math.floor(this.totalPyramidTrapsDodged)),
        totalPyramidBobosLost: Math.max(0, Math.floor(this.totalPyramidBobosLost)),
        emeraldIdolBadges: Math.max(0, Math.floor(this.emeraldIdolBadges)),
        lifetimeEmeraldIdolBadges: Math.max(
          Math.max(0, Math.floor(this.emeraldIdolBadges)),
          Math.floor(this.lifetimeEmeraldIdolBadges)
        ),
        jungleSwingClears: Math.max(0, Math.floor(this.jungleSwingClears)),
        bestJungleFinishSec: this.bestJungleFinishSec,
        bestJungleSurvivors: Math.max(0, Math.floor(this.bestJungleSurvivors)),
        totalJungleTrapsDodged: Math.max(0, Math.floor(this.totalJungleTrapsDodged)),
        totalJungleBobosLost: Math.max(0, Math.floor(this.totalJungleBobosLost)),
        goldSkullBadges: Math.max(0, Math.floor(this.goldSkullBadges)),
        lifetimeGoldSkullBadges: Math.max(
          Math.max(0, Math.floor(this.goldSkullBadges)),
          Math.floor(this.lifetimeGoldSkullBadges)
        ),
        pirateBoardingClears: Math.max(0, Math.floor(this.pirateBoardingClears)),
        bestPirateFinishSec: this.bestPirateFinishSec,
        bestPirateSurvivors: Math.max(0, Math.floor(this.bestPirateSurvivors)),
        totalPirateTrapsDodged: Math.max(0, Math.floor(this.totalPirateTrapsDodged)),
        totalPirateBobosLost: Math.max(0, Math.floor(this.totalPirateBobosLost)),
        totalMatchesPlayed: this.totalMatchesPlayed,
        lifetimeKills: this.lifetimeKills,
        playTimeSeconds: Math.floor(this.playTimeSeconds),
        leaderboardWeekKey: this.leaderboardWeekKey || this.getLeaderboardWeekInfo().weekKey,
        weeklyBestStage: this.weeklyBestStage,
        weeklyKills: this.weeklyKills,
        weeklyPlayTimeSeconds: Math.floor(this.weeklyPlayTimeSeconds),
        skillNodes: this.skillNodes,
        selectedRaceId: this.selectedRaceId,
        bonusTalentPoints: this.bonusTalentPoints,
        skillRespecCount: this.skillRespecCount,
        stagesPlayedSinceRespec: this.stagesPlayedSinceRespec,
        lastShareBonusDate: this.lastShareBonusDate,
        claimedReferralFrom: this.claimedReferralFrom,
        buffStacks: {},
        activeDebuffs: [],
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Ignore storage errors
    }
  }

  public getLeaderboardWeekInfo(nowMs = Date.now()): { weekKey: string; nextResetAtMs: number } {
    const EPOCH_MONDAY_UTC8_MS = 316800000; // 1970-01-05 00:00:00 UTC+8 (Monday)
    const WEEK_MS = 7 * 24 * 3600 * 1000;
    const weekIndex = Math.floor((nowMs - EPOCH_MONDAY_UTC8_MS) / WEEK_MS);
    return {
      weekKey: `w${weekIndex}`,
      nextResetAtMs: EPOCH_MONDAY_UTC8_MS + (weekIndex + 1) * WEEK_MS,
    };
  }

  public ensureWeeklyLeaderboardCycle(): void {
    const { weekKey } = this.getLeaderboardWeekInfo();
    if (this.leaderboardWeekKey !== weekKey) {
      this.leaderboardWeekKey = weekKey;
      this.weeklyBestStage = 0;
      this.weeklyKills = 0;
      this.weeklyPlayTimeSeconds = 0;
      this.remoteLeaderboard = [...DEFAULT_LEADERBOARD];
      this.remoteActiveLeaderboard = [...DEFAULT_LEADERBOARD];
      this.remoteRealPlayerCount = 0;
    }
  }

  public getWeeklyResetCountdownText(): string {
    const { nextResetAtMs } = this.getLeaderboardWeekInfo();
    const remainSec = Math.max(60, Math.floor((nextResetAtMs - Date.now()) / 1000));
    const days = Math.floor(remainSec / 86400);
    const hours = Math.floor((remainSec % 86400) / 3600);
    if (days > 0) {
      return `每周一刷新（剩${days}天${hours}时）`;
    }
    const mins = Math.max(1, Math.floor((remainSec % 3600) / 60));
    return hours > 0 ? `每周一刷新（剩${hours}时${mins}分）` : `每周一刷新（剩${mins}分）`;
  }

  public recordBattleStats(clearedStageNum: number, killsInStage: number): void {
    this.ensureWeeklyLeaderboardCycle();
    this.totalMatchesPlayed += 1;
    this.stagesPlayedSinceRespec += 1;
    const safeKills = Math.max(0, killsInStage);
    this.lifetimeKills += safeKills;
    this.weeklyKills += safeKills;
    if (clearedStageNum > this.bestStageCleared) {
      this.bestStageCleared = clearedStageNum;
    }
    if (clearedStageNum > this.weeklyBestStage) {
      this.weeklyBestStage = clearedStageNum;
    }
    if (this.totalMatchesPlayed < this.bestStageCleared) {
      this.totalMatchesPlayed = this.bestStageCleared;
    }
    this.save();
    void this.syncRemoteLeaderboard(true);
  }

  public setPlayerName(newName: string): {
    ok: boolean;
    reason?: 'empty' | 'same' | 'insufficient_gold';
  } {
    const cleaned = newName.trim().slice(0, 14);
    if (!cleaned) return { ok: false, reason: 'empty' };
    if (cleaned === this.playerName) return { ok: false, reason: 'same' };
    if (this.gold < RENAME_GOLD_COST) {
      return { ok: false, reason: 'insufficient_gold' };
    }
    this.gold -= RENAME_GOLD_COST;
    this.playerName = cleaned;
    this.save();
    void this.syncRemoteLeaderboard(true);
    return { ok: true };
  }

  private getTodayKey(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  public canClaimDailyShareBonus(): boolean {
    return this.lastShareBonusDate !== this.getTodayKey();
  }

  public claimDailyShareBonus(): {
    claimed: boolean;
    goldAwarded: number;
    shardsAwarded: number;
    skinName: string;
  } {
    const skin = this.getEquippedSkin();
    if (!this.canClaimDailyShareBonus()) {
      return { claimed: false, goldAwarded: 0, shardsAwarded: 0, skinName: skin.name };
    }
    this.lastShareBonusDate = this.getTodayKey();
    const goldAwarded = 3000;
    const shardsAwarded = 5;
    this.gold += goldAwarded;
    this.skinShards[this.equippedSkin] = (this.skinShards[this.equippedSkin] || 0) + shardsAwarded;
    this.save();
    return { claimed: true, goldAwarded, shardsAwarded, skinName: skin.name };
  }

  public checkAndClaimReferralWelcome(): { fromName: string; goldAwarded: number } | null {
    try {
      const params = new URLSearchParams(window.location.search);
      const refId = (params.get('ref') || '').trim();
      const fromName = (params.get('from') || '星际战友').trim().slice(0, 14);
      if (params.has('ref') || params.has('from')) {
        window.history.replaceState({}, '', window.location.pathname);
      }
      if (!refId || refId === this.playerId || this.claimedReferralFrom) {
        return null;
      }
      this.claimedReferralFrom = refId;
      const goldAwarded = 2000;
      this.gold += goldAwarded;
      this.save();
      return { fromName, goldAwarded };
    } catch {
      return null;
    }
  }

  public buildShareChallengeText(contextStage?: number, clearTimeSec?: number): {
    url: string;
    text: string;
  } {
    const baseUrl = window.location.origin || 'https://mob-control.yinosites.com';
    const url = `${baseUrl}/?ref=${encodeURIComponent(this.playerId)}&from=${encodeURIComponent(this.playerName)}`;
    const branch = this.getCommittedSkillBranch();
    const branchTag = branch ? `【${branch.name}】` : '';
    if (contextStage && clearTimeSec) {
      const speedTag = clearTimeSec < 10 ? `⚡${clearTimeSec.toFixed(1)}秒极速闪击` : `${clearTimeSec.toFixed(1)}秒`;
      return {
        url,
        text: `🔥 我在《星际狂潮：克隆防线》用${branchTag} ${speedTag}攻破第 ${contextStage} 关（累计歼敌 ${this.lifetimeKills.toLocaleString()}）！免下载点开即玩，新指挥官进场直接领 2,000⚡ 补给：${url}`,
      };
    }
    const stageStr = Math.max(1, this.bestStageCleared);
    return {
      url,
      text: `🏆 我在《星际狂潮：克隆防线》已打到第 ${stageStr} 关（游戏时长 ${this.formatPlayTime()} · 歼敌 ${this.lifetimeKills.toLocaleString()}）！免下载3D倍增门暴兵爽游，点开直接领 2,000⚡ 战友补给：${url}`,
    };
  }

  public tickPlayTime(dt: number): void {
    if (dt <= 0 || dt > 1) return;
    this.ensureWeeklyLeaderboardCycle();
    this.playTimeSeconds += dt;
    this.weeklyPlayTimeSeconds += dt;
    this.playTimeSaveAccum += dt;
    if (this.playTimeSaveAccum >= 15) {
      this.playTimeSaveAccum = 0;
      this.save();
    }
  }

  public formatPlayTime(secInput?: number): string {
    const sec = Math.max(1, Math.floor(secInput ?? this.playTimeSeconds));
    if (sec >= 3600) {
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      return m > 0 ? `${h}小时${m}分` : `${h}小时`;
    }
    if (sec >= 60) {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return s > 0 ? `${m}分${s}秒` : `${m}分钟`;
    }
    return `${sec}秒`;
  }

  private getEntryPlayTime(e: LeaderboardEntry): number {
    if (typeof e.playTimeSeconds === 'number' && e.playTimeSeconds > 0) {
      return Math.floor(e.playTimeSeconds);
    }
    return Math.max(60, Math.round((e.bestStage || 1) * 145 + (e.totalKills || 0) * 0.15));
  }

  public getTop10Leaderboard(): { top10: LeaderboardEntry[]; selfRank: number | null; realCount: number } {
    this.ensureWeeklyLeaderboardCycle();
    const skin = this.getEquippedSkin();
    const others: LeaderboardEntry[] = this.remoteLeaderboard
      .filter((e) => e.name !== this.playerName && (!e.playerId || e.playerId !== this.playerId))
      .map((e) => ({ ...e, playTimeSeconds: this.getEntryPlayTime(e), isSelf: false }));

    const realEntries = others.filter((e) => !e.isBot);
    const botEntries = others.filter((e) => Boolean(e.isBot));

    if (this.weeklyBestStage > 0 || this.weeklyKills > 0) {
      realEntries.push({
        playerId: this.playerId,
        name: this.playerName,
        bestStage: this.weeklyBestStage,
        totalKills: this.weeklyKills,
        playTimeSeconds: Math.floor(this.weeklyPlayTimeSeconds),
        skinName: skin.name,
        badgeColor: skin.badgeColor,
        isBot: false,
        isSelf: true,
      });
    }

    realEntries.sort((a, b) => b.bestStage - a.bestStage || b.totalKills - a.totalKills);
    const topReal = realEntries.slice(0, 10);
    const neededBots = Math.max(0, 10 - topReal.length);
    const combined = [...topReal, ...botEntries.slice(0, neededBots)];

    combined.sort((a, b) => b.bestStage - a.bestStage || b.totalKills - a.totalKills);
    const selfIdx = combined.findIndex((e) => e.isSelf);
    return {
      top10: combined.slice(0, 10),
      selfRank: selfIdx >= 0 ? selfIdx + 1 : null,
      realCount: Math.max(this.remoteRealPlayerCount, realEntries.length),
    };
  }

  public getTop10ActiveLeaderboard(): { top10: LeaderboardEntry[]; selfRank: number | null; realCount: number } {
    this.ensureWeeklyLeaderboardCycle();
    const skin = this.getEquippedSkin();
    const sourceList =
      this.remoteActiveLeaderboard.length > 0 ? this.remoteActiveLeaderboard : this.remoteLeaderboard;
    const others: LeaderboardEntry[] = sourceList
      .filter((e) => e.name !== this.playerName && (!e.playerId || e.playerId !== this.playerId))
      .map((e) => ({ ...e, playTimeSeconds: this.getEntryPlayTime(e), isSelf: false }));

    const realEntries = others.filter((e) => !e.isBot);
    const botEntries = others.filter((e) => Boolean(e.isBot));

    if (this.weeklyBestStage > 0 || this.weeklyKills > 0 || this.weeklyPlayTimeSeconds >= 10) {
      realEntries.push({
        playerId: this.playerId,
        name: this.playerName,
        bestStage: this.weeklyBestStage,
        totalKills: this.weeklyKills,
        playTimeSeconds: Math.max(1, Math.floor(this.weeklyPlayTimeSeconds)),
        skinName: skin.name,
        badgeColor: skin.badgeColor,
        isBot: false,
        isSelf: true,
      });
    }

    realEntries.sort(
      (a, b) => (b.playTimeSeconds || 0) - (a.playTimeSeconds || 0) || b.bestStage - a.bestStage
    );
    const topReal = realEntries.slice(0, 10);
    const neededBots = Math.max(0, 10 - topReal.length);
    const combined = [...topReal, ...botEntries.slice(0, neededBots)];

    combined.sort(
      (a, b) => (b.playTimeSeconds || 0) - (a.playTimeSeconds || 0) || b.bestStage - a.bestStage
    );
    const selfIdx = combined.findIndex((e) => e.isSelf);
    return {
      top10: combined.slice(0, 10),
      selfRank: selfIdx >= 0 ? selfIdx + 1 : null,
      realCount: Math.max(this.remoteRealPlayerCount, realEntries.length),
    };
  }

  public async syncRemoteLeaderboard(pushSelf = false): Promise<void> {
    try {
      this.ensureWeeklyLeaderboardCycle();
      const skin = this.getEquippedSkin();
      const hasScore = this.weeklyBestStage > 0 || this.weeklyKills > 0 || this.weeklyPlayTimeSeconds >= 30;
      const shouldPost = pushSelf && hasScore;
      const resp = await fetch('/api/leaderboard', {
        method: shouldPost ? 'POST' : 'GET',
        headers: shouldPost ? { 'content-type': 'application/json' } : undefined,
        body: shouldPost
          ? JSON.stringify({
              playerId: this.playerId,
              name: this.playerName,
              bestStage: this.weeklyBestStage,
              totalKills: this.weeklyKills,
              playTimeSeconds: Math.floor(this.weeklyPlayTimeSeconds),
              skinName: skin.name,
              badgeColor: skin.badgeColor,
            })
          : undefined,
      });
      if (!resp.ok) return;
      const data = (await resp.json()) as {
        top10?: LeaderboardEntry[];
        activeTop10?: LeaderboardEntry[];
        realPlayerCount?: number;
      };
      if (typeof data.realPlayerCount === 'number') {
        this.remoteRealPlayerCount = data.realPlayerCount;
      }
      if (Array.isArray(data.top10) && data.top10.length > 0) {
        this.remoteLeaderboard = data.top10;
      }
      if (Array.isArray(data.activeTop10) && data.activeTop10.length > 0) {
        this.remoteActiveLeaderboard = data.activeTop10;
      } else if (Array.isArray(data.top10) && data.top10.length > 0) {
        this.remoteActiveLeaderboard = [...data.top10];
      }
    } catch {
      // Offline / local fallback uses DEFAULT_LEADERBOARD seamlessly
    }
  }

  public getMetaLevel(id: MetaUpgradeId): number {
    return this.metaLevels[id] || 0;
  }

  public getMetaUpgradeCost(id: MetaUpgradeId): number {
    const spec = META_UPGRADES.find((u) => u.id === id)!;
    const lvl = this.getMetaLevel(id);
    return Math.floor(spec.baseCost * Math.pow(spec.costMult, lvl));
  }

  public buyMetaUpgrade(id: MetaUpgradeId): boolean {
    const spec = META_UPGRADES.find((u) => u.id === id);
    if (!spec) return false;
    const lvl = this.getMetaLevel(id);
    if (lvl >= spec.maxLevel) return false;
    const cost = this.getMetaUpgradeCost(id);
    if (this.gold < cost) return false;
    this.gold -= cost;
    this.metaLevels[id] = lvl + 1;
    this.save();
    return true;
  }

  public getEquippedSkin(): SkinSpec {
    return SKINS_CATALOG.find((s) => s.id === this.equippedSkin) || SKINS_CATALOG[0];
  }

  public getSkinRankIndex(id: SkinId): number {
    return Math.min(SKIN_RANK_SPECS.length - 1, Math.max(0, this.skinRanks[id] || 0));
  }

  public getSkinRankSpec(id: SkinId): SkinRankSpec {
    return SKIN_RANK_SPECS[this.getSkinRankIndex(id)] || SKIN_RANK_SPECS[0];
  }

  public getSkinBonusMult(id: SkinId): number {
    if (!this.ownedSkins.includes(id)) return 0;
    return this.getSkinRankSpec(id).bonusMult;
  }

  public getSkinShards(id: SkinId): number {
    return Math.max(0, this.skinShards[id] || 0);
  }

  public canAscendSkin(id: SkinId): {
    ok: boolean;
    isMaxRank: boolean;
    currentShards: number;
    requiredShards: number;
    requiredGold: number;
    hasEnoughShards: boolean;
    hasEnoughGold: boolean;
    currentRank: SkinRankSpec;
    nextRank: SkinRankSpec | null;
  } {
    const spec = SKINS_CATALOG.find((s) => s.id === id) || SKINS_CATALOG[0];
    const rankIdx = this.getSkinRankIndex(id);
    const currentRank = SKIN_RANK_SPECS[rankIdx];
    const isMaxRank = rankIdx >= SKIN_RANK_SPECS.length - 1;
    const nextRank = isMaxRank ? null : SKIN_RANK_SPECS[rankIdx + 1];
    const currentShards = this.getSkinShards(id);
    const requiredShards = currentRank.shardsToNext;
    const requiredGold = isMaxRank ? 0 : Math.round(currentRank.goldToNext * spec.ascendGoldMult);
    const hasEnoughShards = currentShards >= requiredShards;
    const hasEnoughGold = this.gold >= requiredGold;
    const ok =
      this.ownedSkins.includes(id) && !isMaxRank && hasEnoughShards && hasEnoughGold;
    return {
      ok,
      isMaxRank,
      currentShards,
      requiredShards,
      requiredGold,
      hasEnoughShards,
      hasEnoughGold,
      currentRank,
      nextRank,
    };
  }

  public ascendSkin(id: SkinId): boolean {
    const check = this.canAscendSkin(id);
    if (!check.ok || !check.nextRank) return false;
    this.gold = Math.max(0, this.gold - check.requiredGold);
    this.skinShards[id] = Math.max(0, check.currentShards - check.requiredShards);
    this.skinRanks[id] = check.nextRank.index;
    this.save();
    return true;
  }

  public rollStageSkinShardDrop(stageNum: number): SkinShardDropReport | null {
    if (this.ownedSkins.length === 0) return null;
    // Prefer owned skins that have not yet reached SSS (index 5); if all are SSS, still drop for equipped skin
    const upgradeableOwned = this.ownedSkins.filter(
      (sid) => this.getSkinRankIndex(sid) < SKIN_RANK_SPECS.length - 1
    );
    const pool = upgradeableOwned.length > 0 ? upgradeableOwned : this.ownedSkins;

    // 60% chance to drop shards for the currently equipped skin (if in pool), otherwise random owned skin
    let chosenId: SkinId;
    if (pool.includes(this.equippedSkin) && Math.random() < 0.6) {
      chosenId = this.equippedSkin;
    } else {
      chosenId = pool[Math.floor(Math.random() * pool.length)];
    }

    const isMegaBoss = stageNum % 10 === 0;
    const isMiniBoss = stageNum % 10 === 5;
    const baseDrop = 2 + Math.floor(Math.random() * 3) + Math.floor(stageNum / 10);
    const bossBonus = isMegaBoss ? 6 : isMiniBoss ? 3 : 0;
    const amount = baseDrop + bossBonus;

    this.skinShards[chosenId] = (this.skinShards[chosenId] || 0) + amount;
    this.save();

    const spec = SKINS_CATALOG.find((s) => s.id === chosenId) || SKINS_CATALOG[0];
    const check = this.canAscendSkin(chosenId);
    return {
      skinId: chosenId,
      skinName: spec.name,
      badgeColor: spec.badgeColor,
      amount,
      currentShards: check.currentShards,
      nextRequired: check.requiredShards,
      rankSpec: check.currentRank,
      canAscendNow: check.ok,
    };
  }

  public grantBonusSkinShards(amount: number): { skinId: SkinId; skinName: string; amount: number } {
    const cleanAmt = Math.max(1, Math.floor(amount));
    const pool = this.ownedSkins.length > 0 ? this.ownedSkins : (['azure'] as SkinId[]);
    const chosenId =
      pool.includes(this.equippedSkin) && Math.random() < 0.55
        ? this.equippedSkin
        : pool[Math.floor(Math.random() * pool.length)];
    this.skinShards[chosenId] = (this.skinShards[chosenId] || 0) + cleanAmt;
    this.save();
    const spec = SKINS_CATALOG.find((s) => s.id === chosenId) || SKINS_CATALOG[0];
    return { skinId: chosenId, skinName: spec.name, amount: cleanAmt };
  }

  public recordEndlessWave(waveReached: number): { isNewRecord: boolean; bestWave: number } {
    const cleanWave = Math.max(1, Math.floor(waveReached));
    const isNewRecord = cleanWave > this.bestEndlessWave;
    if (isNewRecord) {
      this.bestEndlessWave = cleanWave;
      this.save();
    }
    return { isNewRecord, bestWave: this.bestEndlessWave };
  }

  public getEndlessMedalInfo(wave = this.bestEndlessWave): { tier: string; label: string; color: string } {
    if (wave >= 15) return { tier: 'SSS', label: '不朽圣盾勋章', color: '#facc15' };
    if (wave >= 10) return { tier: 'SS', label: '璀璨钻石勋章', color: '#38bdf8' };
    if (wave >= 6) return { tier: 'S', label: '皇家黄金勋章', color: '#f59e0b' };
    if (wave >= 3) return { tier: 'A', label: '秘银壁垒勋章', color: '#cbd5e1' };
    if (wave >= 1) return { tier: 'B', label: '青铜守卫勋章', color: '#d97706' };
    return { tier: '—', label: '待铸首枚勋章', color: '#94a3b8' };
  }

  public buyOrEquipSkin(id: SkinId): 'equipped' | 'bought' | 'insufficient' {
    const spec = SKINS_CATALOG.find((s) => s.id === id);
    if (!spec) return 'insufficient';
    if (this.ownedSkins.includes(id)) {
      this.equippedSkin = id;
      this.save();
      return 'equipped';
    }
    if (this.gold < spec.cost) return 'insufficient';
    this.gold -= spec.cost;
    this.ownedSkins.push(id);
    if (this.skinRanks[id] === undefined) {
      this.skinRanks[id] = 0; // Starts at C Rank
    }
    this.equippedSkin = id;
    this.save();
    return 'bought';
  }

  public getEquippedFinish(): SquadFinishSpec {
    return (
      SQUAD_FINISH_CATALOG.find((f) => f.id === this.equippedFinish) || SQUAD_FINISH_CATALOG[0]
    );
  }

  public getTotalSkinShards(): number {
    let sum = 0;
    for (const val of Object.values(this.skinShards)) {
      if (typeof val === 'number' && val > 0) sum += Math.floor(val);
    }
    return sum;
  }

  private spendAnySkinShards(amount: number): boolean {
    let remaining = Math.max(0, Math.floor(amount));
    if (remaining === 0) return true;
    if (this.getTotalSkinShards() < remaining) return false;
    const entries = (Object.keys(this.skinShards) as SkinId[])
      .map((k) => ({ id: k, count: Math.max(0, Math.floor(this.skinShards[k] || 0)) }))
      .filter((e) => e.count > 0)
      .sort((a, b) => b.count - a.count);
    for (const entry of entries) {
      if (remaining <= 0) break;
      const take = Math.min(entry.count, remaining);
      this.skinShards[entry.id] = entry.count - take;
      remaining -= take;
    }
    return remaining === 0;
  }

  public isFinishMilestoneMet(spec: SquadFinishSpec): boolean {
    if (spec.milestoneEscortClears > 0 && this.escortClears >= spec.milestoneEscortClears) {
      return true;
    }
    if (spec.milestoneEscortPct > 0 && this.bestEscortProgressPct >= spec.milestoneEscortPct) {
      return true;
    }
    if (spec.milestoneBarricades > 0 && this.totalBarricadesBroken >= spec.milestoneBarricades) {
      return true;
    }
    return false;
  }

  public canUnlockFinish(id: SquadFinishId): {
    isOwned: boolean;
    milestoneFree: boolean;
    canPayResources: boolean;
    canUnlock: boolean;
    totalShards: number;
  } {
    const spec = SQUAD_FINISH_CATALOG.find((f) => f.id === id) || SQUAD_FINISH_CATALOG[0];
    const isOwned = this.ownedFinishes.includes(id);
    const milestoneFree = !isOwned && this.isFinishMilestoneMet(spec);
    const totalShards = this.getTotalSkinShards();
    const canPayResources =
      !isOwned && this.gold >= spec.costGold && totalShards >= spec.costShards;
    return {
      isOwned,
      milestoneFree,
      canPayResources,
      canUnlock: !isOwned && (milestoneFree || canPayResources),
      totalShards,
    };
  }

  public unlockOrEquipFinish(id: SquadFinishId): 'equipped' | 'unlocked' | 'insufficient' {
    const spec = SQUAD_FINISH_CATALOG.find((f) => f.id === id);
    if (!spec) return 'insufficient';
    if (this.ownedFinishes.includes(id)) {
      this.equippedFinish = id;
      this.save();
      return 'equipped';
    }
    const check = this.canUnlockFinish(id);
    if (!check.canUnlock) return 'insufficient';
    if (!check.milestoneFree) {
      this.gold = Math.max(0, this.gold - spec.costGold);
      if (spec.costShards > 0) {
        this.spendAnySkinShards(spec.costShards);
      }
    }
    this.ownedFinishes.push(id);
    this.equippedFinish = id;
    this.save();
    return 'unlocked';
  }

  public recordEscortRun(
    progressPct: number,
    clearSec: number,
    barricadesBrokenDelta: number,
    completed: boolean
  ): {
    isNewProgressRecord: boolean;
    isNewSpeedRecord: boolean;
    bestProgressPct: number;
    bestClearSec: number;
    escortClears: number;
  } {
    const cleanPct = completed ? 100 : Math.max(0, Math.min(100, Math.round(progressPct)));
    const isNewProgressRecord = cleanPct > this.bestEscortProgressPct;
    if (isNewProgressRecord) {
      this.bestEscortProgressPct = cleanPct;
    }
    if (barricadesBrokenDelta > 0) {
      this.totalBarricadesBroken += Math.floor(barricadesBrokenDelta);
    }
    let isNewSpeedRecord = false;
    if (completed) {
      this.escortClears += 1;
      const cleanSec = Math.max(1.0, Number(clearSec.toFixed(1)));
      if (this.bestEscortClearSec <= 0 || cleanSec < this.bestEscortClearSec) {
        this.bestEscortClearSec = cleanSec;
        isNewSpeedRecord = true;
      }
    }
    this.save();
    return {
      isNewProgressRecord,
      isNewSpeedRecord,
      bestProgressPct: this.bestEscortProgressPct,
      bestClearSec: this.bestEscortClearSec,
      escortClears: this.escortClears,
    };
  }

  public getEscortRankInfo(
    pct = this.bestEscortProgressPct,
    clears = this.escortClears
  ): { tier: string; label: string; color: string } {
    if (clears >= 3) return { tier: 'SSS', label: '传奇蒸汽统帅', color: '#facc15' };
    if (clears >= 1 || pct >= 100) return { tier: 'S', label: '王牌破障车长', color: '#38bdf8' };
    if (pct >= 60) return { tier: 'A', label: '重装先锋护卫', color: '#f59e0b' };
    if (pct >= 25) return { tier: 'B', label: '蒸汽护航队员', color: '#cbd5e1' };
    return { tier: '—', label: '待发车', color: '#94a3b8' };
  }

  public getEscortSpeedMultiplier(): number {
    return this.ownedFinishes.includes('starlight_prism') ? 1.12 : 1.0;
  }

  public getStartingSkillCharge(): number {
    const orbitalBonus = this.getSkillNodeRank('orbital_t1') * 10;
    return Math.min(75, 12 + this.getMetaLevel('meta_capacitor') * 3 + orbitalBonus);
  }

  /**
   * Computes the 4-stage progressive evolution tier (0 = 雏形, 1 = 一阶, 2 = 觉醒, 3 = 👑完全体)
   * for both Ultimates (Mecha Hammer & Orbital Bombardment).
   * - Initial/unupgraded ultimates start noticeably weaker, smaller in radius, and with restrained VFX.
   * - As the player upgrades their Skill Tree (T1 -> T2 -> T3 -> T4 Keystone) and in-match `championLevel`,
   *   damage, radius, multi-wave count, and visual spectacle progressively unlock up to the Complete Form (👑完全体)!
   */
  public getUltimateEvolutionSpec(): {
    tier: 0 | 1 | 2 | 3;
    badge: string;
    isCompleteForm: boolean;
    dmgMult: number;
    radiusMult: number;
    mechaScaleMult: number;
    hammerAftershockWaves: number;
    orbitalFollowupWaves: number;
    orbitalZHalfSpan: number;
    orbitalXHalfSpan: number;
  } {
    const spentPts = this.getBranchSpentPoints(this.selectedRaceId);
    const hasKeystone = Boolean(this.getActiveKeystoneSpec());
    const champLvl = this.championLevel;
    // Combined evolution score from active character's skill tree investment + in-match champion upgrade level
    const evoScore = spentPts + Math.max(0, champLvl - 1) * 1.4 + (hasKeystone ? 10 : 0);

    let tier: 0 | 1 | 2 | 3 = 0;
    if (hasKeystone || evoScore >= 14) {
      tier = 3; // 👑 完全体
    } else if (evoScore >= 7.5) {
      tier = 2; // 二阶觉醒
    } else if (evoScore >= 3.0) {
      tier = 1; // 一阶强化
    } else {
      tier = 0; // 初始雏形
    }

    const badgeMap: Record<0 | 1 | 2 | 3, string> = {
      0: '雏形',
      1: '一阶',
      2: '觉醒',
      3: '完全体',
    };

    // Tier 0 starts weakened (0.58x dmg, 0.52x radius, 0.78x mecha size, 0 follow-up waves, localized orbital zone)
    // Tier 3 (👑完全体) unleashes 1.25x dmg, 1.15x radius, 1.28x mecha size, 4 hammer stomp waves, 5 full-bridge carpet waves!
    return {
      tier,
      badge: badgeMap[tier],
      isCompleteForm: tier === 3,
      dmgMult: tier === 0 ? 0.58 : tier === 1 ? 0.78 : tier === 2 ? 1.0 : 1.28,
      radiusMult: tier === 0 ? 0.52 : tier === 1 ? 0.72 : tier === 2 ? 0.92 : 1.16,
      mechaScaleMult: tier === 0 ? 0.78 : tier === 1 ? 0.94 : tier === 2 ? 1.1 : 1.28,
      hammerAftershockWaves: tier === 0 ? 0 : tier === 1 ? 1 : tier === 2 ? 2 : 4,
      orbitalFollowupWaves: tier === 0 ? 0 : tier === 1 ? 1 : tier === 2 ? 3 : 5,
      orbitalZHalfSpan: tier === 0 ? 5.2 : tier === 1 ? 8.8 : tier === 2 ? 13.5 : 99,
      orbitalXHalfSpan: tier === 0 ? 4.5 : tier === 1 ? 6.8 : tier === 2 ? 9.5 : 99,
    };
  }

  // ==========================================
  // 7-Branch Tactical Skill Tree Methods (Free Character Switch + Free Multi-Branch Allocation; Only Active Character's Skills Take Effect!)
  // ==========================================
  /**
   * Returns the saved rank invested in `id` (regardless of which character is currently selected).
   * Used by Skill Tree UI, save/load validation, and total point calculation.
   */
  public getSavedSkillNodeRank(id: SkillNodeId): number {
    return this.skillNodes[id] || 0;
  }

  /**
   * Returns the effective rank of `id` in combat & stat calculations.
   * ONLY skills belonging to the currently selected character (`this.selectedRaceId`) take effect!
   */
  public getSkillNodeRank(id: SkillNodeId): number {
    if (!id.startsWith(`${this.selectedRaceId}_`)) return 0;
    return this.skillNodes[id] || 0;
  }

  public getBranchSpentPoints(branchId: SkillBranchId): number {
    const branch = SKILL_TREE_BRANCHES.find((b) => b.id === branchId);
    if (!branch) return 0;
    let pts = 0;
    for (const n of branch.nodes) {
      pts += this.getSavedSkillNodeRank(n.id) * n.pointCost;
    }
    return pts;
  }

  public getEffectiveMatchesPlayed(): number {
    return Math.max(0, this.totalMatchesPlayed, this.bestStageCleared);
  }

  public getRequiredMatchesForNodeRank(_tier: 1 | 2 | 3 | 4, _targetRank: number): number {
    return 0;
  }

  public getMaxSkillPointsByMatches(): number {
    return ALL_SKILL_NODES.reduce((sum, n) => sum + n.maxRank * n.pointCost, 0);
  }

  public getNextMatchUnlockHint(): string {
    return '角色自由切换 · 仅当前上阵角色对应技能生效';
  }

  public sanitizeSkillTreeState(): void {
    for (const node of ALL_SKILL_NODES) {
      const r = this.getSavedSkillNodeRank(node.id);
      if (r <= 0) continue;
      if (r > node.maxRank) {
        this.skillNodes[node.id] = node.maxRank;
      }
    }
    if (this.getSpentTalentPoints() > this.getTotalTalentPoints()) {
      this.skillNodes = {};
    }
  }

  public getUncappedTalentPoints(): number {
    const cleared = Math.max(0, this.bestStageCleared);
    const matches = this.getEffectiveMatchesPlayed();
    const matchPoints = Math.floor(matches / 2);
    const stageMilestones = Math.floor(cleared / 3);
    const miniBossBonus = Math.floor((cleared + 5) / 10);
    const megaBossBonus = Math.floor(cleared / 10) * 2;
    return 1 + matchPoints + stageMilestones + miniBossBonus + megaBossBonus + this.bonusTalentPoints;
  }

  public getTotalTalentPoints(): number {
    return Math.min(this.getMaxSkillPointsByMatches(), this.getUncappedTalentPoints());
  }

  public getSpentTalentPoints(): number {
    let spent = 0;
    for (const node of ALL_SKILL_NODES) {
      const r = this.getSavedSkillNodeRank(node.id);
      if (r > 0) spent += r * node.pointCost;
    }
    return spent;
  }

  public getAvailableTalentPoints(): number {
    return Math.max(0, this.getTotalTalentPoints() - this.getSpentTalentPoints());
  }

  public getCommittedSkillBranch(): SkillBranchSpec | null {
    return this.getActiveRaceBranch();
  }

  /**
   * Returns the currently selected Playable Race branch (`selectedRaceId`).
   * Characters can be switched freely at any time; only the selected character's skills take effect.
   */
  public getActiveRaceBranch(): SkillBranchSpec {
    return SKILL_TREE_BRANCHES.find((b) => b.id === this.selectedRaceId) || SKILL_TREE_BRANCHES[0];
  }

  public selectRaceBranch(branchId: SkillBranchId): boolean {
    if (!SKILL_TREE_BRANCHES.some((b) => b.id === branchId)) return false;
    if (this.selectedRaceId === branchId) return false;
    this.selectedRaceId = branchId;
    this.save();
    return true;
  }

  public getActiveKeystoneSpec(): { branch: SkillBranchSpec; node: SkillNodeSpec } | null {
    const activeBranch = this.getActiveRaceBranch();
    for (const n of activeBranch.nodes) {
      if (n.isKeystone && this.getSkillNodeRank(n.id) > 0) {
        return { branch: activeBranch, node: n };
      }
    }
    return null;
  }

  /**
   * Returns the ⚡ energy point (gold) cost required to upgrade a skill node to `targetRank`.
   * T1 Lv.1 costs 120⚡ (affordable on a fresh save), then escalates steeply up to 200,000⚡ for the T4 Keystone!
   */
  public getSkillNodeUpgradeGoldCost(tier: 1 | 2 | 3 | 4, targetRank: number): number {
    if (tier === 1) {
      if (targetRank <= 1) return 120;
      if (targetRank === 2) return 2500;
      return 6000;
    }
    if (tier === 2) {
      if (targetRank <= 1) return 12000;
      if (targetRank === 2) return 20000;
      return 32000;
    }
    if (tier === 3) {
      if (targetRank <= 1) return 50000;
      if (targetRank === 2) return 75000;
      return 110000;
    }
    return 200000;
  }

  public canUpgradeSkillNode(id: SkillNodeId): {
    ok: boolean;
    reason: string;
    reqMatches?: number;
    goldCost: number;
  } {
    const spec = ALL_SKILL_NODES.find((n) => n.id === id);
    if (!spec) return { ok: false, reason: '未知节点', goldCost: 0 };
    const curRank = this.getSavedSkillNodeRank(id);
    if (curRank >= spec.maxRank) return { ok: false, reason: '已满级', goldCost: 0 };

    const nextRank = curRank + 1;
    const goldCost = this.getSkillNodeUpgradeGoldCost(spec.tier, nextRank);

    if (this.getAvailableTalentPoints() < spec.pointCost) {
      return {
        ok: false,
        reason: `天赋点不足 (需 ${spec.pointCost}点)`,
        goldCost,
      };
    }

    if (this.gold < goldCost) {
      return {
        ok: false,
        reason: `需 ${spec.pointCost}点 + ${goldCost.toLocaleString()}⚡ (点数不足)`,
        goldCost,
      };
    }

    return {
      ok: true,
      reason: `⬆️ 升级 (${spec.pointCost}点 + ${goldCost.toLocaleString()}⚡)`,
      goldCost,
    };
  }

  public upgradeSkillNode(id: SkillNodeId): boolean {
    const check = this.canUpgradeSkillNode(id);
    if (!check.ok) return false;
    this.gold = Math.max(0, this.gold - check.goldCost);
    this.skillNodes[id] = (this.skillNodes[id] || 0) + 1;
    this.save();
    return true;
  }

  public getBaseResetSkillTreeCost(): number {
    const pts = Math.max(1, this.getSpentTalentPoints());
    return Math.floor(8000 + pts * 3500 + this.skillRespecCount * 10000);
  }

  public getResetSkillTreeDiscount(): number {
    return Math.max(0, this.stagesPlayedSinceRespec) * 1000;
  }

  public getResetSkillTreeCost(): number {
    return Math.max(0, this.getBaseResetSkillTreeCost() - this.getResetSkillTreeDiscount());
  }

  public resetSkillTree(): boolean {
    const spent = this.getSpentTalentPoints();
    if (spent <= 0) return false;
    const cost = this.getResetSkillTreeCost();
    if (this.gold < cost) return false;
    this.gold -= cost;
    this.skillRespecCount += 1;
    this.stagesPlayedSinceRespec = 0;
    this.skillNodes = {};
    this.save();
    return true;
  }

  public getBonusTalentPointCost(): number {
    // Ultra-expensive endgame gold sink: starts at 15000 gold, scales steeply by 1.85^n + 12000*n
    return Math.floor(15000 * Math.pow(1.85, this.bonusTalentPoints) + this.bonusTalentPoints * 12000);
  }

  public canBuyBonusTalentPoint(): { ok: boolean; reason: string } {
    const cost = this.getBonusTalentPointCost();
    if (this.getUncappedTalentPoints() >= this.getMaxSkillPointsByMatches()) {
      return {
        ok: false,
        reason: `🔒 局数上限 (${this.getEffectiveMatchesPlayed()}局)`,
      };
    }
    if (this.gold < cost) {
      return { ok: false, reason: `⚡ ${cost.toLocaleString()} 购1点` };
    }
    return { ok: true, reason: `⚡ ${cost.toLocaleString()} 购1点` };
  }

  public buyBonusTalentPoint(): boolean {
    const check = this.canBuyBonusTalentPoint();
    if (!check.ok) return false;
    const cost = this.getBonusTalentPointCost();
    this.gold -= cost;
    this.bonusTalentPoints += 1;
    this.save();
    return true;
  }

  public getMechaSpec(): MechaSpec {
    return MECHA_SPECS[this.mechaMode] || MECHA_SPECS.hammer;
  }

  public cycleMechaMode(): MechaSpec {
    const idx = MECHA_ORDER.indexOf(this.mechaMode);
    this.mechaMode = MECHA_ORDER[(idx + 1) % MECHA_ORDER.length];
    this.save();
    return this.getMechaSpec();
  }

  public getWeaponSpec(): WeaponSpec {
    return WEAPON_SPECS[this.weapon] || WEAPON_SPECS.gatling;
  }

  public setWeaponMode(mode: WeaponMode): WeaponSpec {
    if (WEAPON_SPECS[mode]) {
      this.weapon = mode;
      this.save();
    }
    return this.getWeaponSpec();
  }

  public cycleWeaponMode(): WeaponSpec {
    const idx = WEAPON_ORDER.indexOf(this.weapon);
    this.weapon = WEAPON_ORDER[(idx + 1) % WEAPON_ORDER.length];
    this.save();
    return this.getWeaponSpec();
  }

  public getBuffStack(id: BuffId): number {
    return this.buffStacks[id] || 0;
  }

  public hasDebuff(id: DebuffId): boolean {
    return this.activeDebuffs.some((d) => d.id === id && d.remainingStages > 0);
  }

  // Derived combat stats (combining In-Match Gold Upgrades + Out-of-Match Meta Tech + Skill Tree + Owned Skins(C->SSS) + Post-Stage Buffs - Active Debuffs!)
  public getFireRatePerSec(): number {
    const base = 2.7 + (this.fireRateLevel - 1) * 0.16;
    const metaMult = 1 + this.getMetaLevel('meta_firerate') * 0.025;
    const swarmSkillMult = 1 + this.getSkillNodeRank('swarm_t1') * 0.12;
    const titanT1 = this.getSkillNodeRank('titan_t1');
    const titanHeavySlowMult = titanT1 === 1 ? 0.55 : titanT1 === 2 ? 0.48 : titanT1 >= 3 ? 0.42 : 1.0;
    const skinMult =
      1 +
      0.02 * this.getSkinBonusMult('emerald') +
      0.04 * this.getSkinBonusMult('nebula');
    const buffMult = 1 + this.getBuffStack('rapid_fire') * 0.05;
    const debuffMult = this.hasDebuff('barrel_overheat') ? 0.85 : 1.0;
    const sceneMult = this.activeSceneThemeId === 'wasteland' ? 1.18 : 1.0;
    const weaponMult = this.getWeaponSpec().fireRateMult;
    const trophyMult = this.getTournamentTrophyBonus().fireRateMult;
    const boboTechFireMult = this.getBoboTechCombatBonuses().cannonFireRateMult;
    const airshipMedalFireMult = this.getAirshipMilestoneBonus().fireRateMult;
    const cannonModFireMult = this.getCannonModCombatSpec().fireRateMult;
    const hallFireMult = 1 + this.getHallTrophyBuff('fire');
    const stardustFireMult = this.getStardustFireMult();
    return (
      base *
      metaMult *
      swarmSkillMult *
      titanHeavySlowMult *
      skinMult *
      buffMult *
      debuffMult *
      sceneMult *
      weaponMult *
      trophyMult *
      boboTechFireMult *
      airshipMedalFireMult *
      cannonModFireMult *
      hallFireMult *
      stardustFireMult
    );
  }

  public getSwarmTrooperSpec(): {
    isSwarmMode: boolean;
    scaleMult: number;
    speedMult: number;
    hpMult: number;
    dmgMult: number;
    gateExtraCloneChance: number;
    kamikazeDmgRatio: number;
    killMitosisChance: number;
  } {
    const s1 = this.getSkillNodeRank('swarm_t1');
    const s2 = this.getSkillNodeRank('swarm_t2');
    const s3 = this.getSkillNodeRank('swarm_t3');
    const s4 = this.getSkillNodeRank('swarm_t4');
    if (s1 <= 0) {
      return {
        isSwarmMode: false,
        scaleMult: 1.0,
        speedMult: 1.0,
        hpMult: 1.0,
        dmgMult: 1.0,
        gateExtraCloneChance: 0,
        kamikazeDmgRatio: 0,
        killMitosisChance: 0,
      };
    }
    return {
      isSwarmMode: true,
      scaleMult: 0.88, // Nimble Zergling-like swarmer body
      speedMult: 1.1, // +10% base rush speed
      hpMult: 0.86, // Slightly lighter per body, compensated by massive clone count & kamikaze splash
      dmgMult: 0.88,
      gateExtraCloneChance: s2 * 0.15,
      kamikazeDmgRatio: s3 > 0 ? 0.28 + s3 * 0.22 : 0, // 50% / 72% / 94% AOE plasma detonation on death
      killMitosisChance: s4 > 0 ? 0.18 : 0,
    };
  }

  public getBastionTrooperSpec(): {
    isBastionMode: boolean;
    trooperHpMult: number;
    trooperDmgReduction: number;
    praetorianShotInterval: number;
  } {
    const b1 = this.getSkillNodeRank('bastion_t1');
    const b3 = this.getSkillNodeRank('bastion_t3');
    if (b1 <= 0) {
      return {
        isBastionMode: false,
        trooperHpMult: 1.0,
        trooperDmgReduction: 0,
        praetorianShotInterval: 0,
      };
    }
    return {
      isBastionMode: true,
      trooperHpMult: 1 + b1 * 0.18, // +18% / +36% / +54% max HP on every Blue trooper
      trooperDmgReduction: b1 * 0.08, // 8% / 16% / 24% damage reduction
      praetorianShotInterval: b3 > 0 ? Math.max(5, 13 - b3 * 2) : 0, // Every 11 / 9 / 7 turret shots deploys a Golden Praetorian Guard!
    };
  }

  public getGiantTrooperSpec(): {
    isGiantMode: boolean;
    startFusionTier: number;
    t4DirectTier2Chance: number;
    maxFusionTier: number;
    baseScale: number;
    baseHpMult: number;
    baseDmgMult: number;
    fusionStatAmplify: number;
    cleaveRadius: number;
    cleaveRatio: number;
    dmgReduction: number;
  } {
    const r1 = this.getSkillNodeRank('titan_t1');
    const r2 = this.getSkillNodeRank('titan_t2');
    const r3 = this.getSkillNodeRank('titan_t3');
    const r4 = this.getSkillNodeRank('titan_t4');
    if (r1 <= 0) {
      return {
        isGiantMode: false,
        startFusionTier: 0,
        t4DirectTier2Chance: 0,
        maxFusionTier: 1,
        baseScale: 1.0,
        baseHpMult: 1.0,
        baseDmgMult: 1.0,
        fusionStatAmplify: 1.0,
        cleaveRadius: 0,
        cleaveRatio: 0,
        dmgReduction: 0,
      };
    }
    return {
      isGiantMode: true,
      startFusionTier: 1,
      t4DirectTier2Chance: r4 > 0 ? 0.25 : 0,
      maxFusionTier: r4 > 0 ? 4 : r2 > 0 ? 3 : 2,
      baseScale: 1.38 + r1 * 0.12, // 1.50x -> 1.62x -> 1.74x base giant size
      baseHpMult: 1.55 + r1 * 0.35, // 1.90x -> 2.25x -> 2.60x base giant HP (balanced against 0.55x~0.42x fire rate!)
      baseDmgMult: 1.4 + r1 * 0.25, // 1.65x -> 1.90x -> 2.15x base giant DMG
      fusionStatAmplify: 1 + r2 * 0.08 + r4 * 0.1, // +0% -> +24% (+34% at T4) bonus stat efficiency when fusing
      cleaveRadius: 1.35 + r3 * 0.28,
      cleaveRatio: r3 > 0 ? 0.1 + r3 * 0.08 : 0.08, // 8% base impact splash -> 18%/26%/34% with titan_t3
      dmgReduction: r3 * 0.05, // 5%/10%/15% damage reduction from titan_t3
    };
  }

  public getPowerMultiplier(): number {
    const base = 1 + (this.powerLevel - 1) * 0.08;
    const metaMult = 1 + this.getMetaLevel('meta_attack') * 0.03;
    const tycoonRank = this.getSkillNodeRank('tycoon_t3');
    const tycoonGoldBonus =
      tycoonRank > 0
        ? Math.min(tycoonRank * 0.22, Math.floor(Math.max(0, this.gold) / 200) * (tycoonRank * 0.018))
        : 0;
    const skillMult = 1 + tycoonGoldBonus;
    const skinMult =
      1 +
      0.02 * this.getSkinBonusMult('crimson') +
      0.04 * this.getSkinBonusMult('nebula') +
      (this.ownedFinishes.includes('starlight_prism') ? 0.05 : 0);
    const buffMult = 1 + this.getBuffStack('hyper_gene') * 0.06;
    const debuffMult = this.hasDebuff('gene_instability') ? 0.85 : 1.0;
    const sceneMult =
      this.activeSceneThemeId === 'magma' ? 1.2 : this.activeSceneThemeId === 'royal' ? 1.15 : 1.0;
    const trophyMult = this.getTournamentTrophyBonus().powerMult;
    const hallPowerMult = 1 + this.getHallTrophyBuff('power');
    return base * metaMult * skillMult * skinMult * buffMult * debuffMult * sceneMult * trophyMult * hallPowerMult;
  }

  public getChampionMultiplier(): number {
    const base = 1 + (this.championLevel - 1) * 0.12;
    const metaMult = 1 + this.getMetaLevel('meta_attack') * 0.03;
    const ultEvo = this.getUltimateEvolutionSpec();
    const skillMult = (1 + this.getSkillNodeRank('titan_t1') * 0.07) * ultEvo.dmgMult;
    const buffMult = 1 + this.getBuffStack('hyper_gene') * 0.06 + this.getBuffStack('titan_reactor') * 0.05;
    const debuffMult = this.hasDebuff('gene_instability') ? 0.85 : 1.0;
    return base * metaMult * skillMult * buffMult * debuffMult;
  }

  public getLootMultiplier(): number {
    const skinBonus = 0.05 * this.getSkinBonusMult('imperium');
    const tycoonLoot = this.getSkillNodeRank('tycoon_t1') * 0.16;
    const sceneMult = this.activeSceneThemeId === 'royal' ? 1.35 : 1.0;
    const relicGoldMult = this.getRelicBannerCombatSpec().goldMult;
    const petGoldMult = this.getPetCompanionCombatSpec().goldMult;
    const hallGoldMult = this.getHallGoldMult();
    const gachaCollectionMult = this.getGachaCollectionGoldMult();
    const decorComfortMult = this.getDecorGoldMult();
    return (
      (1 +
        (this.lootLevel - 1) * 0.07 +
        this.getMetaLevel('meta_bounty') * 0.04 +
        this.getBuffStack('war_plunder') * 0.07 +
        tycoonLoot +
        skinBonus) *
      sceneMult *
      relicGoldMult *
      petGoldMult *
      hallGoldMult *
      gachaCollectionMult *
      decorComfortMult
    );
  }

  public getMoveSpeedMultiplier(): number {
    const metaMult = 1 + this.getMetaLevel('meta_thruster') * 0.02;
    const swarmSpeed = this.getSkillNodeRank('swarm_t1') > 0 ? 1.1 : 1.0;
    const finishSpeed = this.ownedFinishes.includes('crystal_jelly') ? 1.06 : 1.0;
    const buffMult = 1 + Math.min(0.36, this.getBuffStack('nitro_stride') * 0.04);
    const debuffMult = this.hasDebuff('cryo_sludge') ? 0.88 : 1.0;
    const sceneMult =
      this.activeSceneThemeId === 'emerald' ? 1.22 : this.activeSceneThemeId === 'sakura' ? 1.15 : 1.0;
    const boboTechMoveMult = this.getBoboTechCombatBonuses().moveSpeedMult;
    const relicMoveMult = this.getRelicBannerCombatSpec().moveSpeedMult;
    const iceMoveMult = this.getIceMedalSpeedMult() * (1 + this.getHallTrophyBuff('speed'));
    return (
      metaMult *
      swarmSpeed *
      finishSpeed *
      buffMult *
      debuffMult *
      sceneMult *
      boboTechMoveMult *
      relicMoveMult *
      iceMoveMult
    );
  }

  public getExtraCloneChance(): number {
    const swarmT1 = this.getSkillNodeRank('swarm_t1') * 0.32;
    const gateT1 = this.getSkillNodeRank('gate_t1') * 0.2;
    const swarmKeystone = this.getSkillNodeRank('swarm_t4') > 0 ? 1.25 : 0;
    const splitBuff = this.getBuffStack('split_chamber') * 0.12;
    return Math.min(1.8, Math.max(swarmKeystone, swarmT1 + gateT1) + splitBuff);
  }

  public getChargedCritChance(): number {
    if (this.getSkillNodeRank('plasma_t4') > 0) return 1.0;
    const plasmaCap = this.getSkillNodeRank('plasma_t1') * 0.22;
    const tycoonBullion = this.getSkillNodeRank('tycoon_t3') * 0.1;
    return Math.min(1.0, this.getBuffStack('plasma_crit') * 0.1 + plasmaCap + tycoonBullion);
  }

  public getMiniGiantChance(): number {
    return this.getSkillNodeRank('titan_t2') * 0.025;
  }

  public getSkillChargeMultiplier(): number {
    const skinMult = 1 + 0.04 * this.getSkinBonusMult('phantom');
    const orbitalSiphon = 1 + this.getSkillNodeRank('orbital_t1') * 0.16;
    const buffMult = 1 + this.getBuffStack('titan_reactor') * 0.07;
    const debuffMult = this.hasDebuff('reactor_leak') ? 0.7 : 1.0;
    const sceneMult = this.activeSceneThemeId === 'cyberhive' ? 1.35 : 1.0;
    return skinMult * orbitalSiphon * buffMult * debuffMult * sceneMult;
  }

  public getBaseHpMultiplier(): number {
    const metaMult = 1 + this.getMetaLevel('meta_bastion') * 0.05;
    const azureSkinMult = 1 + 0.015 * this.getSkinBonusMult('azure');
    const finishHpMult = this.ownedFinishes.includes('candy_gloss') ? 1.03 : 1.0;
    const bastionWall = 1 + this.getSkillNodeRank('bastion_t1') * 0.18;
    const buffMult = 1 + this.getBuffStack('bastion_aegis') * 0.1;
    const debuffMult = this.hasDebuff('shield_fracture') ? 0.75 : 1.0;
    const sceneMult = this.activeSceneThemeId === 'emerald' ? 1.25 : 1.0;
    return metaMult * azureSkinMult * finishHpMult * bastionWall * buffMult * debuffMult * sceneMult;
  }

  public getGateBonusAdd(): number {
    const gateT2Bonus = this.getSkillNodeRank('gate_t2') >= 3 ? 1 : 0;
    return Math.min(3, this.getBuffStack('gate_resonance') + gateT2Bonus);
  }

  public getMaxBlueGateCap(): number {
    return 4 + this.getSkillNodeRank('gate_t2');
  }

  public getSiegeDamageMultiplier(): number {
    const bastionSiege = this.getSkillNodeRank('bastion_t3') * 0.2;
    const brassFinish = this.ownedFinishes.includes('brass_steam') ? 0.1 : 0;
    const sceneMult = this.activeSceneThemeId === 'wasteland' ? 1.25 : 1.0;
    const boboTechSiegeMult = this.getBoboTechCombatBonuses().siegeDamageMult;
    const hallSiegeMult = 1 + this.getHallTrophyBuff('siege');
    return (
      (1 + this.getBuffStack('siege_breaker') * 0.1 + bastionSiege + brassFinish) *
      sceneMult *
      boboTechSiegeMult *
      hallSiegeMult
    );
  }

  public getInMatchUpgradeDiscountMult(): number {
    return Math.max(0.55, 1 - this.getSkillNodeRank('tycoon_t2') * 0.1);
  }

  // In-run tactical upgrade requirements (controlled by in-run Time, Kills, Spawns, and Siege — never costs meta gold!)
  public getFireRateCost(): number {
    return Math.max(5, Math.floor(8 * Math.pow(1.35, this.fireRateLevel - 1) * this.getInMatchUpgradeDiscountMult()));
  }

  public getPowerCost(): number {
    return Math.max(8, Math.floor(12 * Math.pow(1.38, this.powerLevel - 1) * this.getInMatchUpgradeDiscountMult()));
  }

  public getChampionCost(): number {
    return Math.max(15, Math.floor(25 * Math.pow(1.4, this.championLevel - 1) * this.getInMatchUpgradeDiscountMult()));
  }

  public getLootCost(): number {
    return Math.max(20, Math.floor(30 * Math.pow(1.4, this.lootLevel - 1) * this.getInMatchUpgradeDiscountMult()));
  }

  public addGold(amount: number): number {
    const actual = Math.max(1, Math.round(amount * this.getLootMultiplier()));
    this.gold += actual;
    this.stageGoldEarned += actual;
    this.save();
    return actual;
  }

  /**
   * Rolls a single unified rarity tier for the entire 3-card post-stage draft.
   * Literal probability distribution:
   * - 普通强化 (common): 68%
   * - 稀有强化 (rare):   23%
   * - 史诗强化 (epic):    7%
   * - 传说强化 (legendary): 2%
   */
  public rollStageRarity(): BuffRarity {
    const r = Math.random();
    if (r < 0.02) return 'legendary';
    if (r < 0.09) return 'epic';
    if (r < 0.32) return 'rare';
    return 'common';
  }

  public getRarityMeta(rarity: BuffRarity): { label: string; stacks: number } {
    switch (rarity) {
      case 'legendary':
        return { label: '传说强化', stacks: 4 };
      case 'epic':
        return { label: '史诗强化', stacks: 3 };
      case 'rare':
        return { label: '稀有强化', stacks: 2 };
      default:
        return { label: '普通强化', stacks: 1 };
    }
  }

  // Post-Stage 3-Choice Buff Catalog & Generator (All cards in a roll share the exact same Rarity Tier!)
  public getAllRewardDefinitions(
    stageNum: number,
    rarity: BuffRarity = 'common',
    stackMultiplier = 1
  ): RewardOption[] {
    const { label: baseRarityLabel, stacks: baseStacks } = this.getRarityMeta(rarity);
    const mult = Math.max(1, Math.round(stackMultiplier));
    const stacks = baseStacks * mult;
    const rarityLabel = mult > 1 ? `${baseRarityLabel} · ×${mult}` : baseRarityLabel;
    const baseBonusGold = Math.round(35 * Math.pow(1.06, Math.min(stageNum - 1, 20)));
    const totalGoldDrop = baseBonusGold * stacks;

    const list: RewardOption[] = [
      {
        id: 'rapid_fire',
        icon: REWARD_BUFF_ART.rapid_fire,
        title: '极速射击',
        rarity,
        rarityLabel,
        stacksGranted: stacks,
        desc: `蒸汽炮射速 +${stacks * 5}%${mult > 1 ? ` (×${mult})` : ''}`,
        currentText: `已叠: +${Math.round(this.getBuffStack('rapid_fire') * 5)}%`,
      },
      {
        id: 'hyper_gene',
        icon: REWARD_BUFF_ART.hyper_gene,
        title: '战力强化',
        rarity,
        rarityLabel,
        stacksGranted: stacks,
        desc: `全军生命与战力 +${stacks * 6}%${mult > 1 ? ` (×${mult})` : ''}`,
        currentText: `已叠: +${Math.round(this.getBuffStack('hyper_gene') * 6)}%`,
      },
      {
        id: 'bastion_aegis',
        icon: REWARD_BUFF_ART.bastion_aegis,
        title: '基地加固',
        rarity,
        rarityLabel,
        stacksGranted: stacks,
        desc: `我方泡泡站生命 +${stacks * 10}%${mult > 1 ? ` (×${mult})` : ''}`,
        currentText: `已叠: +${Math.round(this.getBuffStack('bastion_aegis') * 10)}%`,
      },
      {
        id: 'nitro_stride',
        icon: REWARD_BUFF_ART.nitro_stride,
        title: '急行冲锋',
        rarity,
        rarityLabel,
        stacksGranted: stacks,
        desc: `全军冲锋移速 +${stacks * 4}%${mult > 1 ? ` (×${mult})` : ''}`,
        currentText: `已叠: +${Math.round(Math.min(36, this.getBuffStack('nitro_stride') * 4))}%`,
      },
      {
        id: 'siege_breaker',
        icon: REWARD_BUFF_ART.siege_breaker,
        title: '攻城破甲',
        rarity,
        rarityLabel,
        stacksGranted: stacks,
        desc: `拆厂与破锅炉伤害 +${stacks * 10}%${mult > 1 ? ` (×${mult})` : ''}`,
        currentText: `已叠: +${Math.round(this.getBuffStack('siege_breaker') * 10)}%`,
      },
      {
        id: 'titan_reactor',
        icon: REWARD_BUFF_ART.titan_reactor,
        title: '极速充能',
        rarity,
        rarityLabel,
        stacksGranted: stacks,
        desc: `大招充能 +${stacks * 7}% · 立即充能 +${Math.min(100, stacks * 10)}%`,
        currentText: `已叠: +${Math.round(this.getBuffStack('titan_reactor') * 7)}%`,
      },
      {
        id: 'plasma_crit',
        icon: REWARD_BUFF_ART.plasma_crit,
        title: '高能暴击',
        rarity,
        rarityLabel,
        stacksGranted: stacks,
        desc: `黄金高能波波率 +${stacks * 10}%${mult > 1 ? ` (×${mult})` : ''}`,
        currentText: `当前触发率: ${Math.round(this.getChargedCritChance() * 100)}%`,
      },
      {
        id: 'split_chamber',
        icon: REWARD_BUFF_ART.split_chamber,
        title: '双联齐射',
        rarity,
        rarityLabel,
        stacksGranted: stacks,
        desc: `双联齐射率 +${stacks * 12}%${mult > 1 ? ` (×${mult})` : ''}`,
        currentText: `当前触发率: ${Math.round(this.getExtraCloneChance() * 100)}%`,
      },
      {
        id: 'war_plunder',
        icon: REWARD_BUFF_ART.war_plunder,
        title: '赏金掠夺',
        rarity,
        rarityLabel,
        stacksGranted: stacks,
        desc: `赏金 +${stacks * 7}% · 立即获 +${totalGoldDrop}金币`,
        currentText: `已叠: +${Math.round(this.getBuffStack('war_plunder') * 7)}%`,
      },
    ];

    // Gate Resonance (+1 clone per +N gate) only appears in Epic or Legendary drafts when below the cap
    if ((rarity === 'epic' || rarity === 'legendary') && this.getGateBonusAdd() < 3) {
      const gateStacks = 1 * mult;
      list.push({
        id: 'gate_resonance',
        icon: REWARD_BUFF_ART.gate_resonance,
        title: '倍增强化',
        rarity,
        rarityLabel,
        stacksGranted: gateStacks,
        desc: `穿过+N横幅额外增援 +${gateStacks} 只${mult > 1 ? ` (×${mult})` : ''} (最高+3)`,
        currentText: `当前: +${this.getGateBonusAdd()} 只/次`,
      });
    }

    return list;
  }

  public rollStageRewards(stageNum: number, count = 3, stackMultiplier = 1): RewardOption[] {
    const unifiedRarity = this.rollStageRarity();
    const pool = [...this.getAllRewardDefinitions(stageNum, unifiedRarity, stackMultiplier)];
    const chosen: RewardOption[] = [];
    while (chosen.length < count && pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length);
      chosen.push(pool.splice(idx, 1)[0]);
    }
    return chosen;
  }

  public rebuildRewardOptions(
    stageNum: number,
    options: RewardOption[],
    stackMultiplier = 1
  ): RewardOption[] {
    if (options.length === 0) return [];
    const rarity = options[0].rarity;
    const defs = this.getAllRewardDefinitions(stageNum, rarity, stackMultiplier);
    return options.map((opt) => defs.find((d) => d.id === opt.id) || opt);
  }

  public applyRewardBuff(
    id: BuffId,
    stageNum: number,
    rarity: BuffRarity = 'common',
    stacksGranted = 1
  ): RewardOption {
    const gain = Math.max(1, stacksGranted);
    if (id === 'gate_resonance') {
      this.buffStacks[id] = Math.min(3, (this.buffStacks[id] || 0) + gain);
    } else {
      this.buffStacks[id] = (this.buffStacks[id] || 0) + gain;
    }

    if (id === 'titan_reactor') {
      const chargeBoost = Math.min(100, gain * 10);
      this.championCharge = Math.min(100, this.championCharge + chargeBoost);
      this.orbitalCharge = Math.min(100, this.orbitalCharge + chargeBoost);
      this.mechaOverlordCharge = Math.min(100, this.mechaOverlordCharge + chargeBoost);
      this.subWeaponCharge = Math.min(100, this.subWeaponCharge + chargeBoost * 1.5);
    } else if (id === 'war_plunder') {
      const baseBonusGold = Math.round(35 * Math.pow(1.06, Math.min(stageNum - 1, 20)));
      this.gold += baseBonusGold * gain;
    }
    this.save();
    const all = this.getAllRewardDefinitions(stageNum, rarity);
    return all.find((item) => item.id === id) || all[0];
  }

  public creditSkippedStages(finalClearedStage: number, skippedCount: number): void {
    if (skippedCount <= 0) return;
    this.ensureWeeklyLeaderboardCycle();
    this.totalMatchesPlayed += skippedCount;
    this.stagesPlayedSinceRespec += skippedCount;
    if (finalClearedStage > this.bestStageCleared) {
      this.bestStageCleared = finalClearedStage;
    }
    if (finalClearedStage > this.weeklyBestStage) {
      this.weeklyBestStage = finalClearedStage;
    }
    if (this.totalMatchesPlayed < this.bestStageCleared) {
      this.totalMatchesPlayed = this.bestStageCleared;
    }
    for (let i = 0; i < skippedCount; i++) {
      this.tickStageVictoryDebuffs();
    }
    this.save();
    void this.syncRemoteLeaderboard(false);
  }

  /**
   * Tick down active debuffs when clearing a stage.
   */
  public tickStageVictoryDebuffs(): string[] {
    const expiredTitles: string[] = [];
    for (const d of this.activeDebuffs) {
      d.remainingStages -= 1;
      if (d.remainingStages <= 0) {
        expiredTitles.push(d.title);
      }
    }
    this.activeDebuffs = this.activeDebuffs.filter((d) => d.remainingStages > 0);
    this.save();
    return expiredTitles;
  }

  /**
   * Applies defeat penalties on stage failure:
   * 1. Ticks existing debuffs by 1 battle
   * 2. Deducts 1 random stack of acquired Post-Stage Buff (if any)
   * 3. Deducts 15% of current unspent gold for emergency tank repair
   * 4. Resets skill charges to 0
   * 5. Inflicts 1 random Hive Affliction debuff lasting 2 stages (capped at 2 concurrent debuffs)
   */
  public applyDefeatPenalty(stageNum: number): DefeatPenaltyReport {
    // 1. Tick existing debuffs first so old ones naturally expire
    for (const d of this.activeDebuffs) {
      d.remainingStages -= 1;
    }
    this.activeDebuffs = this.activeDebuffs.filter((d) => d.remainingStages > 0);

    // 2. Deduct 1 random acquired buff stack if the player has any
    const activeBuffKeys = (Object.keys(this.buffStacks) as BuffId[]).filter(
      (k) => (this.buffStacks[k] || 0) > 0
    );
    let lostBuffTitle: string | null = null;
    let lostBuffIcon: string | null = null;

    if (activeBuffKeys.length > 0) {
      const pickedKey = activeBuffKeys[Math.floor(Math.random() * activeBuffKeys.length)];
      const curStack = this.buffStacks[pickedKey] || 0;
      if (curStack <= 1) {
        delete this.buffStacks[pickedKey];
      } else {
        this.buffStacks[pickedKey] = curStack - 1;
      }
      const def = this.getAllRewardDefinitions(stageNum).find((item) => item.id === pickedKey);
      if (def) {
        lostBuffTitle = def.title;
        lostBuffIcon = def.icon;
      }
    }

    // 3. Deduct 15% unspent gold for emergency repair
    const lostGold = Math.floor(this.gold * 0.15);
    this.gold = Math.max(0, this.gold - lostGold);

    // 4. Drain tactical skill energy
    this.championCharge = 0;
    this.orbitalCharge = 0;
    this.mechaOverlordCharge = 0;
    this.subWeaponCharge = 0;

    // 5. Inflict a random 2-stage Hive Affliction debuff (max 2 concurrent debuffs)
    const template = DEBUFF_CATALOG[Math.floor(Math.random() * DEBUFF_CATALOG.length)];
    const newDebuff: ActiveDebuff = {
      ...template,
      remainingStages: 2,
    };

    const existingIdx = this.activeDebuffs.findIndex((d) => d.id === newDebuff.id);
    if (existingIdx >= 0) {
      this.activeDebuffs[existingIdx].remainingStages = 2;
    } else if (this.activeDebuffs.length >= 2) {
      // Replace the oldest debuff so the player is never soft-locked with >2 simultaneous debuffs
      this.activeDebuffs.shift();
      this.activeDebuffs.push(newDebuff);
    } else {
      this.activeDebuffs.push(newDebuff);
    }

    const cleanseCost = Math.max(35, Math.round(40 + stageNum * 15));
    this.save();

    return {
      lostBuffTitle,
      lostBuffIcon,
      lostGold,
      inflictedDebuff: newDebuff,
      cleanseCost,
    };
  }

  public cleanseAllDebuffs(cost: number): boolean {
    if (this.gold < cost || this.activeDebuffs.length === 0) return false;
    this.gold -= cost;
    this.activeDebuffs = [];
    this.save();
    return true;
  }

  private stackToBadgeRarity(stacks: number): BuffRarity {
    if (stacks >= 5) return 'legendary';
    if (stacks >= 3) return 'epic';
    if (stacks >= 2) return 'rare';
    return 'common';
  }

  public getActiveBuffBadges(): { icon: string; text: string; rarity: BuffRarity }[] {
    const badges: { icon: string; text: string; rarity: BuffRarity }[] = [];
    const keystone = this.getActiveKeystoneSpec();
    const activeRace = this.getActiveRaceBranch();
    const activeBranchPts = this.getBranchSpentPoints(activeRace.id);
    if (keystone) {
      badges.push({
        icon: keystone.branch.icon,
        text: `${UI_ART.crown} ${keystone.node.name}`,
        rarity: 'legendary',
      });
    } else if (activeBranchPts > 0) {
      badges.push({
        icon: activeRace.icon,
        text: `${activeRace.raceName}·天赋×${activeBranchPts}`,
        rarity: 'epic',
      });
    }

    const totalBoboTechLvls = this.getBoboTechTotalLevels();
    const doctrineSpec = this.getBoboTechSpec(this.activeBoboTechDoctrine);
    if (totalBoboTechLvls > 0) {
      badges.push({
        icon: doctrineSpec.inlineIcon,
        text: `${doctrineSpec.shortName}·专精Lv.${this.getBoboTechLevel(this.activeBoboTechDoctrine)}`,
        rarity: totalBoboTechLvls >= 8 ? 'legendary' : totalBoboTechLvls >= 4 ? 'epic' : 'rare',
      });
    }

    const rf = this.getBuffStack('rapid_fire');
    if (rf > 0) badges.push({ icon: UI_ART.flame, text: `射速+${rf * 5}%`, rarity: this.stackToBadgeRarity(rf) });

    const hg = this.getBuffStack('hyper_gene');
    if (hg > 0) badges.push({ icon: UI_ART.sword, text: `基因+${hg * 6}%`, rarity: this.stackToBadgeRarity(hg) });

    const sc = this.getBuffStack('split_chamber');
    if (sc > 0)
      badges.push({
        icon: UI_ART.sparkle,
        text: `分裂${Math.round(this.getExtraCloneChance() * 100)}%`,
        rarity: this.stackToBadgeRarity(sc),
      });

    const gr = this.getGateBonusAdd();
    if (gr > 0) badges.push({ icon: UI_ART.arrowUp, text: `门脉+${gr}`, rarity: gr >= 2 ? 'legendary' : 'epic' });

    const pc = this.getBuffStack('plasma_crit');
    if (pc > 0)
      badges.push({
        icon: UI_ART.boom,
        text: `暴击${Math.round(this.getChargedCritChance() * 100)}%`,
        rarity: this.stackToBadgeRarity(pc),
      });

    const tr = this.getBuffStack('titan_reactor');
    if (tr > 0) badges.push({ icon: UI_ART.note, text: `充能+${tr * 7}%`, rarity: this.stackToBadgeRarity(tr) });

    const sb = this.getBuffStack('siege_breaker');
    if (sb > 0) badges.push({ icon: UI_ART.gear, text: `破甲+${sb * 10}%`, rarity: this.stackToBadgeRarity(sb) });

    const ns = this.getBuffStack('nitro_stride');
    if (ns > 0)
      badges.push({
        icon: UI_ART.rocket,
        text: `移速+${Math.min(36, ns * 4)}%`,
        rarity: this.stackToBadgeRarity(ns),
      });

    const ba = this.getBuffStack('bastion_aegis');
    if (ba > 0) badges.push({ icon: UI_ART.shield, text: `基地+${ba * 10}%`, rarity: this.stackToBadgeRarity(ba) });

    const wp = this.getBuffStack('war_plunder');
    if (wp > 0) badges.push({ icon: UI_ART.coin, text: `掠夺+${wp * 7}%`, rarity: this.stackToBadgeRarity(wp) });

    return badges;
  }

  public static readonly MECHA_HANGAR_MAX_LEVEL = 12;
  public static readonly MECHA_MILESTONE_TARGETS = [1, 3, 6, 10] as const;

  public getMechaCoreUpgradeCost(): number {
    return Math.round(240 * Math.pow(1.48, this.mechaCoreLevel));
  }

  public getMechaCannonUpgradeCost(): number {
    return Math.round(260 * Math.pow(1.5, this.mechaCannonLevel));
  }

  public upgradeMechaCore(): boolean {
    if (this.mechaCoreLevel >= GameState.MECHA_HANGAR_MAX_LEVEL) return false;
    const cost = this.getMechaCoreUpgradeCost();
    if (this.gold < cost) return false;
    this.gold -= cost;
    this.mechaCoreLevel += 1;
    this.mechaOverlordCharge = Math.min(100, Math.max(this.mechaOverlordCharge, 35 + this.mechaCoreLevel * 4));
    this.save();
    return true;
  }

  public upgradeMechaCannon(): boolean {
    if (this.mechaCannonLevel >= GameState.MECHA_HANGAR_MAX_LEVEL) return false;
    const cost = this.getMechaCannonUpgradeCost();
    if (this.gold < cost) return false;
    this.gold -= cost;
    this.mechaCannonLevel += 1;
    this.save();
    return true;
  }

  public getMechaOverlordSpec(): {
    mkLabel: string;
    hpMult: number;
    shellDmgMult: number;
    volleyInterval: number;
    startingCharge: number;
    fusionPerUnitBonus: number;
  } {
    const milestoneRank = this.claimedMechaMilestoneTier;
    const totalRank = this.mechaCoreLevel + this.mechaCannonLevel + milestoneRank * 2;
    const mkNum = totalRank >= 20 ? 'V' : totalRank >= 14 ? 'IV' : totalRank >= 8 ? 'III' : totalRank >= 3 ? 'II' : 'I';
    const hpMult = (1 + this.mechaCoreLevel * 0.12) * (1 + milestoneRank * 0.1);
    const shellDmgMult = (1 + this.mechaCannonLevel * 0.12) * (1 + milestoneRank * 0.1);
    const volleyInterval = Math.max(0.58, Number((1.05 * Math.pow(0.96, this.mechaCannonLevel)).toFixed(2)));
    const startingCharge = Math.min(85, 35 + this.mechaCoreLevel * 4 + milestoneRank * 4);
    const fusionPerUnitBonus = 0.06 + milestoneRank * 0.015;
    return {
      mkLabel: `Mk.${mkNum}`,
      hpMult,
      shellDmgMult,
      volleyInterval,
      startingCharge,
      fusionPerUnitBonus,
    };
  }

  public recordMechaSummon(fusedSquadCount = 0): void {
    this.totalMechaSummons += 1;
    if (fusedSquadCount > 0) {
      this.totalMechaSmashes += 0;
    }
    this.save();
  }

  public recordMechaSmashes(count = 1): void {
    if (count <= 0) return;
    this.totalMechaSmashes += Math.floor(count);
    this.save();
  }

  public getMechaMilestoneStatus(): {
    tier: number;
    maxTier: number;
    nextTargetSummons: number;
    rewardGold: number;
    rewardShards: number;
    canClaim: boolean;
    allClaimed: boolean;
  } {
    const targets = GameState.MECHA_MILESTONE_TARGETS;
    const maxTier = targets.length;
    if (this.claimedMechaMilestoneTier >= maxTier) {
      return {
        tier: maxTier,
        maxTier,
        nextTargetSummons: targets[maxTier - 1],
        rewardGold: 0,
        rewardShards: 0,
        canClaim: false,
        allClaimed: true,
      };
    }
    const nextIdx = this.claimedMechaMilestoneTier;
    const nextTargetSummons = targets[nextIdx];
    const rewardGold = 650 + nextIdx * 450;
    const rewardShards = 2 + nextIdx;
    return {
      tier: nextIdx,
      maxTier,
      nextTargetSummons,
      rewardGold,
      rewardShards,
      canClaim: this.totalMechaSummons >= nextTargetSummons,
      allClaimed: false,
    };
  }

  public claimMechaMilestone(): { claimed: boolean; goldAwarded: number; shardsAwarded: number; newTier: number } {
    const st = this.getMechaMilestoneStatus();
    if (!st.canClaim || st.allClaimed) {
      return { claimed: false, goldAwarded: 0, shardsAwarded: 0, newTier: this.claimedMechaMilestoneTier };
    }
    this.claimedMechaMilestoneTier += 1;
    this.gold += st.rewardGold;
    const shardGrant = this.grantBonusSkinShards(st.rewardShards);
    this.save();
    return {
      claimed: true,
      goldAwarded: st.rewardGold,
      shardsAwarded: shardGrant.amount,
      newTier: this.claimedMechaMilestoneTier,
    };
  }

  // =========================================================================
  // MC-7: Leader Tactical Sub-Weapon Slot & Gear Summit Tournament Methods
  // =========================================================================

  public getSubWeaponSpec(id: TacticalSubWeaponId = this.equippedSubWeapon): TacticalSubWeaponSpec {
    return TACTICAL_SUBWEAPONS[id] || TACTICAL_SUBWEAPONS.electro_net;
  }

  public getSubWeaponLevel(id: TacticalSubWeaponId = this.equippedSubWeapon): number {
    const raw = this.subWeaponLevels[id] || 1;
    return Math.max(1, Math.min(TACTICAL_SUBWEAPON_MAX_LEVEL, Math.floor(raw)));
  }

  public getSubWeaponUpgradeCost(id: TacticalSubWeaponId): number {
    const spec = this.getSubWeaponSpec(id);
    const lvl = this.getSubWeaponLevel(id);
    return Math.round(spec.baseCost * Math.pow(spec.costMult, lvl - 1));
  }

  public equipSubWeapon(id: TacticalSubWeaponId): boolean {
    if (!TACTICAL_SUBWEAPONS[id]) return false;
    this.equippedSubWeapon = id;
    this.save();
    return true;
  }

  public cycleSubWeapon(): TacticalSubWeaponSpec {
    const idx = TACTICAL_SUBWEAPON_ORDER.indexOf(this.equippedSubWeapon);
    const nextId = TACTICAL_SUBWEAPON_ORDER[(idx + 1) % TACTICAL_SUBWEAPON_ORDER.length];
    this.equippedSubWeapon = nextId;
    this.save();
    return this.getSubWeaponSpec(nextId);
  }

  public upgradeSubWeapon(id: TacticalSubWeaponId): boolean {
    if (!TACTICAL_SUBWEAPONS[id]) return false;
    const lvl = this.getSubWeaponLevel(id);
    if (lvl >= TACTICAL_SUBWEAPON_MAX_LEVEL) return false;
    const cost = this.getSubWeaponUpgradeCost(id);
    if (this.gold < cost) return false;
    this.gold -= cost;
    this.subWeaponLevels[id] = lvl + 1;
    this.save();
    return true;
  }

  public getSubWeaponCombatSpec(id: TacticalSubWeaponId = this.equippedSubWeapon): {
    id: TacticalSubWeaponId;
    level: number;
    cooldownSec: number;
    radius: number;
    durationSec: number;
    burstDmg: number;
    shieldStripHits: number;
    slowFactor: number;
    vulnMult: number;
    moveSpeedMult: number;
    attackRateMult: number;
  } {
    const lvl = this.getSubWeaponLevel(id);
    const pMult = this.getPowerMultiplier();
    if (id === 'electro_net') {
      return {
        id,
        level: lvl,
        cooldownSec: Number((11.5 - (lvl - 1) * 0.65).toFixed(2)),
        radius: Number((6.4 + (lvl - 1) * 0.55).toFixed(2)),
        durationSec: Number((3.6 + (lvl - 1) * 0.45).toFixed(2)),
        burstDmg: Math.round((2.6 + (lvl - 1) * 0.55) * pMult * 26),
        shieldStripHits: 3 + lvl,
        slowFactor: 0.24,
        vulnMult: 1.15,
        moveSpeedMult: 1.0,
        attackRateMult: 1.0,
      };
    }
    if (id === 'syrup_bubble') {
      return {
        id,
        level: lvl,
        cooldownSec: Number((12.0 - (lvl - 1) * 0.65).toFixed(2)),
        radius: Number((6.2 + (lvl - 1) * 0.5).toFixed(2)),
        durationSec: Number((6.5 + (lvl - 1) * 0.7).toFixed(2)),
        burstDmg: Math.round((1.5 + (lvl - 1) * 0.35) * pMult * 20),
        shieldStripHits: 1,
        slowFactor: Number((0.38 - (lvl - 1) * 0.03).toFixed(2)),
        vulnMult: Number((1.32 + (lvl - 1) * 0.09).toFixed(2)),
        moveSpeedMult: 1.0,
        attackRateMult: 1.0,
      };
    }
    return {
      id: 'rally_horn',
      level: lvl,
      cooldownSec: Number((12.5 - (lvl - 1) * 0.65).toFixed(2)),
      radius: Number((7.5 + (lvl - 1) * 0.6).toFixed(2)),
      durationSec: Number((5.8 + (lvl - 1) * 0.65).toFixed(2)),
      burstDmg: 0,
      shieldStripHits: 0,
      slowFactor: 1.0,
      vulnMult: 1.0,
      moveSpeedMult: Number((1.35 + (lvl - 1) * 0.07).toFixed(2)),
      attackRateMult: Number((1.32 + (lvl - 1) * 0.08).toFixed(2)),
    };
  }

  public recordSubWeaponCast(): void {
    this.totalSubWeaponCasts += 1;
    this.save();
  }

  public getTournamentStageSpec(stage: TournamentStageId = this.tournamentStage): TournamentStageSpec {
    return TOURNAMENT_STAGES[stage] || TOURNAMENT_STAGES[1];
  }

  public getTournamentTrophyBonus(): {
    trophies: number;
    tier: number;
    maxTier: number;
    nextTarget: number;
    fireRateMult: number;
    powerMult: number;
    fireRatePct: number;
    powerPct: number;
    badgeLabel: string;
  } {
    const trophies = Math.max(0, Math.floor(this.tournamentTrophies));
    const maxTier = TOURNAMENT_TROPHY_MILESTONES.length;
    if (trophies <= 0) {
      return {
        trophies: 0,
        tier: 0,
        maxTier,
        nextTarget: TOURNAMENT_TROPHY_MILESTONES[0],
        fireRateMult: 1.0,
        powerMult: 1.0,
        fireRatePct: 0,
        powerPct: 0,
        badgeLabel: '初阶新秀',
      };
    }
    let tier = 0;
    for (const m of TOURNAMENT_TROPHY_MILESTONES) {
      if (trophies >= m) tier += 1;
    }
    const nextTarget =
      tier < maxTier ? TOURNAMENT_TROPHY_MILESTONES[tier] : TOURNAMENT_TROPHY_MILESTONES[maxTier - 1];
    const smoothBonus = Math.min(0.12, trophies * 0.0008);
    const fireRateMult = Number((1 + tier * 0.03 + smoothBonus * 0.75).toFixed(4));
    const powerMult = Number((1 + tier * 0.04 + smoothBonus).toFixed(4));
    const tierTitles = ['新秀奖章', '青铜齿冠', '白银齿冠', '黄金齿冠', '星耀齿冠', '传奇巅峰冕'];
    return {
      trophies,
      tier,
      maxTier,
      nextTarget,
      fireRateMult,
      powerMult,
      fireRatePct: Math.max(1, Math.round((fireRateMult - 1) * 100)),
      powerPct: Math.max(1, Math.round((powerMult - 1) * 100)),
      badgeLabel: tierTitles[Math.min(tierTitles.length - 1, tier)],
    };
  }

  public getPendingTournamentChestPreview(
    stageOverride?: 1 | 2 | 3
  ): {
    hasChest: boolean;
    stage: 1 | 2 | 3;
    streakLabel: string;
    multiplier: number;
    coins: number;
    cards: number;
    bricks: number;
    trophies: number;
  } {
    const rawStage = stageOverride || this.pendingTournamentChestStage;
    const safeStage: 1 | 2 | 3 = rawStage === 2 ? 2 : rawStage === 3 ? 3 : 1;
    const spec = TOURNAMENT_STAGES[safeStage];
    const mult = spec.streakMultiplier;
    return {
      hasChest: (stageOverride ?? this.pendingTournamentChestStage) > 0,
      stage: safeStage,
      streakLabel: spec.streakLabel,
      multiplier: mult,
      coins: Math.round(spec.baseCoins * mult),
      cards: Math.max(1, Math.round(spec.baseCards * mult)),
      bricks: Math.round(spec.baseBricks * mult),
      trophies: Math.round(spec.baseTrophies * mult),
    };
  }

  public recordTournamentMatchResult(
    won: boolean,
    stagePlayed: TournamentStageId = this.tournamentStage
  ): {
    won: boolean;
    stagePlayed: TournamentStageId;
    nextStage: TournamentStageId;
    streakMultiplier: number;
    matchTrophiesAwarded: number;
    unlockedChestStage: 0 | 1 | 2 | 3;
    cupCompleted: boolean;
  } {
    // Auto-claim any previously forgotten chest so rewards are never lost
    if (this.pendingTournamentChestStage > 0) {
      this.claimTournamentStreakChest();
    }
    const spec = this.getTournamentStageSpec(stagePlayed);
    if (!won) {
      this.tournamentWinStreak = 0;
      this.tournamentStage = 1;
      this.save();
      return {
        won: false,
        stagePlayed,
        nextStage: 1,
        streakMultiplier: spec.streakMultiplier,
        matchTrophiesAwarded: 0,
        unlockedChestStage: 0,
        cupCompleted: false,
      };
    }

    this.tournamentWinStreak += 1;
    this.tournamentTrophies += spec.matchWinTrophies;
    this.pendingTournamentChestStage = stagePlayed;
    const cupCompleted = stagePlayed === 3;
    if (stagePlayed === 1) {
      this.tournamentStage = 2;
    } else if (stagePlayed === 2) {
      this.tournamentStage = 3;
    } else {
      this.tournamentStage = 1;
      this.tournamentCupTier = Math.min(12, this.tournamentCupTier + 1);
    }
    this.save();
    return {
      won: true,
      stagePlayed,
      nextStage: this.tournamentStage,
      streakMultiplier: spec.streakMultiplier,
      matchTrophiesAwarded: spec.matchWinTrophies,
      unlockedChestStage: stagePlayed,
      cupCompleted,
    };
  }

  public claimTournamentStreakChest(): {
    claimed: boolean;
    stage: 0 | 1 | 2 | 3;
    streakLabel: string;
    coinsAwarded: number;
    cardsAwarded: number;
    cardSkinName: string;
    bricksAwarded: number;
    trophiesAwarded: number;
    totalTrophies: number;
  } {
    if (this.pendingTournamentChestStage === 0) {
      return {
        claimed: false,
        stage: 0,
        streakLabel: '1.0x',
        coinsAwarded: 0,
        cardsAwarded: 0,
        cardSkinName: '',
        bricksAwarded: 0,
        trophiesAwarded: 0,
        totalTrophies: this.tournamentTrophies,
      };
    }
    const stageToClaim = this.pendingTournamentChestStage;
    const preview = this.getPendingTournamentChestPreview(stageToClaim);
    this.pendingTournamentChestStage = 0;
    this.tournamentChestsClaimed += 1;
    this.gold += preview.coins;
    const cardGrant = this.grantBonusSkinShards(preview.cards);
    this.tournamentBricks += preview.bricks;
    this.tournamentTrophies += preview.trophies;
    this.save();
    return {
      claimed: true,
      stage: stageToClaim,
      streakLabel: preview.streakLabel,
      coinsAwarded: preview.coins,
      cardsAwarded: cardGrant.amount,
      cardSkinName: cardGrant.skinName,
      bricksAwarded: preview.bricks,
      trophiesAwarded: preview.trophies,
      totalTrophies: this.tournamentTrophies,
    };
  }

  // ============================================================================
  // MC-8: Bobo 3-Branch Specialization Tech Tree & Clockwork Colossus Boss Raid
  // ============================================================================

  public getBoboTechSpec(id: BoboTechBranchId = this.activeBoboTechDoctrine): BoboTechBranchSpec {
    return BOBO_TECH_BRANCHES[id] || BOBO_TECH_BRANCHES.vanguard_charge;
  }

  public getBoboTechLevel(id: BoboTechBranchId): number {
    return Math.max(0, Math.min(BOBO_TECH_MAX_LEVEL, this.boboTechLevels[id] ?? 0));
  }

  public getBoboTechTotalLevels(): number {
    return BOBO_TECH_BRANCH_ORDER.reduce((sum, id) => sum + this.getBoboTechLevel(id), 0);
  }

  public getBoboTechUpgradeCost(id: BoboTechBranchId): {
    isMaxed: boolean;
    coreCost: number;
    goldCost: number;
    canAffordCore: boolean;
    canAffordGold: boolean;
  } {
    const lvl = this.getBoboTechLevel(id);
    if (lvl >= BOBO_TECH_MAX_LEVEL) {
      return {
        isMaxed: true,
        coreCost: 0,
        goldCost: 0,
        canAffordCore: false,
        canAffordGold: false,
      };
    }
    const spec = BOBO_TECH_BRANCHES[id];
    const coreCost = spec.coreCosts[lvl];
    const goldCost = spec.goldCosts[lvl];
    return {
      isMaxed: false,
      coreCost,
      goldCost,
      canAffordCore: this.clockworkCores >= coreCost,
      canAffordGold: this.gold >= goldCost,
    };
  }

  public setActiveBoboTechDoctrine(id: BoboTechBranchId): BoboTechBranchSpec {
    if (BOBO_TECH_BRANCHES[id]) {
      this.activeBoboTechDoctrine = id;
      this.save();
    }
    return this.getBoboTechSpec();
  }

  public upgradeBoboTechBranch(
    id: BoboTechBranchId,
    payWith: 'auto' | 'core' | 'gold' = 'auto'
  ): {
    upgraded: boolean;
    newLevel: number;
    spentCurrency: 'core' | 'gold' | 'none';
    spentAmount: number;
  } {
    const cost = this.getBoboTechUpgradeCost(id);
    if (cost.isMaxed) {
      return {
        upgraded: false,
        newLevel: this.getBoboTechLevel(id),
        spentCurrency: 'none',
        spentAmount: 0,
      };
    }

    let mode: 'core' | 'gold' | 'none' = 'none';
    if (payWith === 'core') {
      if (cost.canAffordCore) mode = 'core';
    } else if (payWith === 'gold') {
      if (cost.canAffordGold) mode = 'gold';
    } else {
      if (cost.canAffordCore) mode = 'core';
      else if (cost.canAffordGold) mode = 'gold';
    }

    if (mode === 'none') {
      return {
        upgraded: false,
        newLevel: this.getBoboTechLevel(id),
        spentCurrency: 'none',
        spentAmount: 0,
      };
    }

    let spentAmount = 0;
    if (mode === 'core') {
      this.clockworkCores = Math.max(0, this.clockworkCores - cost.coreCost);
      spentAmount = cost.coreCost;
    } else {
      this.gold = Math.max(0, this.gold - cost.goldCost);
      spentAmount = cost.goldCost;
    }

    const nextLvl = Math.min(BOBO_TECH_MAX_LEVEL, this.getBoboTechLevel(id) + 1);
    this.boboTechLevels[id] = nextLvl;
    // Automatically align active doctrine if upgrading a branch when current doctrine is Lv.0
    if (this.getBoboTechLevel(this.activeBoboTechDoctrine) === 0) {
      this.activeBoboTechDoctrine = id;
    }
    this.save();
    return {
      upgraded: true,
      newLevel: nextLvl,
      spentCurrency: mode,
      spentAmount,
    };
  }

  public getBoboTechCombatBonuses(): {
    activeDoctrine: BoboTechBranchId;
    totalLevels: number;
    moveSpeedMult: number;
    gateSurgeSpeedMult: number;
    gateSurgeDuration: number;
    dodgeChance: number;
    boboHpMult: number;
    frontlineShieldChance: number;
    armorDamageReduction: number;
    weakpointDamageMult: number;
    siegeDamageMult: number;
    candySplashRatio: number;
    candySplashRadius: number;
    cannonFireRateMult: number;
  } {
    const vLvl = this.getBoboTechLevel('vanguard_charge');
    const hLvl = this.getBoboTechLevel('heavy_siege');
    const cLvl = this.getBoboTechLevel('candy_bombard');
    const totalLevels = vLvl + hLvl + cLvl;
    const doc = this.activeBoboTechDoctrine;

    const vDocActive = doc === 'vanguard_charge' && (vLvl > 0 || totalLevels > 0);
    const hDocActive = doc === 'heavy_siege' && (hLvl > 0 || totalLevels > 0);
    const cDocActive = doc === 'candy_bombard' && (cLvl > 0 || totalLevels > 0);

    const moveSpeedMult = 1 + vLvl * 0.05 + (doc === 'vanguard_charge' ? 0.06 : 0);
    const gateSurgeSpeedMult =
      1 + (vLvl > 0 ? 0.14 + vLvl * 0.06 : 0) + (doc === 'vanguard_charge' ? 0.12 : 0);
    const gateSurgeDuration = vLvl > 0 || doc === 'vanguard_charge' ? 1.55 + vLvl * 0.22 : 0;
    const dodgeChance = Math.min(0.28, vLvl * 0.03 + (vDocActive ? 0.04 : 0));

    const boboHpMult = 1 + hLvl * 0.08 + (doc === 'heavy_siege' ? 0.08 : 0);
    const frontlineShieldChance = Math.min(0.55, hLvl * 0.07 + (doc === 'heavy_siege' ? 0.1 : 0));
    const armorDamageReduction = Math.min(0.26, hLvl * 0.035 + (hDocActive ? 0.04 : 0));
    const weakpointDamageMult = 1 + hLvl * 0.15 + (doc === 'heavy_siege' ? 0.18 : 0);
    const siegeDamageMult = 1 + hLvl * 0.12 + (doc === 'heavy_siege' ? 0.15 : 0);

    const candySplashRatio =
      (cLvl > 0 ? 0.16 + cLvl * 0.08 : 0) + (doc === 'candy_bombard' ? 0.16 : 0);
    const candySplashRadius = 1.75 + cLvl * 0.18 + (cDocActive ? 0.25 : 0);
    const cannonFireRateMult = 1 + cLvl * 0.04 + (doc === 'candy_bombard' ? 0.06 : 0);

    return {
      activeDoctrine: doc,
      totalLevels,
      moveSpeedMult,
      gateSurgeSpeedMult,
      gateSurgeDuration,
      dodgeChance,
      boboHpMult,
      frontlineShieldChance,
      armorDamageReduction,
      weakpointDamageMult,
      siegeDamageMult,
      candySplashRatio,
      candySplashRadius,
      cannonFireRateMult,
    };
  }

  public getColossusRaidSpec(clearsOverride?: number): {
    raidTier: number;
    title: string;
    subtitle: string;
    coreRewardBase: number;
    coinsRewardBase: number;
    cardsRewardBase: number;
    bricksRewardBase: number;
  } {
    const clears = Math.max(0, Math.floor(clearsOverride ?? this.colossusRaidClears));
    const raidTier = Math.min(8, 1 + clears);
    return {
      raidTier,
      title: `巨型发条首领攻坚 · 第 ${raidTier} 阶`,
      subtitle: '击破左翼重盾或右翼糖炮 · 触发 6.0s 瘫痪 2.5x 高倍暴击窗口',
      coreRewardBase: 3 + Math.min(4, Math.floor((raidTier + 1) / 2)),
      coinsRewardBase: 380 + (raidTier - 1) * 95,
      cardsRewardBase: 2 + Math.floor(raidTier / 2),
      bricksRewardBase: 95 + (raidTier - 1) * 25,
    };
  }

  public recordColossusRaidResult(
    victory: boolean,
    weakpointsBroken: number,
    clearSec: number
  ): {
    victory: boolean;
    raidTierCleared: number;
    coresAwarded: number;
    coinsAwarded: number;
    cardsAwarded: number;
    cardSkinName: string;
    bricksAwarded: number;
    totalClears: number;
    totalCores: number;
  } {
    const safeBroken = Math.max(0, Math.min(2, Math.floor(weakpointsBroken)));
    this.totalColossusWeakpointsBroken += safeBroken;
    const spec = this.getColossusRaidSpec();
    if (!victory) {
      const consolationCores = safeBroken >= 1 ? 1 : 0;
      const consolationCoins = safeBroken * 65;
      this.clockworkCores += consolationCores;
      this.gold += consolationCoins;
      this.save();
      return {
        victory: false,
        raidTierCleared: spec.raidTier,
        coresAwarded: consolationCores,
        coinsAwarded: consolationCoins,
        cardsAwarded: 0,
        cardSkinName: '',
        bricksAwarded: 0,
        totalClears: this.colossusRaidClears,
        totalCores: this.clockworkCores,
      };
    }

    const coresAwarded = spec.coreRewardBase + safeBroken;
    const coinsAwarded = Math.round(spec.coinsRewardBase + safeBroken * 60);
    const bricksAwarded = spec.bricksRewardBase + safeBroken * 18;
    const cardGrant = this.grantBonusSkinShards(spec.cardsRewardBase + (safeBroken >= 2 ? 1 : 0));

    this.clockworkCores += coresAwarded;
    this.gold += coinsAwarded;
    this.tournamentBricks += bricksAwarded;
    this.colossusRaidClears += 1;
    if (clearSec > 0 && (this.bestColossusClearSec <= 0 || clearSec < this.bestColossusClearSec)) {
      this.bestColossusClearSec = Number(clearSec.toFixed(1));
    }
    this.save();

    return {
      victory: true,
      raidTierCleared: spec.raidTier,
      coresAwarded,
      coinsAwarded,
      cardsAwarded: cardGrant.amount,
      cardSkinName: cardGrant.skinName,
      bricksAwarded,
      totalClears: this.colossusRaidClears,
      totalCores: this.clockworkCores,
    };
  }

  // ============================================================================
  // MC-9: Cloud Airship Mothership Escort & Steam Cannon Core Module Workbench
  // ============================================================================

  public getAirshipMilestoneBonus(medalsOverride?: number): {
    effectiveMedals: number;
    tier: number;
    rankTitle: string;
    accentColor: string;
    fireRateMult: number;
    troopHpMult: number;
    startingDropCharge: number;
    summaryText: string;
  } {
    const rawMedals =
      typeof medalsOverride === 'number'
        ? Math.max(0, Math.floor(medalsOverride))
        : Math.max(0, Math.floor(Math.max(this.airshipWingMedals, this.lifetimeAirshipWingMedals)));
    const capped = Math.min(20, rawMedals);
    const fireRateMult = 1 + capped * 0.008;
    const troopHpMult = 1 + capped * 0.012;
    const startingDropCharge = Math.min(45, capped * 3);

    let tier = 0;
    let rankTitle = '新锐护航编队';
    let accentColor = '#7dd3fc';
    if (rawMedals >= 16) {
      tier = 3;
      rankTitle = '黄金母舰统帅';
      accentColor = '#facc15';
    } else if (rawMedals >= 8) {
      tier = 2;
      rankTitle = '白银苍穹勋阶';
      accentColor = '#38bdf8';
    } else if (rawMedals >= 3) {
      tier = 1;
      rankTitle = '青铜云翼勋阶';
      accentColor = '#fbbf24';
    }

    const firePct = Math.round((fireRateMult - 1) * 100);
    const hpPct = Math.round((troopHpMult - 1) * 100);
    return {
      effectiveMedals: rawMedals,
      tier,
      rankTitle,
      accentColor,
      fireRateMult,
      troopHpMult,
      startingDropCharge,
      summaryText:
        rawMedals > 0
          ? `${rankTitle} · 母炮射速+${firePct}% · 波波生命+${hpPct}% · 空投起充+${startingDropCharge}%`
          : `${rankTitle} · 夺取护航徽章解锁全局射速/生命/起充加成`,
    };
  }

  public getAirshipEscortSpec(clearsOverride?: number): {
    escortTier: number;
    title: string;
    subtitle: string;
    medalRewardBase: number;
    coinsRewardBase: number;
    cardsRewardBase: number;
  } {
    const clears = Math.max(0, Math.floor(clearsOverride ?? this.airshipEscortClears));
    const escortTier = Math.min(8, 1 + clears);
    return {
      escortTier,
      title: `云端飞艇母舰护航战 · 第 ${escortTier} 阶`,
      subtitle: '拔除沿途防空副塔充能空投舱 · 降临超级波波冲击兵突破敌方要塞',
      medalRewardBase: 3 + Math.min(4, Math.floor((escortTier + 1) / 2)),
      coinsRewardBase: 400 + (escortTier - 1) * 90,
      cardsRewardBase: 2 + Math.floor(escortTier / 2),
    };
  }

  public recordAirshipEscortResult(
    victory: boolean,
    progressPct: number,
    antiAirCleared: number,
    dropPodsDeployed: number,
    clearSec: number
  ): {
    victory: boolean;
    escortTierCleared: number;
    medalsAwarded: number;
    coinsAwarded: number;
    cardsAwarded: number;
    cardSkinName: string;
    totalClears: number;
    totalMedals: number;
    isNewSpeedRecord: boolean;
  } {
    const safePct = victory ? 100 : Math.max(0, Math.min(99, Math.round(progressPct)));
    const safeTurrets = Math.max(0, Math.min(4, Math.floor(antiAirCleared)));
    const safePods = Math.max(0, Math.floor(dropPodsDeployed));
    this.bestAirshipProgressPct = Math.max(this.bestAirshipProgressPct, safePct);
    this.totalAntiAirTurretsCleared += safeTurrets;
    this.totalAirshipDropPods += safePods;

    const spec = this.getAirshipEscortSpec();
    if (!victory) {
      const consolationMedals = safeTurrets >= 2 ? 1 : 0;
      const consolationCoins = safeTurrets * 60 + safePods * 25;
      this.airshipWingMedals += consolationMedals;
      this.lifetimeAirshipWingMedals = Math.max(
        this.lifetimeAirshipWingMedals + consolationMedals,
        this.airshipWingMedals
      );
      this.gold += consolationCoins;
      this.save();
      return {
        victory: false,
        escortTierCleared: spec.escortTier,
        medalsAwarded: consolationMedals,
        coinsAwarded: consolationCoins,
        cardsAwarded: 0,
        cardSkinName: '',
        totalClears: this.airshipEscortClears,
        totalMedals: this.airshipWingMedals,
        isNewSpeedRecord: false,
      };
    }

    const medalsAwarded = spec.medalRewardBase + Math.min(3, safeTurrets);
    const coinsAwarded = Math.round(spec.coinsRewardBase + safeTurrets * 55 + safePods * 20);
    const cardGrant = this.grantBonusSkinShards(spec.cardsRewardBase + (safeTurrets >= 3 ? 1 : 0));

    this.airshipWingMedals += medalsAwarded;
    this.lifetimeAirshipWingMedals = Math.max(
      this.lifetimeAirshipWingMedals + medalsAwarded,
      this.airshipWingMedals
    );
    this.gold += coinsAwarded;
    this.airshipEscortClears += 1;

    let isNewSpeedRecord = false;
    if (clearSec > 0 && (this.bestAirshipClearSec <= 0 || clearSec < this.bestAirshipClearSec)) {
      this.bestAirshipClearSec = Number(clearSec.toFixed(1));
      isNewSpeedRecord = true;
    }
    this.save();

    return {
      victory: true,
      escortTierCleared: spec.escortTier,
      medalsAwarded,
      coinsAwarded,
      cardsAwarded: cardGrant.amount,
      cardSkinName: cardGrant.skinName,
      totalClears: this.airshipEscortClears,
      totalMedals: this.airshipWingMedals,
      isNewSpeedRecord,
    };
  }

  public getCannonModSpec(id: CannonCoreModId = this.activeCannonMod): CannonCoreModSpec {
    return CANNON_CORE_MODS[id] || CANNON_CORE_MODS.overdrive_breech;
  }

  public getCannonModLevel(id: CannonCoreModId = this.activeCannonMod): number {
    return Math.max(0, Math.min(CANNON_CORE_MOD_MAX_LEVEL, Math.floor(this.cannonModLevels[id] ?? 0)));
  }

  public isCannonModUnlocked(id: CannonCoreModId): boolean {
    return this.getCannonModLevel(id) >= 1;
  }

  public getCannonModUpgradeCost(id: CannonCoreModId): {
    level: number;
    isUnlocked: boolean;
    isMaxed: boolean;
    medalCost: number;
    goldCost: number;
    canAffordMedal: boolean;
    canAffordGold: boolean;
  } {
    const lvl = this.getCannonModLevel(id);
    if (lvl >= CANNON_CORE_MOD_MAX_LEVEL) {
      return {
        level: lvl,
        isUnlocked: true,
        isMaxed: true,
        medalCost: 0,
        goldCost: 0,
        canAffordMedal: false,
        canAffordGold: false,
      };
    }
    const spec = CANNON_CORE_MODS[id];
    const medalCost = spec.medalCosts[lvl];
    const goldCost = spec.goldCosts[lvl];
    return {
      level: lvl,
      isUnlocked: lvl >= 1,
      isMaxed: false,
      medalCost,
      goldCost,
      canAffordMedal: this.airshipWingMedals >= medalCost,
      canAffordGold: this.gold >= goldCost,
    };
  }

  public equipCannonMod(id: CannonCoreModId): boolean {
    if (!CANNON_CORE_MODS[id]) return false;
    if (this.getCannonModLevel(id) < 1) return false;
    this.activeCannonMod = id;
    this.save();
    return true;
  }

  public setActiveCannonMod(id: CannonCoreModId): CannonCoreModSpec {
    if (CANNON_CORE_MODS[id]) {
      if (this.getCannonModLevel(id) < 1) {
        this.cannonModLevels[id] = 1;
      }
      this.activeCannonMod = id;
      this.save();
    }
    return this.getCannonModSpec();
  }

  public upgradeCannonMod(
    id: CannonCoreModId,
    payWith: 'auto' | 'medal' | 'gold' = 'auto'
  ): {
    upgraded: boolean;
    wasUnlock: boolean;
    newLevel: number;
    spentCurrency: 'medal' | 'gold' | 'none';
    spentAmount: number;
  } {
    const cost = this.getCannonModUpgradeCost(id);
    if (cost.isMaxed) {
      return {
        upgraded: false,
        wasUnlock: false,
        newLevel: cost.level,
        spentCurrency: 'none',
        spentAmount: 0,
      };
    }

    let mode: 'medal' | 'gold' | 'none' = 'none';
    if (payWith === 'medal') {
      if (cost.canAffordMedal) mode = 'medal';
    } else if (payWith === 'gold') {
      if (cost.canAffordGold) mode = 'gold';
    } else {
      if (cost.canAffordMedal) mode = 'medal';
      else if (cost.canAffordGold) mode = 'gold';
    }

    if (mode === 'none') {
      return {
        upgraded: false,
        wasUnlock: false,
        newLevel: cost.level,
        spentCurrency: 'none',
        spentAmount: 0,
      };
    }

    let spentAmount = 0;
    if (mode === 'medal') {
      this.lifetimeAirshipWingMedals = Math.max(this.lifetimeAirshipWingMedals, this.airshipWingMedals);
      this.airshipWingMedals = Math.max(0, this.airshipWingMedals - cost.medalCost);
      spentAmount = cost.medalCost;
    } else {
      this.gold = Math.max(0, this.gold - cost.goldCost);
      spentAmount = cost.goldCost;
    }

    const wasUnlock = cost.level === 0;
    const nextLvl = Math.min(CANNON_CORE_MOD_MAX_LEVEL, cost.level + 1);
    this.cannonModLevels[id] = nextLvl;
    if (this.getCannonModLevel(this.activeCannonMod) <= 0) {
      this.activeCannonMod = id;
    }
    this.save();
    return {
      upgraded: true,
      wasUnlock,
      newLevel: nextLvl,
      spentCurrency: mode,
      spentAmount,
    };
  }

  public getCannonModCombatSpec(id: CannonCoreModId = this.activeCannonMod): {
    id: CannonCoreModId;
    level: number;
    fireRateMult: number;
    overdriveEveryShots: number;
    overdriveExtraBursts: number;
    prismEveryShots: number;
    prismSplitCount: number;
    prismDmgMult: number;
    mortarEveryShots: number;
    mortarHpMult: number;
    mortarSiegeMult: number;
    mortarFusionTier: number;
  } {
    const rawLvl = this.getCannonModLevel(id);
    const effLvl = Math.max(1, rawLvl);
    const isOverdrive = id === 'overdrive_breech' && rawLvl >= 1;
    const isPrism = id === 'prism_splitter' && rawLvl >= 1;
    const isMortar = id === 'heavy_mortar' && rawLvl >= 1;

    return {
      id,
      level: effLvl,
      fireRateMult: isOverdrive ? 1 + 0.06 + (effLvl - 1) * 0.03 : 1.0,
      overdriveEveryShots: isOverdrive ? Math.max(2, 4 - Math.floor(effLvl / 2)) : 0,
      overdriveExtraBursts: isOverdrive ? (effLvl >= 4 ? 2 : 1) : 0,
      prismEveryShots: isPrism ? Math.max(2, 4 - Math.floor(effLvl / 2)) : 0,
      prismSplitCount: isPrism ? (effLvl >= 3 ? 3 : 2) : 0,
      prismDmgMult: isPrism ? 1.15 + effLvl * 0.06 : 1.0,
      mortarEveryShots: isMortar ? Math.max(3, 5 - Math.floor(effLvl / 2)) : 0,
      mortarHpMult: isMortar ? 1.45 + effLvl * 0.12 : 1.0,
      mortarSiegeMult: isMortar ? 1.65 + effLvl * 0.18 : 1.0,
      mortarFusionTier: isMortar ? (effLvl >= 4 ? 2 : 1) : 1,
    };
  }

  // ============================================================================
  // MC-10: Rainbow Candy Train Raid (列车金章) & Bobo Squad Relic Banner Stand
  // ============================================================================

  public getTrainMedalMilestoneBonus(medalsOverride?: number): {
    effectiveMedals: number;
    tier: number;
    rankTitle: string;
    accentColor: string;
    troopDmgMult: number;
    bannerAuraMult: number;
    nextThreshold: number;
    summaryText: string;
  } {
    const rawMedals =
      typeof medalsOverride === 'number'
        ? Math.max(0, Math.floor(medalsOverride))
        : Math.max(0, Math.floor(Math.max(this.trainGoldMedals, this.lifetimeTrainGoldMedals)));
    const capped = Math.min(24, rawMedals);
    const troopDmgMult = 1 + capped * 0.01;
    const bannerAuraMult = 1 + capped * 0.0125;

    let tier = 0;
    let rankTitle = '新晋劫车学徒';
    let accentColor = '#fda4af';
    let nextThreshold = 3;
    if (rawMedals >= 16) {
      tier = 3;
      rankTitle = '黄金列车金章统领';
      accentColor = '#facc15';
      nextThreshold = 0;
    } else if (rawMedals >= 8) {
      tier = 2;
      rankTitle = '白银彩虹劫车王';
      accentColor = '#c4b5fd';
      nextThreshold = 16;
    } else if (rawMedals >= 3) {
      tier = 1;
      rankTitle = '青铜糖轨猎手';
      accentColor = '#fb923c';
      nextThreshold = 8;
    }

    const dmgPct = Math.round((troopDmgMult - 1) * 100);
    const auraPct = Math.round((bannerAuraMult - 1) * 100);
    return {
      effectiveMedals: rawMedals,
      tier,
      rankTitle,
      accentColor,
      troopDmgMult,
      bannerAuraMult,
      nextThreshold,
      summaryText:
        rawMedals > 0
          ? `${rankTitle} · 波波攻击+${dmgPct}% · 战旗光环+${auraPct}%`
          : `${rankTitle} · 夺取列车金章解锁全局攻击/战旗光环加成`,
    };
  }

  /** Allocation-free 列车金章 milestone multipliers for hot paths (unit spawns, aura sizing). */
  private getEffectiveTrainMedals(): number {
    return Math.min(24, Math.max(0, Math.floor(Math.max(this.trainGoldMedals, this.lifetimeTrainGoldMedals))));
  }

  public getTrainMedalTroopDmgMult(): number {
    return 1 + this.getEffectiveTrainMedals() * 0.01;
  }

  public getCandyTrainRaidSpec(clearsOverride?: number): {
    raidTier: number;
    title: string;
    subtitle: string;
    medalRewardBase: number;
    coinsRewardBase: number;
  } {
    const clears = Math.max(0, Math.floor(clearsOverride ?? this.candyTrainRaidClears));
    const raidTier = Math.min(8, 1 + clears);
    return {
      raidTier,
      title: `彩虹糖果列车突袭战 · 第 ${raidTier} 阶`,
      subtitle: '拦截环线装甲糖果货运列车 · 击破车厢夺取列车金章',
      medalRewardBase: 2 + Math.min(3, Math.floor((raidTier + 1) / 2)),
      coinsRewardBase: 450 + (raidTier - 1) * 100,
    };
  }

  public recordCandyTrainRaidResult(
    victory: boolean,
    carsBroken: number,
    totalCars: number,
    treasureCarsLooted: number,
    medalsLooted: number,
    clearSec: number
  ): {
    victory: boolean;
    raidTierCleared: number;
    medalsAwarded: number;
    coinsAwarded: number;
    milestoneBonusCoins: number;
    milestoneReached: boolean;
    milestoneRankTitle: string;
    totalClears: number;
    totalMedals: number;
    isNewSpeedRecord: boolean;
  } {
    const safeTotal = Math.max(1, Math.floor(totalCars));
    const safeCars = Math.max(0, Math.min(safeTotal, Math.floor(carsBroken)));
    const safeTreasure = Math.max(0, Math.min(safeCars, Math.floor(treasureCarsLooted)));
    const safeLoot = Math.max(0, Math.min(12, Math.floor(medalsLooted)));
    const spec = this.getCandyTrainRaidSpec();
    const tierBefore = this.getTrainMedalMilestoneBonus().tier;

    this.bestTrainCarsBroken = Math.max(this.bestTrainCarsBroken, safeCars);
    this.totalTrainCarsBroken += safeCars;
    this.totalTrainTreasureLooted += safeTreasure;

    let medalsAwarded: number;
    let coinsAwarded: number;
    let isNewSpeedRecord = false;
    if (victory) {
      medalsAwarded = spec.medalRewardBase + safeLoot;
      coinsAwarded = Math.round(spec.coinsRewardBase + safeCars * 45);
      this.candyTrainRaidClears += 1;
      if (clearSec > 0 && (this.bestTrainClearSec <= 0 || clearSec < this.bestTrainClearSec)) {
        this.bestTrainClearSec = Number(clearSec.toFixed(1));
        isNewSpeedRecord = true;
      }
    } else {
      // Looted treasure-car medals are always kept, plus a consolation medal for breaking 3+ cars.
      medalsAwarded = safeLoot + (safeCars >= 3 ? 1 : 0);
      coinsAwarded = safeCars * 55;
    }

    this.trainGoldMedals += medalsAwarded;
    this.lifetimeTrainGoldMedals = Math.max(
      this.lifetimeTrainGoldMedals + medalsAwarded,
      this.trainGoldMedals
    );
    const milestoneAfter = this.getTrainMedalMilestoneBonus();
    const milestoneReached = milestoneAfter.tier > tierBefore;
    const milestoneBonusCoins = milestoneReached ? 250 * milestoneAfter.tier : 0;
    this.gold += coinsAwarded + milestoneBonusCoins;
    this.save();

    return {
      victory,
      raidTierCleared: spec.raidTier,
      medalsAwarded,
      coinsAwarded,
      milestoneBonusCoins,
      milestoneReached,
      milestoneRankTitle: milestoneAfter.rankTitle,
      totalClears: this.candyTrainRaidClears,
      totalMedals: this.trainGoldMedals,
      isNewSpeedRecord,
    };
  }

  public getRelicBannerSpec(id: RelicBannerId = this.activeRelicBanner): RelicBannerSpec {
    return RELIC_BANNERS[id] || RELIC_BANNERS.gale_charge;
  }

  public getRelicBannerLevel(id: RelicBannerId = this.activeRelicBanner): number {
    return Math.max(0, Math.min(RELIC_BANNER_MAX_LEVEL, Math.floor(this.relicBannerLevels[id] ?? 0)));
  }

  public isRelicBannerUnlocked(id: RelicBannerId): boolean {
    return this.getRelicBannerLevel(id) >= 1;
  }

  public getRelicBannerUpgradeCost(id: RelicBannerId): {
    level: number;
    isUnlocked: boolean;
    isMaxed: boolean;
    medalCost: number;
    goldCost: number;
    canAffordMedal: boolean;
    canAffordGold: boolean;
  } {
    const lvl = this.getRelicBannerLevel(id);
    if (lvl >= RELIC_BANNER_MAX_LEVEL) {
      return {
        level: lvl,
        isUnlocked: true,
        isMaxed: true,
        medalCost: 0,
        goldCost: 0,
        canAffordMedal: false,
        canAffordGold: false,
      };
    }
    const spec = RELIC_BANNERS[id];
    const medalCost = spec.medalCosts[lvl];
    const goldCost = spec.goldCosts[lvl];
    return {
      level: lvl,
      isUnlocked: lvl >= 1,
      isMaxed: false,
      medalCost,
      goldCost,
      canAffordMedal: this.trainGoldMedals >= medalCost,
      canAffordGold: this.gold >= goldCost,
    };
  }

  public equipRelicBanner(id: RelicBannerId): boolean {
    if (!RELIC_BANNERS[id]) return false;
    if (this.getRelicBannerLevel(id) < 1) return false;
    this.activeRelicBanner = id;
    this.save();
    return true;
  }

  public upgradeRelicBanner(
    id: RelicBannerId,
    payWith: 'auto' | 'medal' | 'gold' = 'auto'
  ): {
    upgraded: boolean;
    wasUnlock: boolean;
    newLevel: number;
    spentCurrency: 'medal' | 'gold' | 'none';
    spentAmount: number;
  } {
    const cost = this.getRelicBannerUpgradeCost(id);
    const fail = {
      upgraded: false,
      wasUnlock: false,
      newLevel: cost.level,
      spentCurrency: 'none' as const,
      spentAmount: 0,
    };
    if (cost.isMaxed) return fail;

    let mode: 'medal' | 'gold' | 'none' = 'none';
    if (payWith === 'medal') {
      if (cost.canAffordMedal) mode = 'medal';
    } else if (payWith === 'gold') {
      if (cost.canAffordGold) mode = 'gold';
    } else if (cost.canAffordMedal) {
      mode = 'medal';
    } else if (cost.canAffordGold) {
      mode = 'gold';
    }
    if (mode === 'none') return fail;

    let spentAmount = 0;
    if (mode === 'medal') {
      this.lifetimeTrainGoldMedals = Math.max(this.lifetimeTrainGoldMedals, this.trainGoldMedals);
      this.trainGoldMedals = Math.max(0, this.trainGoldMedals - cost.medalCost);
      spentAmount = cost.medalCost;
    } else {
      this.gold = Math.max(0, this.gold - cost.goldCost);
      spentAmount = cost.goldCost;
    }

    const wasUnlock = cost.level === 0;
    const nextLvl = Math.min(RELIC_BANNER_MAX_LEVEL, cost.level + 1);
    this.relicBannerLevels[id] = nextLvl;
    if (this.getRelicBannerLevel(this.activeRelicBanner) <= 0) {
      this.activeRelicBanner = id;
    }
    this.save();
    return {
      upgraded: true,
      wasUnlock,
      newLevel: nextLvl,
      spentCurrency: mode,
      spentAmount,
    };
  }

  /**
   * In-match combat numbers of the equipped (or given) relic banner. Global stats (move speed, troop HP, gold)
   * are always on; aura extras (gale surge, holy-shield damage reduction, star crits) apply within `auraRadius`
   * of the 3D war banner carried by the Bobo crowd.
   */
  public getRelicBannerCombatSpec(id: RelicBannerId = this.activeRelicBanner): {
    id: RelicBannerId;
    level: number;
    accentHex: number;
    auraRadius: number;
    moveSpeedMult: number;
    surgeIntervalSec: number;
    surgeDurationSec: number;
    surgeSpeedMult: number;
    surgeDmgMult: number;
    hpMult: number;
    auraDmgReduction: number;
    shieldEveryNth: number;
    goldMult: number;
    critChance: number;
    critMult: number;
  } {
    const rawLvl = this.getRelicBannerLevel(id);
    const nums = computeRelicBannerNumbers(id, rawLvl);
    const auraMult = 1 + this.getEffectiveTrainMedals() * 0.0125;
    return {
      id,
      level: Math.max(1, rawLvl),
      accentHex: (RELIC_BANNERS[id] || RELIC_BANNERS.gale_charge).accentHex,
      auraRadius: Math.max(4.6, nums.baseAuraRadius) * auraMult,
      moveSpeedMult: nums.moveSpeedMult,
      surgeIntervalSec: nums.surgeIntervalSec,
      surgeDurationSec: nums.surgeDurationSec,
      surgeSpeedMult: nums.surgeSpeedMult,
      surgeDmgMult: nums.surgeDmgMult,
      hpMult: nums.hpMult,
      auraDmgReduction: nums.auraDmgReduction,
      shieldEveryNth: nums.shieldEveryNth,
      goldMult: nums.goldMult,
      critChance: nums.critChance,
      critMult: nums.critMult,
    };
  }

  // ============================================================================
  // MC-11: Deep-Sea Submarine Bubble Rescue (深海珍珠) & Bobo Squad Pet Companion Dock
  // ============================================================================

  public getDeepPearlMilestoneBonus(pearlsOverride?: number): {
    effectivePearls: number;
    tier: number;
    rankTitle: string;
    accentColor: string;
    troopHpMult: number;
    petPowerMult: number;
    nextThreshold: number;
    summaryText: string;
  } {
    const rawPearls =
      typeof pearlsOverride === 'number'
        ? Math.max(0, Math.floor(pearlsOverride))
        : Math.max(0, Math.floor(Math.max(this.deepPearls, this.lifetimeDeepPearls)));
    const capped = Math.min(24, rawPearls);
    const troopHpMult = 1 + capped * 0.01;
    const petPowerMult = 1 + capped * 0.0125;

    let tier = 0;
    let rankTitle = '见习潜航员';
    let accentColor = '#7dd3fc';
    let nextThreshold = 3;
    if (rawPearls >= 16) {
      tier = 3;
      rankTitle = '黄金深海营救王';
      accentColor = '#facc15';
      nextThreshold = 0;
    } else if (rawPearls >= 8) {
      tier = 2;
      rankTitle = '白银深潜队长';
      accentColor = '#c4b5fd';
      nextThreshold = 16;
    } else if (rawPearls >= 3) {
      tier = 1;
      rankTitle = '青铜泡泡潜航员';
      accentColor = '#38bdf8';
      nextThreshold = 8;
    }

    const hpPct = Math.round((troopHpMult - 1) * 100);
    const petPct = Math.round((petPowerMult - 1) * 100);
    return {
      effectivePearls: rawPearls,
      tier,
      rankTitle,
      accentColor,
      troopHpMult,
      petPowerMult,
      nextThreshold,
      summaryText:
        rawPearls > 0
          ? `${rankTitle} · 波波生命+${hpPct}% · 萌宠效能+${petPct}%`
          : `${rankTitle} · 收集深海珍珠解锁全局生命/萌宠效能加成`,
    };
  }

  /** Allocation-free 深海珍珠 milestone multipliers for hot paths (unit spawns, pet procs). */
  private getEffectiveDeepPearls(): number {
    return Math.min(24, Math.max(0, Math.floor(Math.max(this.deepPearls, this.lifetimeDeepPearls))));
  }

  public getPearlTroopHpMult(): number {
    return 1 + this.getEffectiveDeepPearls() * 0.01;
  }

  public getPetPowerMult(): number {
    return 1 + this.getEffectiveDeepPearls() * 0.0125;
  }

  public getSubmarineRescueSpec(clearsOverride?: number): {
    rescueTier: number;
    title: string;
    subtitle: string;
    pearlRewardBase: number;
    coinsRewardBase: number;
  } {
    const clears = Math.max(0, Math.floor(clearsOverride ?? this.submarineRescueClears));
    const rescueTier = Math.min(8, 1 + clears);
    return {
      rescueTier,
      title: `深海潜艇泡泡营救战 · 第 ${rescueTier} 阶`,
      subtitle: '驾驶玩具潜艇破开珊瑚封锁 · 戳破营救泡泡收编被困波波 · 赢取深海珍珠',
      pearlRewardBase: 2 + Math.min(3, Math.floor((rescueTier + 1) / 2)),
      coinsRewardBase: 420 + (rescueTier - 1) * 90,
    };
  }

  public recordSubmarineRescueResult(
    victory: boolean,
    bubblesPopped: number,
    totalBubbles: number,
    bobosRescued: number,
    coralsBroken: number,
    jellyfishCleared: number,
    clearSec: number
  ): {
    victory: boolean;
    rescueTierCleared: number;
    pearlsAwarded: number;
    coinsAwarded: number;
    milestoneBonusCoins: number;
    milestoneReached: boolean;
    milestoneRankTitle: string;
    totalClears: number;
    totalPearls: number;
    isNewSpeedRecord: boolean;
  } {
    const safeTotal = Math.max(1, Math.floor(Number.isFinite(totalBubbles) ? totalBubbles : 1));
    const safeBubbles = Math.max(0, Math.min(safeTotal, Math.floor(Number.isFinite(bubblesPopped) ? bubblesPopped : 0)));
    const safeBobos = Math.max(0, Math.min(600, Math.floor(Number.isFinite(bobosRescued) ? bobosRescued : 0)));
    const safeCorals = Math.max(0, Math.min(12, Math.floor(Number.isFinite(coralsBroken) ? coralsBroken : 0)));
    const safeJelly = Math.max(0, Math.min(999, Math.floor(Number.isFinite(jellyfishCleared) ? jellyfishCleared : 0)));
    const spec = this.getSubmarineRescueSpec();
    const tierBefore = this.getDeepPearlMilestoneBonus().tier;

    this.bestSubmarineRescuedBobos = Math.max(this.bestSubmarineRescuedBobos, safeBobos);
    this.totalBubblesPopped += safeBubbles;
    this.totalJellyfishCleared += safeJelly;
    this.totalCoralBroken += safeCorals;

    let pearlsAwarded: number;
    let coinsAwarded: number;
    let isNewSpeedRecord = false;
    if (victory) {
      pearlsAwarded = spec.pearlRewardBase + Math.floor(safeBubbles / 2) + (safeBubbles >= safeTotal ? 1 : 0);
      coinsAwarded = Math.round(spec.coinsRewardBase + safeBobos * 6 + safeJelly * 4);
      this.submarineRescueClears += 1;
      if (clearSec > 0 && Number.isFinite(clearSec) && (this.bestSubmarineClearSec <= 0 || clearSec < this.bestSubmarineClearSec)) {
        this.bestSubmarineClearSec = Number(clearSec.toFixed(1));
        isNewSpeedRecord = true;
      }
    } else {
      // Rescued squads still earn a few pearls: 1 per 3 popped bubbles + 1 for breaking 2+ coral barriers.
      pearlsAwarded = Math.floor(safeBubbles / 3) + (safeCorals >= 2 ? 1 : 0);
      coinsAwarded = safeCorals * 60 + safeBobos * 3;
    }

    this.deepPearls += pearlsAwarded;
    this.lifetimeDeepPearls = Math.max(this.lifetimeDeepPearls + pearlsAwarded, this.deepPearls);
    const milestoneAfter = this.getDeepPearlMilestoneBonus();
    const milestoneReached = milestoneAfter.tier > tierBefore;
    const milestoneBonusCoins = milestoneReached ? 250 * milestoneAfter.tier : 0;
    this.gold += coinsAwarded + milestoneBonusCoins;
    this.save();

    return {
      victory,
      rescueTierCleared: spec.rescueTier,
      pearlsAwarded,
      coinsAwarded,
      milestoneBonusCoins,
      milestoneReached,
      milestoneRankTitle: milestoneAfter.rankTitle,
      totalClears: this.submarineRescueClears,
      totalPearls: this.deepPearls,
      isNewSpeedRecord,
    };
  }

  public getPetCompanionSpec(id: PetCompanionId = this.activePet): PetCompanionSpec {
    return PET_COMPANIONS[id] || PET_COMPANIONS.jelly_puff;
  }

  public getPetCompanionLevel(id: PetCompanionId = this.activePet): number {
    return Math.max(0, Math.min(PET_COMPANION_MAX_LEVEL, Math.floor(this.petLevels[id] ?? 0)));
  }

  public isPetAdopted(id: PetCompanionId): boolean {
    return this.getPetCompanionLevel(id) >= 1;
  }

  public getPetUpgradeCost(id: PetCompanionId): {
    level: number;
    isAdopted: boolean;
    isMaxed: boolean;
    pearlCost: number;
    goldCost: number;
    canAffordPearl: boolean;
    canAffordGold: boolean;
  } {
    const lvl = this.getPetCompanionLevel(id);
    if (lvl >= PET_COMPANION_MAX_LEVEL) {
      return {
        level: lvl,
        isAdopted: true,
        isMaxed: true,
        pearlCost: 0,
        goldCost: 0,
        canAffordPearl: false,
        canAffordGold: false,
      };
    }
    const spec = PET_COMPANIONS[id];
    const pearlCost = spec.pearlCosts[lvl];
    const goldCost = spec.goldCosts[lvl];
    return {
      level: lvl,
      isAdopted: lvl >= 1,
      isMaxed: false,
      pearlCost,
      goldCost,
      canAffordPearl: this.deepPearls >= pearlCost,
      canAffordGold: this.gold >= goldCost,
    };
  }

  /** Single active pet slot: only one adopted pet follows the squad into matches at a time. */
  public equipPetCompanion(id: PetCompanionId): boolean {
    if (!PET_COMPANIONS[id]) return false;
    if (this.getPetCompanionLevel(id) < 1) return false;
    this.activePet = id;
    this.save();
    return true;
  }

  public upgradePetCompanion(
    id: PetCompanionId,
    payWith: 'auto' | 'pearl' | 'gold' = 'auto'
  ): {
    upgraded: boolean;
    wasAdopt: boolean;
    newLevel: number;
    spentCurrency: 'pearl' | 'gold' | 'none';
    spentAmount: number;
  } {
    const fail = {
      upgraded: false,
      wasAdopt: false,
      newLevel: this.getPetCompanionLevel(id),
      spentCurrency: 'none' as const,
      spentAmount: 0,
    };
    if (!PET_COMPANIONS[id]) return fail;
    const cost = this.getPetUpgradeCost(id);
    if (cost.isMaxed) return fail;

    let mode: 'pearl' | 'gold' | 'none' = 'none';
    if (payWith === 'pearl') {
      if (cost.canAffordPearl) mode = 'pearl';
    } else if (payWith === 'gold') {
      if (cost.canAffordGold) mode = 'gold';
    } else if (cost.canAffordPearl) {
      mode = 'pearl';
    } else if (cost.canAffordGold) {
      mode = 'gold';
    }
    if (mode === 'none') return fail;

    let spentAmount = 0;
    if (mode === 'pearl') {
      this.lifetimeDeepPearls = Math.max(this.lifetimeDeepPearls, this.deepPearls);
      this.deepPearls = Math.max(0, this.deepPearls - cost.pearlCost);
      spentAmount = cost.pearlCost;
    } else {
      this.gold = Math.max(0, this.gold - cost.goldCost);
      spentAmount = cost.goldCost;
    }

    const wasAdopt = cost.level === 0;
    const nextLvl = Math.min(PET_COMPANION_MAX_LEVEL, cost.level + 1);
    this.petLevels[id] = nextLvl;
    if (this.getPetCompanionLevel(this.activePet) <= 0) {
      this.activePet = id;
    }
    this.save();
    return {
      upgraded: true,
      wasAdopt,
      newLevel: nextLvl,
      spentCurrency: mode,
      spentAmount,
    };
  }

  /**
   * In-match numbers of the active (or given) pet companion. Global stats (gold pickup, damage taken) are
   * always on; periodic procs (magnet pulse / shell shields / chain spark) fire from the 3D pet that follows
   * the Bobo crowd. Proc strength scales with the 深海珍珠 milestone pet-power multiplier.
   */
  public getPetCompanionCombatSpec(id: PetCompanionId = this.activePet): {
    id: PetCompanionId;
    level: number;
    adopted: boolean;
    accentHex: number;
    petPowerMult: number;
    goldMult: number;
    magnetRadius: number;
    magnetIntervalSec: number;
    magnetGold: number;
    magnetPull: number;
    dmgTakenMult: number;
    shellIntervalSec: number;
    shellShieldCount: number;
    shellRadius: number;
    sparkIntervalSec: number;
    sparkChainTargets: number;
    sparkDmg: number;
    comboKillsPerSpark: number;
  } {
    const rawLvl = this.getPetCompanionLevel(id);
    const nums = computePetCompanionNumbers(id, rawLvl);
    const petPower = 1 + this.getEffectiveDeepPearls() * 0.0125;
    return {
      id,
      level: Math.max(0, rawLvl),
      adopted: rawLvl >= 1,
      accentHex: (PET_COMPANIONS[id] || PET_COMPANIONS.jelly_puff).accentHex,
      petPowerMult: petPower,
      goldMult: nums.goldMult,
      magnetRadius: nums.magnetRadius * (1 + (petPower - 1) * 0.5),
      magnetIntervalSec: nums.magnetIntervalSec,
      magnetGold: Math.round(nums.magnetGold * petPower),
      magnetPull: nums.magnetPull,
      dmgTakenMult: nums.dmgTakenMult,
      shellIntervalSec: nums.shellIntervalSec,
      shellShieldCount: nums.shellShieldCount > 0 ? nums.shellShieldCount + Math.floor((petPower - 1) * 10) : 0,
      shellRadius: nums.shellRadius,
      sparkIntervalSec: nums.sparkIntervalSec,
      sparkChainTargets: nums.sparkChainTargets,
      sparkDmg: nums.sparkDmg * petPower,
      comboKillsPerSpark: nums.comboKillsPerSpark,
    };
  }

  // ============================================================================
  // MC-12: Glacier Sled Race (冰晶奖章) & Bobo Squad Honor Trophy Hall
  // ============================================================================

  public getIceMedalMilestoneBonus(medalsOverride?: number): {
    effectiveMedals: number;
    tier: number;
    rankTitle: string;
    accentColor: string;
    troopSpeedMult: number;
    sledBonusRiders: number;
    nextThreshold: number;
    summaryText: string;
  } {
    const rawMedals =
      typeof medalsOverride === 'number'
        ? Math.max(0, Math.floor(medalsOverride))
        : Math.max(0, Math.floor(Math.max(this.iceMedals, this.lifetimeIceMedals)));
    const capped = Math.min(24, rawMedals);
    const troopSpeedMult = 1 + capped * 0.005;
    const sledBonusRiders = Math.floor(capped / 3);

    let tier = 0;
    let rankTitle = '见习雪橇手';
    let accentColor = '#bae6fd';
    let nextThreshold = 3;
    if (rawMedals >= 16) {
      tier = 3;
      rankTitle = '黄金冰川车神';
      accentColor = '#facc15';
      nextThreshold = 0;
    } else if (rawMedals >= 8) {
      tier = 2;
      rankTitle = '白银雪崩骑士';
      accentColor = '#c4b5fd';
      nextThreshold = 16;
    } else if (rawMedals >= 3) {
      tier = 1;
      rankTitle = '青铜冰川滑手';
      accentColor = '#7dd3fc';
      nextThreshold = 8;
    }

    const speedPct = Math.round((troopSpeedMult - 1) * 1000) / 10;
    return {
      effectiveMedals: rawMedals,
      tier,
      rankTitle,
      accentColor,
      troopSpeedMult,
      sledBonusRiders,
      nextThreshold,
      summaryText:
        rawMedals > 0
          ? `${rankTitle} · 波波移速+${speedPct}% · 雪橇起步波波+${sledBonusRiders}`
          : `${rankTitle} · 收集冰晶奖章解锁全局移速/雪橇起步加成`,
    };
  }

  /** Allocation-free 冰晶奖章 milestone multiplier for hot paths (unit spawns). */
  private getEffectiveIceMedals(): number {
    return Math.min(24, Math.max(0, Math.floor(Math.max(this.iceMedals, this.lifetimeIceMedals))));
  }

  public getIceMedalSpeedMult(): number {
    return 1 + this.getEffectiveIceMedals() * 0.005;
  }

  public getGlacierSledSpec(clearsOverride?: number): {
    sledTier: number;
    title: string;
    subtitle: string;
    medalRewardBase: number;
    coinsRewardBase: number;
  } {
    const clears = Math.max(0, Math.floor(clearsOverride ?? this.glacierSledClears));
    const sledTier = Math.min(8, 1 + clears);
    return {
      sledTier,
      title: `冰川雪橇竞速冲关 · 第 ${sledTier} 阶`,
      subtitle: '操控玩具雪橇冲下冰川 · 躲雪崩浪与坠落冰锥 · 穿加人门限时冲线',
      medalRewardBase: 2 + Math.min(3, Math.floor((sledTier + 1) / 2)),
      coinsRewardBase: 420 + (sledTier - 1) * 90,
    };
  }

  /**
   * Settles one sled run. Victory medals = tier base + finish-time bonus (>=30% / >=15% of the limit left -> +2 / +1)
   * + survivor bonus (+1 per 20 riders, max +4). Defeats keep a consolation medal per 45% of the course covered.
   */
  public recordGlacierSledResult(
    victory: boolean,
    finishSec: number,
    timeLimitSec: number,
    survivors: number,
    ridersLost: number,
    gatesPassed: number,
    progressPct: number
  ): {
    victory: boolean;
    sledTierCleared: number;
    medalsAwarded: number;
    timeBonusMedals: number;
    survivorBonusMedals: number;
    coinsAwarded: number;
    milestoneBonusCoins: number;
    milestoneReached: boolean;
    milestoneRankTitle: string;
    totalClears: number;
    totalMedals: number;
    isNewSpeedRecord: boolean;
  } {
    const safeLimit = Math.max(1, Number.isFinite(timeLimitSec) ? timeLimitSec : 1);
    const safeFinish = Math.max(0, Math.min(3600, Number.isFinite(finishSec) ? finishSec : safeLimit));
    const safeSurv = Math.max(0, Math.min(600, Math.floor(Number.isFinite(survivors) ? survivors : 0)));
    const safeLost = Math.max(0, Math.min(9999, Math.floor(Number.isFinite(ridersLost) ? ridersLost : 0)));
    const safeGates = Math.max(0, Math.min(99, Math.floor(Number.isFinite(gatesPassed) ? gatesPassed : 0)));
    const safePct = Math.max(0, Math.min(100, Number.isFinite(progressPct) ? progressPct : 0));
    const spec = this.getGlacierSledSpec();
    const tierBefore = this.getIceMedalMilestoneBonus().tier;

    this.totalSledGatesPassed += safeGates;
    this.totalSledRidersLost += safeLost;

    let medalsAwarded: number;
    let coinsAwarded: number;
    let timeBonusMedals = 0;
    let survivorBonusMedals = 0;
    let isNewSpeedRecord = false;
    if (victory) {
      const timeLeftRatio = Math.max(0, Math.min(1, (safeLimit - safeFinish) / safeLimit));
      timeBonusMedals = timeLeftRatio >= 0.3 ? 2 : timeLeftRatio >= 0.15 ? 1 : 0;
      survivorBonusMedals = Math.min(4, Math.floor(safeSurv / 20));
      medalsAwarded = spec.medalRewardBase + timeBonusMedals + survivorBonusMedals;
      coinsAwarded = Math.round(spec.coinsRewardBase + safeSurv * 4 + Math.max(0, safeLimit - safeFinish) * 10);
      this.glacierSledClears += 1;
      this.bestSledSurvivors = Math.max(this.bestSledSurvivors, safeSurv);
      if (safeFinish > 0 && (this.bestSledFinishSec <= 0 || safeFinish < this.bestSledFinishSec)) {
        this.bestSledFinishSec = Number(safeFinish.toFixed(1));
        isNewSpeedRecord = true;
      }
    } else {
      medalsAwarded = Math.min(2, Math.floor(safePct / 45));
      coinsAwarded = Math.round(safePct * 3 + safeSurv * 2);
    }

    this.iceMedals += medalsAwarded;
    this.lifetimeIceMedals = Math.max(this.lifetimeIceMedals + medalsAwarded, this.iceMedals);
    const milestoneAfter = this.getIceMedalMilestoneBonus();
    const milestoneReached = milestoneAfter.tier > tierBefore;
    const milestoneBonusCoins = milestoneReached ? 250 * milestoneAfter.tier : 0;
    this.gold += coinsAwarded + milestoneBonusCoins;
    this.save();

    return {
      victory,
      sledTierCleared: spec.sledTier,
      medalsAwarded,
      timeBonusMedals,
      survivorBonusMedals,
      coinsAwarded,
      milestoneBonusCoins,
      milestoneReached,
      milestoneRankTitle: milestoneAfter.rankTitle,
      totalClears: this.glacierSledClears,
      totalMedals: this.iceMedals,
      isNewSpeedRecord,
    };
  }

  /** Reads the existing saved counter behind each trophy (never a duplicated copy). */
  public getHallTrophyMetric(id: HallTrophyId): number {
    switch (id) {
      case 'campaign_star':
        return Math.max(0, Math.floor(this.bestStageCleared));
      case 'clockwork_core':
        return Math.max(0, Math.floor(this.colossusRaidClears));
      case 'airship_medal':
        return Math.max(0, Math.floor(Math.max(this.airshipWingMedals, this.lifetimeAirshipWingMedals)));
      case 'train_medal':
        return Math.max(0, Math.floor(Math.max(this.trainGoldMedals, this.lifetimeTrainGoldMedals)));
      case 'deep_pearl':
        return Math.max(0, Math.floor(Math.max(this.deepPearls, this.lifetimeDeepPearls)));
      case 'ice_medal':
        return Math.max(0, Math.floor(Math.max(this.iceMedals, this.lifetimeIceMedals)));
      case 'lava_core':
        return Math.max(0, Math.floor(Math.max(this.lavaCores, this.lifetimeLavaCores)));
      case 'stardust_badge':
        return Math.max(0, Math.floor(Math.max(this.stardustBadges, this.lifetimeStardustBadges)));
      case 'pumpkin_badge':
        return Math.max(0, Math.floor(Math.max(this.pumpkinBadges, this.lifetimePumpkinBadges)));
      case 'scarab_badge':
        return Math.max(0, Math.floor(Math.max(this.scarabBadges, this.lifetimeScarabBadges)));
      case 'emerald_idol_badge':
        return Math.max(0, Math.floor(Math.max(this.emeraldIdolBadges, this.lifetimeEmeraldIdolBadges)));
      default:
        return 0;
    }
  }

  /** 0 = not earned yet, 1 = 青铜, 2 = 白银, 3 = 黄金. */
  public getHallTrophyTier(id: HallTrophyId): number {
    const spec = HALL_TROPHIES[id];
    if (!spec) return 0;
    const m = this.getHallTrophyMetric(id);
    return m >= spec.thresholds[2] ? 3 : m >= spec.thresholds[1] ? 2 : m >= spec.thresholds[0] ? 1 : 0;
  }

  public getHallTrophyInfo(id: HallTrophyId): {
    id: HallTrophyId;
    spec: HallTrophySpec;
    metric: number;
    tier: number;
    tierName: string;
    nextThreshold: number;
    buffValue: number;
    displaySlot: number;
    progressText: string;
  } {
    const spec = HALL_TROPHIES[id];
    const metric = this.getHallTrophyMetric(id);
    const tier = this.getHallTrophyTier(id);
    const nextThreshold = tier >= 3 ? 0 : spec.thresholds[tier];
    const buffValue = tier >= 1 ? spec.buffPerTier[tier - 1] : 0;
    const displaySlot = this.trophyDisplay.indexOf(id);
    const progressText =
      tier >= 3
        ? `${spec.metricLabel} ${metric}${spec.unit} · 已达黄金`
        : `${spec.metricLabel} ${metric}/${nextThreshold}${spec.unit} · 下一档${HALL_TROPHY_TIER_NAMES[tier + 1]}`;
    return {
      id,
      spec,
      metric,
      tier,
      tierName: HALL_TROPHY_TIER_NAMES[tier],
      nextThreshold,
      buffValue,
      displaySlot: displaySlot >= 0 && displaySlot < this.getUnlockedTrophySlots() ? displaySlot : -1,
      progressText,
    };
  }

  public getUnlockedTrophySlots(): number {
    return Math.max(1, Math.min(TROPHY_HALL_SLOT_COUNT, Math.floor(this.trophyHallSlots || 1)));
  }

  public getTrophySlotUnlockCost(): {
    slotIndex: number;
    isMaxed: boolean;
    medalCost: number;
    goldCost: number;
    canAffordMedal: boolean;
    canAffordGold: boolean;
  } {
    const slotIndex = this.getUnlockedTrophySlots();
    if (slotIndex >= TROPHY_HALL_SLOT_COUNT) {
      return { slotIndex, isMaxed: true, medalCost: 0, goldCost: 0, canAffordMedal: false, canAffordGold: false };
    }
    const medalCost: number = TROPHY_SLOT_MEDAL_COSTS[slotIndex];
    const goldCost: number = TROPHY_SLOT_GOLD_COSTS[slotIndex];
    return {
      slotIndex,
      isMaxed: false,
      medalCost,
      goldCost,
      canAffordMedal: this.iceMedals >= medalCost,
      canAffordGold: this.gold >= goldCost,
    };
  }

  public unlockTrophySlot(payWith: 'auto' | 'medal' | 'gold' = 'auto'): {
    unlocked: boolean;
    slotIndex: number;
    spentCurrency: 'medal' | 'gold' | 'none';
    spentAmount: number;
  } {
    const cost = this.getTrophySlotUnlockCost();
    if (cost.isMaxed) return { unlocked: false, slotIndex: cost.slotIndex, spentCurrency: 'none', spentAmount: 0 };
    let mode: 'medal' | 'gold' | 'none' = 'none';
    if (payWith === 'medal') {
      if (cost.canAffordMedal) mode = 'medal';
    } else if (payWith === 'gold') {
      if (cost.canAffordGold) mode = 'gold';
    } else if (cost.canAffordMedal) {
      mode = 'medal';
    } else if (cost.canAffordGold) {
      mode = 'gold';
    }
    if (mode === 'none') return { unlocked: false, slotIndex: cost.slotIndex, spentCurrency: 'none', spentAmount: 0 };
    let spentAmount: number;
    if (mode === 'medal') {
      this.lifetimeIceMedals = Math.max(this.lifetimeIceMedals, this.iceMedals);
      this.iceMedals = Math.max(0, this.iceMedals - cost.medalCost);
      spentAmount = cost.medalCost;
    } else {
      this.gold = Math.max(0, this.gold - cost.goldCost);
      spentAmount = cost.goldCost;
    }
    this.trophyHallSlots = Math.min(TROPHY_HALL_SLOT_COUNT, cost.slotIndex + 1);
    this.save();
    return { unlocked: true, slotIndex: cost.slotIndex, spentCurrency: mode, spentAmount };
  }

  /** Places an earned trophy into an unlocked slot (moving it if already displayed elsewhere); null clears the slot. */
  public placeTrophy(slotIndex: number, id: HallTrophyId | null): boolean {
    const idx = Math.floor(slotIndex);
    if (!(idx >= 0 && idx < this.getUnlockedTrophySlots())) return false;
    if (id === null) {
      if (!this.trophyDisplay[idx]) return false;
      this.trophyDisplay[idx] = null;
      this.save();
      return true;
    }
    if (!HALL_TROPHIES[id] || this.getHallTrophyTier(id) < 1) return false;
    for (let i = 0; i < this.trophyDisplay.length; i++) {
      if (i !== idx && this.trophyDisplay[i] === id) this.trophyDisplay[i] = null;
    }
    this.trophyDisplay[idx] = id;
    this.save();
    return true;
  }

  /** Fills every unlocked slot with the highest-tier earned trophies. Returns how many trophies are displayed. */
  public autoArrangeTrophies(): number {
    const slots = this.getUnlockedTrophySlots();
    const earned = HALL_TROPHY_ORDER.filter((tid) => this.getHallTrophyTier(tid) >= 1).sort(
      (a, b) => this.getHallTrophyTier(b) - this.getHallTrophyTier(a)
    );
    const next: Array<HallTrophyId | null> = [null, null, null, null, null, null];
    for (let i = 0; i < Math.min(slots, earned.length); i++) next[i] = earned[i];
    this.trophyDisplay = next;
    this.save();
    return Math.min(slots, earned.length);
  }

  public getDisplayedTrophyIds(): HallTrophyId[] {
    const out: HallTrophyId[] = [];
    const slots = this.getUnlockedTrophySlots();
    for (let i = 0; i < slots; i++) {
      const tid = this.trophyDisplay[i];
      if (tid && this.getHallTrophyTier(tid) >= 1) out.push(tid);
    }
    return out;
  }

  /** Allocation-free count of valid trophies on display (hot path: gold pickup, unit spawns). */
  public getDisplayedTrophyCount(): number {
    let n = 0;
    const slots = this.getUnlockedTrophySlots();
    for (let i = 0; i < slots; i++) {
      const tid = this.trophyDisplay[i];
      if (tid && this.getHallTrophyTier(tid) >= 1) n++;
    }
    return n;
  }

  /** Allocation-free sum of the per-trophy buff of `kind` across displayed trophies. */
  public getHallTrophyBuff(kind: HallTrophyBuffKind): number {
    let sum = 0;
    const slots = this.getUnlockedTrophySlots();
    for (let i = 0; i < slots; i++) {
      const tid = this.trophyDisplay[i];
      if (!tid) continue;
      const spec = HALL_TROPHIES[tid];
      if (!spec || spec.buffKind !== kind) continue;
      const tier = this.getHallTrophyTier(tid);
      if (tier >= 1) sum += spec.buffPerTier[tier - 1];
    }
    return sum;
  }

  /** Hall milestone: 2 / 4 / 6 trophies on display -> 青铜陈列馆 / 白银荣誉殿堂 / 黄金冠军名人堂. */
  public getHallMilestoneTier(): number {
    const n = this.getDisplayedTrophyCount();
    return n >= 6 ? 3 : n >= 4 ? 2 : n >= 2 ? 1 : 0;
  }

  public getHallGoldMult(): number {
    return (1 + this.getHallMilestoneTier() * 0.05) * (1 + this.getHallTrophyBuff('gold'));
  }

  public getHallTroopHpMult(): number {
    return (1 + this.getHallMilestoneTier() * 0.02) * (1 + this.getHallTrophyBuff('hp'));
  }

  public getHallTroopDmgMult(): number {
    return (1 + this.getHallMilestoneTier() * 0.02) * (1 + this.getHallTrophyBuff('dmg'));
  }

  public getTrophyHallBonus(): {
    displayedCount: number;
    unlockedSlots: number;
    earnedCount: number;
    tier: number;
    rankTitle: string;
    accentColor: string;
    goldMult: number;
    troopMult: number;
    buffs: Record<HallTrophyBuffKind, number>;
    nextThreshold: number;
    summaryText: string;
  } {
    const displayedCount = this.getDisplayedTrophyCount();
    const tier = this.getHallMilestoneTier();
    const earnedCount = HALL_TROPHY_ORDER.filter((tid) => this.getHallTrophyTier(tid) >= 1).length;
    const titles = ['冷清的陈列馆', '青铜荣誉陈列馆', '白银荣誉殿堂', '黄金冠军名人堂'];
    const colors = ['#94a3b8', '#fb923c', '#c4b5fd', '#facc15'];
    const goldMult = 1 + tier * 0.05;
    const troopMult = 1 + tier * 0.02;
    const buffs: Record<HallTrophyBuffKind, number> = {
      power: this.getHallTrophyBuff('power'),
      siege: this.getHallTrophyBuff('siege'),
      fire: this.getHallTrophyBuff('fire'),
      dmg: this.getHallTrophyBuff('dmg'),
      hp: this.getHallTrophyBuff('hp'),
      speed: this.getHallTrophyBuff('speed'),
      gold: this.getHallTrophyBuff('gold'),
    };
    const nextThreshold = tier >= 3 ? 0 : [2, 4, 6][tier];
    return {
      displayedCount,
      unlockedSlots: this.getUnlockedTrophySlots(),
      earnedCount,
      tier,
      rankTitle: titles[tier],
      accentColor: colors[tier],
      goldMult,
      troopMult,
      buffs,
      nextThreshold,
      summaryText:
        tier > 0
          ? `${titles[tier]} · 金币拾取+${Math.round((goldMult - 1) * 100)}% · 波波生命/攻击+${Math.round((troopMult - 1) * 100)}%`
          : `${titles[tier]} · 陈列 2 座奖杯解锁全局金币/生命/攻击加成`,
    };
  }

  // ============================================================================
  // MC-13: Volcano Lava Jump Breakout (熔岩晶核) & Bobo Squad Skin Gacha Machine
  // ============================================================================

  /** 熔岩晶核 milestone ladder (lifetime count, so cores spent in the gacha machine never drop a tier). */
  public getLavaCoreMilestoneBonus(coresOverride?: number): {
    effectiveCores: number;
    tier: number;
    rankTitle: string;
    accentColor: string;
    troopHpMult: number;
    lavaBonusBobos: number;
    nextThreshold: number;
    summaryText: string;
  } {
    const rawCores =
      typeof coresOverride === 'number'
        ? Math.max(0, Math.floor(coresOverride))
        : Math.max(0, Math.floor(Math.max(this.lavaCores, this.lifetimeLavaCores)));
    const capped = Math.min(24, rawCores);
    const troopHpMult = 1 + capped * 0.004;
    const lavaBonusBobos = Math.floor(capped / 3);
    let tier = 0;
    let rankTitle = '见习熔岩跳客';
    let accentColor = '#fdba74';
    let nextThreshold = 3;
    if (rawCores >= 16) {
      tier = 3;
      rankTitle = '黄金熔岩霸主';
      accentColor = '#facc15';
      nextThreshold = 0;
    } else if (rawCores >= 8) {
      tier = 2;
      rankTitle = '白银火山行者';
      accentColor = '#c4b5fd';
      nextThreshold = 16;
    } else if (rawCores >= 3) {
      tier = 1;
      rankTitle = '青铜熔岩跳客';
      accentColor = '#fb923c';
      nextThreshold = 8;
    }
    const hpPct = Math.round((troopHpMult - 1) * 1000) / 10;
    return {
      effectiveCores: rawCores,
      tier,
      rankTitle,
      accentColor,
      troopHpMult,
      lavaBonusBobos,
      nextThreshold,
      summaryText:
        rawCores > 0
          ? `${rankTitle} · 波波生命+${hpPct}% · 跳台起步波波+${lavaBonusBobos}`
          : `${rankTitle} · 收集熔岩晶核解锁全局生命/跳台起步加成`,
    };
  }

  /** Allocation-free 熔岩晶核 milestone troop HP multiplier for hot paths (unit spawns). */
  public getLavaCoreHpMult(): number {
    return 1 + Math.min(24, Math.max(0, Math.floor(Math.max(this.lavaCores, this.lifetimeLavaCores)))) * 0.004;
  }

  public getLavaJumpSpec(clearsOverride?: number): {
    lavaTier: number;
    title: string;
    subtitle: string;
    coreRewardBase: number;
    coinsRewardBase: number;
  } {
    const clears = Math.max(0, Math.floor(clearsOverride ?? this.lavaJumpClears));
    const lavaTier = Math.min(8, 1 + clears);
    return {
      lavaTier,
      title: `火山熔岩跳台突围战 · 第 ${lavaTier} 阶`,
      subtitle: '操控波波团连跳熔岩浮石 · 躲喷发与落石 · 抢冷却岩穿加人门冲出火山口',
      coreRewardBase: 2 + Math.min(3, Math.floor((lavaTier + 1) / 2)),
      coinsRewardBase: 400 + (lavaTier - 1) * 90,
    };
  }

  /**
   * Settles one lava jump run. Victory cores = tier base + finish-time bonus (>=30% / >=15% of the limit left -> +2 / +1)
   * + survivor bonus (+1 per 15 Bobos, max +4). Defeats keep a consolation core per 45% of the course covered (max 2).
   */
  public recordLavaJumpResult(
    victory: boolean,
    finishSec: number,
    timeLimitSec: number,
    survivors: number,
    bobosLost: number,
    hops: number,
    progressPct: number
  ): {
    victory: boolean;
    lavaTierCleared: number;
    coresAwarded: number;
    timeBonusCores: number;
    survivorBonusCores: number;
    coinsAwarded: number;
    milestoneBonusCoins: number;
    milestoneReached: boolean;
    milestoneRankTitle: string;
    totalClears: number;
    totalCores: number;
    isNewSpeedRecord: boolean;
  } {
    const safeLimit = Math.max(1, Number.isFinite(timeLimitSec) ? timeLimitSec : 1);
    const safeFinish = Math.max(0, Math.min(3600, Number.isFinite(finishSec) ? finishSec : safeLimit));
    const safeSurv = Math.max(0, Math.min(600, Math.floor(Number.isFinite(survivors) ? survivors : 0)));
    const safeLost = Math.max(0, Math.min(9999, Math.floor(Number.isFinite(bobosLost) ? bobosLost : 0)));
    const safeHops = Math.max(0, Math.min(999, Math.floor(Number.isFinite(hops) ? hops : 0)));
    const safePct = Math.max(0, Math.min(100, Number.isFinite(progressPct) ? progressPct : 0));
    const spec = this.getLavaJumpSpec();
    const tierBefore = this.getLavaCoreMilestoneBonus().tier;

    this.totalLavaHops += safeHops;
    this.totalLavaBobosLost += safeLost;

    let coresAwarded: number;
    let coinsAwarded: number;
    let timeBonusCores = 0;
    let survivorBonusCores = 0;
    let isNewSpeedRecord = false;
    if (victory) {
      const timeLeftRatio = Math.max(0, Math.min(1, (safeLimit - safeFinish) / safeLimit));
      timeBonusCores = timeLeftRatio >= 0.3 ? 2 : timeLeftRatio >= 0.15 ? 1 : 0;
      survivorBonusCores = Math.min(4, Math.floor(safeSurv / 15));
      coresAwarded = spec.coreRewardBase + timeBonusCores + survivorBonusCores;
      coinsAwarded = Math.round(spec.coinsRewardBase + safeSurv * 4 + Math.max(0, safeLimit - safeFinish) * 10);
      this.lavaJumpClears += 1;
      this.bestLavaSurvivors = Math.max(this.bestLavaSurvivors, safeSurv);
      if (safeFinish > 0 && (this.bestLavaFinishSec <= 0 || safeFinish < this.bestLavaFinishSec)) {
        this.bestLavaFinishSec = Number(safeFinish.toFixed(1));
        isNewSpeedRecord = true;
      }
    } else {
      coresAwarded = Math.min(2, Math.floor(safePct / 45));
      coinsAwarded = Math.round(safePct * 3 + safeSurv * 2);
    }

    this.lavaCores = Math.min(99999, this.lavaCores + coresAwarded);
    this.lifetimeLavaCores = Math.min(99999, Math.max(this.lifetimeLavaCores + coresAwarded, this.lavaCores));
    const milestoneAfter = this.getLavaCoreMilestoneBonus();
    const milestoneReached = milestoneAfter.tier > tierBefore;
    const milestoneBonusCoins = milestoneReached ? 250 * milestoneAfter.tier : 0;
    this.gold += coinsAwarded + milestoneBonusCoins;
    this.save();

    return {
      victory,
      lavaTierCleared: spec.lavaTier,
      coresAwarded,
      timeBonusCores,
      survivorBonusCores,
      coinsAwarded,
      milestoneBonusCoins,
      milestoneReached,
      milestoneRankTitle: milestoneAfter.rankTitle,
      totalClears: this.lavaJumpClears,
      totalCores: this.lavaCores,
      isNewSpeedRecord,
    };
  }

  // ---------------------------------------------------------------------------
  // Skin gacha machine
  // ---------------------------------------------------------------------------

  public getGachaSkinSpec(id: GachaSkinId): GachaSkinSpec {
    return GACHA_SKINS[id];
  }

  public getEquippedGachaSkinSpec(): GachaSkinSpec | null {
    const id = this.equippedGachaSkin;
    return id && this.ownedGachaSkins.includes(id) ? GACHA_SKINS[id] : null;
  }

  public getGachaCollectionGoldMult(): number {
    let owned = 0;
    for (let i = 0; i < this.ownedGachaSkins.length; i++) {
      if (GACHA_SKINS[this.ownedGachaSkins[i]]) owned++;
    }
    return 1 + Math.min(GACHA_COLLECTION_GOLD_CAP, owned * GACHA_COLLECTION_GOLD_PER_SKIN);
  }

  public getGachaRollCost(count: 1 | 10): { cores: number; gold: number; canAffordCores: boolean; canAffordGold: boolean } {
    const cores = count === 10 ? GACHA_TEN_COST_CORES : GACHA_SINGLE_COST_CORES;
    const gold = count === 10 ? GACHA_TEN_COST_GOLD : GACHA_SINGLE_COST_GOLD;
    return { cores, gold, canAffordCores: this.lavaCores >= cores, canAffordGold: this.gold >= gold };
  }

  /** Rolls left until the 史诗+ pity triggers (1 = the very next roll is guaranteed). */
  public getGachaPityInfo(): { srLeft: number; ssrLeft: number; srProgress: number } {
    const srLeft = Math.max(1, GACHA_PITY_SR - Math.max(0, Math.floor(this.gachaPity)));
    const ssrLeft = Math.max(1, GACHA_PITY_SSR - Math.max(0, Math.floor(this.gachaSsrPity)));
    return { srLeft, ssrLeft, srProgress: Math.min(1, this.gachaPity / (GACHA_PITY_SR - 1)) };
  }

  /**
   * One pull with an injectable random source (values in [0, 1)). Base odds: 普通 55% / 稀有 30% / 史诗 12% / 传说 3%.
   * Pity: if the previous 9 pulls had no 史诗+, this pull is upgraded to 史诗+ (20% of those upgrades become 传说);
   * if the previous 49 pulls had no 传说, this pull is a 传说. Within a rarity every skin is equally likely.
   * Duplicates convert to coins by rarity. Does not charge any cost and does not save.
   */
  public pullGachaOnce(rng: () => number = Math.random): GachaRollResult {
    const r01 = (): number => {
      const v = Number(rng());
      return Number.isFinite(v) ? Math.min(0.999999, Math.max(0, v)) : 0;
    };
    let rarity: GachaRarity;
    let pity: 'sr' | 'ssr' | null = null;
    if (this.gachaSsrPity >= GACHA_PITY_SSR - 1) {
      rarity = 'SSR';
      pity = 'ssr';
      r01();
    } else {
      const roll = r01() * 100;
      const wSsr = GACHA_RARITIES.SSR.weight;
      const wSr = GACHA_RARITIES.SR.weight;
      const wR = GACHA_RARITIES.R.weight;
      rarity = roll < wSsr ? 'SSR' : roll < wSsr + wSr ? 'SR' : roll < wSsr + wSr + wR ? 'R' : 'N';
      if ((rarity === 'N' || rarity === 'R') && this.gachaPity >= GACHA_PITY_SR - 1) {
        rarity = r01() < wSsr / (wSsr + wSr) ? 'SSR' : 'SR';
        pity = 'sr';
      }
    }
    const pool = GACHA_SKIN_ORDER.filter((sid) => GACHA_SKINS[sid].rarity === rarity);
    const id = pool[Math.min(pool.length - 1, Math.floor(r01() * pool.length))];
    this.gachaPity = rarity === 'SR' || rarity === 'SSR' ? 0 : Math.min(GACHA_PITY_SR - 1, this.gachaPity + 1);
    this.gachaSsrPity = rarity === 'SSR' ? 0 : Math.min(GACHA_PITY_SSR - 1, this.gachaSsrPity + 1);
    this.totalGachaRolls += 1;
    const isNew = !this.ownedGachaSkins.includes(id);
    let dupCoins = 0;
    if (isNew) {
      this.ownedGachaSkins.push(id);
    } else {
      dupCoins = GACHA_RARITIES[rarity].dupCoins;
      this.gold += dupCoins;
    }
    return { id, rarity, isNew, dupCoins, pity };
  }

  /** Pays for and performs 1 or 10 pulls (熔岩晶核 or coins), then saves. */
  public rollGacha(
    count: 1 | 10,
    payWith: 'core' | 'gold',
    rng: () => number = Math.random
  ): {
    ok: boolean;
    reason: string;
    spentCurrency: 'core' | 'gold' | 'none';
    spentAmount: number;
    results: GachaRollResult[];
    totalDupCoins: number;
    newCount: number;
  } {
    const n: 1 | 10 = count === 10 ? 10 : 1;
    const cost = this.getGachaRollCost(n);
    if (payWith === 'core' ? !cost.canAffordCores : !cost.canAffordGold) {
      return {
        ok: false,
        reason: payWith === 'core' ? '熔岩晶核不足' : '金币不足',
        spentCurrency: 'none',
        spentAmount: 0,
        results: [],
        totalDupCoins: 0,
        newCount: 0,
      };
    }
    let spentAmount: number;
    if (payWith === 'core') {
      this.lifetimeLavaCores = Math.max(this.lifetimeLavaCores, this.lavaCores);
      this.lavaCores = Math.max(0, this.lavaCores - cost.cores);
      spentAmount = cost.cores;
    } else {
      this.gold = Math.max(0, this.gold - cost.gold);
      spentAmount = cost.gold;
    }
    const results: GachaRollResult[] = [];
    for (let i = 0; i < n; i++) results.push(this.pullGachaOnce(rng));
    this.save();
    return {
      ok: true,
      reason: '',
      spentCurrency: payWith,
      spentAmount,
      results,
      totalDupCoins: results.reduce((sum, r) => sum + r.dupCoins, 0),
      newCount: results.filter((r) => r.isNew).length,
    };
  }

  /** Equips an owned gacha skin (null = remove the skin and show the plain colorway). */
  public equipGachaSkin(id: GachaSkinId | null): boolean {
    if (id === null) {
      if (this.equippedGachaSkin === null) return false;
      this.equippedGachaSkin = null;
      this.save();
      return true;
    }
    if (!GACHA_SKINS[id] || !this.ownedGachaSkins.includes(id)) return false;
    this.equippedGachaSkin = id;
    this.save();
    return true;
  }

  // ============================================================================
  // MC-14: Asteroid Belt Shield Breakout (星尘徽章) & Themed Lobby Decoration Hall
  // ============================================================================

  /** 星尘徽章 milestone ladder (lifetime count, so badges spent on lobby decor never drop a tier). */
  public getStardustMilestoneBonus(badgesOverride?: number): {
    effectiveBadges: number;
    tier: number;
    rankTitle: string;
    accentColor: string;
    fireRateMult: number;
    shieldBonusSec: number;
    asteroidBonusBobos: number;
    nextThreshold: number;
    summaryText: string;
  } {
    const rawBadges =
      typeof badgesOverride === 'number'
        ? Math.max(0, Math.floor(badgesOverride))
        : Math.max(0, Math.floor(Math.max(this.stardustBadges, this.lifetimeStardustBadges)));
    const capped = Math.min(24, rawBadges);
    const fireRateMult = 1 + capped * 0.003;
    const asteroidBonusBobos = Math.floor(capped / 3);
    let tier = 0;
    let rankTitle = '见习星尘领航员';
    let accentColor = '#c4b5fd';
    let nextThreshold = 3;
    if (rawBadges >= 16) {
      tier = 3;
      rankTitle = '黄金星际突围王';
      accentColor = '#facc15';
      nextThreshold = 0;
    } else if (rawBadges >= 8) {
      tier = 2;
      rankTitle = '白银陨石带猎手';
      accentColor = '#e2e8f0';
      nextThreshold = 16;
    } else if (rawBadges >= 3) {
      tier = 1;
      rankTitle = '青铜星尘领航员';
      accentColor = '#a78bfa';
      nextThreshold = 8;
    }
    const shieldBonusSec = tier * 0.5;
    const firePct = Math.round((fireRateMult - 1) * 1000) / 10;
    return {
      effectiveBadges: rawBadges,
      tier,
      rankTitle,
      accentColor,
      fireRateMult,
      shieldBonusSec,
      asteroidBonusBobos,
      nextThreshold,
      summaryText:
        rawBadges > 0
          ? `${rankTitle} · 母炮射速+${firePct}% · 突围起步波波+${asteroidBonusBobos} · 护盾+${shieldBonusSec.toFixed(1)}s`
          : `${rankTitle} · 收集星尘徽章解锁全局射速/突围起步加成`,
    };
  }

  /** Allocation-free 星尘徽章 milestone cannon fire-rate multiplier (hot path). */
  public getStardustFireMult(): number {
    return 1 + Math.min(24, Math.max(0, Math.floor(Math.max(this.stardustBadges, this.lifetimeStardustBadges)))) * 0.003;
  }

  public getAsteroidDashSpec(clearsOverride?: number): {
    asteroidTier: number;
    title: string;
    subtitle: string;
    badgeRewardBase: number;
    coinsRewardBase: number;
  } {
    const clears = Math.max(0, Math.floor(clearsOverride ?? this.asteroidDashClears));
    const asteroidTier = Math.min(8, 1 + clears);
    return {
      asteroidTier,
      title: `星际陨石带护盾突围 · 第 ${asteroidTier} 阶`,
      subtitle: '低重力星轨漂浮突进 · 躲陨石落点与陨石带 · 穿护盾充能门 · 冲进跃迁门',
      badgeRewardBase: 2 + Math.min(3, Math.floor((asteroidTier + 1) / 2)),
      coinsRewardBase: 420 + (asteroidTier - 1) * 90,
    };
  }

  /**
   * Settles one asteroid dash run. Victory badges = tier base + finish-time bonus (>=30% / >=15% of the limit left ->
   * +2 / +1) + survivor bonus (+1 per 15 Bobos, max +4). Defeats keep a consolation badge per 45% of the course (max 2).
   */
  public recordAsteroidDashResult(
    victory: boolean,
    finishSec: number,
    timeLimitSec: number,
    survivors: number,
    bobosLost: number,
    shieldBlocks: number,
    progressPct: number
  ): {
    victory: boolean;
    asteroidTierCleared: number;
    badgesAwarded: number;
    timeBonusBadges: number;
    survivorBonusBadges: number;
    coinsAwarded: number;
    milestoneBonusCoins: number;
    milestoneReached: boolean;
    milestoneRankTitle: string;
    totalClears: number;
    totalBadges: number;
    isNewSpeedRecord: boolean;
  } {
    const safeLimit = Math.max(1, Number.isFinite(timeLimitSec) ? timeLimitSec : 1);
    const safeFinish = Math.max(0, Math.min(3600, Number.isFinite(finishSec) ? finishSec : safeLimit));
    const safeSurv = Math.max(0, Math.min(600, Math.floor(Number.isFinite(survivors) ? survivors : 0)));
    const safeLost = Math.max(0, Math.min(9999, Math.floor(Number.isFinite(bobosLost) ? bobosLost : 0)));
    const safeBlocks = Math.max(0, Math.min(999, Math.floor(Number.isFinite(shieldBlocks) ? shieldBlocks : 0)));
    const safePct = Math.max(0, Math.min(100, Number.isFinite(progressPct) ? progressPct : 0));
    const spec = this.getAsteroidDashSpec();
    const tierBefore = this.getStardustMilestoneBonus().tier;

    this.totalAsteroidShieldBlocks = Math.min(9999999, this.totalAsteroidShieldBlocks + safeBlocks);
    this.totalAsteroidBobosLost = Math.min(9999999, this.totalAsteroidBobosLost + safeLost);

    let badgesAwarded: number;
    let coinsAwarded: number;
    let timeBonusBadges = 0;
    let survivorBonusBadges = 0;
    let isNewSpeedRecord = false;
    if (victory) {
      const timeLeftRatio = Math.max(0, Math.min(1, (safeLimit - safeFinish) / safeLimit));
      timeBonusBadges = timeLeftRatio >= 0.3 ? 2 : timeLeftRatio >= 0.15 ? 1 : 0;
      survivorBonusBadges = Math.min(4, Math.floor(safeSurv / 15));
      badgesAwarded = spec.badgeRewardBase + timeBonusBadges + survivorBonusBadges;
      coinsAwarded = Math.round(spec.coinsRewardBase + safeSurv * 4 + Math.max(0, safeLimit - safeFinish) * 10);
      this.asteroidDashClears = Math.min(99999, this.asteroidDashClears + 1);
      this.bestAsteroidSurvivors = Math.max(this.bestAsteroidSurvivors, safeSurv);
      if (safeFinish > 0 && (this.bestAsteroidFinishSec <= 0 || safeFinish < this.bestAsteroidFinishSec)) {
        this.bestAsteroidFinishSec = Number(safeFinish.toFixed(1));
        isNewSpeedRecord = true;
      }
    } else {
      badgesAwarded = Math.min(2, Math.floor(safePct / 45));
      coinsAwarded = Math.round(safePct * 3 + safeSurv * 2);
    }

    this.stardustBadges = Math.min(99999, this.stardustBadges + badgesAwarded);
    this.lifetimeStardustBadges = Math.min(99999, Math.max(this.lifetimeStardustBadges + badgesAwarded, this.stardustBadges));
    const milestoneAfter = this.getStardustMilestoneBonus();
    const milestoneReached = milestoneAfter.tier > tierBefore;
    const milestoneBonusCoins = milestoneReached ? 250 * milestoneAfter.tier : 0;
    this.gold += coinsAwarded + milestoneBonusCoins;
    this.save();

    return {
      victory,
      asteroidTierCleared: spec.asteroidTier,
      badgesAwarded,
      timeBonusBadges,
      survivorBonusBadges,
      coinsAwarded,
      milestoneBonusCoins,
      milestoneReached,
      milestoneRankTitle: milestoneAfter.rankTitle,
      totalClears: this.asteroidDashClears,
      totalBadges: this.stardustBadges,
      isNewSpeedRecord,
    };
  }

  // ---------------------------------------------------------------------------
  // Themed lobby decoration hall
  // ---------------------------------------------------------------------------

  public getActiveDecorThemeSpec(): DecorThemeSpec {
    const id = this.ownedDecorThemes.includes(this.activeDecorTheme) ? this.activeDecorTheme : 'navy_classic';
    return DECOR_THEMES[id] || DECOR_THEMES.navy_classic;
  }

  public getDecorCurrencyAmount(cur: DecorCurrency): number {
    switch (cur) {
      case 'stardust':
        return Math.max(0, Math.floor(this.stardustBadges));
      case 'lava':
        return Math.max(0, Math.floor(this.lavaCores));
      case 'ice':
        return Math.max(0, Math.floor(this.iceMedals));
      default:
        return Math.max(0, Math.floor(this.gold));
    }
  }

  /** Spends a decor price; mode currencies keep their lifetime counter (milestones / trophies never drop). */
  private spendDecorCurrency(cur: DecorCurrency, cost: number): boolean {
    const price = Math.max(0, Math.floor(cost));
    if (this.getDecorCurrencyAmount(cur) < price) return false;
    if (cur === 'stardust') {
      this.lifetimeStardustBadges = Math.max(this.lifetimeStardustBadges, this.stardustBadges);
      this.stardustBadges = Math.max(0, this.stardustBadges - price);
    } else if (cur === 'lava') {
      this.lifetimeLavaCores = Math.max(this.lifetimeLavaCores, this.lavaCores);
      this.lavaCores = Math.max(0, this.lavaCores - price);
    } else if (cur === 'ice') {
      this.lifetimeIceMedals = Math.max(this.lifetimeIceMedals, this.iceMedals);
      this.iceMedals = Math.max(0, this.iceMedals - price);
    } else {
      this.gold = Math.max(0, this.gold - price);
    }
    return true;
  }

  /** Buys a lobby theme (and applies it right away). */
  public buyDecorTheme(id: DecorThemeId): { ok: boolean; reason: string; spentCurrency: DecorCurrency | 'none'; spentAmount: number } {
    const spec = DECOR_THEMES[id];
    if (!spec) return { ok: false, reason: '未知主题', spentCurrency: 'none', spentAmount: 0 };
    if (this.ownedDecorThemes.includes(id)) return { ok: false, reason: '已拥有', spentCurrency: 'none', spentAmount: 0 };
    if (!this.spendDecorCurrency(spec.currency, spec.cost)) {
      return { ok: false, reason: `${DECOR_CURRENCY_LABEL[spec.currency]}不足`, spentCurrency: 'none', spentAmount: 0 };
    }
    this.ownedDecorThemes.push(id);
    this.activeDecorTheme = id;
    this.save();
    return { ok: true, reason: '', spentCurrency: spec.currency, spentAmount: spec.cost };
  }

  public applyDecorTheme(id: DecorThemeId): boolean {
    if (!DECOR_THEMES[id] || !this.ownedDecorThemes.includes(id) || this.activeDecorTheme === id) return false;
    this.activeDecorTheme = id;
    this.save();
    return true;
  }

  /** Buys a decor prop and places it in the first free lobby corner (if any). */
  public buyDecorProp(id: DecorPropId): {
    ok: boolean;
    reason: string;
    spentCurrency: DecorCurrency | 'none';
    spentAmount: number;
    placedSlot: number;
  } {
    const spec = DECOR_PROPS[id];
    if (!spec) return { ok: false, reason: '未知摆件', spentCurrency: 'none', spentAmount: 0, placedSlot: -1 };
    if (this.ownedDecorProps.includes(id)) return { ok: false, reason: '已拥有', spentCurrency: 'none', spentAmount: 0, placedSlot: -1 };
    if (!this.spendDecorCurrency(spec.currency, spec.cost)) {
      return { ok: false, reason: `${DECOR_CURRENCY_LABEL[spec.currency]}不足`, spentCurrency: 'none', spentAmount: 0, placedSlot: -1 };
    }
    this.ownedDecorProps.push(id);
    const free = this.decorSlots.findIndex((p) => p === null);
    if (free >= 0) this.decorSlots[free] = id;
    this.save();
    return { ok: true, reason: '', spentCurrency: spec.currency, spentAmount: spec.cost, placedSlot: free };
  }

  /** Places an owned prop into a lobby corner (moving it if it already stands elsewhere); null clears the corner. */
  public placeDecorProp(slotIndex: number, id: DecorPropId | null): boolean {
    if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= DECOR_SLOT_COUNT) return false;
    if (id === null) {
      if (this.decorSlots[slotIndex] === null) return false;
      this.decorSlots[slotIndex] = null;
      this.save();
      return true;
    }
    if (!DECOR_PROPS[id] || !this.ownedDecorProps.includes(id)) return false;
    if (this.decorSlots[slotIndex] === id) return false;
    for (let i = 0; i < DECOR_SLOT_COUNT; i++) if (this.decorSlots[i] === id) this.decorSlots[i] = null;
    this.decorSlots[slotIndex] = id;
    this.save();
    return true;
  }

  public getDecorPropSlot(id: DecorPropId): number {
    return this.decorSlots.indexOf(id);
  }

  /** Comfort = active theme comfort + comfort of every placed (owned) prop. */
  public getDecorComfort(): number {
    let comfort = this.getActiveDecorThemeSpec().comfort;
    for (let i = 0; i < DECOR_SLOT_COUNT; i++) {
      const pid = this.decorSlots[i];
      if (pid && DECOR_PROPS[pid] && this.ownedDecorProps.includes(pid)) comfort += DECOR_PROPS[pid].comfort;
    }
    return comfort;
  }

  public getDecorGoldMult(): number {
    return 1 + Math.min(DECOR_COMFORT_GOLD_CAP, this.getDecorComfort() * DECOR_COMFORT_GOLD_PER_POINT);
  }

  public getDecorHallSummary(): {
    theme: DecorThemeSpec;
    comfort: number;
    bonusPct: number;
    placedCount: number;
    ownedThemes: number;
    ownedProps: number;
    summaryText: string;
  } {
    const theme = this.getActiveDecorThemeSpec();
    const comfort = this.getDecorComfort();
    const bonusPct = Math.round((this.getDecorGoldMult() - 1) * 1000) / 10;
    const placedCount = this.decorSlots.filter((p) => p !== null).length;
    return {
      theme,
      comfort,
      bonusPct,
      placedCount,
      ownedThemes: this.ownedDecorThemes.length,
      ownedProps: this.ownedDecorProps.length,
      summaryText: `${theme.name} · 摆件 ${placedCount}/${DECOR_SLOT_COUNT} · 舒适度 ${comfort} · 金币 +${bonusPct}%`,
    };
  }

  // ============================================================================
  // MC-15: Haunted Castle Pumpkin Night (南瓜灯徽章) & Bobo Squad Tactic Deck
  // ============================================================================

  /** 南瓜灯徽章 milestone ladder (lifetime count, so badges spent on tactic cards never drop a tier). */
  public getPumpkinMilestoneBonus(badgesOverride?: number): {
    effectiveBadges: number;
    tier: number;
    rankTitle: string;
    accentColor: string;
    startBonusBobos: number;
    lightBonus: number;
    nextThreshold: number;
    summaryText: string;
  } {
    const rawBadges =
      typeof badgesOverride === 'number'
        ? Math.max(0, Math.floor(badgesOverride))
        : Math.max(0, Math.floor(Math.max(this.pumpkinBadges, this.lifetimePumpkinBadges)));
    const capped = Math.min(24, rawBadges);
    const startBonusBobos = Math.floor(capped / 3);
    let tier = 0;
    let rankTitle = '见习南瓜灯童';
    let accentColor = '#fdba74';
    let nextThreshold = 3;
    if (rawBadges >= 16) {
      tier = 3;
      rankTitle = '黄金南瓜灯王';
      accentColor = '#facc15';
      nextThreshold = 0;
    } else if (rawBadges >= 8) {
      tier = 2;
      rankTitle = '白银古堡守夜人';
      accentColor = '#e2e8f0';
      nextThreshold = 16;
    } else if (rawBadges >= 3) {
      tier = 1;
      rankTitle = '青铜驱灵灯童';
      accentColor = '#fb923c';
      nextThreshold = 8;
    }
    const lightBonus = tier * 10;
    return {
      effectiveBadges: rawBadges,
      tier,
      rankTitle,
      accentColor,
      startBonusBobos,
      lightBonus,
      nextThreshold,
      summaryText:
        rawBadges > 0
          ? `${rankTitle} · 起步波波+${startBonusBobos} · 灯光上限+${lightBonus}`
          : `${rankTitle} · 收集南瓜灯徽章解锁起步波波 / 灯光上限加成`,
    };
  }

  public getPumpkinNightSpec(clearsOverride?: number): {
    pumpkinTier: number;
    title: string;
    subtitle: string;
    badgeRewardBase: number;
    coinsRewardBase: number;
  } {
    const clears = Math.max(0, Math.floor(clearsOverride ?? this.pumpkinNightClears));
    const pumpkinTier = Math.min(8, 1 + clears);
    return {
      pumpkinTier,
      title: `幽灵古堡南瓜夜 · 第 ${pumpkinTier} 阶`,
      subtitle: '夜色古堡赛道 · 南瓜灯照明区补光驱鬼 · 躲穿墙幽灵 · 限时冲出城门',
      badgeRewardBase: 2 + Math.min(3, Math.floor((pumpkinTier + 1) / 2)),
      coinsRewardBase: 440 + (pumpkinTier - 1) * 90,
    };
  }

  /**
   * Settles one pumpkin-night run. Victory badges = tier base + finish-time bonus (>=30% / >=15% of the limit left ->
   * +2 / +1) + survivor bonus (+1 per 15 Bobos, max +3) + dispel bonus (+1 per 3 ghosts dispelled, max +2).
   * Defeats keep a consolation badge per 45% of the course (max 2).
   */
  public recordPumpkinNightResult(
    victory: boolean,
    finishSec: number,
    timeLimitSec: number,
    survivors: number,
    bobosLost: number,
    ghostsDispelled: number,
    progressPct: number
  ): {
    victory: boolean;
    pumpkinTierCleared: number;
    badgesAwarded: number;
    timeBonusBadges: number;
    survivorBonusBadges: number;
    dispelBonusBadges: number;
    coinsAwarded: number;
    milestoneBonusCoins: number;
    milestoneReached: boolean;
    milestoneRankTitle: string;
    totalClears: number;
    totalBadges: number;
    isNewSpeedRecord: boolean;
  } {
    const safeLimit = Math.max(1, Number.isFinite(timeLimitSec) ? timeLimitSec : 1);
    const safeFinish = Math.max(0, Math.min(3600, Number.isFinite(finishSec) ? finishSec : safeLimit));
    const safeSurv = Math.max(0, Math.min(600, Math.floor(Number.isFinite(survivors) ? survivors : 0)));
    const safeLost = Math.max(0, Math.min(9999, Math.floor(Number.isFinite(bobosLost) ? bobosLost : 0)));
    const safeDispel = Math.max(0, Math.min(999, Math.floor(Number.isFinite(ghostsDispelled) ? ghostsDispelled : 0)));
    const safePct = Math.max(0, Math.min(100, Number.isFinite(progressPct) ? progressPct : 0));
    const spec = this.getPumpkinNightSpec();
    const tierBefore = this.getPumpkinMilestoneBonus().tier;

    this.totalPumpkinGhostsDispelled = Math.min(9999999, this.totalPumpkinGhostsDispelled + safeDispel);
    this.totalPumpkinBobosLost = Math.min(9999999, this.totalPumpkinBobosLost + safeLost);

    let badgesAwarded: number;
    let coinsAwarded: number;
    let timeBonusBadges = 0;
    let survivorBonusBadges = 0;
    let dispelBonusBadges = 0;
    let isNewSpeedRecord = false;
    if (victory) {
      const timeLeftRatio = Math.max(0, Math.min(1, (safeLimit - safeFinish) / safeLimit));
      timeBonusBadges = timeLeftRatio >= 0.3 ? 2 : timeLeftRatio >= 0.15 ? 1 : 0;
      survivorBonusBadges = Math.min(3, Math.floor(safeSurv / 15));
      dispelBonusBadges = Math.min(2, Math.floor(safeDispel / 3));
      badgesAwarded = spec.badgeRewardBase + timeBonusBadges + survivorBonusBadges + dispelBonusBadges;
      coinsAwarded = Math.round(spec.coinsRewardBase + safeSurv * 4 + Math.max(0, safeLimit - safeFinish) * 10 + safeDispel * 15);
      this.pumpkinNightClears = Math.min(99999, this.pumpkinNightClears + 1);
      this.bestPumpkinSurvivors = Math.max(this.bestPumpkinSurvivors, safeSurv);
      if (safeFinish > 0 && (this.bestPumpkinFinishSec <= 0 || safeFinish < this.bestPumpkinFinishSec)) {
        this.bestPumpkinFinishSec = Number(safeFinish.toFixed(1));
        isNewSpeedRecord = true;
      }
    } else {
      badgesAwarded = Math.min(2, Math.floor(safePct / 45));
      coinsAwarded = Math.round(safePct * 3 + safeSurv * 2);
    }

    this.pumpkinBadges = Math.min(99999, this.pumpkinBadges + badgesAwarded);
    this.lifetimePumpkinBadges = Math.min(99999, Math.max(this.lifetimePumpkinBadges + badgesAwarded, this.pumpkinBadges));
    const milestoneAfter = this.getPumpkinMilestoneBonus();
    const milestoneReached = milestoneAfter.tier > tierBefore;
    const milestoneBonusCoins = milestoneReached ? 250 * milestoneAfter.tier : 0;
    this.gold += coinsAwarded + milestoneBonusCoins;
    this.save();

    return {
      victory,
      pumpkinTierCleared: spec.pumpkinTier,
      badgesAwarded,
      timeBonusBadges,
      survivorBonusBadges,
      dispelBonusBadges,
      coinsAwarded,
      milestoneBonusCoins,
      milestoneReached,
      milestoneRankTitle: milestoneAfter.rankTitle,
      totalClears: this.pumpkinNightClears,
      totalBadges: this.pumpkinBadges,
      isNewSpeedRecord,
    };
  }

  // ---------------------------------------------------------------------------
  // Tactic deck: cards unlocked with coins / mode currencies, 3 equipped before a match
  // ---------------------------------------------------------------------------

  public getTacticCurrencyAmount(cur: TacticCurrency): number {
    switch (cur) {
      case 'train':
        return Math.max(0, Math.floor(this.trainGoldMedals));
      case 'pearl':
        return Math.max(0, Math.floor(this.deepPearls));
      case 'ice':
        return Math.max(0, Math.floor(this.iceMedals));
      case 'lava':
        return Math.max(0, Math.floor(this.lavaCores));
      case 'stardust':
        return Math.max(0, Math.floor(this.stardustBadges));
      case 'pumpkin':
        return Math.max(0, Math.floor(this.pumpkinBadges));
      default:
        return Math.max(0, Math.floor(this.gold));
    }
  }

  /** Spends a card price; mode currencies keep their lifetime counter (milestones / trophies never drop). */
  private spendTacticCurrency(cur: TacticCurrency, cost: number): boolean {
    const price = Math.max(0, Math.floor(cost));
    if (this.getTacticCurrencyAmount(cur) < price) return false;
    switch (cur) {
      case 'train':
        this.lifetimeTrainGoldMedals = Math.max(this.lifetimeTrainGoldMedals, this.trainGoldMedals);
        this.trainGoldMedals = Math.max(0, this.trainGoldMedals - price);
        break;
      case 'pearl':
        this.lifetimeDeepPearls = Math.max(this.lifetimeDeepPearls, this.deepPearls);
        this.deepPearls = Math.max(0, this.deepPearls - price);
        break;
      case 'ice':
        this.lifetimeIceMedals = Math.max(this.lifetimeIceMedals, this.iceMedals);
        this.iceMedals = Math.max(0, this.iceMedals - price);
        break;
      case 'lava':
        this.lifetimeLavaCores = Math.max(this.lifetimeLavaCores, this.lavaCores);
        this.lavaCores = Math.max(0, this.lavaCores - price);
        break;
      case 'stardust':
        this.lifetimeStardustBadges = Math.max(this.lifetimeStardustBadges, this.stardustBadges);
        this.stardustBadges = Math.max(0, this.stardustBadges - price);
        break;
      case 'pumpkin':
        this.lifetimePumpkinBadges = Math.max(this.lifetimePumpkinBadges, this.pumpkinBadges);
        this.pumpkinBadges = Math.max(0, this.pumpkinBadges - price);
        break;
      default:
        this.gold = Math.max(0, this.gold - price);
    }
    return true;
  }

  /** Unlocks a tactic card and drops it into the first free deck slot (if any). */
  public buyTacticCard(id: TacticCardId): {
    ok: boolean;
    reason: string;
    spentCurrency: TacticCurrency | 'none';
    spentAmount: number;
    equippedSlot: number;
  } {
    const spec = TACTIC_CARDS[id];
    if (!spec) return { ok: false, reason: '未知战术卡', spentCurrency: 'none', spentAmount: 0, equippedSlot: -1 };
    if (this.ownedTacticCards.includes(id)) return { ok: false, reason: '已解锁', spentCurrency: 'none', spentAmount: 0, equippedSlot: -1 };
    if (!this.spendTacticCurrency(spec.currency, spec.cost)) {
      return { ok: false, reason: `${TACTIC_CURRENCY_LABEL[spec.currency]}不足`, spentCurrency: 'none', spentAmount: 0, equippedSlot: -1 };
    }
    this.ownedTacticCards.push(id);
    const free = this.tacticDeck.findIndex((c) => c === null);
    if (free >= 0) this.tacticDeck[free] = id;
    this.save();
    return { ok: true, reason: '', spentCurrency: spec.currency, spentAmount: spec.cost, equippedSlot: free };
  }

  /** Puts an owned card into deck slot `slotIndex` (moving it if it sits elsewhere); null empties the slot. */
  public equipTacticCard(slotIndex: number, id: TacticCardId | null): boolean {
    if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= TACTIC_DECK_SIZE) return false;
    if (id === null) {
      if (this.tacticDeck[slotIndex] === null) return false;
      this.tacticDeck[slotIndex] = null;
      this.save();
      return true;
    }
    if (!TACTIC_CARDS[id] || !this.ownedTacticCards.includes(id)) return false;
    if (this.tacticDeck[slotIndex] === id) return false;
    for (let i = 0; i < TACTIC_DECK_SIZE; i++) if (this.tacticDeck[i] === id) this.tacticDeck[i] = null;
    this.tacticDeck[slotIndex] = id;
    this.save();
    return true;
  }

  /** Equips an owned card into the first free slot, or takes it out if it is already in the deck. */
  public toggleTacticCard(id: TacticCardId): { ok: boolean; equipped: boolean; slot: number; reason: string } {
    if (!TACTIC_CARDS[id] || !this.ownedTacticCards.includes(id)) return { ok: false, equipped: false, slot: -1, reason: '未解锁' };
    const at = this.tacticDeck.indexOf(id);
    if (at >= 0) {
      this.tacticDeck[at] = null;
      this.save();
      return { ok: true, equipped: false, slot: at, reason: '' };
    }
    const free = this.tacticDeck.findIndex((c) => c === null);
    if (free < 0) return { ok: false, equipped: false, slot: -1, reason: `卡组已满 ${TACTIC_DECK_SIZE}/${TACTIC_DECK_SIZE}` };
    this.tacticDeck[free] = id;
    this.save();
    return { ok: true, equipped: true, slot: free, reason: '' };
  }

  /** The owned cards currently equipped, in slot order (unknown / unowned / duplicate entries are skipped). */
  public getEquippedTacticCards(): TacticCardSpec[] {
    const out: TacticCardSpec[] = [];
    const seen = new Set<TacticCardId>();
    for (let i = 0; i < TACTIC_DECK_SIZE; i++) {
      const id = this.tacticDeck[i];
      if (!id || seen.has(id) || !TACTIC_CARDS[id] || !this.ownedTacticCards.includes(id)) continue;
      seen.add(id);
      out.push(TACTIC_CARDS[id]);
    }
    return out;
  }

  public getTacticDeckSummary(): { equipped: number; owned: number; summaryText: string } {
    const cards = this.getEquippedTacticCards();
    return {
      equipped: cards.length,
      owned: this.ownedTacticCards.length,
      summaryText:
        cards.length > 0
          ? `出战卡组 ${cards.length}/${TACTIC_DECK_SIZE}：${cards.map((c) => c.name).join(' · ')}`
          : `出战卡组 0/${TACTIC_DECK_SIZE}：解锁战术卡后编入卡组`,
    };
  }

  public recordTacticTriggers(n: number): void {
    const add = Math.max(0, Math.min(TACTIC_DECK_SIZE, Math.floor(Number.isFinite(n) ? n : 0)));
    if (add <= 0) return;
    this.totalTacticTriggers = Math.min(9999999, this.totalTacticTriggers + add);
  }

  // ============================================================================
  // MC-16: Tactic deck balance (main-campaign coefficient / switch) & Desert Pyramid Trap Run (圣甲虫徽章)
  // ============================================================================

  /**
   * Effect profile of the tactic deck for a match: main-campaign stages run at TACTIC_CAMPAIGN_EFFECT_MULT (or not at
   * all when the campaign switch is off); every lobby mode keeps ×1.0.
   */
  public getTacticEffectProfile(isCampaign: boolean): TacticEffectProfile {
    if (!isCampaign) {
      return {
        isCampaign: false,
        enabled: true,
        mult: 1,
        shieldCap: TACTIC_SHIELD_CAP,
        crowdCap: TACTIC_CROWD_CAP,
        rushCap: TACTIC_RUSH_CAP,
        label: '大厅模式 ×1.0',
      };
    }
    const mult = TACTIC_CAMPAIGN_EFFECT_MULT;
    return {
      isCampaign: true,
      enabled: this.tacticCampaignEnabled,
      mult,
      shieldCap: scaleTacticValue(TACTIC_SHIELD_CAP, mult, true),
      crowdCap: scaleTacticValue(TACTIC_CROWD_CAP, mult, true),
      rushCap: scaleTacticValue(TACTIC_RUSH_CAP, mult, false),
      label: this.tacticCampaignEnabled ? `主线战役 ×${mult.toFixed(1)}` : '主线战役 已关闭',
    };
  }

  /** Turns the tactic deck on / off for main-campaign stages (lobby modes are unaffected). */
  public setTacticCampaignEnabled(on: boolean): boolean {
    const next = Boolean(on);
    if (next === this.tacticCampaignEnabled) return false;
    this.tacticCampaignEnabled = next;
    this.save();
    return true;
  }

  /** 圣甲虫徽章 milestone ladder (lifetime count): start Bobos + extra seconds on the tomb countdown. */
  public getScarabMilestoneBonus(badgesOverride?: number): {
    effectiveBadges: number;
    tier: number;
    rankTitle: string;
    accentColor: string;
    startBonusBobos: number;
    timeBonusSec: number;
    nextThreshold: number;
    summaryText: string;
  } {
    const rawBadges =
      typeof badgesOverride === 'number'
        ? Math.max(0, Math.floor(badgesOverride))
        : Math.max(0, Math.floor(Math.max(this.scarabBadges, this.lifetimeScarabBadges)));
    const capped = Math.min(24, rawBadges);
    const startBonusBobos = Math.floor(capped / 3);
    let tier = 0;
    let rankTitle = '见习寻宝学徒';
    let accentColor = '#fde68a';
    let nextThreshold = 3;
    if (rawBadges >= 16) {
      tier = 3;
      rankTitle = '黄金太阳圣甲虫王';
      accentColor = '#facc15';
      nextThreshold = 0;
    } else if (rawBadges >= 8) {
      tier = 2;
      rankTitle = '白银法老卫士';
      accentColor = '#e2e8f0';
      nextThreshold = 16;
    } else if (rawBadges >= 3) {
      tier = 1;
      rankTitle = '青铜圣甲虫护卫';
      accentColor = '#d97706';
      nextThreshold = 8;
    }
    const timeBonusSec = tier * 2;
    return {
      effectiveBadges: rawBadges,
      tier,
      rankTitle,
      accentColor,
      startBonusBobos,
      timeBonusSec,
      nextThreshold,
      summaryText:
        rawBadges > 0
          ? `${rankTitle} · 起步波波+${startBonusBobos} · 限时+${timeBonusSec}s`
          : `${rankTitle} · 收集圣甲虫徽章解锁起步波波 / 限时加成`,
    };
  }

  public getPyramidRunSpec(clearsOverride?: number): {
    pyramidTier: number;
    title: string;
    subtitle: string;
    badgeRewardBase: number;
    coinsRewardBase: number;
  } {
    const clears = Math.max(0, Math.floor(clearsOverride ?? this.pyramidRunClears));
    const pyramidTier = Math.min(8, 1 + clears);
    return {
      pyramidTier,
      title: `沙漠金字塔机关跑酷 · 第 ${pyramidTier} 阶`,
      subtitle: '金字塔墓道赛道 · 踩石板路过流沙 · 躲开翻转石板 · 限时冲出墓道',
      badgeRewardBase: 2 + Math.min(3, Math.floor((pyramidTier + 1) / 2)),
      coinsRewardBase: 460 + (pyramidTier - 1) * 90,
    };
  }

  /**
   * Settles one pyramid run. Victory badges = tier base + finish-time bonus (>=30% / >=15% of the limit left -> +2 /
   * +1) + survivor bonus (+1 per 15 Bobos, max +3) + trap bonus (+1 per 3 traps crossed without a loss, max +2).
   * Defeats keep a consolation badge per 45% of the course (max 2).
   */
  public recordPyramidRunResult(
    victory: boolean,
    finishSec: number,
    timeLimitSec: number,
    survivors: number,
    bobosLost: number,
    trapsDodged: number,
    progressPct: number
  ): {
    victory: boolean;
    pyramidTierCleared: number;
    badgesAwarded: number;
    timeBonusBadges: number;
    survivorBonusBadges: number;
    trapBonusBadges: number;
    coinsAwarded: number;
    milestoneBonusCoins: number;
    milestoneReached: boolean;
    milestoneRankTitle: string;
    totalClears: number;
    totalBadges: number;
    isNewSpeedRecord: boolean;
  } {
    const safeLimit = Math.max(1, Number.isFinite(timeLimitSec) ? timeLimitSec : 1);
    const safeFinish = Math.max(0, Math.min(3600, Number.isFinite(finishSec) ? finishSec : safeLimit));
    const safeSurv = Math.max(0, Math.min(600, Math.floor(Number.isFinite(survivors) ? survivors : 0)));
    const safeLost = Math.max(0, Math.min(9999, Math.floor(Number.isFinite(bobosLost) ? bobosLost : 0)));
    const safeDodged = Math.max(0, Math.min(999, Math.floor(Number.isFinite(trapsDodged) ? trapsDodged : 0)));
    const safePct = Math.max(0, Math.min(100, Number.isFinite(progressPct) ? progressPct : 0));
    const spec = this.getPyramidRunSpec();
    const tierBefore = this.getScarabMilestoneBonus().tier;

    this.totalPyramidTrapsDodged = Math.min(9999999, this.totalPyramidTrapsDodged + safeDodged);
    this.totalPyramidBobosLost = Math.min(9999999, this.totalPyramidBobosLost + safeLost);

    let badgesAwarded: number;
    let coinsAwarded: number;
    let timeBonusBadges = 0;
    let survivorBonusBadges = 0;
    let trapBonusBadges = 0;
    let isNewSpeedRecord = false;
    if (victory) {
      const timeLeftRatio = Math.max(0, Math.min(1, (safeLimit - safeFinish) / safeLimit));
      timeBonusBadges = timeLeftRatio >= 0.3 ? 2 : timeLeftRatio >= 0.15 ? 1 : 0;
      survivorBonusBadges = Math.min(3, Math.floor(safeSurv / 15));
      trapBonusBadges = Math.min(2, Math.floor(safeDodged / 3));
      badgesAwarded = spec.badgeRewardBase + timeBonusBadges + survivorBonusBadges + trapBonusBadges;
      coinsAwarded = Math.round(spec.coinsRewardBase + safeSurv * 4 + Math.max(0, safeLimit - safeFinish) * 10 + safeDodged * 12);
      this.pyramidRunClears = Math.min(99999, this.pyramidRunClears + 1);
      this.bestPyramidSurvivors = Math.max(this.bestPyramidSurvivors, safeSurv);
      if (safeFinish > 0 && (this.bestPyramidFinishSec <= 0 || safeFinish < this.bestPyramidFinishSec)) {
        this.bestPyramidFinishSec = Number(safeFinish.toFixed(1));
        isNewSpeedRecord = true;
      }
    } else {
      badgesAwarded = Math.min(2, Math.floor(safePct / 45));
      coinsAwarded = Math.round(safePct * 3 + safeSurv * 2);
    }

    this.scarabBadges = Math.min(99999, this.scarabBadges + badgesAwarded);
    this.lifetimeScarabBadges = Math.min(99999, Math.max(this.lifetimeScarabBadges + badgesAwarded, this.scarabBadges));
    const milestoneAfter = this.getScarabMilestoneBonus();
    const milestoneReached = milestoneAfter.tier > tierBefore;
    const milestoneBonusCoins = milestoneReached ? 250 * milestoneAfter.tier : 0;
    this.gold += coinsAwarded + milestoneBonusCoins;
    this.save();

    return {
      victory,
      pyramidTierCleared: spec.pyramidTier,
      badgesAwarded,
      timeBonusBadges,
      survivorBonusBadges,
      trapBonusBadges,
      coinsAwarded,
      milestoneBonusCoins,
      milestoneReached,
      milestoneRankTitle: milestoneAfter.rankTitle,
      totalClears: this.pyramidRunClears,
      totalBadges: this.scarabBadges,
      isNewSpeedRecord,
    };
  }

  // ============================================================================
  // MC-17: Jungle Temple Vine Swing (翡翠神像徽章)
  // ============================================================================

  /** 翡翠神像徽章 milestone ladder (lifetime count): start Bobos + extra seconds on the temple countdown. */
  public getEmeraldIdolMilestoneBonus(badgesOverride?: number): {
    effectiveBadges: number;
    tier: number;
    rankTitle: string;
    accentColor: string;
    startBonusBobos: number;
    timeBonusSec: number;
    nextThreshold: number;
    summaryText: string;
  } {
    const rawBadges =
      typeof badgesOverride === 'number'
        ? Math.max(0, Math.floor(badgesOverride))
        : Math.max(0, Math.floor(Math.max(this.emeraldIdolBadges, this.lifetimeEmeraldIdolBadges)));
    const capped = Math.min(24, rawBadges);
    const startBonusBobos = Math.floor(capped / 3);
    let tier = 0;
    let rankTitle = '见习丛林探险家';
    let accentColor = '#a7f3d0';
    let nextThreshold = 3;
    if (rawBadges >= 16) {
      tier = 3;
      rankTitle = '翡翠神像大祭司';
      accentColor = '#10b981';
      nextThreshold = 0;
    } else if (rawBadges >= 8) {
      tier = 2;
      rankTitle = '白银神庙守望者';
      accentColor = '#e2e8f0';
      nextThreshold = 16;
    } else if (rawBadges >= 3) {
      tier = 1;
      rankTitle = '青铜藤蔓探险家';
      accentColor = '#d97706';
      nextThreshold = 8;
    }
    const timeBonusSec = tier * 2;
    return {
      effectiveBadges: rawBadges,
      tier,
      rankTitle,
      accentColor,
      startBonusBobos,
      timeBonusSec,
      nextThreshold,
      summaryText:
        rawBadges > 0
          ? `${rankTitle} · 起步波波+${startBonusBobos} · 限时+${timeBonusSec}s`
          : `${rankTitle} · 收集翡翠神像徽章解锁起步波波 / 限时加成`,
    };
  }

  public getJungleSwingSpec(clearsOverride?: number): {
    jungleTier: number;
    title: string;
    subtitle: string;
    badgeRewardBase: number;
    coinsRewardBase: number;
  } {
    const clears = Math.max(0, Math.floor(clearsOverride ?? this.jungleSwingClears));
    const jungleTier = Math.min(8, 1 + clears);
    return {
      jungleTier,
      title: `丛林神庙藤蔓秋千 · 第 ${jungleTier} 阶`,
      subtitle: '丛林神庙赛道 · 对准摆动藤蔓荡过断崖 · 闪开滚石 · 限时冲出神庙',
      badgeRewardBase: 2 + Math.min(3, Math.floor((jungleTier + 1) / 2)),
      coinsRewardBase: 470 + (jungleTier - 1) * 90,
    };
  }

  /**
   * Settles one jungle vine-swing run. Victory badges = tier base + finish-time bonus (>=30% / >=15% of the limit left
   * -> +2 / +1) + survivor bonus (+1 per 15 Bobos, max +3) + trap bonus (+1 per 3 chasms / boulders crossed without a
   * loss, max +2). Defeats keep a consolation badge per 45% of the course (max 2).
   */
  public recordJungleSwingResult(
    victory: boolean,
    finishSec: number,
    timeLimitSec: number,
    survivors: number,
    bobosLost: number,
    trapsDodged: number,
    progressPct: number
  ): {
    victory: boolean;
    jungleTierCleared: number;
    badgesAwarded: number;
    timeBonusBadges: number;
    survivorBonusBadges: number;
    trapBonusBadges: number;
    coinsAwarded: number;
    milestoneBonusCoins: number;
    milestoneReached: boolean;
    milestoneRankTitle: string;
    totalClears: number;
    totalBadges: number;
    isNewSpeedRecord: boolean;
  } {
    const safeLimit = Math.max(1, Number.isFinite(timeLimitSec) ? timeLimitSec : 1);
    const safeFinish = Math.max(0, Math.min(3600, Number.isFinite(finishSec) ? finishSec : safeLimit));
    const safeSurv = Math.max(0, Math.min(600, Math.floor(Number.isFinite(survivors) ? survivors : 0)));
    const safeLost = Math.max(0, Math.min(9999, Math.floor(Number.isFinite(bobosLost) ? bobosLost : 0)));
    const safeDodged = Math.max(0, Math.min(999, Math.floor(Number.isFinite(trapsDodged) ? trapsDodged : 0)));
    const safePct = Math.max(0, Math.min(100, Number.isFinite(progressPct) ? progressPct : 0));
    const spec = this.getJungleSwingSpec();
    const tierBefore = this.getEmeraldIdolMilestoneBonus().tier;

    this.totalJungleTrapsDodged = Math.min(9999999, this.totalJungleTrapsDodged + safeDodged);
    this.totalJungleBobosLost = Math.min(9999999, this.totalJungleBobosLost + safeLost);

    let badgesAwarded: number;
    let coinsAwarded: number;
    let timeBonusBadges = 0;
    let survivorBonusBadges = 0;
    let trapBonusBadges = 0;
    let isNewSpeedRecord = false;
    if (victory) {
      const timeLeftRatio = Math.max(0, Math.min(1, (safeLimit - safeFinish) / safeLimit));
      timeBonusBadges = timeLeftRatio >= 0.3 ? 2 : timeLeftRatio >= 0.15 ? 1 : 0;
      survivorBonusBadges = Math.min(3, Math.floor(safeSurv / 15));
      trapBonusBadges = Math.min(2, Math.floor(safeDodged / 3));
      badgesAwarded = spec.badgeRewardBase + timeBonusBadges + survivorBonusBadges + trapBonusBadges;
      coinsAwarded = Math.round(
        spec.coinsRewardBase + safeSurv * 4 + Math.max(0, safeLimit - safeFinish) * 10 + safeDodged * 12
      );
      this.jungleSwingClears = Math.min(99999, this.jungleSwingClears + 1);
      this.bestJungleSurvivors = Math.max(this.bestJungleSurvivors, safeSurv);
      if (safeFinish > 0 && (this.bestJungleFinishSec <= 0 || safeFinish < this.bestJungleFinishSec)) {
        this.bestJungleFinishSec = Number(safeFinish.toFixed(1));
        isNewSpeedRecord = true;
      }
    } else {
      badgesAwarded = Math.min(2, Math.floor(safePct / 45));
      coinsAwarded = Math.round(safePct * 3 + safeSurv * 2);
    }

    this.emeraldIdolBadges = Math.min(99999, this.emeraldIdolBadges + badgesAwarded);
    this.lifetimeEmeraldIdolBadges = Math.min(
      99999,
      Math.max(this.lifetimeEmeraldIdolBadges + badgesAwarded, this.emeraldIdolBadges)
    );
    const milestoneAfter = this.getEmeraldIdolMilestoneBonus();
    const milestoneReached = milestoneAfter.tier > tierBefore;
    const milestoneBonusCoins = milestoneReached ? 250 * milestoneAfter.tier : 0;
    this.gold += coinsAwarded + milestoneBonusCoins;
    this.save();

    return {
      victory,
      jungleTierCleared: spec.jungleTier,
      badgesAwarded,
      timeBonusBadges,
      survivorBonusBadges,
      trapBonusBadges,
      coinsAwarded,
      milestoneBonusCoins,
      milestoneReached,
      milestoneRankTitle: milestoneAfter.rankTitle,
      totalClears: this.jungleSwingClears,
      totalBadges: this.emeraldIdolBadges,
      isNewSpeedRecord,
    };
  }

  // ============================================================================
  // MC-18: Pirate Plank Breakout (金骷髅徽章)
  // ============================================================================

  /** 金骷髅徽章 milestone ladder (lifetime count): start Bobos (max +8) + extra seconds on the countdown (max +6 s). */
  public getGoldSkullMilestoneBonus(badgesOverride?: number): {
    effectiveBadges: number;
    tier: number;
    rankTitle: string;
    accentColor: string;
    startBonusBobos: number;
    timeBonusSec: number;
    nextThreshold: number;
    summaryText: string;
  } {
    const rawBadges =
      typeof badgesOverride === 'number'
        ? Math.max(0, Math.floor(badgesOverride))
        : Math.max(0, Math.floor(Math.max(this.goldSkullBadges, this.lifetimeGoldSkullBadges)));
    const capped = Math.min(24, rawBadges);
    const startBonusBobos = Math.floor(capped / 3);
    let tier = 0;
    let rankTitle = '见习甲板水手';
    let accentColor = '#fde68a';
    let nextThreshold = 3;
    if (rawBadges >= 16) {
      tier = 3;
      rankTitle = '金骷髅舰队船长';
      accentColor = '#facc15';
      nextThreshold = 0;
    } else if (rawBadges >= 8) {
      tier = 2;
      rankTitle = '白银跳板大副';
      accentColor = '#e2e8f0';
      nextThreshold = 16;
    } else if (rawBadges >= 3) {
      tier = 1;
      rankTitle = '青铜炮手';
      accentColor = '#d97706';
      nextThreshold = 8;
    }
    const timeBonusSec = tier * 2;
    return {
      effectiveBadges: rawBadges,
      tier,
      rankTitle,
      accentColor,
      startBonusBobos,
      timeBonusSec,
      nextThreshold,
      summaryText:
        rawBadges > 0
          ? `${rankTitle} · 起步波波+${startBonusBobos} · 限时+${timeBonusSec}s`
          : `${rankTitle} · 收集金骷髅徽章解锁起步波波 / 限时加成`,
    };
  }

  public getPirateBoardingSpec(clearsOverride?: number): {
    pirateTier: number;
    title: string;
    badgeRewardBase: number;
    coinsRewardBase: number;
  } {
    const clears = Math.max(0, Math.floor(clearsOverride ?? this.pirateBoardingClears));
    const pirateTier = Math.min(8, 1 + clears);
    return {
      pirateTier,
      title: `海盗船跳板突围 · 第 ${pirateTier} 阶`,
      badgeRewardBase: 2 + Math.min(3, Math.floor((pirateTier + 1) / 2)),
      coinsRewardBase: 480 + (pirateTier - 1) * 90,
    };
  }

  /**
   * Settles one pirate plank run. Victory badges = tier base + finish-time bonus (>=30% / >=15% of the limit left ->
   * +2 / +1) + survivor bonus (+1 per 15 Bobos, max +3) + trap bonus (+1 per 3 sea gaps / cannonballs crossed without a
   * loss, max +2). Defeats keep a consolation badge per 45% of the course (max 2) and never cost gold.
   */
  public recordPirateBoardingResult(
    victory: boolean,
    finishSec: number,
    timeLimitSec: number,
    survivors: number,
    bobosLost: number,
    trapsDodged: number,
    progressPct: number
  ): {
    victory: boolean;
    pirateTierCleared: number;
    badgesAwarded: number;
    timeBonusBadges: number;
    survivorBonusBadges: number;
    trapBonusBadges: number;
    coinsAwarded: number;
    milestoneBonusCoins: number;
    milestoneReached: boolean;
    milestoneRankTitle: string;
    totalClears: number;
    totalBadges: number;
    isNewSpeedRecord: boolean;
  } {
    const safeLimit = Math.max(1, Number.isFinite(timeLimitSec) ? timeLimitSec : 1);
    const safeFinish = Math.max(0, Math.min(3600, Number.isFinite(finishSec) ? finishSec : safeLimit));
    const safeSurv = Math.max(0, Math.min(600, Math.floor(Number.isFinite(survivors) ? survivors : 0)));
    const safeLost = Math.max(0, Math.min(9999, Math.floor(Number.isFinite(bobosLost) ? bobosLost : 0)));
    const safeDodged = Math.max(0, Math.min(999, Math.floor(Number.isFinite(trapsDodged) ? trapsDodged : 0)));
    const safePct = Math.max(0, Math.min(100, Number.isFinite(progressPct) ? progressPct : 0));
    const spec = this.getPirateBoardingSpec();
    const tierBefore = this.getGoldSkullMilestoneBonus().tier;

    this.totalPirateTrapsDodged = Math.min(9999999, this.totalPirateTrapsDodged + safeDodged);
    this.totalPirateBobosLost = Math.min(9999999, this.totalPirateBobosLost + safeLost);

    let badgesAwarded: number;
    let coinsAwarded: number;
    let timeBonusBadges = 0;
    let survivorBonusBadges = 0;
    let trapBonusBadges = 0;
    let isNewSpeedRecord = false;
    if (victory) {
      const timeLeftRatio = Math.max(0, Math.min(1, (safeLimit - safeFinish) / safeLimit));
      timeBonusBadges = timeLeftRatio >= 0.3 ? 2 : timeLeftRatio >= 0.15 ? 1 : 0;
      survivorBonusBadges = Math.min(3, Math.floor(safeSurv / 15));
      trapBonusBadges = Math.min(2, Math.floor(safeDodged / 3));
      badgesAwarded = spec.badgeRewardBase + timeBonusBadges + survivorBonusBadges + trapBonusBadges;
      coinsAwarded = Math.round(
        spec.coinsRewardBase + safeSurv * 4 + Math.max(0, safeLimit - safeFinish) * 10 + safeDodged * 12
      );
      this.pirateBoardingClears = Math.min(99999, this.pirateBoardingClears + 1);
      this.bestPirateSurvivors = Math.max(this.bestPirateSurvivors, safeSurv);
      if (safeFinish > 0 && (this.bestPirateFinishSec <= 0 || safeFinish < this.bestPirateFinishSec)) {
        this.bestPirateFinishSec = Number(safeFinish.toFixed(1));
        isNewSpeedRecord = true;
      }
    } else {
      badgesAwarded = Math.min(2, Math.floor(safePct / 45));
      coinsAwarded = Math.round(safePct * 3 + safeSurv * 2);
    }

    this.goldSkullBadges = Math.min(99999, this.goldSkullBadges + badgesAwarded);
    this.lifetimeGoldSkullBadges = Math.min(
      99999,
      Math.max(this.lifetimeGoldSkullBadges + badgesAwarded, this.goldSkullBadges)
    );
    const milestoneAfter = this.getGoldSkullMilestoneBonus();
    const milestoneReached = milestoneAfter.tier > tierBefore;
    const milestoneBonusCoins = milestoneReached ? 250 * milestoneAfter.tier : 0;
    this.gold += coinsAwarded + milestoneBonusCoins;
    this.save();

    return {
      victory,
      pirateTierCleared: spec.pirateTier,
      badgesAwarded,
      timeBonusBadges,
      survivorBonusBadges,
      trapBonusBadges,
      coinsAwarded,
      milestoneBonusCoins,
      milestoneReached,
      milestoneRankTitle: milestoneAfter.rankTitle,
      totalClears: this.pirateBoardingClears,
      totalBadges: this.goldSkullBadges,
      isNewSpeedRecord,
    };
  }
}
