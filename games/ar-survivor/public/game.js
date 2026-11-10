// game.js — DeepSeek娘桌面宠物级实景交互（抓边爬台 / 蹲伏戳物体 / 坐边缘晃腿 / 摸头傲娇 / 物理轨迹回归中心）

import { ARVisionEngine } from './vision.js?v=hd7';
import {
  drawHeroSprite,
  drawEnemySprite,
  drawStarGoal,
  drawFoodItem,
  drawToyItem,
  drawFurnitureItem,
  drawInteractionVfx,
  images,
  isReady
} from './sprites.js?v=hd8';
import { petAudio } from './audio.js?v=hd7';

const stageEl = document.getElementById('game-stage');
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const video = document.getElementById('camera-video');

const vision = new ARVisionEngine(video);

let W = Math.max(window.innerWidth, window.innerHeight);
let H = Math.min(window.innerWidth, window.innerHeight);
let dpr = Math.min(2, window.devicePixelRatio || 1.5);
let preferCCW = false;

function updateOrientationLayout() {
  const prevW = W;
  const prevH = H;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  dpr = Math.min(2, window.devicePixelRatio || 1.5);
  if (vw < vh) {
    W = vh;
    H = vw;
    stageEl.classList.remove('forced-landscape-cw', 'forced-landscape-ccw');
    stageEl.classList.add(preferCCW ? 'forced-landscape-ccw' : 'forced-landscape-cw');
    vision.rotationMode = preferCCW ? 'ccw' : 'cw';
  } else {
    W = vw;
    H = vh;
    stageEl.classList.remove('forced-landscape-cw', 'forced-landscape-ccw');
    vision.rotationMode = 'none';
  }
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'medium';
  if (vision.mode === 'sim') {
    vision.buildSimulatedDesk(W, H);
  }
  if (prevW > 0 && prevH > 0 && (W !== prevW || H !== prevH)) {
    const sx = W / prevW;
    const sy = H / prevH;
    try {
      player.x *= sx;
      if (player.onGround || Math.abs(player.y + 25 - prevH * 0.68) < 20) {
        player.y = H * 0.68 - 25;
        player.vy = 0;
        player.onGround = true;
      } else {
        player.y *= sy;
      }
      for (const furn of furnitureList) {
        furn.x *= sx;
        furn.y = H * 0.68 - 2;
        furn.vy = 0;
      }
    } catch {}
  }
}

function clientToStage(clientX, clientY) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (vw < vh) {
    if (!preferCCW) {
      return { x: clientY, y: vw - clientX };
    } else {
      return { x: vh - clientY, y: clientX };
    }
  }
  return { x: clientX, y: clientY };
}

window.addEventListener('resize', updateOrientationLayout);
updateOrientationLayout();

// 首次交互自动唤醒二次元八音盒 BGM 与音频引擎
window.addEventListener(
  'pointerdown',
  () => {
    petAudio.ensureContext();
  },
  { passive: true }
);

function playSfx(type, combo = 1) {
  petAudio.playSfx(type, combo);
}

const savedPet = (() => {
  try {
    return JSON.parse(localStorage.getItem('ar_deepseek_pet_v2') || '{}');
  } catch (e) {
    return {};
  }
})();

function savePetState() {
  try {
    localStorage.setItem(
      'ar_deepseek_pet_v2',
      JSON.stringify({
        level: player.level,
        xp: player.xp,
        xpNext: player.xpNext,
        coins: player.coins,
        hunger: Math.round(player.hunger),
        starsCollected: player.starsCollected,
        ownedDress: player.ownedDress,
        equipped: player.equipped,
        placedFurniture: player.placedFurniture,
        activeToy: player.activeToy,
        weapons: player.weapons
      })
    );
  } catch (e) {}
}

// 当前玩法模式：'pet' (默认AR日常休闲养成) | 'parkour' (实景跳台摘星) | 'survivor' (幸存者打工赚金币)
let gameMode = 'pet';

const player = {
  x: W * 0.5,
  y: H * 0.62,
  vx: 0,
  vy: 0,
  w: 36,
  h: 52,
  facing: 1,
  onGround: false,
  isBraking: false,
  isCrouching: false,
  crouchTime: 0,
  dropThroughTimer: 0,
  currentRole: 'tech',
  standingPlat: null,
  jumpsLeft: 3,
  maxJumps: 3,
  coyoteTimer: 0,
  recenterDelay: 0,
  autoJumpCd: 0,
  climbState: 'none',
  climbTimer: 0,
  climbTargetX: 0,
  climbTargetY: 0,
  climbCooldown: 0,
  palmState: 'none',
  onPalm: false,
  palmBoardTimer: 0,
  palmBoardDuration: 0.3,
  palmStartX: 0,
  palmStartY: 0,
  palmBounceCd: 0,
  palmTickleCd: 0,
  palmRewardTimer: 0,
  palmHopY: 0,
  palmHopVy: 0,
  idleTime: 0,
  petAction: 'idle',
  wanderTargetX: null,
  wanderTimer: 3.5,
  spinTimer: 0,
  landAnimTimer: 0,
  attackAnimTimer: 0,
  happyTimer: 0,
  proudTimer: 0,
  tsundereTimer: 0,
  eatingTimer: 0,
  talkAnimTimer: 0,
  photoPoseTimer: 0,
  rpsPoseTimer: 0,
  cheerTimer: 0,
  fingerChaseActive: false,
  fingerBoopCd: 0,
  fingerCombo: 0,
  fingerComboTimer: 0,
  rubbingTimer: 0,
  rubOffsetX: 0,
  isPickedUp: false,
  dragVx: 0,
  dragVy: 0,
  eagerFeedActive: false,
  lookOffsetX: 0,
  palmTilt: 0,
  palmSparkleTick: 0,
  palmCombo: 0,
  palmComboTimer: 0,
  sleepZzzTick: 0,
  activeToy: savedPet.activeToy || 'whale',
  emote: '今天也在桌面陪主人~',
  emoteMood: 'happy',
  emoteTimer: 2.4,
  hp: 100,
  maxHp: 100,
  hunger: savedPet.hunger !== undefined ? savedPet.hunger : 85,
  maxHunger: 100,
  coins: savedPet.coins !== undefined ? savedPet.coins : 60,
  foodBuffTimer: 0,
  foodCoinMult: 1,
  level: savedPet.level || 1,
  xp: savedPet.xp || 0,
  xpNext: savedPet.xpNext || 40,
  kills: 0,
  starsCollected: savedPet.starsCollected || 0,
  ownedDress: savedPet.ownedDress || { furn_lamp: true },
  equipped: savedPet.equipped || {},
  placedFurniture: savedPet.placedFurniture || {
    lamp: { xRatio: 0.24, manualOn: true }
  },
  weapons: savedPet.weapons || {
    blaster: 1,
    teaBlade: 1,
    magnet: 1,
    boots: 0
  }
};

function pulseHudElement(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('pop-pulse');
  void el.offsetWidth;
  el.classList.add('pop-pulse');
}

function spawnInteractVfx(x, y, preset = 'love', count = 7) {
  if (particles.length > 95) {
    particles.splice(0, particles.length - 75);
  }
  for (let i = 0; i < count; i++) {
    let shape = 'heart';
    let color = '#ff6b9d';
    let size = 7.5 + Math.random() * 3.5;
    let vy = -62 - Math.random() * 75;
    let vx = (Math.random() - 0.5) * 145;
    let life = 0.58 + Math.random() * 0.25;
    let gravity = -18;

    if (preset === 'love') {
      shape = i % 3 === 0 ? 'star' : i % 4 === 1 ? 'note' : 'heart';
      color = shape === 'star' ? '#ffd700' : i % 2 === 0 ? '#ff5c97' : '#ff94c2';
    } else if (preset === 'purr') {
      shape = i % 2 === 0 ? 'heart' : 'note';
      color = i % 2 === 0 ? '#ff6ba8' : '#ffb3d1';
      vx = (Math.random() - 0.5) * 90;
      vy = -48 - Math.random() * 45;
      life = 0.72 + Math.random() * 0.2;
    } else if (preset === 'sparkle') {
      shape = i % 3 === 0 ? 'heart' : 'star';
      color = i % 2 === 0 ? '#ffd700' : '#4ce0ff';
      size = 6.5 + Math.random() * 4;
      vx = (Math.random() - 0.5) * 185;
      vy = -70 - Math.random() * 110;
    } else if (preset === 'eat') {
      shape = i % 3 === 0 ? 'heart' : i % 3 === 1 ? 'note' : 'star';
      color = shape === 'star' ? '#ffb703' : '#ff75a8';
      vx = (Math.random() - 0.5) * 110;
      vy = -55 - Math.random() * 55;
    }

    particles.push({
      x: x + (Math.random() - 0.5) * 26,
      y: y + (Math.random() - 0.5) * 16,
      vx,
      vy,
      gravity,
      shape,
      size,
      color,
      phase: Math.random() * Math.PI * 2,
      rot: Math.random() * Math.PI,
      maxLife: life,
      life
    });
  }
}

function addCoins(amount, x, y, labelPrefix = '') {
  const crownBonus = player.equipped.crown ? 1.25 : 1;
  const magnetBonus = 1 + ((player.weapons.magnet || 1) - 1) * 0.15;
  const buffBonus = player.foodBuffTimer > 0 ? player.foodCoinMult : 1;
  const finalCoins = Math.max(1, Math.round(amount * crownBonus * magnetBonus * buffBonus));
  player.coins += finalCoins;
  playSfx('coin');
  pulseHudElement('hud-coins-btn');
  floatingTexts.push({
    x: x ?? player.x,
    y: (y ?? player.y) - 34,
    vx: (Math.random() - 0.5) * 24,
    vy: -58,
    text: `${labelPrefix}+${finalCoins} 金币`,
    color: '#ffd700',
    scale: 1.15,
    life: 0.85
  });
  savePetState();
  if (!drawerEl?.classList.contains('hidden')) renderDrawerItems();
}

function setPlayerEmote(text, duration = 1.8, voiceMood = null, speakTts = false) {
  player.emote = text;
  player.emoteTimer = duration;
  player.talkAnimTimer = Math.min(1.4, duration * 0.72);
  if (voiceMood) {
    player.emoteMood = voiceMood;
    petAudio.speakVoice(text, voiceMood, speakTts);
  } else if (/💢|>\/\/\/<|>_<|别戳/.test(text)) {
    player.emoteMood = 'tsundere';
  } else if (/zzZ|午觉|摸鱼/.test(text)) {
    player.emoteMood = 'sleep';
  } else if (/🍚|🍵|🍤|🍰|香|饱/.test(text)) {
    player.emoteMood = 'eat';
  } else if (/💗|\^w\^|♪|✌️|🎉|耶/.test(text)) {
    player.emoteMood = 'happy';
  } else {
    player.emoteMood = 'normal';
  }
}

function addAffectionXp(amount, labelText) {
  const lampFurn = furnitureList.find((f) => f.key === 'lamp');
  const lampBonus = lampFurn && (vision.isDarkRoom || lampFurn.manualOn) ? 1.25 : 1;
  const finalAmount = Math.max(1, Math.round(amount * lampBonus));
  player.xp += finalAmount;
  player.hp = Math.min(player.maxHp, player.hp + 15);
  pulseHudElement('hud-avatar-btn');
  floatingTexts.push({
    x: player.x,
    y: player.y - 38,
    vx: 0,
    vy: -52,
    text: labelText || `+${finalAmount} 亲密`,
    color: '#ff9ec7',
    scale: 1.1,
    life: 0.85
  });
  if (player.xp >= player.xpNext) {
    player.xp -= player.xpNext;
    player.level++;
    player.xpNext = Math.round(player.xpNext * 1.3);
    applySeamlessUpgrade();
    spawnInteractVfx(player.x, player.y - 24, 'love', 12);
    floatingTexts.push({
      x: player.x,
      y: player.y - 54,
      vx: 0,
      vy: -60,
      text: `亲密 LV.${player.level}!`,
      color: '#ffd700',
      scale: 1.3,
      life: 1.1
    });
  }
  savePetState();
}

const starTarget = {
  x: W * 0.58,
  y: H * 0.28,
  radius: 30,
  active: false,
  respawnTimer: 0,
  targetObjId: null,
  combo: 0,
  comboTimer: 0
};

const bullets = [];
const enemies = [];
const gems = [];
const coinsList = []; // 幸存者模式打怪爆出的物理弹跳金币
const shockwaves = []; // 鲸跃冲击波与小黄鸭音波环
const particles = [];
const touchRipples = []; // 指尖点触柔和樱粉星光水波
const fingerSparkle = { active: false, x: 0, y: 0 }; // AR食指逗宠星光萤火点
const floatingTexts = [];
const petItems = []; // 养成模式投喂的美食 ('food') 与弹力玩具 ('ball')
const furnitureList = []; // 实景桌面微缩家具 ('lamp' | 'pc' | 'tree')
const catchItems = []; // 实景手掌托举接白米饭小游戏掉落物
let draggedItem = null;
let draggedFurniture = null;
let lastDarkRoomState = false;

function syncPlacedFurniture() {
  const specs = [
    { key: 'lamp', defaultX: 0.24 },
    { key: 'pc', defaultX: 0.76 },
    { key: 'tree', defaultX: 0.32 }
  ];
  for (const sp of specs) {
    const conf = player.placedFurniture && player.placedFurniture[sp.key];
    const existingIdx = furnitureList.findIndex((f) => f.key === sp.key);
    if (conf) {
      if (existingIdx === -1) {
        furnitureList.push({
          key: sp.key,
          x: Math.max(54, Math.min(W - 54, (conf.xRatio || sp.defaultX) * W)),
          y: H * 0.68 - 2,
          vy: 0,
          manualOn: conf.manualOn !== undefined ? conf.manualOn : true,
          working: false,
          workTimer: 0,
          squashTimer: 0.2
        });
      }
    } else if (existingIdx !== -1) {
      furnitureList.splice(existingIdx, 1);
    }
  }
}
syncPlacedFurniture();

// ================= 桌宠实时小心愿系统（Mini Wishes） =================
const WISH_POOL = [
  { id: 'palm_hold', text: '伸出手掌让我跳上去玩~', actionHint: 'palm' },
  { id: 'palm_catch', text: '托着我玩一把『接美食』!', actionHint: 'catch_food' },
  { id: 'play_rps', text: '和我玩一把石头剪刀布!', actionHint: 'rps' },
  { id: 'take_photo', text: '比耶拍一张纪念拍立得', actionHint: 'photo' },
  { id: 'eat_rice', text: '想吃一碗热乎白米饭', actionHint: 'feed_rice' },
  { id: 'play_rally', text: '陪我顶球连击 3 次', actionHint: 'throw_ball' },
  { id: 'headpat', text: '想让主人摸摸头~', actionHint: 'headpat' }
];
let currentWishIndex = 0;
let currentWish = WISH_POOL[0];

function completeWish(wishId) {
  if (!currentWish || currentWish.id !== wishId) return;
  playSfx('star');
  petAudio.haptic('win');
  petAudio.speakVoice('太棒啦，委托达成！', 'cheer', true);
  addCoins(25, player.x, player.y - 45, '委托达成 ');
  addAffectionXp(35, '委托 +35 亲密');
  player.happyTimer = 2.0;
  player.cheerTimer = 1.8;
  for (let i = 0; i < 14; i++) {
    particles.push({
      x: player.x,
      y: player.y - 20,
      vx: (Math.random() - 0.5) * 220,
      vy: -80 - Math.random() * 140,
      color: i % 2 === 0 ? '#ffd700' : '#ff9ec7',
      life: 0.65
    });
  }
  currentWishIndex = (currentWishIndex + 1) % WISH_POOL.length;
  currentWish = WISH_POOL[currentWishIndex];
  const wishTextEl = document.getElementById('hud-wish-text');
  if (wishTextEl) wishTextEl.textContent = currentWish.text;
}

let shootTimer = 0;
let enemySpawnTimer = 0;
let bladeAngle = 0;
let lastStarObjId = null;
let lastDownTapTime = 0;

const input = {
  left: false,
  right: false,
  down: false,
  joyX: 0,
  joyY: 0
};

function placeStarOnBestTarget() {
  if (vision.pinnedTarget) {
    const t = vision.pinnedTarget;
    starTarget.x = t.x + t.w * 0.5;
    starTarget.y = Math.max(H * 0.18, t.y - 30);
    starTarget.targetObjId = t.id;
    starTarget.active = true;
    return;
  }

  if (vision.semanticObjects.length > 0) {
    const candidates = vision.semanticObjects.filter((o) => o.id !== lastStarObjId);
    const pool = candidates.length > 0 ? candidates : vision.semanticObjects;
    pool.sort((a, b) => Math.abs(a.x + a.w * 0.5 - W * 0.5) - Math.abs(b.x + b.w * 0.5 - W * 0.5));
    const chosen = pool[0];
    lastStarObjId = chosen.id;
    starTarget.targetObjId = chosen.id;
    starTarget.x = chosen.x + chosen.w * 0.5;
    starTarget.y = Math.max(H * 0.18, chosen.y - 30);
    starTarget.active = true;
    return;
  }

  if (vision.edgePlatforms.length > 0) {
    const topEdge = vision.edgePlatforms[0];
    starTarget.targetObjId = null;
    starTarget.x = (topEdge.x1 + topEdge.x2) * 0.5;
    starTarget.y = Math.max(H * 0.18, topEdge.y - 30);
    starTarget.active = true;
    return;
  }

  starTarget.targetObjId = null;
  starTarget.x = W * (0.38 + Math.random() * 0.24);
  starTarget.y = H * (0.24 + Math.random() * 0.12);
  starTarget.active = true;
}

function applySeamlessUpgrade() {
  playSfx('star');
  player.happyTimer = 1.6;
  player.proudTimer = 1.4;
  setPlayerEmote('吃到星星啦 ^w^', 2.0);
  const keys = ['blaster', 'teaBlade', 'boots'];
  const key = keys[Math.floor(Math.random() * keys.length)];
  player.weapons[key] = (player.weapons[key] || 0) + 1;
  player.maxJumps = 3 + (player.weapons.boots > 0 ? 1 : 0);
}

