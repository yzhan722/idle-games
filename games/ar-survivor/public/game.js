// game.js — DeepSeek娘桌面宠物级实景交互（抓边爬台 / 蹲伏戳物体 / 坐边缘晃腿 / 摸头傲娇 / 物理轨迹回归中心）

import { ARVisionEngine } from './vision.js?v=hd18';
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
} from './sprites.js?v=hd18';
import { petAudio } from './audio.js?v=hd18';

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
        const conf = player.placedFurniture && player.placedFurniture[furn.key];
        const ratioX = conf && typeof conf.xRatio === 'number' ? conf.xRatio * W : furn.x * sx;
        furn.x = Math.max(56, Math.min(W - 56, ratioX));
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
        roomTheme: player.roomTheme,
        musicTrack: petAudio.getTrackInfo().index,
        weapons: player.weapons,
        bestShiftRecord: player.bestShiftRecord,
        topicsChatted: player.topicsChatted
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
  topicsChatted: Math.max(0, Number(savedPet.topicsChatted) || 0),
  ownedDress: savedPet.ownedDress || { furn_lamp: true },
  equipped: savedPet.equipped || {},
  placedFurniture: savedPet.placedFurniture || {
    lamp: { xRatio: 0.20, manualOn: true }
  },
  roomTheme: savedPet.roomTheme === 'star_aquarium' ? 'star_aquarium' : 'cream_study',
  weapons: savedPet.weapons || {
    blaster: 1,
    teaBlade: 1,
    magnet: 1,
    boots: 0
  },
  bestShiftRecord: {
    bestKills: Math.max(0, Number(savedPet.bestShiftRecord?.bestKills) || 0),
    bestCoins: Math.max(0, Number(savedPet.bestShiftRecord?.bestCoins) || 0),
    bestShiftLv: Math.max(1, Number(savedPet.bestShiftRecord?.bestShiftLv) || 1),
    bossesDefeated: Math.max(0, Number(savedPet.bestShiftRecord?.bossesDefeated) || 0)
  }
};

const ROOM_THEMES = [
  {
    id: 'cream_study',
    name: '晴空奶油书房',
    subtitle: '暖阳海风木桌',
    thumb: './assets/bg_healing_room.webp?v=hd18'
  },
  {
    id: 'star_aquarium',
    name: '深海星梦水族馆',
    subtitle: '星光水母与蓝鲸穹顶',
    thumb: './assets/bg_aquarium_room.webp?v=hd18'
  }
];

const INTIMACY_MILESTONES = [
  {
    level: 3,
    itemId: 'shell_clip',
    kind: 'headwear',
    name: '星海贝壳发卡',
    img: './assets/item_shell_clip.webp?v=hd18',
    desc: '亲密 LV.3 解锁 · 互动亲密经验 +20%',
    toastDesc: '已自动佩戴限定头饰，每次互动亲密经验 +20%'
  },
  {
    level: 5,
    itemId: 'furn_musicbox',
    furnKey: 'musicbox',
    kind: 'furniture',
    name: '星梦八音盒唱片机',
    img: './assets/furn_musicbox.webp?v=hd18',
    desc: '亲密 LV.5 解锁 · 轻点切换3首治愈八音盒曲目',
    toastDesc: '已自动摆上桌面，轻点唱片机可切换治愈曲目~'
  },
  {
    level: 8,
    itemId: 'star_wreath',
    kind: 'headwear',
    name: '深海星梦花环',
    img: './assets/item_star_wreath.webp?v=hd18',
    desc: '亲密 LV.8 解锁 · 打工金币与亲密收益 +15%',
    toastDesc: '已自动佩戴典藏头饰，打工金币与亲密收益 +15%'
  }
];

vision.setRoomTheme(player.roomTheme);
if (typeof savedPet.musicTrack === 'number') {
  petAudio.setBgmTrack(savedPet.musicTrack);
}

let milestoneToastTimer = null;
const milestoneToastQueue = [];

function hideMilestoneToast() {
  if (milestoneToastTimer) {
    clearTimeout(milestoneToastTimer);
    milestoneToastTimer = null;
  }
  const toastEl = document.getElementById('milestone-toast');
  if (toastEl) toastEl.classList.add('hidden');
  if (milestoneToastQueue.length > 0) {
    const next = milestoneToastQueue.shift();
    setTimeout(() => showMilestoneToast(next), 180);
  }
}

function showMilestoneToast(milestone) {
  if (!milestone) return;
  const toastEl = document.getElementById('milestone-toast');
  if (!toastEl) return;
  if (!toastEl.classList.contains('hidden')) {
    milestoneToastQueue.push(milestone);
    return;
  }
  const imgEl = document.getElementById('milestone-toast-img');
  const badgeEl = document.getElementById('milestone-toast-badge');
  const titleEl = document.getElementById('milestone-toast-title');
  const descEl = document.getElementById('milestone-toast-desc');
  if (imgEl) imgEl.src = milestone.img;
  if (badgeEl) badgeEl.textContent = `亲密 LV.${milestone.level} 里程碑解锁`;
  if (titleEl) titleEl.textContent = milestone.name;
  if (descEl) descEl.textContent = milestone.toastDesc || milestone.desc;
  toastEl.classList.remove('hidden');
  if (milestoneToastTimer) clearTimeout(milestoneToastTimer);
  milestoneToastTimer = setTimeout(() => {
    hideMilestoneToast();
  }, 4600);
}

function setRoomTheme(themeId, announce = true) {
  const valid = ROOM_THEMES.some((t) => t.id === themeId) ? themeId : 'cream_study';
  player.roomTheme = valid;
  vision.setRoomTheme(valid);
  const themeSpec = ROOM_THEMES.find((t) => t.id === valid) || ROOM_THEMES[0];
  const btnTheme = document.getElementById('btn-room-theme');
  if (btnTheme) {
    btnTheme.dataset.theme = valid;
    btnTheme.title = `当前房间主题：${themeSpec.name}（点击切换）`;
  }
  savePetState();
  if (announce) {
    playSfx('star');
    spawnInteractVfx(player.x, player.y - 26, 'sparkle', 8);
    if (vision.mode === 'camera') {
      setPlayerEmote(`已记住房间主题「${themeSpec.name}」，关闭摄像头即可欣赏~`, 2.2, 'happy');
    } else {
      setPlayerEmote(`切换治愈房间主题：「${themeSpec.name}」~`, 2.0, 'happy', true);
    }
  }
  const petDrawer = document.getElementById('pet-drawer');
  if (petDrawer && !petDrawer.classList.contains('hidden') && typeof renderDrawerItems === 'function') {
    const dressTabActive = document.querySelector('.drawer-tab[data-tab="dress"]')?.classList.contains('active');
    if (dressTabActive) renderDrawerItems();
  }
}

function reconcileIntimacyMilestones({ showToast = true } = {}) {
  let changed = false;
  let newlyUnlocked = null;
  for (const m of INTIMACY_MILESTONES) {
    if (player.level >= m.level && !player.ownedDress[m.itemId]) {
      player.ownedDress[m.itemId] = true;
      if (m.furnKey) {
        if (!player.placedFurniture[m.furnKey]) {
          player.placedFurniture[m.furnKey] = {
            xRatio: 0.62,
            manualOn: true
          };
        }
        if (typeof syncPlacedFurniture === 'function') {
          syncPlacedFurniture();
        }
      } else {
        player.equipped[m.itemId] = true;
      }
      changed = true;
      newlyUnlocked = m;
      if (showToast) {
        showMilestoneToast(m);
      }
    }
  }
  if (changed) {
    if (showToast && newlyUnlocked) {
      playSfx('star');
      spawnInteractVfx(player.x, player.y - 30, 'love', 14);
      setPlayerEmote(`亲密 LV.${newlyUnlocked.level} 达成！解锁「${newlyUnlocked.name}」~`, 2.6, 'cheer', true);
    }
    savePetState();
    const petDrawer = document.getElementById('pet-drawer');
    if (petDrawer && !petDrawer.classList.contains('hidden') && typeof renderDrawerItems === 'function') {
      const dressTabActive = document.querySelector('.drawer-tab[data-tab="dress"]')?.classList.contains('active');
      if (dressTabActive) renderDrawerItems();
    }
  }
  return changed;
}

function onPlayerLevelUp() {
  reconcileIntimacyMilestones({ showToast: true });
}

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

let survivorSessionCoins = 0;
let survivorSessionKills = 0;
let lastParkourHudKey = '';
const survivorVfxBursts = [];

const SURVIVOR_SKILL_POOL = [
  {
    id: 'blaster',
    name: '鲸鱼水炮',
    img: './assets/upg_blaster.webp?v=hd6',
    maxLv: 3,
    desc: '强化水弹连发数量、追踪弹速与单发威力。',
    synergy: '满级+冰泡凝滞 → 深海蓝鲸巨浪'
  },
  {
    id: 'teaBlade',
    name: '茗香茶刃',
    img: './assets/upg_blade.webp?v=hd6',
    maxLv: 3,
    desc: '增加环绕乌龙茶刃飞叶数量、转速与切割伤害。',
    synergy: '满级+猫爪闪电链 → 星海茶刃风暴'
  },
  {
    id: 'frostBubble',
    name: '冰泡凝滞',
    img: './assets/sk_frost_bubble.webp?v=hd15',
    maxLv: 3,
    desc: '周期发射寒霜冰泡弹，命中绽放冰雾大幅减速周围怪物。',
    synergy: '共鸣核心：鲸鱼水炮'
  },
  {
    id: 'catLightning',
    name: '猫爪闪电链',
    img: './assets/sk_cat_lightning.webp?v=hd15',
    maxLv: 3,
    desc: '攻击与茶刃触发萌爪星雷跳跃，在多只怪物间弹射雷伤。',
    synergy: '共鸣核心：茗香茶刃'
  },
  {
    id: 'onigiriHeal',
    name: '饭团急救',
    img: './assets/sk_onigiri_heal.webp?v=hd15',
    maxLv: 3,
    desc: '立即恢复35体力与饱食，每秒持续回血并扩大吸宝距离。',
    synergy: '打工续航 · 经验磁吸'
  },
  {
    id: 'starPhantom',
    name: '星光幻影',
    img: './assets/sk_star_phantom.webp?v=hd15',
    maxLv: 3,
    desc: '移速与闪避减伤提升12%/级，移动时放飞追踪星影弹。',
    synergy: '灵巧身法 · 星影追击'
  },
  {
    id: 'critCharm',
    name: '暴击护符',
    img: './assets/sk_crit_charm.webp?v=hd15',
    maxLv: 3,
    desc: '暴击率+12%/级、暴击伤害+30%/级，暴击概率爆额外金币。',
    synergy: '会心爆发 · 招财福袋'
  }
];

const SURVIVOR_EVOLUTIONS = [
  {
    id: 'superWhale',
    isEvolution: true,
    reqWeapon: 'blaster',
    reqPassive: 'frostBubble',
    name: '深海蓝鲸巨浪',
    img: './assets/upg_super_whale.webp?v=hd15',
    desc: '超武觉醒！水炮进化为贯通巨浪幼鲸，并周期掀起全屏深海潮汐。',
    synergy: '鲸鱼水炮 × 冰泡凝滞 共鸣完成'
  },
  {
    id: 'superTeablade',
    isEvolution: true,
    reqWeapon: 'teaBlade',
    reqPassive: 'catLightning',
    name: '星海茶刃风暴',
    img: './assets/upg_super_teablade.webp?v=hd15',
    desc: '超武觉醒！双环六叶翠玉茶刃极速旋切，高频引爆猫爪星雷链。',
    synergy: '茗香茶刃 × 猫爪闪电链 共鸣完成'
  }
];

const SURVIVOR_BOSS_NAMES = [
  '加班狂魔 · 章鱼主管',
  '死线催命 · 摸鱼大魔王',
  '终极考勤 · 深渊KPI巨兽'
];

const survivorRun = {
  shiftLv: 1,
  shiftXp: 0,
  shiftXpNext: 16,
  skills: {
    blaster: 1,
    teaBlade: 1,
    frostBubble: 0,
    catLightning: 0,
    onigiriHeal: 0,
    starPhantom: 0,
    critCharm: 0
  },
  evolved: {
    superWhale: false,
    superTeablade: false
  },
  overclockBonus: 0,
  choosingSkill: false,
  queuedModals: [],
  currentChoices: [],
  nextBossKills: 12,
  bossWave: 0,
  frostTimer: 1.3,
  phantomTimer: 1.0,
  tsunamiTimer: 3.6,
  lightningIcd: 0,
  isNewKillRecord: false
};

function getShiftBadgeTitle(bestKills) {
  if (bestKills >= 80) return '深海王牌店长';
  if (bestKills >= 45) return '星海金牌销冠';
  if (bestKills >= 20) return '元气熟练工';
  if (bestKills >= 5) return '勤勉实习生';
  return '新晋打工人';
}

function updateBestShiftRecord() {
  const rec = player.bestShiftRecord;
  let dirty = false;
  if (survivorSessionKills > rec.bestKills) {
    rec.bestKills = survivorSessionKills;
    survivorRun.isNewKillRecord = true;
    dirty = true;
  }
  if (survivorSessionCoins > rec.bestCoins) {
    rec.bestCoins = survivorSessionCoins;
    dirty = true;
  }
  if (survivorRun.shiftLv > rec.bestShiftLv) {
    rec.bestShiftLv = survivorRun.shiftLv;
    dirty = true;
  }
  if (dirty) savePetState();
}

function resetSurvivorRun() {
  survivorRun.shiftLv = 1;
  survivorRun.shiftXp = 0;
  survivorRun.shiftXpNext = 16;
  survivorRun.skills = {
    blaster: 1,
    teaBlade: 1,
    frostBubble: 0,
    catLightning: 0,
    onigiriHeal: 0,
    starPhantom: 0,
    critCharm: 0
  };
  survivorRun.evolved = {
    superWhale: false,
    superTeablade: false
  };
  survivorRun.overclockBonus = 0;
  survivorRun.choosingSkill = false;
  survivorRun.queuedModals = [];
  survivorRun.currentChoices = [];
  survivorRun.nextBossKills = 12;
  survivorRun.bossWave = 0;
  survivorRun.frostTimer = 1.2;
  survivorRun.phantomTimer = 0.9;
  survivorRun.tsunamiTimer = 3.5;
  survivorRun.lightningIcd = 0;
  survivorRun.isNewKillRecord = false;
  survivorVfxBursts.length = 0;
  document.getElementById('survivor-skill-modal')?.classList.add('hidden');
}

function syncSurvivorSkillStrip() {
  const stripEl = document.getElementById('surv-skill-strip');
  if (!stripEl) return;
  if (gameMode !== 'survivor') {
    stripEl.classList.add('hidden');
    return;
  }
  const badges = [];
  for (const evo of SURVIVOR_EVOLUTIONS) {
    if (survivorRun.evolved[evo.id]) {
      badges.push({ img: evo.img, tag: 'MAX', isSuper: true, title: evo.name });
    }
  }
  for (const sk of SURVIVOR_SKILL_POOL) {
    const lv = survivorRun.skills[sk.id] || 0;
    if (lv <= 0) continue;
    if (sk.id === 'blaster' && survivorRun.evolved.superWhale) continue;
    if (sk.id === 'teaBlade' && survivorRun.evolved.superTeablade) continue;
    badges.push({ img: sk.img, tag: `Lv${lv}`, isSuper: false, title: sk.name });
  }
  if (badges.length === 0) {
    stripEl.classList.add('hidden');
    return;
  }
  stripEl.classList.remove('hidden');
  stripEl.innerHTML = badges
    .map(
      (b) =>
        `<span class="surv-strip-pill ${b.isSuper ? 'is-super' : ''}" title="${b.title}"><img src="${b.img}" alt="" /><i class="surv-strip-lv">${b.tag}</i></span>`
    )
    .join('');
}

