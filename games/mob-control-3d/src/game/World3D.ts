import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  GateConfig,
  GateStyle,
  LevelConfig,
  WallConfig,
  generateAirshipEscortLevel,
  generateCandyVaultBonusLevel,
  generateClockworkColossusRaidLevel,
  generateDynamicLevel,
  generateEndlessDefenseLevel,
  generateGearTournamentLevel,
  generatePayloadEscortLevel,
} from '../levels/LevelData';
import {
  BoboTechBranchId,
  CannonCoreModId,
  GameState,
  SkinSpec,
  SquadFinishSpec,
  TacticalSubWeaponId,
} from './State';
import { UI_ART, replaceEmojiWithArt } from './SkillIcons';
import { sound } from '../audio/SoundManager';
import {
  buildBanelingGeometry,
  buildBlueMarineGeometry,
  buildBruteGeometry,
  buildChampionMechaGeometry,
  buildRedMutantGeometry,
  buildShamanGeometry,
  createAnimatedHumanoidMaterial,
} from './HumanoidModels';
import {
  create2DBlobShadowTexture,
  create2DCloudPuffTexture,
  create2DOilSpillTexture,
  createAbyssFloorTexture,
  createAbyssalSeaShaderMaterial,
  createBastionShieldShaderMaterial,
  createBossPortalShaderMaterial,
  createCinemaPostProcessingPass,
  createConveyorBeltTexture,
  createEnergyWaterfallShaderMaterial,
  createGateForcefieldTexture,
  createPeppermintWheelTexture,
  createRoadBumpTexture,
  createRoadNormalTexture,
  createThemedRoadEmissiveTexture,
  createThemedRoadTexture,
  stylizeMaterialAs2DIllustration,
  THEMES,
  THEME_ORDER,
  ThemeConfig,
  ThemeId,
} from './SceneThemes';
import {
  AirshipDropPodRuntime,
  AirshipEscortState,
  AirshipMothershipRuntime,
  AntiAirTurretRuntime,
  BOSS_GATE_Z,
  BarrelRuntime,
  BossSteamSweepRuntime,
  BossSubTowerRuntime,
  BumperRuntime,
  CandyVaultRuntime,
  ClockworkColossusRuntime,
  ColossusCandyShellRuntime,
  CombatLightRuntime,
  EscortBarricadeRuntime,
  EscortChargeState,
  GateRuntime,
  GearRuntime,
  MAX_PARTICLES,
  MAX_SHOCKWAVES,
  MAX_SKY_PILLARS,
  MAX_UNITS,
  MechaOverlordRuntime,
  MechaShellRuntime,
  MeteorTelegraphRuntime,
  NestRuntime,
  PLAYER_Z,
  Particle,
  PayloadCartRuntime,
  ShockwaveRing,
  SkyPillar,
  TRACK_HALF_W,
  TacticalAirdropBuffId,
  TacticalAirdropRuntime,
  TacticalElectroNetRuntime,
  TacticalRallyAuraRuntime,
  TacticalSyrupZoneRuntime,
  Unit,
  WallRuntime,
  ZoneRuntime,
} from './WorldTypes';

export type { Unit };

export class World3D {
  private canvas: HTMLCanvasElement;
  private labelsContainer: HTMLElement;
  private state: GameState;

  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private bloomPass: UnrealBloomPass;
  private cinemaPass: ShaderPass;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private combatLights: CombatLightRuntime[] = [];
  private starfieldPoints?: THREE.Points;
  private godRayMats: THREE.MeshBasicMaterial[] = [];
  private cameraMode: 0 | 1 | 2 = 0; // 0: Classic Mob Control 3D, 1: Low Action, 2: High Tactical
  private baseCameraPos = new THREE.Vector3(0, 31.5, 29.5);
  private cameraShake = 0;
  private quakeTimer = 0;
  private quakeMaxTimer = 0;
  private quakeIntensity = 0;
  private skillWaveQueue: Array<{ delay: number; exec: () => void }> = [];

  // 7-Branch Tactical Skill Tree Runtime Timers & Counters
  public skillOverdriveTimer = 0;
  public scorchedEarthTimer = 0;
  private scorchedEarthTickTimer = 0;
  private shotsFiredCounter = 0;
  private praetorianShotCounter = 0;
  private baseTurretTimer = 0;
  private baseRegenTimer = 0;
  private swarmBroodTimer = 4.5;
  private gatePulseTimer = 3.2;
  private plasmaThunderTimer = 2.8;
  private orbitalStarfallTimer = 3.6;
  private bastionPeriodicWaveTimer = 9.5;
  private lastKnownBaseHp = 0;
  private baseDamageAccum = 0;
  private bastionShockwavesTriggered = 0;
  private tycoonGoldMilestone = 180;

  // Turret & Boss 3D groups
  private turretGroup = new THREE.Group();
  private mascotGroup = new THREE.Group();
  private mascotLeftArm?: THREE.Group;
  private mascotPeak?: THREE.Mesh;
  private mascotMegaphone?: THREE.Mesh;
  private turretWheels: THREE.Mesh[] = [];
  private turretGears: THREE.Mesh[] = [];
  private turretGaugeNeedle?: THREE.Group;
  private turretGroundRingMat?: THREE.MeshBasicMaterial;
  private turretBarrel!: THREE.Mesh;
  private turretMuzzleLight!: THREE.PointLight;
  private turretEvo1Group = new THREE.Group();
  private turretEvo2Group = new THREE.Group();
  private turretEvoHalo?: THREE.Mesh;
  private currentTurretEvoTier = 0;
  private mascotCheerBoost = 0;
  private candySkyBlue = new THREE.Color(0x28c7fa);
  private candyAppleGreen = new THREE.Color(0x7be83b);
  private candyCoralPink = new THREE.Color(0xf96e80);
  private candyGold = new THREE.Color(0xffc933);
  private candyAmber = new THREE.Color(0xff982e);
  private skinCandyTints: [THREE.Color, THREE.Color, THREE.Color] = [
    new THREE.Color(0x28c7fa),
    new THREE.Color(0x7be83b),
    new THREE.Color(0xf96e80),
  ];
  private turretX = -7.8; // Start aimed near left +1 cascade or draggable anywhere
  private turretTargetX = -7.8;
  private turretRecoil = 0;
  private wasHoldingFire = false;
  private heroChargeFullNotified = false;
  private holdChargeParticleTimer = 0;
  private turretChargeEl?: HTMLDivElement;
  private turretChargeFillEl?: HTMLDivElement;
  private turretChargeTextEl?: HTMLSpanElement;

  // Golden Loot Bug (Dynamic Cross-Bridge Bonus Target)
  private lootBugGroup = new THREE.Group();
  private lootBugLabelEl?: HTMLDivElement;
  private lootBug = {
    active: false,
    x: 0,
    z: 0,
    dirX: 1,
    hp: 8,
    maxHp: 8,
    spawnTimer: 7.0,
    hitFlash: 0,
  };

  // MC-4: Scatter / Rainbow Weapon State & Mid-Battle Steam Tactical Airdrop Crate
  public rainbowShotCounter = 0;
  private rainbowBeamPool: {
    active: boolean;
    life: number;
    maxLife: number;
    mesh: THREE.Mesh;
    mat: THREE.MeshBasicMaterial;
  }[] = [];
  public airdropSpawnTimer = 11.5;
  public dualVolleyTimer = 0;
  public freezeRedsTimer = 0;
  public frontlineGiantsTimer = 0;
  public lastAirdropBuff: TacticalAirdropBuffId | null = null;
  public airdropDropCount = 0;
  public airdropCollectCount = 0;
  public airdrop!: TacticalAirdropRuntime;

  private bossGroup = new THREE.Group();
  private bossHead!: THREE.Group;
  private bossWrenchGroup?: THREE.Group;
  private bossForearms: THREE.Mesh[] = [];
  private megaBossCrownGroup = new THREE.Group();
  private megaBossHalo?: THREE.Mesh;
  private bossPortalMat!: THREE.ShaderMaterial;
  private bossPortalRing!: THREE.Mesh;
  private bossShieldMesh!: THREE.Mesh;
  private bossHitFlash = 0;

  // Every-5-Stages Mini-Boss & Every-10-Stages Mega Boss Mechanics State
  public bossShieldActive = false;
  public bossShieldHitsRemaining = 0;
  private bossShield70Triggered = false;
  private bossShield50Triggered = false;
  private bossShield35Triggered = false;
  private megaBossMeteorTimer = 5.5;
  private megaBossCurseTimer = 11.0;
  private megaBossSlamTimer = 8.8;
  private miniBossWarCryTimer = 7.2;
  private meteorTelegraphs: MeteorTelegraphRuntime[] = [];
  public bossSubTowers: BossSubTowerRuntime[] = [];
  private bossSteamBarrierMesh!: THREE.Mesh;
  private bossSteamBarrierMat!: THREE.MeshBasicMaterial;
  public bossSteamSweep!: BossSteamSweepRuntime;

  // Theme & Environment Materials / Lights
  public currentTheme: ThemeConfig = THEMES.wasteland;
  private sceneEffectTimer = 4.5;
  private hemiLight!: THREE.HemisphereLight;
  private dirLight!: THREE.DirectionalLight;
  private rimLight!: THREE.DirectionalLight;
  private bossLight!: THREE.PointLight;
  private roadMat!: THREE.MeshStandardMaterial;
  private abyssMat!: THREE.MeshBasicMaterial;
  private curbMat!: THREE.MeshStandardMaterial;
  private curbStripMat!: THREE.MeshBasicMaterial;
  private cliffPrimaryMat!: THREE.MeshStandardMaterial;
  private cliffSecondaryMat!: THREE.MeshStandardMaterial;
  private roofMat!: THREE.MeshStandardMaterial;
  private foliageMat!: THREE.MeshStandardMaterial;
  private trimMat!: THREE.MeshStandardMaterial;
  private ironSharedMat!: THREE.MeshStandardMaterial;
  private creamWallSharedMat!: THREE.MeshStandardMaterial;
  private windowGlowSharedMat!: THREE.MeshBasicMaterial;
  private themeLandmarkGroup = new THREE.Group();
  private themeSpinners: THREE.Object3D[] = [];
  private crystalMat!: THREE.MeshStandardMaterial;
  private bossArmorMat!: THREE.MeshStandardMaterial;
  private bossSecondaryMat!: THREE.MeshStandardMaterial;
  private bossEyeMat!: THREE.MeshBasicMaterial;
  private radarDish?: THREE.Group;
  private holoGlobeGroup?: THREE.Group;
  private bastionTurretPods: THREE.Group[] = [];
  private abyssShaderMat?: THREE.ShaderMaterial;
  private waterfallShaderMat?: THREE.ShaderMaterial;
  private bastionShieldMat?: THREE.ShaderMaterial;
  private planetGroup?: THREE.Group;
  private planetBodyMat?: THREE.MeshStandardMaterial;
  private planetHaloMat?: THREE.MeshBasicMaterial;
  private floatingMonoliths: Array<{
    group: THREE.Group;
    ringOuter: THREE.Mesh;
    ringInner: THREE.Mesh;
    baseY: number;
    phase: number;
  }> = [];
  private skyCruisers: Array<{
    group: THREE.Group;
    baseX: number;
    baseY: number;
    baseZ: number;
    dirZ: number;
    speed: number;
    phase: number;
  }> = [];
  private distantLaserTimer = 1.2;
  private gateTextures: Record<string, THREE.CanvasTexture> = {};
  private ambientWeatherTimer = 0;

  // Level dynamic objects
  private levelGroup = new THREE.Group();
  private gates: GateRuntime[] = [];
  private walls: WallConfig[] = [];
  private wallRuntimes: WallRuntime[] = [];
  private gears: GearRuntime[] = [];
  private nests: NestRuntime[] = [];
  public candyVaults: CandyVaultRuntime[] = [];
  public bonusHeistTimeLeft = 0;
  public bonusHeistShardsEarned = 0;
  public bonusVaultsBroken = 0;
  public endlessWave = 1;
  public endlessWaveTimer = 0;
  public escortBarricades: EscortBarricadeRuntime[] = [];
  public payloadCart: PayloadCartRuntime | null = null;
  public escortBarricadesBroken = 0;
  public escortRamCount = 0;
  public escortShardsEarned = 0;
  public mechaOverlord!: MechaOverlordRuntime;
  private mechaShells: MechaShellRuntime[] = [];
  public electroNetFx!: TacticalElectroNetRuntime;
  public syrupZone!: TacticalSyrupZoneRuntime;
  public rallyAuraFx!: TacticalRallyAuraRuntime;
  public colossusBoss: ClockworkColossusRuntime | null = null;
  private colossusCandyShells: ColossusCandyShellRuntime[] = [];
  public airshipMothership: AirshipMothershipRuntime | null = null;
  public antiAirTurrets: AntiAirTurretRuntime[] = [];
  public airshipDropPods: AirshipDropPodRuntime[] = [];
  public antiAirTurretsCleared = 0;
  public airshipDropPodsDeployed = 0;
  public cannonModGroup = new THREE.Group();
  public cannonModOverdriveGroup = new THREE.Group();
  public cannonModPrismGroup = new THREE.Group();
  public cannonModHeavyMortarGroup = new THREE.Group();
  private cannonModFlywheels: THREE.Mesh[] = [];
  private cannonModPrismCrystal?: THREE.Mesh;
  private cannonModMortarSleeve?: THREE.Mesh;
  public cannonModShotCounter = 0;
  public overdriveBurstQueue = 0;
  public overdriveBurstTimer = 0;
  public cannonModStats = {
    overdriveBurstsTriggered: 0,
    prismSplitsTriggered: 0,
    heavyMortarsLaunched: 0,
    mortarImpactDamageDealt: 0,
  };
  private weatherParticleTimer = 0;
  private turretBarrelMat?: THREE.MeshStandardMaterial;
  private turretBrassMat?: THREE.MeshStandardMaterial;
  private appliedLiverySnapshot = {
    skinId: 'azure',
    finishId: 'candy_gloss',
    unitFinishMode: 0,
    unitRoughness: 0.14,
    unitMetalness: 0.04,
    cannonBarrelHex: 'fff8eb',
    cannonMetalness: 0.12,
    cartArmorHex: 'fef3c7',
  };
  private barrels: BarrelRuntime[] = [];
  private zones: ZoneRuntime[] = [];
  private bumpers: BumperRuntime[] = [];
  private jumpPadSoundCooldown = 0;
  public stageCombatTime = 0;

  // Units & InstancedMeshes
  private units: Unit[] = [];
  private nextUnitId = 1;

  private blueBodyInst!: THREE.InstancedMesh;
  private blueMarineMat!: THREE.MeshStandardMaterial;
  private championInst!: THREE.InstancedMesh;
  private champMat!: THREE.MeshStandardMaterial;
  private redBodyInst!: THREE.InstancedMesh;
  private bruteInst!: THREE.InstancedMesh;
  private banelingInst!: THREE.InstancedMesh;
  private shamanInst!: THREE.InstancedMesh;
  private unitShadowInst!: THREE.InstancedMesh;
  private frostShieldInst!: THREE.InstancedMesh;
  private techVanguardFlairInst!: THREE.InstancedMesh;
  private techSiegeFlairInst!: THREE.InstancedMesh;
  private techCandyFlairInst!: THREE.InstancedMesh;
  private lastTechFlairCount = 0;
  private particleInst!: THREE.InstancedMesh;
  private gatePopupCooldown = 0;

  private blueAnimData = new Float32Array(MAX_UNITS * 4);
  private champAnimData = new Float32Array(120 * 4);
  private redAnimData = new Float32Array(MAX_UNITS * 4);
  private bruteAnimData = new Float32Array(120 * 4);
  private banelingAnimData = new Float32Array(180 * 4);
  private shamanAnimData = new Float32Array(120 * 4);

  private blueAnimAttr!: THREE.InstancedBufferAttribute;
  private champAnimAttr!: THREE.InstancedBufferAttribute;
  private redAnimAttr!: THREE.InstancedBufferAttribute;
  private bruteAnimAttr!: THREE.InstancedBufferAttribute;
  private banelingAnimAttr!: THREE.InstancedBufferAttribute;
  private shamanAnimAttr!: THREE.InstancedBufferAttribute;

  private particles: Particle[] = [];
  private shockwaves: ShockwaveRing[] = [];
  private skyPillars: SkyPillar[] = [];
  private fxFlashEl: HTMLElement | null = null;
  private dummy = new THREE.Object3D();
  private tempVec = new THREE.Vector3();

  // Spatial Hash Grid for fast O(N) crowd flow & combat collision (with Zero-GC Cell Pool!)
  private gridCellSize = 1.35;
  private gridMap = new Map<number, number[]>();
  private gridCellPool: number[][] = [];
  private gridCellPoolUsed = 0;

  // Mobile Thermal & Adaptive Performance Governor
  public readonly isMobileDevice: boolean;
  private usePostProcessing = false;
  private lowSpecMode = false;
  private slowFrameStreak = 0;
  private avgFrameMs = 16.6;
  private frameTickCounter = 0;
  private targetSearchResult: { target: Unit | null; blocked: boolean; dist: number } = {
    target: null,
    blocked: false,
    dist: Infinity,
  };

  // Level runtime state
  public currentLevel!: LevelConfig;
  public bossHp = 2500;
  public bossMaxHp = 2500;
  public bossBerserkTriggered = false;
  public playerBaseHp = 1000;
  public playerBaseMaxHp = 1000;
  public activeBlueCount = 0;
  public activeRedCount = 0;
  public isOverrunFrenzy = false;
  public overrunTimer = 0;
  public isStageEnded = false;
  public isPaused = true;
  private victoryClimaxTimer = 0;
  private lastStageVictory = false;
  private victoryFireworkTimer = 0;

  // Kill-Streak Adrenaline Frenzy (Pillar 4)
  public killStreakCount = 0;
  private killStreakWindowTimer = 0;
  private nextStreakMilestone = 25;
  public adrenalineTimer = 0;

  private activeBlueIndices: number[] = [];
  private activeRedIndices: number[] = [];
  private activeAegisIndices: number[] = [];

  private shootTimer = 0;
  private enemySpawnTimer = 0;
  private bruteSpawnTimer = 0;
  private shamanSpawnTimer = 0;
  private elapsedTime = 0;

  // Input state
  private isPointerDown = false;
  private keysDown = new Set<string>();

  // Callbacks to UI
  public onBanner?: (title: string, sub: string) => void;
  public onStageEnd?: (victory: boolean) => void;

  constructor(canvas: HTMLCanvasElement, labelsContainer: HTMLElement, state: GameState) {
    this.canvas = canvas;
    this.labelsContainer = labelsContainer;
    this.state = state;
    this.isMobileDevice =
      window.matchMedia('(max-width: 860px), (pointer: coarse)').matches ||
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    // Unified direct hardware MSAA backbuffer render path across all desktop & mobile GPUs
    this.usePostProcessing = false;

    const nativeDpr = window.devicePixelRatio || 1;
    const dpr = this.isMobileDevice
      ? Math.min(Math.max(nativeDpr, 1.5), 2.0)
      : Math.min(Math.max(nativeDpr, 2.0), 2.5);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: this.isMobileDevice ? 'default' : 'high-performance',
    });
    const gl = this.renderer.getContext();
    const dbgExt = gl.getExtension('WEBGL_debug_renderer_info');
    const glRendererStr = dbgExt ? String(gl.getParameter(dbgExt.UNMASKED_RENDERER_WEBGL)) : '';
    const isSoftwareWebGL = /SwiftShader|llvmpipe|Software|Basic Render/i.test(glRendererStr);
    const effectiveDpr = isSoftwareWebGL
      ? Math.min(dpr, 1440 / Math.max(1, window.innerWidth), 1.5)
      : dpr;
    this.renderer.setPixelRatio(effectiveDpr);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x2563eb);
    this.scene.fog = new THREE.FogExp2(0x60a5fa, 0.0016);

    // Rich 3D Supercell Studio Environment Map for glossy vinyl slimes & polished brass/gold cannon
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();
    const envScene = new RoomEnvironment();
    this.scene.environment = pmremGenerator.fromScene(envScene, 0.04).texture;
    this.scene.environmentIntensity = 0.36;
    envScene.dispose();
    pmremGenerator.dispose();

    this.camera = new THREE.PerspectiveCamera(26, window.innerWidth / window.innerHeight, 1.0, 220);
    this.applyCameraTransform();

    // Post-Processing Pipeline (kept WebGL1/2 compatible without MSAA renderbuffer sampling issues)
    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(effectiveDpr);
    this.composer.setSize(window.innerWidth, window.innerHeight);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(
        Math.floor(window.innerWidth * effectiveDpr * 0.5),
        Math.floor(window.innerHeight * effectiveDpr * 0.5)
      ),
      0.16,
      0.32,
      0.92
    );
    const outputPass = new OutputPass();

    // Supercell 3D Glossy Toy-Box Post-Processing ShaderPass (Directional FXAA 3.11 + Vibrant Studio Color Grading)
    this.cinemaPass = createCinemaPostProcessingPass(
      window.innerWidth * effectiveDpr,
      window.innerHeight * effectiveDpr
    );

    this.composer.addPass(renderPass);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(outputPass);
    this.composer.addPass(this.cinemaPass);

    this.initPools();
    this.setupLights();
    this.buildEnvironment();
    this.buildTurret();
    this.buildBossOverlord();
    this.buildTacticalSubWeaponFx();
    this.buildInstancedMeshes();
    this.bindInput();

    this.scene.add(this.levelGroup);
  }

  private initPools(): void {
    for (let i = 0; i < MAX_UNITS; i++) {
      this.units.push({
        active: false,
        id: 0,
        team: 'blue',
        kind: 'normal',
        x: 0,
        z: 0,
        vx: 0,
        vz: 0,
        yaw: 0,
        turnRate: 0,
        walkPhase: 0,
        attackAnim: 0,
        spawnHop: 0,
        hp: 10,
        maxHp: 10,
        dmg: 10,
        radius: 0.35,
        speed: 8,
        age: 0,
        attackCooldown: 0,
        specialTimer: 0,
        scatterBounceLeft: 0,
        passedGates: new Set(),
      });
    }

    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        scale: 0.2,
        color: new THREE.Color(0xffffff),
      });
    }
  }

  private setupLights(): void {
    this.hemiLight = new THREE.HemisphereLight(0xfff5e4, 0x9e6f4a, 1.05);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfff0d4, 1.78);
    this.dirLight.position.set(16, 38, 24);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.set(2048, 2048);
    this.dirLight.shadow.radius = 2.2;
    this.dirLight.shadow.bias = -0.00035;
    this.dirLight.shadow.normalBias = 0.025;
    this.dirLight.shadow.camera.near = 5;
    this.dirLight.shadow.camera.far = 95;
    const d = 26;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.scene.add(this.dirLight);

    // Keep references for theme color sync without adding extra active light loops to scene shaders
    this.rimLight = new THREE.DirectionalLight(0xffc882, 0.0);
    this.bossLight = new THREE.PointLight(0xffa94d, 0.0, 26);

    // Pool of 4 Dynamic Combat PointLights
    for (let i = 0; i < 4; i++) {
      const pLight = new THREE.PointLight(0x38bdf8, 0, 14);
      pLight.visible = false;
      this.scene.add(pLight);
      this.combatLights.push({
        light: pLight,
        life: 0,
        maxLife: 0.35,
        maxIntensity: 6,
      });
    }
  }

  private spawnCombatLight(
    x: number,
    y: number,
    z: number,
    hexColor: number,
    intensity = 6.0,
    distance = 14.0,
    duration = 0.36
  ): void {
    if (this.isMobileDevice || this.lowSpecMode) return;
    let chosen = this.combatLights[0];
    for (const cl of this.combatLights) {
      if (!cl.light.visible) {
        chosen = cl;
        break;
      }
      if (cl.life / cl.maxLife > chosen.life / chosen.maxLife) {
        chosen = cl;
      }
    }
    chosen.light.color.setHex(hexColor);
    chosen.light.intensity = intensity;
    chosen.light.distance = distance;
    chosen.light.position.set(x, y, z);
    chosen.light.visible = true;
    chosen.life = 0;
    chosen.maxLife = duration;
    chosen.maxIntensity = intensity;
  }

  private buildEnvironment(): void {
    const theme = this.currentTheme;

    // 1. Warm Drifting Cloud-Mist Valley Floor below the Viaduct
    this.abyssMat = new THREE.MeshBasicMaterial({
      map: createAbyssFloorTexture(theme),
    });
    const abyssPlane = new THREE.Mesh(new THREE.PlaneGeometry(280, 240), this.abyssMat);
    abyssPlane.rotation.x = -Math.PI / 2;
    abyssPlane.position.set(0, -6.8, 1.5);
    this.scene.add(abyssPlane);

    this.abyssShaderMat = createAbyssalSeaShaderMaterial(theme);
    const abyssShaderPlane = new THREE.Mesh(new THREE.PlaneGeometry(280, 240), this.abyssShaderMat);
    abyssShaderPlane.rotation.x = -Math.PI / 2;
    abyssShaderPlane.position.set(0, -6.4, 1.5);
    this.scene.add(abyssShaderPlane);

    // 2. Sunlit Sandstone / Travertine Cobblestone Viaduct Bridge Deck
    const roadGeo = new THREE.BoxGeometry(TRACK_HALF_W * 2 + 1.2, 1.35, 44);
    const roadBump = createRoadBumpTexture();
    const roadNormal = createRoadNormalTexture();
    this.roadMat = new THREE.MeshStandardMaterial({
      map: createThemedRoadTexture(theme),
      normalMap: roadNormal,
      normalScale: new THREE.Vector2(0.16, 0.16),
      roughnessMap: roadBump,
      emissive: new THREE.Color(0xffffff),
      emissiveMap: createThemedRoadEmissiveTexture(theme),
      emissiveIntensity: 0.06,
      roughness: 0.76,
      metalness: 0.05,
    });
    const road = new THREE.Mesh(roadGeo, this.roadMat);
    road.position.set(0, -0.68, 0.5);
    road.receiveShadow = true;
    this.scene.add(road);

    // Shared Town Materials (2D Cel-Toon Stylized Trim, Wrought-Iron, Roof, Foliage — dynamically updated per Scene Theme!)
    const brassMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: theme.crystalColor,
        roughness: 0.42,
        metalness: 0.22,
      })
    );
    this.trimMat = brassMat;
    const ironMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0x3e424c,
        roughness: 0.56,
        metalness: 0.18,
      })
    );
    this.ironSharedMat = ironMat;
    const copperRoofMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: theme.roofColor,
        roughness: 0.52,
        metalness: 0.15,
      })
    );
    this.roofMat = copperRoofMat;
    const grassMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: theme.foliageColor,
        roughness: 0.68,
        metalness: 0.02,
      })
    );
    this.foliageMat = grassMat;
    const windowGlowMat = new THREE.MeshBasicMaterial({ color: 0xffe49c });
    this.windowGlowSharedMat = windowGlowMat;
    const cloudSpriteMat = new THREE.MeshBasicMaterial({
      map: create2DCloudPuffTexture(),
      transparent: true,
      alphaTest: 0.04,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.curbMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: theme.curbColor,
        roughness: 0.68,
        metalness: 0.06,
      })
    );
    this.curbStripMat = new THREE.MeshBasicMaterial({ color: theme.curbEmissive });
    this.cliffPrimaryMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: theme.cliffColor,
        roughness: 0.72,
        metalness: 0.06,
      })
    );
    this.cliffSecondaryMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: theme.cliffSecondaryColor,
        roughness: 0.74,
        metalness: 0.06,
      })
    );
    this.crystalMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: theme.crystalColor,
        emissive: theme.crystalEmissive,
        emissiveIntensity: 0.18,
        roughness: 0.42,
        metalness: 0.22,
      })
    );

    // Under-bridge Brick & Stone Viaduct Piers
    for (const pz of [-15, -5, 5, 15]) {
      for (const side of [-1, 1]) {
        const px = side * (TRACK_HALF_W - 0.8);
        const pier = new THREE.Mesh(new THREE.BoxGeometry(2.1, 6.6, 2.5), this.cliffPrimaryMat);
        pier.position.set(px, -3.8, pz);
        this.scene.add(pier);

        const capStone = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.42, 2.75), this.curbMat);
        capStone.position.set(px, -0.75, pz);
        this.scene.add(capStone);
      }
    }

    // 3. Raised Sandstone Viaduct Parapet Curbs + Crenellated Stone Coping + Green Grass Tufts
    const curbGeo = new THREE.BoxGeometry(1.05, 0.78, 44);
    for (const side of [-1, 1]) {
      const curb = new THREE.Mesh(curbGeo, this.curbMat);
      curb.position.set(side * (TRACK_HALF_W + 0.48), 0.34, 0.5);
      curb.castShadow = true;
      curb.receiveShadow = true;
      this.scene.add(curb);
    }

    // Segmented stone coping blocks & sprouting green grass tufts along both bridge edges
    for (let bz = -17.0; bz <= 17.5; bz += 2.6) {
      for (const side of [-1, 1]) {
        const bx = side * (TRACK_HALF_W + 0.52);
        const block = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.34, 1.85), this.curbMat);
        block.position.set(bx, 0.84, bz);
        block.castShadow = true;
        block.receiveShadow = true;
        this.scene.add(block);

        // Cute leafy grass tuft sprouting at curb crevices
        if (Math.abs(Math.round(bz)) % 5 !== 0) {
          const tuft = new THREE.Group();
          tuft.position.set(side * (TRACK_HALF_W - 0.06), 0.12, bz + 0.95);
          for (let b = -1; b <= 1; b++) {
            const blade = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.56, 5), grassMat);
            blade.position.set(b * 0.11, 0.22, b * 0.08);
            blade.rotation.z = -side * (0.28 + b * 0.18);
            blade.rotation.x = b * 0.22;
            tuft.add(blade);
          }
          this.scene.add(tuft);
        }
      }
    }

    // 3b. Flanking Polished-Brass Steam Pipelines, Flanged Collars, Elbows & Puffing Steam Vents
    const mainPipeGeo = new THREE.CylinderGeometry(0.46, 0.46, 40, 14);
    mainPipeGeo.rotateX(Math.PI / 2);
    for (const side of [-1, 1]) {
      const pipeX = side * (TRACK_HALF_W + 1.52);
      const longPipe = new THREE.Mesh(mainPipeGeo, brassMat);
      longPipe.position.set(pipeX, 0.72, 0.2);
      longPipe.castShadow = true;
      this.scene.add(longPipe);

      for (const fz of [-14, -7, 0, 7, 14]) {
        const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.24, 14), brassMat);
        flange.rotation.x = Math.PI / 2;
        flange.position.set(pipeX, 0.72, fz);
        this.scene.add(flange);

        const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.9, 0.36), ironMat);
        bracket.position.set(pipeX - side * 0.35, 0.42, fz);
        this.scene.add(bracket);
      }

      // Vertical Brass Steam Exhaust Risers & Curved Elbows along the viaduct
      for (const vz of [-10.5, 2.5, 11.5]) {
        const riser = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, 2.4, 12), brassMat);
        riser.position.set(pipeX + side * 0.48, 1.55, vz);
        riser.castShadow = true;
        this.scene.add(riser);

        const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.46, 0.26, 12), ironMat);
        collar.position.set(pipeX + side * 0.48, 2.72, vz);
        this.scene.add(collar);
      }
    }

    // 3c. Vintage Wrought-Iron & Warm Glowing Brass Streetlamps along both Parapets
    for (const lz of [13.5, 4.0, -5.5, -14.5]) {
      for (const side of [-1, 1]) {
        const lx = side * (TRACK_HALF_W + 0.55);
        const lampGroup = new THREE.Group();
        lampGroup.position.set(lx, 1.0, lz);

        const basePed = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 0.45, 8), ironMat);
        basePed.position.y = 0.22;
        lampGroup.add(basePed);

        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 2.35, 8), ironMat);
        pole.position.y = 1.55;
        pole.castShadow = true;
        lampGroup.add(pole);

        const lanternGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.2, 0.56, 6), windowGlowMat);
        lanternGlass.position.y = 2.95;
        lampGroup.add(lanternGlass);

        const lanternCap = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.34, 6), brassMat);
        lanternCap.position.y = 3.38;
        lampGroup.add(lanternCap);

        this.scene.add(lampGroup);
      }
    }

    // 4. Outside-Arena Dynamic Multi-Scene 3D Landmarks & Architecture (Rebuilt per Theme!)
    this.scene.add(this.themeLandmarkGroup);
    this.rebuildThemeLandmarks(theme);

    // 4b. Rising Soft White Steam Columns in the Factory Valley
    this.waterfallShaderMat = createEnergyWaterfallShaderMaterial(0xfff5e4);
    const steamPlumeSpots = [
      { x: -15.4, z: -16.5, w: 3.0, h: 12.0, rotY: 0.38 },
      { x: 15.4, z: -16.5, w: 3.0, h: 12.0, rotY: -0.38 },
      { x: -15.8, z: -1.5, w: 2.6, h: 10.5, rotY: 0.42 },
      { x: 15.8, z: -1.5, w: 2.6, h: 10.5, rotY: -0.42 },
    ];
    for (const wf of steamPlumeSpots) {
      const wfMesh = new THREE.Mesh(new THREE.PlaneGeometry(wf.w, wf.h), this.waterfallShaderMat);
      wfMesh.position.set(wf.x, 3.2, wf.z);
      wfMesh.rotation.y = wf.rotY;
      this.scene.add(wfMesh);
    }

    // 4c. Six Fluffy 3D White Cumulus Cloud Clusters & Brass Weather Vanes floating beside the Town
    this.floatingMonoliths = [];
    const cloudSpots = [
      { x: -14.5, y: 10.2, z: -22.5, s: 1.45, phase: 0.0 },
      { x: 14.5, y: 10.5, z: -22.5, s: 1.45, phase: 1.6 },
      { x: -18.5, y: 8.6, z: -11.0, s: 1.2, phase: 2.8 },
      { x: 18.5, y: 8.8, z: -11.0, s: 1.2, phase: 4.1 },
      { x: -17.5, y: 7.4, z: 2.5, s: 1.05, phase: 5.2 },
      { x: 17.5, y: 7.6, z: 2.5, s: 1.05, phase: 0.9 },
    ];
    for (const ms of cloudSpots) {
      const mGroup = new THREE.Group();
      mGroup.position.set(ms.x, ms.y, ms.z);

      for (const [cx, cy, cz, cw] of [
        [0, 0, 0, 3.8],
        [-1.35, -0.25, 0.25, 2.8],
        [1.4, -0.22, -0.2, 2.9],
      ] as const) {
        const lobe = new THREE.Mesh(
          new THREE.PlaneGeometry(cw * ms.s, cw * 0.82 * ms.s),
          cloudSpriteMat
        );
        lobe.position.set(cx * ms.s, cy * ms.s, cz * ms.s);
        lobe.rotation.x = -0.34;
        mGroup.add(lobe);
      }

      const ringOuter = new THREE.Mesh(
        new THREE.TorusGeometry(0.45 * ms.s, 0.05 * ms.s, 6, 14),
        brassMat
      );
      ringOuter.position.y = -0.8 * ms.s;
      ringOuter.visible = false;
      mGroup.add(ringOuter);

      const ringInner = new THREE.Mesh(
        new THREE.TorusGeometry(0.32 * ms.s, 0.04 * ms.s, 6, 12),
        brassMat
      );
      ringInner.visible = false;
      mGroup.add(ringInner);

      this.scene.add(mGroup);
      this.floatingMonoliths.push({
        group: mGroup,
        ringOuter,
        ringInner,
        baseY: ms.y,
        phase: ms.phase,
      });
    }

    // 4d. Warm Golden Horizon Sun Glow & Distant Cloud Bank
    this.planetGroup = new THREE.Group();
    this.planetGroup.position.set(-16.0, 25.0, -58.0);

    this.planetBodyMat = new THREE.MeshStandardMaterial({
      color: 0xfff5d6,
      emissive: 0xffd27d,
      emissiveIntensity: 0.65,
      roughness: 0.4,
      metalness: 0.0,
    });
    const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(5.6, 20, 16), this.planetBodyMat);
    this.planetGroup.add(sunDisc);

    this.planetHaloMat = new THREE.MeshBasicMaterial({
      color: 0xffe4a3,
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const coronaRing = new THREE.Mesh(new THREE.CircleGeometry(9.6, 32), this.planetHaloMat);
    coronaRing.lookAt(this.baseCameraPos);
    this.planetGroup.add(coronaRing);
    this.scene.add(this.planetGroup);

    // 4e. Four Charming Brass-and-Cream Steampunk Blimps / Airships Drifting in the Sunny Sky
    this.skyCruisers = [];
    const blimpCreamMat = new THREE.MeshStandardMaterial({
      color: 0xf8eedb,
      roughness: 0.45,
      metalness: 0.08,
    });
    const cruiserConfigs = [
      { x: -24.5, y: 15.0, z: -22.0, dirZ: 1, speed: 1.1, phase: 0.0, scale: 1.15 },
      { x: 25.0, y: 16.2, z: -12.0, dirZ: -1, speed: 0.95, phase: 2.1, scale: 1.2 },
      { x: -23.0, y: 12.5, z: 3.0, dirZ: 1, speed: 1.25, phase: 4.0, scale: 0.92 },
      { x: 23.5, y: 13.5, z: -28.0, dirZ: -1, speed: 1.05, phase: 1.2, scale: 1.0 },
    ];
    for (const cc of cruiserConfigs) {
      const cGroup = new THREE.Group();
      cGroup.position.set(cc.x, cc.y, cc.z);
      cGroup.scale.setScalar(cc.scale);
      if (cc.dirZ < 0) cGroup.rotation.y = Math.PI;

      // Plump Cream Balloon Envelope + Brass Harness Bands
      const balloon = new THREE.Mesh(new THREE.SphereGeometry(1.45, 16, 12), blimpCreamMat);
      balloon.scale.set(1.0, 0.95, 2.25);
      cGroup.add(balloon);

      for (const bz of [-0.95, 0.95]) {
        const band = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.075, 8, 20), brassMat);
        band.position.z = bz;
        cGroup.add(band);
      }

      // Underslung Gondola Cabin
      const gondola = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.65, 1.75), copperRoofMat);
      gondola.position.set(0, -1.65, 0);
      cGroup.add(gondola);

      const cabinWin = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.28, 0.95), windowGlowMat);
      cabinWin.position.set(0, -1.58, 0.12);
      cGroup.add(cabinWin);

      // Tail Stabilizer Fins
      for (const side of [-1, 1]) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.08, 0.95), copperRoofMat);
        fin.position.set(side * 0.95, 0, -2.35);
        cGroup.add(fin);
      }

      this.scene.add(cGroup);
      this.skyCruisers.push({
        group: cGroup,
        baseX: cc.x,
        baseY: cc.y,
        baseZ: cc.z,
        dirZ: cc.dirZ,
        speed: cc.speed,
        phase: cc.phase,
      });
    }

    // 5. Player Bubble Station Parapet & Brass Pipe Flanks at PLAYER_Z (matches bottom of reference screenshot!)
    const parapetWall = new THREE.Mesh(
      new THREE.BoxGeometry(TRACK_HALF_W * 2 + 1.0, 0.62, 1.05),
      this.curbMat
    );
    parapetWall.position.set(0, 0.24, PLAYER_Z + 0.62);
    parapetWall.receiveShadow = true;
    this.scene.add(parapetWall);

    const brassRail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, TRACK_HALF_W * 2 - 0.8, 12),
      brassMat
    );
    brassRail.rotation.z = Math.PI / 2;
    brassRail.position.set(0, 0.64, PLAYER_Z + 0.18);
    this.scene.add(brassRail);

    this.bastionShieldMat = createBastionShieldShaderMaterial(theme.curbEmissive);
    const baseLine = new THREE.Mesh(
      new THREE.PlaneGeometry(TRACK_HALF_W * 2 - 1.4, 0.55),
      this.bastionShieldMat
    );
    baseLine.rotation.x = -Math.PI / 2;
    baseLine.position.set(0, 0.03, PLAYER_Z - 1.15);
    this.scene.add(baseLine);

    this.bastionTurretPods = [];
    for (const side of [-1, 1]) {
      const px = side * (TRACK_HALF_W - 0.55);
      // Curved Brass Pipe Elbow flanking the Bubble Station
      const elbow = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.42, 12, 16, Math.PI * 0.65), brassMat);
      elbow.position.set(side * (TRACK_HALF_W - 0.1), 0.72, PLAYER_Z + 0.52);
      elbow.rotation.y = side < 0 ? 0.25 : Math.PI - 0.25;
      this.scene.add(elbow);

      const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.24, 14), brassMat);
      flange.rotation.z = Math.PI / 2;
      flange.position.set(px, 0.82, PLAYER_Z + 0.52);
      this.scene.add(flange);

      // Flanking Bubble Station Brass Turret Pod
      const podGroup = new THREE.Group();
      podGroup.position.set(side * (TRACK_HALF_W + 1.45), 1.65, PLAYER_Z - 0.65);
      const podDome = new THREE.Mesh(new THREE.SphereGeometry(0.52, 12, 10), brassMat);
      podGroup.add(podDome);
      const podNozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.95, 10), blimpCreamMat);
      podNozzle.rotation.x = Math.PI / 2.3;
      podNozzle.position.set(0, 0.15, -0.48);
      podGroup.add(podNozzle);
      this.scene.add(podGroup);
      this.bastionTurretPods.push(podGroup);
    }

    // 6. Sunlit Floating Dandelion / Bubble Motes in the Warm Breeze
    const starCount = 240;
    const starPos = new Float32Array(starCount * 3);
    const starCol = new Float32Array(starCount * 3);
    const c1 = new THREE.Color(0xfffdf7);
    const c2 = new THREE.Color(0xffeab8);
    const c3 = new THREE.Color(0xdcf4ff);
    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      starPos[i3] = (Math.random() - 0.5) * 105;
      starPos[i3 + 1] = 0.5 + Math.random() * 34;
      starPos[i3 + 2] = -46 + Math.random() * 74;
      const pick = i % 4 === 0 ? c2 : i % 5 === 0 ? c3 : c1;
      starCol[i3] = pick.r;
      starCol[i3 + 1] = pick.g;
      starCol[i3 + 2] = pick.b;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
    const starMat = new THREE.PointsMaterial({
      size: 0.28,
      vertexColors: true,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
    });
    this.starfieldPoints = new THREE.Points(starGeo, starMat);
    this.starfieldPoints.visible = false;
    this.scene.add(this.starfieldPoints);

    // 7. Soft Golden Sunbeams slanting from Upper-Left
    this.godRayMats = [];
    const rayConfigs = [
      { x: -11.5, y: 14.0, z: -15.0, w: 7.5, h: 34.0, op: 0.032 },
      { x: -2.0, y: 15.0, z: -8.0, w: 8.5, h: 36.0, op: 0.028 },
      { x: 8.5, y: 13.5, z: -13.5, w: 7.0, h: 34.0, op: 0.025 },
    ];
    for (const rc of rayConfigs) {
      const rMat = new THREE.MeshBasicMaterial({
        color: 0xfff2cc,
        transparent: true,
        opacity: rc.op,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const rMesh = new THREE.Mesh(new THREE.PlaneGeometry(rc.w, rc.h), rMat);
      rMesh.position.set(rc.x, rc.y, rc.z);
      rMesh.rotation.z = -0.34;
      rMesh.rotation.y = 0.18;
      this.scene.add(rMesh);
      this.godRayMats.push(rMat);
    }
  }

  private buildTurret(): void {
    // Supercell 3D Glossy Steampunk Candy Cannon (Bronze-Iron Barrel + Polished Gold Bands + 3 Candy Gears + Peppermint Wheels)
    this.turretGroup.position.set(this.turretX, 0.14, PLAYER_Z - 0.5);
    this.turretGroup.scale.setScalar(1.25);

    const brassMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0xf5b82e,
        metalness: 0.68,
        roughness: 0.22,
      })
    );
    const darkIronMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0x2b3548,
        metalness: 0.58,
        roughness: 0.28,
      })
    );
    const creamIvoryMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0xd97706,
        metalness: 0.46,
        roughness: 0.24,
      })
    );
    this.turretBrassMat = brassMat;
    this.turretBarrelMat = creamIvoryMat;

    // Soft Warm Aiming Ring & Subtle Lane Guide
    const groundRingGeo = new THREE.RingGeometry(1.32, 1.56, 32);
    groundRingGeo.rotateX(-Math.PI / 2);
    const groundRingMat = new THREE.MeshBasicMaterial({
      color: 0xf6c453,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const groundRing = new THREE.Mesh(groundRingGeo, groundRingMat);
    groundRing.position.set(0, 0.04, -0.15);
    this.turretGroundRingMat = groundRingMat;
    this.turretGroup.add(groundRing);

    const sightGeo = new THREE.PlaneGeometry(0.11, 24);
    sightGeo.rotateX(-Math.PI / 2);
    const sightMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    const laserSight = new THREE.Mesh(sightGeo, sightMat);
    laserSight.position.set(0, 0.06, -13.5);
    this.turretGroup.add(laserSight);

    // Supercell Style 2: Red-and-White Peppermint Swirl Candy Wheels + Chocolate-Wood & Brass Carriage!
    const peppermintWheelMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        map: createPeppermintWheelTexture(),
        roughness: 0.32,
        metalness: 0.05,
      })
    );
    const chocoWoodMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0x6b3414,
        roughness: 0.48,
        metalness: 0.1,
      })
    );
    const candyRedMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0xef4444,
        roughness: 0.3,
        metalness: 0.08,
      })
    );
    const candyGreenGearMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0x22c55e,
        roughness: 0.32,
        metalness: 0.15,
      })
    );
    const candyBlueGearMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0x2563eb,
        roughness: 0.32,
        metalness: 0.15,
      })
    );

    this.turretWheels = [];
    this.turretGears = [];
    for (const side of [-1, 1]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.62, 0.62, 0.36, 22),
        peppermintWheelMat
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(side * 1.04, 0.6, -0.05);
      wheel.castShadow = true;
      this.turretGroup.add(wheel);
      this.turretWheels.push(wheel);

      const hubCap = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.42, 14), brassMat);
      hubCap.rotation.z = Math.PI / 2;
      hubCap.position.set(side * 1.06, 0.6, -0.05);
      this.turretGroup.add(hubCap);

      const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.92, 1.78), chocoWoodMat);
      cheek.position.set(side * 0.72, 0.62, 0.08);
      cheek.castShadow = true;
      this.turretGroup.add(cheek);

      // Decorative Emerald-Green, Royal-Blue & Candy-Pink 3D Side Gears (Matches Style 2 3D Asset Sheet!)
      const sideGear = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.32, 0.16, 12),
        side < 0 ? candyGreenGearMat : candyBlueGearMat
      );
      sideGear.rotation.z = Math.PI / 2;
      sideGear.position.set(side * 0.9, 0.88, 0.34);
      this.turretGroup.add(sideGear);
      this.turretGears.push(sideGear);
    }

    const candyPinkGearMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0xec4899,
        roughness: 0.24,
        metalness: 0.22,
      })
    );
    const pinkGear = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.26, 0.15, 12),
      candyPinkGearMat
    );
    pinkGear.rotation.z = Math.PI / 2;
    pinkGear.position.set(0.92, 0.56, 0.52);
    this.turretGroup.add(pinkGear);
    this.turretGears.push(pinkGear);

    // Carriage Base Plate
    const carriageBase = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.44, 1.88), chocoWoodMat);
    carriageBase.position.set(0, 0.35, 0.12);
    carriageBase.castShadow = true;
    this.turretGroup.add(carriageBase);

    // Plump Cream-Ivory & Brass Tapered Cannon Barrel + Peppermint Muzzle Collar & Candy-Cane Fuse!
    const barrelGeo = new THREE.CylinderGeometry(0.46, 0.64, 2.35, 22);
    barrelGeo.rotateX(Math.PI / 2);
    this.turretBarrel = new THREE.Mesh(barrelGeo, creamIvoryMat);
    this.turretBarrel.position.set(0, 0.96, -0.62);
    this.turretBarrel.castShadow = true;

    // Red-and-White Peppermint Striped Muzzle Collar + Polished Brass Ring at front tip
    const muzzleRing1 = new THREE.Mesh(
      new THREE.TorusGeometry(0.49, 0.115, 12, 22),
      peppermintWheelMat
    );
    muzzleRing1.position.set(0, 0, -1.12);
    this.turretBarrel.add(muzzleRing1);

    const muzzleRing2 = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.08, 10, 20), brassMat);
    muzzleRing2.position.set(0, 0, -0.92);
    this.turretBarrel.add(muzzleRing2);

    const muzzleHole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.36, 0.16, 18),
      new THREE.MeshBasicMaterial({ color: 0x1e2430 })
    );
    muzzleHole.rotation.x = Math.PI / 2;
    muzzleHole.position.set(0, 0, -1.16);
    this.turretBarrel.add(muzzleHole);

    // Middle Brass Trunnion Band + Candy Red Stripe Band + Top Sight Block
    const midBand = new THREE.Mesh(new THREE.TorusGeometry(0.57, 0.095, 10, 22), brassMat);
    midBand.position.set(0, 0, 0.12);
    this.turretBarrel.add(midBand);

    const candyBand = new THREE.Mesh(new THREE.TorusGeometry(0.53, 0.065, 10, 22), candyRedMat);
    candyBand.position.set(0, 0, -0.38);
    this.turretBarrel.add(candyBand);

    const topSight = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 0.42), brassMat);
    topSight.position.set(0, 0.62, 0.12);
    this.turretBarrel.add(topSight);

    // Cascaded Brass Breech Rings + Spherical Cascabel Knob + Curved Candy-Cane Fuse at Rear
    const breechBand1 = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.11, 12, 22), brassMat);
    breechBand1.position.set(0, 0, 0.92);
    this.turretBarrel.add(breechBand1);

    const breechDome = new THREE.Mesh(new THREE.SphereGeometry(0.62, 18, 14), brassMat);
    breechDome.scale.set(1.0, 1.0, 0.65);
    breechDome.position.set(0, 0, 1.12);
    this.turretBarrel.add(breechDome);

    const cascabelKnob = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 12), peppermintWheelMat);
    cascabelKnob.position.set(0, 0, 1.54);
    this.turretBarrel.add(cascabelKnob);

    const candyFuse = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.045, 8, 14, Math.PI * 1.15),
      candyRedMat
    );
    candyFuse.rotation.y = Math.PI / 2;
    candyFuse.position.set(0, 0.2, 1.68);
    this.turretBarrel.add(candyFuse);

    // MC-9: Build 3D Toy-Craft Steam Cannon Core Module Barrel Attachments
    this.cannonModGroup = new THREE.Group();
    this.cannonModOverdriveGroup = new THREE.Group();
    this.cannonModPrismGroup = new THREE.Group();
    this.cannonModHeavyMortarGroup = new THREE.Group();
    this.cannonModFlywheels = [];

    // 1) Overdrive Breech (`overdrive_breech`): Twin copper-gold steam cylinders + spinning flywheel valves
    const copperModMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0x78350f,
      emissiveIntensity: 0.25,
      metalness: 0.72,
      roughness: 0.22,
    });
    for (const side of [-1, 1]) {
      const podChamber = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.21, 1.05, 14),
        copperModMat
      );
      podChamber.rotation.x = Math.PI / 2;
      podChamber.position.set(side * 0.64, 0.14, 0.28);
      this.cannonModOverdriveGroup.add(podChamber);

      const valveWheel = new THREE.Mesh(
        new THREE.TorusGeometry(0.22, 0.055, 8, 16),
        candyRedMat
      );
      valveWheel.rotation.y = Math.PI / 2;
      valveWheel.position.set(side * 0.84, 0.16, 0.36);
      this.cannonModOverdriveGroup.add(valveWheel);
      this.cannonModFlywheels.push(valveWheel);
    }

    // 2) Prism Splitter (`prism_splitter`): Faceted glowing cyan-magenta crystal lens & brass halo at muzzle
    const prismGlassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.68,
      metalness: 0.18,
      roughness: 0.08,
    });
    const prismBracket = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.065, 10, 20), brassMat);
    prismBracket.position.set(0, 0, -1.24);
    this.cannonModPrismGroup.add(prismBracket);
    const prismCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), prismGlassMat);
    prismCrystal.position.set(0, 0.56, -1.16);
    this.cannonModPrismGroup.add(prismCrystal);
    this.cannonModPrismCrystal = prismCrystal;
    for (const side of [-1, 1]) {
      const sideFacet = new THREE.Mesh(new THREE.OctahedronGeometry(0.19, 0), prismGlassMat);
      sideFacet.position.set(side * 0.56, 0.08, -1.22);
      this.cannonModPrismGroup.add(sideFacet);
    }

    // 3) Heavy Mortar (`heavy_mortar`): Chunky armored siege shroud + top hydraulic recoil pistons
    const mortarArmorMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      emissive: 0x7f1d1d,
      emissiveIntensity: 0.18,
      metalness: 0.62,
      roughness: 0.3,
    });
    const mortarSleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.61, 0.66, 1.18, 18, 1, true),
      mortarArmorMat
    );
    mortarSleeve.rotation.x = Math.PI / 2;
    mortarSleeve.position.set(0, 0, -0.52);
    this.cannonModHeavyMortarGroup.add(mortarSleeve);
    this.cannonModMortarSleeve = mortarSleeve;
    const mortarCrownRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.62, 0.09, 10, 20),
      candyRedMat
    );
    mortarCrownRing.position.set(0, 0, -1.08);
    this.cannonModHeavyMortarGroup.add(mortarCrownRing);
    for (const side of [-1, 1]) {
      const recoilRod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.11, 0.96, 10),
        brassMat
      );
      recoilRod.rotation.x = Math.PI / 2;
      recoilRod.position.set(side * 0.42, 0.56, -0.35);
      this.cannonModHeavyMortarGroup.add(recoilRod);
    }

    this.cannonModGroup.add(this.cannonModOverdriveGroup);
    this.cannonModGroup.add(this.cannonModPrismGroup);
    this.cannonModGroup.add(this.cannonModHeavyMortarGroup);
    this.turretBarrel.add(this.cannonModGroup);
    this.syncCannonCoreModule3D();

    this.turretGroup.add(this.turretBarrel);

    // Right-Side Round Brass-Rimmed White Pressure Gauge Dial (facing camera, needle jitters with recoil!)
    const gaugeGroup = new THREE.Group();
    gaugeGroup.position.set(0.96, 1.02, 0.24);
    gaugeGroup.rotation.set(-0.66, -0.16, 0);

    const gaugePipe = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.42, 8), darkIronMat);
    gaugePipe.position.set(-0.22, -0.28, -0.05);
    gaugePipe.rotation.z = 0.55;
    gaugeGroup.add(gaugePipe);

    const gaugeCase = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.18, 22), brassMat);
    gaugeCase.rotation.x = Math.PI / 2;
    gaugeCase.castShadow = true;
    gaugeGroup.add(gaugeCase);

    const gaugeRim = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.055, 10, 22), brassMat);
    gaugeRim.position.z = 0.08;
    gaugeGroup.add(gaugeRim);

    const dialFace = new THREE.Mesh(
      new THREE.CircleGeometry(0.35, 22),
      new THREE.MeshBasicMaterial({ color: 0xfffcf5 })
    );
    dialFace.position.z = 0.095;
    gaugeGroup.add(dialFace);

    for (let tk = 0; tk < 7; tk++) {
      const ang = -Math.PI * 0.75 + (tk / 6) * Math.PI * 1.5;
      const tick = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.075, 0.01),
        new THREE.MeshBasicMaterial({ color: tk >= 5 ? 0xd93832 : 0x3b2e26 })
      );
      tick.position.set(Math.sin(ang) * 0.26, Math.cos(ang) * 0.26, 0.105);
      tick.rotation.z = -ang;
      gaugeGroup.add(tick);
    }

    const needlePivot = new THREE.Group();
    needlePivot.position.set(0, 0, 0.115);
    const needle = new THREE.Mesh(
      new THREE.BoxGeometry(0.042, 0.26, 0.015),
      new THREE.MeshBasicMaterial({ color: 0xd6362e })
    );
    needle.position.y = 0.1;
    needlePivot.add(needle);
    const centerPin = new THREE.Mesh(
      new THREE.CircleGeometry(0.048, 12),
      new THREE.MeshBasicMaterial({ color: 0x2c221e })
    );
    centerPin.position.z = 0.008;
    needlePivot.add(centerPin);
    needlePivot.rotation.z = -0.45;
    this.turretGaugeNeedle = needlePivot;
    gaugeGroup.add(needlePivot);
    this.turretGroup.add(gaugeGroup);

    // Build 3D Chibi Pink-Twintail Idol Cheerleader Mascot beside the Cannon!
    this.buildIdolCheerleaderMascot(brassMat, darkIronMat);
    this.turretGroup.add(this.mascotGroup);

    this.turretMuzzleLight = new THREE.PointLight(0x38bdf8, 0, 5);
    this.turretMuzzleLight.position.set(0, 0.96, -1.85);
    this.turretGroup.add(this.turretMuzzleLight);

    // Evolution Tier 1 (Lv.5+): Twin Polished-Brass Side Steam Booster Nozzles
    const sideBarrelGeo = new THREE.CylinderGeometry(0.16, 0.22, 1.35, 12);
    sideBarrelGeo.rotateX(Math.PI / 2);
    for (const side of [-1, 1]) {
      const sb = new THREE.Mesh(sideBarrelGeo, brassMat);
      sb.position.set(side * 0.78, 0.88, -0.58);
      this.turretEvo1Group.add(sb);
    }
    this.turretEvo1Group.visible = false;
    this.turretGroup.add(this.turretEvo1Group);

    // Evolution Tier 2 (Lv.10+): Golden Star Crown Ring above Barrel
    const evo2Mat = new THREE.MeshStandardMaterial({
      color: 0xffcf40,
      emissive: 0xd98218,
      emissiveIntensity: 0.45,
      metalness: 0.78,
      roughness: 0.18,
    });
    const haloRing = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.075, 8, 24), evo2Mat);
    haloRing.rotation.x = Math.PI / 2;
    haloRing.position.set(0, 1.62, -0.1);
    this.turretEvoHalo = haloRing;
    this.turretEvo2Group.add(haloRing);
    this.turretEvo2Group.visible = false;
    this.turretGroup.add(this.turretEvo2Group);

    this.scene.add(this.turretGroup);

    // Build 3D Golden Wind-Up Treasure Piggy-Bag Runner (Cross-Bridge Bonus Target)
    const goldBugMat = new THREE.MeshStandardMaterial({
      color: 0xf7be2c,
      emissive: 0xa16207,
      emissiveIntensity: 0.35,
      metalness: 0.75,
      roughness: 0.2,
    });
    const bugBody = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 12), goldBugMat);
    bugBody.scale.set(1.05, 0.92, 0.95);
    bugBody.position.y = 0.65;
    bugBody.castShadow = true;
    this.lootBugGroup.add(bugBody);

    const bagNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.28, 0.35, 12), goldBugMat);
    bagNeck.position.set(0, 1.25, 0);
    this.lootBugGroup.add(bagNeck);

    const windKey = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.06, 8, 14), brassMat);
    windKey.position.set(0, 1.55, 0);
    this.lootBugGroup.add(windKey);

    this.lootBugGroup.visible = false;
    this.scene.add(this.lootBugGroup);

    this.buildTacticalAirdropAndRainbowFX(brassMat);
    this.buildMechaOverlordRig(brassMat);
  }

  private buildMechaOverlordRig(_brassMat: THREE.MeshStandardMaterial): void {
    const group = new THREE.Group();
    group.visible = false;

    const armorMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0xfff7e6,
        roughness: 0.24,
        metalness: 0.16,
      }),
      0.78
    );
    const trimMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0xd99b26,
        emissive: 0x3b2106,
        emissiveIntensity: 0.18,
        roughness: 0.28,
        metalness: 0.58,
      }),
      0.8
    );
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.92,
      roughness: 0.18,
      metalness: 0.15,
    });
    const darkJointMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.45,
        metalness: 0.42,
      }),
      0.76
    );

    const auraRingMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
    });
    const auraRingMesh = new THREE.Mesh(new THREE.RingGeometry(1.55, 2.05, 32), auraRingMat);
    auraRingMesh.rotation.x = -Math.PI / 2;
    auraRingMesh.position.y = 0.05;
    group.add(auraRingMesh);

    const pelvisGroup = new THREE.Group();
    pelvisGroup.position.set(0, 0.92, 0);
    const hipBlock = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.44, 0.94), trimMat);
    hipBlock.castShadow = true;
    pelvisGroup.add(hipBlock);
    group.add(pelvisGroup);

    const makeLeg = (side: -1 | 1): THREE.Group => {
      const leg = new THREE.Group();
      leg.position.set(side * 0.52, 0.88, 0);
      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.54, 0.52), armorMat);
      thigh.position.set(0, -0.24, 0);
      thigh.castShadow = true;
      leg.add(thigh);
      const knee = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.5, 12), trimMat);
      knee.rotation.z = Math.PI / 2;
      knee.position.set(0, -0.48, 0.06);
      leg.add(knee);
      const shin = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.46, 0.64), armorMat);
      shin.position.set(0, -0.66, 0.04);
      shin.castShadow = true;
      leg.add(shin);
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.24, 0.84), trimMat);
      boot.position.set(0, -0.8, -0.06);
      boot.castShadow = true;
      leg.add(boot);
      return leg;
    };
    const leftLegGroup = makeLeg(-1);
    const rightLegGroup = makeLeg(1);
    group.add(leftLegGroup, rightLegGroup);

    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(0, 1.56, 0);
    const chestArmor = new THREE.Mesh(new THREE.BoxGeometry(1.68, 1.08, 1.18), armorMat);
    chestArmor.castShadow = true;
    torsoGroup.add(chestArmor);

    const chestCollar = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.24, 1.24), trimMat);
    chestCollar.position.set(0, 0.46, 0);
    torsoGroup.add(chestCollar);

    const reactorFrame = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.075, 10, 20), trimMat);
    reactorFrame.position.set(0, 0.04, -0.6);
    torsoGroup.add(reactorFrame);

    const reactorCore = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 12), coreMat);
    reactorCore.position.set(0, 0.04, -0.58);
    torsoGroup.add(reactorCore);

    // Helmet & Glowing Cyan Optic Visor (facing -Z toward enemy stronghold)
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.46, 16, 14), armorMat);
    helmet.scale.set(1.08, 0.94, 1.04);
    helmet.position.set(0, 0.84, -0.05);
    helmet.castShadow = true;
    torsoGroup.add(helmet);

    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.56), trimMat);
    crest.position.set(0, 1.22, -0.06);
    torsoGroup.add(crest);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.18, 0.16), coreMat);
    visor.position.set(0, 0.84, -0.46);
    torsoGroup.add(visor);

    // Rear Twin Steam Stacks
    for (const sx of [-0.42, 0.42]) {
      const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.82, 10), trimMat);
      stack.position.set(sx, 0.68, 0.58);
      stack.rotation.x = 0.2;
      torsoGroup.add(stack);
    }

    const makeArm = (side: -1 | 1): THREE.Group => {
      const arm = new THREE.Group();
      arm.position.set(side * 1.06, 0.28, 0);
      const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 12), trimMat);
      pauldron.scale.set(1.1, 0.88, 1.05);
      pauldron.position.set(side * 0.08, 0.12, 0);
      pauldron.castShadow = true;
      arm.add(pauldron);

      const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 0.72, 12), armorMat);
      forearm.position.set(side * 0.12, -0.38, -0.14);
      forearm.rotation.x = 0.35;
      forearm.castShadow = true;
      arm.add(forearm);

      const fist = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.38, 0.48), trimMat);
      fist.position.set(side * 0.12, -0.72, -0.32);
      fist.castShadow = true;
      arm.add(fist);
      return arm;
    };
    const leftArmGroup = makeArm(-1);
    const rightArmGroup = makeArm(1);
    torsoGroup.add(leftArmGroup, rightArmGroup);

    const makeCannonPod = (side: -1 | 1): THREE.Group => {
      const pod = new THREE.Group();
      pod.position.set(side * 0.78, 0.86, 0.06);
      const mount = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.36, 0.68), darkJointMat);
      pod.add(mount);
      for (const bx of [-0.11, 0.11]) {
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 1.28, 12), trimMat);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(bx, 0.08, -0.56);
        barrel.castShadow = true;
        pod.add(barrel);

        const muzzle = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.032, 8, 14), coreMat);
        muzzle.position.set(bx, 0.08, -1.18);
        pod.add(muzzle);
      }
      return pod;
    };
    const leftCannonPod = makeCannonPod(-1);
    const rightCannonPod = makeCannonPod(1);
    torsoGroup.add(leftCannonPod, rightCannonPod);

    group.add(torsoGroup);
    this.scene.add(group);

    const shellGeo = new THREE.SphereGeometry(0.26, 12, 10);
    const shellMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf97316,
      emissiveIntensity: 0.95,
      roughness: 0.18,
      metalness: 0.2,
    });
    this.mechaShells = [];
    for (let i = 0; i < 16; i++) {
      const sMesh = new THREE.Mesh(shellGeo, shellMat);
      sMesh.visible = false;
      this.scene.add(sMesh);
      this.mechaShells.push({
        active: false,
        x: 0,
        y: 0,
        z: 0,
        startX: 0,
        startZ: 0,
        targetX: 0,
        targetZ: 0,
        flightTime: 0,
        flightDuration: 0.38,
        dmg: 40,
        splashRadius: 2.8,
        mesh: sMesh,
      });
    }

    this.mechaOverlord = {
      active: false,
      x: 0,
      z: PLAYER_Z - 3.0,
      hp: 900,
      maxHp: 900,
      baseDmg: 45,
      shellDmg: 65,
      lifeTimer: 0,
      maxLifeTimer: 22,
      fusedSquadCount: 0,
      walkPhase: 0,
      stompCooldown: 0,
      volleyCooldown: 0.35,
      volleyInterval: 1.0,
      volleysFired: 0,
      smashesCount: 0,
      empOverdriveTimer: 0,
      leftRecoil: 0,
      rightRecoil: 0,
      meleeSwingAnim: 0,
      group,
      pelvisGroup,
      torsoGroup,
      leftLegGroup,
      rightLegGroup,
      leftArmGroup,
      rightArmGroup,
      leftCannonPod,
      rightCannonPod,
      armorMat,
      trimMat,
      coreMat,
      auraRingMesh,
      auraRingMat,
      labelEl: null,
    };
  }

  private buildTacticalAirdropAndRainbowFX(brassMat: THREE.MeshStandardMaterial): void {
    const group = new THREE.Group();
    const crateMat = new THREE.MeshStandardMaterial({
      color: 0xf4c87a,
      emissive: 0x3b2307,
      emissiveIntensity: 0.25,
      roughness: 0.35,
      metalness: 0.22,
    });
    const crateMesh = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.96, 1.22), crateMat);
    crateMesh.position.y = 0.48;
    crateMesh.castShadow = true;
    group.add(crateMesh);

    // Brass corner frame & cyan glowing steam pressure gauges
    const trimMesh = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.16, 1.3), brassMat);
    trimMesh.position.y = 0.92;
    group.add(trimMesh);
    const gaugeMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.75,
      roughness: 0.2,
    });
    const gaugeFront = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 12), gaugeMat);
    gaugeFront.rotation.x = Math.PI / 2;
    gaugeFront.position.set(0, 0.5, 0.62);
    group.add(gaugeFront);

    // Coral-and-cream parachute dome + 4 rigging struts
    const parachuteGroup = new THREE.Group();
    parachuteGroup.position.y = 2.05;
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0xf97362,
      emissive: 0x7c1d12,
      emissiveIntensity: 0.2,
      roughness: 0.45,
      side: THREE.DoubleSide,
    });
    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(1.22, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.52),
      canopyMat
    );
    canopy.scale.set(1, 0.85, 1);
    parachuteGroup.add(canopy);
    const canopyRing = new THREE.Mesh(new THREE.TorusGeometry(1.16, 0.06, 8, 20), brassMat);
    canopyRing.rotation.x = Math.PI / 2;
    parachuteGroup.add(canopyRing);
    for (const [rx, rz] of [
      [-0.78, -0.78],
      [0.78, -0.78],
      [-0.78, 0.78],
      [0.78, 0.78],
    ]) {
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.25, 6), brassMat);
      rope.position.set(rx * 0.52, -0.58, rz * 0.52);
      rope.rotation.z = rx * 0.48;
      rope.rotation.x = -rz * 0.48;
      parachuteGroup.add(rope);
    }
    group.add(parachuteGroup);

    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const haloMesh = new THREE.Mesh(new THREE.RingGeometry(0.92, 1.36, 24), haloMat);
    haloMesh.rotation.x = -Math.PI / 2;
    haloMesh.position.y = 0.08;
    group.add(haloMesh);

    group.visible = false;
    this.scene.add(group);

    this.airdrop = {
      active: false,
      phase: 'falling',
      x: 0,
      y: 11.5,
      z: 0,
      hp: 4,
      maxHp: 4,
      bobPhase: 0,
      lifeTimer: 22,
      group,
      parachuteGroup,
      crateMesh,
      crateMat,
      haloMesh,
      haloMat,
      labelEl: null,
    };

    // Pre-allocated pooled rainbow pierce beam cylinders (zero runtime geometry allocations)
    const beamLen = PLAYER_Z - BOSS_GATE_Z;
    const beamGeo = new THREE.CylinderGeometry(0.38, 0.66, beamLen, 14, 1, true);
    beamGeo.rotateX(Math.PI / 2);
    for (let i = 0; i < 6; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xf472b6,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(beamGeo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.rainbowBeamPool.push({ active: false, life: 0, maxLife: 0.34, mesh, mat });
    }
  }

  private buildIdolCheerleaderMascot(
    brassMat: THREE.MeshStandardMaterial,
    darkIronMat: THREE.MeshStandardMaterial
  ): void {
    this.mascotGroup = new THREE.Group();
    this.mascotGroup.position.set(-1.75, 0.04, 0.25);

    // 1. Ground Contact Shadow under the 3D Slime Gunner
    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.45, 1.05),
      new THREE.MeshBasicMaterial({
        map: create2DBlobShadowTexture(),
        transparent: true,
        depthWrite: false,
      })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.set(0, 0.02, 0.05);
    this.mascotGroup.add(shadowPlane);

    // 2. 3D Glossy Cyan Slime Gunner with Red Headband, Golden Crown & Brass Megaphone tilted toward camera!
    const slimePivot = new THREE.Group();
    slimePivot.position.set(0, 0.12, 0);
    slimePivot.rotation.x = -0.58;

    const slimeBodyMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      emissive: 0x0284c7,
      emissiveIntensity: 0.22,
      roughness: 0.16,
      metalness: 0.1,
    });
    const slimeBody = new THREE.Mesh(new THREE.SphereGeometry(0.64, 20, 16), slimeBodyMat);
    slimeBody.scale.set(1.06, 0.96, 1.02);
    slimeBody.position.set(0, 0.56, 0);
    slimeBody.castShadow = true;
    slimePivot.add(slimeBody);

    // Droplet peak on top of Slime Gunner
    const slimePeak = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.48, 16), slimeBodyMat);
    slimePeak.position.set(0, 1.12, 0);
    slimePivot.add(slimePeak);
    this.mascotPeak = slimePeak;

    // Red Warrior Headband around Slime Forehead
    const headbandMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.35 });
    const headband = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.085, 10, 20), headbandMat);
    headband.rotation.x = Math.PI / 2;
    headband.position.set(0, 0.84, 0.04);
    slimePivot.add(headband);

    // Cute 3D Eyes & Gloss Catchlight facing the camera
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (const side of [-1, 1]) {
      const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), eyeMat);
      eyeWhite.position.set(side * 0.23, 0.62, 0.56);
      slimePivot.add(eyeWhite);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), darkIronMat);
      pupil.position.set(side * 0.23, 0.62, 0.65);
      slimePivot.add(pupil);
    }

    // Brass Megaphone held on the right side
    const megaphone = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.46, 12), brassMat);
    megaphone.rotation.z = Math.PI / 2;
    megaphone.position.set(0.72, 0.56, 0.32);
    slimePivot.add(megaphone);
    this.mascotMegaphone = megaphone;

    this.mascotLeftArm = slimePivot;
    this.mascotGroup.add(slimePivot);
  }

  public syncTurretEvolution(celebrate = false): void {
    const maxLvl = Math.max(this.state.fireRateLevel, this.state.powerLevel);
    const nextTier = maxLvl >= 10 ? 2 : maxLvl >= 5 ? 1 : 0;

    this.turretEvo1Group.visible = nextTier >= 1;
    this.turretEvo2Group.visible = nextTier >= 2;

    if (this.turretBarrel) {
      const s = nextTier === 2 ? 1.18 : nextTier === 1 ? 1.09 : 1.0;
      this.turretBarrel.scale.set(s, 1.0, s);
    }

    if (celebrate && nextTier > this.currentTurretEvoTier) {
      const isTier2 = nextTier === 2;
      const fxCol = isTier2 ? 0xffc933 : 0x28c7fa;
      this.mascotCheerBoost = 1.2;
      this.triggerScreenFlash(isTier2 ? '#ffc933' : '#28c7fa', 0.45);
      this.addCameraShake(0.5);
      this.spawnSkyPillar(this.turretX, PLAYER_Z - 0.8, fxCol, 2.2, 0.5);
      this.spawnShockwave(this.turretX, PLAYER_Z - 0.8, fxCol, 4.6, 0.45);
      this.spawnBurstParticles(this.turretX, 1.2, PLAYER_Z - 0.8, fxCol, 50);
      this.spawnFloatingPopup(
        this.turretX,
        2.3,
        PLAYER_Z - 1.0,
        isTier2 ? '👑 皇家黄金礼花炮!' : '🎵 双联增压波波炮!',
        isTier2 ? '#f59e0b' : '#0ea5e9'
      );
      this.onBanner?.(
        isTier2 ? '👑 泡泡炮终极进化：皇家黄金礼花炮！' : '🎵 泡泡炮进化：双联蒸汽增压炮！',
        isTier2 ? '波波团体型 +16% · 黄金应援光环开启！' : '波波团体型 +8% · 蒸汽副炮开启！'
      );
    }
    this.currentTurretEvoTier = nextTier;
  }

  private buildBossOverlord(): void {
    const theme = this.currentTheme;
    this.bossGroup.position.set(0, 0, BOSS_GATE_Z - 3.2);

    this.bossArmorMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: theme.bossArmorColor,
        roughness: 0.72,
        metalness: 0.08,
      })
    );
    this.bossSecondaryMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: theme.bossSecondaryColor,
        roughness: 0.65,
        metalness: 0.12,
      })
    );
    this.bossEyeMat = new THREE.MeshBasicMaterial({ color: theme.bossEyeColor });

    const brassMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0xe2a836,
        roughness: 0.42,
        metalness: 0.22,
      })
    );
    const stoneTrimMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0xdcb992,
        roughness: 0.72,
        metalness: 0.06,
      })
    );
    const darkIronMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0x3b3f48,
        roughness: 0.52,
        metalness: 0.18,
      })
    );
    const boilerOrangeMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0xe66838,
        roughness: 0.46,
        metalness: 0.16,
      })
    );
    const steelWrenchMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0xdbe4f0,
        roughness: 0.42,
        metalness: 0.22,
      })
    );
    const bannerRedMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0xd9483b,
        roughness: 0.68,
        metalness: 0.04,
      })
    );
    const emblemWhiteMat = new THREE.MeshBasicMaterial({ color: 0xfff5eb });

    // 1. Terracotta Red-Brick Steampunk Factory Gatehouse Wall & Sandstone Cornice
    const leftWing = new THREE.Mesh(new THREE.BoxGeometry(5.2, 7.6, 3.8), this.bossArmorMat);
    leftWing.position.set(-5.8, 3.8, -0.2);
    leftWing.castShadow = true;
    this.bossGroup.add(leftWing);

    const rightWing = new THREE.Mesh(new THREE.BoxGeometry(5.2, 7.6, 3.8), this.bossArmorMat);
    rightWing.position.set(5.8, 3.8, -0.2);
    rightWing.castShadow = true;
    this.bossGroup.add(rightWing);

    const upperLintel = new THREE.Mesh(new THREE.BoxGeometry(7.2, 2.8, 3.8), this.bossArmorMat);
    upperLintel.position.set(0, 6.2, -0.2);
    upperLintel.castShadow = true;
    this.bossGroup.add(upperLintel);

    const corniceBar = new THREE.Mesh(new THREE.BoxGeometry(17.6, 0.72, 4.35), stoneTrimMat);
    corniceBar.position.set(0, 7.75, -0.15);
    this.bossGroup.add(corniceBar);

    // Dark Arched Iron Hangar Frame & Deep Factory Interior Backdrop
    this.bossPortalMat = createBossPortalShaderMaterial(theme.portalCoreColor, theme.portalRingColor);
    const portalBackdrop = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 5.2), this.bossPortalMat);
    portalBackdrop.position.set(0, 2.6, -0.85);
    this.bossGroup.add(portalBackdrop);

    const archHeader = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.55, 2.2), darkIronMat);
    archHeader.position.set(0, 5.05, 0.9);
    this.bossGroup.add(archHeader);

    // 2. Twin Tall Round Brick & Brass Factory Towers + Two Hanging Red Bunny-Blob Banners!
    for (const side of [-1, 1]) {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.35, 11.2, 16), this.bossArmorMat);
      tower.position.set(side * 6.8, 5.6, -1.6);
      tower.castShadow = true;
      this.bossGroup.add(tower);

      const towerBand = new THREE.Mesh(new THREE.CylinderGeometry(2.32, 2.32, 0.42, 16), brassMat);
      towerBand.position.set(side * 6.8, 9.6, -1.6);
      this.bossGroup.add(towerBand);

      const towerRoof = new THREE.Mesh(new THREE.ConeGeometry(2.45, 2.8, 16), this.bossSecondaryMat);
      towerRoof.position.set(side * 6.8, 12.6, -1.6);
      this.bossGroup.add(towerRoof);

      // Vertical Red Hanging Factory Banner with Cute White Bunny-Blob Emblem!
      const bx = side * 5.25;
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.3, 8), brassMat);
      rod.rotation.z = Math.PI / 2;
      rod.position.set(bx, 6.75, 1.82);
      this.bossGroup.add(rod);

      const bannerCloth = new THREE.Mesh(new THREE.BoxGeometry(1.85, 3.6, 0.08), bannerRedMat);
      bannerCloth.position.set(bx, 4.9, 1.82);
      this.bossGroup.add(bannerCloth);

      const bannerTip = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.95, 4), bannerRedMat);
      bannerTip.rotation.x = Math.PI;
      bannerTip.rotation.y = Math.PI * 0.25;
      bannerTip.scale.set(1.0, 1.0, 0.08);
      bannerTip.position.set(bx, 2.65, 1.82);
      this.bossGroup.add(bannerTip);

      // White Bunny-Blob Mascot Emblem on Banner
      const blobFace = new THREE.Mesh(new THREE.SphereGeometry(0.48, 12, 10), emblemWhiteMat);
      blobFace.scale.set(1.05, 0.92, 0.16);
      blobFace.position.set(bx, 4.72, 1.88);
      this.bossGroup.add(blobFace);

      for (const eSide of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.46, 8), emblemWhiteMat);
        ear.scale.set(1.0, 1.0, 0.25);
        ear.position.set(bx + eSide * 0.24, 5.22, 1.88);
        ear.rotation.z = -eSide * 0.16;
        this.bossGroup.add(ear);
      }
    }

    // 3. Giant Golden-Brass Cogwheel Crest above the Hangar Archway (with cute Droplet-Blob relief!)
    this.bossPortalRing = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, 0.45, 20), brassMat);
    this.bossPortalRing.rotation.x = Math.PI / 2;
    this.bossPortalRing.position.set(0, 8.2, 1.85);
    const toothCount = 10;
    for (let i = 0; i < toothCount; i++) {
      const ang = (i / toothCount) * Math.PI * 2;
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.46, 0.65), brassMat);
      tooth.position.set(Math.cos(ang) * 1.92, 0, Math.sin(ang) * 1.92);
      tooth.rotation.y = -ang;
      this.bossPortalRing.add(tooth);
    }
    const crestRecess = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.22, 0.48, 18), darkIronMat);
    this.bossPortalRing.add(crestRecess);
    const crestBlob = new THREE.Mesh(new THREE.SphereGeometry(0.76, 14, 12), brassMat);
    crestBlob.scale.set(1.05, 0.35, 0.92);
    crestBlob.position.set(0, 0.22, 0.08);
    this.bossPortalRing.add(crestBlob);
    const crestTip = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.55, 10), brassMat);
    crestTip.rotation.x = -Math.PI / 2;
    crestTip.position.set(0, 0.24, -0.62);
    this.bossPortalRing.add(crestTip);
    this.bossGroup.add(this.bossPortalRing);

    // 4. Colossal Wrench-Wielding Factory Boss Foreman standing inside the Hangar Archway!
    this.bossHead = new THREE.Group();
    this.bossHead.position.set(0, 2.75, 0.55);

    // Hulking Copper-Orange Riveted Boiler Torso & Brass Straps
    const bossTorso = new THREE.Mesh(new THREE.SphereGeometry(2.05, 18, 14), boilerOrangeMat);
    bossTorso.scale.set(1.18, 1.05, 0.92);
    bossTorso.position.set(0, -0.35, 0);
    bossTorso.castShadow = true;
    this.bossHead.add(bossTorso);

    const chestBelt = new THREE.Mesh(new THREE.CylinderGeometry(2.12, 2.16, 0.36, 18), brassMat);
    chestBelt.position.set(0, -0.55, 0);
    this.bossHead.add(chestBelt);

    // Red Steam Tank behind Boss Right Shoulder
    const backTank = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 2.2, 12), bannerRedMat);
    backTank.position.set(-1.55, 0.55, -0.55);
    this.bossHead.add(backTank);

    // Muscular Boiler Arms
    this.bossForearms = [];
    for (const side of [-1, 1]) {
      const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.88, 12, 10), boilerOrangeMat);
      shoulder.position.set(side * 2.15, 0.45, 0.25);
      this.bossHead.add(shoulder);

      const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 1.8, 10), darkIronMat);
      forearm.position.set(side * 2.25, -0.65, 0.75);
      forearm.rotation.z = side * 0.28;
      forearm.rotation.x = 0.42;
      this.bossHead.add(forearm);
      this.bossForearms.push(forearm);
    }

    // Dark-Iron Dome Helmet + Glowing Golden-Yellow Round Goggle Eyes!
    const domeHead = new THREE.Mesh(new THREE.SphereGeometry(1.15, 16, 14), darkIronMat);
    domeHead.position.set(0, 1.38, 0.35);
    this.bossHead.add(domeHead);

    const visorBand = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.18, 0.32, 16), brassMat);
    visorBand.position.set(0, 1.32, 0.36);
    this.bossHead.add(visorBand);

    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), this.bossEyeMat);
      eye.position.set(side * 0.42, 1.34, 1.44);
      this.bossHead.add(eye);
    }

    // Giant Silver-Steel C-Jaw Monkey Wrench held across Boss's Left Hand!
    const wrenchGroup = new THREE.Group();
    wrenchGroup.position.set(1.55, 0.15, 1.45);
    wrenchGroup.rotation.z = -0.58;
    const wrenchShaft = new THREE.Mesh(new THREE.BoxGeometry(0.46, 3.3, 0.24), steelWrenchMat);
    wrenchGroup.add(wrenchShaft);
    const wrenchHead = new THREE.Mesh(
      new THREE.TorusGeometry(0.68, 0.24, 8, 14, Math.PI * 1.4),
      steelWrenchMat
    );
    wrenchHead.position.set(0, 1.85, 0);
    wrenchHead.rotation.z = 0.65;
    wrenchGroup.add(wrenchHead);
    this.bossWrenchGroup = wrenchGroup;
    this.bossHead.add(wrenchGroup);

    this.bossGroup.add(this.bossHead);

    // Boss Forcefield Shield Dome (Active during Milestone Boss Shield Phases)
    const shieldGeo = new THREE.SphereGeometry(5.6, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.65);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.36,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.bossShieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    this.bossShieldMesh.position.set(0, 1.2, 2.2);
    this.bossShieldMesh.visible = false;
    this.bossGroup.add(this.bossShieldMesh);

    // Mega Boss Extra Brass Steam Chimneys & Golden Gear Halo (Stage 10/20/30...)
    for (const side of [-1, 1]) {
      const megaPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.72, 4.5, 12), brassMat);
      megaPipe.position.set(side * 4.2, 9.2, 0.4);
      megaPipe.rotation.z = -side * 0.22;
      this.megaBossCrownGroup.add(megaPipe);
    }
    const abyssHalo = new THREE.Mesh(
      new THREE.TorusGeometry(4.2, 0.22, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b })
    );
    abyssHalo.position.set(0, 9.2, -1.2);
    this.megaBossHalo = abyssHalo;
    this.megaBossCrownGroup.add(abyssHalo);
    this.megaBossCrownGroup.visible = false;
    this.bossGroup.add(this.megaBossCrownGroup);

    this.scene.add(this.bossGroup);

    // Pre-build 3 Boss Artillery Telegraph Warning Rings on the bridge deck
    const warnGeo = new THREE.RingGeometry(0.25, 1.0, 32);
    warnGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < 3; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xef4444,
        transparent: true,
        opacity: 0.78,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(warnGeo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.meteorTelegraphs.push({
        active: false,
        x: 0,
        z: 0,
        radius: 2.6,
        timer: 0,
        maxTimer: 2.0,
        isTurretLock: i === 0,
        mesh,
        mat,
      });
    }

    // MC-2: Dual Lateral Steam Shield Barrier Dome + Half-Bridge Steam Sweep Telegraph & Wave
    const barrierGeo = new THREE.SphereGeometry(4.35, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.56);
    this.bossSteamBarrierMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.34,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.bossSteamBarrierMesh = new THREE.Mesh(barrierGeo, this.bossSteamBarrierMat);
    this.bossSteamBarrierMesh.position.set(0, 0.15, BOSS_GATE_Z - 0.25);
    this.bossSteamBarrierMesh.visible = false;
    this.scene.add(this.bossSteamBarrierMesh);

    const laneW = TRACK_HALF_W - 0.9; // ~10.3m half-bridge lane
    const laneLen = PLAYER_Z - BOSS_GATE_Z - 4.4; // spans bridge deck cleanly
    const laneCenterZ = (BOSS_GATE_Z + 2.2 + (PLAYER_Z - 2.2)) * 0.5;

    const telegraphGroup = new THREE.Group();
    telegraphGroup.position.set(-5.35, 0.12, laneCenterZ);
    telegraphGroup.visible = false;

    const telegraphFillMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const fillGeo = new THREE.PlaneGeometry(laneW, laneLen);
    fillGeo.rotateX(-Math.PI / 2);
    telegraphGroup.add(new THREE.Mesh(fillGeo, telegraphFillMat));

    const telegraphBorderMat = new THREE.MeshBasicMaterial({
      color: 0xfb923c,
      transparent: true,
      opacity: 0.82,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const railGeo = new THREE.PlaneGeometry(0.28, laneLen);
    railGeo.rotateX(-Math.PI / 2);
    const railL = new THREE.Mesh(railGeo, telegraphBorderMat);
    railL.position.set(-laneW * 0.5, 0.02, 0);
    const railR = new THREE.Mesh(railGeo, telegraphBorderMat);
    railR.position.set(laneW * 0.5, 0.02, 0);
    telegraphGroup.add(railL, railR);

    const stripeGeo = new THREE.PlaneGeometry(laneW * 0.88, 0.55);
    stripeGeo.rotateX(-Math.PI / 2);
    for (let sIdx = 0; sIdx < 6; sIdx++) {
      const stMesh = new THREE.Mesh(stripeGeo, telegraphBorderMat);
      stMesh.position.set(0, 0.025, -laneLen * 0.4 + (sIdx * laneLen * 0.8) / 5);
      telegraphGroup.add(stMesh);
    }
    this.scene.add(telegraphGroup);

    const waveGroup = new THREE.Group();
    waveGroup.visible = false;
    const manifoldMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0xd97706,
        emissive: 0x7c2d12,
        emissiveIntensity: 0.35,
        roughness: 0.3,
        metalness: 0.55,
      }),
      0.8
    );
    const steamCloudMat = new THREE.MeshBasicMaterial({
      color: 0xfff7ed,
      transparent: true,
      opacity: 0.86,
      depthWrite: false,
    });
    const coreGlowMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });
    const pipeGeo = new THREE.CylinderGeometry(0.28, 0.28, laneW, 12);
    pipeGeo.rotateZ(Math.PI / 2);
    const pipeMesh = new THREE.Mesh(pipeGeo, manifoldMat);
    pipeMesh.position.y = 0.75;
    waveGroup.add(pipeMesh);

    const puffGeo = new THREE.SphereGeometry(0.95, 12, 10);
    for (let pIdx = 0; pIdx < 7; pIdx++) {
      const px = -laneW * 0.44 + (pIdx * laneW * 0.88) / 6;
      const puff = new THREE.Mesh(puffGeo, steamCloudMat);
      puff.position.set(px, 1.05 + (pIdx % 2) * 0.22, 0.35);
      puff.scale.set(1.15, 0.88, 0.95);
      waveGroup.add(puff);
      const glow = new THREE.Mesh(puffGeo, coreGlowMat);
      glow.position.set(px, 0.62, -0.1);
      glow.scale.set(0.75, 0.52, 0.65);
      waveGroup.add(glow);
    }
    this.scene.add(waveGroup);

    this.bossSteamSweep = {
      phase: 'idle',
      lane: 'left',
      timer: 0,
      maxTimer: 2.3,
      cooldown: 4.2,
      waveZ: BOSS_GATE_Z + 1.6,
      telegraphGroup,
      telegraphFillMat,
      telegraphBorderMat,
      waveGroup,
    };
  }

  public applyTheme(themeId: ThemeId): ThemeConfig {
    const theme = THEMES[themeId] || THEMES.wasteland;
    this.currentTheme = theme;
    this.state.activeSceneThemeId = theme.id;

    this.scene.background = new THREE.Color(theme.skyColor);
    this.scene.fog = new THREE.FogExp2(theme.fogColor, theme.fogDensity);

    this.hemiLight.color.setHex(theme.hemiSkyColor);
    this.hemiLight.groundColor.setHex(theme.hemiGroundColor);
    this.hemiLight.intensity = theme.hemiIntensity * 0.78;

    this.dirLight.color.setHex(theme.sunColor);
    this.dirLight.intensity = theme.sunIntensity * 0.82;

    this.rimLight.color.setHex(theme.rimLightColor);
    this.bossLight.color.setHex(theme.bossLightColor);

    if (this.roadMat.map) this.roadMat.map.dispose();
    if (this.roadMat.emissiveMap) this.roadMat.emissiveMap.dispose();
    this.roadMat.map = createThemedRoadTexture(theme);
    this.roadMat.emissiveMap = createThemedRoadEmissiveTexture(theme);
    this.roadMat.needsUpdate = true;

    if (this.abyssMat.map) this.abyssMat.map.dispose();
    this.abyssMat.map = createAbyssFloorTexture(theme);
    this.abyssMat.needsUpdate = true;

    if (this.abyssShaderMat?.uniforms) {
      this.abyssShaderMat.uniforms.uBaseColor.value.set(theme.abyssBaseHex);
      this.abyssShaderMat.uniforms.uVeinColor.value.set(theme.abyssVeinHex);
      this.abyssShaderMat.uniforms.uAccentColor.value.setHex(theme.portalRingColor);
    }
    if (this.bastionShieldMat?.uniforms) {
      this.bastionShieldMat.uniforms.uColor.value.setHex(theme.curbEmissive);
    }

    for (const rMat of this.godRayMats) {
      rMat.color.setHex(theme.sunColor);
    }

    this.curbMat.color.setHex(theme.curbColor);
    this.curbStripMat.color.setHex(theme.curbEmissive);

    this.cliffPrimaryMat.color.setHex(theme.cliffColor);
    this.cliffSecondaryMat.color.setHex(theme.cliffSecondaryColor);
    if (this.roofMat) this.roofMat.color.setHex(theme.roofColor);
    if (this.foliageMat) this.foliageMat.color.setHex(theme.foliageColor);
    if (this.trimMat) this.trimMat.color.setHex(theme.crystalColor);
    this.crystalMat.color.setHex(theme.crystalColor);
    this.crystalMat.emissive.setHex(theme.crystalEmissive);

    this.bossArmorMat.color.setHex(theme.bossArmorColor);
    this.bossSecondaryMat.color.setHex(theme.bossSecondaryColor);
    this.bossEyeMat.color.setHex(theme.bossEyeColor);
    if (this.bossPortalMat?.uniforms) {
      this.bossPortalMat.uniforms.uCoreColor.value.setHex(theme.portalCoreColor);
      this.bossPortalMat.uniforms.uRingColor.value.setHex(theme.portalRingColor);
    }

    this.rebuildThemeLandmarks(theme);

    return theme;
  }

  /**
   * Rebuilds the flanking 3D background town/world architecture (`this.themeLandmarkGroup`)
   * with unmistakable 3D silhouette landmarks tailored to each of the 8 scenes!
   */
  private rebuildThemeLandmarks(theme: ThemeConfig): void {
    this.themeSpinners = [];
    while (this.themeLandmarkGroup.children.length > 0) {
      const child = this.themeLandmarkGroup.children.pop()!;
      child.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          (obj as THREE.Mesh).geometry?.dispose();
        }
      });
    }

    const spots = [
      { x: -17.2, y: 0.5, z: -13.5, w: 6.2, h: 9.8, d: 6.4, idx: 0 },
      { x: 17.2, y: 0.5, z: -13.5, w: 6.2, h: 9.8, d: 6.4, idx: 1 },
      { x: -18.0, y: -0.4, z: -3.2, w: 6.4, h: 8.2, d: 6.4, idx: 2 },
      { x: 18.0, y: -0.4, z: -3.2, w: 6.4, h: 8.2, d: 6.4, idx: 3 },
      { x: -17.6, y: -1.0, z: 7.4, w: 6.0, h: 7.4, d: 6.0, idx: 4 },
      { x: 17.6, y: -1.0, z: 7.4, w: 6.0, h: 7.4, d: 6.0, idx: 5 },
      { x: -22.5, y: 2.2, z: -22.5, w: 7.8, h: 14.0, d: 7.4, idx: 6 },
      { x: 22.5, y: 2.2, z: -22.5, w: 7.8, h: 14.0, d: 7.4, idx: 7 },
    ];

    if (!this.creamWallSharedMat) {
      this.creamWallSharedMat = stylizeMaterialAs2DIllustration(
        new THREE.MeshStandardMaterial({ color: 0xfff8f0, roughness: 0.55, metalness: 0.04 })
      );
    }
    const whiteCreamMat = this.creamWallSharedMat;

    for (const fb of spots) {
      const bGroup = new THREE.Group();
      bGroup.position.set(fb.x, fb.y - fb.h * 0.35, fb.z);
      const sideSign = fb.x < 0 ? 1 : -1;
      const isHeroSpot = fb.idx === 2 || fb.idx === 3 || fb.idx >= 6;

      if (theme.id === 'sakura') {
        // 🌸 SAKURA SHRINE TOWN: Multi-tiered Japanese Pagodas, Vermilion Torii Gates & Giant Pink Sakura Blossom Trees!
        const baseHall = new THREE.Mesh(new THREE.BoxGeometry(fb.w, fb.h * 0.72, fb.d), whiteCreamMat);
        baseHall.position.y = fb.h * 0.36;
        bGroup.add(baseHall);

        // Vermilion timber pillars & beams
        const pillarBeam = new THREE.Mesh(
          new THREE.BoxGeometry(fb.w + 0.3, 0.55, fb.d + 0.3),
          this.cliffPrimaryMat
        );
        pillarBeam.position.y = fb.h * 0.72;
        bGroup.add(pillarBeam);

        // 3 Tiered Pagoda Eaves
        for (let tier = 0; tier < 3; tier++) {
          const scale = 1.18 - tier * 0.24;
          const tierY = fb.h * 0.76 + tier * 2.15;
          const eave = new THREE.Mesh(
            new THREE.ConeGeometry(fb.w * 0.72 * scale, 1.35, 4),
            this.roofMat
          );
          eave.rotation.y = Math.PI * 0.25;
          eave.position.y = tierY;
          bGroup.add(eave);

          if (tier < 2) {
            const core = new THREE.Mesh(
              new THREE.BoxGeometry(fb.w * 0.58 * scale, 1.35, fb.d * 0.58 * scale),
              this.cliffPrimaryMat
            );
            core.position.y = tierY + 0.95;
            bGroup.add(core);
          }
        }

        // Giant Fluffy Pink Sakura Tree beside the pagoda
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.42, 0.65, 3.8, 7),
          this.cliffSecondaryMat
        );
        trunk.position.set(sideSign * (fb.w * 0.35), fb.h * 0.72 + 1.5, 1.2);
        bGroup.add(trunk);

        for (const [ox, oy, oz, r] of [
          [0, 3.6, 0, 2.3],
          [-1.3, 2.9, 0.6, 1.75],
          [1.3, 3.0, -0.5, 1.8],
          [0.3, 4.4, 0.4, 1.65],
        ] as const) {
          const blossom = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), this.foliageMat);
          blossom.position.set(sideSign * (fb.w * 0.35) + ox, fb.h * 0.72 + oy, 1.2 + oz);
          bGroup.add(blossom);
        }
      } else if (theme.id === 'glacier') {
        // 🍧 MINT ICE-CREAM GLACIER PORT: Giant Cute 3D Snowmen, Snow Igloos & Glowing Cyan Ice Crystal Spires!
        const icePedestal = new THREE.Mesh(
          new THREE.CylinderGeometry(fb.w * 0.56, fb.w * 0.64, fb.h * 0.75, 10),
          this.cliffPrimaryMat
        );
        icePedestal.position.y = fb.h * 0.375;
        bGroup.add(icePedestal);

        if (isHeroSpot) {
          // Giant Cute 3D Snowman with Top Hat & Carrot Nose facing the bridge!
          const belly = new THREE.Mesh(new THREE.SphereGeometry(fb.w * 0.44, 14, 12), this.roofMat);
          belly.position.y = fb.h * 0.75 + fb.w * 0.34;
          bGroup.add(belly);

          const head = new THREE.Mesh(new THREE.SphereGeometry(fb.w * 0.31, 14, 12), this.roofMat);
          const headY = fb.h * 0.75 + fb.w * 0.88;
          head.position.y = headY;
          bGroup.add(head);

          // Red-berry scarf & top hat
          const scarf = new THREE.Mesh(
            new THREE.TorusGeometry(fb.w * 0.26, 0.32, 8, 16),
            this.cliffSecondaryMat
          );
          scarf.rotation.x = Math.PI * 0.5;
          scarf.position.y = fb.h * 0.75 + fb.w * 0.64;
          bGroup.add(scarf);

          const hatBrim = new THREE.Mesh(
            new THREE.CylinderGeometry(fb.w * 0.32, fb.w * 0.32, 0.25, 12),
            this.ironSharedMat
          );
          hatBrim.position.y = headY + fb.w * 0.25;
          bGroup.add(hatBrim);

          const hatTop = new THREE.Mesh(
            new THREE.CylinderGeometry(fb.w * 0.22, fb.w * 0.2, 1.6, 12),
            this.ironSharedMat
          );
          hatTop.position.y = headY + fb.w * 0.25 + 0.85;
          bGroup.add(hatTop);
        } else {
          // Towering Translucent Ice Crystal Cluster + Mint Ice-Cream Cone Spire
          for (const [ox, oz, ch, cr, tilt] of [
            [0, 0, 5.8, 1.35, 0],
            [-1.4, 0.9, 4.2, 0.95, 0.24],
            [1.4, -0.8, 4.5, 1.0, -0.22],
          ] as const) {
            const crystal = new THREE.Mesh(new THREE.ConeGeometry(cr, ch, 6), this.foliageMat);
            crystal.position.set(ox, fb.h * 0.75 + ch * 0.45, oz);
            crystal.rotation.z = tilt;
            bGroup.add(crystal);
          }
        }
      } else if (theme.id === 'magma') {
        // 🥐 PATISSERIE BAKERY: Giant Swirled Whipped-Cream Cupcakes with Red Cherries & Spinning Candy Lollipops!
        const cupBase = new THREE.Mesh(
          new THREE.CylinderGeometry(fb.w * 0.54, fb.w * 0.4, fb.h * 0.78, 12),
          this.cliffPrimaryMat
        );
        cupBase.position.y = fb.h * 0.39;
        bGroup.add(cupBase);

        // Tiered Strawberry & Vanilla Whipped-Cream Frosting Swirls
        const frost1 = new THREE.Mesh(new THREE.SphereGeometry(fb.w * 0.5, 14, 10), this.roofMat);
        frost1.scale.set(1, 0.62, 1);
        frost1.position.y = fb.h * 0.82;
        bGroup.add(frost1);

        const frost2 = new THREE.Mesh(new THREE.SphereGeometry(fb.w * 0.36, 14, 10), whiteCreamMat);
        frost2.scale.set(1, 0.68, 1);
        frost2.position.y = fb.h * 0.82 + 1.45;
        bGroup.add(frost2);

        // Giant Glossy Cherry on top!
        const cherry = new THREE.Mesh(new THREE.SphereGeometry(0.95, 12, 10), this.roofMat);
        cherry.position.y = fb.h * 0.82 + 2.85;
        bGroup.add(cherry);

        // Spinning Giant Candy Lollipop Wheel on the side
        const lolliStick = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.18, 4.2, 8),
          whiteCreamMat
        );
        lolliStick.position.set(sideSign * (fb.w * 0.38), fb.h + 1.6, 1.2);
        bGroup.add(lolliStick);

        const lolliHead = new THREE.Group();
        lolliHead.position.set(sideSign * (fb.w * 0.38), fb.h + 3.8, 1.2);
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.65, 0.42, 16), this.roofMat);
        disc.rotation.z = Math.PI * 0.5;
        lolliHead.add(disc);
        const innerRing = new THREE.Mesh(
          new THREE.TorusGeometry(0.95, 0.24, 8, 16),
          whiteCreamMat
        );
        innerRing.rotation.y = Math.PI * 0.5;
        lolliHead.add(innerRing);
        bGroup.add(lolliHead);
        this.themeSpinners.push(lolliHead);
      } else if (theme.id === 'cyberhive') {
        // 🎡 STARLIGHT CARNIVAL AMUSEMENT PARK: Giant Rotating 3D Ferris Wheels & Striped Circus Big-Top Tents!
        const pavilion = new THREE.Mesh(new THREE.CylinderGeometry(fb.w * 0.52, fb.w * 0.56, fb.h * 0.72, 12), this.cliffPrimaryMat);
        pavilion.position.y = fb.h * 0.36;
        bGroup.add(pavilion);

        // Conical Circus Big-Top Tent Roof with Golden Finial
        const tentRoof = new THREE.Mesh(new THREE.ConeGeometry(fb.w * 0.68, 3.4, 12), this.roofMat);
        tentRoof.position.y = fb.h * 0.72 + 1.65;
        bGroup.add(tentRoof);

        if (isHeroSpot) {
          // Giant Rotating 3D Ferris Wheel rising above the carnival tent!
          const wheelRadius = 4.2;
          const wheelCenterY = fb.h + 3.8;
          for (const legZ of [-1.2, 1.2]) {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.35, 6.2, 8), this.trimMat);
            leg.position.set(0, wheelCenterY - 2.6, legZ);
            leg.rotation.x = legZ > 0 ? -0.22 : 0.22;
            bGroup.add(leg);
          }

          const wheelSpinner = new THREE.Group();
          wheelSpinner.position.set(0, wheelCenterY, 0);
          wheelSpinner.rotation.y = Math.PI * 0.5;

          const rim = new THREE.Mesh(new THREE.TorusGeometry(wheelRadius, 0.26, 8, 20), this.trimMat);
          wheelSpinner.add(rim);

          const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.6, 12), this.roofMat);
          hub.rotation.x = Math.PI * 0.5;
          wheelSpinner.add(hub);

          for (let k = 0; k < 8; k++) {
            const ang = (k / 8) * Math.PI * 2;
            const gondola = new THREE.Mesh(
              new THREE.SphereGeometry(0.62, 10, 8),
              k % 2 === 0 ? this.roofMat : this.foliageMat
            );
            gondola.position.set(Math.cos(ang) * wheelRadius, Math.sin(ang) * wheelRadius, 0);
            wheelSpinner.add(gondola);
          }
          bGroup.add(wheelSpinner);
          this.themeSpinners.push(wheelSpinner);
        }
      } else if (theme.id === 'emerald') {
        // 🌲 ELVEN WINDMILL VALLEY: Giant Red Polka-Dot Fairy-Tale Mushroom Houses & Rotating Wooden Windmills!
        const stalk = new THREE.Mesh(
          new THREE.CylinderGeometry(fb.w * 0.36, fb.w * 0.46, fb.h * 0.78, 12),
          whiteCreamMat
        );
        stalk.position.y = fb.h * 0.39;
        bGroup.add(stalk);

        // Giant Red Mushroom Umbrella Cap with White Polka-Dot Spots!
        const cap = new THREE.Mesh(
          new THREE.SphereGeometry(fb.w * 0.64, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
          this.roofMat
        );
        cap.position.y = fb.h * 0.74;
        bGroup.add(cap);

        for (const [sx, sy, sz, sr] of [
          [0, fb.w * 0.58, 0, 0.75],
          [1.6, fb.w * 0.38, 1.2, 0.62],
          [-1.6, fb.w * 0.38, -1.1, 0.62],
          [1.2, fb.w * 0.42, -1.5, 0.58],
          [-1.3, fb.w * 0.4, 1.4, 0.58],
        ] as const) {
          const spot = new THREE.Mesh(new THREE.SphereGeometry(sr, 10, 8), whiteCreamMat);
          spot.position.set(sx, fb.h * 0.74 + sy, sz);
          bGroup.add(spot);
        }

        // Lush Layered Emerald Pine Tree + Spinning Elven Windmill Blades
        if (isHeroSpot) {
          const sailGroup = new THREE.Group();
          sailGroup.position.set(sideSign * (fb.w * 0.46), fb.h * 0.62, 0);
          sailGroup.rotation.y = sideSign * Math.PI * 0.5;
          for (let b = 0; b < 4; b++) {
            const blade = new THREE.Mesh(new THREE.BoxGeometry(0.75, 3.6, 0.14), this.trimMat);
            blade.rotation.z = (b * Math.PI) / 2;
            sailGroup.add(blade);
          }
          bGroup.add(sailGroup);
          this.themeSpinners.push(sailGroup);
        }
      } else if (theme.id === 'ocean') {
        // 🐳 BUBBLE ATLANTIS BAY: Striped Coastal Lighthouses, Giant Coral Spires & Floating Jellyfish Domes!
        const reefBase = new THREE.Mesh(new THREE.CylinderGeometry(fb.w * 0.48, fb.w * 0.58, fb.h * 0.68, 12), this.cliffPrimaryMat);
        reefBase.position.y = fb.h * 0.34;
        bGroup.add(reefBase);

        // Red-and-White Striped Coastal Lighthouse Tower
        for (let s = 0; s < 4; s++) {
          const band = new THREE.Mesh(
            new THREE.CylinderGeometry(1.55 - s * 0.14, 1.68 - s * 0.14, 1.45, 12),
            s % 2 === 0 ? whiteCreamMat : this.roofMat
          );
          band.position.y = fb.h * 0.68 + 0.72 + s * 1.42;
          bGroup.add(band);
        }

        const lantern = new THREE.Mesh(
          new THREE.CylinderGeometry(1.05, 1.05, 1.2, 10),
          this.windowGlowSharedMat
        );
        lantern.position.y = fb.h * 0.68 + 6.3;
        bGroup.add(lantern);

        const dome = new THREE.Mesh(new THREE.ConeGeometry(1.35, 1.4, 10), this.roofMat);
        dome.position.y = fb.h * 0.68 + 7.5;
        bGroup.add(dome);

        // Giant Turquoise & Coral Reef Branches beside the lighthouse
        for (const [cx, cz, ch] of [
          [-1.8, 1.4, 3.8],
          [1.8, -1.2, 3.4],
        ] as const) {
          const coral = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.62, ch, 8), this.foliageMat);
          coral.position.set(cx, fb.h * 0.68 + ch * 0.45, cz);
          coral.rotation.z = cx > 0 ? -0.28 : 0.28;
          bGroup.add(coral);
        }
      } else if (theme.id === 'royal') {
        // 🏰 ROYAL TOY-BLOCK CASTLE: Sapphire & Ivory Battlement Keep, Twin Crenellated Turrets & Crimson Cones!
        const keep = new THREE.Mesh(new THREE.BoxGeometry(fb.w, fb.h * 0.82, fb.d), this.cliffPrimaryMat);
        keep.position.y = fb.h * 0.41;
        bGroup.add(keep);

        const battlement = new THREE.Mesh(
          new THREE.BoxGeometry(fb.w + 0.6, 0.75, fb.d + 0.6),
          this.curbMat
        );
        battlement.position.y = fb.h * 0.82 + 0.2;
        bGroup.add(battlement);

        // Twin cylindrical corner watchtowers with tall Crimson Conical Castle Roofs & Gold Pennants!
        for (const tz of [-fb.d * 0.34, fb.d * 0.34]) {
          const tower = new THREE.Mesh(
            new THREE.CylinderGeometry(1.45, 1.55, 4.8, 12),
            whiteCreamMat
          );
          tower.position.set(sideSign * (fb.w * 0.28), fb.h * 0.82 + 2.2, tz);
          bGroup.add(tower);

          const cone = new THREE.Mesh(new THREE.ConeGeometry(1.95, 3.2, 12), this.roofMat);
          cone.position.set(sideSign * (fb.w * 0.28), fb.h * 0.82 + 6.0, tz);
          bGroup.add(cone);

          const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.8, 6), this.trimMat);
          flagPole.position.set(sideSign * (fb.w * 0.28), fb.h * 0.82 + 8.1, tz);
          bGroup.add(flagPole);
        }
      } else {
        // 🏭 WASTELAND STEAMPUNK GEAR CITY: Red-Brick Halls, Copper Domes, Smokestacks & Rotating Brass Windmills!
        const hall = new THREE.Mesh(new THREE.BoxGeometry(fb.w, fb.h, fb.d), this.cliffPrimaryMat);
        hall.position.y = fb.h * 0.5;
        hall.castShadow = true;
        hall.receiveShadow = true;
        bGroup.add(hall);

        const cornice = new THREE.Mesh(new THREE.BoxGeometry(fb.w + 0.45, 0.48, fb.d + 0.45), this.curbMat);
        cornice.position.y = fb.h + 0.15;
        bGroup.add(cornice);

        if (fb.idx % 2 === 0) {
          const dome = new THREE.Mesh(
            new THREE.SphereGeometry(fb.w * 0.44, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
            this.roofMat
          );
          dome.position.y = fb.h + 0.32;
          bGroup.add(dome);
        } else {
          const roof = new THREE.Mesh(new THREE.ConeGeometry(fb.w * 0.66, 2.6, 4), this.roofMat);
          roof.rotation.y = Math.PI * 0.25;
          roof.position.y = fb.h + 1.55;
          bGroup.add(roof);
        }

        const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.78, 4.6, 10), this.cliffSecondaryMat);
        chimney.position.set(-sideSign * (fb.w * 0.26), fb.h + 2.1, -0.8);
        bGroup.add(chimney);

        if (isHeroSpot) {
          // Rotating 4-Blade Brass Steampunk Windmill on the factory facade!
          const rotor = new THREE.Group();
          rotor.position.set(sideSign * (fb.w * 0.5 + 0.25), fb.h * 0.82, 0);
          rotor.rotation.y = sideSign * Math.PI * 0.5;
          const gearRing = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.22, 8, 14), this.trimMat);
          rotor.add(gearRing);
          for (let b = 0; b < 4; b++) {
            const vane = new THREE.Mesh(new THREE.BoxGeometry(0.65, 3.8, 0.14), this.trimMat);
            vane.rotation.z = (b * Math.PI) / 2;
            rotor.add(vane);
          }
          bGroup.add(rotor);
          this.themeSpinners.push(rotor);
        }
      }

      // Warm Glowing Arched Windows facing the bridge on all buildings
      for (const wz of [-1.35, 1.35]) {
        const winFrame = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.45, 1.15), this.ironSharedMat);
        winFrame.position.set(sideSign * (fb.w * 0.5 + 0.04), fb.h * 0.52, wz);
        bGroup.add(winFrame);

        const winPane = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.18, 0.88), this.windowGlowSharedMat);
        winPane.position.set(sideSign * (fb.w * 0.5 + 0.06), fb.h * 0.52, wz);
        bGroup.add(winPane);
      }

      this.themeLandmarkGroup.add(bGroup);
    }
  }

  public cycleTheme(): ThemeConfig {
    const curIdx = THEME_ORDER.indexOf(this.currentTheme.id);
    const nextId = THEME_ORDER[(curIdx + 1) % THEME_ORDER.length];
    return this.applyTheme(nextId);
  }

  private buildInstancedMeshes(): void {
    const initialSkin = this.state.getEquippedSkin();
    const initialRaceId = this.state.getActiveRaceBranch().id;

    // 1. Glossy Candy-Jelly Playable Race Bubble Troopers (7 Distinct Cute Race 3D Geometries + Per-Instance Candy Tinting!)
    const blueMarineGeo = buildBlueMarineGeometry(initialSkin.palette, initialRaceId);
    this.blueAnimAttr = new THREE.InstancedBufferAttribute(this.blueAnimData, 4);
    this.blueAnimAttr.setUsage(THREE.DynamicDrawUsage);
    blueMarineGeo.setAttribute('aAnim', this.blueAnimAttr);

    this.blueMarineMat = createAnimatedHumanoidMaterial({
      roughness: 0.16,
      metalness: 0.04,
      emissive: 0x0e2235,
      emissiveIntensity: 0.05,
      shoulderY: 0.42,
      hipY: 0.14,
      rimColor: 0xffffff,
      usePhysicalClearcoat: !this.isMobileDevice,
    });

    this.blueBodyInst = new THREE.InstancedMesh(blueMarineGeo, this.blueMarineMat, MAX_UNITS);
    this.blueBodyInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.blueBodyInst.castShadow = false;
    this.blueBodyInst.receiveShadow = false;
    this.scene.add(this.blueBodyInst);

    // 2. Crowned Idol Bubble King Leader Models (7 Distinct Playable Race Leader 3D Geometries!)
    const champGeo = buildChampionMechaGeometry(initialSkin.palette, initialRaceId);
    this.champAnimAttr = new THREE.InstancedBufferAttribute(this.champAnimData, 4);
    this.champAnimAttr.setUsage(THREE.DynamicDrawUsage);
    champGeo.setAttribute('aAnim', this.champAnimAttr);

    this.champMat = createAnimatedHumanoidMaterial({
      roughness: 0.18,
      metalness: 0.14,
      emissive: initialSkin.palette.emissive,
      emissiveIntensity: 0.08,
      shoulderY: 0.92,
      hipY: 0.24,
      rimColor: 0xfff3b0,
      usePhysicalClearcoat: !this.isMobileDevice,
    });
    this.championInst = new THREE.InstancedMesh(champGeo, this.champMat, 120);
    this.championInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.championInst.castShadow = false;
    this.championInst.receiveShadow = false;
    this.scene.add(this.championInst);
    this.applySkin(initialSkin);

    // 3. Steampunk Factory Capture-Squad Goons (Pot Helmet + Goggles + Brick-Red Coat + White Bubble-Catcher Net!)
    const redMutantGeo = buildRedMutantGeometry();
    this.redAnimAttr = new THREE.InstancedBufferAttribute(this.redAnimData, 4);
    this.redAnimAttr.setUsage(THREE.DynamicDrawUsage);
    redMutantGeo.setAttribute('aAnim', this.redAnimAttr);

    const redMutantMat = createAnimatedHumanoidMaterial({
      roughness: 0.44,
      metalness: 0.16,
      emissive: 0x1e0b0a,
      emissiveIntensity: 0.05,
      shoulderY: 0.58,
      hipY: 0.28,
      rimColor: 0xffd6b0,
    });

    this.redBodyInst = new THREE.InstancedMesh(redMutantGeo, redMutantMat, MAX_UNITS);
    this.redBodyInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.redBodyInst.castShadow = false;
    this.redBodyInst.receiveShadow = false;
    this.scene.add(this.redBodyInst);

    // 4. Hulking Copper-Orange Boiler-Suit Factory Foremen with Giant Monkey Wrench!
    const bruteGeo = buildBruteGeometry();
    this.bruteAnimAttr = new THREE.InstancedBufferAttribute(this.bruteAnimData, 4);
    this.bruteAnimAttr.setUsage(THREE.DynamicDrawUsage);
    bruteGeo.setAttribute('aAnim', this.bruteAnimAttr);

    const bruteMat = createAnimatedHumanoidMaterial({
      roughness: 0.36,
      metalness: 0.26,
      emissive: 0x261008,
      emissiveIntensity: 0.06,
      shoulderY: 1.18,
      hipY: 0.5,
      rimColor: 0xffc078,
    });
    this.bruteInst = new THREE.InstancedMesh(bruteGeo, bruteMat, 120);
    this.bruteInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.bruteInst.castShadow = false;
    this.bruteInst.receiveShadow = false;
    this.scene.add(this.bruteInst);

    // 5. Wind-Up Copper Pressure-Boiler Bomb Bots!
    const banelingGeo = buildBanelingGeometry();
    this.banelingAnimAttr = new THREE.InstancedBufferAttribute(this.banelingAnimData, 4);
    this.banelingAnimAttr.setUsage(THREE.DynamicDrawUsage);
    banelingGeo.setAttribute('aAnim', this.banelingAnimAttr);

    const banelingMat = createAnimatedHumanoidMaterial({
      roughness: 0.3,
      metalness: 0.34,
      emissive: 0x3b1208,
      emissiveIntensity: 0.12,
      shoulderY: 0.52,
      hipY: 0.24,
      rimColor: 0xffb36b,
    });
    this.banelingInst = new THREE.InstancedMesh(banelingGeo, banelingMat, 180);
    this.banelingInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.banelingInst.castShadow = false;
    this.banelingInst.receiveShadow = false;
    this.scene.add(this.banelingInst);

    // 6. Steampunk Top-Hat Factory Supervisors with Brass Megaphone Staff!
    const shamanGeo = buildShamanGeometry();
    this.shamanAnimAttr = new THREE.InstancedBufferAttribute(this.shamanAnimData, 4);
    this.shamanAnimAttr.setUsage(THREE.DynamicDrawUsage);
    shamanGeo.setAttribute('aAnim', this.shamanAnimAttr);

    const shamanMat = createAnimatedHumanoidMaterial({
      roughness: 0.38,
      metalness: 0.26,
      emissive: 0x241038,
      emissiveIntensity: 0.08,
      shoulderY: 0.82,
      hipY: 0.38,
      rimColor: 0xf5d0fe,
    });
    this.shamanInst = new THREE.InstancedMesh(shamanGeo, shamanMat, 120);
    this.shamanInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.shamanInst.castShadow = false;
    this.shamanInst.receiveShadow = false;
    this.scene.add(this.shamanInst);

    // 6.5 Instanced 2D Soft Dark-Brown Oval Ground Contact Shadows under every unit!
    const shadowGeo = new THREE.PlaneGeometry(1.0, 1.0);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: create2DBlobShadowTexture(),
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
    });
    this.unitShadowInst = new THREE.InstancedMesh(shadowGeo, shadowMat, MAX_UNITS);
    this.unitShadowInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.unitShadowInst);

    // 6b. MC-1 Crystalline Frosting Shield Rings around Protected Units
    const frostGeo = new THREE.TorusGeometry(0.46, 0.075, 10, 20);
    frostGeo.rotateX(Math.PI / 2);
    const frostMat = new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.55,
      roughness: 0.16,
      metalness: 0.22,
      transparent: true,
      opacity: 0.86,
      depthWrite: false,
    });
    this.frostShieldInst = new THREE.InstancedMesh(frostGeo, frostMat, MAX_UNITS);
    this.frostShieldInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.frostShieldInst.count = 0;
    this.scene.add(this.frostShieldInst);

    // 6c. MC-8 Bobo 3-Branch Specialization 3D Toy-Craft Visual Flairs
    const vanguardWingGeo = new THREE.ConeGeometry(0.24, 0.56, 4);
    vanguardWingGeo.rotateX(Math.PI / 2);
    const vanguardWingMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.65,
      roughness: 0.18,
      metalness: 0.35,
    });
    this.techVanguardFlairInst = new THREE.InstancedMesh(vanguardWingGeo, vanguardWingMat, MAX_UNITS);
    this.techVanguardFlairInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.techVanguardFlairInst.count = 0;
    this.scene.add(this.techVanguardFlairInst);

    const siegeCogGeo = new THREE.TorusGeometry(0.38, 0.078, 8, 10);
    siegeCogGeo.rotateX(Math.PI / 2);
    const siegeCogMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 0.55,
      roughness: 0.22,
      metalness: 0.68,
    });
    this.techSiegeFlairInst = new THREE.InstancedMesh(siegeCogGeo, siegeCogMat, MAX_UNITS);
    this.techSiegeFlairInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.techSiegeFlairInst.count = 0;
    this.scene.add(this.techSiegeFlairInst);

    const candyCrownGeo = new THREE.DodecahedronGeometry(0.19, 0);
    const candyCrownMat = new THREE.MeshStandardMaterial({
      color: 0xf472b6,
      emissive: 0xdb2777,
      emissiveIntensity: 0.62,
      roughness: 0.14,
      metalness: 0.16,
    });
    this.techCandyFlairInst = new THREE.InstancedMesh(candyCrownGeo, candyCrownMat, MAX_UNITS);
    this.techCandyFlairInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.techCandyFlairInst.count = 0;
    this.scene.add(this.techCandyFlairInst);

    // 7. Crisp Sunlit 3D Particles (NormalBlending so white steam, golden sparks & jelly splashes stay vivid in daylight!)
    this.fxFlashEl = document.getElementById('fx-flash');
    const partGeo = new THREE.SphereGeometry(0.2, 8, 6);
    const partMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    this.particleInst = new THREE.InstancedMesh(partGeo, partMat, MAX_PARTICLES);
    this.particleInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.particleInst);

    // 8. 3D Expanding Shockwave Rings
    const ringGeo = new THREE.RingGeometry(0.62, 1.0, 32);
    ringGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < MAX_SHOCKWAVES; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x28c7fa,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(ringGeo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.shockwaves.push({
        active: false,
        mesh,
        mat,
        life: 0,
        maxLife: 0.4,
        maxRadius: 2.5,
      });
    }

    // 9. 3D Vertical Sky Light Pillars
    const pillarGeo = new THREE.CylinderGeometry(1.0, 1.0, 28, 16, 1, true);
    pillarGeo.translate(0, 14, 0);
    for (let i = 0; i < MAX_SKY_PILLARS; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x28c7fa,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(pillarGeo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.skyPillars.push({
        active: false,
        mesh,
        mat,
        life: 0,
        maxLife: 0.45,
        maxRadius: 1.8,
      });
    }
  }

  public applySkin(skin: SkinSpec, finishOverride?: SquadFinishSpec): void {
    const p = skin.palette;
    const finish = finishOverride || this.state.getEquippedFinish();

    if (skin.id === 'azure') {
      this.skinCandyTints[0].copy(this.candySkyBlue);
      this.skinCandyTints[1].copy(this.candyAppleGreen);
      this.skinCandyTints[2].copy(this.candyCoralPink);
    } else {
      this.skinCandyTints[0].setHex(p.primary);
      this.skinCandyTints[1].setHex(p.accent);
      this.skinCandyTints[2].setHex(p.glow);
    }

    if (this.turretMuzzleLight) {
      this.turretMuzzleLight.color.setHex(p.glow);
    }

    // Apply Squad Paint + Surface Finish to 3D Player Steam Cannon
    const skinPrimaryCol = new THREE.Color(p.primary);
    const cannonCol = new THREE.Color(finish.cannonBarrelHex).lerp(
      skinPrimaryCol,
      skin.id === 'azure' && finish.id === 'candy_gloss' ? 0.12 : 0.34
    );
    if (this.turretBarrelMat) {
      this.turretBarrelMat.color.copy(cannonCol);
      this.turretBarrelMat.metalness = finish.cannonMetalness;
      this.turretBarrelMat.roughness = finish.cannonRoughness;
    }
    if (this.turretBrassMat) {
      this.turretBrassMat.color.setHex(finish.cannonTrimHex);
      this.turretBrassMat.metalness = Math.min(0.88, finish.cannonMetalness + 0.16);
      this.turretBrassMat.roughness = Math.max(0.08, finish.cannonRoughness * 0.85);
    }

    // Apply Surface Finish Shader Uniforms & PBR Params to 3D Bobo Units & Champion Leaders
    for (const unitMat of [this.blueMarineMat, this.champMat]) {
      if (!unitMat) continue;
      unitMat.roughness = finish.unitRoughness;
      unitMat.metalness = finish.unitMetalness;
      unitMat.emissiveIntensity = finish.unitEmissiveIntensity;
      const fu = unitMat.userData?.finishUniforms as
        | {
            uFinishMode: { value: number };
            uFinishRimColor: { value: THREE.Color };
            uFinishSpecBoost: { value: number };
          }
        | undefined;
      if (fu) {
        fu.uFinishMode.value = finish.modeIndex;
        fu.uFinishRimColor.value.setHex(finish.rimHex);
        fu.uFinishSpecBoost.value = finish.specBoost;
      }
    }

    if (this.blueBodyInst) {
      const oldGeo = this.blueBodyInst.geometry;
      const activeRaceId = this.state.getActiveRaceBranch().id;
      const newGeo = buildBlueMarineGeometry(p, activeRaceId);
      newGeo.setAttribute('aAnim', this.blueAnimAttr);
      this.blueBodyInst.geometry = newGeo;
      oldGeo.dispose();
    }

    if (this.championInst) {
      const oldChampGeo = this.championInst.geometry;
      const activeRaceId = this.state.getActiveRaceBranch().id;
      const newChampGeo = buildChampionMechaGeometry(p, activeRaceId);
      newChampGeo.setAttribute('aAnim', this.champAnimAttr);
      this.championInst.geometry = newChampGeo;
      oldChampGeo.dispose();
    }
    if (this.champMat) {
      this.champMat.emissive.setHex(p.emissive);
    }

    // Apply Squad Paint + Surface Finish to 3D Steam Armored Payload Cart (if present)
    const cartCol = new THREE.Color(finish.cartArmorHex).lerp(skinPrimaryCol, 0.36);
    if (this.payloadCart) {
      this.payloadCart.armorMat.color.copy(cartCol);
      this.payloadCart.armorMat.metalness = finish.cannonMetalness;
      this.payloadCart.armorMat.roughness = finish.cannonRoughness;
      this.payloadCart.trimMat.color.setHex(finish.cartTrimHex);
    }
    if (this.mechaOverlord) {
      this.mechaOverlord.armorMat.color.copy(cartCol);
      this.mechaOverlord.armorMat.metalness = finish.cannonMetalness;
      this.mechaOverlord.armorMat.roughness = finish.cannonRoughness;
      this.mechaOverlord.trimMat.color.setHex(finish.cartTrimHex);
    }

    this.appliedLiverySnapshot = {
      skinId: skin.id,
      finishId: finish.id,
      unitFinishMode: finish.modeIndex,
      unitRoughness: finish.unitRoughness,
      unitMetalness: finish.unitMetalness,
      cannonBarrelHex: cannonCol.getHexString(),
      cannonMetalness: finish.cannonMetalness,
      cartArmorHex: cartCol.getHexString(),
    };
  }

  public getAppliedLiverySnapshot(): {
    skinId: string;
    finishId: string;
    unitFinishMode: number;
    unitRoughness: number;
    unitMetalness: number;
    cannonBarrelHex: string;
    cannonMetalness: number;
    cartArmorHex: string;
  } {
    return { ...this.appliedLiverySnapshot };
  }

  public loadLevel(level: LevelConfig): void {
    this.currentLevel = level;
    this.applyTheme(level.themeId);
    this.sceneEffectTimer = 4.5;
    this.applySkin(this.state.getEquippedSkin());
    this.bossMaxHp = level.bossMaxHp;
    this.bossHp = level.bossMaxHp;
    this.bossBerserkTriggered = false;
    this.bossShieldActive = false;
    this.bossShieldHitsRemaining = 0;
    this.bossShield70Triggered = false;
    this.bossShield50Triggered = false;
    this.bossShield35Triggered = false;
    this.megaBossMeteorTimer = 4.2;
    this.megaBossCurseTimer = 9.5;
    this.megaBossSlamTimer = 7.8;
    this.miniBossWarCryTimer = 6.5;
    this.quakeTimer = 0;
    this.quakeMaxTimer = 0;
    this.quakeIntensity = 0;
    this.skillWaveQueue = [];
    document.body.classList.remove('screen-quake-active');
    if (this.bossShieldMesh) this.bossShieldMesh.visible = false;
    this.megaBossCrownGroup.visible = Boolean(level.isMegaBoss);
    this.bossGroup.position.set(0, -0.4, level.isMegaBoss ? BOSS_GATE_Z - 1.4 : BOSS_GATE_Z - 1.8);
    this.bossGroup.rotation.set(0, 0, 0);
    this.victoryClimaxTimer = 0;
    this.lastStageVictory = false;
    this.victoryFireworkTimer = 0;
    if (level.isMegaBoss) {
      this.scene.background = new THREE.Color(0xf4b97a);
      this.scene.fog = new THREE.FogExp2(0xf0c493, 0.0046);
      this.bossEyeMat.color.setHex(0xffedd5);
      if (this.bossPortalMat?.uniforms) {
        this.bossPortalMat.uniforms.uCoreColor.value.setHex(0xf97316);
        this.bossPortalMat.uniforms.uRingColor.value.setHex(0xfacc15);
      }
      this.bossArmorMat.color.setHex(0x9e3b2c);
      this.bossSecondaryMat.color.setHex(0xd89e32);
    } else if (level.isBonusHeist) {
      this.bossEyeMat.color.setHex(0xfef08a);
      if (this.bossPortalMat?.uniforms) {
        this.bossPortalMat.uniforms.uCoreColor.value.setHex(0xfacc15);
        this.bossPortalMat.uniforms.uRingColor.value.setHex(0xf472b6);
      }
      this.bossArmorMat.color.setHex(0xd97706);
      this.bossSecondaryMat.color.setHex(0xfde047);
    } else if (level.isEndlessDefense) {
      this.bossEyeMat.color.setHex(0xf472b6);
      if (this.bossPortalMat?.uniforms) {
        this.bossPortalMat.uniforms.uCoreColor.value.setHex(0x7c3aed);
        this.bossPortalMat.uniforms.uRingColor.value.setHex(0xf43f5e);
      }
      this.bossArmorMat.color.setHex(0x312e81);
      this.bossSecondaryMat.color.setHex(0xe11d48);
    } else if (level.isPayloadEscort) {
      this.bossEyeMat.color.setHex(0xfbbf24);
      if (this.bossPortalMat?.uniforms) {
        this.bossPortalMat.uniforms.uCoreColor.value.setHex(0xea580c);
        this.bossPortalMat.uniforms.uRingColor.value.setHex(0xfacc15);
      }
      this.bossArmorMat.color.setHex(0x3f2318);
      this.bossSecondaryMat.color.setHex(0xf59e0b);
    }
    for (const mt of this.meteorTelegraphs) {
      mt.active = false;
      mt.mesh.visible = false;
    }
    if (this.bossSteamSweep) {
      this.bossSteamSweep.phase = 'idle';
      this.bossSteamSweep.lane = level.seed % 2 === 0 ? 'left' : 'right';
      this.bossSteamSweep.timer = 0;
      this.bossSteamSweep.cooldown = level.isMegaBoss ? 3.2 : 4.0;
      this.bossSteamSweep.telegraphGroup.visible = false;
      this.bossSteamSweep.waveGroup.visible = false;
    }
    this.playerBaseMaxHp = Math.round(480 * this.state.getPowerMultiplier() * this.state.getBaseHpMultiplier());
    this.playerBaseHp = this.playerBaseMaxHp;
    this.lastKnownBaseHp = this.playerBaseMaxHp;
    this.baseDamageAccum = 0;
    this.bastionShockwavesTriggered = 0;
    this.skillOverdriveTimer = 0;
    this.scorchedEarthTimer = 0;
    this.scorchedEarthTickTimer = 0;
    this.shotsFiredCounter = 0;
    this.rainbowShotCounter = 0;
    this.praetorianShotCounter = 0;
    this.baseTurretTimer = 0.6;
    this.baseRegenTimer = 0;
    this.swarmBroodTimer = 3.8;
    this.gatePulseTimer = 2.6;
    this.plasmaThunderTimer = 2.4;
    this.orbitalStarfallTimer = 3.0;
    this.bastionPeriodicWaveTimer = 9.5;
    this.tycoonGoldMilestone = 180;
    this.isOverrunFrenzy = false;
    this.overrunTimer = 0;
    this.isStageEnded = false;
    this.elapsedTime = 0;
    this.stageCombatTime = 0;
    this.enemySpawnTimer = 0;
    this.bruteSpawnTimer = 2.0;
    this.shamanSpawnTimer = 2.5;
    this.killStreakCount = 0;
    this.killStreakWindowTimer = 0;
    this.nextStreakMilestone = 25;
    this.adrenalineTimer = 0;
    sound.setBgmDanger(0);

    // Apply Out-of-Match Capacitor Starting Charge (Always 100% ready at stage start to match reference HUD!)
    const startCharge = this.state.getStartingSkillCharge();
    this.state.championCharge = 100;
    this.state.orbitalCharge = Math.max(this.state.orbitalCharge, Math.floor(startCharge * 0.45));
    const mechaSpec = this.state.getMechaOverlordSpec();
    this.state.mechaOverlordCharge = Math.max(this.state.mechaOverlordCharge, mechaSpec.startingCharge);

    // Start turret at x=0 (left-foreground diagonal bridge position matching reference cannon)
    this.turretTargetX = 0;
    this.turretX = 0;
    this.turretGroup.position.x = 0;

    this.state.stageClonesSpawned = 0;
    this.state.stageMutantsKilled = 0;
    this.state.stageGoldEarned = 0;

    // Clear units
    for (const u of this.units) {
      u.active = false;
    }

    // Clear 3D level group & dispose stage-specific geometries to prevent WebGL buffer leaks
    while (this.levelGroup.children.length > 0) {
      const child = this.levelGroup.children[0];
      child.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) {
          mesh.geometry.dispose();
        }
      });
      this.levelGroup.remove(child);
    }
    this.labelsContainer.innerHTML = '';

    this.gates = [];
    this.gears = [];
    this.nests = [];
    this.candyVaults = [];
    this.bonusHeistTimeLeft = level.bonusHeistDurationSec || 25;
    this.bonusHeistShardsEarned = 0;
    this.bonusVaultsBroken = 0;
    this.endlessWave = 1;
    this.endlessWaveTimer = 0;
    if (level.isEndlessDefense) {
      this.state.recordEndlessWave(1);
    }
    this.escortBarricades = [];
    this.payloadCart = null;
    this.escortBarricadesBroken = 0;
    this.escortRamCount = 0;
    this.escortShardsEarned = 0;
    this.colossusBoss = null;
    this.colossusCandyShells = [];
    this.airshipMothership = null;
    this.antiAirTurrets = [];
    this.airshipDropPods = [];
    this.antiAirTurretsCleared = 0;
    this.airshipDropPodsDeployed = 0;
    this.cannonModShotCounter = 0;
    this.overdriveBurstQueue = 0;
    this.overdriveBurstTimer = 0;
    this.cannonModStats = {
      overdriveBurstsTriggered: 0,
      prismSplitsTriggered: 0,
      heavyMortarsLaunched: 0,
      mortarImpactDamageDealt: 0,
    };
    this.syncCannonCoreModule3D();
    this.bossGroup.visible = !level.isColossusRaid;
    this.bossSubTowers = [];
    this.barrels = [];
    this.wallRuntimes = [];
    this.zones = [];
    this.bumpers = [];
    this.walls = level.walls.map((w) => ({ ...w }));

    this.syncTurretEvolution(false);
    this.wasHoldingFire = false;
    this.heroChargeFullNotified = false;
    this.holdChargeParticleTimer = 0;
    this.lootBug.active = false;
    this.lootBug.spawnTimer = this.state.getSkillNodeRank('tycoon_t2') > 0 ? 4.2 : 6.8;
    this.lootBugGroup.visible = false;
    const lbLabel = document.createElement('div');
    lbLabel.className = 'lootbug-label';
    lbLabel.style.display = 'none';
    this.labelsContainer.appendChild(lbLabel);
    this.lootBugLabelEl = lbLabel;

    this.resetTacticalAirdrop(true);
    const adLabel = document.createElement('div');
    adLabel.className = 'airdrop-label';
    adLabel.style.display = 'none';
    this.labelsContainer.appendChild(adLabel);
    this.airdrop.labelEl = adLabel;

    this.resetMechaOverlord();
    this.resetTacticalSubWeapons(true);
    const moLabel = document.createElement('div');
    moLabel.className = 'nest-label mecha-overlord-label';
    moLabel.style.display = 'none';
    this.labelsContainer.appendChild(moLabel);
    if (this.mechaOverlord) {
      this.mechaOverlord.labelEl = moLabel;
    }

    // 3D World-Anchored Turret Hero Charge Bar (Hold to Charge -> Release when Full to Summon Hero!)
    const tcEl = document.createElement('div');
    tcEl.className = 'turret-charge-hud';
    tcEl.style.display = 'none';
    const tcTrack = document.createElement('div');
    tcTrack.className = 'turret-charge-track';
    const tcFill = document.createElement('div');
    tcFill.className = 'turret-charge-fill';
    tcTrack.appendChild(tcFill);
    const tcText = document.createElement('span');
    tcText.className = 'turret-charge-text';
    tcEl.appendChild(tcTrack);
    tcEl.appendChild(tcText);
    this.labelsContainer.appendChild(tcEl);
    this.turretChargeEl = tcEl;
    this.turretChargeFillEl = tcFill;
    this.turretChargeTextEl = tcText;

    // 1. Build Polished Walnut Wood Bumper Beams on Coiled Iron-and-Brass Spring Pedestals
    const woodBeamMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0xa6632e,
        roughness: 0.44,
        metalness: 0.06,
      }),
      0.78
    );
    const woodHighlightMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0xc88246,
        roughness: 0.38,
        metalness: 0.05,
      }),
      0.72
    );
    const movingWoodMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0xc2542d,
        emissive: 0x3b1105,
        emissiveIntensity: 0.14,
        roughness: 0.38,
        metalness: 0.1,
      }),
      0.78
    );
    const springIronMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0x454954,
        roughness: 0.38,
        metalness: 0.45,
      }),
      0.76
    );
    const brassTrimMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0xe8ad38,
        emissive: 0x3b2306,
        emissiveIntensity: 0.14,
        roughness: 0.26,
        metalness: 0.48,
      }),
      0.76
    );

    for (const w of this.walls) {
      const wGroup = new THREE.Group();
      const isMoving = Boolean(w.moveRangeX && w.moveSpeed);
      const dx = w.x2 - w.x1;
      const dz = w.z2 - w.z1;
      const len = Math.hypot(dx, dz);
      const angle = Math.atan2(dx, dz);
      const cx = (w.x1 + w.x2) / 2;
      const cz = (w.z1 + w.z2) / 2;

      // Main Walnut Wood Bumper Plank
      const wallMesh = new THREE.Mesh(
        new THREE.BoxGeometry(isMoving ? 0.72 : 0.66, 0.38, Math.max(0.4, len + 0.16)),
        isMoving ? movingWoodMat : woodBeamMat
      );
      wallMesh.position.set(cx, 0.78, cz);
      wallMesh.rotation.y = angle;
      wallMesh.castShadow = true;
      wallMesh.receiveShadow = true;
      wGroup.add(wallMesh);

      // Beveled lighter wood top plank strip
      const topTrim = new THREE.Mesh(
        new THREE.BoxGeometry(isMoving ? 0.54 : 0.48, 0.08, Math.max(0.3, len + 0.04)),
        isMoving ? brassTrimMat : woodHighlightMat
      );
      topTrim.position.set(cx, 0.99, cz);
      topTrim.rotation.y = angle;
      wGroup.add(topTrim);

      // Brass end-ferrule brackets wrapping the wooden beam near both ends
      for (const endSign of [-1, 1]) {
        const offsetAlong = endSign * Math.max(0.15, len * 0.5 - 0.32);
        const bx = cx + Math.sin(angle) * offsetAlong;
        const bz = cz + Math.cos(angle) * offsetAlong;
        const brassBand = new THREE.Mesh(
          new THREE.BoxGeometry(isMoving ? 0.78 : 0.72, 0.44, 0.22),
          brassTrimMat
        );
        brassBand.position.set(bx, 0.78, bz);
        brassBand.rotation.y = angle;
        wGroup.add(brassBand);
      }

      // Coiled Spring Pedestals at the endpoints (and center if extra-long)
      const postCount = len > 6.8 ? 2 : 1;
      for (let i = 0; i <= postCount; i++) {
        const t = i / postCount;
        const px = w.x1 + dx * t;
        const pz = w.z1 + dz * t;

        // Stepped golden-brass floor flange
        const baseFlange = new THREE.Mesh(
          new THREE.CylinderGeometry(0.52, 0.62, 0.18, 16),
          brassTrimMat
        );
        baseFlange.position.set(px, 0.09, pz);
        baseFlange.castShadow = true;
        wGroup.add(baseFlange);

        // Dark-iron inner damper shaft
        const shaft = new THREE.Mesh(
          new THREE.CylinderGeometry(0.28, 0.3, 0.68, 12),
          springIronMat
        );
        shaft.position.set(px, 0.45, pz);
        shaft.castShadow = true;
        wGroup.add(shaft);

        // 3 Stacked Coiled Steel Spring Rings
        for (const sy of [0.27, 0.44, 0.61]) {
          const coil = new THREE.Mesh(
            new THREE.TorusGeometry(0.37, 0.075, 8, 16),
            springIronMat
          );
          coil.position.set(px, sy, pz);
          coil.rotation.x = Math.PI / 2 + 0.09;
          wGroup.add(coil);
        }

        // Rounded wood/brass top cap with center brass rivet
        const woodCap = new THREE.Mesh(
          new THREE.CylinderGeometry(0.45, 0.47, 0.2, 16),
          isMoving ? movingWoodMat : woodBeamMat
        );
        woodCap.position.set(px, 0.88, pz);
        woodCap.castShadow = true;
        wGroup.add(woodCap);

        const rivet = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.14, 0.24, 10),
          brassTrimMat
        );
        rivet.position.set(px, 0.89, pz);
        wGroup.add(rivet);
      }

      // Stationary Brass & Iron Floor Guide Track for moving bumper beams
      if (isMoving && w.moveRangeX) {
        const trackSpanW = len + w.moveRangeX * 2 + 0.6;
        const trackGroove = new THREE.Mesh(
          new THREE.BoxGeometry(trackSpanW, 0.06, 0.46),
          springIronMat
        );
        trackGroove.position.set(cx, 0.03, cz);
        this.levelGroup.add(trackGroove);

        const trackBrassRail = new THREE.Mesh(
          new THREE.BoxGeometry(trackSpanW - 0.16, 0.08, 0.14),
          brassTrimMat
        );
        trackBrassRail.position.set(cx, 0.04, cz);
        this.levelGroup.add(trackBrassRail);
      }

      this.levelGroup.add(wGroup);
      this.wallRuntimes.push({
        cfg: w,
        group: wGroup,
        baseX1: w.x1,
        baseX2: w.x2,
      });
    }

    // 1b. Build Interactive 3D Factory Terrain Zones (Conveyor Belts, Spring Pads, Oil Puddles, Idol Stages)
    for (const zCfg of level.zones || []) {
      const zGroup = new THREE.Group();
      zGroup.position.set(zCfg.x, 0.02, zCfg.z);

      let beltTex: THREE.CanvasTexture | undefined;
      let ringMesh: THREE.Mesh | undefined;
      let holoCross: THREE.Group | undefined;
      let empTelegraphMesh: THREE.Mesh | undefined;
      let empTelegraphMat: THREE.MeshBasicMaterial | undefined;
      let padCushionGroup: THREE.Group | undefined;
      let windRotors: THREE.Object3D[] | undefined;

      if (zCfg.type === 'speed_belt') {
        // Raised Industrial Slate-Blue Conveyor Belt with Golden Chevrons, Dark-Iron Frame & Brass Brackets!
        const deckBed = new THREE.Mesh(
          new THREE.BoxGeometry(zCfg.width - 0.16, 0.14, zCfg.length),
          springIronMat
        );
        deckBed.position.y = 0.07;
        deckBed.castShadow = true;
        deckBed.receiveShadow = true;
        zGroup.add(deckBed);

        beltTex = createConveyorBeltTexture();
        beltTex.repeat.set(1, Math.max(1, Math.round(zCfg.length / 2.1)));
        const beltMat = new THREE.MeshStandardMaterial({
          map: beltTex,
          roughness: 0.5,
          metalness: 0.1,
        });
        const beltPlane = new THREE.Mesh(
          new THREE.PlaneGeometry(zCfg.width - 0.34, zCfg.length - 0.18),
          beltMat
        );
        beltPlane.rotation.x = -Math.PI / 2;
        beltPlane.position.y = 0.15;
        beltPlane.receiveShadow = true;
        zGroup.add(beltPlane);

        // Front & Rear cylindrical conveyor rollers
        for (const endZ of [-1, 1]) {
          const roller = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.12, zCfg.width - 0.18, 12),
            springIronMat
          );
          roller.rotation.z = Math.PI / 2;
          roller.position.set(0, 0.12, endZ * (zCfg.length * 0.5 - 0.06));
          zGroup.add(roller);
        }

        // Dark-iron side rails + polished golden-brass corner brackets
        for (const side of [-1, 1]) {
          const rail = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.22, zCfg.length + 0.08),
            springIronMat
          );
          rail.position.set(side * (zCfg.width * 0.5 - 0.09), 0.11, 0);
          rail.castShadow = true;
          zGroup.add(rail);

          for (const endZ of [-1, 1]) {
            const bracket = new THREE.Mesh(
              new THREE.BoxGeometry(0.28, 0.26, 0.42),
              brassTrimMat
            );
            bracket.position.set(
              side * (zCfg.width * 0.5 - 0.08),
              0.13,
              endZ * (zCfg.length * 0.5 - 0.14)
            );
            bracket.castShadow = true;
            zGroup.add(bracket);
          }
        }
      } else if (zCfg.type === 'jump_pad') {
        const r = Math.min(zCfg.width, zCfg.length) * 0.5;
        const padBase = new THREE.Mesh(
          new THREE.CylinderGeometry(r * 0.96, r * 1.08, 0.18, 20),
          brassTrimMat
        );
        padBase.position.y = 0.09;
        padBase.castShadow = true;
        zGroup.add(padBase);

        const springCoil = new THREE.Mesh(
          new THREE.TorusGeometry(r * 0.72, 0.09, 8, 20),
          springIronMat
        );
        springCoil.rotation.x = Math.PI / 2;
        springCoil.position.y = 0.2;
        zGroup.add(springCoil);

        const coreDisc = new THREE.Mesh(
          new THREE.CylinderGeometry(r * 0.68, r * 0.72, 0.12, 18),
          new THREE.MeshStandardMaterial({
            color: 0xf59e0b,
            emissive: 0x78350f,
            emissiveIntensity: 0.25,
            roughness: 0.3,
            metalness: 0.35,
          })
        );
        coreDisc.position.y = 0.26;
        zGroup.add(coreDisc);

        ringMesh = new THREE.Mesh(
          new THREE.RingGeometry(r * 0.48, r * 0.86, 24),
          new THREE.MeshBasicMaterial({
            color: 0xfef08a,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.88,
          })
        );
        ringMesh.rotation.x = -Math.PI / 2;
        ringMesh.position.y = 0.33;
        zGroup.add(ringMesh);
      } else if (zCfg.type === 'toxic_mire') {
        // 2D Hand-Painted Glossy Black Amoeba Oil Spill Puddle with White Specular Highlight Arcs!
        const oilTex = create2DOilSpillTexture();
        const oilPlaneMat = new THREE.MeshBasicMaterial({
          map: oilTex,
          transparent: true,
          alphaTest: 0.04,
          depthWrite: false,
        });
        const oilPlane = new THREE.Mesh(
          new THREE.PlaneGeometry(zCfg.width * 1.18, zCfg.length * 1.18),
          oilPlaneMat
        );
        oilPlane.rotation.x = -Math.PI / 2;
        oilPlane.position.y = 0.03;
        zGroup.add(oilPlane);
      } else if (zCfg.type === 'heal_sanctuary') {
        // Warm Sakura-Pink & Gold Idol Cheer Stage Spotlight!
        const r = Math.min(zCfg.width, zCfg.length) * 0.48;
        const stageDisc = new THREE.Mesh(
          new THREE.CylinderGeometry(r, r * 1.04, 0.05, 24),
          new THREE.MeshStandardMaterial({
            color: 0xfbcfe8,
            emissive: 0xf472b6,
            emissiveIntensity: 0.22,
            roughness: 0.35,
            metalness: 0.1,
          })
        );
        stageDisc.position.y = 0.025;
        zGroup.add(stageDisc);

        ringMesh = new THREE.Mesh(
          new THREE.RingGeometry(r * 0.74, r * 0.98, 24),
          new THREE.MeshBasicMaterial({
            color: 0xf472b6,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9,
          })
        );
        ringMesh.rotation.x = -Math.PI / 2;
        ringMesh.position.y = 0.07;
        zGroup.add(ringMesh);

        // Floating 3D Pink-Gold Musical Note / Cheer Emblem
        holoCross = new THREE.Group();
        holoCross.position.set(0, 0.78, 0);
        const noteMat = new THREE.MeshStandardMaterial({
          color: 0xf472b6,
          emissive: 0xdb2777,
          emissiveIntensity: 0.35,
          roughness: 0.22,
        });
        const noteHead = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), noteMat);
        noteHead.position.set(-0.1, -0.18, 0);
        holoCross.add(noteHead);
        const noteStem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.56, 8), noteMat);
        noteStem.position.set(0.06, 0.08, 0);
        holoCross.add(noteStem);
        const noteFlag = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.08), brassTrimMat);
        noteFlag.position.set(0.18, 0.3, 0);
        noteFlag.rotation.z = -0.35;
        holoCross.add(noteFlag);
        zGroup.add(holoCross);
      } else if (zCfg.type === 'tailwind_belt') {
        beltTex = createConveyorBeltTexture();
        beltTex.repeat.set(1, Math.max(1, zCfg.length / 2.2));
        const beltPlane = new THREE.Mesh(
          new THREE.PlaneGeometry(zCfg.width - 0.24, zCfg.length - 0.16),
          new THREE.MeshStandardMaterial({
            map: beltTex,
            color: 0x67e8f9,
            emissive: 0x0891b2,
            emissiveIntensity: 0.32,
            roughness: 0.3,
            metalness: 0.15,
          })
        );
        beltPlane.rotation.x = -Math.PI / 2;
        beltPlane.position.y = 0.045;
        zGroup.add(beltPlane);

        windRotors = [];
        for (const side of [-1, 1]) {
          const rail = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 0.22, zCfg.length),
            brassTrimMat
          );
          rail.position.set(side * (zCfg.width * 0.5 - 0.08), 0.11, 0);
          rail.castShadow = true;
          zGroup.add(rail);

          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.62, 10), brassTrimMat);
          post.position.set(side * (zCfg.width * 0.5 + 0.04), 0.34, 0);
          zGroup.add(post);

          const rotor = new THREE.Group();
          rotor.position.set(side * (zCfg.width * 0.5 + 0.04), 0.64, 0);
          const bladeMat = new THREE.MeshStandardMaterial({
            color: 0xa7f3d0,
            emissive: 0x10b981,
            emissiveIntensity: 0.35,
            roughness: 0.25,
          });
          for (let b = 0; b < 3; b++) {
            const blade = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.06, 0.12), bladeMat);
            blade.rotation.y = (b * Math.PI * 2) / 3;
            rotor.add(blade);
          }
          zGroup.add(rotor);
          windRotors.push(rotor);
        }
      } else if (zCfg.type === 'emp_zone') {
        const r = Math.min(zCfg.width, zCfg.length) * 0.5;
        const baseRing = new THREE.Mesh(
          new THREE.TorusGeometry(r * 0.92, 0.13, 10, 28),
          brassTrimMat
        );
        baseRing.rotation.x = Math.PI / 2;
        baseRing.position.y = 0.09;
        zGroup.add(baseRing);

        const coreDisc = new THREE.Mesh(
          new THREE.CylinderGeometry(r * 0.88, r * 0.9, 0.04, 24),
          new THREE.MeshStandardMaterial({
            color: 0x312e81,
            emissive: 0x4f46e5,
            emissiveIntensity: 0.34,
            roughness: 0.32,
            metalness: 0.28,
          })
        );
        coreDisc.position.y = 0.025;
        zGroup.add(coreDisc);

        empTelegraphMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.24,
          depthWrite: false,
        });
        empTelegraphMesh = new THREE.Mesh(new THREE.CircleGeometry(r * 0.88, 28), empTelegraphMat);
        empTelegraphMesh.rotation.x = -Math.PI / 2;
        empTelegraphMesh.position.y = 0.065;
        empTelegraphMesh.scale.set(0.25, 0.25, 1);
        zGroup.add(empTelegraphMesh);

        ringMesh = new THREE.Mesh(
          new THREE.RingGeometry(r * 0.68, r * 0.88, 28),
          new THREE.MeshBasicMaterial({
            color: 0x818cf8,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.82,
          })
        );
        ringMesh.rotation.x = -Math.PI / 2;
        ringMesh.position.y = 0.08;
        zGroup.add(ringMesh);

        for (let c = 0; c < 4; c++) {
          const ang = (c * Math.PI) / 2 + Math.PI / 4;
          const coilPost = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.52, 10), brassTrimMat);
          coilPost.position.set(Math.cos(ang) * r * 0.88, 0.28, Math.sin(ang) * r * 0.88);
          zGroup.add(coilPost);
          const sparkOrb = new THREE.Mesh(
            new THREE.SphereGeometry(0.12, 10, 8),
            new THREE.MeshBasicMaterial({ color: 0x67e8f9 })
          );
          sparkOrb.position.set(Math.cos(ang) * r * 0.88, 0.58, Math.sin(ang) * r * 0.88);
          zGroup.add(sparkOrb);
        }
      } else if (zCfg.type === 'frosting_pad') {
        const r = Math.min(zCfg.width, zCfg.length) * 0.5;
        const pedBase = new THREE.Mesh(
          new THREE.CylinderGeometry(r * 0.94, r * 1.06, 0.16, 22),
          brassTrimMat
        );
        pedBase.position.y = 0.08;
        pedBase.castShadow = true;
        zGroup.add(pedBase);

        const coil = new THREE.Mesh(
          new THREE.TorusGeometry(r * 0.58, 0.1, 8, 20),
          brassTrimMat
        );
        coil.rotation.x = Math.PI / 2;
        coil.position.y = 0.22;
        zGroup.add(coil);

        padCushionGroup = new THREE.Group();
        padCushionGroup.position.y = 0.34;
        const donutCushion = new THREE.Mesh(
          new THREE.CylinderGeometry(r * 0.84, r * 0.9, 0.22, 22),
          stylizeMaterialAs2DIllustration(
            new THREE.MeshStandardMaterial({
              color: 0xf472b6,
              emissive: 0xbe185d,
              emissiveIntensity: 0.18,
              roughness: 0.24,
              metalness: 0.04,
            }),
            0.74
          )
        );
        donutCushion.castShadow = true;
        padCushionGroup.add(donutCushion);

        const creamSwirl = new THREE.Mesh(
          new THREE.ConeGeometry(r * 0.52, 0.34, 16),
          stylizeMaterialAs2DIllustration(
            new THREE.MeshStandardMaterial({
              color: 0xfffbeb,
              roughness: 0.22,
              metalness: 0.02,
            }),
            0.72
          )
        );
        creamSwirl.position.y = 0.22;
        padCushionGroup.add(creamSwirl);
        zGroup.add(padCushionGroup);

        ringMesh = new THREE.Mesh(
          new THREE.RingGeometry(r * 0.62, r * 0.96, 24),
          new THREE.MeshBasicMaterial({
            color: 0xfbcfe8,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85,
          })
        );
        ringMesh.rotation.x = -Math.PI / 2;
        ringMesh.position.y = 0.06;
        zGroup.add(ringMesh);
      }

      const zLabel = document.createElement('div');
      zLabel.className = `zone-label zone-${zCfg.type}`;
      zLabel.innerHTML =
        zCfg.type === 'speed_belt'
          ? `${UI_ART.belt} 加速传送带`
          : zCfg.type === 'jump_pad'
            ? `${UI_ART.spring} 弹簧跳板`
            : zCfg.type === 'toxic_mire'
              ? `${UI_ART.oil} 黏滞油污`
              : zCfg.type === 'tailwind_belt'
                ? `${UI_ART.envTailwind} 顺风加速带`
                : zCfg.type === 'emp_zone'
                  ? `${UI_ART.envEmp} 电磁干扰区`
                  : zCfg.type === 'frosting_pad'
                    ? `${UI_ART.envFrosting} 糖霜弹跳垫`
                    : `${UI_ART.heart} 应援舞台`;
      this.labelsContainer.appendChild(zLabel);

      this.levelGroup.add(zGroup);
      this.zones.push({
        cfg: zCfg,
        group: zGroup,
        beltTex,
        ringMesh,
        holoCross,
        empPhase: zCfg.type === 'emp_zone' ? 'idle' : undefined,
        empTimer: zCfg.type === 'emp_zone' ? 1.4 : undefined,
        empPulseCount: zCfg.type === 'emp_zone' ? 0 : undefined,
        empTelegraphMesh,
        empTelegraphMat,
        padCushionGroup,
        padBounceAnim: 0,
        windRotors,
        labelEl: zLabel,
      });
    }

    // 1c. Build Brass & Coral Pinball Bumpers (Deflects units laterally into adjacent multiplier gates!)
    const bumperBodyMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0xe8ad38,
        emissive: 0x3b2306,
        emissiveIntensity: 0.15,
        metalness: 0.48,
        roughness: 0.26,
      }),
      0.76
    );
    const bumperCapMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0xfff8eb,
        roughness: 0.28,
        metalness: 0.06,
      }),
      0.74
    );

    for (const bCfg of level.bumpers || []) {
      const bGroup = new THREE.Group();
      bGroup.position.set(bCfg.x, 0, bCfg.z);

      const ped = new THREE.Mesh(
        new THREE.CylinderGeometry(bCfg.radius * 0.74, bCfg.radius * 0.9, 0.76, 16),
        bumperBodyMat
      );
      ped.position.y = 0.38;
      ped.castShadow = true;
      bGroup.add(ped);

      const ringMat = new THREE.MeshBasicMaterial({ color: 0xf96e80 });
      const shockRing = new THREE.Mesh(new THREE.TorusGeometry(bCfg.radius * 0.88, 0.14, 10, 20), ringMat);
      shockRing.rotation.x = Math.PI / 2;
      shockRing.position.y = 0.56;
      bGroup.add(shockRing);

      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(bCfg.radius * 0.68, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.52),
        bumperCapMat
      );
      cap.position.y = 0.74;
      bGroup.add(cap);

      this.levelGroup.add(bGroup);
      this.bumpers.push({
        cfg: bCfg,
        group: bGroup,
        ringMat,
        pulseTimer: 0,
      });
    }

    // 2. Build Turned Polished-Brass Finial Posts & Vibrant Woven Cloth Multiplier Banners (+2, -2, x2, x3)
    const brassDarkCollarMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0xa6701e,
        metalness: 0.48,
        roughness: 0.3,
      }),
      0.76
    );

    for (const g of level.gates) {
      const group = new THREE.Group();
      group.position.set(g.x, 0, g.z);

      const gateHeight = g.style === 'mega' ? 2.22 : 1.88;
      const pillarMat = stylizeMaterialAs2DIllustration(
        new THREE.MeshStandardMaterial({
          color: 0xe8ad38,
          emissive: 0x3b2306,
          emissiveIntensity: 0.14,
          roughness: 0.24,
          metalness: 0.48,
        }),
        0.78
      );

      for (const side of [-1, 1]) {
        const px = (side * g.width) / 2;

        // Stepped round golden-brass plinth base
        const baseStep1 = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.54, 0.16, 16), pillarMat);
        baseStep1.position.set(px, 0.08, 0);
        baseStep1.castShadow = true;
        group.add(baseStep1);

        const baseStep2 = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, 0.16, 16), brassDarkCollarMat);
        baseStep2.position.set(px, 0.22, 0);
        group.add(baseStep2);

        // Turned cylindrical brass post column
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.24, gateHeight, 16), pillarMat);
        pillar.position.set(px, gateHeight * 0.5 + 0.18, 0);
        pillar.castShadow = true;
        group.add(pillar);

        // Decorative brass collar rings
        for (const ry of [0.34, gateHeight + 0.12]) {
          const collar = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.05, 8, 16), brassDarkCollarMat);
          collar.rotation.x = Math.PI / 2;
          collar.position.set(px, ry, 0);
          group.add(collar);
        }

        // Spherical polished-brass ball finial on top
        const ballFinial = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), pillarMat);
        ballFinial.position.set(px, gateHeight + 0.36, 0);
        ballFinial.castShadow = true;
        group.add(ballFinial);

        // Small inner brass cord-hook ring where the portal energy field anchors onto the post
        const hookRing = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.028, 6, 12), brassDarkCollarMat);
        hookRing.position.set(px - side * 0.2, gateHeight - 0.02, 0);
        group.add(hookRing);
      }

      // Supercell Style 2: 3D Glowing Rounded Top Arch Beam + Golden Crown Crest Finial!
      const archCrossbar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, g.width + 0.16, 14),
        pillarMat
      );
      archCrossbar.rotation.z = Math.PI / 2;
      archCrossbar.position.set(0, gateHeight + 0.14, 0);
      group.add(archCrossbar);

      const archCrest = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), pillarMat);
      archCrest.scale.set(1.25, 1.15, 0.65);
      archCrest.position.set(0, gateHeight + 0.36, 0);
      group.add(archCrest);

      const labelStr = this.formatGateLabel(g);
      const shieldMat = new THREE.MeshBasicMaterial({
        map: this.getGateBannerTexture(g.style, labelStr),
        transparent: true,
        opacity: 0.99,
        alphaTest: 0.05,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const shield = new THREE.Mesh(
        new THREE.PlaneGeometry(Math.max(0.5, g.width - 0.24), gateHeight - 0.06),
        shieldMat
      );
      shield.position.set(0, gateHeight * 0.52 + 0.08, 0);
      group.add(shield);

      this.levelGroup.add(group);

      const labelEl = document.createElement('div');
      labelEl.className = 'gate-label';
      labelEl.textContent = labelStr;
      this.labelsContainer.appendChild(labelEl);

      const gateRuntime: GateRuntime = {
        cfg: { ...g },
        group,
        pillarMat,
        shieldMat,
        currentX: g.x,
        pulseTimer: 0,
        addCooldown: 0,
        chargeHits: 0,
        initialHazardValue: g.op === 'sub' ? Math.max(1, g.value) : g.op === 'div' ? 4 : undefined,
        flippedFromHazard: false,
        labelEl,
      };
      this.syncGateVisualStyle(gateRuntime);
      this.gates.push(gateRuntime);
    }

    // Gate T4 Keystone: Truth Alchemy Gate automatically transmutes 1 Red Hazard Gate into a Blue Gate at stage start!
    if (this.state.getSkillNodeRank('gate_t4') > 0) {
      const hazardGate = this.gates.find((gt) => gt.cfg.op === 'sub' || gt.cfg.op === 'div');
      if (hazardGate) {
        this.flipHazardGateToBlue(hazardGate);
      }
    }

    // 3. Build Plump Copper-Orange Riveted Steam Boiler Obstacles ("6" in reference screenshot!)
    const boilerIronMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0x454954,
        roughness: 0.38,
        metalness: 0.45,
      }),
      0.78
    );
    const boilerBrassMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0xe8ad38,
        emissive: 0x3b2306,
        emissiveIntensity: 0.14,
        roughness: 0.26,
        metalness: 0.48,
      }),
      0.78
    );

    for (const gr of level.gears) {
      const gearGroup = new THREE.Group();
      gearGroup.position.set(gr.x, 0, gr.z);

      const boilerCopperMat = stylizeMaterialAs2DIllustration(
        new THREE.MeshStandardMaterial({
          color: 0xef743c,
          emissive: 0x3b1105,
          emissiveIntensity: 0.12,
          roughness: 0.28,
          metalness: 0.2,
        }),
        0.82
      );

      // Dark-iron circular foundation plinth
      const basePlinth = new THREE.Mesh(
        new THREE.CylinderGeometry(gr.radius * 0.94, gr.radius * 1.04, 0.22, 20),
        boilerIronMat
      );
      basePlinth.position.y = 0.11;
      basePlinth.castShadow = true;
      basePlinth.receiveShadow = true;
      gearGroup.add(basePlinth);

      // 8 Brass anchor lugs around the base plinth
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        const lug = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 0.34), boilerBrassMat);
        lug.position.set(
          Math.cos(ang) * gr.radius * 0.96,
          0.14,
          Math.sin(ang) * gr.radius * 0.96
        );
        lug.rotation.y = -ang;
        gearGroup.add(lug);
      }

      // Golden-brass lower flange ring
      const lowerFlange = new THREE.Mesh(
        new THREE.TorusGeometry(gr.radius * 0.82, 0.08, 8, 20),
        boilerBrassMat
      );
      lowerFlange.rotation.x = Math.PI / 2;
      lowerFlange.position.y = 0.24;
      gearGroup.add(lowerFlange);

      // Plump Copper-Orange Boiler Drum & Hemispherical Dome
      const drum = new THREE.Mesh(
        new THREE.CylinderGeometry(gr.radius * 0.8, gr.radius * 0.84, 0.76, 20),
        boilerCopperMat
      );
      drum.position.y = 0.6;
      drum.castShadow = true;
      gearGroup.add(drum);

      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(gr.radius * 0.8, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
        boilerCopperMat
      );
      dome.position.y = 0.96;
      dome.scale.set(1, 0.82, 1);
      dome.castShadow = true;
      gearGroup.add(dome);

      // Brass rivets around the boiler shoulder
      for (let i = 0; i < 10; i++) {
        const ang = (i / 10) * Math.PI * 2;
        const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), boilerBrassMat);
        rivet.position.set(
          Math.cos(ang) * gr.radius * 0.78,
          0.96,
          Math.sin(ang) * gr.radius * 0.78
        );
        gearGroup.add(rivet);
      }

      // Top Brass Valve Cap & Steam Exhaust Chimney Stack
      const topCrown = new THREE.Mesh(
        new THREE.CylinderGeometry(0.36, 0.44, 0.14, 14),
        boilerBrassMat
      );
      topCrown.position.y = 1.62;
      gearGroup.add(topCrown);

      const ventStack = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.22, 0.28, 12),
        boilerIronMat
      );
      ventStack.position.y = 1.82;
      gearGroup.add(ventStack);

      const ventLip = new THREE.Mesh(
        new THREE.TorusGeometry(0.2, 0.04, 6, 12),
        boilerBrassMat
      );
      ventLip.rotation.x = Math.PI / 2;
      ventLip.position.y = 1.95;
      gearGroup.add(ventLip);

      this.levelGroup.add(gearGroup);

      // Stationary Brass & Iron Floor Guide Track when boiler patrols horizontally
      if (gr.moveRangeX && gr.moveRangeX > 0) {
        const slotW = gr.moveRangeX * 2 + gr.radius * 1.4;
        const slotTrack = new THREE.Mesh(
          new THREE.BoxGeometry(slotW, 0.05, 0.48),
          boilerIronMat
        );
        slotTrack.position.set(gr.x, 0.025, gr.z);
        this.levelGroup.add(slotTrack);

        const slotBrass = new THREE.Mesh(
          new THREE.BoxGeometry(slotW - 0.16, 0.07, 0.12),
          boilerBrassMat
        );
        slotBrass.position.set(gr.x, 0.035, gr.z);
        this.levelGroup.add(slotBrass);
      }

      const labelEl = document.createElement('div');
      labelEl.className = 'gear-label';
      labelEl.textContent = `${gr.hp}`;
      this.labelsContainer.appendChild(labelEl);

      this.gears.push({
        cfg: { ...gr },
        mesh: gearGroup,
        baseX: gr.x,
        hp: gr.hp,
        alive: true,
        hitFlash: 0,
        labelEl,
      });
    }

    // 4. Build Side Factory Guard Outposts / Mini-Boss Pedestals
    for (const n of level.nests) {
      const group = new THREE.Group();
      group.position.set(n.x, 0, n.z);

      const pedBrickMat = stylizeMaterialAs2DIllustration(
        new THREE.MeshStandardMaterial({
          color: 0xc2583f,
          roughness: 0.62,
          metalness: 0.06,
        }),
        0.78
      );
      const pedBrassMat = stylizeMaterialAs2DIllustration(
        new THREE.MeshStandardMaterial({
          color: 0xe8ad38,
          roughness: 0.26,
          metalness: 0.48,
        }),
        0.78
      );
      const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.82, 1.08, 16), pedBrickMat);
      pedestal.position.set(0, 0.54, 0);
      pedestal.castShadow = true;
      group.add(pedestal);

      const brassRim = new THREE.Mesh(new THREE.TorusGeometry(1.68, 0.1, 8, 20), pedBrassMat);
      brassRim.rotation.x = Math.PI / 2;
      brassRim.position.set(0, 1.08, 0);
      group.add(brassRim);

      // Cute/fierce Copper-Armored Mini-Foreman Sentinel on the outpost
      const monsterMesh = new THREE.Group();
      monsterMesh.position.set(0, 1.88, 0);
      const copperArmorMat = stylizeMaterialAs2DIllustration(
        new THREE.MeshStandardMaterial({
          color: 0xe6673a,
          roughness: 0.34,
          metalness: 0.2,
        }),
        0.8
      );
      const ironHelmMat = stylizeMaterialAs2DIllustration(
        new THREE.MeshStandardMaterial({
          color: 0x454954,
          roughness: 0.34,
          metalness: 0.45,
        }),
        0.8
      );

      const mBody = new THREE.Mesh(new THREE.SphereGeometry(0.92, 14, 12), copperArmorMat);
      mBody.scale.set(1.05, 1.1, 0.96);
      monsterMesh.add(mBody);

      const mHelmet = new THREE.Mesh(
        new THREE.SphereGeometry(0.76, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.52),
        ironHelmMat
      );
      mHelmet.position.set(0, 0.36, 0);
      monsterMesh.add(mHelmet);

      // Glowing yellow goggles
      const goggleMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      for (const gx of [-0.26, 0.26]) {
        const goggle = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), goggleMat);
        goggle.position.set(gx, 0.26, 0.78);
        monsterMesh.add(goggle);
      }

      // Twin brass steam exhaust horns
      const hornGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.52, 8);
      const hornL = new THREE.Mesh(hornGeo, pedBrassMat);
      hornL.position.set(-0.56, 0.85, -0.1);
      hornL.rotation.z = 0.28;
      monsterMesh.add(hornL);

      const hornR = new THREE.Mesh(hornGeo, pedBrassMat);
      hornR.position.set(0.56, 0.85, -0.1);
      hornR.rotation.z = -0.28;
      monsterMesh.add(hornR);

      group.add(monsterMesh);
      this.levelGroup.add(group);

      const labelEl = document.createElement('div');
      labelEl.className = 'nest-label';
      labelEl.textContent = `${n.hp}`;
      this.labelsContainer.appendChild(labelEl);

      this.nests.push({
        cfg: n,
        group,
        monsterMesh,
        hp: n.hp,
        maxHp: n.hp,
        alive: true,
        hitFlash: 0,
        labelEl,
      });
    }

    // 4a-mc3. Build 3D Golden Candy Vault Towers for 25s Bonus Heist Stages
    if (level.candyVaults && level.candyVaults.length > 0) {
      const vaultGoldMat = stylizeMaterialAs2DIllustration(
        new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          roughness: 0.24,
          metalness: 0.52,
        }),
        0.8
      );
      const vaultCreamMat = stylizeMaterialAs2DIllustration(
        new THREE.MeshStandardMaterial({
          color: 0xfef3c7,
          roughness: 0.35,
          metalness: 0.12,
        }),
        0.82
      );
      const vaultCandyPinkMat = stylizeMaterialAs2DIllustration(
        new THREE.MeshStandardMaterial({
          color: 0xec4899,
          roughness: 0.22,
          metalness: 0.18,
          emissive: 0x831843,
          emissiveIntensity: 0.35,
        }),
        0.82
      );
      const vaultCyanGemMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

      for (const v of level.candyVaults) {
        const group = new THREE.Group();
        group.position.set(v.x, 0, v.z);
        const scale = v.isGrand ? 1.18 : 1.0;
        group.scale.set(scale, scale, scale);

        const basePlinth = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.95, 0.62, 18), vaultGoldMat);
        basePlinth.position.set(0, 0.31, 0);
        basePlinth.castShadow = true;
        group.add(basePlinth);

        const safeBody = new THREE.Mesh(new THREE.BoxGeometry(2.35, 2.05, 2.15), vaultCreamMat);
        safeBody.position.set(0, 1.62, 0);
        safeBody.castShadow = true;
        group.add(safeBody);

        const goldFrame = new THREE.Mesh(new THREE.BoxGeometry(2.48, 0.32, 2.28), vaultGoldMat);
        goldFrame.position.set(0, 2.66, 0);
        group.add(goldFrame);

        const frostingDome = new THREE.Mesh(
          new THREE.SphereGeometry(1.18, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
          vaultCandyPinkMat
        );
        frostingDome.position.set(0, 2.74, 0);
        group.add(frostingDome);

        const doorWheel = new THREE.Group();
        doorWheel.position.set(0, 1.62, 1.14);
        const wheelRing = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.11, 8, 18), vaultGoldMat);
        doorWheel.add(wheelRing);
        for (let sp = 0; sp < 4; sp++) {
          const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.18, 6), vaultGoldMat);
          spoke.rotation.z = (sp * Math.PI) / 4;
          doorWheel.add(spoke);
        }
        const hubGem = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 10), vaultCyanGemMat);
        hubGem.position.set(0, 0, 0.08);
        doorWheel.add(hubGem);
        group.add(doorWheel);

        const gemCrown = new THREE.Mesh(
          new THREE.OctahedronGeometry(v.isGrand ? 0.56 : 0.44, 0),
          v.isGrand ? vaultCandyPinkMat : vaultCyanGemMat
        );
        gemCrown.position.set(0, 3.68, 0);
        group.add(gemCrown);

        this.levelGroup.add(group);

        const labelEl = document.createElement('div');
        labelEl.className = 'nest-label candy-vault-label';
        labelEl.dataset.hp = `${v.hp}`;
        labelEl.innerHTML = `${UI_ART.candyVault}<span>${v.hp}</span>`;
        this.labelsContainer.appendChild(labelEl);

        this.candyVaults.push({
          cfg: v,
          group,
          doorWheel,
          gemCrown,
          hp: v.hp,
          maxHp: v.hp,
          alive: true,
          hitFlash: 0,
          labelEl,
        });
      }
    }

    // 4a-mc5. Build 3D Enemy Barricades & Steam Armored Payload Cart for Escort Mode
    if (level.escortBarricades && level.escortBarricades.length > 0) {
      const ironMat = stylizeMaterialAs2DIllustration(
        new THREE.MeshStandardMaterial({
          color: 0x991b1b,
          roughness: 0.34,
          metalness: 0.56,
        }),
        0.82
      );
      const timberMat = stylizeMaterialAs2DIllustration(
        new THREE.MeshStandardMaterial({
          color: 0x5c2d16,
          roughness: 0.48,
          metalness: 0.1,
        }),
        0.82
      );
      const hazardMat = stylizeMaterialAs2DIllustration(
        new THREE.MeshStandardMaterial({
          color: 0xfbbf24,
          roughness: 0.26,
          metalness: 0.42,
        }),
        0.82
      );

      for (const b of level.escortBarricades) {
        const group = new THREE.Group();
        group.position.set(b.x, 0, b.z);
        const halfW = b.width * 0.5;

        for (const side of [-1, 1]) {
          const post = new THREE.Mesh(
            new THREE.CylinderGeometry(0.46, 0.58, b.isHeavy ? 2.45 : 2.05, 12),
            ironMat
          );
          post.position.set(side * (halfW - 0.35), 1.05, 0);
          post.castShadow = true;
          group.add(post);

          const cap = new THREE.Mesh(new THREE.ConeGeometry(0.52, 0.48, 12), hazardMat);
          cap.position.set(side * (halfW - 0.35), b.isHeavy ? 2.42 : 2.15, 0);
          group.add(cap);
        }

        const beamGroup = new THREE.Group();
        const lowerBeam = new THREE.Mesh(new THREE.BoxGeometry(b.width, 0.55, 0.72), timberMat);
        lowerBeam.position.set(0, 0.72, 0);
        lowerBeam.castShadow = true;
        beamGroup.add(lowerBeam);

        const upperPlate = new THREE.Mesh(
          new THREE.BoxGeometry(b.width - 0.3, b.isHeavy ? 0.68 : 0.52, 0.62),
          ironMat
        );
        upperPlate.position.set(0, 1.48, 0);
        upperPlate.castShadow = true;
        beamGroup.add(upperPlate);

        for (let s = -2; s <= 2; s++) {
          const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.58, 0.68), hazardMat);
          stripe.position.set(s * (b.width * 0.17), 1.48, 0.04);
          beamGroup.add(stripe);
        }
        group.add(beamGroup);
        this.levelGroup.add(group);

        const labelEl = document.createElement('div');
        labelEl.className = 'nest-label escort-barricade-label';
        labelEl.dataset.hp = `${b.hp}`;
        labelEl.innerHTML = `${UI_ART.barricade}<span>${b.hp}</span>`;
        this.labelsContainer.appendChild(labelEl);

        this.escortBarricades.push({
          cfg: b,
          group,
          beamGroup,
          hp: b.hp,
          maxHp: b.hp,
          alive: true,
          hitFlash: 0,
          labelEl,
        });
      }
    }

    if (level.isPayloadEscort) {
      const finish = this.state.getEquippedFinish();
      const cartGroup = new THREE.Group();
      const startZ = 14.8;
      const targetZ = BOSS_GATE_Z + 1.8;
      cartGroup.position.set(0, 0, startZ);

      const armorMat = stylizeMaterialAs2DIllustration(
        new THREE.MeshStandardMaterial({
          color: finish.cartArmorHex,
          roughness: finish.cannonRoughness,
          metalness: finish.cannonMetalness,
        }),
        0.82
      );
      const trimMat = stylizeMaterialAs2DIllustration(
        new THREE.MeshStandardMaterial({
          color: finish.cartTrimHex,
          roughness: 0.2,
          metalness: 0.68,
        }),
        0.82
      );
      const boilerMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.55,
        roughness: 0.18,
        metalness: 0.25,
      });

      const auraGeo = new THREE.RingGeometry(3.85, 4.38, 36);
      auraGeo.rotateX(-Math.PI / 2);
      const auraRingMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const auraRingMesh = new THREE.Mesh(auraGeo, auraRingMat);
      auraRingMesh.position.set(0, 0.06, 0);
      cartGroup.add(auraRingMesh);

      const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.72, 3.35), armorMat);
      chassis.position.set(0, 0.74, 0);
      chassis.castShadow = true;
      cartGroup.add(chassis);

      const trimBelt = new THREE.Mesh(new THREE.BoxGeometry(2.72, 0.22, 3.48), trimMat);
      trimBelt.position.set(0, 1.08, 0);
      cartGroup.add(trimBelt);

      const boilerGeo = new THREE.CylinderGeometry(0.76, 0.82, 2.15, 18);
      boilerGeo.rotateX(Math.PI / 2);
      const boilerMesh = new THREE.Mesh(boilerGeo, boilerMat);
      boilerMesh.position.set(0, 1.56, 0.15);
      boilerMesh.castShadow = true;
      cartGroup.add(boilerMesh);

      for (const bz of [-0.65, 0.15, 0.95]) {
        const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.085, 8, 18), trimMat);
        hoop.position.set(0, 1.56, bz);
        cartGroup.add(hoop);
      }

      const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.2, 1.05, 12), trimMat);
      chimney.position.set(0, 2.48, -0.45);
      cartGroup.add(chimney);

      const ramPlowGroup = new THREE.Group();
      ramPlowGroup.position.set(0, 0.72, -1.85);
      const plowWedge = new THREE.Mesh(new THREE.ConeGeometry(1.38, 1.35, 4), trimMat);
      plowWedge.rotation.x = -Math.PI / 2;
      plowWedge.rotation.z = Math.PI / 4;
      plowWedge.scale.set(1.15, 1.0, 0.58);
      ramPlowGroup.add(plowWedge);
      cartGroup.add(ramPlowGroup);

      const wheels: THREE.Mesh[] = [];
      const wheelGeo = new THREE.CylinderGeometry(0.54, 0.54, 0.34, 16);
      wheelGeo.rotateZ(Math.PI / 2);
      for (const sx of [-1.36, 1.36]) {
        for (const sz of [-1.02, 1.02]) {
          const wMesh = new THREE.Mesh(wheelGeo, trimMat);
          wMesh.position.set(sx, 0.54, sz);
          wMesh.castShadow = true;
          cartGroup.add(wMesh);
          wheels.push(wMesh);
        }
      }

      this.levelGroup.add(cartGroup);

      const cartLabel = document.createElement('div');
      cartLabel.className = 'nest-label payload-cart-label';
      cartLabel.innerHTML = `${UI_ART.escortCart}<span>推进 0% · 待充能</span>`;
      this.labelsContainer.appendChild(cartLabel);

      this.payloadCart = {
        active: true,
        x: 0,
        z: startZ,
        startZ,
        targetZ,
        speed: 0,
        steamCharge: 0,
        escortBlueCount: 0,
        contestRedCount: 0,
        chargeState: 'idle',
        ramCooldown: 0.25,
        ramAnim: 0,
        wheelPhase: 0,
        smokeTimer: 0,
        group: cartGroup,
        armorMat,
        trimMat,
        boilerMat,
        ramPlowGroup,
        wheels,
        auraRingMesh,
        auraRingMat,
        labelEl: cartLabel,
      };
      this.applySkin(this.state.getEquippedSkin());
    }

    // 4a-bis. MC-2: Build Dual Lateral Steampunk Shield Sub-Towers on 5/10 Boss Stages
    const towerBaseMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0x475569,
        roughness: 0.48,
        metalness: 0.35,
      }),
      0.78
    );
    const towerBrassMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0xd97706,
        emissive: 0x451a03,
        emissiveIntensity: 0.22,
        roughness: 0.28,
        metalness: 0.56,
      }),
      0.8
    );
    const towerCoreMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.85,
        roughness: 0.16,
        metalness: 0.2,
      }),
      0.85
    );

    for (const st of level.bossSubTowers || []) {
      const tGroup = new THREE.Group();
      tGroup.position.set(st.x, 0, st.z);

      const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.42, 0.65, 8), towerBaseMat);
      plinth.position.y = 0.32;
      plinth.castShadow = true;
      plinth.receiveShadow = true;
      tGroup.add(plinth);

      const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.96, 1.55, 12), towerBrassMat);
      boiler.position.y = 1.38;
      boiler.castShadow = true;
      tGroup.add(boiler);

      const coreMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.62, 1), towerCoreMat);
      coreMesh.position.y = 2.48;
      tGroup.add(coreMesh);

      const valveRing = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.11, 8, 20), towerBrassMat);
      valveRing.rotation.x = Math.PI / 2;
      valveRing.position.y = 2.48;
      tGroup.add(valveRing);

      const capDome = new THREE.Mesh(new THREE.ConeGeometry(0.68, 0.58, 10), towerBrassMat);
      capDome.position.y = 3.25;
      tGroup.add(capDome);

      this.levelGroup.add(tGroup);

      // Energy tether beam linking sub-tower core to central Boss Steam Barrier
      const pStart = new THREE.Vector3(st.x, 2.48, st.z);
      const pEnd = new THREE.Vector3(0, 2.75, BOSS_GATE_Z - 0.2);
      const beamVec = new THREE.Vector3().subVectors(pEnd, pStart);
      const beamLen = Math.max(0.5, beamVec.length());
      const beamGeo = new THREE.CylinderGeometry(0.13, 0.18, beamLen, 8);
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.62,
        depthWrite: false,
      });
      const beamMesh = new THREE.Mesh(beamGeo, beamMat);
      beamMesh.position.copy(pStart).addScaledVector(beamVec, 0.5);
      beamMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), beamVec.clone().normalize());
      this.levelGroup.add(beamMesh);

      const labelEl = document.createElement('div');
      labelEl.className = 'subtower-label';
      labelEl.dataset.hp = `${st.hp}`;
      labelEl.innerHTML = `${UI_ART.shield}<span>${st.hp}</span>`;
      this.labelsContainer.appendChild(labelEl);

      this.bossSubTowers.push({
        cfg: st,
        group: tGroup,
        coreMesh,
        valveRing,
        beamMesh,
        beamMat,
        hp: st.hp,
        maxHp: st.hp,
        alive: true,
        hitFlash: 0,
        labelEl,
      });
    }

    if (this.bossSteamBarrierMesh) {
      const aliveCount = this.getAliveSubTowerCount();
      this.bossSteamBarrierMesh.visible = aliveCount > 0;
      this.bossSteamBarrierMat.opacity = aliveCount >= 2 ? 0.36 : 0.2;
    }

    if (level.isColossusRaid) {
      this.buildClockworkColossus(level);
    }
    if (level.isAirshipEscort) {
      this.buildAirshipEscort3D(level);
    }

    // 4b. Build Steampunk Firework Powder Kegs (Shootable/Touchable Chain-Reaction Barrels!)
    const barrelBodyMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0xe04235,
        emissive: 0x450a0a,
        emissiveIntensity: 0.2,
        roughness: 0.34,
        metalness: 0.18,
      }),
      0.8
    );
    const barrelBandMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0xe8ad38,
        roughness: 0.26,
        metalness: 0.48,
      }),
      0.78
    );
    const barrelCoreMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    for (const br of level.barrels || []) {
      const bGroup = new THREE.Group();
      bGroup.position.set(br.x, 0, br.z);

      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.64, 1.28, 16), barrelBodyMat);
      body.position.y = 0.64;
      body.castShadow = true;
      bGroup.add(body);

      const bandTop = new THREE.Mesh(new THREE.CylinderGeometry(0.63, 0.63, 0.14, 16), barrelBandMat);
      bandTop.position.y = 1.02;
      bGroup.add(bandTop);

      const bandBot = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.64, 0.14, 16), barrelBandMat);
      bandBot.position.y = 0.32;
      bGroup.add(bandBot);

      const fuseSpark = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), barrelCoreMat);
      fuseSpark.position.y = 1.42;
      bGroup.add(fuseSpark);

      const hazardFloorRing = new THREE.Mesh(
        new THREE.RingGeometry(0.7, 0.88, 20),
        new THREE.MeshBasicMaterial({ color: 0xfbbf24, side: THREE.DoubleSide })
      );
      hazardFloorRing.rotation.x = -Math.PI / 2;
      hazardFloorRing.position.y = 0.03;
      bGroup.add(hazardFloorRing);

      this.levelGroup.add(bGroup);

      const labelEl = document.createElement('div');
      labelEl.className = 'barrel-label';
      labelEl.innerHTML = `${UI_ART.barrel}<span>${br.hp}</span>`;
      this.labelsContainer.appendChild(labelEl);

      this.barrels.push({
        cfg: br,
        mesh: bGroup,
        hp: br.hp,
        alive: true,
        labelEl,
      });
    }

    if (level.isMegaBoss) {
      sound.playBossRoar();
      this.triggerContinuousQuake(1.35, 1.38);
      this.triggerScreenFlash('#f97316', 0.68);
      for (const px of [-6.0, -3.0, 0, 3.0, 6.0]) {
        this.spawnSkyPillar(px, BOSS_GATE_Z + 1.2, 0xf97316, 3.2, 0.7);
      }
      this.spawnShockwave(0, BOSS_GATE_Z + 1.2, 0xf97316, 16.5, 0.75);
      this.spawnShockwave(0, BOSS_GATE_Z + 1.2, 0xfacc15, 11.5, 0.58);
      this.spawnUnit('red', 'brute', -3.6, BOSS_GATE_Z + 1.8, 0, 3.2);
      this.spawnUnit('red', 'brute', 3.6, BOSS_GATE_Z + 1.8, 0, 3.2);
      this.spawnUnit('red', 'shaman', -1.8, BOSS_GATE_Z + 1.5, 0, 2.9);
      this.spawnUnit('red', 'shaman', 1.8, BOSS_GATE_Z + 1.5, 0, 2.9);
    } else if (level.isMilestoneBoss) {
      this.spawnSkyPillar(0, BOSS_GATE_Z + 1.0, 0xfacc15, 2.8, 0.6);
      this.spawnShockwave(0, BOSS_GATE_Z + 1.0, 0xfacc15, 11.0, 0.6);
    }

    // 5. Pre-warm vanguard of Red Clockwork Tin Robots & Blue Water-Drop Slimes + Caramel Pudding Champion
    // Preserves every procedural & tactical MC-1 gate at its exact 3D mesh coordinate!
    for (const g of this.gates) {
      this.syncGateVisualStyle(g);
    }

    // Spawn the 2 distinct Red Clockwork Tin Robots marching down from the Steampunk Red Furnace Tank Boss
    // (Skipped in 25s Candy Vault Bonus Heist so Bonus stages have strictly ZERO Red enemy interference!)
    if (!level.isBonusHeist) {
      const redCoords: Array<[number, number]> = [
        [-6.0, -11.6],
        [6.8, -10.6],
      ];
      for (const [rx, rz] of redCoords) {
        const rUnit = this.spawnUnit('red', 'normal', rx, rz, 0, 2.2);
        if (rUnit) rUnit.spawnHop = 0;
      }
    }

    // Spawn the Giant Crowned Caramel Custard Pudding Champion right in the center (rx=540, ry=258)!
    const initChamp = this.spawnUnit('blue', 'champion', -3.0, 0.0, 0, -3.2);
    if (initChamp) {
      initChamp.maxHp *= 3.5;
      initChamp.hp = initChamp.maxHp;
      initChamp.spawnHop = 0;
    }

    // Spawn the exact 7 plump Translucent Glowing Cyan Water-Drop Slimes across the bridge:
    // 4 foreground slimes between cannon muzzle and pudding + 3 midground slimes near x3 & robots!
    const blueCoords: Array<[number, number]> = [
      [-6.2, 2.0],
      [-4.2, 3.4],
      [-2.1, 6.0],
      [-1.0, 2.8],
      [-1.5, -3.2],
      [0.6, -7.2],
      [4.0, -7.6],
    ];
    for (const [bx, bz] of blueCoords) {
      const bUnit = this.spawnUnit('blue', 'normal', bx, bz, 0, -4.5);
      if (bUnit) bUnit.spawnHop = 0;
    }
  }

  private getGateBannerTexture(
    style: GateStyle,
    labelText: string
  ): THREE.CanvasTexture {
    const key = `${style}_${labelText}`;
    if (!this.gateTextures[key]) {
      this.gateTextures[key] = createGateForcefieldTexture(style, labelText);
    }
    return this.gateTextures[key];
  }

  public toggleCameraMode(): string {
    this.cameraMode = ((this.cameraMode + 1) % 3) as 0 | 1 | 2;
    this.applyCameraTransform();
    return this.cameraMode === 0 ? '斜向微缩' : this.cameraMode === 1 ? '经典俯视' : '低空震撼';
  }

  private applyCameraTransform(): void {
    const aspect = window.innerWidth / Math.max(1, window.innerHeight);
    const isPortrait = aspect < 1.0;
    const zoom = isPortrait ? Math.max(1.0, 0.72 / Math.max(0.46, aspect)) : 1.0;

    this.camera.aspect = aspect;

    if (this.cameraMode === 0) {
      // 3/4 Diagonal Diorama 3D Perspective:
      // Genuine Three.js 3D diagonal camera positioned on the East (+X) side looking West-North-West so the
      // cobblestone viaduct runs from Bottom-Left (Player 3D Candy Cannon, unobstructed by the bottom-right card dock!)
      // to Top-Right (Steampunk Boss Gatehouse), while keeping all 3D gates, walls, gears, barrels, nests, and 2,600 units live!
      this.camera.fov = isPortrait ? 56 : 50;
      const targetX = isPortrait ? -0.8 : -2.2;
      const targetY = isPortrait ? -1.4 : -1.6;
      const targetZ = isPortrait ? 4.8 : 5.4;
      const offsetX = (isPortrait ? 8.8 : 12.6) * zoom;
      const offsetY = (isPortrait ? 20.4 : 19.8) * zoom;
      const offsetZ = (isPortrait ? 29.2 : 28.8) * zoom;
      this.camera.position.set(targetX + offsetX, targetY + offsetY, targetZ + offsetZ);
      this.camera.lookAt(targetX, targetY, targetZ);
    } else if (this.cameraMode === 1) {
      // Classic Centered 3D Toy-Box Battle Perspective
      this.camera.fov = isPortrait ? 58 : 54;
      const targetY = isPortrait ? -1.6 : -2.2;
      const targetZ = isPortrait ? 5.8 : 6.6;
      const offsetY = (isPortrait ? 20.2 : 19.8) * zoom;
      const offsetZ = (isPortrait ? 28.0 : 27.6) * zoom;
      this.camera.position.set(0, targetY + offsetY, targetZ + offsetZ);
      this.camera.lookAt(0, targetY, targetZ);
    } else {
      // Ultra-Low Over-the-Shoulder Action Cam
      this.camera.fov = isPortrait ? 50 : 45;
      const targetY = 0.8;
      const targetZ = 0.5;
      this.camera.position.set(0, targetY + 10.2 * zoom, targetZ + 30.5 * zoom);
      this.camera.lookAt(0, targetY, targetZ);
    }

    this.baseCameraPos.copy(this.camera.position);
    this.camera.updateProjectionMatrix();
  }

  public addCameraShake(amount: number): void {
    this.cameraShake = Math.min(1.85, this.cameraShake + amount);
  }

  public triggerContinuousQuake(duration: number, intensity = 1.4): void {
    this.quakeTimer = Math.max(this.quakeTimer, duration);
    this.quakeMaxTimer = Math.max(this.quakeMaxTimer, duration);
    this.quakeIntensity = Math.max(this.quakeIntensity, intensity);
    this.cameraShake = Math.max(this.cameraShake, intensity);
    document.body.classList.add('screen-quake-active');
  }

  public triggerScreenFlash(cssColor: string, opacity = 0.65): void {
    if (!this.fxFlashEl) return;
    this.fxFlashEl.style.background = `radial-gradient(circle at 50% 50%, ${cssColor} 0%, transparent 78%)`;
    this.fxFlashEl.style.opacity = `${opacity}`;
    setTimeout(() => {
      if (this.fxFlashEl) this.fxFlashEl.style.opacity = '0';
    }, 60);
  }

  public spawnSkyPillar(x: number, z: number, hexColor: number, maxRadius = 1.8, maxLife = 0.45): void {
    this.spawnCombatLight(x, 2.6, z, hexColor, Math.min(14, maxRadius * 4.5), 16, maxLife);
    for (let i = 0; i < MAX_SKY_PILLARS; i++) {
      const sp = this.skyPillars[i];
      if (!sp.active) {
        sp.active = true;
        sp.life = 0;
        sp.maxLife = maxLife;
        sp.maxRadius = maxRadius;
        sp.mat.color.setHex(hexColor);
        sp.mat.opacity = 0.92;
        sp.mesh.position.set(x, 0, z);
        sp.mesh.scale.set(maxRadius * 0.25, 1, maxRadius * 0.25);
        sp.mesh.visible = true;
        return;
      }
    }
  }

  public spawnShockwave(x: number, z: number, hexColor: number, maxRadius = 2.6, maxLife = 0.38): void {
    if (maxRadius >= 2.8) {
      this.spawnCombatLight(x, 1.6, z, hexColor, Math.min(11, maxRadius * 1.8), 13, maxLife);
    }
    for (let i = 0; i < MAX_SHOCKWAVES; i++) {
      const sw = this.shockwaves[i];
      if (!sw.active) {
        sw.active = true;
        sw.life = 0;
        sw.maxLife = maxLife;
        sw.maxRadius = maxRadius;
        sw.mat.color.setHex(hexColor);
        sw.mat.opacity = 0.95;
        sw.mesh.position.set(x, 0.14, z);
        sw.mesh.scale.set(0.25, 0.25, 0.25);
        sw.mesh.visible = true;
        return;
      }
    }
  }

  public isHoldingFireInput(): boolean {
    if (this.isPaused || this.isStageEnded) return false;
    return (
      this.isPointerDown ||
      this.keysDown.has('Space') ||
      this.keysDown.has('KeyW') ||
      this.keysDown.has('ArrowUp')
    );
  }

  public isSteeringInput(): boolean {
    if (this.isPaused || this.isStageEnded) return false;
    return (
      this.keysDown.has('KeyA') ||
      this.keysDown.has('KeyD') ||
      this.keysDown.has('ArrowLeft') ||
      this.keysDown.has('ArrowRight')
    );
  }

  private bindInput(): void {
    const updateTurretFromPointer = (clientX: number, _clientY: number) => {
      const rect = this.canvas.getBoundingClientRect();
      if (rect.width <= 768) {
        // On mobile/narrow screens, map horizontal finger position across [8%, 92%] of screen width directly to full rail width
        const norm = ((clientX - rect.left) / Math.max(1, rect.width) - 0.5) / 0.82;
        this.turretTargetX = THREE.MathUtils.clamp(
          norm * (TRACK_HALF_W - 1.2) * 2,
          -TRACK_HALF_W + 1.2,
          TRACK_HALF_W - 1.2
        );
        return;
      }

      // Project left and right endpoints of the 3D turret rail at PLAYER_Z into screen NDC space
      // so the 3D turret aligns 1:1 with the cursor X in both Diagonal 3/4 and Centered camera modes!
      const minRailX = -TRACK_HALF_W + 1.2;
      const maxRailX = TRACK_HALF_W - 1.2;
      const pointerNdcX = ((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      this.tempVec.set(minRailX, 0.8, PLAYER_Z).project(this.camera);
      const leftNdcX = this.tempVec.x;
      this.tempVec.set(maxRailX, 0.8, PLAYER_Z).project(this.camera);
      const rightNdcX = this.tempVec.x;
      const spanNdcX = Math.abs(rightNdcX - leftNdcX) > 0.04 ? rightNdcX - leftNdcX : 1.0;
      const t = THREE.MathUtils.clamp((pointerNdcX - leftNdcX) / spanNdcX, 0, 1);
      this.turretTargetX = THREE.MathUtils.lerp(minRailX, maxRailX, t);
    };

    const handleReleaseSummonHero = () => {
      const shouldSummon =
        (this.isPointerDown || this.wasHoldingFire) &&
        !this.isPaused &&
        !this.isStageEnded &&
        this.state.championCharge >= 100;
      this.isPointerDown = false;
      if (!this.isHoldingFireInput()) {
        this.wasHoldingFire = false;
      }
      if (shouldSummon) {
        if (this.deployChampion()) {
          this.spawnFloatingPopup(this.turretX, 2.5, PLAYER_Z - 1.2, '⚡ 松手召唤英雄!', '#facc15');
        }
      }
    };

    this.canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      this.isPointerDown = true;
      this.wasHoldingFire = true;
      updateTurretFromPointer(e.clientX, e.clientY);
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.isPointerDown) return;
      updateTurretFromPointer(e.clientX, e.clientY);
    });

    window.addEventListener('pointerup', () => {
      handleReleaseSummonHero();
    });

    window.addEventListener('pointercancel', () => {
      this.isPointerDown = false;
      if (!this.isHoldingFireInput()) {
        this.wasHoldingFire = false;
      }
    });

    this.canvas.addEventListener(
      'touchstart',
      (e) => {
        if (e.touches.length > 0) {
          this.isPointerDown = true;
          this.wasHoldingFire = true;
          updateTurretFromPointer(e.touches[0].clientX, e.touches[0].clientY);
        }
      },
      { passive: true }
    );

    this.canvas.addEventListener(
      'touchmove',
      (e) => {
        if (e.touches.length > 0) {
          e.preventDefault();
          updateTurretFromPointer(e.touches[0].clientX, e.touches[0].clientY);
        }
      },
      { passive: false }
    );

    window.addEventListener('touchend', () => {
      handleReleaseSummonHero();
    });

    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      const activeTag = (document.activeElement as HTMLElement | null)?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') return;

      this.keysDown.add(e.code);
      if (this.isPaused || this.isStageEnded) return;

      if (e.code === 'Space') {
        e.preventDefault();
        // If already at 100% when first pressing Space (not repeat), deploy immediately;
        // otherwise holding Space charges the bar and releasing Space at 100% summons the Hero!
        if (!e.repeat && this.state.championCharge >= 100) {
          this.wasHoldingFire = false;
          this.deployChampion();
        } else {
          this.wasHoldingFire = true;
        }
      } else if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        this.wasHoldingFire = true;
      } else if (e.code === 'KeyQ') {
        e.preventDefault();
        this.triggerOrbitalStrike();
      } else if (e.code === 'KeyC') {
        e.preventDefault();
        this.summonMechaOverlord();
      } else if (e.code === 'KeyV') {
        e.preventDefault();
        this.triggerTacticalSubWeapon();
      } else if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        this.turretTargetX = 0;
      }
    });

    window.addEventListener('keyup', (e) => {
      const wasHoldChargeKey =
        e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp';
      this.keysDown.delete(e.code);
      if (wasHoldChargeKey && !this.isHoldingFireInput()) {
        const shouldSummon =
          this.wasHoldingFire &&
          !this.isPaused &&
          !this.isStageEnded &&
          this.state.championCharge >= 100;
        this.wasHoldingFire = false;
        if (shouldSummon) {
          if (this.deployChampion()) {
            this.spawnFloatingPopup(this.turretX, 2.5, PLAYER_Z - 1.2, '⚡ 松手召唤英雄!', '#facc15');
          }
        }
      }
    });

    const onResize = () => {
      const nativeDpr = window.devicePixelRatio || 1;
      const dpr = this.lowSpecMode
        ? Math.min(Math.max(nativeDpr, 1.5), 2.0)
        : !this.usePostProcessing
          ? Math.min(Math.max(nativeDpr, 1.75), 2.25)
          : this.isMobileDevice
            ? Math.min(Math.max(nativeDpr, 1.5), 2.0)
            : Math.min(Math.max(nativeDpr, 2.0), 2.5);
      this.renderer.setPixelRatio(dpr);
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.composer.setPixelRatio(dpr);
      this.composer.setSize(window.innerWidth, window.innerHeight);
      this.bloomPass.resolution.set(
        Math.floor(window.innerWidth * dpr * 0.5),
        Math.floor(window.innerHeight * dpr * 0.5)
      );
      if (this.cinemaPass?.uniforms?.uResolution) {
        this.cinemaPass.uniforms.uResolution.value.set(
          window.innerWidth * dpr,
          window.innerHeight * dpr
        );
      }
      this.applyCameraTransform();
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', () => setTimeout(onResize, 120));
  }

  public spawnUnit(
    team: 'blue' | 'red',
    kind: 'normal' | 'charged' | 'champion' | 'brute' | 'baneling' | 'shaman',
    x: number,
    z: number,
    vx = 0,
    vz = 0,
    inheritedGates?: Set<string>,
    isMiniGiant = false,
    initialFusionTier?: number
  ): Unit | null {
    // Find free slot
    let slot: Unit | null = null;
    for (let i = 0; i < MAX_UNITS; i++) {
      if (!this.units[i].active) {
        slot = this.units[i];
        break;
      }
    }
    if (!slot) return null;

    const pwr = team === 'blue' ? this.state.getPowerMultiplier() : 1;
    const champMult = this.state.getChampionMultiplier();
    const giantSpec = team === 'blue' ? this.state.getGiantTrooperSpec() : null;
    const airdropGiantBuff = team === 'blue' && this.frontlineGiantsTimer > 0 && kind !== 'champion';
    const effectiveMiniGiant = isMiniGiant || airdropGiantBuff;

    slot.active = true;
    slot.id = this.nextUnitId++;
    slot.team = team;
    slot.kind = kind;
    slot.mechaType = kind === 'champion' ? this.state.mechaMode : undefined;
    slot.isMiniGiant = effectiveMiniGiant || Boolean(giantSpec?.isGiantMode && kind !== 'champion');
    slot.jellyGiant = false;
    slot.frostShield = false;
    slot.scatterBounceLeft = 0;
    const rolledStartTier =
      giantSpec?.isGiantMode && giantSpec.t4DirectTier2Chance > 0 && Math.random() < giantSpec.t4DirectTier2Chance
        ? 2
        : giantSpec?.startFusionTier || 1;
    slot.fusionTier =
      team === 'blue' && kind !== 'champion'
        ? initialFusionTier ?? (giantSpec?.isGiantMode ? rolledStartTier : effectiveMiniGiant ? 1 : 0)
        : 0;
    slot.fusionCooldown = inheritedGates && inheritedGates.size > 0 ? 1.15 : 0.45;
    slot.empTimer = 0;
    slot.tailwindBoostTimer = 0;
    slot.frostingBurstTimer = 0;
    slot.electroNetTimer = 0;
    slot.syrupSlowTimer = 0;
    slot.syrupVulnMult = 1;
    slot.vanguardSurgeTimer = 0;
    slot.cannonModTag = undefined;
    slot.mortarSiegeBonusMult = 1;
    slot.x = THREE.MathUtils.clamp(x, -TRACK_HALF_W + 0.6, TRACK_HALF_W - 0.6);
    slot.z = z;
    slot.vx = vx;
    slot.vz = vz;
    slot.yaw = Math.atan2(vx, vz !== 0 ? vz : team === 'blue' ? -1 : 1);
    slot.turnRate = 0;
    slot.walkPhase = (slot.id * 1.37) % (Math.PI * 2);
    slot.attackAnim = 0;
    slot.spawnHop = inheritedGates && inheritedGates.size > 0 ? 1.35 : 0.45;
    slot.age = 0;
    slot.attackCooldown = 0;
    slot.specialTimer = 0;
    slot.passedGates.clear();
    if (inheritedGates) {
      for (const gid of inheritedGates) slot.passedGates.add(gid);
    }

    if (team === 'blue') {
      const speedMult = this.state.getMoveSpeedMultiplier();
      const swarmSpec = this.state.getSwarmTrooperSpec();
      const bastionSpec = this.state.getBastionTrooperSpec();
      const techBonuses = this.state.getBoboTechCombatBonuses();
      const airshipMedalHpMult = this.state.getAirshipMilestoneBonus().troopHpMult;
      const emeraldHpMult = (this.currentTheme.id === 'emerald' ? 1.25 : 1.0) * airshipMedalHpMult;
      const plasmaCritMult = 1 + this.state.getSkillNodeRank('plasma_t1') * 0.16;
      this.state.stageClonesSpawned++;
      this.state.runSpawnsPool++;
      if (kind !== 'champion' && techBonuses.frontlineShieldChance > 0 && (!inheritedGates || inheritedGates.size === 0)) {
        if (Math.random() < techBonuses.frontlineShieldChance) {
          slot.frostShield = true;
        }
      }
      if (kind === 'champion') {
        const mode = slot.mechaType || 'hammer';
        slot.maxHp = (mode === 'aegis' ? 320 : mode === 'pyro' ? 210 : 245) * champMult * emeraldHpMult;
        slot.hp = slot.maxHp;
        slot.dmg = (mode === 'hammer' ? 58 : mode === 'pyro' ? 38 : 42) * champMult;
        slot.radius = 0.72;
        slot.speed = (mode === 'pyro' ? 7.4 : 6.8) * speedMult;
      } else if (giantSpec?.isGiantMode) {
        // Titan Branch: Deterministic, bounded Giant Tier stats (prevents runaway compounding!)
        const tier = Math.max(1, slot.fusionTier || 1);
        const tierStats = this.computeGiantTierStats(tier, kind === 'charged');
        if (tier >= 2) slot.kind = 'charged';
        slot.maxHp = tierStats.maxHp * emeraldHpMult * techBonuses.boboHpMult;
        slot.hp = slot.maxHp;
        slot.dmg = tierStats.dmg;
        slot.radius = tierStats.radius;
        slot.speed = (6.6 + tier * 0.14) * speedMult;
      } else if (effectiveMiniGiant) {
        // Tycoon T4 / Bastion Guard / Airdrop Frontline Mini-Giant
        slot.maxHp = 52 * pwr * bastionSpec.trooperHpMult * emeraldHpMult * techBonuses.boboHpMult;
        slot.hp = slot.maxHp;
        slot.dmg = 30 * pwr;
        slot.radius = 0.46;
        slot.speed = 7.5 * speedMult;
      } else if (kind === 'charged') {
        slot.maxHp = 38 * pwr * swarmSpec.hpMult * bastionSpec.trooperHpMult * emeraldHpMult * techBonuses.boboHpMult;
        slot.hp = slot.maxHp;
        slot.dmg = 26 * pwr * swarmSpec.dmgMult * plasmaCritMult;
        slot.radius = swarmSpec.isSwarmMode ? 0.3 : 0.34;
        slot.speed = (this.state.getSkillNodeRank('plasma_t1') > 0 ? 8.5 : 8.0) * speedMult;
      } else {
        slot.maxHp = 16 * pwr * swarmSpec.hpMult * bastionSpec.trooperHpMult * emeraldHpMult * techBonuses.boboHpMult;
        slot.hp = slot.maxHp;
        slot.dmg = 12 * pwr * swarmSpec.dmgMult;
        slot.radius = swarmSpec.isSwarmMode ? 0.27 : 0.31;
        slot.speed = 7.4 * speedMult;
      }
    } else {
      const stage = this.currentLevel?.isGearTournament
        ? (this.currentLevel.tournamentStage === 3 ? 5 : this.currentLevel.tournamentStage === 2 ? 3 : 2) +
          (Math.max(1, Math.floor((this.currentLevel.id || 11) / 10)) - 1) * 2
        : Math.max(1, this.currentLevel?.id || 1);
      // Steeper exponential enemy scaling so mid-to-late stages challenge upgraded armies!
      const stageHpCurve = Math.pow(1.135, Math.min(40, stage - 1));
      const stageDmgCurve = Math.pow(1.095, Math.min(40, stage - 1));
      if (kind === 'brute') {
        slot.maxHp = Math.round((125 + stage * 28) * stageHpCurve);
        slot.hp = slot.maxHp;
        slot.dmg = Math.round((25 + (stage - 1) * 2.4) * stageDmgCurve);
        slot.radius = 0.75;
        slot.speed = Math.min(4.2, 3.15 + (stage - 1) * 0.032);
      } else if (kind === 'baneling') {
        // Fast, fragile green bio-exploder mutant that detonates in an AOE acid splash on contact!
        slot.maxHp = Math.max(11, Math.round((12 + (stage - 1) * 1.6) * stageHpCurve));
        slot.hp = slot.maxHp;
        slot.dmg = Math.round((15 + (stage - 1) * 1.5) * stageDmgCurve);
        slot.radius = 0.34;
        slot.speed = Math.min(5.6, 4.55 + (stage - 1) * 0.038);
      } else if (kind === 'shaman') {
        // Support Hive Shaman priest that periodically pulses a healing/speed aura to nearby Red units
        slot.maxHp = Math.round((58 + stage * 12.0) * stageHpCurve);
        slot.hp = slot.maxHp;
        slot.dmg = Math.round((16 + (stage - 1) * 1.5) * stageDmgCurve);
        slot.radius = 0.46;
        slot.speed = Math.min(4.0, 3.05 + (stage - 1) * 0.025);
      } else {
        slot.maxHp = Math.round((21 + (stage - 1) * 2.4) * stageHpCurve);
        slot.hp = slot.maxHp;
        slot.dmg = Math.round((14 + (stage - 1) * 1.4) * stageDmgCurve);
        slot.radius = 0.31;
        slot.speed = Math.min(4.6, 3.55 + (stage - 1) * 0.035);
      }
    }

    return slot;
  }

  /**
   * Finds the centroid (x, z) of the densest active Red enemy cluster within a (radiusX, radiusZ) footprint.
   * Ensures that even small-radius Tier 0 ('雏形') Ultimates always lock onto the thickest enemy pack!
   */
  private findDensestRedCluster(
    radiusX: number,
    radiusZ: number,
    excludeCenter?: { x: number; z: number; minDist: number }
  ): { x: number; z: number; count: number } {
    const candidates: Unit[] = [];
    if (this.activeRedIndices.length > 0) {
      for (let i = 0; i < this.activeRedIndices.length; i++) {
        const u = this.units[this.activeRedIndices[i]];
        if (u && u.active && u.team === 'red') candidates.push(u);
      }
    } else {
      for (let i = 0; i < MAX_UNITS; i++) {
        const u = this.units[i];
        if (u.active && u.team === 'red') candidates.push(u);
      }
    }

    const len = candidates.length;
    if (len === 0) {
      return { x: THREE.MathUtils.clamp(this.turretX * 0.5, -5.5, 5.5), z: -1.5, count: 0 };
    }

    const rx = Math.max(1.8, radiusX);
    const rz = Math.max(1.8, radiusZ);
    const step = Math.max(1, Math.floor(len / 64));

    let bestScore = -1;
    let bestX = candidates[0].x;
    let bestZ = candidates[0].z;
    let bestCount = 1;

    for (let i = 0; i < len; i += step) {
      const a = candidates[i];
      if (excludeCenter) {
        const edx = a.x - excludeCenter.x;
        const edz = a.z - excludeCenter.z;
        if (edx * edx + edz * edz < excludeCenter.minDist * excludeCenter.minDist) {
          continue;
        }
      }

      let score = 0;
      let sumX = 0;
      let sumZ = 0;
      let sumW = 0;
      let count = 0;

      for (let j = 0; j < len; j++) {
        const b = candidates[j];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        if (Math.abs(dx) > rx || Math.abs(dz) > rz) continue;
        const normDistSq = (dx / rx) * (dx / rx) + (dz / rz) * (dz / rz);
        if (normDistSq > 1.15) continue;

        const baseWeight =
          b.kind === 'brute' ? 3.0 : b.kind === 'shaman' ? 2.6 : b.kind === 'baneling' ? 1.35 : 1.0;
        const proximityFactor = 1.15 - 0.3 * Math.min(1, normDistSq);
        // Slight tie-breaker favoring clusters closer to the player defense line
        const threatFactor = 1 + Math.max(0, (b.z + 20) * 0.008);
        const w = baseWeight * proximityFactor * threatFactor;

        score += w;
        sumX += b.x * w;
        sumZ += b.z * w;
        sumW += w;
        count++;
      }

      if (score > bestScore && sumW > 0) {
        bestScore = score;
        bestX = sumX / sumW;
        bestZ = sumZ / sumW;
        bestCount = count;
      }
    }

    return {
      x: THREE.MathUtils.clamp(bestX, -TRACK_HALF_W + 1.0, TRACK_HALF_W - 1.0),
      z: THREE.MathUtils.clamp(bestZ, BOSS_GATE_Z + 1.0, PLAYER_Z - 1.8),
      count: bestCount,
    };
  }

  public deployChampion(): boolean {
    if (this.state.championCharge < 100 || this.isStageEnded) return false;
    this.state.championCharge = 0;
    this.mascotCheerBoost = 1.5;
    sound.playChampionSpawn();
    const spec = this.state.getMechaSpec();
    const ultEvo = this.state.getUltimateEvolutionSpec();
    const isTwinTitans = this.state.getSkillNodeRank('titan_t4') > 0;
    const slamRad = 4.6 * ultEvo.radiusMult;
    const denseCluster = this.findDensestRedCluster(slamRad, slamRad);
    const spawnBaseX =
      denseCluster.count > 0
        ? THREE.MathUtils.clamp(
            THREE.MathUtils.lerp(this.turretX, denseCluster.x, 0.72),
            -TRACK_HALF_W + 1.5,
            TRACK_HALF_W - 1.5
          )
        : this.turretX;
    const impactX = denseCluster.count > 0 ? denseCluster.x : spawnBaseX;
    const impactZ = denseCluster.count > 0 ? denseCluster.z : PLAYER_Z - 1.6;

    const champ = this.spawnUnit(
      'blue',
      'champion',
      isTwinTitans ? spawnBaseX - 1.35 : spawnBaseX,
      PLAYER_Z - 1.6,
      isTwinTitans ? -0.6 : 0,
      -9.0
    );

    // Titan T4 Keystone: Twin God-Machines (airdrops a 2nd 45%-stat complementary Titan alongside the main Titan!)
    if (isTwinTitans) {
      const partner = this.spawnUnit('blue', 'champion', spawnBaseX + 1.35, PLAYER_Z - 1.6, 0.6, -9.0);
      if (partner) {
        partner.mechaType = spec.id === 'hammer' ? 'pyro' : spec.id === 'pyro' ? 'hammer' : 'hammer';
        partner.maxHp *= 0.45;
        partner.hp = partner.maxHp;
        partner.dmg *= 0.45;
      }
      this.spawnSkyPillar(spawnBaseX + 1.35, PLAYER_Z - 1.6, 0xf97316, 3.4, 0.65);
      this.spawnFloatingPopup(spawnBaseX, 2.8, PLAYER_Z - 2.0, '👑 双子神机协同降临!', '#facc15');
    }

    // Orbital T3: Trinity Overdrive after casting any Ultimate skill + refund charge to Orbital Strike!
    const overdriveRank = this.state.getSkillNodeRank('orbital_t3');
    if (overdriveRank > 0) {
      this.skillOverdriveTimer = Math.max(this.skillOverdriveTimer, 1.5 + overdriveRank * 1.3);
      this.state.orbitalCharge = Math.min(100, this.state.orbitalCharge + 8 + overdriveRank * 6);
    }

    const committedBranch = this.state.getCommittedSkillBranch();
    const branchColorMap: Record<string, { hex: number; css: string }> = {
      swarm: { hex: 0x38bdf8, css: '#38bdf8' },
      titan: { hex: 0xf97316, css: '#f97316' },
      gate: { hex: 0x22d3ee, css: '#22d3ee' },
      plasma: { hex: 0xfacc15, css: '#facc15' },
      orbital: { hex: 0xd946ef, css: '#d946ef' },
      bastion: { hex: 0x4ade80, css: '#4ade80' },
      tycoon: { hex: 0xfacc15, css: '#facc15' },
    };
    const bTheme = committedBranch ? branchColorMap[committedBranch.id] : undefined;
    const fxColor = bTheme ? bTheme.hex : spec.id === 'pyro' ? 0xf97316 : spec.id === 'aegis' ? 0x22c55e : 0x00f0ff;
    const cssFlash = bTheme ? bTheme.css : spec.id === 'pyro' ? '#f97316' : spec.id === 'aegis' ? '#22c55e' : '#00f0ff';

    // Progressive VFX & Range scaling by Ultimate Evolution Tier (0: 雏形 -> 1: 一阶 -> 2: 觉醒 -> 3: 👑完全体)
    if (ultEvo.tier === 0) {
      // Tier 0 (初始雏形): Restrained, localized drop — strikes densest cluster + spawn point, no full-screen quake
      this.addCameraShake(0.32);
      this.triggerScreenFlash(cssFlash, 0.26);
      this.spawnShockwave(spawnBaseX, PLAYER_Z - 1.6, fxColor, 3.0, 0.32);
      this.spawnBurstParticles(spawnBaseX, 1.0, PLAYER_Z - 1.6, fxColor, 14);
    } else if (ultEvo.tier === 1) {
      // Tier 1 (一阶强化): Moderate drop + 1 sky beam + 1 follow-up stomp wave
      this.triggerContinuousQuake(0.45, 0.72);
      this.triggerScreenFlash(cssFlash, 0.42);
      this.spawnSkyPillar(spawnBaseX, PLAYER_Z - 1.6, fxColor, 1.9, 0.42);
      this.spawnShockwave(spawnBaseX, PLAYER_Z - 1.6, fxColor, 5.2, 0.45);
      this.spawnBurstParticles(spawnBaseX, 1.1, PLAYER_Z - 1.6, fxColor, 36);
    } else if (ultEvo.tier === 2) {
      // Tier 2 (二阶觉醒): Strong drop + dual shockwaves + 2 follow-up stomp waves
      this.triggerContinuousQuake(0.85, 1.05);
      this.triggerScreenFlash(cssFlash, 0.62);
      this.spawnSkyPillar(spawnBaseX, PLAYER_Z - 1.6, fxColor, 2.7, 0.54);
      this.spawnShockwave(spawnBaseX, PLAYER_Z - 1.6, fxColor, 7.2, 0.52);
      this.spawnShockwave(impactX, impactZ, 0xfacc15, 4.4, 0.38);
      this.spawnBurstParticles(spawnBaseX, 1.2, PLAYER_Z - 1.6, fxColor, 64);
    } else {
      // Tier 3 (👑完全体): Full-screen 1.45s earthquake + 3 sky pillars + 3 shockwaves + 4 rolling stomp waves!
      this.triggerContinuousQuake(1.45, 1.42);
      this.triggerScreenFlash(cssFlash, 0.82);
      this.spawnSkyPillar(spawnBaseX, PLAYER_Z - 1.6, fxColor, 3.8, 0.65);
      this.spawnSkyPillar(impactX - 2.6, impactZ, 0xfacc15, 2.1, 0.52);
      this.spawnSkyPillar(impactX + 2.6, impactZ, 0xfacc15, 2.1, 0.52);
      this.spawnBurstParticles(spawnBaseX, 1.2, PLAYER_Z - 1.6, fxColor, 95);
      this.spawnBurstParticles(impactX, 1.6, impactZ, 0xfacc15, 55);
      this.spawnShockwave(spawnBaseX, PLAYER_Z - 1.6, fxColor, 9.5, 0.62);
      this.spawnShockwave(impactX, impactZ, 0xffffff, 6.4, 0.48);
      this.spawnShockwave(impactX, impactZ, 0xfacc15, 3.8, 0.36);
    }

    // Trigger immediate Hammer Morph impact directly on the densest enemy cluster!
    if (champ && champ.active) {
      this.triggerHammerSlam(champ, true, denseCluster.count > 0 ? { x: impactX, z: impactZ } : undefined);
    }

    // Follow-up seismic stomp waves: 0 waves at Tier 0 -> 1 at Tier 1 -> 2 at Tier 2 -> 4 at Tier 3 (👑完全体)!
    // Each follow-up wave locks onto the densest surviving enemy cluster!
    const allStompDelays = [0.22, 0.46, 0.72, 1.0];
    const stompDelays = allStompDelays.slice(0, ultEvo.hammerAftershockWaves);
    stompDelays.forEach((delay, wIdx) => {
      this.skillWaveQueue.push({
        delay,
        exec: () => {
          const hitRadius = 3.0 + ultEvo.tier * 0.85;
          const waveCluster = this.findDensestRedCluster(hitRadius, hitRadius);
          const cx =
            waveCluster.count > 0 ? waveCluster.x : champ && champ.active ? champ.x : this.turretX;
          const cz =
            waveCluster.count > 0
              ? waveCluster.z
              : champ && champ.active
                ? champ.z - 0.8
                : PLAYER_Z - 3.2 - wIdx * 2.5;
          sound.playExplosion();
          this.addCameraShake(ultEvo.isCompleteForm ? 0.95 : 0.55);
          if (ultEvo.isCompleteForm) {
            this.triggerScreenFlash(wIdx % 2 === 0 ? cssFlash : '#facc15', 0.55);
            this.spawnSkyPillar(THREE.MathUtils.clamp(cx - 3.4, -9.5, 9.5), cz - 0.8, 0xfacc15, 1.8, 0.45);
            this.spawnSkyPillar(THREE.MathUtils.clamp(cx + 3.4, -9.5, 9.5), cz - 0.8, 0xfacc15, 1.8, 0.45);
          }
          this.spawnSkyPillar(cx, cz, fxColor, 1.8 + ultEvo.tier * 0.35, 0.45);
          const waveRad = 4.8 + ultEvo.tier * 1.9;
          this.spawnShockwave(cx, cz, fxColor, waveRad, 0.48);
          this.spawnBurstParticles(cx, 1.1, cz, fxColor, 24 + ultEvo.tier * 14);

          // Knockback & damage Red enemies caught in the Titan's rolling seismic aftershocks!
          const r2 = hitRadius * hitRadius;
          const hpRatioDmg = 0.1 + ultEvo.tier * 0.05;
          for (let i = 0; i < MAX_UNITS; i++) {
            const e = this.units[i];
            if (!e.active || e.team !== 'red') continue;
            if ((e.x - cx) ** 2 + (e.z - cz) ** 2 <= r2) {
              e.hp -= e.maxHp * hpRatioDmg;
              e.vz -= 3.5 + ultEvo.tier * 0.7;
              if (e.hp <= 0) {
                e.active = false;
                this.onUnitKilled(e);
              }
            }
          }
        },
      });
    });

    // Tycoon T4 Keystone: Casting any skill automatically airdrops 5 Golden Royal Mercenaries!
    if (this.state.getSkillNodeRank('tycoon_t4') > 0) {
      this.spawnSkyPillar(spawnBaseX, PLAYER_Z - 2.4, 0xfacc15, 2.2, 0.45);
      this.spawnUnit('blue', 'charged', spawnBaseX, PLAYER_Z - 2.2, 0, -8.5, undefined, true);
      for (const ox of [-2.2, -0.8, 0.8, 2.2]) {
        const mx = THREE.MathUtils.clamp(spawnBaseX + ox, -TRACK_HALF_W + 1.0, TRACK_HALF_W - 1.0);
        this.spawnUnit('blue', 'charged', mx, PLAYER_Z - 2.0, (Math.random() - 0.5) * 0.8, -8.8);
      }
      this.spawnFloatingPopup(spawnBaseX, 2.6, PLAYER_Z - 2.4, '👑 财阀大招空投5只招财精英!', '#facc15');
    }

    const morphTitle = committedBranch ? `【${ultEvo.badge}·${committedBranch.hammerMorphName}】` : `【${ultEvo.badge}·${spec.name}】`;
    const morphSub =
      ultEvo.tier === 0
        ? '已精准锁定敌群密集区 · 升级技能树与局内泰坦解锁【👑完全体】全屏威能！'
        : committedBranch
          ? committedBranch.hammerMorphDesc
          : '连环震波已锁定敌群密集区 · 全线碾压推进！';
    this.onBanner?.(`${spec.icon} ${morphTitle}出击！`, morphSub);
    return true;
  }

  public triggerOrbitalStrike(): boolean {
    if (this.state.orbitalCharge < 100 || this.isStageEnded) return false;
    this.state.orbitalCharge = 0;
    sound.playOrbitalStrike();

    const ultEvo = this.state.getUltimateEvolutionSpec();
    const committedBranch = this.state.getCommittedSkillBranch();
    const bId = committedBranch?.id;
    const empRank = this.state.getSkillNodeRank('orbital_t2');
    const overdriveRank = this.state.getSkillNodeRank('orbital_t3');
    if (overdriveRank > 0) {
      this.skillOverdriveTimer = Math.max(this.skillOverdriveTimer, 1.5 + overdriveRank * 1.3);
      this.state.championCharge = Math.min(100, this.state.championCharge + 8 + overdriveRank * 6);
    }
    const isScorchedEarth = this.state.getSkillNodeRank('orbital_t4') > 0;
    if (isScorchedEarth || (bId === 'orbital' && ultEvo.tier >= 2)) {
      this.scorchedEarthTimer = isScorchedEarth ? 4.5 : 2.0;
      this.scorchedEarthTickTimer = 0.35;
    }

    // Automatically locate the densest Red enemy cluster so even compact Tier 0 ('雏形') strikes hit maximum enemies!
    const primaryCluster = this.findDensestRedCluster(ultEvo.orbitalXHalfSpan, ultEvo.orbitalZHalfSpan);
    const targetX = primaryCluster.x;
    const targetZ = primaryCluster.z;
    const secondaryCluster = this.findDensestRedCluster(ultEvo.orbitalXHalfSpan, ultEvo.orbitalZHalfSpan, {
      x: targetX,
      z: targetZ,
      minDist: 4.8,
    });
    const clampTrackX = (x: number) => THREE.MathUtils.clamp(x, -TRACK_HALF_W + 1.0, TRACK_HALF_W - 1.0);
    const clampTrackZ = (z: number) => THREE.MathUtils.clamp(z, BOSS_GATE_Z + 1.0, PLAYER_Z - 1.8);

    // Branch-specific primary & secondary color themes for Orbital Bombardment!
    const orbitalThemeMap: Record<string, { flash: string; c1: number; c2: number }> = {
      swarm: { flash: '#38bdf8', c1: 0x38bdf8, c2: 0x2dd4bf },
      titan: { flash: '#f97316', c1: 0xf97316, c2: 0xfacc15 },
      gate: { flash: '#22d3ee', c1: 0x22d3ee, c2: 0xd946ef },
      plasma: { flash: '#facc15', c1: 0xfacc15, c2: 0x00f0ff },
      orbital: { flash: '#d946ef', c1: 0xd946ef, c2: 0x00f0ff },
      bastion: { flash: '#4ade80', c1: 0x4ade80, c2: 0xfacc15 },
      tycoon: { flash: '#facc15', c1: 0xfacc15, c2: 0xfef08a },
    };
    const oTheme = (bId && orbitalThemeMap[bId]) || { flash: '#d946ef', c1: 0xd946ef, c2: 0x00f0ff };

    // Progressive VFX & Range scaling by Ultimate Evolution Tier (0: 雏形 -> 1: 一阶 -> 2: 觉醒 -> 3: 👑完全体)
    // Centered directly on the densest Red enemy cluster (targetX, targetZ)!
    if (ultEvo.tier === 0) {
      // Tier 0 (初始雏形): Modest single-zone tactical beam locked directly onto (targetX, targetZ)!
      this.addCameraShake(0.38);
      this.triggerScreenFlash(oTheme.flash, 0.28);
      this.spawnSkyPillar(targetX, targetZ, oTheme.c1, 1.55, 0.44);
      this.spawnSkyPillar(clampTrackX(targetX + 1.15), clampTrackZ(targetZ - 1.1), oTheme.c2, 1.15, 0.36);
      this.spawnShockwave(targetX, targetZ, oTheme.c1, 5.2, 0.42);
      this.spawnBurstParticles(targetX, 1.0, targetZ, oTheme.c1, 24);
    } else if (ultEvo.tier === 1) {
      // Tier 1 (一阶强化): 4-beam strike centered around (targetX, targetZ) + moderate quake
      this.triggerContinuousQuake(0.65, 0.85);
      this.triggerScreenFlash(oTheme.flash, 0.48);
      this.spawnShockwave(targetX, targetZ, oTheme.c1, 9.2, 0.52);
      for (const [bx, bz, col] of [
        [targetX, targetZ, oTheme.c1],
        [clampTrackX(targetX - 2.6), clampTrackZ(targetZ - 1.8), oTheme.c2],
        [clampTrackX(targetX + 2.6), clampTrackZ(targetZ - 1.8), oTheme.c2],
        [secondaryCluster.x, secondaryCluster.z, 0xfacc15],
      ] as Array<[number, number, number]>) {
        this.spawnSkyPillar(bx, bz, col, 2.0, 0.48);
        this.spawnShockwave(bx, bz, col, 4.2, 0.42);
        this.spawnBurstParticles(bx, 1.1, bz, col, 24);
      }
    } else if (ultEvo.tier === 2) {
      // Tier 2 (二阶觉醒): Wide 6-beam bombardment centered on primary & secondary dense clusters + 1.15s quake
      this.triggerContinuousQuake(1.15, 1.2);
      this.triggerScreenFlash(oTheme.flash, 0.68);
      this.spawnShockwave(targetX, targetZ, oTheme.c1, 12.8, 0.62);
      this.spawnShockwave(secondaryCluster.x, secondaryCluster.z, oTheme.c2, 10.2, 0.54);
      for (const [bx, bz, col] of [
        [targetX, targetZ, oTheme.c1],
        [clampTrackX(targetX - 3.6), clampTrackZ(targetZ - 2.5), oTheme.c2],
        [clampTrackX(targetX + 3.6), clampTrackZ(targetZ - 2.5), oTheme.c2],
        [clampTrackX(targetX - 3.2), clampTrackZ(targetZ + 2.5), oTheme.c1],
        [clampTrackX(targetX + 3.2), clampTrackZ(targetZ + 2.5), oTheme.c1],
        [secondaryCluster.x, secondaryCluster.z, 0xfacc15],
      ] as Array<[number, number, number]>) {
        this.spawnSkyPillar(bx, bz, col, 2.5, 0.56);
        this.spawnShockwave(bx, bz, col, 5.2, 0.48);
        this.spawnBurstParticles(bx, 1.2, bz, col, 32);
      }
    } else {
      // Tier 3 (👑完全体): Full 2.05s earthquake + 8 sky pillars + triple mega shockwaves + 5 carpet waves!
      this.triggerContinuousQuake(2.05, 1.62);
      this.triggerScreenFlash(oTheme.flash, 0.9);
      this.spawnShockwave(targetX, targetZ, oTheme.c1, 16.0, 0.72);
      this.spawnShockwave(0, -8, oTheme.c2, 13.5, 0.64);
      this.spawnShockwave(0, 6, 0xfacc15, 11.5, 0.58);

      const strikeCoords: Array<[number, number, number]> = [
        [targetX, targetZ, oTheme.c1],
        [secondaryCluster.x, secondaryCluster.z, 0xfacc15],
        [-5.2, -9, oTheme.c2],
        [5.2, -9, oTheme.c2],
        [0, -11, 0xfacc15],
        [-5.0, 4, oTheme.c1],
        [5.0, 4, oTheme.c1],
        [0, 0, oTheme.c2],
      ];
      for (const [bx, bz, col] of strikeCoords) {
        this.spawnSkyPillar(bx, bz, col, 3.0, 0.65);
        this.spawnShockwave(bx, bz, col, 6.2, 0.54);
        this.spawnBurstParticles(bx, 1.2, bz, col, 42);
      }
    }

    if (this.bossShieldActive && ultEvo.tier >= 1) {
      this.shatterBossShield();
    } else if (this.bossShieldActive) {
      this.bossShieldHitsRemaining = Math.max(1, this.bossShieldHitsRemaining - 6);
    }

    const goldPerKillMult = bId === 'tycoon' ? 1.8 + this.state.getSkillNodeRank('tycoon_t1') * 0.4 : 0.5;
    const eliteBonusRatio = (bId === 'titan' ? 1.6 : bId === 'orbital' ? 1.45 : 1.0) * ultEvo.dmgMult;
    const pwr = this.state.getPowerMultiplier();
    // At Tier 0 (雏形) & Tier 1 (一阶), small monsters take bounded damage instead of unconditional map-wide instant death!
    const smallUnitFlatDmg =
      ultEvo.tier === 0 ? 52 * pwr : ultEvo.tier === 1 ? 115 * pwr : 999999;

    const sweepRedWave = (
      xCenter: number | null,
      zCenter: number | null,
      xHalfSpan: number,
      zHalfSpan: number,
      eliteDmgRatio: number
    ): number => {
      let count = 0;
      const pullX = xCenter ?? targetX;
      const pullZ = zCenter ?? targetZ;
      for (const u of this.units) {
        if (!u.active || u.team !== 'red') continue;
        if (xCenter !== null && Math.abs(u.x - xCenter) > xHalfSpan) continue;
        if (zCenter !== null && Math.abs(u.z - zCenter) > zHalfSpan) continue;

        // Large / Elite monsters (Brute & Shaman) are NEVER instant-killed by Orbital Strike!
        if (u.kind === 'brute' || u.kind === 'shaman') {
          const minSurviveHp = Math.max(15, u.maxHp * 0.24);
          if (u.hp > minSurviveHp) {
            u.hp = Math.max(minSurviveHp, u.hp - u.maxHp * eliteDmgRatio * eliteBonusRatio);
          }
          if (empRank > 0 || bId === 'plasma' || bId === 'orbital') {
            u.empTimer = Math.max(u.empTimer || 0, Math.max(2.0, empRank * 1.4));
          }
          // Orbital Black Hole morph: pull elites toward the dense cluster kill-zone!
          if (bId === 'orbital') {
            u.x = THREE.MathUtils.lerp(u.x, pullX, 0.28 + ultEvo.tier * 0.08);
            u.z = THREE.MathUtils.lerp(u.z, pullZ, 0.22 + ultEvo.tier * 0.05);
            u.spawnHop = 1.1;
          }
          u.vz -= 1.4 + ultEvo.tier * 0.4;
          this.spawnBurstParticles(u.x, 1.2, u.z, oTheme.c1, 6 + ultEvo.tier * 2);
        } else {
          u.hp -= smallUnitFlatDmg;
          if (u.hp <= 0) {
            u.active = false;
            count++;
            if (Math.random() < 0.55) {
              this.spawnBurstParticles(u.x, 0.7, u.z, oTheme.c1, 4 + ultEvo.tier);
            }
          } else {
            u.vz -= 2.2;
            u.spawnHop = 0.75;
          }
        }
      }
      if (count > 0) {
        this.state.stageMutantsKilled += count;
        this.state.runKillsPool += count;
        this.state.addGold(Math.max(1, Math.floor(count * goldPerKillMult)));
      }
      return count;
    };

    const initialEliteRatio = ultEvo.tier === 0 ? 0.045 : ultEvo.tier === 1 ? 0.065 : 0.085;
    const killed = sweepRedWave(
      ultEvo.tier >= 3 ? null : targetX,
      ultEvo.tier >= 3 ? null : targetZ,
      ultEvo.orbitalXHalfSpan,
      ultEvo.orbitalZHalfSpan,
      initialEliteRatio
    );
    if (primaryCluster.count > 0 && ultEvo.tier < 3 && killed > 0) {
      this.spawnFloatingPopup(targetX, 2.4, targetZ, `🎯 锁定敌群密集区 -${killed}敌!`, '#facc15');
    }
    let morphBannerTitle =
      killed > 0 ? `☄️ 【${ultEvo.badge}·天基轰炸】-${killed}敌` : `☄️ 【${ultEvo.badge}·天基轰炸】`;
    let morphBannerSub =
      ultEvo.tier === 0
        ? '已精准轰炸敌群最密集处 · 升级解锁【👑完全体】全屏歼星洗地！'
        : '高能轨道精准打击 · 重装精英巨兽血量削减！';

    // === 7-BRANCH ORBITAL STRIKE SIGNATURE MORPHS (Scaled by Ultimate Evolution Tier & Locked onto Densest Cluster!) ===
    if (bId === 'swarm') {
      // 1. Swarm Morph: 【深空虫群空投雨】— Airdrops pods of Clone Paratroopers centered on (targetX, targetZ)!
      const s1 = this.state.getSkillNodeRank('swarm_t1');
      const s2 = this.state.getSkillNodeRank('swarm_t2');
      const isChargedDrop = this.state.getSkillNodeRank('swarm_t4') > 0;
      const totalDrop = Math.max(3, Math.round((4 + s1 * 2 + s2 * 2) * (0.55 + ultEvo.tier * 0.22)));
      for (let i = 0; i < totalDrop; i++) {
        const dx = clampTrackX(targetX + ((i % 4) - 1.5) * 1.35 + (Math.random() - 0.5) * 0.5);
        const dz = clampTrackZ(targetZ + 1.4 - Math.floor(i / 4) * 1.8 + (Math.random() - 0.5) * 0.6);
        const u = this.spawnUnit('blue', isChargedDrop ? 'charged' : 'normal', dx, dz, (Math.random() - 0.5) * 1.5, -8.8);
        if (u) u.spawnHop = 1.55;
      }
      this.spawnFloatingPopup(targetX, 3.0, targetZ, `🌊 深空虫群空投雨[${ultEvo.badge}] +${totalDrop}名克隆兵!`, '#38bdf8');
      morphBannerTitle = `🌊 【${ultEvo.badge}·深空虫群空投雨】-${killed}`;
      morphBannerSub = `在敌群密集处空降 ${totalDrop} 名克隆敢死队${ultEvo.isCompleteForm ? ' · 👑完全体全屏空投！' : '！'}`;
    } else if (bId === 'titan') {
      // 2. Titan Morph: 【远古巨神天降】— Airdrops Fused Colossi directly onto the densest enemy cluster + Ascends Giants!
      const t2 = this.state.getSkillNodeRank('titan_t2');
      const t3 = this.state.getSkillNodeRank('titan_t3');
      const isT4 = this.state.getSkillNodeRank('titan_t4') > 0;
      const dropTier = ultEvo.tier >= 2 ? 2 : 1;
      const mgCount = ultEvo.tier === 0 ? 1 : ultEvo.tier === 1 ? 2 : 2 + (isT4 ? 1 : 0);
      for (let i = 0; i < mgCount; i++) {
        const gx =
          mgCount === 1
            ? targetX
            : clampTrackX(targetX + (i - (mgCount - 1) * 0.5) * 2.6);
        const gz = clampTrackZ(targetZ + 0.8 - (i % 2) * 1.2);
        this.spawnSkyPillar(gx, gz, 0xf97316, 1.8 + ultEvo.tier * 0.3, 0.5);
        this.spawnShockwave(gx, gz, 0xfacc15, 3.6 + ultEvo.tier * 0.5, 0.42);
        const mg = this.spawnUnit('blue', 'charged', gx, gz, 0, -8.0, undefined, true, dropTier);
        if (mg) mg.spawnHop = 1.55;
      }
      const giantSpec = this.state.getGiantTrooperSpec();
      const maxPromote = ultEvo.tier === 0 ? 1 : 1 + Math.ceil((t2 + t3) * 0.5) + (isT4 ? 1 : 0);
      let promoted = 0;
      for (const bIdx of this.activeBlueIndices) {
        if (promoted >= maxPromote) break;
        const bu = this.units[bIdx];
        if (!bu.active || bu.kind === 'champion') continue;
        const curT = bu.fusionTier || 1;
        if (curT < giantSpec.maxFusionTier) {
          this.promoteGiantUnit(bu, curT + 1, bu.maxHp * 0.5, bu.dmg * 0.5, bu.hp * 0.65, promoted < 2);
          promoted++;
        }
      }
      this.spawnFloatingPopup(targetX, 3.2, targetZ, `🗿 远古巨神天降[${ultEvo.badge}] +${mgCount}巨神 & ${promoted}升阶!`, '#f97316');
      morphBannerTitle = `🗿 【${ultEvo.badge}·远古巨神天降】-${killed}`;
      morphBannerSub = `在敌群密集处空降 ${mgCount} 尊${dropTier}阶巨神 · 桥面 ${promoted} 名巨人升阶！`;
    } else if (bId === 'gate') {
      // 3. Gate Morph: 【真理炼金逆转光】— Flips Red Gates to Blue + Upgrades Blue Gates + Gate Clone Eruption!
      const g2 = this.state.getSkillNodeRank('gate_t2');
      const isT4 = this.state.getSkillNodeRank('gate_t4') > 0;
      const maxCap = this.state.getMaxBlueGateCap();
      let flippedCount = 0;
      let eruptedClones = 0;
      const maxFlip = ultEvo.tier === 0 ? 1 : ultEvo.tier === 1 ? 2 : 99;
      for (const g of this.gates) {
        if (g.cfg.op === 'sub' || g.cfg.op === 'div') {
          if (flippedCount < maxFlip) {
            this.flipHazardGateToBlue(g);
            flippedCount++;
          }
        } else if (g.cfg.op === 'add') {
          const addLevels = isT4 ? 2 : 1;
          const targetVal = Math.min(maxCap, g.cfg.value + addLevels);
          if (targetVal > g.cfg.value) {
            g.cfg.value = targetVal;
            this.syncBlueGateVisualStyle(g);
          }
          g.pulseTimer = 1.3;
          this.spawnShockwave(g.currentX, g.cfg.z, 0x22d3ee, 3.6 + ultEvo.tier * 0.4, 0.42);
        }
        const burstCount = Math.max(1, Math.round((1 + g2 + ultEvo.tier) * 0.8));
        for (let c = 0; c < burstCount; c++) {
          const ox = g.currentX + (Math.random() - 0.5) * g.cfg.width * 0.7;
          this.spawnUnit('blue', isT4 ? 'charged' : 'normal', ox, g.cfg.z - 0.4, (Math.random() - 0.5) * 3.0, -8.5);
          eruptedClones++;
        }
      }
      this.spawnFloatingPopup(targetX, 3.0, targetZ, `🚪 真理炼金逆转光[${ultEvo.badge}] 喷涌+${eruptedClones}兵!`, '#22d3ee');
      morphBannerTitle = `🚪 【${ultEvo.badge}·真理炼金逆转光】转门×${flippedCount}`;
      morphBannerSub = `蓝门升阶 · 矩阵门脉同步喷涌 +${eruptedClones} 名克隆兵！`;
    } else if (bId === 'plasma') {
      // 4. Plasma Morph: 【九天雷暴超导网】— Evolves active Blue troopers into Golden Charged Marines + Railgun!
      const p1 = this.state.getSkillNodeRank('plasma_t1');
      const isT4 = this.state.getSkillNodeRank('plasma_t4') > 0;
      const maxEvolve = isT4 ? 999 : 3 + p1 * 4 + ultEvo.tier * 3;
      let evolvedCount = 0;
      for (const bIdx of this.activeBlueIndices) {
        if (evolvedCount >= maxEvolve) break;
        const bu = this.units[bIdx];
        if (!bu.active || bu.kind !== 'normal') continue;
        bu.kind = 'charged';
        bu.maxHp *= 1.9;
        bu.hp = bu.maxHp;
        bu.dmg *= 1.85;
        bu.spawnHop = 1.2;
        evolvedCount++;
        if (evolvedCount <= 14) {
          this.spawnBurstParticles(bu.x, 0.9, bu.z, 0xfacc15, 6);
        }
      }
      if (isT4 || ultEvo.tier >= 2) {
        this.triggerThorSuperRailgun();
      }
      this.spawnFloatingPopup(targetX, 3.0, targetZ, `⚡ 九天雷暴超导网[${ultEvo.badge}] 进化+${evolvedCount}兵!`, '#facc15');
      morphBannerTitle = `⚡ 【${ultEvo.badge}·九天雷暴超导网】-${killed}`;
      morphBannerSub = `场上 ${evolvedCount} 名士兵瞬间进化为黄金超导电浆兵！`;
    } else if (bId === 'orbital') {
      // 5. Orbital Morph: 【灭世黑洞焦土炮】— Gravity vortex pulls elites into (targetX, targetZ) + EMP vulnerability!
      this.spawnSkyPillar(targetX, targetZ, 0xd946ef, 2.4 + ultEvo.tier * 0.9, 0.65);
      this.spawnShockwave(targetX, targetZ, 0xd946ef, 7.5 + ultEvo.tier * 3.0, 0.6);
      this.spawnFloatingPopup(targetX, 3.2, targetZ, `☄️ 灭世黑洞焦土炮[${ultEvo.badge}] 聚怪激活!`, '#e879f9');
      morphBannerTitle = `☄️ 【${ultEvo.badge}·灭世黑洞焦土炮】-${killed}`;
      morphBannerSub =
        ultEvo.isCompleteForm
          ? '👑完全体黑洞引力聚怪 · 全屏等离子火海持续焚烧！'
          : '黑洞引力锁定敌群密集处聚怪 · 施加EMP高额易伤！';
    } else if (bId === 'bastion') {
      // 6. Bastion Morph: 【圣光天降禁卫军】— Base Heal + Shatters Grinder Gears + Airdrops Praetorian Guards!
      const b1 = this.state.getSkillNodeRank('bastion_t1');
      const b2 = this.state.getSkillNodeRank('bastion_t2');
      const b3 = this.state.getSkillNodeRank('bastion_t3');
      const isT4 = this.state.getSkillNodeRank('bastion_t4') > 0;
      const healAmt = Math.round(this.playerBaseMaxHp * (0.08 + b1 * 0.05 + ultEvo.tier * 0.04));
      this.playerBaseHp = Math.min(this.playerBaseMaxHp, this.playerBaseHp + healAmt);
      this.lastKnownBaseHp = Math.max(this.lastKnownBaseHp, this.playerBaseHp);
      for (const bIdx of this.activeBlueIndices) {
        const bu = this.units[bIdx];
        if (bu.active) bu.hp = Math.min(bu.maxHp, bu.hp + bu.maxHp * (0.4 + ultEvo.tier * 0.2));
      }
      for (const gr of this.gears) {
        if (!gr.alive) continue;
        if (b3 > 0 || isT4 || ultEvo.tier >= 2) {
          gr.hp = 0;
          gr.alive = false;
          gr.mesh.visible = false;
          gr.labelEl.style.display = 'none';
          this.spawnShockwave(gr.cfg.x, gr.cfg.z, 0x4ade80, 4.2, 0.42);
        } else {
          gr.hp = Math.max(1, Math.floor(gr.hp * 0.55));
        }
      }
      const guardCount = 1 + Math.floor((b2 + ultEvo.tier) * 0.8) + (isT4 ? 2 : 0);
      for (let i = 0; i < guardCount; i++) {
        const gx = guardCount === 1 ? targetX : clampTrackX(targetX + (i - (guardCount - 1) * 0.5) * 2.2);
        const gUnit = this.spawnUnit('blue', 'charged', gx, PLAYER_Z - 2.6, 0, -8.8, undefined, i === Math.floor(guardCount / 2));
        if (gUnit) gUnit.spawnHop = 1.45;
      }
      this.spawnFloatingPopup(targetX, 2.8, PLAYER_Z - 2.5, `🛡️ 圣光天降禁卫军[${ultEvo.badge}] +${healAmt}HP & ${guardCount}禁卫!`, '#4ade80');
      morphBannerTitle = `🛡️ 【${ultEvo.badge}·圣光天降禁卫军】+${healAmt}HP`;
      morphBannerSub = `防线修复 · ${guardCount} 名黄金禁卫军空降参战！`;
    } else if (bId === 'tycoon') {
      // 7. Tycoon Morph: 【黄金陨石盗宝雨】— Gold meteor jackpot + forces Golden Loot Bug spawn + Mercenary drop!
      const ty1 = this.state.getSkillNodeRank('tycoon_t1');
      const isT4 = this.state.getSkillNodeRank('tycoon_t4') > 0;
      const bonusJackpot = this.state.addGold(Math.round((25 + ty1 * 22) * (0.65 + ultEvo.tier * 0.25)));
      if (!this.lootBug.active) {
        this.lootBug.active = true;
        this.lootBug.dirX = 1;
        this.lootBug.x = -3.2;
        this.lootBug.z = 1.2;
        this.lootBug.maxHp = 5;
        this.lootBug.hp = 5;
        this.lootBug.hitFlash = 1.0;
        this.lootBugGroup.position.set(this.lootBug.x, 0, this.lootBug.z);
        this.lootBugGroup.visible = true;
        this.spawnSkyPillar(this.lootBug.x, this.lootBug.z, 0xfacc15, 2.0, 0.48);
      } else {
        this.lootBug.hp = Math.max(1, this.lootBug.hp - (2 + ultEvo.tier));
        this.lootBug.hitFlash = 1.0;
      }
      if (isT4 || ultEvo.tier >= 2) {
        this.spawnUnit('blue', 'charged', targetX, clampTrackZ(targetZ + 1.5), 0, -8.5, undefined, true);
        const mercCount = isT4 ? 4 : 2;
        for (let m = 0; m < mercCount; m++) {
          const ox = clampTrackX(targetX + (m - (mercCount - 1) * 0.5) * 1.8);
          this.spawnUnit('blue', 'charged', ox, clampTrackZ(targetZ + 1.8), 0, -8.8);
        }
      }
      this.spawnFloatingPopup(targetX, 3.0, targetZ, `💰 黄金陨石盗宝雨[${ultEvo.badge}] +${bonusJackpot}🪙 & 盗宝虫!`, '#facc15');
      morphBannerTitle = `💰 【${ultEvo.badge}·黄金陨石盗宝雨】+${bonusJackpot}🪙`;
      morphBannerSub = '黄金盗宝虫现身桥面 · 击杀小怪爆出高倍赏金！';
    }

    // Schedule follow-up carpet-bombardment waves: 0 at Tier 0 -> 1 at Tier 1 -> 3 at Tier 2 -> 5 at Tier 3 (👑完全体)!
    // At Tier 1 & Tier 2, follow-up waves dynamically lock onto the densest surviving enemy cluster!
    const allCarpetWaves: Array<{
      delay: number;
      zCenter: number;
      flash: string;
      hex1: number;
      hex2: number;
      isFinale?: boolean;
    }> = [
      { delay: 0.25, zCenter: 7.5, flash: oTheme.flash, hex1: oTheme.c1, hex2: oTheme.c2 },
      { delay: 0.5, zCenter: 1.5, flash: '#facc15', hex1: 0xfacc15, hex2: oTheme.c1 },
      { delay: 0.76, zCenter: -4.5, flash: oTheme.flash, hex1: oTheme.c1, hex2: oTheme.c2 },
      { delay: 1.04, zCenter: -10.5, flash: '#ff2a55', hex1: oTheme.c2, hex2: 0xfacc15 },
      { delay: 1.35, zCenter: BOSS_GATE_Z + 1.2, flash: '#facc15', hex1: 0xfacc15, hex2: oTheme.c1, isFinale: true },
    ];
    const carpetWaves = allCarpetWaves.slice(0, ultEvo.orbitalFollowupWaves);

    for (const cw of carpetWaves) {
      this.skillWaveQueue.push({
        delay: cw.delay,
        exec: () => {
          const dynCluster = this.findDensestRedCluster(ultEvo.orbitalXHalfSpan, 6.0);
          const waveX = ultEvo.isCompleteForm ? 0 : dynCluster.count > 0 ? dynCluster.x : targetX;
          const waveZ =
            ultEvo.isCompleteForm || cw.isFinale
              ? cw.zCenter
              : dynCluster.count > 0
                ? dynCluster.z
                : cw.zCenter;

          sound.playExplosion();
          this.addCameraShake(cw.isFinale ? 1.45 : 0.65 + ultEvo.tier * 0.15);
          if (ultEvo.tier >= 2) {
            this.triggerScreenFlash(cw.flash, cw.isFinale ? 0.92 : 0.58);
          }

          const allLanes = [-6.4, -2.8, 0, 2.8, 6.4];
          const relOffsets = ultEvo.tier === 1 ? [-2.2, 2.2] : ultEvo.tier === 2 ? [-3.8, 0, 3.8] : allLanes;
          for (let i = 0; i < relOffsets.length; i++) {
            const lx = clampTrackX((ultEvo.isCompleteForm ? 0 : waveX) + relOffsets[i] + (Math.random() - 0.5) * 0.6);
            const lz = clampTrackZ(waveZ + (Math.random() - 0.5) * 1.2);
            const col = i % 2 === 0 ? cw.hex1 : cw.hex2;
            const rad = cw.isFinale && i === 2 ? 4.6 : 1.6 + ultEvo.tier * 0.35;
            this.spawnSkyPillar(lx, lz, col, rad, cw.isFinale ? 0.75 : 0.5);
            this.spawnShockwave(lx, lz, col, cw.isFinale ? 9.5 : 3.8 + ultEvo.tier * 0.7, 0.48);
            this.spawnBurstParticles(lx, 1.3, lz, col, cw.isFinale ? 55 : 16 + ultEvo.tier * 4);
          }
          this.spawnShockwave(waveX, waveZ, cw.hex1, cw.isFinale ? 18.0 : 8.5 + ultEvo.tier * 1.8, 0.6);
          sweepRedWave(ultEvo.isCompleteForm ? null : waveX, waveZ, ultEvo.orbitalXHalfSpan, 6.0, 0.035);

          if (cw.isFinale && ultEvo.isCompleteForm && this.bossHp > 0 && !this.isStageEnded) {
            const orbitalRankBonus = 1 + this.state.getSkillNodeRank('orbital_t1') * 0.12;
            const bossStrikeDmg = Math.round(this.bossMaxHp * 0.06 * orbitalRankBonus);
            this.bossHp = Math.max(1, this.bossHp - bossStrikeDmg);
            this.bossHitFlash = 1.0;
            this.spawnFloatingPopup(0, 3.4, BOSS_GATE_Z + 1.0, `☄️ 终焉主炮直击母巢 -${bossStrikeDmg}!`, '#facc15');
          }
        },
      });
    }

    this.onBanner?.(morphBannerTitle, morphBannerSub);
    return true;
  }

  public spawnBurstParticles(x: number, y: number, z: number, hexColor: number, count: number): void {
    const scaledCount =
      this.lowSpecMode || this.isMobileDevice ? Math.max(1, Math.ceil(count * 0.48)) : count;
    let spawned = 0;
    for (let i = 0; i < MAX_PARTICLES && spawned < scaledCount; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.x = x + (Math.random() - 0.5) * 0.65;
        p.y = y + Math.random() * 0.5;
        p.z = z + (Math.random() - 0.5) * 0.65;
        p.vx = (Math.random() - 0.5) * 11.5;
        p.vy = 4.2 + Math.random() * 8.8;
        p.vz = (Math.random() - 0.5) * 11.5;
        p.life = 0;
        p.maxLife = 0.42 + Math.random() * 0.36;
        p.scale = 0.25 + Math.random() * 0.32;
        p.color.setHex(hexColor);
        spawned++;
      }
    }
  }

  private spawnFloatingPopup(worldX: number, worldY: number, worldZ: number, text: string, color: string): void {
    const pos = this.projectToScreen(worldX, worldY, worldZ);
    if (!pos.visible) return;
    let targetY = pos.y;
    const existing = this.labelsContainer.querySelectorAll<HTMLElement>('.float-popup');
    for (let pass = 0; pass < 4; pass++) {
      let collided = false;
      for (let i = 0; i < existing.length; i++) {
        const px = Number(existing[i].dataset.px || -9999);
        const py = Number(existing[i].dataset.py || -9999);
        if (Math.abs(px - pos.x) < 136 && Math.abs(py - targetY) < 32) {
          targetY = Math.max(96, targetY - 32);
          collided = true;
          break;
        }
      }
      if (!collided || targetY <= 96) break;
    }
    const el = document.createElement('div');
    el.className = 'float-popup';
    el.dataset.px = `${Math.round(pos.x)}`;
    el.dataset.py = `${Math.round(targetY)}`;
    el.style.left = `${pos.x}px`;
    el.style.top = `${targetY}px`;
    el.style.color = color;
    el.innerHTML = replaceEmojiWithArt(text);
    this.labelsContainer.appendChild(el);
    setTimeout(() => el.remove(), 750);
  }

  public update(dt: number): void {
    const clampedDt = Math.min(dt, 0.05);
    if (!this.isPaused && !this.isStageEnded && dt > 0 && dt < 0.25) {
      this.avgFrameMs = this.avgFrameMs * 0.9 + dt * 1000 * 0.1;
      if (dt > 0.0235) {
        this.slowFrameStreak = Math.min(60, this.slowFrameStreak + 1);
      } else {
        this.slowFrameStreak = Math.max(0, this.slowFrameStreak - 1);
      }
      // Step 1 Adaptive Frame-Rate Governor: only bypass multi-pass EffectComposer under sustained heavy load (< 30 FPS)
      if (this.usePostProcessing && (this.avgFrameMs > 33.5 && this.slowFrameStreak >= 45)) {
        this.usePostProcessing = false;
      }
      // Step 2 Low-Spec Resolution Scaling: preserve crisp anti-aliased DPR (>= 1.5) even on slower hosts
      if (!this.lowSpecMode && (this.avgFrameMs > 38.0 && this.slowFrameStreak >= 60)) {
        this.lowSpecMode = true;
        const fallbackDpr = Math.min(Math.max(window.devicePixelRatio || 1, 1.5), 2.0);
        this.renderer.setPixelRatio(fallbackDpr);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
      }
    }
    this.elapsedTime += clampedDt;
    this.cameraShake = Math.max(0, this.cameraShake - clampedDt * 2.5);

    if (this.quakeTimer > 0) {
      this.quakeTimer = Math.max(0, this.quakeTimer - clampedDt);
      const ratio = this.quakeTimer / Math.max(0.1, this.quakeMaxTimer);
      this.cameraShake = Math.max(this.cameraShake, this.quakeIntensity * (0.55 + 0.45 * ratio));
      if (this.quakeTimer <= 0) {
        this.quakeMaxTimer = 0;
        this.quakeIntensity = 0;
        document.body.classList.remove('screen-quake-active');
      }
    }

    if (this.adrenalineTimer > 0) {
      this.adrenalineTimer = Math.max(0, this.adrenalineTimer - clampedDt);
    }
    if (this.killStreakWindowTimer > 0) {
      this.killStreakWindowTimer = Math.max(0, this.killStreakWindowTimer - clampedDt);
      if (this.killStreakWindowTimer <= 0) {
        this.killStreakCount = 0;
        this.nextStreakMilestone = 25;
      }
    }

    // Process scheduled multi-wave skill & victory climax effects
    if (!this.isPaused && this.skillWaveQueue.length > 0) {
      for (let i = this.skillWaveQueue.length - 1; i >= 0; i--) {
        const item = this.skillWaveQueue[i];
        item.delay -= clampedDt;
        if (item.delay <= 0) {
          this.skillWaveQueue.splice(i, 1);
          item.exec();
        }
      }
    }

    if (this.isStageEnded || this.isPaused) { if (this.turretChargeEl) this.turretChargeEl.style.display = 'none';
      if (this.isStageEnded && !this.isPaused && this.lastStageVictory) {
        // Animate Boss sinking & tilting into the abyss during Victory Climax!
        if (this.victoryClimaxTimer > 0) {
          this.victoryClimaxTimer = Math.max(0, this.victoryClimaxTimer - clampedDt);
          const progress = 1 - this.victoryClimaxTimer / 1.25;
          const baseZ = this.currentLevel?.isMegaBoss ? BOSS_GATE_Z - 2.2 : BOSS_GATE_Z - 3.2;
          this.bossGroup.position.set(
            (Math.random() - 0.5) * 0.65,
            -5.8 * progress,
            baseZ - progress * 1.5
          );
          this.bossGroup.rotation.x = -0.58 * progress;
          this.bossGroup.rotation.z = Math.sin(progress * 18) * 0.16;
          if (this.colossusBoss?.active) {
            this.colossusBoss.rootGroup.position.set(
              (Math.random() - 0.5) * 0.55,
              -5.4 * progress,
              (BOSS_GATE_Z - 1.2) - progress * 1.4
            );
            this.colossusBoss.torsoGroup.rotation.x = 0.72 * progress;
            this.colossusBoss.torsoGroup.rotation.z = Math.sin(progress * 16) * 0.18;
          }

          // Make surviving Blue units leap in celebration!
          for (let i = 0; i < MAX_UNITS; i++) {
            const u = this.units[i];
            if (u.active && u.team === 'blue') {
              u.spawnHop = Math.abs(Math.sin(this.elapsedTime * 14 + u.id)) * 1.35;
            }
          }

          if (this.victoryClimaxTimer <= 0) {
            this.onStageEnd?.(true);
          }
        } else {
          // Ambient celebratory fireworks behind the Victory Modal!
          this.victoryFireworkTimer -= clampedDt;
          if (this.victoryFireworkTimer <= 0) {
            this.victoryFireworkTimer = 0.65;
            const fxCols = [0xfacc15, 0x00f0ff, 0xd946ef, 0x22c55e];
            const col = fxCols[Math.floor(Math.random() * fxCols.length)];
            const fx = (Math.random() - 0.5) * 14.0;
            const fz = (Math.random() - 0.5) * 18.0;
            this.spawnSkyPillar(fx, fz, col, 2.0, 0.5);
            this.spawnShockwave(fx, fz, col, 5.5, 0.48);
            this.spawnBurstParticles(fx, 2.2, fz, col, 45);
          }
        }
      } else {
        this.bossHead.position.y = 2.75 + Math.sin(this.elapsedTime * 2.6) * 0.14;
      }
      this.bossPortalRing.rotation.z = this.elapsedTime * 1.4;
      if (this.bossPortalMat?.uniforms) {
        this.bossPortalMat.uniforms.uTime.value = this.elapsedTime;
      }
      if (this.starfieldPoints) {
        this.starfieldPoints.rotation.y = this.elapsedTime * 0.018;
      }
      if (this.radarDish) {
        this.radarDish.rotation.y = this.elapsedTime * 1.6;
      }
      if (this.abyssMat.map) {
        this.abyssMat.map.offset.y = (this.elapsedTime * 0.06) % 1;
      }
      this.updateEnvironmentSpectacle(clampedDt);
      this.updateParticles(clampedDt);
      this.renderScene();
      return;
    }

    if (!this.isOverrunFrenzy) {
      this.stageCombatTime += clampedDt;
      this.state.runCombatTimePool += clampedDt;
      this.state.runSiegePool += clampedDt * 2.0;
    }

    // 1. Handle Keyboard movement for Turret (Shift boosts speed, S/ArrowDown centers)
    const shiftBoost =
      this.keysDown.has('ShiftLeft') || this.keysDown.has('ShiftRight') ? 1.75 : 1.0;
    const keySpeed = 16.0 * shiftBoost;
    if (this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft')) {
      this.turretTargetX = Math.max(-TRACK_HALF_W + 1.2, this.turretTargetX - keySpeed * clampedDt);
    }
    if (this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight')) {
      this.turretTargetX = Math.min(TRACK_HALF_W - 1.2, this.turretTargetX + keySpeed * clampedDt);
    }

    const prevX = this.turretX;
    this.turretX = THREE.MathUtils.lerp(this.turretX, this.turretTargetX, Math.min(1, clampedDt * 22));
    const turretDX = this.turretX - prevX;
    this.turretGroup.position.x = this.turretX;

    // Bubble Cannon recoil recovery, rolling peppermint wheels, spinning candy gears & lively Q-Slime Gunner!
    this.turretRecoil = Math.max(0, this.turretRecoil - clampedDt * 8);
    this.turretGroup.position.y =
      Math.abs(Math.sin(this.elapsedTime * 6.5)) * 0.045 + this.turretRecoil * 0.09;
    this.turretGroup.rotation.z = THREE.MathUtils.clamp(-turretDX * 1.6, -0.14, 0.14);
    this.turretBarrel.position.z = -0.62 + this.turretRecoil * 0.42;
    this.turretBarrel.scale.set(
      1 + this.turretRecoil * 0.14,
      1 + this.turretRecoil * 0.14,
      1 - this.turretRecoil * 0.18
    );
    this.turretMuzzleLight.intensity = this.turretRecoil * 6.5;

    for (const wheel of this.turretWheels) {
      wheel.rotation.x += turretDX * 1.85 + clampedDt * (this.isHoldingFireInput() ? 5.2 : 1.4);
    }
    for (let gIdx = 0; gIdx < this.turretGears.length; gIdx++) {
      const gearDir = gIdx % 2 === 0 ? 1 : -1;
      this.turretGears[gIdx].rotation.x +=
        gearDir * clampedDt * (3.6 + this.turretRecoil * 14.0);
    }

    if (this.turretGaugeNeedle) {
      this.turretGaugeNeedle.rotation.z =
        -0.45 + this.turretRecoil * 1.15 + Math.sin(this.elapsedTime * 16) * 0.08;
    }
    if (this.mascotGroup) {
      this.mascotCheerBoost = Math.max(0, this.mascotCheerBoost - clampedDt * 2.2);
      const targetMascotX = this.turretX < -7.2 ? 1.82 : -1.82;
      this.mascotGroup.position.x = THREE.MathUtils.lerp(
        this.mascotGroup.position.x,
        targetMascotX,
        Math.min(1, clampedDt * 11)
      );
      const cheerTempo = this.state.championCharge >= 100 ? 12.5 : 8.5;
      const mascotPhase = this.elapsedTime * cheerTempo;
      const mascotHop = Math.abs(Math.sin(mascotPhase));
      const mascotSquash =
        Math.cos(mascotPhase * 2.0) * 0.15 +
        this.turretRecoil * 0.18 +
        Math.sin(Math.min(1, this.mascotCheerBoost) * Math.PI) * 0.16;
      this.mascotGroup.position.y =
        0.02 +
        mascotHop * 0.24 +
        Math.sin(Math.min(1, this.mascotCheerBoost) * Math.PI) * 0.42 +
        this.turretRecoil * 0.16;
      this.mascotGroup.rotation.y =
        Math.sin(mascotPhase * 0.5) * 0.24 - THREE.MathUtils.clamp(turretDX * 3.5, -0.35, 0.35);

      if (this.mascotLeftArm) {
        this.mascotLeftArm.rotation.z =
          Math.sin(mascotPhase) * 0.16 + this.mascotCheerBoost * 0.24;
        this.mascotLeftArm.rotation.x =
          -0.58 + Math.sin(mascotPhase * 2.0) * 0.12 - this.turretRecoil * 0.22;
        this.mascotLeftArm.scale.set(
          1.0 + mascotSquash * 0.78,
          Math.max(0.74, 1.0 - mascotSquash),
          1.0 + mascotSquash * 0.78
        );
      }
      if (this.mascotPeak) {
        this.mascotPeak.rotation.z = Math.sin(mascotPhase * 2.0 - 0.9) * 0.26;
        this.mascotPeak.rotation.x = Math.cos(mascotPhase * 2.0 - 0.9) * 0.18;
      }
      if (this.mascotMegaphone) {
        this.mascotMegaphone.rotation.z =
          Math.PI / 2 + Math.sin(mascotPhase * 1.5) * 0.28 + this.turretRecoil * 0.35;
      }
    }
    if (this.turretEvoHalo && this.currentTurretEvoTier >= 2) {
      this.turretEvoHalo.rotation.z = this.elapsedTime * 3.8;
    }
    for (const fw of this.cannonModFlywheels) {
      fw.rotation.x += clampedDt * (6.5 + this.turretRecoil * 24.0);
    }
    if (this.cannonModPrismCrystal && this.cannonModPrismGroup.visible) {
      this.cannonModPrismCrystal.rotation.y = this.elapsedTime * 3.2;
      this.cannonModPrismCrystal.rotation.z = Math.sin(this.elapsedTime * 4.5) * 0.25;
    }
    if (this.cannonModMortarSleeve && this.cannonModHeavyMortarGroup.visible) {
      this.cannonModMortarSleeve.position.z = -0.52 + this.turretRecoil * 0.22;
    }

    // 1.5 Hold-to-Charge Energy Bar & Release-to-Summon Hero Mechanic
    const isHoldingFire = this.isHoldingFireInput();
    const isSteering = this.isSteeringInput();
    if (isHoldingFire) {
      this.wasHoldingFire = true;
      const chargeMult = this.state.getSkillChargeMultiplier();
      if (this.state.championCharge < 100) {
        this.state.championCharge = Math.min(
          100,
          this.state.championCharge + clampedDt * 8.6 * chargeMult
        );
      }
      this.holdChargeParticleTimer += clampedDt;
      if (this.holdChargeParticleTimer >= 0.14) {
        this.holdChargeParticleTimer = 0;
        const pCol = this.state.championCharge >= 100 ? 0xfacc15 : 0x00f0ff;
        this.spawnBurstParticles(
          this.turretX + (Math.random() - 0.5) * 0.9,
          0.65,
          PLAYER_Z - 0.5,
          pCol,
          this.state.championCharge >= 100 ? 3 : 1
        );
      }
      if (this.state.championCharge >= 100 && !this.heroChargeFullNotified) {
        this.heroChargeFullNotified = true;
        this.spawnShockwave(this.turretX, PLAYER_Z, 0xfacc15, 2.8, 0.35);
        this.spawnBurstParticles(this.turretX, 1.1, PLAYER_Z - 0.5, 0xfacc15, 18);
        this.spawnFloatingPopup(this.turretX, 2.35, PLAYER_Z - 1.0, '👑 能量已满 · 松手召唤英雄!', '#facc15');
      }
    } else if (isSteering && this.state.championCharge < 100) {
      const chargeMult = this.state.getSkillChargeMultiplier();
      this.state.championCharge = Math.min(
        100,
        this.state.championCharge + clampedDt * 3.4 * chargeMult
      );
    }
    if (this.state.championCharge < 100) {
      this.heroChargeFullNotified = false;
    }

    // MC-6: Passive & Active Fusion Charge for Twin-Cannon Steam Mecha Overlord + Weather Charge Multiplier
    const weatherChargeMult = this.currentLevel?.weatherAffix?.chargeGainMult || 1.0;
    if (this.state.mechaOverlordCharge < 100 && (!this.mechaOverlord || !this.mechaOverlord.active)) {
      const mRate = (isHoldingFire ? 6.8 : isSteering ? 3.8 : 2.4) * this.state.getSkillChargeMultiplier() * weatherChargeMult;
      this.state.mechaOverlordCharge = Math.min(100, this.state.mechaOverlordCharge + clampedDt * mRate);
    }
    if (this.state.orbitalCharge < 100 && weatherChargeMult > 1.01) {
      this.state.orbitalCharge = Math.min(
        100,
        this.state.orbitalCharge + clampedDt * 1.6 * (weatherChargeMult - 1.0)
      );
    }
    if (this.state.subWeaponCharge < 100) {
      const swCombat = this.state.getSubWeaponCombatSpec();
      const swRate =
        (100 / Math.max(4, swCombat.cooldownSec)) *
        this.state.getSkillChargeMultiplier() *
        weatherChargeMult *
        (isHoldingFire ? 1.15 : 1.0);
      this.state.subWeaponCharge = Math.min(100, this.state.subWeaponCharge + clampedDt * swRate);
    }
    if (this.turretGroundRingMat) {
      if (this.state.championCharge >= 100) {
        this.turretGroundRingMat.color.setHex(0xfacc15);
        this.turretGroundRingMat.opacity = 0.65 + 0.3 * Math.sin(this.elapsedTime * 10);
      } else if (isHoldingFire) {
        this.turretGroundRingMat.color.setHex(0x00f0ff);
        this.turretGroundRingMat.opacity = 0.72;
      } else {
        this.turretGroundRingMat.color.setHex(0x00f0ff);
        this.turretGroundRingMat.opacity = 0.42;
      }
    }

    // 2. Auto-Fire Player Turret (boosted by Hold-Charge, Adrenaline, Skill Overdrive & Overrun Frenzy)
    if (this.skillOverdriveTimer > 0) {
      this.skillOverdriveTimer = Math.max(0, this.skillOverdriveTimer - clampedDt);
    }
    const holdFireBoost = isHoldingFire ? 1.08 : 1.0;
    const adrenalineMult =
      (this.adrenalineTimer > 0 ? 1.22 : 1.0) *
      (this.skillOverdriveTimer > 0 ? 1.25 : 1.0) *
      holdFireBoost;
    const rallyFireBoost = this.rallyAuraFx?.active ? this.rallyAuraFx.attackRateMult : 1.0;
    const fireRate =
      this.state.getFireRatePerSec() *
      adrenalineMult *
      rallyFireBoost *
      (this.isOverrunFrenzy ? 3.0 : 1.0);
    this.shootTimer += clampedDt;
    const fireInterval = 1 / fireRate;
    if (this.shootTimer >= fireInterval) {
      this.shootTimer %= fireInterval;
      this.fireTurret();
    }
    if (this.overdriveBurstQueue > 0) {
      this.overdriveBurstTimer -= clampedDt;
      if (this.overdriveBurstTimer <= 0) {
        this.overdriveBurstQueue = Math.max(0, this.overdriveBurstQueue - 1);
        this.overdriveBurstTimer = 0.065;
        const burstX = this.turretX + (this.overdriveBurstQueue % 2 === 0 ? -0.36 : 0.36);
        const burstBobo = this.spawnUnit('blue', 'charged', burstX, PLAYER_Z - 1.45, 0, -9.6);
        if (burstBobo) {
          burstBobo.cannonModTag = 'overdrive_breech';
        }
        this.turretRecoil = Math.max(this.turretRecoil, 0.85);
        this.spawnBurstParticles(burstX, 0.92, PLAYER_Z - 1.55, 0xf59e0b, 6);
      }
    }

    // Tick down MC-4 8s Tactical Airdrop Frenzy Buffs
    if (this.dualVolleyTimer > 0) {
      this.dualVolleyTimer = Math.max(0, this.dualVolleyTimer - clampedDt);
    }
    if (this.freezeRedsTimer > 0) {
      this.freezeRedsTimer = Math.max(0, this.freezeRedsTimer - clampedDt);
      if (Math.random() < 0.25 && this.activeRedIndices.length > 0) {
        const ru = this.units[this.activeRedIndices[Math.floor(Math.random() * this.activeRedIndices.length)]];
        if (ru && ru.active) {
          this.spawnBurstParticles(ru.x, 0.7, ru.z, 0x7dd3fc, 2);
        }
      }
    }
    if (this.frontlineGiantsTimer > 0) {
      this.frontlineGiantsTimer = Math.max(0, this.frontlineGiantsTimer - clampedDt);
    }

    // Tick animated surface finish shader time (for Starlight Prism holographic shimmer)
    for (const unitMat of [this.blueMarineMat, this.champMat]) {
      const fu = unitMat?.userData?.finishUniforms as { uFinishTime?: { value: number } } | undefined;
      if (fu?.uFinishTime) {
        fu.uFinishTime.value = this.elapsedTime;
      }
    }

    // MC-5: Update 3D Steam Armored Payload Cart escort charging, movement & barricade ramming
    if (this.currentLevel?.isPayloadEscort && this.payloadCart?.active) {
      this.updatePayloadEscort(clampedDt);
      if (this.isStageEnded) return;
    }

    // MC-9: Update 3D Cloud Airship Mothership Escort, Anti-Air Flak Sub-Turrets & Super Bobo Drop Pods
    if (this.currentLevel?.isAirshipEscort && this.airshipMothership?.active) {
      this.updateAirshipEscort(clampedDt);
      if (this.isStageEnded) return;
    }

    // MC-6: Update 3D Twin-Cannon Steam Mecha Overlord, Artillery Shells & Dynamic Weather Particles
    this.updateMechaOverlord(clampedDt);
    if (this.isStageEnded) return;

    // MC-7: Update 3D Leader Tactical Sub-Weapons (Electro Net, Syrup Bubble Zone, Rally Horn Aura)
    this.updateTacticalSubWeapons(clampedDt);
    if (this.isStageEnded) return;

    // 3. Spawn Enemy Red Waves, Acid Banelings, Hive Shamans & Giant Yellow Brutes across lanes
    if (this.currentLevel?.isBonusHeist) {
      if (this.airdrop?.active) {
        this.resetTacticalAirdrop(false);
      }
      this.bonusHeistTimeLeft = Math.max(0, this.bonusHeistTimeLeft - clampedDt);
      if (this.bonusHeistTimeLeft <= 0) {
        this.finishStage(true);
        return;
      }
    } else if (!this.isOverrunFrenzy) {
      if (this.currentLevel?.isEndlessDefense) {
        this.endlessWaveTimer += clampedDt;
        if (this.endlessWaveTimer >= 11.0) {
          this.endlessWaveTimer -= 11.0;
          this.endlessWave += 1;
          this.state.recordEndlessWave(this.endlessWave);
          const waveGold = this.state.addGold(85 + this.endlessWave * 35);
          let shardBonusText = '';
          if (this.endlessWave % 3 === 0) {
            const sr = this.state.grantBonusSkinShards(1);
            if (sr.amount > 0) {
              shardBonusText = ` · 时装碎片 +${sr.amount}`;
            }
          }
          const scaleMult = 1 + (this.endlessWave - 1) * 0.16;
          const surgeCount = Math.min(20, 4 + this.endlessWave * 2);
          const laneCenters = [-4.8, 0, 4.8];
          for (let i = 0; i < surgeCount; i++) {
            const laneX = laneCenters[i % 3];
            const spreadX = laneX + (Math.random() - 0.5) * 2.8;
            const spawnZ = BOSS_GATE_Z + 0.8 + Math.random() * 1.6;
            const uKind = i % 5 === 0 ? 'baneling' : 'normal';
            const ru = this.spawnUnit('red', uKind, spreadX, spawnZ, (Math.random() - 0.5) * 0.6, 3.4);
            if (ru) {
              ru.maxHp *= scaleMult;
              ru.hp = ru.maxHp;
              ru.dmg *= scaleMult;
            }
          }
          const bruteCount = 1 + Math.floor(this.endlessWave / 2);
          for (let b = 0; b < bruteCount; b++) {
            const bx = (b - (bruteCount - 1) * 0.5) * 3.6 + (Math.random() - 0.5) * 1.2;
            const bu = this.spawnUnit('red', 'brute', bx, BOSS_GATE_Z + 1.3, 0, 3.1);
            if (bu) {
              bu.maxHp *= scaleMult;
              bu.hp = bu.maxHp;
              bu.dmg *= scaleMult;
            }
          }
          this.onBanner?.(
            `无尽工坊保卫战 · 第 ${this.endlessWave} 波冲击！`,
            `坚守赏金 +${waveGold} 金币${shardBonusText} · 突变巨汉 ×${bruteCount} 压境`
          );
        }
      }

      const stage = this.currentLevel?.isEndlessDefense
        ? Math.max(1, this.endlessWave)
        : Math.max(1, this.currentLevel?.id || 1);
      const berserkSpeedMult = this.bossBerserkTriggered ? 1.2 : 1.0;
      const effSpawnInterval = this.currentLevel.isEndlessDefense
        ? Math.max(0.75, this.currentLevel.enemySpawnInterval - (this.endlessWave - 1) * 0.11)
        : this.currentLevel.enemySpawnInterval;
      const effBurstCount = this.currentLevel.isEndlessDefense
        ? Math.min(14, this.currentLevel.enemyBurstCount + Math.floor(this.endlessWave * 0.8))
        : this.currentLevel.enemyBurstCount;
      const endlessStatMult = this.currentLevel.isEndlessDefense
        ? 1 + (this.endlessWave - 1) * 0.14
        : 1.0;

      const colossusParalyzed = Boolean(this.colossusBoss?.active && this.colossusBoss.paralysisTimer > 0);
      this.enemySpawnTimer += colossusParalyzed ? 0 : clampedDt * berserkSpeedMult;
      if (this.enemySpawnTimer >= effSpawnInterval) {
        this.enemySpawnTimer = 0;
        const burst = effBurstCount;
        const laneCenters = [-4.8, 0, 4.8];
        for (let i = 0; i < burst; i++) {
          const laneX = laneCenters[i % 3];
          const spreadX = laneX + (Math.random() - 0.5) * 2.8;
          const spawnZ = BOSS_GATE_Z + 0.8 + Math.random() * 1.4;
          const banelingChance = this.bossBerserkTriggered
            ? 0.18
            : Math.min(0.16, 0.06 + (stage - 1) * 0.01);
          const unitKind = Math.random() < banelingChance ? 'baneling' : 'normal';
          const ru = this.spawnUnit('red', unitKind, spreadX, spawnZ, (Math.random() - 0.5) * 0.6, 3.3);
          if (ru && endlessStatMult > 1.0) {
            ru.maxHp *= endlessStatMult;
            ru.hp = ru.maxHp;
            ru.dmg *= endlessStatMult;
          }
        }
      }

      // Spawn Hive Shaman Support Priest periodically from Stage 2+
      if (stage >= 2) {
        this.shamanSpawnTimer += clampedDt * berserkSpeedMult;
        if (this.shamanSpawnTimer >= 12.0) {
          this.shamanSpawnTimer = 0;
          const sx = (Math.random() - 0.5) * 9.5;
          const su = this.spawnUnit('red', 'shaman', sx, BOSS_GATE_Z + 1.1, 0, 2.9);
          if (su && endlessStatMult > 1.0) {
            su.maxHp *= endlessStatMult;
            su.hp = su.maxHp;
          }
        }
      }

      if (this.currentLevel.bruteSpawnInterval > 0) {
        const effBruteInterval = this.currentLevel.isEndlessDefense
          ? Math.max(3.6, this.currentLevel.bruteSpawnInterval - (this.endlessWave - 1) * 0.32)
          : this.currentLevel.bruteSpawnInterval;
        this.bruteSpawnTimer += clampedDt * berserkSpeedMult;
        if (this.bruteSpawnTimer >= effBruteInterval) {
          this.bruteSpawnTimer = 0;
          const bx = (Math.random() - 0.5) * 9.5;
          const bu = this.spawnUnit('red', 'brute', bx, BOSS_GATE_Z + 1.2, 0, 3.0);
          if (bu && endlessStatMult > 1.0) {
            bu.maxHp *= endlessStatMult;
            bu.hp = bu.maxHp;
            bu.dmg *= endlessStatMult;
          }
        }
      }

      // Golden Loot Bug (Dynamic Cross-Bridge Treasure Runner!)
      const tycoonBugRank = this.state.getSkillNodeRank('tycoon_t2');
      if (!this.lootBug.active) {
        this.lootBug.spawnTimer -= clampedDt;
        if (this.lootBug.spawnTimer <= 0) {
          const dirX = Math.random() < 0.5 ? 1 : -1;
          this.lootBug.active = true;
          this.lootBug.dirX = dirX;
          this.lootBug.x = -dirX * 10.0;
          this.lootBug.z = 0.8 + (Math.random() - 0.5) * 4.2;
          this.lootBug.maxHp = Math.min(14, 6 + Math.floor(stage / 2));
          this.lootBug.hp = this.lootBug.maxHp;
          this.lootBug.hitFlash = 0;
          this.lootBugGroup.position.set(this.lootBug.x, 0, this.lootBug.z);
          this.lootBugGroup.visible = true;
          this.spawnSkyPillar(this.lootBug.x, this.lootBug.z, 0xfacc15, 1.8, 0.45);
          this.spawnShockwave(this.lootBug.x, this.lootBug.z, 0xfacc15, 3.6, 0.4);
          this.spawnFloatingPopup(this.lootBug.x, 2.0, this.lootBug.z, '💰 黄金盗宝虫出没！快拦截！', '#facc15');
        }
      } else {
        const bugSpeed = tycoonBugRank > 0 ? 1.12 : 1.65;
        this.lootBug.x += this.lootBug.dirX * bugSpeed * clampedDt;
        const bobY = Math.abs(Math.sin(this.elapsedTime * 12)) * 0.25;
        this.lootBugGroup.position.set(
          this.lootBug.x,
          bobY,
          this.lootBug.z + Math.sin(this.elapsedTime * 3.5) * 0.35
        );
        this.lootBugGroup.rotation.y = (this.lootBug.dirX > 0 ? Math.PI / 2 : -Math.PI / 2) + Math.sin(this.elapsedTime * 14) * 0.18;
        if (this.lootBug.hitFlash > 0) {
          this.lootBug.hitFlash = Math.max(0, this.lootBug.hitFlash - clampedDt * 6);
          const s = 1 + this.lootBug.hitFlash * 0.25;
          this.lootBugGroup.scale.set(s, s, s);
        } else {
          this.lootBugGroup.scale.set(1, 1, 1);
        }
        if (Math.random() < 0.35) {
          this.spawnBurstParticles(this.lootBug.x, 0.6, this.lootBug.z, 0xfacc15, 1);
        }
        if (Math.abs(this.lootBug.x) > 10.5) {
          this.lootBug.active = false;
          this.lootBug.spawnTimer = tycoonBugRank > 0 ? 10.5 : 16.5;
          this.lootBugGroup.visible = false;
          if (this.lootBugLabelEl) this.lootBugLabelEl.style.display = 'none';
          this.spawnFloatingPopup(this.lootBug.x, 1.8, this.lootBug.z, '💨 盗宝虫溜走了!', '#94a3b8');
        }
      }

      // MC-4: Steam Tactical Airdrop Crate (Explicitly skipped in Bonus Heist above!)
      this.updateTacticalAirdrop(clampedDt);
    } else {
      // Base Overrun Frenzy countdown!
      this.overrunTimer -= clampedDt;
      if (this.overrunTimer <= 0) {
        this.finishStage(true);
        return;
      }
    }

    // 4. Update Dynamic Gates & Boilers & Boss Animation & Side Nests
    this.gatePopupCooldown = Math.max(0, this.gatePopupCooldown - clampedDt);
    for (const g of this.gates) {
      if (g.addCooldown > 0) {
        g.addCooldown = Math.max(0, g.addCooldown - clampedDt);
      }
      if (g.cfg.moveRangeX && g.cfg.moveSpeed) {
        g.currentX =
          g.cfg.x +
          Math.sin(this.elapsedTime * g.cfg.moveSpeed + (g.cfg.movePhase || 0)) * g.cfg.moveRangeX;
        g.group.position.x = g.currentX;
      }
      g.group.rotation.x = Math.sin(this.elapsedTime * 2.8 + g.cfg.z) * 0.032;
      if (g.pulseTimer > 0) {
        g.pulseTimer = Math.max(0, g.pulseTimer - clampedDt * 5.2);
        const s = 1 + g.pulseTimer * 0.24;
        g.group.scale.set(s, s, 1);
      } else {
        g.group.scale.set(1, 1, 1);
      }
    }

    this.jumpPadSoundCooldown = Math.max(0, this.jumpPadSoundCooldown - clampedDt);

    for (const wr of this.wallRuntimes) {
      if (wr.cfg.moveRangeX && wr.cfg.moveSpeed) {
        const offset =
          Math.sin(this.elapsedTime * wr.cfg.moveSpeed + (wr.cfg.movePhase || 0)) * wr.cfg.moveRangeX;
        wr.group.position.x = offset;
        wr.cfg.x1 = wr.baseX1 + offset;
        wr.cfg.x2 = wr.baseX2 + offset;
      }
    }

    for (const gr of this.gears) {
      if (gr.alive) {
        if (gr.cfg.moveRangeX && gr.cfg.moveSpeed) {
          gr.cfg.x =
            gr.baseX +
            Math.sin(this.elapsedTime * gr.cfg.moveSpeed + (gr.cfg.movePhase || 0)) * gr.cfg.moveRangeX;
          gr.mesh.position.x = gr.cfg.x;
        }
        const chug = 1 + Math.sin(this.elapsedTime * 15 + gr.baseX) * 0.025;
        if (gr.hitFlash > 0) {
          gr.hitFlash = Math.max(0, gr.hitFlash - clampedDt * 7.0);
          const s = 1 + gr.hitFlash * 0.22;
          gr.mesh.scale.set(s * chug, s / chug, s * chug);
        } else {
          gr.mesh.scale.set(chug, 1 / chug, chug);
        }
        // Puff cheerful white steam from the boiler's top chimney stack!
        if (Math.random() < clampedDt * 6.5) {
          this.spawnBurstParticles(gr.cfg.x, 2.02, gr.cfg.z, 0xffffff, 1);
        }
      }
    }

    for (const zr of this.zones) {
      if (zr.beltTex) {
        zr.beltTex.offset.y = -((this.elapsedTime * 1.9) % 1);
      }
      if (zr.ringMesh) {
        const s = 1 + Math.sin(this.elapsedTime * 6.5) * 0.12;
        zr.ringMesh.scale.set(s, s, 1);
      }
      if (zr.holoCross) {
        zr.holoCross.rotation.y = this.elapsedTime * 2.4;
        zr.holoCross.position.y = 0.78 + Math.sin(this.elapsedTime * 4.2) * 0.14;
      }
      if (zr.cfg.type === 'toxic_mire' && Math.random() < clampedDt * 2.2) {
        const px = zr.cfg.x + (Math.random() - 0.5) * zr.cfg.width * 0.65;
        const pz = zr.cfg.z + (Math.random() - 0.5) * zr.cfg.length * 0.65;
        this.spawnBurstParticles(px, 0.12, pz, 0x5c422f, 1);
      } else if (zr.cfg.type === 'heal_sanctuary' && Math.random() < clampedDt * 4.5) {
        const px = zr.cfg.x + (Math.random() - 0.5) * zr.cfg.width * 0.8;
        const pz = zr.cfg.z + (Math.random() - 0.5) * zr.cfg.length * 0.8;
        this.spawnBurstParticles(px, 0.35, pz, 0xf472b6, 1);
      } else if (zr.cfg.type === 'tailwind_belt') {
        if (zr.windRotors) {
          for (const wr of zr.windRotors) {
            wr.rotation.y += clampedDt * 9.5;
          }
        }
        if (Math.random() < clampedDt * 5.0) {
          const px = zr.cfg.x + (Math.random() - 0.5) * zr.cfg.width * 0.7;
          const pz = zr.cfg.z + (Math.random() - 0.5) * zr.cfg.length * 0.7;
          this.spawnBurstParticles(px, 0.28, pz, 0x67e8f9, 1);
        }
      } else if (zr.cfg.type === 'emp_zone') {
        zr.empTimer = (zr.empTimer ?? 1.4) - clampedDt;
        if (zr.empPhase === 'idle') {
          if (zr.empTelegraphMesh && zr.empTelegraphMat) {
            zr.empTelegraphMesh.scale.set(0.25, 0.25, 1);
            zr.empTelegraphMat.opacity = 0.16;
          }
          if ((zr.empTimer ?? 0) <= 0) {
            zr.empPhase = 'telegraph';
            zr.empTimer = 1.15;
          }
        } else if (zr.empPhase === 'telegraph') {
          const prog = THREE.MathUtils.clamp(1 - (zr.empTimer ?? 0) / 1.15, 0, 1);
          if (zr.empTelegraphMesh && zr.empTelegraphMat) {
            const sc = 0.25 + prog * 0.78;
            zr.empTelegraphMesh.scale.set(sc, sc, 1);
            zr.empTelegraphMat.color.setHex(prog > 0.65 ? 0xe879f9 : 0x38bdf8);
            zr.empTelegraphMat.opacity = 0.32 + prog * 0.46;
          }
          if ((zr.empTimer ?? 0) <= 0) {
            zr.empPhase = 'pulse';
            zr.empTimer = 0.28;
            this.triggerEmpZoneDischarge(zr);
          }
        } else {
          if ((zr.empTimer ?? 0) <= 0) {
            zr.empPhase = 'idle';
            zr.empTimer = this.currentLevel?.weatherAffix?.id === 'ion_emp_storm' ? 1.85 : 2.45;
          }
        }
      } else if (zr.cfg.type === 'frosting_pad') {
        if (zr.padBounceAnim && zr.padBounceAnim > 0) {
          zr.padBounceAnim = Math.max(0, zr.padBounceAnim - clampedDt * 4.5);
          if (zr.padCushionGroup) {
            const squash = Math.sin(zr.padBounceAnim * Math.PI * 2) * 0.22;
            zr.padCushionGroup.scale.set(1 - squash * 0.45, 1 + squash, 1 - squash * 0.45);
            zr.padCushionGroup.position.y = 0.34 + Math.max(0, squash) * 0.28;
          }
        } else if (zr.padCushionGroup) {
          zr.padCushionGroup.scale.set(1, 1, 1);
          zr.padCushionGroup.position.y = 0.34;
        }
      }
    }

    for (const bm of this.bumpers) {
      if (bm.pulseTimer > 0) {
        bm.pulseTimer = Math.max(0, bm.pulseTimer - clampedDt * 5.5);
        const s = 1 + bm.pulseTimer * 0.32;
        bm.group.scale.set(s, 1 + bm.pulseTimer * 0.15, s);
        bm.ringMat.color.setHex(bm.pulseTimer > 0.35 ? 0xfacc15 : 0xf96e80);
      } else {
        bm.group.scale.set(1, 1, 1);
      }
    }

    for (const br of this.barrels) {
      if (br.alive) {
        const pulse = 1 + Math.sin(this.elapsedTime * 8.5) * 0.07;
        br.mesh.scale.set(pulse, pulse, pulse);
      }
    }

    for (const n of this.nests) {
      if (n.alive) {
        n.monsterMesh.position.y = 1.88 + Math.sin(this.elapsedTime * 4.5) * 0.14;
        n.monsterMesh.rotation.y = Math.sin(this.elapsedTime * 2.2) * 0.35;
        if (n.hitFlash > 0) {
          n.hitFlash = Math.max(0, n.hitFlash - clampedDt * 6);
          const s = 1 + n.hitFlash * 0.18;
          n.monsterMesh.scale.set(s, s, s);
        } else {
          n.monsterMesh.scale.set(1, 1, 1);
        }
      }
    }

    for (const v of this.candyVaults) {
      if (!v.alive) continue;
      v.doorWheel.rotation.z = this.elapsedTime * 2.8;
      v.gemCrown.rotation.y = this.elapsedTime * 3.1;
      v.gemCrown.position.y = 3.68 + Math.sin(this.elapsedTime * 4.6 + v.cfg.x) * 0.14;
      const baseScale = v.cfg.isGrand ? 1.18 : 1.0;
      if (v.hitFlash > 0) {
        v.hitFlash = Math.max(0, v.hitFlash - clampedDt * 6);
        const s = baseScale * (1 + v.hitFlash * 0.14);
        v.group.scale.set(s, s, s);
      } else {
        v.group.scale.set(baseScale, baseScale, baseScale);
      }
    }

    for (const st of this.bossSubTowers) {
      if (!st.alive) continue;
      st.coreMesh.rotation.y = this.elapsedTime * 2.6;
      st.coreMesh.position.y = 2.48 + Math.sin(this.elapsedTime * 4.2 + (st.cfg.side === 'left' ? 0 : 1.5)) * 0.12;
      st.valveRing.rotation.z = this.elapsedTime * (st.cfg.side === 'left' ? 1.9 : -1.9);
      st.beamMat.opacity = 0.45 + 0.25 * Math.abs(Math.sin(this.elapsedTime * 6.5));
      if (st.hitFlash > 0) {
        st.hitFlash = Math.max(0, st.hitFlash - clampedDt * 6);
        const s = 1 + st.hitFlash * 0.16;
        st.group.scale.set(s, s, s);
      } else {
        st.group.scale.set(1, 1, 1);
      }
    }
    if (this.bossSteamBarrierMesh?.visible) {
      const aliveCount = this.getAliveSubTowerCount();
      const bScale = 1 + Math.sin(this.elapsedTime * 5.2) * 0.035;
      this.bossSteamBarrierMesh.scale.set(bScale, bScale, bScale);
      this.bossSteamBarrierMat.opacity = (aliveCount >= 2 ? 0.34 : 0.19) + 0.06 * Math.sin(this.elapsedTime * 7.0);
    }

    // Factory Boss Foreman lively breathing, battlefield scanning, wrench brandishing & Golden Cogwheel spin!
    const bossBreath = Math.sin(this.elapsedTime * 3.4);
    const bossSwagger = Math.sin(this.elapsedTime * 1.85);
    this.bossHead.position.y = 2.75 + Math.abs(bossBreath) * 0.24 + this.bossHitFlash * 0.22;
    this.bossHead.rotation.z = bossSwagger * 0.09 - this.bossHitFlash * 0.12;
    this.bossHead.rotation.y = Math.sin(this.elapsedTime * 1.35) * 0.22;
    this.bossHead.rotation.x = Math.cos(this.elapsedTime * 3.4) * 0.07 - this.bossHitFlash * 0.18;
    this.bossHead.scale.set(
      1.0 + bossBreath * 0.045 + this.bossHitFlash * 0.08,
      1.0 - bossBreath * 0.05 - this.bossHitFlash * 0.06,
      1.0 + bossBreath * 0.045 + this.bossHitFlash * 0.08
    );
    if (this.bossWrenchGroup) {
      this.bossWrenchGroup.rotation.z =
        -0.58 + Math.sin(this.elapsedTime * 3.4) * 0.28 + this.bossHitFlash * 0.45;
      this.bossWrenchGroup.rotation.x = Math.cos(this.elapsedTime * 1.7) * 0.2;
    }
    for (let fIdx = 0; fIdx < this.bossForearms.length; fIdx++) {
      const side = fIdx === 0 ? -1 : 1;
      this.bossForearms[fIdx].rotation.x =
        0.42 + Math.sin(this.elapsedTime * 3.4 + side * 0.8) * 0.22;
      this.bossForearms[fIdx].rotation.z =
        side * 0.28 + Math.cos(this.elapsedTime * 1.85) * 0.12;
    }
    this.bossPortalRing.rotation.z = this.elapsedTime * 1.4;
    if (this.bossPortalMat?.uniforms) {
      this.bossPortalMat.uniforms.uTime.value = this.elapsedTime;
    }
    if (this.starfieldPoints) {
      this.starfieldPoints.rotation.y = this.elapsedTime * 0.022;
    }

    if (this.radarDish) {
      this.radarDish.rotation.y = this.elapsedTime * 1.6;
    }
    if (this.abyssMat.map) {
      this.abyssMat.map.offset.y = (this.elapsedTime * 0.06) % 1;
    }
    this.updateEnvironmentSpectacle(clampedDt);

    this.ambientWeatherTimer += clampedDt;
    if (this.ambientWeatherTimer >= 0.14) {
      this.ambientWeatherTimer = 0;
      const wx = (Math.random() - 0.5) * 28;
      const wz = (Math.random() - 0.5) * 38;
      const wy = this.currentTheme.id === 'glacier' ? 6.5 : 0.4;
      this.spawnBurstParticles(wx, wy, wz, this.currentTheme.ambientParticleColor, 1);
    }

    if (this.megaBossHalo && this.currentLevel?.isMegaBoss) {
      this.megaBossHalo.rotation.z = -this.elapsedTime * 2.8;
    }

    const bossBaseScale = this.currentLevel?.isMegaBoss ? 1.62 : this.currentLevel?.isMiniBoss ? 1.28 : 1.0;
    if (this.bossHitFlash > 0) {
      this.bossHitFlash = Math.max(0, this.bossHitFlash - clampedDt * 7);
      const s = bossBaseScale * (1 + this.bossHitFlash * 0.12);
      this.bossGroup.scale.set(s, s, s);
    } else {
      this.bossGroup.scale.set(bossBaseScale, bossBaseScale, bossBaseScale);
    }

    if ((this.currentLevel?.isMegaBoss || this.currentLevel?.isMiniBoss) && !this.isOverrunFrenzy) {
      this.updateMegaBossMechanics(clampedDt);
    }

    if (this.colossusBoss?.active && !this.isOverrunFrenzy) {
      this.updateClockworkColossus(clampedDt);
    }

    // 4.5 Update 7-Branch Tactical Skill Tree Active Field Mechanics
    if (!this.isOverrunFrenzy) {
      this.updateSkillTreeMechanics(clampedDt);
    }

    // 5. Simulate Units, Gates, Walls, Gears, Nests & Combat
    this.simulateUnits(clampedDt);

    // Decay pooled MC-4 rainbow pierce beam visuals
    for (const beam of this.rainbowBeamPool) {
      if (!beam.active) continue;
      beam.life -= clampedDt;
      if (beam.life <= 0) {
        beam.active = false;
        beam.mesh.visible = false;
      } else {
        const ratio = beam.life / beam.maxLife;
        beam.mat.opacity = 0.85 * ratio;
        const s = 0.55 + ratio * 0.65;
        beam.mesh.scale.set(s, s, 1);
      }
    }

    // 6. Update Particles & Render
    this.updateParticles(clampedDt);
    this.syncWorldLabels();
    this.renderScene();
  }

  private updateEnvironmentSpectacle(dt: number): void {
    const t = this.elapsedTime;
    if (this.abyssShaderMat?.uniforms) {
      this.abyssShaderMat.uniforms.uTime.value = t;
    }
    if (this.waterfallShaderMat?.uniforms) {
      this.waterfallShaderMat.uniforms.uTime.value = t;
    }
    if (this.bastionShieldMat?.uniforms) {
      this.bastionShieldMat.uniforms.uTime.value = t;
    }
    if (this.planetGroup) {
      this.planetGroup.rotation.y = t * 0.045;
      this.planetGroup.position.y = 22.5 + Math.sin(t * 0.6) * 0.45;
    }
    if (this.holoGlobeGroup) {
      this.holoGlobeGroup.rotation.y = -t * 1.4;
      this.holoGlobeGroup.position.y = 2.95 + Math.sin(t * 3.2) * 0.12;
    }
    for (let i = 0; i < this.bastionTurretPods.length; i++) {
      const pod = this.bastionTurretPods[i];
      pod.rotation.y = Math.sin(t * 1.8 + i * 2.1) * 0.48;
    }
    for (let i = 0; i < this.themeSpinners.length; i++) {
      this.themeSpinners[i].rotation.z = t * (i % 2 === 0 ? 0.85 : -0.85) + i * 0.7;
    }
    for (let i = 0; i < this.floatingMonoliths.length; i++) {
      const m = this.floatingMonoliths[i];
      m.group.position.y = m.baseY + Math.sin(t * 1.65 + m.phase) * 0.58;
      m.group.rotation.y = t * 0.28 + m.phase;
      m.ringOuter.rotation.z = t * 1.45;
      m.ringInner.rotation.x = -t * 1.95;
    }
    for (let i = 0; i < this.skyCruisers.length; i++) {
      const sc = this.skyCruisers[i];
      const travel = ((t * sc.speed + sc.phase * 8.0) % 44.0) - 22.0;
      sc.group.position.z = sc.baseZ + travel * sc.dirZ * 0.65;
      sc.group.position.y = sc.baseY + Math.sin(t * 1.3 + sc.phase) * 0.45;
      sc.group.rotation.z = Math.sin(t * 0.9 + sc.phase) * 0.08;
    }

    // Periodic gentle steam puffs from distant Steampunk Airships in the sunny sky
    this.distantLaserTimer -= dt;
    if (this.distantLaserTimer <= 0 && this.skyCruisers.length >= 2) {
      this.distantLaserTimer = this.isMobileDevice ? 2.4 : 1.15;
      const pick = this.skyCruisers[Math.floor(Math.random() * this.skyCruisers.length)];
      const lx = pick.group.position.x + (Math.random() - 0.5) * 2.2;
      const lz = pick.group.position.z + (Math.random() - 0.5) * 3.0;
      this.spawnBurstParticles(lx, pick.group.position.y, lz, 0xfffaf0, this.isMobileDevice ? 2 : 4);
    }
  }

  private updateSkillTreeMechanics(dt: number): void {
    const pwr = this.state.getPowerMultiplier();

    // 1. Orbital T4 Keystone: Scorched Earth Radiation Fire Field (4.5s after Orbital Strike)
    if (this.scorchedEarthTimer > 0) {
      this.scorchedEarthTimer = Math.max(0, this.scorchedEarthTimer - dt);
      this.scorchedEarthTickTimer -= dt;
      if (this.scorchedEarthTickTimer <= 0) {
        this.scorchedEarthTickTimer = 0.42;
        const fxZ = (Math.random() - 0.5) * 20;
        const fxX = (Math.random() - 0.5) * 12;
        this.spawnSkyPillar(fxX, fxZ, 0xd946ef, 1.9, 0.38);
        this.spawnShockwave(fxX, fxZ, 0xf97316, 4.8, 0.35);
        this.spawnBurstParticles(fxX, 0.8, fxZ, 0xf97316, 18);
        for (const rIdx of this.activeRedIndices) {
          const ru = this.units[rIdx];
          if (!ru.active) continue;
          if (ru.kind === 'brute' || ru.kind === 'shaman') {
            const minHp = Math.max(15, ru.maxHp * 0.2);
            if (ru.hp > minHp) {
              ru.hp = Math.max(minHp, ru.hp - ru.maxHp * 0.035);
            }
            this.spawnBurstParticles(ru.x, 0.9, ru.z, 0xd946ef, 3);
          } else if (ru.z > BOSS_GATE_Z + 2.2) {
            ru.active = false;
            this.onUnitKilled(ru);
          }
        }
      }
    }

    // 2. Swarm T4 Keystone: Mother Hive Auto-Brood Hatching (every 6.5s spawns 4 Kamikaze Swarmers)
    if (this.state.getSkillNodeRank('swarm_t4') > 0) {
      this.swarmBroodTimer -= dt;
      if (this.swarmBroodTimer <= 0) {
        this.swarmBroodTimer = 6.5;
        this.spawnShockwave(0, PLAYER_Z - 2.2, 0x38bdf8, 4.2, 0.35);
        for (const lx of [-3.6, -1.2, 1.2, 3.6]) {
          const u = this.spawnUnit('blue', 'charged', lx, PLAYER_Z - 2.0, (Math.random() - 0.5) * 1.2, -9.2);
          if (u) u.spawnHop = 1.25;
        }
        this.spawnFloatingPopup(0, 2.2, PLAYER_Z - 2.4, '🌊 母巢自动孵化 +4自爆虫兵!', '#38bdf8');
      }
    }

    // 3. Gate T3: Phase Pulse Gate Towers (every 4.2s Blue Gates zap nearby Red enemies & auto-erupt clones!)
    const gateTowerRank = this.state.getSkillNodeRank('gate_t3');
    if (gateTowerRank > 0 && this.gates.length > 0) {
      this.gatePulseTimer -= dt;
      if (this.gatePulseTimer <= 0) {
        this.gatePulseTimer = 4.2;
        const isT4 = this.state.getSkillNodeRank('gate_t4') > 0;
        const pulseDmg = (16 + gateTowerRank * 12) * pwr;
        for (const g of this.gates) {
          if (g.cfg.op !== 'add' && g.cfg.op !== 'mul') continue;
          g.pulseTimer = 0.85;
          this.spawnShockwave(g.currentX, g.cfg.z, 0x22d3ee, 3.6, 0.32);
          this.spawnBurstParticles(g.currentX, 1.1, g.cfg.z, 0x22d3ee, 8);
          for (let c = 0; c < gateTowerRank; c++) {
            const ox = g.currentX + (Math.random() - 0.5) * Math.min(g.cfg.width * 0.65, 1.8);
            this.spawnUnit('blue', isT4 ? 'charged' : 'normal', ox, g.cfg.z - 0.35, (Math.random() - 0.5) * 2.2, -8.5);
          }
          for (const rIdx of this.activeRedIndices) {
            const ru = this.units[rIdx];
            if (!ru.active) continue;
            if ((ru.x - g.currentX) ** 2 + (ru.z - g.cfg.z) ** 2 <= 3.8 * 3.8) {
              ru.hp -= pulseDmg;
              ru.vz -= 2.5;
              this.spawnBurstParticles(ru.x, 0.9, ru.z, 0x22d3ee, 5);
              if (ru.hp <= 0) {
                ru.active = false;
                this.onUnitKilled(ru);
              }
            }
          }
        }
      }
    }

    // 4. Plasma T3: High-Voltage Sky Thunderbolt (every 4.2 - r*0.5s strikes the highest-HP Red enemy!)
    const plasmaThunderRank = this.state.getSkillNodeRank('plasma_t3');
    if (plasmaThunderRank > 0 && this.activeRedIndices.length > 0) {
      this.plasmaThunderTimer -= dt;
      if (this.plasmaThunderTimer <= 0) {
        this.plasmaThunderTimer = Math.max(2.4, 4.2 - plasmaThunderRank * 0.5);
        let bestTarget: Unit | null = null;
        for (const rIdx of this.activeRedIndices) {
          const ru = this.units[rIdx];
          if (!ru.active) continue;
          if (!bestTarget || ru.hp > bestTarget.hp) {
            bestTarget = ru;
          }
        }
        if (bestTarget) {
          const boltDmg = (36 + plasmaThunderRank * 18) * pwr;
          this.spawnSkyPillar(bestTarget.x, bestTarget.z, 0xfacc15, 1.45, 0.32);
          this.spawnShockwave(bestTarget.x, bestTarget.z, 0x00f0ff, 3.2, 0.28);
          this.spawnBurstParticles(bestTarget.x, 1.1, bestTarget.z, 0xfacc15, 18);
          bestTarget.hp -= boltDmg;
          bestTarget.empTimer = Math.max(bestTarget.empTimer || 0, 2.0);
          if (bestTarget.hp <= 0) {
            bestTarget.active = false;
            this.onUnitKilled(bestTarget);
          }
          // Splash 40% lightning damage to nearby Red enemies within 2.8m
          for (const rIdx of this.activeRedIndices) {
            const other = this.units[rIdx];
            if (!other.active || other === bestTarget) continue;
            if ((other.x - bestTarget.x) ** 2 + (other.z - bestTarget.z) ** 2 <= 2.8 * 2.8) {
              other.hp -= boltDmg * 0.4;
              other.empTimer = Math.max(other.empTimer || 0, 1.4);
              if (other.hp <= 0) {
                other.active = false;
                this.onUnitKilled(other);
              }
            }
          }
        }
      }
    }

    // 5. Orbital T1/T2/T4: Autonomous Satellite Mini-Starfall (every 5.6 - r*0.7s locks onto densest Red clusters!)
    const orbitalStarRank = this.state.getSkillNodeRank('orbital_t1');
    if (orbitalStarRank > 0 && this.activeRedIndices.length > 0) {
      this.orbitalStarfallTimer -= dt;
      if (this.orbitalStarfallTimer <= 0) {
        const isOrbitalT4 = this.state.getSkillNodeRank('orbital_t4') > 0;
        const empRank = this.state.getSkillNodeRank('orbital_t2');
        this.orbitalStarfallTimer = isOrbitalT4 ? 3.2 : Math.max(3.4, 5.6 - orbitalStarRank * 0.7);
        const c1 = this.findDensestRedCluster(3.6, 3.6);
        const clusters = [c1];
        if (isOrbitalT4) {
          clusters.push(this.findDensestRedCluster(3.6, 3.6, { x: c1.x, z: c1.z, minDist: 4.2 }));
        }
        for (const cl of clusters) {
          if (cl.count <= 0) continue;
          const sx = cl.x;
          const sz = cl.z;
          this.spawnSkyPillar(sx, sz, 0xd946ef, 1.65, 0.36);
          this.spawnShockwave(sx, sz, 0x00f0ff, 3.8, 0.34);
          this.spawnBurstParticles(sx, 1.0, sz, 0xd946ef, 20);
          const starDmg = (26 + orbitalStarRank * 10) * pwr;
          for (const rIdx of this.activeRedIndices) {
            const ru = this.units[rIdx];
            if (!ru.active) continue;
            if ((ru.x - sx) ** 2 + (ru.z - sz) ** 2 <= 3.6 * 3.6) {
              ru.hp -= starDmg;
              if (empRank > 0) {
                ru.empTimer = Math.max(ru.empTimer || 0, 1.5 + empRank * 0.6);
                ru.x = THREE.MathUtils.lerp(ru.x, sx, 0.32);
                ru.z = THREE.MathUtils.lerp(ru.z, sz, 0.32);
              }
              if (ru.hp <= 0) {
                ru.active = false;
                this.onUnitKilled(ru);
              }
            }
          }
        }
        this.state.championCharge = Math.min(100, this.state.championCharge + 3.5);
        this.state.orbitalCharge = Math.min(100, this.state.orbitalCharge + 3.5);
      }
    }

    // 6. Bastion T1: Nano Wall Base Auto-Regen (0.6% Max HP per rank per second)
    const bastionRegenRank = this.state.getSkillNodeRank('bastion_t1');
    if (bastionRegenRank > 0 && this.playerBaseHp > 0 && this.playerBaseHp < this.playerBaseMaxHp) {
      this.baseRegenTimer += dt;
      if (this.baseRegenTimer >= 1.0) {
        this.baseRegenTimer -= 1.0;
        const healAmt = this.playerBaseMaxHp * (bastionRegenRank * 0.006);
        this.playerBaseHp = Math.min(this.playerBaseMaxHp, this.playerBaseHp + healAmt);
        this.lastKnownBaseHp = Math.max(this.lastKnownBaseHp, this.playerBaseHp);
      }
    }

    // 7. Bastion T2: Dual Automated Emerald Laser Cannons at Player Base flanks (snipes across bridge up to z > -10.5)
    const bastionTurretRank = this.state.getSkillNodeRank('bastion_t2');
    if (bastionTurretRank > 0 && this.activeRedIndices.length > 0) {
      this.baseTurretTimer -= dt;
      if (this.baseTurretTimer <= 0) {
        this.baseTurretTimer = Math.max(0.75, 1.45 - bastionTurretRank * 0.2);
        const targets: Unit[] = [];
        for (const rIdx of this.activeRedIndices) {
          const ru = this.units[rIdx];
          if (ru.active && ru.z > -10.5) {
            targets.push(ru);
          }
        }
        targets.sort((a, b) => b.z - a.z);
        const laserDmg = (22 + bastionTurretRank * 14) * pwr;
        for (let t = 0; t < Math.min(2, targets.length); t++) {
          const target = targets[t];
          const turretSideX = t === 0 ? -5.8 : 5.8;
          this.spawnBurstParticles(turretSideX, 1.3, PLAYER_Z - 1.5, 0x4ade80, 6);
          this.spawnSkyPillar(target.x, target.z, 0x4ade80, 1.15, 0.25);
          this.spawnShockwave(target.x, target.z, 0x4ade80, 2.3, 0.25);
          this.spawnBurstParticles(target.x, 0.9, target.z, 0x4ade80, 12);
          target.hp -= laserDmg;
          target.vz -= 2.8;
          if (target.hp <= 0) {
            target.active = false;
            this.onUnitKilled(target);
          }
        }
      }
    }

    // 8. Bastion T4 Keystone: Periodic (every 9.5s) OR Base-Damaged Emerald Thorn Counter-Wave!
    if (this.state.getSkillNodeRank('bastion_t4') > 0) {
      this.bastionPeriodicWaveTimer -= dt;
      if (this.bastionPeriodicWaveTimer <= 0 && this.activeRedIndices.length > 0) {
        this.bastionPeriodicWaveTimer = 9.5;
        this.triggerBastionThornWave();
      }
    }
    if (this.playerBaseHp < this.lastKnownBaseHp) {
      this.baseDamageAccum += this.lastKnownBaseHp - this.playerBaseHp;
      this.lastKnownBaseHp = this.playerBaseHp;
      if (
        this.state.getSkillNodeRank('bastion_t4') > 0 &&
        this.bastionShockwavesTriggered < 2 &&
        this.baseDamageAccum >= this.playerBaseMaxHp * 0.2
      ) {
        this.baseDamageAccum = 0;
        this.bastionShockwavesTriggered++;
        this.triggerBastionThornWave();
      }
    } else {
      this.lastKnownBaseHp = this.playerBaseHp;
    }

    // 9. Tycoon T4 Keystone: Golden Royal Mercenary Airdrop every 180 Gold earned in battle!
    if (
      this.state.getSkillNodeRank('tycoon_t4') > 0 &&
      this.state.stageGoldEarned >= this.tycoonGoldMilestone
    ) {
      this.tycoonGoldMilestone += 180;
      sound.playChampionSpawn();
      this.addCameraShake(0.42);
      this.spawnSkyPillar(0, 4.5, 0xfacc15, 2.4, 0.48);
      this.spawnShockwave(0, 4.5, 0xfacc15, 6.2, 0.45);
      this.spawnBurstParticles(0, 1.5, 4.5, 0xfacc15, 45);
      for (const ox of [-2.4, -0.9, 0.9, 2.4]) {
        this.spawnUnit('blue', 'charged', ox, 4.8, (Math.random() - 0.5) * 0.8, -8.5);
      }
      this.spawnUnit('blue', 'charged', 0, 4.2, 0, -8.2, undefined, true);
      this.spawnFloatingPopup(0, 2.6, 4.5, '👑 黄金皇家雇佣军空降参战!', '#facc15');
    }

    // 10. Scene Special Effect Periodic Environmental Pulse (Sakura / Glacier / Magma / Ocean)
    this.sceneEffectTimer -= dt;
    if (this.sceneEffectTimer <= 0) {
      const themeId = this.currentTheme.id;
      if (themeId === 'sakura') {
        this.sceneEffectTimer = 4.5;
        if (this.activeBlueIndices.length > 0 || this.playerBaseHp < this.playerBaseMaxHp) {
          for (const bIdx of this.activeBlueIndices) {
            const bu = this.units[bIdx];
            if (bu.active) bu.hp = Math.min(bu.maxHp, bu.hp + bu.maxHp * 0.22);
          }
          const healBase = Math.round(this.playerBaseMaxHp * 0.03);
          this.playerBaseHp = Math.min(this.playerBaseMaxHp, this.playerBaseHp + healBase);
          this.lastKnownBaseHp = Math.max(this.lastKnownBaseHp, this.playerBaseHp);
          this.spawnShockwave(0, 2.0, 0xff80b5, 8.5, 0.42);
          this.spawnBurstParticles(0, 1.4, 2.0, 0xffb3d1, 24);
          this.spawnFloatingPopup(0, 2.4, 2.0, '🌸 落樱祈福: 全军治愈!', '#f472b6');
        }
      } else if (themeId === 'glacier') {
        this.sceneEffectTimer = 5.0;
        if (this.activeRedIndices.length > 0) {
          const frostDmg = 18 * pwr;
          for (const rIdx of this.activeRedIndices) {
            const ru = this.units[rIdx];
            if (!ru.active) continue;
            ru.hp -= frostDmg;
            ru.empTimer = Math.max(ru.empTimer || 0, 1.4);
            if (ru.hp <= 0) {
              ru.active = false;
              this.onUnitKilled(ru);
            }
          }
          this.spawnShockwave(0, 0, 0x38bdf8, 9.5, 0.45);
          this.spawnBurstParticles(0, 1.2, 0, 0x67e8f9, 28);
          this.spawnFloatingPopup(0, 2.4, 0, '🍧 极寒霜冻波: 全场冰封减速!', '#38bdf8');
        }
      } else if (themeId === 'magma') {
        this.sceneEffectTimer = 5.0;
        if (this.activeRedIndices.length > 0) {
          const burnDmg = 24 * pwr;
          for (const rIdx of this.activeRedIndices) {
            const ru = this.units[rIdx];
            if (!ru.active) continue;
            ru.hp -= burnDmg;
            if (ru.hp <= 0) {
              ru.active = false;
              this.onUnitKilled(ru);
            }
          }
          this.spawnShockwave(0, 0, 0xf97316, 9.5, 0.45);
          this.spawnBurstParticles(0, 1.2, 0, 0xfbbf24, 28);
          this.spawnFloatingPopup(0, 2.4, 0, '🥐 焦糖热浪: 全场灼烧!', '#fb923c');
        }
      } else if (themeId === 'ocean') {
        this.sceneEffectTimer = 5.0;
        if (this.activeRedIndices.length > 0) {
          for (const rIdx of this.activeRedIndices) {
            const ru = this.units[rIdx];
            if (!ru.active) continue;
            ru.z = Math.max(BOSS_GATE_Z + 1.5, ru.z - 2.6);
            ru.vz = -5.5;
            ru.spawnHop = Math.max(ru.spawnHop, 0.65);
          }
          this.spawnShockwave(0, 2.5, 0x2dd4bf, 10.5, 0.48);
          this.spawnBurstParticles(0, 1.2, 2.5, 0x38bdf8, 28);
          this.spawnFloatingPopup(0, 2.4, 2.5, '🐳 潮汐浮力: 巨浪推退敌军!', '#2dd4bf');
        }
      } else {
        this.sceneEffectTimer = 5.0;
      }
    }
  }

  private triggerBastionThornWave(): void {
    sound.playExplosion();
    this.triggerContinuousQuake(0.65, 1.05);
    this.triggerScreenFlash('#4ade80', 0.65);
    this.spawnSkyPillar(0, PLAYER_Z - 2.5, 0x4ade80, 3.2, 0.52);
    this.spawnShockwave(0, PLAYER_Z - 2.5, 0x4ade80, 14.5, 0.58);
    this.spawnShockwave(0, 2.0, 0x00f0ff, 11.5, 0.48);
    this.spawnBurstParticles(0, 1.4, PLAYER_Z - 2.5, 0x4ade80, 75);

    for (const rIdx of this.activeRedIndices) {
      const ru = this.units[rIdx];
      if (!ru.active) continue;
      if (ru.kind === 'brute' || ru.kind === 'shaman') {
        ru.hp = Math.max(15, ru.hp - ru.maxHp * 0.16);
        ru.z = Math.max(BOSS_GATE_Z + 2.0, ru.z - 5.5);
        ru.vz = -9.5;
        ru.spawnHop = 1.1;
      } else if (ru.z > 2.0) {
        ru.active = false;
        this.onUnitKilled(ru);
      } else {
        ru.z = Math.max(BOSS_GATE_Z + 1.5, ru.z - 4.5);
        ru.vz = -8.0;
      }
    }

    // Airdrop 4 Golden Praetorian Guards at the defense line!
    for (let i = 0; i < 4; i++) {
      const gx = -3.6 + i * 2.4;
      this.spawnUnit('blue', 'charged', gx, PLAYER_Z - 2.2, (Math.random() - 0.5) * 1.0, -9.2);
    }

    this.spawnFloatingPopup(0, 2.8, PLAYER_Z - 3.0, '🛡️ 荆棘电磁反推! 4名禁卫军空降!', '#4ade80');
    this.onBanner?.('🛡️ 堡垒基石【荆棘电磁反推】触发！', '前排红军震退 · 4名黄金禁卫军紧急参战！');
  }

  private formatGateLabel(cfg: GateConfig): string {
    if (cfg.op === 'giant_jelly') return '巨化×2';
    if (cfg.op === 'frost_shield') return '糖霜盾';
    const prefix = cfg.op === 'add' ? '+' : cfg.op === 'mul' ? '×' : cfg.op === 'div' ? '÷' : '-';
    return `${prefix}${cfg.value}`;
  }

  private syncGateVisualStyle(g: GateRuntime): void {
    const { op, value } = g.cfg;
    if (op === 'giant_jelly') {
      g.cfg.style = 'jelly';
      const labelStr = '巨化×2';
      g.labelEl.textContent = labelStr;
      g.labelEl.className = 'gate-label gold-gate';
      g.pillarMat.color.setHex(0xfb7185);
      g.pillarMat.emissive.setHex(0x881337);
      g.shieldMat.map = this.getGateBannerTexture('jelly', labelStr);
      g.shieldMat.needsUpdate = true;
      return;
    }
    if (op === 'frost_shield') {
      g.cfg.style = 'frost';
      const labelStr = '糖霜盾';
      g.labelEl.textContent = labelStr;
      g.labelEl.className = 'gate-label';
      g.pillarMat.color.setHex(0x38bdf8);
      g.pillarMat.emissive.setHex(0x0c4a6e);
      g.shieldMat.map = this.getGateBannerTexture('frost', labelStr);
      g.shieldMat.needsUpdate = true;
      return;
    }
    if (op === 'sub' || op === 'div') {
      g.cfg.style = 'hazard';
      const labelStr = this.formatGateLabel(g.cfg);
      g.labelEl.textContent = labelStr;
      g.labelEl.className = 'gate-label hazard-gate';
      const initVal = Math.max(1, g.initialHazardValue || value || 6);
      const stepReq = op === 'div' ? 8 : 3;
      const weakenedRatio =
        op === 'div'
          ? THREE.MathUtils.clamp(g.chargeHits / stepReq, 0, 1)
          : THREE.MathUtils.clamp(
              (initVal - value + THREE.MathUtils.clamp(g.chargeHits / stepReq, 0, 0.99)) / initVal,
              0,
              1
            );
      const cCrimsonToCyan = new THREE.Color(0xe11d48).lerp(new THREE.Color(0x38bdf8), weakenedRatio * 0.85);
      g.pillarMat.color.copy(cCrimsonToCyan);
      g.pillarMat.emissive.setHex(weakenedRatio >= 0.55 ? 0x1e3a8a : 0x4c0519);
      g.shieldMat.map = this.getGateBannerTexture('hazard', labelStr);
      g.shieldMat.needsUpdate = true;
      return;
    }
    if (op === 'mul') {
      const labelStr = `×${value}`;
      g.labelEl.textContent = labelStr;
      const style: GateStyle = value >= 3 ? 'mega' : 'gold';
      g.cfg.style = style;
      g.pillarMat.color.setHex(style === 'mega' ? 0xe879f9 : 0xe8ad38);
      g.pillarMat.emissive.setHex(style === 'mega' ? 0x4a044e : 0x3b2306);
      g.shieldMat.map = this.getGateBannerTexture(style, labelStr);
      g.shieldMat.needsUpdate = true;
      g.labelEl.className = style === 'mega' ? 'gate-label mega-gate' : 'gate-label gold-gate';
      return;
    }
    this.syncBlueGateVisualStyle(g);
  }

  private syncBlueGateVisualStyle(g: GateRuntime): void {
    const labelStr = `+${g.cfg.value}`;
    g.labelEl.textContent = labelStr;
    if (g.cfg.value >= 6) {
      g.cfg.style = 'mega';
      g.pillarMat.color.setHex(0xe879f9);
      g.pillarMat.emissive.setHex(0x4a044e);
      g.shieldMat.map = this.getGateBannerTexture('mega', labelStr);
      g.shieldMat.needsUpdate = true;
      g.labelEl.className = 'gate-label mega-gate';
    } else if (g.cfg.value >= 5) {
      g.cfg.style = 'gold';
      g.pillarMat.color.setHex(0xfbbf24);
      g.pillarMat.emissive.setHex(0x451a03);
      g.shieldMat.map = this.getGateBannerTexture('gold', labelStr);
      g.shieldMat.needsUpdate = true;
      g.labelEl.className = 'gate-label gold-gate';
    } else {
      g.cfg.style = 'blue';
      g.pillarMat.color.setHex(g.flippedFromHazard ? 0x38bdf8 : 0xe8ad38);
      g.pillarMat.emissive.setHex(g.flippedFromHazard ? 0x0c4a6e : 0x3b2306);
      g.shieldMat.map = this.getGateBannerTexture('blue', labelStr);
      g.shieldMat.needsUpdate = true;
      g.labelEl.className = 'gate-label';
    }
  }

  public chargeGate(g: GateRuntime, hitPower: number, silent = false): void {
    if (hitPower <= 0) return;
    if (g.cfg.op === 'sub') {
      g.chargeHits += hitPower;
      g.pulseTimer = Math.max(g.pulseTimer, 0.75);
      const stepHits = 3;
      let changed = false;
      while (g.cfg.op === 'sub' && g.chargeHits >= stepHits) {
        g.chargeHits -= stepHits;
        if (g.cfg.value <= 1) {
          this.flipHazardGateToBlue(g, silent);
          return;
        }
        g.cfg.value -= 1;
        changed = true;
      }
      this.syncGateVisualStyle(g);
      if (changed && !silent && this.gatePopupCooldown <= 0) {
        this.gatePopupCooldown = 0.16;
        this.spawnShockwave(g.currentX, g.cfg.z, 0xfacc15, 2.5, 0.28);
        this.spawnFloatingPopup(g.currentX, 1.9, g.cfg.z, `门脉充能 -${g.cfg.value}`, '#facc15');
      }
      return;
    }

    if (g.cfg.op === 'div') {
      g.chargeHits += hitPower;
      g.pulseTimer = Math.max(g.pulseTimer, 0.75);
      if (g.chargeHits >= 8) {
        this.flipHazardGateToBlue(g, silent);
        return;
      }
      this.syncGateVisualStyle(g);
      return;
    }

    if (g.cfg.op === 'add') {
      const maxCap = Math.max(5, this.state.getMaxBlueGateCap());
      if (g.cfg.value >= maxCap) return;
      g.chargeHits += hitPower;
      g.pulseTimer = Math.max(g.pulseTimer, 0.65);
      const req = g.flippedFromHazard ? 6 : 22 + g.cfg.value * 8;
      let upgraded = false;
      while (g.chargeHits >= req && g.cfg.value < maxCap) {
        g.chargeHits -= req;
        const stepAdd = g.flippedFromHazard && g.cfg.value < 5 ? 2 : 1;
        g.cfg.value = Math.min(maxCap, g.cfg.value + stepAdd);
        upgraded = true;
      }
      if (upgraded) {
        this.syncGateVisualStyle(g);
        if (!silent) {
          this.spawnSkyPillar(g.currentX, g.cfg.z, g.cfg.value >= 5 ? 0xfbbf24 : 0x38bdf8, 1.45, 0.34);
          this.spawnShockwave(g.currentX, g.cfg.z, 0xfacc15, 3.1, 0.34);
          this.spawnFloatingPopup(
            g.currentX,
            2.0,
            g.cfg.z,
            g.cfg.value >= 5 ? `蓄力满阶 +${g.cfg.value}!` : `蓄力升阶 +${g.cfg.value}!`,
            g.cfg.value >= 5 ? '#fde047' : '#38bdf8'
          );
        }
      }
    }
  }

  private triggerThorSuperRailgun(): void {
    sound.playExplosion();
    const isT4 = this.state.getSkillNodeRank('plasma_t4') > 0;
    this.addCameraShake(isT4 ? 0.52 : 0.35);
    const lanes = isT4
      ? [
          THREE.MathUtils.clamp(this.turretX - 3.6, -8.5, 8.5),
          this.turretX,
          THREE.MathUtils.clamp(this.turretX + 3.6, -8.5, 8.5),
        ]
      : [this.turretX];

    for (const lx of lanes) {
      this.spawnSkyPillar(lx, PLAYER_Z - 2.2, 0xfacc15, 1.7, 0.38);
      this.spawnShockwave(lx, PLAYER_Z - 2.2, 0xfacc15, 3.6, 0.34);
      for (const zStep of [12, 6, 0, -6, -12]) {
        this.spawnSkyPillar(lx, zStep, 0x00f0ff, 1.2, 0.28);
        this.spawnShockwave(lx, zStep, 0xfacc15, 2.6, 0.26);
        this.spawnBurstParticles(lx, 1.0, zStep, 0xfacc15, 10);
      }
    }

    const railDmg = (isT4 ? 54 : 42) * this.state.getPowerMultiplier();
    let hitCount = 0;
    for (const rIdx of this.activeRedIndices) {
      const ru = this.units[rIdx];
      if (!ru.active) continue;
      if (lanes.some((lx) => Math.abs(ru.x - lx) <= 2.1)) {
        hitCount++;
        ru.hp -= railDmg;
        ru.empTimer = Math.max(ru.empTimer || 0, 1.6);
        ru.spawnHop = 0.8;
        if (ru.hp <= 0) {
          ru.active = false;
          this.onUnitKilled(ru);
        }
      }
    }

    // Also charge any Gate along the railgun beams!
    for (const g of this.gates) {
      if (lanes.some((lx) => Math.abs(g.currentX - lx) <= g.cfg.width * 0.6)) {
        this.chargeGate(g, 4);
        this.spawnBurstParticles(g.currentX, 1.2, g.cfg.z, 0xfacc15, 10);
      }
    }

    this.spawnFloatingPopup(
      this.turretX,
      2.2,
      PLAYER_Z - 3.2,
      `⚡ ${isT4 ? '3道雷神超导主炮' : '雷神超导贯穿炮'} (-${hitCount})!`,
      '#facc15'
    );
  }

  private computeGiantTierStats(tier: number, isChargedBase = false): { maxHp: number; dmg: number; radius: number } {
    const pwr = this.state.getPowerMultiplier();
    const giantSpec = this.state.getGiantTrooperSpec();
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

  private promoteGiantUnit(
    u: Unit,
    targetTier: number,
    absorbedMaxHp = 0,
    _absorbedDmg = 0,
    absorbedCurHp = 0,
    showPopup = true
  ): void {
    const clampedTier = Math.min(4, Math.max(2, targetTier));
    const prevHpRatio = u.maxHp > 0 ? u.hp / u.maxHp : 1;
    const partnerHpRatio = absorbedMaxHp > 0 ? absorbedCurHp / absorbedMaxHp : prevHpRatio;
    const mergedHpRatio = Math.min(1.0, (prevHpRatio + partnerHpRatio) * 0.58);

    const nextStats = this.computeGiantTierStats(clampedTier, true);
    u.fusionTier = clampedTier;
    u.isMiniGiant = true;
    u.kind = 'charged';
    u.fusionCooldown = 1.35;
    u.spawnHop = 1.28;
    u.radius = nextStats.radius;
    u.maxHp = nextStats.maxHp;
    u.hp = Math.max(1, nextStats.maxHp * mergedHpRatio);
    u.dmg = nextStats.dmg;

    const fxColor = clampedTier >= 4 ? 0xfacc15 : clampedTier === 3 ? 0xf97316 : 0xfbbf24;
    this.spawnShockwave(u.x, u.z, fxColor, 1.5 + clampedTier * 0.45, 0.3);
    this.spawnBurstParticles(u.x, 1.0, u.z, fxColor, 7 + clampedTier * 3);
    if (clampedTier >= 3) {
      this.spawnSkyPillar(u.x, u.z, fxColor, 1.05, 0.26);
    }
    if (showPopup) {
      const label =
        clampedTier >= 4
          ? '👑 四阶灭世神兵!'
          : clampedTier === 3
            ? '🔥 合体! 三阶远古巨神!'
            : '🗿 合体! 二阶巨神!';
      const col = clampedTier >= 4 ? '#fde047' : clampedTier === 3 ? '#fb923c' : '#fcd34d';
      this.spawnFloatingPopup(u.x, 1.85 + clampedTier * 0.22, u.z, label, col);
    }
  }

  public resetTacticalAirdrop(resetBuffs = true): void {
    if (this.airdrop) {
      this.airdrop.active = false;
      this.airdrop.phase = 'falling';
      this.airdrop.y = 11.5;
      this.airdrop.hp = this.airdrop.maxHp;
      this.airdrop.group.visible = false;
      this.airdrop.group.rotation.set(0, 0, 0);
      this.airdrop.parachuteGroup.visible = true;
      if (this.airdrop.labelEl) {
        this.airdrop.labelEl.style.display = 'none';
      }
    }
    this.airdropSpawnTimer = 11.5;
    if (resetBuffs) {
      this.dualVolleyTimer = 0;
      this.freezeRedsTimer = 0;
      this.frontlineGiantsTimer = 0;
      this.lastAirdropBuff = null;
      this.airdropDropCount = 0;
      this.airdropCollectCount = 0;
      for (const beam of this.rainbowBeamPool) {
        beam.active = false;
        beam.mesh.visible = false;
      }
    }
  }

  public spawnTacticalAirdrop(forceX?: number, forceZ?: number): boolean {
    if (!this.airdrop || this.currentLevel?.isBonusHeist || this.isOverrunFrenzy) {
      return false;
    }
    const ax =
      typeof forceX === 'number'
        ? THREE.MathUtils.clamp(forceX, -TRACK_HALF_W + 2.0, TRACK_HALF_W - 2.0)
        : (Math.random() - 0.5) * 11.6;
    const az =
      typeof forceZ === 'number'
        ? THREE.MathUtils.clamp(forceZ, -7.5, 9.5)
        : -2.0 + (Math.random() - 0.5) * 6.5;

    this.airdrop.active = true;
    this.airdrop.phase = 'falling';
    this.airdrop.x = ax;
    this.airdrop.y = 11.5;
    this.airdrop.z = az;
    this.airdrop.maxHp = 4;
    this.airdrop.hp = 4;
    this.airdrop.bobPhase = 0;
    this.airdrop.lifeTimer = 24.0;
    this.airdrop.parachuteGroup.visible = true;
    this.airdrop.group.position.set(ax, 11.5, az);
    this.airdrop.group.rotation.set(0, 0, 0);
    this.airdrop.haloMesh.position.y = -11.5 + 0.08;
    this.airdrop.group.visible = true;
    this.airdropDropCount++;

    sound.playAirdropDrop();
    this.spawnShockwave(ax, az, 0x38bdf8, 2.8, 0.35);
    this.spawnFloatingPopup(ax, 2.2, az, `${UI_ART.tacticalAirdrop} 蒸汽战术空投降落！`, '#38bdf8');
    return true;
  }

  private updateTacticalAirdrop(dt: number): void {
    if (!this.airdrop || this.currentLevel?.isBonusHeist) return;
    if (!this.airdrop.active) {
      this.airdropSpawnTimer -= dt;
      if (this.airdropSpawnTimer <= 0) {
        this.spawnTacticalAirdrop();
      }
      return;
    }

    if (this.airdrop.phase === 'falling') {
      this.airdrop.y -= 5.6 * dt;
      const sway = Math.sin(this.elapsedTime * 4.5) * 0.14;
      this.airdrop.group.rotation.z = sway;
      if (this.airdrop.y <= 0) {
        this.airdrop.y = 0;
        this.airdrop.phase = 'landed';
        this.airdrop.parachuteGroup.visible = false;
        this.airdrop.group.rotation.z = 0;
        this.airdrop.haloMesh.position.y = 0.08;
        this.spawnShockwave(this.airdrop.x, this.airdrop.z, 0x38bdf8, 3.8, 0.38);
        this.spawnBurstParticles(this.airdrop.x, 0.6, this.airdrop.z, 0x38bdf8, 18);
      } else {
        this.airdrop.haloMesh.position.y = -this.airdrop.y + 0.08;
      }
      this.airdrop.group.position.set(this.airdrop.x, Math.max(0, this.airdrop.y), this.airdrop.z);
    } else {
      this.airdrop.bobPhase += dt * 4.2;
      this.airdrop.lifeTimer -= dt;
      this.airdrop.group.position.set(
        this.airdrop.x,
        Math.abs(Math.sin(this.airdrop.bobPhase)) * 0.12,
        this.airdrop.z
      );
      this.airdrop.haloMesh.rotation.z = this.elapsedTime * 1.6;
      if (this.airdrop.lifeTimer <= 0) {
        this.resetTacticalAirdrop(false);
        this.airdropSpawnTimer = 15.0;
      }
    }
  }

  public hitTacticalAirdrop(dmg = 1, forceBuff?: TacticalAirdropBuffId): boolean {
    if (!this.airdrop || !this.airdrop.active) return false;
    this.airdrop.hp = Math.max(0, this.airdrop.hp - Math.max(1, dmg));
    this.spawnBurstParticles(this.airdrop.x, Math.max(0.6, this.airdrop.y + 0.5), this.airdrop.z, 0x38bdf8, 6);
    if (this.airdrop.hp <= 0) {
      this.applyTacticalAirdropBuff(forceBuff);
      return true;
    }
    return false;
  }

  public applyTacticalAirdropBuff(forceBuff?: TacticalAirdropBuffId): TacticalAirdropBuffId {
    const pool: TacticalAirdropBuffId[] = ['dual_volley', 'freeze_reds', 'frontline_giants'];
    const picked: TacticalAirdropBuffId = forceBuff || pool[Math.floor(Math.random() * pool.length)];
    const ax = this.airdrop?.active ? this.airdrop.x : this.turretX;
    const az = this.airdrop?.active ? this.airdrop.z : 1.0;

    if (this.airdrop) {
      this.airdrop.active = false;
      this.airdrop.group.visible = false;
      if (this.airdrop.labelEl) this.airdrop.labelEl.style.display = 'none';
    }
    this.airdropSpawnTimer = 16.5;
    this.airdropCollectCount++;
    this.lastAirdropBuff = picked;

    sound.playAirdropOpen();
    this.addCameraShake(0.32);
    this.spawnSkyPillar(ax, az, 0x38bdf8, 2.2, 0.52);
    this.spawnShockwave(ax, az, 0x38bdf8, 5.2, 0.45);
    this.spawnBurstParticles(ax, 1.0, az, 0xfacc15, 42);

    if (picked === 'dual_volley') {
      this.dualVolleyTimer = 8.0;
      this.spawnFloatingPopup(ax, 2.3, az, `${UI_ART.tacticalAirdrop} 双倍连射狂热 8s!`, '#facc15');
      this.onBanner?.(`${UI_ART.tacticalAirdrop} 空投激活：双倍连射 8s`, '主炮切换双排并行齐射！');
    } else if (picked === 'freeze_reds') {
      this.freezeRedsTimer = 8.0;
      for (let i = 0; i < MAX_UNITS; i++) {
        const ru = this.units[i];
        if (ru.active && ru.team === 'red') {
          ru.empTimer = Math.max(ru.empTimer || 0, 2.0);
        }
      }
      this.spawnShockwave(0, 0, 0x7dd3fc, 13.0, 0.55);
      this.spawnFloatingPopup(ax, 2.3, az, `${UI_ART.tacticalAirdrop} 冰霜缓敌全场 8s!`, '#7dd3fc');
      this.onBanner?.(`${UI_ART.tacticalAirdrop} 空投激活：冰霜缓敌 8s`, '全体红军移速大幅冻结减缓！');
    } else {
      this.frontlineGiantsTimer = 8.0;
      let promoted = 0;
      for (const bIdx of this.activeBlueIndices) {
        const bu = this.units[bIdx];
        if (!bu || !bu.active || bu.kind === 'champion' || bu.isMiniGiant) continue;
        bu.isMiniGiant = true;
        bu.fusionTier = Math.max(1, bu.fusionTier || 0);
        bu.maxHp *= 1.6;
        bu.hp *= 1.6;
        bu.dmg *= 1.45;
        bu.radius = Math.max(bu.radius, 0.46);
        bu.spawnHop = Math.max(bu.spawnHop, 0.55);
        promoted++;
        if (promoted >= 16) break;
      }
      this.spawnFloatingPopup(ax, 2.3, az, `${UI_ART.tacticalAirdrop} 前线巨人阵 8s!`, '#4ade80');
      this.onBanner?.(`${UI_ART.tacticalAirdrop} 空投激活：前线巨人阵 8s`, '前线波波集结进阶为重装小巨人！');
    }
    return picked;
  }

  private triggerRainbowPierceBeam(laneX: number): number {
    const palette = [0xff4d6d, 0xfacc15, 0x4ade80, 0x38bdf8, 0xc084fc];
    const col = palette[Math.floor(this.elapsedTime * 8) % palette.length];
    for (const beam of this.rainbowBeamPool) {
      if (!beam.active) {
        beam.active = true;
        beam.life = beam.maxLife;
        beam.mat.color.setHex(col);
        beam.mat.opacity = 0.88;
        beam.mesh.position.set(laneX, 0.95, (PLAYER_Z + BOSS_GATE_Z) * 0.5);
        beam.mesh.scale.set(1.15, 1.15, 1);
        beam.mesh.visible = true;
        break;
      }
    }

    this.addCameraShake(0.24);
    this.spawnShockwave(laneX, PLAYER_Z - 1.8, col, 3.2, 0.3);
    for (const zStep of [11, 4, -3, -10]) {
      this.spawnBurstParticles(laneX, 1.0, zStep, col, 8);
    }

    const beamDmg = 34 * this.state.getPowerMultiplier();
    let hitCount = 0;
    for (let i = 0; i < MAX_UNITS; i++) {
      const ru = this.units[i];
      if (!ru.active || ru.team !== 'red') continue;
      if (Math.abs(ru.x - laneX) <= 2.35) {
        hitCount++;
        ru.hp -= beamDmg;
        ru.z = Math.max(BOSS_GATE_Z + 0.8, ru.z - 0.65);
        ru.spawnHop = Math.max(ru.spawnHop, 0.55);
        if (ru.hp <= 0) {
          ru.active = false;
          this.onUnitKilled(ru);
        }
      }
    }

    for (const g of this.gates) {
      if (Math.abs(g.currentX - laneX) <= g.cfg.width * 0.58) {
        this.chargeGate(g, 3);
      }
    }

    if (this.lootBug.active && Math.abs(this.lootBug.x - laneX) <= 1.75) {
      this.lootBug.hp = Math.max(0, this.lootBug.hp - 2);
      this.lootBug.hitFlash = 1.0;
    }

    if (this.airdrop?.active && Math.abs(this.airdrop.x - laneX) <= 1.75) {
      this.hitTacticalAirdrop(2);
    }

    return hitCount;
  }

  private fireTurret(): void {
    const giantSpec = this.state.getGiantTrooperSpec();
    const weapon = this.state.weapon;
    this.turretRecoil = giantSpec.isGiantMode ? 1.68 : 1.35;
    sound.playShoot(giantSpec.isGiantMode ? 'plasma' : weapon);

    // Every trooper volley fired charges the Hero Energy Bar (supercharged while actively holding!)
    const chargeMult = this.state.getSkillChargeMultiplier() * (giantSpec.isGiantMode ? 1.35 : 1.0);
    const shotCharge =
      (this.isHoldingFireInput() ? 1.5 : this.isSteeringInput() ? 0.85 : 0.52) * chargeMult;
    this.state.championCharge = Math.min(100, this.state.championCharge + shotCharge);
    const rainbowCols = [0xff4d6d, 0xfacc15, 0x4ade80, 0x38bdf8, 0xc084fc];
    const muzzleCol = giantSpec.isGiantMode
      ? 0xf97316
      : weapon === 'rainbow'
        ? rainbowCols[this.rainbowShotCounter % rainbowCols.length]
        : weapon === 'scatter'
          ? 0x22d3ee
          : this.currentTurretEvoTier === 2
            ? 0xfacc15
            : weapon === 'plasma'
              ? 0xfacc15
              : 0x00f0ff;
    this.spawnBurstParticles(
      this.turretX,
      0.9,
      PLAYER_Z - 1.5,
      muzzleCol,
      giantSpec.isGiantMode ? 12 : weapon === 'scatter' ? 9 : this.currentTurretEvoTier >= 1 ? 8 : 5
    );
    if (giantSpec.isGiantMode) {
      this.spawnShockwave(this.turretX, PLAYER_Z - 1.5, 0xf97316, 2.2, 0.25);
      this.addCameraShake(0.06);
    } else if (weapon === 'scatter') {
      this.spawnShockwave(this.turretX, PLAYER_Z - 1.5, 0x22d3ee, 1.75, 0.2);
    } else if (this.currentTurretEvoTier === 2 && Math.random() < 0.35) {
      this.spawnShockwave(this.turretX, PLAYER_Z - 1.5, 0xfacc15, 1.8, 0.22);
    }

    // MC-1: Cannon kinetic resonance charges aligned forward gate pillars/banners!
    let nearestAlignedGate: GateRuntime | null = null;
    for (const g of this.gates) {
      if (g.cfg.op !== 'sub' && g.cfg.op !== 'div' && g.cfg.op !== 'add') continue;
      if (g.cfg.z < -6.0) continue;
      if (Math.abs(g.currentX - this.turretX) <= g.cfg.width * 0.56) {
        if (!nearestAlignedGate || g.cfg.z > nearestAlignedGate.cfg.z) {
          nearestAlignedGate = g;
        }
      }
    }
    if (nearestAlignedGate) {
      this.chargeGate(nearestAlignedGate, 0.75);
    }

    const critChance = this.state.getChargedCritChance();
    const miniGiantChance = this.state.getMiniGiantChance();
    const resolveKind = (): 'normal' | 'charged' =>
      this.skillOverdriveTimer > 0 || Math.random() < critChance ? 'charged' : 'normal';
    const rollMiniGiant = (): boolean => miniGiantChance > 0 && Math.random() < miniGiantChance;

    const extraCloneChance = Math.max(
      this.skillOverdriveTimer > 0 ? 1.0 : 0,
      this.state.getExtraCloneChance()
    );
    const guaranteedBonus = Math.floor(extraCloneChance);
    const bonusCount =
      guaranteedBonus + (Math.random() < extraCloneChance - guaranteedBonus ? 1 : 0);
    const totalVolley = 1 + bonusCount;
    const dualVolleyRows = this.dualVolleyTimer > 0 ? [-0.66, 0.66] : [0];

    let triggerRainbowBeamNow = false;
    if (weapon === 'rainbow') {
      this.rainbowShotCounter++;
      if (this.rainbowShotCounter >= 4) {
        this.rainbowShotCounter = 0;
        triggerRainbowBeamNow = true;
      }
    }

    for (const rowOffset of dualVolleyRows) {
      const originX = this.turretX + rowOffset;
      if (weapon === 'scatter') {
        const fanAngles = [-0.34, 0, 0.34];
        for (let f = 0; f < fanAngles.length; f++) {
          const ang = fanAngles[f];
          const isMG = rollMiniGiant();
          const unit = this.spawnUnit(
            'blue',
            isMG ? 'charged' : resolveKind(),
            originX + ang * 1.15,
            PLAYER_Z - 1.4,
            Math.sin(ang) * 9.8,
            -Math.cos(ang) * 9.3,
            undefined,
            isMG
          );
          if (unit) {
            unit.scatterBounceLeft = 2;
          }
        }
        if (bonusCount > 0) {
          const extraU = this.spawnUnit(
            'blue',
            resolveKind(),
            originX,
            PLAYER_Z - 1.4,
            (Math.random() - 0.5) * 4.0,
            -9.4,
            undefined,
            rollMiniGiant()
          );
          if (extraU) extraU.scatterBounceLeft = 2;
        }
      } else if (weapon === 'rainbow') {
        if (triggerRainbowBeamNow) {
          this.triggerRainbowPierceBeam(originX);
          this.spawnUnit('blue', 'charged', originX, PLAYER_Z - 1.4, 0, -9.8, undefined, true);
        } else {
          for (let i = 0; i < totalVolley; i++) {
            const spreadIdx = i - (totalVolley - 1) * 0.5;
            const offsetX = spreadIdx * 0.88;
            const isMG = rollMiniGiant();
            this.spawnUnit(
              'blue',
              isMG ? 'charged' : resolveKind(),
              originX + offsetX,
              PLAYER_Z - 1.4,
              offsetX * 0.45,
              -9.3,
              undefined,
              isMG
            );
          }
        }
      } else if (totalVolley >= 2) {
        for (let i = 0; i < totalVolley; i++) {
          const spreadIdx = i - (totalVolley - 1) * 0.5;
          const offsetX = spreadIdx * 0.88;
          const isMG = rollMiniGiant();
          this.spawnUnit(
            'blue',
            isMG ? 'charged' : resolveKind(),
            originX + offsetX,
            PLAYER_Z - 1.4,
            offsetX * 0.45,
            -9.25,
            undefined,
            isMG
          );
        }
      } else {
        const isMG = rollMiniGiant();
        this.spawnUnit(
          'blue',
          isMG ? 'charged' : resolveKind(),
          originX + (Math.random() - 0.5) * 0.22,
          PLAYER_Z - 1.4,
          0,
          -9.2,
          undefined,
          isMG
        );
      }
    }

    if (this.airdrop?.active && this.airdrop.phase === 'landed' && Math.abs(this.turretX - this.airdrop.x) <= 1.45) {
      this.hitTacticalAirdrop(1);
    }

    // MC-9: Steam Cannon Core Module enhanced volley mechanics
    this.fireCannonCoreModuleShot(this.turretX, resolveKind);

    // Bastion T3: Periodic Praetorian Heavy Guard deployment every (13 - r*2) shots!
    const praetorianRank = this.state.getSkillNodeRank('bastion_t3');
    if (praetorianRank > 0) {
      this.praetorianShotCounter++;
      const reqShots = Math.max(7, 13 - praetorianRank * 2);
      if (this.praetorianShotCounter >= reqShots) {
        this.praetorianShotCounter = 0;
        const guardX = THREE.MathUtils.clamp(
          this.turretX + (Math.random() < 0.5 ? -0.95 : 0.95),
          -TRACK_HALF_W + 1.2,
          TRACK_HALF_W - 1.2
        );
        const guard = this.spawnUnit('blue', 'charged', guardX, PLAYER_Z - 1.5, 0, -9.0, undefined, true);
        if (guard) {
          guard.maxHp *= 1.35 + praetorianRank * 0.2;
          guard.hp = guard.maxHp;
          guard.dmg *= 1.2 + praetorianRank * 0.12;
          guard.spawnHop = 1.1;
          this.spawnShockwave(guardX, PLAYER_Z - 1.5, 0x4ade80, 2.2, 0.28);
          this.spawnBurstParticles(guardX, 0.9, PLAYER_Z - 1.5, 0x4ade80, 12);
          this.spawnFloatingPopup(guardX, 1.9, PLAYER_Z - 1.5, '🛡️ 禁卫重装出击!', '#4ade80');
        }
      }
    }

    // Plasma T4 Keystone: Thor Superconducting Railgun every 15 shots!
    if (this.state.getSkillNodeRank('plasma_t4') > 0) {
      this.shotsFiredCounter++;
      if (this.shotsFiredCounter >= 15) {
        this.shotsFiredCounter = 0;
        this.triggerThorSuperRailgun();
      }
    }
  }

  private isSegmentBlockedByWall(x1: number, z1: number, x2: number, z2: number): boolean {
    const wallCount = this.walls.length;
    if (wallCount === 0) return false;
    const minZ = z1 < z2 ? z1 : z2;
    const maxZ = z1 > z2 ? z1 : z2;
    for (let i = 0; i < wallCount; i++) {
      const w = this.walls[i];
      const wMinZ = w.z1 < w.z2 ? w.z1 : w.z2;
      const wMaxZ = w.z1 > w.z2 ? w.z1 : w.z2;
      if (wMaxZ < minZ || wMinZ > maxZ) continue;
      if (this.segmentsIntersect(x1, z1, x2, z2, w.x1, w.z1, w.x2, w.z2)) {
        return true;
      }
    }
    return false;
  }

  private segmentsIntersect(
    ax: number,
    az: number,
    bx: number,
    bz: number,
    cx: number,
    cz: number,
    dx: number,
    dz: number
  ): boolean {
    const ccw = (p1x: number, p1z: number, p2x: number, p2z: number, p3x: number, p3z: number) =>
      (p3z - p1z) * (p2x - p1x) > (p2z - p1z) * (p3x - p1x);
    return (
      ccw(ax, az, cx, cz, dx, dz) !== ccw(bx, bz, cx, cz, dx, dz) &&
      ccw(ax, az, bx, bz, cx, cz) !== ccw(ax, az, bx, bz, dx, dz)
    );
  }

  private findTargetEnemy(
    u: Unit,
    enemyIndices: number[],
    maxRange = 14.5
  ): { target: Unit | null; blocked: boolean; dist: number } {
    const out = this.targetSearchResult;
    const len = enemyIndices.length;
    if (len === 0) {
      out.target = null;
      out.blocked = false;
      out.dist = Infinity;
      return out;
    }

    const maxSamples = this.lowSpecMode || this.isMobileDevice ? 12 : 20;
    const step = Math.max(1, Math.floor(len / maxSamples));
    const startOffset = u.id % step;
    const maxRangeSq = maxRange * maxRange;

    let bestUnblocked: Unit | null = null;
    let bestUnblockedDistSq = Infinity;

    let bestAny: Unit | null = null;
    let bestAnyDistSq = Infinity;

    for (let idx = startOffset; idx < len; idx += step) {
      const e = this.units[enemyIndices[idx]];
      if (!e.active) continue;
      const dz = e.z - u.z;
      if (Math.abs(dz) > maxRange) continue;
      const dx = e.x - u.x;
      const dSq = dx * dx + dz * dz;
      if (dSq > maxRangeSq) continue;

      if (dSq < bestAnyDistSq) {
        bestAnyDistSq = dSq;
        bestAny = e;
      }

      if (dSq < bestUnblockedDistSq && !this.isSegmentBlockedByWall(u.x, u.z, e.x, e.z)) {
        bestUnblockedDistSq = dSq;
        bestUnblocked = e;
      }
    }

    if (bestUnblocked) {
      out.target = bestUnblocked;
      out.blocked = false;
      out.dist = Math.sqrt(bestUnblockedDistSq);
      return out;
    }
    out.target = bestAny;
    out.blocked = true;
    out.dist = Math.sqrt(bestAnyDistSq);
    return out;
  }

  private isNearAegisTitan(x: number, z: number): boolean {
    for (let k = 0; k < this.activeAegisIndices.length; k++) {
      const aegis = this.units[this.activeAegisIndices[k]];
      if (!aegis.active) continue;
      const dx = aegis.x - x;
      const dz = aegis.z - z;
      if (dx * dx + dz * dz <= 3.8 * 3.8) return true;
    }
    return false;
  }

  private detonateBaneling(b: Unit): void {
    b.active = false;
    sound.playBanelingPop();
    this.addCameraShake(0.32);
    this.spawnSkyPillar(b.x, b.z, 0x84cc16, 1.35, 0.34);
    this.spawnShockwave(b.x, b.z, 0x84cc16, 2.8, 0.38);
    this.spawnShockwave(b.x, b.z, 0xfacc15, 1.6, 0.26);
    this.spawnBurstParticles(b.x, 0.7, b.z, 0xa3e635, 36);
    this.spawnBurstParticles(b.x, 0.9, b.z, 0xfacc15, 12);

    const splashR2 = 1.45 * 1.45;
    for (let idx = 0; idx < this.activeBlueIndices.length; idx++) {
      const target = this.units[this.activeBlueIndices[idx]];
      if (!target.active) continue;
      const dx = target.x - b.x;
      const dz = target.z - b.z;
      const dSq = dx * dx + dz * dz;
      if (dSq <= splashR2) {
        let dmg = b.dmg;
        if (target.kind === 'champion') dmg *= 0.35;
        if (this.state.getSkillNodeRank('bastion_t3') > 0) dmg *= 0.35;
        if (this.isNearAegisTitan(target.x, target.z)) dmg *= 0.5;
        target.hp -= dmg;
        if (target.hp <= 0) {
          target.active = false;
          this.onUnitKilled(target);
        }
      }
    }
  }

  private triggerHammerSlam(
    champ: Unit,
    isPeriodicLeap = false,
    targetOverride?: { x: number; z: number }
  ): void {
    const ultEvo = this.state.getUltimateEvolutionSpec();
    const titanAwakenRank = this.state.getSkillNodeRank('titan_t3');
    const slamRadius = 4.6 * ultEvo.radiusMult * (1 + titanAwakenRank * 0.12);
    const slamR2 = slamRadius * slamRadius;

    let slamX = targetOverride ? targetOverride.x : champ.x;
    let slamZ = targetOverride ? targetOverride.z : champ.z - 0.8;

    // If periodic leap or initial deployment would whiff empty ground, project the seismic slam onto the densest Red cluster!
    if (!targetOverride && isPeriodicLeap && this.activeRedIndices.length > 0) {
      let nearbyCount = 0;
      for (let i = 0; i < this.activeRedIndices.length; i++) {
        const e = this.units[this.activeRedIndices[i]];
        if (e.active && (e.x - slamX) ** 2 + (e.z - slamZ) ** 2 <= slamR2) {
          nearbyCount++;
        }
      }
      if (nearbyCount === 0) {
        const dense = this.findDensestRedCluster(slamRadius, slamRadius);
        if (dense.count > 0) {
          slamX = dense.x;
          slamZ = dense.z;
          champ.vx = THREE.MathUtils.lerp(champ.vx, (dense.x - champ.x) * 2.2, 0.5);
        }
      }
    }

    const committedBranch = this.state.getCommittedSkillBranch();
    const bId = committedBranch?.id;
    const slamColorMap: Record<string, { c1: number; c2: number }> = {
      swarm: { c1: 0x38bdf8, c2: 0x2dd4bf },
      titan: { c1: 0xf97316, c2: 0xfacc15 },
      gate: { c1: 0x22d3ee, c2: 0xd946ef },
      plasma: { c1: 0xfacc15, c2: 0x00f0ff },
      orbital: { c1: 0xd946ef, c2: 0x00f0ff },
      bastion: { c1: 0x4ade80, c2: 0xfacc15 },
      tycoon: { c1: 0xfacc15, c2: 0xf59e0b },
    };
    const sTheme = (bId && slamColorMap[bId]) || { c1: 0x00f0ff, c2: 0xfacc15 };

    sound.playExplosion();
    this.addCameraShake((isPeriodicLeap ? 0.48 : 0.36) * ultEvo.radiusMult);
    if (ultEvo.tier >= 1 || isPeriodicLeap) {
      this.spawnSkyPillar(
        slamX,
        slamZ,
        sTheme.c1,
        (ultEvo.tier === 0 ? 1.15 : 2.2) * ultEvo.radiusMult,
        0.34 + ultEvo.tier * 0.04
      );
    }
    this.spawnShockwave(slamX, slamZ, sTheme.c1, 5.4 * ultEvo.radiusMult, 0.38 + ultEvo.tier * 0.04);
    if (ultEvo.tier >= 1) {
      this.spawnShockwave(slamX, slamZ, sTheme.c2, 3.6 * ultEvo.radiusMult, 0.34);
    }
    this.spawnBurstParticles(slamX, 1.0, slamZ, sTheme.c1, Math.round(14 + ultEvo.tier * 11));
    if (ultEvo.tier >= 1) {
      this.spawnBurstParticles(slamX, 1.2, slamZ, sTheme.c2, Math.round(8 + ultEvo.tier * 6));
    }

    const tycoonCapBonus =
      bId === 'tycoon'
        ? 1 + Math.min(0.6, Math.floor(this.state.gold / 400) * (this.state.getSkillNodeRank('tycoon_t3') * 0.04))
        : 1.0;

    let hitElite = false;
    let hitCount = 0;
    for (let idx = 0; idx < this.activeRedIndices.length; idx++) {
      const enemy = this.units[this.activeRedIndices[idx]];
      if (!enemy.active) continue;
      const dx = enemy.x - slamX;
      const dz = enemy.z - slamZ;
      const dSq = dx * dx + dz * dz;
      if (dSq <= slamR2) {
        hitCount++;
        const isHeavy = enemy.kind === 'brute' || enemy.kind === 'shaman';
        if (isHeavy) hitElite = true;
        // Heavy Armor-Breaker: +75% bonus damage vs Brutes & Shamans, scaled by Ultimate Evolution Tier!
        const slamDmg = champ.dmg * (isHeavy ? 1.65 : 0.88) * (0.78 + ultEvo.tier * 0.14) * tycoonCapBonus;
        enemy.hp -= slamDmg;

        // Visible physical knockback + airborne launch!
        const dist = Math.max(0.2, Math.sqrt(dSq));
        enemy.x = THREE.MathUtils.clamp(enemy.x + (dx / dist) * 1.15, -TRACK_HALF_W + 0.8, TRACK_HALF_W - 0.8);
        enemy.z = Math.max(BOSS_GATE_Z + 1.0, enemy.z - (isHeavy ? 1.35 : 2.1));
        enemy.vz = -11.5;
        enemy.vx += (dx / dist) * 5.5;
        enemy.spawnHop = 1.35;

        if (enemy.hp <= 0) {
          enemy.active = false;
          this.onUnitKilled(enemy);
        }
      }
    }

    // === 7-BRANCH HAMMER SLAM SIGNATURE MORPHS ===
    if (bId === 'swarm') {
      // 1. Swarm Morph: 【裂变母巢重锤】— Each hammer slam ejects a radial ring of Blue Clone troopers!
      const s1 = this.state.getSkillNodeRank('swarm_t1');
      const isT4 = this.state.getSkillNodeRank('swarm_t4') > 0;
      const broodCount = isPeriodicLeap ? s1 + 1 + (isT4 ? 2 : 0) : Math.max(1, Math.ceil(s1 * 0.6));
      for (let b = 0; b < broodCount; b++) {
        const angle = (b / broodCount) * Math.PI * 2;
        const bx = champ.x + Math.cos(angle) * 1.15;
        const bz = champ.z - 0.5 + Math.sin(angle) * 0.85;
        const clone = this.spawnUnit(
          'blue',
          isT4 || Math.random() < this.state.getChargedCritChance() ? 'charged' : 'normal',
          bx,
          bz,
          Math.cos(angle) * 3.8,
          -8.6,
          champ.passedGates
        );
        if (clone) clone.spawnHop = 1.45;
      }
      if (isPeriodicLeap) {
        this.spawnFloatingPopup(champ.x, 2.2, champ.z, `🌊 裂变母巢重锤 +${broodCount}兵!`, '#38bdf8');
      }
    } else if (bId === 'titan') {
      // 2. Titan Morph: 【崩山聚变巨神锤】— Sequential magma aftershock rings + promotes nearby friendly Giants by +1 Fusion Tier!
      const t3 = this.state.getSkillNodeRank('titan_t3');
      const aftershocks = ultEvo.tier >= 2 ? [0.18, 0.36] : ultEvo.tier >= 1 ? [0.2] : [];
      aftershocks.forEach((delay, aIdx) => {
        this.skillWaveQueue.push({
          delay,
          exec: () => {
            if (!champ.active || this.isStageEnded) return;
            const rad = (5.8 + aIdx * 1.6) * ultEvo.radiusMult;
            const denseAfter = this.findDensestRedCluster(rad * 0.8, rad * 0.8);
            const ax = denseAfter.count > 0 ? denseAfter.x : slamX;
            const az = denseAfter.count > 0 ? denseAfter.z : slamZ - 1.2 - aIdx * 1.1;
            this.addCameraShake(0.42);
            this.spawnShockwave(ax, az, aIdx === 0 ? 0xf97316 : 0xfacc15, rad, 0.45);
            this.spawnBurstParticles(ax, 1.0, az, 0xf97316, 24);
            const r2 = (rad * 0.82) ** 2;
            for (const rIdx of this.activeRedIndices) {
              const e = this.units[rIdx];
              if (!e.active) continue;
              if ((e.x - ax) ** 2 + (e.z - az) ** 2 <= r2) {
                e.hp -= champ.dmg * 0.52;
                e.vz = -9.5;
                e.spawnHop = 1.15;
                if (e.hp <= 0) {
                  e.active = false;
                  this.onUnitKilled(e);
                }
              }
            }
          },
        });
      });
      if (isPeriodicLeap && t3 > 0) {
        const giantSpec = this.state.getGiantTrooperSpec();
        let promoted = 0;
        const maxPromote = 1;
        for (const bIdx of this.activeBlueIndices) {
          if (promoted >= maxPromote) break;
          const bu = this.units[bIdx];
          if (!bu.active || bu.kind === 'champion') continue;
          const curT = bu.fusionTier || 1;
          if (curT < giantSpec.maxFusionTier && (bu.x - champ.x) ** 2 + (bu.z - champ.z) ** 2 <= 5.8 * 5.8) {
            this.promoteGiantUnit(bu, curT + 1, bu.maxHp * 0.5, bu.dmg * 0.5, bu.hp * 0.65, true);
            promoted++;
          }
        }
      } else if (hitElite) {
        this.spawnFloatingPopup(slamX, 2.2, slamZ, '🗿 崩山聚变巨神锤: 破甲!', '#f97316');
      }
    } else if (bId === 'gate') {
      // 3. Gate Morph: 【矩阵共振充能锤】— Charges all Blue Gates, weakens/flips Red Gates, and triggers Gate Clone bursts!
      if (isPeriodicLeap) {
        const g1 = this.state.getSkillNodeRank('gate_t1');
        const g2 = this.state.getSkillNodeRank('gate_t2');
        const g3 = this.state.getSkillNodeRank('gate_t3');
        for (const g of this.gates) {
          g.pulseTimer = 1.0;
          this.spawnShockwave(g.currentX, g.cfg.z, 0x22d3ee, 3.2, 0.35);
          if (g.cfg.op === 'sub' || g.cfg.op === 'div') {
            this.chargeGate(g, 3 + g1 * 2);
          } else if (g.cfg.op === 'add') {
            this.chargeGate(g, 4 + g2 * 3);
            if (g3 > 0) {
              for (let c = 0; c < g3; c++) {
                this.spawnUnit(
                  'blue',
                  'normal',
                  g.currentX + (Math.random() - 0.5) * 1.4,
                  g.cfg.z - 0.3,
                  (Math.random() - 0.5) * 2.5,
                  -8.2
                );
              }
            }
          }
        }
        this.spawnFloatingPopup(slamX, 2.2, slamZ, '🚪 矩阵共振充能锤: 全门脉充能!', '#22d3ee');
      }
    } else if (bId === 'plasma') {
      // 4. Plasma Morph: 【雷神球状闪电锤】— Discharges high-voltage chain lightning across the bridge + overcharges Blue allies!
      const p1 = this.state.getSkillNodeRank('plasma_t1');
      const p2 = this.state.getSkillNodeRank('plasma_t2');
      const isT4 = this.state.getSkillNodeRank('plasma_t4') > 0;
      let bolts = 3 + p2 * 3;
      for (const rIdx of this.activeRedIndices) {
        if (bolts <= 0) break;
        const e = this.units[rIdx];
        if (!e.active) continue;
        if ((e.x - slamX) ** 2 + (e.z - slamZ) ** 2 <= 10.5 * 10.5) {
          bolts--;
          e.hp -= champ.dmg * (0.5 + p1 * 0.14);
          e.empTimer = Math.max(e.empTimer || 0, 1.4);
          this.spawnSkyPillar(e.x, e.z, 0xfacc15, 0.95, 0.26);
          this.spawnBurstParticles(e.x, 1.0, e.z, 0x00f0ff, 10);
          if (e.hp <= 0) {
            e.active = false;
            this.onUnitKilled(e);
          }
        }
      }
      // Overcharge nearby normal Blue troopers into Golden Charged Marines!
      let promoted = 0;
      for (const bIdx of this.activeBlueIndices) {
        if (promoted >= 1 + p1) break;
        const bu = this.units[bIdx];
        if (!bu.active || bu.kind !== 'normal') continue;
        if ((bu.x - champ.x) ** 2 + (bu.z - champ.z) ** 2 <= 5.2 * 5.2) {
          bu.kind = 'charged';
          bu.maxHp *= 1.8;
          bu.hp = bu.maxHp;
          bu.dmg *= 1.8;
          promoted++;
        }
      }
      if (isPeriodicLeap && isT4) {
        this.triggerThorSuperRailgun();
      } else if (isPeriodicLeap) {
        this.spawnFloatingPopup(slamX, 2.2, slamZ, '⚡ 雷神球状闪电锤!', '#facc15');
      }
    } else if (bId === 'orbital') {
      // 5. Orbital Morph: 【聚变虹吸战术锤】— Siphons charge into Orbital Strike + calls down tactical EMP micro-lasers onto densest enemies!
      const o1 = this.state.getSkillNodeRank('orbital_t1');
      const o2 = this.state.getSkillNodeRank('orbital_t2');
      const siphonGain = isPeriodicLeap ? 3.5 + o1 * 1.8 : 1.5 + o1 * 0.8;
      this.state.orbitalCharge = Math.min(100, this.state.orbitalCharge + siphonGain);
      if (isPeriodicLeap) {
        const missileCount = 1 + o2;
        const baseCluster = this.findDensestRedCluster(3.5, 3.5);
        for (let m = 0; m < missileCount; m++) {
          const mx = THREE.MathUtils.clamp(baseCluster.x + (m - (missileCount - 1) * 0.5) * 2.6, -7.2, 7.2);
          const mz = THREE.MathUtils.clamp(baseCluster.z - (m % 2) * 1.2, BOSS_GATE_Z + 1.5, PLAYER_Z - 1.8);
          this.spawnSkyPillar(mx, mz, 0xd946ef, 1.8, 0.38);
          this.spawnShockwave(mx, mz, 0xd946ef, 3.8, 0.35);
          this.spawnBurstParticles(mx, 1.0, mz, 0xd946ef, 20);
          for (const rIdx of this.activeRedIndices) {
            const e = this.units[rIdx];
            if (!e.active) continue;
            if ((e.x - mx) ** 2 + (e.z - mz) ** 2 <= 3.5 * 3.5) {
              e.hp -= champ.dmg * 0.65;
              if (o2 > 0) e.empTimer = Math.max(e.empTimer || 0, o2 * 1.5);
              if (e.hp <= 0) {
                e.active = false;
                this.onUnitKilled(e);
              }
            }
          }
        }
        this.spawnFloatingPopup(slamX, 2.2, slamZ, `☄️ 聚变虹吸战术锤: 轰炸 +${Math.round(siphonGain)}%`, '#e879f9');
      }
    } else if (bId === 'bastion') {
      // 6. Bastion Morph: 【翡翠圣盾镇压锤】— Heals Player Base HP + heals nearby Blue units + damages Grinder Gears!
      const b1 = this.state.getSkillNodeRank('bastion_t1');
      const b3 = this.state.getSkillNodeRank('bastion_t3');
      if (isPeriodicLeap) {
        const baseHeal = Math.max(4, Math.round(this.playerBaseMaxHp * (0.015 + b1 * 0.01)));
        if (this.playerBaseHp < this.playerBaseMaxHp) {
          this.playerBaseHp = Math.min(this.playerBaseMaxHp, this.playerBaseHp + baseHeal);
          this.lastKnownBaseHp = Math.max(this.lastKnownBaseHp, this.playerBaseHp);
        }
        for (const bIdx of this.activeBlueIndices) {
          const bu = this.units[bIdx];
          if (!bu.active) continue;
          if ((bu.x - champ.x) ** 2 + (bu.z - champ.z) ** 2 <= 6.2 * 6.2) {
            bu.hp = Math.min(bu.maxHp, bu.hp + bu.maxHp * 0.35);
          }
        }
        if (b3 > 0) {
          for (const gr of this.gears) {
            if (!gr.alive) continue;
            if ((gr.cfg.x - champ.x) ** 2 + (gr.cfg.z - slamZ) ** 2 <= 7.0 * 7.0) {
              gr.hp = Math.max(0, gr.hp - 3);
              if (gr.hp <= 0) {
                gr.alive = false;
                gr.mesh.visible = false;
                gr.labelEl.style.display = 'none';
                this.spawnShockwave(gr.cfg.x, gr.cfg.z, 0x4ade80, 4.2, 0.4);
              }
            }
          }
        }
        this.spawnFloatingPopup(champ.x, 2.2, slamZ, `🛡️ 翡翠圣盾镇压锤: 城防 +${baseHeal}HP`, '#4ade80');
      }
    } else if (bId === 'tycoon') {
      // 7. Tycoon Morph: 【点金财阀碎钞锤】— Erupts a Golden Coin Fountain on hit + snipes Golden Loot Bug!
      const ty1 = this.state.getSkillNodeRank('tycoon_t1');
      const ty2 = this.state.getSkillNodeRank('tycoon_t2');
      if (hitCount > 0 || isPeriodicLeap) {
        const minted = this.state.addGold(ty1 * 4 + Math.min(14, hitCount * 2) + 3);
        if (isPeriodicLeap) {
          this.spawnFloatingPopup(champ.x, 2.2, slamZ, `💰 点金财阀碎钞锤 +${minted}🪙!`, '#facc15');
        }
      }
      if (ty2 > 0 && this.lootBug.active && isPeriodicLeap) {
        this.lootBug.hp = Math.max(1, this.lootBug.hp - 2);
        this.lootBug.hitFlash = 1.0;
        this.spawnSkyPillar(this.lootBug.x, this.lootBug.z, 0xfacc15, 1.4, 0.32);
      }
    } else {
      if (hitElite) {
        this.spawnFloatingPopup(champ.x, 2.2, slamZ, '🔨 重锤破甲震飞!', '#facc15');
      } else if (hitCount >= 3 && Math.random() < 0.65) {
        this.spawnFloatingPopup(champ.x, 2.0, slamZ, `🔨 震飞 ×${hitCount}!`, '#00f0ff');
      }
    }
  }

  private triggerBossBerserkPhase(): void {
    if (this.bossBerserkTriggered) return;
    this.bossBerserkTriggered = true;
    sound.playBossRoar();
    sound.setBgmDanger(1);
    this.triggerScreenFlash('#ff2a55', 0.72);
    this.addCameraShake(0.95);
    this.spawnSkyPillar(0, BOSS_GATE_Z + 1.0, 0xff2a55, 3.2, 0.65);
    this.spawnSkyPillar(-4.2, BOSS_GATE_Z + 1.4, 0xfacc15, 1.8, 0.52);
    this.spawnSkyPillar(4.2, BOSS_GATE_Z + 1.4, 0xfacc15, 1.8, 0.52);
    this.spawnShockwave(0, BOSS_GATE_Z + 1.0, 0xff2a55, 14.0, 0.7);
    this.spawnShockwave(0, BOSS_GATE_Z + 1.0, 0xfacc15, 9.5, 0.55);
    this.spawnBurstParticles(0, 2.6, BOSS_GATE_Z + 0.8, 0xff2a55, 95);
    this.spawnBurstParticles(0, 2.2, BOSS_GATE_Z + 1.2, 0xfacc15, 45);

    const stage = Math.max(1, this.currentLevel?.id || 1);
    // Stage-scaled Berserk Vanguard Wave
    this.spawnUnit('red', 'brute', 0, BOSS_GATE_Z + 1.4, 0, 3.0);
    if (stage >= 3) {
      this.spawnUnit('red', 'shaman', 3.5, BOSS_GATE_Z + 1.2, 0.4, 2.8);
    }
    const baneCount = Math.min(5, 2 + Math.floor(stage / 2));
    for (let i = 0; i < baneCount; i++) {
      const bx = -4.0 + i * 2.2 + (Math.random() - 0.5) * 0.5;
      this.spawnUnit('red', 'baneling', bx, BOSS_GATE_Z + 1.8, (Math.random() - 0.5) * 1.2, 4.2);
    }

    this.onBanner?.('⚠️ 母巢统领进入 50% 狂暴阶段！', '狂暴卫队倾巢而出 · 全力迎战！');
  }

  private simulateUnits(dt: number): void {
    this.gridMap.clear();
    this.gridCellPoolUsed = 0;
    this.activeBlueIndices.length = 0;
    this.activeRedIndices.length = 0;
    this.activeAegisIndices.length = 0;

    let closestRedZ = -99;

    for (let i = 0; i < MAX_UNITS; i++) {
      const u = this.units[i];
      if (!u.active) continue;
      if (u.team === 'blue') {
        this.activeBlueIndices.push(i);
        if (u.kind === 'champion' && u.mechaType === 'aegis') {
          this.activeAegisIndices.push(i);
        }
      } else {
        this.activeRedIndices.push(i);
        if (u.z > closestRedZ) closestRedZ = u.z;
      }
    }

    // Dynamic Synthwave BGM intensity: shifts up when Boss is in Berserk Phase or Red enemies press past z > 7.5
    sound.setBgmDanger(this.bossBerserkTriggered || closestRedZ > 7.5 ? 1 : 0);

    const blueCount = this.activeBlueIndices.length;
    const redCount = this.activeRedIndices.length;
    const giantSpec = this.state.getGiantTrooperSpec();
    const bastionSpec = this.state.getBastionTrooperSpec();
    const techBonuses = this.state.getBoboTechCombatBonuses();
    const ultEvo = this.state.getUltimateEvolutionSpec();
    const swarmFrenzyRank = this.state.getSkillNodeRank('swarm_t2');
    const swarmFrenzyMult =
      swarmFrenzyRank > 0
        ? 1 + Math.min(swarmFrenzyRank * 0.1, Math.floor(blueCount / 15) * (swarmFrenzyRank * 0.02))
        : 1.0;
    const blueSpeedBoost = (this.adrenalineTimer > 0 ? 1.18 : 1.0) * swarmFrenzyMult;

    // Step A: Steering, Periodic Unit Specials, Gate Cloning, Gears, Walls, and Spatial Hashing
    for (let i = 0; i < MAX_UNITS; i++) {
      const u = this.units[i];
      if (!u.active) continue;

      u.age += dt;
      u.specialTimer += dt;
      if (u.fusionCooldown && u.fusionCooldown > 0) {
        u.fusionCooldown = Math.max(0, u.fusionCooldown - dt);
      }
      if (u.empTimer && u.empTimer > 0) {
        u.empTimer = Math.max(0, u.empTimer - dt);
      }
      if (u.tailwindBoostTimer && u.tailwindBoostTimer > 0) {
        u.tailwindBoostTimer = Math.max(0, u.tailwindBoostTimer - dt);
      }
      if (u.frostingBurstTimer && u.frostingBurstTimer > 0) {
        u.frostingBurstTimer = Math.max(0, u.frostingBurstTimer - dt);
      }
      if (u.electroNetTimer && u.electroNetTimer > 0) {
        u.electroNetTimer = Math.max(0, u.electroNetTimer - dt);
      }
      if (u.syrupSlowTimer && u.syrupSlowTimer > 0) {
        u.syrupSlowTimer = Math.max(0, u.syrupSlowTimer - dt);
        if (u.syrupSlowTimer <= 0) {
          u.syrupVulnMult = 1;
        }
      }
      if (u.vanguardSurgeTimer && u.vanguardSurgeTimer > 0) {
        u.vanguardSurgeTimer = Math.max(0, u.vanguardSurgeTimer - dt);
      }
      if (u.attackCooldown > 0) {
        u.attackCooldown = Math.max(0, u.attackCooldown - dt);
      }
      if (u.attackAnim > 0) {
        u.attackAnim = Math.max(0, u.attackAnim - dt * 3.4);
      }
      if (u.spawnHop > 0) {
        // High-vault Jump Pad launch (spawnHop > 0.68) decays slower so troops stay airborne for ~5.8m to clear gears & walls!
        const hopDecay = u.spawnHop > 0.68 ? 2.55 : 4.2;
        u.spawnHop = Math.max(0, u.spawnHop - dt * hopDecay);
      }

      // Periodic Special Abilities for Hammer Titan, Pyro Titan, Aegis Titan & Hive Shaman
      if (u.team === 'blue' && u.kind === 'champion') {
        if (this.rallyAuraFx?.active) {
          u.specialTimer += dt * Math.max(0, this.rallyAuraFx.attackRateMult - 1);
        }
        const mode = u.mechaType || 'hammer';
        if (mode === 'hammer' && u.specialTimer >= 1.05) {
          u.specialTimer = 0;
          u.attackAnim = 1.0;
          u.spawnHop = 1.15;
          this.triggerHammerSlam(u, true);
        } else if (mode === 'pyro' && u.specialTimer >= 0.24) {
          u.specialTimer = 0;
          u.attackAnim = 0.85;
          this.spawnBurstParticles(u.x, 1.1, u.z - 1.6, 0xf97316, Math.round(8 + ultEvo.tier * 4));
          if (ultEvo.tier >= 1) {
            this.spawnBurstParticles(u.x, 1.2, u.z - 2.2, 0xfacc15, Math.round(4 + ultEvo.tier * 3));
          }
          this.spawnShockwave(u.x, u.z - 1.8, 0xf97316, 3.0 * ultEvo.radiusMult, 0.28);
          for (let rIdx = 0; rIdx < this.activeRedIndices.length; rIdx++) {
            const enemy = this.units[this.activeRedIndices[rIdx]];
            if (!enemy.active) continue;
            const dx = enemy.x - u.x;
            const dz = enemy.z - u.z;
            const pyroRangeMult = ultEvo.radiusMult * (1 + this.state.getSkillNodeRank('titan_t3') * 0.08);
            if (dz < 0.8 && dz > -4.2 * pyroRangeMult && Math.abs(dx) <= 2.4 * pyroRangeMult) {
              const flameDmg = u.dmg * (enemy.kind === 'baneling' ? 1.2 : 0.48) * pyroRangeMult;
              enemy.hp -= flameDmg;
              if (enemy.hp <= 0) {
                enemy.active = false;
                this.onUnitKilled(enemy);
              }
            }
          }
        } else if (u.mechaType === 'aegis' && u.specialTimer >= 0.55) {
          u.specialTimer = 0;
          const aegisRad = 4.2 * ultEvo.radiusMult;
          this.spawnShockwave(u.x, u.z, 0x22c55e, aegisRad, 0.45);
          this.spawnBurstParticles(u.x, 1.0, u.z, 0x22c55e, Math.round(8 + ultEvo.tier * 4));
          for (let bIdx = 0; bIdx < this.activeBlueIndices.length; bIdx++) {
            const ally = this.units[this.activeBlueIndices[bIdx]];
            if (!ally.active) continue;
            const dx = ally.x - u.x;
            const dz = ally.z - u.z;
            if (dx * dx + dz * dz <= (aegisRad * 0.9) ** 2) {
              ally.hp = Math.min(ally.maxHp, ally.hp + ally.maxHp * 0.16);
            }
          }
        }
      } else if (u.team === 'red' && u.kind === 'shaman' && u.specialTimer >= 2.6) {
        u.specialTimer = 0;
        u.attackAnim = 1.0;
        sound.playShamanPulse();
        this.spawnShockwave(u.x, u.z, 0xc084fc, 3.8, 0.48);
        this.spawnBurstParticles(u.x, 1.3, u.z, 0xd946ef, 18);
        for (let rIdx = 0; rIdx < this.activeRedIndices.length; rIdx++) {
          const ally = this.units[this.activeRedIndices[rIdx]];
          if (!ally.active) continue;
          const dx = ally.x - u.x;
          const dz = ally.z - u.z;
          if (dx * dx + dz * dz <= 3.2 * 3.2) {
            ally.hp = Math.min(ally.maxHp, ally.hp + ally.maxHp * 0.15);
            ally.spawnHop = Math.max(ally.spawnHop, 0.4);
          }
        }
      }

      const prevX = u.x;
      const prevZ = u.z;
      const empSlow = u.team === 'red' && u.empTimer && u.empTimer > 0 ? 0.4 : 1.0;
      const blueEmpSlow = u.team === 'blue' && u.empTimer && u.empTimer > 0 ? 0.62 : 1.0;
      const weatherBlueSpeed = u.team === 'blue' ? this.currentLevel?.weatherAffix?.blueSpeedMult || 1.0 : 1.0;
      const tailwindHaste = u.team === 'blue' && u.tailwindBoostTimer && u.tailwindBoostTimer > 0 ? 1.28 : 1.0;
      const frostingHaste = u.team === 'blue' && u.frostingBurstTimer && u.frostingBurstTimer > 0 ? 1.26 : 1.0;
      const overlordAuraHaste =
        u.team === 'blue' &&
        this.mechaOverlord?.active &&
        (u.x - this.mechaOverlord.x) ** 2 + (u.z - this.mechaOverlord.z) ** 2 <= 3.8 * 3.8
          ? 1.22
          : 1.0;
      const glacierSlow = u.team === 'red' && this.currentTheme.id === 'glacier' ? 0.78 : 1.0;
      const airdropFreezeSlow = u.team === 'red' && this.freezeRedsTimer > 0 ? 0.28 : 1.0;
      const electroNetSlow = u.team === 'red' && u.electroNetTimer && u.electroNetTimer > 0 ? 0.22 : 1.0;
      const syrupSlow =
        u.team === 'red' && u.syrupSlowTimer && u.syrupSlowTimer > 0
          ? this.syrupZone?.active
            ? this.syrupZone.slowFactor
            : 0.36
          : 1.0;
      const rallyAuraHaste =
        u.team === 'blue' && this.rallyAuraFx?.active ? this.rallyAuraFx.moveSpeedMult : 1.0;
      const vanguardSurgeHaste =
        u.team === 'blue' && u.vanguardSurgeTimer && u.vanguardSurgeTimer > 0
          ? techBonuses.gateSurgeSpeedMult
          : 1.0;
      const effSpeed =
        u.team === 'blue'
          ? u.speed *
            blueSpeedBoost *
            weatherBlueSpeed *
            tailwindHaste *
            frostingHaste *
            overlordAuraHaste *
            rallyAuraHaste *
            vanguardSurgeHaste *
            blueEmpSlow
          : u.speed * empSlow * glacierSlow * airdropFreezeSlow * electroNetSlow * syrupSlow;

      if (u.team === 'blue') {
        let targetVX = 0;
        let targetVZ = -effSpeed;
        let handledByNestOrGate = false;

        // 1. Check if near an alive Side Nest on the flank
        for (const n of this.nests) {
          if (!n.alive) continue;
          const dx = n.cfg.x - u.x;
          const dz = n.cfg.z - u.z;
          const dist = Math.hypot(dx, dz);
          if (dist < 4.2 && dz < 1.8) {
            handledByNestOrGate = true;
            if (dist < 2.1) {
              targetVX = 0;
              targetVZ = 0;
              if (u.attackCooldown <= 0) {
                u.attackCooldown = 0.4;
                u.attackAnim = 1.0;
                const siegeMult = this.state.getSiegeDamageMultiplier();
                n.hp = Math.max(0, n.hp - u.dmg * 0.65 * siegeMult);
                n.hitFlash = 1.0;
                this.spawnBurstParticles(u.x, 1.2, u.z, 0x84cc16, 6);
                if (n.hp <= 0 && n.alive) {
                  n.alive = false;
                  n.group.visible = false;
                  n.labelEl.style.display = 'none';
                  sound.playExplosion();
                  this.triggerScreenFlash('#facc15', 0.48);
                  this.addCameraShake(0.65);
                  this.spawnSkyPillar(n.cfg.x, n.cfg.z, 0xfacc15, 2.2, 0.52);
                  this.spawnShockwave(n.cfg.x, n.cfg.z, 0xfacc15, 6.2, 0.55);
                  this.spawnShockwave(n.cfg.x, n.cfg.z, 0x84cc16, 4.0, 0.4);
                  const gold = this.state.addGold(n.cfg.rewardGold);
                  this.spawnBurstParticles(n.cfg.x, 1.8, n.cfg.z, 0xfacc15, 65);
                  this.spawnBurstParticles(n.cfg.x, 1.4, n.cfg.z, 0x84cc16, 30);
                  this.spawnFloatingPopup(n.cfg.x, 2.5, n.cfg.z, `+${gold} 🪙 巢穴击破!`, '#facc15');
                  this.onBanner?.(`💥 摧毁 ${n.cfg.name}！`, `奖励 +${gold} 基因金币 & 泰坦充能！`);
                  this.state.championCharge = Math.min(100, this.state.championCharge + 40);
                }
              }
            } else {
              targetVX = (dx / Math.max(0.2, dist)) * effSpeed;
              targetVZ = (dz / Math.max(0.2, dist)) * effSpeed;
            }
            break;
          }
        }

        // 1a-mc3. Check if near an alive 3D Candy Vault Tower in Bonus Heist Mode
        if (!handledByNestOrGate && this.candyVaults.length > 0) {
          for (const v of this.candyVaults) {
            if (!v.alive) continue;
            const dx = v.cfg.x - u.x;
            const dz = v.cfg.z - u.z;
            const dist = Math.hypot(dx, dz);
            if (dist < 4.9 && dz < 2.2) {
              handledByNestOrGate = true;
              if (dist < 2.35) {
                targetVX = 0;
                targetVZ = 0;
                if (u.attackCooldown <= 0) {
                  u.attackCooldown = 0.34;
                  u.attackAnim = 1.0;
                  const siegeMult = this.state.getSiegeDamageMultiplier();
                  v.hp = Math.max(0, v.hp - u.dmg * 0.95 * siegeMult);
                  v.hitFlash = 1.0;
                  this.state.addGold(3);
                  this.spawnBurstParticles(u.x, 1.4, u.z, 0xfacc15, 7);
                  if (v.hp <= 0 && v.alive) {
                    v.alive = false;
                    v.group.visible = false;
                    v.labelEl.style.display = 'none';
                    this.bonusVaultsBroken += 1;
                    sound.playExplosion();
                    this.triggerScreenFlash('#fde047', 0.55);
                    this.addCameraShake(0.68);
                    this.spawnSkyPillar(v.cfg.x, v.cfg.z, 0xfacc15, 2.5, 0.56);
                    this.spawnShockwave(v.cfg.x, v.cfg.z, 0xfacc15, 6.8, 0.55);
                    this.spawnShockwave(v.cfg.x, v.cfg.z, 0xec4899, 4.4, 0.42);
                    const gold = this.state.addGold(v.cfg.rewardGold);
                    const shardRes = this.state.grantBonusSkinShards(v.cfg.rewardShards);
                    this.bonusHeistShardsEarned += shardRes.amount;
                    this.spawnBurstParticles(v.cfg.x, 2.0, v.cfg.z, 0xfacc15, 75);
                    this.spawnBurstParticles(v.cfg.x, 1.6, v.cfg.z, 0xf472b6, 40);
                    this.spawnFloatingPopup(
                      v.cfg.x,
                      2.8,
                      v.cfg.z,
                      `+${gold} 金币 · 碎片 +${shardRes.amount}!`,
                      '#fde047'
                    );
                    this.onBanner?.(
                      `击破 ${v.cfg.name}！`,
                      `狂爆 +${gold} 金币 · 时装碎片 +${shardRes.amount}`
                    );
                    this.state.championCharge = Math.min(100, this.state.championCharge + 45);
                  }
                }
              } else {
                targetVX = (dx / Math.max(0.2, dist)) * effSpeed;
                targetVZ = (dz / Math.max(0.2, dist)) * effSpeed;
              }
              break;
            }
          }
        }

        // 1a-mc5. Check if near an alive 3D Enemy Barricade in Payload Escort Mode (Frosting-Pad vaulting units leap cleanly over!)
        if (!handledByNestOrGate && this.escortBarricades.length > 0 && u.spawnHop <= 0.68) {
          for (const bar of this.escortBarricades) {
            if (!bar.alive) continue;
            const dx = THREE.MathUtils.clamp(u.x, bar.cfg.x - bar.cfg.width * 0.45, bar.cfg.x + bar.cfg.width * 0.45) - u.x;
            const dz = bar.cfg.z - u.z;
            const dist = Math.hypot(dx, dz);
            if (Math.abs(u.x - bar.cfg.x) < bar.cfg.width * 0.62 && dz < 1.6 && dz > -3.2) {
              handledByNestOrGate = true;
              if (dist < 1.95) {
                targetVX = 0;
                targetVZ = 0;
                if (u.attackCooldown <= 0) {
                  u.attackCooldown = 0.36;
                  u.attackAnim = 1.0;
                  const siegeMult = this.state.getSiegeDamageMultiplier() * (u.mortarSiegeBonusMult || 1);
                  bar.hp = Math.max(0, bar.hp - u.dmg * 0.85 * siegeMult);
                  bar.hitFlash = 1.0;
                  this.state.addGold(2);
                  this.spawnBurstParticles(u.x, 1.2, bar.cfg.z + 0.4, 0xfbbf24, 5);
                  if (bar.hp <= 0 && bar.alive) {
                    this.demolishEscortBarricade(bar);
                  }
                }
              } else {
                targetVX = (dx / Math.max(0.2, dist)) * effSpeed;
                targetVZ = (dz / Math.max(0.2, dist)) * effSpeed;
              }
              break;
            }
          }
        }

        // 1b. MC-2: Check if near an alive Lateral Steam Shield Sub-Tower on the flank
        if (!handledByNestOrGate && this.bossSubTowers.length > 0) {
          for (const st of this.bossSubTowers) {
            if (!st.alive) continue;
            const onSameFlank = st.cfg.side === 'left' ? u.x < -1.4 : u.x > 1.4;
            const dx = st.cfg.x - u.x;
            const dz = st.cfg.z - u.z;
            const dist = Math.hypot(dx, dz);
            if ((onSameFlank && u.z < -7.2 && dist < 8.4) || dist < 4.6) {
              handledByNestOrGate = true;
              if (dist < 2.25) {
                targetVX = 0;
                targetVZ = 0;
                if (u.attackCooldown <= 0) {
                  u.attackCooldown = 0.4;
                  u.attackAnim = 1.0;
                  const siegeMult = this.state.getSiegeDamageMultiplier() * (u.mortarSiegeBonusMult || 1);
                  st.hp = Math.max(0, st.hp - u.dmg * 0.72 * siegeMult);
                  st.hitFlash = 1.0;
                  this.spawnBurstParticles(u.x, 1.4, u.z, 0x38bdf8, 6);
                  if (st.hp <= 0 && st.alive) {
                    this.destroyBossSubTower(st);
                  }
                }
              } else {
                targetVX = (dx / Math.max(0.2, dist)) * effSpeed;
                targetVZ = (dz / Math.max(0.2, dist)) * effSpeed;
              }
              break;
            }
          }
        }

        // 1c. MC-8: Check if near an alive Clockwork Colossus Weakpoint Arm (Left Heavy Shield / Right Candy Cannon)
        if (!handledByNestOrGate && this.colossusBoss?.active && this.colossusBoss.paralysisTimer <= 0) {
          const cb = this.colossusBoss;
          const weakTargets: Array<{ side: 'left' | 'right'; wx: number; wz: number }> = [];
          if (cb.leftShieldAlive) weakTargets.push({ side: 'left', wx: -4.35, wz: BOSS_GATE_Z + 1.85 });
          if (cb.rightCannonAlive) weakTargets.push({ side: 'right', wx: 4.35, wz: BOSS_GATE_Z + 1.85 });
          for (const wt of weakTargets) {
            const onSameFlank = wt.side === 'left' ? u.x < -1.15 : u.x > 1.15;
            const dx = wt.wx - u.x;
            const dz = wt.wz - u.z;
            const dist = Math.hypot(dx, dz);
            if ((onSameFlank && u.z < -7.5 && dist < 8.8) || dist < 4.5) {
              handledByNestOrGate = true;
              if (dist < 2.45) {
                targetVX = 0;
                targetVZ = 0;
                if (u.attackCooldown <= 0) {
                  u.attackCooldown = 0.36;
                  u.attackAnim = 1.0;
                  this.damageColossusWeakpoint(
                    wt.side,
                    u.dmg * (u.kind === 'champion' ? 1.15 : 0.82) * (u.mortarSiegeBonusMult || 1)
                  );
                  this.spawnBurstParticles(
                    u.x,
                    1.45,
                    u.z,
                    wt.side === 'left' ? 0x38bdf8 : 0xf472b6,
                    6
                  );
                }
              } else {
                targetVX = (dx / Math.max(0.2, dist)) * effSpeed;
                targetVZ = (dz / Math.max(0.2, dist)) * effSpeed;
              }
              break;
            }
          }
        }

        // 1d. MC-9: Check if near an alive Anti-Air Flak Sub-Turret along the Airship Escort lane
        if (!handledByNestOrGate && this.antiAirTurrets.length > 0) {
          for (const aat of this.antiAirTurrets) {
            if (!aat.alive) continue;
            const onSameFlank = aat.cfg.side === 'left' ? u.x < -1.0 : u.x > 1.0;
            const dx = aat.cfg.x - u.x;
            const dz = aat.cfg.z - u.z;
            const dist = Math.hypot(dx, dz);
            if ((onSameFlank && dist < 6.8 && u.z > aat.cfg.z - 2.2) || dist < 3.6) {
              handledByNestOrGate = true;
              aat.contestedByBlue = true;
              if (dist < 2.25) {
                targetVX = 0;
                targetVZ = 0;
                if (u.attackCooldown <= 0) {
                  u.attackCooldown = 0.36;
                  u.attackAnim = 1.0;
                  const siegeMult = this.state.getSiegeDamageMultiplier() * (u.mortarSiegeBonusMult || 1);
                  this.damageAntiAirTurret(
                    aat,
                    u.dmg * (u.kind === 'champion' ? 1.15 : 0.88) * siegeMult
                  );
                  this.spawnBurstParticles(u.x, 1.35, u.z, 0x38bdf8, 6);
                }
              } else {
                targetVX = (dx / Math.max(0.2, dist)) * effSpeed;
                targetVZ = (dz / Math.max(0.2, dist)) * effSpeed;
              }
              break;
            }
          }
        }

        // 2. Tactical Blue Steering:
        // - Engage nearby unblocked Red units (within 11.5m, or 14.5m if Red is threatening our base at z > 5.0).
        // - If in the front assault zone (u.z < -9.5) and no Red unit is within 8.5m, converge on the Boss Gate!
        // - Otherwise march straight down the aimed lane to hit positive gates!
        const enemyCheck = this.findTargetEnemy(u, this.activeRedIndices);
        if (!handledByNestOrGate) {
          const isFrontAssault = u.z < -9.5;
          const isDefenseThreat = enemyCheck.target ? enemyCheck.target.z > 5.0 : false;
          const engageDist = isFrontAssault ? 8.5 : isDefenseThreat ? 14.5 : 11.5;

          if (enemyCheck.target && !enemyCheck.blocked && enemyCheck.dist < engageDist) {
            const dx = enemyCheck.target.x - u.x;
            const dz = enemyCheck.target.z - u.z;
            const d = Math.max(0.01, enemyCheck.dist);
            targetVX = (dx / d) * effSpeed;
            targetVZ = (dz / d) * effSpeed;
          } else if (isFrontAssault || !enemyCheck.target) {
            // Converge on Enemy Hive Gate!
            const dx = 0 - u.x;
            const dz = BOSS_GATE_Z + 0.55 - u.z;
            const d = Math.max(0.01, Math.hypot(dx, dz));
            if (d > 0.65) {
              targetVX = (dx / d) * effSpeed;
              targetVZ = (dz / d) * effSpeed;
            } else {
              targetVX = 0;
              targetVZ = 0;
            }
          } else {
            // Advance straight along aimed lane so player aiming hits positive gates!
            targetVX = 0;
            targetVZ = -effSpeed;
          }
        }

        if (u.spawnHop > 0.68) {
          // Maintain high-speed airborne vault momentum over obstacles!
          u.vx = THREE.MathUtils.lerp(u.vx, 0, dt * 3.0);
          u.vz = -Math.max(13.8, effSpeed * 1.65);
        } else {
          u.vx = THREE.MathUtils.lerp(u.vx, targetVX, dt * 8.5);
          u.vz = THREE.MathUtils.lerp(u.vz, targetVZ, dt * 8.5);
        }
      } else {
        // Red Unit Steering: engage Blue units in their lane/corridor, or march relentlessly toward the Player Defense Line
        let targetVX = 0;
        let targetVZ = effSpeed;

        const blueCheck = this.findTargetEnemy(u, this.activeBlueIndices);
        if (
          blueCheck.target &&
          !blueCheck.blocked &&
          blueCheck.dist < 7.5 &&
          Math.abs(blueCheck.target.x - u.x) < 4.2
        ) {
          const dx = blueCheck.target.x - u.x;
          const dz = blueCheck.target.z - u.z;
          const d = Math.max(0.01, blueCheck.dist);
          targetVX = (dx / d) * effSpeed;
          targetVZ = (dz / d) * effSpeed;
        } else {
          targetVX = 0;
          targetVZ = effSpeed;
        }

        u.vx = THREE.MathUtils.lerp(u.vx, targetVX, dt * 7.5);
        u.vz = THREE.MathUtils.lerp(u.vz, targetVZ, dt * 7.5);
      }

      // Smooth S-Curve & Wall Look-Ahead Flow Steering (Airborne units launched by Jump Pads vault right over walls!)
      if (u.spawnHop <= 0.68) {
        for (const w of this.walls) {
          this.applyWallLookAhead(u, w, dt);
        }
      }

      // Integrate position
      u.x += u.vx * dt;
      u.z += u.vz * dt;

      // Interactive Terrain Zones (Speed Belts, Jump Pads, Toxic Mires, Heal Sanctuaries)
      for (const zr of this.zones) {
        const zc = zr.cfg;
        if (Math.abs(u.x - zc.x) <= zc.width * 0.5 && Math.abs(u.z - zc.z) <= zc.length * 0.5) {
          if (zc.type === 'speed_belt') {
            if (u.team === 'blue') {
              u.z -= 4.2 * dt;
              u.vz = Math.min(u.vz, -effSpeed * 1.65);
              if (Math.random() < 0.08) {
                this.spawnBurstParticles(u.x, 0.35, u.z, 0x00f0ff, 1);
              }
            } else {
              // Forward conveyor belt pushes advancing Red enemies backwards!
              u.z -= 2.8 * dt;
            }
          } else if (zc.type === 'jump_pad') {
            if (u.spawnHop <= 0.35) {
              u.spawnHop = 2.15;
              u.vz = u.team === 'blue' ? -Math.max(14.2, effSpeed * 1.72) : 8.5;
              u.z += u.team === 'blue' ? -0.95 : 0.65;
              if (this.jumpPadSoundCooldown <= 0) {
                this.jumpPadSoundCooldown = 0.22;
                sound.playCloneGate(2);
                this.spawnShockwave(zc.x, zc.z, 0xf472b6, 2.4, 0.28);
              }
              if (Math.random() < 0.45) {
                this.spawnBurstParticles(u.x, 0.45, u.z, 0x00f0ff, 3);
              }
            }
          } else if (zc.type === 'toxic_mire') {
            // Airborne vaulting units fly cleanly over the toxic mire!
            if (u.spawnHop <= 0.68) {
              const slowFactor = u.team === 'red' ? 0.42 : 0.35;
              u.x -= u.vx * dt * slowFactor;
              u.z -= u.vz * dt * slowFactor;
              // Stage-independent percentage MaxHP corrosion so Toxic Mires scale properly across Stage 1 to 50+!
              const uTier = u.fusionTier || 0;
              const pctRate =
                u.team === 'red'
                  ? 0.28
                  : u.kind === 'champion' || uTier >= 2
                    ? 0.045
                    : 0.16;
              u.hp -= u.maxHp * pctRate * dt;
              if (Math.random() < 0.06) {
                this.spawnBurstParticles(u.x, 0.3, u.z, 0xa3e635, 1);
              }
              if (u.hp <= 0) {
                u.active = false;
                if (u.team === 'red') {
                  this.onUnitKilled(u);
                }
                break;
              }
            }
          } else if (zc.type === 'heal_sanctuary') {
            if (u.team === 'blue') {
              u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.36 * dt);
              u.z -= 1.45 * dt;
              if (u.empTimer && u.empTimer > 0) u.empTimer = 0;
            }
          } else if (zc.type === 'tailwind_belt') {
            const galeAmp = this.currentLevel?.weatherAffix?.id === 'gale_tailwind' ? 1.22 : 1.0;
            if (u.team === 'blue') {
              u.z -= 5.2 * galeAmp * dt;
              u.vz = Math.min(u.vz, -effSpeed * 1.72);
              u.tailwindBoostTimer = Math.max(u.tailwindBoostTimer || 0, 1.85);
              if (Math.random() < 0.09) {
                this.spawnBurstParticles(u.x, 0.36, u.z, 0x67e8f9, 1);
              }
            } else {
              u.z -= 3.1 * dt;
            }
          } else if (zc.type === 'emp_zone') {
            if (u.spawnHop <= 0.68) {
              if (u.team === 'red') {
                u.x -= u.vx * dt * 0.38;
                u.z -= u.vz * dt * 0.38;
                u.empTimer = Math.max(u.empTimer || 0, 0.55);
              } else if (zr.empPhase === 'pulse') {
                if (u.frostShield) {
                  u.frostShield = false;
                } else if (u.kind !== 'champion') {
                  u.empTimer = Math.max(u.empTimer || 0, 0.75);
                }
              }
            }
          } else if (zc.type === 'frosting_pad') {
            if (u.spawnHop <= 0.35) {
              const vaultMult = this.currentLevel?.weatherAffix?.padVaultMult || 1.0;
              u.spawnHop = 2.45 * vaultMult;
              if (u.team === 'blue') {
                u.vz = -Math.max(15.2 * vaultMult, effSpeed * 1.82);
                u.z -= 1.15 * vaultMult;
                u.frostingBurstTimer = Math.max(u.frostingBurstTimer || 0, 3.6);
                u.frostShield = true;
              } else {
                u.vz = 8.2;
                u.z += 0.65;
              }
              zr.padBounceAnim = 1.0;
              if (this.jumpPadSoundCooldown <= 0) {
                this.jumpPadSoundCooldown = 0.22;
                sound.playCloneGate(3);
                this.spawnShockwave(zc.x, zc.z, 0xf472b6, 2.6, 0.28);
              }
              if (Math.random() < 0.5) {
                this.spawnBurstParticles(u.x, 0.5, u.z, 0xfbcfe8, 4);
              }
            }
          }
        }
      }
      if (!u.active) continue;

      // Electromagnetic Pinball Bumpers (Deflects units laterally into adjacent multiplier gates + grants EM Overcharge!)
      if (u.spawnHop <= 0.68) {
        for (const bm of this.bumpers) {
          const bdx = u.x - bm.cfg.x;
          const bdz = u.z - bm.cfg.z;
          const bdSq = bdx * bdx + bdz * bdz;
          const minR = bm.cfg.radius + u.radius;
          if (bdSq < minR * minR && bdSq > 0.0001) {
            const bDist = Math.sqrt(bdSq);
            const nx = bdx / bDist;
            const nz = bdz / bDist;
            u.x = bm.cfg.x + nx * (minR + 0.08);
            u.z = bm.cfg.z + nz * (minR + 0.08);
            const sideSign = Math.abs(nx) > 0.15 ? Math.sign(nx) : u.id % 2 === 0 ? 1 : -1;
            u.vx = sideSign * 8.2 + nx * 3.6;
            u.vz += nz * 2.8 - (u.team === 'blue' ? 1.8 : 0);
            u.spawnHop = Math.max(u.spawnHop, 0.55);
            if (u.team === 'blue') {
              u.hp = Math.min(u.maxHp * 1.15, u.hp + u.maxHp * 0.15);
            }
            if (bm.pulseTimer <= 0.2) {
              this.spawnShockwave(bm.cfg.x, bm.cfg.z, 0xd946ef, 2.4, 0.25);
            }
            bm.pulseTimer = 1.0;
          }
        }
      }

      // Clamp to outer road curbs (Scatter bubble shots ricochet elastically off curbs!)
      const limitX = TRACK_HALF_W - 0.65 - u.radius;
      if (u.x < -limitX) {
        u.x = -limitX;
        if (u.scatterBounceLeft && u.scatterBounceLeft > 0) {
          u.scatterBounceLeft--;
          u.vx = Math.max(2.8, Math.abs(u.vx) * 0.95);
          u.vz = Math.min(u.vz, -7.8);
          u.spawnHop = Math.max(u.spawnHop, 0.36);
          this.spawnBurstParticles(u.x, 0.6, u.z, 0x22d3ee, 4);
        } else {
          u.vx = Math.abs(u.vx) * 0.5;
        }
      } else if (u.x > limitX) {
        u.x = limitX;
        if (u.scatterBounceLeft && u.scatterBounceLeft > 0) {
          u.scatterBounceLeft--;
          u.vx = -Math.max(2.8, Math.abs(u.vx) * 0.95);
          u.vz = Math.min(u.vz, -7.8);
          u.spawnHop = Math.max(u.spawnHop, 0.36);
          this.spawnBurstParticles(u.x, 0.6, u.z, 0x22d3ee, 4);
        } else {
          u.vx = -Math.abs(u.vx) * 0.5;
        }
      }

      // Wall Segment Collision (Grounded units flow around barriers; Jump-Pad airborne units vault over them!)
      if (u.spawnHop <= 0.68) {
        for (const w of this.walls) {
          this.resolveWallCollision(u, w);
        }
      }

      // Smoothly update humanoid facing yaw, cornering bank (turnRate), and lively stride/brawl cadence!
      const moveDX = u.x - prevX;
      const moveDZ = u.z - prevZ;
      const actualSpeed = Math.hypot(moveDX, moveDZ) / Math.max(0.001, dt);
      const combatCadence = u.attackAnim > 0 ? 5.5 : 0;
      u.walkPhase += (5.2 + actualSpeed * 3.8 + combatCadence) * dt;

      const velMag = Math.hypot(u.vx, u.vz);
      const desiredYaw = velMag > 0.25 ? Math.atan2(u.vx, u.vz) : u.team === 'blue' ? Math.PI : 0;
      const angleDiff = Math.atan2(Math.sin(desiredYaw - u.yaw), Math.cos(desiredYaw - u.yaw));
      u.turnRate = THREE.MathUtils.lerp(u.turnRate, angleDiff, Math.min(1, dt * 12));
      u.yaw += angleDiff * Math.min(1, dt * 14);

      // Blue Unit vs Spinning Grinder Gears ("6") — Jump-Pad airborne units vault right over gears!
      if (u.team === 'blue' && u.spawnHop <= 0.68) {
        for (const gr of this.gears) {
          if (!gr.alive) continue;
          const dx = u.x - gr.cfg.x;
          const dz = u.z - gr.cfg.z;
          const dist = Math.hypot(dx, dz);
          if (dist < gr.cfg.radius + u.radius) {
            const praetorianRank = this.state.getSkillNodeRank('bastion_t3');
            const dodgeChance = praetorianRank * 0.15;
            const uTier = u.fusionTier || 0;
            const consumedFrost = Boolean(u.frostShield);
            if (consumedFrost) {
              u.frostShield = false;
              u.spawnHop = 0.78;
              u.z = gr.cfg.z - gr.cfg.radius - u.radius - 0.16;
              this.spawnBurstParticles(u.x, 0.85, u.z, 0x7dd3fc, 14);
              if (this.gatePopupCooldown <= 0) {
                this.gatePopupCooldown = 0.18;
                this.spawnFloatingPopup(u.x, 1.85, u.z, '糖霜护盾 抵挡齿轮!', '#7dd3fc');
              }
            } else if (u.kind === 'champion') {
              u.hp = Math.max(1, u.hp - u.maxHp * 0.25);
            } else if (uTier >= 2) {
              u.hp -= u.maxHp * 0.42;
              if (u.hp <= 0) u.active = false;
            } else if (uTier === 1) {
              u.hp -= u.maxHp * 0.6;
              if (u.hp <= 0) u.active = false;
            } else if (praetorianRank > 0) {
              if (Math.random() >= dodgeChance) {
                u.hp -= u.maxHp * Math.max(0.24, 0.55 - praetorianRank * 0.1);
                if (u.hp <= 0) u.active = false;
              }
            } else if (Math.random() >= dodgeChance) {
              u.active = false;
            }
            const baseGearHits = u.kind === 'champion' ? 6 : uTier >= 2 ? 2 : 1 + (praetorianRank > 0 ? 1 : 0);
            const gearDmg = Math.max(1, Math.round(baseGearHits * this.state.getSiegeDamageMultiplier()));
            gr.hp = Math.max(0, gr.hp - gearDmg);
            gr.hitFlash = 1.0;
            sound.playGearGrind();
            this.spawnBurstParticles(u.x, 0.7, u.z, 0xf97316, 10);
            if (gr.hp <= 0) {
              gr.alive = false;
              gr.mesh.visible = false;
              gr.labelEl.style.display = 'none';
              sound.playExplosion();
              const salvageGold = this.state.addGold(22);
              this.state.championCharge = Math.min(100, this.state.championCharge + 15);
              this.triggerScreenFlash('#f97316', 0.42);
              this.addCameraShake(0.55);
              this.spawnSkyPillar(gr.cfg.x, gr.cfg.z, 0xf97316, 1.8, 0.45);
              this.spawnShockwave(gr.cfg.x, gr.cfg.z, 0xf97316, 4.8, 0.48);
              this.spawnShockwave(gr.cfg.x, gr.cfg.z, 0xfacc15, 2.8, 0.34);
              this.spawnBurstParticles(gr.cfg.x, 1.0, gr.cfg.z, 0xff2a55, 55);
              this.spawnBurstParticles(gr.cfg.x, 1.2, gr.cfg.z, 0xfacc15, 25);
              this.spawnFloatingPopup(gr.cfg.x, 1.8, gr.cfg.z, `⚙️ 齿轮粉碎! +${salvageGold}🪙`, '#facc15');
            }
            break;
          }
        }
      }
      if (!u.active) continue;

      // Blue Unit vs Explosive Plasma Barrels ("💥N" -> Chain-Reaction AOE Nuke!)
      if (u.team === 'blue') {
        for (const br of this.barrels) {
          if (!br.alive) continue;
          const dx = u.x - br.cfg.x;
          const dz = u.z - br.cfg.z;
          const dist = Math.hypot(dx, dz);
          if (dist < 0.78 + u.radius) {
            const uTier = u.fusionTier || 0;
            if (u.frostShield) {
              u.frostShield = false;
              u.spawnHop = 0.72;
              u.z = br.cfg.z - 0.85 - u.radius;
              this.spawnBurstParticles(u.x, 0.9, u.z, 0x7dd3fc, 14);
              if (this.gatePopupCooldown <= 0) {
                this.gatePopupCooldown = 0.18;
                this.spawnFloatingPopup(u.x, 1.85, u.z, '糖霜护盾 抵挡爆破!', '#7dd3fc');
              }
            } else if (u.kind !== 'champion' && uTier < 2) {
              u.active = false;
            } else if (u.kind !== 'champion') {
              u.hp -= u.maxHp * 0.45;
              if (u.hp <= 0) u.active = false;
            }
            const barrelDmg = u.kind === 'champion' ? 99 : uTier >= 2 ? 2 : 1;
            br.hp = Math.max(0, br.hp - barrelDmg);
            this.spawnBurstParticles(br.cfg.x, 1.0, br.cfg.z, 0xfacc15, 8);
            if (br.hp <= 0) {
              this.detonateBarrel(br);
            }
            break;
          }
        }
      }
      if (!u.active) continue;

      // Blue Unit vs Golden Loot Bug ("💰N" -> Jackpot Gold Fountain & +45% Ultimate Charge!)
      if (u.team === 'blue' && this.lootBug.active) {
        const dx = u.x - this.lootBug.x;
        const dz = u.z - this.lootBug.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 1.18 + u.radius) {
          const uTier = u.fusionTier || 0;
          if (u.kind !== 'champion' && uTier < 2) {
            u.active = false;
          } else if (u.kind !== 'champion') {
            u.hp -= u.maxHp * 0.4;
            if (u.hp <= 0) u.active = false;
          }
          const dmg = u.kind === 'champion' ? 99 : uTier >= 2 ? 2 : 1;
          this.lootBug.hp = Math.max(0, this.lootBug.hp - dmg);
          this.lootBug.hitFlash = 1.0;
          this.state.addGold(2);
          this.spawnBurstParticles(this.lootBug.x, 0.9, this.lootBug.z, 0xfacc15, 10);
          if (this.lootBug.hp <= 0) {
            this.lootBug.active = false;
            this.lootBug.spawnTimer = 17.5;
            this.lootBugGroup.visible = false;
            if (this.lootBugLabelEl) this.lootBugLabelEl.style.display = 'none';
            sound.playExplosion();
            const stage = Math.max(1, this.currentLevel?.id || 1);
            const tycoonBugMult = 1 + this.state.getSkillNodeRank('tycoon_t2') * 0.25;
            const jackpot = this.state.addGold(
              Math.round(90 * Math.pow(1.08, Math.min(stage - 1, 20)) * tycoonBugMult)
            );
            this.state.championCharge = Math.min(100, this.state.championCharge + 45);
            this.state.orbitalCharge = Math.min(100, this.state.orbitalCharge + 45);
            this.triggerScreenFlash('#facc15', 0.68);
            this.addCameraShake(0.72);
            this.spawnSkyPillar(this.lootBug.x, this.lootBug.z, 0xfacc15, 2.5, 0.58);
            this.spawnShockwave(this.lootBug.x, this.lootBug.z, 0xfacc15, 5.8, 0.52);
            this.spawnShockwave(this.lootBug.x, this.lootBug.z, 0x00f0ff, 3.6, 0.36);
            this.spawnBurstParticles(this.lootBug.x, 1.2, this.lootBug.z, 0xfacc15, 95);
            this.spawnBurstParticles(this.lootBug.x, 1.5, this.lootBug.z, 0x00f0ff, 35);
            this.spawnFloatingPopup(this.lootBug.x, 2.4, this.lootBug.z, `💰 盗宝虫爆金 +${jackpot}🪙!`, '#facc15');
            this.onBanner?.(`💰 击破黄金盗宝虫！+${jackpot}🪙`, '双大招立即充能 +45%！');
          }
          if (!u.active) continue;
        }
      }

      // Blue Unit vs Steam Tactical Airdrop Crate (Pop/Collect for 8s Frenzy Buff!)
      if (u.team === 'blue' && this.airdrop?.active && this.airdrop.y <= 3.2) {
        const adx = u.x - this.airdrop.x;
        const adz = u.z - this.airdrop.z;
        if (adx * adx + adz * adz < (1.42 + u.radius) * (1.42 + u.radius)) {
          this.hitTacticalAirdrop(u.kind === 'champion' ? 4 : 1);
          u.spawnHop = Math.max(u.spawnHop, 0.45);
          u.z -= 0.35;
        }
      }

      // Blue Unit vs Clone/Hazard/Functional Gates (+N, xN, -N, ÷2, 巨化×2, 糖霜盾) + Pillar Charging!
      if (u.team === 'blue') {
        for (const g of this.gates) {
          if (u.passedGates.has(g.cfg.id)) continue;
          const crossedZ = (prevZ >= g.cfg.z && u.z <= g.cfg.z) || Math.abs(u.z - g.cfg.z) < 0.44;
          if (!crossedZ) continue;
          const relX = Math.abs(u.x - g.currentX);
          const halfW = g.cfg.width * 0.5;
          if (Math.abs(relX - halfW) <= 0.46 && (g.cfg.op === 'sub' || g.cfg.op === 'div' || g.cfg.op === 'add')) {
            u.passedGates.add(g.cfg.id);
            u.spawnHop = Math.max(u.spawnHop, 0.52);
            this.spawnBurstParticles(u.x, 0.9, g.cfg.z, 0x38bdf8, 8);
            this.chargeGate(g, 1.6);
            continue;
          }
          if (relX <= g.cfg.width * 0.52) {
            u.passedGates.add(g.cfg.id);
            g.pulseTimer = 1.0;
            this.applyGateEffect(u, g);
            if (!u.active) break;
          }
        }
      }
      if (!u.active) continue;

      // Blue Unit at Enemy Base (Top): Attacks Boss HP when reaching the Boss Gate and front is clear of immediate defenders
      if (u.team === 'blue' && u.z <= BOSS_GATE_Z + 1.15) {
        u.z = Math.max(BOSS_GATE_Z + 0.5, u.z);
        if (u.attackCooldown <= 0) {
          u.attackCooldown = 0.48 / swarmFrenzyMult;
          u.attackAnim = 1.0;
          const siegeMult = this.state.getSiegeDamageMultiplier() * (u.mortarSiegeBonusMult || 1);
          const plasmaBossMult =
            u.kind === 'charged' ? 1 + this.state.getSkillNodeRank('plasma_t3') * 0.18 : 1.0;
          const uTier = u.fusionTier || 0;
          let dmg = (u.kind === 'champion' ? u.dmg * 0.55 : u.dmg * 0.25) * siegeMult * plasmaBossMult;
          const subTowerMult = this.getSubTowerBossDamageMultiplier();
          if (subTowerMult < 1.0) {
            dmg *= subTowerMult;
            this.spawnBurstParticles(u.x, 1.6, BOSS_GATE_Z + 0.85, 0x38bdf8, 4);
          }
          if (this.colossusBoss?.active) {
            const colossusMult = this.getColossusCoreDamageMultiplier();
            dmg *= colossusMult;
            if (this.colossusBoss.paralysisTimer > 0 && Math.random() < 0.45) {
              this.spawnBurstParticles(u.x, 1.8, BOSS_GATE_Z + 0.6, 0xfacc15, 7);
            }
          }

          if (this.bossShieldActive) {
            dmg *= 0.12;
            const shieldBreakHits = u.kind === 'champion' ? 7 : uTier >= 1 ? 1 + uTier : 1;
            this.bossShieldHitsRemaining -= shieldBreakHits;
            this.spawnBurstParticles(u.x, 1.6, BOSS_GATE_Z + 1.0, 0xd946ef, 6);
            if (this.bossShieldHitsRemaining <= 0) {
              this.shatterBossShield();
            }
          } else {
            this.spawnBurstParticles(u.x, 1.4, BOSS_GATE_Z, 0x00f0ff, 6);
            if (Math.random() < 0.35 || uTier >= 2) {
              this.spawnShockwave(u.x, BOSS_GATE_Z + 0.4, uTier >= 2 ? 0xfacc15 : 0x00f0ff, 2.4 + uTier * 0.45, 0.28);
            }
          }

          if (this.currentLevel?.isEndlessDefense || this.currentLevel?.isPayloadEscort) {
            this.state.runSiegePool += dmg;
            this.bossHitFlash = 1.0;
            if (Math.random() < 0.35) {
              this.state.addGold(2);
            }
          } else {
            this.bossHp = Math.max(0, this.bossHp - dmg);
            this.state.runSiegePool += dmg;
            this.bossHitFlash = 1.0;
            if (this.currentLevel?.isBonusHeist) {
              this.state.addGold(4);
              this.spawnBurstParticles(u.x, 1.8, BOSS_GATE_Z + 0.5, 0xfacc15, 5);
            } else if (Math.random() < 0.25) {
              this.state.addGold(1);
            }

            // Mega Boss (Stage 10/20/30...) 70% & 35% HP Void Shield Phase triggers!
            if (this.currentLevel?.isMegaBoss && this.bossHp > 0) {
              if (!this.bossShield70Triggered && this.bossHp <= this.bossMaxHp * 0.7) {
                this.bossShield70Triggered = true;
                this.activateBossShieldPhase(false);
              } else if (!this.bossShield35Triggered && this.bossHp <= this.bossMaxHp * 0.35) {
                this.bossShield35Triggered = true;
                this.activateBossShieldPhase(false);
              }
            }

            // Mini-Boss (Stage 5/15/25/35...) 50% HP Vanguard Shield + Blitz trigger!
            if (this.currentLevel?.isMiniBoss && this.bossHp > 0) {
              if (!this.bossShield50Triggered && this.bossHp <= this.bossMaxHp * 0.5) {
                this.bossShield50Triggered = true;
                this.activateBossShieldPhase(true);
              }
            }

            // Check Boss 50% HP Berserk Phase trigger!
            if (
              !this.currentLevel?.isBonusHeist &&
              !this.bossBerserkTriggered &&
              this.bossHp > 0 &&
              this.bossHp <= this.bossMaxHp * 0.5
            ) {
              this.triggerBossBerserkPhase();
            }

            if (this.bossHp <= 0) {
              if (this.currentLevel?.isBonusHeist) {
                const jp = this.state.grantBonusSkinShards(2);
                this.bonusHeistShardsEarned += jp.amount;
              }
              this.finishStage(true);
              return;
            }
          }
        }
      }

      // Red Unit at Player Base (Bottom): Unintercepted Red units reaching the defense line (PLAYER_Z - 2.2) attack Player Base HP
      if (u.team === 'red' && u.z >= PLAYER_Z - 2.2) {
        u.z = Math.min(PLAYER_Z - 1.8, u.z);
        if (u.kind === 'baneling') {
          this.playerBaseHp = Math.max(0, this.playerBaseHp - u.dmg * 0.65);
          this.detonateBaneling(u);
          if (this.playerBaseHp <= 0) {
            sound.playExplosion();
            this.finishStage(false);
            return;
          }
          continue;
        }
        if (u.attackCooldown <= 0) {
          u.attackCooldown = 0.55;
          u.attackAnim = 1.0;
          const dmg = u.dmg * 0.42;
          this.playerBaseHp = Math.max(0, this.playerBaseHp - dmg);
          this.spawnBurstParticles(u.x, 0.9, PLAYER_Z - 1.2, 0xff2a55, 3);
          if (Math.random() < 0.3) {
            this.addCameraShake(0.14);
          }

          if (this.playerBaseHp <= 0) {
            sound.playExplosion();
            this.finishStage(false);
            return;
          }
        }
      }

      // Insert into Spatial Hash Grid (Zero-GC Pooled Cell Arrays)
      const gx = Math.floor((u.x + 20) / this.gridCellSize);
      const gz = Math.floor((u.z + 30) / this.gridCellSize);
      const key = gx * 1000 + gz;
      let cell = this.gridMap.get(key);
      if (!cell) {
        if (this.gridCellPoolUsed < this.gridCellPool.length) {
          cell = this.gridCellPool[this.gridCellPoolUsed++];
          cell.length = 0;
        } else {
          cell = [];
          this.gridCellPool.push(cell);
          this.gridCellPoolUsed++;
        }
        this.gridMap.set(key, cell);
      }
      cell.push(i);
    }

    // Step B: Neighbor Crowd Separation, Boids Velocity Alignment & Red-vs-Blue Frontline Combat
    for (let i = 0; i < MAX_UNITS; i++) {
      const a = this.units[i];
      if (!a.active) continue;

      const gx = Math.floor((a.x + 20) / this.gridCellSize);
      const gz = Math.floor((a.z + 30) / this.gridCellSize);

      for (let ox = -1; ox <= 1; ox++) {
        for (let oz = -1; oz <= 1; oz++) {
          const cell = this.gridMap.get((gx + ox) * 1000 + (gz + oz));
          if (!cell) continue;

          for (let k = 0; k < cell.length; k++) {
            const j = cell[k];
            if (j <= i) continue;
            const b = this.units[j];
            if (!b.active) continue;

            const dx = b.x - a.x;
            const dz = b.z - a.z;
            const minDist = a.radius + b.radius;
            const distSq = dx * dx + dz * dz;

            // Titan T2 / T4: Magnetic Fusion Attraction & Contact Merge for same-tier Friendly Giants!
            if (
              a.team === 'blue' &&
              b.team === 'blue' &&
              giantSpec.isGiantMode &&
              giantSpec.maxFusionTier > 1 &&
              a.kind !== 'champion' &&
              b.kind !== 'champion' &&
              a.age > 0.35 &&
              b.age > 0.35 &&
              (a.fusionCooldown || 0) <= 0 &&
              (b.fusionCooldown || 0) <= 0
            ) {
              const tA = a.fusionTier || 1;
              const tB = b.fusionTier || 1;
              if (tA === tB && tA < giantSpec.maxFusionTier) {
                const mergeTouchDist = minDist * 1.12;
                if (distSq <= mergeTouchDist * mergeTouchDist) {
                  // Devour & Fuse into next Giant Colossus Tier!
                  b.active = false;
                  this.promoteGiantUnit(a, tA + 1, b.maxHp, b.dmg, b.hp);
                  continue;
                } else if (distSq <= 1.85 * 1.85 && distSq > 0.0001) {
                  // Subtle magnetic pull so same-tier Giants walking in the same lane naturally converge and fuse!
                  const invD = 1 / Math.sqrt(distSq);
                  const pull = 2.1 * dt;
                  a.vx += dx * invD * pull;
                  a.vz += dz * invD * pull * 0.4;
                  b.vx -= dx * invD * pull;
                  b.vz -= dz * invD * pull * 0.4;
                }
              }
            }

            if (distSq < minDist * minDist && distSq > 0.00001) {
              const dist = Math.sqrt(distSq);
              const nx = dx / dist;
              const nz = dz / dist;

              if (a.team === b.team) {
                // Smooth crowd separation + subtle Boids velocity alignment so crowds flow organically
                const overlap = (minDist - dist) * 0.44;
                a.x -= nx * overlap;
                a.z -= nz * overlap;
                b.x += nx * overlap;
                b.z += nz * overlap;

                const avgVX = (a.vx + b.vx) * 0.5;
                const avgVZ = (a.vz + b.vz) * 0.5;
                a.vx = THREE.MathUtils.lerp(a.vx, avgVX, 0.08);
                a.vz = THREE.MathUtils.lerp(a.vz, avgVZ, 0.08);
                b.vx = THREE.MathUtils.lerp(b.vx, avgVX, 0.08);
                b.vz = THREE.MathUtils.lerp(b.vz, avgVZ, 0.08);
              } else {
                // Enemy collision! Check if either unit is an Acid Baneling first (explodes on contact!)
                const blueUnit = a.team === 'blue' ? a : b;
                const redUnit = a.team === 'red' ? a : b;

                if (redUnit.kind === 'baneling') {
                  this.detonateBaneling(redUnit);
                  if (!a.active) break;
                  continue;
                }

                // Physical separation + cooldown-gated melee strikes
                const sep = (minDist - dist) * 0.52;
                a.x -= nx * sep;
                a.z -= nz * sep;
                b.x += nx * sep;
                b.z += nz * sep;

                if (a.attackCooldown <= 0 || b.attackCooldown <= 0) {
                  if (blueUnit.attackCooldown <= 0) {
                    const rallyAtkMult = this.rallyAuraFx?.active ? this.rallyAuraFx.attackRateMult : 1.0;
                    blueUnit.attackCooldown = 0.35 / (swarmFrenzyMult * rallyAtkMult);
                    blueUnit.attackAnim = 1.0;
                    const isRedElite = redUnit.kind === 'brute' || redUnit.kind === 'shaman';
                    const plasmaRank3 = this.state.getSkillNodeRank('plasma_t3');
                    const plasmaArmorBreak =
                      isRedElite && blueUnit.kind === 'charged' ? 1 + plasmaRank3 * 0.18 : 1.0;
                    if (isRedElite && blueUnit.kind === 'charged' && plasmaRank3 > 0) {
                      redUnit.empTimer = Math.max(redUnit.empTimer || 0, 1.2 + plasmaRank3 * 0.35);
                    }
                    const empVuln = redUnit.empTimer && redUnit.empTimer > 0 ? 1.28 : 1.0;
                    const frostingDmgMult =
                      blueUnit.frostingBurstTimer && blueUnit.frostingBurstTimer > 0 ? 1.35 : 1.0;
                    const syrupVuln =
                      redUnit.syrupSlowTimer && redUnit.syrupSlowTimer > 0
                        ? Math.max(1.3, redUnit.syrupVulnMult || 1.32)
                        : 1.0;
                    const electroVuln =
                      redUnit.electroNetTimer && redUnit.electroNetTimer > 0 ? 1.15 : 1.0;
                    redUnit.hp -=
                      blueUnit.dmg *
                      plasmaArmorBreak *
                      empVuln *
                      frostingDmgMult *
                      syrupVuln *
                      electroVuln;

                    // Giant Branch (titan_t3 or Tier 2+ Fused Giant): Heavy Cleave Shockwave!
                    const blueTier = blueUnit.fusionTier || 0;
                    const hasCleave = blueTier >= 2 || (blueTier === 1 && this.state.getSkillNodeRank('titan_t3') > 0);
                    if (hasCleave && giantSpec.cleaveRatio > 0) {
                      const cleaveR = giantSpec.cleaveRadius + (blueTier - 1) * 0.25;
                      const cleaveDmg = blueUnit.dmg * (giantSpec.cleaveRatio + (blueTier - 1) * 0.04);
                      if (blueTier >= 2 || this.state.getSkillNodeRank('titan_t3') > 0) {
                        const ringCol = blueTier >= 3 ? 0xfacc15 : blueTier === 2 ? 0xf97316 : 0x38bdf8;
                        this.spawnShockwave(redUnit.x, redUnit.z, ringCol, cleaveR * 0.9, 0.2);
                      }
                      for (let rIdx = 0; rIdx < this.activeRedIndices.length; rIdx++) {
                        const otherRed = this.units[this.activeRedIndices[rIdx]];
                        if (!otherRed.active || otherRed === redUnit) continue;
                        const cdx = otherRed.x - redUnit.x;
                        const cdz = otherRed.z - redUnit.z;
                        if (cdx * cdx + cdz * cdz <= cleaveR * cleaveR) {
                          otherRed.hp -= cleaveDmg;
                          otherRed.vz -= 1.2 + blueTier * 0.55;
                          if (otherRed.hp <= 0) {
                            otherRed.active = false;
                            this.onUnitKilled(otherRed);
                          }
                        }
                      }
                    }

                    // Plasma T2: Chain Lightning arc on Charged / Mini-Giant melee strike (50% chance, jumping to r+1 targets)!
                    const chainRank = this.state.getSkillNodeRank('plasma_t2');
                    if (chainRank > 0 && (blueUnit.kind === 'charged' || blueUnit.isMiniGiant) && Math.random() < 0.5) {
                      let arcsLeft = chainRank + 1;
                      this.spawnShockwave(redUnit.x, redUnit.z, 0xfacc15, 2.2, 0.22);
                      for (let rIdx = 0; rIdx < this.activeRedIndices.length && arcsLeft > 0; rIdx++) {
                        const otherRed = this.units[this.activeRedIndices[rIdx]];
                        if (!otherRed.active || otherRed === redUnit) continue;
                        const cdSq = (otherRed.x - redUnit.x) ** 2 + (otherRed.z - redUnit.z) ** 2;
                        if (cdSq <= 3.8 * 3.8) {
                          arcsLeft--;
                          otherRed.hp -= blueUnit.dmg * (0.4 + chainRank * 0.12);
                          this.spawnBurstParticles(otherRed.x, 0.9, otherRed.z, 0xfacc15, 6);
                          if (otherRed.hp <= 0) {
                            otherRed.active = false;
                            this.onUnitKilled(otherRed);
                          }
                        }
                      }
                    }

                    // Hammer Titan triggers AOE Shockwave Slam on melee strike!
                    if (blueUnit.kind === 'champion' && (blueUnit.mechaType || 'hammer') === 'hammer') {
                      this.triggerHammerSlam(blueUnit);
                    }

                    // MC-8 Candy Bombard Tech Branch: Candy-Pop Splash on melee clash!
                    if (blueUnit.kind !== 'champion' && techBonuses.candySplashRatio > 0) {
                      const splashR = techBonuses.candySplashRadius;
                      const splashDmg = blueUnit.dmg * techBonuses.candySplashRatio;
                      if (Math.random() < 0.35) {
                        this.spawnShockwave(redUnit.x, redUnit.z, 0xf472b6, splashR * 0.85, 0.22);
                        this.spawnBurstParticles(redUnit.x, 0.85, redUnit.z, 0xf472b6, 5);
                      }
                      for (let rIdx = 0; rIdx < this.activeRedIndices.length; rIdx++) {
                        const otherRed = this.units[this.activeRedIndices[rIdx]];
                        if (!otherRed.active || otherRed === redUnit) continue;
                        const cdx = otherRed.x - redUnit.x;
                        const cdz = otherRed.z - redUnit.z;
                        if (cdx * cdx + cdz * cdz <= splashR * splashR) {
                          otherRed.hp -= splashDmg;
                          if (otherRed.hp <= 0) {
                            otherRed.active = false;
                            this.onUnitKilled(otherRed);
                          }
                        }
                      }
                    }
                  }
                  if (redUnit.attackCooldown <= 0 && redUnit.active) {
                    redUnit.attackCooldown = 0.35;
                    redUnit.attackAnim = 1.0;
                    if (
                      blueUnit.kind !== 'champion' &&
                      techBonuses.dodgeChance > 0 &&
                      Math.random() < techBonuses.dodgeChance
                    ) {
                      blueUnit.spawnHop = Math.max(blueUnit.spawnHop, 0.36);
                      this.spawnBurstParticles(blueUnit.x, 0.75, blueUnit.z, 0x38bdf8, 3);
                    } else {
                      const nearAegis = this.isNearAegisTitan(blueUnit.x, blueUnit.z);
                      const giantToughness = (blueUnit.fusionTier || 0) >= 1 ? 1 - giantSpec.dmgReduction : 1.0;
                      const bastionToughness = 1 - bastionSpec.trooperDmgReduction;
                      const techArmorToughness =
                        blueUnit.kind !== 'champion' ? 1 - techBonuses.armorDamageReduction : 1.0;
                      const oceanToughness = this.currentTheme.id === 'ocean' ? 0.8 : 1.0;
                      const dmgReduction =
                        (nearAegis ? 0.5 : 1.0) *
                        giantToughness *
                        bastionToughness *
                        techArmorToughness *
                        oceanToughness;
                      blueUnit.hp -= redUnit.dmg * dmgReduction;
                      // Titan T3: Aegis Thorns reflect damage back to Red attacker when near Aegis Titan!
                      const aegisThornsRank = this.state.getSkillNodeRank('titan_t3');
                      if (nearAegis && aegisThornsRank > 0) {
                        redUnit.hp -= redUnit.dmg * (aegisThornsRank * 0.1);
                      }
                    }
                  }

                  a.vx -= nx * 2.4;
                  a.vz -= nz * 2.4;
                  b.vx += nx * 2.4;
                  b.vz += nz * 2.4;

                  if (a.hp <= 0 && a.active) {
                    a.active = false;
                    this.onUnitKilled(a, b);
                  }
                  if (b.hp <= 0 && b.active) {
                    b.active = false;
                    this.onUnitKilled(b, a);
                  }
                  // Swarm T4 Keystone: Infinite Brood Fission (18% chance to split a new clone when killing a Red unit in melee!)
                  if (!redUnit.active && blueUnit.active && this.state.getSkillNodeRank('swarm_t4') > 0) {
                    if (Math.random() < 0.18) {
                      this.spawnUnit(
                        'blue',
                        blueUnit.kind === 'champion' ? 'charged' : blueUnit.kind,
                        redUnit.x,
                        redUnit.z,
                        (Math.random() - 0.5) * 3.0,
                        -blueUnit.speed,
                        blueUnit.passedGates
                      );
                      this.spawnBurstParticles(redUnit.x, 0.8, redUnit.z, 0x38bdf8, 8);
                    }
                  }
                  if (!a.active) break;
                }
              }
            }
          }
          if (!a.active) break;
        }
        if (!a.active) break;
      }
    }

    this.activeBlueCount = blueCount;
    this.activeRedCount = redCount;
  }

  private applyWallLookAhead(u: Unit, w: WallConfig, dt: number): void {
    const abx = w.x2 - w.x1;
    const abz = w.z2 - w.z1;
    const abLenSq = abx * abx + abz * abz;
    if (abLenSq < 0.01) return;

    // Look 0.45s ahead along current velocity
    const lookX = u.x + u.vx * 0.16;
    const lookZ = u.z + u.vz * 0.16;
    const apx = lookX - w.x1;
    const apz = lookZ - w.z1;
    const t = THREE.MathUtils.clamp((apx * abx + apz * abz) / abLenSq, 0, 1);
    const closestX = w.x1 + abx * t;
    const closestZ = w.z1 + abz * t;

    const dx = lookX - closestX;
    const dz = lookZ - closestZ;
    const distSq = dx * dx + dz * dz;
    const avoidRadius = u.radius + 0.95;

    if (distSq < avoidRadius * avoidRadius && distSq > 0.0001 && Math.abs(abx) > 0.25) {
      // Smoothly curve velocity along angled S-curve walls or around horizontal sliding blast doors!
      const abLen = Math.sqrt(abLenSq);
      let tx = abx / abLen;
      let tz = abz / abLen;
      const desiredSignZ = u.team === 'blue' ? -1 : 1;
      if (Math.abs(abz) < 0.25) {
        // Horizontal barrier: steer toward the nearest open lateral edge of the barrier!
        const wallMidX = (w.x1 + w.x2) * 0.5;
        tx = u.x >= wallMidX ? 1 : -1;
        tz = desiredSignZ * 0.35;
      } else if (tz * desiredSignZ < 0) {
        tx = -tx;
        tz = -tz;
      }
      const weight = (1 - Math.sqrt(distSq) / avoidRadius) * 6.5 * dt;
      u.vx = THREE.MathUtils.lerp(u.vx, tx * u.speed, Math.min(1, weight));
      u.vz = THREE.MathUtils.lerp(u.vz, tz * u.speed, Math.min(1, weight));
    }
  }

  private resolveWallCollision(u: Unit, w: WallConfig): void {
    const abx = w.x2 - w.x1;
    const abz = w.z2 - w.z1;
    const apx = u.x - w.x1;
    const apz = u.z - w.z1;
    const abLenSq = abx * abx + abz * abz;
    if (abLenSq === 0) return;

    const t = THREE.MathUtils.clamp((apx * abx + apz * abz) / abLenSq, 0, 1);
    const closestX = w.x1 + abx * t;
    const closestZ = w.z1 + abz * t;

    const dx = u.x - closestX;
    const dz = u.z - closestZ;
    const distSq = dx * dx + dz * dz;
    const minDist = u.radius + 0.36;

    if (distSq < minDist * minDist && distSq > 0.00001) {
      const dist = Math.sqrt(distSq);
      const nx = dx / dist;
      const nz = dz / dist;
      const push = minDist - dist;
      u.x += nx * push;
      u.z += nz * push;

      // Slide along the wall tangent so units flow effortlessly around S-Curves and horizontal Blast Doors!
      if (Math.abs(abx) > 0.2) {
        let slideDirX: number;
        if (Math.abs(abz) < 0.25) {
          const wallMidX = (w.x1 + w.x2) * 0.5;
          slideDirX = u.x >= wallMidX ? 1 : -1;
        } else {
          const forwardSlopeSign = w.z2 < w.z1 ? Math.sign(abx) : -Math.sign(abx);
          slideDirX = u.team === 'blue' ? forwardSlopeSign : -forwardSlopeSign;
        }
        u.vx += slideDirX * 4.2;
      }
    }
  }

  private detonateBarrel(br: BarrelRuntime): void {
    if (!br.alive) return;
    br.alive = false;
    br.mesh.visible = false;
    br.labelEl.style.display = 'none';

    sound.playExplosion();
    this.triggerScreenFlash('#f97316', 0.65);
    this.addCameraShake(0.75);
    this.spawnSkyPillar(br.cfg.x, br.cfg.z, 0xf97316, 2.4, 0.52);
    this.spawnShockwave(br.cfg.x, br.cfg.z, 0xf97316, 6.2, 0.52);
    this.spawnShockwave(br.cfg.x, br.cfg.z, 0xfacc15, 4.0, 0.36);
    this.spawnBurstParticles(br.cfg.x, 1.2, br.cfg.z, 0xf97316, 65);
    this.spawnBurstParticles(br.cfg.x, 1.5, br.cfg.z, 0xfacc15, 35);

    const blastR2 = 5.8 * 5.8;
    let blasted = 0;
    for (let i = 0; i < MAX_UNITS; i++) {
      const e = this.units[i];
      if (!e.active || e.team !== 'red') continue;
      const dx = e.x - br.cfg.x;
      const dz = e.z - br.cfg.z;
      const dSq = dx * dx + dz * dz;
      if (dSq <= blastR2) {
        if (e.kind === 'brute' || e.kind === 'shaman') {
          e.hp -= e.maxHp * 0.7;
          e.vz -= 6.5;
          if (e.hp <= 0) {
            e.active = false;
            blasted++;
            this.onUnitKilled(e);
          }
        } else {
          e.active = false;
          blasted++;
          this.onUnitKilled(e);
        }
      }
    }

    // Explosive Barrels also damage nearby Grinder Gears (-5 HP) and Side Nests (-30% MaxHP)!
    for (const gr of this.gears) {
      if (!gr.alive) continue;
      if ((gr.cfg.x - br.cfg.x) ** 2 + (gr.cfg.z - br.cfg.z) ** 2 <= 6.2 * 6.2) {
        gr.hp = Math.max(0, gr.hp - 5);
        gr.hitFlash = 1.0;
        if (gr.hp <= 0) {
          gr.alive = false;
          gr.mesh.visible = false;
          gr.labelEl.style.display = 'none';
          this.spawnShockwave(gr.cfg.x, gr.cfg.z, 0xf97316, 4.5, 0.45);
          this.spawnFloatingPopup(gr.cfg.x, 1.8, gr.cfg.z, '⚙️ 爆破震碎齿轮!', '#facc15');
        }
      }
    }
    for (const n of this.nests) {
      if (!n.alive) continue;
      if ((n.cfg.x - br.cfg.x) ** 2 + (n.cfg.z - br.cfg.z) ** 2 <= 6.8 * 6.8) {
        n.hp = Math.max(1, n.hp - n.maxHp * 0.3);
        n.hitFlash = 1.0;
        this.spawnFloatingPopup(n.cfg.x, 2.2, n.cfg.z, '💥 爆破波及巢穴 -30%!', '#f97316');
      }
    }
    for (const st of this.bossSubTowers) {
      if (!st.alive) continue;
      if ((st.cfg.x - br.cfg.x) ** 2 + (st.cfg.z - br.cfg.z) ** 2 <= 7.2 * 7.2) {
        st.hp = Math.max(0, st.hp - st.maxHp * 0.35);
        st.hitFlash = 1.0;
        this.spawnFloatingPopup(st.cfg.x, 2.4, st.cfg.z, '爆破重创护盾副塔 -35%!', '#38bdf8');
        if (st.hp <= 0) {
          this.destroyBossSubTower(st);
        }
      }
    }
    if (this.colossusBoss?.active) {
      const cb = this.colossusBoss;
      if (cb.leftShieldAlive && (-4.35 - br.cfg.x) ** 2 + (BOSS_GATE_Z + 1.85 - br.cfg.z) ** 2 <= 8.5 * 8.5) {
        this.damageColossusWeakpoint('left', cb.leftShieldMaxHp * 0.32);
      }
      if (cb.rightCannonAlive && (4.35 - br.cfg.x) ** 2 + (BOSS_GATE_Z + 1.85 - br.cfg.z) ** 2 <= 8.5 * 8.5) {
        this.damageColossusWeakpoint('right', cb.rightCannonMaxHp * 0.32);
      }
    }

    const bonusGold = this.state.addGold(15 + blasted * 2);
    this.spawnFloatingPopup(
      br.cfg.x,
      2.2,
      br.cfg.z,
      blasted > 0 ? `💥 链式爆破 -${blasted}敌 (+${bonusGold}🪙)` : `💥 链式爆破 (+${bonusGold}🪙)`,
      '#facc15'
    );

    if (this.bossShieldActive) {
      this.shatterBossShield();
    }

    // Chain-detonate any neighboring barrel within blast radius!
    for (const other of this.barrels) {
      if (!other.alive || other === br) continue;
      const dSq = (other.cfg.x - br.cfg.x) ** 2 + (other.cfg.z - br.cfg.z) ** 2;
      if (dSq <= 6.2 * 6.2) {
        this.detonateBarrel(other);
      }
    }
  }

  private activateBossShieldPhase(isMiniBoss = false): void {
    this.bossShieldActive = true;
    this.bossShieldHitsRemaining = isMiniBoss ? 14 : 24;
    if (this.bossShieldMesh) {
      this.bossShieldMesh.visible = true;
    }
    sound.playBossRoar();
    this.triggerScreenFlash(isMiniBoss ? '#f97316' : '#d946ef', 0.65);
    this.addCameraShake(0.82);
    this.spawnSkyPillar(0, BOSS_GATE_Z + 1.2, isMiniBoss ? 0xf97316 : 0xd946ef, 3.0, 0.6);
    this.spawnShockwave(0, BOSS_GATE_Z + 1.2, isMiniBoss ? 0xf97316 : 0xd946ef, 11.5, 0.6);
    // Spawn elite guards with the shield!
    this.spawnUnit('red', 'brute', -3.2, BOSS_GATE_Z + 1.5, 0, 3.2);
    this.spawnUnit('red', 'shaman', 3.2, BOSS_GATE_Z + 1.5, 0, 3.0);
    if (isMiniBoss) {
      this.spawnUnit('red', 'brute', 0, BOSS_GATE_Z + 1.6, 0, 3.3);
      this.spawnFloatingPopup(0, 3.2, BOSS_GATE_Z + 1.5, '🛡️ 小Boss先锋护盾开启(14次/炸桶破盾)!', '#fdba74');
      this.onBanner?.('👹 小Boss开启【先锋力场护盾】！', '集火冲击14次或释放技能/炸桶即可瞬间破盾！');
    } else {
      this.spawnFloatingPopup(0, 3.2, BOSS_GATE_Z + 1.5, '🛡️ 虚空护盾开启! 集火或引爆裂变桶破盾!', '#f0abfc');
      this.onBanner?.('🛡️ 大Boss开启【虚空护盾】！', '集火冲击护盾或引爆桥面裂变桶即可破盾重创！');
    }
  }

  public shatterBossShield(): void {
    if (!this.bossShieldActive) return;
    this.bossShieldActive = false;
    this.bossShieldHitsRemaining = 0;
    if (this.bossShieldMesh) {
      this.bossShieldMesh.visible = false;
    }
    sound.playExplosion();
    this.triggerScreenFlash('#00f0ff', 0.72);
    this.addCameraShake(0.92);
    this.spawnSkyPillar(0, BOSS_GATE_Z + 1.0, 0x00f0ff, 3.4, 0.65);
    this.spawnShockwave(0, BOSS_GATE_Z + 1.0, 0x00f0ff, 12.5, 0.62);
    this.spawnBurstParticles(0, 2.5, BOSS_GATE_Z + 1.0, 0x00f0ff, 85);
    this.spawnBurstParticles(0, 2.5, BOSS_GATE_Z + 1.0, 0xd946ef, 45);

    const shatterDmg = Math.round(this.bossMaxHp * 0.1);
    this.bossHp = Math.max(1, this.bossHp - shatterDmg);
    this.enemySpawnTimer = -2.2;
    this.spawnFloatingPopup(0, 3.2, BOSS_GATE_Z + 1.0, `💥 护盾击碎! Boss重创 -${shatterDmg}!`, '#00f0ff');
    this.onBanner?.('💥 虚空护盾已被击碎！', `母巢遭受反噬重创 -${shatterDmg} HP！`);
  }

  private corruptRandomBlueGate(): void {
    const candidates = this.gates.filter((g) => g.cfg.op === 'add');
    if (candidates.length === 0) return;
    const g = candidates[Math.floor(Math.random() * candidates.length)];
    g.cfg.op = 'sub';
    g.cfg.value = 2;
    g.cfg.style = 'hazard';
    g.chargeHits = 0;
    g.pulseTimer = 1.4;
    g.pillarMat.color.setHex(0xe8ad38);
    g.pillarMat.emissive.setHex(0x3b2306);
    g.shieldMat.map = this.getGateBannerTexture('hazard', '-2');
    g.shieldMat.needsUpdate = true;
    g.labelEl.className = 'gate-label hazard-gate';
    g.labelEl.textContent = '-2';

    this.spawnSkyPillar(g.currentX, g.cfg.z, 0xf96e80, 1.8, 0.48);
    this.spawnShockwave(g.currentX, g.cfg.z, 0xf96e80, 4.0, 0.42);
    this.spawnBurstParticles(g.currentX, 1.2, g.cfg.z, 0xf96e80, 38);
    this.spawnFloatingPopup(g.currentX, 2.2, g.cfg.z, '⚠️ 应援旗被染红! 快冲锋翻旗!', '#f96e80');
  }

  public getAliveSubTowerCount(): number {
    let count = 0;
    for (const st of this.bossSubTowers) {
      if (st.alive) count += 1;
    }
    return count;
  }

  public getSubTowerBossDamageMultiplier(): number {
    const alive = this.getAliveSubTowerCount();
    if (alive >= 2) return 0.24;
    if (alive === 1) return 0.58;
    return 1.0;
  }

  public destroyBossSubTower(st: BossSubTowerRuntime, silent = false): void {
    if (!st.alive) return;
    st.alive = false;
    st.hp = 0;
    st.group.visible = false;
    st.beamMesh.visible = false;
    st.labelEl.style.display = 'none';

    const remaining = this.getAliveSubTowerCount();
    if (this.bossSteamBarrierMesh) {
      this.bossSteamBarrierMesh.visible = remaining > 0;
      this.bossSteamBarrierMat.opacity = remaining >= 2 ? 0.36 : 0.2;
    }

    const gold = this.state.addGold(st.cfg.rewardGold);
    this.state.championCharge = Math.min(100, this.state.championCharge + 35);

    if (!silent) {
      sound.playExplosion();
      this.triggerScreenFlash('#38bdf8', 0.52);
      this.addCameraShake(0.68);
      this.spawnSkyPillar(st.cfg.x, st.cfg.z, 0x38bdf8, 2.4, 0.55);
      this.spawnShockwave(st.cfg.x, st.cfg.z, 0x38bdf8, 6.8, 0.55);
      this.spawnBurstParticles(st.cfg.x, 2.0, st.cfg.z, 0x38bdf8, 65);
      this.spawnBurstParticles(st.cfg.x, 1.6, st.cfg.z, 0xfacc15, 32);
      this.spawnFloatingPopup(st.cfg.x, 2.7, st.cfg.z, `${st.cfg.name}击破! +${gold}`, '#38bdf8');
    }

    if (remaining === 0) {
      const shatterDmg = Math.max(1, Math.round(this.bossMaxHp * 0.12));
      this.bossHp = Math.max(1, this.bossHp - shatterDmg);
      if (!silent) {
        this.spawnSkyPillar(0, BOSS_GATE_Z + 0.8, 0x38bdf8, 3.2, 0.65);
        this.spawnShockwave(0, BOSS_GATE_Z + 0.8, 0xfacc15, 12.0, 0.62);
        this.spawnFloatingPopup(0, 3.3, BOSS_GATE_Z + 1.0, `双侧护盾塔全破! 母巢过载 -${shatterDmg}!`, '#38bdf8');
        this.onBanner?.('双侧蒸汽护盾塔全破！', `母巢护盾彻底瓦解，承受过载反噬 -${shatterDmg} HP！`);
      }
    } else if (!silent) {
      this.onBanner?.(`击破${st.cfg.name}！`, '母巢护盾减伤已削弱，分兵拔除另一侧副塔即可彻底破防！');
    }
  }

  public startBossSteamSweep(forcedLane?: 'left' | 'right', silent = false): void {
    if (!this.bossSteamSweep) return;
    let lane: 'left' | 'right';
    if (forcedLane) {
      lane = forcedLane;
    } else {
      let leftBlues = 0;
      let rightBlues = 0;
      for (const bIdx of this.activeBlueIndices) {
        const bu = this.units[bIdx];
        if (!bu.active) continue;
        if (bu.x < 0) leftBlues += 1;
        else rightBlues += 1;
      }
      if (leftBlues !== rightBlues) {
        lane = leftBlues > rightBlues ? 'left' : 'right';
      } else {
        lane = this.bossSteamSweep.lane === 'left' ? 'right' : 'left';
      }
    }
    this.bossSteamSweep.phase = 'telegraph';
    this.bossSteamSweep.lane = lane;
    this.bossSteamSweep.maxTimer = 2.3;
    this.bossSteamSweep.timer = 2.3;
    this.bossSteamSweep.waveZ = BOSS_GATE_Z + 1.6;
    const laneCenterX = lane === 'left' ? -5.35 : 5.35;
    this.bossSteamSweep.telegraphGroup.position.x = laneCenterX;
    this.bossSteamSweep.telegraphGroup.visible = true;
    this.bossSteamSweep.waveGroup.visible = false;

    if (!silent) {
      const warnMsg =
        lane === 'left' ? '左路高压蒸汽预警 · 换右路!' : '右路高压蒸汽预警 · 换左路!';
      const popupX = lane === 'left' ? -1.8 : 1.8;
      this.spawnFloatingPopup(popupX, 2.2, 3.5, warnMsg, '#fb923c');
    }
  }

  private updateBossSteamSweep(dt: number, isMega: boolean): void {
    const sw = this.bossSteamSweep;
    if (!sw) return;

    if (sw.phase === 'idle') {
      sw.cooldown -= dt;
      if (sw.cooldown <= 0) {
        this.startBossSteamSweep();
      }
      return;
    }

    if (sw.phase === 'telegraph') {
      sw.timer -= dt;
      const pulse = Math.abs(Math.sin(this.elapsedTime * 12));
      sw.telegraphFillMat.opacity = 0.2 + 0.24 * pulse;
      sw.telegraphBorderMat.opacity = 0.52 + 0.44 * pulse;
      if (sw.timer <= 0) {
        sw.phase = 'sweeping';
        sw.telegraphGroup.visible = false;
        sw.maxTimer = 0.9;
        sw.timer = 0.9;
        sw.waveZ = BOSS_GATE_Z + 1.6;
        const laneX = sw.lane === 'left' ? -5.35 : 5.35;
        sw.waveGroup.position.set(laneX, 0, sw.waveZ);
        sw.waveGroup.visible = true;
        this.addCameraShake(0.45);
        this.spawnBurstParticles(laneX, 1.3, BOSS_GATE_Z + 2.0, 0xfb923c, 36);
      }
      return;
    }

    if (sw.phase === 'sweeping') {
      sw.timer -= dt;
      const progress = 1 - Math.max(0, sw.timer) / Math.max(0.01, sw.maxTimer);
      const prevZ = sw.waveZ;
      sw.waveZ = THREE.MathUtils.lerp(BOSS_GATE_Z + 1.6, PLAYER_Z - 2.2, progress);
      const laneX = sw.lane === 'left' ? -5.35 : 5.35;
      sw.waveGroup.position.set(laneX, 0, sw.waveZ);

      if (Math.random() < 0.65) {
        this.spawnBurstParticles(laneX + (Math.random() - 0.5) * 7.5, 1.0, sw.waveZ, 0xfed7aa, 6);
      }

      const minSweepZ = Math.min(prevZ, sw.waveZ) - 1.6;
      const maxSweepZ = Math.max(prevZ, sw.waveZ) + 1.6;
      for (const bIdx of this.activeBlueIndices) {
        const bu = this.units[bIdx];
        if (!bu.active) continue;
        const inLane = sw.lane === 'left' ? bu.x < -0.15 : bu.x > 0.15;
        if (!inLane) continue;
        if (bu.z >= minSweepZ && bu.z <= maxSweepZ) {
          bu.z = Math.min(PLAYER_Z - 2.0, bu.z + 3.4);
          bu.vz = Math.max(bu.vz, 6.2);
          bu.spawnHop = Math.max(bu.spawnHop, 0.45);
          const scaldRatio = bu.kind === 'champion' ? 0.14 : 0.65;
          bu.hp -= bu.maxHp * scaldRatio;
          if (bu.hp <= 0) {
            bu.active = false;
          }
        }
      }

      if (sw.timer <= 0) {
        sw.phase = 'idle';
        sw.waveGroup.visible = false;
        sw.cooldown = isMega ? 6.6 : 8.2;
      }
    }
  }

  private updateMegaBossMechanics(dt: number): void {
    const isMega = Boolean(this.currentLevel?.isMegaBoss);
    const isMini = Boolean(this.currentLevel?.isMiniBoss);

    if (isMega || isMini) {
      this.updateBossSteamSweep(dt, isMega);
    }

    if (this.bossShieldActive) {
      this.bossHp = Math.min(this.bossMaxHp, this.bossHp + this.bossMaxHp * 0.006 * dt);
      if (this.bossShieldMesh) {
        const pulse = 1 + Math.sin(this.elapsedTime * 10) * 0.05;
        this.bossShieldMesh.scale.set(pulse, pulse, pulse);
      }
    }

    // Mega Boss Mechanic 3: Periodic Gate Corruption Curse (Stage 10, 20, 30...)
    if (isMega) {
      this.megaBossCurseTimer -= dt;
      if (this.megaBossCurseTimer <= 0) {
        this.megaBossCurseTimer = 12.0;
        this.corruptRandomBlueGate();
      }

      // Mega Boss Mechanic 4: Abyssal Claw Slam & Execution Squad (Every 9.2s)
      this.megaBossSlamTimer -= dt;
      if (this.megaBossSlamTimer <= 0) {
        this.megaBossSlamTimer = 9.2;
        sound.playBossRoar();
        this.triggerContinuousQuake(0.68, 1.15);
        this.triggerScreenFlash('#ff0044', 0.62);
        this.spawnSkyPillar(-4.2, BOSS_GATE_Z + 1.5, 0xff0044, 2.5, 0.55);
        this.spawnSkyPillar(4.2, BOSS_GATE_Z + 1.5, 0xff0044, 2.5, 0.55);
        this.spawnShockwave(0, BOSS_GATE_Z + 1.5, 0xff0044, 15.5, 0.65);
        this.spawnFloatingPopup(0, 3.2, BOSS_GATE_Z + 1.8, '👑 大Boss深渊震击 · 处刑卫队出击!', '#ff2a55');

        // Knockback all Blue units on the bridge & spawn an immediate Execution Squad!
        for (const bIdx of this.activeBlueIndices) {
          const bu = this.units[bIdx];
          if (!bu.active) continue;
          bu.vz += 5.2;
        }
        this.spawnUnit('red', 'brute', 0, BOSS_GATE_Z + 1.6, 0, 3.4);
        for (const bx of [-4.5, -1.5, 1.5, 4.5]) {
          this.spawnUnit('red', 'baneling', bx, BOSS_GATE_Z + 1.9, (Math.random() - 0.5) * 0.8, 4.5);
        }
      }
    }

    // Mini-Boss Mechanic: Periodic War Cry Overdrive Wave (Stage 5, 15, 25, 35...)
    if (isMini) {
      this.miniBossWarCryTimer -= dt;
      if (this.miniBossWarCryTimer <= 0) {
        this.miniBossWarCryTimer = 9.2;
        sound.playBossRoar();
        this.addCameraShake(0.55);
        this.spawnSkyPillar(0, BOSS_GATE_Z + 1.2, 0xf97316, 2.2, 0.48);
        this.spawnShockwave(0, BOSS_GATE_Z + 1.2, 0xf97316, 11.0, 0.55);
        this.spawnFloatingPopup(0, 3.0, BOSS_GATE_Z + 1.5, '👹 小Boss狂暴战吼 · 红军全线冲锋!', '#fb923c');
        for (const rIdx of this.activeRedIndices) {
          const ru = this.units[rIdx];
          if (!ru.active) continue;
          ru.vz += 2.6;
          ru.spawnHop = Math.max(ru.spawnHop, 0.55);
        }
      }
    }

    // Mechanic 1: Periodic Meteor Lock-On Strikes (Both Mini-Boss & Mega Boss!)
    const anyActiveTelegraph = this.meteorTelegraphs.some((m) => m.active);
    if (!anyActiveTelegraph) {
      this.megaBossMeteorTimer -= dt;
      if (this.megaBossMeteorTimer <= 0) {
        this.megaBossMeteorTimer = isMega ? 6.2 : 8.5;
        // Lock 0: Directly on the Player's current Turret X!
        const t0 = this.meteorTelegraphs[0];
        t0.active = true;
        t0.x = this.turretX;
        t0.z = PLAYER_Z - 1.4;
        t0.radius = isMega ? 2.5 : 2.3;
        t0.maxTimer = 2.0;
        t0.timer = 2.0;
        t0.isTurretLock = true;
        t0.mesh.position.set(t0.x, 0.16, t0.z);
        t0.mesh.visible = true;
        this.spawnFloatingPopup(t0.x, 2.0, t0.z, '⚠️ Boss陨石锁定战车！快横向走位闪避！', '#ff2a55');

        // Lock 1 & Lock 2: Mid-field bridge lanes (Mega Boss launches a 3-Ring Triple Meteor Barrage!)
        if (isMega) {
          const t1 = this.meteorTelegraphs[1];
          t1.active = true;
          t1.x = -3.8 + (Math.random() - 0.5) * 3.0;
          t1.z = -1.5 + (Math.random() - 0.5) * 4.5;
          t1.radius = 3.2;
          t1.maxTimer = 2.0;
          t1.timer = 2.0;
          t1.isTurretLock = false;
          t1.mesh.position.set(t1.x, 0.16, t1.z);
          t1.mesh.visible = true;

          const t2 = this.meteorTelegraphs[2];
          if (t2) {
            t2.active = true;
            t2.x = 3.8 + (Math.random() - 0.5) * 3.0;
            t2.z = 3.2 + (Math.random() - 0.5) * 4.5;
            t2.radius = 3.2;
            t2.maxTimer = 2.0;
            t2.timer = 2.0;
            t2.isTurretLock = false;
            t2.mesh.position.set(t2.x, 0.16, t2.z);
            t2.mesh.visible = true;
          }
        }
      }
    } else {
      for (const mt of this.meteorTelegraphs) {
        if (!mt.active) continue;
        mt.timer -= dt;
        const progress = 1 - Math.max(0, mt.timer) / mt.maxTimer;
        const pulseR = mt.radius * (0.4 + 0.6 * progress);
        mt.mesh.scale.set(pulseR, pulseR, pulseR);
        mt.mat.opacity = 0.45 + 0.5 * Math.abs(Math.sin(this.elapsedTime * 16));

        if (mt.timer <= 0) {
          mt.active = false;
          mt.mesh.visible = false;
          sound.playExplosion();
          if (isMega && mt.isTurretLock) {
            this.triggerContinuousQuake(0.52, 1.08);
          } else {
            this.addCameraShake(0.65);
          }
          this.spawnSkyPillar(mt.x, mt.z, 0xff2a55, 2.5, 0.52);
          this.spawnShockwave(mt.x, mt.z, 0xff2a55, mt.radius * 1.7, 0.48);
          this.spawnBurstParticles(mt.x, 1.0, mt.z, 0xff2a55, 65);

          if (mt.isTurretLock) {
            if (Math.abs(this.turretX - mt.x) <= mt.radius) {
              const hitDmg = Math.round(this.playerBaseMaxHp * 0.15);
              this.playerBaseHp = Math.max(0, this.playerBaseHp - hitDmg);
              this.triggerScreenFlash('#ff2a55', 0.65);
              this.spawnFloatingPopup(mt.x, 2.2, mt.z, `💥 陨石命中战车! 基地 -${hitDmg}HP!`, '#ff2a55');
              if (this.playerBaseHp <= 0) {
                this.finishStage(false);
                return;
              }
            } else {
              this.state.championCharge = Math.min(100, this.state.championCharge + 15);
              this.state.orbitalCharge = Math.min(100, this.state.orbitalCharge + 15);
              this.spawnFloatingPopup(this.turretX, 2.2, PLAYER_Z - 1.4, '✨ 完美闪避陨石! 充能+15%', '#00f0ff');
            }
          } else {
            const r2 = mt.radius * mt.radius;
            for (const idx of this.activeBlueIndices) {
              const u = this.units[idx];
              if (!u.active || u.kind === 'champion') continue;
              if ((u.x - mt.x) ** 2 + (u.z - mt.z) ** 2 <= r2) {
                u.active = false;
              }
            }
          }
        }
      }
    }
  }

  private flipHazardGateToBlue(g: GateRuntime, silent = false): void {
    g.cfg.op = 'add';
    g.cfg.value = 1;
    g.cfg.style = 'blue';
    g.chargeHits = 0;
    g.flippedFromHazard = true;
    g.pulseTimer = 1.4;
    this.syncGateVisualStyle(g);

    if (!silent) {
      sound.playCloneGate(3);
      this.addCameraShake(0.45);
      this.spawnSkyPillar(g.currentX, g.cfg.z, 0x28c7fa, 1.9, 0.45);
      this.spawnShockwave(g.currentX, g.cfg.z, 0x28c7fa, 4.2, 0.42);
      this.spawnBurstParticles(g.currentX, 1.2, g.cfg.z, 0x28c7fa, 42);
      this.spawnFloatingPopup(g.currentX, 2.2, g.cfg.z, '门脉翻蓝! 变为 +1', '#38bdf8');
    }

    // Gate T4 Keystone: Truth Alchemy Gate (reversing a Red Gate triggers a full-screen heal, knockback & upgrades all Blue gates +1!)
    if (this.state.getSkillNodeRank('gate_t4') > 0) {
      const maxGateCap = Math.max(5, this.state.getMaxBlueGateCap());
      if (!silent) {
        this.triggerScreenFlash('#22d3ee', 0.65);
        this.spawnShockwave(g.currentX, g.cfg.z, 0x22d3ee, 14.5, 0.58);
      }
      for (const otherG of this.gates) {
        if (otherG.cfg.op === 'add' && otherG.cfg.value < maxGateCap) {
          otherG.cfg.value += 1;
          this.syncBlueGateVisualStyle(otherG);
        }
      }
      for (const bIdx of this.activeBlueIndices) {
        const bu = this.units[bIdx];
        if (bu.active) bu.hp = bu.maxHp;
      }
      for (const rIdx of this.activeRedIndices) {
        const ru = this.units[rIdx];
        if (ru.active) {
          ru.z = Math.max(BOSS_GATE_Z + 1.5, ru.z - 4.2);
          ru.vz = -8.5;
          ru.spawnHop = 1.1;
        }
      }
      if (!silent) {
        this.spawnFloatingPopup(g.currentX, 2.9, g.cfg.z, '真理炼金脉冲! 全蓝门+1 & 全军满血!', '#22d3ee');
      }
    }
  }

  public runMc1SelfCheck(): {
    ok: boolean;
    hasJellyGate: boolean;
    hasFrostGate: boolean;
    chargeProgression: string[];
    frameColorChanged: boolean;
    jellyDoubled: boolean;
    frostBlockedGear: boolean;
    frostBlockedBarrel: boolean;
  } {
    const hasJellyGate = this.gates.some((g) => g.cfg.op === 'giant_jelly');
    const hasFrostGate = this.gates.some((g) => g.cfg.op === 'frost_shield');

    // 1. Test dynamic GateRuntime.chargeHits: -6 -> ... -> +1 -> +3 -> +5 & pillar color transition
    const testGate = this.gates[0];
    const savedCfg = { ...testGate.cfg };
    const savedCharge = testGate.chargeHits;
    const savedInitHaz = testGate.initialHazardValue;
    const savedFlipped = testGate.flippedFromHazard;

    testGate.cfg.op = 'sub';
    testGate.cfg.value = 6;
    testGate.initialHazardValue = 6;
    testGate.flippedFromHazard = false;
    testGate.chargeHits = 0;
    this.syncGateVisualStyle(testGate);
    const startHex = testGate.pillarMat.color.getHexString();
    const prog: string[] = [this.formatGateLabel(testGate.cfg)];
    for (let step = 0; step < 12; step++) {
      const prevLbl = this.formatGateLabel(testGate.cfg);
      this.chargeGate(testGate, 3, true);
      const curLbl = this.formatGateLabel(testGate.cfg);
      if (curLbl !== prevLbl) prog.push(curLbl);
    }
    const endHex = testGate.pillarMat.color.getHexString();
    const frameColorChanged = startHex !== endHex;

    // Restore gate state
    testGate.cfg = savedCfg;
    testGate.chargeHits = savedCharge;
    testGate.initialHazardValue = savedInitHaz;
    testGate.flippedFromHazard = savedFlipped;
    this.syncGateVisualStyle(testGate);

    // 2. Test Giant Jelly Gate: doubles HP & DMG and sets jellyGiant = true
    const jellyGate = this.gates.find((g) => g.cfg.op === 'giant_jelly');
    const frostGate = this.gates.find((g) => g.cfg.op === 'frost_shield');
    const probe = this.spawnUnit('blue', 'normal', 0, 10.0, 0, -6.0);
    let jellyDoubled = false;
    let frostBlockedGear = false;
    let frostBlockedBarrel = false;
    if (probe && jellyGate && frostGate) {
      const hp0 = probe.maxHp;
      const dmg0 = probe.dmg;
      this.applyGateEffect(probe, jellyGate);
      jellyDoubled =
        Boolean(probe.jellyGiant) &&
        Math.abs(probe.maxHp - hp0 * 2) < 0.01 &&
        Math.abs(probe.dmg - dmg0 * 2) < 0.01;

      // 3. Test Frosting Shield Gate vs Grinder Gear & Explosive Barrel
      this.applyGateEffect(probe, frostGate);
      const hpBeforeHazards = probe.hp;
      if (probe.frostShield) {
        // Real update tick collision against a temporary test gear & barrel (isolate from stage hazards/units)
        const savedActiveIndices: number[] = [];
        for (let i = 0; i < this.units.length; i++) {
          if (this.units[i] !== probe && this.units[i].active) {
            savedActiveIndices.push(i);
            this.units[i].active = false;
          }
        }
        const savedGates = this.gates;
        const savedZones = this.zones;
        const savedBumpers = this.bumpers;
        const savedWalls = this.walls;
        const savedNests = this.nests;
        const savedGears = [...this.gears];
        const savedBarrels = [...this.barrels];
        const savedLootBugActive = this.lootBug.active;
        this.gates = [];
        this.zones = [];
        this.bumpers = [];
        this.walls = [];
        this.nests = [];
        this.lootBug.active = false;
        this.barrels = [];

        const dummyGroup = new THREE.Group();
        const dummyLabel = document.createElement('div');
        probe.vx = 0;
        probe.vz = 0;
        probe.spawnHop = 0;
        this.gears = [
          {
            cfg: { id: '_mc1_test_gear', x: probe.x, z: probe.z, radius: 1.2, hp: 99 },
            mesh: dummyGroup,
            baseX: probe.x,
            hp: 99,
            alive: true,
            hitFlash: 0,
            labelEl: dummyLabel,
          },
        ];
        this.update(0.016);
        frostBlockedGear = probe.active && !probe.frostShield && Math.abs(probe.hp - hpBeforeHazards) < 0.01;

        // Now re-grant frost shield and test real update tick against temporary barrel
        this.applyGateEffect(probe, frostGate);
        this.gears = [];
        probe.vx = 0;
        probe.vz = 0;
        probe.spawnHop = 0;
        this.barrels = [
          {
            cfg: { id: '_mc1_test_barrel', x: probe.x, z: probe.z, hp: 99 },
            mesh: dummyGroup,
            hp: 99,
            alive: true,
            labelEl: dummyLabel,
          },
        ];
        this.update(0.016);
        frostBlockedBarrel = probe.active && !probe.frostShield && Math.abs(probe.hp - hpBeforeHazards) < 0.01;

        this.barrels = savedBarrels;
        this.gears = savedGears;
        this.nests = savedNests;
        this.walls = savedWalls;
        this.bumpers = savedBumpers;
        this.zones = savedZones;
        this.gates = savedGates;
        this.lootBug.active = savedLootBugActive;
        for (const idx of savedActiveIndices) {
          this.units[idx].active = true;
        }
      }
      probe.active = false;
    }

    const reachedPlus1 = prog.includes('+1');
    const reachedPlus3 = prog.includes('+3');
    const reachedPlus5 = prog.includes('+5');
    return {
      ok:
        hasJellyGate &&
        hasFrostGate &&
        reachedPlus1 &&
        reachedPlus3 &&
        reachedPlus5 &&
        frameColorChanged &&
        jellyDoubled &&
        frostBlockedGear &&
        frostBlockedBarrel,
      hasJellyGate,
      hasFrostGate,
      chargeProgression: prog,
      frameColorChanged,
      jellyDoubled,
      frostBlockedGear,
      frostBlockedBarrel,
    };
  }

  public loadStageByNumber(stageNumber: number): LevelConfig {
    const lvl = generateDynamicLevel(stageNumber);
    this.loadLevel(lvl);
    return lvl;
  }

  public runMc2SelfCheck(): {
    ok: boolean;
    stage5SubTowers: number;
    stage10SubTowers: number;
    multTwoAlive: number;
    multOneAlive: number;
    multZeroAlive: number;
    bossOverloadDamaged: boolean;
    telegraphVisible: boolean;
    sweptLaneHit: boolean;
    safeLaneUnharmed: boolean;
  } {
    const savedLevel = this.currentLevel || generateDynamicLevel(1);

    const lvl5 = generateDynamicLevel(5);
    const lvl10 = generateDynamicLevel(10);
    const stage5SubTowers = lvl5.bossSubTowers.length;
    const stage10SubTowers = lvl10.bossSubTowers.length;

    this.loadLevel(lvl5);
    const multTwoAlive = this.getSubTowerBossDamageMultiplier();
    const hpBeforeBreak = this.bossHp;
    if (this.bossSubTowers[0]) {
      this.destroyBossSubTower(this.bossSubTowers[0], true);
    }
    const multOneAlive = this.getSubTowerBossDamageMultiplier();
    if (this.bossSubTowers[1]) {
      this.destroyBossSubTower(this.bossSubTowers[1], true);
    }
    const multZeroAlive = this.getSubTowerBossDamageMultiplier();
    const bossOverloadDamaged = this.bossHp < hpBeforeBreak && !this.bossSteamBarrierMesh.visible;

    // Test Ground Half-Bridge Telegraph & High-Pressure Steam Sweep lane isolation
    for (const u of this.units) u.active = false;
    this.activeBlueIndices = [];
    this.activeRedIndices = [];

    this.startBossSteamSweep('left', true);
    const telegraphVisible =
      this.bossSteamSweep.phase === 'telegraph' && this.bossSteamSweep.telegraphGroup.visible;

    const leftProbe = this.spawnUnit('blue', 'normal', -5.2, -3.0, 0, 0);
    const rightProbe = this.spawnUnit('blue', 'normal', 5.2, -3.0, 0, 0);
    let sweptLaneHit = false;
    let safeLaneUnharmed = false;

    if (leftProbe && rightProbe) {
      leftProbe.spawnHop = 0;
      rightProbe.spawnHop = 0;
      const lIdx = this.units.indexOf(leftProbe);
      const rIdx = this.units.indexOf(rightProbe);
      if (lIdx >= 0) this.activeBlueIndices.push(lIdx);
      if (rIdx >= 0) this.activeBlueIndices.push(rIdx);
      const leftStartHp = leftProbe.hp;
      const leftStartZ = leftProbe.z;
      const rightStartHp = rightProbe.hp;

      // Advance past 2.3s telegraph + 0.9s full-bridge steam sweep
      for (let i = 0; i < 42; i++) {
        this.updateBossSteamSweep(0.08, false);
      }

      sweptLaneHit = !leftProbe.active || leftProbe.hp < leftStartHp || leftProbe.z > leftStartZ + 1.5;
      safeLaneUnharmed = rightProbe.active && Math.abs(rightProbe.hp - rightStartHp) < 0.01;
      leftProbe.active = false;
      rightProbe.active = false;
    }

    this.loadLevel(savedLevel);
    return {
      ok:
        stage5SubTowers === 2 &&
        stage10SubTowers === 2 &&
        Math.abs(multTwoAlive - 0.24) < 0.01 &&
        Math.abs(multOneAlive - 0.58) < 0.01 &&
        Math.abs(multZeroAlive - 1.0) < 0.01 &&
        bossOverloadDamaged &&
        telegraphVisible &&
        sweptLaneHit &&
        safeLaneUnharmed,
      stage5SubTowers,
      stage10SubTowers,
      multTwoAlive,
      multOneAlive,
      multZeroAlive,
      bossOverloadDamaged,
      telegraphVisible,
      sweptLaneHit,
      safeLaneUnharmed,
    };
  }

  public runMc3SelfCheck(): {
    ok: boolean;
    bonusVaultCount: number;
    bonusDuration: number;
    bonusZeroRedSpawn: boolean;
    vaultBroken: boolean;
    bonusGoldDelta: number;
    bonusShardsEarned: number;
    endlessWaveReached: number;
    endlessBrutesSpawned: number;
    persistedBestWave: number;
    medalTitle: string;
  } {
    const prevLevel = this.currentLevel;
    const prevPaused = this.isPaused;
    this.isPaused = false;

    // 1. Verify 25s Candy Vault Bonus Heist (Zero Red Enemies + 3D Candy Vault Gold & Skin Shard Burst)
    const bonusLvl = generateCandyVaultBonusLevel(5);
    this.loadLevel(bonusLvl);
    const bonusVaultCount = this.candyVaults.length;
    const bonusDuration = Math.round(this.bonusHeistTimeLeft);
    const goldBefore = this.state.gold;

    // Step 1.2s and confirm zero Red units ever spawn in Bonus Heist
    for (let i = 0; i < 30; i++) {
      this.update(0.04);
    }
    const bonusZeroRedSpawn = this.activeRedCount === 0 && this.bonusHeistTimeLeft < 25;

    // Place a squad of high-power Blue champions right next to the first Candy Vault to smash it
    const targetVault = this.candyVaults[0];
    if (targetVault) {
      targetVault.hp = 12;
      for (let k = 0; k < 4; k++) {
        const bu = this.spawnUnit('blue', 'champion', targetVault.cfg.x, targetVault.cfg.z + 1.0, 0, -4.0);
        if (bu) {
          bu.dmg = 45;
          bu.attackCooldown = 0;
        }
      }
      for (let i = 0; i < 15; i++) {
        this.update(0.04);
      }
    }
    const vaultBroken = this.bonusVaultsBroken >= 1 && Boolean(targetVault && !targetVault.alive);
    const bonusGoldDelta = Math.round(this.state.gold - goldBefore);
    const bonusShardsEarned = this.bonusHeistShardsEarned;

    // 2. Verify Endless Workshop Defense (Escalating Waves + Mutant Giant Brute Spawns + Best Wave Medal)
    const endlessLvl = generateEndlessDefenseLevel();
    this.loadLevel(endlessLvl);
    this.endlessWaveTimer = 10.96;
    this.update(0.05); // Triggers Wave 2
    this.endlessWaveTimer = 10.96;
    this.update(0.05); // Triggers Wave 3 (+1 skin shard milestone & multiple Mutant Giants)

    const endlessWaveReached = this.endlessWave;
    const endlessBrutesSpawned = this.units.filter(
      (u) => u.active && u.team === 'red' && u.kind === 'brute'
    ).length;
    const persistedBestWave = this.state.bestEndlessWave;
    const medalTitle = this.state.getEndlessMedalInfo(persistedBestWave).label;

    if (prevLevel) {
      this.loadLevel(prevLevel);
    }
    this.isPaused = prevPaused;

    return {
      ok:
        bonusVaultCount >= 5 &&
        bonusDuration === 25 &&
        bonusZeroRedSpawn &&
        vaultBroken &&
        bonusGoldDelta >= 400 &&
        bonusShardsEarned >= 1 &&
        endlessWaveReached >= 3 &&
        endlessBrutesSpawned >= 2 &&
        persistedBestWave >= 3 &&
        Boolean(medalTitle),
      bonusVaultCount,
      bonusDuration,
      bonusZeroRedSpawn,
      vaultBroken,
      bonusGoldDelta,
      bonusShardsEarned,
      endlessWaveReached,
      endlessBrutesSpawned,
      persistedBestWave,
      medalTitle,
    };
  }

  public runMc4SelfCheck(): {
    ok: boolean;
    scatterFanCount: number;
    scatterBounced: boolean;
    rainbowBeamHitRed: boolean;
    airdropSpawned: boolean;
    airdropCollected: boolean;
    dualVolleyActiveAndDoubles: boolean;
    freezeRedsSlowed: boolean;
    frontlineGiantsPromoted: boolean;
    bonusHeistSkippedAirdrop: boolean;
    cleanResetOnLoad: boolean;
  } {
    const prevLevel = this.currentLevel;
    const prevPaused = this.isPaused;
    const prevWeapon = this.state.weapon;
    this.isPaused = false;

    // 1. Standard stage: Verify Scatter 3-way fan + curb ricochet bounce
    this.loadLevel(generateDynamicLevel(1));
    this.state.setWeaponMode('scatter');
    this.turretX = -TRACK_HALF_W + 1.3;
    this.turretTargetX = this.turretX;
    this.fireTurret();
    const scatterUnits = this.units.filter((u) => u.active && u.team === 'blue');
    const scatterFanCount = scatterUnits.length;
    const bounceProbe = scatterUnits.find((u) => u.vx < -0.5 && (u.scatterBounceLeft || 0) > 0);
    for (let i = 0; i < 12; i++) {
      this.simulateUnits(0.05);
    }
    const scatterBounced = Boolean(bounceProbe && bounceProbe.vx > 0 && (bounceProbe.scatterBounceLeft || 0) < 2);

    // 2. Verify Rainbow charged piercing beam (every 4th shot)
    this.loadLevel(generateDynamicLevel(1));
    this.state.setWeaponMode('rainbow');
    this.turretX = 0;
    this.turretTargetX = 0;
    const redTarget = this.spawnUnit('red', 'normal', 0.1, 2.0, 0, 1.0);
    const targetId = redTarget ? redTarget.id : -1;
    const hpBefore = redTarget ? redTarget.hp : 0;
    const killsBefore = this.state.stageMutantsKilled;
    for (let s = 0; s < 4; s++) {
      this.fireTurret();
    }
    const rainbowBeamHitRed =
      this.state.stageMutantsKilled > killsBefore ||
      Boolean(redTarget && (!redTarget.active || redTarget.id !== targetId || redTarget.hp < hpBefore));

    // 3. Verify Tactical Airdrop spawn, landing, collection & all 3 8s frenzy buffs
    this.loadLevel(generateDynamicLevel(1));
    this.airdropSpawnTimer = 0.02;
    this.update(0.05);
    const airdropSpawned = this.airdrop.active && this.airdropDropCount >= 1;
    for (let i = 0; i < 60; i++) {
      this.update(0.05);
      if (this.airdrop.phase === 'landed') break;
    }
    const collected1 = this.hitTacticalAirdrop(4, 'dual_volley');
    const airdropCollected = collected1 && !this.airdrop.active && this.airdropCollectCount >= 1;
    const beforeDualCount = this.units.filter((u) => u.active && u.team === 'blue').length;
    this.state.setWeaponMode('gatling');
    this.fireTurret();
    const afterDualCount = this.units.filter((u) => u.active && u.team === 'blue').length;
    const dualVolleyActiveAndDoubles = this.dualVolleyTimer > 7.5 && afterDualCount - beforeDualCount >= 2;

    this.loadLevel(generateDynamicLevel(1));
    this.spawnTacticalAirdrop(0, 0);
    this.hitTacticalAirdrop(4, 'freeze_reds');
    const freezeRed = this.spawnUnit('red', 'normal', -5.2, 13.5, 0, 0);
    const zStart = freezeRed ? freezeRed.z : 0;
    for (let i = 0; i < 6; i++) {
      this.simulateUnits(0.05);
    }
    const zNormalMove = freezeRed ? freezeRed.speed * 0.3 : 1;
    const freezeRedsSlowed =
      this.freezeRedsTimer > 7.5 && Boolean(freezeRed && freezeRed.z - zStart < zNormalMove * 0.55);

    this.spawnUnit('blue', 'normal', 1.5, 4, 0, -6);
    this.spawnTacticalAirdrop(0, 0);
    this.hitTacticalAirdrop(4, 'frontline_giants');
    const giantCount = this.units.filter((u) => u.active && u.team === 'blue' && u.isMiniGiant).length;
    const frontlineGiantsPromoted = this.frontlineGiantsTimer > 7.5 && giantCount >= 1;

    // 4. Verify clean reset on loadLevel() and explicit skip during 25s Bonus Heist
    const bonusLvl = generateCandyVaultBonusLevel(5);
    this.loadLevel(bonusLvl);
    const cleanResetOnLoad =
      !this.airdrop.active &&
      this.dualVolleyTimer === 0 &&
      this.freezeRedsTimer === 0 &&
      this.frontlineGiantsTimer === 0 &&
      this.rainbowShotCounter === 0;
    for (let i = 0; i < 40; i++) {
      this.update(0.5);
    }
    const bonusHeistSkippedAirdrop = !this.airdrop.active && this.airdropDropCount === 0;

    this.state.setWeaponMode(prevWeapon);
    if (prevLevel) {
      this.loadLevel(prevLevel);
    }
    this.isPaused = prevPaused;

    return {
      ok:
        scatterFanCount >= 3 &&
        scatterBounced &&
        rainbowBeamHitRed &&
        airdropSpawned &&
        airdropCollected &&
        dualVolleyActiveAndDoubles &&
        freezeRedsSlowed &&
        frontlineGiantsPromoted &&
        cleanResetOnLoad &&
        bonusHeistSkippedAirdrop,
      scatterFanCount,
      scatterBounced,
      rainbowBeamHitRed,
      airdropSpawned,
      airdropCollected,
      dualVolleyActiveAndDoubles,
      freezeRedsSlowed,
      frontlineGiantsPromoted,
      bonusHeistSkippedAirdrop,
      cleanResetOnLoad,
    };
  }

  public getEscortProgressPct(): number {
    if (!this.payloadCart) return 0;
    const span = Math.max(0.01, this.payloadCart.startZ - this.payloadCart.targetZ);
    const covered = THREE.MathUtils.clamp(this.payloadCart.startZ - this.payloadCart.z, 0, span);
    return Math.round((covered / span) * 100);
  }

  public getEscortStateLabel(): string {
    const st: EscortChargeState = this.payloadCart?.chargeState || 'idle';
    if (st === 'overdrive') return '蒸汽超载冲锋';
    if (st === 'ramming') return '冲角破障中';
    if (st === 'pushing') return '护卫推进中';
    if (st === 'contested') return '红军阻截中';
    if (st === 'breached') return '已攻破要塞';
    return '待充能';
  }

  private demolishEscortBarricade(bar: EscortBarricadeRuntime): void {
    if (!bar.alive) return;
    bar.alive = false;
    bar.hp = 0;
    bar.group.visible = false;
    bar.labelEl.style.display = 'none';
    this.escortBarricadesBroken += 1;
    sound.playExplosion();
    this.triggerScreenFlash('#fbbf24', 0.48);
    this.addCameraShake(0.62);
    this.spawnSkyPillar(bar.cfg.x, bar.cfg.z, 0xf59e0b, 2.3, 0.5);
    this.spawnShockwave(bar.cfg.x, bar.cfg.z, 0xfacc15, 6.2, 0.5);
    const gold = this.state.addGold(bar.cfg.rewardGold);
    const shardRes = this.state.grantBonusSkinShards(bar.cfg.rewardShards);
    this.escortShardsEarned += shardRes.amount;
    this.spawnBurstParticles(bar.cfg.x, 1.8, bar.cfg.z, 0xfacc15, 58);
    this.spawnFloatingPopup(
      bar.cfg.x,
      2.6,
      bar.cfg.z,
      `冲碎 ${bar.cfg.name}! +${gold} 金币 · 碎片 +${shardRes.amount}`,
      '#fde047'
    );
    this.onBanner?.(
      `${UI_ART.escortCart} 冲碎 ${bar.cfg.name}！`,
      `破障赏金 +${gold} 金币 · 涂装碎片 +${shardRes.amount}`
    );
    this.state.championCharge = Math.min(100, this.state.championCharge + 35);
  }

  private updatePayloadEscort(dt: number): void {
    const cart = this.payloadCart;
    if (!cart || !cart.active) return;

    let blueNear = 0;
    let redNear = 0;
    for (let i = 0; i < MAX_UNITS; i++) {
      const u = this.units[i];
      if (!u.active) continue;
      const dx = u.x - cart.x;
      const dz = u.z - cart.z;
      if (dx * dx + dz * dz <= 21.2) {
        if (u.team === 'blue') blueNear++;
        else redNear++;
      }
    }
    cart.escortBlueCount = blueNear;
    cart.contestRedCount = redNear;

    if (blueNear > 0) {
      cart.steamCharge = Math.min(100, cart.steamCharge + (12 + blueNear * 7.5) * dt);
    } else {
      cart.steamCharge = Math.max(0, cart.steamCharge - 8.0 * dt);
    }

    let blockingBar: EscortBarricadeRuntime | null = null;
    for (const bar of this.escortBarricades) {
      if (!bar.alive) continue;
      const distAhead = cart.z - bar.cfg.z;
      if (distAhead >= -0.5 && distAhead <= 2.45) {
        blockingBar = bar;
        break;
      }
    }

    for (const bar of this.escortBarricades) {
      if (bar.hitFlash > 0) {
        bar.hitFlash = Math.max(0, bar.hitFlash - dt * 4.5);
        bar.beamGroup.position.z = -bar.hitFlash * 0.18;
      }
    }

    const speedMult = this.state.getEscortSpeedMultiplier();
    if (blockingBar) {
      cart.speed = 0;
      cart.chargeState = 'ramming';
      if (blueNear > 0 || cart.steamCharge >= 15) {
        cart.ramCooldown -= dt;
        if (cart.ramCooldown <= 0) {
          cart.ramCooldown = 0.4;
          cart.ramAnim = 1.0;
          this.escortRamCount += 1;
          const siegeMult = this.state.getSiegeDamageMultiplier();
          const overdriveMult = blueNear >= 6 || cart.steamCharge >= 80 ? 1.35 : 1.0;
          const ramDmg = (44 + blueNear * 14) * siegeMult * overdriveMult;
          blockingBar.hp = Math.max(0, blockingBar.hp - ramDmg);
          blockingBar.hitFlash = 1.0;
          this.state.runSiegePool += ramDmg;
          this.state.addGold(5);
          this.addCameraShake(0.28);
          this.spawnShockwave(cart.x, blockingBar.cfg.z + 0.6, 0xfbbf24, 3.6, 0.3);
          this.spawnBurstParticles(cart.x, 1.3, blockingBar.cfg.z + 0.5, 0xf97316, 16);
          if (blockingBar.hp <= 0 && blockingBar.alive) {
            this.demolishEscortBarricade(blockingBar);
          }
        }
      }
    } else if (blueNear === 0) {
      cart.speed = 0;
      cart.chargeState = redNear > 0 ? 'contested' : 'idle';
    } else if (redNear > blueNear + 2) {
      cart.speed = 0.55 * speedMult;
      cart.chargeState = 'contested';
    } else if (blueNear >= 6 || cart.steamCharge >= 85) {
      cart.speed = (3.9 + Math.min(1.3, blueNear * 0.1)) * speedMult;
      cart.chargeState = 'overdrive';
    } else {
      cart.speed = (1.95 + blueNear * 0.28) * speedMult;
      cart.chargeState = 'pushing';
    }

    if (cart.speed > 0) {
      cart.z = Math.max(cart.targetZ, cart.z - cart.speed * dt);
      cart.wheelPhase += cart.speed * dt * 2.2;
      for (const w of cart.wheels) {
        w.rotation.x = -cart.wheelPhase;
      }
      cart.smokeTimer += dt;
      if (cart.smokeTimer >= (cart.chargeState === 'overdrive' ? 0.1 : 0.2)) {
        cart.smokeTimer = 0;
        this.spawnBurstParticles(
          cart.x + (Math.random() - 0.5) * 0.3,
          2.85,
          cart.z - 0.45,
          cart.chargeState === 'overdrive' ? 0xfacc15 : 0xe2e8f0,
          cart.chargeState === 'overdrive' ? 4 : 2
        );
      }
    }

    if (cart.ramAnim > 0) {
      cart.ramAnim = Math.max(0, cart.ramAnim - dt * 3.8);
    }
    cart.ramPlowGroup.position.z = -1.85 - Math.sin(cart.ramAnim * Math.PI) * 0.55;
    cart.group.position.set(cart.x, Math.sin(cart.wheelPhase * 2.0) * (cart.speed > 0 ? 0.04 : 0), cart.z);

    if (cart.chargeState === 'overdrive') {
      cart.auraRingMat.color.setHex(0xfacc15);
      cart.auraRingMat.opacity = 0.72 + 0.2 * Math.sin(this.elapsedTime * 9.0);
      cart.boilerMat.emissive.setHex(0xf59e0b);
      cart.boilerMat.emissiveIntensity = 0.9;
    } else if (cart.chargeState === 'ramming') {
      cart.auraRingMat.color.setHex(0xf97316);
      cart.auraRingMat.opacity = 0.78;
      cart.boilerMat.emissive.setHex(0xea580c);
      cart.boilerMat.emissiveIntensity = 0.85;
    } else if (cart.chargeState === 'pushing') {
      cart.auraRingMat.color.setHex(0x38bdf8);
      cart.auraRingMat.opacity = 0.58;
      cart.boilerMat.emissive.setHex(0x0284c7);
      cart.boilerMat.emissiveIntensity = 0.55;
    } else if (cart.chargeState === 'contested') {
      cart.auraRingMat.color.setHex(0xf43f5e);
      cart.auraRingMat.opacity = 0.65;
      cart.boilerMat.emissive.setHex(0xbe123c);
      cart.boilerMat.emissiveIntensity = 0.45;
    } else {
      cart.auraRingMat.color.setHex(0x94a3b8);
      cart.auraRingMat.opacity = 0.34;
      cart.boilerMat.emissive.setHex(0x0369a1);
      cart.boilerMat.emissiveIntensity = 0.28;
    }

    if (cart.z <= cart.targetZ) {
      cart.chargeState = 'breached';
      cart.active = false;
      this.bossHp = 0;
      const bonusGold = this.state.addGold(this.currentLevel?.rewardGold || 1200);
      const shardBonus = this.state.grantBonusSkinShards(3);
      this.escortShardsEarned += shardBonus.amount;
      this.spawnSkyPillar(0, BOSS_GATE_Z, 0xfacc15, 3.6, 0.75);
      this.spawnShockwave(0, BOSS_GATE_Z + 1.0, 0xfacc15, 9.5, 0.68);
      this.spawnBurstParticles(0, 2.2, BOSS_GATE_Z + 1.0, 0xfacc15, 95);
      this.onBanner?.(
        `${UI_ART.escortCart} 蒸汽战车攻破终极据点！`,
        `通关重赏 +${bonusGold} 金币 · 涂装碎片 +${shardBonus.amount}`
      );
      this.finishStage(true);
    }
  }

  public runMc5SelfCheck(): {
    ok: boolean;
    barricadeCount: number;
    cartChargedAndMoved: boolean;
    overdriveReached: boolean;
    ramCount: number;
    barricadeDemolished: boolean;
    escortCompleted: boolean;
    persistedBestPct: number;
    persistedClears: number;
    finishModesApplied: number[];
    cannonHexChanged: boolean;
    cartHexChanged: boolean;
  } {
    const prevLevel = this.currentLevel;
    const prevPaused = this.isPaused;
    const prevGold = this.state.gold;
    const prevSkin = this.state.equippedSkin;
    const prevOwnedSkins = [...this.state.ownedSkins];
    const prevFinish = this.state.equippedFinish;
    const prevOwnedFinishes = [...this.state.ownedFinishes];
    const prevShards = { ...this.state.skinShards };

    this.isPaused = false;

    // 1. Test Steam Armored Payload Escort Mode (Charging, Overdrive, Barricade Ramming & Stronghold Breach)
    const escortLvl = generatePayloadEscortLevel(1);
    this.loadLevel(escortLvl);
    const barricadeCount = this.escortBarricades.length;
    const zInit = this.payloadCart ? this.payloadCart.z : 0;
    const baseSnap = this.getAppliedLiverySnapshot();

    for (let k = 0; k < 7; k++) {
      this.spawnUnit('blue', 'normal', (k - 3) * 0.45, zInit + 0.5, 0, -3.5);
    }
    for (let step = 0; step < 12; step++) {
      this.update(0.05);
    }
    const cartChargedAndMoved = Boolean(
      this.payloadCart && this.payloadCart.z < zInit - 0.5 && this.payloadCart.steamCharge > 10
    );
    const overdriveReached = Boolean(
      this.payloadCart &&
        (this.payloadCart.chargeState === 'overdrive' || this.payloadCart.steamCharge > 40)
    );

    // Move cart directly in front of Barricade #1 and verify battering-ram collision & demolition
    const firstBar = this.escortBarricades[0];
    if (this.payloadCart && firstBar) {
      for (let i = 0; i < MAX_UNITS; i++) {
        this.units[i].active = false;
      }
      firstBar.hp = 210;
      this.payloadCart.z = firstBar.cfg.z + 1.8;
      this.payloadCart.ramCooldown = 0;
      this.payloadCart.steamCharge = 90;
      for (let k = 0; k < 6; k++) {
        const bu = this.spawnUnit('blue', 'normal', (k - 2.5) * 0.45, firstBar.cfg.z + 3.8, 0, -1.2);
        if (bu) bu.dmg = 2;
      }
      for (let step = 0; step < 16; step++) {
        this.update(0.05);
      }
    }
    const ramCount = this.escortRamCount;
    const barricadeDemolished = this.escortBarricadesBroken >= 1 && Boolean(firstBar && !firstBar.alive);

    // Clear remaining barricades & advance cart to stronghold targetZ to verify completion & persistence
    for (const b of this.escortBarricades) {
      b.alive = false;
      b.group.visible = false;
    }
    if (this.payloadCart) {
      this.payloadCart.z = this.payloadCart.targetZ + 0.15;
      this.spawnUnit('blue', 'normal', 0, this.payloadCart.z + 0.2, 0, -3.0);
      this.update(0.1);
    }
    const escortCompleted = this.isStageEnded && this.lastStageVictory && this.bossHp === 0;
    const rec = this.state.recordEscortRun(100, 18.4, this.escortBarricadesBroken, escortCompleted);

    // 2. Test Bobo Squad Paint & Material Workshop (Unlock/Equip Finishes + Colorways -> 3D Unit/Cannon/Cart Materials)
    this.loadLevel(generatePayloadEscortLevel(1));
    this.state.gold = Math.max(this.state.gold, 50000);
    this.state.skinShards.azure = Math.max(this.state.skinShards.azure || 0, 15);
    const finishModesApplied: number[] = [this.getAppliedLiverySnapshot().unitFinishMode];

    this.state.buyOrEquipSkin('crimson');
    this.state.unlockOrEquipFinish('brass_steam');
    this.applySkin(this.state.getEquippedSkin());
    const brassSnap = this.getAppliedLiverySnapshot();
    finishModesApplied.push(brassSnap.unitFinishMode);

    this.state.unlockOrEquipFinish('crystal_jelly');
    this.applySkin(this.state.getEquippedSkin());
    finishModesApplied.push(this.getAppliedLiverySnapshot().unitFinishMode);

    this.state.unlockOrEquipFinish('starlight_prism');
    this.applySkin(this.state.getEquippedSkin());
    const prismSnap = this.getAppliedLiverySnapshot();
    finishModesApplied.push(prismSnap.unitFinishMode);

    const cannonHexChanged =
      brassSnap.cannonBarrelHex !== baseSnap.cannonBarrelHex &&
      prismSnap.cannonBarrelHex !== brassSnap.cannonBarrelHex;
    const cartHexChanged =
      brassSnap.cartArmorHex !== baseSnap.cartArmorHex &&
      prismSnap.cartArmorHex !== brassSnap.cartArmorHex;

    // Restore player state & level cleanly (keep escort record for milestone verification)
    this.state.gold = prevGold;
    this.state.ownedSkins = prevOwnedSkins;
    this.state.equippedSkin = prevSkin;
    this.state.ownedFinishes = prevOwnedFinishes;
    this.state.equippedFinish = prevFinish;
    this.state.skinShards = prevShards;
    this.state.save();
    if (prevLevel) {
      this.loadLevel(prevLevel);
    }
    this.applySkin(this.state.getEquippedSkin());
    this.isPaused = prevPaused;

    return {
      ok:
        barricadeCount === 4 &&
        cartChargedAndMoved &&
        overdriveReached &&
        ramCount >= 1 &&
        barricadeDemolished &&
        escortCompleted &&
        rec.bestProgressPct === 100 &&
        rec.escortClears >= 1 &&
        finishModesApplied.includes(1) &&
        finishModesApplied.includes(2) &&
        finishModesApplied.includes(3) &&
        cannonHexChanged &&
        cartHexChanged,
      barricadeCount,
      cartChargedAndMoved,
      overdriveReached,
      ramCount,
      barricadeDemolished,
      escortCompleted,
      persistedBestPct: rec.bestProgressPct,
      persistedClears: rec.escortClears,
      finishModesApplied,
      cannonHexChanged,
      cartHexChanged,
    };
  }

  public resetMechaOverlord(): void {
    if (this.mechaOverlord) {
      this.mechaOverlord.active = false;
      this.mechaOverlord.lifeTimer = 0;
      this.mechaOverlord.empOverdriveTimer = 0;
      this.mechaOverlord.leftRecoil = 0;
      this.mechaOverlord.rightRecoil = 0;
      this.mechaOverlord.meleeSwingAnim = 0;
      this.mechaOverlord.group.visible = false;
      if (this.mechaOverlord.labelEl) {
        this.mechaOverlord.labelEl.style.display = 'none';
      }
    }
    for (const s of this.mechaShells) {
      s.active = false;
      s.mesh.visible = false;
    }
  }

  public summonMechaOverlord(ignoreCharge = false): boolean {
    if (!this.mechaOverlord || this.isStageEnded) return false;
    if (!ignoreCharge && this.state.mechaOverlordCharge < 100) return false;

    this.state.mechaOverlordCharge = 0;
    const spec = this.state.getMechaOverlordSpec();
    const spawnX = THREE.MathUtils.clamp(this.turretX, -TRACK_HALF_W + 2.0, TRACK_HALF_W - 2.0);
    const spawnZ = PLAYER_Z - 3.0;

    // Combine/Fuse up to 6 nearby friendly Bobo units into the Mecha Overlord fusion core!
    let fusedCount = 0;
    for (let i = 0; i < MAX_UNITS && fusedCount < 6; i++) {
      const u = this.units[i];
      if (!u.active || u.team !== 'blue' || u.kind === 'champion') continue;
      if (Math.hypot(u.x - spawnX, u.z - spawnZ) <= 5.4) {
        u.active = false;
        fusedCount++;
        this.spawnBurstParticles(u.x, 0.85, u.z, 0x38bdf8, 8);
      }
    }

    const stageScale = Math.max(1, 1 + this.state.currentLevelIndex * 0.22);
    const fusionMult = 1 + fusedCount * spec.fusionPerUnitBonus;
    const powerMult = this.state.getPowerMultiplier();

    const mo = this.mechaOverlord;
    mo.active = true;
    mo.x = spawnX;
    mo.z = spawnZ;
    mo.maxHp = Math.round(920 * stageScale * spec.hpMult * fusionMult);
    mo.hp = mo.maxHp;
    mo.baseDmg = 46 * stageScale * powerMult * spec.shellDmgMult * fusionMult;
    mo.shellDmg = 68 * stageScale * powerMult * spec.shellDmgMult * fusionMult;
    mo.maxLifeTimer = 22.0;
    mo.lifeTimer = 22.0;
    mo.fusedSquadCount = fusedCount;
    mo.walkPhase = 0;
    mo.stompCooldown = 0.25;
    mo.volleyInterval = spec.volleyInterval;
    mo.volleyCooldown = 0.18;
    mo.volleysFired = 0;
    mo.smashesCount = 0;
    mo.empOverdriveTimer = 0;
    mo.leftRecoil = 0;
    mo.rightRecoil = 0;
    mo.meleeSwingAnim = 0;
    mo.group.position.set(spawnX, 0, spawnZ);
    mo.group.rotation.set(0, 0, 0);
    mo.group.visible = true;

    this.state.recordMechaSummon(fusedCount);
    sound.playMechaOverlordDeploy();
    this.addCameraShake(0.62);
    this.triggerScreenFlash('#38bdf8', 0.45);
    this.spawnSkyPillar(spawnX, spawnZ, 0x38bdf8, 3.2, 0.58);
    this.spawnShockwave(spawnX, spawnZ, 0xfacc15, 6.4, 0.48);
    this.spawnBurstParticles(spawnX, 1.4, spawnZ, 0x38bdf8, 42);
    this.spawnBurstParticles(spawnX, 1.8, spawnZ, 0xfacc15, 28);
    this.spawnFloatingPopup(
      spawnX,
      3.1,
      spawnZ,
      `${UI_ART.mechaOverlord} 双联重炮机甲 ${spec.mkLabel}${fusedCount > 0 ? ` · 合体×${fusedCount}` : ''}!`,
      '#fde047'
    );
    this.onBanner?.(
      `${UI_ART.mechaOverlord} 蒸汽机甲领主 ${spec.mkLabel} 合体降临！`,
      `双联重炮齐射开启${fusedCount > 0 ? ` · 融合 ${fusedCount} 名波波战力 +${Math.round(fusedCount * spec.fusionPerUnitBonus * 100)}%` : ''}`
    );
    return true;
  }

  private triggerEmpZoneDischarge(zr: ZoneRuntime): void {
    const zc = zr.cfg;
    zr.empPulseCount = (zr.empPulseCount || 0) + 1;
    const rad = Math.max(zc.width, zc.length) * 0.58;
    sound.playEmpPulse();
    this.spawnShockwave(zc.x, zc.z, 0x818cf8, rad * 1.25, 0.34);
    this.spawnBurstParticles(zc.x, 0.45, zc.z, 0x67e8f9, 14);

    for (let i = 0; i < MAX_UNITS; i++) {
      const u = this.units[i];
      if (!u.active || u.spawnHop > 0.68) continue;
      if (Math.hypot(u.x - zc.x, u.z - zc.z) <= rad) {
        if (u.team === 'red') {
          u.empTimer = Math.max(u.empTimer || 0, 1.85);
          u.vz = Math.min(u.vz, -1.8);
          const shockPct = u.kind === 'brute' || u.kind === 'shaman' ? 0.22 : 0.14;
          u.hp -= u.maxHp * shockPct;
          if (u.hp <= 0) {
            u.active = false;
            this.onUnitKilled(u);
          }
        } else if (u.frostShield) {
          // Frosting Shield cleanly absorbs EMP pulse!
          u.frostShield = false;
          this.spawnBurstParticles(u.x, 0.8, u.z, 0x7dd3fc, 8);
        } else if (u.kind !== 'champion') {
          u.empTimer = Math.max(u.empTimer || 0, 0.85);
        }
      }
    }

    if (this.bossShieldActive && Math.abs(zc.z - BOSS_GATE_Z) <= 10.5) {
      this.bossShieldHitsRemaining -= 3;
      if (this.bossShieldHitsRemaining <= 0) {
        this.shatterBossShield();
      }
    }

    if (
      this.mechaOverlord?.active &&
      Math.hypot(this.mechaOverlord.x - zc.x, this.mechaOverlord.z - zc.z) <= rad + 1.8
    ) {
      this.mechaOverlord.empOverdriveTimer = Math.max(this.mechaOverlord.empOverdriveTimer, 3.2);
      this.spawnFloatingPopup(
        this.mechaOverlord.x,
        2.9,
        this.mechaOverlord.z,
        `${UI_ART.mechaCore} 电磁吸收超频!`,
        '#67e8f9'
      );
    }
  }

  private fireMechaTwinVolley(): void {
    const mo = this.mechaOverlord;
    if (!mo || !mo.active) return;

    // Find priority target ahead: Red cluster -> Escort Barricade -> Boss Sub-Tower -> Candy Vault -> Boss Gate
    let baseTargetX = mo.x;
    let baseTargetZ = Math.max(BOSS_GATE_Z + 0.8, mo.z - 9.5);
    const redCluster = this.findDensestRedCluster(3.6, 3.6);
    if (redCluster.count > 0) {
      baseTargetX = redCluster.x;
      baseTargetZ = redCluster.z;
    } else {
      const nextBar = this.escortBarricades.find((b) => b.alive && b.cfg.z < mo.z + 1.2);
      const nextVault = this.candyVaults.find((v) => v.alive);
      const nextSub = this.bossSubTowers.find((t) => t.alive);
      if (nextBar) {
        baseTargetX = nextBar.cfg.x;
        baseTargetZ = nextBar.cfg.z;
      } else if (nextVault) {
        baseTargetX = nextVault.cfg.x;
        baseTargetZ = nextVault.cfg.z;
      } else if (nextSub) {
        baseTargetX = nextSub.cfg.x;
        baseTargetZ = nextSub.cfg.z;
      } else if (this.colossusBoss?.active && this.colossusBoss.paralysisTimer <= 0 && (this.colossusBoss.leftShieldAlive || this.colossusBoss.rightCannonAlive)) {
        if (this.colossusBoss.leftShieldAlive) {
          baseTargetX = -4.35;
          baseTargetZ = BOSS_GATE_Z + 1.85;
        } else {
          baseTargetX = 4.35;
          baseTargetZ = BOSS_GATE_Z + 1.85;
        }
      } else {
        baseTargetX = 0;
        baseTargetZ = BOSS_GATE_Z + 0.6;
      }
    }

    let spawned = 0;
    for (const side of [-1, 1] as const) {
      const slot = this.mechaShells.find((s) => !s.active);
      if (!slot) break;
      slot.active = true;
      slot.startX = mo.x + side * 0.82;
      slot.startZ = mo.z - 0.85;
      slot.x = slot.startX;
      slot.y = 2.42;
      slot.z = slot.startZ;
      slot.targetX = THREE.MathUtils.clamp(
        baseTargetX + side * 0.75,
        -TRACK_HALF_W + 0.9,
        TRACK_HALF_W - 0.9
      );
      slot.targetZ = THREE.MathUtils.clamp(baseTargetZ, BOSS_GATE_Z, PLAYER_Z - 1.0);
      slot.flightTime = 0;
      const dist = Math.hypot(slot.targetX - slot.startX, slot.targetZ - slot.startZ);
      slot.flightDuration = THREE.MathUtils.clamp(dist / 24.0, 0.2, 0.52);
      slot.dmg = mo.shellDmg;
      slot.splashRadius = 2.9;
      slot.mesh.position.set(slot.x, slot.y, slot.z);
      slot.mesh.visible = true;
      this.spawnBurstParticles(slot.startX, 2.45, slot.startZ - 0.2, 0xfacc15, 6);
      spawned++;
    }

    if (spawned > 0) {
      mo.leftRecoil = 1.0;
      mo.rightRecoil = 1.0;
      mo.volleysFired += 1;
      sound.playMechaTwinVolley();
    }
  }

  private detonateMechaShell(s: MechaShellRuntime): void {
    s.active = false;
    s.mesh.visible = false;
    const tx = s.targetX;
    const tz = s.targetZ;
    const rad = s.splashRadius;

    this.spawnShockwave(tx, tz, 0xf59e0b, rad, 0.28);
    this.spawnBurstParticles(tx, 0.7, tz, 0xfacc15, 14);
    this.spawnBurstParticles(tx, 0.9, tz, 0x38bdf8, 8);

    let smashGain = 0;

    // 1. Splash Red Units & Strip Elite Resistance
    for (let rIdx = 0; rIdx < this.activeRedIndices.length; rIdx++) {
      const red = this.units[this.activeRedIndices[rIdx]];
      if (!red.active) continue;
      const d = Math.hypot(red.x - tx, red.z - tz);
      if (d <= rad + red.radius) {
        red.empTimer = Math.max(red.empTimer || 0, 1.35);
        red.vz = Math.min(red.vz, -3.2);
        red.hp -= s.dmg * (red.kind === 'brute' ? 1.35 : 1.0);
        if (red.hp <= 0) {
          red.active = false;
          this.onUnitKilled(red);
          smashGain++;
        }
      }
    }

    // 2. Heavy Siege vs Escort Barricades
    for (const bar of this.escortBarricades) {
      if (!bar.alive) continue;
      if (Math.abs(tz - bar.cfg.z) <= rad + 0.9 && Math.abs(tx - bar.cfg.x) <= bar.cfg.width * 0.55 + rad) {
        bar.hp = Math.max(0, bar.hp - s.dmg * 1.15);
        bar.hitFlash = 1.0;
        if (bar.hp <= 0 && bar.alive) {
          this.demolishEscortBarricade(bar);
          smashGain += 2;
        }
      }
    }

    // 3. Heavy Siege vs Candy Vaults (Bonus Heist compatibility!)
    for (const v of this.candyVaults) {
      if (!v.alive) continue;
      if (Math.hypot(tx - v.cfg.x, tz - v.cfg.z) <= rad + 1.5) {
        v.hp = Math.max(0, v.hp - s.dmg * 1.1);
        v.hitFlash = 1.0;
        if (v.hp <= 0 && v.alive) {
          v.alive = false;
          v.group.visible = false;
          v.labelEl.style.display = 'none';
          this.bonusVaultsBroken += 1;
          const gold = this.state.addGold(v.cfg.rewardGold);
          const shardRes = this.state.grantBonusSkinShards(v.cfg.rewardShards);
          this.bonusHeistShardsEarned += shardRes.amount;
          this.spawnFloatingPopup(v.cfg.x, 2.6, v.cfg.z, `+${gold} 金币`, '#fde047');
          smashGain += 2;
        }
      }
    }

    // 4. Heavy Siege vs Boss Sub-Towers & Boss Gate / Void Shield
    for (const st of this.bossSubTowers) {
      if (!st.alive) continue;
      if (Math.hypot(tx - st.cfg.x, tz - st.cfg.z) <= rad + 1.6) {
        st.hp = Math.max(0, st.hp - s.dmg * 0.9);
        st.hitFlash = 1.0;
        if (st.hp <= 0 && st.alive) {
          st.alive = false;
          st.group.visible = false;
          st.labelEl.style.display = 'none';
          this.state.addGold(st.cfg.rewardGold);
          smashGain += 2;
        }
      }
    }

    if (this.colossusBoss?.active) {
      const cb = this.colossusBoss;
      if (cb.leftShieldAlive && Math.hypot(tx - -4.35, tz - (BOSS_GATE_Z + 1.85)) <= rad + 1.9) {
        this.damageColossusWeakpoint('left', s.dmg * 1.15);
        smashGain += 1;
      }
      if (cb.rightCannonAlive && Math.hypot(tx - 4.35, tz - (BOSS_GATE_Z + 1.85)) <= rad + 1.9) {
        this.damageColossusWeakpoint('right', s.dmg * 1.15);
        smashGain += 1;
      }
    }

    if (
      !this.currentLevel?.isEndlessDefense &&
      !this.currentLevel?.isPayloadEscort &&
      Math.abs(tz - BOSS_GATE_Z) <= rad + 2.2
    ) {
      if (this.bossShieldActive) {
        this.bossShieldHitsRemaining -= 4;
        smashGain += 1;
        if (this.bossShieldHitsRemaining <= 0) {
          this.shatterBossShield();
        }
      }
      const drMult = this.bossShieldActive ? 0.25 : 1.0;
      const subMult = this.getSubTowerBossDamageMultiplier();
      const colossusMult = this.colossusBoss?.active ? this.getColossusCoreDamageMultiplier() : 1.0;
      this.bossHp = Math.max(0, this.bossHp - s.dmg * 0.55 * drMult * subMult * colossusMult);
      this.state.runSiegePool += 3;
      if (this.bossHp <= 0 && !this.isStageEnded) {
        this.finishStage(true);
      }
    }

    if (smashGain > 0 && this.mechaOverlord) {
      this.mechaOverlord.smashesCount += smashGain;
      this.state.recordMechaSmashes(smashGain);
    }
  }

  private updateMechaOverlord(dt: number): void {
    // Tick Ambient Weather Particles
    if (this.currentLevel?.weatherAffix) {
      this.weatherParticleTimer += dt;
      if (this.weatherParticleTimer >= 0.24) {
        this.weatherParticleTimer = 0;
        const wx = (Math.random() - 0.5) * (TRACK_HALF_W * 1.7);
        const wz = BOSS_GATE_Z + 3 + Math.random() * (PLAYER_Z - BOSS_GATE_Z - 5);
        const wCol =
          this.currentLevel.weatherAffix.id === 'gale_tailwind'
            ? 0x67e8f9
            : this.currentLevel.weatherAffix.id === 'ion_emp_storm'
              ? 0x818cf8
              : 0xfbcfe8;
        this.spawnBurstParticles(wx, 1.6, wz, wCol, 1);
      }
    }

    // Tick In-Flight Mecha Shells even if Mecha just expired
    for (const s of this.mechaShells) {
      if (!s.active) continue;
      s.flightTime += dt;
      const t = Math.min(1, s.flightTime / Math.max(0.05, s.flightDuration));
      s.x = THREE.MathUtils.lerp(s.startX, s.targetX, t);
      s.z = THREE.MathUtils.lerp(s.startZ, s.targetZ, t);
      s.y = THREE.MathUtils.lerp(2.42, 0.45, t) + Math.sin(t * Math.PI) * 2.35;
      s.mesh.position.set(s.x, s.y, s.z);
      if (t >= 1) {
        this.detonateMechaShell(s);
        if (this.isStageEnded) return;
      }
    }

    const mo = this.mechaOverlord;
    if (!mo || !mo.active) return;

    mo.lifeTimer -= dt;
    if (mo.empOverdriveTimer > 0) {
      mo.empOverdriveTimer = Math.max(0, mo.empOverdriveTimer - dt);
    }
    if (mo.hp <= 0 || mo.lifeTimer <= 0) {
      this.spawnShockwave(mo.x, mo.z, 0x38bdf8, 4.8, 0.4);
      this.spawnBurstParticles(mo.x, 1.5, mo.z, 0xfacc15, 28);
      this.resetMechaOverlord();
      return;
    }

    // Check tailwind zone speed boost for Mecha Overlord & Payload Cart
    let zoneSpeedMult = this.currentLevel?.weatherAffix?.id === 'gale_tailwind' ? 1.15 : 1.0;
    for (const zr of this.zones) {
      if (zr.cfg.type === 'tailwind_belt') {
        if (
          Math.abs(mo.x - zr.cfg.x) <= zr.cfg.width * 0.65 &&
          Math.abs(mo.z - zr.cfg.z) <= zr.cfg.length * 0.65
        ) {
          zoneSpeedMult = Math.max(zoneSpeedMult, 1.32);
        }
        if (
          this.payloadCart?.active &&
          Math.abs(this.payloadCart.z - zr.cfg.z) <= zr.cfg.length * 0.75
        ) {
          this.payloadCart.z = Math.max(this.payloadCart.targetZ, this.payloadCart.z - 0.55 * dt);
        }
      }
    }

    // Steer gently toward priority frontline lane & march forward to BOSS_GATE_Z + 2.8
    const cluster = this.findDensestRedCluster(4.2, 4.2);
    const desiredX =
      this.currentLevel?.isPayloadEscort && this.payloadCart?.active
        ? 0
        : cluster.count > 0
          ? THREE.MathUtils.clamp(cluster.x, -TRACK_HALF_W + 2.0, TRACK_HALF_W - 2.0)
          : THREE.MathUtils.clamp(this.turretX * 0.5, -TRACK_HALF_W + 2.0, TRACK_HALF_W - 2.0);
    mo.x = THREE.MathUtils.lerp(mo.x, desiredX, Math.min(1, dt * 2.1));

    const stopZ = BOSS_GATE_Z + 2.8;
    const marchSpeed = 3.65 * zoneSpeedMult * (mo.empOverdriveTimer > 0 ? 1.2 : 1.0);
    if (mo.z > stopZ) {
      mo.z = Math.max(stopZ, mo.z - marchSpeed * dt);
    }

    // Articulated Toy-Craft Walking & Recoil Animation
    mo.walkPhase += dt * 7.2 * zoneSpeedMult;
    const legSwing = Math.sin(mo.walkPhase) * 0.42;
    mo.leftLegGroup.rotation.x = legSwing;
    mo.rightLegGroup.rotation.x = -legSwing;
    mo.pelvisGroup.position.y = 0.92 + Math.abs(Math.cos(mo.walkPhase)) * 0.08;
    mo.torsoGroup.position.y = 1.56 + Math.abs(Math.cos(mo.walkPhase)) * 0.1;
    mo.torsoGroup.rotation.z = Math.sin(mo.walkPhase) * 0.045;

    if (mo.meleeSwingAnim > 0) {
      mo.meleeSwingAnim = Math.max(0, mo.meleeSwingAnim - dt * 3.8);
      const punch = Math.sin(mo.meleeSwingAnim * Math.PI) * 0.95;
      mo.leftArmGroup.rotation.x = punch;
      mo.rightArmGroup.rotation.x = punch;
    } else {
      mo.leftArmGroup.rotation.x = -legSwing * 0.55;
      mo.rightArmGroup.rotation.x = legSwing * 0.55;
    }

    if (mo.leftRecoil > 0) mo.leftRecoil = Math.max(0, mo.leftRecoil - dt * 5.2);
    if (mo.rightRecoil > 0) mo.rightRecoil = Math.max(0, mo.rightRecoil - dt * 5.2);
    mo.leftCannonPod.position.z = 0.06 + mo.leftRecoil * 0.26;
    mo.rightCannonPod.position.z = 0.06 + mo.rightRecoil * 0.26;

    const ringPulse = 1 + Math.sin(this.elapsedTime * 6.5) * 0.08;
    mo.auraRingMesh.scale.set(ringPulse, ringPulse, 1);
    mo.auraRingMat.color.setHex(mo.empOverdriveTimer > 0 ? 0xe879f9 : 0x38bdf8);
    mo.coreMat.emissive.setHex(mo.empOverdriveTimer > 0 ? 0xd946ef : 0x06b6d4);

    mo.group.position.set(mo.x, 0, mo.z);

    // Heavy Stomp & Melee Crush vs Red Units & Escort Barricades
    mo.stompCooldown -= dt;
    if (mo.stompCooldown <= 0) {
      mo.stompCooldown = 0.42;
      let meleeSmashed = 0;
      for (let rIdx = 0; rIdx < this.activeRedIndices.length; rIdx++) {
        const red = this.units[this.activeRedIndices[rIdx]];
        if (!red.active) continue;
        if (Math.hypot(red.x - mo.x, red.z - mo.z) <= 2.35 + red.radius) {
          mo.meleeSwingAnim = 1.0;
          red.hp -= mo.baseDmg * 1.25;
          red.vz = Math.min(red.vz, -4.0);
          mo.hp = Math.max(0, mo.hp - red.dmg * 0.35);
          if (red.hp <= 0) {
            red.active = false;
            this.onUnitKilled(red);
            meleeSmashed++;
          }
        }
      }
      for (const bar of this.escortBarricades) {
        if (!bar.alive) continue;
        if (Math.abs(mo.z - bar.cfg.z) <= 2.25 && Math.abs(mo.x - bar.cfg.x) <= bar.cfg.width * 0.62) {
          mo.meleeSwingAnim = 1.0;
          bar.hp = Math.max(0, bar.hp - mo.baseDmg * 2.2);
          bar.hitFlash = 1.0;
          this.spawnShockwave(bar.cfg.x, bar.cfg.z, 0xfbbf24, 3.6, 0.26);
          if (bar.hp <= 0 && bar.alive) {
            this.demolishEscortBarricade(bar);
            meleeSmashed += 2;
          }
        }
      }
      if (meleeSmashed > 0) {
        mo.smashesCount += meleeSmashed;
        this.state.recordMechaSmashes(meleeSmashed);
      }
    }

    // Twin Heavy Brass Steam Cannon Volley
    const hasteMult = mo.empOverdriveTimer > 0 ? 1.38 : 1.0;
    mo.volleyCooldown -= dt * hasteMult;
    if (mo.volleyCooldown <= 0) {
      mo.volleyCooldown = mo.volleyInterval;
      this.fireMechaTwinVolley();
    }
  }

  public runMc6SelfCheck(): {
    ok: boolean;
    mechaSummoned: boolean;
    fusedSquadCount: number;
    mechaMarchedForward: boolean;
    volleysFired: number;
    redUnitsSmashed: boolean;
    barricadeSmashed: boolean;
    shieldStripped: boolean;
    hangarUpgradedAndPersisted: boolean;
    milestoneClaimed: boolean;
    weatherAffixesSeen: string[];
    tailwindAccelerated: boolean;
    empTelegraphedAndPulsed: boolean;
    frostingVaultedBarricadeAndBuffed: boolean;
    bonusVaultCompatible: boolean;
    escortCompatible: boolean;
  } {
    const prevLevel = this.currentLevel;
    const prevPaused = this.isPaused;
    const prevGold = this.state.gold;
    const prevShards = { ...this.state.skinShards };
    const prevCore = this.state.mechaCoreLevel;
    const prevCannon = this.state.mechaCannonLevel;
    const prevSummons = this.state.totalMechaSummons;
    const prevSmashes = this.state.totalMechaSmashes;
    const prevMilestone = this.state.claimedMechaMilestoneTier;

    this.isPaused = false;

    // 1. Verify Deterministic Weather Affixes & Bridge Hazard/Buff Zones across Stages 1..6
    const weatherSet = new Set<string>();
    for (let s = 1; s <= 6; s++) {
      const dl = generateDynamicLevel(s, 60000 + s);
      if (dl.weatherAffix?.id) weatherSet.add(dl.weatherAffix.id);
    }
    const weatherAffixesSeen = Array.from(weatherSet);

    // 2. Verify Hangar Upgrade & Persistence + Twin-Cannon Mecha Overlord Summon, Fusion, Twin Volley, Red/Shield/Barricade Smash
    this.state.gold = Math.max(this.state.gold, 25000);
    const coreBefore = this.state.mechaCoreLevel;
    const cannonBefore = this.state.mechaCannonLevel;
    const upgCoreOk = this.state.upgradeMechaCore();
    const upgCannonOk = this.state.upgradeMechaCannon();
    const savedRaw = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}');
    const hangarUpgradedAndPersisted =
      upgCoreOk &&
      upgCannonOk &&
      savedRaw.mechaCoreLevel === coreBefore + 1 &&
      savedRaw.mechaCannonLevel === cannonBefore + 1;

    const testLvl = generateDynamicLevel(5, 60606);
    this.loadLevel(testLvl);
    for (let i = 0; i < MAX_UNITS; i++) this.units[i].active = false;

    // Spawn 4 friendly Bobos near summon zone for Fusion + Red cluster ahead + Boss Void Shield active
    for (let k = 0; k < 4; k++) {
      this.spawnUnit('blue', 'normal', (k - 1.5) * 0.6, PLAYER_Z - 3.2, 0, -2.5);
    }
    for (let r = 0; r < 5; r++) {
      const ru = this.spawnUnit('red', 'normal', (r - 2) * 0.5, PLAYER_Z - 9.2, 0, 1.2);
      if (ru) {
        ru.hp = 18;
        ru.maxHp = 18;
      }
    }
    this.activateBossShieldPhase(true);
    const shieldBefore = this.bossShieldHitsRemaining;

    this.state.mechaOverlordCharge = 100;
    const mechaSummoned = this.summonMechaOverlord();
    const fusedSquadCount = this.mechaOverlord.fusedSquadCount;
    const zStart = this.mechaOverlord.z;

    for (let step = 0; step < 32; step++) {
      this.update(0.05);
    }
    // Also place Mecha Overlord within artillery range of Boss Gate to verify shield stripping
    if (this.mechaOverlord.active) {
      for (let i = 0; i < MAX_UNITS; i++) {
        if (this.units[i].team === 'red') this.units[i].active = false;
      }
      for (const st of this.bossSubTowers) st.alive = false;
      this.mechaOverlord.z = BOSS_GATE_Z + 6.5;
      this.mechaOverlord.volleyCooldown = 0;
      for (let step = 0; step < 14; step++) {
        this.update(0.05);
      }
    }

    const mechaMarchedForward = zStart - this.mechaOverlord.z > 1.2;
    const volleysFired = this.mechaOverlord.volleysFired;
    const redUnitsSmashed = this.mechaOverlord.smashesCount >= 1;
    const shieldStripped = !this.bossShieldActive || this.bossShieldHitsRemaining < shieldBefore;

    const msRes = this.state.claimMechaMilestone();
    const milestoneClaimed = msRes.claimed || this.state.claimedMechaMilestoneTier >= 1;

    // 3. Verify Tailwind Boost Belt, EMP Pulse Telegraph & Shield Strip, Frosting Bounce Pad Vault over Escort Barricade!
    const escLvl = generatePayloadEscortLevel(1);
    this.loadLevel(escLvl);
    for (let i = 0; i < MAX_UNITS; i++) this.units[i].active = false;

    // Mecha Overlord smashing an Escort Barricade
    const escBar = this.escortBarricades[0];
    if (escBar) {
      escBar.hp = 90;
      this.state.mechaOverlordCharge = 100;
      this.summonMechaOverlord();
      this.mechaOverlord.x = escBar.cfg.x;
      this.mechaOverlord.z = escBar.cfg.z + 1.5;
      this.mechaOverlord.stompCooldown = 0;
      for (let step = 0; step < 8; step++) this.update(0.05);
    }
    const barricadeSmashed = Boolean(escBar && !escBar.alive);
    this.resetMechaOverlord();

    // Tailwind Belt acceleration check
    const twZone = this.zones.find((z) => z.cfg.type === 'tailwind_belt');
    let tailwindAccelerated = false;
    if (twZone) {
      const uFast = this.spawnUnit('blue', 'normal', twZone.cfg.x, twZone.cfg.z + 0.8, 0, -3.0);
      const uNorm = this.spawnUnit('blue', 'normal', 0, twZone.cfg.z + 0.8, 0, -3.0);
      for (let step = 0; step < 8; step++) this.update(0.05);
      tailwindAccelerated = Boolean(
        uFast &&
          uNorm &&
          uFast.z < uNorm.z - 0.6 &&
          (uFast.tailwindBoostTimer || 0) > 0
      );
    }

    // EMP Zone telegraph -> pulse -> Red stagger & Blue FrostShield strip
    const empZone = this.zones.find((z) => z.cfg.type === 'emp_zone');
    let empTelegraphedAndPulsed = false;
    if (empZone) {
      empZone.empPhase = 'idle';
      empZone.empTimer = 0.02;
      this.update(0.05);
      const sawTelegraph = (empZone.empPhase as string) === 'telegraph';
      const redVictim = this.spawnUnit('red', 'brute', empZone.cfg.x, empZone.cfg.z, 0, 0.5);
      const shieldedBlue = this.spawnUnit('blue', 'normal', empZone.cfg.x + 0.4, empZone.cfg.z, 0, -1.0);
      if (shieldedBlue) shieldedBlue.frostShield = true;
      empZone.empTimer = 0.02;
      this.update(0.05);
      empTelegraphedAndPulsed = Boolean(
        sawTelegraph &&
          (empZone.empPulseCount || 0) >= 1 &&
          redVictim &&
          (redVictim.empTimer || 0) >= 1.0 &&
          shieldedBlue &&
          !shieldedBlue.frostShield
      );
    }

    // Frosting Bounce Pad vaulting cleanly over Escort Barricade #2 with Frosting Burst bonus!
    const padZone = this.zones.find((z) => z.cfg.type === 'frosting_pad');
    const bar2 = this.escortBarricades[1];
    let frostingVaultedBarricadeAndBuffed = false;
    if (padZone && bar2) {
      bar2.alive = true;
      bar2.hp = 9999;
      padZone.cfg.x = bar2.cfg.x;
      padZone.cfg.z = bar2.cfg.z + 1.1;
      const jumper = this.spawnUnit('blue', 'normal', padZone.cfg.x, padZone.cfg.z, 0, -3.2);
      for (let step = 0; step < 10; step++) this.update(0.04);
      frostingVaultedBarricadeAndBuffed = Boolean(
        jumper &&
          jumper.active &&
          jumper.z < bar2.cfg.z - 0.3 &&
          (jumper.frostingBurstTimer || 0) > 1.5 &&
          jumper.frostShield
      );
    }
    const escortCompatible = Boolean(
      escLvl.weatherAffix &&
        escLvl.zones.some((z) => z.type === 'tailwind_belt') &&
        escLvl.zones.some((z) => z.type === 'frosting_pad') &&
        this.payloadCart?.active
    );

    // 4. Verify Bonus Vault Mode graceful compatibility (tailwind + frosting pad, zero EMP hazard)
    const bonusLvl = generateCandyVaultBonusLevel(5);
    this.loadLevel(bonusLvl);
    for (let step = 0; step < 5; step++) this.update(0.05);
    const bonusVaultCompatible = Boolean(
      bonusLvl.weatherAffix?.id === 'sugar_snow_updraft' &&
        bonusLvl.zones.some((z) => z.type === 'tailwind_belt') &&
        bonusLvl.zones.some((z) => z.type === 'frosting_pad') &&
        !bonusLvl.zones.some((z) => z.type === 'emp_zone') &&
        this.candyVaults.length >= 5
    );

    // Restore player state (keep 1 summon + 1 core upgrade if fresh so UI reflects unlocked milestone/progress cleanly, or restore exact)
    this.state.gold = prevGold;
    this.state.skinShards = prevShards;
    this.state.mechaCoreLevel = Math.max(prevCore, 1);
    this.state.mechaCannonLevel = Math.max(prevCannon, 1);
    this.state.totalMechaSummons = Math.max(prevSummons, 1);
    this.state.totalMechaSmashes = Math.max(prevSmashes, 3);
    this.state.claimedMechaMilestoneTier = Math.max(prevMilestone, 1);
    this.state.save();
    if (prevLevel) {
      this.loadLevel(prevLevel);
    }
    this.applySkin(this.state.getEquippedSkin());
    this.isPaused = prevPaused;

    return {
      ok:
        mechaSummoned &&
        fusedSquadCount >= 1 &&
        mechaMarchedForward &&
        volleysFired >= 1 &&
        redUnitsSmashed &&
        barricadeSmashed &&
        shieldStripped &&
        hangarUpgradedAndPersisted &&
        milestoneClaimed &&
        weatherAffixesSeen.length === 3 &&
        tailwindAccelerated &&
        empTelegraphedAndPulsed &&
        frostingVaultedBarricadeAndBuffed &&
        bonusVaultCompatible &&
        escortCompatible,
      mechaSummoned,
      fusedSquadCount,
      mechaMarchedForward,
      volleysFired,
      redUnitsSmashed,
      barricadeSmashed,
      shieldStripped,
      hangarUpgradedAndPersisted,
      milestoneClaimed,
      weatherAffixesSeen,
      tailwindAccelerated,
      empTelegraphedAndPulsed,
      frostingVaultedBarricadeAndBuffed,
      bonusVaultCompatible,
      escortCompatible,
    };
  }

  // ===========================================================================
  // MC-7: Leader Tactical Sub-Weapon Slot & Gear Summit Tournament 3D Runtime
  // ===========================================================================

  private buildTacticalSubWeaponFx(): void {
    // 1. Electro Net 3D Cyan Wireframe Dome + Electric Ring
    const netGroup = new THREE.Group();
    netGroup.visible = false;
    const domeMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      wireframe: true,
      transparent: true,
      opacity: 0.72,
    });
    const domeMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1.0, 2), domeMat);
    domeMesh.scale.set(1, 0.45, 1);
    domeMesh.position.y = 0.28;
    netGroup.add(domeMesh);

    const netRingMat = new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    const netRing = new THREE.Mesh(new THREE.RingGeometry(0.84, 1.02, 36), netRingMat);
    netRing.rotation.x = -Math.PI / 2;
    netRing.position.y = 0.08;
    netGroup.add(netRing);
    this.scene.add(netGroup);

    this.electroNetFx = {
      active: false,
      x: 0,
      z: 0,
      radius: 6.4,
      timer: 0,
      maxTimer: 1.4,
      group: netGroup,
      domeMat,
      ringMat: netRingMat,
    };

    // 2. Syrup Bubble 3D Sticky Amber-Pink Candy Pool + Floating Glossy Bubbles
    const syrupGroup = new THREE.Group();
    syrupGroup.visible = false;
    const poolMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0xf472b6,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.28,
        roughness: 0.12,
        metalness: 0.04,
        transparent: true,
        opacity: 0.76,
      }),
      0.85
    );
    const poolDisc = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.04, 0.09, 36), poolMat);
    poolDisc.position.y = 0.05;
    syrupGroup.add(poolDisc);

    const syrupRingMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.82,
      side: THREE.DoubleSide,
    });
    const syrupRing = new THREE.Mesh(new THREE.RingGeometry(0.92, 1.06, 36), syrupRingMat);
    syrupRing.rotation.x = -Math.PI / 2;
    syrupRing.position.y = 0.1;
    syrupGroup.add(syrupRing);

    const bubbleMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0xf9a8d4,
        emissive: 0xf472b6,
        emissiveIntensity: 0.35,
        roughness: 0.08,
        metalness: 0.05,
        transparent: true,
        opacity: 0.82,
      }),
      0.9
    );
    const bubbleGeo = new THREE.SphereGeometry(0.14, 14, 12);
    const bubbles: THREE.Mesh[] = [];
    for (let b = 0; b < 7; b++) {
      const bm = new THREE.Mesh(bubbleGeo, bubbleMat);
      const ang = (b / 7) * Math.PI * 2;
      const rad = b === 0 ? 0.0 : 0.56;
      bm.position.set(Math.cos(ang) * rad, 0.18 + (b % 3) * 0.06, Math.sin(ang) * rad);
      syrupGroup.add(bm);
      bubbles.push(bm);
    }
    this.scene.add(syrupGroup);

    this.syrupZone = {
      active: false,
      x: 0,
      z: 0,
      radius: 6.2,
      timer: 0,
      maxTimer: 6.5,
      slowFactor: 0.38,
      vulnMult: 1.32,
      group: syrupGroup,
      poolMat,
      ringMat: syrupRingMat,
      bubbles,
    };

    // 3. Rally Horn 3D Golden Fanfare Double Ring Aura
    const rallyGroup = new THREE.Group();
    rallyGroup.visible = false;
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide,
    });
    const outerRing = new THREE.Mesh(new THREE.RingGeometry(0.88, 1.02, 40), outerRingMat);
    outerRing.rotation.x = -Math.PI / 2;
    outerRing.position.y = 0.09;
    rallyGroup.add(outerRing);

    const innerRingMat = new THREE.MeshBasicMaterial({
      color: 0xfde68a,
      transparent: true,
      opacity: 0.52,
      side: THREE.DoubleSide,
    });
    const innerRing = new THREE.Mesh(new THREE.RingGeometry(0.48, 0.58, 32), innerRingMat);
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.y = 0.11;
    rallyGroup.add(innerRing);
    this.scene.add(rallyGroup);

    this.rallyAuraFx = {
      active: false,
      timer: 0,
      maxTimer: 5.8,
      radius: 7.5,
      moveSpeedMult: 1.35,
      attackRateMult: 1.32,
      anchorX: 0,
      anchorZ: 4.0,
      group: rallyGroup,
      outerRingMat,
      innerRingMat,
    };
  }

  public resetTacticalSubWeapons(refillCharge = true): void {
    if (refillCharge) {
      this.state.subWeaponCharge = 100;
    }
    if (this.electroNetFx) {
      this.electroNetFx.active = false;
      this.electroNetFx.timer = 0;
      this.electroNetFx.group.visible = false;
    }
    if (this.syrupZone) {
      this.syrupZone.active = false;
      this.syrupZone.timer = 0;
      this.syrupZone.group.visible = false;
    }
    if (this.rallyAuraFx) {
      this.rallyAuraFx.active = false;
      this.rallyAuraFx.timer = 0;
      this.rallyAuraFx.group.visible = false;
    }
  }

  public triggerTacticalSubWeapon(
    forceId?: TacticalSubWeaponId,
    ignoreCharge = false
  ): boolean {
    if (this.isStageEnded) return false;
    if (!ignoreCharge && (this.isPaused || this.state.subWeaponCharge < 100)) {
      return false;
    }

    const swId = forceId || this.state.equippedSubWeapon;
    const uiSpec = this.state.getSubWeaponSpec(swId);
    const combat = this.state.getSubWeaponCombatSpec(swId);

    if (!ignoreCharge) {
      this.state.subWeaponCharge = 0;
    }
    this.state.recordSubWeaponCast();

    if (swId === 'electro_net') {
      sound.playElectroNetBurst();
      const cluster = this.findDensestRedCluster(combat.radius, combat.radius);
      const targetX = cluster.count > 0 ? cluster.x : 0;
      const targetZ = cluster.count > 0 ? cluster.z : BOSS_GATE_Z + 4.8;

      this.electroNetFx.active = true;
      this.electroNetFx.x = targetX;
      this.electroNetFx.z = targetZ;
      this.electroNetFx.radius = combat.radius;
      this.electroNetFx.maxTimer = Math.min(2.2, combat.durationSec * 0.55);
      this.electroNetFx.timer = this.electroNetFx.maxTimer;
      this.electroNetFx.group.position.set(targetX, 0, targetZ);
      this.electroNetFx.group.scale.set(combat.radius, combat.radius * 0.48, combat.radius);
      this.electroNetFx.group.visible = true;

      this.spawnSkyPillar(targetX, targetZ, 0x22d3ee, 2.5, 0.52);
      this.spawnShockwave(targetX, targetZ, 0x22d3ee, combat.radius * 1.15, 0.48);
      this.spawnBurstParticles(targetX, 1.2, targetZ, 0x22d3ee, 42);
      this.spawnCombatLight(targetX, 2.8, targetZ, 0x22d3ee, 7.0, 16.0, 0.45);
      this.addCameraShake(0.45);

      let stunnedCount = 0;
      const rSq = combat.radius * combat.radius;
      for (let i = 0; i < MAX_UNITS; i++) {
        const u = this.units[i];
        if (!u.active || u.team !== 'red') continue;
        const dSq = (u.x - targetX) ** 2 + (u.z - targetZ) ** 2;
        if (dSq <= rSq) {
          u.electroNetTimer = Math.max(u.electroNetTimer || 0, combat.durationSec);
          u.empTimer = Math.max(u.empTimer || 0, combat.durationSec * 0.65);
          u.hp -= combat.burstDmg;
          u.vz = Math.min(0, u.vz - 1.4);
          stunnedCount++;
          if (u.hp <= 0) {
            u.active = false;
            this.onUnitKilled(u);
          }
        }
      }

      // Strip Boss Tower Shield & Sub-Tower Shields!
      let strippedShield = false;
      if (this.bossShieldActive) {
        this.bossShieldHitsRemaining -= combat.shieldStripHits;
        strippedShield = true;
        if (this.bossShieldHitsRemaining <= 0) {
          this.shatterBossShield();
        } else {
          this.spawnShockwave(0, BOSS_GATE_Z + 1.2, 0x22d3ee, 9.5, 0.42);
        }
      }
      for (const st of this.bossSubTowers) {
        if (!st.alive) continue;
        const stripRatio = 0.26 + combat.level * 0.05;
        st.hp = Math.max(0, st.hp - st.maxHp * stripRatio);
        st.hitFlash = 1.0;
        strippedShield = true;
        this.spawnBurstParticles(st.cfg.x, 1.8, st.cfg.z, 0x22d3ee, 16);
        if (st.hp <= 0) {
          this.destroyBossSubTower(st);
        }
      }
      if (this.colossusBoss?.active) {
        const cb = this.colossusBoss;
        const stripRatio = 0.24 + combat.level * 0.04;
        if (cb.leftShieldAlive) {
          this.damageColossusWeakpoint('left', cb.leftShieldMaxHp * stripRatio);
          strippedShield = true;
        }
        if (cb.rightCannonAlive) {
          this.damageColossusWeakpoint('right', cb.rightCannonMaxHp * stripRatio);
          strippedShield = true;
        }
      }

      const subInfo = strippedShield
        ? `麻痹 ${stunnedCount} 敌 · 剥离护盾 -${combat.shieldStripHits} 层!`
        : `电弧网麻痹减速 ${stunnedCount} 名红军 (${combat.durationSec}s)`;
      this.spawnFloatingPopup(targetX, 2.2, targetZ, `${uiSpec.name} Lv.${combat.level}!`, '#22d3ee');
      this.onBanner?.(`${uiSpec.name} · 电弧破盾爆发！`, subInfo);
      return true;
    }

    if (swId === 'syrup_bubble') {
      sound.playSyrupBubblePop();
      const cluster = this.findDensestRedCluster(combat.radius, combat.radius);
      const targetX = cluster.count > 0 ? cluster.x : 0;
      const targetZ = cluster.count > 0 ? THREE.MathUtils.clamp(cluster.z, -14.0, 12.0) : -3.5;

      this.syrupZone.active = true;
      this.syrupZone.x = targetX;
      this.syrupZone.z = targetZ;
      this.syrupZone.radius = combat.radius;
      this.syrupZone.maxTimer = combat.durationSec;
      this.syrupZone.timer = combat.durationSec;
      this.syrupZone.slowFactor = combat.slowFactor;
      this.syrupZone.vulnMult = combat.vulnMult;
      this.syrupZone.group.position.set(targetX, 0, targetZ);
      this.syrupZone.group.scale.set(combat.radius, 1, combat.radius);
      this.syrupZone.group.visible = true;

      this.spawnShockwave(targetX, targetZ, 0xf472b6, combat.radius * 1.1, 0.5);
      this.spawnBurstParticles(targetX, 1.0, targetZ, 0xf472b6, 36);
      this.spawnBurstParticles(targetX, 1.2, targetZ, 0xfbbf24, 18);
      this.addCameraShake(0.32);

      const rSq = combat.radius * combat.radius;
      let soaked = 0;
      for (let i = 0; i < MAX_UNITS; i++) {
        const u = this.units[i];
        if (!u.active || u.team !== 'red') continue;
        if ((u.x - targetX) ** 2 + (u.z - targetZ) ** 2 <= rSq) {
          u.syrupSlowTimer = Math.max(u.syrupSlowTimer || 0, 0.65);
          u.syrupVulnMult = combat.vulnMult;
          u.hp -= combat.burstDmg;
          soaked++;
          if (u.hp <= 0) {
            u.active = false;
            this.onUnitKilled(u);
          }
        }
      }

      const vulnPct = Math.round((combat.vulnMult - 1) * 100);
      this.spawnFloatingPopup(targetX, 2.2, targetZ, `${uiSpec.name} · 易伤+${vulnPct}%!`, '#f472b6');
      this.onBanner?.(
        `${uiSpec.name} · 黏稠糖浆区铺开！`,
        `笼罩 ${soaked} 名红军 · 移速大幅迟滞且承受伤害 +${vulnPct}%`
      );
      return true;
    }

    // rally_horn: Golden Fanfare Aura around leading Champion / Blue Squad
    sound.playRallyHornFanfare();
    let anchorX = this.turretX;
    let anchorZ = 4.5;
    let foundChamp = false;
    let sumX = 0;
    let sumZ = 0;
    let bCount = 0;
    for (let i = 0; i < MAX_UNITS; i++) {
      const u = this.units[i];
      if (!u.active || u.team !== 'blue') continue;
      if (u.kind === 'champion' && !foundChamp) {
        anchorX = u.x;
        anchorZ = u.z;
        foundChamp = true;
      }
      sumX += u.x;
      sumZ += u.z;
      bCount++;
      u.spawnHop = Math.max(u.spawnHop, 0.55);
    }
    if (!foundChamp && bCount > 0) {
      anchorX = sumX / bCount;
      anchorZ = sumZ / bCount;
    }

    this.rallyAuraFx.active = true;
    this.rallyAuraFx.maxTimer = combat.durationSec;
    this.rallyAuraFx.timer = combat.durationSec;
    this.rallyAuraFx.radius = combat.radius;
    this.rallyAuraFx.moveSpeedMult = combat.moveSpeedMult;
    this.rallyAuraFx.attackRateMult = combat.attackRateMult;
    this.rallyAuraFx.anchorX = anchorX;
    this.rallyAuraFx.anchorZ = anchorZ;
    this.rallyAuraFx.group.position.set(anchorX, 0, anchorZ);
    this.rallyAuraFx.group.scale.set(combat.radius * 0.72, 1, combat.radius * 0.72);
    this.rallyAuraFx.group.visible = true;

    this.spawnSkyPillar(anchorX, anchorZ, 0xfacc15, 2.4, 0.52);
    this.spawnShockwave(anchorX, anchorZ, 0xfacc15, combat.radius * 1.15, 0.52);
    this.spawnBurstParticles(anchorX, 1.3, anchorZ, 0xfacc15, 44);
    this.spawnCombatLight(anchorX, 2.6, anchorZ, 0xfacc15, 6.5, 16.0, 0.45);
    this.addCameraShake(0.36);

    const movePct = Math.round((combat.moveSpeedMult - 1) * 100);
    const atkPct = Math.round((combat.attackRateMult - 1) * 100);
    this.spawnFloatingPopup(anchorX, 2.3, anchorZ, `${uiSpec.name} · 攻移双增!`, '#facc15');
    this.onBanner?.(
      `${uiSpec.name} · 黄金冲锋号角吹响！`,
      `全军移速 +${movePct}% · 领队/波波团/炮台攻速 +${atkPct}% (${combat.durationSec}s)`
    );
    return true;
  }

  private updateTacticalSubWeapons(dt: number): void {
    // 1. Electro Net 3D Dome Fade & Electric Sparks
    if (this.electroNetFx?.active) {
      this.electroNetFx.timer -= dt;
      if (this.electroNetFx.timer <= 0) {
        this.electroNetFx.active = false;
        this.electroNetFx.group.visible = false;
      } else {
        const prog = this.electroNetFx.timer / Math.max(0.1, this.electroNetFx.maxTimer);
        this.electroNetFx.group.rotation.y += dt * 3.8;
        this.electroNetFx.domeMat.opacity = 0.25 + prog * 0.52;
        this.electroNetFx.ringMat.opacity = 0.3 + prog * 0.55;
        if (Math.random() < dt * 10) {
          const ang = Math.random() * Math.PI * 2;
          const r = Math.random() * this.electroNetFx.radius * 0.85;
          this.spawnBurstParticles(
            this.electroNetFx.x + Math.cos(ang) * r,
            0.55,
            this.electroNetFx.z + Math.sin(ang) * r,
            0x22d3ee,
            2
          );
        }
      }
    }

    // 2. Syrup Bubble Sticky Zone Continuous Slow + Damage Amplification
    if (this.syrupZone?.active) {
      this.syrupZone.timer -= dt;
      if (this.syrupZone.timer <= 0) {
        this.syrupZone.active = false;
        this.syrupZone.group.visible = false;
      } else {
        const fade = Math.min(1, this.syrupZone.timer / 0.8);
        this.syrupZone.poolMat.opacity = 0.72 * fade;
        this.syrupZone.ringMat.opacity = (0.58 + 0.22 * Math.sin(this.elapsedTime * 6)) * fade;
        for (let b = 0; b < this.syrupZone.bubbles.length; b++) {
          const bm = this.syrupZone.bubbles[b];
          const s = 0.85 + 0.28 * Math.sin(this.elapsedTime * 5.2 + b * 1.3);
          bm.scale.set(s, s, s);
          bm.position.y = 0.16 + Math.abs(Math.sin(this.elapsedTime * 3.6 + b)) * 0.16;
        }
        const rSq = this.syrupZone.radius * this.syrupZone.radius;
        for (let i = 0; i < this.activeRedIndices.length; i++) {
          const ru = this.units[this.activeRedIndices[i]];
          if (!ru || !ru.active) continue;
          if ((ru.x - this.syrupZone.x) ** 2 + (ru.z - this.syrupZone.z) ** 2 <= rSq) {
            ru.syrupSlowTimer = Math.max(ru.syrupSlowTimer || 0, 0.35);
            ru.syrupVulnMult = Math.max(ru.syrupVulnMult || 1, this.syrupZone.vulnMult);
          }
        }
      }
    }

    // 3. Rally Horn Golden Aura Tracking Leading Champion / Squad
    if (this.rallyAuraFx?.active) {
      this.rallyAuraFx.timer -= dt;
      if (this.rallyAuraFx.timer <= 0) {
        this.rallyAuraFx.active = false;
        this.rallyAuraFx.group.visible = false;
      } else {
        let targetX = this.turretX;
        let targetZ = 5.0;
        let hasChamp = false;
        let sx = 0;
        let sz = 0;
        let cnt = 0;
        for (let i = 0; i < this.activeBlueIndices.length; i++) {
          const bu = this.units[this.activeBlueIndices[i]];
          if (!bu || !bu.active) continue;
          if (bu.kind === 'champion' && !hasChamp) {
            targetX = bu.x;
            targetZ = bu.z;
            hasChamp = true;
          }
          sx += bu.x;
          sz += bu.z;
          cnt++;
        }
        if (!hasChamp && cnt > 0) {
          targetX = sx / cnt;
          targetZ = sz / cnt;
        }
        this.rallyAuraFx.anchorX = THREE.MathUtils.lerp(
          this.rallyAuraFx.anchorX,
          targetX,
          Math.min(1, dt * 8)
        );
        this.rallyAuraFx.anchorZ = THREE.MathUtils.lerp(
          this.rallyAuraFx.anchorZ,
          targetZ,
          Math.min(1, dt * 8)
        );
        this.rallyAuraFx.group.position.set(this.rallyAuraFx.anchorX, 0, this.rallyAuraFx.anchorZ);
        this.rallyAuraFx.group.rotation.y += dt * 2.8;
        const fade = Math.min(1, this.rallyAuraFx.timer / 0.8);
        const pulse = 1 + 0.05 * Math.sin(this.elapsedTime * 7.5);
        const baseScale = this.rallyAuraFx.radius * 0.72 * pulse;
        this.rallyAuraFx.group.scale.set(baseScale, 1, baseScale);
        this.rallyAuraFx.outerRingMat.opacity = 0.76 * fade;
        this.rallyAuraFx.innerRingMat.opacity = 0.48 * fade;
        if (Math.random() < dt * 7) {
          this.spawnBurstParticles(
            this.rallyAuraFx.anchorX + (Math.random() - 0.5) * 3.2,
            0.5,
            this.rallyAuraFx.anchorZ + (Math.random() - 0.5) * 3.2,
            0xfacc15,
            1
          );
        }
      }
    }
  }

  public runMc7SelfCheck(): {
    ok: boolean;
    ladderStagesDistinct: boolean;
    streakMultipliers: number[];
    chestClaimedAll3: boolean;
    trophiesPersisted: boolean;
    globalFireRateBoosted: boolean;
    globalPowerBoosted: boolean;
    workbenchUpgradedLv5: boolean;
    electroNetStunnedAndStrippedShield: boolean;
    syrupBubbleSlowedAndAmplifiedDamage: boolean;
    rallyHornBoostedMoveAndAttack: boolean;
  } {
    const prevPaused = this.isPaused;
    const prevLevel = this.currentLevel;
    const prevGold = this.state.gold;
    const prevShards = { ...this.state.skinShards };
    const prevEquippedSw = this.state.equippedSubWeapon;
    const prevSwLevels = { ...this.state.subWeaponLevels };
    const prevSwCasts = this.state.totalSubWeaponCasts;
    const prevTrnStage = this.state.tournamentStage;
    const prevTrnStreak = this.state.tournamentWinStreak;
    const prevTrnCup = this.state.tournamentCupTier;
    const prevTrnTrophies = this.state.tournamentTrophies;
    const prevTrnBricks = this.state.tournamentBricks;
    const prevPendingChest = this.state.pendingTournamentChestStage;
    const prevChestsClaimed = this.state.tournamentChestsClaimed;

    this.isPaused = false;

    // 1. Verify 3-stage Gear Summit Tournament escalating ladder, Streak Multiplier Chests & Trophy Global Boosts
    this.state.tournamentStage = 1;
    this.state.tournamentWinStreak = 0;
    this.state.tournamentCupTier = 1;
    this.state.tournamentTrophies = 0;
    this.state.tournamentBricks = 0;
    this.state.pendingTournamentChestStage = 0;
    const baseFireRate = this.state.getFireRatePerSec();
    const basePower = this.state.getPowerMultiplier();

    const tLvl1 = generateGearTournamentLevel(1, 1);
    const tLvl2 = generateGearTournamentLevel(2, 1);
    const tLvl3 = generateGearTournamentLevel(3, 1);
    const ladderStagesDistinct = Boolean(
      tLvl1.isGearTournament &&
        tLvl2.isGearTournament &&
        tLvl3.isGearTournament &&
        tLvl1.tournamentStageTitle === '第 1/3 战 · 铜齿预赛' &&
        tLvl2.tournamentStageTitle === '第 2/3 战 · 银齿半决赛' &&
        tLvl3.tournamentStageTitle === '第 3/3 战 · 金齿巅峰决战' &&
        tLvl1.bossMaxHp < tLvl2.bossMaxHp &&
        tLvl2.bossMaxHp < tLvl3.bossMaxHp &&
        tLvl1.themeId !== tLvl2.themeId &&
        tLvl2.themeId !== tLvl3.themeId &&
        tLvl2.bossSubTowers.length === 2 &&
        tLvl3.bossSubTowers.length === 2
    );

    const streakMultipliers = [
      tLvl1.tournamentStreakMult || 0,
      tLvl2.tournamentStreakMult || 0,
      tLvl3.tournamentStreakMult || 0,
    ];

    const res1 = this.state.recordTournamentMatchResult(true, 1);
    const claim1 = this.state.claimTournamentStreakChest();
    const stageAfter1: number = this.state.tournamentStage;

    const res2 = this.state.recordTournamentMatchResult(true, 2);
    const claim2 = this.state.claimTournamentStreakChest();
    const stageAfter2: number = this.state.tournamentStage;

    const res3 = this.state.recordTournamentMatchResult(true, 3);
    const claim3 = this.state.claimTournamentStreakChest();
    const stageAfter3: number = this.state.tournamentStage;

    const chestClaimedAll3 = Boolean(
      res1.unlockedChestStage === 1 &&
        claim1.claimed &&
        stageAfter1 === 2 &&
        res2.unlockedChestStage === 2 &&
        claim2.claimed &&
        stageAfter2 === 3 &&
        res3.unlockedChestStage === 3 &&
        res3.cupCompleted &&
        claim3.claimed &&
        stageAfter3 === 1 &&
        claim1.coinsAwarded < claim2.coinsAwarded &&
        claim2.coinsAwarded < claim3.coinsAwarded &&
        claim3.bricksAwarded > 0 &&
        claim3.cardsAwarded > 0 &&
        this.state.tournamentTrophies >= 80
    );

    const rawSavedAfterTrn = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}') as {
      tournamentTrophies?: number;
      tournamentBricks?: number;
    };
    const trophiesPersisted = Boolean(
      (rawSavedAfterTrn.tournamentTrophies || 0) === this.state.tournamentTrophies &&
        (rawSavedAfterTrn.tournamentBricks || 0) === this.state.tournamentBricks
    );
    const globalFireRateBoosted = this.state.getFireRatePerSec() > baseFireRate * 1.04;
    const globalPowerBoosted = this.state.getPowerMultiplier() > basePower * 1.06;

    // 2. Verify Tactical Sub-Weapon Workbench Lv.1 -> Lv.5 upgrades & equip persistence
    this.state.gold = 999999;
    this.state.subWeaponLevels = { electro_net: 1, syrup_bubble: 1, rally_horn: 1 };
    let upgradedAll = true;
    for (const swId of ['electro_net', 'syrup_bubble', 'rally_horn'] as TacticalSubWeaponId[]) {
      const cdLv1 = this.state.getSubWeaponCombatSpec(swId).cooldownSec;
      for (let step = 0; step < 4; step++) {
        if (!this.state.upgradeSubWeapon(swId)) upgradedAll = false;
      }
      const cdLv5 = this.state.getSubWeaponCombatSpec(swId).cooldownSec;
      if (this.state.getSubWeaponLevel(swId) !== 5 || cdLv5 >= cdLv1) {
        upgradedAll = false;
      }
    }
    this.state.equipSubWeapon('syrup_bubble');
    const savedWorkbench = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}') as {
      equippedSubWeapon?: string;
      subWeaponLevels?: Record<string, number>;
    };
    const workbenchUpgradedLv5 = Boolean(
      upgradedAll &&
        savedWorkbench.equippedSubWeapon === 'syrup_bubble' &&
        savedWorkbench.subWeaponLevels?.electro_net === 5 &&
        savedWorkbench.subWeaponLevels?.syrup_bubble === 5 &&
        savedWorkbench.subWeaponLevels?.rally_horn === 5
    );

    // 3A. Verify Electro Net (`electro_net`) in live 3D simulation: AoE stun/slow + tower & sub-tower shield strip
    this.loadLevel(tLvl2);
    for (const u of this.units) u.active = false;
    const redNetTarget = this.spawnUnit('red', 'brute', 0, -4.0, 0, 3.2);
    if (redNetTarget) {
      redNetTarget.maxHp = 9999;
      redNetTarget.hp = 9999;
    }
    this.activateBossShieldPhase(true);
    const shieldHitsBefore = this.bossShieldHitsRemaining;
    const subHpBefore = this.bossSubTowers[0]?.hp || 0;
    this.state.equipSubWeapon('electro_net');
    this.state.subWeaponCharge = 100;
    const firedNet = this.triggerTacticalSubWeapon('electro_net');
    const subHpAfter = this.bossSubTowers[0]?.hp || 0;
    const electroNetStunnedAndStrippedShield = Boolean(
      firedNet &&
        redNetTarget &&
        (redNetTarget.electroNetTimer || 0) >= 3.0 &&
        (!this.bossShieldActive || this.bossShieldHitsRemaining < shieldHitsBefore) &&
        subHpAfter < subHpBefore
    );

    // 3B. Verify Syrup Bubble (`syrup_bubble`) in live 3D simulation: sticky slow + damage taken amplification
    this.loadLevel(tLvl1);
    for (const u of this.units) u.active = false;
    const redSyruped = this.spawnUnit('red', 'brute', -3.0, -3.0, 0, 3.2);
    const redControl = this.spawnUnit('red', 'brute', 5.8, -3.0, 0, 3.2);
    if (redSyruped && redControl) {
      redSyruped.maxHp = 5000;
      redSyruped.hp = 5000;
      redControl.maxHp = 5000;
      redControl.hp = 5000;
    }
    // Deploy syrup bubble directly on redSyruped (by temporarily deactivating control so cluster centers on -3,-3)
    if (redControl) redControl.active = false;
    this.state.equipSubWeapon('syrup_bubble');
    this.state.subWeaponCharge = 100;
    const firedSyrup = this.triggerTacticalSubWeapon('syrup_bubble');
    if (redControl) {
      redControl.active = true;
      redControl.hp = 5000;
      if (redSyruped) redSyruped.hp = 5000;
    }
    for (let step = 0; step < 8; step++) this.update(0.05);
    const slowedAdvance = Boolean(redSyruped && redControl && redSyruped.z < redControl.z - 0.35);

    // Compare melee strike damage on syruped vs control red unit
    let amplifiedDamage = false;
    if (redSyruped && redControl) {
      redSyruped.hp = 5000;
      redControl.hp = 5000;
      const blueA = this.spawnUnit('blue', 'normal', redSyruped.x, redSyruped.z + 0.4, 0, 0);
      const blueB = this.spawnUnit('blue', 'normal', redControl.x, redControl.z + 0.4, 0, 0);
      if (blueA && blueB) {
        blueA.dmg = 100;
        blueB.dmg = 100;
        blueA.attackCooldown = 0;
        blueB.attackCooldown = 0;
        this.simulateUnits(0.05);
        const dmgOnSyruped = 5000 - redSyruped.hp;
        const dmgOnControl = 5000 - redControl.hp;
        amplifiedDamage = dmgOnSyruped > dmgOnControl * 1.25;
      }
    }
    const syrupBubbleSlowedAndAmplifiedDamage = Boolean(firedSyrup && slowedAdvance && amplifiedDamage);

    // 3C. Verify Rally Horn (`rally_horn`) in live 3D simulation: boosts Blue move speed + attack/fire rate
    this.loadLevel(tLvl1);
    for (const u of this.units) u.active = false;
    for (const z of this.zones) z.cfg.x = 99; // move zones off-lane for pure speed comparison
    const blueBase = this.spawnUnit('blue', 'normal', 0, 8.0, 0, -4.5);
    for (let step = 0; step < 10; step++) this.update(0.05);
    const baseDistMoved = blueBase ? 8.0 - blueBase.z : 0;

    for (const u of this.units) u.active = false;
    const blueRallied = this.spawnUnit('blue', 'normal', 0, 8.0, 0, -4.5);
    const champAnchor = this.spawnUnit('blue', 'champion', 0, 6.0, 0, -4.5);
    this.state.equipSubWeapon('rally_horn');
    this.state.subWeaponCharge = 100;
    const firedHorn = this.triggerTacticalSubWeapon('rally_horn');
    const auraAtkMult = this.rallyAuraFx.attackRateMult;
    for (let step = 0; step < 10; step++) this.update(0.05);
    const ralliedDistMoved = blueRallied ? 8.0 - blueRallied.z : 0;
    const rallyHornBoostedMoveAndAttack = Boolean(
      firedHorn &&
        champAnchor &&
        this.rallyAuraFx.active &&
        auraAtkMult >= 1.5 &&
        ralliedDistMoved > baseDistMoved * 1.22
    );

    // Restore player state cleanly
    this.state.gold = prevGold;
    this.state.skinShards = prevShards;
    this.state.equippedSubWeapon = prevEquippedSw;
    this.state.subWeaponLevels = prevSwLevels;
    this.state.totalSubWeaponCasts = Math.max(prevSwCasts, 3);
    this.state.tournamentStage = prevTrnStage;
    this.state.tournamentWinStreak = prevTrnStreak;
    this.state.tournamentCupTier = prevTrnCup;
    this.state.tournamentTrophies = prevTrnTrophies;
    this.state.tournamentBricks = prevTrnBricks;
    this.state.pendingTournamentChestStage = prevPendingChest;
    this.state.tournamentChestsClaimed = prevChestsClaimed;
    this.state.save();
    if (prevLevel) {
      this.loadLevel(prevLevel);
    }
    this.applySkin(this.state.getEquippedSkin());
    this.isPaused = prevPaused;

    return {
      ok:
        ladderStagesDistinct &&
        streakMultipliers[0] === 1.5 &&
        streakMultipliers[1] === 2.2 &&
        streakMultipliers[2] === 3.5 &&
        chestClaimedAll3 &&
        trophiesPersisted &&
        globalFireRateBoosted &&
        globalPowerBoosted &&
        workbenchUpgradedLv5 &&
        electroNetStunnedAndStrippedShield &&
        syrupBubbleSlowedAndAmplifiedDamage &&
        rallyHornBoostedMoveAndAttack,
      ladderStagesDistinct,
      streakMultipliers,
      chestClaimedAll3,
      trophiesPersisted,
      globalFireRateBoosted,
      globalPowerBoosted,
      workbenchUpgradedLv5,
      electroNetStunnedAndStrippedShield,
      syrupBubbleSlowedAndAmplifiedDamage,
      rallyHornBoostedMoveAndAttack,
    };
  }

  // ============================================================================
  // MC-8: Giant Clockwork Toy Colossus Boss Raid & Bobo 3-Branch Tech Tree
  // ============================================================================

  private buildClockworkColossus(level: LevelConfig): void {
    const rootGroup = new THREE.Group();
    rootGroup.position.set(0, 0, BOSS_GATE_Z + 0.35);
    rootGroup.scale.setScalar(0.58);

    const crimsonLacquerMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0xdc2626,
        emissive: 0x450a0a,
        emissiveIntensity: 0.18,
        roughness: 0.2,
        metalness: 0.14,
      }),
      0.84
    );
    const royalBlueLacquerMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0x1d4ed8,
        emissive: 0x172554,
        emissiveIntensity: 0.2,
        roughness: 0.2,
        metalness: 0.18,
      }),
      0.84
    );
    const brassClockworkMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0x78350f,
        emissiveIntensity: 0.24,
        roughness: 0.22,
        metalness: 0.72,
      }),
      0.8
    );
    const creamWoodMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0xfde68a,
        roughness: 0.3,
        metalness: 0.06,
      }),
      0.86
    );
    const whitePlumeMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0xfefce8,
        roughness: 0.24,
        metalness: 0.04,
      }),
      0.88
    );
    const darkBootMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.32,
        metalness: 0.35,
      }),
      0.8
    );
    const candyPinkMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0xf472b6,
        emissive: 0x831843,
        emissiveIntensity: 0.28,
        roughness: 0.16,
        metalness: 0.18,
      }),
      0.85
    );
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf97316,
      emissiveIntensity: 0.95,
      roughness: 0.12,
      metalness: 0.28,
    });

    // Ornate Brass Clockwork Pedestal & Toy Boots
    const basePlinth = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 5.1, 0.62, 28), brassClockworkMat);
    basePlinth.position.set(0, 0.31, 0.55);
    rootGroup.add(basePlinth);

    const baseVelvet = new THREE.Mesh(new THREE.CylinderGeometry(4.1, 4.35, 0.28, 28), crimsonLacquerMat);
    baseVelvet.position.set(0, 0.72, 0.55);
    rootGroup.add(baseVelvet);

    for (const side of [-1, 1]) {
      const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.92, 1.85, 14), darkBootMat);
      boot.position.set(side * 1.38, 1.65, 0.65);
      rootGroup.add(boot);
      const trouser = new THREE.Mesh(new THREE.CylinderGeometry(0.84, 0.78, 1.25, 14), royalBlueLacquerMat);
      trouser.position.set(side * 1.38, 2.85, 0.65);
      rootGroup.add(trouser);
    }

    // Articulated Torso Group (rocks menacingly, slumps forward during Paralysis Window!)
    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(0, 3.35, 0.65);
    rootGroup.add(torsoGroup);

    const coatMesh = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 1.75, 2.85, 18), crimsonLacquerMat);
    coatMesh.position.set(0, 1.15, 0);
    coatMesh.castShadow = true;
    torsoGroup.add(coatMesh);

    const beltMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.92, 1.92, 0.34, 18), darkBootMat);
    beltMesh.position.set(0, 0.18, 0);
    torsoGroup.add(beltMesh);

    const buckleMesh = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.62, 0.35), brassClockworkMat);
    buckleMesh.position.set(0, 0.18, 1.82);
    torsoGroup.add(buckleMesh);

    // Chest Clockwork Heart Core (Glows Gold normally, Electric Cyan during 2.5x Paralysis!)
    const coreRing = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.14, 10, 20), brassClockworkMat);
    coreRing.position.set(0, 1.32, 1.86);
    torsoGroup.add(coreRing);

    const coreMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.68, 1), coreMat);
    coreMesh.position.set(0, 1.32, 1.98);
    torsoGroup.add(coreMesh);

    // Epaulette Shoulders
    for (const side of [-1, 1]) {
      const ep = new THREE.Mesh(new THREE.SphereGeometry(0.86, 14, 10), brassClockworkMat);
      ep.scale.set(1.2, 0.75, 1.0);
      ep.position.set(side * 2.25, 2.35, 0.15);
      torsoGroup.add(ep);
    }

    // Giant Spinning Golden Wind-Up Key on Upper Back
    const windupKeyGroup = new THREE.Group();
    windupKeyGroup.position.set(0, 2.15, -1.85);
    const keyShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 1.75, 12), brassClockworkMat);
    keyShaft.rotation.x = Math.PI / 2;
    windupKeyGroup.add(keyShaft);
    for (const side of [-1, 1]) {
      const bow = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.18, 10, 18), brassClockworkMat);
      bow.position.set(side * 0.85, 0, -0.78);
      windupKeyGroup.add(bow);
    }
    torsoGroup.add(windupKeyGroup);

    // Nutcracker Head + Chomping Jaw + Tall Shako Toy Hat
    const headMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.18, 1.65, 18), creamWoodMat);
    headMesh.position.set(0, 3.35, 0.18);
    torsoGroup.add(headMesh);

    const eyeGlowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    for (const side of [-1, 1]) {
      const goggleRim = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.08, 8, 16), brassClockworkMat);
      goggleRim.position.set(side * 0.46, 3.52, 1.32);
      torsoGroup.add(goggleRim);
      const eyeLens = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), eyeGlowMat);
      eyeLens.position.set(side * 0.46, 3.52, 1.34);
      torsoGroup.add(eyeLens);

      const stache = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.92, 10), whitePlumeMat);
      stache.rotation.z = side * 1.32;
      stache.position.set(side * 0.56, 3.05, 1.38);
      torsoGroup.add(stache);
    }

    const jawGroup = new THREE.Group();
    jawGroup.position.set(0, 2.75, 1.15);
    const jawBox = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.46, 0.56), crimsonLacquerMat);
    jawGroup.add(jawBox);
    const teethMesh = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.22, 0.6), whitePlumeMat);
    teethMesh.position.y = 0.16;
    jawGroup.add(teethMesh);
    torsoGroup.add(jawGroup);

    const shakoHat = new THREE.Mesh(new THREE.CylinderGeometry(1.38, 1.26, 1.75, 18), darkBootMat);
    shakoHat.position.set(0, 4.92, 0.18);
    torsoGroup.add(shakoHat);
    const shakoCrown = new THREE.Mesh(new THREE.TorusGeometry(1.34, 0.14, 8, 20), brassClockworkMat);
    shakoCrown.rotation.x = Math.PI / 2;
    shakoCrown.position.set(0, 5.72, 0.18);
    torsoGroup.add(shakoCrown);
    const shakoBadge = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), brassClockworkMat);
    shakoBadge.position.set(0, 4.95, 1.48);
    torsoGroup.add(shakoBadge);
    const shakoPlume = new THREE.Mesh(new THREE.SphereGeometry(0.48, 12, 10), whitePlumeMat);
    shakoPlume.scale.set(0.75, 1.55, 0.75);
    shakoPlume.position.set(0, 6.45, 0.35);
    torsoGroup.add(shakoPlume);

    // Paralysis Star-Gear Halo (hidden until a weakpoint is broken!)
    const paralysisHaloGroup = new THREE.Group();
    paralysisHaloGroup.position.set(0, 6.85, 0.25);
    paralysisHaloGroup.visible = false;
    const haloRingMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const haloStarMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const haloRing = new THREE.Mesh(new THREE.TorusGeometry(1.95, 0.09, 8, 24), haloRingMat);
    haloRing.rotation.x = Math.PI / 2;
    paralysisHaloGroup.add(haloRing);
    for (let sIdx = 0; sIdx < 5; sIdx++) {
      const ang = (sIdx * Math.PI * 2) / 5;
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), haloStarMat);
      star.position.set(Math.cos(ang) * 1.95, 0.12, Math.sin(ang) * 1.95);
      paralysisHaloGroup.add(star);
    }
    torsoGroup.add(paralysisHaloGroup);

    // Weakpoint 1: Left Clockwork Heavy Shield Arm (`左翼发条重盾`) at world (-4.35, y, BOSS_GATE_Z + 1.85)
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-7.5, 0, 2.58);
    const leftPedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.38, 1.55, 0.55, 18), brassClockworkMat);
    leftPedestal.position.y = 0.28;
    leftArmGroup.add(leftPedestal);
    const leftUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 2.4, 12), crimsonLacquerMat);
    leftUpperArm.rotation.z = -0.58;
    leftUpperArm.position.set(1.15, 2.45, -0.85);
    leftArmGroup.add(leftUpperArm);

    const leftShieldMesh = new THREE.Mesh(new THREE.BoxGeometry(2.65, 3.15, 0.52), royalBlueLacquerMat);
    leftShieldMesh.position.set(0, 1.95, 0.18);
    leftShieldMesh.castShadow = true;
    leftArmGroup.add(leftShieldMesh);
    const shieldRim = new THREE.Mesh(new THREE.BoxGeometry(2.85, 3.32, 0.36), brassClockworkMat);
    shieldRim.position.set(0, 1.95, 0.08);
    leftArmGroup.add(shieldRim);
    const shieldCog = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.16, 8, 12), brassClockworkMat);
    shieldCog.position.set(0, 1.95, 0.48);
    leftArmGroup.add(shieldCog);
    rootGroup.add(leftArmGroup);

    // Weakpoint 2: Right Candy Bombard Heavy Cannon Arm (`右翼糖衣重炮`) at world (+4.35, y, BOSS_GATE_Z + 1.85)
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(7.5, 0, 2.58);
    const rightPedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.38, 1.55, 0.55, 18), brassClockworkMat);
    rightPedestal.position.y = 0.28;
    rightArmGroup.add(rightPedestal);
    const rightUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 2.4, 12), crimsonLacquerMat);
    rightUpperArm.rotation.z = 0.58;
    rightUpperArm.position.set(-1.15, 2.45, -0.85);
    rightArmGroup.add(rightUpperArm);

    const cannonMount = new THREE.Mesh(new THREE.BoxGeometry(1.85, 1.45, 1.75), candyPinkMat);
    cannonMount.position.set(0, 1.35, 0);
    rightArmGroup.add(cannonMount);
    const barrelGeo = new THREE.CylinderGeometry(0.62, 0.76, 2.65, 16);
    barrelGeo.rotateX(Math.PI / 2);
    const rightCannonBarrel = new THREE.Mesh(barrelGeo, brassClockworkMat);
    rightCannonBarrel.position.set(0, 1.95, 0.65);
    rightCannonBarrel.castShadow = true;
    rightArmGroup.add(rightCannonBarrel);
    const muzzleCandyRing = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.14, 10, 18), candyPinkMat);
    muzzleCandyRing.position.set(0, 1.95, 1.95);
    rightArmGroup.add(muzzleCandyRing);
    rootGroup.add(rightArmGroup);

    // Protective Clockwork Energy Barrier Arc across Core while Arms are intact
    const barrierArcMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const barrierArcMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(4.65, 4.65, 2.8, 24, 1, true, -Math.PI * 0.38, Math.PI * 0.76),
      barrierArcMat
    );
    barrierArcMesh.position.set(0, 1.95, 0.95);
    rootGroup.add(barrierArcMesh);

    this.levelGroup.add(rootGroup);

    // Build Candy Shell Pool for Right Cannon Volleys
    this.colossusCandyShells = [];
    const shellGeo = new THREE.SphereGeometry(0.46, 12, 10);
    for (let i = 0; i < 6; i++) {
      const sMesh = new THREE.Mesh(shellGeo, candyPinkMat);
      sMesh.visible = false;
      this.levelGroup.add(sMesh);
      this.colossusCandyShells.push({
        active: false,
        startX: 4.35,
        startZ: BOSS_GATE_Z + 2.4,
        targetX: 0,
        targetZ: 2.0,
        x: 4.35,
        y: 2.2,
        z: BOSS_GATE_Z + 2.4,
        flightTime: 0,
        flightDuration: 0.95,
        dmg: 14 + (level.colossusRaidTier || 1) * 3,
        splashRadius: 2.35,
        mesh: sMesh,
      });
    }

    const leftHp = level.colossusLeftShieldHp || 980;
    const rightHp = level.colossusRightCannonHp || 920;

    const leftLabelEl = document.createElement('div');
    leftLabelEl.className = 'subtower-label colossus-weakpoint-label is-left';
    leftLabelEl.innerHTML = `${UI_ART.shield}<span>左翼重盾 ${leftHp}</span>`;
    this.labelsContainer.appendChild(leftLabelEl);

    const rightLabelEl = document.createElement('div');
    rightLabelEl.className = 'subtower-label colossus-weakpoint-label is-right';
    rightLabelEl.innerHTML = `${UI_ART.techCandyBombard}<span>右翼糖炮 ${rightHp}</span>`;
    this.labelsContainer.appendChild(rightLabelEl);

    const coreLabelEl = document.createElement('div');
    coreLabelEl.className = 'subtower-label colossus-core-label';
    coreLabelEl.innerHTML = `${UI_ART.clockworkColossus}<span>发条巨兵 · 击破双臂触发瘫痪</span>`;
    this.labelsContainer.appendChild(coreLabelEl);

    this.colossusBoss = {
      active: true,
      raidTier: level.colossusRaidTier || 1,
      rootGroup,
      torsoGroup,
      jawGroup,
      windupKeyGroup,
      coreMesh,
      coreMat,
      paralysisHaloGroup,
      leftArmGroup,
      leftShieldMesh,
      rightArmGroup,
      rightCannonBarrel,
      barrierArcMesh,
      barrierArcMat,
      leftShieldHp: leftHp,
      leftShieldMaxHp: leftHp,
      leftShieldAlive: true,
      leftHitFlash: 0,
      rightCannonHp: rightHp,
      rightCannonMaxHp: rightHp,
      rightCannonAlive: true,
      rightHitFlash: 0,
      paralysisTimer: 0,
      paralysisMaxTimer: 6.0,
      weakpointsBroken: 0,
      cannonVolleyTimer: 1.8,
      leftLabelEl,
      rightLabelEl,
      coreLabelEl,
    };
  }

  public getColossusCoreDamageMultiplier(): number {
    const cb = this.colossusBoss;
    if (!cb || !cb.active) return 1.0;
    if (cb.paralysisTimer > 0) {
      return 2.5;
    }
    const intactCount = (cb.leftShieldAlive ? 1 : 0) + (cb.rightCannonAlive ? 1 : 0);
    if (intactCount >= 2) return 0.48;
    if (intactCount === 1) return 0.75;
    return 1.15;
  }

  public damageColossusWeakpoint(side: 'left' | 'right', rawDmg: number, silent = false): boolean {
    const cb = this.colossusBoss;
    if (!cb || !cb.active) return false;
    const techBonuses = this.state.getBoboTechCombatBonuses();
    const siegeMult = this.state.getSiegeDamageMultiplier();
    const effDmg = Math.max(1, rawDmg * siegeMult * techBonuses.weakpointDamageMult);

    if (side === 'left') {
      if (!cb.leftShieldAlive) return false;
      cb.leftShieldHp = Math.max(0, cb.leftShieldHp - effDmg);
      cb.leftHitFlash = 1.0;
      this.state.runSiegePool += effDmg * 0.5;
      if (cb.leftShieldHp <= 0) {
        this.breakColossusWeakpoint('left', silent);
        return true;
      }
      return false;
    }

    if (!cb.rightCannonAlive) return false;
    cb.rightCannonHp = Math.max(0, cb.rightCannonHp - effDmg);
    cb.rightHitFlash = 1.0;
    this.state.runSiegePool += effDmg * 0.5;
    if (cb.rightCannonHp <= 0) {
      this.breakColossusWeakpoint('right', silent);
      return true;
    }
    return false;
  }

  public breakColossusWeakpoint(side: 'left' | 'right', silent = false): void {
    const cb = this.colossusBoss;
    if (!cb || !cb.active) return;

    let wx = 0;
    const wz = BOSS_GATE_Z + 1.85;
    let partName = '';
    if (side === 'left') {
      if (!cb.leftShieldAlive) return;
      cb.leftShieldAlive = false;
      cb.leftShieldHp = 0;
      cb.leftArmGroup.visible = false;
      cb.leftLabelEl.style.display = 'none';
      wx = -4.35;
      partName = '左翼发条重盾';
    } else {
      if (!cb.rightCannonAlive) return;
      cb.rightCannonAlive = false;
      cb.rightCannonHp = 0;
      cb.rightArmGroup.visible = false;
      cb.rightLabelEl.style.display = 'none';
      wx = 4.35;
      partName = '右翼糖衣重炮';
    }

    cb.weakpointsBroken += 1;
    cb.paralysisMaxTimer = 6.0;
    cb.paralysisTimer = 6.0;
    cb.paralysisHaloGroup.visible = true;
    cb.barrierArcMesh.visible = false;
    cb.coreMat.color.setHex(0x38bdf8);
    cb.coreMat.emissive.setHex(0x0284c7);

    const goldBonus = this.state.addGold(95 + cb.raidTier * 20);
    this.state.championCharge = Math.min(100, this.state.championCharge + 40);
    this.state.mechaOverlordCharge = Math.min(100, this.state.mechaOverlordCharge + 35);

    const coreOverloadDmg = Math.max(1, Math.round(this.bossMaxHp * 0.1));
    this.bossHp = Math.max(1, this.bossHp - coreOverloadDmg);
    this.bossHitFlash = 1.0;

    if (!silent) {
      sound.playClockworkWeakpointBreak();
      this.triggerScreenFlash('#38bdf8', 0.62);
      this.addCameraShake(0.85);
      this.spawnSkyPillar(wx, wz, 0x38bdf8, 2.8, 0.58);
      this.spawnSkyPillar(0, BOSS_GATE_Z - 0.6, 0xfacc15, 3.2, 0.62);
      this.spawnShockwave(wx, wz, 0x38bdf8, 7.6, 0.55);
      this.spawnShockwave(0, BOSS_GATE_Z, 0xfacc15, 11.2, 0.58);
      this.spawnBurstParticles(wx, 2.2, wz, 0x38bdf8, 65);
      this.spawnBurstParticles(wx, 1.8, wz, 0xfacc15, 36);
      this.spawnFloatingPopup(wx, 3.0, wz, `击破${partName}! +${goldBonus} 金币`, '#38bdf8');
      this.onBanner?.(
        `击破${partName} · 触发 6.0s 瘫痪高倍暴击窗口！`,
        `发条首领核心承受 2.5x 暴击伤害 · 过载直伤 -${coreOverloadDmg} HP！`
      );
    }
  }

  private fireColossusCandyVolley(): void {
    const cb = this.colossusBoss;
    if (!cb || !cb.active || !cb.rightCannonAlive || cb.paralysisTimer > 0) return;

    const laneTargets = [-3.4 + (Math.random() - 0.5) * 2.2, 3.2 + (Math.random() - 0.5) * 2.2];
    let fired = 0;
    for (const tx of laneTargets) {
      const slot = this.colossusCandyShells.find((s) => !s.active);
      if (!slot) break;
      slot.active = true;
      slot.startX = 4.35;
      slot.startZ = BOSS_GATE_Z + 2.5;
      slot.targetX = THREE.MathUtils.clamp(tx, -TRACK_HALF_W + 1.6, TRACK_HALF_W - 1.6);
      slot.targetZ = THREE.MathUtils.clamp(0.5 + (Math.random() - 0.5) * 9.0, -7.5, 9.5);
      slot.x = slot.startX;
      slot.y = 2.15;
      slot.z = slot.startZ;
      slot.flightTime = 0;
      slot.flightDuration = 0.92;
      slot.mesh.position.set(slot.x, slot.y, slot.z);
      slot.mesh.visible = true;
      fired++;
    }
    if (fired > 0) {
      cb.rightHitFlash = 0.75;
      sound.playColossusCannonVolley();
      this.spawnBurstParticles(4.35, 2.1, BOSS_GATE_Z + 2.6, 0xf472b6, 12);
    }
  }

  private updateClockworkColossus(dt: number): void {
    const cb = this.colossusBoss;
    if (!cb || !cb.active) return;

    if (cb.leftHitFlash > 0) {
      cb.leftHitFlash = Math.max(0, cb.leftHitFlash - dt * 5.5);
      const s = 1 + cb.leftHitFlash * 0.14;
      cb.leftArmGroup.scale.set(s, s, s);
    } else {
      cb.leftArmGroup.scale.set(1, 1, 1);
    }

    if (cb.rightHitFlash > 0) {
      cb.rightHitFlash = Math.max(0, cb.rightHitFlash - dt * 5.5);
      const s = 1 + cb.rightHitFlash * 0.14;
      cb.rightArmGroup.scale.set(s, s, s);
      cb.rightCannonBarrel.position.z = 0.65 - cb.rightHitFlash * 0.28;
    } else {
      cb.rightArmGroup.scale.set(1, 1, 1);
      cb.rightCannonBarrel.position.z = 0.65;
    }

    const hitPulse = 1 + this.bossHitFlash * 0.12;
    cb.coreMesh.rotation.y = this.elapsedTime * (cb.paralysisTimer > 0 ? 6.2 : 2.4);

    if (cb.paralysisTimer > 0) {
      cb.paralysisTimer = Math.max(0, cb.paralysisTimer - dt);
      cb.torsoGroup.rotation.x = THREE.MathUtils.lerp(cb.torsoGroup.rotation.x, 0.36, Math.min(1, dt * 8));
      cb.torsoGroup.rotation.z = Math.sin(this.elapsedTime * 16) * 0.05;
      cb.torsoGroup.position.y = 3.15;
      cb.jawGroup.rotation.x = 0.38;
      cb.windupKeyGroup.rotation.z += dt * 0.8 * Math.sin(this.elapsedTime * 22);
      cb.paralysisHaloGroup.visible = true;
      cb.paralysisHaloGroup.rotation.y = this.elapsedTime * 3.8;
      cb.barrierArcMesh.visible = false;
      const cScale = (1.18 + Math.sin(this.elapsedTime * 12) * 0.14) * hitPulse;
      cb.coreMesh.scale.set(cScale, cScale, cScale);

      if (cb.paralysisTimer <= 0) {
        cb.paralysisHaloGroup.visible = false;
        cb.coreMat.color.setHex(0xfbbf24);
        cb.coreMat.emissive.setHex(0xf97316);
        const anyArmIntact = cb.leftShieldAlive || cb.rightCannonAlive;
        cb.barrierArcMesh.visible = anyArmIntact;
        cb.barrierArcMat.opacity = cb.leftShieldAlive && cb.rightCannonAlive ? 0.3 : 0.17;
      }
    } else {
      cb.torsoGroup.rotation.x = THREE.MathUtils.lerp(
        cb.torsoGroup.rotation.x,
        Math.sin(this.elapsedTime * 2.2) * 0.06 - this.bossHitFlash * 0.14,
        Math.min(1, dt * 7)
      );
      cb.torsoGroup.rotation.z = Math.sin(this.elapsedTime * 1.45) * 0.07;
      cb.torsoGroup.position.y = 3.35 + Math.abs(Math.sin(this.elapsedTime * 2.8)) * 0.18;
      cb.jawGroup.rotation.x = 0.14 + Math.abs(Math.sin(this.elapsedTime * 4.6)) * 0.24;
      cb.windupKeyGroup.rotation.z = this.elapsedTime * 2.6;
      cb.coreMesh.scale.set(hitPulse, hitPulse, hitPulse);
      const intactArms = (cb.leftShieldAlive ? 1 : 0) + (cb.rightCannonAlive ? 1 : 0);
      cb.barrierArcMesh.visible = intactArms > 0;
      cb.barrierArcMat.opacity = (intactArms >= 2 ? 0.3 : 0.17) + Math.sin(this.elapsedTime * 5.5) * 0.04;

      if (cb.rightCannonAlive) {
        cb.cannonVolleyTimer -= dt;
        if (cb.cannonVolleyTimer <= 0) {
          cb.cannonVolleyTimer = Math.max(2.6, 3.7 - cb.raidTier * 0.12);
          this.fireColossusCandyVolley();
        }
      }
    }

    // Update active Right-Cannon Candy Shells in flight
    for (const s of this.colossusCandyShells) {
      if (!s.active) continue;
      s.flightTime += dt;
      const t = Math.min(1, s.flightTime / Math.max(0.15, s.flightDuration));
      s.x = THREE.MathUtils.lerp(s.startX, s.targetX, t);
      s.z = THREE.MathUtils.lerp(s.startZ, s.targetZ, t);
      s.y = THREE.MathUtils.lerp(2.15, 0.35, t) + Math.sin(t * Math.PI) * 4.2;
      s.mesh.position.set(s.x, s.y, s.z);
      s.mesh.rotation.x += dt * 7.5;
      s.mesh.rotation.z += dt * 5.5;
      if (t >= 1) {
        s.active = false;
        s.mesh.visible = false;
        this.spawnShockwave(s.targetX, s.targetZ, 0xf472b6, s.splashRadius, 0.32);
        this.spawnBurstParticles(s.targetX, 0.7, s.targetZ, 0xf472b6, 16);
        const rSq = s.splashRadius * s.splashRadius;
        for (const bIdx of this.activeBlueIndices) {
          const bu = this.units[bIdx];
          if (!bu.active) continue;
          if ((bu.x - s.targetX) ** 2 + (bu.z - s.targetZ) ** 2 <= rSq) {
            if (bu.frostShield) {
              bu.frostShield = false;
            } else if (bu.kind === 'champion') {
              bu.hp = Math.max(1, bu.hp - s.dmg * 0.35);
            } else {
              bu.hp -= s.dmg * 0.65;
              if (bu.hp <= 0) bu.active = false;
            }
          }
        }
      }
    }
  }

  public getActiveTechFlairSnapshot(): {
    activeDoctrine: BoboTechBranchId;
    vanguardCount: number;
    siegeCount: number;
    candyCount: number;
    totalFlairRendered: number;
  } {
    return {
      activeDoctrine: this.state.activeBoboTechDoctrine,
      vanguardCount: this.techVanguardFlairInst?.count || 0,
      siegeCount: this.techSiegeFlairInst?.count || 0,
      candyCount: this.techCandyFlairInst?.count || 0,
      totalFlairRendered: this.lastTechFlairCount,
    };
  }

  public runMc8SelfCheck(): {
    ok: boolean;
    colossusSpawnedWithTwoWeakpoints: boolean;
    weakpointBreakTriggeredParalysis: boolean;
    paralysisCoreCritAmplified: boolean;
    rightCannonStoppedWhenBroken: boolean;
    raidVictoryAwardedCoresAndPersisted: boolean;
    techTreeUpgradedByGoldAndCores: boolean;
    vanguardBoostedGateSurgeSpeed: boolean;
    heavySiegeBoostedHpAndWeakpointBreak: boolean;
    candyBombardSplashedAndBoostedFireRate: boolean;
    doctrineFlairSwitchedIn3D: boolean;
  } {
    const prevPaused = this.isPaused;
    const prevLevel = this.currentLevel;
    const prevGold = this.state.gold;
    const prevShards = { ...this.state.skinShards };
    const prevBricks = this.state.tournamentBricks;
    const prevCores = this.state.clockworkCores;
    const prevClears = this.state.colossusRaidClears;
    const prevWeakpoints = this.state.totalColossusWeakpointsBroken;
    const prevBestSec = this.state.bestColossusClearSec;
    const prevTechLevels = { ...this.state.boboTechLevels };
    const prevDoctrine = this.state.activeBoboTechDoctrine;

    this.isPaused = false;

    // 1. Verify Colossus Raid 3D Boss Spawn + Left Shield / Right Cannon Weakpoint Break + 6s 2.5x Paralysis Window
    this.state.boboTechLevels = { vanguard_charge: 0, heavy_siege: 0, candy_bombard: 0 };
    this.state.activeBoboTechDoctrine = 'vanguard_charge';
    const raidLevel = generateClockworkColossusRaidLevel(1);
    this.loadLevel(raidLevel);
    for (const u of this.units) u.active = false;

    const cb = this.colossusBoss;
    const colossusSpawnedWithTwoWeakpoints = Boolean(
      raidLevel.isColossusRaid &&
        raidLevel.mode === 'colossus_raid' &&
        cb &&
        cb.active &&
        cb.leftShieldAlive &&
        cb.rightCannonAlive &&
        !this.bossGroup.visible
    );

    // Measure Core damage taken BEFORE paralysis (both arms intact -> 0.48x)
    const hpBeforeGuarded = this.bossHp;
    const probeA = this.spawnUnit('blue', 'normal', 0, BOSS_GATE_Z + 0.75, 0, 0);
    if (probeA) {
      probeA.dmg = 120;
      probeA.attackCooldown = 0;
    }
    this.simulateUnits(0.05);
    const guardedCoreDmg = hpBeforeGuarded - this.bossHp;
    for (const u of this.units) u.active = false;

    // Break Left Shield Arm -> triggers 6.0s Paralysis Vulnerable Window (2.5x Core damage!)
    this.damageColossusWeakpoint('left', 99999, true);
    const weakpointBreakTriggeredParalysis = Boolean(
      cb && !cb.leftShieldAlive && cb.weakpointsBroken === 1 && cb.paralysisTimer >= 5.8 && cb.paralysisHaloGroup.visible
    );

    // Measure Core damage taken DURING paralysis (2.5x!)
    const hpBeforeParalyzed = this.bossHp;
    const probeB = this.spawnUnit('blue', 'normal', 0, BOSS_GATE_Z + 0.75, 0, 0);
    if (probeB) {
      probeB.dmg = 120;
      probeB.attackCooldown = 0;
    }
    this.simulateUnits(0.05);
    const paralyzedCoreDmg = hpBeforeParalyzed - this.bossHp;
    for (const u of this.units) u.active = false;

    const paralysisCoreCritAmplified = Boolean(
      guardedCoreDmg > 0 && paralyzedCoreDmg > guardedCoreDmg * 4.5 && this.getColossusCoreDamageMultiplier() === 2.5
    );

    // Break Right Cannon Arm -> disables Right Cannon candy volleys
    if (cb) cb.paralysisTimer = 0;
    for (const s of this.colossusCandyShells) s.active = false;
    this.damageColossusWeakpoint('right', 99999, true);
    if (cb) {
      cb.paralysisTimer = 0;
      cb.cannonVolleyTimer = 0;
    }
    this.updateClockworkColossus(0.2);
    const anyShellFiredAfterBreak = this.colossusCandyShells.some((s) => s.active);
    const rightCannonStoppedWhenBroken = Boolean(
      cb && !cb.rightCannonAlive && cb.weakpointsBroken === 2 && !anyShellFiredAfterBreak
    );

    // 2. Verify Raid Victory Rewards (`clockworkCores`, Coins, Cards, Bricks & `colossusRaidClears` persistence)
    this.state.clockworkCores = 0;
    this.state.colossusRaidClears = 0;
    const raidRes = this.state.recordColossusRaidResult(true, 2, 22.4);
    const savedRaid = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}') as {
      clockworkCores?: number;
      colossusRaidClears?: number;
    };
    const raidVictoryAwardedCoresAndPersisted = Boolean(
      raidRes.victory &&
        raidRes.coresAwarded >= 5 &&
        raidRes.coinsAwarded >= 400 &&
        raidRes.cardsAwarded >= 2 &&
        raidRes.bricksAwarded >= 100 &&
        this.state.colossusRaidClears === 1 &&
        savedRaid.clockworkCores === this.state.clockworkCores &&
        savedRaid.colossusRaidClears === 1
    );

    // 3. Verify Bobo 3-Branch Specialization Tech Tree upgrades with BOTH Gold & Clockwork Cores
    this.state.gold = 999999;
    this.state.clockworkCores = 60;
    this.state.boboTechLevels = { vanguard_charge: 0, heavy_siege: 0, candy_bombard: 0 };
    const upGold = this.state.upgradeBoboTechBranch('vanguard_charge', 'gold');
    const upCore = this.state.upgradeBoboTechBranch('heavy_siege', 'core');
    for (const bId of ['vanguard_charge', 'heavy_siege', 'candy_bombard'] as BoboTechBranchId[]) {
      while (this.state.getBoboTechLevel(bId) < 5) {
        this.state.upgradeBoboTechBranch(bId, 'auto');
      }
    }
    const savedTech = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}') as {
      boboTechLevels?: Record<string, number>;
    };
    const techTreeUpgradedByGoldAndCores = Boolean(
      upGold.upgraded &&
        upGold.spentCurrency === 'gold' &&
        upCore.upgraded &&
        upCore.spentCurrency === 'core' &&
        savedTech.boboTechLevels?.vanguard_charge === 5 &&
        savedTech.boboTechLevels?.heavy_siege === 5 &&
        savedTech.boboTechLevels?.candy_bombard === 5
    );

    // 4A. Verify `vanguard_charge` move speed + gate-pass surge speed
    this.state.boboTechLevels = { vanguard_charge: 0, heavy_siege: 0, candy_bombard: 0 };
    this.state.setActiveBoboTechDoctrine('heavy_siege');
    this.loadLevel(raidLevel);
    for (const u of this.units) u.active = false;
    for (const z of this.zones) z.cfg.x = 99;
    const baseRunner = this.spawnUnit('blue', 'normal', -4.2, 8.2, 0, -4.5);
    for (let step = 0; step < 10; step++) this.update(0.05);
    const baseDist = baseRunner ? 8.2 - baseRunner.z : 0;

    this.state.boboTechLevels = { vanguard_charge: 5, heavy_siege: 0, candy_bombard: 0 };
    this.state.setActiveBoboTechDoctrine('vanguard_charge');
    for (const u of this.units) u.active = false;
    const surgeRunner = this.spawnUnit('blue', 'normal', -4.2, 8.2, 0, -4.5);
    if (surgeRunner) surgeRunner.vanguardSurgeTimer = 2.0;
    for (let step = 0; step < 10; step++) this.update(0.05);
    const surgeDist = surgeRunner ? 8.2 - surgeRunner.z : 0;
    const vanguardBoostedGateSurgeSpeed = surgeDist > baseDist * 1.38;

    // 4B. Verify `heavy_siege` Bobo HP boost + Colossus weakpoint damage amplification
    this.state.boboTechLevels = { vanguard_charge: 0, heavy_siege: 0, candy_bombard: 0 };
    this.state.setActiveBoboTechDoctrine('vanguard_charge');
    this.loadLevel(raidLevel);
    const boboNoSiege = this.spawnUnit('blue', 'normal', 0, 10, 0, 0);
    const hpNoSiege = boboNoSiege?.maxHp || 1;
    const shieldBeforeNoSiege = this.colossusBoss?.leftShieldHp || 0;
    this.damageColossusWeakpoint('left', 80, true);
    const wpDmgNoSiege = shieldBeforeNoSiege - (this.colossusBoss?.leftShieldHp || 0);

    this.state.boboTechLevels = { vanguard_charge: 0, heavy_siege: 5, candy_bombard: 0 };
    this.state.setActiveBoboTechDoctrine('heavy_siege');
    this.loadLevel(raidLevel);
    const boboWithSiege = this.spawnUnit('blue', 'normal', 0, 10, 0, 0);
    const hpWithSiege = boboWithSiege?.maxHp || 1;
    const shieldBeforeWithSiege = this.colossusBoss?.leftShieldHp || 0;
    this.damageColossusWeakpoint('left', 80, true);
    const wpDmgWithSiege = shieldBeforeWithSiege - (this.colossusBoss?.leftShieldHp || 0);
    const heavySiegeBoostedHpAndWeakpointBreak = Boolean(
      hpWithSiege > hpNoSiege * 1.35 && wpDmgWithSiege > wpDmgNoSiege * 2.2
    );

    // 4C. Verify `candy_bombard` cannon fire-rate boost + melee candy-pop splash on Red pack + 3D doctrine flair
    this.state.boboTechLevels = { vanguard_charge: 0, heavy_siege: 0, candy_bombard: 0 };
    this.state.setActiveBoboTechDoctrine('vanguard_charge');
    const fireRateNoCandy = this.state.getFireRatePerSec();

    this.state.boboTechLevels = { vanguard_charge: 3, heavy_siege: 3, candy_bombard: 5 };
    this.state.setActiveBoboTechDoctrine('candy_bombard');
    const fireRateWithCandy = this.state.getFireRatePerSec();

    for (const u of this.units) u.active = false;
    this.lootBug.active = false;
    const primaryRed = this.spawnUnit('red', 'normal', -3.0, 10.0, 0, 0);
    const neighborRed = this.spawnUnit('red', 'normal', -1.6, 10.0, 0, 0);
    const candyBobo = this.spawnUnit('blue', 'normal', -3.0, 10.35, 0, 0);
    if (primaryRed && neighborRed && candyBobo) {
      primaryRed.maxHp = 5000;
      primaryRed.hp = 5000;
      neighborRed.maxHp = 5000;
      neighborRed.hp = 5000;
      candyBobo.maxHp = 5000;
      candyBobo.hp = 5000;
      candyBobo.dmg = 120;
      candyBobo.attackCooldown = 0;
    }
    this.simulateUnits(0.05);
    this.spawnUnit('blue', 'normal', 0, 14.2, 0, 0);
    this.renderScene();
    const candyFlairSnap = this.getActiveTechFlairSnapshot();
    this.state.setActiveBoboTechDoctrine('vanguard_charge');
    this.renderScene();
    const vanguardFlairSnap = this.getActiveTechFlairSnapshot();

    const candyBombardSplashedAndBoostedFireRate = Boolean(
      fireRateWithCandy > fireRateNoCandy * 1.2 && neighborRed && neighborRed.hp < 5000
    );
    const doctrineFlairSwitchedIn3D = Boolean(
      candyFlairSnap.candyCount >= 1 &&
        candyFlairSnap.vanguardCount === 0 &&
        vanguardFlairSnap.vanguardCount >= 1 &&
        vanguardFlairSnap.candyCount === 0
    );

    // Restore player state cleanly
    this.state.gold = prevGold;
    this.state.skinShards = prevShards;
    this.state.tournamentBricks = prevBricks;
    this.state.clockworkCores = prevCores;
    this.state.colossusRaidClears = prevClears;
    this.state.totalColossusWeakpointsBroken = prevWeakpoints;
    this.state.bestColossusClearSec = prevBestSec;
    this.state.boboTechLevels = prevTechLevels;
    this.state.activeBoboTechDoctrine = prevDoctrine;
    this.state.save();
    if (prevLevel) {
      this.loadLevel(prevLevel);
    }
    this.applySkin(this.state.getEquippedSkin());
    this.isPaused = prevPaused;

    return {
      ok:
        colossusSpawnedWithTwoWeakpoints &&
        weakpointBreakTriggeredParalysis &&
        paralysisCoreCritAmplified &&
        rightCannonStoppedWhenBroken &&
        raidVictoryAwardedCoresAndPersisted &&
        techTreeUpgradedByGoldAndCores &&
        vanguardBoostedGateSurgeSpeed &&
        heavySiegeBoostedHpAndWeakpointBreak &&
        candyBombardSplashedAndBoostedFireRate &&
        doctrineFlairSwitchedIn3D,
      colossusSpawnedWithTwoWeakpoints,
      weakpointBreakTriggeredParalysis,
      paralysisCoreCritAmplified,
      rightCannonStoppedWhenBroken,
      raidVictoryAwardedCoresAndPersisted,
      techTreeUpgradedByGoldAndCores,
      vanguardBoostedGateSurgeSpeed,
      heavySiegeBoostedHpAndWeakpointBreak,
      candyBombardSplashedAndBoostedFireRate,
      doctrineFlairSwitchedIn3D,
    };
  }

  // ============================================================================
  // MC-9: Steam Cannon Core Module 3D Attachments & Cloud Airship Escort Mode
  // ============================================================================

  public syncCannonCoreModule3D(): CannonCoreModId {
    const modId = this.state.activeCannonMod;
    if (this.cannonModOverdriveGroup) {
      this.cannonModOverdriveGroup.visible = modId === 'overdrive_breech';
    }
    if (this.cannonModPrismGroup) {
      this.cannonModPrismGroup.visible = modId === 'prism_splitter';
    }
    if (this.cannonModHeavyMortarGroup) {
      this.cannonModHeavyMortarGroup.visible = modId === 'heavy_mortar';
    }
    return modId;
  }

  private fireCannonCoreModuleShot(
    originX: number,
    resolveKind: () => 'normal' | 'charged'
  ): void {
    this.syncCannonCoreModule3D();
    const spec = this.state.getCannonModCombatSpec();
    if (this.state.getCannonModLevel(spec.id) < 1) return;

    this.cannonModShotCounter += 1;

    if (spec.id === 'overdrive_breech' && spec.overdriveEveryShots > 0) {
      if (this.cannonModShotCounter % spec.overdriveEveryShots === 0) {
        this.cannonModStats.overdriveBurstsTriggered += 1;
        this.state.totalCannonModBursts += 1;
        // Immediate rapid double-tap side-by-side burst shot + follow-up rapid tap queue!
        for (const tapOffset of [-0.42, 0.42]) {
          const tapUnit = this.spawnUnit(
            'blue',
            resolveKind() === 'charged' ? 'charged' : 'normal',
            originX + tapOffset,
            PLAYER_Z - 1.48,
            tapOffset * 0.65,
            -9.75
          );
          if (tapUnit) {
            tapUnit.cannonModTag = 'overdrive_breech';
          }
        }
        this.overdriveBurstQueue = Math.min(4, this.overdriveBurstQueue + spec.overdriveExtraBursts);
        this.overdriveBurstTimer = 0.06;
        this.spawnShockwave(originX, PLAYER_Z - 1.5, 0xf59e0b, 1.95, 0.22);
        this.spawnBurstParticles(originX, 0.95, PLAYER_Z - 1.55, 0xf59e0b, 10);
      }
    } else if (spec.id === 'prism_splitter' && spec.prismEveryShots > 0) {
      if (this.cannonModShotCounter % spec.prismEveryShots === 0) {
        this.cannonModStats.prismSplitsTriggered += 1;
        this.state.totalCannonModBursts += 1;
        const angles = spec.prismSplitCount >= 3 ? [-0.32, 0, 0.32] : [-0.26, 0.26];
        for (const ang of angles) {
          const prismBobo = this.spawnUnit(
            'blue',
            'charged',
            originX + ang * 1.2,
            PLAYER_Z - 1.5,
            Math.sin(ang) * 8.6,
            -Math.cos(ang) * 9.5
          );
          if (prismBobo) {
            prismBobo.cannonModTag = 'prism_splitter';
            prismBobo.dmg *= spec.prismDmgMult;
            prismBobo.maxHp *= 1.12;
            prismBobo.hp = prismBobo.maxHp;
          }
        }
        this.spawnShockwave(originX, PLAYER_Z - 1.5, 0x38bdf8, 2.25, 0.24);
        this.spawnBurstParticles(originX, 1.0, PLAYER_Z - 1.55, 0x38bdf8, 12);
      }
    } else if (spec.id === 'heavy_mortar' && spec.mortarEveryShots > 0) {
      if (this.cannonModShotCounter % spec.mortarEveryShots === 0) {
        this.cannonModStats.heavyMortarsLaunched += 1;
        this.state.totalCannonModBursts += 1;
        const mortarBobo = this.spawnUnit(
          'blue',
          'charged',
          originX,
          PLAYER_Z - 1.75,
          0,
          -9.1,
          undefined,
          true,
          spec.mortarFusionTier
        );
        if (mortarBobo) {
          mortarBobo.cannonModTag = 'heavy_mortar';
          mortarBobo.frostShield = true;
          mortarBobo.spawnHop = 1.65;
          mortarBobo.maxHp *= spec.mortarHpMult;
          mortarBobo.hp = mortarBobo.maxHp;
          mortarBobo.dmg *= 1.32;
          mortarBobo.mortarSiegeBonusMult = spec.mortarSiegeMult;
          this.triggerHeavyMortarImpact(originX, PLAYER_Z - 4.2, mortarBobo.dmg * spec.mortarSiegeMult * 0.55);
        }
        this.turretRecoil = Math.max(this.turretRecoil, 1.72);
        this.addCameraShake(0.08);
        this.spawnShockwave(originX, PLAYER_Z - 1.6, 0xf43f5e, 2.5, 0.28);
        this.spawnBurstParticles(originX, 1.05, PLAYER_Z - 1.6, 0xf43f5e, 14);
      }
    }
  }

  public triggerHeavyMortarImpact(impactX: number, impactZ: number, siegeBurstDmg: number): number {
    let totalDealt = 0;
    const radiusSq = 4.6 * 4.6;
    this.spawnShockwave(impactX, impactZ, 0xf97316, 3.6, 0.3);
    this.spawnBurstParticles(impactX, 0.85, impactZ, 0xf97316, 14);

    for (const aat of this.antiAirTurrets) {
      if (!aat.alive) continue;
      const dx = aat.cfg.x - impactX;
      const dz = aat.cfg.z - impactZ;
      if (dx * dx + dz * dz <= radiusSq * 1.45) {
        this.damageAntiAirTurret(aat, siegeBurstDmg, true);
        totalDealt += siegeBurstDmg;
      }
    }
    for (const st of this.bossSubTowers) {
      if (!st.alive) continue;
      const dx = st.cfg.x - impactX;
      const dz = st.cfg.z - impactZ;
      if (dx * dx + dz * dz <= radiusSq * 1.45) {
        st.hp = Math.max(0, st.hp - siegeBurstDmg);
        st.hitFlash = 1.0;
        totalDealt += siegeBurstDmg;
        if (st.hp <= 0 && st.alive) {
          this.destroyBossSubTower(st);
        }
      }
    }
    for (const rIdx of this.activeRedIndices) {
      const ru = this.units[rIdx];
      if (!ru || !ru.active) continue;
      const dx = ru.x - impactX;
      const dz = ru.z - impactZ;
      if (dx * dx + dz * dz <= radiusSq) {
        ru.hp -= siegeBurstDmg * 0.65;
        totalDealt += siegeBurstDmg * 0.65;
        if (ru.hp <= 0) {
          ru.active = false;
          this.onUnitKilled(ru);
        }
      }
    }
    this.cannonModStats.mortarImpactDamageDealt += totalDealt;
    return totalDealt;
  }

  private buildAirshipEscort3D(level: LevelConfig): void {
    const finish = this.state.getEquippedFinish();
    const startZ = 14.5;
    const targetZ = BOSS_GATE_Z + 2.1;
    const hoverY = 4.35;

    // 1. Build Enemy Anti-Air Flak Sub-Turrets along the lane flanks
    const flakBaseMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.42,
        metalness: 0.48,
      }),
      0.8
    );
    const flakCrimsonMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0xe11d48,
        emissive: 0x4c0519,
        emissiveIntensity: 0.26,
        roughness: 0.28,
        metalness: 0.35,
      }),
      0.82
    );
    const flakBrassMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        roughness: 0.24,
        metalness: 0.68,
      }),
      0.82
    );

    this.antiAirTurrets = [];
    for (const cfg of level.antiAirTurrets || []) {
      const group = new THREE.Group();
      group.position.set(cfg.x, 0, cfg.z);

      const hazardRing = new THREE.Mesh(
        new THREE.RingGeometry(1.55, 1.88, 24),
        new THREE.MeshBasicMaterial({
          color: 0xf43f5e,
          transparent: true,
          opacity: 0.52,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      hazardRing.rotation.x = -Math.PI / 2;
      hazardRing.position.y = 0.05;
      group.add(hazardRing);

      const bunkerPedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(1.18, 1.42, 1.05, 8),
        flakBaseMat
      );
      bunkerPedestal.position.y = 0.52;
      bunkerPedestal.castShadow = true;
      group.add(bunkerPedestal);

      const collarRing = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.12, 8, 18), flakBrassMat);
      collarRing.rotation.x = Math.PI / 2;
      collarRing.position.y = 1.06;
      group.add(collarRing);

      const gunMountGroup = new THREE.Group();
      gunMountGroup.position.set(0, 1.38, 0);
      const turretHead = new THREE.Mesh(new THREE.SphereGeometry(0.76, 14, 12), flakCrimsonMat);
      turretHead.scale.set(1.05, 0.85, 1.15);
      gunMountGroup.add(turretHead);

      for (const bx of [-0.32, 0.32]) {
        const flakBarrel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.19, 1.55, 12),
          flakBrassMat
        );
        flakBarrel.rotation.x = -0.78;
        flakBarrel.position.set(bx, 0.52, 0.55);
        gunMountGroup.add(flakBarrel);
      }
      group.add(gunMountGroup);
      this.levelGroup.add(group);

      const labelEl = document.createElement('div');
      labelEl.className = 'subtower-label antiair-turret-label';
      labelEl.dataset.hp = `${cfg.hp}`;
      labelEl.innerHTML = `${UI_ART.boom}<span>${cfg.name} ${cfg.hp}</span>`;
      this.labelsContainer.appendChild(labelEl);

      this.antiAirTurrets.push({
        cfg,
        group,
        gunMountGroup,
        hp: cfg.hp,
        maxHp: cfg.hp,
        alive: true,
        fireTimer: 1.1 + Math.abs(cfg.z) * 0.05,
        hitFlash: 0,
        recoilAnim: 0,
        contestedByBlue: false,
        labelEl,
      });
    }

    // 2. Build Articulated 3D Toy-Craft Steam Airship Mothership
    const rootGroup = new THREE.Group();
    rootGroup.position.set(0, 0, startZ);

    const hullMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        roughness: 0.22,
        metalness: 0.18,
      }),
      0.84
    );
    const creamStripeMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0xfffbeb,
        roughness: 0.24,
        metalness: 0.1,
      }),
      0.84
    );
    const trimMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: finish.cartTrimHex,
        roughness: 0.2,
        metalness: 0.72,
      }),
      0.84
    );
    const coreGlowMat = new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      emissive: 0x0284c7,
      emissiveIntensity: 0.75,
      roughness: 0.14,
      metalness: 0.22,
    });

    // Bridge-deck escort aura ring underneath the hovering airship
    const auraGeo = new THREE.RingGeometry(4.2, 4.78, 36);
    auraGeo.rotateX(-Math.PI / 2);
    const auraRingMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.58,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const auraRingMesh = new THREE.Mesh(auraGeo, auraRingMat);
    auraRingMesh.position.set(0, 0.07, 0);
    rootGroup.add(auraRingMesh);

    // Upper hovering airship hull & gondola assembly
    const hullGroup = new THREE.Group();
    hullGroup.position.set(0, hoverY, 0);

    // Painted Hull Balloon Envelope + Cream Belly Band + Brass Rib Hoops
    const balloonEnvelope = new THREE.Mesh(new THREE.SphereGeometry(1.42, 24, 18), hullMat);
    balloonEnvelope.scale.set(1.22, 0.96, 2.28);
    balloonEnvelope.castShadow = true;
    hullGroup.add(balloonEnvelope);

    const bellyBand = new THREE.Mesh(new THREE.SphereGeometry(1.43, 22, 14), creamStripeMat);
    bellyBand.scale.set(1.24, 0.38, 2.24);
    hullGroup.add(bellyBand);

    for (const rz of [-1.45, 0, 1.45]) {
      const ribScale = Math.abs(rz) > 1.0 ? 0.78 : 1.0;
      const ribHoop = new THREE.Mesh(
        new THREE.TorusGeometry(1.42 * ribScale, 0.075, 10, 24),
        trimMat
      );
      ribHoop.scale.set(1.22, 0.96, 1.0);
      ribHoop.position.set(0, 0, rz);
      hullGroup.add(ribHoop);
    }

    const noseCone = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.95, 16), trimMat);
    noseCone.rotation.x = -Math.PI / 2;
    noseCone.position.set(0, 0, -3.45);
    hullGroup.add(noseCone);

    // Cruciform Toy-Craft Tail Stabilizer Fins
    const tailFinMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.28, metalness: 0.2 }),
      0.82
    );
    for (let f = 0; f < 4; f++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.05, 1.15), tailFinMat);
      const ang = (f * Math.PI) / 2;
      fin.position.set(Math.sin(ang) * 0.95, Math.cos(ang) * 0.82, 2.65);
      fin.rotation.z = -ang;
      hullGroup.add(fin);
    }

    // Suspended Brass Gondola + Glowing Portholes
    const gondolaGroup = new THREE.Group();
    gondolaGroup.position.set(0, -1.78, 0);
    const gondolaHull = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.78, 2.85), trimMat);
    gondolaHull.castShadow = true;
    gondolaGroup.add(gondolaHull);

    for (const sx of [-0.62, 0.62]) {
      for (const sz of [-0.95, 0.95]) {
        const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.95, 8), trimMat);
        strut.position.set(sx, 0.72, sz);
        gondolaGroup.add(strut);
      }
    }
    for (const pz of [-0.75, 0, 0.75]) {
      for (const side of [-1, 1]) {
        const porthole = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), coreGlowMat);
        porthole.position.set(side * 0.76, 0.06, pz);
        gondolaGroup.add(porthole);
      }
    }

    // Twin Outrigger Engine Nacelles & Spinning Propellers
    const buildPropellerAssembly = (side: -1 | 1): THREE.Group => {
      const nacelle = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 1.1, 14), trimMat);
      nacelle.rotation.x = Math.PI / 2;
      nacelle.position.set(side * 1.48, 0.16, 0.15);
      gondolaGroup.add(nacelle);

      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.14, 0.22), trimMat);
      arm.position.set(side * 1.06, 0.16, 0.15);
      gondolaGroup.add(arm);

      const propGroup = new THREE.Group();
      propGroup.position.set(side * 1.48, 0.16, 0.78);
      const hub = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.34, 12), tailFinMat);
      hub.rotation.x = Math.PI / 2;
      propGroup.add(hub);
      for (let b = 0; b < 3; b++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.95, 0.05), creamStripeMat);
        const bang = (b * Math.PI * 2) / 3;
        blade.position.set(Math.sin(bang) * 0.42, Math.cos(bang) * 0.42, 0);
        blade.rotation.z = -bang;
        propGroup.add(blade);
      }
      gondolaGroup.add(propGroup);
      return propGroup;
    };
    const leftPropeller = buildPropellerAssembly(-1);
    const rightPropeller = buildPropellerAssembly(1);

    // Underside Drop-Pod Bay & Articulated Hinged Hatches
    const dropBayGroup = new THREE.Group();
    dropBayGroup.position.set(0, -0.46, 0);
    const bayGlowFrame = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.14, 1.52), coreGlowMat);
    dropBayGroup.add(bayGlowFrame);
    const dropHatchLeft = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.09, 1.42), trimMat);
    dropHatchLeft.position.set(-0.26, -0.08, 0);
    const dropHatchRight = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.09, 1.42), trimMat);
    dropHatchRight.position.set(0.26, -0.08, 0);
    dropBayGroup.add(dropHatchLeft);
    dropBayGroup.add(dropHatchRight);
    gondolaGroup.add(dropBayGroup);

    hullGroup.add(gondolaGroup);
    rootGroup.add(hullGroup);
    this.levelGroup.add(rootGroup);

    // Pre-allocate Reusable 3D Super Bobo Drop Pods
    this.airshipDropPods = [];
    for (let i = 0; i < 6; i++) {
      const podGroup = new THREE.Group();
      podGroup.visible = false;
      const capsuleBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.58, 0.68, 1.35, 16),
        hullMat
      );
      capsuleBody.position.y = 0.72;
      podGroup.add(capsuleBody);
      const podNose = new THREE.Mesh(new THREE.SphereGeometry(0.58, 14, 10), trimMat);
      podNose.position.y = 1.38;
      podGroup.add(podNose);
      const podRing = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.09, 8, 18), coreGlowMat);
      podRing.rotation.x = Math.PI / 2;
      podRing.position.y = 0.35;
      podGroup.add(podRing);
      const doorGroup = new THREE.Group();
      const podDoor = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.75, 0.12), creamStripeMat);
      podDoor.position.set(0, 0.68, -0.64);
      doorGroup.add(podDoor);
      podGroup.add(doorGroup);
      this.levelGroup.add(podGroup);

      this.airshipDropPods.push({
        active: false,
        phase: 'falling',
        startX: 0,
        startY: hoverY - 2.1,
        startZ,
        targetX: 0,
        targetZ: startZ,
        x: 0,
        y: hoverY - 2.1,
        z: startZ,
        timer: 0,
        duration: 0.55,
        group: podGroup,
        doorGroup,
      });
    }

    const airshipLabel = document.createElement('div');
    airshipLabel.className = 'nest-label payload-cart-label airship-mothership-label';
    const startDropCharge = this.state.getAirshipMilestoneBonus().startingDropCharge;
    airshipLabel.innerHTML = `${UI_ART.airshipEscort}<span>母舰 0% · 空投充能 ${startDropCharge}%</span>`;
    this.labelsContainer.appendChild(airshipLabel);

    const maxHp = level.airshipMaxHp || 520;
    const maxShield = level.airshipMaxShield || 220;
    this.airshipMothership = {
      active: true,
      escortTier: level.airshipEscortTier || 1,
      x: 0,
      y: hoverY,
      z: startZ,
      startZ,
      targetZ,
      speed: 0,
      hp: maxHp,
      maxHp,
      shield: maxShield,
      maxShield,
      shieldRegenDelay: 0,
      dropCharge: startDropCharge,
      escortBlueCount: 0,
      contestRedCount: 0,
      state: 'cruising',
      propellerPhase: 0,
      bayOpenAnim: 0,
      hitFlash: 0,
      flakHitsTaken: 0,
      rootGroup,
      hullGroup,
      gondolaGroup,
      leftPropeller,
      rightPropeller,
      dropBayGroup,
      dropHatchLeft,
      dropHatchRight,
      hullMat,
      trimMat,
      coreGlowMat,
      auraRingMesh,
      auraRingMat,
      labelEl: airshipLabel,
    };
  }

  public getAirshipProgressPct(): number {
    if (!this.airshipMothership) return 0;
    const span = Math.max(0.01, this.airshipMothership.startZ - this.airshipMothership.targetZ);
    const covered = THREE.MathUtils.clamp(
      this.airshipMothership.startZ - this.airshipMothership.z,
      0,
      span
    );
    return Math.round((covered / span) * 100);
  }

  public getAirshipStateLabel(): string {
    const st: AirshipEscortState = this.airshipMothership?.state || 'cruising';
    if (st === 'dropping_pod') return '空投超级冲击舱';
    if (st === 'overdrive') return '全速云翼突进';
    if (st === 'under_flak') return '防空炮火拦截';
    if (st === 'breached') return '已轰破要塞';
    return '巡航护航中';
  }

  public getAliveAntiAirTurretCount(): number {
    let count = 0;
    for (const aat of this.antiAirTurrets) {
      if (aat.alive) count++;
    }
    return count;
  }

  public damageAirshipMothership(dmg: number): void {
    const ship = this.airshipMothership;
    if (!ship || !ship.active || this.isStageEnded) return;
    const safeDmg = Math.max(1, dmg);
    ship.hitFlash = 1.0;
    ship.flakHitsTaken += 1;
    ship.shieldRegenDelay = 3.2;
    if (ship.shield > 0) {
      const absorbed = Math.min(ship.shield, safeDmg);
      ship.shield -= absorbed;
      const overflow = safeDmg - absorbed;
      if (overflow > 0) {
        ship.hp = Math.max(0, ship.hp - overflow);
      }
    } else {
      ship.hp = Math.max(0, ship.hp - safeDmg);
    }
    if (ship.hp <= 0 && ship.active) {
      ship.active = false;
      this.spawnBurstParticles(ship.x, ship.y, ship.z, 0xf43f5e, 60);
      this.finishStage(false);
    }
  }

  public damageAntiAirTurret(aat: AntiAirTurretRuntime, dmg: number, silent = false): boolean {
    if (!aat.alive) return false;
    aat.hp = Math.max(0, aat.hp - Math.max(1, dmg));
    aat.hitFlash = 1.0;
    if (aat.hp <= 0) {
      this.destroyAntiAirTurret(aat, silent);
      return true;
    }
    return false;
  }

  public destroyAntiAirTurret(aat: AntiAirTurretRuntime, silent = false): void {
    if (!aat.alive) return;
    aat.alive = false;
    aat.hp = 0;
    aat.group.visible = false;
    aat.labelEl.style.display = 'none';
    this.antiAirTurretsCleared += 1;

    const goldBonus = this.state.addGold(aat.cfg.rewardGold);
    this.state.championCharge = Math.min(100, this.state.championCharge + 30);

    if (this.airshipMothership?.active) {
      this.airshipMothership.dropCharge = Math.min(
        100,
        this.airshipMothership.dropCharge + aat.cfg.dropChargeBonus
      );
      this.deploySuperBoboDropPod(
        THREE.MathUtils.clamp(aat.cfg.x * 0.35, -3.2, 3.2),
        Math.max(BOSS_GATE_Z + 2.4, Math.min(this.airshipMothership.z - 2.6, aat.cfg.z - 1.2)),
        silent
      );
    }

    if (!silent) {
      sound.playExplosion();
      this.triggerScreenFlash('#38bdf8', 0.48);
      this.addCameraShake(0.55);
      this.spawnSkyPillar(aat.cfg.x, aat.cfg.z, 0x38bdf8, 2.4, 0.52);
      this.spawnShockwave(aat.cfg.x, aat.cfg.z, 0xfacc15, 6.0, 0.48);
      this.spawnBurstParticles(aat.cfg.x, 1.8, aat.cfg.z, 0x38bdf8, 52);
      this.spawnFloatingPopup(
        aat.cfg.x,
        2.6,
        aat.cfg.z,
        `拔除${aat.cfg.name}! +${goldBonus}金币`,
        '#38bdf8'
      );
      this.onBanner?.(
        `${UI_ART.airshipEscort} 拔除${aat.cfg.name}！`,
        `母舰空投舱紧急投送超级波波冲击兵 · 赏金 +${goldBonus} 金币`
      );
    }
  }

  public deploySuperBoboDropPod(targetX?: number, targetZ?: number, silent = false): boolean {
    const ship = this.airshipMothership;
    if (!ship || !ship.active) return false;
    const pod = this.airshipDropPods.find((p) => !p.active) || this.airshipDropPods[0];
    if (!pod) return false;

    const tx = THREE.MathUtils.clamp(
      targetX ?? ship.x + (Math.random() - 0.5) * 2.4,
      -TRACK_HALF_W + 1.8,
      TRACK_HALF_W - 1.8
    );
    const tz = THREE.MathUtils.clamp(
      targetZ ?? ship.z - 3.4,
      BOSS_GATE_Z + 1.8,
      PLAYER_Z - 3.2
    );

    pod.active = true;
    pod.phase = 'falling';
    pod.startX = ship.x;
    pod.startY = ship.y - 2.15;
    pod.startZ = ship.z;
    pod.targetX = tx;
    pod.targetZ = tz;
    pod.x = pod.startX;
    pod.y = pod.startY;
    pod.z = pod.startZ;
    pod.timer = 0;
    pod.duration = 0.52;
    pod.doorGroup.rotation.x = 0;
    pod.group.position.set(pod.x, pod.y, pod.z);
    pod.group.scale.setScalar(1);
    pod.group.visible = true;

    ship.bayOpenAnim = 1.0;
    ship.state = 'dropping_pod';
    this.airshipDropPodsDeployed += 1;

    if (!silent) {
      this.spawnBurstParticles(ship.x, ship.y - 2.1, ship.z, 0x38bdf8, 18);
    }
    return true;
  }

  private releaseSuperBoboDropPodSquad(pod: AirshipDropPodRuntime, silent = false): number {
    let spawned = 0;
    // 1 Giant Reinforced Shock Leader + 3 Armored Charged Shock Bobos!
    const leader = this.spawnUnit(
      'blue',
      'charged',
      pod.targetX,
      pod.targetZ,
      0,
      -8.2,
      undefined,
      true,
      2
    );
    if (leader) {
      leader.frostShield = true;
      leader.jellyGiant = true;
      leader.maxHp *= 1.55;
      leader.hp = leader.maxHp;
      leader.dmg *= 1.38;
      leader.spawnHop = 1.45;
      spawned++;
    }
    for (const ox of [-1.05, 0, 1.05]) {
      const trooper = this.spawnUnit(
        'blue',
        'charged',
        pod.targetX + ox,
        pod.targetZ + 0.55,
        ox * 0.8,
        -8.6,
        undefined,
        true,
        1
      );
      if (trooper) {
        trooper.frostShield = true;
        trooper.maxHp *= 1.35;
        trooper.hp = trooper.maxHp;
        trooper.dmg *= 1.22;
        trooper.spawnHop = 1.25;
        spawned++;
      }
    }

    // Touchdown shockwave also damages nearby Red enemies & AA turrets
    for (const rIdx of this.activeRedIndices) {
      const ru = this.units[rIdx];
      if (!ru || !ru.active) continue;
      const dx = ru.x - pod.targetX;
      const dz = ru.z - pod.targetZ;
      if (dx * dx + dz * dz <= 4.2 * 4.2) {
        ru.hp -= 48;
        if (ru.hp <= 0) {
          ru.active = false;
          this.onUnitKilled(ru);
        }
      }
    }

    if (!silent) {
      sound.playExplosion();
      this.addCameraShake(0.32);
      this.spawnSkyPillar(pod.targetX, pod.targetZ, 0x38bdf8, 2.2, 0.45);
      this.spawnShockwave(pod.targetX, pod.targetZ, 0x38bdf8, 5.4, 0.42);
      this.spawnBurstParticles(pod.targetX, 1.2, pod.targetZ, 0xfacc15, 36);
      this.spawnFloatingPopup(
        pod.targetX,
        2.3,
        pod.targetZ,
        `超级空投着陆! +${spawned}冲击兵`,
        '#fde047'
      );
    }
    return spawned;
  }

  private updateAirshipEscort(dt: number): void {
    const ship = this.airshipMothership;
    if (!ship || !ship.active) return;

    // 1. Count Blue escort squad & Red interceptors beneath the hovering airship
    let blueNear = 0;
    let redNear = 0;
    for (let i = 0; i < MAX_UNITS; i++) {
      const u = this.units[i];
      if (!u.active) continue;
      const dx = u.x - ship.x;
      const dz = u.z - ship.z;
      if (dx * dx + dz * dz <= 28.0) {
        if (u.team === 'blue') blueNear++;
        else redNear++;
      }
    }
    ship.escortBlueCount = blueNear;
    ship.contestRedCount = redNear;

    // 2. Update Enemy Anti-Air Flak Sub-Turrets (track & shell airship if uncontested!)
    let activeFlakLockCount = 0;
    for (const aat of this.antiAirTurrets) {
      if (!aat.alive) continue;
      if (aat.hitFlash > 0) {
        aat.hitFlash = Math.max(0, aat.hitFlash - dt * 5.0);
        const s = 1 + aat.hitFlash * 0.14;
        aat.gunMountGroup.scale.set(s, s, s);
      } else {
        aat.gunMountGroup.scale.set(1, 1, 1);
      }
      if (aat.recoilAnim > 0) {
        aat.recoilAnim = Math.max(0, aat.recoilAnim - dt * 4.5);
      }

      // Check if any Blue unit is contesting this AA turret closely
      let contested = false;
      for (const bIdx of this.activeBlueIndices) {
        const bu = this.units[bIdx];
        if (!bu || !bu.active) continue;
        const dx = bu.x - aat.cfg.x;
        const dz = bu.z - aat.cfg.z;
        if (dx * dx + dz * dz <= 3.1 * 3.1) {
          contested = true;
          break;
        }
      }
      aat.contestedByBlue = contested;

      // Aim AA turret toward airship
      const aimYaw = Math.atan2(ship.x - aat.cfg.x, ship.z - aat.cfg.z);
      aat.gunMountGroup.rotation.y = aimYaw;

      const distZ = Math.abs(ship.z - aat.cfg.z);
      if (!contested && distZ <= 14.5) {
        activeFlakLockCount++;
        aat.fireTimer -= dt;
        if (aat.fireTimer <= 0) {
          aat.fireTimer = aat.cfg.fireInterval;
          aat.recoilAnim = 1.0;
          this.spawnBurstParticles(aat.cfg.x, 2.2, aat.cfg.z, 0xf43f5e, 10);
          this.spawnBurstParticles(
            ship.x + (Math.random() - 0.5) * 1.4,
            ship.y - 0.5,
            ship.z + (Math.random() - 0.5) * 1.6,
            0xf97316,
            14
          );
          this.damageAirshipMothership(aat.cfg.flakDmg);
          if (this.isStageEnded || !ship.active) return;
        }
      }
    }

    // 3. Shield regeneration when out of flak fire
    if (ship.shieldRegenDelay > 0) {
      ship.shieldRegenDelay = Math.max(0, ship.shieldRegenDelay - dt);
    } else if (ship.shield < ship.maxShield) {
      ship.shield = Math.min(ship.maxShield, ship.shield + (14 + blueNear * 2.5) * dt);
    }

    // 4. Charge Underside Drop-Pod Bay from Blue Escort Squads & Auto-Deploy Super Bobo Drop Pod!
    const chargeGainPerSec = 5.5 + blueNear * 5.2;
    ship.dropCharge = Math.min(100, ship.dropCharge + chargeGainPerSec * dt);
    if (ship.dropCharge >= 100) {
      ship.dropCharge = Math.max(0, ship.dropCharge - 100);
      this.deploySuperBoboDropPod();
    }

    // 5. Update Falling / Landed 3D Super Bobo Drop Pods
    for (const pod of this.airshipDropPods) {
      if (!pod.active) continue;
      pod.timer += dt;
      if (pod.phase === 'falling') {
        const t = Math.min(1, pod.timer / Math.max(0.1, pod.duration));
        const ease = t * t;
        pod.x = THREE.MathUtils.lerp(pod.startX, pod.targetX, t);
        pod.z = THREE.MathUtils.lerp(pod.startZ, pod.targetZ, t);
        pod.y = THREE.MathUtils.lerp(pod.startY, 0.05, ease);
        pod.group.position.set(pod.x, pod.y, pod.z);
        pod.group.rotation.y += dt * 5.5;
        if (t >= 1) {
          pod.phase = 'landed_open';
          pod.timer = 0;
          pod.group.position.y = 0.05;
          pod.doorGroup.rotation.x = 1.25;
          this.releaseSuperBoboDropPodSquad(pod);
        }
      } else {
        const fade = Math.max(0.01, 1 - pod.timer / 0.85);
        pod.group.scale.setScalar(fade);
        if (pod.timer >= 0.85) {
          pod.active = false;
          pod.group.visible = false;
        }
      }
    }

    // 6. Compute Airship Cruising Speed & State
    const flakDragMult = activeFlakLockCount > 0 ? Math.max(0.42, 1 - activeFlakLockCount * 0.22) : 1.0;
    const baseCruise = 1.25 + Math.min(2.65, blueNear * 0.28);
    ship.speed = baseCruise * flakDragMult;
    ship.z = Math.max(ship.targetZ, ship.z - ship.speed * dt);

    if (ship.bayOpenAnim > 0) {
      ship.bayOpenAnim = Math.max(0, ship.bayOpenAnim - dt * 1.4);
      ship.state = 'dropping_pod';
    } else if (activeFlakLockCount > 0 && blueNear < 4) {
      ship.state = 'under_flak';
    } else if (blueNear >= 5) {
      ship.state = 'overdrive';
    } else {
      ship.state = 'cruising';
    }

    // 7. Animate Articulated 3D Toy-Craft Airship Parts (Propellers, Gondola Bobbing, Bay Hatches)
    const propRpm = ship.state === 'overdrive' ? 24.0 : 15.0;
    ship.propellerPhase += dt * propRpm;
    ship.leftPropeller.rotation.z = ship.propellerPhase;
    ship.rightPropeller.rotation.z = -ship.propellerPhase;

    if (ship.hitFlash > 0) {
      ship.hitFlash = Math.max(0, ship.hitFlash - dt * 5.0);
    }
    const hoverBob = Math.sin(this.elapsedTime * 2.8) * 0.16;
    const bankRoll = Math.sin(this.elapsedTime * 1.9) * 0.045 + ship.hitFlash * 0.08;
    ship.rootGroup.position.set(ship.x, 0, ship.z);
    ship.hullGroup.position.y = ship.y + hoverBob;
    ship.hullGroup.rotation.z = bankRoll;
    ship.dropHatchLeft.rotation.z = -ship.bayOpenAnim * 0.95;
    ship.dropHatchRight.rotation.z = ship.bayOpenAnim * 0.95;

    if (ship.state === 'under_flak') {
      ship.auraRingMat.color.setHex(0xf43f5e);
      ship.auraRingMat.opacity = 0.66;
    } else if (ship.state === 'overdrive' || ship.state === 'dropping_pod') {
      ship.auraRingMat.color.setHex(0xfacc15);
      ship.auraRingMat.opacity = 0.74;
    } else {
      ship.auraRingMat.color.setHex(0x38bdf8);
      ship.auraRingMat.opacity = 0.56;
    }

    // 8. Stronghold Breach Check!
    if (ship.z <= ship.targetZ || this.bossHp <= 0) {
      ship.state = 'breached';
      ship.active = false;
      this.bossHp = 0;
      this.spawnSkyPillar(0, BOSS_GATE_Z, 0x38bdf8, 3.8, 0.76);
      this.spawnShockwave(0, BOSS_GATE_Z + 1.0, 0xfacc15, 10.5, 0.7);
      this.spawnBurstParticles(0, 3.2, BOSS_GATE_Z + 1.0, 0x38bdf8, 95);
      this.finishStage(true);
    }
  }

  public runMc9SelfCheck(): {
    ok: boolean;
    airshipSpawnedWithAntiAirTurrets: boolean;
    uncontestedFlakDamagedAirship: boolean;
    blueSquadNeutralizedAntiAirAndDroppedPod: boolean;
    dropPodSpawnedShockTroops: boolean;
    escortVictoryPersistedMedalsAndMilestones: boolean;
    cannonModsUnlockedUpgradedAndPersisted: boolean;
    overdriveBoostedCadenceAndDoubleTapped: boolean;
    prismRefractedChargedBobos: boolean;
    heavyMortarLaunchedArmoredSiegeBobo: boolean;
    cannonBarrelModVisualsSwitched3D: boolean;
  } {
    const prevPaused = this.isPaused;
    const prevLevel = this.currentLevel;
    const prevGold = this.state.gold;
    const prevMedals = this.state.airshipWingMedals;
    const prevLifeMedals = this.state.lifetimeAirshipWingMedals;
    const prevClears = this.state.airshipEscortClears;
    const prevBestPct = this.state.bestAirshipProgressPct;
    const prevBestSec = this.state.bestAirshipClearSec;
    const prevDropPods = this.state.totalAirshipDropPods;
    const prevAaCleared = this.state.totalAntiAirTurretsCleared;
    const prevModLevels = { ...this.state.cannonModLevels };
    const prevActiveMod = this.state.activeCannonMod;
    const prevBursts = this.state.totalCannonModBursts;

    this.isPaused = true;

    // 1. Load Airship Mothership Escort Level -> Verify 3D Airship + 4 Anti-Air Sub-Turrets
    const airLevel = generateAirshipEscortLevel(1);
    this.loadLevel(airLevel);
    const ship = this.airshipMothership;
    const airshipSpawnedWithAntiAirTurrets = Boolean(
      airLevel.isAirshipEscort &&
        airLevel.mode === 'airship_escort' &&
        ship &&
        ship.active &&
        this.antiAirTurrets.length === 4
    );

    // 2. Uncontested Anti-Air Flak Sub-Turret shells the Airship
    for (const u of this.units) u.active = false;
    const initialPool = (ship?.hp || 0) + (ship?.shield || 0);
    if (this.antiAirTurrets[0] && ship) {
      ship.z = this.antiAirTurrets[0].cfg.z + 3.0;
      this.antiAirTurrets[0].fireTimer = 0.02;
    }
    this.updateAirshipEscort(0.05);
    const afterFlakPool = (ship?.hp || 0) + (ship?.shield || 0);
    const uncontestedFlakDamagedAirship = afterFlakPool < initialPool && (ship?.flakHitsTaken || 0) >= 1;

    // 3. Blue Bobo squad neutralizes Anti-Air Sub-Turret -> Deploys Super Bobo Drop Pod -> Releases Reinforced Shock Troops
    const firstAa = this.antiAirTurrets[0];
    if (firstAa) {
      this.damageAntiAirTurret(firstAa, firstAa.hp + 50, true);
    }
    const blueSquadNeutralizedAntiAirAndDroppedPod =
      Boolean(firstAa && !firstAa.alive) &&
      this.antiAirTurretsCleared >= 1 &&
      this.airshipDropPodsDeployed >= 1;

    let blueActiveBeforeLand = 0;
    for (const u of this.units) {
      if (u.active && u.team === 'blue') blueActiveBeforeLand++;
    }
    for (let step = 0; step < 12; step++) {
      this.updateAirshipEscort(0.06);
    }
    let blueActiveAfterLand = 0;
    let giantShockFound = false;
    for (const u of this.units) {
      if (u.active && u.team === 'blue') {
        blueActiveAfterLand++;
        if (u.frostShield && (u.isMiniGiant || u.jellyGiant)) giantShockFound = true;
      }
    }
    const dropPodSpawnedShockTroops =
      blueActiveAfterLand >= blueActiveBeforeLand + 4 && giantShockFound;

    // 4. Escort Victory Settlement -> Persists `airshipWingMedals` & Unlocks Global Passive Milestones
    this.state.airshipWingMedals = 0;
    this.state.lifetimeAirshipWingMedals = 0;
    this.state.airshipEscortClears = 0;
    const baseMilestone = this.state.getAirshipMilestoneBonus(0);
    const escortRec = this.state.recordAirshipEscortResult(true, 100, 3, 2, 19.4);
    const savedAfterEscort = JSON.parse(
      localStorage.getItem('swarm_control_3d_save_v3') || '{}'
    ) as { airshipWingMedals?: number; airshipEscortClears?: number };
    const boostedMilestone = this.state.getAirshipMilestoneBonus();
    const escortVictoryPersistedMedalsAndMilestones =
      escortRec.victory &&
      escortRec.medalsAwarded >= 4 &&
      this.state.airshipWingMedals === escortRec.medalsAwarded &&
      savedAfterEscort.airshipWingMedals === escortRec.medalsAwarded &&
      savedAfterEscort.airshipEscortClears === 1 &&
      boostedMilestone.fireRateMult > baseMilestone.fireRateMult &&
      boostedMilestone.troopHpMult > baseMilestone.troopHpMult &&
      boostedMilestone.startingDropCharge > baseMilestone.startingDropCharge;

    // 5. Steam Cannon Core Module Workbench: Unlock/Upgrade all 3 modules (Lv.1..5), Equip, Persist & Fire in Battle!
    this.state.gold = 25000;
    this.state.airshipWingMedals = 30;
    this.state.cannonModLevels = {
      overdrive_breech: 1,
      prism_splitter: 0,
      heavy_mortar: 0,
    };
    this.state.activeCannonMod = 'overdrive_breech';
    const baseFireNoOverdrive = (() => {
      this.state.cannonModLevels.overdrive_breech = 0;
      const r = this.state.getFireRatePerSec();
      this.state.cannonModLevels.overdrive_breech = 1;
      return r;
    })();
    const upOverdrive = this.state.upgradeCannonMod('overdrive_breech', 'medal');
    const unlockPrism = this.state.upgradeCannonMod('prism_splitter', 'medal');
    const upPrism = this.state.upgradeCannonMod('prism_splitter', 'gold');
    const unlockMortar = this.state.upgradeCannonMod('heavy_mortar', 'gold');
    const upMortar = this.state.upgradeCannonMod('heavy_mortar', 'medal');
    const eqMortar = this.state.equipCannonMod('heavy_mortar');
    const savedMods = JSON.parse(
      localStorage.getItem('swarm_control_3d_save_v3') || '{}'
    ) as {
      activeCannonMod?: CannonCoreModId;
      cannonModLevels?: Record<CannonCoreModId, number>;
    };
    const cannonModsUnlockedUpgradedAndPersisted =
      upOverdrive.upgraded &&
      unlockPrism.upgraded &&
      unlockPrism.wasUnlock &&
      upPrism.upgraded &&
      unlockMortar.upgraded &&
      unlockMortar.wasUnlock &&
      upMortar.upgraded &&
      eqMortar &&
      savedMods.activeCannonMod === 'heavy_mortar' &&
      (savedMods.cannonModLevels?.overdrive_breech || 0) >= 2 &&
      (savedMods.cannonModLevels?.prism_splitter || 0) >= 2 &&
      (savedMods.cannonModLevels?.heavy_mortar || 0) >= 2;

    // 5A. Overdrive Breech: cadence boost + rapid double-tap burst + 3D barrel attachment
    this.state.equipCannonMod('overdrive_breech');
    this.syncCannonCoreModule3D();
    const visOverdrive =
      this.cannonModOverdriveGroup.visible &&
      !this.cannonModPrismGroup.visible &&
      !this.cannonModHeavyMortarGroup.visible;
    const fireWithOverdrive = this.state.getFireRatePerSec();
    for (const u of this.units) u.active = false;
    this.cannonModShotCounter = 0;
    this.cannonModStats.overdriveBurstsTriggered = 0;
    for (let s = 0; s < 4; s++) this.fireTurret();
    let overdriveTagged = 0;
    for (const u of this.units) {
      if (u.active && u.cannonModTag === 'overdrive_breech') overdriveTagged++;
    }
    const overdriveBoostedCadenceAndDoubleTapped =
      fireWithOverdrive > baseFireNoOverdrive &&
      this.cannonModStats.overdriveBurstsTriggered >= 1 &&
      overdriveTagged >= 2;

    // 5B. Prism Splitter: refracts angled twin/triple prism-charged Bobos + 3D crystal lens
    this.state.cannonModLevels.prism_splitter = 3;
    this.state.equipCannonMod('prism_splitter');
    this.syncCannonCoreModule3D();
    const visPrism =
      !this.cannonModOverdriveGroup.visible &&
      this.cannonModPrismGroup.visible &&
      !this.cannonModHeavyMortarGroup.visible;
    for (const u of this.units) u.active = false;
    this.cannonModShotCounter = 0;
    this.cannonModStats.prismSplitsTriggered = 0;
    for (let s = 0; s < 4; s++) this.fireTurret();
    let prismChargedCount = 0;
    for (const u of this.units) {
      if (u.active && u.cannonModTag === 'prism_splitter' && u.kind === 'charged') {
        prismChargedCount++;
      }
    }
    const prismRefractedChargedBobos =
      this.cannonModStats.prismSplitsTriggered >= 1 && prismChargedCount >= 3;

    // 5C. Heavy Mortar: launches heavy armored/giant mortar Bobo dealing bonus turret/siege damage + 3D shroud
    this.state.cannonModLevels.heavy_mortar = 4;
    this.state.equipCannonMod('heavy_mortar');
    this.syncCannonCoreModule3D();
    const visMortar =
      !this.cannonModOverdriveGroup.visible &&
      !this.cannonModPrismGroup.visible &&
      this.cannonModHeavyMortarGroup.visible;
    for (const u of this.units) u.active = false;
    this.cannonModShotCounter = 0;
    this.cannonModStats.heavyMortarsLaunched = 0;
    for (let s = 0; s < 4; s++) this.fireTurret();
    let mortarBobo: Unit | null = null;
    for (const u of this.units) {
      if (u.active && u.cannonModTag === 'heavy_mortar') {
        mortarBobo = u;
        break;
      }
    }
    const heavyMortarLaunchedArmoredSiegeBobo = Boolean(
      this.cannonModStats.heavyMortarsLaunched >= 1 &&
        mortarBobo &&
        mortarBobo.isMiniGiant &&
        mortarBobo.frostShield &&
        (mortarBobo.mortarSiegeBonusMult || 1) > 2.0
    );
    const cannonBarrelModVisualsSwitched3D = visOverdrive && visPrism && visMortar;

    // Restore original state cleanly
    for (const u of this.units) u.active = false;
    this.state.gold = prevGold;
    this.state.airshipWingMedals = prevMedals;
    this.state.lifetimeAirshipWingMedals = prevLifeMedals;
    this.state.airshipEscortClears = prevClears;
    this.state.bestAirshipProgressPct = prevBestPct;
    this.state.bestAirshipClearSec = prevBestSec;
    this.state.totalAirshipDropPods = prevDropPods;
    this.state.totalAntiAirTurretsCleared = prevAaCleared;
    this.state.cannonModLevels = prevModLevels;
    this.state.activeCannonMod = prevActiveMod;
    this.state.totalCannonModBursts = prevBursts;
    this.state.save();
    if (prevLevel) {
      this.loadLevel(prevLevel);
    }
    this.syncCannonCoreModule3D();
    this.applySkin(this.state.getEquippedSkin());
    this.isPaused = prevPaused;

    return {
      ok:
        airshipSpawnedWithAntiAirTurrets &&
        uncontestedFlakDamagedAirship &&
        blueSquadNeutralizedAntiAirAndDroppedPod &&
        dropPodSpawnedShockTroops &&
        escortVictoryPersistedMedalsAndMilestones &&
        cannonModsUnlockedUpgradedAndPersisted &&
        overdriveBoostedCadenceAndDoubleTapped &&
        prismRefractedChargedBobos &&
        heavyMortarLaunchedArmoredSiegeBobo &&
        cannonBarrelModVisualsSwitched3D,
      airshipSpawnedWithAntiAirTurrets,
      uncontestedFlakDamagedAirship,
      blueSquadNeutralizedAntiAirAndDroppedPod,
      dropPodSpawnedShockTroops,
      escortVictoryPersistedMedalsAndMilestones,
      cannonModsUnlockedUpgradedAndPersisted,
      overdriveBoostedCadenceAndDoubleTapped,
      prismRefractedChargedBobos,
      heavyMortarLaunchedArmoredSiegeBobo,
      cannonBarrelModVisualsSwitched3D,
    };
  }

  private applyGateEffect(u: Unit, g: GateRuntime): void {
    const { op, value } = g.cfg;
    const gateRank1 = this.state.getSkillNodeRank('gate_t1');
    const reverseHitGain = 1 + gateRank1;
    const hazardDmgMult = gateRank1 > 0 ? 0.6 : 1.0;
    const giantSpec = this.state.getGiantTrooperSpec();
    const swarmSpec = this.state.getSwarmTrooperSpec();
    const uTier = u.fusionTier || 0;

    if (op === 'giant_jelly') {
      if (!u.jellyGiant) {
        u.jellyGiant = true;
        u.maxHp *= 2.0;
        u.hp *= 2.0;
        u.dmg *= 2.0;
        u.radius = Math.min(0.72, u.radius * 1.32);
        u.spawnHop = Math.max(u.spawnHop, 0.62);
      }
      sound.playCloneGate(2);
      this.spawnBurstParticles(u.x, 0.9, g.cfg.z, 0xfb7185, 12);
      if (this.gatePopupCooldown <= 0) {
        this.gatePopupCooldown = 0.28;
        this.spawnFloatingPopup(u.x, 1.9, g.cfg.z, '果冻巨化 血攻×2!', '#fda4af');
      }
      return;
    }

    if (op === 'frost_shield') {
      u.frostShield = true;
      u.spawnHop = Math.max(u.spawnHop, 0.45);
      sound.playCloneGate(2);
      this.spawnBurstParticles(u.x, 0.9, g.cfg.z, 0x7dd3fc, 12);
      if (this.gatePopupCooldown <= 0) {
        this.gatePopupCooldown = 0.28;
        this.spawnFloatingPopup(u.x, 1.9, g.cfg.z, '糖霜护盾 免疫1次!', '#7dd3fc');
      }
      return;
    }

    if (op === 'sub') {
      let hitGain = reverseHitGain;
      if (u.kind === 'champion') {
        u.hp = Math.max(1, u.hp - u.maxHp * 0.28 * hazardDmgMult);
        hitGain = 2 * reverseHitGain;
      } else if (uTier >= 2 || u.jellyGiant) {
        u.hp -= u.maxHp * 0.42 * hazardDmgMult;
        if (u.hp <= 0) u.active = false;
        hitGain = 2 * reverseHitGain;
      } else if (uTier === 1) {
        u.hp -= u.maxHp * 0.65 * hazardDmgMult;
        if (u.hp <= 0) u.active = false;
        hitGain = 1.5 * reverseHitGain;
      } else {
        if (gateRank1 > 0 && Math.random() < gateRank1 * 0.14) {
          u.hp = Math.max(1, u.hp * 0.65);
        } else {
          u.active = false;
        }
        if (value >= 3 && gateRank1 === 0) {
          for (const idx of this.activeBlueIndices) {
            const ally = this.units[idx];
            if (!ally.active || ally === u || ally.kind === 'champion' || (ally.fusionTier || 0) >= 1) continue;
            const dSq = (ally.x - u.x) * (ally.x - u.x) + (ally.z - u.z) * (ally.z - u.z);
            if (dSq <= 1.2) {
              ally.active = false;
              this.spawnBurstParticles(ally.x, 0.6, ally.z, 0xff2a55, 3);
              break;
            }
          }
        }
      }
      this.state.championCharge = Math.max(0, this.state.championCharge - 0.8 * hazardDmgMult);
      sound.playGearGrind();
      this.spawnBurstParticles(u.x, 0.6, u.z, 0xff2a55, 6);
      this.chargeGate(g, hitGain);
      return;
    }

    if (op === 'div') {
      let hitGain = reverseHitGain;
      if (u.kind === 'champion') {
        u.hp = Math.max(1, u.hp - u.maxHp * 0.32 * hazardDmgMult);
        hitGain = 2 * reverseHitGain;
      } else if (uTier >= 2 || u.jellyGiant) {
        u.hp -= u.maxHp * 0.45 * hazardDmgMult;
        if (u.hp <= 0) u.active = false;
        hitGain = 2 * reverseHitGain;
      } else if (uTier === 1) {
        u.hp -= u.maxHp * 0.55 * hazardDmgMult;
        if (u.hp <= 0) u.active = false;
        hitGain = 1.5 * reverseHitGain;
      } else {
        if (u.id % Math.max(2, value) !== 0 && !(gateRank1 > 0 && Math.random() < gateRank1 * 0.14)) {
          u.active = false;
          sound.playGearGrind();
          this.spawnBurstParticles(u.x, 0.6, u.z, 0xff2a55, 6);
        } else {
          u.hp = Math.max(1, u.hp * 0.75);
          this.spawnBurstParticles(u.x, 0.6, u.z, 0xf97316, 4);
        }
      }
      this.state.championCharge = Math.max(0, this.state.championCharge - 0.6 * hazardDmgMult);
      this.chargeGate(g, hitGain);
      return;
    }

    // Titan Champion heals slightly when passing through a friendly gate instead of cloning
    if (u.kind === 'champion') {
      u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.16);
      this.spawnBurstParticles(u.x, 1.0, g.cfg.z, 0x00f0ff, 5);
      return;
    }

    // Responsive cooldowns so Blue streams multiply generously through +N and xN gates
    if (op === 'add') {
      if (g.addCooldown > 0) return;
      g.addCooldown = 0.09;
      const gateRank2 = this.state.getSkillNodeRank('gate_t2');
      const addHit = (uTier >= 2 ? 1.5 : 1) + gateRank1 * 0.4 + gateRank2 * 0.55;
      this.chargeGate(g, addHit);
    } else if (op === 'mul') {
      if (g.addCooldown > 0) return;
      g.addCooldown = 0.02;
    }

    sound.playCloneGate(value);
    const chargeMult = this.state.getSkillChargeMultiplier() * (giantSpec.isGiantMode ? 1.45 : 1.0);
    this.state.championCharge = Math.min(100, this.state.championCharge + (op === 'mul' ? 0.55 : 0.32) * chargeMult);
    // Slower Orbital Strike charge rate so it feels like a heavy Ultimate cooldown!
    this.state.orbitalCharge = Math.min(100, this.state.orbitalCharge + (op === 'mul' ? 0.16 : 0.09) * chargeMult);

    const gateResonance = op === 'add' ? this.state.getGateBonusAdd() : 0;
    const isGateCrit = this.state.getSkillNodeRank('gate_t4') > 0 && Math.random() < 0.22;
    const isSwarmBonusClone =
      swarmSpec.gateExtraCloneChance > 0 && Math.random() < swarmSpec.gateExtraCloneChance;
    const isCarnivalBonusClone = this.currentTheme.id === 'cyberhive' && Math.random() < 0.3;
    const maxCapCopies = 6 + this.state.getSkillNodeRank('gate_t2');
    const baseCopies = Math.min(
      maxCapCopies,
      (op === 'add' ? value + gateResonance : value - 1) +
        (isSwarmBonusClone ? 1 : 0) +
        (isCarnivalBonusClone ? 1 : 0)
    );
    const rawExtraCopies = isGateCrit ? Math.min(maxCapCopies + 2, baseCopies * 2) : baseCopies;
    // In Giant Mode, each spawned Giant is already ~2.2x normal mass, so gates spawn fewer heavy clones (max 3) at Tier 1!
    const extraCopies = giantSpec.isGiantMode
      ? Math.max(1, Math.min(3, Math.ceil(rawExtraCopies * 0.6)))
      : rawExtraCopies;
    if (isGateCrit && Math.random() < 0.45) {
      this.spawnFloatingPopup(u.x, 1.9, g.cfg.z, `👑 炼金暴击 ×2!`, '#22d3ee');
    }

    // Gate T3: Phase Coating grants +16%/32%/48% bonus HP shield AND +10%/20%/30% DMG on gate pass!
    const gateRank3 = this.state.getSkillNodeRank('gate_t3');
    const phaseShieldMult = 1 + gateRank3 * 0.16;
    const phaseDmgMult = 1 + gateRank3 * 0.1;
    const techBonuses = this.state.getBoboTechCombatBonuses();
    if (techBonuses.gateSurgeDuration > 0) {
      u.vanguardSurgeTimer = Math.max(u.vanguardSurgeTimer || 0, techBonuses.gateSurgeDuration);
    }
    if (gateRank3 > 0) {
      u.maxHp *= phaseShieldMult;
      u.hp = u.maxHp;
      u.dmg *= phaseDmgMult;
    }

    for (let c = 0; c < extraCopies; c++) {
      const offsetX = (Math.random() - 0.5) * Math.min(g.cfg.width * 0.72, 2.4);
      const offsetZ = -0.15 - Math.random() * 0.65;
      const spreadVX = (Math.random() - 0.5) * (giantSpec.isGiantMode ? 3.2 : 4.6);
      const clone = this.spawnUnit(
        'blue',
        uTier >= 2 ? 'normal' : u.kind,
        THREE.MathUtils.clamp(u.x + offsetX, g.currentX - g.cfg.width * 0.45, g.currentX + g.cfg.width * 0.45),
        u.z + offsetZ,
        spreadVX,
        -u.speed,
        u.passedGates,
        Boolean(u.isMiniGiant),
        giantSpec.isGiantMode ? 1 : u.fusionTier
      );
      if (clone) {
        if (techBonuses.gateSurgeDuration > 0) {
          clone.vanguardSurgeTimer = techBonuses.gateSurgeDuration;
        }
        if (gateRank3 > 0) {
          clone.maxHp *= phaseShieldMult;
          clone.hp = clone.maxHp;
          clone.dmg *= phaseDmgMult;
        }
        if (u.jellyGiant) {
          clone.jellyGiant = true;
          clone.maxHp *= 2.0;
          clone.hp *= 2.0;
          clone.dmg *= 2.0;
          clone.radius = Math.min(0.72, clone.radius * 1.32);
        }
        if (u.frostShield) {
          clone.frostShield = true;
        }
      }
    }

    const fxColor = g.cfg.style === 'mega' ? 0xd946ef : 0x00f0ff;
    this.spawnBurstParticles(u.x, 0.75, g.cfg.z, fxColor, op === 'mul' ? 16 : 9);
    if (op === 'mul') {
      this.spawnShockwave(u.x, g.cfg.z, fxColor, 3.2, 0.34);
      if (Math.random() < 0.6) {
        this.spawnSkyPillar(u.x, g.cfg.z, fxColor, 1.35, 0.3);
      }
      if (Math.random() < 0.35) {
        this.spawnFloatingPopup(
          u.x,
          1.6,
          g.cfg.z,
          `×${value}!`,
          g.cfg.style === 'mega' ? '#f0abfc' : '#67e8f9'
        );
      }
    } else if (Math.random() < 0.55) {
      this.spawnShockwave(u.x, g.cfg.z, fxColor, 2.1, 0.28);
    }
  }

  private onUnitKilled(u: Unit, killer?: Unit): void {
    if (u.team === 'red') {
      const chargeMult = this.state.getSkillChargeMultiplier();
      this.state.stageMutantsKilled++;
      this.state.runKillsPool++;

      // Track Kill-Streak Adrenaline Frenzy (Pillar 4)
      this.killStreakCount++;
      this.killStreakWindowTimer = 3.8;
      if (this.killStreakCount >= this.nextStreakMilestone) {
        this.adrenalineTimer = 5.0;
        sound.playKillStreak();
        this.triggerScreenFlash('#facc15', 0.52);
        this.addCameraShake(0.55);
        this.spawnSkyPillar(this.turretX, PLAYER_Z - 1.2, 0xfacc15, 2.4, 0.48);
        this.spawnShockwave(this.turretX, PLAYER_Z - 1.2, 0xfacc15, 5.2, 0.5);
        this.spawnBurstParticles(this.turretX, 1.2, PLAYER_Z - 1.2, 0xfacc15, 48);
        this.spawnFloatingPopup(this.turretX, 2.2, PLAYER_Z - 1.5, `🔥 ${this.killStreakCount} 连杀!`, '#facc15');
        this.onBanner?.(`🔥 ${this.killStreakCount} 连杀狂暴！`, '');
        this.nextStreakMilestone =
          this.nextStreakMilestone === 25 ? 50 : this.nextStreakMilestone === 50 ? 80 : this.nextStreakMilestone + 40;
      }

      const isElite = u.kind === 'brute' || u.kind === 'shaman';
      this.state.championCharge = Math.min(100, this.state.championCharge + (isElite ? 5.5 : 0.55) * chargeMult);
      this.state.orbitalCharge = Math.min(100, this.state.orbitalCharge + (isElite ? 1.8 : 0.16) * chargeMult);
      this.state.subWeaponCharge = Math.min(100, this.state.subWeaponCharge + (isElite ? 3.2 : 0.65) * chargeMult);

      const ty1 = this.state.getSkillNodeRank('tycoon_t1');
      const ty3 = this.state.getSkillNodeRank('tycoon_t3');
      const isGoldenKill = ty3 > 0 && killer?.kind === 'charged';
      const tycoonEliteBonus = ty1 * 8;
      if (u.kind === 'brute') {
        const gold = this.state.addGold(25 + tycoonEliteBonus);
        this.addCameraShake(0.42);
        this.spawnSkyPillar(u.x, u.z, 0xfacc15, 2.1, 0.46);
        this.spawnShockwave(u.x, u.z, 0xfacc15, 4.4, 0.46);
        this.spawnShockwave(u.x, u.z, 0xffffff, 2.6, 0.3);
        this.spawnBurstParticles(u.x, 1.0, u.z, 0xfacc15, 45);
        this.spawnBurstParticles(u.x, 1.2, u.z, 0xff2a55, 20);
        this.spawnFloatingPopup(u.x, 1.5, u.z, `+${gold} 🪙`, '#facc15');
      } else if (u.kind === 'shaman') {
        const gold = this.state.addGold(18 + tycoonEliteBonus);
        this.addCameraShake(0.32);
        this.spawnSkyPillar(u.x, u.z, 0xd946ef, 1.8, 0.42);
        this.spawnShockwave(u.x, u.z, 0xd946ef, 3.8, 0.42);
        this.spawnBurstParticles(u.x, 1.0, u.z, 0xd946ef, 36);
        this.spawnFloatingPopup(u.x, 1.5, u.z, `+${gold} 🪙`, '#e879f9');
      } else if (u.kind === 'baneling') {
        // When sniped/melted before touching a marine, Baneling pops in a harmless green puff + bonus gold!
        this.state.addGold(2 + ty1);
        this.spawnShockwave(u.x, u.z, 0x84cc16, 2.3, 0.32);
        this.spawnBurstParticles(u.x, 0.6, u.z, 0x84cc16, 22);
      } else {
        this.spawnBurstParticles(u.x, 0.6, u.z, 0xff2a55, 8);
        const dropChance = isGoldenKill ? 1.0 : Math.min(1.0, 0.25 + (ty1 > 0 ? 0.12 : 0) + ty3 * 0.15);
        if (Math.random() < dropChance) {
          this.state.addGold(1 + (ty1 > 0 ? 1 : 0) + (isGoldenKill ? 1 : 0));
          this.spawnShockwave(u.x, u.z, isGoldenKill || ty1 > 0 ? 0xfacc15 : 0xff2a55, 1.6, 0.24);
        }
      }
    } else {
      this.spawnBurstParticles(u.x, 0.6, u.z, 0x00f0ff, 5);
      // Swarm T3: Plasma Kamikaze (Blue trooper detonates on death; dying Titan explodes into 6-10 clones!)
      const kamikazeRank = this.state.getSkillNodeRank('swarm_t3');
      if (kamikazeRank > 0) {
        if (u.kind === 'champion') {
          this.spawnSkyPillar(u.x, u.z, 0x38bdf8, 2.2, 0.45);
          this.spawnShockwave(u.x, u.z, 0x38bdf8, 5.2, 0.45);
          this.spawnBurstParticles(u.x, 1.2, u.z, 0x38bdf8, 45);
          const isT4 = this.state.getSkillNodeRank('swarm_t4') > 0;
          const burstClones = 4 + kamikazeRank * 2;
          for (let c = 0; c < burstClones; c++) {
            const ang = (c / burstClones) * Math.PI * 2;
            const clone = this.spawnUnit(
              'blue',
              isT4 ? 'charged' : 'normal',
              u.x + Math.cos(ang) * 0.9,
              u.z + Math.sin(ang) * 0.9,
              Math.cos(ang) * 3.5,
              -8.5,
              u.passedGates
            );
            if (clone) clone.spawnHop = 1.5;
          }
          this.spawnFloatingPopup(u.x, 2.2, u.z, `🌊 泰坦殉爆裂变 +${burstClones}兵!`, '#38bdf8');
        } else {
          this.spawnShockwave(u.x, u.z, 0x38bdf8, 2.15, 0.24);
          const splashDmg = u.dmg * (0.28 + kamikazeRank * 0.22);
          for (const rIdx of this.activeRedIndices) {
            const enemy = this.units[rIdx];
            if (!enemy.active) continue;
            if ((enemy.x - u.x) ** 2 + (enemy.z - u.z) ** 2 <= 2.15 * 2.15) {
              enemy.hp -= splashDmg;
              if (enemy.hp <= 0) {
                enemy.active = false;
                this.onUnitKilled(enemy);
              }
            }
          }
        }
      }
    }
  }

  private finishStage(victory: boolean): void {
    if (this.isStageEnded) return;
    this.isStageEnded = true;
    this.lastStageVictory = victory;
    sound.setBgmDanger(0);
    if (victory) {
      this.victoryClimaxTimer = 1.25;
      sound.playExplosion();
      sound.playVictoryFanfare();
      this.triggerContinuousQuake(1.25, 1.55);
      this.triggerScreenFlash('#facc15', 0.92);

      // Vaporize remaining Red units in celebratory golden bursts & make Blue army cheer!
      for (const u of this.units) {
        if (!u.active) continue;
        if (u.team === 'red') {
          u.active = false;
          if (Math.random() < 0.45) {
            this.spawnBurstParticles(u.x, 0.8, u.z, 0xfacc15, 6);
          }
        } else {
          u.spawnHop = 1.4;
        }
      }

      this.spawnSkyPillar(0, BOSS_GATE_Z, 0xfacc15, 4.4, 0.78);
      this.spawnSkyPillar(-4.8, BOSS_GATE_Z + 1.5, 0x00f0ff, 2.8, 0.65);
      this.spawnSkyPillar(4.8, BOSS_GATE_Z + 1.5, 0x00f0ff, 2.8, 0.65);
      this.spawnSkyPillar(-2.6, BOSS_GATE_Z - 1.0, 0xd946ef, 2.4, 0.6);
      this.spawnSkyPillar(2.6, BOSS_GATE_Z - 1.0, 0xd946ef, 2.4, 0.6);
      this.spawnShockwave(0, BOSS_GATE_Z, 0xfacc15, 17.5, 0.78);
      this.spawnShockwave(0, BOSS_GATE_Z, 0x00f0ff, 13.0, 0.62);
      this.spawnShockwave(0, BOSS_GATE_Z, 0xd946ef, 9.5, 0.5);
      const rewardGiven = this.state.addGold(this.currentLevel.rewardGold);
      this.spawnBurstParticles(0, 3.0, BOSS_GATE_Z - 1.0, 0xfacc15, 135);
      this.spawnBurstParticles(-3.5, 2.2, BOSS_GATE_Z + 0.8, 0x00f0ff, 75);
      this.spawnBurstParticles(3.5, 2.2, BOSS_GATE_Z + 0.8, 0xd946ef, 75);
      this.spawnFloatingPopup(0, 3.6, BOSS_GATE_Z + 1.0, `🏆 母巢崩塌! +${rewardGiven} 🪙`, '#facc15');
      this.onBanner?.('🏆 母巢核心灰飞烟灭 · 战役大捷！', `🎉 通关赏金 +${rewardGiven} 🪙 · 全军欢呼！`);

      // Schedule 4 sequential Victory Firework & Meltdown Waves across the bridge during the 1.25s climax!
      const victoryWaves: Array<{ delay: number; z: number; flash: string; col1: number; col2: number }> = [
        { delay: 0.22, z: BOSS_GATE_Z + 2.5, flash: '#00f0ff', col1: 0x00f0ff, col2: 0xfacc15 },
        { delay: 0.48, z: -6.0, flash: '#facc15', col1: 0xfacc15, col2: 0xd946ef },
        { delay: 0.75, z: 2.0, flash: '#d946ef', col1: 0xd946ef, col2: 0x00f0ff },
        { delay: 1.02, z: 9.5, flash: '#facc15', col1: 0xfacc15, col2: 0x22c55e },
      ];
      victoryWaves.forEach((vw, idx) => {
        this.skillWaveQueue.push({
          delay: vw.delay,
          exec: () => {
            sound.playExplosion();
            if (idx === victoryWaves.length - 1) {
              sound.playVictoryFanfare();
            }
            this.addCameraShake(1.15);
            this.triggerScreenFlash(vw.flash, 0.72);
            for (const lx of [-5.8, -2.2, 2.2, 5.8]) {
              const col = lx < 0 ? vw.col1 : vw.col2;
              this.spawnSkyPillar(lx, vw.z + (Math.random() - 0.5) * 1.5, col, 2.6, 0.58);
              this.spawnShockwave(lx, vw.z, col, 6.8, 0.52);
              this.spawnBurstParticles(lx, 1.8, vw.z, col, 42);
            }
            this.spawnShockwave(0, vw.z, vw.col1, 15.5, 0.65);
          },
        });
      });
    } else {
      this.onStageEnd?.(false);
    }
  }

  private updateParticles(dt: number): void {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }
      p.vy -= 18.0 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      if (p.y <= 0.08 && p.vy < 0) {
        p.y = 0.08;
        p.vy = -p.vy * 0.48;
        p.vx *= 0.82;
        p.vz *= 0.82;
      }
    }

    for (let i = 0; i < MAX_SHOCKWAVES; i++) {
      const sw = this.shockwaves[i];
      if (!sw.active) continue;
      sw.life += dt;
      if (sw.life >= sw.maxLife) {
        sw.active = false;
        sw.mesh.visible = false;
        continue;
      }
      const progress = sw.life / sw.maxLife;
      const radius = THREE.MathUtils.lerp(0.3, sw.maxRadius, 1 - Math.pow(1 - progress, 2.2));
      sw.mesh.scale.set(radius, radius, radius);
      sw.mat.opacity = (1 - progress) * 0.94;
    }

    for (let i = 0; i < MAX_SKY_PILLARS; i++) {
      const sp = this.skyPillars[i];
      if (!sp.active) continue;
      sp.life += dt;
      if (sp.life >= sp.maxLife) {
        sp.active = false;
        sp.mesh.visible = false;
        continue;
      }
      const progress = sp.life / sp.maxLife;
      const r =
        progress < 0.22
          ? THREE.MathUtils.lerp(sp.maxRadius * 0.2, sp.maxRadius, progress / 0.22)
          : THREE.MathUtils.lerp(sp.maxRadius, sp.maxRadius * 0.08, (progress - 0.22) / 0.78);
      sp.mesh.scale.set(r, 1, r);
      sp.mat.opacity = Math.pow(1 - progress, 1.3) * 0.92;
    }

    for (const cl of this.combatLights) {
      if (!cl.light.visible) continue;
      cl.life += dt;
      if (cl.life >= cl.maxLife) {
        cl.light.visible = false;
        cl.light.intensity = 0;
        continue;
      }
      const p = cl.life / cl.maxLife;
      cl.light.intensity = cl.maxIntensity * Math.pow(1 - p, 1.45);
    }
  }

  private projectToScreen(x: number, y: number, z: number): { x: number; y: number; visible: boolean } {
    this.tempVec.set(x, y, z);
    this.tempVec.project(this.camera);
    const halfW = window.innerWidth / 2;
    const halfH = window.innerHeight / 2;
    return {
      x: Math.round(this.tempVec.x * halfW + halfW),
      y: Math.round(-this.tempVec.y * halfH + halfH),
      visible: this.tempVec.z < 1,
    };
  }

  private syncWorldLabels(): void {
    if ((this.lowSpecMode || this.isMobileDevice) && (this.frameTickCounter & 1) !== 0) {
      return;
    }
    const safeTopY = 76;
    const safeBottomY = window.innerHeight - 98;

    // Gate numbers (+5, x2) are baked in 2D onto the 3D cloth banners (.gate-label has opacity: 0),
    // so we skip per-frame DOM projection for gates to avoid layout recalculations!

    for (const gr of this.gears) {
      if (!gr.alive) continue;
      const p = this.projectToScreen(gr.cfg.x, 0.88, gr.cfg.z + gr.cfg.radius * 0.56);
      const inSafeViewport = p.visible && p.y >= safeTopY && p.y <= safeBottomY;
      gr.labelEl.style.display = inSafeViewport ? 'flex' : 'none';
      if (inSafeViewport) {
        gr.labelEl.style.left = `${p.x}px`;
        gr.labelEl.style.top = `${p.y}px`;
        const hpStr = `${gr.hp}`;
        if (gr.labelEl.textContent !== hpStr) gr.labelEl.textContent = hpStr;
      }
    }

    for (const n of this.nests) {
      if (!n.alive) continue;
      const p = this.projectToScreen(n.cfg.x, 0.75, n.cfg.z + 1.55);
      const inSafeViewport = p.visible && p.y >= safeTopY && p.y <= safeBottomY;
      n.labelEl.style.display = inSafeViewport ? 'block' : 'none';
      if (inSafeViewport) {
        n.labelEl.style.left = `${p.x}px`;
        n.labelEl.style.top = `${p.y}px`;
        const hpStr = `${Math.ceil(n.hp)}`;
        if (n.labelEl.textContent !== hpStr) n.labelEl.textContent = hpStr;
      }
    }

    for (const v of this.candyVaults) {
      if (!v.alive) continue;
      const p = this.projectToScreen(v.cfg.x, 3.85, v.cfg.z);
      const inSafeViewport = p.visible && p.y >= safeTopY && p.y <= safeBottomY;
      v.labelEl.style.display = inSafeViewport ? 'inline-flex' : 'none';
      if (inSafeViewport) {
        v.labelEl.style.left = `${p.x}px`;
        v.labelEl.style.top = `${p.y}px`;
        const hpStr = `${Math.ceil(v.hp)}`;
        if (v.labelEl.dataset.hp !== hpStr) {
          v.labelEl.dataset.hp = hpStr;
          v.labelEl.innerHTML = `${UI_ART.candyVault}<span>${hpStr}</span>`;
        }
      }
    }

    for (const bar of this.escortBarricades) {
      if (!bar.alive) continue;
      const p = this.projectToScreen(bar.cfg.x, 2.75, bar.cfg.z);
      const inSafeViewport = p.visible && p.y >= safeTopY && p.y <= safeBottomY;
      bar.labelEl.style.display = inSafeViewport ? 'inline-flex' : 'none';
      if (inSafeViewport) {
        bar.labelEl.style.left = `${p.x}px`;
        bar.labelEl.style.top = `${p.y}px`;
        const hpStr = `${Math.ceil(bar.hp)}`;
        if (bar.labelEl.dataset.hp !== hpStr) {
          bar.labelEl.dataset.hp = hpStr;
          bar.labelEl.innerHTML = `${UI_ART.barricade}<span>${hpStr}</span>`;
        }
      }
    }

    if (this.payloadCart && this.payloadCart.active && this.payloadCart.labelEl) {
      const pc = this.payloadCart;
      const cartLbl = pc.labelEl;
      if (cartLbl) {
        const p = this.projectToScreen(pc.x, 3.05, pc.z);
        const inSafeViewport = p.visible && p.y >= safeTopY && p.y <= safeBottomY;
        cartLbl.style.display = inSafeViewport ? 'inline-flex' : 'none';
        if (inSafeViewport) {
          cartLbl.style.left = `${p.x}px`;
          cartLbl.style.top = `${p.y}px`;
          const pct = this.getEscortProgressPct();
          const key = `${pct}_${pc.chargeState}_${pc.escortBlueCount}`;
          if (cartLbl.dataset.stateKey !== key) {
            cartLbl.dataset.stateKey = key;
            cartLbl.innerHTML = `${UI_ART.escortCart}<span>${pct}% · ${this.getEscortStateLabel()} (×${pc.escortBlueCount})</span>`;
          }
        }
      }
    }

    for (const st of this.bossSubTowers) {
      if (!st.alive) continue;
      const p = this.projectToScreen(st.cfg.x, 3.65, st.cfg.z);
      const inSafeViewport = p.visible && p.y >= safeTopY && p.y <= safeBottomY;
      st.labelEl.style.display = inSafeViewport ? 'inline-flex' : 'none';
      if (inSafeViewport) {
        st.labelEl.style.left = `${p.x}px`;
        st.labelEl.style.top = `${p.y}px`;
        const hpStr = `${Math.ceil(st.hp)}`;
        if (st.labelEl.dataset.hp !== hpStr) {
          st.labelEl.dataset.hp = hpStr;
          st.labelEl.innerHTML = `${UI_ART.shield}<span>${hpStr}</span>`;
        }
      }
    }

    for (const br of this.barrels) {
      if (!br.alive) continue;
      const p = this.projectToScreen(br.cfg.x, 1.65, br.cfg.z);
      const inSafeViewport = p.visible && p.y >= safeTopY && p.y <= safeBottomY;
      br.labelEl.style.display = inSafeViewport ? 'flex' : 'none';
      if (inSafeViewport) {
        br.labelEl.style.left = `${p.x}px`;
        br.labelEl.style.top = `${p.y}px`;
        const hpStr = `${br.hp}`;
        if (br.labelEl.dataset.hp !== hpStr) {
          br.labelEl.dataset.hp = hpStr;
          br.labelEl.innerHTML = `${UI_ART.barrel}<span>${hpStr}</span>`;
        }
      }
    }

    if (!this.isMobileDevice) {
      for (const zr of this.zones) {
        const yAnchor =
          zr.cfg.type === 'heal_sanctuary'
            ? 1.35
            : zr.cfg.type === 'frosting_pad'
              ? 0.85
              : zr.cfg.type === 'emp_zone'
                ? 0.72
                : 0.45;
        const p = this.projectToScreen(zr.cfg.x, yAnchor, zr.cfg.z);
        const inSafeViewport = p.visible && p.y >= safeTopY && p.y <= safeBottomY;
        zr.labelEl.style.display = inSafeViewport ? 'block' : 'none';
        if (inSafeViewport) {
          zr.labelEl.style.left = `${p.x}px`;
          zr.labelEl.style.top = `${p.y}px`;
          if (zr.cfg.type === 'emp_zone') {
            const empKey = zr.empPhase === 'telegraph' ? 'warn' : 'idle';
            if (zr.labelEl.dataset.empKey !== empKey) {
              zr.labelEl.dataset.empKey = empKey;
              zr.labelEl.innerHTML =
                empKey === 'warn'
                  ? `${UI_ART.envEmp} 脉冲预警!`
                  : `${UI_ART.envEmp} 电磁干扰区`;
            }
          }
        }
      }
    }

    if (this.lootBugLabelEl) {
      if (this.lootBug.active) {
        const p = this.projectToScreen(this.lootBug.x, 1.9, this.lootBug.z);
        const inSafeViewport = p.visible && p.y >= safeTopY && p.y <= safeBottomY;
        this.lootBugLabelEl.style.display = inSafeViewport ? 'flex' : 'none';
        if (inSafeViewport) {
          this.lootBugLabelEl.style.left = `${p.x}px`;
          this.lootBugLabelEl.style.top = `${p.y}px`;
          const lbHp = `${this.lootBug.hp}`;
          if (this.lootBugLabelEl.dataset.hp !== lbHp) {
            this.lootBugLabelEl.dataset.hp = lbHp;
            this.lootBugLabelEl.innerHTML = `${UI_ART.lootbug}<span>${lbHp}</span>`;
          }
        }
      } else {
        this.lootBugLabelEl.style.display = 'none';
      }
    }

    if (this.airdrop?.labelEl) {
      if (this.airdrop.active) {
        const p = this.projectToScreen(this.airdrop.x, Math.max(0, this.airdrop.y) + 2.15, this.airdrop.z);
        const inSafeViewport = p.visible && p.y >= safeTopY && p.y <= safeBottomY;
        this.airdrop.labelEl.style.display = inSafeViewport ? 'inline-flex' : 'none';
        if (inSafeViewport) {
          this.airdrop.labelEl.style.left = `${p.x}px`;
          this.airdrop.labelEl.style.top = `${p.y}px`;
          const statusKey =
            this.airdrop.phase === 'falling' ? 'falling' : `${Math.ceil(this.airdrop.hp)}`;
          if (this.airdrop.labelEl.dataset.hp !== statusKey) {
            this.airdrop.labelEl.dataset.hp = statusKey;
            this.airdrop.labelEl.innerHTML =
              this.airdrop.phase === 'falling'
                ? `${UI_ART.tacticalAirdrop}<span>空投降落</span>`
                : `${UI_ART.tacticalAirdrop}<span>空投 ${statusKey}</span>`;
          }
        }
      } else {
        this.airdrop.labelEl.style.display = 'none';
      }
    }

    if (this.mechaOverlord?.labelEl) {
      const mo = this.mechaOverlord;
      const moLbl = mo.labelEl;
      if (mo.active && moLbl) {
        const p = this.projectToScreen(mo.x, 3.35, mo.z);
        const inSafeViewport = p.visible && p.y >= safeTopY && p.y <= safeBottomY;
        moLbl.style.display = inSafeViewport ? 'inline-flex' : 'none';
        if (inSafeViewport) {
          moLbl.style.left = `${p.x}px`;
          moLbl.style.top = `${p.y}px`;
          const hpPct = Math.max(1, Math.round((mo.hp / Math.max(1, mo.maxHp)) * 100));
          const secLeft = Math.max(1, Math.ceil(mo.lifeTimer));
          const mKey = `${hpPct}_${secLeft}_${mo.volleysFired}`;
          if (moLbl.dataset.stateKey !== mKey) {
            moLbl.dataset.stateKey = mKey;
            moLbl.innerHTML = `${UI_ART.mechaOverlord}<span>机甲 ${hpPct}% · ${secLeft}s</span>`;
          }
        }
      } else if (moLbl) {
        moLbl.style.display = 'none';
      }
    }

    if (this.colossusBoss?.active) {
      const cb = this.colossusBoss;
      if (cb.leftShieldAlive) {
        const pL = this.projectToScreen(-4.35, 2.35, BOSS_GATE_Z + 1.85);
        const inSafeL = pL.visible && pL.y >= safeTopY + 18 && pL.y <= safeBottomY;
        cb.leftLabelEl.style.display = inSafeL ? 'inline-flex' : 'none';
        if (inSafeL) {
          cb.leftLabelEl.style.left = `${pL.x}px`;
          cb.leftLabelEl.style.top = `${pL.y}px`;
          const lHp = `${Math.ceil(cb.leftShieldHp)}`;
          if (cb.leftLabelEl.dataset.hp !== lHp) {
            cb.leftLabelEl.dataset.hp = lHp;
            cb.leftLabelEl.innerHTML = `${UI_ART.shield}<span>左翼重盾 ${lHp}</span>`;
          }
        }
      } else {
        cb.leftLabelEl.style.display = 'none';
      }

      if (cb.rightCannonAlive) {
        const pR = this.projectToScreen(4.35, 2.35, BOSS_GATE_Z + 1.85);
        const inSafeR = pR.visible && pR.y >= safeTopY + 18 && pR.y <= safeBottomY;
        cb.rightLabelEl.style.display = inSafeR ? 'inline-flex' : 'none';
        if (inSafeR) {
          cb.rightLabelEl.style.left = `${pR.x}px`;
          cb.rightLabelEl.style.top = `${pR.y}px`;
          const rHp = `${Math.ceil(cb.rightCannonHp)}`;
          if (cb.rightLabelEl.dataset.hp !== rHp) {
            cb.rightLabelEl.dataset.hp = rHp;
            cb.rightLabelEl.innerHTML = `${UI_ART.techCandyBombard}<span>右翼糖炮 ${rHp}</span>`;
          }
        }
      } else {
        cb.rightLabelEl.style.display = 'none';
      }

      cb.coreLabelEl.style.display = 'none';
    }

    if (this.airshipMothership?.active && this.airshipMothership.labelEl) {
      const ship = this.airshipMothership;
      const shipLbl = ship.labelEl;
      if (shipLbl) {
        const pS = this.projectToScreen(ship.x, ship.y + 1.55, ship.z);
        const inSafeS = pS.visible && pS.y >= safeTopY + 14 && pS.y <= safeBottomY;
        shipLbl.style.display = inSafeS ? 'inline-flex' : 'none';
        if (inSafeS) {
          shipLbl.style.left = `${pS.x}px`;
          shipLbl.style.top = `${pS.y}px`;
          const pct = this.getAirshipProgressPct();
          const hpPct = Math.max(1, Math.round((ship.hp / Math.max(1, ship.maxHp)) * 100));
          const dropPct = Math.round(ship.dropCharge);
          const sKey = `${pct}_${hpPct}_${dropPct}_${ship.state}`;
          if (shipLbl.dataset.stateKey !== sKey) {
            shipLbl.dataset.stateKey = sKey;
            shipLbl.innerHTML = `${UI_ART.airshipEscort}<span>母舰 ${pct}% · 耐久${hpPct}% · 空投${dropPct}%</span>`;
          }
        }
      }
    }

    for (const aat of this.antiAirTurrets) {
      if (!aat.alive) {
        aat.labelEl.style.display = 'none';
        continue;
      }
      const pA = this.projectToScreen(aat.cfg.x, 2.55, aat.cfg.z);
      const inSafeA = pA.visible && pA.y >= safeTopY + 14 && pA.y <= safeBottomY;
      aat.labelEl.style.display = inSafeA ? 'inline-flex' : 'none';
      if (inSafeA) {
        aat.labelEl.style.left = `${pA.x}px`;
        aat.labelEl.style.top = `${pA.y}px`;
        const aHp = `${Math.ceil(aat.hp)}`;
        if (aat.labelEl.dataset.hp !== aHp) {
          aat.labelEl.dataset.hp = aHp;
          aat.labelEl.innerHTML = `${UI_ART.boom}<span>${aat.cfg.name} ${aHp}</span>`;
        }
      }
    }

    if (this.turretChargeEl && this.turretChargeFillEl && this.turretChargeTextEl) {
      const p = this.projectToScreen(this.turretX, 2.45, PLAYER_Z - 1.25);
      const cPct = Math.min(100, Math.floor(this.state.championCharge));
      const isFull = cPct >= 100;
      const isHolding = this.isHoldingFireInput();
      // Only show the 3D turret charge capsule when actively holding charge or when ready (100%),
      // avoiding redundant visual clutter on PC when idle!
      if (p.visible && !this.isPaused && !this.isStageEnded && (isHolding || isFull)) {
        const spec = this.state.getMechaSpec();
        const bottomSafePad = window.innerWidth > 768 ? 132 : 110;
        this.turretChargeEl.style.display = 'flex';
        this.turretChargeEl.style.left = `${p.x}px`;
        this.turretChargeEl.style.top = `${Math.min(window.innerHeight - bottomSafePad, Math.max(82, p.y))}px`;
        this.turretChargeEl.classList.toggle('is-holding', isHolding);
        this.turretChargeEl.classList.toggle('is-full', isFull);
        this.turretChargeFillEl.style.width = `${cPct}%`;
        const chargeKey = `${spec.id}_${isFull ? 1 : 0}_${isHolding ? 1 : 0}_${cPct}`;
        if (this.turretChargeTextEl.dataset.stateKey !== chargeKey) {
          this.turretChargeTextEl.dataset.stateKey = chargeKey;
          this.turretChargeTextEl.innerHTML = isFull
            ? isHolding
              ? `${spec.icon} 满能 · 松手召唤!`
              : window.innerWidth <= 900 ? `${spec.icon} 满能 · 点击召唤` : `${spec.icon} 满能 · 空格/点击召唤`
            : `${UI_ART.bolt} 蓄能 ${cPct}%`;
        }
      } else {
        this.turretChargeEl.style.display = 'none';
      }
    }
  }

  private renderScene(): void {
    let blueIdx = 0;
    let champIdx = 0;
    let redIdx = 0;
    let bruteIdx = 0;
    let banelingIdx = 0;
    let shamanIdx = 0;
    let shadowIdx = 0;

    const giantSpec = this.state.getGiantTrooperSpec();
    const swarmSpec = this.state.getSwarmTrooperSpec();
    const ultEvo = this.state.getUltimateEvolutionSpec();
    this.dummy.rotation.order = 'YXZ';

    for (let i = 0; i < MAX_UNITS; i++) {
      const u = this.units[i];
      if (!u.active) continue;

      const curSpeed = Math.hypot(u.vx, u.vz);
      const speedRatio = THREE.MathUtils.clamp(curSpeed / Math.max(1, u.speed), 0.15, 1.35);
      const isHighVault = u.spawnHop > 0.68;
      const hopNorm = Math.min(1, u.spawnHop / (isHighVault ? 2.15 : 0.68));
      const hopY = Math.sin(hopNorm * Math.PI) * (isHighVault ? 3.05 : 0.72);
      const forwardPitch = 0.14 * speedRatio + u.attackAnim * 0.22;
      const bankRoll = THREE.MathUtils.clamp(-u.turnRate * 0.22, -0.28, 0.28);

      // 2D Ground Contact Blob Shadow under every active unit (shrinks slightly when jumping)
      const shadowScale = Math.max(0.35, u.radius * 2.55 * (1 - Math.min(0.45, hopY * 0.14)));
      this.dummy.position.set(u.x, 0.026, u.z + 0.08);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.set(shadowScale, 1, shadowScale * 0.82);
      this.dummy.updateMatrix();
      this.unitShadowInst.setMatrixAt(shadowIdx++, this.dummy.matrix);

      if (u.team === 'blue') {
        const hopCycle = Math.abs(Math.sin(u.walkPhase));
        const squashWave = Math.cos(u.walkPhase * 2.0);
        const atkJump = Math.sin(u.attackAnim * Math.PI);
        if (u.kind === 'champion' && champIdx < 120) {
          const titanScale =
            ultEvo.mechaScaleMult *
            (u.jellyGiant ? 1.28 : 1.0) *
            (1 +
              this.state.getSkillNodeRank('titan_t1') * 0.08 +
              this.state.getSkillNodeRank('titan_t3') * 0.06);
          const champDisplayYaw =
            Math.sin(u.walkPhase * 0.5) * 0.22 - THREE.MathUtils.clamp(u.vx * 0.055, -0.38, 0.38);
          const champRoll = bankRoll * 0.65 + Math.sin(u.walkPhase) * 0.12;
          const champStretchY = 1.0 - squashWave * 0.12 + atkJump * 0.15;
          const champSquashXZ = 1.0 / Math.sqrt(Math.max(0.74, champStretchY));
          this.dummy.position.set(u.x, hopY + hopCycle * 0.22 + atkJump * 0.28, u.z);
          this.dummy.rotation.set(forwardPitch * 0.45, champDisplayYaw, champRoll);
          this.dummy.scale.set(
            titanScale * champSquashXZ,
            titanScale * champStretchY,
            titanScale * champSquashXZ
          );
          this.dummy.updateMatrix();
          this.championInst.setMatrixAt(champIdx, this.dummy.matrix);

          const c4 = champIdx * 4;
          this.champAnimData[c4] = u.walkPhase;
          this.champAnimData[c4 + 1] = speedRatio;
          this.champAnimData[c4 + 2] = u.attackAnim;
          this.champAnimData[c4 + 3] = u.mechaType === 'pyro' ? 0.35 : 0.15;
          champIdx++;
        } else {
          const evoScale =
            this.currentTurretEvoTier === 2 ? 1.16 : this.currentTurretEvoTier === 1 ? 1.08 : 1.0;
          const uTier = u.fusionTier || 0;
          const baseUnitScale =
            uTier >= 1
              ? giantSpec.baseScale * (1 + (uTier - 1) * 0.34)
              : u.isMiniGiant
                ? 1.85
                : (u.kind === 'charged' ? 1.18 : 1.0 + u.spawnHop * 0.12) * swarmSpec.scaleMult;
          const scale = baseUnitScale * evoScale * (u.jellyGiant ? 1.48 : 1.0);
          // 2.5D Illustration Facing + organic Q-jelly hop & squash-and-stretch!
          const displayYaw =
            Math.sin(u.walkPhase * 0.5) * 0.24 - THREE.MathUtils.clamp(u.vx * 0.065, -0.45, 0.45);
          const waddleRoll = bankRoll + Math.sin(u.walkPhase) * 0.15;
          const stretchY = 1.0 - squashWave * 0.14 + atkJump * 0.16;
          const squashXZ = 1.0 / Math.sqrt(Math.max(0.72, stretchY));
          const slimeHopY = hopY + hopCycle * 0.16 * Math.min(1.5, scale) + atkJump * 0.24;
          this.dummy.position.set(u.x, slimeHopY, u.z);
          this.dummy.rotation.set(forwardPitch * 0.42, displayYaw, waddleRoll);
          this.dummy.scale.set(scale * squashXZ, scale * stretchY, scale * squashXZ);
          this.dummy.updateMatrix();
          this.blueBodyInst.setMatrixAt(blueIdx, this.dummy.matrix);

          // Per-instance cheerful Candy-Jelly Slime palette (Sky-Blue, Apple-Green, Coral-Pink + Golden Supercharged!)
          const tintCol =
            uTier >= 3 || u.jellyGiant
              ? this.candyAmber
              : uTier >= 2 || u.kind === 'charged'
                ? this.candyGold
                : this.skinCandyTints[u.id % 3];
          this.blueBodyInst.setColorAt(blueIdx, tintCol);

          const b4 = blueIdx * 4;
          this.blueAnimData[b4] = u.walkPhase;
          this.blueAnimData[b4 + 1] = speedRatio;
          this.blueAnimData[b4 + 2] = u.attackAnim;
          this.blueAnimData[b4 + 3] =
            uTier >= 2 || u.jellyGiant ? 0.36 : uTier === 1 || u.isMiniGiant || u.kind === 'charged' ? 0.22 : 0.0;
          blueIdx++;
        }
      } else {
        const redHop = Math.abs(Math.sin(u.walkPhase));
        const redSquash = Math.cos(u.walkPhase * 2.0);
        const redAtkJump = Math.sin(u.attackAnim * Math.PI);
        const redSwaggerYaw = u.yaw + Math.sin(u.walkPhase * 0.5) * 0.16;
        const redSwaggerRoll = bankRoll + Math.sin(u.walkPhase) * 0.12;
        const redStretchY = 1.0 - redSquash * 0.1 + redAtkJump * 0.14;
        const redSquashXZ = 1.0 / Math.sqrt(Math.max(0.76, redStretchY));
        if (u.kind === 'brute' && bruteIdx < 120) {
          this.dummy.position.set(u.x, hopY + redHop * 0.16 + redAtkJump * 0.22, u.z);
          this.dummy.rotation.set(forwardPitch * 0.7, redSwaggerYaw, redSwaggerRoll * 0.75);
          this.dummy.scale.set(redSquashXZ, redStretchY, redSquashXZ);
          this.dummy.updateMatrix();
          this.bruteInst.setMatrixAt(bruteIdx, this.dummy.matrix);

          const br4 = bruteIdx * 4;
          this.bruteAnimData[br4] = u.walkPhase;
          this.bruteAnimData[br4 + 1] = speedRatio;
          this.bruteAnimData[br4 + 2] = u.attackAnim;
          this.bruteAnimData[br4 + 3] = 0;
          bruteIdx++;
        } else if (u.kind === 'baneling' && banelingIdx < 180) {
          const pulseScale = 1 + Math.sin(this.elapsedTime * 14 + u.id) * 0.11;
          this.dummy.position.set(u.x, hopY + redHop * 0.18, u.z);
          this.dummy.rotation.set(
            forwardPitch * 1.1,
            redSwaggerYaw,
            bankRoll + Math.sin(u.walkPhase * 1.5) * 0.18
          );
          this.dummy.scale.set(
            pulseScale * redSquashXZ,
            pulseScale * redStretchY,
            pulseScale * redSquashXZ
          );
          this.dummy.updateMatrix();
          this.banelingInst.setMatrixAt(banelingIdx, this.dummy.matrix);

          const bn4 = banelingIdx * 4;
          this.banelingAnimData[bn4] = u.walkPhase;
          this.banelingAnimData[bn4 + 1] = speedRatio;
          this.banelingAnimData[bn4 + 2] = u.attackAnim;
          this.banelingAnimData[bn4 + 3] = 0.25;
          banelingIdx++;
        } else if (u.kind === 'shaman' && shamanIdx < 120) {
          this.dummy.position.set(u.x, hopY + redHop * 0.14 + redAtkJump * 0.18, u.z);
          this.dummy.rotation.set(forwardPitch * 0.6, redSwaggerYaw, redSwaggerRoll * 0.7);
          this.dummy.scale.set(1.12 * redSquashXZ, 1.12 * redStretchY, 1.12 * redSquashXZ);
          this.dummy.updateMatrix();
          this.shamanInst.setMatrixAt(shamanIdx, this.dummy.matrix);

          const sh4 = shamanIdx * 4;
          this.shamanAnimData[sh4] = u.walkPhase;
          this.shamanAnimData[sh4 + 1] = speedRatio;
          this.shamanAnimData[sh4 + 2] = u.attackAnim;
          this.shamanAnimData[sh4 + 3] = 0.15;
          shamanIdx++;
        } else {
          this.dummy.position.set(u.x, hopY + redHop * 0.14 + redAtkJump * 0.2, u.z);
          this.dummy.rotation.set(forwardPitch, redSwaggerYaw, redSwaggerRoll);
          this.dummy.scale.set(redSquashXZ, redStretchY, redSquashXZ);
          this.dummy.updateMatrix();
          this.redBodyInst.setMatrixAt(redIdx, this.dummy.matrix);

          const r4 = redIdx * 4;
          this.redAnimData[r4] = u.walkPhase;
          this.redAnimData[r4 + 1] = speedRatio;
          this.redAnimData[r4 + 2] = u.attackAnim;
          this.redAnimData[r4 + 3] = 0.0;
          redIdx++;
        }
      }
    }

    this.blueBodyInst.count = blueIdx;
    this.championInst.count = champIdx;
    this.redBodyInst.count = redIdx;
    this.bruteInst.count = bruteIdx;
    this.banelingInst.count = banelingIdx;
    this.shamanInst.count = shamanIdx;
    this.unitShadowInst.count = shadowIdx;

    let frostIdx = 0;
    for (const bUnitIdx of this.activeBlueIndices) {
      const fu = this.units[bUnitIdx];
      if (!fu.active || !fu.frostShield) continue;
      const ringScale = fu.kind === 'champion' ? 1.65 : fu.jellyGiant || fu.isMiniGiant ? 1.38 : 1.0;
      this.dummy.position.set(fu.x, 0.48 + Math.sin(this.elapsedTime * 5.2 + fu.id) * 0.06, fu.z);
      this.dummy.rotation.set(0.18 * Math.sin(this.elapsedTime * 3.0 + fu.id), this.elapsedTime * 2.4 + fu.id, 0);
      this.dummy.scale.set(ringScale, ringScale, ringScale);
      this.dummy.updateMatrix();
      this.frostShieldInst.setMatrixAt(frostIdx++, this.dummy.matrix);
    }
    this.frostShieldInst.count = frostIdx;
    this.frostShieldInst.instanceMatrix.needsUpdate = true;

    // MC-8: Render active Bobo 3-Branch Specialization 3D visual flair on spawned Blue Bobos
    const activeDoc = this.state.activeBoboTechDoctrine;
    const docLevel = this.state.getBoboTechLevel(activeDoc);
    const flairScaleBoost = 1 + docLevel * 0.06;
    let vanguardFlairIdx = 0;
    let siegeFlairIdx = 0;
    let candyFlairIdx = 0;
    for (let i = 0; i < MAX_UNITS; i++) {
      const bu = this.units[i];
      if (!bu.active || bu.team !== 'blue' || bu.kind === 'champion') continue;
      const baseScale = (bu.jellyGiant || bu.isMiniGiant ? 1.32 : 1.0) * flairScaleBoost;
      if (activeDoc === 'vanguard_charge') {
        const surgeBoost = bu.vanguardSurgeTimer && bu.vanguardSurgeTimer > 0 ? 1.24 : 1.0;
        this.dummy.position.set(bu.x, 0.78 + Math.sin(this.elapsedTime * 7.0 + bu.id) * 0.05, bu.z + 0.14);
        this.dummy.rotation.set(0.22, bu.yaw, Math.sin(this.elapsedTime * 6.0 + bu.id) * 0.12);
        this.dummy.scale.set(baseScale * surgeBoost * 1.18, baseScale * 0.65, baseScale * surgeBoost * 1.15);
        this.dummy.updateMatrix();
        this.techVanguardFlairInst.setMatrixAt(vanguardFlairIdx++, this.dummy.matrix);
      } else if (activeDoc === 'heavy_siege') {
        this.dummy.position.set(bu.x, 0.62, bu.z);
        this.dummy.rotation.set(0, this.elapsedTime * 2.8 + bu.id, 0);
        this.dummy.scale.set(baseScale, baseScale, baseScale);
        this.dummy.updateMatrix();
        this.techSiegeFlairInst.setMatrixAt(siegeFlairIdx++, this.dummy.matrix);
      } else {
        this.dummy.position.set(bu.x, 1.08 + Math.abs(Math.sin(this.elapsedTime * 6.2 + bu.id)) * 0.12, bu.z);
        this.dummy.rotation.set(this.elapsedTime * 2.2, this.elapsedTime * 3.4 + bu.id, 0);
        this.dummy.scale.set(baseScale, baseScale, baseScale);
        this.dummy.updateMatrix();
        this.techCandyFlairInst.setMatrixAt(candyFlairIdx++, this.dummy.matrix);
      }
    }
    this.techVanguardFlairInst.count = vanguardFlairIdx;
    this.techSiegeFlairInst.count = siegeFlairIdx;
    this.techCandyFlairInst.count = candyFlairIdx;
    this.lastTechFlairCount = vanguardFlairIdx + siegeFlairIdx + candyFlairIdx;
    this.techVanguardFlairInst.instanceMatrix.needsUpdate = true;
    this.techSiegeFlairInst.instanceMatrix.needsUpdate = true;
    this.techCandyFlairInst.instanceMatrix.needsUpdate = true;

    this.blueBodyInst.instanceMatrix.needsUpdate = true;
    if (this.blueBodyInst.instanceColor) {
      this.blueBodyInst.instanceColor.needsUpdate = true;
    }
    this.championInst.instanceMatrix.needsUpdate = true;
    this.redBodyInst.instanceMatrix.needsUpdate = true;
    this.bruteInst.instanceMatrix.needsUpdate = true;
    this.banelingInst.instanceMatrix.needsUpdate = true;
    this.shamanInst.instanceMatrix.needsUpdate = true;
    this.unitShadowInst.instanceMatrix.needsUpdate = true;

    this.blueAnimAttr.needsUpdate = true;
    this.champAnimAttr.needsUpdate = true;
    this.redAnimAttr.needsUpdate = true;
    this.bruteAnimAttr.needsUpdate = true;
    this.banelingAnimAttr.needsUpdate = true;
    this.shamanAnimAttr.needsUpdate = true;

    // Update particles
    let partIdx = 0;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      const s = p.scale * (1 - p.life / p.maxLife);
      this.dummy.position.set(p.x, p.y, p.z);
      this.dummy.rotation.set(p.life * 6, p.life * 4, 0);
      this.dummy.scale.set(s, s, s);
      this.dummy.updateMatrix();
      this.particleInst.setMatrixAt(partIdx, this.dummy.matrix);
      this.particleInst.setColorAt(partIdx, p.color);
      partIdx++;
    }
    this.particleInst.count = partIdx;
    this.particleInst.instanceMatrix.needsUpdate = true;
    if (this.particleInst.instanceColor) {
      this.particleInst.instanceColor.needsUpdate = true;
    }

    // Apply Camera Trauma Shake & Continuous Seismic Tremor around baseCameraPos
    if (this.cameraShake > 0.001) {
      const shakeAmt = this.cameraShake * this.cameraShake * 1.18;
      const waveX = this.quakeTimer > 0 ? Math.sin(this.elapsedTime * 58) * shakeAmt * 0.42 : 0;
      const waveY = this.quakeTimer > 0 ? Math.cos(this.elapsedTime * 67) * shakeAmt * 0.35 : 0;
      this.camera.position.set(
        this.baseCameraPos.x + (Math.random() - 0.5) * shakeAmt + waveX,
        this.baseCameraPos.y + (Math.random() - 0.5) * shakeAmt * 0.8 + waveY,
        this.baseCameraPos.z + (Math.random() - 0.5) * shakeAmt
      );
    } else {
      this.camera.position.copy(this.baseCameraPos);
    }

    // Since active units use 2D ground contact blob shadows (unitShadowInst), the directional shadow map
    // only needs to refresh every 4th frame (15Hz) for environmental structures!
    this.frameTickCounter++;
    if ((this.frameTickCounter & 3) === 0) {
      this.renderer.shadowMap.needsUpdate = true;
    }

    if (this.usePostProcessing && !this.isMobileDevice) {
      // Sync AAA Cinema Post-Processing Uniforms (Chromatic Aberration & Low-HP / Berserk Danger Pulse)
      if (this.cinemaPass?.uniforms) {
        this.cinemaPass.uniforms.uAberration.value = Math.min(1.0, this.cameraShake * 0.85);
        const hpRatio = this.playerBaseMaxHp > 0 ? this.playerBaseHp / this.playerBaseMaxHp : 1;
        const lowHpPulse =
          !this.isPaused && !this.isStageEnded && hpRatio < 0.42
            ? (0.5 + 0.5 * Math.sin(this.elapsedTime * 8.0)) * (1.0 - hpRatio / 0.42)
            : 0;
        const berserkPulse =
          !this.isPaused && !this.isStageEnded && this.bossBerserkTriggered
            ? 0.25 + 0.15 * Math.sin(this.elapsedTime * 5.0)
            : 0;
        this.cinemaPass.uniforms.uDangerPulse.value = Math.max(lowHpPulse, berserkPulse);
      }
      this.composer.render();
    } else {
      // Direct hardware backbuffer render on Mobile (or thermal fallback) — avoids 14 offscreen render-target switches per frame!
      this.renderer.render(this.scene, this.camera);
    }
  }
}
