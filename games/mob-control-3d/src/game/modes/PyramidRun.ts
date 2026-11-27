/** MC-16 沙漠金字塔机关跑酷：从 World3D 原样搬出的方法（字段仍在 World3D）。继承链见 ../World3DFull.ts。 */
import * as THREE from 'three';
import {
  LevelConfig,
  PyramidSlabConfig,
  PyramidSlabRowConfig,
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
  PY_FRONT_OFFSET,
  PY_RIDE_BASE,
  PY_FLOOR_REPEAT_V,
  PY_FLOOR_TILE_M,
  PY_DUST_CELL,
  PY_DUST_PER_CELL,
  PY_DESERT_SKY,
} from '../world/CourseConstants';
import {
  stylizeMaterialAs2DIllustration,
} from '../SceneThemes';
import {
  PyramidGateRuntime,
  PyramidSandRuntime,
  PyramidSlabRowRuntime,
  PyramidSlabStateId,
  MAX_UNITS,
  SLED_Z,
  TRACK_HALF_W,
  Unit,
} from '../WorldTypes';
import { PumpkinNightMode } from './PumpkinNight';

export abstract class PyramidRunMode extends PumpkinNightMode {
  /** Sunset desert tint on top of the gear-town base theme (re-applied every load; applyTheme restores other modes). */
  private applyPyramidRunAmbience(): void {
    this.scene.background = new THREE.Color(PY_DESERT_SKY);
    this.scene.fog = new THREE.FogExp2(0xf6cf94, 0.0036);
    if (this.abyssShaderMat?.uniforms) {
      this.abyssShaderMat.uniforms.uBaseColor.value.set('#e2a556');
      this.abyssShaderMat.uniforms.uVeinColor.value.set('#c2410c');
      this.abyssShaderMat.uniforms.uAccentColor.value.set('#fde047');
    }
    this.hemiLight.color.setHex(0xfff3dc);
    this.hemiLight.groundColor.setHex(0xb7791f);
    this.dirLight.color.setHex(0xffe2b0);
    this.rimLight.color.setHex(0xf59e0b);
  }

  /** Pins the sun sprite to the upper-right sky of the current view (it never drifts off-screen with the squad cam). */
  private placePyramidSun(sun: THREE.Object3D): void {
    const aspect = window.innerWidth / Math.max(1, window.innerHeight);
    const v = this.pySunDir.set(aspect < 1 ? 0.5 : 0.62, aspect < 1 ? 0.52 : 0.6, 0.5).unproject(this.camera);
    v.sub(this.camera.position).normalize();
    sun.position.copy(this.camera.position).addScaledVector(v, 70);
  }