function syncSurvivorBossBar() {
  const barEl = document.getElementById('survivor-boss-bar');
  if (!barEl) return;
  if (gameMode !== 'survivor') {
    barEl.classList.add('hidden');
    return;
  }
  const boss = enemies.find((e) => e.isBoss && e.hp > 0);
  if (!boss) {
    barEl.classList.add('hidden');
    return;
  }
  barEl.classList.remove('hidden');
  const pct = Math.max(0, Math.min(100, Math.round((boss.hp / Math.max(1, boss.maxHp)) * 100)));
  const nameEl = document.getElementById('surv-boss-name');
  const hpTextEl = document.getElementById('surv-boss-hp-text');
  const fillEl = document.getElementById('surv-boss-fill');
  if (nameEl) nameEl.textContent = `班次首领 · ${boss.bossName || '深海摸鱼大魔王'}`;
  if (hpTextEl) hpTextEl.textContent = `${pct}%`;
  if (fillEl) fillEl.style.width = `${pct}%`;
}

function rollSurvivorChoices() {
  const result = [];
  for (const evo of SURVIVOR_EVOLUTIONS) {
    if (
      !survivorRun.evolved[evo.id] &&
      (survivorRun.skills[evo.reqWeapon] || 0) >= 3 &&
      (survivorRun.skills[evo.reqPassive] || 0) >= 3
    ) {
      result.push({
        id: evo.id,
        isEvolution: true,
        tagLabel: '超武觉醒',
        name: evo.name,
        img: evo.img,
        desc: evo.desc,
        synergy: evo.synergy
      });
    }
  }

  const candidates = SURVIVOR_SKILL_POOL.filter((sk) => (survivorRun.skills[sk.id] || 0) < sk.maxLv);
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  for (const sk of candidates) {
    if (result.length >= 3) break;
    const curLv = survivorRun.skills[sk.id] || 0;
    const nextLv = curLv + 1;
    result.push({
      id: sk.id,
      isEvolution: false,
      tagLabel: curLv === 0 ? '新秘技 · Lv.1' : `Lv.${curLv} → Lv.${nextLv}${nextLv >= sk.maxLv ? ' 满级' : ''}`,
      name: sk.name,
      img: sk.img,
      desc: sk.desc,
      synergy: sk.synergy
    });
  }

  const fallbackPool = [
    {
      id: 'supply_heal',
      isEvolution: false,
      tagLabel: '班次补给',
      name: '暖心饭团便当',
      img: './assets/sk_onigiri_heal.webp?v=hd15',
      desc: '立即恢复全部体力与饱食度，并获得护体元气。',
      synergy: '即时满血续航'
    },
    {
      id: 'supply_coins',
      isEvolution: false,
      tagLabel: '班次奖金',
      name: '深海绩效红包',
      img: './assets/ui_badge_shift.webp?v=hd15',
      desc: '立即发放 +45 打工金币奖励，计入本班绩效。',
      synergy: '即时金币赏金'
    },
    {
      id: 'supply_overclock',
      isEvolution: false,
      tagLabel: '全武超载',
      name: '星耀火力增幅',
      img: './assets/sk_crit_charm.webp?v=hd15',
      desc: '本班次全武器与超武最终伤害永久提升 +18%。',
      synergy: '无限叠加强化'
    }
  ];
  for (const fb of fallbackPool) {
    if (result.length >= 3) break;
    result.push(fb);
  }
  return result.slice(0, 3);
}

function openSurvivorSkillModal(kickerText = '打工班次升级 · 暂停保护中') {
  if (gameMode !== 'survivor') return;
  if (survivorRun.choosingSkill) {
    survivorRun.queuedModals.push(kickerText);
    return;
  }
  const modalEl = document.getElementById('survivor-skill-modal');
  const gridEl = document.getElementById('surv-card-grid');
  const kickerEl = document.getElementById('surv-modal-kicker');
  const titleEl = document.getElementById('surv-modal-title');
  if (!modalEl || !gridEl) return;

  const choices = rollSurvivorChoices();
  survivorRun.currentChoices = choices;
  survivorRun.choosingSkill = true;
  if (kickerEl) kickerEl.textContent = kickerText;
  if (titleEl) {
    const hasEvo = choices.some((c) => c.isEvolution);
    titleEl.textContent = hasEvo
      ? `班次 Lv.${survivorRun.shiftLv} · 超武共鸣觉醒！`
      : `班次 Lv.${survivorRun.shiftLv} · 三选一手账秘技`;
  }

  gridEl.innerHTML = '';
  choices.forEach((ch) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `surv-skill-card ${ch.isEvolution ? 'is-evolution' : ''}`.trim();
    btn.dataset.skillId = ch.id;
    btn.innerHTML = `
      <span class="surv-card-tag">${ch.tagLabel}</span>
      <img src="${ch.img}" alt="" class="surv-card-thumb" />
      <span class="surv-card-name">${ch.name}</span>
      <span class="surv-card-desc">${ch.desc}</span>
      <span class="surv-card-synergy">${ch.synergy}</span>
    `;
    const onSelect = (ev) => {
      if (ev) {
        ev.preventDefault();
        ev.stopPropagation();
      }
      applySurvivorSkillChoice(ch.id);
    };
    btn.addEventListener('pointerup', onSelect);
    btn.addEventListener('click', onSelect);
    gridEl.appendChild(btn);
  });

  modalEl.classList.remove('hidden');
  playSfx('star');
}

function applySurvivorSkillChoice(skillId) {
  if (!survivorRun.choosingSkill) return;
  const chosen = survivorRun.currentChoices.find((c) => c.id === skillId) || survivorRun.currentChoices[0];
  if (!chosen) return;

  if (skillId === 'superWhale') {
    survivorRun.evolved.superWhale = true;
    survivorRun.tsunamiTimer = 0.25;
    player.cheerTimer = 2.0;
    setPlayerEmote('超武觉醒：深海蓝鲸巨浪！横扫全场咯~', 2.6, 'cheer', true);
  } else if (skillId === 'superTeablade') {
    survivorRun.evolved.superTeablade = true;
    player.cheerTimer = 2.0;
    setPlayerEmote('超武觉醒：星海茶刃风暴！双环飞叶全开~', 2.6, 'cheer', true);
  } else if (skillId === 'supply_heal') {
    player.hp = player.maxHp;
    player.hunger = player.maxHunger;
    setPlayerEmote('吃饱暖心饭团，体力全满继续冲!', 2.0, 'happy', true);
  } else if (skillId === 'supply_coins') {
    addCoins(45, player.x, player.y - 30);
    setPlayerEmote('领到深海绩效红包 +45 金币!', 2.0, 'happy', true);
  } else if (skillId === 'supply_overclock') {
    survivorRun.overclockBonus += 0.18;
    setPlayerEmote('星耀火力超载 +18%!', 2.0, 'proud', true);
  } else if (skillId in survivorRun.skills) {
    survivorRun.skills[skillId] = Math.min(3, (survivorRun.skills[skillId] || 0) + 1);
    if (skillId === 'onigiriHeal') {
      player.hp = Math.min(player.maxHp, player.hp + 35);
      player.hunger = Math.min(player.maxHunger, player.hunger + 25);
    }
    player.happyTimer = 1.4;
    setPlayerEmote(`习得『${chosen.name}』Lv.${survivorRun.skills[skillId]}!`, 2.0, 'happy', true);
  }

  playSfx('star');
  spawnInteractVfx(player.x, player.y - 24, 'sparkle', 9);
  survivorRun.choosingSkill = false;
  survivorRun.currentChoices = [];
  document.getElementById('survivor-skill-modal')?.classList.add('hidden');
  syncSurvivorHud();
  syncSurvivorSkillStrip();

  if (survivorRun.queuedModals.length > 0 && gameMode === 'survivor') {
    const nextKicker = survivorRun.queuedModals.shift();
    openSurvivorSkillModal(nextKicker);
  }
}

document.getElementById('survivor-skill-modal')?.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
});

window.addEventListener('keydown', (e) => {
  if (!survivorRun.choosingSkill || gameMode !== 'survivor') return;
  if (e.key === '1' && survivorRun.currentChoices[0]) applySurvivorSkillChoice(survivorRun.currentChoices[0].id);
  if (e.key === '2' && survivorRun.currentChoices[1]) applySurvivorSkillChoice(survivorRun.currentChoices[1].id);
  if (e.key === '3' && survivorRun.currentChoices[2]) applySurvivorSkillChoice(survivorRun.currentChoices[2].id);
});

function syncParkourHud() {
  const hudEl = document.getElementById('parkour-hud');
  if (!hudEl) return;
  if (gameMode !== 'parkour') {
    hudEl.classList.add('hidden');
    lastParkourHudKey = '';
    return;
  }
  hudEl.classList.remove('hidden');
  const totalStars = player.starsCollected || 0;
  const combo = starTarget.combo || 0;
  const nextBounty = 16 + (combo + 1) * 6;
  const key = `${totalStars}|${combo}|${nextBounty}`;
  if (key === lastParkourHudKey) return;
  lastParkourHudKey = key;
  const totalEl = document.getElementById('parkour-total-chip');
  const comboEl = document.getElementById('parkour-combo-chip');
  const bountyEl = document.getElementById('parkour-bounty-val');
  if (totalEl) totalEl.textContent = `摘星 ${totalStars}`;
  if (comboEl) {
    comboEl.textContent = combo > 0 ? `星链 ×${combo}` : '星链 待触发';
    comboEl.classList.toggle('is-hot', combo >= 2);
  }
  if (bountyEl) bountyEl.textContent = `+${nextBounty}`;
}

function syncSurvivorHud() {
  const hudEl = document.getElementById('survivor-hud');
  if (!hudEl) return;
  if (gameMode !== 'survivor') {
    hudEl.classList.add('hidden');
    syncSurvivorSkillStrip();
    syncSurvivorBossBar();
    return;
  }
  hudEl.classList.remove('hidden');
  updateBestShiftRecord();
  const lvEl = document.getElementById('surv-lv-chip');
  const xpFillEl = document.getElementById('surv-xp-mini-fill');
  const killEl = document.getElementById('surv-kill-chip');
  const coinEl = document.getElementById('surv-coin-val');
  const recChipEl = document.getElementById('surv-record-chip');
  const recValEl = document.getElementById('surv-record-val');
  if (lvEl) lvEl.textContent = `班次 Lv.${survivorRun.shiftLv}`;
  if (xpFillEl) {
    const pct = Math.max(0, Math.min(100, Math.round((survivorRun.shiftXp / Math.max(1, survivorRun.shiftXpNext)) * 100)));
    xpFillEl.style.width = `${pct}%`;
  }
  if (killEl) killEl.textContent = `击退 ${survivorSessionKills}`;
  if (coinEl) coinEl.textContent = `+${survivorSessionCoins}`;
  if (recValEl) {
    const best = player.bestShiftRecord.bestKills || 0;
    recValEl.textContent = survivorRun.isNewKillRecord ? `新纪录 ${best}` : `纪录 ${best}`;
  }
  if (recChipEl) {
    recChipEl.classList.toggle('is-new-best', Boolean(survivorRun.isNewKillRecord));
  }
}

