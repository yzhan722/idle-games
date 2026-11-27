/** MC-13 火山熔岩跳台突围战：从 World3D 原样搬出的方法（字段仍在 World3D）。继承链见 ../World3DFull.ts。 */
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
  LAVA_COL_SPACING,
  LAVA_ROW_SPACING,
  LAVA_MAX_COLS,
  LAVA_PLATFORM_TOP,
  LAVA_LAND_MARGIN,
  LAVA_ERUPT_TELEGRAPH,
  LAVA_ERUPT_AT,
  LAVA_ROCK_FALL_START,
  LAVA_ROCK_LAND_AT,
  LAVA_HIST_STEP,
  LAVA_HIST_LEN,
  LAVA_TEX_REPEAT_V,
  LAVA_TEX_TILE_M,
} from '../world/CourseConstants';
import {
  stylizeMaterialAs2DIllustration,
} from '../SceneThemes';
import {
  LavaPlatformRuntime,
  LavaRowRuntime,
  MAX_UNITS,
  SLED_Z,
  TRACK_HALF_W,
  Unit,
} from '../WorldTypes';
import { GlacierSledMode } from './GlacierSled';

export abstract class LavaJumpMode extends GlacierSledMode {
  /** Smouldering volcano tint on top of the magma theme (re-applied every load; applyTheme restores other modes). */
  private applyLavaJumpAmbience(): void {
    this.scene.background = new THREE.Color(0x3a1208);
    this.scene.fog = new THREE.FogExp2(0x6b210c, 0.0062);
    if (this.abyssShaderMat?.uniforms) {
      this.abyssShaderMat.uniforms.uBaseColor.value.set('#7c2d12');
      this.abyssShaderMat.uniforms.uVeinColor.value.set('#fb923c');
    }
    this.hemiLight.color.setHex(0xffd9b8);
    this.hemiLight.groundColor.setHex(0x9a3412);
    this.hemiLight.intensity *= 0.8;
    this.dirLight.color.setHex(0xffc58a);
    this.dirLight.intensity *= 0.78;
    this.rimLight.color.setHex(0xff6a1a);
  }

