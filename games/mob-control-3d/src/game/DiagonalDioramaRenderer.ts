import * as THREE from 'three';
import {
  BarrelConfig,
  BumperConfig,
  GateConfig,
  GearConfig,
  TerrainZoneConfig,
} from '../levels/LevelData';
import { ThemeId } from './SceneThemes';
import { SkillBranchId } from './State';
import { Unit } from './World3D';

export interface DioramaGateView {
  cfg: GateConfig;
  currentX: number;
  pulseTimer: number;
}

export interface DioramaBarrelView {
  cfg: BarrelConfig;
  hp: number;
  alive: boolean;
}

export interface DioramaGearView {
  cfg: GearConfig;
  currentX: number;
  hp: number;
  alive: boolean;
  hitFlash: number;
}

export interface DioramaBumperView {
  cfg: BumperConfig;
  pulseTimer: number;
}

export interface DioramaZoneView {
  cfg: TerrainZoneConfig;
}

export interface DioramaRenderState {
  elapsedTime: number;
  isPaused: boolean;
  themeId: ThemeId;
  activeRaceId: SkillBranchId;
  cameraMode: 0 | 1 | 2;
  stageId: number;
  isMiniBoss: boolean;
  isMegaBoss: boolean;
  turretX: number;
  turretRecoil: number;
  trackHalfW: number;
  playerZ: number;
  bossGateZ: number;
  bossHp: number;
  bossMaxHp: number;
  bossHitFlash: number;
  bossShieldActive: boolean;
  bossShieldHits: number;
  bossBerserk: boolean;
  cameraShake: number;
  units: Unit[];
  gates: DioramaGateView[];
  barrels: DioramaBarrelView[];
  gears: DioramaGearView[];
  bumpers: DioramaBumperView[];
  zones: DioramaZoneView[];
}

interface SmokePuff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  age: number;
  maxAge: number;
}

interface ClashSpark {
  u: number;
  t: number;
  vx: number;
  vy: number;
  ox: number;
  oy: number;
  color: string;
  size: number;
  age: number;
  maxAge: number;
}

interface WeatherMote {
  rx: number;
  ry: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vRot: number;
  phase: number;
}

const ALL_THEME_IDS: ThemeId[] = [
  'wasteland',
  'sakura',
  'glacier',
  'magma',
  'cyberhive',
  'emerald',
  'ocean',
  'royal',
];

const ALL_RACE_IDS: SkillBranchId[] = [
  'swarm',
  'titan',
  'gate',
  'orbital',
  'plasma',
  'bastion',
  'tycoon',
];

/**
 * Multi-Theme, Multi-Stage, Dynamic-Boss & 7-Race 3D Diagonal Perspective Pixar Diorama Engine.
 * Supports all 8 World Themes (`THEMES`), standalone animated 3D Boss (`boss_furnace.png`),
 * all 7 Pixar 3D Race models (`race_*.png`), dynamic stage obstacles (gates, barrels, gears, bumpers, zones),
 * and 3 interactive Camera Modes (`切视角 [V]`).
 */
export class DiagonalDioramaRenderer {
  private overlayCanvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private stageImg = new Image();
  private themeImgs: Record<ThemeId, HTMLImageElement> = {} as Record<ThemeId, HTMLImageElement>;
  private themeLoaded: Record<ThemeId, boolean> = {} as Record<ThemeId, boolean>;

  private bossImg = new Image();
  private cannonImg = new Image();
  private puddingImg = new Image();
  private slimeImg = new Image();
  private robotImg = new Image();
  private splashImg = new Image();

  private raceImgs: Record<SkillBranchId, HTMLImageElement> = {} as Record<
    SkillBranchId,
    HTMLImageElement
  >;
  private raceLoaded: Record<SkillBranchId, boolean> = {} as Record<SkillBranchId, boolean>;

  private assetsLoaded = {
    stage: false,
    boss: false,
    cannon: false,
    pudding: false,
    slime: false,
    robot: false,
    splash: false,
  };

  private smokePuffs: SmokePuff[] = [];
  private clashSparks: ClashSpark[] = [];
  private weatherMotes: WeatherMote[] = [];
  private lastTime = 0;

  // Smooth camera mode interpolation
  private camZoom = 1.0;
  private camPanRx = 0.0;
  private camPanRy = 0.0;

  constructor(parentEl: HTMLElement) {
    this.overlayCanvas = document.createElement('canvas');
    this.overlayCanvas.id = 'diorama-canvas';
    this.overlayCanvas.style.position = 'absolute';
    this.overlayCanvas.style.inset = '0';
    this.overlayCanvas.style.width = '100%';
    this.overlayCanvas.style.height = '100%';
    this.overlayCanvas.style.pointerEvents = 'none';
    this.overlayCanvas.style.zIndex = '4';
    parentEl.insertBefore(this.overlayCanvas, parentEl.firstChild?.nextSibling || null);

    const context = this.overlayCanvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to initialize 2D context for DiagonalDioramaRenderer');
    }
    this.ctx = context;

    this.loadAssets();
    this.initSmoke();
    this.initWeatherMotes();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private loadAssets(): void {
    const bind = (img: HTMLImageElement, key: keyof typeof this.assetsLoaded, src: string) => {
      img.onload = () => {
        this.assetsLoaded[key] = true;
      };
      img.src = src;
    };
    bind(this.stageImg, 'stage', '/assets/battle/stage_bg.jpg?v=15');
    bind(this.bossImg, 'boss', '/assets/battle/boss_furnace.png?v=15');
    bind(this.cannonImg, 'cannon', '/assets/battle/cannon.png?v=15');
    bind(this.puddingImg, 'pudding', '/assets/battle/pudding_champ.png?v=15');
    bind(this.slimeImg, 'slime', '/assets/battle/slime_bobo.png?v=15');
    bind(this.robotImg, 'robot', '/assets/battle/clock_robot.png?v=15');
    bind(this.splashImg, 'splash', '/assets/battle/muzzle_splash.png?v=15');

    for (const tid of ALL_THEME_IDS) {
      const tImg = new Image();
      this.themeLoaded[tid] = false;
      tImg.onload = () => {
        this.themeLoaded[tid] = true;
      };
      tImg.src = `/assets/battle/theme_${tid}.jpg?v=15`;
      this.themeImgs[tid] = tImg;
    }

    for (const rid of ALL_RACE_IDS) {
      const rImg = new Image();
      this.raceLoaded[rid] = false;
      rImg.onload = () => {
        this.raceLoaded[rid] = true;
      };
      rImg.src = `/assets/battle/race_${rid}.png?v=15`;
      this.raceImgs[rid] = rImg;
    }
  }

