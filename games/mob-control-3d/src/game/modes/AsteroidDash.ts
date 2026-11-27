/** MC-14 星空陨石带护盾突围：从 World3D 原样搬出的方法（字段仍在 World3D）。继承链见 ../World3DFull.ts。 */
import * as THREE from 'three';
import {
  LevelConfig,
} from '../../levels/LevelData';
import { UI_ART } from '../SkillIcons';
import { sound } from '../../audio/SoundManager';
import {
  SLED_SNOW_PLANE_LEN,
  SLED_DECK_HALF,
  SLED_SCENERY_SPAN,
  LAVA_ROW_SPACING,
  LAVA_HIST_STEP,
  LAVA_HIST_LEN,
  AST_FLOAT_BASE,
  AST_FRONT_OFFSET,
  AST_METEOR_TELEGRAPH,
  AST_METEOR_IMPACT_AT,
  AST_METEOR_FALL_H,
  AST_BELT_HALF_DEPTH,
  AST_TRACK_REPEAT_V,
  AST_TRACK_TILE_M,
  AST_STAR_CELL,
  AST_STARS_PER_CELL,
} from '../world/CourseConstants';
import {
  stylizeMaterialAs2DIllustration,
} from '../SceneThemes';
import {
  AsteroidGateRuntime,
  MAX_UNITS,
  SLED_Z,
  TRACK_HALF_W,
  Unit,
} from '../WorldTypes';
import { CandyTrainRaidMode } from './CandyTrainRaid';

export abstract class AsteroidDashMode extends CandyTrainRaidMode {
  // ============================================================================
  // MC-14: Asteroid Belt Shield Breakout (low-gravity space track, shield gates, asteroid strikes & belts)
  // ============================================================================

  /** Deep-space tint on top of the carnival theme (re-applied every load; applyTheme restores other modes). */
  private applyAsteroidDashAmbience(): void {
    this.scene.background = new THREE.Color(0x060818);
    this.scene.fog = new THREE.FogExp2(0x0d1033, 0.0042);
    if (this.abyssShaderMat?.uniforms) {
      this.abyssShaderMat.uniforms.uBaseColor.value.set('#0b1030');
      this.abyssShaderMat.uniforms.uVeinColor.value.set('#6366f1');
    }
    this.hemiLight.color.setHex(0xdbe4ff);
    this.hemiLight.groundColor.setHex(0x312e81);
    this.hemiLight.intensity *= 0.92;
    this.dirLight.color.setHex(0xeef2ff);
    this.dirLight.intensity *= 0.9;
    this.rimLight.color.setHex(0x818cf8);
  }

  /** Procedural (non-canvas) glowing space-track surface: navy plates, grid seams, cyan rails & centre dashes. */
  private createAsteroidTrackTexture(): THREE.DataTexture {
    const size = 64;
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        const noise = hash - Math.floor(hash);
        const plate = Math.sin((x / size) * Math.PI * 4) * 0.5 + 0.5;
        let r = 18 + plate * 8 + noise * 6;
        let g = 22 + plate * 10 + noise * 6;
        let b = 58 + plate * 16 + noise * 8;
        if (y % 16 === 0 || x % 16 === 0) {
          r = 52;
          g = 62;
          b = 150;
        }
        if (x <= 1 || x >= size - 2) {
          r = 96;
          g = 226;
          b = 255;
        } else if ((x === 31 || x === 32) && y % 16 < 8) {
          r = 165;
          g = 180;
          b = 252;
        }
        if (noise > 0.988) {
          r = 214;
          g = 222;
          b = 255;
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
    tex.repeat.set(1, AST_TRACK_REPEAT_V);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  /** A lumpy low-poly asteroid (seeded vertex jitter on an icosahedron). */
  private buildAsteroidRockGeometry(radius: number, seed: number): THREE.BufferGeometry {
    const geo = new THREE.IcosahedronGeometry(radius, 1);
    const pos = geo.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      const h = Math.sin((i + 1) * 12.9898 + seed * 78.233) * 43758.5453;
      const k = 0.78 + (h - Math.floor(h)) * 0.38;
      pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k * 0.86, pos.getZ(i) * k);
    }
    geo.computeVertexNormals();
    return geo;
  }

