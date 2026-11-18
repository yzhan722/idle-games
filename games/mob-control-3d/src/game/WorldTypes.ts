import * as THREE from 'three';
import {
  AntiAirTurretConfig,
  AsteroidBeltConfig,
  AsteroidGateConfig,
  AsteroidMeteorConfig,
  BarrelConfig,
  BossSubTowerConfig,
  BumperConfig,
  CandyTrainCarConfig,
  CandyVaultConfig,
  CoralBarrierConfig,
  EscortBarricadeConfig,
  GateConfig,
  GearConfig,
  JungleBoulderConfig,
  JungleChasmConfig,
  JungleGateConfig,
  JungleVineConfig,
  LavaEruptionConfig,
  LavaPlatformConfig,
  LavaRockConfig,
  PumpkinGateConfig,
  PumpkinGhostConfig,
  PumpkinLampConfig,
  PumpkinWallConfig,
  PyramidGateConfig,
  PyramidSandConfig,
  PyramidSlabConfig,
  PyramidSlabRowConfig,
  RescueBubbleConfig,
  SideNestConfig,
  SledAvalancheConfig,
  SledBoostConfig,
  SledGateConfig,
  SledIcicleConfig,
  TerrainZoneConfig,
  WallConfig,
} from '../levels/LevelData';
import {
  CannonCoreModId,
  DecorPropId,
  DecorThemeId,
  HallTrophyId,
  MechaMode,
  PetCompanionId,
  RelicBannerId,
  TacticCardId,
} from './State';

export const MAX_UNITS = 2600;
export const MAX_PARTICLES = 1800;
export const MAX_SHOCKWAVES = 72;
export const MAX_SKY_PILLARS = 36;
export const TRACK_HALF_W = 11.2;
export const PLAYER_Z = 18.8;
export const BOSS_GATE_Z = -17.2;

export interface Unit {
  active: boolean;
  id: number;
  team: 'blue' | 'red';
  kind: 'normal' | 'charged' | 'champion' | 'brute' | 'baneling' | 'shaman';
  mechaType?: MechaMode;
  x: number;
  z: number;
  vx: number;
  vz: number;
  yaw: number;
  turnRate: number;
  walkPhase: number;
  attackAnim: number;
  spawnHop: number;
  hp: number;
  maxHp: number;
  dmg: number;
  radius: number;
  speed: number;
  age: number;
  attackCooldown: number;
  specialTimer: number;
  isMiniGiant?: boolean;
  jellyGiant?: boolean;
  frostShield?: boolean;
  fusionTier?: number;
  fusionCooldown?: number;
  empTimer?: number;
  tailwindBoostTimer?: number;
  frostingBurstTimer?: number;
  scatterBounceLeft?: number;
  electroNetTimer?: number;
  syrupSlowTimer?: number;
  syrupVulnMult?: number;
  vanguardSurgeTimer?: number;
  cannonModTag?: CannonCoreModId;
  mortarSiegeBonusMult?: number;
  relicShieldGranted?: boolean;
  jellySlowTimer?: number;
  petShellGranted?: boolean;
  /** MC-12: vertical seat offset while riding the glacier sled deck / snow tubes (0 = on the ground). */
  rideY?: number;
  /** MC-12: formation slot (world x / z) this rider steers to while the glacier sled is sliding. */
  sledSlotX?: number;
  sledSlotZ?: number;
  /** MC-13: index of the lava course row this Bobo last landed on (undefined outside the lava jump run). */
  lavaRow?: number;
  /** MC-13: index of the platform (within that row) this Bobo stands on; -1 = none. */
  lavaPlat?: number;
  passedGates: Set<string>;
}

export interface GateRuntime {
  cfg: GateConfig;
  group: THREE.Group;
  pillarMat: THREE.MeshStandardMaterial;
  shieldMat: THREE.MeshBasicMaterial;
  currentX: number;
  pulseTimer: number;
  addCooldown: number;
  chargeHits: number;
  initialHazardValue?: number;
  flippedFromHazard?: boolean;
  labelEl: HTMLDivElement;
}

export interface BarrelRuntime {
  cfg: BarrelConfig;
  mesh: THREE.Group;
  hp: number;
  alive: boolean;
  labelEl: HTMLDivElement;
}

export interface GearRuntime {
  cfg: GearConfig;
  mesh: THREE.Group;
  baseX: number;
  hp: number;
  alive: boolean;
  hitFlash: number;
  labelEl: HTMLDivElement;
}

export interface WallRuntime {
  cfg: WallConfig;
  group: THREE.Group;
  baseX1: number;
  baseX2: number;
}

export interface ZoneRuntime {
  cfg: TerrainZoneConfig;
  group: THREE.Group;
  beltTex?: THREE.CanvasTexture;
  ringMesh?: THREE.Mesh;
  holoCross?: THREE.Group;
  empPhase?: 'idle' | 'telegraph' | 'pulse';
  empTimer?: number;
  empPulseCount?: number;
  empTelegraphMesh?: THREE.Mesh;
  empTelegraphMat?: THREE.MeshBasicMaterial;
  padCushionGroup?: THREE.Group;
  padBounceAnim?: number;
  windRotors?: THREE.Object3D[];
  labelEl: HTMLDivElement;
}

