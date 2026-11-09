// sprites.js — 28 帧真·逐帧原画序列（6帧完整跑步循环 + 起跳蓄力/滞空顶点/落地缓冲 + 自然眨眼与开口说话差分 + 4种手势互动原画）
// 结合 60/120FPS Spine/Live2D 风格 12 段柔性网格骨骼插值与不透明交叉叠化引擎，实现番剧级丝滑角色表现

const SPRITE_FILES = {
  heroIdle: './assets/hero_idle.webp?v=hd5',
  heroIdle2: './assets/hero_idle2.webp?v=hd5',
  heroIdleBlink: './assets/hero_idle_blink.webp?v=hd5',
  heroIdleTalk: './assets/hero_idle_talk.webp?v=hd5',

  // 完整 6 帧标准动画跑步循环
  heroRun1: './assets/hero_run1.webp?v=hd5',
  heroRunPass1: './assets/hero_run_pass1.webp?v=hd5',
  heroRunAir1: './assets/hero_run_air1.webp?v=hd5',
  heroRunContact2: './assets/hero_run_contact2.webp?v=hd5',
  heroRun2: './assets/hero_run2.webp?v=hd5',
  heroRunPass2: './assets/hero_run_pass2.webp?v=hd5',

  // 起跳缓冲 -> 上升 -> 滞空最高点悬浮 -> 下落 -> 落地缓冲 完整跳跃链
  heroJumpPrep: './assets/hero_jump_prep.webp?v=hd5',
  heroJump: './assets/hero_jump.webp?v=hd5',
  heroAirApex: './assets/hero_air_apex.webp?v=hd5',
  heroFall: './assets/hero_fall.webp?v=hd5',

  heroAttack: './assets/hero_attack.webp?v=hd5',
  heroBrake: './assets/hero_brake.webp?v=hd5',
  heroLedgeHang: './assets/hero_ledge_hang.webp?v=hd5',
  heroClimbUp: './assets/hero_climb_up.webp?v=hd5',
  heroCrouch: './assets/hero_crouch.webp?v=hd5',
  heroSitEdge: './assets/hero_sit_edge.webp?v=hd5',
  heroInteractPoke: './assets/hero_interact_poke.webp?v=hd5',
  heroSleepLoaf: './assets/hero_sleep_loaf.webp?v=hd5',
  heroPattedTsundere: './assets/hero_patted_tsundere.webp?v=hd5',
  heroProud: './assets/hero_proud.webp?v=hd5',

  // 进阶手势交互专属原画（比耶拍立得 / 追指尖伸手 / 猜拳出招 / 欢呼庆祝）
  heroPosePeace: './assets/hero_pose_peace.webp?v=hd5',
  heroPoseReach: './assets/hero_pose_reach.webp?v=hd5',
  heroPoseRps: './assets/hero_pose_rps.webp?v=hd5',
  heroPoseCheer: './assets/hero_pose_cheer.webp?v=hd5',

  slime: './assets/mon_slime.webp?v=hd8',
  bat: './assets/mon_bat.webp?v=hd8',
  elite: './assets/mon_elite.webp?v=hd8',
  boss: './assets/mon_boss.webp?v=hd4',
  star: './assets/star_goal.webp?v=hd8',
  foodRice: './assets/food_rice.webp?v=hd2',
  foodTea: './assets/food_tea.webp?v=hd2',
  foodBento: './assets/food_bento.webp?v=hd2',
  foodCake: './assets/food_cake.webp?v=hd2',
  toyWhale: './assets/toy_whale.webp?v=hd2',
  toyYarn: './assets/toy_yarn.webp?v=hd2',
  toyDuck: './assets/toy_duck.webp?v=hd2',
  propCushion: './assets/prop_cushion.webp?v=hd2',
  furnPc: './assets/furn_pc.webp?v=hd4',
  furnTree: './assets/furn_tree.webp?v=hd4',
  furnLamp: './assets/furn_lamp.webp?v=hd4',

  // 治愈系手绘 UI / 装扮发饰 / 武器强化 / 粒子贴纸素材
  uiCoin: './assets/ui_coin.webp?v=hd6',
  itemBow: './assets/item_bow.webp?v=hd6',
  itemCrown: './assets/item_crown.webp?v=hd6',
  itemAura: './assets/item_aura.webp?v=hd6',
  upgBlaster: './assets/upg_blaster.webp?v=hd6',
  upgBlade: './assets/upg_blade.webp?v=hd6',
  upgMagnet: './assets/upg_magnet.webp?v=hd6',
  upgBoots: './assets/upg_boots.webp?v=hd6',
  propAlarm: './assets/prop_alarm.webp?v=hd6',
  vfxHeart: './assets/vfx_heart.webp?v=hd6',
  vfxSparkle: './assets/vfx_sparkle.webp?v=hd6',
  vfxNote: './assets/vfx_note.webp?v=hd6',
  vfxZzz: './assets/vfx_zzz.webp?v=hd6',
  vfxAngry: './assets/vfx_angry.webp?v=hd6',
  vfxGem: './assets/vfx_gem.webp?v=hd6'
};

export const images = {};
for (const [key, src] of Object.entries(SPRITE_FILES)) {
  const img = new Image();
  img.src = src;
  images[key] = img;
}

export function isReady(img) {
  return img && img.complete && img.naturalWidth > 0;
}

const anim = {
  lastNow: 0,
  runCyclePos: 0,
  breathPhase: 0,
  swayPhase: 0,
  actionPhase: 0,
  legSwingPhase: 0,
  blinkCooldown: 2.6,
  blinkDuration: 0,
  smoothFacing: 1,
  squashX: 1,
  squashY: 1,
  tiltAngle: 0,
  bounceY: 0,
  headSwayX: 0,
  torsoTwistX: 0,
  legShearX: 0,
  currSprite: null,
  prevSprite: null,
  crossfade: 1,
  crossfadeSpeed: 11,
  lastPoseKey: 'idle'
};

