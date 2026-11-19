import { THEME_ORDER, ThemeId } from '../game/SceneThemes';

export type GateOp = 'add' | 'mul' | 'sub' | 'div' | 'giant_jelly' | 'frost_shield';

export type GateStyle = 'blue' | 'gold' | 'mega' | 'hazard' | 'jelly' | 'frost';

export interface GateConfig {
  id: string;
  x: number;
  z: number;
  width: number;
  op: GateOp;
  value: number;
  style: GateStyle;
  moveRangeX?: number;
  moveSpeed?: number;
  movePhase?: number;
}

export interface WallConfig {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  height?: number;
  moveRangeX?: number;
  moveSpeed?: number;
  movePhase?: number;
}

export interface GearConfig {
  id: string;
  x: number;
  z: number;
  radius: number;
  hp: number; // Number of troopers needed to Jam & Destroy the grinder gear
  moveRangeX?: number;
  moveSpeed?: number;
  movePhase?: number;
}

export type TerrainZoneType =
  | 'speed_belt'
  | 'jump_pad'
  | 'toxic_mire'
  | 'heal_sanctuary'
  | 'tailwind_belt'
  | 'emp_zone'
  | 'frosting_pad';

export type WeatherAffixId = 'gale_tailwind' | 'ion_emp_storm' | 'sugar_snow_updraft';

export interface WeatherAffixConfig {
  id: WeatherAffixId;
  name: string;
  shortBadge: string;
  desc: string;
  iconKey: 'envTailwind' | 'envEmp' | 'envFrosting';
  blueSpeedMult: number;
  chargeGainMult: number;
  padVaultMult: number;
}

export const WEATHER_AFFIX_ORDER: WeatherAffixId[] = [
  'gale_tailwind',
  'ion_emp_storm',
  'sugar_snow_updraft',
];

export const WEATHER_AFFIX_CATALOG: Record<WeatherAffixId, WeatherAffixConfig> = {
  gale_tailwind: {
    id: 'gale_tailwind',
    name: '顺风季风',
    shortBadge: '顺风季风·冲锋+16%',
    desc: '桥面顺风气流助推我方波波团推进移速 +16%，并强化顺风加速带推力',
    iconKey: 'envTailwind',
    blueSpeedMult: 1.16,
    chargeGainMult: 1.05,
    padVaultMult: 1.0,
  },
  ion_emp_storm: {
    id: 'ion_emp_storm',
    name: '电磁雷暴',
    shortBadge: '电磁雷暴·充能+20%',
    desc: '电离风暴令全军技能与合体机甲充能效率 +20%，桥面电磁干扰区周期性预警放电破盾缓敌',
    iconKey: 'envEmp',
    blueSpeedMult: 1.04,
    chargeGainMult: 1.2,
    padVaultMult: 1.0,
  },
  sugar_snow_updraft: {
    id: 'sugar_snow_updraft',
    name: '糖霜暖流',
    shortBadge: '糖霜暖流·弹跳爆发',
    desc: '暖甜糖霜上升气流强化糖霜弹跳垫腾空跨障距离，落地赋予糖霜爆发攻速与护盾糖衣',
    iconKey: 'envFrosting',
    blueSpeedMult: 1.08,
    chargeGainMult: 1.08,
    padVaultMult: 1.18,
  },
};

export function pickDeterministicWeatherAffix(stageNumber: number, seed: number): WeatherAffixConfig {
  const idx = Math.abs(Math.floor(stageNumber - 1) + Math.floor((seed >>> 0) % 3)) % WEATHER_AFFIX_ORDER.length;
  return WEATHER_AFFIX_CATALOG[WEATHER_AFFIX_ORDER[idx]];
}

export interface TerrainZoneConfig {
  id: string;
  type: TerrainZoneType;
  x: number;
  z: number;
  width: number;
  length: number;
}

export interface BumperConfig {
  id: string;
  x: number;
  z: number;
  radius: number;
}

export interface SideNestConfig {
  id: string;
  x: number;
  z: number;
  hp: number;
  name: string;
  rewardGold: number;
}

export interface BarrelConfig {
  id: string;
  x: number;
  z: number;
  hp: number;
}

export interface BossSubTowerConfig {
  id: string;
  side: 'left' | 'right';
  name: string;
  x: number;
  z: number;
  hp: number;
  rewardGold: number;
}

export interface CandyVaultConfig {
  id: string;
  x: number;
  z: number;
  hp: number;
  rewardGold: number;
  rewardShards: number;
  name: string;
  isGrand?: boolean;
}

export interface EscortBarricadeConfig {
  id: string;
  x: number;
  z: number;
  width: number;
  hp: number;
  rewardGold: number;
  rewardShards: number;
  name: string;
  isHeavy?: boolean;
}

export type MapArchetype =
  | 'cascade_scurve'
  | 'grinder_gauntlet'
  | 'twin_matrix'
  | 'zigzag_fortress'
  | 'trilane_siege'
  | 'chaos_overdrive'
  | 'pinball_plaza'
  | 'hourglass_choke'
  | 'diamond_citadel'
  | 'conveyor_labyrinth';

export interface AntiAirTurretConfig {
  id: string;
  name: string;
  side: 'left' | 'right';
  x: number;
  z: number;
  hp: number;
  flakDmg: number;
  fireInterval: number;
  rewardGold: number;
  dropChargeBonus: number;
}

export type CandyTrainCarKind = 'locomotive' | 'armored' | 'treasure' | 'caboose';

/**
 * MC-10: One coupled car of the 3D armored Rainbow Candy Freight Train.
 * `armor` is the fractional damage reduction while the bolted armor plates are intact
 * (plates are shed at 50% HP, cutting the armor to 40% of its value).
 */
export interface CandyTrainCarConfig {
  id: string;
  name: string;
  shortName: string;
  kind: CandyTrainCarKind;
  hp: number;
  armor: number;
  rewardGold: number;
  rewardMedals: number;
  ventDmg: number;
  ventInterval: number;
}

/** MC-10: Elliptical rainbow rail loop the candy freight train circles around (world units). */
export interface CandyTrainTrackConfig {
  centerX: number;
  centerZ: number;
  radiusX: number;
  radiusZ: number;
  carSpacing: number;
}

/**
 * MC-11: A full-width coral reef barrier sealing the submarine bubble lane at `z`.
 * The 3D toy submarine cannot pass while it stands; Bobos, sub torpedoes & pet sparks break it.
 */
export interface CoralBarrierConfig {
  id: string;
  name: string;
  z: number;
  hp: number;
  rewardGold: number;
}

/** MC-11: A drifting rescue bubble holding a trapped Bobo squad (popping it releases `bobos` Blue units). */
export interface RescueBubbleConfig {
  id: string;
  x: number;
  z: number;
  hp: number;
  bobos: number;
  driftRangeX: number;
  driftSpeed: number;
  driftPhase: number;
  isGrand?: boolean;
}

/** MC-11: Periodic jellyfish swarm that drifts at the submarine, stinging (damage + slow) Bobos and the hull. */
export interface JellyfishSwarmConfig {
  firstDelaySec: number;
  intervalSec: number;
  perSwarm: number;
  hp: number;
  speed: number;
  stingRadius: number;
  stingIntervalSec: number;
  stingDmg: number;
  hullStingDmg: number;
  slowSec: number;
  slowMult: number;
  rewardGold: number;
}

/** MC-11: Submarine bubble lane geometry and hull / oxygen / torpedo budget. */
export interface SubmarineLaneConfig {
  startZ: number;
  dockZ: number;
  maxSteerX: number;
  baseSpeed: number;
  hullHp: number;
  oxygenSec: number;
  torpedoIntervalSec: number;
  torpedoDmg: number;
}

/**
 * MC-12: A sled gate standing across part of the glacier course at course distance `d` (metres from the summit).
 * The toy sled passing through it (sled centre x within [x - width/2, x + width/2]) adds Bobo riders.
 */
export interface SledGateConfig {
  id: string;
  d: number;
  x: number;
  width: number;
  op: 'add' | 'mul';
  value: number;
  style: GateStyle;
}

/** MC-12: A falling icicle telegraphed by a ground shadow; once landed it stands as an ice spike that knocks riders off. */
export interface SledIcicleConfig {
  id: string;
  d: number;
  x: number;
  radius: number;
  knockCap: number;
}

/** MC-12: An avalanche snow wave rolling up the course toward the sled; only the flagged gap `gapX ± gapW/2` is safe. */
export interface SledAvalancheConfig {
  id: string;
  d: number;
  gapX: number;
  gapW: number;
  rollSpeed: number;
  knockPct: number;
}

/** MC-12: An ice boost strip; the sled sliding over it gains a short speed burst. */
export interface SledBoostConfig {
  id: string;
  d: number;
  x: number;
  width: number;
}

/** MC-12: Glacier sled course geometry, speed / time budget and rider capacity. */
export interface GlacierSledCourseConfig {
  length: number;
  baseSpeed: number;
  timeLimitSec: number;
  startRiders: number;
  maxRiders: number;
  maxSteerX: number;
  hitSlowMult: number;
  hitSlowSec: number;
  boostMult: number;
  boostSec: number;
}

/**
 * MC-13: A floating stone platform on the lava course. Every platform of one row shares `d` (course metres of the
 * row centre) and `depth`; the Bobo crowd lands on a row when it reaches `d - depth / 2`.
 * - `stone`: basalt slab; `cooled`: wide cooled-rock safe platform (never targeted by hazards, grants a short
 *   heat shield); `shore`: the start / exit obsidian shore. A platform may carry a unit gate (+N / ×N).
 */
export type LavaPlatformKind = 'stone' | 'cooled' | 'shore';

export interface LavaPlatformConfig {
  id: string;
  row: number;
  d: number;
  x: number;
  width: number;
  depth: number;
  kind: LavaPlatformKind;
  gateOp?: 'add' | 'mul';
  gateValue?: number;
  gateStyle?: GateStyle;
}

/** MC-13: A telegraphed lava eruption (AoE circle) on one platform of a row; it bursts as the crowd arrives. */
export interface LavaEruptionConfig {
  id: string;
  row: number;
  d: number;
  x: number;
  radius: number;
  knockCap: number;
}

/** MC-13: A volcanic bomb falling onto part of a platform (shadow telegraph) that then burns there as an obstacle. */
export interface LavaRockConfig {
  id: string;
  row: number;
  d: number;
  x: number;
  radius: number;
  knockCap: number;
}

/** MC-13: Lava jump course geometry, pace / time budget and crowd capacity. */
export interface LavaJumpCourseConfig {
  length: number;
  baseSpeed: number;
  timeLimitSec: number;
  startBobos: number;
  maxBobos: number;
  maxSteerX: number;
  hopHeight: number;
  hitSlowMult: number;
  hitSlowSec: number;
  cooledShieldSec: number;
}

/**
 * MC-14: A gate across part of the asteroid-belt space track. `unit` gates add Bobos (+N / ×N); `shield` gates charge a
 * temporary energy shield on the whole squad (`value` = hazard hits it absorbs before it pops). Gates sharing `d` are
 * resolved together: only the one under the squad centre triggers.
 */
export interface AsteroidGateConfig {
  id: string;
  d: number;
  x: number;
  width: number;
  kind: 'unit' | 'shield';
  op?: 'add' | 'mul';
  value: number;
  style: GateStyle;
}

/** MC-14: A telegraphed asteroid strike (warning ring + slowly falling rock in low gravity) that blasts a circle. */
export interface AsteroidMeteorConfig {
  id: string;
  d: number;
  x: number;
  radius: number;
  knockCap: number;
}

/** MC-14: A drifting asteroid belt spanning the track with one flagged safe gap (`gapX` ± `gapW` / 2). */
export interface AsteroidBeltConfig {
  id: string;
  d: number;
  gapX: number;
  gapW: number;
  knockCap: number;
}

/** MC-14: Asteroid dash course geometry, pace / time budget, crowd capacity, low-gravity float & shield tuning. */
export interface AsteroidDashCourseConfig {
  length: number;
  baseSpeed: number;
  timeLimitSec: number;
  startBobos: number;
  maxBobos: number;
  maxSteerX: number;
  floatHeight: number;
  hitSlowMult: number;
  hitSlowSec: number;
  shieldSec: number;
}

/**
 * MC-15: A unit gate pair on the haunted-castle night track (+N / ×N). Gates sharing `d` resolve together: only the one
 * under the squad centre triggers.
 */
export interface PumpkinGateConfig {
  id: string;
  d: number;
  x: number;
  width: number;
  op: 'add' | 'mul';
  value: number;
  style: GateStyle;
}

/**
 * MC-15: A pumpkin-lantern lit zone (a warm pool of light on the castle floor). While the squad centre is inside it, the
 * squad's lantern light refills; a ghost drifting into the light is dispelled.
 */
export interface PumpkinLampConfig {
  id: string;
  d: number;
  x: number;
  radius: number;
}

/**
 * MC-15: A wall-phasing ghost. It glides out of the castle side wall (`side` -1 = left / +1 = right), sweeping across
 * the track in lock-step with the squad's progress, so it is exactly at `crossX` when the squad front reaches `d`
 * (marked by a purple intercept ring). Lateral shift = `sweep` metres per metre the squad advances.
 */
export interface PumpkinGhostConfig {
  id: string;
  d: number;
  side: -1 | 1;
  crossX: number;
  sweep: number;
  radius: number;
  knockCap: number;
}

/** MC-15: An inner castle wall across the track with one open archway (`doorX` ± `doorW` / 2). Ghosts phase through it. */
export interface PumpkinWallConfig {
  id: string;
  d: number;
  doorX: number;
  doorW: number;
  knockCap: number;
}

/** MC-15: Haunted-castle night run geometry, pace / time budget, crowd capacity and lantern-light tuning. */
export interface PumpkinNightCourseConfig {
  length: number;
  baseSpeed: number;
  timeLimitSec: number;
  startBobos: number;
  maxBobos: number;
  maxSteerX: number;
  /** Lantern light capacity (before 南瓜灯徽章 milestone bonus), drain per second, refill per second inside a lit zone. */
  lightMax: number;
  lightDecayPerSec: number;
  lightRefillPerSec: number;
  /** Light a ghost contact burns when the squad's lantern dispels it (needs at least this much light). */
  ghostLightCost: number;
  /** Pace multiplier while the lantern light is out (groping through the dark). */
  darkSlowMult: number;
  hitSlowMult: number;
  hitSlowSec: number;
}

/**
 * MC-16: A unit gate pair on the desert tomb track (+N / ×N, golden scarab posts). Gates sharing `d` resolve together:
 * only the one under the squad centre triggers.
 */
export interface PyramidGateConfig {
  id: string;
  d: number;
  x: number;
  width: number;
  op: 'add' | 'mul';
  value: number;
  style: GateStyle;
}

/**
 * MC-16: A quicksand belt (流沙减速带) across the whole tomb passage from `d` to `d + length`, crossed by one firm
 * stepping-stone path (`pathX` ± `pathW` / 2). Bobos standing in the sand drag the squad pace down and slowly sink; a
 * Bobo that stays in the sand for `sinkSec` (course tuning) is swallowed (capped per belt by `knockCap`).
 */
export interface PyramidSandConfig {
  id: string;
  d: number;
  length: number;
  pathX: number;
  pathW: number;
  knockCap: number;
}

/** MC-16: One flip slab of a slab row (centre x, width) and its phase offset (seconds) in the row's flip cycle. */
export interface PyramidSlabConfig {
  x: number;
  width: number;
  offset: number;
}

/**
 * MC-16: A row of flip slabs (翻转石板机关) spanning the passage at `d` (`depth` metres deep). Every slab runs the same
 * cycle on the run clock: closed -> `warnSec` warning (red glyph, trembling) -> `openSec` flipped on its edge over a
 * pit (Bobos on it are flung away, capped per row) -> closed. Slab offsets are staggered so at least two slabs of a
 * row are always closed.
 */
export interface PyramidSlabRowConfig {
  id: string;
  d: number;
  depth: number;
  period: number;
  openSec: number;
  warnSec: number;
  knockCap: number;
  slabs: PyramidSlabConfig[];
}

/** MC-16: Desert pyramid tomb run geometry, pace / time budget, crowd capacity and quicksand tuning. */
export interface PyramidRunCourseConfig {
  length: number;
  baseSpeed: number;
  timeLimitSec: number;
  startBobos: number;
  maxBobos: number;
  maxSteerX: number;
  /** Pace multiplier once at least half of the squad stands in quicksand (scaled linearly below that). */
  sandSlowMult: number;
  /** Seconds a Bobo can stand in quicksand before it is swallowed. */
  sinkSec: number;
  hitSlowMult: number;
  hitSlowSec: number;
}

/**
 * MC-17: A unit gate pair on the jungle temple path (+N / ×N, carved jade-idol posts). Gates sharing `d` resolve
 * together: only the one under the squad centre triggers.
 */
export interface JungleGateConfig {
  id: string;
  d: number;
  x: number;
  width: number;
  op: 'add' | 'mul';
  value: number;
  style: GateStyle;
}

/**
 * MC-17: One vine of a chasm. It hangs from the canopy beam above the chasm centre and sways sideways on the run
 * clock: its grab point sits at `x + amp · sin(2π · (clock + offset) / period)`.
 */
export interface JungleVineConfig {
  x: number;
  amp: number;
  period: number;
  offset: number;
}

/**
 * MC-17: A chasm (断崖) across the whole temple path from `d` to `d + gap`. The only way over is a swaying vine: when
 * the squad front reaches the edge, the vine nearest to the squad line is grabbed and stops swaying (locked at its
 * current x). Every Bobo that reaches the edge within `reach` of the locked vine swings across on it; the others fall
 * (capped per chasm by `knockCap`; a candy shield floats a Bobo across instead).
 */
export interface JungleChasmConfig {
  id: string;
  d: number;
  gap: number;
  reach: number;
  knockCap: number;
  vines: JungleVineConfig[];
}

/**
 * MC-17: A rolling boulder (滚石机关) resting on a ramp at `d` in the lane `x`. Once the squad front comes within
 * `wakeD` it starts rolling toward the squad at `speed` (metres per second along the course, on top of the squad's own
 * pace); Bobos in its lane are flattened (capped per boulder; a candy shield absorbs it).
 */
export interface JungleBoulderConfig {
  id: string;
  d: number;
  x: number;
  radius: number;
  speed: number;
  wakeD: number;
  knockCap: number;
}

/** MC-17: Jungle temple vine-swing run geometry, pace / time budget, crowd capacity and swing arc tuning. */
export interface JungleSwingCourseConfig {
  length: number;
  baseSpeed: number;
  timeLimitSec: number;
  startBobos: number;
  maxBobos: number;
  maxSteerX: number;
  /** Height (metres) of the swing arc above the path at the chasm centre. */
  swingHeight: number;
  hitSlowMult: number;
  hitSlowSec: number;
}

export interface LevelConfig {
  id: number;
  seed: number;
  themeId: ThemeId;
  archetype: MapArchetype;
  archetypeName: string;
  isMilestoneBoss: boolean;
  isMiniBoss: boolean;
  isMegaBoss: boolean;
  isBonusHeist?: boolean;
  bonusHeistDurationSec?: number;
  candyVaults?: CandyVaultConfig[];
  isEndlessDefense?: boolean;
  isPayloadEscort?: boolean;
  escortBarricades?: EscortBarricadeConfig[];
  isGearTournament?: boolean;
  tournamentStage?: 1 | 2 | 3;
  tournamentStageTitle?: string;
  tournamentStreakMult?: number;
  mode?:
    | 'campaign'
    | 'bonus_heist'
    | 'endless_defense'
    | 'payload_escort'
    | 'gear_tournament'
    | 'colossus_raid'
    | 'airship_escort'
    | 'candy_train_raid'
    | 'submarine_rescue'
    | 'glacier_sled'
    | 'lava_jump'
    | 'asteroid_dash'
    | 'pumpkin_night'
    | 'pyramid_run'
    | 'jungle_swing'
    | 'pirate_plank';
  isColossusRaid?: boolean;
  colossusRaidTier?: number;
  colossusLeftShieldHp?: number;
  colossusRightCannonHp?: number;
  isAirshipEscort?: boolean;
  airshipEscortTier?: number;
  airshipMaxHp?: number;
  airshipMaxShield?: number;
  antiAirTurrets?: AntiAirTurretConfig[];
  isCandyTrainRaid?: boolean;
  candyTrainTier?: number;
  candyTrainCars?: CandyTrainCarConfig[];
  candyTrainTrack?: CandyTrainTrackConfig;
  candyTrainSpeed?: number;
  candyTrainEscapeSec?: number;
  isSubmarineRescue?: boolean;
  submarineTier?: number;
  submarineLane?: SubmarineLaneConfig;
  coralBarriers?: CoralBarrierConfig[];
  rescueBubbles?: RescueBubbleConfig[];
  jellyfishSwarm?: JellyfishSwarmConfig;
  isGlacierSled?: boolean;
  sledTier?: number;
  sledCourse?: GlacierSledCourseConfig;
  sledGates?: SledGateConfig[];
  sledIcicles?: SledIcicleConfig[];
  sledAvalanches?: SledAvalancheConfig[];
  sledBoosts?: SledBoostConfig[];
  isLavaJump?: boolean;
  lavaTier?: number;
  lavaCourse?: LavaJumpCourseConfig;
  lavaPlatforms?: LavaPlatformConfig[];
  lavaEruptions?: LavaEruptionConfig[];
  lavaRocks?: LavaRockConfig[];
  isAsteroidDash?: boolean;
  asteroidTier?: number;
  asteroidCourse?: AsteroidDashCourseConfig;
  asteroidGates?: AsteroidGateConfig[];
  asteroidMeteors?: AsteroidMeteorConfig[];
  asteroidBelts?: AsteroidBeltConfig[];
  isPumpkinNight?: boolean;
  pumpkinTier?: number;
  pumpkinCourse?: PumpkinNightCourseConfig;
  pumpkinGates?: PumpkinGateConfig[];
  pumpkinLamps?: PumpkinLampConfig[];
  pumpkinGhosts?: PumpkinGhostConfig[];
  pumpkinWalls?: PumpkinWallConfig[];
  isPyramidRun?: boolean;
  pyramidTier?: number;
  pyramidCourse?: PyramidRunCourseConfig;
  pyramidGates?: PyramidGateConfig[];
  pyramidSands?: PyramidSandConfig[];
  pyramidSlabRows?: PyramidSlabRowConfig[];
  isJungleSwing?: boolean;
  jungleTier?: number;
  jungleCourse?: JungleSwingCourseConfig;
  jungleGates?: JungleGateConfig[];
  jungleChasms?: JungleChasmConfig[];
  jungleBoulders?: JungleBoulderConfig[];
  /**
   * MC-18: 海盗船跳板突围. A pirate level also sets `isJungleSwing` and fills the jungle* course fields: it runs on the
   * same squad-run engine (chasm = open sea between two decks crossed on a swaying plank, boulder = cannonball fired
   * down a deck lane, exit = the flagship's boarding ramp) with its own scene, tiers, numbers and 金骷髅徽章 rewards.
   */
  isPirateBoarding?: boolean;
  pirateTier?: number;
  weatherAffix?: WeatherAffixConfig;
  name: string;
  subtitle: string;
  bossName: string;
  bossMaxHp: number;
  enemySpawnInterval: number; // seconds between red horde bursts
  enemyBurstCount: number;    // red units per burst
  initialRedPrewarm: number;  // initial vanguard in front of Boss Gate
  bruteSpawnInterval: number; // giant yellow mutant brutes interval (0 = none)
  rewardGold: number;
  gates: GateConfig[];
  walls: WallConfig[];
  gears: GearConfig[];
  nests: SideNestConfig[];
  barrels: BarrelConfig[];
  zones: TerrainZoneConfig[];
  bumpers: BumperConfig[];
  bossSubTowers: BossSubTowerConfig[];
}