export interface BumperRuntime {
  cfg: BumperConfig;
  group: THREE.Group;
  ringMat: THREE.MeshBasicMaterial;
  pulseTimer: number;
}

export interface NestRuntime {
  cfg: SideNestConfig;
  group: THREE.Group;
  monsterMesh: THREE.Group;
  hp: number;
  maxHp: number;
  alive: boolean;
  hitFlash: number;
  labelEl: HTMLDivElement;
}

export interface CandyVaultRuntime {
  cfg: CandyVaultConfig;
  group: THREE.Group;
  doorWheel: THREE.Object3D;
  gemCrown: THREE.Object3D;
  hp: number;
  maxHp: number;
  alive: boolean;
  hitFlash: number;
  labelEl: HTMLDivElement;
}

export interface BossSubTowerRuntime {
  cfg: BossSubTowerConfig;
  group: THREE.Group;
  coreMesh: THREE.Mesh;
  valveRing: THREE.Mesh;
  beamMesh: THREE.Mesh;
  beamMat: THREE.MeshBasicMaterial;
  hp: number;
  maxHp: number;
  alive: boolean;
  hitFlash: number;
  labelEl: HTMLDivElement;
}

export interface BossSteamSweepRuntime {
  phase: 'idle' | 'telegraph' | 'sweeping';
  lane: 'left' | 'right';
  timer: number;
  maxTimer: number;
  cooldown: number;
  waveZ: number;
  telegraphGroup: THREE.Group;
  telegraphFillMat: THREE.MeshBasicMaterial;
  telegraphBorderMat: THREE.MeshBasicMaterial;
  waveGroup: THREE.Group;
}

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  scale: number;
  color: THREE.Color;
}

export interface ShockwaveRing {
  active: boolean;
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  life: number;
  maxLife: number;
  maxRadius: number;
}

export interface SkyPillar {
  active: boolean;
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  life: number;
  maxLife: number;
  maxRadius: number;
}

export interface CombatLightRuntime {
  light: THREE.PointLight;
  life: number;
  maxLife: number;
  maxIntensity: number;
}

export interface MeteorTelegraphRuntime {
  active: boolean;
  x: number;
  z: number;
  radius: number;
  timer: number;
  maxTimer: number;
  isTurretLock: boolean;
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
}

export type TacticalAirdropBuffId = 'dual_volley' | 'freeze_reds' | 'frontline_giants';

export interface TacticalAirdropRuntime {
  active: boolean;
  phase: 'falling' | 'landed';
  x: number;
  y: number;
  z: number;
  hp: number;
  maxHp: number;
  bobPhase: number;
  lifeTimer: number;
  group: THREE.Group;
  parachuteGroup: THREE.Group;
  crateMesh: THREE.Mesh;
  crateMat: THREE.MeshStandardMaterial;
  haloMesh: THREE.Mesh;
  haloMat: THREE.MeshBasicMaterial;
  labelEl: HTMLDivElement | null;
}

export type EscortChargeState =
  | 'idle'
  | 'pushing'
  | 'overdrive'
  | 'ramming'
  | 'contested'
  | 'breached';

export interface EscortBarricadeRuntime {
  cfg: EscortBarricadeConfig;
  group: THREE.Group;
  beamGroup: THREE.Group;
  hp: number;
  maxHp: number;
  alive: boolean;
  hitFlash: number;
  labelEl: HTMLDivElement;
}

export interface PayloadCartRuntime {
  active: boolean;
  x: number;
  z: number;
  startZ: number;
  targetZ: number;
  speed: number;
  steamCharge: number;
  escortBlueCount: number;
  contestRedCount: number;
  chargeState: EscortChargeState;
  ramCooldown: number;
  ramAnim: number;
  wheelPhase: number;
  smokeTimer: number;
  group: THREE.Group;
  armorMat: THREE.MeshStandardMaterial;
  trimMat: THREE.MeshStandardMaterial;
  boilerMat: THREE.MeshStandardMaterial;
  ramPlowGroup: THREE.Group;
  wheels: THREE.Mesh[];
  auraRingMesh: THREE.Mesh;
  auraRingMat: THREE.MeshBasicMaterial;
  labelEl: HTMLDivElement | null;
}

export interface MechaShellRuntime {
  active: boolean;
  x: number;
  y: number;
  z: number;
  startX: number;
  startZ: number;
  targetX: number;
  targetZ: number;
  flightTime: number;
  flightDuration: number;
  dmg: number;
  splashRadius: number;
  mesh: THREE.Mesh;
}

export interface MechaOverlordRuntime {
  active: boolean;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  baseDmg: number;
  shellDmg: number;
  lifeTimer: number;
  maxLifeTimer: number;
  fusedSquadCount: number;
  walkPhase: number;
  stompCooldown: number;
  volleyCooldown: number;
  volleyInterval: number;
  volleysFired: number;
  smashesCount: number;
  empOverdriveTimer: number;
  leftRecoil: number;
  rightRecoil: number;
  meleeSwingAnim: number;
  group: THREE.Group;
  pelvisGroup: THREE.Group;
  torsoGroup: THREE.Group;
  leftLegGroup: THREE.Group;
  rightLegGroup: THREE.Group;
  leftArmGroup: THREE.Group;
  rightArmGroup: THREE.Group;
  leftCannonPod: THREE.Group;
  rightCannonPod: THREE.Group;
  armorMat: THREE.MeshStandardMaterial;
  trimMat: THREE.MeshStandardMaterial;
  coreMat: THREE.MeshStandardMaterial;
  auraRingMesh: THREE.Mesh;
  auraRingMat: THREE.MeshBasicMaterial;
  labelEl: HTMLDivElement | null;
}

