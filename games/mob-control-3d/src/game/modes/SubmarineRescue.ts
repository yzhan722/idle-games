/** MC-11 深海潜艇泡泡营救战：从 World3D 原样搬出的方法（字段仍在 World3D）。继承链见 ../World3DFull.ts。 */
import * as THREE from 'three';
import {
  LevelConfig,
} from '../../levels/LevelData';
import { UI_ART } from '../SkillIcons';
import { sound } from '../../audio/SoundManager';
import {
  stylizeMaterialAs2DIllustration,
} from '../SceneThemes';
import {
  CoralBarrierRuntime,
  JellyfishRuntime,
  MAX_UNITS,
  RescueBubbleRuntime,
  TRACK_HALF_W,
} from '../WorldTypes';
import { AsteroidDashMode } from './AsteroidDash';

export abstract class SubmarineRescueMode extends AsteroidDashMode {
  // ============================================================================
  // MC-11: Deep-Sea Submarine Bubble Rescue (3D toy submarine, coral walls, rescue bubbles, jellyfish)
  // ============================================================================

  /** Deep-sea tint on top of the ocean theme (re-applied every load; applyTheme restores other modes). */
  private applyUnderwaterAmbience(): void {
    this.scene.background = new THREE.Color(0x0b4a68);
    this.scene.fog = new THREE.FogExp2(0x1b7fa8, 0.0135);
    if (this.abyssShaderMat?.uniforms) {
      this.abyssShaderMat.uniforms.uBaseColor.value.set('#1f8fbf');
      this.abyssShaderMat.uniforms.uVeinColor.value.set('#8ee6ff');
    }
    this.hemiLight.color.setHex(0xa5f3fc);
    this.hemiLight.groundColor.setHex(0x0c4a6e);
    this.hemiLight.intensity *= 0.94;
    this.dirLight.color.setHex(0xc4f1ff);
    this.dirLight.intensity *= 0.8;
    this.rimLight.color.setHex(0x22d3ee);
    this.bossLight.color.setHex(0x38bdf8);
  }