export const TOTAL_SELECTABLE_STAGES = 50;

class SeededRNG {
  private state: number;
  constructor(seed: number) {
    this.state = seed >>> 0 || 123456789;
  }

  public next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  public range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  public int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  public pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  public chance(prob: number): boolean {
    return this.next() < prob;
  }
}

const BOSS_ROSTER = [
  '集团厂房总管 (STEAMWORKS DIRECTOR)',
  '重锤锅炉督军 (BOILER FOREMAN)',
  '双涡轮齿轮厂长 (TWIN-GEAR MAGNATE)',
  '铁甲蒸汽巨匠 (IRONCLAD ENGINEER)',
  '皇家发条大亨 (CLOCKWORK BARON)',
  '黄铜礼帽董事长 (BRASS SYNDICATE CEO)',
  '高压汽笛总督 (WHISTLE OVERSEER)',
  '焦糖熔炉总管 (FURNACE WARDEN)',
  '蒸汽广播主脑 (MEGAPHONE DIRECTOR)',
  '红砖要塞总工程师 (CITADEL ARCHITECT)',
] as const;

const MINI_BOSS_ROSTER = [
  '工坊先锋 · 巨型扳手领班 (STAGE 5 MINI BOSS)',
  '黑油主管 · 高压阀门督军 (STAGE 15 MINI BOSS)',
  '齿轮处刑官 · 重装铆钉巨汉 (STAGE 25 MINI BOSS)',
  '广播督察长 · 扩音蒸汽领主 (STAGE 35 MINI BOSS)',
  '涡轮总领班 · 超压发条巨匠 (STAGE 45 MINI BOSS)',
] as const;

const MEGA_BOSS_ROSTER = [
  '集团董事 · 红砖巨型总厂长 (STAGE 10 MEGA BOSS)',
  '蒸汽霸主 · 黄金齿轮大亨 (STAGE 20 MEGA BOSS)',
  '熔炉总帅 · 百吨发条巨神 (STAGE 30 MEGA BOSS)',
  '财团首脑 · 皇家蒸汽总督 (STAGE 40 MEGA BOSS)',
  '终极厂长 · 无尽工坊最高总裁 (STAGE 50 MEGA BOSS)',
] as const;

const NEST_NAMES = [
  '副厂抓捕哨站',
  '铆钉保安岗亭',
  '高压油罐分站',
  '厂区广播岗楼',
  '发条巡逻车库',
  '红砖警卫分厂',
  '蒸汽补给站台',
] as const;

const ARCHETYPE_INFO: Record<
  MapArchetype,
  { title: string; tag: string; desc: string }
> = {
  cascade_scurve: {
    title: '三段蛇形 · 传送带街区',
    tag: '三段S弯+传送带',
    desc: '三层交错胡桃木弹簧挡板搭配侧翼加速传送带与弹球柱，借弯道分流冲向高倍横幅门！',
  },
  grinder_gauntlet: {
    title: '巡弋蒸汽炉 · 飞跃突围',
    tag: '移动锅炉+跳板',
    desc: '双巡弋高压蒸汽锅炉封锁中场，善用侧翼弹簧跳板飞跃挡板直取倍增门！',
  },
  twin_matrix: {
    title: '菱形广场 · 双翼回廊',
    tag: '菱形花坛+双翼',
    desc: '中央菱形木栏将石板桥一分为三，穿行内环应援舞台或借外环传送带包抄集团厂房！',
  },
  zigzag_fortress: {
    title: '五折工坊 · 动感滑门街区',
    tag: '折线木栏+滑门',
    desc: '多层弹簧木挡板与横向滑动闸门交替开合，把握滑门间隙切入金色倍增横幅！',
  },
  trilane_siege: {
    title: '三路分流 · 传送带与油污',
    tag: '三路异构工坊',
    desc: '左中右三路分别设有加速传送带、弹簧跳板与黏滞黑油污，因地制宜分兵破敌！',
  },
  chaos_overdrive: {
    title: '工坊弹球阵 · 嘉年华决战区',
    tag: '弹球柱+动态门',
    desc: '多座黄铜弹球柱与滑动木栏交织成热闹街区，撞击弹柱触发多路散射增殖！',
  },
  pinball_plaza: {
    title: '蒸汽弹球台 · 偏转漏斗',
    tag: 'V型导流+弹球台',
    desc: 'V型胡桃木导流板将波波团汇入五柱黄铜弹球台，自动弹射分流至两侧高倍黄金门！',
  },
  hourglass_choke: {
    title: '沙漏街口 · 飞跃天桥',
    tag: '沙漏街口+跳板',
    desc: '双向收窄的沙漏街口布满礼花炸药桶与油污，亦可走外侧跳板凌空飞跃街口！',
  },
  diamond_citadel: {
    title: '双菱花坛 · 交叉应援网',
    tag: '双菱迷宫+舞台',
    desc: '前后两座菱形木栏构筑四向分流街区，占领中心应援光环持续回血推进！',
  },
  conveyor_labyrinth: {
    title: '极速传送迷宫 · 动感回旋',
    tag: '双滑门+传送迷宫',
    desc: '双层滑动木闸配合长距加速传送带与黄铜弹柱，打造节奏多变的欢乐攻防战！',
  },
};

/**
 * Generates a balanced, tactical procedural map for any stage number (1 to Unlimited).
 * Gate values are strictly bounded (+1~+3 for blue gates, x2~x3 for gold gates, x3~x4 for elite purple gates).
 */
