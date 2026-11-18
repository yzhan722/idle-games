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
  furnMusicbox: './assets/furn_musicbox.webp?v=hd31',
  propStudyBook: './assets/prop_study_book.webp?v=hd31',

  // 治愈系手绘 UI / 装扮发饰 / 武器强化 / 粒子贴纸素材
  uiCoin: './assets/ui_coin.webp?v=hd6',
  uiBtnPomodoro: './assets/ui_btn_pomodoro.webp?v=hd31',
  uiStampFocus: './assets/ui_stamp_focus.webp?v=hd31',
  uiBtnTeatime: './assets/ui_btn_teatime.webp?v=hd31',
  teaPeachOolong: './assets/tea_peach_oolong.webp?v=hd31',
  teaBlueberryFoam: './assets/tea_blueberry_foam.webp?v=hd31',
  teaOsmanthusMilk: './assets/tea_osmanthus_milk.webp?v=hd31',
  pastrySouffle: './assets/pastry_souffle.webp?v=hd31',
  pastryWhaleMacaron: './assets/pastry_whale_macaron.webp?v=hd31',
  pastryPuddingTart: './assets/pastry_pudding_tart.webp?v=hd31',
  teaPlatterSignature: './assets/tea_platter_signature.webp?v=hd31',
  uiBtnWeeklyJournal: './assets/ui_btn_weekly_journal.webp?v=hd31',
  uiBtnTerrarium: './assets/ui_btn_terrarium.webp?v=hd31',
  plantPeachSucculent: './assets/plant_peach_succulent.webp?v=hd31',
  plantStarLily: './assets/plant_star_lily.webp?v=hd31',
  plantBlueHydrangea: './assets/plant_blue_hydrangea.webp?v=hd31',
  uiBtnMusicbox: './assets/ui_btn_musicbox.webp?v=hd31',
  stampGoodnightMoon: './assets/stamp_goodnight_moon.webp?v=hd31',
  uiBtnCollageFrame: './assets/ui_btn_collage_frame.webp?v=hd31',
  stickerLaceGarland: './assets/sticker_lace_garland.webp?v=hd31',
  stickerPressedDaisy: './assets/sticker_pressed_daisy.webp?v=hd31',
  stickerWhaleStamp: './assets/sticker_whale_stamp.webp?v=hd31',
  uiBtnCozyRadio: './assets/ui_btn_cozy_radio.webp?v=hd31',
  radioVinylNote: './assets/radio_vinyl_note.webp?v=hd31',
  uiBtnCrochetBasket: './assets/ui_btn_crochet_basket.webp?v=hd31',
  knitWhaleScarf: './assets/knit_whale_scarf.webp?v=hd31',
  knitStarCoaster: './assets/knit_star_coaster.webp?v=hd31',
  knitCloudPillow: './assets/knit_cloud_pillow.webp?v=hd31',
  uiBtnCocoaBar: './assets/ui_btn_cocoa_bar.webp?v=hd31',
  cocoaMarshmallowTopping: './assets/cocoa_marshmallow_topping.webp?v=hd31',
  uiBtnPressedFlowers: './assets/ui_btn_pressed_flowers.webp?v=hd31',
  pressedSakuraBookmark: './assets/pressed_sakura_bookmark.webp?v=hd31',
  pressedGinkgoBookmark: './assets/pressed_ginkgo_bookmark.webp?v=hd31',
  pressedBabysbreathBookmark: './assets/pressed_babysbreath_bookmark.webp?v=hd31',
  uiBtnTelescope: './assets/ui_btn_telescope.webp?v=hd31',
  uiBtnWatercolorEasel: './assets/ui_btn_watercolor_easel.webp?v=hd31',
  uiBtnMailbox: './assets/ui_btn_mailbox.webp?v=hd31',
  watercolorRainyWindow: './assets/watercolor_rainy_window.webp?v=hd31',
  watercolorPalette: './assets/watercolor_palette.webp?v=hd31',
  letterEnvelope: './assets/letter_envelope.webp?v=hd31',
  stampWhale: './assets/stamp_whale.webp?v=hd31',
  uiBtnBentoKitchen: './assets/ui_btn_bento_kitchen.webp?v=hd31',
  uiBtnMemoryPuzzle: './assets/ui_btn_memory_puzzle.webp?v=hd31',
  bentoBoxFinished: './assets/bento_box_finished.webp?v=hd31',
  onigiriTrio: './assets/onigiri_trio.webp?v=hd31',
  puzzlePieceMemory: './assets/puzzle_piece_memory.webp?v=hd31',
  memoryWallFrame: './assets/memory_wall_frame.webp?v=hd31',
  uiBtnKittenCorner: './assets/ui_btn_kitten_corner.webp?v=hd31',
  uiBtnGreetingCard: './assets/ui_btn_greeting_card.webp?v=hd31',
  kittenGinger: './assets/kitten_ginger.webp?v=hd31',
  kittenTuxedo: './assets/kitten_tuxedo.webp?v=hd31',
  catFoodBowl: './assets/cat_food_bowl.webp?v=hd31',
  handmadeCard: './assets/handmade_card.webp?v=hd31',
  uiBtnPicnicBasket: './assets/ui_btn_picnic_basket.webp?v=hd31',
  uiBtnDiary: './assets/ui_btn_diary.webp?v=hd31',
  picnicBlanket: './assets/picnic_blanket.webp?v=hd31',
  picnicSandwich: './assets/picnic_sandwich.webp?v=hd31',
  diaryPage: './assets/diary_page.webp?v=hd31',
  diarySticker: './assets/diary_sticker.webp?v=hd31',
  uiBtnPotteryWheel: './assets/ui_btn_pottery_wheel.webp?v=hd31',
  uiBtnAromaTable: './assets/ui_btn_aroma_table.webp?v=hd31',
  potteryCup: './assets/pottery_cup.webp?v=hd31',
  potteryVase: './assets/pottery_vase.webp?v=hd31',
  aromaBottle: './assets/aroma_bottle.webp?v=hd31',
  aromaDiffuser: './assets/aroma_diffuser.webp?v=hd31',
  uiBtnStarProjector: './assets/ui_btn_star_projector.webp?v=hd31',
  uiBtnRainCorner: './assets/ui_btn_rain_corner.webp?v=hd31',
  starProjector: './assets/star_projector.webp?v=hd31',
  constellationCard: './assets/constellation_card.webp?v=hd31',
  rainCushion: './assets/rain_cushion.webp?v=hd31',
  rainChime: './assets/rain_chime.webp?v=hd31',
  // AR-16 墙面刺绣绷架 & 地板小暖炉冬日角（奶油手账风去底贴图）
  uiBtnEmbroidery: './assets/ui_btn_embroidery.webp?v=hd31',
  uiBtnHearthCorner: './assets/ui_btn_hearth_corner.webp?v=hd31',
  embroideryHoop: './assets/embroidery_hoop.webp?v=hd31',
  embroideryPatch: './assets/embroidery_patch.webp?v=hd31',
  floorHeater: './assets/floor_heater.webp?v=hd31',
  roastedSnack: './assets/roasted_snack.webp?v=hd31',
  itemBow: './assets/item_bow.webp?v=hd6',
  itemCrown: './assets/item_crown.webp?v=hd6',
  itemAura: './assets/item_aura.webp?v=hd6',
  itemShellClip: './assets/item_shell_clip.webp?v=hd31',
  itemStarWreath: './assets/item_star_wreath.webp?v=hd31',
  vfxSeasonSpring: './assets/vfx_season_spring.webp?v=hd31',
  vfxSeasonSummer: './assets/vfx_season_summer.webp?v=hd31',
  vfxSeasonAutumn: './assets/vfx_season_autumn.webp?v=hd31',
  vfxSeasonWinter: './assets/vfx_season_winter.webp?v=hd31',
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
  vfxGem: './assets/vfx_gem.webp?v=hd6',

  // AR-1 幸存者打工 2.0：奶油手账风肉鸽技能卡、蓝鲸/茶刃超武与最高班次徽章贴图
  skFrostBubble: './assets/sk_frost_bubble.webp?v=hd15',
  skCatLightning: './assets/sk_cat_lightning.webp?v=hd15',
  skOnigiriHeal: './assets/sk_onigiri_heal.webp?v=hd15',
  skStarPhantom: './assets/sk_star_phantom.webp?v=hd15',
  skCritCharm: './assets/sk_crit_charm.webp?v=hd15',
  upgSuperWhale: './assets/upg_super_whale.webp?v=hd15',
  upgSuperTeablade: './assets/upg_super_teablade.webp?v=hd15',
  uiBadgeShift: './assets/ui_badge_shift.webp?v=hd15'
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
    } else if (p.isFocusStudying && !p.onPalm && isReady(images.heroSitEdge)) {
      poseKey = 'focus_study';
      targetSprite = images.heroSitEdge;
      const calmReadPhase = anim.breathPhase * 0.62;
      targetLegShearX = Math.sin(calmReadPhase) * 2.2;
      targetHeadSwayX = Math.sin(calmReadPhase * 0.8) * 1.8 + 1.4;
      targetTilt = Math.sin(calmReadPhase * 0.5) * 0.016;
      targetBounceY = Math.sin(calmReadPhase) * -1.1;
      breathExpand = Math.sin(calmReadPhase) * 0.016;
    } else if (p.isRadioListening && !p.onPalm) {
      poseKey = 'radio_sway';
      const humBeat = anim.swayPhase * 0.92;
      const humMouth = Math.sin(now * 0.0065) > 0.35;
      targetSprite =
        humMouth && isReady(images.heroIdleTalk)
          ? images.heroIdleTalk
          : isReady(images.heroIdle2)
            ? images.heroIdle2
            : images.heroIdle;
      targetHeadSwayX = Math.sin(humBeat) * 3.8;
      targetTorsoTwistX = Math.sin(humBeat) * 2.4;
      targetTilt = Math.sin(humBeat) * 0.036;
      targetBounceY = Math.abs(Math.sin(humBeat)) * -2.6;
      breathExpand = Math.sin(humBeat * 1.2) * 0.02;
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

  if (eq.star_wreath && isReady(images.itemStarWreath)) {
    ctx.save();
    ctx.translate(hatOffsetX, headTopY - 1);
    ctx.rotate(anim.headSwayX * 0.01);
    ctx.drawImage(images.itemStarWreath, -22, -12, 44, 24);
    ctx.restore();
  }
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
  if (eq.shell_clip && isReady(images.itemShellClip)) {
    ctx.save();
    ctx.translate(18 + hatOffsetX, headTopY + 14);
    ctx.rotate(0.22 + anim.headSwayX * 0.015);
    ctx.drawImage(images.itemShellClip, -11, -11, 22, 22);
    ctx.restore();
  }

  ctx.restore();

  if (p.emote && p.emoteTimer > 0 && !p.drawerOpen) {
    drawPetEmoteBubble(ctx, p.emote, p.emoteTimer, now, p.emoteMood || 'normal', p.x, p.y, Boolean(p.rpsHudOpen));
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
    cake: images.foodCake,
    teaPlatter: images.teaPlatterSignature
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
    const txt = `连击 x${it.rallyCount}`;
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

function drawPetEmoteBubble(ctx, text, timer, now, mood = 'normal', px = 420, py = 240, rpsHudOpen = false) {
  ctx.save();
  const isTsundere = mood === 'tsundere';
  const isLove = mood === 'happy' || mood === 'cheer' || mood === 'love';
  const isEat = mood === 'eat';
  const isSleep = mood === 'sleep';

  const popScale = Math.min(1, timer * 5.4) * (1 + Math.sin(now * 0.013) * 0.038);
  const jitterX = isTsundere && timer > 1.85 ? Math.sin(now * 0.09) * 2.5 : 0;
  const rawBy = (rpsHudOpen ? -64 : -108) + Math.sin(now * (isSleep ? 0.0045 : 0.0085)) * 3.4;
  const by = Math.max(78 - py, rawBy);
  ctx.translate(jitterX, by);
  ctx.scale(popScale, popScale);

  ctx.font = '900 12.5px "PingFang SC", "Microsoft YaHei", -apple-system, sans-serif';
  const tw = ctx.measureText(text).width + 26;
  const th = 29;
  const ceilingDodge = by > rawBy + 18 ? (px > 480 ? -(tw * 0.5 + 52) : tw * 0.5 + 52) : 0;
  const shiftX = rpsHudOpen
    ? Math.min(182, Math.max(126, tw * 0.5 + 68))
    : py + by < 126 && px - tw * 0.5 < 246
      ? Math.max(0, 246 - (px - tw * 0.5))
      : 0;
  const rx = -tw * 0.5 + (ceilingDodge || shiftX);
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
  const tailX = Math.max(rx + 15, Math.min(rx + tw - 15, 0));
  ctx.moveTo(tailX - 5, ry + th - 1);
  ctx.lineTo(tailX, ry + th + 6);
  ctx.lineTo(tailX + 5, ry + th - 1);
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
  ctx.fillText(text, rx + tw * 0.5, 0.5);
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

export function drawFurnitureItem(ctx, furn, now, isDarkRoom = false, hideLabel = false) {
  ctx.save();
  ctx.translate(furn.x, furn.y);

  // 底部柔和落地阴影
  ctx.save();
  ctx.scale(1, 0.28);
  ctx.fillStyle = furn.isDragging ? 'rgba(255, 178, 92, 0.34)' : 'rgba(10, 20, 42, 0.26)';
  ctx.beginPath();
  ctx.arc(0, 4, furn.key === 'tree' ? 40 : 34, 0, Math.PI * 2);
  ctx.fill();
  if (furn.isDragging) {
    ctx.strokeStyle = 'rgba(255, 232, 148, 0.92)';
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(0, 4, furn.key === 'tree' ? 46 : 40, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  const isLampLit = furn.key === 'lamp' && (isDarkRoom || furn.manualOn);
  const isMusicPlaying = furn.key === 'musicbox' && furn.isPlaying !== false;
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
  } else if (isMusicPlaying) {
    const pulse = 1 + Math.sin(now * 0.0045) * 0.07;
    const mHalo = ctx.createRadialGradient(0, -38, 6, 0, -38, 68 * pulse);
    mHalo.addColorStop(0, 'rgba(255, 216, 236, 0.36)');
    mHalo.addColorStop(0.6, 'rgba(138, 216, 255, 0.18)');
    mHalo.addColorStop(1, 'rgba(138, 216, 255, 0)');
    ctx.fillStyle = mHalo;
    ctx.beginPath();
    ctx.arc(0, -38, 68 * pulse, 0, Math.PI * 2);
    ctx.fill();
  }

  let sx = 1;
  let sy = 1;
  if ((furn.squashTimer || 0) > 0) {
    const k = furn.squashTimer / 0.2;
    sx = 1 + Math.sin(k * Math.PI) * 0.16;
    sy = 1 - Math.sin(k * Math.PI) * 0.14;
  } else if (isMusicPlaying) {
    const beat = Math.sin(now * 0.0065) * 0.025;
    sx = 1 + beat;
    sy = 1 - beat * 0.8;
  }

  const spriteMap = {
    pc: images.furnPc,
    tree: images.furnTree,
    lamp: images.furnLamp,
    musicbox: images.furnMusicbox
  };
  const sp = spriteMap[furn.key] || images.furnLamp;
  const sz = furn.key === 'tree' ? 98 : furn.key === 'pc' ? 88 : furn.key === 'musicbox' ? 84 : 78;

  ctx.save();
  if (furn.isDragging) {
    ctx.translate(0, -6);
    sx *= 1.05;
    sy *= 1.05;
  }
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

  if (furn.isDragging) {
    ctx.font = '900 10.5px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(58, 75, 110, 0.88)';
    ctx.lineWidth = 3;
    const dragTxt = '左右拖动摆位';
    ctx.strokeText(dragTxt, 0, -sz - 4);
    ctx.fillStyle = '#fff5cc';
    ctx.fillText(dragTxt, 0, -sz - 4);
  } else if (!hideLabel && furn.key === 'pc' && furn.working) {
    const floatY = -76 + Math.sin(now * 0.012) * 4;
    ctx.font = '900 11px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(8, 20, 46, 0.85)';
    ctx.lineWidth = 3;
    const codeTxt = Math.sin(now * 0.006) > 0 ? '敲代码中 </>' : 'AI 产币中 +金币';
    ctx.strokeText(codeTxt, 0, floatY);
    ctx.fillStyle = '#56e8ff';
    ctx.fillText(codeTxt, 0, floatY);
  } else if (!hideLabel && furn.key === 'musicbox') {
    const floatY = -78 + Math.sin(now * 0.008) * 3;
    ctx.font = '900 10.5px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(58, 75, 110, 0.85)';
    ctx.lineWidth = 2.8;
    const trackTxt = `♪ ${furn.trackName || '晴空卡林巴'}`;
    ctx.strokeText(trackTxt, 0, floatY);
    ctx.fillStyle = '#ffd9ec';
    ctx.fillText(trackTxt, 0, floatY);
  } else if (!hideLabel && isLampLit) {
    ctx.font = '900 10.5px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(8, 20, 46, 0.8)';
    ctx.lineWidth = 2.8;
    const lampTxt = isDarkRoom ? '暗光感应守护 +25% 亲密' : '星海夜灯已点亮';
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
    const bossLabel = e.bossName ? e.bossName.split('·').pop().trim() : '摸鱼大魔王';
    ctx.strokeText(bossLabel, 0, -size * 0.62 - 16);
    ctx.fillText(bossLabel, 0, -size * 0.62 - 16);
  } else if (e.isGoldTreasure) {
    ctx.fillStyle = '#ffd700';
    ctx.font = '900 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('招财', 0, -size * 0.55);
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
    const txt = `星链 x${starTarget.combo}`;
    ctx.strokeText(txt, sx, sy - 38);
    ctx.fillStyle = '#00f3ff';
    ctx.fillText(txt, sx, sy - 38);
  }

  ctx.restore();
}

export function drawStudyCompanionProp(ctx, p, now) {
  if (!p || !p.isFocusStudying || p.onPalm || !isReady(images.propStudyBook)) return;
  const side = p.facing || 1;
  const bookX = p.x + side * 66;
  const bookY = p.y + 26;
  const sz = 62;
  const floatY = Math.sin(now * 0.0028) * 1.2;

  ctx.save();
  ctx.translate(bookX, bookY + floatY);
  const warmGlow = ctx.createRadialGradient(0, -18, 4, 0, -18, 44);
  warmGlow.addColorStop(0, 'rgba(255, 240, 202, 0.36)');
  warmGlow.addColorStop(1, 'rgba(255, 240, 202, 0)');
  ctx.fillStyle = warmGlow;
  ctx.fillRect(-44, -60, 88, 72);
  ctx.drawImage(images.propStudyBook, -sz * 0.5, -sz * 0.88, sz, sz);
  if (isReady(images.vfxSparkle)) {
    const spPulse = 0.38 + 0.42 * Math.sin(now * 0.0036);
    ctx.globalAlpha = Math.max(0.16, spPulse);
    ctx.drawImage(images.vfxSparkle, 10, -48, 14, 14);
  }
  ctx.restore();
}

export function drawAfternoonTeaProp(ctx, p, now) {
  if (!p || !(p.teaPlatterTimer > 0) || p.onPalm || p.isFocusStudying || !isReady(images.teaPlatterSignature)) {
    return;
  }
  const side = p.facing || 1;
  const platterX = p.x + side * 68;
  const platterY = p.y + 27;
  const sz = 66;
  const fadeAlpha = Math.min(1, p.teaPlatterTimer / 0.8);
  const floatY = Math.sin(now * 0.0032) * 1.1;

  ctx.save();
  ctx.globalAlpha = fadeAlpha;
  ctx.translate(platterX, platterY + floatY);
  const honeyGlow = ctx.createRadialGradient(0, -24, 5, 0, -24, 46);
  honeyGlow.addColorStop(0, 'rgba(255, 232, 196, 0.44)');
  honeyGlow.addColorStop(1, 'rgba(255, 232, 196, 0)');
  ctx.fillStyle = honeyGlow;
  ctx.fillRect(-46, -66, 92, 76);
  ctx.drawImage(images.teaPlatterSignature, -sz * 0.5, -sz * 0.92, sz, sz);
  if (isReady(images.vfxHeart)) {
    const heartY = -56 - ((now * 0.012) % 10);
    ctx.globalAlpha = fadeAlpha * (0.45 + 0.35 * Math.sin(now * 0.0045));
    ctx.drawImage(images.vfxHeart, -18, heartY, 13, 13);
  }
  if (isReady(images.vfxSparkle)) {
    ctx.globalAlpha = fadeAlpha * (0.4 + 0.4 * Math.cos(now * 0.004));
    ctx.drawImage(images.vfxSparkle, 10, -52, 14, 14);
  }
  ctx.restore();
}

export function drawTerrariumDeskShelf(ctx, p, W, H, now) {
  const list = p && Array.isArray(p.displayedTerrariumPlants) ? p.displayedTerrariumPlants : [];
  if (list.length === 0) return;

  for (let idx = 0; idx < list.length; idx++) {
    const slot = list[idx];
    const plantImg = images[slot.spriteKey];
    if (!isReady(plantImg)) continue;

    const baseSz = 50 + Math.min(5, Math.max(1, slot.level || 1)) * 3.8;
    const sway = Math.sin(now * 0.0023 + idx * 1.7) * 0.028;
    const breathY = Math.sin(now * 0.0031 + idx * 1.3) * 1.2;

    ctx.save();
    ctx.translate(slot.x, slot.y + breathY);

    const sunGlow = ctx.createRadialGradient(0, -baseSz * 0.42, 4, 0, -baseSz * 0.42, baseSz * 0.78);
    sunGlow.addColorStop(0, slot.level >= 4 ? 'rgba(255, 239, 196, 0.52)' : 'rgba(255, 245, 218, 0.34)');
    sunGlow.addColorStop(1, 'rgba(255, 245, 218, 0)');
    ctx.fillStyle = sunGlow;
    ctx.fillRect(-baseSz * 0.8, -baseSz * 1.15, baseSz * 1.6, baseSz * 1.3);

    ctx.save();
    ctx.rotate(sway);
    ctx.drawImage(plantImg, -baseSz * 0.5, -baseSz * 0.94, baseSz, baseSz);
    ctx.restore();

    if ((slot.level || 1) >= 3 && isReady(images.vfxSparkle)) {
      const spAlpha = 0.35 + 0.42 * Math.sin(now * 0.0038 + idx * 2.1);
      ctx.globalAlpha = Math.max(0.15, spAlpha);
      ctx.drawImage(images.vfxSparkle, baseSz * 0.16, -baseSz * 0.88, 13, 13);
    }
    if (slot.hasDew && isReady(images.vfxSparkle)) {
      const dewBob = Math.sin(now * 0.005 + idx) * 2.5;
      ctx.globalAlpha = 0.86;
      ctx.drawImage(images.vfxSparkle, -baseSz * 0.36, -baseSz * 0.76 + dewBob, 12, 12);
    }

    if (!p.hideTerrariumLabels) {
      ctx.globalAlpha = 0.92;
      ctx.font = '900 9.5px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(104, 70, 44, 0.86)';
      ctx.lineWidth = 2.6;
      const tagText = `${slot.shortName} Lv.${slot.level}`;
      ctx.strokeText(tagText, 0, 10);
      ctx.fillStyle = '#fff9ec';
      ctx.fillText(tagText, 0, 10);
    }

    ctx.restore();
  }
}

export function drawGoodnightMusicboxProp(ctx, p, now) {
  if (!p || !p.isGoodnightSleeping || p.onPalm || !isReady(images.uiBtnMusicbox)) {
    return;
  }
  const side = p.facing || 1;
  const boxX = p.x - side * 68;
  const boxY = p.y + 26;
  const sz = 62;
  const sway = Math.sin(now * 0.0026) * 0.03;

  ctx.save();
  ctx.translate(boxX, boxY);
  const lanternGlow = ctx.createRadialGradient(0, -26, 6, 0, -26, 56);
  lanternGlow.addColorStop(0, 'rgba(255, 234, 188, 0.56)');
  lanternGlow.addColorStop(0.6, 'rgba(245, 214, 240, 0.24)');
  lanternGlow.addColorStop(1, 'rgba(255, 234, 188, 0)');
  ctx.fillStyle = lanternGlow;
  ctx.fillRect(-58, -80, 116, 96);

  ctx.save();
  ctx.rotate(sway);
  ctx.drawImage(images.uiBtnMusicbox, -sz * 0.5, -sz * 0.92, sz, sz);
  ctx.restore();

  if (isReady(images.vfxNote)) {
    const floatOffset = (now * 0.014) % 16;
    ctx.globalAlpha = 0.48 + 0.34 * Math.sin(now * 0.004);
    ctx.drawImage(images.vfxNote, -18, -56 - floatOffset, 14, 14);
  }
  if (isReady(images.vfxZzz)) {
    const zOffset = (now * 0.011 + 6) % 16;
    ctx.globalAlpha = 0.44 + 0.34 * Math.cos(now * 0.0035);
    ctx.drawImage(images.vfxZzz, 8, -58 - zOffset, 15, 15);
  }
  ctx.restore();
}

export function drawCollageKeepsakeFrame(ctx, p, W, H, now) {
  const ck = p && p.collageKeepsake;
  if (!ck || !ck.deskDisplayed || !(ck.savedCount > 0) || !isReady(images.uiBtnCollageFrame)) {
    return;
  }
  const frameX = Math.max(W * 0.245, W * 0.20 + 66);
  const frameY = H * 0.68 + 6;
  const baseSz = 66;
  const gentleSway = Math.sin(now * 0.0021) * 0.022;

  ctx.save();
  ctx.translate(frameX, frameY);

  const frameGlow = ctx.createRadialGradient(0, -baseSz * 0.48, 5, 0, -baseSz * 0.48, baseSz * 0.78);
  const tintMap = {
    lace_ivory: 'rgba(255, 249, 236, 0.52)',
    honey_kraft: 'rgba(255, 234, 194, 0.54)',
    sakura_letter: 'rgba(255, 226, 236, 0.52)'
  };
  frameGlow.addColorStop(0, tintMap[ck.frameStyle] || tintMap.lace_ivory);
  frameGlow.addColorStop(1, 'rgba(255, 249, 236, 0)');
  ctx.fillStyle = frameGlow;
  ctx.fillRect(-baseSz * 0.8, -baseSz * 1.15, baseSz * 1.6, baseSz * 1.25);

  ctx.save();
  ctx.rotate(gentleSway);
  ctx.drawImage(images.uiBtnCollageFrame, -baseSz * 0.5, -baseSz * 0.96, baseSz, baseSz);

  const portraitMap = {
    peace_snap: images.heroPosePeace,
    cheer_snap: images.heroPoseCheer,
    study_snap: images.heroSitEdge
  };
  const heroThumb = portraitMap[ck.photoId] || images.heroPosePeace;
  if (isReady(heroThumb)) {
    ctx.save();
    roundRect(ctx, -18, -baseSz * 0.78, 36, 33, 4);
    ctx.clip();
    ctx.drawImage(heroThumb, -20, -baseSz * 0.80, 40, 40);
    ctx.restore();
  }

  const stickers = ck.stickers || {};
  const miniDefs = [
    { key: 'lace_garland', img: images.stickerLaceGarland, sz: 24 },
    { key: 'pressed_daisy', img: images.stickerPressedDaisy, sz: 20 },
    { key: 'whale_stamp', img: images.stickerWhaleStamp, sz: 19 }
  ];
  for (const def of miniDefs) {
    const st = stickers[def.key];
    if (!st || !st.enabled || !isReady(def.img)) continue;
    const sx = ((Number(st.xPct) || 50) - 50) * 0.44;
    const sy = -baseSz * 0.52 + ((Number(st.yPct) || 50) - 50) * 0.42;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(((Number(st.rotDeg) || 0) * Math.PI) / 180);
    ctx.drawImage(def.img, -def.sz * 0.5, -def.sz * 0.5, def.sz, def.sz);
    ctx.restore();
  }
  ctx.restore();

  if (isReady(images.vfxSparkle)) {
    ctx.globalAlpha = 0.36 + 0.38 * Math.sin(now * 0.0036);
    ctx.drawImage(images.vfxSparkle, 18, -baseSz * 0.92, 13, 13);
  }

  if (!p.hideTerrariumLabels) {
    ctx.globalAlpha = 0.92;
    ctx.font = '900 9.5px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(104, 70, 44, 0.86)';
    ctx.lineWidth = 2.6;
    const labelTxt = '拼贴纪念框';
    ctx.strokeText(labelTxt, 0, 10);
    ctx.fillStyle = '#fff9ec';
    ctx.fillText(labelTxt, 0, 10);
  }

  ctx.restore();
}

export function drawCozyTabletopRadio(ctx, p, W, H, now) {
  if (!p || !isReady(images.uiBtnCozyRadio)) return;
  const radioState = p.cozyRadioVisual || {};
  const isPlaying = Boolean(radioState.playing);
  const radioX = W * 0.755;
  const radioY = H * 0.68 + 6;
  const sz = 62;
  const grooveRock = isPlaying ? Math.sin(now * 0.0052) * 0.038 : Math.sin(now * 0.0018) * 0.01;
  const bounceY = isPlaying ? Math.abs(Math.sin(now * 0.0052)) * -1.8 : 0;

  ctx.save();
  ctx.translate(radioX, radioY + bounceY);

  const dialGlow = ctx.createRadialGradient(0, -28, 4, 0, -28, isPlaying ? 58 : 38);
  dialGlow.addColorStop(0, isPlaying ? 'rgba(255, 232, 182, 0.62)' : 'rgba(255, 245, 224, 0.28)');
  dialGlow.addColorStop(1, 'rgba(255, 232, 182, 0)');
  ctx.fillStyle = dialGlow;
  ctx.fillRect(-60, -82, 120, 96);

  if (isPlaying && isReady(images.radioVinylNote)) {
    ctx.save();
    ctx.translate(22, -26 + Math.sin(now * 0.0042) * 2.2);
    ctx.rotate(0.08 + Math.sin(now * 0.0036) * 0.06);
    ctx.globalAlpha = 0.94;
    ctx.drawImage(images.radioVinylNote, -18, -18, 36, 36);
    ctx.restore();
  }

  ctx.save();
  ctx.rotate(grooveRock);
  ctx.drawImage(images.uiBtnCozyRadio, -sz * 0.5, -sz * 0.94, sz, sz);
  ctx.restore();

  if (isPlaying && isReady(images.vfxNote)) {
    const floatA = (now * 0.018) % 20;
    const floatB = (now * 0.015 + 10) % 20;
    ctx.globalAlpha = 0.52 + 0.36 * Math.sin(now * 0.005);
    ctx.drawImage(images.vfxNote, -22, -52 - floatA, 14, 14);
    ctx.globalAlpha = 0.44 + 0.36 * Math.cos(now * 0.0046);
    ctx.drawImage(images.vfxNote, 10, -56 - floatB, 13, 13);
  }

  if (!p.hideTerrariumLabels) {
    ctx.globalAlpha = 0.92;
    ctx.font = '900 9.5px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(104, 70, 44, 0.86)';
    ctx.lineWidth = 2.6;
    const radioTag = isPlaying ? radioState.code || 'CH-01 播音' : '窗畔轻电台';
    ctx.strokeText(radioTag, 0, 10);
    ctx.fillStyle = '#fff9ec';
    ctx.fillText(radioTag, 0, 10);
  }

  ctx.restore();
}

export function drawCrochetKeepsakeDesk(ctx, p, W, H, now) {
  const vis = p && p.crochetDeskVisual;
  if (!vis || !vis.displayed || !(vis.level > 0)) return;
  const knitImg = images[vis.spriteKey];
  if (!isReady(knitImg)) return;

  const deskX = W * 0.692;
  const deskY = H * 0.68 + 6;
  const baseSz = 54 + Math.min(3, Math.max(1, vis.level || 1)) * 4;
  const sway = Math.sin(now * 0.0024 + 0.9) * 0.025;
  const breathY = Math.sin(now * 0.003 + 0.5) * 1.1;

  ctx.save();
  ctx.translate(deskX, deskY + breathY);

  const woolGlow = ctx.createRadialGradient(0, -baseSz * 0.45, 5, 0, -baseSz * 0.45, baseSz * 0.82);
  woolGlow.addColorStop(0, vis.level >= 3 ? 'rgba(255, 236, 206, 0.58)' : 'rgba(255, 245, 228, 0.4)');
  woolGlow.addColorStop(1, 'rgba(255, 245, 228, 0)');
  ctx.fillStyle = woolGlow;
  ctx.fillRect(-baseSz * 0.85, -baseSz * 1.15, baseSz * 1.7, baseSz * 1.3);

  if (isReady(images.uiBtnCrochetBasket)) {
    ctx.save();
    ctx.globalAlpha = 0.88;
    ctx.translate(-22, -2);
    ctx.rotate(-0.06);
    ctx.drawImage(images.uiBtnCrochetBasket, -17, -34, 34, 34);
    ctx.restore();
  }

  ctx.save();
  ctx.rotate(sway);
  ctx.drawImage(knitImg, -baseSz * 0.5, -baseSz * 0.95, baseSz, baseSz);
  ctx.restore();

  if (vis.level >= 2 && isReady(images.vfxHeart)) {
    const floatH = (now * 0.012) % 12;
    ctx.globalAlpha = 0.42 + 0.36 * Math.sin(now * 0.0042);
    ctx.drawImage(images.vfxHeart, 14, -baseSz * 0.88 - floatH, 12, 12);
  }
  if (vis.level >= 3 && isReady(images.vfxSparkle)) {
    ctx.globalAlpha = 0.38 + 0.42 * Math.cos(now * 0.0038);
    ctx.drawImage(images.vfxSparkle, -22, -baseSz * 0.86, 13, 13);
  }

  if (!p.hideTerrariumLabels) {
    ctx.globalAlpha = 0.92;
    ctx.font = '900 9.5px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(104, 70, 44, 0.86)';
    ctx.lineWidth = 2.6;
    const tagTxt = `${vis.shortName} Lv.${vis.level}`;
    ctx.strokeText(tagTxt, 0, 10);
    ctx.fillStyle = '#fff9ec';
    ctx.fillText(tagTxt, 0, 10);
  }

  ctx.restore();
}

export function drawHotCocoaProp(ctx, p, now) {
  if (!p || !(p.cocoaCupTimer > 0) || p.onPalm || p.isFocusStudying || !isReady(images.uiBtnCocoaBar)) {
    return;
  }
  const side = p.facing || 1;
  const cupX = p.x - side * 68;
  const cupY = p.y + 27;
  const sz = 62;
  const fadeAlpha = Math.min(1, p.cocoaCupTimer / 0.8);
  const floatY = Math.sin(now * 0.0034 + 1.1) * 1.2;

  ctx.save();
  ctx.globalAlpha = fadeAlpha;
  ctx.translate(cupX, cupY + floatY);

  const cocoaGlow = ctx.createRadialGradient(0, -24, 5, 0, -24, 48);
  cocoaGlow.addColorStop(0, 'rgba(255, 226, 186, 0.52)');
  cocoaGlow.addColorStop(1, 'rgba(255, 226, 186, 0)');
  ctx.fillStyle = cocoaGlow;
  ctx.fillRect(-48, -68, 96, 78);

  ctx.drawImage(images.uiBtnCocoaBar, -sz * 0.5, -sz * 0.92, sz, sz);

  if (p.cocoaToppingId === 'star_marshmallow' && isReady(images.cocoaMarshmallowTopping)) {
    ctx.save();
    ctx.translate(20, -18 + Math.sin(now * 0.0045) * 1.4);
    ctx.rotate(0.08);
    ctx.drawImage(images.cocoaMarshmallowTopping, -15, -15, 30, 30);
    ctx.restore();
  }

  if (isReady(images.vfxHeart)) {
    const steamY = -56 - ((now * 0.015) % 14);
    ctx.globalAlpha = fadeAlpha * (0.48 + 0.36 * Math.sin(now * 0.0048));
    ctx.drawImage(images.vfxHeart, -16, steamY, 13, 13);
  }
  if (isReady(images.vfxSparkle)) {
    const steamY2 = -52 - ((now * 0.013 + 7) % 14);
    ctx.globalAlpha = fadeAlpha * (0.42 + 0.38 * Math.cos(now * 0.0042));
    ctx.drawImage(images.vfxSparkle, 8, steamY2, 13, 13);
  }

  ctx.restore();
}

// AR-9 干花标本书签木桌陈列：已压制的书签以扇形立在压花册旁（仅绘制贴图，不绘制矢量图标）
export function drawPressedFlowerDesk(ctx, p, W, H, now) {
  const vis = p && p.pressedDeskVisual;
  if (!vis || !vis.displayed || !Array.isArray(vis.items) || vis.items.length === 0) return;

  const deskX = Math.min(W - 64, W * 0.855);
  const deskY = H * 0.68 + 6;
  const count = vis.items.length;
  const fanAngles = count === 1 ? [0] : count === 2 ? [-0.16, 0.16] : [-0.3, 0, 0.3];
  const fanOffsets = count === 1 ? [0] : count === 2 ? [-11, 11] : [-20, 0, 20];
  const breathY = Math.sin(now * 0.0029 + 1.4) * 1.0;

  ctx.save();
  ctx.translate(deskX, deskY + breathY);

  const paperGlow = ctx.createRadialGradient(0, -30, 5, 0, -30, 62);
  paperGlow.addColorStop(0, vis.totalLevel >= 9 ? 'rgba(255, 236, 228, 0.6)' : 'rgba(255, 246, 236, 0.42)');
  paperGlow.addColorStop(1, 'rgba(255, 246, 236, 0)');
  ctx.fillStyle = paperGlow;
  ctx.fillRect(-66, -84, 132, 96);

  if (isReady(images.uiBtnPressedFlowers)) {
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.translate(-30, -1);
    ctx.rotate(-0.08);
    ctx.drawImage(images.uiBtnPressedFlowers, -18, -32, 36, 36);
    ctx.restore();
  }

  for (let i = 0; i < count; i++) {
    const item = vis.items[i];
    const img = images[item.spriteKey];
    if (!isReady(img)) continue;
    const sz = 40 + Math.min(3, Math.max(1, item.level || 1)) * 4;
    const sway = Math.sin(now * 0.0022 + i * 1.6) * 0.03;
    ctx.save();
    ctx.translate(fanOffsets[i] + 8, 0);
    ctx.rotate(fanAngles[i] + sway);
    ctx.drawImage(img, -sz * 0.5, -sz * 0.98, sz, sz);
    ctx.restore();
  }

  if (vis.totalLevel >= 6 && isReady(images.vfxSparkle)) {
    ctx.globalAlpha = 0.36 + 0.4 * Math.sin(now * 0.004 + 0.6);
    ctx.drawImage(images.vfxSparkle, 22, -62 - ((now * 0.01) % 10), 12, 12);
  }

  if (!p.hideTerrariumLabels) {
    ctx.globalAlpha = 0.92;
    ctx.font = '900 9.5px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(122, 72, 72, 0.84)';
    ctx.lineWidth = 2.6;
    const tagTxt = `压花书签 Lv.${vis.totalLevel}`;
    ctx.strokeText(tagTxt, 0, 10);
    ctx.fillStyle = '#fff9ef';
    ctx.fillText(tagTxt, 0, 10);
  }

  ctx.restore();
}

// AR-9 观星陪伴：连星观测期间她身旁立起窗畔小望远镜贴图
export function drawStargazeTelescopeProp(ctx, p, now) {
  if (!p || !p.isStargazing || p.onPalm || p.isFocusStudying || !isReady(images.uiBtnTelescope)) return;
  const side = p.facing || 1;
  const propX = p.x - side * 66;
  const propY = p.y + 26;
  const sz = 60;
  const floatY = Math.sin(now * 0.003 + 0.4) * 1.1;

  ctx.save();
  ctx.translate(propX, propY + floatY);

  const starGlow = ctx.createRadialGradient(0, -30, 4, 0, -30, 50);
  starGlow.addColorStop(0, 'rgba(255, 240, 206, 0.5)');
  starGlow.addColorStop(1, 'rgba(255, 240, 206, 0)');
  ctx.fillStyle = starGlow;
  ctx.fillRect(-50, -74, 100, 84);

  ctx.drawImage(images.uiBtnTelescope, -sz * 0.5, -sz * 0.92, sz, sz);

  if (isReady(images.vfxSparkle)) {
    ctx.globalAlpha = 0.42 + 0.4 * Math.sin(now * 0.0046);
    ctx.drawImage(images.vfxSparkle, side > 0 ? -26 : 14, -66 - ((now * 0.012) % 12), 13, 13);
    ctx.globalAlpha = 0.36 + 0.36 * Math.cos(now * 0.0038);
    ctx.drawImage(images.vfxSparkle, side > 0 ? 10 : -22, -60 - ((now * 0.009 + 5) % 12), 10, 10);
  }

  ctx.restore();
}

// AR-10 墙面水彩画廊：右侧墙面 3×2 挂画位（与 game.js 点击判定共用同一套几何）
export function getWatercolorGalleryLayout(W, H, count) {
  const n = Math.max(0, Math.min(6, Math.round(Number(count) || 0)));
  const s = Math.max(38, Math.min(74, H * 0.105));
  const gap = Math.round(s * 0.2);
  const cols = 3;
  const rows = n > 3 ? 2 : 1;
  const gridW = cols * s + (cols - 1) * gap;
  const right = W - Math.max(18, W * 0.022);
  const left = right - gridW;
  const top = Math.max(H * 0.2, 64) + s * 0.16;
  const slots = [];
  for (let i = 0; i < n; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    slots.push({ x: left + col * (s + gap), y: top + row * (s + gap), w: s, h: s });
  }
  return { s, gap, left, right, top, bottom: top + rows * s + (rows - 1) * gap, centerX: left + gridW * 0.5, slots };
}

// 调色盘滤镜仅作用于已提供的水彩画贴图（离屏缓存一次，不绘制任何矢量图形）
const watercolorTintCache = {};
function getTintedPaintingSource(img, paletteId, filterStr) {
  if (!isReady(img)) return null;
  const key = `${paletteId}|${img.src}`;
  if (watercolorTintCache[key]) return watercolorTintCache[key];
  let out = img;
  try {
    const cv = document.createElement('canvas');
    cv.width = img.naturalWidth;
    cv.height = img.naturalHeight;
    const c2 = cv.getContext('2d');
    if (c2) {
      if (filterStr && 'filter' in c2) c2.filter = filterStr;
      c2.drawImage(img, 0, 0);
      out = cv;
    }
  } catch (e) {
    out = img;
  }
  watercolorTintCache[key] = out;
  return out;
}

export function drawWatercolorWallGallery(ctx, p, W, H, now) {
  const vis = p && p.watercolorWallVisual;
  if (!vis || !Array.isArray(vis.items) || vis.items.length === 0) return;
  const layout = getWatercolorGalleryLayout(W, H, vis.items.length);
  const s = layout.s;

  ctx.save();

  if (isReady(images.stickerLaceGarland)) {
    const bowSz = s * 0.62;
    ctx.globalAlpha = 0.95;
    ctx.drawImage(images.stickerLaceGarland, layout.centerX - bowSz * 0.5, layout.top - bowSz * 0.78, bowSz, bowSz);
    ctx.globalAlpha = 1;
  }

  for (let i = 0; i < layout.slots.length; i++) {
    const slot = layout.slots[i];
    const item = vis.items[i];
    if (!item) continue;
    const cx = slot.x + s * 0.5;
    const cy = slot.y + s * 0.5;
    const sway = Math.sin(now * 0.0017 + i * 1.3) * 0.022;

    ctx.save();
    ctx.translate(cx, cy);

    const wash = ctx.createRadialGradient(0, 0, s * 0.12, 0, 0, s * 0.72);
    wash.addColorStop(0, item.washColor || 'rgba(214, 228, 244, 0.5)');
    wash.addColorStop(1, 'rgba(255, 250, 240, 0)');
    ctx.fillStyle = wash;
    ctx.fillRect(-s * 0.75, -s * 0.75, s * 1.5, s * 1.5);

    ctx.rotate(sway);
    const base = getTintedPaintingSource(images.watercolorRainyWindow, item.paletteId, item.filter);
    if (base) ctx.drawImage(base, -s * 0.5, -s * 0.5, s, s);
    if (item.subjectSpriteKey && item.subjectBox) {
      const subj = getTintedPaintingSource(images[item.subjectSpriteKey], item.paletteId, item.filter);
      if (subj) {
        const box = item.subjectBox;
        ctx.drawImage(subj, (box.left - 0.5) * s, (box.top - 0.5) * s, box.size * s, box.size * s);
      }
    }
    if (item.isLatest && isReady(images.vfxSparkle)) {
      ctx.globalAlpha = 0.4 + 0.42 * Math.sin(now * 0.0042 + i);
      ctx.drawImage(images.vfxSparkle, s * 0.22, -s * 0.56, 12, 12);
    }
    ctx.restore();
  }

  if (!p.hideTerrariumLabels) {
    ctx.globalAlpha = 0.92;
    ctx.font = '900 9.5px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(104, 70, 44, 0.86)';
    ctx.lineWidth = 2.6;
    const tagTxt = `水彩画廊 ${vis.gallerySize}/${vis.total}`;
    ctx.strokeText(tagTxt, layout.centerX, layout.bottom + 13);
    ctx.fillStyle = '#fff9ec';
    ctx.fillText(tagTxt, layout.centerX, layout.bottom + 13);
  }

  ctx.restore();
}

// AR-10 写生陪伴：调色/晕染期间她身旁立起水彩画架贴图
export function drawWatercolorEaselProp(ctx, p, now) {
  if (!p || !p.isPainting || p.onPalm || p.isFocusStudying || !isReady(images.uiBtnWatercolorEasel)) return;
  const side = p.facing || 1;
  const propX = p.x - side * 68;
  const propY = p.y + 26;
  const sz = 62;
  const sway = Math.sin(now * 0.0026 + 0.8) * 0.02;

  ctx.save();
  ctx.translate(propX, propY);

  const washGlow = ctx.createRadialGradient(0, -30, 4, 0, -30, 52);
  washGlow.addColorStop(0, p.paintingWashColor || 'rgba(214, 228, 244, 0.5)');
  washGlow.addColorStop(1, 'rgba(255, 250, 240, 0)');
  ctx.fillStyle = washGlow;
  ctx.fillRect(-54, -78, 108, 90);

  ctx.save();
  ctx.rotate(sway);
  ctx.drawImage(images.uiBtnWatercolorEasel, -sz * 0.5, -sz * 0.94, sz, sz);
  ctx.restore();

  if (isReady(images.watercolorPalette)) {
    ctx.save();
    ctx.translate(side > 0 ? 22 : -22, -6 + Math.sin(now * 0.004) * 1.2);
    ctx.rotate(side > 0 ? 0.12 : -0.12);
    ctx.drawImage(images.watercolorPalette, -12, -12, 24, 24);
    ctx.restore();
  }
  if (isReady(images.vfxSparkle)) {
    ctx.globalAlpha = 0.4 + 0.38 * Math.sin(now * 0.0044);
    ctx.drawImage(images.vfxSparkle, side > 0 ? -24 : 12, -64 - ((now * 0.011) % 12), 12, 12);
  }

  ctx.restore();
}

// AR-10 小邮差信箱：有未读信笺时，桌面右侧立起信箱并浮起一封信封
export function getMailboxDeskAnchor(W, H) {
  return { x: Math.min(W - 44, W * 0.94), y: H * 0.68 + 6 };
}

export function drawMailboxDeskProp(ctx, p, W, H, now) {
  const vis = p && p.mailboxVisual;
  if (!vis || !(vis.unread > 0) || !isReady(images.uiBtnMailbox)) return;
  const anchor = getMailboxDeskAnchor(W, H);
  const sz = 50;
  const bob = Math.sin(now * 0.0036) * 3;

  ctx.save();
  ctx.translate(anchor.x, anchor.y);

  const glow = ctx.createRadialGradient(0, -30, 4, 0, -30, 48);
  glow.addColorStop(0, 'rgba(255, 236, 214, 0.55)');
  glow.addColorStop(1, 'rgba(255, 236, 214, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-50, -82, 100, 94);

  ctx.drawImage(images.uiBtnMailbox, -sz * 0.5, -sz * 0.96, sz, sz);
  if (isReady(images.letterEnvelope)) {
    ctx.save();
    ctx.translate(0, -sz * 1.08 + bob);
    ctx.rotate(Math.sin(now * 0.0028) * 0.1);
    ctx.drawImage(images.letterEnvelope, -13, -13, 26, 26);
    ctx.restore();
  }

  if (!p.hideTerrariumLabels) {
    ctx.globalAlpha = 0.92;
    ctx.font = '900 9.5px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(122, 72, 72, 0.84)';
    ctx.lineWidth = 2.6;
    const tagTxt = `新信笺 ×${vis.unread}`;
    ctx.strokeText(tagTxt, 0, 10);
    ctx.fillStyle = '#fff9ef';
    ctx.fillText(tagTxt, 0, 10);
  }

  ctx.restore();
}

// AR-11 回忆墙：左侧墙面挂起手账软木相框，钉上最近拼好的 3 段回忆缩略图（与 game.js 点击判定共用同一套几何）
export function getMemoryWallLayout(W, H) {
  const s = Math.max(54, Math.min(132, H * 0.15));
  const x = Math.max(14, W * 0.016);
  const deskTop = H * 0.68;
  const y = Math.min(Math.max(H * 0.3, 210), deskTop - s - 16);
  return { x, y, s, centerX: x + s * 0.5, bottom: y + s };
}

const MEMORY_WALL_PIN_SPOTS = [
  { cx: 0.3, cy: 0.55, rot: -0.08 },
  { cx: 0.5, cy: 0.47, rot: 0.03 },
  { cx: 0.7, cy: 0.53, rot: 0.09 }
];

export function drawMemoryWallBoard(ctx, p, W, H, now) {
  const vis = p && p.memoryWallVisual;
  if (!vis || !(vis.count > 0) || !isReady(images.memoryWallFrame)) return;
  const L = getMemoryWallLayout(W, H);
  const s = L.s;
  const sway = Math.sin(now * 0.0015) * 0.012;

  ctx.save();
  ctx.translate(L.x + s * 0.5, L.y + s * 0.5);

  const glow = ctx.createRadialGradient(0, 0, s * 0.18, 0, 0, s * 0.78);
  glow.addColorStop(0, 'rgba(255, 238, 214, 0.42)');
  glow.addColorStop(1, 'rgba(255, 238, 214, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-s * 0.8, -s * 0.8, s * 1.6, s * 1.6);

  ctx.rotate(sway);
  ctx.drawImage(images.memoryWallFrame, -s * 0.5, -s * 0.5, s, s);

  const items = Array.isArray(vis.items) ? vis.items.slice(-3) : [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const spot = MEMORY_WALL_PIN_SPOTS[i];
    if (!it || !spot || !isReady(it.img)) continue;
    const ts = s * 0.25;
    ctx.save();
    ctx.translate((spot.cx - 0.5) * s, (spot.cy - 0.5) * s);
    ctx.rotate(spot.rot + Math.sin(now * 0.0019 + i * 1.7) * 0.015);
    ctx.drawImage(it.img, -ts * 0.5, -ts * 0.5, ts, ts);
    if (it.isLatest && isReady(images.vfxSparkle)) {
      ctx.globalAlpha = 0.4 + 0.4 * Math.sin(now * 0.0042 + i);
      ctx.drawImage(images.vfxSparkle, ts * 0.22, -ts * 0.78, 11, 11);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  ctx.restore();

  if (!p.hideTerrariumLabels) {
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.font = '900 9.5px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(112, 74, 50, 0.86)';
    ctx.lineWidth = 2.6;
    const tagTxt = `回忆墙 ${vis.count}/${vis.total || 6}`;
    ctx.strokeText(tagTxt, L.centerX, L.bottom + 12);
    ctx.fillStyle = '#fff9ec';
    ctx.fillText(tagTxt, L.centerX, L.bottom + 12);
    ctx.restore();
  }
}

// AR-11 便当袋：打包好的便当摆在书桌中间偏右，下个打工班次带上
export function getBentoDeskAnchor(W, H) {
  return { x: W * 0.55, y: H * 0.68 + 6 };
}

export function drawBentoLunchDesk(ctx, p, W, H, now) {
  const vis = p && p.bentoDeskVisual;
  if (!vis || !(vis.bagCount > 0) || !isReady(images.bentoBoxFinished)) return;
  const anchor = getBentoDeskAnchor(W, H);
  const sz = 42;
  const bob = Math.sin(now * 0.0029) * 1.2;

  ctx.save();
  ctx.translate(anchor.x, anchor.y);

  const glow = ctx.createRadialGradient(0, -20, 3, 0, -20, 40);
  glow.addColorStop(0, 'rgba(255, 228, 186, 0.5)');
  glow.addColorStop(1, 'rgba(255, 228, 186, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-42, -62, 84, 72);

  for (let i = Math.min(3, vis.bagCount) - 1; i >= 0; i--) {
    ctx.save();
    ctx.translate((i - (Math.min(3, vis.bagCount) - 1) * 0.5) * 9, -i * 7 + bob);
    ctx.rotate((i - 1) * 0.05);
    ctx.drawImage(images.bentoBoxFinished, -sz * 0.5, -sz * 0.92, sz, sz);
    ctx.restore();
  }

  if (!p.hideTerrariumLabels) {
    ctx.globalAlpha = 0.92;
    ctx.font = '900 9.5px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(120, 78, 44, 0.86)';
    ctx.lineWidth = 2.6;
    const tagTxt = `便当袋 ×${vis.bagCount}`;
    ctx.strokeText(tagTxt, 0, 10);
    ctx.fillStyle = '#fff9ec';
    ctx.fillText(tagTxt, 0, 10);
  }

  ctx.restore();
}

// AR-11 暖灯厨房：她摆便当时身旁亮起小厨房贴图，饭团三兄弟在一旁轻轻蹦跳
export function drawBentoKitchenProp(ctx, p, now) {
  // 与水彩画架共用她身旁的位置：画架还立着时先不摆小厨房，避免两件道具叠在一起
  if (!p || !p.isCookingBento || p.isPainting || p.onPalm || p.isFocusStudying || !isReady(images.uiBtnBentoKitchen)) return;
  const side = p.facing || 1;
  const propX = p.x - side * 68;
  const propY = p.y + 26;
  const sz = 62;
  const sway = Math.sin(now * 0.0024 + 0.4) * 0.018;

  ctx.save();
  ctx.translate(propX, propY);

  const lampGlow = ctx.createRadialGradient(0, -34, 4, 0, -34, 56);
  lampGlow.addColorStop(0, 'rgba(255, 226, 170, 0.58)');
  lampGlow.addColorStop(1, 'rgba(255, 240, 214, 0)');
  ctx.fillStyle = lampGlow;
  ctx.fillRect(-58, -86, 116, 98);

  ctx.save();
  ctx.rotate(sway);
  ctx.drawImage(images.uiBtnBentoKitchen, -sz * 0.5, -sz * 0.94, sz, sz);
  ctx.restore();

  if (isReady(images.onigiriTrio)) {
    const hop = Math.abs(Math.sin(now * 0.005)) * 4;
    ctx.save();
    ctx.translate(side > 0 ? 24 : -24, -8 - hop);
    ctx.drawImage(images.onigiriTrio, -13, -13, 26, 26);
    ctx.restore();
  }
  if (isReady(images.vfxSparkle)) {
    ctx.globalAlpha = 0.4 + 0.38 * Math.sin(now * 0.0046);
    ctx.drawImage(images.vfxSparkle, side > 0 ? -26 : 14, -66 - ((now * 0.01) % 12), 12, 12);
  }

  ctx.restore();
}

// AR-12 窗台小猫：与 vision.js 窗景同一套几何（窗台内沿约在窗图 90% 高度），小猫坐在窗台左半边，
// 喂过猫粮时身旁摆上猫粮碗，寄出的最新一张手作贺卡立在窗台右侧（game.js 点击判定共用同一套几何）
export function getWindowSillLayout(W, H, camX = 0) {
  const winW = Math.max(136, Math.min(228, W * 0.19));
  const winH = winW * 0.75;
  const winCx = W * 0.675 + (Number(camX) || 0) * 0.22;
  const winCy = Math.max(winH * 0.56 + 52, H * 0.295);
  const winLeft = winCx - winW * 0.5;
  const winTop = winCy - winH * 0.5;
  const sillY = winTop + winH * 0.9;
  const kittenSize = Math.max(40, Math.min(70, winW * 0.28));
  const kittenX = winLeft + winW * 0.4;
  const bowlSize = Math.max(18, kittenSize * 0.42);
  const bowlX = winLeft + winW * 0.57;
  const cardSize = Math.max(22, Math.min(38, winW * 0.15));
  const cardX = winLeft + winW * 0.69;
  return {
    winLeft,
    winTop,
    winW,
    winH,
    sillY,
    kittenX,
    kittenSize,
    bowlX,
    bowlSize,
    cardX,
    cardSize,
    kittenHit: { x: kittenX, y: sillY - kittenSize * 0.45, r: kittenSize * 0.62 },
    cardHit: { x: cardX, y: sillY - cardSize * 0.5, r: Math.max(16, cardSize * 0.7) }
  };
}

export function drawWindowsillVisitors(ctx, p, W, H, now) {
  if (!p) return;
  const kv = p.kittenVisual;
  const cv = p.sillCardVisual;
  const L = getWindowSillLayout(W, H, p.sillCamX || 0);

  // 寄出的最新贺卡：斜靠在窗台右侧
  if (cv && cv.count > 0 && isReady(images.handmadeCard)) {
    const cs = L.cardSize;
    const lean = 0.12 + Math.sin(now * 0.0017) * 0.015;
    ctx.save();
    ctx.translate(L.cardX, L.sillY);
    ctx.rotate(lean);
    ctx.drawImage(images.handmadeCard, -cs * 0.5, -cs * 0.96, cs, cs);
    ctx.restore();
  }

  if (!kv || !kv.active) return;
  const kImg = images[kv.spriteKey];
  if (!isReady(kImg)) return;
  const ks = L.kittenSize;
  const arrive = Math.max(0, Math.min(1, Number(kv.arriveAge) || 0) / 0.8);
  const ease = 1 - Math.pow(1 - Math.min(1, arrive), 3);
  const breath = 1 + Math.sin(now * 0.0031) * 0.018;
  const pet = Math.max(0, Math.min(1, Number(kv.petPulse) || 0));
  const hop = pet > 0 ? Math.sin(pet * Math.PI) * ks * 0.08 : 0;
  const eatNod = kv.eating ? Math.abs(Math.sin(now * 0.008)) * ks * 0.035 : 0;

  // 窗台上一圈暖奶油柔光，衬托小访客
  const glow = ctx.createRadialGradient(L.kittenX, L.sillY - ks * 0.4, ks * 0.1, L.kittenX, L.sillY - ks * 0.4, ks * 0.9);
  glow.addColorStop(0, `rgba(255, 240, 214, ${(0.42 * ease).toFixed(3)})`);
  glow.addColorStop(1, 'rgba(255, 240, 214, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(L.kittenX - ks, L.sillY - ks * 1.3, ks * 2, ks * 1.5);

  if (kv.fed && isReady(images.catFoodBowl)) {
    const bs = L.bowlSize;
    ctx.save();
    ctx.globalAlpha = ease;
    ctx.drawImage(images.catFoodBowl, L.bowlX - bs * 0.5, L.sillY - bs * 0.92, bs, bs);
    ctx.restore();
  }

  ctx.save();
  ctx.globalAlpha = ease;
  ctx.translate(L.kittenX + (1 - ease) * ks * 0.6, L.sillY + ks * 0.04 - hop + eatNod);
  ctx.scale(kv.facing < 0 ? -1 : 1, 1);
  ctx.scale(1 / breath, breath);
  ctx.drawImage(kImg, -ks * 0.5, -ks, ks, ks);
  ctx.restore();

  if (pet > 0 && isReady(images.vfxHeart)) {
    for (let i = 0; i < 3; i++) {
      const t = Math.max(0, Math.min(1, 1 - pet + i * 0.12));
      ctx.save();
      ctx.globalAlpha = Math.max(0, pet * (1 - i * 0.22));
      const hs = 12 + i * 2;
      ctx.drawImage(
        images.vfxHeart,
        L.kittenX - ks * 0.3 + i * ks * 0.3 - hs * 0.5,
        L.sillY - ks * 1.05 - t * ks * 0.5 - hs * 0.5,
        hs,
        hs
      );
      ctx.restore();
    }
  }

  if (!p.hideTerrariumLabels && kv.label) {
    ctx.save();
    ctx.globalAlpha = 0.92 * ease;
    ctx.font = '900 9.5px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(120, 82, 54, 0.86)';
    ctx.lineWidth = 2.6;
    ctx.strokeText(kv.label, L.kittenX, L.sillY + 13);
    ctx.fillStyle = '#fff9ec';
    ctx.fillText(kv.label, L.kittenX, L.sillY + 13);
    ctx.restore();
  }
}

// AR-12 手作贺卡：她剪贴贺卡时身旁摊开一张手作卡纸，最近选的贴纸在一旁轻轻跳动
export function drawGreetingCardCraftProp(ctx, p, now) {
  if (
    !p ||
    !p.isCraftingCard ||
    p.isPainting ||
    p.isCookingBento ||
    p.onPalm ||
    p.isFocusStudying ||
    !isReady(images.handmadeCard)
  ) {
    return;
  }
  const side = p.facing || 1;
  const propX = p.x - side * 66;
  const propY = p.y + 26;
  const sz = 54;
  const sway = Math.sin(now * 0.0022 + 0.7) * 0.03;

  ctx.save();
  ctx.translate(propX, propY);

  const lampGlow = ctx.createRadialGradient(0, -28, 4, 0, -28, 52);
  lampGlow.addColorStop(0, 'rgba(255, 232, 214, 0.55)');
  lampGlow.addColorStop(1, 'rgba(255, 244, 228, 0)');
  ctx.fillStyle = lampGlow;
  ctx.fillRect(-54, -80, 108, 92);

  ctx.save();
  ctx.rotate(-0.08 + sway);
  ctx.drawImage(images.handmadeCard, -sz * 0.5, -sz * 0.92, sz, sz);
  ctx.restore();

  const stickerImg = p.craftStickerKey ? images[p.craftStickerKey] : null;
  if (isReady(stickerImg)) {
    const hop = Math.abs(Math.sin(now * 0.0052)) * 4;
    ctx.save();
    ctx.translate(side > 0 ? 24 : -24, -12 - hop);
    ctx.rotate(Math.sin(now * 0.004) * 0.12);
    ctx.drawImage(stickerImg, -11, -11, 22, 22);
    ctx.restore();
  }
  if (isReady(images.vfxSparkle)) {
    ctx.globalAlpha = 0.4 + 0.38 * Math.sin(now * 0.0046 + 1.2);
    ctx.drawImage(images.vfxSparkle, side > 0 ? -28 : 16, -62 - ((now * 0.01) % 12), 12, 12);
  }

  ctx.restore();
}

// AR-13 周末野餐篮：装好的野餐篮放在书桌最左侧（回忆墙下方、小夜灯左边），周末会轻轻跳动邀你出发；
// 点它打开野餐卡（game.js 点击判定共用同一套几何）。只贴已提供的位图 + 柔光渐变 + 文字标签
export function getPicnicBasketDeskAnchor(W, H) {
  const x = Math.max(64, W * 0.115);
  const y = H * 0.68 + 6;
  const size = Math.max(34, Math.min(46, H * 0.06));
  return { x, y, size, hit: { x, y: y - size * 0.5, r: Math.max(24, size * 0.72) } };
}

export function drawPicnicBasketDesk(ctx, p, W, H, now) {
  const pv = p && p.picnicVisual;
  if (!pv || !pv.packed || pv.outing || !isReady(images.uiBtnPicnicBasket)) return;
  const A = getPicnicBasketDeskAnchor(W, H);
  const sz = A.size;
  const bob = pv.weekend ? Math.abs(Math.sin(now * 0.004)) * 2.6 : Math.sin(now * 0.0026) * 0.8;

  ctx.save();
  ctx.translate(A.x, A.y);
  const glow = ctx.createRadialGradient(0, -sz * 0.45, 3, 0, -sz * 0.45, sz);
  glow.addColorStop(0, `rgba(255, 232, 196, ${pv.weekend ? 0.6 : 0.42})`);
  glow.addColorStop(1, 'rgba(255, 232, 196, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-sz, -sz * 1.45, sz * 2, sz * 1.6);

  ctx.save();
  ctx.translate(0, -bob);
  ctx.rotate(Math.sin(now * 0.002) * 0.03);
  ctx.drawImage(images.uiBtnPicnicBasket, -sz * 0.5, -sz * 0.94, sz, sz);
  ctx.restore();

  if (pv.weekend && isReady(images.vfxSparkle)) {
    ctx.globalAlpha = 0.45 + 0.4 * Math.sin(now * 0.005);
    ctx.drawImage(images.vfxSparkle, sz * 0.28, -sz * 1.12 - ((now * 0.012) % 10), 11, 11);
    ctx.globalAlpha = 1;
  }

  if (!p.hideTerrariumLabels) {
    ctx.globalAlpha = 0.92;
    ctx.font = '900 9.5px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(120, 82, 50, 0.86)';
    ctx.lineWidth = 2.6;
    const tagTxt = pv.weekend ? '野餐篮 · 出发!' : '野餐篮 · 周末见';
    ctx.strokeText(tagTxt, 0, 10);
    ctx.fillStyle = '#fff9ec';
    ctx.fillText(tagTxt, 0, 10);
  }
  ctx.restore();
}

// AR-13 野餐垫：野餐进行中在她身旁铺开野餐垫（优先铺在左手边，避开右侧浮层卡片；太靠左边缘时才铺到右边），
// 挑好的点心摆在垫子前排（点一下即分享）；野餐刚结束时垫子还会留一会儿。点心离她身体足够远，不会和摸头判定抢点击
export function getPicnicBlanketLayout(p, W = 0) {
  const x = p ? p.x : 0;
  const floorY = p ? p.y + 26 : 0;
  const stageW = Number(W) > 0 ? Number(W) : x * 2;
  const size = 104;
  const side = x - 74 - size * 0.5 < stageW * 0.04 ? 1 : -1;
  const cx = x + side * 74;
  return {
    cx,
    cy: floorY - 4,
    size,
    side,
    foods: [-36, 0, 36].map((dx, i) => ({ x: cx + dx, y: floorY + (i === 1 ? 26 : 20), r: 18 }))
  };
}

export function drawPicnicOutingProp(ctx, p, now, W = 0) {
  const pv = p && p.picnicVisual;
  if (!pv || p.onPalm) return;
  const L = getPicnicBlanketLayout(p, W);
  const showBlanket = pv.outing || p.picnicCheerTimer > 0;
  if (showBlanket && isReady(images.picnicBlanket)) {
    const fade = pv.outing ? 1 : Math.max(0, Math.min(1, p.picnicCheerTimer / 1.2));
    const s = L.size;
    ctx.save();
    ctx.globalAlpha = fade;
    const glow = ctx.createRadialGradient(L.cx, L.cy, 6, L.cx, L.cy, s * 0.66);
    glow.addColorStop(0, 'rgba(255, 244, 222, 0.52)');
    glow.addColorStop(1, 'rgba(255, 244, 222, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(L.cx - s * 0.66, L.cy - s * 0.6, s * 1.32, s * 1.12);
    ctx.drawImage(images.picnicBlanket, L.cx - s * 0.5, L.cy - s * 0.5, s, s);
    if (pv.outing) {
      for (let i = 0; i < L.foods.length && i < pv.foods.length; i++) {
        const img = images[pv.foods[i]];
        if (!isReady(img)) continue;
        const f = L.foods[i];
        const shared = Boolean(pv.shared[i]);
        const hop = shared ? 0 : Math.abs(Math.sin(now * 0.004 + i * 1.3)) * 3;
        const sz = shared ? 20 : 30;
        ctx.save();
        ctx.globalAlpha = fade * (shared ? 0.42 : 1);
        ctx.translate(f.x, f.y - hop);
        ctx.rotate(Math.sin(now * 0.002 + i) * 0.06);
        ctx.drawImage(img, -sz * 0.5, -sz * 0.6, sz, sz);
        ctx.restore();
        if (shared && isReady(images.vfxHeart)) {
          ctx.save();
          ctx.globalAlpha = fade * 0.75;
          ctx.drawImage(images.vfxHeart, f.x + 5, f.y - 20, 11, 11);
          ctx.restore();
        }
      }
    }
    ctx.restore();
  }

  // 装篮子时：野餐篮摆在她身旁，最近挑的点心在篮边轻轻蹦跳
  if (
    pv.packing &&
    !pv.outing &&
    !p.isPainting &&
    !p.isCookingBento &&
    !p.isCraftingCard &&
    !p.isFocusStudying &&
    isReady(images.uiBtnPicnicBasket)
  ) {
    const side = p.facing || 1;
    const propX = p.x - side * 66;
    const propY = p.y + 26;
    const sz = 54;
    ctx.save();
    ctx.translate(propX, propY);
    const lampGlow = ctx.createRadialGradient(0, -28, 4, 0, -28, 52);
    lampGlow.addColorStop(0, 'rgba(255, 236, 206, 0.55)');
    lampGlow.addColorStop(1, 'rgba(255, 244, 228, 0)');
    ctx.fillStyle = lampGlow;
    ctx.fillRect(-54, -80, 108, 92);
    ctx.save();
    ctx.rotate(Math.sin(now * 0.0022 + 0.3) * 0.03);
    ctx.drawImage(images.uiBtnPicnicBasket, -sz * 0.5, -sz * 0.92, sz, sz);
    ctx.restore();
    const foodImg = pv.packKey ? images[pv.packKey] : null;
    if (isReady(foodImg)) {
      const hop = Math.abs(Math.sin(now * 0.0052)) * 4;
      ctx.save();
      ctx.translate(side > 0 ? 24 : -24, -14 - hop);
      ctx.drawImage(foodImg, -11, -11, 22, 22);
      ctx.restore();
    }
    ctx.restore();
  }
}

// AR-13 手写日记：翻日记时她身旁摊开一页手账，最近贴的贴纸在一旁轻轻跳动
export function drawDiaryWritingProp(ctx, p, now) {
  if (
    !p ||
    !p.isWritingDiary ||
    p.isPainting ||
    p.isCookingBento ||
    p.isCraftingCard ||
    p.onPalm ||
    p.isFocusStudying ||
    (p.picnicVisual && (p.picnicVisual.outing || p.picnicVisual.packing)) ||
    !isReady(images.diaryPage)
  ) {
    return;
  }
  const side = p.facing || 1;
  const propX = p.x - side * 64;
  const propY = p.y + 26;
  const sz = 54;
  ctx.save();
  ctx.translate(propX, propY);
  const glow = ctx.createRadialGradient(0, -28, 4, 0, -28, 52);
  glow.addColorStop(0, 'rgba(255, 238, 214, 0.55)');
  glow.addColorStop(1, 'rgba(255, 246, 232, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-54, -80, 108, 92);
  ctx.save();
  ctx.rotate(-0.06 + Math.sin(now * 0.0021) * 0.02);
  ctx.drawImage(images.diaryPage, -sz * 0.5, -sz * 0.92, sz, sz);
  ctx.restore();
  const stickerImg = p.diaryStickerKey ? images[p.diaryStickerKey] : images.diarySticker;
  if (isReady(stickerImg)) {
    const hop = Math.abs(Math.sin(now * 0.005)) * 4;
    ctx.save();
    ctx.translate(side > 0 ? 24 : -24, -12 - hop);
    ctx.rotate(Math.sin(now * 0.004) * 0.12);
    ctx.drawImage(stickerImg, -11, -11, 22, 22);
    ctx.restore();
  }
  if (isReady(images.vfxSparkle)) {
    ctx.globalAlpha = 0.4 + 0.38 * Math.sin(now * 0.0046 + 0.6);
    ctx.drawImage(images.vfxSparkle, side > 0 ? -28 : 16, -62 - ((now * 0.01) % 12), 12, 12);
  }
  ctx.restore();
}

// AR-14 窗畔陶艺架：挂在窗户左侧墙面、与窗台内沿同一高度（与 vision.js 窗景 / AR-12 窗台同一套几何，跟随窗户），
// 架子右端立着陶艺转盘（空架时也在，点它就打开陶艺卡），左边依次摆出最近出窑的小陶器（最多 4 件，最新的挨着转盘）；
// 只贴已提供的位图 + 釉色柔光渐变 + 文字标签，不画任何矢量图形（game.js 点击判定共用同一套几何）
export function getPotteryShelfLayout(W, H, camX = 0, count = 0) {
  const sill = getWindowSillLayout(W, H, camX);
  const piece = Math.max(26, Math.min(44, H * 0.05));
  const wheel = Math.round(piece * 1.12);
  const gap = Math.max(3, Math.round(piece * 0.12));
  const n = Math.max(0, Math.min(4, Math.round(Number(count) || 0)));
  const right = sill.winLeft + sill.winW * 0.2;
  const baseY = sill.sillY;
  const wheelX = right - wheel * 0.5;
  const slots = [];
  for (let i = 0; i < n; i++) {
    slots.push({ x: wheelX - wheel * 0.5 - gap - piece * 0.5 - i * (piece + gap), y: baseY, size: piece });
  }
  const left = (n ? slots[n - 1].x - piece * 0.5 : wheelX - wheel * 0.5) - 6;
  const top = baseY - Math.max(piece, wheel) - 8;
  return {
    piece,
    wheel,
    gap,
    baseY,
    wheelX,
    slots,
    left,
    right: right + 6,
    hit: { x: left, y: top, w: right + 6 - left, h: baseY + 16 - top }
  };
}

export function drawPotteryShelf(ctx, p, W, H, now) {
  const pv = p && p.potteryVisual;
  if (!pv || !isReady(images.uiBtnPotteryWheel)) return;
  const pieces = Array.isArray(pv.pieces) ? pv.pieces.slice(-4) : [];
  const L = getPotteryShelfLayout(W, H, p.sillCamX || 0, pieces.length);

  ctx.save();
  // 架面：陶器脚下一道奶油木色暖光（纯渐变柔光，不描任何线条），上方再铺一层淡淡的窗光
  const halo = ctx.createLinearGradient(0, L.baseY - L.wheel * 1.2, 0, L.baseY);
  halo.addColorStop(0, 'rgba(255, 248, 236, 0)');
  halo.addColorStop(1, 'rgba(255, 244, 226, 0.42)');
  ctx.fillStyle = halo;
  ctx.fillRect(L.left, L.baseY - L.wheel * 1.2, L.right - L.left, L.wheel * 1.2);
  const band = ctx.createLinearGradient(0, L.baseY - 4, 0, L.baseY + 7);
  band.addColorStop(0, 'rgba(250, 236, 214, 0)');
  band.addColorStop(0.3, 'rgba(244, 222, 192, 0.88)');
  band.addColorStop(0.7, 'rgba(230, 202, 166, 0.78)');
  band.addColorStop(1, 'rgba(230, 202, 166, 0)');
  ctx.fillStyle = band;
  ctx.fillRect(L.left + 2, L.baseY - 4, L.right - L.left - 4, 11);

  // 已出窑的小陶器：每件身后一圈釉色柔光，刚出窑的那件轻轻蹦一下
  for (let i = 0; i < pieces.length; i++) {
    const pc = pieces[pieces.length - 1 - i];
    const slot = L.slots[i];
    const img = images[pc.spriteKey];
    if (!slot || !isReady(img)) continue;
    const s = slot.size;
    const fresh = i === 0 && pv.cheer > 0;
    const hop = fresh ? Math.abs(Math.sin(now * 0.008)) * 4 : Math.sin(now * 0.0021 + i * 1.4) * 0.6;
    const glow = ctx.createRadialGradient(slot.x, L.baseY - s * 0.45, 2, slot.x, L.baseY - s * 0.45, s * 0.78);
    glow.addColorStop(0, `rgba(${pc.rgb || '255, 240, 220'}, ${fresh ? 0.85 : 0.6})`);
    glow.addColorStop(1, `rgba(${pc.rgb || '255, 240, 220'}, 0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(slot.x - s * 0.8, L.baseY - s * 1.25, s * 1.6, s * 1.35);
    ctx.drawImage(img, slot.x - s * 0.5, L.baseY - s * 0.96 - hop, s, s);
    if (fresh && isReady(images.vfxSparkle)) {
      ctx.globalAlpha = 0.5 + 0.4 * Math.sin(now * 0.006);
      ctx.drawImage(images.vfxSparkle, slot.x + s * 0.18, L.baseY - s * 1.12 - ((now * 0.012) % 8), 11, 11);
      ctx.globalAlpha = 1;
    }
  }

  // 陶艺转盘：拉坯 / 烧制时轻轻晃动，暖光更亮
  const busy = pv.shaping || pv.firing;
  const wGlow = ctx.createRadialGradient(L.wheelX, L.baseY - L.wheel * 0.45, 3, L.wheelX, L.baseY - L.wheel * 0.45, L.wheel * 0.85);
  wGlow.addColorStop(0, `rgba(255, 232, 200, ${busy ? 0.62 : 0.4})`);
  wGlow.addColorStop(1, 'rgba(255, 232, 200, 0)');
  ctx.fillStyle = wGlow;
  ctx.fillRect(L.wheelX - L.wheel * 0.9, L.baseY - L.wheel * 1.35, L.wheel * 1.8, L.wheel * 1.45);
  ctx.save();
  ctx.translate(L.wheelX, L.baseY);
  ctx.rotate(Math.sin(now * (busy ? 0.012 : 0.0018)) * (busy ? 0.05 : 0.015));
  ctx.drawImage(images.uiBtnPotteryWheel, -L.wheel * 0.5, -L.wheel * 0.96, L.wheel, L.wheel);
  ctx.restore();

  if (!p.hideTerrariumLabels) {
    ctx.globalAlpha = 0.92;
    ctx.font = '900 9.5px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(120, 84, 56, 0.86)';
    ctx.lineWidth = 2.6;
    const tagTxt = pieces.length ? `窗畔陶艺架 · ${pv.totalShown || pieces.length}件` : '陶艺转盘 · 去拉坯';
    const tagX = (L.left + L.right) * 0.5;
    ctx.strokeText(tagTxt, tagX, L.baseY + 12);
    ctx.fillStyle = '#fff9ec';
    ctx.fillText(tagTxt, tagX, L.baseY + 12);
  }
  ctx.restore();
}

// AR-14 陶艺转盘：打开陶艺卡时她身旁摆上转盘，正在拉的陶坯随拉坯进度长高；入窑时一圈暖暖的窑火柔光
export function drawPotteryWheelProp(ctx, p, now) {
  const pv = p && p.potteryVisual;
  if (
    !pv ||
    !(pv.shaping || pv.cheer > 0) ||
    p.onPalm ||
    p.isPainting ||
    p.isCookingBento ||
    p.isCraftingCard ||
    p.isFocusStudying ||
    p.isWritingDiary ||
    (p.picnicVisual && (p.picnicVisual.outing || p.picnicVisual.packing)) ||
    !isReady(images.uiBtnPotteryWheel)
  ) {
    return;
  }
  const side = p.facing || 1;
  const propX = p.x - side * 66;
  const propY = p.y + 26;
  const sz = 56;
  ctx.save();
  ctx.translate(propX, propY);
  const glowRgb = pv.firing ? '255, 218, 176' : pv.glazeRgb || '255, 236, 210';
  const glow = ctx.createRadialGradient(0, -28, 4, 0, -28, 56);
  glow.addColorStop(0, `rgba(${glowRgb}, ${pv.firing ? 0.72 : 0.55})`);
  glow.addColorStop(1, `rgba(${glowRgb}, 0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(-58, -84, 116, 96);
  ctx.save();
  ctx.rotate(Math.sin(now * (pv.firing ? 0.012 : 0.006)) * 0.04);
  ctx.drawImage(images.uiBtnPotteryWheel, -sz * 0.5, -sz * 0.92, sz, sz);
  ctx.restore();
  const clayImg = pv.shapeKey ? images[pv.shapeKey] : null;
  if (isReady(clayImg)) {
    const grow = 0.45 + 0.55 * Math.max(0, Math.min(1, Number(pv.progress) || 0));
    const cs = 28 * grow;
    const bob = Math.abs(Math.sin(now * 0.005)) * 2.5;
    ctx.save();
    ctx.translate(side > 0 ? 26 : -26, -10 - bob);
    ctx.drawImage(clayImg, -cs * 0.5, -cs * 0.92, cs, cs);
    ctx.restore();
  }
  if ((pv.firing || pv.cheer > 0) && isReady(images.vfxSparkle)) {
    ctx.globalAlpha = 0.45 + 0.4 * Math.sin(now * 0.005);
    ctx.drawImage(images.vfxSparkle, side > 0 ? -30 : 18, -64 - ((now * 0.012) % 12), 12, 12);
  }
  ctx.restore();
}

// AR-14 小小香氛调配台：迷你木桌常驻书桌最左端（点它打开香氛调配台）；点香时桌上多一只香薰机，
// 身后一圈心情色柔光，雾气用星点贴图缓缓上升（只贴已提供的位图 + 柔光渐变 + 文字标签）
export function getAromaTableDeskAnchor(W, H) {
  const size = Math.max(32, Math.min(48, H * 0.054));
  const x = Math.max(46, W * 0.058);
  const y = H * 0.68 + 6;
  // 矮舞台（844×390 / 旋转竖屏）桌面下方 ~10px 就是摇杆：点击圈收在桌面线以上，标签改写在小桌上方
  const labelAbove = H < 460;
  return { x, y, size, labelAbove, hit: { x, y: y - size * 0.5, r: Math.max(18, size * 0.62) } };
}

export function drawAromaTableDesk(ctx, p, W, H, now) {
  const av = p && p.aromaVisual;
  if (!av || !isReady(images.uiBtnAromaTable)) return;
  const A = getAromaTableDeskAnchor(W, H);
  const sz = A.size;
  ctx.save();
  ctx.translate(A.x, A.y);
  const glowRgb = av.active && av.moodRgb ? av.moodRgb : '255, 240, 222';
  const glow = ctx.createRadialGradient(0, -sz * 0.55, 3, 0, -sz * 0.55, sz * (av.active ? 1.35 : 0.85));
  glow.addColorStop(0, `rgba(${glowRgb}, ${av.active ? 0.72 : 0.36})`);
  glow.addColorStop(1, `rgba(${glowRgb}, 0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(-sz * 1.35, -sz * 1.9, sz * 2.7, sz * 2.15);
  ctx.drawImage(images.uiBtnAromaTable, -sz * 0.5, -sz * 0.94, sz, sz);
  // 点香中：香薰机立在小木桌桌面右侧（桌面约在贴图 37% 高度），星点雾气从藤条缓缓升起
  if (av.active && isReady(images.aromaDiffuser)) {
    const ds = sz * 0.56;
    const dx = sz * 0.2;
    const topY = -sz * 0.94 + sz * 0.36;
    const bob = Math.sin(now * 0.003) * 0.6;
    ctx.drawImage(images.aromaDiffuser, dx - ds * 0.5, topY - ds * 0.94 + bob, ds, ds);
    if (isReady(images.vfxSparkle)) {
      for (let i = 0; i < 3; i++) {
        const t = (now * 0.00035 + i / 3) % 1;
        ctx.globalAlpha = Math.max(0, 0.75 * (1 - t));
        const sx = dx + Math.sin(now * 0.002 + i * 2.1) * 6;
        ctx.drawImage(images.vfxSparkle, sx - 5, topY - ds - t * sz * 0.9 - 5, 10, 10);
      }
      ctx.globalAlpha = 1;
    }
  }
  if (!p.hideTerrariumLabels) {
    ctx.globalAlpha = 0.92;
    ctx.font = '900 9.5px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(120, 84, 56, 0.86)';
    ctx.lineWidth = 2.6;
    const tagTxt = av.active && av.label ? av.label : '香氛台';
    const tagY = A.labelAbove ? -sz * (av.active ? 1.62 : 1.02) : 10;
    ctx.strokeText(tagTxt, 0, tagY);
    ctx.fillStyle = '#fff9ec';
    ctx.fillText(tagTxt, 0, tagY);
  }
  ctx.restore();
}

// AR-14 调香：打开香氛调配台时她身旁摆上香氛瓶，已滴入的精油化作几颗星点在瓶口轻轻跳动
export function drawAromaBlendProp(ctx, p, now) {
  const av = p && p.aromaVisual;
  if (
    !av ||
    !(av.blending || av.cheer > 0) ||
    p.onPalm ||
    p.isPainting ||
    p.isCookingBento ||
    p.isCraftingCard ||
    p.isFocusStudying ||
    p.isWritingDiary ||
    (p.potteryVisual && p.potteryVisual.shaping) ||
    (p.picnicVisual && (p.picnicVisual.outing || p.picnicVisual.packing)) ||
    !isReady(images.aromaBottle)
  ) {
    return;
  }
  const side = p.facing || 1;
  const propX = p.x - side * 64;
  const propY = p.y + 26;
  const sz = 50;
  ctx.save();
  ctx.translate(propX, propY);
  const glowRgb = av.moodRgb || '255, 238, 216';
  const glow = ctx.createRadialGradient(0, -26, 4, 0, -26, 52);
  glow.addColorStop(0, `rgba(${glowRgb}, 0.62)`);
  glow.addColorStop(1, `rgba(${glowRgb}, 0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(-54, -80, 108, 92);
  ctx.save();
  ctx.rotate(-0.05 + Math.sin(now * 0.0024) * 0.04);
  ctx.drawImage(images.aromaBottle, -sz * 0.5, -sz * 0.92, sz, sz);
  ctx.restore();
  if (isReady(images.vfxSparkle)) {
    const drops = Math.max(0, Math.min(3, Number(av.drops) || 0));
    for (let i = 0; i < drops; i++) {
      const hop = Math.abs(Math.sin(now * 0.005 + i * 1.2)) * 4;
      ctx.globalAlpha = 0.85;
      ctx.drawImage(images.vfxSparkle, (side > 0 ? 18 : -30) + i * 7, -52 - i * 6 - hop, 11, 11);
    }
    if (av.cheer > 0) {
      ctx.globalAlpha = 0.45 + 0.4 * Math.sin(now * 0.006);
      ctx.drawImage(images.vfxSparkle, side > 0 ? -30 : 18, -64 - ((now * 0.012) % 12), 12, 12);
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

// AR-15 窗边飘台：书桌已满，卧室星空投影灯与窗边听雨角改放在陶艺架左侧同一条窗台线上（墙面 / 窗台，跟随窗户几何），
// 永远排在陶艺架摆满 4 件时的最左端再往左，离书桌、HUD、胶囊、船坞与摇杆都远；左边立着星空投影灯，右边是听雨坐垫，
// 坐垫正上方挂着窗边雨滴风铃。只贴已提供的位图 + 柔光渐变 + 文字标签，不画任何矢量图形（game.js 点击判定共用同一套几何）
export function getAr15CornerLayout(W, H, camX = 0) {
  const shelf = getPotteryShelfLayout(W, H, camX, 4);
  const size = Math.max(34, Math.min(50, H * 0.058));
  const gap = Math.max(6, Math.round(size * 0.22));
  const baseY = shelf.baseY;
  const cushionSize = Math.round(size * 1.08);
  const cushionX = shelf.left - gap - cushionSize * 0.5;
  const projSize = Math.round(size * 1.04);
  const projX = cushionX - cushionSize * 0.5 - gap - projSize * 0.5;
  // 雨滴风铃贴图是细长的一串（玻璃雨滴 + 风签），画大一点才看得清；风签下沿离坐垫顶留一点空
  const chimeSize = Math.round(size * 1.3);
  const chimeTop = baseY - cushionSize * 0.76 - 4 - chimeSize * 0.92;
  return {
    size,
    gap,
    baseY,
    projector: { x: projX, size: projSize, hit: { x: projX, y: baseY - projSize * 0.5, r: Math.max(18, projSize * 0.6) } },
    cushion: { x: cushionX, size: cushionSize },
    chime: { x: cushionX, top: chimeTop, size: chimeSize },
    rainHit: { x: cushionX - cushionSize * 0.55, y: chimeTop, w: cushionSize * 1.1, h: baseY + 6 - chimeTop },
    left: projX - projSize * 0.5 - 6,
    right: cushionX + cushionSize * 0.5 + 6,
    labelX: (projX + cushionX) * 0.5
  };
}

export function drawAr15WindowCorner(ctx, p, W, H, now) {
  const sv = p && p.starVisual;
  const rv = p && p.rainVisual;
  if (!sv || !rv || !isReady(images.starProjector) || !isReady(images.rainCushion)) return;
  const L = getAr15CornerLayout(W, H, p.sillCamX || 0);
  const baseY = L.baseY;

  ctx.save();
  // 飘台：两件物件脚下一道奶油木色暖光（纯渐变柔光，不描任何线条），上方铺一层淡淡的窗光
  const halo = ctx.createLinearGradient(0, baseY - L.size * 1.3, 0, baseY);
  halo.addColorStop(0, 'rgba(255, 248, 236, 0)');
  halo.addColorStop(1, 'rgba(255, 244, 226, 0.4)');
  ctx.fillStyle = halo;
  ctx.fillRect(L.left, baseY - L.size * 1.3, L.right - L.left, L.size * 1.3);
  const band = ctx.createLinearGradient(0, baseY - 4, 0, baseY + 7);
  band.addColorStop(0, 'rgba(250, 236, 214, 0)');
  band.addColorStop(0.3, 'rgba(244, 222, 192, 0.88)');
  band.addColorStop(0.7, 'rgba(230, 202, 166, 0.78)');
  band.addColorStop(1, 'rgba(230, 202, 166, 0)');
  ctx.fillStyle = band;
  ctx.fillRect(L.left + 2, baseY - 4, L.right - L.left - 4, 11);

  // 卧室星空投影灯：点亮时身后一圈星座卡色的奶油柔光、向上一束淡淡的投影光，星点从灯罩缓缓升起
  const P = L.projector;
  const ps = P.size;
  const lit = Boolean(sv.active);
  const starRgb = sv.rgb || '255, 240, 214';
  const pGlow = ctx.createRadialGradient(P.x, baseY - ps * 0.6, 3, P.x, baseY - ps * 0.6, ps * (lit ? 1.45 : 0.85));
  pGlow.addColorStop(0, `rgba(${starRgb}, ${lit ? 0.72 : 0.34})`);
  pGlow.addColorStop(1, `rgba(${starRgb}, 0)`);
  ctx.fillStyle = pGlow;
  ctx.fillRect(P.x - ps * 1.5, baseY - ps * 2.1, ps * 3, ps * 2.2);
  if (lit) {
    const beamTop = baseY - ps * 3.4;
    const beam = ctx.createLinearGradient(0, baseY - ps * 0.9, 0, beamTop);
    beam.addColorStop(0, 'rgba(255, 244, 222, 0.36)');
    beam.addColorStop(1, 'rgba(255, 248, 236, 0)');
    ctx.fillStyle = beam;
    ctx.fillRect(P.x - ps * 0.62, beamTop, ps * 1.24, baseY - ps * 0.9 - beamTop);
  }
  ctx.save();
  ctx.translate(P.x, baseY);
  const dialing = sv.aligning && !lit && sv.taps > 0 && sv.taps < sv.need;
  ctx.rotate(Math.sin(now * (dialing ? 0.012 : 0.0016)) * (dialing ? 0.05 : 0.012));
  ctx.drawImage(images.starProjector, -ps * 0.5, -ps * 0.97, ps, ps);
  ctx.restore();
  if (isReady(images.vfxSparkle)) {
    if (lit) {
      for (let i = 0; i < 4; i++) {
        const t = (now * 0.00028 + i / 4) % 1;
        ctx.globalAlpha = Math.max(0, 0.8 * (1 - t));
        const sx = P.x + Math.sin(now * 0.0016 + i * 1.9) * ps * 0.32;
        const sz = 8 + (i % 2) * 3;
        ctx.drawImage(images.vfxSparkle, sx - sz * 0.5, baseY - ps * 1.02 - t * ps * 2.2 - sz * 0.5, sz, sz);
      }
      ctx.globalAlpha = 1;
    } else if (sv.aligning && sv.taps > 0) {
      for (let i = 0; i < Math.min(6, sv.taps); i++) {
        const a = (i / Math.max(1, sv.need)) * Math.PI * 1.2 - Math.PI * 0.6;
        ctx.globalAlpha = 0.55 + 0.35 * Math.sin(now * 0.006 + i);
        ctx.drawImage(images.vfxSparkle, P.x + Math.sin(a) * ps * 0.62 - 4, baseY - ps * 1.05 - Math.cos(a) * ps * 0.3 - 4, 8, 8);
      }
      ctx.globalAlpha = 1;
    }
  }

  // 听雨坐垫：听雨时一圈天气色柔光，坐垫轻轻起伏
  const C = L.cushion;
  const cs = C.size;
  const listening = Boolean(rv.listening);
  const rainRgb = rv.rgb || '240, 238, 230';
  const cGlow = ctx.createRadialGradient(C.x, baseY - cs * 0.35, 3, C.x, baseY - cs * 0.35, cs * (listening ? 1.2 : 0.8));
  cGlow.addColorStop(0, `rgba(${rainRgb}, ${listening ? 0.7 : 0.38})`);
  cGlow.addColorStop(1, `rgba(${rainRgb}, 0)`);
  ctx.fillStyle = cGlow;
  ctx.fillRect(C.x - cs * 1.2, baseY - cs * 1.4, cs * 2.4, cs * 1.5);
  ctx.save();
  ctx.translate(C.x, baseY);
  const breath = listening ? 1 + Math.sin(now * 0.0024) * 0.025 : 1;
  ctx.scale(1, breath);
  ctx.drawImage(images.rainCushion, -cs * 0.5, -cs * 0.95, cs, cs);
  ctx.restore();

  // 窗边雨滴风铃：挂在坐垫正上方，听雨时摆得更欢，点一下会叮地晃一大下；雨滴星点顺着风签滑落
  if (isReady(images.rainChime)) {
    const ch = L.chime;
    const ring = Math.max(0, Math.min(1, Number(rv.ring) || 0));
    const amp = (listening ? 0.12 : 0.05) + ring * 0.2;
    const angle = Math.sin(now * (listening || ring > 0 ? 0.0036 : 0.0018)) * amp;
    ctx.save();
    ctx.translate(ch.x, ch.top);
    ctx.rotate(angle);
    ctx.drawImage(images.rainChime, -ch.size * 0.5, 0, ch.size, ch.size);
    ctx.restore();
    if (listening && isReady(images.vfxSparkle)) {
      for (let i = 0; i < 3; i++) {
        const t = (now * 0.00055 + i / 3) % 1;
        ctx.globalAlpha = Math.max(0, 0.75 * Math.sin(t * Math.PI));
        const dx = ch.x + (i - 1) * cs * 0.22 + Math.sin(angle) * ch.size * 0.4;
        const dy = ch.top + ch.size * 0.55 + t * (baseY - cs * 0.6 - ch.top - ch.size * 0.55);
        ctx.drawImage(images.vfxSparkle, dx - 3.5, dy - 3.5, 7, 7);
      }
      ctx.globalAlpha = 1;
    }
  }

  if (!p.hideTerrariumLabels) {
    ctx.globalAlpha = 0.92;
    ctx.font = '900 9.5px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(120, 84, 56, 0.86)';
    ctx.lineWidth = 2.6;
    const tagTxt = `${sv.label || '星空灯'} · ${rv.label || '听雨角'}`;
    ctx.strokeText(tagTxt, L.labelX, baseY + 12);
    ctx.fillStyle = '#fff9ec';
    ctx.fillText(tagTxt, L.labelX, baseY + 12);
  }
  ctx.restore();
}

function isAr15PropBlocked(p) {
  return Boolean(
    p.onPalm ||
      p.isPainting ||
      p.isCookingBento ||
      p.isCraftingCard ||
      p.isFocusStudying ||
      p.isWritingDiary ||
      p.isGoodnightSleeping ||
      (p.potteryVisual && p.potteryVisual.shaping) ||
      (p.aromaVisual && p.aromaVisual.blending) ||
      (p.picnicVisual && (p.picnicVisual.outing || p.picnicVisual.packing))
  );
}

// AR-15 星座卡：打开星空投影灯时她身旁举着一张星座卡，已对准的亮星化作星点在卡片上方一颗颗亮起
export function drawStarCardProp(ctx, p, now) {
  const sv = p && p.starVisual;
  // 两张 AR-15 卡同一时间只开一张：听雨卡开着时只摆风铃，不再同时举星座卡
  if (!sv || !(sv.aligning || sv.cheer > 0) || isAr15PropBlocked(p) || (p.rainVisual && p.rainVisual.cardOpen) || !isReady(images.constellationCard)) return;
  const side = p.facing || 1;
  const propX = p.x - side * 62;
  const propY = p.y + 24;
  const sz = 46;
  ctx.save();
  ctx.translate(propX, propY);
  const glowRgb = sv.rgb || '255, 240, 214';
  const glow = ctx.createRadialGradient(0, -26, 4, 0, -26, 52);
  glow.addColorStop(0, `rgba(${glowRgb}, 0.62)`);
  glow.addColorStop(1, `rgba(${glowRgb}, 0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(-54, -80, 108, 92);
  ctx.save();
  ctx.rotate(-0.06 + Math.sin(now * 0.0022) * 0.05);
  ctx.drawImage(images.constellationCard, -sz * 0.5, -sz * 0.95, sz, sz);
  ctx.restore();
  if (isReady(images.vfxSparkle)) {
    const lit = Math.max(0, Math.min(6, Number(sv.taps) || 0));
    for (let i = 0; i < lit; i++) {
      const hop = Math.abs(Math.sin(now * 0.005 + i * 1.1)) * 3;
      ctx.globalAlpha = 0.88;
      ctx.drawImage(images.vfxSparkle, -sz * 0.42 + i * 7.5, -sz * 1.12 - (i % 2) * 6 - hop, 10, 10);
    }
    if (sv.cheer > 0) {
      ctx.globalAlpha = 0.45 + 0.4 * Math.sin(now * 0.006);
      ctx.drawImage(images.vfxSparkle, side > 0 ? -30 : 18, -66 - ((now * 0.012) % 12), 12, 12);
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

// AR-15 听雨：打开听雨角时她身旁提着一串小雨滴风铃，听雨中风铃随雨声轻轻摇
export function drawRainListenProp(ctx, p, now) {
  const rv = p && p.rainVisual;
  if (
    !rv ||
    !(rv.cardOpen || rv.cheer > 0) ||
    isAr15PropBlocked(p) ||
    (p.starVisual && (p.starVisual.aligning || (p.starVisual.cheer > 0 && !rv.cardOpen))) ||
    !isReady(images.rainChime)
  ) {
    return;
  }
  const side = p.facing || 1;
  const propX = p.x - side * 58;
  const propY = p.y - 44;
  const sz = 50;
  ctx.save();
  ctx.translate(propX, propY);
  const glowRgb = rv.rgb || '240, 238, 230';
  const glow = ctx.createRadialGradient(0, sz * 0.45, 4, 0, sz * 0.45, 46);
  glow.addColorStop(0, `rgba(${glowRgb}, 0.6)`);
  glow.addColorStop(1, `rgba(${glowRgb}, 0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(-48, -8, 96, 86);
  ctx.rotate(Math.sin(now * (rv.listening ? 0.004 : 0.002)) * (rv.listening ? 0.16 : 0.07) + Math.max(0, Math.min(1, rv.ring || 0)) * 0.12);
  ctx.drawImage(images.rainChime, -sz * 0.5, 0, sz, sz);
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

// ================= AR-16 墙面刺绣绷架 & 地板小暖炉冬日角 =================
// AR-16 墙面刺绣绷架：书桌与窗台都已满，绷架挂在陶艺架正上方那片墙面（窗户左侧、顶部模式切换坞下方，跟随窗户几何），
// 收针后的绣品沿一条丝带挂在绷架左边的墙面上（在星空灯 / 听雨风铃的上方，最多挂最近 4 幅，最新的挨着绷架）。
// 只贴已提供的位图 + 柔光渐变 + 文字标签，不画任何矢量图形（game.js 点击判定共用同一套几何）
export function getAr16WallLayout(W, H, camX = 0) {
  const shelf = getPotteryShelfLayout(W, H, camX, 4);
  const corner = getAr15CornerLayout(W, H, camX);
  const hoop = Math.round(Math.max(44, Math.min(74, H * 0.085)));
  let patch = Math.round(hoop * 0.5);
  const gap = Math.max(4, Math.round(patch * 0.2));
  // 顶部模式切换坞下沿约 51px：丝带挂在它下方；绷架底边离陶艺架、绣品底边离听雨风铃都至少留 10px
  const topMin = 58;
  const ribbonY = Math.max(topMin, Math.min(shelf.hit.y - 10 - hoop, corner.chime.top - 10 - patch));
  const hoopX = (shelf.left + shelf.right) * 0.5;
  const hoopY = ribbonY + hoop * 0.5;
  // 左侧 HUD 胶囊行最宽到 x = 14 + 318 = 332（从 y ≈ 131 往下排）：丝带若和胶囊行同高，4 幅绣品整排收在 x ≥ 340 右边，放不下就把绣品缩小一点
  const hudSafeX = 340;
  if (ribbonY + patch > 125) {
    const avail = hoopX - hoop * 0.5 - gap - hudSafeX;
    if (patch * 4 + gap * 3 > avail) patch = Math.max(22, Math.floor((avail - gap * 3) / 4));
  }
  const slots = [];
  for (let i = 0; i < 4; i++) {
    slots.push({ x: hoopX - hoop * 0.5 - gap - patch * 0.5 - i * (patch + gap), y: ribbonY, size: patch });
  }
  const left = slots[3].x - patch * 0.5 - 4;
  const rowRight = slots[0].x + patch * 0.5 + 2;
  return {
    hoop,
    patch,
    gap,
    ribbonY,
    hoopX,
    hoopY,
    slots,
    left,
    right: hoopX + hoop * 0.5 + 4,
    top: ribbonY - 4,
    bottom: ribbonY + hoop,
    labelY: ribbonY + hoop + 11,
    hoopHit: { x: hoopX, y: hoopY, r: Math.max(20, hoop * 0.56) },
    patchHit: { x: left, y: ribbonY - 4, w: rowRight - left, h: patch + 10 }
  };
}

export function drawAr16WallHoop(ctx, p, W, H, now) {
  const ev = p && p.embroideryVisual;
  if (!ev || !isReady(images.embroideryHoop)) return;
  const L = getAr16WallLayout(W, H, p.sillCamX || 0);
  const wall = Array.isArray(ev.wall) ? ev.wall.slice(0, 4) : [];
  ctx.save();

  // 丝带：一道奶油樱粉色的柔光带（纯渐变，不描任何线条），挂着最近收针的绣品
  if (wall.length && isReady(images.embroideryPatch)) {
    const ribbonLeft = L.slots[wall.length - 1].x - L.patch * 0.5 - 6;
    const rb = ctx.createLinearGradient(ribbonLeft, 0, L.hoopX, 0);
    rb.addColorStop(0, 'rgba(252, 232, 236, 0)');
    rb.addColorStop(0.18, 'rgba(244, 208, 216, 0.88)');
    rb.addColorStop(1, 'rgba(240, 204, 212, 0.88)');
    ctx.fillStyle = rb;
    ctx.fillRect(ribbonLeft, L.ribbonY - 1.5, L.hoopX - ribbonLeft, 3);
    for (let i = 0; i < wall.length; i++) {
      const piece = wall[i] || {};
      const s = L.slots[i];
      const rgb = piece.threadRgb || '255, 248, 232';
      const glow = ctx.createRadialGradient(s.x, s.y + s.size * 0.55, 2, s.x, s.y + s.size * 0.55, s.size * 0.85);
      glow.addColorStop(0, `rgba(${rgb}, 0.85)`);
      glow.addColorStop(1, `rgba(${rgb}, 0)`);
      ctx.fillStyle = glow;
      ctx.fillRect(s.x - s.size, s.y - 4, s.size * 2, s.size * 1.7);
      ctx.save();
      ctx.translate(s.x, s.y);
      const fresh = i === 0 ? Math.max(0, Math.min(1, Number(ev.hung) || 0)) : 0;
      ctx.rotate(Math.sin(now * 0.0017 + i * 1.3) * 0.05 + Math.sin(now * 0.02) * 0.14 * fresh);
      ctx.drawImage(images.embroideryPatch, -s.size * 0.5, 1, s.size, s.size);
      ctx.restore();
    }
  }

  // 绷架：绣花时身后一圈绣样色的奶油柔光，平时只是淡淡的墙面光
  const stitching = Boolean(ev.active);
  const glowRgb = ev.patternRgb || '255, 240, 232';
  const hg = ctx.createRadialGradient(L.hoopX, L.hoopY, 4, L.hoopX, L.hoopY, L.hoop * (stitching ? 0.95 : 0.72));
  hg.addColorStop(0, `rgba(${glowRgb}, ${stitching ? 0.72 : 0.4})`);
  hg.addColorStop(1, `rgba(${glowRgb}, 0)`);
  ctx.fillStyle = hg;
  ctx.fillRect(L.hoopX - L.hoop, L.hoopY - L.hoop, L.hoop * 2, L.hoop * 2);
  ctx.save();
  ctx.translate(L.hoopX, L.ribbonY);
  ctx.rotate(Math.sin(now * 0.0014) * 0.015 + (stitching && ev.cardOpen ? Math.sin(now * 0.01) * 0.02 : 0));
  ctx.drawImage(images.embroideryHoop, -L.hoop * 0.5, 0, L.hoop, L.hoop);
  ctx.restore();

  // 绷布上的半成品：按进度渐显的绣品位图 + 已绣针脚的星点（你一针、她一针）
  if (stitching && isReady(images.embroideryPatch)) {
    const prog = Math.max(0, Math.min(1, Number(ev.progress) || 0));
    const ps = L.hoop * 0.52;
    // 绷布：绣品身后一圈奶油白的柔光（像绷紧的棉布），让半成品在软木绷架上看得清
    const cloth = ctx.createRadialGradient(L.hoopX, L.hoopY, 2, L.hoopX, L.hoopY, ps * 0.78);
    cloth.addColorStop(0, 'rgba(255, 252, 246, 0.94)');
    cloth.addColorStop(0.7, `rgba(${ev.threadRgb || '255, 248, 232'}, 0.7)`);
    cloth.addColorStop(1, 'rgba(255, 252, 246, 0)');
    ctx.fillStyle = cloth;
    ctx.fillRect(L.hoopX - ps * 0.8, L.hoopY - ps * 0.8, ps * 1.6, ps * 1.6);
    ctx.globalAlpha = 0.3 + 0.7 * prog;
    ctx.drawImage(images.embroideryPatch, L.hoopX - ps * 0.5, L.hoopY - ps * 0.5, ps, ps);
    ctx.globalAlpha = 1;
    if (isReady(images.vfxSparkle)) {
      const n = Math.max(0, Math.min(8, Math.round(Number(ev.stitches) || 0)));
      for (let i = 0; i < n; i++) {
        const a = (i / 8) * Math.PI * 2 - Math.PI * 0.5;
        const sz = 7 + (i % 2) * 2;
        ctx.globalAlpha = 0.6 + 0.35 * Math.sin(now * 0.006 + i);
        ctx.drawImage(images.vfxSparkle, L.hoopX + Math.cos(a) * ps * 0.62 - sz * 0.5, L.hoopY + Math.sin(a) * ps * 0.62 - sz * 0.5, sz, sz);
      }
      ctx.globalAlpha = 1;
    }
  }

  if (!p.hideTerrariumLabels) {
    ctx.globalAlpha = 0.92;
    ctx.font = '900 9.5px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(132, 88, 96, 0.86)';
    ctx.lineWidth = 2.6;
    const tagTxt = ev.label || '刺绣绷架';
    ctx.strokeText(tagTxt, L.hoopX, L.labelY);
    ctx.fillStyle = '#fff9f4';
    ctx.fillText(tagTxt, L.hoopX, L.labelY);
  }
  ctx.restore();
}

// AR-16 地板小暖炉冬日角：书桌线（H × 0.68）已摆满，小暖炉放在书桌前的地板上 —— x 取书桌摆设标签之间的空档（0.465W，
// 在 0.41W 花盆与 0.55W 便当袋之间），底边落在船坞 / 摇杆上沿以上（floorBottom 由 game.js 实测 HUD 上沿换算成舞台坐标传入）；
// 矮屏（844×390 / 旋转竖屏）书桌下方只剩 ~35px，暖炉缩到 30px 并收起场景标签。暖炉旁一小碟炉边烤松饼。
export function getAr16FloorLayout(W, H, floorBottom = 0) {
  const deskY = H * 0.68;
  const fbRaw = Number(floorBottom);
  const fb = Number.isFinite(fbRaw) && fbRaw > deskY + 24 ? fbRaw : H * 0.9;
  const band = fb - deskY;
  const size = Math.round(Math.max(30, Math.min(72, band * 0.4)));
  const baseY = Math.min(fb - 4, deskY + 24 + size);
  const heaterX = W * 0.465;
  const snack = Math.round(size * 0.62);
  const snackX = heaterX + size * 0.5 + 4 + snack * 0.5;
  const left = heaterX - size * 0.5 - 4;
  const right = snackX + snack * 0.5 + 4;
  const top = baseY - size - 6;
  return {
    deskY,
    floorBottom: fb,
    band,
    size,
    baseY,
    heaterX,
    snack,
    snackX,
    compact: band < 70,
    labelX: (left + right) * 0.5,
    labelY: baseY + 12,
    left,
    right,
    top,
    hit: { x: left, y: top, w: right - left, h: baseY + 2 - top }
  };
}

export function drawAr16FloorHearth(ctx, p, W, H, now) {
  const hv = p && p.hearthVisual;
  if (!hv || !isReady(images.floorHeater)) return;
  const L = getAr16FloorLayout(W, H, p.ar16FloorBottom || 0);
  const lvl = Math.max(0, Math.min(3, Math.round(Number(hv.level) || 0)));
  const lit = lvl > 0;
  const rgb = hv.rgb || '255, 238, 216';
  const midY = L.baseY - L.size * 0.45;
  ctx.save();

  // 地板暖光：暖炉亮着时脚下一圈奶油琥珀色柔光（火力越旺圈越大），依偎时再暖一点；没亮时只有一点点地板反光
  const glowR = L.size * (lit ? 0.85 + lvl * 0.28 + (hv.cuddle ? 0.2 : 0) : 0.66);
  const fg = ctx.createRadialGradient(L.heaterX, midY, 3, L.heaterX, midY, glowR);
  fg.addColorStop(0, `rgba(${rgb}, ${lit ? 0.48 + lvl * 0.1 : 0.22})`);
  fg.addColorStop(1, `rgba(${rgb}, 0)`);
  ctx.fillStyle = fg;
  ctx.fillRect(L.heaterX - glowR, midY - glowR, glowR * 2, glowR * 2);
  const band = ctx.createLinearGradient(0, L.baseY - 3, 0, L.baseY + 5);
  band.addColorStop(0, 'rgba(244, 226, 204, 0)');
  band.addColorStop(0.5, 'rgba(234, 210, 182, 0.6)');
  band.addColorStop(1, 'rgba(234, 210, 182, 0)');
  ctx.fillStyle = band;
  ctx.fillRect(L.left, L.baseY - 3, L.right - L.left, 8);

  ctx.save();
  ctx.translate(L.heaterX, L.baseY);
  const pulse = lit ? 1 + Math.sin(now * 0.003) * 0.012 * lvl : 1;
  ctx.scale(pulse, pulse);
  ctx.globalAlpha = lit ? 1 : 0.84;
  ctx.drawImage(images.floorHeater, -L.size * 0.5, -L.size, L.size, L.size);
  ctx.restore();
  ctx.globalAlpha = 1;

  // 暖炉里的小火星：亮着时星点从炉口缓缓升起（火力越旺越多）
  if (lit && isReady(images.vfxSparkle)) {
    const n = lvl + 1;
    for (let i = 0; i < n; i++) {
      const t = (now * 0.00042 + i / n) % 1;
      ctx.globalAlpha = Math.max(0, 0.78 * (1 - t));
      const sx = L.heaterX + Math.sin(now * 0.0019 + i * 2.1) * L.size * 0.22;
      const sz = Math.max(5, L.size * 0.11) + (i % 2) * 2;
      ctx.drawImage(images.vfxSparkle, sx - sz * 0.5, L.baseY - L.size * 0.86 - t * L.size * 0.8 - sz * 0.5, sz, sz);
    }
    ctx.globalAlpha = 1;
  }

  // 炉边一碟烤松饼：烤的时候冒热气星点，翻面时轻轻一跳
  if (isReady(images.roastedSnack)) {
    const srgb = hv.snackRgb || '255, 238, 214';
    const sg = ctx.createRadialGradient(L.snackX, L.baseY - L.snack * 0.4, 2, L.snackX, L.baseY - L.snack * 0.4, L.snack * 0.9);
    sg.addColorStop(0, `rgba(${srgb}, ${hv.roasting ? 0.62 : 0.32})`);
    sg.addColorStop(1, `rgba(${srgb}, 0)`);
    ctx.fillStyle = sg;
    ctx.fillRect(L.snackX - L.snack, L.baseY - L.snack * 1.3, L.snack * 2, L.snack * 1.4);
    const flip = Math.max(0, Math.min(1, Number(hv.flip) || 0));
    ctx.save();
    ctx.translate(L.snackX, L.baseY - Math.abs(Math.sin(now * 0.02)) * 4 * flip);
    ctx.rotate(Math.sin(now * 0.02) * 0.08 * flip);
    ctx.drawImage(images.roastedSnack, -L.snack * 0.5, -L.snack * 0.92, L.snack, L.snack);
    ctx.restore();
    if ((hv.roasting || hv.cheer > 0) && isReady(images.vfxSparkle)) {
      for (let i = 0; i < 2; i++) {
        const t = (now * 0.0006 + i * 0.5) % 1;
        ctx.globalAlpha = Math.max(0, 0.7 * Math.sin(t * Math.PI));
        ctx.drawImage(images.vfxSparkle, L.snackX - 3 + (i ? 4 : -4), L.baseY - L.snack - t * L.snack * 0.6 - 3, 6, 6);
      }
      ctx.globalAlpha = 1;
    }
  }

  if (!L.compact && !p.hideTerrariumLabels) {
    ctx.globalAlpha = 0.92;
    ctx.font = '900 9.5px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(128, 86, 56, 0.86)';
    ctx.lineWidth = 2.6;
    const tagTxt = hv.label || '小暖炉';
    ctx.strokeText(tagTxt, L.labelX, L.labelY);
    ctx.fillStyle = '#fff9ec';
    ctx.fillText(tagTxt, L.labelX, L.labelY);
  }
  ctx.restore();
}

function isAr16PropBlocked(p) {
  return Boolean(
    p.onPalm ||
      p.isPainting ||
      p.isCookingBento ||
      p.isCraftingCard ||
      p.isFocusStudying ||
      p.isWritingDiary ||
      p.isGoodnightSleeping ||
      (p.potteryVisual && p.potteryVisual.shaping) ||
      (p.aromaVisual && p.aromaVisual.blending) ||
      (p.picnicVisual && (p.picnicVisual.outing || p.picnicVisual.packing)) ||
      (p.starVisual && p.starVisual.aligning) ||
      (p.rainVisual && p.rainVisual.cardOpen)
  );
}

// AR-16 刺绣：打开刺绣绷架时她身旁举着一只小绷架，绷布上的绣品随进度渐显，已绣的针脚化作星点一颗颗亮起
export function drawEmbroideryProp(ctx, p, now) {
  const ev = p && p.embroideryVisual;
  if (
    !ev ||
    !(ev.cardOpen || ev.cheer > 0) ||
    isAr16PropBlocked(p) ||
    (p.hearthVisual && p.hearthVisual.cardOpen) ||
    !isReady(images.embroideryHoop)
  ) {
    return;
  }
  const side = p.facing || 1;
  const propX = p.x - side * 60;
  const propY = p.y + 22;
  const sz = 46;
  ctx.save();
  ctx.translate(propX, propY);
  const glowRgb = ev.patternRgb || '255, 236, 236';
  const glow = ctx.createRadialGradient(0, -24, 4, 0, -24, 50);
  glow.addColorStop(0, `rgba(${glowRgb}, 0.6)`);
  glow.addColorStop(1, `rgba(${glowRgb}, 0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(-52, -76, 104, 88);
  ctx.save();
  ctx.rotate(-0.05 + Math.sin(now * 0.0024) * 0.04);
  ctx.drawImage(images.embroideryHoop, -sz * 0.5, -sz * 0.95, sz, sz);
  if (ev.active && isReady(images.embroideryPatch)) {
    const ps = sz * 0.5;
    ctx.globalAlpha = 0.3 + 0.7 * Math.max(0, Math.min(1, Number(ev.progress) || 0));
    ctx.drawImage(images.embroideryPatch, -ps * 0.5, -sz * 0.47 - ps * 0.5, ps, ps);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  if (isReady(images.vfxSparkle)) {
    const n = Math.max(0, Math.min(8, Math.round(Number(ev.stitches) || 0)));
    for (let i = 0; i < n; i++) {
      const hop = Math.abs(Math.sin(now * 0.005 + i * 1.1)) * 3;
      ctx.globalAlpha = 0.86;
      ctx.drawImage(images.vfxSparkle, -sz * 0.46 + i * 6, -sz * 1.1 - (i % 2) * 5 - hop, 9, 9);
    }
    if (ev.cheer > 0) {
      ctx.globalAlpha = 0.45 + 0.4 * Math.sin(now * 0.006);
      ctx.drawImage(images.vfxSparkle, side > 0 ? -30 : 18, -64 - ((now * 0.012) % 12), 12, 12);
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

// AR-16 炉边点心：打开小暖炉时她身旁捧着一碟烤松饼，翻面时松饼轻轻一跳，冒出暖暖的星点热气
export function drawHearthSnackProp(ctx, p, now) {
  const hv = p && p.hearthVisual;
  if (
    !hv ||
    !(hv.cardOpen || hv.cheer > 0) ||
    isAr16PropBlocked(p) ||
    (p.embroideryVisual && p.embroideryVisual.cardOpen) ||
    !isReady(images.roastedSnack)
  ) {
    return;
  }
  const side = p.facing || 1;
  const propX = p.x - side * 58;
  const propY = p.y + 20;
  const sz = 44;
  ctx.save();
  ctx.translate(propX, propY);
  const glowRgb = hv.snackRgb || '255, 238, 214';
  const glow = ctx.createRadialGradient(0, -20, 4, 0, -20, 48);
  glow.addColorStop(0, `rgba(${glowRgb}, 0.62)`);
  glow.addColorStop(1, `rgba(${glowRgb}, 0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(-50, -70, 100, 82);
  const flip = Math.max(0, Math.min(1, Number(hv.flip) || 0));
  ctx.save();
  ctx.translate(0, -Math.abs(Math.sin(now * 0.02)) * 5 * flip);
  ctx.rotate(Math.sin(now * 0.0022) * 0.04 + Math.sin(now * 0.02) * 0.1 * flip);
  ctx.drawImage(images.roastedSnack, -sz * 0.5, -sz * 0.92, sz, sz);
  ctx.restore();
  if (isReady(images.vfxSparkle)) {
    const n = hv.roasting ? Math.max(1, Math.min(5, Math.round(Number(hv.flips) || 0) + 1)) : hv.cheer > 0 ? 3 : 1;
    for (let i = 0; i < n; i++) {
      const t = (now * 0.0007 + i / n) % 1;
      ctx.globalAlpha = Math.max(0, 0.75 * Math.sin(t * Math.PI));
      ctx.drawImage(images.vfxSparkle, -10 + i * 6, -sz * 0.95 - t * 22, 8, 8);
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
