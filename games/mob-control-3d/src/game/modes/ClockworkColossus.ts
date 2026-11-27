/** MC-8 巨型发条首领攻坚战：从 World3D 原样搬出的方法（字段仍在 World3D）。继承链见 ../World3DFull.ts。 */
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
  BOSS_GATE_Z,
  TRACK_HALF_W,
} from '../WorldTypes';
import { World3D } from '../World3D';

export abstract class ClockworkColossusMode extends World3D {
  // ============================================================================
  // MC-8: Giant Clockwork Toy Colossus Boss Raid & Bobo 3-Branch Tech Tree
  // ============================================================================

  protected buildClockworkColossus(level: LevelConfig): void {
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

  protected updateClockworkColossus(dt: number): void {
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
}
