/**
 * MC-1 ~ MC-18 引擎内自检（从 World3D 原样搬出）：只给 scripts/auto_playtest.py 通过 window.__mc3dWorld 调用，
 * 游戏流程本身不用。用继承拿到 World3D 的 protected 成员，不改行为。
 */
import * as THREE from 'three';
import {
  generateAirshipEscortLevel,
  generateCandyTrainRaidLevel,
  generateCandyVaultBonusLevel,
  generateClockworkColossusRaidLevel,
  generateDynamicLevel,
  generateEndlessDefenseLevel,
  generateGearTournamentLevel,
  generateGlacierSledLevel,
  generateLavaJumpLevel,
  generatePayloadEscortLevel,
  generateSubmarineRescueLevel,
  generateAsteroidDashLevel,
  generatePumpkinNightLevel,
  generatePyramidRunLevel,
  generateJungleSwingLevel,
  generatePirateBoardingLevel,
  PyramidSlabConfig,
} from '../levels/LevelData';
import {
  BoboTechBranchId,
  CannonCoreModId,
  DECOR_COMFORT_GOLD_CAP,
  DECOR_THEMES,
  DecorThemeId,
  GACHA_COLLECTION_GOLD_CAP,
  GACHA_PITY_SSR,
  GACHA_RARITIES,
  GACHA_SINGLE_COST_CORES,
  GACHA_SKINS,
  GACHA_SKIN_ORDER,
  GACHA_TEN_COST_GOLD,
  GachaRarity,
  GachaRollResult,
  HALL_TROPHY_ORDER,
  PET_COMPANIONS,
  PetCompanionId,
  RELIC_BANNERS,
  RelicBannerId,
  TROPHY_SLOT_MEDAL_COSTS,
  TACTIC_CARDS,
  TACTIC_CARD_ORDER,
  TACTIC_CROWD_CAP,
  TACTIC_RUSH_CAP,
  TACTIC_RUSH_MAX_SEC,
  TACTIC_SHIELD_CAP,
  TACTIC_CAMPAIGN_EFFECT_MULT,
  TacticCardId,
  TacticalSubWeaponId,
  scaleTacticValue,
} from './State';
import {
  LAVA_COL_SPACING,
  LAVA_ROW_SPACING,
  LAVA_PLATFORM_TOP,
  LAVA_LAND_MARGIN,
  AST_FLOAT_BASE,
  AST_FRONT_OFFSET,
  PK_FRONT_OFFSET,
  PK_NIGHT_SKY,
  PY_FRONT_OFFSET,
  PY_DESERT_SKY,
  JG_FRONT_OFFSET,
  JG_VINE_LEN,
  JG_JUNGLE_SKY,
  DEDICATED_ABYSS_TINT,
  PR_SEA_SKY,
} from './world/CourseConstants';
import {
  BOSS_GATE_Z,
  CandyTrainRuntime,
  GlacierSledRuntime,
  LavaPlatformRuntime,
  LavaRunRuntime,
  AsteroidRunRuntime,
  PumpkinGhostRuntime,
  PumpkinRunRuntime,
  PyramidRunRuntime,
  PyramidSandRuntime,
  PyramidSlabRowRuntime,
  JungleBoulderRuntime,
  JungleChasmRuntime,
  JungleSwingRuntime,
  TacticRunRuntime,
  MAX_UNITS,
  PLAYER_Z,
  SLED_Z,
  SubmarineRuntime,
  TRACK_HALF_W,
  Unit,
} from './WorldTypes';
import { RELIC_BANNER_CLOTH_HEX } from './World3D';
import { World3DFull } from './World3DFull';

export class World3DSelfChecks extends World3DFull {
  public runMc1SelfCheck(): {
    ok: boolean;
    hasJellyGate: boolean;
    hasFrostGate: boolean;
    chargeProgression: string[];
    frameColorChanged: boolean;
    jellyDoubled: boolean;
    frostBlockedGear: boolean;
    frostBlockedBarrel: boolean;
  } {
    const hasJellyGate = this.gates.some((g) => g.cfg.op === 'giant_jelly');
    const hasFrostGate = this.gates.some((g) => g.cfg.op === 'frost_shield');

    // 1. Test dynamic GateRuntime.chargeHits: -6 -> ... -> +1 -> +3 -> +5 & pillar color transition
    const testGate = this.gates[0];
    const savedCfg = { ...testGate.cfg };
    const savedCharge = testGate.chargeHits;
    const savedInitHaz = testGate.initialHazardValue;
    const savedFlipped = testGate.flippedFromHazard;

    testGate.cfg.op = 'sub';
    testGate.cfg.value = 6;
    testGate.initialHazardValue = 6;
    testGate.flippedFromHazard = false;
    testGate.chargeHits = 0;
    this.syncGateVisualStyle(testGate);
    const startHex = testGate.pillarMat.color.getHexString();
    const prog: string[] = [this.formatGateLabel(testGate.cfg)];
    for (let step = 0; step < 12; step++) {
      const prevLbl = this.formatGateLabel(testGate.cfg);
      this.chargeGate(testGate, 3, true);
      const curLbl = this.formatGateLabel(testGate.cfg);
      if (curLbl !== prevLbl) prog.push(curLbl);
    }
    const endHex = testGate.pillarMat.color.getHexString();
    const frameColorChanged = startHex !== endHex;

    // Restore gate state
    testGate.cfg = savedCfg;
    testGate.chargeHits = savedCharge;
    testGate.initialHazardValue = savedInitHaz;
    testGate.flippedFromHazard = savedFlipped;
    this.syncGateVisualStyle(testGate);

    // 2. Test Giant Jelly Gate: doubles HP & DMG and sets jellyGiant = true
    const jellyGate = this.gates.find((g) => g.cfg.op === 'giant_jelly');
    const frostGate = this.gates.find((g) => g.cfg.op === 'frost_shield');
    const probe = this.spawnUnit('blue', 'normal', 0, 10.0, 0, -6.0);
    let jellyDoubled = false;
    let frostBlockedGear = false;
    let frostBlockedBarrel = false;
    if (probe && jellyGate && frostGate) {
      const hp0 = probe.maxHp;
      const dmg0 = probe.dmg;
      this.applyGateEffect(probe, jellyGate);
      jellyDoubled =
        Boolean(probe.jellyGiant) &&
        Math.abs(probe.maxHp - hp0 * 2) < 0.01 &&
        Math.abs(probe.dmg - dmg0 * 2) < 0.01;

      // 3. Test Frosting Shield Gate vs Grinder Gear & Explosive Barrel
      this.applyGateEffect(probe, frostGate);
      const hpBeforeHazards = probe.hp;
      if (probe.frostShield) {
        // Real update tick collision against a temporary test gear & barrel (isolate from stage hazards/units)
        const savedActiveIndices: number[] = [];
        for (let i = 0; i < this.units.length; i++) {
          if (this.units[i] !== probe && this.units[i].active) {
            savedActiveIndices.push(i);
            this.units[i].active = false;
          }
        }
        const savedGates = this.gates;
        const savedZones = this.zones;
        const savedBumpers = this.bumpers;
        const savedWalls = this.walls;
        const savedNests = this.nests;
        const savedGears = [...this.gears];
        const savedBarrels = [...this.barrels];
        const savedLootBugActive = this.lootBug.active;
        this.gates = [];
        this.zones = [];
        this.bumpers = [];
        this.walls = [];
        this.nests = [];
        this.lootBug.active = false;
        this.barrels = [];

        const dummyGroup = new THREE.Group();
        const dummyLabel = document.createElement('div');
        probe.vx = 0;
        probe.vz = 0;
        probe.spawnHop = 0;
        this.gears = [
          {
            cfg: { id: '_mc1_test_gear', x: probe.x, z: probe.z, radius: 1.2, hp: 99 },
            mesh: dummyGroup,
            baseX: probe.x,
            hp: 99,
            alive: true,
            hitFlash: 0,
            labelEl: dummyLabel,
          },
        ];
        this.update(0.016);
        frostBlockedGear = probe.active && !probe.frostShield && Math.abs(probe.hp - hpBeforeHazards) < 0.01;

        // Now re-grant frost shield and test real update tick against temporary barrel
        this.applyGateEffect(probe, frostGate);
        this.gears = [];
        probe.vx = 0;
        probe.vz = 0;
        probe.spawnHop = 0;
        this.barrels = [
          {
            cfg: { id: '_mc1_test_barrel', x: probe.x, z: probe.z, hp: 99 },
            mesh: dummyGroup,
            hp: 99,
            alive: true,
            labelEl: dummyLabel,
          },
        ];
        this.update(0.016);
        frostBlockedBarrel = probe.active && !probe.frostShield && Math.abs(probe.hp - hpBeforeHazards) < 0.01;

        this.barrels = savedBarrels;
        this.gears = savedGears;
        this.nests = savedNests;
        this.walls = savedWalls;
        this.bumpers = savedBumpers;
        this.zones = savedZones;
        this.gates = savedGates;
        this.lootBug.active = savedLootBugActive;
        for (const idx of savedActiveIndices) {
          this.units[idx].active = true;
        }
      }
      probe.active = false;
    }

    const reachedPlus1 = prog.includes('+1');
    const reachedPlus3 = prog.includes('+3');
    const reachedPlus5 = prog.includes('+5');
    return {
      ok:
        hasJellyGate &&
        hasFrostGate &&
        reachedPlus1 &&
        reachedPlus3 &&
        reachedPlus5 &&
        frameColorChanged &&
        jellyDoubled &&
        frostBlockedGear &&
        frostBlockedBarrel,
      hasJellyGate,
      hasFrostGate,
      chargeProgression: prog,
      frameColorChanged,
      jellyDoubled,
      frostBlockedGear,
      frostBlockedBarrel,
    };
  }

  public runMc2SelfCheck(): {
    ok: boolean;
    stage5SubTowers: number;
    stage10SubTowers: number;
    multTwoAlive: number;
    multOneAlive: number;
    multZeroAlive: number;
    bossOverloadDamaged: boolean;
    telegraphVisible: boolean;
    sweptLaneHit: boolean;
    safeLaneUnharmed: boolean;
  } {
    const savedLevel = this.currentLevel || generateDynamicLevel(1);

    const lvl5 = generateDynamicLevel(5);
    const lvl10 = generateDynamicLevel(10);
    const stage5SubTowers = lvl5.bossSubTowers.length;
    const stage10SubTowers = lvl10.bossSubTowers.length;

    this.loadLevel(lvl5);
    const multTwoAlive = this.getSubTowerBossDamageMultiplier();
    const hpBeforeBreak = this.bossHp;
    if (this.bossSubTowers[0]) {
      this.destroyBossSubTower(this.bossSubTowers[0], true);
    }
    const multOneAlive = this.getSubTowerBossDamageMultiplier();
    if (this.bossSubTowers[1]) {
      this.destroyBossSubTower(this.bossSubTowers[1], true);
    }
    const multZeroAlive = this.getSubTowerBossDamageMultiplier();
    const bossOverloadDamaged = this.bossHp < hpBeforeBreak && !this.bossSteamBarrierMesh.visible;

    // Test Ground Half-Bridge Telegraph & High-Pressure Steam Sweep lane isolation
    for (const u of this.units) u.active = false;
    this.activeBlueIndices = [];
    this.activeRedIndices = [];

    this.startBossSteamSweep('left', true);
    const telegraphVisible =
      this.bossSteamSweep.phase === 'telegraph' && this.bossSteamSweep.telegraphGroup.visible;

    const leftProbe = this.spawnUnit('blue', 'normal', -5.2, -3.0, 0, 0);
    const rightProbe = this.spawnUnit('blue', 'normal', 5.2, -3.0, 0, 0);
    let sweptLaneHit = false;
    let safeLaneUnharmed = false;

    if (leftProbe && rightProbe) {
      leftProbe.spawnHop = 0;
      rightProbe.spawnHop = 0;
      const lIdx = this.units.indexOf(leftProbe);
      const rIdx = this.units.indexOf(rightProbe);
      if (lIdx >= 0) this.activeBlueIndices.push(lIdx);
      if (rIdx >= 0) this.activeBlueIndices.push(rIdx);
      const leftStartHp = leftProbe.hp;
      const leftStartZ = leftProbe.z;
      const rightStartHp = rightProbe.hp;

      // Advance past 2.3s telegraph + 0.9s full-bridge steam sweep
      for (let i = 0; i < 42; i++) {
        this.updateBossSteamSweep(0.08, false);
      }

      sweptLaneHit = !leftProbe.active || leftProbe.hp < leftStartHp || leftProbe.z > leftStartZ + 1.5;
      safeLaneUnharmed = rightProbe.active && Math.abs(rightProbe.hp - rightStartHp) < 0.01;
      leftProbe.active = false;
      rightProbe.active = false;
    }

    this.loadLevel(savedLevel);
    return {
      ok:
        stage5SubTowers === 2 &&
        stage10SubTowers === 2 &&
        Math.abs(multTwoAlive - 0.24) < 0.01 &&
        Math.abs(multOneAlive - 0.58) < 0.01 &&
        Math.abs(multZeroAlive - 1.0) < 0.01 &&
        bossOverloadDamaged &&
        telegraphVisible &&
        sweptLaneHit &&
        safeLaneUnharmed,
      stage5SubTowers,
      stage10SubTowers,
      multTwoAlive,
      multOneAlive,
      multZeroAlive,
      bossOverloadDamaged,
      telegraphVisible,
      sweptLaneHit,
      safeLaneUnharmed,
    };
  }

  public runMc3SelfCheck(): {
    ok: boolean;
    bonusVaultCount: number;
    bonusDuration: number;
    bonusZeroRedSpawn: boolean;
    vaultBroken: boolean;
    bonusGoldDelta: number;
    bonusShardsEarned: number;
    endlessWaveReached: number;
    endlessBrutesSpawned: number;
    persistedBestWave: number;
    medalTitle: string;
  } {
    const prevLevel = this.currentLevel;
    const prevPaused = this.isPaused;
    this.isPaused = false;

    // 1. Verify 25s Candy Vault Bonus Heist (Zero Red Enemies + 3D Candy Vault Gold & Skin Shard Burst)
    const bonusLvl = generateCandyVaultBonusLevel(5);
    this.loadLevel(bonusLvl);
    const bonusVaultCount = this.candyVaults.length;
    const bonusDuration = Math.round(this.bonusHeistTimeLeft);
    const goldBefore = this.state.gold;

    // Step 1.2s and confirm zero Red units ever spawn in Bonus Heist
    for (let i = 0; i < 30; i++) {
      this.update(0.04);
    }
    const bonusZeroRedSpawn = this.activeRedCount === 0 && this.bonusHeistTimeLeft < 25;

    // Place a squad of high-power Blue champions right next to the first Candy Vault to smash it
    const targetVault = this.candyVaults[0];
    if (targetVault) {
      targetVault.hp = 12;
      for (let k = 0; k < 4; k++) {
        const bu = this.spawnUnit('blue', 'champion', targetVault.cfg.x, targetVault.cfg.z + 1.0, 0, -4.0);
        if (bu) {
          bu.dmg = 45;
          bu.attackCooldown = 0;
        }
      }
      for (let i = 0; i < 15; i++) {
        this.update(0.04);
      }
    }
    const vaultBroken = this.bonusVaultsBroken >= 1 && Boolean(targetVault && !targetVault.alive);
    const bonusGoldDelta = Math.round(this.state.gold - goldBefore);
    const bonusShardsEarned = this.bonusHeistShardsEarned;

    // 2. Verify Endless Workshop Defense (Escalating Waves + Mutant Giant Brute Spawns + Best Wave Medal)
    const endlessLvl = generateEndlessDefenseLevel();
    this.loadLevel(endlessLvl);
    this.endlessWaveTimer = 10.96;
    this.update(0.05); // Triggers Wave 2
    this.endlessWaveTimer = 10.96;
    this.update(0.05); // Triggers Wave 3 (+1 skin shard milestone & multiple Mutant Giants)

    const endlessWaveReached = this.endlessWave;
    const endlessBrutesSpawned = this.units.filter(
      (u) => u.active && u.team === 'red' && u.kind === 'brute'
    ).length;
    const persistedBestWave = this.state.bestEndlessWave;
    const medalTitle = this.state.getEndlessMedalInfo(persistedBestWave).label;

    if (prevLevel) {
      this.loadLevel(prevLevel);
    }
    this.isPaused = prevPaused;

    return {
      ok:
        bonusVaultCount >= 5 &&
        bonusDuration === 25 &&
        bonusZeroRedSpawn &&
        vaultBroken &&
        bonusGoldDelta >= 400 &&
        bonusShardsEarned >= 1 &&
        endlessWaveReached >= 3 &&
        endlessBrutesSpawned >= 2 &&
        persistedBestWave >= 3 &&
        Boolean(medalTitle),
      bonusVaultCount,
      bonusDuration,
      bonusZeroRedSpawn,
      vaultBroken,
      bonusGoldDelta,
      bonusShardsEarned,
      endlessWaveReached,
      endlessBrutesSpawned,
      persistedBestWave,
      medalTitle,
    };
  }

  public runMc4SelfCheck(): {
    ok: boolean;
    scatterFanCount: number;
    scatterBounced: boolean;
    rainbowBeamHitRed: boolean;
    airdropSpawned: boolean;
    airdropCollected: boolean;
    dualVolleyActiveAndDoubles: boolean;
    freezeRedsSlowed: boolean;
    frontlineGiantsPromoted: boolean;
    bonusHeistSkippedAirdrop: boolean;
    cleanResetOnLoad: boolean;
  } {
    const prevLevel = this.currentLevel;
    const prevPaused = this.isPaused;
    const prevWeapon = this.state.weapon;
    this.isPaused = false;

    // 1. Standard stage: Verify Scatter 3-way fan + curb ricochet bounce
    this.loadLevel(generateDynamicLevel(1));
    this.state.setWeaponMode('scatter');
    this.turretX = -TRACK_HALF_W + 1.3;
    this.turretTargetX = this.turretX;
    this.fireTurret();
    const scatterUnits = this.units.filter((u) => u.active && u.team === 'blue');
    const scatterFanCount = scatterUnits.length;
    const bounceProbe = scatterUnits.find((u) => u.vx < -0.5 && (u.scatterBounceLeft || 0) > 0);
    for (let i = 0; i < 12; i++) {
      this.simulateUnits(0.05);
    }
    const scatterBounced = Boolean(bounceProbe && bounceProbe.vx > 0 && (bounceProbe.scatterBounceLeft || 0) < 2);

    // 2. Verify Rainbow charged piercing beam (every 4th shot)
    this.loadLevel(generateDynamicLevel(1));
    this.state.setWeaponMode('rainbow');
    this.turretX = 0;
    this.turretTargetX = 0;
    const redTarget = this.spawnUnit('red', 'normal', 0.1, 2.0, 0, 1.0);
    const targetId = redTarget ? redTarget.id : -1;
    const hpBefore = redTarget ? redTarget.hp : 0;
    const killsBefore = this.state.stageMutantsKilled;
    for (let s = 0; s < 4; s++) {
      this.fireTurret();
    }
    const rainbowBeamHitRed =
      this.state.stageMutantsKilled > killsBefore ||
      Boolean(redTarget && (!redTarget.active || redTarget.id !== targetId || redTarget.hp < hpBefore));

    // 3. Verify Tactical Airdrop spawn, landing, collection & all 3 8s frenzy buffs
    this.loadLevel(generateDynamicLevel(1));
    this.airdropSpawnTimer = 0.02;
    this.update(0.05);
    const airdropSpawned = this.airdrop.active && this.airdropDropCount >= 1;
    for (let i = 0; i < 60; i++) {
      this.update(0.05);
      if (this.airdrop.phase === 'landed') break;
    }
    const collected1 = this.hitTacticalAirdrop(4, 'dual_volley');
    const airdropCollected = collected1 && !this.airdrop.active && this.airdropCollectCount >= 1;
    const beforeDualCount = this.units.filter((u) => u.active && u.team === 'blue').length;
    this.state.setWeaponMode('gatling');
    this.fireTurret();
    const afterDualCount = this.units.filter((u) => u.active && u.team === 'blue').length;
    const dualVolleyActiveAndDoubles = this.dualVolleyTimer > 7.5 && afterDualCount - beforeDualCount >= 2;

    this.loadLevel(generateDynamicLevel(1));
    this.spawnTacticalAirdrop(0, 0);
    this.hitTacticalAirdrop(4, 'freeze_reds');
    const freezeRed = this.spawnUnit('red', 'normal', -5.2, 13.5, 0, 0);
    const zStart = freezeRed ? freezeRed.z : 0;
    for (let i = 0; i < 6; i++) {
      this.simulateUnits(0.05);
    }
    const zNormalMove = freezeRed ? freezeRed.speed * 0.3 : 1;
    const freezeRedsSlowed =
      this.freezeRedsTimer > 7.5 && Boolean(freezeRed && freezeRed.z - zStart < zNormalMove * 0.55);

    this.spawnUnit('blue', 'normal', 1.5, 4, 0, -6);
    this.spawnTacticalAirdrop(0, 0);
    this.hitTacticalAirdrop(4, 'frontline_giants');
    const giantCount = this.units.filter((u) => u.active && u.team === 'blue' && u.isMiniGiant).length;
    const frontlineGiantsPromoted = this.frontlineGiantsTimer > 7.5 && giantCount >= 1;

    // 4. Verify clean reset on loadLevel() and explicit skip during 25s Bonus Heist
    const bonusLvl = generateCandyVaultBonusLevel(5);
    this.loadLevel(bonusLvl);
    const cleanResetOnLoad =
      !this.airdrop.active &&
      this.dualVolleyTimer === 0 &&
      this.freezeRedsTimer === 0 &&
      this.frontlineGiantsTimer === 0 &&
      this.rainbowShotCounter === 0;
    for (let i = 0; i < 40; i++) {
      this.update(0.5);
    }
    const bonusHeistSkippedAirdrop = !this.airdrop.active && this.airdropDropCount === 0;

    this.state.setWeaponMode(prevWeapon);
    if (prevLevel) {
      this.loadLevel(prevLevel);
    }
    this.isPaused = prevPaused;

    return {
      ok:
        scatterFanCount >= 3 &&
        scatterBounced &&
        rainbowBeamHitRed &&
        airdropSpawned &&
        airdropCollected &&
        dualVolleyActiveAndDoubles &&
        freezeRedsSlowed &&
        frontlineGiantsPromoted &&
        cleanResetOnLoad &&
        bonusHeistSkippedAirdrop,
      scatterFanCount,
      scatterBounced,
      rainbowBeamHitRed,
      airdropSpawned,
      airdropCollected,
      dualVolleyActiveAndDoubles,
      freezeRedsSlowed,
      frontlineGiantsPromoted,
      bonusHeistSkippedAirdrop,
      cleanResetOnLoad,
    };
  }

  public runMc5SelfCheck(): {
    ok: boolean;
    barricadeCount: number;
    cartChargedAndMoved: boolean;
    overdriveReached: boolean;
    ramCount: number;
    barricadeDemolished: boolean;
    escortCompleted: boolean;
    persistedBestPct: number;
    persistedClears: number;
    finishModesApplied: number[];
    cannonHexChanged: boolean;
    cartHexChanged: boolean;
  } {
    const prevLevel = this.currentLevel;
    const prevPaused = this.isPaused;
    const prevGold = this.state.gold;
    const prevSkin = this.state.equippedSkin;
    const prevOwnedSkins = [...this.state.ownedSkins];
    const prevFinish = this.state.equippedFinish;
    const prevOwnedFinishes = [...this.state.ownedFinishes];
    const prevShards = { ...this.state.skinShards };

    this.isPaused = false;

    // 1. Test Steam Armored Payload Escort Mode (Charging, Overdrive, Barricade Ramming & Stronghold Breach)
    const escortLvl = generatePayloadEscortLevel(1);
    this.loadLevel(escortLvl);
    const barricadeCount = this.escortBarricades.length;
    const zInit = this.payloadCart ? this.payloadCart.z : 0;
    const baseSnap = this.getAppliedLiverySnapshot();

    for (let k = 0; k < 7; k++) {
      this.spawnUnit('blue', 'normal', (k - 3) * 0.45, zInit + 0.5, 0, -3.5);
    }
    for (let step = 0; step < 12; step++) {
      this.update(0.05);
    }
    const cartChargedAndMoved = Boolean(
      this.payloadCart && this.payloadCart.z < zInit - 0.5 && this.payloadCart.steamCharge > 10
    );
    const overdriveReached = Boolean(
      this.payloadCart &&
        (this.payloadCart.chargeState === 'overdrive' || this.payloadCart.steamCharge > 40)
    );

    // Move cart directly in front of Barricade #1 and verify battering-ram collision & demolition
    const firstBar = this.escortBarricades[0];
    if (this.payloadCart && firstBar) {
      for (let i = 0; i < MAX_UNITS; i++) {
        this.units[i].active = false;
      }
      firstBar.hp = 210;
      this.payloadCart.z = firstBar.cfg.z + 1.8;
      this.payloadCart.ramCooldown = 0;
      this.payloadCart.steamCharge = 90;
      for (let k = 0; k < 6; k++) {
        const bu = this.spawnUnit('blue', 'normal', (k - 2.5) * 0.45, firstBar.cfg.z + 3.8, 0, -1.2);
        if (bu) bu.dmg = 2;
      }
      for (let step = 0; step < 16; step++) {
        this.update(0.05);
      }
    }
    const ramCount = this.escortRamCount;
    const barricadeDemolished = this.escortBarricadesBroken >= 1 && Boolean(firstBar && !firstBar.alive);

    // Clear remaining barricades & advance cart to stronghold targetZ to verify completion & persistence
    for (const b of this.escortBarricades) {
      b.alive = false;
      b.group.visible = false;
    }
    if (this.payloadCart) {
      this.payloadCart.z = this.payloadCart.targetZ + 0.15;
      this.spawnUnit('blue', 'normal', 0, this.payloadCart.z + 0.2, 0, -3.0);
      this.update(0.1);
    }
    const escortCompleted = this.isStageEnded && this.lastStageVictory && this.bossHp === 0;
    const rec = this.state.recordEscortRun(100, 18.4, this.escortBarricadesBroken, escortCompleted);

    // 2. Test Bobo Squad Paint & Material Workshop (Unlock/Equip Finishes + Colorways -> 3D Unit/Cannon/Cart Materials)
    this.loadLevel(generatePayloadEscortLevel(1));
    this.state.gold = Math.max(this.state.gold, 50000);
    this.state.skinShards.azure = Math.max(this.state.skinShards.azure || 0, 15);
    const finishModesApplied: number[] = [this.getAppliedLiverySnapshot().unitFinishMode];

    this.state.buyOrEquipSkin('crimson');
    this.state.unlockOrEquipFinish('brass_steam');
    this.applySkin(this.state.getEquippedSkin());
    const brassSnap = this.getAppliedLiverySnapshot();
    finishModesApplied.push(brassSnap.unitFinishMode);

    this.state.unlockOrEquipFinish('crystal_jelly');
    this.applySkin(this.state.getEquippedSkin());
    finishModesApplied.push(this.getAppliedLiverySnapshot().unitFinishMode);

    this.state.unlockOrEquipFinish('starlight_prism');
    this.applySkin(this.state.getEquippedSkin());
    const prismSnap = this.getAppliedLiverySnapshot();
    finishModesApplied.push(prismSnap.unitFinishMode);

    const cannonHexChanged =
      brassSnap.cannonBarrelHex !== baseSnap.cannonBarrelHex &&
      prismSnap.cannonBarrelHex !== brassSnap.cannonBarrelHex;
    const cartHexChanged =
      brassSnap.cartArmorHex !== baseSnap.cartArmorHex &&
      prismSnap.cartArmorHex !== brassSnap.cartArmorHex;

    // Restore player state & level cleanly (keep escort record for milestone verification)
    this.state.gold = prevGold;
    this.state.ownedSkins = prevOwnedSkins;
    this.state.equippedSkin = prevSkin;
    this.state.ownedFinishes = prevOwnedFinishes;
    this.state.equippedFinish = prevFinish;
    this.state.skinShards = prevShards;
    this.state.save();
    if (prevLevel) {
      this.loadLevel(prevLevel);
    }
    this.applySkin(this.state.getEquippedSkin());
    this.isPaused = prevPaused;

    return {
      ok:
        barricadeCount === 4 &&
        cartChargedAndMoved &&
        overdriveReached &&
        ramCount >= 1 &&
        barricadeDemolished &&
        escortCompleted &&
        rec.bestProgressPct === 100 &&
        rec.escortClears >= 1 &&
        finishModesApplied.includes(1) &&
        finishModesApplied.includes(2) &&
        finishModesApplied.includes(3) &&
        cannonHexChanged &&
        cartHexChanged,
      barricadeCount,
      cartChargedAndMoved,
      overdriveReached,
      ramCount,
      barricadeDemolished,
      escortCompleted,
      persistedBestPct: rec.bestProgressPct,
      persistedClears: rec.escortClears,
      finishModesApplied,
      cannonHexChanged,
      cartHexChanged,
    };
  }

  public runMc6SelfCheck(): {
    ok: boolean;
    mechaSummoned: boolean;
    fusedSquadCount: number;
    mechaMarchedForward: boolean;
    volleysFired: number;
    redUnitsSmashed: boolean;
    barricadeSmashed: boolean;
    shieldStripped: boolean;
    hangarUpgradedAndPersisted: boolean;
    milestoneClaimed: boolean;
    weatherAffixesSeen: string[];
    tailwindAccelerated: boolean;
    empTelegraphedAndPulsed: boolean;
    frostingVaultedBarricadeAndBuffed: boolean;
    bonusVaultCompatible: boolean;
    escortCompatible: boolean;
  } {
    const prevLevel = this.currentLevel;
    const prevPaused = this.isPaused;
    const prevGold = this.state.gold;
    const prevShards = { ...this.state.skinShards };
    const prevCore = this.state.mechaCoreLevel;
    const prevCannon = this.state.mechaCannonLevel;
    const prevSummons = this.state.totalMechaSummons;
    const prevSmashes = this.state.totalMechaSmashes;
    const prevMilestone = this.state.claimedMechaMilestoneTier;

    this.isPaused = false;

    // 1. Verify Deterministic Weather Affixes & Bridge Hazard/Buff Zones across Stages 1..6
    const weatherSet = new Set<string>();
    for (let s = 1; s <= 6; s++) {
      const dl = generateDynamicLevel(s, 60000 + s);
      if (dl.weatherAffix?.id) weatherSet.add(dl.weatherAffix.id);
    }
    const weatherAffixesSeen = Array.from(weatherSet);

    // 2. Verify Hangar Upgrade & Persistence + Twin-Cannon Mecha Overlord Summon, Fusion, Twin Volley, Red/Shield/Barricade Smash
    this.state.gold = Math.max(this.state.gold, 25000);
    const coreBefore = this.state.mechaCoreLevel;
    const cannonBefore = this.state.mechaCannonLevel;
    const upgCoreOk = this.state.upgradeMechaCore();
    const upgCannonOk = this.state.upgradeMechaCannon();
    const savedRaw = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}');
    const hangarUpgradedAndPersisted =
      upgCoreOk &&
      upgCannonOk &&
      savedRaw.mechaCoreLevel === coreBefore + 1 &&
      savedRaw.mechaCannonLevel === cannonBefore + 1;

    const testLvl = generateDynamicLevel(5, 60606);
    this.loadLevel(testLvl);
    for (let i = 0; i < MAX_UNITS; i++) this.units[i].active = false;

    // Spawn 4 friendly Bobos near summon zone for Fusion + Red cluster ahead + Boss Void Shield active
    for (let k = 0; k < 4; k++) {
      this.spawnUnit('blue', 'normal', (k - 1.5) * 0.6, PLAYER_Z - 3.2, 0, -2.5);
    }
    for (let r = 0; r < 5; r++) {
      const ru = this.spawnUnit('red', 'normal', (r - 2) * 0.5, PLAYER_Z - 9.2, 0, 1.2);
      if (ru) {
        ru.hp = 18;
        ru.maxHp = 18;
      }
    }
    this.activateBossShieldPhase(true);
    const shieldBefore = this.bossShieldHitsRemaining;

    this.state.mechaOverlordCharge = 100;
    const mechaSummoned = this.summonMechaOverlord();
    const fusedSquadCount = this.mechaOverlord.fusedSquadCount;
    const zStart = this.mechaOverlord.z;

    for (let step = 0; step < 32; step++) {
      this.update(0.05);
    }
    // Also place Mecha Overlord within artillery range of Boss Gate to verify shield stripping
    if (this.mechaOverlord.active) {
      for (let i = 0; i < MAX_UNITS; i++) {
        if (this.units[i].team === 'red') this.units[i].active = false;
      }
      for (const st of this.bossSubTowers) st.alive = false;
      this.mechaOverlord.z = BOSS_GATE_Z + 6.5;
      this.mechaOverlord.volleyCooldown = 0;
      for (let step = 0; step < 14; step++) {
        this.update(0.05);
      }
    }

    const mechaMarchedForward = zStart - this.mechaOverlord.z > 1.2;
    const volleysFired = this.mechaOverlord.volleysFired;
    const redUnitsSmashed = this.mechaOverlord.smashesCount >= 1;
    const shieldStripped = !this.bossShieldActive || this.bossShieldHitsRemaining < shieldBefore;

    const msRes = this.state.claimMechaMilestone();
    const milestoneClaimed = msRes.claimed || this.state.claimedMechaMilestoneTier >= 1;

    // 3. Verify Tailwind Boost Belt, EMP Pulse Telegraph & Shield Strip, Frosting Bounce Pad Vault over Escort Barricade!
    const escLvl = generatePayloadEscortLevel(1);
    this.loadLevel(escLvl);
    for (let i = 0; i < MAX_UNITS; i++) this.units[i].active = false;

    // Mecha Overlord smashing an Escort Barricade
    const escBar = this.escortBarricades[0];
    if (escBar) {
      escBar.hp = 90;
      this.state.mechaOverlordCharge = 100;
      this.summonMechaOverlord();
      this.mechaOverlord.x = escBar.cfg.x;
      this.mechaOverlord.z = escBar.cfg.z + 1.5;
      this.mechaOverlord.stompCooldown = 0;
      for (let step = 0; step < 8; step++) this.update(0.05);
    }
    const barricadeSmashed = Boolean(escBar && !escBar.alive);
    this.resetMechaOverlord();

    // Tailwind Belt acceleration check
    const twZone = this.zones.find((z) => z.cfg.type === 'tailwind_belt');
    let tailwindAccelerated = false;
    if (twZone) {
      const uFast = this.spawnUnit('blue', 'normal', twZone.cfg.x, twZone.cfg.z + 0.8, 0, -3.0);
      const uNorm = this.spawnUnit('blue', 'normal', 0, twZone.cfg.z + 0.8, 0, -3.0);
      for (let step = 0; step < 8; step++) this.update(0.05);
      tailwindAccelerated = Boolean(
        uFast &&
          uNorm &&
          uFast.z < uNorm.z - 0.6 &&
          (uFast.tailwindBoostTimer || 0) > 0
      );
    }

    // EMP Zone telegraph -> pulse -> Red stagger & Blue FrostShield strip
    const empZone = this.zones.find((z) => z.cfg.type === 'emp_zone');
    let empTelegraphedAndPulsed = false;
    if (empZone) {
      empZone.empPhase = 'idle';
      empZone.empTimer = 0.02;
      this.update(0.05);
      const sawTelegraph = (empZone.empPhase as string) === 'telegraph';
      const redVictim = this.spawnUnit('red', 'brute', empZone.cfg.x, empZone.cfg.z, 0, 0.5);
      const shieldedBlue = this.spawnUnit('blue', 'normal', empZone.cfg.x + 0.4, empZone.cfg.z, 0, -1.0);
      if (shieldedBlue) shieldedBlue.frostShield = true;
      empZone.empTimer = 0.02;
      this.update(0.05);
      empTelegraphedAndPulsed = Boolean(
        sawTelegraph &&
          (empZone.empPulseCount || 0) >= 1 &&
          redVictim &&
          (redVictim.empTimer || 0) >= 1.0 &&
          shieldedBlue &&
          !shieldedBlue.frostShield
      );
    }

    // Frosting Bounce Pad vaulting cleanly over Escort Barricade #2 with Frosting Burst bonus!
    const padZone = this.zones.find((z) => z.cfg.type === 'frosting_pad');
    const bar2 = this.escortBarricades[1];
    let frostingVaultedBarricadeAndBuffed = false;
    if (padZone && bar2) {
      bar2.alive = true;
      bar2.hp = 9999;
      padZone.cfg.x = bar2.cfg.x;
      padZone.cfg.z = bar2.cfg.z + 1.1;
      const jumper = this.spawnUnit('blue', 'normal', padZone.cfg.x, padZone.cfg.z, 0, -3.2);
      for (let step = 0; step < 10; step++) this.update(0.04);
      frostingVaultedBarricadeAndBuffed = Boolean(
        jumper &&
          jumper.active &&
          jumper.z < bar2.cfg.z - 0.3 &&
          (jumper.frostingBurstTimer || 0) > 1.5 &&
          jumper.frostShield
      );
    }
    const escortCompatible = Boolean(
      escLvl.weatherAffix &&
        escLvl.zones.some((z) => z.type === 'tailwind_belt') &&
        escLvl.zones.some((z) => z.type === 'frosting_pad') &&
        this.payloadCart?.active
    );

    // 4. Verify Bonus Vault Mode graceful compatibility (tailwind + frosting pad, zero EMP hazard)
    const bonusLvl = generateCandyVaultBonusLevel(5);
    this.loadLevel(bonusLvl);
    for (let step = 0; step < 5; step++) this.update(0.05);
    const bonusVaultCompatible = Boolean(
      bonusLvl.weatherAffix?.id === 'sugar_snow_updraft' &&
        bonusLvl.zones.some((z) => z.type === 'tailwind_belt') &&
        bonusLvl.zones.some((z) => z.type === 'frosting_pad') &&
        !bonusLvl.zones.some((z) => z.type === 'emp_zone') &&
        this.candyVaults.length >= 5
    );

    // Restore player state (keep 1 summon + 1 core upgrade if fresh so UI reflects unlocked milestone/progress cleanly, or restore exact)
    this.state.gold = prevGold;
    this.state.skinShards = prevShards;
    this.state.mechaCoreLevel = Math.max(prevCore, 1);
    this.state.mechaCannonLevel = Math.max(prevCannon, 1);
    this.state.totalMechaSummons = Math.max(prevSummons, 1);
    this.state.totalMechaSmashes = Math.max(prevSmashes, 3);
    this.state.claimedMechaMilestoneTier = Math.max(prevMilestone, 1);
    this.state.save();
    if (prevLevel) {
      this.loadLevel(prevLevel);
    }
    this.applySkin(this.state.getEquippedSkin());
    this.isPaused = prevPaused;

    return {
      ok:
        mechaSummoned &&
        fusedSquadCount >= 1 &&
        mechaMarchedForward &&
        volleysFired >= 1 &&
        redUnitsSmashed &&
        barricadeSmashed &&
        shieldStripped &&
        hangarUpgradedAndPersisted &&
        milestoneClaimed &&
        weatherAffixesSeen.length === 3 &&
        tailwindAccelerated &&
        empTelegraphedAndPulsed &&
        frostingVaultedBarricadeAndBuffed &&
        bonusVaultCompatible &&
        escortCompatible,
      mechaSummoned,
      fusedSquadCount,
      mechaMarchedForward,
      volleysFired,
      redUnitsSmashed,
      barricadeSmashed,
      shieldStripped,
      hangarUpgradedAndPersisted,
      milestoneClaimed,
      weatherAffixesSeen,
      tailwindAccelerated,
      empTelegraphedAndPulsed,
      frostingVaultedBarricadeAndBuffed,
      bonusVaultCompatible,
      escortCompatible,
    };
  }

  public runMc7SelfCheck(): {
    ok: boolean;
    ladderStagesDistinct: boolean;
    streakMultipliers: number[];
    chestClaimedAll3: boolean;
    trophiesPersisted: boolean;
    globalFireRateBoosted: boolean;
    globalPowerBoosted: boolean;
    workbenchUpgradedLv5: boolean;
    electroNetStunnedAndStrippedShield: boolean;
    syrupBubbleSlowedAndAmplifiedDamage: boolean;
    rallyHornBoostedMoveAndAttack: boolean;
  } {
    const prevPaused = this.isPaused;
    const prevLevel = this.currentLevel;
    const prevGold = this.state.gold;
    const prevShards = { ...this.state.skinShards };
    const prevEquippedSw = this.state.equippedSubWeapon;
    const prevSwLevels = { ...this.state.subWeaponLevels };
    const prevSwCasts = this.state.totalSubWeaponCasts;
    const prevTrnStage = this.state.tournamentStage;
    const prevTrnStreak = this.state.tournamentWinStreak;
    const prevTrnCup = this.state.tournamentCupTier;
    const prevTrnTrophies = this.state.tournamentTrophies;
    const prevTrnBricks = this.state.tournamentBricks;
    const prevPendingChest = this.state.pendingTournamentChestStage;
    const prevChestsClaimed = this.state.tournamentChestsClaimed;

    this.isPaused = false;

    // 1. Verify 3-stage Gear Summit Tournament escalating ladder, Streak Multiplier Chests & Trophy Global Boosts
    this.state.tournamentStage = 1;
    this.state.tournamentWinStreak = 0;
    this.state.tournamentCupTier = 1;
    this.state.tournamentTrophies = 0;
    this.state.tournamentBricks = 0;
    this.state.pendingTournamentChestStage = 0;
    const baseFireRate = this.state.getFireRatePerSec();
    const basePower = this.state.getPowerMultiplier();

    const tLvl1 = generateGearTournamentLevel(1, 1);
    const tLvl2 = generateGearTournamentLevel(2, 1);
    const tLvl3 = generateGearTournamentLevel(3, 1);
    const ladderStagesDistinct = Boolean(
      tLvl1.isGearTournament &&
        tLvl2.isGearTournament &&
        tLvl3.isGearTournament &&
        tLvl1.tournamentStageTitle === '第 1/3 战 · 铜齿预赛' &&
        tLvl2.tournamentStageTitle === '第 2/3 战 · 银齿半决赛' &&
        tLvl3.tournamentStageTitle === '第 3/3 战 · 金齿巅峰决战' &&
        tLvl1.bossMaxHp < tLvl2.bossMaxHp &&
        tLvl2.bossMaxHp < tLvl3.bossMaxHp &&
        tLvl1.themeId !== tLvl2.themeId &&
        tLvl2.themeId !== tLvl3.themeId &&
        tLvl2.bossSubTowers.length === 2 &&
        tLvl3.bossSubTowers.length === 2
    );

    const streakMultipliers = [
      tLvl1.tournamentStreakMult || 0,
      tLvl2.tournamentStreakMult || 0,
      tLvl3.tournamentStreakMult || 0,
    ];

    const res1 = this.state.recordTournamentMatchResult(true, 1);
    const claim1 = this.state.claimTournamentStreakChest();
    const stageAfter1: number = this.state.tournamentStage;

    const res2 = this.state.recordTournamentMatchResult(true, 2);
    const claim2 = this.state.claimTournamentStreakChest();
    const stageAfter2: number = this.state.tournamentStage;

    const res3 = this.state.recordTournamentMatchResult(true, 3);
    const claim3 = this.state.claimTournamentStreakChest();
    const stageAfter3: number = this.state.tournamentStage;

    const chestClaimedAll3 = Boolean(
      res1.unlockedChestStage === 1 &&
        claim1.claimed &&
        stageAfter1 === 2 &&
        res2.unlockedChestStage === 2 &&
        claim2.claimed &&
        stageAfter2 === 3 &&
        res3.unlockedChestStage === 3 &&
        res3.cupCompleted &&
        claim3.claimed &&
        stageAfter3 === 1 &&
        claim1.coinsAwarded < claim2.coinsAwarded &&
        claim2.coinsAwarded < claim3.coinsAwarded &&
        claim3.bricksAwarded > 0 &&
        claim3.cardsAwarded > 0 &&
        this.state.tournamentTrophies >= 80
    );

    const rawSavedAfterTrn = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}') as {
      tournamentTrophies?: number;
      tournamentBricks?: number;
    };
    const trophiesPersisted = Boolean(
      (rawSavedAfterTrn.tournamentTrophies || 0) === this.state.tournamentTrophies &&
        (rawSavedAfterTrn.tournamentBricks || 0) === this.state.tournamentBricks
    );
    const globalFireRateBoosted = this.state.getFireRatePerSec() > baseFireRate * 1.04;
    const globalPowerBoosted = this.state.getPowerMultiplier() > basePower * 1.06;

    // 2. Verify Tactical Sub-Weapon Workbench Lv.1 -> Lv.5 upgrades & equip persistence
    this.state.gold = 999999;
    this.state.subWeaponLevels = { electro_net: 1, syrup_bubble: 1, rally_horn: 1 };
    let upgradedAll = true;
    for (const swId of ['electro_net', 'syrup_bubble', 'rally_horn'] as TacticalSubWeaponId[]) {
      const cdLv1 = this.state.getSubWeaponCombatSpec(swId).cooldownSec;
      for (let step = 0; step < 4; step++) {
        if (!this.state.upgradeSubWeapon(swId)) upgradedAll = false;
      }
      const cdLv5 = this.state.getSubWeaponCombatSpec(swId).cooldownSec;
      if (this.state.getSubWeaponLevel(swId) !== 5 || cdLv5 >= cdLv1) {
        upgradedAll = false;
      }
    }
    this.state.equipSubWeapon('syrup_bubble');
    const savedWorkbench = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}') as {
      equippedSubWeapon?: string;
      subWeaponLevels?: Record<string, number>;
    };
    const workbenchUpgradedLv5 = Boolean(
      upgradedAll &&
        savedWorkbench.equippedSubWeapon === 'syrup_bubble' &&
        savedWorkbench.subWeaponLevels?.electro_net === 5 &&
        savedWorkbench.subWeaponLevels?.syrup_bubble === 5 &&
        savedWorkbench.subWeaponLevels?.rally_horn === 5
    );

    // 3A. Verify Electro Net (`electro_net`) in live 3D simulation: AoE stun/slow + tower & sub-tower shield strip
    this.loadLevel(tLvl2);
    for (const u of this.units) u.active = false;
    const redNetTarget = this.spawnUnit('red', 'brute', 0, -4.0, 0, 3.2);
    if (redNetTarget) {
      redNetTarget.maxHp = 9999;
      redNetTarget.hp = 9999;
    }
    this.activateBossShieldPhase(true);
    const shieldHitsBefore = this.bossShieldHitsRemaining;
    const subHpBefore = this.bossSubTowers[0]?.hp || 0;
    this.state.equipSubWeapon('electro_net');
    this.state.subWeaponCharge = 100;
    const firedNet = this.triggerTacticalSubWeapon('electro_net');
    const subHpAfter = this.bossSubTowers[0]?.hp || 0;
    const electroNetStunnedAndStrippedShield = Boolean(
      firedNet &&
        redNetTarget &&
        (redNetTarget.electroNetTimer || 0) >= 3.0 &&
        (!this.bossShieldActive || this.bossShieldHitsRemaining < shieldHitsBefore) &&
        subHpAfter < subHpBefore
    );

    // 3B. Verify Syrup Bubble (`syrup_bubble`) in live 3D simulation: sticky slow + damage taken amplification
    this.loadLevel(tLvl1);
    for (const u of this.units) u.active = false;
    const redSyruped = this.spawnUnit('red', 'brute', -3.0, -3.0, 0, 3.2);
    const redControl = this.spawnUnit('red', 'brute', 5.8, -3.0, 0, 3.2);
    if (redSyruped && redControl) {
      redSyruped.maxHp = 5000;
      redSyruped.hp = 5000;
      redControl.maxHp = 5000;
      redControl.hp = 5000;
    }
    // Deploy syrup bubble directly on redSyruped (by temporarily deactivating control so cluster centers on -3,-3)
    if (redControl) redControl.active = false;
    this.state.equipSubWeapon('syrup_bubble');
    this.state.subWeaponCharge = 100;
    const firedSyrup = this.triggerTacticalSubWeapon('syrup_bubble');
    if (redControl) {
      redControl.active = true;
      redControl.hp = 5000;
      if (redSyruped) redSyruped.hp = 5000;
    }
    for (let step = 0; step < 8; step++) this.update(0.05);
    const slowedAdvance = Boolean(redSyruped && redControl && redSyruped.z < redControl.z - 0.35);

    // Compare melee strike damage on syruped vs control red unit
    let amplifiedDamage = false;
    if (redSyruped && redControl) {
      redSyruped.hp = 5000;
      redControl.hp = 5000;
      const blueA = this.spawnUnit('blue', 'normal', redSyruped.x, redSyruped.z + 0.4, 0, 0);
      const blueB = this.spawnUnit('blue', 'normal', redControl.x, redControl.z + 0.4, 0, 0);
      if (blueA && blueB) {
        blueA.dmg = 100;
        blueB.dmg = 100;
        blueA.attackCooldown = 0;
        blueB.attackCooldown = 0;
        this.simulateUnits(0.05);
        const dmgOnSyruped = 5000 - redSyruped.hp;
        const dmgOnControl = 5000 - redControl.hp;
        amplifiedDamage = dmgOnSyruped > dmgOnControl * 1.25;
      }
    }
    const syrupBubbleSlowedAndAmplifiedDamage = Boolean(firedSyrup && slowedAdvance && amplifiedDamage);

    // 3C. Verify Rally Horn (`rally_horn`) in live 3D simulation: boosts Blue move speed + attack/fire rate
    this.loadLevel(tLvl1);
    for (const u of this.units) u.active = false;
    for (const z of this.zones) z.cfg.x = 99; // move zones off-lane for pure speed comparison
    const blueBase = this.spawnUnit('blue', 'normal', 0, 8.0, 0, -4.5);
    for (let step = 0; step < 10; step++) this.update(0.05);
    const baseDistMoved = blueBase ? 8.0 - blueBase.z : 0;

    for (const u of this.units) u.active = false;
    const blueRallied = this.spawnUnit('blue', 'normal', 0, 8.0, 0, -4.5);
    const champAnchor = this.spawnUnit('blue', 'champion', 0, 6.0, 0, -4.5);
    this.state.equipSubWeapon('rally_horn');
    this.state.subWeaponCharge = 100;
    const firedHorn = this.triggerTacticalSubWeapon('rally_horn');
    const auraAtkMult = this.rallyAuraFx.attackRateMult;
    for (let step = 0; step < 10; step++) this.update(0.05);
    const ralliedDistMoved = blueRallied ? 8.0 - blueRallied.z : 0;
    const rallyHornBoostedMoveAndAttack = Boolean(
      firedHorn &&
        champAnchor &&
        this.rallyAuraFx.active &&
        auraAtkMult >= 1.5 &&
        ralliedDistMoved > baseDistMoved * 1.22
    );

    // Restore player state cleanly
    this.state.gold = prevGold;
    this.state.skinShards = prevShards;
    this.state.equippedSubWeapon = prevEquippedSw;
    this.state.subWeaponLevels = prevSwLevels;
    this.state.totalSubWeaponCasts = Math.max(prevSwCasts, 3);
    this.state.tournamentStage = prevTrnStage;
    this.state.tournamentWinStreak = prevTrnStreak;
    this.state.tournamentCupTier = prevTrnCup;
    this.state.tournamentTrophies = prevTrnTrophies;
    this.state.tournamentBricks = prevTrnBricks;
    this.state.pendingTournamentChestStage = prevPendingChest;
    this.state.tournamentChestsClaimed = prevChestsClaimed;
    this.state.save();
    if (prevLevel) {
      this.loadLevel(prevLevel);
    }
    this.applySkin(this.state.getEquippedSkin());
    this.isPaused = prevPaused;

    return {
      ok:
        ladderStagesDistinct &&
        streakMultipliers[0] === 1.5 &&
        streakMultipliers[1] === 2.2 &&
        streakMultipliers[2] === 3.5 &&
        chestClaimedAll3 &&
        trophiesPersisted &&
        globalFireRateBoosted &&
        globalPowerBoosted &&
        workbenchUpgradedLv5 &&
        electroNetStunnedAndStrippedShield &&
        syrupBubbleSlowedAndAmplifiedDamage &&
        rallyHornBoostedMoveAndAttack,
      ladderStagesDistinct,
      streakMultipliers,
      chestClaimedAll3,
      trophiesPersisted,
      globalFireRateBoosted,
      globalPowerBoosted,
      workbenchUpgradedLv5,
      electroNetStunnedAndStrippedShield,
      syrupBubbleSlowedAndAmplifiedDamage,
      rallyHornBoostedMoveAndAttack,
    };
  }

  public runMc8SelfCheck(): {
    ok: boolean;
    colossusSpawnedWithTwoWeakpoints: boolean;
    weakpointBreakTriggeredParalysis: boolean;
    paralysisCoreCritAmplified: boolean;
    rightCannonStoppedWhenBroken: boolean;
    raidVictoryAwardedCoresAndPersisted: boolean;
    techTreeUpgradedByGoldAndCores: boolean;
    vanguardBoostedGateSurgeSpeed: boolean;
    heavySiegeBoostedHpAndWeakpointBreak: boolean;
    candyBombardSplashedAndBoostedFireRate: boolean;
    doctrineFlairSwitchedIn3D: boolean;
  } {
    const prevPaused = this.isPaused;
    const prevLevel = this.currentLevel;
    const prevGold = this.state.gold;
    const prevShards = { ...this.state.skinShards };
    const prevBricks = this.state.tournamentBricks;
    const prevCores = this.state.clockworkCores;
    const prevClears = this.state.colossusRaidClears;
    const prevWeakpoints = this.state.totalColossusWeakpointsBroken;
    const prevBestSec = this.state.bestColossusClearSec;
    const prevTechLevels = { ...this.state.boboTechLevels };
    const prevDoctrine = this.state.activeBoboTechDoctrine;

    this.isPaused = false;

    // 1. Verify Colossus Raid 3D Boss Spawn + Left Shield / Right Cannon Weakpoint Break + 6s 2.5x Paralysis Window
    this.state.boboTechLevels = { vanguard_charge: 0, heavy_siege: 0, candy_bombard: 0 };
    this.state.activeBoboTechDoctrine = 'vanguard_charge';
    const raidLevel = generateClockworkColossusRaidLevel(1);
    this.loadLevel(raidLevel);
    for (const u of this.units) u.active = false;

    const cb = this.colossusBoss;
    const colossusSpawnedWithTwoWeakpoints = Boolean(
      raidLevel.isColossusRaid &&
        raidLevel.mode === 'colossus_raid' &&
        cb &&
        cb.active &&
        cb.leftShieldAlive &&
        cb.rightCannonAlive &&
        !this.bossGroup.visible
    );

    // Measure Core damage taken BEFORE paralysis (both arms intact -> 0.48x)
    const hpBeforeGuarded = this.bossHp;
    const probeA = this.spawnUnit('blue', 'normal', 0, BOSS_GATE_Z + 0.75, 0, 0);
    if (probeA) {
      probeA.dmg = 120;
      probeA.attackCooldown = 0;
    }
    this.simulateUnits(0.05);
    const guardedCoreDmg = hpBeforeGuarded - this.bossHp;
    for (const u of this.units) u.active = false;

    // Break Left Shield Arm -> triggers 6.0s Paralysis Vulnerable Window (2.5x Core damage!)
    this.damageColossusWeakpoint('left', 99999, true);
    const weakpointBreakTriggeredParalysis = Boolean(
      cb && !cb.leftShieldAlive && cb.weakpointsBroken === 1 && cb.paralysisTimer >= 5.8 && cb.paralysisHaloGroup.visible
    );

    // Measure Core damage taken DURING paralysis (2.5x!)
    const hpBeforeParalyzed = this.bossHp;
    const probeB = this.spawnUnit('blue', 'normal', 0, BOSS_GATE_Z + 0.75, 0, 0);
    if (probeB) {
      probeB.dmg = 120;
      probeB.attackCooldown = 0;
    }
    this.simulateUnits(0.05);
    const paralyzedCoreDmg = hpBeforeParalyzed - this.bossHp;
    for (const u of this.units) u.active = false;

    const paralysisCoreCritAmplified = Boolean(
      guardedCoreDmg > 0 && paralyzedCoreDmg > guardedCoreDmg * 4.5 && this.getColossusCoreDamageMultiplier() === 2.5
    );

    // Break Right Cannon Arm -> disables Right Cannon candy volleys
    if (cb) cb.paralysisTimer = 0;
    for (const s of this.colossusCandyShells) s.active = false;
    this.damageColossusWeakpoint('right', 99999, true);
    if (cb) {
      cb.paralysisTimer = 0;
      cb.cannonVolleyTimer = 0;
    }
    this.updateClockworkColossus(0.2);
    const anyShellFiredAfterBreak = this.colossusCandyShells.some((s) => s.active);
    const rightCannonStoppedWhenBroken = Boolean(
      cb && !cb.rightCannonAlive && cb.weakpointsBroken === 2 && !anyShellFiredAfterBreak
    );

    // 2. Verify Raid Victory Rewards (`clockworkCores`, Coins, Cards, Bricks & `colossusRaidClears` persistence)
    this.state.clockworkCores = 0;
    this.state.colossusRaidClears = 0;
    const raidRes = this.state.recordColossusRaidResult(true, 2, 22.4);
    const savedRaid = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}') as {
      clockworkCores?: number;
      colossusRaidClears?: number;
    };
    const raidVictoryAwardedCoresAndPersisted = Boolean(
      raidRes.victory &&
        raidRes.coresAwarded >= 5 &&
        raidRes.coinsAwarded >= 400 &&
        raidRes.cardsAwarded >= 2 &&
        raidRes.bricksAwarded >= 100 &&
        this.state.colossusRaidClears === 1 &&
        savedRaid.clockworkCores === this.state.clockworkCores &&
        savedRaid.colossusRaidClears === 1
    );

    // 3. Verify Bobo 3-Branch Specialization Tech Tree upgrades with BOTH Gold & Clockwork Cores
    this.state.gold = 999999;
    this.state.clockworkCores = 60;
    this.state.boboTechLevels = { vanguard_charge: 0, heavy_siege: 0, candy_bombard: 0 };
    const upGold = this.state.upgradeBoboTechBranch('vanguard_charge', 'gold');
    const upCore = this.state.upgradeBoboTechBranch('heavy_siege', 'core');
    for (const bId of ['vanguard_charge', 'heavy_siege', 'candy_bombard'] as BoboTechBranchId[]) {
      while (this.state.getBoboTechLevel(bId) < 5) {
        this.state.upgradeBoboTechBranch(bId, 'auto');
      }
    }
    const savedTech = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}') as {
      boboTechLevels?: Record<string, number>;
    };
    const techTreeUpgradedByGoldAndCores = Boolean(
      upGold.upgraded &&
        upGold.spentCurrency === 'gold' &&
        upCore.upgraded &&
        upCore.spentCurrency === 'core' &&
        savedTech.boboTechLevels?.vanguard_charge === 5 &&
        savedTech.boboTechLevels?.heavy_siege === 5 &&
        savedTech.boboTechLevels?.candy_bombard === 5
    );

    // 4A. Verify `vanguard_charge` move speed + gate-pass surge speed
    this.state.boboTechLevels = { vanguard_charge: 0, heavy_siege: 0, candy_bombard: 0 };
    this.state.setActiveBoboTechDoctrine('heavy_siege');
    this.loadLevel(raidLevel);
    for (const u of this.units) u.active = false;
    for (const z of this.zones) z.cfg.x = 99;
    const baseRunner = this.spawnUnit('blue', 'normal', -4.2, 8.2, 0, -4.5);
    for (let step = 0; step < 10; step++) this.update(0.05);
    const baseDist = baseRunner ? 8.2 - baseRunner.z : 0;

    this.state.boboTechLevels = { vanguard_charge: 5, heavy_siege: 0, candy_bombard: 0 };
    this.state.setActiveBoboTechDoctrine('vanguard_charge');
    for (const u of this.units) u.active = false;
    const surgeRunner = this.spawnUnit('blue', 'normal', -4.2, 8.2, 0, -4.5);
    if (surgeRunner) surgeRunner.vanguardSurgeTimer = 2.0;
    for (let step = 0; step < 10; step++) this.update(0.05);
    const surgeDist = surgeRunner ? 8.2 - surgeRunner.z : 0;
    const vanguardBoostedGateSurgeSpeed = surgeDist > baseDist * 1.38;

    // 4B. Verify `heavy_siege` Bobo HP boost + Colossus weakpoint damage amplification
    this.state.boboTechLevels = { vanguard_charge: 0, heavy_siege: 0, candy_bombard: 0 };
    this.state.setActiveBoboTechDoctrine('vanguard_charge');
    this.loadLevel(raidLevel);
    const boboNoSiege = this.spawnUnit('blue', 'normal', 0, 10, 0, 0);
    const hpNoSiege = boboNoSiege?.maxHp || 1;
    const shieldBeforeNoSiege = this.colossusBoss?.leftShieldHp || 0;
    this.damageColossusWeakpoint('left', 80, true);
    const wpDmgNoSiege = shieldBeforeNoSiege - (this.colossusBoss?.leftShieldHp || 0);

    this.state.boboTechLevels = { vanguard_charge: 0, heavy_siege: 5, candy_bombard: 0 };
    this.state.setActiveBoboTechDoctrine('heavy_siege');
    this.loadLevel(raidLevel);
    const boboWithSiege = this.spawnUnit('blue', 'normal', 0, 10, 0, 0);
    const hpWithSiege = boboWithSiege?.maxHp || 1;
    const shieldBeforeWithSiege = this.colossusBoss?.leftShieldHp || 0;
    this.damageColossusWeakpoint('left', 80, true);
    const wpDmgWithSiege = shieldBeforeWithSiege - (this.colossusBoss?.leftShieldHp || 0);
    const heavySiegeBoostedHpAndWeakpointBreak = Boolean(
      hpWithSiege > hpNoSiege * 1.35 && wpDmgWithSiege > wpDmgNoSiege * 2.2
    );

    // 4C. Verify `candy_bombard` cannon fire-rate boost + melee candy-pop splash on Red pack + 3D doctrine flair
    this.state.boboTechLevels = { vanguard_charge: 0, heavy_siege: 0, candy_bombard: 0 };
    this.state.setActiveBoboTechDoctrine('vanguard_charge');
    const fireRateNoCandy = this.state.getFireRatePerSec();

    this.state.boboTechLevels = { vanguard_charge: 3, heavy_siege: 3, candy_bombard: 5 };
    this.state.setActiveBoboTechDoctrine('candy_bombard');
    const fireRateWithCandy = this.state.getFireRatePerSec();

    for (const u of this.units) u.active = false;
    this.lootBug.active = false;
    const primaryRed = this.spawnUnit('red', 'normal', -3.0, 10.0, 0, 0);
    const neighborRed = this.spawnUnit('red', 'normal', -1.6, 10.0, 0, 0);
    const candyBobo = this.spawnUnit('blue', 'normal', -3.0, 10.35, 0, 0);
    if (primaryRed && neighborRed && candyBobo) {
      primaryRed.maxHp = 5000;
      primaryRed.hp = 5000;
      neighborRed.maxHp = 5000;
      neighborRed.hp = 5000;
      candyBobo.maxHp = 5000;
      candyBobo.hp = 5000;
      candyBobo.dmg = 120;
      candyBobo.attackCooldown = 0;
    }
    this.simulateUnits(0.05);
    this.spawnUnit('blue', 'normal', 0, 14.2, 0, 0);
    this.renderScene();
    const candyFlairSnap = this.getActiveTechFlairSnapshot();
    this.state.setActiveBoboTechDoctrine('vanguard_charge');
    this.renderScene();
    const vanguardFlairSnap = this.getActiveTechFlairSnapshot();

    const candyBombardSplashedAndBoostedFireRate = Boolean(
      fireRateWithCandy > fireRateNoCandy * 1.2 && neighborRed && neighborRed.hp < 5000
    );
    const doctrineFlairSwitchedIn3D = Boolean(
      candyFlairSnap.candyCount >= 1 &&
        candyFlairSnap.vanguardCount === 0 &&
        vanguardFlairSnap.vanguardCount >= 1 &&
        vanguardFlairSnap.candyCount === 0
    );

    // Restore player state cleanly
    this.state.gold = prevGold;
    this.state.skinShards = prevShards;
    this.state.tournamentBricks = prevBricks;
    this.state.clockworkCores = prevCores;
    this.state.colossusRaidClears = prevClears;
    this.state.totalColossusWeakpointsBroken = prevWeakpoints;
    this.state.bestColossusClearSec = prevBestSec;
    this.state.boboTechLevels = prevTechLevels;
    this.state.activeBoboTechDoctrine = prevDoctrine;
    this.state.save();
    if (prevLevel) {
      this.loadLevel(prevLevel);
    }
    this.applySkin(this.state.getEquippedSkin());
    this.isPaused = prevPaused;

    return {
      ok:
        colossusSpawnedWithTwoWeakpoints &&
        weakpointBreakTriggeredParalysis &&
        paralysisCoreCritAmplified &&
        rightCannonStoppedWhenBroken &&
        raidVictoryAwardedCoresAndPersisted &&
        techTreeUpgradedByGoldAndCores &&
        vanguardBoostedGateSurgeSpeed &&
        heavySiegeBoostedHpAndWeakpointBreak &&
        candyBombardSplashedAndBoostedFireRate &&
        doctrineFlairSwitchedIn3D,
      colossusSpawnedWithTwoWeakpoints,
      weakpointBreakTriggeredParalysis,
      paralysisCoreCritAmplified,
      rightCannonStoppedWhenBroken,
      raidVictoryAwardedCoresAndPersisted,
      techTreeUpgradedByGoldAndCores,
      vanguardBoostedGateSurgeSpeed,
      heavySiegeBoostedHpAndWeakpointBreak,
      candyBombardSplashedAndBoostedFireRate,
      doctrineFlairSwitchedIn3D,
    };
  }

  public runMc9SelfCheck(): {
    ok: boolean;
    airshipSpawnedWithAntiAirTurrets: boolean;
    uncontestedFlakDamagedAirship: boolean;
    blueSquadNeutralizedAntiAirAndDroppedPod: boolean;
    dropPodSpawnedShockTroops: boolean;
    escortVictoryPersistedMedalsAndMilestones: boolean;
    cannonModsUnlockedUpgradedAndPersisted: boolean;
    overdriveBoostedCadenceAndDoubleTapped: boolean;
    prismRefractedChargedBobos: boolean;
    heavyMortarLaunchedArmoredSiegeBobo: boolean;
    cannonBarrelModVisualsSwitched3D: boolean;
  } {
    const prevPaused = this.isPaused;
    const prevLevel = this.currentLevel;
    const prevGold = this.state.gold;
    const prevMedals = this.state.airshipWingMedals;
    const prevLifeMedals = this.state.lifetimeAirshipWingMedals;
    const prevClears = this.state.airshipEscortClears;
    const prevBestPct = this.state.bestAirshipProgressPct;
    const prevBestSec = this.state.bestAirshipClearSec;
    const prevDropPods = this.state.totalAirshipDropPods;
    const prevAaCleared = this.state.totalAntiAirTurretsCleared;
    const prevModLevels = { ...this.state.cannonModLevels };
    const prevActiveMod = this.state.activeCannonMod;
    const prevBursts = this.state.totalCannonModBursts;

    this.isPaused = true;

    // 1. Load Airship Mothership Escort Level -> Verify 3D Airship + 4 Anti-Air Sub-Turrets
    const airLevel = generateAirshipEscortLevel(1);
    this.loadLevel(airLevel);
    const ship = this.airshipMothership;
    const airshipSpawnedWithAntiAirTurrets = Boolean(
      airLevel.isAirshipEscort &&
        airLevel.mode === 'airship_escort' &&
        ship &&
        ship.active &&
        this.antiAirTurrets.length === 4
    );

    // 2. Uncontested Anti-Air Flak Sub-Turret shells the Airship
    for (const u of this.units) u.active = false;
    const initialPool = (ship?.hp || 0) + (ship?.shield || 0);
    if (this.antiAirTurrets[0] && ship) {
      ship.z = this.antiAirTurrets[0].cfg.z + 3.0;
      this.antiAirTurrets[0].fireTimer = 0.02;
    }
    this.updateAirshipEscort(0.05);
    const afterFlakPool = (ship?.hp || 0) + (ship?.shield || 0);
    const uncontestedFlakDamagedAirship = afterFlakPool < initialPool && (ship?.flakHitsTaken || 0) >= 1;

    // 3. Blue Bobo squad neutralizes Anti-Air Sub-Turret -> Deploys Super Bobo Drop Pod -> Releases Reinforced Shock Troops
    const firstAa = this.antiAirTurrets[0];
    if (firstAa) {
      this.damageAntiAirTurret(firstAa, firstAa.hp + 50, true);
    }
    const blueSquadNeutralizedAntiAirAndDroppedPod =
      Boolean(firstAa && !firstAa.alive) &&
      this.antiAirTurretsCleared >= 1 &&
      this.airshipDropPodsDeployed >= 1;

    let blueActiveBeforeLand = 0;
    for (const u of this.units) {
      if (u.active && u.team === 'blue') blueActiveBeforeLand++;
    }
    for (let step = 0; step < 12; step++) {
      this.updateAirshipEscort(0.06);
    }
    let blueActiveAfterLand = 0;
    let giantShockFound = false;
    for (const u of this.units) {
      if (u.active && u.team === 'blue') {
        blueActiveAfterLand++;
        if (u.frostShield && (u.isMiniGiant || u.jellyGiant)) giantShockFound = true;
      }
    }
    const dropPodSpawnedShockTroops =
      blueActiveAfterLand >= blueActiveBeforeLand + 4 && giantShockFound;

    // 4. Escort Victory Settlement -> Persists `airshipWingMedals` & Unlocks Global Passive Milestones
    this.state.airshipWingMedals = 0;
    this.state.lifetimeAirshipWingMedals = 0;
    this.state.airshipEscortClears = 0;
    const baseMilestone = this.state.getAirshipMilestoneBonus(0);
    const escortRec = this.state.recordAirshipEscortResult(true, 100, 3, 2, 19.4);
    const savedAfterEscort = JSON.parse(
      localStorage.getItem('swarm_control_3d_save_v3') || '{}'
    ) as { airshipWingMedals?: number; airshipEscortClears?: number };
    const boostedMilestone = this.state.getAirshipMilestoneBonus();
    const escortVictoryPersistedMedalsAndMilestones =
      escortRec.victory &&
      escortRec.medalsAwarded >= 4 &&
      this.state.airshipWingMedals === escortRec.medalsAwarded &&
      savedAfterEscort.airshipWingMedals === escortRec.medalsAwarded &&
      savedAfterEscort.airshipEscortClears === 1 &&
      boostedMilestone.fireRateMult > baseMilestone.fireRateMult &&
      boostedMilestone.troopHpMult > baseMilestone.troopHpMult &&
      boostedMilestone.startingDropCharge > baseMilestone.startingDropCharge;

    // 5. Steam Cannon Core Module Workbench: Unlock/Upgrade all 3 modules (Lv.1..5), Equip, Persist & Fire in Battle!
    this.state.gold = 25000;
    this.state.airshipWingMedals = 30;
    this.state.cannonModLevels = {
      overdrive_breech: 1,
      prism_splitter: 0,
      heavy_mortar: 0,
    };
    this.state.activeCannonMod = 'overdrive_breech';
    const baseFireNoOverdrive = (() => {
      this.state.cannonModLevels.overdrive_breech = 0;
      const r = this.state.getFireRatePerSec();
      this.state.cannonModLevels.overdrive_breech = 1;
      return r;
    })();
    const upOverdrive = this.state.upgradeCannonMod('overdrive_breech', 'medal');
    const unlockPrism = this.state.upgradeCannonMod('prism_splitter', 'medal');
    const upPrism = this.state.upgradeCannonMod('prism_splitter', 'gold');
    const unlockMortar = this.state.upgradeCannonMod('heavy_mortar', 'gold');
    const upMortar = this.state.upgradeCannonMod('heavy_mortar', 'medal');
    const eqMortar = this.state.equipCannonMod('heavy_mortar');
    const savedMods = JSON.parse(
      localStorage.getItem('swarm_control_3d_save_v3') || '{}'
    ) as {
      activeCannonMod?: CannonCoreModId;
      cannonModLevels?: Record<CannonCoreModId, number>;
    };
    const cannonModsUnlockedUpgradedAndPersisted =
      upOverdrive.upgraded &&
      unlockPrism.upgraded &&
      unlockPrism.wasUnlock &&
      upPrism.upgraded &&
      unlockMortar.upgraded &&
      unlockMortar.wasUnlock &&
      upMortar.upgraded &&
      eqMortar &&
      savedMods.activeCannonMod === 'heavy_mortar' &&
      (savedMods.cannonModLevels?.overdrive_breech || 0) >= 2 &&
      (savedMods.cannonModLevels?.prism_splitter || 0) >= 2 &&
      (savedMods.cannonModLevels?.heavy_mortar || 0) >= 2;

    // 5A. Overdrive Breech: cadence boost + rapid double-tap burst + 3D barrel attachment
    this.state.equipCannonMod('overdrive_breech');
    this.syncCannonCoreModule3D();
    const visOverdrive =
      this.cannonModOverdriveGroup.visible &&
      !this.cannonModPrismGroup.visible &&
      !this.cannonModHeavyMortarGroup.visible;
    const fireWithOverdrive = this.state.getFireRatePerSec();
    for (const u of this.units) u.active = false;
    this.cannonModShotCounter = 0;
    this.cannonModStats.overdriveBurstsTriggered = 0;
    for (let s = 0; s < 4; s++) this.fireTurret();
    let overdriveTagged = 0;
    for (const u of this.units) {
      if (u.active && u.cannonModTag === 'overdrive_breech') overdriveTagged++;
    }
    const overdriveBoostedCadenceAndDoubleTapped =
      fireWithOverdrive > baseFireNoOverdrive &&
      this.cannonModStats.overdriveBurstsTriggered >= 1 &&
      overdriveTagged >= 2;

    // 5B. Prism Splitter: refracts angled twin/triple prism-charged Bobos + 3D crystal lens
    this.state.cannonModLevels.prism_splitter = 3;
    this.state.equipCannonMod('prism_splitter');
    this.syncCannonCoreModule3D();
    const visPrism =
      !this.cannonModOverdriveGroup.visible &&
      this.cannonModPrismGroup.visible &&
      !this.cannonModHeavyMortarGroup.visible;
    for (const u of this.units) u.active = false;
    this.cannonModShotCounter = 0;
    this.cannonModStats.prismSplitsTriggered = 0;
    for (let s = 0; s < 4; s++) this.fireTurret();
    let prismChargedCount = 0;
    for (const u of this.units) {
      if (u.active && u.cannonModTag === 'prism_splitter' && u.kind === 'charged') {
        prismChargedCount++;
      }
    }
    const prismRefractedChargedBobos =
      this.cannonModStats.prismSplitsTriggered >= 1 && prismChargedCount >= 3;

    // 5C. Heavy Mortar: launches heavy armored/giant mortar Bobo dealing bonus turret/siege damage + 3D shroud
    this.state.cannonModLevels.heavy_mortar = 4;
    this.state.equipCannonMod('heavy_mortar');
    this.syncCannonCoreModule3D();
    const visMortar =
      !this.cannonModOverdriveGroup.visible &&
      !this.cannonModPrismGroup.visible &&
      this.cannonModHeavyMortarGroup.visible;
    for (const u of this.units) u.active = false;
    this.cannonModShotCounter = 0;
    this.cannonModStats.heavyMortarsLaunched = 0;
    for (let s = 0; s < 4; s++) this.fireTurret();
    let mortarBobo: Unit | null = null;
    for (const u of this.units) {
      if (u.active && u.cannonModTag === 'heavy_mortar') {
        mortarBobo = u;
        break;
      }
    }
    const heavyMortarLaunchedArmoredSiegeBobo = Boolean(
      this.cannonModStats.heavyMortarsLaunched >= 1 &&
        mortarBobo &&
        mortarBobo.isMiniGiant &&
        mortarBobo.frostShield &&
        (mortarBobo.mortarSiegeBonusMult || 1) > 2.0
    );
    const cannonBarrelModVisualsSwitched3D = visOverdrive && visPrism && visMortar;

    // Restore original state cleanly
    for (const u of this.units) u.active = false;
    this.state.gold = prevGold;
    this.state.airshipWingMedals = prevMedals;
    this.state.lifetimeAirshipWingMedals = prevLifeMedals;
    this.state.airshipEscortClears = prevClears;
    this.state.bestAirshipProgressPct = prevBestPct;
    this.state.bestAirshipClearSec = prevBestSec;
    this.state.totalAirshipDropPods = prevDropPods;
    this.state.totalAntiAirTurretsCleared = prevAaCleared;
    this.state.cannonModLevels = prevModLevels;
    this.state.activeCannonMod = prevActiveMod;
    this.state.totalCannonModBursts = prevBursts;
    this.state.save();
    if (prevLevel) {
      this.loadLevel(prevLevel);
    }
    this.syncCannonCoreModule3D();
    this.applySkin(this.state.getEquippedSkin());
    this.isPaused = prevPaused;

    return {
      ok:
        airshipSpawnedWithAntiAirTurrets &&
        uncontestedFlakDamagedAirship &&
        blueSquadNeutralizedAntiAirAndDroppedPod &&
        dropPodSpawnedShockTroops &&
        escortVictoryPersistedMedalsAndMilestones &&
        cannonModsUnlockedUpgradedAndPersisted &&
        overdriveBoostedCadenceAndDoubleTapped &&
        prismRefractedChargedBobos &&
        heavyMortarLaunchedArmoredSiegeBobo &&
        cannonBarrelModVisualsSwitched3D,
      airshipSpawnedWithAntiAirTurrets,
      uncontestedFlakDamagedAirship,
      blueSquadNeutralizedAntiAirAndDroppedPod,
      dropPodSpawnedShockTroops,
      escortVictoryPersistedMedalsAndMilestones,
      cannonModsUnlockedUpgradedAndPersisted,
      overdriveBoostedCadenceAndDoubleTapped,
      prismRefractedChargedBobos,
      heavyMortarLaunchedArmoredSiegeBobo,
      cannonBarrelModVisualsSwitched3D,
    };
  }

  public runMc10SelfCheck(): {
    ok: boolean;
    trainSpawnedWithArmoredCars: boolean;
    trainMovesAlongLoop: boolean;
    armorMitigatesCarDamage: boolean;
    crowdDamagedAndBrokeCar: boolean;
    armorPlatesShedAtHalfHp: boolean;
    locomotiveBreakStallsTrain: boolean;
    treasureCarLootedMedals: boolean;
    trainEscapeEndsRaidInDefeat: boolean;
    raidVictoryPersistedMedalsAndMilestone: boolean;
    bannersUpgradedEquippedAndPersisted: boolean;
    galeBannerSpeedAndSurge: boolean;
    holyShieldBannerHpShieldAndReduction: boolean;
    starBannerGoldAndCrits: boolean;
    banner3DVisualSwitched: boolean;
    bannerFollowsCrowd: boolean;
  } {
    const prevPaused = this.isPaused;
    const prevLevel = this.currentLevel;
    const prevOnStageEnd = this.onStageEnd;
    const prevGold = this.state.gold;
    const prevMedals = this.state.trainGoldMedals;
    const prevLifeMedals = this.state.lifetimeTrainGoldMedals;
    const prevClears = this.state.candyTrainRaidClears;
    const prevBestCars = this.state.bestTrainCarsBroken;
    const prevBestSec = this.state.bestTrainClearSec;
    const prevTotalCars = this.state.totalTrainCarsBroken;
    const prevTreasure = this.state.totalTrainTreasureLooted;
    const prevBannerLevels = { ...this.state.relicBannerLevels };
    const prevActiveBanner = this.state.activeRelicBanner;
    const prevProcs = this.state.totalRelicBannerProcs;

    this.isPaused = true;
    this.onStageEnd = undefined;
    const clearUnits = (): void => {
      for (const u of this.units) u.active = false;
    };

    // 1. Load the Candy Train Raid -> 6 armored 3D cars on the rainbow loop
    const trainLevel = generateCandyTrainRaidLevel(1);
    this.loadLevel(trainLevel);
    const train = this.candyTrain as CandyTrainRuntime | null;
    const trainSpawnedWithArmoredCars = Boolean(
      trainLevel.isCandyTrainRaid &&
        trainLevel.mode === 'candy_train_raid' &&
        train &&
        train.active &&
        train.cars.length === 6 &&
        train.cars.filter((c) => c.cfg.kind === 'treasure').length === 2 &&
        train.cars.every((c) => c.armor > 0 && c.armorPlates.length > 0 && c.group.parent === this.levelGroup)
    );

    // 2. Train moves along the loop
    clearUnits();
    const loco = train?.cars[0];
    const startX = loco?.x ?? 0;
    const startZ = loco?.z ?? 0;
    const startAngle = train?.headAngle ?? 0;
    for (let s = 0; s < 10; s++) this.updateCandyTrainRaid(0.05);
    const trainMovesAlongLoop = Boolean(
      train &&
        loco &&
        train.headAngle > startAngle &&
        Math.hypot(loco.x - startX, loco.z - startZ) > 0.3 &&
        train.escapeTimeLeft < train.escapeTotalSec
    );

    // 3. Armor mitigation + real crowd melee via simulateUnits -> car breaks
    const mint = train?.cars.find((c) => c.cfg.kind === 'armored');
    let armorMitigatesCarDamage = false;
    let crowdDamagedAndBrokeCar = false;
    let armorPlatesShedAtHalfHp = false;
    if (mint && train) {
      const hp0 = mint.hp;
      this.damageCandyTrainCar(mint, 100, true);
      const dealt = hp0 - mint.hp;
      armorMitigatesCarDamage = Math.abs(dealt - 100 * (1 - mint.cfg.armor)) < 0.01 && dealt < 100;

      clearUnits();
      const hpBeforeCrowd = mint.hp;
      for (let k = 0; k < 6; k++) {
        const bu = this.spawnUnit('blue', 'charged', mint.x + 1.2 + (k % 2) * 0.3, mint.z + (k - 2.5) * 0.35, 0, 0);
        if (bu) bu.attackCooldown = 0;
      }
      for (let s = 0; s < 4; s++) this.simulateUnits(0.05);
      const crowdHit = mint.hp < hpBeforeCrowd;

      mint.hp = mint.maxHp * 0.5 + 5;
      this.damageCandyTrainCar(mint, 40, true);
      armorPlatesShedAtHalfHp =
        mint.armorShed && mint.armor < mint.cfg.armor && mint.armorPlates.every((p) => !p.visible);

      const brokenBefore = this.candyTrainCarsBroken;
      this.damageCandyTrainCar(mint, 999999, true);
      crowdDamagedAndBrokeCar = crowdHit && !mint.alive && this.candyTrainCarsBroken === brokenBefore + 1;
      for (let s = 0; s < 4; s++) this.updateCandyTrainRaid(0.25);
    }

    // 4. Locomotive break -> whole train stalls & escape countdown freezes
    let locomotiveBreakStallsTrain = false;
    if (loco && train) {
      this.damageCandyTrainCar(loco, 9999999, true);
      for (let s = 0; s < 30; s++) this.updateCandyTrainRaid(0.1);
      const frozenEscape = train.escapeTimeLeft;
      const frozenAngle = train.headAngle;
      this.updateCandyTrainRaid(0.5);
      locomotiveBreakStallsTrain =
        !loco.alive &&
        train.stalled &&
        train.speed === 0 &&
        train.escapeTimeLeft === frozenEscape &&
        train.headAngle === frozenAngle;
    }

    // 5. Treasure car -> loot 列车金章
    let treasureCarLootedMedals = false;
    const treasure = train?.cars.find((c) => c.cfg.kind === 'treasure' && c.alive);
    if (treasure) {
      const before = this.candyTrainMedalsLooted;
      this.damageCandyTrainCar(treasure, 9999999, true);
      treasureCarLootedMedals =
        !treasure.alive &&
        this.candyTrainTreasureLooted >= 1 &&
        this.candyTrainMedalsLooted === before + treasure.cfg.rewardMedals;
    }

    // 6. Escape countdown on a fresh train ends the raid in defeat
    this.loadLevel(trainLevel);
    clearUnits();
    let trainEscapeEndsRaidInDefeat = false;
    if (this.candyTrain) {
      this.candyTrain.escapeTimeLeft = 0.01;
      this.updateCandyTrainRaid(0.05);
      trainEscapeEndsRaidInDefeat = this.isStageEnded && !this.lastStageVictory && !this.candyTrain.active;
    }

    // 7. Raid victory settlement -> persistent 列车金章 + milestone bonus
    this.state.trainGoldMedals = 0;
    this.state.lifetimeTrainGoldMedals = 0;
    this.state.candyTrainRaidClears = 0;
    const baseMilestone = this.state.getTrainMedalMilestoneBonus(0);
    const raidRec = this.state.recordCandyTrainRaidResult(true, 6, 6, 2, 2, 41.5);
    const savedAfterRaid = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}') as {
      trainGoldMedals?: number;
      candyTrainRaidClears?: number;
    };
    const boostedMilestone = this.state.getTrainMedalMilestoneBonus();
    const raidVictoryPersistedMedalsAndMilestone =
      raidRec.victory &&
      raidRec.medalsAwarded >= 5 &&
      raidRec.milestoneReached &&
      raidRec.milestoneBonusCoins > 0 &&
      this.state.trainGoldMedals === raidRec.medalsAwarded &&
      savedAfterRaid.trainGoldMedals === raidRec.medalsAwarded &&
      savedAfterRaid.candyTrainRaidClears === 1 &&
      boostedMilestone.troopDmgMult > baseMilestone.troopDmgMult &&
      boostedMilestone.bannerAuraMult > baseMilestone.bannerAuraMult;

    // 8. Relic Banner Stand: unlock / upgrade all 3 banners via medals + gold, equip & persist
    this.state.gold = 30000;
    this.state.trainGoldMedals = 40;
    this.state.relicBannerLevels = { gale_charge: 1, holy_shield: 0, star_carnival: 0 };
    this.state.activeRelicBanner = 'gale_charge';
    const upGale = this.state.upgradeRelicBanner('gale_charge', 'medal');
    const unlockShield = this.state.upgradeRelicBanner('holy_shield', 'gold');
    const upShield = this.state.upgradeRelicBanner('holy_shield', 'medal');
    const unlockStar = this.state.upgradeRelicBanner('star_carnival', 'medal');
    const upStar = this.state.upgradeRelicBanner('star_carnival', 'gold');
    const eqStar = this.state.equipRelicBanner('star_carnival');
    const savedBanners = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}') as {
      activeRelicBanner?: RelicBannerId;
      relicBannerLevels?: Record<RelicBannerId, number>;
    };
    const bannersUpgradedEquippedAndPersisted =
      upGale.upgraded &&
      upGale.spentCurrency === 'medal' &&
      unlockShield.upgraded &&
      unlockShield.wasUnlock &&
      unlockShield.spentCurrency === 'gold' &&
      upShield.upgraded &&
      unlockStar.wasUnlock &&
      upStar.upgraded &&
      eqStar &&
      savedBanners.activeRelicBanner === 'star_carnival' &&
      (savedBanners.relicBannerLevels?.gale_charge || 0) === 2 &&
      (savedBanners.relicBannerLevels?.holy_shield || 0) === 2 &&
      (savedBanners.relicBannerLevels?.star_carnival || 0) === 2;

    // Neutral baseline (no banner effect) for comparisons
    this.state.relicBannerLevels = { gale_charge: 5, holy_shield: 5, star_carnival: 5 };
    const neutralMove = (() => {
      this.state.activeRelicBanner = 'holy_shield';
      return this.state.getMoveSpeedMultiplier();
    })();
    const neutralLoot = this.state.getLootMultiplier();
    this.loadLevel(trainLevel);
    clearUnits();
    this.state.activeRelicBanner = 'star_carnival';
    const neutralBlue = this.spawnUnit('blue', 'normal', 0, 10, 0, 0);
    const neutralHp = neutralBlue?.maxHp || 0;
    clearUnits();

    // 8A. Gale Charge: global move speed + periodic aura surge (speed & melee damage)
    this.state.equipRelicBanner('gale_charge');
    this.syncRelicBanner3D(true);
    const rb = this.relicBanner;
    const visGale =
      rb.finials.gale_charge.visible && !rb.finials.holy_shield.visible && !rb.finials.star_carnival.visible;
    const galeCombat = this.state.getRelicBannerCombatSpec();
    const galeMove = this.state.getMoveSpeedMultiplier();
    rb.x = 0;
    rb.z = 6;
    const galeProbe = this.spawnUnit('blue', 'normal', 0.5, 6.2, 0, 0);
    const rallied = this.triggerRelicGaleSurge(true);
    const surgeMult = galeProbe ? this.computeRelicHitMult(galeProbe, galeCombat, this.relicSurgeTimer > 0) : 1;
    const galeBannerSpeedAndSurge =
      galeMove > neutralMove * 1.1 &&
      rallied >= 1 &&
      this.relicSurgeTimer > 0 &&
      this.relicBannerStats.surgesTriggered >= 1 &&
      surgeMult > 1.3;
    clearUnits();
    this.relicSurgeTimer = 0;

    // 8B. Holy Shield: troop HP, every-Nth shield & aura damage reduction
    this.state.equipRelicBanner('holy_shield');
    this.syncRelicBanner3D(true);
    const visShield =
      !rb.finials.gale_charge.visible && rb.finials.holy_shield.visible && !rb.finials.star_carnival.visible;
    const shieldCombat = this.state.getRelicBannerCombatSpec();
    this.relicSpawnCounter = 0;
    let shieldedCount = 0;
    let shieldHp = 0;
    for (let k = 0; k < shieldCombat.shieldEveryNth * 2; k++) {
      const su = this.spawnUnit('blue', 'normal', -3 + (k % 6) * 0.6, 10 + Math.floor(k / 6) * 0.6, 0, 0);
      if (su) {
        shieldHp = su.maxHp;
        if (su.relicShieldGranted && su.frostShield) shieldedCount++;
      }
    }
    rb.x = 0;
    rb.z = 6;
    const inAuraProbe = this.spawnUnit('blue', 'normal', 0.4, 6.1, 0, 0);
    const outAuraProbe = this.spawnUnit('blue', 'normal', 0.4, -14, 0, 0);
    const reductionIn = inAuraProbe ? this.getRelicDamageTakenMult(inAuraProbe, shieldCombat, 10) : 1;
    const reductionOut = outAuraProbe ? this.getRelicDamageTakenMult(outAuraProbe, shieldCombat, 10) : 1;
    const holyShieldBannerHpShieldAndReduction =
      shieldHp > neutralHp * 1.2 && shieldedCount >= 2 && reductionIn < 0.8 && reductionOut === 1;
    clearUnits();

    // 8C. Star Carnival: gold bonus & aura crits
    this.state.equipRelicBanner('star_carnival');
    this.syncRelicBanner3D(true);
    const visStar =
      !rb.finials.gale_charge.visible && !rb.finials.holy_shield.visible && rb.finials.star_carnival.visible;
    const starCombat = this.state.getRelicBannerCombatSpec();
    const starLoot = this.state.getLootMultiplier();
    rb.x = 0;
    rb.z = 6;
    const critProbe = this.spawnUnit('blue', 'normal', 0.3, 6.0, 0, 0);
    let critHits = 0;
    let maxCritMult = 1;
    const critRolls = 300;
    if (critProbe) {
      // MC-17 deflake: the crit roll uses Math.random, so feed it an evenly spaced sequence (i + 0.5) / 300 for this
      // probe only: exactly round(critChance × 300) rolls land under critChance, whatever the real RNG would have done
      // (crit sparks / popups are held back meanwhile so the roll is the only Math.random call per hit).
      const realRandom = Math.random;
      const fxCd = this.relicCritFxCooldown;
      const popupCd = this.relicCritPopupCooldown;
      let roll = 0;
      Math.random = () => ((roll++ % critRolls) + 0.5) / critRolls;
      this.relicCritFxCooldown = 999;
      this.relicCritPopupCooldown = 999;
      try {
        for (let r = 0; r < critRolls; r++) {
          const m = this.computeRelicHitMult(critProbe, starCombat, false);
          if (m > 1) {
            critHits++;
            maxCritMult = Math.max(maxCritMult, m);
          }
        }
      } finally {
        Math.random = realRandom;
        this.relicCritFxCooldown = fxCd;
        this.relicCritPopupCooldown = popupCd;
      }
    }
    const expectedCrits = Math.round(starCombat.critChance * critRolls);
    const starBannerGoldAndCrits =
      starLoot > neutralLoot * 1.2 &&
      starCombat.critChance >= 0.08 &&
      Math.abs(critHits - expectedCrits) <= 1 &&
      maxCritMult >= starCombat.critMult - 0.001;
    clearUnits();

    const starCloth = new THREE.Color(RELIC_BANNER_CLOTH_HEX.star_carnival);
    const banner3DVisualSwitched =
      visGale &&
      visShield &&
      visStar &&
      rb.emblems.star_carnival.visible &&
      !rb.emblems.gale_charge.visible &&
      !rb.emblems.holy_shield.visible &&
      Math.abs(rb.clothColors.getX(Math.floor(rb.clothColors.count / 2)) - starCloth.r) < 0.02 &&
      rb.auraRingMat.color.getHex() === RELIC_BANNERS.star_carnival.accentHex &&
      rb.auraRing.parent === rb.rootGroup;

    // 9. Banner follows the densest forward Bobo crowd
    rb.x = 0;
    rb.z = PLAYER_Z - 3.6;
    rb.scanTimer = 0;
    for (let k = 0; k < 14; k++) {
      this.spawnUnit('blue', 'normal', 5.0 + (k % 4) * 0.35, 0.5 + Math.floor(k / 4) * 0.35, 0, 0);
    }
    for (let s = 0; s < 40; s++) this.updateRelicBanner(0.05);
    const bannerFollowsCrowd =
      Math.hypot(rb.x - 5.5, rb.z - 0.9) < 1.6 && rb.rootGroup.position.x > 3.5 && rb.rootGroup.position.z < 4;

    // Restore original state cleanly
    clearUnits();
    this.state.gold = prevGold;
    this.state.trainGoldMedals = prevMedals;
    this.state.lifetimeTrainGoldMedals = prevLifeMedals;
    this.state.candyTrainRaidClears = prevClears;
    this.state.bestTrainCarsBroken = prevBestCars;
    this.state.bestTrainClearSec = prevBestSec;
    this.state.totalTrainCarsBroken = prevTotalCars;
    this.state.totalTrainTreasureLooted = prevTreasure;
    this.state.relicBannerLevels = prevBannerLevels;
    this.state.activeRelicBanner = prevActiveBanner;
    this.state.totalRelicBannerProcs = prevProcs;
    this.state.save();
    this.onStageEnd = prevOnStageEnd;
    if (prevLevel) {
      this.loadLevel(prevLevel);
    }
    this.syncRelicBanner3D(true);
    this.applySkin(this.state.getEquippedSkin());
    this.isPaused = prevPaused;

    return {
      ok:
        trainSpawnedWithArmoredCars &&
        trainMovesAlongLoop &&
        armorMitigatesCarDamage &&
        crowdDamagedAndBrokeCar &&
        armorPlatesShedAtHalfHp &&
        locomotiveBreakStallsTrain &&
        treasureCarLootedMedals &&
        trainEscapeEndsRaidInDefeat &&
        raidVictoryPersistedMedalsAndMilestone &&
        bannersUpgradedEquippedAndPersisted &&
        galeBannerSpeedAndSurge &&
        holyShieldBannerHpShieldAndReduction &&
        starBannerGoldAndCrits &&
        banner3DVisualSwitched &&
        bannerFollowsCrowd,
      trainSpawnedWithArmoredCars,
      trainMovesAlongLoop,
      armorMitigatesCarDamage,
      crowdDamagedAndBrokeCar,
      armorPlatesShedAtHalfHp,
      locomotiveBreakStallsTrain,
      treasureCarLootedMedals,
      trainEscapeEndsRaidInDefeat,
      raidVictoryPersistedMedalsAndMilestone,
      bannersUpgradedEquippedAndPersisted,
      galeBannerSpeedAndSurge,
      holyShieldBannerHpShieldAndReduction,
      starBannerGoldAndCrits,
      banner3DVisualSwitched,
      bannerFollowsCrowd,
    };
  }

  public runMc11SelfCheck(): {
    ok: boolean;
    subSpawnedUnderwater: boolean;
    subAdvancesAlongLane: boolean;
    coralBlocksSubAndCrowdBreaksIt: boolean;
    bubbleRescueAddsUnits: boolean;
    subContactPopsBubble: boolean;
    jellyfishStingDamagesAndSlows: boolean;
    torpedoHitsJellyfish: boolean;
    dockingWinsStage: boolean;
    hullBreachLosesStage: boolean;
    oxygenOutLosesStage: boolean;
    pearlsPersistedWithMilestone: boolean;
    petsAdoptUpgradeEquipPersisted: boolean;
    jellyPetMagnetAndGold: boolean;
    turtlePetShellAndReduction: boolean;
    seahorsePetChainAndCombo: boolean;
    pet3DVisualSwitched: boolean;
    petFollowsCrowd: boolean;
    stats: Record<string, number>;
  } {
    const prevPaused = this.isPaused;
    const prevLevel = this.currentLevel;
    const prevOnStageEnd = this.onStageEnd;
    const prevOnBanner = this.onBanner;
    const prevGold = this.state.gold;
    const prevPearls = this.state.deepPearls;
    const prevLifePearls = this.state.lifetimeDeepPearls;
    const prevClears = this.state.submarineRescueClears;
    const prevBestRescued = this.state.bestSubmarineRescuedBobos;
    const prevBestSec = this.state.bestSubmarineClearSec;
    const prevBubbles = this.state.totalBubblesPopped;
    const prevJelly = this.state.totalJellyfishCleared;
    const prevCoral = this.state.totalCoralBroken;
    const prevPetLevels = { ...this.state.petLevels };
    const prevActivePet = this.state.activePet;
    const prevPetProcs = this.state.totalPetProcs;
    const stats: Record<string, number> = {};

    this.isPaused = true;
    this.onStageEnd = undefined;
    this.onBanner = undefined;
    const clearUnits = (): void => {
      for (const u of this.units) u.active = false;
    };
    const clearJellies = (): void => {
      for (const j of this.jellyfish) this.levelGroup.remove(j.group);
      this.jellyfish.length = 0;
    };
    const countBlue = (): number => {
      let n = 0;
      for (const u of this.units) if (u.active && u.team === 'blue') n++;
      return n;
    };

    // 1. Load the Submarine Rescue -> underwater tint, sub, 3 coral walls, 7 rescue bubbles, hidden boss foreman
    const subLevel = generateSubmarineRescueLevel(1);
    this.loadLevel(subLevel);
    const sub0 = this.submarine as SubmarineRuntime | null;
    const fog = this.scene.fog as THREE.FogExp2 | null;
    const subSpawnedUnderwater = Boolean(
      subLevel.isSubmarineRescue &&
        subLevel.mode === 'submarine_rescue' &&
        sub0 &&
        sub0.active &&
        sub0.group.parent === this.levelGroup &&
        this.coralBarriers.length === 3 &&
        this.coralBarriers.every((c, i) => i === 0 || c.cfg.z < this.coralBarriers[i - 1].cfg.z) &&
        this.rescueBubbles.length === 7 &&
        !this.bossGroup.visible &&
        this.currentTheme.id === 'ocean' &&
        fog &&
        fog.color.getHex() === 0x1b7fa8 &&
        this.subAmbientBubbles !== null
    );

    // 2. Submarine sails forward along the bubble lane & consumes oxygen
    clearUnits();
    let subAdvancesAlongLane = false;
    if (sub0) {
      const z0 = sub0.z;
      const o0 = sub0.oxygen;
      for (let s = 0; s < 10; s++) this.updateSubmarineRescue(0.1);
      subAdvancesAlongLane = sub0.z < z0 - 0.4 && sub0.oxygen < o0 && sub0.active;
      stats.subMoved = Number((z0 - sub0.z).toFixed(2));
    }

    // 3. Coral wall blocks the sub; a real Bobo crowd (simulateUnits) strikes it; breaking it re-opens the lane
    let coralBlocksSubAndCrowdBreaksIt = false;
    const coral0 = this.coralBarriers[0];
    if (sub0 && coral0) {
      clearUnits();
      clearJellies();
      sub0.z = coral0.cfg.z + 2.4;
      for (let s = 0; s < 20; s++) this.updateSubmarineRescue(0.1);
      const blockedAt = sub0.z;
      const blocked = sub0.state === 'blocked' && Math.abs(blockedAt - (coral0.cfg.z + 1.9)) < 0.05;
      const hp0 = coral0.hp;
      for (let k = 0; k < 12; k++) {
        const bu = this.spawnUnit('blue', 'charged', -3 + (k % 6) * 1.1, coral0.cfg.z + 1.4 + Math.floor(k / 6) * 0.4, 0, -4);
        if (bu) {
          bu.spawnHop = 0;
          bu.attackCooldown = 0;
        }
      }
      for (let s = 0; s < 10; s++) this.simulateUnits(0.05);
      const crowdDmg = hp0 - coral0.hp;
      let crowdHeld = true;
      for (const u of this.units) {
        if (u.active && u.team === 'blue' && u.z < coral0.cfg.z) crowdHeld = false;
      }
      stats.coralCrowdDmg = Math.round(crowdDmg);
      this.damageCoralBarrier(coral0, 9999999, true);
      clearUnits();
      for (let s = 0; s < 10; s++) this.updateSubmarineRescue(0.1);
      coralBlocksSubAndCrowdBreaksIt =
        blocked && crowdDmg > 0 && crowdHeld && !coral0.alive && this.subCoralsBroken === 1 && sub0.z < blockedAt - 0.3;
    }

    // 4. Real crowd pops a rescue bubble -> trapped Bobos join the army
    let bubbleRescueAddsUnits = false;
    const bubble = this.rescueBubbles.find((b) => b.alive && !b.cfg.isGrand && b.z < (this.coralBarriers[0]?.cfg.z ?? 99));
    if (bubble && sub0) {
      clearUnits();
      clearJellies();
      sub0.z = sub0.startZ;
      sub0.x = 0;
      for (let k = 0; k < 4; k++) {
        const bu = this.spawnUnit('blue', 'charged', bubble.x + 1.4 + k * 0.2, bubble.z + 0.2, 0, 0);
        if (bu) {
          bu.spawnHop = 0;
          bu.attackCooldown = 0;
        }
      }
      const before = countBlue();
      const poppedBefore = this.subBubblesPopped;
      for (let s = 0; s < 24 && bubble.alive; s++) this.simulateUnits(0.05);
      const after = countBlue();
      bubbleRescueAddsUnits =
        !bubble.alive && this.subBubblesPopped === poppedBefore + 1 && after >= before + bubble.cfg.bobos - 1;
      stats.rescueAdded = after - before;
    }

    // 5. The submarine sailing through a bubble pops it on contact
    let subContactPopsBubble = false;
    const bubble2 = this.rescueBubbles.find((b) => b.alive);
    if (bubble2 && sub0) {
      clearUnits();
      bubble2.baseX = sub0.x;
      bubble2.baseZ = sub0.z - 0.3;
      bubble2.cfg.driftRangeX = 0;
      bubble2.x = sub0.x;
      bubble2.z = sub0.z - 0.3;
      const rescuedBefore = this.subBobosRescued;
      this.updateSubmarineRescue(0.05);
      subContactPopsBubble = !bubble2.alive && this.subBobosRescued > rescuedBefore;
    }

    // 6. Jellyfish sting: damages & slows Bobos and the submarine hull
    let jellyfishStingDamagesAndSlows = false;
    let torpedoHitsJellyfish = false;
    if (sub0) {
      clearUnits();
      clearJellies();
      this.spawnJellyfishSwarm(1);
      const j = this.jellyfish[0];
      if (j) {
        j.x = sub0.x + 1.0;
        j.z = sub0.z;
        const victim = this.spawnUnit('blue', 'normal', j.x + 0.3, j.z + 0.2, 0, 0);
        if (victim) {
          victim.spawnHop = 0;
          // MC-17 deflake: Bobo-tech frontlineShieldChance can randomly give a fresh Bobo a frost shield, which would
          // absorb the sting this case measures; the victim always starts unshielded
          victim.frostShield = false;
          victim.petShellGranted = false;
        }
        const vHp = victim?.hp ?? 0;
        const hull0 = sub0.hp;
        const res = this.jellyfishSting(j, true);
        jellyfishStingDamagesAndSlows = Boolean(
          victim &&
            res.bobos >= 1 &&
            res.hull &&
            (victim.hp < vHp || !victim.active) &&
            (victim.jellySlowTimer || 0) > 0 &&
            sub0.hp < hull0 &&
            sub0.slowTimer > 0
        );
        stats.hullSting = Number((hull0 - sub0.hp).toFixed(1));

        // 7. Submarine bubble torpedo locks onto the jellyfish and damages it
        clearUnits();
        j.x = sub0.x + 2.0;
        j.z = sub0.z - 4.0;
        j.stingTimer = 99;
        const jHp = j.hp;
        sub0.torpedoTimer = 0;
        for (let s = 0; s < 12; s++) this.updateSubmarineRescue(0.05);
        torpedoHitsJellyfish = this.subTorpedoesFired >= 1 && (j.hp < jHp || !j.alive);
        stats.torpedoes = this.subTorpedoesFired;
      }
    }

    // 8. Docking at the rescue station wins the stage
    let dockingWinsStage = false;
    this.loadLevel(subLevel);
    clearUnits();
    if (this.submarine) {
      for (const c of this.coralBarriers) this.damageCoralBarrier(c, 9999999, true);
      clearJellies();
      this.submarine.z = this.submarine.dockZ + 0.05;
      this.updateSubmarineRescue(0.1);
      dockingWinsStage =
        this.isStageEnded && this.lastStageVictory && this.submarine.state === 'docked' && this.getSubmarineProgressPct() === 100;
    }

    // 9. Hull breach -> defeat
    let hullBreachLosesStage = false;
    this.loadLevel(subLevel);
    clearUnits();
    if (this.submarine) {
      this.submarine.hp = 1;
      this.spawnJellyfishSwarm(1);
      const j = this.jellyfish[0];
      if (j) {
        j.x = this.submarine.x;
        j.z = this.submarine.z - 0.6;
        j.stingTimer = 0;
      }
      this.updateSubmarineRescue(0.05);
      hullBreachLosesStage = this.isStageEnded && !this.lastStageVictory && this.submarine.state === 'sunk';
    }

    // 10. Oxygen runs out -> defeat
    let oxygenOutLosesStage = false;
    this.loadLevel(subLevel);
    clearUnits();
    if (this.submarine) {
      this.submarine.oxygen = 0.01;
      this.updateSubmarineRescue(0.05);
      oxygenOutLosesStage = this.isStageEnded && !this.lastStageVictory && this.submarine.state === 'suffocated';
    }

    // 11. Victory settlement -> persistent 深海珍珠 + milestone
    this.state.deepPearls = 0;
    this.state.lifetimeDeepPearls = 0;
    this.state.submarineRescueClears = 0;
    const baseMilestone = this.state.getDeepPearlMilestoneBonus(0);
    const rec = this.state.recordSubmarineRescueResult(true, 7, 7, 54, 3, 12, 41.5);
    const savedAfter = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}') as {
      deepPearls?: number;
      submarineRescueClears?: number;
    };
    const boosted = this.state.getDeepPearlMilestoneBonus();
    const pearlsPersistedWithMilestone =
      rec.victory &&
      rec.pearlsAwarded >= 6 &&
      rec.milestoneReached &&
      rec.milestoneBonusCoins > 0 &&
      this.state.deepPearls === rec.pearlsAwarded &&
      savedAfter.deepPearls === rec.pearlsAwarded &&
      savedAfter.submarineRescueClears === 1 &&
      boosted.troopHpMult > baseMilestone.troopHpMult &&
      boosted.petPowerMult > baseMilestone.petPowerMult;
    stats.pearlsAwarded = rec.pearlsAwarded;

    // 12. Pet dock: adopt / upgrade all 3 pets via pearls + gold, equip & persist
    this.state.gold = 30000;
    this.state.deepPearls = 40;
    this.state.petLevels = { jelly_puff: 1, shell_turtle: 0, spark_seahorse: 0 };
    this.state.activePet = 'jelly_puff';
    const upJelly = this.state.upgradePetCompanion('jelly_puff', 'pearl');
    const adoptTurtle = this.state.upgradePetCompanion('shell_turtle', 'gold');
    const upTurtle = this.state.upgradePetCompanion('shell_turtle', 'pearl');
    const adoptSeahorse = this.state.upgradePetCompanion('spark_seahorse', 'pearl');
    const upSeahorse = this.state.upgradePetCompanion('spark_seahorse', 'gold');
    const eqSeahorse = this.state.equipPetCompanion('spark_seahorse');
    const lockedEquipRejected = (() => {
      const lv = this.state.petLevels.jelly_puff;
      this.state.petLevels.jelly_puff = 0;
      const okEq = this.state.equipPetCompanion('jelly_puff');
      this.state.petLevels.jelly_puff = lv;
      return !okEq && (this.state.activePet as PetCompanionId) === 'spark_seahorse';
    })();
    this.state.save();
    const savedPets = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}') as {
      activePet?: PetCompanionId;
      petLevels?: Record<PetCompanionId, number>;
    };
    const petsAdoptUpgradeEquipPersisted =
      upJelly.upgraded &&
      upJelly.spentCurrency === 'pearl' &&
      adoptTurtle.upgraded &&
      adoptTurtle.wasAdopt &&
      adoptTurtle.spentCurrency === 'gold' &&
      upTurtle.upgraded &&
      adoptSeahorse.wasAdopt &&
      upSeahorse.upgraded &&
      eqSeahorse &&
      lockedEquipRejected &&
      savedPets.activePet === 'spark_seahorse' &&
      (savedPets.petLevels?.jelly_puff || 0) === 2 &&
      (savedPets.petLevels?.shell_turtle || 0) === 2 &&
      (savedPets.petLevels?.spark_seahorse || 0) === 2;

    // 13. Jelly Puff: gold pickup multiplier + magnet pulse drags bubbles & collects the airdrop crate
    this.state.petLevels = { jelly_puff: 5, shell_turtle: 5, spark_seahorse: 5 };
    this.loadLevel(subLevel);
    clearUnits();
    this.state.petLevels.jelly_puff = 0;
    this.state.activePet = 'jelly_puff';
    const neutralLoot = this.state.getLootMultiplier();
    this.state.petLevels.jelly_puff = 5;
    this.state.equipPetCompanion('jelly_puff');
    this.syncPetCompanion3D(true);
    const pc = this.petCompanion;
    const visJelly = pc.models.jelly_puff.visible && !pc.models.shell_turtle.visible && !pc.models.spark_seahorse.visible;
    const jellyLoot = this.state.getLootMultiplier();
    pc.x = 0;
    pc.z = 10.5;
    const magBubble = this.rescueBubbles.find((b) => b.alive);
    let magnetPulled = false;
    let airdropMagneted = false;
    let magnetGold = 0;
    if (magBubble) {
      magBubble.baseX = pc.x + 3.2;
      magBubble.baseZ = pc.z;
      magBubble.x = pc.x + 3.2;
      magBubble.z = pc.z;
      this.spawnTacticalAirdrop(pc.x - 2.0, 9.5);
      const collectBefore = this.airdropCollectCount;
      const res = this.triggerPetMagnetPulse(true);
      magnetPulled = res.pulled >= 1 && Math.abs(magBubble.baseX - pc.x) < 3.2;
      airdropMagneted = res.airdrop && this.airdropCollectCount === collectBefore + 1;
      magnetGold = res.gold;
    }
    const jellyPetMagnetAndGold = jellyLoot > neutralLoot * 1.15 && magnetPulled && airdropMagneted && magnetGold > 0;
    stats.jellyLootMult = Number((jellyLoot / Math.max(0.01, neutralLoot)).toFixed(2));

    // 14. Shell Turtle: global damage reduction + one-hit shell bubbles that block a jellyfish sting
    this.state.equipPetCompanion('shell_turtle');
    this.syncPetCompanion3D(true);
    const visTurtle = !pc.models.jelly_puff.visible && pc.models.shell_turtle.visible && !pc.models.spark_seahorse.visible;
    const turtleSpec = this.state.getPetCompanionCombatSpec();
    clearUnits();
    pc.x = 0;
    pc.z = 6;
    for (let k = 0; k < 14; k++) {
      const bu = this.spawnUnit('blue', 'normal', -1.5 + (k % 5) * 0.7, 5 + Math.floor(k / 5) * 0.7, 0, 0);
      if (bu) {
        bu.spawnHop = 0;
        bu.frostShield = false;
      }
    }
    const shelled = this.triggerPetShellShield(true);
    let shellBlockedSting = false;
    const shelledUnit = this.units.find((u) => u.active && u.team === 'blue' && u.petShellGranted && u.frostShield);
    if (shelledUnit && this.submarine) {
      clearJellies();
      this.spawnJellyfishSwarm(1);
      const j = this.jellyfish[0];
      if (j) {
        for (const u of this.units) {
          if (u.active && u !== shelledUnit) u.active = false;
        }
        j.x = shelledUnit.x;
        j.z = shelledUnit.z;
        const hpBefore = shelledUnit.hp;
        this.jellyfishSting(j, true);
        shellBlockedSting = shelledUnit.hp === hpBefore && !shelledUnit.frostShield;
      }
    }
    const turtlePetShellAndReduction =
      turtleSpec.dmgTakenMult < 0.9 && shelled >= Math.min(12, turtleSpec.shellShieldCount) && shellBlockedSting;
    stats.shelled = shelled;

    // 15. Spark Seahorse: chain lightning arcs through reds & jellyfish; kill combo fires an extra spark
    this.state.equipPetCompanion('spark_seahorse');
    this.syncPetCompanion3D(true);
    const visSeahorse = !pc.models.jelly_puff.visible && !pc.models.shell_turtle.visible && pc.models.spark_seahorse.visible;
    clearUnits();
    clearJellies();
    pc.x = 0;
    pc.z = 2;
    const reds: Unit[] = [];
    for (let k = 0; k < 3; k++) {
      const ru = this.spawnUnit('red', 'brute', -2 + k * 2.2, 0.5, 0, 0);
      if (ru) reds.push(ru);
    }
    this.spawnJellyfishSwarm(1);
    if (this.jellyfish[0]) {
      this.jellyfish[0].x = 4.0;
      this.jellyfish[0].z = 0.0;
    }
    const redHp0 = reds.map((r) => r.hp);
    const jellyHp0 = this.jellyfish[0]?.hp ?? 0;
    const hits = this.triggerPetChainSpark(true);
    const redsZapped = reds.filter((r, i) => !r.active || r.hp < redHp0[i]).length;
    const jellyZapped = Boolean(this.jellyfish[0] && (this.jellyfish[0].hp < jellyHp0 || !this.jellyfish[0].alive));
    const sparksBefore = this.petStats.sparks;
    const need = this.state.getPetCompanionCombatSpec().comboKillsPerSpark;
    this.petComboKills = need - 1;
    for (let k = 0; k < 2; k++) {
      const ru = this.spawnUnit('red', 'normal', 1 + k, 1, 0, 0);
      if (ru) reds.push(ru);
    }
    this.notePetComboKill();
    const comboFired = this.petStats.sparks === sparksBefore + 1 && this.petComboKills === 0;
    const seahorsePetChainAndCombo = hits >= 3 && redsZapped >= 2 && jellyZapped && comboFired;
    stats.sparkHits = hits;

    const pet3DVisualSwitched =
      visJelly &&
      visTurtle &&
      visSeahorse &&
      pc.auraRingMat.color.getHex() === PET_COMPANIONS.spark_seahorse.accentHex &&
      pc.rootGroup.parent === this.scene;

    // 16. The pet follows the densest forward Bobo crowd (beside the relic banner bearer)
    clearUnits();
    const rb = this.relicBanner;
    rb.x = 0;
    rb.z = PLAYER_Z - 3.6;
    rb.scanTimer = 0;
    pc.x = 0;
    pc.z = PLAYER_Z - 2.4;
    pc.scanTimer = 0;
    for (let k = 0; k < 14; k++) {
      this.spawnUnit('blue', 'normal', 4.0 + (k % 4) * 0.35, 0.5 + Math.floor(k / 4) * 0.35, 0, 0);
    }
    for (let s = 0; s < 40; s++) {
      this.updateRelicBanner(0.05);
      this.updatePetCompanion(0.05);
    }
    const petFollowsCrowd =
      Math.hypot(pc.x - (rb.targetX + 1.9), pc.z - (rb.targetZ + 1.2)) < 1.0 &&
      pc.rootGroup.position.x > 4.0 &&
      pc.rootGroup.position.z < 4.5;
    stats.petX = Number(pc.x.toFixed(2));
    stats.petZ = Number(pc.z.toFixed(2));

    // Restore original state cleanly
    clearUnits();
    clearJellies();
    this.state.gold = prevGold;
    this.state.deepPearls = prevPearls;
    this.state.lifetimeDeepPearls = prevLifePearls;
    this.state.submarineRescueClears = prevClears;
    this.state.bestSubmarineRescuedBobos = prevBestRescued;
    this.state.bestSubmarineClearSec = prevBestSec;
    this.state.totalBubblesPopped = prevBubbles;
    this.state.totalJellyfishCleared = prevJelly;
    this.state.totalCoralBroken = prevCoral;
    this.state.petLevels = prevPetLevels;
    this.state.activePet = prevActivePet;
    this.state.totalPetProcs = prevPetProcs;
    this.state.save();
    this.onStageEnd = prevOnStageEnd;
    this.onBanner = prevOnBanner;
    if (prevLevel) {
      this.loadLevel(prevLevel);
    }
    this.syncPetCompanion3D(true);
    this.applySkin(this.state.getEquippedSkin());
    this.isPaused = prevPaused;

    const ok =
      subSpawnedUnderwater &&
      subAdvancesAlongLane &&
      coralBlocksSubAndCrowdBreaksIt &&
      bubbleRescueAddsUnits &&
      subContactPopsBubble &&
      jellyfishStingDamagesAndSlows &&
      torpedoHitsJellyfish &&
      dockingWinsStage &&
      hullBreachLosesStage &&
      oxygenOutLosesStage &&
      pearlsPersistedWithMilestone &&
      petsAdoptUpgradeEquipPersisted &&
      jellyPetMagnetAndGold &&
      turtlePetShellAndReduction &&
      seahorsePetChainAndCombo &&
      pet3DVisualSwitched &&
      petFollowsCrowd;
    return {
      ok,
      subSpawnedUnderwater,
      subAdvancesAlongLane,
      coralBlocksSubAndCrowdBreaksIt,
      bubbleRescueAddsUnits,
      subContactPopsBubble,
      jellyfishStingDamagesAndSlows,
      torpedoHitsJellyfish,
      dockingWinsStage,
      hullBreachLosesStage,
      oxygenOutLosesStage,
      pearlsPersistedWithMilestone,
      petsAdoptUpgradeEquipPersisted,
      jellyPetMagnetAndGold,
      turtlePetShellAndReduction,
      seahorsePetChainAndCombo,
      pet3DVisualSwitched,
      petFollowsCrowd,
      stats,
    };
  }

  public runMc12SelfCheck(): {
    ok: boolean;
    sledSpawnedOnGlacier: boolean;
    sledSlidesAndCourseScrolls: boolean;
    sledSteersAndRidersFollow: boolean;
    gateAddsRiders: boolean;
    icicleKnocksRiders: boolean;
    avalancheKnocksOutsideGap: boolean;
    avalancheGapSafe: boolean;
    boostSpeedsUp: boolean;
    finishWinsStage: boolean;
    timeoutLosesStage: boolean;
    wipeoutLosesStage: boolean;
    medalsScaleWithTimeAndSurvivors: boolean;
    medalsPersistedWithMilestone: boolean;
    hallReadsExistingCounters: boolean;
    hallSlotsUnlockPlacePersist: boolean;
    hallBuffsApplyGlobally: boolean;
    pedestalMirrorsDisplay: boolean;
    stats: Record<string, number>;
  } {
    const st = this.state;
    const prevPaused = this.isPaused;
    const prevLevel = this.currentLevel;
    const prevOnStageEnd = this.onStageEnd;
    const prevOnBanner = this.onBanner;
    const prevTurretX = this.turretX;
    const prevTurretTargetX = this.turretTargetX;
    const snap = {
      gold: st.gold,
      iceMedals: st.iceMedals,
      lifetimeIceMedals: st.lifetimeIceMedals,
      glacierSledClears: st.glacierSledClears,
      bestSledFinishSec: st.bestSledFinishSec,
      bestSledSurvivors: st.bestSledSurvivors,
      totalSledGatesPassed: st.totalSledGatesPassed,
      totalSledRidersLost: st.totalSledRidersLost,
      trophyHallSlots: st.trophyHallSlots,
      trophyDisplay: [...st.trophyDisplay],
      bestStageCleared: st.bestStageCleared,
      colossusRaidClears: st.colossusRaidClears,
      airshipWingMedals: st.airshipWingMedals,
      lifetimeAirshipWingMedals: st.lifetimeAirshipWingMedals,
      trainGoldMedals: st.trainGoldMedals,
      lifetimeTrainGoldMedals: st.lifetimeTrainGoldMedals,
      deepPearls: st.deepPearls,
      lifetimeDeepPearls: st.lifetimeDeepPearls,
    };
    const stats: Record<string, number> = {};
    this.isPaused = true;
    this.onStageEnd = undefined;
    this.onBanner = undefined;
    const riders = (): number => this.getSledRiderCount();
    const clearShields = (): void => {
      for (const u of this.units) {
        if (u.active) {
          u.frostShield = false;
          u.petShellGranted = false;
        }
      }
    };
    const loadSled = (): GlacierSledRuntime | null => {
      this.loadLevel(generateGlacierSledLevel(1));
      for (const u of this.units) if (u.active && u.team === 'red') u.active = false;
      clearShields();
      this.snapSledRidersToSlots();
      return this.glacierSled;
    };

    // Freeze milestone bonuses so rider counts are deterministic
    st.iceMedals = 0;
    st.lifetimeIceMedals = 0;
    st.trophyHallSlots = 1;
    st.trophyDisplay = [null, null, null, null, null, null];

    // 1. Load the sled race -> glacier course, toy sled, riders on deck, hidden boss & turret, no reds
    const lvl = generateGlacierSledLevel(1);
    const s0 = loadSled();
    const startRiders = riders();
    let redCount = 0;
    for (const u of this.units) if (u.active && u.team === 'red') redCount++;
    const sledSpawnedOnGlacier = Boolean(
      lvl.isGlacierSled &&
        lvl.mode === 'glacier_sled' &&
        s0 &&
        s0.active &&
        s0.group.parent === this.levelGroup &&
        s0.courseGroup.parent === this.levelGroup &&
        this.currentTheme.id === 'glacier' &&
        this.sledGates.length >= 6 &&
        this.sledIcicles.length >= 6 &&
        this.sledAvalanches.length >= 2 &&
        this.sledBoosts.length >= 1 &&
        this.sledFinishGroup !== null &&
        !this.bossGroup.visible &&
        !this.turretGroup.visible &&
        startRiders === (lvl.sledCourse?.startRiders ?? -1) &&
        redCount === 0 &&
        (lvl.sledCourse?.timeLimitSec ?? 0) > (lvl.sledCourse?.length ?? 0) / (lvl.sledCourse?.baseSpeed ?? 1)
    );
    stats.startRiders = startRiders;
    stats.courseLength = lvl.sledCourse?.length ?? 0;
    stats.timeLimit = lvl.sledCourse?.timeLimitSec ?? 0;

    // 2. The sled accelerates downhill, the course scrolls toward the camera, the countdown runs
    let sledSlidesAndCourseScrolls = false;
    if (s0) {
      const z0 = s0.courseGroup.position.z;
      const t0 = s0.timeLeft;
      for (let i = 0; i < 20; i++) this.updateGlacierSled(0.05);
      sledSlidesAndCourseScrolls = s0.distance > 2 && s0.courseGroup.position.z > z0 + 2 && s0.timeLeft < t0 && s0.speed > 3;
      stats.distAfter1s = Number(s0.distance.toFixed(2));
    }

    // 3. Steering: the sled follows the cannon aim and the riders follow the sled (real simulateUnits)
    let sledSteersAndRidersFollow = false;
    const s1 = loadSled();
    if (s1) {
      this.turretX = 5.5;
      this.turretTargetX = 5.5;
      for (let i = 0; i < 24; i++) {
        this.updateGlacierSled(0.05);
        this.simulateUnits(0.05);
      }
      let sumX = 0;
      let n = 0;
      for (const u of this.units) {
        if (u.active && u.team === 'blue') {
          sumX += u.x;
          n++;
        }
      }
      const avgX = n > 0 ? sumX / n : 0;
      sledSteersAndRidersFollow = s1.x > 4.5 && avgX > 3.5 && n === startRiders;
      stats.riderAvgX = Number(avgX.toFixed(2));
    }
    this.turretX = 0;
    this.turretTargetX = 0;

    // 4. Gate: crossing a +N gate adds exactly N riders
    let gateAddsRiders = false;
    const s2 = loadSled();
    const addGate = this.sledGates.find((g) => g.cfg.op === 'add');
    if (s2 && addGate) {
      s2.x = addGate.cfg.x;
      this.turretX = addGate.cfg.x;
      s2.distance = addGate.cfg.d - 0.3;
      s2.speed = s2.baseSpeed;
      const before = riders();
      this.updateGlacierSled(0.05);
      const after = riders();
      gateAddsRiders = addGate.resolved && addGate.triggered && after === before + addGate.cfg.value && this.sledGatesPassed === 1;
      stats.gateAdded = after - before;
      // the paired gate on the other side resolves without triggering
      const pair = this.sledGates.find((g) => g !== addGate && g.cfg.d === addGate.cfg.d);
      if (pair) gateAddsRiders = gateAddsRiders && pair.resolved && !pair.triggered;
    }

    // 5. Icicle: a landed spike in the sled's path stumbles the sled and knocks riders off (capped)
    let icicleKnocksRiders = false;
    const s3 = loadSled();
    const ic = this.sledIcicles[0];
    if (s3 && ic) {
      s3.x = ic.cfg.x;
      this.turretX = ic.cfg.x;
      this.snapSledRidersToSlots();
      ic.landed = true;
      ic.spike.visible = true;
      ic.spike.position.y = -0.15;
      s3.distance = ic.cfg.d - 2.6;
      s3.speed = 0;
      s3.baseSpeed = 0.0001;
      const before = riders();
      for (let i = 0; i < 40 && !ic.shattered; i++) {
        s3.distance += 0.12;
        this.updateGlacierSled(0.016);
      }
      const lost = before - riders();
      icicleKnocksRiders = lost >= 1 && lost <= ic.cfg.knockCap && s3.slowTimer > 0 && this.sledIciclesHit >= 1;
      stats.icicleKnocked = lost;
    }

    // 6. Avalanche: outside the gap riders get swept off; inside the flagged gap everyone is safe
    let avalancheKnocksOutsideGap = false;
    let avalancheGapSafe = false;
    const s4 = loadSled();
    const av = this.sledAvalanches[0];
    if (s4 && av) {
      const outsideX = av.cfg.gapX > 0 ? av.cfg.gapX - av.cfg.gapW * 0.5 - 4.0 : av.cfg.gapX + av.cfg.gapW * 0.5 + 4.0;
      s4.x = THREE.MathUtils.clamp(outsideX, -s4.maxSteerX, s4.maxSteerX);
      this.turretX = s4.x;
      this.sledXHistory.fill(s4.x);
      this.snapSledRidersToSlots();
      s4.baseSpeed = 0.0001;
      s4.speed = 0;
      s4.distance = av.d - 8;
      const before = riders();
      for (let i = 0; i < 120 && !av.passed; i++) this.updateGlacierSled(0.05);
      const lost = before - riders();
      avalancheKnocksOutsideGap = av.rolling && av.passed && lost >= 1 && this.sledAvalancheHits >= 1;
      stats.avalancheKnocked = lost;
    }
    const s5 = loadSled();
    const av2 = this.sledAvalanches[0];
    if (s5 && av2) {
      s5.x = av2.cfg.gapX;
      this.turretX = av2.cfg.gapX;
      this.sledXHistory.fill(s5.x);
      this.snapSledRidersToSlots();
      s5.baseSpeed = 0.0001;
      s5.speed = 0;
      s5.distance = av2.d - 8;
      const before = riders();
      for (let i = 0; i < 120 && !av2.passed; i++) this.updateGlacierSled(0.05);
      avalancheGapSafe = av2.passed && riders() === before && this.sledAvalancheHits === 0;
      stats.gapSafeRiders = riders();
    }

    // 7. Boost strip: sliding over it grants a speed burst
    let boostSpeedsUp = false;
    const s6 = loadSled();
    const boost = this.sledBoosts[0];
    if (s6 && boost) {
      s6.x = boost.cfg.x;
      this.turretX = boost.cfg.x;
      s6.distance = boost.cfg.d - 0.2;
      s6.speed = s6.baseSpeed;
      this.updateGlacierSled(0.05);
      for (let i = 0; i < 10; i++) this.updateGlacierSled(0.05);
      boostSpeedsUp = this.sledBoostsTaken === 1 && s6.boostTimer > 0 && s6.speed > s6.baseSpeed * 1.1;
      stats.boostSpeed = Number(s6.speed.toFixed(2));
    }
    this.turretX = 0;
    this.turretTargetX = 0;

    // 8. Crossing the finish line before the countdown ends wins the stage
    let finishWinsStage = false;
    const s7 = loadSled();
    if (s7) {
      s7.distance = s7.courseLength - 0.05;
      s7.speed = s7.baseSpeed;
      this.updateGlacierSled(0.05);
      finishWinsStage = this.isStageEnded && this.lastStageVictory && s7.state === 'finished' && this.getSledProgressPct() === 100;
    }

    // 9. Countdown runs out -> defeat
    let timeoutLosesStage = false;
    const s8 = loadSled();
    if (s8) {
      s8.timeLeft = 0.01;
      this.updateGlacierSled(0.05);
      timeoutLosesStage = this.isStageEnded && !this.lastStageVictory && s8.state === 'timeout';
    }

    // 10. Every rider knocked off -> defeat
    let wipeoutLosesStage = false;
    const s9 = loadSled();
    if (s9) {
      for (const u of this.units) if (u.active && u.team === 'blue') this.knockSledRider(u, true);
      this.updateGlacierSled(0.05);
      wipeoutLosesStage = this.isStageEnded && !this.lastStageVictory && s9.state === 'wiped';
    }

    // 11. Settlement: 冰晶奖章 scale with finish time + survivors and persist with a milestone
    st.iceMedals = 0;
    st.lifetimeIceMedals = 0;
    st.glacierSledClears = 0;
    st.bestSledFinishSec = 0;
    const slowRec = st.recordGlacierSledResult(true, 39, 41, 10, 2, 1, 100);
    const slowMedals = slowRec.medalsAwarded;
    st.iceMedals = 0;
    st.lifetimeIceMedals = 0;
    st.glacierSledClears = 0;
    st.bestSledFinishSec = 0;
    const baseMs = st.getIceMedalMilestoneBonus(0);
    const fastRec = st.recordGlacierSledResult(true, 26, 41, 64, 8, 4, 100);
    const lossRec = st.recordGlacierSledResult(false, 41, 41, 22, 30, 3, 62);
    const saved = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}') as {
      iceMedals?: number;
      glacierSledClears?: number;
      bestSledFinishSec?: number;
    };
    const boostedMs = st.getIceMedalMilestoneBonus();
    const medalsScaleWithTimeAndSurvivors =
      fastRec.medalsAwarded > slowMedals &&
      fastRec.timeBonusMedals === 2 &&
      fastRec.survivorBonusMedals === 3 &&
      slowRec.timeBonusMedals === 0 &&
      lossRec.medalsAwarded === 1 &&
      !lossRec.victory;
    const medalsPersistedWithMilestone =
      fastRec.milestoneReached &&
      fastRec.milestoneBonusCoins > 0 &&
      saved.iceMedals === st.iceMedals &&
      st.iceMedals === fastRec.medalsAwarded + lossRec.medalsAwarded &&
      saved.glacierSledClears === 1 &&
      saved.bestSledFinishSec === 26 &&
      boostedMs.troopSpeedMult > baseMs.troopSpeedMult &&
      boostedMs.sledBonusRiders > 0;
    stats.fastMedals = fastRec.medalsAwarded;
    stats.slowMedals = slowMedals;

    // 12. Trophy hall reads the existing MC-8..MC-12 counters + campaign progress (no duplicated copies)
    st.bestStageCleared = 16;
    st.colossusRaidClears = 3;
    st.airshipWingMedals = 2;
    st.lifetimeAirshipWingMedals = 9;
    st.trainGoldMedals = 17;
    st.lifetimeTrainGoldMedals = 17;
    st.deepPearls = 0;
    st.lifetimeDeepPearls = 0;
    st.iceMedals = 4;
    st.lifetimeIceMedals = 4;
    const hallReadsExistingCounters =
      st.getHallTrophyTier('campaign_star') === 2 &&
      st.getHallTrophyTier('clockwork_core') === 2 &&
      st.getHallTrophyTier('airship_medal') === 2 &&
      st.getHallTrophyTier('train_medal') === 3 &&
      st.getHallTrophyTier('deep_pearl') === 0 &&
      st.getHallTrophyTier('ice_medal') === 1 &&
      st.getHallTrophyMetric('airship_medal') === 9;

    // 13. Unlock display slots (medal + gold), place / move / reject trophies & persist
    st.gold = 50000;
    st.trophyHallSlots = 1;
    st.trophyDisplay = [null, null, null, null, null, null];
    const lockedSlotRejected = !st.placeTrophy(1, 'train_medal');
    const unearnedRejected = !st.placeTrophy(0, 'deep_pearl');
    const placed0 = st.placeTrophy(0, 'train_medal');
    const unlockMedal = st.unlockTrophySlot('medal');
    const unlockGold = st.unlockTrophySlot('gold');
    const placed1 = st.placeTrophy(1, 'airship_medal');
    const placed2 = st.placeTrophy(2, 'train_medal');
    const moved = st.trophyDisplay[0] === null && st.trophyDisplay[2] === 'train_medal';
    st.placeTrophy(0, 'clockwork_core');
    const savedHall = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}') as {
      trophyHallSlots?: number;
      trophyDisplay?: Array<string | null>;
    };
    const hallSlotsUnlockPlacePersist =
      lockedSlotRejected &&
      unearnedRejected &&
      placed0 &&
      unlockMedal.unlocked &&
      unlockMedal.spentCurrency === 'medal' &&
      st.iceMedals === 4 - TROPHY_SLOT_MEDAL_COSTS[1] &&
      unlockGold.unlocked &&
      unlockGold.spentCurrency === 'gold' &&
      placed1 &&
      placed2 &&
      moved &&
      st.getUnlockedTrophySlots() === 3 &&
      savedHall.trophyHallSlots === 3 &&
      savedHall.trophyDisplay?.[0] === 'clockwork_core' &&
      savedHall.trophyDisplay?.[1] === 'airship_medal' &&
      savedHall.trophyDisplay?.[2] === 'train_medal';

    // 14. Displayed trophies grant global buffs (fire rate, siege, attack, gold via hall milestone)
    const withHall = {
      fire: st.getFireRatePerSec(),
      siege: st.getSiegeDamageMultiplier(),
      loot: st.getLootMultiplier(),
      dmg: st.getHallTroopDmgMult(),
      tier: st.getHallMilestoneTier(),
    };
    const savedDisplay = [...st.trophyDisplay];
    st.trophyDisplay = [null, null, null, null, null, null];
    const noHall = {
      fire: st.getFireRatePerSec(),
      siege: st.getSiegeDamageMultiplier(),
      loot: st.getLootMultiplier(),
      dmg: st.getHallTroopDmgMult(),
    };
    st.trophyDisplay = savedDisplay;
    const hallBuffsApplyGlobally =
      withHall.tier === 1 &&
      withHall.fire > noHall.fire * 1.03 &&
      withHall.siege > noHall.siege * 1.08 &&
      withHall.loot > noHall.loot * 1.04 &&
      withHall.dmg > noHall.dmg * 1.09;
    stats.hallFireMult = Number((withHall.fire / Math.max(0.01, noHall.fire)).toFixed(3));
    stats.hallLootMult = Number((withHall.loot / Math.max(0.01, noHall.loot)).toFixed(3));

    // 15. The lobby 3D pedestal mirrors exactly the displayed trophies (tier-colored cups)
    let pedestalMirrorsDisplay = true;
    if (this.trophyPedestal) {
      const n = this.syncTrophyPedestal3D(true);
      const cups = this.trophyPedestal.cupsGroup.children;
      pedestalMirrorsDisplay =
        n === 3 &&
        cups.length === 3 &&
        cups.some((c) => c.userData.trophyId === 'train_medal' && c.userData.tier === 3) &&
        cups.some((c) => c.userData.trophyId === 'clockwork_core' && c.userData.tier === 2);
      stats.pedestalCups = cups.length;
    } else {
      stats.pedestalCups = -1;
    }

    // Restore the original state cleanly
    st.gold = snap.gold;
    st.iceMedals = snap.iceMedals;
    st.lifetimeIceMedals = snap.lifetimeIceMedals;
    st.glacierSledClears = snap.glacierSledClears;
    st.bestSledFinishSec = snap.bestSledFinishSec;
    st.bestSledSurvivors = snap.bestSledSurvivors;
    st.totalSledGatesPassed = snap.totalSledGatesPassed;
    st.totalSledRidersLost = snap.totalSledRidersLost;
    st.trophyHallSlots = snap.trophyHallSlots;
    st.trophyDisplay = snap.trophyDisplay;
    st.bestStageCleared = snap.bestStageCleared;
    st.colossusRaidClears = snap.colossusRaidClears;
    st.airshipWingMedals = snap.airshipWingMedals;
    st.lifetimeAirshipWingMedals = snap.lifetimeAirshipWingMedals;
    st.trainGoldMedals = snap.trainGoldMedals;
    st.lifetimeTrainGoldMedals = snap.lifetimeTrainGoldMedals;
    st.deepPearls = snap.deepPearls;
    st.lifetimeDeepPearls = snap.lifetimeDeepPearls;
    st.save();
    this.syncTrophyPedestal3D(true);
    this.turretX = prevTurretX;
    this.turretTargetX = prevTurretTargetX;
    this.onStageEnd = prevOnStageEnd;
    this.onBanner = prevOnBanner;
    if (prevLevel) {
      this.loadLevel(prevLevel);
    }
    this.isPaused = prevPaused;

    const ok =
      sledSpawnedOnGlacier &&
      sledSlidesAndCourseScrolls &&
      sledSteersAndRidersFollow &&
      gateAddsRiders &&
      icicleKnocksRiders &&
      avalancheKnocksOutsideGap &&
      avalancheGapSafe &&
      boostSpeedsUp &&
      finishWinsStage &&
      timeoutLosesStage &&
      wipeoutLosesStage &&
      medalsScaleWithTimeAndSurvivors &&
      medalsPersistedWithMilestone &&
      hallReadsExistingCounters &&
      hallSlotsUnlockPlacePersist &&
      hallBuffsApplyGlobally &&
      pedestalMirrorsDisplay;
    return {
      ok,
      sledSpawnedOnGlacier,
      sledSlidesAndCourseScrolls,
      sledSteersAndRidersFollow,
      gateAddsRiders,
      icicleKnocksRiders,
      avalancheKnocksOutsideGap,
      avalancheGapSafe,
      boostSpeedsUp,
      finishWinsStage,
      timeoutLosesStage,
      wipeoutLosesStage,
      medalsScaleWithTimeAndSurvivors,
      medalsPersistedWithMilestone,
      hallReadsExistingCounters,
      hallSlotsUnlockPlacePersist,
      hallBuffsApplyGlobally,
      pedestalMirrorsDisplay,
      stats,
    };
  }

  public runMc13SelfCheck(): {
    ok: boolean;
    lavaSpawnedOnMagma: boolean;
    crowdHopsAndCourseScrolls: boolean;
    crowdSteersAndBobosFollow: boolean;
    landingOnPlatformKeepsBobos: boolean;
    missingPlatformDropsBobos: boolean;
    wideSquadLosesEdgeBobos: boolean;
    gateAddsBobos: boolean;
    eruptionTelegraphedThenKnocks: boolean;
    cooledShieldBlocksHazards: boolean;
    rockKnocksBobos: boolean;
    exitWinsStage: boolean;
    timeoutLosesStage: boolean;
    wipeoutLosesStage: boolean;
    autopilotClearsTier1: boolean;
    tiersScale: boolean;
    coresScaleWithTimeAndSurvivors: boolean;
    coresPersistedWithMilestone: boolean;
    gachaOddsDeterministic: boolean;
    gachaPityGuaranteesRare: boolean;
    gachaDuplicatesConvertToCoins: boolean;
    gachaCostsAndPersist: boolean;
    skinChangesBobo3D: boolean;
    lavaTrophyReadsCounter: boolean;
    stats: Record<string, number>;
  } {
    const st = this.state;
    const prevPaused = this.isPaused;
    const prevLevel = this.currentLevel;
    const prevOnStageEnd = this.onStageEnd;
    const prevOnBanner = this.onBanner;
    const prevTurretX = this.turretX;
    const prevTurretTargetX = this.turretTargetX;
    const snap = {
      gold: st.gold,
      lavaCores: st.lavaCores,
      lifetimeLavaCores: st.lifetimeLavaCores,
      lavaJumpClears: st.lavaJumpClears,
      bestLavaFinishSec: st.bestLavaFinishSec,
      bestLavaSurvivors: st.bestLavaSurvivors,
      totalLavaHops: st.totalLavaHops,
      totalLavaBobosLost: st.totalLavaBobosLost,
      ownedGachaSkins: [...st.ownedGachaSkins],
      equippedGachaSkin: st.equippedGachaSkin,
      gachaPity: st.gachaPity,
      gachaSsrPity: st.gachaSsrPity,
      totalGachaRolls: st.totalGachaRolls,
      trophyHallSlots: st.trophyHallSlots,
      trophyDisplay: [...st.trophyDisplay],
    };
    const stats: Record<string, number> = {};
    this.isPaused = true;
    this.onStageEnd = undefined;
    this.onBanner = undefined;
    const bobos = (): number => this.getLavaBoboCount();
    const clearShields = (): void => {
      for (const u of this.units) {
        if (u.active) {
          u.frostShield = false;
          u.petShellGranted = false;
        }
      }
    };
    const loadLava = (tier = 1): LavaRunRuntime | null => {
      this.loadLevel(generateLavaJumpLevel(tier));
      for (const u of this.units) if (u.active && u.team === 'red') u.active = false;
      clearShields();
      this.snapLavaBobosToSlots();
      return this.lavaRun;
    };
    /** Places the squad centre at x just before `row` and walks the course forward in small manual steps. */
    const walkOnto = (s: LavaRunRuntime, rowIdx: number, x: number, extra = 1.4): void => {
      const row = s.rows[rowIdx];
      s.x = x;
      this.turretX = x;
      s.baseSpeed = 0.0001;
      s.speed = 0;
      s.distance = row.start - 1.3;
      this.snapLavaBobosToSlots();
      clearShields();
      for (let i = 0; i < 80 && s.active && s.distance < row.start + extra; i++) {
        s.distance += 0.12;
        this.updateLavaJump(0.016);
      }
    };
    const firstRowWith = (s: LavaRunRuntime, pred: (p: LavaPlatformRuntime) => boolean): { rowIdx: number; p: LavaPlatformRuntime } | null => {
      for (let ri = 1; ri < s.rows.length - 1; ri++) {
        for (const p of s.rows[ri].platforms) if (pred(p)) return { rowIdx: ri, p };
      }
      return null;
    };
    const hazardRows = (): Set<number> => {
      const set = new Set<number>();
      for (const e of this.lavaEruptions) set.add(e.cfg.row);
      for (const r of this.lavaRocks) set.add(r.cfg.row);
      return set;
    };

    // Freeze milestone bonuses so Bobo counts are deterministic
    st.lavaCores = 0;
    st.lifetimeLavaCores = 0;
    st.equippedGachaSkin = null;

    // 1. Load the lava run -> magma theme, lava lake, platform rows, hazards, squad on the start shore, no reds
    const lvl = generateLavaJumpLevel(1);
    const s0 = loadLava();
    const start = bobos();
    let redCount = 0;
    for (const u of this.units) if (u.active && u.team === 'red') redCount++;
    const plats = lvl.lavaPlatforms || [];
    const course = lvl.lavaCourse;
    const lavaSpawnedOnMagma = Boolean(
      lvl.isLavaJump &&
        lvl.mode === 'lava_jump' &&
        s0 &&
        s0.active &&
        s0.courseGroup.parent === this.levelGroup &&
        this.currentTheme.id === 'magma' &&
        s0.rows.length >= 14 &&
        plats.filter((p) => p.gateOp).length >= 4 &&
        plats.filter((p) => p.kind === 'cooled').length >= 1 &&
        this.lavaEruptions.length >= 2 &&
        this.lavaRocks.length >= 2 &&
        this.lavaExitGroup !== null &&
        !this.bossGroup.visible &&
        !this.turretGroup.visible &&
        start === (course?.startBobos ?? -1) &&
        redCount === 0 &&
        course !== undefined &&
        course.timeLimitSec > course.length / course.baseSpeed &&
        course.length / course.baseSpeed >= 25 &&
        course.length / course.baseSpeed <= 35
    );
    stats.startBobos = start;
    stats.courseLength = course?.length ?? 0;
    stats.timeLimit = course?.timeLimitSec ?? 0;
    stats.rows = s0 ? s0.rows.length : 0;
    stats.paceSec = course ? Number((course.length / course.baseSpeed).toFixed(1)) : 0;

    // 2. The squad hops forward: the course scrolls toward the camera, Bobos arc through the air between rows
    let crowdHopsAndCourseScrolls = false;
    if (s0) {
      const z0 = s0.courseGroup.position.z;
      const t0 = s0.timeLeft;
      let maxRide = 0;
      for (let i = 0; i < 40 && s0.active; i++) {
        this.turretX = this.getLavaAutopilotX();
        this.updateLavaJump(0.05);
        for (const u of this.units) if (u.active && u.team === 'blue') maxRide = Math.max(maxRide, u.rideY || 0);
      }
      crowdHopsAndCourseScrolls =
        s0.distance > 6 && s0.courseGroup.position.z > z0 + 6 && s0.timeLeft < t0 && s0.speed > 3 && maxRide > LAVA_PLATFORM_TOP + 1.0;
      stats.distAfter2s = Number(s0.distance.toFixed(2));
      stats.maxHopY = Number(maxRide.toFixed(2));
    }

    // 3. Steering on the wide start shore: the squad follows the cannon aim and the Bobos follow (real simulateUnits)
    let crowdSteersAndBobosFollow = false;
    const s1 = loadLava();
    if (s1) {
      s1.baseSpeed = 3.0;
      s1.distance = -7;
      this.snapLavaBobosToSlots();
      this.turretX = 5.5;
      this.turretTargetX = 5.5;
      for (let i = 0; i < 24; i++) {
        this.updateLavaJump(0.05);
        this.simulateUnits(0.05);
      }
      let sumX = 0;
      let n = 0;
      for (const u of this.units) {
        if (u.active && u.team === 'blue') {
          sumX += u.x;
          n++;
        }
      }
      const avgX = n > 0 ? sumX / n : 0;
      crowdSteersAndBobosFollow = s1.x > 4.5 && avgX > 3.5 && n === start && s1.distance + 0.9 < s1.rows[0].end;
      stats.boboAvgX = Number(avgX.toFixed(2));
    }
    this.turretX = 0;
    this.turretTargetX = 0;

    // 4. Landing squarely on a hazard-free platform keeps every Bobo
    let landingOnPlatformKeepsBobos = false;
    const s2 = loadLava();
    const hz = hazardRows();
    const safe = s2 ? firstRowWith(s2, (p) => !p.cfg.gateOp && p.cfg.kind === 'stone' && !hz.has(p.cfg.row)) : null;
    if (s2 && safe) {
      const before = bobos();
      walkOnto(s2, safe.rowIdx, safe.p.cfg.x, 1.3);
      let onRow = 0;
      for (const u of this.units) if (u.active && u.team === 'blue' && u.lavaRow === safe.rowIdx) onRow++;
      landingOnPlatformKeepsBobos = bobos() === before && onRow === before && this.lavaBobosFell === 0 && safe.p.landed === before;
      stats.landedOnRow = onRow;
    }

    // 5. Missing every platform: the whole squad sinks into the lava -> wiped
    let missingPlatformDropsBobos = false;
    const s3 = loadLava();
    if (s3 && safe) {
      const row = s3.rows[safe.rowIdx];
      const half = this.getLavaSquadHalfWidth(bobos());
      let gapX = 0;
      let gapBest = -Infinity;
      for (let x = -s3.maxSteerX; x <= s3.maxSteerX; x += 0.1) {
        let minEdge = Infinity;
        for (const p of row.platforms) minEdge = Math.min(minEdge, Math.abs(x - p.cfg.x) - p.cfg.width * 0.5);
        if (minEdge > gapBest) {
          gapBest = minEdge;
          gapX = x;
        }
      }
      const before = bobos();
      walkOnto(s3, safe.rowIdx, gapX, 1.3);
      missingPlatformDropsBobos =
        gapBest > half + LAVA_LAND_MARGIN && this.lavaBobosFell === before && bobos() === 0 && s3.state === 'wiped' && this.isStageEnded && !this.lastStageVictory;
      stats.fellIntoLava = this.lavaBobosFell;
    }

    // 6. A wide squad (49 Bobos = 7 columns) lined up on a platform edge loses only its overhanging columns
    let wideSquadLosesEdgeBobos = false;
    const s4 = loadLava();
    if (s4 && safe) {
      for (let i = bobos(); i < 49; i++) {
        const u = this.spawnUnit('blue', 'normal', 0, SLED_Z, 0, 0);
        if (u) {
          u.rideY = LAVA_PLATFORM_TOP;
          u.lavaRow = 0;
          u.lavaPlat = 0;
        }
      }
      const p = s4.rows[safe.rowIdx].platforms.find((pp) => pp.cfg.id === safe.p.cfg.id) || safe.p;
      const half = this.getLavaSquadHalfWidth(bobos());
      const edgeX = p.cfg.x + p.cfg.width * 0.5 + LAVA_LAND_MARGIN - half + LAVA_COL_SPACING * 1.6;
      const before = bobos();
      walkOnto(s4, safe.rowIdx, edgeX, 3.4);
      const lost = before - bobos();
      wideSquadLosesEdgeBobos = before === 49 && lost >= 7 && lost < before && this.lavaBobosFell === lost;
      stats.wideLost = lost;
      stats.wideHalfW = Number(half.toFixed(2));
    }

    // 7. Unit gate on a platform: landing there adds exactly +N Bobos
    let gateAddsBobos = false;
    const s5 = loadLava();
    const gateHit = s5 ? firstRowWith(s5, (p) => p.cfg.gateOp === 'add') : null;
    if (s5 && gateHit) {
      const before = bobos();
      walkOnto(s5, gateHit.rowIdx, gateHit.p.cfg.x, -0.6);
      const after = bobos();
      const pair = s5.rows[gateHit.rowIdx].platforms.find((pp) => pp !== gateHit.p);
      gateAddsBobos =
        gateHit.p.gateTriggered &&
        after === before + (gateHit.p.cfg.gateValue ?? -99) &&
        this.lavaGatesPassed === 1 &&
        this.lavaBobosFell === 0 &&
        Boolean(pair && !pair.gateTriggered);
      stats.gateAdded = after - before;
    }

    // 8. Eruption: telegraphed (warning ring charges) long before it bursts, then knocks Bobos off (capped)
    let eruptionTelegraphedThenKnocks = false;
    const s6 = loadLava();
    const er = this.lavaEruptions[0];
    if (s6 && er) {
      const rowIdx = s6.rows.findIndex((r) => r.index === er.cfg.row);
      s6.baseSpeed = 0.0001;
      s6.speed = 0;
      s6.distance = er.cfg.d - 20;
      s6.x = er.cfg.x;
      this.turretX = er.cfg.x;
      this.snapLavaBobosToSlots();
      this.updateLavaJump(0.05);
      const warned = er.telegraphed && !er.erupting && er.fill.scale.x > 0.02 && er.ringMat.opacity > 0;
      const before = bobos();
      walkOnto(s6, rowIdx, er.cfg.x, 2.6);
      const lost = before - bobos();
      eruptionTelegraphedThenKnocks =
        warned && er.erupting && er.plume.visible && lost >= 1 && lost <= er.cfg.knockCap && er.knocked === lost &&
        this.lavaEruptionHits === 1 && s6.slowTimer > 0 && this.lavaBobosFell === 0;
      stats.eruptKnocked = lost;
    }

    // 9. Cooled-rock safe platform: landing grants a heat shield that blocks the eruption
    let cooledShieldBlocksHazards = false;
    const s7 = loadLava();
    const cooled = s7 ? firstRowWith(s7, (p) => p.cfg.kind === 'cooled') : null;
    if (s7 && cooled) {
      walkOnto(s7, cooled.rowIdx, cooled.p.cfg.x, 0.2);
      const shieldGranted = s7.shieldTimer > 0 && this.lavaCooledLandings === 1 && s7.state === 'shielded';
      const s7b = loadLava();
      const er2 = this.lavaEruptions[0];
      if (s7b && er2) {
        const rowIdx = s7b.rows.findIndex((r) => r.index === er2.cfg.row);
        const before = bobos();
        s7b.shieldTimer = 99;
        walkOnto(s7b, rowIdx, er2.cfg.x, 2.6);
        cooledShieldBlocksHazards =
          shieldGranted && er2.erupting && er2.knocked === 0 && er2.blocked >= 1 && bobos() === before && this.lavaShieldBlocks === 1;
        stats.shieldBlocked = er2.blocked;
      }
    }

    // 10. A falling volcanic bomb lands on the platform and knocks Bobos off as the squad passes (capped)
    let rockKnocksBobos = false;
    const s8 = loadLava();
    const rk = this.lavaRocks[0];
    if (s8 && rk) {
      const rowIdx = s8.rows.findIndex((r) => r.index === rk.cfg.row);
      rk.landed = true;
      rk.rock.visible = true;
      rk.rock.position.y = LAVA_PLATFORM_TOP + rk.cfg.radius * 0.45;
      const before = bobos();
      walkOnto(s8, rowIdx, rk.cfg.x, 3.0);
      const lost = before - bobos();
      rockKnocksBobos = lost >= 1 && lost <= rk.cfg.knockCap && rk.knocked === lost && this.lavaRockHits >= 1 && this.lavaBobosFell === 0;
      stats.rockKnocked = lost;
    }

    // 11. Reaching the exit shore before the countdown ends wins the stage
    let exitWinsStage = false;
    const s9 = loadLava();
    if (s9) {
      for (const u of this.units) if (u.active && u.team === 'blue') u.lavaRow = s9.rows.length - 2;
      s9.distance = s9.courseLength - 0.05;
      s9.speed = s9.baseSpeed;
      this.updateLavaJump(0.05);
      exitWinsStage = this.isStageEnded && this.lastStageVictory && s9.state === 'finished' && this.getLavaProgressPct() === 100;
    }

    // 12. Countdown runs out -> defeat
    let timeoutLosesStage = false;
    const s10 = loadLava();
    if (s10) {
      s10.timeLeft = 0.01;
      this.updateLavaJump(0.05);
      timeoutLosesStage = this.isStageEnded && !this.lastStageVictory && s10.state === 'timeout';
    }

    // 13. Every Bobo lost -> defeat
    let wipeoutLosesStage = false;
    const s11 = loadLava();
    if (s11) {
      for (const u of this.units) if (u.active && u.team === 'blue') this.knockLavaBobo(u, true);
      this.updateLavaJump(0.05);
      wipeoutLosesStage = this.isStageEnded && !this.lastStageVictory && s11.state === 'wiped';
    }

    // 14. Tier 1 is clearable in ~30 s by a careful line (autopilot through the real update + simulateUnits loop)
    let autopilotClearsTier1 = false;
    const s12 = loadLava();
    if (s12) {
      let steps = 0;
      while (s12.active && steps < 1200) {
        this.turretX = this.getLavaAutopilotX();
        this.turretTargetX = this.turretX;
        this.updateLavaJump(0.05);
        this.simulateUnits(0.05);
        steps++;
      }
      autopilotClearsTier1 =
        s12.state === 'finished' &&
        this.lastStageVictory &&
        this.lavaFinishSec >= 24 &&
        this.lavaFinishSec <= 36 &&
        this.lavaBoboCount >= start &&
        this.lavaGatesPassed >= 3 &&
        this.lavaHops >= s12.rows.length - 2;
      stats.autoFinishSec = this.lavaFinishSec;
      stats.autoSurvivors = this.lavaBoboCount;
      stats.autoGates = this.lavaGatesPassed;
      stats.autoLost = this.lavaBobosLost;
      stats.autoHops = this.lavaHops;
    }
    this.turretX = 0;
    this.turretTargetX = 0;

    // 15. Tiers scale: faster pace, longer course, narrower stone, stronger hazards
    const t1 = generateLavaJumpLevel(1);
    const t5 = generateLavaJumpLevel(5);
    const w1 = Math.min(...(t1.lavaPlatforms || []).filter((p) => p.kind === 'stone').map((p) => p.width));
    const w5 = Math.min(...(t5.lavaPlatforms || []).filter((p) => p.kind === 'stone').map((p) => p.width));
    const tiersScale = Boolean(
      t1.lavaCourse &&
        t5.lavaCourse &&
        t5.lavaCourse.baseSpeed > t1.lavaCourse.baseSpeed &&
        t5.lavaCourse.length > t1.lavaCourse.length &&
        w5 < w1 &&
        (t5.lavaEruptions?.[0]?.knockCap ?? 0) > (t1.lavaEruptions?.[0]?.knockCap ?? 0) &&
        (t5.lavaRocks?.length ?? 0) > (t1.lavaRocks?.length ?? 0) &&
        st.getLavaJumpSpec(0).lavaTier === 1 &&
        st.getLavaJumpSpec(3).lavaTier === 4 &&
        st.getLavaJumpSpec(99).lavaTier === 8
    );

    // 16. Settlement: 熔岩晶核 scale with finish time + survivors and persist with a milestone
    st.lavaCores = 0;
    st.lifetimeLavaCores = 0;
    st.lavaJumpClears = 0;
    st.bestLavaFinishSec = 0;
    const slowRec = st.recordLavaJumpResult(true, 38, 39, 10, 8, 18, 100);
    const slowCores = slowRec.coresAwarded;
    st.lavaCores = 0;
    st.lifetimeLavaCores = 0;
    st.lavaJumpClears = 0;
    st.bestLavaFinishSec = 0;
    const baseMs = st.getLavaCoreMilestoneBonus(0);
    const fastRec = st.recordLavaJumpResult(true, 26, 39, 48, 6, 20, 100);
    const lossRec = st.recordLavaJumpResult(false, 39, 39, 12, 20, 9, 55);
    const saved = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}') as {
      lavaCores?: number;
      lavaJumpClears?: number;
      bestLavaFinishSec?: number;
    };
    const boostedMs = st.getLavaCoreMilestoneBonus();
    const coresScaleWithTimeAndSurvivors =
      fastRec.coresAwarded > slowCores &&
      fastRec.timeBonusCores === 2 &&
      fastRec.survivorBonusCores === 3 &&
      slowRec.timeBonusCores === 0 &&
      lossRec.coresAwarded === 1 &&
      !lossRec.victory;
    const coresPersistedWithMilestone =
      fastRec.milestoneReached &&
      fastRec.milestoneBonusCoins > 0 &&
      saved.lavaCores === st.lavaCores &&
      st.lavaCores === fastRec.coresAwarded + lossRec.coresAwarded &&
      saved.lavaJumpClears === 1 &&
      saved.bestLavaFinishSec === 26 &&
      boostedMs.troopHpMult > baseMs.troopHpMult &&
      boostedMs.lavaBonusBobos > 0;
    stats.fastCores = fastRec.coresAwarded;
    stats.slowCores = slowCores;

    // 17. Gacha odds (injectable seeded random): ~55 / 30 / 12 / 3 and the exact same sequence for the same seed
    const seeded = (seed: number): (() => number) => {
      let a = seed >>> 0;
      return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    };
    const scripted = (vals: number[]): (() => number) => {
      let i = 0;
      return () => vals[Math.min(vals.length - 1, i++)];
    };
    const counts: Record<GachaRarity, number> = { N: 0, R: 0, SR: 0, SSR: 0 };
    const seqA: string[] = [];
    const rngA = seeded(1234);
    st.ownedGachaSkins = [];
    for (let i = 0; i < 4000; i++) {
      st.gachaPity = 0;
      st.gachaSsrPity = 0;
      const r = st.pullGachaOnce(rngA);
      counts[r.rarity]++;
      if (i < 30) seqA.push(r.id);
    }
    const rngB = seeded(1234);
    st.ownedGachaSkins = [];
    const seqB: string[] = [];
    for (let i = 0; i < 30; i++) {
      st.gachaPity = 0;
      st.gachaSsrPity = 0;
      seqB.push(st.pullGachaOnce(rngB).id);
    }
    st.ownedGachaSkins = [];
    st.gachaPity = 0;
    st.gachaSsrPity = 0;
    const pick = (v: number): GachaRarity => {
      st.gachaPity = 0;
      st.gachaSsrPity = 0;
      return st.pullGachaOnce(scripted([v, 0.0])).rarity;
    };
    const scriptedOk = pick(0.01) === 'SSR' && pick(0.1) === 'SR' && pick(0.3) === 'R' && pick(0.8) === 'N';
    const pct = (k: GachaRarity): number => (counts[k] / 4000) * 100;
    const gachaOddsDeterministic =
      Math.abs(pct('N') - 55) < 3 &&
      Math.abs(pct('R') - 30) < 3 &&
      Math.abs(pct('SR') - 12) < 2.5 &&
      Math.abs(pct('SSR') - 3) < 1.5 &&
      seqA.join(',') === seqB.join(',') &&
      scriptedOk &&
      GACHA_SKIN_ORDER.length === 8;
    stats.oddsN = Number(pct('N').toFixed(1));
    stats.oddsR = Number(pct('R').toFixed(1));
    stats.oddsSR = Number(pct('SR').toFixed(1));
    stats.oddsSSR = Number(pct('SSR').toFixed(1));

    // 18. Pity: 9 commons in a row -> the 10th pull is a guaranteed 史诗+; 49 without 传说 -> the 50th is 传说
    st.ownedGachaSkins = [];
    st.gachaPity = 0;
    st.gachaSsrPity = 0;
    const alwaysCommon = (): number => 0.99;
    const pityRolls: GachaRollResult[] = [];
    for (let i = 0; i < 10; i++) pityRolls.push(st.pullGachaOnce(alwaysCommon));
    const nineCommon = pityRolls.slice(0, 9).every((r) => r.rarity === 'N' && r.pity === null);
    const tenth = pityRolls[9];
    st.gachaPity = 0;
    st.gachaSsrPity = GACHA_PITY_SSR - 1;
    const ssrPull = st.pullGachaOnce(alwaysCommon);
    const gachaPityGuaranteesRare =
      nineCommon &&
      (tenth.rarity === 'SR' || tenth.rarity === 'SSR') &&
      tenth.pity === 'sr' &&
      st.gachaPity === 0 &&
      ssrPull.rarity === 'SSR' &&
      ssrPull.pity === 'ssr' &&
      ssrPull.id === 'royal_crown' &&
      st.gachaSsrPity === 0;
    stats.pityRarity = tenth.rarity === 'SSR' ? 4 : tenth.rarity === 'SR' ? 3 : 0;

    // 19. Duplicates convert to coins by rarity (no duplicate entry in the collection)
    st.ownedGachaSkins = ['mint_cap'];
    st.gachaPity = 0;
    st.gachaSsrPity = 0;
    const goldBeforeDup = st.gold;
    const dup = st.pullGachaOnce(scripted([0.9, 0.0]));
    const gachaDuplicatesConvertToCoins =
      dup.id === 'mint_cap' &&
      !dup.isNew &&
      dup.dupCoins === GACHA_RARITIES.N.dupCoins &&
      st.gold === goldBeforeDup + GACHA_RARITIES.N.dupCoins &&
      st.ownedGachaSkins.length === 1;

    // 20. Costs: 熔岩晶核 or coins, single / ten roll, refusal when short; collection, pity & cores persist
    st.ownedGachaSkins = [];
    st.gachaPity = 0;
    st.gachaSsrPity = 0;
    st.lavaCores = 20;
    st.lifetimeLavaCores = 20;
    st.gold = 10000;
    const r1 = st.rollGacha(1, 'core', seeded(7));
    const coresAfter1 = st.lavaCores;
    const goldBefore10 = st.gold;
    const r10 = st.rollGacha(10, 'gold', seeded(8));
    const goldAfter10 = st.gold;
    const r10c = st.rollGacha(10, 'core', seeded(9));
    const short = st.rollGacha(1, 'core', seeded(10));
    const savedGacha = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}') as {
      ownedGachaSkins?: string[];
      gachaPity?: number;
      lavaCores?: number;
      lifetimeLavaCores?: number;
      totalGachaRolls?: number;
    };
    const gachaCostsAndPersist =
      r1.ok &&
      r1.spentCurrency === 'core' &&
      coresAfter1 === 20 - GACHA_SINGLE_COST_CORES &&
      r10.ok &&
      r10.results.length === 10 &&
      goldAfter10 === goldBefore10 - GACHA_TEN_COST_GOLD + r10.totalDupCoins &&
      r10.results.some((r) => r.rarity === 'SR' || r.rarity === 'SSR') &&
      r10c.ok &&
      st.lavaCores === 0 &&
      !short.ok &&
      short.results.length === 0 &&
      st.lifetimeLavaCores === 20 &&
      Array.isArray(savedGacha.ownedGachaSkins) &&
      savedGacha.ownedGachaSkins.length === st.ownedGachaSkins.length &&
      new Set(savedGacha.ownedGachaSkins).size === savedGacha.ownedGachaSkins.length &&
      savedGacha.gachaPity === st.gachaPity &&
      savedGacha.lavaCores === 0 &&
      savedGacha.lifetimeLavaCores === 20 &&
      st.getGachaCollectionGoldMult() > 1 &&
      st.getGachaCollectionGoldMult() <= 1 + GACHA_COLLECTION_GOLD_CAP + 1e-9;
    stats.ownedAfterRolls = st.ownedGachaSkins.length;

    // 21. Equipping a skin re-skins the 3D Bobo troopers (tint, material, head accessory) and unequipping restores
    let skinChangesBobo3D = false;
    const s13 = loadLava();
    if (s13) {
      if (!st.ownedGachaSkins.includes('royal_crown')) st.ownedGachaSkins.push('royal_crown');
      const plain = this.getGachaSkinLookSnapshot();
      st.equipGachaSkin('royal_crown');
      this.syncGachaSkin3D();
      this.renderScene();
      const crowned = this.getGachaSkinLookSnapshot();
      const spec = GACHA_SKINS.royal_crown;
      st.equipGachaSkin(null);
      this.syncGachaSkin3D();
      this.renderScene();
      const cleared = this.getGachaSkinLookSnapshot();
      skinChangesBobo3D =
        crowned.skinId === 'royal_crown' &&
        crowned.accessoryVisible &&
        crowned.accessoryCount === bobos() &&
        crowned.tint0 === new THREE.Color(spec.tints[0]).getHexString() &&
        crowned.bodyMetalness >= spec.bodyMetalness - 0.001 &&
        crowned.tint0 !== plain.tint0 &&
        !cleared.accessoryVisible &&
        cleared.accessoryCount === 0 &&
        cleared.tint0 === plain.tint0;
      stats.accessoryCount = crowned.accessoryCount;
    }

    // 22. Trophy hall: the 熔岩晶核奖杯 reads the existing lifetime counter (no duplicated copy) and buffs gold income
    st.lavaCores = 2;
    st.lifetimeLavaCores = 9;
    const metricOk = st.getHallTrophyMetric('lava_core') === 9 && st.getHallTrophyTier('lava_core') === 2;
    st.trophyHallSlots = 1;
    st.trophyDisplay = [null, null, null, null, null, null];
    const lootNoTrophy = st.getLootMultiplier();
    const placed = st.placeTrophy(0, 'lava_core');
    const lootWithTrophy = st.getLootMultiplier();
    const lavaTrophyReadsCounter =
      metricOk &&
      placed &&
      Math.abs(st.getHallTrophyBuff('gold') - 0.04) < 1e-9 &&
      lootWithTrophy > lootNoTrophy * 1.035 &&
      HALL_TROPHY_ORDER.includes('lava_core');

    // Restore the original state cleanly
    st.gold = snap.gold;
    st.lavaCores = snap.lavaCores;
    st.lifetimeLavaCores = snap.lifetimeLavaCores;
    st.lavaJumpClears = snap.lavaJumpClears;
    st.bestLavaFinishSec = snap.bestLavaFinishSec;
    st.bestLavaSurvivors = snap.bestLavaSurvivors;
    st.totalLavaHops = snap.totalLavaHops;
    st.totalLavaBobosLost = snap.totalLavaBobosLost;
    st.ownedGachaSkins = snap.ownedGachaSkins;
    st.equippedGachaSkin = snap.equippedGachaSkin;
    st.gachaPity = snap.gachaPity;
    st.gachaSsrPity = snap.gachaSsrPity;
    st.totalGachaRolls = snap.totalGachaRolls;
    st.trophyHallSlots = snap.trophyHallSlots;
    st.trophyDisplay = snap.trophyDisplay;
    st.save();
    this.syncTrophyPedestal3D(true);
    this.turretX = prevTurretX;
    this.turretTargetX = prevTurretTargetX;
    this.onStageEnd = prevOnStageEnd;
    this.onBanner = prevOnBanner;
    if (prevLevel) {
      this.loadLevel(prevLevel);
    }
    this.isPaused = prevPaused;

    const ok =
      lavaSpawnedOnMagma &&
      crowdHopsAndCourseScrolls &&
      crowdSteersAndBobosFollow &&
      landingOnPlatformKeepsBobos &&
      missingPlatformDropsBobos &&
      wideSquadLosesEdgeBobos &&
      gateAddsBobos &&
      eruptionTelegraphedThenKnocks &&
      cooledShieldBlocksHazards &&
      rockKnocksBobos &&
      exitWinsStage &&
      timeoutLosesStage &&
      wipeoutLosesStage &&
      autopilotClearsTier1 &&
      tiersScale &&
      coresScaleWithTimeAndSurvivors &&
      coresPersistedWithMilestone &&
      gachaOddsDeterministic &&
      gachaPityGuaranteesRare &&
      gachaDuplicatesConvertToCoins &&
      gachaCostsAndPersist &&
      skinChangesBobo3D &&
      lavaTrophyReadsCounter;
    return {
      ok,
      lavaSpawnedOnMagma,
      crowdHopsAndCourseScrolls,
      crowdSteersAndBobosFollow,
      landingOnPlatformKeepsBobos,
      missingPlatformDropsBobos,
      wideSquadLosesEdgeBobos,
      gateAddsBobos,
      eruptionTelegraphedThenKnocks,
      cooledShieldBlocksHazards,
      rockKnocksBobos,
      exitWinsStage,
      timeoutLosesStage,
      wipeoutLosesStage,
      autopilotClearsTier1,
      tiersScale,
      coresScaleWithTimeAndSurvivors,
      coresPersistedWithMilestone,
      gachaOddsDeterministic,
      gachaPityGuaranteesRare,
      gachaDuplicatesConvertToCoins,
      gachaCostsAndPersist,
      skinChangesBobo3D,
      lavaTrophyReadsCounter,
      stats,
    };
  }

  public runMc14SelfCheck(): {
    ok: boolean;
    asteroidSpawnedInSpace: boolean;
    crowdFloatsAndCourseScrolls: boolean;
    crowdSteersAndBobosFollow: boolean;
    unitGateAddsBobos: boolean;
    shieldGateChargesShield: boolean;
    meteorTelegraphedThenKnocks: boolean;
    shieldAbsorbsHits: boolean;
    beltKnocksOutsideGap: boolean;
    beltGapSafe: boolean;
    warpExitWinsStage: boolean;
    timeoutLosesStage: boolean;
    wipeoutLosesStage: boolean;
    autopilotClearsTier1: boolean;
    tiersScale: boolean;
    badgesScaleWithTimeAndSurvivors: boolean;
    badgesPersistedWithMilestone: boolean;
    stardustTrophyReadsCounter: boolean;
    decorThemeBuyApplyPersist: boolean;
    decorPropBuyPlacePersist: boolean;
    decorBonusTinyCapped: boolean;
    decorTintsPedestal3D: boolean;
    stats: Record<string, number>;
  } {
    const st = this.state;
    const prevPaused = this.isPaused;
    const prevLevel = this.currentLevel;
    const prevOnStageEnd = this.onStageEnd;
    const prevOnBanner = this.onBanner;
    const prevTurretX = this.turretX;
    const prevTurretTargetX = this.turretTargetX;
    const snap = {
      gold: st.gold,
      stardustBadges: st.stardustBadges,
      lifetimeStardustBadges: st.lifetimeStardustBadges,
      asteroidDashClears: st.asteroidDashClears,
      bestAsteroidFinishSec: st.bestAsteroidFinishSec,
      bestAsteroidSurvivors: st.bestAsteroidSurvivors,
      totalAsteroidShieldBlocks: st.totalAsteroidShieldBlocks,
      totalAsteroidBobosLost: st.totalAsteroidBobosLost,
      ownedDecorThemes: [...st.ownedDecorThemes],
      activeDecorTheme: st.activeDecorTheme,
      ownedDecorProps: [...st.ownedDecorProps],
      decorSlots: [...st.decorSlots],
      lavaCores: st.lavaCores,
      lifetimeLavaCores: st.lifetimeLavaCores,
      iceMedals: st.iceMedals,
      lifetimeIceMedals: st.lifetimeIceMedals,
      trophyHallSlots: st.trophyHallSlots,
      trophyDisplay: [...st.trophyDisplay],
    };
    const stats: Record<string, number> = {};
    this.isPaused = true;
    this.onStageEnd = undefined;
    this.onBanner = undefined;
    const bobos = (): number => this.getLavaBoboCount();
    const clearShields = (): void => {
      for (const u of this.units) {
        if (u.active) {
          u.frostShield = false;
          u.petShellGranted = false;
        }
      }
    };
    const loadAst = (tier = 1): AsteroidRunRuntime | null => {
      this.loadLevel(generateAsteroidDashLevel(tier));
      for (const u of this.units) if (u.active && u.team === 'red') u.active = false;
      clearShields();
      this.snapAsteroidBobosToSlots();
      return this.asteroidRun;
    };
    /** Marks every course item behind `dist` as already handled (so jumping the distance never re-triggers them). */
    const skipBehind = (dist: number): void => {
      for (const g of this.asteroidGates) if (g.cfg.d < dist + AST_FRONT_OFFSET + 0.5) g.resolved = true;
      for (const m of this.asteroidMeteors) {
        if (m.cfg.d < dist - 1) {
          m.done = true;
          m.group.visible = false;
        }
      }
      for (const b of this.asteroidBelts) if (b.cfg.d < dist - 1) b.passed = true;
    };
    /** Holds the squad line at x and walks the course from `d - back` to `d + extra` in small manual steps. */
    const walkTo = (s: AsteroidRunRuntime, d: number, x: number, extra: number, back = 6): void => {
      skipBehind(d - back);
      s.x = x;
      this.turretX = x;
      this.turretTargetX = x;
      s.baseSpeed = 0.0001;
      s.speed = 0;
      s.distance = d - back;
      this.snapAsteroidBobosToSlots();
      clearShields();
      for (let i = 0; i < 160 && s.active && s.distance < d + extra; i++) {
        s.distance += 0.12;
        this.updateAsteroidDash(0.016);
      }
    };

    // Freeze milestone bonuses so Bobo counts / shield seconds are deterministic
    st.stardustBadges = 0;
    st.lifetimeStardustBadges = 0;

    // 1. Load the asteroid run -> deep-space tint, track, stars, gates, hazards, warp gate, squad, no reds
    const lvl = generateAsteroidDashLevel(1);
    const s0 = loadAst();
    const start = bobos();
    let redCount = 0;
    for (const u of this.units) if (u.active && u.team === 'red') redCount++;
    const course = lvl.asteroidCourse;
    const bg = this.scene.background instanceof THREE.Color ? this.scene.background.getHex() : -1;
    const asteroidSpawnedInSpace = Boolean(
      lvl.isAsteroidDash &&
        lvl.mode === 'asteroid_dash' &&
        s0 &&
        s0.active &&
        s0.courseGroup.parent === this.levelGroup &&
        s0.stars.parent === this.levelGroup &&
        bg === 0x060818 &&
        this.asteroidGates.filter((g) => g.cfg.kind === 'unit').length >= 6 &&
        this.asteroidGates.filter((g) => g.cfg.kind === 'shield').length >= 2 &&
        this.asteroidMeteors.length >= 3 &&
        this.asteroidBelts.length >= 3 &&
        this.asteroidWarpGroup !== null &&
        !this.bossGroup.visible &&
        !this.turretGroup.visible &&
        start === (course?.startBobos ?? -1) &&
        redCount === 0 &&
        course !== undefined &&
        course.timeLimitSec > course.length / course.baseSpeed &&
        course.length / course.baseSpeed >= 25 &&
        course.length / course.baseSpeed <= 35
    );
    stats.startBobos = start;
    stats.courseLength = course?.length ?? 0;
    stats.timeLimit = course?.timeLimitSec ?? 0;
    stats.paceSec = course ? Number((course.length / course.baseSpeed).toFixed(1)) : 0;
    stats.gates = this.asteroidGates.length;
    stats.meteors = this.asteroidMeteors.length;
    stats.belts = this.asteroidBelts.length;

    // 2. The squad cruises forward: the track scrolls toward the camera, Bobos float with a low-gravity bob
    let crowdFloatsAndCourseScrolls = false;
    if (s0) {
      const z0 = s0.courseGroup.position.z;
      const t0 = s0.timeLeft;
      let minRide = Infinity;
      let maxRide = 0;
      for (let i = 0; i < 40 && s0.active; i++) {
        this.turretX = this.getAsteroidAutopilotX();
        this.updateAsteroidDash(0.05);
        for (const u of this.units) {
          if (u.active && u.team === 'blue') {
            maxRide = Math.max(maxRide, u.rideY || 0);
            minRide = Math.min(minRide, u.rideY || 0);
          }
        }
      }
      crowdFloatsAndCourseScrolls =
        s0.distance > 6 && s0.courseGroup.position.z > z0 + 6 && s0.timeLeft < t0 && s0.speed > 3 && maxRide - minRide > 0.3 && minRide >= AST_FLOAT_BASE - 0.01;
      stats.distAfter2s = Number(s0.distance.toFixed(2));
      stats.floatSpan = Number((maxRide - minRide).toFixed(2));
    }

    // 3. Steering: the squad line follows the cannon aim and the Bobos follow (real simulateUnits)
    let crowdSteersAndBobosFollow = false;
    const s1 = loadAst();
    if (s1) {
      s1.baseSpeed = 2.0;
      this.turretX = 5.5;
      this.turretTargetX = 5.5;
      for (let i = 0; i < 30; i++) {
        this.updateAsteroidDash(0.05);
        this.simulateUnits(0.05);
      }
      let sumX = 0;
      let n = 0;
      for (const u of this.units) {
        if (u.active && u.team === 'blue') {
          sumX += u.x;
          n++;
        }
      }
      const avgX = n > 0 ? sumX / n : 0;
      crowdSteersAndBobosFollow = s1.x > 4.5 && avgX > 3.5 && n === start;
      stats.boboAvgX = Number(avgX.toFixed(2));
    }
    this.turretX = 0;
    this.turretTargetX = 0;

    // 4. Unit gate: the gate under the squad centre adds exactly +N Bobos; its pair resolves without triggering
    let unitGateAddsBobos = false;
    const s2 = loadAst();
    const addGate = this.asteroidGates.find((g) => g.cfg.kind === 'unit' && g.cfg.op === 'add');
    if (s2 && addGate) {
      s2.x = addGate.cfg.x;
      this.turretX = addGate.cfg.x;
      s2.baseSpeed = 0.0001;
      s2.speed = 0;
      skipBehind(addGate.cfg.d - AST_FRONT_OFFSET - 2.0);
      s2.distance = addGate.cfg.d - AST_FRONT_OFFSET - 0.4;
      this.snapAsteroidBobosToSlots();
      const before = bobos();
      this.updateAsteroidDash(0.016);
      const notYet = !addGate.resolved;
      s2.distance += 0.6;
      this.updateAsteroidDash(0.016);
      const after = bobos();
      const pair = this.asteroidGates.find((g) => g !== addGate && g.cfg.d === addGate.cfg.d);
      unitGateAddsBobos =
        notYet && addGate.resolved && addGate.triggered && after === before + addGate.cfg.value && this.asteroidGatesPassed === 1 &&
        Boolean(pair && pair.resolved && !pair.triggered);
      stats.gateAdded = after - before;
    }

    // 5. Shield-charge gate: the whole squad gets a timed energy shield with N hit charges
    let shieldGateChargesShield = false;
    const s3 = loadAst();
    const shieldGate = this.asteroidGates.find((g) => g.cfg.kind === 'shield');
    if (s3 && shieldGate) {
      walkTo(s3, shieldGate.cfg.d, shieldGate.cfg.x, 0.6, 1.6);
      shieldGateChargesShield =
        shieldGate.triggered &&
        s3.shieldTimer > 0 &&
        s3.shieldCharges === shieldGate.cfg.value &&
        s3.state === 'shielded' &&
        this.asteroidShieldGatesTaken === 1 &&
        s3.bubble.visible;
      stats.shieldCharges = s3.shieldCharges;
      stats.shieldSec = Number(s3.shieldSec.toFixed(1));
    }

    // 6. Asteroid strike: telegraphed (ring charges, rock falls slowly) long before it blasts, then knocks Bobos (capped)
    let meteorTelegraphedThenKnocks = false;
    const s4 = loadAst();
    const mt = this.asteroidMeteors[0];
    if (s4 && mt) {
      s4.baseSpeed = 0.0001;
      s4.speed = 0;
      s4.distance = mt.cfg.d - 20;
      s4.x = mt.cfg.x;
      this.turretX = mt.cfg.x;
      this.snapAsteroidBobosToSlots();
      this.updateAsteroidDash(0.05);
      const warned =
        mt.telegraphed && !mt.impacted && mt.fill.scale.x > 0.02 && mt.ringMat.opacity > 0 && mt.rock.visible && mt.rock.position.y > 3;
      const before = bobos();
      walkTo(s4, mt.cfg.d, mt.cfg.x, 2.4, 4);
      const lost = before - bobos();
      meteorTelegraphedThenKnocks =
        warned && mt.impacted && mt.crater.visible && lost >= 1 && lost <= mt.cfg.knockCap && mt.knocked === lost &&
        this.asteroidMeteorHits === 1 && s4.slowTimer > 0;
      stats.meteorKnocked = lost;
    }

    // 7. Shield absorbs hits: a strike and then a belt are blocked (one charge each), no Bobo lost
    let shieldAbsorbsHits = false;
    const s5 = loadAst();
    const mt2 = this.asteroidMeteors[0];
    const belt2 = this.asteroidBelts.find((b) => b.cfg.d > (mt2?.cfg.d ?? 0) + 6) || this.asteroidBelts[0];
    if (s5 && mt2 && belt2) {
      const before = bobos();
      s5.shieldTimer = 99;
      s5.shieldCharges = 3;
      walkTo(s5, mt2.cfg.d, mt2.cfg.x, 3.0, 4);
      const afterStrike = { blocked: mt2.blocked, knocked: mt2.knocked, charges: s5.shieldCharges };
      s5.shieldTimer = 99;
      const outX = THREE.MathUtils.clamp(
        belt2.cfg.gapX > 0 ? belt2.cfg.gapX - belt2.cfg.gapW * 0.5 - 3.2 : belt2.cfg.gapX + belt2.cfg.gapW * 0.5 + 3.2,
        -s5.maxSteerX,
        s5.maxSteerX
      );
      s5.x = outX;
      this.turretX = outX;
      skipBehind(belt2.cfg.d - 4);
      s5.distance = belt2.cfg.d - 4;
      this.snapAsteroidBobosToSlots();
      for (let i = 0; i < 80 && s5.active && s5.distance < belt2.cfg.d + 3.5; i++) {
        s5.distance += 0.12;
        this.updateAsteroidDash(0.016);
      }
      shieldAbsorbsHits =
        afterStrike.blocked &&
        afterStrike.knocked === 0 &&
        afterStrike.charges === 2 &&
        belt2.blocked &&
        belt2.knocked === 0 &&
        s5.shieldCharges === 1 &&
        this.asteroidShieldBlocks === 2 &&
        bobos() === before;
      stats.shieldBlocks = this.asteroidShieldBlocks;
    }

    // 8. Belt outside the gap: Bobos crossing the rock wall get knocked away; 9. inside the flagged gap all are safe
    let beltKnocksOutsideGap = false;
    let beltGapSafe = false;
    const s6 = loadAst();
    const bt = this.asteroidBelts[0];
    if (s6 && bt) {
      const outX = THREE.MathUtils.clamp(
        bt.cfg.gapX > 0 ? bt.cfg.gapX - bt.cfg.gapW * 0.5 - 3.2 : bt.cfg.gapX + bt.cfg.gapW * 0.5 + 3.2,
        -s6.maxSteerX,
        s6.maxSteerX
      );
      const before = bobos();
      walkTo(s6, bt.cfg.d, outX, 3.5, 4);
      const lost = before - bobos();
      beltKnocksOutsideGap = lost >= 1 && lost <= bt.cfg.knockCap && bt.knocked === lost && this.asteroidBeltHits === 1 && s6.slowTimer > 0;
      stats.beltKnocked = lost;
    }
    const s7 = loadAst();
    const bt2 = this.asteroidBelts[0];
    if (s7 && bt2) {
      const before = bobos();
      walkTo(s7, bt2.cfg.d, bt2.cfg.gapX, 3.5, 4);
      beltGapSafe = bobos() === before && bt2.knocked === 0 && this.asteroidBeltHits === 0 && bt2.passed && this.asteroidHazardsDodged >= 1;
      stats.gapSafeBobos = bobos();
    }

    // 10. Reaching the warp gate before the countdown ends wins the stage
    let warpExitWinsStage = false;
    const s8 = loadAst();
    if (s8) {
      s8.distance = s8.courseLength - 0.05;
      s8.speed = s8.baseSpeed;
      this.updateAsteroidDash(0.05);
      warpExitWinsStage = this.isStageEnded && this.lastStageVictory && s8.state === 'finished' && this.getAsteroidProgressPct() === 100;
    }

    // 11. Countdown runs out -> defeat
    let timeoutLosesStage = false;
    const s9 = loadAst();
    if (s9) {
      s9.timeLeft = 0.01;
      this.updateAsteroidDash(0.05);
      timeoutLosesStage = this.isStageEnded && !this.lastStageVictory && s9.state === 'timeout';
    }

    // 12. Every Bobo lost -> defeat
    let wipeoutLosesStage = false;
    const s10 = loadAst();
    if (s10) {
      for (const u of this.units) if (u.active && u.team === 'blue') this.knockAsteroidBobo(u, true);
      this.updateAsteroidDash(0.05);
      wipeoutLosesStage = this.isStageEnded && !this.lastStageVictory && s10.state === 'wiped';
    }

    // 13. Tier 1 is clearable in ~30 s by a careful line (autopilot through the real update + simulateUnits loop)
    let autopilotClearsTier1 = false;
    const s11 = loadAst();
    if (s11) {
      let steps = 0;
      while (s11.active && steps < 1200) {
        this.turretX = this.getAsteroidAutopilotX();
        this.turretTargetX = this.turretX;
        this.updateAsteroidDash(0.05);
        this.simulateUnits(0.05);
        steps++;
      }
      autopilotClearsTier1 =
        s11.state === 'finished' &&
        this.lastStageVictory &&
        this.asteroidFinishSec >= 24 &&
        this.asteroidFinishSec <= 36 &&
        this.asteroidBoboCount >= start &&
        this.asteroidGatesPassed >= 3;
      stats.autoFinishSec = this.asteroidFinishSec;
      stats.autoSurvivors = this.asteroidBoboCount;
      stats.autoGates = this.asteroidGatesPassed;
      stats.autoShields = this.asteroidShieldGatesTaken;
      stats.autoBlocks = this.asteroidShieldBlocks;
      stats.autoLost = this.asteroidBobosLost;
      stats.autoDodged = this.asteroidHazardsDodged;
    }
    this.turretX = 0;
    this.turretTargetX = 0;

    // 14. Tiers scale: faster pace, longer course, narrower belt gaps, bigger / stronger strikes, more strikes
    const t1 = generateAsteroidDashLevel(1);
    const t5 = generateAsteroidDashLevel(5);
    const tiersScale = Boolean(
      t1.asteroidCourse &&
        t5.asteroidCourse &&
        t5.asteroidCourse.baseSpeed > t1.asteroidCourse.baseSpeed &&
        t5.asteroidCourse.length > t1.asteroidCourse.length &&
        (t5.asteroidBelts?.[0]?.gapW ?? 99) < (t1.asteroidBelts?.[0]?.gapW ?? 0) &&
        (t5.asteroidMeteors?.[0]?.radius ?? 0) > (t1.asteroidMeteors?.[0]?.radius ?? 0) &&
        (t5.asteroidMeteors?.[0]?.knockCap ?? 0) > (t1.asteroidMeteors?.[0]?.knockCap ?? 0) &&
        (t5.asteroidMeteors?.length ?? 0) > (t1.asteroidMeteors?.length ?? 0) &&
        st.getAsteroidDashSpec(0).asteroidTier === 1 &&
        st.getAsteroidDashSpec(3).asteroidTier === 4 &&
        st.getAsteroidDashSpec(99).asteroidTier === 8
    );

    // 15. Settlement: 星尘徽章 scale with finish time + survivors and persist with a milestone
    st.stardustBadges = 0;
    st.lifetimeStardustBadges = 0;
    st.asteroidDashClears = 0;
    st.bestAsteroidFinishSec = 0;
    const slowRec = st.recordAsteroidDashResult(true, 38, 40, 10, 8, 1, 100);
    const slowBadges = slowRec.badgesAwarded;
    st.stardustBadges = 0;
    st.lifetimeStardustBadges = 0;
    st.asteroidDashClears = 0;
    st.bestAsteroidFinishSec = 0;
    const baseMs = st.getStardustMilestoneBonus(0);
    const fastRec = st.recordAsteroidDashResult(true, 26, 40, 48, 6, 3, 100);
    const lossRec = st.recordAsteroidDashResult(false, 40, 40, 12, 20, 0, 55);
    const saved = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}') as {
      stardustBadges?: number;
      asteroidDashClears?: number;
      bestAsteroidFinishSec?: number;
    };
    const boostedMs = st.getStardustMilestoneBonus();
    const badgesScaleWithTimeAndSurvivors =
      fastRec.badgesAwarded > slowBadges &&
      fastRec.timeBonusBadges === 2 &&
      fastRec.survivorBonusBadges === 3 &&
      slowRec.timeBonusBadges === 0 &&
      lossRec.badgesAwarded === 1 &&
      !lossRec.victory;
    const badgesPersistedWithMilestone =
      fastRec.milestoneReached &&
      fastRec.milestoneBonusCoins > 0 &&
      saved.stardustBadges === st.stardustBadges &&
      st.stardustBadges === fastRec.badgesAwarded + lossRec.badgesAwarded &&
      saved.asteroidDashClears === 1 &&
      saved.bestAsteroidFinishSec === 26 &&
      boostedMs.fireRateMult > baseMs.fireRateMult &&
      boostedMs.asteroidBonusBobos > 0 &&
      boostedMs.shieldBonusSec > 0;
    stats.fastBadges = fastRec.badgesAwarded;
    stats.slowBadges = slowBadges;

    // 16. Trophy hall: the 星尘徽章奖杯 reads the existing lifetime counter (no duplicated copy) and buffs fire rate
    st.stardustBadges = 2;
    st.lifetimeStardustBadges = 9;
    const metricOk = st.getHallTrophyMetric('stardust_badge') === 9 && st.getHallTrophyTier('stardust_badge') === 2;
    st.trophyHallSlots = 1;
    st.trophyDisplay = [null, null, null, null, null, null];
    const fireNoTrophy = st.getFireRatePerSec();
    const placedTrophy = st.placeTrophy(0, 'stardust_badge');
    const fireWithTrophy = st.getFireRatePerSec();
    const stardustTrophyReadsCounter =
      metricOk &&
      placedTrophy &&
      Math.abs(st.getHallTrophyBuff('fire') - 0.03) < 1e-9 &&
      fireWithTrophy > fireNoTrophy * 1.025 &&
      HALL_TROPHY_ORDER.includes('stardust_badge');

    // 17. Decor themes: buy with coins / mode currency (refused when short), auto-apply, re-apply owned, persist
    st.gold = 5000;
    st.stardustBadges = 6;
    st.lifetimeStardustBadges = 6;
    st.iceMedals = 0;
    st.lifetimeIceMedals = 0;
    st.ownedDecorThemes = ['navy_classic'];
    st.activeDecorTheme = 'navy_classic';
    st.ownedDecorProps = [];
    st.decorSlots = [null, null, null, null];
    const buyPink = st.buyDecorTheme('candy_pink');
    const goldAfterPink = st.gold;
    const buyIceShort = st.buyDecorTheme('glacier_aurora');
    const buyStar = st.buyDecorTheme('starlight_dome');
    const starAfter = st.stardustBadges;
    const lifeAfter = st.lifetimeStardustBadges;
    const reapply = st.applyDecorTheme('candy_pink');
    const applyUnowned = st.applyDecorTheme('glacier_aurora');
    const savedTheme = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}') as {
      activeDecorTheme?: string;
      ownedDecorThemes?: string[];
    };
    const decorThemeBuyApplyPersist =
      buyPink.ok &&
      buyPink.spentCurrency === 'gold' &&
      goldAfterPink === 5000 - DECOR_THEMES.candy_pink.cost &&
      !buyIceShort.ok &&
      buyIceShort.reason.includes('冰晶奖章') &&
      buyStar.ok &&
      buyStar.spentCurrency === 'stardust' &&
      starAfter === 6 - DECOR_THEMES.starlight_dome.cost &&
      lifeAfter === 6 &&
      reapply &&
      !applyUnowned &&
      (st.activeDecorTheme as DecorThemeId) === 'candy_pink' &&
      savedTheme.activeDecorTheme === 'candy_pink' &&
      (savedTheme.ownedDecorThemes || []).length === 3;

    // 18. Decor props: buy -> auto-placed in the first free corner, refuse when short / unowned, move, remove, persist
    st.gold = 5000;
    st.stardustBadges = 1;
    const buyLamp = st.buyDecorProp('star_lamp');
    const buyPlant = st.buyDecorProp('jelly_plant');
    const globeShort = st.buyDecorProp('stardust_globe');
    st.stardustBadges = 3;
    const buyGlobe = st.buyDecorProp('stardust_globe');
    const movePlant = st.placeDecorProp(3, 'jelly_plant');
    const placeUnowned = st.placeDecorProp(1, 'squad_banner');
    const removeLamp = st.placeDecorProp(0, null);
    const savedProps = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}') as {
      ownedDecorProps?: string[];
      decorSlots?: Array<string | null>;
    };
    const decorPropBuyPlacePersist =
      buyLamp.ok &&
      buyLamp.placedSlot === 0 &&
      buyPlant.ok &&
      buyPlant.placedSlot === 1 &&
      !globeShort.ok &&
      buyGlobe.ok &&
      buyGlobe.placedSlot === 2 &&
      movePlant &&
      !placeUnowned &&
      removeLamp &&
      st.decorSlots.join(',') === ',,stardust_globe,jelly_plant' &&
      (savedProps.ownedDecorProps || []).length === 3 &&
      JSON.stringify(savedProps.decorSlots) === JSON.stringify([null, null, 'stardust_globe', 'jelly_plant']);

    // 19. Comfort bonus: theme + placed props, +0.5% coins per point, capped at +3%
    const comfortMid = st.getDecorComfort();
    const lootWith = st.getLootMultiplier();
    const keepSlots = [...st.decorSlots];
    const keepTheme = st.activeDecorTheme;
    st.decorSlots = [null, null, null, null];
    st.activeDecorTheme = 'navy_classic';
    const lootNone = st.getLootMultiplier();
    const comfortNone = st.getDecorComfort();
    st.ownedDecorProps = ['star_lamp', 'jelly_plant', 'squad_banner', 'stardust_globe'];
    st.decorSlots = ['star_lamp', 'jelly_plant', 'squad_banner', 'stardust_globe'];
    st.activeDecorTheme = 'starlight_dome';
    const comfortMax = st.getDecorComfort();
    const multMax = st.getDecorGoldMult();
    const decorBonusTinyCapped =
      comfortMid === 4 &&
      comfortNone === 0 &&
      Math.abs(lootWith / lootNone - 1.02) < 1e-6 &&
      comfortMax === 8 &&
      Math.abs(multMax - (1 + DECOR_COMFORT_GOLD_CAP)) < 1e-9;
    stats.decorComfortMax = comfortMax;
    st.decorSlots = keepSlots;
    st.activeDecorTheme = keepTheme;
    st.ownedDecorProps = ['star_lamp', 'jelly_plant', 'stardust_globe'];

    // 20. The lobby 3D room repaints wall / floor / pedestal velvet for the theme and shows exactly the placed props
    let decorTintsPedestal3D = true;
    if (this.trophyPedestal) {
      const res = this.syncLobbyDecor3D(true);
      const snapA = this.getLobbyDecorSnapshot();
      const th = DECOR_THEMES[st.activeDecorTheme];
      const hex = (h: number): string => new THREE.Color(h).getHexString();
      st.activeDecorTheme = 'navy_classic';
      this.syncLobbyDecor3D(true);
      const snapB = this.getLobbyDecorSnapshot();
      decorTintsPedestal3D =
        res.props === 2 &&
        snapA.themeId === 'candy_pink' &&
        snapA.wallHex === hex(th.wallHex) &&
        snapA.velvetHex === hex(th.velvetHex) &&
        snapA.props.join(',') === 'stardust_globe,jelly_plant' &&
        snapA.propSlots.join(',') === '2,3' &&
        snapB.wallHex === hex(DECOR_THEMES.navy_classic.wallHex) &&
        snapB.velvetHex !== snapA.velvetHex;
      stats.pedestalProps = res.props;
    } else {
      stats.pedestalProps = -1;
    }

    // Restore the original state cleanly
    st.gold = snap.gold;
    st.stardustBadges = snap.stardustBadges;
    st.lifetimeStardustBadges = snap.lifetimeStardustBadges;
    st.asteroidDashClears = snap.asteroidDashClears;
    st.bestAsteroidFinishSec = snap.bestAsteroidFinishSec;
    st.bestAsteroidSurvivors = snap.bestAsteroidSurvivors;
    st.totalAsteroidShieldBlocks = snap.totalAsteroidShieldBlocks;
    st.totalAsteroidBobosLost = snap.totalAsteroidBobosLost;
    st.ownedDecorThemes = snap.ownedDecorThemes;
    st.activeDecorTheme = snap.activeDecorTheme;
    st.ownedDecorProps = snap.ownedDecorProps;
    st.decorSlots = snap.decorSlots;
    st.lavaCores = snap.lavaCores;
    st.lifetimeLavaCores = snap.lifetimeLavaCores;
    st.iceMedals = snap.iceMedals;
    st.lifetimeIceMedals = snap.lifetimeIceMedals;
    st.trophyHallSlots = snap.trophyHallSlots;
    st.trophyDisplay = snap.trophyDisplay;
    st.save();
    this.syncTrophyPedestal3D(true);
    this.syncLobbyDecor3D(true);
    this.turretX = prevTurretX;
    this.turretTargetX = prevTurretTargetX;
    this.onStageEnd = prevOnStageEnd;
    this.onBanner = prevOnBanner;
    if (prevLevel) {
      this.loadLevel(prevLevel);
    }
    this.isPaused = prevPaused;

    const ok =
      asteroidSpawnedInSpace &&
      crowdFloatsAndCourseScrolls &&
      crowdSteersAndBobosFollow &&
      unitGateAddsBobos &&
      shieldGateChargesShield &&
      meteorTelegraphedThenKnocks &&
      shieldAbsorbsHits &&
      beltKnocksOutsideGap &&
      beltGapSafe &&
      warpExitWinsStage &&
      timeoutLosesStage &&
      wipeoutLosesStage &&
      autopilotClearsTier1 &&
      tiersScale &&
      badgesScaleWithTimeAndSurvivors &&
      badgesPersistedWithMilestone &&
      stardustTrophyReadsCounter &&
      decorThemeBuyApplyPersist &&
      decorPropBuyPlacePersist &&
      decorBonusTinyCapped &&
      decorTintsPedestal3D;
    return {
      ok,
      asteroidSpawnedInSpace,
      crowdFloatsAndCourseScrolls,
      crowdSteersAndBobosFollow,
      unitGateAddsBobos,
      shieldGateChargesShield,
      meteorTelegraphedThenKnocks,
      shieldAbsorbsHits,
      beltKnocksOutsideGap,
      beltGapSafe,
      warpExitWinsStage,
      timeoutLosesStage,
      wipeoutLosesStage,
      autopilotClearsTier1,
      tiersScale,
      badgesScaleWithTimeAndSurvivors,
      badgesPersistedWithMilestone,
      stardustTrophyReadsCounter,
      decorThemeBuyApplyPersist,
      decorPropBuyPlacePersist,
      decorBonusTinyCapped,
      decorTintsPedestal3D,
      stats,
    };
  }

  public runMc15SelfCheck(): {
    ok: boolean;
    pumpkinSpawnedAtNight: boolean;
    crowdMarchesAndCourseScrolls: boolean;
    crowdSteersAndBobosFollow: boolean;
    unitGateAddsBobos: boolean;
    lampZoneRefillsLight: boolean;
    ghostPhasesThroughWallThenScares: boolean;
    lanternDispelsGhost: boolean;
    lampZoneDispelsHauntGhost: boolean;
    shieldAbsorbsGhostTouch: boolean;
    wallKnocksOutsideArch: boolean;
    archDoorSafe: boolean;
    darknessSlowsPace: boolean;
    exitGateWinsStage: boolean;
    timeoutLosesStage: boolean;
    wipeoutLosesStage: boolean;
    autopilotClearsTier1: boolean;
    tiersScale: boolean;
    badgesScaleWithTimeSurvivorsAndDispels: boolean;
    badgesPersistedWithMilestone: boolean;
    pumpkinTrophyReadsCounter: boolean;
    tacticBuyEquipPersist: boolean;
    tacticStartCardsFireInBattle: boolean;
    tacticConditionCardsFireOnce: boolean;
    tacticEffectsCapped: boolean;
    tacticRushSpeedsUpSquad: boolean;
    stats: Record<string, number>;
  } {
    const st = this.state;
    const prevPaused = this.isPaused;
    const prevLevel = this.currentLevel;
    const prevOnStageEnd = this.onStageEnd;
    const prevOnBanner = this.onBanner;
    const prevOnTactic = this.onTacticTrigger;
    const prevTurretX = this.turretX;
    const prevTurretTargetX = this.turretTargetX;
    const snap = {
      gold: st.gold,
      pumpkinBadges: st.pumpkinBadges,
      lifetimePumpkinBadges: st.lifetimePumpkinBadges,
      pumpkinNightClears: st.pumpkinNightClears,
      bestPumpkinFinishSec: st.bestPumpkinFinishSec,
      bestPumpkinSurvivors: st.bestPumpkinSurvivors,
      totalPumpkinGhostsDispelled: st.totalPumpkinGhostsDispelled,
      totalPumpkinBobosLost: st.totalPumpkinBobosLost,
      ownedTacticCards: [...st.ownedTacticCards],
      tacticDeck: [...st.tacticDeck],
      totalTacticTriggers: st.totalTacticTriggers,
      stardustBadges: st.stardustBadges,
      lifetimeStardustBadges: st.lifetimeStardustBadges,
      iceMedals: st.iceMedals,
      lifetimeIceMedals: st.lifetimeIceMedals,
      trophyHallSlots: st.trophyHallSlots,
      trophyDisplay: [...st.trophyDisplay],
    };
    const stats: Record<string, number> = {};
    this.isPaused = true;
    this.onStageEnd = undefined;
    this.onBanner = undefined;
    this.onTacticTrigger = undefined;
    // MC-16: these checks verify the raw card mechanics at full (lobby-mode ×1.0) strength, also in campaign stages;
    // the main-campaign coefficient / switch is verified by runMc16SelfCheck
    this.tacticProfileOverride = { ...st.getTacticEffectProfile(false), label: 'MC-15 self-check ×1.0' };
    // Tactic cards stay out of the pumpkin-run checks (an equipped deck must not change the deterministic numbers)
    st.tacticDeck = [null, null, null];
    const bobos = (): number => this.getLavaBoboCount();
    const clearShields = (): void => {
      for (const u of this.units) {
        if (u.active) {
          u.frostShield = false;
          u.petShellGranted = false;
        }
      }
    };
    const loadPk = (tier = 1): PumpkinRunRuntime | null => {
      this.loadLevel(generatePumpkinNightLevel(tier));
      for (const u of this.units) if (u.active && u.team === 'red') u.active = false;
      clearShields();
      this.snapPumpkinBobosToSlots();
      return this.pumpkinRun;
    };
    /** Marks every course item behind `dist` as already handled (so jumping the distance never re-triggers them). */
    const skipBehind = (dist: number): void => {
      for (const g of this.pumpkinGates) if (g.cfg.d < dist + PK_FRONT_OFFSET + 0.5) g.resolved = true;
      for (const gh of this.pumpkinGhosts) {
        if (gh.cfg.d < dist - 1) {
          gh.done = true;
          gh.group.visible = false;
        }
      }
      for (const w of this.pumpkinWalls) if (w.cfg.d < dist - 1) w.passed = true;
      for (const lp of this.pumpkinLamps) if (lp.cfg.d < dist - 4) lp.passed = true;
    };
    /** Holds the squad line at x and walks the course from `d - back` to `d + extra` in small manual steps. */
    const walkTo = (s: PumpkinRunRuntime, d: number, x: number, extra: number, back = 6, light?: number): void => {
      skipBehind(d - back);
      s.x = x;
      this.turretX = x;
      this.turretTargetX = x;
      s.baseSpeed = 0.0001;
      s.speed = 0;
      s.distance = d - back;
      if (typeof light === 'number') s.light = light;
      this.snapPumpkinBobosToSlots();
      clearShields();
      for (let i = 0; i < 200 && s.active && s.distance < d + extra; i++) {
        s.distance += 0.12;
        this.updatePumpkinNight(0.016);
      }
    };
    const plainGhost = (): PumpkinGhostRuntime | undefined =>
      this.pumpkinGhosts.find((g) => g.cfg.id.startsWith('pk_s') && !this.findPumpkinLampAt(g.cfg.crossX, g.cfg.d, -3));

    // Freeze milestone bonuses so Bobo counts / light capacity are deterministic
    st.pumpkinBadges = 0;
    st.lifetimePumpkinBadges = 0;

    // 1. Load the pumpkin night -> night tint over the royal-castle base, castle floor, gates, lamps, ghosts, walls, exit
    const lvl = generatePumpkinNightLevel(1);
    const s0 = loadPk();
    const start = bobos();
    let redCount = 0;
    for (const u of this.units) if (u.active && u.team === 'red') redCount++;
    const course = lvl.pumpkinCourse;
    const bg = this.scene.background instanceof THREE.Color ? this.scene.background.getHex() : -1;
    const pumpkinSpawnedAtNight = Boolean(
      lvl.isPumpkinNight &&
        lvl.mode === 'pumpkin_night' &&
        lvl.themeId !== 'cyberhive' &&
        this.currentTheme.id === lvl.themeId &&
        s0 &&
        s0.active &&
        s0.courseGroup.parent === this.levelGroup &&
        s0.moon.parent === this.levelGroup &&
        bg === PK_NIGHT_SKY &&
        this.pumpkinGates.length >= 6 &&
        this.pumpkinLamps.length >= 3 &&
        this.pumpkinGhosts.length >= 4 &&
        this.pumpkinWalls.length >= 3 &&
        this.pumpkinGhosts.some((g) => g.cfg.id.startsWith('pk_h')) &&
        this.pumpkinExitGroup !== null &&
        !this.bossGroup.visible &&
        !this.turretGroup.visible &&
        start === (course?.startBobos ?? -1) &&
        redCount === 0 &&
        course !== undefined &&
        s0.light === course.lightMax &&
        course.timeLimitSec > course.length / course.baseSpeed &&
        course.length / course.baseSpeed >= 25 &&
        course.length / course.baseSpeed <= 35
    );
    stats.startBobos = start;
    stats.courseLength = course?.length ?? 0;
    stats.timeLimit = course?.timeLimitSec ?? 0;
    stats.paceSec = course ? Number((course.length / course.baseSpeed).toFixed(1)) : 0;
    stats.gates = this.pumpkinGates.length;
    stats.lamps = this.pumpkinLamps.length;
    stats.ghosts = this.pumpkinGhosts.length;
    stats.walls = this.pumpkinWalls.length;

    // 2. The squad marches forward: the castle scrolls toward the camera, the lantern light drains, Bobos hop
    let crowdMarchesAndCourseScrolls = false;
    if (s0) {
      const z0 = s0.courseGroup.position.z;
      const t0 = s0.timeLeft;
      const l0 = s0.light;
      let minRide = Infinity;
      let maxRide = 0;
      for (let i = 0; i < 40 && s0.active; i++) {
        this.turretX = this.getPumpkinAutopilotX();
        this.updatePumpkinNight(0.05);
        for (const u of this.units) {
          if (u.active && u.team === 'blue') {
            maxRide = Math.max(maxRide, u.rideY || 0);
            minRide = Math.min(minRide, u.rideY || 0);
          }
        }
      }
      crowdMarchesAndCourseScrolls =
        s0.distance > 6 && s0.courseGroup.position.z > z0 + 6 && s0.timeLeft < t0 && s0.speed > 3 && s0.light < l0 && maxRide - minRide > 0.05;
      stats.distAfter2s = Number(s0.distance.toFixed(2));
      stats.lightAfter2s = Number(s0.light.toFixed(1));
    }

    // 3. Steering: the squad line follows the cannon aim and the Bobos follow (real simulateUnits)
    let crowdSteersAndBobosFollow = false;
    const s1 = loadPk();
    if (s1) {
      s1.baseSpeed = 2.0;
      this.turretX = 5.5;
      this.turretTargetX = 5.5;
      for (let i = 0; i < 30; i++) {
        this.updatePumpkinNight(0.05);
        this.simulateUnits(0.05);
      }
      let sumX = 0;
      let n = 0;
      for (const u of this.units) {
        if (u.active && u.team === 'blue') {
          sumX += u.x;
          n++;
        }
      }
      const avgX = n > 0 ? sumX / n : 0;
      crowdSteersAndBobosFollow = s1.x > 4.5 && avgX > 3.5 && n === start;
      stats.boboAvgX = Number(avgX.toFixed(2));
    }
    this.turretX = 0;
    this.turretTargetX = 0;

    // 4. Unit gate: the gate under the squad centre adds exactly +N Bobos; its pair resolves without triggering
    let unitGateAddsBobos = false;
    const s2 = loadPk();
    const addGate = this.pumpkinGates.find((g) => g.cfg.op === 'add');
    if (s2 && addGate) {
      s2.x = addGate.cfg.x;
      this.turretX = addGate.cfg.x;
      s2.baseSpeed = 0.0001;
      s2.speed = 0;
      skipBehind(addGate.cfg.d - PK_FRONT_OFFSET - 2.0);
      s2.distance = addGate.cfg.d - PK_FRONT_OFFSET - 0.4;
      this.snapPumpkinBobosToSlots();
      const before = bobos();
      this.updatePumpkinNight(0.016);
      const notYet = !addGate.resolved;
      s2.distance += 0.6;
      this.updatePumpkinNight(0.016);
      const after = bobos();
      const pair = this.pumpkinGates.find((g) => g !== addGate && g.cfg.d === addGate.cfg.d);
      unitGateAddsBobos =
        notYet && addGate.resolved && addGate.triggered && after === before + addGate.cfg.value && this.pumpkinGatesPassed === 1 &&
        Boolean(pair && pair.resolved && !pair.triggered);
      stats.gateAdded = after - before;
    }

    // 5. Lit zone: stepping into the pumpkin-lantern light refills the lantern (and flags the zone as visited)
    let lampZoneRefillsLight = false;
    const s3 = loadPk();
    const lamp0 = this.pumpkinLamps.find((lp) => !this.pumpkinGhosts.some((g) => Math.abs(g.cfg.d - lp.cfg.d) < lp.cfg.radius + 2));
    if (s3 && lamp0) {
      let sawLit = false;
      skipBehind(lamp0.cfg.d - lamp0.cfg.radius - 3);
      s3.x = lamp0.cfg.x;
      this.turretX = lamp0.cfg.x;
      s3.baseSpeed = 0.0001;
      s3.speed = 0;
      s3.distance = lamp0.cfg.d - PK_FRONT_OFFSET - lamp0.cfg.radius - 1.0;
      s3.light = 20;
      this.snapPumpkinBobosToSlots();
      this.updatePumpkinNight(0.05);
      const outsideLight = s3.light;
      const outsideState = s3.state;
      for (let i = 0; i < 80 && s3.active && s3.distance + PK_FRONT_OFFSET < lamp0.cfg.d; i++) {
        s3.distance += 0.1;
        this.updatePumpkinNight(0.05);
        if (s3.state === 'lit') sawLit = true;
      }
      lampZoneRefillsLight =
        outsideLight < 20 && outsideState === 'marching' && sawLit && s3.light >= 90 && lamp0.visited && this.pumpkinLampsLit === 1;
      stats.lampLight = Number(s3.light.toFixed(1));
    }

    // 6. Ghost: hidden inside the side wall while far away, phases out through the wall, then (lantern out) scares Bobos
    let ghostPhasesThroughWallThenScares = false;
    const s4 = loadPk();
    const g4 = plainGhost();
    if (s4 && g4) {
      skipBehind(g4.cfg.d - 30);
      s4.baseSpeed = 0.0001;
      s4.speed = 0;
      s4.x = g4.cfg.crossX;
      this.turretX = g4.cfg.crossX;
      s4.light = 0;
      s4.distance = g4.cfg.d - PK_FRONT_OFFSET - 31;
      this.snapPumpkinBobosToSlots();
      this.updatePumpkinNight(0.016);
      const hiddenInWall = !g4.emerged && Math.abs(g4.x) > TRACK_HALF_W + 0.8;
      s4.distance = g4.cfg.d - PK_FRONT_OFFSET - 9;
      this.updatePumpkinNight(0.016);
      const emerged = g4.emerged && g4.group.visible && Math.abs(g4.x) < TRACK_HALF_W + 0.8;
      const before = bobos();
      walkTo(s4, g4.cfg.d, g4.cfg.crossX, 1.5, 4, 0);
      const lost = before - bobos();
      ghostPhasesThroughWallThenScares =
        hiddenInWall && emerged && g4.outcome === 'scared' && lost >= 1 && lost <= g4.cfg.knockCap && g4.knocked === lost &&
        this.pumpkinGhostHits === 1 && s4.slowTimer > 0;
      stats.ghostScared = lost;
    }

    // 7. The squad lantern (enough light) dispels a ghost on touch: no Bobo lost, light spent
    let lanternDispelsGhost = false;
    const s5 = loadPk();
    const g5 = plainGhost();
    if (s5 && g5) {
      const before = bobos();
      walkTo(s5, g5.cfg.d, g5.cfg.crossX, 3.0, 4, s5.lightMax);
      lanternDispelsGhost =
        g5.outcome === 'dispelled' && bobos() === before && this.pumpkinGhostsDispelled === 1 && this.pumpkinGhostHits === 0 &&
        s5.light <= s5.lightMax - s5.ghostLightCost && s5.light > 0;
      stats.lightAfterDispel = Number(s5.light.toFixed(1));
    }

    // 8. Haunt row: with the lantern out, standing in the lit zone the ghost converges on still dispels it for free
    let lampZoneDispelsHauntGhost = false;
    const s6 = loadPk();
    const g6 = this.pumpkinGhosts.find((g) => g.cfg.id.startsWith('pk_h'));
    const lamp6 = g6 ? this.pumpkinLamps.find((lp) => Math.abs(lp.cfg.d - g6.cfg.d) < 1.0) : undefined;
    if (s6 && g6 && lamp6) {
      const before = bobos();
      walkTo(s6, g6.cfg.d, lamp6.cfg.x, 3.0, 5, 0);
      lampZoneDispelsHauntGhost =
        g6.outcome === 'lamp' && bobos() === before && this.pumpkinLampDispels === 1 && this.pumpkinGhostHits === 0 && lamp6.visited;
    }

    // 9. A candy (frost) shield absorbs one ghost touch per Bobo (tactic shield cards / pet shells stay useful)
    let shieldAbsorbsGhostTouch = false;
    const s7 = loadPk();
    const g7 = plainGhost();
    if (s7 && g7) {
      skipBehind(g7.cfg.d - 4);
      s7.baseSpeed = 0.0001;
      s7.speed = 0;
      s7.x = g7.cfg.crossX;
      this.turretX = g7.cfg.crossX;
      s7.distance = g7.cfg.d - 4;
      s7.light = 0;
      this.snapPumpkinBobosToSlots();
      for (const u of this.units) if (u.active && u.team === 'blue') u.frostShield = true;
      const before = bobos();
      for (let i = 0; i < 200 && s7.active && s7.distance < g7.cfg.d + 3; i++) {
        s7.distance += 0.12;
        this.updatePumpkinNight(0.016);
      }
      let shieldsLeft = 0;
      for (const u of this.units) if (u.active && u.team === 'blue' && u.frostShield) shieldsLeft++;
      shieldAbsorbsGhostTouch = g7.outcome === 'scared' && bobos() === before && g7.knocked === 0 && g7.touched.size >= 1 && shieldsLeft < before;
      stats.shieldTouches = g7.touched.size;
    }

    // 10. Inner wall outside the archway: Bobos bump into the stones; 11. inside the archway everyone is safe
    let wallKnocksOutsideArch = false;
    let archDoorSafe = false;
    const s8 = loadPk();
    const w8 = this.pumpkinWalls[0];
    if (s8 && w8) {
      const outX = THREE.MathUtils.clamp(
        w8.cfg.doorX > 0 ? w8.cfg.doorX - w8.cfg.doorW * 0.5 - 3.2 : w8.cfg.doorX + w8.cfg.doorW * 0.5 + 3.2,
        -s8.maxSteerX,
        s8.maxSteerX
      );
      const before = bobos();
      walkTo(s8, w8.cfg.d, outX, 3.5, 4);
      const lost = before - bobos();
      wallKnocksOutsideArch = lost >= 1 && lost <= w8.cfg.knockCap && w8.knocked === lost && this.pumpkinWallHits === 1 && s8.slowTimer > 0;
      stats.wallKnocked = lost;
    }
    const s9 = loadPk();
    const w9 = this.pumpkinWalls[0];
    if (s9 && w9) {
      const before = bobos();
      walkTo(s9, w9.cfg.d, w9.cfg.doorX, 3.5, 4);
      archDoorSafe = bobos() === before && w9.knocked === 0 && this.pumpkinWallHits === 0 && w9.passed && this.pumpkinHazardsDodged >= 1;
    }

    // 12. Lantern out -> the squad gropes through the dark (slower pace than with the lantern lit)
    let darknessSlowsPace = false;
    const sA = loadPk();
    if (sA) {
      this.turretX = -sA.maxSteerX;
      for (let i = 0; i < 30; i++) this.updatePumpkinNight(0.05);
      const litSpeed = sA.speed;
      const sB = loadPk();
      if (sB) {
        this.turretX = -sB.maxSteerX;
        sB.light = 0;
        sB.lightDecayPerSec = 9999;
        let darkState = false;
        for (let i = 0; i < 30; i++) {
          this.updatePumpkinNight(0.05);
          if (sB.state === 'dark') darkState = true;
        }
        darknessSlowsPace = darkState && sB.speed < litSpeed * 0.8 && sB.darkSec > 1 && litSpeed > sB.baseSpeed * 0.85;
        stats.litSpeed = Number(litSpeed.toFixed(2));
        stats.darkSpeed = Number(sB.speed.toFixed(2));
      }
    }
    this.turretX = 0;

    // 13. Reaching the castle gate before the countdown ends wins; 14. timeout; 15. wipeout
    let exitGateWinsStage = false;
    const sC = loadPk();
    if (sC) {
      sC.distance = sC.courseLength - 0.05;
      sC.speed = sC.baseSpeed;
      this.updatePumpkinNight(0.05);
      exitGateWinsStage = this.isStageEnded && this.lastStageVictory && sC.state === 'finished' && this.getPumpkinProgressPct() === 100;
    }
    let timeoutLosesStage = false;
    const sD = loadPk();
    if (sD) {
      sD.timeLeft = 0.01;
      this.updatePumpkinNight(0.05);
      timeoutLosesStage = this.isStageEnded && !this.lastStageVictory && sD.state === 'timeout';
    }
    let wipeoutLosesStage = false;
    const sE = loadPk();
    if (sE) {
      for (const u of this.units) if (u.active && u.team === 'blue') this.knockPumpkinBobo(u, true);
      this.updatePumpkinNight(0.05);
      wipeoutLosesStage = this.isStageEnded && !this.lastStageVictory && sE.state === 'wiped';
    }

    // 16. Tier 1 is clearable in ~30 s by a careful line (autopilot through the real update + simulateUnits loop)
    let autopilotClearsTier1 = false;
    const sF = loadPk();
    if (sF) {
      let steps = 0;
      while (sF.active && steps < 1200) {
        this.turretX = this.getPumpkinAutopilotX();
        this.turretTargetX = this.turretX;
        this.updatePumpkinNight(0.05);
        this.simulateUnits(0.05);
        steps++;
      }
      autopilotClearsTier1 =
        sF.state === 'finished' &&
        this.lastStageVictory &&
        this.pumpkinFinishSec >= 24 &&
        this.pumpkinFinishSec <= 36 &&
        this.pumpkinBoboCount >= start &&
        this.pumpkinGatesPassed >= 3 &&
        this.pumpkinLampsLit >= 1;
      stats.autoFinishSec = this.pumpkinFinishSec;
      stats.autoSurvivors = this.pumpkinBoboCount;
      stats.autoGates = this.pumpkinGatesPassed;
      stats.autoLamps = this.pumpkinLampsLit;
      stats.autoDispelled = this.pumpkinGhostsDispelled;
      stats.autoDodged = this.pumpkinHazardsDodged;
      stats.autoLost = this.pumpkinBobosLost;
      stats.autoDarkSec = Number(sF.darkSec.toFixed(1));
    }
    this.turretX = 0;
    this.turretTargetX = 0;

    // 17. Tiers scale: faster pace, longer course, narrower archways, bigger / stronger / faster ghosts, more ghosts,
    //     smaller lit zones and a faster-draining lantern
    const t1 = generatePumpkinNightLevel(1);
    const t5 = generatePumpkinNightLevel(5);
    const tiersScale = Boolean(
      t1.pumpkinCourse &&
        t5.pumpkinCourse &&
        t5.pumpkinCourse.baseSpeed > t1.pumpkinCourse.baseSpeed &&
        t5.pumpkinCourse.length > t1.pumpkinCourse.length &&
        t5.pumpkinCourse.lightDecayPerSec > t1.pumpkinCourse.lightDecayPerSec &&
        (t5.pumpkinWalls?.[0]?.doorW ?? 99) < (t1.pumpkinWalls?.[0]?.doorW ?? 0) &&
        (t5.pumpkinGhosts?.[0]?.radius ?? 0) > (t1.pumpkinGhosts?.[0]?.radius ?? 0) &&
        (t5.pumpkinGhosts?.[0]?.sweep ?? 0) > (t1.pumpkinGhosts?.[0]?.sweep ?? 0) &&
        (t5.pumpkinGhosts?.[0]?.knockCap ?? 0) > (t1.pumpkinGhosts?.[0]?.knockCap ?? 0) &&
        (t5.pumpkinGhosts?.length ?? 0) > (t1.pumpkinGhosts?.length ?? 0) &&
        (t5.pumpkinLamps?.[0]?.radius ?? 99) < (t1.pumpkinLamps?.[0]?.radius ?? 0) &&
        st.getPumpkinNightSpec(0).pumpkinTier === 1 &&
        st.getPumpkinNightSpec(3).pumpkinTier === 4 &&
        st.getPumpkinNightSpec(99).pumpkinTier === 8
    );

    // 18. Settlement: 南瓜灯徽章 scale with finish time + survivors + dispels and persist with a milestone
    const resetPk = (): void => {
      st.pumpkinBadges = 0;
      st.lifetimePumpkinBadges = 0;
      st.pumpkinNightClears = 0;
      st.bestPumpkinFinishSec = 0;
    };
    resetPk();
    const slowRec = st.recordPumpkinNightResult(true, 38, 41, 10, 8, 0, 100);
    resetPk();
    const baseMs = st.getPumpkinMilestoneBonus(0);
    const fastRec = st.recordPumpkinNightResult(true, 26, 41, 48, 6, 6, 100);
    const lossRec = st.recordPumpkinNightResult(false, 41, 41, 12, 20, 1, 55);
    const saved = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}') as {
      pumpkinBadges?: number;
      pumpkinNightClears?: number;
      bestPumpkinFinishSec?: number;
    };
    const boostedMs = st.getPumpkinMilestoneBonus();
    const badgesScaleWithTimeSurvivorsAndDispels =
      fastRec.badgesAwarded > slowRec.badgesAwarded &&
      fastRec.timeBonusBadges === 2 &&
      fastRec.survivorBonusBadges === 3 &&
      fastRec.dispelBonusBadges === 2 &&
      slowRec.timeBonusBadges === 0 &&
      slowRec.dispelBonusBadges === 0 &&
      lossRec.badgesAwarded === 1 &&
      !lossRec.victory;
    const badgesPersistedWithMilestone =
      fastRec.milestoneReached &&
      fastRec.milestoneBonusCoins > 0 &&
      saved.pumpkinBadges === st.pumpkinBadges &&
      st.pumpkinBadges === fastRec.badgesAwarded + lossRec.badgesAwarded &&
      saved.pumpkinNightClears === 1 &&
      saved.bestPumpkinFinishSec === 26 &&
      boostedMs.startBonusBobos > baseMs.startBonusBobos &&
      boostedMs.lightBonus > baseMs.lightBonus;
    stats.fastBadges = fastRec.badgesAwarded;
    stats.slowBadges = slowRec.badgesAwarded;

    // 19. Trophy hall: the 南瓜灯徽章奖杯 reads the existing lifetime counter (no duplicated copy) and buffs Bobo attack
    st.pumpkinBadges = 2;
    st.lifetimePumpkinBadges = 9;
    const metricOk = st.getHallTrophyMetric('pumpkin_badge') === 9 && st.getHallTrophyTier('pumpkin_badge') === 2;
    st.trophyHallSlots = 1;
    st.trophyDisplay = [null, null, null, null, null, null];
    const dmgNoTrophy = st.getHallTroopDmgMult();
    const placedTrophy = st.placeTrophy(0, 'pumpkin_badge');
    const dmgWithTrophy = st.getHallTroopDmgMult();
    const pumpkinTrophyReadsCounter =
      metricOk &&
      placedTrophy &&
      Math.abs(st.getHallTrophyBuff('dmg') - 0.04) < 1e-9 &&
      dmgWithTrophy > dmgNoTrophy * 1.035 &&
      HALL_TROPHY_ORDER.includes('pumpkin_badge');

    // 20. Tactic cards: unlock with coins / mode currencies (refused when short, lifetime kept), auto-slot, toggle /
    //     move / full-deck refusal, persist
    st.gold = 5000;
    st.iceMedals = 0;
    st.lifetimeIceMedals = 0;
    st.stardustBadges = 3;
    st.lifetimeStardustBadges = 3;
    st.ownedTacticCards = [];
    st.tacticDeck = [null, null, null];
    const buyShield = st.buyTacticCard('shield_open');
    const goldAfterShield = st.gold;
    const buyIceShort = st.buyTacticCard('shield_half');
    const buyRushHalf = st.buyTacticCard('rush_half');
    const starAfter = st.stardustBadges;
    const starLife = st.lifetimeStardustBadges;
    const buyCrowd = st.buyTacticCard('crowd_open');
    const buyRushOpen = st.buyTacticCard('rush_open');
    const toggleFull = st.toggleTacticCard('rush_open');
    const toggleOff = st.toggleTacticCard('shield_open');
    const toggleOn = st.toggleTacticCard('rush_open');
    const moveOk = st.equipTacticCard(2, 'rush_half');
    const unownedOk = st.equipTacticCard(1, 'crowd_final');
    const savedDeck = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}') as {
      ownedTacticCards?: string[];
      tacticDeck?: Array<string | null>;
    };
    const tacticBuyEquipPersist =
      buyShield.ok &&
      buyShield.spentCurrency === 'gold' &&
      buyShield.equippedSlot === 0 &&
      goldAfterShield === 5000 - TACTIC_CARDS.shield_open.cost &&
      !buyIceShort.ok &&
      buyIceShort.reason.includes('冰晶奖章') &&
      buyRushHalf.ok &&
      buyRushHalf.spentCurrency === 'stardust' &&
      buyRushHalf.equippedSlot === 1 &&
      starAfter === 0 &&
      starLife === 3 &&
      buyCrowd.ok &&
      buyCrowd.equippedSlot === 2 &&
      buyRushOpen.ok &&
      buyRushOpen.equippedSlot === -1 &&
      !toggleFull.ok &&
      toggleFull.reason.includes('已满') &&
      toggleOff.ok &&
      !toggleOff.equipped &&
      toggleOn.ok &&
      toggleOn.equipped &&
      toggleOn.slot === 0 &&
      moveOk &&
      !unownedOk &&
      st.tacticDeck.join(',') === 'rush_open,,rush_half' &&
      (savedDeck.ownedTacticCards || []).length === 4 &&
      JSON.stringify(savedDeck.tacticDeck) === JSON.stringify(['rush_open', null, 'rush_half']) &&
      st.getEquippedTacticCards().length === 2;

    // 21. In a base battle the `start` cards fire 1 s in: shields on 10 Bobos, +15% march speed for 4 s, +6 Bobos
    st.ownedTacticCards = [...TACTIC_CARD_ORDER];
    st.tacticDeck = ['shield_open', 'rush_open', 'crowd_open'];
    this.loadLevel(generateDynamicLevel(1));
    for (const u of this.units) if (u.active) u.active = false;
    for (let i = 0; i < 14; i++) this.spawnUnit('blue', 'normal', -3 + (i % 7), 6 + Math.floor(i / 7), 0, -2);
    clearShields();
    const tr0 = this.tacticRun;
    this.stageCombatTime = 0.5;
    this.updateTacticDeck(0.016);
    const quietBefore = Boolean(tr0 && tr0.cards.every((c) => !c.fired));
    const blueBefore = this.countBlueUnits();
    this.stageCombatTime = 1.05;
    this.updateTacticDeck(0.016);
    let shielded = 0;
    let marching = 0;
    for (const u of this.units) {
      if (!u.active || u.team !== 'blue') continue;
      if (u.frostShield) shielded++;
      if (u.vz < -1) marching++;
    }
    const rushNow = this.getTacticRushMult();
    const blueAfter = this.countBlueUnits();
    this.updateTacticDeck(4.1);
    const rushLater = this.getTacticRushMult();
    const tacticStartCardsFireInBattle = Boolean(
      tr0 &&
        tr0.cards.length === 3 &&
        quietBefore &&
        tr0.cards.every((c) => c.fired) &&
        tr0.shieldsGranted === 10 &&
        shielded >= 10 &&
        Math.abs(rushNow - 1.15) < 1e-9 &&
        rushLater === 1 &&
        blueAfter === blueBefore + 6 &&
        tr0.bobosAdded === 6 &&
        marching >= 6 &&
        tr0.triggers === 3
    );
    stats.tacticShields = tr0?.shieldsGranted ?? -1;
    stats.tacticAdded = tr0?.bobosAdded ?? -1;

    // 22. Condition cards fire once each when their condition is met: half (boss HP 50%), final (20%), crisis (base 50%)
    st.tacticDeck = ['shield_half', 'rush_final', 'crowd_crisis'];
    this.loadLevel(generateDynamicLevel(1));
    for (const u of this.units) if (u.active) u.active = false;
    for (let i = 0; i < 20; i++) this.spawnUnit('blue', 'normal', -4 + (i % 8), 6 + Math.floor(i / 8), 0, -2);
    const tr1 = this.tacticRun;
    this.stageCombatTime = 5;
    this.bossHp = this.bossMaxHp * 0.6;
    this.updateTacticDeck(0.016);
    const noneAt60 = Boolean(tr1 && tr1.cards.every((c) => !c.fired));
    this.bossHp = this.bossMaxHp * 0.45;
    this.updateTacticDeck(0.016);
    const halfOnly = Boolean(tr1 && tr1.cards[0].fired && !tr1.cards[1].fired && !tr1.cards[2].fired);
    this.bossHp = this.bossMaxHp * 0.15;
    this.updateTacticDeck(0.016);
    const finalFired = Boolean(tr1 && tr1.cards[1].fired && !tr1.cards[2].fired && this.getTacticRushMult() > 1.2);
    this.playerBaseHp = this.playerBaseMaxHp * 0.4;
    this.updateTacticDeck(0.016);
    const crisisFired = Boolean(tr1 && tr1.cards[2].fired && tr1.bobosAdded === 10);
    const trigBefore = tr1?.triggers ?? 0;
    this.bossHp = this.bossMaxHp * 0.05;
    this.playerBaseHp = this.playerBaseMaxHp * 0.1;
    this.updateTacticDeck(0.016);
    const tacticConditionCardsFireOnce = noneAt60 && halfOnly && finalFired && crisisFired && trigBefore === 3 && tr1?.triggers === 3;

    // 23. Caps: shields total <= 24 per match, overlapping rush never stacks past +25%, Bobos added total <= 16
    st.tacticDeck = ['shield_open', 'shield_half', 'shield_crisis'];
    this.loadLevel(generateDynamicLevel(1));
    for (const u of this.units) if (u.active) u.active = false;
    for (let i = 0; i < 60; i++) this.spawnUnit('blue', 'normal', -5 + (i % 10), 4 + Math.floor(i / 10), 0, -1);
    clearShields();
    const tr2 = this.tacticRun;
    this.stageCombatTime = 1.2;
    this.bossHp = this.bossMaxHp * 0.4;
    this.playerBaseHp = this.playerBaseMaxHp * 0.3;
    this.updateTacticDeck(0.016);
    const shieldCapOk = Boolean(
      tr2 && tr2.cards.every((c) => c.fired) && tr2.shieldsGranted === TACTIC_SHIELD_CAP && tr2.cards[2].delivered === 0
    );
    st.tacticDeck = ['rush_half', 'rush_final', 'rush_open'];
    this.loadLevel(generateDynamicLevel(1));
    const tr3 = this.tacticRun;
    this.stageCombatTime = 1.2;
    this.bossHp = this.bossMaxHp * 0.1;
    this.updateTacticDeck(0.016);
    const rushCapOk = Boolean(
      tr3 && tr3.cards.every((c) => c.fired) && Math.abs(this.getTacticRushMult() - (1 + TACTIC_RUSH_CAP)) < 1e-9 && tr3.rushTimer <= TACTIC_RUSH_MAX_SEC
    );
    st.tacticDeck = ['crowd_open', 'crowd_crisis', 'crowd_final'];
    const sG = loadPk();
    const tr4 = this.tacticRun;
    let crowdCapOk = false;
    if (sG && tr4) {
      const startG = bobos();
      this.stageCombatTime = 1.2;
      this.updateTacticDeck(0.016);
      const afterOpen = bobos();
      let knockedG = 0;
      for (const u of this.units) {
        if (u.active && u.team === 'blue' && knockedG < Math.ceil(afterOpen * 0.7)) {
          this.knockPumpkinBobo(u, true);
          knockedG++;
        }
      }
      this.updateTacticDeck(0.016);
      sG.distance = sG.courseLength * 0.82;
      this.updateTacticDeck(0.016);
      crowdCapOk =
        afterOpen === startG + 6 &&
        tr4.cards.every((c) => c.fired) &&
        tr4.bobosAdded === TACTIC_CROWD_CAP &&
        tr4.cards[1].delivered === 10 &&
        tr4.cards[2].delivered === TACTIC_CROWD_CAP - 6 - 10 &&
        tr4.cards[2].resultText.includes('封顶');
      stats.crowdFinalDelivered = tr4.cards[2].delivered;
    }
    const tacticEffectsCapped = shieldCapOk && rushCapOk && crowdCapOk;

    // 24. 冲锋卡 speeds up the squad run too (course pace above the base pace while it lasts)
    let tacticRushSpeedsUpSquad = false;
    st.tacticDeck = ['rush_half', null, null];
    const sH = loadPk();
    const tr5 = this.tacticRun;
    if (sH && tr5) {
      this.turretX = -sH.maxSteerX;
      for (let i = 0; i < 30; i++) this.updatePumpkinNight(0.05);
      const plain = sH.speed;
      sH.distance = sH.courseLength * 0.51;
      sH.light = sH.lightMax;
      skipBehind(sH.distance + 30);
      this.updateTacticDeck(0.016);
      for (let i = 0; i < 30; i++) {
        sH.light = sH.lightMax;
        this.updatePumpkinNight(0.05);
      }
      tacticRushSpeedsUpSquad = tr5.cards[0].fired && sH.speed > plain * 1.12 && sH.speed <= sH.baseSpeed * (1 + TACTIC_RUSH_CAP) + 0.01;
      stats.rushSpeed = Number(sH.speed.toFixed(2));
      stats.plainSpeed = Number(plain.toFixed(2));
    }
    this.turretX = 0;

    // Restore the original state cleanly
    st.gold = snap.gold;
    st.pumpkinBadges = snap.pumpkinBadges;
    st.lifetimePumpkinBadges = snap.lifetimePumpkinBadges;
    st.pumpkinNightClears = snap.pumpkinNightClears;
    st.bestPumpkinFinishSec = snap.bestPumpkinFinishSec;
    st.bestPumpkinSurvivors = snap.bestPumpkinSurvivors;
    st.totalPumpkinGhostsDispelled = snap.totalPumpkinGhostsDispelled;
    st.totalPumpkinBobosLost = snap.totalPumpkinBobosLost;
    st.ownedTacticCards = snap.ownedTacticCards;
    st.tacticDeck = snap.tacticDeck;
    st.totalTacticTriggers = snap.totalTacticTriggers;
    st.stardustBadges = snap.stardustBadges;
    st.lifetimeStardustBadges = snap.lifetimeStardustBadges;
    st.iceMedals = snap.iceMedals;
    st.lifetimeIceMedals = snap.lifetimeIceMedals;
    st.trophyHallSlots = snap.trophyHallSlots;
    st.trophyDisplay = snap.trophyDisplay;
    st.save();
    this.syncTrophyPedestal3D(true);
    this.turretX = prevTurretX;
    this.turretTargetX = prevTurretTargetX;
    this.onStageEnd = prevOnStageEnd;
    this.onBanner = prevOnBanner;
    this.onTacticTrigger = prevOnTactic;
    this.tacticProfileOverride = null;
    if (prevLevel) {
      this.loadLevel(prevLevel);
    }
    this.isPaused = prevPaused;

    const ok =
      pumpkinSpawnedAtNight &&
      crowdMarchesAndCourseScrolls &&
      crowdSteersAndBobosFollow &&
      unitGateAddsBobos &&
      lampZoneRefillsLight &&
      ghostPhasesThroughWallThenScares &&
      lanternDispelsGhost &&
      lampZoneDispelsHauntGhost &&
      shieldAbsorbsGhostTouch &&
      wallKnocksOutsideArch &&
      archDoorSafe &&
      darknessSlowsPace &&
      exitGateWinsStage &&
      timeoutLosesStage &&
      wipeoutLosesStage &&
      autopilotClearsTier1 &&
      tiersScale &&
      badgesScaleWithTimeSurvivorsAndDispels &&
      badgesPersistedWithMilestone &&
      pumpkinTrophyReadsCounter &&
      tacticBuyEquipPersist &&
      tacticStartCardsFireInBattle &&
      tacticConditionCardsFireOnce &&
      tacticEffectsCapped &&
      tacticRushSpeedsUpSquad;
    return {
      ok,
      pumpkinSpawnedAtNight,
      crowdMarchesAndCourseScrolls,
      crowdSteersAndBobosFollow,
      unitGateAddsBobos,
      lampZoneRefillsLight,
      ghostPhasesThroughWallThenScares,
      lanternDispelsGhost,
      lampZoneDispelsHauntGhost,
      shieldAbsorbsGhostTouch,
      wallKnocksOutsideArch,
      archDoorSafe,
      darknessSlowsPace,
      exitGateWinsStage,
      timeoutLosesStage,
      wipeoutLosesStage,
      autopilotClearsTier1,
      tiersScale,
      badgesScaleWithTimeSurvivorsAndDispels,
      badgesPersistedWithMilestone,
      pumpkinTrophyReadsCounter,
      tacticBuyEquipPersist,
      tacticStartCardsFireInBattle,
      tacticConditionCardsFireOnce,
      tacticEffectsCapped,
      tacticRushSpeedsUpSquad,
      stats,
    };
  }

  /**
   * MC-16 self-check: the desert pyramid trap run (scene switch, pace, quicksand, flip slabs, gates, win / loss,
   * autopilot clear, tiers, 圣甲虫徽章 settlement & trophy) and the tactic deck balance pass (main-campaign coefficient,
   * scaled caps, campaign switch, and crowd / rush cards in the lava, sled & asteroid modes incl. the lava mid-hop
   * reinforcement seating fix). Restores the save, the level and every callback afterwards.
   */
  public runMc16SelfCheck(): {
    ok: boolean;
    pyramidSpawnedInDesert: boolean;
    desertDecorRestoresAcrossModes: boolean;
    crowdRunsAndPassageScrolls: boolean;
    crowdSteersAndBobosFollow: boolean;
    unitGateAddsBobos: boolean;
    quicksandDragsPace: boolean;
    quicksandSwallowsLingeringBobos: boolean;
    shieldPullsBoboOutOfSand: boolean;
    stonePathCrossesSafely: boolean;
    slabCyclesWarnOpenClose: boolean;
    openSlabFlingsBobos: boolean;
    closedSlabCrossesSafely: boolean;
    shieldAbsorbsSlabFling: boolean;
    exitGateWinsStage: boolean;
    timeoutLosesStage: boolean;
    wipeoutLosesStage: boolean;
    autopilotClearsTier1: boolean;
    tiersScale: boolean;
    badgesScaleWithTimeSurvivorsAndTraps: boolean;
    badgesPersistedWithMilestone: boolean;
    scarabTrophyReadsCounter: boolean;
    tacticCampaignCoefficientScales: boolean;
    tacticCampaignCapsScaled: boolean;
    tacticLobbyModesFullStrength: boolean;
    tacticCampaignSwitchPersists: boolean;
    tacticLavaCrowdAndRush: boolean;
    tacticLavaMidHopReinforcementsSeated: boolean;
    tacticSledCrowdAndRush: boolean;
    tacticAsteroidCrowdAndRush: boolean;
    stats: Record<string, number>;
  } {
    const st = this.state;
    const prevPaused = this.isPaused;
    const prevLevel = this.currentLevel;
    const prevOnStageEnd = this.onStageEnd;
    const prevOnBanner = this.onBanner;
    const prevOnTactic = this.onTacticTrigger;
    const prevTurretX = this.turretX;
    const prevTurretTargetX = this.turretTargetX;
    const snap = {
      gold: st.gold,
      scarabBadges: st.scarabBadges,
      lifetimeScarabBadges: st.lifetimeScarabBadges,
      pyramidRunClears: st.pyramidRunClears,
      bestPyramidFinishSec: st.bestPyramidFinishSec,
      bestPyramidSurvivors: st.bestPyramidSurvivors,
      totalPyramidTrapsDodged: st.totalPyramidTrapsDodged,
      totalPyramidBobosLost: st.totalPyramidBobosLost,
      ownedTacticCards: [...st.ownedTacticCards],
      tacticDeck: [...st.tacticDeck],
      totalTacticTriggers: st.totalTacticTriggers,
      tacticCampaignEnabled: st.tacticCampaignEnabled,
      trophyHallSlots: st.trophyHallSlots,
      trophyDisplay: [...st.trophyDisplay],
    };
    const stats: Record<string, number> = {};
    this.isPaused = true;
    this.onStageEnd = undefined;
    this.onBanner = undefined;
    this.onTacticTrigger = undefined;
    this.tacticProfileOverride = null;
    // The pyramid checks run without tactic cards (an equipped deck must not change the deterministic numbers)
    st.tacticDeck = [null, null, null];
    st.tacticCampaignEnabled = true;
    const bobos = (): number => this.getLavaBoboCount();
    const blueIds = (): Set<number> => {
      const set = new Set<number>();
      for (const u of this.units) if (u.active && u.team === 'blue') set.add(u.id);
      return set;
    };
    const clearShields = (): void => {
      for (const u of this.units) {
        if (u.active) {
          u.frostShield = false;
          u.petShellGranted = false;
        }
      }
    };
    const killReds = (): void => {
      for (const u of this.units) if (u.active && u.team === 'red') u.active = false;
    };
    const loadPy = (tier = 1): PyramidRunRuntime | null => {
      this.loadLevel(generatePyramidRunLevel(tier));
      killReds();
      clearShields();
      this.snapPyramidBobosToSlots();
      return this.pyramidRun;
    };
    /** Marks every course item behind `dist` as already handled (so jumping the distance never re-triggers them). */
    const skipBehind = (dist: number): void => {
      for (const g of this.pyramidGates) if (g.cfg.d < dist + PY_FRONT_OFFSET + 0.5) g.resolved = true;
      for (const b of this.pyramidSands) if (b.cfg.d + b.cfg.length < dist - 1) b.passed = true;
      for (const r of this.pyramidSlabRows) if (r.cfg.d + r.cfg.depth * 0.5 < dist - 1) r.passed = true;
    };
    /** Parks the squad line at x with the front at course distance `frontDu` (no pace of its own). */
    const parkAt = (s: PyramidRunRuntime, frontDu: number, x: number): void => {
      skipBehind(frontDu - 4);
      s.x = x;
      this.turretX = x;
      this.turretTargetX = x;
      s.baseSpeed = 0.0001;
      s.speed = 0;
      s.distance = frontDu - PY_FRONT_OFFSET;
      this.snapPyramidBobosToSlots();
      clearShields();
    };
    /** A run-clock value at which `slab` has been in `state` for `into` seconds. */
    const clockAt = (row: PyramidSlabRowRuntime, slab: PyramidSlabConfig, state: 'closed' | 'warn' | 'open', into: number): number => {
      const P = row.cfg.period;
      const openStart = P - row.cfg.openSec;
      const warnStart = openStart - row.cfg.warnSec;
      const ph = (state === 'open' ? openStart : state === 'warn' ? warnStart : 0) + into;
      return (((ph - slab.offset) % P) + P) % P + P * 4;
    };

    // Freeze milestone bonuses so Bobo counts / time limits are deterministic
    st.scarabBadges = 0;
    st.lifetimeScarabBadges = 0;

    // 1. Load the pyramid run -> desert tint over the gear-town base, tomb floor, gates, sand belts, slab rows, exit
    const lvl = generatePyramidRunLevel(1);
    const s0 = loadPy();
    const start = bobos();
    let redCount = 0;
    for (const u of this.units) if (u.active && u.team === 'red') redCount++;
    const course = lvl.pyramidCourse;
    const scene0 = this.getDedicatedSceneSnapshot();
    const pyramidSpawnedInDesert = Boolean(
      lvl.isPyramidRun &&
        lvl.mode === 'pyramid_run' &&
        lvl.themeId !== 'cyberhive' &&
        this.currentTheme.id === lvl.themeId &&
        s0 &&
        s0.active &&
        s0.courseGroup.parent === this.levelGroup &&
        s0.sun.parent === this.levelGroup &&
        scene0.kind === 'desert' &&
        scene0.skyHex === PY_DESERT_SKY &&
        !scene0.landmarks &&
        this.pyramidGates.length >= 6 &&
        this.pyramidSands.length >= 3 &&
        this.pyramidSlabRows.length >= 3 &&
        this.pyramidSlabRows.every((r) => r.slabs.length >= 4) &&
        this.pyramidExitGroup !== null &&
        !this.bossGroup.visible &&
        !this.turretGroup.visible &&
        this.pumpkinRun === null &&
        start === (course?.startBobos ?? -1) &&
        redCount === 0 &&
        course !== undefined &&
        s0.timeLimit === course.timeLimitSec &&
        course.timeLimitSec > course.length / course.baseSpeed &&
        course.length / course.baseSpeed >= 25 &&
        course.length / course.baseSpeed <= 35
    );
    stats.startBobos = start;
    stats.courseLength = course?.length ?? 0;
    stats.timeLimit = course?.timeLimitSec ?? 0;
    stats.paceSec = course ? Number((course.length / course.baseSpeed).toFixed(1)) : 0;
    stats.gates = this.pyramidGates.length;
    stats.sands = this.pyramidSands.length;
    stats.slabRows = this.pyramidSlabRows.length;

    // 2. Scene switch: desert -> night castle -> campaign (daytime restored) -> desert -> lava (daytime restored)
    this.loadLevel(generatePumpkinNightLevel(1));
    const sceneNight = this.getDedicatedSceneSnapshot();
    const nightOk = sceneNight.kind === 'night_castle' && sceneNight.skyHex === PK_NIGHT_SKY && !sceneNight.landmarks &&
      sceneNight.abyssHex === DEDICATED_ABYSS_TINT.night_castle && this.pyramidRun === null && this.pumpkinRun !== null;
    this.loadLevel(generateDynamicLevel(1));
    const sceneDay = this.getDedicatedSceneSnapshot();
    const dayOk = sceneDay.kind === 'none' && sceneDay.landmarks && sceneDay.abyssHex === 0xffffff &&
      sceneDay.skyHex === this.currentTheme.skyColor && this.pyramidRun === null && this.pumpkinRun === null;
    this.loadLevel(generatePyramidRunLevel(1));
    const sceneDesert2 = this.getDedicatedSceneSnapshot();
    const desert2Ok = sceneDesert2.kind === 'desert' && sceneDesert2.skyHex === PY_DESERT_SKY && !sceneDesert2.landmarks &&
      sceneDesert2.abyssHex === DEDICATED_ABYSS_TINT.desert && this.pyramidRun !== null;
    this.loadLevel(generateLavaJumpLevel(1));
    const sceneLava = this.getDedicatedSceneSnapshot();
    const lavaOk = sceneLava.kind === 'none' && sceneLava.landmarks && sceneLava.abyssHex === 0xffffff &&
      sceneLava.skyHex !== PY_DESERT_SKY && sceneLava.skyHex !== PK_NIGHT_SKY && this.pyramidRun === null;
    const desertDecorRestoresAcrossModes =
      scene0.abyssHex === DEDICATED_ABYSS_TINT.desert && nightOk && dayOk && desert2Ok && lavaOk;

    // 3. The squad runs forward: the passage scrolls toward the camera, the clock ticks, Bobos hop
    let crowdRunsAndPassageScrolls = false;
    const sR = loadPy();
    if (sR) {
      const z0 = sR.courseGroup.position.z;
      const t0 = sR.timeLeft;
      let minRide = Infinity;
      let maxRide = -Infinity;
      for (let i = 0; i < 40 && sR.active; i++) {
        this.turretX = this.getPyramidAutopilotX();
        this.updatePyramidRun(0.05);
        for (const u of this.units) {
          if (u.active && u.team === 'blue') {
            maxRide = Math.max(maxRide, u.rideY || 0);
            minRide = Math.min(minRide, u.rideY || 0);
          }
        }
      }
      crowdRunsAndPassageScrolls =
        sR.distance > 6 && sR.courseGroup.position.z > z0 + 6 && sR.timeLeft < t0 && sR.speed > 3 && sR.clock > 1.9 && maxRide - minRide > 0.05;
      stats.distAfter2s = Number(sR.distance.toFixed(2));
    }

    // 4. Steering: the squad line follows the cannon aim and the Bobos follow (real simulateUnits)
    let crowdSteersAndBobosFollow = false;
    const s1 = loadPy();
    if (s1) {
      s1.baseSpeed = 2.0;
      this.turretX = 5.5;
      this.turretTargetX = 5.5;
      for (let i = 0; i < 30; i++) {
        this.updatePyramidRun(0.05);
        this.simulateUnits(0.05);
      }
      let sumX = 0;
      let n = 0;
      for (const u of this.units) {
        if (u.active && u.team === 'blue') {
          sumX += u.x;
          n++;
        }
      }
      const avgX = n > 0 ? sumX / n : 0;
      crowdSteersAndBobosFollow = s1.x > 4.5 && avgX > 3.5 && n === start;
      stats.boboAvgX = Number(avgX.toFixed(2));
    }
    this.turretX = 0;
    this.turretTargetX = 0;

    // 5. Unit gate: the gate under the squad centre adds exactly +N Bobos; its pair resolves without triggering
    let unitGateAddsBobos = false;
    const s2 = loadPy();
    const addGate = this.pyramidGates.find((g) => g.cfg.op === 'add');
    if (s2 && addGate) {
      parkAt(s2, addGate.cfg.d - 0.4, addGate.cfg.x);
      const before = bobos();
      this.updatePyramidRun(0.016);
      const notYet = !addGate.resolved;
      s2.distance += 0.6;
      this.updatePyramidRun(0.016);
      const after = bobos();
      const pair = this.pyramidGates.find((g) => g !== addGate && g.cfg.d === addGate.cfg.d);
      unitGateAddsBobos =
        notYet && addGate.resolved && addGate.triggered && after === before + addGate.cfg.value && this.pyramidGatesPassed === 1 &&
        Boolean(pair && pair.resolved && !pair.triggered);
      stats.gateAdded = after - before;
    }

    // 6. Quicksand drags the pace: the same entry at full pace, once on the stone path and once in the sand
    let quicksandDragsPace = false;
    const sandX = (b: PyramidSandRuntime): number =>
      THREE.MathUtils.clamp(b.cfg.pathX > 0 ? b.cfg.pathX - 5.2 : b.cfg.pathX + 5.2, -7.0, 7.0);
    const paceThrough = (onPath: boolean): { speed: number; sawSand: boolean; sandSec: number; base: number } => {
      const s = loadPy();
      const b = this.pyramidSands[0];
      if (!s || !b) return { speed: 0, sawSand: false, sandSec: 0, base: 1 };
      const x = onPath ? b.cfg.pathX : sandX(b);
      const base = s.baseSpeed;
      parkAt(s, b.cfg.d + 0.4, x);
      s.baseSpeed = base;
      s.speed = base;
      let sawSand = false;
      for (let i = 0; i < 10 && s.active; i++) {
        this.updatePyramidRun(0.05);
        if (s.state === 'quicksand') sawSand = true;
      }
      return { speed: s.speed, sawSand, sandSec: s.sandSec, base };
    };
    const onPathPace = paceThrough(true);
    const inSandPace = paceThrough(false);
    quicksandDragsPace =
      !onPathPace.sawSand &&
      onPathPace.speed >= onPathPace.base * 0.95 &&
      inSandPace.sawSand &&
      inSandPace.sandSec > 0 &&
      inSandPace.speed < onPathPace.speed * 0.8;
    stats.pathSpeed = Number(onPathPace.speed.toFixed(2));
    stats.sandSpeed = Number(inSandPace.speed.toFixed(2));

    // 7. Lingering in quicksand: nothing happens before `sinkSec`, then Bobos are swallowed (capped per belt)
    let quicksandSwallowsLingeringBobos = false;
    const s3 = loadPy();
    const b3 = this.pyramidSands[0];
    if (s3 && b3) {
      parkAt(s3, b3.cfg.d + b3.cfg.length - 0.3, sandX(b3));
      const before = bobos();
      const early = Math.floor((s3.sinkSec - 0.25) / 0.05);
      for (let i = 0; i < early; i++) this.updatePyramidRun(0.05);
      const intactEarly = bobos() === before && s3.state === 'quicksand';
      for (let i = 0; i < 20 && s3.active; i++) this.updatePyramidRun(0.05);
      const lost = before - bobos();
      quicksandSwallowsLingeringBobos =
        intactEarly && lost === b3.cfg.knockCap && b3.swallowed === lost && this.pyramidSandSwallowed === lost && bobos() > 0;
      stats.sandSwallowed = lost;
    }

    // 8. A candy shield pulls a sinking Bobo out of the sand once (shield spent, Bobo kept)
    let shieldPullsBoboOutOfSand = false;
    const s4 = loadPy();
    const b4 = this.pyramidSands[0];
    if (s4 && b4) {
      parkAt(s4, b4.cfg.d + b4.cfg.length - 0.3, sandX(b4));
      for (const u of this.units) if (u.active && u.team === 'blue') u.frostShield = true;
      const before = bobos();
      for (let i = 0; i < Math.ceil((s4.sinkSec + 0.2) / 0.05); i++) this.updatePyramidRun(0.05);
      let shieldsLeft = 0;
      for (const u of this.units) if (u.active && u.team === 'blue' && u.frostShield) shieldsLeft++;
      shieldPullsBoboOutOfSand = bobos() === before && b4.pulledOut >= 1 && b4.swallowed === 0 && shieldsLeft < before && this.pyramidShieldSaves >= 1;
      stats.sandPulledOut = b4.pulledOut;
    }

    // 9. Crossing a belt on its stone path: no drag, nobody lost, the belt counts as a trap dodged
    let stonePathCrossesSafely = false;
    const s5 = loadPy();
    const b5 = this.pyramidSands[0];
    if (s5 && b5) {
      parkAt(s5, b5.cfg.d - 3, b5.cfg.pathX);
      const before = bobos();
      let sawSand = false;
      for (let i = 0; i < 600 && s5.active && !b5.passed; i++) {
        s5.distance += 0.12;
        this.updatePyramidRun(0.016);
        if (s5.state === 'quicksand') sawSand = true;
      }
      stonePathCrossesSafely = b5.passed && !sawSand && bobos() === before && b5.swallowed === 0 && this.pyramidTrapsDodged === 1;
    }

    // 10. Flip-slab cycle: closed -> warning (tremble, red glyph) -> open (tile on its edge) -> closed; never more than
    //     slabs - 2 open at once
    let slabCyclesWarnOpenClose = false;
    const s6 = loadPy();
    const row6 = this.pyramidSlabRows[0];
    if (s6 && row6) {
      const sl = row6.slabs[0];
      const P = row6.cfg.period;
      s6.clock = clockAt(row6, sl.cfg, 'closed', 0.1);
      this.updatePyramidSlabs(0);
      const closedOk = sl.state === 'closed' && Math.abs(sl.pivot.rotation.x) < 1e-6;
      s6.clock = clockAt(row6, sl.cfg, 'warn', 0.1);
      this.updatePyramidSlabs(0);
      const warnOk = sl.state === 'warn' && Math.abs(sl.pivot.rotation.x) < 1e-6 && sl.glyphMat.color.getHex() !== 0xf6c443;
      s6.clock = clockAt(row6, sl.cfg, 'open', 0.4);
      this.updatePyramidSlabs(0);
      const openOk = sl.state === 'open' && Math.abs(sl.pivot.rotation.x - Math.PI / 2) < 1e-3 && sl.glyphMat.color.getHex() === 0xef4444;
      s6.clock = clockAt(row6, sl.cfg, 'closed', 0.1) + P;
      this.updatePyramidSlabs(0);
      const reclosedOk = sl.state === 'closed' && Math.abs(sl.pivot.rotation.x) < 1e-6;
      let maxOpen = 0;
      let alwaysTwoShut = true;
      for (const r of this.pyramidSlabRows) {
        for (let c = 0; c < r.cfg.period; c += 0.02) {
          let open = 0;
          for (const x of r.slabs) if (this.getPyramidSlabState(r.cfg, x.cfg, c).state === 'open') open++;
          maxOpen = Math.max(maxOpen, open);
          if (r.slabs.length - open < 2) alwaysTwoShut = false;
        }
      }
      const predictOk =
        this.isPyramidSlabOpenDuring(row6.cfg, sl.cfg, clockAt(row6, sl.cfg, 'open', 0.2), clockAt(row6, sl.cfg, 'open', 0.3)) &&
        !this.isPyramidSlabOpenDuring(row6.cfg, sl.cfg, clockAt(row6, sl.cfg, 'closed', 0.05), clockAt(row6, sl.cfg, 'closed', 0.6));
      slabCyclesWarnOpenClose = closedOk && warnOk && openOk && reclosedOk && alwaysTwoShut && predictOk;
      stats.slabMaxOpen = maxOpen;
    }

    // 11. Crossing a slab that is open: Bobos on it are flung away (capped per row) and the squad stumbles
    const crossSlab = (state: 'open' | 'closed', shielded: boolean): { lost: number; row: PyramidSlabRowRuntime | null; before: number; shieldsLeft: number } => {
      const s = loadPy();
      const row = this.pyramidSlabRows[0];
      if (!s || !row) return { lost: -1, row: null, before: 0, shieldsLeft: 0 };
      const sl = row.slabs[1];
      parkAt(s, row.cfg.d - row.cfg.depth * 0.5 - 0.25, sl.cfg.x);
      if (shielded) for (const u of this.units) if (u.active && u.team === 'blue') u.frostShield = true;
      s.clock = clockAt(row, sl.cfg, state, state === 'open' ? 0.0 : 0.05);
      const before = bobos();
      for (let i = 0; i < 600 && s.active && !row.passed; i++) {
        s.distance += 0.12;
        this.updatePyramidRun(0.016);
      }
      let shieldsLeft = 0;
      for (const u of this.units) if (u.active && u.team === 'blue' && u.frostShield) shieldsLeft++;
      return { lost: before - bobos(), row, before, shieldsLeft };
    };
    const openCross = crossSlab('open', false);
    const openSlabFlingsBobos = Boolean(
      openCross.row &&
        openCross.lost >= 1 &&
        openCross.lost <= openCross.row.cfg.knockCap &&
        openCross.row.knocked === openCross.lost &&
        this.pyramidSlabFlung === openCross.lost &&
        this.pyramidSlabHits === 1 &&
        openCross.row.passed &&
        this.pyramidTrapsDodged === 0
    );
    stats.slabFlung = openCross.lost;
    const closedCross = crossSlab('closed', false);
    const closedSlabCrossesSafely = Boolean(
      closedCross.row && closedCross.lost === 0 && closedCross.row.passed && closedCross.row.knocked === 0 && this.pyramidTrapsDodged === 1
    );
    const shieldCross = crossSlab('open', true);
    const shieldAbsorbsSlabFling = Boolean(
      shieldCross.row &&
        shieldCross.lost === 0 &&
        shieldCross.row.touched.size >= 1 &&
        shieldCross.shieldsLeft < shieldCross.before &&
        this.pyramidShieldSaves >= 1
    );

    // 12. Reaching the tomb gate before the countdown ends wins; 13. timeout; 14. wipeout
    let exitGateWinsStage = false;
    const sC = loadPy();
    if (sC) {
      skipBehind(sC.courseLength);
      sC.distance = sC.courseLength - 0.05;
      sC.speed = sC.baseSpeed;
      this.updatePyramidRun(0.05);
      exitGateWinsStage = this.isStageEnded && this.lastStageVictory && sC.state === 'finished' && this.getPyramidProgressPct() === 100;
    }
    let timeoutLosesStage = false;
    const sD = loadPy();
    if (sD) {
      sD.timeLeft = 0.01;
      this.updatePyramidRun(0.05);
      timeoutLosesStage = this.isStageEnded && !this.lastStageVictory && sD.state === 'timeout';
    }
    let wipeoutLosesStage = false;
    const sE = loadPy();
    if (sE) {
      for (const u of this.units) if (u.active && u.team === 'blue') this.knockPyramidBobo(u, true);
      this.updatePyramidRun(0.05);
      wipeoutLosesStage = this.isStageEnded && !this.lastStageVictory && sE.state === 'wiped';
    }

    // 15. Tier 1 is clearable in ~30 s by a careful line (autopilot through the real update + simulateUnits loop)
    let autopilotClearsTier1 = false;
    const sF = loadPy();
    if (sF) {
      let steps = 0;
      while (sF.active && steps < 1200) {
        this.turretX = this.getPyramidAutopilotX();
        this.turretTargetX = this.turretX;
        this.updatePyramidRun(0.05);
        this.simulateUnits(0.05);
        steps++;
      }
      autopilotClearsTier1 =
        sF.state === 'finished' &&
        this.lastStageVictory &&
        this.pyramidFinishSec >= 24 &&
        this.pyramidFinishSec <= 36 &&
        this.pyramidBoboCount >= start &&
        this.pyramidGatesPassed >= 3 &&
        this.pyramidTrapsDodged >= 3;
      stats.autoFinishSec = this.pyramidFinishSec;
      stats.autoSurvivors = this.pyramidBoboCount;
      stats.autoGates = this.pyramidGatesPassed;
      stats.autoDodged = this.pyramidTrapsDodged;
      stats.autoLost = this.pyramidBobosLost;
      stats.autoSandSec = Number(sF.sandSec.toFixed(2));
      stats.autoSlabHits = this.pyramidSlabHits;
    }
    this.turretX = 0;
    this.turretTargetX = 0;

    // 16. Tiers scale: faster pace, longer course, narrower stone paths, longer belts, faster sinking, stronger drag,
    //     faster flip cycles with longer open windows, more slabs per row, higher caps
    const t1 = generatePyramidRunLevel(1);
    const t5 = generatePyramidRunLevel(5);
    const c1 = t1.pyramidCourse;
    const c5 = t5.pyramidCourse;
    const tiersScale = Boolean(
      c1 &&
        c5 &&
        c5.baseSpeed > c1.baseSpeed &&
        c5.length > c1.length &&
        c5.sinkSec < c1.sinkSec &&
        c5.sandSlowMult < c1.sandSlowMult &&
        (t5.pyramidSands?.[0]?.pathW ?? 99) < (t1.pyramidSands?.[0]?.pathW ?? 0) &&
        (t5.pyramidSands?.[0]?.length ?? 0) > (t1.pyramidSands?.[0]?.length ?? 99) &&
        (t5.pyramidSlabRows?.[0]?.period ?? 99) < (t1.pyramidSlabRows?.[0]?.period ?? 0) &&
        (t5.pyramidSlabRows?.[0]?.openSec ?? 0) > (t1.pyramidSlabRows?.[0]?.openSec ?? 99) &&
        (t5.pyramidSlabRows?.[0]?.slabs.length ?? 0) > (t1.pyramidSlabRows?.[0]?.slabs.length ?? 99) &&
        (t5.pyramidSlabRows?.[0]?.knockCap ?? 0) > (t1.pyramidSlabRows?.[0]?.knockCap ?? 99) &&
        st.getPyramidRunSpec(0).pyramidTier === 1 &&
        st.getPyramidRunSpec(3).pyramidTier === 4 &&
        st.getPyramidRunSpec(99).pyramidTier === 8
    );

    // 17. Settlement: 圣甲虫徽章 scale with finish time + survivors + traps dodged and persist with a milestone
    const resetPy = (): void => {
      st.scarabBadges = 0;
      st.lifetimeScarabBadges = 0;
      st.pyramidRunClears = 0;
      st.bestPyramidFinishSec = 0;
    };
    resetPy();
    const slowRec = st.recordPyramidRunResult(true, 38, 41, 10, 8, 0, 100);
    resetPy();
    const baseMs = st.getScarabMilestoneBonus(0);
    const fastRec = st.recordPyramidRunResult(true, 26, 41, 48, 6, 6, 100);
    const lossRec = st.recordPyramidRunResult(false, 41, 41, 12, 20, 1, 55);
    const saved = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}') as {
      scarabBadges?: number;
      pyramidRunClears?: number;
      bestPyramidFinishSec?: number;
    };
    const boostedMs = st.getScarabMilestoneBonus();
    const badgesScaleWithTimeSurvivorsAndTraps =
      fastRec.badgesAwarded > slowRec.badgesAwarded &&
      fastRec.timeBonusBadges === 2 &&
      fastRec.survivorBonusBadges === 3 &&
      fastRec.trapBonusBadges === 2 &&
      slowRec.timeBonusBadges === 0 &&
      slowRec.trapBonusBadges === 0 &&
      lossRec.badgesAwarded === 1 &&
      !lossRec.victory;
    const sBoost = loadPy();
    const badgesPersistedWithMilestone = Boolean(
      fastRec.milestoneReached &&
        fastRec.milestoneBonusCoins > 0 &&
        saved.scarabBadges === st.scarabBadges &&
        st.scarabBadges === fastRec.badgesAwarded + lossRec.badgesAwarded &&
        saved.pyramidRunClears === 1 &&
        saved.bestPyramidFinishSec === 26 &&
        boostedMs.startBonusBobos > baseMs.startBonusBobos &&
        boostedMs.timeBonusSec > baseMs.timeBonusSec &&
        sBoost &&
        sBoost.timeLimit === (course?.timeLimitSec ?? 0) + boostedMs.timeBonusSec &&
        bobos() === start + boostedMs.startBonusBobos
    );
    stats.fastBadges = fastRec.badgesAwarded;
    stats.slowBadges = slowRec.badgesAwarded;

    // 18. Trophy hall: the 圣甲虫徽章奖杯 reads the existing lifetime counter (no duplicated copy) and buffs Bobo HP
    st.scarabBadges = 2;
    st.lifetimeScarabBadges = 9;
    const metricOk = st.getHallTrophyMetric('scarab_badge') === 9 && st.getHallTrophyTier('scarab_badge') === 2;
    st.trophyHallSlots = 1;
    st.trophyDisplay = [null, null, null, null, null, null];
    const hpNoTrophy = st.getHallTroopHpMult();
    const placedTrophy = st.placeTrophy(0, 'scarab_badge');
    const hpWithTrophy = st.getHallTroopHpMult();
    const scarabTrophyReadsCounter =
      metricOk &&
      placedTrophy &&
      Math.abs(st.getHallTrophyBuff('hp') - 0.04) < 1e-9 &&
      hpWithTrophy > hpNoTrophy * 1.035 &&
      HALL_TROPHY_ORDER.includes('scarab_badge') &&
      HALL_TROPHY_ORDER.length >= 10;
    st.scarabBadges = 0;
    st.lifetimeScarabBadges = 0;

    // 19. Main-campaign coefficient: the same start cards deliver ×0.6 in a campaign stage
    st.ownedTacticCards = [...TACTIC_CARD_ORDER];
    const mult = TACTIC_CAMPAIGN_EFFECT_MULT;
    const loadBattle = (deck: Array<TacticCardId | null>, blueN: number): TacticRunRuntime | null => {
      st.tacticDeck = deck;
      this.loadLevel(generateDynamicLevel(1));
      for (const u of this.units) if (u.active) u.active = false;
      for (let i = 0; i < blueN; i++) this.spawnUnit('blue', 'normal', -5 + (i % 10), 4 + Math.floor(i / 10), 0, -1);
      clearShields();
      return this.tacticRun;
    };
    const trA = loadBattle(['shield_open', 'rush_open', 'crowd_open'], 14);
    const campBefore = this.countBlueUnits();
    this.stageCombatTime = 1.05;
    this.updateTacticDeck(0.016);
    const campRush = this.getTacticRushMult();
    const tacticCampaignCoefficientScales = Boolean(
      trA &&
        trA.isCampaign &&
        Math.abs(trA.effectMult - mult) < 1e-9 &&
        this.isMainCampaignLevel() &&
        trA.cards.every((c) => c.fired) &&
        trA.shieldsGranted === scaleTacticValue(TACTIC_CARDS.shield_open.value, mult, true) &&
        trA.shieldsGranted === 6 &&
        Math.abs(campRush - (1 + TACTIC_CARDS.rush_open.value * mult)) < 1e-6 &&
        trA.bobosAdded === 4 &&
        this.countBlueUnits() === campBefore + 4 &&
        trA.cards[2].resultText.includes('+4')
    );
    stats.campShields = trA?.shieldsGranted ?? -1;
    stats.campRushPct = Math.round((campRush - 1) * 100);
    stats.campBobos = trA?.bobosAdded ?? -1;

    // 20. Campaign caps are scaled too: shields ≤14, rush ≤+15%, reinforcements ≤10 per match
    const trB = loadBattle(['shield_open', 'shield_half', 'shield_crisis'], 60);
    this.stageCombatTime = 1.2;
    this.bossHp = this.bossMaxHp * 0.4;
    this.playerBaseHp = this.playerBaseMaxHp * 0.3;
    this.updateTacticDeck(0.016);
    const shieldCapOk = Boolean(trB && trB.cards.every((c) => c.fired) && trB.shieldCap === 14 && trB.shieldsGranted === 14);
    const trC = loadBattle(['rush_half', 'rush_final', 'rush_open'], 10);
    this.stageCombatTime = 1.2;
    this.bossHp = this.bossMaxHp * 0.1;
    this.updateTacticDeck(0.016);
    const rushCapOk = Boolean(
      trC && trC.cards.every((c) => c.fired) && Math.abs(trC.rushCap - 0.15) < 1e-9 && Math.abs(this.getTacticRushMult() - 1.15) < 1e-9
    );
    const trD = loadBattle(['crowd_open', 'crowd_crisis', 'crowd_final'], 20);
    this.stageCombatTime = 1.2;
    this.updateTacticDeck(0.016);
    this.playerBaseHp = this.playerBaseMaxHp * 0.4;
    this.updateTacticDeck(0.016);
    this.bossHp = this.bossMaxHp * 0.1;
    this.updateTacticDeck(0.016);
    const crowdCapOk = Boolean(
      trD &&
        trD.cards.every((c) => c.fired) &&
        trD.crowdCap === 10 &&
        trD.bobosAdded === 10 &&
        trD.cards[0].delivered === 4 &&
        trD.cards[1].delivered === 6 &&
        trD.cards[2].delivered === 0 &&
        trD.cards[2].resultText.includes('封顶')
    );
    const tacticCampaignCapsScaled = shieldCapOk && rushCapOk && crowdCapOk;

    // 21. Lobby modes keep full strength (the pyramid run here): 10 shields, +15% pace, +6 Bobos
    st.tacticDeck = ['shield_open', 'rush_open', 'crowd_open'];
    const sL = loadPy();
    const trL = this.tacticRun;
    let tacticLobbyModesFullStrength = false;
    if (sL && trL) {
      const before = bobos();
      this.stageCombatTime = 1.05;
      this.updateTacticDeck(0.016);
      tacticLobbyModesFullStrength =
        !trL.isCampaign &&
        trL.effectMult === 1 &&
        trL.shieldCap === TACTIC_SHIELD_CAP &&
        trL.crowdCap === TACTIC_CROWD_CAP &&
        trL.shieldsGranted === TACTIC_CARDS.shield_open.value &&
        Math.abs(this.getTacticRushMult() - (1 + TACTIC_CARDS.rush_open.value)) < 1e-9 &&
        trL.bobosAdded === TACTIC_CARDS.crowd_open.value &&
        bobos() === before + TACTIC_CARDS.crowd_open.value;
    }

    // 22. Campaign switch: off -> campaign stages run card-free (lobby modes unaffected), persisted, back on
    st.tacticDeck = ['shield_open', 'rush_open', 'crowd_open'];
    const switchedOff = st.setTacticCampaignEnabled(false);
    const savedOff = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}') as { tacticCampaignEnabled?: boolean };
    this.loadLevel(generateDynamicLevel(1));
    const campOffRun = this.tacticRun;
    this.loadLevel(generatePyramidRunLevel(1));
    const lobbyWhileOff = this.tacticRun;
    const offLabel = st.getTacticEffectProfile(true).label;
    const switchedOn = st.setTacticCampaignEnabled(true);
    const savedOn = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}') as { tacticCampaignEnabled?: boolean };
    this.loadLevel(generateDynamicLevel(1));
    const campOnRun = this.tacticRun;
    const tacticCampaignSwitchPersists = Boolean(
      switchedOff &&
        savedOff.tacticCampaignEnabled === false &&
        campOffRun === null &&
        lobbyWhileOff !== null &&
        offLabel.includes('关闭') &&
        switchedOn &&
        !st.setTacticCampaignEnabled(true) &&
        savedOn.tacticCampaignEnabled === true &&
        campOnRun !== null &&
        campOnRun.isCampaign &&
        st.getTacticEffectProfile(true).label.includes('×0.6')
    );

    // 23-25. Crowd & rush cards in the lava / sled / asteroid squad runs: crowd_open (+6 at 1 s, seated in formation),
    //        rush_open (pace above the card-free run, never above +25%), crowd_final (+8 at 80%, total ≤16)
    type ModeKind = 'lava' | 'sled' | 'asteroid';
    const modeRun = (
      kind: ModeKind,
      withDeck: boolean
    ): { speed: number; base: number; added: number; fresh: number; seated: boolean; finalDelivered: number; total: number; rushFired: boolean } => {
      st.tacticDeck = withDeck ? ['crowd_open', 'rush_open', 'crowd_final'] : [null, null, null];
      const lvlM = kind === 'lava' ? generateLavaJumpLevel(1) : kind === 'sled' ? generateGlacierSledLevel(1) : generateAsteroidDashLevel(1);
      this.loadLevel(lvlM);
      killReds();
      clearShields();
      if (kind === 'lava') this.snapLavaBobosToSlots();
      else if (kind === 'sled') this.snapSledRidersToSlots();
      else this.snapAsteroidBobosToSlots();
      const run = kind === 'lava' ? this.lavaRun : kind === 'sled' ? this.glacierSled : this.asteroidRun;
      const out = { speed: 0, base: 1, added: -1, fresh: 0, seated: false, finalDelivered: -1, total: -1, rushFired: false };
      if (!run) return out;
      out.base = run.baseSpeed;
      this.stageCombatTime = 0;
      let freshIds: number[] = [];
      let idsBefore = blueIds();
      for (let i = 0; i < 60 && run.active; i++) {
        run.slowTimer = 0;
        if (kind === 'sled' && this.glacierSled) this.glacierSled.boostTimer = 0;
        run.timeLeft = Math.max(run.timeLeft, 20);
        this.turretX = kind === 'lava' ? this.getLavaAutopilotX() : kind === 'sled' ? this.getSledAutopilotX() : this.getAsteroidAutopilotX();
        this.turretTargetX = this.turretX;
        if (kind === 'lava') this.updateLavaJump(0.05);
        else if (kind === 'sled') this.updateGlacierSled(0.05);
        else this.updateAsteroidDash(0.05);
        this.simulateUnits(0.05);
        const firedBefore = this.tacticRun ? this.tacticRun.cards[0].fired : false;
        idsBefore = firedBefore ? idsBefore : blueIds();
        this.stageCombatTime += 0.05;
        this.updateTacticDeck(0.05);
        if (this.tacticRun && !firedBefore && this.tacticRun.cards[0].fired) {
          freshIds = [...blueIds()].filter((id) => !idsBefore.has(id));
          out.added = this.tacticRun.cards[0].delivered;
        }
      }
      out.speed = run.speed;
      const tr = this.tacticRun;
      if (withDeck && tr) {
        out.rushFired = tr.cards[1].fired;
        out.fresh = freshIds.length;
        // Fresh Bobos joined the formation: each still alive sits on (or right next to) its formation slot
        let seated = freshIds.length === out.added;
        for (const u of this.units) {
          if (!u.active || u.team !== 'blue' || !freshIds.includes(u.id)) continue;
          if (u.sledSlotX === undefined || u.sledSlotZ === undefined) seated = false;
          else if (Math.abs(u.x - u.sledSlotX) > 0.8 || Math.abs(u.z - u.sledSlotZ) > 0.8) seated = false;
        }
        out.seated = seated;
        run.distance = run.courseLength * 0.81;
        this.updateTacticDeck(0.016);
        out.finalDelivered = tr.cards[2].fired ? tr.cards[2].delivered : -1;
        out.total = tr.bobosAdded;
      }
      return out;
    };
    const modeOk = (kind: ModeKind): boolean => {
      const plain = modeRun(kind, false);
      const deck = modeRun(kind, true);
      stats[`${kind}PlainSpeed`] = Number(plain.speed.toFixed(2));
      stats[`${kind}RushSpeed`] = Number(deck.speed.toFixed(2));
      stats[`${kind}CrowdAdded`] = deck.added;
      stats[`${kind}FinalAdded`] = deck.finalDelivered;
      return (
        deck.rushFired &&
        deck.speed > plain.speed * 1.1 &&
        deck.speed <= deck.base * (1 + TACTIC_RUSH_CAP) + 0.01 &&
        deck.added === TACTIC_CARDS.crowd_open.value &&
        deck.fresh === deck.added &&
        deck.seated &&
        deck.finalDelivered === TACTIC_CARDS.crowd_final.value &&
        deck.total === TACTIC_CARDS.crowd_open.value + TACTIC_CARDS.crowd_final.value &&
        deck.total <= TACTIC_CROWD_CAP
      );
    };
    const tacticLavaCrowdAndRush = modeOk('lava');
    const tacticSledCrowdAndRush = modeOk('sled');
    const tacticAsteroidCrowdAndRush = modeOk('asteroid');

    // 26. Lava fix: reinforcements arriving while the front has landed on a row but the tail is still behind it are
    //     seated on their own slot / row / platform (booked row matches where they are; squeezed onto the platform)
    let tacticLavaMidHopReinforcementsSeated = false;
    st.tacticDeck = ['crowd_open', null, null];
    this.loadLevel(generateLavaJumpLevel(1));
    killReds();
    clearShields();
    this.snapLavaBobosToSlots();
    const sM = this.lavaRun;
    if (sM && this.tacticRun) {
      const rows = sM.rows;
      const last = rows.length - 1;
      const rowConsistent = (u: Unit, slack = 0.35): boolean => {
        const r = u.lavaRow ?? -1;
        if (r < 0 || r > last) return false;
        const du = sM.distance + (SLED_Z - u.z);
        if (du < rows[r].start - slack) return false;
        if (r < last && du >= rows[r + 1].start + 0.05) return false;
        if (du <= rows[r].end + 0.25 && u.lavaPlat !== undefined && u.lavaPlat >= 0) {
          const p = rows[r].platforms[u.lavaPlat];
          if (!p || Math.abs(u.x - p.cfg.x) > p.cfg.width * 0.5 + 1e-3) return false;
        }
        return true;
      };
      this.stageCombatTime = 0;
      let split = false;
      for (let i = 0; i < 600 && sM.active; i++) {
        this.turretX = this.getLavaAutopilotX();
        this.turretTargetX = this.turretX;
        sM.slowTimer = 0;
        this.updateLavaJump(0.05);
        let maxRow = 0;
        let behind = false;
        for (const u of this.units) if (u.active && u.team === 'blue') maxRow = Math.max(maxRow, u.lavaRow ?? 0);
        for (const u of this.units) if (u.active && u.team === 'blue' && (u.lavaRow ?? 0) < maxRow) behind = true;
        if (maxRow >= 2 && behind) {
          split = true;
          stats.midHopRow = maxRow;
          break;
        }
      }
      if (split) {
        const base = sM.baseSpeed;
        sM.baseSpeed = 0.0001;
        sM.speed = 0;
        const before = blueIds();
        this.stageCombatTime = 1.05;
        this.updateTacticDeck(0.016);
        const fresh = [...blueIds()].filter((id) => !before.has(id));
        for (let i = 0; i < 12; i++) this.updateLavaJump(0.05);
        let freshOk = fresh.length === TACTIC_CARDS.crowd_open.value;
        let frontRowFresh = 0;
        let maxRow = 0;
        for (const u of this.units) if (u.active && u.team === 'blue') maxRow = Math.max(maxRow, u.lavaRow ?? 0);
        for (const u of this.units) {
          if (!u.active || u.team !== 'blue' || !fresh.includes(u.id)) continue;
          if (!rowConsistent(u)) freshOk = false;
          if ((u.lavaRow ?? 0) === maxRow) frontRowFresh++;
        }
        // Resume the run: everyone (old & new) keeps a booked row that matches where they are
        sM.baseSpeed = base;
        for (let i = 0; i < 40 && sM.active; i++) {
          this.turretX = this.getLavaAutopilotX();
          this.turretTargetX = this.turretX;
          sM.slowTimer = 0;
          this.updateLavaJump(0.05);
        }
        // Later formation reshuffles (gates / losses) may slide a row back by a slot or two: allow that slack here
        let allConsistent = true;
        for (const u of this.units) {
          if (u.active && u.team === 'blue' && fresh.includes(u.id) && !rowConsistent(u, 0.35 + LAVA_ROW_SPACING * 2)) allConsistent = false;
        }
        tacticLavaMidHopReinforcementsSeated = freshOk && allConsistent && (this.tacticRun?.bobosAdded ?? 0) === fresh.length;
        stats.midHopFresh = fresh.length;
        stats.midHopFreshOnFrontRow = frontRowFresh;
      }
    }
    this.turretX = 0;
    this.turretTargetX = 0;

    // Restore the original state cleanly
    st.gold = snap.gold;
    st.scarabBadges = snap.scarabBadges;
    st.lifetimeScarabBadges = snap.lifetimeScarabBadges;
    st.pyramidRunClears = snap.pyramidRunClears;
    st.bestPyramidFinishSec = snap.bestPyramidFinishSec;
    st.bestPyramidSurvivors = snap.bestPyramidSurvivors;
    st.totalPyramidTrapsDodged = snap.totalPyramidTrapsDodged;
    st.totalPyramidBobosLost = snap.totalPyramidBobosLost;
    st.ownedTacticCards = snap.ownedTacticCards;
    st.tacticDeck = snap.tacticDeck;
    st.totalTacticTriggers = snap.totalTacticTriggers;
    st.tacticCampaignEnabled = snap.tacticCampaignEnabled;
    st.trophyHallSlots = snap.trophyHallSlots;
    st.trophyDisplay = snap.trophyDisplay;
    st.save();
    this.syncTrophyPedestal3D(true);
    this.turretX = prevTurretX;
    this.turretTargetX = prevTurretTargetX;
    this.onStageEnd = prevOnStageEnd;
    this.onBanner = prevOnBanner;
    this.onTacticTrigger = prevOnTactic;
    this.tacticProfileOverride = null;
    if (prevLevel) {
      this.loadLevel(prevLevel);
    }
    this.isPaused = prevPaused;

    const ok =
      pyramidSpawnedInDesert &&
      desertDecorRestoresAcrossModes &&
      crowdRunsAndPassageScrolls &&
      crowdSteersAndBobosFollow &&
      unitGateAddsBobos &&
      quicksandDragsPace &&
      quicksandSwallowsLingeringBobos &&
      shieldPullsBoboOutOfSand &&
      stonePathCrossesSafely &&
      slabCyclesWarnOpenClose &&
      openSlabFlingsBobos &&
      closedSlabCrossesSafely &&
      shieldAbsorbsSlabFling &&
      exitGateWinsStage &&
      timeoutLosesStage &&
      wipeoutLosesStage &&
      autopilotClearsTier1 &&
      tiersScale &&
      badgesScaleWithTimeSurvivorsAndTraps &&
      badgesPersistedWithMilestone &&
      scarabTrophyReadsCounter &&
      tacticCampaignCoefficientScales &&
      tacticCampaignCapsScaled &&
      tacticLobbyModesFullStrength &&
      tacticCampaignSwitchPersists &&
      tacticLavaCrowdAndRush &&
      tacticLavaMidHopReinforcementsSeated &&
      tacticSledCrowdAndRush &&
      tacticAsteroidCrowdAndRush;
    return {
      ok,
      pyramidSpawnedInDesert,
      desertDecorRestoresAcrossModes,
      crowdRunsAndPassageScrolls,
      crowdSteersAndBobosFollow,
      unitGateAddsBobos,
      quicksandDragsPace,
      quicksandSwallowsLingeringBobos,
      shieldPullsBoboOutOfSand,
      stonePathCrossesSafely,
      slabCyclesWarnOpenClose,
      openSlabFlingsBobos,
      closedSlabCrossesSafely,
      shieldAbsorbsSlabFling,
      exitGateWinsStage,
      timeoutLosesStage,
      wipeoutLosesStage,
      autopilotClearsTier1,
      tiersScale,
      badgesScaleWithTimeSurvivorsAndTraps,
      badgesPersistedWithMilestone,
      scarabTrophyReadsCounter,
      tacticCampaignCoefficientScales,
      tacticCampaignCapsScaled,
      tacticLobbyModesFullStrength,
      tacticCampaignSwitchPersists,
      tacticLavaCrowdAndRush,
      tacticLavaMidHopReinforcementsSeated,
      tacticSledCrowdAndRush,
      tacticAsteroidCrowdAndRush,
      stats,
    };
  }

  /**
   * MC-17 self-check: the jungle temple vine swing (scene switch across every dedicated backdrop, pace, steering, gates,
   * vine sway / grab / swing / miss / shield float, boulder wake / roll / flatten / side-step / shield, win / loss,
   * autopilot clear, tiers, 翡翠神像徽章 settlement & the 11th trophy, tactic cards in the jungle at lobby strength),
   * the lava regular-gate seating fix, and that none of these numbers move when Math.random is pinned to either
   * extreme. Bobo-tech random spawn shields are switched off for the duration. Restores the save, the level and every
   * callback afterwards.
   */
  public runMc17SelfCheck(): {
    ok: boolean;
    jungleSpawnedInTemple: boolean;
    jungleDecorRestoresAcrossModes: boolean;
    crowdRunsAndPathScrolls: boolean;
    crowdSteersAndBobosFollow: boolean;
    unitGateAddsSeatedBobos: boolean;
    vineSwaysOnRunClock: boolean;
    vineCarriesSquadAcrossChasm: boolean;
    missedVineDropsBobos: boolean;
    shieldFloatsBoboAcross: boolean;
    boulderWakesAndRolls: boolean;
    boulderFlattensBobosInLane: boolean;
    sideStepDodgesBoulder: boolean;
    shieldAbsorbsBoulder: boolean;
    boulderDropsIntoChasmInItsWay: boolean;
    templeExitWinsStage: boolean;
    timeoutLosesStage: boolean;
    wipeoutLosesStage: boolean;
    autopilotClearsTier1: boolean;
    tiersScale: boolean;
    badgesScaleWithTimeSurvivorsAndTraps: boolean;
    badgesPersistedWithMilestone: boolean;
    emeraldTrophyReadsCounter: boolean;
    tacticCardsAtLobbyStrength: boolean;
    lavaGateReinforcementsSeated: boolean;
    checksStableUnderRandomExtremes: boolean;
    stats: Record<string, number>;
  } {
    const st = this.state;
    const prevPaused = this.isPaused;
    const prevLevel = this.currentLevel;
    const prevOnStageEnd = this.onStageEnd;
    const prevOnBanner = this.onBanner;
    const prevOnTactic = this.onTacticTrigger;
    const prevTurretX = this.turretX;
    const prevTurretTargetX = this.turretTargetX;
    const prevRandom = Math.random;
    const snap = {
      gold: st.gold,
      emeraldIdolBadges: st.emeraldIdolBadges,
      lifetimeEmeraldIdolBadges: st.lifetimeEmeraldIdolBadges,
      jungleSwingClears: st.jungleSwingClears,
      bestJungleFinishSec: st.bestJungleFinishSec,
      bestJungleSurvivors: st.bestJungleSurvivors,
      totalJungleTrapsDodged: st.totalJungleTrapsDodged,
      totalJungleBobosLost: st.totalJungleBobosLost,
      ownedTacticCards: [...st.ownedTacticCards],
      tacticDeck: [...st.tacticDeck],
      totalTacticTriggers: st.totalTacticTriggers,
      tacticCampaignEnabled: st.tacticCampaignEnabled,
      trophyHallSlots: st.trophyHallSlots,
      trophyDisplay: [...st.trophyDisplay],
      boboTechLevels: { ...st.boboTechLevels },
      activeBoboTechDoctrine: st.activeBoboTechDoctrine,
    };
    const stats: Record<string, number> = {};
    this.isPaused = true;
    this.onStageEnd = undefined;
    this.onBanner = undefined;
    this.onTacticTrigger = undefined;
    this.tacticProfileOverride = null;
    // Deterministic numbers: no tactic cards, no Bobo-tech random spawn shields, no milestone bonuses
    st.tacticDeck = [null, null, null];
    st.tacticCampaignEnabled = true;
    st.boboTechLevels = { vanguard_charge: 0, heavy_siege: 0, candy_bombard: 0 };
    st.activeBoboTechDoctrine = 'vanguard_charge';
    st.emeraldIdolBadges = 0;
    st.lifetimeEmeraldIdolBadges = 0;
    const bobos = (): number => this.getLavaBoboCount();
    const blueIds = (): Set<number> => {
      const set = new Set<number>();
      for (const u of this.units) if (u.active && u.team === 'blue') set.add(u.id);
      return set;
    };
    const clearShields = (): void => {
      for (const u of this.units) {
        if (u.active) {
          u.frostShield = false;
          u.petShellGranted = false;
        }
      }
    };
    const shieldAll = (): void => {
      for (const u of this.units) if (u.active && u.team === 'blue') u.frostShield = true;
    };
    const shieldsLeft = (): number => {
      let n = 0;
      for (const u of this.units) if (u.active && u.team === 'blue' && u.frostShield) n++;
      return n;
    };
    const killReds = (): void => {
      for (const u of this.units) if (u.active && u.team === 'red') u.active = false;
    };
    const loadJg = (tier = 1): JungleSwingRuntime | null => {
      this.loadLevel(generateJungleSwingLevel(tier));
      killReds();
      clearShields();
      this.snapJungleBobosToSlots();
      return this.jungleRun;
    };
    /** Marks every course item behind `dist` as already handled (so jumping the distance never re-triggers them). */
    const skipBehind = (dist: number): void => {
      for (const g of this.jungleGates) if (g.cfg.d < dist + JG_FRONT_OFFSET + 0.5) g.resolved = true;
      for (const c of this.jungleChasms) {
        if (c.cfg.d + c.cfg.gap < dist - 1) {
          c.locked = true;
          c.passed = true;
        }
      }
      for (const b of this.jungleBoulders) {
        if (b.cfg.d < dist - 1) {
          b.passed = true;
          b.state = 'gone';
        }
      }
    };
    /** Parks the squad line at x with the front at course distance `frontDu` (no pace of its own). */
    const parkAt = (s: JungleSwingRuntime, frontDu: number, x: number): void => {
      skipBehind(frontDu - 4);
      s.x = x;
      this.turretX = x;
      this.turretTargetX = x;
      s.baseSpeed = 0.0001;
      s.speed = 0;
      s.distance = frontDu - JG_FRONT_OFFSET;
      this.snapJungleBobosToSlots();
      clearShields();
    };
    /** Walks the parked squad forward by `step` metres per 16 ms frame until `done` (or the step budget runs out). */
    const walk = (s: JungleSwingRuntime, done: () => boolean, step = 0.12, maxSteps = 600, onStep?: () => void): void => {
      for (let i = 0; i < maxSteps && s.active && !done(); i++) {
        s.distance += step;
        this.updateJungleSwing(0.016);
        onStep?.();
      }
    };
    /** A run clock at which vine `vi` of chasm `c` is at the far end of its sway (it barely moves for a while). */
    const peakClock = (c: JungleChasmRuntime, vi: number): number => {
      const v = c.vines[vi].cfg;
      return ((((v.period / 4 - v.offset) % v.period) + v.period) % v.period) + v.period * 3;
    };

    // 1. Load the jungle run -> jungle tint over the emerald base, temple floor, gates, chasms + vines, boulders, exit
    const lvl = generateJungleSwingLevel(1);
    const s0 = loadJg();
    const start = bobos();
    let redCount = 0;
    for (const u of this.units) if (u.active && u.team === 'red') redCount++;
    const course = lvl.jungleCourse;
    const scene0 = this.getDedicatedSceneSnapshot();
    const jungleSpawnedInTemple = Boolean(
      lvl.isJungleSwing &&
        lvl.mode === 'jungle_swing' &&
        this.currentTheme.id === lvl.themeId &&
        s0 &&
        s0.active &&
        s0.courseGroup.parent === this.levelGroup &&
        scene0.kind === 'jungle' &&
        scene0.skyHex === JG_JUNGLE_SKY &&
        scene0.abyssHex === DEDICATED_ABYSS_TINT.jungle &&
        !scene0.landmarks &&
        this.jungleGates.length >= 6 &&
        this.jungleChasms.length >= 3 &&
        this.jungleChasms.every((c) => c.vines.length === 2) &&
        this.jungleBoulders.length >= 3 &&
        this.jungleExitGroup !== null &&
        !this.bossGroup.visible &&
        !this.turretGroup.visible &&
        this.pyramidRun === null &&
        this.pumpkinRun === null &&
        start === (course?.startBobos ?? -1) &&
        redCount === 0 &&
        course !== undefined &&
        s0.timeLimit === course.timeLimitSec &&
        course.timeLimitSec > course.length / course.baseSpeed &&
        course.length / course.baseSpeed >= 25 &&
        course.length / course.baseSpeed <= 35
    );
    stats.startBobos = start;
    stats.courseLength = course?.length ?? 0;
    stats.timeLimit = course?.timeLimitSec ?? 0;
    stats.paceSec = course ? Number((course.length / course.baseSpeed).toFixed(1)) : 0;
    stats.gates = this.jungleGates.length;
    stats.chasms = this.jungleChasms.length;
    stats.boulders = this.jungleBoulders.length;

    // 2. Scene switch: jungle -> desert -> night castle -> campaign (daytime) -> jungle -> lava (daytime)
    this.loadLevel(generatePyramidRunLevel(1));
    const sDesert = this.getDedicatedSceneSnapshot();
    const desertOk = sDesert.kind === 'desert' && sDesert.skyHex === PY_DESERT_SKY && !sDesert.landmarks &&
      sDesert.abyssHex === DEDICATED_ABYSS_TINT.desert && this.jungleRun === null && this.pyramidRun !== null;
    this.loadLevel(generatePumpkinNightLevel(1));
    const sNight = this.getDedicatedSceneSnapshot();
    const nightOk = sNight.kind === 'night_castle' && sNight.skyHex === PK_NIGHT_SKY && !sNight.landmarks &&
      sNight.abyssHex === DEDICATED_ABYSS_TINT.night_castle && this.jungleRun === null && this.pyramidRun === null;
    this.loadLevel(generateDynamicLevel(1));
    const sDay = this.getDedicatedSceneSnapshot();
    const dayOk = sDay.kind === 'none' && sDay.landmarks && sDay.abyssHex === 0xffffff &&
      sDay.skyHex === this.currentTheme.skyColor && this.jungleRun === null && this.jungleBoulders.length === 0;
    this.loadLevel(generateJungleSwingLevel(1));
    const sJungle2 = this.getDedicatedSceneSnapshot();
    const jungle2Ok = sJungle2.kind === 'jungle' && sJungle2.skyHex === JG_JUNGLE_SKY && !sJungle2.landmarks &&
      sJungle2.abyssHex === DEDICATED_ABYSS_TINT.jungle && this.jungleRun !== null;
    const lanesBefore = this.jungleBoulders.map((b) => b.lane);
    this.loadLevel(generateLavaJumpLevel(1));
    const sLava = this.getDedicatedSceneSnapshot();
    const lavaOk = sLava.kind === 'none' && sLava.landmarks && sLava.abyssHex === 0xffffff &&
      sLava.skyHex !== JG_JUNGLE_SKY && this.jungleRun === null && lanesBefore.every((l) => l.parent === null);
    const jungleDecorRestoresAcrossModes = desertOk && nightOk && dayOk && jungle2Ok && lavaOk;

    // 3. The squad runs forward: the temple path scrolls toward the camera, the clock ticks, Bobos hop
    let crowdRunsAndPathScrolls = false;
    const sR = loadJg();
    if (sR) {
      const z0 = sR.courseGroup.position.z;
      const t0 = sR.timeLeft;
      let minRide = Infinity;
      let maxRide = -Infinity;
      for (let i = 0; i < 40 && sR.active; i++) {
        this.turretX = this.getJungleAutopilotX();
        this.updateJungleSwing(0.05);
        for (const u of this.units) {
          if (u.active && u.team === 'blue') {
            maxRide = Math.max(maxRide, u.rideY || 0);
            minRide = Math.min(minRide, u.rideY || 0);
          }
        }
      }
      crowdRunsAndPathScrolls =
        sR.distance > 6 && sR.courseGroup.position.z > z0 + 6 && sR.timeLeft < t0 && sR.speed > 3 && sR.clock > 1.9 && maxRide - minRide > 0.05;
      stats.distAfter2s = Number(sR.distance.toFixed(2));
    }

    // 4. Steering: the squad line follows the cannon aim and the Bobos follow (real simulateUnits)
    let crowdSteersAndBobosFollow = false;
    const s1 = loadJg();
    if (s1) {
      s1.baseSpeed = 2.0;
      this.turretX = 5.5;
      this.turretTargetX = 5.5;
      for (let i = 0; i < 30; i++) {
        this.updateJungleSwing(0.05);
        this.simulateUnits(0.05);
      }
      let sumX = 0;
      let n = 0;
      for (const u of this.units) {
        if (u.active && u.team === 'blue') {
          sumX += u.x;
          n++;
        }
      }
      const avgX = n > 0 ? sumX / n : 0;
      crowdSteersAndBobosFollow = s1.x > 4.5 && avgX > 3.5 && n === start;
      stats.boboAvgX = Number(avgX.toFixed(2));
    }
    this.turretX = 0;
    this.turretTargetX = 0;

    // 5. Unit gate: the gate under the squad centre adds exactly +N Bobos, seated straight onto their formation slots
    //    (no random scatter); its pair resolves without triggering
    let unitGateAddsSeatedBobos = false;
    const s2 = loadJg();
    const addGate = this.jungleGates.find((g) => g.cfg.op === 'add');
    if (s2 && addGate) {
      parkAt(s2, addGate.cfg.d - 0.4, addGate.cfg.x);
      const before = bobos();
      const idsBefore = blueIds();
      this.updateJungleSwing(0.016);
      const notYet = !addGate.resolved;
      s2.distance += 0.6;
      this.updateJungleSwing(0.016);
      const after = bobos();
      const fresh = [...blueIds()].filter((id) => !idsBefore.has(id));
      let seated = fresh.length === addGate.cfg.value;
      for (const u of this.units) {
        if (!u.active || !fresh.includes(u.id)) continue;
        if (u.sledSlotX === undefined || u.sledSlotZ === undefined) seated = false;
        else if (Math.abs(u.x - u.sledSlotX) > 0.35 || Math.abs(u.z - u.sledSlotZ) > 0.35) seated = false;
      }
      const pair = this.jungleGates.find((g) => g !== addGate && g.cfg.d === addGate.cfg.d);
      unitGateAddsSeatedBobos =
        notYet && addGate.resolved && addGate.triggered && after === before + addGate.cfg.value && this.jungleGatesPassed === 1 &&
        Boolean(pair && pair.resolved && !pair.triggered) && seated;
      stats.gateAdded = after - before;
    }

    // 6. Vine sway: each vine's grab point swings across its half of the path on the run clock (the 3D vine follows)
    let vineSwaysOnRunClock = false;
    const s3 = loadJg();
    const c3 = this.jungleChasms[0];
    if (s3 && c3) {
      const v = c3.vines[0];
      const tPeak = peakClock(c3, 0);
      const xPeak = this.getJungleVineX(v.cfg, tPeak);
      const xTrough = this.getJungleVineX(v.cfg, tPeak + v.cfg.period / 2);
      s3.clock = tPeak;
      this.updateJungleVines(0);
      const rotPeak = v.pivot.rotation.z;
      s3.clock = tPeak + v.cfg.period / 2;
      this.updateJungleVines(0);
      const rotTrough = v.pivot.rotation.z;
      const expected = (x: number): number => Math.asin(THREE.MathUtils.clamp((x - v.cfg.x) / JG_VINE_LEN, -0.95, 0.95));
      vineSwaysOnRunClock =
        Math.abs(xPeak - xTrough - 2 * v.cfg.amp) < 1e-6 &&
        Math.abs(rotPeak - expected(xPeak)) < 1e-6 &&
        Math.abs(rotTrough - expected(xTrough)) < 1e-6 &&
        Math.abs(xPeak) <= 4.0 + 1e-6 &&
        Math.abs(xTrough) <= 4.0 + 1e-6 &&
        (() => {
          // The two vines of a chasm sway over different halves, out of step: they are far apart for part of the cycle
          let maxApart = 0;
          for (let tc = 0; tc < v.cfg.period * 2; tc += 0.05) {
            maxApart = Math.max(maxApart, Math.abs(this.getJungleVineX(c3.vines[1].cfg, tc) - this.getJungleVineX(v.cfg, tc)));
          }
          return maxApart > 4;
        })();
      stats.vineAmp = v.cfg.amp;
      stats.vinePeriod = v.cfg.period;
    }

    // 7. Lined up under a vine as the front reaches the edge: the vine is grabbed and the whole squad swings across
    //    (nobody lost, Bobos arc over the gap, the vine swings along the course, the chasm counts as dodged)
    let vineCarriesSquadAcrossChasm = false;
    const crossChasm = (
      mode: 'aligned' | 'missed',
      shielded: boolean
    ): { lost: number; before: number; c: JungleChasmRuntime | null; maxRide: number; maxSwing: number; shieldsLeft: number } => {
      const s = loadJg();
      const c = this.jungleChasms[0];
      if (!s || !c) return { lost: -1, before: 0, c: null, maxRide: 0, maxSwing: 0, shieldsLeft: 0 };
      const half = this.getLavaSquadHalfWidth(bobos());
      let clock = peakClock(c, 0);
      let x = this.getJungleVineX(c.vines[0].cfg, clock);
      if (mode === 'missed') {
        // The clock / line pair farthest from both vines
        let best = -Infinity;
        for (let tc = 0; tc < c.vines[0].cfg.period * 2; tc += 0.05) {
          const vx = c.vines.map((vv) => this.getJungleVineX(vv.cfg, tc + 4 * c.vines[0].cfg.period));
          for (let xx = -s.maxSteerX; xx <= s.maxSteerX + 0.01; xx += 0.1) {
            const dmin = Math.min(...vx.map((q) => Math.abs(q - xx)));
            if (dmin > best) {
              best = dmin;
              clock = tc + 4 * c.vines[0].cfg.period;
              x = xx;
            }
          }
        }
        stats.missGap = Number((best - c.cfg.reach - half).toFixed(2));
      }
      parkAt(s, c.cfg.d - 0.2, x);
      if (shielded) shieldAll();
      s.clock = clock;
      const before = bobos();
      let maxRide = 0;
      let maxSwing = 0;
      walk(s, () => c.passed, 0.12, 600, () => {
        for (const u of this.units) if (u.active && u.team === 'blue') maxRide = Math.max(maxRide, u.rideY || 0);
        for (const v of c.vines) maxSwing = Math.max(maxSwing, Math.abs(v.pivot.rotation.x));
      });
      return { lost: before - bobos(), before, c, maxRide, maxSwing, shieldsLeft: shieldsLeft() };
    };
    const aligned = crossChasm('aligned', false);
    vineCarriesSquadAcrossChasm = Boolean(
      aligned.c &&
        aligned.c.locked &&
        aligned.c.leadGrabbed &&
        aligned.c.passed &&
        aligned.lost === 0 &&
        aligned.c.fell === 0 &&
        aligned.c.riders.size === aligned.before &&
        aligned.maxRide > 1.2 &&
        aligned.maxSwing > 0.1 &&
        this.jungleVineSwings === 1 &&
        this.jungleTrapsDodged === 1
    );
    stats.swingMaxRide = Number(aligned.maxRide.toFixed(2));

    // 8. Missing the vine: the Bobos out of its reach fall into the chasm (capped per chasm), the rest scramble across
    const missed = crossChasm('missed', false);
    const missedVineDropsBobos = Boolean(
      missed.c &&
        missed.c.locked &&
        !missed.c.leadGrabbed &&
        missed.c.passed &&
        missed.lost === missed.c.cfg.knockCap &&
        missed.c.fell === missed.lost &&
        this.jungleChasmFell === missed.lost &&
        this.jungleChasmHits === 1 &&
        this.jungleTrapsDodged === 0 &&
        bobos() === missed.before - missed.lost &&
        (stats.missGap ?? -1) > 0
    );
    stats.chasmFell = missed.lost;

    // 9. A candy shield floats a Bobo that missed the vine across instead (shield spent, nobody lost)
    const floated = crossChasm('missed', true);
    const shieldFloatsBoboAcross = Boolean(
      floated.c &&
        floated.lost === 0 &&
        floated.c.fell === 0 &&
        floated.c.floated >= 1 &&
        floated.shieldsLeft < floated.before &&
        this.jungleShieldSaves >= 1
    );

    // 10. Boulders rest on their ramp until the squad front comes within wakeD, then roll down their lane toward it
    let boulderWakesAndRolls = false;
    const s4 = loadJg();
    const b4 = this.jungleBoulders[0];
    if (s4 && b4) {
      parkAt(s4, b4.cfg.d - b4.cfg.wakeD - 2, b4.cfg.x > 0 ? b4.cfg.x - 6 : b4.cfg.x + 6);
      for (let i = 0; i < 10; i++) this.updateJungleSwing(0.016);
      const restedOk = b4.state === 'resting' && b4.du === b4.cfg.d;
      s4.distance += 2.5;
      this.updateJungleSwing(0.016);
      const du1 = b4.du;
      const spin1 = b4.spin;
      for (let i = 0; i < 10; i++) this.updateJungleSwing(0.016);
      boulderWakesAndRolls =
        restedOk &&
        b4.state === 'rolling' &&
        b4.warned &&
        b4.du < du1 - b4.cfg.speed * 0.1 &&
        b4.spin > spin1 &&
        b4.lane.visible &&
        b4.laneMat.opacity > 0.15 &&
        Math.abs(b4.lane.position.x - b4.cfg.x) < 1e-6;
    }

    // 11-13. A rolling boulder through the squad: in its lane Bobos are flattened (capped) and the squad stumbles; a
    //        side-step out of the lane dodges it; candy shields absorb it
    const boulderRun = (
      offset: number,
      shielded: boolean
    ): { lost: number; before: number; b: JungleBoulderRuntime | null; stumbled: boolean; shieldsLeft: number } => {
      const s = loadJg();
      const b = this.jungleBoulders[0];
      if (!s || !b) return { lost: -1, before: 0, b: null, stumbled: false, shieldsLeft: 0 };
      // Park the squad ~9 m below the ramp (already woken) with no chasm in between
      let front = b.cfg.d - 9;
      for (const c of this.jungleChasms) if (c.cfg.d < b.cfg.d) front = Math.max(front, c.cfg.d + c.cfg.gap + 3);
      parkAt(s, front, THREE.MathUtils.clamp(b.cfg.x + offset, -s.maxSteerX, s.maxSteerX));
      if (shielded) shieldAll();
      const before = bobos();
      let stumbled = false;
      for (let i = 0; i < 900 && s.active && !b.passed; i++) {
        this.updateJungleSwing(0.016);
        if (s.slowTimer > 0) stumbled = true;
      }
      return { lost: before - bobos(), before, b, stumbled, shieldsLeft: shieldsLeft() };
    };
    const inLane = boulderRun(0, false);
    const boulderFlattensBobosInLane = Boolean(
      inLane.b &&
        inLane.b.passed &&
        inLane.lost >= 1 &&
        inLane.lost <= inLane.b.cfg.knockCap &&
        inLane.b.knocked === inLane.lost &&
        this.jungleBoulderFlattened === inLane.lost &&
        this.jungleBoulderHits === 1 &&
        inLane.stumbled &&
        this.jungleTrapsDodged === 0
    );
    stats.boulderFlattened = inLane.lost;
    const n16Half = this.getLavaSquadHalfWidth(start);
    const sideStep = boulderRun((this.jungleBoulders[0]?.cfg.radius ?? 1.3) + n16Half + 1.2, false);
    const sideStepDodgesBoulder = Boolean(
      sideStep.b && sideStep.b.passed && sideStep.lost === 0 && sideStep.b.knocked === 0 && this.jungleTrapsDodged === 1 && !sideStep.stumbled
    );
    const shieldRoll = boulderRun(0, true);
    const shieldAbsorbsBoulder = Boolean(
      shieldRoll.b &&
        shieldRoll.lost === 0 &&
        shieldRoll.b.touched.size >= 1 &&
        shieldRoll.shieldsLeft < shieldRoll.before &&
        this.jungleShieldSaves >= 1
    );

    // 13b. A boulder whose way down to the squad crosses a chasm drops into it (its warning lane stops at that lip)
    let boulderDropsIntoChasmInItsWay = false;
    const sB = loadJg();
    const bB = this.jungleBoulders[0];
    const cB = bB ? this.jungleChasms.filter((c) => c.cfg.d + c.cfg.gap < bB.cfg.d).pop() : undefined;
    if (sB && bB && cB) {
      parkAt(sB, cB.cfg.d - 6, bB.cfg.x);
      const before = bobos();
      let laneClipped = true;
      let laneSeen = false;
      let fell = false;
      for (let i = 0; i < 400 && sB.active && bB.state !== 'gone'; i++) {
        this.updateJungleSwing(0.016);
        if (bB.state === 'falling') fell = true;
        if (bB.lane.visible) {
          laneSeen = true;
          const laneEnd = bB.lane.position.z + bB.lane.scale.y / 2;
          if (laneEnd > sB.courseGroup.position.z - (cB.cfg.d + cB.cfg.gap) + 0.01) laneClipped = false;
        }
      }
      boulderDropsIntoChasmInItsWay =
        fell && bB.state === 'gone' && laneSeen && laneClipped && bB.passed && bB.knocked === 0 && bobos() === before && bB.du > cB.cfg.d;
    }

    // 14. Reaching the temple gate before the countdown ends wins; 15. timeout; 16. wipeout
    let templeExitWinsStage = false;
    const sC = loadJg();
    if (sC) {
      skipBehind(sC.courseLength);
      sC.distance = sC.courseLength - 0.05;
      sC.speed = sC.baseSpeed;
      this.updateJungleSwing(0.05);
      templeExitWinsStage = this.isStageEnded && this.lastStageVictory && sC.state === 'finished' && this.getJungleProgressPct() === 100;
    }
    let timeoutLosesStage = false;
    const sD = loadJg();
    if (sD) {
      sD.timeLeft = 0.01;
      this.updateJungleSwing(0.05);
      timeoutLosesStage = this.isStageEnded && !this.lastStageVictory && sD.state === 'timeout';
    }
    let wipeoutLosesStage = false;
    const sE = loadJg();
    if (sE) {
      for (const u of this.units) if (u.active && u.team === 'blue') this.knockJungleBobo(u, true);
      this.updateJungleSwing(0.05);
      wipeoutLosesStage = this.isStageEnded && !this.lastStageVictory && sE.state === 'wiped';
    }

    // 17. Tier 1 is clearable in ~30 s by a careful line (autopilot through the real update + simulateUnits loop)
    let autopilotClearsTier1 = false;
    const autoRun = (): Record<string, number> => {
      const sF = loadJg();
      const out: Record<string, number> = { finished: 0 };
      if (!sF) return out;
      let steps = 0;
      while (sF.active && steps < 1200) {
        this.turretX = this.getJungleAutopilotX();
        this.turretTargetX = this.turretX;
        this.updateJungleSwing(0.05);
        this.simulateUnits(0.05);
        steps++;
      }
      out.finished = sF.state === 'finished' && this.lastStageVictory ? 1 : 0;
      out.finishSec = this.jungleFinishSec;
      out.survivors = this.jungleBoboCount;
      out.gates = this.jungleGatesPassed;
      out.swings = this.jungleVineSwings;
      out.dodged = this.jungleTrapsDodged;
      out.lost = this.jungleBobosLost;
      out.chasmFell = this.jungleChasmFell;
      out.flattened = this.jungleBoulderFlattened;
      return out;
    };
    const auto = autoRun();
    autopilotClearsTier1 =
      auto.finished === 1 &&
      auto.finishSec >= 24 &&
      auto.finishSec <= 36 &&
      auto.survivors >= start &&
      auto.gates >= 3 &&
      auto.swings >= this.jungleChasms.length - 1 &&
      auto.dodged >= 3;
    stats.autoFinishSec = auto.finishSec ?? 0;
    stats.autoSurvivors = auto.survivors ?? 0;
    stats.autoGates = auto.gates ?? 0;
    stats.autoSwings = auto.swings ?? 0;
    stats.autoDodged = auto.dodged ?? 0;
    stats.autoLost = auto.lost ?? 0;
    this.turretX = 0;
    this.turretTargetX = 0;

    // 18. Tiers scale: faster pace, longer course, wider chasms, shorter vine reach, wider & faster sway, bigger and
    //     faster boulders (twin boulders from tier 5), higher caps
    const t1 = generateJungleSwingLevel(1);
    const t5 = generateJungleSwingLevel(5);
    const c1 = t1.jungleCourse;
    const c5 = t5.jungleCourse;
    const ch1 = t1.jungleChasms?.[0];
    const ch5 = t5.jungleChasms?.[0];
    const bo1 = t1.jungleBoulders?.[0];
    const bo5 = t5.jungleBoulders?.[0];
    const tiersScale = Boolean(
      c1 &&
        c5 &&
        ch1 &&
        ch5 &&
        bo1 &&
        bo5 &&
        c5.baseSpeed > c1.baseSpeed &&
        c5.length > c1.length &&
        ch5.gap > ch1.gap &&
        ch5.reach < ch1.reach &&
        ch5.vines[0].amp > ch1.vines[0].amp &&
        ch5.vines[0].period < ch1.vines[0].period &&
        ch5.knockCap > ch1.knockCap &&
        bo5.radius > bo1.radius &&
        bo5.speed > bo1.speed &&
        (t5.jungleBoulders?.length ?? 0) > (t1.jungleBoulders?.length ?? 99) &&
        st.getJungleSwingSpec(0).jungleTier === 1 &&
        st.getJungleSwingSpec(3).jungleTier === 4 &&
        st.getJungleSwingSpec(99).jungleTier === 8
    );

    // 19. Settlement: 翡翠神像徽章 scale with finish time + survivors + traps crossed and persist with a milestone
    const resetJg = (): void => {
      st.emeraldIdolBadges = 0;
      st.lifetimeEmeraldIdolBadges = 0;
      st.jungleSwingClears = 0;
      st.bestJungleFinishSec = 0;
    };
    resetJg();
    const slowRec = st.recordJungleSwingResult(true, 38, 41, 10, 8, 0, 100);
    resetJg();
    const baseMs = st.getEmeraldIdolMilestoneBonus(0);
    const fastRec = st.recordJungleSwingResult(true, 26, 41, 48, 6, 6, 100);
    const lossRec = st.recordJungleSwingResult(false, 41, 41, 12, 20, 1, 55);
    const saved = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}') as {
      emeraldIdolBadges?: number;
      jungleSwingClears?: number;
      bestJungleFinishSec?: number;
    };
    const boostedMs = st.getEmeraldIdolMilestoneBonus();
    const badgesScaleWithTimeSurvivorsAndTraps =
      fastRec.badgesAwarded > slowRec.badgesAwarded &&
      fastRec.timeBonusBadges === 2 &&
      fastRec.survivorBonusBadges === 3 &&
      fastRec.trapBonusBadges === 2 &&
      slowRec.timeBonusBadges === 0 &&
      slowRec.trapBonusBadges === 0 &&
      lossRec.badgesAwarded === 1 &&
      !lossRec.victory;
    const sBoost = loadJg();
    const badgesPersistedWithMilestone = Boolean(
      fastRec.milestoneReached &&
        fastRec.milestoneBonusCoins > 0 &&
        saved.emeraldIdolBadges === st.emeraldIdolBadges &&
        st.emeraldIdolBadges === fastRec.badgesAwarded + lossRec.badgesAwarded &&
        saved.jungleSwingClears === 1 &&
        saved.bestJungleFinishSec === 26 &&
        boostedMs.startBonusBobos > baseMs.startBonusBobos &&
        boostedMs.timeBonusSec > baseMs.timeBonusSec &&
        sBoost &&
        sBoost.timeLimit === (course?.timeLimitSec ?? 0) + boostedMs.timeBonusSec &&
        bobos() === start + boostedMs.startBonusBobos
    );
    stats.fastBadges = fastRec.badgesAwarded;
    stats.slowBadges = slowRec.badgesAwarded;

    // 20. Trophy hall: the 翡翠神像徽章奖杯 reads the existing lifetime counter (no duplicated copy) and buffs Bobo speed
    st.emeraldIdolBadges = 2;
    st.lifetimeEmeraldIdolBadges = 9;
    const metricOk = st.getHallTrophyMetric('emerald_idol_badge') === 9 && st.getHallTrophyTier('emerald_idol_badge') === 2;
    st.trophyHallSlots = 1;
    st.trophyDisplay = [null, null, null, null, null, null];
    const speedNoTrophy = st.getHallTrophyBuff('speed');
    const placedTrophy = st.placeTrophy(0, 'emerald_idol_badge');
    const emeraldTrophyReadsCounter =
      metricOk &&
      placedTrophy &&
      speedNoTrophy === 0 &&
      Math.abs(st.getHallTrophyBuff('speed') - 0.04) < 1e-9 &&
      HALL_TROPHY_ORDER.includes('emerald_idol_badge') &&
      HALL_TROPHY_ORDER.length === 11;
    st.emeraldIdolBadges = 0;
    st.lifetimeEmeraldIdolBadges = 0;
    st.trophyDisplay = [null, null, null, null, null, null];

    // 21. Tactic cards in the jungle run at lobby strength (×1.0): 10 shields, +15% pace, +6 Bobos seated on slots
    st.ownedTacticCards = [...TACTIC_CARD_ORDER];
    st.tacticDeck = ['shield_open', 'rush_open', 'crowd_open'];
    let tacticCardsAtLobbyStrength = false;
    const sT = loadJg();
    const trT = this.tacticRun;
    if (sT && trT) {
      const before = bobos();
      const idsBefore = blueIds();
      this.stageCombatTime = 1.05;
      this.updateTacticDeck(0.016);
      const fresh = [...blueIds()].filter((id) => !idsBefore.has(id));
      let seated = fresh.length === TACTIC_CARDS.crowd_open.value;
      for (const u of this.units) {
        if (!u.active || !fresh.includes(u.id)) continue;
        if (u.sledSlotX === undefined || Math.abs(u.x - u.sledSlotX) > 1e-6 || Math.abs(u.z - (u.sledSlotZ ?? 99)) > 1e-6) seated = false;
      }
      tacticCardsAtLobbyStrength =
        !this.isMainCampaignLevel() &&
        !trT.isCampaign &&
        trT.effectMult === 1 &&
        trT.shieldsGranted === TACTIC_CARDS.shield_open.value &&
        Math.abs(this.getTacticRushMult() - (1 + TACTIC_CARDS.rush_open.value)) < 1e-9 &&
        trT.bobosAdded === TACTIC_CARDS.crowd_open.value &&
        bobos() === before + TACTIC_CARDS.crowd_open.value &&
        seated;
    }
    st.tacticDeck = [null, null, null];

    // 22. Lava fix: the Bobos a regular +N gate adds while the squad tail is still behind the gate row are seated on
    //     their own slot / row / platform (booked row matches where they are, squeezed onto the platform under them)
    let lavaGateReinforcementsSeated = false;
    this.loadLevel(generateLavaJumpLevel(1));
    killReds();
    clearShields();
    this.snapLavaBobosToSlots();
    const sM = this.lavaRun;
    if (sM) {
      const rows = sM.rows;
      const last = rows.length - 1;
      const rowConsistent = (u: Unit, slack = 0.35): boolean => {
        const r = u.lavaRow ?? -1;
        if (r < 0 || r > last) return false;
        const du = sM.distance + (SLED_Z - u.z);
        if (du < rows[r].start - slack) return false;
        if (r < last && du >= rows[r + 1].start + 0.05) return false;
        if (du <= rows[r].end + 0.25 && u.lavaPlat !== undefined && u.lavaPlat >= 0) {
          const p = rows[r].platforms[u.lavaPlat];
          if (!p || Math.abs(u.x - p.cfg.x) > p.cfg.width * 0.5 + 1e-3) return false;
        }
        return true;
      };
      let fresh: number[] = [];
      let gateRow = -1;
      let gateValue = 0;
      for (let i = 0; i < 900 && sM.active && fresh.length === 0; i++) {
        this.turretX = this.getLavaAutopilotX();
        this.turretTargetX = this.turretX;
        sM.slowTimer = 0;
        const before = blueIds();
        const passedBefore = this.lavaGatesPassed;
        const triggeredBefore = new Set<LavaPlatformRuntime>();
        for (const r of rows) for (const p of r.platforms) if (p.gateTriggered) triggeredBefore.add(p);
        this.updateLavaJump(0.05);
        if (this.lavaGatesPassed > passedBefore) {
          fresh = [...blueIds()].filter((id) => !before.has(id));
          rows.forEach((r, ri) => {
            for (const p of r.platforms) {
              if (p.gateTriggered && !triggeredBefore.has(p)) {
                gateRow = ri;
                gateValue = p.cfg.gateOp === 'mul' ? -1 : p.cfg.gateValue ?? 0;
              }
            }
          });
        }
      }
      if (fresh.length > 0 && gateRow > 0) {
        let freshOk = gateValue < 0 || fresh.length === gateValue;
        let behindGateRow = 0;
        for (const u of this.units) {
          if (!u.active || u.team !== 'blue' || !fresh.includes(u.id)) continue;
          if (!rowConsistent(u)) freshOk = false;
          if ((u.lavaRow ?? 0) < gateRow) behindGateRow++;
        }
        // Resume the run: the fresh Bobos keep a booked row that matches where they are
        for (let i = 0; i < 40 && sM.active; i++) {
          this.turretX = this.getLavaAutopilotX();
          this.turretTargetX = this.turretX;
          sM.slowTimer = 0;
          this.updateLavaJump(0.05);
        }
        let allConsistent = true;
        for (const u of this.units) {
          if (u.active && u.team === 'blue' && fresh.includes(u.id) && !rowConsistent(u, 0.35 + LAVA_ROW_SPACING * 2)) allConsistent = false;
        }
        lavaGateReinforcementsSeated = freshOk && allConsistent && behindGateRow >= 1;
        stats.lavaGateRow = gateRow;
        stats.lavaGateFresh = fresh.length;
        stats.lavaGateFreshBehind = behindGateRow;
      }
    }
    this.turretX = 0;
    this.turretTargetX = 0;

    // 23. The jungle numbers above never depend on Math.random: rerun gate / vine / miss / boulder cases with
    //     Math.random pinned to each extreme and compare
    const probe = (): string => {
      const out: number[] = [];
      const sp = loadJg();
      const g = this.jungleGates.find((gg) => gg.cfg.op === 'add');
      if (sp && g) {
        parkAt(sp, g.cfg.d - 0.4, g.cfg.x);
        this.updateJungleSwing(0.016);
        sp.distance += 0.6;
        this.updateJungleSwing(0.016);
        out.push(bobos());
        for (const u of this.units) if (u.active && u.team === 'blue') out.push(Math.round(u.x * 1000), Math.round(u.z * 1000));
      }
      const a = crossChasm('aligned', false);
      const m = crossChasm('missed', false);
      const r = boulderRun(0, false);
      out.push(a.lost, m.lost, r.lost, r.b?.knocked ?? -1, this.jungleBoulderHits);
      return out.join(',');
    };
    let checksStableUnderRandomExtremes = false;
    try {
      Math.random = () => 0.0001;
      const lo = probe();
      Math.random = () => 0.9999;
      const hi = probe();
      Math.random = prevRandom;
      const mid = probe();
      checksStableUnderRandomExtremes = lo === hi && hi === mid && lo.length > 20;
    } finally {
      Math.random = prevRandom;
    }

    // Restore the original state cleanly
    st.gold = snap.gold;
    st.emeraldIdolBadges = snap.emeraldIdolBadges;
    st.lifetimeEmeraldIdolBadges = snap.lifetimeEmeraldIdolBadges;
    st.jungleSwingClears = snap.jungleSwingClears;
    st.bestJungleFinishSec = snap.bestJungleFinishSec;
    st.bestJungleSurvivors = snap.bestJungleSurvivors;
    st.totalJungleTrapsDodged = snap.totalJungleTrapsDodged;
    st.totalJungleBobosLost = snap.totalJungleBobosLost;
    st.ownedTacticCards = snap.ownedTacticCards;
    st.tacticDeck = snap.tacticDeck;
    st.totalTacticTriggers = snap.totalTacticTriggers;
    st.tacticCampaignEnabled = snap.tacticCampaignEnabled;
    st.trophyHallSlots = snap.trophyHallSlots;
    st.trophyDisplay = snap.trophyDisplay;
    st.boboTechLevels = snap.boboTechLevels;
    st.activeBoboTechDoctrine = snap.activeBoboTechDoctrine;
    st.save();
    this.syncTrophyPedestal3D(true);
    this.turretX = prevTurretX;
    this.turretTargetX = prevTurretTargetX;
    this.onStageEnd = prevOnStageEnd;
    this.onBanner = prevOnBanner;
    this.onTacticTrigger = prevOnTactic;
    this.tacticProfileOverride = null;
    if (prevLevel) {
      this.loadLevel(prevLevel);
    }
    this.isPaused = prevPaused;

    const ok =
      jungleSpawnedInTemple &&
      jungleDecorRestoresAcrossModes &&
      crowdRunsAndPathScrolls &&
      crowdSteersAndBobosFollow &&
      unitGateAddsSeatedBobos &&
      vineSwaysOnRunClock &&
      vineCarriesSquadAcrossChasm &&
      missedVineDropsBobos &&
      shieldFloatsBoboAcross &&
      boulderWakesAndRolls &&
      boulderFlattensBobosInLane &&
      sideStepDodgesBoulder &&
      shieldAbsorbsBoulder &&
      boulderDropsIntoChasmInItsWay &&
      templeExitWinsStage &&
      timeoutLosesStage &&
      wipeoutLosesStage &&
      autopilotClearsTier1 &&
      tiersScale &&
      badgesScaleWithTimeSurvivorsAndTraps &&
      badgesPersistedWithMilestone &&
      emeraldTrophyReadsCounter &&
      tacticCardsAtLobbyStrength &&
      lavaGateReinforcementsSeated &&
      checksStableUnderRandomExtremes;
    return {
      ok,
      jungleSpawnedInTemple,
      jungleDecorRestoresAcrossModes,
      crowdRunsAndPathScrolls,
      crowdSteersAndBobosFollow,
      unitGateAddsSeatedBobos,
      vineSwaysOnRunClock,
      vineCarriesSquadAcrossChasm,
      missedVineDropsBobos,
      shieldFloatsBoboAcross,
      boulderWakesAndRolls,
      boulderFlattensBobosInLane,
      sideStepDodgesBoulder,
      shieldAbsorbsBoulder,
      boulderDropsIntoChasmInItsWay,
      templeExitWinsStage,
      timeoutLosesStage,
      wipeoutLosesStage,
      autopilotClearsTier1,
      tiersScale,
      badgesScaleWithTimeSurvivorsAndTraps,
      badgesPersistedWithMilestone,
      emeraldTrophyReadsCounter,
      tacticCardsAtLobbyStrength,
      lavaGateReinforcementsSeated,
      checksStableUnderRandomExtremes,
      stats,
    };
  }

  /**
   * MC-18 self-check: 海盗船跳板突围 (pirate plank breakout) on the shared squad-run engine. Pure simulation on the live
   * world with every save field it touches snapshotted and restored (no tactic cards, no milestone bonuses, so the
   * numbers never depend on Math.random).
   */
  public runMc18SelfCheck(): {
    ok: boolean;
    pirateSpawnedOnDeck: boolean;
    pirateDecorRestoresAcrossModes: boolean;
    plankCarriesSquadAcrossSea: boolean;
    missedPlankDropsBobosInSea: boolean;
    cannonballFiresDownItsLane: boolean;
    cannonballKnocksBobosInLane: boolean;
    flagshipRampWinsStage: boolean;
    timeoutLosesStage: boolean;
    autopilotClearsTier1: boolean;
    tiersScale: boolean;
    skullBadgesScaleAndPersist: boolean;
    jungleRecordsUntouched: boolean;
    pirateTextsOnLabelAndBanner: boolean;
    stats: Record<string, number>;
  } {
    const st = this.state;
    const prevPaused = this.isPaused;
    const prevLevel = this.currentLevel;
    const prevOnStageEnd = this.onStageEnd;
    const prevOnBanner = this.onBanner;
    const prevOnTactic = this.onTacticTrigger;
    const prevTurretX = this.turretX;
    const prevTurretTargetX = this.turretTargetX;
    const snap = {
      gold: st.gold,
      goldSkullBadges: st.goldSkullBadges,
      lifetimeGoldSkullBadges: st.lifetimeGoldSkullBadges,
      pirateBoardingClears: st.pirateBoardingClears,
      bestPirateFinishSec: st.bestPirateFinishSec,
      bestPirateSurvivors: st.bestPirateSurvivors,
      totalPirateTrapsDodged: st.totalPirateTrapsDodged,
      totalPirateBobosLost: st.totalPirateBobosLost,
      emeraldIdolBadges: st.emeraldIdolBadges,
      lifetimeEmeraldIdolBadges: st.lifetimeEmeraldIdolBadges,
      jungleSwingClears: st.jungleSwingClears,
      tacticDeck: [...st.tacticDeck],
      tacticCampaignEnabled: st.tacticCampaignEnabled,
      boboTechLevels: { ...st.boboTechLevels },
      activeBoboTechDoctrine: st.activeBoboTechDoctrine,
    };
    const stats: Record<string, number> = {};
    const banners: string[] = [];
    this.isPaused = true;
    this.onStageEnd = undefined;
    this.onBanner = (title: string) => banners.push(title);
    this.onTacticTrigger = undefined;
    this.tacticProfileOverride = null;
    st.tacticDeck = [null, null, null];
    st.tacticCampaignEnabled = true;
    st.boboTechLevels = { vanguard_charge: 0, heavy_siege: 0, candy_bombard: 0 };
    st.activeBoboTechDoctrine = 'vanguard_charge';
    st.goldSkullBadges = 0;
    st.lifetimeGoldSkullBadges = 0;
    const bobos = (): number => this.getLavaBoboCount();
    const clearShields = (): void => {
      for (const u of this.units) {
        if (u.active) {
          u.frostShield = false;
          u.petShellGranted = false;
        }
      }
    };
    const loadPr = (tier = 1): JungleSwingRuntime | null => {
      this.loadLevel(generatePirateBoardingLevel(tier));
      for (const u of this.units) if (u.active && u.team === 'red') u.active = false;
      clearShields();
      this.snapJungleBobosToSlots();
      return this.jungleRun;
    };
    const skipBehind = (dist: number): void => {
      for (const g of this.jungleGates) if (g.cfg.d < dist + JG_FRONT_OFFSET + 0.5) g.resolved = true;
      for (const c of this.jungleChasms) {
        if (c.cfg.d + c.cfg.gap < dist - 1) {
          c.locked = true;
          c.passed = true;
        }
      }
      for (const b of this.jungleBoulders) {
        if (b.cfg.d < dist - 1) {
          b.passed = true;
          b.state = 'gone';
        }
      }
    };
    const parkAt = (s: JungleSwingRuntime, frontDu: number, x: number): void => {
      skipBehind(frontDu - 4);
      s.x = x;
      this.turretX = x;
      this.turretTargetX = x;
      s.baseSpeed = 0.0001;
      s.speed = 0;
      s.distance = frontDu - JG_FRONT_OFFSET;
      this.snapJungleBobosToSlots();
      clearShields();
    };

    let ok = false;
    let pirateSpawnedOnDeck = false;
    let pirateDecorRestoresAcrossModes = false;
    let plankCarriesSquadAcrossSea = false;
    let missedPlankDropsBobosInSea = false;
    let cannonballFiresDownItsLane = false;
    let cannonballKnocksBobosInLane = false;
    let flagshipRampWinsStage = false;
    let timeoutLosesStage = false;
    let autopilotClearsTier1 = false;
    let tiersScale = false;
    let skullBadgesScaleAndPersist = false;
    let jungleRecordsUntouched = false;
    let pirateTextsOnLabelAndBanner = false;
    try {
      // 1. Pirate deck scene: own sky / sea tint, no daytime landmarks, gates + sea gaps (2 planks) + cannons + flagship
      const lvl = generatePirateBoardingLevel(1);
      const s0 = loadPr();
      const course = lvl.jungleCourse;
      const scene0 = this.getDedicatedSceneSnapshot();
      const start = bobos();
      pirateSpawnedOnDeck = Boolean(
        lvl.isPirateBoarding &&
          lvl.isJungleSwing &&
          lvl.mode === 'pirate_plank' &&
          s0 &&
          s0.active &&
          scene0.kind === 'pirate' &&
          scene0.skyHex === PR_SEA_SKY &&
          scene0.abyssHex === DEDICATED_ABYSS_TINT.pirate &&
          !scene0.landmarks &&
          !this.turretGroup.visible &&
          this.jungleGates.length >= 6 &&
          this.jungleChasms.length >= 3 &&
          this.jungleChasms.every((c) => c.vines.length === 2) &&
          this.jungleBoulders.length >= 3 &&
          this.jungleExitGroup !== null &&
          course !== undefined &&
          start === course.startBobos &&
          s0.timeLimit === course.timeLimitSec &&
          course.timeLimitSec > course.length / course.baseSpeed &&
          course.length / course.baseSpeed >= 24 &&
          course.length / course.baseSpeed <= 34 &&
          !this.isMainCampaignLevel(lvl)
      );
      stats.startBobos = start;
      stats.courseLength = course?.length ?? 0;
      stats.timeLimit = course?.timeLimitSec ?? 0;
      stats.gates = this.jungleGates.length;
      stats.seaGaps = this.jungleChasms.length;
      stats.cannons = this.jungleBoulders.length;

      // 2. Scene switch: pirate -> jungle -> daytime campaign -> pirate (one switch, never two backdrops)
      this.loadLevel(generateJungleSwingLevel(1));
      const sJg = this.getDedicatedSceneSnapshot();
      this.loadLevel(generateDynamicLevel(1));
      const sDay = this.getDedicatedSceneSnapshot();
      loadPr();
      const sPr = this.getDedicatedSceneSnapshot();
      pirateDecorRestoresAcrossModes =
        sJg.kind === 'jungle' &&
        sJg.skyHex === JG_JUNGLE_SKY &&
        sDay.kind === 'none' &&
        sDay.landmarks &&
        sDay.abyssHex === 0xffffff &&
        sPr.kind === 'pirate' &&
        sPr.skyHex === PR_SEA_SKY &&
        !sPr.landmarks;

      // 3. Lined up under a plank as the front reaches the edge: the whole squad rides across (nobody falls)
      const crossGap = (mode: 'aligned' | 'missed'): { lost: number; c: JungleChasmRuntime | null; maxRide: number; label: string } => {
        const s = loadPr();
        const c = this.jungleChasms[0];
        if (!s || !c) return { lost: -1, c: null, maxRide: 0, label: '' };
        const v0 = c.vines[0].cfg;
        let clock = ((((v0.period / 4 - v0.offset) % v0.period) + v0.period) % v0.period) + v0.period * 3;
        let x = this.getJungleVineX(v0, clock);
        if (mode === 'missed') {
          let best = -Infinity;
          for (let tc = 0; tc < v0.period * 2; tc += 0.05) {
            const vx = c.vines.map((vv) => this.getJungleVineX(vv.cfg, tc + 4 * v0.period));
            for (let xx = -s.maxSteerX; xx <= s.maxSteerX + 0.01; xx += 0.1) {
              const dmin = Math.min(...vx.map((q) => Math.abs(q - xx)));
              if (dmin > best) {
                best = dmin;
                clock = tc + 4 * v0.period;
                x = xx;
              }
            }
          }
        }
        parkAt(s, c.cfg.d - 0.2, x);
        s.clock = clock;
        const before = bobos();
        let maxRide = 0;
        let label = '';
        for (let i = 0; i < 600 && s.active && !c.passed; i++) {
          s.distance += 0.12;
          this.updateJungleSwing(0.016);
          if (s.state === 'swinging' && !label) label = this.getJungleStateLabel();
          for (const u of this.units) if (u.active && u.team === 'blue') maxRide = Math.max(maxRide, u.rideY || 0);
        }
        return { lost: before - bobos(), c, maxRide, label };
      };
      const aligned = crossGap('aligned');
      plankCarriesSquadAcrossSea = Boolean(
        aligned.c && aligned.c.leadGrabbed && aligned.c.passed && aligned.lost === 0 && aligned.maxRide > 1.0 && this.jungleTrapsDodged === 1
      );
      const missed = crossGap('missed');
      missedPlankDropsBobosInSea = Boolean(
        missed.c &&
          !missed.c.leadGrabbed &&
          missed.c.passed &&
          missed.lost >= 1 &&
          missed.lost <= missed.c.cfg.knockCap &&
          this.jungleChasmFell === missed.lost
      );
      stats.seaFell = missed.lost;

      // 4. Cannons fire when the squad front comes within wakeD: the ball rolls down its lane (warning stripe) and
      //    knocks the Bobos in it (capped); the squad stumbles
      const s4 = loadPr();
      const b4 = this.jungleBoulders[0];
      if (s4 && b4) {
        parkAt(s4, b4.cfg.d - b4.cfg.wakeD - 2, b4.cfg.x > 0 ? b4.cfg.x - 6 : b4.cfg.x + 6);
        for (let i = 0; i < 10; i++) this.updateJungleSwing(0.016);
        const rested = b4.state === 'resting';
        s4.distance += 2.5;
        this.updateJungleSwing(0.016);
        const du1 = b4.du;
        for (let i = 0; i < 10; i++) this.updateJungleSwing(0.016);
        cannonballFiresDownItsLane = rested && b4.state === 'rolling' && b4.du < du1 && b4.lane.visible;
      }
      const s5 = loadPr();
      const b5 = this.jungleBoulders[0];
      if (s5 && b5) {
        let front = b5.cfg.d - 9;
        for (const c of this.jungleChasms) if (c.cfg.d < b5.cfg.d) front = Math.max(front, c.cfg.d + c.cfg.gap + 3);
        parkAt(s5, front, THREE.MathUtils.clamp(b5.cfg.x, -s5.maxSteerX, s5.maxSteerX));
        const before = bobos();
        let stumbled = false;
        let label = '';
        for (let i = 0; i < 900 && s5.active && !b5.passed; i++) {
          this.updateJungleSwing(0.016);
          if (s5.slowTimer > 0) stumbled = true;
          if (s5.state === 'stumbled' && !label) label = this.getJungleStateLabel();
        }
        const lost = before - bobos();
        cannonballKnocksBobosInLane = b5.passed && lost >= 1 && lost <= b5.cfg.knockCap && stumbled && label === '炮弹轰中';
        stats.cannonKnocked = lost;
      }

      // 5. Reaching the flagship ramp wins; the countdown running out loses
      banners.length = 0;
      const sC = loadPr();
      if (sC) {
        skipBehind(sC.courseLength);
        sC.distance = sC.courseLength - 0.05;
        sC.speed = sC.baseSpeed;
        this.updateJungleSwing(0.05);
        flagshipRampWinsStage = this.isStageEnded && this.lastStageVictory && sC.state === 'finished';
      }
      const winBanner = banners.join(' ');
      const sD = loadPr();
      if (sD) {
        sD.timeLeft = 0.01;
        this.updateJungleSwing(0.05);
        timeoutLosesStage = this.isStageEnded && !this.lastStageVictory && sD.state === 'timeout';
      }
      pirateTextsOnLabelAndBanner =
        aligned.label === '踩跳板过海' && winBanner.includes('海盗旗舰') && !winBanner.includes('神庙');

      // 6. Tier 1 is clearable in ~29 s by the autopilot through the real update + simulateUnits loop
      const sF = loadPr();
      if (sF) {
        let steps = 0;
        while (sF.active && steps < 1200) {
          this.turretX = this.getJungleAutopilotX();
          this.turretTargetX = this.turretX;
          this.updateJungleSwing(0.05);
          this.simulateUnits(0.05);
          steps++;
        }
        autopilotClearsTier1 =
          sF.state === 'finished' &&
          this.lastStageVictory &&
          this.jungleFinishSec >= 22 &&
          this.jungleFinishSec <= 36 &&
          this.jungleBoboCount >= start &&
          this.jungleGatesPassed >= 3 &&
          this.jungleVineSwings >= this.jungleChasms.length - 1 &&
          this.jungleTrapsDodged >= 3;
        stats.autoFinishSec = this.jungleFinishSec;
        stats.autoSurvivors = this.jungleBoboCount;
        stats.autoDodged = this.jungleTrapsDodged;
        stats.autoLost = this.jungleBobosLost;
      }
      this.turretX = 0;
      this.turretTargetX = 0;

      // 7. Tiers scale (faster pace, longer course, wider gaps, shorter plank reach, faster balls, twin balls from 5)
      const t1 = generatePirateBoardingLevel(1);
      const t5 = generatePirateBoardingLevel(5);
      const c1 = t1.jungleCourse;
      const c5 = t5.jungleCourse;
      const g1 = t1.jungleChasms?.[0];
      const g5 = t5.jungleChasms?.[0];
      const b1 = t1.jungleBoulders?.[0];
      const bb5 = t5.jungleBoulders?.[0];
      tiersScale = Boolean(
        c1 &&
          c5 &&
          g1 &&
          g5 &&
          b1 &&
          bb5 &&
          c5.baseSpeed > c1.baseSpeed &&
          c5.length > c1.length &&
          g5.gap > g1.gap &&
          g5.reach < g1.reach &&
          bb5.speed > b1.speed &&
          (t5.jungleBoulders?.length ?? 0) > (t1.jungleBoulders?.length ?? 99) &&
          st.getPirateBoardingSpec(0).pirateTier === 1 &&
          st.getPirateBoardingSpec(3).pirateTier === 4 &&
          st.getPirateBoardingSpec(99).pirateTier === 8
      );

      // 8. Settlement: 金骷髅徽章 scale with time + survivors + traps, persist, and lift the milestone (start Bobos / time)
      const jgBefore = `${st.emeraldIdolBadges}_${st.lifetimeEmeraldIdolBadges}_${st.jungleSwingClears}`;
      st.goldSkullBadges = 0;
      st.lifetimeGoldSkullBadges = 0;
      st.pirateBoardingClears = 0;
      st.bestPirateFinishSec = 0;
      const slowRec = st.recordPirateBoardingResult(true, 38, 40, 10, 8, 0, 100);
      st.goldSkullBadges = 0;
      st.lifetimeGoldSkullBadges = 0;
      st.pirateBoardingClears = 0;
      st.bestPirateFinishSec = 0;
      const baseMs = st.getGoldSkullMilestoneBonus(0);
      const fastRec = st.recordPirateBoardingResult(true, 26, 40, 48, 6, 6, 100);
      const lossRec = st.recordPirateBoardingResult(false, 40, 40, 12, 20, 1, 55);
      const saved = JSON.parse(localStorage.getItem('swarm_control_3d_save_v3') || '{}') as {
        goldSkullBadges?: number;
        pirateBoardingClears?: number;
        bestPirateFinishSec?: number;
      };
      const boostedMs = st.getGoldSkullMilestoneBonus();
      const sBoost = loadPr();
      skullBadgesScaleAndPersist = Boolean(
        fastRec.badgesAwarded > slowRec.badgesAwarded &&
          fastRec.timeBonusBadges === 2 &&
          fastRec.survivorBonusBadges === 3 &&
          fastRec.trapBonusBadges === 2 &&
          lossRec.badgesAwarded === 1 &&
          !lossRec.victory &&
          fastRec.milestoneReached &&
          saved.goldSkullBadges === st.goldSkullBadges &&
          saved.pirateBoardingClears === 1 &&
          saved.bestPirateFinishSec === 26 &&
          boostedMs.startBonusBobos > baseMs.startBonusBobos &&
          boostedMs.startBonusBobos <= 8 &&
          boostedMs.timeBonusSec > baseMs.timeBonusSec &&
          boostedMs.timeBonusSec <= 6 &&
          sBoost &&
          sBoost.timeLimit === (course?.timeLimitSec ?? 0) + boostedMs.timeBonusSec &&
          bobos() === start + boostedMs.startBonusBobos
      );
      jungleRecordsUntouched = jgBefore === `${st.emeraldIdolBadges}_${st.lifetimeEmeraldIdolBadges}_${st.jungleSwingClears}`;
      stats.fastBadges = fastRec.badgesAwarded;
      stats.slowBadges = slowRec.badgesAwarded;
    } finally {
      st.gold = snap.gold;
      st.goldSkullBadges = snap.goldSkullBadges;
      st.lifetimeGoldSkullBadges = snap.lifetimeGoldSkullBadges;
      st.pirateBoardingClears = snap.pirateBoardingClears;
      st.bestPirateFinishSec = snap.bestPirateFinishSec;
      st.bestPirateSurvivors = snap.bestPirateSurvivors;
      st.totalPirateTrapsDodged = snap.totalPirateTrapsDodged;
      st.totalPirateBobosLost = snap.totalPirateBobosLost;
      st.emeraldIdolBadges = snap.emeraldIdolBadges;
      st.lifetimeEmeraldIdolBadges = snap.lifetimeEmeraldIdolBadges;
      st.jungleSwingClears = snap.jungleSwingClears;
      st.tacticDeck = snap.tacticDeck;
      st.tacticCampaignEnabled = snap.tacticCampaignEnabled;
      st.boboTechLevels = snap.boboTechLevels;
      st.activeBoboTechDoctrine = snap.activeBoboTechDoctrine;
      st.save();
      this.turretX = prevTurretX;
      this.turretTargetX = prevTurretTargetX;
      this.onStageEnd = prevOnStageEnd;
      this.onBanner = prevOnBanner;
      this.onTacticTrigger = prevOnTactic;
      this.tacticProfileOverride = null;
      if (prevLevel) this.loadLevel(prevLevel);
      this.isPaused = prevPaused;
    }
    ok =
      pirateSpawnedOnDeck &&
      pirateDecorRestoresAcrossModes &&
      plankCarriesSquadAcrossSea &&
      missedPlankDropsBobosInSea &&
      cannonballFiresDownItsLane &&
      cannonballKnocksBobosInLane &&
      flagshipRampWinsStage &&
      timeoutLosesStage &&
      autopilotClearsTier1 &&
      tiersScale &&
      skullBadgesScaleAndPersist &&
      jungleRecordsUntouched &&
      pirateTextsOnLabelAndBanner;
    return {
      ok,
      pirateSpawnedOnDeck,
      pirateDecorRestoresAcrossModes,
      plankCarriesSquadAcrossSea,
      missedPlankDropsBobosInSea,
      cannonballFiresDownItsLane,
      cannonballKnocksBobosInLane,
      flagshipRampWinsStage,
      timeoutLosesStage,
      autopilotClearsTier1,
      tiersScale,
      skullBadgesScaleAndPersist,
      jungleRecordsUntouched,
      pirateTextsOnLabelAndBanner,
      stats,
    };
  }
}

/** 把自检方法挂到已经建好的世界上：本类只有方法、没有字段和构造函数，换原型就等于用本类新建。 */
export function attachSelfChecks(world: World3DFull): void {
  Object.setPrototypeOf(world, World3DSelfChecks.prototype);
}
