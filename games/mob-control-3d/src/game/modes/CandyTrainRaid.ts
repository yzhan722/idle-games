/** MC-10 彩虹糖果列车突袭战：从 World3D 原样搬出的方法（字段仍在 World3D）。继承链见 ../World3DFull.ts。 */
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
  CandyTrainCarRuntime,
  CandyTrainRuntime,
  MAX_UNITS,
} from '../WorldTypes';
import type { RelicBannerCombat } from '../World3D';
import { AirshipEscortMode } from './AirshipEscort';

export abstract class CandyTrainRaidMode extends AirshipEscortMode {
  // ============================================================================
  // MC-10: Rainbow Candy Train Raid (multi-car 3D armored candy freight train)
  // ============================================================================

  private getCandyTrainPose(train: CandyTrainRuntime, angle: number): { x: number; z: number; yaw: number } {
    const x = train.centerX + Math.cos(angle) * train.radiusX;
    const z = train.centerZ + Math.sin(angle) * train.radiusZ;
    const tx = -Math.sin(angle) * train.radiusX;
    const tz = Math.cos(angle) * train.radiusZ;
    return { x, z, yaw: Math.atan2(tx, tz) };
  }

  protected buildCandyTrainRaid3D(level: LevelConfig): void {
    const track = level.candyTrainTrack || {
      centerX: 0,
      centerZ: -1.6,
      radiusX: 7.6,
      radiusZ: 6.8,
      carSpacing: 3.05,
    };
    const avgR = (track.radiusX + track.radiusZ) * 0.5;
    const finish = this.state.getEquippedFinish();

    // 1. Rainbow rail loop: caramel ballast bed, twin golden rails & rainbow candy sleepers
    const trackGroup = new THREE.Group();
    const bedGeo = new THREE.RingGeometry(avgR - 1.0, avgR + 1.0, 80);
    bedGeo.rotateX(-Math.PI / 2);
    const bedMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0xe8b47a, roughness: 0.62, metalness: 0.02 }),
      0.78
    );
    const bed = new THREE.Mesh(bedGeo, bedMat);
    bed.scale.set(track.radiusX / avgR, 1, track.radiusZ / avgR);
    bed.position.set(track.centerX, 0.035, track.centerZ);
    bed.receiveShadow = true;
    trackGroup.add(bed);

    const railMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0xfde68a,
        emissive: 0x3b2306,
        emissiveIntensity: 0.12,
        roughness: 0.22,
        metalness: 0.75,
      }),
      0.82
    );
    for (const off of [-0.44, 0.44]) {
      const railGeo = new THREE.TorusGeometry(avgR + off, 0.07, 6, 128);
      railGeo.rotateX(Math.PI / 2);
      const rail = new THREE.Mesh(railGeo, railMat);
      rail.scale.set(track.radiusX / avgR, 1, track.radiusZ / avgR);
      rail.position.set(track.centerX, 0.17, track.centerZ);
      trackGroup.add(rail);
    }

    const rainbowHexes = [0xf87171, 0xfb923c, 0xfacc15, 0x4ade80, 0x60a5fa, 0xc084fc];
    const sleeperMats = rainbowHexes.map((hex) =>
      stylizeMaterialAs2DIllustration(
        new THREE.MeshStandardMaterial({ color: hex, roughness: 0.4, metalness: 0.08 }),
        0.8
      )
    );
    const sleeperGeo = new THREE.BoxGeometry(1.3, 0.1, 0.3);
    const poseHelper = {
      centerX: track.centerX,
      centerZ: track.centerZ,
      radiusX: track.radiusX,
      radiusZ: track.radiusZ,
    } as CandyTrainRuntime;
    const sleeperCount = 52;
    for (let i = 0; i < sleeperCount; i++) {
      const ang = (i / sleeperCount) * Math.PI * 2;
      const pose = this.getCandyTrainPose(poseHelper, ang);
      const sleeper = new THREE.Mesh(sleeperGeo, sleeperMats[i % sleeperMats.length]);
      sleeper.position.set(pose.x, 0.09, pose.z);
      sleeper.rotation.y = pose.yaw;
      trackGroup.add(sleeper);
    }

    // Four giant swirl-lollipop signal posts around the loop
    const stickMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0xfff7ed, roughness: 0.32, metalness: 0.05 }),
      0.8
    );
    for (let k = 0; k < 4; k++) {
      const ang = Math.PI / 4 + (k * Math.PI) / 2;
      const px = track.centerX + Math.cos(ang) * (track.radiusX + 1.75);
      const pz = track.centerZ + Math.sin(ang) * (track.radiusZ + 1.75);
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.9, 8), stickMat);
      stick.position.set(px, 0.95, pz);
      trackGroup.add(stick);
      const candy = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.14, 20), sleeperMats[(k * 2) % 6]);
      candy.rotation.x = Math.PI / 2;
      candy.position.set(px, 2.0, pz);
      trackGroup.add(candy);
      const swirl = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.05, 8, 20), stickMat);
      swirl.position.set(px, 2.0, pz + 0.08);
      trackGroup.add(swirl);
    }
    this.levelGroup.add(trackGroup);

    // 2. Shared toy-craft train materials
    const chassisMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0x4a2c2a, roughness: 0.42, metalness: 0.2 }),
      0.8
    );
    const trimMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: finish.cartTrimHex, roughness: 0.22, metalness: 0.7 }),
      0.82
    );
    const frostingMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0xfffaf0, roughness: 0.34, metalness: 0.04 }),
      0.8
    );
    const wheelMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3, metalness: 0.25 }),
      0.8
    );
    const armorMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.36, metalness: 0.62 }),
      0.8
    );
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: 0xfacc15,
      emissiveIntensity: 0.85,
      roughness: 0.2,
      metalness: 0.1,
    });
    const coinMat = stylizeMaterialAs2DIllustration(
      new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        emissive: 0x854d0e,
        emissiveIntensity: 0.25,
        roughness: 0.2,
        metalness: 0.78,
      }),
      0.82
    );
    const gemMat = new THREE.MeshStandardMaterial({
      color: 0xf0abfc,
      emissive: 0xc026d3,
      emissiveIntensity: 0.7,
      roughness: 0.1,
      metalness: 0.3,
    });
    const bodyHexByIndex = [0xef4444, 0x5eead4, 0xa78bfa, 0xfb7185, 0x60a5fa, 0xf9a8d4];

    const addWheels = (group: THREE.Group, wheels: THREE.Object3D[], zs: number[]): void => {
      for (const wz of zs) {
        for (const side of [-1, 1]) {
          const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.18, 16), wheelMat);
          wheel.rotation.z = Math.PI / 2;
          wheel.position.set(side * 0.8, 0.36, wz);
          const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.2, 0.09), frostingMat);
          wheel.add(spoke);
          group.add(wheel);
          wheels.push(wheel);
        }
      }
    };

    const cars: CandyTrainCarRuntime[] = [];
    const cfgs = level.candyTrainCars || [];
    let lagAccum = 0;
    cfgs.forEach((cfg, index) => {
      const group = new THREE.Group();
      const bodyGroup = new THREE.Group();
      group.add(bodyGroup);
      const wheels: THREE.Object3D[] = [];
      const armorPlates: THREE.Object3D[] = [];
      let ventGroup: THREE.Object3D | null = null;
      let lootGem: THREE.Object3D | null = null;
      const bodyHex = bodyHexByIndex[index % bodyHexByIndex.length];
      const bodyMat = stylizeMaterialAs2DIllustration(
        new THREE.MeshStandardMaterial({
          color: bodyHex,
          emissive: bodyHex,
          emissiveIntensity: 0.06,
          roughness: 0.3,
          metalness: 0.14,
        }),
        0.84
      );
      const carLen = cfg.kind === 'locomotive' ? 2.8 : cfg.kind === 'caboose' ? 2.3 : 2.6;

      const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.28, carLen), chassisMat);
      chassis.position.y = 0.52;
      chassis.castShadow = true;
      bodyGroup.add(chassis);
      if (index < cfgs.length - 1) {
        const coupler = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.5), chassisMat);
        coupler.position.set(0, 0.55, -carLen / 2 - 0.16);
        bodyGroup.add(coupler);
      }

      if (cfg.kind === 'locomotive') {
        const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 1.75, 20), bodyMat);
        boiler.rotation.x = Math.PI / 2;
        boiler.position.set(0, 1.12, 0.42);
        boiler.castShadow = true;
        bodyGroup.add(boiler);
        for (const bz of [-0.2, 0.42, 1.05]) {
          const band = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.05, 8, 24), frostingMat);
          band.position.set(0, 1.12, bz);
          bodyGroup.add(band);
        }
        const smokebox = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.14, 20), chassisMat);
        smokebox.rotation.x = Math.PI / 2;
        smokebox.position.set(0, 1.12, 1.32);
        bodyGroup.add(smokebox);
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), glowMat);
        lamp.position.set(0, 1.28, 1.42);
        bodyGroup.add(lamp);
        const dome = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 10), trimMat);
        dome.position.set(0, 1.68, 0.3);
        bodyGroup.add(dome);
        const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.22, 0.62, 12), frostingMat);
        chimney.position.set(0, 1.86, 0.95);
        bodyGroup.add(chimney);
        const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.18, 0.28, 14), bodyMat);
        funnel.position.set(0, 2.28, 0.95);
        bodyGroup.add(funnel);
        ventGroup = funnel;
        const cabMat = stylizeMaterialAs2DIllustration(
          new THREE.MeshStandardMaterial({ color: 0x34d399, roughness: 0.3, metalness: 0.12 }),
          0.84
        );
        const cab = new THREE.Mesh(new THREE.BoxGeometry(1.36, 1.15, 1.0), cabMat);
        cab.position.set(0, 1.38, -0.86);
        cab.castShadow = true;
        bodyGroup.add(cab);
        const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.14, 1.22), frostingMat);
        cabRoof.position.set(0, 2.02, -0.86);
        bodyGroup.add(cabRoof);
        const cabWindow = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.34, 0.5), glowMat);
        cabWindow.position.set(0, 1.62, -0.86);
        bodyGroup.add(cabWindow);
        const cowcatcher = new THREE.Mesh(new THREE.ConeGeometry(0.66, 0.55, 4), trimMat);
        cowcatcher.rotation.x = Math.PI / 2;
        cowcatcher.position.set(0, 0.52, 1.58);
        bodyGroup.add(cowcatcher);
        for (const side of [-1, 1]) {
          const boilerPlate = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.62, 1.3), armorMat);
          boilerPlate.position.set(side * 0.61, 1.12, 0.42);
          bodyGroup.add(boilerPlate);
          armorPlates.push(boilerPlate);
          const cabPlate = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.56, 0.82), armorMat);
          cabPlate.position.set(side * 0.71, 1.18, -0.86);
          bodyGroup.add(cabPlate);
          armorPlates.push(cabPlate);
        }
        addWheels(bodyGroup, wheels, [-0.95, 0, 0.95]);
      } else if (cfg.kind === 'armored') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.42, 1.16, 2.3), bodyMat);
        body.position.y = 1.26;
        body.castShadow = true;
        bodyGroup.add(body);
        const roof = new THREE.Mesh(new THREE.BoxGeometry(1.54, 0.16, 2.42), frostingMat);
        roof.position.y = 1.92;
        bodyGroup.add(roof);
        for (const side of [-1, 1]) {
          for (const dz of [-0.85, -0.28, 0.28, 0.85]) {
            const drip = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), frostingMat);
            drip.position.set(side * 0.74, 1.82, dz);
            bodyGroup.add(drip);
          }
        }
        for (const sz of [-0.62, 0.62]) {
          const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.45, 1.18, 0.12), frostingMat);
          stripe.position.set(0, 1.26, sz);
          bodyGroup.add(stripe);
        }
        for (const side of [-1, 1]) {
          for (const pz of [-0.56, 0.56]) {
            const plate = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.86, 0.86), armorMat);
            plate.position.set(side * 0.77, 1.24, pz);
            bodyGroup.add(plate);
            armorPlates.push(plate);
          }
          const endPlate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.78, 0.1), armorMat);
          endPlate.position.set(0, 1.24, side * 1.2);
          bodyGroup.add(endPlate);
          armorPlates.push(endPlate);
        }
        const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.42, 12), trimMat);
        vent.position.set(0, 2.18, 0);
        bodyGroup.add(vent);
        ventGroup = vent;
        addWheels(bodyGroup, wheels, [-0.8, 0.8]);
      } else if (cfg.kind === 'treasure') {
        const hopper = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.72, 2.3), bodyMat);
        hopper.position.y = 1.0;
        hopper.castShadow = true;
        bodyGroup.add(hopper);
        for (const side of [-1, 1]) {
          const longRim = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 2.4), trimMat);
          longRim.position.set(side * 0.72, 1.4, 0);
          bodyGroup.add(longRim);
          const shortRim = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.1, 0.1), trimMat);
          shortRim.position.set(0, 1.4, side * 1.18);
          bodyGroup.add(shortRim);
          for (let s = 0; s < 6; s++) {
            const segMat = sleeperMats[s % sleeperMats.length];
            const seg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.36), segMat);
            seg.position.set(side * 0.73, 0.86, -0.95 + s * 0.38);
            bodyGroup.add(seg);
          }
          const lightPlate = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.48, 1.0), armorMat);
          lightPlate.position.set(side * 0.78, 1.0, 0);
          bodyGroup.add(lightPlate);
          armorPlates.push(lightPlate);
        }
        const pile = new THREE.Mesh(new THREE.SphereGeometry(0.62, 16, 10), coinMat);
        pile.scale.set(1.05, 0.38, 1.6);
        pile.position.y = 1.36;
        bodyGroup.add(pile);
        for (let c = 0; c < 9; c++) {
          const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 14), coinMat);
          coin.position.set(((c % 3) - 1) * 0.38, 1.52 + (c % 2) * 0.06, (Math.floor(c / 3) - 1) * 0.62);
          coin.rotation.set(0.35 * ((c % 3) - 1), 0, 0.28 * ((c % 2) * 2 - 1));
          bodyGroup.add(coin);
        }
        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), gemMat);
        gem.position.set(0, 2.05, 0);
        bodyGroup.add(gem);
        lootGem = gem;
        addWheels(bodyGroup, wheels, [-0.8, 0.8]);
      } else {
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.36, 1.1, 1.9), bodyMat);
        body.position.y = 1.22;
        body.castShadow = true;
        bodyGroup.add(body);
        const roof = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.14, 2.06), frostingMat);
        roof.position.y = 1.84;
        bodyGroup.add(roof);
        const cupola = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.8), bodyMat);
        cupola.position.set(0, 2.15, -0.2);
        bodyGroup.add(cupola);
        const cupolaRoof = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.1, 0.96), frostingMat);
        cupolaRoof.position.set(0, 2.45, -0.2);
        bodyGroup.add(cupolaRoof);
        for (const wz of [-0.45, 0.45]) {
          const win = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.3, 0.36), glowMat);
          win.position.set(0, 1.42, wz);
          bodyGroup.add(win);
        }
        const markerLamp = new THREE.Mesh(
          new THREE.SphereGeometry(0.13, 10, 8),
          new THREE.MeshStandardMaterial({ color: 0xfca5a5, emissive: 0xef4444, emissiveIntensity: 0.9 })
        );
        markerLamp.position.set(0, 1.6, -1.0);
        bodyGroup.add(markerLamp);
        for (const side of [-1, 1]) {
          const plate = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.9), armorMat);
          plate.position.set(side * 0.72, 1.0, 0.2);
          bodyGroup.add(plate);
          armorPlates.push(plate);
        }
        addWheels(bodyGroup, wheels, [-0.7, 0.7]);
      }

      this.levelGroup.add(group);

      const labelEl = document.createElement('div');
      labelEl.className = `subtower-label candy-train-car-label is-${cfg.kind}`;
      labelEl.style.display = 'none';
      this.labelsContainer.appendChild(labelEl);

      cars.push({
        cfg,
        index,
        group,
        bodyGroup,
        wheels,
        armorPlates,
        bodyMat,
        ventGroup,
        lootGem,
        hp: cfg.hp,
        maxHp: cfg.hp,
        armor: Math.max(0, Math.min(0.8, cfg.armor)),
        armorShed: false,
        alive: true,
        lagAngle: lagAccum,
        x: 0,
        z: 0,
        vx: 0,
        vz: 0,
        yaw: 0,
        hitFlash: 0,
        ventTimer: cfg.ventInterval > 0 ? cfg.ventInterval * (0.55 + index * 0.08) : 0,
        breakAnim: 0,
        labelEl,
      });
      lagAccum += track.carSpacing / avgR;
    });

    const escapeSec = level.candyTrainEscapeSec || 85;
    const baseSpeed = level.candyTrainSpeed || 2.2;
    this.candyTrain = {
      active: true,
      tier: level.candyTrainTier || 1,
      centerX: track.centerX,
      centerZ: track.centerZ,
      radiusX: track.radiusX,
      radiusZ: track.radiusZ,
      headAngle: Math.PI / 2 + 0.95,
      baseSpeed,
      speed: baseSpeed,
      escapeTimeLeft: escapeSec,
      escapeTotalSec: escapeSec,
      stalled: false,
      wheelPhase: 0,
      smokeTimer: 0,
      cars,
      trackGroup,
    };
    this.placeCandyTrainCars(0);
  }

  /** Snaps every live car onto the loop at its lag angle behind the locomotive and derives car velocity. */
  private placeCandyTrainCars(dt: number): void {
    const train = this.candyTrain;
    if (!train) return;
    const t = this.elapsedTime;
    for (const car of train.cars) {
      if (!car.alive) continue;
      const pose = this.getCandyTrainPose(train, train.headAngle - car.lagAngle);
      if (dt > 0) {
        car.vx = (pose.x - car.x) / dt;
        car.vz = (pose.z - car.z) / dt;
      }
      car.x = pose.x;
      car.z = pose.z;
      car.yaw = pose.yaw;
      car.group.position.set(car.x, 0, car.z);
      car.group.rotation.y = car.yaw;
      car.bodyGroup.position.y = train.stalled ? 0 : Math.abs(Math.sin(t * 9.5 + car.index * 1.3)) * 0.035;
    }
  }

  public getAliveCandyTrainCarCount(): number {
    if (!this.candyTrain) return 0;
    let n = 0;
    for (const car of this.candyTrain.cars) if (car.alive) n++;
    return n;
  }

  public getCandyTrainIntegrityPct(): number {
    if (!this.candyTrain) return 0;
    let hp = 0;
    let maxHp = 0;
    for (const car of this.candyTrain.cars) {
      maxHp += car.maxHp;
      hp += car.alive ? car.hp : 0;
    }
    return maxHp > 0 ? Math.max(0, Math.min(100, Math.ceil((hp / maxHp) * 100))) : 0;
  }

  public getCandyTrainStateLabel(): string {
    const train = this.candyTrain;
    if (!train) return '列车未发车';
    if (!train.active) return this.getAliveCandyTrainCarCount() === 0 ? '车厢已全部击破' : '列车已驶离';
    if (train.stalled) return '火车头瘫痪 · 全车停摆';
    if (train.escapeTimeLeft <= 15) return '即将驶离环线';
    return '环线高速行驶';
  }

  protected getCandyTrainCarIcon(car: CandyTrainCarRuntime): string {
    if (car.cfg.kind === 'treasure') return UI_ART.trainGoldMedal;
    if (car.cfg.kind === 'armored') return car.armorShed ? UI_ART.boom : UI_ART.shield;
    return UI_ART.candyTrainRaid;
  }

  protected findNearestCandyTrainCar(x: number, z: number): { car: CandyTrainCarRuntime | null; dist: number } {
    const train = this.candyTrain;
    let best: CandyTrainCarRuntime | null = null;
    let bestD = Infinity;
    if (!train || !train.active) return { car: null, dist: bestD };
    for (const car of train.cars) {
      if (!car.alive) continue;
      const d = Math.hypot(car.x - x, car.z - z);
      if (d < bestD) {
        bestD = d;
        best = car;
      }
    }
    return { car: best, dist: bestD };
  }

  /** Applies armor-mitigated damage to a train car. Returns true if the hit broke the car. */
  public damageCandyTrainCar(car: CandyTrainCarRuntime, rawDmg: number, silent = false): boolean {
    if (!car.alive || !this.candyTrain?.active || this.isStageEnded) return false;
    const dealt = Math.max(1, rawDmg * (1 - car.armor));
    car.hp = Math.max(0, car.hp - dealt);
    car.hitFlash = 1.0;
    this.candyTrainDamageDealt += dealt;
    this.state.runSiegePool += dealt * 0.5;

    if (!car.armorShed && car.armorPlates.length > 0 && car.hp > 0 && car.hp <= car.maxHp * 0.5) {
      car.armorShed = true;
      car.armor *= 0.4;
      for (const plate of car.armorPlates) plate.visible = false;
      if (!silent) {
        this.spawnBurstParticles(car.x, 1.2, car.z, 0x94a3b8, 22);
        this.spawnShockwave(car.x, car.z, 0x94a3b8, 3.2, 0.3);
        this.spawnFloatingPopup(car.x, 2.6, car.z, '铁皮脱落!', '#cbd5e1');
      }
    }

    if (car.hp <= 0) {
      this.breakCandyTrainCar(car, silent);
      return true;
    }
    return false;
  }

  public breakCandyTrainCar(car: CandyTrainCarRuntime, silent = false): void {
    const train = this.candyTrain;
    if (!car.alive || !train) return;
    car.alive = false;
    car.hp = 0;
    car.breakAnim = 1.0;
    car.labelEl.style.display = 'none';
    this.candyTrainCarsBroken += 1;

    const goldBonus = this.state.addGold(car.cfg.rewardGold);
    this.state.championCharge = Math.min(100, this.state.championCharge + 18);
    let lootText = `赏金 +${goldBonus} 金币`;
    if (car.cfg.kind === 'treasure' && car.cfg.rewardMedals > 0) {
      this.candyTrainTreasureLooted += 1;
      this.candyTrainMedalsLooted += car.cfg.rewardMedals;
      lootText = `夺取列车金章 +${car.cfg.rewardMedals} · 赏金 +${goldBonus} 金币`;
    }
    if (car.cfg.kind === 'locomotive') {
      train.stalled = true;
    }

    if (!silent) {
      sound.playExplosion();
      this.addCameraShake(0.6);
      this.triggerScreenFlash(car.cfg.kind === 'treasure' ? '#facc15' : '#f472b6', 0.42);
      this.spawnSkyPillar(car.x, car.z, car.cfg.kind === 'treasure' ? 0xfacc15 : 0xf472b6, 2.4, 0.52);
      this.spawnShockwave(car.x, car.z, 0xfacc15, 5.6, 0.48);
      this.spawnBurstParticles(car.x, 1.6, car.z, car.cfg.kind === 'treasure' ? 0xfacc15 : 0xf472b6, 54);
      this.spawnBurstParticles(car.x, 1.2, car.z, 0xfff7ed, 20);
      this.spawnFloatingPopup(
        car.x,
        2.8,
        car.z,
        car.cfg.kind === 'treasure' ? `+${car.cfg.rewardMedals} 列车金章!` : `击破${car.cfg.shortName}!`,
        car.cfg.kind === 'treasure' ? '#facc15' : '#f9a8d4'
      );
      if (car.cfg.kind === 'locomotive') {
        this.onBanner?.(
          `${UI_ART.candyTrainRaid} 火车头瘫痪 · 全车停摆！`,
          `逃离倒计时冻结 · 剩余车厢原地待拆 · ${lootText}`
        );
      } else {
        this.onBanner?.(`${UI_ART.candyTrainRaid} 击破${car.cfg.name}！`, lootText);
      }
    }
  }

  private triggerCandyTrainVent(car: CandyTrainCarRuntime, relic: RelicBannerCombat): number {
    let hits = 0;
    const r2 = 2.9 * 2.9;
    for (let i = 0; i < MAX_UNITS; i++) {
      const u = this.units[i];
      if (!u.active || u.team !== 'blue') continue;
      const dx = u.x - car.x;
      const dz = u.z - car.z;
      const d2 = dx * dx + dz * dz;
      if (d2 > r2) continue;
      hits++;
      if (u.frostShield) {
        u.frostShield = false;
        this.spawnBurstParticles(u.x, 0.8, u.z, 0x7dd3fc, 3);
      } else {
        const ventDmg = car.cfg.ventDmg * this.getRelicDamageTakenMult(u, relic, car.cfg.ventDmg);
        u.hp -= ventDmg;
      }
      const d = Math.max(0.2, Math.sqrt(d2));
      u.vx += (dx / d) * 3.2;
      u.vz += (dz / d) * 3.2;
      if (u.hp <= 0 && u.active) {
        u.active = false;
        this.onUnitKilled(u);
      }
    }
    this.candyTrainVentHits += hits;
    const ventY = car.cfg.kind === 'locomotive' ? 2.4 : 2.3;
    this.spawnShockwave(car.x, car.z, 0xfff7ed, 3.0, 0.32);
    this.spawnBurstParticles(car.x, ventY, car.z, 0xffffff, 12);
    return hits;
  }

  protected updateCandyTrainRaid(dt: number): void {
    const train = this.candyTrain;
    if (!train || !train.active) return;
    const relic = this.state.getRelicBannerCombatSpec();
    const avgR = (train.radiusX + train.radiusZ) * 0.5;

    // 1. Locomotive drives the whole train around the loop (stalls once the locomotive is broken)
    const targetSpeed = train.stalled ? 0 : train.baseSpeed;
    train.speed = THREE.MathUtils.lerp(train.speed, targetSpeed, Math.min(1, dt * (train.stalled ? 1.8 : 3.0)));
    if (train.stalled && train.speed < 0.02) train.speed = 0;
    train.headAngle += (train.speed / avgR) * dt;
    train.wheelPhase += (train.speed / 0.34) * dt;
    this.placeCandyTrainCars(dt);

    const t = this.elapsedTime;
    for (const car of train.cars) {
      if (car.alive) {
        for (const w of car.wheels) w.rotation.x = train.wheelPhase;
        if (car.hitFlash > 0) {
          car.hitFlash = Math.max(0, car.hitFlash - dt * 6.0);
        }
        const s = 1 + car.hitFlash * 0.06;
        car.bodyGroup.scale.set(s, s, s);
        car.bodyMat.emissiveIntensity = 0.06 + car.hitFlash * 0.5;
        if (car.lootGem) {
          car.lootGem.rotation.y = t * 2.6;
          car.lootGem.position.y = 2.05 + Math.sin(t * 4.2 + car.index) * 0.12;
        }

        // Steam vents on the locomotive & armored cars scald nearby Bobos
        if (car.cfg.ventDmg > 0 && car.cfg.ventInterval > 0) {
          car.ventTimer -= dt;
          if (car.ventTimer <= 0) {
            car.ventTimer = car.cfg.ventInterval;
            this.triggerCandyTrainVent(car, relic);
          }
        }
      } else if (car.breakAnim > 0) {
        car.breakAnim = Math.max(0, car.breakAnim - dt * 1.15);
        const p = 1 - car.breakAnim;
        car.bodyGroup.rotation.z = p * 0.95;
        car.group.position.y = -p * 0.7;
        const sc = Math.max(0.05, 1 - p * 0.55);
        car.bodyGroup.scale.set(sc, sc, sc);
        if (Math.random() < dt * 10) {
          this.spawnBurstParticles(car.x, 1.0, car.z, 0x94a3b8, 1);
        }
        if (car.breakAnim <= 0) {
          car.group.visible = false;
        }
      }
    }

    // 2. Locomotive chimney puffs candy-floss steam
    const loco = train.cars[0];
    if (loco && loco.alive && !train.stalled) {
      train.smokeTimer -= dt;
      if (train.smokeTimer <= 0) {
        train.smokeTimer = 0.16;
        const fx = Math.sin(loco.yaw) * 0.95;
        const fz = Math.cos(loco.yaw) * 0.95;
        this.spawnBurstParticles(loco.x + fx, 2.55, loco.z + fz, Math.random() < 0.5 ? 0xffffff : 0xfbcfe8, 1);
      }
    }

    // 3. Escape countdown (frozen while the locomotive is broken)
    if (!train.stalled) {
      train.escapeTimeLeft = Math.max(0, train.escapeTimeLeft - dt);
    }

    // 4. Raid resolution
    if (this.getAliveCandyTrainCarCount() === 0) {
      train.active = false;
      this.bossHp = 0;
      this.spawnSkyPillar(train.centerX, train.centerZ, 0xfacc15, 3.8, 0.7);
      this.spawnShockwave(train.centerX, train.centerZ, 0xf472b6, 11.0, 0.7);
      this.finishStage(true);
      return;
    }
    if (train.escapeTimeLeft <= 0 && !train.stalled) {
      train.active = false;
      for (const car of train.cars) {
        if (car.alive) {
          car.labelEl.style.display = 'none';
          this.spawnBurstParticles(car.x, 1.4, car.z, 0xffffff, 16);
          car.group.visible = false;
        }
      }
      this.onBanner?.(
        `${UI_ART.candyTrainRaid} 糖果列车驶离环线！`,
        `本局击破车厢 ${this.candyTrainCarsBroken}/${train.cars.length} · 已夺列车金章 ${this.candyTrainMedalsLooted} 枚`
      );
      this.finishStage(false);
    }
  }
}