function triggerJump() {
  // 如果正站在主人手掌心上，按跳跃直接在掌心开心蹦蹦跳！
  if (player.onPalm && player.palmState === 'on_palm') {
    player.palmHopVy = -235;
    player.spinTimer = 0.36;
    player.happyTimer = 1.6;
    playSfx('jump');
    setPlayerEmote('在主人手心里蹦蹦跳~ ', 1.5);
    addAffectionXp(8, '+8 亲密 掌心欢跃');
    return;
  }

  // 如果正在抓边爬平台，按跳跃直接翻身跃起
  if (player.climbState !== 'none') {
    player.climbState = 'none';
    player.vy = -490;
    player.onGround = false;
    setPlayerEmote('翻身跳!', 1.0);
    playSfx('jump');
    return;
  }

  if (player.onGround || player.coyoteTimer > 0 || player.jumpsLeft > 0) {
    const isFirstJump = player.onGround || player.coyoteTimer > 0;
    if (isFirstJump) {
      player.jumpsLeft = player.maxJumps - 1;
      player.spinTimer = 0;
    } else {
      player.jumpsLeft--;
      player.spinTimer = 0.36;
    }

    let jumpPower = 485 + player.weapons.boots * 50;
    if (player.currentRole === 'spring') jumpPower *= 1.18;
    // 蹲伏蓄力大跳！
    if (player.isCrouching && player.crouchTime > 0.25) {
      jumpPower *= 1.28;
      setPlayerEmote('蓄力超级跳!', 1.2);
    }

    player.vy = -jumpPower;
    player.onGround = false;
    player.isCrouching = false;
    player.crouchTime = 0;
    player.landAnimTimer = 0;
    player.coyoteTimer = 0;
    playSfx('jump');

    for (let i = 0; i < 7; i++) {
      particles.push({
        x: player.x,
        y: player.y + 20,
        vx: (Math.random() - 0.5) * 145,
        vy: Math.random() * 60 + 20,
        color: isFirstJump ? '#38b6ff' : '#ffd700',
        life: 0.28
      });
    }
  }
}

// 点击/摸头/戳脸颊/捏蓝鲸大尾巴 的部位差异化桌面宠物互动
const TSUNDERE_LINES = [
  '才不是蓝色大肥鱼!',
  '>///< 别戳啦，在干活了!',
  '再摸要交一碗白米饭!',
  '干活中，拒绝摸鱼指控!',
  '呆毛会被摸乱的 >_<'
];

const CHEEK_POKE_LINES = [
  '>///< 别戳脸颊啦，脸要变圆了!',
  '呜~ 软乎乎也不准乱捏!',
  '>_< 脸蛋不是糯米团子啦!'
];

const TAIL_TICKLE_LINES = [
  '呀！！蓝鲸大尾巴最怕痒啦 >w<!',
  '>///< 不准偷捏我的大尾巴!!',
  '尾巴一甩会把主人拍飞哦 >_<!'
];

function triggerPetHeadpat(zone = 'head') {
  playSfx(zone === 'tail' ? 'boop' : 'pat');
  petAudio.haptic('headpat');
  setNapping(false);
  player.idleTime = 0;

  if (zone === 'tail') {
    player.tsundereTimer = 1.65;
    if (player.onGround && !player.onPalm) {
      player.vy = -255;
      player.onGround = false;
    } else if (player.onPalm) {
      player.palmHopVy = -185;
    }
    const line = TAIL_TICKLE_LINES[Math.floor(Math.random() * TAIL_TICKLE_LINES.length)];
    setPlayerEmote(line, 2.3, 'tsundere', true);
  } else if (zone === 'cheek') {
    player.tsundereTimer = 1.5;
    player.landAnimTimer = 0.16;
    if (player.onPalm) player.palmHopVy = -110;
    const line = CHEEK_POKE_LINES[Math.floor(Math.random() * CHEEK_POKE_LINES.length)];
    setPlayerEmote(line, 2.2, 'tsundere', true);
  } else {
    player.tsundereTimer = 1.45;
    if (player.onGround && !player.onPalm) {
      player.vy = -185;
      player.onGround = false;
    } else if (player.onPalm) {
      player.palmHopVy = -140;
    }
    const line = TSUNDERE_LINES[Math.floor(Math.random() * TSUNDERE_LINES.length)];
    setPlayerEmote(line, 2.2, 'tsundere', true);
  }

  // 傲娇震波推开周围小怪
  for (const e of enemies) {
    const dx = e.x - player.x;
    const dy = e.y - player.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist < 180) {
      e.vx = (dx / dist) * 320;
      e.vy = -220;
      e.hp -= 25;
    }
  }
  spawnInteractVfx(player.x, player.y - 22, 'love', 8);
}

function handleDownPress() {
  const now = performance.now();
  input.down = true;
  // 双击下蹲键可从高处实景台阶跳下
  if (now - lastDownTapTime < 320 && player.onGround && player.standingPlat && !player.standingPlat.isFloor) {
    player.dropThroughTimer = 0.28;
    player.onGround = false;
    player.vy = 90;
    setPlayerEmote('跳下台阶~', 1.0);
  } else if (player.onGround) {
    const roleEmotes = {
      tech: '戳戳这上面是什么~',
      drink: '蹲下来闻闻茶香~',
      spring: '蹲在上面软乎乎~',
      food: '发现好吃的气息!',
      edge: '蹲下悄悄观察~',
      floor: '蹲伏蓄力中...'
    };
    setPlayerEmote(roleEmotes[player.currentRole] || '蹲伏观察~', 1.5);
  }
  lastDownTapTime = now;
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyA' || e.code === 'ArrowLeft') input.left = true;
  if (e.code === 'KeyD' || e.code === 'ArrowRight') input.right = true;
  if (e.code === 'KeyS' || e.code === 'ArrowDown') {
    if (!input.down) handleDownPress();
  }
  if (e.code === 'KeyW' || e.code === 'ArrowUp' || e.code === 'Space') triggerJump();
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'KeyA' || e.code === 'ArrowLeft') input.left = false;
  if (e.code === 'KeyD' || e.code === 'ArrowRight') input.right = false;
  if (e.code === 'KeyS' || e.code === 'ArrowDown') input.down = false;
});

const joyZone = document.getElementById('joystick-zone');
const joyStick = document.getElementById('joystick-stick');
let joyTouchId = null;
let joyStartStage = { x: 0, y: 0 };
let joyUpJumpTriggered = false;

function handleJoyMove(clientX, clientY) {
  const cur = clientToStage(clientX, clientY);
  let dx = cur.x - joyStartStage.x;
  let dy = cur.y - joyStartStage.y;
  const maxR = 40;
  const dist = Math.hypot(dx, dy);
  if (dist > maxR) {
    dx = (dx / dist) * maxR;
    dy = (dy / dist) * maxR;
  }
  joyStick.style.transform = `translate(${dx}px, ${dy}px)`;
  input.joyX = Math.abs(dx) > 6 ? dx / maxR : 0;
  input.joyY = dy / maxR;

  if (vision.mode === 'sim') {
    vision.simTargetCamX = -input.joyX * 24;
  }

  if (input.joyY < -0.52 && !joyUpJumpTriggered) {
    joyUpJumpTriggered = true;
    triggerJump();
  } else if (input.joyY > -0.25) {
    joyUpJumpTriggered = false;
  }
}

function resetJoy() {
  joyTouchId = null;
  joyUpJumpTriggered = false;
  input.joyX = 0;
  input.joyY = 0;
  joyStick.style.transform = 'translate(0px, 0px)';
}

joyZone.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  if (!drawerEl.classList.contains('hidden')) closeDrawer();
  player.idleTime = 0;
  joyTouchId = e.pointerId;
  joyZone.setPointerCapture(e.pointerId);
  joyStartStage = clientToStage(e.clientX, e.clientY);
  handleJoyMove(e.clientX, e.clientY);
});
joyZone.addEventListener('pointermove', (e) => {
  if (e.pointerId === joyTouchId) handleJoyMove(e.clientX, e.clientY);
});
joyZone.addEventListener('pointerup', resetJoy);
joyZone.addEventListener('pointercancel', resetJoy);

document.getElementById('btn-jump').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  if (!drawerEl.classList.contains('hidden')) closeDrawer();
  player.idleTime = 0;
  triggerJump();
});

const btnCrouch = document.getElementById('btn-crouch');
btnCrouch.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  if (!drawerEl.classList.contains('hidden')) closeDrawer();
  player.idleTime = 0;
  btnCrouch.setPointerCapture(e.pointerId);
  handleDownPress();
});
btnCrouch.addEventListener('pointerup', () => {
  input.down = false;
});
btnCrouch.addEventListener('pointercancel', () => {
  input.down = false;
});

// 点击、连续顺毛撸宠、拎起悬空投放 与 亲手喂到嘴边：
// 1. 点到食物可按住拖拽直接喂到 DeepSeek娘 嘴边张嘴吃（亲手投喂额外亲密加成），或放到实景物体上
// 2. 点到玩具球可直接拍球/传球给 DeepSeek娘 触发主宠双人颠球连击
// 3. 点触 DeepSeek娘 支持【摸头呆毛 / 戳脸颊 / 捏蓝鲸尾巴】部位反馈；左右滑动触发【连续顺毛呼噜】；向上拎起可【悬空抓起摆放】！
// 4. 点到其他实景物体则精准锁定并引导她跑过去
const petTouch = {
  active: false,
  pointerId: null,
  mode: 'touch', // 'touch' | 'rub' | 'pickup'
  zone: 'head',
  startX: 0,
  startY: 0,
  lastX: 0,
  lastY: 0,
  lastTime: 0,
  rubAccum: 0,
  rubCombo: 0
};

function spawnTouchRipple(x, y, color = '#ff85b3') {
  touchRipples.push({
    x,
    y,
    startR: 6,
    endR: 34,
    color,
    maxLife: 0.34,
    life: 0.34
  });
}

function classifyHeroTouchZone(pt) {
  const relX = (pt.x - player.x) * (player.facing || 1);
  const relY = pt.y - player.y;
  if (relY < -36) return 'head';
  if (relX < -13 && relY >= -22) return 'tail';
  if (relY < -6) return 'cheek';
  return 'head';
}

canvas.addEventListener('pointerdown', (e) => {
  if (!drawerEl.classList.contains('hidden')) {
    closeDrawer();
  }
  const pt = clientToStage(e.clientX, e.clientY);
  spawnTouchRipple(pt.x, pt.y, '#ff9ec7');

  // 优先检测是否点中场上的玩具球或食物
  for (let i = petItems.length - 1; i >= 0; i--) {
    const it = petItems[i];
    if (Math.hypot(pt.x - it.x, pt.y - (it.y - 14)) < 46) {
      if (it.type === 'ball') {
        // 玩家手拍/传球给 DeepSeek娘！
        it.rallyCount = (it.rallyCount || 0) + 1;
        playSfx(it.toyId === 'duck' ? 'quack' : 'bounce', it.rallyCount);
        petAudio.haptic('finger_boop');
        const dirToHero = Math.sign(player.x - it.x) || 1;
        it.vx = (player.x - it.x) * 1.35 + dirToHero * 45;
        it.vy = -410 - Math.min(120, it.rallyCount * 15);
        it.squashTimer = 0.18;
        it.life = 14;
        spawnInteractVfx(it.x, it.y - 16, 'sparkle', 6);
        floatingTexts.push({
          x: it.x,
          y: it.y - 28,
          vx: 0,
          vy: -55,
          text: `传球 x${it.rallyCount}!`,
          color: '#00f3ff',
          scale: 1.08,
          life: 0.65
        });
        if (it.rallyCount >= 3) completeWish('play_rally');
        return;
      } else {
        // 按住拖拽食物：既可直接喂到 DeepSeek娘 嘴边，也可放到任意实景平台！
        draggedItem = it;
        it.vx = 0;
        it.vy = 0;
        setNapping(false);
        setPlayerEmote('主人拿起了好吃的！快喂到我嘴边~ 啊——', 2.0, 'eat');
        return;
      }
    }
  }

    if (Math.hypot(pt.x - player.x, pt.y - (player.y - 22)) < 64) {
    const zone = classifyHeroTouchZone(pt);
    petTouch.active = true;
    petTouch.pointerId = e.pointerId;
    petTouch.mode = 'touch';
    petTouch.zone = zone;
    petTouch.startX = pt.x;
    petTouch.startY = pt.y;
    petTouch.lastX = pt.x;
    petTouch.lastY = pt.y;
    petTouch.lastTime = performance.now();
    petTouch.rubAccum = 0;
    petTouch.rubCombo = 0;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (err) {}

    triggerPetHeadpat(zone);
    const baseXp = zone === 'tail' ? 11 : zone === 'cheek' ? 9 : 8;
    const xpGain = player.equipped.bow ? baseXp * 2 : baseXp;
    const zoneTag = zone === 'tail' ? '捏大尾巴' : zone === 'cheek' ? '戳脸颊' : '摸摸头';
    addAffectionXp(xpGain, `+${xpGain} 亲密 ${zoneTag}`);
    completeWish('headpat');
    return;
  }

  // 检测是否点击或按住拖拽桌面上的 AR 微缩家具（小夜灯 / 码农工位 / 猫爬架）
  if (gameMode === 'pet') {
    for (let i = furnitureList.length - 1; i >= 0; i--) {
      const furn = furnitureList[i];
      if (Math.hypot(pt.x - furn.x, pt.y - (furn.y - 34)) < 52) {
        draggedFurniture = furn;
        furn.dragStartX = pt.x;
        furn.dragStartY = pt.y;
        furn.movedDist = 0;
        furn.squashTimer = 0.2;
        return;
      }
    }
  }

  // 点击实景物体：锁定并引导她跑过去互动
  vision.pinTargetAt(pt.x, pt.y, W, H);
  spawnInteractVfx(pt.x, pt.y, 'sparkle', 5);
  if (gameMode === 'pet') {
    setNapping(false);
    player.wanderTargetX = Math.max(W * 0.12, Math.min(W * 0.88, pt.x));
    player.idleTime = 0;
    if (pt.y < player.y - 36) triggerJump();
    setPlayerEmote('收到召唤，跑过去看看~', 1.5, 'happy');
  } else {
    placeStarOnBestTarget();
    setPlayerEmote('已精准锁定该目标!', 1.5);
    playSfx('star');
  }
});

canvas.addEventListener('pointermove', (e) => {
  if (draggedFurniture) {
    const pt = clientToStage(e.clientX, e.clientY);
    draggedFurniture.movedDist += Math.hypot(pt.x - draggedFurniture.x, pt.y - draggedFurniture.y);
    draggedFurniture.x = Math.max(48, Math.min(W - 48, pt.x));
    draggedFurniture.y = Math.max(85, Math.min(H * 0.78, pt.y));
    draggedFurniture.vy = 0;
    return;
  }

  if (draggedItem) {
    const pt = clientToStage(e.clientX, e.clientY);
    draggedItem.x = Math.max(36, Math.min(W - 36, pt.x));
    draggedItem.y = Math.max(40, Math.min(H * 0.78, pt.y));
    draggedItem.vx = 0;
    draggedItem.vy = 0;
    return;
  }

  if (!petTouch.active || e.pointerId !== petTouch.pointerId) return;
  const pt = clientToStage(e.clientX, e.clientY);
  const now = performance.now();
  const dtMs = Math.max(8, now - petTouch.lastTime);
  const stepDx = pt.x - petTouch.lastX;
  const stepDy = pt.y - petTouch.lastY;
  const totalDx = pt.x - petTouch.startX;
  const totalDy = pt.y - petTouch.startY;
  petTouch.lastX = pt.x;
  petTouch.lastY = pt.y;
  petTouch.lastTime = now;

  // 若向上提起超过 36px 或拖离角色原位置超过 68px -> 进入「拎起桌宠悬空摆放」模式！
  if (
    petTouch.mode !== 'pickup' &&
    (totalDy < -36 || Math.hypot(pt.x - player.x, pt.y - (player.y - 20)) > 68)
  ) {
    petTouch.mode = 'pickup';
    player.isPickedUp = true;
    player.palmState = 'none';
    player.onPalm = false;
    player.climbState = 'none';
    player.onGround = false;
    player.rubbingTimer = 0;
    setNapping(false);
    playSfx('pickup');
    petAudio.haptic('pickup');
    setPlayerEmote('哇啊啊！被主人拎起来飞咯 >_<', 2.2, 'tsundere', true);
  }

  if (petTouch.mode === 'pickup') {
    const instVx = (stepDx / dtMs) * 1000;
    const instVy = (stepDy / dtMs) * 1000;
    player.dragVx = player.dragVx * 0.6 + instVx * 0.4;
    player.dragVy = player.dragVy * 0.6 + instVy * 0.4;
    player.x = Math.max(30, Math.min(W - 30, pt.x));
    player.y = Math.max(44, Math.min(H * 0.82 - 25, pt.y + 22));
    player.vx = 0;
    player.vy = 0;
    if (Math.abs(player.dragVx) > 35) {
      player.facing = player.dragVx > 0 ? 1 : -1;
    }
    return;
  }

  // 在角色头部/身体区域左右轻柔滑动 -> 触发「连续顺毛呼噜」深度互动！
  if (Math.abs(stepDx) > 1.2) {
    petTouch.mode = 'rub';
    petTouch.rubAccum += Math.abs(stepDx);
    player.rubbingTimer = 0.32;
    player.tsundereTimer = 0;
    player.rubOffsetX = Math.max(-24, Math.min(24, (pt.x - player.x) * (player.facing || 1)));
    player.idleTime = 0;

    if (petTouch.rubAccum >= 44) {
      petTouch.rubAccum = 0;
      petTouch.rubCombo++;
      playSfx('purr', petTouch.rubCombo);
      petAudio.haptic('purr');
      spawnInteractVfx(player.x, player.y - 34, 'purr', 5);

      const purrLines = [
        '>///< 呜…顺毛手法还挺舒服的嘛…',
        '呼噜呼噜~ 再多摸一会儿嘛 ',
        '^w^ 好舒服~ 呆毛都开心得晃起来啦 ',
        '最喜欢主人温柔摸头啦 >w<'
      ];
      const msg = purrLines[Math.min(purrLines.length - 1, Math.floor((petTouch.rubCombo - 1) / 2))];
      setPlayerEmote(msg, 1.9, 'happy', petTouch.rubCombo === 2);

      const bonusXp = player.equipped.bow ? 12 : 6;
      addAffectionXp(bonusXp, `顺毛 x${petTouch.rubCombo} +${bonusXp}`);
      if (petTouch.rubCombo % 3 === 0) {
        addCoins(6, player.x, player.y - 42, '顺毛呼噜 ');
      }
    }
  }
});