function drawArticulatedMesh(ctx, img, drawSize, footAnchorY, meshParams) {
  if (!isReady(img)) return;
  const sw = img.naturalWidth;
  const sh = img.naturalHeight;
  const SLICES = 12;
  const srcSliceH = sh / SLICES;
  const dstSliceH = drawSize / SLICES;
  const baseLeft = -drawSize * 0.5;
  const baseTop = -footAnchorY;

  const {
    headSwayX = 0,
    torsoTwistX = 0,
    legShearX = 0,
    breathExpand = 0,
    verticalWave = 0
  } = meshParams;

  for (let i = 0; i < SLICES; i++) {
    const t = i / (SLICES - 1);
    let offsetX = 0;
    let offsetY = 0;
    let scaleW = 1;

    if (t < 0.52) {
      const headFactor = 1 - t / 0.52;
      offsetX = headSwayX * (0.45 + headFactor * 0.65) + torsoTwistX * 0.35;
      offsetY = verticalWave * (0.6 + headFactor * 0.4);
      scaleW = 1 + breathExpand * 0.25 * (1 - headFactor);
    } else if (t < 0.78) {
      const torsoT = (t - 0.52) / 0.26;
      const bell = Math.sin(torsoT * Math.PI);
      offsetX = torsoTwistX * (0.5 + bell * 0.5) + legShearX * torsoT * 0.25;
      offsetY = verticalWave * (1 - torsoT * 0.5);
      scaleW = 1 + breathExpand * bell;
    } else {
      const legT = (t - 0.78) / 0.22;
      const swingCurve = Math.sin(legT * Math.PI * 0.85);
      offsetX = legShearX * swingCurve;
      offsetY = Math.abs(legShearX) * -0.1 * swingCurve;
      scaleW = 1 + Math.abs(legShearX) * 0.003 * swingCurve;
    }

    const sy = Math.max(0, i * srcSliceH - 0.6);
    const sHeight = Math.min(sh - sy, srcSliceH + 1.2);
    const dy = baseTop + i * dstSliceH + offsetY - 0.35;
    const dHeight = dstSliceH + 0.7;
    const dWidth = drawSize * scaleW;
    const dx = baseLeft * scaleW + offsetX;

    ctx.drawImage(img, 0, sy, sw, sHeight, dx, dy, dWidth, dHeight);
  }
}