  /** Procedural (non-canvas) tomb floor: staggered sandstone blocks, a turquoise & gold runner with glyph dashes. */
  private createPyramidFloorTexture(): THREE.DataTexture {
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
        let r = 214 + tone + noise * 8;
        let g = 168 + tone * 0.8 + noise * 7;
        let b = 104 + tone * 0.5 + noise * 6;
        if (y % 8 === 0 || sx % 10 === 0) {
          r = 158;
          g = 112;
          b = 62;
        }
        if (x >= 23 && x <= 40) {
          r = 46 + noise * 10;
          g = 150 + noise * 10;
          b = 150 + noise * 10;
          if (x === 23 || x === 40 || x === 25 || x === 38) {
            r = 240;
            g = 190;
            b = 70;
          } else if ((x === 31 || x === 32) && y % 16 < 6) {
            r = 252;
            g = 214;
            b = 110;
          } else if ((x === 28 || x === 35) && y % 16 >= 9 && y % 16 < 12) {
            r = 250;
            g = 236;
            b = 196;
          }
        }
        if (x <= 1 || x >= size - 2) {
          r = 196;
          g = 120;
          b = 48;
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
    tex.repeat.set(1, PY_FLOOR_REPEAT_V);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  /**
   * Procedural quicksand: one dark sinking whirl per tile (spiral ridges darkening into a deep centre) over wet
   * brown sand, clearly darker than the sandstone floor so belts read at a glance (the texture drifts while it churns).
   */
  private createQuicksandTexture(): THREE.DataTexture {
    const size = 64;
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const dx = (x + 0.5) / size - 0.5;
        const dy = (y + 0.5) / size - 0.5;
        const rr = Math.sqrt(dx * dx + dy * dy);
        const ang = Math.atan2(dy, dx);
        const ridge = Math.pow(Math.sin(rr * 40 - ang * 2) * 0.5 + 0.5, 2.2);
        const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        const noise = hash - Math.floor(hash);
        const deep = Math.max(0, 1 - rr * 2.6);
        const r = 122 + ridge * 62 - deep * 70 + noise * 10;
        const g = 76 + ridge * 40 - deep * 48 + noise * 7;
        const b = 30 + ridge * 16 - deep * 20 + noise * 5;
        data[i] = Math.max(0, Math.min(255, Math.round(r)));
        data[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
        data[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
        data[i + 3] = 255;
      }
    }
    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 1.4);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  /** A warm low sun with a soft corona (sprite texture). */
  private getPyramidSunTexture(): THREE.DataTexture {
    if (this.pyramidSunTex) return this.pyramidSunTex;
    const size = 128;
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const dx = ((x + 0.5) / size) * 2 - 1;
        const dy = ((y + 0.5) / size) * 2 - 1;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d <= 0.46) {
          const shade = 1.0 - d * 0.25;
          data[i] = 255;
          data[i + 1] = Math.round(236 * shade);
          data[i + 2] = Math.round(160 * shade);
          data[i + 3] = 255;
        } else {
          const a = Math.pow(Math.max(0, 1 - (d - 0.46) / 0.54), 2.0) * 0.6;
          data[i] = 255;
          data[i + 1] = 214;
          data[i + 2] = 128;
          data[i + 3] = Math.round(a * 255);
        }
      }
    }
    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    this.pyramidSunTex = tex;
    return tex;
  }

  /** A toy golden scarab (domed shell split into two turquoise wing cases, head, six legs) facing +z. */
  private buildScarabModel(
    mats: { goldMat: THREE.Material; shellMat: THREE.Material; darkMat: THREE.Material },
    scale: number
  ): THREE.Group {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 18, 12), mats.goldMat);
    body.scale.set(0.82, 0.5, 1.0);
    g.add(body);
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 10), mats.shellMat);
      wing.scale.set(0.62, 0.42, 1.0);
      wing.position.set(side * 0.19, 0.12, -0.08);
      g.add(wing);
      for (let li = 0; li < 3; li++) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.42, 5), mats.darkMat);
        leg.rotation.z = side * (Math.PI / 2 - 0.5);
        leg.rotation.y = (li - 1) * 0.45 * side;
        leg.position.set(side * 0.46, -0.08, 0.22 - li * 0.24);
        g.add(leg);
      }
    }
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), mats.goldMat);
    head.scale.set(1.2, 0.7, 0.9);
    head.position.set(0, 0.02, 0.5);
    g.add(head);
    for (const side of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 6), mats.goldMat);
      horn.position.set(side * 0.1, 0.06, 0.66);
      horn.rotation.x = Math.PI / 2;
      g.add(horn);
    }
    g.scale.setScalar(scale);
    return g;
  }

  /** A toy palm tree (segmented trunk, drooping fronds). */
  protected buildPalmModel(trunkMat: THREE.Material, leafMat: THREE.Material, scale: number): THREE.Group {
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.22 - i * 0.03, 0.27 - i * 0.03, 1.2, 8), trunkMat);
      seg.position.set(i * 0.12, 0.6 + i * 1.12, 0);
      seg.rotation.z = -0.08 * i;
      g.add(seg);
    }
    for (let f = 0; f < 6; f++) {
      const a = (f / 6) * Math.PI * 2;
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.34, 2.4, 4), leafMat);
      leaf.scale.set(1, 1, 0.3);
      leaf.position.set(0.4 + Math.cos(a) * 0.9, 4.65, Math.sin(a) * 0.9);
      leaf.rotation.set(Math.sin(a) * 1.15, 0, -Math.cos(a) * 1.15);
      g.add(leaf);
    }
    g.scale.setScalar(scale);
    return g;
  }

  protected buildPyramidRun3D(level: LevelConfig): void {
    const course = level.pyramidCourse || {
      length: 234,
      baseSpeed: 7.8,
      timeLimitSec: 41,
      startBobos: 16,
      maxBobos: 90,
      maxSteerX: 7.4,
      sandSlowMult: 0.5,
      sinkSec: 1.6,
      hitSlowMult: 0.55,
      hitSlowSec: 0.8,
    };
    this.applyPyramidRunAmbience();
    const L = course.length;

    // 1. Sandstone tomb floor (blocks + turquoise runner) across the deck; its texture scrolls toward the camera
    const floorTex = this.createPyramidFloorTexture();
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      emissiveMap: floorTex,
      emissive: 0xffffff,
      emissiveIntensity: 0.22,
      roughness: 0.86,
      metalness: 0.02,
    });
    const floorPlane = new THREE.Mesh(new THREE.PlaneGeometry(TRACK_HALF_W * 2 + 0.6, SLED_SNOW_PLANE_LEN), floorMat);
    floorPlane.rotation.x = -Math.PI / 2;
    floorPlane.position.set(0, 0.03, 0.5);
    floorPlane.receiveShadow = true;
    this.levelGroup.add(floorPlane);

    // 2. Desert sky dressing: a low sun, distant pyramids with golden capstones, dunes, obelisks & drifting sand dust
    const sun = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: this.getPyramidSunTexture(), transparent: true, depthWrite: false, fog: false })
    );
    sun.scale.setScalar(13);
    sun.renderOrder = -1;
    this.levelGroup.add(sun);
    this.placePyramidSun(sun);
    const farStoneMat = new THREE.MeshLambertMaterial({ color: 0xe0a95c, flatShading: true });
    const farShadeMat = new THREE.MeshLambertMaterial({ color: 0xc98a45, flatShading: true });
    const capMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
    const duneMat = new THREE.MeshLambertMaterial({ color: 0xf0c27a });
    const farPyramids: Array<[number, number, number]> = [
      [-34, -78, 22],
      [-12, -112, 34],
      [22, -96, 28],
      [44, -70, 18],
    ];
    for (const [px, pz, ph] of farPyramids) {
      const pyr = new THREE.Mesh(new THREE.ConeGeometry(ph * 0.92, ph, 4), pz < -100 ? farShadeMat : farStoneMat);
      pyr.position.set(px, ph / 2 - 6, pz);
      pyr.rotation.y = Math.PI / 4;
      this.levelGroup.add(pyr);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(ph * 0.12, ph * 0.13, 4), capMat);
      cap.position.set(px, ph - 6 - ph * 0.06, pz);
      cap.rotation.y = Math.PI / 4;
      this.levelGroup.add(cap);
    }
    const dunes: Array<[number, number, number, number]> = [
      [-30, -40, 14, 3.2],
      [30, -46, 16, 3.6],
      [-48, -60, 18, 4.4],
      [52, -58, 20, 4.8],
      [-22, -68, 12, 2.6],
      [18, -64, 11, 2.4],
    ];
    for (const [dx, dz, dr, dh] of dunes) {
      const dune = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), duneMat);
      dune.scale.set(dr, dh, dr * 0.6);
      dune.position.set(dx, -4.2, dz);
      this.levelGroup.add(dune);
    }
    const obeliskMat = new THREE.MeshLambertMaterial({ color: 0xd9a35a, flatShading: true });
    for (const [ox, oz] of [
      [-18, -52],
      [19, -56],
    ] as const) {
      const ob = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.95, 11, 4), obeliskMat);
      ob.position.set(ox, 1.0, oz);
      ob.rotation.y = Math.PI / 4;
      this.levelGroup.add(ob);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.78, 1.3, 4), capMat);
      tip.position.set(ox, 7.15, oz);
      tip.rotation.y = Math.PI / 4;
      this.levelGroup.add(tip);
    }
    const dustPos: number[] = [];
    const dustCol: number[] = [];
    const tint = new THREE.Color();
    for (let c = 0; c < 6; c++) {
      for (let i = 0; i < PY_DUST_PER_CELL; i++) {
        const h1 = Math.sin((i + 1) * 71.3 + c * 5.1) * 43758.5453;
        const h2 = Math.sin((i + 1) * 37.9 + 1.7 + c) * 24634.6345;
        const h3 = Math.sin((i + 1) * 17.7 + 4.3) * 15731.743;
        const f1 = h1 - Math.floor(h1);
        const f2 = h2 - Math.floor(h2);
        const f3 = h3 - Math.floor(h3);
        const side = f1 < 0.5 ? -1 : 1;
        dustPos.push(side * (12.8 + f3 * 22), 0.4 + f2 * 6, -150 + c * PY_DUST_CELL + ((f1 * 2) % 1) * PY_DUST_CELL);
        tint.setHSL(0.09 + f2 * 0.04, 0.75, 0.72 + f3 * 0.16);
        dustCol.push(tint.r, tint.g, tint.b);
      }
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.Float32BufferAttribute(dustPos, 3));
    dustGeo.setAttribute('color', new THREE.Float32BufferAttribute(dustCol, 3));
    const dust = new THREE.Points(
      dustGeo,
      new THREE.PointsMaterial({ size: 0.34, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false, sizeAttenuation: true })
    );
    dust.frustumCulled = false;
    this.levelGroup.add(dust);

    // 3. Course group: every course item sits at local z = -d; the group slides toward +z by the distance covered
    const courseGroup = new THREE.Group();
    courseGroup.position.z = SLED_Z;
    this.levelGroup.add(courseGroup);

    const sandstoneMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0xe2b26a, emissive: 0x5a3410, emissiveIntensity: 0.18, roughness: 0.84 }),
      0.84
    );
    const darkStoneMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0xc08a48, emissive: 0x4a2a0c, emissiveIntensity: 0.18, roughness: 0.88 }),
      0.84
    );
    const turquoiseMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0x2dd4bf, emissive: 0x0f766e, emissiveIntensity: 0.35, roughness: 0.4 }),
      0.84
    );
    const goldMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0xf6c443, emissive: 0x6b4106, emissiveIntensity: 0.3, roughness: 0.3, metalness: 0.65 }),
      0.82
    );
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x3b2410, roughness: 0.7 });
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffb347 });
    const scarabKit = { goldMat, shellMat: turquoiseMat, darkMat };
    const palmTrunkMat = new THREE.MeshStandardMaterial({ color: 0x9a6b3c, roughness: 0.8 });
    const palmLeafMat = new THREE.MeshStandardMaterial({ color: 0x22a35a, emissive: 0x0b3d1f, emissiveIntensity: 0.25, roughness: 0.6 });

    // 4. Scrolling tomb passage (instanced treadmill shared with the sled course): sandstone side walls with a
    //    turquoise glyph band and gold cornice, lotus columns & torch braziers
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
    for (let z0 = 0; z0 < SLED_SCENERY_SPAN - 0.01; z0 += 4) {
      for (const side of [-1, 1]) wallRows.push([side * wallX, 1.1, z0, 1.0, 2.2, 4.02]);
    }
    addScenery(new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), sandstoneMat, wallRows.length), wallRows);
    const bandRows: number[][] = [];
    for (let z0 = 0; z0 < SLED_SCENERY_SPAN - 0.01; z0 += 4) {
      for (const side of [-1, 1]) bandRows.push([side * (wallX - 0.52), 1.35, z0, 0.06, 0.42, 3.4]);
    }
    addScenery(new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), turquoiseMat, bandRows.length), bandRows);
    const corniceRows: number[][] = [];
    for (let z0 = 0; z0 < SLED_SCENERY_SPAN - 0.01; z0 += 4) {
      for (const side of [-1, 1]) corniceRows.push([side * wallX, 2.32, z0, 1.3, 0.24, 4.02]);
    }
    addScenery(new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), goldMat, corniceRows.length), corniceRows);
    const columnRows: number[][] = [];
    const capitalRows: number[][] = [];
    for (let z0 = 3; z0 < SLED_SCENERY_SPAN - 0.01; z0 += 11) {
      for (const side of [-1, 1]) {
        columnRows.push([side * (TRACK_HALF_W + 2.3), 2.3, z0 + side * 2.6, 1.0, 1.0, 1.0]);
        capitalRows.push([side * (TRACK_HALF_W + 2.3), 4.9, z0 + side * 2.6, 1.0, 1.0, 1.0]);
      }
    }
    addScenery(new THREE.InstancedMesh(new THREE.CylinderGeometry(0.85, 1.0, 4.6, 12), sandstoneMat, columnRows.length), columnRows);
    addScenery(new THREE.InstancedMesh(new THREE.CylinderGeometry(1.35, 0.8, 0.9, 12), turquoiseMat, capitalRows.length), capitalRows);
    const torchRows: number[][] = [];
    const flameRows: number[][] = [];
    for (let z0 = 1.6; z0 < SLED_SCENERY_SPAN - 0.01; z0 += 8.8) {
      for (const side of [-1, 1]) {
        torchRows.push([side * wallX, 2.62, z0 + side * 2.2, 0.62, 0.36, 0.62]);
        flameRows.push([side * wallX, 3.05, z0 + side * 2.2, 0.42, 0.7, 0.42]);
      }
    }
    addScenery(new THREE.InstancedMesh(new THREE.CylinderGeometry(0.6, 0.38, 1, 10), goldMat, torchRows.length), torchRows);
    addScenery(new THREE.InstancedMesh(new THREE.ConeGeometry(0.55, 1, 8), flameMat, flameRows.length), flameRows);
    this.updateSledScenery(0);

    // Palms & obelisk stubs just outside the passage walls (static, they frame the far desert)
    for (const [px, pz, sc] of [
      [-16.5, -14, 1.0],
      [16.8, -18, 1.15],
      [-17.5, -30, 1.25],
      [18.2, -34, 1.05],
    ] as const) {
      const palm = this.buildPalmModel(palmTrunkMat, palmLeafMat, sc);
      palm.position.set(px, -0.2, pz);
      this.levelGroup.add(palm);
    }

    // 5. Tomb gate (exit) at the finish line: twin pylons, a lintel with a winged golden scarab, the badge cup
    const exit = new THREE.Group();
    exit.position.set(0, 0, -(L + 1.5));
    exit.userData.pyExitD = L + 1.5;
    for (const side of [-1, 1]) {
      const pylon = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.4, 8.2, 4), sandstoneMat);
      pylon.position.set(side * 8.4, 4.1, 0);
      pylon.rotation.y = Math.PI / 4;
      pylon.castShadow = true;
      exit.add(pylon);
      const band = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.5, 3.2), turquoiseMat);
      band.position.set(side * 8.4, 6.6, 0);
      exit.add(band);
      const torch = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.2, 8), flameMat);
      torch.position.set(side * 8.4, 8.9, 0);
      exit.add(torch);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(17.4, 1.3, 1.8), darkStoneMat);
    lintel.position.set(0, 7.0, 0);
    exit.add(lintel);
    const lintelBand = new THREE.Mesh(new THREE.BoxGeometry(17.6, 0.32, 1.9), goldMat);
    lintelBand.position.set(0, 7.75, 0);
    exit.add(lintelBand);
    const bigScarab = this.buildScarabModel(scarabKit, 2.4);
    bigScarab.rotation.x = -Math.PI / 2 + 0.25;
    bigScarab.position.set(0, 9.4, 0.2);
    bigScarab.userData.pyBob = true;
    exit.add(bigScarab);
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.9, 0.2), turquoiseMat);
      wing.position.set(side * 2.6, 9.2, 0.1);
      wing.rotation.z = side * 0.28;
      exit.add(wing);
    }
    const cup = this.buildHallTrophyCupModel(3, 0xeab308);
    cup.scale.setScalar(1.05);
    cup.position.set(0, 12.0, 0);
    exit.add(cup);
    const backPyr = new THREE.Mesh(new THREE.ConeGeometry(17, 16, 4), farStoneMat);
    backPyr.position.set(0, 8, -14);
    backPyr.rotation.y = Math.PI / 4;
    exit.add(backPyr);
    const finishLine = new THREE.Mesh(
      new THREE.PlaneGeometry(18.6, 0.9),
      new THREE.MeshBasicMaterial({ color: 0xfde68a, transparent: true, opacity: 0.9, depthWrite: false })
    );
    finishLine.rotation.x = -Math.PI / 2;
    finishLine.position.set(0, 0.06, 1.5);
    exit.add(finishLine);
    courseGroup.add(exit);
    this.pyramidExitGroup = exit;

    // 6. Unit gates (+N / ×N): sandstone posts topped with little golden scarabs
    this.pyramidGates = [];
    const gateH = 2.8;
    for (const cfg of level.pyramidGates || []) {
      const group = new THREE.Group();
      group.position.set(cfg.x, 0, -cfg.d);
      for (const side of [-1, 1]) {
        const px = side * (cfg.width * 0.5 - 0.12);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, gateH, 4), sandstoneMat);
        post.position.set(px, gateH * 0.5, 0);
        post.rotation.y = Math.PI / 4;
        group.add(post);
        const sc = this.buildScarabModel(scarabKit, 0.62);
        sc.rotation.x = -0.5;
        sc.position.set(px, gateH + 0.24, 0);
        group.add(sc);
      }
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, cfg.width - 0.2, 10), goldMat);
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
      this.pyramidGates.push({ cfg, group, shieldMat, resolved: false, triggered: false });
    }

    // 7. Quicksand belts: churning sand across the passage, a firm stone path (gold-edged) and sinking swirl rings
    this.pyramidSands = [];
    const sandTex = this.createQuicksandTexture();
    const pathStoneMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0xfbe7bd, emissive: 0x8a6428, emissiveIntensity: 0.3, roughness: 0.7 }),
      0.84
    );
    const ringGeo = new THREE.RingGeometry(0.62, 0.8, 32);
    ringGeo.rotateX(-Math.PI / 2);
    for (const cfg of level.pyramidSands || []) {
      const group = new THREE.Group();
      group.position.set(0, 0, -(cfg.d + cfg.length / 2));
      const sandMat = new THREE.MeshStandardMaterial({
        map: sandTex,
        emissiveMap: sandTex,
        emissive: 0xffffff,
        emissiveIntensity: 0.12,
        roughness: 0.95,
        metalness: 0,
      });
      const sandPlane = new THREE.Mesh(new THREE.PlaneGeometry(TRACK_HALF_W * 2 + 0.6, cfg.length), sandMat);
      sandPlane.rotation.x = -Math.PI / 2;
      sandPlane.position.y = 0.045;
      sandPlane.renderOrder = 1;
      group.add(sandPlane);
      // Gold-edged stone walkway across the belt
      const lo = cfg.pathX - cfg.pathW * 0.5;
      const hi = cfg.pathX + cfg.pathW * 0.5;
      const stoneRows = Math.max(3, Math.round(cfg.length / 1.05));
      const stoneDepth = cfg.length / stoneRows - 0.12;
      for (let rIdx = 0; rIdx < stoneRows; rIdx++) {
        const zc = -cfg.length / 2 + (rIdx + 0.5) * (cfg.length / stoneRows);
        for (const half of [0, 1]) {
          const sx0 = lo + half * cfg.pathW * 0.5 + 0.06;
          const sx1 = lo + (half + 1) * cfg.pathW * 0.5 - 0.06;
          const stone = new THREE.Mesh(new THREE.BoxGeometry(sx1 - sx0, 0.14, stoneDepth), pathStoneMat);
          stone.position.set((sx0 + sx1) / 2, 0.1, -zc);
          group.add(stone);
        }
      }
      for (const ex of [lo, hi]) {
        const edge = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, cfg.length + 0.3), goldMat);
        edge.position.set(ex, 0.12, 0);
        group.add(edge);
      }
      // Sinking swirl rings in the sand on both sides of the path
      const swirl = new THREE.Group();
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x7c4a1e, transparent: true, opacity: 0.55, depthWrite: false });
      for (const rx of [-7.4, -3.4, 3.4, 7.4]) {
        if (rx > lo - 1.2 && rx < hi + 1.2) continue;
        for (const rs of [1.0, 1.9]) {
          const ring = new THREE.Mesh(ringGeo, ringMat);
          ring.scale.setScalar(rs);
          ring.position.set(rx, 0.06, 0);
          ring.renderOrder = 2;
          swirl.add(ring);
        }
      }
      group.add(swirl);
      courseGroup.add(group);
      this.pyramidSands.push({ cfg, group, sandMat, swirl, swallowed: 0, pulledOut: 0, entered: false, passed: false });
    }

    // 8. Flip-slab rows: every slab is a sandstone tile on a centre pivot over a dark pit, with a glyph that glows
    //    gold (closed) / red (warning, open); the pivot flips the tile onto its edge while the slab is open
    this.pyramidSlabRows = [];
    const pitMat = new THREE.MeshBasicMaterial({ color: 0x1c1007 });
    for (const cfg of level.pyramidSlabRows || []) {
      const group = new THREE.Group();
      group.position.set(0, 0, -cfg.d);
      const slabs: PyramidSlabRowRuntime['slabs'] = [];
      for (const sc of cfg.slabs) {
        const rimMat = new THREE.MeshBasicMaterial({ color: 0xb45309, transparent: true, opacity: 0.7, depthWrite: false });
        const rim = new THREE.Mesh(new THREE.PlaneGeometry(sc.width - 0.02, cfg.depth + 0.1), rimMat);
        rim.rotation.x = -Math.PI / 2;
        rim.position.set(sc.x, 0.04, 0);
        group.add(rim);
        const pit = new THREE.Mesh(new THREE.PlaneGeometry(sc.width - 0.28, cfg.depth - 0.18), pitMat);
        pit.rotation.x = -Math.PI / 2;
        pit.position.set(sc.x, 0.047, 0);
        group.add(pit);
        const pivot = new THREE.Group();
        pivot.position.set(sc.x, 0.1, 0);
        const tile = new THREE.Mesh(new THREE.BoxGeometry(sc.width - 0.34, 0.16, cfg.depth - 0.24), sandstoneMat);
        tile.castShadow = true;
        pivot.add(tile);
        const glyphMat = new THREE.MeshBasicMaterial({ color: 0xf6c443 });
        const eye = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.42, 20), glyphMat);
        eye.rotation.x = -Math.PI / 2;
        eye.scale.set(1.5, 1, 1);
        eye.position.set(0, 0.085, 0);
        pivot.add(eye);
        const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.16, 16), glyphMat);
        pupil.rotation.x = -Math.PI / 2;
        pupil.position.set(0, 0.086, 0);
        pivot.add(pupil);
        for (const gx of [-1, 1]) {
          const bar = new THREE.Mesh(new THREE.PlaneGeometry(0.12, cfg.depth - 0.7), glyphMat);
          bar.rotation.x = -Math.PI / 2;
          bar.position.set(gx * (sc.width * 0.5 - 0.45), 0.086, 0);
          pivot.add(bar);
        }
        group.add(pivot);
        slabs.push({ cfg: sc, pivot, glyphMat, rimMat, state: 'closed' });
      }
      courseGroup.add(group);
      this.pyramidSlabRows.push({ cfg, group, slabs, knocked: 0, touched: new Set<number>(), hitCounted: false, passed: false });
    }

    const label = document.createElement('div');
    label.className = 'subtower-label pyramid-run-label';
    label.style.display = 'none';
    this.labelsContainer.appendChild(label);

    const ms = this.state.getScarabMilestoneBonus();
    const timeLimit = course.timeLimitSec + ms.timeBonusSec;
    this.pyramidRun = {
      active: true,
      tier: level.pyramidTier || 1,
      courseGroup,
      floorTex,
      floorMat,
      sandTex,
      sun,
      dust,
      x: 0,
      distance: 0,
      courseLength: L,
      baseSpeed: course.baseSpeed,
      speed: 0,
      timeLeft: timeLimit,
      timeLimit,
      maxSteerX: course.maxSteerX,
      maxBobos: course.maxBobos,
      sandSlowMult: course.sandSlowMult,
      sinkSec: course.sinkSec,
      hitSlowMult: course.hitSlowMult,
      hitSlowSec: course.hitSlowSec,
      slowTimer: 0,
      clock: 0,
      sandFrac: 0,
      sink: new Map<number, number>(),
      sandSec: 0,
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
    this.updatePyramidSlabs(0);
  }

  /** Spawns the starting Bobo squad at the tomb entrance (start Bobos + 圣甲虫徽章 milestone bonus). */
  protected spawnStartingPyramidBobos(level: LevelConfig): number {
    const course = level.pyramidCourse;
    const bonus = this.state.getScarabMilestoneBonus().startBonusBobos;
    const n = Math.max(1, Math.min(course?.maxBobos ?? 90, (course?.startBobos ?? 16) + bonus));
    let spawned = 0;
    for (let k = 0; k < n; k++) {
      const slot = this.getLavaSlot(k, n, 0);
      const u = this.spawnUnit('blue', 'normal', slot.x, slot.z, 0, 0);
      if (u) {
        u.spawnHop = 0;
        u.rideY = PY_RIDE_BASE;
        u.sledSlotX = slot.x;
        u.sledSlotZ = slot.z;
        spawned++;
      }
    }
    this.pyramidPeakBobos = spawned;
    this.pyramidBoboCount = spawned;
    return spawned;
  }

  public getPyramidProgressPct(): number {
    const s = this.pyramidRun;
    if (!s) return 0;
    return Math.max(0, Math.min(100, Math.round((s.distance / Math.max(1, s.courseLength)) * 100)));
  }

  /** Share of the squad standing in quicksand (0..100). */
  public getPyramidSandPct(): number {
    const s = this.pyramidRun;
    if (!s) return 0;
    return Math.max(0, Math.min(100, Math.round(s.sandFrac * 100)));
  }

  /** Gate rows the squad front has reached, and the total number of gate rows. */
  public getPyramidGateProgress(): { reached: number; total: number } {
    const ds = new Set<number>();
    const reached = new Set<number>();
    for (const g of this.pyramidGates) {
      ds.add(g.cfg.d);
      if (g.resolved) reached.add(g.cfg.d);
    }
    return { reached: reached.size, total: ds.size };
  }

  /** Traps (quicksand belts + flip-slab rows) the whole squad is past, and the total. */
  public getPyramidTrapProgress(): { passed: number; total: number } {
    let passed = 0;
    for (const b of this.pyramidSands) if (b.passed) passed++;
    for (const r of this.pyramidSlabRows) if (r.passed) passed++;
    return { passed, total: this.pyramidSands.length + this.pyramidSlabRows.length };
  }

  public getPyramidStateLabel(): string {
    const s = this.pyramidRun;
    if (!s) return '尚未出发';
    switch (s.state) {
      case 'stumbled':
        return '翻板踉跄';
      case 'quicksand':
        return '陷入流沙';
      case 'finished':
        return '冲出墓道';
      case 'timeout':
        return '超时困在墓道';
      case 'wiped':
        return '波波全部失散';
      default:
        return '墓道疾行中';
    }
  }

  /** State of one flip slab at run clock `clock` and seconds already spent in that state. */
  public getPyramidSlabState(
    row: PyramidSlabRowConfig,
    slab: PyramidSlabConfig,
    clock: number
  ): { state: PyramidSlabStateId; t: number } {
    const P = Math.max(0.1, row.period);
    const ph = (((clock + slab.offset) % P) + P) % P;
    const openStart = P - row.openSec;
    const warnStart = openStart - row.warnSec;
    if (ph >= openStart) return { state: 'open', t: ph - openStart };
    if (ph >= warnStart) return { state: 'warn', t: ph - warnStart };
    return { state: 'closed', t: ph };
  }

  /** True if the slab is open at any moment of [t0, t1] on the run clock. */
  protected isPyramidSlabOpenDuring(row: PyramidSlabRowConfig, slab: PyramidSlabConfig, t0: number, t1: number): boolean {
    const P = Math.max(0.1, row.period);
    const openStart = P - row.openSec;
    // Open windows: [kP - offset + openStart, (k + 1)P - offset)
    const kMin = Math.floor((t0 + slab.offset - P) / P) - 1;
    const kMax = Math.ceil((t1 + slab.offset) / P) + 1;
    for (let k = kMin; k <= kMax; k++) {
      const a = k * P - slab.offset + openStart;
      const b = (k + 1) * P - slab.offset;
      if (a <= t1 && b >= t0) return true;
    }
    return false;
  }

  /** Quicksand belt under course point (x, du) — off the stone path — or null. */
  private findPyramidSandAt(x: number, du: number): PyramidSandRuntime | null {
    for (const b of this.pyramidSands) {
      if (du < b.cfg.d || du > b.cfg.d + b.cfg.length) continue;
      if (Math.abs(x - b.cfg.pathX) <= b.cfg.pathW * 0.5) return null;
      return b;
    }
    return null;
  }

  /** Re-seats every Bobo on its formation slot behind the current line (self-checks). */
  public snapPyramidBobosToSlots(): void {
    const s = this.pyramidRun;
    if (!s) return;
    s.hist.fill(s.x);
    s.histDist = s.distance;
    s.sink.clear();
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
      u.rideY = PY_RIDE_BASE;
    }
  }

  /** A trap hit (swallowed by sand / flung by a slab): a candy (frost / pet) shell absorbs it. True if the Bobo is lost. */
  protected knockPyramidBobo(u: Unit, silent = false): boolean {
    if (!u.active || u.team !== 'blue') return false;
    if (u.frostShield) {
      u.frostShield = false;
      u.petShellGranted = false;
      this.pyramidShieldSaves += 1;
      if (!silent) this.spawnBurstParticles(u.x, 0.9, u.z, 0x7dd3fc, 4);
      return false;
    }
    u.active = false;
    this.pyramidBobosLost += 1;
    this.pyramidRun?.sink.delete(u.id);
    if (!silent) {
      this.spawnBurstParticles(u.x, 0.7, u.z, 0xe8b86a, 6);
      this.spawnBurstParticles(u.x, 1.2, u.z, 0x7c4a1e, 3);
    }
    return true;
  }

  private applyPyramidGate(g: PyramidGateRuntime, silent = false): number {
    const s = this.pyramidRun;
    if (!s) return 0;
    g.triggered = true;
    g.shieldMat.opacity = 0.35;
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
        u.rideY = PY_RIDE_BASE;
        added++;
      }
    }
    this.pyramidGatesPassed += 1;
    this.pyramidPeakBobos = Math.max(this.pyramidPeakBobos, bobos + added);
    if (!silent) {
      sound.playCloneGate(g.cfg.op === 'mul' ? 3 : 2);
      this.spawnBurstParticles(s.x, 1.8, SLED_Z - 1.2, g.cfg.op === 'mul' ? 0xfacc15 : 0x5eead4, 22);
      this.spawnShockwave(s.x, SLED_Z - 0.8, g.cfg.op === 'mul' ? 0xfacc15 : 0x2dd4bf, 4.0, 0.35);
      this.spawnFloatingPopup(
        s.x,
        3.2,
        SLED_Z - 1.0,
        added < n || n < want ? `+${added} 波波 (满员)` : `+${added} 波波加入!`,
        g.cfg.op === 'mul' ? '#fde047' : '#99f6e4'
      );
    }
    return added;
  }

  private pyramidStumble(cause: string, silent = false): void {
    const s = this.pyramidRun;
    if (!s) return;
    s.slowTimer = Math.max(s.slowTimer, s.hitSlowSec);
    s.hitFlash = 1.0;
    if (!silent) {
      this.addCameraShake(0.26);
      this.spawnFloatingPopup(s.x, 3.6, SLED_Z - 1.0, cause, '#fecaca');
    }
  }

  /** Animates every flip slab from the run clock: tremble while warning, flip onto its edge while open. */
  protected updatePyramidSlabs(dt: number): void {
    const s = this.pyramidRun;
    const clock = s ? s.clock : 0;
    const t = this.elapsedTime;
    for (const row of this.pyramidSlabRows) {
      for (const sl of row.slabs) {
        const st = this.getPyramidSlabState(row.cfg, sl.cfg, clock);
        sl.state = st.state;
        if (!row.group.visible && dt > 0) continue;
        if (st.state === 'open') {
          const ease = Math.min(1, st.t / 0.18, Math.max(0, (row.cfg.openSec - st.t) / 0.18));
          sl.pivot.rotation.x = (Math.PI / 2) * ease;
          sl.pivot.rotation.z = 0;
          sl.pivot.position.y = 0.1;
          sl.glyphMat.color.setHex(0xef4444);
          sl.rimMat.color.setHex(0xdc2626);
          sl.rimMat.opacity = 0.9;
        } else if (st.state === 'warn') {
          sl.pivot.rotation.x = 0;
          sl.pivot.rotation.z = Math.sin(t * 46 + sl.cfg.x) * 0.035 * (0.4 + st.t / Math.max(0.1, row.cfg.warnSec));
          sl.pivot.position.y = 0.1 + Math.abs(Math.sin(t * 38 + sl.cfg.x)) * 0.04;
          const blink = Math.sin(t * 22) > 0;
          sl.glyphMat.color.setHex(blink ? 0xf97316 : 0xef4444);
          sl.rimMat.color.setHex(0xf97316);
          sl.rimMat.opacity = 0.75 + Math.sin(t * 22) * 0.2;
        } else {
          sl.pivot.rotation.x = 0;
          sl.pivot.rotation.z = 0;
          sl.pivot.position.y = 0.1;
          sl.glyphMat.color.setHex(0xf6c443);
          sl.rimMat.color.setHex(0xb45309);
          sl.rimMat.opacity = 0.55;
        }
      }
    }
  }

  /**
   * Autopilot target x (self-checks / screenshots / demo): picks bigger gates, keeps the squad on the stone path of
   * every quicksand belt, and threads each flip-slab row on a slab that stays shut for the whole crossing (predicted
   * from the run clock), peeking two events ahead.
   */
  public getPyramidAutopilotX(): number {
    const s = this.pyramidRun;
    if (!s) return 0;
    const n = this.pyramidBoboCount || this.getLavaBoboCount();
    const half = this.getLavaSquadHalfWidth(n);
    const depth = Math.max(0.6, Math.ceil(Math.max(1, n) / this.getLavaSquadCols(n)) * LAVA_ROW_SPACING);
    const frontDu = s.distance + PY_FRONT_OFFSET;
    const pace = Math.max(2, s.speed || s.baseSpeed);
    type Ev = { d: number; score: (x: number) => number };
    const evs: Ev[] = [];
    const gateDs = new Map<number, PyramidGateRuntime[]>();
    for (const g of this.pyramidGates) {
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
    for (const b of this.pyramidSands) {
      if (b.passed || frontDu > b.cfg.d + b.cfg.length + 0.3 || b.cfg.d > frontDu + 40) continue;
      evs.push({
        d: b.cfg.d,
        score: (x: number) => {
          const inner = b.cfg.pathW * 0.5 - half - 0.12;
          const off = Math.abs(x - b.cfg.pathX);
          if (off <= Math.max(0, inner)) return 4;
          return -60 - (off - Math.max(0, inner)) * 30;
        },
      });
    }
    for (const row of this.pyramidSlabRows) {
      const rd = row.cfg.depth * 0.5;
      if (row.passed || frontDu > row.cfg.d + rd + 0.25 || row.cfg.d > frontDu + 40) continue;
      const t1 = s.clock + Math.max(0, (row.cfg.d - rd - frontDu) / pace) - 0.18;
      const t2 = s.clock + Math.max(0, (row.cfg.d + rd + depth - frontDu) / pace) + 0.22;
      evs.push({
        d: row.cfg.d - rd,
        score: (x: number) => {
          let score = 0;
          let touched = 0;
          for (const sl of row.slabs) {
            const lo = sl.cfg.x - sl.cfg.width * 0.5;
            const hi = sl.cfg.x + sl.cfg.width * 0.5;
            if (x + half + 0.2 < lo || x - half - 0.2 > hi) continue;
            touched++;
            if (this.isPyramidSlabOpenDuring(row.cfg, sl.cfg, t1, t2)) score -= 280;
          }
          return score - (touched > 1 ? 12 : 0);
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

  protected updatePyramidRun(dt: number): void {
    const s = this.pyramidRun;
    const level = this.currentLevel;
    if (!s || !s.active || !level) return;
    const t = this.elapsedTime;

    // 1. Steering (the squad follows the cannon's lateral aim), quicksand drag & pace
    s.clock += dt;
    const steerX = THREE.MathUtils.clamp(this.turretX, -s.maxSteerX, s.maxSteerX);
    s.x = THREE.MathUtils.lerp(s.x, steerX, Math.min(1, dt * 6.0));
    let target = s.baseSpeed * this.getTacticRushMult();
    if (s.slowTimer > 0) {
      s.slowTimer = Math.max(0, s.slowTimer - dt);
      target *= s.hitSlowMult;
    }
    const drag = THREE.MathUtils.clamp(s.sandFrac / 0.5, 0, 1);
    if (drag > 0) {
      target *= 1 - (1 - s.sandSlowMult) * drag;
      s.sandSec += dt;
    }
    s.speed = THREE.MathUtils.lerp(s.speed, target, Math.min(1, dt * (target > s.speed ? 2.2 : 5.0)));
    s.distance = Math.min(s.courseLength, s.distance + s.speed * dt);
    s.timeLeft = Math.max(0, s.timeLeft - dt);
    s.state = s.slowTimer > 0 ? 'stumbled' : s.sandFrac >= 0.2 ? 'quicksand' : 'running';
    s.hitFlash = Math.max(0, s.hitFlash - dt * 2);
    this.bossHp = Math.max(0, 100 - this.getPyramidProgressPct());

    // 2. Scroll the tomb passage toward the camera, churn the sand, drift the dust & the treadmill corridor
    s.courseGroup.position.z = SLED_Z + s.distance;
    if (s.floorTex) s.floorTex.offset.y = (s.distance / PY_FLOOR_TILE_M) % 1;
    if (s.sandTex) s.sandTex.offset.set(Math.sin(t * 0.7) * 0.04, (t * 0.05) % 1);
    s.dust.position.z = (s.distance * 0.3) % PY_DUST_CELL;
    s.dust.position.x = Math.sin(t * 0.5) * 0.6;
    this.placePyramidSun(s.sun);
    this.updateSledScenery(s.distance);
    if (this.pyramidExitGroup) {
      const ed = (this.pyramidExitGroup.userData.pyExitD as number) || s.courseLength;
      this.pyramidExitGroup.visible = SLED_Z + s.distance - ed > -SLED_DECK_HALF - 30;
      for (const c of this.pyramidExitGroup.children) if (c.userData.pyBob) c.position.y = 9.4 + Math.sin(t * 2.0) * 0.25;
    }
    s.sparkTimer -= dt;
    if (s.sparkTimer <= 0) {
      s.sparkTimer = 0.14;
      const side = Math.random() < 0.5 ? -1 : 1;
      this.spawnBurstParticles(
        side * (TRACK_HALF_W + 0.9),
        3.0 + Math.random() * 0.4,
        SLED_Z - 16 + Math.random() * 26,
        Math.random() < 0.5 ? 0xffb347 : 0xfde68a,
        1
      );
    }

    // 3. Squad formation: the lead line is recorded along the course and every row follows that exact path a little
    //    later; every Bobo runs with a small hop. Bobos standing in quicksand (off the stone path) sink a little more
    //    every moment and are swallowed after `sinkSec` (capped per belt; a candy shield pulls one out once).
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
    let xSum = 0;
    let inSand = 0;
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
      const slotX = THREE.MathUtils.clamp(slot.x, -TRACK_HALF_W + 0.9, TRACK_HALF_W - 0.9);
      u.sledSlotX = slotX;
      u.sledSlotZ = slot.z;
      u.x = THREE.MathUtils.lerp(u.x, slotX, pin);
      u.z = THREE.MathUtils.lerp(u.z, slot.z, pin);
      const du = s.distance + (SLED_Z - u.z);
      const belt = this.findPyramidSandAt(u.x, du);
      let sink = s.sink.get(u.id) || 0;
      if (belt) {
        inSand++;
        sink += dt;
        if (sink >= s.sinkSec && belt.swallowed < belt.cfg.knockCap) {
          if (this.knockPyramidBobo(u)) {
            belt.swallowed++;
            this.pyramidSandSwallowed += 1;
            continue;
          }
          belt.pulledOut += 1;
          sink = 0;
        }
        sink = Math.min(sink, s.sinkSec);
      } else {
        sink = Math.max(0, sink - dt * 3);
      }
      if (sink > 0) s.sink.set(u.id, sink);
      else s.sink.delete(u.id);
      const sinkDepth = 0.34 * Math.min(1, sink / Math.max(0.1, s.sinkSec));
      u.rideY = PY_RIDE_BASE + 0.1 * hop * Math.abs(Math.sin(t * 8.0 + k * 0.9)) * (belt ? 0.3 : 1) - sinkDepth;
      xSum += u.x;
      trailEndZ = Math.max(trailEndZ, u.z);
      k++;
    }
    const alive = k;
    this.pyramidBoboCount = alive;
    s.sandFrac = alive > 0 ? inSand / alive : 0;
    s.crowdX = alive > 0 ? xSum / alive : s.x;
    s.crowdHalfW = this.getLavaSquadHalfWidth(Math.max(1, alive));
    s.crowdDepth = Math.max(0.6, Math.ceil(Math.max(1, alive) / cols) * LAVA_ROW_SPACING);

    // 4. Gates: when the squad front reaches a gate row, the gate under the squad centre triggers (pair resolves)
    const frontDu = s.distance + PY_FRONT_OFFSET;
    for (const g of this.pyramidGates) {
      const wz = SLED_Z + s.distance - g.cfg.d;
      g.group.visible = wz > -SLED_DECK_HALF - 8 && wz < SLED_DECK_HALF + 3;
      if (g.resolved || frontDu < g.cfg.d) continue;
      for (const g2 of this.pyramidGates) {
        if (g2.resolved || g2.cfg.d !== g.cfg.d) continue;
        g2.resolved = true;
        if (Math.abs(leadX - g2.cfg.x) <= g2.cfg.width * 0.5) this.applyPyramidGate(g2);
        else g2.shieldMat.opacity = 0.5;
      }
    }

    // 5. Quicksand belts: churn the swirl rings; a belt is passed once the whole squad is beyond its far edge
    for (const b of this.pyramidSands) {
      const nearZ = SLED_Z + s.distance - b.cfg.d;
      const farZ = nearZ - b.cfg.length;
      b.group.visible = nearZ > -SLED_DECK_HALF - 8 && farZ < SLED_DECK_HALF + 3;
      if (b.group.visible) {
        b.swirl.rotation.y = 0;
        for (let ci = 0; ci < b.swirl.children.length; ci++) {
          const ring = b.swirl.children[ci];
          ring.rotation.y = t * (ci % 2 === 0 ? 1.4 : -1.1);
          const pulse = 1 + Math.sin(t * 3.2 + ci) * 0.08;
          ring.scale.setScalar((ci % 2 === 0 ? 1.0 : 1.9) * pulse);
        }
        b.sandMat.emissiveIntensity = 0.11 + Math.sin(t * 2.4 + b.cfg.d) * 0.03;
      }
      if (!b.entered && frontDu >= b.cfg.d && s.sandFrac >= 0.2) {
        b.entered = true;
        this.spawnFloatingPopup(s.crowdX, 3.4, SLED_Z - 1.0, '陷入流沙! 快回石板路', '#fed7aa');
      }
      if (!b.passed && farZ > trailEndZ + 0.5) {
        b.passed = true;
        if (b.swallowed === 0) this.pyramidTrapsDodged += 1;
        else {
          this.pyramidSandHits += 1;
          this.spawnFloatingPopup(b.cfg.pathX, 2.4, Math.min(16, SLED_Z + 4), `流沙吞没 -${b.swallowed} 波波`, '#fdba74');
        }
      }
    }

    // 6. Flip slabs: animate from the run clock; Bobos on an open slab are flung away (capped per row, shields absorb)
    for (const row of this.pyramidSlabRows) {
      const wz = SLED_Z + s.distance - row.cfg.d;
      row.group.visible = wz > -SLED_DECK_HALF - 8 && wz < SLED_DECK_HALF + 3;
    }
    this.updatePyramidSlabs(dt);
    for (const row of this.pyramidSlabRows) {
      if (row.passed) continue;
      const rd = row.cfg.depth * 0.5;
      const farEdgeZ = SLED_Z + s.distance - (row.cfg.d + rd);
      if (row.group.visible) {
        for (let i = 0; i < MAX_UNITS && row.knocked < row.cfg.knockCap; i++) {
          const u = this.units[i];
          if (!u.active || u.team !== 'blue' || row.touched.has(u.id)) continue;
          const du = s.distance + (SLED_Z - u.z);
          if (Math.abs(du - row.cfg.d) > rd) continue;
          let openSlab = false;
          for (const sl of row.slabs) {
            if (sl.state === 'open' && Math.abs(u.x - sl.cfg.x) <= sl.cfg.width * 0.5) {
              openSlab = true;
              break;
            }
          }
          if (!openSlab) continue;
          row.touched.add(u.id);
          if (this.knockPyramidBobo(u)) {
            row.knocked++;
            this.pyramidSlabFlung += 1;
            this.spawnBurstParticles(u.x, 1.6, u.z, 0xfde68a, 3);
          }
        }
        if (row.knocked > 0 && !row.hitCounted) {
          row.hitCounted = true;
          this.pyramidSlabHits += 1;
          this.pyramidStumble('翻转石板掀飞波波!');
        }
      }
      if (farEdgeZ > trailEndZ + 0.6) {
        row.passed = true;
        if (row.knocked === 0) this.pyramidTrapsDodged += 1;
        else this.spawnFloatingPopup(s.crowdX, 2.4, Math.min(16, SLED_Z + 4), `翻板掀飞 -${row.knocked} 波波`, '#fecaca');
      }
    }

    // 7. Resolution: run out of the tomb gate = victory; countdown out or every Bobo lost = defeat
    const aliveNow = this.getLavaBoboCount();
    this.pyramidBoboCount = aliveNow;
    if (s.distance >= s.courseLength - 0.001 && aliveNow > 0) {
      s.active = false;
      s.state = 'finished';
      s.labelEl.style.display = 'none';
      this.pyramidFinishSec = Number((s.timeLimit - s.timeLeft).toFixed(2));
      this.bossHp = 0;
      this.spawnSkyPillar(s.x, SLED_Z - 2, 0xeab308, 3.6, 0.7);
      this.spawnShockwave(s.x, SLED_Z, 0xfde68a, 11.0, 0.7);
      this.spawnBurstParticles(s.x, 2.2, SLED_Z - 1, 0xfde047, 60);
      this.finishStage(true);
      this.onBanner?.(
        `${UI_ART.pyramidRun} 波波团冲出金字塔墓道！`,
        `用时 ${this.pyramidFinishSec.toFixed(1)}s / 限时 ${s.timeLimit}s · 幸存波波 ${aliveNow} 只 · 机关全身而过 ${this.pyramidTrapsDodged} 处`
      );
      return;
    }
    if (s.timeLeft <= 0 || aliveNow <= 0) {
      s.active = false;
      s.state = aliveNow <= 0 ? 'wiped' : 'timeout';
      s.labelEl.style.display = 'none';
      this.pyramidFinishSec = Number((s.timeLimit - s.timeLeft).toFixed(2));
      this.spawnBurstParticles(s.x, 1.4, SLED_Z, 0xe8b86a, 40);
      this.onBanner?.(
        `${UI_ART.warning} ${s.state === 'wiped' ? '波波全被机关吞没' : '超时困在墓道里'}！`,
        `前进 ${Math.round(s.distance)}/${s.courseLength}m · 已损失 ${this.pyramidBobosLost} 只波波`
      );
      this.finishStage(false);
    }
  }
}