export interface TacticalSyrupZoneRuntime {
  active: boolean;
  x: number;
  z: number;
  radius: number;
  timer: number;
  maxTimer: number;
  slowFactor: number;
  vulnMult: number;
  group: THREE.Group;
  poolMat: THREE.MeshStandardMaterial;
  ringMat: THREE.MeshBasicMaterial;
  bubbles: THREE.Mesh[];
}

export interface TacticalElectroNetRuntime {
  active: boolean;
  x: number;
  z: number;
  radius: number;
  timer: number;
  maxTimer: number;
  group: THREE.Group;
  domeMat: THREE.MeshBasicMaterial;
  ringMat: THREE.MeshBasicMaterial;
}

export interface TacticalRallyAuraRuntime {
  active: boolean;
  timer: number;
  maxTimer: number;
  radius: number;
  moveSpeedMult: number;
  attackRateMult: number;
  anchorX: number;
  anchorZ: number;
  group: THREE.Group;
  outerRingMat: THREE.MeshBasicMaterial;
  innerRingMat: THREE.MeshBasicMaterial;
}

export interface ColossusCandyShellRuntime {
  active: boolean;
  startX: number;
  startZ: number;
  targetX: number;
  targetZ: number;
  x: number;
  y: number;
  z: number;
  flightTime: number;
  flightDuration: number;
  dmg: number;
  splashRadius: number;
  mesh: THREE.Mesh;
}

export interface ClockworkColossusRuntime {
  active: boolean;
  raidTier: number;
  rootGroup: THREE.Group;
  torsoGroup: THREE.Group;
  jawGroup: THREE.Group;
  windupKeyGroup: THREE.Group;
  coreMesh: THREE.Mesh;
  coreMat: THREE.MeshStandardMaterial;
  paralysisHaloGroup: THREE.Group;
  leftArmGroup: THREE.Group;
  leftShieldMesh: THREE.Mesh;
  rightArmGroup: THREE.Group;
  rightCannonBarrel: THREE.Mesh;
  barrierArcMesh: THREE.Mesh;
  barrierArcMat: THREE.MeshBasicMaterial;
  leftShieldHp: number;
  leftShieldMaxHp: number;
  leftShieldAlive: boolean;
  leftHitFlash: number;
  rightCannonHp: number;
  rightCannonMaxHp: number;
  rightCannonAlive: boolean;
  rightHitFlash: number;
  paralysisTimer: number;
  paralysisMaxTimer: number;
  weakpointsBroken: number;
  cannonVolleyTimer: number;
  leftLabelEl: HTMLDivElement;
  rightLabelEl: HTMLDivElement;
  coreLabelEl: HTMLDivElement;
}

export type AirshipEscortState =
  | 'cruising'
  | 'overdrive'
  | 'under_flak'
  | 'dropping_pod'
  | 'breached';

export interface AntiAirTurretRuntime {
  cfg: AntiAirTurretConfig;
  group: THREE.Group;
  gunMountGroup: THREE.Group;
  hp: number;
  maxHp: number;
  alive: boolean;
  fireTimer: number;
  hitFlash: number;
  recoilAnim: number;
  contestedByBlue: boolean;
  labelEl: HTMLDivElement;
}

export interface AirshipDropPodRuntime {
  active: boolean;
  phase: 'falling' | 'landed_open';
  startX: number;
  startY: number;
  startZ: number;
  targetX: number;
  targetZ: number;
  x: number;
  y: number;
  z: number;
  timer: number;
  duration: number;
  group: THREE.Group;
  doorGroup: THREE.Group;
}

export interface AirshipMothershipRuntime {
  active: boolean;
  escortTier: number;
  x: number;
  y: number;
  z: number;
  startZ: number;
  targetZ: number;
  speed: number;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  shieldRegenDelay: number;
  dropCharge: number;
  escortBlueCount: number;
  contestRedCount: number;
  state: AirshipEscortState;
  propellerPhase: number;
  bayOpenAnim: number;
  hitFlash: number;
  flakHitsTaken: number;
  rootGroup: THREE.Group;
  hullGroup: THREE.Group;
  gondolaGroup: THREE.Group;
  leftPropeller: THREE.Group;
  rightPropeller: THREE.Group;
  dropBayGroup: THREE.Group;
  dropHatchLeft: THREE.Mesh;
  dropHatchRight: THREE.Mesh;
  hullMat: THREE.MeshStandardMaterial;
  trimMat: THREE.MeshStandardMaterial;
  coreGlowMat: THREE.MeshStandardMaterial;
  auraRingMesh: THREE.Mesh;
  auraRingMat: THREE.MeshBasicMaterial;
  labelEl: HTMLDivElement | null;
}