export function generateDynamicLevel(stageNumber: number, customSeed?: number): LevelConfig {
  const safeStage = Math.max(1, Math.floor(stageNumber));
  const seed =
    customSeed !== undefined
      ? customSeed
      : Math.floor(Date.now() % 1000000) + safeStage * 9973 + Math.floor(Math.random() * 89999);
  const rng = new SeededRNG(seed);

  // Steeper progressive difficulty curve: fair Stage 1, scaling sharply into intense mid-to-late-game battles
  const difficultyScale = Math.pow(1.13, Math.min(safeStage - 1, 35)) + (safeStage - 1) * 0.16;
  const bossMaxHp = Math.round((950 + (safeStage - 1) * 235) * Math.pow(1.135, Math.min(safeStage - 1, 40)));
  const enemySpawnInterval = Math.max(
    0.42,
    Number((1.12 * Math.pow(0.955, Math.min(safeStage - 1, 35))).toFixed(3))
  );
  const enemyBurstCount = Math.min(18, Math.round(4 + (safeStage - 1) * 0.58));
  const initialRedPrewarm = Math.min(60, Math.round(11 + (safeStage - 1) * 3.0));
  const bruteSpawnInterval =
    safeStage === 1
      ? 11.5
      : Math.max(4.4, Number((10.6 * Math.pow(0.935, Math.min(safeStage - 1, 30))).toFixed(2)));
  const rewardGold = Math.round(125 * difficultyScale);

  const allArchetypes: MapArchetype[] = [
    'cascade_scurve',
    'grinder_gauntlet',
    'twin_matrix',
    'zigzag_fortress',
    'trilane_siege',
    'chaos_overdrive',
    'pinball_plaza',
    'hourglass_choke',
    'diamond_citadel',
    'conveyor_labyrinth',
  ];
  const archetype: MapArchetype = rng.pick(allArchetypes);

  const info = ARCHETYPE_INFO[archetype];
  const bossName = BOSS_ROSTER[(safeStage - 1 + rng.int(0, 2)) % BOSS_ROSTER.length];

  const gates: GateConfig[] = [];
  const walls: WallConfig[] = [];
  const gears: GearConfig[] = [];
  const nests: SideNestConfig[] = [];
  const zones: TerrainZoneConfig[] = [];
  const bumpers: BumperConfig[] = [];

  const mirror = rng.chance(0.5) ? -1 : 1;
  const baseGearHp = Math.min(20, Math.round(5 + safeStage * 0.8));
  const baseNestHp = Math.round((110 + (safeStage - 1) * 24) * Math.pow(1.07, Math.min(safeStage - 1, 25)));
  const baseNestGold = Math.round(75 * difficultyScale);
  const hazSubVal = Math.min(8, 6 + Math.floor((safeStage - 1) / 5));

  const pfx = `s${safeStage}_${seed % 1000}`;

  if (archetype === 'cascade_scurve') {
    const ladderX = 6.8 * mirror;
    const flankX = -6.4 * mirror;

    gates.push(
      {
        id: `${pfx}_center_trap`,
        x: 0,
        z: 14.8,
        width: 3.6,
        op: 'sub',
        value: hazSubVal,
        style: 'hazard',
        moveRangeX: 0.65,
        moveSpeed: 1.4,
        movePhase: 0,
      },
      {
        id: `${pfx}_lad_0`,
        x: ladderX,
        z: 12.6,
        width: 4.8,
        op: 'add',
        value: 2,
        style: 'blue',
        moveRangeX: 1.2,
        moveSpeed: 1.35,
      },
      {
        id: `${pfx}_flank_0`,
        x: flankX,
        z: 12.2,
        width: 4.8,
        op: 'add',
        value: rng.int(2, 3),
        style: 'blue',
        moveRangeX: 1.2,
        moveSpeed: 1.4,
      },
      {
        id: `${pfx}_lad_2`,
        x: ladderX - 0.8 * mirror,
        z: 4.8,
        width: 4.8,
        op: 'mul',
        value: 2,
        style: 'gold',
        moveRangeX: 1.6,
        moveSpeed: 1.45,
      },
      {
        id: `${pfx}_sc_exit`,
        x: -2.6 * mirror,
        z: -3.2,
        width: 4.8,
        op: 'mul',
        value: 2,
        style: 'gold',
        moveRangeX: 2.2,
        moveSpeed: 1.5,
        movePhase: 0,
      },
      {
        id: `${pfx}_sc_haz2`,
        x: 4.8 * mirror,
        z: -3.2,
        width: 3.4,
        op: 'div',
        value: 2,
        style: 'hazard',
        moveRangeX: 1.4,
        moveSpeed: 1.5,
        movePhase: 3.14,
      },
      {
        id: `${pfx}_mega`,
        x: 0,
        z: -8.8,
        width: 5.2,
        op: 'mul',
        value: 3,
        style: 'mega',
        moveRangeX: 3.4,
        moveSpeed: 1.6,
        movePhase: 0.4,
      }
    );

    // 3-Tier Serpentine S-Curve Baffles + Dynamic Sliding Center Gate Wall
    walls.push(
      { x1: 4.8 * mirror, z1: 9.2, x2: -1.4 * mirror, z2: 6.4 },
      { x1: -4.8 * mirror, z1: 3.8, x2: 1.4 * mirror, z2: 1.0 },
      { x1: 4.4 * mirror, z1: -1.6, x2: -1.0 * mirror, z2: -4.4 },
      { x1: -6.8 * mirror, z1: 8.8, x2: -6.8 * mirror, z2: 5.2 }
    );

    zones.push(
      { id: `${pfx}_zb1`, type: 'speed_belt', x: -6.2 * mirror, z: 8.5, width: 2.8, length: 5.5 },
      { id: `${pfx}_zb2`, type: 'speed_belt', x: 6.2 * mirror, z: 2.2, width: 2.8, length: 5.5 },
      { id: `${pfx}_zm1`, type: 'toxic_mire', x: 2.2 * mirror, z: 4.6, width: 3.2, length: 2.8 }
    );

    bumpers.push(
      { id: `${pfx}_bmp1`, x: -2.4 * mirror, z: 6.0, radius: 0.85 },
      { id: `${pfx}_bmp2`, x: 2.4 * mirror, z: 0.6, radius: 0.85 }
    );

    gears.push({
      id: `${pfx}_gear_1`,
      x: -7.2 * mirror,
      z: -1.2,
      radius: 1.85,
      hp: baseGearHp,
      moveRangeX: 1.4,
      moveSpeed: 1.5,
    });

    nests.push({
      id: `${pfx}_nest_1`,
      x: -7.8 * mirror,
      z: -6.2,
      hp: baseNestHp,
      name: rng.pick(NEST_NAMES),
      rewardGold: baseNestGold,
    });
  } else if (archetype === 'grinder_gauntlet') {
    gates.push(
      {
        id: `${pfx}_haz_entry`,
        x: 0,
        z: 13.4,
        width: 3.6,
        op: 'sub',
        value: hazSubVal,
        style: 'hazard',
        moveRangeX: 0.65,
        moveSpeed: 1.4,
        movePhase: 0,
      },
      {
        id: `${pfx}_g1_l`,
        x: -6.2 * mirror,
        z: 12.2,
        width: 4.8,
        op: 'add',
        value: 2,
        style: 'blue',
        moveRangeX: 1.5,
        moveSpeed: 1.4,
        movePhase: 0.8,
      },
      {
        id: `${pfx}_g1_r`,
        x: 6.2 * mirror,
        z: 12.2,
        width: 4.8,
        op: 'add',
        value: 2,
        style: 'blue',
        moveRangeX: 1.5,
        moveSpeed: 1.4,
        movePhase: 2.4,
      },
      {
        id: `${pfx}_g2`,
        x: 4.6 * mirror,
        z: 6.2,
        width: 4.8,
        op: 'mul',
        value: 2,
        style: 'gold',
        moveRangeX: 2.2,
        moveSpeed: 1.55,
        movePhase: 0.5,
      },
      {
        id: `${pfx}_g3`,
        x: -4.6 * mirror,
        z: 1.2,
        width: 4.8,
        op: 'mul',
        value: 2,
        style: 'gold',
        moveRangeX: 2.2,
        moveSpeed: 1.5,
        movePhase: 1.2,
      },
      {
        id: `${pfx}_haz_mid`,
        x: 4.8 * mirror,
        z: -2.8,
        width: 3.4,
        op: 'sub',
        value: hazSubVal,
        style: 'hazard',
        moveRangeX: 1.5,
        moveSpeed: 1.6,
        movePhase: 3.14,
      },
      {
        id: `${pfx}_mega`,
        x: -1.5 * mirror,
        z: -8.2,
        width: 5.2,
        op: 'mul',
        value: 3,
        style: 'mega',
        moveRangeX: 3.2,
        moveSpeed: 1.65,
        movePhase: 0,
      }
    );

    // Central spine wall + angled chicane wings + sliding front barrier
    walls.push(
      { x1: 0, z1: 8.2, x2: 0, z2: -1.8 },
      { x1: -8.2 * mirror, z1: 7.4, x2: -4.8 * mirror, z2: 5.2 },
      { x1: 8.2 * mirror, z1: 4.2, x2: 4.8 * mirror, z2: 2.0 },
      { x1: -2.2, z1: -5.2, x2: 2.2, z2: -5.2, moveRangeX: 3.2, moveSpeed: 1.35, movePhase: 0.5 }
    );

    // Jump pads let troops vault over the grinder gears!
    zones.push(
      { id: `${pfx}_jp1`, type: 'jump_pad', x: -6.4 * mirror, z: 8.2, width: 2.6, length: 2.2 },
      { id: `${pfx}_jp2`, type: 'jump_pad', x: 6.4 * mirror, z: 4.8, width: 2.6, length: 2.2 },
      { id: `${pfx}_hs1`, type: 'heal_sanctuary', x: -3.2 * mirror, z: -4.2, width: 3.4, length: 3.2 }
    );

    bumpers.push(
      { id: `${pfx}_bmp1`, x: 0, z: 9.4, radius: 0.9 },
      { id: `${pfx}_bmp2`, x: -3.2 * mirror, z: 3.5, radius: 0.8 }
    );

    gears.push(
      {
        id: `${pfx}_gr1`,
        x: 5.4 * mirror,
        z: 2.2,
        radius: 1.9,
        hp: baseGearHp,
        moveRangeX: 1.8,
        moveSpeed: 1.45,
        movePhase: 0,
      },
      {
        id: `${pfx}_gr2`,
        x: -5.4 * mirror,
        z: 5.8,
        radius: 1.9,
        hp: baseGearHp,
        moveRangeX: 1.8,
        moveSpeed: 1.45,
        movePhase: 3.14,
      }
    );

    nests.push({
      id: `${pfx}_nest_1`,
      x: 7.2 * mirror,
      z: -8.5,
      hp: baseNestHp,
      name: rng.pick(NEST_NAMES),
      rewardGold: baseNestGold,
    });
  } else if (archetype === 'twin_matrix') {
    gates.push(
      {
        id: `${pfx}_m0_trap`,
        x: 0,
        z: 13.4,
        width: 3.6,
        op: 'sub',
        value: hazSubVal,
        style: 'hazard',
        moveRangeX: 0.65,
        moveSpeed: 1.4,
        movePhase: 0,
      },
      {
        id: `${pfx}_m1_l`,
        x: -6.0,
        z: 12.2,
        width: 4.8,
        op: 'add',
        value: 2,
        style: 'blue',
        moveRangeX: 1.6,
        moveSpeed: 1.45,
        movePhase: 0,
      },
      {
        id: `${pfx}_m1_r`,
        x: 6.0,
        z: 12.2,
        width: 4.8,
        op: 'add',
        value: 2,
        style: 'blue',
        moveRangeX: 1.6,
        moveSpeed: 1.45,
        movePhase: 3.14,
      },
      {
        id: `${pfx}_m2_l`,
        x: -5.6,
        z: 5.2,
        width: 4.6,
        op: 'mul',
        value: 2,
        style: 'gold',
        moveRangeX: 1.6,
        moveSpeed: 1.5,
        movePhase: 0.7,
      },
      {
        id: `${pfx}_m2_r`,
        x: 5.6,
        z: 5.2,
        width: 4.6,
        op: 'mul',
        value: 2,
        style: 'gold',
        moveRangeX: 1.6,
        moveSpeed: 1.5,
        movePhase: 2.3,
      },
      {
        id: `${pfx}_m3_pos`,
        x: -3.2 * mirror,
        z: -2.8,
        width: 4.8,
        op: 'mul',
        value: 2,
        style: 'gold',
        moveRangeX: 2.2,
        moveSpeed: 1.6,
        movePhase: 1.4,
      },
      {
        id: `${pfx}_m3_haz`,
        x: 4.5 * mirror,
        z: -2.8,
        width: 3.4,
        op: 'div',
        value: 2,
        style: 'hazard',
        moveRangeX: 1.6,
        moveSpeed: 1.6,
        movePhase: 4.5,
      },
      {
        id: `${pfx}_m4`,
        x: 0,
        z: -8.6,
        width: 5.2,
        op: 'mul',
        value: 3,
        style: 'mega',
        moveRangeX: 3.6,
        moveSpeed: 1.65,
        movePhase: 0.5,
      }
    );

    // Central Diamond Island Citadel (4 angled diamond walls with open top/bottom vertex channels!)
    walls.push(
      { x1: -1.4, z1: 7.4, x2: -4.2, z2: 3.2 },
      { x1: 1.4, z1: 7.4, x2: 4.2, z2: 3.2 },
      { x1: -4.2, z1: 1.6, x2: -1.4, z2: -2.4 },
      { x1: 4.2, z1: 1.6, x2: 1.4, z2: -2.4 }
    );

    zones.push(
      { id: `${pfx}_hs_core`, type: 'heal_sanctuary', x: 0, z: 2.4, width: 3.6, length: 4.2 },
      { id: `${pfx}_sb_l`, type: 'speed_belt', x: -6.8, z: 1.5, width: 2.4, length: 5.2 },
      { id: `${pfx}_sb_r`, type: 'speed_belt', x: 6.8, z: 1.5, width: 2.4, length: 5.2 }
    );

    bumpers.push(
      { id: `${pfx}_bmp_top`, x: 0, z: 8.8, radius: 0.85 },
      { id: `${pfx}_bmp_bot`, x: 0, z: -4.2, radius: 0.85 }
    );

    gears.push({
      id: `${pfx}_gr_c`,
      x: 0,
      z: 6.2,
      radius: 1.75,
      hp: baseGearHp,
    });

    nests.push({
      id: `${pfx}_nl`,
      x: -7.8 * mirror,
      z: -5.5,
      hp: baseNestHp,
      name: rng.pick(NEST_NAMES),
      rewardGold: baseNestGold,
    });
  } else if (archetype === 'zigzag_fortress') {
    // 4-tier zig-zag fortress with 2 dynamic sliding blast doors!
    walls.push(
      { x1: -5.4 * mirror, z1: 9.0, x2: 0.8 * mirror, z2: 6.6 },
      { x1: 5.4 * mirror, z1: 4.4, x2: -0.8 * mirror, z2: 2.0 },
      { x1: -5.2 * mirror, z1: -0.4, x2: 0.8 * mirror, z2: -2.8 },
      { x1: -1.8, z1: -5.4, x2: 1.8, z2: -5.4, moveRangeX: 3.5, moveSpeed: 1.5, movePhase: 0 }
    );

    gates.push(
      {
        id: `${pfx}_z_haz0`,
        x: 0,
        z: 13.4,
        width: 3.6,
        op: 'sub',
        value: hazSubVal,
        style: 'hazard',
        moveRangeX: 0.65,
        moveSpeed: 1.4,
      },
      {
        id: `${pfx}_z1`,
        x: -6.2 * mirror,
        z: 12.4,
        width: 4.8,
        op: 'add',
        value: 2,
        style: 'blue',
        moveRangeX: 1.4,
        moveSpeed: 1.4,
      },
      {
        id: `${pfx}_z2`,
        x: 6.2 * mirror,
        z: 12.0,
        width: 4.8,
        op: 'add',
        value: 2,
        style: 'blue',
        moveRangeX: 1.6,
        moveSpeed: 1.45,
      },
      {
        id: `${pfx}_z3`,
        x: 5.4 * mirror,
        z: 5.2,
        width: 4.8,
        op: 'mul',
        value: 2,
        style: 'gold',
        moveRangeX: 1.8,
        moveSpeed: 1.5,
      },
      {
        id: `${pfx}_z4`,
        x: -5.2 * mirror,
        z: -2.2,
        width: 4.8,
        op: 'mul',
        value: 2,
        style: 'gold',
        moveRangeX: 1.8,
        moveSpeed: 1.5,
      },
      {
        id: `${pfx}_z_haz1`,
        x: 4.5 * mirror,
        z: -3.2,
        width: 3.4,
        op: 'sub',
        value: hazSubVal,
        style: 'hazard',
        moveRangeX: 1.5,
        moveSpeed: 1.6,
      },
      {
        id: `${pfx}_mega`,
        x: 0,
        z: -8.6,
        width: 5.2,
        op: 'mul',
        value: 3,
        style: 'mega',
        moveRangeX: 3.4,
        moveSpeed: 1.6,
        movePhase: 0,
      }
    );

    zones.push(
      { id: `${pfx}_jp_z1`, type: 'jump_pad', x: -2.5 * mirror, z: 8.6, width: 2.5, length: 2.2 },
      { id: `${pfx}_tm_z1`, type: 'toxic_mire', x: 2.5 * mirror, z: 1.2, width: 3.4, length: 2.8 },
      { id: `${pfx}_sb_z1`, type: 'speed_belt', x: -6.2 * mirror, z: 3.0, width: 2.6, length: 4.8 }
    );

    bumpers.push({ id: `${pfx}_zbmp1`, x: 2.6 * mirror, z: 6.2, radius: 0.85 });

    gears.push({
      id: `${pfx}_zg1`,
      x: -7.0 * mirror,
      z: 4.2,
      radius: 1.9,
      hp: baseGearHp,
    });

    nests.push({
      id: `${pfx}_zn1`,
      x: -7.6 * mirror,
      z: -8.2,
      hp: baseNestHp,
      name: rng.pick(NEST_NAMES),
      rewardGold: baseNestGold,
    });
  } else if (archetype === 'trilane_siege') {
    // Segmented 3-lane highway with cross-switching gaps & angled entry splitters!
    walls.push(
      { x1: -3.6, z1: 9.8, x2: -3.6, z2: 4.2 },
      { x1: -3.6, z1: 1.8, x2: -3.6, z2: -3.8 },
      { x1: 3.6, z1: 9.8, x2: 3.6, z2: 4.2 },
      { x1: 3.6, z1: 1.8, x2: 3.6, z2: -3.8 },
      { x1: -2.0, z1: 11.2, x2: -3.6, z2: 9.8 },
      { x1: 2.0, z1: 11.2, x2: 3.6, z2: 9.8 }
    );

    zones.push(
      { id: `${pfx}_tl_sb`, type: 'speed_belt', x: -6.4 * mirror, z: 2.5, width: 3.0, length: 9.5 },
      { id: `${pfx}_tl_jp`, type: 'jump_pad', x: 0, z: 7.2, width: 3.0, length: 2.4 },
      { id: `${pfx}_tl_hs`, type: 'heal_sanctuary', x: 0, z: -1.5, width: 3.4, length: 3.4 },
      { id: `${pfx}_tl_tm`, type: 'toxic_mire', x: 6.4 * mirror, z: 1.2, width: 3.2, length: 5.2 }
    );

    bumpers.push(
      { id: `${pfx}_tl_b1`, x: -3.6, z: 3.0, radius: 0.78 },
      { id: `${pfx}_tl_b2`, x: 3.6, z: 3.0, radius: 0.78 }
    );

    gates.push(
      {
        id: `${pfx}_tl_c1`,
        x: 0,
        z: 13.4,
        width: 3.6,
        op: 'sub',
        value: hazSubVal,
        style: 'hazard',
        moveRangeX: 0.65,
        moveSpeed: 1.4,
      },
      {
        id: `${pfx}_tl_c2`,
        x: 0,
        z: 3.2,
        width: 4.6,
        op: 'mul',
        value: 2,
        style: 'gold',
        moveRangeX: 1.4,
        moveSpeed: 1.5,
      },
      {
        id: `${pfx}_tl_l_0`,
        x: -6.8 * mirror,
        z: 12.2,
        width: 4.8,
        op: 'add',
        value: 2,
        style: 'blue',
        moveRangeX: 1.2,
        moveSpeed: 1.4,
      },
      {
        id: `${pfx}_tl_l_1`,
        x: -6.8 * mirror,
        z: 4.5,
        width: 4.6,
        op: 'mul',
        value: 2,
        style: 'gold',
        moveRangeX: 1.2,
        moveSpeed: 1.45,
      },
      {
        id: `${pfx}_tl_r1`,
        x: 6.8 * mirror,
        z: 12.2,
        width: 4.8,
        op: 'add',
        value: 2,
        style: 'blue',
        moveRangeX: 1.2,
        moveSpeed: 1.4,
        movePhase: 0,
      },
      {
        id: `${pfx}_tl_r2`,
        x: 6.8 * mirror,
        z: 4.5,
        width: 4.6,
        op: 'mul',
        value: 2,
        style: 'gold',
        moveRangeX: 1.2,
        moveSpeed: 1.45,
        movePhase: 2.2,
      },
      {
        id: `${pfx}_tl_mega`,
        x: -1.8 * mirror,
        z: -8.4,
        width: 5.2,
        op: 'mul',
        value: 3,
        style: 'mega',
        moveRangeX: 3.2,
        moveSpeed: 1.6,
        movePhase: 0,
      },
      {
        id: `${pfx}_tl_fhaz`,
        x: 5.0 * mirror,
        z: -3.2,
        width: 3.4,
        op: 'div',
        value: 2,
        style: 'hazard',
        moveRangeX: 1.4,
        moveSpeed: 1.55,
        movePhase: 3.14,
      }
    );

    gears.push({
      id: `${pfx}_tl_gc`,
      x: 0,
      z: 9.6,
      radius: 1.75,
      hp: baseGearHp,
    });

    nests.push({
      id: `${pfx}_tl_nest`,
      x: 7.5 * mirror,
      z: -4.8,
      hp: baseNestHp,
      name: rng.pick(NEST_NAMES),
      rewardGold: baseNestGold,
    });
  } else if (archetype === 'pinball_plaza') {
    // NEW ARCHETYPE 7: Arcade Pinball Funnel + 5 Electromagnetic Bumpers + Side Speed Tracks!
    walls.push(
      { x1: -8.4, z1: 9.6, x2: -3.2, z2: 5.8 },
      { x1: 8.4, z1: 9.6, x2: 3.2, z2: 5.8 },
      { x1: -2.6, z1: -1.8, x2: -6.2, z2: -5.4 },
      { x1: 2.6, z1: -1.8, x2: 6.2, z2: -5.4 }
    );

    bumpers.push(
      { id: `${pfx}_pb1`, x: 0, z: 5.2, radius: 0.95 },
      { id: `${pfx}_pb2`, x: -2.6, z: 2.6, radius: 0.9 },
      { id: `${pfx}_pb3`, x: 2.6, z: 2.6, radius: 0.9 },
      { id: `${pfx}_pb4`, x: -4.6, z: -0.2, radius: 0.85 },
      { id: `${pfx}_pb5`, x: 4.6, z: -0.2, radius: 0.85 }
    );

    zones.push(
      { id: `${pfx}_pb_sb1`, type: 'speed_belt', x: -6.8, z: 1.8, width: 2.5, length: 6.0 },
      { id: `${pfx}_pb_sb2`, type: 'speed_belt', x: 6.8, z: 1.8, width: 2.5, length: 6.0 },
      { id: `${pfx}_pb_hs`, type: 'heal_sanctuary', x: 0, z: -0.2, width: 3.6, length: 3.2 }
    );

    gates.push(
      {
        id: `${pfx}_pb_haz0`,
        x: 0,
        z: 13.4,
        width: 3.4,
        op: 'sub',
        value: hazSubVal,
        style: 'hazard',
        moveRangeX: 0.8,
        moveSpeed: 1.4,
      },
      {
        id: `${pfx}_pb_l1`,
        x: -5.8,
        z: 12.2,
        width: 4.8,
        op: 'add',
        value: 3,
        style: 'blue',
        moveRangeX: 1.4,
        moveSpeed: 1.4,
      },
      {
        id: `${pfx}_pb_r1`,
        x: 5.8,
        z: 12.2,
        width: 4.8,
        op: 'add',
        value: 3,
        style: 'blue',
        moveRangeX: 1.4,
        moveSpeed: 1.4,
      },
      {
        id: `${pfx}_pb_l2`,
        x: -6.0,
        z: -2.4,
        width: 4.6,
        op: 'mul',
        value: 2,
        style: 'gold',
        moveRangeX: 1.5,
        moveSpeed: 1.5,
      },
      {
        id: `${pfx}_pb_r2`,
        x: 6.0,
        z: -2.4,
        width: 4.6,
        op: 'mul',
        value: 2,
        style: 'gold',
        moveRangeX: 1.5,
        moveSpeed: 1.5,
      },
      {
        id: `${pfx}_pb_mega`,
        x: 0,
        z: -8.6,
        width: 5.4,
        op: 'mul',
        value: 3,
        style: 'mega',
        moveRangeX: 3.4,
        moveSpeed: 1.65,
      }
    );

    nests.push({
      id: `${pfx}_pb_nest`,
      x: 7.6 * mirror,
      z: -7.5,
      hp: baseNestHp,
      name: rng.pick(NEST_NAMES),
      rewardGold: baseNestGold,
    });
  } else if (archetype === 'hourglass_choke') {
    // NEW ARCHETYPE 8: Hourglass Constriction Choke (> <) + Flank Jump Pads over the Choke!
    walls.push(
      { x1: -8.2, z1: 8.8, x2: -2.5, z2: 3.2 },
      { x1: 8.2, z1: 8.8, x2: 2.5, z2: 3.2 },
      { x1: -2.5, z1: 0.4, x2: -7.8, z2: -4.8 },
      { x1: 2.5, z1: 0.4, x2: 7.8, z2: -4.8 }
    );

    zones.push(
      { id: `${pfx}_hg_tm`, type: 'toxic_mire', x: 0, z: 1.8, width: 3.8, length: 3.6 },
      { id: `${pfx}_hg_jp1`, type: 'jump_pad', x: -6.2, z: 6.8, width: 2.8, length: 2.4 },
      { id: `${pfx}_hg_jp2`, type: 'jump_pad', x: 6.2, z: 6.8, width: 2.8, length: 2.4 },
      { id: `${pfx}_hg_sb`, type: 'speed_belt', x: 0, z: -4.2, width: 3.2, length: 5.0 }
    );

    bumpers.push(
      { id: `${pfx}_hg_b1`, x: -3.6, z: -2.2, radius: 0.85 },
      { id: `${pfx}_hg_b2`, x: 3.6, z: -2.2, radius: 0.85 }
    );

    gates.push(
      {
        id: `${pfx}_hg_haz0`,
        x: 0,
        z: 13.4,
        width: 3.6,
        op: 'sub',
        value: hazSubVal,
        style: 'hazard',
        moveRangeX: 0.7,
        moveSpeed: 1.4,
      },
      {
        id: `${pfx}_hg_l1`,
        x: -6.2,
        z: 12.0,
        width: 4.8,
        op: 'add',
        value: 2,
        style: 'blue',
        moveRangeX: 1.4,
        moveSpeed: 1.4,
      },
      {
        id: `${pfx}_hg_r1`,
        x: 6.2,
        z: 12.0,
        width: 4.8,
        op: 'add',
        value: 2,
        style: 'blue',
        moveRangeX: 1.4,
        moveSpeed: 1.4,
      },
      {
        id: `${pfx}_hg_mid`,
        x: 0,
        z: 4.6,
        width: 4.6,
        op: 'mul',
        value: 2,
        style: 'gold',
        moveRangeX: 1.2,
        moveSpeed: 1.45,
      },
      {
        id: `${pfx}_hg_l2`,
        x: -5.4 * mirror,
        z: -2.6,
        width: 4.6,
        op: 'mul',
        value: 2,
        style: 'gold',
        moveRangeX: 1.6,
        moveSpeed: 1.55,
      },
      {
        id: `${pfx}_hg_mega`,
        x: 0,
        z: -8.6,
        width: 5.2,
        op: 'mul',
        value: 3,
        style: 'mega',
        moveRangeX: 3.2,
        moveSpeed: 1.6,
      }
    );

    gears.push({
      id: `${pfx}_hg_g1`,
      x: 5.6 * mirror,
      z: 1.8,
      radius: 1.85,
      hp: baseGearHp,
    });

    nests.push({
      id: `${pfx}_hg_n1`,
      x: -7.5 * mirror,
      z: -7.2,
      hp: baseNestHp,
      name: rng.pick(NEST_NAMES),
      rewardGold: baseNestGold,
    });
  } else if (archetype === 'diamond_citadel') {
    // NEW ARCHETYPE 9: Twin Staggered Diamond Islands + Sliding Blast Door + Dual Sanctuaries!
    walls.push(
      // Rear Diamond Island (centered at x = -3.0 * mirror, z = 6.2)
      { x1: -3.0 * mirror, z1: 9.0, x2: -5.6 * mirror, z2: 6.2 },
      { x1: -3.0 * mirror, z1: 9.0, x2: -0.4 * mirror, z2: 6.2 },
      { x1: -5.6 * mirror, z1: 5.4, x2: -3.0 * mirror, z2: 2.8 },
      { x1: -0.4 * mirror, z1: 5.4, x2: -3.0 * mirror, z2: 2.8 },
      // Front Diamond Island (centered at x = 3.0 * mirror, z = -1.2)
      { x1: 3.0 * mirror, z1: 1.6, x2: 0.4 * mirror, z2: -1.2 },
      { x1: 3.0 * mirror, z1: 1.6, x2: 5.6 * mirror, z2: -1.2 },
      { x1: 0.4 * mirror, z1: -2.0, x2: 3.0 * mirror, z2: -4.6 },
      { x1: 5.6 * mirror, z1: -2.0, x2: 3.0 * mirror, z2: -4.6 }
    );

    zones.push(
      { id: `${pfx}_dc_sb1`, type: 'speed_belt', x: 4.8 * mirror, z: 6.0, width: 2.8, length: 5.6 },
      { id: `${pfx}_dc_sb2`, type: 'speed_belt', x: -4.8 * mirror, z: -1.4, width: 2.8, length: 5.6 },
      { id: `${pfx}_dc_hs`, type: 'heal_sanctuary', x: 0, z: 2.2, width: 3.4, length: 3.0 }
    );

    bumpers.push(
      { id: `${pfx}_dc_b1`, x: 0, z: 9.2, radius: 0.85 },
      { id: `${pfx}_dc_b2`, x: 0, z: -4.8, radius: 0.85 }
    );

    gates.push(
      {
        id: `${pfx}_dc_haz0`,
        x: 0,
        z: 13.4,
        width: 3.5,
        op: 'sub',
        value: hazSubVal,
        style: 'hazard',
        moveRangeX: 0.65,
        moveSpeed: 1.4,
      },
      {
        id: `${pfx}_dc_l1`,
        x: -6.2,
        z: 12.2,
        width: 4.8,
        op: 'add',
        value: 2,
        style: 'blue',
        moveRangeX: 1.4,
        moveSpeed: 1.4,
      },
      {
        id: `${pfx}_dc_r1`,
        x: 6.2,
        z: 12.2,
        width: 4.8,
        op: 'add',
        value: 2,
        style: 'blue',
        moveRangeX: 1.4,
        moveSpeed: 1.4,
      },
      {
        id: `${pfx}_dc_g1`,
        x: 4.8 * mirror,
        z: 5.8,
        width: 4.6,
        op: 'mul',
        value: 2,
        style: 'gold',
        moveRangeX: 1.5,
        moveSpeed: 1.5,
      },
      {
        id: `${pfx}_dc_g2`,
        x: -4.8 * mirror,
        z: -1.6,
        width: 4.6,
        op: 'mul',
        value: 2,
        style: 'gold',
        moveRangeX: 1.5,
        moveSpeed: 1.5,
      },
      {
        id: `${pfx}_dc_mega`,
        x: 0,
        z: -8.6,
        width: 5.2,
        op: 'mul',
        value: 3,
        style: 'mega',
        moveRangeX: 3.4,
        moveSpeed: 1.65,
      }
    );

    nests.push({
      id: `${pfx}_dc_n1`,
      x: 7.6 * mirror,
      z: -7.0,
      hp: baseNestHp,
      name: rng.pick(NEST_NAMES),
      rewardGold: baseNestGold,
    });
  } else if (archetype === 'conveyor_labyrinth') {
    // NEW ARCHETYPE 10: Dual Dynamic Sliding Blast Doors + Multi-Belt Labyrinth + Jump Pads!
    walls.push(
      { x1: -2.4, z1: 7.6, x2: 2.4, z2: 7.6, moveRangeX: 3.8, moveSpeed: 1.45, movePhase: 0 },
      { x1: -2.4, z1: 0.6, x2: 2.4, z2: 0.6, moveRangeX: 3.8, moveSpeed: 1.45, movePhase: 3.14 },
      { x1: -6.8 * mirror, z1: 4.8, x2: -2.8 * mirror, z2: 2.8 },
      { x1: 6.8 * mirror, z1: -2.2, x2: 2.8 * mirror, z2: -4.2 }
    );

    zones.push(
      { id: `${pfx}_cl_sb1`, type: 'speed_belt', x: -5.8 * mirror, z: 8.8, width: 2.8, length: 4.8 },
      { id: `${pfx}_cl_sb2`, type: 'speed_belt', x: 5.8 * mirror, z: 3.6, width: 2.8, length: 5.2 },
      { id: `${pfx}_cl_jp1`, type: 'jump_pad', x: 0, z: 9.4, width: 2.8, length: 2.2 },
      { id: `${pfx}_cl_tm1`, type: 'toxic_mire', x: -4.6 * mirror, z: -2.6, width: 3.4, length: 3.2 }
    );

    bumpers.push(
      { id: `${pfx}_cl_b1`, x: 2.4 * mirror, z: 4.2, radius: 0.85 },
      { id: `${pfx}_cl_b2`, x: -2.4 * mirror, z: -2.8, radius: 0.85 }
    );

    gates.push(
      {
        id: `${pfx}_cl_haz0`,
        x: 0,
        z: 13.4,
        width: 3.5,
        op: 'sub',
        value: hazSubVal,
        style: 'hazard',
        moveRangeX: 0.7,
        moveSpeed: 1.4,
      },
      {
        id: `${pfx}_cl_l1`,
        x: -6.2,
        z: 12.2,
        width: 4.8,
        op: 'add',
        value: 2,
        style: 'blue',
        moveRangeX: 1.5,
        moveSpeed: 1.4,
      },
      {
        id: `${pfx}_cl_r1`,
        x: 6.2,
        z: 12.2,
        width: 4.8,
        op: 'add',
        value: 2,
        style: 'blue',
        moveRangeX: 1.5,
        moveSpeed: 1.4,
      },
      {
        id: `${pfx}_cl_g1`,
        x: 5.4 * mirror,
        z: 4.8,
        width: 4.8,
        op: 'mul',
        value: 2,
        style: 'gold',
        moveRangeX: 1.8,
        moveSpeed: 1.5,
      },
      {
        id: `${pfx}_cl_g2`,
        x: -5.4 * mirror,
        z: -1.8,
        width: 4.8,
        op: 'mul',
        value: 2,
        style: 'gold',
        moveRangeX: 1.8,
        moveSpeed: 1.5,
      },
      {
        id: `${pfx}_cl_mega`,
        x: 0,
        z: -8.6,
        width: 5.2,
        op: 'mul',
        value: 3,
        style: 'mega',
        moveRangeX: 3.4,
        moveSpeed: 1.65,
      }
    );

    gears.push({
      id: `${pfx}_cl_gr1`,
      x: 0,
      z: -4.2,
      radius: 1.85,
      hp: baseGearHp,
      moveRangeX: 2.2,
      moveSpeed: 1.5,
    });

    nests.push({
      id: `${pfx}_cl_n1`,
      x: -7.6 * mirror,
      z: -6.8,
      hp: baseNestHp,
      name: rng.pick(NEST_NAMES),
      rewardGold: baseNestGold,
    });
  } else {
    // chaos_overdrive: Honeycomb Pinball + Dynamic Barrier + Composite Arena
    gates.push(
      {
        id: `${pfx}_co_haz0`,
        x: 0,
        z: 13.4,
        width: 3.6,
        op: 'sub',
        value: hazSubVal,
        style: 'hazard',
        moveRangeX: 0.65,
        moveSpeed: 1.4,
        movePhase: 0,
      },
      {
        id: `${pfx}_co_l_0`,
        x: -6.4 * mirror,
        z: 12.2,
        width: 4.8,
        op: 'add',
        value: 2,
        style: 'blue',
        moveRangeX: 1.5,
        moveSpeed: 1.4,
      },
      {
        id: `${pfx}_co_r_0`,
        x: 6.4 * mirror,
        z: 12.2,
        width: 4.8,
        op: 'add',
        value: 2,
        style: 'blue',
        moveRangeX: 1.5,
        moveSpeed: 1.4,
      },
      {
        id: `${pfx}_co_l_1`,
        x: -5.8 * mirror,
        z: 5.4,
        width: 4.8,
        op: 'mul',
        value: 2,
        style: 'gold',
        moveRangeX: 1.8,
        moveSpeed: 1.5,
      },
      {
        id: `${pfx}_co_c2`,
        x: 3.6 * mirror,
        z: 2.2,
        width: 4.8,
        op: 'mul',
        value: 2,
        style: 'gold',
        moveRangeX: 2.4,
        moveSpeed: 1.55,
        movePhase: 1.2,
      },
      {
        id: `${pfx}_co_haz2`,
        x: -4.5 * mirror,
        z: -2.6,
        width: 3.4,
        op: 'div',
        value: 2,
        style: 'hazard',
        moveRangeX: 1.5,
        moveSpeed: 1.55,
        movePhase: 4.3,
      },
      {
        id: `${pfx}_co_mega`,
        x: 0,
        z: -8.4,
        width: 5.2,
        op: 'mul',
        value: 3,
        style: 'mega',
        moveRangeX: 3.6,
        moveSpeed: 1.65,
        movePhase: 0,
      }
    );

    walls.push(
      { x1: -4.2 * mirror, z1: 8.6, x2: -1.8 * mirror, z2: 3.2 },
      { x1: 4.2 * mirror, z1: 6.2, x2: 1.8 * mirror, z2: 0.8 },
      { x1: -2.8 * mirror, z1: -0.8, x2: 1.2 * mirror, z2: -3.6 },
      { x1: -2.0, z1: -5.5, x2: 2.0, z2: -5.5, moveRangeX: 3.2, moveSpeed: 1.55, movePhase: 1.0 }
    );

    zones.push(
      { id: `${pfx}_co_sb`, type: 'speed_belt', x: 6.4 * mirror, z: 7.2, width: 2.6, length: 5.0 },
      { id: `${pfx}_co_jp`, type: 'jump_pad', x: -6.2 * mirror, z: 2.2, width: 2.6, length: 2.2 },
      { id: `${pfx}_co_hs`, type: 'heal_sanctuary', x: 0, z: 4.8, width: 3.2, length: 3.0 }
    );

    bumpers.push(
      { id: `${pfx}_co_b1`, x: 0, z: 8.2, radius: 0.88 },
      { id: `${pfx}_co_b2`, x: -2.8 * mirror, z: 1.0, radius: 0.85 },
      { id: `${pfx}_co_b3`, x: 3.2 * mirror, z: -2.2, radius: 0.85 }
    );

    gears.push({
      id: `${pfx}_co_g1`,
      x: 6.2 * mirror,
      z: -2.4,
      radius: 1.9,
      hp: baseGearHp,
      moveRangeX: 1.6,
      moveSpeed: 1.4,
    });

    nests.push({
      id: `${pfx}_co_n1`,
      x: 7.8 * mirror,
      z: -6.8,
      hp: baseNestHp,
      name: rng.pick(NEST_NAMES),
      rewardGold: baseNestGold,
    });
  }

  const themeId: ThemeId = THEME_ORDER[(safeStage - 1) % THEME_ORDER.length];
  const isMegaBoss = safeStage % 10 === 0;
  const isMiniBoss = safeStage % 10 === 5;
  const isMilestoneBoss = isMegaBoss || isMiniBoss || safeStage % 4 === 0;

  // MC-1: Inject Tactical Functional Gates ("果冻巨化门" & "糖霜护盾门") with automatic clearance validation
  const isClearForSpecialGate = (gx: number, gz: number, gw: number, moveRange = 0.8): boolean => {
    for (const g of gates) {
      const zGap = Math.abs(gz - g.z);
      const xSpan = (gw + g.width) * 0.5 + moveRange + (g.moveRangeX || 0) + 0.75;
      if (zGap < 2.25 && Math.abs(gx - g.x) < xSpan) return false;
    }
    for (const w of walls) {
      const padX = (w.moveRangeX || 0) + gw * 0.5 + 0.65;
      const minX = Math.min(w.x1, w.x2) - padX;
      const maxX = Math.max(w.x1, w.x2) + padX;
      const minZ = Math.min(w.z1, w.z2) - 1.0;
      const maxZ = Math.max(w.z1, w.z2) + 1.0;
      if (gx >= minX && gx <= maxX && gz >= minZ && gz <= maxZ) return false;
    }
    for (const gr of gears) {
      const padX = (gr.moveRangeX || 0) + gr.radius + gw * 0.5 + 0.65;
      if (Math.abs(gx - gr.x) < padX && Math.abs(gz - gr.z) < gr.radius + 1.15) return false;
    }
    for (const bm of bumpers) {
      if (Math.abs(gz - bm.z) < bm.radius + 1.1 && Math.abs(gx - bm.x) < bm.radius + gw * 0.5 + 0.6) {
        return false;
      }
    }
    return true;
  };

  const jellyCandidateSlots: Array<[number, number]> = [
    [-3.8 * mirror, 8.6],
    [3.8 * mirror, 8.6],
    [-5.2 * mirror, 6.8],
    [5.2 * mirror, 6.8],
    [0, 7.6],
    [-4.6 * mirror, 0.2],
    [4.6 * mirror, 0.2],
    [-6.2 * mirror, 9.6],
  ];
  for (const [jx, jz] of jellyCandidateSlots) {
    if (isClearForSpecialGate(jx, jz, 3.8, 0.75)) {
      gates.push({
        id: `${pfx}_jelly_giant`,
        x: Number(jx.toFixed(2)),
        z: jz,
        width: 3.8,
        op: 'giant_jelly',
        value: 2,
        style: 'jelly',
        moveRangeX: 0.75,
        moveSpeed: 1.28,
        movePhase: 0.6,
      });
      break;
    }
  }
  if (!gates.some((g) => g.op === 'giant_jelly')) {
    gates.push({
      id: `${pfx}_jelly_giant`,
      x: Number((-5.8 * mirror).toFixed(2)),
      z: 9.8,
      width: 3.6,
      op: 'giant_jelly',
      value: 2,
      style: 'jelly',
      moveRangeX: 0.6,
      moveSpeed: 1.25,
      movePhase: 0.6,
    });
  }

  const frostCandidateSlots: Array<[number, number]> = [
    [3.8 * mirror, 6.6],
    [-3.8 * mirror, 6.6],
    [5.2 * mirror, 3.2],
    [-5.2 * mirror, 3.2],
    [0, 2.8],
    [4.8 * mirror, -5.8],
    [-4.8 * mirror, -5.8],
    [6.2 * mirror, 9.6],
  ];
  for (const [fx, fz] of frostCandidateSlots) {
    if (isClearForSpecialGate(fx, fz, 3.8, 0.75)) {
      gates.push({
        id: `${pfx}_frost_shield`,
        x: Number(fx.toFixed(2)),
        z: fz,
        width: 3.8,
        op: 'frost_shield',
        value: 1,
        style: 'frost',
        moveRangeX: 0.75,
        moveSpeed: 1.32,
        movePhase: 2.1,
      });
      break;
    }
  }
  if (!gates.some((g) => g.op === 'frost_shield')) {
    gates.push({
      id: `${pfx}_frost_shield`,
      x: Number((5.8 * mirror).toFixed(2)),
      z: 6.2,
      width: 3.6,
      op: 'frost_shield',
      value: 1,
      style: 'frost',
      moveRangeX: 0.6,
      moveSpeed: 1.3,
      movePhase: 2.1,
    });
  }
  const finalRewardGold = isMegaBoss
    ? Math.round(rewardGold * 2.5)
    : isMiniBoss
      ? Math.round(rewardGold * 1.85)
      : isMilestoneBoss
        ? Math.round(rewardGold * 1.65)
        : rewardGold;
  const resolvedBossName = isMegaBoss
    ? MEGA_BOSS_ROSTER[(Math.floor(safeStage / 10) - 1) % MEGA_BOSS_ROSTER.length]
    : isMiniBoss
      ? MINI_BOSS_ROSTER[Math.floor((safeStage - 5) / 10) % MINI_BOSS_ROSTER.length]
      : bossName;

  // Spawn 2-4 Explosive Plasma Barrels along the mid-field battlefront for chain-reaction crowd clearing!
  // Automatically validates clearance against walls (including sliding doors), gears, gates, and bumpers!
  const barrels: BarrelConfig[] = [];
  const candidateSlots: Array<[number, number]> = [
    [-3.2 * mirror, 2.2],
    [3.4 * mirror, -0.8],
    [-4.8 * mirror, -4.2],
    [4.8 * mirror, -4.2],
    [0, 1.2],
    [-2.6 * mirror, -3.4],
    [2.6 * mirror, 3.8],
    [-5.6 * mirror, 0.8],
    [5.6 * mirror, 0.8],
    [0, -6.8],
  ];
  const isPointClearForBarrel = (px: number, pz: number): boolean => {
    for (const w of walls) {
      const padX = (w.moveRangeX || 0) + 1.15;
      const minX = Math.min(w.x1, w.x2) - padX;
      const maxX = Math.max(w.x1, w.x2) + padX;
      const minZ = Math.min(w.z1, w.z2) - 1.15;
      const maxZ = Math.max(w.z1, w.z2) + 1.15;
      if (px >= minX && px <= maxX && pz >= minZ && pz <= maxZ) return false;
    }
    for (const gr of gears) {
      const padX = (gr.moveRangeX || 0) + gr.radius + 1.2;
      if (Math.abs(px - gr.x) < padX && Math.abs(pz - gr.z) < gr.radius + 1.2) return false;
    }
    for (const g of gates) {
      if (Math.abs(pz - g.z) < 1.35 && Math.abs(px - g.x) < g.width * 0.5 + (g.moveRangeX || 0) + 0.9) {
        return false;
      }
    }
    for (const bm of bumpers) {
      if (Math.hypot(px - bm.x, pz - bm.z) < bm.radius + 1.35) return false;
    }
    for (const existing of barrels) {
      if (Math.hypot(px - existing.x, pz - existing.z) < 2.6) return false;
    }
    return true;
  };

  const barrelCount = isMilestoneBoss ? 4 : rng.int(2, 3);
  const barrelHp = Math.min(8, 3 + Math.floor(safeStage / 4));
  for (const [bx, bz] of candidateSlots) {
    if (barrels.length >= barrelCount) break;
    const tx = bx + rng.range(-0.35, 0.35);
    const tz = bz + rng.range(-0.3, 0.3);
    if (isPointClearForBarrel(tx, tz)) {
      barrels.push({
        id: `${pfx}_barrel_${barrels.length}`,
        x: Number(tx.toFixed(2)),
        z: Number(tz.toFixed(2)),
        hp: barrelHp,
      });
    }
  }

  const scaledBossMaxHp = isMegaBoss
    ? Math.round(bossMaxHp * 1.9)
    : isMiniBoss
      ? Math.round(bossMaxHp * 1.42)
      : isMilestoneBoss
        ? Math.round(bossMaxHp * 1.2)
        : bossMaxHp;

  const bossSubTowers: BossSubTowerConfig[] = [];
  if (isMegaBoss || isMiniBoss) {
    const subHp = Math.max(85, Math.round(scaledBossMaxHp * (isMegaBoss ? 0.24 : 0.2)));
    const subGold = Math.max(25, Math.round(finalRewardGold * 0.16));
    bossSubTowers.push(
      {
        id: `subtower_left_${safeStage}`,
        side: 'left',
        name: '左翼蒸汽护盾塔',
        x: -6.2,
        z: -13.8,
        hp: subHp,
        rewardGold: subGold,
      },
      {
        id: `subtower_right_${safeStage}`,
        side: 'right',
        name: '右翼蒸汽护盾塔',
        x: 6.2,
        z: -13.8,
        hp: subHp,
        rewardGold: subGold,
      }
    );
  }

  const weatherAffix = WEATHER_AFFIX_CATALOG[WEATHER_AFFIX_ORDER[(safeStage - 1 + (seed % 2 === 0 ? 0 : 1)) % WEATHER_AFFIX_ORDER.length]];

  const isZoneSpotClear = (zx: number, zz: number, zw: number, zl: number): boolean => {
    for (const ez of zones) {
      if (Math.abs(zx - ez.x) < (zw + ez.width) * 0.5 + 0.55 && Math.abs(zz - ez.z) < (zl + ez.length) * 0.5 + 0.55) {
        return false;
      }
    }
    for (const w of walls) {
      const minX = Math.min(w.x1, w.x2) - zw * 0.45 - 0.35;
      const maxX = Math.max(w.x1, w.x2) + zw * 0.45 + 0.35;
      const minZ = Math.min(w.z1, w.z2) - zl * 0.45 - 0.35;
      const maxZ = Math.max(w.z1, w.z2) + zl * 0.45 + 0.35;
      if (zx >= minX && zx <= maxX && zz >= minZ && zz <= maxZ) return false;
    }
    for (const g of gates) {
      if (Math.abs(zz - g.z) < zl * 0.4 + 0.8 && Math.abs(zx - g.x) < (zw + g.width) * 0.42) {
        return false;
      }
    }
    for (const bm of bumpers) {
      if (Math.hypot(zx - bm.x, zz - bm.z) < bm.radius + Math.max(zw, zl) * 0.45 + 0.4) return false;
    }
    for (const br of barrels) {
      if (Math.hypot(zx - br.x, zz - br.z) < Math.max(zw, zl) * 0.45 + 0.55) return false;
    }
    return true;
  };

  const placeAffixZone = (
    type: 'tailwind_belt' | 'emp_zone' | 'frosting_pad',
    zw: number,
    zl: number,
    candidates: Array<[number, number]>
  ): void => {
    if (zones.some((z) => z.type === type)) return;
    for (const [cx, cz] of candidates) {
      if (isZoneSpotClear(cx, cz, zw, zl)) {
        zones.push({
          id: `${pfx}_${type}_${zones.length}`,
          type,
          x: Number(cx.toFixed(2)),
          z: Number(cz.toFixed(2)),
          width: zw,
          length: zl,
        });
        return;
      }
    }
    // Fallback flank corridor near player entry / mid-bridge so deterministic affix zones always appear cleanly
    const fallbackX = type === 'tailwind_belt' ? -7.6 * mirror : type === 'frosting_pad' ? 7.6 * mirror : 0;
    const fallbackZ = type === 'tailwind_belt' ? 15.2 : type === 'frosting_pad' ? 6.2 : -9.8;
    zones.push({
      id: `${pfx}_${type}_fb`,
      type,
      x: Number(fallbackX.toFixed(2)),
      z: Number(fallbackZ.toFixed(2)),
      width: zw,
      length: zl,
    });
  };

  placeAffixZone('tailwind_belt', 3.4, 3.8, [
    [-6.2 * mirror, 14.2],
    [6.2 * mirror, 14.2],
    [0, 14.4],
    [-6.6 * mirror, 8.2],
  ]);
  placeAffixZone('frosting_pad', 2.8, 2.4, [
    [5.8 * mirror, 6.4],
    [-5.8 * mirror, 6.4],
    [0, 5.8],
    [6.4 * mirror, 1.4],
  ]);
  placeAffixZone('emp_zone', 3.6, 3.6, [
    [0, -7.8],
    [-4.8 * mirror, -7.4],
    [4.8 * mirror, -7.4],
    [0, -10.4],
  ]);

  return {
    id: safeStage,
    seed,
    themeId,
    archetype,
    weatherAffix,
    archetypeName: isMegaBoss
      ? `👑十关机制大Boss · ${info.tag}`
      : isMiniBoss
        ? `👹五关先锋小Boss · ${info.tag}`
        : isMilestoneBoss
          ? `⚡超频决战 · ${info.tag}`
          : info.tag,
    isMilestoneBoss,
    isMiniBoss,
    isMegaBoss,
    name: isMegaBoss
      ? `第 ${safeStage} 关：👑 ${resolvedBossName}`
      : isMiniBoss
        ? `第 ${safeStage} 关：👹 ${resolvedBossName}`
        : `第 ${safeStage} 关：${info.title}`,
    subtitle: `[随机地形 #${seed % 10000}] ${info.desc}`,
    bossName: resolvedBossName,
    bossMaxHp: scaledBossMaxHp,
    enemySpawnInterval: isMegaBoss
      ? Number(Math.max(0.36, enemySpawnInterval * 0.82).toFixed(3))
      : isMiniBoss
        ? Number(Math.max(0.38, enemySpawnInterval * 0.9).toFixed(3))
        : enemySpawnInterval,
    enemyBurstCount: isMegaBoss
      ? Math.min(22, enemyBurstCount + 3)
      : isMiniBoss
        ? Math.min(20, enemyBurstCount + 2)
        : enemyBurstCount,
    initialRedPrewarm,
    bruteSpawnInterval,
    rewardGold: finalRewardGold,
    gates,
    walls,
    gears,
    nests,
    barrels,
    zones,
    bumpers,
    bossSubTowers,
  };
}

