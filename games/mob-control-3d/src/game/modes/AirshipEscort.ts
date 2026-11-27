/** MC-9 云端飞艇护航战：从 World3D 原样搬出的方法（字段仍在 World3D）。继承链见 ../World3DFull.ts。 */
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
  AirshipDropPodRuntime,
  AirshipEscortState,
  AntiAirTurretRuntime,
  BOSS_GATE_Z,
  MAX_UNITS,
  PLAYER_Z,
  TRACK_HALF_W,
} from '../WorldTypes';
import { ClockworkColossusMode } from './ClockworkColossus';

export abstract class AirshipEscortMode extends ClockworkColossusMode {
  protected buildAirshipEscort3D(level: LevelConfig): void {
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
    airshipLabel.innerHTML = `${UI_ART.airshipEscort}<span>飞艇 0% · 空投充能 ${startDropCharge}%</span>`;
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
    if (st === 'dropping_pod') return '空投超级波波舱';
    if (st === 'overdrive') return '全速云翼突进';
    if (st === 'under_flak') return '遭到炮火拦截';
    if (st === 'breached') return '已冲破总厂';
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
        `飞艇空投舱紧急投送超级波波 · 赏金 +${goldBonus} 金币`
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
        `超级空投着陆! +${spawned}超级波波`,
        '#fde047'
      );
    }
    return spawned;
  }

  protected updateAirshipEscort(dt: number): void {
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
}