// ============================================================================
// MC-10: Rainbow Candy Train Raid & Bobo Squad Relic Banner Stand runtimes
// ============================================================================

export interface CandyTrainCarRuntime {
  cfg: CandyTrainCarConfig;
  index: number;
  group: THREE.Group;
  bodyGroup: THREE.Group;
  wheels: THREE.Object3D[];
  armorPlates: THREE.Object3D[];
  bodyMat: THREE.MeshStandardMaterial;
  ventGroup: THREE.Object3D | null;
  lootGem: THREE.Object3D | null;
  hp: number;
  maxHp: number;
  armor: number;
  armorShed: boolean;
  alive: boolean;
  /** Angular lag (radians) behind the locomotive along the elliptical loop. */
  lagAngle: number;
  x: number;
  z: number;
  vx: number;
  vz: number;
  yaw: number;
  hitFlash: number;
  ventTimer: number;
  breakAnim: number;
  labelEl: HTMLDivElement;
}

export interface CandyTrainRuntime {
  active: boolean;
  tier: number;
  centerX: number;
  centerZ: number;
  radiusX: number;
  radiusZ: number;
  headAngle: number;
  baseSpeed: number;
  speed: number;
  escapeTimeLeft: number;
  escapeTotalSec: number;
  stalled: boolean;
  wheelPhase: number;
  smokeTimer: number;
  cars: CandyTrainCarRuntime[];
  trackGroup: THREE.Group;
}

export interface RelicBannerRuntime {
  rootGroup: THREE.Group;
  poleGroup: THREE.Group;
  cloth: THREE.Mesh;
  clothMat: THREE.MeshStandardMaterial;
  clothBasePositions: Float32Array;
  clothColors: THREE.BufferAttribute;
  emblems: Record<RelicBannerId, THREE.Group>;
  emblemY: number;
  finials: Record<RelicBannerId, THREE.Group>;
  auraRing: THREE.Mesh;
  auraRingMat: THREE.MeshBasicMaterial;
  auraDisc: THREE.Mesh;
  auraDiscMat: THREE.MeshBasicMaterial;
  equippedId: RelicBannerId | null;
  x: number;
  z: number;
  targetX: number;
  targetZ: number;
  scanTimer: number;
  auraRadius: number;
  pulse: number;
}

// ============================================================================
// MC-11: Deep-Sea Submarine Bubble Rescue & Bobo Squad Pet Companion runtimes
// ============================================================================

export type SubmarineStateId = 'cruising' | 'escorted' | 'blocked' | 'stung' | 'docked' | 'sunk' | 'suffocated';

export interface SubmarineRuntime {
  active: boolean;
  tier: number;
  group: THREE.Group;
  bodyGroup: THREE.Group;
  propeller: THREE.Object3D;
  periscope: THREE.Object3D;
  hullMat: THREE.MeshStandardMaterial;
  portholeMat: THREE.MeshStandardMaterial;
  auraRing: THREE.Mesh;
  auraRingMat: THREE.MeshBasicMaterial;
  x: number;
  z: number;
  startZ: number;
  dockZ: number;
  maxSteerX: number;
  baseSpeed: number;
  speed: number;
  hp: number;
  maxHp: number;
  oxygen: number;
  oxygenTotal: number;
  slowTimer: number;
  hitFlash: number;
  torpedoTimer: number;
  torpedoInterval: number;
  torpedoDmg: number;
  trailTimer: number;
  escortCount: number;
  state: SubmarineStateId;
  labelEl: HTMLDivElement;
}

export interface CoralBarrierRuntime {
  cfg: CoralBarrierConfig;
  group: THREE.Group;
  chunks: THREE.Object3D[];
  glowMat: THREE.MeshBasicMaterial;
  hp: number;
  maxHp: number;
  alive: boolean;
  hitFlash: number;
  breakAnim: number;
  labelEl: HTMLDivElement;
}

export interface RescueBubbleRuntime {
  cfg: RescueBubbleConfig;
  group: THREE.Group;
  shellMat: THREE.MeshStandardMaterial;
  radius: number;
  baseX: number;
  baseZ: number;
  x: number;
  y: number;
  z: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  hitFlash: number;
  popAnim: number;
  labelEl: HTMLDivElement;
}

export interface JellyfishRuntime {
  id: number;
  group: THREE.Group;
  bellMat: THREE.MeshStandardMaterial;
  tentacles: THREE.Object3D[];
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  stingTimer: number;
  hitFlash: number;
  deathAnim: number;
  phase: number;
}

export interface SubTorpedoRuntime {
  mesh: THREE.Object3D;
  active: boolean;
  x: number;
  z: number;
  targetKind: 'jelly' | 'coral' | 'bubble';
  jelly: JellyfishRuntime | null;
  coral: CoralBarrierRuntime | null;
  bubble: RescueBubbleRuntime | null;
  life: number;
}

