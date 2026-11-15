import * as THREE from 'three';
import {
  AntiAirTurretConfig,
  BarrelConfig,
  BossSubTowerConfig,
  BumperConfig,
  CandyVaultConfig,
  EscortBarricadeConfig,
  GateConfig,
  GearConfig,
  SideNestConfig,
  TerrainZoneConfig,
  WallConfig,
} from '../levels/LevelData';
import { CannonCoreModId, MechaMode } from './State';

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