function finishCanvasTouch() {
  if (draggedFurniture) {
    const furn = draggedFurniture;
    draggedFurniture = null;
    furn.squashTimer = 0.2;
    if (player.placedFurniture && player.placedFurniture[furn.key]) {
      player.placedFurniture[furn.key].xRatio = furn.x / Math.max(1, W);
    }
    // 轻点家具（未大幅拖动）触发专属家具互动！
    if ((furn.movedDist || 0) < 18) {
      if (furn.key === 'lamp') {
        furn.manualOn = !furn.manualOn;
        if (player.placedFurniture[furn.key]) {
          player.placedFurniture[furn.key].manualOn = furn.manualOn;
        }
        playSfx('star');
        spawnInteractVfx(furn.x, furn.y - 42, 'sparkle', 7);
        setPlayerEmote(
          furn.manualOn ? '星海蓝鲸小夜灯点亮啦~ 暖洋洋 ' : '小夜灯已调为环境光自动感应模式~',
          2.0,
          'happy'
        );
      } else if (furn.key === 'pc') {
        setNapping(false);
        player.wanderTargetX = furn.x;
        player.idleTime = 0;
        playSfx('boop');
        setPlayerEmote('收到！马上到码农工位写代码赚金币咯~', 2.0, 'happy', true);
      } else if (furn.key === 'tree') {
        setNapping(false);
        player.wanderTargetX = furn.x;
        if (player.onGround) triggerJump();
        setPlayerEmote('跳上蓝鲸猫爬架软垫咯~', 1.8, 'happy');
      }
    }
    savePetState();
  }
  if (draggedItem) {
    draggedItem.squashTimer = 0.2;
    draggedItem = null;
  }
  if (petTouch.active) {
    if (petTouch.mode === 'pickup' && player.isPickedUp) {
      player.isPickedUp = false;
      const palm = vision.palmTarget;
      // 若直接把 DeepSeek娘 拖放到镜头中的手掌上松手，立即稳稳落入掌心！
      if (palm && palm.active && Math.hypot(player.x - palm.x, player.y - (palm.surfaceY - 25)) < 95) {
        player.palmState = 'on_palm';
        player.onPalm = true;
        player.onGround = true;
        player.vx = 0;
        player.vy = 0;
        player.landAnimTimer = 0.16;
        player.happyTimer = 2.0;
        playSfx('pat');
        petAudio.haptic('palm_land');
        spawnInteractVfx(player.x, player.y - 16, 'love', 10);
        setPlayerEmote('^w^ 被主人亲手放到掌心里啦~ ', 2.2, 'happy', true);
        completeWish('palm_hold');
      } else {
        player.vx = Math.max(-340, Math.min(340, player.dragVx * 0.42));
        player.vy = Math.max(-420, Math.min(180, player.dragVy * 0.36 - 95));
        player.onGround = false;
        setPlayerEmote('嘿咻~ 安全着陆!', 1.4, 'happy');
      }
      player.dragVx = 0;
      player.dragVy = 0;
    }
    petTouch.active = false;
    petTouch.pointerId = null;
    petTouch.mode = 'touch';
  }
}

window.addEventListener('pointerup', finishCanvasTouch);
window.addEventListener('pointercancel', finishCanvasTouch);

// ================= 喂食食堂 & 鲸鱼小铺（商店模块） =================
const FOOD_CATALOG = [
  {
    id: 'rice',
    ico: '',
    img: './assets/food_rice.webp?v=hd2',
    name: '大碗白米饭',
    desc: '饱食+25 · 亲密+18',
    price: 0,
    hunger: 25,
    xp: 18,
    hp: 15,
    buffMult: 1,
    buffSec: 0,
    emote: '白米饭最香啦 ^w^!'
  },
  {
    id: 'tea',
    ico: '',
    img: './assets/food_tea.webp?v=hd2',
    name: '冰镇乌龙茶',
    desc: '饱食+20 · 体力+40',
    price: 15,
    hunger: 20,
    xp: 28,
    hp: 40,
    buffMult: 1.2,
    buffSec: 45,
    emote: '吨吨吨~ 清爽回神!'
  },
  {
    id: 'bento',
    ico: '',
    img: './assets/food_bento.webp?v=hd2',
    name: '黄金炸虾便当',
    desc: '饱食+50 · 打工收益x1.5',
    price: 35,
    hunger: 50,
    xp: 52,
    hp: 50,
    buffMult: 1.5,
    buffSec: 60,
    emote: '哇！豪华炸虾便当!!'
  },
  {
    id: 'cake',
    ico: '',
    img: './assets/food_cake.webp?v=hd2',
    name: '海盐芝士蛋糕',
    desc: '全状态恢复 · 打工x2.0',
    price: 60,
    hunger: 75,
    xp: 95,
    hp: 100,
    buffMult: 2.0,
    buffSec: 90,
    emote: '幸福感爆棚 >w< '
  }
];

const DRESS_CATALOG = [
  {
    id: 'furn_lamp',
    isFurniture: true,
    furnKey: 'lamp',
    ico: '',
    img: './assets/furn_lamp.webp?v=hd4',
    name: '星海感应小夜灯',
    desc: '暗光自动点亮 · 亲密+25% · 可拖拽',
    price: 45
  },
  {
    id: 'furn_pc',
    isFurniture: true,
    furnKey: 'pc',
    ico: '',
    img: './assets/furn_pc.webp?v=hd4',
    name: '深海码农工位',
    desc: '摆在桌面 · 自动敲代码持续产金币',
    price: 55
  },
  {
    id: 'furn_tree',
    isFurniture: true,
    furnKey: 'tree',
    ico: '',
    img: './assets/furn_tree.webp?v=hd4',
    name: '蓝鲸云端猫爬架',
    desc: '摆在桌面 · 真实可攀爬双层跳台',
    price: 65
  },
  {
    id: 'toy_yarn',
    isToy: true,
    toyKey: 'yarn',
    ico: '',
    img: './assets/toy_yarn.webp?v=hd2',
    name: '猫薄荷毛线球',
    desc: '彩虹尾迹 · 追球移速+35%',
    price: 65
  },
  {
    id: 'toy_duck',
    isToy: true,
    toyKey: 'duck',
    ico: '',
    img: './assets/toy_duck.webp?v=hd2',
    name: '水手小黄鸭',
    desc: '嘎嘎音波 · 弹跳震飞小怪',
    price: 95
  },
  {
    id: 'cushion',
    ico: '',
    img: './assets/prop_cushion.webp?v=hd2',
    name: '蓝鲸软垫窝',
    desc: '休息时铺垫 · 回血加速',
    price: 80
  },
  {
    id: 'bow',
    ico: '',
    img: './assets/item_bow.webp?v=hd6',
    name: '樱粉蝴蝶结',
    desc: '头顶发饰 · 摸头亲密翻倍',
    price: 100
  },
  {
    id: 'crown',
    ico: '',
    img: './assets/item_crown.webp?v=hd6',
    name: '迷你小皇冠',
    desc: '头顶皇冠 · 打工金币+25%',
    price: 140
  },
  {
    id: 'aura',
    ico: '',
    img: './assets/item_aura.webp?v=hd6',
    name: '星光光环',
    desc: '足底光阵 · 全屏吸金币',
    price: 220
  }
];

const UPGRADE_CATALOG = [
  {
    id: 'blaster',
    ico: '',
    img: './assets/upg_blaster.webp?v=hd6',
    name: '水弹连发',
    desc: '提升幸存者水弹威力与弹道',
    basePrice: 40
  },
  {
    id: 'teaBlade',
    ico: '',
    img: './assets/upg_blade.webp?v=hd6',
    name: '茶刃护体',
    desc: '增加环绕飞叶数量与伤害',
    basePrice: 45
  },
  {
    id: 'magnet',
    ico: '',
    img: './assets/upg_magnet.webp?v=hd6',
    name: '招财磁铁',
    desc: '幸存者爆金币收益+15%/级',
    basePrice: 50
  },
  {
    id: 'boots',
    ico: '',
    img: './assets/upg_boots.webp?v=hd6',
    name: '轻巧跑鞋',
    desc: '提升移动速度与连跳次数',
    basePrice: 55
  }
];

const careBarEl = document.getElementById('pet-care-bar');
const drawerEl = document.getElementById('pet-drawer');
const drawerItemsEl = document.getElementById('drawer-items');
let activeDrawerTab = 'food';

function openDrawer(tab) {
  activeDrawerTab = tab;
  drawerEl.classList.remove('hidden');
  document.querySelectorAll('.drawer-tab').forEach((t) => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });
  document.getElementById('btn-feed').classList.toggle('active', tab === 'food');
  document.getElementById('btn-shop').classList.toggle('active', tab !== 'food');
  renderDrawerItems();
}

function closeDrawer() {
  drawerEl.classList.add('hidden');
  document.getElementById('btn-feed').classList.remove('active');
  document.getElementById('btn-shop').classList.remove('active');
}

function setNapping(napState) {
  player.isNapping = napState;
  const napBtn = document.getElementById('btn-nap');
  const napLabel = document.getElementById('btn-nap-label');
  if (napBtn) napBtn.classList.toggle('active', napState);
  if (napLabel) napLabel.textContent = napState ? '唤醒' : '小憩';
}

function toggleDrawer(tab) {
  if (!drawerEl.classList.contains('hidden') && activeDrawerTab === tab) {
    closeDrawer();
  } else {
    openDrawer(tab);
  }
}

document.getElementById('btn-drawer-close')?.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  e.stopPropagation();
  closeDrawer();
});

// 阻止在抽屉内部滑动或点击空白处穿透到画布
drawerEl.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
});

function bindCardTap(card, callback) {
  let startX = 0;
  let startY = 0;
  let isDown = false;
  card.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    startX = e.clientX;
    startY = e.clientY;
    isDown = true;
  });
  card.addEventListener('pointerup', (e) => {
    e.stopPropagation();
    if (!isDown) return;
    isDown = false;
    if (Math.hypot(e.clientX - startX, e.clientY - startY) < 14) {
      callback();
    }
  });
  card.addEventListener('pointercancel', () => {
    isDown = false;
  });
}

function spawnFoodDrop(foodSpec) {
  playSfx('star');
  const offset = (Math.random() > 0.5 ? 1 : -1) * (45 + Math.random() * 60);
  const dropX = Math.max(W * 0.2, Math.min(W * 0.8, player.x + offset));
  petItems.push({
    type: 'food',
    foodId: foodSpec.id,
    foodSpec,
    x: dropX,
    y: H * 0.16,
    vx: 0,
    vy: 60,
    bounces: 0,
    life: 16
  });
  // 唤醒宠物并立即朝新投喂的食物跑过去
  setNapping(false);
  player.idleTime = 0;
  player.petAction = 'idle';
  player.recenterDelay = 0;
  player.wanderTargetX = dropX;
  setPlayerEmote(`看到${foodSpec.name}啦!`, 1.6);
}

function renderThumbHtml(item) {
  if (item.img) {
    return `<div class="shop-thumb-wrap"><img src="${item.img}" alt="" class="shop-thumb" /></div>`;
  }
  return `<div class="shop-thumb-wrap"><span class="shop-ico">${item.ico}</span></div>`;
}

function renderDrawerItems() {
  drawerItemsEl.innerHTML = '';
  if (activeDrawerTab === 'food') {
    for (const item of FOOD_CATALOG) {
      const card = document.createElement('button');
      card.className = 'shop-card';
      const priceLabel =
        item.price === 0
          ? '免费投喂'
          : `${item.price} <img src="./assets/ui_coin.webp?v=hd6" alt="" class="inline-coin-ico" />`;
      card.innerHTML = `
        ${renderThumbHtml(item)}
        <div class="shop-info">
          <span class="shop-name">${item.name}</span>
          <span class="shop-desc">${item.desc}</span>
        </div>
        <span class="shop-price">${priceLabel}</span>
      `;
      bindCardTap(card, () => {
        if (player.coins < item.price) {
          setPlayerEmote('金币不够啦，去『幸存者打工』赚金币吧!', 2.2);
          return;
        }
        if (item.price > 0) {
          player.coins -= item.price;
          savePetState();
        }
        spawnFoodDrop(item);
        closeDrawer();
      });
      drawerItemsEl.appendChild(card);
    }
  } else if (activeDrawerTab === 'dress') {
    for (const item of DRESS_CATALOG) {
      const owned = !!player.ownedDress[item.id];
      const equipped = item.isFurniture
        ? !!(player.placedFurniture && player.placedFurniture[item.furnKey])
        : item.isToy
          ? player.activeToy === item.toyKey
          : !!player.equipped[item.id];
      const card = document.createElement('button');
      card.className = `shop-card ${owned ? 'owned' : ''}`;
      const statusText = owned
        ? equipped
          ? '已摆放/穿戴'
          : '可摆放/切换'
        : `${item.price} <img src="./assets/ui_coin.webp?v=hd6" alt="" class="inline-coin-ico" />`;
      card.innerHTML = `
        ${renderThumbHtml(item)}
        <div class="shop-info">
          <span class="shop-name">${item.name}</span>
          <span class="shop-desc">${item.desc}</span>
        </div>
        <span class="shop-price">${statusText}</span>
      `;
      bindCardTap(card, () => {
        if (!owned) {
          if (player.coins < item.price) {
            setPlayerEmote('金币不足，快去『幸存者』或『接美食』赚金币~', 2.2);
            return;
          }
          player.coins -= item.price;
          player.ownedDress[item.id] = true;
          if (item.isFurniture) {
            player.placedFurniture[item.furnKey] = {
              xRatio: item.furnKey === 'pc' ? 0.74 : item.furnKey === 'tree' ? 0.32 : 0.24,
              manualOn: true
            };
            syncPlacedFurniture();
          } else if (item.isToy) {
            player.activeToy = item.toyKey;
            updateToyBtnLabel();
          } else {
            player.equipped[item.id] = true;
          }
          playSfx('star');
          player.happyTimer = 1.8;
          addAffectionXp(35, `${item.ico} 新礼物 +35 亲密`);
          setPlayerEmote(`收到${item.name}啦，可以拖到桌面任意位置摆放哦 ^w^`, 2.4, 'happy', true);
        } else {
          if (item.isFurniture) {
            if (player.placedFurniture[item.furnKey]) {
              delete player.placedFurniture[item.furnKey];
              setPlayerEmote(`已将 ${item.name} 收回背包`, 1.5);
            } else {
              player.placedFurniture[item.furnKey] = {
                xRatio: item.furnKey === 'pc' ? 0.74 : item.furnKey === 'tree' ? 0.32 : 0.24,
                manualOn: true
              };
              setPlayerEmote(`已在桌面摆放 ${item.name}（可按住拖拽位置）!`, 1.8, 'happy');
            }
            syncPlacedFurniture();
            playSfx('pat');
          } else if (item.isToy) {
            player.activeToy = player.activeToy === item.toyKey ? 'whale' : item.toyKey;
            updateToyBtnLabel();
            playSfx('pat');
            setPlayerEmote(`已切换玩具：${player.activeToy === 'whale' ? '蓝鲸沙滩球' : item.name}`, 1.5);
          } else {
            player.equipped[item.id] = !player.equipped[item.id];
            playSfx('pat');
            setPlayerEmote(
              player.equipped[item.id] ? `已穿戴 ${item.name}!` : `已收起 ${item.name}`,
              1.5
            );
          }
        }
        savePetState();
        renderDrawerItems();
      });
      drawerItemsEl.appendChild(card);
    }
  } else if (activeDrawerTab === 'upgrade') {
    for (const item of UPGRADE_CATALOG) {
      const lv = player.weapons[item.id] || 0;
      const cost = Math.round(item.basePrice * Math.pow(1.45, lv));
      const card = document.createElement('button');
      card.className = 'shop-card';
      card.innerHTML = `
        ${renderThumbHtml(item)}
        <div class="shop-info">
          <span class="shop-name">${item.name} Lv.${lv}</span>
          <span class="shop-desc">${item.desc}</span>
        </div>
        <span class="shop-price">${cost} <img src="./assets/ui_coin.webp?v=hd6" alt="" class="inline-coin-ico" /></span>
      `;
      bindCardTap(card, () => {
        if (player.coins < cost) {
          setPlayerEmote('金币不够升级，先去『幸存者』赚一波吧!', 2.2);
          return;
        }
        player.coins -= cost;
        player.weapons[item.id] = lv + 1;
        player.maxJumps = 3 + (player.weapons.boots > 0 ? 1 : 0);
        playSfx('star');
        player.proudTimer = 1.4;
        setPlayerEmote(`${item.name}升到 Lv.${lv + 1}！打工更猛了!`, 2.0);
        savePetState();
        renderDrawerItems();
      });
      drawerItemsEl.appendChild(card);
    }
  }
}

document.querySelectorAll('.drawer-tab').forEach((tabBtn) => {
  tabBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleDrawer(tabBtn.dataset.tab);
  });
});

// 顶部三模式切换（🐾 养成 | ⭐ 摘星 | ⚔️ 幸存者赚金币）
const wishPillEl = document.getElementById('hud-wish-pill');
function switchMode(newMode) {
  if (!newMode) return;
  gameMode = newMode;
  vision.activeGameMode = newMode;
  document.querySelectorAll('.mode-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.mode === newMode);
  });
  closeDrawer();

  // 切换模式时清理挂起状态，保证动作瞬间响应不卡顿
  setNapping(false);
  cancelRpsGame();
  cancelPalmCatchGame();
  player.idleTime = 0;
  player.petAction = 'idle';
  player.eatingTimer = 0;
  player.isCrouching = false;
  player.crouchTime = 0;
  player.wanderTargetX = null;
  player.recenterDelay = 0;

  if (gameMode === 'pet') {
    enemies.length = 0;
    bullets.length = 0;
    starTarget.active = false;
    careBarEl.style.display = 'flex';
    if (wishPillEl) wishPillEl.style.display = 'inline-flex';
    setPlayerEmote('回到日常桌面养成模式~', 1.8);
  } else if (gameMode === 'parkour') {
    enemies.length = 0;
    bullets.length = 0;
    careBarEl.style.display = 'none';
    if (wishPillEl) wishPillEl.style.display = 'none';
    placeStarOnBestTarget();
    setPlayerEmote('⭐ 跳上实景物体摘星拿赏金!', 1.8);
  } else if (gameMode === 'survivor') {
    careBarEl.style.display = 'none';
    if (wishPillEl) wishPillEl.style.display = 'none';
    enemySpawnTimer = 0.15;
    placeStarOnBestTarget();
    setPlayerEmote('开启幸存者打工！打怪爆金币咯~', 2.0);
  }
}