export interface PetCompanionRuntime {
  rootGroup: THREE.Group;
  models: Record<PetCompanionId, THREE.Group>;
  jellyTentacles: THREE.Object3D[];
  turtleFlippers: THREE.Object3D[];
  seahorseTail: THREE.Object3D | null;
  sparkOrb: THREE.Object3D | null;
  shellBubble: THREE.Mesh;
  shellBubbleMat: THREE.MeshBasicMaterial;
  auraRing: THREE.Mesh;
  auraRingMat: THREE.MeshBasicMaterial;
  equippedId: PetCompanionId | null;
  x: number;
  z: number;
  targetX: number;
  targetZ: number;
  scanTimer: number;
  procFlash: number;
}

// ============================================================================
// MC-12: Glacier Sled Race & Honor Trophy Hall runtimes
// ============================================================================

/** World z of the sled's centre; the course scrolls toward +z (camera) as the sled slides downhill. */
export const SLED_Z = 9.0;

export type GlacierSledStateId = 'sliding' | 'boosting' | 'stumbled' | 'finished' | 'timeout' | 'wiped';

export interface GlacierSledRuntime {
  active: boolean;
  tier: number;
  group: THREE.Group;
  bodyGroup: THREE.Group;
  hullMat: THREE.MeshStandardMaterial;
  lampMat: THREE.MeshStandardMaterial;
  gears: THREE.Object3D[];
  auraRing: THREE.Mesh;
  auraRingMat: THREE.MeshBasicMaterial;
  courseGroup: THREE.Group;
  snowTex: THREE.DataTexture | null;
  tubeInst: THREE.InstancedMesh | null;
  x: number;
  z: number;
  distance: number;
  courseLength: number;
  baseSpeed: number;
  speed: number;
  timeLeft: number;
  timeLimit: number;
  maxSteerX: number;
  maxRiders: number;
  hitSlowMult: number;
  hitSlowSec: number;
  boostMult: number;
  boostSec: number;
  slowTimer: number;
  boostTimer: number;
  hitFlash: number;
  sprayTimer: number;
  state: GlacierSledStateId;
  labelEl: HTMLDivElement;
}

export interface SledGateRuntime {
  cfg: SledGateConfig;
  group: THREE.Group;
  shieldMat: THREE.MeshBasicMaterial;
  resolved: boolean;
  triggered: boolean;
  pulse: number;
}

export interface SledIcicleRuntime {
  cfg: SledIcicleConfig;
  group: THREE.Group;
  spike: THREE.Object3D;
  shadowMat: THREE.MeshBasicMaterial;
  landed: boolean;
  shattered: boolean;
  knocked: number;
  sledChecked: boolean;
  shatterAnim: number;
}

export interface SledAvalancheRuntime {
  cfg: SledAvalancheConfig;
  group: THREE.Group;
  crests: THREE.Object3D[];
  d: number;
  rolling: boolean;
  knocked: number;
  sledChecked: boolean;
  passed: boolean;
}

export interface SledBoostRuntime {
  cfg: SledBoostConfig;
  group: THREE.Group;
  arrowMat: THREE.MeshBasicMaterial;
  triggered: boolean;
  pulse: number;
}

/** Lobby mini-scene: a small rotating 3D pedestal showing the trophies placed in the Honor Trophy Hall. */
export interface TrophyPedestalRuntime {
  canvas: HTMLCanvasElement;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  turntable: THREE.Group;
  cupsGroup: THREE.Group;
  displayKey: string;
  shownIds: HallTrophyId[];
  angle: number;
  lastRenderMs: number;
  /** MC-14: static decorated lobby room around the turntable (wallpaper wall, floor, placed decor props). */
  roomGroup: THREE.Group;
  propsGroup: THREE.Group;
  wallMat: THREE.MeshStandardMaterial;
  wallStripeMat: THREE.MeshStandardMaterial;
  floorMat: THREE.MeshStandardMaterial;
  floorRingMat: THREE.MeshStandardMaterial;
  velvetMat: THREE.MeshStandardMaterial;
  ivoryMat: THREE.MeshStandardMaterial;
  decorKey: string;
  decorThemeId: DecorThemeId;
  placedProps: Array<DecorPropId | null>;
}

// ============================================================================
// MC-13: Volcano Lava Jump Breakout runtimes & Bobo gacha skin accessory
// ============================================================================

export type LavaRunStateId = 'hopping' | 'stumbled' | 'shielded' | 'finished' | 'timeout' | 'wiped';

export interface LavaPlatformRuntime {
  cfg: LavaPlatformConfig;
  group: THREE.Group;
  /** Accent material (cooled-rock safe ring / gate shield); null for plain stone. */
  accentMat: THREE.MeshBasicMaterial | null;
  gateMat: THREE.MeshBasicMaterial | null;
  gateTriggered: boolean;
  cooledTriggered: boolean;
  landed: number;
  bobPhase: number;
}

export interface LavaRowRuntime {
  index: number;
  d: number;
  start: number;
  end: number;
  platforms: LavaPlatformRuntime[];
  landed: number;
  fell: number;
}

export interface LavaEruptionRuntime {
  cfg: LavaEruptionConfig;
  group: THREE.Group;
  ringMat: THREE.MeshBasicMaterial;
  fill: THREE.Mesh;
  fillMat: THREE.MeshBasicMaterial;
  plume: THREE.Object3D;
  plumeMat: THREE.MeshBasicMaterial;
  telegraphed: boolean;
  erupting: boolean;
  done: boolean;
  knocked: number;
  blocked: number;
  plumeT: number;
}