export function drawHeroSprite(ctx, p, now) {
  const dt = anim.lastNow > 0 ? Math.min(0.05, Math.max(0.004, (now - anim.lastNow) / 1000)) : 0.016;
  anim.lastNow = now;

  ctx.save();
  ctx.translate(p.x, p.y);

  const eq = p.equipped || {};

  if (eq.aura && p.climbState !== 'hang') {
    ctx.save();
    ctx.translate(0, 24);
    if (isReady(images.itemAura)) {
      ctx.scale(1, 0.52);
      ctx.rotate(now * 0.0022);
      ctx.drawImage(images.itemAura, -54, -54, 108, 108);
    }
    ctx.restore();
  }

  if (p.climbState !== 'hang' && !p.isPickedUp) {
    ctx.save();
    ctx.translate(0, 25);
    ctx.scale(1, 0.26);
    ctx.fillStyle = p.onPalm
      ? 'rgba(255, 158, 199, 0.38)'
      : p.onGround
        ? 'rgba(12, 20, 38, 0.25)'
        : 'rgba(12, 20, 38, 0.14)';
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (eq.cushion && p.onGround && Math.abs(p.vx) < 12 && p.climbState === 'none') {
    ctx.save();
    ctx.translate(0, 18);
    if (isReady(images.propCushion)) {
      ctx.drawImage(images.propCushion, -48, -24, 96, 56);
    } else {
      ctx.fillStyle = '#38b6ff';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 4, 38, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  const speed = Math.abs(p.vx);
  const isMoving = speed > 14 && !p.onPalm;

  // 推进连续骨骼与自然眨眼计时器
  anim.breathPhase += dt * 4.2;
  anim.swayPhase += dt * 3.1;
  anim.actionPhase += dt * 10.5;
  anim.legSwingPhase += dt * 7.2;

  if (anim.blinkDuration > 0) {
    anim.blinkDuration = Math.max(0, anim.blinkDuration - dt);
  } else {
    anim.blinkCooldown -= dt;
    if (anim.blinkCooldown <= 0) {
      anim.blinkDuration = 0.14;
      anim.blinkCooldown = 2.4 + Math.random() * 2.2;
    }
  }

  // 6 帧跑步循环步进器（按真实移速推进帧索引，满速约 14 帧/秒 + 60/120FPS 骨骼插值）
  if (isMoving) {
    const fps = Math.min(16.5, 8.5 + speed * 0.032);
    anim.runCyclePos = (anim.runCyclePos + dt * fps) % 6;
  } else {
    anim.runCyclePos = 0;
  }

  let targetSprite = images.heroIdle;
  let poseKey = 'idle';
  let targetBounceY = 0;
  let targetTilt = 0;
  let targetSquashX = 1;
  let targetSquashY = 1;
  let targetHeadSwayX = Math.sin(anim.swayPhase) * 1.8;
  let targetTorsoTwistX = Math.cos(anim.breathPhase) * 0.8;
  let targetLegShearX = 0;
  let breathExpand = Math.sin(anim.breathPhase) * 0.018;
  let verticalWave = Math.sin(anim.breathPhase) * -1.8;
  let desiredCrossfadeSpeed = 12;

  // 0. 最高物理触控优先级：被主人手指拎起悬空扑腾 / 按住连续顺毛呼噜 / 亲手喂到嘴边张嘴接食
  if (p.isPickedUp) {
    poseKey = 'picked_up_dangle';
    targetSprite = isReady(images.heroLedgeHang) ? images.heroLedgeHang : images.heroJump;
    desiredCrossfadeSpeed = 20;
    const swing = Math.max(-0.38, Math.min(0.38, -(p.dragVx || 0) * 0.0014));
    targetTilt = swing + Math.sin(anim.actionPhase * 1.35) * 0.055;
    targetBounceY = Math.sin(anim.actionPhase * 1.8) * 3.2;
    targetLegShearX = Math.sin(anim.legSwingPhase * 2.5) * 8.2;
    targetSquashX = 0.96;
    targetSquashY = 1.05;
  } else if ((p.rubbingTimer || 0) > 0) {
    poseKey = 'head_rub_purr';
    targetSprite = isReady(images.heroIdleBlink)
      ? images.heroIdleBlink
      : isReady(images.heroIdle2)
        ? images.heroIdle2
        : images.heroIdle;
    desiredCrossfadeSpeed = 22;
    const purrWave = Math.sin(anim.actionPhase * 1.3);
    targetSquashX = 1.065 + purrWave * 0.025;
    targetSquashY = 0.935 - purrWave * 0.025;
    targetHeadSwayX = (p.rubOffsetX || 0) * 0.36 + Math.sin(anim.swayPhase * 2.4) * 2.2;
    targetTilt = (p.rubOffsetX || 0) * 0.0045;
    targetBounceY = 2.0 + Math.abs(purrWave) * -1.8;
  } else if (p.eagerFeedActive && p.eatingTimer <= 0) {
    poseKey = 'eager_hand_feed';
    const openMouth = Math.sin(now * 0.018) > -0.25;
    targetSprite =
      openMouth && isReady(images.heroIdleTalk)
        ? images.heroIdleTalk
        : isReady(images.heroPoseReach)
          ? images.heroPoseReach
          : images.heroIdle2;
    desiredCrossfadeSpeed = 20;
    const hop = Math.abs(Math.sin(anim.actionPhase * 1.15));
    targetBounceY = hop * -4.0;
    targetTorsoTwistX = 3.6;
    targetHeadSwayX = 2.8;
  } else if ((p.photoPoseTimer || 0) > 0 && isReady(images.heroPosePeace)) {
    poseKey = 'photo_peace';
    targetSprite = images.heroPosePeace;
    const cuteTilt = Math.sin(anim.swayPhase * 1.6);
    targetTilt = -0.04 + cuteTilt * 0.025;
    targetHeadSwayX = cuteTilt * 2.5;
    targetBounceY = Math.abs(Math.sin(anim.breathPhase * 1.5)) * -2.8;
  } else if ((p.rpsPoseTimer || 0) > 0 && isReady(images.heroPoseRps)) {
    poseKey = 'rps_challenge';
    targetSprite = images.heroPoseRps;
    const rhythm = Math.sin(anim.actionPhase * 1.5);
    targetBounceY = Math.abs(rhythm) * -4.2;
    targetTorsoTwistX = rhythm * 3.5;
    targetSquashX = 1 + rhythm * 0.03;
    targetSquashY = 1 - rhythm * 0.03;
  } else if ((p.cheerTimer || 0) > 0 && isReady(images.heroPoseCheer)) {
    poseKey = 'cheer';
    targetSprite = images.heroPoseCheer;
    const joyHop = Math.abs(Math.sin(anim.actionPhase * 1.4));
    targetBounceY = joyHop * -6.5;
    targetSquashX = 1 - joyHop * 0.04;
    targetSquashY = 1 + joyHop * 0.045;
    targetHeadSwayX = Math.sin(anim.actionPhase * 0.7) * 3.2;
  } else if (p.climbState === 'hang') {
    poseKey = 'hang';
    targetSprite = isReady(images.heroLedgeHang) ? images.heroLedgeHang : images.heroJump;
    targetTilt = Math.sin(anim.actionPhase * 1.4) * 0.06;
    targetBounceY = 8 + Math.sin(anim.actionPhase * 1.6) * 2.5;
    targetLegShearX = Math.sin(anim.legSwingPhase * 1.8) * 6.5;
  } else if (p.climbState === 'pullup') {
    poseKey = 'pullup';
    targetSprite = isReady(images.heroClimbUp) ? images.heroClimbUp : images.heroBrake;
    const progress = 1 - p.climbTimer / 0.26;
    targetSquashX = 1.06 - progress * 0.06;
    targetSquashY = 0.94 + progress * 0.06;
    targetTorsoTwistX = Math.sin(progress * Math.PI) * 4;
  } else if (p.eatingTimer > 0) {
    poseKey = 'eating';
    targetSprite =
      Math.sin(anim.actionPhase * 1.6) > 0.2 && isReady(images.heroIdleTalk)
        ? images.heroIdleTalk
        : isReady(images.heroIdle2)
          ? images.heroIdle2
          : images.heroIdle;
    desiredCrossfadeSpeed = 18;
    const chewWave = Math.sin(anim.actionPhase * 1.65);
    targetSquashX = 1 + chewWave * 0.042;
    targetSquashY = 1 - chewWave * 0.042;
    targetBounceY = Math.abs(chewWave) * -3.2;
    targetHeadSwayX = Math.sin(anim.actionPhase * 0.8) * 2.8;
  } else if (p.tsundereTimer > 0) {
    poseKey = 'tsundere';
    targetSprite = isReady(images.heroPattedTsundere) ? images.heroPattedTsundere : images.heroIdle2;
    const shake = Math.sin(anim.actionPhase * 2.2);
    targetTilt = shake * 0.055;
    targetSquashX = 1 + Math.sin(anim.actionPhase * 1.8) * 0.038;
    targetSquashY = 1 - Math.sin(anim.actionPhase * 1.8) * 0.038;
    targetHeadSwayX = shake * 4.2;
    targetBounceY = Math.abs(shake) * -3;
  } else if (!p.onGround) {
    // 完整三阶段空中跳跃动画链：上升(heroJump) -> 滞空最高点悬浮(heroAirApex) -> 下落(heroFall)
    if (p.vy < -105) {
      poseKey = 'jump_up';
      targetSprite = isReady(images.heroJump) ? images.heroJump : images.heroIdle;
      const vyFactor = Math.min(1, Math.abs(p.vy) / 420);
      targetSquashX = 1 - vyFactor * 0.05;
      targetSquashY = 1 + vyFactor * 0.06;
      targetLegShearX = Math.sin(anim.legSwingPhase * 1.4) * 3.5;
    } else if (p.vy <= 105 && isReady(images.heroAirApex)) {
      poseKey = 'air_apex';
      targetSprite = images.heroAirApex;
      desiredCrossfadeSpeed = 16;
      targetSquashX = 1.02;
      targetSquashY = 0.98;
      targetHeadSwayX = Math.sin(anim.swayPhase * 1.8) * 2.5;
    } else {
      poseKey = 'fall_down';
      targetSprite = isReady(images.heroFall) ? images.heroFall : images.heroJump;
      const fallFactor = Math.min(1, Math.abs(p.vy) / 450);
      targetSquashX = 1 + fallFactor * 0.035;
      targetSquashY = 1 - fallFactor * 0.035;
      targetLegShearX = Math.sin(anim.legSwingPhase * 1.5) * 4.2;
    }
    if (p.spinTimer > 0) {
      targetTilt = (1 - p.spinTimer / 0.36) * Math.PI * 2;
    }
  } else if (p.fingerChaseActive && speed < 85 && isReady(images.heroPoseReach)) {
    // 食指逗宠近身伸手够指尖原画！
    poseKey = 'finger_reach';
    targetSprite = images.heroPoseReach;
    const reachWave = Math.sin(anim.actionPhase * 1.25);
    targetTorsoTwistX = 3.2 + reachWave * 2.8;
    targetHeadSwayX = 2.4 + reachWave * 2.0;
    targetBounceY = Math.abs(reachWave) * -3.5;
  } else if (p.isCrouching) {
    poseKey = p.crouchTime > 0.5 ? 'crouch_poke' : 'crouch';
    targetSprite =
      p.crouchTime > 0.5 && isReady(images.heroInteractPoke)
        ? images.heroInteractPoke
        : isReady(images.heroCrouch)
          ? images.heroCrouch
          : images.heroJumpPrep;
    const crouchWave = Math.sin(anim.actionPhase * 0.9);
    targetSquashX = 1.04 + crouchWave * 0.025;
    targetSquashY = 0.96 - crouchWave * 0.025;
    targetTorsoTwistX = p.crouchTime > 0.5 ? Math.sin(anim.actionPhase * 1.3) * 4.2 : 0;
  } else if (p.landAnimTimer > 0) {
    // 落地屈膝缓冲专属原画 (heroJumpPrep)！
    poseKey = 'land_cushion';
    targetSprite = isReady(images.heroJumpPrep) ? images.heroJumpPrep : images.heroBrake;
    desiredCrossfadeSpeed = 20;
    const t = p.landAnimTimer / 0.16;
    targetSquashX = 1 + 0.08 * t;
    targetSquashY = 1 - 0.07 * t;
    targetBounceY = t * 2.5;
  } else if (p.isBraking && speed > 32) {
    poseKey = 'brake';
    targetSprite = isReady(images.heroBrake) ? images.heroBrake : images.heroJumpPrep;
    targetTilt = -0.07;
    targetLegShearX = 4.5;
  } else if (isMoving) {
    // 真·6帧完整动画跑步循环！
    const runFrames = [
      images.heroRun1,
      isReady(images.heroRunPass1) ? images.heroRunPass1 : images.heroRun1,
      isReady(images.heroRunAir1) ? images.heroRunAir1 : images.heroRun2,
      isReady(images.heroRunContact2) ? images.heroRunContact2 : images.heroRun1,
      images.heroRun2,
      isReady(images.heroRunPass2) ? images.heroRunPass2 : images.heroRun2
    ];
    const frameIdx = Math.floor(anim.runCyclePos) % 6;
    poseKey = `run_${frameIdx}`;
    targetSprite = runFrames[frameIdx];
    desiredCrossfadeSpeed = 24; // 6帧原画之间超高速顺滑衔接

    if (p.attackAnimTimer > 0.08 && isReady(images.heroAttack)) {
      poseKey = 'run_attack';
      targetSprite = images.heroAttack;
    }

    const cycleRad = (anim.runCyclePos / 6) * Math.PI * 2;
    const speedNorm = Math.min(1.15, speed / 220);
    // 6帧原画本身已具备迈步姿态，骨骼层仅施加柔和的重心起伏与发梢跟随，视觉极度自然连贯！
    targetBounceY = Math.abs(Math.sin(cycleRad)) * -4.2 * speedNorm;
    targetTilt = 0.045 * speedNorm;
    targetLegShearX = Math.sin(cycleRad * 2) * 2.6 * speedNorm;
    targetHeadSwayX = Math.sin(cycleRad * 2 - 0.5) * 2.2 * speedNorm;
  } else {
    if (p.attackAnimTimer > 0 && isReady(images.heroAttack)) {
      poseKey = 'attack';
      targetSprite = images.heroAttack;
      targetTorsoTwistX = 4.5;
    } else if (p.proudTimer > 0 && isReady(images.heroProud)) {
      poseKey = 'proud_timer';
      targetSprite = images.heroProud;
      targetBounceY = Math.abs(Math.sin(anim.breathPhase * 1.4)) * -2.5;
    } else if (p.idleTime > 5.2 && !p.onPalm && isReady(images.heroSleepLoaf)) {
      poseKey = 'sleep';
      targetSprite = images.heroSleepLoaf;
      breathExpand = Math.sin(anim.breathPhase * 0.75) * 0.028;
      verticalWave = Math.sin(anim.breathPhase * 0.75) * -2.2;
    } else if (p.petAction === 'sit' && isReady(images.heroSitEdge)) {
      poseKey = 'sit';
      targetSprite = images.heroSitEdge;
      targetLegShearX = Math.sin(anim.legSwingPhase) * 6.8;
      targetHeadSwayX = Math.sin(anim.legSwingPhase * 0.5) * 3.2;
      targetTilt = Math.sin(anim.legSwingPhase * 0.5) * 0.032;
      targetBounceY = Math.abs(Math.cos(anim.legSwingPhase)) * -1.8;
    } else if (p.petAction === 'poke' && isReady(images.heroInteractPoke)) {
      poseKey = 'poke';
      targetSprite = images.heroInteractPoke;
      const pokeWave = Math.sin(anim.actionPhase * 1.15);
      targetTorsoTwistX = pokeWave * 4.2;
      targetHeadSwayX = pokeWave * 3.0;
      targetBounceY = Math.max(0, pokeWave) * 2.0;
    } else if (p.petAction === 'proud' && isReady(images.heroProud)) {
      poseKey = 'proud';
      targetSprite = images.heroProud;
      targetHeadSwayX = Math.sin(anim.swayPhase * 1.4) * 2.8;
      targetBounceY = Math.abs(Math.sin(anim.breathPhase * 1.3)) * -2.4;
    } else if ((p.happyTimer > 0 || p.petAction === 'rice') && isReady(images.heroIdle2)) {
      poseKey = 'rice';
      targetSprite = images.heroIdle2;
      const happyWave = Math.sin(anim.actionPhase * 1.1);
      targetBounceY = Math.abs(happyWave) * -3.0;
      targetHeadSwayX = Math.cos(anim.actionPhase * 0.55) * 3.0;
    } else if ((p.talkAnimTimer || 0) > 0 && isReady(images.heroIdleTalk)) {
      // 说话口型同步差分：开口挥手 (heroIdleTalk) <-> 闭口微笑 (heroIdle) 交替对口型！
      const mouthOpen = Math.sin(now * 0.024) > -0.15;
      poseKey = mouthOpen ? 'idle_talk_open' : 'idle_talk_close';
      targetSprite = mouthOpen ? images.heroIdleTalk : images.heroIdle;
      desiredCrossfadeSpeed = 22;
      targetBounceY = Math.abs(Math.sin(now * 0.012)) * -2.2;
    } else if (anim.blinkDuration > 0 && isReady(images.heroIdleBlink)) {
      // 自然闭眼眨眼帧！
      poseKey = 'idle_blink';
      targetSprite = images.heroIdleBlink;
      desiredCrossfadeSpeed = 28;
      targetBounceY = Math.sin(anim.breathPhase) * -1.8;
    } else {
      poseKey = 'idle';
      targetSprite = images.heroIdle;
      targetBounceY = Math.sin(anim.breathPhase) * -1.8;
    }
  }

  // Live2D 视线与身体重心动态跟随（朝向主人的指尖、手中美食、玩具球或手掌倾斜角微倾）
  if (!p.isPickedUp && p.spinTimer <= 0) {
    const signedLook = (p.lookOffsetX || 0) * (p.facing || 1);
    targetHeadSwayX += Math.max(-5.5, Math.min(5.5, signedLook * 0.045));
    targetTorsoTwistX += Math.max(-3.2, Math.min(3.2, signedLook * 0.024));
    if (p.onPalm && p.palmTilt) {
      targetTilt += Math.max(-0.14, Math.min(0.14, p.palmTilt * 0.3 * (p.facing || 1)));
    }
  }

  if (!anim.currSprite) {
    anim.currSprite = targetSprite;
    anim.prevSprite = targetSprite;
  } else if (targetSprite !== anim.currSprite) {
    anim.prevSprite = anim.currSprite;
    anim.currSprite = targetSprite;
    anim.crossfade = 0;
    anim.crossfadeSpeed = desiredCrossfadeSpeed;
    const isSubtleFaceDiff =
      poseKey.startsWith('idle') && anim.lastPoseKey.startsWith('idle');
    if (!poseKey.startsWith('run') && !anim.lastPoseKey.startsWith('run') && !isSubtleFaceDiff) {
      anim.squashX = 1.045;
      anim.squashY = 0.955;
      anim.bounceY -= 2.4;
    }
    anim.lastPoseKey = poseKey;
  }

  if (anim.crossfade < 1) {
    anim.crossfade = Math.min(1, anim.crossfade + dt * anim.crossfadeSpeed);
  }

  const springK = 1 - Math.exp(-dt * 22);
  const flipK = 1 - Math.exp(-dt * 26);
  anim.smoothFacing += ((p.facing || 1) - anim.smoothFacing) * flipK;
  if (Math.abs(anim.smoothFacing) < 0.15) {
    anim.smoothFacing = (p.facing || 1) * 0.15;
  }

  anim.squashX += (targetSquashX - anim.squashX) * springK;
  anim.squashY += (targetSquashY - anim.squashY) * springK;
  anim.bounceY += (targetBounceY - anim.bounceY) * springK;
  anim.headSwayX += (targetHeadSwayX - anim.headSwayX) * springK;
  anim.torsoTwistX += (targetTorsoTwistX - anim.torsoTwistX) * springK;
  anim.legShearX += (targetLegShearX - anim.legShearX) * springK;

  if (p.spinTimer > 0) {
    anim.tiltAngle = targetTilt;
  } else {
    anim.tiltAngle += (targetTilt - anim.tiltAngle) * springK;
  }

  ctx.save();
  ctx.translate(0, 25 + anim.bounceY);
  ctx.scale(anim.smoothFacing * anim.squashX, anim.squashY);
  if (p.spinTimer > 0) {
    ctx.translate(0, -52);
    ctx.rotate(anim.tiltAngle);
    ctx.translate(0, 52);
  } else {
    ctx.rotate(anim.tiltAngle);
  }

  const drawSize = 148;
  const footAnchorY = drawSize * (244 / 260);
  const meshParams = {
    headSwayX: anim.headSwayX,
    torsoTwistX: anim.torsoTwistX,
    legShearX: anim.legShearX,
    breathExpand,
    verticalWave
  };

  if (isReady(anim.currSprite)) {
    if (anim.crossfade < 1 && isReady(anim.prevSprite) && anim.prevSprite !== anim.currSprite) {
      drawArticulatedMesh(ctx, anim.prevSprite, drawSize, footAnchorY, meshParams);
      const t = anim.crossfade;
      ctx.globalAlpha = t * t * (3 - 2 * t);
      drawArticulatedMesh(ctx, anim.currSprite, drawSize, footAnchorY, meshParams);
      ctx.globalAlpha = 1;
    } else {
      drawArticulatedMesh(ctx, anim.currSprite, drawSize, footAnchorY, meshParams);
    }
  } else {
    ctx.fillStyle = '#38b6ff';
    ctx.beginPath();
    ctx.arc(0, -44, 24, 0, Math.PI * 2);
    ctx.fill();
  }

  const isLowPose = p.isCrouching || (p.idleTime > 5.2 && !isMoving && !p.onPalm);
  const headTopY = (isLowPose ? -88 : -110) + verticalWave * 0.85;
  const hatOffsetX = anim.headSwayX * 0.85;

  if (eq.crown && isReady(images.itemCrown)) {
    ctx.save();
    ctx.translate(hatOffsetX, headTopY - 4);
    ctx.rotate(anim.headSwayX * 0.012);
    ctx.drawImage(images.itemCrown, -17, -17, 34, 34);
    ctx.restore();
  }
  if (eq.bow && isReady(images.itemBow)) {
    ctx.save();
    ctx.translate(-16 + hatOffsetX, headTopY + 10);
    ctx.rotate(-0.18 + anim.headSwayX * 0.015);
    ctx.drawImage(images.itemBow, -15, -15, 30, 30);
    ctx.restore();
  }

  ctx.restore();

  if (p.emote && p.emoteTimer > 0) {
    drawPetEmoteBubble(ctx, p.emote, p.emoteTimer, now, p.emoteMood || 'normal');
  }

  ctx.restore();
}

export function drawFoodItem(ctx, it, now) {
  ctx.save();
  ctx.translate(it.x, it.y);

  ctx.save();
  ctx.scale(1, 0.3);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.arc(0, 2, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  let sx = 1;
  let sy = 1;
  let rot = 0;
  if (it.squashTimer > 0) {
    const k = it.squashTimer / 0.22;
    sx = 1 + Math.sin(k * Math.PI) * 0.24;
    sy = 1 - Math.sin(k * Math.PI) * 0.20;
  }
  if (it.eatingProgress > 0) {
    const biteLeft = Math.max(0.45, 1 - it.eatingProgress * 0.45);
    const wobble = Math.sin(now * 0.035) * 0.08;
    sx = biteLeft * (1 + wobble);
    sy = biteLeft * (1 - wobble);
    rot = Math.sin(now * 0.025) * 0.12;
  }

  const fid = it.foodId || 'rice';
  const spriteMap = {
    rice: images.foodRice,
    tea: images.foodTea,
    bento: images.foodBento,
    cake: images.foodCake
  };
  const sp = spriteMap[fid] || images.foodRice;

  ctx.save();
  ctx.translate(0, -2);
  ctx.scale(sx, sy);
  ctx.rotate(rot);

  if (isReady(sp)) {
    const sz = 62;
    ctx.drawImage(sp, -sz * 0.5, -sz * 0.88, sz, sz);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#1b2b4a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -12, 14, Math.PI, 0);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  if (fid === 'rice' || fid === 'bento') {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    for (let s = -1; s <= 1; s += 2) {
      const floatY = -36 - ((now * 0.02 + (s + 1) * 8) % 14);
      const waveX = s * 7 + Math.sin(now * 0.008 + s) * 3;
      ctx.beginPath();
      ctx.moveTo(waveX, floatY);
      ctx.quadraticCurveTo(waveX + s * 3, floatY - 4, waveX, floatY - 8);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (it.eatingProgress > 0) {
    ctx.save();
    ctx.translate(0, -46);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#ff9ec7';
    ctx.beginPath();
    ctx.arc(0, 0, 10, -Math.PI * 0.5, -Math.PI * 0.5 + it.eatingProgress * Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

export function drawToyItem(ctx, it, now) {
  ctx.save();

  if (it.trail && it.trail.length > 1) {
    ctx.save();
    for (let i = 0; i < it.trail.length - 1; i++) {
      const pt = it.trail[i];
      const alpha = ((i + 1) / it.trail.length) * 0.38;
      ctx.fillStyle =
        it.toyId === 'yarn'
          ? `rgba(255, 130, 190, ${alpha})`
          : it.toyId === 'duck'
            ? `rgba(255, 220, 40, ${alpha})`
            : `rgba(56, 195, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y - 16, 4 + (i / it.trail.length) * 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.translate(it.x, it.y);

  ctx.save();
  ctx.scale(1, 0.28);
  ctx.fillStyle = 'rgba(12, 20, 38, 0.22)';
  ctx.beginPath();
  ctx.arc(0, 2, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  let sx = 1;
  let sy = 1;
  if (it.squashTimer > 0) {
    const k = it.squashTimer / 0.18;
    sx = 1 + Math.sin(k * Math.PI) * 0.28;
    sy = 1 - Math.sin(k * Math.PI) * 0.24;
  }

  const tid = it.toyId || 'whale';
  const spriteMap = {
    whale: images.toyWhale,
    yarn: images.toyYarn,
    duck: images.toyDuck
  };
  const sp = spriteMap[tid] || images.toyWhale;

  ctx.save();
  ctx.translate(0, -18 * sy);
  ctx.scale(sx, sy);
  if (tid === 'duck') {
    ctx.scale(it.vx >= 0 ? 1 : -1, 1);
    ctx.rotate(Math.sin(now * 0.015) * 0.12 + (it.vx || 0) * 0.0008);
  } else {
    ctx.rotate(it.angle || 0);
  }

  if (isReady(sp)) {
    const sz = 56;
    ctx.drawImage(sp, -sz * 0.5, -sz * 0.5, sz, sz);
  } else {
    ctx.fillStyle = '#38b6ff';
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  if ((it.rallyCount || 0) >= 2) {
    ctx.save();
    ctx.translate(0, -44);
    ctx.font = '900 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.lineWidth = 3;
    const txt = `🔥 x${it.rallyCount}`;
    ctx.strokeText(txt, 0, 0);
    ctx.fillStyle = '#ffd700';
    ctx.fillText(txt, 0, 0);
    ctx.restore();
  }

  ctx.restore();
}

function drawVectorHeart(ctx, x, y, size) {
  if (!isReady(images.vfxHeart)) return;
  ctx.save();
  ctx.translate(x, y - size * 0.4);
  const sz = size * 2.5;
  ctx.drawImage(images.vfxHeart, -sz * 0.5, -sz * 0.5, sz, sz);
  ctx.restore();
}

function drawVectorSparkle(ctx, x, y, size, rot) {
  if (!isReady(images.vfxSparkle)) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const sz = size * 2.5;
  ctx.drawImage(images.vfxSparkle, -sz * 0.5, -sz * 0.5, sz, sz);
  ctx.restore();
}

function drawPetEmoteBubble(ctx, text, timer, now, mood = 'normal') {
  ctx.save();
  const isTsundere = mood === 'tsundere';
  const isLove = mood === 'happy' || mood === 'cheer' || mood === 'love';
  const isEat = mood === 'eat';
  const isSleep = mood === 'sleep';

  const popScale = Math.min(1, timer * 5.4) * (1 + Math.sin(now * 0.013) * 0.038);
  const jitterX = isTsundere && timer > 1.85 ? Math.sin(now * 0.09) * 2.5 : 0;
  const by = -108 + Math.sin(now * (isSleep ? 0.0045 : 0.0085)) * 3.4;
  ctx.translate(jitterX, by);
  ctx.scale(popScale, popScale);

  ctx.font = '900 12.5px "PingFang SC", "Microsoft YaHei", -apple-system, sans-serif';
  const tw = ctx.measureText(text).width + 26;
  const th = 29;
  const rx = -tw * 0.5;
  const ry = -th * 0.5;

  ctx.fillStyle = 'rgba(10, 24, 52, 0.24)';
  roundRect(ctx, rx, ry + 3, tw, th, 14.5);
  ctx.fill();

  const grad = ctx.createLinearGradient(0, ry, 0, ry + th);
  if (isLove) {
    grad.addColorStop(0, 'rgba(255, 252, 254, 0.98)');
    grad.addColorStop(1, 'rgba(255, 232, 243, 0.96)');
  } else if (isTsundere) {
    grad.addColorStop(0, 'rgba(255, 250, 251, 0.98)');
    grad.addColorStop(1, 'rgba(255, 226, 234, 0.96)');
  } else if (isEat) {
    grad.addColorStop(0, 'rgba(255, 254, 247, 0.98)');
    grad.addColorStop(1, 'rgba(255, 241, 212, 0.96)');
  } else {
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.97)');
    grad.addColorStop(1, 'rgba(232, 247, 255, 0.96)');
  }

  const borderCol = isTsundere
    ? '#ff4d79'
    : isLove
      ? '#ff6ba8'
      : isEat
        ? '#ffa928'
        : isSleep
          ? '#7f9cf5'
          : '#29a8ff';

  ctx.fillStyle = grad;
  ctx.strokeStyle = borderCol;
  ctx.lineWidth = 2.2;
  roundRect(ctx, rx, ry, tw, th, 14.5);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-5, ry + th - 1);
  ctx.lineTo(0, ry + th + 6);
  ctx.lineTo(5, ry + th - 1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 气泡右上角手绘情绪贴纸角标（爱心 / 傲娇贴纸 / 星光贴纸）
  if (isLove) {
    drawVectorHeart(ctx, rx + tw - 4, ry + 4, 8.5 + Math.sin(now * 0.016) * 1.1);
  } else if (isTsundere && isReady(images.vfxAngry)) {
    ctx.save();
    ctx.translate(rx + tw - 4, ry + 2);
    ctx.drawImage(images.vfxAngry, -9, -9, 18, 18);
    ctx.restore();
  } else if (isEat) {
    drawVectorSparkle(ctx, rx + tw - 4, ry + 2, 6.5, now * 0.004);
  }

  ctx.fillStyle = '#12284c';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 0.5);
  ctx.restore();
}

export function drawInteractionVfx(ctx, particles, touchRipples, fingerSparkle, now) {
  // 1. 柔和樱粉/星光指尖点触水波（0.36秒自然消散，无任何辅助框线）
  if (touchRipples && touchRipples.length > 0) {
    for (const rp of touchRipples) {
      const p = 1 - Math.max(0, rp.life / rp.maxLife);
      const radius = rp.startR + (rp.endR - rp.startR) * (1 - Math.pow(1 - p, 2));
      ctx.save();
      ctx.globalAlpha = Math.max(0, (1 - p) * 0.65);
      ctx.strokeStyle = rp.color || '#ff85b3';
      ctx.lineWidth = 2.4 * (1 - p * 0.6);
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      drawVectorSparkle(
        ctx,
        rp.x + Math.cos(p * 4) * radius * 0.72,
        rp.y - Math.sin(p * 4) * radius * 0.72,
        4.8 * (1 - p * 0.5),
        p * 3,
        '#ffd700'
      );
      ctx.restore();
    }
  }

  // 2. AR 食指逗宠星光萤火点（仅在伸出食指逗宠时在指尖闪烁萌系小爱心星芒）
  if (fingerSparkle && fingerSparkle.active) {
    const pulse = 1 + Math.sin(now * 0.016) * 0.18;
    ctx.save();
    ctx.translate(fingerSparkle.x, fingerSparkle.y);
    drawVectorSparkle(ctx, 0, 0, 11 * pulse, now * 0.005, 'rgba(255, 215, 0, 0.88)');
    drawVectorHeart(ctx, 0, 3.5, 8.5 * pulse, '#ff5c97');
    ctx.restore();
  }

  // 3. 高帧率二次元矢量粒子（饱满爱心 / 四芒星光 / 跳跃音符 ♪ / 睡眠 Zzz）
  for (const pt of particles) {
    const maxL = pt.maxLife || 0.55;
    const alpha = Math.max(0, Math.min(1, (pt.life / maxL) * 1.45));
    const sz = pt.size || 7.5;
    const shape = pt.shape || 'dot';

    ctx.save();
    ctx.globalAlpha = alpha;
    if (shape === 'heart') {
      const swayX = Math.sin(now * 0.012 + (pt.phase || 0)) * 5.5;
      drawVectorHeart(ctx, pt.x + swayX, pt.y, sz);
    } else if (shape === 'star') {
      drawVectorSparkle(ctx, pt.x, pt.y, sz, (pt.rot || 0) + now * 0.006);
    } else if (shape === 'note' && isReady(images.vfxNote)) {
      ctx.translate(pt.x + Math.sin(now * 0.01 + (pt.phase || 0)) * 4, pt.y);
      const nsz = sz * 2.6;
      ctx.drawImage(images.vfxNote, -nsz * 0.5, -nsz * 0.5, nsz, nsz);
    } else if (shape === 'zzz' && isReady(images.vfxZzz)) {
      ctx.translate(pt.x + Math.sin(now * 0.006 + (pt.phase || 0)) * 5, pt.y);
      const zsz = sz * 2.8;
      ctx.drawImage(images.vfxZzz, -zsz * 0.5, -zsz * 0.5, zsz, zsz);
    } else if (isReady(images.vfxSparkle)) {
      const dsz = (pt.r || 4) * 3.2;
      ctx.drawImage(images.vfxSparkle, pt.x - dsz * 0.5, pt.y - dsz * 0.5, dsz, dsz);
    }
    ctx.restore();
  }
}

export function drawFurnitureItem(ctx, furn, now, isDarkRoom = false) {
  ctx.save();
  ctx.translate(furn.x, furn.y);

  // 底部柔和落地阴影
  ctx.save();
  ctx.scale(1, 0.28);
  ctx.fillStyle = 'rgba(10, 20, 42, 0.26)';
  ctx.beginPath();
  ctx.arc(0, 4, furn.key === 'tree' ? 40 : 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const isLampLit = furn.key === 'lamp' && (isDarkRoom || furn.manualOn);
  if (isLampLit) {
    // 暗光环境或手动点亮时的星海蓝鲸小夜灯温暖柔光光晕
    const pulse = 1 + Math.sin(now * 0.005) * 0.08;
    const halo = ctx.createRadialGradient(0, -40, 8, 0, -40, 92 * pulse);
    halo.addColorStop(0, 'rgba(255, 236, 153, 0.52)');
    halo.addColorStop(0.5, 'rgba(56, 210, 255, 0.26)');
    halo.addColorStop(1, 'rgba(56, 210, 255, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, -40, 92 * pulse, 0, Math.PI * 2);
    ctx.fill();

    drawVectorSparkle(
      ctx,
      Math.cos(now * 0.003) * 32,
      -62 + Math.sin(now * 0.004) * 8,
      6.2,
      now * 0.004,
      '#ffd700'
    );
    drawVectorSparkle(
      ctx,
      -Math.cos(now * 0.0035) * 28,
      -34 + Math.cos(now * 0.004) * 8,
      5.2,
      -now * 0.004,
      '#66e3ff'
    );
  }

  let sx = 1;
  let sy = 1;
  if ((furn.squashTimer || 0) > 0) {
    const k = furn.squashTimer / 0.2;
    sx = 1 + Math.sin(k * Math.PI) * 0.16;
    sy = 1 - Math.sin(k * Math.PI) * 0.14;
  }

  const spriteMap = {
    pc: images.furnPc,
    tree: images.furnTree,
    lamp: images.furnLamp
  };
  const sp = spriteMap[furn.key] || images.furnLamp;
  const sz = furn.key === 'tree' ? 98 : furn.key === 'pc' ? 88 : 78;

  ctx.save();
  ctx.scale(sx, sy);
  if (isReady(sp)) {
    ctx.drawImage(sp, -sz * 0.5, -sz * 0.92, sz, sz);
  } else {
    ctx.fillStyle = '#38b6ff';
    ctx.beginPath();
    ctx.arc(0, -32, 26, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  if (furn.key === 'pc' && furn.working) {
    const floatY = -76 + Math.sin(now * 0.012) * 4;
    ctx.font = '900 11px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(8, 20, 46, 0.85)';
    ctx.lineWidth = 3;
    const codeTxt = Math.sin(now * 0.006) > 0 ? '💻 敲代码中 </>' : '⚡ AI 产币中 +金币';
    ctx.strokeText(codeTxt, 0, floatY);
    ctx.fillStyle = '#56e8ff';
    ctx.fillText(codeTxt, 0, floatY);
  } else if (isLampLit) {
    ctx.font = '900 10.5px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(8, 20, 46, 0.8)';
    ctx.lineWidth = 2.8;
    const lampTxt = isDarkRoom ? '🌙 暗光感应守护 +25%💗' : '✨ 星海夜灯已点亮';
    ctx.strokeText(lampTxt, 0, -76);
    ctx.fillStyle = '#ffe57f';
    ctx.fillText(lampTxt, 0, -76);
  }

  ctx.restore();
}

export function drawEnemySprite(ctx, e, now, playerX) {
  ctx.save();
  ctx.translate(e.x, e.y);
  const facing = playerX >= e.x ? 1 : -1;

  let sprite = images.slime;
  let size = 52;
  let squashX = 1;
  let squashY = 1;
  let offsetY = 0;

  if (e.isBoss) {
    sprite = isReady(images.boss) ? images.boss : images.elite;
    size = 106;
    offsetY = Math.abs(Math.sin(now * 0.012 + e.x)) * -7;
    const s = 1 + Math.sin(now * 0.02 + e.x) * 0.09;
    squashX = s;
    squashY = 1 / s;
  } else if (e.isFlyer) {
    sprite = images.bat;
    size = 56;
    offsetY = Math.sin(now * 0.015 + e.x) * 5;
    squashX = 1 + Math.sin(now * 0.028 + e.x) * 0.08;
  } else if (e.isElite || e.isGoldTreasure) {
    sprite = e.isGoldTreasure ? images.slime : images.elite;
    size = e.isGoldTreasure ? 64 : 74;
    offsetY = Math.abs(Math.sin(now * 0.014 + e.x)) * -5;
    const s = 1 + Math.sin(now * 0.022 + e.x) * 0.1;
    squashX = s;
    squashY = 1 / s;
  } else {
    sprite = images.slime;
    size = 50;
    const s = 1 + Math.sin(now * 0.018 + e.x) * 0.12;
    squashX = s;
    squashY = 1 / s;
  }

  ctx.save();
  ctx.translate(0, offsetY);
  ctx.scale(facing * squashX, squashY);

  if (isReady(sprite)) {
    ctx.drawImage(sprite, -size * 0.5, -size * 0.55, size, size);
  } else {
    ctx.fillStyle = e.isBoss ? '#a855f7' : e.isGoldTreasure ? '#ffd700' : '#ff2a7a';
    ctx.beginPath();
    ctx.arc(0, 0, e.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  if ((e.slowTimer || 0) > 0) {
    ctx.fillStyle = 'rgba(86, 226, 255, 0.35)';
    ctx.beginPath();
    ctx.arc(0, offsetY - 4, e.r + 4, 0, Math.PI * 2);
    ctx.fill();
  }

  if (e.isBoss) {
    const bw = 78;
    const bh = 7;
    const hpRatio = Math.max(0, Math.min(1, e.hp / Math.max(1, e.maxHp)));
    ctx.fillStyle = 'rgba(10, 18, 38, 0.85)';
    roundRect(ctx, -bw * 0.5, -size * 0.62 - 12, bw, bh, 3.5);
    ctx.fill();
    ctx.fillStyle = '#ff3b7f';
    roundRect(ctx, -bw * 0.5 + 1, -size * 0.62 - 11, (bw - 2) * hpRatio, bh - 2, 2.5);
    ctx.fill();

    ctx.fillStyle = '#ffd700';
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.lineWidth = 3;
    ctx.font = '900 11.5px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeText('👑 摸鱼大魔王', 0, -size * 0.62 - 16);
    ctx.fillText('👑 摸鱼大魔王', 0, -size * 0.62 - 16);
  } else if (e.isGoldTreasure) {
    ctx.fillStyle = '#ffd700';
    ctx.font = '900 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✨招财', 0, -size * 0.55);
  }

  ctx.restore();
}

export function drawStarGoal(ctx, starTarget, player, now) {
  if (!starTarget.active) return;
  ctx.save();

  const pulse = 1 + Math.sin(now * 0.007) * 0.1;
  const sx = starTarget.x;
  const sy = starTarget.y + Math.sin(now * 0.005) * 5;

  const starImg = images.star;
  if (isReady(starImg)) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(pulse, pulse);
    const sz = 72;
    ctx.drawImage(starImg, -sz * 0.5, -sz * 0.5, sz, sz);
    ctx.restore();
  } else {
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(sx, sy, 22 * pulse, 0, Math.PI * 2);
    ctx.fill();
  }

  if ((starTarget.combo || 0) >= 2) {
    ctx.font = '900 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.lineWidth = 3;
    const txt = `⭐ 星链 x${starTarget.combo}`;
    ctx.strokeText(txt, sx, sy - 38);
    ctx.fillStyle = '#00f3ff';
    ctx.fillText(txt, sx, sy - 38);
  }

  ctx.restore();
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
