/** MC-12 冰川雪橇竞速冲关：从 World3D 原样搬出的方法（字段仍在 World3D）。继承链见 ../World3DFull.ts。 */
import * as THREE from 'three';
import {
  LevelConfig,
} from '../../levels/LevelData';
import { UI_ART } from '../SkillIcons';
import { sound } from '../../audio/SoundManager';
import {
  SLED_SNOW_PLANE_LEN,
  SLED_SNOW_REPEAT_V,
  SLED_SNOW_TILE_M,
  SLED_DECK_SEATS,
  SLED_TUBE_COLS,
  SLED_DECK_HALF,
  SLED_SCENERY_SPAN,
  SLED_ICICLE_FALL_START,
  SLED_ICICLE_LAND_AT,
  SLED_AVALANCHE_ROLL_START,
} from '../world/CourseConstants';
import {
  stylizeMaterialAs2DIllustration,
} from '../SceneThemes';
import {
  MAX_UNITS,
  SLED_Z,
  SledGateRuntime,
  TRACK_HALF_W,
  Unit,
} from '../WorldTypes';
import { SubmarineRescueMode } from './SubmarineRescue';

export abstract class GlacierSledMode extends SubmarineRescueMode {
  // ============================================================================
  // MC-12: Glacier Sled Race (3D toy sled, scrolling glacier course, gates, icicles, avalanche waves)
  // ============================================================================

  /** Wintry glacier tint on top of the glacier theme (re-applied every load; applyTheme restores other modes). */
  private applyGlacierSledAmbience(): void {
    this.scene.background = new THREE.Color(0xcdeeff);
    this.scene.fog = new THREE.FogExp2(0xe6f7ff, 0.0058);
    this.hemiLight.color.setHex(0xf0f9ff);
    this.hemiLight.groundColor.setHex(0x93c5fd);
    this.dirLight.color.setHex(0xfffbeb);
    this.rimLight.color.setHex(0x7dd3fc);
  }