export function generateCandyVaultBonusLevel(milestoneStage: number): LevelConfig {
  const safeMilestone = Math.max(5, Math.floor(milestoneStage));
  const tier = Math.max(1, Math.floor(safeMilestone / 5));
  const themeId = THEME_ORDER[(tier - 1) % THEME_ORDER.length];
  const candyVaults: CandyVaultConfig[] = [
    {
      id: 'vault_left_front',
      x: -5.6,
      z: -7.0,
      hp: 150 + tier * 45,
      rewardGold: 420 + tier * 140,
      rewardShards: 1,
      name: '焦糖储蓄金库',
    },
    {
      id: 'vault_center_front',
      x: 0,
      z: -6.4,
      hp: 180 + tier * 55,
      rewardGold: 520 + tier * 160,
      rewardShards: 1,
      name: '皇家蜂蜜金库',
    },
    {
      id: 'vault_right_front',
      x: 5.6,
      z: -7.0,
      hp: 150 + tier * 45,
      rewardGold: 420 + tier * 140,
      rewardShards: 1,
      name: '焦糖储蓄金库',
    },
    {
      id: 'vault_left_grand',
      x: -3.8,
      z: -12.0,
      hp: 230 + tier * 70,
      rewardGold: 680 + tier * 200,
      rewardShards: 2,
      name: '太妃至尊金库塔',
      isGrand: true,
    },
    {
      id: 'vault_right_grand',
      x: 3.8,
      z: -12.0,
      hp: 230 + tier * 70,
      rewardGold: 680 + tier * 200,
      rewardShards: 2,
      name: '星糖至尊金库塔',
      isGrand: true,
    },
  ];

  return {
    id: safeMilestone,
    seed: 77700 + safeMilestone,
    themeId,
    archetype: 'chaos_overdrive',
    archetypeName: '25s 限时暴爽奖励关 · 零红军干扰',
    isMilestoneBoss: false,
    isMiniBoss: false,
    isMegaBoss: false,
    isBonusHeist: true,
    bonusHeistDurationSec: 25,
    candyVaults,
    weatherAffix: WEATHER_AFFIX_CATALOG.sugar_snow_updraft,
    name: `糖果金库大劫案（第 ${safeMilestone} 关奖励）`,
    subtitle: '零红军 · 穿倍增门轰碎金库塔',
    bossName: '至尊糖果总金库',
    bossMaxHp: 720 + tier * 240,
    enemySpawnInterval: 999,
    enemyBurstCount: 0,
    initialRedPrewarm: 0,
    bruteSpawnInterval: 0,
    rewardGold: 850 + tier * 250,
    gates: [
      { id: 'bh_g1', x: -4.2, z: 9.2, width: 4.8, op: 'mul', value: 3, style: 'gold', moveRangeX: 2.6, moveSpeed: 1.45, movePhase: 0 },
      { id: 'bh_g2', x: 4.2, z: 9.2, width: 4.8, op: 'add', value: 8, style: 'blue', moveRangeX: 2.6, moveSpeed: 1.45, movePhase: Math.PI },
      { id: 'bh_g3', x: -3.8, z: 3.4, width: 4.6, op: 'giant_jelly', value: 2, style: 'jelly', moveRangeX: 2.8, moveSpeed: 1.3, movePhase: 0.7 },
      { id: 'bh_g4', x: 3.8, z: 3.4, width: 4.8, op: 'mul', value: 4, style: 'mega', moveRangeX: 2.8, moveSpeed: 1.3, movePhase: 3.84 },
      { id: 'bh_g5', x: 0, z: -1.8, width: 5.8, op: 'mul', value: 3, style: 'gold', moveRangeX: 4.2, moveSpeed: 1.65, movePhase: 1.57 },
    ],
    walls: [],
    gears: [],
    nests: [],
    barrels: [],
    zones: [
      { id: 'bh_belt_l', type: 'tailwind_belt', x: -4.2, z: 6.4, width: 4.2, length: 4.0 },
      { id: 'bh_belt_r', type: 'tailwind_belt', x: 4.2, z: 6.4, width: 4.2, length: 4.0 },
      { id: 'bh_pad_c', type: 'frosting_pad', x: 0, z: 1.0, width: 3.2, length: 2.6 },
    ],
    bumpers: [],
    bossSubTowers: [],
  };
}

export function generateEndlessDefenseLevel(): LevelConfig {
  return {
    id: 1,
    seed: 88888,
    themeId: THEME_ORDER[0],
    archetype: 'trilane_siege',
    archetypeName: '无尽工坊保卫战 · 波次递增生存',
    isMilestoneBoss: false,
    isMiniBoss: false,
    isMegaBoss: false,
    isEndlessDefense: true,
    weatherAffix: WEATHER_AFFIX_CATALOG.ion_emp_storm,
    name: '无尽工坊保卫战',
    subtitle: '死守泡泡站 · 波次递增 · 零战败损耗',
    bossName: '深渊突变裂隙',
    bossMaxHp: 999999,
    enemySpawnInterval: 2.0,
    enemyBurstCount: 4,
    initialRedPrewarm: 6,
    bruteSpawnInterval: 7.2,
    rewardGold: 0,
    gates: [
      { id: 'ed_g1', x: -4.4, z: 10.2, width: 4.4, op: 'mul', value: 2, style: 'gold', moveRangeX: 2.4, moveSpeed: 1.25, movePhase: 0 },
      { id: 'ed_g2', x: 4.4, z: 10.2, width: 4.4, op: 'add', value: 6, style: 'blue', moveRangeX: 2.4, moveSpeed: 1.25, movePhase: Math.PI },
      { id: 'ed_g3', x: -4.2, z: 3.2, width: 4.4, op: 'giant_jelly', value: 2, style: 'jelly', moveRangeX: 2.6, moveSpeed: 1.15, movePhase: 0.9 },
      { id: 'ed_g4', x: 4.2, z: 3.2, width: 4.4, op: 'frost_shield', value: 1, style: 'frost', moveRangeX: 2.6, moveSpeed: 1.15, movePhase: 4.04 },
      { id: 'ed_g5', x: 0, z: -3.2, width: 5.0, op: 'sub', value: 5, style: 'hazard', moveRangeX: 4.0, moveSpeed: 1.4, movePhase: 1.57 },
    ],
    walls: [],
    gears: [],
    nests: [],
    barrels: [
      { id: 'ed_br_l', x: -5.4, z: -0.4, hp: 18 },
      { id: 'ed_br_r', x: 5.4, z: -0.4, hp: 18 },
    ],
    zones: [
      { id: 'ed_heal', type: 'heal_sanctuary', x: 0, z: 6.8, width: 5.4, length: 3.6 },
      { id: 'ed_tailwind_l', type: 'tailwind_belt', x: -6.4, z: 13.2, width: 3.2, length: 3.6 },
      { id: 'ed_pad_r', type: 'frosting_pad', x: 6.4, z: 7.0, width: 2.8, length: 2.4 },
      { id: 'ed_emp_front', type: 'emp_zone', x: 0, z: -8.6, width: 3.8, length: 3.6 },
    ],
    bumpers: [],
    bossSubTowers: [],
  };
}

export function generatePayloadEscortLevel(tier = 1): LevelConfig {
  const safeTier = Math.max(1, Math.floor(tier));
  const themeId = THEME_ORDER[(safeTier - 1) % THEME_ORDER.length];
  const hpMult = 1 + (safeTier - 1) * 0.22;
  const escortBarricades: EscortBarricadeConfig[] = [
    {
      id: 'esc_bar_1',
      x: 0,
      z: 9.4,
      width: 6.2,
      hp: Math.round(150 * hpMult),
      rewardGold: 320 + safeTier * 80,
      rewardShards: 1,
      name: '前哨铆铁拒马',
    },
    {
      id: 'esc_bar_2',
      x: 0,
      z: 3.2,
      width: 6.6,
      hp: Math.round(215 * hpMult),
      rewardGold: 420 + safeTier * 100,
      rewardShards: 1,
      name: '双联齿轮路障',
    },
    {
      id: 'esc_bar_3',
      x: 0,
      z: -3.2,
      width: 7.0,
      hp: Math.round(285 * hpMult),
      rewardGold: 540 + safeTier * 120,
      rewardShards: 1,
      name: '高压蒸汽壁垒',
      isHeavy: true,
    },
    {
      id: 'esc_bar_4',
      x: 0,
      z: -9.6,
      width: 7.4,
      hp: Math.round(360 * hpMult),
      rewardGold: 680 + safeTier * 150,
      rewardShards: 2,
      name: '总厂黑铁重闸',
      isHeavy: true,
    },
  ];

  return {
    id: safeTier,
    seed: 95500 + safeTier,
    themeId,
    archetype: 'trilane_siege',
    archetypeName: '蒸汽装甲战车护送 · 冲角破障攻坚',
    isMilestoneBoss: false,
    isMiniBoss: false,
    isMegaBoss: false,
    isPayloadEscort: true,
    escortBarricades,
    weatherAffix: WEATHER_AFFIX_CATALOG[WEATHER_AFFIX_ORDER[(safeTier - 1) % WEATHER_AFFIX_ORDER.length]],
    name: '蒸汽装甲战车护送',
    subtitle: '波波围车充能 · 撞碎 4 道路障',
    bossName: '黑铁终极据点',
    bossMaxHp: Math.round(680 * hpMult),
    enemySpawnInterval: 2.15,
    enemyBurstCount: 4,
    initialRedPrewarm: 4,
    bruteSpawnInterval: 8.5,
    rewardGold: 1100 + safeTier * 260,
    gates: [
      { id: 'esc_g1', x: -5.4, z: 11.2, width: 4.2, op: 'mul', value: 3, style: 'gold', moveRangeX: 1.8, moveSpeed: 1.2, movePhase: 0 },
      { id: 'esc_g2', x: 5.4, z: 11.2, width: 4.2, op: 'add', value: 7, style: 'blue', moveRangeX: 1.8, moveSpeed: 1.2, movePhase: Math.PI },
      { id: 'esc_g3', x: -5.5, z: 5.0, width: 4.2, op: 'giant_jelly', value: 2, style: 'jelly', moveRangeX: 1.8, moveSpeed: 1.1, movePhase: 0.8 },
      { id: 'esc_g4', x: 5.5, z: 5.0, width: 4.2, op: 'frost_shield', value: 1, style: 'frost', moveRangeX: 1.8, moveSpeed: 1.1, movePhase: 3.9 },
      { id: 'esc_g5', x: -5.4, z: -1.2, width: 4.2, op: 'mul', value: 2, style: 'gold', moveRangeX: 1.6, moveSpeed: 1.25, movePhase: 1.5 },
      { id: 'esc_g6', x: 5.4, z: -1.2, width: 4.2, op: 'add', value: 8, style: 'blue', moveRangeX: 1.6, moveSpeed: 1.25, movePhase: 4.6 },
    ],
    walls: [],
    gears: [],
    nests: [],
    barrels: [
      { id: 'esc_br_l', x: -6.2, z: -6.2, hp: 16 },
      { id: 'esc_br_r', x: 6.2, z: -6.2, hp: 16 },
    ],
    zones: [
      { id: 'esc_belt_l', type: 'tailwind_belt', x: -5.4, z: 8.0, width: 3.8, length: 3.8 },
      { id: 'esc_belt_r', type: 'tailwind_belt', x: 5.4, z: 8.0, width: 3.8, length: 3.8 },
      { id: 'esc_pad_l', type: 'frosting_pad', x: -5.6, z: 1.8, width: 2.8, length: 2.4 },
      { id: 'esc_pad_r', type: 'frosting_pad', x: 5.6, z: 1.8, width: 2.8, length: 2.4 },
      { id: 'esc_emp_flank', type: 'emp_zone', x: -5.8, z: -4.2, width: 3.2, length: 3.2 },
    ],
    bumpers: [],
    bossSubTowers: [],
  };
}