document.querySelectorAll('.mode-btn').forEach((btn) => {
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    switchMode(btn.dataset.mode);
  });
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (gameMode !== btn.dataset.mode) switchMode(btn.dataset.mode);
  });
});

// 点击左上角头像环可随时触发摸头互动
document.getElementById('hud-avatar-btn')?.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (!drawerEl.classList.contains('hidden')) closeDrawer();
  triggerPetHeadpat();
  const xpGain = player.equipped.bow ? 16 : 8;
  addAffectionXp(xpGain, `+${xpGain} 亲密 摸头`);
  completeWish('headpat');
});

// 右上角 BGM / 角色语音一键静音开关
const btnSoundToggle = document.getElementById('btn-sound-toggle');
if (btnSoundToggle) {
  btnSoundToggle.classList.toggle('muted', petAudio.muted);
  btnSoundToggle.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const soundOn = petAudio.toggleMute();
    btnSoundToggle.classList.toggle('muted', !soundOn);
    setPlayerEmote(
      soundOn ? '八音盒 BGM 与少女语音已开启~' : '已切换为静音模式',
      1.6,
      soundOn ? 'happy' : null
    );
  });
}

// ================= AR 拍立得纪念合影系统（比耶✌️手势或右上角相机键触发） =================
const shutterFlashEl = document.getElementById('shutter-flash');
const polaroidCardEl = document.getElementById('polaroid-card');
const polaroidImgEl = document.getElementById('polaroid-img');
let photoAutoCooldown = 0;
let pendingPhotoSnapTimer = 0;
let polaroidHideTimer = null;
let latestPolaroidUrl = '';

polaroidCardEl?.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
});

function triggerPolaroidSequence(fromGesture = false) {
  if (pendingPhotoSnapTimer > 0) return;
  if (!drawerEl.classList.contains('hidden')) closeDrawer();
  setNapping(false);
  cancelRpsGame();
  cancelPalmCatchGame();
  photoAutoCooldown = 4.6;
  player.photoPoseTimer = 1.75;
  player.happyTimer = 1.8;
  player.idleTime = 0;
  pendingPhotoSnapTimer = 0.24; // 先让角色摆出比耶眨眼 Pose 渲染上屏，0.24秒后咔嚓定格！
  setPlayerEmote(
    fromGesture ? '看到主人比耶啦！一、二、茄子~' : '准备拍纪念照咯！茄子~ ',
    1.8,
    'happy'
  );
}

function captureArPolaroid() {
  const pw = 640;
  const ph = 468;
  const fx = 24;
  const fy = 22;
  const fw = 592;
  const fh = 356;

  const pCanvas = document.createElement('canvas');
  pCanvas.width = pw;
  pCanvas.height = ph;
  const pCtx = pCanvas.getContext('2d');

  // 1. 奶白拍立得相纸底板与柔和边框
  pCtx.fillStyle = '#fffdf8';
  pCtx.fillRect(0, 0, pw, ph);

  // 2. 合成对齐后的实景摄像头画面（或模拟星空桌面背景）
  const vidScratch = document.createElement('canvas');
  vidScratch.width = fw;
  vidScratch.height = fh;
  const vidCtx = vidScratch.getContext('2d');
  const drewVideo = vision.drawAlignedVideoTo(vidCtx, fw, fh);

  pCtx.save();
  pCtx.beginPath();
  if (typeof pCtx.roundRect === 'function') {
    pCtx.roundRect(fx, fy, fw, fh, 12);
  } else {
    pCtx.rect(fx, fy, fw, fh);
  }
  pCtx.clip();

  if (drewVideo) {
    pCtx.drawImage(vidScratch, fx, fy, fw, fh);
  } else if (vision.simBgImg && vision.simBgImg.complete && vision.simBgImg.naturalWidth > 0) {
    pCtx.drawImage(vision.simBgImg, fx, fy, fw, fh);
  } else {
    const grad = pCtx.createLinearGradient(fx, fy, fx, fy + fh);
    grad.addColorStop(0, '#dff2ff');
    grad.addColorStop(0.55, '#fff8ec');
    grad.addColorStop(1, '#d4a373');
    pCtx.fillStyle = grad;
    pCtx.fillRect(fx, fy, fw, fh);
  }

  // 3. 叠加当前高清角色、爱心粒子与漂浮互动画面
  pCtx.drawImage(canvas, fx, fy, fw, fh);
  pCtx.restore();

  pCtx.strokeStyle = 'rgba(30, 52, 92, 0.14)';
  pCtx.lineWidth = 2;
  pCtx.strokeRect(fx, fy, fw, fh);

  // 4. 底部纪念签名与亲密度印章
  const nowDate = new Date();
  const pad2 = (n) => String(n).padStart(2, '0');
  const dateStr = `${nowDate.getFullYear()}.${pad2(nowDate.getMonth() + 1)}.${pad2(nowDate.getDate())} ${pad2(nowDate.getHours())}:${pad2(nowDate.getMinutes())}`;

  pCtx.fillStyle = '#1d3258';
  pCtx.font = '900 20px -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif';
  pCtx.textAlign = 'left';
  pCtx.fillText('DeepSeek娘 · AR 纪念拍立得', fx + 4, fy + fh + 36);

  pCtx.fillStyle = '#7385a6';
  pCtx.font = '700 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  pCtx.fillText(`AR Desktop Pet Memory · ${dateStr}`, fx + 6, fy + fh + 60);

  // 右下角粉色亲密等级印章胶囊
  const stampText = `亲密 LV.${player.level}`;
  pCtx.fillStyle = '#ffe5f0';
  pCtx.strokeStyle = '#ff7eb3';
  pCtx.lineWidth = 2;
  pCtx.beginPath();
  if (typeof pCtx.roundRect === 'function') {
    pCtx.roundRect(pw - 166, fy + fh + 20, 142, 38, 19);
  } else {
    pCtx.rect(pw - 166, fy + fh + 20, 142, 38);
  }
  pCtx.fill();
  pCtx.stroke();

  pCtx.fillStyle = '#e03177';
  pCtx.font = '900 15px -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif';
  pCtx.textAlign = 'center';
  pCtx.fillText(stampText, pw - 95, fy + fh + 44);

  latestPolaroidUrl = pCanvas.toDataURL('image/png');
  if (polaroidImgEl) polaroidImgEl.src = latestPolaroidUrl;
  if (polaroidCardEl) {
    polaroidCardEl.classList.remove('hidden');
    if (polaroidHideTimer) clearTimeout(polaroidHideTimer);
    polaroidHideTimer = setTimeout(() => {
      polaroidCardEl.classList.add('hidden');
    }, 9500);
  }

  if (shutterFlashEl) {
    shutterFlashEl.classList.add('flash');
    setTimeout(() => shutterFlashEl.classList.remove('flash'), 90);
  }

  playSfx('shutter');
  petAudio.haptic('shutter');
  for (let i = 0; i < 12; i++) {
    particles.push({
      x: player.x + (Math.random() - 0.5) * 44,
      y: player.y - 18,
      vx: (Math.random() - 0.5) * 190,
      vy: -70 - Math.random() * 110,
      color: i % 2 === 0 ? '#ffd700' : '#ff85b3',
      life: 0.55
    });
  }
  addAffectionXp(20, '纪念合影 +20 亲密');
  setPlayerEmote('咔嚓！拍得超可爱 ^w^ ', 2.4, 'cheer', true);
  completeWish('take_photo');
}

document.getElementById('btn-photo-snap')?.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  e.stopPropagation();
  triggerPolaroidSequence(false);
});

document.getElementById('btn-polaroid-close')?.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  e.stopPropagation();
  polaroidCardEl?.classList.add('hidden');
});