  /** Procedural (non-canvas) molten lava surface: hot flow cells, dark crust veins & sparks; scrolled along v. */
  private createLavaTexture(): THREE.DataTexture {
    const size = 64;
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const u = x / size;
        const v = y / size;
        // Two octaves of warped flow bands (tileable): big molten channels between dark cooling crust plates
        const n1 = Math.sin(u * Math.PI * 2 + Math.sin(v * Math.PI * 4) * 1.6) * 0.5 + 0.5;
        const n2 = Math.sin(v * Math.PI * 4 + Math.sin(u * Math.PI * 2) * 2.2) * 0.5 + 0.5;
        const n3 = Math.sin((u + v) * Math.PI * 6 + Math.sin(u * Math.PI * 4) * 1.1) * 0.5 + 0.5;
        const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        const noise = hash - Math.floor(hash);
        const heat = n1 * 0.45 + n2 * 0.35 + n3 * 0.2 + (noise - 0.5) * 0.06;
        let r: number;
        let g: number;
        let b: number;
        if (heat < 0.46) {
          const c = Math.max(0, heat) / 0.46;
          r = 34 + c * 60;
          g = 10 + c * 16;
          b = 8 + c * 6;
        } else if (heat < 0.56) {
          const c = (heat - 0.46) / 0.1;
          r = 94 + c * 140;
          g = 26 + c * 44;
          b = 14 + c * 2;
        } else {
          const t = Math.min(1, (heat - 0.56) / 0.44);
          r = 234 + t * 21;
          g = 70 + t * 150;
          b = 16 + t * 60;
        }
        if (noise > 0.996 && heat >= 0.56) {
          r = 255;
          g = 226;
          b = 130;
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
    tex.repeat.set(2, LAVA_TEX_REPEAT_V);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  protected buildLavaJump3D(level: LevelConfig): void {
    const course = level.lavaCourse || {
      length: 250,
      baseSpeed: 8.8,
      timeLimitSec: 39,
      startBobos: 16,
      maxBobos: 90,
      maxSteerX: 7.6,
      hopHeight: 2.0,
      hitSlowMult: 0.55,
      hitSlowSec: 0.8,
      cooledShieldSec: 2.4,
    };
    this.applyLavaJumpAmbience();
    const L = course.length;

    // 1. Molten lava lake across the deck (its texture scrolls toward the camera as the crowd advances)
    const lavaTex = this.createLavaTexture();
    const lavaMat = new THREE.MeshStandardMaterial({
      map: lavaTex,
      emissiveMap: lavaTex,
      emissive: 0xffffff,
      emissiveIntensity: 0.9,
      roughness: 0.62,
      metalness: 0.0,
    });
    const lavaPlane = new THREE.Mesh(new THREE.PlaneGeometry(TRACK_HALF_W * 2 + 0.6, SLED_SNOW_PLANE_LEN), lavaMat);
    lavaPlane.rotation.x = -Math.PI / 2;
    lavaPlane.position.set(0, 0.03, 0.5);
    this.levelGroup.add(lavaPlane);

    // 2. Course group: every course item sits at local z = -d; the group slides toward +z by the distance covered
    const courseGroup = new THREE.Group();
    courseGroup.position.z = SLED_Z;
    this.levelGroup.add(courseGroup);

    const unitBox = new THREE.BoxGeometry(1, 1, 1);
    const basaltMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0x44403c, emissive: 0x431407, emissiveIntensity: 0.45, roughness: 0.86, metalness: 0.04 }),
      0.84
    );
    const basaltTopMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0x6f6660, emissive: 0x1c1917, emissiveIntensity: 0.1, roughness: 0.9 }),
      0.84
    );
    const cooledMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0x475569, emissive: 0x0f172a, emissiveIntensity: 0.2, roughness: 0.8 }),
      0.84
    );
    const cooledTopMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0xa5b4c4, emissive: 0x0f766e, emissiveIntensity: 0.16, roughness: 0.78 }),
      0.84
    );
    const obsidianMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0x292524, emissive: 0x1c0a05, emissiveIntensity: 0.3, roughness: 0.6, metalness: 0.1 }),
      0.84
    );
    const obsidianTopMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0x57534e, emissive: 0x1c1917, emissiveIntensity: 0.1, roughness: 0.82 }),
      0.84
    );
    const brassMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0xe6b34a, emissive: 0x3b2306, emissiveIntensity: 0.16, roughness: 0.26, metalness: 0.7 }),
      0.82
    );
    const crackMat = new THREE.MeshBasicMaterial({ color: 0xff8a1f });
    const rimGlowMat = new THREE.MeshBasicMaterial({ color: 0xff8a1f, transparent: true, opacity: 0.95, depthWrite: false });
    const cooledCrystalMat = new THREE.MeshStandardMaterial({
      color: 0xccfbf1,
      emissive: 0x2dd4bf,
      emissiveIntensity: 0.55,
      roughness: 0.15,
      metalness: 0.1,
    });
    const crystalGeo = new THREE.OctahedronGeometry(0.2, 0);
    crystalGeo.scale(1, 1.7, 1);

    // 3. Scrolling curb scenery (instanced treadmill shared with the sled course): basalt spires & ember crystals
    this.sledScenery = [];
    const addScenery = (inst: THREE.InstancedMesh, rows: number[][]): void => {
      const data = new Float32Array(rows.length * 6);
      rows.forEach((r, i) => data.set(r, i * 6));
      inst.count = rows.length;
      inst.frustumCulled = false;
      this.levelGroup.add(inst);
      this.sledScenery.push({ inst, data });
    };
    const spireCount = Math.round(SLED_SCENERY_SPAN / 4.4) * 2;
    const spireInst = new THREE.InstancedMesh(new THREE.ConeGeometry(0.85, 2.6, 7), basaltMat, spireCount);
    const spireRows: number[][] = [];
    for (let z0 = 0; z0 < SLED_SCENERY_SPAN - 0.01; z0 += 4.4) {
      for (const side of [-1, 1]) {
        const jitter = Math.sin(z0 * 1.3 + side * 2.0) * 0.5 + 0.5;
        const sc = 0.7 + jitter * 0.6;
        spireRows.push([side * (TRACK_HALF_W - 0.15 + jitter * 0.4), 1.3 * sc, z0 + jitter * 1.4, sc, sc * (0.9 + jitter * 0.5), sc]);
      }
    }
    addScenery(spireInst, spireRows);
    const emberCount = Math.round(SLED_SCENERY_SPAN / 7.3) * 2;
    const emberInst = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(0.42, 0),
      new THREE.MeshStandardMaterial({ color: 0xffb347, emissive: 0xf97316, emissiveIntensity: 1.1, roughness: 0.25 }),
      emberCount
    );
    const emberRows: number[][] = [];
    for (let z0 = 3.0; z0 < SLED_SCENERY_SPAN - 0.01; z0 += 7.3) {
      for (const side of [-1, 1]) {
        const off = (Math.sin(z0 * 0.71 + side) * 0.5 + 0.5) * 0.5;
        emberRows.push([side * (TRACK_HALF_W - 1.15 - off), 0.55, z0 + side * 1.8, 0.8, 1.5, 0.8]);
      }
    }
    addScenery(emberInst, emberRows);
    this.updateSledScenery(0);

    // 4. Floating stone platforms (rows), cooled-rock safe platforms with frost frame, unit gates on platforms
    const rows: LavaRowRuntime[] = [];
    const rowMap = new Map<number, LavaRowRuntime>();
    for (const cfg of level.lavaPlatforms || []) {
      let row = rowMap.get(cfg.row);
      if (!row) {
        row = {
          index: cfg.row,
          d: cfg.d,
          start: cfg.d - cfg.depth / 2,
          end: cfg.d + cfg.depth / 2,
          platforms: [],
          landed: 0,
          fell: 0,
        };
        rowMap.set(cfg.row, row);
        rows.push(row);
      }
      const isShore = cfg.kind === 'shore';
      const isCooled = cfg.kind === 'cooled';
      const group = new THREE.Group();
      group.position.set(cfg.x, 0, -cfg.d);
      const slab = new THREE.Mesh(unitBox, isShore ? obsidianMat : isCooled ? cooledMat : basaltMat);
      slab.scale.set(cfg.width, 0.62, cfg.depth);
      slab.position.y = LAVA_PLATFORM_TOP - 0.35;
      slab.castShadow = !isShore;
      slab.receiveShadow = true;
      group.add(slab);
      const top = new THREE.Mesh(unitBox, isShore ? obsidianTopMat : isCooled ? cooledTopMat : basaltTopMat);
      top.scale.set(cfg.width - 0.24, 0.08, cfg.depth - 0.24);
      top.position.y = LAVA_PLATFORM_TOP - 0.03;
      top.receiveShadow = true;
      group.add(top);
      const rim = new THREE.Mesh(unitBox, rimGlowMat);
      rim.scale.set(cfg.width + 0.3, 0.12, cfg.depth + 0.3);
      rim.position.y = 0.08;
      group.add(rim);
      if (!isCooled && !isShore) {
        for (const [cx, cz, rot, len] of [
          [-0.16, 0.12, 0.5, 0.5],
          [0.2, -0.18, -0.7, 0.42],
        ] as const) {
          const crack = new THREE.Mesh(unitBox, crackMat);
          crack.scale.set(cfg.width * len, 0.02, 0.08);
          crack.rotation.y = rot;
          crack.position.set(cfg.width * cx, LAVA_PLATFORM_TOP + 0.016, cfg.depth * cz);
          group.add(crack);
        }
      }
      let accentMat: THREE.MeshBasicMaterial | null = null;
      if (isCooled) {
        accentMat = new THREE.MeshBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0.9, depthWrite: false });
        const fw = cfg.width - 0.34;
        const fd = cfg.depth - 0.34;
        for (const [fx, fz, sx, sz] of [
          [0, -fd / 2, fw, 0.14],
          [0, fd / 2, fw, 0.14],
          [-fw / 2, 0, 0.14, fd],
          [fw / 2, 0, 0.14, fd],
        ] as const) {
          const bar = new THREE.Mesh(unitBox, accentMat);
          bar.scale.set(sx, 0.035, sz);
          bar.position.set(fx, LAVA_PLATFORM_TOP + 0.03, fz);
          group.add(bar);
        }
        for (const [sx, sz] of [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ] as const) {
          const cr = new THREE.Mesh(crystalGeo, cooledCrystalMat);
          cr.position.set(sx * (cfg.width / 2 - 0.45), LAVA_PLATFORM_TOP + 0.3, sz * (cfg.depth / 2 - 0.45));
          group.add(cr);
        }
      }
      let gateMat: THREE.MeshBasicMaterial | null = null;
      if (cfg.gateOp && cfg.gateValue) {
        const gateH = 2.5;
        for (const side of [-1, 1]) {
          const px = side * (cfg.width / 2 - 0.28);
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, gateH, 10), obsidianMat);
          post.position.set(px, LAVA_PLATFORM_TOP + gateH * 0.5, 0);
          group.add(post);
          const cap = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), brassMat);
          cap.position.set(px, LAVA_PLATFORM_TOP + gateH + 0.1, 0);
          group.add(cap);
          const ember = new THREE.Mesh(crystalGeo, crackMat);
          ember.position.set(px, LAVA_PLATFORM_TOP + gateH + 0.48, 0);
          group.add(ember);
        }
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, cfg.width - 0.5, 10), brassMat);
        bar.rotation.z = Math.PI / 2;
        bar.position.set(0, LAVA_PLATFORM_TOP + gateH + 0.02, 0);
        group.add(bar);
        const label = cfg.gateOp === 'mul' ? `×${cfg.gateValue}` : `+${cfg.gateValue}`;
        gateMat = new THREE.MeshBasicMaterial({
          map: this.getGateBannerTexture(cfg.gateStyle || 'blue', label),
          transparent: true,
          opacity: 0.97,
          alphaTest: 0.05,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const shield = new THREE.Mesh(new THREE.PlaneGeometry(cfg.width - 0.8, gateH - 0.12), gateMat);
        shield.position.set(0, LAVA_PLATFORM_TOP + gateH * 0.5 + 0.04, 0);
        group.add(shield);
      }
      courseGroup.add(group);
      row.platforms.push({
        cfg,
        group,
        accentMat,
        gateMat,
        gateTriggered: false,
        cooledTriggered: false,
        landed: 0,
        bobPhase: (cfg.d * 0.37 + cfg.x * 0.9) % (Math.PI * 2),
      });
    }
    rows.sort((a, b) => a.d - b.d);

    // 5. Exit gate on the far shore (obsidian pillars + molten portal ring + gold trophy) at the finish line
    const exitArch = new THREE.Group();
    exitArch.position.set(0, 0, -(L + 1.6));
    exitArch.userData.lavaArchD = L + 1.6;
    for (const side of [-1, 1]) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 5.4, 8), obsidianMat);
      pillar.position.set(side * 8.6, LAVA_PLATFORM_TOP + 2.7, 0);
      pillar.castShadow = true;
      exitArch.add(pillar);
      const brazier = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.45, 0.5, 10), brassMat);
      brazier.position.set(side * 8.6, LAVA_PLATFORM_TOP + 5.6, 0);
      exitArch.add(brazier);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 10), crackMat);
      flame.position.set(side * 8.6, LAVA_PLATFORM_TOP + 6.4, 0);
      exitArch.add(flame);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(18.2, 0.6, 0.8), obsidianMat);
    lintel.position.set(0, LAVA_PLATFORM_TOP + 5.3, 0);
    exitArch.add(lintel);
    const lintelTrim = new THREE.Mesh(new THREE.BoxGeometry(18.4, 0.16, 0.9), brassMat);
    lintelTrim.position.set(0, LAVA_PLATFORM_TOP + 4.98, 0);
    exitArch.add(lintelTrim);
    const portalMat = new THREE.MeshBasicMaterial({ color: 0xffa94d, transparent: true, opacity: 0.85, depthWrite: false });
    const portal = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.22, 10, 40), portalMat);
    portal.position.set(0, LAVA_PLATFORM_TOP + 2.6, 0);
    exitArch.add(portal);
    const finishLine = new THREE.Mesh(
      new THREE.PlaneGeometry(18.6, 0.9),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.8, depthWrite: false })
    );
    finishLine.rotation.x = -Math.PI / 2;
    finishLine.position.set(0, LAVA_PLATFORM_TOP + 0.03, 1.6);
    exitArch.add(finishLine);
    const cup = this.buildHallTrophyCupModel(3, 0xf97316);
    cup.scale.setScalar(1.3);
    cup.position.set(0, LAVA_PLATFORM_TOP + 5.6, 0);
    exitArch.add(cup);
    courseGroup.add(exitArch);
    this.lavaExitGroup = exitArch;

    // 6. Telegraphed eruptions: vent crater + red warning ring whose fill charges up, then a molten plume
    this.lavaEruptions = [];
    const ringGeo = new THREE.RingGeometry(0.8, 1.0, 44);
    ringGeo.rotateX(-Math.PI / 2);
    const beamGeo = new THREE.CylinderGeometry(0.22, 0.32, 7.0, 12, 1, true);
    beamGeo.translate(0, 3.5, 0);
    const discGeo = new THREE.CircleGeometry(1.0, 44);
    discGeo.rotateX(-Math.PI / 2);
    const plumeGeo = new THREE.CylinderGeometry(0.55, 1.0, 1.0, 18, 1, true);
    plumeGeo.translate(0, 0.5, 0);
    const coreGeo = new THREE.ConeGeometry(0.5, 1.0, 14, 1, true);
    coreGeo.translate(0, 0.5, 0);
    for (const cfg of level.lavaEruptions || []) {
      const group = new THREE.Group();
      group.position.set(cfg.x, 0, -cfg.d);
      const crater = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.16, 8, 22), obsidianMat);
      crater.rotation.x = Math.PI / 2;
      crater.position.y = LAVA_PLATFORM_TOP + 0.08;
      group.add(crater);
      const craterGlow = new THREE.Mesh(discGeo, crackMat);
      craterGlow.scale.setScalar(0.52);
      craterGlow.position.y = LAVA_PLATFORM_TOP + 0.05;
      group.add(craterGlow);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xff1a1a, transparent: true, opacity: 0.0, depthWrite: false });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.scale.setScalar(cfg.radius);
      ring.position.y = LAVA_PLATFORM_TOP + 0.06;
      ring.renderOrder = 2;
      group.add(ring);
      const fillMat = new THREE.MeshBasicMaterial({ color: 0xff3b1f, transparent: true, opacity: 0.0, depthWrite: false });
      const fill = new THREE.Mesh(discGeo, fillMat);
      fill.scale.setScalar(0.02);
      fill.position.y = LAVA_PLATFORM_TOP + 0.05;
      fill.renderOrder = 1;
      group.add(fill);
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0xff2d2d,
        transparent: true,
        opacity: 0.0,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.y = LAVA_PLATFORM_TOP;
      beam.userData.lavaBeam = true;
      group.add(beam);
      const plume = new THREE.Group();
      const plumeMat = new THREE.MeshBasicMaterial({
        color: 0xff7a1a,
        transparent: true,
        opacity: 0.0,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const outer = new THREE.Mesh(plumeGeo, plumeMat);
      outer.scale.set(cfg.radius * 0.85, 7.5, cfg.radius * 0.85);
      plume.add(outer);
      const inner = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.85, depthWrite: false }));
      inner.scale.set(cfg.radius * 0.45, 9.0, cfg.radius * 0.45);
      plume.add(inner);
      plume.position.y = LAVA_PLATFORM_TOP;
      plume.scale.set(1, 0.01, 1);
      plume.visible = false;
      group.add(plume);
      courseGroup.add(group);
      this.lavaEruptions.push({
        cfg,
        group,
        ringMat,
        fill,
        fillMat,
        plume,
        plumeMat,
        telegraphed: false,
        erupting: false,
        done: false,
        knocked: 0,
        blocked: 0,
        plumeT: 0,
      });
    }

    // 7. Falling volcanic bombs: dark-red shadow telegraph on the platform, then a burning boulder obstacle
    this.lavaRocks = [];
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x292524,
      emissive: 0xea580c,
      emissiveIntensity: 0.6,
      roughness: 0.7,
      flatShading: true,
    });
    for (const cfg of level.lavaRocks || []) {
      const group = new THREE.Group();
      group.position.set(cfg.x, 0, -cfg.d);
      const shadowMat = new THREE.MeshBasicMaterial({ color: 0x7f1d1d, transparent: true, opacity: 0.0, depthWrite: false });
      const shadow = new THREE.Mesh(discGeo, shadowMat);
      shadow.scale.setScalar(cfg.radius * 1.15);
      shadow.position.y = LAVA_PLATFORM_TOP + 0.045;
      shadow.renderOrder = 1;
      group.add(shadow);
      const rock = new THREE.Group();
      const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(cfg.radius * 0.82, 0), rockMat);
      boulder.castShadow = true;
      rock.add(boulder);
      const chunk = new THREE.Mesh(new THREE.DodecahedronGeometry(cfg.radius * 0.42, 0), rockMat);
      chunk.position.set(cfg.radius * 0.55, cfg.radius * 0.35, -cfg.radius * 0.2);
      rock.add(chunk);
      rock.position.y = 18;
      rock.visible = false;
      group.add(rock);
      courseGroup.add(group);
      this.lavaRocks.push({
        cfg,
        group,
        rock,
        shadowMat,
        landed: false,
        shattered: false,
        knocked: 0,
        crowdChecked: false,
        shatterAnim: 0,
      });
    }

    // 8. Landing reticle: where the squad centre will touch down on the next row (green = fits, amber = edge, red = lava)
    const reticleGeo = new THREE.RingGeometry(0.82, 1.0, 40);
    reticleGeo.rotateX(-Math.PI / 2);
    const reticleMat = new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.75, depthWrite: false });
    const reticle = new THREE.Mesh(reticleGeo, reticleMat);
    reticle.position.set(0, LAVA_PLATFORM_TOP + 0.07, SLED_Z - 10);
    reticle.renderOrder = 3;
    reticle.visible = false;
    this.levelGroup.add(reticle);

    const label = document.createElement('div');
    label.className = 'subtower-label lava-jump-label';
    label.style.display = 'none';
    this.labelsContainer.appendChild(label);

    this.lavaRun = {
      active: true,
      tier: level.lavaTier || 1,
      courseGroup,
      lavaTex,
      lavaMat,
      reticle,
      reticleMat,
      x: 0,
      distance: 0,
      courseLength: L,
      baseSpeed: course.baseSpeed,
      speed: 0,
      timeLeft: course.timeLimitSec,
      timeLimit: course.timeLimitSec,
      maxSteerX: course.maxSteerX,
      maxBobos: course.maxBobos,
      hopHeight: course.hopHeight,
      hitSlowMult: course.hitSlowMult,
      hitSlowSec: course.hitSlowSec,
      cooledShieldSec: course.cooledShieldSec,
      slowTimer: 0,
      shieldTimer: 0,
      hitFlash: 0,
      emberTimer: 0,
      state: 'hopping',
      rows,
      labelEl: label,
      hist: new Float32Array(LAVA_HIST_LEN),
      histDist: 0,
      leadRow: 0,
      leadPlat: 0,
      crowdRideY: LAVA_PLATFORM_TOP,
      crowdX: 0,
    };
    this.bossHp = 100;
  }

  /** Spawns the starting Bobo squad on the start shore (start Bobos + 熔岩晶核 milestone bonus). */
  protected spawnStartingLavaBobos(level: LevelConfig): number {
    const course = level.lavaCourse;
    const bonus = this.state.getLavaCoreMilestoneBonus().lavaBonusBobos;
    const n = Math.max(1, Math.min(course?.maxBobos ?? 90, (course?.startBobos ?? 16) + bonus));
    let spawned = 0;
    for (let k = 0; k < n; k++) {
      const slot = this.getLavaSlot(k, n, 0);
      const u = this.spawnUnit('blue', 'normal', slot.x, slot.z, 0, 0);
      if (u) {
        u.spawnHop = 0;
        u.rideY = LAVA_PLATFORM_TOP;
        u.sledSlotX = slot.x;
        u.sledSlotZ = slot.z;
        u.lavaRow = 0;
        u.lavaPlat = 0;
        spawned++;
      }
    }
    this.lavaPeakBobos = spawned;
    this.lavaBoboCount = spawned;
    return spawned;
  }

  /** Squad width: 3..7 columns depending on crowd size (bigger crowds need wider platforms or a cleaner line). */
  public getLavaSquadCols(n: number): number {
    return Math.max(3, Math.min(LAVA_MAX_COLS, Math.round(Math.sqrt(Math.max(1, n)) * 1.15)));
  }

  public getLavaSquadHalfWidth(n: number): number {
    return ((Math.min(Math.max(1, n), this.getLavaSquadCols(n)) - 1) / 2) * LAVA_COL_SPACING;
  }

  /** Formation slot k of n: rows of up to `cols` Bobos behind the squad front at SLED_Z - 0.9. */
  protected getLavaSlot(k: number, n: number, crowdX: number, out = this.lavaSlotScratch): { x: number; z: number } {
    const cols = this.getLavaSquadCols(n);
    const row = Math.floor(k / cols);
    const rowsTotal = Math.ceil(Math.max(1, n) / cols);
    const inRow = row < rowsTotal - 1 ? cols : Math.max(1, n - row * cols);
    const col = k - row * cols;
    out.x = crowdX + (col - (inRow - 1) / 2) * LAVA_COL_SPACING;
    out.z = SLED_Z - 0.9 + row * LAVA_ROW_SPACING;
    return out;
  }

  public getLavaBoboCount(): number {
    let n = 0;
    for (let i = 0; i < MAX_UNITS; i++) {
      const u = this.units[i];
      if (u.active && u.team === 'blue') n++;
    }
    return n;
  }

  public getLavaProgressPct(): number {
    const s = this.lavaRun;
    if (!s) return 0;
    return Math.max(0, Math.min(100, Math.round((s.distance / Math.max(1, s.courseLength)) * 100)));
  }

  /** Rows (excluding the start shore) the crowd front has reached, and the total number of platform rows. */
  public getLavaRowProgress(): { reached: number; total: number } {
    const s = this.lavaRun;
    if (!s) return { reached: 0, total: 0 };
    const total = Math.max(0, s.rows.length - 2);
    let reached = 0;
    for (let i = 1; i < s.rows.length - 1; i++) if (s.rows[i].landed > 0) reached++;
    return { reached, total };
  }

  public getLavaStateLabel(): string {
    const s = this.lavaRun;
    if (!s) return '尚未起跳';
    switch (s.state) {
      case 'stumbled':
        return '灼烧踉跄';
      case 'shielded':
        return '冷却岩护体';
      case 'finished':
        return '冲出火山口';
      case 'timeout':
        return '超时被困';
      case 'wiped':
        return '波波全部落岩';
      default:
        return '浮石连跳中';
    }
  }

  /** Index of the platform in `row` under x (with the landing margin), or -1 when x is over lava. */
  protected findLavaPlatform(row: LavaRowRuntime, x: number): number {
    let best = -1;
    let bestDx = Infinity;
    for (let p = 0; p < row.platforms.length; p++) {
      const cfg = row.platforms[p].cfg;
      const dx = Math.abs(x - cfg.x);
      if (dx <= cfg.width * 0.5 + LAVA_LAND_MARGIN && dx < bestDx) {
        bestDx = dx;
        best = p;
      }
    }
    return best;
  }

  /** A hazard (eruption / burning rock) hit: a frost / pet shell absorbs it instead. Returns true if the Bobo is lost. */
  protected knockLavaBobo(u: Unit, silent = false): boolean {
    if (!u.active || u.team !== 'blue') return false;
    if (u.frostShield) {
      u.frostShield = false;
      u.petShellGranted = false;
      if (!silent) this.spawnBurstParticles(u.x, 0.9 + (u.rideY || 0), u.z, 0x7dd3fc, 4);
      return false;
    }
    u.active = false;
    this.lavaBobosLost += 1;
    if (!silent) {
      this.spawnBurstParticles(u.x, 0.8 + (u.rideY || 0), u.z, 0xf97316, 6);
      this.spawnBurstParticles(u.x, 1.2 + (u.rideY || 0), u.z, 0x44403c, 3);
    }
    return true;
  }

  /** A Bobo missed every platform of the row it reached: it sinks into the lava (no shield can save it). */
  private dropBoboIntoLava(u: Unit, row: LavaRowRuntime, silent = false): void {
    if (!u.active) return;
    u.active = false;
    row.fell += 1;
    this.lavaBobosLost += 1;
    this.lavaBobosFell += 1;
    if (!silent) {
      this.spawnBurstParticles(u.x, 0.25, u.z, 0xffa94d, 5);
      this.spawnBurstParticles(u.x, 0.6, u.z, 0x3f3f46, 2);
    }
  }

  /** Re-seats every Bobo on its formation slot and re-syncs its row / platform to the current distance (self-checks). */
  public snapLavaBobosToSlots(): void {
    const s = this.lavaRun;
    if (!s) return;
    s.hist.fill(s.x);
    s.histDist = s.distance;
    s.leadRow = -1;
    s.leadPlat = -1;
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
      const du = s.distance + (SLED_Z - u.z);
      let r = 0;
      for (let ri = 0; ri < s.rows.length; ri++) if (s.rows[ri].start <= du) r = ri;
      u.lavaRow = r;
      u.lavaPlat = this.findLavaPlatform(s.rows[r], u.x);
      u.rideY = LAVA_PLATFORM_TOP;
    }
  }

  /**
   * MC-17 fix (same bookkeeping class as the MC-16 mid-hop reinforcements): the Bobos a regular +N / ×N gate adds join
   * the formation wherever their slot is — usually the tail, which is still on an earlier row or mid-hop when the front
   * lands on the gate platform. They used to be booked on the gate's row / platform at a random spot on it, so tail
   * Bobos skipped that row's landing check. Now every fresh Bobo is seated on its own slot with the row / platform that
   * slot actually stands on (seatLavaReinforcements), exactly like tactic-card reinforcements.
   */
  private applyLavaGate(rowIdx: number, p: LavaPlatformRuntime, silent = false): number {
    const s = this.lavaRun;
    if (!s || p.gateTriggered || !p.cfg.gateOp || !p.cfg.gateValue || !s.rows[rowIdx]) return 0;
    const bobos = this.getLavaBoboCount();
    const want = p.cfg.gateOp === 'mul' ? bobos * (Math.max(1, p.cfg.gateValue) - 1) : p.cfg.gateValue;
    const room = Math.max(0, s.maxBobos - bobos);
    const n = Math.max(0, Math.min(room, Math.floor(want)));
    let added = 0;
    const fresh = new Set<number>();
    for (let k = 0; k < n; k++) {
      const u = this.spawnUnit('blue', k % 6 === 0 ? 'charged' : 'normal', p.cfg.x, SLED_Z, 0, 0);
      if (u) {
        u.spawnHop = 0.6;
        u.rideY = LAVA_PLATFORM_TOP;
        fresh.add(u.id);
        added++;
      }
    }
    this.seatLavaReinforcements(fresh);
    p.gateTriggered = true;
    if (p.gateMat) p.gateMat.opacity = 0.4;
    this.lavaGatesPassed += 1;
    this.lavaPeakBobos = Math.max(this.lavaPeakBobos, bobos + added);
    if (!silent) {
      sound.playCloneGate(p.cfg.gateOp === 'mul' ? 3 : 2);
      this.spawnBurstParticles(p.cfg.x, 1.8, SLED_Z - 1.2, p.cfg.gateOp === 'mul' ? 0xfacc15 : 0x38bdf8, 22);
      this.spawnShockwave(p.cfg.x, SLED_Z - 0.8, p.cfg.gateOp === 'mul' ? 0xfacc15 : 0x7dd3fc, 4.0, 0.35);
      this.spawnFloatingPopup(
        p.cfg.x,
        3.2,
        SLED_Z - 1.0,
        added < n || n < want ? `+${added} 波波 (满员)` : `+${added} 波波加入!`,
        p.cfg.gateOp === 'mul' ? '#fde047' : '#bae6fd'
      );
    }
    return added;
  }

  private lavaStumble(cause: string, silent = false): void {
    const s = this.lavaRun;
    if (!s) return;
    s.slowTimer = Math.max(s.slowTimer, s.hitSlowSec);
    s.hitFlash = 1.0;
    if (!silent) {
      this.addCameraShake(0.3);
      this.spawnFloatingPopup(s.x, 3.6, SLED_Z - 1.0, cause, '#fdba74');
    }
  }

  /**
   * Autopilot target x (self-checks / screenshots / demo): lands the whole squad on the best platform of the next
   * row (gates & cooled rock preferred), steers clear of eruptions and burning rocks, and peeks one row further.
   */
  public getLavaAutopilotX(): number {
    const s = this.lavaRun;
    if (!s) return 0;
    const n = this.lavaBoboCount || this.getLavaBoboCount();
    const half = this.getLavaSquadHalfWidth(n);
    const frontDu = s.distance + 0.9;
    const next: LavaRowRuntime[] = [];
    for (let i = 0; i < s.rows.length && next.length < 2; i++) {
      if (s.rows[i].start > frontDu - 0.05) next.push(s.rows[i]);
    }
    if (next.length === 0) return s.x;
    let bestX = s.x;
    let bestScore = -Infinity;
    for (let x = -s.maxSteerX; x <= s.maxSteerX + 0.01; x += 0.25) {
      let score = -Math.abs(x - s.x) * 0.02;
      next.forEach((row, idx) => {
        const w = idx === 0 ? 1 : 0.3;
        let rowScore = -400;
        for (const p of row.platforms) {
          const lo = p.cfg.x - p.cfg.width * 0.5 + 0.3;
          const hi = p.cfg.x + p.cfg.width * 0.5 - 0.3;
          const covered =
            half <= 0.01 ? (x >= lo && x <= hi ? 1 : 0) : Math.max(0, Math.min(hi, x + half) - Math.max(lo, x - half)) / (2 * half);
          let ps = covered >= 0.999 ? 100 : -300 * (1 - covered);
          if (covered >= 0.999) {
            if (p.cfg.gateOp && p.cfg.gateValue && !p.gateTriggered) {
              ps += (p.cfg.gateOp === 'mul' ? n * (p.cfg.gateValue - 1) : p.cfg.gateValue) * 2;
            }
            if (p.cfg.kind === 'cooled') ps += 15;
            ps -= Math.abs(x - p.cfg.x) * 4;
          }
          rowScore = Math.max(rowScore, ps);
        }
        for (const e of this.lavaEruptions) {
          if (e.done || e.cfg.row !== row.index) continue;
          if (Math.abs(x - e.cfg.x) < e.cfg.radius + half + 0.2) rowScore -= 260;
        }
        for (const rk of this.lavaRocks) {
          if (rk.shattered || rk.cfg.row !== row.index) continue;
          const reach = rk.cfg.radius + half + 0.45;
          const dx = Math.abs(x - rk.cfg.x);
          if (dx < reach) rowScore -= 70 * (reach - dx);
        }
        score += w * rowScore;
      });
      if (score > bestScore) {
        bestScore = score;
        bestX = x;
      }
    }
    return bestX;
  }

  protected updateLavaJump(dt: number): void {
    const s = this.lavaRun;
    const level = this.currentLevel;
    if (!s || !s.active || !level) return;
    const t = this.elapsedTime;
    const rows = s.rows;

    // 1. Steering (the squad follows the cannon's lateral aim) & pace (stumbles slow the hops down)
    const steerX = THREE.MathUtils.clamp(this.turretX, -s.maxSteerX, s.maxSteerX);
    s.x = THREE.MathUtils.lerp(s.x, steerX, Math.min(1, dt * 7.0));
    let target = s.baseSpeed * this.getTacticRushMult();
    if (s.slowTimer > 0) {
      s.slowTimer = Math.max(0, s.slowTimer - dt);
      target *= s.hitSlowMult;
    }
    if (s.shieldTimer > 0) s.shieldTimer = Math.max(0, s.shieldTimer - dt);
    s.speed = THREE.MathUtils.lerp(s.speed, target, Math.min(1, dt * (target > s.speed ? 2.6 : 5.0)));
    s.distance = Math.min(s.courseLength, s.distance + s.speed * dt);
    s.timeLeft = Math.max(0, s.timeLeft - dt);
    s.state = s.slowTimer > 0 ? 'stumbled' : s.shieldTimer > 0 ? 'shielded' : 'hopping';
    this.bossHp = Math.max(0, 100 - this.getLavaProgressPct());

    // 2. Scroll the course toward the camera, flow the lava & bob the floating platforms
    s.courseGroup.position.z = SLED_Z + s.distance;
    if (s.lavaTex) {
      s.lavaTex.offset.y = (s.distance / LAVA_TEX_TILE_M) % 1;
      s.lavaTex.offset.x = Math.sin(t * 0.35) * 0.04;
    }
    s.lavaMat.emissiveIntensity = 0.86 + Math.sin(t * 2.2) * 0.08;
    this.updateSledScenery(s.distance);
    for (const row of rows) {
      const wz = SLED_Z + s.distance - row.d;
      const vis = wz > -SLED_DECK_HALF - 6 && wz < SLED_DECK_HALF + 3;
      for (const p of row.platforms) {
        p.group.visible = vis;
        if (!vis || p.cfg.kind === 'shore') continue;
        p.group.position.y = Math.sin(t * 1.6 + p.bobPhase) * 0.035;
        if (p.accentMat) p.accentMat.opacity = 0.65 + Math.sin(t * 4 + p.bobPhase) * 0.25;
      }
    }
    if (this.lavaExitGroup) {
      const ed = (this.lavaExitGroup.userData.lavaArchD as number) || s.courseLength;
      this.lavaExitGroup.visible = SLED_Z + s.distance - ed > -SLED_DECK_HALF - 8;
    }
    s.emberTimer -= dt;
    if (s.emberTimer <= 0) {
      s.emberTimer = 0.09;
      this.spawnBurstParticles((Math.random() - 0.5) * 19, 0.15, SLED_Z - 16 + Math.random() * 26, Math.random() < 0.5 ? 0xff8a1f : 0xfacc15, 1);
    }

    // 3. Squad formation: the lead line (clamped onto the platform the front row stands on) is recorded along the
    //    course and every formation row follows that exact path a few metres later (a hopping conga line), so the
    //    tail lands where the head landed. Every Bobo still lands on its own: missing every platform -> lava.
    const n = this.getLavaBoboCount();
    const cols = this.getLavaSquadCols(n);
    const lastRow = rows.length - 1;
    const frontDu0 = s.distance + 0.9;
    let leadX = s.x;
    if (s.leadRow >= 0 && s.leadRow < rows.length) {
      const lr = rows[s.leadRow];
      const lp = s.leadPlat >= 0 ? lr.platforms[s.leadPlat] : undefined;
      if (lp && frontDu0 <= lr.end + 0.2) {
        const avail = Math.max(0, lp.cfg.width * 0.5 - 0.3 - this.getLavaSquadHalfWidth(n));
        leadX = THREE.MathUtils.clamp(s.x, lp.cfg.x - avail, lp.cfg.x + avail);
      }
    }
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
    // MC-17: gates landed on this frame are applied after the formation pass (fresh Bobos are seated with the new count)
    const gateLandings: Array<{ r: number; p: LavaPlatformRuntime }> = [];
    for (let i = 0; i < MAX_UNITS; i++) {
      const u = this.units[i];
      if (!u.active || u.team !== 'blue') continue;
      const formRow = Math.floor(k / cols);
      const pathX =
        formRow === 0
          ? leadX
          : s.hist[Math.min(s.hist.length - 1, Math.round((formRow * LAVA_ROW_SPACING) / LAVA_HIST_STEP))];
      const slot = this.getLavaSlot(k, n, pathX);
      k++;
      let r = Math.max(0, Math.min(lastRow, u.lavaRow ?? 0));
      const du = s.distance + (SLED_Z - u.z);
      let fell = false;
      while (r < lastRow && du >= rows[r + 1].start) {
        const nextRow = rows[r + 1];
        const pIdx = this.findLavaPlatform(nextRow, u.x);
        if (pIdx < 0) {
          this.dropBoboIntoLava(u, nextRow);
          fell = true;
          break;
        }
        r += 1;
        u.lavaRow = r;
        u.lavaPlat = pIdx;
        if (formRow === 0) {
          s.leadRow = r;
          s.leadPlat = pIdx;
        }
        const p = nextRow.platforms[pIdx];
        p.landed += 1;
        if (nextRow.landed === 0 && r > 0) this.lavaHops += 1;
        nextRow.landed += 1;
        if (p.cfg.gateOp && !p.gateTriggered && !gateLandings.some((g) => g.p === p)) gateLandings.push({ r, p });
        if (p.cfg.kind === 'cooled' && !p.cooledTriggered) {
          p.cooledTriggered = true;
          s.shieldTimer = Math.max(s.shieldTimer, s.cooledShieldSec);
          this.lavaCooledLandings += 1;
          this.spawnShockwave(p.cfg.x, SLED_Z - 0.6, 0x5eead4, 4.2, 0.4);
          this.spawnFloatingPopup(p.cfg.x, 3.0, SLED_Z - 1.0, `冷却岩护体 ${s.cooledShieldSec.toFixed(1)}s`, '#99f6e4');
        }
        if (r === lastRow) break;
      }
      if (fell) continue;
      u.lavaRow = r;
      const row = rows[r];
      const plat = u.lavaPlat !== undefined && u.lavaPlat >= 0 ? row.platforms[u.lavaPlat] : undefined;
      let slotX = THREE.MathUtils.clamp(slot.x, -TRACK_HALF_W + 0.9, TRACK_HALF_W - 0.9);
      let rideTarget = LAVA_PLATFORM_TOP;
      if (du <= row.end + 0.25 || r === lastRow) {
        if (du < row.start - 0.3 && r > 0) {
          const prev = rows[r - 1];
          const gap = Math.max(0.5, row.start - prev.end);
          const ph = THREE.MathUtils.clamp((du - prev.end) / gap, 0, 1);
          rideTarget = LAVA_PLATFORM_TOP + Math.sin(ph * Math.PI) * s.hopHeight * THREE.MathUtils.clamp(gap / 7, 0.8, 1.6);
        } else if (plat) {
          // Standing on the platform: stay on it (squeeze toward its middle instead of walking off the edge)
          const half = plat.cfg.width * 0.5 - 0.3;
          slotX = THREE.MathUtils.clamp(slotX, plat.cfg.x - half, plat.cfg.x + half);
          rideTarget = LAVA_PLATFORM_TOP + plat.group.position.y;
        }
      } else {
        const next = rows[r + 1];
        const gap = Math.max(0.5, next.start - row.end);
        const ph = THREE.MathUtils.clamp((du - row.end) / gap, 0, 1);
        rideTarget = LAVA_PLATFORM_TOP + Math.sin(ph * Math.PI) * s.hopHeight * THREE.MathUtils.clamp(gap / 7, 0.8, 1.6);
      }
      u.sledSlotX = slotX;
      u.sledSlotZ = slot.z;
      u.rideY = rideTarget;
      const pin = Math.min(1, dt * 10);
      u.x = THREE.MathUtils.lerp(u.x, slotX, pin);
      u.z = THREE.MathUtils.lerp(u.z, slot.z, pin);
      rideSum += rideTarget;
      xSum += u.x;
      trailEndZ = Math.max(trailEndZ, u.z);
    }
    for (const g of gateLandings) this.applyLavaGate(g.r, g.p);
    const alive = this.getLavaBoboCount();
    this.lavaBoboCount = alive;
    s.crowdRideY = alive > 0 ? rideSum / Math.max(1, k) : LAVA_PLATFORM_TOP;
    s.crowdX = alive > 0 ? xSum / Math.max(1, k) : s.x;

    // 4. Landing reticle on the next row the squad front has not reached yet
    const frontDu = s.distance + 0.9;
    let nextRow: LavaRowRuntime | null = null;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i].start > frontDu - 0.05) {
        nextRow = rows[i];
        break;
      }
    }
    if (nextRow && alive > 0) {
      const half = this.getLavaSquadHalfWidth(alive);
      let fit = 0;
      for (const p of nextRow.platforms) {
        const lo = p.cfg.x - p.cfg.width * 0.5 - LAVA_LAND_MARGIN;
        const hi = p.cfg.x + p.cfg.width * 0.5 + LAVA_LAND_MARGIN;
        const covered =
          half <= 0.01 ? (s.x >= lo && s.x <= hi ? 1 : 0) : Math.max(0, Math.min(hi, s.x + half) - Math.max(lo, s.x - half)) / (2 * half);
        fit = Math.max(fit, covered);
      }
      s.reticle.visible = true;
      s.reticle.position.set(s.x, LAVA_PLATFORM_TOP + 0.07, SLED_Z + s.distance - nextRow.d);
      s.reticle.scale.set(half + 0.55, 1, 1.05);
      s.reticleMat.color.setHex(fit >= 0.999 ? 0x4ade80 : fit > 0.01 ? 0xfacc15 : 0xef4444);
      s.reticleMat.opacity = 0.62 + Math.sin(t * 8) * 0.18;
    } else {
      s.reticle.visible = false;
    }

    // 5. Eruptions: the warning ring charges up as the row approaches, then a molten plume bursts on the crowd
    for (const e of this.lavaEruptions) {
      if (e.done) continue;
      const ahead = e.cfg.d - s.distance;
      const worldZ = SLED_Z - ahead;
      e.group.visible = worldZ > -SLED_DECK_HALF - 6 && worldZ < SLED_DECK_HALF + 3;
      if (!e.telegraphed && ahead <= LAVA_ERUPT_TELEGRAPH) {
        e.telegraphed = true;
        this.spawnFloatingPopup(e.cfg.x, 2.6, Math.max(-14, worldZ), '熔岩喷发预警! 换一块浮石', '#fca5a5');
      }
      if (e.telegraphed && !e.erupting) {
        const prog = THREE.MathUtils.clamp(
          (LAVA_ERUPT_TELEGRAPH - ahead) / (LAVA_ERUPT_TELEGRAPH - LAVA_ERUPT_AT),
          0,
          1
        );
        e.fill.scale.setScalar(Math.max(0.02, prog * e.cfg.radius));
        e.fillMat.opacity = 0.3 + prog * 0.4;
        e.ringMat.opacity = 0.7 + Math.sin(t * (8 + prog * 14)) * 0.28;
        const beam = e.group.children.find((c) => c.userData.lavaBeam) as THREE.Mesh | undefined;
        if (beam) (beam.material as THREE.MeshBasicMaterial).opacity = (0.22 + prog * 0.3) * (0.7 + Math.sin(t * 10) * 0.3);
        if (Math.random() < dt * (2 + prog * 10)) {
          this.spawnBurstParticles(e.cfg.x + (Math.random() - 0.5) * e.cfg.radius, 0.6, worldZ, 0xff7a1a, 1);
        }
        if (ahead <= LAVA_ERUPT_AT) {
          e.erupting = true;
          e.plume.visible = true;
          const beamOff = e.group.children.find((c) => c.userData.lavaBeam);
          if (beamOff) beamOff.visible = false;
          e.plumeT = 0;
          this.addCameraShake(0.35);
          sound.playExplosion();
          this.spawnShockwave(e.cfg.x, worldZ, 0xf97316, e.cfg.radius * 2.2, 0.45);
          this.spawnBurstParticles(e.cfg.x, 1.2, worldZ, 0xffa94d, 30);
        }
      }
      if (!e.erupting) continue;
      e.plumeT += dt;
      const rise = Math.min(1, e.plumeT * 5);
      e.plume.scale.set(1 + Math.sin(t * 18) * 0.05, rise, 1 + Math.cos(t * 16) * 0.05);
      e.plumeMat.opacity = 0.75 * Math.max(0.25, 1 - e.plumeT * 0.35);
      e.fillMat.opacity = 0.5;
      if (Math.random() < dt * 22) {
        this.spawnBurstParticles(e.cfg.x + (Math.random() - 0.5) * e.cfg.radius, 2 + Math.random() * 3, worldZ, Math.random() < 0.5 ? 0xff7a1a : 0xfacc15, 2);
      }
      const r = e.cfg.radius;
      const zSpan = 2.4;
      let knockedNow = 0;
      let blockedNow = 0;
      for (let i = 0; i < MAX_UNITS && e.knocked < e.cfg.knockCap; i++) {
        const u = this.units[i];
        if (!u.active || u.team !== 'blue') continue;
        if (Math.abs(u.x - e.cfg.x) > r) continue;
        const du = s.distance + (SLED_Z - u.z);
        if (Math.abs(du - e.cfg.d) > zSpan) continue;
        if (s.shieldTimer > 0) {
          blockedNow++;
          continue;
        }
        if (this.knockLavaBobo(u)) {
          e.knocked++;
          knockedNow++;
        }
      }
      if (blockedNow > 0) {
        if (e.blocked === 0) {
          this.lavaShieldBlocks += 1;
          this.spawnFloatingPopup(e.cfg.x, 3.4, worldZ, '冷却岩护体挡下喷发!', '#99f6e4');
        }
        e.blocked = Math.max(e.blocked, blockedNow);
      }
      if (knockedNow > 0 && e.knocked === knockedNow) {
        this.lavaEruptionHits += 1;
        this.lavaStumble('熔岩喷发! 波波被冲散');
      }
      if (worldZ > trailEndZ + r + 1.0 || worldZ > SLED_DECK_HALF + 2) {
        e.done = true;
        e.group.visible = false;
        if (e.knocked === 0) this.lavaHazardsDodged += 1;
        else this.spawnFloatingPopup(e.cfg.x, 2.6, Math.min(16, SLED_Z + 5), `喷发冲散 -${e.knocked} 波波`, '#fda4af');
      }
    }

    // 6. Volcanic bombs: shadow telegraph -> falls -> burning boulder that knocks Bobos off its platform (capped)
    for (const rk of this.lavaRocks) {
      const ahead = rk.cfg.d - s.distance;
      const worldZ = SLED_Z - ahead;
      rk.group.visible = worldZ > -SLED_DECK_HALF - 6 && worldZ < SLED_DECK_HALF + 3;
      if (rk.shattered) {
        if (rk.shatterAnim > 0) {
          rk.shatterAnim = Math.max(0, rk.shatterAnim - dt * 3);
          rk.rock.scale.setScalar(Math.max(0.05, rk.shatterAnim));
          if (rk.shatterAnim <= 0) rk.rock.visible = false;
        }
        rk.shadowMat.opacity = Math.max(0, rk.shadowMat.opacity - dt);
        continue;
      }
      if (!rk.landed) {
        if (ahead <= LAVA_ROCK_FALL_START) {
          rk.rock.visible = true;
          const prog = THREE.MathUtils.clamp((LAVA_ROCK_FALL_START - ahead) / (LAVA_ROCK_FALL_START - LAVA_ROCK_LAND_AT), 0, 1);
          rk.rock.position.y = LAVA_PLATFORM_TOP + rk.cfg.radius * 0.5 + 17 * (1 - prog * prog);
          rk.rock.rotation.set(t * 3.2, t * 2.1, 0);
          rk.shadowMat.opacity = 0.2 + prog * 0.45;
          if (Math.random() < dt * 16) {
            this.spawnBurstParticles(rk.cfg.x, rk.rock.position.y + 0.6, worldZ, Math.random() < 0.6 ? 0x57534e : 0xff7a1a, 1);
          }
          if (prog >= 1) {
            rk.landed = true;
            rk.rock.position.y = LAVA_PLATFORM_TOP + rk.cfg.radius * 0.45;
            rk.rock.rotation.set(0.3, 0.6, 0.1);
            this.spawnBurstParticles(rk.cfg.x, 0.8, worldZ, 0xff8a1f, 16);
            this.spawnShockwave(rk.cfg.x, worldZ, 0xf97316, rk.cfg.radius * 2.6, 0.32);
            this.addCameraShake(0.12);
          }
        }
        continue;
      }
      rk.shadowMat.opacity = 0.55 + Math.sin(t * 9) * 0.1;
      if (worldZ > SLED_Z - 3.0 && worldZ < trailEndZ + 1.5) {
        const rr0 = rk.cfg.radius;
        for (let i = 0; i < MAX_UNITS && rk.knocked < rk.cfg.knockCap; i++) {
          const u = this.units[i];
          if (!u.active || u.team !== 'blue') continue;
          const dx = u.x - rk.cfg.x;
          const dz = u.z - worldZ;
          const rr = rr0 + u.radius;
          if (dx * dx + dz * dz > rr * rr) continue;
          if (s.shieldTimer > 0) continue;
          if (this.knockLavaBobo(u)) rk.knocked++;
        }
        // The squad ran into the burning boulder: count the hit once and stumble
        if (rk.knocked > 0 && !rk.crowdChecked) {
          rk.crowdChecked = true;
          this.lavaRockHits += 1;
          this.lavaStumble('撞上熔岩落石!');
        }
        if (rk.knocked >= rk.cfg.knockCap) {
          rk.shattered = true;
          rk.shatterAnim = 1;
          this.spawnBurstParticles(rk.cfg.x, 1.0, worldZ, 0xffa94d, 18);
          this.spawnFloatingPopup(rk.cfg.x, 2.6, worldZ, `落石砸散 -${rk.knocked} 波波`, '#fda4af');
        }
      }
      if (worldZ > trailEndZ + 1.5 && !rk.shattered) {
        rk.shattered = true;
        rk.shatterAnim = 0;
        rk.rock.visible = false;
        if (rk.knocked === 0) this.lavaHazardsDodged += 1;
        else this.spawnFloatingPopup(rk.cfg.x, 2.2, Math.min(16, worldZ), `-${rk.knocked} 波波`, '#fda4af');
      }
    }

    // 7. Resolution: reach the exit shore = victory; countdown out or every Bobo lost = defeat
    if (s.distance >= s.courseLength - 0.001 && alive > 0) {
      s.active = false;
      s.state = 'finished';
      s.labelEl.style.display = 'none';
      s.reticle.visible = false;
      this.lavaFinishSec = Number((s.timeLimit - s.timeLeft).toFixed(2));
      this.bossHp = 0;
      this.spawnSkyPillar(s.x, SLED_Z - 2, 0xf97316, 3.6, 0.7);
      this.spawnShockwave(s.x, SLED_Z, 0xfacc15, 11.0, 0.7);
      this.spawnBurstParticles(s.x, 2.2, SLED_Z - 1, 0xfacc15, 60);
      this.finishStage(true);
      this.onBanner?.(
        `${UI_ART.lavaJump} 波波团冲出火山口！`,
        `用时 ${this.lavaFinishSec.toFixed(1)}s / 限时 ${s.timeLimit}s · 幸存波波 ${alive} 只 · 加人门 ${this.lavaGatesPassed}`
      );
      return;
    }
    if (s.timeLeft <= 0 || alive <= 0) {
      s.active = false;
      s.state = alive <= 0 ? 'wiped' : 'timeout';
      s.labelEl.style.display = 'none';
      s.reticle.visible = false;
      this.lavaFinishSec = Number((s.timeLimit - s.timeLeft).toFixed(2));
      this.spawnBurstParticles(s.x, 1.4, SLED_Z, 0xff7a1a, 40);
      this.onBanner?.(
        `${UI_ART.warning} ${s.state === 'wiped' ? '波波全部坠入熔岩' : '超时被困火山口'}！`,
        `前进 ${Math.round(s.distance)}/${s.courseLength}m · 已损失 ${this.lavaBobosLost} 只波波`
      );
      this.finishStage(false);
    }
  }
}
