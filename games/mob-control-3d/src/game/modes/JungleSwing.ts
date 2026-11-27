/** MC-17 丛林神庙藤蔓秋千 / MC-18 海盗船跳板突围（共用一套跑法）：从 World3D 原样搬出的方法（字段仍在 World3D）。继承链见 ../World3DFull.ts。 */
import * as THREE from 'three';
import {
  LevelConfig,
  JungleVineConfig,
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
  JG_FRONT_OFFSET,
  JG_RIDE_BASE,
  JG_FLOOR_REPEAT_V,
  JG_FLOOR_TILE_M,
  JG_FIREFLY_CELL,
  JG_FIREFLIES_PER_CELL,
  JG_BEAM_Y,
  JG_VINE_LEN,
  JG_JUNGLE_SKY,
  PR_SEA_SKY,
} from '../world/CourseConstants';
import {
  stylizeMaterialAs2DIllustration,
} from '../SceneThemes';
import {
  JungleChasmRuntime,
  JungleGateRuntime,
  MAX_UNITS,
  SLED_Z,
  TRACK_HALF_W,
  Unit,
} from '../WorldTypes';
import { PyramidRunMode } from './PyramidRun';

export abstract class JungleSwingMode extends PyramidRunMode {
  /** Misty jungle tint on top of the emerald base theme (re-applied every load; applyTheme restores other modes). */
  private applyJungleSwingAmbience(): void {
    this.scene.background = new THREE.Color(JG_JUNGLE_SKY);
    this.scene.fog = new THREE.FogExp2(0xa9dcc2, 0.0042);
    if (this.abyssShaderMat?.uniforms) {
      this.abyssShaderMat.uniforms.uBaseColor.value.set('#2f7d55');
      this.abyssShaderMat.uniforms.uVeinColor.value.set('#14532d');
      this.abyssShaderMat.uniforms.uAccentColor.value.set('#a7f3d0');
    }
    this.hemiLight.color.setHex(0xeefff4);
    this.hemiLight.groundColor.setHex(0x2f6b3f);
    this.dirLight.color.setHex(0xfff4d2);
    this.rimLight.color.setHex(0x34d399);
  }