/**
 * Generates the 3-match escalating ladder for MC-7「霓虹齿轮巅峰锦标赛」(Gear Summit Tournament):
 * - Stage 1 (1.5x): 第 1/3 战 · 铜齿预赛 — Twin brass grinder gauntlet + tailwind belts + bronze vanguard
 * - Stage 2 (2.2x): 第 2/3 战 · 银齿半决赛 — Cyber gear S-curve + ion EMP zones + twin shielded sub-towers
 * - Stage 3 (3.5x): 第 3/3 战 · 金齿巅峰决战 — Royal neon gear citadel + frosting updraft pads + heavy elite siege
 */
export function generateGearTournamentLevel(stage: 1 | 2 | 3, cupTier = 1): LevelConfig {
  const safeStage: 1 | 2 | 3 = stage === 2 ? 2 : stage === 3 ? 3 : 1;
  const safeCup = Math.max(1, Math.min(12, Math.floor(cupTier)));
  const cupScale = 1 + (safeCup - 1) * 0.14;

  if (safeStage === 1) {
    return {
      id: safeCup * 10 + 1,
      seed: 97100 + safeCup * 10 + 1,
      themeId: 'wasteland',
      archetype: 'grinder_gauntlet',
      archetypeName: '齿轮巅峰锦标赛 · 第 1/3 战 · 铜齿预赛',
      isMilestoneBoss: false,
      isMiniBoss: true,
      isMegaBoss: false,
      isGearTournament: true,
      tournamentStage: 1,
      tournamentStageTitle: '第 1/3 战 · 铜齿预赛',
      tournamentStreakMult: 1.5,
      weatherAffix: WEATHER_AFFIX_CATALOG.gale_tailwind,
      name: '齿轮巅峰锦标赛 · 铜齿预赛',
      subtitle: '突破双铜齿绞盘 · 夺首胜开宝箱',
      bossName: '铜齿发条前哨塔',
      bossMaxHp: Math.round(520 * cupScale),
      enemySpawnInterval: 2.25,
      enemyBurstCount: 4,
      initialRedPrewarm: 5,
      bruteSpawnInterval: 9.0,
      rewardGold: Math.round(620 * cupScale),
      gates: [
        { id: 'trn1_g1', x: -4.8, z: 11.4, width: 4.3, op: 'mul', value: 3, style: 'gold', moveRangeX: 2.0, moveSpeed: 1.15, movePhase: 0 },
        { id: 'trn1_g2', x: 4.8, z: 11.4, width: 4.3, op: 'add', value: 7, style: 'blue', moveRangeX: 2.0, moveSpeed: 1.15, movePhase: Math.PI },
        { id: 'trn1_g3', x: -4.6, z: 3.6, width: 4.2, op: 'giant_jelly', value: 2, style: 'jelly', moveRangeX: 1.8, moveSpeed: 1.2, movePhase: 0.9 },
        { id: 'trn1_g4', x: 4.6, z: 3.6, width: 4.0, op: 'sub', value: 4, style: 'hazard', moveRangeX: 1.8, moveSpeed: 1.2, movePhase: 4.0 },
        { id: 'trn1_g5', x: 0, z: -3.4, width: 4.8, op: 'mul', value: 2, style: 'gold', moveRangeX: 2.8, moveSpeed: 1.3, movePhase: 1.6 },
      ],
      walls: [],
      gears: [
        { id: 'trn1_gear_l', x: -2.8, z: 7.4, radius: 1.45, hp: 14, moveRangeX: 1.4, moveSpeed: 1.1, movePhase: 0 },
        { id: 'trn1_gear_r', x: 2.8, z: -0.2, radius: 1.45, hp: 16, moveRangeX: 1.4, moveSpeed: 1.15, movePhase: Math.PI },
      ],
      nests: [],
      barrels: [
        { id: 'trn1_br_l', x: -5.6, z: -6.8, hp: 14 },
        { id: 'trn1_br_r', x: 5.6, z: -6.8, hp: 14 },
      ],
      zones: [
        { id: 'trn1_tw_l', type: 'tailwind_belt', x: -4.8, z: 7.6, width: 3.8, length: 4.2 },
        { id: 'trn1_tw_r', type: 'tailwind_belt', x: 4.8, z: 7.6, width: 3.8, length: 4.2 },
        { id: 'trn1_heal', type: 'heal_sanctuary', x: 0, z: -6.2, width: 4.6, length: 2.8 },
      ],
      bumpers: [
        { id: 'trn1_bmp_c', x: 0, z: 1.0, radius: 1.05 },
      ],
      bossSubTowers: [],
    };
  }

  if (safeStage === 2) {
    return {
      id: safeCup * 10 + 2,
      seed: 97200 + safeCup * 10 + 2,
      themeId: 'cyberhive',
      archetype: 'twin_matrix',
      archetypeName: '齿轮巅峰锦标赛 · 第 2/3 战 · 银齿半决赛',
      isMilestoneBoss: true,
      isMiniBoss: false,
      isMegaBoss: false,
      isGearTournament: true,
      tournamentStage: 2,
      tournamentStageTitle: '第 2/3 战 · 银齿半决赛',
      tournamentStreakMult: 2.2,
      weatherAffix: WEATHER_AFFIX_CATALOG.ion_emp_storm,
      name: '齿轮巅峰锦标赛 · 银齿半决赛',
      subtitle: '用副武器瓦解银齿副塔与脉冲阵',
      bossName: '银齿电磁中枢堡',
      bossMaxHp: Math.round(740 * cupScale),
      enemySpawnInterval: 1.95,
      enemyBurstCount: 5,
      initialRedPrewarm: 7,
      bruteSpawnInterval: 7.4,
      rewardGold: Math.round(880 * cupScale),
      gates: [
        { id: 'trn2_g1', x: -5.0, z: 11.6, width: 4.2, op: 'mul', value: 3, style: 'gold', moveRangeX: 2.2, moveSpeed: 1.35, movePhase: 0 },
        { id: 'trn2_g2', x: 5.0, z: 11.6, width: 4.2, op: 'frost_shield', value: 1, style: 'frost', moveRangeX: 2.2, moveSpeed: 1.35, movePhase: Math.PI },
        { id: 'trn2_g3', x: -4.8, z: 4.6, width: 4.1, op: 'add', value: 9, style: 'blue', moveRangeX: 2.0, moveSpeed: 1.3, movePhase: 1.1 },
        { id: 'trn2_g4', x: 4.8, z: 4.6, width: 4.0, op: 'div', value: 2, style: 'hazard', moveRangeX: 2.0, moveSpeed: 1.3, movePhase: 4.2 },
        { id: 'trn2_g5', x: -4.4, z: -2.4, width: 4.2, op: 'giant_jelly', value: 2, style: 'jelly', moveRangeX: 1.8, moveSpeed: 1.4, movePhase: 2.0 },
        { id: 'trn2_g6', x: 4.4, z: -2.4, width: 4.2, op: 'mul', value: 2, style: 'gold', moveRangeX: 1.8, moveSpeed: 1.4, movePhase: 5.1 },
      ],
      walls: [
        { x1: -1.8, z1: 8.2, x2: 1.8, z2: 8.2, height: 1.3, moveRangeX: 2.4, moveSpeed: 1.15, movePhase: 0.5 },
      ],
      gears: [
        { id: 'trn2_gear_l', x: -4.2, z: 1.0, radius: 1.55, hp: 18, moveRangeX: 1.6, moveSpeed: 1.3, movePhase: 0 },
        { id: 'trn2_gear_r', x: 4.2, z: 1.0, radius: 1.55, hp: 18, moveRangeX: 1.6, moveSpeed: 1.3, movePhase: Math.PI },
      ],
      nests: [
        { id: 'trn2_nest_r', x: 5.6, z: -5.5, hp: 120, name: '银齿精英前哨', rewardGold: 160 },
      ],
      barrels: [
        { id: 'trn2_br_c', x: 0, z: -5.8, hp: 18 },
      ],
      zones: [
        { id: 'trn2_emp_c', type: 'emp_zone', x: 0, z: 4.8, width: 3.6, length: 3.4 },
        { id: 'trn2_tw_l', type: 'tailwind_belt', x: -5.4, z: -5.8, width: 3.4, length: 3.8 },
        { id: 'trn2_tw_r', type: 'tailwind_belt', x: 5.4, z: -5.8, width: 3.4, length: 3.8 },
      ],
      bumpers: [
        { id: 'trn2_bmp_l', x: -2.4, z: -5.4, radius: 1.0 },
        { id: 'trn2_bmp_r', x: 2.4, z: -5.4, radius: 1.0 },
      ],
      bossSubTowers: [
        { id: 'trn2_sub_l', side: 'left', name: '左翼银齿护盾塔', x: -5.6, z: -13.6, hp: Math.round(210 * cupScale), rewardGold: 180 },
        { id: 'trn2_sub_r', side: 'right', name: '右翼银齿护盾塔', x: 5.6, z: -13.6, hp: Math.round(210 * cupScale), rewardGold: 180 },
      ],
    };
  }

  return {
    id: safeCup * 10 + 3,
    seed: 97300 + safeCup * 10 + 3,
    themeId: 'royal',
    archetype: 'diamond_citadel',
    archetypeName: '齿轮巅峰锦标赛 · 第 3/3 战 · 金齿巅峰决战',
    isMilestoneBoss: true,
    isMiniBoss: false,
    isMegaBoss: true,
    isGearTournament: true,
    tournamentStage: 3,
    tournamentStageTitle: '第 3/3 战 · 金齿巅峰决战',
    tournamentStreakMult: 3.5,
    weatherAffix: WEATHER_AFFIX_CATALOG.sugar_snow_updraft,
    name: '齿轮巅峰锦标赛 · 金齿巅峰决战',
    subtitle: '击穿金齿皇冠主堡 · 赢满贯宝箱',
    bossName: '霓虹金齿皇冠总堡',
    bossMaxHp: Math.round(980 * cupScale),
    enemySpawnInterval: 1.75,
    enemyBurstCount: 6,
    initialRedPrewarm: 9,
    bruteSpawnInterval: 6.2,
    rewardGold: Math.round(1280 * cupScale),
    gates: [
      { id: 'trn3_g1', x: -5.0, z: 12.0, width: 4.3, op: 'mul', value: 4, style: 'mega', moveRangeX: 2.3, moveSpeed: 1.45, movePhase: 0 },
      { id: 'trn3_g2', x: 5.0, z: 12.0, width: 4.3, op: 'giant_jelly', value: 2, style: 'jelly', moveRangeX: 2.3, moveSpeed: 1.45, movePhase: Math.PI },
      { id: 'trn3_g3', x: 0, z: 6.0, width: 4.5, op: 'frost_shield', value: 2, style: 'frost', moveRangeX: 3.2, moveSpeed: 1.5, movePhase: 1.2 },
      { id: 'trn3_g4', x: -5.0, z: 0.4, width: 4.2, op: 'mul', value: 3, style: 'gold', moveRangeX: 2.0, moveSpeed: 1.45, movePhase: 2.4 },
      { id: 'trn3_g5', x: 5.0, z: 0.4, width: 4.0, op: 'div', value: 2, style: 'hazard', moveRangeX: 2.0, moveSpeed: 1.45, movePhase: 5.5 },
      { id: 'trn3_g6', x: 0, z: -4.8, width: 4.6, op: 'add', value: 12, style: 'blue', moveRangeX: 2.8, moveSpeed: 1.55, movePhase: 0.7 },
    ],
    walls: [
      { x1: -2.2, z1: 3.4, x2: 2.2, z2: 3.4, height: 1.35, moveRangeX: 2.6, moveSpeed: 1.3, movePhase: 1.0 },
    ],
    gears: [
      { id: 'trn3_gear_l', x: -4.5, z: 8.8, radius: 1.6, hp: 20, moveRangeX: 1.5, moveSpeed: 1.4, movePhase: 0 },
      { id: 'trn3_gear_r', x: 4.5, z: 8.8, radius: 1.6, hp: 20, moveRangeX: 1.5, moveSpeed: 1.4, movePhase: Math.PI },
      { id: 'trn3_gear_c', x: 0, z: -1.8, radius: 1.65, hp: 22, moveRangeX: 2.4, moveSpeed: 1.5, movePhase: 1.5 },
    ],
    nests: [
      { id: 'trn3_nest_l', x: -5.6, z: -6.4, hp: 140, name: '左翼金齿禁卫巢', rewardGold: 210 },
      { id: 'trn3_nest_r', x: 5.6, z: -6.4, hp: 140, name: '右翼金齿禁卫巢', rewardGold: 210 },
    ],
    barrels: [
      { id: 'trn3_br_l', x: -5.4, z: -7.6, hp: 20 },
      { id: 'trn3_br_r', x: 5.4, z: -7.6, hp: 20 },
    ],
    zones: [
      { id: 'trn3_pad_l', type: 'frosting_pad', x: -5.0, z: 3.4, width: 3.0, length: 2.6 },
      { id: 'trn3_pad_r', type: 'frosting_pad', x: 5.0, z: 3.4, width: 3.0, length: 2.6 },
      { id: 'trn3_emp_c', type: 'emp_zone', x: 0, z: -7.4, width: 3.8, length: 3.0 },
      { id: 'trn3_tw_c', type: 'tailwind_belt', x: 0, z: 9.2, width: 4.0, length: 3.4 },
    ],
    bumpers: [
      { id: 'trn3_bmp_l', x: -3.2, z: -4.8, radius: 1.05 },
      { id: 'trn3_bmp_r', x: 3.2, z: -4.8, radius: 1.05 },
    ],
    bossSubTowers: [
      { id: 'trn3_sub_l', side: 'left', name: '左翼金齿电弧塔', x: -5.8, z: -13.8, hp: Math.round(250 * cupScale), rewardGold: 240 },
      { id: 'trn3_sub_r', side: 'right', name: '右翼金齿电弧塔', x: 5.8, z: -13.8, hp: Math.round(250 * cupScale), rewardGold: 240 },
    ],
  };
}

/**
 * Generates the dedicated MC-8「巨型发条玩具首领攻坚战」(Giant Clockwork Toy Colossus Boss Raid) stage:
 * - Features a towering articulated 3D Clockwork Nutcracker Colossus at the bridge head
 *   with Left Shield Arm (`左翼发条重盾`) and Right Cannon Arm (`右翼糖衣重炮`) destructible weakpoints.
 * - Breaking either weakpoint triggers a 6.0s Paralysis Vulnerable Window (`2.5x` Core damage taken).
 */
export function generateClockworkColossusRaidLevel(raidTier = 1): LevelConfig {
  const safeTier = Math.max(1, Math.min(10, Math.floor(raidTier)));
  const tierScale = 1 + (safeTier - 1) * 0.16;
  const raidThemes: ThemeId[] = ['royal', 'wasteland', 'cyberhive'];
  const themeId = raidThemes[(safeTier - 1) % raidThemes.length];

  return {
    id: 800 + safeTier,
    seed: 98400 + safeTier * 17,
    mode: 'colossus_raid',
    isColossusRaid: true,
    colossusRaidTier: safeTier,
    colossusLeftShieldHp: Math.round(230 * tierScale),
    colossusRightCannonHp: Math.round(230 * tierScale),
    themeId,
    archetype: 'trilane_siege',
    archetypeName: `巨型发条首领攻坚战 · 第 ${safeTier} 阶`,
    isMilestoneBoss: true,
    isMiniBoss: false,
    isMegaBoss: false,
    weatherAffix: WEATHER_AFFIX_CATALOG[WEATHER_AFFIX_ORDER[(safeTier - 1) % WEATHER_AFFIX_ORDER.length]],
    name: `巨型发条首领攻坚战 · 第 ${safeTier} 阶`,
    subtitle: '破左盾右炮 · 6s 瘫痪 2.5x 暴击',
    bossName: '巨型发条胡桃夹子统领',
    bossMaxHp: Math.round(880 * tierScale),
    enemySpawnInterval: 2.1,
    enemyBurstCount: 4 + Math.min(3, Math.floor((safeTier - 1) / 2)),
    initialRedPrewarm: 5,
    bruteSpawnInterval: 8.2,
    rewardGold: Math.round(980 * tierScale),
    gates: [
      { id: 'col_g1', x: -5.2, z: 11.6, width: 4.3, op: 'mul', value: 3, style: 'gold', moveRangeX: 1.9, moveSpeed: 1.15, movePhase: 0 },
      { id: 'col_g2', x: 5.2, z: 11.6, width: 4.3, op: 'add', value: 8, style: 'blue', moveRangeX: 1.9, moveSpeed: 1.15, movePhase: Math.PI },
      { id: 'col_g3', x: -5.0, z: 4.8, width: 4.2, op: 'giant_jelly', value: 2, style: 'jelly', moveRangeX: 1.8, moveSpeed: 1.2, movePhase: 0.9 },
      { id: 'col_g4', x: 5.0, z: 4.8, width: 4.2, op: 'frost_shield', value: 1, style: 'frost', moveRangeX: 1.8, moveSpeed: 1.2, movePhase: 4.0 },
      { id: 'col_g5', x: -4.8, z: -2.0, width: 4.1, op: 'add', value: 9, style: 'blue', moveRangeX: 1.6, moveSpeed: 1.25, movePhase: 1.7 },
      { id: 'col_g6', x: 4.8, z: -2.0, width: 4.1, op: 'mul', value: 2, style: 'gold', moveRangeX: 1.6, moveSpeed: 1.25, movePhase: 4.8 },
    ],
    walls: [
      { x1: -1.7, z1: 8.2, x2: 1.7, z2: 8.2, height: 1.25, moveRangeX: 2.0, moveSpeed: 1.05, movePhase: 0.4 },
    ],
    gears: [
      { id: 'col_gear_c', x: 0, z: 1.4, radius: 1.45, hp: 16, moveRangeX: 2.2, moveSpeed: 1.2, movePhase: 0 },
    ],
    nests: [],
    barrels: [
      { id: 'col_br_l', x: -5.2, z: -8.6, hp: 14 },
      { id: 'col_br_r', x: 5.2, z: -8.6, hp: 14 },
    ],
    zones: [
      { id: 'col_tw_l', type: 'tailwind_belt', x: -5.2, z: 8.2, width: 3.8, length: 3.8 },
      { id: 'col_tw_r', type: 'tailwind_belt', x: 5.2, z: 8.2, width: 3.8, length: 3.8 },
      { id: 'col_pad_c', type: 'frosting_pad', x: 0, z: -5.2, width: 3.2, length: 2.4 },
    ],
    bumpers: [
      { id: 'col_bmp_l', x: -2.5, z: -4.6, radius: 0.95 },
      { id: 'col_bmp_r', x: 2.5, z: -4.6, radius: 0.95 },
    ],
    bossSubTowers: [],
  };
}

/**
 * Generates the dedicated MC-9「云端飞艇母舰护航战」(Cloud Airship Mothership Escort) stage:
 * - Escort a 3D toy-craft Steam Airship Mothership hovering down the central lane toward the enemy stronghold.
 * - Neutralize 4 enemy Anti-Air Flak Sub-Turrets along both flanks and escort blue Bobos under the hull
 *   to charge the underside Drop-Pod Bay and deploy 3D Super Bobo Drop Pods onto the bridge!
 */
export function generateAirshipEscortLevel(escortTier = 1): LevelConfig {
  const safeTier = Math.max(1, Math.min(10, Math.floor(escortTier)));
  const tierScale = 1 + (safeTier - 1) * 0.14;
  const escortThemes: ThemeId[] = ['royal', 'emerald', 'cyberhive'];
  const themeId = escortThemes[(safeTier - 1) % escortThemes.length];

  const antiAirTurrets: AntiAirTurretConfig[] = [
    {
      id: 'aa_1_l',
      name: '前哨左翼防空炮',
      side: 'left',
      x: -5.4,
      z: 8.4,
      hp: Math.round(135 * tierScale),
      flakDmg: Math.round(15 * tierScale),
      fireInterval: 2.25,
      rewardGold: 130 + safeTier * 15,
      dropChargeBonus: 55,
    },
    {
      id: 'aa_2_r',
      name: '中段右翼高射塔',
      side: 'right',
      x: 5.4,
      z: 2.6,
      hp: Math.round(155 * tierScale),
      flakDmg: Math.round(17 * tierScale),
      fireInterval: 2.15,
      rewardGold: 145 + safeTier * 18,
      dropChargeBonus: 55,
    },
    {
      id: 'aa_3_l',
      name: '纵深左翼防空炮',
      side: 'left',
      x: -5.4,
      z: -3.4,
      hp: Math.round(175 * tierScale),
      flakDmg: Math.round(19 * tierScale),
      fireInterval: 2.05,
      rewardGold: 165 + safeTier * 20,
      dropChargeBonus: 60,
    },
    {
      id: 'aa_4_r',
      name: '要塞右翼防空塔',
      side: 'right',
      x: 5.4,
      z: -9.2,
      hp: Math.round(195 * tierScale),
      flakDmg: Math.round(21 * tierScale),
      fireInterval: 1.95,
      rewardGold: 185 + safeTier * 22,
      dropChargeBonus: 65,
    },
  ];

  return {
    id: 900 + safeTier,
    seed: 109600 + safeTier * 23,
    mode: 'airship_escort',
    isAirshipEscort: true,
    airshipEscortTier: safeTier,
    airshipMaxHp: Math.round(520 + (safeTier - 1) * 45),
    airshipMaxShield: Math.round(220 + (safeTier - 1) * 25),
    antiAirTurrets,
    themeId,
    archetype: 'trilane_siege',
    archetypeName: `云端飞艇母舰护航战 · 第 ${safeTier} 阶`,
    isMilestoneBoss: true,
    isMiniBoss: false,
    isMegaBoss: false,
    weatherAffix: WEATHER_AFFIX_CATALOG[WEATHER_AFFIX_ORDER[(safeTier + 1) % WEATHER_AFFIX_ORDER.length]],
    name: `云端飞艇母舰护航战 · 第 ${safeTier} 阶`,
    subtitle: '拔防空塔 · 充能空投 · 轰破要塞',
    bossName: '苍穹黑铁防空要塞',
    bossMaxHp: Math.round(760 * tierScale),
    enemySpawnInterval: 2.15,
    enemyBurstCount: 4 + Math.min(3, Math.floor((safeTier - 1) / 2)),
    initialRedPrewarm: 4,
    bruteSpawnInterval: 8.5,
    rewardGold: Math.round(920 * tierScale),
    gates: [
      { id: 'air_g1', x: -5.0, z: 12.2, width: 4.3, op: 'mul', value: 3, style: 'gold', moveRangeX: 1.8, moveSpeed: 1.1, movePhase: 0 },
      { id: 'air_g2', x: 5.0, z: 12.2, width: 4.3, op: 'add', value: 8, style: 'blue', moveRangeX: 1.8, moveSpeed: 1.1, movePhase: Math.PI },
      { id: 'air_g3', x: -4.8, z: 5.4, width: 4.2, op: 'frost_shield', value: 1, style: 'frost', moveRangeX: 1.7, moveSpeed: 1.15, movePhase: 0.8 },
      { id: 'air_g4', x: 4.8, z: 5.4, width: 4.2, op: 'giant_jelly', value: 2, style: 'jelly', moveRangeX: 1.7, moveSpeed: 1.15, movePhase: 3.9 },
      { id: 'air_g5', x: -4.6, z: -1.2, width: 4.1, op: 'add', value: 9, style: 'blue', moveRangeX: 1.6, moveSpeed: 1.2, movePhase: 1.6 },
      { id: 'air_g6', x: 4.6, z: -1.2, width: 4.1, op: 'mul', value: 2, style: 'gold', moveRangeX: 1.6, moveSpeed: 1.2, movePhase: 4.7 },
    ],
    walls: [],
    gears: [
      { id: 'air_gear_c', x: 0, z: 0.8, radius: 1.35, hp: 15, moveRangeX: 2.0, moveSpeed: 1.15, movePhase: 0.5 },
    ],
    nests: [],
    barrels: [
      { id: 'air_br_l', x: -5.1, z: -6.2, hp: 14 },
      { id: 'air_br_r', x: 5.1, z: -6.2, hp: 14 },
    ],
    zones: [
      { id: 'air_tw_c', type: 'tailwind_belt', x: 0, z: 9.2, width: 4.0, length: 3.8 },
      { id: 'air_pad_c', type: 'frosting_pad', x: 0, z: -5.4, width: 3.2, length: 2.4 },
    ],
    bumpers: [
      { id: 'air_bmp_l', x: -2.4, z: -4.2, radius: 0.92 },
      { id: 'air_bmp_r', x: 2.4, z: -4.2, radius: 0.92 },
    ],
    bossSubTowers: [],
  };
}