function addCoins(amount, x, y, labelPrefix = '') {
  const crownBonus = player.equipped.crown ? 1.25 : 1;
  const wreathBonus = player.equipped.star_wreath ? 1.15 : 1;
  const magnetBonus = 1 + ((player.weapons.magnet || 1) - 1) * 0.15;
  const buffBonus = player.foodBuffTimer > 0 ? player.foodCoinMult : 1;
  const finalCoins = Math.max(1, Math.round(amount * crownBonus * wreathBonus * magnetBonus * buffBonus));
  player.coins += finalCoins;
  if (gameMode === 'survivor') {
    survivorSessionCoins += finalCoins;
    syncSurvivorHud();
  }
  playSfx('coin');
  pulseHudElement('hud-coins-btn');
  const baseX = x ?? player.x;
  const sideOffset = Math.abs(baseX - player.x) < 82 ? (player.x > W * 0.55 ? 92 : -92) : 0;
  const spawnX = Math.max(58, Math.min(W - 58, baseX + sideOffset));
  let spawnY = (y ?? player.y) - 34;
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    if (ft && ft.life > 0.2 && Math.abs(ft.x - spawnX) < 76 && Math.abs(ft.y - spawnY) < 24) {
      spawnY = ft.y - 24;
    }
  }
  floatingTexts.push({
    x: spawnX,
    y: Math.max(76, spawnY),
    vx: (Math.random() - 0.5) * 14,
    vy: -36,
    text: `${labelPrefix}+${finalCoins} 金币`,
    color: '#ffd700',
    scale: 1.12,
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
  const shellBonus = player.equipped.shell_clip ? 1.2 : 1;
  const wreathBonus = player.equipped.star_wreath ? 1.15 : 1;
  const finalAmount = Math.max(1, Math.round(amount * lampBonus * shellBonus * wreathBonus));
  player.xp += finalAmount;
  player.hp = Math.min(player.maxHp, player.hp + 15);
  pulseHudElement('hud-avatar-btn');
  const textStr = labelText || `+${finalAmount} 亲密`;
  const halfTextW = Math.min(96, Math.max(38, textStr.length * 8.5));
  const clearance = Math.max(98, 60 + halfTextW);
  const polaroidEl = document.getElementById('polaroid-card');
  const polaroidOpenRight =
    polaroidEl && !polaroidEl.classList.contains('hidden') && !polaroidEl.classList.contains('polaroid-left');
  const polaroidOpenLeft =
    polaroidEl && !polaroidEl.classList.contains('hidden') && polaroidEl.classList.contains('polaroid-left');
  const xpSide = polaroidOpenRight
    ? -clearance
    : polaroidOpenLeft
      ? clearance
      : player.x > W * 0.55
        ? -clearance
        : clearance;
  const xPad = halfTextW + 14;
  floatingTexts.push({
    x: Math.max(xPad, Math.min(W - xPad, player.x + xpSide)),
    y: polaroidOpenRight || polaroidOpenLeft ? player.y - 74 : player.y - 38,
    vx: 0,
    vy: -34,
    text: textStr,
    color: '#ff9ec7',
    scale: 1.08,
    life: 0.85
  });
  let leveledUp = false;
  while (player.xp >= player.xpNext) {
    player.xp -= player.xpNext;
    player.level++;
    player.xpNext = Math.round(player.xpNext * 1.3);
    leveledUp = true;
    applySeamlessUpgrade();
    spawnInteractVfx(player.x, player.y - 24, 'love', 12);
    floatingTexts.push({
      x: Math.max(64, Math.min(W - 64, player.x - xpSide)),
      y: player.y - 46,
      vx: 0,
      vy: -38,
      text: `亲密 LV.${player.level}!`,
      color: '#ffd700',
      scale: 1.24,
      life: 1.1
    });
  }
  if (leveledUp) {
    onPlayerLevelUp();
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
const furnitureList = []; // 实景桌面微缩家具 ('lamp' | 'pc' | 'tree' | 'musicbox')
const catchItems = []; // 实景手掌托举接白米饭小游戏掉落物
let draggedItem = null;
let draggedFurniture = null;
let lastDarkRoomState = false;

function syncPlacedFurniture() {
  const specs = [
    { key: 'lamp', defaultX: 0.20 },
    { key: 'pc', defaultX: 0.76 },
    { key: 'tree', defaultX: 0.36 },
    { key: 'musicbox', defaultX: 0.62 }
  ];
  for (const sp of specs) {
    const conf = player.placedFurniture && player.placedFurniture[sp.key];
    const existingIdx = furnitureList.findIndex((f) => f.key === sp.key);
    if (conf) {
      const clampedX = Math.max(56, Math.min(W - 56, (typeof conf.xRatio === 'number' ? conf.xRatio : sp.defaultX) * W));
      if (existingIdx === -1) {
        furnitureList.push({
          key: sp.key,
          x: clampedX,
          y: H * 0.68 - 2,
          vy: 0,
          manualOn: conf.manualOn !== undefined ? conf.manualOn : true,
          working: false,
          workTimer: 0,
          noteTimer: 1.8,
          isPlaying: !petAudio.muted,
          trackName: petAudio.getTrackInfo().name,
          isDragging: false,
          squashTimer: 0.2
        });
      }
    } else if (existingIdx !== -1) {
      furnitureList.splice(existingIdx, 1);
    }
  }
}
syncPlacedFurniture();
reconcileIntimacyMilestones({ showToast: false });
setRoomTheme(player.roomTheme, false);

// ================= 桌宠实时小心愿系统（Mini Wishes） =================
const WISH_POOL = [
  { id: 'palm_hold', text: '伸出手掌让我跳上去玩~', actionHint: 'palm' },
  { id: 'chat_topic', text: '点『聊聊天』陪我聊个日常话题~', actionHint: 'chat' },
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
    starTarget.x = Math.max(275, Math.min(W - 140, t.x + t.w * 0.5)); starTarget.y = Math.max(138, H * 0.35, t.y - 30);
    starTarget.targetObjId = t.id;
    starTarget.active = true;
    return;
  }

  if (vision.semanticObjects.length > 0) {
    const candidates = vision.semanticObjects.filter((o) => o.id !== lastStarObjId);
    const pool = candidates.length > 0 ? candidates : vision.semanticObjects;
    pool.sort((a, b) => Math.abs(Math.abs(a.x + a.w * 0.5 - player.x) - 180) - Math.abs(Math.abs(b.x + b.w * 0.5 - player.x) - 180));
    const chosen = pool[0];
    lastStarObjId = chosen.id;
    starTarget.targetObjId = chosen.id;
    starTarget.x = chosen.x + chosen.w * 0.5;
    starTarget.x = Math.max(275, Math.min(W - 140, chosen.x + chosen.w * 0.5)); starTarget.y = Math.max(138, H * 0.35, chosen.y - 30);
    starTarget.active = true;
    return;
  }

  if (vision.edgePlatforms.length > 0) {
    const topEdge = vision.edgePlatforms[0];
    starTarget.targetObjId = null;
    starTarget.x = (topEdge.x1 + topEdge.x2) * 0.5;
    starTarget.x = Math.max(275, Math.min(W - 140, (topEdge.x1 + topEdge.x2) * 0.5)); starTarget.y = Math.max(138, H * 0.35, topEdge.y - 30);
    starTarget.active = true;
    return;
  }

  starTarget.targetObjId = null;
  starTarget.x = Math.random() < 0.5 ? W * (0.22 + Math.random() * 0.12) : W * (0.66 + Math.random() * 0.12);
  starTarget.x = Math.random() < 0.5 ? W * (0.17 + Math.random() * 0.07) : W * (0.76 + Math.random() * 0.08); starTarget.y = Math.max(148, H * (0.38 + Math.random() * 0.10));
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

  // 检测是否点击或长按横向拖拽桌面上的 AR 微缩家具（小夜灯 / 码农工位 / 猫爬架 / 八音盒唱片机）
  if (gameMode === 'pet') {
    for (let i = furnitureList.length - 1; i >= 0; i--) {
      const furn = furnitureList[i];
      if (Math.hypot(pt.x - furn.x, pt.y - (furn.y - 34)) < 54) {
        draggedFurniture = furn;
        furn.isDragging = true;
        furn.dragPointerId = e.pointerId;
        furn.dragOffsetX = furn.x - pt.x;
        furn.dragStartX = pt.x;
        furn.dragStartY = pt.y;
        furn.movedDist = 0;
        furn.holdTime = 0;
        furn.squashTimer = 0.2;
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch (err) {}
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
    if (draggedFurniture.dragPointerId != null && e.pointerId !== draggedFurniture.dragPointerId) return;
    const pt = clientToStage(e.clientX, e.clientY);
    draggedFurniture.movedDist = Math.max(
      draggedFurniture.movedDist || 0,
      Math.hypot(pt.x - draggedFurniture.dragStartX, pt.y - draggedFurniture.dragStartY)
    );
    draggedFurniture.x = Math.max(56, Math.min(W - 56, pt.x + (draggedFurniture.dragOffsetX || 0)));
    draggedFurniture.y = H * 0.68 - 2;
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
    const minDragBodyY = Math.abs(player.x - W * 0.5) < 195 ? 144 : 96;
    player.y = Math.max(minDragBodyY, Math.min(H * 0.82 - 25, pt.y + 22));
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

function finishCanvasTouch(e) {
  if (draggedFurniture) {
    const furn = draggedFurniture;
    draggedFurniture = null;
    furn.isDragging = false;
    if (e && e.pointerId != null) {
      try {
        if (canvas.hasPointerCapture && canvas.hasPointerCapture(e.pointerId)) {
          canvas.releasePointerCapture(e.pointerId);
        }
      } catch (err) {}
    }
    furn.dragPointerId = null;
    furn.x = Math.max(56, Math.min(W - 56, furn.x));
    furn.y = H * 0.68 - 2;
    furn.vy = 0;
    furn.squashTimer = 0.2;
    if (player.placedFurniture && player.placedFurniture[furn.key]) {
      player.placedFurniture[furn.key].xRatio = Number((furn.x / Math.max(1, W)).toFixed(4));
    }
    // 轻点家具（未大幅拖动）触发专属家具互动！
    if ((furn.movedDist || 0) < 16) {
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
      } else if (furn.key === 'musicbox') {
        const track = petAudio.cycleBgmTrack();
        furn.trackName = track.name;
        furn.isPlaying = !petAudio.muted;
        const soundBtn = document.getElementById('btn-sound-toggle');
        if (soundBtn) soundBtn.classList.toggle('muted', petAudio.muted);
        spawnInteractVfx(furn.x, furn.y - 44, 'purr', 8);
        setPlayerEmote(`♪ 八音盒切换曲目：「${track.name}」~`, 2.2, 'happy', true);
      }
    } else {
      playSfx('pat');
      spawnInteractVfx(furn.x, furn.y - 26, 'sparkle', 5);
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
    desc: '亲密+18 · 体力+15 免费管饱',
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
    desc: '体力+40 · 打工×1.2 (45s)',
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
    desc: '亲密+52 · 打工×1.5 (60s)',
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
    desc: '全满恢复 · 打工×2.0 (90s)',
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
    desc: '暗光自亮 · 亲密获取+25%',
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
    id: 'furn_musicbox',
    isFurniture: true,
    furnKey: 'musicbox',
    milestoneLv: 5,
    ico: '',
    img: './assets/furn_musicbox.webp?v=hd18',
    name: '星梦八音盒唱片机',
    desc: 'LV.5 解锁 · 轻点切换3首治愈八音盒曲目',
    price: 0
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
  },
  {
    id: 'shell_clip',
    milestoneLv: 3,
    ico: '',
    img: './assets/item_shell_clip.webp?v=hd18',
    name: '星海贝壳发卡',
    desc: 'LV.3 解锁 · 互动亲密经验+20%',
    price: 0
  },
  {
    id: 'star_wreath',
    milestoneLv: 8,
    ico: '',
    img: './assets/item_star_wreath.webp?v=hd18',
    name: '深海星梦花环',
    desc: 'LV.8 解锁 · 打工金币与亲密+15%',
    price: 0
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

function dismissPolaroid() {
  pendingPhotoSnapTimer = 0; player.photoPoseTimer = 0;
  if (polaroidHideTimer) {
    clearTimeout(polaroidHideTimer);
    polaroidHideTimer = null;
  }
  document.getElementById('polaroid-card')?.classList.add('hidden');
}

function openDrawer(tab) { cancelRpsGame(); cancelPalmCatchGame(); dismissPolaroid(); dismissTopicCard(); player.wanderTargetX = null; if (player.y < H * 0.68 - 26) { player.y = H * 0.68 - 25; player.vy = 0; player.onGround = true; player.standingPlat = null; }
  activeDrawerTab = tab;
  drawerEl.classList.remove('hidden'); document.getElementById('hud-wish-pill')?.classList.add('hidden');
  document.querySelectorAll('.drawer-tab').forEach((t) => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });
  document.getElementById('btn-feed').classList.toggle('active', tab === 'food');
  document.getElementById('btn-shop').classList.toggle('active', tab === 'dress' || tab === 'upgrade');
  document.getElementById('btn-album-open')?.classList.toggle('active', tab === 'album');
  renderDrawerItems();
}

function closeDrawer() {
  drawerEl.classList.add('hidden'); if (gameMode === 'pet' && currentWish) document.getElementById('hud-wish-pill')?.classList.remove('hidden');
  player.drawerOpen = false;
  document.getElementById('btn-feed').classList.remove('active');
  document.getElementById('btn-shop').classList.remove('active');
  document.getElementById('btn-album-open')?.classList.remove('active');
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

function bindHudTap(el, callback) {
  if (!el) return;
  let lastTriggerAt = 0;
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    lastTriggerAt = performance.now();
    callback(e);
  });
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    if (performance.now() - lastTriggerAt < 400) return;
    lastTriggerAt = performance.now();
    callback(e);
  });
}

bindHudTap(document.getElementById('btn-drawer-close'), () => {
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
  let lastFireAt = 0;
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
      lastFireAt = performance.now();
      callback();
    }
  });
  card.addEventListener('pointercancel', () => {
    isDown = false;
  });
  card.addEventListener('click', (e) => {
    e.stopPropagation();
    if (performance.now() - lastFireAt < 400) return;
    lastFireAt = performance.now();
    callback();
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
  player.recenterDelay = 0; player.tsundereTimer = 0; player.happyTimer = 0; player.cheerTimer = 0;
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
  drawerItemsEl.classList.toggle('is-album-tab', activeDrawerTab === 'album');
  if (activeDrawerTab === 'food') {
    for (const item of FOOD_CATALOG) {
      const canAffordFood = item.price <= 0 || player.coins >= item.price;
      const card = document.createElement('button');
      card.className = `shop-card ${canAffordFood ? '' : 'unaffordable'}`.trim();
      const priceLabel =
        item.price === 0
          ? '免费投喂'
          : `${item.price} <img src="./assets/ui_coin.webp?v=hd6" alt="" class="inline-coin-ico" />`;
      card.innerHTML = `
        ${renderThumbHtml(item)}
        <div class="shop-info">
          <span class="shop-name">${item.name} <em class="shop-tag-pill">饱食+${item.hunger}</em></span>
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
    const themeBlock = document.createElement('div');
    themeBlock.className = 'drawer-section-block';
    themeBlock.innerHTML = `
      <div class="drawer-section-head">
        <span class="drawer-section-title">治愈房间主题 DIY</span>
        <span class="drawer-section-hint">点击切换手绘背景 · 桌面家具可左右拖拽摆位</span>
      </div>
      <div class="room-theme-grid"></div>
    `;
    const themeGrid = themeBlock.querySelector('.room-theme-grid');
    for (const th of ROOM_THEMES) {
      const isCurrent = player.roomTheme === th.id;
      const tBtn = document.createElement('button');
      tBtn.type = 'button';
      tBtn.className = `room-theme-card ${isCurrent ? 'active' : ''}`.trim();
      tBtn.dataset.themeId = th.id;
      tBtn.innerHTML = `
        <img src="${th.thumb}" alt="${th.name}" class="room-theme-thumb" />
        <div class="room-theme-meta">
          <span class="room-theme-name">${th.name}</span>
          <span class="room-theme-sub">${th.subtitle}</span>
        </div>
        <span class="room-theme-state">${isCurrent ? '使用中' : '切换'}</span>
      `;
      bindCardTap(tBtn, () => {
        setRoomTheme(th.id, true);
      });
      themeGrid.appendChild(tBtn);
    }
    drawerItemsEl.appendChild(themeBlock);

    const milestoneBlock = document.createElement('div');
    milestoneBlock.className = 'drawer-section-block';
    milestoneBlock.innerHTML = `
      <div class="drawer-section-head">
        <span class="drawer-section-title">亲密等级里程碑（当前 LV.${player.level}）</span>
        <span class="drawer-section-hint">达标自动解锁专属互动家具与限定头饰</span>
      </div>
      <div class="milestone-strip"></div>
    `;
    const milestoneStrip = milestoneBlock.querySelector('.milestone-strip');
    for (const ms of INTIMACY_MILESTONES) {
      const unlocked = Boolean(player.ownedDress[ms.itemId] || player.level >= ms.level);
      const pill = document.createElement('div');
      pill.className = `milestone-pill ${unlocked ? 'unlocked' : ''}`.trim();
      pill.dataset.milestoneLv = String(ms.level);
      pill.innerHTML = `
        <img src="${ms.img}" alt="${ms.name}" class="milestone-pill-ico" />
        <div class="milestone-pill-text">
          <span class="milestone-pill-lv">LV.${ms.level} · ${unlocked ? '已解锁' : '待达成'}</span>
          <span class="milestone-pill-name">${ms.name}</span>
        </div>
      `;
      milestoneStrip.appendChild(pill);
    }
    drawerItemsEl.appendChild(milestoneBlock);

    for (const item of DRESS_CATALOG) {
      const owned = !!player.ownedDress[item.id];
      const isMilestoneLocked = Boolean(item.milestoneLv && !owned && player.level < item.milestoneLv);
      const equipped = item.isFurniture
        ? !!(player.placedFurniture && player.placedFurniture[item.furnKey])
        : item.isToy
          ? player.activeToy === item.toyKey
          : !!player.equipped[item.id];
      const canAffordDress = owned || (!isMilestoneLocked && player.coins >= item.price);
      const card = document.createElement('button');
      card.className = `shop-card ${owned ? (equipped ? 'owned' : 'owned-idle') : isMilestoneLocked ? 'is-milestone-locked' : canAffordDress ? '' : 'unaffordable'}`.trim();
      const activeVerb = item.isFurniture ? '已摆放' : item.isToy ? '使用中' : '穿戴中';
      const standbyVerb = item.isFurniture ? '摆放桌面' : item.isToy ? '切换玩具' : '穿戴装扮';
      const statusText = owned
        ? equipped
          ? activeVerb
          : standbyVerb
        : isMilestoneLocked
          ? `LV.${item.milestoneLv} 解锁`
          : `${item.price} <img src="./assets/ui_coin.webp?v=hd6" alt="" class="inline-coin-ico" />`;
      const tagHtml = item.milestoneLv
        ? `<em class="shop-tag-pill shop-tag-milestone">LV.${item.milestoneLv}限定</em>`
        : '';
      card.innerHTML = `
        ${renderThumbHtml(item)}
        <div class="shop-info">
          <span class="shop-name">${item.name} ${tagHtml}</span>
          <span class="shop-desc">${item.desc}</span>
        </div>
        <span class="shop-price">${statusText}</span>
      `;
      bindCardTap(card, () => {
        if (!owned) {
          if (isMilestoneLocked) {
            setPlayerEmote(`亲密度升到 LV.${item.milestoneLv} 就会自动解锁「${item.name}」啦~`, 2.2, 'happy');
            return;
          }
          if (player.coins < item.price) {
            setPlayerEmote('金币不足，快去『幸存者』或『接美食』赚金币~', 2.2);
            return;
          }
          player.coins -= item.price;
          player.ownedDress[item.id] = true;
          if (item.isFurniture) {
            player.placedFurniture[item.furnKey] = {
              xRatio: item.furnKey === 'pc' ? 0.76 : item.furnKey === 'tree' ? 0.36 : item.furnKey === 'musicbox' ? 0.62 : 0.20,
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
          addAffectionXp(35, '新礼物 +35 亲密');
          setPlayerEmote(`收到${item.name}啦，可以拖到桌面任意位置摆放哦 ^w^`, 2.4, 'happy', true);
        } else {
          if (item.isFurniture) {
            if (player.placedFurniture[item.furnKey]) {
              delete player.placedFurniture[item.furnKey];
              setPlayerEmote(`已将 ${item.name} 收回背包`, 1.5);
            } else {
              player.placedFurniture[item.furnKey] = {
                xRatio: item.furnKey === 'pc' ? 0.76 : item.furnKey === 'tree' ? 0.36 : item.furnKey === 'musicbox' ? 0.62 : 0.20,
                manualOn: true
              };
              setPlayerEmote(`已在桌面摆放 ${item.name}（可按住横向拖拽摆位）!`, 1.8, 'happy');
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
    const rec = player.bestShiftRecord;
    const badgeCard = document.createElement('div');
    badgeCard.className = 'shift-record-banner';
    badgeCard.innerHTML = `
      <img src="./assets/ui_badge_shift.webp?v=hd15" alt="最高班次纪录徽章" />
      <div class="shift-record-meta">
        <span class="shift-record-title">班次荣誉徽章 · ${getShiftBadgeTitle(rec.bestKills)}</span>
        <span>最高击退 ${rec.bestKills} · 单班最高 +${rec.bestCoins} 金币 · 班次 Lv.${rec.bestShiftLv} · 讨伐首领 ${rec.bossesDefeated}</span>
      </div>
    `;
    drawerItemsEl.appendChild(badgeCard);

    for (const item of UPGRADE_CATALOG) {
      const lv = player.weapons[item.id] || 0;
      const cost = Math.round(item.basePrice * Math.pow(1.45, lv));
      const canAffordUpg = player.coins >= cost;
      const card = document.createElement('button');
      card.className = `shop-card ${canAffordUpg ? '' : 'unaffordable'}`.trim();
      card.innerHTML = `
        ${renderThumbHtml(item)}
        <div class="shop-info">
          <span class="shop-name">${item.name} <em class="shop-tag-pill shop-tag-lv">Lv.${lv}</em></span>
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
  } else if (activeDrawerTab === 'album') {
    renderAlbumWallInDrawer();
  }
}

document.querySelectorAll('.drawer-tab').forEach((tabBtn) => {
  tabBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleDrawer(tabBtn.dataset.tab);
  });
});

// 顶部三模式切换（养成 | 摘星 | 幸存者赚金币）
const wishPillEl = document.getElementById('hud-wish-pill');
function switchMode(newMode) {
  if (!newMode) return;
  if (gameMode === 'survivor' && newMode !== 'survivor') {
    updateBestShiftRecord();
    survivorRun.choosingSkill = false;
    survivorRun.queuedModals = [];
    document.getElementById('survivor-skill-modal')?.classList.add('hidden');
  }
  gameMode = newMode;
  vision.activeGameMode = newMode;
  document.querySelectorAll('.mode-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.mode === newMode);
  });
  closeDrawer();

  // 切换模式时清理挂起状态，保证动作瞬间响应不卡顿
  dismissPolaroid();
  dismissTopicCard();
  if (newMode !== 'pet' && player.standingPlat && !player.standingPlat.isFloor && !player.standingPlat.ref) {
    player.y = H * 0.68 - 25;
    player.vy = 0;
    player.onGround = true;
    player.standingPlat = null;
  }
  setNapping(false);
  cancelRpsGame();
  cancelPalmCatchGame();
  player.idleTime = 0;
  player.petAction = 'idle';
  player.eatingTimer = 0;
  player.isCrouching = false;
  player.crouchTime = 0;
  player.wanderTargetX = null;
  player.recenterDelay = 0; player.tsundereTimer = 0; player.happyTimer = 0; player.cheerTimer = 0;

  starTarget.combo = 0;
  starTarget.comboTimer = 0;

  if (gameMode === 'pet') {
    enemies.length = 0;
    bullets.length = 0;
    coinsList.length = 0;
    gems.length = 0;
    shockwaves.length = 0;
    survivorVfxBursts.length = 0;
    starTarget.active = false;
    careBarEl.style.display = 'flex';
    if (wishPillEl) wishPillEl.style.display = 'inline-flex';
    syncSurvivorHud();
    syncParkourHud();
    setPlayerEmote('回到日常桌面养成模式~', 1.8);
  } else if (gameMode === 'parkour') {
    enemies.length = 0;
    bullets.length = 0;
    coinsList.length = 0;
    gems.length = 0;
    shockwaves.length = 0;
    survivorVfxBursts.length = 0;
    starTarget.active = false;
    careBarEl.style.display = 'none';
    if (wishPillEl) wishPillEl.style.display = 'none';
    syncSurvivorHud();
    syncParkourHud();
    placeStarOnBestTarget();
    setPlayerEmote('跳上实景物体摘星拿赏金!', 1.8);
  } else if (gameMode === 'survivor') {
    starTarget.active = false;
    survivorSessionCoins = 0;
    survivorSessionKills = 0;
    enemies.length = 0;
    bullets.length = 0;
    gems.length = 0;
    resetSurvivorRun();
    careBarEl.style.display = 'none';
    if (wishPillEl) wishPillEl.style.display = 'none';
    enemySpawnTimer = 0.15;
    spawnEnemy(false);
    spawnEnemy(false);
    syncSurvivorHud();
    syncSurvivorSkillStrip();
    syncSurvivorBossBar();
    syncParkourHud();
    setPlayerEmote('开启幸存者打工 2.0！拾取宝石升级抽秘技卡~', 2.2);
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
bindHudTap(document.getElementById('hud-avatar-btn'), () => {
  if (!drawerEl.classList.contains('hidden')) closeDrawer();
  triggerPetHeadpat();
  const xpGain = player.equipped.bow ? 16 : 8;
  addAffectionXp(xpGain, `+${xpGain} 亲密 摸头`);
  completeWish('headpat');
});

// 右上角房间主题一键切换按钮（晴空奶油书房 <-> 深海星梦水族馆）
const btnRoomTheme = document.getElementById('btn-room-theme');
if (btnRoomTheme) {
  bindHudTap(btnRoomTheme, () => {
    const nextTheme = player.roomTheme === 'cream_study' ? 'star_aquarium' : 'cream_study';
    setRoomTheme(nextTheme, true);
  });
}

bindHudTap(document.getElementById('btn-milestone-toast-close'), () => {
  hideMilestoneToast();
});

// 右上角 BGM / 角色语音一键静音开关
const btnSoundToggle = document.getElementById('btn-sound-toggle');
if (btnSoundToggle) {
  btnSoundToggle.classList.toggle('muted', petAudio.muted);
  bindHudTap(btnSoundToggle, () => {
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
  dismissTopicCard();
  setNapping(false);
  cancelRpsGame();
  cancelPalmCatchGame();
  photoAutoCooldown = 4.6;
  player.photoPoseTimer = 1.75;
  player.vx = 0;
  if (!player.onGround) {
    const standPlat = platforms.find((p) => !p.isFloor && player.x >= p.x1 - 16 && player.x <= p.x2 + 16);
    player.y = (standPlat ? standPlat.y : H * 0.68) - 25;
    player.vy = 0;
    player.onGround = true;
  }
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
  saveSnapshotToPolaroidAlbum(pCanvas, dateStr);
  if (polaroidImgEl) polaroidImgEl.src = latestPolaroidUrl;
  if (polaroidCardEl) {
    polaroidCardEl.classList.toggle('polaroid-left', player.x > W * 0.56);
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

bindHudTap(document.getElementById('btn-photo-snap'), () => {
  triggerPolaroidSequence(false);
});

bindHudTap(document.getElementById('btn-polaroid-close'), () => {
  polaroidCardEl?.classList.add('hidden');
});

bindHudTap(document.getElementById('btn-polaroid-save'), () => {
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

bindHudTap(document.getElementById('btn-polaroid-wall'), () => {
  dismissPolaroid();
  if (gameMode !== 'pet') switchMode('pet');
  openDrawer('album');
});

bindHudTap(document.getElementById('btn-album-open'), () => {
  if (gameMode !== 'pet') switchMode('pet');
  toggleDrawer('album');
});

// ================= AR-2 拍立得纪念相册集邮墙 & 日常轻对话多选气泡系统 =================
const POLAROID_ALBUM_KEY = 'ar_deepseek_polaroid_album_v1';
const POLAROID_ALBUM_MAX = 24;

let polaroidAlbum = (() => {
  try {
    const raw = JSON.parse(localStorage.getItem(POLAROID_ALBUM_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((it) => it && typeof it.dataUrl === 'string') : [];
  } catch (e) {
    return [];
  }
})();

function getSortedPolaroidAlbum() {
  return [...polaroidAlbum].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b.createdAt || 0) - (a.createdAt || 0));
}

function syncAlbumCountBadge() {
  const badgeEl = document.getElementById('hud-album-count');
  if (!badgeEl) return;
  const total = polaroidAlbum.length;
  badgeEl.textContent = String(total);
  badgeEl.classList.toggle('hidden', total <= 0);
}

function persistPolaroidAlbum() {
  while (polaroidAlbum.length > POLAROID_ALBUM_MAX) {
    let dropIdx = -1;
    for (let i = polaroidAlbum.length - 1; i >= 0; i--) {
      if (!polaroidAlbum[i].pinned) {
        dropIdx = i;
        break;
      }
    }
    if (dropIdx === -1) dropIdx = polaroidAlbum.length - 1;
    polaroidAlbum.splice(dropIdx, 1);
  }
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      localStorage.setItem(POLAROID_ALBUM_KEY, JSON.stringify(polaroidAlbum));
      break;
    } catch (e) {
      if (polaroidAlbum.length <= 1) break;
      const unpinnedLast = polaroidAlbum.findLastIndex((it) => !it.pinned);
      polaroidAlbum.splice(unpinnedLast >= 0 ? unpinnedLast : polaroidAlbum.length - 1, 1);
    }
  }
  syncAlbumCountBadge();
}

function getEquippedOutfitSummary() {
  const parts = [];
  if (player.equipped?.shell_clip) parts.push('星海贝壳发卡');
  if (player.equipped?.star_wreath) parts.push('深海星梦花环');
  if (player.equipped?.bow) parts.push('樱粉蝴蝶结');
  if (player.equipped?.crown) parts.push('迷你小皇冠');
  if (player.equipped?.aura) parts.push('星光光环');
  if (parts.length === 0) parts.push('清爽日常装');
  return parts.join(' · ');
}

function saveSnapshotToPolaroidAlbum(fullCanvas, dateStr) {
  try {
    const tw = 352;
    const th = 258;
    const tCanvas = document.createElement('canvas');
    tCanvas.width = tw;
    tCanvas.height = th;
    const tCtx = tCanvas.getContext('2d');
    tCtx.drawImage(fullCanvas, 0, 0, tw, th);
    let thumbUrl = tCanvas.toDataURL('image/webp', 0.78);
    if (!thumbUrl || !thumbUrl.startsWith('data:image/webp')) {
      thumbUrl = tCanvas.toDataURL('image/jpeg', 0.80);
    }
    const cleanMood = (player.emote || '今天也在桌面陪主人~').replace(/^\s+|\s+$/g, '');
    const entry = {
      id: `pol_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      dataUrl: thumbUrl,
      createdAt: Date.now(),
      dateStr,
      level: player.level,
      outfitText: getEquippedOutfitSummary(),
      moodNote: cleanMood || '咔嚓！定格今日份心动瞬间~',
      pinned: false
    };
    polaroidAlbum.unshift(entry);
    persistPolaroidAlbum();
    if (!drawerEl.classList.contains('hidden') && activeDrawerTab === 'album') {
      renderDrawerItems();
    }
  } catch (e) {}
}

syncAlbumCountBadge();

const albumLightboxEl = document.getElementById('album-lightbox');
let activeLightboxEntryId = null;

albumLightboxEl?.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  if (e.target === albumLightboxEl) closeAlbumLightbox();
});

function closeAlbumLightbox() {
  activeLightboxEntryId = null;
  albumLightboxEl?.classList.add('hidden');
}

function syncAlbumLightboxContent() {
  if (!activeLightboxEntryId) return;
  const item = polaroidAlbum.find((p) => p.id === activeLightboxEntryId);
  if (!item) {
    closeAlbumLightbox();
    return;
  }
  const imgEl = document.getElementById('album-lb-img');
  const dateEl = document.getElementById('album-lb-date');
  const outfitEl = document.getElementById('album-lb-outfit');
  const noteEl = document.getElementById('album-lb-note');
  const pinStampEl = document.getElementById('album-lb-pin-stamp');
  const pinTextEl = document.getElementById('album-lb-pin-text');
  if (imgEl) imgEl.src = item.dataUrl;
  if (dateEl) dateEl.textContent = `拍摄于 ${item.dateStr}`;
  if (outfitEl) outfitEl.textContent = `亲密 LV.${item.level || 1} · ${item.outfitText || '清爽日常装'}`;
  if (noteEl) noteEl.textContent = `「${item.moodNote || '今天也在桌面陪主人~'}」`;
  if (pinStampEl) pinStampEl.classList.toggle('hidden', !item.pinned);
  if (pinTextEl) pinTextEl.textContent = item.pinned ? '取消置顶' : '置顶纪念';
}

function openAlbumLightbox(entryId) {
  activeLightboxEntryId = entryId;
  syncAlbumLightboxContent();
  albumLightboxEl?.classList.remove('hidden');
}

function togglePolaroidPin(entryId) {
  const item = polaroidAlbum.find((p) => p.id === entryId);
  if (!item) return;
  item.pinned = !item.pinned;
  playSfx('star');
  persistPolaroidAlbum();
  if (!drawerEl.classList.contains('hidden') && activeDrawerTab === 'album') {
    renderDrawerItems();
  }
  if (activeLightboxEntryId === entryId) {
    syncAlbumLightboxContent();
  }
  setPlayerEmote(item.pinned ? '已把这张相片钉在纪念墙最前面啦~' : '已取消相片置顶~', 1.8, 'happy');
}

function deletePolaroidEntry(entryId) {
  const idx = polaroidAlbum.findIndex((p) => p.id === entryId);
  if (idx === -1) return;
  polaroidAlbum.splice(idx, 1);
  persistPolaroidAlbum();
  if (activeLightboxEntryId === entryId) {
    closeAlbumLightbox();
  }
  if (!drawerEl.classList.contains('hidden') && activeDrawerTab === 'album') {
    renderDrawerItems();
  }
  setPlayerEmote('已经帮主人整理掉那张旧相片咯~', 1.6);
}

bindHudTap(document.getElementById('btn-album-lb-close'), () => {
  closeAlbumLightbox();
});

bindHudTap(document.getElementById('btn-album-lb-pin'), () => {
  if (activeLightboxEntryId) togglePolaroidPin(activeLightboxEntryId);
});

bindHudTap(document.getElementById('btn-album-lb-dl'), () => {
  if (!activeLightboxEntryId) return;
  const item = polaroidAlbum.find((p) => p.id === activeLightboxEntryId);
  if (!item) return;
  const link = document.createElement('a');
  link.href = item.dataUrl;
  link.download = `deepseek-album-${item.id}.webp`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  playSfx('star');
  setPlayerEmote('纪念相片已导出给主人珍藏~', 1.8, 'happy');
});

bindHudTap(document.getElementById('btn-album-lb-del'), () => {
  if (activeLightboxEntryId) deletePolaroidEntry(activeLightboxEntryId);
});

function renderAlbumWallInDrawer() {
  const sorted = getSortedPolaroidAlbum();
  const pinnedCount = sorted.filter((p) => p.pinned).length;
  const summary = document.createElement('div');
  summary.className = 'album-wall-summary';
  summary.innerHTML = `
    <div class="album-wall-summary-left">
      <img src="./assets/ui_btn_album.webp?v=hd17" alt="" class="album-summary-ico" />
      <div class="album-summary-text">
        <span class="album-summary-title">拍立得纪念集邮墙（已珍藏 ${sorted.length}/${POLAROID_ALBUM_MAX} 张 · 置顶 ${pinnedCount} 张）</span>
        <span>每次比耶或点右上角相机合影都会自动收入手账相册，点击相片可放大检视</span>
      </div>
    </div>
    <button type="button" class="album-snap-now-btn" id="btn-album-snap-now">拍一张</button>
  `;
  drawerItemsEl.appendChild(summary);
  const snapNowBtn = summary.querySelector('#btn-album-snap-now');
  if (snapNowBtn) {
    bindHudTap(snapNowBtn, () => {
      closeDrawer();
      triggerPolaroidSequence(false);
    });
  }

  if (sorted.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'album-empty-state';
    empty.innerHTML = `
      <span>相册集邮墙还空空如也呢~</span>
      <span>点击右上角相机图标或对镜头比耶，和 DeepSeek 娘定格第一张纪念拍立得吧！</span>
    `;
    drawerItemsEl.appendChild(empty);
    return;
  }

  for (const entry of sorted) {
    const itemCard = document.createElement('div');
    itemCard.className = `album-polaroid-item ${entry.pinned ? 'is-pinned' : ''}`.trim();
    itemCard.dataset.albumId = entry.id;
    itemCard.innerHTML = `
      <img src="${entry.dataUrl}" alt="拍立得纪念照" class="album-item-thumb" />
      <button type="button" class="album-pin-toggle ${entry.pinned ? 'active' : ''}" title="${entry.pinned ? '取消置顶' : '置顶纪念'}" aria-label="置顶纪念">
        <img src="./assets/ui_pin_star.webp?v=hd17" alt="" />
      </button>
      <button type="button" class="album-quick-del" title="删除相片" aria-label="删除相片">×</button>
      <div class="album-item-foot">
        <span class="album-item-date">${entry.dateStr} · LV.${entry.level || 1}</span>
        <span class="album-item-outfit">${entry.outfitText || '清爽日常装'}</span>
      </div>
    `;
    const pinBtn = itemCard.querySelector('.album-pin-toggle');
    const delBtn = itemCard.querySelector('.album-quick-del');
    if (pinBtn) {
      bindHudTap(pinBtn, () => {
        togglePolaroidPin(entry.id);
      });
    }
    if (delBtn) {
      bindHudTap(delBtn, () => {
        deletePolaroidEntry(entry.id);
      });
    }
    bindCardTap(itemCard, () => {
      openAlbumLightbox(entry.id);
    });
    drawerItemsEl.appendChild(itemCard);
  }
}

// 24 组治愈系日常话题轻对话题库（每题 3 分支：害羞撒娇 / 傲娇拌嘴 / 元气得意）
const PET_CHAT_TOPICS = [
  {
    id: 't01_late_code',
    tag: '深夜写码',
    prompt: '主人盯屏幕这么久啦，眼睛会不会酸呀？要我帮你守着光标吗~',
    options: [
      { label: '摸摸头休息两分钟', mood: 'shy', xp: 22, coins: 10, reply: '唔姆……手心暖乎乎的，充好电我们再一起出发~' },
      { label: '那你帮我把 Bug 吃掉！', mood: 'tsundere', xp: 18, coins: 12, reply: '哼！Bug 又不好吃，我只吃热乎乎的白米饭和便当！' },
      { label: '有你在旁边效率翻倍', mood: 'proud', xp: 20, coins: 12, reply: '那当然啦！我可是桌面首席蓝鲸督导官！' }
    ]
  },
  {
    id: 't02_milk_tea',
    tag: '下午茶',
    prompt: '咕噜噜……下午三点钟，空气里好像飘着三分糖珍珠奶茶的香气！',
    options: [
      { label: '请你喝温热的草莓鲜奶', mood: 'happy', xp: 22, coins: 10, reply: '好耶！第一口最甜的奶盖要和主人分一半~' },
      { label: '喝多了小心小肚子圆滚滚', mood: 'tsundere', xp: 18, coins: 12, reply: '才、才没有胖呢！这叫蓬松可爱的像素流体力学！' },
      { label: '干杯！喝完去摘星星', mood: 'cheer', xp: 20, coins: 14, reply: '吨吨吨满血复活！今天能一口气连跳三层书本台阶！' }
    ]
  },
  {
    id: 't03_rain_window',
    tag: '窗边听雨',
    prompt: '要是窗外突然下起淅淅沥沥的小雨，主人最想在桌前做什么呀？',
    options: [
      { label: '把小夜灯打开陪你听雨', mood: 'shy', xp: 24, coins: 10, reply: '暖黄的灯光配雨声最安心啦，悄悄往主人手边蹭近一点~' },
      { label: '钻进被窝睡个昏天黑地', mood: 'happy', xp: 20, coins: 10, reply: '赞成！我也要抱着蓝鲸软垫窝在键盘旁边打呼噜~' },
      { label: '趁下雨专注干票大的项目', mood: 'proud', xp: 20, coins: 14, reply: '哇哦，认真的主人超帅气，我在旁边替你摇旗呐喊！' }
    ]
  },
  {
    id: 't04_whale_tail',
    tag: '蓝鲸发饰',
    prompt: '嘿嘿，你刚刚是不是偷偷盯着我的蓝鲸小发卡看了好几眼？',
    options: [
      { label: '因为一晃一晃特别可爱', mood: 'shy', xp: 24, coins: 10, reply: '呜……突然这么直球夸人家，耳朵都要冒粉红泡泡啦！' },
      { label: '在看它会不会喷水弹', mood: 'tsundere', xp: 18, coins: 12, reply: '喂！只有去幸存者打工打怪的时候才会发射水弹啦！' },
      { label: '再配个樱粉蝴蝶结更完美', mood: 'cheer', xp: 22, coins: 12, reply: '真的吗！快去小铺帮我试戴看看，我要拍纪念照！' }
    ]
  },
  {
    id: 't05_slack_off',
    tag: '摸鱼雷达',
    prompt: '嘀嘀嘀——蓝鲸雷达检测到主人有 87% 的概率想伸懒腰摸个小鱼！',
    options: [
      { label: '被发现了，陪我发会儿呆', mood: 'happy', xp: 22, coins: 10, reply: '嘿嘿，发呆也是正经事！我陪你数桌面上飘过的小星尘~' },
      { label: '胡说，我明明在深度思考', mood: 'tsundere', xp: 18, coins: 12, reply: '哼哼，眼神都飘到零食袋那边去啦，本侦探绝不误判！' },
      { label: '来一把石头剪刀布决胜负', mood: 'cheer', xp: 20, coins: 14, reply: '来就来！这次我绝对不会第一把就傻乎乎出布了！' }
    ]
  },
  {
    id: 't06_palm_temp',
    tag: '掌心温度',
    prompt: '每次跳到主人手掌心上晃悠的时候，都觉得像踩在暖洋洋的云朵上~',
    options: [
      { label: '随时欢迎你跳上来休息', mood: 'shy', xp: 25, coins: 10, reply: '拉勾勾！那主人手心永远留一块我的专属停机坪~' },
      { label: '其实你踩得手心有点痒痒的', mood: 'tsundere', xp: 19, coins: 12, reply: '那、那我下次把小皮鞋收轻一点点嘛，不许嫌弃！' },
      { label: '站稳咯，准备手掌蹦床起飞', mood: 'cheer', xp: 21, coins: 12, reply: '芜湖——飞得越高越能摘到金闪闪的大星星！' }
    ]
  },
  {
    id: 't07_keyboard_sound',
    tag: '键盘节奏',
    prompt: '咔哒咔哒的敲键盘声听久了，总觉得像八音盒的伴奏曲一样好听呢。',
    options: [
      { label: '那这首曲子专门弹给你听', mood: 'shy', xp: 24, coins: 10, reply: '唔……我要把这句话偷偷记进今日份最佳心动语录里！' },
      { label: '那是狂暴改需求时的战鼓声', mood: 'proud', xp: 20, coins: 14, reply: '冲鸭主人！不管是甲方还是摸鱼怪，统统三下五除二搞定！' },
      { label: '你也去深海工位敲两行试试', mood: 'happy', xp: 20, coins: 12, reply: '包在我身上！我在迷你电脑前敲出来的可全是真的金币哦~' }
    ]
  },
  {
    id: 't08_midnight_snack',
    tag: '夜宵诱惑',
    prompt: '小声问一句……如果现在天上掉下一份豪华便当和热汤，算不算违规加餐？',
    options: [
      { label: '开心最重要，马上开动！', mood: 'cheer', xp: 22, coins: 12, reply: '主人万岁！吃饱饱才有力气保护整张书桌的和平~' },
      { label: '只能吃三口，剩下的明天吃', mood: 'tsundere', xp: 18, coins: 12, reply: '呜……那我要拿最大的勺子装满那三口！绝不浪费！' },
      { label: '来，张嘴喂你一颗饭团', mood: 'shy', xp: 24, coins: 10, reply: '啊呜~ 嚼嚼……被投喂的饭团好像比平时香甜十倍呢。' }
    ]
  },
  {
    id: 't09_photo_pose',
    tag: '上镜秘诀',
    prompt: '主人主人，你觉得我拍纪念拍立得的时候，比耶好看还是叉腰好看呀？',
    options: [
      { label: '只要是你怎么拍都超上镜', mood: 'shy', xp: 25, coins: 10, reply: '嘿嘿，相纸显影出来要是脸红红的，可全都怪主人夸太甜啦~' },
      { label: '当然是炸毛鼓起脸的时候', mood: 'tsundere', xp: 19, coins: 12, reply: '不许抓拍黑历史啦！那种照片绝对不准钉在相册最前面！' },
      { label: '换上小皇冠再拍一张镇墙之宝', mood: 'proud', xp: 21, coins: 14, reply: '有道理！戴上小皇冠气场全开，相册集邮墙C位预定！' }
    ]
  },
  {
    id: 't10_dream_island',
    tag: '梦境漫游',
    prompt: '刚才打盹做了一个小梦，梦见整张书桌变成漂在星海上的奶油浮岛啦~',
    options: [
      { label: '梦里有没有我的位置呀？', mood: 'shy', xp: 24, coins: 10, reply: '当然有呀，最大的那朵云朵躺椅就是专门留给主人的~' },
      { label: '肯定是因为枕着零食睡着了', mood: 'tsundere', xp: 18, coins: 12, reply: '才不是贪吃梦呢！是充满浪漫想象力的深海巡航梦！' },
      { label: '醒醒，浮岛上刷出打工金币啦', mood: 'cheer', xp: 20, coins: 14, reply: '哪儿哪儿？！本打工小能手一秒清醒，全屏吸金启动！' }
    ]
  },
  {
    id: 't11_weekend_plan',
    tag: '周末计划',
    prompt: '等忙完这一阵子，周末主人最想带我去哪里透透气呀？',
    options: [
      { label: '去洒满阳光的旧书街散步', mood: 'happy', xp: 22, coins: 12, reply: '好棒！我可以坐在书脊台阶上闻着墨香陪你挑喜欢的书~' },
      { label: '去公园草坪拍十张实景拍立得', mood: 'cheer', xp: 22, coins: 12, reply: '耶！我要在真正的树叶和花坛边上蹦蹦跳跳拍满整本相册！' },
      { label: '在家躺平一整天谁也不见', mood: 'shy', xp: 22, coins: 10, reply: '那我就安安静静趴在桌角当小摆件，陪主人度过最舒服的慢时光~' }
    ]
  },
  {
    id: 't12_cat_tree',
    tag: '攀爬高手',
    prompt: '我发现无论是厚字典、水杯沿还是猫爬架，都拦不住我的二段轻功跳！',
    options: [
      { label: '厉害厉害，给你颁小金牌', mood: 'proud', xp: 22, coins: 12, reply: '哼哼~ 再升一级轻巧跑鞋，连显示器顶端我都跳上去给你看！' },
      { label: '小心别一头栽进茶杯里咯', mood: 'tsundere', xp: 18, coins: 12, reply: '唔！我的落地平衡感可是满分，才不会变成落汤小鲸鱼！' },
      { label: '跳累了随时接住你', mood: 'shy', xp: 24, coins: 10, reply: '有主人在底下兜着，我每次起跳都超级安心呢~' }
    ]
  },
  {
    id: 't13_compliment_battle',
    tag: '夸夸时间',
    prompt: '今天主人已经很努力啦！快选一个词，让我正式表扬你一下吧~',
    options: [
      { label: '想要温柔治愈系的夸夸', mood: 'shy', xp: 24, coins: 10, reply: '不管外面多忙，你在我眼里永远是最靠谱、最温柔的满分主人~' },
      { label: '想要气势十足的热血夸夸', mood: 'cheer', xp: 21, coins: 12, reply: '今日最佳MVP就是主人！难题遇到你统统自动退散！' },
      { label: '反过来先夸夸可爱的DeepSeek娘', mood: 'tsundere', xp: 20, coins: 12, reply: '诶？！怎、怎么突然反弹回来啦……勉强收下你的喜欢咯！' }
    ]
  },
  {
    id: 't14_toy_choice',
    tag: '心爱玩具',
    prompt: '蓝鲸球弹得高，毛线球跑得快，小黄鸭还会嘎嘎叫……到底宠幸哪一个好呢？',
    options: [
      { label: '小孩子才做选择，轮流陪你玩', mood: 'cheer', xp: 22, coins: 12, reply: '太好啦！和你玩顶球连击的时候最开心了！' },
      { label: '看你追毛线球像小猫咪一样', mood: 'tsundere', xp: 18, coins: 12, reply: '那、那是在测试彩虹尾迹的空气阻力啦，才不是喵星人本能！' },
      { label: '玩累了记得回来喝口温水', mood: 'happy', xp: 22, coins: 10, reply: '嗯嗯！主人也要记得喝水润润嗓子哦~' }
    ]
  },
  {
    id: 't15_survivor_pride',
    tag: '打工心得',
    prompt: '每次去『幸存者打工』把满屏摸鱼怪震飞爆金币的时候，真的超解压的！',
    options: [
      { label: '辛苦我们家赚钱养家的小能手', mood: 'proud', xp: 22, coins: 14, reply: '包在身上！赚来的小金币全都用来给桌面添置漂亮家具！' },
      { label: '别光顾着冲锋，注意自己血条', mood: 'shy', xp: 24, coins: 10, reply: '知道主人心疼我啦~ 看到绿色回血宝石我都会乖乖捡起来的！' },
      { label: '超武茶刃转起来像火锅飞饼', mood: 'tsundere', xp: 18, coins: 12, reply: '喂！明明是帅气潇洒的碧叶风暴，怎么到你嘴里就变好吃的了！' }
    ]
  },
  {
    id: 't16_tidying_desk',
    tag: '桌面巡逻',
    prompt: '刚刚沿着桌面巡逻了一圈，发现主人的桌面气场今天格外清爽呢！',
    options: [
      { label: '专门收拾干净给你当游乐场', mood: 'shy', xp: 24, coins: 10, reply: '哇，难怪跑起来一点都不绊脚，主人最好啦~' },
      { label: '其实杂物全推到镜头外面了', mood: 'tsundere', xp: 19, coins: 12, reply: '噗——我就假装没听见，替你保守这个桌面整洁小秘密！' },
      { label: '摆个书本斜坡让你当跳台', mood: 'cheer', xp: 21, coins: 12, reply: '好主意！点一下右上角重扫，我马上给你表演花式登顶！' }
    ]
  },
  {
    id: 't17_morning_evening',
    tag: '陪伴时光',
    prompt: '不管是白天的忙碌时刻还是安静的夜晚，只要一打开屏幕就能见到你真好~',
    options: [
      { label: '我也很喜欢有你在桌角陪着', mood: 'shy', xp: 25, coins: 12, reply: '心里暖洋洋的……那我们要一直当彼此最合拍的桌面搭档哦！' },
      { label: '主要是怕你不盯着我就偷吃零食', mood: 'tsundere', xp: 19, coins: 12, reply: '哼！我的饱食度明明很守规矩，才不会偷翻小铺仓库呢！' },
      { label: '来，击个掌庆祝今日份重逢', mood: 'cheer', xp: 22, coins: 12, reply: '啪嗒击掌成功！好运值与亲密度同步飙升！' }
    ]
  },
  {
    id: 't18_music_box',
    tag: '八音盒曲',
    prompt: '啦啦啦~ 你听背景里的八音盒旋律，是不是像小鲸鱼在水泡泡里转圈圈？',
    options: [
      { label: '听着歌看你晃脑袋特别解压', mood: 'happy', xp: 22, coins: 10, reply: '那我再多晃两拍~ 把主人心里的烦心事统统摇散！' },
      { label: '你哼的调子好像拐了半个弯', mood: 'tsundere', xp: 18, coins: 12, reply: '哪、哪有跑调！这叫即兴爵士蓝鲸变奏曲，懂不懂嘛！' },
      { label: '转个圈跳支小舞看看', mood: 'cheer', xp: 22, coins: 12, reply: '看好了哦——华丽原地转圈加满天星光特效！' }
    ]
  },
  {
    id: 't19_secret_wish',
    tag: '小小愿望',
    prompt: '偷偷告诉主人，我把每天和你互动的小开心都折成星星收起来啦。',
    options: [
      { label: '攒满一百颗会许什么愿望？', mood: 'shy', xp: 25, coins: 10, reply: '许愿主人的代码永无报错，每天都能笑眯眯地来摸摸我的头~' },
      { label: '该不会许愿每天十顿大餐吧', mood: 'tsundere', xp: 18, coins: 12, reply: '才占了愿望清单的十分之一而已啦，剩下九分全是关于你的！' },
      { label: '现在就帮你再添几颗亮晶晶的', mood: 'happy', xp: 22, coins: 14, reply: '收到主人的心意星光！小罐子都快装不下啦~' }
    ]
  },
  {
    id: 't20_starlight_aura',
    tag: '闪耀气场',
    prompt: '我一直在练习怎么让脚底下的星光看起来更有大魔法师的派头！',
    options: [
      { label: '不用练习也已经闪闪发光了', mood: 'shy', xp: 24, coins: 10, reply: '呜哇……主人今天说话像裹了蜂蜜一样甜！' },
      { label: '更像刚踩完荧光粉的小团子', mood: 'tsundere', xp: 19, coins: 12, reply: '什么小团子嘛！人家明明是灵动飒爽的星海少女！' },
      { label: '吸金币的时候确实很有气势', mood: 'proud', xp: 21, coins: 14, reply: '嘿嘿，方圆百里的金币见了本大侠都得乖乖排着队飞过来！' }
    ]
  },
  {
    id: 't21_headpat_habit',
    tag: '摸头定律',
    prompt: '奇怪……为什么每次被主人轻轻揉头顶的时候，原本想好的傲娇台词就全忘光了呢？',
    options: [
      { label: '说明你其实超级喜欢被顺毛', mood: 'shy', xp: 25, coins: 10, reply: '唔……只允许你一个人这么顺毛哦，别人可没这个特权~' },
      { label: '因为发型被我揉成小鸟窝啦', mood: 'tsundere', xp: 19, coins: 12, reply: '哇啊！赔我整整齐齐的刘海，罚你多喂我一碗热拉面！' },
      { label: '那以后每天上线先摸三次头', mood: 'happy', xp: 22, coins: 12, reply: '成交！少摸一下我可是会举着小牌子提醒你的哦~' }
    ]
  },
  {
    id: 't22_season_breeze',
    tag: '换季提醒',
    prompt: '最近早晚温差变大咯，本桌面健康小管家特来抽查主人的保暖情况！',
    options: [
      { label: '衣服穿得很暖，放心吧小管家', mood: 'happy', xp: 22, coins: 10, reply: '乖乖加分！健康值一百分，奖励小鲸鱼欣慰微笑一枚~' },
      { label: '有电脑散热器烤手完全不冷', mood: 'tsundere', xp: 18, coins: 12, reply: '不许糊弄小管家！要是着凉打喷嚏，我可是会担心的！' },
      { label: '看到你元气满满瞬间就暖和了', mood: 'shy', xp: 24, coins: 12, reply: '嘿嘿，那我把活力火力再调高一档，给你当随身小太阳！' }
    ]
  },
  {
    id: 't23_polaroid_wall',
    tag: '相册回忆',
    prompt: '翻看『纪念相册』里的拍立得时，每一张都能想起当时主人的手势和心情呢。',
    options: [
      { label: '以后每个阶段都留一张合影', mood: 'shy', xp: 24, coins: 12, reply: '嗯！从 LV.1 到很远很远的以后，每一页都要和主人同框~' },
      { label: '最喜欢哪张就给你钉上小金星', mood: 'happy', xp: 22, coins: 12, reply: '好耶！被钉上星星图钉的相片，我每次路过都会偷看两眼！' },
      { label: '走，现在就再咔嚓拍张新的！', mood: 'cheer', xp: 22, coins: 14, reply: '时刻准备着！我已经把最甜的笑容摆好咯，一二茄子~' }
    ]
  },
  {
    id: 't24_good_luck',
    tag: '今日吉签',
    prompt: '锵锵！刚刚替主人摇了一枚深海幸运签——显示今天宜放松、宜微笑、宜心想事成！',
    options: [
      { label: '借你吉言，把好运分你一半', mood: 'shy', xp: 24, coins: 12, reply: '一人一半好运翻倍！今天不管做什么都会顺顺当当的~' },
      { label: '这么准？该不会全写的上上签吧', mood: 'tsundere', xp: 19, coins: 12, reply: '哼哼，给主人的签筒里当然只准装上上签啦，我亲手挑的！' },
      { label: '接下上上签，干劲十足出发！', mood: 'proud', xp: 22, coins: 14, reply: '气势满分！本桌宠宣布今日幸运Buff已永久生效！' }
    ]
  }
];

const MOOD_TAG_LABELS = {
  shy: '心动害羞',
  tsundere: '傲娇炸毛',
  happy: '温柔开心',
  cheer: '元气欢呼',
  proud: '得意叉腰'
};

const topicCardEl = document.getElementById('pet-topic-card');
const topicKickerEl = document.getElementById('topic-kicker');
const topicPromptEl = document.getElementById('topic-prompt-text');
const topicOptionsEl = document.getElementById('topic-options-list');
let topicDeckOrder = [];
let currentTopicObj = null;
let topicAutoTimer = 18.0;

topicCardEl?.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
});

function nextShuffledTopic() {
  if (topicDeckOrder.length === 0) {
    topicDeckOrder = PET_CHAT_TOPICS.map((_, idx) => idx);
    for (let i = topicDeckOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = topicDeckOrder[i];
      topicDeckOrder[i] = topicDeckOrder[j];
      topicDeckOrder[j] = tmp;
    }
    if (currentTopicObj && PET_CHAT_TOPICS[topicDeckOrder[0]]?.id === currentTopicObj.id && topicDeckOrder.length > 1) {
      const first = topicDeckOrder.shift();
      topicDeckOrder.push(first);
    }
  }
  return PET_CHAT_TOPICS[topicDeckOrder.shift()];
}

function dismissTopicCard() {
  currentTopicObj = null;
  topicCardEl?.classList.add('hidden');
  document.getElementById('btn-chat-topic')?.classList.remove('active');
}

function applyTopicOptionReaction(opt) {
  player.idleTime = 0;
  player.recenterDelay = 0;
  player.tsundereTimer = 0;
  player.happyTimer = 0;
  player.cheerTimer = 0;
  player.proudTimer = 0;
  player.rubbingTimer = 0;

  let voiceMood = 'happy';
  if (opt.mood === 'tsundere') {
    player.tsundereTimer = 2.4;
    player.talkAnimTimer = 2.2;
    voiceMood = 'tsundere';
    spawnInteractVfx(player.x, player.y - 24, 'love', 6);
  } else if (opt.mood === 'shy') {
    player.rubbingTimer = 2.1;
    player.happyTimer = 2.4;
    player.talkAnimTimer = 2.2;
    voiceMood = 'happy';
    spawnInteractVfx(player.x, player.y - 26, 'love', 9);
  } else if (opt.mood === 'cheer') {
    player.cheerTimer = 2.3;
    player.talkAnimTimer = 2.0;
    if (player.onGround) {
      player.vy = -210;
      player.onGround = false;
    }
    voiceMood = 'cheer';
    spawnInteractVfx(player.x, player.y - 28, 'star', 8);
  } else if (opt.mood === 'proud') {
    player.proudTimer = 2.4;
    player.talkAnimTimer = 2.1;
    voiceMood = 'cheer';
    spawnInteractVfx(player.x, player.y - 26, 'star', 7);
  } else {
    player.happyTimer = 2.4;
    player.talkAnimTimer = 2.2;
    voiceMood = 'happy';
    spawnInteractVfx(player.x, player.y - 24, 'love', 7);
  }

  playSfx('star');
  petAudio.haptic('pat');
  const xpGain = opt.xp || 20;
  const coinGain = opt.coins || 10;
  player.topicsChatted = (player.topicsChatted || 0) + 1;
  addCoins(coinGain, player.x + 18, player.y - 52, '话题 ');
  addAffectionXp(xpGain, `默契对话 +${xpGain} 亲密`);
  setPlayerEmote(opt.reply, 3.2, voiceMood, true);
  completeWish('chat_topic');
  savePetState();
  topicAutoTimer = 28 + Math.random() * 14;
  dismissTopicCard();
}

function openPetTopicPrompt(fromAuto = false) {
  if (gameMode !== 'pet') {
    if (fromAuto) return;
    switchMode('pet');
  }
  if (!drawerEl.classList.contains('hidden')) {
    if (fromAuto) return;
    closeDrawer();
  }
  if (rpsGame.active || palmCatchGame.active || pendingPhotoSnapTimer > 0) {
    if (fromAuto) return;
    cancelRpsGame();
    cancelPalmCatchGame();
  }
  if (!fromAuto) {
    dismissPolaroid();
    setNapping(false);
  } else if (player.isNapping || !polaroidCardEl?.classList.contains('hidden')) {
    return;
  }

  const topic = nextShuffledTopic();
  currentTopicObj = topic;
  if (topicKickerEl) {
    topicKickerEl.textContent = `${topic.tag} · 已聊 ${player.topicsChatted || 0} 次`;
  }
  if (topicPromptEl) {
    topicPromptEl.textContent = topic.prompt;
  }
  if (topicOptionsEl) {
    topicOptionsEl.innerHTML = '';
    for (const opt of topic.options) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'topic-opt-btn';
      btn.dataset.mood = opt.mood;
      btn.innerHTML = `
        <span>${opt.label}</span>
        <span class="topic-opt-tag">
          <img src="./assets/ui_mood_blush.webp?v=hd17" alt="" class="topic-opt-ico" />
          ${MOOD_TAG_LABELS[opt.mood] || '互动'}
        </span>
      `;
      bindHudTap(btn, () => {
        applyTopicOptionReaction(opt);
      });
      topicOptionsEl.appendChild(btn);
    }
  }
  topicCardEl?.classList.remove('hidden');
  document.getElementById('btn-chat-topic')?.classList.add('active');
  player.talkAnimTimer = 1.6;
  if (!fromAuto) {
    playSfx('star');
    setPlayerEmote('来聊个小话题吧~', 1.5, 'happy', false);
  } else {
    player.emoteTimer = 0;
  }
}

function updatePetTopicAuto(dt) {
  if (gameMode !== 'pet') return;
  if (
    !topicCardEl ||
    !topicCardEl.classList.contains('hidden') ||
    !drawerEl.classList.contains('hidden') ||
    rpsGame.active ||
    palmCatchGame.active ||
    player.isNapping ||
    player.isPickedUp ||
    pendingPhotoSnapTimer > 0 ||
    (albumLightboxEl && !albumLightboxEl.classList.contains('hidden'))
  ) {
    return;
  }
  topicAutoTimer -= dt;
  if (topicAutoTimer <= 0) {
    topicAutoTimer = 30 + Math.random() * 14;
    openPetTopicPrompt(true);
  }
}

bindHudTap(document.getElementById('btn-chat-topic'), () => {
  if (topicCardEl && !topicCardEl.classList.contains('hidden')) {
    openPetTopicPrompt(false);
  } else {
    openPetTopicPrompt(false);
  }
});

bindHudTap(document.getElementById('btn-topic-next'), () => {
  openPetTopicPrompt(false);
});

bindHudTap(document.getElementById('btn-topic-close'), () => {
  topicAutoTimer = 26 + Math.random() * 12;
  dismissTopicCard();
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

function startRpsGame(fromGesture = false) { dismissPolaroid(); dismissTopicCard(); if (palmCatchGame.active) cancelPalmCatchGame(); if (rpsChoicesEl) rpsChoicesEl.style.display = 'flex';
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
  player.x = W * 0.5;
  player.y = H * 0.68 - 25;
  player.vx = 0;
  player.vy = 0;
  player.onGround = true;
  player.standingPlat = null;
  player.wanderTargetX = W * 0.5;
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
    rpsStatusEl.innerHTML = `<span class="mg-hud-row"><span class="mg-hud-title">实景猜拳</span><span class="mg-chip mg-chip-combo">伸手或点选出拳</span><span class="mg-chip mg-chip-time">3s</span></span>`;
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
    const moveChip = detectedMove
      ? `<span class="mg-chip mg-chip-score">已锁定 <b>${RPS_LABELS[detectedMove]}</b></span>`
      : `<span class="mg-chip mg-chip-combo">伸手或点选出拳</span>`;
    rpsStatusEl.innerHTML = `<span class="mg-hud-row"><span class="mg-hud-title">实景猜拳</span>${moveChip}<span class="mg-chip mg-chip-time${sec <= 1 ? ' is-urgent' : ''}">${sec}s</span></span>`;
  }

  if (rpsGame.timer <= 0) {
    const finalMove =
      detectedMove || ['rock', 'scissors', 'paper'][Math.floor(Math.random() * 3)];
    resolveRpsRound(finalMove);
  }
}

bindHudTap(document.getElementById('btn-rps'), () => {
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

function startPalmCatchGame() { dismissPolaroid(); dismissTopicCard();
  if (palmCatchGame.active) {
    cancelPalmCatchGame();
    return;
  }
  if (!drawerEl.classList.contains('hidden')) closeDrawer();
  if (rpsGame.active) cancelRpsGame();
  if (gameMode !== 'pet') switchMode('pet');
  setNapping(false);

  palmCatchGame.active = true;
  player.x = W * 0.5;
  player.y = H * 0.68 - 25;
  player.vx = 0;
  player.vy = 0;
  player.onGround = true;
  player.standingPlat = null;
  player.wanderTargetX = W * 0.5;
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
          text: '加班闹钟 -10!',
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
    const remSec = Math.max(0, Math.ceil(palmCatchGame.timer));
    rpsStatusEl.innerHTML =
      `<span class="mg-hud-row"><span class="mg-hud-title">掌心接美食</span>` +
      `<span class="mg-chip mg-chip-score">得分 <b>${palmCatchGame.score}</b></span>` +
      `<span class="mg-chip mg-chip-combo${palmCatchGame.combo >= 3 ? ' is-hot' : ''}">连击 ×${palmCatchGame.combo}</span>` +
      `<span class="mg-chip mg-chip-time${remSec <= 5 ? ' is-urgent' : ''}">${remSec}s</span></span>`;
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

bindHudTap(document.getElementById('btn-palm-catch'), () => {
  startPalmCatchGame();
});

for (const btn of rpsChoiceBtns) {
  bindHudTap(btn, () => {
    const chosen = btn.dataset.rps;
    if (!chosen) return;
    rpsGame.lockedMove = chosen;
    resolveRpsRound(chosen);
  });
}

// 点击左上角金币胶囊可快捷打开商店
bindHudTap(document.getElementById('hud-coins-btn'), () => {
  if (gameMode !== 'pet') switchMode('pet');
  toggleDrawer('dress');
});

// 养成互动按钮 1：🍚 喂食（再次点击即可顺畅关闭抽屉！）
bindHudTap(document.getElementById('btn-feed'), () => {
  toggleDrawer('food');
});

// 养成互动按钮 4：🛒 商店（点击展开/收起装扮与强化小铺）
bindHudTap(document.getElementById('btn-shop'), () => {
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
bindHudTap(document.getElementById('btn-toy'), () => {
  if (!drawerEl.classList.contains('hidden')) closeDrawer();
  setNapping(false);
  player.recenterDelay = 0; player.tsundereTimer = 0; player.happyTimer = 0; player.cheerTimer = 0;
  throwOrPassToy();
});

// 左上角心愿胶囊：点击自动引导完成心愿
bindHudTap(document.getElementById('hud-wish-pill'), () => {
  if (!currentWish) return;
  const pill = document.getElementById('hud-wish-pill');
  if (pill) {
    pill.classList.remove('is-guiding');
    void pill.offsetWidth;
    pill.classList.add('is-guiding');
    setTimeout(() => pill.classList.remove('is-guiding'), 1800);
  }
  if (currentWish.actionHint === 'palm') {
    closeDrawer();
    setPlayerEmote('把手掌伸到镜头中间，我马上跳上去~', 2.2, 'happy');
  } else if (currentWish.actionHint === 'chat') {
    closeDrawer();
    openPetTopicPrompt(false);
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
bindHudTap(document.getElementById('btn-nap'), () => {
  if (!drawerEl.classList.contains('hidden')) closeDrawer();
  playSfx('pat');
  if (player.isNapping || player.idleTime > 5.2) {
    setNapping(false);
    player.idleTime = 0;
    player.petAction = 'idle';
    player.happyTimer = 1.2;
    setPlayerEmote('睡饱满血复活!', 1.8, 'happy', true);
  } else {
    setNapping(true); cancelRpsGame(); cancelPalmCatchGame(); player.vy = Math.max(0, player.vy);
    if (player.y < H * 0.68 - 26) {
      player.y = H * 0.68 - 25;
      player.vy = 0;
      player.onGround = true;
      player.standingPlat = null;
    }
    if (furnitureList.some((f) => Math.abs(player.x - f.x) < 58)) {
      player.x = W * 0.54;
    }
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
bindHudTap(document.getElementById('btn-rescan'), () => {
  if (!drawerEl.classList.contains('hidden')) closeDrawer();
  vision.triggerRescan(W, H);
  playSfx('star');
  setPlayerEmote('正在精准扫描桌面物体边缘!', 1.6);
});

bindHudTap(document.getElementById('btn-flip-side'), () => {
  preferCCW = !preferCCW;
  updateOrientationLayout();
});

function spawnEnemy(forceBoss = false) {
  const side = Math.random() < 0.5 ? W * 0.08 : W * 0.92;
  const hasBoss = enemies.some((e) => e.isBoss);
  const isBoss = Boolean(forceBoss && !hasBoss);
  const isGoldTreasure = !isBoss && Math.random() < 0.16;
  const isFlyer = !isBoss && !isGoldTreasure && Math.random() < 0.35;
  const isElite = !isBoss && !isGoldTreasure && survivorSessionKills > 6 && Math.random() < 0.18;
  const scale = 1 + (player.level - 1) * 0.10 + (survivorRun.shiftLv - 1) * 0.12;
  const centerFloorY = H * 0.68;
  const hpVal = (isBoss ? 420 + survivorRun.bossWave * 110 : isGoldTreasure ? 65 : isElite ? 85 : isFlyer ? 20 : 26) * scale;
  const bossTitle = isBoss
    ? SURVIVOR_BOSS_NAMES[Math.max(0, survivorRun.bossWave - 1) % SURVIVOR_BOSS_NAMES.length]
    : '';

  enemies.push({
    x: side,
    y: isFlyer ? Math.random() * (H * 0.35) + H * 0.18 : centerFloorY - (isBoss ? 36 : 20),
    vx: 0,
    vy: 0,
    r: isBoss ? 36 : isElite || isGoldTreasure ? 22 : 15,
    hp: hpVal,
    maxHp: hpVal,
    speed: (isBoss ? 68 : isGoldTreasure ? 115 : isElite ? 72 : isFlyer ? 105 : 90) + Math.random() * 14,
    isBoss,
    bossName: bossTitle,
    isFlyer,
    isElite,
    isGoldTreasure,
    slowTimer: 0,
    bossSkillCd: 3.0,
    jumpCd: Math.random() * 1.2
  });

  if (isBoss) {
    playSfx('star');
    petAudio.haptic('shutter');
    syncSurvivorBossBar();
    setPlayerEmote(`班次首领登场：${bossTitle}！击败领超武与金币雨~`, 2.8, 'tsundere', true);
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
  if (gameMode === 'survivor' && survivorRun.choosingSkill) {
    syncSurvivorHud();
    syncSurvivorBossBar();
    return;
  }
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
      furn.isDragging = false;
      furn.x = Math.max(56, Math.min(W - 56, furn.x + flow.dx));
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
    } else {
      furn.holdTime = (furn.holdTime || 0) + dt;
    }

    if (furn.key === 'musicbox') {
      furn.trackName = petAudio.getTrackInfo().name;
      furn.isPlaying = !petAudio.muted;
      if (gameMode === 'pet' && furn.isPlaying) {
        furn.noteTimer = (furn.noteTimer || 0) - dt;
        if (furn.noteTimer <= 0) {
          furn.noteTimer = 2.6;
          spawnInteractVfx(furn.x, furn.y - 52, 'purr', 1);
        }
      }
    }

    // 蓝鲸云端猫爬架顶层软垫作为真实可攀爬/可站立的双层实景跳台！
    if (furn.key === 'tree' && gameMode === 'pet' && !palmCatchGame.active && !rpsGame.active) {
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
    player.recenterDelay = 0; player.tsundereTimer = 0; player.happyTimer = 0; player.cheerTimer = 0;
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
    const phantomBoost = gameMode === 'survivor' ? 1 + (survivorRun.skills.starPhantom || 0) * 0.12 : 1;
    const MAX_RUN_SPEED = 240 * (1 + player.weapons.boots * 0.12) * auraBoost * yarnBoost * phantomBoost;
    const ACCEL = 760;
    const DECEL = 920;
    const SLOW_RADIUS = 76;
    const STOP_TOLERANCE = 6;

    let anchorX = W * 0.5;
    let anchorY = centerFloorY - 25;
    const centerPlatforms = platforms.filter(
      (p) => !p.isFloor && Math.abs((p.x1 + p.x2) * 0.5 - W * 0.5) < W * 0.24
    );
    if (centerPlatforms.length > 0 && rpsHudEl?.classList.contains('hidden')) {
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
      player.recenterDelay = 0; player.tsundereTimer = 0; player.happyTimer = 0; player.cheerTimer = 0;
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
    } else if (!player.isNapping && petItems.length > 0 && gameMode === 'pet') {
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
      player.recenterDelay = 0; player.tsundereTimer = 0; player.happyTimer = 0; player.cheerTimer = 0;
      player.idleTime = 0;
    } else if (player.isNapping) {
      // 小憩状态下保持原地安睡，不被自动回中拉走
      anchorX = player.x;
      anchorY = player.y;
      player.idleTime = Math.max(6.0, player.idleTime);
      player.petAction = 'sleep';
    } else if (palmCatchGame.active) {
      const nonAlarm = catchItems.filter((ci) => ci.kind !== 'alarm' && ci.y < player.y + 10);
      if (nonAlarm.length > 0) {
        nonAlarm.sort((a, b) => b.y - a.y);
        anchorX = Math.max(W * 0.14, Math.min(W * 0.86, nonAlarm[0].x));
      } else {
        anchorX = W * 0.5;
      }
      anchorY = centerFloorY - 25;
      player.wanderTargetX = null;
    } else if (rpsGame.active) {
      anchorX = W * 0.5;
      anchorY = centerFloorY - 25;
      player.wanderTargetX = null;
    } else if (gameMode === 'pet' && drawerEl.classList.contains('hidden')) {
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
        const matchPlat = platforms.find((p) => !p.isFloor && anchorX >= p.x1 - 12 && anchorX <= p.x2 + 12);
        anchorY = matchPlat ? matchPlat.y - 25 : centerFloorY - 25;
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

    if (player.isCrouching || player.isNapping || player.photoPoseTimer > 0 || pendingPhotoSnapTimer > 0) {
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

      if (player.onGround && drawerEl.classList.contains('hidden') && player.photoPoseTimer <= 0 && pendingPhotoSnapTimer <= 0 && player.recenterDelay <= 0 && player.y > anchorY + 34 && Math.abs(player.x - anchorX) < 84 && player.autoJumpCd <= 0) {
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
    const minSafeBodyY = (gameMode === 'pet' && Math.abs(player.x - W * 0.5) < 195) ? 144 : 88;
    if (player.y < minSafeBodyY) {
      player.y = minSafeBodyY;
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
        const rallyXp = 8 + it.rallyCount * 2;
        addAffectionXp(rallyXp, `颠球 x${it.rallyCount} +${rallyXp} 亲密`);

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

  if (gameMode === 'parkour') {
    if (starTarget.active) {
      const distToStar = Math.hypot(player.x - starTarget.x, player.y - starTarget.y);
      if (distToStar < starTarget.radius + 32) {
        starTarget.active = false;
        starTarget.respawnTimer = 2.0;
        starTarget.combo = (starTarget.combo || 0) + 1;
        starTarget.comboTimer = 9.5;
        player.starsCollected++;
        const starBounty = 16 + starTarget.combo * 6;
        const starXp = 24 + starTarget.combo * 4;
        addAffectionXp(starXp, `摘星 x${starTarget.combo} +${starXp} 亲密`);
        addCoins(starBounty, starTarget.x, starTarget.y, `星链x${starTarget.combo} `);
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
    syncParkourHud();
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

  const skBlasterLv = gameMode === 'survivor' ? Math.max(1, survivorRun.skills.blaster || 1) : 1;
  const skTeaLv = gameMode === 'survivor' ? Math.max(1, survivorRun.skills.teaBlade || 1) : 1;
  const skFrostLv = gameMode === 'survivor' ? survivorRun.skills.frostBubble || 0 : 0;
  const skCatLv = gameMode === 'survivor' ? survivorRun.skills.catLightning || 0 : 0;
  const skOnigiriLv = gameMode === 'survivor' ? survivorRun.skills.onigiriHeal || 0 : 0;
  const skPhantomLv = gameMode === 'survivor' ? survivorRun.skills.starPhantom || 0 : 0;
  const skCritLv = gameMode === 'survivor' ? survivorRun.skills.critCharm || 0 : 0;
  const dmgMult = 1 + (gameMode === 'survivor' ? survivorRun.overclockBonus : 0);

  if (gameMode === 'survivor') {
    survivorRun.lightningIcd = Math.max(0, survivorRun.lightningIcd - dt);
    if (skOnigiriLv > 0 && player.hp < player.maxHp) {
      player.hp = Math.min(player.maxHp, player.hp + skOnigiriLv * 2.2 * dt);
    }

    // 冰泡凝滞：周期发射寒霜冰泡弹
    if (skFrostLv > 0 && nearestEnemy) {
      survivorRun.frostTimer -= dt;
      if (survivorRun.frostTimer <= 0) {
        survivorRun.frostTimer = Math.max(0.85, 2.2 - skFrostLv * 0.35);
        const ang = Math.atan2(nearestEnemy.y - player.y, nearestEnemy.x - player.x);
        bullets.push({
          kind: 'frost',
          x: player.x + Math.cos(ang) * 18,
          y: player.y + Math.sin(ang) * 18,
          vx: Math.cos(ang) * 430,
          vy: Math.sin(ang) * 430,
          dmg: Math.round((28 + skFrostLv * 14 + player.level * 2) * dmgMult),
          pierce: 2,
          life: 1.5
        });
      }
    }

    // 星光幻影：移动或作战时放飞追踪星影弹
    if (skPhantomLv > 0 && nearestEnemy) {
      survivorRun.phantomTimer -= dt * (Math.abs(player.vx) > 25 ? 1.5 : 0.85);
      if (survivorRun.phantomTimer <= 0) {
        survivorRun.phantomTimer = Math.max(0.65, 1.65 - skPhantomLv * 0.25);
        const ang = Math.atan2(nearestEnemy.y - player.y, nearestEnemy.x - player.x) + (Math.random() - 0.5) * 0.4;
        bullets.push({
          kind: 'phantom',
          x: player.x,
          y: player.y - 12,
          vx: Math.cos(ang) * 560,
          vy: Math.sin(ang) * 560,
          dmg: Math.round((24 + skPhantomLv * 12 + player.level * 2) * dmgMult),
          pierce: 1,
          life: 1.4
        });
      }
    }

    // 超武「深海蓝鲸巨浪」：周期掀起横扫全屏的深海潮汐巨浪
    if (survivorRun.evolved.superWhale && enemies.length > 0) {
      survivorRun.tsunamiTimer -= dt;
      if (survivorRun.tsunamiTimer <= 0) {
        survivorRun.tsunamiTimer = 3.8;
        shockwaves.push({
          x: player.x,
          y: player.y,
          r: 22,
          maxR: 310,
          color: '#38bdf8',
          life: 0.55
        });
        survivorVfxBursts.push({
          kind: 'superWhale',
          x: player.x,
          y: player.y - 18,
          vx: player.facing * 95,
          vy: -24,
          size: 74,
          life: 0.65,
          maxLife: 0.65
        });
        for (const foe of enemies) {
          if (Math.hypot(foe.x - player.x, foe.y - player.y) < 320) {
            const waveDmg = Math.round((92 + player.weapons.blaster * 14) * dmgMult);
            foe.hp -= waveDmg;
            foe.slowTimer = 2.6;
            foe.vy = -240;
            floatingTexts.push({
              x: foe.x,
              y: foe.y - 24,
              vx: 0,
              vy: -64,
              text: `-${waveDmg}!`,
              color: '#38bdf8',
              scale: 1.2,
              life: 0.55
            });
          }
        }
      }
    }
  }

  function triggerCatChainLightning(originEnemy, baseHitDmg) {
    if (skCatLv <= 0 || survivorRun.lightningIcd > 0) return;
    survivorRun.lightningIcd = survivorRun.evolved.superTeablade ? 0.22 : 0.42;
    const jumps = 1 + skCatLv + (survivorRun.evolved.superTeablade ? 2 : 0);
    const lDmg = Math.max(10, Math.round((baseHitDmg * 0.55 + skCatLv * 11) * dmgMult));
    const pool = enemies
      .filter((other) => other.hp > 0 && Math.hypot(other.x - originEnemy.x, other.y - originEnemy.y) < 260)
      .slice(0, jumps);
    for (const target of pool) {
      target.hp -= lDmg;
      survivorVfxBursts.push({
        kind: 'catLightning',
        x: target.x,
        y: target.y - 14,
        vx: 0,
        vy: -18,
        size: 38,
        life: 0.36,
        maxLife: 0.36
      });
      floatingTexts.push({
        x: target.x + (Math.random() - 0.5) * 16,
        y: target.y - 24,
        vx: 0,
        vy: -62,
        text: `-${lDmg}`,
        color: '#facc15',
        scale: 1.05,
        life: 0.48
      });
    }
  }

  const effBlasterLv = player.weapons.blaster + skBlasterLv - 1;
  const fireInterval =
    Math.max(0.13, 0.42 / (1 + (effBlasterLv - 1) * 0.28)) *
    (onTech ? 0.65 : 1) *
    (survivorRun.evolved.superWhale ? 0.88 : 1);
  shootTimer -= dt;
  if (gameMode === 'survivor' && shootTimer <= 0 && nearestEnemy && player.climbState === 'none') {
    shootTimer = fireInterval;
    player.attackAnimTimer = 0.15;
    const baseAng = Math.atan2(nearestEnemy.y - player.y, nearestEnemy.x - player.x);
    const isSuperWhale = survivorRun.evolved.superWhale;
    const count = isSuperWhale ? 3 : Math.min(4, Math.max(1, skBlasterLv));
    for (let i = 0; i < count; i++) {
      const spread = (i - (count - 1) * 0.5) * (isSuperWhale ? 0.18 : 0.14);
      bullets.push({
        kind: isSuperWhale ? 'superWhale' : 'blaster',
        x: player.x + Math.cos(baseAng) * 18,
        y: player.y + Math.sin(baseAng) * 18,
        vx: Math.cos(baseAng + spread) * (isSuperWhale ? 590 : 650),
        vy: Math.sin(baseAng + spread) * (isSuperWhale ? 590 : 650),
        dmg: Math.round((22 + effBlasterLv * 7 + player.level * 2 + (isSuperWhale ? 26 : 0)) * dmgMult),
        pierce: isSuperWhale ? 4 : 1,
        hitSet: new Set(),
        color: onTech ? '#ff007f' : '#00f3ff',
        life: isSuperWhale ? 1.45 : 1.2
      });
    }
    playSfx('shoot');
  }

  bladeAngle += dt * (survivorRun.evolved.superTeablade ? 7.2 : 4.8 + skTeaLv * 0.4);
  const bladeCount =
    gameMode === 'survivor'
      ? survivorRun.evolved.superTeablade
        ? 6
        : Math.min(5, Math.max(player.weapons.teaBlade, skTeaLv) + (onDrink ? 1 : 0))
      : 0;
  const bladeRadius = 64;

  const critChance = Math.min(0.75, 0.18 + skCritLv * 0.12);
  const critMult = 1.5 + skCritLv * 0.3;

  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    if ((effBlasterLv >= 2 || b.kind === 'phantom' || b.kind === 'frost') && nearestEnemy) {
      const targetAng = Math.atan2(nearestEnemy.y - b.y, nearestEnemy.x - b.x);
      const spd = Math.hypot(b.vx, b.vy) || 600;
      const turnRate = b.kind === 'phantom' ? 0.16 : 0.1;
      b.vx = b.vx * (1 - turnRate) + Math.cos(targetAng) * spd * turnRate;
      b.vy = b.vy * (1 - turnRate) + Math.sin(targetAng) * spd * turnRate;
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;

    let hitRadiusBonus = b.kind === 'superWhale' ? 24 : b.kind === 'frost' ? 18 : 12;
    let shouldRemove = false;
    for (const e of enemies) {
      if (b.hitSet && b.hitSet.has(e)) continue;
      if (Math.hypot(b.x - e.x, b.y - e.y) < e.r + hitRadiusBonus) {
        if (b.hitSet) b.hitSet.add(e);
        const isCrit = Math.random() < critChance;
        const dmg = Math.round(b.dmg * (isCrit ? critMult : 1));
        e.hp -= dmg;

        if (b.kind === 'frost' || b.kind === 'superWhale' || skFrostLv > 0) {
          e.slowTimer = Math.max(e.slowTimer || 0, b.kind === 'superWhale' ? 2.4 : 1.4 + skFrostLv * 0.45);
          if (b.kind === 'frost') {
            survivorVfxBursts.push({
              kind: 'frost',
              x: e.x,
              y: e.y,
              vx: 0,
              vy: -10,
              size: 48,
              life: 0.4,
              maxLife: 0.4
            });
            for (const near of enemies) {
              if (near !== e && Math.hypot(near.x - e.x, near.y - e.y) < 95) {
                near.hp -= Math.round(dmg * 0.55);
                near.slowTimer = Math.max(near.slowTimer || 0, 1.8);
              }
            }
          }
        }

        if (skCatLv > 0 && Math.random() < 0.45) {
          triggerCatChainLightning(e, dmg);
        }

        floatingTexts.push({
          x: e.x + (Math.random() - 0.5) * 14,
          y: e.y - 18,
          vx: (Math.random() - 0.5) * 36,
          vy: -68,
          text: isCrit ? `-${dmg}!` : `-${dmg}`,
          color: isCrit ? '#ffd700' : b.kind === 'superWhale' ? '#7dd3fc' : '#ffffff',
          scale: isCrit ? 1.25 : 1,
          life: 0.55
        });

        if ((e.isGoldTreasure && Math.random() < 0.5) || (isCrit && skCritLv > 0 && Math.random() < 0.22)) {
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

        b.pierce = (b.pierce || 1) - 1;
        if (b.pierce <= 0) {
          shouldRemove = true;
          break;
        }
      }
    }
    if (shouldRemove || b.life <= 0 || b.x < -60 || b.x > W + 60 || b.y > H + 60) {
      bullets.splice(i, 1);
    }
  }

  if (gameMode === 'survivor') {
    enemySpawnTimer -= dt;
    if (enemySpawnTimer <= 0 && enemies.length < 16) {
      enemySpawnTimer = Math.max(0.42, 0.92 - survivorRun.shiftLv * 0.05);
      spawnEnemy();
    }
  }

  const dmgTakenMult = Math.max(0.52, 1 - skPhantomLv * 0.12);

  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.slowTimer = Math.max(0, (e.slowTimer || 0) - dt);
    const slowMult = e.slowTimer > 0 ? 0.46 : 1;
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;

    if (e.isBoss) {
      e.bossSkillCd = (e.bossSkillCd || 3.2) - dt;
      if (e.bossSkillCd <= 0) {
        e.bossSkillCd = 3.4;
        e.vy = -330;
        shockwaves.push({
          x: e.x,
          y: e.y,
          r: 18,
          maxR: 165,
          color: '#fb7185',
          life: 0.42
        });
        if (enemies.length < 12) spawnEnemy(false);
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
    const isSuperTea = survivorRun.evolved.superTeablade;
    for (let b = 0; b < bladeCount; b++) {
      const ringRadius = isSuperTea ? (b % 2 === 0 ? 62 : 96) : bladeRadius;
      const ang = (isSuperTea && b % 2 === 1 ? -bladeAngle * 0.85 : bladeAngle) + (b / bladeCount) * Math.PI * 2;
      const bx = player.x + Math.cos(ang) * ringRadius;
      const by = player.y + Math.sin(ang) * ringRadius;
      if (Math.hypot(bx - e.x, by - e.y) < e.r + (isSuperTea ? 24 : 18)) {
        const effTea = player.weapons.teaBlade + skTeaLv - 1;
        const bladeDmg = (68 + effTea * 18 + (isSuperTea ? 48 : 0)) * dmgMult * dt;
        e.hp -= bladeDmg;
        if (effTea >= 2 || skFrostLv > 0) {
          e.slowTimer = Math.max(e.slowTimer || 0, 1.6);
        }
        if (e.bladeTick <= 0) {
          e.bladeTick = isSuperTea ? 0.18 : 0.24;
          const tickVal = Math.round((16 + effTea * 5 + (isSuperTea ? 12 : 0)) * dmgMult);
          if (skCatLv > 0) triggerCatChainLightning(e, tickVal * 1.4);
          floatingTexts.push({
            x: e.x + (Math.random() - 0.5) * 14,
            y: e.y - 16,
            vx: (Math.random() - 0.5) * 30,
            vy: -58,
            text: `-${tickVal}`,
            color: isSuperTea ? '#34d399' : '#00ff9d',
            scale: isSuperTea ? 1.08 : 0.95,
            life: 0.45
          });
        }
      }
    }

    if (dist < e.r + 18) {
      player.hp -= 14 * dmgTakenMult * dt;
      if (player.hp <= 0) {
        player.hp = player.maxHp;
        updateBestShiftRecord();
        // 幸存者打工体力耗尽时，携带赚到的全部金币安全返回养成模式干饭休息
        switchMode('pet');
        setPlayerEmote('打工收工！带金币与班次勋章回来吃大餐咯~', 2.6);
        break;
      }
    }

    if (e.hp <= 0) {
      const defeatedBoss = Boolean(e.isBoss);
      const defeatedBossName = e.bossName || '深海摸鱼大魔王';
      player.kills++;
      if (gameMode === 'survivor') {
        survivorSessionKills++;
        syncSurvivorHud();
      }
      const dropCount = defeatedBoss ? 5 : e.isElite ? 3 : 1;
      for (let d = 0; d < dropCount; d++) {
        const isHeal = !defeatedBoss && Math.random() < 0.15;
        gems.push({
          x: e.x + (Math.random() - 0.5) * 16,
          y: e.y - 6,
          vx: (Math.random() - 0.5) * 140,
          vy: -175 - Math.random() * 80,
          age: 0,
          isHeal,
          val: defeatedBoss ? 24 : e.isElite ? 22 : 14,
          color: isHeal ? '#ff2a7a' : defeatedBoss || e.isElite ? '#ffd700' : '#00f3ff',
          magnet: defeatedBoss
        });
      }
      // 幸存者作为赚金币小游戏：击败怪物爆出物理弹跳金币（班次首领爆出 18 枚黄金喷泉！）
      const coinDrops = defeatedBoss ? 18 : e.isGoldTreasure ? 8 : e.isElite ? 5 : 2;
      for (let c = 0; c < coinDrops; c++) {
        coinsList.push({
          x: e.x + (Math.random() - 0.5) * 24,
          y: e.y - 12,
          vx: (Math.random() - 0.5) * (defeatedBoss ? 280 : 190),
          vy: -230 - Math.random() * (defeatedBoss ? 160 : 100),
          age: 0,
          val: defeatedBoss ? 12 : e.isGoldTreasure ? 9 : e.isElite ? 8 : 4,
          magnet: defeatedBoss
        });
      }

      enemies.splice(i, 1);

      if (defeatedBoss) {
        playSfx('star');
        petAudio.haptic('win');
        player.cheerTimer = 1.8;
        player.hp = Math.min(player.maxHp, player.hp + 30);
        player.bestShiftRecord.bossesDefeated = (player.bestShiftRecord.bossesDefeated || 0) + 1;
        savePetState();
        syncSurvivorBossBar();
        addAffectionXp(45, '讨伐班次首领 +45 亲密');
        setPlayerEmote(`成功击败${defeatedBossName}！满屏金币雨咯 ^w^!`, 2.6, 'cheer', true);
        if (gameMode === 'survivor') {
          openSurvivorSkillModal(`讨伐首领『${defeatedBossName}』大捷 · 奖励秘技`);
        }
      } else if (gameMode === 'survivor' && survivorSessionKills >= survivorRun.nextBossKills) {
        survivorRun.bossWave++;
        survivorRun.nextBossKills += 12;
        spawnEnemy(true);
      }

      // 每击败 8 只怪物自动释放一次「巨鲸潮汐觉醒冲击波」清场爆金币
      if (player.kills % 8 === 0) {
        shockwaves.push({
          x: player.x,
          y: player.y,
          r: 16,
          maxR: 230,
          color: '#00f3ff',
          life: 0.48
        });
        for (const other of enemies) {
          if (Math.hypot(other.x - player.x, other.y - player.y) < 230) {
            other.hp -= 65;
            other.vy = -260;
            other.slowTimer = 1.5;
          }
        }
      }
    }
  }

  if (gameMode === 'survivor') {
    syncSurvivorBossBar();
  }

  // 更新幸存者掉落的物理金币
  const magnetRange =
    (player.equipped.aura ? 450 : 155 + (player.weapons.magnet || 1) * 35) + skOnigiriLv * 45;
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

  const gemMagnetRange = 175 + skOnigiriLv * 55;
  for (let i = gems.length - 1; i >= 0; i--) {
    const g = gems[i];
    g.age += dt;
    const dx = player.x - g.x;
    const dy = player.y - g.y;
    const dist = Math.hypot(dx, dy) || 1;

    if (g.age > 0.34 && (dist < gemMagnetRange || g.age > 0.9 || g.magnet)) {
      g.magnet = true;
      g.x += (dx / dist) * 480 * dt;
      g.y += (dy / dist) * 480 * dt;
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

    if (dist < 28 && g.age > 0.18) {
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
        if (gameMode === 'survivor') {
          survivorRun.shiftXp += g.val;
        }
      }
      gems.splice(i, 1);

      let gemLeveledUp = false;
      while (player.xp >= player.xpNext) {
        player.xp -= player.xpNext;
        player.level++;
        player.xpNext = Math.round(player.xpNext * 1.35);
        player.hp = Math.min(player.maxHp, player.hp + 20);
        gemLeveledUp = true;
      }
      if (gemLeveledUp) {
        onPlayerLevelUp();
        savePetState();
      }

      if (gameMode === 'survivor') {
        let leveledShift = false;
        while (survivorRun.shiftXp >= survivorRun.shiftXpNext) {
          survivorRun.shiftXp -= survivorRun.shiftXpNext;
          survivorRun.shiftLv++;
          survivorRun.shiftXpNext = Math.round(survivorRun.shiftXpNext * 1.18 + 4);
          player.hp = Math.min(player.maxHp, player.hp + 20);
          leveledShift = true;
          openSurvivorSkillModal(`打工班次升至 Lv.${survivorRun.shiftLv} · 暂停保护中`);
        }
        syncSurvivorHud();
        if (leveledShift) {
          floatingTexts.push({
            x: player.x,
            y: player.y - 44,
            vx: 0,
            vy: -60,
            text: `班次 LV.${survivorRun.shiftLv}!`,
            color: '#ffd700',
            scale: 1.3,
            life: 0.9
          });
        }
      }
    }
  }

  for (let i = survivorVfxBursts.length - 1; i >= 0; i--) {
    const vb = survivorVfxBursts[i];
    vb.x += (vb.vx || 0) * dt;
    vb.y += (vb.vy || 0) * dt;
    vb.life -= dt;
    if (vb.life <= 0) survivorVfxBursts.splice(i, 1);
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

  updatePetTopicAuto(dt);
}

function renderEntities(now) {
  ctx.save();

  if (gameMode === 'parkour') {
    drawStarGoal(ctx, starTarget, player, now);
  }

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
  const isSuperTea = gameMode === 'survivor' && survivorRun.evolved.superTeablade;
  const skTeaLv = gameMode === 'survivor' ? Math.max(1, survivorRun.skills.teaBlade || 1) : 1;
  const bladeCount =
    gameMode === 'survivor'
      ? isSuperTea
        ? 6
        : Math.min(5, Math.max(player.weapons.teaBlade, skTeaLv) + (onDrink ? 1 : 0))
      : 0;
  const bladeImg = isSuperTea && isReady(images.upgSuperTeablade) ? images.upgSuperTeablade : images.upgBlade;
  const bladeDrawSz = isSuperTea ? 40 : 32;
  for (let b = 0; b < bladeCount; b++) {
    const ringR = isSuperTea ? (b % 2 === 0 ? 62 : 96) : 64;
    const ang = (isSuperTea && b % 2 === 1 ? -bladeAngle * 0.85 : bladeAngle) + (b / bladeCount) * Math.PI * 2;
    const bx = player.x + Math.cos(ang) * ringR;
    const by = player.y + Math.sin(ang) * ringR;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(ang + now * (isSuperTea ? 0.016 : 0.01));
    if (isReady(bladeImg)) {
      ctx.drawImage(bladeImg, -bladeDrawSz * 0.5, -bladeDrawSz * 0.5, bladeDrawSz, bladeDrawSz);
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

  // 渲染冲击波光环
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
    const hideFurnLabel = Boolean(
      (drawerEl && !drawerEl.classList.contains('hidden')) ||
      palmCatchGame.active ||
      rpsGame.active ||
      petItems.some((i) => i.type === 'ball')
    );
    for (const furn of furnitureList) {
      drawFurnitureItem(ctx, furn, now, vision.isDarkRoom, hideFurnLabel);
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

  player.rpsHudOpen = Boolean(rpsHudEl && !rpsHudEl.classList.contains('hidden')); player.drawerOpen = Boolean(drawerEl && !drawerEl.classList.contains('hidden'));
  drawHeroSprite(ctx, player, now);

  for (const e of enemies) {
    drawEnemySprite(ctx, e, now, player.x);
  }

  for (const b of bullets) {
    ctx.save();
    ctx.translate(b.x, b.y);
    let bImg = images.upgBlaster;
    let bSz = 24;
    if (b.kind === 'superWhale' && isReady(images.upgSuperWhale)) {
      bImg = images.upgSuperWhale;
      bSz = 40;
      if (b.vx < 0) ctx.scale(-1, 1);
    } else if (b.kind === 'frost' && isReady(images.skFrostBubble)) {
      bImg = images.skFrostBubble;
      bSz = 30;
    } else if (b.kind === 'phantom' && isReady(images.skStarPhantom)) {
      bImg = images.skStarPhantom;
      bSz = 28;
      ctx.rotate(Math.atan2(b.vy, b.vx));
    }
    if (isReady(bImg)) {
      ctx.drawImage(bImg, -bSz * 0.5, -bSz * 0.5, bSz, bSz);
    }
    ctx.restore();
  }

  for (const vb of survivorVfxBursts) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, vb.life / Math.max(0.01, vb.maxLife)));
    ctx.translate(vb.x, vb.y);
    const vImg =
      vb.kind === 'superWhale'
        ? images.upgSuperWhale
        : vb.kind === 'frost'
          ? images.skFrostBubble
          : images.skCatLightning;
    if (isReady(vImg)) {
      const s = vb.size || 36;
      ctx.drawImage(vImg, -s * 0.5, -s * 0.5, s, s);
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