  protected buildSubmarineRescue3D(level: LevelConfig): void {
    const lane = level.submarineLane || {
      startZ: 14.6,
      dockZ: -14.2,
      maxSteerX: 6.4,
      baseSpeed: 1.0,
      hullHp: 640,
      oxygenSec: 105,
      torpedoIntervalSec: 1.7,
      torpedoDmg: 70,
    };
    this.applyUnderwaterAmbience();
    const env = new THREE.Group();

    // 1. Glowing bubble-lane floor rings from the home dock to the rescue station
    const laneMat = new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const laneRingGeo = new THREE.RingGeometry(0.4, 0.6, 24);
    laneRingGeo.rotateX(-Math.PI / 2);
    for (let z = lane.startZ - 1.8; z > lane.dockZ + 0.5; z -= 2.1) {
      const ring = new THREE.Mesh(laneRingGeo, laneMat);
      ring.position.set(0, 0.06, z);
      ring.renderOrder = 1;
      env.add(ring);
    }

    // 2. Swaying kelp forest along both bridge edges
    this.subKelp = [];
    const kelpMats = [0x22c55e, 0x16a34a, 0x4ade80].map((hex) =>
      stylizeMaterialAs2DIllustration(
        new THREE.MeshStandardMaterial({ color: hex, emissive: 0x14532d, emissiveIntensity: 0.12, roughness: 0.5 }),
        0.8
      )
    );
    const kelpSegGeo = new THREE.CapsuleGeometry(0.15, 0.85, 3, 8);
    const kelpLeafGeo = new THREE.SphereGeometry(0.26, 8, 6);
    let kelpIdx = 0;
    for (const side of [-1, 1]) {
      for (let z = 21; z > -21; z -= 3.3) {
        const kelp = new THREE.Group();
        kelp.position.set(side * (TRACK_HALF_W + 0.9 + ((kelpIdx * 37) % 9) * 0.1), 0, z + ((kelpIdx * 13) % 7) * 0.18);
        const segs = 3 + (kelpIdx % 2);
        for (let s = 0; s < segs; s++) {
          const seg = new THREE.Mesh(kelpSegGeo, kelpMats[(kelpIdx + s) % kelpMats.length]);
          seg.position.set(Math.sin(s * 1.3) * 0.12, 0.55 + s * 0.95, 0);
          kelp.add(seg);
          const leaf = new THREE.Mesh(kelpLeafGeo, kelpMats[(kelpIdx + s + 1) % kelpMats.length]);
          leaf.scale.set(1.0, 0.28, 0.5);
          leaf.position.set((s % 2 === 0 ? 1 : -1) * 0.28, 0.85 + s * 0.95, 0);
          leaf.rotation.z = s % 2 === 0 ? -0.5 : 0.5;
          kelp.add(leaf);
        }
        kelp.userData.phase = kelpIdx * 0.77;
        env.add(kelp);
        this.subKelp.push(kelp);
        kelpIdx++;
      }
    }

    // 3. Slanted sunlight shafts filtering down through the water
    const shaftMat = new THREE.MeshBasicMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.06,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const shaftGeo = new THREE.PlaneGeometry(2.6, 26);
    for (let k = 0; k < 5; k++) {
      const shaft = new THREE.Mesh(shaftGeo, shaftMat);
      shaft.position.set(-12 + k * 6, 9, -6 + k * 3.4);
      shaft.rotation.set(0, 0.4 - k * 0.18, 0.32);
      env.add(shaft);
    }

    // 4. Rising ambient bubbles (single instanced draw)
    const bubbleCount = 72;
    const ambGeo = new THREE.SphereGeometry(0.11, 8, 6);
    const ambMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x7dd3fc,
      emissiveIntensity: 0.35,
      roughness: 0.05,
      metalness: 0.1,
      transparent: true,
      opacity: 0.6,
    });
    const amb = new THREE.InstancedMesh(ambGeo, ambMat, bubbleCount);
    amb.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const ambData = new Float32Array(bubbleCount * 4);
    for (let i = 0; i < bubbleCount; i++) {
      ambData[i * 4] = (Math.random() - 0.5) * 30;
      ambData[i * 4 + 1] = Math.random() * 11;
      ambData[i * 4 + 2] = -22 + Math.random() * 44;
      ambData[i * 4 + 3] = 0.6 + Math.random() * 0.9;
    }
    amb.frustumCulled = false;
    env.add(amb);
    this.subAmbientBubbles = amb;
    this.subAmbientBubbleData = ambData;

    // 5. Rescue station (deep-sea dock) at the far end of the bubble lane
    const dockGroup = new THREE.Group();
    dockGroup.position.set(0, 0, lane.dockZ - 1.8);
    const dockBrass = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0xf5c04a, emissive: 0x3b2306, emissiveIntensity: 0.16, roughness: 0.26, metalness: 0.68 }),
      0.82
    );
    const dockTeal = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0x0d9488, emissive: 0x134e4a, emissiveIntensity: 0.2, roughness: 0.34, metalness: 0.2 }),
      0.82
    );
    const dockGlow = new THREE.MeshStandardMaterial({
      color: 0xccfbf1,
      emissive: 0x2dd4bf,
      emissiveIntensity: 0.9,
      roughness: 0.2,
    });
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.6, 0.36, 32), dockTeal);
    pad.position.y = 0.18;
    pad.receiveShadow = true;
    dockGroup.add(pad);
    const padRim = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.12, 8, 40), dockBrass);
    padRim.rotation.x = Math.PI / 2;
    padRim.position.y = 0.38;
    dockGroup.add(padRim);
    const arch = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.22, 12, 40, Math.PI), dockBrass);
    arch.position.set(0, 0.36, 1.8);
    dockGroup.add(arch);
    const archGlow = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.08, 8, 40, Math.PI), dockGlow);
    archGlow.position.set(0, 0.36, 1.95);
    dockGroup.add(archGlow);
    const beaconPole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 3.4, 12), dockBrass);
    beaconPole.position.set(2.8, 2.0, -0.6);
    dockGroup.add(beaconPole);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 14), dockGlow);
    beacon.position.set(2.8, 3.9, -0.6);
    dockGroup.add(beacon);
    const ringBuoyMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0xfb7185, roughness: 0.32, metalness: 0.05 }),
      0.82
    );
    for (const bx of [-2.6, -1.6]) {
      const buoy = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.14, 10, 22), ringBuoyMat);
      buoy.position.set(bx, 0.62, -1.4);
      buoy.rotation.x = Math.PI / 2;
      dockGroup.add(buoy);
    }
    env.add(dockGroup);
    this.levelGroup.add(env);

    // 6. Coral reef barriers sealing the lane
    this.coralBarriers = [];
    const coralPalettes = [
      [0xf472b6, 0xfb7185, 0xfda4af],
      [0xa78bfa, 0xc084fc, 0xe879f9],
      [0xf59e0b, 0xfb923c, 0xfcd34d],
    ];
    const rockMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0x51677d, roughness: 0.6, metalness: 0.04 }),
      0.8
    );
    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.22, 1.25, 8);
    const branchGeo = new THREE.CylinderGeometry(0.07, 0.12, 0.85, 7);
    const tipGeo = new THREE.SphereGeometry(0.16, 10, 8);
    const brainGeo = new THREE.SphereGeometry(0.46, 14, 10);
    const rockGeo = new THREE.SphereGeometry(1.3, 14, 10);
    const sortedCorals = [...(level.coralBarriers || [])].sort((a, b) => b.z - a.z);
    sortedCorals.forEach((cfg, idx) => {
      const pal = coralPalettes[idx % coralPalettes.length];
      const mats = pal.map((hex) =>
        stylizeMaterialAs2DIllustration(
          new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: 0.2, roughness: 0.34, metalness: 0.06 }),
          0.84
        )
      );
      const group = new THREE.Group();
      group.position.set(0, 0, cfg.z);
      for (let r = -2; r <= 2; r++) {
        const rock = new THREE.Mesh(rockGeo, rockMat);
        rock.scale.set(1.75, 0.5, 0.85);
        rock.position.set(r * 4.3, 0.1, ((r + 3) % 2) * 0.25);
        rock.receiveShadow = true;
        group.add(rock);
      }
      const chunks: THREE.Object3D[] = [];
      for (let c = 0; c < 8; c++) {
        const cx = -9.45 + c * 2.7 + (((c * 7 + idx * 3) % 5) - 2) * 0.12;
        const cluster = new THREE.Group();
        cluster.position.set(cx, 0.3, (((c + idx) % 3) - 1) * 0.22);
        cluster.scale.setScalar(1.65);
        const h = 0.9 + ((c * 5 + idx) % 4) * 0.14;
        const trunk = new THREE.Mesh(trunkGeo, mats[0]);
        trunk.scale.y = h;
        trunk.position.y = 0.6 * h;
        trunk.castShadow = true;
        cluster.add(trunk);
        for (const side of [-1, 1]) {
          const branch = new THREE.Mesh(branchGeo, mats[(c + 1) % 3]);
          branch.rotation.z = side * 0.62;
          branch.position.set(side * 0.28, 0.95 * h, 0);
          cluster.add(branch);
          const tip = new THREE.Mesh(tipGeo, mats[1]);
          tip.position.set(side * 0.54, 1.3 * h, 0);
          cluster.add(tip);
        }
        if (c % 2 === 0) {
          const brain = new THREE.Mesh(brainGeo, mats[2]);
          brain.scale.set(1, 0.7, 1);
          brain.position.set(0.55, 0.1, 0.3);
          cluster.add(brain);
        }
        group.add(cluster);
        chunks.push(cluster);
      }
      const glowMat = new THREE.MeshBasicMaterial({
        color: pal[0],
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(21.5, 3.4), glowMat);
      glow.position.set(0, 1.7, 0);
      group.add(glow);
      this.levelGroup.add(group);

      const labelEl = document.createElement('div');
      labelEl.className = 'subtower-label coral-barrier-label';
      labelEl.style.display = 'none';
      this.labelsContainer.appendChild(labelEl);
      this.coralBarriers.push({
        cfg,
        group,
        chunks,
        glowMat,
        hp: cfg.hp,
        maxHp: cfg.hp,
        alive: true,
        hitFlash: 0,
        breakAnim: 0,
        labelEl,
      });
    });

    // 7. Drifting rescue bubbles with trapped Bobo squads inside
    this.rescueBubbles = [];
    const trappedMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0x60a5fa, emissive: 0x1d4ed8, emissiveIntensity: 0.12, roughness: 0.26, metalness: 0.05 }),
      0.84
    );
    const trappedEyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    for (const cfg of level.rescueBubbles || []) {
      const radius = cfg.isGrand ? 1.6 : 1.15;
      const group = new THREE.Group();
      group.position.set(cfg.x, 1.4, cfg.z);
      const shellMat = new THREE.MeshStandardMaterial({
        color: 0xbae6fd,
        emissive: 0x0ea5e9,
        emissiveIntensity: 0.32,
        roughness: 0.04,
        metalness: 0.1,
        transparent: true,
        opacity: 0.44,
        depthWrite: false,
      });
      const shell = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 18), shellMat);
      shell.renderOrder = 2;
      group.add(shell);
      const shine = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.17, 10, 8), shineMat);
      shine.position.set(-radius * 0.42, radius * 0.45, radius * 0.55);
      group.add(shine);
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(radius * 0.99, 0.05, 6, 36),
        new THREE.MeshBasicMaterial({ color: 0xf0f9ff, transparent: true, opacity: 0.8 })
      );
      band.rotation.x = Math.PI / 2;
      group.add(band);
      const trappedN = Math.min(cfg.isGrand ? 7 : 4, Math.max(1, cfg.bobos));
      for (let k = 0; k < trappedN; k++) {
        const ang = (k / trappedN) * Math.PI * 2;
        const bobo = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), trappedMat);
        bobo.scale.set(1, 0.9, 1);
        bobo.position.set(Math.cos(ang) * radius * 0.42, -radius * 0.18 + (k % 2) * 0.12, Math.sin(ang) * radius * 0.42);
        group.add(bobo);
        for (const side of [-1, 1]) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 5), trappedEyeMat);
          eye.position.set(bobo.position.x + side * 0.07, bobo.position.y + 0.05, bobo.position.z + 0.19);
          group.add(eye);
        }
      }
      this.levelGroup.add(group);
      const labelEl = document.createElement('div');
      labelEl.className = 'subtower-label rescue-bubble-label';
      labelEl.style.display = 'none';
      this.labelsContainer.appendChild(labelEl);
      this.rescueBubbles.push({
        cfg,
        group,
        shellMat,
        radius,
        baseX: cfg.x,
        baseZ: cfg.z,
        x: cfg.x,
        y: 1.4,
        z: cfg.z,
        hp: cfg.hp,
        maxHp: cfg.hp,
        alive: true,
        hitFlash: 0,
        popAnim: 0,
        labelEl,
      });
    }

    // 8. The player's 3D toy submarine (sunny-yellow hull, teal portholes, brass periscope & propeller)
    const subGroup = new THREE.Group();
    subGroup.position.set(0, 0, lane.startZ);
    const bodyGroup = new THREE.Group();
    bodyGroup.position.y = 1.5;
    bodyGroup.scale.setScalar(1.55);
    subGroup.add(bodyGroup);
    const hullMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0xffe14d, emissive: 0xb45309, emissiveIntensity: 0.26, roughness: 0.22, metalness: 0.1 }),
      0.86
    );
    // The hero submarine stays vivid through the deep-sea haze
    hullMat.fog = false;
    const stripeMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.3, metalness: 0.1 }),
      0.84
    );
    stripeMat.fog = false;
    const subBrass = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0xd9a441, emissive: 0x3b2306, emissiveIntensity: 0.15, roughness: 0.25, metalness: 0.72 }),
      0.82
    );
    const portholeMat = new THREE.MeshStandardMaterial({
      color: 0x99f6e4,
      emissive: 0x14b8a6,
      emissiveIntensity: 0.65,
      roughness: 0.08,
      metalness: 0.2,
    });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.5 });
    const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.72, 1.9, 8, 22), hullMat);
    hull.rotation.x = Math.PI / 2;
    hull.castShadow = true;
    bodyGroup.add(hull);
    for (const sz of [-0.62, 0.58]) {
      const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.735, 0.735, 0.2, 26, 1, true), stripeMat);
      stripe.rotation.x = Math.PI / 2;
      stripe.position.z = sz;
      bodyGroup.add(stripe);
    }
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.62, 18), hullMat);
    tower.position.set(0, 0.8, 0.1);
    tower.castShadow = true;
    bodyGroup.add(tower);
    const towerCap = new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), hullMat);
    towerCap.position.set(0, 1.1, 0.1);
    bodyGroup.add(towerCap);
    const towerRim = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.04, 8, 24), subBrass);
    towerRim.rotation.x = Math.PI / 2;
    towerRim.position.set(0, 1.1, 0.1);
    bodyGroup.add(towerRim);
    const periscope = new THREE.Group();
    periscope.position.set(0.08, 1.2, 0.15);
    const scopeStem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.62, 10), subBrass);
    scopeStem.position.y = 0.3;
    periscope.add(scopeStem);
    const scopeElbow = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), subBrass);
    scopeElbow.position.y = 0.62;
    periscope.add(scopeElbow);
    const scopeHead = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.26, 10), subBrass);
    scopeHead.rotation.x = Math.PI / 2;
    scopeHead.position.set(0, 0.62, -0.13);
    periscope.add(scopeHead);
    const scopeLens = new THREE.Mesh(new THREE.CircleGeometry(0.06, 12), portholeMat);
    scopeLens.position.set(0, 0.62, -0.265);
    scopeLens.rotation.y = Math.PI;
    periscope.add(scopeLens);
    bodyGroup.add(periscope);
    for (const side of [-1, 1]) {
      for (const pz of [-0.55, 0.0, 0.55]) {
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.04, 8, 18), subBrass);
        rim.rotation.y = Math.PI / 2;
        rim.position.set(side * 0.7, 0.08, pz);
        bodyGroup.add(rim);
        const glass = new THREE.Mesh(new THREE.CircleGeometry(0.12, 16), portholeMat);
        glass.rotation.y = side * (Math.PI / 2);
        glass.position.set(side * 0.715, 0.08, pz);
        bodyGroup.add(glass);
      }
      const plane = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.26), hullMat);
      plane.position.set(side * 0.82, -0.05, -0.75);
      bodyGroup.add(plane);
    }
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.3, 14), darkMat);
    tube.rotation.x = Math.PI / 2;
    tube.position.set(0, -0.12, -1.6);
    bodyGroup.add(tube);
    const headlamp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), portholeMat);
    headlamp.position.set(0, 0.28, -1.5);
    bodyGroup.add(headlamp);
    const finV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.72, 0.46), hullMat);
    finV.position.set(0, 0.28, 1.42);
    bodyGroup.add(finV);
    const finH = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.06, 0.42), hullMat);
    finH.position.set(0, 0, 1.42);
    bodyGroup.add(finH);
    const propeller = new THREE.Group();
    propeller.position.set(0, 0, 1.78);
    const hub = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.26, 12), subBrass);
    hub.rotation.x = Math.PI / 2;
    propeller.add(hub);
    for (let k = 0; k < 3; k++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.46, 0.05), subBrass);
      blade.position.set(Math.cos((k / 3) * Math.PI * 2) * 0.2, Math.sin((k / 3) * Math.PI * 2) * 0.2, 0);
      blade.rotation.z = (k / 3) * Math.PI * 2 + Math.PI / 2;
      propeller.add(blade);
    }
    bodyGroup.add(propeller);
    const subAuraMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const subAuraGeo = new THREE.RingGeometry(2.05, 2.3, 40);
    subAuraGeo.rotateX(-Math.PI / 2);
    const subAura = new THREE.Mesh(subAuraGeo, subAuraMat);
    subAura.position.y = 0.07;
    subAura.renderOrder = 1;
    subGroup.add(subAura);
    this.levelGroup.add(subGroup);

    const subLabel = document.createElement('div');
    subLabel.className = 'subtower-label submarine-hull-label';
    subLabel.style.display = 'none';
    this.labelsContainer.appendChild(subLabel);

    this.submarine = {
      active: true,
      tier: level.submarineTier || 1,
      group: subGroup,
      bodyGroup,
      propeller,
      periscope,
      hullMat,
      portholeMat,
      auraRing: subAura,
      auraRingMat: subAuraMat,
      x: 0,
      z: lane.startZ,
      startZ: lane.startZ,
      dockZ: lane.dockZ,
      maxSteerX: lane.maxSteerX,
      baseSpeed: lane.baseSpeed,
      speed: 0,
      hp: lane.hullHp,
      maxHp: lane.hullHp,
      oxygen: lane.oxygenSec,
      oxygenTotal: lane.oxygenSec,
      slowTimer: 0,
      hitFlash: 0,
      torpedoTimer: 1.2,
      torpedoInterval: lane.torpedoIntervalSec,
      torpedoDmg: lane.torpedoDmg,
      trailTimer: 0,
      escortCount: 0,
      state: 'cruising',
      labelEl: subLabel,
    };

    // 9. Bubble-torpedo pool (the submarine's own cannon)
    this.subTorpedoes = [];
    const torpBodyMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0xfde047, emissive: 0xca8a04, emissiveIntensity: 0.35, roughness: 0.25, metalness: 0.3 }),
      0.84
    );
    const torpNoseMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0xbe123c, emissiveIntensity: 0.5, roughness: 0.3 });
    const torpBodyGeo = new THREE.CapsuleGeometry(0.11, 0.42, 4, 10);
    const torpNoseGeo = new THREE.ConeGeometry(0.11, 0.22, 10);
    for (let k = 0; k < 6; k++) {
      const torp = new THREE.Group();
      const body = new THREE.Mesh(torpBodyGeo, torpBodyMat);
      body.rotation.x = Math.PI / 2;
      torp.add(body);
      const nose = new THREE.Mesh(torpNoseGeo, torpNoseMat);
      nose.rotation.x = -Math.PI / 2;
      nose.position.z = -0.36;
      torp.add(nose);
      torp.visible = false;
      this.levelGroup.add(torp);
      this.subTorpedoes.push({
        mesh: torp,
        active: false,
        x: 0,
        z: 0,
        targetKind: 'jelly',
        jelly: null,
        coral: null,
        bubble: null,
        life: 0,
      });
    }

    // 10. Shared jellyfish kit (geometry + materials) for swarms spawned during the run
    this.subJellyKit = {
      bellGeo: new THREE.SphereGeometry(0.55, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.56),
      rimGeo: new THREE.TorusGeometry(0.53, 0.05, 6, 24),
      tentGeo: new THREE.CapsuleGeometry(0.045, 0.6, 3, 6),
      eyeGeo: new THREE.SphereGeometry(0.065, 8, 6),
      coreGeo: new THREE.SphereGeometry(0.22, 10, 8),
      tentMat: new THREE.MeshStandardMaterial({
        color: 0xa5f3fc,
        emissive: 0x22d3ee,
        emissiveIntensity: 0.7,
        roughness: 0.2,
        transparent: true,
        opacity: 0.82,
      }),
      rimMat: new THREE.MeshStandardMaterial({ color: 0x67e8f9, emissive: 0x06b6d4, emissiveIntensity: 0.75, roughness: 0.2 }),
      eyeMat: new THREE.MeshBasicMaterial({ color: 0x2e1065 }),
      coreMat: new THREE.MeshStandardMaterial({ color: 0xecfeff, emissive: 0x22d3ee, emissiveIntensity: 1.1, roughness: 0.2 }),
    };
    this.jellyfish = [];
    this.subJellySpawnTimer = level.jellyfishSwarm?.firstDelaySec ?? 4.0;
    this.subJellySeq = 0;
    this.bossHp = 100;
  }

  public getSubmarineProgressPct(): number {
    const sub = this.submarine;
    if (!sub) return 0;
    const span = Math.max(0.01, sub.startZ - sub.dockZ);
    const covered = THREE.MathUtils.clamp(sub.startZ - sub.z, 0, span);
    return Math.max(0, Math.min(100, Math.round((covered / span) * 100)));
  }

  public getSubmarineStateLabel(): string {
    const sub = this.submarine;
    if (!sub) return '潜艇未下水';
    switch (sub.state) {
      case 'escorted':
        return '波波护航加速';
      case 'blocked':
        return '珊瑚封锁 · 待破障';
      case 'stung':
        return '水母蜇击 · 减速';
      case 'docked':
        return '已抵达营救站';
      case 'sunk':
        return '潜艇受损沉没';
      case 'suffocated':
        return '氧气耗尽';
      default:
        return '潜航巡游中';
    }
  }

  public getAliveCoralCount(): number {
    let n = 0;
    for (const c of this.coralBarriers) if (c.alive) n++;
    return n;
  }

  public getAliveRescueBubbleCount(): number {
    let n = 0;
    for (const b of this.rescueBubbles) if (b.alive) n++;
    return n;
  }

  public getAliveJellyfishCount(): number {
    let n = 0;
    for (const j of this.jellyfish) if (j.alive) n++;
    return n;
  }

  /** First alive coral wall in front of `z` (corals are kept sorted from the home dock toward the station). */
  public findCoralAhead(z: number): CoralBarrierRuntime | null {
    for (const c of this.coralBarriers) {
      if (c.alive && c.cfg.z < z) return c;
    }
    return null;
  }

  protected findNearestJellyfish(x: number, z: number, maxDist: number, minZ: number): JellyfishRuntime | null {
    let best: JellyfishRuntime | null = null;
    let bestD = maxDist;
    for (const j of this.jellyfish) {
      if (!j.alive || j.z < minZ) continue;
      const d = Math.hypot(j.x - x, j.z - z);
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    }
    return best;
  }

  protected findNearestRescueBubble(x: number, z: number, maxDist: number, minZ: number): RescueBubbleRuntime | null {
    let best: RescueBubbleRuntime | null = null;
    let bestD = maxDist;
    for (const b of this.rescueBubbles) {
      if (!b.alive || b.z < minZ) continue;
      const d = Math.hypot(b.x - x, b.z - z);
      if (d < bestD) {
        bestD = d;
        best = b;
      }
    }
    return best;
  }

  public damageCoralBarrier(c: CoralBarrierRuntime, rawDmg: number, silent = false): boolean {
    if (!c.alive || this.isStageEnded) return false;
    const dealt = Math.max(1, rawDmg);
    c.hp = Math.max(0, c.hp - dealt);
    c.hitFlash = 1.0;
    this.state.runSiegePool += dealt * 0.5;
    // Crumble coral clusters as the wall weakens
    const ratio = c.hp / Math.max(1, c.maxHp);
    const keep = Math.ceil(c.chunks.length * (0.35 + ratio * 0.65));
    for (let i = 0; i < c.chunks.length; i++) {
      const chunk = c.chunks[(i * 5) % c.chunks.length];
      if (i >= keep && chunk.visible) {
        chunk.visible = false;
        if (!silent) this.spawnBurstParticles(chunk.position.x, 0.9, c.cfg.z, 0xfda4af, 6);
      }
    }
    if (c.hp <= 0) {
      this.breakCoralBarrier(c, silent);
      return true;
    }
    return false;
  }

  public breakCoralBarrier(c: CoralBarrierRuntime, silent = false): void {
    if (!c.alive) return;
    c.alive = false;
    c.hp = 0;
    c.breakAnim = 1.0;
    c.labelEl.style.display = 'none';
    this.subCoralsBroken += 1;
    const gold = this.state.addGold(c.cfg.rewardGold);
    this.state.championCharge = Math.min(100, this.state.championCharge + 22);
    if (!silent) {
      sound.playExplosion();
      this.addCameraShake(0.55);
      this.triggerScreenFlash('#f9a8d4', 0.38);
      for (const px of [-6, 0, 6]) {
        this.spawnSkyPillar(px, c.cfg.z, 0x67e8f9, 2.0, 0.45);
        this.spawnBurstParticles(px, 1.2, c.cfg.z, 0xfda4af, 28);
      }
      this.spawnShockwave(0, c.cfg.z, 0x7dd3fc, 9.0, 0.5);
      this.spawnFloatingPopup(0, 2.8, c.cfg.z, `破开${c.cfg.name}! +${gold} 金币`, '#a5f3fc');
      this.onBanner?.(
        `${UI_ART.submarineRescue} 破开${c.cfg.name}！`,
        `航道已畅通 · 赏金 +${gold} 金币 · 剩余珊瑚封锁 ${this.getAliveCoralCount()}/${this.coralBarriers.length}`
      );
    }
  }

  /** Pops a rescue bubble and releases its trapped Bobo squad as new Blue units. Returns units added. */
  public popRescueBubble(b: RescueBubbleRuntime, cause: 'crowd' | 'sub' | 'torpedo' | 'spark', silent = false): number {
    if (!b.alive) return 0;
    b.alive = false;
    b.hp = 0;
    b.popAnim = 1.0;
    b.labelEl.style.display = 'none';
    let added = 0;
    const n = Math.max(1, Math.floor(b.cfg.bobos));
    for (let k = 0; k < n; k++) {
      const ang = (k / n) * Math.PI * 2;
      const u = this.spawnUnit(
        'blue',
        k === 0 && b.cfg.isGrand ? 'charged' : 'normal',
        b.x + Math.cos(ang) * 0.8,
        b.z + Math.sin(ang) * 0.6,
        Math.cos(ang) * 2.4,
        Math.sin(ang) * 1.8 - 1.5
      );
      if (u) {
        u.spawnHop = 0.9;
        added++;
      }
    }
    this.subBubblesPopped += 1;
    this.subBobosRescued += added;
    this.state.stageClonesSpawned += added;
    const gold = this.state.addGold(6 + n * 2);
    this.state.championCharge = Math.min(100, this.state.championCharge + 6);
    if (!silent) {
      sound.playSyrupBubblePop();
      this.spawnShockwave(b.x, b.z, 0x7dd3fc, b.radius * 3.0, 0.4);
      this.spawnBurstParticles(b.x, 1.6, b.z, 0xe0f2fe, 26);
      this.spawnBurstParticles(b.x, 1.2, b.z, 0x60a5fa, 12);
      this.spawnFloatingPopup(b.x, 2.8, b.z, `营救 +${added} 波波!`, '#bae6fd');
      if (b.cfg.isGrand) {
        this.onBanner?.(`${UI_ART.submarineRescue} 超大营救泡泡破开！`, `${added} 只被困波波加入战队 · 金币 +${gold}`);
      }
    }
    void cause;
    return added;
  }

  public damageJellyfish(j: JellyfishRuntime, dmg: number, silent = false): boolean {
    if (!j.alive) return false;
    j.hp = Math.max(0, j.hp - Math.max(1, dmg));
    j.hitFlash = 1.0;
    if (j.hp <= 0) {
      this.killJellyfish(j, silent);
      return true;
    }
    return false;
  }

  private killJellyfish(j: JellyfishRuntime, silent = false): void {
    if (!j.alive) return;
    j.alive = false;
    j.deathAnim = 1.0;
    this.subJellyKills += 1;
    const reward = this.currentLevel?.jellyfishSwarm?.rewardGold ?? 14;
    const gold = this.state.addGold(reward);
    this.state.championCharge = Math.min(100, this.state.championCharge + 3);
    this.state.subWeaponCharge = Math.min(100, this.state.subWeaponCharge + 2);
    if (!silent) {
      this.spawnBurstParticles(j.x, j.y, j.z, 0xe879f9, 16);
      this.spawnBurstParticles(j.x, j.y, j.z, 0xfdf4ff, 6);
      if (Math.random() < 0.35) this.spawnFloatingPopup(j.x, j.y + 0.8, j.z, `击散水母 +${gold}`, '#f0abfc');
    }
    this.notePetComboKill();
  }

  public spawnJellyfishSwarm(count?: number): number {
    const sub = this.submarine;
    const kit = this.subJellyKit;
    const cfg = this.currentLevel?.jellyfishSwarm;
    if (!sub || !kit || !cfg) return 0;
    const n = Math.max(1, Math.floor(count ?? cfg.perSwarm));
    const side = this.subJellySeq % 2 === 0 ? -1 : 1;
    this.subJellySeq += 1;
    // Swarms ambush from the flank just ahead of the submarine, away from the crowd pushing the coral line
    const cx = side * (7.4 + Math.random() * 2.0);
    const cz = THREE.MathUtils.clamp(sub.z - 2.0 - Math.random() * 5.0, sub.dockZ - 1.0, sub.startZ - 1.0);
    let spawned = 0;
    for (let k = 0; k < n; k++) {
      if (this.getAliveJellyfishCount() >= 18) break;
      const group = new THREE.Group();
      const bellMat = new THREE.MeshStandardMaterial({
        color: 0x9333ea,
        emissive: 0x6b21a8,
        emissiveIntensity: 0.45,
        roughness: 0.18,
        metalness: 0.05,
        transparent: true,
        opacity: 0.82,
      });
      const bell = new THREE.Mesh(kit.bellGeo, bellMat);
      group.add(bell);
      const core = new THREE.Mesh(kit.coreGeo, kit.coreMat);
      core.position.y = 0.12;
      group.add(core);
      const rim = new THREE.Mesh(kit.rimGeo, kit.rimMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = -0.06;
      group.add(rim);
      for (const ex of [-0.17, 0.17]) {
        const eye = new THREE.Mesh(kit.eyeGeo, kit.eyeMat);
        eye.position.set(ex, 0.12, 0.47);
        group.add(eye);
      }
      const tentacles: THREE.Object3D[] = [];
      for (let t = 0; t < 6; t++) {
        const ang = (t / 6) * Math.PI * 2;
        const pivot = new THREE.Group();
        pivot.position.set(Math.cos(ang) * 0.3, -0.08, Math.sin(ang) * 0.3);
        const tent = new THREE.Mesh(kit.tentGeo, kit.tentMat);
        tent.position.y = -0.36;
        pivot.add(tent);
        pivot.userData.phase = t * 1.1 + k;
        group.add(pivot);
        tentacles.push(pivot);
      }
      const jx = THREE.MathUtils.clamp(cx + (Math.random() - 0.5) * 2.6, -TRACK_HALF_W + 0.8, TRACK_HALF_W - 0.8);
      const jz = cz + (Math.random() - 0.5) * 2.6;
      group.position.set(jx, 1.7, jz);
      group.scale.setScalar(1.4);
      this.levelGroup.add(group);
      this.jellyfish.push({
        id: this.subJellySeq * 100 + k,
        group,
        bellMat,
        tentacles,
        x: jx,
        y: 1.7,
        z: jz,
        vx: 0,
        vz: 0,
        hp: cfg.hp,
        maxHp: cfg.hp,
        alive: true,
        stingTimer: cfg.stingIntervalSec * (0.6 + Math.random() * 0.6),
        hitFlash: 0,
        deathAnim: 0,
        phase: Math.random() * Math.PI * 2,
      });
      spawned++;
    }
    if (spawned > 0) {
      this.spawnShockwave(cx, cz, 0xe879f9, 3.6, 0.4);
      this.spawnFloatingPopup(cx, 2.8, cz, `水母阵来袭 ×${spawned}!`, '#f0abfc');
    }
    return spawned;
  }

  /** One sting pulse from a jellyfish: damages + slows nearby Bobos and the submarine hull. */
  protected jellyfishSting(j: JellyfishRuntime, silent = false): { bobos: number; hull: boolean } {
    const cfg = this.currentLevel?.jellyfishSwarm;
    const sub = this.submarine;
    if (!cfg || !j.alive) return { bobos: 0, hull: false };
    const relic = this.state.getRelicBannerCombatSpec();
    const petTaken = this.state.getPetCompanionCombatSpec().dmgTakenMult;
    const r2 = cfg.stingRadius * cfg.stingRadius;
    let bobos = 0;
    for (let i = 0; i < MAX_UNITS; i++) {
      const u = this.units[i];
      if (!u.active || u.team !== 'blue') continue;
      const dx = u.x - j.x;
      const dz = u.z - j.z;
      if (dx * dx + dz * dz > r2) continue;
      bobos++;
      if (u.frostShield) {
        u.frostShield = false;
        u.petShellGranted = false;
        this.spawnBurstParticles(u.x, 0.8, u.z, 0x7dd3fc, 3);
        continue;
      }
      const raw = cfg.stingDmg * (u.kind === 'champion' ? 0.5 : 1.0);
      if (petTaken < 1) this.petStats.dmgPrevented += raw * (1 - petTaken);
      u.hp -= raw * this.getRelicDamageTakenMult(u, relic, raw) * petTaken;
      u.jellySlowTimer = Math.max(u.jellySlowTimer || 0, cfg.slowSec);
      if (u.hp <= 0 && u.active) {
        u.active = false;
        this.onUnitKilled(u);
      }
    }
    let hull = false;
    if (sub && sub.active) {
      const d = Math.hypot(sub.x - j.x, sub.z - j.z);
      if (d <= cfg.stingRadius + 1.2) {
        hull = true;
        const hullDmg = cfg.hullStingDmg * petTaken;
        if (petTaken < 1) this.petStats.dmgPrevented += cfg.hullStingDmg * (1 - petTaken);
        sub.hp = Math.max(0, sub.hp - hullDmg);
        sub.slowTimer = Math.max(sub.slowTimer, 1.6);
        sub.hitFlash = 1.0;
        this.subHullDamageTaken += hullDmg;
      }
    }
    if (bobos > 0 || hull) {
      this.subJellyStings += 1;
      if (!silent) {
        this.spawnShockwave(j.x, j.z, 0xe879f9, cfg.stingRadius, 0.22);
        this.spawnBurstParticles(j.x, 0.9, j.z, 0xf0abfc, 5);
      }
    }
    return { bobos, hull };
  }

  private fireSubTorpedo(): boolean {
    const sub = this.submarine;
    if (!sub) return false;
    const torp = this.subTorpedoes.find((tp) => !tp.active);
    if (!torp) return false;
    const coral = this.findCoralAhead(sub.z);
    const minZ = coral ? coral.cfg.z + 0.6 : -999;
    const jelly = this.findNearestJellyfish(sub.x, sub.z, 10.5, minZ);
    let bubble: RescueBubbleRuntime | null = null;
    let coralTarget: CoralBarrierRuntime | null = null;
    if (!jelly) {
      if (coral && sub.z - coral.cfg.z < 7.0) {
        coralTarget = coral;
      } else {
        bubble = this.findNearestRescueBubble(sub.x, sub.z, 9.5, minZ);
      }
    }
    if (!jelly && !coralTarget && !bubble) return false;
    torp.active = true;
    torp.x = sub.x;
    torp.z = sub.z - 1.9;
    torp.jelly = jelly;
    torp.coral = coralTarget;
    torp.bubble = bubble;
    torp.targetKind = jelly ? 'jelly' : coralTarget ? 'coral' : 'bubble';
    torp.life = 2.6;
    torp.mesh.visible = true;
    torp.mesh.position.set(torp.x, 1.4, torp.z);
    this.subTorpedoesFired += 1;
    this.spawnBurstParticles(sub.x, 1.1, sub.z - 1.9, 0xe0f2fe, 5);
    return true;
  }

  private updateSubTorpedoes(dt: number): void {
    const sub = this.submarine;
    if (!sub) return;
    for (const tp of this.subTorpedoes) {
      if (!tp.active) continue;
      tp.life -= dt;
      let tx = tp.x;
      let tz = tp.z - 5;
      let alive = true;
      if (tp.targetKind === 'jelly' && tp.jelly) {
        alive = tp.jelly.alive;
        tx = tp.jelly.x;
        tz = tp.jelly.z;
      } else if (tp.targetKind === 'coral' && tp.coral) {
        alive = tp.coral.alive;
        tx = THREE.MathUtils.clamp(tp.x, -9, 9);
        tz = tp.coral.cfg.z + 0.5;
      } else if (tp.targetKind === 'bubble' && tp.bubble) {
        alive = tp.bubble.alive;
        tx = tp.bubble.x;
        tz = tp.bubble.z;
      }
      if (!alive || tp.life <= 0) {
        tp.active = false;
        tp.mesh.visible = false;
        this.spawnBurstParticles(tp.x, 1.1, tp.z, 0xe0f2fe, 4);
        continue;
      }
      const dx = tx - tp.x;
      const dz = tz - tp.z;
      const d = Math.hypot(dx, dz);
      const step = 15 * dt;
      if (d <= Math.max(0.65, step)) {
        tp.active = false;
        tp.mesh.visible = false;
        this.spawnBurstParticles(tx, 1.2, tz, 0xfde047, 10);
        this.spawnShockwave(tx, tz, 0xfde047, 1.8, 0.22);
        if (tp.targetKind === 'jelly' && tp.jelly) {
          this.damageJellyfish(tp.jelly, sub.torpedoDmg);
        } else if (tp.targetKind === 'coral' && tp.coral) {
          this.damageCoralBarrier(tp.coral, sub.torpedoDmg * 1.6 * this.state.getSiegeDamageMultiplier());
        } else if (tp.targetKind === 'bubble' && tp.bubble) {
          this.popRescueBubble(tp.bubble, 'torpedo');
        }
        continue;
      }
      tp.x += (dx / d) * step;
      tp.z += (dz / d) * step;
      tp.mesh.position.set(tp.x, 1.4, tp.z);
      tp.mesh.rotation.y = Math.atan2(-dx, -dz);
      if (Math.random() < 0.5) this.spawnBurstParticles(tp.x, 1.1, tp.z + 0.3, 0xe0f2fe, 1);
    }
  }

  protected updateSubmarineRescue(dt: number): void {
    const sub = this.submarine;
    const level = this.currentLevel;
    if (!sub || !sub.active || !level) return;
    const t = this.elapsedTime;
    const jcfg = level.jellyfishSwarm;

    // 1. Steering: the submarine follows the cannon's lateral aim (player-controlled)
    const steerX = THREE.MathUtils.clamp(this.turretX, -sub.maxSteerX, sub.maxSteerX);
    sub.x = THREE.MathUtils.lerp(sub.x, steerX, Math.min(1, dt * 1.6));

    // 2. Escort count & blocking coral
    let escort = 0;
    for (let i = 0; i < MAX_UNITS; i++) {
      const u = this.units[i];
      if (!u.active || u.team !== 'blue') continue;
      const dx = u.x - sub.x;
      const dz = u.z - sub.z;
      if (dx * dx + dz * dz <= 25) escort++;
    }
    sub.escortCount = escort;
    const coral = this.findCoralAhead(sub.z);
    const stopZ = coral ? coral.cfg.z + 1.9 : sub.dockZ;
    let spd = sub.baseSpeed * (escort >= 8 ? 1.3 : escort >= 3 ? 1.15 : 1.0);
    if (sub.slowTimer > 0) {
      sub.slowTimer = Math.max(0, sub.slowTimer - dt);
      spd *= 0.42;
    }
    if (coral && sub.z - stopZ <= 0.02) {
      spd = 0;
      sub.state = 'blocked';
    } else if (sub.slowTimer > 0) {
      sub.state = 'stung';
    } else {
      sub.state = escort >= 3 ? 'escorted' : 'cruising';
    }
    sub.speed = spd;
    sub.z = Math.max(stopZ, sub.z - spd * dt);
    sub.oxygen = Math.max(0, sub.oxygen - dt);
    this.bossHp = Math.max(0, 100 - this.getSubmarineProgressPct());

    // 3. Animate the toy submarine
    sub.group.position.set(sub.x, 0, sub.z);
    sub.bodyGroup.position.y = 1.5 + Math.sin(t * 2.2) * 0.12;
    sub.bodyGroup.rotation.z = THREE.MathUtils.clamp((steerX - sub.x) * -0.08, -0.25, 0.25);
    sub.bodyGroup.rotation.x = Math.sin(t * 1.6) * 0.03;
    sub.propeller.rotation.z += dt * (4 + spd * 9);
    sub.periscope.rotation.y = Math.sin(t * 0.8) * 0.9;
    if (sub.hitFlash > 0) sub.hitFlash = Math.max(0, sub.hitFlash - dt * 3.5);
    sub.hullMat.emissive.setHex(sub.hitFlash > 0.05 ? 0xdb2777 : 0xb45309);
    sub.hullMat.emissiveIntensity = 0.26 + sub.hitFlash * 0.6;
    sub.portholeMat.emissiveIntensity = 0.55 + Math.sin(t * 3.0) * 0.15;
    sub.auraRingMat.color.setHex(sub.state === 'blocked' ? 0xf472b6 : sub.state === 'stung' ? 0xe879f9 : 0x38bdf8);
    sub.auraRingMat.opacity = 0.42 + Math.sin(t * 4.0) * 0.1;
    sub.trailTimer -= dt;
    if (sub.trailTimer <= 0) {
      sub.trailTimer = spd > 0 ? 0.12 : 0.3;
      this.spawnBurstParticles(sub.x + (Math.random() - 0.5) * 0.4, 1.3, sub.z + 2.2, 0xe0f2fe, 1);
    }

    // 4. Submarine contact pops rescue bubbles it sails through
    for (const b of this.rescueBubbles) {
      if (!b.alive) continue;
      const dx = b.x - sub.x;
      const dz = b.z - sub.z;
      if (dx * dx + dz * dz <= (b.radius + 1.3) * (b.radius + 1.3)) {
        this.popRescueBubble(b, 'sub');
      }
    }

    // 5. Bubble torpedoes (the submarine's own cannon)
    sub.torpedoTimer -= dt;
    if (sub.torpedoTimer <= 0) {
      sub.torpedoTimer = this.fireSubTorpedo() ? sub.torpedoInterval : 0.35;
    }
    this.updateSubTorpedoes(dt);

    // 6. Jellyfish swarms: spawn, drift at the sub, sting
    if (jcfg) {
      this.subJellySpawnTimer -= dt;
      if (this.subJellySpawnTimer <= 0) {
        this.subJellySpawnTimer = jcfg.intervalSec;
        this.spawnJellyfishSwarm();
      }
    }
    for (let i = this.jellyfish.length - 1; i >= 0; i--) {
      const j = this.jellyfish[i];
      if (!j.alive) {
        j.deathAnim = Math.max(0, j.deathAnim - dt * 2.4);
        const s = Math.max(0.05, j.deathAnim);
        j.group.scale.set(s * 1.8, s * 0.85, s * 1.8);
        j.bellMat.opacity = 0.82 * j.deathAnim;
        if (j.deathAnim <= 0) {
          this.levelGroup.remove(j.group);
          j.bellMat.dispose();
          this.jellyfish.splice(i, 1);
        }
        continue;
      }
      const dx = sub.x - j.x;
      const dz = sub.z - j.z;
      const d = Math.max(0.01, Math.hypot(dx, dz));
      const pulse = 0.45 + 0.55 * Math.max(0, Math.sin(t * 3.2 + j.phase));
      const swim = (jcfg?.speed ?? 1.5) * pulse;
      const desiredVX = d > 1.4 ? (dx / d) * swim : 0;
      const desiredVZ = d > 1.4 ? (dz / d) * swim : 0;
      j.vx = THREE.MathUtils.lerp(j.vx, desiredVX, Math.min(1, dt * 2.2));
      j.vz = THREE.MathUtils.lerp(j.vz, desiredVZ, Math.min(1, dt * 2.2));
      j.x = THREE.MathUtils.clamp(j.x + j.vx * dt, -TRACK_HALF_W + 0.6, TRACK_HALF_W - 0.6);
      j.z += j.vz * dt;
      j.y = 1.7 + Math.sin(t * 2.0 + j.phase) * 0.28;
      j.group.position.set(j.x, j.y, j.z);
      const squash = Math.sin(t * 6.4 + j.phase);
      const flash = j.hitFlash;
      j.group.scale.set(
        1.4 * (1 + squash * 0.07 + flash * 0.1),
        1.4 * (1 - squash * 0.09),
        1.4 * (1 + squash * 0.07 + flash * 0.1)
      );
      j.bellMat.emissiveIntensity = 0.45 + flash * 0.8 + Math.max(0, Math.sin(t * 5 + j.phase)) * 0.2;
      if (j.hitFlash > 0) j.hitFlash = Math.max(0, j.hitFlash - dt * 5);
      for (const tent of j.tentacles) {
        const ph = (tent.userData.phase as number) || 0;
        tent.rotation.x = Math.sin(t * 4.2 + ph) * 0.35;
        tent.rotation.z = Math.cos(t * 3.4 + ph) * 0.25;
      }
      j.stingTimer -= dt;
      if (j.stingTimer <= 0 && jcfg) {
        const res = this.jellyfishSting(j);
        j.stingTimer = res.bobos > 0 || res.hull ? jcfg.stingIntervalSec : 0.25;
      }
    }

    // 7. Coral walls & rescue bubble animation
    for (const c of this.coralBarriers) {
      if (c.alive) {
        if (c.hitFlash > 0) c.hitFlash = Math.max(0, c.hitFlash - dt * 5);
        c.group.position.x = Math.sin(t * 40) * c.hitFlash * 0.06;
        c.glowMat.opacity = 0.14 + Math.sin(t * 2.4 + c.cfg.z) * 0.05 + c.hitFlash * 0.2;
      } else if (c.breakAnim > 0) {
        c.breakAnim = Math.max(0, c.breakAnim - dt * 1.4);
        c.group.position.y = -(1 - c.breakAnim) * 1.6;
        c.glowMat.opacity = 0.16 * c.breakAnim;
        if (c.breakAnim <= 0) c.group.visible = false;
      }
    }
    for (const b of this.rescueBubbles) {
      if (b.alive) {
        b.x = THREE.MathUtils.clamp(
          b.baseX + Math.sin(t * b.cfg.driftSpeed + b.cfg.driftPhase) * b.cfg.driftRangeX,
          -TRACK_HALF_W + 1.2,
          TRACK_HALF_W - 1.2
        );
        b.z = b.baseZ + Math.cos(t * b.cfg.driftSpeed * 0.8 + b.cfg.driftPhase) * 0.35;
        b.y = 1.4 + b.radius * 0.25 + Math.sin(t * 1.9 + b.cfg.driftPhase) * 0.22;
        const s = 1 + Math.sin(t * 3.1 + b.cfg.driftPhase) * 0.03 + b.hitFlash * 0.12;
        b.group.position.set(b.x, b.y, b.z);
        b.group.scale.set(s, s, s);
        b.group.rotation.y = t * 0.4 + b.cfg.driftPhase;
        b.shellMat.emissiveIntensity = 0.32 + b.hitFlash * 0.6;
        if (b.hitFlash > 0) b.hitFlash = Math.max(0, b.hitFlash - dt * 4);
      } else if (b.popAnim > 0) {
        b.popAnim = Math.max(0, b.popAnim - dt * 4.0);
        const s = 1 + (1 - b.popAnim) * 0.6;
        b.group.scale.set(s, s, s);
        b.shellMat.opacity = 0.44 * b.popAnim;
        if (b.popAnim <= 0) b.group.visible = false;
      }
    }

    // 8. Underwater ambience (kelp sway & rising bubbles)
    for (const kelp of this.subKelp) {
      const ph = (kelp.userData.phase as number) || 0;
      kelp.rotation.z = Math.sin(t * 1.3 + ph) * 0.12;
      kelp.rotation.x = Math.cos(t * 1.1 + ph) * 0.06;
    }
    const amb = this.subAmbientBubbles;
    const ad = this.subAmbientBubbleData;
    if (amb && ad) {
      const m = this.tempMatrix4Sub;
      for (let i = 0; i < amb.count; i++) {
        ad[i * 4 + 1] += ad[i * 4 + 3] * dt;
        if (ad[i * 4 + 1] > 11.5) {
          ad[i * 4 + 1] = 0;
          ad[i * 4] = (Math.random() - 0.5) * 30;
        }
        const wob = Math.sin(t * 2 + i) * 0.15;
        const sc = 0.7 + (i % 5) * 0.18;
        m.makeScale(sc, sc, sc);
        m.setPosition(ad[i * 4] + wob, ad[i * 4 + 1], ad[i * 4 + 2]);
        amb.setMatrixAt(i, m);
      }
      amb.instanceMatrix.needsUpdate = true;
    }

    // 9. Resolution: dock = victory; hull breach / oxygen out = defeat
    if (sub.z <= sub.dockZ + 0.01) {
      sub.active = false;
      sub.state = 'docked';
      sub.labelEl.style.display = 'none';
      this.bossHp = 0;
      this.spawnSkyPillar(sub.x, sub.dockZ, 0x2dd4bf, 3.6, 0.7);
      this.spawnShockwave(sub.x, sub.dockZ, 0x7dd3fc, 11.0, 0.7);
      this.spawnBurstParticles(sub.x, 2.0, sub.dockZ, 0xe0f2fe, 60);
      this.onBanner?.(
        `${UI_ART.submarineRescue} 潜艇抵达深海营救站！`,
        `营救波波 ${this.subBobosRescued} 只 · 泡泡 ${this.subBubblesPopped}/${this.rescueBubbles.length} · 珊瑚 ${this.subCoralsBroken}/${this.coralBarriers.length}`
      );
      this.finishStage(true);
      return;
    }
    if (sub.hp <= 0 || sub.oxygen <= 0) {
      sub.active = false;
      sub.state = sub.hp <= 0 ? 'sunk' : 'suffocated';
      sub.labelEl.style.display = 'none';
      this.spawnBurstParticles(sub.x, 1.4, sub.z, 0xe0f2fe, 40);
      this.spawnShockwave(sub.x, sub.z, 0xf472b6, 6.0, 0.5);
      this.onBanner?.(
        `${UI_ART.warning} ${sub.state === 'sunk' ? '潜艇被水母阵蜇穿船壳' : '潜艇氧气耗尽'}！`,
        `本局营救波波 ${this.subBobosRescued} 只 · 已破珊瑚 ${this.subCoralsBroken}/${this.coralBarriers.length}`
      );
      this.finishStage(false);
    }
  }
}