export interface LavaRockRuntime {
  cfg: LavaRockConfig;
  group: THREE.Group;
  rock: THREE.Object3D;
  shadowMat: THREE.MeshBasicMaterial;
  landed: boolean;
  shattered: boolean;
  knocked: number;
  crowdChecked: boolean;
  shatterAnim: number;
}

export interface LavaRunRuntime {
  active: boolean;
  tier: number;
  courseGroup: THREE.Group;
  lavaTex: THREE.DataTexture | null;
  lavaMat: THREE.MeshStandardMaterial;
  reticle: THREE.Mesh;
  reticleMat: THREE.MeshBasicMaterial;
  x: number;
  distance: number;
  courseLength: number;
  baseSpeed: number;
  speed: number;
  timeLeft: number;
  timeLimit: number;
  maxSteerX: number;
  maxBobos: number;
  hopHeight: number;
  hitSlowMult: number;
  hitSlowSec: number;
  cooledShieldSec: number;
  slowTimer: number;
  shieldTimer: number;
  hitFlash: number;
  emberTimer: number;
  state: LavaRunStateId;
  rows: LavaRowRuntime[];
  labelEl: HTMLDivElement;
  /** Lead line x sampled every LAVA_HIST_STEP metres of distance (index 0 = newest); formation rows follow it. */
  hist: Float32Array;
  histDist: number;
  /** Row / platform the squad's front row last landed on (-1 = unknown). */
  leadRow: number;
  leadPlat: number;
  crowdRideY: number;
  /** Average x of the living Bobos (label anchor). */
  crowdX: number;
}

// ============================================================================
// MC-14: Asteroid Belt Shield Breakout runtimes
// ============================================================================

export type AsteroidRunStateId = 'cruising' | 'stumbled' | 'shielded' | 'finished' | 'timeout' | 'wiped';

export interface AsteroidGateRuntime {
  cfg: AsteroidGateConfig;
  group: THREE.Group;
  shieldMat: THREE.MeshBasicMaterial;
  resolved: boolean;
  triggered: boolean;
  pulse: number;
}

export interface AsteroidMeteorRuntime {
  cfg: AsteroidMeteorConfig;
  group: THREE.Group;
  ringMat: THREE.MeshBasicMaterial;
  fill: THREE.Mesh;
  fillMat: THREE.MeshBasicMaterial;
  rock: THREE.Object3D;
  trailMat: THREE.MeshBasicMaterial;
  crater: THREE.Object3D;
  telegraphed: boolean;
  impacted: boolean;
  done: boolean;
  knocked: number;
  blocked: boolean;
  craterT: number;
}

export interface AsteroidBeltRuntime {
  cfg: AsteroidBeltConfig;
  group: THREE.Group;
  rocks: THREE.Object3D[];
  beaconMat: THREE.MeshBasicMaterial;
  knocked: number;
  blocked: boolean;
  hitCounted: boolean;
  passed: boolean;
}

export interface AsteroidRunRuntime {
  active: boolean;
  tier: number;
  courseGroup: THREE.Group;
  trackTex: THREE.DataTexture | null;
  trackMat: THREE.MeshStandardMaterial;
  stars: THREE.Points;
  bubble: THREE.Mesh;
  bubbleMat: THREE.MeshBasicMaterial;
  x: number;
  distance: number;
  courseLength: number;
  baseSpeed: number;
  speed: number;
  timeLeft: number;
  timeLimit: number;
  maxSteerX: number;
  maxBobos: number;
  floatHeight: number;
  hitSlowMult: number;
  hitSlowSec: number;
  shieldSec: number;
  slowTimer: number;
  shieldTimer: number;
  shieldCharges: number;
  hitFlash: number;
  sparkTimer: number;
  state: AsteroidRunStateId;
  labelEl: HTMLDivElement;
  /** Lead line x sampled every LAVA_HIST_STEP metres of distance (index 0 = newest); formation rows follow it. */
  hist: Float32Array;
  histDist: number;
  crowdX: number;
  crowdRideY: number;
  /** Squad half-width / depth (for the shield bubble & hazard reach). */
  crowdHalfW: number;
  crowdDepth: number;
}

// ============================================================================
// MC-15: Haunted Castle Pumpkin Night runtimes & Bobo Squad Tactic Deck runtime
// ============================================================================

export type PumpkinRunStateId = 'marching' | 'lit' | 'dark' | 'stumbled' | 'finished' | 'timeout' | 'wiped';

export interface PumpkinGateRuntime {
  cfg: PumpkinGateConfig;
  group: THREE.Group;
  shieldMat: THREE.MeshBasicMaterial;
  resolved: boolean;
  triggered: boolean;
}

export interface PumpkinLampRuntime {
  cfg: PumpkinLampConfig;
  group: THREE.Group;
  glowMat: THREE.MeshBasicMaterial;
  ringMat: THREE.MeshBasicMaterial;
  flameMat: THREE.MeshStandardMaterial;
  /** The squad has drawn light from this lamp at least once. */
  visited: boolean;
  passed: boolean;
}