  /** Procedural (non-canvas) snow surface: sparkles, wind ripples & ski grooves; scrolled along v while sledding. */
  private createSledSnowTexture(): THREE.DataTexture {
    const size = 64;
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const ripple = Math.sin((y / size) * Math.PI * 8 + Math.sin((x / size) * Math.PI * 2) * 1.6) * 0.5 + 0.5;
        const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        const noise = hash - Math.floor(hash);
        let r = 222 + ripple * 22 + noise * 6;
        let g = 236 + ripple * 14 + noise * 5;
        let b = 250 + ripple * 5;
        if (noise > 0.975) {
          r = 255;
          g = 255;
          b = 255;
        }
        const groove = Math.abs((x % 32) - 15.5);
        if (groove < 1.6) {
          r -= 9 * (1.6 - groove);
          g -= 5 * (1.6 - groove);
        }
        data[i] = Math.max(0, Math.min(255, Math.round(r)));
        data[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
        data[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
        data[i + 3] = 255;
      }
    }
    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, SLED_SNOW_REPEAT_V);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  protected buildGlacierSled3D(level: LevelConfig): void {
    const course = level.sledCourse || {
      length: 300,
      baseSpeed: 10.4,
      timeLimitSec: 41,
      startRiders: 14,
      maxRiders: 120,
      maxSteerX: 8.0,
      hitSlowMult: 0.5,
      hitSlowSec: 0.9,
      boostMult: 1.4,
      boostSec: 1.6,
    };
    this.applyGlacierSledAmbience();
    const L = course.length;

    // 1. Static snow overlay across the deck (texture scrolls toward the camera as the sled slides downhill)
    const snowTex = this.createSledSnowTexture();
    const snowMat = new THREE.MeshStandardMaterial({
      map: snowTex,
      color: 0xffffff,
      roughness: 0.82,
      metalness: 0.0,
      emissive: 0xdbeafe,
      emissiveIntensity: 0.08,
    });
    const snowPlane = new THREE.Mesh(new THREE.PlaneGeometry(TRACK_HALF_W * 2 + 0.6, SLED_SNOW_PLANE_LEN), snowMat);
    snowPlane.rotation.x = -Math.PI / 2;
    snowPlane.position.set(0, 0.03, 0.5);
    snowPlane.receiveShadow = true;
    this.levelGroup.add(snowPlane);

    // 2. Course group: every course item sits at local z = -d; the group slides toward +z by the distance covered
    const courseGroup = new THREE.Group();
    courseGroup.position.z = SLED_Z;
    this.levelGroup.add(courseGroup);

    const iceMat = new THREE.MeshStandardMaterial({
      color: 0xbfe9ff,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.28,
      roughness: 0.08,
      metalness: 0.12,
      transparent: true,
      opacity: 0.92,
    });
    const snowWhiteMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xe0f2fe, emissiveIntensity: 0.18, roughness: 0.7 }),
      0.84
    );
    const brassMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0xe6b34a, emissive: 0x3b2306, emissiveIntensity: 0.16, roughness: 0.26, metalness: 0.7 }),
      0.82
    );
    const sledRedMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0xe11d48, emissive: 0x7f1d1d, emissiveIntensity: 0.22, roughness: 0.3, metalness: 0.12 }),
      0.86
    );

    // 3. Scrolling edge scenery (instanced treadmill that wraps within the bridge deck): snow banks,
    //    slalom flags & little pines along both curbs
    const sceneryCount = Math.round(SLED_SCENERY_SPAN / 4.4) * 2;
    const bankInst = new THREE.InstancedMesh(new THREE.SphereGeometry(1.0, 12, 8), snowWhiteMat, sceneryCount);
    const flagCount = Math.round(SLED_SCENERY_SPAN / 11) * 2;
    const poleInst = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.06, 0.06, 2.0, 6),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 }),
      flagCount
    );
    const flagInst = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.62, 0.42, 0.05),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x1e293b, emissiveIntensity: 0.12, roughness: 0.45 }),
      flagCount
    );
    const pineCount = Math.round(SLED_SCENERY_SPAN / 11) * 2;
    const pineGreenMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0x15803d, emissive: 0x052e16, emissiveIntensity: 0.2, roughness: 0.5 }),
      0.82
    );
    const pineLowInst = new THREE.InstancedMesh(new THREE.ConeGeometry(0.85, 1.5, 9), pineGreenMat, pineCount);
    const pineHighInst = new THREE.InstancedMesh(new THREE.ConeGeometry(0.62, 1.2, 9), pineGreenMat, pineCount);
    const pineCapInst = new THREE.InstancedMesh(new THREE.ConeGeometry(0.4, 0.62, 9), snowWhiteMat, pineCount);
    this.sledScenery = [];
    const addScenery = (inst: THREE.InstancedMesh, rows: number[][]): void => {
      const data = new Float32Array(rows.length * 6);
      rows.forEach((r, i) => data.set(r, i * 6));
      inst.count = rows.length;
      inst.frustumCulled = false;
      this.levelGroup.add(inst);
      this.sledScenery.push({ inst, data });
    };
    const bankRows: number[][] = [];
    for (let z0 = 0; z0 < SLED_SCENERY_SPAN - 0.01; z0 += 4.4) {
      for (const side of [-1, 1]) {
        const jitter = Math.sin(z0 * 1.7 + side) * 0.5 + 0.5;
        bankRows.push([side * (TRACK_HALF_W - 0.2 + jitter * 0.3), 0.05, z0 + jitter * 1.2, 1.1 + jitter * 0.6, 0.38 + jitter * 0.18, 1.5 + jitter * 0.5]);
      }
    }
    addScenery(bankInst, bankRows);
    const poleRows: number[][] = [];
    const flagRows: number[][] = [];
    const flagCols = [new THREE.Color(0xef4444), new THREE.Color(0x2563eb)];
    let fi = 0;
    for (let z0 = 2; z0 < SLED_SCENERY_SPAN - 0.01; z0 += 11) {
      for (const side of [-1, 1]) {
        const x = side * (TRACK_HALF_W - 1.25);
        poleRows.push([x, 1.0, z0, 1, 1, 1]);
        flagRows.push([x - side * 0.34, 1.72, z0, 1, 1, 1]);
        flagInst.setColorAt(fi, flagCols[(Math.round(z0 / 11) + (side > 0 ? 1 : 0)) & 1]);
        fi++;
      }
    }
    if (flagInst.instanceColor) flagInst.instanceColor.needsUpdate = true;
    addScenery(poleInst, poleRows);
    addScenery(flagInst, flagRows);
    const pineLowRows: number[][] = [];
    const pineHighRows: number[][] = [];
    const pineCapRows: number[][] = [];
    for (let z0 = 7.5; z0 < SLED_SCENERY_SPAN - 0.01; z0 += 11) {
      for (const side of [-1, 1]) {
        const off = (Math.sin(z0 * 0.37 + side * 2.1) * 0.5 + 0.5) * 0.4;
        const x = side * (TRACK_HALF_W - 0.35 - off);
        const z = z0 + 2.2 * side;
        const ps = 0.9 + off;
        pineLowRows.push([x, 0.75 * ps + 0.1, z, ps, ps, ps]);
        pineHighRows.push([x, 1.55 * ps + 0.1, z, ps, ps, ps]);
        pineCapRows.push([x, 2.15 * ps + 0.1, z, ps, ps, ps]);
      }
    }
    addScenery(pineLowInst, pineLowRows);
    addScenery(pineHighInst, pineHighRows);
    addScenery(pineCapInst, pineCapRows);
    this.updateSledScenery(0);

    // 4. Start gate (summit, behind the sled at d = 0) & finish line arch with checkered banner at d = L
    const buildArch = (d: number, isFinish: boolean): THREE.Group => {
      const arch = new THREE.Group();
      arch.position.set(0, 0, -d);
      arch.userData.sledArchD = d;
      for (const side of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 4.6, 14), isFinish ? sledRedMat : iceMat);
        post.position.set(side * 9.9, 2.3, 0);
        post.castShadow = true;
        arch.add(post);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.46, 14, 12), brassMat);
        cap.position.set(side * 9.9, 4.75, 0);
        arch.add(cap);
        for (const ry of [0.6, 2.3, 3.9]) {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.07, 8, 18), brassMat);
          ring.rotation.x = Math.PI / 2;
          ring.position.set(side * 9.9, ry, 0);
          arch.add(ring);
        }
      }
      const beam = new THREE.Mesh(new THREE.BoxGeometry(19.8, 0.32, 0.36), brassMat);
      beam.position.set(0, 4.5, 0);
      arch.add(beam);
      if (isFinish) {
        const blackMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.5 });
        const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xe0f2fe, emissiveIntensity: 0.2, roughness: 0.5 });
        const cells = 18;
        const cw = 18.4 / cells;
        for (let r = 0; r < 2; r++) {
          for (let c = 0; c < cells; c++) {
            const cell = new THREE.Mesh(new THREE.BoxGeometry(cw, 0.5, 0.08), (r + c) % 2 === 0 ? blackMat : whiteMat);
            cell.position.set(-9.2 + cw * (c + 0.5), 3.95 - r * 0.5, 0.08);
            arch.add(cell);
          }
        }
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.75, depthWrite: false });
        const finishLine = new THREE.Mesh(new THREE.PlaneGeometry(19.6, 0.9), lineMat);
        finishLine.rotation.x = -Math.PI / 2;
        finishLine.position.set(0, 0.06, 0);
        arch.add(finishLine);
        const cup = this.buildHallTrophyCupModel(3, 0x7dd3fc);
        cup.scale.setScalar(1.25);
        cup.position.set(0, 4.7, 0);
        arch.add(cup);
      } else {
        const bannerMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.3, roughness: 0.4 });
        const banner = new THREE.Mesh(new THREE.BoxGeometry(17.8, 0.7, 0.08), bannerMat);
        banner.position.set(0, 3.9, 0.06);
        arch.add(banner);
      }
      courseGroup.add(arch);
      return arch;
    };
    buildArch(-1.5, false);
    this.sledFinishGroup = buildArch(L, true);

    // 5. Sled gates (+N / xN forcefield arches across half of the course)
    this.sledGates = [];
    const gateH = 2.7;
    for (const cfg of level.sledGates || []) {
      const group = new THREE.Group();
      group.position.set(cfg.x, 0, -cfg.d);
      for (const side of [-1, 1]) {
        const px = side * (cfg.width * 0.5);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, gateH, 12), iceMat);
        post.position.set(px, gateH * 0.5, 0);
        group.add(post);
        const capSnow = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), snowWhiteMat);
        capSnow.scale.set(1, 0.6, 1);
        capSnow.position.set(px, gateH + 0.12, 0);
        group.add(capSnow);
        const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), iceMat);
        crystal.position.set(px, gateH + 0.46, 0);
        group.add(crystal);
      }
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, cfg.width, 10), brassMat);
      bar.rotation.z = Math.PI / 2;
      bar.position.set(0, gateH + 0.02, 0);
      group.add(bar);
      const label = cfg.op === 'mul' ? `×${cfg.value}` : `+${cfg.value}`;
      const shieldMat = new THREE.MeshBasicMaterial({
        map: this.getGateBannerTexture(cfg.style, label),
        transparent: true,
        opacity: 0.97,
        alphaTest: 0.05,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const shield = new THREE.Mesh(new THREE.PlaneGeometry(cfg.width - 0.3, gateH - 0.1), shieldMat);
      shield.position.set(0, gateH * 0.5 + 0.05, 0);
      group.add(shield);
      courseGroup.add(group);
      this.sledGates.push({ cfg, group, shieldMat, resolved: false, triggered: false, pulse: 0 });
    }

    // 6. Falling icicles (ground shadow telegraph -> icicle drops -> ice spike obstacle)
    this.sledIcicles = [];
    const spikeGeo = new THREE.ConeGeometry(0.52, 2.5, 10);
    const spikeSmallGeo = new THREE.ConeGeometry(0.3, 1.5, 8);
    const shadowGeo = new THREE.CircleGeometry(1.0, 28);
    shadowGeo.rotateX(-Math.PI / 2);
    for (const cfg of level.sledIcicles || []) {
      const group = new THREE.Group();
      group.position.set(cfg.x, 0, -cfg.d);
      const shadowMat = new THREE.MeshBasicMaterial({ color: 0x1d4ed8, transparent: true, opacity: 0.18, depthWrite: false });
      const shadow = new THREE.Mesh(shadowGeo, shadowMat);
      shadow.scale.setScalar(cfg.radius * 1.15);
      shadow.position.y = 0.06;
      shadow.renderOrder = 1;
      group.add(shadow);
      const spike = new THREE.Group();
      const main = new THREE.Mesh(spikeGeo, iceMat);
      main.rotation.x = Math.PI;
      main.position.y = 1.25;
      main.castShadow = true;
      spike.add(main);
      for (const [ox, oz, rz] of [
        [0.42, 0.18, 0.35],
        [-0.38, -0.2, -0.4],
      ] as const) {
        const side = new THREE.Mesh(spikeSmallGeo, iceMat);
        side.rotation.set(Math.PI, 0, rz);
        side.position.set(ox, 0.85, oz);
        spike.add(side);
      }
      const frost = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), snowWhiteMat);
      frost.scale.set(1.2, 0.35, 1.2);
      frost.position.y = 2.45;
      spike.add(frost);
      spike.position.y = 16;
      spike.visible = false;
      group.add(spike);
      courseGroup.add(group);
      this.sledIcicles.push({
        cfg,
        group,
        spike,
        shadowMat,
        landed: false,
        shattered: false,
        knocked: 0,
        sledChecked: false,
        shatterAnim: 0,
      });
    }

    // 7. Avalanche snow waves rolling up the slope with one flagged safe gap
    this.sledAvalanches = [];
    const boulderGeo = new THREE.SphereGeometry(1.0, 12, 9);
    const gapMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.32, depthWrite: false });
    const flagBlueMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, emissive: 0x1d4ed8, emissiveIntensity: 0.4, roughness: 0.4 });
    for (const cfg of level.sledAvalanches || []) {
      const group = new THREE.Group();
      group.position.set(0, 0, -cfg.d);
      const crests: THREE.Object3D[] = [];
      const gapL = cfg.gapX - cfg.gapW * 0.5;
      const gapR = cfg.gapX + cfg.gapW * 0.5;
      let k = 0;
      for (let x = -TRACK_HALF_W + 0.7; x <= TRACK_HALF_W - 0.7; x += 1.05) {
        if (x > gapL - 0.5 && x < gapR + 0.5) continue;
        const crest = new THREE.Group();
        crest.position.set(x, 0, 0);
        const big = new THREE.Mesh(boulderGeo, snowWhiteMat);
        const bs = 0.85 + ((k * 7) % 5) * 0.09;
        big.scale.set(bs, bs * 0.95, bs * 0.8);
        big.position.y = bs * 0.7;
        big.castShadow = true;
        crest.add(big);
        const top = new THREE.Mesh(boulderGeo, snowWhiteMat);
        top.scale.setScalar(0.48 + ((k * 3) % 4) * 0.06);
        top.position.set(0.25, bs * 1.45, -0.35);
        crest.add(top);
        crest.userData.phase = k * 0.73;
        group.add(crest);
        crests.push(crest);
        k++;
      }
      const gapStrip = new THREE.Mesh(new THREE.PlaneGeometry(cfg.gapW - 0.4, 3.2), gapMat);
      gapStrip.rotation.x = -Math.PI / 2;
      gapStrip.position.set(cfg.gapX, 0.07, 0.4);
      gapStrip.renderOrder = 1;
      group.add(gapStrip);
      for (const fx of [gapL, gapR]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.6, 8), brassMat);
        pole.position.set(fx, 1.3, 0);
        group.add(pole);
        const flag = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.46, 0.05), flagBlueMat);
        flag.position.set(fx + (fx < cfg.gapX ? 0.38 : -0.38), 2.3, 0);
        group.add(flag);
      }
      courseGroup.add(group);
      this.sledAvalanches.push({ cfg, group, crests, d: cfg.d, rolling: false, knocked: 0, sledChecked: false, passed: false });
    }

    // 8. Ice boost strips (glowing chevrons)
    this.sledBoosts = [];
    for (const cfg of level.sledBoosts || []) {
      const group = new THREE.Group();
      group.position.set(cfg.x, 0.05, -cfg.d);
      const padMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.38, depthWrite: false });
      const pad = new THREE.Mesh(new THREE.PlaneGeometry(cfg.width, 3.6), padMat);
      pad.rotation.x = -Math.PI / 2;
      pad.renderOrder = 1;
      group.add(pad);
      const arrowMat = new THREE.MeshBasicMaterial({ color: 0xecfeff, transparent: true, opacity: 0.9, depthWrite: false });
      for (let a = 0; a < 3; a++) {
        for (const side of [-1, 1]) {
          const bar = new THREE.Mesh(new THREE.BoxGeometry(cfg.width * 0.36, 0.04, 0.22), arrowMat);
          bar.position.set(side * cfg.width * 0.15, 0.03, 1.1 - a * 1.1);
          bar.rotation.y = side * 0.62;
          group.add(bar);
        }
      }
      courseGroup.add(group);
      this.sledBoosts.push({ cfg, group, arrowMat, triggered: false, pulse: 0 });
    }

    // 9. The player's 3D toy sled (red lacquer toboggan, brass rails, gears, curled runners & lantern)
    const sledGroup = new THREE.Group();
    sledGroup.position.set(0, 0, SLED_Z);
    const bodyGroup = new THREE.Group();
    sledGroup.add(bodyGroup);
    const hullMat = sledRedMat;
    const runnerGeo = new THREE.BoxGeometry(0.14, 0.12, 4.4);
    for (const side of [-1, 1]) {
      const runner = new THREE.Mesh(runnerGeo, brassMat);
      runner.position.set(side * 1.7, 0.1, 0.1);
      bodyGroup.add(runner);
      const curl = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.07, 8, 18, Math.PI * 0.95), brassMat);
      curl.rotation.y = Math.PI / 2;
      curl.position.set(side * 1.7, 0.52, -2.12);
      bodyGroup.add(curl);
      for (const sz of [-1.3, 0.2, 1.6]) {
        const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.36, 8), brassMat);
        strut.position.set(side * 1.7, 0.3, sz);
        bodyGroup.add(strut);
      }
    }
    const deck = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.24, 3.9), hullMat);
    deck.position.set(0, 0.5, 0.05);
    deck.castShadow = true;
    bodyGroup.add(deck);
    for (const side of [-1, 1]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.5, 3.9), hullMat);
      panel.position.set(side * 2.1, 0.78, 0.05);
      bodyGroup.add(panel);
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.95, 10), brassMat);
      rail.rotation.x = Math.PI / 2;
      rail.position.set(side * 2.1, 1.06, 0.05);
      bodyGroup.add(rail);
    }
    const backRail = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.2, 10), brassMat);
    backRail.rotation.z = Math.PI / 2;
    backRail.position.set(0, 0.86, 2.02);
    bodyGroup.add(backRail);
    // Curled toboggan nose: a half pipe across the front (bottom -> front -> top), open toward the riders
    const noseMat = hullMat.clone();
    noseMat.side = THREE.DoubleSide;
    const nose = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.6, 4.1, 22, 1, false, Math.PI / 2, Math.PI),
      noseMat
    );
    nose.rotation.z = Math.PI / 2;
    nose.position.set(0, 0.6, -1.9);
    nose.castShadow = true;
    bodyGroup.add(nose);
    const noseTrim = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 4.24, 10), brassMat);
    noseTrim.rotation.z = Math.PI / 2;
    noseTrim.position.set(0, 1.2, -1.9);
    bodyGroup.add(noseTrim);
    const gears: THREE.Object3D[] = [];
    for (const side of [-1, 1]) {
      const gear = new THREE.Group();
      gear.position.set(side * 2.2, 0.76, 0.6);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.07, 8, 20), brassMat);
      ring.rotation.y = Math.PI / 2;
      gear.add(ring);
      for (let t = 0; t < 8; t++) {
        const ang = (t / 8) * Math.PI * 2;
        const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.1), brassMat);
        tooth.position.set(0, Math.cos(ang) * 0.38, Math.sin(ang) * 0.38);
        tooth.rotation.x = ang;
        gear.add(tooth);
      }
      bodyGroup.add(gear);
      gears.push(gear);
    }
    const lampMat = new THREE.MeshStandardMaterial({ color: 0xfef9c3, emissive: 0xfacc15, emissiveIntensity: 1.1, roughness: 0.2 });
    const lampPost = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8), brassMat);
    lampPost.position.set(0, 1.5, -2.05);
    bodyGroup.add(lampPost);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 12), lampMat);
    lamp.position.set(0, 1.86, -2.05);
    bodyGroup.add(lamp);
    const lampCap = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.2, 12), brassMat);
    lampCap.position.set(0, 2.1, -2.05);
    bodyGroup.add(lampCap);
    bodyGroup.traverse((obj) => {
      const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (mat && !Array.isArray(mat)) mat.fog = false;
    });
    const auraMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false });
    const auraGeo = new THREE.RingGeometry(2.7, 2.95, 44);
    auraGeo.rotateX(-Math.PI / 2);
    const aura = new THREE.Mesh(auraGeo, auraMat);
    aura.position.set(0, 0.07, 0.3);
    aura.renderOrder = 1;
    sledGroup.add(aura);
    this.levelGroup.add(sledGroup);

    // 10. Snow tubes for riders that overflow the sled deck (one instanced draw)
    const tubeInst = new THREE.InstancedMesh(
      new THREE.TorusGeometry(0.34, 0.14, 8, 18).rotateX(Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.32, metalness: 0.05 }),
      course.maxRiders
    );
    tubeInst.count = 0;
    tubeInst.frustumCulled = false;
    const tubeCols = [0xf43f5e, 0x38bdf8, 0xfacc15, 0x34d399].map((h) => new THREE.Color(h));
    for (let i = 0; i < course.maxRiders; i++) tubeInst.setColorAt(i, tubeCols[i % tubeCols.length]);
    if (tubeInst.instanceColor) tubeInst.instanceColor.needsUpdate = true;
    this.levelGroup.add(tubeInst);

    const sledLabel = document.createElement('div');
    sledLabel.className = 'subtower-label glacier-sled-label';
    sledLabel.style.display = 'none';
    this.labelsContainer.appendChild(sledLabel);

    this.sledXHistory.fill(0);
    this.glacierSled = {
      active: true,
      tier: level.sledTier || 1,
      group: sledGroup,
      bodyGroup,
      hullMat,
      lampMat,
      gears,
      auraRing: aura,
      auraRingMat: auraMat,
      courseGroup,
      snowTex,
      tubeInst,
      x: 0,
      z: SLED_Z,
      distance: 0,
      courseLength: L,
      baseSpeed: course.baseSpeed,
      speed: 0,
      timeLeft: course.timeLimitSec,
      timeLimit: course.timeLimitSec,
      maxSteerX: course.maxSteerX,
      maxRiders: course.maxRiders,
      hitSlowMult: course.hitSlowMult,
      hitSlowSec: course.hitSlowSec,
      boostMult: course.boostMult,
      boostSec: course.boostSec,
      slowTimer: 0,
      boostTimer: 0,
      hitFlash: 0,
      sprayTimer: 0,
      state: 'sliding',
      labelEl: sledLabel,
    };
    this.bossHp = 100;
  }

  /** Spawns the starting riders seated on the sled (start riders + 冰晶奖章 milestone bonus). */
  protected spawnStartingSledRiders(level: LevelConfig): number {
    const course = level.sledCourse;
    const bonus = this.state.getIceMedalMilestoneBonus().sledBonusRiders;
    const n = Math.max(1, Math.min(course?.maxRiders ?? 140, (course?.startRiders ?? 14) + bonus));
    let spawned = 0;
    for (let k = 0; k < n; k++) {
      const slot = this.getSledSlot(k, 0);
      const u = this.spawnUnit('blue', 'normal', slot.x, slot.z, 0, 0);
      if (u) {
        u.spawnHop = 0;
        u.rideY = slot.y;
        u.sledSlotX = slot.x;
        u.sledSlotZ = slot.z;
        spawned++;
      }
    }
    this.sledPeakRiders = spawned;
    this.sledRiderCount = spawned;
    return spawned;
  }

  /** Formation slot k: first 20 riders sit on the sled deck (5 x 4); the rest trail behind on snow tubes (8 wide). */
  private getSledSlot(
    k: number,
    sledX: number,
    out = this.sledSlotScratch
  ): { x: number; z: number; y: number; onDeck: boolean; row: number } {
    if (k < SLED_DECK_SEATS) {
      const col = k % 5;
      const row = Math.floor(k / 5);
      out.x = sledX + (col - 2) * 0.8;
      out.z = SLED_Z - 1.25 + row * 0.85;
      out.y = 0.62;
      out.onDeck = true;
      out.row = row;
      return out;
    }
    const t = k - SLED_DECK_SEATS;
    const col = t % SLED_TUBE_COLS;
    const row = Math.floor(t / SLED_TUBE_COLS);
    out.x = sledX + (col - (SLED_TUBE_COLS - 1) / 2) * 0.7;
    out.z = SLED_Z + 2.75 + row * 0.8;
    out.y = 0.2;
    out.onDeck = false;
    out.row = row + 4;
    return out;
  }

  public getSledRiderCount(): number {
    let n = 0;
    for (let i = 0; i < MAX_UNITS; i++) {
      const u = this.units[i];
      if (u.active && u.team === 'blue') n++;
    }
    return n;
  }

  public getSledProgressPct(): number {
    const s = this.glacierSled;
    if (!s) return 0;
    return Math.max(0, Math.min(100, Math.round((s.distance / Math.max(1, s.courseLength)) * 100)));
  }

  public getSledStateLabel(): string {
    const s = this.glacierSled;
    if (!s) return '雪橇未出发';
    switch (s.state) {
      case 'boosting':
        return '冰面加速中';
      case 'stumbled':
        return '颠簸减速';
      case 'finished':
        return '冲过终点线';
      case 'timeout':
        return '超时未冲线';
      case 'wiped':
        return '波波全部落橇';
      default:
        return '高速滑行中';
    }
  }

  /** Knocks one rider off the sled (a frost / pet shell absorbs the hit instead). Returns true if removed. */
  protected knockSledRider(u: Unit, silent = false): boolean {
    if (!u.active || u.team !== 'blue') return false;
    if (u.frostShield) {
      u.frostShield = false;
      u.petShellGranted = false;
      if (!silent) this.spawnBurstParticles(u.x, 0.9 + (u.rideY || 0), u.z, 0x7dd3fc, 4);
      return false;
    }
    u.active = false;
    this.sledRidersLost += 1;
    if (!silent) {
      this.spawnBurstParticles(u.x, 0.8 + (u.rideY || 0), u.z, 0xe0f2fe, 6);
      this.spawnBurstParticles(u.x, 1.2 + (u.rideY || 0), u.z, 0x60a5fa, 3);
    }
    return true;
  }

  /** Places every rider exactly on its formation slot (used at load and by self-checks). */
  public snapSledRidersToSlots(): void {
    const s = this.glacierSled;
    if (!s) return;
    this.sledXHistory.fill(s.x);
    let k = 0;
    for (let i = 0; i < MAX_UNITS; i++) {
      const u = this.units[i];
      if (!u.active || u.team !== 'blue') continue;
      const slot = this.getSledSlot(k++, s.x);
      u.x = slot.x;
      u.z = slot.z;
      u.vx = 0;
      u.vz = 0;
      u.rideY = slot.y;
      u.sledSlotX = slot.x;
      u.sledSlotZ = slot.z;
    }
  }

  private applySledGate(g: SledGateRuntime, silent = false): number {
    const s = this.glacierSled;
    if (!s) return 0;
    const riders = this.getSledRiderCount();
    const want = g.cfg.op === 'mul' ? riders * (Math.max(1, g.cfg.value) - 1) : g.cfg.value;
    const room = Math.max(0, s.maxRiders - riders);
    const n = Math.max(0, Math.min(room, Math.floor(want)));
    let added = 0;
    for (let k = 0; k < n; k++) {
      const u = this.spawnUnit(
        'blue',
        k % 6 === 0 ? 'charged' : 'normal',
        s.x + (Math.random() - 0.5) * 3.0,
        SLED_Z - 2.6 - Math.random() * 1.2,
        0,
        0
      );
      if (u) {
        u.spawnHop = 0.6;
        u.rideY = 0.2;
        added++;
      }
    }
    g.triggered = true;
    g.pulse = 1.0;
    this.sledGatesPassed += 1;
    this.sledPeakRiders = Math.max(this.sledPeakRiders, riders + added);
    if (!silent) {
      sound.playCloneGate(g.cfg.op === 'mul' ? 3 : 2);
      this.spawnBurstParticles(s.x, 1.6, SLED_Z - 2.2, g.cfg.op === 'mul' ? 0xfacc15 : 0x38bdf8, 22);
      this.spawnShockwave(s.x, SLED_Z - 1.8, g.cfg.op === 'mul' ? 0xfacc15 : 0x7dd3fc, 4.2, 0.35);
      this.spawnFloatingPopup(
        s.x,
        3.2,
        SLED_Z - 2.0,
        added < n || n < want ? `+${added} 波波上橇 (满载)` : `+${added} 波波上橇!`,
        g.cfg.op === 'mul' ? '#fde047' : '#bae6fd'
      );
    }
    return added;
  }

  private sledStumble(cause: string, silent = false): void {
    const s = this.glacierSled;
    if (!s) return;
    s.slowTimer = Math.max(s.slowTimer, s.hitSlowSec);
    s.hitFlash = 1.0;
    if (!silent) {
      this.addCameraShake(0.32);
      this.spawnBurstParticles(s.x, 1.2, SLED_Z - 1.5, 0xffffff, 18);
      this.spawnFloatingPopup(s.x, 3.6, SLED_Z - 1.0, cause, '#fda4af');
    }
  }

  /**
   * Autopilot target x (used by self-checks / screenshots / demo): prefers the richer gate, avoids ice spikes
   * and lines up with the next avalanche gap.
   */
  public getSledAutopilotX(): number {
    const s = this.glacierSled;
    if (!s) return 0;
    const riders = this.getSledRiderCount();
    let bestX = s.x;
    let bestScore = -Infinity;
    for (let x = -s.maxSteerX; x <= s.maxSteerX + 0.01; x += 0.5) {
      let score = -Math.abs(x - s.x) * 0.05;
      for (const g of this.sledGates) {
        if (g.resolved) continue;
        const ahead = g.cfg.d - s.distance;
        if (ahead < 0 || ahead > 34) continue;
        if (Math.abs(x - g.cfg.x) <= g.cfg.width * 0.5 - 0.6) {
          score += (g.cfg.op === 'mul' ? riders * (g.cfg.value - 1) : g.cfg.value) * (1 - ahead / 60);
        }
      }
      for (const ic of this.sledIcicles) {
        if (ic.shattered) continue;
        const ahead = ic.cfg.d - s.distance;
        if (ahead < -1.5 || ahead > 24) continue;
        const dx = Math.abs(x - ic.cfg.x);
        const reach = ic.cfg.radius + (riders > SLED_DECK_SEATS ? 3.5 : 2.2);
        if (dx < reach) score -= (reach - dx) * 30 * (1.2 - ahead / 30);
      }
      for (const av of this.sledAvalanches) {
        if (av.passed) continue;
        const ahead = av.d - s.distance;
        if (ahead < -3 || ahead > 15) continue;
        const off = Math.abs(x - av.cfg.gapX) - (av.cfg.gapW * 0.5 - 1.7);
        if (off > 0) score -= 120 + off * 40;
      }
      for (const b of this.sledBoosts) {
        if (b.triggered) continue;
        const ahead = b.cfg.d - s.distance;
        if (ahead < 0 || ahead > 22) continue;
        if (Math.abs(x - b.cfg.x) <= b.cfg.width * 0.5) score += 6;
      }
      if (score > bestScore) {
        bestScore = score;
        bestX = x;
      }
    }
    return bestX;
  }

  /** Wraps the curb scenery along the bridge deck (z in [-SLED_DECK_HALF, +SLED_DECK_HALF]) and fades it at both ends. */
  protected updateSledScenery(distance: number): void {
    const m4 = this.tempMatrix4Sled;
    const pos = this.tempVecSledA;
    const sc = this.tempVecSledB;
    const q = this.tempQuatSled.identity();
    for (const item of this.sledScenery) {
      const d = item.data;
      const n = d.length / 6;
      for (let i = 0; i < n; i++) {
        const o = i * 6;
        const z = -SLED_DECK_HALF + ((((d[o + 2] + distance) % SLED_SCENERY_SPAN) + SLED_SCENERY_SPAN) % SLED_SCENERY_SPAN);
        const fade = Math.max(0, Math.min(1, (z + SLED_DECK_HALF) / 3.5, (SLED_DECK_HALF - z) / 2.5));
        pos.set(d[o], d[o + 1] * (0.4 + fade * 0.6), z);
        sc.set(d[o + 3] * fade, d[o + 4] * fade, d[o + 5] * fade);
        m4.compose(pos, q, sc);
        item.inst.setMatrixAt(i, m4);
      }
      item.inst.instanceMatrix.needsUpdate = true;
    }
  }

  protected updateGlacierSled(dt: number): void {
    const s = this.glacierSled;
    const level = this.currentLevel;
    if (!s || !s.active || !level) return;
    const t = this.elapsedTime;

    // 1. Steering (the sled follows the cannon's lateral aim) & speed (accelerate, boost, stumble)
    const steerX = THREE.MathUtils.clamp(this.turretX, -s.maxSteerX, s.maxSteerX);
    const prevX = s.x;
    s.x = THREE.MathUtils.lerp(s.x, steerX, Math.min(1, dt * 6.0));
    let target = s.baseSpeed * this.getTacticRushMult();
    if (s.boostTimer > 0) {
      s.boostTimer = Math.max(0, s.boostTimer - dt);
      target *= s.boostMult;
    }
    if (s.slowTimer > 0) {
      s.slowTimer = Math.max(0, s.slowTimer - dt);
      target *= s.hitSlowMult;
    }
    s.speed = THREE.MathUtils.lerp(s.speed, target, Math.min(1, dt * (target > s.speed ? 2.6 : 5.0)));
    const prevDist = s.distance;
    s.distance = Math.min(s.courseLength, s.distance + s.speed * dt);
    s.timeLeft = Math.max(0, s.timeLeft - dt);
    s.state = s.slowTimer > 0 ? 'stumbled' : s.boostTimer > 0 ? 'boosting' : 'sliding';
    this.bossHp = Math.max(0, 100 - this.getSledProgressPct());
    for (let h = this.sledXHistory.length - 1; h > 0; h--) this.sledXHistory[h] = this.sledXHistory[h - 1];
    this.sledXHistory[0] = s.x;

    // 2. Scroll the course toward the camera & animate the toy sled
    s.courseGroup.position.z = SLED_Z + s.distance;
    if (s.snowTex) s.snowTex.offset.y = (s.distance / SLED_SNOW_TILE_M) % 1;
    this.updateSledScenery(s.distance);
    const lateralV = (s.x - prevX) / Math.max(0.001, dt);
    s.group.position.set(s.x, 0, SLED_Z);
    s.bodyGroup.rotation.z = THREE.MathUtils.clamp(-lateralV * 0.035, -0.22, 0.22);
    s.bodyGroup.rotation.y = THREE.MathUtils.clamp(-lateralV * 0.02, -0.18, 0.18);
    s.bodyGroup.position.y = Math.abs(Math.sin(t * 9.0)) * 0.05 * Math.min(1, s.speed / 6) + s.hitFlash * 0.25;
    for (const g of s.gears) g.rotation.x -= dt * (2 + s.speed * 0.9);
    if (s.hitFlash > 0) s.hitFlash = Math.max(0, s.hitFlash - dt * 3.2);
    s.hullMat.emissive.setHex(s.hitFlash > 0.05 ? 0xf43f5e : 0x7f1d1d);
    s.hullMat.emissiveIntensity = 0.22 + s.hitFlash * 0.6;
    s.lampMat.emissiveIntensity = 0.9 + Math.sin(t * 6) * 0.25 + (s.boostTimer > 0 ? 0.8 : 0);
    s.auraRingMat.color.setHex(s.state === 'stumbled' ? 0xf43f5e : s.state === 'boosting' ? 0x22d3ee : 0x38bdf8);
    s.auraRingMat.opacity = 0.38 + Math.sin(t * 5) * 0.08 + (s.boostTimer > 0 ? 0.2 : 0);
    s.sprayTimer -= dt;
    if (s.sprayTimer <= 0 && s.speed > 1) {
      s.sprayTimer = s.boostTimer > 0 ? 0.03 : 0.06;
      for (const side of [-1, 1]) {
        this.spawnBurstParticles(s.x + side * 1.75, 0.25, SLED_Z + 2.4, 0xffffff, 1);
      }
      if (Math.random() < 0.35) {
        this.spawnBurstParticles((Math.random() - 0.5) * 18, 0.2, SLED_Z - 18 + Math.random() * 30, 0xe0f2fe, 1);
      }
    }

    // 3. Rider formation (deck seats + trailing snow tubes that whip behind the sled) & tube instances
    let k = 0;
    let tubeIdx = 0;
    const tubeInst = s.tubeInst;
    for (let i = 0; i < MAX_UNITS; i++) {
      const u = this.units[i];
      if (!u.active || u.team !== 'blue') continue;
      const tmp = this.getSledSlot(k, 0);
      const histX = tmp.onDeck ? s.x : this.sledXHistory[Math.min(this.sledXHistory.length - 1, tmp.row * 2)];
      u.sledSlotX = THREE.MathUtils.clamp(histX + tmp.x, -TRACK_HALF_W + 0.9, TRACK_HALF_W - 0.9);
      u.sledSlotZ = tmp.z;
      u.rideY = THREE.MathUtils.lerp(u.rideY ?? tmp.y, tmp.y, Math.min(1, dt * 6));
      if (tmp.onDeck) {
        // Deck riders are seated: they ride rigidly with the sled body
        const pin = Math.min(1, dt * 14);
        u.x = THREE.MathUtils.lerp(u.x, u.sledSlotX, pin);
        u.z = THREE.MathUtils.lerp(u.z, u.sledSlotZ, pin);
      }
      if (!tmp.onDeck && tubeInst && tubeIdx < s.maxRiders) {
        this.tempMatrix4Sled.makeTranslation(u.x, 0.12, u.z);
        tubeInst.setMatrixAt(tubeIdx++, this.tempMatrix4Sled);
      }
      k++;
    }
    this.sledRiderCount = k;
    if (tubeInst) {
      tubeInst.count = tubeIdx;
      tubeInst.instanceMatrix.needsUpdate = true;
    }

    // 4. Gates: resolve each gate pair as the sled crosses its line
    for (const g of this.sledGates) {
      if (g.pulse > 0) {
        g.pulse = Math.max(0, g.pulse - dt * 3);
        const ps = 1 + g.pulse * 0.25;
        g.group.scale.set(ps, ps, 1);
      }
      if (g.resolved) {
        if (!g.triggered) g.shieldMat.opacity = Math.max(0.25, g.shieldMat.opacity - dt * 1.5);
        continue;
      }
      if (prevDist < g.cfg.d && s.distance >= g.cfg.d) {
        g.resolved = true;
        if (Math.abs(s.x - g.cfg.x) <= g.cfg.width * 0.5) this.applySledGate(g);
      }
    }

    // 5. Icicles: fall as they approach, then stand as ice spikes knocking riders off
    const trailEndZ = SLED_Z + 2.75 + Math.ceil(Math.max(0, k - SLED_DECK_SEATS) / SLED_TUBE_COLS) * 0.8 + 1.0;
    for (const ic of this.sledIcicles) {
      const ahead = ic.cfg.d - s.distance;
      const worldZ = SLED_Z - ahead;
      if (ic.shattered) {
        if (ic.shatterAnim > 0) {
          ic.shatterAnim = Math.max(0, ic.shatterAnim - dt * 3);
          ic.spike.scale.setScalar(Math.max(0.05, ic.shatterAnim));
          if (ic.shatterAnim <= 0) ic.spike.visible = false;
        }
        ic.shadowMat.opacity = Math.max(0, ic.shadowMat.opacity - dt);
        continue;
      }
      if (!ic.landed) {
        if (ahead <= SLED_ICICLE_FALL_START) {
          ic.spike.visible = true;
          const prog = THREE.MathUtils.clamp(
            (SLED_ICICLE_FALL_START - ahead) / (SLED_ICICLE_FALL_START - SLED_ICICLE_LAND_AT),
            0,
            1
          );
          ic.spike.position.y = 16 * (1 - prog * prog);
          ic.shadowMat.opacity = 0.18 + prog * 0.4;
          if (prog >= 1) {
            ic.landed = true;
            ic.spike.position.y = -0.15;
            this.spawnBurstParticles(ic.cfg.x, 0.6, worldZ, 0xe0f2fe, 14);
            this.spawnShockwave(ic.cfg.x, worldZ, 0x7dd3fc, ic.cfg.radius * 2.4, 0.3);
          }
        }
        continue;
      }
      ic.shadowMat.opacity = 0.5 + Math.sin(t * 8) * 0.08;
      // Sled body hits the spike -> stumble & crash through it
      if (!ic.sledChecked && worldZ >= SLED_Z - 2.4) {
        ic.sledChecked = true;
        if (worldZ <= SLED_Z + 2.6 && Math.abs(s.x - ic.cfg.x) < ic.cfg.radius + 1.6) {
          this.sledIciclesHit += 1;
          this.sledStumble('撞上冰锥!');
        }
      }
      // Riders brushing the spike tumble off (up to knockCap per spike, then it shatters)
      if (worldZ > SLED_Z - 3.0 && worldZ < trailEndZ + 1.0) {
        const r = ic.cfg.radius;
        for (let i = 0; i < MAX_UNITS && ic.knocked < ic.cfg.knockCap; i++) {
          const u = this.units[i];
          if (!u.active || u.team !== 'blue') continue;
          const dx = u.x - ic.cfg.x;
          const dz = u.z - worldZ;
          const rr = r + u.radius;
          if (dx * dx + dz * dz <= rr * rr) {
            if (this.knockSledRider(u)) ic.knocked++;
          }
        }
        if (ic.knocked >= ic.cfg.knockCap) {
          ic.shattered = true;
          ic.shatterAnim = 1;
          this.spawnBurstParticles(ic.cfg.x, 1.2, worldZ, 0xbfe9ff, 20);
          this.spawnFloatingPopup(ic.cfg.x, 2.6, worldZ, `冰锥撞碎 · -${ic.knocked} 波波`, '#fda4af');
        }
      }
      if (worldZ > trailEndZ + 1.0 && !ic.shattered) {
        ic.shattered = true;
        ic.shatterAnim = 0;
        if (ic.knocked === 0) this.sledHazardsDodged += 1;
        else this.spawnFloatingPopup(ic.cfg.x, 2.2, Math.min(18, worldZ), `-${ic.knocked} 波波`, '#fda4af');
      }
    }

    // 6. Avalanche waves roll up the slope; only the flagged gap is safe
    for (const av of this.sledAvalanches) {
      if (av.passed) continue;
      if (!av.rolling && av.d - s.distance <= SLED_AVALANCHE_ROLL_START) {
        av.rolling = true;
        this.spawnFloatingPopup(av.cfg.gapX, 3.0, SLED_Z - (av.d - s.distance), '雪崩浪来袭! 冲进蓝旗缺口', '#bae6fd');
        sound.playGearGrind();
      }
      const prevWaveZ = SLED_Z + prevDist - av.d;
      if (av.rolling) av.d -= av.cfg.rollSpeed * dt;
      const waveZ = SLED_Z + s.distance - av.d;
      av.group.position.z = -av.d;
      for (const crest of av.crests) {
        const ph = (crest.userData.phase as number) || 0;
        crest.rotation.x = -t * 2.4 - ph;
        crest.position.y = Math.abs(Math.sin(t * 5 + ph)) * 0.18;
      }
      if (av.rolling && Math.random() < dt * 14) {
        const sx = (Math.random() - 0.5) * 20;
        if (Math.abs(sx - av.cfg.gapX) > av.cfg.gapW * 0.5) this.spawnBurstParticles(sx, 1.8, waveZ, 0xffffff, 2);
      }
      const halfGap = av.cfg.gapW * 0.5;
      if (!av.sledChecked && prevWaveZ < SLED_Z && waveZ >= SLED_Z) {
        av.sledChecked = true;
        if (Math.abs(s.x - av.cfg.gapX) > halfGap - 0.3) {
          this.sledAvalancheHits += 1;
          this.sledStumble('被雪崩浪冲击!');
          this.addCameraShake(0.4);
        } else {
          this.spawnFloatingPopup(s.x, 3.4, SLED_Z - 1.2, '完美闪避雪崩!', '#a5f3fc');
        }
      }
      let knockedNow = 0;
      for (let i = 0; i < MAX_UNITS; i++) {
        const u = this.units[i];
        if (!u.active || u.team !== 'blue') continue;
        if (!(prevWaveZ < u.z && waveZ >= u.z)) continue;
        if (Math.abs(u.x - av.cfg.gapX) <= halfGap - 0.1) continue;
        if ((u.id * 7919 + av.cfg.d * 13) % 100 >= av.cfg.knockPct) continue;
        if (this.knockSledRider(u)) knockedNow++;
      }
      if (knockedNow > 0) {
        av.knocked += knockedNow;
        this.spawnBurstParticles(s.x, 1.5, waveZ, 0xffffff, 10);
      }
      if (waveZ > trailEndZ + 1.5) {
        av.passed = true;
        av.group.visible = false;
        if (av.knocked === 0) {
          this.sledHazardsDodged += 1;
        } else {
          this.spawnFloatingPopup(s.x, 2.8, Math.min(16, SLED_Z + 6), `雪崩甩落 -${av.knocked} 波波`, '#fda4af');
        }
      }
    }

    // 7. Boost strips
    for (const b of this.sledBoosts) {
      b.arrowMat.opacity = 0.55 + Math.abs(Math.sin(t * 6 + b.cfg.d)) * 0.4;
      if (b.triggered) continue;
      if (prevDist < b.cfg.d && s.distance >= b.cfg.d) {
        b.triggered = true;
        if (Math.abs(s.x - b.cfg.x) <= b.cfg.width * 0.5 + 0.4) {
          s.boostTimer = s.boostSec;
          this.sledBoostsTaken += 1;
          this.spawnShockwave(s.x, SLED_Z, 0x22d3ee, 3.6, 0.3);
          this.spawnFloatingPopup(s.x, 3.2, SLED_Z - 1.5, '冰面加速!', '#67e8f9');
        }
      }
    }

    // 8. Cull course items far from the visible slope
    const onDeck = (d: number): boolean => {
      const wz = SLED_Z + s.distance - d;
      return wz > -SLED_DECK_HALF - 4.5 && wz < SLED_DECK_HALF - 0.6;
    };
    for (const g of this.sledGates) g.group.visible = onDeck(g.cfg.d);
    for (const ic of this.sledIcicles) ic.group.visible = onDeck(ic.cfg.d);
    for (const b of this.sledBoosts) b.group.visible = onDeck(b.cfg.d);
    for (const av of this.sledAvalanches) if (!av.passed) av.group.visible = onDeck(av.d);
    for (const arch of s.courseGroup.children) {
      if (arch.userData.sledArchD !== undefined) arch.visible = onDeck(arch.userData.sledArchD as number);
    }

    // 9. Resolution: finish line = victory; countdown out or every rider knocked off = defeat
    const riders = this.getSledRiderCount();
    if (s.distance >= s.courseLength - 0.001) {
      s.active = false;
      s.state = 'finished';
      s.labelEl.style.display = 'none';
      this.sledFinishSec = Number((s.timeLimit - s.timeLeft).toFixed(2));
      this.bossHp = 0;
      this.spawnSkyPillar(s.x, SLED_Z - 2, 0x7dd3fc, 3.6, 0.7);
      this.spawnShockwave(s.x, SLED_Z, 0xfacc15, 11.0, 0.7);
      this.spawnBurstParticles(s.x, 2.2, SLED_Z - 1, 0xfacc15, 60);
      this.finishStage(true);
      this.onBanner?.(
        `${UI_ART.glacierSled} 雪橇冲过冰川终点线！`,
        `用时 ${this.sledFinishSec.toFixed(1)}s / 限时 ${s.timeLimit}s · 幸存波波 ${riders} 只 · 穿门 ${this.sledGatesPassed}`
      );
      return;
    }
    if (s.timeLeft <= 0 || riders <= 0) {
      s.active = false;
      s.state = riders <= 0 ? 'wiped' : 'timeout';
      s.labelEl.style.display = 'none';
      this.sledFinishSec = Number((s.timeLimit - s.timeLeft).toFixed(2));
      this.spawnBurstParticles(s.x, 1.4, SLED_Z, 0xe0f2fe, 40);
      this.onBanner?.(
        `${UI_ART.warning} ${s.state === 'wiped' ? '波波全部被甩下雪橇' : '超时未冲过终点线'}！`,
        `滑行 ${Math.round(s.distance)}/${s.courseLength}m · 已甩落 ${this.sledRidersLost} 只波波`
      );
      this.finishStage(false);
    }
  }
}
