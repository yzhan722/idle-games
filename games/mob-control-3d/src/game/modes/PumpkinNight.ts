/** MC-15 幽灵古堡南瓜夜：从 World3D 原样搬出的方法（字段仍在 World3D）。继承链见 ../World3DFull.ts。 */
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
  PK_FRONT_OFFSET,
  PK_RIDE_BASE,
  PK_GHOST_WAKE,
  PK_WALL_HALF_DEPTH,
  PK_FLOOR_REPEAT_V,
  PK_FLOOR_TILE_M,
  PK_STAR_CELL,
  PK_STARS_PER_CELL,
  PK_NIGHT_SKY,
} from '../world/CourseConstants';
import {
  stylizeMaterialAs2DIllustration,
} from '../SceneThemes';
import {
  PumpkinGateRuntime,
  PumpkinLampRuntime,
  MAX_UNITS,
  SLED_Z,
  TRACK_HALF_W,
  Unit,
} from '../WorldTypes';
import { LavaJumpMode } from './LavaJump';

export abstract class PumpkinNightMode extends LavaJumpMode {
  /** Moonlit night tint on top of the royal-castle theme (re-applied every load; applyTheme restores other modes). */
  private applyPumpkinNightAmbience(): void {
    this.scene.background = new THREE.Color(PK_NIGHT_SKY);
    this.scene.fog = new THREE.FogExp2(0x1d1440, 0.0046);
    if (this.abyssShaderMat?.uniforms) {
      this.abyssShaderMat.uniforms.uBaseColor.value.set('#150e30');
      this.abyssShaderMat.uniforms.uVeinColor.value.set('#4c1d95');
      this.abyssShaderMat.uniforms.uAccentColor.value.set('#fb923c');
    }
    this.hemiLight.color.setHex(0xc7d2fe);
    this.hemiLight.groundColor.setHex(0x3b2a5a);
    this.hemiLight.intensity *= 0.62;
    this.dirLight.color.setHex(0xc7d2fe);
    this.dirLight.intensity *= 0.55;
    this.rimLight.color.setHex(0xfb923c);
  }

  /** Pins the moon sprite to the upper-left sky of the current view (it never drifts off-screen with the squad cam). */
  private placePumpkinMoon(moon: THREE.Object3D): void {
    const aspect = window.innerWidth / Math.max(1, window.innerHeight);
    const v = this.pkMoonDir.set(aspect < 1 ? -0.5 : -0.64, aspect < 1 ? 0.5 : 0.56, 0.5).unproject(this.camera);
    v.sub(this.camera.position).normalize();
    moon.position.copy(this.camera.position).addScaledVector(v, 70);
  }

  /** Procedural (non-canvas) castle floor: staggered slate flagstones, a royal carpet runner with gold trim, amber curbs. */
  private createPumpkinFloorTexture(): THREE.DataTexture {
    const size = 64;
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        const noise = hash - Math.floor(hash);
        const row = Math.floor(y / 8);
        const sx = x + (row % 2) * 4;
        const stoneHash = Math.sin(Math.floor(sx / 8) * 7.31 + row * 3.77) * 9631.7;
        const tone = (stoneHash - Math.floor(stoneHash)) * 16;
        let r = 84 + tone + noise * 8;
        let g = 76 + tone + noise * 8;
        let b = 112 + tone * 1.2 + noise * 10;
        if (y % 8 === 0 || sx % 8 === 0) {
          r = 46;
          g = 40;
          b = 70;
        }
        if (x >= 22 && x <= 41) {
          r = 122 + noise * 10;
          g = 40 + noise * 6;
          b = 92 + noise * 8;
          if (x === 22 || x === 41 || x === 24 || x === 39) {
            r = 236;
            g = 180;
            b = 78;
          } else if ((x === 31 || x === 32) && y % 16 < 6) {
            r = 252;
            g = 196;
            b = 96;
          }
        }
        if (x <= 1 || x >= size - 2) {
          r = 222;
          g = 140;
          b = 56;
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
    tex.repeat.set(1, PK_FLOOR_REPEAT_V);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  /** Shared soft radial glow (white RGB, alpha falls off to the rim) for lit zones and the squad lantern. */
  protected getPumpkinGlowTexture(): THREE.DataTexture {
    if (this.pumpkinGlowTex) return this.pumpkinGlowTex;
    const size = 64;
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const dx = ((x + 0.5) / size) * 2 - 1;
        const dy = ((y + 0.5) / size) * 2 - 1;
        const d = Math.sqrt(dx * dx + dy * dy);
        const a = Math.pow(Math.max(0, Math.min(1, 1 - d)), 1.25);
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
        data[i + 3] = Math.round(a * 255);
      }
    }
    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    this.pumpkinGlowTex = tex;
    return tex;
  }