  /** Procedural (non-canvas) temple floor: staggered mossy flagstones, a jade runner with gold edges & glyph dashes. */
  private createJungleFloorTexture(): THREE.DataTexture {
    const size = 64;
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        const noise = hash - Math.floor(hash);
        const row = Math.floor(y / 8);
        const sx = x + (row % 2) * 5;
        const blockHash = Math.sin(Math.floor(sx / 10) * 7.31 + row * 3.77) * 9631.7;
        const tone = (blockHash - Math.floor(blockHash)) * 18;
        const mossHash = Math.sin(Math.floor(x / 5) * 3.17 + Math.floor(y / 5) * 5.93) * 2731.3;
        const moss = mossHash - Math.floor(mossHash) > 0.62;
        let r = 150 + tone + noise * 8;
        let g = 156 + tone * 0.9 + noise * 8;
        let b = 122 + tone * 0.6 + noise * 6;
        if (moss) {
          r = 96 + noise * 14;
          g = 150 + noise * 16;
          b = 78 + noise * 10;
        }
        if (y % 8 === 0 || sx % 10 === 0) {
          r = 62;
          g = 84;
          b = 52;
        }
        if (x >= 23 && x <= 40) {
          r = 42 + noise * 10;
          g = 164 + noise * 12;
          b = 118 + noise * 10;
          if (x === 23 || x === 40 || x === 25 || x === 38) {
            r = 240;
            g = 196;
            b = 72;
          } else if ((x === 31 || x === 32) && y % 16 < 6) {
            r = 236;
            g = 252;
            b = 214;
          } else if ((x === 28 || x === 35) && y % 16 >= 9 && y % 16 < 12) {
            r = 252;
            g = 222;
            b = 120;
          }
        }
        if (x <= 1 || x >= size - 2) {
          r = 92;
          g = 70;
          b = 40;
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
    tex.repeat.set(1, JG_FLOOR_REPEAT_V);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  /**
   * Procedural chasm (looking down into it): the near half is a misty black-green drop, the far half the lit, mossy
   * rock face of the opposite cliff with hanging roots, so a chasm reads as a gap at a glance.
   */
  private createJungleChasmTexture(): THREE.DataTexture {
    const size = 64;
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
      const v = (y + 0.5) / size;
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        const noise = hash - Math.floor(hash);
        let r: number;
        let g: number;
        let b: number;
        if (v < 0.56) {
          // The drop: darkest right below the near edge, a faint green mist band deeper down
          const mist = Math.max(0, 1 - Math.abs(v - 0.34) / 0.16) * 26;
          r = 8 + mist * 0.5 + noise * 6;
          g = 22 + mist + noise * 8;
          b = 16 + mist * 0.7 + noise * 6;
        } else {
          // The opposite cliff face: rock layers with moss streaks, brighter toward its top edge
          const lift = (v - 0.56) / 0.44;
          const layer = Math.sin(y * 1.7 + Math.sin(x * 0.4) * 1.2) * 0.5 + 0.5;
          r = 60 + lift * 70 + layer * 18 + noise * 10;
          g = 66 + lift * 66 + layer * 14 + noise * 10;
          b = 50 + lift * 40 + layer * 10 + noise * 8;
          const streakHash = Math.sin(Math.floor(x / 3) * 9.13) * 3117.7;
          if (streakHash - Math.floor(streakHash) > 0.7 && v > 0.62) {
            r = 54 + lift * 30;
            g = 120 + lift * 50;
            b = 52 + lift * 20;
          }
          const rootHash = Math.sin(Math.floor(x / 2) * 4.71 + 1.3) * 5113.3;
          if (rootHash - Math.floor(rootHash) > 0.9 && v > 0.6 + (x % 7) * 0.02) {
            r = 70;
            g = 48;
            b = 26;
          }
        }
        data[i] = Math.max(0, Math.min(255, Math.round(r)));
        data[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
        data[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
        data[i + 3] = 255;
      }
    }
    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(4, 1);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  /** Carved temple boulder skin: grey stone with moss on top and a carved jade-glyph band around the middle. */
  private getJungleBoulderTexture(): THREE.DataTexture {
    if (this.jungleBoulderTex) return this.jungleBoulderTex;
    const w = 64;
    const h = 32;
    const data = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++) {
      const v = (y + 0.5) / h;
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        const noise = hash - Math.floor(hash);
        const crack = Math.abs(Math.sin(x * 0.55 + y * 0.9) + Math.sin(x * 0.21 - y * 0.6)) < 0.08;
        let r = 132 + noise * 26;
        let g = 128 + noise * 24;
        let b = 112 + noise * 20;
        if (v > 0.68 && noise > 0.35) {
          r = 92 + noise * 20;
          g = 140 + noise * 24;
          b = 70 + noise * 12;
        }
        if (crack) {
          r = 70;
          g = 66;
          b = 58;
        }
        if (Math.abs(v - 0.5) < 0.09) {
          r = 78;
          g = 84;
          b = 70;
          if (x % 8 >= 2 && x % 8 <= 5 && Math.abs(v - 0.5) < 0.05) {
            r = 52;
            g = 210;
            b = 150;
          }
        }
        data[i] = Math.max(0, Math.min(255, Math.round(r)));
        data[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
        data[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
        data[i + 3] = 255;
      }
    }
    const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
    tex.wrapS = THREE.RepeatWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    this.jungleBoulderTex = tex;
    return tex;
  }

  /** A toy jade idol head (block face, gold eye inlays, a headdress with three spikes) facing +z. */
  private buildJadeIdolModel(
    mats: { jadeMat: THREE.Material; goldMat: THREE.Material; darkMat: THREE.Material },
    scale: number
  ): THREE.Group {
    const g = new THREE.Group();
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.15, 0.9), mats.jadeMat);
    head.position.y = 0.58;
    g.add(head);
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.13, 0.08), mats.goldMat);
      eye.position.set(side * 0.22, 0.74, 0.46);
      g.add(eye);
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.42, 0.3), mats.goldMat);
      ear.position.set(side * 0.56, 0.6, 0);
      g.add(ear);
    }
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.08), mats.darkMat);
    mouth.position.set(0, 0.36, 0.46);
    g.add(mouth);
    const crown = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.2, 1.02), mats.goldMat);
    crown.position.y = 1.22;
    g.add(crown);
    for (const cx of [-0.36, 0, 0.36]) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.42, 4), mats.jadeMat);
      spike.position.set(cx, 1.5, 0);
      g.add(spike);
    }
    g.scale.setScalar(scale);
    return g;
  }

  /** A toy jungle tree (thick trunk, three stacked leafy crowns). */
  private buildJungleTreeModel(trunkMat: THREE.Material, leafMat: THREE.Material, leafMat2: THREE.Material, scale: number): THREE.Group {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.7, 6, 9), trunkMat);
    trunk.position.y = 3;
    g.add(trunk);
    const crowns: Array<[number, number, number, number]> = [
      [0, 6.4, 0, 2.6],
      [-1.4, 5.6, 0.6, 1.8],
      [1.5, 5.8, -0.4, 1.9],
    ];
    crowns.forEach(([x, y, z, r], i) => {
      const crown = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), i === 0 ? leafMat : leafMat2);
      crown.scale.set(1, 0.72, 1);
      crown.position.set(x, y, z);
      g.add(crown);
    });
    g.scale.setScalar(scale);
    return g;
  }

  protected buildJungleSwing3D(level: LevelConfig): void {
    const course = level.jungleCourse || {
      length: 232,
      baseSpeed: 7.8,
      timeLimitSec: 41,
      startBobos: 16,
      maxBobos: 90,
      maxSteerX: 6.2,
      swingHeight: 1.9,
      hitSlowMult: 0.55,
      hitSlowSec: 0.8,
    };
    this.applyJungleSwingAmbience();
    const L = course.length;

    // 1. Mossy temple floor (flagstones + jade runner) across the deck; its texture scrolls toward the camera
    const floorTex = this.createJungleFloorTexture();
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      emissiveMap: floorTex,
      emissive: 0xffffff,
      emissiveIntensity: 0.2,
      roughness: 0.9,
      metalness: 0.02,
    });
    const floorPlane = new THREE.Mesh(new THREE.PlaneGeometry(TRACK_HALF_W * 2 + 0.6, SLED_SNOW_PLANE_LEN), floorMat);
    floorPlane.rotation.x = -Math.PI / 2;
    floorPlane.position.set(0, 0.03, 0.5);
    floorPlane.receiveShadow = true;
    this.levelGroup.add(floorPlane);

    // 2. Jungle backdrop: canopy hills, a stepped jade temple, a waterfall, giant trees & drifting fireflies
    const hillMat = new THREE.MeshLambertMaterial({ color: 0x2f8f57 });
    const hillMat2 = new THREE.MeshLambertMaterial({ color: 0x3fa66b });
    const farStoneMat = new THREE.MeshLambertMaterial({ color: 0x8f9c78, flatShading: true });
    const farMossMat = new THREE.MeshLambertMaterial({ color: 0x5f8f4f, flatShading: true });
    const farJadeMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
    const hills: Array<[number, number, number, number]> = [
      [-34, -60, 18, 8],
      [36, -64, 20, 9],
      [-14, -96, 26, 12],
      [22, -104, 30, 13],
      [-54, -82, 22, 10],
      [58, -86, 24, 10],
    ];
    hills.forEach(([hx, hz, hr, hh], i) => {
      const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), i % 2 === 0 ? hillMat : hillMat2);
      hill.scale.set(hr, hh, hr * 0.6);
      hill.position.set(hx, -4.2, hz);
      this.levelGroup.add(hill);
    });
    const temples: Array<[number, number, number]> = [
      [24, -112, 1.0],
      [-30, -126, 0.72],
    ];
    for (const [tx, tz, ts] of temples) {
      for (let i = 0; i < 5; i++) {
        const w = (26 - i * 5) * ts;
        const step = new THREE.Mesh(new THREE.BoxGeometry(w, 3.2 * ts, w), i % 2 === 0 ? farStoneMat : farMossMat);
        step.position.set(tx, -4 + (i + 0.5) * 3.2 * ts, tz);
        this.levelGroup.add(step);
      }
      const shrine = new THREE.Mesh(new THREE.BoxGeometry(5.4 * ts, 3.6 * ts, 5.4 * ts), farJadeMat);
      shrine.position.set(tx, -4 + 16 * ts + 1.8 * ts, tz);
      this.levelGroup.add(shrine);
      const stair = new THREE.Mesh(new THREE.BoxGeometry(3.4 * ts, 16 * ts, 1.2), farMossMat);
      stair.position.set(tx, -4 + 8 * ts, tz + 13 * ts - 3);
      stair.rotation.x = -0.62;
      this.levelGroup.add(stair);
    }
    const cliff = new THREE.Mesh(new THREE.BoxGeometry(12, 28, 6), new THREE.MeshLambertMaterial({ color: 0x5b6b4f, flatShading: true }));
    cliff.position.set(-44, 6, -78);
    this.levelGroup.add(cliff);
    const fall = new THREE.Mesh(
      new THREE.PlaneGeometry(5.2, 26),
      new THREE.MeshBasicMaterial({ color: 0xd9f6ff, transparent: true, opacity: 0.82, depthWrite: false })
    );
    fall.position.set(-42.6, 5.6, -74.9);
    this.levelGroup.add(fall);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 0.85 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x22a35a, emissive: 0x0b3d1f, emissiveIntensity: 0.25, roughness: 0.65 });
    const leafMat2 = new THREE.MeshStandardMaterial({ color: 0x4ade80, emissive: 0x14532d, emissiveIntensity: 0.2, roughness: 0.65 });
    for (const [tx, tz, ts] of [
      [-24, -40, 1.5],
      [26, -44, 1.6],
      [-40, -52, 1.9],
      [42, -54, 1.8],
    ] as const) {
      const tree = this.buildJungleTreeModel(trunkMat, leafMat, leafMat2, ts);
      tree.position.set(tx, -3.5, tz);
      this.levelGroup.add(tree);
    }
    const flyPos: number[] = [];
    const flyCol: number[] = [];
    const tint = new THREE.Color();
    for (let c = 0; c < 6; c++) {
      for (let i = 0; i < JG_FIREFLIES_PER_CELL; i++) {
        const h1 = Math.sin((i + 1) * 71.3 + c * 5.1) * 43758.5453;
        const h2 = Math.sin((i + 1) * 37.9 + 1.7 + c) * 24634.6345;
        const h3 = Math.sin((i + 1) * 17.7 + 4.3) * 15731.743;
        const f1 = h1 - Math.floor(h1);
        const f2 = h2 - Math.floor(h2);
        const f3 = h3 - Math.floor(h3);
        const side = f1 < 0.5 ? -1 : 1;
        flyPos.push(side * (12.8 + f3 * 20), 0.6 + f2 * 6.5, -150 + c * JG_FIREFLY_CELL + ((f1 * 2) % 1) * JG_FIREFLY_CELL);
        tint.setHSL(0.17 + f2 * 0.12, 0.85, 0.66 + f3 * 0.14);
        flyCol.push(tint.r, tint.g, tint.b);
      }
    }
    const flyGeo = new THREE.BufferGeometry();
    flyGeo.setAttribute('position', new THREE.Float32BufferAttribute(flyPos, 3));
    flyGeo.setAttribute('color', new THREE.Float32BufferAttribute(flyCol, 3));
    const fireflies = new THREE.Points(
      flyGeo,
      new THREE.PointsMaterial({ size: 0.32, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, sizeAttenuation: true })
    );
    fireflies.frustumCulled = false;
    this.levelGroup.add(fireflies);

    // 3. Course group: every course item sits at local z = -d; the group slides toward +z by the distance covered
    const courseGroup = new THREE.Group();
    courseGroup.position.z = SLED_Z;
    this.levelGroup.add(courseGroup);

    const mossStoneMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0x9aa680, emissive: 0x2a3418, emissiveIntensity: 0.2, roughness: 0.88 }),
      0.84
    );
    const darkStoneMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0x6b7656, emissive: 0x1f2812, emissiveIntensity: 0.18, roughness: 0.9 }),
      0.84
    );
    const mossMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0x4caf50, emissive: 0x14532d, emissiveIntensity: 0.3, roughness: 0.75 }),
      0.84
    );
    const jadeMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x065f46, emissiveIntensity: 0.4, roughness: 0.35 }),
      0.84
    );
    const goldMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0xf6c443, emissive: 0x6b4106, emissiveIntensity: 0.3, roughness: 0.3, metalness: 0.65 }),
      0.82
    );
    const barkMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0x8a5a32, emissive: 0x2a160a, emissiveIntensity: 0.2, roughness: 0.85 }),
      0.84
    );
    const vineMat = new THREE.MeshStandardMaterial({ color: 0x3f8f2a, emissive: 0x14390c, emissiveIntensity: 0.3, roughness: 0.7 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1f2a14, roughness: 0.7 });
    const idolKit = { jadeMat, goldMat, darkMat };

    // 4. Scrolling temple ruins (instanced treadmill shared with the sled course): mossy side walls with a jade glyph
    //    band and a moss cap, carved stone posts topped with leafy crowns, and ferns at the foot of the walls
    this.sledScenery = [];
    const addScenery = (inst: THREE.InstancedMesh, rows: number[][]): void => {
      const data = new Float32Array(rows.length * 6);
      rows.forEach((r, i) => data.set(r, i * 6));
      inst.count = rows.length;
      inst.frustumCulled = false;
      this.levelGroup.add(inst);
      this.sledScenery.push({ inst, data });
    };
    const wallX = TRACK_HALF_W + 0.8;
    const wallRows: number[][] = [];
    const bandRows: number[][] = [];
    const capRows: number[][] = [];
    for (let z0 = 0; z0 < SLED_SCENERY_SPAN - 0.01; z0 += 4) {
      for (const side of [-1, 1]) {
        wallRows.push([side * wallX, 1.0, z0, 1.0, 2.0, 4.02]);
        bandRows.push([side * (wallX - 0.52), 1.2, z0, 0.06, 0.36, 3.2]);
        capRows.push([side * wallX, 2.1, z0, 1.24, 0.26, 4.02]);
      }
    }
    addScenery(new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mossStoneMat, wallRows.length), wallRows);
    addScenery(new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), jadeMat, bandRows.length), bandRows);
    addScenery(new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mossMat, capRows.length), capRows);
    const postRows: number[][] = [];
    const crownRows: number[][] = [];
    for (let z0 = 3; z0 < SLED_SCENERY_SPAN - 0.01; z0 += 11) {
      for (const side of [-1, 1]) {
        postRows.push([side * (TRACK_HALF_W + 2.3), 2.2, z0 + side * 2.6, 1.0, 1.0, 1.0]);
        crownRows.push([side * (TRACK_HALF_W + 2.3), 5.0, z0 + side * 2.6, 1.0, 0.72, 1.0]);
      }
    }
    addScenery(new THREE.InstancedMesh(new THREE.CylinderGeometry(0.7, 0.95, 4.4, 8), barkMat, postRows.length), postRows);
    addScenery(new THREE.InstancedMesh(new THREE.SphereGeometry(1.7, 12, 9), leafMat, crownRows.length), crownRows);
    const fernRows: number[][] = [];
    for (let z0 = 1.6; z0 < SLED_SCENERY_SPAN - 0.01; z0 += 5.5) {
      for (const side of [-1, 1]) fernRows.push([side * (wallX - 0.85), 0.45, z0 + side * 1.4, 0.7, 0.9, 0.7]);
    }
    addScenery(new THREE.InstancedMesh(new THREE.ConeGeometry(0.7, 1, 6), leafMat2, fernRows.length), fernRows);
    this.updateSledScenery(0);

    // Giant palms just outside the ruins (static, they frame the far jungle)
    for (const [px, pz, sc] of [
      [-16.5, -14, 1.05],
      [16.8, -18, 1.2],
      [-17.5, -30, 1.3],
      [18.2, -34, 1.1],
    ] as const) {
      const palm = this.buildPalmModel(barkMat, leafMat, sc);
      palm.position.set(px, -0.2, pz);
      this.levelGroup.add(palm);
    }

    // 5. Temple gate (exit) at the finish line: twin mossy pillars, a lintel with a big jade idol, the badge cup
    const exit = new THREE.Group();
    exit.position.set(0, 0, -(L + 1.5));
    exit.userData.jgExitD = L + 1.5;
    for (const side of [-1, 1]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(3.0, 8.2, 3.0), mossStoneMat);
      pillar.position.set(side * 8.4, 4.1, 0);
      pillar.castShadow = true;
      exit.add(pillar);
      const band = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.55, 3.3), jadeMat);
      band.position.set(side * 8.4, 6.3, 0);
      exit.add(band);
      const moss = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.5, 3.4), mossMat);
      moss.position.set(side * 8.4, 8.4, 0);
      exit.add(moss);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(17.6, 1.4, 2.0), darkStoneMat);
    lintel.position.set(0, 7.1, 0);
    exit.add(lintel);
    const lintelBand = new THREE.Mesh(new THREE.BoxGeometry(17.8, 0.32, 2.1), goldMat);
    lintelBand.position.set(0, 7.9, 0);
    exit.add(lintelBand);
    const bigIdol = this.buildJadeIdolModel(idolKit, 2.2);
    bigIdol.position.set(0, 8.1, 0.2);
    bigIdol.userData.jgBob = true;
    exit.add(bigIdol);
    const cup = this.buildHallTrophyCupModel(3, 0x10b981);
    cup.scale.setScalar(1.05);
    cup.position.set(0, 13.4, 0);
    exit.add(cup);
    for (let i = 0; i < 4; i++) {
      const w = 30 - i * 6;
      const step = new THREE.Mesh(new THREE.BoxGeometry(w, 3.4, 10), i % 2 === 0 ? farStoneMat : farMossMat);
      step.position.set(0, 1.7 + i * 3.4, -12 - i * 2.2);
      exit.add(step);
    }
    const finishLine = new THREE.Mesh(
      new THREE.PlaneGeometry(18.6, 0.9),
      new THREE.MeshBasicMaterial({ color: 0xa7f3d0, transparent: true, opacity: 0.9, depthWrite: false })
    );
    finishLine.rotation.x = -Math.PI / 2;
    finishLine.position.set(0, 0.06, 1.5);
    exit.add(finishLine);
    courseGroup.add(exit);
    this.jungleExitGroup = exit;

    // 6. Unit gates (+N / ×N): mossy stone posts topped with little jade idols
    this.jungleGates = [];
    const gateH = 2.8;
    for (const cfg of level.jungleGates || []) {
      const group = new THREE.Group();
      group.position.set(cfg.x, 0, -cfg.d);
      for (const side of [-1, 1]) {
        const px = side * (cfg.width * 0.5 - 0.12);
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.42, gateH, 0.42), mossStoneMat);
        post.position.set(px, gateH * 0.5, 0);
        group.add(post);
        const idol = this.buildJadeIdolModel(idolKit, 0.42);
        idol.position.set(px, gateH, 0);
        group.add(idol);
      }
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, cfg.width - 0.2, 10), vineMat);
      bar.rotation.z = Math.PI / 2;
      bar.position.set(0, gateH + 0.02, 0);
      group.add(bar);
      const label = cfg.op === 'mul' ? `×${cfg.value}` : `+${cfg.value}`;
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
      courseGroup.add(group);
      this.jungleGates.push({ cfg, group, shieldMat, resolved: false, triggered: false });
    }

    // 7. Chasms: a misty drop with the opposite cliff face, mossy lips on both edges, a canopy log beam between two
    //    tree trunks and two swaying vines with glowing grab rings
    this.jungleChasms = [];
    const chasmTex = this.createJungleChasmTexture();
    const pitMat = new THREE.MeshBasicMaterial({ map: chasmTex, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const ropeGeo = new THREE.CylinderGeometry(0.07, 0.09, JG_VINE_LEN, 6);
    ropeGeo.translate(0, -JG_VINE_LEN / 2, 0);
    const leafGeo = new THREE.SphereGeometry(0.24, 8, 6);
    const ringGeo = new THREE.TorusGeometry(0.36, 0.08, 8, 18);
    const glow = this.getPumpkinGlowTexture();
    for (const cfg of level.jungleChasms || []) {
      const group = new THREE.Group();
      group.position.set(0, 0, -(cfg.d + cfg.gap / 2));
      const pit = new THREE.Mesh(new THREE.PlaneGeometry(TRACK_HALF_W * 2 + 0.6, cfg.gap), pitMat);
      pit.rotation.x = -Math.PI / 2;
      pit.position.y = 0.06;
      pit.renderOrder = 1;
      group.add(pit);
      for (const edge of [-1, 1]) {
        // edge -1 = near lip (course d), +1 = far lip (course d + gap)
        const lip = new THREE.Mesh(new THREE.BoxGeometry(TRACK_HALF_W * 2 + 0.4, 0.3, 0.55), mossStoneMat);
        lip.position.set(0, 0.12, -edge * (cfg.gap / 2 + 0.2));
        group.add(lip);
        const mossStrip = new THREE.Mesh(new THREE.BoxGeometry(TRACK_HALF_W * 2 + 0.5, 0.12, 0.32), mossMat);
        mossStrip.position.set(0, 0.3, -edge * (cfg.gap / 2 + 0.24));
        group.add(mossStrip);
      }
      const mistMat = new THREE.MeshBasicMaterial({
        map: glow,
        color: 0xd1fae5,
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
      });
      for (const mx of [-7.2, -2.4, 2.4, 7.2]) {
        const mist = new THREE.Mesh(new THREE.PlaneGeometry(4.6, cfg.gap * 0.9), mistMat);
        mist.rotation.x = -Math.PI / 2;
        mist.position.set(mx, 0.09, 0);
        mist.renderOrder = 2;
        group.add(mist);
      }
      // Canopy beam between two jungle trunks, with leaf clusters on top
      for (const side of [-1, 1]) {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.86, JG_BEAM_Y + 1.2, 9), barkMat);
        trunk.position.set(side * (TRACK_HALF_W + 1.0), (JG_BEAM_Y + 1.2) / 2, 0);
        group.add(trunk);
      }
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, (TRACK_HALF_W + 1.0) * 2, 10), barkMat);
      beam.rotation.z = Math.PI / 2;
      beam.position.set(0, JG_BEAM_Y, 0);
      group.add(beam);
      // Leaf tufts sit near the trunks (the middle of the beam stays thin so it hides little of the path behind it)
      for (const [lx, ls] of [
        [-TRACK_HALF_W + 0.4, 1.0],
        [-TRACK_HALF_W + 2.2, 0.7],
        [-1.2, 0.45],
        [1.6, 0.4],
        [TRACK_HALF_W - 2.2, 0.7],
        [TRACK_HALF_W - 0.4, 1.0],
      ] as const) {
        const cluster = new THREE.Mesh(new THREE.SphereGeometry(1.0, 10, 7), ls > 0.6 ? leafMat : leafMat2);
        cluster.scale.set(1.2 * ls, 0.6 * ls, 0.9 * ls);
        cluster.position.set(lx, JG_BEAM_Y + 0.35 * ls, 0);
        group.add(cluster);
      }
      const vines: JungleChasmRuntime['vines'] = [];
      for (const vc of cfg.vines) {
        const pivot = new THREE.Group();
        pivot.position.set(vc.x, JG_BEAM_Y, 0);
        const rope = new THREE.Mesh(ropeGeo, vineMat);
        pivot.add(rope);
        for (let li = 0; li < 6; li++) {
          const leaf = new THREE.Mesh(leafGeo, li % 2 === 0 ? leafMat : leafMat2);
          leaf.scale.set(1.4, 0.55, 0.9);
          leaf.position.set((li % 2 === 0 ? 1 : -1) * 0.16, -0.7 - li * 1.0, 0);
          leaf.rotation.z = (li % 2 === 0 ? -1 : 1) * 0.5;
          pivot.add(leaf);
        }
        const handleMat = new THREE.MeshStandardMaterial({
          color: 0xfacc15,
          emissive: 0x16a34a,
          emissiveIntensity: 0.6,
          roughness: 0.4,
          metalness: 0.3,
        });
        const ring = new THREE.Mesh(ringGeo, handleMat);
        ring.position.set(0, -JG_VINE_LEN - 0.3, 0);
        pivot.add(ring);
        group.add(pivot);
        vines.push({ cfg: vc, pivot, handleMat });
      }
      courseGroup.add(group);
      this.jungleChasms.push({
        cfg,
        group,
        vines,
        mistMat,
        locked: false,
        lockVine: -1,
        lockX: 0,
        lockClock: 0,
        leadGrabbed: false,
        resolved: new Set<number>(),
        riders: new Set<number>(),
        fell: 0,
        floated: 0,
        hitCounted: false,
        passed: false,
      });
    }

    // 8. Rolling boulders: a carved stone ball on a mossy ramp, with a warning lane painted down the path ahead of it
    this.jungleBoulders = [];
    const boulderMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        map: this.getJungleBoulderTexture(),
        color: 0xffffff,
        emissive: 0x1a1a10,
        emissiveIntensity: 0.25,
        roughness: 0.9,
      }),
      0.84
    );
    for (const cfg of level.jungleBoulders || []) {
      const ramp = new THREE.Group();
      ramp.position.set(cfg.x, 0, -(cfg.d + cfg.radius + 0.6));
      const wedge = new THREE.Mesh(new THREE.BoxGeometry(cfg.radius * 2.4, 1.0, 2.2), darkStoneMat);
      wedge.position.set(0, 0.3, 0);
      wedge.rotation.x = 0.28;
      ramp.add(wedge);
      const rampMoss = new THREE.Mesh(new THREE.BoxGeometry(cfg.radius * 2.5, 0.16, 0.8), mossMat);
      rampMoss.position.set(0, 0.84, -0.7);
      ramp.add(rampMoss);
      courseGroup.add(ramp);
      const rock = new THREE.Group();
      const ball = new THREE.Mesh(new THREE.SphereGeometry(cfg.radius, 18, 14), boulderMat);
      ball.castShadow = true;
      rock.add(ball);
      const band = new THREE.Mesh(new THREE.TorusGeometry(cfg.radius * 1.002, cfg.radius * 0.07, 6, 24), jadeMat);
      band.rotation.y = Math.PI / 2;
      rock.add(band);
      rock.position.set(cfg.x, cfg.radius, -cfg.d);
      courseGroup.add(rock);
      const laneMat = new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.0, depthWrite: false });
      const lane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), laneMat);
      lane.rotation.x = -Math.PI / 2;
      lane.position.set(cfg.x, 0.075, 0);
      lane.scale.set(cfg.radius * 2 + 0.5, 1, 1);
      lane.renderOrder = 2;
      lane.visible = false;
      this.levelGroup.add(lane);
      this.jungleBoulders.push({
        cfg,
        ramp,
        rock,
        lane,
        laneMat,
        state: 'resting',
        du: cfg.d,
        fallY: 0,
        spin: 0,
        knocked: 0,
        touched: new Set<number>(),
        hitCounted: false,
        warned: false,
        passed: false,
      });
    }

    const label = document.createElement('div');
    label.className = 'subtower-label jungle-swing-label';
    label.style.display = 'none';
    this.labelsContainer.appendChild(label);

    const ms = this.state.getEmeraldIdolMilestoneBonus();
    const timeLimit = course.timeLimitSec + ms.timeBonusSec;
    this.jungleRun = {
      active: true,
      tier: level.jungleTier || 1,
      courseGroup,
      floorTex,
      floorMat,
      chasmTex,
      fireflies,
      x: 0,
      distance: 0,
      courseLength: L,
      baseSpeed: course.baseSpeed,
      speed: 0,
      timeLeft: timeLimit,
      timeLimit,
      maxSteerX: course.maxSteerX,
      maxBobos: course.maxBobos,
      swingHeight: course.swingHeight,
      hitSlowMult: course.hitSlowMult,
      hitSlowSec: course.hitSlowSec,
      slowTimer: 0,
      clock: 0,
      swingFrac: 0,
      hitFlash: 0,
      sparkTimer: 0,
      state: 'running',
      labelEl: label,
      hist: new Float32Array(LAVA_HIST_LEN),
      histDist: 0,
      crowdX: 0,
      crowdHalfW: 0,
      crowdDepth: 0,
    };
    this.bossHp = 100;
    this.updateJungleVines(0);
  }

  // ============================================================================
  // MC-18: Pirate Plank Breakout (ship decks, open sea crossed on swaying planks, deck cannons, flagship ramp).
  // Runs on the MC-17 squad-run engine (jungleRun / jungleChasms / jungleBoulders); only the scene differs here.
  // ============================================================================

  /** Sunny open-sea tint on top of the emerald base theme (re-applied every load; applyTheme restores other modes). */
  private applyPirateAmbience(): void {
    this.scene.background = new THREE.Color(PR_SEA_SKY);
    this.scene.fog = new THREE.FogExp2(0xbde8fb, 0.0036);
    if (this.abyssShaderMat?.uniforms) {
      this.abyssShaderMat.uniforms.uBaseColor.value.set('#1f74b0');
      this.abyssShaderMat.uniforms.uVeinColor.value.set('#0c4a6e');
      this.abyssShaderMat.uniforms.uAccentColor.value.set('#bae6fd');
    }
    this.hemiLight.color.setHex(0xf0f9ff);
    this.hemiLight.groundColor.setHex(0x1e5f8a);
    this.dirLight.color.setHex(0xfff1d0);
    this.rimLight.color.setHex(0xfbbf24);
  }

  /** Procedural (non-canvas) ship deck: long staggered planks with dark seams and nail dots, a red runner, rope curbs. */
  private createPirateDeckTexture(): THREE.DataTexture {
    const size = 64;
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        const noise = hash - Math.floor(hash);
        const plank = Math.floor(x / 6);
        const endY = (plank * 23) % 32;
        const toneHash = Math.sin(plank * 7.31 + Math.floor((y + endY) / 32) * 3.77) * 9631.7;
        const tone = (toneHash - Math.floor(toneHash)) * 22;
        const grain = Math.sin(y * 0.9 + plank * 2.1) * 6;
        let r = 176 + tone + grain + noise * 8;
        let g = 120 + tone * 0.8 + grain * 0.7 + noise * 6;
        let b = 70 + tone * 0.5 + noise * 5;
        if (x % 6 === 0 || (y + endY) % 32 === 0) {
          r = 92;
          g = 58;
          b = 32;
        } else if ((x % 6 === 2 || x % 6 === 4) && ((y + endY) % 32 === 2 || (y + endY) % 32 === 29)) {
          r = 70;
          g = 64;
          b = 60;
        }
        if (x >= 26 && x <= 37) {
          r = 168 + noise * 12;
          g = 38 + noise * 8;
          b = 44 + noise * 8;
          if (x === 26 || x === 37) {
            r = 246;
            g = 200;
            b = 84;
          }
        }
        if (x <= 1 || x >= size - 2) {
          r = 214;
          g = 186;
          b = 128;
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
    tex.repeat.set(1, JG_FLOOR_REPEAT_V);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  /**
   * Procedural sea gap (looking down between two decks): the near half is deep blue water with foam crests, the far half
   * the next ship's hull planking with a gold trim line, so a gap reads as open water at a glance.
   */
  private createPirateSeaTexture(): THREE.DataTexture {
    const size = 64;
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
      const v = (y + 0.5) / size;
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        const noise = hash - Math.floor(hash);
        let r: number;
        let g: number;
        let b: number;
        if (v < 0.58) {
          const wave = Math.sin(x * 0.42 + y * 0.9) + Math.sin(x * 0.17 - y * 1.3) * 0.6;
          r = 18 + noise * 10 + wave * 5;
          g = 92 + noise * 14 + wave * 10;
          b = 158 + noise * 14 + wave * 10;
          if (wave > 1.18) {
            r = 214;
            g = 240;
            b = 252;
          }
        } else {
          const lift = (v - 0.58) / 0.42;
          const board = y % 5 === 0;
          r = board ? 74 : 120 + lift * 40 + noise * 10;
          g = board ? 44 : 76 + lift * 28 + noise * 8;
          b = board ? 24 : 42 + lift * 14 + noise * 6;
          if (v > 0.9) {
            r = 240;
            g = 192;
            b = 76;
          }
        }
        data[i] = Math.max(0, Math.min(255, Math.round(r)));
        data[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
        data[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
        data[i + 3] = 255;
      }
    }
    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(4, 1);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  /** A toy galleon (hull, gold trim, two masts with cream sails and a black flag) facing +z, for the far fleet. */
  private buildPirateGalleonModel(
    mats: { hullMat: THREE.Material; trimMat: THREE.Material; sailMat: THREE.Material; flagMat: THREE.Material; mastMat: THREE.Material },
    scale: number
  ): THREE.Group {
    const g = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.2, 14), mats.hullMat);
    hull.position.y = 1.1;
    g.add(hull);
    const bow = new THREE.Mesh(new THREE.ConeGeometry(2.6, 4.2, 4), mats.hullMat);
    bow.rotation.x = Math.PI / 2;
    bow.rotation.y = Math.PI / 4;
    bow.scale.set(1, 1, 0.6);
    bow.position.set(0, 1.4, 8.6);
    g.add(bow);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.32, 14.2), mats.trimMat);
    trim.position.y = 2.3;
    g.add(trim);
    for (const [mz, mh] of [
      [-2.6, 9.5],
      [3.0, 11],
    ] as const) {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, mh, 7), mats.mastMat);
      mast.position.set(0, 2.2 + mh / 2, mz);
      g.add(mast);
      const sail = new THREE.Mesh(new THREE.BoxGeometry(4.6, mh * 0.46, 0.18), mats.sailMat);
      sail.position.set(0, 2.2 + mh * 0.56, mz + 0.2);
      g.add(sail);
      const flag = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.9, 0.06), mats.flagMat);
      flag.position.set(0.8, 2.2 + mh + 0.4, mz);
      g.add(flag);
    }
    g.scale.setScalar(scale);
    return g;
  }

  protected buildPirateBoarding3D(level: LevelConfig): void {
    const course = level.jungleCourse || {
      length: 226,
      baseSpeed: 8.0,
      timeLimitSec: 40,
      startBobos: 16,
      maxBobos: 90,
      maxSteerX: 6.2,
      swingHeight: 1.7,
      hitSlowMult: 0.55,
      hitSlowSec: 0.8,
    };
    this.applyPirateAmbience();
    const L = course.length;

    // 1. Ship deck (planks + red runner) across the track; its texture scrolls toward the camera
    const floorTex = this.createPirateDeckTexture();
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      emissiveMap: floorTex,
      emissive: 0xffffff,
      emissiveIntensity: 0.18,
      roughness: 0.85,
      metalness: 0.02,
    });
    const floorPlane = new THREE.Mesh(new THREE.PlaneGeometry(TRACK_HALF_W * 2 + 0.6, SLED_SNOW_PLANE_LEN), floorMat);
    floorPlane.rotation.x = -Math.PI / 2;
    floorPlane.position.set(0, 0.03, 0.5);
    floorPlane.receiveShadow = true;
    this.levelGroup.add(floorPlane);

    const hullMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0x8b5a2b, emissive: 0x2a160a, emissiveIntensity: 0.22, roughness: 0.82 }),
      0.84
    );
    const darkWoodMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0x5b3a1e, emissive: 0x1c1008, emissiveIntensity: 0.2, roughness: 0.85 }),
      0.84
    );
    const goldMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0xf6c443, emissive: 0x6b4106, emissiveIntensity: 0.32, roughness: 0.3, metalness: 0.65 }),
      0.82
    );
    const redMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0xdc2626, emissive: 0x450a0a, emissiveIntensity: 0.25, roughness: 0.6 }),
      0.84
    );
    const ironMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0x334155, emissive: 0x0b1220, emissiveIntensity: 0.25, roughness: 0.45, metalness: 0.55 }),
      0.84
    );
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0xd6b37a, emissive: 0x3b2a10, emissiveIntensity: 0.25, roughness: 0.8 });
    const sailMat = new THREE.MeshStandardMaterial({ color: 0xfff7e6, emissive: 0x3a3020, emissiveIntensity: 0.2, roughness: 0.9 });
    const flagMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8 });
    const boneMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, emissive: 0x854d0e, emissiveIntensity: 0.45, roughness: 0.35, metalness: 0.5 });

    // 2. Open-sea backdrop: far galleons, a rocky palm island and white gull / spray specks drifting by
    const fleetKit = { hullMat, trimMat: goldMat, sailMat, flagMat, mastMat: darkWoodMat };
    for (const [gx, gz, gs, gr] of [
      [-36, -72, 1.25, 0.5],
      [40, -92, 1.4, -0.4],
      [-8, -128, 1.7, 0.15],
      [64, -60, 1.0, -0.9],
    ] as const) {
      const ship = this.buildPirateGalleonModel(fleetKit, gs);
      ship.position.set(gx, -3.4, gz);
      ship.rotation.y = gr;
      this.levelGroup.add(ship);
    }
    const sandMat = new THREE.MeshLambertMaterial({ color: 0xf1d79b });
    const rockMat = new THREE.MeshLambertMaterial({ color: 0x7c8b8f, flatShading: true });
    const island = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), sandMat);
    island.scale.set(16, 4, 10);
    island.position.set(-48, -4.2, -104);
    this.levelGroup.add(island);
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(6, 0), rockMat);
    rock.position.set(-54, -0.5, -108);
    this.levelGroup.add(rock);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x22a35a, emissive: 0x0b3d1f, emissiveIntensity: 0.25, roughness: 0.65 });
    for (const [px, pz, ps] of [
      [-44, -100, 1.6],
      [-40, -106, 1.3],
    ] as const) {
      const palm = this.buildPalmModel(darkWoodMat, leafMat, ps);
      palm.position.set(px, -0.6, pz);
      this.levelGroup.add(palm);
    }
    const flyPos: number[] = [];
    const flyCol: number[] = [];
    const tint = new THREE.Color();
    for (let c = 0; c < 6; c++) {
      for (let i = 0; i < JG_FIREFLIES_PER_CELL; i++) {
        const h1 = Math.sin((i + 1) * 71.3 + c * 5.1) * 43758.5453;
        const h2 = Math.sin((i + 1) * 37.9 + 1.7 + c) * 24634.6345;
        const h3 = Math.sin((i + 1) * 17.7 + 4.3) * 15731.743;
        const f1 = h1 - Math.floor(h1);
        const f2 = h2 - Math.floor(h2);
        const f3 = h3 - Math.floor(h3);
        const side = f1 < 0.5 ? -1 : 1;
        flyPos.push(side * (12.8 + f3 * 20), 0.4 + f2 * 6.0, -150 + c * JG_FIREFLY_CELL + ((f1 * 2) % 1) * JG_FIREFLY_CELL);
        tint.setHSL(0.55 + f2 * 0.05, 0.6, 0.86 + f3 * 0.1);
        flyCol.push(tint.r, tint.g, tint.b);
      }
    }
    const flyGeo = new THREE.BufferGeometry();
    flyGeo.setAttribute('position', new THREE.Float32BufferAttribute(flyPos, 3));
    flyGeo.setAttribute('color', new THREE.Float32BufferAttribute(flyCol, 3));
    const sprays = new THREE.Points(
      flyGeo,
      new THREE.PointsMaterial({ size: 0.3, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, sizeAttenuation: true })
    );
    sprays.frustumCulled = false;
    this.levelGroup.add(sprays);

    // 3. Course group: every course item sits at local z = -d; the group slides toward +z by the distance covered
    const courseGroup = new THREE.Group();
    courseGroup.position.z = SLED_Z;
    this.levelGroup.add(courseGroup);

    // 4. Scrolling ship sides (instanced treadmill shared with the sled course): hull rails with a red stripe and a gold
    //    cap, masts with furled cream sails, and barrels at the foot of the rails
    this.sledScenery = [];
    const addScenery = (inst: THREE.InstancedMesh, rows: number[][]): void => {
      const data = new Float32Array(rows.length * 6);
      rows.forEach((r, i) => data.set(r, i * 6));
      inst.count = rows.length;
      inst.frustumCulled = false;
      this.levelGroup.add(inst);
      this.sledScenery.push({ inst, data });
    };
    const wallX = TRACK_HALF_W + 0.8;
    const wallRows: number[][] = [];
    const bandRows: number[][] = [];
    const capRows: number[][] = [];
    for (let z0 = 0; z0 < SLED_SCENERY_SPAN - 0.01; z0 += 4) {
      for (const side of [-1, 1]) {
        wallRows.push([side * wallX, 0.8, z0, 1.0, 1.6, 4.02]);
        bandRows.push([side * (wallX - 0.52), 0.95, z0, 0.06, 0.32, 3.4]);
        capRows.push([side * wallX, 1.68, z0, 1.24, 0.2, 4.02]);
      }
    }
    addScenery(new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), hullMat, wallRows.length), wallRows);
    addScenery(new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), redMat, bandRows.length), bandRows);
    addScenery(new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), goldMat, capRows.length), capRows);
    const mastRows: number[][] = [];
    const sailRows: number[][] = [];
    for (let z0 = 3; z0 < SLED_SCENERY_SPAN - 0.01; z0 += 11) {
      for (const side of [-1, 1]) {
        mastRows.push([side * (TRACK_HALF_W + 2.3), 4.0, z0 + side * 2.6, 1.0, 1.0, 1.0]);
        sailRows.push([side * (TRACK_HALF_W + 2.3), 5.4, z0 + side * 2.6, 0.22, 3.0, 2.8]);
      }
    }
    addScenery(new THREE.InstancedMesh(new THREE.CylinderGeometry(0.26, 0.34, 8.0, 8), darkWoodMat, mastRows.length), mastRows);
    addScenery(new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), sailMat, sailRows.length), sailRows);
    const barrelRows: number[][] = [];
    for (let z0 = 1.6; z0 < SLED_SCENERY_SPAN - 0.01; z0 += 5.5) {
      for (const side of [-1, 1]) barrelRows.push([side * (wallX - 0.95), 0.45, z0 + side * 1.4, 1.0, 1.0, 1.0]);
    }
    addScenery(new THREE.InstancedMesh(new THREE.CylinderGeometry(0.42, 0.42, 0.9, 10), hullMat, barrelRows.length), barrelRows);
    this.updateSledScenery(0);

    // 5. Flagship (exit) at the finish line: a tall hull across the deck with gun ports, a boarding ramp, two masts with
    //    sails, the gold skull emblem on the bow and the badge cup above it
    const exit = new THREE.Group();
    exit.position.set(0, 0, -(L + 1.5));
    exit.userData.jgExitD = L + 1.5;
    const hull = new THREE.Mesh(new THREE.BoxGeometry(24, 6.4, 8), hullMat);
    hull.position.set(0, 3.2, -6);
    hull.castShadow = true;
    exit.add(hull);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(24.2, 0.5, 8.1), goldMat);
    stripe.position.set(0, 6.2, -6);
    exit.add(stripe);
    const redBand = new THREE.Mesh(new THREE.BoxGeometry(24.2, 0.7, 8.1), redMat);
    redBand.position.set(0, 2.2, -6);
    exit.add(redBand);
    for (const px of [-9, -5.4, 5.4, 9]) {
      const port = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 0.2), flagMat);
      port.position.set(px, 3.9, -1.95);
      exit.add(port);
      const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 1.2, 8), ironMat);
      gun.rotation.x = Math.PI / 2;
      gun.position.set(px, 3.9, -1.5);
      exit.add(gun);
    }
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.4, 7.4), darkWoodMat);
    ramp.position.set(0, 3.0, -0.2);
    ramp.rotation.x = 0.82;
    exit.add(ramp);
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 7.6, 6), ropeMat);
      rail.rotation.x = 0.82 + Math.PI / 2;
      rail.position.set(side * 3.9, 3.9, -0.2);
      exit.add(rail);
    }
    for (const [mx, mh] of [
      [-6, 14],
      [6, 12],
    ] as const) {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, mh, 8), darkWoodMat);
      mast.position.set(mx, 6.4 + mh / 2, -6);
      exit.add(mast);
      const sail = new THREE.Mesh(new THREE.BoxGeometry(8, mh * 0.5, 0.2), sailMat);
      sail.position.set(mx, 6.4 + mh * 0.58, -5.6);
      exit.add(sail);
      const flag = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.6, 0.08), flagMat);
      flag.position.set(mx + 1.4, 6.4 + mh + 0.7, -6);
      exit.add(flag);
    }
    // Gold skull emblem (bobs): a dome skull with dark eye sockets over two crossed bones
    const skull = new THREE.Group();
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.1, 16, 12), boneMat);
    dome.scale.set(1, 0.95, 0.9);
    skull.add(dome);
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 0.8), boneMat);
    jaw.position.set(0, -0.85, 0.15);
    skull.add(jaw);
    for (const ex of [-0.38, 0.38]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), flagMat);
      eye.position.set(ex, 0.02, 0.86);
      skull.add(eye);
    }
    for (const rz of [0.75, -0.75]) {
      const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 3.4, 8), boneMat);
      bone.rotation.z = rz;
      bone.position.set(0, -0.3, -0.35);
      skull.add(bone);
    }
    skull.position.set(0, 8.1, -1.6);
    skull.userData.jgBob = true;
    exit.add(skull);
    const cup = this.buildHallTrophyCupModel(3, 0xfacc15);
    cup.scale.setScalar(1.05);
    cup.position.set(0, 12.6, -2.4);
    exit.add(cup);
    const finishLine = new THREE.Mesh(
      new THREE.PlaneGeometry(18.6, 0.9),
      new THREE.MeshBasicMaterial({ color: 0xfde68a, transparent: true, opacity: 0.9, depthWrite: false })
    );
    finishLine.rotation.x = -Math.PI / 2;
    finishLine.position.set(0, 0.06, 1.5);
    exit.add(finishLine);
    courseGroup.add(exit);
    this.jungleExitGroup = exit;

    // 6. Unit gates (+N / ×N): stacked barrel posts with a gold skull knob and a rope bar
    this.jungleGates = [];
    const gateH = 2.8;
    const barrelGeo = new THREE.CylinderGeometry(0.34, 0.34, gateH, 10);
    const knobGeo = new THREE.SphereGeometry(0.3, 10, 8);
    for (const cfg of level.jungleGates || []) {
      const group = new THREE.Group();
      group.position.set(cfg.x, 0, -cfg.d);
      for (const side of [-1, 1]) {
        const px = side * (cfg.width * 0.5 - 0.12);
        const post = new THREE.Mesh(barrelGeo, hullMat);
        post.position.set(px, gateH * 0.5, 0);
        group.add(post);
        const knob = new THREE.Mesh(knobGeo, boneMat);
        knob.position.set(px, gateH + 0.22, 0);
        group.add(knob);
      }
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, cfg.width - 0.2, 8), ropeMat);
      bar.rotation.z = Math.PI / 2;
      bar.position.set(0, gateH + 0.02, 0);
      group.add(bar);
      const label = cfg.op === 'mul' ? `×${cfg.value}` : `+${cfg.value}`;
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
      courseGroup.add(group);
      this.jungleGates.push({ cfg, group, shieldMat, resolved: false, triggered: false });
    }

    // 7. Sea gaps: open water between two decks with deck lips on both edges, a yardarm between two masts and two
    //    swaying planks hung on ropes (a held plank glows gold)
    this.jungleChasms = [];
    const chasmTex = this.createPirateSeaTexture();
    const pitMat = new THREE.MeshBasicMaterial({ map: chasmTex, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const ropeGeo = new THREE.CylinderGeometry(0.05, 0.05, JG_VINE_LEN, 6);
    ropeGeo.translate(0, -JG_VINE_LEN / 2, 0);
    const plankGeo = new THREE.BoxGeometry(1.9, 0.18, 1.0);
    const glow = this.getPumpkinGlowTexture();
    for (const cfg of level.jungleChasms || []) {
      const group = new THREE.Group();
      group.position.set(0, 0, -(cfg.d + cfg.gap / 2));
      const pit = new THREE.Mesh(new THREE.PlaneGeometry(TRACK_HALF_W * 2 + 0.6, cfg.gap), pitMat);
      pit.rotation.x = -Math.PI / 2;
      pit.position.y = 0.06;
      pit.renderOrder = 1;
      group.add(pit);
      for (const edge of [-1, 1]) {
        const lip = new THREE.Mesh(new THREE.BoxGeometry(TRACK_HALF_W * 2 + 0.4, 0.3, 0.55), darkWoodMat);
        lip.position.set(0, 0.12, -edge * (cfg.gap / 2 + 0.2));
        group.add(lip);
        const trim = new THREE.Mesh(new THREE.BoxGeometry(TRACK_HALF_W * 2 + 0.5, 0.1, 0.24), goldMat);
        trim.position.set(0, 0.3, -edge * (cfg.gap / 2 + 0.24));
        group.add(trim);
      }
      const mistMat = new THREE.MeshBasicMaterial({
        map: glow,
        color: 0xe0f2fe,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
      });
      for (const mx of [-7.2, -2.4, 2.4, 7.2]) {
        const foam = new THREE.Mesh(new THREE.PlaneGeometry(4.6, cfg.gap * 0.9), mistMat);
        foam.rotation.x = -Math.PI / 2;
        foam.position.set(mx, 0.09, 0);
        foam.renderOrder = 2;
        group.add(foam);
      }
      for (const side of [-1, 1]) {
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.5, JG_BEAM_Y + 1.6, 8), darkWoodMat);
        mast.position.set(side * (TRACK_HALF_W + 1.0), (JG_BEAM_Y + 1.6) / 2, 0);
        group.add(mast);
      }
      const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, (TRACK_HALF_W + 1.0) * 2, 10), darkWoodMat);
      yard.rotation.z = Math.PI / 2;
      yard.position.set(0, JG_BEAM_Y, 0);
      group.add(yard);
      const vines: JungleChasmRuntime['vines'] = [];
      for (const vc of cfg.vines) {
        const pivot = new THREE.Group();
        pivot.position.set(vc.x, JG_BEAM_Y, 0);
        for (const rx of [-0.8, 0.8]) {
          const rope = new THREE.Mesh(ropeGeo, ropeMat);
          rope.position.x = rx;
          pivot.add(rope);
        }
        const handleMat = new THREE.MeshStandardMaterial({
          color: 0xc08a4a,
          emissive: 0xf59e0b,
          emissiveIntensity: 0.6,
          roughness: 0.6,
          metalness: 0.1,
        });
        const plank = new THREE.Mesh(plankGeo, handleMat);
        plank.position.set(0, -JG_VINE_LEN - 0.1, 0);
        pivot.add(plank);
        group.add(pivot);
        vines.push({ cfg: vc, pivot, handleMat });
      }
      courseGroup.add(group);
      this.jungleChasms.push({
        cfg,
        group,
        vines,
        mistMat,
        locked: false,
        lockVine: -1,
        lockX: 0,
        lockClock: 0,
        leadGrabbed: false,
        resolved: new Set<number>(),
        riders: new Set<number>(),
        fell: 0,
        floated: 0,
        hitCounted: false,
        passed: false,
      });
    }

    // 8. Deck cannons: a carriage with an iron barrel aimed down its lane and a black cannonball (lit fuse) in front of it
    this.jungleBoulders = [];
    const ballMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0x1f2937, emissive: 0x0b0f17, emissiveIntensity: 0.3, roughness: 0.35, metalness: 0.6 }),
      0.84
    );
    const fuseMat = new THREE.MeshBasicMaterial({ color: 0xfb923c });
    for (const cfg of level.jungleBoulders || []) {
      const cannon = new THREE.Group();
      cannon.position.set(cfg.x, 0, -(cfg.d + cfg.radius + 0.9));
      const carriage = new THREE.Mesh(new THREE.BoxGeometry(cfg.radius * 2.2, 0.7, 2.0), darkWoodMat);
      carriage.position.set(0, 0.35, 0);
      cannon.add(carriage);
      for (const side of [-1, 1]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.22, 12), hullMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(side * (cfg.radius * 1.1 + 0.1), 0.42, 0.5);
        cannon.add(wheel);
      }
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(cfg.radius * 0.62, cfg.radius * 0.78, 2.6, 14), ironMat);
      barrel.rotation.x = Math.PI / 2 - 0.12;
      barrel.position.set(0, 0.9 + cfg.radius * 0.4, 0.2);
      cannon.add(barrel);
      const muzzle = new THREE.Mesh(new THREE.TorusGeometry(cfg.radius * 0.66, 0.1, 6, 16), goldMat);
      muzzle.position.set(0, 0.95 + cfg.radius * 0.4, 1.45);
      cannon.add(muzzle);
      courseGroup.add(cannon);
      const ballGroup = new THREE.Group();
      const ball = new THREE.Mesh(new THREE.SphereGeometry(cfg.radius, 18, 14), ballMat);
      ball.castShadow = true;
      ballGroup.add(ball);
      const band = new THREE.Mesh(new THREE.TorusGeometry(cfg.radius * 1.002, cfg.radius * 0.05, 6, 24), goldMat);
      band.rotation.y = Math.PI / 2;
      ballGroup.add(band);
      const fuse = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.12, cfg.radius * 0.16), 8, 6), fuseMat);
      fuse.position.set(0, cfg.radius * 1.02, 0);
      ballGroup.add(fuse);
      ballGroup.position.set(cfg.x, cfg.radius, -cfg.d);
      courseGroup.add(ballGroup);
      const laneMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.0, depthWrite: false });
      const lane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), laneMat);
      lane.rotation.x = -Math.PI / 2;
      lane.position.set(cfg.x, 0.075, 0);
      lane.scale.set(cfg.radius * 2 + 0.5, 1, 1);
      lane.renderOrder = 2;
      lane.visible = false;
      this.levelGroup.add(lane);
      this.jungleBoulders.push({
        cfg,
        ramp: cannon,
        rock: ballGroup,
        lane,
        laneMat,
        state: 'resting',
        du: cfg.d,
        fallY: 0,
        spin: 0,
        knocked: 0,
        touched: new Set<number>(),
        hitCounted: false,
        warned: false,
        passed: false,
      });
    }

    const label = document.createElement('div');
    label.className = 'subtower-label jungle-swing-label pirate-boarding-label';
    label.style.display = 'none';
    this.labelsContainer.appendChild(label);

    const ms = this.state.getGoldSkullMilestoneBonus();
    const timeLimit = course.timeLimitSec + ms.timeBonusSec;
    this.jungleRun = {
      active: true,
      tier: level.pirateTier || level.jungleTier || 1,
      courseGroup,
      floorTex,
      floorMat,
      chasmTex,
      fireflies: sprays,
      x: 0,
      distance: 0,
      courseLength: L,
      baseSpeed: course.baseSpeed,
      speed: 0,
      timeLeft: timeLimit,
      timeLimit,
      maxSteerX: course.maxSteerX,
      maxBobos: course.maxBobos,
      swingHeight: course.swingHeight,
      hitSlowMult: course.hitSlowMult,
      hitSlowSec: course.hitSlowSec,
      slowTimer: 0,
      clock: 0,
      swingFrac: 0,
      hitFlash: 0,
      sparkTimer: 0,
      state: 'running',
      labelEl: label,
      hist: new Float32Array(LAVA_HIST_LEN),
      histDist: 0,
      crowdX: 0,
      crowdHalfW: 0,
      crowdDepth: 0,
    };
    this.bossHp = 100;
    this.updateJungleVines(0);
  }

  /** Spawns the starting Bobo squad at the temple steps (start Bobos + 翡翠神像徽章 milestone bonus). */
  protected spawnStartingJungleBobos(level: LevelConfig): number {
    const course = level.jungleCourse;
    const bonus = level.isPirateBoarding
      ? this.state.getGoldSkullMilestoneBonus().startBonusBobos
      : this.state.getEmeraldIdolMilestoneBonus().startBonusBobos;
    const n = Math.max(1, Math.min(course?.maxBobos ?? 90, (course?.startBobos ?? 16) + bonus));
    let spawned = 0;
    for (let k = 0; k < n; k++) {
      const slot = this.getLavaSlot(k, n, 0);
      const u = this.spawnUnit('blue', 'normal', slot.x, slot.z, 0, 0);
      if (u) {
        u.spawnHop = 0;
        u.rideY = JG_RIDE_BASE;
        u.sledSlotX = slot.x;
        u.sledSlotZ = slot.z;
        spawned++;
      }
    }
    this.junglePeakBobos = spawned;
    this.jungleBoboCount = spawned;
    return spawned;
  }

  public getJungleProgressPct(): number {
    const s = this.jungleRun;
    if (!s) return 0;
    return Math.max(0, Math.min(100, Math.round((s.distance / Math.max(1, s.courseLength)) * 100)));
  }

  /** Gate rows the squad front has reached, and the total number of gate rows. */
  public getJungleGateProgress(): { reached: number; total: number } {
    const ds = new Set<number>();
    const reached = new Set<number>();
    for (const g of this.jungleGates) {
      ds.add(g.cfg.d);
      if (g.resolved) reached.add(g.cfg.d);
    }
    return { reached: reached.size, total: ds.size };
  }

  /** Traps (chasms + boulders) the whole squad is past, and the total. */
  public getJungleTrapProgress(): { passed: number; total: number } {
    let passed = 0;
    for (const c of this.jungleChasms) if (c.passed) passed++;
    for (const b of this.jungleBoulders) if (b.passed) passed++;
    return { passed, total: this.jungleChasms.length + this.jungleBoulders.length };
  }

  public getJungleStateLabel(): string {
    const s = this.jungleRun;
    if (!s) return '尚未出发';
    if (this.currentLevel?.isPirateBoarding) {
      switch (s.state) {
        case 'stumbled':
          return '炮弹轰中';
        case 'swinging':
          return '踩跳板过海';
        case 'finished':
          return '冲上旗舰';
        case 'timeout':
          return '超时困在船上';
        case 'wiped':
          return '波波全部落水';
        default:
          return '甲板疾行中';
      }
    }
    switch (s.state) {
      case 'stumbled':
        return '滚石踉跄';
      case 'swinging':
        return '荡藤蔓过崖';
      case 'finished':
        return '冲出神庙';
      case 'timeout':
        return '超时困在神庙';
      case 'wiped':
        return '波波全部失散';
      default:
        return '神庙疾行中';
    }
  }

  /** Grab point x of a vine at run clock `clock` (it sways sideways around its beam anchor). */
  public getJungleVineX(v: JungleVineConfig, clock: number): number {
    const P = Math.max(0.1, v.period);
    return v.x + v.amp * Math.sin(((clock + v.offset) / P) * Math.PI * 2);
  }

  /** Re-seats every Bobo on its formation slot behind the current line (self-checks). */
  public snapJungleBobosToSlots(): void {
    const s = this.jungleRun;
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
      u.rideY = JG_RIDE_BASE;
    }
  }

  /**
   * Seats freshly added Bobos (gate / tactic reinforcements) straight onto their own formation slot behind the line
   * they joined (no random scatter), so they meet the next chasm edge exactly where their row runs.
   */
  protected seatJungleReinforcements(fresh: Set<number>): void {
    const s = this.jungleRun;
    if (!s || fresh.size === 0) return;
    const n = this.getLavaBoboCount();
    const cols = this.getLavaSquadCols(n);
    let k = 0;
    for (let i = 0; i < MAX_UNITS; i++) {
      const u = this.units[i];
      if (!u.active || u.team !== 'blue') continue;
      const myK = k++;
      if (!fresh.has(u.id)) continue;
      const formRow = Math.floor(myK / cols);
      const pathX =
        formRow === 0 ? s.x : s.hist[Math.min(s.hist.length - 1, Math.round((formRow * LAVA_ROW_SPACING) / LAVA_HIST_STEP))];
      const slot = this.getLavaSlot(myK, n, pathX);
      const x = THREE.MathUtils.clamp(slot.x, -TRACK_HALF_W + 0.9, TRACK_HALF_W - 0.9);
      u.x = x;
      u.z = slot.z;
      u.vx = 0;
      u.vz = 0;
      u.sledSlotX = x;
      u.sledSlotZ = slot.z;
      u.rideY = JG_RIDE_BASE;
    }
  }

  /** A trap hit (fall into a chasm / flattened by a boulder): a candy (frost / pet) shell absorbs it. True if lost. */
  protected knockJungleBobo(u: Unit, silent = false): boolean {
    if (!u.active || u.team !== 'blue') return false;
    if (u.frostShield) {
      u.frostShield = false;
      u.petShellGranted = false;
      this.jungleShieldSaves += 1;
      if (!silent) this.spawnBurstParticles(u.x, 0.9 + (u.rideY || 0), u.z, 0x7dd3fc, 4);
      return false;
    }
    u.active = false;
    this.jungleBobosLost += 1;
    if (!silent) {
      this.spawnBurstParticles(u.x, 0.7 + (u.rideY || 0), u.z, 0x4ade80, 5);
      this.spawnBurstParticles(u.x, 1.1 + (u.rideY || 0), u.z, 0x6b7656, 3);
    }
    return true;
  }

  private applyJungleGate(g: JungleGateRuntime, silent = false): number {
    const s = this.jungleRun;
    if (!s) return 0;
    g.triggered = true;
    g.shieldMat.opacity = 0.35;
    const bobos = this.getLavaBoboCount();
    const want = g.cfg.op === 'mul' ? bobos * (Math.max(1, g.cfg.value) - 1) : g.cfg.value;
    const room = Math.max(0, s.maxBobos - bobos);
    const n = Math.max(0, Math.min(room, Math.floor(want)));
    let added = 0;
    const fresh = new Set<number>();
    for (let k = 0; k < n; k++) {
      const u = this.spawnUnit('blue', k % 6 === 0 ? 'charged' : 'normal', s.x, SLED_Z, 0, 0);
      if (u) {
        u.spawnHop = 0.6;
        u.rideY = JG_RIDE_BASE;
        fresh.add(u.id);
        added++;
      }
    }
    this.seatJungleReinforcements(fresh);
    this.jungleGatesPassed += 1;
    this.junglePeakBobos = Math.max(this.junglePeakBobos, bobos + added);
    if (!silent) {
      sound.playCloneGate(g.cfg.op === 'mul' ? 3 : 2);
      this.spawnBurstParticles(s.x, 1.8, SLED_Z - 1.2, g.cfg.op === 'mul' ? 0xfacc15 : 0x6ee7b7, 22);
      this.spawnShockwave(s.x, SLED_Z - 0.8, g.cfg.op === 'mul' ? 0xfacc15 : 0x34d399, 4.0, 0.35);
      this.spawnFloatingPopup(
        s.x,
        3.2,
        SLED_Z - 1.0,
        added < n || n < want ? `+${added} 波波 (满员)` : `+${added} 波波加入!`,
        g.cfg.op === 'mul' ? '#fde047' : '#a7f3d0'
      );
    }
    return added;
  }

  private jungleStumble(cause: string, silent = false): void {
    const s = this.jungleRun;
    if (!s) return;
    s.slowTimer = Math.max(s.slowTimer, s.hitSlowSec);
    s.hitFlash = 1.0;
    if (!silent) {
      this.addCameraShake(0.28);
      this.spawnFloatingPopup(s.x, 3.6, SLED_Z - 1.0, cause, '#fecaca');
    }
  }

  /**
   * The squad front reached a chasm edge: the vine nearest to the squad line is grabbed and stops swaying (locked at
   * its current x). `leadGrabbed` tells whether the squad line itself was within the vine's reach.
   */
  private lockJungleChasm(c: JungleChasmRuntime, silent = false): void {
    const s = this.jungleRun;
    if (!s || c.locked) return;
    let best = 0;
    let bestDx = Infinity;
    let bestX = 0;
    c.vines.forEach((v, i) => {
      const vx = this.getJungleVineX(v.cfg, s.clock);
      const dx = Math.abs(vx - s.x);
      if (dx < bestDx) {
        bestDx = dx;
        best = i;
        bestX = vx;
      }
    });
    c.locked = true;
    c.lockVine = best;
    c.lockX = bestX;
    c.lockClock = s.clock;
    c.leadGrabbed = bestDx <= c.cfg.reach;
    if (c.leadGrabbed) this.jungleVineSwings += 1;
    if (!silent) {
      const pirate = Boolean(this.currentLevel?.isPirateBoarding);
      if (c.leadGrabbed) {
        this.spawnShockwave(bestX, SLED_Z - 1.0, pirate ? 0xfacc15 : 0x4ade80, 3.4, 0.32);
        this.spawnFloatingPopup(
          THREE.MathUtils.clamp(bestX, -2.5, 2.5),
          3.6,
          SLED_Z - 1.2,
          pirate ? '踩上跳板! 荡过海面' : '抓住藤蔓! 荡过断崖',
          pirate ? '#fef08a' : '#bbf7d0'
        );
      } else {
        this.spawnFloatingPopup(
          THREE.MathUtils.clamp(s.x, -2.5, 2.5),
          3.6,
          SLED_Z - 1.2,
          pirate ? '没对准跳板! 要落水了' : '没对准藤蔓! 要坠崖了',
          '#fecaca'
        );
      }
    }
  }

  /** Animates every vine from the run clock: free vines sway sideways; a grabbed vine swings the squad along the course. */
  protected updateJungleVines(dt: number): void {
    const s = this.jungleRun;
    const clock = s ? s.clock : 0;
    const frontDu = s ? s.distance + JG_FRONT_OFFSET : 0;
    const t = this.elapsedTime;
    for (const c of this.jungleChasms) {
      if (!c.group.visible && dt > 0) continue;
      const mid = c.cfg.d + c.cfg.gap / 2;
      c.mistMat.opacity = 0.28 + Math.sin(t * 1.6 + c.cfg.d) * 0.06;
      for (let i = 0; i < c.vines.length; i++) {
        const v = c.vines[i];
        const held = c.locked && i === c.lockVine && !c.passed && frontDu <= c.cfg.d + c.cfg.gap + 2.5;
        const gx = held ? c.lockX : this.getJungleVineX(v.cfg, clock);
        const off = THREE.MathUtils.clamp((gx - v.cfg.x) / JG_VINE_LEN, -0.95, 0.95);
        v.pivot.rotation.z = Math.asin(off);
        const swing = held ? THREE.MathUtils.clamp((frontDu - mid) / JG_VINE_LEN, -0.8, 0.8) : Math.sin(t * 1.3 + i) * 0.05;
        v.pivot.rotation.x = held ? Math.asin(swing) : THREE.MathUtils.lerp(v.pivot.rotation.x, swing, dt > 0 ? Math.min(1, dt * 4) : 1);
        v.handleMat.emissiveIntensity = held ? 1.4 : 0.55 + Math.sin(t * 4 + i * 1.7) * 0.25;
      }
    }
  }

  /**
   * Autopilot target x (self-checks / screenshots / demo): picks bigger gates, lines the squad up under the vine that
   * will be nearest when the front reaches each chasm edge (predicted from the run clock), and stays out of the lanes of
   * boulders that are about to roll through the squad, peeking two events ahead.
   */
  public getJungleAutopilotX(): number {
    const s = this.jungleRun;
    if (!s) return 0;
    const n = this.jungleBoboCount || this.getLavaBoboCount();
    const half = this.getLavaSquadHalfWidth(n);
    const frontDu = s.distance + JG_FRONT_OFFSET;
    const pace = Math.max(2, s.speed || s.baseSpeed);
    type Ev = { d: number; score: (x: number) => number };
    const evs: Ev[] = [];
    const gateDs = new Map<number, JungleGateRuntime[]>();
    for (const g of this.jungleGates) {
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
            const v = Math.min(s.maxBobos - n, g.cfg.op === 'mul' ? n * (g.cfg.value - 1) : g.cfg.value) * 2;
            best = Math.max(best, v - Math.abs(x - g.cfg.x) * 1.5);
          }
          return best;
        },
      });
    });
    for (const c of this.jungleChasms) {
      if (c.passed || frontDu > c.cfg.d + c.cfg.gap + 0.3 || c.cfg.d > frontDu + 40) continue;
      if (c.locked) {
        // Keep the line under the grabbed vine until the tail is across
        evs.push({
          d: c.cfg.d,
          score: (x: number) => {
            const inner = Math.max(0, c.cfg.reach - half - 0.2);
            const off = Math.abs(x - c.lockX);
            return off <= inner ? 6 : -220 - (off - inner) * 60;
          },
        });
        continue;
      }
      const tEdge = s.clock + Math.max(0, (c.cfg.d - frontDu) / pace);
      const vxs = c.vines.map((v) => this.getJungleVineX(v.cfg, tEdge));
      evs.push({
        d: c.cfg.d,
        score: (x: number) => {
          // The vine nearest to x is the one that gets grabbed: it must also cover the whole squad width
          let near = vxs[0];
          for (const vx of vxs) if (Math.abs(vx - x) < Math.abs(near - x)) near = vx;
          const inner = Math.max(0, c.cfg.reach - half - 0.25);
          const off = Math.abs(x - near);
          return off <= inner ? 6 - off : -260 - (off - inner) * 60;
        },
      });
    }
    for (const b of this.jungleBoulders) {
      if (b.passed || b.state === 'gone' || b.state === 'falling') continue;
      // Where the boulder will meet the squad front (resting boulders wake once the front is `wakeD` away)
      let meetD: number;
      if (b.state === 'rolling') {
        const tm = Math.max(0, (b.du - frontDu) / (pace + b.cfg.speed));
        meetD = frontDu + pace * tm;
      } else {
        const tWake = Math.max(0, (b.cfg.d - b.cfg.wakeD - frontDu) / pace);
        const gapAtWake = Math.min(b.cfg.wakeD, b.cfg.d - frontDu);
        meetD = frontDu + pace * (tWake + Math.max(0, gapAtWake) / (pace + b.cfg.speed));
      }
      if (meetD > frontDu + 40) continue;
      // It drops into a chasm on its way to the squad: nothing to dodge
      if (this.jungleChasms.some((c) => c.cfg.d + c.cfg.gap <= b.du && c.cfg.d + c.cfg.gap > meetD)) continue;
      evs.push({
        d: Math.max(frontDu, meetD),
        score: (x: number) => {
          const reach = b.cfg.radius + half + 0.5;
          const dx = Math.abs(x - b.cfg.x);
          return dx < reach ? -300 - (reach - dx) * 80 : 0;
        },
      });
    }
    if (evs.length === 0) return s.x;
    evs.sort((a, b) => a.d - b.d);
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

  protected updateJungleSwing(dt: number): void {
    const s = this.jungleRun;
    const level = this.currentLevel;
    if (!s || !s.active || !level) return;
    const t = this.elapsedTime;
    const pirate = Boolean(level.isPirateBoarding);

    // 1. Steering (the squad follows the cannon's lateral aim) & pace
    s.clock += dt;
    const steerX = THREE.MathUtils.clamp(this.turretX, -s.maxSteerX, s.maxSteerX);
    s.x = THREE.MathUtils.lerp(s.x, steerX, Math.min(1, dt * 6.0));
    let target = s.baseSpeed * this.getTacticRushMult();
    if (s.slowTimer > 0) {
      s.slowTimer = Math.max(0, s.slowTimer - dt);
      target *= s.hitSlowMult;
    }
    s.speed = THREE.MathUtils.lerp(s.speed, target, Math.min(1, dt * (target > s.speed ? 2.2 : 5.0)));
    s.distance = Math.min(s.courseLength, s.distance + s.speed * dt);
    s.timeLeft = Math.max(0, s.timeLeft - dt);
    s.hitFlash = Math.max(0, s.hitFlash - dt * 2);
    this.bossHp = Math.max(0, 100 - this.getJungleProgressPct());

    // 2. Scroll the temple path toward the camera, drift the fireflies & the treadmill ruins
    s.courseGroup.position.z = SLED_Z + s.distance;
    if (s.floorTex) s.floorTex.offset.y = (s.distance / JG_FLOOR_TILE_M) % 1;
    s.fireflies.position.z = (s.distance * 0.3) % JG_FIREFLY_CELL;
    s.fireflies.position.y = Math.sin(t * 0.8) * 0.3;
    this.updateSledScenery(s.distance);
    if (this.jungleExitGroup) {
      const ed = (this.jungleExitGroup.userData.jgExitD as number) || s.courseLength;
      this.jungleExitGroup.visible = SLED_Z + s.distance - ed > -SLED_DECK_HALF - 30;
      for (const c of this.jungleExitGroup.children) if (c.userData.jgBob) c.position.y = 8.1 + Math.sin(t * 2.0) * 0.22;
    }
    s.sparkTimer -= dt;
    if (s.sparkTimer <= 0) {
      s.sparkTimer = 0.16;
      const side = Math.random() < 0.5 ? -1 : 1;
      this.spawnBurstParticles(
        side * (TRACK_HALF_W + 0.9),
        2.6 + Math.random() * 0.6,
        SLED_Z - 16 + Math.random() * 26,
        pirate ? (Math.random() < 0.5 ? 0xe0f2fe : 0x7dd3fc) : Math.random() < 0.5 ? 0x4ade80 : 0xbef264,
        1
      );
    }

    // 3. Chasm edges: when the squad front reaches an edge, the nearest vine is grabbed (locked at its current x)
    const frontDu = s.distance + JG_FRONT_OFFSET;
    const nNow = this.getLavaBoboCount();
    const halfNow = this.getLavaSquadHalfWidth(nNow);
    let leadX = s.x;
    for (const c of this.jungleChasms) {
      const nearZ = SLED_Z + s.distance - c.cfg.d;
      const farZ = nearZ - c.cfg.gap;
      c.group.visible = nearZ > -SLED_DECK_HALF - 8 && farZ < SLED_DECK_HALF + 3;
      if (!c.locked && frontDu >= c.cfg.d) this.lockJungleChasm(c);
      // While the front is over a grabbed vine's chasm the line hangs on that vine (it converges under it)
      if (c.locked && c.leadGrabbed && !c.passed && frontDu >= c.cfg.d - 0.05 && frontDu <= c.cfg.d + c.cfg.gap + 0.3) {
        const avail = Math.max(0, c.cfg.reach - halfNow - 0.15);
        leadX = THREE.MathUtils.clamp(s.x, c.lockX - avail, c.lockX + avail);
      }
    }

    // 4. Squad formation: the lead line is recorded along the course and every row follows that exact path a little
    //    later. A Bobo reaching a chasm edge swings across on the grabbed vine if it is within its reach, otherwise it
    //    falls (capped per chasm; a candy shield floats it across instead). Riders arc over the gap.
    const n = nNow;
    const cols = this.getLavaSquadCols(n);
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
    let xSum = 0;
    let airborne = 0;
    let trailEndZ = SLED_Z;
    const pin = Math.min(1, dt * 10);
    const hop = Math.min(1, s.speed / Math.max(1, s.baseSpeed));
    for (let i = 0; i < MAX_UNITS; i++) {
      const u = this.units[i];
      if (!u.active || u.team !== 'blue') continue;
      const formRow = Math.floor(k / cols);
      const pathX =
        formRow === 0 ? leadX : s.hist[Math.min(s.hist.length - 1, Math.round((formRow * LAVA_ROW_SPACING) / LAVA_HIST_STEP))];
      const slot = this.getLavaSlot(k, n, pathX);
      let slotX = THREE.MathUtils.clamp(slot.x, -TRACK_HALF_W + 0.9, TRACK_HALF_W - 0.9);
      u.x = THREE.MathUtils.lerp(u.x, slotX, pin);
      u.z = THREE.MathUtils.lerp(u.z, slot.z, pin);
      const du = s.distance + (SLED_Z - u.z);
      let air = 0;
      let lost = false;
      for (const c of this.jungleChasms) {
        if (c.passed || du < c.cfg.d || du > c.cfg.d + c.cfg.gap + 0.4) continue;
        if (!c.locked) this.lockJungleChasm(c);
        if (!c.resolved.has(u.id)) {
          c.resolved.add(u.id);
          if (Math.abs(u.x - c.lockX) <= c.cfg.reach) {
            c.riders.add(u.id);
          } else if (c.fell < c.cfg.knockCap) {
            if (this.knockJungleBobo(u)) {
              c.fell += 1;
              this.jungleChasmFell += 1;
              lost = true;
              break;
            }
            c.floated += 1;
            c.riders.add(u.id);
          } else {
            c.riders.add(u.id);
          }
        }
        if (du <= c.cfg.d + c.cfg.gap) {
          const ph = THREE.MathUtils.clamp((du - c.cfg.d) / Math.max(0.5, c.cfg.gap), 0, 1);
          air = Math.sin(ph * Math.PI) * s.swingHeight;
          // Hanging Bobos are drawn in under the vine they hold
          slotX = THREE.MathUtils.clamp(slotX, c.lockX - c.cfg.reach, c.lockX + c.cfg.reach);
          u.x = THREE.MathUtils.lerp(u.x, slotX, pin * 0.5);
        }
        break;
      }
      if (lost) continue;
      u.sledSlotX = slotX;
      u.sledSlotZ = slot.z;
      if (air > 0.02) airborne++;
      u.rideY = air > 0 ? JG_RIDE_BASE + air : JG_RIDE_BASE + 0.1 * hop * Math.abs(Math.sin(t * 8.0 + k * 0.9));
      xSum += u.x;
      trailEndZ = Math.max(trailEndZ, u.z);
      k++;
    }
    const alive = k;
    this.jungleBoboCount = alive;
    s.swingFrac = alive > 0 ? airborne / alive : 0;
    s.crowdX = alive > 0 ? xSum / alive : s.x;
    s.crowdHalfW = this.getLavaSquadHalfWidth(Math.max(1, alive));
    s.crowdDepth = Math.max(0.6, Math.ceil(Math.max(1, alive) / cols) * LAVA_ROW_SPACING);
    s.state = s.slowTimer > 0 ? 'stumbled' : s.swingFrac >= 0.2 ? 'swinging' : 'running';

    // 5. Gates: when the squad front reaches a gate row, the gate under the squad centre triggers (pair resolves)
    for (const g of this.jungleGates) {
      const wz = SLED_Z + s.distance - g.cfg.d;
      g.group.visible = wz > -SLED_DECK_HALF - 8 && wz < SLED_DECK_HALF + 3;
      if (g.resolved || frontDu < g.cfg.d) continue;
      for (const g2 of this.jungleGates) {
        if (g2.resolved || g2.cfg.d !== g.cfg.d) continue;
        g2.resolved = true;
        if (Math.abs(s.x - g2.cfg.x) <= g2.cfg.width * 0.5) this.applyJungleGate(g2);
        else g2.shieldMat.opacity = 0.5;
      }
    }

    // 6. Chasms: animate the vines; a chasm is passed once the whole squad is beyond its far edge
    this.updateJungleVines(dt);
    for (const c of this.jungleChasms) {
      if (c.passed) continue;
      if (c.fell > 0 && !c.hitCounted) {
        c.hitCounted = true;
        this.jungleChasmHits += 1;
      }
      const farZ = SLED_Z + s.distance - (c.cfg.d + c.cfg.gap);
      if (c.locked && farZ > trailEndZ + 0.6) {
        c.passed = true;
        if (c.fell === 0) this.jungleTrapsDodged += 1;
        else this.spawnFloatingPopup(c.lockX, 2.4, Math.min(16, SLED_Z + 4), `${pirate ? '落水' : '坠崖'} -${c.fell} 波波`, '#fecaca');
      }
    }

    // 7. Boulders: wake up when the squad front comes close, roll down their lane toward the squad and flatten the
    //    Bobos in it (capped per boulder, shields absorb); a boulder is dodged once it has rolled past the whole squad
    const tailDu = s.distance + (SLED_Z - trailEndZ);
    const courseZ = SLED_Z + s.distance;
    for (const b of this.jungleBoulders) {
      if (b.state === 'gone') continue;
      const rampWz = courseZ - b.cfg.d;
      b.ramp.visible = rampWz > -SLED_DECK_HALF - 8 && rampWz < SLED_DECK_HALF + 4;
      if (b.state === 'resting' && frontDu >= b.cfg.d - b.cfg.wakeD) {
        b.state = 'rolling';
        if (!b.warned) {
          b.warned = true;
          this.spawnFloatingPopup(
            THREE.MathUtils.clamp(b.cfg.x, -2.5, 2.5),
            3.2,
            Math.max(-SLED_DECK_HALF + 2, courseZ - b.du + 2),
            pirate ? '炮弹来袭! 快闪开' : '滚石来袭! 快闪开',
            '#fed7aa'
          );
          if (pirate) this.spawnBurstParticles(b.cfg.x, 1.4, Math.max(-SLED_DECK_HALF + 2, courseZ - b.du), 0xfdba74, 10);
        }
      }
      if (b.state === 'rolling') {
        b.du -= b.cfg.speed * dt;
        b.spin += ((b.cfg.speed + s.speed) * dt) / Math.max(0.3, b.cfg.radius);
        // A boulder that rolls onto a chasm drops into it (it never rolls across a gap)
        for (const c of this.jungleChasms) {
          if (b.du < c.cfg.d + c.cfg.gap - b.cfg.radius * 0.4 && b.du > c.cfg.d) {
            b.state = 'falling';
            break;
          }
        }
      } else if (b.state === 'falling') {
        b.fallY -= (4 + -b.fallY * 6) * dt;
        b.du -= b.cfg.speed * 0.3 * dt;
        b.spin += (b.cfg.speed * dt) / Math.max(0.3, b.cfg.radius);
        if (!b.passed) {
          // It never reached the squad: nothing to dodge any more
          b.passed = true;
          if (b.knocked === 0) this.jungleTrapsDodged += 1;
        }
        if (b.fallY < -(b.cfg.radius * 2 + 4)) b.state = 'gone';
      }
      const wz = courseZ - b.du;
      b.rock.position.set(
        b.cfg.x,
        b.cfg.radius + b.fallY + (b.state === 'resting' ? Math.abs(Math.sin(t * 3 + b.cfg.d)) * 0.03 : 0),
        -b.du
      );
      b.rock.rotation.x = b.spin;
      b.rock.visible = b.state !== 'gone' && wz > -SLED_DECK_HALF - 10 && wz < SLED_DECK_HALF + 6;
      // Warning lane from the rolling boulder down to the squad front (it stops at a chasm lip in between, where the
      // boulder will drop)
      let laneTo = SLED_Z - JG_FRONT_OFFSET + 1.5;
      for (const c of this.jungleChasms) {
        if (c.cfg.d < b.du && c.cfg.d >= frontDu - 0.5) laneTo = Math.min(laneTo, courseZ - (c.cfg.d + c.cfg.gap));
      }
      const laneFrom = Math.max(-SLED_DECK_HALF - 6, wz);
      const laneLen = laneTo - laneFrom;
      b.lane.visible = b.state === 'rolling' && b.rock.visible && !b.passed && laneLen > 0.5;
      if (b.lane.visible) {
        b.lane.position.set(b.cfg.x, 0.1, laneFrom + laneLen / 2);
        b.lane.scale.set(b.cfg.radius * 2 + 0.5, laneLen, 1);
        b.laneMat.opacity = 0.36 + Math.sin(t * 12) * 0.12;
      }
      if (b.state === 'rolling' && !b.passed) {
        for (let i = 0; i < MAX_UNITS && b.knocked < b.cfg.knockCap; i++) {
          const u = this.units[i];
          if (!u.active || u.team !== 'blue' || b.touched.has(u.id)) continue;
          const uDu = s.distance + (SLED_Z - u.z);
          if (Math.abs(uDu - b.du) > b.cfg.radius * 0.85) continue;
          if (Math.abs(u.x - b.cfg.x) > b.cfg.radius + 0.15) continue;
          b.touched.add(u.id);
          if (this.knockJungleBobo(u)) {
            b.knocked += 1;
            this.jungleBoulderFlattened += 1;
            this.spawnBurstParticles(u.x, 1.2, u.z, 0xd6d3d1, 3);
          }
        }
        if (b.knocked > 0 && !b.hitCounted) {
          b.hitCounted = true;
          this.jungleBoulderHits += 1;
          this.jungleStumble(pirate ? '炮弹轰飞波波!' : '滚石压扁波波!');
        }
        if (b.du < tailDu - b.cfg.radius - 0.5) {
          b.passed = true;
          if (b.knocked === 0) this.jungleTrapsDodged += 1;
          else
            this.spawnFloatingPopup(
              THREE.MathUtils.clamp(b.cfg.x, -2.5, 2.5),
              2.4,
              Math.min(16, SLED_Z + 4),
              `${pirate ? '炮弹轰飞' : '滚石压扁'} -${b.knocked} 波波`,
              '#fecaca'
            );
        }
      }
      if (b.state === 'rolling' && b.passed && wz > SLED_DECK_HALF + 6) {
        b.state = 'gone';
        b.rock.visible = false;
      }
      if (b.state === 'gone') b.lane.visible = false;
    }

    // 8. Resolution: run out of the temple gate = victory; countdown out or every Bobo lost = defeat
    const aliveNow = this.getLavaBoboCount();
    this.jungleBoboCount = aliveNow;
    if (s.distance >= s.courseLength - 0.001 && aliveNow > 0) {
      s.active = false;
      s.state = 'finished';
      s.labelEl.style.display = 'none';
      for (const b of this.jungleBoulders) b.lane.visible = false;
      this.jungleFinishSec = Number((s.timeLimit - s.timeLeft).toFixed(2));
      this.bossHp = 0;
      this.spawnSkyPillar(s.x, SLED_Z - 2, pirate ? 0xfacc15 : 0x10b981, 3.6, 0.7);
      this.spawnShockwave(s.x, SLED_Z, pirate ? 0xfef08a : 0xa7f3d0, 11.0, 0.7);
      this.spawnBurstParticles(s.x, 2.2, SLED_Z - 1, pirate ? 0xfacc15 : 0x4ade80, 60);
      this.finishStage(true);
      this.onBanner?.(
        pirate ? `${UI_ART.pirateBoarding} 波波团冲上海盗旗舰！` : `${UI_ART.jungleSwing} 波波团冲出丛林神庙！`,
        `用时 ${this.jungleFinishSec.toFixed(1)}s / 限时 ${s.timeLimit}s · 幸存波波 ${aliveNow} 只 · 机关全身而过 ${this.jungleTrapsDodged} 处`
      );
      return;
    }
    if (s.timeLeft <= 0 || aliveNow <= 0) {
      s.active = false;
      s.state = aliveNow <= 0 ? 'wiped' : 'timeout';
      s.labelEl.style.display = 'none';
      for (const b of this.jungleBoulders) b.lane.visible = false;
      this.jungleFinishSec = Number((s.timeLimit - s.timeLeft).toFixed(2));
      this.spawnBurstParticles(s.x, 1.4, SLED_Z, pirate ? 0x7dd3fc : 0x4ade80, 40);
      this.onBanner?.(
        `${UI_ART.warning} ${
          pirate
            ? s.state === 'wiped'
              ? '波波全部落水'
              : '超时没冲上旗舰'
            : s.state === 'wiped'
              ? '波波全被机关困住'
              : '超时困在神庙里'
        }！`,
        `前进 ${Math.round(s.distance)}/${s.courseLength}m · 已损失 ${this.jungleBobosLost} 只波波`
      );
      this.finishStage(false);
    }
  }
}