export interface PumpkinGhostRuntime {
  cfg: PumpkinGhostConfig;
  group: THREE.Group;
  body: THREE.Object3D;
  bodyMat: THREE.MeshStandardMaterial;
  markMat: THREE.MeshBasicMaterial;
  /** Current lateral x of the ghost (tracks the squad's progress). */
  x: number;
  /** The ghost has phased in through the side wall (warning popup shown). */
  emerged: boolean;
  /** Contact resolved: 'dispelled' by the squad lantern, 'lamp' by a lit zone, 'scared' Bobos, or not yet ('none'). */
  outcome: 'none' | 'dispelled' | 'lamp' | 'scared';
  knocked: number;
  /** Bobos this ghost already brushed (a candy shield absorbs its touch once; it never hits the same Bobo twice). */
  touched: Set<number>;
  fade: number;
  done: boolean;
}

export interface PumpkinWallRuntime {
  cfg: PumpkinWallConfig;
  group: THREE.Group;
  knocked: number;
  /** Bobos this wall already bumped (a candy shield absorbs it once). */
  touched: Set<number>;
  hitCounted: boolean;
  passed: boolean;
}

export interface PumpkinRunRuntime {
  active: boolean;
  tier: number;
  courseGroup: THREE.Group;
  floorTex: THREE.DataTexture | null;
  floorMat: THREE.MeshStandardMaterial;
  stars: THREE.Points;
  moon: THREE.Object3D;
  /** Warm lantern glow disc under the squad (scaled / faded by the light level). */
  glow: THREE.Mesh;
  glowMat: THREE.MeshBasicMaterial;
  x: number;
  distance: number;
  courseLength: number;
  baseSpeed: number;
  speed: number;
  timeLeft: number;
  timeLimit: number;
  maxSteerX: number;
  maxBobos: number;
  light: number;
  lightMax: number;
  lightDecayPerSec: number;
  lightRefillPerSec: number;
  ghostLightCost: number;
  darkSlowMult: number;
  hitSlowMult: number;
  hitSlowSec: number;
  slowTimer: number;
  /** Seconds the squad has spent with the lantern out (stats). */
  darkSec: number;
  /** True while the squad centre stands inside a pumpkin-lantern lit zone. */
  inLamp: boolean;
  hitFlash: number;
  sparkTimer: number;
  state: PumpkinRunStateId;
  labelEl: HTMLDivElement;
  /** Lead line x sampled every LAVA_HIST_STEP metres of distance (index 0 = newest); formation rows follow it. */
  hist: Float32Array;
  histDist: number;
  crowdX: number;
  crowdHalfW: number;
  crowdDepth: number;
}

/** Live state of one equipped tactic card during a match. */
export interface TacticCardRuntime {
  id: TacticCardId;
  slot: number;
  fired: boolean;
  firedAt: number;
  /** What the card actually delivered after the per-match caps (shields granted / Bobos added / rush seconds). */
  delivered: number;
  /** Short result text shown on the HUD chip after it fired. */
  resultText: string;
}

export interface TacticRunRuntime {
  cards: TacticCardRuntime[];
  /**
   * MC-16 balance: effect multiplier for this match (main campaign stages use TACTIC_CAMPAIGN_EFFECT_MULT, lobby modes
   * 1.0) and the per-match caps already scaled by it.
   */
  effectMult: number;
  isCampaign: boolean;
  shieldCap: number;
  crowdCap: number;
  rushCap: number;
  /** Peak blue squad size seen this match (crisis trigger reference). */
  peakBlue: number;
  shieldsGranted: number;
  bobosAdded: number;
  rushTimer: number;
  rushMult: number;
  triggers: number;
}

// ============================================================================
// MC-16: Desert Pyramid Trap Run runtimes
// ============================================================================

export type PyramidRunStateId = 'running' | 'quicksand' | 'stumbled' | 'finished' | 'timeout' | 'wiped';
export type PyramidSlabStateId = 'closed' | 'warn' | 'open';

export interface PyramidGateRuntime {
  cfg: PyramidGateConfig;
  group: THREE.Group;
  shieldMat: THREE.MeshBasicMaterial;
  resolved: boolean;
  triggered: boolean;
}

export interface PyramidSandRuntime {
  cfg: PyramidSandConfig;
  group: THREE.Group;
  sandMat: THREE.MeshStandardMaterial;
  swirl: THREE.Object3D;
  /** Bobos swallowed by this belt (capped by cfg.knockCap). */
  swallowed: number;
  /** A candy shield pulled a Bobo out of this belt (stats). */
  pulledOut: number;
  /** The squad front has reached the belt. */
  entered: boolean;
  passed: boolean;
}

export interface PyramidSlabRuntime {
  cfg: PyramidSlabConfig;
  /** Pivot on the slab centre line: rotation.x animates the flip (0 closed, π/2 standing on its edge). */
  pivot: THREE.Group;
  glyphMat: THREE.MeshBasicMaterial;
  rimMat: THREE.MeshBasicMaterial;
  state: PyramidSlabStateId;
}

export interface PyramidSlabRowRuntime {
  cfg: PyramidSlabRowConfig;
  group: THREE.Group;
  slabs: PyramidSlabRuntime[];
  knocked: number;
  /** Bobos this row already flung (a candy shield absorbs it once; it never hits the same Bobo twice). */
  touched: Set<number>;
  hitCounted: boolean;
  passed: boolean;
}