  /** A pale full moon with craters and a soft halo (sprite texture). */
  private getPumpkinMoonTexture(): THREE.DataTexture {
    if (this.pumpkinMoonTex) return this.pumpkinMoonTex;
    const size = 128;
    const data = new Uint8Array(size * size * 4);
    const craters: Array<[number, number, number]> = [
      [-0.16, -0.12, 0.13],
      [0.18, 0.06, 0.09],
      [-0.04, 0.22, 0.07],
      [0.12, -0.24, 0.06],
    ];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const dx = ((x + 0.5) / size) * 2 - 1;
        const dy = ((y + 0.5) / size) * 2 - 1;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d <= 0.52) {
          let shade = 1.0 - d * 0.18;
          for (const [cx, cy, cr] of craters) {
            const cd = Math.hypot(dx - cx, dy - cy);
            if (cd < cr) shade -= 0.12 * (1 - cd / cr);
          }
          data[i] = Math.round(254 * shade);
          data[i + 1] = Math.round(243 * shade);
          data[i + 2] = Math.round(205 * shade);
          data[i + 3] = 255;
        } else {
          const a = Math.pow(Math.max(0, 1 - (d - 0.52) / 0.48), 2.2) * 0.55;
          data[i] = 253;
          data[i + 1] = 230;
          data[i + 2] = 180;
          data[i + 3] = Math.round(a * 255);
        }
      }
    }
    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    this.pumpkinMoonTex = tex;
    return tex;
  }

  /** A toy jack-o'-lantern (lobed body, stem, glowing carved face toward +z). */
  private buildJackOLantern(
    kit: {
      bodyGeo: THREE.BufferGeometry;
      lobeGeo: THREE.BufferGeometry;
      stemGeo: THREE.BufferGeometry;
      eyeGeo: THREE.BufferGeometry;
      mouthGeo: THREE.BufferGeometry;
      bodyMat: THREE.Material;
      stemMat: THREE.Material;
      faceMat: THREE.Material;
    },
    scale: number
  ): THREE.Group {
    const g = new THREE.Group();
    const body = new THREE.Mesh(kit.bodyGeo, kit.bodyMat);
    body.scale.set(1.12, 0.84, 1.04);
    g.add(body);
    for (const lx of [-0.27, 0.27]) {
      const lobe = new THREE.Mesh(kit.lobeGeo, kit.bodyMat);
      lobe.position.set(lx, 0, 0);
      lobe.scale.set(0.9, 0.92, 1.0);
      g.add(lobe);
    }
    const stem = new THREE.Mesh(kit.stemGeo, kit.stemMat);
    stem.position.set(0.02, 0.47, 0);
    stem.rotation.z = 0.25;
    g.add(stem);
    for (const ex of [-0.17, 0.17]) {
      const eye = new THREE.Mesh(kit.eyeGeo, kit.faceMat);
      eye.position.set(ex, 0.08, 0.535);
      eye.rotation.z = Math.PI / 2;
      g.add(eye);
    }
    const mouth = new THREE.Mesh(kit.mouthGeo, kit.faceMat);
    mouth.position.set(0, -0.15, 0.52);
    mouth.rotation.z = -Math.PI / 2;
    mouth.scale.set(0.62, 1.5, 1);
    g.add(mouth);
    g.scale.setScalar(scale);
    return g;
  }

  /** A toy ghost (round head, flared skirt with a wavy hem, stubby arms, big eyes) facing +z. */
  private buildGhostModel(
    mats: { bodyMat: THREE.MeshStandardMaterial; eyeMat: THREE.Material; cheekMat: THREE.Material },
    scale: number
  ): THREE.Group {
    const g = new THREE.Group();
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.72, 20, 14), mats.bodyMat);
    head.position.y = 1.55;
    g.add(head);
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.95, 1.05, 20, 1, true), mats.bodyMat);
    skirt.position.y = 0.98;
    g.add(skirt);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const hem = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), mats.bodyMat);
      hem.position.set(Math.cos(a) * 0.82, 0.46, Math.sin(a) * 0.82);
      g.add(hem);
    }
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), mats.bodyMat);
      arm.position.set(side * 0.9, 1.25, 0.12);
      arm.scale.set(1.2, 0.8, 0.8);
      g.add(arm);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), mats.eyeMat);
      eye.position.set(side * 0.24, 1.66, 0.62);
      eye.scale.set(0.8, 1.25, 0.5);
      g.add(eye);
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), mats.cheekMat);
      cheek.position.set(side * 0.42, 1.44, 0.58);
      cheek.scale.set(1.2, 0.7, 0.4);
      g.add(cheek);
    }
    const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), mats.eyeMat);
    mouth.position.set(0, 1.36, 0.66);
    mouth.scale.set(1.0, 0.8, 0.4);
    g.add(mouth);
    g.scale.setScalar(scale);
    return g;
  }

  protected buildPumpkinNight3D(level: LevelConfig): void {
    const course = level.pumpkinCourse || {
      length: 232,
      baseSpeed: 7.8,
      timeLimitSec: 41,
      startBobos: 16,
      maxBobos: 90,
      maxSteerX: 7.4,
      lightMax: 100,
      lightDecayPerSec: 4.5,
      lightRefillPerSec: 110,
      ghostLightCost: 34,
      darkSlowMult: 0.7,
      hitSlowMult: 0.55,
      hitSlowSec: 0.8,
    };
    this.applyPumpkinNightAmbience();
    const L = course.length;

    // 1. Castle floor (flagstones + royal carpet) across the deck; its texture scrolls toward the camera
    const floorTex = this.createPumpkinFloorTexture();
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      emissiveMap: floorTex,
      emissive: 0xffffff,
      emissiveIntensity: 0.34,
      roughness: 0.78,
      metalness: 0.05,
    });
    const floorPlane = new THREE.Mesh(new THREE.PlaneGeometry(TRACK_HALF_W * 2 + 0.6, SLED_SNOW_PLANE_LEN), floorMat);
    floorPlane.rotation.x = -Math.PI / 2;
    floorPlane.position.set(0, 0.03, 0.5);
    floorPlane.receiveShadow = true;
    this.levelGroup.add(floorPlane);

    // 2. Night sky dressing: a pale moon, distant castle keeps with lit windows, drifting will-o'-wisps
    const moon = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: this.getPumpkinMoonTexture(), transparent: true, depthWrite: false, fog: false })
    );
    moon.scale.setScalar(11);
    moon.renderOrder = -1;
    this.levelGroup.add(moon);
    this.placePumpkinMoon(moon);
    const keepMat = new THREE.MeshBasicMaterial({ color: 0x2a1f4d });
    const roofMat = new THREE.MeshBasicMaterial({ color: 0x3b1d6e });
    const windowMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    const keeps: Array<[number, number, number, number]> = [
      [-30, -64, 5.5, 20],
      [-17, -86, 7.0, 30],
      [15, -82, 6.0, 26],
      [31, -60, 5.0, 18],
      [0, -104, 9.0, 36],
    ];
    for (const [kx, kz, kw, kh] of keeps) {
      const keep = new THREE.Mesh(new THREE.BoxGeometry(kw, kh, kw), keepMat);
      keep.position.set(kx, kh / 2 - 4, kz);
      this.levelGroup.add(keep);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(kw * 0.78, kw * 1.1, 4), roofMat);
      roof.position.set(kx, kh - 4 + kw * 0.55, kz);
      roof.rotation.y = Math.PI / 4;
      this.levelGroup.add(roof);
      for (let wi = 0; wi < 3; wi++) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.4, 0.2), windowMat);
        win.position.set(kx + (wi - 1) * kw * 0.26, kh * (0.45 + wi * 0.12) - 4, kz + kw / 2 + 0.12);
        this.levelGroup.add(win);
      }
    }
    const wispPos: number[] = [];
    const wispCol: number[] = [];
    const tint = new THREE.Color();
    for (let c = 0; c < 6; c++) {
      for (let i = 0; i < PK_STARS_PER_CELL; i++) {
        const h1 = Math.sin((i + 1) * 91.7 + c * 3.3) * 43758.5453;
        const h2 = Math.sin((i + 1) * 47.3 + 3.1 + c) * 24634.6345;
        const h3 = Math.sin((i + 1) * 13.1 + 7.7) * 15731.743;
        const f1 = h1 - Math.floor(h1);
        const f2 = h2 - Math.floor(h2);
        const f3 = h3 - Math.floor(h3);
        const side = f1 < 0.5 ? -1 : 1;
        const x = side * (13.6 + f3 * 26);
        const y = 0.6 + f2 * 9;
        wispPos.push(x, y, -150 + c * PK_STAR_CELL + ((f1 * 2) % 1) * PK_STAR_CELL);
        if (f3 < 0.55) tint.setHSL(0.07 + f2 * 0.04, 0.95, 0.62);
        else tint.setHSL(0.76 + f2 * 0.06, 0.8, 0.72);
        wispCol.push(tint.r, tint.g, tint.b);
      }
    }
    const wispGeo = new THREE.BufferGeometry();
    wispGeo.setAttribute('position', new THREE.Float32BufferAttribute(wispPos, 3));
    wispGeo.setAttribute('color', new THREE.Float32BufferAttribute(wispCol, 3));
    const stars = new THREE.Points(
      wispGeo,
      new THREE.PointsMaterial({ size: 0.5, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, sizeAttenuation: true })
    );
    stars.frustumCulled = false;
    this.levelGroup.add(stars);

    // 3. Course group: every course item sits at local z = -d; the group slides toward +z by the distance covered
    const courseGroup = new THREE.Group();
    courseGroup.position.z = SLED_Z;
    this.levelGroup.add(courseGroup);

    const stoneMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0x8b84a8, emissive: 0x241c3d, emissiveIntensity: 0.4, roughness: 0.82 }),
      0.84
    );
    const darkStoneMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0x5f5880, emissive: 0x1d1636, emissiveIntensity: 0.38, roughness: 0.86 }),
      0.84
    );
    const slateRoofMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0x6d28d9, emissive: 0x2e1065, emissiveIntensity: 0.45, roughness: 0.55 }),
      0.84
    );
    const brassMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0xe6b34a, emissive: 0x3b2306, emissiveIntensity: 0.22, roughness: 0.28, metalness: 0.7 }),
      0.82
    );
    const pumpkinMat = new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xea580c, emissiveIntensity: 0.8, roughness: 0.45 });
    const flameFaceMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, emissive: 0x14532d, emissiveIntensity: 0.3, roughness: 0.6 });
    const jackKit = {
      bodyGeo: new THREE.SphereGeometry(0.5, 18, 12),
      lobeGeo: new THREE.SphereGeometry(0.36, 14, 10),
      stemGeo: new THREE.CylinderGeometry(0.06, 0.09, 0.24, 8),
      eyeGeo: new THREE.CircleGeometry(0.11, 3),
      mouthGeo: new THREE.CircleGeometry(0.17, 3),
      bodyMat: pumpkinMat,
      stemMat,
      faceMat: flameFaceMat,
    };

    // 4. Scrolling castle corridor (instanced treadmill shared with the sled course): crenellated side walls, towers,
    //    slate roofs & jack-o'-lanterns on the battlements
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
      for (const side of [-1, 1]) wallRows.push([side * wallX, 1.2, z0, 1.0, 2.4, 4.02]);
    }
    addScenery(new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), darkStoneMat, wallRows.length), wallRows);
    const merlonRows: number[][] = [];
    for (let z0 = 0.4; z0 < SLED_SCENERY_SPAN - 0.01; z0 += 1.4) {
      for (const side of [-1, 1]) merlonRows.push([side * wallX, 2.66, z0, 1.1, 0.56, 0.7]);
    }
    addScenery(new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), stoneMat, merlonRows.length), merlonRows);
    const towerRows: number[][] = [];
    const roofRows: number[][] = [];
    for (let z0 = 3; z0 < SLED_SCENERY_SPAN - 0.01; z0 += 11) {
      for (const side of [-1, 1]) {
        towerRows.push([side * (TRACK_HALF_W + 2.5), 2.6, z0 + side * 2.6, 1.0, 1.0, 1.0]);
        roofRows.push([side * (TRACK_HALF_W + 2.5), 6.2, z0 + side * 2.6, 1.0, 1.0, 1.0]);
      }
    }
    addScenery(new THREE.InstancedMesh(new THREE.CylinderGeometry(1.15, 1.3, 5.2, 12), stoneMat, towerRows.length), towerRows);
    addScenery(new THREE.InstancedMesh(new THREE.ConeGeometry(1.55, 2.2, 12), slateRoofMat, roofRows.length), roofRows);
    const lanternRows: number[][] = [];
    for (let z0 = 1.6; z0 < SLED_SCENERY_SPAN - 0.01; z0 += 8.8) {
      for (const side of [-1, 1]) lanternRows.push([side * wallX, 3.25, z0 + side * 2.2, 0.62, 0.5, 0.58]);
    }
    addScenery(new THREE.InstancedMesh(jackKit.bodyGeo, pumpkinMat, lanternRows.length), lanternRows);
    this.updateSledScenery(0);

    // 5. Castle gate (exit) at the finish line: twin towers, gatehouse arch, a giant jack-o'-lantern & the badge cup
    const exit = new THREE.Group();
    exit.position.set(0, 0, -(L + 1.5));
    exit.userData.pkExitD = L + 1.5;
    for (const side of [-1, 1]) {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.5, 7.4, 14), stoneMat);
      tower.position.set(side * 8.6, 3.7, 0);
      tower.castShadow = true;
      exit.add(tower);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(1.8, 2.8, 14), slateRoofMat);
      roof.position.set(side * 8.6, 8.8, 0);
      exit.add(roof);
      const flag = this.buildJackOLantern(jackKit, 0.9);
      flag.position.set(side * 8.6, 10.6, 0);
      exit.add(flag);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(16.2, 1.2, 1.6), darkStoneMat);
    lintel.position.set(0, 6.6, 0);
    exit.add(lintel);
    for (let i = -6; i <= 6; i += 1.2) {
      const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 1.6), stoneMat);
      merlon.position.set(i, 7.5, 0);
      exit.add(merlon);
    }
    for (let i = -6.6; i <= 6.6; i += 1.1) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.4, 6), brassMat);
      bar.position.set(i, 5.5, 0.2);
      exit.add(bar);
    }
    const bigJack = this.buildJackOLantern(jackKit, 2.3);
    bigJack.position.set(0, 9.2, 0);
    bigJack.userData.pkBob = true;
    exit.add(bigJack);
    const cup = this.buildHallTrophyCupModel(3, 0xfb923c);
    cup.scale.setScalar(1.05);
    cup.position.set(0, 11.6, 0);
    exit.add(cup);
    const finishLine = new THREE.Mesh(
      new THREE.PlaneGeometry(18.6, 0.9),
      new THREE.MeshBasicMaterial({ color: 0xfdba74, transparent: true, opacity: 0.88, depthWrite: false })
    );
    finishLine.rotation.x = -Math.PI / 2;
    finishLine.position.set(0, 0.06, 1.5);
    exit.add(finishLine);
    courseGroup.add(exit);
    this.pumpkinExitGroup = exit;

    // 6. Unit gates (+N / ×N): stone pillars topped with little jack-o'-lanterns
    this.pumpkinGates = [];
    const gateH = 2.8;
    for (const cfg of level.pumpkinGates || []) {
      const group = new THREE.Group();
      group.position.set(cfg.x, 0, -cfg.d);
      for (const side of [-1, 1]) {
        const px = side * (cfg.width * 0.5 - 0.12);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.27, gateH, 10), stoneMat);
        post.position.set(px, gateH * 0.5, 0);
        group.add(post);
        const jack = this.buildJackOLantern(jackKit, 0.52);
        jack.position.set(px, gateH + 0.32, 0);
        group.add(jack);
      }
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, cfg.width - 0.2, 10), brassMat);
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
      this.pumpkinGates.push({ cfg, group, shieldMat, resolved: false, triggered: false });
    }

    // 7. Pumpkin-lantern lit zones: a warm pool of light on the floor + a floating jack-o'-lantern above its centre
    this.pumpkinLamps = [];
    const glowTex = this.getPumpkinGlowTexture();
    const discGeo = new THREE.CircleGeometry(1.0, 48);
    discGeo.rotateX(-Math.PI / 2);
    const ringGeo = new THREE.RingGeometry(0.86, 1.0, 48);
    ringGeo.rotateX(-Math.PI / 2);
    for (const cfg of level.pumpkinLamps || []) {
      const group = new THREE.Group();
      group.position.set(cfg.x, 0, -cfg.d);
      const glowMat = new THREE.MeshBasicMaterial({
        map: glowTex,
        color: 0xff8a1f,
        transparent: true,
        opacity: 1.0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const glow = new THREE.Mesh(discGeo, glowMat);
      glow.scale.setScalar(cfg.radius * 1.15);
      glow.position.y = 0.06;
      glow.renderOrder = 2;
      group.add(glow);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xfdba74, transparent: true, opacity: 0.8, depthWrite: false });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.scale.setScalar(cfg.radius);
      ring.position.y = 0.07;
      ring.renderOrder = 3;
      group.add(ring);
      const flameMat = new THREE.MeshStandardMaterial({ color: 0xfb923c, emissive: 0xf97316, emissiveIntensity: 1.1, roughness: 0.4 });
      const lantern = this.buildJackOLantern({ ...jackKit, bodyMat: flameMat }, 0.95);
      lantern.position.set(0, 3.1, 0);
      lantern.userData.pkLantern = true;
      group.add(lantern);
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 6), brassMat);
      chain.position.set(0, 4.65, 0);
      group.add(chain);
      courseGroup.add(group);
      this.pumpkinLamps.push({ cfg, group, glowMat, ringMat, flameMat, visited: false, passed: false });
    }

    // 8. Wall-phasing ghosts (+ the purple intercept ring where each one crosses the squad's path)
    this.pumpkinGhosts = [];
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1e1b4b });
    const cheekMat = new THREE.MeshBasicMaterial({ color: 0xf9a8d4 });
    for (const cfg of level.pumpkinGhosts || []) {
      const group = new THREE.Group();
      group.position.set(cfg.crossX + cfg.side * 40, 0, -cfg.d);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0xf5f3ff,
        emissive: 0x8b5cf6,
        emissiveIntensity: 0.5,
        roughness: 0.35,
        transparent: true,
        opacity: 0.86,
        depthWrite: false,
      });
      const body = this.buildGhostModel({ bodyMat, eyeMat, cheekMat }, cfg.radius / 1.1);
      group.add(body);
      group.visible = false;
      courseGroup.add(group);
      const markMat = new THREE.MeshBasicMaterial({ color: 0xc084fc, transparent: true, opacity: 0.0, depthWrite: false });
      const mark = new THREE.Mesh(ringGeo, markMat);
      mark.scale.setScalar(cfg.radius + 0.3);
      mark.position.set(cfg.crossX, 0.075, -cfg.d);
      mark.renderOrder = 3;
      courseGroup.add(mark);
      this.pumpkinGhosts.push({
        cfg,
        group,
        body,
        bodyMat,
        markMat,
        x: group.position.x,
        emerged: false,
        outcome: 'none',
        knocked: 0,
        touched: new Set<number>(),
        fade: 0,
        done: false,
      });
    }

    // 9. Inner castle walls with one open archway (ghosts glide straight through them)
    this.pumpkinWalls = [];
    const wallH = 2.4;
    const dangerMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.22, depthWrite: false });
    const doorMat = new THREE.MeshBasicMaterial({ color: 0xfdba74, transparent: true, opacity: 0.55, depthWrite: false });
    for (const cfg of level.pumpkinWalls || []) {
      const group = new THREE.Group();
      group.position.set(0, 0, -cfg.d);
      const lo = cfg.doorX - cfg.doorW * 0.5;
      const hi = cfg.doorX + cfg.doorW * 0.5;
      for (const [x0, x1] of [
        [-TRACK_HALF_W + 0.2, lo],
        [hi, TRACK_HALF_W - 0.2],
      ] as const) {
        const w = x1 - x0;
        if (w <= 0.05) continue;
        const seg = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, PK_WALL_HALF_DEPTH * 1.4), darkStoneMat);
        seg.position.set((x0 + x1) / 2, wallH / 2, 0);
        seg.castShadow = true;
        group.add(seg);
        for (let mx = x0 + 0.45; mx < x1 - 0.3; mx += 1.25) {
          const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.5, PK_WALL_HALF_DEPTH * 1.4), stoneMat);
          merlon.position.set(mx, wallH + 0.25, 0);
          group.add(merlon);
        }
        const strip = new THREE.Mesh(new THREE.PlaneGeometry(w, PK_WALL_HALF_DEPTH * 2.6), dangerMat);
        strip.rotation.x = -Math.PI / 2;
        strip.position.set((x0 + x1) / 2, 0.055, 0.6);
        group.add(strip);
      }
      for (const bx of [lo, hi]) {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.5, wallH + 0.9, PK_WALL_HALF_DEPTH * 1.7), stoneMat);
        pillar.position.set(bx, (wallH + 0.9) / 2, 0);
        group.add(pillar);
        const jack = this.buildJackOLantern(jackKit, 0.48);
        jack.position.set(bx, wallH + 1.25, 0);
        group.add(jack);
      }
      const arch = new THREE.Mesh(new THREE.TorusGeometry(cfg.doorW * 0.5, 0.2, 8, 24, Math.PI), stoneMat);
      arch.position.set(cfg.doorX, wallH + 0.5, 0);
      group.add(arch);
      const doorStrip = new THREE.Mesh(new THREE.PlaneGeometry(cfg.doorW, PK_WALL_HALF_DEPTH * 2.6), doorMat);
      doorStrip.rotation.x = -Math.PI / 2;
      doorStrip.position.set(cfg.doorX, 0.06, 0.6);
      group.add(doorStrip);
      courseGroup.add(group);
      this.pumpkinWalls.push({ cfg, group, knocked: 0, touched: new Set<number>(), hitCounted: false, passed: false });
    }

    // 10. The squad's lantern glow (warm light pool that shrinks / fades as the lantern light drains)
    const glowMat = new THREE.MeshBasicMaterial({
      map: glowTex,
      color: 0xff9a3c,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const glow = new THREE.Mesh(discGeo, glowMat);
    glow.renderOrder = 2;
    this.levelGroup.add(glow);

    const label = document.createElement('div');
    label.className = 'subtower-label pumpkin-night-label';
    label.style.display = 'none';
    this.labelsContainer.appendChild(label);

    const ms = this.state.getPumpkinMilestoneBonus();
    const lightMax = course.lightMax + ms.lightBonus;
    this.pumpkinRun = {
      active: true,
      tier: level.pumpkinTier || 1,
      courseGroup,
      floorTex,
      floorMat,
      stars,
      moon,
      glow,
      glowMat,
      x: 0,
      distance: 0,
      courseLength: L,
      baseSpeed: course.baseSpeed,
      speed: 0,
      timeLeft: course.timeLimitSec,
      timeLimit: course.timeLimitSec,
      maxSteerX: course.maxSteerX,
      maxBobos: course.maxBobos,
      light: lightMax,
      lightMax,
      lightDecayPerSec: course.lightDecayPerSec,
      lightRefillPerSec: course.lightRefillPerSec,
      ghostLightCost: course.ghostLightCost,
      darkSlowMult: course.darkSlowMult,
      hitSlowMult: course.hitSlowMult,
      hitSlowSec: course.hitSlowSec,
      slowTimer: 0,
      darkSec: 0,
      inLamp: false,
      hitFlash: 0,
      sparkTimer: 0,
      state: 'marching',
      labelEl: label,
      hist: new Float32Array(LAVA_HIST_LEN),
      histDist: 0,
      crowdX: 0,
      crowdHalfW: 0,
      crowdDepth: 0,
    };
    this.bossHp = 100;
  }

  /** Spawns the starting Bobo squad in the castle courtyard (start Bobos + 南瓜灯徽章 milestone bonus). */
  protected spawnStartingPumpkinBobos(level: LevelConfig): number {
    const course = level.pumpkinCourse;
    const bonus = this.state.getPumpkinMilestoneBonus().startBonusBobos;
    const n = Math.max(1, Math.min(course?.maxBobos ?? 90, (course?.startBobos ?? 16) + bonus));
    let spawned = 0;
    for (let k = 0; k < n; k++) {
      const slot = this.getLavaSlot(k, n, 0);
      const u = this.spawnUnit('blue', 'normal', slot.x, slot.z, 0, 0);
      if (u) {
        u.spawnHop = 0;
        u.rideY = PK_RIDE_BASE;
        u.sledSlotX = slot.x;
        u.sledSlotZ = slot.z;
        spawned++;
      }
    }
    this.pumpkinPeakBobos = spawned;
    this.pumpkinBoboCount = spawned;
    return spawned;
  }

  public getPumpkinProgressPct(): number {
    const s = this.pumpkinRun;
    if (!s) return 0;
    return Math.max(0, Math.min(100, Math.round((s.distance / Math.max(1, s.courseLength)) * 100)));
  }

  public getPumpkinLightPct(): number {
    const s = this.pumpkinRun;
    if (!s) return 0;
    return Math.max(0, Math.min(100, Math.round((s.light / Math.max(1, s.lightMax)) * 100)));
  }

  /** Gate rows the squad front has reached, and the total number of gate rows. */
  public getPumpkinGateProgress(): { reached: number; total: number } {
    const ds = new Set<number>();
    const reached = new Set<number>();
    for (const g of this.pumpkinGates) {
      ds.add(g.cfg.d);
      if (g.resolved) reached.add(g.cfg.d);
    }
    return { reached: reached.size, total: ds.size };
  }

  /** Ghosts already dealt with (dispelled / dodged / scared) and the total. */
  public getPumpkinGhostProgress(): { resolved: number; total: number } {
    let resolved = 0;
    for (const gh of this.pumpkinGhosts) if (gh.done || gh.outcome !== 'none') resolved++;
    return { resolved, total: this.pumpkinGhosts.length };
  }

  public getPumpkinStateLabel(): string {
    const s = this.pumpkinRun;
    if (!s) return '尚未出发';
    switch (s.state) {
      case 'stumbled':
        return '受惊踉跄';
      case 'lit':
        return '南瓜灯补光中';
      case 'dark':
        return '灯灭摸黑前进';
      case 'finished':
        return '冲出古堡城门';
      case 'timeout':
        return '超时被困古堡';
      case 'wiped':
        return '波波全被吓跑';
      default:
        return '提灯夜行中';
    }
  }

  /** Re-seats every Bobo on its formation slot behind the current line (self-checks). */
  public snapPumpkinBobosToSlots(): void {
    const s = this.pumpkinRun;
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
      u.rideY = PK_RIDE_BASE;
    }
  }

  /** A ghost scare / wall bump: a candy (frost / pet) shell absorbs it instead. Returns true if the Bobo is lost. */
  protected knockPumpkinBobo(u: Unit, silent = false): boolean {
    if (!u.active || u.team !== 'blue') return false;
    if (u.frostShield) {
      u.frostShield = false;
      u.petShellGranted = false;
      if (!silent) this.spawnBurstParticles(u.x, 0.9, u.z, 0x7dd3fc, 4);
      return false;
    }
    u.active = false;
    this.pumpkinBobosLost += 1;
    if (!silent) {
      this.spawnBurstParticles(u.x, 0.9, u.z, 0xddd6fe, 6);
      this.spawnBurstParticles(u.x, 1.3, u.z, 0xfb923c, 3);
    }
    return true;
  }

  private applyPumpkinGate(g: PumpkinGateRuntime, silent = false): number {
    const s = this.pumpkinRun;
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
        u.rideY = PK_RIDE_BASE;
        added++;
      }
    }
    this.pumpkinGatesPassed += 1;
    this.pumpkinPeakBobos = Math.max(this.pumpkinPeakBobos, bobos + added);
    if (!silent) {
      sound.playCloneGate(g.cfg.op === 'mul' ? 3 : 2);
      this.spawnBurstParticles(s.x, 1.8, SLED_Z - 1.2, g.cfg.op === 'mul' ? 0xfacc15 : 0xfdba74, 22);
      this.spawnShockwave(s.x, SLED_Z - 0.8, g.cfg.op === 'mul' ? 0xfacc15 : 0xfb923c, 4.0, 0.35);
      this.spawnFloatingPopup(
        s.x,
        3.2,
        SLED_Z - 1.0,
        added < n || n < want ? `+${added} 波波 (满员)` : `+${added} 波波加入!`,
        g.cfg.op === 'mul' ? '#fde047' : '#fed7aa'
      );
    }
    return added;
  }

  private pumpkinStumble(cause: string, silent = false): void {
    const s = this.pumpkinRun;
    if (!s) return;
    s.slowTimer = Math.max(s.slowTimer, s.hitSlowSec);
    s.hitFlash = 1.0;
    if (!silent) {
      this.addCameraShake(0.26);
      this.spawnFloatingPopup(s.x, 3.6, SLED_Z - 1.0, cause, '#e9d5ff');
    }
  }

  /** Lamp zone containing course point (x, du), or null. */
  protected findPumpkinLampAt(x: number, du: number, margin = 0): PumpkinLampRuntime | null {
    for (const lp of this.pumpkinLamps) {
      const r = Math.max(0, lp.cfg.radius - margin);
      const dx = x - lp.cfg.x;
      const dd = du - lp.cfg.d;
      if (dx * dx + dd * dd <= r * r) return lp;
    }
    return null;
  }

  /**
   * Autopilot target x (self-checks / screenshots / demo): picks bigger gates, steps into lit zones when the lantern
   * runs low, swings wide of ghost intercept points it cannot dispel and threads archways, peeking two events ahead.
   */
  public getPumpkinAutopilotX(): number {
    const s = this.pumpkinRun;
    if (!s) return 0;
    const n = this.pumpkinBoboCount || this.getLavaBoboCount();
    const half = this.getLavaSquadHalfWidth(n);
    const depth = Math.max(0.6, Math.ceil(Math.max(1, n) / this.getLavaSquadCols(n)) * LAVA_ROW_SPACING);
    const frontDu = s.distance + PK_FRONT_OFFSET;
    const pace = Math.max(1, s.speed || s.baseSpeed);
    type Ev = { d: number; score: (x: number) => number };
    const evs: Ev[] = [];
    const gateDs = new Map<number, PumpkinGateRuntime[]>();
    for (const g of this.pumpkinGates) {
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
    for (const lp of this.pumpkinLamps) {
      if (lp.passed || lp.cfg.d < frontDu - lp.cfg.radius * 0.5 || lp.cfg.d > frontDu + 40) continue;
      const lightAtLamp = Math.max(0, s.light - s.lightDecayPerSec * Math.max(0, lp.cfg.d - frontDu) / pace);
      const need = Math.max(0, s.lightMax - lightAtLamp);
      evs.push({
        d: lp.cfg.d,
        score: (x: number) => {
          const off = Math.abs(x - lp.cfg.x);
          return off <= lp.cfg.radius - 0.6 ? 8 + need * 0.5 - off * 1.5 : 0;
        },
      });
    }
    for (const gh of this.pumpkinGhosts) {
      if (gh.done || gh.outcome !== 'none' || gh.cfg.d < frontDu - gh.cfg.radius - 0.4 || gh.cfg.d > frontDu + 40) continue;
      const lightAtGhost = Math.max(0, s.light - s.lightDecayPerSec * Math.max(0, gh.cfg.d - frontDu) / pace);
      const canDispel = lightAtGhost >= s.ghostLightCost + 4;
      // While the squad rows pass the ghost's row it keeps sliding: cover the whole sweep across the formation depth
      const sweepEnd = gh.cfg.crossX - gh.cfg.side * gh.cfg.sweep * depth;
      const gLo = Math.min(gh.cfg.crossX, sweepEnd) - gh.cfg.radius - 0.35;
      const gHi = Math.max(gh.cfg.crossX, sweepEnd) + gh.cfg.radius + 0.35;
      evs.push({
        d: gh.cfg.d,
        score: (x: number) => {
          if (this.findPumpkinLampAt(x, gh.cfg.d - gh.cfg.radius, 0.3)) return 0;
          const overlap = Math.min(x + half, gHi) - Math.max(x - half, gLo);
          if (overlap <= 0) return 0;
          return (canDispel ? -12 : -240) - overlap * 20;
        },
      });
    }
    for (const w of this.pumpkinWalls) {
      if (w.passed || w.cfg.d < frontDu - PK_WALL_HALF_DEPTH - 0.3 || w.cfg.d > frontDu + 40) continue;
      evs.push({
        d: w.cfg.d,
        score: (x: number) => {
          const room = w.cfg.doorW * 0.5 - half - 0.25;
          const off = Math.abs(x - w.cfg.doorX);
          if (off <= Math.max(0, room)) return 0;
          return -220 - (off - Math.max(0, room)) * 60;
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

  protected updatePumpkinNight(dt: number): void {
    const s = this.pumpkinRun;
    const level = this.currentLevel;
    if (!s || !s.active || !level) return;
    const t = this.elapsedTime;

    // 1. Steering (the squad follows the cannon's lateral aim), lantern light (drain / lit-zone refill) & pace
    const steerX = THREE.MathUtils.clamp(this.turretX, -s.maxSteerX, s.maxSteerX);
    s.x = THREE.MathUtils.lerp(s.x, steerX, Math.min(1, dt * 6.0));
    const lampNow = this.findPumpkinLampAt(s.x, s.distance + PK_FRONT_OFFSET);
    s.inLamp = Boolean(lampNow);
    if (lampNow) {
      s.light = Math.min(s.lightMax, s.light + s.lightRefillPerSec * dt);
      if (!lampNow.visited) {
        lampNow.visited = true;
        this.pumpkinLampsLit += 1;
        this.spawnBurstParticles(lampNow.cfg.x, 2.6, SLED_Z - 1.0, 0xfdba74, 18);
        this.spawnFloatingPopup(s.x, 3.4, SLED_Z - 1.0, '南瓜灯补光!', '#fed7aa');
      }
    } else {
      s.light = Math.max(0, s.light - s.lightDecayPerSec * dt);
    }
    if (s.light <= 0) s.darkSec += dt;
    let target = s.baseSpeed * this.getTacticRushMult();
    if (s.slowTimer > 0) {
      s.slowTimer = Math.max(0, s.slowTimer - dt);
      target *= s.hitSlowMult;
    }
    if (s.light <= 0) target *= s.darkSlowMult;
    s.speed = THREE.MathUtils.lerp(s.speed, target, Math.min(1, dt * (target > s.speed ? 2.2 : 5.0)));
    s.distance = Math.min(s.courseLength, s.distance + s.speed * dt);
    s.timeLeft = Math.max(0, s.timeLeft - dt);
    s.state = s.slowTimer > 0 ? 'stumbled' : s.inLamp ? 'lit' : s.light <= 0 ? 'dark' : 'marching';
    s.hitFlash = Math.max(0, s.hitFlash - dt * 2);
    this.bossHp = Math.max(0, 100 - this.getPumpkinProgressPct());

    // 2. Scroll the castle toward the camera, drift the will-o'-wisps & the treadmill corridor
    s.courseGroup.position.z = SLED_Z + s.distance;
    if (s.floorTex) s.floorTex.offset.y = (s.distance / PK_FLOOR_TILE_M) % 1;
    s.floorMat.emissiveIntensity = 0.32 + Math.sin(t * 1.4) * 0.03;
    s.stars.position.z = (s.distance * 0.25) % PK_STAR_CELL;
    s.stars.position.y = Math.sin(t * 0.9) * 0.3;
    this.placePumpkinMoon(s.moon);
    this.updateSledScenery(s.distance);
    if (this.pumpkinExitGroup) {
      const ed = (this.pumpkinExitGroup.userData.pkExitD as number) || s.courseLength;
      this.pumpkinExitGroup.visible = SLED_Z + s.distance - ed > -SLED_DECK_HALF - 30;
      for (const c of this.pumpkinExitGroup.children) if (c.userData.pkBob) c.position.y = 9.2 + Math.sin(t * 2.0) * 0.25;
    }
    s.sparkTimer -= dt;
    if (s.sparkTimer <= 0) {
      s.sparkTimer = 0.16;
      const side = Math.random() < 0.5 ? -1 : 1;
      this.spawnBurstParticles(
        side * (TRACK_HALF_W + 1.2 + Math.random() * 3),
        2.2 + Math.random() * 2.5,
        SLED_Z - 16 + Math.random() * 26,
        Math.random() < 0.5 ? 0xfdba74 : 0xc4b5fd,
        1
      );
    }

    // 3. Squad formation: the lead line is recorded along the course and every row follows that exact path a little
    //    later; every Bobo marches with a small hop.
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
      u.rideY = PK_RIDE_BASE + 0.1 * hop * Math.abs(Math.sin(t * 7.0 + k * 0.9));
      u.x = THREE.MathUtils.lerp(u.x, slotX, pin);
      u.z = THREE.MathUtils.lerp(u.z, slot.z, pin);
      xSum += u.x;
      trailEndZ = Math.max(trailEndZ, u.z);
      k++;
    }
    const alive = k;
    this.pumpkinBoboCount = alive;
    s.crowdX = alive > 0 ? xSum / alive : s.x;
    s.crowdHalfW = this.getLavaSquadHalfWidth(Math.max(1, alive));
    s.crowdDepth = Math.max(0.6, Math.ceil(Math.max(1, alive) / cols) * LAVA_ROW_SPACING);

    // 4. The squad's lantern glow follows the light level
    const lf = s.light / Math.max(1, s.lightMax);
    s.glow.visible = alive > 0 && lf > 0.01;
    if (s.glow.visible) {
      s.glowMat.opacity = Math.min(0.85, (0.24 + 0.5 * lf) * (s.inLamp ? 1.15 : 1) * (0.92 + Math.sin(t * 5.3) * 0.08));
      const gr = (s.crowdHalfW + 1.8) * (0.55 + 0.45 * lf);
      s.glow.position.set(s.crowdX, 0.07, SLED_Z - 0.9 + s.crowdDepth * 0.5 - 0.2);
      s.glow.scale.set(gr, 1, Math.max(gr, s.crowdDepth * 0.6 + 1.4));
    }

    // 5. Gates: when the squad front reaches a gate row, the gate under the squad centre triggers (pair resolves)
    const frontDu = s.distance + PK_FRONT_OFFSET;
    for (const g of this.pumpkinGates) {
      const wz = SLED_Z + s.distance - g.cfg.d;
      g.group.visible = wz > -SLED_DECK_HALF - 8 && wz < SLED_DECK_HALF + 3;
      if (g.resolved || frontDu < g.cfg.d) continue;
      for (const g2 of this.pumpkinGates) {
        if (g2.resolved || g2.cfg.d !== g.cfg.d) continue;
        g2.resolved = true;
        if (Math.abs(leadX - g2.cfg.x) <= g2.cfg.width * 0.5) this.applyPumpkinGate(g2);
        else g2.shieldMat.opacity = 0.5;
      }
    }

    // 6. Lit zones: floating lanterns bob, the light pool flickers; a zone is passed once the whole squad is through
    for (const lp of this.pumpkinLamps) {
      const worldZ = SLED_Z + s.distance - lp.cfg.d;
      lp.group.visible = worldZ > -SLED_DECK_HALF - 8 && worldZ < SLED_DECK_HALF + 3;
      if (lp.group.visible) {
        const ph = lp.cfg.d * 0.37;
        lp.glowMat.opacity = 0.88 + Math.sin(t * 6.2 + ph) * 0.08 + Math.sin(t * 13.7 + ph) * 0.04;
        lp.ringMat.opacity = lp === lampNow ? 0.95 : 0.6 + Math.sin(t * 3 + ph) * 0.15;
        lp.flameMat.emissiveIntensity = 1.0 + Math.sin(t * 9 + ph) * 0.2;
        for (const c of lp.group.children) {
          if (c.userData.pkLantern) {
            c.position.y = 3.1 + Math.sin(t * 1.8 + ph) * 0.18;
            c.rotation.y = Math.sin(t * 0.9 + ph) * 0.35;
          }
        }
      }
      if (!lp.passed && worldZ > trailEndZ + lp.cfg.radius) lp.passed = true;
    }

    // 7. Wall-phasing ghosts: each glides out of the side wall in lock-step with the squad's progress and sweeps through
    //    the formation at its intercept point. The lit zone (free) or the squad lantern (costs light) dispels it on touch;
    //    otherwise it scares the Bobos it brushes (capped; a candy shield absorbs one touch).
    const wallX = TRACK_HALF_W + 0.8;
    for (const gh of this.pumpkinGhosts) {
      if (gh.done) continue;
      const worldZ = SLED_Z + s.distance - gh.cfg.d;
      const toGo = gh.cfg.d - frontDu;
      gh.x = gh.cfg.crossX + gh.cfg.side * gh.cfg.sweep * toGo;
      const inRange = worldZ > -SLED_DECK_HALF - 8 && worldZ < SLED_DECK_HALF + 3 && toGo <= PK_GHOST_WAKE;
      gh.group.visible = inRange && Math.abs(gh.x) < TRACK_HALF_W + 4.5;
      gh.group.position.x = gh.x;
      gh.body.position.y = 0.25 + Math.sin(t * 3.1 + gh.cfg.d) * 0.18;
      gh.body.rotation.z = Math.sin(t * 2.3 + gh.cfg.d) * 0.12 + gh.cfg.side * 0.18;
      if (gh.outcome === 'dispelled' || gh.outcome === 'lamp') {
        gh.fade += dt;
        gh.bodyMat.opacity = Math.max(0, 0.86 - gh.fade * 1.7);
        gh.body.scale.setScalar((gh.cfg.radius / 1.1) * (1 + gh.fade * 0.9));
        gh.body.position.y += gh.fade * 2.2;
        gh.markMat.opacity = Math.max(0, 0.6 - gh.fade * 1.4);
        if (gh.fade > 0.5) {
          gh.done = true;
          gh.group.visible = false;
          gh.markMat.opacity = 0;
        }
        continue;
      }
      const inWall = Math.abs(gh.x) > wallX - 0.6;
      gh.bodyMat.opacity = inWall ? 0.38 : 0.86;
      gh.bodyMat.emissiveIntensity = 0.45 + Math.sin(t * 4.0 + gh.cfg.d) * 0.12;
      gh.markMat.opacity = inRange && gh.outcome === 'none' && worldZ < trailEndZ ? 0.55 + Math.sin(t * 7 + gh.cfg.d) * 0.3 : 0;
      if (!gh.emerged && inRange && Math.abs(gh.x) < wallX) {
        gh.emerged = true;
        if (worldZ > -SLED_DECK_HALF) {
          this.spawnBurstParticles(gh.cfg.side * wallX, 1.6, worldZ, 0xc4b5fd, 14);
          this.spawnFloatingPopup(gh.cfg.side * 2.5, 3.0, worldZ, '幽灵穿墙而出!', '#e9d5ff');
        }
      }
      const r = gh.cfg.radius;
      if (gh.emerged || Math.abs(gh.x) < wallX) {
        for (let i = 0; i < MAX_UNITS && gh.knocked < gh.cfg.knockCap; i++) {
          const u = this.units[i];
          if (!u.active || u.team !== 'blue' || gh.touched.has(u.id)) continue;
          const dx = u.x - gh.x;
          const ddu = s.distance + (SLED_Z - u.z) - gh.cfg.d;
          if (dx * dx + ddu * ddu > r * r) continue;
          if (gh.outcome === 'none') {
            if (s.inLamp) {
              gh.outcome = 'lamp';
              this.pumpkinGhostsDispelled += 1;
              this.pumpkinLampDispels += 1;
              sound.playUpgrade();
              this.spawnShockwave(gh.x, worldZ, 0xfdba74, 4.2, 0.4);
              this.spawnBurstParticles(gh.x, 1.8, worldZ, 0xfde68a, 20);
              this.spawnFloatingPopup(gh.x, 3.4, worldZ, '照明区驱散幽灵!', '#fde68a');
              break;
            }
            if (s.light >= s.ghostLightCost) {
              gh.outcome = 'dispelled';
              s.light = Math.max(0, s.light - s.ghostLightCost);
              this.pumpkinGhostsDispelled += 1;
              sound.playCloneGate(2);
              this.spawnShockwave(gh.x, worldZ, 0xfb923c, 3.6, 0.38);
              this.spawnBurstParticles(gh.x, 1.8, worldZ, 0xfed7aa, 16);
              this.spawnFloatingPopup(gh.x, 3.4, worldZ, `灯光驱鬼 -${s.ghostLightCost}`, '#fed7aa');
              break;
            }
            gh.outcome = 'scared';
            this.pumpkinGhostHits += 1;
            this.pumpkinStumble('幽灵吓跑波波!');
          }
          gh.touched.add(u.id);
          if (this.knockPumpkinBobo(u)) gh.knocked++;
        }
        if (gh.outcome === 'dispelled' || gh.outcome === 'lamp') continue;
      }
      if (worldZ > trailEndZ + r + 1.0 || worldZ > SLED_DECK_HALF + 2 || gh.x * gh.cfg.side < -(TRACK_HALF_W + 4.5)) {
        gh.done = true;
        gh.group.visible = false;
        gh.markMat.opacity = 0;
        if (gh.outcome === 'none') this.pumpkinHazardsDodged += 1;
        else if (gh.knocked > 0) this.spawnFloatingPopup(gh.cfg.crossX, 2.6, Math.min(16, SLED_Z + 5), `幽灵吓跑 -${gh.knocked} 波波`, '#e9d5ff');
      }
    }

    // 8. Inner castle walls: Bobos crossing outside the open archway bump into the stones (capped per wall)
    for (const w of this.pumpkinWalls) {
      const worldZ = SLED_Z + s.distance - w.cfg.d;
      w.group.visible = worldZ > -SLED_DECK_HALF - 8 && worldZ < SLED_DECK_HALF + 3;
      if (w.passed) continue;
      const halfDoor = w.cfg.doorW * 0.5;
      for (let i = 0; i < MAX_UNITS && w.knocked < w.cfg.knockCap; i++) {
        const u = this.units[i];
        if (!u.active || u.team !== 'blue' || w.touched.has(u.id)) continue;
        const du = s.distance + (SLED_Z - u.z);
        if (Math.abs(du - w.cfg.d) > PK_WALL_HALF_DEPTH) continue;
        if (Math.abs(u.x - w.cfg.doorX) <= halfDoor) continue;
        w.touched.add(u.id);
        if (this.knockPumpkinBobo(u)) w.knocked++;
      }
      if (w.knocked > 0 && !w.hitCounted) {
        w.hitCounted = true;
        this.pumpkinWallHits += 1;
        this.pumpkinStumble('撞上城墙!');
      }
      if (worldZ > trailEndZ + 1.2) {
        w.passed = true;
        if (w.knocked === 0) this.pumpkinHazardsDodged += 1;
        else this.spawnFloatingPopup(w.cfg.doorX, 2.2, Math.min(16, worldZ), `城墙 -${w.knocked} 波波`, '#fda4af');
      }
    }

    // 9. Resolution: run out through the castle gate = victory; countdown out or every Bobo scared off = defeat
    const aliveNow = this.getLavaBoboCount();
    this.pumpkinBoboCount = aliveNow;
    if (s.distance >= s.courseLength - 0.001 && aliveNow > 0) {
      s.active = false;
      s.state = 'finished';
      s.labelEl.style.display = 'none';
      s.glow.visible = false;
      this.pumpkinFinishSec = Number((s.timeLimit - s.timeLeft).toFixed(2));
      this.bossHp = 0;
      this.spawnSkyPillar(s.x, SLED_Z - 2, 0xfb923c, 3.6, 0.7);
      this.spawnShockwave(s.x, SLED_Z, 0xfdba74, 11.0, 0.7);
      this.spawnBurstParticles(s.x, 2.2, SLED_Z - 1, 0xfed7aa, 60);
      this.finishStage(true);
      this.onBanner?.(
        `${UI_ART.pumpkinNight} 波波团冲出古堡城门！`,
        `用时 ${this.pumpkinFinishSec.toFixed(1)}s / 限时 ${s.timeLimit}s · 幸存波波 ${aliveNow} 只 · 驱散幽灵 ${this.pumpkinGhostsDispelled} 只`
      );
      return;
    }
    if (s.timeLeft <= 0 || aliveNow <= 0) {
      s.active = false;
      s.state = aliveNow <= 0 ? 'wiped' : 'timeout';
      s.labelEl.style.display = 'none';
      s.glow.visible = false;
      this.pumpkinFinishSec = Number((s.timeLimit - s.timeLeft).toFixed(2));
      this.spawnBurstParticles(s.x, 1.4, SLED_Z, 0xddd6fe, 40);
      this.onBanner?.(
        `${UI_ART.warning} ${s.state === 'wiped' ? '波波全被幽灵吓跑' : '超时被困在古堡里'}！`,
        `前进 ${Math.round(s.distance)}/${s.courseLength}m · 已损失 ${this.pumpkinBobosLost} 只波波`
      );
      this.finishStage(false);
    }
  }
}