document.getElementById('btn-polaroid-save')?.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (!latestPolaroidUrl) return;
  const link = document.createElement('a');
  link.href = latestPolaroidUrl;
  link.download = `deepseek-ar-polaroid-${Date.now()}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  playSfx('star');
  setPlayerEmote('相片已保存到主人的相册下载啦~', 2.0, 'happy');
});

// ================= 实景石头剪刀布（猜拳）小游戏（握拳✊手势或底部猜拳键触发） =================
const rpsHudEl = document.getElementById('rps-hud');
const rpsStatusEl = document.getElementById('rps-status-text');
const rpsChoiceBtns = Array.from(document.querySelectorAll('.rps-choice-btn'));
const RPS_LABELS = { rock: '石头', scissors: '剪刀', paper: '布' };

const rpsGame = {
  active: false,
  timer: 0,
  lastTickSec: 4,
  lockedMove: null,
  cooldown: 0,
  hideTimer: null
};

rpsHudEl?.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
});

function highlightRpsChoice(move) {
  for (const btn of rpsChoiceBtns) {
    btn.classList.toggle('detected', btn.dataset.rps === move);
  }
}

function cancelRpsGame() {
  rpsGame.active = false;
  player.rpsPoseTimer = 0;
  if (rpsGame.hideTimer) {
    clearTimeout(rpsGame.hideTimer);
    rpsGame.hideTimer = null;
  }
  rpsHudEl?.classList.add('hidden');
  document.getElementById('btn-rps')?.classList.remove('active');
}

function startRpsGame(fromGesture = false) {
  if (rpsGame.active) {
    cancelRpsGame();
    return;
  }
  if (!drawerEl.classList.contains('hidden')) closeDrawer();
  if (gameMode !== 'pet') switchMode('pet');
  setNapping(false);

  if (rpsGame.hideTimer) {
    clearTimeout(rpsGame.hideTimer);
    rpsGame.hideTimer = null;
  }

  rpsGame.active = true;
  rpsGame.timer = 2.55;
  rpsGame.lastTickSec = 4;
  rpsGame.lockedMove = null;
  rpsGame.cooldown = 4.2;
  player.rpsPoseTimer = 2.65;
  player.idleTime = 0;

  highlightRpsChoice(null);
  rpsHudEl?.classList.remove('hidden');
  document.getElementById('btn-rps')?.classList.add('active');
  if (rpsStatusEl) {
    rpsStatusEl.textContent = '对镜头伸出手势出拳（或点击按钮）！倒计时 3';
  }
  playSfx('rps_tick', 1);
  setPlayerEmote(
    fromGesture ? '收到猜拳挑战！石头剪刀布~' : '石头剪刀布！准备出拳咯~',
    2.2,
    'happy',
    true
  );
}

function resolveRpsRound(userMove) {
  rpsGame.active = false;
  rpsGame.cooldown = 3.6;
  document.getElementById('btn-rps')?.classList.remove('active');
  highlightRpsChoice(userMove);

  const moves = ['rock', 'scissors', 'paper'];
  const petMove = moves[Math.floor(Math.random() * moves.length)];
  const winsAgainst = { rock: 'scissors', scissors: 'paper', paper: 'rock' };

  let banner = '';
  if (userMove === petMove) {
    banner = `你出 ${RPS_LABELS[userMove]} vs DeepSeek娘 ${RPS_LABELS[petMove]} · 心有灵犀平局!`;
    player.happyTimer = 1.7;
    playSfx('pat');
    petAudio.haptic('tap');
    addCoins(8, player.x, player.y - 36, '默契 ');
    addAffectionXp(15, '心有灵犀 +15 亲密');
    setPlayerEmote(`^w^ 我也是${RPS_LABELS[petMove]}！和主人超有默契~`, 2.4, 'happy', true);
  } else if (winsAgainst[userMove] === petMove) {
    banner = `你出 ${RPS_LABELS[userMove]} vs DeepSeek娘 ${RPS_LABELS[petMove]} · 主人获胜 `;
    player.tsundereTimer = 1.7;
    playSfx('star');
    petAudio.haptic('win');
    addCoins(18, player.x, player.y - 36, '猜拳胜 ');
    addAffectionXp(24, '猜拳获胜 +24 亲密');
    setPlayerEmote(`呜~ 我出${RPS_LABELS[petMove]}输啦，主人好厉害!`, 2.5, 'tsundere', true);
  } else {
    banner = `你出 ${RPS_LABELS[userMove]} vs DeepSeek娘 ${RPS_LABELS[petMove]} · DeepSeek娘赢咯 `;
    player.cheerTimer = 2.0;
    player.happyTimer = 1.9;
    playSfx('bounce', 3);
    petAudio.haptic('headpat');
    addCoins(10, player.x, player.y - 36, '陪玩奖 ');
    addAffectionXp(18, '猜拳互动 +18 亲密');
    setPlayerEmote(`耶！我出${RPS_LABELS[petMove]}赢咯~ 奖励白米饭!`, 2.5, 'cheer', true);
  }

  if (rpsStatusEl) rpsStatusEl.textContent = banner;
  completeWish('play_rps');

  rpsGame.hideTimer = setTimeout(() => {
    rpsHudEl?.classList.add('hidden');
  }, 2400);
}

function updateRpsGame(dt) {
  rpsGame.cooldown = Math.max(0, rpsGame.cooldown - dt);
  if (!rpsGame.active) return;

  rpsGame.timer -= dt;
  player.rpsPoseTimer = Math.max(player.rpsPoseTimer, 0.2);

  const gs = vision.gestureState;
  const detectedMove =
    rpsGame.lockedMove || (gs && gs.ttl > 0 && gs.rpsMove !== 'none' ? gs.rpsMove : null);
  highlightRpsChoice(detectedMove);

  const sec = Math.max(1, Math.ceil(rpsGame.timer / 0.85));
  if (sec < rpsGame.lastTickSec) {
    rpsGame.lastTickSec = sec;
    playSfx('rps_tick', 4 - sec);
  }
  if (rpsStatusEl) {
    rpsStatusEl.textContent = detectedMove
      ? `镜头已识别：${RPS_LABELS[detectedMove]} · 倒计时 ${sec}`
      : `对镜头伸出手势出拳（或点击按钮）！倒计时 ${sec}`;
  }

  if (rpsGame.timer <= 0) {
    const finalMove =
      detectedMove || ['rock', 'scissors', 'paper'][Math.floor(Math.random() * 3)];
    resolveRpsRound(finalMove);
  }
}

document.getElementById('btn-rps')?.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (palmCatchGame.active) cancelPalmCatchGame();
  startRpsGame(false);
});

// ================= 实景手掌“托举接白米饭”小游戏（移动真实手掌或摇杆带她接天降美食金币） =================
const rpsChoicesEl = document.querySelector('#rps-hud .rps-choices');
const palmCatchGame = {
  active: false,
  timer: 0,
  spawnTick: 0,
  score: 0,
  catches: 0,
  combo: 0
};

function cancelPalmCatchGame() {
  if (!palmCatchGame.active) return;
  palmCatchGame.active = false;
  catchItems.length = 0;
  if (rpsChoicesEl) rpsChoicesEl.style.display = 'flex';
  rpsHudEl?.classList.add('hidden');
  document.getElementById('btn-palm-catch')?.classList.remove('active');
}

function startPalmCatchGame() {
  if (palmCatchGame.active) {
    cancelPalmCatchGame();
    return;
  }
  if (!drawerEl.classList.contains('hidden')) closeDrawer();
  if (rpsGame.active) cancelRpsGame();
  if (gameMode !== 'pet') switchMode('pet');
  setNapping(false);

  palmCatchGame.active = true;
  palmCatchGame.timer = 16.0;
  palmCatchGame.spawnTick = 0.25;
  palmCatchGame.score = 0;
  palmCatchGame.catches = 0;
  palmCatchGame.combo = 0;
  catchItems.length = 0;

  if (rpsChoicesEl) rpsChoicesEl.style.display = 'none';
  rpsHudEl?.classList.remove('hidden');
  document.getElementById('btn-palm-catch')?.classList.add('active');
  if (rpsStatusEl) {
    rpsStatusEl.textContent = '掌心接美食！伸出手掌左右移动（或滑动摇杆） · 16s';
  }
  playSfx('star');
  setPlayerEmote('天降白米饭大作战！快用手掌托着我左右接美食咯~', 2.4, 'cheer', true);
}

function updatePalmCatchGame(dt, centerFloorY) {
  if (!palmCatchGame.active) return;
  palmCatchGame.timer -= dt;
  palmCatchGame.spawnTick -= dt;

  if (palmCatchGame.spawnTick <= 0) {
    palmCatchGame.spawnTick = Math.max(0.32, 0.55 - palmCatchGame.catches * 0.012);
    const roll = Math.random();
    const kind =
      roll < 0.16 ? 'alarm' : roll < 0.36 ? 'coin' : roll < 0.54 ? 'bento' : roll < 0.66 ? 'cake' : 'rice';
    catchItems.push({
      kind,
      x: W * (0.14 + Math.random() * 0.72),
      y: H * 0.08,
      vy: 155 + Math.random() * 85,
      rot: 0
    });
  }

  for (let i = catchItems.length - 1; i >= 0; i--) {
    const ci = catchItems[i];
    ci.y += ci.vy * dt;
    ci.rot += dt * 2.2;

    if (Math.hypot(ci.x - player.x, ci.y - (player.y - 12)) < 52) {
      if (ci.kind === 'alarm') {
        palmCatchGame.combo = 0;
        palmCatchGame.score = Math.max(0, palmCatchGame.score - 10);
        player.tsundereTimer = 0.9;
        playSfx('pat');
        petAudio.haptic('headpat');
        floatingTexts.push({
          x: player.x,
          y: player.y - 42,
          vx: 0,
          vy: -60,
          text: '⏰ 加班闹钟 -10!',
          color: '#ff4d79',
          scale: 1.15,
          life: 0.7
        });
        setPlayerEmote('讨厌加班闹钟！只接白米饭和炸虾!', 1.5, 'tsundere');
      } else {
        palmCatchGame.catches++;
        palmCatchGame.combo++;
        const pts = ci.kind === 'cake' ? 30 : ci.kind === 'bento' ? 20 : 12;
        palmCatchGame.score += pts + palmCatchGame.combo * 2;
        player.eatingTimer = 0.24;
        player.happyTimer = 1.0;
        playSfx(ci.kind === 'coin' ? 'coin' : 'bite', palmCatchGame.combo);
        petAudio.haptic('finger_boop');
        spawnInteractVfx(player.x, player.y - 20, 'eat', 5);
        if (ci.kind === 'coin') {
          addCoins(6, player.x, player.y - 36, '接金币 ');
        } else {
          player.hunger = Math.min(player.maxHunger, player.hunger + 6);
          floatingTexts.push({
            x: player.x,
            y: player.y - 40,
            vx: 0,
            vy: -58,
            text: `接住 x${palmCatchGame.combo} (+${pts})`,
            color: '#ffd700',
            scale: 1.12,
            life: 0.65
          });
        }
        if (palmCatchGame.catches >= 5) completeWish('palm_catch');
      }
      catchItems.splice(i, 1);
      continue;
    }

    if (ci.y > centerFloorY + 12) {
      catchItems.splice(i, 1);
    }
  }

  if (rpsStatusEl) {
    rpsStatusEl.textContent = `掌心接美食 · 得分 ${palmCatchGame.score} (连击x${palmCatchGame.combo}) · 剩余 ${Math.ceil(palmCatchGame.timer)}s`;
  }

  if (palmCatchGame.timer <= 0) {
    const rewardCoins = Math.max(12, Math.round(palmCatchGame.score * 0.35));
    const rewardXp = Math.max(18, Math.round(palmCatchGame.score * 0.4));
    const finalScore = palmCatchGame.score;
    cancelPalmCatchGame();
    player.cheerTimer = 2.0;
    player.happyTimer = 2.0;
    playSfx('star');
    petAudio.haptic('win');
    addCoins(rewardCoins, player.x, player.y - 44, '接饭大奖 ');
    addAffectionXp(rewardXp, `掌心接饭 ${finalScore}分 +${rewardXp} 亲密`);
    setPlayerEmote(`掌心接美食大丰收！共得 ${finalScore} 分，吃得好饱 ^w^`, 2.6, 'cheer', true);
  }
}

document.getElementById('btn-palm-catch')?.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  e.stopPropagation();
  startPalmCatchGame();
});

for (const btn of rpsChoiceBtns) {
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const chosen = btn.dataset.rps;
    if (!chosen) return;
    rpsGame.lockedMove = chosen;
    resolveRpsRound(chosen);
  });
}

// 点击左上角金币胶囊可快捷打开商店
document.getElementById('hud-coins-btn')?.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (gameMode !== 'pet') switchMode('pet');
  toggleDrawer('dress');
});

// 养成互动按钮 1：🍚 喂食（再次点击即可顺畅关闭抽屉！）
document.getElementById('btn-feed').addEventListener('pointerdown', (e) => {
  e.preventDefault();
  e.stopPropagation();
  toggleDrawer('food');
});

// 养成互动按钮 4：🛒 商店（点击展开/收起装扮与强化小铺）
document.getElementById('btn-shop').addEventListener('pointerdown', (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (!drawerEl.classList.contains('hidden') && activeDrawerTab !== 'food') {
    closeDrawer();
  } else {
    openDrawer('dress');
  }
});

function updateToyBtnLabel() {
  const labelEl = document.getElementById('btn-toy-label');
  const imgEl = document.getElementById('btn-toy-img');
  const labelMap = {
    whale: '玩球',
    yarn: '毛线球',
    duck: '小黄鸭'
  };
  const imgMap = {
    whale: './assets/toy_whale.webp?v=hd2',
    yarn: './assets/toy_yarn.webp?v=hd2',
    duck: './assets/toy_duck.webp?v=hd2'
  };
  if (labelEl) labelEl.textContent = labelMap[player.activeToy] || '玩球';
  if (imgEl) imgEl.src = imgMap[player.activeToy] || imgMap.whale;
}
updateToyBtnLabel();

function throwOrPassToy() {
  // 若场上已有玩具球，按按钮直接帮主人把球高高垫传给 DeepSeek娘！
  const existingBall = petItems.find((i) => i.type === 'ball');
  if (existingBall) {
    existingBall.rallyCount = (existingBall.rallyCount || 0) + 1;
    playSfx(existingBall.toyId === 'duck' ? 'quack' : 'bounce', existingBall.rallyCount);
    existingBall.vx = (player.x - existingBall.x) * 1.4;
    existingBall.vy = -420;
    existingBall.squashTimer = 0.18;
    existingBall.life = 14;
    if (existingBall.rallyCount >= 3) completeWish('play_rally');
    return;
  }

  const tid = player.activeToy || 'whale';
  playSfx(tid === 'duck' ? 'quack' : 'bounce', 1);
  const dir = player.facing || 1;
  petItems.push({
    type: 'ball',
    toyId: tid,
    x: player.x + dir * 28,
    y: player.y - 38,
    vx: dir * (165 + Math.random() * 75),
    vy: -360,
    angle: 0,
    bounces: 0,
    rallyCount: 0,
    squashTimer: 0.18,
    hitCd: 0.25,
    trail: [],
    life: 15
  });
  player.idleTime = 0;
  const toyNames = { whale: '蓝鲸沙滩球', yarn: '猫薄荷毛线球', duck: '水手小黄鸭' };
  setPlayerEmote(`接好${toyNames[tid] || '球球'}咯~ `, 1.6);
}

// 养成互动按钮 2：🐋 抛出/垫传实景玩具球
document.getElementById('btn-toy').addEventListener('pointerdown', (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (!drawerEl.classList.contains('hidden')) closeDrawer();
  setNapping(false);
  player.recenterDelay = 0;
  throwOrPassToy();
});

// 左上角心愿胶囊：点击自动引导完成心愿
document.getElementById('hud-wish-pill')?.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (!currentWish) return;
  if (currentWish.actionHint === 'palm') {
    closeDrawer();
    setPlayerEmote('把手掌伸到镜头中间，我马上跳上去~', 2.2, 'happy');
  } else if (currentWish.actionHint === 'catch_food') {
    closeDrawer();
    startPalmCatchGame();
  } else if (currentWish.actionHint === 'rps') {
    closeDrawer();
    startRpsGame(false);
  } else if (currentWish.actionHint === 'photo') {
    closeDrawer();
    triggerPolaroidSequence(false);
  } else if (currentWish.actionHint === 'feed_rice') {
    closeDrawer();
    spawnFoodDrop(FOOD_CATALOG[0]);
  } else if (currentWish.actionHint === 'feed_tea') {
    toggleDrawer('food');
  } else if (currentWish.actionHint === 'throw_ball') {
    closeDrawer();
    throwOrPassToy();
  } else if (currentWish.actionHint === 'headpat') {
    closeDrawer();
    triggerPetHeadpat();
    addAffectionXp(10, '+10 亲密 摸头');
    completeWish('headpat');
  } else if (currentWish.actionHint === 'jump') {
    closeDrawer();
    triggerJump();
  }
});

// 养成互动按钮 3：💤 抱大尾巴摸鱼小憩（支持一键睡下与一键唤醒切换）
document.getElementById('btn-nap').addEventListener('pointerdown', (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (!drawerEl.classList.contains('hidden')) closeDrawer();
  playSfx('pat');
  if (player.isNapping || player.idleTime > 5.2) {
    setNapping(false);
    player.idleTime = 0;
    player.petAction = 'idle';
    player.happyTimer = 1.2;
    setPlayerEmote('睡饱满血复活!', 1.8, 'happy', true);
  } else {
    setNapping(true);
    player.vx = 0;
    player.wanderTargetX = null;
    player.idleTime = 6.0;
    player.petAction = 'sleep';
    player.hp = Math.min(player.maxHp, player.hp + 30);
    addAffectionXp(10, '+10 亲密 小憩');
    setPlayerEmote('-w- 抱尾巴睡午觉zzZ', 2.8, 'sleep', true);
  }
});

// 顶部 🎯 实景精准重扫按钮
document.getElementById('btn-rescan').addEventListener('pointerdown', (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (!drawerEl.classList.contains('hidden')) closeDrawer();
  vision.triggerRescan(W, H);
  playSfx('star');
  setPlayerEmote('正在精准扫描桌面物体边缘!', 1.6);
});

document.getElementById('btn-flip-side').addEventListener('pointerdown', (e) => {
  e.preventDefault();
  e.stopPropagation();
  preferCCW = !preferCCW;
  updateOrientationLayout();
});

function spawnEnemy(forceBoss = false) {
  const side = Math.random() < 0.5 ? W * 0.08 : W * 0.92;
  const hasBoss = enemies.some((e) => e.isBoss);
  const isBoss = Boolean(forceBoss && !hasBoss);
  const isGoldTreasure = !isBoss && Math.random() < 0.16;
  const isFlyer = !isBoss && !isGoldTreasure && Math.random() < 0.35;
  const isElite = !isBoss && !isGoldTreasure && player.kills > 8 && Math.random() < 0.16;
  const scale = 1 + player.level * 0.14;
  const centerFloorY = H * 0.68;
  const hpVal = (isBoss ? 340 : isGoldTreasure ? 65 : isElite ? 85 : isFlyer ? 20 : 26) * scale;

  enemies.push({
    x: side,
    y: isFlyer ? Math.random() * (H * 0.35) + H * 0.18 : centerFloorY - (isBoss ? 36 : 20),
    vx: 0,
    vy: 0,
    r: isBoss ? 36 : isElite || isGoldTreasure ? 22 : 15,
    hp: hpVal,
    maxHp: hpVal,
    speed: (isBoss ? 64 : isGoldTreasure ? 115 : isElite ? 70 : isFlyer ? 105 : 90) + Math.random() * 14,
    isBoss,
    isFlyer,
    isElite,
    isGoldTreasure,
    slowTimer: 0,
    bossSkillCd: 3.2,
    jumpCd: Math.random() * 1.2
  });

  if (isBoss) {
    playSfx('star');
    petAudio.haptic('shutter');
    setPlayerEmote('警告！深海摸鱼大魔王登场，快击败它爆金币雨!', 2.6, 'tsundere', true);
  }
}

(async function autoBoot() {
  updateOrientationLayout();
  player.x = W * 0.5;
  player.y = H * 0.62;
  vision.enableSimMode(W, H);
  if (gameMode !== 'pet') placeStarOnBestTarget();
  await vision.startCamera('environment', W, H);
  player.x = W * 0.5;
  player.y = H * 0.62;
  if (gameMode !== 'pet') placeStarOnBestTarget();
})();

let lastFrameTime = performance.now();

function gameLoop(now) {
  requestAnimationFrame(gameLoop);
  const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
  lastFrameTime = now;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const flow = vision.update(now, dt, W, H);
  vision.renderBackgroundAndNeon(ctx, W, H, now);

  updateGameplay(dt, flow);
  renderEntities(now);
  if (pendingPhotoSnapTimer > 0) {
    pendingPhotoSnapTimer -= dt;
    if (pendingPhotoSnapTimer <= 0) {
      captureArPolaroid();
    }
  }
  updateHUD();
}

function updateGameplay(dt, flow) {
  // 更新各类动画与表情计时器
  player.spinTimer = Math.max(0, player.spinTimer - dt);
  player.landAnimTimer = Math.max(0, player.landAnimTimer - dt);
  player.attackAnimTimer = Math.max(0, player.attackAnimTimer - dt);
  player.happyTimer = Math.max(0, player.happyTimer - dt);
  player.proudTimer = Math.max(0, player.proudTimer - dt);
  player.tsundereTimer = Math.max(0, player.tsundereTimer - dt);
  player.eatingTimer = Math.max(0, player.eatingTimer - dt);
  player.talkAnimTimer = Math.max(0, player.talkAnimTimer - dt);
  player.photoPoseTimer = Math.max(0, player.photoPoseTimer - dt);
  player.rpsPoseTimer = Math.max(0, player.rpsPoseTimer - dt);
  player.cheerTimer = Math.max(0, player.cheerTimer - dt);
  player.rubbingTimer = Math.max(0, player.rubbingTimer - dt);
  if (player.rubbingTimer <= 0) player.rubOffsetX *= 0.82;
  player.fingerBoopCd = Math.max(0, player.fingerBoopCd - dt);
  player.fingerComboTimer = Math.max(0, player.fingerComboTimer - dt);
  if (player.fingerComboTimer <= 0) player.fingerCombo = 0;
  player.palmComboTimer = Math.max(0, player.palmComboTimer - dt);
  if (player.palmComboTimer <= 0) player.palmCombo = 0;
  player.fingerChaseActive = false;
  player.eagerFeedActive = false;
  fingerSparkle.active = false;
  player.emoteTimer = Math.max(0, player.emoteTimer - dt);
  player.climbCooldown = Math.max(0, player.climbCooldown - dt);
  player.dropThroughTimer = Math.max(0, player.dropThroughTimer - dt);
  photoAutoCooldown = Math.max(0, photoAutoCooldown - dt);
  updateRpsGame(dt);
  starTarget.comboTimer = Math.max(0, (starTarget.comboTimer || 0) - dt);
  if (starTarget.comboTimer <= 0) starTarget.combo = 0;

  // 1. 镜头偏移时：人物、怪物、星星、掉落物先 1:1 跟随真实世界画面一起偏移
  const flowMag = Math.hypot(flow.dx, flow.dy);
  if (flowMag > 0.1) {
    if (player.palmState === 'none') {
      player.x += flow.dx;
      player.y += flow.dy;
    }
    player.climbTargetX += flow.dx;
    player.climbTargetY += flow.dy;
    starTarget.x += flow.dx;
    starTarget.y += flow.dy;
    for (const e of enemies) {
      e.x += flow.dx;
      e.y += flow.dy;
    }
    for (const g of gems) {
      g.x += flow.dx;
      g.y += flow.dy;
    }
    if (flowMag > 1.8 && Math.abs(player.vx) < 30 && player.climbState === 'none' && player.palmState === 'none') {
      player.recenterDelay = Math.max(player.recenterDelay, 0.24);
      if (Math.hypot(player.x - W * 0.5, player.y - H * 0.62) > 95 && player.emoteTimer <= 0) {
        setPlayerEmote('等等我呀~', 1.2);
      }
    }
  }

  const boundObj =
    vision.pinnedTarget ||
    vision.semanticObjects.find((o) => o.id === starTarget.targetObjId) ||
    vision.semanticObjects[0];
  if (boundObj && starTarget.active) {
    starTarget.targetObjId = boundObj.id;
    starTarget.x = starTarget.x * 0.8 + (boundObj.x + boundObj.w * 0.5) * 0.2;
    starTarget.y = starTarget.y * 0.8 + Math.max(H * 0.16, boundObj.y - 30) * 0.2;
  }
  if (starTarget.x < W * 0.1 || starTarget.x > W * 0.9 || starTarget.y < H * 0.12 || starTarget.y > H * 0.72) {
    placeStarOnBestTarget();
  }

  const platforms = vision.getAllWalkablePlatforms(W, H);
  const centerFloorY = H * 0.68;

  // 环境暗光感应与桌面微缩家具物理/挂机产币更新
  if (vision.isDarkRoom !== lastDarkRoomState) {
    lastDarkRoomState = vision.isDarkRoom;
    if (vision.isDarkRoom && furnitureList.some((f) => f.key === 'lamp')) {
      setPlayerEmote('环境变暗啦，星海蓝鲸小夜灯已自动点亮守护主人~', 2.4, 'happy', true);
    }
  }

  for (const furn of furnitureList) {
    furn.squashTimer = Math.max(0, (furn.squashTimer || 0) - dt);
    furn.working = false;
    if (furn !== draggedFurniture) {
      furn.x = Math.max(48, Math.min(W - 48, furn.x + flow.dx));
      furn.vy = (furn.vy || 0) + 680 * dt;
      const prevFY = furn.y;
      furn.y += furn.vy * dt + flow.dy;
      for (const p of platforms) {
        if (furn.x >= p.x1 - 12 && furn.x <= p.x2 + 12 && prevFY <= p.y + 12 && furn.y >= p.y - 2) {
          furn.y = p.y - 2;
          furn.vy = 0;
          break;
        }
      }
      if (furn.y > centerFloorY - 2) {
        furn.y = centerFloorY - 2;
        furn.vy = 0;
      }
    }

    // 蓝鲸云端猫爬架顶层软垫作为真实可攀爬/可站立的双层实景跳台！
    if (furn.key === 'tree' && gameMode === 'pet') {
      platforms.unshift({
        x1: furn.x - 38,
        x2: furn.x + 38,
        y: furn.y - 58,
        role: 'spring',
        isFloor: false
      });
    }

    // 深海码农工位：DeepSeek娘靠近工位时自动敲键盘写代码产金币！
    if (furn.key === 'pc' && gameMode === 'pet' && !palmCatchGame.active) {
      const distToPc = Math.hypot(player.x - furn.x, player.y - (furn.y - 24));
      if (distToPc < 56 && player.onGround && Math.abs(player.vx) < 20) {
        furn.working = true;
        player.petAction = 'poke';
        furn.workTimer = (furn.workTimer || 0) + dt;
        if (furn.workTimer >= 4.0) {
          furn.workTimer = 0;
          addCoins(6, furn.x, furn.y - 54, '码农产币 ');
          addAffectionXp(8, '努力打工 +8 亲密');
          spawnInteractVfx(furn.x, furn.y - 44, 'sparkle', 5);
        }
      }
    }
  }

  updatePalmCatchGame(dt, centerFloorY);
  const palm = vision.palmTarget;

  // 1.5 最高优先级：中心区域出现手掌时（且未被手指拎起），第一时间飞跃跳上手掌并展开深度掌上互动！
  if (!player.isPickedUp && palm && palm.active && palm.inCenterZone) {
    setNapping(false);
    player.recenterDelay = 0;
    player.wanderTargetX = null;
    player.climbState = 'none';

    if (player.palmState === 'none') {
      player.palmState = 'boarding';
      player.palmStartX = player.x;
      player.palmStartY = player.y;
      const distToPalm = Math.hypot(palm.x - player.x, palm.surfaceY - 25 - player.y);
      player.palmBoardDuration = Math.min(0.34, Math.max(0.18, distToPalm / 720));
      player.palmBoardTimer = player.palmBoardDuration;
      player.facing = palm.x >= player.x ? 1 : -1;
      playSfx('jump');
      setPlayerEmote('发现主人的手掌！跳上去咯~', 1.5, 'happy');
      spawnInteractVfx(player.x, player.y + 8, 'sparkle', 6);
    } else if (player.palmState === 'boarding') {
      player.palmBoardTimer -= dt;
      const t = 1 - Math.max(0, player.palmBoardTimer / Math.max(0.01, player.palmBoardDuration));
      const easeT = 1 - Math.pow(1 - t, 2.2);
      const targetX = palm.x;
      const targetY = palm.surfaceY - 25;
      const arcLift = Math.sin(t * Math.PI) * 56;

      player.x = player.palmStartX + (targetX - player.palmStartX) * easeT;
      player.y = player.palmStartY + (targetY - player.palmStartY) * easeT - arcLift;
      player.vx = (targetX - player.palmStartX) / Math.max(0.1, player.palmBoardDuration);
      player.vy = t < 0.5 ? -220 : 160;
      player.onGround = false;

      if (player.palmBoardTimer <= 0) {
        player.palmState = 'on_palm';
        player.onPalm = true;
        player.onGround = true;
        player.vx = 0;
        player.vy = 0;
        player.palmHopY = 0;
        player.palmHopVy = 0;
        player.palmRewardTimer = 0;
        player.idleTime = 0;
        player.landAnimTimer = 0.16;
        player.happyTimer = 2.2;
        player.proudTimer = 1.2;
        playSfx('pat');
        petAudio.haptic('palm_land');
        setPlayerEmote('^w^ 跳上主人手心啦~ 好暖和 ', 2.4, 'happy', true);
        addAffectionXp(15, '+15 亲密 跃上掌心');
        completeWish('palm_hold');
        spawnInteractVfx(player.x, player.y - 14, 'love', 10);
      }
    } else if (player.palmState === 'on_palm') {
      player.onPalm = true;
      player.palmBounceCd = Math.max(0, player.palmBounceCd - dt);
      player.palmTickleCd = Math.max(0, player.palmTickleCd - dt);
      player.palmRewardTimer += dt;
      player.palmSparkleTick += dt;
      player.idleTime += dt;
      player.palmTilt = palm.tilt || 0;

      // 掌心温暖氛围：每 0.65 秒从掌心飘起一颗温柔小爱心或音符
      if (player.palmSparkleTick >= 0.65) {
        player.palmSparkleTick = 0;
        spawnInteractVfx(player.x, player.y + 8, 'purr', 1);
      }

      // 掌上小跳物理
      if (player.palmHopY < 0 || player.palmHopVy < 0) {
        player.palmHopVy += 680 * dt;
        player.palmHopY += player.palmHopVy * dt;
        if (player.palmHopY >= 0) {
          player.palmHopY = 0;
          player.palmHopVy = 0;
          player.landAnimTimer = 0.12;
        }
      }

      // 60/120FPS 弹簧阻尼紧密跟随真实手掌移动（含手掌轻微倾角滑移平衡感）
      const tiltSlideX = Math.max(-24, Math.min(24, (palm.tilt || 0) * 42));
      const targetX = Math.max(36, Math.min(W - 36, palm.x + tiltSlideX));
      const targetY = Math.max(44, Math.min(H * 0.84 - 25, palm.surfaceY - 25)) + player.palmHopY;
      const trackK = 1 - Math.exp(-dt * 24);
      player.x += (targetX - player.x) * trackK;
      player.y += (targetY - player.y) * trackK;
      player.vx = palm.vx * 0.2;
      player.vy = player.palmHopVy;
      player.onGround = player.palmHopY >= -2;
      player.currentRole = 'palm';
      player.jumpsLeft = player.maxJumps;

      // 掌心互动 1：主人手掌向上托举/连颠 -> 连击旋跃欢呼并爆金币！
      if (palm.vy < -120 && player.palmBounceCd <= 0) {
        player.palmBounceCd = 0.95;
        player.palmCombo = (player.palmCombo || 0) + 1;
        player.palmComboTimer = 3.2;
        player.palmHopVy = -220 - Math.min(60, player.palmCombo * 12);
        player.spinTimer = 0.36;
        player.happyTimer = 1.8;
        player.cheerTimer = player.palmCombo >= 2 ? 1.4 : 0;
        playSfx('bounce', Math.min(6, 2 + player.palmCombo));
        petAudio.haptic('finger_boop');
        spawnInteractVfx(player.x, player.y - 18, 'sparkle', 8);
        const comboTxt = player.palmCombo >= 2 ? ` x${player.palmCombo}` : '';
        setPlayerEmote(`哇~ 手心举高高${comboTxt}咯!!`, 1.8, 'cheer', player.palmCombo === 2);
        addCoins(7 + player.palmCombo * 2, player.x, player.y - 30, `举高高${comboTxt} `);
      }
      // 掌心互动 2：主人左右摇晃手掌 -> 手心冲浪互动
      else if (Math.abs(palm.vx) > 105 && player.palmBounceCd <= 0) {
        player.palmBounceCd = 1.2;
        player.facing = palm.vx > 0 ? 1 : -1;
        player.happyTimer = 1.5;
        spawnInteractVfx(player.x, player.y - 12, 'sparkle', 5);
        setPlayerEmote('手心冲浪~ 稳住稳住!', 1.6, 'happy');
        addAffectionXp(10, '+10 亲密 掌心摇晃');
      }
      // 掌心互动 3：动动手指挠痒痒/捏捏 -> 傲娇害羞跳动
      else if (palm.isTickling && player.palmTickleCd <= 0) {
        player.palmTickleCd = 2.0;
        player.tsundereTimer = 1.45;
        player.palmHopVy = -120;
        playSfx('pat');
        petAudio.haptic('headpat');
        const tickleLines = [
          '>///< 手指挠痒痒好痒呀~',
          '蹭蹭主人的大拇指~',
          '在手心里被摸头好幸福!'
        ];
        setPlayerEmote(tickleLines[Math.floor(Math.random() * tickleLines.length)], 2.0, 'tsundere');
        addAffectionXp(12, '+12 亲密 掌心挠痒');
        spawnInteractVfx(player.x, player.y - 16, 'love', 7);
      }

      // 掌心互动 4：站在手心里时自动轮播丰富卖萌动作（坐手心晃腿 -> 戳掌纹 -> 捧碗干饭 -> 得意叉腰）
      const palmCycle = Math.floor(player.idleTime / 2.6) % 4;
      const palmAct = palmCycle === 0 ? 'sit' : palmCycle === 1 ? 'poke' : palmCycle === 2 ? 'rice' : 'proud';
      if (player.petAction !== palmAct) {
        player.petAction = palmAct;
        if (player.emoteTimer <= 0) {
          const actLines = {
            sit: '坐在主人手心里晃jiojio~',
            poke: '戳戳主人的掌纹~',
            rice: '在手心里干饭最香啦 ^w^',
            proud: '=w= 我是主人的掌上DeepSeek娘!'
          };
          setPlayerEmote(actLines[palmAct], 2.0);
        }
      }

      // 持续托举手掌每 4.2 秒额外奖励亲密度与金币
      if (player.palmRewardTimer >= 4.2) {
        player.palmRewardTimer = 0;
        addCoins(6, player.x, player.y - 28, '掌上陪伴 ');
        addAffectionXp(10, '+10 亲密 掌心温暖');
      }
    }
  } else if (player.palmState !== 'none') {
    // 手掌移开后，轻巧跳回屏幕中心
    player.palmState = 'none';
    player.onPalm = false;
    player.onGround = false;
    player.vy = -135;
    player.recenterDelay = 0.12;
    setPlayerEmote('手掌收走啦~ 我回中间乖乖等你!', 1.8);
  }

  // 2. 处理「被拎起悬空 / 手掌互动 / 抓边悬吊翻身爬平台」动作序列
  if (player.isPickedUp) {
    // 正被主人手指拎在半空摆动，跳过重力与地面碰撞
    player.idleTime = 0;
  } else if (player.palmState !== 'none') {
    // 已在手掌攀登或掌上互动中，跳过常规地面物理
  } else if (player.climbState !== 'none') {
    player.vx = 0;
    player.vy = 0;
    player.climbTimer -= dt;
    if (player.climbState === 'hang') {
      // 双手抓在实景物体边缘扑腾
      player.x += (player.climbTargetX - player.x) * Math.min(1, dt * 14);
      player.y += (player.climbTargetY + 14 - player.y) * Math.min(1, dt * 14);
      if (player.climbTimer <= 0) {
        player.climbState = 'pullup';
        player.climbTimer = 0.26;
        playSfx('climb');
      }
    } else if (player.climbState === 'pullup') {
      // 翻身用力爬上平台顶部
      const targetTopX = player.climbTargetX + player.facing * 18;
      const targetTopY = player.climbTargetY - 25;
      player.x += (targetTopX - player.x) * Math.min(1, dt * 14);
      player.y += (targetTopY - player.y) * Math.min(1, dt * 14);
      if (player.climbTimer <= 0) {
        player.x = targetTopX;
        player.y = targetTopY;
        player.climbState = 'none';
        player.onGround = true;
        player.jumpsLeft = player.maxJumps;
        player.proudTimer = 1.2;
        setPlayerEmote('=w= 爬上平台啦!', 1.5);
      }
    }
  } else {
    // 3. 常规与自动回归运动：加速 → 固定最高移速 → 减速 → 停止
    const auraBoost = player.equipped.aura ? 1.15 : 1;
    const yarnBoost = petItems.some((i) => i.type === 'ball' && i.toyId === 'yarn') ? 1.35 : 1;
    const MAX_RUN_SPEED = 240 * (1 + player.weapons.boots * 0.12) * auraBoost * yarnBoost;
    const ACCEL = 760;
    const DECEL = 920;
    const SLOW_RADIUS = 76;
    const STOP_TOLERANCE = 6;

    let anchorX = W * 0.5;
    let anchorY = centerFloorY - 25;
    const centerPlatforms = platforms.filter(
      (p) => !p.isFloor && Math.abs((p.x1 + p.x2) * 0.5 - W * 0.5) < W * 0.24
    );
    if (centerPlatforms.length > 0) {
      centerPlatforms.sort(
        (a, b) => Math.abs((a.x1 + a.x2) * 0.5 - W * 0.5) - Math.abs((b.x1 + b.x2) * 0.5 - W * 0.5)
      );
      anchorX = Math.max(W * 0.34, Math.min(W * 0.66, (centerPlatforms[0].x1 + centerPlatforms[0].x2) * 0.5));
      anchorY = centerPlatforms[0].y - 25;
    }

    // 进阶手势语义零延迟预响应与连击交互（比耶✌️立即摆Pose合影 / 握拳✊立即备战猜拳 / 伸食指☝️星光逗宠连击）
    const gs = vision.gestureState;
    if (
      gs &&
      gs.ttl > 0 &&
      gs.type === 'peace' &&
      photoAutoCooldown <= 0 &&
      pendingPhotoSnapTimer <= 0 &&
      !rpsGame.active
    ) {
      // 镜头一识别到比耶✌️，角色第一帧立刻转头摆出比耶眨眼 Pose 预备，消除等待延迟感！
      player.photoPoseTimer = Math.max(player.photoPoseTimer, 0.28);
      if (gs.holdDuration >= 0.42) {
        triggerPolaroidSequence(true);
      }
    } else if (
      gameMode === 'pet' &&
      gs &&
      gs.ttl > 0 &&
      gs.type === 'fist' &&
      !rpsGame.active &&
      rpsGame.cooldown <= 0
    ) {
      player.rpsPoseTimer = Math.max(player.rpsPoseTimer, 0.26);
      if (gs.holdDuration >= 0.6) {
        startRpsGame(true);
      }
    }

    // 养成模式下：优先响应亲手拖拽喂食 > 食指星光逗宠连击 > 投喂美食/玩具球 > 桌面散步探索
    if (draggedItem && (draggedItem.type === 'food' || draggedItem.type === 'rice')) {
      setNapping(false);
      player.eagerFeedActive = true;
      player.idleTime = 0;
      player.facing = draggedItem.x >= player.x ? 1 : -1;
      anchorX = Math.max(W * 0.12, Math.min(W * 0.88, draggedItem.x - player.facing * 18));
      anchorY = draggedItem.y;
    } else if (gs && gs.ttl > 0 && gs.type === 'point_finger' && !rpsGame.active) {
      setNapping(false);
      player.fingerChaseActive = true;
      player.recenterDelay = 0;
      player.idleTime = 0;
      player.wanderTargetX = null;
      fingerSparkle.active = true;
      fingerSparkle.x = gs.fingerX;
      fingerSparkle.y = gs.fingerY;
      anchorX = Math.max(W * 0.1, Math.min(W * 0.9, gs.fingerX));
      anchorY = Math.max(H * 0.14, Math.min(H * 0.76, gs.fingerY));
      player.facing = gs.fingerX >= player.x ? 1 : -1;

      if (
        gs.fingerY < player.y - 48 &&
        Math.abs(gs.fingerX - player.x) < 92 &&
        player.onGround &&
        player.autoJumpCd <= 0
      ) {
        triggerJump();
        player.autoJumpCd = 0.5;
      }

      if (
        Math.hypot(gs.fingerX - player.x, gs.fingerY - (player.y - 14)) < 68 &&
        player.fingerBoopCd <= 0
      ) {
        player.fingerBoopCd = 1.05;
        player.fingerCombo = (player.fingerCombo || 0) + 1;
        player.fingerComboTimer = 3.6;
        player.happyTimer = 1.5;
        if (player.fingerCombo >= 3) {
          player.cheerTimer = 1.4;
          player.spinTimer = 0.36;
        }
        playSfx('boop');
        petAudio.haptic('finger_boop');
        const cTag = player.fingerCombo >= 2 ? ` x${player.fingerCombo}!` : '~ 蹭蹭 ';
        setPlayerEmote(`指尖贴贴${cTag}`, 1.8, player.fingerCombo >= 3 ? 'cheer' : 'happy');
        addAffectionXp(8 + player.fingerCombo * 2, `+${8 + player.fingerCombo * 2} 亲密 指尖贴贴`);
        if (player.fingerCombo % 3 === 0) {
          addCoins(8, gs.fingerX, gs.fingerY - 20, `指尖x${player.fingerCombo} `);
        }
        spawnInteractVfx(gs.fingerX, gs.fingerY, 'love', 9);
      }
    } else if (petItems.length > 0 && gameMode === 'pet') {
      setNapping(false);
      let nearestIt = petItems[0];
      let bestD = Math.abs(nearestIt.x - player.x);
      for (const cand of petItems) {
        const d = Math.abs(cand.x - player.x);
        if (d < bestD) {
          bestD = d;
          nearestIt = cand;
        }
      }
      anchorX = Math.max(W * 0.14, Math.min(W * 0.86, nearestIt.x));
      anchorY = nearestIt.y - 20;
      player.recenterDelay = 0;
      player.idleTime = 0;
    } else if (player.isNapping) {
      // 小憩状态下保持原地安睡，不被自动回中拉走
      anchorX = player.x;
      anchorY = player.y;
      player.idleTime = Math.max(6.0, player.idleTime);
      player.petAction = 'sleep';
    } else if (gameMode === 'pet') {
      player.wanderTimer -= dt;
      if (player.wanderTimer <= 0) {
        player.wanderTimer = 5.5 + Math.random() * 4.5;
        const pcFurn = furnitureList.find((f) => f.key === 'pc');
        const treeFurn = furnitureList.find((f) => f.key === 'tree');
        const objPlats = platforms.filter((p) => !p.isFloor);
        if (pcFurn && Math.random() < 0.48) {
          player.wanderTargetX = pcFurn.x;
        } else if (treeFurn && Math.random() < 0.45) {
          player.wanderTargetX = treeFurn.x;
          if (player.onGround) triggerJump();
        } else if (objPlats.length > 0 && Math.random() < 0.7) {
          const picked = objPlats[Math.floor(Math.random() * objPlats.length)];
          player.wanderTargetX =
            Math.random() < 0.45 ? picked.x1 + 16 : (picked.x1 + picked.x2) * 0.5;
        } else {
          player.wanderTargetX = W * (0.36 + Math.random() * 0.28);
        }
      }
      if (player.wanderTargetX !== null) {
        anchorX = player.wanderTargetX;
        if (Math.abs(player.x - anchorX) < 10) {
          player.wanderTargetX = null;
        }
      }
    }

    let moveDir = 0;
    if (input.left) moveDir -= 1;
    if (input.right) moveDir += 1;
    if (Math.abs(input.joyX) > 0.08) moveDir = input.joyX;

    // 蹲伏状态判定（按住 ▼ 按钮、键盘下键、或摇杆下拉）
    const wantsCrouch = input.down || input.joyY > 0.42;
    if (player.onGround && wantsCrouch && Math.abs(moveDir) < 0.25) {
      player.isCrouching = true;
      player.crouchTime += dt;
    } else {
      player.isCrouching = false;
      player.crouchTime = 0;
    }

    let desiredVx = 0;
    player.autoJumpCd = Math.max(0, player.autoJumpCd - dt);

    if (player.isCrouching || player.isNapping) {
      desiredVx = 0;
    } else if (Math.abs(moveDir) > 0.08) {
      setNapping(false);
      desiredVx = moveDir * MAX_RUN_SPEED;
      player.recenterDelay = 0.22;
      player.idleTime = 0;
    } else {
      player.recenterDelay = Math.max(0, player.recenterDelay - dt);
      const distX = anchorX - player.x;
      const absDist = Math.abs(distX);
      const dir = Math.sign(distX);

      if (player.recenterDelay > 0 || absDist <= STOP_TOLERANCE) {
        desiredVx = 0;
      } else if (absDist < SLOW_RADIUS) {
        const brakeSpeed = Math.min(MAX_RUN_SPEED, Math.sqrt(2 * DECEL * absDist));
        desiredVx = dir * brakeSpeed;
      } else {
        desiredVx = dir * MAX_RUN_SPEED;
      }

      if (player.recenterDelay <= 0 && player.y > anchorY + 34 && player.autoJumpCd <= 0) {
        triggerJump();
        player.autoJumpCd = 0.45;
      }
    }

    const dv = desiredVx - player.vx;
    const isAccelerating = Math.abs(desiredVx) > Math.abs(player.vx) && desiredVx * player.vx >= 0;
    player.isBraking = !isAccelerating && Math.abs(player.vx) > Math.abs(desiredVx) + 12;
    const maxStep = (isAccelerating ? ACCEL : DECEL) * dt;
    if (Math.abs(dv) <= maxStep) {
      player.vx = desiredVx;
    } else {
      player.vx += Math.sign(dv) * maxStep;
    }
    if (desiredVx === 0 && Math.abs(player.vx) < 5) {
      player.vx = 0;
    }
    if (Math.abs(player.vx) > 10) {
      player.facing = player.vx > 0 ? 1 : -1;
    }

    const wasOnGround = player.onGround;
    const prevVy = player.vy;
    const prevFootY = player.y + 25;
    player.vy += 760 * dt;
    player.x += player.vx * dt;
    player.y += player.vy * dt;

    player.x = Math.max(28, Math.min(W - 28, player.x));
    if (player.y < 36) {
      player.y = 36;
      if (player.vy < 0) player.vy = 0;
    }

    player.onGround = false;
    player.standingPlat = null;
    const newFootY = player.y + 25;

    // 4. 平台边缘攀爬检测（当跳到实景平台侧边或高度差一点点够不到台面时，自动伸手抓边爬上去！）
    if (!wasOnGround && player.climbCooldown <= 0 && player.dropThroughTimer <= 0 && player.vy > -140) {
      for (const p of platforms) {
        if (p.isFloor) continue;
        const nearLeftEdge = Math.abs(player.x - p.x1) < 26;
        const nearRightEdge = Math.abs(player.x - p.x2) < 26;
        const withinSpan = player.x >= p.x1 - 22 && player.x <= p.x2 + 22;
        const bodyAtLedgeHeight = player.y + 18 >= p.y && player.y - 24 <= p.y;

        if ((nearLeftEdge || nearRightEdge || (withinSpan && prevFootY > p.y + 6)) && bodyAtLedgeHeight) {
          player.climbState = 'hang';
          player.climbTimer = 0.24;
          player.climbCooldown = 0.9;
          if (nearLeftEdge) {
            player.climbTargetX = p.x1;
            player.facing = 1;
          } else if (nearRightEdge) {
            player.climbTargetX = p.x2;
            player.facing = -1;
          } else {
            player.climbTargetX = Math.max(p.x1 + 12, Math.min(p.x2 - 12, player.x));
          }
          player.climbTargetY = p.y;
          player.currentRole = p.role || 'edge';
          setPlayerEmote('>_< 嘿咻抓边爬上去!', 1.1);
          playSfx('climb');
          break;
        }
      }
    }

    // 5. 常规踩上平台判定
    if (player.climbState === 'none' && player.vy >= 0) {
      platforms.sort((a, b) => a.y - b.y);
      for (const p of platforms) {
        if (!p.isFloor && player.dropThroughTimer > 0) continue;
        const marginX = p.isFloor ? 200 : 18;
        const snapTolY = p.isFloor ? (flow.dy > 1.5 ? 2 : 10) : 18;
        if (
          player.x >= p.x1 - marginX &&
          player.x <= p.x2 + marginX &&
          prevFootY <= p.y + snapTolY &&
          newFootY >= p.y - 4
        ) {
          player.y = p.y - 25;
          player.vy = 0;
          player.onGround = true;
          player.standingPlat = p;
          player.currentRole = p.role || 'edge';
          player.jumpsLeft = player.maxJumps;
          player.coyoteTimer = 0.2;
          if (!wasOnGround && prevVy > 110) {
            player.landAnimTimer = 0.16;
          }
          if (!p.isFloor && p.y < H * 0.46) {
            completeWish('climb_high');
          }
          if (p.ref) p.ref.playerStanding = true;
          break;
        }
      }
    } else {
      player.coyoteTimer = Math.max(0, player.coyoteTimer - dt);
    }

    const bottomSafetyY = H * 0.82 - 25;
    if (player.y > bottomSafetyY) {
      player.y = bottomSafetyY;
      player.vy = 0;
      player.onGround = true;
      player.jumpsLeft = player.maxJumps;
    }

    // 6. 桌面宠物在物体上的深度交互行为（坐边缘晃腿 / 戳键盘 / 抱碗干饭 / 叉腰 / 打盹）
    if (player.onGround && Math.abs(player.vx) < 12 && !player.isCrouching) {
      player.idleTime += dt;
      const plat = player.standingPlat;
      const nearPlatEdge =
        plat && !plat.isFloor && (Math.abs(player.x - plat.x1) < 28 || Math.abs(player.x - plat.x2) < 28);

      if (nearPlatEdge && player.idleTime > 0.7) {
        if (player.petAction !== 'sit') {
          player.petAction = 'sit';
          player.facing = Math.abs(player.x - plat.x1) < Math.abs(player.x - plat.x2) ? -1 : 1;
          setPlayerEmote('^w^ 坐边边晃jio~ ', 2.0);
        }
      } else if (player.idleTime > 5.2) {
        if (player.petAction !== 'sleep') {
          player.petAction = 'sleep';
          setPlayerEmote('-w- 抱尾巴摸鱼zzZ', 2.5);
        }
      } else if (player.idleTime > 1.2) {
        const cycle = Math.floor(player.idleTime / 2.6) % 3;
        if (player.currentRole === 'tech') {
          const nextAct = cycle === 0 ? 'poke' : cycle === 1 ? 'sit' : 'rice';
          if (player.petAction !== nextAct) {
            player.petAction = nextAct;
            if (nextAct === 'poke' && player.emoteTimer <= 0) setPlayerEmote('帮主人敲键盘~', 1.8);
          }
        } else if (player.currentRole === 'drink' || player.currentRole === 'food') {
          const nextAct = cycle === 0 ? 'rice' : 'sit';
          if (player.petAction !== nextAct) {
            player.petAction = nextAct;
            if (nextAct === 'rice' && player.emoteTimer <= 0) setPlayerEmote('配茶吃白米饭~', 1.8);
          }
        } else {
          const nextAct = cycle === 0 ? 'proud' : cycle === 1 ? 'poke' : 'sit';
          if (player.petAction !== nextAct) {
            player.petAction = nextAct;
            if (nextAct === 'proud' && player.emoteTimer <= 0) setPlayerEmote('=w= 占领桌面高地!', 1.8);
          }
        }
      } else {
        player.petAction = 'idle';
      }
    } else {
      player.idleTime = 0;
      player.petAction = 'idle';
    }
  }

  const onTech = player.onGround && player.currentRole === 'tech';
  const onDrink = player.onGround && player.currentRole === 'drink';
  if (onDrink) {
    player.hp = Math.min(player.maxHp, player.hp + 15 * dt);
    for (const g of gems) g.magnet = true;
  }
  if (player.equipped.cushion && player.onGround && Math.abs(player.vx) < 12) {
    player.hp = Math.min(player.maxHp, player.hp + 18 * dt);
  }

  // 饱食度与美食 Buff 自然流逝
  player.foodBuffTimer = Math.max(0, player.foodBuffTimer - dt);
  player.hunger = Math.max(10, player.hunger - 0.55 * dt);
  if (player.hunger < 25 && player.emoteTimer <= 0 && Math.random() < 0.01) {
    setPlayerEmote('肚子有点饿啦，想吃白米饭~', 2.0);
  }

  // Live2D 视线焦点实时追踪（看向手中拖拽的美食 / 指尖萤火 / 最近的弹力球） & 睡眠呼吸 Zzz 气泡
  let focusX = null;
  if (draggedItem) {
    focusX = draggedItem.x;
  } else if (fingerSparkle.active) {
    focusX = fingerSparkle.x;
  } else if (petItems.length > 0) {
    focusX = petItems[0].x;
  }
  const targetLook = focusX !== null ? Math.max(-130, Math.min(130, focusX - player.x)) : 0;
  player.lookOffsetX += (targetLook - player.lookOffsetX) * Math.min(1, dt * 10);

  if ((player.isNapping || player.petAction === 'sleep') && !player.onPalm) {
    player.sleepZzzTick += dt;
    if (player.sleepZzzTick >= 0.95) {
      player.sleepZzzTick = 0;
      particles.push({
        x: player.x + (player.facing || 1) * 14,
        y: player.y - 34,
        vx: (player.facing || 1) * 14,
        vy: -26,
        gravity: 0,
        shape: 'zzz',
        size: 8.5,
        phase: Math.random() * 6,
        maxLife: 1.35,
        life: 1.35
      });
    }
  }

  // 更新养成互动道具（🍱 支持亲手喂到嘴边张嘴接食 + 地面3口咀嚼演出 & 🐋 玩具球颠球连击物理）
  for (let i = petItems.length - 1; i >= 0; i--) {
    const it = petItems[i];
    const isHandHeldFood =
      it === draggedItem && (it.type === 'food' || it.type === 'rice');

    if (it === draggedItem && !isHandHeldFood) continue;

    if (!isHandHeldFood) {
      it.life -= dt;
      if (it.hitCd > 0) it.hitCd -= dt;
      if (it.squashTimer > 0) it.squashTimer = Math.max(0, it.squashTimer - dt);

      const prevY = it.y;
      it.vy += (it.type === 'ball' ? 620 : 680) * dt;
      it.x += (it.vx || 0) * dt + flow.dx;
      it.y += it.vy * dt + flow.dy;

      if (it.type === 'ball') {
        it.angle = (it.angle || 0) + (it.vx || 0) * dt * 0.055;
        it.trail = it.trail || [];
        if (Math.hypot(it.vx || 0, it.vy || 0) > 110) {
          it.trail.push({ x: it.x, y: it.y });
          if (it.trail.length > 7) it.trail.shift();
        } else if (it.trail.length > 0) {
          it.trail.shift();
        }
      }

      if (it.x < 34 || it.x > W - 34) {
        it.vx = -(it.vx || 0) * 0.82;
        it.x = Math.max(34, Math.min(W - 34, it.x));
        it.squashTimer = 0.15;
      }

      let landedOnSurface = false;
      if (it.vy >= 0) {
        for (const p of platforms) {
          if (it.x >= p.x1 - 10 && it.x <= p.x2 + 10 && prevY <= p.y + 12 && it.y >= p.y - 4) {
            it.y = p.y - 4;
            landedOnSurface = true;
            break;
          }
        }
      }
      if (it.y > centerFloorY - 4) {
        it.y = centerFloorY - 4;
        landedOnSurface = true;
      }

      if (landedOnSurface) {
        if (it.type === 'ball' && Math.abs(it.vy) > 75) {
          it.vy = -it.vy * 0.72;
          it.vx = (it.vx || 0) * 0.92;
          it.squashTimer = 0.18;
          if (it.toyId === 'duck') {
            playSfx('quack');
            shockwaves.push({ x: it.x, y: it.y, r: 10, maxR: 120, color: '#ffd700', life: 0.35 });
            for (const e of enemies) {
              if (Math.hypot(e.x - it.x, e.y - it.y) < 120) {
                e.hp -= 35;
                e.vy = -240;
              }
            }
          }
        } else {
          if (Math.abs(it.vy) > 40) it.squashTimer = 0.2;
          it.vy = 0;
          it.vx = (it.vx || 0) * 0.85;
          if (it.type === 'ball') it.rallyCount = 0;
        }
      }
    }

    const mouthY = isHandHeldFood ? player.y - 16 : player.y;
    const eatRadius = isHandHeldFood ? 58 : 44;
    const distToHero = Math.hypot(player.x - it.x, mouthY - it.y);
    if ((it.type === 'food' || it.type === 'rice') && distToHero < eatRadius) {
      // 分 3 口大口干饭演出（支持主人亲手端在嘴边投喂！）
      if (!isHandHeldFood) {
        it.vx = 0;
        it.x += (player.x + player.facing * 20 - it.x) * Math.min(1, dt * 10);
        it.y += (player.y + 18 - it.y) * Math.min(1, dt * 10);
      }
      it.eatingProgress = (it.eatingProgress || 0) + dt * (isHandHeldFood ? 0.92 : 0.78);
      it.biteTick = (it.biteTick || 0) - dt;
      player.eatingTimer = 0.26;
      player.vx *= 0.5;

      if (it.biteTick <= 0) {
        it.biteTick = 0.38;
        playSfx('bite');
        if (isHandHeldFood) petAudio.haptic('purr');
        spawnInteractVfx(it.x, it.y - 12, 'eat', 4);
      }

      if (it.eatingProgress >= 1) {
        const spec = it.foodSpec || FOOD_CATALOG[0];
        const handBonus = isHandHeldFood ? 1.35 : 1;
        const finalXp = Math.round(spec.xp * handBonus);
        if (it === draggedItem) draggedItem = null;
        playSfx('star');
        player.happyTimer = 2.2;
        player.cheerTimer = isHandHeldFood ? 1.4 : 0;
        player.petAction = 'rice';
        player.hunger = Math.min(player.maxHunger, player.hunger + spec.hunger);
        player.hp = Math.min(player.maxHp, player.hp + spec.hp);
        if (spec.buffSec > 0) {
          player.foodBuffTimer = spec.buffSec;
          player.foodCoinMult = spec.buffMult;
        }
        petAudio.haptic('tap');
        spawnInteractVfx(player.x, player.y - 20, 'love', 10);
        setPlayerEmote(
          isHandHeldFood ? `主人亲手喂的${spec.name}更香啦 ^w^!` : spec.emote,
          2.3,
          'eat',
          true
        );
        addAffectionXp(
          finalXp,
          `${isHandHeldFood ? '亲手投喂 ' : ''}饱食+${spec.hunger} 亲密+${finalXp}`
        );
        if (spec.id === 'rice') completeWish('eat_rice');
        if (spec.id === 'tea') completeWish('eat_tea');
        petItems.splice(i, 1);
      }
      continue;
    } else if (it.type === 'ball') {
      // 当球飞在 DeepSeek娘 头顶附近时，她会自动高高跃起空中扣球/顶球！
      if (
        Math.abs(player.x - it.x) < 58 &&
        it.y < player.y - 22 &&
        it.y > player.y - 110 &&
        player.onGround &&
        player.autoJumpCd <= 0
      ) {
        triggerJump();
        player.autoJumpCd = 0.45;
      }

      if (distToHero < 44 && (it.hitCd || 0) <= 0) {
        it.hitCd = 0.38;
        it.rallyCount = (it.rallyCount || 0) + 1;
        playSfx(it.toyId === 'duck' ? 'quack' : 'bounce', it.rallyCount);
        it.squashTimer = 0.18;
        it.vy = -410 - Math.min(110, it.rallyCount * 16);
        const bounceDir = Math.abs(player.x - W * 0.5) > W * 0.22 ? Math.sign(W * 0.5 - player.x) : player.facing || 1;
        it.vx = bounceDir * (145 + Math.random() * 85);
        it.bounces = (it.bounces || 0) + 1;
        player.happyTimer = 1.2;
        player.spinTimer = it.rallyCount >= 3 ? 0.36 : 0;

        const comboMsg = it.rallyCount >= 2 ? `颠球 x${it.rallyCount}!` : '^w^ 顶球球~ ';
        setPlayerEmote(comboMsg, 1.5);
        addAffectionXp(8 + it.rallyCount * 2, `颠球 x${it.rallyCount} +`);

        if (it.rallyCount % 2 === 0) {
          addCoins(3 + it.rallyCount, it.x, it.y - 24, `x${it.rallyCount} `);
        }
        if (it.rallyCount >= 3) {
          completeWish('play_rally');
        }
        if (it.bounces >= 8) {
          addCoins(12, it.x, it.y - 24, '满贯 ');
          petItems.splice(i, 1);
          continue;
        }
      }
    }

    if (it.life <= 0) petItems.splice(i, 1);
  }

  if (gameMode !== 'pet') {
    if (starTarget.active) {
      const distToStar = Math.hypot(player.x - starTarget.x, player.y - starTarget.y);
      if (distToStar < starTarget.radius + 32) {
        starTarget.active = false;
        starTarget.respawnTimer = 2.0;
        starTarget.combo = (starTarget.combo || 0) + 1;
        starTarget.comboTimer = 9.5;
        player.starsCollected++;
        const starBounty = 16 + starTarget.combo * 6;
        addAffectionXp(24 + starTarget.combo * 4, `⭐ 摘星 x${starTarget.combo} +`);
        addCoins(starBounty, starTarget.x, starTarget.y, `⭐ 星链x${starTarget.combo} `);
        shockwaves.push({
          x: starTarget.x,
          y: starTarget.y,
          r: 12,
          maxR: 180,
          color: '#00f3ff',
          life: 0.42
        });
        for (const e of enemies) {
          e.hp -= 95;
          e.vy = -260;
        }
        applySeamlessUpgrade();
      }
    } else {
      starTarget.respawnTimer -= dt;
      if (starTarget.respawnTimer <= 0) {
        placeStarOnBestTarget();
      }
    }
  } else {
    starTarget.active = false;
  }

  let nearestEnemy = null;
  let minDist = Infinity;
  for (const e of enemies) {
    const d = Math.hypot(e.x - player.x, e.y - player.y);
    if (d < minDist) {
      minDist = d;
      nearestEnemy = e;
    }
  }

  const fireInterval = Math.max(0.14, 0.42 / (1 + (player.weapons.blaster - 1) * 0.35)) * (onTech ? 0.65 : 1);
  shootTimer -= dt;
  if (gameMode === 'survivor' && shootTimer <= 0 && nearestEnemy && player.climbState === 'none') {
    shootTimer = fireInterval;
    player.attackAnimTimer = 0.15;
    const baseAng = Math.atan2(nearestEnemy.y - player.y, nearestEnemy.x - player.x);
    const count = Math.min(3, player.weapons.blaster);
    for (let i = 0; i < count; i++) {
      const spread = (i - (count - 1) * 0.5) * 0.14;
      bullets.push({
        x: player.x + Math.cos(baseAng) * 18,
        y: player.y + Math.sin(baseAng) * 18,
        vx: Math.cos(baseAng + spread) * 650,
        vy: Math.sin(baseAng + spread) * 650,
        dmg: 22 + player.weapons.blaster * 6 + player.level * 2,
        color: onTech ? '#ff007f' : '#00f3ff',
        life: 1.2
      });
    }
    playSfx('shoot');
  }

  bladeAngle += dt * 4.8;
  const bladeCount = gameMode === 'survivor' ? Math.min(4, player.weapons.teaBlade + (onDrink ? 1 : 0)) : 0;
  const bladeRadius = 64;

  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    // 觉醒追踪代码水弹：Lv.2 以上水弹自动微调弹道追踪最近怪物/Boss
    if (player.weapons.blaster >= 2 && nearestEnemy) {
      const targetAng = Math.atan2(nearestEnemy.y - b.y, nearestEnemy.x - b.x);
      const spd = Math.hypot(b.vx, b.vy) || 650;
      b.vx = b.vx * 0.9 + Math.cos(targetAng) * spd * 0.1;
      b.vy = b.vy * 0.9 + Math.sin(targetAng) * spd * 0.1;
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;

    let hit = false;
    for (const e of enemies) {
      if (Math.hypot(b.x - e.x, b.y - e.y) < e.r + 12) {
        const isCrit = Math.random() < 0.22;
        const dmg = Math.round(b.dmg * (isCrit ? 1.5 : 1));
        e.hp -= dmg;
        hit = true;
        floatingTexts.push({
          x: e.x + (Math.random() - 0.5) * 14,
          y: e.y - 18,
          vx: (Math.random() - 0.5) * 36,
          vy: -68,
          text: isCrit ? `-${dmg}!` : `-${dmg}`,
          color: isCrit ? '#ffd700' : '#ffffff',
          scale: isCrit ? 1.25 : 1,
          life: 0.55
        });
        if (e.isGoldTreasure && Math.random() < 0.5) {
          coinsList.push({
            x: e.x,
            y: e.y - 12,
            vx: (Math.random() - 0.5) * 180,
            vy: -200,
            age: 0,
            val: 5,
            magnet: false
          });
        }
        break;
      }
    }
    if (hit || b.life <= 0 || b.x < -50 || b.x > W + 50 || b.y > H + 50) {
      bullets.splice(i, 1);
    }
  }

  if (gameMode === 'survivor') {
    enemySpawnTimer -= dt;
    if (enemySpawnTimer <= 0 && enemies.length < 14) {
      enemySpawnTimer = Math.max(0.65, 1.5 - player.level * 0.05);
      spawnEnemy();
    }
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.slowTimer = Math.max(0, (e.slowTimer || 0) - dt);
    const slowMult = e.slowTimer > 0 ? 0.52 : 1;
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;

    if (e.isBoss) {
      e.bossSkillCd = (e.bossSkillCd || 3.2) - dt;
      if (e.bossSkillCd <= 0) {
        e.bossSkillCd = 3.6;
        e.vy = -320;
        shockwaves.push({
          x: e.x,
          y: e.y,
          r: 18,
          maxR: 155,
          color: '#a855f7',
          life: 0.4
        });
      }
    }

    if (e.isFlyer) {
      e.vx = (dx / dist) * e.speed * slowMult;
      e.vy = (dy / dist) * e.speed * slowMult;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
    } else {
      const prevEY = e.y + e.r;
      e.vx = Math.sign(dx) * e.speed * slowMult;
      e.vy += 850 * dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;

      const newEY = e.y + e.r;
      if (e.vy >= 0) {
        for (const p of platforms) {
          if (e.x >= p.x1 - 8 && e.x <= p.x2 + 8 && prevEY <= p.y + 12 && newEY >= p.y - 4) {
            e.y = p.y - e.r;
            e.vy = 0;
            e.jumpCd -= dt;
            if (player.y < e.y - 30 && e.jumpCd <= 0) {
              e.vy = -420;
              e.jumpCd = 1.2;
            }
            break;
          }
        }
      }
      if (e.y > centerFloorY - e.r) {
        e.y = centerFloorY - e.r;
        e.vy = 0;
      }
    }

    e.bladeTick = (e.bladeTick || 0) - dt;
    for (let b = 0; b < bladeCount; b++) {
      const ang = bladeAngle + (b / bladeCount) * Math.PI * 2;
      const bx = player.x + Math.cos(ang) * bladeRadius;
      const by = player.y + Math.sin(ang) * bladeRadius;
      if (Math.hypot(bx - e.x, by - e.y) < e.r + 18) {
        const bladeDmg = (65 + player.weapons.teaBlade * 15) * dt;
        e.hp -= bladeDmg;
        if (player.weapons.teaBlade >= 2) {
          e.slowTimer = 1.8; // 觉醒冰镇乌龙茶刃：减速冰冻怪物！
        }
        if (e.bladeTick <= 0) {
          e.bladeTick = 0.24;
          floatingTexts.push({
            x: e.x + (Math.random() - 0.5) * 14,
            y: e.y - 16,
            vx: (Math.random() - 0.5) * 30,
            vy: -58,
            text: `-${Math.round(16 + player.weapons.teaBlade * 4)}`,
            color: '#00ff9d',
            scale: 0.95,
            life: 0.45
          });
        }
      }
    }

    if (dist < e.r + 18) {
      player.hp -= 14 * dt;
      if (player.hp <= 0) {
        player.hp = player.maxHp;
        // 幸存者打工体力耗尽时，携带赚到的全部金币安全返回养成模式干饭休息
        switchMode('pet');
        setPlayerEmote('打工收工！带金币回来吃大餐咯~', 2.6);
        break;
      }
    }

    if (e.hp <= 0) {
      player.kills++;
      const dropCount = e.isElite ? 3 : 1;
      for (let d = 0; d < dropCount; d++) {
        const isHeal = Math.random() < 0.16;
        gems.push({
          x: e.x + (Math.random() - 0.5) * 12,
          y: e.y - 6,
          vx: (Math.random() - 0.5) * 130,
          vy: -170 - Math.random() * 80,
          age: 0,
          isHeal,
          val: e.isElite ? 18 : 10,
          color: isHeal ? '#ff2a7a' : e.isElite ? '#ffd700' : '#00f3ff',
          magnet: false
        });
      }
      // 幸存者作为赚金币小游戏：击败怪物爆出物理弹跳金币（摸鱼大魔王爆出 18 枚黄金喷泉！）
      const coinDrops = e.isBoss ? 18 : e.isGoldTreasure ? 8 : e.isElite ? 5 : 2;
      for (let c = 0; c < coinDrops; c++) {
        coinsList.push({
          x: e.x + (Math.random() - 0.5) * 24,
          y: e.y - 12,
          vx: (Math.random() - 0.5) * (e.isBoss ? 280 : 190),
          vy: -230 - Math.random() * (e.isBoss ? 160 : 100),
          age: 0,
          val: e.isBoss ? 12 : e.isGoldTreasure ? 9 : e.isElite ? 8 : 4,
          magnet: Boolean(e.isBoss)
        });
      }
      if (e.isBoss) {
        playSfx('star');
        petAudio.haptic('win');
        player.cheerTimer = 1.8;
        addAffectionXp(45, '讨伐大魔王 +45 亲密');
        setPlayerEmote('耶！成功击败深海摸鱼大魔王，满屏金币雨咯 ^w^!', 2.6, 'cheer', true);
      } else if (player.kills % 10 === 0) {
        spawnEnemy(true);
      }
      // 每击败 6 只怪物自动释放一次「🌊 巨鲸潮汐觉醒冲击波」清场爆金币
      if (player.kills % 6 === 0) {
        shockwaves.push({
          x: player.x,
          y: player.y,
          r: 16,
          maxR: 230,
          color: '#00f3ff',
          life: 0.48
        });
        setPlayerEmote('巨鲸潮汐觉醒冲击!', 1.5, 'cheer');
        for (const other of enemies) {
          if (other !== e && Math.hypot(other.x - player.x, other.y - player.y) < 230) {
            other.hp -= 65;
            other.vy = -260;
            other.slowTimer = 1.5;
          }
        }
      }
      enemies.splice(i, 1);
    }
  }

  // 更新幸存者掉落的物理金币
  const magnetRange = player.equipped.aura ? 450 : 155 + (player.weapons.magnet || 1) * 35;
  for (let i = coinsList.length - 1; i >= 0; i--) {
    const c = coinsList[i];
    c.age += dt;
    c.x += flow.dx;
    c.y += flow.dy;
    const dx = player.x - c.x;
    const dy = player.y - c.y;
    const dist = Math.hypot(dx, dy) || 1;

    if (c.age > 0.28 && (dist < magnetRange || c.age > 1.1 || c.magnet)) {
      c.magnet = true;
      c.x += (dx / dist) * 520 * dt;
      c.y += (dy / dist) * 520 * dt;
    } else {
      c.vy += 720 * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.vx *= 0.96;
      if (c.y > centerFloorY - 8) {
        c.y = centerFloorY - 8;
        c.vy = -Math.abs(c.vy) * 0.48;
      }
    }

    if (dist < 30 && c.age > 0.16) {
      addCoins(c.val, player.x, player.y - 26);
      coinsList.splice(i, 1);
    }
  }

  for (let i = gems.length - 1; i >= 0; i--) {
    const g = gems[i];
    g.age += dt;
    const dx = player.x - g.x;
    const dy = player.y - g.y;
    const dist = Math.hypot(dx, dy) || 1;

    if (g.age > 0.38 && (dist < 165 || g.age > 0.95 || g.magnet)) {
      g.magnet = true;
      g.x += (dx / dist) * 460 * dt;
      g.y += (dy / dist) * 460 * dt;
    } else {
      g.vy += 680 * dt;
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      g.vx *= 0.95;
      if (g.y > centerFloorY - 8) {
        g.y = centerFloorY - 8;
        g.vy = -Math.abs(g.vy) * 0.35;
      }
    }

    if (dist < 28 && g.age > 0.2) {
      if (g.isHeal) {
        player.hp = Math.min(player.maxHp, player.hp + 18);
        floatingTexts.push({
          x: player.x,
          y: player.y - 34,
          vx: 0,
          vy: -55,
          text: '+18 HP',
          color: '#00ff9d',
          scale: 1.05,
          life: 0.65
        });
      } else {
        player.xp += g.val;
      }
      gems.splice(i, 1);
      if (player.xp >= player.xpNext) {
        player.xp -= player.xpNext;
        player.level++;
        player.xpNext = Math.round(player.xpNext * 1.35);
        player.hp = Math.min(player.maxHp, player.hp + 25);
        applySeamlessUpgrade();
        floatingTexts.push({
          x: player.x,
          y: player.y - 44,
          vx: 0,
          vy: -60,
          text: `LV.${player.level} UP!`,
          color: '#ffd700',
          scale: 1.3,
          life: 0.9
        });
      }
    }
  }

  for (let i = shockwaves.length - 1; i >= 0; i--) {
    const sw = shockwaves[i];
    sw.life -= dt;
    sw.r += ((sw.maxR - sw.r) * 8 + 180) * dt;
    if (sw.life <= 0) shockwaves.splice(i, 1);
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    if (pt.gravity) pt.vy += pt.gravity * dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.life -= dt;
    if (pt.life <= 0) particles.splice(i, 1);
  }

  for (let i = touchRipples.length - 1; i >= 0; i--) {
    touchRipples[i].life -= dt;
    if (touchRipples[i].life <= 0) touchRipples.splice(i, 1);
  }

  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.x += (ft.vx || 0) * dt;
    ft.y += (ft.vy || -55) * dt;
    ft.life -= dt;
    if (ft.life <= 0) floatingTexts.splice(i, 1);
  }
}

function renderEntities(now) {
  ctx.save();

  drawStarGoal(ctx, starTarget, player, now);

  for (const g of gems) {
    ctx.save();
    ctx.translate(g.x, g.y + Math.sin(now * 0.01 + g.x) * 2);
    if (isReady(images.vfxGem)) {
      const sz = g.color === '#ffd700' ? 26 : 22;
      ctx.drawImage(images.vfxGem, -sz * 0.5, -sz * 0.5, sz, sz);
    }
    ctx.restore();
  }

  const onDrink = player.onGround && player.currentRole === 'drink';
  const bladeCount = gameMode === 'survivor' ? Math.min(4, player.weapons.teaBlade + (onDrink ? 1 : 0)) : 0;
  for (let b = 0; b < bladeCount; b++) {
    const ang = bladeAngle + (b / bladeCount) * Math.PI * 2;
    const bx = player.x + Math.cos(ang) * 64;
    const by = player.y + Math.sin(ang) * 64;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(ang + now * 0.01);
    if (isReady(images.upgBlade)) {
      ctx.drawImage(images.upgBlade, -16, -16, 32, 32);
    }
    ctx.restore();
  }

  // 渲染幸存者掉落的手绘蓝鲸金币
  for (const c of coinsList) {
    ctx.save();
    ctx.translate(c.x, c.y + Math.sin(now * 0.012 + c.x) * 2);
    const spinW = Math.max(0.35, Math.abs(Math.cos(now * 0.01 + c.x)));
    ctx.scale(spinW, 1);
    if (isReady(images.uiCoin)) {
      ctx.drawImage(images.uiCoin, -13, -13, 26, 26);
    }
    ctx.restore();
  }

  // 渲染冲击波光环（🌊 鲸跃浪潮 / 🐥 小黄鸭音波）
  for (const sw of shockwaves) {
    ctx.save();
    ctx.strokeStyle = sw.color;
    ctx.globalAlpha = Math.max(0, sw.life * 2.2);
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 渲染实景桌面 DIY 微缩家具（小夜灯 / 码农工位 / 蓝鲸猫爬架）
  if (gameMode === 'pet') {
    for (const furn of furnitureList) {
      drawFurnitureItem(ctx, furn, now, vision.isDarkRoom, Boolean(drawerEl && !drawerEl.classList.contains('hidden')));
    }
  }

  // 渲染养成互动道具（高清二次元贴图美食与物理弹力玩具球）
  for (const it of petItems) {
    if (it.type === 'food' || it.type === 'rice') {
      drawFoodItem(ctx, it, now);
    } else {
      drawToyItem(ctx, it, now);
    }
  }

  // 渲染手掌托举接美食小游戏的天降道具
  for (const ci of catchItems) {
    if (ci.kind === 'rice' || ci.kind === 'bento' || ci.kind === 'cake') {
      drawFoodItem(ctx, { x: ci.x, y: ci.y, foodId: ci.kind, squashTimer: 0, eatingProgress: 0 }, now);
    } else {
      ctx.save();
      ctx.translate(ci.x, ci.y - 12);
      ctx.rotate(Math.sin(now * 0.015 + ci.x) * 0.14);
      const sp = ci.kind === 'alarm' ? images.propAlarm : images.uiCoin;
      if (isReady(sp)) {
        const sz = ci.kind === 'alarm' ? 40 : 32;
        ctx.drawImage(sp, -sz * 0.5, -sz * 0.5, sz, sz);
      }
      ctx.restore();
    }
  }

  drawHeroSprite(ctx, player, now);

  for (const e of enemies) {
    drawEnemySprite(ctx, e, now, player.x);
  }

  for (const b of bullets) {
    ctx.save();
    ctx.translate(b.x, b.y);
    if (isReady(images.upgBlaster)) {
      ctx.drawImage(images.upgBlaster, -12, -12, 24, 24);
    }
    ctx.restore();
  }

  drawInteractionVfx(ctx, particles, touchRipples, fingerSparkle, now);

  for (const ft of floatingTexts) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, ft.life * 2.5);
    const fontSize = Math.round(14 * (ft.scale || 1));
    ctx.font = `900 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.lineWidth = 3.5;
    ctx.strokeText(ft.text, ft.x, ft.y);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }

  ctx.restore();
}