/**
 * Generates the dedicated MC-10「彩虹糖果列车突袭战」(Rainbow Candy Train Raid) stage:
 * - A 6-car armored 3D Rainbow Candy Freight Train circles an elliptical rainbow rail loop mid-bridge.
 * - Every car has its own HP + bolted armor plates (shed at 50% HP); armored cars & the locomotive vent
 *   scalding steam at nearby Bobos, while treasure cars carry 列车金章 (Train Gold Medals) as loot.
 * - Break the locomotive to stall the whole train (escape countdown freezes); break every car before the
 *   escape countdown ends to win the raid.
 */
export function generateCandyTrainRaidLevel(raidTier = 1): LevelConfig {
  const safeTier = Math.max(1, Math.min(10, Math.floor(raidTier)));
  const tierScale = 1 + (safeTier - 1) * 0.14;
  const raidThemes: ThemeId[] = ['sakura', 'royal', 'glacier'];
  const themeId = raidThemes[(safeTier - 1) % raidThemes.length];

  const candyTrainCars: CandyTrainCarConfig[] = [
    {
      id: 'train_loco',
      name: '彩虹蒸汽火车头',
      shortName: '火车头',
      kind: 'locomotive',
      hp: Math.round(6500 * tierScale),
      armor: 0.4,
      rewardGold: 170 + safeTier * 22,
      rewardMedals: 0,
      ventDmg: Math.round(9 * tierScale),
      ventInterval: 3.6,
    },
    {
      id: 'train_armor_mint',
      name: '薄荷装甲货厢',
      shortName: '薄荷装甲',
      kind: 'armored',
      hp: Math.round(4700 * tierScale),
      armor: 0.34,
      rewardGold: 120 + safeTier * 16,
      rewardMedals: 0,
      ventDmg: Math.round(7 * tierScale),
      ventInterval: 4.2,
    },
    {
      id: 'train_treasure_rainbow',
      name: '彩虹宝箱货厢',
      shortName: '彩虹宝箱',
      kind: 'treasure',
      hp: Math.round(3400 * tierScale),
      armor: 0.16,
      rewardGold: 210 + safeTier * 26,
      rewardMedals: 1,
      ventDmg: 0,
      ventInterval: 0,
    },
    {
      id: 'train_armor_berry',
      name: '草莓装甲货厢',
      shortName: '草莓装甲',
      kind: 'armored',
      hp: Math.round(4700 * tierScale),
      armor: 0.34,
      rewardGold: 120 + safeTier * 16,
      rewardMedals: 0,
      ventDmg: Math.round(7 * tierScale),
      ventInterval: 4.6,
    },
    {
      id: 'train_treasure_star',
      name: '星糖金库货厢',
      shortName: '星糖金库',
      kind: 'treasure',
      hp: Math.round(3600 * tierScale),
      armor: 0.18,
      rewardGold: 230 + safeTier * 28,
      rewardMedals: 1 + (safeTier >= 4 ? 1 : 0),
      ventDmg: 0,
      ventInterval: 0,
    },
    {
      id: 'train_caboose',
      name: '棉花糖守车',
      shortName: '守车',
      kind: 'caboose',
      hp: Math.round(2700 * tierScale),
      armor: 0.2,
      rewardGold: 100 + safeTier * 14,
      rewardMedals: 0,
      ventDmg: 0,
      ventInterval: 0,
    },
  ];

  return {
    id: 2 + safeTier * 2,
    seed: 110300 + safeTier * 29,
    mode: 'candy_train_raid',
    isCandyTrainRaid: true,
    candyTrainTier: safeTier,
    candyTrainCars,
    candyTrainTrack: {
      centerX: 0,
      centerZ: -1.6,
      radiusX: 7.6,
      radiusZ: 6.8,
      carSpacing: 3.05,
    },
    candyTrainSpeed: Math.min(3.4, 2.15 + (safeTier - 1) * 0.12),
    candyTrainEscapeSec: Math.max(72, 92 - (safeTier - 1) * 2),
    themeId,
    archetype: 'trilane_siege',
    archetypeName: `彩虹糖果列车突袭战 · 第 ${safeTier} 阶`,
    isMilestoneBoss: true,
    isMiniBoss: false,
    isMegaBoss: false,
    weatherAffix: WEATHER_AFFIX_CATALOG[WEATHER_AFFIX_ORDER[(safeTier + 2) % WEATHER_AFFIX_ORDER.length]],
    name: `彩虹糖果列车突袭战 · 第 ${safeTier} 阶`,
    subtitle: '先打车头令全车停摆 · 夺金章',
    bossName: '彩虹糖果装甲货运列车',
    bossMaxHp: candyTrainCars.reduce((sum, car) => sum + car.hp, 0),
    enemySpawnInterval: 2.6,
    enemyBurstCount: 3 + Math.min(3, Math.floor((safeTier - 1) / 3)),
    initialRedPrewarm: 3,
    bruteSpawnInterval: 11.5,
    rewardGold: Math.round(860 * tierScale),
    gates: [
      { id: 'trn_g1', x: -4.9, z: 12.6, width: 4.3, op: 'mul', value: 3, style: 'gold', moveRangeX: 1.8, moveSpeed: 1.05, movePhase: 0 },
      { id: 'trn_g2', x: 4.9, z: 12.6, width: 4.3, op: 'add', value: 8, style: 'blue', moveRangeX: 1.8, moveSpeed: 1.05, movePhase: Math.PI },
      { id: 'trn_g3', x: -4.7, z: 8.4, width: 4.2, op: 'frost_shield', value: 1, style: 'frost', moveRangeX: 1.6, moveSpeed: 1.15, movePhase: 0.9 },
      { id: 'trn_g4', x: 4.7, z: 8.4, width: 4.2, op: 'mul', value: 2, style: 'gold', moveRangeX: 1.6, moveSpeed: 1.15, movePhase: 4.0 },
    ],
    walls: [],
    gears: [],
    nests: [],
    barrels: [
      { id: 'trn_br_l', x: -2.6, z: -1.6, hp: 14 },
      { id: 'trn_br_r', x: 2.6, z: -1.6, hp: 14 },
    ],
    zones: [],
    bumpers: [],
    bossSubTowers: [],
  };
}

/**
 * Generates the dedicated MC-11「深海潜艇泡泡营救战」(Deep-Sea Submarine Bubble Rescue) stage:
 * - Underwater (ocean theme + deep-sea tint, fog & rising bubbles). The player's 3D toy submarine sails the
 *   bubble lane from the home dock (z = startZ) to the rescue station (z = dockZ), steered with the cannon,
 *   and fires its own bubble torpedoes (the submarine's cannon) at jellyfish / coral / rescue bubbles.
 * - Three full-width coral barriers seal the lane (HP, scaled by tier); the sub stops at each until it breaks.
 * - Seven drifting rescue bubbles hold trapped Bobo squads; popping one adds those Bobos to the army.
 * - Jellyfish swarms periodically drift at the submarine, stinging (damage + slow) Bobos and the hull.
 * - Win: the submarine docks at the rescue station. Lose: hull HP hits 0 or the oxygen timer runs out.
 * - Regular red minion waves are disabled in this mode (jellyfish are the threat), so the level `id`
 *   (2 + 2 x tier, mirroring MC-10) only scales the loot-bug jackpot; jellyfish/coral scale by `tierScale`.
 */
export function generateSubmarineRescueLevel(rescueTier = 1): LevelConfig {
  const safeTier = Math.max(1, Math.min(10, Math.floor(rescueTier)));
  const tierScale = 1 + (safeTier - 1) * 0.12;
  const jellyScale = 1 + (safeTier - 1) * 0.06;
  const extraBobos = Math.floor((safeTier - 1) / 2);

  const coralBarriers: CoralBarrierConfig[] = [
    { id: 'coral_pink', name: '粉珊瑚礁封锁', z: 8.0, hp: Math.round(4200 * tierScale), rewardGold: 90 + safeTier * 14 },
    { id: 'coral_violet', name: '紫珊瑚礁封锁', z: -1.4, hp: Math.round(6200 * tierScale), rewardGold: 120 + safeTier * 18 },
    { id: 'coral_amber', name: '琥珀巨珊瑚墙', z: -10.0, hp: Math.round(8600 * tierScale), rewardGold: 160 + safeTier * 22 },
  ];

  const bubbleHp = Math.round(46 * tierScale);
  const rescueBubbles: RescueBubbleConfig[] = [
    { id: 'bub_1', x: -5.4, z: 10.6, hp: bubbleHp, bobos: 4 + extraBobos, driftRangeX: 1.2, driftSpeed: 0.8, driftPhase: 0 },
    { id: 'bub_2', x: 5.6, z: 10.0, hp: bubbleHp, bobos: 4 + extraBobos, driftRangeX: 1.2, driftSpeed: 0.75, driftPhase: 2.1 },
    { id: 'bub_3', x: -4.6, z: 3.6, hp: bubbleHp, bobos: 6 + extraBobos, driftRangeX: 1.6, driftSpeed: 0.7, driftPhase: 1.2 },
    { id: 'bub_4', x: 4.8, z: 1.8, hp: bubbleHp, bobos: 6 + extraBobos, driftRangeX: 1.6, driftSpeed: 0.85, driftPhase: 3.3 },
    { id: 'bub_5', x: -5.2, z: -4.8, hp: bubbleHp, bobos: 8 + extraBobos, driftRangeX: 1.8, driftSpeed: 0.65, driftPhase: 0.6 },
    { id: 'bub_6', x: 5.2, z: -6.6, hp: bubbleHp, bobos: 8 + extraBobos, driftRangeX: 1.8, driftSpeed: 0.7, driftPhase: 2.7 },
    {
      id: 'bub_grand',
      x: 0,
      z: -12.4,
      hp: Math.round(bubbleHp * 2.2),
      bobos: 12 + extraBobos * 2,
      driftRangeX: 2.6,
      driftSpeed: 0.55,
      driftPhase: 1.7,
      isGrand: true,
    },
  ];

  const jellyfishSwarm: JellyfishSwarmConfig = {
    firstDelaySec: 3.0,
    intervalSec: Math.max(5.6, 8.0 - (safeTier - 1) * 0.3),
    perSwarm: Math.min(5, 3 + Math.floor((safeTier - 1) / 4)),
    hp: Math.round(480 * jellyScale),
    speed: Math.min(2.4, 1.8 + (safeTier - 1) * 0.06),
    stingRadius: 1.85,
    stingIntervalSec: 1.1,
    stingDmg: Math.round(8 * jellyScale),
    hullStingDmg: Math.round(20 * jellyScale),
    slowSec: 2.4,
    slowMult: 0.5,
    rewardGold: 14 + safeTier * 3,
  };

  return {
    id: 2 + safeTier * 2,
    seed: 120900 + safeTier * 31,
    mode: 'submarine_rescue',
    isSubmarineRescue: true,
    submarineTier: safeTier,
    submarineLane: {
      startZ: 14.6,
      dockZ: -14.2,
      maxSteerX: 6.4,
      baseSpeed: Math.max(0.68, 0.78 - (safeTier - 1) * 0.012),
      hullHp: Math.round(600 + (safeTier - 1) * 80),
      oxygenSec: Math.max(55, 80 - (safeTier - 1) * 3),
      torpedoIntervalSec: 1.7,
      torpedoDmg: Math.round(70 * (1 + (safeTier - 1) * 0.08)),
    },
    coralBarriers,
    rescueBubbles,
    jellyfishSwarm,
    themeId: 'ocean',
    archetype: 'trilane_siege',
    archetypeName: `深海潜艇泡泡营救战 · 第 ${safeTier} 阶`,
    isMilestoneBoss: false,
    isMiniBoss: false,
    isMegaBoss: false,
    name: `深海潜艇泡泡营救战 · 第 ${safeTier} 阶`,
    subtitle: '破珊瑚 · 戳泡泡救波波 · 抵达营救站',
    bossName: '深海营救站',
    bossMaxHp: 100,
    enemySpawnInterval: 999,
    enemyBurstCount: 0,
    initialRedPrewarm: 0,
    bruteSpawnInterval: 0,
    rewardGold: Math.round(520 * tierScale),
    gates: [
      { id: 'sub_g1', x: -4.6, z: 12.6, width: 4.2, op: 'mul', value: 2, style: 'gold', moveRangeX: 1.6, moveSpeed: 1.0, movePhase: 0 },
      { id: 'sub_g2', x: 4.6, z: 12.6, width: 4.2, op: 'add', value: 6, style: 'blue', moveRangeX: 1.6, moveSpeed: 1.0, movePhase: Math.PI },
    ],
    walls: [],
    gears: [],
    nests: [],
    barrels: [],
    zones: [],
    bumpers: [],
    bossSubTowers: [],
  };
}

/**
 * Generates the dedicated MC-12「冰川雪橇竞速冲关」(Glacier Sled Race) stage:
 * - Glacier theme + snowfall. The Bobo crowd rides the player's 3D toy sled down an icy course of `length` metres;
 *   the camera stays put and the course scrolls toward the camera (treadmill), the sled is steered with the cannon.
 * - Gate pairs add riders (+N / ×N), falling icicles become ice spikes that knock riders off, avalanche waves roll
 *   up the slope with a single flagged safe gap, ice boost strips grant short speed bursts.
 * - Win: cross the finish line before the countdown ends. Lose: time runs out or every rider is knocked off.
 * - Regular red waves are disabled. Course length / speed / hazard density scale with `sledTier`;
 *   tier 1 is tuned to finish in ~30 s with a ~41 s limit.
 */
export function generateGlacierSledLevel(sledTier = 1): LevelConfig {
  const safeTier = Math.max(1, Math.min(10, Math.floor(sledTier)));
  const rng = new SeededRNG(91200 + safeTier * 53);
  const length = 300 + (safeTier - 1) * 24;
  const baseSpeed = Number((10.4 + (safeTier - 1) * 0.3).toFixed(2));
  const timeLimitSec = Math.round((length / baseSpeed) * Math.max(1.26, 1.42 - (safeTier - 1) * 0.02));
  const addBonus = Math.floor((safeTier - 1) / 2) * 2;

  const course: GlacierSledCourseConfig = {
    length,
    baseSpeed,
    timeLimitSec,
    startRiders: 14 + Math.floor((safeTier - 1) / 2),
    maxRiders: 120,
    maxSteerX: 8.0,
    hitSlowMult: 0.5,
    hitSlowSec: 0.9,
    boostMult: 1.4,
    boostSec: 1.6,
  };

  const gatePairs: Array<[{ op: 'add' | 'mul'; value: number }, { op: 'add' | 'mul'; value: number }]> = [
    [{ op: 'add', value: 4 + addBonus }, { op: 'add', value: 6 + addBonus }],
    [{ op: 'mul', value: 2 }, { op: 'add', value: 8 + addBonus }],
    [{ op: 'add', value: 8 + addBonus }, { op: 'add', value: 12 + addBonus }],
    [{ op: 'mul', value: 2 }, { op: 'add', value: 14 + addBonus }],
    [{ op: 'add', value: 10 + addBonus }, { op: 'mul', value: 2 }],
  ];
  const pattern: Array<'gates' | 'icicles' | 'avalanche' | 'boost'> = [
    'gates',
    'icicles',
    'avalanche',
    'gates',
    'boost',
    'icicles',
    'avalanche',
    'gates',
    'icicles',
    'boost',
    'avalanche',
    'gates',
    'icicles',
    'avalanche',
  ];

  const sledGates: SledGateConfig[] = [];
  const sledIcicles: SledIcicleConfig[] = [];
  const sledAvalanches: SledAvalancheConfig[] = [];
  const sledBoosts: SledBoostConfig[] = [];
  const icicleLanes = [-6.6, -3.3, 0, 3.3, 6.6];
  let d = 26;
  let k = 0;
  let gateIdx = 0;
  const spacingShrink = Math.min(3.5, (safeTier - 1) * 0.5);
  while (d < length - 18) {
    const kind = pattern[k % pattern.length];
    if (kind === 'gates') {
      const pair = gatePairs[gateIdx % gatePairs.length];
      const swap = rng.chance(0.5);
      const left = swap ? pair[1] : pair[0];
      const right = swap ? pair[0] : pair[1];
      for (const [side, g] of [[-1, left], [1, right]] as const) {
        sledGates.push({
          id: `sled_gate_${gateIdx}_${side < 0 ? 'l' : 'r'}`,
          d,
          x: side * 4.3,
          width: 7.4,
          op: g.op,
          value: g.value,
          style: g.op === 'mul' ? 'gold' : g.value >= 10 ? 'mega' : 'blue',
        });
      }
      gateIdx++;
    } else if (kind === 'icicles') {
      const count = Math.min(6, 3 + Math.floor((safeTier - 1) / 2));
      const lanes = [...icicleLanes];
      for (let i = 0; i < count; i++) {
        if (lanes.length === 0) lanes.push(...icicleLanes);
        const lane = lanes.splice(Math.floor(rng.next() * lanes.length), 1)[0];
        sledIcicles.push({
          id: `sled_icicle_${k}_${i}`,
          d: d + i * 3.4,
          x: Number((lane + rng.range(-0.8, 0.8)).toFixed(2)),
          radius: 1.15,
          knockCap: 5 + Math.floor(safeTier / 2),
        });
      }
    } else if (kind === 'avalanche') {
      const gapX = Number(rng.pick([-5.2, -2.6, 0, 2.6, 5.2]).toFixed(2));
      sledAvalanches.push({
        id: `sled_avalanche_${k}`,
        d: d + 6,
        gapX,
        gapW: Math.max(5.0, 6.6 - (safeTier - 1) * 0.2),
        rollSpeed: Math.min(4.2, 2.6 + (safeTier - 1) * 0.2),
        knockPct: Math.min(70, 45 + (safeTier - 1) * 3),
      });
    } else {
      sledBoosts.push({
        id: `sled_boost_${k}`,
        d,
        x: Number(rng.pick([-4.8, 0, 4.8]).toFixed(2)),
        width: 4.6,
      });
    }
    d += 18.5 + rng.range(0, 3.5) - spacingShrink;
    k++;
  }

  return {
    id: 2 + safeTier * 2,
    seed: 91200 + safeTier * 53,
    mode: 'glacier_sled',
    isGlacierSled: true,
    sledTier: safeTier,
    sledCourse: course,
    sledGates,
    sledIcicles,
    sledAvalanches,
    sledBoosts,
    themeId: 'glacier',
    archetype: 'trilane_siege',
    archetypeName: `冰川雪橇竞速冲关 · 第 ${safeTier} 阶`,
    isMilestoneBoss: false,
    isMiniBoss: false,
    isMegaBoss: false,
    name: `冰川雪橇竞速冲关 · 第 ${safeTier} 阶`,
    subtitle: '躲雪崩与冰锥 · 穿加人门冲线',
    bossName: '冰川终点线',
    bossMaxHp: 100,
    enemySpawnInterval: 999,
    enemyBurstCount: 0,
    initialRedPrewarm: 0,
    bruteSpawnInterval: 0,
    rewardGold: Math.round(360 * (1 + (safeTier - 1) * 0.12)),
    gates: [],
    walls: [],
    gears: [],
    nests: [],
    barrels: [],
    zones: [],
    bumpers: [],
    bossSubTowers: [],
  };
}

/**
 * Generates the dedicated MC-13「火山熔岩跳台突围战」(Volcano Lava Jump Breakout) stage:
 * - Magma theme. The Bobo crowd hops forward across a lava lake from one row of floating stone platforms to the next;
 *   the camera stays put and the course scrolls toward the camera (treadmill). The crowd is steered with the cannon.
 * - Every Bobo lands individually: a Bobo whose x is not over a platform of the row it reaches falls into the lava.
 *   Bigger crowds form wider squads, so they need wider platforms or a cleaner line.
 * - Row kinds: plain stone pairs, unit-gate pairs (+N / xN), telegraphed eruptions (AoE that bursts as the crowd
 *   arrives), falling volcanic bombs (shadow telegraph, then a burning boulder) and cooled-rock safe platforms
 *   (wide, never targeted by hazards, landing grants a short heat shield).
 * - Win: reach the exit shore before the countdown ends. Lose: time runs out or every Bobo is lost.
 * - Regular red waves are disabled. Pace / platform width / hazard strength scale with `lavaTier`;
 *   tier 1 is tuned to finish in ~30 s with a ~41 s limit.
 */
