/**
 * 战斗数值表：波波兵基础属性、敌人随关卡成长、布丁合体阶数、种族自动技能的间隔与伤害。
 * 不依赖 Three.js / DOM，World3D 与 scripts/strength_table.mjs、scripts/campaign_sim.mjs 共用同一份。
 */
import { enemyGrowthSteps } from '../levels/CampaignCurve';

export interface UnitBaseStats {
  maxHp: number;
  dmg: number;
  speed: number;
}

/** 我方波波兵基础属性（乘战力倍率等之前）。miniGiant = 招财完全体 / 曲奇卫士 / 空投巨人阵。 */
export const BLUE_TROOPER_BASE: Record<'normal' | 'charged' | 'miniGiant', UnitBaseStats> = {
  normal: { maxHp: 16, dmg: 12, speed: 7.4 },
  charged: { maxHp: 38, dmg: 26, speed: 8.0 },
  miniGiant: { maxHp: 52, dmg: 30, speed: 7.5 },
};

export type RedUnitKind = 'normal' | 'brute' | 'baneling' | 'shaman';

export interface RedUnitStats extends UnitBaseStats {
  radius: number;
}

/** 敌人属性随关卡成长（指数段在第 41 关封顶，之后只剩线性段）。 */
export function computeRedUnitStats(kind: RedUnitKind, stage: number): RedUnitStats {
  // Steeper exponential enemy scaling so mid-to-late stages challenge upgraded armies!
  const growthSteps = enemyGrowthSteps(stage);
  const stageHpCurve = Math.pow(1.135, growthSteps);
  const stageDmgCurve = Math.pow(1.095, growthSteps);
  if (kind === 'brute') {
    return {
      maxHp: Math.round((125 + stage * 28) * stageHpCurve),
      dmg: Math.round((25 + (stage - 1) * 2.4) * stageDmgCurve),
      radius: 0.75,
      speed: Math.min(4.2, 3.15 + (stage - 1) * 0.032),
    };
  }
  if (kind === 'baneling') {
    // Fast, fragile green bio-exploder mutant that detonates in an AOE acid splash on contact!
    return {
      maxHp: Math.max(11, Math.round((12 + (stage - 1) * 1.6) * stageHpCurve)),
      dmg: Math.round((15 + (stage - 1) * 1.5) * stageDmgCurve),
      radius: 0.34,
      speed: Math.min(5.6, 4.55 + (stage - 1) * 0.038),
    };
  }
  if (kind === 'shaman') {
    // Support Hive Shaman priest that periodically pulses a healing/speed aura to nearby Red units
    return {
      maxHp: Math.round((58 + stage * 12.0) * stageHpCurve),
      dmg: Math.round((16 + (stage - 1) * 1.5) * stageDmgCurve),
      radius: 0.46,
      speed: Math.min(4.0, 3.05 + (stage - 1) * 0.025),
    };
  }
  return {
    maxHp: Math.round((21 + (stage - 1) * 2.4) * stageHpCurve),
    dmg: Math.round((14 + (stage - 1) * 1.4) * stageDmgCurve),
    radius: 0.31,
    speed: Math.min(4.6, 3.55 + (stage - 1) * 0.035),
  };
}

/** 布丁族合体阶数属性（次线性成长，两只合一只）。 */
export function computeGiantTierStats(
  pwr: number,
  giantSpec: { fusionStatAmplify: number; baseHpMult: number; baseDmgMult: number },
  tier: number,
  isChargedBase = false
): { maxHp: number; dmg: number; radius: number } {
  const clampedTier = Math.min(4, Math.max(1, tier));
  // Sub-linear tier progression (sacrificing 2 bodies into 1 heavier colossus without runaway exponential scaling):
  // Tier 1: 1.00x | Tier 2: 1.72x * amp | Tier 3: 2.55x * amp | Tier 4: 3.55x * amp
  const amp = giantSpec.fusionStatAmplify;
  const tierHpMult =
    clampedTier === 1 ? 1.0 : clampedTier === 2 ? 1.72 * amp : clampedTier === 3 ? 2.55 * amp : 3.55 * amp;
  const tierDmgMult =
    clampedTier === 1 ? 1.0 : clampedTier === 2 ? 1.56 * amp : clampedTier === 3 ? 2.22 * amp : 3.05 * amp;
  const chargedBonus = isChargedBase && clampedTier === 1 ? 1.22 : 1.0;
  return {
    maxHp: 16 * pwr * giantSpec.baseHpMult * tierHpMult * chargedBonus,
    dmg: 12 * pwr * giantSpec.baseDmgMult * tierDmgMult * chargedBonus,
    radius: Math.min(0.72, 0.39 + clampedTier * 0.075),
  };
}

/** 种族自动技能：间隔（秒）与单次伤害（再乘战力倍率）。 */
export const RACE_AUTO_SKILLS = {
  gatePulse: (rank: number) => ({ intervalSec: 4.2, dmg: 16 + rank * 12, clonesPerGate: rank }),
  plasmaThunder: (rank: number) => ({ intervalSec: Math.max(2.4, 4.2 - rank * 0.5), dmg: 36 + rank * 18 }),
  orbitalStarfall: (rank: number, isT4: boolean) => ({
    intervalSec: isT4 ? 3.2 : Math.max(3.4, 5.6 - rank * 0.7),
    dmg: 34 + rank * 16,
  }),
  bastionTurret: (rank: number) => ({ intervalSec: Math.max(0.75, 1.45 - rank * 0.2), dmg: 22 + rank * 14 }),
  swarmBrood: { intervalSec: 6.5, count: 4 },
} as const;

/** 波波族 T3 退场自爆：对周围敌人造成自身攻击的比例。 */
export const KAMIKAZE_DMG_RATIO = (rank: number): number => 0.2 + rank * 0.15;

/** 喵喵族 T2 连锁闪电：每道电弧造成自身攻击的比例。 */
export const CHAIN_ARC_DMG_RATIO = (rank: number): number => 0.3 + rank * 0.1;

/** 喵喵族 T1：每级高能波波概率。 */
export const PLASMA_CHARGED_RATE_PER_RANK = 0.18;

/** 蓄力彩虹贯通炮：贯穿光束单次伤害（再乘战力倍率）。 */
export const RAINBOW_BEAM_DMG = 34;
