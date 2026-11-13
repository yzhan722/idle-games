import * as THREE from 'three';
import {
  BarrelConfig,
  BossSubTowerConfig,
  BumperConfig,
  CandyVaultConfig,
  GateConfig,
  GearConfig,
  SideNestConfig,
  TerrainZoneConfig,
  WallConfig,
} from '../levels/LevelData';
import { MechaMode } from './State';

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
  scatterBounceLeft?: number;
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