export function generateLavaJumpLevel(lavaTier = 1): LevelConfig {
  const safeTier = Math.max(1, Math.min(10, Math.floor(lavaTier)));
  const rng = new SeededRNG(77300 + safeTier * 61);
  const baseSpeed = Number((8.8 + (safeTier - 1) * 0.28).toFixed(2));
  const addBonus = Math.floor((safeTier - 1) / 2) * 2;
  const stoneW = Number(Math.max(4.2, 5.0 - (safeTier - 1) * 0.1).toFixed(2));
  const depth = 4.4;
  const targetLength = 250 + (safeTier - 1) * 22;

  const platforms: LavaPlatformConfig[] = [
    { id: 'lava_shore_start', row: 0, d: -3, x: 0, width: 19, depth: 13, kind: 'shore' },
  ];
  const eruptions: LavaEruptionConfig[] = [];
  const rocks: LavaRockConfig[] = [];
  const gatePairs: Array<[{ op: 'add' | 'mul'; value: number }, { op: 'add' | 'mul'; value: number }]> = [
    [{ op: 'add', value: 5 + addBonus }, { op: 'add', value: 8 + addBonus }],
    [{ op: 'mul', value: 2 }, { op: 'add', value: 10 + addBonus }],
    [{ op: 'add', value: 8 + addBonus }, { op: 'add', value: 12 + addBonus }],
    [{ op: 'mul', value: 2 }, { op: 'add', value: 14 + addBonus }],
    [{ op: 'add', value: 10 + addBonus }, { op: 'mul', value: 2 }],
  ];
  const pattern: Array<'stone' | 'gates' | 'eruption' | 'cooled' | 'rocks'> = [
    'stone',
    'gates',
    'eruption',
    'stone',
    'cooled',
    'rocks',
    'gates',
    'eruption',
    'stone',
    'rocks',
    'cooled',
    'gates',
    'eruption',
    'rocks',
  ];
  const pairLanes: Array<[number, number]> = [
    [-4.6, 2.6],
    [-2.6, 4.6],
    [-5.0, 4.4],
    [-4.4, 5.0],
    [-3.8, 3.8],
  ];
  const shrink = Math.min(1.6, (safeTier - 1) * 0.22);
  const jitter = (): number => Number(rng.range(-0.45, 0.45).toFixed(2));
  let d = 3.5 + 6.6 + depth / 2;
  let row = 1;
  let k = 0;
  let gateIdx = 0;
  let lastEnd = 3.5;
  while (d + depth / 2 < targetLength - 6.5) {
    const kind = pattern[k % pattern.length];
    const lanes = rng.pick(pairLanes);
    const mirror = rng.chance(0.5);
    const xa = Number(((mirror ? -lanes[1] : lanes[0]) + jitter()).toFixed(2));
    const xb = Number(((mirror ? -lanes[0] : lanes[1]) + jitter()).toFixed(2));
    const base = { row, d: Number(d.toFixed(2)), depth };
    if (kind === 'gates') {
      const pair = gatePairs[gateIdx % gatePairs.length];
      const swap = rng.chance(0.5);
      const left = swap ? pair[1] : pair[0];
      const right = swap ? pair[0] : pair[1];
      for (const [side, g] of [
        [-1, left],
        [1, right],
      ] as const) {
        platforms.push({
          ...base,
          id: `lava_p${row}_${side < 0 ? 'l' : 'r'}`,
          x: Number((side * 4.0 + jitter() * 0.6).toFixed(2)),
          width: stoneW,
          kind: 'stone',
          gateOp: g.op,
          gateValue: g.value,
          gateStyle: g.op === 'mul' ? 'gold' : g.value >= 10 ? 'mega' : 'blue',
        });
      }
      gateIdx++;
    } else if (kind === 'eruption') {
      platforms.push({ ...base, id: `lava_p${row}_a`, x: xa, width: stoneW, kind: 'stone' });
      platforms.push({ ...base, id: `lava_p${row}_b`, x: xb, width: Number((stoneW - 0.4).toFixed(2)), kind: 'stone' });
      eruptions.push({
        id: `lava_erupt_${row}`,
        row,
        d: base.d,
        x: xa,
        radius: Number((stoneW / 2 + 0.5).toFixed(2)),
        knockCap: 7 + safeTier,
      });
    } else if (kind === 'cooled') {
      platforms.push({ ...base, id: `lava_p${row}_c`, x: xa, width: 7.0, kind: 'cooled' });
      platforms.push({ ...base, id: `lava_p${row}_b`, x: xb, width: Number((stoneW - 0.8).toFixed(2)), kind: 'stone' });
    } else if (kind === 'rocks') {
      const wideW = Number((stoneW + 0.6).toFixed(2));
      platforms.push({ ...base, id: `lava_p${row}_a`, x: xa, width: wideW, kind: 'stone' });
      platforms.push({ ...base, id: `lava_p${row}_b`, x: xb, width: Number((stoneW - 0.6).toFixed(2)), kind: 'stone' });
      const side = rng.chance(0.5) ? -1 : 1;
      rocks.push({
        id: `lava_rock_${row}_a`,
        row,
        d: Number((base.d + rng.range(-0.8, 0.8)).toFixed(2)),
        x: Number((xa + side * 1.25).toFixed(2)),
        radius: 1.25,
        knockCap: 5 + Math.floor(safeTier / 2),
      });
      if (safeTier >= 4) {
        rocks.push({
          id: `lava_rock_${row}_b`,
          row,
          d: Number((base.d + rng.range(-0.6, 0.6)).toFixed(2)),
          x: Number((xb - side * 1.0).toFixed(2)),
          radius: 1.0,
          knockCap: 4 + Math.floor(safeTier / 3),
        });
      }
    } else {
      const narrowA = rng.chance(0.5);
      platforms.push({
        ...base,
        id: `lava_p${row}_a`,
        x: xa,
        width: Number((narrowA ? stoneW - 0.5 : stoneW).toFixed(2)),
        kind: 'stone',
      });
      platforms.push({
        ...base,
        id: `lava_p${row}_b`,
        x: xb,
        width: Number((narrowA ? stoneW : stoneW - 0.5).toFixed(2)),
        kind: 'stone',
      });
    }
    lastEnd = d + depth / 2;
    d += 10.8 + rng.range(0, 1.6) - shrink;
    row++;
    k++;
  }

  // Exit shore: its near edge is the finish line (course length), a final ~7 m leap after the last row
  const length = Math.round(lastEnd + 7.2);
  platforms.push({ id: 'lava_shore_exit', row, d: length + 6.5, x: 0, width: 19, depth: 13, kind: 'shore' });
  const timeLimitSec = Math.round((length / baseSpeed) * Math.max(1.24, 1.38 - (safeTier - 1) * 0.02));
  const course: LavaJumpCourseConfig = {
    length,
    baseSpeed,
    timeLimitSec,
    startBobos: 16 + Math.floor((safeTier - 1) / 2),
    maxBobos: 90,
    maxSteerX: 7.6,
    hopHeight: 2.0,
    hitSlowMult: 0.55,
    hitSlowSec: 0.8,
    cooledShieldSec: 2.4,
  };

  return {
    id: 2 + safeTier * 2,
    seed: 77300 + safeTier * 61,
    mode: 'lava_jump',
    isLavaJump: true,
    lavaTier: safeTier,
    lavaCourse: course,
    lavaPlatforms: platforms,
    lavaEruptions: eruptions,
    lavaRocks: rocks,
    themeId: 'magma',
    archetype: 'trilane_siege',
    archetypeName: `火山熔岩跳台突围战 · 第 ${safeTier} 阶`,
    isMilestoneBoss: false,
    isMiniBoss: false,
    isMegaBoss: false,
    name: `火山熔岩跳台突围战 · 第 ${safeTier} 阶`,
    subtitle: '连跳浮石 · 躲喷发落石 · 冲出火山口',
    bossName: '火山出口',
    bossMaxHp: 100,
    enemySpawnInterval: 999,
    enemyBurstCount: 0,
    initialRedPrewarm: 0,
    bruteSpawnInterval: 0,
    rewardGold: Math.round(380 * (1 + (safeTier - 1) * 0.12)),
    gates: [],
    walls: [],
    gears: [],
    nests: [],
    barrels: [],
    zones: [],
    bumpers: [],
    bossSubTowers: [],
  };
}

/**
 * Generates the dedicated MC-14「星际陨石带护盾突围」(Asteroid Belt Shield Breakout) stage:
 * - Deep-space tint over the carnival theme. A low-gravity glowing space track scrolls toward the camera (treadmill);
 *   the Bobo squad floats forward in formation and is steered left / right with the cannon aim.
 * - Course rows: unit gate pairs (+N / ×N), shield-charge gates (a temporary energy shield on the whole squad that
 *   absorbs a few hazard hits, paired with a small +N gate on the other side), telegraphed asteroid strikes (red
 *   warning ring that charges while the rock falls slowly, then blasts a circle) and drifting asteroid belts with one
 *   flagged safe gap. A warp gate at the far end is the exit.
 * - Win: reach the warp gate before the countdown ends. Lose: time runs out or every Bobo is lost.
 * - Regular red waves are disabled. Pace / belt gap / strike radius & strength scale with `asteroidTier`;
 *   tier 1 is tuned to finish in ~30 s with a ~40 s limit.
 */
export function generateAsteroidDashLevel(asteroidTier = 1): LevelConfig {
  const safeTier = Math.max(1, Math.min(10, Math.floor(asteroidTier)));
  const rng = new SeededRNG(88400 + safeTier * 67);
  const baseSpeed = Number((8.0 + (safeTier - 1) * 0.26).toFixed(2));
  const addBonus = Math.floor((safeTier - 1) / 2) * 2;
  const targetLength = 232 + (safeTier - 1) * 20;
  const gapW = Number(Math.max(3.6, 5.4 - (safeTier - 1) * 0.22).toFixed(2));
  const meteorR = Number(Math.min(2.7, 2.0 + (safeTier - 1) * 0.08).toFixed(2));
  const shieldCharges = safeTier >= 5 ? 2 : 3;
  const halfLane = 3.75;
  const laneW = 6.7;

  const gates: AsteroidGateConfig[] = [];
  const meteors: AsteroidMeteorConfig[] = [];
  const belts: AsteroidBeltConfig[] = [];
  const gatePairs: Array<[{ op: 'add' | 'mul'; value: number }, { op: 'add' | 'mul'; value: number }]> = [
    [{ op: 'add', value: 5 + addBonus }, { op: 'add', value: 8 + addBonus }],
    [{ op: 'mul', value: 2 }, { op: 'add', value: 10 + addBonus }],
    [{ op: 'add', value: 8 + addBonus }, { op: 'add', value: 12 + addBonus }],
    [{ op: 'mul', value: 2 }, { op: 'add', value: 14 + addBonus }],
    [{ op: 'add', value: 10 + addBonus }, { op: 'mul', value: 2 }],
  ];
  const pattern: Array<'gates' | 'meteor' | 'shield' | 'belt' | 'meteors'> = [
    'gates',
    'meteor',
    'shield',
    'belt',
    'gates',
    'meteors',
    'belt',
    'gates',
    'shield',
    'meteor',
    'belt',
    'gates',
    'meteors',
    'belt',
  ];
  const shrink = Math.min(1.6, (safeTier - 1) * 0.2);
  let d = 17;
  let k = 0;
  let gateIdx = 0;
  while (d < targetLength - 10) {
    const kind = pattern[k % pattern.length];
    const dd = Number(d.toFixed(2));
    if (kind === 'gates') {
      const pair = gatePairs[gateIdx % gatePairs.length];
      const swap = rng.chance(0.5);
      const left = swap ? pair[1] : pair[0];
      const right = swap ? pair[0] : pair[1];
      for (const [side, g] of [
        [-1, left],
        [1, right],
      ] as const) {
        gates.push({
          id: `ast_g${k}_${side < 0 ? 'l' : 'r'}`,
          d: dd,
          x: side * halfLane,
          width: laneW,
          kind: 'unit',
          op: g.op,
          value: g.value,
          style: g.op === 'mul' ? 'gold' : g.value >= 10 ? 'mega' : 'blue',
        });
      }
      gateIdx++;
    } else if (kind === 'shield') {
      const side = rng.chance(0.5) ? -1 : 1;
      gates.push({
        id: `ast_s${k}`,
        d: dd,
        x: side * halfLane,
        width: laneW,
        kind: 'shield',
        value: shieldCharges,
        style: 'frost',
      });
      gates.push({
        id: `ast_s${k}_unit`,
        d: dd,
        x: -side * halfLane,
        width: laneW,
        kind: 'unit',
        op: 'add',
        value: 4 + addBonus,
        style: 'blue',
      });
    } else if (kind === 'belt') {
      const gx = Number(rng.range(-5.2, 5.2).toFixed(2));
      belts.push({ id: `ast_b${k}`, d: dd, gapX: gx, gapW, knockCap: 8 + safeTier * 2 });
    } else {
      const count = kind === 'meteors' && safeTier >= 3 ? 2 : 1;
      const firstX = Number(rng.range(-4.6, 4.6).toFixed(2));
      meteors.push({ id: `ast_m${k}_a`, d: dd, x: firstX, radius: meteorR, knockCap: 6 + safeTier });
      if (count === 2) {
        const secondX = Number((firstX > 0 ? firstX - rng.range(5.2, 7.0) : firstX + rng.range(5.2, 7.0)).toFixed(2));
        meteors.push({
          id: `ast_m${k}_b`,
          d: Number((dd + rng.range(3.0, 5.0)).toFixed(2)),
          x: Math.max(-6.8, Math.min(6.8, secondX)),
          radius: meteorR,
          knockCap: 5 + safeTier,
        });
      }
    }
    d += 15.6 + rng.range(0, 1.6) - shrink;
    k++;
  }

  const length = Math.round(d + 4);
  const timeLimitSec = Math.round((length / baseSpeed) * Math.max(1.24, 1.38 - (safeTier - 1) * 0.02));
  const course: AsteroidDashCourseConfig = {
    length,
    baseSpeed,
    timeLimitSec,
    startBobos: 16 + Math.floor((safeTier - 1) / 2),
    maxBobos: 90,
    maxSteerX: 7.4,
    floatHeight: 0.55,
    hitSlowMult: 0.55,
    hitSlowSec: 0.8,
    shieldSec: 6.5,
  };

  return {
    id: 3 + safeTier * 2,
    seed: 88400 + safeTier * 67,
    mode: 'asteroid_dash',
    isAsteroidDash: true,
    asteroidTier: safeTier,
    asteroidCourse: course,
    asteroidGates: gates,
    asteroidMeteors: meteors,
    asteroidBelts: belts,
    themeId: 'cyberhive',
    archetype: 'trilane_siege',
    archetypeName: `星际陨石带护盾突围 · 第 ${safeTier} 阶`,
    isMilestoneBoss: false,
    isMiniBoss: false,
    isMegaBoss: false,
    name: `星际陨石带护盾突围 · 第 ${safeTier} 阶`,
    subtitle: '躲陨石 · 穿护盾门 · 冲进跃迁门',
    bossName: '跃迁门',
    bossMaxHp: 100,
    enemySpawnInterval: 999,
    enemyBurstCount: 0,
    initialRedPrewarm: 0,
    bruteSpawnInterval: 0,
    rewardGold: Math.round(400 * (1 + (safeTier - 1) * 0.12)),
    gates: [],
    walls: [],
    gears: [],
    nests: [],
    barrels: [],
    zones: [],
    bumpers: [],
    bossSubTowers: [],
  };
}

/**
 * Generates the dedicated MC-15「幽灵古堡南瓜夜」(Haunted Castle Pumpkin Night) stage:
 * - Its own night-castle scene (moonlit royal-castle base, crenellated side walls, towers, moon & stars) instead of the
 *   carnival. The castle corridor scrolls toward the camera (treadmill) while the Bobo squad marches forward in
 *   formation and is steered left / right with the cannon aim.
 * - Course rows: unit gate pairs (+N / ×N), pumpkin-lantern lit zones (refill the squad's lantern light; ghosts that
 *   touch a squad standing in the light are dispelled for free), wall-phasing ghosts that glide out of the castle side
 *   walls to intercept the squad at a marked point (the lantern light dispels them if it is bright enough, otherwise
 *   they scare Bobos away), inner castle walls with one open archway, and "haunt" rows where a ghost converges on a lamp.
 * - The lantern light drains over time; with no light left the squad gropes through the dark (slower pace).
 * - Win: run out through the castle gate before the countdown ends. Lose: time runs out or every Bobo is scared off.
 * - Regular red waves are disabled. Pace / archway / ghost sweep, size & strength / light drain scale with `pumpkinTier`;
 *   tier 1 is tuned to finish in ~30 s with a ~41 s limit.
 */
export function generatePumpkinNightLevel(pumpkinTier = 1): LevelConfig {
  const safeTier = Math.max(1, Math.min(10, Math.floor(pumpkinTier)));
  const rng = new SeededRNG(93100 + safeTier * 71);
  const baseSpeed = Number((7.8 + (safeTier - 1) * 0.26).toFixed(2));
  const addBonus = Math.floor((safeTier - 1) / 2) * 2;
  const targetLength = 228 + (safeTier - 1) * 20;
  const doorW = Number(Math.max(3.8, 5.4 - (safeTier - 1) * 0.2).toFixed(2));
  const lampR = Number(Math.max(2.1, 2.7 - (safeTier - 1) * 0.08).toFixed(2));
  const ghostR = Number(Math.min(1.6, 1.1 + (safeTier - 1) * 0.06).toFixed(2));
  const sweep = Number(Math.min(0.8, 0.55 + (safeTier - 1) * 0.03).toFixed(3));
  const halfLane = 3.75;
  const laneW = 6.7;

  const gates: PumpkinGateConfig[] = [];
  const lamps: PumpkinLampConfig[] = [];
  const ghosts: PumpkinGhostConfig[] = [];
  const walls: PumpkinWallConfig[] = [];
  const gatePairs: Array<[{ op: 'add' | 'mul'; value: number }, { op: 'add' | 'mul'; value: number }]> = [
    [{ op: 'add', value: 5 + addBonus }, { op: 'add', value: 8 + addBonus }],
    [{ op: 'mul', value: 2 }, { op: 'add', value: 10 + addBonus }],
    [{ op: 'add', value: 8 + addBonus }, { op: 'add', value: 12 + addBonus }],
    [{ op: 'mul', value: 2 }, { op: 'add', value: 14 + addBonus }],
  ];
  const pattern: Array<'gates' | 'ghost' | 'lamp' | 'wall' | 'ghosts' | 'haunt'> = [
    'gates',
    'ghost',
    'lamp',
    'wall',
    'gates',
    'haunt',
    'ghosts',
    'wall',
    'gates',
    'lamp',
    'ghost',
    'haunt',
    'wall',
    'gates',
  ];
  const shrink = Math.min(1.6, (safeTier - 1) * 0.2);
  let d = 17;
  let k = 0;
  let gateIdx = 0;
  let lampSide: -1 | 1 = rng.chance(0.5) ? -1 : 1;
  const ghostOf = (id: string, dd: number, side: -1 | 1, crossX: number, knockCap: number): PumpkinGhostConfig => ({
    id,
    d: Number(dd.toFixed(2)),
    side,
    crossX: Number(Math.max(-5.6, Math.min(5.6, crossX)).toFixed(2)),
    sweep,
    radius: ghostR,
    knockCap,
  });
  while (d < targetLength - 10) {
    const kind = pattern[k % pattern.length];
    const dd = Number(d.toFixed(2));
    if (kind === 'gates') {
      const pair = gatePairs[gateIdx % gatePairs.length];
      const swap = rng.chance(0.5);
      const left = swap ? pair[1] : pair[0];
      const right = swap ? pair[0] : pair[1];
      for (const [side, g] of [
        [-1, left],
        [1, right],
      ] as const) {
        gates.push({
          id: `pk_g${k}_${side < 0 ? 'l' : 'r'}`,
          d: dd,
          x: side * halfLane,
          width: laneW,
          op: g.op,
          value: g.value,
          style: g.op === 'mul' ? 'gold' : g.value >= 10 ? 'mega' : 'blue',
        });
      }
      gateIdx++;
    } else if (kind === 'lamp' || kind === 'haunt') {
      lampSide = lampSide < 0 ? 1 : -1;
      const lx = Number((lampSide * rng.range(2.4, 5.0)).toFixed(2));
      lamps.push({ id: `pk_l${k}`, d: dd, x: lx, radius: lampR });
      if (kind === 'haunt') {
        // The ghost converges on the lantern: step into the light (free dispel + refill) or swing wide of it
        const side: -1 | 1 = lx > 0 ? -1 : 1;
        ghosts.push(ghostOf(`pk_h${k}`, dd + 0.6, side, lx + rng.range(-0.6, 0.6), 5 + safeTier));
      }
    } else if (kind === 'wall') {
      const doorX = Number(rng.range(-5.0, 5.0).toFixed(2));
      walls.push({ id: `pk_w${k}`, d: dd, doorX, doorW, knockCap: 8 + safeTier * 2 });
    } else {
      const count = kind === 'ghosts' && safeTier >= 3 ? 2 : 1;
      const side: -1 | 1 = rng.chance(0.5) ? -1 : 1;
      const firstX = rng.range(-4.6, 4.6);
      ghosts.push(ghostOf(`pk_s${k}_a`, dd, side, firstX, 6 + safeTier));
      if (count === 2) {
        const secondX = firstX > 0 ? firstX - rng.range(5.2, 7.0) : firstX + rng.range(5.2, 7.0);
        ghosts.push(ghostOf(`pk_s${k}_b`, dd + rng.range(3.0, 5.0), side < 0 ? 1 : -1, secondX, 5 + safeTier));
      }
    }
    d += 15.6 + rng.range(0, 1.6) - shrink;
    k++;
  }

  const length = Math.round(d + 4);
  const timeLimitSec = Math.round((length / baseSpeed) * Math.max(1.24, 1.38 - (safeTier - 1) * 0.02));
  const course: PumpkinNightCourseConfig = {
    length,
    baseSpeed,
    timeLimitSec,
    startBobos: 16 + Math.floor((safeTier - 1) / 2),
    maxBobos: 90,
    maxSteerX: 7.4,
    lightMax: 100,
    lightDecayPerSec: Number((4.5 + (safeTier - 1) * 0.4).toFixed(2)),
    lightRefillPerSec: 110,
    ghostLightCost: 34,
    darkSlowMult: 0.7,
    hitSlowMult: 0.55,
    hitSlowSec: 0.8,
  };

  return {
    id: 3 + safeTier * 2,
    seed: 93100 + safeTier * 71,
    mode: 'pumpkin_night',
    isPumpkinNight: true,
    pumpkinTier: safeTier,
    pumpkinCourse: course,
    pumpkinGates: gates,
    pumpkinLamps: lamps,
    pumpkinGhosts: ghosts,
    pumpkinWalls: walls,
    themeId: 'royal',
    archetype: 'trilane_siege',
    archetypeName: `幽灵古堡南瓜夜 · 第 ${safeTier} 阶`,
    isMilestoneBoss: false,
    isMiniBoss: false,
    isMegaBoss: false,
    name: `幽灵古堡南瓜夜 · 第 ${safeTier} 阶`,
    subtitle: '踩灯补光 · 驱散幽灵 · 冲出城门',
    bossName: '古堡城门',
    bossMaxHp: 100,
    enemySpawnInterval: 999,
    enemyBurstCount: 0,
    initialRedPrewarm: 0,
    bruteSpawnInterval: 0,
    rewardGold: Math.round(420 * (1 + (safeTier - 1) * 0.12)),
    gates: [],
    walls: [],
    gears: [],
    nests: [],
    barrels: [],
    zones: [],
    bumpers: [],
    bossSubTowers: [],
  };
}

/**
 * Generates the dedicated MC-16「沙漠金字塔机关跑酷」(Desert Pyramid Trap Run) stage:
 * - Its own desert-pyramid scene (sunset desert sky, dunes, distant pyramids, obelisks & palms over a sandstone tomb
 *   passage) instead of the carnival / gear-town backdrop. The tomb passage scrolls toward the camera (treadmill) while
 *   the Bobo squad runs forward in formation and is steered left / right with the cannon aim.
 * - Course rows: unit gate pairs (+N / ×N), quicksand belts across the whole passage with one firm stepping-stone path
 *   (sand drags the pace down and swallows Bobos that linger), and flip-slab rows whose slabs cycle closed -> warning
 *   -> flipped open over a pit on the run clock (Bobos on an open slab are flung away; a candy shield absorbs it).
 * - Win: run out of the tomb gate before the countdown ends. Lose: time runs out or every Bobo is lost.
 * - Regular red waves are disabled. Pace / course length / stone-path width / belt length / sink time / slab cycle and
 *   slab count scale with `pyramidTier`; tier 1 is tuned to finish in ~30 s with a ~41 s limit.
 */