export interface PyramidRunRuntime {
  active: boolean;
  tier: number;
  courseGroup: THREE.Group;
  floorTex: THREE.DataTexture | null;
  floorMat: THREE.MeshStandardMaterial;
  sandTex: THREE.DataTexture | null;
  sun: THREE.Object3D;
  dust: THREE.Points;
  x: number;
  distance: number;
  courseLength: number;
  baseSpeed: number;
  speed: number;
  timeLeft: number;
  timeLimit: number;
  maxSteerX: number;
  maxBobos: number;
  sandSlowMult: number;
  sinkSec: number;
  hitSlowMult: number;
  hitSlowSec: number;
  slowTimer: number;
  /** Run clock (seconds) driving every flip-slab cycle. */
  clock: number;
  /** Share of the squad standing in quicksand last frame (0..1); drags the pace down. */
  sandFrac: number;
  /** Seconds each Bobo (by unit id) has been standing in quicksand. */
  sink: Map<number, number>;
  /** Seconds the squad pace was dragged by quicksand (stats). */
  sandSec: number;
  hitFlash: number;
  sparkTimer: number;
  state: PyramidRunStateId;
  labelEl: HTMLDivElement;
  /** Lead line x sampled every LAVA_HIST_STEP metres of distance (index 0 = newest); formation rows follow it. */
  hist: Float32Array;
  histDist: number;
  crowdX: number;
  crowdHalfW: number;
  crowdDepth: number;
}

// ============================================================================
// MC-17: Jungle Temple Vine Swing runtimes
// ============================================================================

export type JungleRunStateId = 'running' | 'swinging' | 'stumbled' | 'finished' | 'timeout' | 'wiped';
export type JungleBoulderStateId = 'resting' | 'rolling' | 'falling' | 'gone';

export interface JungleGateRuntime {
  cfg: JungleGateConfig;
  group: THREE.Group;
  shieldMat: THREE.MeshBasicMaterial;
  resolved: boolean;
  triggered: boolean;
}

export interface JungleVineRuntime {
  cfg: JungleVineConfig;
  /** Pivot on the canopy beam: rotation.z sways the vine sideways, rotation.x swings it along the course. */
  pivot: THREE.Group;
  /** The grab handle at the bottom of the vine (glows while it is the vine to aim for). */
  handleMat: THREE.MeshStandardMaterial;
}

export interface JungleChasmRuntime {
  cfg: JungleChasmConfig;
  group: THREE.Group;
  vines: JungleVineRuntime[];
  mistMat: THREE.MeshBasicMaterial;
  /** The squad front reached the edge: the vine nearest to the squad line was grabbed and locked at `lockX`. */
  locked: boolean;
  lockVine: number;
  lockX: number;
  /** Run clock when the vine was grabbed. */
  lockClock: number;
  /** The squad line was within reach of the locked vine when it grabbed it. */
  leadGrabbed: boolean;
  /** Bobos (unit ids) already resolved at the edge: on the vine (riders) or lost / floated across. */
  resolved: Set<number>;
  riders: Set<number>;
  fell: number;
  floated: number;
  hitCounted: boolean;
  passed: boolean;
}

export interface JungleBoulderRuntime {
  cfg: JungleBoulderConfig;
  /** Ramp the boulder rests on (stays at cfg.d on the course). */
  ramp: THREE.Group;
  rock: THREE.Group;
  /** Warning lane stripe on the path ahead of the boulder (world space, stretched every frame). */
  lane: THREE.Mesh;
  laneMat: THREE.MeshBasicMaterial;
  state: JungleBoulderStateId;
  /** Current course coordinate of the boulder centre (starts at cfg.d, decreases while it rolls toward the squad). */
  du: number;
  /** Drop below the path once the boulder has rolled into a chasm (0 while it rolls on the path). */
  fallY: number;
  spin: number;
  knocked: number;
  touched: Set<number>;
  hitCounted: boolean;
  warned: boolean;
  passed: boolean;
}

export interface JungleSwingRuntime {
  active: boolean;
  tier: number;
  courseGroup: THREE.Group;
  floorTex: THREE.DataTexture | null;
  floorMat: THREE.MeshStandardMaterial;
  chasmTex: THREE.DataTexture | null;
  fireflies: THREE.Points;
  x: number;
  distance: number;
  courseLength: number;
  baseSpeed: number;
  speed: number;
  timeLeft: number;
  timeLimit: number;
  maxSteerX: number;
  maxBobos: number;
  swingHeight: number;
  hitSlowMult: number;
  hitSlowSec: number;
  slowTimer: number;
  /** Run clock (seconds) driving every vine sway. */
  clock: number;
  /** Share of the squad airborne on a vine last frame (0..1). */
  swingFrac: number;
  hitFlash: number;
  sparkTimer: number;
  state: JungleRunStateId;
  labelEl: HTMLDivElement;
  /** Lead line x sampled every LAVA_HIST_STEP metres of distance (index 0 = newest); formation rows follow it. */
  hist: Float32Array;
  histDist: number;
  crowdX: number;
  crowdHalfW: number;
  crowdDepth: number;
}