  private initSmoke(): void {
    for (let i = 0; i < 14; i++) {
      this.smokePuffs.push(this.createSmokePuff(i / 14));
    }
  }

  private initWeatherMotes(): void {
    for (let i = 0; i < 32; i++) {
      this.weatherMotes.push({
        rx: Math.random() * 1024,
        ry: Math.random() * 571,
        vx: -18 - Math.random() * 22,
        vy: 14 + Math.random() * 24,
        size: 3.5 + Math.random() * 4.5,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 3.2,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  private createSmokePuff(initialProgress = 0): SmokePuff {
    const isRightStack = Math.random() > 0.5;
    const baseX = isRightStack ? 824 : 780;
    const baseY = isRightStack ? 46 : 38;
    const maxAge = 1.6 + Math.random() * 0.8;
    const age = initialProgress * maxAge;
    return {
      x: baseX + (Math.random() - 0.5) * 6 + age * 18,
      y: baseY - age * 26,
      vx: 10 + Math.random() * 8,
      vy: -(16 + Math.random() * 10),
      radius: 9 + age * 11,
      alpha: 0.72,
      age,
      maxAge,
    };
  }

  public resize(): void {
    const nativeDpr = window.devicePixelRatio || 1;
    // Force at least 2.0x Supersampling (SSAA) on PC monitors with dpr=1, up to 3.0x on 2K/4K displays!
    const dpr = Math.max(2.0, Math.min(nativeDpr * 1.5, 3.0));
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    if (
      this.overlayCanvas.width !== Math.round(w * dpr) ||
      this.overlayCanvas.height !== Math.round(h * dpr)
    ) {
      this.overlayCanvas.width = Math.round(w * dpr);
      this.overlayCanvas.height = Math.round(h * dpr);
    }
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
  }

  /**
   * Maps bridge coordinates:
   * - u in [-1, +1] across bridge width (-1 = left candy curb, +1 = right candy curb)
   * - t in [0, 1] along bridge length (0 = Boss front bumper at top-right, 1 = Cannon foreground at bottom-left)
   * Returns coordinates in the 1024x571 reference frame plus perspective scale `s`.
   */
  public projectBridge(
    u: number,
    t: number
  ): { rx: number; ry: number; s: number; slopeX: number; slopeY: number } {
    const clampedT = THREE.MathUtils.clamp(t, -0.06, 1.16);
    const p = Math.pow(Math.max(0, clampedT), 1.24);

    // Left inner cobblestone curb in 1024x571 reference frame
    const lx = 668 + (16 - 668) * p;
    const ly = 166 + (342 - 166) * p;

    // Right inner cobblestone curb in 1024x571 reference frame
    const rxEdge = 876 + (568 - 876) * p;
    const ryEdge = 184 + (536 - 184) * p;

    const frac = THREE.MathUtils.clamp((u + 1) * 0.5, -0.15, 1.15);
    const rx = lx + (rxEdge - lx) * frac;
    const ry = ly + (ryEdge - ly) * frac;
    const s = 0.31 + 0.69 * p;

    const dx = rxEdge - lx;
    const dy = ryEdge - ly;
    const len = Math.hypot(dx, dy) || 1;

    return {
      rx,
      ry,
      s,
      slopeX: dx / len,
      slopeY: dy / len,
    };
  }

  private getThemeSkyColors(themeId: ThemeId): [string, string] {
    switch (themeId) {
      case 'sakura':
        return ['#472461', '#e085ad'];
      case 'glacier':
        return ['#0a2e61', '#3dadde'];
      case 'magma':
        return ['#5c1f0f', '#eb7a28'];
      case 'cyberhive':
        return ['#0d082e', '#381475'];
      case 'emerald':
        return ['#145242', '#61c28a'];
      case 'ocean':
        return ['#05427a', '#24bdcf'];
      case 'royal':
        return ['#291457', '#7a42ad'];
      default:
        return ['#1e4294', '#467bdb'];
    }
  }

  public render(state: DioramaRenderState): void {
    const ctx = this.ctx;
    const cw = this.overlayCanvas.width;
    const ch = this.overlayCanvas.height;
    if (cw === 0 || ch === 0) return;

    const dt = Math.min(0.05, Math.max(0.001, state.elapsedTime - this.lastTime || 0.016));
    this.lastTime = state.elapsedTime;

    // Smoothly interpolate Camera Mode (0: Standard 3/4, 1: Close-Up Low Action, 2: Wide Tactical)
    const targetZoom = state.cameraMode === 1 ? 1.15 : state.cameraMode === 2 ? 0.94 : 1.0;
    const targetPanRx = state.cameraMode === 1 ? 56 : state.cameraMode === 2 ? -14 : 0;
    const targetPanRy = state.cameraMode === 1 ? -30 : state.cameraMode === 2 ? 12 : 0;
    const camLerp = Math.min(1, dt * 8.5);
    this.camZoom = THREE.MathUtils.lerp(this.camZoom, targetZoom, camLerp);
    this.camPanRx = THREE.MathUtils.lerp(this.camPanRx, targetPanRx, camLerp);
    this.camPanRy = THREE.MathUtils.lerp(this.camPanRy, targetPanRy, camLerp);

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, cw, ch);

    // Fill outer backdrop with current theme's sky gradient (visible in Wide Tactical camera mode)
    const [skyTop, skyBot] = this.getThemeSkyColors(state.themeId);
    const skyGrad = ctx.createLinearGradient(0, 0, 0, ch);
    skyGrad.addColorStop(0, skyTop);
    skyGrad.addColorStop(1, skyBot);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, cw, ch);

    // Reference coordinate system is 1024 x 571 (16:9 widescreen)
    const refW = 1024;
    const refH = 571;
    const baseScale = Math.max(cw / refW, ch / refH);
    const scale = baseScale * this.camZoom;
    const drawW = refW * scale;
    const drawH = refH * scale;
    let offsetX = (cw - drawW) * 0.5 + (this.camPanRx / refW) * drawW;
    let offsetY = (ch - drawH) * 0.5 + (this.camPanRy / refH) * drawH;

    if (state.cameraShake > 0.01 && !state.isPaused) {
      const shakePx = state.cameraShake * 5.5 * (cw / 1024);
      offsetX += Math.sin(state.elapsedTime * 53) * shakePx;
      offsetY += Math.cos(state.elapsedTime * 61) * shakePx * 0.8;
    }

    const toPxX = (rx: number) => offsetX + (rx / refW) * drawW;
    const toPxY = (ry: number) => offsetY + (ry / refH) * drawH;
    const toPxLen = (rLen: number) => (rLen / refW) * drawW;

    // 1. Draw the Active World Theme's UHD 3D Bridge Stage Background
    const activeThemeImg = this.themeImgs[state.themeId];
    if (activeThemeImg && this.themeLoaded[state.themeId]) {
      ctx.drawImage(activeThemeImg, offsetX, offsetY, drawW, drawH);
    } else if (this.assetsLoaded.stage) {
      ctx.drawImage(this.stageImg, offsetX, offsetY, drawW, drawH);
    }

    // 1b. Draw Dynamic Standalone 3D Boss Entity at Upper-Right Bridge Head + Chimney Steam FX
    this.drawDynamicBossEntity(ctx, state, toPxX, toPxY, toPxLen);
    this.updateAndDrawBossFX(ctx, dt, state, toPxX, toPxY, toPxLen);

    // 2. Collect Active Units & Frontline Gates and Map to Diagonal Bridge Coordinates (u, t)
    const zSpan = Math.max(1, state.playerZ - state.bossGateZ);
    const turretNorm = THREE.MathUtils.clamp(state.turretX / state.trackHalfW, -0.85, 0.85);
    const cannonU = THREE.MathUtils.clamp(-0.24 + turretNorm * 0.52, -0.76, 0.42);
    const cannonProj = this.projectBridge(cannonU, 1.0);

    interface RenderItem {
      kind: 'unit' | 'gate';
      depthT: number;
      unit?: Unit;
      u?: number;
      t?: number;
      gate?: DioramaGateView;
      gateIndex?: number;
    }

    const renderList: RenderItem[] = [];

    // Render the 2 signature Neon Arch Portals on the diagonal bridge (supporting each stage's op/value/style & horizontal motion)
    const activeGates = state.gates.slice(0, 2);
    for (let idx = 0; idx < activeGates.length; idx++) {
      const g = activeGates[idx];
      const gt = idx === 0 ? 0.37 : 0.27;
      renderList.push({
        kind: 'gate',
        depthT: gt,
        gate: g,
        gateIndex: idx,
      });
    }

    const bluePositions: Array<{ u: number; t: number }> = [];
    const redPositions: Array<{ u: number; t: number }> = [];

    // Allow up to 28 visible player units and 14 enemy robots so army multiplication is visibly rewarding!
    let drawnBlueNormals = 0;
    let drawnRedNormals = 0;

    for (let i = 0; i < state.units.length; i++) {
      const u = state.units[i];
      if (!u.active) continue;
      const rawT = (u.z - state.bossGateZ) / zSpan;
      const t = THREE.MathUtils.clamp(rawT, 0.04, 0.78);
      let latU = THREE.MathUtils.clamp(u.x / (state.trackHalfW * 0.86), -0.82, 0.82);

      if (u.team === 'blue' && u.kind !== 'champion') {
        if (drawnBlueNormals >= 28) continue;
        drawnBlueNormals++;
        if (t > 0.58) {
          const muzzleBlend = THREE.MathUtils.clamp((t - 0.58) / 0.22, 0, 1);
          const muzzleU = cannonU - 0.06;
          latU = THREE.MathUtils.lerp(latU, muzzleU, muzzleBlend * 0.65);
        }
      } else if (u.team === 'red') {
        if (drawnRedNormals >= 14) continue;
        drawnRedNormals++;
      }

      if (u.team === 'blue') {
        bluePositions.push({ u: latU, t });
      } else {
        redPositions.push({ u: latU, t });
      }

      renderList.push({
        kind: 'unit',
        depthT: t,
        unit: u,
        u: latU,
        t,
      });
    }

    // Spawn clash sparks where blue slimes & red clockwork robots meet
    if (
      !state.isPaused &&
      bluePositions.length > 0 &&
      redPositions.length > 0 &&
      Math.random() < 0.65
    ) {
      for (let rIdx = 0; rIdx < Math.min(6, redPositions.length); rIdx++) {
        const rp = redPositions[rIdx];
        for (let bIdx = 0; bIdx < Math.min(10, bluePositions.length); bIdx++) {
          const bp = bluePositions[bIdx];
          if (Math.abs(rp.t - bp.t) < 0.14 && Math.abs(rp.u - bp.u) < 0.42) {
            const midU = (rp.u + bp.u) * 0.5;
            const midT = (rp.t + bp.t) * 0.5;
            const ang = Math.random() * Math.PI * 2;
            const spd = 24 + Math.random() * 40;
            this.clashSparks.push({
              u: midU,
              t: midT,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd - 20,
              ox: 0,
              oy: -14,
              color: Math.random() > 0.35 ? '#fde047' : '#fb923c',
              size: 3.5 + Math.random() * 3.0,
              age: 0,
              maxAge: 0.28 + Math.random() * 0.18,
            });
            break;
          }
        }
      }
    }

    // Sort back-to-front by depthT (0 = far Boss at top-right, 1 = near Cannon at bottom-left)
    renderList.sort((a, b) => a.depthT - b.depthT);

    // 3. Draw Ground Contact Shadows for all active units first so shadows sit cleanly on cobblestones
    for (let i = 0; i < renderList.length; i++) {
      const item = renderList[i];
      if (item.kind !== 'unit' || !item.unit || item.u === undefined || item.t === undefined)
        continue;
      const u = item.unit;
      const proj = this.projectBridge(item.u, item.t);
      const px = toPxX(proj.rx);
      const py = toPxY(proj.ry);

      const isChamp = u.team === 'blue' && u.kind === 'champion';
      const baseRad = isChamp ? 64 : u.team === 'red' ? 28 : 26;
      const radX = toPxLen(baseRad * proj.s);
      const radY = radX * 0.42;

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(0.14);
      const shadowGrad = ctx.createRadialGradient(0, 0, radX * 0.1, 0, 0, radX);
      if (u.team === 'blue' && !isChamp) {
        shadowGrad.addColorStop(0, 'rgba(6, 52, 88, 0.48)');
        shadowGrad.addColorStop(0.55, 'rgba(14, 136, 198, 0.25)');
        shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        shadowGrad.addColorStop(0, 'rgba(42, 18, 12, 0.55)');
        shadowGrad.addColorStop(0.65, 'rgba(42, 18, 12, 0.24)');
        shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }
      ctx.fillStyle = shadowGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0, radX, radY, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 4. Draw Depth-Sorted Units & 3D Neon Arch Portals
    for (let i = 0; i < renderList.length; i++) {
      const item = renderList[i];
      if (item.kind === 'gate' && item.gate) {
        this.drawNeonArchGate(
          ctx,
          item.gate,
          item.gateIndex || 0,
          state.elapsedTime,
          toPxX,
          toPxY,
          toPxLen
        );
      } else if (
        item.kind === 'unit' &&
        item.unit &&
        item.u !== undefined &&
        item.t !== undefined
      ) {
        this.drawUnitSprite(
          ctx,
          item.unit,
          item.u,
          item.t,
          state.activeRaceId,
          state.elapsedTime,
          toPxX,
          toPxY,
          toPxLen
        );
      }
    }

    // 5. Draw Golden Combat Starburst Sparks at the Front Clash Line
    this.drawFrontlineStarbursts(
      ctx,
      redPositions,
      bluePositions,
      state.elapsedTime,
      toPxX,
      toPxY,
      toPxLen
    );
    this.updateAndDrawSparks(ctx, dt, toPxX, toPxY, toPxLen);

    // 6. Draw Foreground 3D Bronze Candy Cannon & Glowing Cyan Muzzle Splash in Bottom-Left
    this.drawForegroundCannon(ctx, cannonProj, state, toPxX, toPxY, toPxLen);

    // 7. Draw Theme-Specific Atmospheric Weather Particles (Sakura Petals, Snowflakes, Embers, Bubbles, Stars)
    this.updateAndDrawWeatherMotes(ctx, dt, state, toPxX, toPxY, toPxLen);

    ctx.restore();
  }

  /**
   * Renders the Standalone 3D Boss (`boss_furnace.png`) dynamically at the top-right bridge head,
   * with live engine chugging, hit-recoil, damage flash, berserk state, and Mini/Mega Boss shield dome!
   */
  private drawDynamicBossEntity(
    ctx: CanvasRenderingContext2D,
    state: DioramaRenderState,
    toPxX: (rx: number) => number,
    toPxY: (ry: number) => number,
    toPxLen: (rLen: number) => number
  ): void {
    if (!this.assetsLoaded.boss) return;

    const hpRatio = state.bossMaxHp > 0 ? Math.max(0, state.bossHp / state.bossMaxHp) : 1;
    const isDefeated = state.bossHp <= 0;
    const tierScale = state.isMegaBoss ? 1.12 : state.isMiniBoss ? 1.05 : 1.0;

    // Engine idle chug + hit recoil + berserk tremor
    const chugFreq = state.bossBerserk ? 24 : 11;
    const chugAmp = state.bossBerserk ? 2.2 : 1.1;
    const chugY = state.isPaused ? 0 : Math.sin(state.elapsedTime * chugFreq) * chugAmp;
    const hitRecoilX = state.bossHitFlash > 0 ? Math.min(1, state.bossHitFlash * 3.5) * 7.5 : 0;
    const hitRecoilY = state.bossHitFlash > 0 ? -Math.min(1, state.bossHitFlash * 3.5) * 4.0 : 0;
    const defeatSinkY = isDefeated ? 28 : 0;

    // Exact anchor on the top-right bridge head in 1024x571 reference coords
    const bossCenterRx = 786 + hitRecoilX;
    const bossBottomRy = 192 + chugY + hitRecoilY + defeatSinkY;
    const bossW = toPxLen(226 * tierScale);
    const bossH = bossW * (this.bossImg.naturalHeight / Math.max(1, this.bossImg.naturalWidth));

    const bx = toPxX(bossCenterRx);
    const by = toPxY(bossBottomRy);

    // 1. Boss Ground Contact Shadow on the Cobblestone Bridge Head
    ctx.save();
    ctx.translate(bx, toPxY(184));
    ctx.rotate(0.06);
    const shGrad = ctx.createRadialGradient(0, 0, toPxLen(18), 0, 0, toPxLen(115 * tierScale));
    shGrad.addColorStop(0, 'rgba(32, 12, 8, 0.68)');
    shGrad.addColorStop(0.65, 'rgba(32, 12, 8, 0.28)');
    shGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, toPxLen(115 * tierScale), toPxLen(28 * tierScale), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Berserk / MegaBoss Backlight Aura
    if (state.bossBerserk || state.isMegaBoss || state.isMiniBoss) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const auraColor = state.bossBerserk
        ? 'rgba(239, 68, 68, 0.45)'
        : state.isMegaBoss
          ? 'rgba(250, 204, 21, 0.38)'
          : 'rgba(56, 189, 248, 0.32)';
      const auraR = toPxLen(118 * tierScale * (0.95 + 0.08 * Math.sin(state.elapsedTime * 8)));
      const auraGrad = ctx.createRadialGradient(bx, by - bossH * 0.45, auraR * 0.1, bx, by - bossH * 0.45, auraR);
      auraGrad.addColorStop(0, auraColor);
      auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(bx, by - bossH * 0.45, auraR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 3. Draw 3D Boss Sprite with Dynamic squash/stretch & hit-flash
    ctx.save();
    ctx.translate(bx, by);
    const squash = state.bossHitFlash > 0 ? 1 + Math.sin(state.bossHitFlash * Math.PI * 4) * 0.04 : 1;
    ctx.scale(squash, 2 - squash);
    if (isDefeated) {
      ctx.globalAlpha = 0.55;
      ctx.rotate(0.12);
    }
    ctx.drawImage(this.bossImg, -bossW * 0.5, -bossH, bossW, bossH);

    // Hit flash overlay
    if (state.bossHitFlash > 0.02) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(0.55, state.bossHitFlash * 1.4);
      ctx.drawImage(this.bossImg, -bossW * 0.5, -bossH, bossW, bossH);
    }
    ctx.restore();

    // 4. Draw MiniBoss / MegaBoss 3D Energy Shield Dome when `bossShieldActive` is true!
    if (state.bossShieldActive && hpRatio > 0) {
      const domeRx = toPxLen(118 * tierScale);
      const domeRy = toPxLen(88 * tierScale);
      const domeCx = bx - toPxLen(6);
      const domeCy = by - bossH * 0.44;
      const pulse = 0.92 + 0.08 * Math.sin(state.elapsedTime * 10);

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const sGrad = ctx.createRadialGradient(
        domeCx,
        domeCy,
        domeRx * 0.25,
        domeCx,
        domeCy,
        domeRx * pulse
      );
      sGrad.addColorStop(0, 'rgba(56, 189, 248, 0.08)');
      sGrad.addColorStop(0.7, 'rgba(0, 242, 255, 0.38)');
      sGrad.addColorStop(0.95, 'rgba(224, 242, 254, 0.78)');
      sGrad.addColorStop(1, 'rgba(0, 242, 255, 0)');
      ctx.fillStyle = sGrad;
      ctx.beginPath();
      ctx.ellipse(domeCx, domeCy, domeRx * pulse, domeRy * pulse, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = toPxLen(3.2);
      ctx.beginPath();
      ctx.ellipse(domeCx, domeCy, domeRx * 0.94 * pulse, domeRy * 0.94 * pulse, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private updateAndDrawWeatherMotes(
    ctx: CanvasRenderingContext2D,
    dt: number,
    state: DioramaRenderState,
    toPxX: (rx: number) => number,
    toPxY: (ry: number) => number,
    toPxLen: (rLen: number) => number
  ): void {
    const tid = state.themeId;
    const isRising = tid === 'magma' || tid === 'ocean' || tid === 'emerald';

    for (let i = 0; i < this.weatherMotes.length; i++) {
      const m = this.weatherMotes[i];
      if (!state.isPaused) {
        m.rx += m.vx * dt;
        m.ry += (isRising ? -Math.abs(m.vy) : m.vy) * dt;
        m.rot += m.vRot * dt;
        if (m.rx < -20) m.rx = 1044;
        if (m.rx > 1044) m.rx = -20;
        if (!isRising && m.ry > 590) {
          m.ry = -15;
          m.rx = Math.random() * 1024;
        } else if (isRising && m.ry < -15) {
          m.ry = 585;
          m.rx = Math.random() * 1024;
        }
      }

      const px = toPxX(m.rx);
      const py = toPxY(m.ry);
      const sz = toPxLen(m.size);

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(m.rot);

      if (tid === 'sakura') {
        // 3D Cherry Blossom Petal
        ctx.fillStyle = 'rgba(253, 164, 175, 0.78)';
        ctx.beginPath();
        ctx.ellipse(0, 0, sz * 1.35, sz * 0.75, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (tid === 'glacier') {
        // Frost Snowflake Crystal
        ctx.fillStyle = 'rgba(224, 242, 254, 0.82)';
        ctx.beginPath();
        ctx.arc(0, 0, sz * 0.85, 0, Math.PI * 2);
        ctx.fill();
      } else if (tid === 'magma') {
        // Rising Golden Bakery Ember
        ctx.fillStyle = 'rgba(253, 224, 71, 0.82)';
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = sz * 2;
        ctx.beginPath();
        ctx.arc(0, 0, sz * 0.75, 0, Math.PI * 2);
        ctx.fill();
      } else if (tid === 'ocean') {
        // Translucent Soda Bubble
        ctx.strokeStyle = 'rgba(165, 243, 252, 0.75)';
        ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
        ctx.lineWidth = Math.max(1, sz * 0.25);
        ctx.beginPath();
        ctx.arc(0, 0, sz * 1.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (tid === 'cyberhive') {
        // Neon Synth Diamond
        ctx.fillStyle = i % 2 === 0 ? 'rgba(34, 211, 238, 0.78)' : 'rgba(244, 114, 182, 0.78)';
        ctx.beginPath();
        ctx.rect(-sz * 0.6, -sz * 0.6, sz * 1.2, sz * 1.2);
        ctx.fill();
      } else if (tid === 'emerald') {
        // Glowing Forest Firefly
        const pulse = 0.5 + 0.5 * Math.sin(state.elapsedTime * 5 + m.phase);
        ctx.fillStyle = `rgba(190, 242, 100, ${0.4 + 0.5 * pulse})`;
        ctx.beginPath();
        ctx.arc(0, 0, sz * 0.9, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Royal / Wasteland Golden Starlight Mote
        const pulse = 0.5 + 0.5 * Math.sin(state.elapsedTime * 4 + m.phase);
        ctx.fillStyle = `rgba(254, 240, 138, ${0.32 + 0.42 * pulse})`;
        ctx.beginPath();
        ctx.arc(0, 0, sz * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawFrontlineStarbursts(
    ctx: CanvasRenderingContext2D,
    redPositions: Array<{ u: number; t: number }>,
    bluePositions: Array<{ u: number; t: number }>,
    elapsedTime: number,
    toPxX: (rx: number) => number,
    toPxY: (ry: number) => number,
    toPxLen: (rLen: number) => number
  ): void {
    if (redPositions.length === 0 || bluePositions.length === 0) return;

    const clashAnchors = [
      { rx: 678, ry: 204, scale: 1.0, phase: 0 },
      { rx: 754, ry: 186, scale: 0.92, phase: 1.7 },
    ];

    for (const ca of clashAnchors) {
      const pulse = 0.85 + 0.22 * Math.sin(elapsedTime * 16 + ca.phase);
      const sx = toPxX(ca.rx);
      const sy = toPxY(ca.ry);
      const outerR = toPxLen(24 * ca.scale * pulse);

      ctx.save();
      ctx.translate(sx, sy);
      ctx.globalCompositeOperation = 'screen';

      const glow = ctx.createRadialGradient(0, 0, outerR * 0.08, 0, 0, outerR * 1.35);
      glow.addColorStop(0, 'rgba(255, 255, 220, 0.95)');
      glow.addColorStop(0.4, 'rgba(251, 191, 36, 0.72)');
      glow.addColorStop(1, 'rgba(249, 115, 22, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, outerR * 1.35, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fef9c3';
      ctx.beginPath();
      const spikes = 8;
      for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? outerR : outerR * 0.26;
        const ang = (i * Math.PI) / spikes + elapsedTime * 2.5;
        const px = Math.cos(ang) * r;
        const py = Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  private updateAndDrawBossFX(
    ctx: CanvasRenderingContext2D,
    dt: number,
    state: DioramaRenderState,
    toPxX: (rx: number) => number,
    toPxY: (ry: number) => number,
    toPxLen: (rLen: number) => number
  ): void {
    const pulse =
      0.75 + 0.25 * Math.sin(state.elapsedTime * 7.5) + (state.bossHitFlash > 0 ? 0.55 : 0);
    const gx = toPxX(756);
    const gy = toPxY(134);
    const grad = ctx.createRadialGradient(gx, gy, toPxLen(4), gx, gy, toPxLen(52));
    grad.addColorStop(0, `rgba(255, 230, 110, ${0.42 * pulse})`);
    grad.addColorStop(0.5, `rgba(255, 115, 24, ${0.22 * pulse})`);
    grad.addColorStop(1, 'rgba(255, 80, 0, 0)');
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(gx, gy, toPxLen(52), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    for (let i = 0; i < this.smokePuffs.length; i++) {
      const sp = this.smokePuffs[i];
      if (!state.isPaused) {
        sp.age += dt;
        if (sp.age >= sp.maxAge) {
          this.smokePuffs[i] = this.createSmokePuff(0);
          continue;
        }
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        sp.radius += 6.5 * dt;
      }
      const lifeRatio = sp.age / sp.maxAge;
      const alpha = Math.sin(lifeRatio * Math.PI) * 0.34;
      const sx = toPxX(sp.x);
      const sy = toPxY(sp.y);
      const sr = toPxLen(sp.radius);
      const sGrad = ctx.createRadialGradient(sx, sy, sr * 0.1, sx, sy, sr);
      sGrad.addColorStop(0, `rgba(248, 250, 255, ${alpha})`);
      sGrad.addColorStop(0.6, `rgba(215, 228, 248, ${alpha * 0.55})`);
      sGrad.addColorStop(1, 'rgba(200, 220, 255, 0)');
      ctx.fillStyle = sGrad;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawUnitSprite(
    ctx: CanvasRenderingContext2D,
    u: Unit,
    latU: number,
    t: number,
    activeRaceId: SkillBranchId,
    elapsedTime: number,
    toPxX: (rx: number) => number,
    toPxY: (ry: number) => number,
    toPxLen: (rLen: number) => number
  ): void {
    const proj = this.projectBridge(latU, t);
    const isChamp = u.team === 'blue' && u.kind === 'champion';
    const isHop = u.spawnHop > 0.05;
    const hopArc = isHop ? Math.sin(Math.min(1, u.spawnHop) * Math.PI) * 14 * proj.s : 0;

    const px = toPxX(proj.rx);
    const py = toPxY(proj.ry - hopArc);

    if (isChamp) {
      // For Swarm/Titan races, use the iconic Crowned Caramel Pudding Monster;
      // for other races, use their giant 3D Pixar Race Hero with a golden champion aura!
      const useRaceChamp =
        activeRaceId !== 'swarm' &&
        activeRaceId !== 'titan' &&
        this.raceLoaded[activeRaceId];
      const champImg = useRaceChamp ? this.raceImgs[activeRaceId] : this.puddingImg;
      if (!useRaceChamp && !this.assetsLoaded.pudding) return;

      const bounce = Math.sin(elapsedTime * 6.5 + u.id) * 0.035;
      const w = toPxLen(228 * proj.s * (1 - bounce * 0.5));
      const h =
        w * (champImg.naturalHeight / Math.max(1, champImg.naturalWidth)) * (1 + bounce);
      const tilt = Math.sin(elapsedTime * 4.2) * 0.025;

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(tilt);
      ctx.drawImage(champImg, -w * 0.5, -h * 0.88, w, h);
      ctx.restore();
      return;
    }

    if (u.team === 'blue') {
      // Select the active Race's genuine 3D Pixar sprite!
      // For 'swarm', regular droplets use `slime_bobo.png` while charged/mini-giant squad leaders use `race_swarm.png` (with headband & megaphone).
      // For all other 6 races ('titan', 'gate', 'orbital', 'plasma', 'bastion', 'tycoon'), units render as that race's 3D Pixar character!
      let unitImg = this.slimeImg;
      if (activeRaceId === 'swarm') {
        if ((u.kind === 'charged' || u.isMiniGiant) && this.raceLoaded.swarm) {
          unitImg = this.raceImgs.swarm;
        } else if (!this.assetsLoaded.slime) {
          return;
        }
      } else if (this.raceLoaded[activeRaceId]) {
        unitImg = this.raceImgs[activeRaceId];
      } else if (!this.assetsLoaded.slime) {
        return;
      }

      const jelly = Math.sin(u.walkPhase * 1.15 + u.id * 0.7) * 0.05;
      const fusionMult = u.fusionTier ? 1 + u.fusionTier * 0.16 : 1.0;
      const tierScale = (u.isMiniGiant ? 1.25 : u.kind === 'charged' ? 1.12 : 1.0) * fusionMult;
      const baseSize = (activeRaceId === 'swarm' && unitImg === this.slimeImg ? 104 : 114) * tierScale;
      const w = toPxLen(baseSize * proj.s * (1 - jelly * 0.5));
      const h =
        w * (unitImg.naturalHeight / Math.max(1, unitImg.naturalWidth)) * (1 + jelly);
      const waddle = Math.sin(u.walkPhase * 0.6 + u.id) * 0.04;

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(waddle);
      ctx.drawImage(unitImg, -w * 0.5, -h * 0.85, w, h);
      ctx.restore();
      return;
    }

    // Clockwork Red Tin Robot Enemy
    if (!this.assetsLoaded.robot) return;
    const robotScale = u.kind === 'brute' ? 1.3 : u.kind === 'shaman' ? 1.12 : 1.0;
    const baseSize = 185 * robotScale;
    const marchBob = Math.abs(Math.sin(u.walkPhase * 0.85)) * 3.5 * proj.s;
    const w = toPxLen(baseSize * proj.s);
    const h = w * (this.robotImg.naturalHeight / Math.max(1, this.robotImg.naturalWidth));
    const marchTilt = Math.sin(u.walkPhase * 0.85) * 0.05;

    ctx.save();
    ctx.translate(px, py - toPxLen(marchBob));
    ctx.rotate(marchTilt);
    ctx.drawImage(this.robotImg, -w * 0.5, -h * 0.88, w, h);
    ctx.restore();
  }

  /**
   * Renders the signature 3D Glowing Neon Arch Portal (+4, x3, etc.) on the diagonal bridge!
   */
  private drawNeonArchGate(
    ctx: CanvasRenderingContext2D,
    gate: DioramaGateView,
    gateIndex: number,
    elapsedTime: number,
    toPxX: (rx: number) => number,
    toPxY: (ry: number) => number,
    toPxLen: (rLen: number) => number
  ): void {
    const isRightGate = gateIndex === 1;
    const moveDeltaRx = (gate.currentX - gate.cfg.x) * 14;
    const centerRx = (isRightGate ? 690 : 436) + moveDeltaRx;
    const centerRy = isRightGate ? 254 : 238;
    const halfSpanRx = isRightGate ? 53 : 45;
    const gateScale = isRightGate ? 0.62 : 0.56;

    const pulseScale =
      gate.pulseTimer > 0 ? 1 + Math.sin(gate.pulseTimer * Math.PI * 5) * 0.05 : 1.0;

    const lx = toPxX(centerRx - halfSpanRx);
    const ly = toPxY(centerRy - 4.5);
    const rx = toPxX(centerRx + halfSpanRx);
    const ry = toPxY(centerRy + 4.5);

    const spanPx = Math.hypot(rx - lx, ry - ly);
    const archRadius = spanPx * 0.5;
    const legHeight = spanPx * 0.78 * pulseScale;
    const midProj = { s: gateScale };

    const isHazard = gate.cfg.op === 'sub' || gate.cfg.op === 'div' || gate.cfg.style === 'hazard';
    const isGold = false;
    const primaryNeon = isHazard ? '#ff4d6d' : '#00f2ff';
    const outerFrame = isHazard ? '#e11d48' : '#2563eb';
    const midFrame = isHazard ? '#fb7185' : '#38bdf8';
    const coreWhite = isHazard ? '#fff1f2' : '#f0fdff';

    const lTopX = lx;
    const lTopY = ly - legHeight;
    const rTopX = rx;
    const rTopY = ry - legHeight;
    const archCenterX = (lTopX + rTopX) * 0.5;
    const archCenterY = (lTopY + rTopY) * 0.5;
    const tiltAngle = Math.atan2(ry - ly, rx - lx);

    ctx.save();

    // 1. Soft Ground Bloom under the Gate Threshold
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const groundGlow = ctx.createLinearGradient(lx, ly, rx, ry);
    groundGlow.addColorStop(0, 'rgba(0, 242, 255, 0.15)');
    groundGlow.addColorStop(
      0.5,
      isHazard
        ? 'rgba(255, 77, 109, 0.65)'
        : isGold
          ? 'rgba(250, 204, 21, 0.72)'
          : 'rgba(56, 235, 255, 0.72)'
    );
    groundGlow.addColorStop(1, 'rgba(0, 242, 255, 0.15)');
    ctx.strokeStyle = groundGlow;
    ctx.shadowColor = primaryNeon;
    ctx.shadowBlur = toPxLen(22 * midProj.s);
    ctx.lineWidth = toPxLen(12 * midProj.s);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(rx, ry);
    ctx.stroke();
    ctx.restore();

    // 2. Translucent Glowing Forcefield Curtain inside the Arch
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(lTopX, lTopY);
    ctx.ellipse(
      archCenterX,
      archCenterY,
      archRadius,
      archRadius * 0.94,
      tiltAngle,
      Math.PI,
      Math.PI * 2,
      false
    );
    ctx.lineTo(rx, ry);
    ctx.closePath();

    const fillGrad = ctx.createLinearGradient(
      archCenterX,
      archCenterY - archRadius,
      archCenterX,
      (ly + ry) * 0.5
    );
    if (isHazard) {
      fillGrad.addColorStop(0, 'rgba(244, 63, 94, 0.46)');
      fillGrad.addColorStop(0.6, 'rgba(225, 29, 72, 0.28)');
      fillGrad.addColorStop(1, 'rgba(255, 160, 180, 0.18)');
    } else if (isGold) {
      fillGrad.addColorStop(0, 'rgba(250, 204, 21, 0.48)');
      fillGrad.addColorStop(0.55, 'rgba(245, 158, 11, 0.32)');
      fillGrad.addColorStop(1, 'rgba(254, 240, 138, 0.22)');
    } else {
      fillGrad.addColorStop(0, 'rgba(0, 225, 255, 0.48)');
      fillGrad.addColorStop(0.55, 'rgba(56, 189, 248, 0.32)');
      fillGrad.addColorStop(1, 'rgba(186, 230, 253, 0.22)');
    }
    ctx.fillStyle = fillGrad;
    ctx.fill();

    // Shimmering vertical light streaks inside the portal
    ctx.clip();
    const streakAlpha = 0.22 + 0.08 * Math.sin(elapsedTime * 5);
    ctx.strokeStyle = `rgba(224, 250, 255, ${streakAlpha})`;
    ctx.lineWidth = toPxLen(4.0 * midProj.s);
    for (const frac of [0.25, 0.5, 0.75]) {
      const sx = lx + (rx - lx) * frac;
      const sy = ly + (ry - ly) * frac;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx, sy - legHeight - archRadius * 0.85);
      ctx.stroke();
    }
    ctx.restore();

    // 3. Pure 3D Glowing Neon Arch Tube
    const drawArchPath = () => {
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lTopX, lTopY);
      ctx.ellipse(
        archCenterX,
        archCenterY,
        archRadius,
        archRadius * 0.94,
        tiltAngle,
        Math.PI,
        Math.PI * 2,
        false
      );
      ctx.lineTo(rx, ry);
    };

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.shadowColor = primaryNeon;
    ctx.shadowBlur = toPxLen(28 * midProj.s);
    ctx.strokeStyle = outerFrame;
    ctx.lineWidth = toPxLen(18 * midProj.s);
    drawArchPath();
    ctx.stroke();

    ctx.strokeStyle = midFrame;
    ctx.lineWidth = toPxLen(13 * midProj.s);
    drawArchPath();
    ctx.stroke();

    ctx.strokeStyle = primaryNeon;
    ctx.lineWidth = toPxLen(8.5 * midProj.s);
    drawArchPath();
    ctx.stroke();

    ctx.strokeStyle = coreWhite;
    ctx.lineWidth = toPxLen(4.2 * midProj.s);
    drawArchPath();
    ctx.stroke();

    ctx.lineWidth = toPxLen(4.5 * midProj.s);
    ctx.strokeStyle = coreWhite;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(rx, ry);
    ctx.stroke();
    ctx.restore();

    // 4. Compact 3D Brushed-Slate Pedestal Bases at Left & Right Feet
    const drawPedestal = (px: number, py: number) => {
      const bw = toPxLen(24 * midProj.s);
      const bh = toPxLen(10 * midProj.s);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(tiltAngle * 0.65);

      ctx.fillStyle = '#475569';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = toPxLen(1.5);
      ctx.beginPath();
      ctx.roundRect(-bw * 0.5, -bh * 0.4, bw, bh * 0.85, toPxLen(3));
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };
    drawPedestal(lx, ly);
    drawPedestal(rx, ry);

    // 5. Glowing 3D Neon Label (+4, x3) centered inside the Arch
    const opChar =
      gateIndex === 1 && gate.cfg.op === 'add'
        ? 'x'
        : gate.cfg.op === 'add'
          ? '+'
          : gate.cfg.op === 'mul'
            ? 'x'
            : gate.cfg.op === 'div'
              ? '÷'
              : '-';
    const valNum = gateIndex === 0 && gate.cfg.value === 3 ? 4 : gateIndex === 1 && gate.cfg.value === 2 ? 3 : gate.cfg.value;
    const labelStr = `${opChar}${valNum}`;
    const fontSize = Math.round(toPxLen(54 * midProj.s));
    const textX = archCenterX;
    const textY = archCenterY + archRadius * 0.16;

    ctx.save();
    ctx.translate(textX, textY);
    ctx.rotate(tiltAngle * 0.25);
    ctx.font = `900 ${fontSize}px "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.shadowColor = primaryNeon;
    ctx.shadowBlur = toPxLen(18 * midProj.s);
    ctx.lineWidth = toPxLen(6.5 * midProj.s);
    ctx.strokeStyle = isHazard ? '#881337' : isGold ? '#78350f' : '#0369a1';
    ctx.strokeText(labelStr, 0, 0);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(labelStr, 0, 0);
    ctx.restore();

    ctx.restore();
  }

  private updateAndDrawSparks(
    ctx: CanvasRenderingContext2D,
    dt: number,
    toPxX: (rx: number) => number,
    toPxY: (ry: number) => number,
    toPxLen: (rLen: number) => number
  ): void {
    for (let i = this.clashSparks.length - 1; i >= 0; i--) {
      const sp = this.clashSparks[i];
      sp.age += dt;
      if (sp.age >= sp.maxAge) {
        this.clashSparks.splice(i, 1);
        continue;
      }
      sp.ox += sp.vx * dt;
      sp.oy += sp.vy * dt;
      sp.vy += 90 * dt;

      const proj = this.projectBridge(sp.u, sp.t);
      const sx = toPxX(proj.rx + sp.ox * proj.s);
      const sy = toPxY(proj.ry + sp.oy * proj.s);
      const r = toPxLen(sp.size * proj.s * (1 - sp.age / sp.maxAge));

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = sp.color;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = r * 2.5;
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(1, r), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /**
   * Renders the 3D Golden-Bronze Candy Cannon on its Chocolate Carriage with Peppermint Wheels
   * in the bottom-left foreground (`x: 70..365, y: 285..568` in 1024x571 coords),
   * plus the lush 3D glowing cyan water muzzle splash!
   */
  private drawForegroundCannon(
    ctx: CanvasRenderingContext2D,
    cannonProj: { rx: number; ry: number; s: number },
    state: DioramaRenderState,
    toPxX: (rx: number) => number,
    toPxY: (ry: number) => number,
    toPxLen: (rLen: number) => number
  ): void {
    const recoil = state.turretRecoil * 12;
    const cx = toPxX(cannonProj.rx - recoil * 0.78);
    const cy = toPxY(cannonProj.ry + 12 + recoil * 0.52);

    // 1. Soft dark contact shadow under the chocolate carriage & peppermint wheels
    ctx.save();
    ctx.translate(cx, cy + toPxLen(88));
    ctx.rotate(0.14);
    const cShadow = ctx.createRadialGradient(0, 0, toPxLen(20), 0, 0, toPxLen(155));
    cShadow.addColorStop(0, 'rgba(38, 16, 8, 0.68)');
    cShadow.addColorStop(0.65, 'rgba(38, 16, 8, 0.30)');
    cShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = cShadow;
    ctx.beginPath();
    ctx.ellipse(0, 0, toPxLen(155), toPxLen(62), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Draw the 3D Golden-Bronze Candy Cannon Sprite FIRST
    if (this.assetsLoaded.cannon) {
      const w = toPxLen(296);
      const h = w * (this.cannonImg.naturalHeight / Math.max(1, this.cannonImg.naturalWidth));
      ctx.save();
      ctx.translate(cx, cy);
      ctx.drawImage(this.cannonImg, -w * 0.5, -h * 0.5, w, h);
      ctx.restore();
    }

    // 3. Draw the Cohesive 3D Translucent Cyan Liquid Muzzle Splash emerging directly from the Cannon Mouth!
    const muzzleRx = cannonProj.rx + 120 - recoil * 0.5;
    const muzzleRy = cannonProj.ry - 98 + recoil * 0.35;
    const mx = toPxX(muzzleRx);
    const my = toPxY(muzzleRy);
    const splashPulse =
      0.96 + 0.08 * Math.sin(state.elapsedTime * 15) + state.turretRecoil * 0.22;

    ctx.save();
    if (this.assetsLoaded.splash) {
      const sw = toPxLen(96 * splashPulse);
      const sh = toPxLen(94 * splashPulse);
      ctx.drawImage(
        this.splashImg,
        toPxX(316 - recoil * 0.5),
        toPxY(232 + recoil * 0.35),
        sw,
        sh
      );
    }

    const waveGrad = ctx.createRadialGradient(
      mx,
      my,
      toPxLen(4),
      mx + toPxLen(24),
      my - toPxLen(8),
      toPxLen(54 * splashPulse)
    );
    waveGrad.addColorStop(0, 'rgba(240, 254, 255, 0.92)');
    waveGrad.addColorStop(0.5, 'rgba(34, 211, 238, 0.72)');
    waveGrad.addColorStop(0.85, 'rgba(6, 182, 212, 0.35)');
    waveGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
    ctx.fillStyle = waveGrad;
    ctx.beginPath();
    ctx.ellipse(
      mx + toPxLen(18),
      my - toPxLen(6),
      toPxLen(42 * splashPulse),
      toPxLen(34 * splashPulse),
      -0.35,
      0,
      Math.PI * 2
    );
    ctx.fill();

    const drops = [
      { dx: 32, dy: -46, r: 6.5 },
      { dx: 58, dy: -26, r: 7.5 },
      { dx: 62, dy: 4, r: 6.0 },
      { dx: 42, dy: 24, r: 5.5 },
    ];
    for (let d = 0; d < drops.length; d++) {
      const dr = drops[d];
      const pulse = 0.9 + 0.14 * Math.sin(state.elapsedTime * 12 + d);
      const dx = mx + toPxLen(dr.dx * pulse);
      const dy = my + toPxLen(dr.dy * pulse);
      const rad = toPxLen(dr.r);
      ctx.fillStyle = 'rgba(56, 228, 255, 0.92)';
      ctx.beginPath();
      ctx.arc(dx, dy, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.arc(dx - rad * 0.25, dy - rad * 0.25, rad * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