export function generatePyramidRunLevel(pyramidTier = 1): LevelConfig {
  const safeTier = Math.max(1, Math.min(10, Math.floor(pyramidTier)));
  const rng = new SeededRNG(96400 + safeTier * 83);
  const baseSpeed = Number((7.8 + (safeTier - 1) * 0.26).toFixed(2));
  const addBonus = Math.floor((safeTier - 1) / 2) * 2;
  const targetLength = 228 + (safeTier - 1) * 20;
  const pathW = Number(Math.max(2.6, 3.8 - (safeTier - 1) * 0.15).toFixed(2));
  const sandLen = Number(Math.min(7.6, 5.0 + (safeTier - 1) * 0.32).toFixed(2));
  const slabDepth = Number(Math.min(3.4, 2.6 + (safeTier - 1) * 0.1).toFixed(2));
  const period = Number(Math.max(2.5, 3.4 - (safeTier - 1) * 0.12).toFixed(2));
  const openSec = Number(Math.min(1.36, 1.1 + (safeTier - 1) * 0.04).toFixed(2));
  const warnSec = Number(Math.max(0.5, 0.78 - (safeTier - 1) * 0.04).toFixed(2));
  const slabCount = safeTier >= 4 ? 5 : 4;
  const slabSpanHalf = 10.4;
  const slabW = Number(((slabSpanHalf * 2) / slabCount).toFixed(3));
  const halfLane = 3.75;
  const laneW = 6.7;

  const gates: PyramidGateConfig[] = [];
  const sands: PyramidSandConfig[] = [];
  const slabRows: PyramidSlabRowConfig[] = [];
  const gatePairs: Array<[{ op: 'add' | 'mul'; value: number }, { op: 'add' | 'mul'; value: number }]> = [
    [{ op: 'add', value: 5 + addBonus }, { op: 'add', value: 8 + addBonus }],
    [{ op: 'mul', value: 2 }, { op: 'add', value: 10 + addBonus }],
    [{ op: 'add', value: 8 + addBonus }, { op: 'add', value: 12 + addBonus }],
    [{ op: 'mul', value: 2 }, { op: 'add', value: 14 + addBonus }],
  ];
  const pattern: Array<'gates' | 'sand' | 'slabs'> = [
    'gates',
    'sand',
    'slabs',
    'gates',
    'slabs',
    'sand',
    'gates',
    'slabs',
    'sand',
    'gates',
    'slabs',
    'sand',
    'gates',
    'slabs',
  ];
  const shrink = Math.min(1.6, (safeTier - 1) * 0.2);
  let d = 17;
  let k = 0;
  let gateIdx = 0;
  let lastPathX = 0;
  while (d < targetLength - 10) {
    const kind = pattern[k % pattern.length];
    const dd = Number(d.toFixed(2));
    let extra = 0;
    if (kind === 'gates') {
      const pair = gatePairs[gateIdx % gatePairs.length];
      const swap = rng.chance(0.5);
      const left = swap ? pair[1] : pair[0];
      const right = swap ? pair[0] : pair[1];
      for (const [side, g] of [
        [-1, left],
        [1, right],
      ] as const) {
        gates.push({
          id: `py_g${k}_${side < 0 ? 'l' : 'r'}`,
          d: dd,
          x: side * halfLane,
          width: laneW,
          op: g.op,
          value: g.value,
          style: g.op === 'mul' ? 'gold' : g.value >= 10 ? 'mega' : 'blue',
        });
      }
      gateIdx++;
    } else if (kind === 'sand') {
      // The stone path never sits right where the previous one was (the squad has to read every belt)
      let pathX = Number(rng.range(-5.2, 5.2).toFixed(2));
      if (Math.abs(pathX - lastPathX) < 2.4) pathX = Number((pathX > 0 ? pathX - 4.6 : pathX + 4.6).toFixed(2));
      lastPathX = pathX;
      sands.push({ id: `py_s${k}`, d: dd, length: sandLen, pathX, pathW, knockCap: 5 + safeTier });
      extra = sandLen;
    } else {
      // Staggered flip cycle: slab i opens `period / count` after the previous one in a shuffled order
      const order = Array.from({ length: slabCount }, (_, i) => i);
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(rng.next() * (i + 1));
        const tmp = order[i];
        order[i] = order[j];
        order[j] = tmp;
      }
      const shift = rng.range(0, period);
      const slabs: PyramidSlabConfig[] = [];
      for (let i = 0; i < slabCount; i++) {
        slabs.push({
          x: Number((-slabSpanHalf + slabW * (i + 0.5)).toFixed(3)),
          width: slabW,
          offset: Number((((order[i] * period) / slabCount + shift) % period).toFixed(3)),
        });
      }
      slabRows.push({
        id: `py_f${k}`,
        d: dd,
        depth: slabDepth,
        period,
        openSec,
        warnSec,
        knockCap: 6 + safeTier,
        slabs,
      });
    }
    d += extra + 14.8 + rng.range(0, 1.6) - shrink;
    k++;
  }

  const length = Math.round(d + 4);
  const timeLimitSec = Math.round((length / baseSpeed) * Math.max(1.24, 1.38 - (safeTier - 1) * 0.02));
  const course: PyramidRunCourseConfig = {
    length,
    baseSpeed,
    timeLimitSec,
    startBobos: 16 + Math.floor((safeTier - 1) / 2),
    maxBobos: 90,
    maxSteerX: 7.4,
    sandSlowMult: Number(Math.max(0.36, 0.5 - (safeTier - 1) * 0.02).toFixed(2)),
    sinkSec: Number(Math.max(0.95, 1.6 - (safeTier - 1) * 0.08).toFixed(2)),
    hitSlowMult: 0.55,
    hitSlowSec: 0.8,
  };

  return {
    id: 4 + safeTier * 2,
    seed: 96400 + safeTier * 83,
    mode: 'pyramid_run',
    isPyramidRun: true,
    pyramidTier: safeTier,
    pyramidCourse: course,
    pyramidGates: gates,
    pyramidSands: sands,
    pyramidSlabRows: slabRows,
    themeId: 'wasteland',
    archetype: 'trilane_siege',
    archetypeName: `沙漠金字塔机关跑酷 · 第 ${safeTier} 阶`,
    isMilestoneBoss: false,
    isMiniBoss: false,
    isMegaBoss: false,
    name: `沙漠金字塔机关跑酷 · 第 ${safeTier} 阶`,
    subtitle: '踩石板过流沙 · 躲翻板 · 冲出墓道',
    bossName: '墓道出口',
    bossMaxHp: 100,
    enemySpawnInterval: 999,
    enemyBurstCount: 0,
    initialRedPrewarm: 0,
    bruteSpawnInterval: 0,
    rewardGold: Math.round(440 * (1 + (safeTier - 1) * 0.12)),
    gates: [],
    walls: [],
    gears: [],
    nests: [],
    barrels: [],
    zones: [],
    bumpers: [],
    bossSubTowers: [],
  };
}

/**
 * Generates the dedicated MC-17「丛林神庙藤蔓秋千」(Jungle Temple Vine Swing) stage:
 * - Its own jungle-temple scene (misty green sky, a stepped jade temple, canopy hills, giant trees & fireflies over a
 *   mossy temple path) instead of the carnival / gear-town backdrop. The temple path scrolls toward the camera
 *   (treadmill) while the Bobo squad runs forward in formation and is steered left / right with the cannon aim.
 * - Course rows: unit gate pairs (+N / ×N), chasms across the whole path that can only be crossed on a swaying vine
 *   (line the squad up under a vine as the front reaches the edge; Bobos out of its reach fall, capped per chasm), and
 *   rolling boulders that wake up as the squad approaches and roll down their lane toward it (flattening the Bobos in
 *   that lane, capped per boulder; a candy shield absorbs a fall or a boulder once).
 * - Win: run out of the temple gate before the countdown ends. Lose: time runs out or every Bobo is lost.
 * - Regular red waves are disabled. Pace / course length / chasm width / vine reach, sway and speed / boulder size,
 *   speed and count scale with `jungleTier`; tier 1 is tuned to finish in ~30 s with a ~41 s limit.
 */
export function generateJungleSwingLevel(jungleTier = 1): LevelConfig {
  const safeTier = Math.max(1, Math.min(10, Math.floor(jungleTier)));
  const rng = new SeededRNG(97300 + safeTier * 89);
  const baseSpeed = Number((7.8 + (safeTier - 1) * 0.26).toFixed(2));
  const addBonus = Math.floor((safeTier - 1) / 2) * 2;
  const targetLength = 228 + (safeTier - 1) * 20;
  const gap = Number(Math.min(7.0, 4.6 + (safeTier - 1) * 0.3).toFixed(2));
  const reach = Number(Math.max(1.75, 2.6 - (safeTier - 1) * 0.12).toFixed(2));
  const amp = Number(Math.min(4.0, 2.0 + (safeTier - 1) * 0.28).toFixed(2));
  const vinePeriod = Number(Math.max(2.4, 3.6 - (safeTier - 1) * 0.16).toFixed(2));
  const boulderR = Number(Math.min(1.7, 1.25 + (safeTier - 1) * 0.06).toFixed(2));
  const boulderSpeed = Number(Math.min(9, 5.2 + (safeTier - 1) * 0.45).toFixed(2));
  const twinBoulders = safeTier >= 5;
  const halfLane = 3.75;
  const laneW = 6.7;

  const gates: JungleGateConfig[] = [];
  const chasms: JungleChasmConfig[] = [];
  const boulders: JungleBoulderConfig[] = [];
  const gatePairs: Array<[{ op: 'add' | 'mul'; value: number }, { op: 'add' | 'mul'; value: number }]> = [
    [{ op: 'add', value: 5 + addBonus }, { op: 'add', value: 8 + addBonus }],
    [{ op: 'mul', value: 2 }, { op: 'add', value: 10 + addBonus }],
    [{ op: 'add', value: 8 + addBonus }, { op: 'add', value: 12 + addBonus }],
    [{ op: 'mul', value: 2 }, { op: 'add', value: 14 + addBonus }],
  ];
  const pattern: Array<'gates' | 'chasm' | 'boulder'> = [
    'gates',
    'chasm',
    'boulder',
    'gates',
    'boulder',
    'chasm',
    'gates',
    'chasm',
    'boulder',
    'gates',
    'boulder',
    'chasm',
    'gates',
    'chasm',
  ];
  const shrink = Math.min(1.6, (safeTier - 1) * 0.2);
  // Vine sway centres keep every grab point well inside the view on a portrait phone too (|x| <= 4.0, so even a
  // 7-column squad hanging on an outer vine stays on screen)
  const vineLo = Math.min(4.0 - amp, 1.0 + amp * 0.5);
  const vineHi = Math.max(vineLo, 4.0 - amp);
  let d = 17;
  let k = 0;
  let gateIdx = 0;
  let lastLane = 0;
  while (d < targetLength - 10) {
    const kind = pattern[k % pattern.length];
    const dd = Number(d.toFixed(2));
    let extra = 0;
    if (kind === 'gates') {
      const pair = gatePairs[gateIdx % gatePairs.length];
      const swap = rng.chance(0.5);
      const left = swap ? pair[1] : pair[0];
      const right = swap ? pair[0] : pair[1];
      for (const [side, g] of [
        [-1, left],
        [1, right],
      ] as const) {
        gates.push({
          id: `jg_g${k}_${side < 0 ? 'l' : 'r'}`,
          d: dd,
          x: side * halfLane,
          width: laneW,
          op: g.op,
          value: g.value,
          style: g.op === 'mul' ? 'gold' : g.value >= 10 ? 'mega' : 'blue',
        });
      }
      gateIdx++;
    } else if (kind === 'chasm') {
      // One vine sways over each half of the path, out of step with the other one
      const vines: JungleVineConfig[] = [];
      const phase = rng.range(0, vinePeriod);
      for (const side of [-1, 1]) {
        vines.push({
          x: Number((side * rng.range(vineLo, vineHi)).toFixed(2)),
          amp,
          period: Number((vinePeriod * (side < 0 ? 1 : 1.12)).toFixed(2)),
          offset: Number(((phase + (side < 0 ? 0 : vinePeriod * 0.5)) % vinePeriod).toFixed(3)),
        });
      }
      chasms.push({ id: `jg_c${k}`, d: dd, gap, reach, knockCap: 6 + safeTier, vines });
      extra = gap;
    } else {
      // A boulder never rolls down the lane of the previous one (the squad has to read every ramp)
      let x = Number(rng.range(-5.0, 5.0).toFixed(2));
      if (Math.abs(x - lastLane) < 2.6) x = Number((x > 0 ? x - 4.6 : x + 4.6).toFixed(2));
      lastLane = x;
      boulders.push({ id: `jg_b${k}`, d: dd, x, radius: boulderR, speed: boulderSpeed, wakeD: 30, knockCap: 6 + safeTier });
      if (twinBoulders) {
        // A second boulder on the far side, leaving a corridor of at least 4.4 m between the two lanes
        const x2 = Number((x > 0 ? x - (boulderR * 2 + 4.4 + rng.range(0, 1.2)) : x + (boulderR * 2 + 4.4 + rng.range(0, 1.2))).toFixed(2));
        boulders.push({
          id: `jg_b${k}b`,
          d: Number((dd + 2.4).toFixed(2)),
          x: Math.max(-5.6, Math.min(5.6, x2)),
          radius: boulderR,
          speed: boulderSpeed,
          wakeD: 30,
          knockCap: 6 + safeTier,
        });
      }
    }
    d += extra + 14.8 + rng.range(0, 1.6) - shrink;
    k++;
  }

  const length = Math.round(d + 4);
  const timeLimitSec = Math.round((length / baseSpeed) * Math.max(1.24, 1.38 - (safeTier - 1) * 0.02));
  const course: JungleSwingCourseConfig = {
    length,
    baseSpeed,
    timeLimitSec,
    startBobos: 16 + Math.floor((safeTier - 1) / 2),
    maxBobos: 90,
    maxSteerX: 6.2,
    swingHeight: 1.9,
    hitSlowMult: 0.55,
    hitSlowSec: 0.8,
  };

  return {
    id: 3 + safeTier * 2,
    seed: 97300 + safeTier * 89,
    mode: 'jungle_swing',
    isJungleSwing: true,
    jungleTier: safeTier,
    jungleCourse: course,
    jungleGates: gates,
    jungleChasms: chasms,
    jungleBoulders: boulders,
    themeId: 'emerald',
    archetype: 'trilane_siege',
    archetypeName: `丛林神庙藤蔓秋千 · 第 ${safeTier} 阶`,
    isMilestoneBoss: false,
    isMiniBoss: false,
    isMegaBoss: false,
    name: `丛林神庙藤蔓秋千 · 第 ${safeTier} 阶`,
    subtitle: '荡藤蔓过断崖 · 闪滚石 · 冲出神庙',
    bossName: '神庙出口',
    bossMaxHp: 100,
    enemySpawnInterval: 999,
    enemyBurstCount: 0,
    initialRedPrewarm: 0,
    bruteSpawnInterval: 0,
    rewardGold: Math.round(450 * (1 + (safeTier - 1) * 0.12)),
    gates: [],
    walls: [],
    gears: [],
    nests: [],
    barrels: [],
    zones: [],
    bumpers: [],
    bossSubTowers: [],
  };
}

/**
 * Generates the dedicated MC-18「海盗船跳板突围」(Pirate Plank Breakout) stage on the MC-17 squad-run engine:
 * - Its own pirate-fleet scene (sunny sea sky, open water, distant galleons and a rocky island) instead of the
 *   carnival / gear-town backdrop; the ship decks scroll toward the camera while the Bobo squad runs forward.
 * - Course rows: unit gate pairs (+N / ×N, barrel posts), open sea between two decks that can only be crossed on a
 *   swaying plank hung from a yardarm (Bobos out of its reach fall into the sea, capped per gap), and deck cannons that
 *   fire a cannonball down their lane toward the squad once it comes close (capped per ball; a candy shield absorbs it).
 * - Win: run up the flagship's boarding ramp before the countdown ends. Lose: time runs out or every Bobo is lost.
 * - Regular red waves are disabled. Pace / course length / sea gap / plank reach, sway and speed / cannonball size,
 *   speed and count scale with `pirateTier` (1-8); tier 1 is tuned to finish in ~29 s with a ~40 s limit.
 */
export function generatePirateBoardingLevel(pirateTier = 1): LevelConfig {
  const safeTier = Math.max(1, Math.min(8, Math.floor(pirateTier)));
  const rng = new SeededRNG(98100 + safeTier * 97);
  const baseSpeed = Number((8.0 + (safeTier - 1) * 0.26).toFixed(2));
  const addBonus = Math.floor((safeTier - 1) / 2) * 2;
  const targetLength = 222 + (safeTier - 1) * 20;
  const gap = Number(Math.min(7.0, 4.8 + (safeTier - 1) * 0.3).toFixed(2));
  const reach = Number(Math.max(1.8, 2.65 - (safeTier - 1) * 0.12).toFixed(2));
  const amp = Number(Math.min(3.8, 1.9 + (safeTier - 1) * 0.27).toFixed(2));
  const plankPeriod = Number(Math.max(2.4, 3.4 - (safeTier - 1) * 0.15).toFixed(2));
  const ballR = Number(Math.min(1.35, 1.0 + (safeTier - 1) * 0.05).toFixed(2));
  const ballSpeed = Number(Math.min(10, 6.2 + (safeTier - 1) * 0.45).toFixed(2));
  const twinBalls = safeTier >= 5;
  const halfLane = 3.75;
  const laneW = 6.7;

  const gates: JungleGateConfig[] = [];
  const gaps: JungleChasmConfig[] = [];
  const balls: JungleBoulderConfig[] = [];
  const gatePairs: Array<[{ op: 'add' | 'mul'; value: number }, { op: 'add' | 'mul'; value: number }]> = [
    [{ op: 'add', value: 6 + addBonus }, { op: 'add', value: 9 + addBonus }],
    [{ op: 'mul', value: 2 }, { op: 'add', value: 10 + addBonus }],
    [{ op: 'add', value: 8 + addBonus }, { op: 'add', value: 12 + addBonus }],
    [{ op: 'mul', value: 2 }, { op: 'add', value: 14 + addBonus }],
  ];
  const pattern: Array<'gates' | 'chasm' | 'boulder'> = [
    'gates',
    'boulder',
    'chasm',
    'gates',
    'chasm',
    'boulder',
    'gates',
    'boulder',
    'chasm',
    'gates',
    'chasm',
    'boulder',
    'gates',
    'chasm',
  ];
  const shrink = Math.min(1.6, (safeTier - 1) * 0.2);
  const plankLo = Math.min(4.0 - amp, 1.0 + amp * 0.5);
  const plankHi = Math.max(plankLo, 4.0 - amp);
  let d = 17;
  let k = 0;
  let gateIdx = 0;
  let lastLane = 0;
  while (d < targetLength - 10) {
    const kind = pattern[k % pattern.length];
    const dd = Number(d.toFixed(2));
    let extra = 0;
    if (kind === 'gates') {
      const pair = gatePairs[gateIdx % gatePairs.length];
      const swap = rng.chance(0.5);
      const left = swap ? pair[1] : pair[0];
      const right = swap ? pair[0] : pair[1];
      for (const [side, g] of [
        [-1, left],
        [1, right],
      ] as const) {
        gates.push({
          id: `pr_g${k}_${side < 0 ? 'l' : 'r'}`,
          d: dd,
          x: side * halfLane,
          width: laneW,
          op: g.op,
          value: g.value,
          style: g.op === 'mul' ? 'gold' : g.value >= 10 ? 'mega' : 'blue',
        });
      }
      gateIdx++;
    } else if (kind === 'chasm') {
      // One plank sways over each half of the gap, out of step with the other one
      const planks: JungleVineConfig[] = [];
      const phase = rng.range(0, plankPeriod);
      for (const side of [-1, 1]) {
        planks.push({
          x: Number((side * rng.range(plankLo, plankHi)).toFixed(2)),
          amp,
          period: Number((plankPeriod * (side < 0 ? 1 : 1.1)).toFixed(2)),
          offset: Number(((phase + (side < 0 ? 0 : plankPeriod * 0.5)) % plankPeriod).toFixed(3)),
        });
      }
      gaps.push({ id: `pr_c${k}`, d: dd, gap, reach, knockCap: 6 + safeTier, vines: planks });
      extra = gap;
    } else {
      // A cannon never fires down the lane of the previous one
      let x = Number(rng.range(-5.0, 5.0).toFixed(2));
      if (Math.abs(x - lastLane) < 2.6) x = Number((x > 0 ? x - 4.6 : x + 4.6).toFixed(2));
      lastLane = x;
      balls.push({ id: `pr_b${k}`, d: dd, x, radius: ballR, speed: ballSpeed, wakeD: 32, knockCap: 6 + safeTier });
      if (twinBalls) {
        const x2 = Number((x > 0 ? x - (ballR * 2 + 4.4 + rng.range(0, 1.2)) : x + (ballR * 2 + 4.4 + rng.range(0, 1.2))).toFixed(2));
        balls.push({
          id: `pr_b${k}b`,
          d: Number((dd + 2.4).toFixed(2)),
          x: Math.max(-5.6, Math.min(5.6, x2)),
          radius: ballR,
          speed: ballSpeed,
          wakeD: 32,
          knockCap: 6 + safeTier,
        });
      }
    }
    d += extra + 14.8 + rng.range(0, 1.6) - shrink;
    k++;
  }

  const length = Math.round(d + 4);
  const timeLimitSec = Math.round((length / baseSpeed) * Math.max(1.24, 1.38 - (safeTier - 1) * 0.02));
  const course: JungleSwingCourseConfig = {
    length,
    baseSpeed,
    timeLimitSec,
    startBobos: 16 + Math.floor((safeTier - 1) / 2),
    maxBobos: 90,
    maxSteerX: 6.2,
    swingHeight: 1.7,
    hitSlowMult: 0.55,
    hitSlowSec: 0.8,
  };

  return {
    id: 4 + safeTier * 2,
    seed: 98100 + safeTier * 97,
    mode: 'pirate_plank',
    isJungleSwing: true,
    isPirateBoarding: true,
    pirateTier: safeTier,
    jungleTier: safeTier,
    jungleCourse: course,
    jungleGates: gates,
    jungleChasms: gaps,
    jungleBoulders: balls,
    themeId: 'emerald',
    archetype: 'trilane_siege',
    archetypeName: `海盗船跳板突围 · 第 ${safeTier} 阶`,
    isMilestoneBoss: false,
    isMiniBoss: false,
    isMegaBoss: false,
    name: `海盗船跳板突围 · 第 ${safeTier} 阶`,
    subtitle: '踩跳板过海 · 躲炮弹 · 冲上旗舰',
    bossName: '海盗旗舰',
    bossMaxHp: 100,
    enemySpawnInterval: 999,
    enemyBurstCount: 0,
    initialRedPrewarm: 0,
    bruteSpawnInterval: 0,
    rewardGold: Math.round(460 * (1 + (safeTier - 1) * 0.12)),
    gates: [],
    walls: [],
    gears: [],
    nests: [],
    barrels: [],
    zones: [],
    bumpers: [],
    bossSubTowers: [],
  };
}