  protected buildAsteroidDash3D(level: LevelConfig): void {
    const course = level.asteroidCourse || {
      length: 234,
      baseSpeed: 8.0,
      timeLimitSec: 40,
      startBobos: 16,
      maxBobos: 90,
      maxSteerX: 7.4,
      floatHeight: 0.55,
      hitSlowMult: 0.55,
      hitSlowSec: 0.8,
      shieldSec: 6.5,
    };
    this.applyAsteroidDashAmbience();
    const L = course.length;

    // 1. Glowing space track across the deck (its texture scrolls toward the camera as the squad advances)
    const trackTex = this.createAsteroidTrackTexture();
    const trackMat = new THREE.MeshStandardMaterial({
      map: trackTex,
      emissiveMap: trackTex,
      emissive: 0xffffff,
      emissiveIntensity: 0.5,
      roughness: 0.45,
      metalness: 0.25,
    });
    const trackPlane = new THREE.Mesh(new THREE.PlaneGeometry(TRACK_HALF_W * 2 + 0.6, SLED_SNOW_PLANE_LEN), trackMat);
    trackPlane.rotation.x = -Math.PI / 2;
    trackPlane.position.set(0, 0.03, 0.5);
    trackPlane.receiveShadow = true;
    this.levelGroup.add(trackPlane);

    // 2. Star field (periodic in z so the slow parallax drift wraps seamlessly)
    const starPos: number[] = [];
    const starCol: number[] = [];
    const cells = 6;
    const tint = new THREE.Color();
    for (let c = 0; c < cells; c++) {
      for (let i = 0; i < AST_STARS_PER_CELL; i++) {
        const h1 = Math.sin((i + 1) * 91.7) * 43758.5453;
        const h2 = Math.sin((i + 1) * 47.3 + 3.1) * 24634.6345;
        const h3 = Math.sin((i + 1) * 13.1 + 7.7) * 15731.743;
        const f1 = h1 - Math.floor(h1);
        const f2 = h2 - Math.floor(h2);
        const f3 = h3 - Math.floor(h3);
        let x = (f1 * 2 - 1) * 70;
        const y = -6 + f3 * 34;
        if (Math.abs(x) < 13.5 && y < 7) x = Math.sign(x || 1) * (13.5 + Math.abs(x) * 0.6);
        starPos.push(x, y, -150 + c * AST_STAR_CELL + f2 * AST_STAR_CELL);
        tint.setHSL(0.6 + f3 * 0.15, 0.6, 0.72 + f1 * 0.25);
        starCol.push(tint.r, tint.g, tint.b);
      }
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.Float32BufferAttribute(starCol, 3));
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ size: 0.42, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, sizeAttenuation: true })
    );
    stars.frustumCulled = false;
    this.levelGroup.add(stars);

    // 3. Course group: every course item sits at local z = -d; the group slides toward +z by the distance covered
    const courseGroup = new THREE.Group();
    courseGroup.position.z = SLED_Z;
    this.levelGroup.add(courseGroup);

    const rockMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0x6b6585, emissive: 0x1e1b4b, emissiveIntensity: 0.35, roughness: 0.85, flatShading: true }),
      0.84
    );
    const hullMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0xc7d2fe, emissive: 0x312e81, emissiveIntensity: 0.22, roughness: 0.32, metalness: 0.45 }),
      0.84
    );
    const brassMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0xe6b34a, emissive: 0x3b2306, emissiveIntensity: 0.16, roughness: 0.26, metalness: 0.7 }),
      0.82
    );
    const neonCyanMat = new THREE.MeshBasicMaterial({ color: 0x67e8f9 });
    const neonVioletMat = new THREE.MeshBasicMaterial({ color: 0xc4b5fd });

    // 4. Scrolling curb scenery (instanced treadmill shared with the sled course): floating rocks & crystal buoys
    this.sledScenery = [];
    const addScenery = (inst: THREE.InstancedMesh, rows: number[][]): void => {
      const data = new Float32Array(rows.length * 6);
      rows.forEach((r, i) => data.set(r, i * 6));
      inst.count = rows.length;
      inst.frustumCulled = false;
      this.levelGroup.add(inst);
      this.sledScenery.push({ inst, data });
    };
    const floatRockCount = Math.round(SLED_SCENERY_SPAN / 5.5) * 2;
    const floatRockInst = new THREE.InstancedMesh(this.buildAsteroidRockGeometry(0.9, 3), rockMat, floatRockCount);
    const floatRows: number[][] = [];
    for (let z0 = 0; z0 < SLED_SCENERY_SPAN - 0.01; z0 += 5.5) {
      for (const side of [-1, 1]) {
        const j = Math.sin(z0 * 1.13 + side * 1.7) * 0.5 + 0.5;
        const sc = 0.55 + j * 0.7;
        floatRows.push([side * (TRACK_HALF_W + 0.4 + j * 1.6), 1.2 + j * 2.4, z0 + j * 2.0, sc, sc * 0.85, sc]);
      }
    }
    addScenery(floatRockInst, floatRows);
    const buoyCount = Math.round(SLED_SCENERY_SPAN / 8.8) * 2;
    const buoyInst = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(0.34, 0),
      new THREE.MeshStandardMaterial({ color: 0xa5f3fc, emissive: 0x22d3ee, emissiveIntensity: 1.0, roughness: 0.2 }),
      buoyCount
    );
    const buoyRows: number[][] = [];
    for (let z0 = 2.0; z0 < SLED_SCENERY_SPAN - 0.01; z0 += 8.8) {
      for (const side of [-1, 1]) buoyRows.push([side * (TRACK_HALF_W - 0.55), 0.9, z0 + side * 2.2, 0.9, 1.5, 0.9]);
    }
    addScenery(buoyInst, buoyRows);
    this.updateSledScenery(0);

    // 5. Launch pad arch (behind the squad) & the warp gate (exit) at the finish line
    const launch = new THREE.Group();
    launch.position.set(0, 0, 1.5);
    for (const side of [-1, 1]) {
      const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 3.6, 8), hullMat);
      pylon.position.set(side * 9.9, 1.8, 0);
      launch.add(pylon);
      const tip = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), neonCyanMat);
      tip.position.set(side * 9.9, 3.85, 0);
      launch.add(tip);
    }
    courseGroup.add(launch);

    const warp = new THREE.Group();
    warp.position.set(0, 0, -(L + 1.5));
    warp.userData.astWarpD = L + 1.5;
    for (const side of [-1, 1]) {
      const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.75, 6.4, 8), hullMat);
      pylon.position.set(side * 8.4, 3.2, 0);
      pylon.castShadow = true;
      warp.add(pylon);
      const coil = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.1, 8, 20), brassMat);
      coil.rotation.x = Math.PI / 2;
      coil.position.set(side * 8.4, 5.2, 0);
      warp.add(coil);
      const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), neonVioletMat);
      beacon.position.set(side * 8.4, 6.8, 0);
      warp.add(beacon);
    }
    const warpRingMat = new THREE.MeshBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.95, depthWrite: false });
    const warpRing = new THREE.Mesh(new THREE.TorusGeometry(4.3, 0.34, 12, 56), warpRingMat);
    warpRing.position.set(0, 4.6, 0);
    warp.add(warpRing);
    const warpInner = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.12, 8, 48), neonCyanMat);
    warpInner.position.set(0, 4.6, 0);
    warp.add(warpInner);
    const swirlMat = new THREE.MeshBasicMaterial({
      color: 0x818cf8,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const swirl = new THREE.Mesh(new THREE.CircleGeometry(4.1, 40), swirlMat);
    swirl.position.set(0, 4.6, -0.05);
    swirl.userData.astSwirl = true;
    warp.add(swirl);
    const finishLine = new THREE.Mesh(
      new THREE.PlaneGeometry(18.6, 0.9),
      new THREE.MeshBasicMaterial({ color: 0xc4b5fd, transparent: true, opacity: 0.85, depthWrite: false })
    );
    finishLine.rotation.x = -Math.PI / 2;
    finishLine.position.set(0, 0.06, 1.5);
    warp.add(finishLine);
    const cup = this.buildHallTrophyCupModel(3, 0xa78bfa);
    cup.scale.setScalar(1.2);
    cup.position.set(0, 9.4, 0);
    warp.add(cup);
    courseGroup.add(warp);
    this.asteroidWarpGroup = warp;

    // 6. Gates: unit gates (+N / ×N) and shield-charge gates (cyan forcefield, "护盾×N")
    this.asteroidGates = [];
    const gateH = 2.8;
    for (const cfg of level.asteroidGates || []) {
      const group = new THREE.Group();
      group.position.set(cfg.x, 0, -cfg.d);
      const isShield = cfg.kind === 'shield';
      for (const side of [-1, 1]) {
        const px = side * (cfg.width * 0.5 - 0.12);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, gateH, 10), hullMat);
        post.position.set(px, gateH * 0.5, 0);
        group.add(post);
        const tip = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), isShield ? neonCyanMat : neonVioletMat);
        tip.position.set(px, gateH + 0.36, 0);
        group.add(tip);
      }
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, cfg.width - 0.2, 10), isShield ? hullMat : brassMat);
      bar.rotation.z = Math.PI / 2;
      bar.position.set(0, gateH + 0.02, 0);
      group.add(bar);
      const label = isShield ? `护盾×${cfg.value}` : cfg.op === 'mul' ? `×${cfg.value}` : `+${cfg.value}`;
      const shieldMat = new THREE.MeshBasicMaterial({
        map: this.getGateBannerTexture(cfg.style, label),
        transparent: true,
        opacity: 0.96,
        alphaTest: 0.05,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const shield = new THREE.Mesh(new THREE.PlaneGeometry(cfg.width - 0.5, gateH - 0.1), shieldMat);
      shield.position.set(0, gateH * 0.5 + 0.05, 0);
      group.add(shield);
      if (isShield) {
        const halo = new THREE.Mesh(
          new THREE.TorusGeometry(0.9, 0.07, 8, 28),
          new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.85, depthWrite: false })
        );
        halo.position.set(0, gateH + 0.95, 0);
        halo.userData.astHalo = true;
        group.add(halo);
      }
      courseGroup.add(group);
      this.asteroidGates.push({ cfg, group, shieldMat, resolved: false, triggered: false, pulse: 0 });
    }

    // 7. Telegraphed asteroid strikes: red warning ring + charging fill, a rock falling slowly in low gravity
    this.asteroidMeteors = [];
    const ringGeo = new THREE.RingGeometry(0.84, 1.0, 44);
    ringGeo.rotateX(-Math.PI / 2);
    const discGeo = new THREE.CircleGeometry(1.0, 44);
    discGeo.rotateX(-Math.PI / 2);
    const trailGeo = new THREE.ConeGeometry(0.75, 5.0, 14, 1, true);
    trailGeo.translate(0, 2.6, 0);
    const meteorRockMat = new THREE.MeshStandardMaterial({
      color: 0x57534e,
      emissive: 0xf97316,
      emissiveIntensity: 0.55,
      roughness: 0.75,
      flatShading: true,
    });
    const craterMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, emissive: 0x4c1d95, emissiveIntensity: 0.4, roughness: 0.9 });
    let seed = 1;
    for (const cfg of level.asteroidMeteors || []) {
      const group = new THREE.Group();
      group.position.set(cfg.x, 0, -cfg.d);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xff3355, transparent: true, opacity: 0.0, depthWrite: false });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.scale.setScalar(cfg.radius);
      ring.position.y = 0.07;
      ring.renderOrder = 2;
      group.add(ring);
      const fillMat = new THREE.MeshBasicMaterial({ color: 0xff4d6d, transparent: true, opacity: 0.0, depthWrite: false });
      const fill = new THREE.Mesh(discGeo, fillMat);
      fill.scale.setScalar(0.02);
      fill.position.y = 0.06;
      fill.renderOrder = 1;
      group.add(fill);
      const rock = new THREE.Group();
      const body = new THREE.Mesh(this.buildAsteroidRockGeometry(Math.max(0.7, cfg.radius * 0.42), seed++), meteorRockMat);
      body.castShadow = true;
      rock.add(body);
      const trailMat = new THREE.MeshBasicMaterial({
        color: 0xfb923c,
        transparent: true,
        opacity: 0.0,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const trail = new THREE.Mesh(trailGeo, trailMat);
      trail.scale.setScalar(Math.max(0.8, cfg.radius * 0.5));
      rock.add(trail);
      rock.position.y = AST_METEOR_FALL_H;
      rock.visible = false;
      group.add(rock);
      const crater = new THREE.Group();
      const rim = new THREE.Mesh(new THREE.TorusGeometry(cfg.radius * 0.62, 0.22, 8, 24), craterMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.12;
      crater.add(rim);
      const glow = new THREE.Mesh(discGeo, new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.75, depthWrite: false }));
      glow.scale.setScalar(cfg.radius * 0.55);
      glow.position.y = 0.08;
      crater.add(glow);
      crater.visible = false;
      group.add(crater);
      courseGroup.add(group);
      this.asteroidMeteors.push({
        cfg,
        group,
        ringMat,
        fill,
        fillMat,
        rock,
        trailMat,
        crater,
        telegraphed: false,
        impacted: false,
        done: false,
        knocked: 0,
        blocked: false,
        craterT: 0,
      });
    }

    // 8. Drifting asteroid belts: a wall of floating rocks across the track, with one flagged safe gap
    this.asteroidBelts = [];
    const dangerMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.22, depthWrite: false });
    for (const cfg of level.asteroidBelts || []) {
      const group = new THREE.Group();
      group.position.set(0, 0, -cfg.d);
      const rocks: THREE.Object3D[] = [];
      const lo = cfg.gapX - cfg.gapW * 0.5;
      const hi = cfg.gapX + cfg.gapW * 0.5;
      for (let x = -TRACK_HALF_W + 0.7; x <= TRACK_HALF_W - 0.7; x += 1.35) {
        if (x > lo - 0.55 && x < hi + 0.55) continue;
        const r = 0.5 + (Math.sin(x * 3.1 + cfg.d) * 0.5 + 0.5) * 0.35;
        const rock = new THREE.Mesh(this.buildAsteroidRockGeometry(r, seed++), rockMat);
        rock.position.set(x, 1.0 + r * 0.6, (Math.sin(x * 1.7) * 0.5) * 0.6);
        rock.userData.baseY = rock.position.y;
        rock.userData.phase = x * 0.9 + cfg.d * 0.13;
        rock.castShadow = true;
        group.add(rock);
        rocks.push(rock);
      }
      for (const [x0, x1] of [
        [-TRACK_HALF_W + 0.3, lo],
        [hi, TRACK_HALF_W - 0.3],
      ] as const) {
        const w = x1 - x0;
        if (w <= 0.05) continue;
        const strip = new THREE.Mesh(new THREE.PlaneGeometry(w, AST_BELT_HALF_DEPTH * 2), dangerMat);
        strip.rotation.x = -Math.PI / 2;
        strip.position.set((x0 + x1) / 2, 0.055, 0);
        group.add(strip);
      }
      const beaconMat = new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.9, depthWrite: false });
      const gapStrip = new THREE.Mesh(new THREE.PlaneGeometry(cfg.gapW, AST_BELT_HALF_DEPTH * 2), beaconMat);
      gapStrip.rotation.x = -Math.PI / 2;
      gapStrip.position.set(cfg.gapX, 0.06, 0);
      group.add(gapStrip);
      for (const bx of [lo, hi]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.2, 8), hullMat);
        post.position.set(bx, 1.1, 0);
        group.add(post);
        const light = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), beaconMat);
        light.position.set(bx, 2.32, 0);
        group.add(light);
      }
      courseGroup.add(group);
      this.asteroidBelts.push({ cfg, group, rocks, beaconMat, knocked: 0, blocked: false, hitCounted: false, passed: false });
    }

    // 9. Squad shield bubble (shown while a shield-charge gate's shield is active)
    const bubbleMat = new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const bubble = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), bubbleMat);
    bubble.visible = false;
    bubble.renderOrder = 4;
    this.levelGroup.add(bubble);

    const label = document.createElement('div');
    label.className = 'subtower-label asteroid-dash-label';
    label.style.display = 'none';
    this.labelsContainer.appendChild(label);

    this.asteroidRun = {
      active: true,
      tier: level.asteroidTier || 1,
      courseGroup,
      trackTex,
      trackMat,
      stars,
      bubble,
      bubbleMat,
      x: 0,
      distance: 0,
      courseLength: L,
      baseSpeed: course.baseSpeed,
      speed: 0,
      timeLeft: course.timeLimitSec,
      timeLimit: course.timeLimitSec,
      maxSteerX: course.maxSteerX,
      maxBobos: course.maxBobos,
      floatHeight: course.floatHeight,
      hitSlowMult: course.hitSlowMult,
      hitSlowSec: course.hitSlowSec,
      shieldSec: course.shieldSec + this.state.getStardustMilestoneBonus().shieldBonusSec,
      slowTimer: 0,
      shieldTimer: 0,
      shieldCharges: 0,
      hitFlash: 0,
      sparkTimer: 0,
      state: 'cruising',
      labelEl: label,
      hist: new Float32Array(LAVA_HIST_LEN),
      histDist: 0,
      crowdX: 0,
      crowdRideY: AST_FLOAT_BASE,
      crowdHalfW: 0,
      crowdDepth: 0,
    };
    this.bossHp = 100;
  }

  /** Spawns the starting Bobo squad on the launch pad (start Bobos + 星尘徽章 milestone bonus). */
  protected spawnStartingAsteroidBobos(level: LevelConfig): number {
    const course = level.asteroidCourse;
    const bonus = this.state.getStardustMilestoneBonus().asteroidBonusBobos;
    const n = Math.max(1, Math.min(course?.maxBobos ?? 90, (course?.startBobos ?? 16) + bonus));
    let spawned = 0;
    for (let k = 0; k < n; k++) {
      const slot = this.getLavaSlot(k, n, 0);
      const u = this.spawnUnit('blue', 'normal', slot.x, slot.z, 0, 0);
      if (u) {
        u.spawnHop = 0;
        u.rideY = AST_FLOAT_BASE;
        u.sledSlotX = slot.x;
        u.sledSlotZ = slot.z;
        spawned++;
      }
    }
    this.asteroidPeakBobos = spawned;
    this.asteroidBoboCount = spawned;
    return spawned;
  }

  public getAsteroidProgressPct(): number {
    const s = this.asteroidRun;
    if (!s) return 0;
    return Math.max(0, Math.min(100, Math.round((s.distance / Math.max(1, s.courseLength)) * 100)));
  }

  /** Unit gate rows the squad front has reached, and the total number of gate rows (unit + shield rows). */
  public getAsteroidGateProgress(): { reached: number; total: number } {
    const ds = new Set<number>();
    const reached = new Set<number>();
    for (const g of this.asteroidGates) {
      ds.add(g.cfg.d);
      if (g.resolved) reached.add(g.cfg.d);
    }
    return { reached: reached.size, total: ds.size };
  }

  public getAsteroidStateLabel(): string {
    const s = this.asteroidRun;
    if (!s) return '尚未起航';
    switch (s.state) {
      case 'stumbled':
        return '陨石撞击失速';
      case 'shielded':
        return `护盾护航×${Math.max(0, s.shieldCharges)}`;
      case 'finished':
        return '冲进星光门';
      case 'timeout':
        return '超时迷航';
      case 'wiped':
        return '波波全部失散';
      default:
        return '低重力巡航中';
    }
  }

  /** Re-seats every Bobo on its formation slot behind the current line (self-checks). */
  public snapAsteroidBobosToSlots(): void {
    const s = this.asteroidRun;
    if (!s) return;
    s.hist.fill(s.x);
    s.histDist = s.distance;
    const n = this.getLavaBoboCount();
    let k = 0;
    for (let i = 0; i < MAX_UNITS; i++) {
      const u = this.units[i];
      if (!u.active || u.team !== 'blue') continue;
      const slot = this.getLavaSlot(k++, n, s.x);
      u.x = slot.x;
      u.z = slot.z;
      u.vx = 0;
      u.vz = 0;
      u.sledSlotX = slot.x;
      u.sledSlotZ = slot.z;
      u.rideY = AST_FLOAT_BASE;
    }
  }

  /** A hazard hit: a frost / pet shell absorbs it instead. Returns true if the Bobo is lost. */
  protected knockAsteroidBobo(u: Unit, silent = false): boolean {
    if (!u.active || u.team !== 'blue') return false;
    if (u.frostShield) {
      u.frostShield = false;
      u.petShellGranted = false;
      if (!silent) this.spawnBurstParticles(u.x, 0.9 + (u.rideY || 0), u.z, 0x7dd3fc, 4);
      return false;
    }
    u.active = false;
    this.asteroidBobosLost += 1;
    if (!silent) {
      this.spawnBurstParticles(u.x, 0.9 + (u.rideY || 0), u.z, 0xa5b4fc, 6);
      this.spawnBurstParticles(u.x, 1.3 + (u.rideY || 0), u.z, 0xfb923c, 3);
    }
    return true;
  }

  /** True while the squad shield is up; consumes one charge to absorb one hazard (strike / belt). */
  private consumeAsteroidShield(x: number, z: number, what: string, silent = false): boolean {
    const s = this.asteroidRun;
    if (!s || s.shieldTimer <= 0 || s.shieldCharges <= 0) return false;
    s.shieldCharges -= 1;
    if (s.shieldCharges <= 0) s.shieldTimer = 0;
    this.asteroidShieldBlocks += 1;
    if (!silent) {
      this.spawnShockwave(x, z, 0x67e8f9, 4.6, 0.4);
      this.spawnBurstParticles(x, 1.4, z, 0xa5f3fc, 18);
      this.spawnFloatingPopup(x, 3.4, z, `护盾挡下${what}! 剩 ${Math.max(0, s.shieldCharges)} 次`, '#a5f3fc');
    }
    return true;
  }

  private applyAsteroidGate(g: AsteroidGateRuntime, silent = false): number {
    const s = this.asteroidRun;
    if (!s) return 0;
    g.triggered = true;
    g.shieldMat.opacity = 0.35;
    if (g.cfg.kind === 'shield') {
      s.shieldTimer = s.shieldSec;
      s.shieldCharges = Math.max(1, Math.floor(g.cfg.value));
      this.asteroidShieldGatesTaken += 1;
      if (!silent) {
        sound.playCloneGate(3);
        this.spawnShockwave(s.x, SLED_Z - 0.8, 0x67e8f9, 5.2, 0.45);
        this.spawnBurstParticles(s.x, 2.0, SLED_Z - 1.0, 0xa5f3fc, 26);
        this.spawnFloatingPopup(s.x, 3.4, SLED_Z - 1.0, `能量护盾 ×${s.shieldCharges} · ${s.shieldSec.toFixed(1)}s`, '#a5f3fc');
      }
      return 0;
    }
    const bobos = this.getLavaBoboCount();
    const want = g.cfg.op === 'mul' ? bobos * (Math.max(1, g.cfg.value) - 1) : g.cfg.value;
    const room = Math.max(0, s.maxBobos - bobos);
    const n = Math.max(0, Math.min(room, Math.floor(want)));
    let added = 0;
    for (let k = 0; k < n; k++) {
      const u = this.spawnUnit(
        'blue',
        k % 6 === 0 ? 'charged' : 'normal',
        s.x + (Math.random() * 2 - 1) * 1.6,
        SLED_Z - 0.4 + Math.random() * 2.2,
        0,
        0
      );
      if (u) {
        u.spawnHop = 0.6;
        u.rideY = AST_FLOAT_BASE;
        added++;
      }
    }
    this.asteroidGatesPassed += 1;
    this.asteroidPeakBobos = Math.max(this.asteroidPeakBobos, bobos + added);
    if (!silent) {
      sound.playCloneGate(g.cfg.op === 'mul' ? 3 : 2);
      this.spawnBurstParticles(s.x, 1.8, SLED_Z - 1.2, g.cfg.op === 'mul' ? 0xfacc15 : 0xa5b4fc, 22);
      this.spawnShockwave(s.x, SLED_Z - 0.8, g.cfg.op === 'mul' ? 0xfacc15 : 0x818cf8, 4.0, 0.35);
      this.spawnFloatingPopup(
        s.x,
        3.2,
        SLED_Z - 1.0,
        added < n || n < want ? `+${added} 波波 (满员)` : `+${added} 波波加入!`,
        g.cfg.op === 'mul' ? '#fde047' : '#c7d2fe'
      );
    }
    return added;
  }

  private asteroidStumble(cause: string, silent = false): void {
    const s = this.asteroidRun;
    if (!s) return;
    s.slowTimer = Math.max(s.slowTimer, s.hitSlowSec);
    s.hitFlash = 1.0;
    if (!silent) {
      this.addCameraShake(0.3);
      this.spawnFloatingPopup(s.x, 3.6, SLED_Z - 1.0, cause, '#fda4af');
    }
  }

  /**
   * Autopilot target x (self-checks / screenshots / demo): picks the best gate (shield before hazards, bigger unit
   * gates otherwise), keeps the whole squad clear of asteroid strikes and threads belt gaps, peeking two events ahead.
   */
  public getAsteroidAutopilotX(): number {
    const s = this.asteroidRun;
    if (!s) return 0;
    const n = this.asteroidBoboCount || this.getLavaBoboCount();
    const half = this.getLavaSquadHalfWidth(n);
    const frontDu = s.distance + AST_FRONT_OFFSET;
    const shieldUp = s.shieldTimer > 1.0 && s.shieldCharges > 0;
    type Ev = { d: number; score: (x: number) => number };
    const evs: Ev[] = [];
    const gateDs = new Map<number, AsteroidGateRuntime[]>();
    for (const g of this.asteroidGates) {
      if (g.resolved || g.cfg.d < frontDu - 0.05 || g.cfg.d > frontDu + 40) continue;
      const arr = gateDs.get(g.cfg.d) || [];
      arr.push(g);
      gateDs.set(g.cfg.d, arr);
    }
    gateDs.forEach((arr, d) => {
      evs.push({
        d,
        score: (x: number) => {
          let best = 0;
          for (const g of arr) {
            const inner = g.cfg.width * 0.5 - 0.6;
            if (Math.abs(x - g.cfg.x) > inner) continue;
            let v: number;
            if (g.cfg.kind === 'shield') v = shieldUp ? 6 : 34;
            else v = Math.min(s.maxBobos - n, g.cfg.op === 'mul' ? n * (g.cfg.value - 1) : g.cfg.value) * 2;
            best = Math.max(best, v - Math.abs(x - g.cfg.x) * 1.5);
          }
          return best;
        },
      });
    });
    for (const m of this.asteroidMeteors) {
      if (m.done || m.cfg.d < frontDu - m.cfg.radius - 0.3 || m.cfg.d > frontDu + 40) continue;
      evs.push({
        d: m.cfg.d,
        score: (x: number) => {
          const reach = m.cfg.radius + half + 0.45;
          const dx = Math.abs(x - m.cfg.x);
          return dx < reach ? -(shieldUp ? 25 : 240) - (reach - dx) * 20 : 0;
        },
      });
    }
    for (const b of this.asteroidBelts) {
      if (b.passed || b.cfg.d < frontDu - AST_BELT_HALF_DEPTH - 0.3 || b.cfg.d > frontDu + 40) continue;
      evs.push({
        d: b.cfg.d,
        score: (x: number) => {
          const room = b.cfg.gapW * 0.5 - half - 0.2;
          const off = Math.abs(x - b.cfg.gapX);
          if (off <= Math.max(0, room)) return 0;
          return -(shieldUp ? 25 : 220) - (off - Math.max(0, room)) * 60;
        },
      });
    }
    if (evs.length === 0) return s.x;
    evs.sort((a, b) => a.d - b.d);
    // Events packed close behind the next one must share its line; farther ones can be re-steered to later
    // (the formation rows replay the lead's path, so only the lead line has to be safe at each course point).
    const weights: number[] = [1];
    for (let e = 1; e < Math.min(3, evs.length); e++) weights.push(evs[e].d - evs[e - 1].d < 7 ? 0.6 * weights[e - 1] : 0.04);
    let bestX = s.x;
    let bestScore = -Infinity;
    for (let x = -s.maxSteerX; x <= s.maxSteerX + 0.01; x += 0.25) {
      let score = -Math.abs(x - s.x) * 0.03;
      for (let e = 0; e < weights.length; e++) score += weights[e] * evs[e].score(x);
      if (score > bestScore) {
        bestScore = score;
        bestX = x;
      }
    }
    return bestX;
  }

  protected updateAsteroidDash(dt: number): void {
    const s = this.asteroidRun;
    const level = this.currentLevel;
    if (!s || !s.active || !level) return;
    const t = this.elapsedTime;

    // 1. Steering (the squad follows the cannon's lateral aim, a bit floaty) & pace (strikes slow the cruise)
    const steerX = THREE.MathUtils.clamp(this.turretX, -s.maxSteerX, s.maxSteerX);
    s.x = THREE.MathUtils.lerp(s.x, steerX, Math.min(1, dt * 6.0));
    let target = s.baseSpeed * this.getTacticRushMult();
    if (s.slowTimer > 0) {
      s.slowTimer = Math.max(0, s.slowTimer - dt);
      target *= s.hitSlowMult;
    }
    if (s.shieldTimer > 0) {
      s.shieldTimer = Math.max(0, s.shieldTimer - dt);
      if (s.shieldTimer <= 0) s.shieldCharges = 0;
    }
    if (s.shieldCharges <= 0) s.shieldTimer = 0;
    s.speed = THREE.MathUtils.lerp(s.speed, target, Math.min(1, dt * (target > s.speed ? 2.2 : 5.0)));
    s.distance = Math.min(s.courseLength, s.distance + s.speed * dt);
    s.timeLeft = Math.max(0, s.timeLeft - dt);
    s.state = s.slowTimer > 0 ? 'stumbled' : s.shieldTimer > 0 ? 'shielded' : 'cruising';
    this.bossHp = Math.max(0, 100 - this.getAsteroidProgressPct());

    // 2. Scroll the track toward the camera, drift the stars & the floating curb scenery
    s.courseGroup.position.z = SLED_Z + s.distance;
    if (s.trackTex) s.trackTex.offset.y = (s.distance / AST_TRACK_TILE_M) % 1;
    s.trackMat.emissiveIntensity = 0.48 + Math.sin(t * 1.8) * 0.06;
    s.stars.position.z = (s.distance * 0.3) % AST_STAR_CELL;
    this.updateSledScenery(s.distance);
    if (this.asteroidWarpGroup) {
      const wd = (this.asteroidWarpGroup.userData.astWarpD as number) || s.courseLength;
      this.asteroidWarpGroup.visible = SLED_Z + s.distance - wd > -SLED_DECK_HALF - 30;
      for (const c of this.asteroidWarpGroup.children) if (c.userData.astSwirl) c.rotation.z = t * 1.4;
    }
    s.sparkTimer -= dt;
    if (s.sparkTimer <= 0) {
      s.sparkTimer = 0.12;
      this.spawnBurstParticles((Math.random() - 0.5) * 20, 0.4 + Math.random() * 2, SLED_Z - 16 + Math.random() * 26, Math.random() < 0.5 ? 0xa5b4fc : 0x67e8f9, 1);
    }

    // 3. Squad formation: the lead line is recorded along the course and every formation row follows that exact
    //    path a little later (low-gravity conga line); every Bobo floats with its own slow bob.
    const n = this.getLavaBoboCount();
    const cols = this.getLavaSquadCols(n);
    const leadX = s.x;
    if (s.distance - s.histDist > LAVA_HIST_STEP * s.hist.length || s.histDist > s.distance + LAVA_HIST_STEP) {
      s.hist.fill(leadX);
      s.histDist = s.distance;
    }
    while (s.distance - s.histDist >= LAVA_HIST_STEP) {
      s.hist.copyWithin(1, 0, s.hist.length - 1);
      s.hist[0] = leadX;
      s.histDist += LAVA_HIST_STEP;
    }
    let k = 0;
    let rideSum = 0;
    let xSum = 0;
    let trailEndZ = SLED_Z;
    const pin = Math.min(1, dt * 10);
    for (let i = 0; i < MAX_UNITS; i++) {
      const u = this.units[i];
      if (!u.active || u.team !== 'blue') continue;
      const formRow = Math.floor(k / cols);
      const pathX =
        formRow === 0 ? leadX : s.hist[Math.min(s.hist.length - 1, Math.round((formRow * LAVA_ROW_SPACING) / LAVA_HIST_STEP))];
      const slot = this.getLavaSlot(k, n, pathX);
      const slotX = THREE.MathUtils.clamp(slot.x, -TRACK_HALF_W + 0.9, TRACK_HALF_W - 0.9);
      const ride = AST_FLOAT_BASE + s.floatHeight * (0.5 + 0.5 * Math.sin(t * 2.3 + k * 0.73));
      u.sledSlotX = slotX;
      u.sledSlotZ = slot.z;
      u.rideY = ride;
      u.x = THREE.MathUtils.lerp(u.x, slotX, pin);
      u.z = THREE.MathUtils.lerp(u.z, slot.z, pin);
      rideSum += ride;
      xSum += u.x;
      trailEndZ = Math.max(trailEndZ, u.z);
      k++;
    }
    const alive = k;
    this.asteroidBoboCount = alive;
    s.crowdRideY = alive > 0 ? rideSum / alive : AST_FLOAT_BASE;
    s.crowdX = alive > 0 ? xSum / alive : s.x;
    s.crowdHalfW = this.getLavaSquadHalfWidth(Math.max(1, alive));
    s.crowdDepth = Math.max(0.6, Math.ceil(Math.max(1, alive) / cols) * LAVA_ROW_SPACING);

    // 4. Shield bubble around the squad while the shield is up
    const shieldOn = s.shieldTimer > 0 && s.shieldCharges > 0;
    s.bubble.visible = shieldOn && alive > 0;
    if (s.bubble.visible) {
      const fade = Math.min(1, s.shieldTimer / 1.2);
      s.bubbleMat.opacity = (0.28 + Math.sin(t * 6) * 0.06) * (s.shieldTimer < 1.2 ? 0.5 + 0.5 * Math.abs(Math.sin(t * 14)) : 1) * Math.max(0.3, fade);
      s.bubble.position.set(s.crowdX, 0.05, SLED_Z - 0.9 + s.crowdDepth * 0.5 - 0.3);
      s.bubble.scale.set(s.crowdHalfW + 1.2, 1.9 + s.floatHeight, s.crowdDepth * 0.5 + 1.1);
    }

    // 5. Gates: when the squad front reaches a gate row, the gate under the squad centre triggers (pair resolves)
    const frontDu = s.distance + AST_FRONT_OFFSET;
    for (const g of this.asteroidGates) {
      const wz = SLED_Z + s.distance - g.cfg.d;
      g.group.visible = wz > -SLED_DECK_HALF - 8 && wz < SLED_DECK_HALF + 3;
      if (g.cfg.kind === 'shield' && !g.resolved) {
        for (const c of g.group.children) if (c.userData.astHalo) c.rotation.y = t * 2.0;
      }
      if (g.resolved || frontDu < g.cfg.d) continue;
      for (const g2 of this.asteroidGates) {
        if (g2.resolved || g2.cfg.d !== g.cfg.d) continue;
        g2.resolved = true;
        if (Math.abs(leadX - g2.cfg.x) <= g2.cfg.width * 0.5) this.applyAsteroidGate(g2);
        else g2.shieldMat.opacity = 0.5;
      }
    }

    // 6. Asteroid strikes: the warning ring charges while the rock falls slowly, then it blasts a burning crater
    for (const m of this.asteroidMeteors) {
      if (m.done) continue;
      const ahead = m.cfg.d - s.distance;
      const worldZ = SLED_Z - ahead;
      m.group.visible = worldZ > -SLED_DECK_HALF - 8 && worldZ < SLED_DECK_HALF + 3;
      if (!m.telegraphed && ahead <= AST_METEOR_TELEGRAPH) {
        m.telegraphed = true;
        m.rock.visible = true;
        this.spawnFloatingPopup(m.cfg.x, 2.6, Math.max(-14, worldZ), '陨石落点预警! 快躲开', '#fda4af');
      }
      if (m.telegraphed && !m.impacted) {
        const prog = THREE.MathUtils.clamp((AST_METEOR_TELEGRAPH - ahead) / (AST_METEOR_TELEGRAPH - AST_METEOR_IMPACT_AT), 0, 1);
        m.fill.scale.setScalar(Math.max(0.02, prog * m.cfg.radius));
        m.fillMat.opacity = 0.22 + prog * 0.38;
        m.ringMat.opacity = 0.7 + Math.sin(t * (8 + prog * 12)) * 0.28;
        m.rock.position.y = 0.8 + AST_METEOR_FALL_H * Math.pow(1 - prog, 1.15);
        m.rock.rotation.set(t * 1.1, t * 0.7, 0);
        m.trailMat.opacity = 0.35 + prog * 0.35;
        if (ahead <= AST_METEOR_IMPACT_AT) {
          m.impacted = true;
          m.rock.visible = false;
          m.crater.visible = true;
          m.craterT = 0;
          this.addCameraShake(0.32);
          sound.playExplosion();
          this.spawnShockwave(m.cfg.x, worldZ, 0xfb923c, m.cfg.radius * 2.3, 0.45);
          this.spawnBurstParticles(m.cfg.x, 1.2, worldZ, 0xfdba74, 28);
          this.spawnBurstParticles(m.cfg.x, 1.6, worldZ, 0x6b6585, 10);
        }
      }
      if (!m.impacted) continue;
      m.craterT += dt;
      m.fillMat.opacity = Math.max(0.15, 0.55 - m.craterT * 0.3);
      const r = m.cfg.radius;
      let knockedNow = 0;
      for (let i = 0; i < MAX_UNITS && m.knocked < m.cfg.knockCap && !m.blocked; i++) {
        const u = this.units[i];
        if (!u.active || u.team !== 'blue') continue;
        const dx = u.x - m.cfg.x;
        const ddu = s.distance + (SLED_Z - u.z) - m.cfg.d;
        if (dx * dx + ddu * ddu > r * r) continue;
        if (this.consumeAsteroidShield(m.cfg.x, worldZ, '陨石')) {
          m.blocked = true;
          break;
        }
        if (this.knockAsteroidBobo(u)) {
          m.knocked++;
          knockedNow++;
        }
      }
      if (knockedNow > 0 && m.knocked === knockedNow) {
        this.asteroidMeteorHits += 1;
        this.asteroidStumble('陨石撞击! 波波被弹飞');
      }
      if (worldZ > trailEndZ + r + 1.0 || worldZ > SLED_DECK_HALF + 2) {
        m.done = true;
        m.group.visible = false;
        if (m.knocked === 0 && !m.blocked) this.asteroidHazardsDodged += 1;
        else if (m.knocked > 0) this.spawnFloatingPopup(m.cfg.x, 2.6, Math.min(16, SLED_Z + 5), `陨石弹飞 -${m.knocked} 波波`, '#fda4af');
      }
    }

    // 7. Asteroid belts: Bobos crossing the belt outside its flagged gap get knocked away (capped per belt)
    for (const b of this.asteroidBelts) {
      const ahead = b.cfg.d - s.distance;
      const worldZ = SLED_Z - ahead;
      b.group.visible = worldZ > -SLED_DECK_HALF - 8 && worldZ < SLED_DECK_HALF + 3;
      if (b.group.visible) {
        for (const rk of b.rocks) {
          const ph = rk.userData.phase as number;
          rk.position.y = (rk.userData.baseY as number) + Math.sin(t * 1.3 + ph) * 0.28;
          rk.rotation.set(t * 0.4 + ph, t * 0.3, ph * 0.5);
        }
        b.beaconMat.opacity = 0.55 + Math.sin(t * 5 + b.cfg.d) * 0.3;
      }
      if (b.passed) continue;
      const halfGap = b.cfg.gapW * 0.5;
      for (let i = 0; i < MAX_UNITS && b.knocked < b.cfg.knockCap && !b.blocked; i++) {
        const u = this.units[i];
        if (!u.active || u.team !== 'blue') continue;
        const du = s.distance + (SLED_Z - u.z);
        if (Math.abs(du - b.cfg.d) > AST_BELT_HALF_DEPTH) continue;
        if (Math.abs(u.x - b.cfg.gapX) <= halfGap) continue;
        if (this.consumeAsteroidShield(u.x, worldZ, '陨石带')) {
          b.blocked = true;
          break;
        }
        if (this.knockAsteroidBobo(u)) b.knocked++;
      }
      if (b.knocked > 0 && !b.hitCounted) {
        b.hitCounted = true;
        this.asteroidBeltHits += 1;
        this.asteroidStumble('撞上陨石带!');
      }
      if (worldZ > trailEndZ + 1.2) {
        b.passed = true;
        if (b.knocked === 0 && !b.blocked) this.asteroidHazardsDodged += 1;
        else if (b.knocked > 0) this.spawnFloatingPopup(b.cfg.gapX, 2.2, Math.min(16, worldZ), `陨石带 -${b.knocked} 波波`, '#fda4af');
      }
    }

    // 8. Resolution: reach the warp gate = victory; countdown out or every Bobo lost = defeat
    const aliveNow = this.getLavaBoboCount();
    this.asteroidBoboCount = aliveNow;
    if (s.distance >= s.courseLength - 0.001 && aliveNow > 0) {
      s.active = false;
      s.state = 'finished';
      s.labelEl.style.display = 'none';
      s.bubble.visible = false;
      this.asteroidFinishSec = Number((s.timeLimit - s.timeLeft).toFixed(2));
      this.bossHp = 0;
      this.spawnSkyPillar(s.x, SLED_Z - 2, 0xa78bfa, 3.6, 0.7);
      this.spawnShockwave(s.x, SLED_Z, 0xc4b5fd, 11.0, 0.7);
      this.spawnBurstParticles(s.x, 2.2, SLED_Z - 1, 0xc4b5fd, 60);
      this.finishStage(true);
      this.onBanner?.(
        `${UI_ART.asteroidDash} 波波团冲进星光门！`,
        `用时 ${this.asteroidFinishSec.toFixed(1)}s / 限时 ${s.timeLimit}s · 幸存波波 ${aliveNow} 只 · 护盾挡下 ${this.asteroidShieldBlocks} 次`
      );
      return;
    }
    if (s.timeLeft <= 0 || aliveNow <= 0) {
      s.active = false;
      s.state = aliveNow <= 0 ? 'wiped' : 'timeout';
      s.labelEl.style.display = 'none';
      s.bubble.visible = false;
      this.asteroidFinishSec = Number((s.timeLimit - s.timeLeft).toFixed(2));
      this.spawnBurstParticles(s.x, 1.4, SLED_Z, 0xa5b4fc, 40);
      this.onBanner?.(
        `${UI_ART.warning} ${s.state === 'wiped' ? '波波全部被陨石冲散' : '超时迷失在陨石带'}！`,
        `前进 ${Math.round(s.distance)}/${s.courseLength}m · 已损失 ${this.asteroidBobosLost} 只波波`
      );
      this.finishStage(false);
    }
  }
}