function updateHUD() {
  const lvEl = document.getElementById('hud-pet-lv');
  if (lvEl) lvEl.textContent = `LV.${player.level}`;

  const hpPct = Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100));
  document.getElementById('hud-hp-bar').style.width = `${hpPct}%`;

  const hungerEl = document.getElementById('hud-hunger-bar');
  if (hungerEl) {
    const hungerPct = Math.max(0, Math.min(100, (player.hunger / player.maxHunger) * 100));
    hungerEl.style.width = `${hungerPct}%`;
  }

  const xpPct = Math.max(0, Math.min(100, (player.xp / player.xpNext) * 100));
  document.getElementById('hud-xp-bar').style.width = `${xpPct}%`;

  const coinEl = document.getElementById('hud-coins');
  if (coinEl) {
    const buffTag = player.foodBuffTimer > 0 ? ` · x${player.foodCoinMult}` : '';
    coinEl.textContent = `${player.coins}${buffTag}`;
  }

  // 左上角角色头像随当前互动情绪实时切换表情，让整个 HUD 活起来！
  const avatarImg = document.querySelector('#hud-avatar-btn .avatar-img');
  if (avatarImg) {
    let nextAvatar = './assets/hero_idle2.webp?v=hd5';
    if (player.photoPoseTimer > 0) {
      nextAvatar = './assets/hero_pose_peace.webp?v=hd5';
    } else if (player.cheerTimer > 0) {
      nextAvatar = './assets/hero_pose_cheer.webp?v=hd5';
    } else if (player.tsundereTimer > 0 || player.isPickedUp) {
      nextAvatar = './assets/hero_patted_tsundere.webp?v=hd5';
    } else if (player.rubbingTimer > 0) {
      nextAvatar = './assets/hero_idle_blink.webp?v=hd5';
    } else if (player.isNapping || player.petAction === 'sleep') {
      nextAvatar = './assets/hero_sleep_loaf.webp?v=hd5';
    }
    if (avatarImg.dataset.currSrc !== nextAvatar) {
      avatarImg.dataset.currSrc = nextAvatar;
      avatarImg.src = nextAvatar;
    }
  }
}

requestAnimationFrame(gameLoop);
