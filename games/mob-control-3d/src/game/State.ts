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
  RACE_MASCOT_ART,
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
      cannonModFireMult
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
    return base * metaMult * skillMult * skinMult * buffMult * debuffMult * sceneMult * trophyMult;
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
    return (
      (1 +
        (this.lootLevel - 1) * 0.07 +
        this.getMetaLevel('meta_bounty') * 0.04 +
        this.getBuffStack('war_plunder') * 0.07 +
        tycoonLoot +
        skinBonus) *
      sceneMult
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
    return metaMult * swarmSpeed * finishSpeed * buffMult * debuffMult * sceneMult * boboTechMoveMult;
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
    return (1 + this.getBuffStack('siege_breaker') * 0.1 + bastionSiege + brassFinish) * sceneMult * boboTechSiegeMult;
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
}
